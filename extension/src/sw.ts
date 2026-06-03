import { ReconnectingClient } from "./client.js";
import { Router } from "./router.js";
import { navigate } from "./handlers/navigate.js";
import { snapshot, screenshot } from "./handlers/perceive.js";

const DEFAULT_PORT = 9234;
const router = new Router();
router.on("navigate", navigate);
router.on("snapshot", snapshot);
router.on("screenshot", screenshot);

let client: ReconnectingClient | undefined;
let connecting = false;

async function getConfig(): Promise<{ port: number; token: string }> {
  const { port, token } = await chrome.storage.local.get(["port", "token"]);
  return { port: Number(port) || DEFAULT_PORT, token: String(token ?? "") };
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
    client?.stop();
    client = new ReconnectingClient({
      url: `ws://127.0.0.1:${port}`,
      token,
      onMessage: async (data) => {
        const thisClient = client;
        const reply = await router.handle(data);
        if (reply) thisClient?.send(reply);
      },
      onStatus: (connected) => console.error(`[bridge] connection: ${connected ? "up" : "down"}`),
    });
    client.start();
  } finally {
    connecting = false;
  }
}

chrome.runtime.onInstalled.addListener(() => void connect());
chrome.runtime.onStartup.addListener(() => void connect());

chrome.alarms.get("keepalive", (existing) => {
  if (!existing) chrome.alarms.create("keepalive", { periodInMinutes: 0.41 }); // ~25s
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepalive" && !client?.isOpen()) void connect();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.token || changes.port)) void connect();
});

void connect();
