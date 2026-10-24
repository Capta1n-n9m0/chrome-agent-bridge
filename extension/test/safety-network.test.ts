/**
 * Step 9 S2a: the network log while disarmed and for blocked hosts (phase doc 0.4's F9 note; #137 item 6;
 * #155). The ingest gate (`extension/src/safety-network.ts`) drops events while disarmed and for blocked
 * hosts, holds events that arrive before the state is known (bounded) and decides them once it is; the log
 * gains `discard(requestId)` and a `keep` predicate on every query, an `id` lookup included. Pure.
 */
import { describe, it, expect, vi } from "vitest";
import { NetworkIngestGate } from "../src/safety-network.js";
import { NetworkLog, type WebRequestDetails, type WebRequestEvent } from "../src/network-log.js";
import { parseBlockList, EMPTY_BLOCK_LIST } from "../src/safety-match.js";
import { keepInQuery } from "../src/safety.js";
import type { SafetyView } from "../src/safety-state.js";

const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const ALLOWED = "http://localhost:8080/app.js";
const BLOCKED = "https://www.bank.example/api";

function view(o: { armed?: boolean; list?: string } = {}): SafetyView {
  const blockList = o.list ? parseBlockList(o.list) : EMPTY_BLOCK_LIST;
  return { switches: { armed: o.armed ?? true, evaluate: true }, ctx: { extensionId: OWN_ID, blockList }, blockedCount: blockList.blockedCount };
}

let seq = 0;
function ev(o: Partial<WebRequestDetails> = {}): WebRequestDetails {
  return { requestId: String(++seq), url: ALLOWED, method: "GET", type: "script", tabId: 5, timeStamp: 1000 + seq, ...o };
}

function setup(initial: SafetyView | null, tabUrls: Record<number, string> = {}) {
  let current = initial;
  const log = new NetworkLog({ now: () => 5000 });
  const ingest = vi.fn((e: WebRequestEvent, d: WebRequestDetails) => log.ingest(e, d));
  const discard = vi.fn((id: string) => log.discard(id));
  const gate = new NetworkIngestGate({
    ingest,
    discard,
    tabUrl: (id) => tabUrls[id],
    view: () => current,
    maxBuffer: 4,
  });
  return { gate, log, ingest, discard, set: (v: SafetyView | null) => (current = v), tabUrls };
}

const all = (log: NetworkLog) => log.query({ tabId: "all", limit: 500 }).entries;

describe("NetworkIngestGate", () => {
  it("armed with an empty list: every event is ingested, unchanged", () => {
    const s = setup(view());
    const d = ev();
    s.gate.offer("onBeforeRequest", d);
    s.gate.offer("onCompleted", { ...d, statusCode: 200 });
    expect(s.ingest).toHaveBeenCalledTimes(2);
    expect(all(s.log)).toHaveLength(1);
    expect(all(s.log)[0]).toMatchObject({ url: ALLOWED, status: 200 });
  });

  it("disarmed: nothing is recorded (0.3)", () => {
    const s = setup(view({ armed: false }));
    s.gate.offer("onBeforeRequest", ev());
    s.gate.offer("onCompleted", ev());
    expect(s.ingest).not.toHaveBeenCalled();
    expect(all(s.log)).toHaveLength(0);
  });

  it("a request begun while disarmed is not recorded after a re-arm (its later events are dropped too)", () => {
    const s = setup(view({ armed: false }));
    const d = ev();
    s.gate.offer("onBeforeRequest", d);
    s.set(view());
    s.gate.offer("onCompleted", { ...d, statusCode: 200 });
    expect(all(s.log)).toHaveLength(0);
  });

  it("entries recorded while armed stay after a disarm (F35)", () => {
    const s = setup(view());
    const d = ev();
    s.gate.offer("onBeforeRequest", d);
    s.gate.offer("onCompleted", { ...d, statusCode: 200 });
    s.set(view({ armed: false }));
    s.gate.offer("onBeforeRequest", ev());
    expect(all(s.log)).toHaveLength(1);
    expect(s.discard).not.toHaveBeenCalled();
  });

  it("a blocked url, redirectUrl or initiator is dropped at ingest", () => {
    const s = setup(view({ list: "bank.example" }));
    s.gate.offer("onBeforeRequest", ev({ url: BLOCKED }));
    s.gate.offer("onBeforeRequest", ev({ initiator: "https://bank.example" }));
    expect(all(s.log)).toHaveLength(0);
  });

  it("a redirect onto a blocked host discards the entry already recorded for that request", () => {
    const s = setup(view({ list: "bank.example" }));
    const d = ev();
    s.gate.offer("onBeforeRequest", d);
    expect(all(s.log)).toHaveLength(1);
    s.gate.offer("onBeforeRedirect", { ...d, statusCode: 302, redirectUrl: BLOCKED });
    expect(s.discard).toHaveBeenCalledWith(d.requestId);
    expect(all(s.log)).toHaveLength(0);
    s.gate.offer("onBeforeRequest", { ...d, url: BLOCKED }); // the second hop
    s.gate.offer("onCompleted", { ...d, url: BLOCKED, statusCode: 200 });
    expect(all(s.log)).toHaveLength(0);
  });

  it("an event of a tab whose top-level URL is blocked (or this extension's page) is dropped", () => {
    const s = setup(view({ list: "bank.example" }), { 5: BLOCKED, 6: `chrome-extension://${OWN_ID}/options.html` });
    s.gate.offer("onBeforeRequest", ev({ tabId: 5 }));
    s.gate.offer("onBeforeRequest", ev({ tabId: 6 }));
    expect(all(s.log)).toHaveLength(0);
  });

  it("before the state is known, events are held, then decided once it is (not recorded blind)", () => {
    const s = setup(null);
    s.gate.offer("onBeforeRequest", ev({ url: ALLOWED }));
    s.gate.offer("onBeforeRequest", ev({ url: BLOCKED }));
    expect(s.ingest).not.toHaveBeenCalled();
    expect(s.gate.buffered).toBe(2);
    s.set(view({ list: "bank.example" }));
    s.gate.flush();
    expect(s.gate.buffered).toBe(0);
    expect(all(s.log).map((e) => e.url)).toEqual([ALLOWED]);
  });

  it("held events are decided in order before a newer event once the state is known", () => {
    const s = setup(null);
    const d = ev();
    s.gate.offer("onBeforeRequest", d);
    s.set(view());
    s.gate.offer("onCompleted", { ...d, statusCode: 204 }); // flushes the held one first
    expect(s.ingest.mock.calls.map((c) => c[0])).toEqual(["onBeforeRequest", "onCompleted"]);
    expect(all(s.log)[0]).toMatchObject({ status: 204 });
  });

  it("held events while the state turns out disarmed are dropped", () => {
    const s = setup(null);
    s.gate.offer("onBeforeRequest", ev());
    s.set(view({ armed: false }));
    s.gate.flush();
    expect(all(s.log)).toHaveLength(0);
  });

  it("the buffer is bounded: the oldest is dropped (and its request with it)", () => {
    const s = setup(null);
    const first = ev();
    s.gate.offer("onBeforeRequest", first);
    for (let i = 0; i < 4; i++) s.gate.offer("onBeforeRequest", ev());
    expect(s.gate.buffered).toBe(4);
    s.set(view());
    s.gate.offer("onCompleted", { ...first, statusCode: 200 }); // the dropped request's later event
    expect(all(s.log).map((e) => e.id)).not.toContain(first.requestId);
    expect(all(s.log)).toHaveLength(4);
  });

  it("flush with the state still unknown keeps the events held", () => {
    const s = setup(null);
    s.gate.offer("onBeforeRequest", ev());
    s.gate.flush();
    expect(s.gate.buffered).toBe(1);
  });
});

describe("NetworkLog.discard", () => {
  it("removes every hop of a request and reports how many went", () => {
    const log = new NetworkLog({ now: () => 0 });
    const d = ev();
    log.ingest("onBeforeRequest", d);
    log.ingest("onBeforeRedirect", { ...d, statusCode: 302, redirectUrl: ALLOWED + "?2" });
    log.ingest("onBeforeRequest", { ...d, url: ALLOWED + "?2" });
    const other = ev();
    log.ingest("onBeforeRequest", other);
    expect(all(log)).toHaveLength(3);
    expect(log.discard(d.requestId)).toBe(2);
    expect(all(log).map((e) => e.id)).toEqual([other.requestId]);
    expect(() => log.query({ tabId: "all", id: d.requestId })).toThrow(/No request with id/);
    expect(log.discard("nope")).toBe(0);
  });

  it("marks the tab dirty so the flush writes it", () => {
    const log = new NetworkLog({ now: () => 0 });
    const d = ev({ tabId: 9 });
    log.ingest("onBeforeRequest", d);
    log.takeDirty();
    log.discard(d.requestId);
    expect([...log.takeDirty()]).toEqual([9]);
  });
});

describe("NetworkLog.query {keep} — the query filter (every query, an id lookup included)", () => {
  function filled() {
    const log = new NetworkLog({ now: () => 0 });
    const a = ev({ url: ALLOWED });
    const b = ev({ url: BLOCKED });
    log.ingest("onBeforeRequest", a);
    log.ingest("onBeforeRequest", b);
    return { log, a, b };
  }
  const ctx = { extensionId: OWN_ID, blockList: parseBlockList("bank.example") };
  const keep = (e: { url: string; redirectUrl?: string; initiator?: string }) => keepInQuery(e, undefined, ctx);

  it("a pattern added later hides older entries from a list query", () => {
    const { log } = filled();
    const r = log.query({ tabId: "all", keep });
    expect(r.entries.map((e) => e.url)).toEqual([ALLOWED]);
    expect(r.total).toBe(1);
  });

  it("an id lookup of a blocked entry answers as if it did not exist", () => {
    const { log, a, b } = filled();
    expect(() => log.query({ tabId: "all", id: b.requestId, keep })).toThrow(/No request with id/);
    expect(log.query({ tabId: "all", id: a.requestId, keep }).entries).toHaveLength(1);
  });

  it("without keep, today's answer exactly", () => {
    const { log } = filled();
    expect(log.query({ tabId: "all" }).entries).toHaveLength(2);
  });
});
