// S4-helpers fixer tests (findings M1-M5, m1-m6, n1, n2, n5 of S4-helpers-verifier.md): the pure rules and the B17 subcommands they added.
// Servers listen on port 0; nothing touches Chrome, the daemon or ports 8081-8091/9234.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { analyzeUploadFolders } from "../../extension/src/options-model.js";
import { awaitGo, main, parseArgs, readDump, reportFileTabRows, SUBCOMMANDS, storedListen, STORED_LINGER_MS } from "../s11b";
import { rowLine } from "../s9-rules.js";
import {
  K17,
  SOCK_MARKS,
  answerOfRow,
  ctxExpression,
  dlHopD,
  dlHopReading,
  dlHopRecord,
  dropTitleLines,
  fileExistsFrom,
  isTitleLine,
  judgeCallAnswer,
  judgeDlHopTrial,
  judgeDlTrial,
  judgeFileTabHidden,
  judgeFileTabRow,
  judgeRd0State,
  markExpression,
  parseCallRow,
  parseMarkLine,
  preTypeCheck,
  rd0StateLine,
  rd0ToggleLine,
  scan17,
  scanLine17,
  verdict17,
} from "../s11b-rules.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tmp = mkdtempSync(join(tmpdir(), "s11b-fix-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const f = (n: string): string => join(tmp, n);

let out: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
});
afterEach(() => {
  out = [];
});
afterAll(() => spy.mockRestore());
const run = async (...argv: string[]): Promise<{ code: number; text: string }> => {
  out = [];
  const code = await main(argv);
  return { code, text: out.join("\n") };
};

describe("n5: the dlHopReading band edges (-350..-250 in hand, -50..50 late, above 50 unexplained)", () => {
  it.each([
    [-350, /in hand/], [-351, /between/], [-250, /in hand/], [-249, /between/], [-50, /revisit trigger/], [-51, /between/], [50, /revisit trigger/], [51, /unexplained/],
  ] as Array<[number, RegExp]>)("d = %d", (d, re) => {
    expect(dlHopReading(d)).toMatch(re);
  });
  it("the record line carries the three hop and err times, RD-3's time, d and the reading; a missing time is NOT MEASURED", () => {
    expect(dlHopRecord([10, 20, 300], [310, 320, 900], 40)).toBe(`RECORD RD-DL-HOP hop=10,20,300 err=310,320,900 rd3=40 d=${20 - 320} ms reading=${dlHopReading(20 - 320)}`);
    expect(dlHopRecord([10, 20, 300], [], undefined)).toBe("RECORD RD-DL-HOP hop=10,20,300 err= d=NOT MEASURED reading=not measured");
    expect(dlHopD([1, 2, 3], [11, 12, 13])).toBe(-10);
  });
});

describe("m1: RD-DL-ERR and RD-DL-HOP judged over S9's own ROW line", () => {
  const line = (step: string, code: string, message: string, data?: unknown, ms = 812): string =>
    rowLine("RD-DL-HOP", step, { ok: code === "ok", code, message, data, ms } as never);
  it("parseCallRow round-trips S9's rowLine for K-url, K-fetch, K-disarmed (data) and an ok row with a detail", () => {
    for (const [key, k] of [["K-url", K17["K-url"]], ["K-fetch", K17["K-fetch"]], ["K-filepage", K17["K-filepage"]], ["K-fileurl", K17["K-fileurl"]]] as const) {
      const r = parseCallRow(line("h1", k.code, k.message), "h1")!;
      expect({ code: r.code, message: r.message, ms: r.ms }, key).toEqual({ code: k.code, message: k.message, ms: 812 });
      expect(r.data).toBeUndefined();
    }
    const d = parseCallRow(line("h2", K17["K-disarmed"].code, K17["K-disarmed"].message, K17["K-disarmed"].data), "h2")!;
    expect(d.data).toEqual({ scope: "all" });
    expect(d.message).toBe(K17["K-disarmed"].message);
    const ok = parseCallRow(rowLine("F-FILETAB", "tabs", { ok: true, ms: 7 } as never, "", "tabs total=3 hidden(disarmed)=0 hidden(blocked)=1 withTitle=2 withUrl=2 url8081=1"), "tabs")!;
    expect(ok.code).toBe("ok");
    expect(ok.message).toContain("hidden(blocked)=1");
  });
  it("takes the row of its own step only, never the -file line, and none when absent", () => {
    const t = [line("h1", K17["K-url"].code, K17["K-url"].message), "ROW RD-DL-HOP h1-file hop1.txt exists=no part=no", line("h2", "INTERNAL", "Failed to fetch", undefined, 5)].join("\n");
    expect(parseCallRow(t, "h1")!.code).toBe("DOMAIN_BLOCKED");
    expect(parseCallRow(t, "h2")!.ms).toBe(5);
    expect(parseCallRow(t, "h3")).toBeNull();
    expect(fileExistsFrom(t, "h1")).toBe(false);
    expect(fileExistsFrom(t.replace("exists=no", "exists=yes"), "h1")).toBe(true);
    expect(fileExistsFrom(t.replace("part=no", "part=yes"), "h1")).toBe(true);
    expect(fileExistsFrom(t, "h2")).toBeNull();
  });
  it("the hop trial passes only on K-url, no data, no file, blocked 0, rules 0; an ok answer is a STOP, and an unread value is NOT MEASURED", () => {
    const row = parseCallRow(line("h1", K17["K-url"].code, K17["K-url"].message), "h1")!;
    const read = { fileExists: false, blocked: 0, rulesAfter: 0 };
    expect(judgeDlTrial("hop", row, read).pass).toBe(true);
    expect(judgeDlTrial("hop", row, { ...read, fileExists: true }).pass).toBe(false);
    expect(judgeDlTrial("hop", row, { ...read, blocked: 1 }).pass).toBe(false);
    expect(judgeDlTrial("hop", parseCallRow(line("h1", "DOMAIN_BLOCKED", K17["K-tab"].message), "h1")!, read).pass).toBe(false);
    expect(judgeDlTrial("hop", parseCallRow(rowLine("RD-DL-HOP", "h1", { ok: true, ms: 9 } as never, "", "hop1.txt size=17"), "h1")!, read)).toMatchObject({ pass: false, stop: true });
    for (const [k, v] of [["fileExists", null], ["blocked", null], ["rulesAfter", null]] as const) expect(judgeDlTrial("hop", row, { ...read, [k]: v }), k).toMatchObject({ pass: false, notMeasured: true });
    expect(judgeDlHopTrial({ answer: "ok", fileExists: false, blocked: 0, rulesAfter: 0 }).stop).toBe(true);
  });
  it("the err trial fails only DOMAIN_BLOCKED and an ok; a text other than K-fetch is recorded, and RULES unread is NOT MEASURED", () => {
    const err = (code: string, message: string) => parseCallRow(line("e1", code, message), "e1")!;
    const read = { fileExists: null, blocked: null, rulesAfter: 0 };
    expect(judgeDlTrial("err", err("INTERNAL", "Failed to fetch"), read).pass).toBe(true);
    // the sheet passes a non-INTERNAL code that is not DOMAIN_BLOCKED (m1: `--expect code:INTERNAL` failed it)
    expect(judgeDlTrial("err", err("TIMEOUT", "slow"), read)).toMatchObject({ pass: true });
    expect(judgeDlTrial("err", err("DOMAIN_BLOCKED", K17["K-url"].message), read).pass).toBe(false);
    expect(judgeDlTrial("err", err("INTERNAL", "Failed to fetch"), { ...read, rulesAfter: null })).toMatchObject({ pass: false, notMeasured: true });
  });
});

describe("m4: a covered call that proceeds is a STOP; M5: K-filepage and K-fileurl are judged", () => {
  it("tab-or-url and url expectations: ok is a STOP; disarmed and ok keep their own rules", () => {
    expect(judgeCallAnswer("tab-or-url", undefined, "RD-5")).toMatchObject({ pass: false, stop: true });
    expect(judgeCallAnswer("url", undefined, "RD-DL-HOP")).toMatchObject({ pass: false, stop: true });
    expect(judgeCallAnswer("tab-or-url", { code: "DOMAIN_BLOCKED", message: "other" }, "x")).toMatchObject({ pass: false });
    expect(judgeCallAnswer("tab-or-url", { code: "DOMAIN_BLOCKED", message: "other" }, "x").stop).toBeUndefined();
    expect(judgeCallAnswer("disarmed", undefined, "x").stop).toBeUndefined();
    expect(judgeCallAnswer("ok", undefined, "x").pass).toBe(true);
  });
  it("filepage and fileurl are exact (code, message, no data) and tied to K17", () => {
    expect(judgeCallAnswer("filepage", K17["K-filepage"], "x").pass).toBe(true);
    expect(judgeCallAnswer("filepage", K17["K-fileurl"], "x").pass).toBe(false);
    expect(judgeCallAnswer("fileurl", K17["K-fileurl"], "x").pass).toBe(true);
    expect(judgeCallAnswer("fileurl", { ...K17["K-fileurl"], data: { a: 1 } } as never, "x").pass).toBe(false);
    expect(judgeCallAnswer("fileurl", undefined, "x").pass).toBe(false);
    expect(answerOfRow({ code: "ok", message: "", ms: 1 })).toBeUndefined();
  });
  it("the F-FILETAB tabs row: exactly one hidden(blocked) passes, else NOT MEASURED", () => {
    const row = (n: number) => parseCallRow(rowLine("F-FILETAB", "tabs", { ok: true, ms: 7 } as never, "", `tabs total=3 hidden(disarmed)=0 hidden(blocked)=${n} withTitle=2 withUrl=2 url8081=1`), "tabs");
    expect(judgeFileTabRow(row(1)).pass).toBe(true);
    for (const n of [0, 2]) expect(judgeFileTabRow(row(n))).toMatchObject({ pass: false, notMeasured: true });
    expect(judgeFileTabRow(null).notMeasured).toBe(true);
  });
});

describe("M2: RD-0 (c)'s STATE line is the sheet's form", () => {
  it("prints valid= and invalid= (no hashes, no 'uploadfolders lines=')", () => {
    expect(rd0StateLine({ armed: true, evaluate: true, blockLines: 4, valid: 2, invalid: 1 })).toBe("STATE armed=true evaluate=true blocklist lines=4 uploadfolders valid=2 invalid=1");
    expect(rd0ToggleLine("off")).toBe("TOGGLE reading off");
  });
  it("armed with JavaScript on and a readable toggle, else STOP", () => {
    expect(judgeRd0State({ armed: true, evaluate: true, toggle: "on" }).pass).toBe(true);
    expect(judgeRd0State({ armed: false, evaluate: true, toggle: "on" }).stop).toBe(true);
    expect(judgeRd0State({ armed: true, evaluate: false, toggle: "off" }).stop).toBe(true);
    expect(judgeRd0State({ armed: true, evaluate: true, toggle: "unreadable" }).stop).toBe(true);
  });
  it("B17 state computes valid/invalid from the found Upload folders text with analyzeUploadFolders", async () => {
    const text = "C:\\w\\a\nC:\\w\\b\nC:\\w\\c\nrelative\\x\n";
    const a = analyzeUploadFolders(text);
    writeFileSync(f("fnd.txt"), text);
    writeFileSync(f("fnd.json"), JSON.stringify({ armed: true, evaluate: true, blocklist: { lines: 3, sha256: "x" }, uploadfolders: { lines: 4, sha256: "y" }, toggle: "on" }));
    const r = await run("state", "--found", f("fnd.json"), "--folders", f("fnd.txt"));
    expect(r.code).toBe(0);
    expect(r.text.split("\n").slice(0, 2)).toEqual([`STATE armed=true evaluate=true blocklist lines=3 uploadfolders valid=${a.folderCount} invalid=${a.invalidCount}`, "TOGGLE reading on"]);
    expect([a.folderCount, a.invalidCount]).toEqual([3, 1]); // asymmetric: a valid/invalid swap in stateCmd changes the line
    expect(r.text).not.toContain("sha");
    writeFileSync(f("fnd2.json"), JSON.stringify({ armed: true, evaluate: false, blocklist: { lines: 0 }, uploadfolders: { lines: 0 }, toggle: "on" }));
    expect((await run("state", "--found", f("fnd2.json"), "--folders", f("fnd.txt"))).code).toBe(2);
    writeFileSync(f("fnd3.json"), JSON.stringify({ armed: true, evaluate: true, blocklist: { lines: 0 }, uploadfolders: { lines: 0 }, toggle: "unreadable" }));
    const u = await run("state", "--found", f("fnd3.json"), "--folders", f("fnd.txt"));
    expect(u.code).toBe(2);
    expect(u.text).not.toContain("TOGGLE");
    expect((await run("state", "--found", join(REPO, "package.json"), "--folders", f("fnd.txt"))).text).toMatch(/inside the repo/);
  });
});

describe("n1: the CTX tab filter compares the query value, not a substring", () => {
  const exprRun = async (tag: string, tabs: unknown[], contexts: unknown[]): Promise<string[]> => {
    const o: string[] = [];
    const chromeObj = { tabs: { query: async () => tabs }, runtime: { getContexts: async () => contexts } };
    runInNewContext(ctxExpression("rd7", tag), { chrome: chromeObj, console: { log: (s: string) => o.push(s) }, Promise });
    await new Promise((r) => setTimeout(r, 50));
    return o;
  };
  it("rd7 does not match the setup tag rd7p, but matches among other parameters, with a fragment, or by pendingUrl", async () => {
    const tabs = [{ id: 1, url: "x/?s11b=rd7p" }, { id: 2, url: "x/?a=1&s11b=rd7&b=2#h" }, { id: 3, pendingUrl: "x/?s11b=rd7" }, { id: 4, url: "x/?s11b=rd70" }, { id: 5, url: "x/#s11b=rd7" }];
    const o = await exprRun("rd7", tabs, [{ tabId: 1 }, { tabId: 2 }, { tabId: 3 }, { tabId: 3 }, { tabId: 4 }]);
    expect(o).toEqual(["CTX rd7 tabs=2", "CTX rd7 count=3"]);
    expect(await exprRun("rd7", [{ id: 1, url: "x/?s11b=rd7p" }], [{ tabId: 1 }])).toEqual(["CTX rd7 tabs=0", "CTX rd7 count=0"]);
  });
  it("the typed text stays free of a scheme separator and of a pattern", () => {
    const e = ctxExpression("rd7", "rd7");
    expect(preTypeCheck(e, { token: "tok-Z9y8", alias: "alias7.localhost" })).toBeNull();
    expect(e).not.toContain("://");
  });
});

describe("M3 (b): RD-DL-SOCKET's two console marks and the daemon-log window", () => {
  it("the mark expression is fixed, pattern-free, prints only its mark, and the parser takes only a whole line", async () => {
    for (const l of ["start", "end"] as const) {
      const e = markExpression(l);
      expect(preTypeCheck(e, { token: "tok-Z9y8", alias: "alias7.localhost" })).toBeNull();
      const o: string[] = [];
      expect(runInNewContext(e, { console: { log: (s: string) => o.push(s) } })).toBeUndefined();
      expect(o).toEqual([SOCK_MARKS[l]]);
      expect(parseMarkLine(`> ${e}\nundefined`, l)).toBeNull();
      expect(parseMarkLine(`> ${e}\n${SOCK_MARKS[l]}\n`, l)).toBe(SOCK_MARKS[l]);
    }
    expect(() => markExpression("middle")).toThrow();
  });
  it("B17 mark --expr writes the expression; --read finds the mark or says nothing was read", async () => {
    const r = await run("mark", "--expr", f("mk.expr"), "--label", "start");
    expect(r.text).toMatch(/^EXPR mark ok len=\d+$/);
    expect(readFileSync(f("mk.expr"), "utf8")).toBe(markExpression("start"));
    writeFileSync(f("mk.dump"), `> ${markExpression("start")}\r\n${SOCK_MARKS.start}\r\n`);
    expect((await run("mark", "--read", f("mk.dump"), "--label", "start")).code).toBe(0);
    expect((await run("mark", "--read", f("mk.dump"), "--label", "end")).code).toBe(3);
  });
  it("scan counts 127.0.0.1 between the daemon-log line counts only; bad or out-of-range counts are NOT MEASURED marks-missing", () => {
    const ctx = { token: "tok-Q7w8", sentinel: "sx", profile: ["C:\\Users\\someone"], alias: "alias7.localhost" };
    const text = ["a 127.0.0.1", "b", "c 127.0.0.1", "d 127.0.0.1", "e", "f 127.0.0.1"].join("\n");
    expect(scan17(text, ctx, { fromLine: 1, toLine: 5 })).toMatchObject({ sock127: 2, sockMarksMissing: false });
    expect(scan17(text, ctx, { fromLine: 2, toLine: 2 })).toMatchObject({ sock127: 0, sockMarksMissing: false });
    for (const w of [{ fromLine: 3, toLine: 2 }, { fromLine: 0, toLine: 99 }, { fromLine: -1, toLine: 2 }, { fromLine: 0.5, toLine: 2 }]) expect(scan17(text, ctx, w).sockMarksMissing, JSON.stringify(w)).toBe(true);
    expect(verdict17(scan17(text, ctx, { fromLine: 1, toLine: 5 }), {})).toMatchObject({ pass: false, stop: true });
    expect(verdict17(scan17("x", ctx, { fromLine: 0, toLine: 99 }), {})).toMatchObject({ pass: false, notMeasured: true });
  });
  it("an alias never given to the scan is NOT MEASURED, not a pass by construction (M3 a)", () => {
    const ctx = { token: "tok-Q7w8", sentinel: "sx", profile: ["C:\\Users\\someone"] };
    expect(scan17("http://localhost:8081/x", ctx).aliasKnown).toBe(false);
    expect(verdict17(scan17("http://localhost:8081/x", ctx), {})).toMatchObject({ pass: false, notMeasured: true });
    expect(verdict17(scan17("http://localhost:8081/x", { ...ctx, alias: "alias7.localhost" }), {}).pass).toBe(true);
    expect(verdict17(scan17("alias7.localhost", { ...ctx, alias: "alias7.localhost" }), {}).stop).toBe(true);
    expect(scanLine17("x", scan17("", { ...ctx, alias: "alias7.localhost" }))).toContain("alias7=0");
  });
});

describe("M3 (c) and m5, B17 scan over files: the alias from state.json, the actors' tool results, window-title lines", () => {
  const b17 = (args: string[], env: Record<string, string>): { code: number | null; text: string } => {
    const r = spawnSync(process.execPath, ["--import", "tsx", join(REPO, "recipes", "s11b.ts"), ...args], { encoding: "utf8", env: { ...process.env, ...env }, cwd: REPO });
    return { code: r.status, text: r.stdout };
  };
  it("scan --what actors reads <S11_OUT>/actors tool results with S11's own filter, and the alias stored by `S11 make` counts", { timeout: 60_000 }, () => {
    const o = join(tmp, "s11out");
    mkdirSync(join(o, "actors"), { recursive: true });
    writeFileSync(join(o, "state.json"), JSON.stringify({ sentinel: "sentinel-x", alias: "alias7.localhost", tabs: {}, files: {} }));
    const turn = (body: string): string => ["TOOL browser_x", "SENT see http://real.test/in-the-actors-own-input", body].join("\n");
    writeFileSync(join(o, "actors", "a.turn-1.txt"), turn("    [1/1] ok http://localhost:8081/page"));
    const clean = b17(["scan", "--what", "actors"], { S11_OUT: o });
    expect(clean.text).toMatch(/^SCAN actors: :\/\/=1 \(fixture 1, other 0\) /);
    expect(clean.text).toContain("alias7=0");
    expect(clean.text).toMatch(/ROW RD-LOGS (PASS|NOT MEASURED)/);
    writeFileSync(join(o, "actors", "b.turn-2.txt"), turn("    [1/1] result alias7.localhost reached"));
    const dirty = b17(["scan", "--what", "actors"], { S11_OUT: o });
    expect(dirty.code).toBe(2);
    expect(dirty.text).toContain("alias7=1");
    expect(dirty.text).not.toContain("alias7.localhost");
    // no alias anywhere: NOT MEASURED (exit 3), never alias7=0 with a pass
    rmSync(join(o, "state.json"));
    const none = b17(["scan", "--what", "actors"], { S11_OUT: o });
    expect(none.code === 3 || none.text.includes("NOT MEASURED")).toBe(true);
  });
  it("scan --sock-console takes the two console marks, and --alias on the command line wins", { timeout: 60_000 }, () => {
    const o = join(tmp, "s11out2");
    mkdirSync(o, { recursive: true });
    writeFileSync(f("cap.txt"), ["127.0.0.1 before", `> ${markExpression("start")}`, SOCK_MARKS.start, "inside", SOCK_MARKS.end, "127.0.0.1 after"].join("\n"));
    const clean = b17(["scan", "--what", "console", "--file", f("cap.txt"), "--alias", "a.localhost", "--sock-console"], { S11_OUT: o });
    expect(clean.text).toContain("sock127=0");
    writeFileSync(f("cap2.txt"), ["x", SOCK_MARKS.start, "see 127.0.0.1 here", SOCK_MARKS.end].join("\n"));
    const dirty = b17(["scan", "--what", "console", "--file", f("cap2.txt"), "--alias", "a.localhost", "--sock-console"], { S11_OUT: o });
    expect(dirty.code).toBe(2);
    expect(dirty.text).toContain("sock127=1");
    const none = b17(["scan", "--what", "console", "--file", f("cap.txt"), "--alias", "a.localhost", "--sock-lines", "0,1"], { S11_OUT: o });
    expect(none.text).toContain("sock127=1");
  });
  it("window-title lines are dropped (a profile display name never reaches the scan or the committed capture)", async () => {
    for (const t of ["DevTools", "DevTools - Some Profile Name", "devtools - x", "Page - Google Chrome", "Page - Chrome"]) expect(isTitleLine(t), t).toBe(true);
    for (const t of ["DevTools failed to load", "Console", "RULES 0", "safety: disarmed by the user", ""]) expect(isTitleLine(t), t).toBe(false);
    expect(dropTitleLines("a\nDevTools - Profile X\nb\nDevTools\n")).toEqual({ text: "a\nb\n", dropped: 2 });
    writeFileSync(f("cons.txt"), "DevTools - Profile X\nRULES 0\nsafety: disarmed by the user\n");
    const r = await run("clean-console", "--file", f("cons.txt"));
    expect(r).toEqual({ code: 0, text: "CONSOLE window-title lines dropped=1" });
    expect(readFileSync(f("cons.txt"), "utf8")).toBe("RULES 0\nsafety: disarmed by the user\n");
    expect(r.text).not.toContain("Profile");
    expect((await run("clean-console", "--file", join(REPO, "package.json"))).text).toMatch(/inside the repo/);
    // the scan drops them as well, so a name inside one is not counted as a profile path
    writeFileSync(f("cons2.txt"), `DevTools - ${tmpdir()}\nsafety: disarmed by the user\n`);
    expect((await run("scan", "--what", "console", "--file", f("cons2.txt"), "--alias", "a.localhost")).text.split("\n")[0]).toContain("profile=0");
  });
});

describe("judge-row, hits --only blocked, dl-record (the runner's calls)", () => {
  const call = (name: string, body: string): string => {
    writeFileSync(f(name), body);
    return f(name);
  };
  it("judge-row prints LAT in the sheet's form from S9's own time and judges the answer", async () => {
    const hop = [rowLine("RD-DL-HOP", "h1", { ok: false, code: K17["K-url"].code, message: K17["K-url"].message, ms: 291 } as never), "ROW RD-DL-HOP h1-file hop1.txt exists=no part=no"].join("\n");
    const r = await run("judge-row", "--row", "RD-DL-HOP-1", "--from", call("hop.txt", hop), "--step", "h1", "--as", "dl-hop", "--lat", "RD-DL-HOP-1", "--blocked", "0", "--rules-after", "0");
    expect(r.code).toBe(0);
    expect(r.text.split("\n")).toEqual(["LAT RD-DL-HOP-1 291 ms", "ROW RD-DL-HOP-1 PASS: K-url, no file, blocked=0"]);
    const proceeded = rowLine("RD-DL-HOP", "h1", { ok: true, ms: 5 } as never, "", "hop1.txt size=17") + "\nROW RD-DL-HOP h1-file hop1.txt exists=yes part=no";
    expect((await run("judge-row", "--row", "R", "--from", call("hop2.txt", proceeded), "--step", "h1", "--as", "dl-hop", "--blocked", "0", "--rules-after", "0")).code).toBe(2);
    const err = rowLine("RD-DL-ERR", "e1", { ok: false, code: "INTERNAL", message: "Failed to fetch", ms: 600 } as never);
    expect((await run("judge-row", "--row", "RD-DL-ERR-1", "--from", call("err.txt", err), "--step", "e1", "--as", "dl-err", "--lat", "RD-DL-ERR-1", "--rules-after", "0")).text).toMatch(/^LAT RD-DL-ERR-1 600 ms\nROW RD-DL-ERR-1 PASS/);
    const lat = await run("judge-row", "--row", "x", "--from", f("err.txt"), "--step", "e1", "--as", "lat", "--lat", "RD-1");
    expect(lat).toEqual({ code: 0, text: "LAT RD-1 600 ms" });
    const nothing = await run("judge-row", "--row", "x", "--from", f("err.txt"), "--step", "zz", "--as", "lat");
    expect(nothing.code).toBe(3);
  });
  it("judge-row judges F-FILETAB's K-filepage, K-fileurl and tabs row; a wrong text fails", async () => {
    const snap = rowLine("F-FILETAB", "snap", { ok: false, code: K17["K-filepage"].code, message: K17["K-filepage"].message, ms: 20 } as never);
    expect((await run("judge-row", "--row", "F-FILETAB snapshot", "--from", call("snap.txt", snap), "--step", "snap", "--as", "filepage")).code).toBe(0);
    expect((await run("judge-row", "--row", "F-FILETAB control", "--from", f("snap.txt"), "--step", "snap", "--as", "fileurl")).code).toBe(1);
    const ctl = rowLine("F-FILETAB", "ctl", { ok: false, code: K17["K-fileurl"].code, message: K17["K-fileurl"].message, ms: 20 } as never);
    expect((await run("judge-row", "--row", "F-FILETAB control", "--from", call("ctl.txt", ctl), "--step", "ctl", "--as", "fileurl")).code).toBe(0);
    const tabs = rowLine("F-FILETAB", "tabs", { ok: true, ms: 7 } as never, "", "tabs total=3 hidden(disarmed)=0 hidden(blocked)=1 withTitle=2 withUrl=2 url8081=1");
    expect((await run("judge-row", "--row", "F-FILETAB tabs", "--from", call("tabs.txt", tabs), "--step", "tabs", "--as", "tabs-hidden")).code).toBe(0);
    expect((await run("judge-row", "--row", "x", "--from", f("tabs.txt"), "--step", "tabs", "--as", "nonsense")).code).toBe(2);
    expect((await run("judge-row", "--row", "x", "--from", join(REPO, "package.json"), "--step", "tabs", "--as", "lat")).text).toMatch(/inside the repo/);
  });
  it("hits --only blocked prints the sheet's `HITS <tag> blocked=<n>` form from 8085's log; with --flip the flip counts follow", async () => {
    const iso = "2026-10-27T00:00:00.000Z";
    writeFileSync(f("b.log"), `${iso} GET /x?s11b=bk 200\n${iso} GET /x?s11b=bk2 200\n`);
    writeFileSync(f("fl.log"), `${iso} GET /h?s11b=bk 200\n${iso} GET /h?s11b=bk 302\n`);
    expect((await run("hits", "--log", f("b.log"), "--only", "blocked", "--tag", "bk", "--flip", f("fl.log"))).text).toBe("HITS bk blocked=1\nFLIP bk n200=1 n302=1 total=2");
    expect((await run("hits", "--log", f("b.log"), "--only", "blocked", "--tag", "rd1")).text).toBe("HITS rd1 blocked=0");
    expect((await run("hits", "--log", `${f("b.log")},${f("b.log")}`, "--only", "blocked", "--tag", "bk")).code).toBe(2);
  });
  it("dl-record prints the record; the new subcommands are in the table", async () => {
    expect((await run("dl-record", "--hop", "10,20,300", "--err", "310,320,900", "--rd3", "40")).text).toBe(dlHopRecord([10, 20, 300], [310, 320, 900], 40));
    expect((await run("dl-record", "--hop", "10,20,300")).text).toContain("d=NOT MEASURED");
    expect((await run("dl-record", "--hop", "1,x")).code).toBe(2);
    expect(SUBCOMMANDS).toEqual(expect.arrayContaining(["state", "mark", "judge-row", "dl-record", "clean-console"]));
    expect(parseArgs(["scan", "--sock-console", "--what", "console"]).flags).toEqual(["--sock-console"]);
    expect(readDump).toBeDefined();
  });
});

describe("M4 and m3: the stored listener outlives the typed poller, and says so when it never matched", () => {
  const post = (port: number, body: string): Promise<number> => fetch(`http://127.0.0.1:${port}/`, { method: "POST", body, headers: { "Content-Type": "text/plain" } }).then((r) => r.status);
  const refused = (port: number): Promise<boolean> => post(port, "late").then(() => false, () => true);
  it("a POST after the match still gets 204; the port closes only after first POST + --for + 1 s; the verdict was taken at the match", async () => {
    let port = 0;
    let matchedAt = 0;
    const p = storedListen({ expected: "right", timeoutMs: 5000, forMs: 500, onPort: (x) => (port = x), onMatch: (at) => (matchedAt = at) });
    for (let i = 0; i < 100 && port === 0; i++) await new Promise((r) => setTimeout(r, 10));
    const t0 = Date.now();
    expect(await post(port, "old")).toBe(204);
    expect(matchedAt).toBe(0);
    expect(await post(port, "right")).toBe(204);
    expect(matchedAt).toBeGreaterThan(0);
    // the poller sees the restore a moment later: that POST must reach the listener, not a closed port
    await new Promise((r) => setTimeout(r, 150));
    expect(await post(port, "restored")).toBe(204);
    const r = await p;
    expect(Date.now() - t0).toBeGreaterThanOrEqual(500 + STORED_LINGER_MS - 50);
    expect(r).toMatchObject({ match: true, line: "STORED match=yes lines=1", at: matchedAt });
    expect(await refused(port)).toBe(true);
  }, 15_000);
  it("no match: the cancel callback fires at the timeout (not after the linger), the listener still answers until the poller is over", async () => {
    let port = 0;
    let cancelAt = 0;
    const t0 = Date.now();
    const p = storedListen({ expected: "right", timeoutMs: 300, forMs: 400, onPort: (x) => (port = x), onNoMatch: () => (cancelAt = Date.now()) });
    for (let i = 0; i < 100 && port === 0; i++) await new Promise((r) => setTimeout(r, 10));
    await post(port, "other");
    await new Promise((r) => setTimeout(r, 450));
    expect(cancelAt).toBeGreaterThan(0);
    expect(cancelAt - t0).toBeLessThan(900);
    expect(await post(port, "still")).toBe(204);
    const r = await p;
    expect(r).toMatchObject({ match: false, line: "STORED match=no lines=1", at: null });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(400 + STORED_LINGER_MS - 100);
  }, 15_000);
  it("no POST at all: no poller ever ran, so it closes at the timeout without waiting", async () => {
    const t0 = Date.now();
    const r = await storedListen({ expected: "x", timeoutMs: 150, forMs: 5000, onPort: () => undefined });
    expect(r.match).toBe(false);
    expect(Date.now() - t0).toBeLessThan(1500);
  });
  it("B17 stored --cancel writes the file at the no-match timeout, and nothing on a match", async () => {
    writeFileSync(f("e.exp"), "alpha");
    const start = async (name: string, timeout: number): Promise<{ p: Promise<{ code: number; text: string }>; port: number }> => {
      const p = run("stored", "--expected", f("e.exp"), "--port-file", f(`${name}.port`), "--timeout", String(timeout), "--for", "100", "--signal", f(`${name}.sig`), "--cancel", f(`${name}.cancel`));
      for (let i = 0; i < 200 && !existsSync(f(`${name}.port`)); i++) await new Promise((r) => setTimeout(r, 25));
      return { p, port: Number(readFileSync(f(`${name}.port`), "utf8")) };
    };
    const a = await start("c1", 300);
    await post(a.port, "beta");
    const ra = await a.p;
    expect(ra.code).toBe(3);
    expect(existsSync(f("c1.cancel"))).toBe(true);
    expect(existsSync(f("c1.sig"))).toBe(false);
    const b = await start("c2", 3000);
    await post(b.port, "alpha");
    expect((await b.p).code).toBe(0);
    expect(existsSync(f("c2.cancel"))).toBe(false);
    expect(existsSync(f("c2.sig"))).toBe(true);
  }, 15_000);
  it("the call waiting for --go returns cancel at once when the cancel file exists, go when the go file does, and a STOP at the limit", async () => {
    expect(await awaitGo(f("g0.go"), f("g0.cancel"), 100).catch((e: Error) => e.message)).toMatch(/did not come/);
    writeFileSync(f("g1.cancel"), "cancel");
    const t0 = Date.now();
    expect(await awaitGo(f("g1.go"), f("g1.cancel"), 5000)).toBe("cancel");
    expect(Date.now() - t0).toBeLessThan(500);
    writeFileSync(f("g2.go"), "1");
    expect(await awaitGo(f("g2.go"), f("g2.cancel"))).toBe("go");
    setTimeout(() => writeFileSync(f("g3.go"), "1"), 60);
    expect(await awaitGo(f("g3.go"), f("g3.cancel"), 5000)).toBe("go");
  });
});

describe("fixer 3, m3-2: F-FILETAB's hidden row judged over the SDK's tab rows (hidden=blocked, no url, no title)", () => {
  const vis = { url: "http://127.0.0.1:8081/e2e-playground.html", title: "Fixture" };
  it("one hidden=blocked row with no url and no title passes; the line holds labels only", () => {
    const r = judgeFileTabHidden([vis, { hidden: "blocked", url: "", title: "" }, vis]);
    expect(r.verdict.pass).toBe(true);
    expect(r.line).toBe("TABSHIDDEN F-FILETAB rows=3 hidden=1 reason=blocked url=no title=no");
    expect(judgeFileTabHidden([{ hidden: "blocked" }]).verdict.pass).toBe(true);
  });
  it("a url or a title on the hidden row fails, and neither text is printed; hidden=disarmed fails", () => {
    const u = judgeFileTabHidden([vis, { hidden: "blocked", url: "file:///C:/secret/s11b-file.html", title: "" }]);
    expect(u.verdict.pass).toBe(false);
    expect(u.verdict.notMeasured).toBeUndefined();
    expect(u.line).toBe("TABSHIDDEN F-FILETAB rows=2 hidden=1 reason=blocked url=yes title=no");
    const t = judgeFileTabHidden([{ hidden: "blocked", url: "", title: "Private title" }]);
    expect(t.verdict.pass).toBe(false);
    expect(t.line).toContain("title=yes");
    expect(t.line + t.verdict.why).not.toContain("Private");
    expect(u.line + u.verdict.why).not.toContain("secret");
    expect(judgeFileTabHidden([{ hidden: "disarmed", url: "", title: "" }]).verdict.pass).toBe(false);
  });
  it("zero or two hidden rows: NOT MEASURED", () => {
    for (const rows of [[vis], [{ hidden: "blocked" }, { hidden: "blocked" }]]) {
      const r = judgeFileTabHidden(rows);
      expect(r.verdict.pass).toBe(false);
      expect(r.verdict.notMeasured).toBe(true);
    }
  });
  it("B17 filetab prints the TABSHIDDEN line and the judged ROW (no URL, no title); --dry connects to nothing", async () => {
    expect(SUBCOMMANDS).toContain("filetab");
    out = [];
    expect(await main(["filetab", "--dry"])).toBe(0);
    expect(out).toEqual(["PLAN filetab ok reads the tab list; prints labels and counts only"]);
    const report = async (rows: Parameters<typeof reportFileTabRows>[0]): Promise<{ text: string }> => {
      out = [];
      reportFileTabRows(rows);
      return { text: out.join("\n") };
    };
    const p = await report([{ hidden: "blocked", url: "", title: "" }]);
    expect(p.text).toContain("TABSHIDDEN F-FILETAB rows=1 hidden=1 reason=blocked url=no title=no");
    expect(p.text).toContain("ROW F-FILETAB tabs hidden row PASS: the one hidden row is hidden=blocked with no url and no title");
    const f = await report([{ hidden: "blocked", url: "x", title: "" }]);
    expect(f.text).toContain("ROW F-FILETAB tabs hidden row FAIL: the hidden row has a url");
    const n = await report([]);
    expect(n.text).toContain("ROW F-FILETAB tabs hidden row NOT MEASURED: 0 hidden rows, not exactly one");
  });
});
