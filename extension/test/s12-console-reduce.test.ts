/**
 * Step 12 S3a, C3.3 (phase doc 0.5 with its Stage 0 note; decisions.md #323, #333; stage0-audit.md F8, §5 C3.3;
 * stage0-audit-2.md G-7): the pure reducer from CDP events to entries — the source filter runs BEFORE the URLs and
 * stacks are stripped, entries before the latest arm are dropped, revoked exceptions are dropped, an exception's
 * description is cut at its first stack line, the caps hold, newest last. And the per-call collector.
 */
import { describe, it, expect } from "vitest";
import { ArmFloor, ConsoleCollectors, armedFromUnknown, collectConsole, reduceConsole, type CdpEvent, type ReduceOptions } from "../src/console-messages.js";

const PAGE = "https://www.shop.example/cart";
const BLOCKED_SCRIPT = "https://ads.bank.example/tracker.js?token=SECRET-TOK";
const OWN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop/content.js";

const ctx = (id: number, origin: string): CdpEvent => ({ method: "Runtime.executionContextCreated", params: { context: { id, origin } } });
const log = (o: { type?: string; args?: unknown[]; ts?: number; ctx?: number; url?: string }): CdpEvent => ({
  method: "Runtime.consoleAPICalled",
  params: {
    type: o.type ?? "log",
    args: o.args ?? [{ type: "string", value: "hello" }],
    executionContextId: o.ctx ?? 1,
    timestamp: o.ts ?? 2000,
    ...(o.url ? { stackTrace: { callFrames: [{ url: o.url, functionName: "f", lineNumber: 1, columnNumber: 2 }] } } : {}),
  },
});
const thrown = (o: { id?: number; ts?: number; text?: string; exception?: unknown; url?: string; ctx?: number }): CdpEvent => ({
  method: "Runtime.exceptionThrown",
  params: {
    timestamp: o.ts ?? 2000,
    exceptionDetails: {
      exceptionId: o.id ?? 1,
      text: o.text ?? "Uncaught",
      executionContextId: o.ctx ?? 1,
      ...(o.url !== undefined ? { url: o.url } : {}),
      ...(o.exception !== undefined ? { exception: o.exception } : {}),
    },
  },
});

const blockedHost = (u: string) => /bank\.example/.test(u);
const opts = (o: Partial<ReduceOptions> = {}): ReduceOptions => ({ dropSource: blockedHost, floor: 1000, limit: 200, ...o });

describe("reduceConsole — the entry shape", () => {
  it("a console message: {level, text, ts, kind}, args joined by a space, no URL, no stack", () => {
    const out = reduceConsole(
      [ctx(1, "https://www.shop.example"), log({ args: [{ type: "string", value: "n =" }, { type: "number", value: 3, description: "3" }], url: PAGE })],
      opts(),
    );
    expect(out).toEqual([{ level: "info", text: "n = 3", ts: 2000, kind: "console" }]);
    expect(JSON.stringify(out)).not.toMatch(/https?:|stack|callFrames/);
  });

  it("levels: error/assert → error, warning → warning, debug → debug, the rest → info", () => {
    const types = ["error", "assert", "warning", "debug", "log", "info", "table", "trace", "dir"];
    const out = reduceConsole([ctx(1, "https://www.shop.example"), ...types.map((type, i) => log({ type, ts: 2000 + i }))], opts());
    expect(out.map((e) => e.level)).toEqual(["error", "error", "warning", "debug", "info", "info", "info", "info", "info"]);
  });

  it("primitives and objects: undefined, null, booleans, unserializable numbers, an object's description and preview", () => {
    const args = [
      { type: "undefined" },
      { type: "object", subtype: "null", value: null },
      { type: "boolean", value: true },
      { type: "number", unserializableValue: "NaN", description: "NaN" },
      { type: "object", className: "Object", description: "Object", preview: { properties: [{ name: "a", type: "number", value: "1" }], overflow: true } },
      { type: "object", subtype: "array", description: "Array(2)", preview: { properties: [{ name: "0", type: "string", value: "x" }, { name: "1", type: "number", value: "2" }] } },
    ];
    const out = reduceConsole([ctx(1, "https://www.shop.example"), log({ args })], opts());
    expect(out[0]!.text).toBe("undefined null true NaN Object {a: 1, …} Array(2) [x, 2]");
  });

  it("an Error argument's description is cut at its first stack line (its URLs go with it)", () => {
    const err = { type: "object", subtype: "error", className: "Error", description: `Error: boom\nsecond line\n    at f (${BLOCKED_SCRIPT}:1:2)\n    at ${PAGE}:3:4` };
    const out = reduceConsole([ctx(1, "https://www.shop.example"), log({ type: "error", args: [err] })], opts({ dropSource: () => false }));
    expect(out[0]!.text).toBe("Error: boom\nsecond line");
  });
});

describe("reduceConsole — exceptions (F8 (a))", () => {
  it("text = exceptionDetails.text + the exception's description cut at its first stack line; no URL, no stack", () => {
    const exception = { type: "object", subtype: "error", className: "TypeError", description: `TypeError: x is not a function\n    at g (${PAGE}:10:5)\n    at https://cdn.example/lib.js:1:1` };
    const out = reduceConsole([ctx(1, "https://www.shop.example"), thrown({ exception, url: PAGE })], opts({ dropSource: () => false }));
    expect(out).toEqual([{ level: "error", text: "Uncaught TypeError: x is not a function", ts: 2000, kind: "exception" }]);
    expect(JSON.stringify(out)).not.toMatch(/https?:|\bat g\b/);
  });

  it("a thrown primitive and an exception with no object", () => {
    const out = reduceConsole(
      [ctx(1, "https://www.shop.example"), thrown({ id: 1, exception: { type: "string", value: "plain" } }), thrown({ id: 2, text: "Uncaught (in promise)", ts: 2001 })],
      opts(),
    );
    expect(out.map((e) => e.text)).toEqual(["Uncaught plain", "Uncaught (in promise)"]);
  });

  it("an exception revoked by exceptionRevoked is dropped; the others stay", () => {
    const out = reduceConsole(
      [
        ctx(1, "https://www.shop.example"),
        thrown({ id: 7, text: "Uncaught (in promise)" }),
        thrown({ id: 8, text: "Uncaught", ts: 2001 }),
        { method: "Runtime.exceptionRevoked", params: { reason: "Handler added to rejected promise", exceptionId: 7 } },
      ],
      opts(),
    );
    expect(out.map((e) => e.text)).toEqual(["Uncaught"]);
  });
});

describe("reduceConsole — the source filter runs before stripping (G-7, F8 (c))", () => {
  it("a blocked stack URL, a blocked context origin, a blocked exception url or a blocked URL inside the description's stack drops the entry", () => {
    const events: CdpEvent[] = [
      ctx(1, "https://www.shop.example"),
      ctx(2, "https://a.bank.example"),
      log({ args: [{ type: "string", value: "keep-1" }], ts: 2001 }),
      log({ args: [{ type: "string", value: "drop-stack" }], url: BLOCKED_SCRIPT, ts: 2002 }),
      log({ args: [{ type: "string", value: "drop-ctx" }], ctx: 2, ts: 2003 }),
      thrown({ id: 1, url: BLOCKED_SCRIPT, exception: { type: "string", value: "drop-url" }, ts: 2004 }),
      thrown({ id: 2, exception: { type: "object", description: `Error: drop-desc\n    at h (${BLOCKED_SCRIPT}:1:1)` }, ts: 2005 }),
      log({ args: [{ type: "string", value: "keep-2" }], url: PAGE, ts: 2006 }),
    ];
    const out = reduceConsole(events, opts());
    expect(out.map((e) => e.text)).toEqual(["keep-1", "keep-2"]);
    expect(JSON.stringify(out)).not.toMatch(/drop-|SECRET-TOK/);
  });

  it("the predicate sees the URLs (an own-extension source, a file: source) and the reducer drops what it names", () => {
    const seen: string[] = [];
    const drop = (u: string) => (seen.push(u), u.startsWith("chrome-extension:") || u.startsWith("file:"));
    const out = reduceConsole(
      [ctx(1, "https://www.shop.example"), log({ url: OWN, ts: 2001 }), log({ url: "file:///C:/x.js", ts: 2002 }), log({ url: PAGE, ts: 2003, args: [{ type: "string", value: "ok" }] })],
      opts({ dropSource: drop }),
    );
    expect(out.map((e) => e.text)).toEqual(["ok"]);
    expect(seen).toEqual(expect.arrayContaining([OWN, "file:///C:/x.js", PAGE, "https://www.shop.example"]));
  });

  it("an entry with no known source (an unknown context, no URL) is dropped (fails closed)", () => {
    const out = reduceConsole([ctx(1, "https://www.shop.example"), log({ ctx: 99 }), thrown({ ctx: 99, ts: 2001 })], opts());
    expect(out).toEqual([]);
  });

  it("F1: an object whose preview holds an Error's stack — a blocked stack URL drops the entry; an allowed one keeps no `at` line", () => {
    const withErr = (u: string) => ({
      type: "object",
      className: "Object",
      description: "Object",
      preview: { type: "object", properties: [{ name: "err", type: "object", subtype: "error", value: `Error: boom\n    at t (${u}:1:1)` }] },
    });
    const arr = { type: "object", subtype: "array", description: "Array(1)", preview: { type: "object", subtype: "array", properties: [{ name: "0", type: "object", subtype: "error", value: `Error: a\n    at ${BLOCKED_SCRIPT}:1:1` }] } };
    const out = reduceConsole(
      [ctx(1, "https://www.shop.example"), log({ args: [withErr(BLOCKED_SCRIPT)], ts: 2001 }), log({ args: [arr], ts: 2002 }), log({ args: [withErr(PAGE)], ts: 2003 })],
      opts(),
    );
    expect(out.map((e) => e.text)).toEqual(["Object {err: Error: boom}"]);
    expect(JSON.stringify(out)).not.toMatch(/https?:|\bat t\b|SECRET-TOK/);
  });

  it("Note A (#344 (3)): a preview value V8 shortened (its cut part ends in `…`) is an unknown source and drops its entry", () => {
    const withVal = (v: string) => ({ type: "object", className: "Object", description: "Object", preview: { type: "object", properties: [{ name: "e", type: "object", subtype: "error", value: v }] } });
    const out = reduceConsole(
      [
        ctx(1, "https://www.shop.example"),
        log({ args: [withVal("Error: secret-msg\n    at t (https://ads.ba…")], ts: 2001 }),
        log({ args: [withVal("Error: secret-msg\n    at t (https://ads.bank.exa…  ")], ts: 2002 }),
        log({ args: [withVal(`Error: kept\n    at t (${PAGE}:1:1)`)], ts: 2003 }),
      ],
      opts(),
    );
    expect(out.map((e) => e.text)).toEqual(["Object {e: Error: kept}"]);
    expect(JSON.stringify(out)).not.toContain("secret-msg");
  });

  const shortVal = (v: string, type = "object") => ({ type: "object", className: "Object", description: "Object", preview: { type: "object", properties: [{ name: "e", type, subtype: type === "object" ? "error" : undefined, value: v }] } });

  it("Note A, S3b F1: a non-string preview value shortened inside the message (no stack line left) drops its entry; a string value stays", () => {
    const out = reduceConsole(
      [ctx(1, "https://www.shop.example"), log({ args: [shortVal(`Error: secret-msg-${"x".repeat(80)}…`)], ts: 2001 }), log({ args: [shortVal("str-kept…", "string")], ts: 2002 })],
      opts(),
    );
    expect(out.map((e) => e.text)).toEqual(["Object {e: str-kept…}"]);
    expect(JSON.stringify(out)).not.toContain("secret-msg");
  });

  it("Note A, S3b F1: a non-string preview value shortened inside `at` (no stack line matched) drops its entry", () => {
    const out = reduceConsole(
      [ctx(1, "https://www.shop.example"), log({ args: [shortVal("Error: secret-msg\n    at…")], ts: 2001 }), log({ args: [shortVal("Error: secret-msg\n    at…  ")], ts: 2002 })],
      opts(),
    );
    expect(out).toEqual([]);
  });

  it("M-1: a source that is not a URL with a host or a known scheme does not count (no other source → dropped)", () => {
    const events: CdpEvent[] = [];
    ["null", "foo.js", "<anonymous>", "webpack-internal:///./a.js"].forEach((u, i) => events.push(log({ ctx: 99, url: u, ts: 2001 + i })));
    events.push(ctx(1, "https://www.shop.example"), log({ url: "<anonymous>", ts: 2010, args: [{ type: "string", value: "ctx-known" }] }));
    events.push(log({ ctx: 99, url: "blob:https://www.shop.example/0-1", ts: 2011, args: [{ type: "string", value: "blob-ok" }] }));
    const out = reduceConsole(events, opts());
    expect(out.map((e) => e.text)).toEqual(["ctx-known", "blob-ok"]);
  });
});

describe("armedFromUnknown (M-2: the floor moves whenever the state lands on armed from anything but armed)", () => {
  const armed = { armed: true, evaluate: true, blockList: "", uploadFolders: "" };
  it("null, unreadable or disarmed → armed is an arm; armed → armed and anything → not armed are not", () => {
    expect(armedFromUnknown(null, armed)).toBe(true);
    expect(armedFromUnknown({ unreadable: true }, armed)).toBe(true);
    expect(armedFromUnknown({ ...armed, armed: false }, armed)).toBe(true);
    expect(armedFromUnknown(armed, armed)).toBe(false);
    expect(armedFromUnknown(null, { ...armed, armed: false })).toBe(false);
    expect(armedFromUnknown(null, { unreadable: true })).toBe(false);
    expect(armedFromUnknown(armed, null)).toBe(false);
  });
});

describe("reduceConsole — the arm floor, the level filter, the caps, the order", () => {
  it("entries timestamped before the latest arm are dropped; a missing timestamp too", () => {
    const noTs: CdpEvent = { method: "Runtime.consoleAPICalled", params: { type: "log", args: [{ type: "string", value: "x" }], executionContextId: 1 } };
    const out = reduceConsole([ctx(1, "https://www.shop.example"), log({ ts: 999 }), log({ ts: 1000, args: [{ type: "string", value: "at" }] }), thrown({ ts: 500 }), noTs], opts());
    expect(out.map((e) => e.text)).toEqual(["at"]);
  });

  it("level: each level includes the more severe ones", () => {
    const events = [ctx(1, "https://www.shop.example"), log({ type: "debug", ts: 2001 }), log({ type: "log", ts: 2002 }), log({ type: "warning", ts: 2003 }), thrown({ ts: 2004 })];
    expect(reduceConsole(events, opts({ level: "error" })).map((e) => e.level)).toEqual(["error"]);
    expect(reduceConsole(events, opts({ level: "warning" })).map((e) => e.level)).toEqual(["warning", "error"]);
    expect(reduceConsole(events, opts({ level: "info" })).map((e) => e.level)).toEqual(["info", "warning", "error"]);
    expect(reduceConsole(events, opts({ level: "debug" })).length).toBe(4);
    expect(reduceConsole(events, opts()).length).toBe(4);
  });

  it("text is capped at 2000 characters (an ellipsis last), a surrogate pair never split", () => {
    const long = "a".repeat(1998) + "😀" + "b".repeat(1_000_000);
    const out = reduceConsole([ctx(1, "https://www.shop.example"), log({ args: [{ type: "string", value: long }] })], opts());
    expect(out[0]!.text.length).toBeLessThanOrEqual(2000);
    expect(out[0]!.text.endsWith("…")).toBe(true);
    // N3: a boolean, not a string diff — a regression must fail here, not crash the worker on a 1 MB diff.
    expect(out[0]!.text === "a".repeat(1998) + "…").toBe(true);
  });

  it("at most `limit` (≤ 200) entries, the newest, newest last, ordered by timestamp", () => {
    const events: CdpEvent[] = [ctx(1, "https://www.shop.example")];
    for (let i = 0; i < 1000; i++) events.push(log({ ts: 5000 - i, args: [{ type: "string", value: `m${999 - i}` }] }));
    const all = reduceConsole(events, opts());
    expect(all).toHaveLength(200);
    expect(all[0]!.text).toBe("m800");
    expect(all[199]!.text).toBe("m999");
    expect(reduceConsole(events, opts({ limit: 3 })).map((e) => e.text)).toEqual(["m997", "m998", "m999"]);
    expect(reduceConsole(events, opts({ limit: 5000 }))).toHaveLength(200);
  });
});

describe("ConsoleCollectors and collectConsole (F7)", () => {
  it("feeds only this tab's own session (no sessionId), only the four Runtime events", () => {
    const cs = new ConsoleCollectors();
    const c = cs.start(5);
    cs.feed({ tabId: 5 }, "Runtime.consoleAPICalled", { a: 1 });
    cs.feed({ tabId: 5, sessionId: "child" }, "Runtime.consoleAPICalled", { a: 2 });
    cs.feed({ tabId: 6 }, "Runtime.consoleAPICalled", { a: 3 });
    cs.feed({ tabId: 5 }, "Debugger.paused", { a: 4 });
    cs.feed({ tabId: 5 }, "Runtime.executionContextCreated", { a: 5 });
    cs.stop(c);
    cs.feed({ tabId: 5 }, "Runtime.consoleAPICalled", { a: 6 });
    expect(c.events).toEqual([
      { method: "Runtime.consoleAPICalled", params: { a: 1 } },
      { method: "Runtime.executionContextCreated", params: { a: 5 } },
    ]);
    expect(cs.size).toBe(0);
  });

  it("a collector keeps at most its bound, the newest", () => {
    const cs = new ConsoleCollectors(3);
    const c = cs.start(1);
    for (let i = 0; i < 5; i++) cs.feed({ tabId: 1 }, "Runtime.consoleAPICalled", { i });
    expect(c.events.map((e) => (e.params as { i: number }).i)).toEqual([2, 3, 4]);
  });

  it("collectConsole: exactly Runtime.enable, the settle wait, Runtime.disable; the collector closed; never discard or Log", async () => {
    const cs = new ConsoleCollectors();
    const sent: string[] = [];
    const events = await collectConsole(5, {
      collectors: cs,
      send: async (m) => {
        sent.push(m);
        if (m === "Runtime.enable") cs.feed({ tabId: 5 }, "Runtime.consoleAPICalled", { replayed: true });
        return {};
      },
      wait: async (ms) => void sent.push(`wait ${ms}`),
    });
    expect(sent).toEqual(["Runtime.enable", "wait 100", "Runtime.disable"]);
    expect(events).toEqual([{ method: "Runtime.consoleAPICalled", params: { replayed: true } }]);
    expect(cs.size).toBe(0);
  });

  it("collectConsole: a failing enable still sends disable, closes the collector and rethrows; a failing disable is swallowed", async () => {
    const cs = new ConsoleCollectors();
    const sent: string[] = [];
    await expect(
      collectConsole(5, { collectors: cs, send: async (m) => (sent.push(m), m === "Runtime.enable" ? Promise.reject(new Error("enable failed")) : {}), wait: async () => {} }),
    ).rejects.toThrow("enable failed");
    expect(sent).toEqual(["Runtime.enable", "Runtime.disable"]);
    expect(cs.size).toBe(0);
    const out = await collectConsole(5, { collectors: cs, send: async (m) => (m === "Runtime.disable" ? Promise.reject(new Error("gone")) : {}), wait: async () => {} });
    expect(out).toEqual([]);
    expect(cs.size).toBe(0);
  });
});

describe("ArmFloor", () => {
  it("starts at the worker's start and moves to each arm", () => {
    let t = 100;
    const f = new ArmFloor(() => t);
    expect(f.floor).toBe(100);
    t = 250;
    f.armed();
    expect(f.floor).toBe(250);
  });
});
