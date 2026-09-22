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
import { ReconnectingClient } from "./client.js";
import { browserApi } from "./browser-api.js";

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

// Safari has no chrome.offscreen equivalent. Its macOS manifest uses a persistent background page,
// which owns this socket directly. The alarm also repairs the connection after a browser wake.
let client: ReconnectingClient | undefined;
let currentKey = "";
let connecting = false;

async function getConfig(): Promise<{ port: number; token: string }> {
  const { port, token } = await browserApi.storage.local.get(["port", "token"]);
  const resolved = Number(port) || DEFAULT_PORT;
  setOwnPort(resolved);
  return { port: resolved, token: String(token ?? "") };
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
    const key = `${port}:${token}`;
    if (client && key === currentKey) return;
    currentKey = key;
    client?.stop();
    client = new ReconnectingClient({
      url: `ws://127.0.0.1:${port}`,
      token,
      onMessage: (data) => {
        router.handle(data)
          .then((reply) => {
            if (reply) client?.send(reply);
          })
          .catch(() => {});
      },
      onStatus: (connected) => {
        if (connected) console.log("[bridge] connection: up");
        else console.error("[bridge] connection: down");
      },
    });
    client.start();
  } catch (err) {
    console.error("[bridge] connect failed:", err);
  } finally {
    connecting = false;
  }
}

// Register high-frequency listeners synchronously. Apple recommends a persistent background page
// for macOS Safari extensions that use webRequest so callbacks are not lost while the page sleeps.
const ALL_URLS = { urls: ["<all_urls>"] };

function ingest(event: WebRequestEvent, details: WebRequestDetails): void {
  if (isOwnTraffic(details.url, ownPort())) return;
  networkLog.ingest(event, details);
  scheduleFlush();
}

function addWebRequestListener(
  event: WebRequestEvent,
  listener: (details: WebRequestDetails) => void,
  extraInfoSpec: string[] = [],
): void {
  try {
    (browserApi.webRequest[event] as { addListener: (...args: unknown[]) => void }).addListener(
      listener as unknown as (...args: unknown[]) => void,
      ALL_URLS,
      extraInfoSpec,
    );
  } catch (err) {
    // Safari versions differ in which webRequest events/extraInfoSpec values they expose.
    // A diagnostics stream must never prevent the bridge socket from starting.
    console.warn(`[bridge] webRequest ${event} unavailable`, err);
  }
}

addWebRequestListener("onBeforeRequest", (details) => void ingest("onBeforeRequest", details), ["requestBody"]);
addWebRequestListener("onSendHeaders", (details) => void ingest("onSendHeaders", details), ["requestHeaders"]);
addWebRequestListener("onHeadersReceived", (details) => void ingest("onHeadersReceived", details), ["responseHeaders"]);
addWebRequestListener("onBeforeRedirect", (details) => void ingest("onBeforeRedirect", details), ["responseHeaders"]);
addWebRequestListener("onCompleted", (details) => void ingest("onCompleted", details), ["responseHeaders"]);
addWebRequestListener("onErrorOccurred", (details) => void ingest("onErrorOccurred", details));

browserApi.tabs.onRemoved.addListener((tabId) => {
  networkLog.forgetTab(tabId);
  scheduleFlush();
});

browserApi.runtime.onInstalled.addListener(() => void connect());
browserApi.runtime.onStartup.addListener(() => void connect());
browserApi.alarms.get("keepalive").then((existing) => {
  if (!existing) browserApi.alarms.create("keepalive", { periodInMinutes: 0.5 });
});
browserApi.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepalive") void connect();
});
browserApi.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.token || changes.port)) void connect();
});

void connect();
