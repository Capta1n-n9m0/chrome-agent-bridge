// @vitest-environment jsdom
/** Step 8 S2: the thin content `focus(ref)` behind a targeted `pressKey` — focus, no selection change. */
import { describe, it, expect } from "vitest";
import { RefMap } from "../src/content/refmap.js";
import { focusRef } from "../src/content/actions.js";
import "../src/content/index.js";

describe("focusRef", () => {
  it("focuses the element and leaves its selection alone", () => {
    document.body.innerHTML = `<input id="i" value="hello"><button id="b">B</button>`;
    const input = document.getElementById("i") as HTMLInputElement;
    input.setSelectionRange(5, 5);
    document.getElementById("b")!.focus();
    const refs = new RefMap();
    const ref = refs.add(input);
    expect(focusRef(refs, ref)).toEqual({ ok: true });
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([5, 5]);
  });

  it("an unknown ref → REF_STALE, like the other *Ref functions", () => {
    let e: unknown;
    try {
      focusRef(new RefMap(), "e99");
    } catch (x) {
      e = x;
    }
    expect((e as { code?: string }).code).toBe("REF_STALE");
  });

  it("window.__agentBridge.focus is guarded: an unknown ref is a returned marker, not a throw", () => {
    const r = window.__agentBridge!.focus("e404") as unknown as { __bridgeError?: string };
    expect(r.__bridgeError).toMatch(/^REF_STALE:/);
  });
});
