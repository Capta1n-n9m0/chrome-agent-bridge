import { describe, it, expect, vi } from "vitest";
import { BridgeError, ErrorCodes, type WelcomeMessage } from "@bridge/shared";
import { BridgeClient, clientTimeoutMs, type Timers } from "../src/client.js";
import type { Knocked } from "../src/knock.js";
import { FakeConnection } from "./fakes.js";

function welcome(over: Partial<WelcomeMessage> = {}): WelcomeMessage {
  return { type: "welcome", build: "B", proto: 2, clientId: "c1", extensionConnected: true, ...over };
}

/** Timers that never fire on their own; the test fires them. */
function fakeTimers() {
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
  const t: Timers = {
    setTimeout: (fn, ms) => {
      const entry = { fn, ms, cleared: false };
      timers.push(entry);
      return entry;
    },
    clearTimeout: (h) => {
      (h as { cleared: boolean }).cleared = true;
    },
  };
  return { timers: t, list: timers, live: () => timers.filter((x) => !x.cleared) };
}

function setup(conns: FakeConnection[] = [new FakeConnection()]) {
  let i = 0;
  const knock = vi.fn(async (): Promise<Knocked> => {
    const conn = conns[Math.min(i, conns.length - 1)];
    i += 1;
    return { conn, welcome: welcome({ clientId: `c${i}` }) };
  });
  const ft = fakeTimers();
  const client = new BridgeClient({ knock, timers: ft.timers });
  return { client, knock, conns, ft };
}

const flush = () => new Promise<void>((r) => setImmediate(r));

async function rejection(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(BridgeError);
    return err as BridgeError;
  }
  throw new Error("expected a rejection");
}

describe("clientTimeoutMs", () => {
  it("is clamp(timeoutMs ?? 30000, 100, 600000) + 5000 (daemon slack) + 1000", () => {
    expect(clientTimeoutMs(undefined)).toBe(36_000);
    expect(clientTimeoutMs(1_000)).toBe(7_000);
    expect(clientTimeoutMs(50)).toBe(100 + 6_000);
    expect(clientTimeoutMs(1e9)).toBe(600_000 + 6_000);
  });
});

describe("BridgeClient", () => {
  it("connect() runs the knock and exposes the welcome", async () => {
    const { client, knock } = setup();
    const w = await client.connect();
    expect(knock).toHaveBeenCalledTimes(1);
    expect(w.clientId).toBe("c1");
    expect(client.welcome?.clientId).toBe("c1");
    expect(client.extensionConnected).toBe(true);
  });

  it("call() before connect() rejects with NOT_CONNECTED", async () => {
    const { client } = setup();
    const err = await rejection(client.call("snapshot"));
    expect(err.code).toBe(ErrorCodes.NOT_CONNECTED);
  });

  it("sends {id, method, params, timeoutMs}, omitting undefined fields", async () => {
    const { client, conns } = setup();
    await client.connect();
    void client.call("listTabs");
    void client.call("evaluate", { expression: "1" }, { timeoutMs: 1234 });
    await flush();
    const [a, b] = conns[0].sent;
    expect(a).toEqual({ id: expect.any(String), method: "listTabs" });
    expect(Object.keys(a).sort()).toEqual(["id", "method"]);
    expect(b).toEqual({ id: expect.any(String), method: "evaluate", params: { expression: "1" }, timeoutMs: 1234 });
    expect(a.id).not.toBe(b.id);
  });

  it("interleaved calls resolve by id", async () => {
    const { client, conns } = setup();
    await client.connect();
    const p1 = client.call("one");
    const p2 = client.call("two");
    await flush();
    const [m1, m2] = conns[0].sent;
    conns[0].emit({ id: m2.id, result: "second" });
    conns[0].emit({ id: m1.id, result: "first" });
    await expect(p1).resolves.toBe("first");
    await expect(p2).resolves.toBe("second");
  });

  it("an error response rejects with a BridgeError carrying the wire code", async () => {
    const { client, conns } = setup();
    await client.connect();
    const p = client.call("click");
    await flush();
    conns[0].emit({ id: conns[0].sent[0].id, error: { code: "REF_STALE", message: "ref e3 is stale", data: { ref: "e3" } } });
    const err = await rejection(p);
    expect(err.code).toBe("REF_STALE");
    expect(err.message).toBe("ref e3 is stale");
    expect(err.data).toEqual({ ref: "e3" });
  });

  it("a v1 {message} error becomes INTERNAL", async () => {
    const { client, conns } = setup();
    await client.connect();
    const p = client.call("click");
    await flush();
    conns[0].emit({ id: conns[0].sent[0].id, error: { message: "boom" } });
    const err = await rejection(p);
    expect(err.code).toBe(ErrorCodes.INTERNAL);
    expect(err.message).toBe("boom");
  });

  it("its own timer is clamp + 6000 ms; on expiry TIMEOUT and the pending entry is dropped", async () => {
    const { client, conns, ft } = setup();
    await client.connect();
    const p = client.call("evaluate", {}, { timeoutMs: 50 });
    void client.call("evaluate", {}, { timeoutMs: 1e9 });
    void client.call("snapshot");
    await flush();
    expect(ft.list.map((t) => t.ms)).toEqual([6_100, 606_000, 36_000]);

    ft.list[0].fn();
    const err = await rejection(p);
    expect(err.code).toBe(ErrorCodes.TIMEOUT);
    expect(err.message).toBe("Timed out after 6100ms calling evaluate");
    // A late answer for the dropped id is ignored.
    conns[0].emit({ id: conns[0].sent[0].id, result: "late" });
  });

  it("a response clears its timer", async () => {
    const { client, conns, ft } = setup();
    await client.connect();
    const p = client.call("x");
    await flush();
    conns[0].emit({ id: conns[0].sent[0].id, result: 1 });
    await p;
    expect(ft.live()).toHaveLength(0);
  });

  it("on('event') delivers every event frame and returns an unsubscribe", async () => {
    const { client, conns } = setup();
    await client.connect();
    const seen: unknown[] = [];
    const off = client.on("event", (e) => seen.push(e));
    conns[0].emit({ event: "tabGone", params: { tab: "T1" } });
    conns[0].emit({ event: "extensionStatus", params: { connected: false } });
    off();
    conns[0].emit({ event: "tabGone", params: { tab: "T2" } });
    expect(seen).toEqual([
      { event: "tabGone", params: { tab: "T1" } },
      { event: "extensionStatus", params: { connected: false } },
    ]);
    expect(client.extensionConnected).toBe(false);
  });

  it("status() calls daemon.status", async () => {
    const { client, conns } = setup();
    await client.connect();
    const p = client.status();
    await flush();
    expect(conns[0].sent[0].method).toBe("daemon.status");
    conns[0].emit({ id: conns[0].sent[0].id, result: { build: "B" } });
    await expect(p).resolves.toEqual({ build: "B" });
  });

  it("close 4002 → in-flight calls reject, the knock runs again, a later call succeeds", async () => {
    const first = new FakeConnection();
    const second = new FakeConnection();
    const { client, knock } = setup([first, second]);
    const reconnected = vi.fn();
    client.on("reconnected", reconnected);
    await client.connect();
    const inflight = client.call("snapshot");
    await flush();

    first.fireClose(4002, "upgrading");
    const err = await rejection(inflight);
    expect(err.code).toBe(ErrorCodes.NOT_CONNECTED);
    expect(err.message).toMatch(/^daemon restarting \(4002\)/);

    const later = client.call("listTabs");
    await flush();
    expect(knock).toHaveBeenCalledTimes(2);
    expect(reconnected).toHaveBeenCalledWith(expect.objectContaining({ clientId: "c2" }));
    expect(second.sent[0].method).toBe("listTabs");
    second.emit({ id: second.sent[0].id, result: ["tab"] });
    await expect(later).resolves.toEqual(["tab"]);
    expect(client.welcome?.clientId).toBe("c2");
  });

  it("calls made while reconnecting wait for the reconnect", async () => {
    const first = new FakeConnection();
    const second = new FakeConnection();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let n = 0;
    const knock = vi.fn(async (): Promise<Knocked> => {
      n += 1;
      if (n === 1) return { conn: first, welcome: welcome() };
      await gate;
      return { conn: second, welcome: welcome({ clientId: "c2" }) };
    });
    const client = new BridgeClient({ knock, timers: fakeTimers().timers });
    await client.connect();
    first.fireClose(4002, "upgrading");
    const p = client.call("listTabs");
    await flush();
    expect(first.sent).toHaveLength(0);
    expect(second.sent).toHaveLength(0);
    release();
    await flush();
    expect(second.sent[0].method).toBe("listTabs");
    second.emit({ id: second.sent[0].id, result: 1 });
    await expect(p).resolves.toBe(1);
  });

  it("a failed reconnect after 4002 rejects later calls with the knock's error", async () => {
    const first = new FakeConnection();
    let n = 0;
    const knock = vi.fn(async (): Promise<Knocked> => {
      n += 1;
      if (n === 1) return { conn: first, welcome: welcome() };
      throw new BridgeError(ErrorCodes.VERSION, "build mismatch");
    });
    const client = new BridgeClient({ knock, timers: fakeTimers().timers });
    await client.connect();
    first.fireClose(4002, "upgrading");
    await flush();
    const err = await rejection(client.call("x"));
    expect(err.code).toBe(ErrorCodes.VERSION);
  });

  for (const code of [1006, 1000, 1001, 4001]) {
    it(`close ${code} → pending and later calls reject NOT_CONNECTED naming the code; no reconnect`, async () => {
      const { client, conns, knock } = setup();
      await client.connect();
      const inflight = client.call("snapshot");
      await flush();
      conns[0].fireClose(code, "bye");

      const e1 = await rejection(inflight);
      expect(e1.code).toBe(ErrorCodes.NOT_CONNECTED);
      expect(e1.message).toContain(String(code));
      const e2 = await rejection(client.call("listTabs"));
      expect(e2.code).toBe(ErrorCodes.NOT_CONNECTED);
      expect(e2.message).toContain(String(code));
      await flush();
      expect(knock).toHaveBeenCalledTimes(1);
      expect(conns[0].sent).toHaveLength(1);
    });
  }

  it("close() rejects pending calls, closes the socket and never reconnects", async () => {
    const { client, conns, knock, ft } = setup();
    await client.connect();
    const p = client.call("snapshot");
    await flush();
    client.close();
    const err = await rejection(p);
    expect(err.code).toBe(ErrorCodes.NOT_CONNECTED);
    expect(conns[0].closeCalls).toEqual([1000]);
    expect(ft.live()).toHaveLength(0);
    conns[0].fireClose(4002, "upgrading");
    await flush();
    expect(knock).toHaveBeenCalledTimes(1);
    await rejection(client.call("x"));
  });
});
