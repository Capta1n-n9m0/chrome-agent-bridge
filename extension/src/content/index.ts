import { buildSnapshot } from "./snapshot.js";
import { RefMap } from "./refmap.js";

declare global {
  interface Window {
    __agentBridge?: {
      refs: RefMap;
      snapshot: () => { text: string; count: number };
    };
  }
}

if (!window.__agentBridge) {
  const refs = new RefMap();
  window.__agentBridge = {
    refs,
    snapshot: () => buildSnapshot(document, refs),
  };
}
