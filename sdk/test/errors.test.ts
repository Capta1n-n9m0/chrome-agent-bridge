// Every error the SDK raises or unwraps is an instance of the exported BridgeError — the shared class
// (decisions.md · 2026-10-23 #83 item 3; stage0-audit F14).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BridgeClient, BridgeError, ErrorCodes, connect } from "../src/index.js";
import type { KnockIo } from "../src/knock.js";
import { Tab } from "../src/tab.js";
import { FakeConnection, fakeClock } from "./fakes.js";

let root: string;
let startDir: string;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "bridge-errors-"));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ workspaces: ["daemon", "sdk"] }));
  mkdirSync(path.join(root, "daemon", "dist"), { recursive: true });
  writeFileSync(path.join(root, "daemon", "dist", "index.js"), "// daemon build");
  startDir = path.join(root, "sdk", "src");
  mkdirSync(startDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function io(conn: () => FakeConnection): KnockIo {
  const clock = fakeClock();
  return {
    tryConnect: vi.fn(async () => conn()),
    spawnDaemon: vi.fn(async () => {}),
    hashDaemon: vi.fn(async () => "NEW"),
    sleep: clock.sleep,
    now: clock.now,
  };
}

async function caught(p: Promise<unknown> | (() => unknown)): Promise<unknown> {
  try {
    await (typeof p === "function" ? p() : p);
  } catch (err) {
    return err;
  }
  throw new Error("expected a failure");
}

describe("instanceof BridgeError (the exported class)", () => {
  it("connect() NOT_CONNECTED (no token)", async () => {
    const err = await caught(connect({ name: "t", env: {}, startDir, io: io(() => new FakeConnection()) }));
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe(ErrorCodes.NOT_CONNECTED);
  });

  it("connect() VERSION (no welcome from what answered)", async () => {
    const err = await caught(
      connect({ name: "t", env: { BRIDGE_TOKEN: "errors-test-token" }, startDir, io: io(() => new FakeConnection()) }),
    );
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe(ErrorCodes.VERSION);
  });

  it("a daemon error frame unwrapped by call(), and the SDK-local NO_CURSOR / TAB_UNKNOWN / BAD_PARAMS", async () => {
    const first = new FakeConnection((m, c) => {
      if (m.method === "tabs.claim") c.emit({ id: m.id, result: { tab: "T1" } });
      else if (typeof m.method === "string") {
        c.emit({ id: m.id, error: { code: "TAB_HELD", message: "held", data: { owner: "x", since: 1 } } });
      }
    });
    const second = new FakeConnection();
    let n = 0;
    const client = new BridgeClient({
      knock: async () => ({
        conn: n++ === 0 ? first : second,
        welcome: { type: "welcome", build: "B", proto: 2, clientId: "c", extensionConnected: true },
      }),
    });
    await client.connect();

    const noCursor = await caught(() => client.tab());
    expect(noCursor).toBeInstanceOf(BridgeError);
    expect((noCursor as BridgeError).code).toBe(ErrorCodes.NO_CURSOR);

    const wire = await caught(client.call("snapshot", { tab: "T9" }));
    expect(wire).toBeInstanceOf(BridgeError);
    expect((wire as BridgeError).code).toBe(ErrorCodes.TAB_HELD);

    const tab = await client.claim("T1");
    expect(tab).toBeInstanceOf(Tab);
    const bad = await caught(tab.hover({ name: "x" } as never));
    expect(bad).toBeInstanceOf(BridgeError);
    expect((bad as BridgeError).code).toBe(ErrorCodes.BAD_PARAMS);

    first.fireClose(4002, "upgrading");
    const stale = await caught(tab.snapshot());
    expect(stale).toBeInstanceOf(BridgeError);
    expect((stale as BridgeError).code).toBe(ErrorCodes.TAB_UNKNOWN);
    client.close();
  });
});
