import { Router } from "./router.js";
import { navigate } from "./handlers/navigate.js";
import { snapshot, screenshot } from "./handlers/perceive.js";
import { click, type as typeText, scroll, hover, selectOption, pressKey } from "./handlers/actions.js";
import { back, forward } from "./handlers/history.js";
import { listTabs, selectTab, newTab, closeTab } from "./handlers/tabs.js";
import { waitFor } from "./handlers/wait.js";
import { evaluate } from "./handlers/evaluate.js";
import { networkRequests, networkClear } from "./handlers/network.js";
import { log as networkLog, ownPort, scheduleFlush, setOwnPort } from "./network-state.js";
import { isOwnTraffic } from "./network-log.js";
import type { WebRequestDetails, WebRequestEvent } from "./network-log.js";

const DEFAULT_PORT = 9234;
const router = new Router();
router.on("navigate", navigate);
router.on("snapshot", snapshot);
router.on("screenshot", screenshot);
router.on("click", click);
router.on("type", typeText);
router.on("scroll", scroll);
router.on("hover", hover);
router.on("selectOption", selectOption);
router.on("pressKey", pressKey);
router.on("back", back);
router.on("forward", forward);
router.on("listTabs", listTabs);
router.on("selectTab", selectTab);
router.on("newTab", newTab);
router.on("closeTab", closeTab);
router.on("waitFor", waitFor);
router.on("evaluate", evaluate);
router.on("networkRequests", networkRequests);
router.on("networkClear", networkClear);

// --- Network capture -------------------------------------------------------------------------
// MV3 requires every webRequest listener to be registered synchronously while the worker script
// evaluates (a module SW cannot use top-level `await`), so these live at the top level and ingest
// into the in-memory log from the first event. `network-state.ts` merges the stored log in
// underneath once its rehydrate promise resolves. `extraHeaders` is deliberately absent from every
// extraInfoSpec, so Chrome never hands us Cookie / Set-Cookie.

const ALL_URLS = { urls: ["<all_urls>"] };

function ingest(event: WebRequestEvent, d: WebRequestDetails): void {
  if (isOwnTraffic(d.url, ownPort())) return;
  networkLog.ingest(event, d);
  scheduleFlush();
}

chrome.webRequest.onBeforeRequest.addListener(
  (d) => void ingest("onBeforeRequest", d as unknown as WebRequestDetails),
  ALL_URLS,
  ["requestBody"],
);
chrome.webRequest.onSendHeaders.addListener(
  (d) => void ingest("onSendHeaders", d as unknown as WebRequestDetails),
  ALL_URLS,
  ["requestHeaders"],
);
chrome.webRequest.onHeadersReceived.addListener(
  (d) => void ingest("onHeadersReceived", d as unknown as WebRequestDetails),
  ALL_URLS,
  ["responseHeaders"],
);
chrome.webRequest.onBeforeRedirect.addListener(
  (d) => void ingest("onBeforeRedirect", d as unknown as WebRequestDetails),
  ALL_URLS,
  ["responseHeaders"],
);
chrome.webRequest.onCompleted.addListener(
  (d) => void ingest("onCompleted", d as unknown as WebRequestDetails),
  ALL_URLS,
  ["responseHeaders"],
);
chrome.webRequest.onErrorOccurred.addListener(
  (d) => void ingest("onErrorOccurred", d as unknown as WebRequestDetails),
  ALL_URLS,
);

chrome.tabs.onRemoved.addListener((tabId) => {
  networkLog.forgetTab(tabId);
  scheduleFlush();
});

let connecting = false;

async function getConfig(): Promise<{ port: number; token: string }> {
  const { port, token } = await chrome.storage.local.get(["port", "token"]);
  const resolved = Number(port) || DEFAULT_PORT;
  setOwnPort(resolved); // so isOwnTraffic can drop the bridge's own loopback socket
  return { port: resolved, token: String(token ?? "") };
}

async function ensureOffscreen(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Maintain a persistent WebSocket to the local MCP bridge server.",
  });
}

async function connect(): Promise<void> {
  if (connecting) return;
  connecting = true;
  try {
    const { port, token } = await getConfig();
    if (!token) {
      console.warn("[bridge] no token set — open the extension options page to configure.");
      return;
    }
    await ensureOffscreen();
    await chrome.runtime.sendMessage({ target: "offscreen", type: "connect", port, token });
  } catch (err) {
    console.error("[bridge] connect failed:", err);
  } finally {
    connecting = false;
  }
}

// Messages relayed from the offscreen document.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.target !== "sw") return;
  if (msg.type === "ws-message") {
    router.handle(msg.data)
      .then((reply) => {
        if (reply) chrome.runtime.sendMessage({ target: "offscreen", type: "send", data: reply }).catch((e) => console.warn("[bridge] reply relay failed:", e));
      })
      .catch(() => {});
  } else if (msg.type === "ws-status") {
    if (msg.connected) console.log("[bridge] connection: up");
    else console.error("[bridge] connection: down");
  }
});

// Diagnostic only: explains a mid-action trusted-input failure in the SW console when the user
// clicks the debugging banner's Cancel (reason "canceled_by_user") or DevTools takes the tab over.
chrome.debugger.onDetach.addListener((source, reason) => {
  console.warn("[bridge] debugger detached from tab", source.tabId, "reason:", reason);
});

chrome.runtime.onInstalled.addListener(() => void connect());
chrome.runtime.onStartup.addListener(() => void connect());

chrome.alarms.get("keepalive", (existing) => {
  if (!existing) chrome.alarms.create("keepalive", { periodInMinutes: 0.41 }); // ~25s
});
chrome.alarms.onAlarm.addListener((alarm) => {
  // connect() is idempotent (offscreen ignores a redundant same-endpoint connect),
  // so this just ensures the offscreen doc + socket are alive without churn.
  if (alarm.name === "keepalive") void connect();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.token || changes.port)) void connect();
});

void connect();
