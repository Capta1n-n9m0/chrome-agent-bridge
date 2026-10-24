// Step 9 S3 — the SDK's half of the safety state (phase doc 0.3, 0.5, 0.6; decisions.md · 2026-10-24 #132
// the read-only state, #133 `DISARMED {scope}`, #148 `TabInfo.hidden`, #120 the attach set unchanged;
// stage0-audit F25, F26).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BridgeError, ErrorCodes, type WelcomeMessage } from "@bridge/shared";
import { BridgeClient, type Timers } from "../src/client.js";
import { ATTACH_CODES, isAttachCode, renderReport, safetyRefusalLine } from "../src/error.js";
import * as reportEntry from "../src/report.js";
import type { Knocked } from "../src/knock.js";
import { FakeConnection } from "./fakes.js";

const NOW = Date.UTC(2026, 9, 24, 9, 0, 0, 0);

function welcome(): WelcomeMessage {
  return { type: "welcome", build: "B", proto: 2, clientId: "c1", extensionConnected: true };
}

/** A timer list that fires only when advanced (the 5 s attach budget never fires on its own here). */
function manualTimers(): Timers {
  return { setTimeout: () => ({}), clearTimeout: () => {} };
}

type Answer = { result: unknown } | { error: { code: string; message: string; data?: unknown } };

async function clientWith(answers: (m: Record<string, unknown>) => Answer | undefined, dir: string) {
  const conn = new FakeConnection((m, c) => {
    if (typeof m.method !== "string") return;
    const a = answers(m) ?? { result: { ok: true } };
    if ("error" in a) c.emit({ id: m.id, error: a.error });
    else c.emit({ id: m.id, result: a.result });
  });
  const client = new BridgeClient({
    knock: async (): Promise<Knocked> => ({ conn, welcome: welcome() }),
    timers: manualTimers(),
    env: { BRIDGE_FAILURES_DIR: dir },
    homedir: () => dir,
    now: () => NOW,
  });
  await client.connect();
  return { client, conn };
}

const methodsSent = (conn: FakeConnection) => conn.sent.filter((f) => typeof f.method === "string").map((f) => f.method);

async function caught(p: Promise<unknown>): Promise<BridgeError> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(BridgeError);
    return err as BridgeError;
  }
  throw new Error("expected a rejection");
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "bridge-s3-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// ── S3.1: the attach set ─────────────────────────────────────────────────────────────────────────

describe("S3.1 — DISARMED and DOMAIN_BLOCKED stay out of the attach set", () => {
  it("ATTACH_CODES holds neither code; isAttachCode says no to both", () => {
    expect(ATTACH_CODES).not.toContain(ErrorCodes.DISARMED);
    expect(ATTACH_CODES).not.toContain(ErrorCodes.DOMAIN_BLOCKED);
    expect(isAttachCode("DISARMED")).toBe(false);
    expect(isAttachCode("DOMAIN_BLOCKED")).toBe(false);
    expect(reportEntry.ATTACH_CODES).toBe(ATTACH_CODES);
  });

  for (const code of ["DISARMED", "DOMAIN_BLOCKED"]) {
    it(`a Tab call refused ${code} makes no attach call and is rethrown as it came`, async () => {
      const { client, conn } = await clientWith(
        (m) => (m.method === "tabs.claim" ? { result: { tab: "T3" } } : m.method === "click" ? { error: { code, message: "refused", data: { scope: "all" } } } : undefined),
        dir,
      );
      const tab = await client.claim("T3");
      const err = await caught(tab.click("e1"));
      expect(err.code).toBe(code);
      expect(methodsSent(conn)).toEqual(["tabs.claim", "click"]);
      expect(err.report).toBeUndefined();
      expect(readdirSync(dir)).toEqual([]);
    });
  }
});

// ── S3.2 (SDK half): the one plain line, by scope ────────────────────────────────────────────────

describe("S3.2 — the plain line for DISARMED and DOMAIN_BLOCKED", () => {
  const all = safetyRefusalLine("DISARMED", { scope: "all" })!;
  const js = safetyRefusalLine("DISARMED", { scope: "evaluate" })!;
  const blocked = safetyRefusalLine("DOMAIN_BLOCKED", undefined)!;

  it("DISARMED {scope:'all'}: the user turned the bridge off — stop and ask, do not retry", () => {
    expect(all).toBe(
      "DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to turn it back on; do not retry.",
    );
  });

  it("DISARMED {scope:'evaluate'}: JavaScript off — every other call still works, ask before relying on it", () => {
    expect(js).toBe(
      "DISARMED: the user has turned JavaScript off for the bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on it; do not retry it.",
    );
    expect(js).not.toBe(all);
  });

  it("a DISARMED without a valid scope reads as 'all' (the stricter reading)", () => {
    for (const data of [undefined, null, {}, { scope: "page" }, "all", { scope: 1 }]) {
      expect(safetyRefusalLine("DISARMED", data)).toBe(all);
    }
  });

  it("DOMAIN_BLOCKED: the user blocked the site — stop and ask, do not retry or work around it", () => {
    expect(blocked).toBe(
      "DOMAIN_BLOCKED: the user has blocked this site for the bridge in Chrome. Stop and ask the user; do not retry, and do not try to reach the site another way.",
    );
  });

  it("each line is one line; any other code has none", () => {
    for (const l of [all, js, blocked]) expect(l).not.toContain("\n");
    for (const code of Object.keys(ErrorCodes).filter((c) => c !== "DISARMED" && c !== "DOMAIN_BLOCKED")) {
      expect(safetyRefusalLine(code, { scope: "all" })).toBeNull();
    }
  });

  it("renderReport (what report() renders) gives the plain line for both codes, differing by scope", () => {
    const base = { message: "x", attachErrors: [], now: NOW };
    expect(renderReport({ ...base, code: "DISARMED", data: { scope: "all" } })).toBe(all);
    expect(renderReport({ ...base, code: "DISARMED", data: { scope: "evaluate" } })).toBe(js);
    expect(renderReport({ ...base, code: "DOMAIN_BLOCKED" })).toBe(blocked);
  });

  it("the MCP's door (@bridge/sdk/report) exports the same function", () => {
    expect(reportEntry.safetyRefusalLine).toBe(safetyRefusalLine);
  });
});

// ── F25, F26 ───────────────────────────────────────────────────────────────────────────────────────

describe("stage0-audit F25 / F26", () => {
  it("F25: an attach-set failure whose attach calls are refused DISARMED carries attachErrors and writes no PNG", async () => {
    const refusal = { code: "DISARMED", message: "the user has turned the bridge off", data: { scope: "all" } };
    const { client, conn } = await clientWith((m) => {
      if (m.method === "tabs.claim") return { result: { tab: "T3" } };
      if (m.method === "click") return { error: { code: "TIMEOUT", message: "timed out" } };
      if (m.method === "snapshot" || m.method === "screenshot" || m.method === "networkRequests") return { error: refusal };
      return undefined;
    }, dir);
    const tab = await client.claim("T3");
    const err = await caught(tab.click("e1"));
    expect(err.code).toBe("TIMEOUT");
    expect(methodsSent(conn).slice(2).sort()).toEqual(["networkRequests", "screenshot", "snapshot"]);
    expect([...(err.attachErrors ?? [])].sort()).toEqual([
      "network: DISARMED the user has turned the bridge off",
      "screenshot: DISARMED the user has turned the bridge off",
      "snapshot: DISARMED the user has turned the bridge off",
    ]);
    expect(err.screenshotPath).toBeUndefined();
    expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
  });

  it("F26: Tab.click({trusted:true}) while focusTab is refused DISARMED never sends the click; the error is focusTab's", async () => {
    const { client, conn } = await clientWith((m) => {
      if (m.method === "tabs.claim") return { result: { tab: "T3" } };
      if (m.method === "focusTab") return { error: { code: "DISARMED", message: "focusTab refused: bridge off", data: { scope: "all" } } };
      return undefined;
    }, dir);
    const tab = await client.claim("T3");
    const err = await caught(tab.click("e1", { trusted: true }));
    expect(err.code).toBe("DISARMED");
    expect(err.message).toBe("focusTab refused: bridge off");
    expect(methodsSent(conn)).toEqual(["tabs.claim", "focusTab"]);
  });
});

// ── the read-only state (#132) ────────────────────────────────────────────────────────────────────

describe("client.safety() and on('safetyStatus')", () => {
  it("safety() reads daemon.status.safety", async () => {
    const state = { armed: false, evaluate: true, blockedCount: 2 };
    const { client, conn } = await clientWith((m) => (m.method === "daemon.status" ? { result: { build: "B", safety: state } } : undefined), dir);
    expect(await client.safety()).toEqual(state);
    expect(methodsSent(conn)).toEqual(["daemon.status"]);
  });

  it("safety() is null when the daemon says null, says nothing (an older daemon), or sends a malformed state", async () => {
    for (const result of [{ safety: null }, {}, { safety: { armed: "yes", evaluate: true, blockedCount: 0 } }, null]) {
      const { client } = await clientWith((m) => (m.method === "daemon.status" ? { result } : undefined), dir);
      expect(await client.safety()).toBeNull();
    }
  });

  it("safety() returns only the three fields", async () => {
    const { client } = await clientWith(
      (m) => (m.method === "daemon.status" ? { result: { safety: { armed: true, evaluate: true, blockedCount: 0, extra: "x" } } } : undefined),
      dir,
    );
    expect(await client.safety()).toEqual({ armed: true, evaluate: true, blockedCount: 0 });
  });

  it("on('safetyStatus') delivers well-formed params, skips malformed ones, and unsubscribes", async () => {
    const { client, conn } = await clientWith(() => undefined, dir);
    const got = vi.fn();
    const any = vi.fn();
    client.on("event", any);
    const off = client.on("safetyStatus", got);
    conn.emit({ event: "safetyStatus", params: { armed: false, evaluate: true, blockedCount: 0 } });
    conn.emit({ event: "safetyStatus", params: { armed: false } });
    expect(got).toHaveBeenCalledTimes(1);
    expect(got).toHaveBeenCalledWith({ armed: false, evaluate: true, blockedCount: 0 });
    expect(any).toHaveBeenCalledTimes(2);
    off();
    conn.emit({ event: "safetyStatus", params: { armed: true, evaluate: true, blockedCount: 0 } });
    expect(got).toHaveBeenCalledTimes(1);
  });

  it("a client with no safetyStatus listener keeps working across the event (probe P3)", async () => {
    const { client, conn } = await clientWith((m) => (m.method === "listTabs" ? { result: { tabs: [] } } : undefined), dir);
    conn.emit({ event: "safetyStatus", params: { armed: false, evaluate: true, blockedCount: 0 } });
    expect(await client.tabs()).toEqual([]);
  });
});

// ── TabInfo.hidden (#148) ─────────────────────────────────────────────────────────────────────────

describe("TabInfo for hidden rows (#148)", () => {
  it("a hidden row maps to title '' and url '' with hidden set; a plain row has no hidden key", async () => {
    const { client } = await clientWith(
      (m) =>
        m.method === "listTabs"
          ? {
              result: {
                tabs: [
                  { id: 1, tab: "T1", active: true, windowId: 1, current: true, hidden: "disarmed" },
                  { id: 2, tab: "T2", active: false, windowId: 1, hidden: "blocked", owner: "x" },
                  { id: 3, tab: "T3", title: "Play", url: "http://localhost:8080/", active: false, windowId: 1 },
                  { id: 4, tab: "T4", active: false, windowId: 1, hidden: "weird" },
                ],
              },
            }
          : undefined,
      dir,
    );
    const tabs = await client.tabs();
    expect(tabs[0]).toEqual({ handle: "T1", title: "", url: "", current: true, hidden: "disarmed" });
    expect(tabs[1]).toEqual({ handle: "T2", title: "", url: "", current: false, owner: "x", hidden: "blocked" });
    expect(tabs[2]).toEqual({ handle: "T3", title: "Play", url: "http://localhost:8080/", current: false });
    expect(tabs[3]).toEqual({ handle: "T4", title: "", url: "", current: false });
  });
});
