// The MCP's tab cursor (Step 7 T4; spec §8.3 as far as "claim on first touch"; phase-doc 0.2 amended
// and corrected; decisions.md · 2026-10-21 #11).
import { describe, it, expect, vi } from "vitest";
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import type { WelcomeMessage } from "@bridge/shared";
import { TabCursor, lostNotice } from "../src/cursor.js";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A bridge whose `tabs.claim {active:true}` answers the next handle from `handles`. */
function claimingBridge(handles: string[] = ["T1", "T2", "T3"]) {
  let i = 0;
  const call = vi.fn(async (method: string, params?: Record<string, unknown>) => {
    if (method !== "tabs.claim") throw new Error(`unexpected ${method}`);
    expect(params).toEqual({ active: true });
    return { tab: handles[i++] };
  });
  return { call };
}

/** A client that records its `reconnected` listener, so a test can fire it. */
function fakeClient() {
  const listeners = new Set<(w: WelcomeMessage) => void>();
  return {
    on: vi.fn((_type: "reconnected", l: (w: WelcomeMessage) => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    }),
    fireReconnected() {
      for (const l of [...listeners]) l({ type: "welcome", build: "b", proto: 2, clientId: "c9", extensionConnected: true });
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

describe("TabCursor — first touch", () => {
  it("claims the active tab once, then keeps it", async () => {
    const bridge = claimingBridge();
    const cursor = new TabCursor(bridge);
    expect(cursor.tab).toBeNull();
    expect(await cursor.resolve()).toEqual({ tab: "T1", notice: null });
    expect(await cursor.resolve()).toEqual({ tab: "T1", notice: null });
    expect(bridge.call).toHaveBeenCalledTimes(1);
    expect(cursor.tab).toBe("T1");
  });

  it("concurrent first touches share one claim", async () => {
    const d = deferred<unknown>();
    const call = vi.fn(() => d.promise);
    const cursor = new TabCursor({ call });
    const a = cursor.resolve();
    const b = cursor.resolve();
    const c = cursor.resolve();
    d.resolve({ tab: "T4" });
    expect(await Promise.all([a, b, c])).toEqual([
      { tab: "T4", notice: null },
      { tab: "T4", notice: null },
      { tab: "T4", notice: null },
    ]);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("a failed claim leaves no cursor, its error is the caller's, and the next call claims again", async () => {
    const held = new BridgeError(ErrorCodes.TAB_HELD, 'tab T1 is held by "claude-code #1" since 10:00:00 — use browser_new_tab, or browser_list_tabs to pick a free tab');
    const call = vi.fn().mockRejectedValueOnce(held).mockResolvedValueOnce({ tab: "T2" });
    const cursor = new TabCursor({ call });
    await expect(cursor.resolve()).rejects.toBe(held);
    expect(cursor.tab).toBeNull();
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: null });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("concurrent first touches all get the failed claim's error", async () => {
    const d = deferred<unknown>();
    const call = vi.fn(() => d.promise);
    const cursor = new TabCursor({ call });
    const a = cursor.resolve();
    const b = cursor.resolve();
    const err = new BridgeError(ErrorCodes.NOT_CONNECTED, "Extension not connected");
    d.reject(err);
    await expect(a).rejects.toBe(err);
    await expect(b).rejects.toBe(err);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("a claim answer without a handle is an INTERNAL error, and no cursor", async () => {
    const cursor = new TabCursor({ call: async () => ({ id: 412 }) });
    await expect(cursor.resolve()).rejects.toMatchObject({ code: ErrorCodes.INTERNAL });
    expect(cursor.tab).toBeNull();
  });
});

describe("TabCursor — set", () => {
  it("set() moves the cursor; resolve() then calls nothing", async () => {
    const bridge = claimingBridge();
    const cursor = new TabCursor(bridge);
    cursor.set("T7");
    expect(await cursor.resolve()).toEqual({ tab: "T7", notice: null });
    expect(bridge.call).not.toHaveBeenCalled();
  });

  it("set() during an in-flight first-touch claim wins over the claim's answer", async () => {
    const d = deferred<unknown>();
    const cursor = new TabCursor({ call: () => d.promise });
    const first = cursor.resolve();
    cursor.set("T8");
    d.resolve({ tab: "T1" });
    expect((await first).tab).toBe("T1"); // that call acts where its claim landed
    expect(cursor.tab).toBe("T8");
  });
});

describe("TabCursor — lost to a daemon restart", () => {
  it("re-claims after markLost() and prefixes exactly one result with the notice", async () => {
    const bridge = claimingBridge(["T1", "T2"]);
    const cursor = new TabCursor(bridge);
    await cursor.resolve();
    cursor.markLost();
    expect(cursor.tab).toBeNull();
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: lostNotice("T2") });
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: null });
    expect(lostNotice("T2")).toBe(
      "Note: the bridge daemon restarted, so this session's tab was lost; it now holds T2 (the active tab).",
    );
  });

  it("gives the notice once even to concurrent re-claims", async () => {
    const d = deferred<unknown>();
    const call = vi.fn().mockResolvedValueOnce({ tab: "T1" }).mockImplementationOnce(() => d.promise);
    const cursor = new TabCursor({ call });
    await cursor.resolve();
    cursor.markLost();
    const a = cursor.resolve();
    const b = cursor.resolve();
    d.resolve({ tab: "T5" });
    const results = await Promise.all([a, b]);
    expect(results.map((r) => r.tab)).toEqual(["T5", "T5"]);
    expect(results.filter((r) => r.notice !== null)).toEqual([{ tab: "T5", notice: lostNotice("T5") }]);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("a loss before any cursor existed gives no notice (a first-ever claim never does)", async () => {
    const cursor = new TabCursor(claimingBridge());
    cursor.markLost();
    expect(await cursor.resolve()).toEqual({ tab: "T1", notice: null });
  });

  it("a failed re-claim keeps the loss, so the next successful claim still gives the notice", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ tab: "T1" })
      .mockRejectedValueOnce(new BridgeError(ErrorCodes.NOT_CONNECTED, "down"))
      .mockResolvedValueOnce({ tab: "T3" });
    const cursor = new TabCursor({ call });
    await cursor.resolve();
    cursor.markLost();
    await expect(cursor.resolve()).rejects.toThrow("down");
    expect(await cursor.resolve()).toEqual({ tab: "T3", notice: lostNotice("T3") });
  });

  it("two losses before the re-claim still give one notice", async () => {
    const cursor = new TabCursor(claimingBridge(["T1", "T2"]));
    await cursor.resolve();
    cursor.markLost();
    cursor.markLost();
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: lostNotice("T2") });
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: null });
  });

  it("an in-flight claim from before the loss does not become the cursor", async () => {
    const d = deferred<unknown>();
    const call = vi.fn().mockResolvedValueOnce({ tab: "T1" }).mockImplementationOnce(() => d.promise).mockResolvedValueOnce({ tab: "T9" });
    const cursor = new TabCursor({ call });
    await cursor.resolve();
    cursor.set("T1");
    cursor.markLost();
    const stale = cursor.resolve(); // claim #2 in flight
    cursor.markLost(); // the daemon restarted again meanwhile
    d.resolve({ tab: "T5" });
    expect((await stale).tab).toBe("T5");
    expect(cursor.tab).toBeNull(); // the old daemon's handle is not kept
    expect(await cursor.resolve()).toEqual({ tab: "T9", notice: lostNotice("T9") });
  });

  it("set() after a loss clears it: no re-claim and no notice", async () => {
    const bridge = claimingBridge();
    const cursor = new TabCursor(bridge);
    await cursor.resolve();
    cursor.markLost();
    cursor.set("T6");
    expect(await cursor.resolve()).toEqual({ tab: "T6", notice: null });
    expect(bridge.call).toHaveBeenCalledTimes(1);
  });

  it("restoreNotice() re-arms a notice whose tool call failed", async () => {
    const cursor = new TabCursor(claimingBridge(["T1", "T2"]));
    await cursor.resolve();
    cursor.markLost();
    const { notice } = await cursor.resolve();
    expect(notice).toBe(lostNotice("T2"));
    cursor.restoreNotice(notice!);
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: lostNotice("T2") });
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: null });
  });
});

describe("TabCursor.adopt — the BridgeLink hook", () => {
  it("the first client is not a loss; its 4002 reconnect is", async () => {
    const cursor = new TabCursor(claimingBridge(["T1", "T2"]));
    const c1 = fakeClient();
    cursor.adopt(c1);
    await cursor.resolve();
    expect(cursor.tab).toBe("T1");
    c1.fireReconnected();
    expect(cursor.tab).toBeNull();
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: lostNotice("T2") });
  });

  it("a new client after an earlier one (the non-4002 path) is a loss, and the old client is let go", async () => {
    const cursor = new TabCursor(claimingBridge(["T1", "T2"]));
    const c1 = fakeClient();
    const c2 = fakeClient();
    cursor.adopt(c1);
    await cursor.resolve();
    cursor.adopt(c2);
    expect(c1.listenerCount).toBe(0);
    expect(c2.listenerCount).toBe(1);
    expect(cursor.tab).toBeNull();
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: lostNotice("T2") });
  });

  it("remembers having had a cursor across a client swap that happened while it was already lost", async () => {
    const cursor = new TabCursor(claimingBridge(["T1", "T2"]));
    const c1 = fakeClient();
    cursor.adopt(c1);
    await cursor.resolve();
    c1.fireReconnected(); // lost on the 4002 path …
    cursor.adopt(fakeClient()); // … and then the client is replaced before any re-claim
    expect(await cursor.resolve()).toEqual({ tab: "T2", notice: lostNotice("T2") });
  });
});
