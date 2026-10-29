// Step 12 S7-helpers-b: line forms (14)-(20) and (25) of docs/e2e-test-plan.md section 4.27 part B, and the pure parts of the DEVPROBE
// (the attach judgment, the poll loop over an injected call and clock). Each form's keys and their order are compared with the sheet's own
// paragraph "Line forms (part B)", parsed at test time (the S7-helpers-a method). No Chrome, daemon or port.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as B from "../s12-forms-b.js";
import { K } from "../s11-rules.js";
import type { ConEntry } from "../s12-forms.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8").replace(/\r\n/g, "\n");
const SEC = DOC.slice(DOC.indexOf("### 4.27 R19 rows"));
const PARA = (() => { const i = SEC.indexOf("**Line forms (part B).**"); return SEC.slice(i, SEC.indexOf("\n", i)); })();

/** The first backticked template of item n of part B's "New in part B" list. */
function template(n: number): string {
  const body = PARA.slice(PARA.indexOf("**New in part B**"));
  const at = [...body.matchAll(/\((\d{1,2})\) `/g)].map((m) => ({ n: Number(m[1]), i: m.index! }));
  const k = at.findIndex((a) => a.n === n);
  const item = body.slice(at[k]!.i, at[k + 1]?.i ?? body.length);
  return /`([A-Z][A-Z0-9]+ [^`]*=[^`]*)`/.exec(item)![1]!.replace("<helper's name>", "<name>");
}
/** A token of the template as a regexp: `<n>`-like placeholders are counts, `<a|b>` alternatives (CODE = an upper-case code), `<row>`/`<name>` one word. */
function tokRe(tok: string): RegExp {
  let t = tok.replace(/<[a-z]\d?(?:[≥≤]\d+)?>/g, "\u0001").replace(/<(?:name|row)>/g, "\u0002");
  t = t.replace(/<([^<>]*)>/g, (_m, g: string) => `\u0003${g.split("|").join("\u0004")}\u0005`);
  t = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/CODE/g, "[A-Z][A-Z_]*");
  t = t.replace(/\u0001/g, "\\d+").replace(/\u0002/g, "\\S+").replace(/\u0003/g, "(?:").replace(/\u0004/g, "|").replace(/\u0005/g, ")");
  return new RegExp(`^${t}$`);
}
function matches(tpl: string, line: string): boolean {
  const t = tpl.split(" ");
  const o = line.split(" ");
  return t.length === o.length && t.every((tt, i) => tokRe(tt).test(o[i]!));
}
const ok = (n: number, line: string): void => { expect(matches(template(n), line), `${line} vs ${template(n)}`).toBe(true); };
const bad = (n: number, line: string): void => { expect(matches(template(n), line), `${line} should not match ${template(n)}`).toBe(false); };

const E = (kind: "console" | "exception", text: string, ts: number): ConEntry => ({ level: "info", kind, text, ts });
const clock = (): B.Clock & { t: number } => { const c = { t: 0, now: () => c.t, sleep: async (ms: number) => { c.t += ms; } }; return c; };

describe("the sheet's forms (14)-(20) and (25) are found by the parser", () => {
  it("each item has a template whose first word is the form's name", () => {
    const names: Record<number, string> = { 14: "DEVPROBE", 15: "KEEPSEQ", 16: "KEEPEND", 17: "CONKEPT", 18: "SWEEPHELD", 19: "KEEPDT", 20: "OVERLAP", 25: "CONCAP" };
    for (const [n, w] of Object.entries(names)) expect(template(Number(n)).split(" ")[0], `item ${n}`).toBe(w);
  });
  it("the matcher rejects a swapped key, a missing key and a code where a count belongs", () => {
    bad(17, "CONKEPT second=11 first=11 equal=yes ordered=yes");
    bad(17, "CONKEPT first=11 second=11 equal=yes");
    bad(17, "CONKEPT first=x second=11 equal=yes ordered=yes");
  });
});

describe("DEVPROBE (14): attached comes only from the control's answer code", () => {
  it("attachedFrom is yes for DEBUGGER_DEVTOOLS and for nothing else", () => {
    expect(B.attachedFrom("DEBUGGER_DEVTOOLS")).toBe(true);
    for (const c of ["ok", "DEBUGGER_BUSY", "TIMEOUT", "debugger_devtools", "", "DEBUGGER_DEVTOOLS "]) expect(B.attachedFrom(c), c).toBe(false);
    expect(B.attachedFrom(K["K-devt"].code)).toBe(true);
  });
  it("the line matches the form for both outcomes and every answer kind", () => {
    ok(14, B.devprobeLine("uia-menu", { answer: "DEBUGGER_DEVTOOLS", ms: 640, attached: true }));
    ok(14, B.devprobeLine("uia-menu", { answer: "ok", ms: 15000, attached: false }));
    ok(14, B.devprobeLine("uia-menu", { answer: "TIMEOUT", ms: 15012, attached: false }));
  });
  it("devprobeLine re-derives attached from the answer: a result claiming attached on an ok answer prints no", () => {
    expect(B.devprobeLine("m", { answer: "ok", ms: 1, attached: true })).toBe("DEVPROBE method=m answer=ok ms=1 attached=no");
    expect(B.devprobeLine("m", { answer: "DEBUGGER_DEVTOOLS", ms: 1, attached: false })).toBe("DEVPROBE method=m answer=DEBUGGER_DEVTOOLS ms=1 attached=yes");
  });
  it("a method name that is not a plain word is refused (the line prints no free text)", () => {
    expect(() => B.devprobeLine("has space", { answer: "ok", ms: 1, attached: false })).toThrow();
    expect(() => B.devprobeLine("http://x", { answer: "ok", ms: 1, attached: false })).toThrow();
  });
  it("the poll stops at the first K-devt, with the time of that answer", async () => {
    const c = clock(); let n = 0;
    const r = await B.pollUntilDevtools(async () => { n++; c.t += 100; return n < 4 ? "ok" : "DEBUGGER_DEVTOOLS"; }, c, { gapMs: 200 });
    expect(r).toEqual({ answer: "DEBUGGER_DEVTOOLS", ms: 3 * 300 + 100, attached: true });
    expect(n).toBe(4);
  });
  it("without K-devt it runs to the 15 000 ms deadline and no further, last answer kept, attached=no", async () => {
    const c = clock(); let n = 0;
    const r = await B.pollUntilDevtools(async () => { n++; c.t += 50; return "ok"; }, c, { gapMs: 450 });
    expect(r.attached).toBe(false);
    expect(r.answer).toBe("ok");
    expect(r.ms).toBeGreaterThanOrEqual(15_000);
    expect(r.ms).toBeLessThan(15_000 + 500);
    expect(n).toBeGreaterThan(20);
  });
  it("a call that throws counts as an answer of the code ERROR, never as attached", async () => {
    const c = clock();
    const r = await B.pollUntilDevtools(async () => { c.t += 10; throw new Error("boom"); }, c, { deadlineMs: 100, gapMs: 20 });
    expect(r.answer).toBe("ERROR");
    expect(r.attached).toBe(false);
  });
  it("a UIA 'DevTools is open' signal from the opener cannot make attached yes", async () => {
    const c = clock(); const log: string[] = [];
    const out = await B.devprobe({
      method: "uia-menu", clock: c, deadlineMs: 1000, gapMs: 100,
      open: async () => { log.push("open"); return { uiShowsDevtools: true, how: "pane", success: true }; },
      close: async () => { log.push("close"); },
      call: async () => { c.t += 5; return "ok"; },
    });
    expect(out.line).toMatch(/ attached=no$/);
    expect(out.result.attached).toBe(false);
    expect(log).toEqual(["open", "close"]);
  });
  it("an opener that fails still polls, still closes, and a K-devt answer still decides", async () => {
    const c = clock(); const log: string[] = [];
    const out = await B.devprobe({
      method: "uia-menu", clock: c, gapMs: 50,
      open: async () => { log.push("open"); throw new Error("no menu"); },
      close: async () => { log.push("close"); },
      call: async () => { c.t += 5; return "DEBUGGER_DEVTOOLS"; },
    });
    expect(out.openError).toBe(true);
    expect(out.result.attached).toBe(true);
    expect(log).toEqual(["open", "close"]);
  });
  it("close runs when the poll throws; a close that throws is reported, not swallowed", async () => {
    const c = clock(); const log: string[] = [];
    const base = { method: "m", clock: c, open: async () => {}, call: async () => "ok" };
    await expect(B.devprobe({ ...base, close: async () => { log.push("close"); }, pollOverride: async () => { throw new Error("x"); } })).rejects.toThrow();
    expect(log).toEqual(["close"]);
    const out = await B.devprobe({ ...base, deadlineMs: 10, gapMs: 5, close: async () => { throw new Error("stuck"); } });
    expect(out.closeError).toBe(true);
  });
});

describe("KEEPSEQ (15), KEEPEND (16) and the banner timeline", () => {
  const reads = (s: string) => B.parseTimeline(s);
  it("parseTimeline reads t:flag pairs and refuses junk", () => {
    expect(reads("0:1,200:1,400:0")).toEqual([{ t: 0, seen: true }, { t: 200, seen: true }, { t: 400, seen: false }]);
    expect(() => reads("0:2")).toThrow();
    expect(() => reads("a:1")).toThrow();
    expect(reads("")).toEqual([]);
  });
  it("bannerSpan: continuous when every read in the window saw it, gaps:<runs of none> otherwise", () => {
    const r = reads("0:1,100:1,200:0,300:1,400:0,500:0,600:1,900:0");
    expect(B.bannerSpan(r, 0, 100)).toBe("continuous");
    expect(B.bannerSpan(r, 0, 600)).toBe("gaps:2");
    expect(B.bannerSpan(r, 200, 200)).toBe("gaps:1");
    expect(B.bannerSpan(r, 0, 900)).toBe("gaps:3");
  });
  it("bannerSpan of an empty window is not continuous (nothing was read)", () => {
    expect(B.bannerSpan(reads("0:1"), 500, 900)).toBe("gaps:1");
  });
  it("bannerEndMs: the first none at or after the last reply, measured from it; null when none follows", () => {
    const r = reads("0:1,1000:1,1100:0,1200:1,1300:0");
    expect(B.bannerEndMs(r, 1000)).toBe(100);
    expect(B.bannerEndMs(r, 1150)).toBe(150);
    expect(B.bannerEndMs(reads("0:1,500:1"), 0)).toBeNull();
    expect(B.bannerEndMs(reads("0:1,1000:0,1100:1"), 1000)).toBe(0);
  });
  it("pollMsOf is the widest gap between reads, 0 for fewer than two", () => {
    expect(B.pollMsOf(reads("0:1,120:1,260:1,380:1"))).toBe(140);
    expect(B.pollMsOf(reads("5:1"))).toBe(0);
  });
  it("KEEPSEQ matches the form; a null end prints never (outside the form: reported as a finding)", () => {
    ok(15, B.keepseqLine("R19-KEEP-1", { calls: 5, gapMs: 3000, answersOk: 5, banner: "continuous", endMs: 4680, pollMs: 140 }));
    ok(15, B.keepseqLine("R19-KEEP-1", { calls: 5, gapMs: 3000, answersOk: 4, banner: "gaps:2", endMs: 0, pollMs: 140 }));
    expect(B.keepseqLine("R", { calls: 5, gapMs: 3000, answersOk: 5, banner: "continuous", endMs: null, pollMs: 1 })).toContain("end-ms=never");
    expect(B.keepseqLine("R19-KEEP-1", { calls: 5, gapMs: 3000, answersOk: 5, banner: "continuous", endMs: 4680, pollMs: 140 }))
      .toBe("KEEPSEQ R19-KEEP-1 calls=5 gap-ms=3000 answers=5/5 banner=continuous end-ms=4680 poll-ms=140");
  });
  it("KEEPEND matches the form for every leg and next", () => {
    const legs = ["ctl", "idle", "disarm", "block", "nav-blocked", "nav-own", "nav-file", "close", "replace"] as const;
    for (const leg of legs) ok(16, B.keependLine("R19-KEEP-3", { leg, sinceLastCallMs: 1000, endMs: 1500, next: "DISARMED" }));
    ok(16, B.keependLine("R19-KEEP-2", { leg: "idle", sinceLastCallMs: 0, endMs: 6000, next: "ok" }));
    ok(16, B.keependLine("R19-KEEP-3", { leg: "close", sinceLastCallMs: 1000, endMs: 900, next: "TAB_GONE" }));
    expect(B.keependLine("R", { leg: "idle", sinceLastCallMs: 0, endMs: null, next: "ok" })).toContain("end-ms=never");
  });
});

describe("CONKEPT (17), SWEEPHELD (18), KEEPDT (19), OVERLAP (20)", () => {
  const eleven = Array.from({ length: 11 }, (_, i) => E("console", `m${i}`, 100 + i));
  it("CONKEPT: equal by content and timestamps, ordered by timestamps; a shorter second read is equal=no", () => {
    const l = B.conkeptLine(eleven, eleven.map((e) => ({ ...e })));
    expect(l).toBe("CONKEPT first=11 second=11 equal=yes ordered=yes");
    ok(17, l);
    expect(B.conkeptLine(eleven, eleven.slice(0, 10))).toBe("CONKEPT first=11 second=10 equal=no ordered=yes");
    expect(B.conkeptLine(eleven, eleven.map((e, i) => (i === 3 ? { ...e, ts: e.ts + 1 } : e)))).toContain("equal=no");
    expect(B.conkeptLine(eleven, [...eleven].reverse())).toMatch(/equal=no ordered=no$/);
  });
  it("CONKEPT never prints an entry's text", () => {
    expect(B.conkeptLine([E("console", "SECRET", 1)], [E("console", "SECRET", 1)])).not.toContain("SECRET");
  });
  it("SWEEPHELD matches the form", () => {
    ok(18, B.sweepheldLine({ afterReload: "DEBUGGER_DEVTOOLS", devtoolsOpen: true, reclaimed: true }));
    ok(18, B.sweepheldLine({ afterReload: "ok", devtoolsOpen: false, reclaimed: false }));
    expect(B.sweepheldLine({ afterReload: "DEBUGGER_DEVTOOLS", devtoolsOpen: true, reclaimed: true })).toBe("SWEEPHELD after-reload=DEBUGGER_DEVTOOLS devtools-open=yes reclaimed=yes");
  });
  it("KEEPDT matches the form for every leg and next, including not-measured", () => {
    for (const leg of ["devtools", "cancel", "closed"] as const) for (const next of ["DEBUGGER_DEVTOOLS", "ok", "not-measured"]) ok(19, B.keepdtLine("R19-KEEP-4", leg, next));
    expect(B.keepdtLine("R19-KEEP-4", "devtools", "DEBUGGER_DEVTOOLS")).toBe("KEEPDT R19-KEEP-4 leg=devtools next=DEBUGGER_DEVTOOLS");
  });
  it("OVERLAP: exact is yes only for K-devt's code and its exact message", () => {
    const kd = K["K-devt"];
    expect(B.overlapExact({ code: kd.code, message: kd.message })).toBe(true);
    expect(B.overlapExact({ code: kd.code, message: `${kd.message} ` })).toBe(false);
    expect(B.overlapExact({ code: "TIMEOUT", message: kd.message })).toBe(false);
    expect(B.overlapExact({ code: "ok" })).toBe(false);
    ok(20, B.overlapLine("R19-KEEP-OVERLAP", { leg: "evaluate", first: "ok", second: "DEBUGGER_DEVTOOLS", exact: true }));
    ok(20, B.overlapLine("R19-KEEP-OVERLAP", { leg: "chooser", first: "TIMEOUT", second: "DEBUGGER_DEVTOOLS", exact: false }));
  });
  it("OVERLAP: the exact line, first and second in their own slots", () => {
    expect(B.overlapLine("R19-KEEP-OVERLAP", { leg: "evaluate", first: "ok", second: "DEBUGGER_DEVTOOLS", exact: true }))
      .toBe("OVERLAP R19-KEEP-OVERLAP leg=evaluate first=ok second=DEBUGGER_DEVTOOLS exact=yes");
  });
});

describe("CONCAP (25)", () => {
  const SENT = "SENT-X";
  const line = (i: number): string => `2026-10-28T10:00:00.${String(i).padStart(3, "0")}Z info s12-cap-${i}:${SENT}`.padEnd(2000, "x");
  const MARK = (n: number): string => `… [truncated: ${n} more lines, the newest — narrow with level/limit]`;
  const text = (k: number): string => `${Array.from({ length: k }, (_, i) => line(i + 1)).join("\n")}\n${MARK(200 - k)}`;
  it("counts lines, body characters before the marker, the marker, first and last index, the sentinel", () => {
    const s = B.concapStats(text(9), SENT);
    expect(s).toMatchObject({ lines: 9, bodyChars: 9 * 2000 + 8, marker: true, firstIndex: 1, lastIndex: 9, sentinel: 9, consecutive: true, moreLines: 191 });
    const l = B.concapLine(s);
    expect(l).toBe(`CONCAP lines=9 body-chars=${9 * 2000 + 8} marker=yes first-index=1 last-index=9 sentinel=9`);
    ok(25, l);
  });
  it("a text with no marker, two markers, or a marker that is not last is marker=no", () => {
    expect(B.concapStats(Array.from({ length: 3 }, (_, i) => line(i + 1)).join("\n"), SENT).marker).toBe(false);
    expect(B.concapStats(`${text(3)}\n${MARK(1)}`, SENT).marker).toBe(false);
    expect(B.concapStats(`${MARK(5)}\n${line(1)}`, SENT).marker).toBe(false);
  });
  it("a build keeping the newest lines shows first-index above 1; a gap in the indices is consecutive=false", () => {
    const newest = [`${line(192)}`, `${line(193)}`].join("\n");
    expect(B.concapStats(`${newest}\n${MARK(198)}`, SENT).firstIndex).toBe(192);
    expect(B.concapStats(`${line(1)}\n${line(3)}\n${MARK(198)}`, SENT).consecutive).toBe(false);
  });
  it("an uncapped text (200 lines, no marker) reports body-chars over 20 000", () => {
    const s = B.concapStats(Array.from({ length: 200 }, (_, i) => line(i + 1)).join("\n"), SENT);
    expect(s.bodyChars).toBeGreaterThan(20_000);
    expect(s.marker).toBe(false);
  });
  it("sentinel counts only the lines that carry it", () => {
    const t = `${line(1)}
${"2026-10-28T10:00:00.002Z info s12-cap-2:other"}
${line(3)}
${MARK(197)}`;
    expect(B.concapStats(t, SENT).sentinel).toBe(2);
    expect(B.concapStats(t, SENT).lines).toBe(3);
  });
  it("the marker is the text Run 19's formatter printed (kept as a literal, #388), and a look-alike is no marker", () => {
    // Step 13 S3b (#388): the SDK formatter now keeps the newest lines with its marker first; Run 19's helper is not
    // edited, so this leg tests it against the pre-S3b formatter's output for 30 entries of 900 characters, cap 5000.
    const rows = Array.from({ length: 5 }, (_, i) => `${new Date(1_700_000_000_000 + i).toISOString()} info ${`s12-cap-${i + 1}:${SENT}`.padEnd(900, "x")}`);
    const real = `${rows.join("\n")}\n… [truncated: 25 more lines, the newest — narrow with level/limit]`;
    const s = B.concapStats(real, SENT);
    expect(s.marker).toBe(true);
    expect(s.moreLines).toBeGreaterThan(0);
    expect(s.lines + s.moreLines).toBe(30);
    expect(B.concapStats(`${line(1)}
… [truncated: 5 more lines, foo narrow]`, SENT).marker).toBe(false);
    expect(B.concapStats(`${line(1)}
… [truncated: 5 more lines, the newest — narrow with level/limit] x`, SENT).marker).toBe(false);
    expect(B.concapStats(`${line(1)}
… [truncated: 5 more lines, foo — narrow with level/limit]`, SENT).marker).toBe(false);
  });
  it("the text itself is never part of the line", () => {
    expect(B.concapLine(B.concapStats(text(2), SENT))).not.toContain(SENT);
  });
});
