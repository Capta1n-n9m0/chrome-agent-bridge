// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { serializeForAgent, SERIALIZER_SRC, DEFAULT_LIMITS, type SerializeLimits } from "../src/evaluate/serialize.js";

const LIMITS: SerializeLimits = DEFAULT_LIMITS;

describe("serializeForAgent — self-containment", () => {
  it("is shippable as source: the stringified function behaves like the export", () => {
    const value = { a: 1, b: ["x", { c: true }], d: new Map([["k", 2]]) };
    const viaSource = new Function("return " + SERIALIZER_SRC)().call(value, LIMITS);
    expect(viaSource).toEqual(serializeForAgent(value, LIMITS));
  });

  it("contains no import/export/require and no chrome.* reference", () => {
    expect(SERIALIZER_SRC).not.toMatch(/\b(import|export|require)\b/);
    expect(SERIALIZER_SRC).not.toMatch(/\bchrome\./);
  });

  it("has the documented defaults", () => {
    expect(DEFAULT_LIMITS).toEqual({ maxDepth: 6, maxItems: 100, maxString: 5000 });
  });
});

describe("serializeForAgent — plain data", () => {
  it("returns plain JSON with a pretty description", () => {
    const env = serializeForAgent({ a: 1, b: [1, 2] }, LIMITS);
    expect(env.kind).toBe("json");
    expect(env.value).toEqual({ a: 1, b: [1, 2] });
    expect(env.description).toBe(JSON.stringify({ a: 1, b: [1, 2] }, null, 2));
    expect(env.truncated).toBe(false);
  });

  it("keeps nested undefined and function values visible instead of dropping the key", () => {
    const env = serializeForAgent({ u: undefined, f: function secret() {}, g: () => 1 }, LIMITS);
    expect(env.value).toEqual({ u: "undefined", f: "[Function: secret]", g: "[Function: g]" });
    expect(env.description).toContain('"[Function: secret]"');
  });

  it("replaces values beyond maxDepth with placeholders", () => {
    const env = serializeForAgent({ a: { b: { c: { d: [1, 2, 3] } } } }, { maxDepth: 2, maxItems: 100, maxString: 100 });
    expect(env.value).toEqual({ a: { b: { c: "[Object]" } } });
    expect(env.truncated).toBe(true);
    const arr = serializeForAgent({ a: { b: [1, 2, 3] } }, { maxDepth: 1, maxItems: 100, maxString: 100 });
    expect(arr.value).toEqual({ a: { b: "[Array(3)]" } });
    expect(arr.truncated).toBe(true);
  });

  it("keeps the first maxItems of a long array and says how many were dropped", () => {
    const env = serializeForAgent(Array.from({ length: 10000 }, (_, i) => i), LIMITS);
    const value = env.value as unknown[];
    expect(value.length).toBe(101);
    expect(value[0]).toBe(0);
    expect(value[99]).toBe(99);
    expect(value[100]).toBe("… 9900 more");
    expect(env.truncated).toBe(true);
  });

  it("keeps the first maxItems of a wide object and says how many were dropped", () => {
    const wide: Record<string, number> = {};
    for (let i = 0; i < 105; i++) wide["k" + i] = i;
    const env = serializeForAgent(wide, LIMITS);
    const value = env.value as Record<string, unknown>;
    expect(Object.keys(value).length).toBe(101);
    expect(value["…"]).toBe("… 5 more");
    expect(env.truncated).toBe(true);
  });

  it("cuts long strings, top-level and nested", () => {
    const long = "x".repeat(50);
    const env = serializeForAgent({ s: long }, { maxDepth: 6, maxItems: 100, maxString: 10 });
    expect(env.value).toEqual({ s: "xxxxxxxxxx…[+40 chars]" });
    expect(env.truncated).toBe(true);
  });

  it("marks cycles instead of throwing", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    const env = serializeForAgent(cyclic, LIMITS);
    expect(env.value).toEqual({ a: 1, self: "[Circular]" });
    expect(env.truncated).toBe(true);
  });
});

describe("serializeForAgent — built-ins", () => {
  it("describes Map and Set structurally", () => {
    const m = serializeForAgent(new Map<string, unknown>([["a", 1], ["b", { c: 2 }]]), LIMITS);
    expect(m.value).toEqual({ __type: "Map", entries: [["a", 1], ["b", { c: 2 }]] });
    const s = serializeForAgent(new Set([1, 2, 3]), LIMITS);
    expect(s.value).toEqual({ __type: "Set", values: [1, 2, 3] });
  });

  it("honours maxItems inside Map and Set", () => {
    const big = new Set(Array.from({ length: 10 }, (_, i) => i));
    const env = serializeForAgent(big, { maxDepth: 6, maxItems: 3, maxString: 100 });
    expect((env.value as { values: unknown[] }).values).toEqual([0, 1, 2, "… 7 more"]);
    expect(env.truncated).toBe(true);
  });

  it("renders Date, RegExp, BigInt and Symbol as strings", () => {
    const d = new Date("2020-01-02T03:04:05.000Z");
    expect(serializeForAgent({ d, re: /ab+c/gi, big: 123n, sym: Symbol("s") }, LIMITS).value).toEqual({
      d: "2020-01-02T03:04:05.000Z",
      re: "/ab+c/gi",
      big: "123n",
      sym: "Symbol(s)",
    });
  });

  it("never dumps binary data", () => {
    const env = serializeForAgent({ buf: new ArrayBuffer(1024), arr: new Uint8Array(8) }, LIMITS);
    expect(env.value).toEqual({ buf: "ArrayBuffer(1024)", arr: "Uint8Array(8)" });
  });
});

describe("serializeForAgent — errors", () => {
  it("describes an Error with its name, message and a short stack", () => {
    const err = new TypeError("nope");
    err.stack = ["TypeError: nope", " at a", " at b", " at c", " at d", " at e", " at f"].join("\n");
    const env = serializeForAgent(err, LIMITS);
    expect(env.kind).toBe("error");
    expect(env.description).toContain("TypeError: nope");
    expect(env.description).toContain(" at e");
    expect(env.description).not.toContain(" at f");
  });

  it("describes an Error subclass and a DOMException", () => {
    class MyError extends Error {}
    const mine = new MyError("custom");
    mine.name = "MyError";
    expect(serializeForAgent(mine, LIMITS).description).toContain("MyError: custom");
    const dom = serializeForAgent(new DOMException("denied", "NotAllowedError"), LIMITS);
    expect(dom.kind).toBe("error");
    expect(dom.description).toContain("NotAllowedError: denied");
  });
});

describe("serializeForAgent — DOM", () => {
  it("describes an element by tag, id, class and text head", () => {
    document.body.innerHTML = `<div id="app" class="x y">Hello world</div>`;
    const env = serializeForAgent(document.getElementById("app"), LIMITS);
    expect(env.kind).toBe("node");
    expect(env.description).toBe('<div id="app" class="x y"> "Hello world"');
  });

  it("describes the document, the window and a text node", () => {
    expect(serializeForAgent(document, LIMITS).description).toContain("#document ");
    expect(serializeForAgent(window, LIMITS).description).toContain("Window ");
    document.body.innerHTML = `<p>just text</p>`;
    const text = document.querySelector("p")!.firstChild;
    expect(serializeForAgent(text, LIMITS).description).toContain("just text");
  });

  it("turns a NodeList into an array of node descriptions", () => {
    document.body.innerHTML = `<a href="/1" id="one">One</a><a href="/2">Two</a>`;
    const env = serializeForAgent(document.querySelectorAll("a"), LIMITS);
    expect(env.kind).toBe("json");
    expect(env.value).toEqual(['<a id="one"> "One"', '<a> "Two"']);
  });

  it("turns an array of nodes into node descriptions too", () => {
    document.body.innerHTML = `<button id="go">Go</button>`;
    const env = serializeForAgent([document.getElementById("go")], LIMITS);
    expect(env.value).toEqual(['<button id="go"> "Go"']);
  });
});

describe("serializeForAgent — functions and class instances", () => {
  it("describes a function by its source head", () => {
    const env = serializeForAgent(function add(a: number, b: number) {
      return a + b;
    }, LIMITS);
    expect(env.kind).toBe("function");
    expect(env.description).toContain("function add(");
    expect(env.description.length).toBeLessThanOrEqual(201);
  });

  it("prefixes a class instance description with its constructor name", () => {
    class Foo {
      a = 1;
      get boom(): number {
        throw new Error("never called");
      }
    }
    const env = serializeForAgent(new Foo(), LIMITS);
    expect(env.kind).toBe("json");
    expect(env.value).toEqual({ a: 1 });
    expect(env.description.startsWith("Foo {")).toBe(true);
  });

  it("survives an own getter that throws", () => {
    const o = {};
    Object.defineProperty(o, "bad", {
      enumerable: true,
      get() {
        throw new Error("kaboom");
      },
    });
    const env = serializeForAgent(o, LIMITS);
    expect(env.value).toEqual({ bad: "[Threw: kaboom]" });
  });
});
