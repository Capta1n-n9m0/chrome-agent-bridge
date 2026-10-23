// Tests for recipes/s6-rules.ts — the pass rules of the S6 rows that recipes/s6.ts and
// recipes/sdk-login.ts print (docs/e2e-test-plan.md §4.19), dry-run on known-good and known-bad inputs
// before the wave (LESSONS: "pre-registered checks can be wrong themselves").
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  describeEvent,
  s6Url,
  sdk1Verdict,
  sdk2Verdict,
  sdk3Verdict,
  sdk4Verdict,
  sdk5Verdict,
  SDK1_STATUS,
  SDK2_CANDIDATES,
  SDK3_MATCHES,
  sm0Verdict,
  sm1LogVerdict,
  sm1Verdict,
  staleVerdict,
  rep0Verdict,
  visibleIn,
  REP0_HUMAN_COLOUR,
  REP0_PROBE_COLOUR,
  REP0_SLACK_MS,
  type Rep0Input,
  type VisLog,
} from "../s6-rules.js";
import { COLOURS } from "../t5-lib.js";
import { describeBar, hueName } from "../t5-png.js";

const REPO = "C:\\Users\\me\\Projects\\chrome-remote-extention";
const SHOT = "C:\\Users\\me\\.chrome-agent-bridge\\failures\\2026-10-23T12-00-00-000Z-T70.png";

describe("s6Url", () => {
  it("is the fixture with an s6 marker", () => {
    expect(s6Url("sdk1")).toBe("http://localhost:8080/e2e-playground.html?s6=sdk1");
  });
});

describe("staleVerdict", () => {
  it("NEW BUILD when locate answers a ref for Sign in", () => {
    expect(staleVerdict({ ok: true, result: { ref: "e5", role: "button", name: "Sign in" } }).verdict).toBe("NEW BUILD");
  });
  it("STALE on the FE-era extension's unknown method", () => {
    expect(staleVerdict({ ok: false, code: "UNKNOWN_METHOD", message: "unknown method: locate" }).verdict).toBe("STALE");
  });
  it("STALE on a daemon VERSION refusal", () => {
    expect(staleVerdict({ ok: false, code: "VERSION", message: "the Chrome extension is an older build — reload it" }).verdict).toBe("STALE");
  });
  it("UNEXPECTED otherwise (a wrong element, another error)", () => {
    expect(staleVerdict({ ok: true, result: { ref: "e5", role: "button", name: "Sign up" } }).verdict).toBe("UNEXPECTED");
    expect(staleVerdict({ ok: false, code: "TIMEOUT", message: "x" }).verdict).toBe("UNEXPECTED");
  });
});

describe("sdk1Verdict", () => {
  it("passes on the Sign in button and the submitted status", () => {
    expect(sdk1Verdict({ located: { role: "button", name: "Sign in" }, status: SDK1_STATUS }).pass).toBe(true);
  });
  it("fails on another element or status", () => {
    expect(sdk1Verdict({ located: { role: "button", name: "Sign in" }, status: "status: idle" }).pass).toBe(false);
    expect(sdk1Verdict({ located: { role: "link", name: "Sign in" }, status: SDK1_STATUS }).pass).toBe(false);
  });
});

function sdk2Report(candidates = SDK2_CANDIDATES, shot = SHOT): string {
  return [
    `LOCATOR_NOT_FOUND: no button named "Sgin in". Nearest: ${candidates.join(", ")}.`,
    "Nearest candidates:",
    ...candidates.map((c, i) => `  - ${c} [ref=e${i + 1}]`),
    "Refs: this snapshot renumbered the tab's refs — refs from before the failure are void; use the refs shown.",
    "url: http://localhost:8080/e2e-playground.html?s6=sdk2   title: \"Agent Bridge E2E Playground\"",
    '- button "Sign in" [ref=e5]',
    `Screenshot: ${shot}`,
    "Network: no failed requests among the tab's last 1 entry.",
  ].join("\n");
}

describe("sdk2Verdict", () => {
  const base = {
    code: "LOCATOR_NOT_FOUND",
    message: `no button named "Sgin in". Nearest: ${SDK2_CANDIDATES.join(", ")}.`,
    candidates: SDK2_CANDIDATES,
    screenshotPath: SHOT,
    screenshotExists: true,
    attachErrors: [] as string[],
    report: sdk2Report(),
    repoRoot: REPO,
  };
  it("passes on the pre-registered report", () => {
    const v = sdk2Verdict(base);
    expect(v.pass).toBe(true);
    expect(v.findings).toEqual([]);
  });
  it("a different tail of candidates is a finding, not a FAIL (STOP rules: continues anyway)", () => {
    const other = ['button "Sign in"', 'button "Hover me"'];
    const v = sdk2Verdict({ ...base, candidates: other, report: sdk2Report(other) });
    expect(v.pass).toBe(true);
    expect(v.findings.length).toBe(1);
  });
  it("fails when Sign in is not the first candidate", () => {
    const other = ['button "Hover me"', 'button "Sign in"'];
    expect(sdk2Verdict({ ...base, candidates: other, report: sdk2Report(other) }).pass).toBe(false);
  });
  it("fails without a screenshot, with a screenshot inside the repo, or with attach errors", () => {
    expect(sdk2Verdict({ ...base, screenshotPath: undefined }).pass).toBe(false);
    expect(sdk2Verdict({ ...base, screenshotExists: false }).pass).toBe(false);
    const inside = `${REPO}\\failures\\x.png`;
    expect(sdk2Verdict({ ...base, screenshotPath: inside, report: sdk2Report(SDK2_CANDIDATES, inside) }).pass).toBe(false);
    expect(sdk2Verdict({ ...base, attachErrors: ["screenshot: not attached within 5 s"] }).pass).toBe(false);
  });
  it("fails when the report lacks the snapshot window or is over 60 lines", () => {
    expect(sdk2Verdict({ ...base, report: sdk2Report().replace('- button "Sign in" [ref=e5]', "") }).pass).toBe(false);
    expect(sdk2Verdict({ ...base, report: sdk2Report() + "\nx".repeat(60) }).pass).toBe(false);
  });
  it("fails on another code", () => {
    expect(sdk2Verdict({ ...base, code: "TIMEOUT" }).pass).toBe(false);
  });
});

describe("sdk3Verdict", () => {
  const base = {
    code: "LOCATOR_AMBIGUOUS",
    message: '7 elements match button named "Fetch"; pass nth (0-based) to pick one, or narrow the locator.',
    matches: SDK3_MATCHES,
    report: "LOCATOR_AMBIGUOUS: …\nMatches (7):\n" + SDK3_MATCHES.map((m) => `  - ${JSON.stringify(m)}`).join("\n"),
    nth1: { role: "button", name: "Fetch 404" },
    clickStatus: "status: fetch ok.json -> 200",
  };
  it("passes on the pre-registered texts", () => {
    expect(sdk3Verdict(base).pass).toBe(true);
  });
  it("fails on a wrong count, a wrong nth pick or a wrong click", () => {
    expect(sdk3Verdict({ ...base, matches: SDK3_MATCHES.slice(1) }).pass).toBe(false);
    expect(sdk3Verdict({ ...base, nth1: { role: "button", name: "Fetch JSON" } }).pass).toBe(false);
    expect(sdk3Verdict({ ...base, clickStatus: "status: fetch nope -> 404" }).pass).toBe(false);
    expect(sdk3Verdict({ ...base, report: "LOCATOR_AMBIGUOUS: x" }).pass).toBe(false);
  });
});

describe("sdk4Verdict", () => {
  it("passes: visible 1.2–5 s after the click, hidden at once", () => {
    expect(sdk4Verdict({ visibleMs: 1530, hiddenMs: 40 }).pass).toBe(true);
  });
  it("fails when the text was already there, too late, or hidden slowly", () => {
    expect(sdk4Verdict({ visibleMs: 200, hiddenMs: 40 }).pass).toBe(false);
    expect(sdk4Verdict({ visibleMs: 5200, hiddenMs: 40 }).pass).toBe(false);
    expect(sdk4Verdict({ visibleMs: 1500, hiddenMs: 1500 }).pass).toBe(false);
  });
});

describe("sdk5Verdict", () => {
  const ok = { ref: "e19", status: "status: hit at 120,88 exp 400,900 on=email (isTrusted=true)", activeId: "email", marks: 0 };
  it("passes on a trusted hit on #email, focus there, no mark left", () => {
    expect(sdk5Verdict(ok).pass).toBe(true);
  });
  it("fails on a synthetic event, another target, a left mark or a bad ref", () => {
    expect(sdk5Verdict({ ...ok, status: "status: hit at 1,1 exp 1,1 on=email (isTrusted=false)" }).pass).toBe(false);
    expect(sdk5Verdict({ ...ok, status: "status: hit at 1,1 exp 1,1 on=HTML (isTrusted=true)" }).pass).toBe(false);
    expect(sdk5Verdict({ ...ok, status: "status: idle" }).pass).toBe(false);
    expect(sdk5Verdict({ ...ok, marks: 1 }).pass).toBe(false);
    expect(sdk5Verdict({ ...ok, activeId: "password" }).pass).toBe(false);
    expect(sdk5Verdict({ ...ok, ref: "x" }).pass).toBe(false);
  });
});

describe("sm0Verdict", () => {
  const base = {
    tab: "T70",
    name: "s6-sm0",
    events: [
      { event: "extensionStatus", params: { connected: false } },
      { event: "extensionStatus", params: { connected: true } },
    ],
    snapshotAfter: { ok: true as const, elements: 40 },
    owner: "s6-sm0",
  };
  it("passes: the reload happened during the hold, no tabGone, the handle still answers and is still ours", () => {
    expect(sm0Verdict(base).pass).toBe(true);
  });
  it("is not measured when no reload was seen", () => {
    const v = sm0Verdict({ ...base, events: [] });
    expect(v.pass).toBe(false);
    expect(v.notMeasured).toBe(true);
  });
  it("fails on a tabGone for the held tab, a failed snapshot or a lost lease", () => {
    expect(sm0Verdict({ ...base, events: [...base.events, { event: "tabGone", params: { tab: "T70" } }] }).pass).toBe(false);
    expect(sm0Verdict({ ...base, snapshotAfter: { ok: false, error: "TAB_GONE: …" } }).pass).toBe(false);
    expect(sm0Verdict({ ...base, owner: undefined }).pass).toBe(false);
  });
});

// ── SM-1 (added 2026-10-23 by the S6 fixer, round 1, on the user's restart grant #96) ─────────────────
describe("sm1Verdict", () => {
  const URL_A = "http://localhost:8080/e2e-playground.html?t5=sm1";
  const base = {
    tab: "T120",
    name: "s6-sm1",
    preHandles: ["T118", "T119", "T120"],
    fixtureUrl: URL_A,
    events: [
      { event: "extensionStatus", params: { connected: false } },
      { event: "extensionStatus", params: { connected: true } },
      { event: "tabGone", params: { tab: "T120", lastUrl: URL_A, lastTitle: "Agent Bridge E2E Playground" } },
    ],
    snapshotAfter: { ok: false as const, code: "TAB_GONE", message: "tab T120 is gone" },
    listAfter: [{ tab: "T128" }, { tab: "T129" }, { tab: "T130" }],
    uptimeBeforeMs: 600_000,
    uptimeAfterMs: 700_100,
    elapsedMs: 100_000,
    reconnected: false,
  };
  it("passes on the pre-registered outcome", () => {
    const v = sm1Verdict(base);
    expect(v.why).toEqual([]);
    expect(v.pass).toBe(true);
  });
  it("is not measured when the extension did not go and come back", () => {
    const v = sm1Verdict({ ...base, events: [base.events[2]!] });
    expect(v.notMeasured).toBe(true);
    expect(sm1Verdict({ ...base, events: [base.events[0]!] }).notMeasured).toBe(true);
  });
  it("fails without exactly one tabGone for the held tab, or with another lastUrl", () => {
    expect(sm1Verdict({ ...base, events: base.events.slice(0, 2) }).pass).toBe(false);
    expect(sm1Verdict({ ...base, events: [...base.events, base.events[2]!] }).pass).toBe(false);
    const other = { event: "tabGone", params: { tab: "T120", lastUrl: "http://localhost:8080/e2e-playground.html?t5=other" } };
    expect(sm1Verdict({ ...base, events: [...base.events.slice(0, 2), other] }).pass).toBe(false);
    const noUrl = { event: "tabGone", params: { tab: "T120" } };
    expect(sm1Verdict({ ...base, events: [...base.events.slice(0, 2), noUrl] }).pass).toBe(false);
  });
  it("a tabGone for another handle does not count", () => {
    const v = sm1Verdict({ ...base, events: [...base.events, { event: "tabGone", params: { tab: "T118" } }] });
    expect(v.pass).toBe(true);
  });
  it("FAILS on any live T<a> after the restart: a snapshot that answers, or T<a> listed", () => {
    expect(sm1Verdict({ ...base, snapshotAfter: { ok: true } }).pass).toBe(false);
    expect(sm1Verdict({ ...base, listAfter: [...base.listAfter, { tab: "T120" }] }).pass).toBe(false);
  });
  it("fails on another snapshot error than TAB_GONE", () => {
    expect(sm1Verdict({ ...base, snapshotAfter: { ok: false, code: "TAB_UNKNOWN", message: "x" } }).pass).toBe(false);
  });
  it("fails when a tab is still owned by the recipe, or a handle is not above every pre-restart handle", () => {
    expect(sm1Verdict({ ...base, listAfter: [{ tab: "T130", owner: "s6-sm1" }] }).pass).toBe(false);
    expect(sm1Verdict({ ...base, listAfter: [{ tab: "T119" }, { tab: "T130" }] }).pass).toBe(false);
    expect(sm1Verdict({ ...base, listAfter: [{ tab: "T120x" }] }).pass).toBe(false);
  });
  it("fails when the daemon changed (a reconnect, or an uptime that restarted)", () => {
    expect(sm1Verdict({ ...base, reconnected: true }).pass).toBe(false);
    expect(sm1Verdict({ ...base, uptimeAfterMs: 5_000 }).pass).toBe(false);
  });
});

describe("sm1LogVerdict (daemon.log lines from the quit on)", () => {
  const since = "2026-10-23T15:00:00.000Z";
  const good = [
    "2026-10-23T14:59:58Z client + \"s6-sm1\" (1 client)",
    "2026-10-23T15:00:40Z extension session changed: 4 handles retired",
    "2026-10-23T15:00:40Z extension resync: 3 tabs, 0 gone",
  ];
  it("passes: exactly one session-changed line, n ≥ 1, nothing else on it, a resync within 30 s", () => {
    const v = sm1LogVerdict(good, since);
    expect(v.why).toEqual([]);
    expect(v.pass).toBe(true);
  });
  it("lines before the quit are ignored", () => {
    expect(sm1LogVerdict(["2026-10-23T14:00:00Z extension session changed: 9 handles retired", ...good], since).pass).toBe(true);
  });
  it("fails on none, two, n = 0, a marker value on the line, or no resync within 30 s", () => {
    expect(sm1LogVerdict([good[0]!, good[2]!], since).pass).toBe(false);
    expect(sm1LogVerdict([...good, "2026-10-23T15:01:00Z extension session changed: 1 handles retired"], since).pass).toBe(false);
    expect(sm1LogVerdict([good[0]!, "2026-10-23T15:00:40Z extension session changed: 0 handles retired", good[2]!], since).pass).toBe(false);
    expect(sm1LogVerdict([good[0]!, "2026-10-23T15:00:40Z extension session changed: 4 handles retired (marker 1a2b)", good[2]!], since).pass).toBe(false);
    expect(sm1LogVerdict([good[0]!, good[1]!, "2026-10-23T15:01:20Z extension resync: 3 tabs, 0 gone"], since).pass).toBe(false);
    expect(sm1LogVerdict([good[0]!, good[1]!], since).pass).toBe(false);
  });
  it("refuses a bad since", () => {
    expect(() => sm1LogVerdict(good, "yesterday")).toThrow();
  });
});

describe("describeEvent", () => {
  it("prints fixture URLs and withholds others", () => {
    expect(describeEvent({ event: "tabGone", params: { tab: "T1", lastUrl: "http://localhost:8080/e2e-playground.html?s6=sm0", lastTitle: "Agent Bridge E2E Playground" } })).toBe(
      'tabGone {"tab":"T1","lastUrl":"http://localhost:8080/e2e-playground.html?s6=sm0","lastTitle":"Agent Bridge E2E Playground"}',
    );
    const line = describeEvent({ event: "tabCreated", params: { tab: "T2", url: "https://mail.example.com/x?token=1", title: "Inbox" } });
    expect(line).not.toContain("mail.example.com");
    expect(line).not.toContain("Inbox");
    expect(line).toContain("<non-fixture url withheld>");
  });
});

// ── REP-0 (added 2026-10-23, S6 resume, #97; written before its run) ─────────────────────────────
describe("rep0Verdict (the failure-report screenshot probe)", () => {
  const T0 = 1_000_000;
  const hiddenStart = (t: number): VisLog => [["hidden", t - 400, "start"]];
  /** The probe tab: hidden at install, visible +60 ms into the call, hidden again +170 ms. */
  const switched = (t0: number): VisLog => [...hiddenStart(t0), ["visible", t0 + 60, "change"], ["hidden", t0 + 170, "change"]];
  const good = (): Rep0Input => ({
    report: {
      t0: T0,
      t1: T0 + 190,
      code: "LOCATOR_NOT_FOUND",
      screenshotPath: "C:\\Users\\me\\AppData\\Local\\Temp\\bridge-e2e\\s6-run2\\rep0-failures-1\\x-T9.png",
      attachErrors: [],
      probeVis: switched(T0),
      pngColour: "magenta",
    },
    control: { t0: T0 + 5000, t1: T0 + 6600, probeVis: switched(T0 + 5000), pngColour: "magenta" },
    human: { pngColour: "blue" },
  });

  it("PASS on known-good input: the probe went visible inside the call and the PNG is magenta", () => {
    const v = rep0Verdict(good());
    expect(v.why).toEqual([]);
    expect(v.result).toBe("PASS");
  });
  it("PASS within the 50 ms clock slack on either side of the call", () => {
    const i = good();
    i.report.probeVis = [...hiddenStart(T0), ["visible", T0 - REP0_SLACK_MS, "change"]];
    expect(rep0Verdict(i).result).toBe("PASS");
    i.report.probeVis = [...hiddenStart(T0), ["visible", i.report.t1 + REP0_SLACK_MS, "change"]];
    expect(rep0Verdict(i).result).toBe("PASS");
  });
  it("FAIL when the probe tab never went visible (the capture did not switch)", () => {
    const i = good();
    i.report.probeVis = hiddenStart(T0);
    const v = rep0Verdict(i);
    expect(v.result).toBe("FAIL");
    expect(v.why.join(" ")).toMatch(/did not switch/);
  });
  it("FAIL when the only visible change is outside the call window", () => {
    const i = good();
    i.report.probeVis = [...hiddenStart(T0), ["visible", T0 - 200, "change"]];
    expect(rep0Verdict(i).result).toBe("FAIL");
    i.report.probeVis = [...hiddenStart(T0), ["visible", i.report.t1 + 400, "change"]];
    expect(rep0Verdict(i).result).toBe("FAIL");
  });
  it("a 'start' entry that reads visible is not a switch", () => {
    const i = good();
    i.report.probeVis = [["visible", T0 + 10, "start"]];
    expect(rep0Verdict(i).result).not.toBe("PASS");
  });
  it("FAIL when the report PNG shows the human's blue bar (or anything but magenta)", () => {
    const i = good();
    i.report.pngColour = "blue";
    const v = rep0Verdict(i);
    expect(v.result).toBe("FAIL");
    expect(v.why.join(" ")).toMatch(/blue.*human/);
    for (const c of ["mixed", "other", "unreadable"]) {
      const j = good();
      j.report.pngColour = c;
      expect(rep0Verdict(j).result).toBe("FAIL");
    }
  });
  it("FAIL on a missing screenshot: no path, a screenshot attach error, or an unread PNG", () => {
    const a = good();
    delete a.report.screenshotPath;
    a.report.pngColour = undefined;
    expect(rep0Verdict(a).result).toBe("FAIL");
    expect(rep0Verdict(a).why.join(" ")).toMatch(/no screenshot/);
    const b = good();
    b.report.attachErrors = ["screenshot: not attached within 5 s"];
    expect(rep0Verdict(b).result).toBe("FAIL");
    expect(rep0Verdict(b).why.join(" ")).toMatch(/screenshot: not attached/);
    const c = good();
    c.report.pngColour = undefined;
    expect(rep0Verdict(c).result).toBe("FAIL");
  });
  it("a non-screenshot attach error alone does not decide", () => {
    const i = good();
    i.report.attachErrors = ["network: not attached within 5 s"];
    expect(rep0Verdict(i).result).toBe("PASS");
  });
  it("FAIL when the trigger was not LOCATOR_NOT_FOUND", () => {
    const i = good();
    i.report.code = "TAB_HELD";
    expect(rep0Verdict(i).result).toBe("FAIL");
  });
  it("NOT DISCRIMINATING when the switch control did not switch, or its PNG is not magenta, or it failed", () => {
    const a = good();
    a.control.probeVis = hiddenStart(a.control.t0);
    expect(rep0Verdict(a).result).toBe("NOT DISCRIMINATING");
    const b = good();
    b.control.pngColour = "blue";
    expect(rep0Verdict(b).result).toBe("NOT DISCRIMINATING");
    const c = good();
    c.control.error = "TIMEOUT: x";
    c.control.pngColour = undefined;
    expect(rep0Verdict(c).result).toBe("NOT DISCRIMINATING");
  });
  it("NOT DISCRIMINATING when the human tab does not read blue (the hue rule does not tell the tabs apart)", () => {
    for (const c of ["magenta", "cyan", "other", undefined]) {
      const i = good();
      i.human.pngColour = c;
      expect(rep0Verdict(i).result).toBe("NOT DISCRIMINATING");
    }
  });
  it("NOT DISCRIMINATING when the probe was not hidden before the call", () => {
    const i = good();
    i.report.probeVis = [["visible", T0 - 400, "start"], ["visible", T0 + 60, "change"]];
    expect(rep0Verdict(i).result).toBe("NOT DISCRIMINATING");
  });
  it("a failing control outranks a failing probe, and the probe's reasons are still listed", () => {
    const i = good();
    i.report.pngColour = "blue";
    i.human.pngColour = "other";
    const v = rep0Verdict(i);
    expect(v.result).toBe("NOT DISCRIMINATING");
    expect(v.why.join(" ")).toMatch(/also/);
  });
  it("visibleIn finds the first visible change inside [t0 − slack, t1 + slack]", () => {
    const log: VisLog = [["hidden", 0, "start"], ["visible", 50, "change"], ["hidden", 90, "change"], ["visible", 300, "change"]];
    expect(visibleIn(log, 200, 400)).toBe(300);
    expect(visibleIn(log, 120, 140)).toBeUndefined(); // [70, 190]: the change at 50 is outside
    expect(visibleIn(log, 100, 120)).toBe(50); // [50, 170]: inside by the slack
  });
});

// ── REP-0's colours through a colour-managed capture (added 2026-10-23, S6 fixer 2, verifier r2 MAJOR-1) ──
/** A solid-colour 8-bit RGB PNG (CRCs left 0: decodePng does not check them). */
function solidPng(hex: string, width = 1920, height = 60): Buffer {
  const n = parseInt(hex.slice(1), 16);
  const px = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set(px, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * What Run 9's default-mode (`captureVisibleTab`) captures read for the T5 bars, measured off the label:
 * docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T5-run9-record.md:72 (magenta → #dd00fa) and :84-86
 * (red → #d92424, lime → #8fff3d, blue → #3300f8). Cyan was never captured in default mode; through CDP it
 * read #97fdfd (R9-SCREEN-2), and default captures lift R on green-bearing colours the same way (lime).
 */
const DEFAULT_CAPTURE_READING: Record<string, string> = {
  magenta: "#dd00fa",
  red: "#d92424",
  lime: "#8fff3d",
  blue: "#3300f8",
};

describe("REP-0's bar colours under the hue rule (colour-managed captures)", () => {
  it("the human tab's colour is blue and differs from the probe's magenta", () => {
    expect(REP0_HUMAN_COLOUR).toBe("blue");
    expect(REP0_PROBE_COLOUR).toBe("magenta");
  });
  it("both REP-0 colours, as Run 9's default captures read them, still read their own names", () => {
    for (const name of [REP0_PROBE_COLOUR, REP0_HUMAN_COLOUR]) {
      const measured = DEFAULT_CAPTURE_READING[name];
      expect(measured, `no default-capture reading of ${name}`).toBeDefined();
      expect(hueName(measured)).toBe(name);
      expect(describeBar(solidPng(measured)).name).toBe(name);
    }
    expect(describeBar(solidPng("#dd00fa")).name).toBe("magenta");
    expect(describeBar(solidPng("#3300f8")).name).toBe("blue");
  });
  it("the painted colours (t5-lib COLOURS) read their own names too", () => {
    for (const name of [REP0_PROBE_COLOUR, REP0_HUMAN_COLOUR]) expect(describeBar(solidPng(COLOURS[name])).name).toBe(name);
  });
  it("why not cyan: the colour-managed cyan reading #97fdfd falls outside the hue rule", () => {
    expect(hueName("#97fdfd")).toBe("other");
  });
});
