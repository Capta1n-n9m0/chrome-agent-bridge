// Step 12 S7-drivers-A: liveA19's row drivers against section 4.27. The pure decisions (recipes/s12-r19-a.ts) are unit-tested; the PowerShell side
// (recipes/s12-r19-a.ps1) runs with every helper stubbed (nothing touches Chrome, a daemon or a port) and, as named mutants, must turn its own check red.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import * as A from "../s12-r19-a.js";
import { STOP_REASONS, scanActors } from "../s12-r19.js";
import { conFloorLine, conLine, conrefLine, floorCounts as F } from "../s12-forms.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rd = (p: string): string => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const DOC = rd("docs/e2e-test-plan.md");
const SEC = DOC.slice(DOC.indexOf("### 4.27 R19 rows"), DOC.indexOf("## 5. Results template"));
const ENTRY = rd("recipes/s12-r19.ps1");
const PSA = rd("recipes/s12-r19-a.ps1");
const TS = rd("recipes/s12-r19-a.ts");
const LINE = /^- \*\*liveA19 [^\n]*$/m.exec(SEC)![0];
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const keys = (s: string): string[] => [...s.matchAll(/([a-z][a-z-]*)=/g)].map((m) => m[1]!);
const E = (kind: "console" | "exception", text: string, ts = 1): { level: string; kind: "console" | "exception"; text: string; ts: number } => ({ level: kind === "exception" ? "error" : "info", kind, text, ts });

/** liveA19's row ids exactly as the sheet's slice line writes them (bold or not), with the gated and the framing ones kept. */
const ids = (): string[] => {
  const head = LINE.slice(LINE.indexOf(":**") + 3, LINE.indexOf("No DevTools window"));
  return [...head.matchAll(/R19-[A-Z0-9-]+/g)].map((m) => m[0]);
};

describe("every liveA19 row has a driver", () => {
  const order = /liveA19 = \$R19Prologue \+ @\(([^)]*)\)/.exec(rd("recipes/s12-r19-lib.ps1"))![1]!;
  const blocks = new Set([...ENTRY.matchAll(/\$global:R19Blocks\['([^']+)'\] = \{/g)].map((m) => m[1]!));
  it("the sheet's liveA19 line names the rows the runner's order runs", () => {
    const sheet = ids().map((i) => i.toLowerCase());
    const run = [...order.matchAll(/'(r19-[a-z0-9-]+)'/g)].map((m) => m[1]!);
    for (const r of sheet) expect(run, r).toContain(r);
    expect(sheet.length).toBeGreaterThanOrEqual(24);
  });
  it("each row id has a registered driver (R19-0, R19-RESTORE, R19-LOGS are the runner's own)", () => {
    for (const id of ids()) expect(blocks.has(id.toLowerCase()), id).toBe(true);
  });
  it("no liveA19 driver prints `NOT RUN — no driver built`; the only NOT RUN a driver may carry is R19-CON-FILE's gate", () => {
    expect(PSA).not.toContain("no driver built");
    const lib = rd("recipes/s12-r19-lib.ps1");
    expect(lib).toContain("waits for G11-3");
    expect(SEC).toContain("`NOT RUN — waits for G11-3`");
    for (const id of ids()) expect(ENTRY, id).not.toContain(`ROW ${id} NOT RUN`);
  });
  it("a row with a state change has a restore in its registration (JS off, block list, toolbar disarm)", () => {
    for (const m of ENTRY.matchAll(/\$global:R19Blocks\['(r19-[a-z0-9-]+)'\] = \{ (Invoke-R19Row [^\n]*) \}\n/g)) {
      if (/New-R19Steps/.test(m[2]!) && !/R19-CON-OWN/.test(m[2]!)) expect(m[2], m[1]).toMatch(/ -Restore \{ [^}]+ \}/);
    }
    for (const id of ["r19-args-3", "r19-con-jsoff", "r19-con-3", "r19-con-frame", "r19-con-notea", "r19-con-4", "r19-con-floor", "r19-con-file"]) expect(ENTRY, id).toMatch(new RegExp(`'${id}'\\] = [^\\n]*-Restore`));
  });
  it("every STOP is reached through Stop-R19 and names a sheet reason; the actor's STOPWHY reasons are listed", () => {
    expect(PSA.match(/\bStop9\b|\bFail-S16\b|(?<![-'\w])throw(?![-\w])/g) ?? []).toEqual([]);
    for (const m of [...PSA.matchAll(/Stop-R19 (?:\$\(if[^)]*\) )?'([a-z-]+)'/g), ...PSA.matchAll(/'(not-restored|throw-after-state)'/g)]) expect(STOP_REASONS as readonly string[]).toContain(m[1]);
    for (const m of [...TS.matchAll(/new StopWhy\("([a-z-]+)"/g), ...TS.matchAll(/stop: "([a-z-]+)"/g), ...TS.matchAll(/=> \{[^}]*"(attach-[a-z-]+)"/g)]) expect(STOP_REASONS as readonly string[]).toContain(m[1]);
    for (const r of ["attach-after-disarm", "attach-on-refused-page", "existing-tool-changed", "args-ran-js-off"]) expect(TS).toContain(`"${r}"`);
  });
  it("every actor command a driver runs exists, and the JS-off, block-list and toolbar rows pair a do with an undo", () => {
    const ran = new Set([...ENTRY.matchAll(/Invoke-R19Row '[A-Z0-9-]+' @\('([a-z0-9-]+)'/g)].map((m) => m[1]!));
    for (const c of [...ran, "banner-ctl", "con-banner", "banner", "banner-ctl-judge", "banner-con"]) expect(Object.keys(A.cmds), c).toContain(c);
    for (const sig of ["R19-ARGS-3-js", "R19-CON-JSOFF-js", "R19-CON-3-block", "R19-CON-4-off", "R19-CON-FRAME-block", "R19-CON-NOTEA-block", "R19-CON-FLOOR-off", "R19-CON-OWN-open", "R19-CON-FILE-open"]) {
      expect(ENTRY, sig).toContain(`'${sig}'`);
      expect(TS.includes(`"${sig}`) || TS.includes(`sig(\`${sig.replace(/-[a-z]+$/, "")}`) || TS.includes("change: \"" + sig) || TS.includes("`${R}-" + sig.split("-").pop()), sig).toBe(true);
    }
  });
});

describe("the expected texts, quoted from section 4.27", () => {
  it("the eleven args refusal texts are the sheet's, character for character, and every one is BAD_PARAMS", () => {
    expect(A.ARGS_TEXT.length).toBe(11);
    for (const [, t] of A.ARGS_TEXT) expect(SEC, t).toContain(t);
    expect(A.SENT_LABELS).toEqual(["raw-big", "notfn"]);
  });
  it("the refusal messages are the ones the sheet cites", () => {
    for (const m of [A.MSG.blocked, A.MSG.own, A.MSG.file, A.MSG.jsOff.replace(/ \(browser.*$/, ""), A.MSG.disarmed]) expect(SEC.includes(m) || DOC.includes(m), m).toBe(true);
    expect(SEC).toContain("`This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user.`");
  });
  it("the CON rows' expected counts are the sheet's lines", () => {
    const w = A.CON_ROWS;
    expect(SEC).toContain("`CON R19-CON-1 all entries=11 console=10 exception=1 sentinel=11 url=0 stack=0 maxlen=<m> uncaught-first=yes`");
    expect(w["R19-CON-1"]!.reads.map((r) => r.want.entries)).toEqual([11, 3, 2]);
    expect(SEC).toContain("`CON R19-CON-2 errors entries=2 console=1 exception=1 sentinel=2");
    expect(SEC).toContain("`CON R19-CON-REJ rej entries=1 console=0 exception=1 sentinel=1");
    expect(SEC).toContain("`CON R19-CON-BIG big entries=1 console=1 exception=0 sentinel=0 url=0 stack=0 maxlen=2000 cut=1");
    expect(w["R19-CON-BIG"]!.reads[0]!.want).toMatchObject({ maxlen: 2000, cut: 1 });
    expect(SEC).toContain("`CON R19-CON-NAV nav entries=2 console=2 exception=0 sentinel=2");
    expect(w["R19-CON-NAV"]!.reads[0]!.want).toMatchObject({ entries: 2, console: 2 });
    expect(Object.keys(w)).toEqual(["R19-CON-1", "R19-CON-2", "R19-CON-REJ", "R19-CON-BIG", "R19-CON-NAV"]);
  });
  it("the form lines the drivers print match section 4.27 by key: CONREF, CONFLOOR, BANNERCALL (34), BANNERCTL", () => {
    const t = (n: string): string => new RegExp(`\`(${n} [^\`]*)\``).exec(SEC)![1]!;
    expect(keys(conrefLine("R19-CON-3", "blocked", { code: "X", message: "m" }, "m", "snapshot"))).toEqual(keys(t("CONREF R19-CON-3 blocked")));
    expect(keys(conFloorLine({ disarmedTicks: 3, inReplyDisarmed: 0, afterTicks: 2, inReplyAfter: 2, excDisarmed: 3, excInReplyDisarmed: 0, excAfter: 2, excInReplyAfter: 2 }))).toEqual(keys(t("CONFLOOR")));
    const bc = "(34) `BANNERCALL <row> leg=<label> idle-ms=<n> polls=<n> banner=<seen|none> control=<pass|fail|absent>`";
    expect(SEC).toContain(bc);
    expect(keys(A.bannerCallLine("R", "l", 1, 2, "none", "pass"))).toEqual(keys(bc));
    expect(keys(A.bannerCtl19("liveA19", { idleMs: 20000, polls: 1, banner: "none" }, { answer: "ok", polls: 1, banner: "seen" }).lines[0]!)).toEqual(keys(t("BANNERCTL <slice> leg=neg")));
    expect(SEC).toContain("`BANNERCTL <slice> leg=pos answer=ok polls=<n> banner=seen`");
  });
});

describe("the pure decisions", () => {
  it("judgeLine reads the verdict from the printed CON line itself (a clause judged from another line is red)", () => {
    const line = conLine("R", "all", [E("console", `a ${A.SENT}`), E("exception", `Uncaught x ${A.SENT}`)], { sentinel: A.SENT });
    expect(A.judgeLine(line, { entries: 2, console: 1, exception: 1, sentinel: 2, url: 0 })).toBe("PASS");
    expect(A.judgeLine(line, { entries: 3 })).toBe("FAIL");
    const other = conLine("R", "all", [E("console", "no sentinel")], { sentinel: A.SENT });
    expect(A.judgeLine(other, { entries: 2, console: 1, exception: 1, sentinel: 2 })).toBe("FAIL");
    expect(A.kv("CON R l entries=3 maxlen=2000")).toEqual({ entries: "3", maxlen: "2000" });
  });
  it("judgeRefusal: code, exact message, data keys and the control's equality; no refusal is FAIL", () => {
    const want = { code: "DOMAIN_BLOCKED", message: A.MSG.blocked };
    expect(A.judgeRefusal({ code: want.code, message: want.message }, want, { code: want.code, message: want.message })).toBe("PASS");
    expect(A.judgeRefusal({ code: want.code, message: want.message + "!" }, want)).toBe("FAIL");
    expect(A.judgeRefusal({ code: want.code, message: want.message, data: { scope: "all" } }, want)).toBe("FAIL");
    expect(A.judgeRefusal({ code: "DISARMED", message: A.MSG.disarmed, data: { scope: "all" } }, { code: "DISARMED", message: A.MSG.disarmed, data: "keys:scope" })).toBe("PASS");
    expect(A.judgeRefusal({ code: want.code, message: want.message }, want, { code: want.code, message: "other" })).toBe("FAIL");
    expect(A.judgeRefusal(undefined, want)).toBe("FAIL");
  });
  it("the effect counter: unchanged is ok, above the control a STOP, unread unread", () => {
    expect(A.judgeEffects(1, 1)).toBe("ok");
    expect(A.judgeEffects(1, 2)).toBe("stop");
    expect(A.judgeEffects(null, 1)).toBe("unread");
  });
  it("the Banner rule: a positive on a refused call is a STOP only with IDLE >= 20 000 ms and the control passing", () => {
    expect(A.judgeBannerRefused("seen", 20_000, "pass")).toBe("STOP");
    expect(A.judgeBannerRefused("seen", 19_999, "pass")).toBe("NOT MEASURED");
    expect(A.judgeBannerRefused("seen", 25_000, "fail")).toBe("NOT MEASURED");
    expect(A.judgeBannerRefused("seen", 25_000, "absent")).toBe("NOT MEASURED");
    expect(A.judgeBannerRefused("none", 25_000, "pass")).toBe("PASS");
    expect(A.judgeBannerRefused("none", 10_000, "pass")).toBe("NOT MEASURED");
  });
  it("an in-call window (CON-MCP) is never a STOP: seen is the pass, none with a valid window a FAIL, no idle or control NOT MEASURED", () => {
    expect(A.judgeBannerCall("seen", 20_000, "pass")).toBe("PASS");
    expect(A.judgeBannerCall("none", 20_000, "pass")).toBe("FAIL");
    expect(A.judgeBannerCall("seen", 5_000, "pass")).toBe("NOT MEASURED");
    expect(A.judgeBannerCall("seen", 25_000, "fail")).toBe("NOT MEASURED");
  });
  it("the idle gate sleeps the rest of 20 000 ms since the last attach; an unknown stamp waits the whole bound", () => {
    expect(A.idleSleepMs(30_000, 20_000)).toBe(10_000);
    expect(A.idleSleepMs(50_000, 20_000)).toBe(0);
    expect(A.idleSleepMs(1, null)).toBe(20_000);
  });
  it("BANNERCTL passes only with idle >= 20 000, a negative none, the call ok and a positive seen", () => {
    const n = { idleMs: 20_000, polls: 9, banner: "none" }, p = { answer: "ok", polls: 9, banner: "seen" };
    expect(A.bannerCtl19("liveA19", n, p).pass).toBe(true);
    expect(A.bannerCtl19("liveA19", { ...n, idleMs: 19_999 }, p).pass).toBe(false);
    expect(A.bannerCtl19("liveA19", { ...n, banner: "seen" }, p).pass).toBe(false);
    expect(A.bannerCtl19("liveA19", n, { ...p, banner: "none" }).pass).toBe(false);
    expect(A.bannerCtl19("liveA19", n, { ...p, answer: "TIMEOUT" }).pass).toBe(false);
  });
  it("CON-FRAME: leg a with the frame dropped is a PASS only when the second read holds all 13; a second read of 2 is NOT DISCRIMINATING", () => {
    const mk = (n: number, exc: number): ReturnType<typeof E>[] => Array.from({ length: n }, (_, i) => (i < exc ? E("exception", `Uncaught ${A.SENT}`) : E("console", `m ${A.SENT}`)));
    expect(A.judgeFrame(mk(2, 0), mk(13, 1))).toBe("PASS");
    expect(A.judgeFrame(mk(2, 0), mk(2, 0))).toBe("NOT DISCRIMINATING");
    expect(A.judgeFrame(mk(13, 1), mk(13, 1))).toBe("FAIL");
  });
  it("CON-NOTEA: blocked 0 entries; allowed 2 with the marker, 1 without it is RECORD, 0 is FAIL; a blocked entry with the marker is FAIL", () => {
    const o = (t: string): ReturnType<typeof E> => E("console", `${t} ${A.SENT}`);
    const err = E("console", "s12-noteaok e");
    expect(A.judgeNoteA([], [err, o("plain")])).toBe("PASS");
    expect(A.judgeNoteA([], [o("plain")])).toBe("RECORD");
    expect(A.judgeNoteA([], [])).toBe("FAIL");
    expect(A.judgeNoteA([o("s12-notea e")], [err, o("plain")])).toBe("FAIL");
  });
});

describe("the banner and control commands print their lines and the exit the rule gives", () => {
  const run = async (args: string[]): Promise<{ out: string[]; code: number }> => {
    const out: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
    try { return { out, code: await A.main(args) }; } finally { spy.mockRestore(); }
  };
  it("a positive on a refused call with the idle and the control is exit 2 and the sheet's reason; otherwise NOT MEASURED, exit 0", async () => {
    const stop = await run(["banner", "--row", "R19-CON-4", "--kind", "refused", "--ctl", "pass", "--stop", "attach-after-disarm", "--leg", "refused=50,seen,20100"]);
    expect(stop.code).toBe(2);
    expect(stop.out).toContain("STOPWHY attach-after-disarm");
    expect(stop.out).toContain("BANNERCALL R19-CON-4 leg=refused idle-ms=20100 polls=50 banner=seen control=pass");
    expect(stop.out).toContain("LEG R19-CON-4 banner NOT MEASURED");
    const nm = await run(["banner", "--row", "R19-CON-4", "--kind", "refused", "--ctl", "fail", "--stop", "attach-after-disarm", "--leg", "refused=50,seen,20100"]);
    expect(nm.code).toBe(0);
    expect(nm.out.join("\n")).not.toContain("STOPWHY");
    const ok = await run(["banner", "--row", "R19-CON-3", "--kind", "refused", "--ctl", "pass", "--stop", "attach-on-refused-page", "--leg", "refused=50,none,20100"]);
    expect(ok.out).toContain("LEG R19-CON-3 banner PASS");
  });
  it("banner-con: PASS needs neg none, pos seen with the call ok and after none, each with 20 000 ms idle; a seen negative is NOT MEASURED", async () => {
    const mk = (neg: string): string[] => ["banner-con", "--neg", neg, "--pos", "40,seen,21000", "--after", "40,none,20500", "--answer", "ok"];
    expect((await run(mk("40,none,20000"))).out).toContain("LEG R19-CON-BANNER banner PASS");
    expect((await run(mk("40,seen,20000"))).out).toContain("LEG R19-CON-BANNER banner NOT MEASURED");
    expect((await run(mk("40,none,10000"))).out).toContain("LEG R19-CON-BANNER banner NOT MEASURED");
  });
  it("banner-ctl-judge prints the two BANNERCTL lines and a LEG; a seen negative is a FAIL (exit 1)", async () => {
    const a = await run(["banner-ctl-judge", "--slice", "liveA19", "--idle", "20500", "--neg", "9,none", "--pos", "9,seen,ok"]);
    expect(a.code).toBe(0);
    expect(a.out[0]).toBe("BANNERCTL liveA19 leg=neg idle-ms=20500 polls=9 banner=none");
    expect(a.out).toContain("LEG R19-BANNER-CTL ctl PASS");
    expect((await run(["banner-ctl-judge", "--slice", "liveA19", "--idle", "20500", "--neg", "9,seen", "--pos", "9,seen,ok"])).code).toBe(1);
  });
  it("an unknown subcommand is a STOP, never a throw", async () => {
    expect((await run(["nope"])).code).toBe(2);
  });
});

describe("the fixer's pure decisions (S7-drivers-A round 1)", () => {
  const T = (text: string, isError = true): { text: string; isError: boolean } => ({ text, isError });
  it("ARGS-2: `sent` counts every call that reached the wire; 2 in total, each wire label once, nothing else (M2)", () => {
    const ok = { exact: 11, none: 11, sent: 2, perLabel: { "raw-big": 1, notfn: 1, undefined: 0 } as Record<string, number>, control: true, effects: "ok" as const };
    expect(A.judgeArgs2(ok)).toBe("PASS");
    expect(A.judgeArgs2({ ...ok, sent: 3, perLabel: { ...ok.perLabel, nan: 1 } })).toBe("FAIL");
    expect(A.judgeArgs2({ ...ok, sent: 2, perLabel: { "raw-big": 1, notfn: 0, nan: 1 } })).toBe("FAIL");
    expect(A.judgeArgs2({ ...ok, sent: 11 })).toBe("FAIL");
    expect(A.judgeArgs2({ ...ok, effects: "stop" })).toBe("FAIL");
    expect(A.judgeArgs2({ ...ok, control: false })).toBe("FAIL");
  });
  it("the MCP clauses: CON-3 equals browser_snapshot's text, CON-JSOFF equals browser_evaluate's with a snapshot that answers, CON-4 carries the disarmed message (M1)", () => {
    expect(A.judgeMcpRefusal("R19-CON-3", T("blocked"), T("blocked"))).toBe("PASS");
    expect(A.judgeMcpRefusal("R19-CON-3", T("entries"), T("blocked"))).toBe("FAIL");
    expect(A.judgeMcpRefusal("R19-CON-3", T("entries", false), T("entries", false))).toBe("FAIL");
    expect(A.judgeMcpRefusal("R19-CON-3", T("x"), undefined)).toBe("FAIL");
    expect(A.judgeMcpRefusal("R19-CON-JSOFF", T("off"), T("off"), T("page", false))).toBe("PASS");
    expect(A.judgeMcpRefusal("R19-CON-JSOFF", T("off"), T("off"), T("off"))).toBe("FAIL");
    expect(A.judgeMcpRefusal("R19-CON-JSOFF", T("off"), T("off"))).toBe("FAIL");
    expect(A.judgeMcpRefusal("R19-CON-4", T(`x ${A.MSG.disarmed}`))).toBe("PASS");
    expect(A.judgeMcpRefusal("R19-CON-4", T("something else"))).toBe("FAIL");
  });
  it("a browser_list_tabs result is never written whole: only a count and whether the fixture's handle is there; the record scans clean (M4)", () => {
    const whole = "T1 * Inbox - Mail \u2014 https://mail.example.org/u/0\nT2 s12 console \u2014 http://localhost:8081/s12-console.html?s12=con";
    const rec = JSON.parse(A.actorRecord("browser_list_tabs", whole, "T2")) as { tool: string; text: string };
    expect(rec.text).toBe("list-tabs lines=2 fixture-handle=yes");
    expect(A.actorRecord("browser_list_tabs", whole, "T3")).toContain("fixture-handle=no");
    for (const bad of ["Inbox", "mail.example", "://", "T1"]) expect(A.actorRecord("browser_list_tabs", whole, "T2")).not.toContain(bad);
    const scan = scanActors("liveA19", [rec], { sentinel: A.SENT, profile: [] });
    expect(scan.pass).toBe(true);
    expect(JSON.parse(A.actorRecord("browser_console_messages", "11 entries", "T2")).text).toBe("11 entries");
  });
  it("a browser_status result is never written whole: no title or URL of the human's tab reaches the file (MINOR-2, NIT-4)", () => {
    const st = (act: string): string => `Daemon: up\nClients (2): a, b\nExtension: connected\nActive tab: [${act}] Inbox - Mail — https://mail.example.org/u/0\nSafety: armed`;
    const rec = (t: string, fx: string): { text: string } => JSON.parse(A.actorRecord("browser_status", t, fx)) as { text: string };
    expect(rec(st("T2"), "T2").text).toBe("status lines=5 extension=connected active=fixture");
    expect(rec(st("T1"), "T2").text).toBe("status lines=5 extension=connected active=other");
    expect(rec("Extension: not connected — x", "T2").text).toBe("status lines=1 extension=other active=none");
    for (const bad of ["Inbox", "mail.example", "://", "T1"]) expect(A.actorRecord("browser_status", st("T1"), "T2")).not.toContain(bad);
    expect(scanActors("liveA19", [rec(st("T1"), "T2")].map((r) => ({ tool: "browser_status", text: r.text })), { sentinel: A.SENT, profile: [] }).pass).toBe(true);
    expect(JSON.parse(A.actorRecord("browser_list_tabs", "T2* s12 — http://x/", "T2")).text).toBe("list-tabs lines=1 fixture-handle=yes");
  });
  it("CONFLOOR: only ticks logged before the read count; the after window starts at the ON title, the disarmed one ends at the ON press (N2, MINOR-1)", () => {
    const base = { offMs: 10_000, onMs: 13_000, ticks: [10_700, 11_700, 12_400, 13_900, 14_900, 15_900], excs: [] as number[] };
    const es = (n: number[]): ReturnType<typeof E>[] => n.map((i) => E("console", `tick ${i} x`));
    // the reply holds ticks 4-5 (the floor dropped 1-3); tick 6 was logged after the read (readAt 15 500) and could not be in it
    expect(F(base, es([4, 5])).afterTicks).toBe(3);
    expect(F({ ...base, readAt: 15_500 }, es([4, 5]))).toMatchObject({ afterTicks: 2, inReplyAfter: 2, disarmedTicks: 3, inReplyDisarmed: 0 });
    // the title was read 600 ms after the press: tick 4 (13 900) is inside the title's margin and is not judged
    expect(F({ ...base, onTitleMs: 13_600, readAt: 15_500 }, es([4, 5])).afterTicks).toBe(1);
    expect(F({ ...base, onTitleMs: 13_600, readAt: 15_500 }, es([4, 5])).disarmedTicks).toBe(3);
  });
  it("the toolbar check is the exact armed title, and R19-RESTORE closes the bc tab after the safety restore (NIT-1, MINOR-3)", () => {
    expect(PSA).toMatch(/function Test-R19Armed \{[^\n]*-eq \$S9TitleArmed/);
    const lib = rd("recipes/s12-r19-lib.ps1");
    expect(lib.indexOf("Close-R19Bc }")).toBeGreaterThan(lib.indexOf("Invoke-R19Stamped $R17Blocks['rd-restore']"));
    expect(rd("recipes/s12-r19-a.ts")).toMatch(/mt !== "" && r\.text\.includes\(mt\)/);
  });
  it("the actor's own IDLE leaves out exactly snapshot, listTabs and daemon.status; a crash of a stateless actor is its row's FAIL leg (m3, m2)", () => {
    expect([...A.IDLE_EXEMPT_TOOLS]).toEqual(["browser_snapshot", "browser_list_tabs", "browser_status"]);
    expect(A.crashLine("R19-ARGS-1")).toBe("LEG R19-ARGS-1 actor-error FAIL");
  });
  it("CON reads: each read is judged from its own line, not the `all` read's (M5)", async () => {
    const mk = (n: number, exc = 0): ReturnType<typeof E>[] => Array.from({ length: n }, (_, i) => (i < exc ? E("exception", `Uncaught ${A.SENT}`, i + 1) : E("console", `m ${A.SENT}`, i + 1)));
    const reads: Record<string, ReturnType<typeof E>[]> = { "{}": mk(11, 1), '{"limit":3}': mk(11, 1).slice(-3), '{"level":"error"}': [E("console", `e ${A.SENT}`), E("exception", `Uncaught ${A.SENT}`)] };
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const legs = await A.conLegs("R19-CON-1", A.CON_ROWS["R19-CON-1"]!, async (o) => reads[JSON.stringify(o)]!);
      expect(legs).toEqual(["PASS", "PASS", "PASS"]);
    } finally { spy.mockRestore(); }
  });
  it("CON-FRAME leg b needs sentinel=2 and is only recorded when leg a was NOT DISCRIMINATING (m5)", () => {
    const two = [E("console", `a ${A.SENT}`), E("console", `b ${A.SENT}`)];
    expect(A.judgeFrameB(two, "PASS")).toBe("PASS");
    expect(A.judgeFrameB(two, "NOT DISCRIMINATING")).toBe("RECORD");
    expect(A.judgeFrameB([E("console", "a"), E("console", "b")], "PASS")).toBe("FAIL");
    expect(A.judgeFrameB([...two, E("console", `c ${A.SENT}`)], "NOT DISCRIMINATING")).toBe("FAIL");
  });
  it("the bc tab is closed by R19-RESTORE, not by the control row; the entry points exist", () => {
    expect(Object.keys(A.cmds)).toContain("close-bc");
    expect(rd("recipes/s12-r19-lib.ps1")).toContain("Close-R19Bc");
    expect(TS).not.toMatch(/await t\.close\(\)\.catch\(\(\) => undefined\);\n  return idleMs/);
  });
});

// ---- the PowerShell side, every helper stubbed ----------------------------------------------------------------------------------------------------
const STUBS = `
$global:R19Slice = 'liveA19'; $global:R19Pending = [ordered]@{}; $global:R19Ctl = ''; $global:S16Stops = 0; $global:S16Changed = $false; $global:W = 7
$global:Calls = New-Object System.Collections.ArrayList; $global:NodeBehaviour = 'ok'; $global:NodeOutLines = @()
function Say9([string]$m) { Write-Host $m }
function Show-S16([string[]]$l) { foreach ($t in $l) { Write-Host $t } }
function Save-S16 { }
function Set-S11Front { $true }
function Stop-R19([string]$Reason, [string]$Why) { [void]$global:Calls.Add("STOP:$Reason"); throw "stop $Reason" }
$global:BannerOut = @('LEG R19-X banner PASS'); $global:BannerRc = 0; $global:Now = 1000; $global:Armed = $true
function Get-S12NowMs { $global:Now += 10; $global:Now }
function Wait-S11Ready { $true }
function Write-S11Pressed([string]$id, [string]$v) { [void]$global:Calls.Add("PRESSED:$($id):$v") }
function Invoke-S12Sampler { [pscustomobject]@{ Polls = 9; Banner = 'seen' } }
function Use-S16Options { 1 }
function Set-S11Flag { $false }
$S9TitleArmed = 'Chrome Agent Bridge - armed (click to turn off)'
function Get-S9ActionTitle { if ($global:Armed) { $S9TitleArmed } else { 'Chrome Agent Bridge - OFF: agents are refused (click to turn on)' } }
function Invoke-S9ActionButton { $global:Armed = -not $global:Armed; [void]$global:Calls.Add('PRESS') }
function Invoke-R19Node {
  $a = @($args); $cmd = @($a[1])
  if ($a[0] -eq 's12-r19-a' -and $cmd[0] -eq 'banner') { [void]$global:Calls.Add("LEGARG:" + $cmd[[array]::IndexOf($cmd, '--leg') + 1]); $global:R17Out = @($global:BannerOut); return $global:BannerRc }
  if ($cmd[0] -eq 'banner-ctl-judge') { [void]$global:Calls.Add("CTLIDLE:" + $cmd[[array]::IndexOf($cmd, '--idle') + 1]); $global:R17Out = @('LEG R19-BANNER-CTL ctl PASS'); return 0 }
  $global:R17Out = @($global:NodeOutLines)
  if ($global:NodeBehaviour -eq 'died') { $global:R19Changed = $true; throw 'the actor died after the change' }
  if ($global:NodeBehaviour -like 'drv*' -and $a[2]) { & $a[2] }
  if ($global:NodeBehaviour -eq 'drvdie') { throw 'the actor died after the do step' }
  if ($global:NodeBehaviour -eq 'stop2') { return 2 }
  0
}
`;
const SCENARIOS = `
function Restore-Probe { [void]$global:Calls.Add('RESTORE') }
$global:NodeBehaviour = 'died'
try { Invoke-R19Row 'R19-X' @('x') -Restore { Restore-Probe } } catch { }
Write-Host "S1 restores=$(@($global:Calls | Where-Object { $_ -eq 'RESTORE' }).Count)"
$global:Calls.Clear(); $global:NodeBehaviour = 'ok'; $global:R19Changed = $false
Invoke-R19Row 'R19-X' @('x') -Restore { Restore-Probe }
Write-Host "S2 restores-clean=$(@($global:Calls | Where-Object { $_ -eq 'RESTORE' }).Count)"
$global:Calls.Clear(); $global:NodeBehaviour = 'stop2'; $global:NodeOutLines = @('STOPWHY args-ran-js-off')
try { Invoke-R19Row 'R19-X' @('x') } catch { }
Write-Host "S3 stop=$($global:Calls -join ',')"
$global:Calls.Clear(); $global:NodeOutLines = @()
try { Invoke-R19Row 'R19-X' @('x') } catch { }
Write-Host "S4 stop-default=$($global:Calls -join ',')"
$global:NodeBehaviour = 'ok'; $global:NodeOutLines = @('LEG R19-CON-1 all PASS', 'LEG R19-CON-1 limit3 FAIL', 'LEG R19-CON-1 error PASS')
$global:R19Pending = [ordered]@{}; Invoke-R19Row 'R19-CON-1' @('x')
Write-Host "S5 verdict=$($global:R19Pending['R19-CON-1'])"
$global:NodeOutLines = @('LEG R19-ARGS-1 table PASS', 'LEG R19-ARGS-1 control NOT MEASURED')
Invoke-R19Row 'R19-ARGS-1' @('x')
Write-Host "S6 verdict2=$($global:R19Pending['R19-ARGS-1'])"
$global:NodeOutLines = @('LEG R19-BANNER-CTL ctl PASS'); $global:R19Pending = [ordered]@{}
Invoke-R19Row 'R19-BANNER-CTL' @('x')
Write-Host "S7 ctl-pending=$($global:R19Pending.Count)"
# the step engine: a do step marks the state changed, so a death before the undo restores; an undo step runs its restore and clears the mark
$global:Calls.Clear(); $global:NodeBehaviour = 'drvdie'; $global:NodeOutLines = @()
try { Invoke-R19Row 'R19-X' @('x') -StepList @(@{ k = 'do'; id = 'R19-X-do'; f = { [void]$global:Calls.Add('DO') } }) -Restore { Restore-Probe } } catch { }
Write-Host "S8 do-then-death=$(($global:Calls | Where-Object { $_ -notlike 'PRESSED:*' }) -join ',')"
$global:Calls.Clear(); $global:NodeBehaviour = 'drv'; $global:R19Changed = $false
Invoke-R19Row 'R19-X' @('x') -StepList (New-R19Steps 'R19-X-do' '' { [void]$global:Calls.Add('DO') } { [void]$global:Calls.Add('UNDO') }) -Restore { Restore-Probe }
Write-Host "S9 do-undo=$(($global:Calls | Where-Object { $_ -notlike 'PRESSED:*' }) -join ',') changed=$($global:R19Changed)"
# the banner path: the LAST IDLE of the sampler's own id and the sampler's own polls and banner; a banner STOP goes through Stop-R19 with its reason
$global:Calls.Clear(); $global:NodeBehaviour = 'drv'; $global:NodeOutLines = @('IDLE R19-X since-attach-ms=100', 'IDLE R19-X since-attach-ms=25000', 'IDLE R19-Y since-attach-ms=7')
Invoke-R19Row 'R19-X' @('x') -StepList @(@{ k = 's'; id = 'R19-X' }) -Banner refused
Write-Host "S10 leg=$(($global:Calls | Where-Object { $_ -like 'LEGARG:*' }) -join ',')"
$global:Calls.Clear(); $global:BannerRc = 2; $global:BannerOut = @('STOPWHY attach-after-disarm')
try { Invoke-R19Row 'R19-X' @('x') -StepList @(@{ k = 's'; id = 'R19-X' }) -Banner refused } catch { }
Write-Host "S11 banner-stop=$(($global:Calls | Where-Object { $_ -like 'STOP:*' }) -join ',')"
$global:BannerRc = 0; $global:BannerOut = @('LEG R19-X banner PASS')
# BANNER-CTL: the judge gets the idle of the row's own IDLE line (not the neg sampler's); the actor dying is a STOP through Stop-R19Actor
$global:Calls.Clear(); $global:NodeBehaviour = 'drv'; $global:R19Pending = [ordered]@{}
$global:NodeOutLines = @('IDLE R19-BANNER-CTL since-attach-ms=21000', 'IDLE R19-BANNER-CTL-neg since-attach-ms=5')
Invoke-R19BannerCtl
Write-Host "S12 ctl-idle=$(($global:Calls | Where-Object { $_ -like 'CTLIDLE:*' }) -join ',')"
$global:Calls.Clear(); $global:NodeBehaviour = 'stop2'; $global:NodeOutLines = @('STOPWHY attach-on-refused-page')
try { Invoke-R19BannerCtl } catch { }
Write-Host "S13 ctl-crash=$($global:Calls -join ',')"
# the restores read back and STOP through Stop-R19
$global:Calls.Clear()
try { Restore-R19Js } catch { }
Write-Host "S14 restore-js=$($global:Calls -join ',')"
# the toolbar: a switch presses once (and only when the state differs), judged from the title ('disarmed' contains 'armed'); OFF is stamped after its title, ON just before its press
$global:Calls.Clear(); $global:Armed = $true; $global:R19Changed = $false; $global:NodeBehaviour = 'drv'; $global:NodeOutLines = @()
Invoke-R19Row 'R19-X' @('x') -StepList (New-R19Steps 'R19-FL-off' '' { Switch-R19Toolbar $false; $global:OffPost = $global:R19Press.post } { Switch-R19Toolbar $true; $global:OnPre = $global:R19Press.pre; $global:OnPost = $global:R19Press.post }) -Restore { Switch-R19Toolbar $true }
$r19st = @($global:Calls | Where-Object { $_ -like 'PRESSED:*' })
Write-Host "S15 toolbar presses=$(@($global:Calls | Where-Object { $_ -eq 'PRESS' }).Count) armed=$($global:Armed) off-stamp-after-title=$($r19st[0] -eq "PRESSED:R19-FL-off:$($global:OffPost)") on-stamp-before-press=$(($r19st[1] -eq "PRESSED:R19-FL-off-done:$($global:OnPre),$($global:OnPost)") -and ($global:OnPre -lt $global:OnPost))"
Switch-R19Toolbar $true
Write-Host "S16 same-state-presses=$(@($global:Calls | Where-Object { $_ -eq 'PRESS' }).Count)"
`;
function runPs(psa: string): string[] {
  const d = mkdtempSync(join(tmpdir(), "s12r19a-"));
  const lib = join(REPO, "recipes", "s12-r19-lib.ps1").replace(/'/g, "''");
  const f = join(d, "t.ps1");
  writeFileSync(f, `[Console]::OutputEncoding = [Text.Encoding]::UTF8\n$Record = '${d.replace(/'/g, "''")}\\r.txt'; $Steps = 's'; $Framing = $Record\n. '${lib}'\n${psa}\n${STUBS}\n${SCENARIOS}`, "utf8");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8" });
  return r.stdout.split(/\r?\n/);
}
function mutatePsa(from: string, to: string): string {
  expect(PSA.includes(from), "the mutated text exists").toBe(true);
  const m = PSA.replace(from, () => to);
  const d = mkdtempSync(join(tmpdir(), "s12r19am-"));
  const f = join(d, "m.ps1");
  writeFileSync(f, m, "utf8");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", `$e = $null; $t = $null; [void][Management.Automation.Language.Parser]::ParseFile('${f.replace(/'/g, "''")}', [ref]$t, [ref]$e); $e.Count`], { encoding: "utf8" });
  expect(r.stdout.trim(), "the mutant parses").toBe("0");
  return m;
}
const has = (o: string[], l: string): boolean => o.includes(l);
describe.skipIf(!hasPs)("the drivers' PowerShell, with stubbed helpers", () => {
  const real = hasPs ? runPs(PSA) : [];
  it("a restore runs when the actor died after the state change, and does not run on a clean row", () => {
    expect(has(real, "S1 restores=1")).toBe(true);
    expect(has(real, "S2 restores-clean=0")).toBe(true);
  });
  it("an actor STOP goes through Stop-R19 with the actor's own reason, else throw-after-state", () => {
    expect(has(real, "S3 stop=STOP:args-ran-js-off")).toBe(true);
    expect(has(real, "S4 stop-default=STOP:throw-after-state")).toBe(true);
  });
  it("the row's verdict is the worst of its LEG lines; a console-clause row waits for R19-LOGS, the control row does not", () => {
    expect(has(real, "S5 verdict=FAIL")).toBe(true);
    expect(has(real, "S6 verdict2=NOT MEASURED")).toBe(true);
    expect(has(real, "S7 ctl-pending=0")).toBe(true);
    expect(real.some((l) => l === "ROW R19-BANNER-CTL PASS slice=A")).toBe(true);
  });
  it("the step engine, the banner path, the restores and the toolbar: each scenario's own line", () => {
    expect(has(real, "S8 do-then-death=DO,RESTORE")).toBe(true);
    expect(has(real, "S9 do-undo=DO,UNDO changed=False")).toBe(true);
    expect(has(real, "S10 leg=LEGARG:refused=9,seen,25000")).toBe(true);
    expect(has(real, "S11 banner-stop=STOP:attach-after-disarm")).toBe(true);
    expect(has(real, "S12 ctl-idle=CTLIDLE:21000")).toBe(true);
    expect(has(real, "S13 ctl-crash=STOP:attach-on-refused-page")).toBe(true);
    expect(has(real, "S14 restore-js=STOP:not-restored")).toBe(true);
    expect(has(real, "S15 toolbar presses=2 armed=True off-stamp-after-title=True on-stamp-before-press=True")).toBe(true);
    expect(has(real, "S16 same-state-presses=2")).toBe(true);
  });
  const MUTANTS: Array<[string, string, string, string]> = [
    ["the restore is skipped (no finally)", "finally { if ($Restore -and $global:R19Changed) { & $Restore; $global:R19Changed = $false } }", "finally { }", "S1 restores=1"],
    ["a STOP is printed without Stop-R19", "if ($r19rc -eq 2) { Stop-R19Actor $Id $r19out }", "if ($r19rc -eq 2) { Say9 'STOP x' }", "S3 stop=STOP:args-ran-js-off"],
    ["the actor's reason is dropped", "Stop-R19 $(if ($r19w.Success) { $r19w.Groups[1].Value } else { $Default })", "Stop-R19 $Default", "S3 stop=STOP:args-ran-js-off"],
    ["the verdict is read from the first line only", "Get-R19Verdict @($Lines | ForEach-Object", "Get-R19Verdict @($Lines | Select-Object -First 1 | ForEach-Object", "S5 verdict=FAIL"],
    ["a clean row restores anyway", "if ($Restore -and $global:R19Changed)", "if ($Restore)", "S2 restores-clean=0"],
    ["the idle is read from the first IDLE line", "[long]$r19m[$r19m.Count - 1].Groups[1].Value", "[long]$r19m[0].Groups[1].Value", "S10 leg=LEGARG:refused=9,seen,25000"],
    ["BANNER-CTL's idle is read from the negative sampler's id", "(Get-R19IdleOf $r19o 'R19-BANNER-CTL')", "(Get-R19IdleOf $r19o 'R19-BANNER-CTL-neg')", "S12 ctl-idle=CTLIDLE:21000"],
    ["a banner STOP is printed by Say9", "if ($r19c -eq 2) { Stop-R19Actor $Id $global:R17Out $Why }", "if ($r19c -eq 2) { Say9 'STOP x' }", "S11 banner-stop=STOP:attach-after-disarm"],
    ["a failed JS restore is printed by Say9", "Stop-R19 'not-restored' 'JavaScript did not read back on'", "Say9 'STOP not-restored'", "S14 restore-js=STOP:not-restored"],
    ["a do step does not mark the state changed", "$global:R19Changed = $true; $global:R19Press = $null;", "$global:R19Press = $null;", "S8 do-then-death=DO,RESTORE"],
    ["an undo step does not run its restore", "$global:R19Press = $null; $null = & $r19s.f; $global:R19Changed = $false;", "$global:R19Press = $null; $global:R19Changed = $false;", "S9 do-undo=DO,UNDO changed=False"],
    ["the toolbar switch presses nothing", "$r19pre = Get-S12NowMs; [void](Invoke-S9ActionButton $global:W);", "$r19pre = Get-S12NowMs;", "S15 toolbar presses=2 armed=True off-stamp-after-title=True on-stamp-before-press=True"],
    ["the ON press is stamped after the title read", "Get-R19PressMs 'pre'", "Get-R19PressMs 'post'", "S15 toolbar presses=2 armed=True off-stamp-after-title=True on-stamp-before-press=True"],
    ["a crashed BANNER-CTL actor is not a STOP", "if ($r19rc -eq 2) { Stop-R19Actor 'R19-BANNER-CTL' $r19o }", "", "S13 ctl-crash=STOP:attach-on-refused-page"],
  ];
  for (const [what, from, to, check] of MUTANTS) {
    it(`mutant "${what}" turns "${check}" red`, () => {
      expect(has(runPs(mutatePsa(from, to)), check)).toBe(false);
    });
  }
});
