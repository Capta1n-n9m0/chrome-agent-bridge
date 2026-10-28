// Step 12 S7-helpers-c: line forms (21)-(24), (26), (27), (30), (33) of docs/e2e-test-plan.md section 4.27, compared by key and order with the sheet's
// own paragraphs (parsed at test time), and the old-build swap over an injected I/O. No Chrome, daemon or port; the repo is never touched.
import { rmdirSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import * as C from "../s12-forms-c.js";
import * as W from "../s12-oldbuild.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = readFileSync(join(REPO, "docs", "e2e-test-plan.md"), "utf8").replace(/\r\n/g, "\n");
const SEC = DOC.slice(DOC.indexOf("### 4.27 R19 rows"));
const para = (start: string): string => { const i = SEC.indexOf(start); return SEC.slice(i, SEC.indexOf("\n", i)); };
const PART_B = para("**Line forms (part B).**");
const BANNER = para("**Banner rule and the line forms added by fix round 1.**");

/** The k-th backticked `WORD key=...` template of item n, searched in the paragraph that holds the item. */
function template(n: number, k = 0): string {
  const body = n === 33 ? BANNER.slice(BANNER.indexOf("**New forms**")) : PART_B.slice(PART_B.indexOf("**New in part B**"));
  const at = [...body.matchAll(/\((\d{1,2})\) `/g)].map((m) => ({ n: Number(m[1]), i: m.index! }));
  const j = at.findIndex((a) => a.n === n);
  const item = body.slice(at[j]!.i, at[j + 1]?.i ?? body.length);
  const all = [...item.matchAll(/`([A-Z][A-Z0-9]+ [^`]*=[^`]*)`/g)].map((m) => m[1]!);
  return all[k]!.replace("<helper's name>", "<name>");
}
function tokRe(tok: string): RegExp {
  let t = tok.replace(/<(?:ms|n|slice|row|label|name|[a-z]\d?)>/g, "\u0001");
  t = t.replace(/<([^<>]*)>/g, (_m, g: string) => `\u0003${g.split("|").join("\u0004")}\u0005`);
  t = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/CODE/g, "[A-Z][A-Z_]*");
  t = t.replace(/\u0001/g, "[\\w.-]+").replace(/\u0003/g, "(?:").replace(/\u0004/g, "|").replace(/\u0005/g, ")");
  return new RegExp(`^${t}$`);
}
const matches = (tpl: string, line: string): boolean => {
  const t = tpl.split(" "); const o = line.split(" ");
  return t.length === o.length && t.every((tt, i) => tokRe(tt).test(o[i]!));
};
const ok = (n: number, line: string, k = 0): void => { expect(matches(template(n, k), line), `${line} vs ${template(n, k)}`).toBe(true); };
const bad = (n: number, line: string, k = 0): void => { expect(matches(template(n, k), line), `${line} must not match ${template(n, k)}`).toBe(false); };

describe("the sheet's forms are found, and a stub fails the matcher", () => {
  it("each item's template starts with the form's name", () => {
    const names: Record<number, string> = { 21: "CHOOSE", 22: "DIALOG", 23: "LATE", 24: "HUMAN", 26: "G2", 27: "VERSIONCH", 30: "DIALOGS", 33: "CLOSERPROBE" };
    for (const [n, w] of Object.entries(names)) expect(template(Number(n)).split(" ")[0], `item ${n}`).toBe(w);
    expect(template(26, 1).split(" ")[0]).toBe("G2TYPE");
  });
  it("a swapped key, a missing key and a text where a count belongs fail", () => {
    bad(22, "DIALOG R leg=a after-click=1 before=0 after-close=0 ms=5 change=0");
    bad(22, "DIALOG R leg=a before=0 after-click=1 after-close=0 ms=5");
    bad(24, "HUMAN R received=some dialog=1 files=0");
    bad(23, "LATE R opener-ms=5000 opened=yes dialog=0");
  });
});

describe("(21)-(24), (26), (27), (30), (33) print the sheet's keys in its order", () => {
  it("CHOOSE", () => {
    const l = C.chooseLine("R19-CHOOSE-1", "c1", { answer: "ok", exact: null, files: 1, change: 1, clicks: 1, bytesEqual: true, dialog: 0, ms: 812 });
    expect(l).toBe("CHOOSE R19-CHOOSE-1 c1 ok exact=n/a files=1 change=1 clicks=1 bytes-equal=yes dialog=0 ms=812");
    ok(21, l);
    ok(21, C.chooseLine("R19-CHOOSE-REFUSE", "picker", { answer: "BAD_PARAMS", exact: true, files: 0, change: 0, clicks: 1, bytesEqual: null, dialog: 0, ms: 90 }));
  });
  it("DIALOG", () => {
    const l = C.dialogLine("R19-CHOOSE-4", { leg: "a", before: 0, afterClick: 1, afterClose: 0, ms: 640, change: 0 });
    expect(l).toBe("DIALOG R19-CHOOSE-4 leg=a before=0 after-click=1 after-close=0 ms=640 change=0");
    ok(22, l);
  });
  it("LATE and HUMAN", () => {
    ok(23, C.lateLine("R19-CHOOSE-3", { openerMs: 5100, opened: false, dialog: 0 }));
    ok(24, C.humanLine("R19-CHOOSE-H", { received: "clicked-input", dialog: 0, files: 0 }));
    for (const r of ["call-target", "clicked-input", "none"] as const) ok(24, C.humanLine("R", { received: r, dialog: 1, files: 0 }));
  });
  it("G2 and G2TYPE (lost = sent - got)", () => {
    ok(26, C.g2Line("R19-G2-1", { aReplyMs: 410, bReplyMs: 455, gapMs: 45, holderAfterReplyMs: 100, aEffect: 1, b: "ok" }));
    ok(26, C.g2Line("R19-G2-1", { aReplyMs: 410, bReplyMs: 455, gapMs: 45, holderAfterReplyMs: 100, aEffect: 1, b: "LOCK_TIMEOUT" }));
    const t = C.g2typeLine({ round: 2, got: 37, bCalls: 6, bOk: 5, bLockTimeout: 1 });
    expect(t).toBe("G2TYPE round=2 sent=40 got=37 lost=3 b-calls=6 b-ok=5 b-lock-timeout=1");
    ok(26, t, 1);
    expect(() => C.g2typeLine({ round: 1, got: 41, bCalls: 0, bOk: 0, bLockTimeout: 0 })).toThrow();
  });
  it("VERSIONCH, DIALOGS, CLOSERPROBE", () => {
    ok(27, C.versionchLine("R19-VERSION", { leg: "raw", code: "VERSION", hint: true, files: 0, exact: true }));
    ok(27, C.versionchLine("R19-VERSION", { leg: "control", code: "ok", hint: false, files: 1, exact: false }));
    ok(30, C.dialogsLine("liveC19", { native: 0, devtools: 0, waveWindowsOpen: 1 }));
    const p = C.closerprobeLine("uia-owner", { opened: true, closed: true, ms: 233, nativeAfter: 0 });
    expect(p).toBe("CLOSERPROBE method=uia-owner opened=yes closed=yes ms=233 native-after=0");
    ok(33, p);
    ok(33, C.closerprobeLine("uia-owner", { opened: false, closed: null, ms: 0, nativeAfter: 0 }));
  });
  it("a text, a negative or a fractional value is refused (a value is a count or a fixed code)", () => {
    expect(() => C.chooseLine("R", "c1", { answer: "some text with spaces", exact: true, files: 0, change: 0, clicks: 0, bytesEqual: null, dialog: 0, ms: 1 })).toThrow();
    expect(() => C.dialogsLine("s", { native: -1, devtools: 0, waveWindowsOpen: 0 })).toThrow();
    expect(() => C.dialogsLine("s", { native: 1.5, devtools: 0, waveWindowsOpen: 0 })).toThrow();
    expect(() => C.closerprobeLine("C:\\path", { opened: true, closed: true, ms: 1, nativeAfter: 0 })).toThrow();
    expect(() => C.lateLine("R", { openerMs: 5000 as 4900, opened: true, dialog: 0 })).toThrow();
  });
  it("the closer probe's verdict: pass, NOT MEASURED on opened=no, STOP dialog-left-open otherwise", () => {
    expect(C.closerprobeVerdict({ opened: true, closed: true, nativeAfter: 0 })).toBe("pass");
    expect(C.closerprobeVerdict({ opened: false, closed: null, nativeAfter: 0 })).toBe("not-measured");
    expect(C.closerprobeVerdict({ opened: true, closed: false, nativeAfter: 1 })).toBe("STOP dialog-left-open");
    expect(C.closerprobeVerdict({ opened: true, closed: true, nativeAfter: 1 })).toBe("STOP dialog-left-open");
    expect(C.closerprobeVerdict({ opened: false, closed: null, nativeAfter: 1 })).toBe("STOP dialog-left-open");
    expect(C.CLOSER_WATCHDOG_MS).toBe(5000);
  });
});

// ---- the old-build swap ------------------------------------------------------------------------------------------------
const COMMIT = "3ab9207";
interface Fake { calls: string[]; io: W.SwapIO; links: string[]; failOn: Set<string>; copyThrows: boolean }
function fake(): Fake {
  const f: Fake = { calls: [], links: [], failOn: new Set(), copyThrows: false, io: null as unknown as W.SwapIO };
  const key = (cmd: string, args: string[]): string => `${cmd.replace(/\.cmd$/, "")} ${args.join(" ")}`;
  f.io = {
    run(cmd, args, cwd) {
      const k = key(cmd, args);
      f.calls.push(`${k} @${cwd}`);
      if (cmd === "cmd" && args[0] === "/c" && args[1] === "rmdir") f.links = f.links.filter((l) => l !== args[2]);
      return { code: [...f.failOn].some((x) => k.startsWith(x)) ? 1 : 0 };
    },
    reparsePoints: () => [...f.links],
    replaceDir(src, dst) { f.calls.push(`replace ${src} -> ${dst}`); if (f.copyThrows) throw new Error("copy"); },
  };
  return f;
}
const REPO_DIR = "C:\\repo";
const TMP = "C:\\Temp\\scratch";
const OPTS = { repo: REPO_DIR, commit: COMMIT, tmp: TMP };
const WT = W.worktreePath(TMP, COMMIT);
const idx = (f: Fake, s: string): number => f.calls.findIndex((c) => c.startsWith(s));

describe("the old-build swap (decisions #356 (2))", () => {
  it("paths: the worktree is outside the repo, named by the commit; a bad commit is refused", () => {
    expect(WT.startsWith(TMP)).toBe(true);
    expect(WT.startsWith(REPO_DIR)).toBe(false);
    expect(W.distOf(REPO_DIR)).toBe(join(REPO_DIR, "extension", "dist"));
    for (const c of ["", "HEAD", "3ab9207; rm", "../x", "3AB9207"]) expect(() => W.worktreePath(TMP, c), c).toThrow();
  });
  it("the happy path: worktree add, its own npm ci, its build, copy over dist, worktree removed after its links; the OLD build stays in dist (no HEAD rebuild)", () => {
    const f = fake(); f.links = [join(WT, "node_modules", "@scope", "a")];
    const r = W.swapOldBuild(f.io, OPTS);
    expect(r.restored).toBe(false); expect(r.worktreeRemoved).toBe(true);
    expect(f.calls[0]).toBe(`git worktree add --detach ${WT} ${COMMIT} @${REPO_DIR}`);
    expect(f.calls[1]).toBe(`npm ci @${WT}`);
    expect(f.calls[2]).toBe(`npm run build @${WT}`);
    expect(f.calls[3]).toBe(`replace ${W.distOf(WT)} -> ${W.distOf(REPO_DIR)}`);
    expect(f.calls.some((c) => c === `npm run build @${REPO_DIR}`)).toBe(false);
    expect(f.calls.findIndex((c) => c.startsWith("replace"))).toBe(3);
    expect(idx(f, "cmd /c rmdir")).toBeGreaterThan(3);
    expect(linksFirst(f)).toBe(true);
    expect(f.calls.some((c) => /junction|mklink|node_modules.*->/.test(c))).toBe(false);
  });
  const restoreRan = (f: Fake): boolean => f.calls.some((c) => c === `npm run build @${REPO_DIR}`);
  it("restoreHead (the runner's end-of-slice call) rebuilds HEAD at the repo and reports its result", () => {
    const f = fake();
    expect(W.restoreHead(f.io, REPO_DIR)).toBe(true);
    expect(f.calls).toEqual([`npm run build @${REPO_DIR}`]);
    f.failOn.add("npm run build");
    expect(W.restoreHead(f.io, REPO_DIR)).toBe(false);
  });
  it("the worktree path must lie outside the repo: refused before any command runs", () => {
    for (const tmp of [REPO_DIR, join(REPO_DIR, "scratch")]) {
      const f = fake();
      expect(() => W.swapOldBuild(f.io, { repo: REPO_DIR, commit: COMMIT, tmp }), tmp).toThrow(/outside the repo/);
      expect(f.calls, tmp).toEqual([]);
    }
  });
  it("the restore runs when the copy throws, and the error comes out after it", () => {
    const f = fake(); f.copyThrows = true;
    expect(() => W.swapOldBuild(f.io, OPTS)).toThrow("copy");
    expect(restoreRan(f)).toBe(true);
    expect(idx(f, "git worktree remove")).toBeGreaterThan(idx(f, `npm run build @${REPO_DIR}`));
  });
  it("a failure before dist is touched (npm ci, build) does no restore and touches no dist", () => {
    for (const bad of ["npm ci", "npm run build"]) {
      const f = fake(); f.failOn.add(bad);
      expect(() => W.swapOldBuild(f.io, OPTS)).toThrow();
      expect(restoreRan(f), bad).toBe(false);
      expect(f.calls.some((c) => c.startsWith("replace")), bad).toBe(false);
      expect(idx(f, "git worktree remove"), bad).toBeGreaterThan(-1);
    }
  });
  it("a failed worktree add removes nothing and runs no restore", () => {
    const f = fake(); f.failOn.add("git worktree add");
    expect(() => W.swapOldBuild(f.io, OPTS)).toThrow();
    expect(f.calls.length).toBe(1);
  });
  it("a failed restore is the STOP old-build-left-loaded", () => {
    const f = fake(); f.copyThrows = true;
    const real = f.io.run;
    f.io.run = (c, a, cwd) => (cwd === REPO_DIR && a[0] === "run" ? { code: 1 } : real(c, a, cwd));
    expect(() => W.swapOldBuild(f.io, OPTS)).toThrow(/old-build-left-loaded/);
  });
  it("a link that cmd rmdir cannot remove stops the worktree removal (nothing is deleted through it) and is an error, not a silent flag", () => {
    const f = stuckLink();
    expect(() => W.swapOldBuild(f.io, OPTS)).toThrow(/worktree could not be removed/);
    expect(gitSkipped(f)).toBe(true);
  });
  it("removeWorktree removes every link first (cmd rmdir), in order, then git worktree remove", () => {
    const f = fake(); f.links = [join(WT, "a"), join(WT, "b")];
    expect(W.removeWorktree(f.io, REPO_DIR, WT)).toBe(true);
    expect(f.calls.map((c) => c.split(" @")[0])).toEqual([`cmd /c rmdir ${join(WT, "a")}`, `cmd /c rmdir ${join(WT, "b")}`, `git worktree remove --force ${WT}`]);
  });
  it("MUTANT: a swap that skips the restore on a throw goes red", async () => {
    const m = await loadMutant("    if (touched && failure !== null) {", "    if (false) {");
    const f = fake(); f.copyThrows = true;
    try { m.swapOldBuild(f.io, OPTS); } catch { /* the throw is the point */ }
    expect(restoreRan(f)).toBe(false);
  });
  it("MUTANT: a swap that removes the worktree without removing its links first goes red", async () => {
    const m = await loadMutant('  for (const link of io.reparsePoints(wt)) io.run("cmd", ["/c", "rmdir", link], repo);\n', "");
    const f = fake(); f.links = [join(WT, "node_modules", "x")];
    m.removeWorktree(f.io, REPO_DIR, WT);
    expect(linksFirst(f)).toBe(false);
  });
  it("MUTANT: a swap that lets git delete a worktree that still holds a link goes red", async () => {
    const m = await loadMutant("  if (io.reparsePoints(wt).length > 0) return false;\n", "");
    const f = stuckLink();
    m.removeWorktree(f.io, REPO_DIR, WT);
    expect(gitSkipped(f)).toBe(false);
  });
});
const linksFirst = (f: Fake): boolean => idx(f, "cmd /c rmdir") > -1 && idx(f, "cmd /c rmdir") < idx(f, "git worktree remove");
function stuckLink(): Fake {
  const f = fake(); f.links = [join(WT, "node_modules", "x")];
  const run = f.io.run; f.io.run = (c, a, cwd) => (c === "cmd" ? (f.calls.push(`${c} ${a.join(" ")} @${cwd}`), { code: 1 }) : run(c, a, cwd));
  return f;
}
const gitSkipped = (f: Fake): boolean => idx(f, "git worktree remove") === -1;
async function loadMutant(from: string, to: string): Promise<typeof W> {
  const src = readFileSync(join(REPO, "recipes", "s12-oldbuild.ts"), "utf8").replace(/\r\n/g, "\n");
  expect(src.split(from).length, `mutant anchor: ${from}`).toBe(2);
  const f = join(REPO, "recipes", "test", `_mut-oldbuild-${process.pid}-${Math.random().toString(36).slice(2)}.ts`);
  writeFileSync(f, src.replace(from, to));
  try { return (await import(pathToFileURL(f).href)) as typeof W; } finally { rmSync(f, { force: true }); }
}

describe("the real swap I/O never follows a link", () => {
  it("reparsePoints finds a junction and does not descend; replaceDir refuses a dist that holds one and deletes nothing", () => {
    const d = mkdtempSync(join(tmpdir(), "s12ob-"));
    try {
      const target = join(d, "target"); mkdirSync(target); writeFileSync(join(target, "keep.txt"), "x");
      const dst = join(d, "dist"); mkdirSync(dst); writeFileSync(join(dst, "a.js"), "y");
      symlinkSync(target, join(dst, "link"), "junction");
      const io = W.realSwapIO();
      expect(io.reparsePoints(dst)).toEqual([join(dst, "link")]);
      const src = join(d, "src"); mkdirSync(src); writeFileSync(join(src, "n.js"), "z");
      expect(() => io.replaceDir(src, dst)).toThrow(/link/);
      expect(existsSync(join(target, "keep.txt"))).toBe(true);
      expect(existsSync(join(dst, "a.js"))).toBe(true);
      rmdirSync(join(dst, "link")); // removes the junction only (Node unlinks a junction, never its target)
      io.replaceDir(src, dst);
      expect(existsSync(join(dst, "n.js"))).toBe(true);
      expect(existsSync(join(dst, "a.js"))).toBe(false);
      expect(existsSync(join(target, "keep.txt"))).toBe(true);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});
