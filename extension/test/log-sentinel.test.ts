/**
 * Step 9 S2b — S2.3 as #141 words it, second half (phase doc 0.7's F28 note): drive the gate, the matcher,
 * the network ingest gate, the toggles (S2a's store with stubbed storage, write-failed and a failed arm
 * included), the badge and its press log line, the options page's model, and the daemon's safety relay (its
 * real `WsHost` over `ws` on port 0, with a fake proto:2 extension and a client) with a sentinel pattern, URL,
 * title and token; capture every `console.*` line and every line of the daemon's injected logger; assert none
 * contains any sentinel. The capture is checked to be live (the press lines and the daemon's safety line are
 * in it), so an empty capture cannot pass. Reserved names only (`.example`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Bridge } from "../../daemon/src/bridge.js";
import { WsHost } from "../../daemon/src/wsHost.js";
import { parseBlockList, isUrlBlocked, urlHost } from "../src/safety-match.js";
import {
  METHOD_CLASSES,
  redactListTabsRow,
  redactTabCreated,
  redactTabRemoved,
  safetyDecisionAll,
  keepInQuery,
  type SafetyTarget,
} from "../src/safety.js";
import { SafetyStore, SafetyReporter, SAFETY_KEYS, reportOf } from "../src/safety-state.js";
import { CallSafety, type CallSafetyDeps } from "../src/safety-call.js";
import { GatedRouter } from "../src/router.js";
import { NetworkIngestGate } from "../src/safety-network.js";
import { NetworkLog } from "../src/network-log.js";
import { BadgeController, type ActionApi } from "../src/badge.js";
import { analyzeBlockList, blockListAfterStoredChange, optionsStatus } from "../src/options-model.js";
import { BridgeError } from "../src/errors.js";

// ---------------------------------------------------------------- the sentinels
const PATTERN = "sentinel-pattern-q7.example";
const URL_ = "https://www.sentinel-pattern-q7.example/secret-path-Z9?k=SENTINELQ";
const OTHER_URL = "http://sentinel-allowed-w3.example/other-path-V5";
const TITLE = "Sentinel Title X4K2";
const TOKEN = "sentinel-token-R8M3-5f1e";
const INVALID_LINE = "sentinel-invalid-J6 !!";
/** Substrings any of which, in any case, betrays a sentinel. */
const NEEDLES = ["sentinel-pattern-q7", "secret-path-z9", "sentinelq", "sentinel-allowed-w3", "other-path-v5", "x4k2", "r8m3", "sentinel-invalid-j6"];
const OWN_ID = "abcdefghijklmnopabcdefghijklmnop";
const LIST_TEXT = [PATTERN, `*.${PATTERN}:8443`, `https://${PATTERN}/login`, INVALID_LINE, "# a comment naming sentinel-pattern-q7.example"].join("\n");

// ---------------------------------------------------------------- the capture
const captured: string[] = [];
function show(v: unknown): string {
  if (v instanceof Error) return `${v.name}: ${v.message}\n${v.stack ?? ""}`;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}
beforeEach(() => {
  captured.length = 0;
  for (const m of ["log", "info", "warn", "error", "debug", "trace"] as const) {
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => void captured.push(`console.${m}: ${args.map(show).join(" ")}`));
  }
});
afterEach(() => vi.restoreAllMocks());

function expectClean(lines: readonly string[]): void {
  for (const line of lines) {
    const low = line.toLowerCase();
    for (const n of NEEDLES) expect(low.includes(n), `a sentinel (${n}) in a log line: ${line.length} chars`).toBe(false);
  }
}

// ---------------------------------------------------------------- the extension side
const stored: Record<string, unknown> = {};
function store(o: { setFails?: () => boolean; now?: () => number } = {}): SafetyStore {
  return new SafetyStore({
    get: async () => ({ ...stored }),
    set: async (items) => {
      if (o.setFails?.()) throw new Error(`QUOTA_BYTES exceeded writing ${JSON.stringify(items)}`);
      Object.assign(stored, items);
    },
    extensionId: OWN_ID,
    now: o.now ?? Date.now,
    onDisarm: () => {},
    onArm: () => {},
  });
}

const fakeAction = (): ActionApi & { titles: string[] } => {
  const titles: string[] = [];
  return {
    titles,
    setBadgeText: () => undefined,
    setBadgeBackgroundColor: () => undefined,
    setTitle: (d: { title: string }) => void titles.push(d.title),
  };
};

describe("0.7 sentinel test — no pattern, URL, title or token in any captured log line", () => {
  it("extension: matcher, gate, redaction, network gate, toggles, badge, options model", async () => {
    for (const k of Object.keys(stored)) delete stored[k];
    stored[SAFETY_KEYS.blockList] = LIST_TEXT;

    // The matcher.
    const list = parseBlockList(LIST_TEXT);
    expect(list.blockedCount).toBe(3);
    expect(isUrlBlocked(URL_, list)).toBe(true);
    expect(isUrlBlocked(OTHER_URL, list)).toBe(false);
    expect(urlHost(URL_)?.host).toBe(`www.${PATTERN}`);

    // The gate, every method, armed/disarmed × JS on/off, a blocked, an allowed and a gone tab.
    const ctx = { extensionId: OWN_ID, blockList: list };
    const targets: SafetyTarget[] = [
      { kind: "live", urls: [URL_, undefined] },
      { kind: "live", urls: [OTHER_URL] },
      { kind: "replaced", urls: [URL_] },
      { kind: "gone", lastUrl: URL_ },
      { kind: "own", url: URL_ },
      { kind: "none" },
    ];
    let decisions = 0;
    for (const method of Object.keys(METHOD_CLASSES)) {
      for (const armed of [true, false]) {
        for (const evaluate of [true, false]) {
          for (const t of targets) {
            for (const phase of ["receipt", "effect", "post"] as const) {
              try {
                safetyDecisionAll(method, { url: URL_, title: TITLE }, [t], { armed, evaluate }, ctx, phase);
                decisions++;
              } catch {
                // a target form the class does not take: a wiring error by design
              }
            }
          }
        }
      }
    }
    expect(decisions).toBeGreaterThan(100);
    const row = { id: 3, windowId: 1, active: true, title: TITLE, url: URL_ };
    expect(redactListTabsRow(row, { armed: true, evaluate: true }, ctx)).not.toHaveProperty("title");
    redactTabCreated({ tabId: 3, url: URL_ }, { armed: false, evaluate: true }, ctx, [URL_]);
    redactTabRemoved({ tabId: 3, lastUrl: URL_, lastTitle: TITLE }, { armed: true, evaluate: true }, ctx);
    expect(keepInQuery({ url: OTHER_URL, initiator: URL_ }, URL_, ctx)).toBe(false);

    // The gated router over CallSafety: refused, allowed, a handler that throws with the URL, the post-check.
    let disarmed = false;
    const deps: CallSafetyDeps = {
      readState: async () => {
        const v = await store().read();
        return disarmed ? { ...v, switches: { ...v.switches, armed: false } } : v;
      },
      getTab: async (id) => {
        if (id === 1) return { url: URL_, title: TITLE } as chrome.tabs.Tab;
        if (id === 2) return { url: OTHER_URL, title: TITLE } as chrome.tabs.Tab;
        throw new Error(`No tab with id: ${id}.`);
      },
      replacedBy: () => undefined,
      lastUrl: (id) => (id === 9 ? URL_ : undefined),
    };
    const router = new GatedRouter((method, params) => new CallSafety(method, params, deps));
    router.on("snapshot", async () => ({ url: URL_, title: TITLE }));
    router.on("navigate", async (p) => {
      throw new BridgeError("NAV_FAILED", `could not open ${String(p.url)} (${TITLE})`);
    });
    router.on("listTabs", async (_p, call) => call.redactRows([{ row: { ...row, id: 1 } }, { row: { ...row, id: 2, url: OTHER_URL } }]));
    router.on("evaluate", async () => {
      disarmed = true; // the human disarms mid-call: the post-check refuses
      return { value: URL_ };
    });
    const replies = [
      await router.handle(JSON.stringify({ id: "a", method: "snapshot", params: { tabId: 1 } })),
      await router.handle(JSON.stringify({ id: "b", method: "snapshot", params: { tabId: 2 } })),
      await router.handle(JSON.stringify({ id: "c", method: "navigate", params: { tabId: 2, url: URL_ } })),
      await router.handle(JSON.stringify({ id: "d", method: "navigate", params: { tabId: 2, url: OTHER_URL } })),
      await router.handle(JSON.stringify({ id: "e", method: "listTabs", params: {} })),
      await router.handle(JSON.stringify({ id: "f", method: "evaluate", params: { tabId: 2, expression: URL_ } })),
      await router.handle(JSON.stringify({ id: "g", method: "snapshot", params: { tabId: 9 } })),
      await router.handle(JSON.stringify({ id: "h", method: `nope-${URL_}`, params: {} })),
    ];
    expect(replies.every((r) => typeof r === "string")).toBe(true);
    disarmed = false;

    // The network ingest gate and the log behind it.
    const netLog = new NetworkLog({ now: () => 1 });
    const gate = new NetworkIngestGate({
      ingest: (e, d) => netLog.ingest(e, d),
      discard: (id) => void netLog.discard(id),
      tabUrl: (id) => (id === 1 ? URL_ : OTHER_URL),
      view: () => ({ switches: { armed: true, evaluate: true }, ctx, blockedCount: list.blockedCount }),
    });
    const base = { method: "GET", type: "main_frame", timeStamp: 1 };
    gate.offer("onBeforeRequest", { ...base, requestId: "1", url: URL_, tabId: 1 });
    gate.offer("onBeforeRequest", { ...base, requestId: "2", url: OTHER_URL, tabId: 2, initiator: URL_ });
    gate.offer("onBeforeRequest", { ...base, requestId: "3", url: OTHER_URL, tabId: 2 });
    gate.offer("onCompleted", { ...base, requestId: "3", url: OTHER_URL, tabId: 2, statusCode: 200 });

    // The toggles (S2a's store) through the badge's press: disarm, an ignored re-arm, arm, write-failed, a failed arm.
    let now = 10_000;
    let failing = false;
    const s = store({ setFails: () => failing, now: () => now });
    const api = fakeAction();
    const badge = new BadgeController({ api, read: async () => (await s.read()).switches });
    await badge.refresh();
    expect(await badge.press(() => s.toggle())).toBe("disarmed");
    now += 100;
    expect(await badge.press(() => s.toggle())).toBe("ignored");
    now += 5_000;
    expect(await badge.press(() => s.toggle())).toBe("armed");
    failing = true;
    now += 5_000;
    expect(await badge.press(() => s.toggle())).toBe("write-failed");
    now += 5_000;
    expect(await badge.press(() => s.toggle())).toBe("arm-failed");
    failing = false;
    s.applyChanges({ [SAFETY_KEYS.blockList]: { newValue: `${LIST_TEXT}\n${OTHER_URL}` } });
    const reporter = new SafetyReporter();
    reporter.connectionUp();
    expect(reporter.offer(reportOf(await s.read()))).not.toContain("sentinel");
    expectClean(api.titles);

    // The options page's model.
    const a = analyzeBlockList(LIST_TEXT);
    expect(a.invalidCount).toBe(1);
    expectClean([a.summary]);
    optionsStatus({ armed: true, evaluate: false, blockList: LIST_TEXT });
    blockListAfterStoredChange({ current: LIST_TEXT, loaded: "", stored: PATTERN });

    // The capture is live: the five press lines are in it.
    expect(captured.filter((l) => l.startsWith("console.log: safety: "))).toEqual([
      "console.log: safety: disarmed by the user",
      "console.log: safety: re-arm ignored (within 1 s of a disarm)",
      "console.log: safety: armed by the user",
      "console.log: safety: disarm not saved (storage write failed)",
      "console.log: safety: arm failed (storage write failed)",
    ]);
    expectClean(captured);
  });

  it("daemon: the safety relay, redaction and the token gate over real ws (port 0)", async () => {
    const daemonLog: string[] = [];
    const host = new WsHost(new Bridge(), { port: 0, token: TOKEN, build: "sentinel-build", log: (m) => daemonLog.push(m), heartbeatMs: 60_000 });
    const port = await host.listen();
    const sockets: WebSocket[] = [];
    const open = (): Promise<{ ws: WebSocket; frames: Record<string, unknown>[] }> =>
      new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        sockets.push(ws);
        const frames: Record<string, unknown>[] = [];
        ws.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
        ws.on("open", () => resolve({ ws, frames }));
        ws.on("error", reject);
      });
    const until = async (pred: () => boolean, ms = 3000) => {
      const t0 = Date.now();
      while (!pred()) {
        if (Date.now() - t0 > ms) throw new Error("timed out");
        await new Promise((r) => setTimeout(r, 5));
      }
    };
    try {
      // A wrong token, then the fake extension.
      const bad = await open();
      bad.ws.send(JSON.stringify({ type: "hello", token: `${TOKEN}-wrong`, role: "client", name: `n ${URL_}`, proto: 2 }));
      await until(() => bad.ws.readyState === WebSocket.CLOSED || bad.frames.length > 0);

      const ext = await open();
      let rows: Record<string, unknown>[] = [
        { id: 1, windowId: 1, active: true, current: true, title: TITLE, url: URL_ },
        { id: 2, windowId: 1, active: false, title: TITLE, url: OTHER_URL },
      ];
      ext.ws.on("message", (raw) => {
        const f = JSON.parse(raw.toString()) as { id?: string; method?: string; params?: Record<string, unknown> };
        if (typeof f.id !== "string" || typeof f.method !== "string") return;
        if (f.method === "listTabs") ext.ws.send(JSON.stringify({ id: f.id, result: { tabs: rows } }));
        else if (f.method === "snapshot") ext.ws.send(JSON.stringify({ id: f.id, error: { code: "DOMAIN_BLOCKED", message: `blocked ${URL_} ${TITLE}` } }));
        else ext.ws.send(JSON.stringify({ id: f.id, result: { url: URL_, title: TITLE } }));
      });
      ext.ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "extension", proto: 2, session: "sess-1" }));
      await until(() => ext.frames.some((f) => f.type === "welcome"));

      const client = await open();
      client.ws.send(JSON.stringify({ type: "hello", token: TOKEN, role: "client", name: "sentinel-client", proto: 2 }));
      await until(() => client.frames.some((f) => f.type === "welcome"));
      let seq = 0;
      const call = async (method: string, params?: Record<string, unknown>) => {
        const id = `c${++seq}`;
        client.ws.send(JSON.stringify({ id, method, params }));
        await until(() => client.frames.some((f) => f.id === id));
        return client.frames.find((f) => f.id === id)!;
      };

      const listed = (await call("listTabs")).result as { tabs: Array<{ tab: string }> };
      const t1 = listed.tabs[0]!.tab;
      await call("tabs.claim", { tab: t1 });
      await call("snapshot", { tab: t1 });
      await call("daemon.status");

      // The safety relay: a state with an extra key carrying a pattern, a malformed one, a change.
      ext.ws.send(JSON.stringify({ event: "safetyState", params: { armed: true, evaluate: true, blockedCount: 3, patterns: [PATTERN] } }));
      ext.ws.send(JSON.stringify({ event: "safetyState", params: { armed: "yes", url: URL_ } }));
      await until(() => client.frames.some((f) => f.event === "safetyStatus"));
      rows = [{ id: 1, windowId: 1, active: true, current: true, hidden: "disarmed" }, { id: 2, windowId: 1, active: false, hidden: "disarmed" }];
      ext.ws.send(JSON.stringify({ event: "safetyState", params: { armed: false, evaluate: true, blockedCount: 3 } }));
      await until(() => client.frames.filter((f) => f.event === "safetyStatus").length >= 2);
      ext.ws.send(JSON.stringify({ event: "tabCreated", params: { tabId: 5, url: URL_ } }));
      ext.ws.send(JSON.stringify({ event: "tabRemoved", params: { tabId: 1, lastUrl: URL_, lastTitle: TITLE } }));
      await new Promise((r) => setTimeout(r, 80));
      await call("daemon.status");

      // The capture is live: the daemon logged its safety lines.
      expect(daemonLog.some((l) => l.startsWith("safety state: armed=true evaluate=true blocked=3"))).toBe(true);
      expect(daemonLog).toContain("safety state: malformed event dropped");
      expectClean(daemonLog);
      expectClean(captured);
    } finally {
      for (const ws of sockets) ws.terminate();
      await host.close();
    }
  });
});
