// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { RefMap } from "../src/content/refmap.js";
import { clickRef, typeRef, selectOptionRef } from "../src/content/actions.js";

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
