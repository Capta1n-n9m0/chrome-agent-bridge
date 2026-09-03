import { buildSnapshot } from "./snapshot.js";
import { RefMap } from "./refmap.js";
import { clickRef, typeRef, scrollRef, hoverRef, selectOptionRef, focusForTypingRef } from "./actions.js";
import { centerOf } from "./geometry.js";

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
      centerOf: (ref: string) => { x: number; y: number };
    };
  }
}

if (!window.__agentBridge) {
  const refs = new RefMap();
  window.__agentBridge = {
    refs,
    snapshot: () => buildSnapshot(document, refs),
    click: (ref) => clickRef(refs, ref),
    type: (ref, value, submit) => typeRef(refs, ref, value, submit),
    focusForTyping: (ref) => focusForTypingRef(refs, ref),
    scroll: (ref, direction) => scrollRef(refs, ref, direction),
    hover: (ref) => hoverRef(refs, ref),
    selectOption: (ref, values) => selectOptionRef(refs, ref, values),
    centerOf: (ref) => {
      const el = refs.get(ref);
      if (!el) throw new Error(`ref ${ref} not found — call browser_snapshot to re-snapshot`);
      return centerOf(el);
    },
  };
}
