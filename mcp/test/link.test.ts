import { describe, it, expect, vi } from "vitest";
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import { BridgeLink, CONNECTING_REASON, RETRY_MS, type LinkClient, type LinkTimers } from "../src/link.js";

/** Manual timers: nothing fires until the test says so. */
function manualTimers() {
  let nextId = 1;
  const queue: Array<{ id: number; fn: () => void; ms: number }> = [];
  const timers: LinkTimers = {
    setTimeout: (fn, ms) => {
      const id = nextId++;
      queue.push({ id, fn, ms });
      return id;
    },
    clearTimeout: (h) => {
      const i = queue.findIndex((t) => t.id === h);
      if (i >= 0) queue.splice(i, 1);
    },
  };
  return {
    timers,
    pending: () => queue.map((t) => t.ms),
    fire: () => {
      const t = queue.shift();
      if (!t) throw new Error("no timer pending");
      t.fn();
    },
  };
}

const flush = () => new Promise<void>((r) => setImmediate(r));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A fake client: `failWith` makes it behave like a BridgeClient after a non-4002 close. */
function fakeClient(over: Partial<LinkClient> = {}) {
  let failure: BridgeError | null = null;
  const client = {
    call: vi.fn(async (_m: string, _p?: Record<string, unknown>, _o?: { timeoutMs?: number }): Promise<unknown> => {
      if (failure) throw failure;
      return { ok: true };
    }),
    status: vi.fn(async (): Promise<unknown> => {
      if (failure) throw failure;
      return { build: "b", uptime: 1, extensionConnected: true, clients: [], port: 9234 };
    }),
    connect: vi.fn(async (): Promise<unknown> => {
      if (failure) throw failure;
      return { type: "welcome" };
    }),
    close: vi.fn(() => {}),
    ...over,
  };
  return {
    client,
    failWith(message: string) {
      failure = new BridgeError(ErrorCodes.NOT_CONNECTED, message);
    },
  };
}

const CLOSED_MSG =
  'The connection to the bridge daemon closed (code 1006); this client does not reconnect — call connect() for a new client to continue';

describe("BridgeLink — connecting", () => {
  it("before the first attempt settles, has no client and a call rejects with the connecting reason", async () => {
    const t = manualTimers();
    const link = new BridgeLink({ connect: () => new Promise(() => {}), timers: t.timers });
    link.start();
    expect(link.hasClient).toBe(false);
    expect(link.reason).toBeNull();
    await expect(link.call("snapshot")).rejects.toMatchObject({ code: ErrorCodes.NOT_CONNECTED, message: CONNECTING_REASON });
  });

  it("stores the reason when connect() rejects and every call carries it", async () => {
    const t = manualTimers();
    const link = new BridgeLink({
      connect: async () => {
        throw new BridgeError(ErrorCodes.VERSION, "a pre-Step-6 bridge server holds port 9234 — end the old session");
      },
      timers: t.timers,
    });
    link.start();
    await flush();
    expect(link.hasClient).toBe(false);
    expect(link.reason).toBe("a pre-Step-6 bridge server holds port 9234 — end the old session");
    const err = await link.call("snapshot").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe(ErrorCodes.NOT_CONNECTED);
    expect((err as BridgeError).message).toBe("a pre-Step-6 bridge server holds port 9234 — end the old session");
    await expect(link.status()).rejects.toThrow(/pre-Step-6/);
  });

  it("retries connect() 5 s after a failed attempt settles, and recovery clears the reason", async () => {
    const t = manualTimers();
    const { client } = fakeClient();
    const connect = vi
      .fn<() => Promise<LinkClient>>()
      .mockRejectedValueOnce(new Error("Extension not connected — is Chrome open"))
      .mockResolvedValueOnce(client);
    const link = new BridgeLink({ connect, timers: t.timers });
    link.start();
    await flush();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(t.pending()).toEqual([RETRY_MS]);
    expect(RETRY_MS).toBe(5000);
    t.fire();
    await flush();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(link.hasClient).toBe(true);
    expect(link.reason).toBeNull();
    await expect(link.call("click", { ref: "e1" }, { timeoutMs: 7 })).resolves.toEqual({ ok: true });
    expect(client.call).toHaveBeenCalledWith("click", { ref: "e1" }, { timeoutMs: 7 });
  });

  it("never overlaps attempts: no timer while connect() is in flight, the next one 5 s after it settles", async () => {
    const t = manualTimers();
    const first = deferred<LinkClient>();
    const connect = vi.fn(() => first.promise);
    const link = new BridgeLink({ connect, timers: t.timers });
    link.start();
    await flush();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(t.pending()).toEqual([]);
    first.reject(new Error("still no extension"));
    await flush();
    expect(t.pending()).toEqual([RETRY_MS]);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("reports reason changes once each, null on connect", async () => {
    const t = manualTimers();
    const { client } = fakeClient();
    const changes: Array<string | null> = [];
    const connect = vi
      .fn<() => Promise<LinkClient>>()
      .mockRejectedValueOnce(new Error("down"))
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(client);
    const link = new BridgeLink({ connect, timers: t.timers, onChange: (r) => changes.push(r) });
    link.start();
    await flush();
    t.fire();
    await flush();
    t.fire();
    await flush();
    expect(changes).toEqual(["down", null]);
  });
});

describe("BridgeLink — a connection that closes (non-4002)", () => {
  it("the 5 s probe detects a failed client: stores its reason, drops and closes it, and connects afresh", async () => {
    const t = manualTimers();
    const a = fakeClient();
    const b = fakeClient();
    const connect = vi.fn<() => Promise<LinkClient>>().mockResolvedValueOnce(a.client);
    const link = new BridgeLink({ connect, timers: t.timers });
    link.start();
    await flush();
    expect(link.hasClient).toBe(true);
    expect(t.pending()).toEqual([RETRY_MS]);

    a.failWith(CLOSED_MSG);
    const second = deferred<void>();
    connect.mockImplementationOnce(async () => {
      await second.promise;
      return b.client;
    });
    t.fire();
    await flush();
    expect(a.client.connect).toHaveBeenCalledTimes(1);
    expect(a.client.close).toHaveBeenCalledTimes(1);
    expect(link.hasClient).toBe(false);
    expect(link.reason).toBe(CLOSED_MSG);
    expect(connect).toHaveBeenCalledTimes(2);
    await expect(link.call("snapshot")).rejects.toThrow(CLOSED_MSG);
    second.resolve();
    await flush();
    expect(link.hasClient).toBe(true);
    expect(link.reason).toBeNull();
  });

  it("a healthy probe keeps the client and schedules the next one", async () => {
    const t = manualTimers();
    const a = fakeClient();
    const connect = vi.fn(async () => a.client as LinkClient);
    const link = new BridgeLink({ connect, timers: t.timers });
    link.start();
    await flush();
    t.fire();
    await flush();
    expect(a.client.connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(link.hasClient).toBe(true);
    expect(t.pending()).toEqual([RETRY_MS]);
  });

  it("a call rejecting with NOT_CONNECTED probes: the failed client is dropped, the fresh connect waits for the 5 s tick", async () => {
    const t = manualTimers();
    const a = fakeClient();
    const b = fakeClient();
    const connect = vi.fn<() => Promise<LinkClient>>().mockResolvedValueOnce(a.client).mockResolvedValueOnce(b.client);
    const link = new BridgeLink({ connect, timers: t.timers });
    link.start();
    await flush();
    a.failWith(CLOSED_MSG);
    await expect(link.call("snapshot")).rejects.toThrow(CLOSED_MSG);
    await flush();
    expect(link.hasClient).toBe(false);
    expect(link.reason).toBe(CLOSED_MSG);
    expect(a.client.close).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
    t.fire();
    await flush();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(link.hasClient).toBe(true);
    expect(link.reason).toBeNull();
  });

  it("a call failing with another code (e.g. TIMEOUT) does not probe or drop the client", async () => {
    const t = manualTimers();
    const a = fakeClient({
      call: vi.fn(async () => {
        throw new BridgeError(ErrorCodes.TIMEOUT, "Timed out after 36000ms calling snapshot");
      }),
    });
    const link = new BridgeLink({ connect: async () => a.client, timers: t.timers });
    link.start();
    await flush();
    await expect(link.call("snapshot")).rejects.toThrow(/Timed out/);
    await flush();
    expect(a.client.connect).not.toHaveBeenCalled();
    expect(link.hasClient).toBe(true);
  });

  it("status() goes through the client and a NOT_CONNECTED rejection drops it too", async () => {
    const t = manualTimers();
    const a = fakeClient();
    const link = new BridgeLink({ connect: async () => a.client, timers: t.timers });
    link.start();
    await flush();
    await expect(link.status()).resolves.toMatchObject({ build: "b" });
    a.failWith(CLOSED_MSG);
    await expect(link.status()).rejects.toThrow(CLOSED_MSG);
    await flush();
    expect(link.hasClient).toBe(false);
    expect(link.reason).toBe(CLOSED_MSG);
  });
});

describe("BridgeLink — stop()", () => {
  it("closes the current client, cancels the timer, and later calls report the link stopped", async () => {
    const t = manualTimers();
    const a = fakeClient();
    const connect = vi.fn(async () => a.client as LinkClient);
    const link = new BridgeLink({ connect, timers: t.timers });
    link.start();
    await flush();
    link.stop();
    expect(a.client.close).toHaveBeenCalledTimes(1);
    expect(t.pending()).toEqual([]);
    expect(link.hasClient).toBe(false);
    await expect(link.call("snapshot")).rejects.toMatchObject({ code: ErrorCodes.NOT_CONNECTED });
  });

  it("closes a client whose connect() resolves after stop, and schedules nothing", async () => {
    const t = manualTimers();
    const a = fakeClient();
    const pending = deferred<LinkClient>();
    const connect = vi.fn(() => pending.promise);
    const link = new BridgeLink({ connect, timers: t.timers });
    link.start();
    await flush();
    link.stop();
    pending.resolve(a.client);
    await flush();
    expect(a.client.close).toHaveBeenCalledTimes(1);
    expect(link.hasClient).toBe(false);
    expect(t.pending()).toEqual([]);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("schedules nothing after a connect() that rejects after stop", async () => {
    const t = manualTimers();
    const pending = deferred<LinkClient>();
    const link = new BridgeLink({ connect: () => pending.promise, timers: t.timers });
    link.start();
    link.stop();
    pending.reject(new Error("late"));
    await flush();
    expect(t.pending()).toEqual([]);
  });
});
