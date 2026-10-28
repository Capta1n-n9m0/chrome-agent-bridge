// Step 12 S7-helpers-a: line forms (1)-(13) of docs/e2e-test-plan.md section 4.27 part A, the #351 (4) helper pieces, and the static
// fixture checks. Every form's keys and their order are compared with the sheet's own text, parsed at test time (the doc paragraph
// "Line forms (part A)", its items (1)-(13)); a doc that changes a form fails here first. No Chrome, daemon or port.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as F from "../s12-forms.js";
import { optO2NoteLine } from "../s12-rules.js";
import { aggregateRows } from "../s11b-r17b-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (...p: string[]): string => readFileSync(join(REPO, ...p), "utf8").replace(/\r\n/g, "\n");
const DOC = read("docs", "e2e-test-plan.md");
const SEC = DOC.slice(DOC.indexOf("### 4.27 R19 rows"));
const PARA = (() => { const i = SEC.indexOf("**Line forms (part A).**"); return SEC.slice(i, SEC.indexOf("\n", i)); })();

/** The backticked templates of item n of part A's "New in part A" list; `[rerun=<k> ]` expands to both spellings. */
function templates(n: number): string[] {
  const body = PARA.slice(PARA.indexOf("**New in part A**"));
  const at = [...body.matchAll(/\((\d{1,2})\) `/g)].map((m) => ({ n: Number(m[1]), i: m.index! }));
  const k = at.findIndex((a) => a.n === n);
  const item = body.slice(at[k]!.i, at[k + 1]?.i ?? body.length);
  const out: string[] = [];
  for (const m of item.matchAll(/`([A-Z][A-Z0-9]+ [^`]*=[^`]*)`/g)) {
    const t = m[1]!;
    if (t.includes("[rerun=<k> ]")) out.push(t.replace("[rerun=<k> ]", ""), t.replace("[rerun=<k> ]", "rerun=<k> "));
    else out.push(t);
  }
  return out;
}
const NUMERIC_ALT = /^(?:[a-z]\d?|ms)(?:[≥≤]\d+)?$|^n[≥≤]\d+$/;
function altOk(alt: string, v: string): boolean {
  if (alt === v) return true;
  if (alt === "CODE") return /^[A-Z][A-Z_]*$/.test(v);
  if (alt.startsWith("keys:")) return /^keys:[\w-]+(,[\w-]+)*$/.test(v);
  return NUMERIC_ALT.test(alt) && /^\d+$/.test(v);
}
/** Same tokens, in the same order, each `key=` equal, each value one of the template's alternatives (a count, a fixed word or a CODE). */
function matches(template: string, out: string): boolean {
  const t = template.split(" ");
  const o = out.split(" ");
  if (t.length !== o.length) return false;
  return t.every((tt, i) => {
    const m = /^([A-Za-z][A-Za-z-]*)=<?(.*?)>?$/.exec(tt);
    if (tt.startsWith("<")) { const alts = tt.slice(1, -1).split("|"); return alts.length > 1 || alts[0] === "CODE" ? alts.some((a) => altOk(a, o[i]!)) : o[i] !== ""; }
    if (!m || tt.includes("<") === false) return tt === o[i];
    const [k, v] = [m[1]!, o[i]!.slice(m[1]!.length + 1)];
    return o[i]!.startsWith(`${k}=`) && m[2]!.split("|").some((a) => altOk(a, v));
  });
}
const ok = (n: number, line: string): void => { expect(templates(n).some((t) => matches(t, line)), `${line} vs ${templates(n).join(" / ")}`).toBe(true); };

const E = (level: string, kind: "console" | "exception", text: string, ts = 1): F.ConEntry => ({ level, kind, text, ts });
const SENT = "SENTINEL-X";
const ENTRIES: F.ConEntry[] = [E("info", "console", `a ${SENT}`, 1), E("warning", "console", `b ${SENT}`, 2), E("error", "exception", `Uncaught Error: c ${SENT}`, 3)];

describe("the sheet's forms (1)-(13) are found by the parser (a test that cannot find a form is itself a failure)", () => {
  it("every item 1-13 has at least one template; items 2 and 3 have two", () => {
    for (let n = 1; n <= 13; n++) expect(templates(n).length, `item ${n}`).toBeGreaterThanOrEqual(n === 1 ? 2 : 1);
    expect(templates(2).length).toBe(2);
    expect(templates(3).length).toBe(2);
  });
  it("the matcher is discriminating: a swapped or missing key, or a value outside the alternatives, does not match", () => {
    const t = templates(4)[0]!;
    expect(matches(t, "EFF R19-X before=1 after=2")).toBe(true);
    expect(matches(t, "EFF R19-X after=2 before=1")).toBe(false);
    expect(matches(t, "EFF R19-X before=1")).toBe(false);
    expect(matches(t, "EFF R19-X before=foo after=2")).toBe(false);
    expect(matches(t, "EFF R19-X before=absent after=absent")).toBe(true);
  });
  it("the matcher checks a positional alternative too: `<ok|CODE>` takes `ok` or a CODE, not `answer=ok`", () => {
    const t = templates(2)[0]!;
    expect(t).toContain("<ok|CODE>");
    expect(matches(t, "ARGS R19-X lbl ok value-equal=yes json-equal=yes")).toBe(true);
    expect(matches(t, "ARGS R19-X lbl BAD_PARAMS value-equal=yes json-equal=yes")).toBe(true);
    expect(matches(t, "ARGS R19-X lbl answer=ok value-equal=yes json-equal=yes")).toBe(false);
    expect(matches(t, "ARGS R19-X lbl some-free-text value-equal=yes json-equal=yes")).toBe(false);
  });
});

describe("each form's keys and their order equal the sheet's", () => {
  it("(1) LOADED, with and without rerun, the optional key first", () => {
    const base = { consoleMessages: "answered", entries: 11, console: 10, exception: 1, args: "answered" };
    expect(F.loadedLine(base)).toBe("LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered");
    expect(F.loadedLine({ ...base, rerun: 2 })).toBe("LOADED rerun=2 consoleMessages=answered entries=11 console=10 exception=1 args=answered");
    ok(1, F.loadedLine(base));
    ok(1, F.loadedLine({ ...base, rerun: 1 }));
    ok(1, F.loadedLine({ ...base, consoleMessages: "UNKNOWN_METHOD", entries: 0, console: 0, exception: 0, args: "VERSION" }));
  });
  it("(2) ARGS per value and the total", () => {
    ok(2, F.argsLine("R19-ARGS-1", "nested", "ok", true, false));
    ok(2, F.argsTotalLine("R19-ARGS-1", { table: 5, valueEqual: 5, jsonEqual: 5, via: "mcp" }));
    expect(F.argsTotalLine("R19-ARGS-1", { table: 5, valueEqual: 5, jsonEqual: 5, via: "sdk" })).toBe("ARGS R19-ARGS-1 total table=5 value-equal=5 json-equal=5 via=sdk");
  });
  it("(3) ARGSREF per refusal and the total; data is keys only", () => {
    const l = F.argsrefLine("nan", { code: "BAD_PARAMS", exact: true, sent: false });
    expect(l).toBe("ARGSREF nan code=BAD_PARAMS exact=yes data=none sent=0");
    ok(3, l);
    ok(3, F.argsrefLine("raw", { code: "BAD_PARAMS", exact: false, data: { scope: "all", other: SENT }, sent: true }));
    expect(F.argsrefLine("raw", { code: "X", exact: false, data: { scope: "all", other: SENT }, sent: true })).not.toContain(SENT);
    ok(3, F.argsrefTotalLine({ refusals: 11, exact: 11, dataNone: 11, sent: 2, effects: 0, control: 1 }));
  });
  it("(4) EFF prints absent for no counter", () => {
    expect(F.effLine("R19-ARGS-2", 1, 1)).toBe("EFF R19-ARGS-2 before=1 after=1");
    expect(F.effLine("R19-ARGS-2", null, null)).toBe("EFF R19-ARGS-2 before=absent after=absent");
    ok(4, F.effLine("R19-ARGS-3", 1, null));
  });
  it("(5) GLOBALS", () => {
    expect(F.globalsLine("R19-ARGS-GLOBAL", { args: false, fn: false, newOwnKeys: 0 })).toBe("GLOBALS R19-ARGS-GLOBAL args=absent fn=absent new-own-keys=0");
    ok(5, F.globalsLine("R19-ARGS-GLOBAL", { args: true, fn: true, newOwnKeys: 2 }));
  });
  it("(6) STOPCALL", () => {
    ok(6, F.stopcallLine("R19-ARGS-STOP", { answer: "TIMEOUT", ms: 1700, boundMs: 1500, usable: true, next: "exact" }));
    ok(6, F.stopcallLine("R19-ARGS-STOP", { answer: "ok", ms: 9, boundMs: 1500, usable: false, next: "other" }));
  });
  it("(7) OLD, and `forwarded` is read from the answer only", () => {
    ok(7, F.oldLine("R19-ARGS-OLD", { leg: "raw", code: "VERSION", hint: true, forwarded: "no" }));
    expect(F.forwardedFrom("raw", { ok: false })).toBe("no");
    expect(F.forwardedFrom("raw", { ok: true, value: { kind: "function" } })).toBe("yes");
    expect(F.forwardedFrom("raw", { ok: true, value: 7 })).toBe("no");
    for (const leg of ["sdk", "mcp", "ref", "file", "control"] as const) expect(F.forwardedFrom(leg, { ok: true, value: { kind: "function" } })).toBe("n/a");
    ok(7, F.oldLine("R19-ARGS-OLD", { leg: "control", code: "ok", hint: false, forwarded: "n/a" }));
  });
  it("(8) CON: counts only, every key printed, n/a where a leg does not judge, and no text", () => {
    const l = F.conLine("R19-CON-1", "all", ENTRIES, { sentinel: SENT });
    expect(l).toBe("CON R19-CON-1 all entries=3 console=2 exception=1 sentinel=3 url=0 stack=0 maxlen=" + `Uncaught Error: c ${SENT}`.length + " cut=0 uncaught-first=yes ordered=n/a newest=n/a marker=n/a");
    ok(8, l);
    ok(8, F.conLine("R19-CON-1", "limit", ENTRIES, { sentinel: SENT, ordered: true, newest: true, markers: ["a ", "zzz"] }));
    expect(l).not.toContain("Uncaught Error:");
  });
  it("(8) CON counts: url, stack, cut, uncaught-first, ordered, newest, marker", () => {
    const bad = [E("error", "exception", "Error: x", 5), E("info", "console", "see http://h/x at fn (file)", 4), E("info", "console", "a\n    at f", 6), E("info", "console", "long…", 7)];
    const l = F.conLine("R", "x", bad, { sentinel: SENT, ordered: true, markers: ["see", "long"] });
    expect(l).toMatch(/ url=1 stack=2 /);
    expect(l).toMatch(/ cut=1 uncaught-first=no ordered=no newest=n\/a marker=2$/);
    expect(F.conLine("R", "x", [], { sentinel: SENT, ordered: true })).toMatch(/entries=0 console=0 exception=0 sentinel=0 url=0 stack=0 maxlen=0 cut=0 uncaught-first=yes ordered=yes/);
  });
  it("newestEqual compares the last `limit` entries of the full read by hash", () => {
    expect(F.newestEqual(ENTRIES.slice(1), ENTRIES, 2)).toBe(true);
    expect(F.newestEqual(ENTRIES.slice(0, 2), ENTRIES, 2)).toBe(false);
    expect(F.newestEqual(ENTRIES, ENTRIES, 3)).toBe(true);
  });
  it("(8) sentinel counts only the entries that hold it, and ordered allows equal timestamps but not a decrease", () => {
    const es = [E("info", "console", `a ${SENT}`, 5), E("info", "console", "plain", 5), E("info", "console", `c ${SENT}`, 5)];
    expect(F.conLine("R", "l", es, { sentinel: SENT, ordered: true })).toContain("sentinel=2 ");
    expect(F.conLine("R", "l", es, { sentinel: SENT, ordered: true })).toContain(" ordered=yes ");
    expect(F.conLine("R", "l", [E("info", "console", "x", 5), E("info", "console", "y", 4)], { sentinel: SENT, ordered: true })).toContain(" ordered=no ");
    expect(F.conLine("R", "l", [E("info", "console", "x", 1)], { sentinel: SENT })).toContain("sentinel=0 ");
  });
  it("(9) CONREF: exact by message, data keys only, same-as", () => {
    const e = { code: "DISARMED", message: "m", data: { scope: "all" } };
    const l = F.conrefLine("R19-CON-4", "disarmed", e, "m", "snapshot");
    expect(l).toBe("CONREF R19-CON-4 disarmed code=DISARMED exact=yes data=keys:scope same-as=snapshot");
    ok(9, l);
    ok(9, F.conrefLine("R19-CON-3", "blocked", { code: "DOMAIN_BLOCKED", message: "x" }, "m", "none"));
    expect(F.conrefLine("R", "l", { code: "C", message: "x" }, "m", "none")).toContain("exact=no");
    expect(F.dataField({ "bad key!": SENT })).toBe("keys:other");
  });
  it("(10) CONFLOOR from page times and entries (indexes, never text); the +-500 ms margin is not judged", () => {
    const ticks = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
    const excs = ticks.map((t) => t + 5);
    const off = 3500;
    const on = 6600;
    const entries = [E("info", "console", "tick 1 x"), E("info", "console", "tick 2 x"), E("info", "console", "tick 5 x"), E("info", "console", "tick 8 x"), E("info", "console", "tick 9 x"), E("error", "exception", "Uncaught Error: s12-exc-9 x"), E("error", "exception", "Uncaught Error: s12-exc-5 x")];
    const c = F.floorCounts({ ticks, excs, offMs: off, onMs: on }, entries);
    expect(c).toEqual({ disarmedTicks: 3, inReplyDisarmed: 1, afterTicks: 3, inReplyAfter: 2, excDisarmed: 3, excInReplyDisarmed: 1, excAfter: 3, excInReplyAfter: 1 });
    const l = F.conFloorLine(c);
    expect(l).toBe("CONFLOOR disarmed-ticks=3 in-reply-disarmed=1 after-ticks=3 in-reply-after=2 exc-disarmed=3 exc-in-reply-disarmed=1 exc-after=3 exc-in-reply-after=1");
    ok(10, l);
  });
  it("(11) CONMCP and the text stats (form = the formatter's line form; the cap marker is not a line)", () => {
    const text = ["2026-10-27T10:00:01.123Z info hello", "2026-10-27T10:00:02.123Z error uncaught Uncaught Error: boom", "bad line"].join("\n");
    expect(F.conmcpStats(text)).toEqual({ lines: 3, form: 2, truncated: false });
    expect(F.conmcpStats(`${text}\n\n… [truncated: 7 more lines, the newest — narrow with level/limit]`)).toEqual({ lines: 3, form: 2, truncated: true });
    expect(F.conmcpStats("No console messages.")).toEqual({ lines: 0, form: 0, truncated: false });
    ok(11, F.conmcpLine("all", { lines: 11, form: 11, truncated: false, entriesViaSdk: 11 }));
    expect(F.conmcpLine("all", { lines: 11, form: 11, truncated: true, entriesViaSdk: 11 })).toBe("CONMCP all lines=11 form=11 truncated=yes entries-via-sdk=11");
  });
  it("(12) BANNERCON and the row verdict (a seen negative leg is NOT MEASURED, never a product pass or fail)", () => {
    ok(12, F.bannerConLine("neg", 12, "none", 20500));
    ok(12, F.bannerConLine("pos", 14, "seen", 100));
    const g = { banner: "none" as const, idleMs: 20000 };
    expect(F.bannerConVerdict({ ...g }, { banner: "seen", idleMs: 1 }, { ...g }, "ok")).toBe("PASS");
    expect(F.bannerConVerdict({ banner: "seen", idleMs: 20000 }, { banner: "seen", idleMs: 1 }, { ...g }, "ok")).toBe("NOT MEASURED");
    expect(F.bannerConVerdict({ banner: "none", idleMs: 19999 }, { banner: "seen", idleMs: 1 }, { ...g }, "ok")).toBe("NOT MEASURED");
    expect(F.bannerConVerdict({ ...g }, { banner: "none", idleMs: 1 }, { ...g }, "ok")).toBe("FAIL");
    expect(F.bannerConVerdict({ ...g }, { banner: "seen", idleMs: 1 }, { banner: "seen", idleMs: 20000 }, "ok")).toBe("FAIL");
    expect(F.bannerConVerdict({ ...g }, { banner: "seen", idleMs: 1 }, { banner: "seen", idleMs: 19999 }, "ok")).toBe("NOT MEASURED");
    expect(F.bannerConVerdict({ ...g }, { banner: "seen", idleMs: 1 }, { ...g }, "TIMEOUT")).toBe("FAIL");
    expect(F.bannerConRow("PASS")).toBe("ROW R19-CON-BANNER PASS");
    expect(F.IDLE_MIN_MS_19).toBe(20_000);
    expect(SEC).toContain("`ROW R19-CON-BANNER <PASS|FAIL>`");
  });
  it("(13) DAEMONLOG <row>: part A's two counts. Part B's (28) form is the per-slice one with args-text, for S7-helpers-d", () => {
    const l = F.daemonlogLine("R19-CON-1", 0, 0);
    expect(l).toBe("DAEMONLOG R19-CON-1 sentinel=0 console-text=0");
    ok(13, l);
    expect(SEC).toContain("`DAEMONLOG <slice> sentinel=<n> console-text=<n> args-text=<n>`");
  });
});

describe("#351 (4): the three Run 18 helper fixes, as reusable pieces", () => {
  it("(a) the O2 note prints only when O2 did not show, with the polled time", () => {
    expect(optO2NoteLine(false, 15136)).toBe("O2 did not show the saved text in 15136 ms");
    expect(optO2NoteLine(true, 5200)).toBeNull();
    expect(SEC).toContain("`O2 did not show the saved text in <n> ms`");
  });
  it("(a) the PowerShell side: Format-S12OptO2Note is in s12-win.ps1 and the patched Invoke-S12Opt prints it after the O2 line", () => {
    const ps = read("recipes", "s12-win.ps1");
    expect(ps).toContain("function Format-S12OptO2Note($R) { if ($R.Shown) { $null } else { \"O2 did not show the saved text in $($R.PolledMs) ms\" } }");
    expect(ps).toMatch(/Say9 \(Format-S12OptO2 \$o2Res\); \$o2Note = Format-S12OptO2Note \$o2Res; if \(\$o2Note\) \{ Say9 \$o2Note \}/);
  });
  it("(b) console clauses are settled into final ROW lines, worst verdict wins, in the order the rows were pending", () => {
    const pending = { "R19-ARGS-1": "PASS", "R19-CON-1": "PASS", "R19-CON-2": "NOT MEASURED", "R19-CON-3": "FAIL" } as const;
    expect(F.hasConsoleClause("R19-ARGS-1")).toBe(true);
    expect(F.hasConsoleClause("R19-CON-BANNER")).toBe(true);
    expect(F.hasConsoleClause("R19-KEEP-1")).toBe(false);
    expect(F.settleConsoleClauses(pending, "ok")).toEqual(["ROW R19-ARGS-1 PASS", "ROW R19-CON-1 PASS", "ROW R19-CON-2 NOT MEASURED", "ROW R19-CON-3 FAIL"]);
    expect(F.settleConsoleClauses(pending, "fail")).toEqual(["ROW R19-ARGS-1 FAIL", "ROW R19-CON-1 FAIL", "ROW R19-CON-2 FAIL", "ROW R19-CON-3 FAIL"]);
    expect(F.settleConsoleClauses(pending, "unread")).toEqual(["ROW R19-ARGS-1 NOT MEASURED", "ROW R19-CON-1 NOT MEASURED", "ROW R19-CON-2 NOT MEASURED", "ROW R19-CON-3 FAIL"]);
    expect(F.settleConsoleClauses({ "R19-CON-1": "STOP" }, "ok")).toEqual(["ROW R19-CON-1 STOP"]);
    expect(F.settleConsoleClauses({ "R19-KEEP-1": "PASS" }, "ok")).toEqual([]);
  });
  it("(c) Run 18's own record lines 1-17 and 265-266: aggregated as printed they WARN, after dedupeIdenticalRows they do not, and no distinct line is dropped", () => {
    const rec = [
      "MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank",
      "ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent",
      "RULES 0",
      "ROW RULES PASS: RULES 0",
      "STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "TOGGLE reading on",
      "STATE armed=true evaluate=true blocklist lines=0 uploadfolders valid=0 invalid=0",
      "TOGGLE reading on",
      "ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on",
      "FOUNDLIST blocks-fixtures=no",
      "ROW RD-0 (d) PASS: the found list blocks no fixture URL",
      "TABWATCH started",
      "TABWATCH created-url=about:blank completes=1 first-complete-ms=5",
      "S6 commit=ancestor",
      "ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank",
      "HEAD 4a46a22bcc1d tree=clean",
      "2026-10-27T20:57:28.204Z s9-win: ROW R18-0 PASS slice=B",
      "RULES 0",
      "ROW RULES PASS: RULES 0",
    ];
    expect(aggregateRows(rec).warns).toEqual(["WARN row printed twice: RULES"]);
    const out = F.dedupeIdenticalRows(rec);
    expect(aggregateRows(out).warns).toEqual([]);
    expect(aggregateRows(out).n).toBe(6);
    expect(out.length).toBe(rec.length - 1);
    expect(out.filter((l) => l.startsWith("STATE ")).length).toBe(2);
    expect(out.filter((l) => l.startsWith("TOGGLE ")).length).toBe(2);
    expect(out.filter((l) => l === "RULES 0").length).toBe(2);
  });
  it("(c) only an identical ROW line is dropped: a second ROW for the same id with another verdict still warns, and the time prefix does not make a repeat distinct", () => {
    const d = F.dedupeIdenticalRows(["ROW X-1 PASS: a", "ROW X-1 FAIL: a", "2026-10-27T20:57:28.204Z s9-win: ROW Y-1 PASS slice=A", "2026-10-27T20:58:00.000Z s9-win: ROW Y-1 PASS slice=A", "ROW Y-1 PASS slice=B", "TOGGLE reading on", "TOGGLE reading on"]);
    expect(d).toEqual(["ROW X-1 PASS: a", "ROW X-1 FAIL: a", "2026-10-27T20:57:28.204Z s9-win: ROW Y-1 PASS slice=A", "ROW Y-1 PASS slice=B", "TOGGLE reading on", "TOGGLE reading on"]);
    expect(aggregateRows(d).warns).toEqual(["WARN row printed twice: X-1"]);
  });
  it("(d) the console-clause settle takes every verdict the rows print: NOT RUN and RECORD keep their word on ok, NOT DISCRIMINATING keeps under unread, FAIL still wins", () => {
    const p = { "R19-CON-FILE": "NOT RUN", "R19-CON-NOTEA": "RECORD", "R19-CON-FRAME": "NOT DISCRIMINATING" } as const;
    expect(F.settleConsoleClauses(p, "ok")).toEqual(["ROW R19-CON-FILE NOT RUN", "ROW R19-CON-NOTEA RECORD", "ROW R19-CON-FRAME NOT DISCRIMINATING"]);
    expect(F.settleConsoleClauses(p, "unread")).toEqual(["ROW R19-CON-FILE NOT RUN", "ROW R19-CON-NOTEA NOT MEASURED", "ROW R19-CON-FRAME NOT DISCRIMINATING"]);
    expect(F.settleConsoleClauses(p, "fail")).toEqual(["ROW R19-CON-FILE NOT RUN", "ROW R19-CON-NOTEA FAIL", "ROW R19-CON-FRAME FAIL"]);
  });
});

describe("the S12 fixture pages hold every id, marker, query and global the liveA19 and chooser rows read (static)", () => {
  const T = (f: string): string => read("test-fixtures", f);
  const con = T("s12-console.js") + T("s12-notea.js") + T("s12-noteaok.js");
  const ch = T("s12-chooser.js") + T("s12-chooser-frame.html");
  const pg = T("e2e-playground.html");
  const rowsRead = SEC.slice(SEC.indexOf("| R19-0 "), SEC.indexOf("| R19-UP-OPT "));
  it("s12-console: every s12= query the sheet lists for part A and part B's cap", () => {
    const listed = [...SEC.matchAll(/`s12=([a-z0-9]+)`|\?s12=([a-z0-9]+)/g)].map((m) => m[1] ?? m[2]!).filter((q) => /^(con|rej|big|tick|frame|frameoop|notea|noteaok|nav|nav2|cap)$/.test(q));
    expect(new Set(listed)).toEqual(new Set(["con", "rej", "big", "tick", "frame", "frameoop", "notea", "noteaok", "nav", "nav2", "cap"]));
    for (const q of new Set(listed)) expect(con, q).toContain(`"${q}"`);
    for (const m of ["window.__s12 =", "S.ticks", "S.excs", "SENTINEL", "s12-con-", "s12-con-throw", "s12-exc-", "s12-frame-", "s12-nav-", "s12-cap-", "s12-rej", "s12-notea", "s12-notea-long", "s12-noteaok", "http://f.s12site.localhost:8081/s12-console.html?s12=con", "http://127.0.0.1:8081/s12-console.html?s12=con", "http://s12blk.localhost:8081/s12-notea.js", "http://localhost:8081/s12-noteaok.js", "padEnd(2000"]) expect(con, m).toContain(m);
    expect(con).not.toMatch(/__s12eff\s*=/);
    expect(rowsRead).toContain("window.__s12eff");
  });
  it("s12-chooser: every query, id and reporter key part B lists", () => {
    for (const q of ["c1", "label", "none", "picker", "single", "dir", "dis", "late49", "late51", "human", "frame"]) expect(ch, q).toContain(q);
    for (const id of ['id="open"', 'id="in"', 'id="vis"', 'id="lab"', 'id="in2"', 'id="second"', 'id="fbtn"', 'id="fin"', "s12-chooser-frame.html", "showOpenFilePicker", "webkitdirectory", "disabled", "multiple", "4900", "5100", "window.__s12ch", "clicks", "change", "files", "bytes", "bytesEqual", "late", "#sum="]) expect(ch, id).toContain(id);
    expect(T("s12-chooser.html")).toContain("s12-chooser.js");
    expect(T("s12-console.html")).toContain("s12-console.js");
  });
  it("e2e-playground: s12= handling, beat for `as`, #tb and a counted button for g2a/g2b; its old counter is still there", () => {
    for (const m of ['get("s12")', "window.__s12 =", "beat", "setInterval", "100", '"as"', '"g2a"', '"g2b"', 'id="tb"', "window.__s12.clicks += 1"]) expect(pg, m).toContain(m);
    expect(pg).toContain('id="counter"');
  });
  it("e2e-playground-csp already serves #eval-probe as the sheet says (unchanged)", () => {
    const csp = T("e2e-playground-csp.html");
    expect(csp).toContain('id="eval-probe"');
    expect(csp).toContain("page eval: BLOCKED — ");
    expect(csp).toContain("'unsafe-inline'");
    expect(/Content-Security-Policy[^>]*content="([^"]*)"/.exec(csp)![1]).not.toContain("unsafe-eval");
  });
  it("the fixtures hold no real site: every http URL is 127.0.0.1, localhost or *.localhost on 8081", () => {
    for (const f of ["s12-console.js", "s12-notea.js", "s12-noteaok.js", "s12-chooser.js", "s12-chooser.html", "s12-chooser-frame.html", "s12-console.html"])
      for (const m of T(f).matchAll(/https?:\/\/[^\s"')]+/g)) expect(m[0], f).toMatch(/^http:\/\/(127\.0\.0\.1|([a-z0-9-]+\.)*localhost):8081(\/|$)/);
  });
});
