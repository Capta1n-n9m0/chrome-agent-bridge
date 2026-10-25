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
    // Step 10 S4b (2026-10-25; #202): JS_DISABLED joined the codes with a line of its own (S4b.3 below); was
    // `.filter((c) => c !== "DISARMED" && c !== "DOMAIN_BLOCKED")`.
    // Step 11 S2 (2026-10-25; #237): UPLOAD_REFUSED joined with a line of its own (S2.3 below).
    const SAFETY = ["DISARMED", "DOMAIN_BLOCKED", "JS_DISABLED", "UPLOAD_REFUSED"];
    for (const code of Object.keys(ErrorCodes).filter((c) => !SAFETY.includes(c))) {
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

// ── Step 10 S4b (phase doc 0.12 with Stage 0 F17; decisions.md #202 changed #133): JS_DISABLED ─────────

describe("S4b.3 — JS_DISABLED stays out of the attach set and reads as one plain line", () => {
  const JS_LINE =
    "JS_DISABLED: the user has turned JavaScript off for the bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on it; do not retry it.";

  it("ATTACH_CODES does not hold JS_DISABLED; isAttachCode says no; the set is unchanged", () => {
    expect(ATTACH_CODES).not.toContain("JS_DISABLED");
    expect(isAttachCode("JS_DISABLED")).toBe(false);
    expect([...ATTACH_CODES].sort()).toEqual(["LOCATOR_AMBIGUOUS", "LOCATOR_NOT_FOUND", "NAV_FAILED", "OFFSCREEN", "PAGE_ERROR", "REF_STALE", "TIMEOUT"]);
  });

  it("a Tab call refused JS_DISABLED makes no attach call and is rethrown as it came", async () => {
    const { client, conn } = await clientWith(
      (m) => (m.method === "tabs.claim" ? { result: { tab: "T3" } } : m.method === "evaluate" ? { error: { code: "JS_DISABLED", message: "refused" } } : undefined),
      dir,
    );
    const tab = await client.claim("T3");
    const err = await caught(tab.evaluate("1"));
    expect(err.code).toBe("JS_DISABLED");
    expect(err.data).toBeUndefined();
    expect(methodsSent(conn)).toEqual(["tabs.claim", "evaluate"]);
    expect(err.report).toBeUndefined();
    expect(readdirSync(dir)).toEqual([]);
  });

  it("safetyRefusalLine(JS_DISABLED) is the JavaScript-off line, whatever data it carries", () => {
    for (const data of [undefined, null, {}, { scope: "all" }, { scope: "evaluate" }]) {
      expect(safetyRefusalLine("JS_DISABLED", data)).toBe(JS_LINE);
    }
    expect(JS_LINE).not.toContain("\n");
  });

  it("F17: an old extension's DISARMED {scope:'evaluate'} still reads as the JavaScript-off line, under its own code", () => {
    const old = safetyRefusalLine("DISARMED", { scope: "evaluate" })!;
    expect(old.slice("DISARMED: ".length)).toBe(JS_LINE.slice("JS_DISABLED: ".length));
    expect(old.startsWith("DISARMED: ")).toBe(true);
  });

  it("renderReport gives the JavaScript-off line for JS_DISABLED (no report)", () => {
    expect(renderReport({ message: "x", attachErrors: [], now: NOW, code: "JS_DISABLED" })).toBe(JS_LINE);
  });
});

// ── Step 11 S2 (phase doc 0.5; spec §10's Step 11 note; decisions.md #237): UPLOAD_REFUSED ───────────────────

describe("S2.3 — UPLOAD_REFUSED stays out of the attach set and reads as one plain line", () => {
  // 2026-10-25: wording changed by ruling #263 (was: "UPLOAD_REFUSED: that file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders), so the bridge will not upload it. Stop and ask the user; do not retry with another path.").
  const UPLOAD_LINE =
    "UPLOAD_REFUSED: the bridge will not upload that file — either it is not in a folder the user allows for uploads in Chrome (extension options → Upload folders), or the user has not turned on \"Allow access to file URLs\" for the extension (chrome://extensions → the extension's Details). Stop and ask the user; do not retry with another path.";

  it("ATTACH_CODES does not hold UPLOAD_REFUSED; the set is unchanged", () => {
    expect(ATTACH_CODES).not.toContain("UPLOAD_REFUSED");
    expect(isAttachCode("UPLOAD_REFUSED")).toBe(false);
    expect([...ATTACH_CODES].sort()).toEqual(["LOCATOR_AMBIGUOUS", "LOCATOR_NOT_FOUND", "NAV_FAILED", "OFFSCREEN", "PAGE_ERROR", "REF_STALE", "TIMEOUT"]);
  });

  it("safetyRefusalLine(UPLOAD_REFUSED) is the one upload line, whatever data it carries; it names no path", () => {
    for (const data of [undefined, null, {}, { scope: "all" }, { path: String.raw`C:\Wave\sentinel.txt` }]) {
      expect(safetyRefusalLine("UPLOAD_REFUSED", data)).toBe(UPLOAD_LINE);
    }
    expect(UPLOAD_LINE).not.toContain("\n");
    expect(UPLOAD_LINE).not.toMatch(/[A-Za-z]:\\|\/srv|sentinel/);
  });

  // 2026-10-25, ruling #263: since #245 (b) the extension refuses UPLOAD_REFUSED for the folder rule and for Chrome's
  // file-URL toggle, so the one line names both, and the stop-and-ask instruction.
  it("the upload line names both causes — Upload folders and Allow access to file URLs — and says stop and ask (#263)", () => {
    const line = safetyRefusalLine("UPLOAD_REFUSED", undefined) ?? "";
    expect(line).toContain("(extension options → Upload folders)");
    expect(line).toContain('"Allow access to file URLs" for the extension (chrome://extensions → the extension\'s Details)');
    expect(line).toContain("Stop and ask the user; do not retry with another path.");
  });

  it("renderReport gives the upload line for UPLOAD_REFUSED (no report)", () => {
    expect(renderReport({ message: String.raw`x C:\Wave\a.txt`, attachErrors: [], now: NOW, code: "UPLOAD_REFUSED" })).toBe(UPLOAD_LINE);
  });

  it("a raw call refused UPLOAD_REFUSED makes no attach call and leaves no report", async () => {
    const { client, conn } = await clientWith(
      (m) => (m.method === "uploadFiles" ? { error: { code: "UPLOAD_REFUSED", message: "refused" } } : undefined),
      dir,
    );
    const err = await caught(client.call("uploadFiles", { tab: "T3", ref: "e1", paths: ["/srv/wave/a.txt"] }));
    expect(err.code).toBe("UPLOAD_REFUSED");
    expect(err.data).toBeUndefined();
    expect(methodsSent(conn)).toEqual(["uploadFiles"]);
    expect(err.report).toBeUndefined();
    expect(readdirSync(dir)).toEqual([]);
  });
});
