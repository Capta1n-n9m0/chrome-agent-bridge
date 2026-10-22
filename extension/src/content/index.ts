import { buildSnapshot } from "./snapshot.js";
import { RefMap } from "./refmap.js";
import {
  clickRef,
  typeRef,
  scrollRef,
  hoverRef,
  selectOptionRef,
  focusForTypingRef,
  centerForInputRef,
} from "./actions.js";
import { guard } from "./guard.js";

// Every method below may instead return `{__bridgeError: "CODE:message"}` (see guard.ts); the
// handlers only read results through `unwrapResult`, which throws a coded `BridgeError` for it.
declare global {
  interface Window {
    __agentBridge?: {
      refs: RefMap;
      snapshot: () => { text: string; count: number };
      click: (ref: string) => { ok: true };
      type: (ref: string, value: string, submit: boolean) => { ok: true };
      focusForTyping: (ref: string) => { ok: true };
      scroll: (ref: string | undefined, direction: string) => { ok: true };
      hover: (ref: string) => { ok: true };
      selectOption: (ref: string, values: string[]) => { ok: true };
      centerForInput: (ref: string) => { x: number; y: number };
    };
  }
}

if (!window.__agentBridge) {
  const refs = new RefMap();
  window.__agentBridge = {
    refs,
    snapshot: guard(() => buildSnapshot(document, refs)),
    click: guard((ref: string) => clickRef(refs, ref)),
    type: guard((ref: string, value: string, submit: boolean) => typeRef(refs, ref, value, submit)),
    focusForTyping: guard((ref: string) => focusForTypingRef(refs, ref)),
    scroll: guard((ref: string | undefined, direction: string) => scrollRef(refs, ref, direction)),
    hover: guard((ref: string) => hoverRef(refs, ref)),
    selectOption: guard((ref: string, values: string[]) => selectOptionRef(refs, ref, values)),
    centerForInput: guard((ref: string) => centerForInputRef(refs, ref)),
  };
}
