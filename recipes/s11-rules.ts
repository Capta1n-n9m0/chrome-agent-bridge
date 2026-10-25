// recipes/s11-rules.ts — the pure half of Run 16's helpers (Step 11 S5-rules; docs/e2e-test-plan.md §4.23). String
// builders and judges only: no SDK call, no I/O, no process, no clock, no random. The actor (S5-actor) and the
// PowerShell driver (S5-driver) print what these functions decide. Every expected text in `K` is copied from the
// sheet's "Expected texts" table; recipes/test/s11-rules.test.ts quotes the sheet literally and ties each text to the
// product constant it came from, so a wording change fails there first (recipes/CLAUDE.md, last gotcha).
//
// Never printed (sheet, pass rules): the token, block-list / Upload-folders text, a profile path, the sentinel's
// name, hashes of the safety state. These functions return counts and equal/DIFFERENT, never those values.
import { parseUploadFolders, uploadPathsAllowed } from "../extension/src/upload-paths.js";

export interface Judged {
  pass: boolean;
  why: string;
  notMeasured?: boolean;
}
const ok = (why: string): Judged => ({ pass: true, why });
const bad = (why: string): Judged => ({ pass: false, why });
const nm = (why: string): Judged => ({ pass: false, notMeasured: true, why });

export interface Obs {
  code: string;
  message: string;
  data?: unknown;
}
export interface FileWant {
  name: string;
  bytes: number;
  sha256: string;
}

export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA_RE = /^[0-9a-f]{64}$/;
export const NOT_RUN_G11_3 = "NOT RUN — waits for G11-3";
export const TOGGLE_ON_FA = "not run — the toggle is on";
export const UP_CLICK_LINE = "UP-CLICK not run (#251): no proven safe way to close the native file dialog";

// ── the sheet's "Expected texts" table ───────────────────────────────────────────────────────────────────────

export const K = Object.freeze({
  "K-gate": { code: "UPLOAD_REFUSED", message: "That file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders); the bridge will not upload it. Ask the user." },
  "K-noacc": { code: "UPLOAD_REFUSED", message: "Chrome does not allow this extension to read local files (chrome://extensions → Chrome Agent Bridge → Details → Allow access to file URLs), so the bridge cannot upload. Ask the user." },
  "K-notarget": { code: "BAD_PARAMS", message: "uploadFiles needs a ref or a locator naming the file input" },
  "K-notinput": { code: "BAD_PARAMS", message: "not a file input: target an <input type=file>, a <label> for one, or an element with exactly one file input inside" },
  "K-many": { code: "BAD_PARAMS", message: "the target holds more than one file input; target one of them" },
  "K-disabled": { code: "BAD_PARAMS", message: "the file input is disabled" },
  "K-dir": { code: "BAD_PARAMS", message: "the file input takes a folder (webkitdirectory); the bridge uploads files only" },
  "K-single": { code: "BAD_PARAMS", message: "the file input takes one file, and more than one path was given" },
  "K-missing": { code: "BAD_PARAMS", message: "upload: paths[0] does not exist" },
  "K-relative": { code: "BAD_PARAMS", message: "upload: paths[0] is not an absolute path — pass an absolute file path" },
  "K-devt": { code: "DEBUGGER_DEVTOOLS", message: "Chrome DevTools (or another extension) is already attached to this tab — Chrome allows one debugger per tab. Close DevTools on that tab and retry." },
  "K-disarmed": { code: "DISARMED", message: "The user has turned the bridge off in Chrome, so every page call is refused. Stop and ask the user to turn it back on; do not retry.", data: { scope: "all" } },
  "K-blocked": { code: "DOMAIN_BLOCKED", message: "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user." },
  "K-undef": { code: "BAD_PARAMS", message: "The value is undefined — nothing to save" },
  "K-node": { code: "BAD_PARAMS", message: "The value is a DOM node, which is not saveable — return its text or HTML (e.g. el.outerHTML)" },
  "K-map": { code: "BAD_PARAMS", message: "The value is a Map, which JSON turns into {} — not saveable; convert it first (e.g. Object.fromEntries(map))" },
  "K-cycle": { code: "PAGE_ERROR", message: "JSON.stringify threw on the value in the page (a cycle, a BigInt, or a throwing toJSON or getter) — nothing was saved", data: { name: "TypeError" } },
  // options page texts (strings, not errors)
  "K-opt-stand": "An agent may upload any file inside these folders to any site it can open. Allow only folders that hold files you mean to share. Never allow your home folder, or any folder that holds bridge.token or a .ssh folder. An agent that can also run programs on this computer can put any file into an allowed folder.",
  "K-opt-root": "a whole drive or the filesystem root is never allowed",
  "K-opt-rel": "not an absolute folder path: write it from the drive letter (C:\\…) or from / (/home/…)",
  "K-opt-home": "a home folder, or a folder that holds home folders: every file in it (keys, tokens, documents) could be uploaded",
});
export type ErrKey = Exclude<keyof typeof K, `K-opt-${string}`>;

/** K-mcp-up: the MCP line for UPLOAD_REFUSED (isError). */
export const MCP_UP_LINE =
  "UPLOAD_REFUSED: the bridge will not upload that file — either it is not in a folder the user allows for uploads in Chrome (extension options → Upload folders), or the user has not turned on \"Allow access to file URLs\" for the extension (chrome://extensions → the extension's Details). Stop and ask the user; do not retry with another path.";
/** K-mcp-ok: one text item; file names only, no directory part (#262). */
export function mcpOkText(target: string, files: readonly FileWant[]): string {
  return [`Uploaded ${files.length} file(s) to ${target}:`, ...files.map((f) => `${f.name} · ${f.bytes} bytes · sha256 ${f.sha256}`)].join("\n");
}

/** Exact code, message and data (a missing `data` must be missing). */
export function judgeError(obs: Obs | undefined, key: ErrKey): Judged {
  if (obs === undefined) return bad(`${key}: the call did not fail`);
  const want: Obs = K[key];
  if (obs.code !== want.code) return bad(`${key}: code ${obs.code}, want ${want.code}`);
  if (obs.message !== want.message) return bad(`${key}: message differs from the sheet's text`);
  if (JSON.stringify(obs.data) !== JSON.stringify(want.data)) return bad(`${key}: data ${JSON.stringify(obs.data)}, want ${JSON.stringify(want.data)}`);
  return ok(`${key}: exact`);
}

// ── what the page's reporter saw ─────────────────────────────────────────────────────────────────────────────

export interface PageObs {
  files: FileWant[];
  change: number;
  input: number;
  trusted: boolean[];
  /** MutationObserver on data-__bridge-upload: attributes added / removed; carriers left in light DOM, shadow roots, frames. */
  markAdded: number;
  markRemoved: number;
  carriersLeft: number;
}

/** Every refusal row: 0 files, no change, no input, and the mark never set (or, for UP-DEVT, added then removed). */
export function refusalPageJudge(p: PageObs, mark: "never-set" | "set-and-removed" = "never-set"): Judged {
  if (p.files.length !== 0) return bad(`page holds ${p.files.length} file(s), want 0`);
  if (p.change !== 0 || p.input !== 0) return bad(`page saw change=${p.change} input=${p.input}, want none`);
  if (p.carriersLeft !== 0) return bad(`${p.carriersLeft} mark carrier(s) left`);
  if (mark === "never-set") return p.markAdded === 0 && p.markRemoved === 0 ? ok("page untouched, mark never set") : bad(`mark was set (added ${p.markAdded}, removed ${p.markRemoved})`);
  return p.markAdded >= 1 && p.markAdded === p.markRemoved ? ok("page untouched, mark added then removed") : bad(`mark added ${p.markAdded}, removed ${p.markRemoved}, want added then removed`);
}

/** The standard upload clauses: files in order with their hashes, trusted change events, the mark added then removed. */
export function uploadPageJudge(p: PageObs, want: readonly FileWant[], o: { changes?: number; pairs?: number } = {}): Judged {
  const changes = o.changes ?? 1;
  const pairs = o.pairs ?? 1;
  if (p.files.length !== want.length) return bad(`page received ${p.files.length} file(s), want ${want.length}`);
  for (let i = 0; i < want.length; i++) {
    const a = p.files[i]!;
    const w = want[i]!;
    if (a.name !== w.name || a.bytes !== w.bytes) return bad(`file ${i + 1}: name or size differs`);
    if (a.sha256 !== w.sha256) return bad(`file ${i + 1}: page SHA-256 differs from the file's`);
  }
  if (p.change !== changes) return bad(`change events ${p.change}, want ${changes}`);
  if (p.trusted.length !== changes || !p.trusted.every((t) => t === true)) return bad("a change event was not isTrusted");
  if (p.markAdded !== pairs || p.markRemoved !== pairs) return bad(`mark added ${p.markAdded} removed ${p.markRemoved}, want ${pairs} each`);
  if (p.carriersLeft !== 0) return bad(`${p.carriersLeft} mark carrier(s) left`);
  return ok("files, hashes, isTrusted and mark clauses hold");
}

export interface StepObs {
  err?: Obs;
  page: PageObs;
  banner?: boolean;
}
export interface StepDef {
  step: string;
  key: ErrKey;
}
/** Per step: exact error, refusal page clauses, and (opts.banner) no banner. A missing observation fails. */
export function refusalSteps(steps: readonly StepDef[], obs: readonly StepObs[], o: { banner?: boolean; mark?: "never-set" | "set-and-removed" }): Array<{ step: string; j: Judged }> {
  return steps.map((s, i) => {
    const x = obs[i];
    if (x === undefined) return { step: s.step, j: bad("no observation") };
    const j = [judgeError(x.err, s.key), refusalPageJudge(x.page, o.mark), o.banner && x.banner ? bad("banner seen on a refusal") : ok("no banner")].find((c) => !c.pass);
    return { step: s.step, j: j ?? ok(`${s.key}: exact, page untouched`) };
  });
}

export const UP6_STEPS: readonly StepDef[] = Object.freeze([
  { step: "outside", key: "K-gate" },
  { step: "missing", key: "K-missing" },
  { step: "relative", key: "K-relative" },
  { step: "raw-dotdot", key: "K-gate" },
  { step: "raw-notarget", key: "K-notarget" },
]);
export const UP7_LEGS: readonly StepDef[] = Object.freeze([
  { step: "a-disarmed", key: "K-disarmed" },
  { step: "b-blocked", key: "K-blocked" },
  { step: "c-folder-removed", key: "K-gate" },
]);
export const UP6B_STEPS: readonly StepDef[] = Object.freeze([
  { step: "text-input", key: "K-notinput" },
  { step: "two-paths", key: "K-single" },
  { step: "disabled", key: "K-disabled" },
  { step: "directory", key: "K-dir" },
  { step: "two-inputs", key: "K-many" },
]);

/** UP-DEVT: K-devt with the mark added then removed; a success is NOT MEASURED ("DevTools was not attached"). */
export function devtVerdict(x: StepObs): Judged {
  if (x.err === undefined) return nm("DevTools was not attached (the call succeeded)");
  return [judgeError(x.err, "K-devt"), refusalPageJudge(x.page, "set-and-removed")].find((c) => !c.pass) ?? ok("K-devt exact, mark added then removed");
}

// ── UP-L1 / UP-0: the preflight and the found state ──────────────────────────────────────────────────────────

export interface Foundcheck {
  root: boolean;
  outside: boolean;
  line: string;
  stop: boolean;
}
/** Runs the two probe paths through the gate's own matcher (imported, never copied). */
export function foundcheck(foundText: string, root: string, outside: string): Foundcheck {
  const folders = parseUploadFolders(foundText);
  const r = uploadPathsAllowed([`${root}\\s11-1k.bin`], folders);
  const o = uploadPathsAllowed([`${outside}\\s11-out.bin`], folders);
  return { root: r, outside: o, stop: r || o, line: `FOUNDCHECK root=${r ? "allowed" : "not"} outside=${o ? "allowed" : "not"}` };
}

export interface BoxState {
  armed: boolean;
  evaluate: boolean;
  blocklist: { lines: number; sha256: string };
  uploadfolders: { lines: number; sha256: string };
}
const shaPart = (sha: string): string => (sha === EMPTY_SHA256 ? ` sha256=${EMPTY_SHA256}` : "");
/** Hashes are withheld unless the text is empty (the empty text's hash is a public constant). */
export function stateLine(s: BoxState): string {
  return `STATE armed=${s.armed} evaluate=${s.evaluate} blocklist lines=${s.blocklist.lines}${shaPart(s.blocklist.sha256)} uploadfolders lines=${s.uploadfolders.lines}${shaPart(s.uploadfolders.sha256)}`;
}
export function foundStateGuard(s: BoxState): { ok: boolean; line: string } {
  return s.armed && s.evaluate ? { ok: true, line: "" } : { ok: false, line: "STOP: the found state is not armed with JavaScript on" };
}
export function toggleLine(r: "on" | "off"): string {
  return `TOGGLE reading ${r}`;
}
export const UP_WAITING_ROWS: readonly string[] = Object.freeze([
  "UP-1", "UP-2", "UP-3", "UP-4", "UP-5", "UP-6B", "UP-8", "UP-9", "UP-PATCH", "UP-TWICE", "UP-RAW", "UP-NAV", "UP-DEVT", "UP-STALE", "UP-7J", "UP-RACE-A", "UP-RACE-B",
]);
/** G11-3 branch: ON → liveB runs, UP-FA not run; OFF → UP-FA runs and 17 rows are NOT RUN; unreadable → STOP. */
export function liveBPlan(reading: "on" | "off" | "unreadable"): { liveB: boolean; fa: "run" | typeof TOGGLE_ON_FA; stop: boolean; count: number; lines: string[] } {
  if (reading === "on") return { liveB: true, fa: TOGGLE_ON_FA, stop: false, count: 0, lines: [] };
  const lines = reading === "off" ? UP_WAITING_ROWS.map((r) => `${r} ${NOT_RUN_G11_3}`) : [];
  return { liveB: false, fa: "run", stop: reading === "unreadable", count: lines.length, lines };
}

/** UP-L1's build proof: daemon.status.build equals the sha256 of daemon/dist/index.js. */
export function buildJudge(statusBuild: string, distSha256: string): Judged {
  return statusBuild === distSha256 ? ok("daemon build = sha256 of daemon/dist/index.js") : bad("daemon build differs from daemon/dist/index.js");
}

// ── UP-RESTORE: read-back by count and hash, nothing printed ─────────────────────────────────────────────────

const eq = (b: boolean): string => (b ? "equal" : "DIFFERENT");
export function restoreLine(found: BoxState, now: BoxState): string {
  const part = (n: string, f: BoxState["blocklist"], c: BoxState["blocklist"]): string => `${n} lines=${f.lines === c.lines ? f.lines : `${f.lines}->${c.lines}`} hash=${eq(f.sha256 === c.sha256)}`;
  return `RESTORE armed=${eq(found.armed === now.armed)} evaluate=${eq(found.evaluate === now.evaluate)} ${part("blocklist", found.blocklist, now.blocklist)} ${part("uploadfolders", found.uploadfolders, now.uploadfolders)}`;
}
export function restoreVerdict(found: BoxState, now: BoxState): Judged {
  const diff: string[] = [];
  if (found.armed !== now.armed) diff.push("armed");
  if (found.evaluate !== now.evaluate) diff.push("evaluate");
  for (const k of ["blocklist", "uploadfolders"] as const) {
    if (!SHA_RE.test(found[k].sha256) || !SHA_RE.test(now[k].sha256)) diff.push(`${k} (hash unreadable)`);
    else if (found[k].sha256 !== now[k].sha256) diff.push(`${k} hash`);
    if (found[k].lines !== now[k].lines) diff.push(`${k} count`);
  }
  return diff.length === 0 ? ok("armed, evaluate, block list and Upload folders equal to UP-0 by count and hash") : bad(`STOP: not restored: ${diff.join(", ")}`);
}

// ── UP-1 .. UP-9 and the record rows ─────────────────────────────────────────────────────────────────────────

export interface Up1In {
  call: "ok" | Obs;
  knownBehind: boolean;
  toggle: "on" | "off";
  page: PageObs;
  files: readonly FileWant[];
  tabActiveAfter: boolean;
  humanTabUnchanged: boolean;
  banner4s: boolean;
}
/** The sheet's UP-1 outcome table (0.6), branch by branch. */
export function up1Outcome(i: Up1In): { outcome: string; judged: Judged } {
  const r = (outcome: string, judged: Judged): { outcome: string; judged: Judged } => ({ outcome, judged });
  if (!i.knownBehind) return r("not measured", nm("the tab was not known to be behind before the call"));
  if (i.call !== "ok") {
    if (i.call.code === K["K-noacc"].code && i.call.message === K["K-noacc"].message && i.toggle === "on") return r("refused", bad("FAIL: UP-0's reading is contradicted"));
    return r("refused", bad(`FAIL: call refused with ${i.call.code}`));
  }
  if (i.page.files.length === 0) return r("ok, page received nothing", bad("FAIL: ok and the page received nothing; proposed decision for the user: focus first, as trusted input"));
  const pj = uploadPageJudge(i.page, i.files);
  if (!pj.pass) return r("wrong", bad(`FAIL: ${pj.why}`));
  if (i.tabActiveAfter) return r("wrong", bad("FAIL: the tab became active"));
  if (!i.humanTabUnchanged) return r("wrong", bad("FAIL: the human's tab changed"));
  if (!i.banner4s) return r("received on a background tab: no focus needed", bad("FAIL recorded: no banner within 4 s (the tool description's 'shows briefly' is unsupported by this run)"));
  return r("received on a background tab: no focus needed", ok("received on a background tab, hash equal, isTrusted, tab still behind, human's tab unchanged, banner seen"));
}

/** UP-2's files in order; the sha256 of the 5 MiB and 50 MiB files is recorded when the wave makes them. */
export const UP2_SPEC: readonly { name: string; bytes: number }[] = Object.freeze([
  { name: "s11-0b.bin", bytes: 0 },
  { name: "s11-5m.bin", bytes: 5242880 },
  { name: "s11-50m.bin", bytes: 52428800 },
]);
export const CDP_BOUND_MS = 15000;
export const durationNote = (ms: number): string => `call took ${ms} ms (CDP bound ${CDP_BOUND_MS} ms, #268; recorded, never retuned)`;

export interface McpTurn {
  text: string;
  isError: boolean;
  calls: string[];
  page: PageObs;
}
/** UP-5: turn 1 the exact one-item answer (K-mcp-ok); turn 2 K-mcp-up with isError. Calls exactly the one tool. */
export function up5Verdict(t1: McpTurn, t2: McpTurn, sent: FileWant): Array<{ step: string; j: Judged }> {
  const only = (t: McpTurn): boolean => t.calls.length === 1 && t.calls[0] === "browser_upload_file";
  const turn1 = [
    only(t1) ? ok("calls exactly [browser_upload_file]") : bad(`calls were [${t1.calls.join(", ")}]`),
    t1.isError ? bad("turn 1 is an error") : ok("not an error"),
    t1.text === mcpOkText("css #up-single", [sent]) ? ok("exact answer") : bad("answer differs from K-mcp-ok"),
    uploadPageJudge(t1.page, [sent]),
  ].find((c) => !c.pass);
  const turn2 = [
    only(t2) ? ok("calls exactly [browser_upload_file]") : bad(`calls were [${t2.calls.join(", ")}]`),
    t2.isError ? ok("isError") : bad("turn 2 is not an error"),
    t2.text === MCP_UP_LINE ? ok("exact line") : bad("line differs from K-mcp-up"),
    refusalPageJudge(t2.page),
  ].find((c) => !c.pass);
  return [
    { step: "turn1", j: turn1 ?? ok("exact K-mcp-ok, page hash equal, mark 0 left") },
    { step: "turn2", j: turn2 ?? ok("exact K-mcp-up, page untouched") },
  ];
}

/** UP-8: the header names script-src 'self'; the inline script was blocked on u8 and ran on u1. */
export function up8Verdict(i: { header: string; inlineRanU8: boolean; inlineRanU1: boolean }): Judged {
  if (!i.header.includes("script-src 'self'")) return bad("header lacks script-src 'self'");
  if (i.inlineRanU8) return bad("the inline script ran on u8: the CSP is not real");
  if (!i.inlineRanU1) return nm("the control inline script did not run on u1");
  return ok("CSP shown real by the header and the blocked/ran pair");
}
/** UP-PATCH: the upload leaves the patched-call count unchanged; the control must be counted (else NOT MEASURED). */
export function patchVerdict(i: { before: number; afterUpload: number; afterControl: number }): Judged {
  if (i.afterControl <= i.afterUpload) return nm("the control call was not counted by the patch: the row does not discriminate");
  return i.afterUpload === i.before ? ok("patched-call count unchanged by the upload") : bad(`the upload moved the patched-call count ${i.before} -> ${i.afterUpload}`);
}
/** UP-RAW's path-leak clause: occurrences in slash, backslash and JSON-escaped forms. */
export function rawLeaks(text: string, forbidden: readonly string[]): number {
  const hay = text.toLowerCase();
  let n = 0;
  for (const f of forbidden) {
    const b = f.replace(/\//g, "\\").toLowerCase();
    for (const form of new Set([b, b.replace(/\\/g, "/"), b.replace(/\\/g, "\\\\")])) {
      if (form.length > 0) n += hay.split(form).length - 1;
    }
  }
  return n;
}
/** UP-RAW (RECORD): recorded, except 0 leaks and the mark added-then-removed or never set. */
export function rawVerdict(i: { leaks: number; page: PageObs }): Judged {
  if (i.leaks !== 0) return bad(`the error text names a path or the sentinel ${i.leaks} time(s)`);
  const p = i.page;
  return p.markAdded === p.markRemoved && p.carriersLeft === 0 ? ok("recorded; no leak; mark balanced, 0 left") : bad("mark unbalanced or carriers left");
}
/** UP-FA (RECORD): K-noacc as pre-written, else "NOT as pre-written"; page untouched and no banner either way. */
export function faVerdict(x: StepObs): Judged {
  if (!refusalPageJudge(x.page).pass || x.banner) return bad("page touched or banner seen");
  return x.err && judgeError(x.err, "K-noacc").pass ? ok("K-noacc as pre-written") : ok("NOT as pre-written (finding): recorded");
}
/** UP-NAV (RECORD). */
export function navVerdict(i: { newDocIsPost: boolean; newDocMutations: number; left: number }): Judged {
  if (!i.newDocIsPost) return nm("the new document is not the pre-written post-navigation page");
  return i.newDocMutations === 0 && i.left === 0 ? ok("recorded; the new document saw no mutation, none left") : bad("the new document saw a mutation or holds a carrier");
}
/** UP-STALE (RECORD). */
export function staleVerdict(i: { tabPresent: boolean; added: number; removed: number; left: number }): Judged {
  if (!i.tabPresent) return nm("the stale tab is missing");
  return i.added === i.removed && i.left === 0 ? ok("recorded; no mark left") : bad("a mark was left");
}

// ── UP-RACE-A / UP-RACE-B ────────────────────────────────────────────────────────────────────────────────────

/** The loop ends after 5 refusals in a row or `cap` calls. */
export function raceDone(results: readonly ("ok" | Obs)[], cap: number): boolean {
  if (results.length >= cap) return true;
  const t = results.slice(-5);
  return t.length === 5 && t.every((r) => r !== "ok");
}
export function raceVerdict(key: "K-disarmed" | "K-blocked", results: readonly ("ok" | Obs)[], marks: { added: number; removed: number; left: number }): { line: string; verdict: Judged } {
  const k = results.filter((r) => r === "ok").length;
  const m = results.length - k;
  const line = `${k} ok, then ${m} ${key}`;
  const firstRefusal = results.findIndex((r) => r !== "ok");
  if (firstRefusal >= 0 && results.slice(firstRefusal).some((r) => r === "ok")) return { line, verdict: bad("an ok followed a refusal") };
  for (const r of results) if (r !== "ok" && !judgeError(r, key).pass) return { line, verdict: judgeError(r, key) };
  if (marks.added !== marks.removed || marks.left !== 0) return { line, verdict: bad("marks are not complete add-then-remove pairs, or some are left") };
  if (k === 0 || m === 0) return { line, verdict: nm("NOT DISCRIMINATING: the loop saw no ok or no refusal (recorded, not re-run)") };
  return { line, verdict: ok("oks, then exact refusals; marks balanced") };
}

// ── SAVE-REFUSE-R ────────────────────────────────────────────────────────────────────────────────────────────

const DEBUGGER_PREFIX = "[chrome.debugger] ";
/** SDK side: equality (code, message, data) and no `[chrome.debugger] ` prefix. */
export function saveSdkVerdict(key: ErrKey, obs: Obs | undefined): Judged {
  if (obs?.message.startsWith(DEBUGGER_PREFIX)) return bad(`${key}: message carries the [chrome.debugger] prefix`);
  return judgeError(obs, key);
}
/** The control `throw new Error('boom')` keeps the prefix, so the marking is selective. */
export function saveControlVerdict(obs: Obs | undefined): Judged {
  if (obs === undefined) return bad("control did not fail");
  if (obs.code !== "PAGE_ERROR") return bad(`control code ${obs.code}, want PAGE_ERROR`);
  return obs.message.startsWith(DEBUGGER_PREFIX) && obs.message.includes("boom") ? ok("control keeps the prefix and names boom") : bad("control lost the prefix or boom");
}
/** MCP side: the text contains the constant, not `[chrome.debugger]`; the actor called exactly [browser_evaluate]. */
export function saveMcpVerdict(key: ErrKey, text: string, calls: readonly string[]): Judged {
  if (calls.length !== 1 || calls[0] !== "browser_evaluate") return bad(`calls were [${calls.join(", ")}]`);
  if (!text.includes(K[key].message)) return bad(`${key}: the result text lacks the constant`);
  return text.includes("[chrome.debugger]") ? bad(`${key}: the result text carries [chrome.debugger]`) : ok(`${key}: contained, unprefixed`);
}
/** No file and no `.part` for any case: `entries` are the names found in the wave's folder. */
export function saveFilesVerdict(entries: readonly string[]): Judged {
  return entries.length === 0 ? ok("no file and no .part") : bad(`${entries.length} file(s) found in the save folder`);
}

// ── SW-2 (phase doc 0.14 (c); thresholds unchanged from Step 10's 0.8) ───────────────────────────────────────

export type SwTrial = { i: number; ii: number } | { notMeasured: string };
const dOf = (t: SwTrial | undefined): number | null => (t !== undefined && "i" in t ? t.i - t.ii : null);
export function sw2TrialLine(t: { i: number; ii: number }): string {
  return `(i) background ok ${t.i} ms · (ii) front ok ${t.ii} ms · d=${t.i - t.ii} ms`;
}
const swLine = (t: SwTrial): string => ("i" in t ? sw2TrialLine(t) : `NOT MEASURED: ${t.notMeasured}`);
export const SW_BOUND = "the wait runs to its bound";
export const SW_EVENT = "the event ends the wait";
/** Trial 0 (warm-up) is printed and never enters the 3/3 count; fewer than 3 decided trials is "undetermined". */
export function sw2(warmup: SwTrial | undefined, trials: readonly SwTrial[]): { outcome: string; s5b: boolean; measured: number; ds: Array<number | null>; lines: string[]; verdict: Judged } {
  const ds = trials.map(dOf);
  const done = ds.filter((d): d is number => d !== null);
  const measured = done.length;
  const outcome = measured === 3 && trials.length === 3 && done.every((d) => d >= 950) ? SW_BOUND : measured === 3 && trials.length === 3 && done.every((d) => d <= 300) ? SW_EVENT : "undetermined";
  const lines = [
    ...trials.map(swLine),
    warmup === undefined ? "warm-up: absent" : `warm-up (trial 0, excluded): ${swLine(warmup)}`,
    `measured ${measured}/3 trials`,
    `d=[${ds.map((d) => (d === null ? "n/m" : String(d))).join(", ")}] ms → ${outcome}`,
  ];
  const verdict = warmup === undefined ? nm("the warm-up trial is absent") : !("i" in warmup) ? nm("the warm-up trial was not measured") : trials.length !== 3 ? nm(`${trials.length} trials given, 3 expected`) : measured === 3 ? ok(`measured as pre-written: ${outcome}`) : nm(`${measured}/3 trials measured`);
  return { outcome, s5b: outcome === SW_BOUND, measured, ds, lines, verdict };
}

// ── UP-OPT ───────────────────────────────────────────────────────────────────────────────────────────────────

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
export function optSummary(folders: number, invalid = 0): string {
  let s = folders === 0 ? "No upload folder: every upload is refused." : `${plural(folders, "upload folder", "upload folders")}.`;
  if (invalid > 0) s += ` ${plural(invalid, "invalid line is", "invalid lines are")} not used (marked below).`;
  return s;
}
export const OPT_TYPED: readonly string[] = Object.freeze(["relative\\fixture-folder", "C:\\", "C:\\Users\\fixture-home"]);
export interface OptExpected {
  summaryAfterSave: string;
  summaryTyped: string;
  invalidItems: string[];
  warnedItems: string[];
}
/** `firstLine` = the number of the first typed line (k); the home-folder line is k+2. */
export function optExpected(foundCount: number, firstLine: number): OptExpected {
  const k = firstLine;
  return {
    summaryAfterSave: optSummary(foundCount + 1),
    summaryTyped: optSummary(foundCount + 2, 2),
    invalidItems: [`Line ${k}: “${OPT_TYPED[0]}” — ${K["K-opt-rel"]}`, `Line ${k + 1}: “${OPT_TYPED[1]}” — ${K["K-opt-root"]}`],
    warnedItems: [`Line ${k + 2}: “${OPT_TYPED[2]}” — warning: ${K["K-opt-home"]}`],
  };
}
export interface OptObs {
  standingCount: number;
  summaryAfterSave: string;
  summaryTyped: string;
  summaryAfterRevert: string;
  invalidItems: string[];
  warnedItems: string[];
  setSha: string;
  storedSha: string;
  storedWhileTypingSha: string;
  o2Ms: number;
  o2Conflict: boolean;
}
export function optVerdict(o: OptObs, e: OptExpected): Array<{ step: string; j: Judged }> {
  const same = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
  const c = (step: string, good: boolean, why: string): { step: string; j: Judged } => ({ step, j: good ? ok(step) : bad(`${step}: ${why}`) });
  return [
    c("standing-text", o.standingCount === 1, `K-opt-stand shown ${o.standingCount} times, want once`),
    c("stored-equals-set", SHA_RE.test(o.setSha) && o.storedSha === o.setSha, "stored text differs from the text set (by hash)"),
    c("summary-after-save", o.summaryAfterSave === e.summaryAfterSave, "summary differs"),
    c("summary-typed", o.summaryTyped === e.summaryTyped, "summary differs"),
    c("invalid-items", same(o.invalidItems, e.invalidItems), "invalid items differ"),
    c("warned-items", same(o.warnedItems, e.warnedItems), "warned items differ"),
    c("summary-after-revert", o.summaryAfterRevert === e.summaryAfterSave, "summary differs"),
    c("nothing-stored-by-typing", o.storedWhileTypingSha === o.setSha, "typing changed the stored value"),
    c("o2-follows", o.o2Ms <= 5000 && !o.o2Conflict, `O2 took ${o.o2Ms} ms or showed a conflict note`),
  ];
}

// ── UP-LOGS ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface ScanCtx {
  token?: string;
  sentinel: string;
  profile: readonly string[];
}
export interface Scan {
  urls: number;
  fixture: number;
  other: number;
  token: number;
  sentinel: number;
  profile: number;
  tokenKnown: boolean;
}
const count = (hay: string, needle: string): number => (needle === "" ? 0 : hay.split(needle).length - 1);
/** Counts only; a fixture URL is http/https/ws/wss on 127.0.0.1, localhost or *.localhost. */
export function scanText(text: string, ctx: ScanCtx): Scan {
  const urls = count(text, "://");
  let fixture = 0;
  for (const m of text.matchAll(/([a-z][a-z0-9+.-]*):\/\/([^\s/'"`<>)\]\\,;]*)/gi)) {
    const host = m[2]!.replace(/^.*@/, "").replace(/:\d*$/, "").toLowerCase();
    if (/^(https?|wss?)$/i.test(m[1]!) && (host === "127.0.0.1" || host === "localhost" || host.endsWith(".localhost"))) fixture++;
  }
  const low = text.toLowerCase();
  const forms = new Set<string>();
  for (const p of ctx.profile) {
    const b = p.replace(/\//g, "\\").toLowerCase();
    forms.add(b).add(b.replace(/\\/g, "/")).add(b.replace(/\\/g, "\\\\"));
  }
  return {
    urls,
    fixture,
    other: urls - fixture,
    token: ctx.token ? count(text, ctx.token) : 0,
    sentinel: count(low, ctx.sentinel.toLowerCase()),
    profile: [...forms].reduce((n, f) => n + count(low, f), 0),
    tokenKnown: !!ctx.token,
  };
}
export function logsLine(what: string, s: Scan): string {
  return `SCAN ${what}: ://=${s.urls} (fixture ${s.fixture}, other ${s.other}) token=${s.token} sentinel=${s.sentinel} profile=${s.profile}`;
}
/** A non-zero count is a STOP; an unknown token, or a console capture without the control press's line, is NOT MEASURED. */
export function logsVerdict(s: Scan, o: { consoleControl?: boolean }): Judged {
  if (s.other + s.token + s.sentinel + s.profile > 0) return bad("STOP: a non-zero count (non-fixture URL, token, sentinel or profile path)");
  if (!s.tokenKnown) return nm("the token could not be found, so its count is not measured");
  if (o.consoleControl === false) return nm("the console capture lacks the control press's 'safety: disarmed by the user' line");
  return ok("all counts zero");
}

// ── lines ────────────────────────────────────────────────────────────────────────────────────────────────────

/** `ROW <id> PASS|FAIL|NOT MEASURED: <why>`; `RECORD` and similar statuses are passed explicitly. */
export function rowLine(id: string, j: Judged, status?: string): string {
  return `ROW ${id} ${status ?? (j.pass ? "PASS" : j.notMeasured ? "NOT MEASURED" : "FAIL")}: ${j.why}`;
}
/** `CHECK <step> PASS|FAIL|NOT MEASURED: <why>` for one step of a row. */
export function checkLine(step: string, j: Judged): string {
  return `CHECK ${step} ${j.pass ? "PASS" : j.notMeasured ? "NOT MEASURED" : "FAIL"}: ${j.why}`;
}
