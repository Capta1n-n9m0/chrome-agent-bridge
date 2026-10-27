// Step 8 S3 — the typed Tab, the client's cursor, the stale-Tab guard and the trusted-input policy.
// A fake daemon connection answers every call; the assertions are on the frames the client sent.
import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BridgeError, ErrorCodes, type WelcomeMessage } from "@bridge/shared";
import { BridgeClient, type Timers } from "../src/client.js";
import type { Knocked } from "../src/knock.js";
import { Tab } from "../src/tab.js";
import { TRUSTED_INPUT_POLICY } from "../src/policy.js";
import { FakeConnection } from "./fakes.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 250]);
const DATA_URL = `data:image/png;base64,${PNG.toString("base64")}`;

const RESULTS: Record<string, unknown> = {
  "tabs.claim": { tab: "T3" },
  newTab: { tab: "T7", id: 1007 },
  snapshot: { url: "https://a.test/", title: "A", elements: [], truncated: false },
  screenshot: { dataUrl: DATA_URL },
  locate: { ref: "e4", role: "button", name: "Save" },
  evaluate: { kind: "json", value: { n: 1 }, description: "{n:1}", truncated: false },
  networkRequests: { entries: [{ id: "r1" }], total: 1 },
  networkClear: { cleared: 4 },
  consoleMessages: { entries: [{ level: "info", text: "hi", ts: 5, kind: "console" }] },
  downloadStart: {
    id: "d1",
    size: 3,
    status: 200,
    contentType: "application/octet-stream",
    filename: "f.bin",
    redirected: false,
    finalHost: "files.test",
  },
  downloadChunk: { data: Buffer.from("abc").toString("base64") },
};

function welcome(over: Partial<WelcomeMessage> = {}): WelcomeMessage {
  return { type: "welcome", build: "B", proto: 2, clientId: "c1", extensionConnected: true, ...over };
}

const noTimers: Timers = { setTimeout: () => ({}), clearTimeout: () => {} };

/** A connection that answers each call with `results[method]` (default `{ok: true}`). */
function answering(results: Record<string, unknown> = RESULTS): FakeConnection {
  return new FakeConnection((m, c) => {
    if (typeof m.method !== "string") return;
    const r = Object.prototype.hasOwnProperty.call(results, m.method) ? results[m.method] : { ok: true };
    c.emit({ id: m.id, result: r });
  });
}

async function connected(conns: FakeConnection[] = [answering()]) {
  let i = 0;
  const knock = vi.fn(async (): Promise<Knocked> => {
    const conn = conns[Math.min(i, conns.length - 1)];
    i += 1;
    return { conn, welcome: welcome({ clientId: `c${i}` }) };
  });
  const client = new BridgeClient({ knock, timers: noTimers });
  await client.connect();
  return { client, knock, conn: conns[0] };
}

/** method, params and call timeoutMs of each frame sent (hello frames excluded). */
function frames(conn: FakeConnection) {
  return conn.sent
    .filter((f) => typeof f.method === "string")
    .map((f) => {
      const out: Record<string, unknown> = { method: f.method, params: f.params };
      if (f.timeoutMs !== undefined) out.timeoutMs = f.timeoutMs;
      return out;
    });
}

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(BridgeError);
    return err as BridgeError;
  }
  throw new Error("expected a rejection");
}

const flush = () => new Promise<void>((r) => setImmediate(r));

let tmp: string | null = null;
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});
function tempDir(): string {
  tmp = mkdtempSync(path.join(os.tmpdir(), "bridge-tab-"));
  return tmp;
}

type Expected = { method: string; params?: Record<string, unknown>; timeoutMs?: number };

/** Each Tab method → the exact frames it sends (beside the claim that made the Tab). */
const CASES: [string, (t: Tab) => Promise<unknown>, Expected[]][] = [
  ["navigate", (t) => t.navigate("https://a.test/x"), [{ method: "navigate", params: { tab: "T3", url: "https://a.test/x" } }]],
  ["back", (t) => t.back(), [{ method: "back", params: { tab: "T3" } }]],
  ["forward", (t) => t.forward(), [{ method: "forward", params: { tab: "T3" } }]],
  ["snapshot", (t) => t.snapshot(), [{ method: "snapshot", params: { tab: "T3" } }]],
  ["screenshot()", (t) => t.screenshot(), [{ method: "screenshot", params: { tab: "T3" } }]],
  [
    "screenshot({fullPage, mode})",
    (t) => t.screenshot({ fullPage: true, mode: "cdp" }),
    [{ method: "screenshot", params: { tab: "T3", fullPage: true, mode: "cdp" } }],
  ],
  ["click(ref)", (t) => t.click("e1"), [{ method: "click", params: { tab: "T3", ref: "e1" } }]],
  [
    "click(locator)",
    (t) => t.click({ role: "button", name: "Save" }),
    [{ method: "click", params: { tab: "T3", locator: { role: "button", name: "Save" } } }],
  ],
  [
    "click(ref, {trusted:true}) — focusFirst",
    (t) => t.click("e1", { trusted: true }),
    [
      { method: "focusTab", params: { tab: "T3" } },
      { method: "click", params: { tab: "T3", ref: "e1", trusted: true } },
    ],
  ],
  [
    "type(ref, text, {submit})",
    (t) => t.type("e2", "hi", { submit: true }),
    [{ method: "type", params: { tab: "T3", ref: "e2", text: "hi", submit: true } }],
  ],
  [
    "type(locator, text, {trusted:true}) — focusFirst",
    (t) => t.type({ text: "Email" }, "x@y.com", { trusted: true }),
    [
      { method: "focusTab", params: { tab: "T3" } },
      { method: "type", params: { tab: "T3", locator: { text: "Email" }, text: "x@y.com", trusted: true } },
    ],
  ],
  ["pressKey", (t) => t.pressKey("Enter"), [{ method: "pressKey", params: { tab: "T3", key: "Enter" } }]],
  [
    "pressKey({trusted:true}) — focusFirst",
    (t) => t.pressKey("Tab", { trusted: true }),
    [
      { method: "focusTab", params: { tab: "T3" } },
      { method: "pressKey", params: { tab: "T3", key: "Tab", trusted: true } },
    ],
  ],
  ["hover", (t) => t.hover("e5"), [{ method: "hover", params: { tab: "T3", ref: "e5" } }]],
  ["scroll()", (t) => t.scroll(), [{ method: "scroll", params: { tab: "T3" } }]],
  [
    "scroll({target, direction})",
    (t) => t.scroll({ target: { css: "#list" }, direction: "up" }),
    [{ method: "scroll", params: { tab: "T3", locator: { css: "#list" }, direction: "up" } }],
  ],
  [
    "selectOption",
    (t) => t.selectOption("e6", ["a", "b"]),
    [{ method: "selectOption", params: { tab: "T3", ref: "e6", values: ["a", "b"] } }],
  ],
  [
    "locate",
    (t) => t.locate({ role: "link", name: { regex: "^Next" }, nth: 0 }),
    [{ method: "locate", params: { tab: "T3", locator: { role: "link", name: { regex: "^Next" }, nth: 0 } } }],
  ],
  [
    "waitFor({text})",
    (t) => t.waitFor({ text: "Done" }),
    [{ method: "waitFor", params: { tab: "T3", text: "Done" }, timeoutMs: 15_000 }],
  ],
  [
    "waitFor({locator, state, timeoutMs})",
    (t) => t.waitFor({ locator: { css: ".spinner" }, state: "hidden", timeoutMs: 20_000 }),
    [
      {
        method: "waitFor",
        params: { tab: "T3", locator: { css: ".spinner" }, state: "hidden", timeoutMs: 20_000 },
        timeoutMs: 25_000,
      },
    ],
  ],
  [
    "waitFor({locator}) — default 10 s",
    (t) => t.waitFor({ locator: { text: "Saved" } }),
    [{ method: "waitFor", params: { tab: "T3", locator: { text: "Saved" } }, timeoutMs: 15_000 }],
  ],
  [
    "waitFor({networkIdle, idleMs})",
    (t) => t.waitFor({ networkIdle: true, idleMs: 800 }),
    [{ method: "waitFor", params: { tab: "T3", networkIdle: true, idleMs: 800 }, timeoutMs: 15_000 }],
  ],
  [
    "waitFor({seconds: 45})",
    (t) => t.waitFor({ seconds: 45 }),
    [{ method: "waitFor", params: { tab: "T3", seconds: 45 }, timeoutMs: 50_000 }],
  ],
  [
    "evaluate (default 10 s)",
    (t) => t.evaluate("1+1"),
    [{ method: "evaluate", params: { tab: "T3", expression: "1+1", timeoutMs: 10_000 }, timeoutMs: 15_000 }],
  ],
  [
    "evaluate({timeoutMs})",
    (t) => t.evaluate("x", { timeoutMs: 30_000 }),
    [{ method: "evaluate", params: { tab: "T3", expression: "x", timeoutMs: 30_000 }, timeoutMs: 35_000 }],
  ],
  ["network()", (t) => t.network(), [{ method: "networkRequests", params: { tab: "T3" } }]],
  [
    "network({filter, types, failedOnly, limit, includeHeaders})",
    (t) => t.network({ filter: "/api/", types: ["xhr"], failedOnly: true, limit: 5, includeHeaders: true }),
    [
      {
        method: "networkRequests",
        params: { tab: "T3", filter: "/api/", types: ["xhr"], failedOnly: true, limit: 5, includeHeaders: true },
      },
    ],
  ],
  ["network({id}) — no tab", (t) => t.network({ id: "r9" }), [{ method: "networkRequests", params: { id: "r9" } }]],
  ["networkClear", (t) => t.networkClear(), [{ method: "networkClear", params: { tab: "T3" } }]],
  ["focus", (t) => t.focus(), [{ method: "focusTab", params: { tab: "T3" } }]],
  ["close", (t) => t.close(), [{ method: "closeTab", params: { tab: "T3" } }]],
  ["release", (t) => t.release(), [{ method: "tabs.release", params: { tab: "T3" } }]],
  // Step 12 S3b: absent options are dropped, never sent as undefined.
  ["consoleMessages()", (t) => t.consoleMessages(), [{ method: "consoleMessages", params: { tab: "T3" } }]],
  [
    "consoleMessages({level, limit})",
    (t) => t.consoleMessages({ level: "warning", limit: 5 }),
    [{ method: "consoleMessages", params: { level: "warning", limit: 5, tab: "T3" } }],
  ],
];

async function claimedTab() {
  const h = await connected();
  const tab = await h.client.claim("T3");
  h.conn.sent.length = 0;
  return { ...h, tab };
}

describe("Tab — the exact {method, params} of every method (phase doc 0.4)", () => {
  for (const [name, run, expected] of CASES) {
    it(name, async () => {
      const { tab, conn } = await claimedTab();
      await run(tab);
      const sent = frames(conn);
      expect(sent).toHaveLength(expected.length);
      sent.forEach((f, i) => {
        expect(f.method).toBe(expected[i].method);
        expect(f.params).toStrictEqual(expected[i].params);
        expect(f.timeoutMs).toBe(expected[i].timeoutMs);
      });
      for (const f of conn.sent) expect(JSON.stringify(f)).not.toContain("focusEmulation");
    });
  }

  it("download → downloadStart/Chunk/End with no tab, written to the path", async () => {
    const { tab, conn } = await claimedTab();
    const dest = path.join(tempDir(), "out", "f.bin");
    const out = await tab.download("https://files.test/f.bin", dest, { timeoutMs: 60_000 });
    expect(frames(conn)).toEqual([
      { method: "downloadStart", params: { url: "https://files.test/f.bin", timeoutMs: 60_000 }, timeoutMs: 65_000 },
      { method: "downloadChunk", params: { id: "d1", offset: 0, length: 1024 * 1024 } },
      { method: "downloadEnd", params: { id: "d1" } },
    ]);
    for (const f of conn.sent) expect((f.params as Record<string, unknown>).tab).toBeUndefined();
    expect(out.path).toBe(dest);
    expect(readFileSync(dest, "utf8")).toBe("abc");
  });

  it("the Tab carries its handle", async () => {
    const { tab } = await claimedTab();
    expect(tab.handle).toBe("T3");
  });
});

describe("Tab — results", () => {
  it("snapshot returns the SnapshotResult; locate the LocateResult; networkClear the count; network the entries", async () => {
    const { tab } = await claimedTab();
    expect(await tab.snapshot()).toEqual(RESULTS.snapshot);
    expect(await tab.locate({ css: "button" })).toEqual(RESULTS.locate);
    expect(await tab.networkClear()).toBe(4);
    expect(await tab.network()).toEqual([{ id: "r1" }]);
  });

  it("evaluate returns envelope.value (undefined for a non-JSON kind)", async () => {
    const { tab } = await claimedTab();
    expect(await tab.evaluate<{ n: number }>("x")).toEqual({ n: 1 });
    const h = await connected([
      answering({ ...RESULTS, evaluate: { kind: "node", description: "<div>", truncated: false } }),
    ]);
    const t2 = await h.client.claim("T3");
    expect(await t2.evaluate("document.body")).toBeUndefined();
  });

  it("evaluateRef sends asRef and returns envelope.ref; no ref → BAD_PARAMS naming the kind", async () => {
    const h = await connected([
      answering({ ...RESULTS, evaluate: { kind: "node", description: "<a>", truncated: false, ref: "e9" } }),
    ]);
    const t = await h.client.claim("T3");
    h.conn.sent.length = 0;
    expect(await t.evaluateRef("document.links[0]")).toBe("e9");
    expect(frames(h.conn)).toEqual([
      {
        method: "evaluate",
        params: { tab: "T3", expression: "document.links[0]", timeoutMs: 10_000, asRef: true },
        timeoutMs: 15_000,
      },
    ]);
    const { tab } = await claimedTab(); // its evaluate answers kind "json", no ref
    const err = await rejection(tab.evaluateRef("1"));
    expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(err.message).toContain("not an Element");
    expect(err.message).toContain("json");
  });

  it("screenshot() returns the decoded PNG bytes", async () => {
    const { tab } = await claimedTab();
    const buf = await tab.screenshot();
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.equals(PNG)).toBe(true);
  });

  it("screenshot({path}) writes the PNG (creating parent dirs), returns the path and never sends path", async () => {
    const { tab, conn } = await claimedTab();
    const dest = path.join(tempDir(), "a", "b", "shot.png");
    const out = await tab.screenshot({ path: dest });
    expect(out).toBe(dest);
    expect(readFileSync(dest).equals(PNG)).toBe(true);
    expect(frames(conn)).toEqual([{ method: "screenshot", params: { tab: "T3" } }]);
  });
});

describe("Tab — bad targets fail locally, no call", () => {
  it("click({name}) → BAD_PARAMS with the friendly text; locate('e1') → BAD_PARAMS", async () => {
    const { tab, conn } = await claimedTab();
    const e1 = await rejection(tab.click({ name: "Save" } as never));
    expect(e1.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(e1.message).toContain("use {text} or add role");
    const e2 = await rejection(tab.locate("e1" as never));
    expect(e2.code).toBe(ErrorCodes.BAD_PARAMS);
    const e3 = await rejection(tab.waitFor({ locator: { nope: 1 } as never }));
    expect(e3.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(conn.sent).toHaveLength(0);
  });

  it("scroll({direction: 'left' | 'right' | other}) → BAD_PARAMS, no call (the extension would scroll down)", async () => {
    const { client, tab, conn } = await claimedTab();
    for (const direction of ["left", "right", "UP", ""]) {
      const err = await rejection(tab.scroll({ direction } as never));
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(err.message).toContain('direction must be "up" or "down"');
    }
    const viaClient = await rejection(client.scroll({ target: "e1", direction: "left" } as never));
    expect(viaClient.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(conn.sent).toHaveLength(0);
    await tab.scroll({ direction: "down" });
    expect(frames(conn)).toEqual([{ method: "scroll", params: { tab: "T3", direction: "down" } }]);
  });

  it("waitFor({seconds}) non-finite or negative → BAD_PARAMS, no call", async () => {
    const { tab, conn } = await claimedTab();
    for (const seconds of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      const err = await rejection(tab.waitFor({ seconds }));
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(err.message).toContain("seconds must be a finite number");
    }
    expect(conn.sent).toHaveLength(0);
    await tab.waitFor({ seconds: 0 });
    expect(frames(conn)).toEqual([{ method: "waitFor", params: { tab: "T3", seconds: 0 }, timeoutMs: 5_000 }]);
  });
});

describe("Tab — a caller's own `tab` key cannot reroute a call (S3 verifier finding 6)", () => {
  it("network({tab}) and waitFor({..., tab}) still send the Tab's handle", async () => {
    const { tab, conn } = await claimedTab();
    await tab.network({ tab: "T9", limit: 1 } as never);
    await tab.waitFor({ text: "x", tab: "T9" } as never);
    expect(frames(conn)).toEqual([
      { method: "networkRequests", params: { tab: "T3", limit: 1 } },
      { method: "waitFor", params: { tab: "T3", text: "x" }, timeoutMs: 15_000 },
    ]);
  });
});

describe("evaluateRef — no ref in the answer (S3 verifier finding 4)", () => {
  it("kind node without ref → names an extension older than Step 8 S2; other kinds → not an Element", async () => {
    const h = await connected([
      answering({ ...RESULTS, evaluate: { kind: "node", description: "<body>", truncated: false } }),
    ]);
    const t = await h.client.claim("T3");
    const stale = await rejection(t.evaluateRef("document.body"));
    expect(stale.code).toBe(ErrorCodes.BAD_PARAMS);
    expect(stale.message).toContain("the extension did not return a ref for the node");
    expect(stale.message).toContain("older than Step 8 S2");
    expect(stale.message).toContain("reload the extension");
    expect(stale.message).not.toContain("not an Element");

    const { tab } = await claimedTab(); // kind "json"
    const other = await rejection(tab.evaluateRef("1"));
    expect(other.message).toContain('not an Element (kind "json")');
    expect(other.message).not.toContain("older than Step 8 S2");
  });
});

describe("trusted-input policy (decision #89, outcome B)", () => {
  it("the SDK's policy is focusFirst", () => {
    expect(TRUSTED_INPUT_POLICY).toBe("focusFirst");
  });

  /** A host that records calls and lets the test decide when each resolves. */
  function recordingHost() {
    const calls: { method: string; params?: Record<string, unknown> }[] = [];
    const host = {
      generation: () => 0,
      call: vi.fn(async (method: string, params?: Record<string, unknown>) => {
        calls.push({ method, params });
        return { ok: true };
      }),
    };
    return { host, calls };
  }

  it("focusFirst: focusTab is awaited before the trusted action", async () => {
    let releaseFocus!: () => void;
    const order: string[] = [];
    const host = {
      generation: () => 0,
      call: vi.fn((method: string) => {
        order.push(`start ${method}`);
        if (method === "focusTab") {
          return new Promise((r) => {
            releaseFocus = () => {
              order.push("focus done");
              r({ ok: true });
            };
          });
        }
        return Promise.resolve({ ok: true });
      }),
    };
    const tab = new Tab(host, "T1", 0, "focusFirst");
    const p = tab.click("e1", { trusted: true });
    await flush();
    expect(order).toEqual(["start focusTab"]);
    releaseFocus();
    await p;
    expect(order).toEqual(["start focusTab", "focus done", "start click"]);
  });

  it('policy "none": trusted click/type/pressKey send no focusTab', async () => {
    const { host, calls } = recordingHost();
    const tab = new Tab(host, "T1", 0, "none");
    await tab.click("e1", { trusted: true });
    await tab.type("e1", "x", { trusted: true });
    await tab.pressKey("Enter", { trusted: true });
    expect(calls.map((c) => c.method)).toEqual(["click", "type", "pressKey"]);
  });

  it("focusFirst: untrusted (absent or false) actions send no focusTab", async () => {
    const { host, calls } = recordingHost();
    const tab = new Tab(host, "T1", 0, "focusFirst");
    await tab.click("e1");
    await tab.click("e1", { trusted: false });
    await tab.type("e1", "x");
    await tab.pressKey("Enter", { trusted: false });
    expect(calls.map((c) => c.method)).toEqual(["click", "click", "type", "pressKey"]);
    expect(calls[1].params).toStrictEqual({ tab: "T1", ref: "e1", trusted: false });
  });

  it("a Tab made by the client uses the SDK policy (focusFirst)", async () => {
    const { tab, conn } = await claimedTab();
    await tab.pressKey("a", { trusted: true });
    expect(frames(conn).map((f) => f.method)).toEqual(["focusTab", "pressKey"]);
  });
});

describe("BridgeClient — the cursor (phase doc 0.4)", () => {
  it("tab() without a cursor → NO_CURSOR naming newTab()/claim()", async () => {
    const { client } = await connected();
    let err: unknown;
    try {
      client.tab();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe(ErrorCodes.NO_CURSOR);
    expect((err as BridgeError).message).toContain("call newTab() or claim() first");
  });

  it("newTab(url, {active}) sends only defined keys, returns a Tab and sets the cursor", async () => {
    const { client, conn } = await connected();
    const t = await client.newTab("https://a.test/");
    expect(t).toBeInstanceOf(Tab);
    expect(t.handle).toBe("T7");
    expect(client.tab()).toBe(t);
    await client.newTab(undefined, { active: true });
    expect(frames(conn)).toEqual([
      { method: "newTab", params: { url: "https://a.test/" } },
      { method: "newTab", params: { active: true } },
    ]);
  });

  it("claim(handle) and claim({active:true}) send tabs.claim and set the cursor", async () => {
    const { client, conn } = await connected();
    const a = await client.claim("T3");
    expect(client.tab()).toBe(a);
    const b = await client.claim({ active: true });
    expect(client.tab()).toBe(b);
    expect(b.handle).toBe("T3");
    expect(frames(conn)).toEqual([
      { method: "tabs.claim", params: { tab: "T3" } },
      { method: "tabs.claim", params: { active: true } },
    ]);
  });

  it("the cursor is not moved by release(), close() or a tabGone event", async () => {
    const { client, conn } = await connected();
    const t = await client.claim("T3");
    await t.release();
    await t.close();
    conn.emit({ event: "tabGone", params: { tab: "T3", reason: "closed" } });
    expect(client.tab()).toBe(t);
  });

  it("tabs() maps listTabs: handle from tab, current only from current (never Chrome's per-window active)", async () => {
    const listed = {
      tabs: [
        { id: 1, tab: "T1", title: "One", url: "https://1.test/", active: true, windowId: 1 },
        { id: 2, tab: "T2", title: "Two", url: "https://2.test/", active: true, windowId: 2, current: true, owner: "me" },
        { id: 3, title: "No handle", url: "https://3.test/", active: false, windowId: 2 },
      ],
    };
    const { client, conn } = await connected([answering({ ...RESULTS, listTabs: listed })]);
    const tabs = await client.tabs();
    expect(frames(conn)).toEqual([{ method: "listTabs" }]);
    expect(tabs).toStrictEqual([
      { handle: "T1", title: "One", url: "https://1.test/", current: false },
      { handle: "T2", title: "Two", url: "https://2.test/", current: true, owner: "me" },
    ]);
  });
});

/** Every mirrored method, with arguments; each must send what the cursor Tab sends. */
const MIRRORED: [string, (o: BridgeClient | Tab) => Promise<unknown>][] = [
  ["navigate", (o) => o.navigate("https://a.test/")],
  ["back", (o) => o.back()],
  ["forward", (o) => o.forward()],
  ["snapshot", (o) => o.snapshot()],
  ["screenshot", (o) => o.screenshot({ fullPage: true })],
  ["click", (o) => o.click("e1", { trusted: true })],
  ["type", (o) => o.type("e1", "t", { submit: true })],
  ["pressKey", (o) => o.pressKey("Enter")],
  ["hover", (o) => o.hover({ css: "a" })],
  ["scroll", (o) => o.scroll({ direction: "down" })],
  ["selectOption", (o) => o.selectOption("e2", ["x"])],
  ["locate", (o) => o.locate({ text: "Hi" })],
  ["waitFor", (o) => o.waitFor({ seconds: 1 })],
  ["evaluate", (o) => o.evaluate("1", { timeoutMs: 2000 })],
  [
    "evaluateRef",
    // The fixture's envelope has no ref, so a sent call ends in BAD_PARAMS; NO_CURSOR must still escape.
    (o) =>
      o.evaluateRef("document.body").catch((e: BridgeError) => {
        if (e.code !== ErrorCodes.BAD_PARAMS) throw e;
      }),
  ],
  ["network", (o) => o.network({ limit: 3 })],
  ["networkClear", (o) => o.networkClear()],
  ["consoleMessages", (o) => o.consoleMessages({ level: "error", limit: 2 })],
  ["focus", (o) => o.focus()],
  ["release", (o) => o.release()],
];

describe("BridgeClient — mirrored methods act on the cursor", () => {
  for (const [name, run] of MIRRORED) {
    it(`${name}: same frames as the Tab with a cursor; NO_CURSOR and nothing sent without one`, async () => {
      const bare = await connected();
      const err = await rejection(run(bare.client));
      expect(err.code).toBe(ErrorCodes.NO_CURSOR);
      expect(err.message).toContain("call newTab() or claim() first");
      expect(frames(bare.conn)).toHaveLength(0);

      const viaTab = await claimedTab();
      await run(viaTab.tab);
      const viaClient = await claimedTab();
      await run(viaClient.client);
      expect(frames(viaClient.conn)).toStrictEqual(frames(viaTab.conn));
      expect(frames(viaClient.conn).length).toBeGreaterThan(0);
    });
  }

  it("download: same frames via the client; NO_CURSOR without one", async () => {
    const bare = await connected();
    const err = await rejection(bare.client.download("https://files.test/f", path.join(tempDir(), "x")));
    expect(err.code).toBe(ErrorCodes.NO_CURSOR);
    expect(frames(bare.conn)).toHaveLength(0);
    const viaClient = await claimedTab();
    await viaClient.client.download("https://files.test/f", path.join(tmp!, "y.bin"));
    expect(frames(viaClient.conn).map((f) => f.method)).toEqual(["downloadStart", "downloadChunk", "downloadEnd"]);
  });

  it("BridgeClient.close() keeps its Step 6 meaning: it closes the client, not the cursor tab", async () => {
    const { client, conn } = await claimedTab();
    client.close();
    expect(frames(conn)).toHaveLength(0);
    expect(conn.closeCalls).toEqual([1000]);
  });
});

describe("a 4002 reconnect voids the cursor and every older Tab (#11, #79; stage0-audit F2, F24)", () => {
  it("clears the cursor; an old Tab throws TAB_UNKNOWN with no frame on the new connection; a new Tab works", async () => {
    const first = answering();
    const second = answering();
    const { client } = await connected([first, second]);
    const old = await client.claim("T3");
    first.fireClose(4002, "upgrading");
    await flush();

    const noCursor = await rejection(client.snapshot());
    expect(noCursor.code).toBe(ErrorCodes.NO_CURSOR);
    const err = await rejection(old.click("e1"));
    expect(err.code).toBe(ErrorCodes.TAB_UNKNOWN);
    expect(err.message).toBe(
      "tab T3 is from before the bridge daemon restarted (close 4002) — call tabs() or claim() for a new Tab",
    );
    expect(frames(second)).toHaveLength(0);

    const fresh = await client.claim("T3");
    await fresh.click("e1");
    expect(frames(second)).toEqual([
      { method: "tabs.claim", params: { tab: "T3" } },
      { method: "click", params: { tab: "T3", ref: "e1" } },
    ]);
    expect(client.tab()).toBe(fresh);
  });

  it("is synchronous: a call issued right after the close, before the reconnect resolves, is TAB_UNKNOWN / NO_CURSOR", async () => {
    const first = answering();
    const second = answering();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let n = 0;
    const knock = vi.fn(async (): Promise<Knocked> => {
      n += 1;
      if (n === 1) return { conn: first, welcome: welcome() };
      await gate;
      return { conn: second, welcome: welcome({ clientId: "c2" }) };
    });
    const client = new BridgeClient({ knock, timers: noTimers });
    await client.connect();
    const old = await client.claim("T3");
    first.fireClose(4002, "upgrading");
    const p = old.snapshot();
    expect(() => client.tab()).toThrow(/call newTab\(\) or claim\(\) first/);
    release();
    const err = await rejection(p);
    expect(err.code).toBe(ErrorCodes.TAB_UNKNOWN);
    await flush();
    expect(frames(second)).toHaveLength(0);
    expect(frames(first).map((f) => f.method)).toEqual(["tabs.claim"]);
  });

  it("a claim whose answer and the 4002 close arrive in one read yields no Tab and no cursor", async () => {
    const second = answering();
    // The first daemon answers the claim and closes 4002 synchronously, as `ws` delivers one read.
    const first = new FakeConnection((m, c) => {
      if (m.method !== "tabs.claim") return;
      c.emit({ id: m.id, result: { tab: "T3" } });
      c.fireClose(4002, "upgrading");
    });
    const { client } = await connected([first, second]);
    const err = await rejection(client.claim("T3"));
    expect(err.code).toBe(ErrorCodes.TAB_UNKNOWN);
    expect(() => client.tab()).toThrow(BridgeError);
  });

  it("the tab-less network({id}) of an old Tab is TAB_UNKNOWN with no frame (S3 verifier finding 2)", async () => {
    const first = answering();
    const second = answering();
    const { client } = await connected([first, second]);
    const old = await client.claim("T3");
    first.fireClose(4002, "upgrading");
    await flush();
    const err = await rejection(old.network({ id: "r9" }));
    expect(err.code).toBe(ErrorCodes.TAB_UNKNOWN);
    expect(frames(second)).toHaveLength(0);
  });

  it("the tab-less download of an old Tab is TAB_UNKNOWN with no frame (S3 verifier finding 2)", async () => {
    const first = answering();
    const second = answering();
    const { client } = await connected([first, second]);
    const old = await client.claim("T3");
    first.fireClose(4002, "upgrading");
    await flush();
    const dest = path.join(tempDir(), "f.bin");
    const err = await rejection(old.download("https://files.test/f.bin", dest));
    expect(err.code).toBe(ErrorCodes.TAB_UNKNOWN);
    expect(frames(second)).toHaveLength(0);
  });

  it("a close other than 4002 does not void Tabs: old Tab calls reject NOT_CONNECTED", async () => {
    const first = answering();
    const { client } = await connected([first]);
    const old = await client.claim("T3");
    first.fireClose(1006);
    const err = await rejection(old.snapshot());
    expect(err.code).toBe(ErrorCodes.NOT_CONNECTED);
    expect(client.tab()).toBe(old);
  });
});

// Step 12 S3b (#323, #334, #344): Tab.consoleMessages answers the entries; the shared guard runs before any call;
// a refusal reaches the caller as the same BridgeError a refused snapshot does, with no failure report.
describe("Tab.consoleMessages (Step 12 S3b)", () => {
  it("resolves with the reply's entries", async () => {
    const { tab } = await claimedTab();
    expect(await tab.consoleMessages()).toEqual([{ level: "info", text: "hi", ts: 5, kind: "console" }]);
  });

  it("refuses a bad level or limit BAD_PARAMS with the shared texts, before any call", async () => {
    const { tab, conn } = await claimedTab();
    const bad: [Record<string, unknown>, string][] = [
      [{ level: "verbose" }, 'consoleMessages: level must be one of "error", "warning", "info", "debug"'],
      [{ limit: 0 }, "consoleMessages: limit must be an integer from 1 to 200"],
      [{ limit: 201 }, "consoleMessages: limit must be an integer from 1 to 200"],
      [{ limit: 1.5 }, "consoleMessages: limit must be an integer from 1 to 200"],
    ];
    for (const [opts, message] of bad) {
      const err = await rejection(tab.consoleMessages(opts as never));
      expect(err.code).toBe(ErrorCodes.BAD_PARAMS);
      expect(err.message).toBe(message);
    }
    expect(frames(conn)).toHaveLength(0);
  });

  it("C3.2 client side: JS_DISABLED, DISARMED and DOMAIN_BLOCKED reach the caller as snapshot's do, one call each, no report", async () => {
    const refusals = [
      new BridgeError(ErrorCodes.JS_DISABLED, "JavaScript is off"),
      new BridgeError(ErrorCodes.DISARMED, "off", { scope: "all" }),
      new BridgeError(ErrorCodes.DOMAIN_BLOCKED, "blocked"),
    ];
    for (const refusal of refusals) {
      const conn = new FakeConnection((m, c) => {
        if (m.method === "tabs.claim") return c.emit({ id: m.id, result: { tab: "T3" } });
        if (typeof m.method === "string") c.emit({ id: m.id, error: refusal.toWire() });
      });
      const { client } = await connected([conn]);
      const tab = await client.claim("T3");
      conn.sent.length = 0;
      const viaConsole = await rejection(tab.consoleMessages());
      const viaSnapshot = await rejection(tab.snapshot());
      expect(viaConsole.code).toBe(refusal.code);
      expect([viaConsole.code, viaConsole.message, viaConsole.data]).toEqual([viaSnapshot.code, viaSnapshot.message, viaSnapshot.data]);
      expect(frames(conn).map((f) => f.method)).toEqual(["consoleMessages", "snapshot"]);
    }
  });
});
