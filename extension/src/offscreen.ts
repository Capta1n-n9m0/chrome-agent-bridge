import { ReconnectingClient } from "./client.js";
import { acceptOffscreenSender } from "./relay-sender.js";

let client: ReconnectingClient | undefined;
let currentKey = "";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Step 9 (S2a fixer r1, verifier finding 3): only the service worker — this extension, no tab — may
  // point the socket somewhere or put a frame on it. Anything else is dropped silently.
  if (!acceptOffscreenSender(sender, chrome.runtime.id)) return false;
  if (msg?.target !== "offscreen") return false;

  if (msg.type === "connect") {
    // The session marker is part of the key (S2b.5, decisions.md #80): a changed marker makes a new
    // client, so the daemon sees a new hello carrying it. Never logged.
    const session = typeof msg.session === "string" ? msg.session : "";
    const key = `${msg.port}:${msg.token}:${session}`;
    // Already managing this exact endpoint — let the existing client keep (re)connecting.
    if (client && key === currentKey) {
      sendResponse({ ok: true, alreadyConnected: client.isOpen() });
      return true;
    }
    currentKey = key;
    client?.stop();
    client = new ReconnectingClient({
      url: `ws://127.0.0.1:${msg.port}`,
      token: msg.token,
      session,
      onMessage: (data) => {
        chrome.runtime.sendMessage({ target: "sw", type: "ws-message", data }).catch(() => {});
      },
      onStatus: (connected) => {
        chrome.runtime.sendMessage({ target: "sw", type: "ws-status", connected }).catch(() => {});
      },
    });
    client.start();
    sendResponse({ ok: true });
  } else if (msg.type === "send") {
    client?.send(msg.data);
    sendResponse({ ok: true });
  }
  return true;
});
