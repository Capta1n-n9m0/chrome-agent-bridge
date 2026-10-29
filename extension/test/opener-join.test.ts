/**
 * Step 13 S1 (G1; decisions.md · 2026-10-29 · Stage 0: G1 by a join in the extension — `tabCreated.openerTabId` is the
 * navigation source; no join, no grant (#385); spec §10 Note 2026-10-29). The worker holds a `tabCreated` whose tab has
 * Chrome's `openerTabId` until that tab's `webNavigation.onCreatedNavigationTarget` arrives (either order) or 250 ms
 * pass. Joined: `openerTabId` = `sourceTabId`. Not joined: no `openerTabId` (never Chrome's value, which names the
 * active tab for a background opener, 25 of 30 in `stage0-m1-G1.txt`). Ids only: the module never sees a URL.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { OPENER_JOIN_HOLD_MS, OpenerJoin, type JoinTimers } from "../src/opener-join.js";

/** A manual clock: timers fire only on `advance`. */
function fakeTimers() {
  let now = 0;
  let next = 1;
  const pending = new Map<number, { at: number; fn: () => void }>();
  const timers: JoinTimers = {
    set: (fn, ms) => {
      const h = next++;
      pending.set(h, { at: now + ms, fn });
      return h;
    },
    clear: (h) => void pending.delete(h as number),
  };
  const advance = (ms: number) => {
    now += ms;
    for (const [h, t] of [...pending].sort((a, b) => a[1].at - b[1].at)) {
      if (t.at > now || !pending.has(h)) continue;
      pending.delete(h);
      t.fn();
    }
  };
  return { timers, advance, pending: () => pending.size };
}

type Out = { tabId: number; openerTabId?: number };

function setup() {
  const t = fakeTimers();
  const out: Out[] = [];
  const join = new OpenerJoin((tabId, openerTabId) => out.push(openerTabId === undefined ? { tabId } : { tabId, openerTabId }), t.timers);
  return { join, out, ...t };
}

// Ids as in stage0-m1-G1.txt's bg leg: O the background opener, H the window's active tab Chrome names instead.
const O = 107769228;
const H = 107769100;
const P = 107769229;

describe("OpenerJoin (G1, #385)", () => {
  it("the hold is 250 ms (#385: the smallest of 250/500/1000 ≥ 4 × the 0.6 ms spread)", () => {
    expect(OPENER_JOIN_HOLD_MS).toBe(250);
  });

  it("tabs.onCreated first (60 of 60 measured), then the navigation target: emitted once, opener = sourceTabId", () => {
    const { join, out, advance, pending } = setup();
    join.created(P, H);
    expect(out).toEqual([]); // held
    join.navigationTarget(P, O);
    expect(out).toEqual([{ tabId: P, openerTabId: O }]);
    expect(pending()).toBe(0);
    advance(1000);
    expect(out).toHaveLength(1);
  });

  it("the navigation target first, then tabs.onCreated: emitted at once with opener = sourceTabId", () => {
    const { join, out, advance, pending } = setup();
    join.navigationTarget(P, O);
    expect(out).toEqual([]);
    advance(OPENER_JOIN_HOLD_MS - 1);
    join.created(P, H);
    expect(out).toEqual([{ tabId: P, openerTabId: O }]);
    expect(pending()).toBe(0);
  });

  it("no join within 250 ms: emitted with no openerTabId — never Chrome's value", () => {
    const { join, out, advance } = setup();
    join.created(P, H);
    advance(OPENER_JOIN_HOLD_MS - 1);
    expect(out).toEqual([]);
    advance(1);
    expect(out).toEqual([{ tabId: P }]);
    expect("openerTabId" in out[0]).toBe(false);
  });

  it("a tab without Chrome's openerTabId (Ctrl+T, newTab, tabs.create) goes straight through, as today", () => {
    const { join, out, pending } = setup();
    join.created(7, undefined);
    expect(out).toEqual([{ tabId: 7 }]);
    expect(pending()).toBe(0);
  });

  it("a tab without Chrome's openerTabId keeps no opener even if a navigation target came first (today's output)", () => {
    const { join, out, pending } = setup();
    join.navigationTarget(8, O);
    join.created(8, undefined);
    expect(out).toEqual([{ tabId: 8 }]);
    expect(pending()).toBe(0);
  });

  it("a navigation target for a tab never seen is dropped after the hold; a later tabs.onCreated is not joined", () => {
    const { join, out, advance, pending } = setup();
    join.navigationTarget(P, O);
    advance(OPENER_JOIN_HOLD_MS);
    expect(pending()).toBe(0);
    expect(out).toEqual([]);
    join.created(P, H);
    advance(OPENER_JOIN_HOLD_MS);
    expect(out).toEqual([{ tabId: P }]);
  });

  it("a navigation target after the flush changes nothing: no second event, no late opener", () => {
    const { join, out, advance } = setup();
    join.created(P, H);
    advance(OPENER_JOIN_HOLD_MS);
    join.navigationTarget(P, O);
    advance(OPENER_JOIN_HOLD_MS);
    expect(out).toEqual([{ tabId: P }]);
  });

  it("the source tab closed before the join: the join still names the source (the daemon finds no holder)", () => {
    const { join, out } = setup();
    join.created(P, H);
    join.gone(O); // the opener's tabRemoved: not a held tab, nothing to flush
    expect(out).toEqual([]);
    join.navigationTarget(P, O);
    expect(out).toEqual([{ tabId: P, openerTabId: O }]);
  });

  it("popup of a popup: each joins to its own source, not to Chrome's active tab", () => {
    const { join, out } = setup();
    const P2 = P + 1;
    join.created(P, H);
    join.navigationTarget(P, O);
    join.created(P2, H);
    join.navigationTarget(P2, P);
    expect(out).toEqual([
      { tabId: P, openerTabId: O },
      { tabId: P2, openerTabId: P },
    ]);
  });

  it("two held tabs join independently, by the new tab's id (never by sourceTabId)", () => {
    const { join, out } = setup();
    join.created(P, H);
    join.created(P + 2, H);
    join.navigationTarget(P + 2, O);
    join.navigationTarget(P, P + 2);
    expect(out).toEqual([
      { tabId: P + 2, openerTabId: O },
      { tabId: P, openerTabId: P + 2 },
    ]);
  });

  it("tabRemoved of a held tab flushes its tabCreated first, unjoined; a later target or timer adds nothing", () => {
    const { join, out, advance, pending } = setup();
    join.created(P, H);
    join.gone(P);
    expect(out).toEqual([{ tabId: P }]);
    expect(pending()).toBe(0);
    join.navigationTarget(P, O);
    advance(OPENER_JOIN_HOLD_MS * 2);
    expect(out).toEqual([{ tabId: P }]);
  });

  it("tabReplaced of a held tab (gone(removedTabId)) flushes it; the added id is not joined to the old target", () => {
    const { join, out, advance } = setup();
    join.created(P, H);
    join.gone(P);
    join.created(P + 9, undefined); // the replacing tab, as onCreated would not report it; still no opener
    advance(OPENER_JOIN_HOLD_MS);
    expect(out).toEqual([{ tabId: P }, { tabId: P + 9 }]);
  });

  it("gone() drops a waiting navigation target too", () => {
    const { join, out, pending } = setup();
    join.navigationTarget(P, O);
    join.gone(P);
    expect(pending()).toBe(0);
    join.created(P, H);
    expect(out).toEqual([]);
  });

  it("a second tabs.onCreated for a held id replaces nothing: one event out", () => {
    const { join, out, advance } = setup();
    join.created(P, H);
    join.created(P, H);
    join.navigationTarget(P, O);
    advance(OPENER_JOIN_HOLD_MS);
    expect(out).toEqual([{ tabId: P, openerTabId: O }]);
  });

  it("ids only: the module's inputs take numbers, and its source names no url field and logs nothing", () => {
    const src = readFileSync(fileURLToPath(new URL("../src/opener-join.ts", import.meta.url)), "utf8");
    expect(src).not.toMatch(/\burl\b/i);
    expect(src).not.toMatch(/console\.|\blog\(/);
    const { join } = setup();
    expect(join.created.length).toBe(2);
    expect(join.navigationTarget.length).toBe(2);
  });
});
