import { ReconnectingClient } from "./client.js";

let client: ReconnectingClient | undefined;
let currentKey = "";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen") return false;

  if (msg.type === "connect") {
    const key = `${msg.port}:${msg.token}`;
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
