// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { codedError, guard, toMarker } from "../src/content/guard.js";
import { RefMap } from "../src/content/refmap.js";
import { centerForInputRef, clickRef, selectOptionRef } from "../src/content/actions.js";
import { unwrapResult } from "../src/inject.js";
import { BridgeError } from "../src/errors.js";
import "../src/content/index.js";

const rect = (left: number, top: number, width: number, height: number) =>
  ({ x: left, y: top, width, height, top, left, right: left + width, bottom: top + height, toJSON() {} }) as DOMRect;

describe("content guard (#38)", () => {
  it("returns the success value untouched", () => {
    expect(guard((a: number) => ({ ok: a }))(3)).toEqual({ ok: 3 });
  });

  it("turns a coded throw into a CODE:message marker", () => {
    const g = guard(() => {
      throw codedError("REF_STALE", "ref e9 not found — call browser_snapshot to re-snapshot");
    });
    expect(g()).toEqual({ __bridgeError: "REF_STALE:ref e9 not found — call browser_snapshot to re-snapshot" });
  });

  it("marks an uncoded throw INTERNAL, and a non-Error by String()", () => {
    expect(toMarker(new Error("boom"))).toEqual({ __bridgeError: "INTERNAL:boom" });
    expect(toMarker("plain")).toEqual({ __bridgeError: "INTERNAL:plain" });
    expect(toMarker(Object.assign(new Error("x"), { code: "not a code" }))).toEqual({ __bridgeError: "INTERNAL:x" });
  });

  it("round-trips through unwrapResult into a coded BridgeError", () => {
    const marker = guard(() => clickRef(new RefMap(), "e42"))();
    let caught: unknown;
    try {
      unwrapResult({ result: marker });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BridgeError);
    expect((caught as BridgeError).code).toBe("REF_STALE");
    expect((caught as BridgeError).message).toBe("ref e42 not found — call browser_snapshot to re-snapshot");
  });
});

describe("content guard carries data (#82, S1 D10)", () => {
  const caught = (fn: () => unknown): BridgeError => {
    try {
      fn();
    } catch (e) {
      return e as BridgeError;
    }
    throw new Error("expected a throw");
  };

  it("codedError takes optional data; without it the error has no data key", () => {
    expect("data" in codedError("REF_STALE", "x")).toBe(false);
    expect((codedError("LOCATOR_NOT_FOUND", "x", { candidates: [] }) as { data?: unknown }).data).toEqual({ candidates: [] });
  });

  it("plain-JSON data rides beside the unchanged marker string", () => {
    const data = { candidates: [{ ref: "e1", role: "button", name: "Create item" }] };
    const marker = toMarker(codedError("LOCATOR_NOT_FOUND", 'no button named "Create"', data));
    expect(marker).toEqual({ __bridgeError: 'LOCATOR_NOT_FOUND:no button named "Create"', __bridgeData: data });
    expect((marker as { __bridgeData?: unknown }).__bridgeData).not.toBe(data); // a JSON copy
  });

  it("an array is data too", () => {
    expect(toMarker(codedError("LOCATOR_AMBIGUOUS", "m", [1, 2]))).toEqual({ __bridgeError: "LOCATOR_AMBIGUOUS:m", __bridgeData: [1, 2] });
  });

  it("round-trips data through guard → unwrapResult as the BridgeError's data", () => {
    const data = { matches: [{ ref: "e2", name: "Save" }, { ref: "e3", name: "Save draft" }] };
    const marker = guard(() => {
      throw codedError("LOCATOR_AMBIGUOUS", "2 match", data);
    })();
    const e = caught(() => unwrapResult({ result: marker }));
    expect(e).toBeInstanceOf(BridgeError);
    expect(e.code).toBe("LOCATOR_AMBIGUOUS");
    expect(e.message).toBe("2 match");
    expect(e.data).toEqual(data);
  });

  it("a marker without data yields a BridgeError with data undefined", () => {
    const e = caught(() => unwrapResult({ result: guard(() => clickRef(new RefMap(), "e5"))() }));
    expect(e.code).toBe("REF_STALE");
    expect(e.data).toBeUndefined();
  });

  it("unserialisable or non-object data gives the bare marker, no throw", () => {
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    for (const data of [cyc, () => 1, "text", 3, null, undefined, { toJSON: () => undefined }]) {
      expect(toMarker(codedError("BAD_PARAMS", "m", data))).toEqual({ __bridgeError: "BAD_PARAMS:m" });
    }
  });

  it("null/undefined results still → REF_STALE", () => {
    expect(caught(() => unwrapResult({ result: null })).code).toBe("REF_STALE");
    expect(caught(() => unwrapResult({ result: undefined })).code).toBe("REF_STALE");
  });
});

describe("content action codes", () => {
  it("selectOption with no matching option → BAD_PARAMS", () => {
    const sel = document.createElement("select");
    sel.appendChild(new Option("A", "a"));
    document.body.appendChild(sel);
    const refs = new RefMap();
    const ref = refs.add(sel);
    expect(() => selectOptionRef(refs, ref, ["zzz"])).toThrow(/no option matched/);
    expect(toMarker(captureThrow(() => selectOptionRef(refs, ref, ["zzz"])))).toEqual({
      __bridgeError: 'BAD_PARAMS:no option matched ["zzz"]',
    });
  });

  it("centerForInput: an unknown ref → REF_STALE", () => {
    const err = captureThrow(() => centerForInputRef(new RefMap(), "e7"));
    expect((err as { code?: string }).code).toBe("REF_STALE");
    expect((err as Error).message).toBe("ref e7 not found — call browser_snapshot to re-snapshot");
  });

  it("centerForInput: a point outside the viewport → OFFSCREEN with the unchanged text", () => {
    const btn = document.createElement("button");
    btn.getBoundingClientRect = () => rect(5000, 10, 100, 20);
    document.body.appendChild(btn);
    const refs = new RefMap();
    const ref = refs.add(btn);
    const err = captureThrow(() => centerForInputRef(refs, ref, { width: 1280, height: 720 }));
    expect((err as { code?: string }).code).toBe("OFFSCREEN");
    expect((err as Error).message).toBe(
      `ref ${ref} is outside the viewport after scrolling (point 5050,20 vs 1280x720) — trusted input there would hit nothing`,
    );
  });

  it("centerForInput: an on-screen point is returned", () => {
    const btn = document.createElement("button");
    btn.getBoundingClientRect = () => rect(10, 10, 100, 20);
    document.body.appendChild(btn);
    const refs = new RefMap();
    expect(centerForInputRef(refs, refs.add(btn), { width: 1280, height: 720 })).toEqual({ x: 60, y: 20 });
  });
});

describe("window.__agentBridge is guarded", () => {
  it("every public method returns a marker instead of throwing", () => {
    const b = window.__agentBridge!;
    for (const call of [
      () => b.click("e999"),
      () => b.type("e999", "x", false),
      () => b.focusForTyping("e999"),
      () => b.scroll("e999", "down"),
      () => b.hover("e999"),
      () => b.selectOption("e999", ["a"]),
      () => b.centerForInput("e999"),
    ]) {
      expect(call()).toEqual({ __bridgeError: "REF_STALE:ref e999 not found — call browser_snapshot to re-snapshot" });
    }
  });

  it("the snapshot still returns its result", () => {
    const out = window.__agentBridge!.snapshot();
    // T3 (0.7): the result is data — `{url, title, elements, truncated}`, no `text`.
    expect(out).toHaveProperty("elements");
    expect(out).toHaveProperty("truncated");
    expect(out).not.toHaveProperty("text");
    expect(out).not.toHaveProperty("__bridgeError");
  });
});

describe("window.__agentBridge.locate / refOfMarked (S1 D11)", () => {
  it("locate is guarded: success returns {ref, role, name}, failure a marker with data", () => {
    document.body.innerHTML = `<button>Create item</button><button>Delete</button>`;
    const b = window.__agentBridge!;
    const ok = b.locate({ role: "button", name: "create" });
    expect(ok).toMatchObject({ role: "button", name: "Create item" });
    expect(b.refs.get(ok.ref)).toBe(document.querySelector("button"));
    const miss = b.locate({ role: "button", name: "Upload", exact: true }) as unknown as { __bridgeError: string; __bridgeData: { candidates: { name: string }[] } };
    expect(miss.__bridgeError).toMatch(/^LOCATOR_NOT_FOUND:no button named "Upload"/);
    expect(miss.__bridgeData.candidates.map((c) => c.name)).toEqual(["Delete", "Create item"]);
    const e = (() => {
      try {
        unwrapResult({ result: miss });
      } catch (err) {
        return err as BridgeError;
      }
      throw new Error("expected a throw");
    })();
    expect(e.code).toBe("LOCATOR_NOT_FOUND");
    expect((e.data as { candidates: unknown[] }).candidates).toHaveLength(2);
    expect(b.locate({ css: "p[" })).toMatchObject({ __bridgeError: expect.stringMatching(/^BAD_PARAMS:/) });
  });

  it("refOfMarked is guarded", () => {
    document.body.innerHTML = `<p data-__bridge-mark="k">Marked</p>`;
    const b = window.__agentBridge!;
    expect(b.refOfMarked("k")).toMatchObject({ role: "", name: "Marked" });
    expect(b.refOfMarked("k")).toMatchObject({ __bridgeError: expect.stringMatching(/^REF_STALE:/) });
  });
});

function captureThrow(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error("expected a throw");
}
