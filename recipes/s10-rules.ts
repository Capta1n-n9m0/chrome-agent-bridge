// recipes/s10-rules.ts — the pure rules of Step 10's live wave (Run 15; docs/e2e-test-plan.md §4.22, wave sheet
// docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md). Written 2026-10-25 by the S7 prep builder,
// before the Step 10 build was loaded and before any R15 row ran. recipes/s10.ts prints what these functions
// decide; recipes/test/s10-rules.test.ts dry-runs every rule on known-good and known-bad inputs and ties every
// expected text below to the committed product constant (or source line) it was copied from — a product wording
// change fails that test first, never silently a row.
//
// Rules every s10 helper keeps (LESSONS; integrity floor (2)): a URL is printed only when it is a fixture URL (the
// fixture origins below), `chrome://extensions…` or this extension's own page; never a title of a user tab, never
// the token, never the block-list pattern (`saveblk.localhost`, the wave's own test pattern, is counted, not
// printed by any helper line), never a `saveTo` path (printed as `<saveTo>`), never an evaluated value (hashes,
// sizes and counts only), never an expression (printed as `<expr>`).
import { createHash } from "node:crypto";
import { FIXTURE_8080, PAGE, W_TITLE, s9Url, type Outcome, type Judged, type TabRow } from "./s9-rules.js";

export { FIXTURE_8080, W_TITLE };

// ── Fixtures, tabs, files ─────────────────────────────────────────────────────────────────────────────────

export const PAGES = Object.freeze({ mcpf: "s10-mcpf.html", cap: "s10-cap.html", save: "s10-save.html", play: PAGE });
/** `*.localhost` resolves to loopback in Chrome with no DNS (CLAUDE.md), so the 8080 server answers it. */
export const BLK_ORIGIN = "http://saveblk.localhost:8080";
/** SAVE-BLOCK's only test pattern (step-agent ruling D4): a fixture name, added and removed through the options page. */
export const BLK_PATTERN = "saveblk.localhost";
/** BBL-1's server (recipes/fixtures), not 8080/8081/8083 (D5). */
export const BBL_PORT = 8085;
/** The commit before S5's (`34adfdc`): its `recipes/bb-login.ps1` is the old script BBL-1 runs first. */
export const BBL_OLD_COMMIT = "2479301";
/** The `saveTo` files live in `<S10_OUT>\sv\` and their names start with this marker (counted in every log, never printed). */
export const SAVE_PREFIX = "s15v-";
/** Every page expression of the SAVE rows names this marker; SAVE-LOG counts it in daemon.log and the worker console. */
export const EXPR_MARKER = "__s10";

/**
 * The page code the harness evaluates for its OWN reads and installs (`s10.ts evalValue`: the setup title, the page
 * logs, SW-1's VISLOG, the page digests, `save-build`) is sent as `return (<expr>);` — the set-up fix of
 * `recipes/t5-lib.ts` evalJson (2026-10-22) and `recipes/s9.ts` evalValue (2026-10-24): the extension wraps an
 * expression that contains `return` (`extension/src/evaluate/wrap.ts` RETURN_RE) in an async function body, so an IIFE
 * with an inner `return` (SW-1's VISLOG_INSTALL) came back kind `undefined` with no return of its own (S7 Return 2,
 * block 18). `return (<expr>);` makes the value the body's return value in every case. S7 wave fixer 2, 2026-10-25.
 * Never used for the expressions a row MEASURES (`valueExpr`, the SAVE / JSD / MCP prompts): those keep their form.
 */
export function harnessExpression(expression: string): string {
  return `return (${expression});`;
}

/**
 * The SAVE rows' value expression (moved from `s10.ts`, unchanged, by S7 wave fixer 2 so a rule test pins it):
 * `return window.__s10v[key]` (the `return` form the SAVE rows measure), or with `bare` the primitive completion value
 * with NO `return` — SAVE-PRIM's form (#217), which must never be wrapped.
 */
export function valueExpr(key: string, bare = false): string {
  return bare ? `window.${EXPR_MARKER}v[${JSON.stringify(key)}]` : `return window.${EXPR_MARKER}v[${JSON.stringify(key)}]`;
}

export function s15Url(origin: string, page: string, marker: string): string {
  return `${origin}/${page}?s15=${encodeURIComponent(marker)}`;
}

/** Text each fixture shows, waited for after a `newTab` (`waitFor {text}`). */
export const FIXTURE_TEXT: Readonly<Record<string, string>> = Object.freeze({
  [PAGES.mcpf]: "S10 MCPF fixture",
  [PAGES.cap]: "S10 CAP fixture",
  [PAGES.save]: "S10 SAVE fixture",
  [PAGES.play]: "Agent Bridge E2E Playground",
});

export interface SetupTab {
  key: string;
  url: string;
  text: string;
}

/** The tabs `s10.ts setup` opens in the background of W, after the extension reload (block order, sheet §1). */
export function setupTabs(): SetupTab[] {
  const t = (key: string, url: string, page: string): SetupTab => ({ key, url, text: FIXTURE_TEXT[page] });
  return [
    // tab a keeps Run 14's URL: `s9.ts safe0` checks it is unchanged after SAFE-0's refused navigation.
    t("a", s9Url(FIXTURE_8080, "a"), PAGES.play),
    t("mcpf", s15Url(FIXTURE_8080, PAGES.mcpf, "mcpf"), PAGES.mcpf),
    t("sw", s15Url(FIXTURE_8080, PAGES.mcpf, "sw"), PAGES.mcpf),
    t("cap", s15Url(FIXTURE_8080, PAGES.cap, "cap"), PAGES.cap),
    t("save", s15Url(FIXTURE_8080, PAGES.save, "save"), PAGES.save),
    t("close", s15Url(FIXTURE_8080, PAGES.save, "close"), PAGES.save),
    t("blk", s15Url(BLK_ORIGIN, PAGES.save, "blk"), PAGES.save),
    t("pop", s15Url(FIXTURE_8080, PAGES.play, "pop"), PAGES.play),
    t("jsd", s15Url(FIXTURE_8080, PAGES.play, "jsd"), PAGES.play),
  ];
}

const FIXTURE_HOSTS = new Set([
  "localhost:8080",
  "localhost:8081",
  "localhost:8083",
  "localhost:8085",
  "127.0.0.1:8080",
  "127.0.0.1:8085",
  "saveblk.localhost:8080",
  "sso.localhost:8085",
]);

/** A URL an s10 line may print: a fixture (incl. the blocked fixture host), chrome://extensions, this extension's pages. */
export function isFixture10(url: string, ownId = ""): boolean {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^\s/"'`)<>\\?#]+)/i.exec(url);
  if (!m) return false;
  const scheme = m[1].toLowerCase();
  const host = m[2].toLowerCase();
  if (scheme === "http" && FIXTURE_HOSTS.has(host)) return true;
  if (scheme === "chrome" && host === "extensions") return true;
  if (scheme === "chrome-extension" && ownId !== "" && host === ownId.toLowerCase()) return true;
  return false;
}

/** A URL as an s10 line prints it: the blocked fixture host is shown as a class (the pattern is never printed). */
export function show10(url: unknown, ownId = ""): string {
  if (typeof url !== "string") return String(url);
  if (url.toLowerCase().includes(BLK_PATTERN)) return "<blocked-fixture url>";
  return isFixture10(url, ownId) ? url : "<non-fixture url withheld>";
}

/** Every `scheme://host…` run in `msg` that `show10` would not print as is, replaced; the pattern withheld too. */
export function scrub10(msg: string, ownId = ""): string {
  return msg.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'`)<>]*/gi, (u) => show10(u, ownId)).split(BLK_PATTERN).join("<blocked-fixture>");
}

// ── Expected texts, copied from the committed code (recipes/test/s10-rules.test.ts re-checks each) ─────────

export const EXPECT10 = Object.freeze({
  // mcp/src/tools/registry.ts CAP_WARNING_LINE (S3, #216 item 4)
  capWarning: "Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list it.",
  // extension/src/safety.ts (#158, #202)
  disarmedAll:
    "The user has turned the bridge off in Chrome, so every page call is refused. Stop and ask the user to turn it back on; do not retry.",
  jsDisabled:
    "The user has turned JavaScript off for the bridge in Chrome (browser_evaluate and script URLs are refused). Every other tool still works; ask the user before relying on browser_evaluate.",
  blockedTab: "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user.",
  extensionUrl: "The bridge never opens extension pages.",
  // sdk/src/error.ts safetyRefusalLine (#164, #219), as the MCP prints it (one error text item)
  mcpDisarmedAll: "DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to turn it back on; do not retry.",
  mcpJsDisabled:
    "JS_DISABLED: the user has turned JavaScript off for the bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on it; do not retry it.",
  // extension/src/handlers/evaluate-save.ts evaluateSaveStart: the Step 10 build check (SAFE-0's L1 addition)
  saveStartEmpty: 'evaluateSaveStart requires a non-empty "expression" string',
  // extension/src/evaluate/save.ts REFUSALS / STRINGIFY_FAILED_MESSAGE (#218 item 4)
  refuseUndefined: "The value is undefined — nothing to save",
  refuseNode: "The value is a DOM node, which is not saveable — return its text or HTML (e.g. el.outerHTML)",
  refuseMap: "The value is a Map, which JSON turns into {} — not saveable; convert it first (e.g. Object.fromEntries(map))",
  stringifyFailed:
    "JSON.stringify threw on the value in the page (a cycle, a BigInt, or a throwing toJSON or getter) — nothing was saved",
});

/** extension/src/evaluate-save-store.ts `chunk()`: an unknown, expired, lost or other tab's id (#218 item 2). */
export function expiredIdMessage(id: string): string {
  return `Unknown or expired evaluateSave id: ${id}`;
}

/** daemon/src/intercept.ts checkLease: `TAB_HELD` (the owner's actor name, an HH:MM:SS time). */
export function tabHeldRe(handle: string, owner: string): RegExp {
  const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^tab ${esc(handle)} is held by ${esc(JSON.stringify(owner))} since \\d\\d:\\d\\d:\\d\\d — use browser_new_tab, or browser_list_tabs to pick a free tab$`);
}

/** daemon/src/intercept.ts resolveHandle: `TAB_GONE`. */
export function tabGoneMessage(handle: string): string {
  return `tab ${handle} was closed — call listTabs to pick another tab`;
}

/** mcp/src/tools/registry.ts: the answers of the action tools for a locator target (`describeTarget`). */
export function clickedText(role: string, name: string): string {
  return `Clicked ${role} "${name}"`;
}
export function typedCssText(css: string): string {
  return `Typed into css ${css}`;
}
export function pressedText(key: string): string {
  return `Pressed ${key}`;
}

/** mcp/src/tools/registry.ts `browser_evaluate {saveTo}`'s answer (S4). */
export function saveAnswer(path: string, bytes: number, kind: string, sha256: string): string {
  return `Saved ${path}\n${bytes} bytes · ${kind} · sha256 ${sha256}`;
}

/** S4.1 as amended by Stage 0 F13: `answer.length ≤ min(300, path.length + 120)`. */
export function answerBound(path: string): number {
  return Math.min(300, path.length + 120);
}

// ── Judging one call ────────────────────────────────────────────────────────────────────────────────────

export interface Want {
  code: string;
  message?: string;
  messageRe?: RegExp;
  /** `"absent"` = the error carries no `data`; an object = deep-equal JSON; undefined = not judged (RECORD). */
  data?: "absent" | Record<string, unknown>;
}

/** A refusal against its pre-written code, message and data. */
export function judge10(o: Outcome, w: Want): Judged {
  if (o.ok) return { pass: false, why: `expected ${w.code}, got ok` };
  if (o.code !== w.code) return { pass: false, why: `expected ${w.code}, got ${o.code}` };
  if (w.message !== undefined && o.message !== w.message) return { pass: false, why: `${w.code} with another message` };
  if (w.messageRe !== undefined && !w.messageRe.test(o.message ?? "")) return { pass: false, why: `${w.code} with a message not in the expected form` };
  if (w.data === "absent" && o.data !== undefined) return { pass: false, why: `${w.code} carries data ${JSON.stringify(o.data)} (expected none)` };
  if (w.data !== undefined && w.data !== "absent" && JSON.stringify(o.data) !== JSON.stringify(w.data)) {
    return { pass: false, why: `${w.code} data ${JSON.stringify(o.data)}, expected ${JSON.stringify(w.data)}` };
  }
  return { pass: true, why: `${w.code}, exact message${w.data === "absent" ? ", no data" : w.data !== undefined ? `, data ${JSON.stringify(w.data)}` : ""}` };
}

export const WANT = Object.freeze({
  disarmedAll: { code: "DISARMED", message: EXPECT10.disarmedAll, data: { scope: "all" } } as Want,
  jsDisabled: { code: "JS_DISABLED", message: EXPECT10.jsDisabled, data: "absent" } as Want,
  blockedTab: { code: "DOMAIN_BLOCKED", message: EXPECT10.blockedTab, data: "absent" } as Want,
});

/** One call as a ROW line (URLs scrubbed, the pattern withheld): `ROW <id> <step> <ok|CODE> <message> [data …] (<ms> ms)`. */
export function rowLine10(id: string, step: string, o: Outcome, ownId = "", okDetail = ""): string {
  if (o.ok) return `ROW ${id} ${step} ok${okDetail ? ` ${scrub10(okDetail, ownId)}` : ""} (${o.ms} ms)`;
  const data = o.data === undefined ? "" : ` data ${scrub10(JSON.stringify(o.data), ownId)}`;
  return `ROW ${id} ${step} ${o.code ?? "?"} ${scrub10(o.message ?? "", ownId)}${data} (${o.ms} ms)`;
}

// ── SAFE-0's Step 10 check (L1) ─────────────────────────────────────────────────────────────────────────

/**
 * The Step 10 build is loaded iff (1) `daemon.status.build` equals the sha256 of `daemon/dist/index.js` on disk
 * (the build just made), and (2) `evaluateSaveStart {expression: ""}` on a fixture tab answers `BAD_PARAMS` with
 * the Step 10 handler's text — a Step 9 extension answers `UNKNOWN_METHOD` (its router has no such method), and a
 * gate refusal would name `DISARMED`/`JS_DISABLED`. It has no side effect: the handler refuses before any page call.
 */
export function step10Check(build: string | null, diskSha: string, start: Outcome): Judged {
  const why: string[] = [];
  if (build !== diskSha) why.push(`daemon build ${build === null ? "not reported" : build.slice(0, 12)}… is not the disk build ${diskSha.slice(0, 12)}…`);
  if (start.ok) why.push("evaluateSaveStart with an empty expression answered ok");
  else if (start.code === "UNKNOWN_METHOD") why.push("evaluateSaveStart is UNKNOWN_METHOD: the loaded extension is not the Step 10 build");
  else if (start.code !== "BAD_PARAMS" || start.message !== EXPECT10.saveStartEmpty) why.push(`evaluateSaveStart answered ${start.code}, not the Step 10 BAD_PARAMS text`);
  return why.length
    ? { pass: false, why: why.join("; ") }
    : { pass: true, why: "daemon build = sha256 of daemon/dist/index.js; evaluateSaveStart answered the Step 10 handler's BAD_PARAMS (a Step 9 extension answers UNKNOWN_METHOD)" };
}

// ── Value runs: no k-character run of a saved value in a text (answers k = 16, logs and transcripts k = 32) ─

const B = 0x01000193; // FNV prime as the polynomial base (any odd multiplier works mod 2^32)

/**
 * How many positions of `text` start a `k`-code-unit window that also occurs somewhere in `value` (0 = no shared
 * run of length ≥ k). O(|value| + |text|): `text`'s windows are indexed by a rolling hash, `value` is rolled once,
 * every hash hit is confirmed by a string compare. Never returns or prints any window.
 */
export function sharedRuns(value: string, text: string, k: number): number {
  if (!Number.isInteger(k) || k < 1) throw new Error("k must be a positive integer");
  if (text.length < k || value.length < k) return 0;
  let pow = 1;
  for (let i = 0; i < k - 1; i++) pow = Math.imul(pow, B) >>> 0;
  const index = new Map<number, number[]>();
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    if (i >= k) h = (h - Math.imul(text.charCodeAt(i - k), pow)) >>> 0;
    h = (Math.imul(h, B) + text.charCodeAt(i)) >>> 0;
    if (i >= k - 1) {
      const at = i - k + 1;
      const list = index.get(h);
      if (list) list.push(at);
      else index.set(h, [at]);
    }
  }
  const found = new Set<number>();
  h = 0;
  for (let i = 0; i < value.length; i++) {
    if (i >= k) h = (h - Math.imul(value.charCodeAt(i - k), pow)) >>> 0;
    h = (Math.imul(h, B) + value.charCodeAt(i)) >>> 0;
    if (i < k - 1) continue;
    const list = index.get(h);
    if (!list) continue;
    const start = i - k + 1;
    for (const at of list) {
      if (found.has(at)) continue;
      if (value.startsWith(text.slice(at, at + k), start)) found.add(at);
    }
    if (found.size === text.length - k + 1) break;
  }
  return found.size;
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

// ── SAVE rows ───────────────────────────────────────────────────────────────────────────────────────────

export interface PageDigest {
  key: string;
  kind: "string" | "json";
  length: number;
  bytes: number;
  sha256: string;
}

export function isPageDigest(v: unknown): v is PageDigest {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.key === "string" && (o.kind === "string" || o.kind === "json") && typeof o.length === "number" && typeof o.bytes === "number" && typeof o.sha256 === "string" && /^[0-9a-f]{64}$/.test(o.sha256);
}

export interface SavedFile {
  exists: boolean;
  part: boolean;
  bytes: number | null;
  sha256: string | null;
}

/** What a client reported (the SDK result, or the MCP answer parsed). */
export interface Reported {
  bytes: number;
  kind: string;
  sha256: string;
}

/**
 * A save passes when the page's own digest, the file on disk and the client's report agree: bytes and sha256 equal,
 * the kind the page holds, no `.part` left.
 */
export function saveVerdict(page: PageDigest, file: SavedFile, rep: Reported | null): Judged {
  const why: string[] = [];
  if (!file.exists) why.push("no file written");
  if (file.part) why.push("a .part file is left");
  if (file.exists && file.sha256 !== page.sha256) why.push("the file's sha256 differs from the page's");
  if (file.exists && file.bytes !== page.bytes) why.push(`the file has ${file.bytes} bytes, the page ${page.bytes}`);
  if (rep === null) why.push("no report from the client");
  else {
    if (rep.sha256 !== page.sha256) why.push("the reported sha256 differs from the page's");
    if (rep.bytes !== page.bytes) why.push(`reported ${rep.bytes} bytes, the page ${page.bytes}`);
    if (rep.kind !== page.kind) why.push(`reported kind ${rep.kind}, the page holds ${page.kind}`);
  }
  return why.length ? { pass: false, why: why.join("; ") } : { pass: true, why: `page = file = report: ${page.bytes} bytes, kind ${page.kind}, sha256 equal, no .part` };
}

/** The MCP answer parsed (`Saved <path>` / `<bytes> bytes · <kind> · sha256 <hex>`), or null when it is not that form. */
export function parseSaveAnswer(answer: string): { path: string; bytes: number; kind: string; sha256: string } | null {
  const m = /^Saved (.+)\n(\d+) bytes · (string|json) · sha256 ([0-9a-f]{64})$/.exec(answer);
  return m ? { path: m[1], bytes: Number(m[2]), kind: m[3], sha256: m[4] } : null;
}

/**
 * The answer's own rules (S4.1 as amended): exactly `saveAnswer(path, …)`, at most `answerBound(path)` characters,
 * and no 16-character run of the value (`runs16`, from `sharedRuns(value, answer, 16)`).
 */
export function answerVerdict(answer: string, path: string, page: PageDigest, runs16: number): Judged {
  const why: string[] = [];
  const want = saveAnswer(path, page.bytes, page.kind, page.sha256);
  if (answer !== want) why.push("the answer is not exactly `Saved <saveTo>` / `<bytes> bytes · <kind> · sha256 <page sha256>`");
  const bound = answerBound(path);
  if (answer.length > bound) why.push(`the answer has ${answer.length} characters (bound ${bound})`);
  if (runs16 !== 0) why.push(`${runs16} 16-character run(s) of the value in the answer`);
  return why.length ? { pass: false, why: why.join("; ") } : { pass: true, why: `the exact answer form, ${answer.length} ≤ ${bound} characters, no 16-character run of the value` };
}

/** A text as an s10 line prints it: the `saveTo` path replaced by `<saveTo>` (both slash forms). */
export function hidePath(text: string, path: string): string {
  if (!path) return text;
  return text.split(path).join("<saveTo>").split(path.replace(/\\/g, "/")).join("<saveTo>");
}

/** SAVE-SURR's byte layout (s10-save.html `surr`): where the astral character and the two U+FFFD land in the file. */
export const SURR = Object.freeze({
  /** 'G' × (1 MiB − 1), so the astral character's two code units straddle the 1 MiB slice boundary. */
  astralAt: 1_048_575,
  astral: "f09f9880",
  loneHighAt: 1_048_575 + 4 + 100,
  loneLowAt: 1_048_575 + 4 + 100 + 3 + 100,
  replacement: "efbfbd",
  bytes: 1_048_575 + 4 + 100 + 3 + 100 + 3 + 1_048_576,
  length: 1_048_575 + 2 + 100 + 1 + 100 + 1 + 1_048_576,
});

export function surrVerdict(buf: Uint8Array | null): Judged {
  if (buf === null) return { pass: false, why: "the file was not read" };
  const hexAt = (at: number, n: number): string => Buffer.from(buf.subarray(at, at + n)).toString("hex");
  const why: string[] = [];
  if (buf.length !== SURR.bytes) why.push(`${buf.length} bytes, expected ${SURR.bytes}`);
  if (hexAt(SURR.astralAt, 4) !== SURR.astral) why.push(`bytes at ${SURR.astralAt} are ${hexAt(SURR.astralAt, 4)}, not the astral character's ${SURR.astral}`);
  if (hexAt(SURR.loneHighAt, 3) !== SURR.replacement) why.push(`the lone high surrogate at ${SURR.loneHighAt} is ${hexAt(SURR.loneHighAt, 3)}, not ${SURR.replacement}`);
  if (hexAt(SURR.loneLowAt, 3) !== SURR.replacement) why.push(`the lone low surrogate at ${SURR.loneLowAt} is ${hexAt(SURR.loneLowAt, 3)}, not ${SURR.replacement}`);
  return why.length
    ? { pass: false, why: why.join("; ") }
    : { pass: true, why: `the astral character is whole across the 1 MiB boundary (${SURR.astral} at ${SURR.astralAt}); both lone surrogates are ${SURR.replacement}` };
}

/**
 * #217's outcome table for SAVE-PRIM (written before the run): the 64 MiB+ value as a PRIMITIVE completion (no
 * `return`: CDP puts it whole in Runtime.evaluate's reply). Saved with page = file = report → "not met"; any
 * refusal or failure → "met" (then a size refusal at the measured bound — the user's call, escalated); saved with
 * a hash that differs → "corrupt" (escalate).
 */
export function primReading(o: Outcome, verdict: Judged | null, bytes: number): { revisit: "met" | "not met" | "corrupt"; line: string } {
  if (!o.ok) return { revisit: "met", line: `#217 Revisit-if MET: a primitive completion of ${bytes} bytes failed (${o.code}) — escalate (a size refusal at the measured bound is the user's call)` };
  if (verdict && !verdict.pass) return { revisit: "corrupt", line: `#217: the primitive save answered ok but ${verdict.why} — escalate` };
  return { revisit: "not met", line: `#217 Revisit-if not met: a primitive completion of ${bytes} bytes saved whole (page = file = report)` };
}

export interface IdonlyLeg {
  /** CDP accepted the call (no protocol error). */
  accepted: boolean;
  error?: string;
  type?: string;
  objectId: boolean;
  value: boolean;
}

/**
 * #217's outcome table for SAVE-IDONLY (written before the run; step-agent ruling D2: a RECORD probe in a throwaway
 * headless Chrome). `prim` = a primitive string with `serializationOptions:{serialization:"idOnly"}`; `object` =
 * `({a:1})` the same way (the positive control: an object must come back by objectId); `plain` = the primitive
 * without serializationOptions (the control the product runs today: no objectId).
 */
export function idonlyReading(p: { prim: IdonlyLeg; object: IdonlyLeg; plain: IdonlyLeg }): { revisit: "met" | "not met" | "not measured"; line: string } {
  if (!p.object.accepted || !p.object.objectId) {
    return { revisit: "not measured", line: `SAVE-IDONLY NOT MEASURED — the object control did not come back by objectId (${p.object.accepted ? "no objectId" : `refused: ${p.object.error ?? "?"}`})` };
  }
  if (!p.plain.accepted) return { revisit: "not measured", line: `SAVE-IDONLY NOT MEASURED — the plain primitive control was refused (${p.plain.error ?? "?"})` };
  if (!p.prim.accepted) return { revisit: "not met", line: `#217 Revisit-if not met: Chrome refused serialization idOnly for a primitive (${p.prim.error ?? "?"})` };
  if (p.prim.objectId) return { revisit: "met", line: "#217 Revisit-if MET: with serialization idOnly a primitive string came back by objectId (then idOnly) — escalate" };
  return { revisit: "not met", line: `#217 Revisit-if not met: with serialization idOnly a primitive string still came back without an objectId (type ${p.prim.type ?? "?"}, value inline: ${p.prim.value ? "yes" : "no"})` };
}

// ── MCPF-1 and CAP-1: the page's own reporter ─────────────────────────────────────────────────────────

export interface PageEvent {
  n: number;
  type: string;
  isTrusted: boolean;
  target: string;
  key: string;
  vis: string;
}

export function asEvents(v: unknown): PageEvent[] {
  if (!Array.isArray(v)) return [];
  return v.filter((e): e is PageEvent => typeof e === "object" && e !== null && typeof (e as PageEvent).type === "string");
}

export type McpfKind = "click" | "type" | "press";

/**
 * One MCPF-1 trial (0.2, S2's handoff): the page's reporter shows the input as trusted, and the tab is in front of
 * its window after. click: ≥ 1 trusted `click` on #mcpf-btn and no untrusted one; type: the field's value equals
 * the text, ≥ 1 trusted `input` and no untrusted one; press: ≥ 1 trusted `keydown` of the key. `active` = the
 * tab's listTabs row `active` (in front of its window) after the call.
 */
export function mcpfVerdict(kind: McpfKind, events: PageEvent[], active: boolean | null, opts: { value?: string | null; text?: string; key?: string } = {}): Judged {
  const why: string[] = [];
  const of = (type: string, target?: string): PageEvent[] => events.filter((e) => e.type === type && (target === undefined || e.target === target));
  if (kind === "click") {
    const c = of("click", "mcpf-btn");
    if (!c.some((e) => e.isTrusted)) why.push("no trusted click reached the button");
    if (c.some((e) => !e.isTrusted)) why.push("an untrusted click reached the button");
  } else if (kind === "type") {
    const c = of("input", "mcpf-input");
    if (!c.some((e) => e.isTrusted)) why.push("no trusted input reached the field");
    if (c.some((e) => !e.isTrusted)) why.push("an untrusted input reached the field");
    if (opts.value !== opts.text) why.push(`the field reads ${opts.value === null || opts.value === undefined ? "nothing" : `${opts.value.length} characters`}, not the typed text`);
  } else {
    const c = of("keydown").filter((e) => e.key === opts.key);
    if (!c.some((e) => e.isTrusted)) why.push(`no trusted keydown ${opts.key} reached the page`);
  }
  if (active !== true) why.push(`the tab is ${active === null ? "not listed" : "not in front of its window"} after the call`);
  return why.length ? { pass: false, why: why.join("; ") } : { pass: true, why: `the page reports a trusted ${kind === "press" ? "keydown" : kind === "type" ? "input" : "click"} and the tab is in front of its window` };
}

/** MCPF-1's disarmed leg: no event of any kind reached the page, and the tab stayed behind. */
export function mcpfOffVerdict(events: PageEvent[], active: boolean | null): Judged {
  const why: string[] = [];
  if (events.length) why.push(`${events.length} event(s) reached the page (${[...new Set(events.map((e) => e.type))].join(", ")})`);
  if (active !== false) why.push(`the tab is ${active === null ? "not listed" : "in front of its window"} after the refused call`);
  return why.length ? { pass: false, why: why.join("; ") } : { pass: true, why: "no input reached the page and the tab was not brought to the front" };
}

/** CAP-1's page reporter: exactly the new clicks since `before`, all on `name`. */
export function capClickVerdict(clicks: Array<{ name: string }>, before: number, name: string): Judged {
  const fresh = clicks.slice(before);
  if (fresh.length !== 1) return { pass: false, why: `${fresh.length} click(s) reached the page (expected 1)` };
  if (fresh[0].name !== name) return { pass: false, why: `the click landed on another element (${fresh[0].name.startsWith("Cap item ") ? fresh[0].name : "not a cap item"})` };
  return { pass: true, why: `the click landed on "${name}"` };
}

// ── SW-1: the differential row (0.8 with Stage 0 F3) ──────────────────────────────────────────────────

/** The row IDs `s10.ts sw1` runs under: SW-1, and SW-1R (its re-measurement after Run 15's set-up stop, S7 wave fixer 2). */
export const SW_ROWS: readonly string[] = Object.freeze(["SW-1", "SW-1R"]);

export type SwOutcome ="runs to its bound" | "the event ends the wait" | "undetermined";

/**
 * d = (i) − (ii) per trial: (i) a default screenshot of a background fixture tab of the human's window, (ii) one of
 * the tab already in front, client-measured. d ≥ 950 ms in 3/3 → "runs to its bound" (S7b names the mechanism; a
 * top-level listener escalates); d ≤ 300 ms in 3/3 → "the event ends the wait" (recorded, no change, the carried
 * input closes); anything else (a failed trial included) → "undetermined" (recorded, no change). Written before the run.
 */
export function swOutcome(ds: number[]): SwOutcome {
  if (ds.length !== 3 || ds.some((d) => !Number.isFinite(d))) return "undetermined";
  if (ds.every((d) => d >= 950)) return "runs to its bound";
  if (ds.every((d) => d <= 300)) return "the event ends the wait";
  return "undetermined";
}

// ── R15-POP-2: the popup's opener class (#211) ────────────────────────────────────────────────────────

export type Pop2Class = "held opener" | "another tab" | "none" | "no popup" | "several popups";

export interface ListedRow extends TabRow {
  openerTabId?: number;
  active?: boolean;
}

/** The class of the one new row's `openerTabId`: the held opener's Chrome id, another tab's, or none. Never a URL. */
export function pop2Class(newRows: ListedRow[], openerId: number): Pop2Class {
  if (newRows.length === 0) return "no popup";
  if (newRows.length > 1) return "several popups";
  const o = newRows[0].openerTabId;
  if (o === undefined) return "none";
  return o === openerId ? "held opener" : "another tab";
}

export interface Pop2Grant {
  reason?: string;
  urlIsPopup: boolean;
  ms: number;
}

/**
 * The reading written before the run. Only "held opener" is judged (a CHECK): the grant must come within 5 s with
 * reason `opener` and the popup URL. "held opener" with no grant is #211's Revisit-if (a product defect → a fix
 * stage). Another class is a RECORD: the daemon grants nothing for a popup whose opener is not held (consistent);
 * a grant there is "unexplained" (the step agent decides).
 */
export function pop2Reading(cls: Pop2Class, grant: Pop2Grant | null, maxMs = 5000): { check: Judged | null; reading: string } {
  if (cls === "no popup" || cls === "several popups") return { check: null, reading: `NOT MEASURED — ${cls === "no popup" ? "no popup opened" : "more than one tab opened"}` };
  if (cls === "held opener") {
    if (grant === null) return { check: { pass: false, why: "the held opener was named and no leaseGranted came within 5 s" }, reading: "PRODUCT DEFECT (#211's Revisit-if): the held opener was named and no grant came — a fix stage" };
    const ok = grant.reason === "opener" && grant.urlIsPopup && grant.ms <= maxMs;
    return {
      check: ok ? { pass: true, why: `reason opener, the popup URL, ${grant.ms} ms ≤ ${maxMs} ms` } : { pass: false, why: "the grant differs (reason, url or time)" },
      reading: ok ? "the opener rule works for this leg" : "a grant came but it differs (reason, url or time)",
    };
  }
  return {
    check: null,
    reading: grant === null
      ? `Chrome named ${cls === "none" ? "no opener" : "another tab as the opener"}: the daemon's rule grants nothing (consistent; Run 14's conjecture)`
      : `unexplained: a grant came though the popup's opener is ${cls} (record; the step agent decides)`,
  };
}

// ── BBL-1: bb-login dry runs (0.9 with Stage 0 F10; #215) ─────────────────────────────────────────────

export type BblLeg = "delayed-old" | "delayed-new" | "stuck" | "elsewhere";

export const BBL_LEGS: Readonly<Record<BblLeg, { page: string; counter: string; script: "old" | "new" }>> = Object.freeze({
  "delayed-old": { page: "bb-standin-delayed.html", counter: "/sso-submit-delayed.html", script: "old" },
  "delayed-new": { page: "bb-standin-delayed.html", counter: "/sso-submit-delayed.html", script: "new" },
  stuck: { page: "bb-standin-stuck.html", counter: "/submit-stuck", script: "new" },
  elsewhere: { page: "bb-standin-elsewhere.html", counter: "/elsewhere-landing.html", script: "new" },
});

const STAMP = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z) bb-login: /;

/** From bb-login's own output: the press (its `invoked the one … once` line), the last line, its own window, the bound line. */
export function bblTimes(lines: string[]): { pressMs: number | null; lastMs: number | null; window: number | null; boundLine: boolean; presses: number } {
  let pressMs: number | null = null;
  let lastMs: number | null = null;
  let window: number | null = null;
  let presses = 0;
  let boundLine = false;
  for (const l of lines) {
    const m = STAMP.exec(l);
    if (!m) continue;
    const t = Date.parse(m[1]);
    lastMs = t;
    if (/ invoked the one .* once/.test(l)) {
      presses++;
      if (pressMs === null) pressMs = t;
    }
    const w = / own window (\d+) opened/.exec(l);
    if (w) window = Number(w[1]);
    if (/after submit: bound of \d+ s reached/.test(l)) boundLine = true;
  }
  return { pressMs, lastMs, window, boundLine, presses };
}

/** Request lines of a `python -m http.server` log (stderr) for `path`, from line `from` on. */
export function serverHits(log: string, path: string, from = 0): number {
  const esc = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`"GET ${esc}(\\?|\\s)`);
  return log.split(/\r?\n/).slice(from).filter((l) => re.test(l)).length;
}

/**
 * BBL-1's pass rules (S5.1 as amended by F10, written before the run): delayed — the old script exits 4 and the
 * new exits 0; stuck — exit 4 at the bound line, ≤ 95 s from the press; elsewhere — exit 4 at the bound (the
 * bound line printed and 89–95 s from the press, not before); in every leg exactly one press and one submit.
 */
export function bblVerdict(leg: BblLeg, r: { exit: number; pressMs: number | null; lastMs: number | null; boundLine: boolean; presses: number; submits: number }): Judged {
  const why: string[] = [];
  const t = r.pressMs !== null && r.lastMs !== null ? r.lastMs - r.pressMs : null;
  if (r.presses !== 1) why.push(`${r.presses} press line(s) (expected 1)`);
  if (r.submits !== 1) why.push(`${r.submits} submit request(s) in the server log (expected 1)`);
  const wantExit = leg === "delayed-new" ? 0 : 4;
  if (r.exit !== wantExit) why.push(`exit ${r.exit} (expected ${wantExit})`);
  if (leg === "stuck") {
    if (!r.boundLine) why.push("no bound line");
    if (t === null || t > 95_000) why.push(`press → exit ${t === null ? "not measured" : `${t} ms`} (≤ 95 000 ms)`);
  }
  if (leg === "elsewhere") {
    if (!r.boundLine) why.push("no bound line (exit before the bound)");
    if (t === null || t < 89_000 || t > 95_000) why.push(`press → exit ${t === null ? "not measured" : `${t} ms`} (89 000–95 000 ms)`);
  }
  return why.length ? { pass: false, why: why.join("; ") } : { pass: true, why: `exit ${wantExit}, one press, one submit${t !== null ? `, ${t} ms from the press` : ""}` };
}

// ── Scans (S7.6): `scheme://host` counts, never a bare `://` (#213); the token, the pattern, the markers ───

export interface Scan10 {
  urls: number;
  urlsFixture: number;
  urlsOther: number;
  token: number;
  pattern: number;
  expr: number;
  path: number;
}

function countOf(hay: string, needle: string): number {
  if (needle === "") return 0;
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

/** Counts in `text` (the token is never printed; an empty token counts 0). A URL is `scheme://` + ≥ 1 host character. */
export function scan10(text: string, token: string, ownId = ""): Scan10 {
  let urls = 0;
  let fixture = 0;
  const re = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/"'`)<>\\]+/gi;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    urls++;
    if (isFixture10(m[0], ownId)) fixture++;
  }
  return { urls, urlsFixture: fixture, urlsOther: urls - fixture, token: countOf(text, token), pattern: countOf(text.toLowerCase(), BLK_PATTERN), expr: countOf(text, EXPR_MARKER), path: countOf(text, SAVE_PREFIX) };
}

/** The scan line: no `://`, no pattern, no marker literal in it (so a later scan of a file holding it counts 0 — Run 14 F1). */
export function scanLine10(what: string, c: Scan10, runs32: number | null, tokenFound = true): string {
  return `SCAN ${what}: urls=${c.urls} (fixture ${c.urlsFixture}, other ${c.urlsOther}) token=${tokenFound ? c.token : "not found"} pattern=${c.pattern} expr-marker=${c.expr} path-marker=${c.path} value-runs32=${runs32 === null ? "not counted" : runs32}`;
}

export type ScanMode = "daemon" | "console" | "transcript" | "committed";

/**
 * Pass rules (S7.6, written before the run). daemon — no URL of any kind, no token, no pattern, no marker, no value
 * run; console — no non-fixture URL, no token, no pattern, no marker, no value run, and the positive control (≥ 1
 * `safety: disarmed by the user` line) else NOT MEASURED; transcript — no token, no non-fixture URL, no pattern, no
 * value run (an actor's own prompt holds its expression and its path by design); committed (the raw output) — no
 * token, no non-fixture URL, no pattern, no marker, no value run. `tokenFound` false (neither `BRIDGE_TOKEN` nor
 * `bridge.token` found by the scanner — S7 prep fixer 1, the verifier's NIT): the token count is NOT MEASURED, never
 * a pass (any other non-zero count still fails first).
 */
export function scanVerdict10(c: Scan10, runs32: number, mode: ScanMode, pressLines = 0, tokenFound = true): Judged & { notMeasured?: boolean } {
  const bad: string[] = [];
  if (c.token) bad.push(`token ${c.token}`);
  if (mode === "daemon" ? c.urls : c.urlsOther) bad.push(`${mode === "daemon" ? "URLs" : "non-fixture URLs"} ${mode === "daemon" ? c.urls : c.urlsOther}`);
  if (c.pattern) bad.push(`test pattern ${c.pattern}`);
  if (mode !== "transcript" && c.expr) bad.push(`expression marker ${c.expr}`);
  if (mode !== "transcript" && c.path) bad.push(`saveTo path marker ${c.path}`);
  if (runs32) bad.push(`32-character value runs ${runs32}`);
  if (bad.length) return { pass: false, why: bad.join(", ") };
  if (!tokenFound) return { pass: false, notMeasured: true, why: "token=not found (neither BRIDGE_TOKEN nor bridge.token): the token count is not measured" };
  if (mode === "console" && pressLines === 0) return { pass: false, notMeasured: true, why: 'no "safety: disarmed by the user" line in the capture (the positive control)' };
  return { pass: true, why: mode === "daemon" ? "all counts 0" : `no token, no non-fixture URL, no pattern${mode === "transcript" ? "" : ", no marker"}, no value run` };
}

// ── SAVE-64's worker memory (a RECORD; D3) ───────────────────────────────────────────────────────────

export interface MemSample {
  ms: number;
  pid: number;
  priv: number;
}

/**
 * The method (stated before the run): `recipes/s10-mem.ps1` samples, every 250 ms, the private bytes of every
 * chrome.exe whose command line has `--extension-process` (the service worker and the offscreen document live in
 * the extension's renderer process), from before the save to after it. The record is the process with the largest
 * peak − first-sample delta: its pid, baseline, peak and delta in MiB. Which extension that process serves is not
 * proven (several extensions may run): a RECORD, never a pass rule.
 */
export function memRecord(samples: MemSample[]): { pid: number; baseMiB: number; peakMiB: number; deltaMiB: number; atMs: number; n: number; pids: number } | null {
  const by = new Map<number, MemSample[]>();
  for (const s of samples) {
    const l = by.get(s.pid);
    if (l) l.push(s);
    else by.set(s.pid, [s]);
  }
  let best: { pid: number; baseMiB: number; peakMiB: number; deltaMiB: number; atMs: number; n: number; pids: number } | null = null;
  const mib = (b: number): number => Math.round((b / 1048576) * 10) / 10;
  for (const [pid, l] of by) {
    const sorted = [...l].sort((a, b) => a.ms - b.ms);
    const base = sorted[0].priv;
    const peak = sorted.reduce((m, s) => (s.priv > m.priv ? s : m), sorted[0]);
    const delta = peak.priv - base;
    if (best === null || delta > best.deltaMiB * 1048576) best = { pid, baseMiB: mib(base), peakMiB: mib(peak.priv), deltaMiB: mib(delta), atMs: peak.ms, n: sorted.length, pids: by.size };
  }
  return best;
}

// ── MCP actors: prompts and their transcripts ────────────────────────────────────────────────────────

const T = (n: string): string => `mcp__chrome-agent-bridge__${n}`;

/** A Windows path as a prompt names it: forward slashes, so no JSON or shell escape can change it. */
export function promptPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Every actor prompt (one line, sent through recipes/s9-actor.ts by a spawn with an argument array — no shell, so
 * no quote is stripped). Each names its tab explicitly (an explicit `tab` neither claims nor moves the cursor), asks
 * for exactly the calls listed and nothing else, and never contains a value.
 */
export const PROMPTS = Object.freeze({
  focusQuestion: (): string =>
    `You are a test actor for a browser bridge. Do not call any tool in this turn. Read the description of the tool ${T("browser_click")} and answer in one sentence: what does it say happens to the tab when trusted=true?`,
  mcpfClick: (tab: string): string =>
    `Call the tool ${T("browser_click")} exactly once with tab "${tab}", locator {"role":"button","name":"MCPF target"} and trusted true. Call no other tool. Then reply with the tool's answer text only.`,
  mcpfType: (tab: string, text: string): string =>
    `Call the tool ${T("browser_type")} exactly once with tab "${tab}", locator {"css":"#mcpf-input"}, text "${text}" and trusted true. Call no other tool. Then reply with the tool's answer text only.`,
  mcpfPress: (tab: string, key: string): string =>
    `Call the tool ${T("browser_press_key")} exactly once with tab "${tab}", key "${key}" and trusted true. Call no other tool. Then reply with the tool's answer text only.`,
  capClick: (tab: string, name: string): string =>
    `Call the tool ${T("browser_click")} exactly once with tab "${tab}" and locator {"role":"button","name":"${name}"} (no trusted). Call no other tool. Then reply with the tool's answer text only, every line of it.`,
  /** `path` with forward slashes (`promptPath`): nothing to escape; the MCP normalises it to the backslash form. */
  saveTo: (tab: string, expression: string, path: string): string =>
    `Call the tool ${T("browser_evaluate")} exactly once with tab "${tab}", expression ${JSON.stringify(expression)} and saveTo "${promptPath(path)}". Call no other tool, and do not read the file. Then reply with the tool's answer text only.`,
  jsd: (tab: string, path: string): string =>
    `Make these five tool calls in this order, each exactly once, even if an earlier one fails, all with tab "${tab}": ` +
    `(1) ${T("browser_evaluate")} with expression "1+1"; ` +
    `(2) ${T("browser_evaluate")} with expression "document.body" and asRef true; ` +
    `(3) ${T("browser_evaluate")} with expression "return 'S15'" and saveTo "${promptPath(path)}"; ` +
    `(4) ${T("browser_navigate")} with url "javascript:void(0)"; ` +
    `(5) ${T("browser_navigate")} with url "data:text/html,S15". ` +
    `Call no other tool and do not retry. Then reply with the five answer texts, one per line.`,
  evalControl: (tab: string): string =>
    `Call the tool ${T("browser_evaluate")} exactly once with tab "${tab}" and expression "1+1". Call no other tool. Then reply with the tool's answer text only.`,
});

export interface TurnCall {
  tool: string;
  input: Record<string, unknown>;
  isError: boolean | null;
  items: string[];
}

/**
 * recipes/s9-actor.ts `send`'s printed turn (`<t> TOOL <name> <json>`, `<t> OUTPUT[ (isError)] — …`, `    [i/n] <line>`,
 * `<t> SAYS …`) → the calls in order, each with its output's text items (the i-th OUTPUT belongs to the i-th TOOL:
 * the prompts ask for sequential calls), and the SAYS texts.
 */
export function parseTurn(lines: string[]): { calls: TurnCall[]; says: string[]; ended: boolean } {
  const calls: TurnCall[] = [];
  const says: string[] = [];
  let ended = false;
  let out = -1;
  let item = -1;
  for (const raw of lines) {
    const tool = /^\S+ TOOL (\S+) (.*)$/.exec(raw);
    if (tool) {
      let input: Record<string, unknown> = {};
      try {
        const v = JSON.parse(tool[2]) as unknown;
        if (typeof v === "object" && v !== null) input = v as Record<string, unknown>;
      } catch {
        input = {};
      }
      calls.push({ tool: tool[1], input, isError: null, items: [] });
      continue;
    }
    const o = /^\S+ OUTPUT( \(isError\))? — /.exec(raw);
    if (o) {
      out++;
      item = -1;
      if (calls[out]) calls[out].isError = o[1] !== undefined;
      continue;
    }
    const it = /^ {4}\[(\d+)\/(\d+)\] ?(.*)$/.exec(raw);
    if (it && calls[out]) {
      const i = Number(it[1]) - 1;
      if (i !== item) {
        item = i;
        calls[out].items[i] = it[3];
      } else calls[out].items[i] += `\n${it[3]}`;
      continue;
    }
    const s = /^\S+ SAYS (.*)$/.exec(raw);
    if (s) says.push(s[1].replace(/ ⏎ /g, "\n"));
    if (/ RESULT-OF-TURN /.test(raw)) ended = true;
  }
  return { calls, says, ended };
}

/** A TOOL line as an s10 line prints it: the tool, its tab, the locator; `expression` → `<expr>`, `saveTo` → `<saveTo>`. */
export function toolLine(c: TurnCall): string {
  const shown: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c.input)) shown[k] = k === "expression" ? "<expr>" : k === "saveTo" ? "<saveTo>" : v;
  return `TOOL ${c.tool.replace(/^mcp__chrome-agent-bridge__/, "")} ${JSON.stringify(shown)}`;
}

/** The one text item an answer must be, or null when the output is not exactly one text item. */
export function onlyText(c: TurnCall): string | null {
  return c.items.length === 1 && typeof c.items[0] === "string" ? c.items[0] : null;
}

/** An actor turn that must hold exactly the listed tools, in order, each once. */
export function callsVerdict(calls: TurnCall[], tools: string[]): Judged {
  const names = calls.map((c) => c.tool.replace(/^mcp__chrome-agent-bridge__/, ""));
  if (names.length !== tools.length || names.some((n, i) => n !== tools[i])) {
    return { pass: false, why: `the actor called [${names.join(", ")}], not [${tools.join(", ")}]` };
  }
  return { pass: true, why: `the actor called exactly [${tools.join(", ")}]` };
}

/** An answer against its exact text and error flag. */
export function answerIs(c: TurnCall | undefined, text: string, isError: boolean): Judged {
  if (!c) return { pass: false, why: "no such call" };
  const got = onlyText(c);
  if (got !== text) return { pass: false, why: got === null ? `${c.items.length} output items, not one text item` : "the answer text differs" };
  if (c.isError !== isError) return { pass: false, why: `isError ${String(c.isError)} (expected ${isError})` };
  return { pass: true, why: `the exact answer${isError ? " (isError)" : ""}` };
}

// ── STOP lines (#193) ───────────────────────────────────────────────────────────────────────────────────

/** Every guard and every helper throw prints one line beginning `STOP:`; URLs and the pattern withheld. */
export function stopLine10(msg: string, ownId = ""): string {
  return `STOP: ${scrub10(msg, ownId)}`;
}

/** The check line (as s9's), never carrying a URL. */
export function checkLine10(id: string, step: string, j: Judged & { notMeasured?: boolean }): string {
  return `CHECK ${id} ${step} ${j.notMeasured ? "NOT MEASURED" : j.pass ? "PASS" : "FAIL"} — ${scrub10(j.why)}`;
}

// ── RET-1 (0.7 with Stage 0 F16; prepared, NOT run — waits for G10-2) ───────────────────────────────────

/** daemon/src/intercept.ts: the line the session-change retire logs (`extension session changed: <n> handles retired`). */
export function retiredCount(lines: string[]): number | null {
  let n: number | null = null;
  for (const l of lines) {
    const m = /extension session changed: (\d+) handles retired/.exec(l);
    if (m) n = Number(m[1]);
  }
  return n;
}

/**
 * RET-1's pass rule (0.7): the daemon logged a retire of n ≥ 1 handles; the holder got `tabGone` for its handle with
 * its pre-kill fixture URL; a call on the old `Tab` answers `TAB_GONE` or `TAB_UNKNOWN` (never acts on another tab);
 * the safety tuple read back equals the found one. Session restore and the "Restore pages?" prompt are not judged.
 */
export function ret1Verdict(r: { retired: number | null; gone: { tab?: string; lastUrl?: string } | null; handle: string; url: string; after: Outcome; safetyEqual: boolean }): Judged {
  const why: string[] = [];
  if (r.retired === null || r.retired < 1) why.push(`daemon.log: ${r.retired === null ? "no session-change line" : `${r.retired} handles retired`} (n ≥ 1 needed)`);
  if (!r.gone) why.push("the holder got no tabGone");
  else {
    if (r.gone.tab !== r.handle) why.push("the tabGone named another handle");
    if (r.gone.lastUrl !== r.url) why.push("the tabGone's lastUrl is not the pre-kill fixture URL");
  }
  if (r.after.ok) why.push("a call on the old Tab answered ok (it acted on some tab)");
  else if (r.after.code !== "TAB_GONE" && r.after.code !== "TAB_UNKNOWN") why.push(`the old Tab answered ${r.after.code}, not TAB_GONE or TAB_UNKNOWN`);
  if (!r.safetyEqual) why.push("the safety state read back differs from the found state");
  return why.length ? { pass: false, why: why.join("; ") } : { pass: true, why: `retired ${r.retired} ≥ 1; tabGone with the fixture URL; the old Tab answered ${r.after.code}; the safety state as found` };
}

// ── Block dependencies (S7 prep fixer 1: C1, M3): every row block builds what it needs ────────────────────
//
// Added 2026-10-25 by the S7 prep fixer, before any R15 row ran. A resume skips every observed row block (#213), so a
// row block may rely only on framing blocks (they run in every attempt: the tabs come from `setup`) and on what it
// builds itself, earlier in its own body. recipes/test/s10-rules.test.ts runs `blockDependencyGaps` over the runner
// recipes/s10-r15.ps1 and requires none.

export interface ValueNeed {
  tab: string;
  key: string;
}

/**
 * The page value each s10.ts command needs built (`save-build <key> [--tab <t>]`) before it runs. "args": the row's
 * own `<ROW> <key> [--tab t]` (the default tab is `save`). Every command the runner calls must be listed (a new one
 * must say what it needs); the test also ties the fixed entries to the command's source in recipes/s10.ts.
 */
export const S10_VALUE_NEEDS: Readonly<Record<string, readonly ValueNeed[] | "args">> = Object.freeze({
  "save-sdk": "args",
  "save-mcp": "args",
  "save-surr": [{ tab: "save", key: "surr" }],
  "save-hold": [{ tab: "save", key: "4m" }],
  "save-close": [{ tab: "close", key: "4m" }],
  "save-disarm": [{ tab: "save", key: "4m" }],
  "save-jsoff": [{ tab: "save", key: "4m" }],
  "save-block": [{ tab: "blk", key: "4m" }],
  "save-ttl": [{ tab: "save", key: "4m" }],
  prim: [{ tab: "save", key: "64m" }],
  "savefix-sdk": [{ tab: "save", key: "fix" }],
  "savefix-mcp": [{ tab: "save", key: "fix" }],
  "savefix-judge": [{ tab: "save", key: "fix" }],
  "daemon-up": [],
  setup: [],
  s10check: [],
  mcpf: [],
  "mcpf-off-prep": [],
  "mcpf-off": [],
  "mcpf-off-judge": [],
  "cap1-sdk": [],
  "cap1-mcp": [],
  sw1: [],
  pop2: [],
  "save-build": [],
  "save-refuse": [],
  idonly: [],
  "mem-record": [],
  jsd: [],
  "jsd-mcp": [],
  "bbl-judge": [],
  scan: [],
  "scan-log": [],
  "values-clean": [],
});

/**
 * A state a call needs that some earlier step of the SAME block must produce (a block never relies on a state an
 * earlier row block left: on a resume that block may have been skipped). `producer` is the runner's own text.
 */
export const S10_STATE_NEEDS: ReadonlyArray<{ call: RegExp; need: string; producer: string }> = Object.freeze([
  { call: /^jsd(-mcp)? --state (jsoff|off)(\s|$)/, need: "JavaScript off", producer: "Set-S9Switch $global:O -Which evaluate -On $false" },
  { call: /^(jsd(-mcp)? --state off|mcpf-off)(\s|$)/, need: "the bridge off (the toolbar)", producer: "Invoke-S9ActionButton" },
  { call: /^mcpf-off(-judge)?(\s|$)/, need: "MCPF-1-off's page baseline", producer: "S10 mcpf-off-prep" },
]);

/** Flags of s10.ts that take no value (every other `--flag` takes the next token). */
const BARE_FLAGS = new Set(["--bare", "--guard"]);

export interface RunnerCall {
  at: number;
  cmd: string;
  args: string[];
  text: string;
}

function psList(ps1: string, name: string): string[] {
  const m = new RegExp(`^\\$${name} = @\\(([^)]*)\\)`, "m").exec(ps1);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}

/** The runner's `$Order` and `$RowBlocks` lists, as written. */
export function runnerLists(ps1: string): { order: string[]; rowBlocks: string[] } {
  return { order: psList(ps1, "Order"), rowBlocks: psList(ps1, "RowBlocks") };
}

/** Each `function B-<name> { … }` body of the runner (up to the first line that is a lone `}`). */
export function runnerBlocks(ps1: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /^function B-([a-z0-9-]+) \{\r?\n([\s\S]*?)^\}\r?$/gm;
  for (let m = re.exec(ps1); m !== null; m = re.exec(ps1)) out.set(m[1], m[2]);
  return out;
}

/** The s10.ts calls of a block body, in text order: `S10 <cmd> …` and `S10Bg '<name>' @('<cmd>', …)`; comments skipped. */
export function runnerCalls(body: string): RunnerCall[] {
  const calls: RunnerCall[] = [];
  const noComments = body
    .split("\n")
    .map((l) => (l.trimStart().startsWith("#") ? " ".repeat(l.length) : l))
    .join("\n");
  const fg = /(?<![\w$:"'-])S10 ([^\r\n};]*)/g;
  for (let m = fg.exec(noComments); m !== null; m = fg.exec(noComments)) {
    const toks = m[1].trim().split(/\s+/).filter(Boolean);
    if (toks.length) calls.push({ at: m.index, cmd: toks[0], args: toks.slice(1), text: toks.join(" ") });
  }
  const bg = /S10Bg '[^']+' @\(([^)]*)\)/g;
  for (let m = bg.exec(noComments); m !== null; m = bg.exec(noComments)) {
    const toks = [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
    if (toks.length) calls.push({ at: m.index, cmd: toks[0], args: toks.slice(1), text: toks.join(" ") });
  }
  return calls.sort((a, b) => a.at - b.at);
}

function positionalOf(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      if (!BARE_FLAGS.has(args[i])) i++;
      continue;
    }
    out.push(args[i]);
  }
  return out;
}

function optionOf(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

/** What one runner call needs on the page (C1, M3); `null` when the command is not in `S10_VALUE_NEEDS`. */
export function valueNeedsOf(call: RunnerCall): ValueNeed[] | null {
  const n = S10_VALUE_NEEDS[call.cmd];
  if (n === undefined) return null;
  if (n !== "args") return [...n];
  const [, key] = positionalOf(call.args);
  return key ? [{ tab: optionOf(call.args, "--tab") ?? "save", key }] : [];
}

/**
 * Every gap of the runner's dependency structure, as plain lines (none = every row block is self-sufficient):
 * a block of `$Order` without its function; a framing block among the row blocks or `setup` not before every row
 * block; a call of a command the table does not know; a `save-build` whose key is not a literal; a value a call needs
 * that its own block did not build earlier; a tab no `setup` opens; a state need whose producer is not earlier in the
 * same block.
 */
export function blockDependencyGaps(ps1: string, tabKeys: readonly string[]): string[] {
  const gaps: string[] = [];
  const { order, rowBlocks } = runnerLists(ps1);
  const bodies = runnerBlocks(ps1);
  if (!order.length || !rowBlocks.length) gaps.push("the runner's $Order or $RowBlocks list was not found");
  const setupAt = order.indexOf("setup");
  if (setupAt < 0 || rowBlocks.includes("setup")) gaps.push("setup must be a framing block of $Order");
  for (const b of rowBlocks) {
    if (!order.includes(b)) gaps.push(`row block ${b} is not in $Order`);
    else if (order.indexOf(b) < setupAt) gaps.push(`row block ${b} runs before setup (its tabs would not exist)`);
  }
  for (const b of order) {
    const body = bodies.get(b);
    if (body === undefined) {
      gaps.push(`block ${b} has no function B-${b}`);
      continue;
    }
    const built = new Set<string>();
    for (const c of runnerCalls(body)) {
      if (c.cmd === "save-build") {
        const [key] = positionalOf(c.args);
        if (!key || !/^[a-z0-9]+$/.test(key)) gaps.push(`${b}: save-build without a literal key (${c.text})`);
        else built.add(`${optionOf(c.args, "--tab") ?? "save"}:${key}`);
        const tab = optionOf(c.args, "--tab") ?? "save";
        if (!tabKeys.includes(tab)) gaps.push(`${b}: save-build on tab ${tab}, which setup does not open`);
        continue;
      }
      const needs = valueNeedsOf(c);
      if (needs === null) {
        gaps.push(`${b}: s10.ts ${c.cmd} is not in S10_VALUE_NEEDS`);
        continue;
      }
      for (const n of needs) {
        if (!tabKeys.includes(n.tab)) gaps.push(`${b}: ${c.cmd} needs tab ${n.tab}, which setup does not open`);
        if (!built.has(`${n.tab}:${n.key}`)) gaps.push(`${b}: ${c.text} needs ${n.key} on ${n.tab}, not built earlier in the block`);
      }
      for (const s of S10_STATE_NEEDS) {
        if (!s.call.test(c.text)) continue;
        const p = body.indexOf(s.producer);
        if (p < 0 || p > c.at) gaps.push(`${b}: ${c.text} needs ${s.need}, not produced earlier in the block (${s.producer})`);
      }
    }
  }
  return gaps;
}

// ── SW-1's per-trial pre-condition (S7 prep fixer 1: M2) ─────────────────────────────────────────────────

/**
 * Before each capture, the intended tab's `listTabs` row: (i) the background capture needs `sw` behind
 * (`active === false`), (ii) the front capture needs `w` in front (`active === true`). A miss makes that trial NOT
 * MEASURED (never re-run), with the observed state; `swOutcome` then gets NaN for it and needs 3/3 measured trials
 * for either decided outcome (its thresholds unchanged).
 */
export function swPre(phase: "i" | "ii", row: { active?: boolean } | undefined): { measured: boolean; line: string } {
  const want = phase === "i" ? false : true;
  const tab = phase === "i" ? "sw" : "w";
  const seen = row === undefined ? "not listed" : `active=${String(row.active)}`;
  const measured = row !== undefined && row.active === want;
  return { measured, line: `pre-(${phase}) ${tab} ${seen} (needs active=${String(want)}) → ${measured ? "measured" : "NOT MEASURED (never re-run)"}` };
}

/** The count of measured trials in SW-1's d list (NaN = not measured), for the outcome line. */
export function swMeasured(ds: number[]): number {
  return ds.filter((d) => Number.isFinite(d)).length;
}

// ── MCPF-1's tally across its three blocks (S7 prep fixer 1: m2) ────────────────────────────────────────

/**
 * MCPF-1 runs as three blocks (click, type, press: each under the tool's cap); each stores its count of passed trials
 * in state.json, and the press block prints the tally line and the 3of3 check §4.22 names. A kind whose block did not
 * run in this attempt (a resume) is printed `not in this attempt` and the check is NOT MEASURED for this attempt.
 */
export function mcpfTally(t: Partial<Record<McpfKind, number>>): { line: string; check: Judged & { notMeasured?: boolean } } {
  const kinds: McpfKind[] = ["click", "type", "press"];
  const part = (k: McpfKind): string => (t[k] === undefined ? `${k} not in this attempt` : `${k} ${t[k]}/3`);
  const line = `tally ${kinds.map(part).join(" · ")}`;
  const missing = kinds.filter((k) => t[k] === undefined);
  if (missing.length) return { line, check: { pass: false, notMeasured: true, why: `${missing.join(", ")} not run in this attempt` } };
  const all = kinds.every((k) => t[k] === 3);
  return { line, check: all ? { pass: true, why: "3/3 each" } : { pass: false, why: kinds.map((k) => `${k} ${t[k]}/3`).join(", ") } };
}

// ── Which processes the wave may kill (S7 prep fixer 2: the verifier's W1) ─────────────────────────────────
//
// Windows keeps a dead parent's PID in ParentProcessId, and PIDs are reused: a walk by ParentProcessId alone takes the
// orphans of an earlier process that had the same PID (the user's Chrome after its launcher exited) as children, and
// Test-SafeToKill calls them safe. recipes/s10-win.ps1 mirrors these rules (Get-S10Descendants, Test-S10TreeKillable,
// Test-S10HeadlessKillable); recipes/test/s10-rules.test.ts ties the two texts together.

export interface ProcRow {
  pid: number;
  ppid: number;
  /** CreationDate, UTC ticks (or any monotone unit); 0 = unknown. */
  born: number;
  name: string;
  cmd: string;
}

/**
 * The root and its descendants, level by level: a process is a child of a tree member only if its ParentProcessId is
 * that member's PID AND it was created no earlier than that member (else it is the orphan of an earlier holder of the
 * PID). An unknown creation time (0) on either side excludes the child. The root first, then each level.
 */
export function descendants(rootPid: number, table: readonly ProcRow[]): ProcRow[] {
  const root = table.find((r) => r.pid === rootPid);
  if (!root) return [];
  const out: ProcRow[] = [root];
  const seen = new Set([root.pid]);
  let level = [root];
  while (level.length) {
    const next: ProcRow[] = [];
    for (const p of level) {
      for (const c of table) {
        if (c.ppid !== p.pid || seen.has(c.pid)) continue;
        if (!(p.born > 0 && c.born > 0 && c.born >= p.born)) continue;
        seen.add(c.pid);
        next.push(c);
        out.push(c);
      }
    }
    level = next;
  }
  return out;
}

/**
 * The processes a tree gained after it was identified (S7 prep fixer 2: a member may start a child between the snapshot
 * and its own kill; that child would outlive it as an orphan). For each member `m` of the identified tree: a process
 * whose ParentProcessId is `m.pid` and that was created no earlier than `m` — and, when another process now holds
 * `m.pid` (a reused PID), created before that holder (the holder's own children are not the wave's) — plus that
 * process's descendants. A member still alive with its recorded creation time is skipped (it was not killed). Unknown
 * creation times (0) exclude.
 */
export function lateChildren(members: readonly ProcRow[], table: readonly ProcRow[]): ProcRow[] {
  const out: ProcRow[] = [];
  const seen = new Set(members.map((m) => m.pid));
  for (const m of members) {
    if (!(m.born > 0)) continue;
    const holder = table.find((r) => r.pid === m.pid);
    if (holder && holder.born === m.born) continue;
    const upper = holder ? holder.born : Number.POSITIVE_INFINITY;
    for (const c of table) {
      if (c.ppid !== m.pid || seen.has(c.pid)) continue;
      if (!(c.born > 0 && c.born >= m.born && c.born < upper)) continue;
      for (const d of descendants(c.pid, table)) {
        if (seen.has(d.pid)) continue;
        seen.add(d.pid);
        out.push(d);
      }
    }
  }
  return out;
}

/** The only image names a node call's tree may hold that the wave kills (`esbuild.exe` is the service tsx starts); `chrome.exe` is never one of them. */
export const TREE_KILL_NAMES: readonly string[] = Object.freeze(["node.exe", "claude.exe", "cmd.exe", "conhost.exe", "esbuild.exe"]);

export function treeKillable(row: ProcRow): { ok: boolean; why: string } {
  const n = row.name.toLowerCase();
  if (n === "chrome.exe") return { ok: false, why: "chrome.exe is never killed by a tree kill" };
  if (!TREE_KILL_NAMES.includes(n)) return { ok: false, why: `${n} is not a process a node call of the wave starts` };
  return { ok: true, why: n };
}

/**
 * SAVE-IDONLY's headless Chrome, if `Browser.close` left it alive: a `chrome.exe` is the wave's only when it was created
 * at or after the wave's launch stamp and its command line carries `--user-data-dir=<profileDir>` with `profileDir`
 * under `<temp>\bridge-e2e\s15\` (case-insensitive). Anything else is never killed.
 */
export function headlessKillable(row: ProcRow, launchBorn: number, profileDir: string, tempDir: string): { ok: boolean; why: string } {
  const dir = profileDir.toLowerCase().replace(/[\\/]+$/, "");
  const base = `${tempDir.toLowerCase().replace(/[\\/]+$/, "")}\\bridge-e2e\\s15\\`;
  if (row.name.toLowerCase() !== "chrome.exe") return { ok: false, why: "not chrome.exe" };
  if (!dir.startsWith(base)) return { ok: false, why: "the profile is not under %TEMP%\\bridge-e2e\\s15" };
  if (!(launchBorn > 0 && row.born >= launchBorn)) return { ok: false, why: "created before the wave launched its headless Chrome" };
  // the flag's value must end at the directory: `…\idonly-profile2` does not name `…\idonly-profile`
  const cmd = `${row.cmd.toLowerCase()} `;
  if (!cmd.includes(`--user-data-dir=${dir} `) && !cmd.includes(`--user-data-dir="${dir}"`)) return { ok: false, why: "its command line does not name the throwaway --user-data-dir" };
  return { ok: true, why: "the wave's headless Chrome (its profile, created after the launch)" };
}

/** A kill re-checks the PID's creation time against the one recorded when the wave identified it. */
export function sameProcess(recordedBorn: number, nowBorn: number): boolean {
  return recordedBorn > 0 && nowBorn === recordedBorn;
}

// ---- The toolbar pin reader (S7 wave fixer 1, after Run 15's Return 1 and #221). Run 15's runner read 0 buttons in its
// fresh window W while the user says the button is pinned. Measured read-only in a window of the fixer's own (Chrome
// 156): the pinned action is a Button of class `ToolbarActionView` named "<title>\n Has access to this site", present
// 149-285 ms after the window appeared; at a window width of 516 px (Chrome's minimum here) it is OVERFLOWED into the
// Extensions menu and no `ToolbarActionView` exists at all (it was present at 600 px and wider). So "no button in the
// toolbar" is not "unpinned": the reader waits (bounded) and widens its own window before it says unpinned. It never
// clicks anything.

/** The extension's name: the action's UIA Name's first line starts with it (the second line is Chrome's access note). */
export const PIN_NAME = "Chrome Agent Bridge";
/** The reader's whole bound (ms), the widen point (ms), and the width (px) under which a window may overflow its actions. */
export const PIN_WAIT_MS = 5000;
export const PIN_WIDEN_AFTER_MS = 1000;
export const PIN_NARROW_PX = 1000;
/** The width the reader widens its own window to (capped by the monitor's work area). */
export const PIN_WIDEN_TO_PX = 1200;

/**
 * Is this UIA element the extension's toolbar action? Its Name's first line starts with the extension's name, and it is
 * a toolbar action view (class `ToolbarActionView`) or, as s9-win.ps1 always matched, a Button.
 */
export function pinNameMatches(name: string, controlType: string, className: string): boolean {
  const first = (name ?? "").split(/\r?\n/)[0] ?? "";
  if (!first.startsWith(PIN_NAME)) return false;
  return className === "ToolbarActionView" || controlType === "Button" || controlType === "ControlType.Button";
}

export type PinStep = "pinned" | "wait" | "widen" | "unpinned";

/**
 * One poll of the reader: `found` buttons now, `elapsedMs` since it began, the window's width, whether it already
 * widened. Found -> pinned. Not found: a narrow window that has not been widened is widened once after
 * PIN_WIDEN_AFTER_MS; otherwise it waits until PIN_WAIT_MS, then says unpinned (the caller's human gate).
 */
export function pinStep(p: { found: number; elapsedMs: number; widthPx: number; widened: boolean }): PinStep {
  if (p.found >= 1) return "pinned";
  if (!p.widened && p.widthPx < PIN_NARROW_PX && p.elapsedMs >= PIN_WIDEN_AFTER_MS) return "widen";
  if (p.elapsedMs >= PIN_WAIT_MS) return "unpinned";
  return "wait";
}
