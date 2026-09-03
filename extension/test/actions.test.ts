// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { RefMap } from "../src/content/refmap.js";
import { clickRef, typeRef, selectOptionRef, focusForTypingRef } from "../src/content/actions.js";

function withRef(el: Element): { refs: RefMap; ref: string } {
  const refs = new RefMap();
  document.body.appendChild(el);
  return { refs, ref: refs.add(el) };
}

describe("content actions", () => {
  it("clickRef dispatches a click on the element", () => {
    const btn = document.createElement("button");
    const spy = vi.fn();
    btn.addEventListener("click", spy);
    const { refs, ref } = withRef(btn);
    expect(clickRef(refs, ref)).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledOnce();
  });

  it("typeRef sets the value and fires input/change", () => {
    const input = document.createElement("input");
    const events: string[] = [];
    input.addEventListener("input", () => events.push("input"));
    input.addEventListener("change", () => events.push("change"));
    const { refs, ref } = withRef(input);
    typeRef(refs, ref, "hello", false);
    expect(input.value).toBe("hello");
    expect(events).toContain("input");
  });

  it("selectOptionRef selects by visible label", () => {
    const sel = document.createElement("select");
    for (const v of ["A", "B"]) {
      const o = document.createElement("option");
      o.textContent = v;
      o.value = v;
      sel.appendChild(o);
    }
    const { refs, ref } = withRef(sel);
    selectOptionRef(refs, ref, ["B"]);
    expect(sel.value).toBe("B");
  });

  it("throws a re-snapshot error for an unknown ref", () => {
    const refs = new RefMap();
    expect(() => clickRef(refs, "e99")).toThrow(/re-snapshot/);
  });
});

describe("focusForTypingRef", () => {
  it("focuses an input and selects all of its text", () => {
    const input = document.createElement("input");
    input.value = "existing";
    const { refs, ref } = withRef(input);
    expect(focusForTypingRef(refs, ref)).toEqual({ ok: true });
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("existing".length);
  });

  it("focuses a textarea and selects all of its text", () => {
    const ta = document.createElement("textarea");
    ta.value = "two words";
    const { refs, ref } = withRef(ta);
    focusForTypingRef(refs, ref);
    expect(document.activeElement).toBe(ta);
    expect(ta.selectionEnd).toBe("two words".length);
  });

  it("focuses a contenteditable and selects its contents", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    div.textContent = "editable text";
    const { refs, ref } = withRef(div);
    focusForTypingRef(refs, ref);
    expect(document.activeElement).toBe(div);
    const sel = document.getSelection()!;
    expect(sel.rangeCount).toBe(1);
    expect(sel.toString()).toBe("editable text");
  });

  it("throws the standard re-snapshot error for an unknown ref", () => {
    const refs = new RefMap();
    expect(() => focusForTypingRef(refs, "e99")).toThrow(/call browser_snapshot to re-snapshot/);
  });
});
