// Two clients pointing at different daemon builds (different BRIDGE_DAEMON) share one daemon slot.
// Decision #10's purpose: they must not hand the daemon back and forth. Across both clients at most
// one daemon.shutdown is sent, and the loser gets VERSION naming both builds (verifier finding 4).
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BridgeError, ErrorCodes } from "@bridge/shared";
import { connect } from "../src/connect.js";
import type { BridgeClient } from "../src/client.js";
import type { KnockIo } from "../src/knock.js";
import type { Connection } from "../src/transport.js";

let root: string;
let startDir: string;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "bridge-race-"));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ workspaces: ["daemon", "sdk"] }));
  mkdirSync(path.join(root, "daemon", "dist"), { recursive: true });
  writeFileSync(path.join(root, "daemon", "dist", "index.js"), "// daemon build");
  startDir = path.join(root, "sdk", "src");
  mkdirSync(startDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const tick = () => new Promise<void>((r) => setImmediate(r));

/** One daemon slot on one port: refused when empty, else a connection to the running build. */
function machine() {
  const state = { current: null as string | null, shutdowns: 0, attempts: 0 };
  let sockets: (Connection & { fireClose(code: number): void })[] = [];

  function socketTo(build: string) {
    const msg = new Set<(m: unknown) => void>();
    const cls = new Set<(c: number, r: string) => void>();
    let closed = false;
    const c = {
      send(raw: unknown) {
        const m = raw as Record<string, unknown>;
        if (closed) return;
        if (m.type === "hello") {
          queueMicrotask(() => {
            for (const l of [...msg]) l({ type: "welcome", build, proto: 2, clientId: "x", extensionConnected: true });
          });
        } else if (m.method === "daemon.shutdown") {
          state.shutdowns += 1;
          state.current = null;
          const all = sockets;
          sockets = [];
          queueMicrotask(() => all.forEach((k) => k.fireClose(4002)));
        } else if (typeof m.id === "string") {
          queueMicrotask(() => {
            for (const l of [...msg]) l({ id: m.id, result: build });
          });
        }
      },
      onMessage(cb: (m: unknown) => void) {
        msg.add(cb);
        return () => void msg.delete(cb);
      },
      onClose(cb: (code: number, reason: string) => void) {
        cls.add(cb);
        return () => void cls.delete(cb);
      },
      close() {
        closed = true;
        sockets = sockets.filter((k) => k !== c);
      },
      fireClose(code: number) {
        closed = true;
        for (const l of [...cls]) l(code, "upgrading");
      },
    };
    return c;
  }

  /** A client's io: its own clock, its own build, `lag` extra ticks before each connect attempt. */
  function io(build: string, lag: number): Partial<KnockIo> {
    let t = 0;
    return {
      async tryConnect() {
        for (let i = 0; i < lag; i++) await tick();
        state.attempts += 1;
        if (state.attempts > 2_000) throw Object.assign(new Error("runaway"), { code: "ERUNAWAY" });
        if (state.current === null) throw Object.assign(new Error("refused"), { code: "ECONNREFUSED" });
        const c = socketTo(state.current);
        sockets.push(c);
        return c;
      },
      spawnDaemon() {
        setImmediate(() => {
          if (state.current === null) state.current = build; // the bind is the lock
        });
      },
      hashDaemon: async () => build,
      // Like the real sleep: an aborted sleep (the welcome or the close won the race) never fires,
      // so it must not move this client's clock either.
      sleep: (ms, signal) =>
        new Promise((r) =>
          setImmediate(() => {
            if (signal?.aborted) return;
            t += ms;
            r();
          }),
        ),
      now: () => t,
    };
  }
  return { state, io };
}

async function outcome(p: Promise<unknown>): Promise<{ ok: true; value: unknown } | { ok: false; err: BridgeError }> {
  try {
    return { ok: true, value: await p };
  } catch (err) {
    expect(err).toBeInstanceOf(BridgeError);
    return { ok: false, err: err as BridgeError };
  }
}

describe("two clients on different daemon builds", () => {
  for (const [lagA, lagB] of [
    [3, 0],
    [5, 1],
    [0, 3],
    [2, 2],
    [0, 0],
    [1, 4],
    [8, 0],
  ]) {
    it(`lagA=${lagA} lagB=${lagB}: at most one handover in total; the loser gets VERSION naming both builds`, async () => {
      const m = machine();
      const env = { BRIDGE_TOKEN: "race-token" };
      const A = await connect({ name: "A", env, startDir, io: m.io("BUILD_A", lagA) });
      expect(A.welcome?.build).toBe("BUILD_A");

      const bConnect = outcome(connect({ name: "B", env, startDir, io: m.io("BUILD_B", lagB) }));
      const b = await bConnect;
      // Let A's 4002 reconnect (if any) run to its end.
      for (let i = 0; i < 400; i++) await tick();
      const a = await outcome(A.call("whoami"));
      let bCall: Awaited<ReturnType<typeof outcome>> | null = null;
      if (b.ok) bCall = await outcome((b.value as BridgeClient).call("whoami"));

      expect(m.state.shutdowns).toBeLessThanOrEqual(1);
      const results = [
        { name: "A", res: a },
        { name: "B", res: b.ok ? bCall! : b },
      ];
      const winners = results.filter((r) => r.res.ok);
      const losers = results.filter((r) => !r.res.ok);
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      // The winner talks to its own build.
      expect((winners[0].res as { value: unknown }).value).toBe(`BUILD_${winners[0].name}`);
      const err = (losers[0].res as { err: BridgeError }).err;
      expect(err.code).toBe(ErrorCodes.VERSION);
      expect(err.message).toContain("BUILD_A");
      expect(err.message).toContain("BUILD_B");

      A.close();
      if (b.ok) (b.value as BridgeClient).close();
    });
  }
});

