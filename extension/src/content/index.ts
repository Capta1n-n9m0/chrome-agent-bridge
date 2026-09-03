import { buildSnapshot } from "./snapshot.js";
import { RefMap } from "./refmap.js";
import { clickRef, typeRef, scrollRef, hoverRef, selectOptionRef, focusForTypingRef } from "./actions.js";
import { centerOf, isInViewport } from "./geometry.js";

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
    snapshot: () => buildSnapshot(document, refs),
    click: (ref) => clickRef(refs, ref),
    type: (ref, value, submit) => typeRef(refs, ref, value, submit),
    focusForTyping: (ref) => focusForTypingRef(refs, ref),
    scroll: (ref, direction) => scrollRef(refs, ref, direction),
    hover: (ref) => hoverRef(refs, ref),
    selectOption: (ref, values) => selectOptionRef(refs, ref, values),
    // The aim point for trusted CDP input. Scrolls first: CDP dispatches at the coordinates given
    // without clamping, so an off-screen point hit-tests the root element and the click silently
    // does nothing (page zoom shrinks the visual viewport in CSS px, which is how this bites).
    centerForInput: (ref) => {
      const el = refs.get(ref);
      if (!el) throw new Error(`ref ${ref} not found — call browser_snapshot to re-snapshot`);
      (el as HTMLElement).scrollIntoView?.({ block: "center", inline: "center" });
      const pt = centerOf(el);
      const size = { width: window.innerWidth, height: window.innerHeight };
      if (!isInViewport(pt, size)) {
        throw new Error(
          `ref ${ref} is outside the viewport after scrolling (point ${pt.x},${pt.y} vs ` +
            `${size.width}x${size.height}) — trusted input there would hit nothing`,
        );
      }
      return pt;
    },
  };
}
