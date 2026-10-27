// Step 11b S4-helpers: pure rules of Run 17's helpers (docs/e2e-test-plan.md section 4.24). No I/O here.
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { countRules, rulesOf } from "../extension/src/safety-dnr.js";
import { isUrlBlocked, parseBlockList } from "../extension/src/safety-match.js";
import { median } from "./s9-rules.js";
import { K, type Judged } from "./s11-rules.js";

// ===== H1: the hit counter (fixture servers' logs, counted per query tag `s11b=<tag>`) =====
// Log forms, all from section 4.24's fixture table:
//   s9-redirect.py / s11b-delay.py   `<UTC ISO> <METHOD> <path+query>`
//   s11b-flip.py / s11b-slow.py      `<UTC ISO> <METHOD> <path+query> <status>`
//   python -m http.server (stderr)   `<host> - - [<date>] "<METHOD> <path+query> HTTP/<v>" <status> -`
// Banners and error notes match none of them and are ignored.

export interface LogHit {
  method: string;
  path: string;
  status: number | undefined;
}

const OWN_FORM = /^\d{4}-\d\d-\d\dT[\d:.]+Z ([A-Z]+) (\S+)(?: (\d{3}))?$/;
const HTTP_SERVER_FORM = /"([A-Z]+) (\S+) HTTP\/[\d.]+" (\d{3}) /;

export function parseLogLine(line: string): LogHit | null {
  const text = line.replace(/\r$/, "");
  const own = OWN_FORM.exec(text);
  if (own) return { method: own[1]!, path: own[2]!, status: own[3] ? Number(own[3]) : undefined };
  const py = HTTP_SERVER_FORM.exec(text);
  if (py) return { method: py[1]!, path: py[2]!, status: Number(py[3]) };
  return null;
}

/** The `s11b` query value of a request path, or undefined (no query, no such key, a lookalike key, a favicon). */
export function queryTag(path: string): string | undefined {
  const q = path.indexOf("?");
  if (q < 0) return undefined;
  const query = path.slice(q + 1).split("#")[0]!;
  return new URLSearchParams(query).get("s11b") ?? undefined;
}

function hitsOfTag(lines: readonly string[], tag: string): LogHit[] {
  if (tag === "") return [];
  const out: LogHit[] = [];
  for (const line of lines) {
    const hit = parseLogLine(line);
    if (hit && queryTag(hit.path) === tag) out.push(hit);
  }
  return out;
}

/** Requests in one log carrying exactly this tag (never a prefix, never the total). */
export function countHits(lines: readonly string[], tag: string): number {
  return hitsOfTag(lines, tag).length;
}

/** The sheet's `HITS <tag> redirect=<n> blocked=<n>`: redirect from a redirector's log, blocked from 8085's log. */
export function hitsLine(tag: string, redirectLog: readonly string[], blockedLog: readonly string[]): string {
  return `HITS ${tag} redirect=${countHits(redirectLog, tag)} blocked=${countHits(blockedLog, tag)}`;
}

/** The flip server's answers for one tag (RD-CTL, RD-BACK, RD-FWD). A line without a status counts in total only. */
export function flipCounts(lines: readonly string[], tag: string): { n200: number; n302: number; total: number } {
  const hits = hitsOfTag(lines, tag);
  return { n200: hits.filter((h) => h.status === 200).length, n302: hits.filter((h) => h.status === 302).length, total: hits.length };
}

// ===== H2a: table K17 (the sheet's expected texts; every one is tied to its product constant in s11b-rules.test.ts) =====
// Reused from s11-rules.ts where the text is the same: K-tab (its K-blocked), K-disarmed, K-gate, K-notarget, K-missing,
// K-relative, K-devt, K-undef, K-node, K-map, K-cycle, K-opt-root, K-opt-rel. K-opt-stand and K-opt-home are the S0F-a
// texts (s11's are Run 16's record and stay as they are).
export interface K17Error {
  code: string;
  message: string;
  data?: Record<string, unknown>;
}

export const K17 = Object.freeze({
  "K-url": { code: "DOMAIN_BLOCKED", message: "That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user." },
  "K-tab": K["K-blocked"],
  "K-own": { code: "DOMAIN_BLOCKED", message: "This tab shows one of the bridge extension's own pages, which the bridge never reads or acts on." },
  "K-filepage": { code: "DOMAIN_BLOCKED", message: "This tab shows a local file (a file: page), which the bridge never reads or acts on." },
  "K-fileurl": { code: "DOMAIN_BLOCKED", message: "The bridge never opens local files (file: URLs)." },
  "K-disarmed": K["K-disarmed"],
  "K-gate": K["K-gate"],
  "K-notarget": K["K-notarget"],
  "K-missing": K["K-missing"],
  "K-relative": K["K-relative"],
  "K-devt": K["K-devt"],
  "K-undef": K["K-undef"],
  "K-node": K["K-node"],
  "K-map": K["K-map"],
  "K-cycle": K["K-cycle"],
  "K-fetch": { code: "INTERNAL", message: "Failed to fetch" },
} as const satisfies Record<string, K17Error>);

export const K17_TEXT = Object.freeze({
  "K-opt-stand":
    "An agent may upload any file inside these folders to any site it can open. Allow only folders that hold files you mean to share. A home folder, or a folder that holds home folders, is refused; never allow a folder that holds bridge.token or a .ssh folder. An agent that can also run programs on this computer can put any file into an allowed folder.",
  "K-opt-home":
    "a home folder, or a folder that holds home folders, is never allowed: every file in it (keys, tokens, documents) could be uploaded. Allow a folder inside it instead",
  "K-opt-root": K["K-opt-root"],
  "K-opt-rel": K["K-opt-rel"],
});

/** K-raw-missing / K-raw-dir (BAD_PARAMS, no data) for `paths[i]`. */
export const k17RawMissing = (i: number): K17Error => ({ code: "BAD_PARAMS", message: `upload: paths[${i}] does not exist (or Chrome cannot read it); nothing was uploaded` });
export const k17RawDir = (i: number): K17Error => ({ code: "BAD_PARAMS", message: `upload: paths[${i}] is a folder, not a file — pass a file; nothing was uploaded` });
/** K-newtab-late. */
export const k17NewtabLate = (tabId: number): string => `Timed out waiting for tab ${tabId} to load`;

/** K-opt-sum: `valid` folders and `invalid` unused lines. */
export function k17OptSum(valid: number, invalid: number): string {
  let s = valid === 0 ? "No upload folder: every upload is refused." : `${valid} upload folder${valid === 1 ? "" : "s"}.`;
  if (invalid > 0) s += ` ${invalid} invalid line${invalid === 1 ? " is" : "s are"} not used (marked below).`;
  return s;
}
/** K-opt-item. */
export const k17OptItem = (line: number, text: string, reason: string): string => `Line ${line}: “${text}” — ${reason}`;
/** K-caps: one line or several (the options page's item text). */
export function k17Caps(lines: readonly number[]): string {
  const which = lines.length === 1 ? `Line ${lines[0]}` : `Lines ${lines.join(", ")}`;
  return `${which}: a very long site name with a port or *. may make a rule Chrome rejects; while it is saved, agent navigations and downloads may be refused.`;
}

/** The long-host fixtures: three labels of `a`, 24, 24 and `last` long (22, 23, 24), with `:8085` (regex 119, 120, 121 long). */
export const longHost = (last: 22 | 23 | 24): string => [24, 24, last].map((n) => "a".repeat(n)).join(".") + ":8085";
export const H119 = longHost(22);
export const H120 = longHost(23);
export const H121 = longHost(24);

// ===== H2b: worker-console expressions =====
// Each builder returns ONE line to type into the service worker's DevTools console. Each expression is `void …`, so the
// console echoes no result value, and prints only its fixed line forms with console.log. The parsers accept a whole
// line of the exact form only, so the echoed input (code on one line) can never pass for output.
export const STOP_CONSOLE_PATTERN = "STOP: console input holds a pattern";

export interface PreTypeContext {
  /** The bridge token, if known (never printed). */
  token?: string;
  /** R17-UP-7's alias. */
  alias?: string;
  /** The user's profile path. */
  profilePath?: string;
}

/** The RD-LOGS pattern set against the text to type: the STOP line on a match, else null. */
export function preTypeCheck(text: string, ctx: PreTypeContext = {}): string | null {
  const lower = text.toLowerCase();
  const fixed = ["://", "localhost:8085", "bank.example", "127.0.0.1"];
  const given = [ctx.token, ctx.alias, ctx.profilePath].filter((x): x is string => typeof x === "string" && x !== "").map((x) => x.toLowerCase());
  if ([...fixed, ...given].some((p) => lower.includes(p)) || /a{24}/i.test(text)) return STOP_CONSOLE_PATTERN;
  return null;
}

const guardInt = (n: number, lo: number, hi: number, what: string): number => {
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${what} must be an integer from ${lo} to ${hi}`);
  return n;
};
const guardLabel = (s: string): string => {
  if (!/^[a-z0-9-]{1,40}$/.test(s)) throw new Error("label must be 1-40 of a-z, 0-9, -");
  return s;
};

export const DNR_PERMISSION = "declarativeNetRequestWithHostAccess";

/** `B17 manifest`: dnrWithHostAccess = the permission is in `permissions`; staticRuleSets = a non-empty `declarative_net_request.rule_resources`. */
export function manifestExpression(): string {
  return `void (()=>{const m=chrome.runtime.getManifest();const d=m.declarative_net_request;console.log("MANIFEST dnrWithHostAccess="+(m.permissions||[]).includes("${DNR_PERMISSION}")+" staticRuleSets="+(d&&d.rule_resources&&d.rule_resources.length?"present":"absent"))})()`;
}
export function rulesExpression(): string {
  return `void (async()=>{console.log("RULES "+(await chrome.declarativeNetRequest.getSessionRules()).length)})()`;
}
/** `B17 rules --sample <ms> --for <ms>`: the in-console sampler (a loop of awaits, not product code). */
export function rulesSampleExpression(sampleMs: number, forMs: number): string {
  const s = guardInt(sampleMs, 10, 5000, "sample");
  const f = guardInt(forMs, s, 120000, "for");
  return `void (async()=>{const a=[],t=Date.now();while(Date.now()-t<${f}){a.push((await chrome.declarativeNetRequest.getSessionRules()).length);await new Promise(r=>setTimeout(r,${s}))}console.log("RULES samples=["+a.join(",")+"] min="+Math.min(...a)+" max="+Math.max(...a))})()`;
}
/**
 * `B17 ctx` (RD-7): the tabs whose url or pendingUrl holds the query tag `s11b=<tag>` (found by `chrome.tabs.query`, so the
 * Chrome tab id never has to cross a client handle; the query value must equal the tag, n1), then the TAB contexts of those tabs only. The typed text holds the tag in two
 * pieces and no scheme separator. Prints `CTX <label> tabs=<m>` (how many tabs matched: 0 makes a count of 0 weak) and
 * `CTX <label> count=<n>`. The options window (no tag) is never counted.
 */
export function ctxExpression(label: string, tag: string): string {
  if (!/^[a-z0-9]{1,20}$/.test(tag)) throw new Error("tag must be 1-20 of a-z, 0-9");
  const l = guardLabel(label);
  // The query value is compared whole (`s11b=rd7` never matches `s11b=rd7p`), on the url or the pendingUrl.
  return (
    `void (async()=>{const t=u=>{const q=String(u||"").split("?")[1];return !!q&&q.split("#")[0].split("&").includes("s11b="+"${tag}")},` +
    `ids=(await chrome.tabs.query({})).filter(x=>t(x.url)||t(x.pendingUrl)).map(x=>x.id),` +
    `c=await chrome.runtime.getContexts({contextTypes:["TAB"]});console.log("CTX ${l} tabs="+ids.length);console.log("CTX ${l} count="+c.filter(x=>ids.includes(x.tabId)).length)})()`
  );
}
/** `B17 rules --mode ...`: the sampler with a clock: `RULES timed t0=<epoch ms> [<ms since t0>:<count>,...]`. */
export function rulesTimedExpression(sampleMs: number, forMs: number): string {
  const s = guardInt(sampleMs, 10, 5000, "sample");
  const f = guardInt(forMs, s, 120000, "for");
  return `void (async()=>{const a=[],t=Date.now();while(Date.now()-t<${f}){const n=(await chrome.declarativeNetRequest.getSessionRules()).length;a.push((Date.now()-t)+":"+n);await new Promise(r=>setTimeout(r,${s}))}console.log("RULES timed t0="+t+" ["+a.join(",")+"]")})()`;
}

function wholeLines(dump: string): string[] {
  return dump.split(/\r?\n/).map((l) => l.trim());
}
function lastMatch(dump: string, re: RegExp): RegExpExecArray | null {
  let hit: RegExpExecArray | null = null;
  for (const l of wholeLines(dump)) hit = re.exec(l) ?? hit;
  return hit;
}

export interface ManifestLine { line: string; dnrWithHostAccess: boolean; staticRuleSets: "absent" | "present" }
export function parseManifestLine(dump: string): ManifestLine | null {
  const m = lastMatch(dump, /^MANIFEST dnrWithHostAccess=(true|false) staticRuleSets=(absent|present)$/);
  return m ? { line: m[0], dnrWithHostAccess: m[1] === "true", staticRuleSets: m[2] as "absent" | "present" } : null;
}
export function parseRulesLine(dump: string): { line: string; n: number } | null {
  const m = lastMatch(dump, /^RULES (\d+)$/);
  return m ? { line: m[0], n: Number(m[1]) } : null;
}
/** The samples line, accepted only if its min and max agree with its own samples. */
export function parseRulesSamplesLine(dump: string): { line: string; samples: number[]; min: number; max: number } | null {
  const m = lastMatch(dump, /^RULES samples=\[(\d+(?:,\d+)*)\] min=(\d+) max=(\d+)$/);
  if (!m) return null;
  const samples = m[1]!.split(",").map(Number);
  const min = Number(m[2]);
  const max = Number(m[3]);
  return min === Math.min(...samples) && max === Math.max(...samples) ? { line: m[0], samples, min, max } : null;
}
export function parseCtxLine(dump: string, label: string): { line: string; count: number } | null {
  const m = lastMatch(dump, new RegExp(`^CTX ${guardLabel(label)} count=(\\d+)$`));
  return m ? { line: m[0], count: Number(m[1]) } : null;
}

export function parseCtxTabs(dump: string, label: string): number | null {
  const m = lastMatch(dump, new RegExp(`^CTX ${guardLabel(label)} tabs=(\\d+)$`));
  return m ? Number(m[1]) : null;
}
/** The timed sampler's line, each sample at its own clock time (epoch ms). */
export function parseRulesTimedLine(dump: string): { t0: number; samples: Array<{ t: number; n: number }> } | null {
  const m = lastMatch(dump, /^RULES timed t0=(\d+) \[(\d+:\d+(?:,\d+:\d+)*)\]$/);
  if (!m) return null;
  const t0 = Number(m[1]);
  return { t0, samples: m[2]!.split(",").map((x) => ({ t: t0 + Number(x.split(":")[0]), n: Number(x.split(":")[1]) })) };
}

// ===== H2c: B17 regex (RD-REGEX) =====
export const REGEX_LABELS = Object.freeze(["bank443-schemes", "bank443-explicit", "h119", "h120", "h121"] as const);
export type RegexLabel = (typeof REGEX_LABELS)[number];

/**
 * A JavaScript expression that builds the five regexes from fragments (no `://`, no run of 24 `a`, no `bank.example`)
 * and evaluates to `[[label, regex], …]`. The console expression and the in-process proof run this same text.
 */
export const REGEX_FRAGMENTS_SRC =
  `(()=>{const A="a",e="\\\\.",sep=[":","/","/"].join(""),sub="(?:[^/?#]*[@.])?",end="(?:[/?#]|$)",any="[^:/]+",` +
  `bank=["bank","example"].join(e),port=["80","85"].join(""),` +
  `host=n=>n.map(k=>A.repeat(k)).join(e),` +
  `big=n=>"^"+any+sep+sub+host([24,24,n])+"\\\\.?:"+port+end;` +
  `return [["bank443-schemes","^(?:http|ws)s"+sep+sub+bank+"\\\\.?"+end],` +
  `["bank443-explicit","^"+any+sep+sub+bank+"\\\\.?:"+["4","43"].join("")+end],` +
  `["h119",big(22)],["h120",big(23)],["h121",big(24)]]})()`;

/** `B17 regex`: prints the five `REGEX <label> supported=<b> len=<n>` lines; evaluates to undefined. */
export function regexExpression(): string {
  return `void (async()=>{for(const [l,r] of ${REGEX_FRAGMENTS_SRC}){const x=await chrome.declarativeNetRequest.isRegexSupported({regex:r,isCaseSensitive:false});console.log("REGEX "+l+" supported="+x.isSupported+" len="+r.length)}})()`;
}

export function parseRegexLines(dump: string): Array<{ line: string; label: RegexLabel; supported: boolean; len: number }> | null {
  const out = REGEX_LABELS.map((label) => {
    const m = lastMatch(dump, new RegExp(`^REGEX ${label} supported=(true|false) len=(\\d+)$`));
    return m ? { line: m[0], label, supported: m[1] === "true", len: Number(m[2]) } : null;
  });
  return out.every((x) => x !== null) ? (out as NonNullable<(typeof out)[number]>[]) : null;
}

const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
export const REGEX_NOT_MEASURED = "NOT MEASURED: the typed fragments do not build the regexes of safety-dnr.ts rulesOf";

/** The regexes `rulesOf` builds for the sheet's block lists: `bank.example:443` (two) and each long host with `:8085`. */
export function expectedRegexes(): Record<RegexLabel, string> {
  const of = (text: string): string[] =>
    rulesOf(parseBlockList(text), { kind: "tab", tabId: 0 }, 1).map((r) => r.condition.regexFilter ?? "");
  const [schemes, explicit] = of("bank.example:443");
  return { "bank443-schemes": schemes!, "bank443-explicit": explicit!, h119: of(H119)[0]!, h120: of(H120)[0]!, h121: of(H121)[0]! };
}

/** Evaluates the fragment source in Node (no chrome object) and compares each regex with `rulesOf` by length and sha256. */
export function regexProof(fragmentsSrc: string = REGEX_FRAGMENTS_SRC): "equal" | string {
  let built: unknown;
  try {
    built = runInNewContext(fragmentsSrc, Object.create(null), { timeout: 1000 });
  } catch {
    return REGEX_NOT_MEASURED;
  }
  if (!Array.isArray(built)) return REGEX_NOT_MEASURED;
  const want = expectedRegexes();
  const got = new Map<string, string>(built.map((p) => [String(p[0]), String(p[1])]));
  const same = REGEX_LABELS.every((l) => {
    const g = got.get(l);
    return g !== undefined && g.length === want[l].length && sha(g) === sha(want[l]);
  });
  return same && got.size === REGEX_LABELS.length ? "equal" : REGEX_NOT_MEASURED;
}

// ===== H2d: B17 stored (RD-5's read-back; settles S4-sheet-verifier3 R3-1, R3-2) =====
// The typed expression reads `safety.blockList` from storage.local every 50 ms for a bounded time and POSTs each distinct
// value (the first read included) as text/plain, mode no-cors, to the helper's listener on loopback; the console prints
// one fixed acknowledgement line. The helper compares sha256 in its own process and prints `STORED match=<yes|no> lines=<n>`.
// Neither a hash nor a line of the list reaches the console, the typed text or any printed line.
export const STORED_KEY = "safety.blockList";
export const STORED_ACK = "STOREDPOLL done";

export function storedExpression(port: number, forMs: number): string {
  const p = guardInt(port, 1024, 65535, "port");
  const f = guardInt(forMs, 100, 60000, "for");
  return (
    `void (async()=>{const k="${STORED_KEY}",u=["http",":","/","/","127",".","0",".","0",".","1",":",${p},"/"].join(""),t=Date.now();let last;` +
    `while(Date.now()-t<${f}){const v=(await chrome.storage.local.get(k))[k],s=typeof v==="string"?v:"";` +
    `if(s!==last){last=s;await fetch(u,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:s}).catch(()=>0)}` +
    `await new Promise(r=>setTimeout(r,50))}console.log("${STORED_ACK}")})()`
  );
}
export function parseStoredAck(dump: string): boolean {
  return wholeLines(dump).includes(STORED_ACK);
}

/** The helper's verdict over the bodies received so far (the last one is the current stored value). */
export function judgeStored(received: readonly string[], expected: string): { matched: boolean; line: string } {
  const last = received.length > 0 ? received[received.length - 1]! : undefined;
  const matched = last !== undefined && sha(last) === sha(expected);
  const lines = last === undefined ? 0 : parseBlockList(last).lines.length;
  return { matched, line: `STORED match=${matched ? "yes" : "no"} lines=${lines}` };
}

// ===== H3: the row judges, the timing lines and the Run 17 log scanner (section 4.24 pass rules) =====
/** A judged clause: `nd` = NOT DISCRIMINATING (nothing was tested), `stop` = a STOP line, `notMeasured` as s11-rules. */
export interface J17 extends Judged {
  nd?: true;
  stop?: true;
}
const ok17 = (why: string): J17 => ({ pass: true, why });
const bad17 = (why: string): J17 => ({ pass: false, why });
const nm17 = (why: string): J17 => ({ pass: false, notMeasured: true, why });
const nd17 = (why: string): J17 => ({ pass: false, nd: true, why });
const stop17 = (why: string): J17 => ({ pass: false, stop: true, why });

/** `ROW <id> PASS|FAIL|NOT MEASURED|NOT DISCRIMINATING|STOP: <why>`. */
export function row17Line(id: string, j: J17): string {
  const w = j.pass ? "PASS" : j.stop ? "STOP" : j.nd ? "NOT DISCRIMINATING" : j.notMeasured ? "NOT MEASURED" : "FAIL";
  return `ROW ${id} ${w}: ${j.why}`;
}
/** `RECORD <row> k=v k=v` for a value the sheet says to RECORD that has no line form of its own. */
export function recordLine(row: string, kv: Record<string, string | number | boolean>): string {
  return `RECORD ${row} ${Object.entries(kv).map(([k, v]) => `${k}=${v}`).join(" ")}`;
}

// --- H3a: RULES sampling ---
export interface RuleSample { t: number; n: number }
/** The counts sampled from `send + margin` to `reply - margin` (ms, both edges included). */
export function sampleWindow(samples: readonly RuleSample[], sendT: number, replyT: number, margin = 300): number[] {
  return samples.filter((s) => s.t >= sendT + margin && s.t <= replyT - margin).map((s) => s.n);
}
/** `RULES samples=[…] min=<a> max=<b>`; null for no sample. */
export function rulesSamplesLine(ns: readonly number[]): string | null {
  if (ns.length === 0) return null;
  return `RULES samples=[${ns.join(",")}] min=${Math.min(...ns)} max=${Math.max(...ns)}`;
}
export const rulesExpectLine = (n: number): string => `RULES expect=${n}`;
/** The block-list test pattern BLK of the sheet's fixture table (never printed by any line here). */
const BLK = "localhost:8085";
/** N = `countRules(found + BLK).rules`. */
export function expectedRuleCount(foundText: string): number {
  return countRules(parseBlockList([...foundText.split(/\r?\n/), BLK])).rules;
}
/** RD-REBUILD-NARROW: never 0 while the call is in flight (`min >= 1`), 0 after. */
export function judgeInFlight(inFlight: readonly number[], after: number): J17 {
  if (inFlight.length === 0) return nm17("no RULES sample fell inside the in-flight window");
  if (after !== 0) return stop17(`RULES ${after} after the reply (a rule left installed)`);
  const min = Math.min(...inFlight);
  return min >= 1 ? ok17(`in flight min=${min}, 0 after`) : bad17(`a sample read 0 while the call was in flight (min=${min})`);
}
/** RD-5b, RD-DISARM: the sample(s) at 2.5 s equal N, and 0 after the reply. */
export function judgeSampleThenZero(at: readonly number[], expectN: number, after: number): J17 {
  if (at.length === 0) return nm17("no RULES sample at 2.5 s");
  if (after !== 0) return stop17(`RULES ${after} after the reply (a rule left installed)`);
  return at.every((n) => n === expectN) ? ok17(`sample = ${expectN}, then 0`) : bad17(`sample [${at.join(",")}] differs from the expected ${expectN}`);
}
/** RD-BACK-EMPTY: no rule at any time (`max=0`). */
export function judgeBackEmpty(ns: readonly number[]): J17 {
  if (ns.length === 0) return nm17("no RULES sample");
  const max = Math.max(...ns);
  return max === 0 ? ok17("max=0") : bad17(`a rule existed (max=${max})`);
}

// --- H3b: FOUNDLIST (RD-0 (d)) ---
const FIXTURE_PORTS_D = [8081, 8083, 8085, 8086, 8087, 8088, 8089, 8091] as const;
/** The found list run through the gate's matcher on the fixture URLs of RD-0 (d); `yes` is a STOP. */
export function foundList(text: string): { blocks: boolean; line: string; verdict: J17 } {
  const list = parseBlockList(text.split(/\r?\n/));
  const blocks = FIXTURE_PORTS_D.some((p) => ["127.0.0.1", "localhost"].some((h) => isUrlBlocked(`http://${h}:${p}/e2e-playground.html`, list)));
  return {
    blocks,
    line: `FOUNDLIST blocks-fixtures=${blocks ? "yes" : "no"}`,
    verdict: blocks ? stop17("the found block list matches a fixture URL") : ok17("the found list blocks no fixture URL"),
  };
}

// --- H3c: timing lines and row judges ---
export const latLine = (row: string, ms: number): string => `LAT ${row} ${Math.round(ms)} ms`;
export const gapLine = (ms: number): string => `GAP ${Math.round(ms)} ms`;
/** RD-5: GAP (press to call start) <= 1 000 ms and the call started at or after the read-back, else NOT DISCRIMINATING. */
export function judgeGap(t: { pressT: number; readbackT: number; callT: number }): J17 {
  const gap = t.callT - t.pressT;
  if (t.callT < t.readbackT) return nd17("the call started before the stored list read back holding BLK");
  if (gap > 1000) return nd17(`GAP ${gap} ms is over 1 000 ms`);
  return ok17(`GAP ${gap} ms, call after the read-back`);
}

export type Port = 8083 | 8086 | 8088 | 8089;
export const RD_CTL_LIMITS: Readonly<Record<Port, number>> = Object.freeze({ 8083: 1000, 8088: 1000, 8089: 1000, 8086: 5000 });
export interface Answer { status: number; ms: number }
export const ctlRowLine = (two: readonly Answer[], idle: boolean): string =>
  `ROW RD-CTL concurrent ${two[0]!.status} in ${Math.round(two[0]!.ms)} ms, ${two[1]!.status} in ${Math.round(two[1]!.ms)} ms (idle socket held open: ${idle ? "yes" : "no"})`;
export const ctlFlipLine = (f: readonly [number, number]): string => `CTL 8091 flip ${f[0]} then ${f[1]}`;
/** RD-CTL: every control must hold or the rows would not discriminate; any miss is a STOP. */
export function judgeCtl(i: {
  idleSocket: boolean;
  ports: Record<Port, readonly Answer[]>;
  flip: readonly [number, number];
  ctlBlocked: number;
}): { lines: string[]; verdict: J17 } {
  const lines: string[] = [];
  const miss: string[] = [];
  if (!i.idleSocket) miss.push("no idle socket was held open");
  for (const port of [8083, 8088, 8089, 8086] as const) {
    const two = i.ports[port];
    if (two.length !== 2) {
      miss.push(`${port}: not two answers`);
      continue;
    }
    lines.push(ctlRowLine(two, i.idleSocket));
    for (const a of two) {
      if (a.status !== 302) miss.push(`${port}: answered ${a.status}, not 302`);
      else if (a.ms > RD_CTL_LIMITS[port]) miss.push(`${port}: ${Math.round(a.ms)} ms is over ${RD_CTL_LIMITS[port]} ms`);
    }
  }
  lines.push(ctlFlipLine(i.flip));
  if (i.flip[0] !== 200 || i.flip[1] !== 302) miss.push("8091 flip was not 200 then 302");
  lines.push(`HITS ctl redirect=0 blocked=${i.ctlBlocked}`);
  if (i.ctlBlocked !== 1) miss.push(`the blocked fixture counted ${i.ctlBlocked} for ctl, not exactly 1`);
  return { lines, verdict: miss.length ? stop17(`controls missed: ${miss.join("; ")}`) : ok17("all controls hold") };
}

export type Reply = "ok" | K17Error;
const same = (a: K17Error, b: K17Error): boolean => a.code === b.code && a.message === b.message && a.data === undefined && b.data === undefined;
const isOkOrTab = (a: Reply): boolean => a === "ok" || same(a, K17["K-tab"]);
export const HISTORY_REPLY_MAX_MS = 12000;
/** RD-BACK / RD-FWD (the second forward): blocked 0, the flip server saw 2 requests, reply in time, `ok` or K-tab. */
export function judgeHistory(i: { blocked: number; flipTotal: number; replyMs: number; answer: Reply; rulesAfter: number }): J17 {
  if (i.rulesAfter !== 0) return stop17(`RULES ${i.rulesAfter} after the reply`);
  if (!isOkOrTab(i.answer)) return bad17(`answer ${i.answer === "ok" ? "ok" : i.answer.code} is neither ok nor K-tab`);
  if (i.blocked !== 0) return bad17(`blocked=${i.blocked}, not 0`);
  if (i.replyMs > HISTORY_REPLY_MAX_MS) return bad17(`reply took ${Math.round(i.replyMs)} ms, over ${HISTORY_REPLY_MAX_MS} ms`);
  if (i.flipTotal === 0) return nm17("the flip server saw no request for the tag");
  if (i.flipTotal === 1) return nd17("the flip server saw 1 request (a back/forward-cache restore): nothing was tested");
  return ok17(`blocked=0, ${i.flipTotal} flip requests, reply ${Math.round(i.replyMs)} ms`);
}
/** RD-BACK-SAMEDOC: `ok` in under 1 000 ms (a reply at exactly 1 000 fails). */
export function judgeSamedoc(i: { replyMs: number; answer: Reply; rulesAfter: number }): J17 {
  if (i.rulesAfter !== 0) return stop17(`RULES ${i.rulesAfter} after the reply`);
  if (i.answer !== "ok") return bad17(`answer ${i.answer.code}, not ok`);
  return i.replyMs < 1000 ? ok17(`reply ${Math.round(i.replyMs)} ms`) : bad17(`reply ${Math.round(i.replyMs)} ms, not under 1 000 ms`);
}

/** RD-DL-HOP's `d` = median(hop) - median(err), ms. */
export const dlHopD = (hop: readonly number[], err: readonly number[]): number => median([...hop]) - median([...err]);
/** The sheet's three readings of `d` (about -300; within about 50 of 0; positive beyond 50); the bands used are -350..-250 and -50..50. */
export function dlHopReading(d: number): string {
  if (Number.isNaN(d)) return "not measured";
  if (d >= -350 && d <= -250) return "the event was in hand at the rejection";
  if (d >= -50 && d <= 50) return "the event came late in the 300 ms window (the revisit trigger of #303)";
  if (d > 50) return "unexplained";
  return "between the readings";
}
export function judgeDlHopTrial(i: { answer: Reply; fileExists: boolean; blocked: number; rulesAfter: number }): J17 {
  if (i.rulesAfter !== 0) return stop17(`RULES ${i.rulesAfter} after the reply`);
  if (i.answer === "ok") return stop17("a covered download proceeded after its rules failed to install");
  if (!same(i.answer, K17["K-url"])) return bad17("the answer is not K-url without data");
  if (i.fileExists) return bad17("a file exists");
  return i.blocked === 0 ? ok17("K-url, no file, blocked=0") : bad17(`blocked=${i.blocked}, not 0`);
}
/** RD-DL-ERR: not DOMAIN_BLOCKED; a text other than K-fetch is recorded as NOT as pre-written, not failed. */
export function judgeDlErrTrial(i: { answer: Reply; rulesAfter: number }): J17 {
  if (i.rulesAfter !== 0) return stop17(`RULES ${i.rulesAfter} after the reply`);
  if (i.answer === "ok") return bad17("the call answered ok");
  if (i.answer.code === "DOMAIN_BLOCKED") return bad17("a genuine failure was answered DOMAIN_BLOCKED");
  return same(i.answer, K17["K-fetch"]) ? ok17("K-fetch") : ok17("not DOMAIN_BLOCKED; text NOT as pre-written (recorded)");
}

export const socketLine = (samples: readonly boolean[]): string => `SOCKET samples=${samples.length} connected=${samples.filter(Boolean).length}`;
/** RD-DL-SOCKET: every call ok, every sample connected, RULES 0 after. */
export function judgeSocket(i: { samples: readonly boolean[]; callsOk: number; calls: number; rulesAfter: number }): J17 {
  if (i.samples.length === 0) return nm17("no connection sample");
  if (i.rulesAfter !== 0) return stop17(`RULES ${i.rulesAfter} after the loop`);
  if (i.callsOk !== i.calls) return bad17(`${i.callsOk} of ${i.calls} calls ok`);
  const c = i.samples.filter(Boolean).length;
  return c === i.samples.length ? ok17(`all ${c} samples connected`) : bad17(`${i.samples.length - c} of ${i.samples.length} samples not connected`);
}

export interface RaceCall { n: number; start: number; reply: number; outcome: string }
export const callLine = (c: RaceCall): string => `CALL ${c.n} start=${c.start} reply=${c.reply} ${c.outcome}`;
/** R17-UP-RACE-A: no ok from a call that started at or after P + 1 000; one ok and one refusal at least; records first refusal start minus P. */
export function judgeRaceA(calls: readonly RaceCall[], p: number): { verdict: J17; record: string | null } {
  const refusals = calls.filter((c) => c.outcome !== "ok");
  const record = refusals.length ? recordLine("R17-UP-RACE-A", { "first-refusal-after-P": `${Math.min(...refusals.map((c) => c.start)) - p} ms` }) : null;
  const late = calls.filter((c) => c.outcome === "ok" && c.start >= p + 1000);
  if (late.length) return { verdict: bad17(`${late.length} call(s) started at or after P + 1 000 ms answered ok`), record };
  if (refusals.length === 0 || refusals.length === calls.length) return { verdict: nd17("needs at least one ok and one refusal"), record };
  return { verdict: ok17("no ok from a call started at or after P + 1 000 ms"), record };
}

// --- H3d: the Run 17 scanner (RD-LOGS) ---
const FIXTURE_PORTS_17 = "8081|8083|8085|8086|8087|8088|8089|8090|8091";
const FIXTURE_HOST_17 = new RegExp(`^(?:127\\.0\\.0\\.1|(?:[a-z0-9-]+\\.)*localhost):(?:${FIXTURE_PORTS_17})$`);
/** http on 127.0.0.1 / localhost / *.localhost at the sheet's ports, chrome://extensions, this extension's own pages. */
export function isFixture17(url: string, ownId = ""): boolean {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^\s/"'`)<>\\?#,;\]]+)/i.exec(url);
  if (!m) return false;
  const scheme = m[1]!.toLowerCase();
  const host = m[2]!.toLowerCase();
  if (scheme === "http") return FIXTURE_HOST_17.test(host);
  if (scheme === "chrome") return host === "extensions";
  return scheme === "chrome-extension" && ownId !== "" && host === ownId.toLowerCase();
}
export interface Scan17Ctx {
  token?: string;
  sentinel: string;
  profile: readonly string[];
  /** R17-UP-7 (b)'s fixture alias; counted, never printed. */
  alias?: string;
  ownId?: string;
  /** True only for the worker console capture: the one stream in which Chrome's own blocked-request lines are counted apart (#306). */
  consoleStream?: boolean;
}
/**
 * RD-DL-SOCKET's window: two marks (strings that stand in the console capture) or, for `daemon.log` (no mark can be written into it), the
 * line counts at the window's two ends (`fromLine` inclusive, `toLine` exclusive, 0-based, relative to the scanned file).
 */
export type SockWindow = { start: string; end: string } | { fromLine: number; toLine: number };
export interface Scan17 {
  urls: number;
  fixture: number;
  other: number;
  token: number;
  localhost8085: number;
  a24: number;
  bank: number;
  alias: number;
  sock127: number;
  sentinel: number;
  profile: number;
  tokenKnown: boolean;
  /** R17-UP-7's alias was given (an unknown alias makes `alias7=0` hold by construction, so it is NOT MEASURED, M3). */
  aliasKnown: boolean;
  sockMarksMissing: boolean;
  /** Console lines Chrome wrote for a request DNR blocked, naming only the BLK fixture origin (#306); excluded from every other count. */
  chromeBlocked: number;
}
const countOf = (hay: string, needle: string): number => (needle === "" ? 0 : hay.split(needle).length - 1);
const A24 = "a".repeat(24);
const OWN_SCAN_LINE = new RegExp(`^SCAN [\\w .-]+: ://=\\d+ \\(fixture \\d+, other \\d+\\) token=\\d+ localhost:8085=\\d+ ${A24}=\\d+ bank\\.example=\\d+ alias7=\\d+ sock127=\\d+ sentinel=\\d+ profile=\\d+(?: chrome-blocked=\\d+)?$`);
/** Counts only. The scanner's own whole `SCAN …` lines are not scanned (their labels would count). */
export function scan17(text: string, ctx: Scan17Ctx, sock?: SockWindow): Scan17 {
  let chromeBlocked = 0;
  const body = text.split(/\r?\n/).filter((l) => {
    if (OWN_SCAN_LINE.test(l.trim())) return false;
    if (isChromeBlockedLine17(l, ctx)) { chromeBlocked++; return false; }
    return true;
  }).join("\n");
  let urls = 0;
  let fixture = 0;
  for (const m of body.matchAll(/[a-z][a-z0-9+.-]*:\/\/[^\s/'"`<>)\]\\,;]*/gi)) {
    urls++;
    if (isFixture17(m[0], ctx.ownId)) fixture++;
  }
  const low = body.toLowerCase();
  const forms = new Set<string>();
  for (const p of ctx.profile) {
    const b = p.replace(/\//g, "\\").toLowerCase();
    forms.add(b).add(b.replace(/\\/g, "/")).add(b.replace(/\\/g, "\\\\"));
  }
  let sock127 = 0;
  let sockMarksMissing = false;
  if (sock && "start" in sock) {
    const a = body.indexOf(sock.start);
    const b = a < 0 ? -1 : body.indexOf(sock.end, a + sock.start.length);
    if (a < 0 || b < 0) sockMarksMissing = true;
    else sock127 = countOf(body.slice(a + sock.start.length, b), "127.0.0.1");
  } else if (sock) {
    const all = text.split(/\r?\n/);
    if (!Number.isInteger(sock.fromLine) || !Number.isInteger(sock.toLine) || sock.fromLine < 0 || sock.toLine < sock.fromLine || sock.toLine > all.length) sockMarksMissing = true;
    else sock127 = countOf(all.slice(sock.fromLine, sock.toLine).join("\n"), "127.0.0.1");
  }
  return {
    urls,
    fixture,
    other: urls - fixture,
    token: ctx.token ? countOf(body, ctx.token) : 0,
    localhost8085: countOf(low, "localhost:8085"),
    a24: (body.match(/a{24,}/gi) ?? []).length,
    bank: countOf(low, "bank.example"),
    alias: ctx.alias ? countOf(low, ctx.alias.toLowerCase()) : 0,
    sock127,
    sentinel: countOf(low, ctx.sentinel.toLowerCase()),
    profile: [...forms].reduce((n, f) => n + countOf(low, f), 0),
    tokenKnown: !!ctx.token,
    aliasKnown: !!ctx.alias,
    sockMarksMissing,
    chromeBlocked,
  };
}
const CHROME_BLOCKED_MARK = "net::ERR_BLOCKED_BY_CLIENT";
/**
 * #306: a console line is Chrome's own blocked-request line only if the stream is the console, it holds Chrome's `net::ERR_BLOCKED_BY_CLIENT`,
 * it is not a `[bridge]` product line, it names `localhost:8085` and no other pattern (no non-fixture URL, token, alias, sentinel, profile path,
 * bank.example, a-run) and no `127.0.0.1`. Anything else stays counted and a STOP.
 */
export function isChromeBlockedLine17(line: string, ctx: Scan17Ctx): boolean {
  if (!ctx.consoleStream || !line.includes(CHROME_BLOCKED_MARK) || line.includes("[bridge]") || line.includes("127.0.0.1")) return false;
  const i = scan17(line, { ...ctx, consoleStream: false });
  return i.localhost8085 > 0 && i.other + i.token + i.a24 + i.bank + i.alias + i.sentinel + i.profile === 0;
}
export const CHROME_BLOCKED_LABEL = "[chrome-blocked line redacted]";
/** Committed evidence holds a Chrome blocked-request line only as this label (#306). Qualifying is decided by `isChromeBlockedLine17`. */
export function redactChromeBlocked17(text: string, ctx: Scan17Ctx): { text: string; redacted: number } {
  let redacted = 0;
  const out = text.split(/\r?\n/).map((l) => (isChromeBlockedLine17(l, { ...ctx, consoleStream: true }) ? (redacted++, CHROME_BLOCKED_LABEL) : l));
  return { text: out.join("\n"), redacted };
}
/** RD-LOGS's Expected line, character for character; `chrome-blocked=<n>` is appended only when n > 0 (#306). */
export function scanLine17(what: string, s: Scan17): string {
  return `SCAN ${what}: ://=${s.urls} (fixture ${s.fixture}, other ${s.other}) token=${s.token} localhost:8085=${s.localhost8085} ${A24}=${s.a24} bank.example=${s.bank} alias7=${s.alias} sock127=${s.sock127} sentinel=${s.sentinel} profile=${s.profile}${s.chromeBlocked > 0 ? ` chrome-blocked=${s.chromeBlocked}` : ""}`;
}
/** A non-zero count other than fixture `://` is a STOP; an unknown token, a missing control line or missing socket marks is NOT MEASURED. */
export function verdict17(s: Scan17, o: { consoleControl?: boolean }): J17 {
  if (s.other + s.token + s.localhost8085 + s.a24 + s.bank + s.alias + s.sock127 + s.sentinel + s.profile > 0)
    return stop17("a non-zero count (non-fixture URL, token, pattern, alias, 127.0.0.1 in the socket window, sentinel or profile path)");
  if (!s.tokenKnown) return nm17("the token could not be found, so its count is not measured");
  if (!s.aliasKnown) return nm17("R17-UP-7's alias was not given to the scan, so alias7 is not measured");
  if (s.sockMarksMissing) return nm17("RD-DL-SOCKET's window marks were not found");
  if (o.consoleControl === false) return nm17("the console capture lacks the 'safety: disarmed by the user' line");
  return ok17("all counts zero");
}

// ===== H5: the SDK subcommands' pure parts (history URLs, race pacing, banner window, exact-error judge) =====
/** Exact code, message and data (a missing `data` must be missing) against a K17 entry. Names no message text. */
export function judgeErr17(obs: { code: string; message: string; data?: unknown } | undefined, want: K17Error, label: string): J17 {
  if (obs === undefined) return bad17(`${label}: the call did not fail`);
  if (obs.code !== want.code) return bad17(`${label}: code ${obs.code}, want ${want.code}`);
  if (obs.message !== want.message) return bad17(`${label}: message differs from the sheet's text`);
  if (JSON.stringify(obs.data) !== JSON.stringify(want.data)) return bad17(`${label}: data differs from the sheet's`);
  return ok17(`${label}: exact`);
}

export type HistoryKind = "back" | "fwd" | "samedoc" | "empty";
/** The tab histories built before G1 (the list as found): the urls to `navigate` in order, then how many `back` calls follow. */
export function historyPlan(kind: HistoryKind, tag?: string): { urls: string[]; backs: number } {
  const p81 = (q: string): string => `http://localhost:8081/e2e-playground.html?s11b=${q}`;
  const flip = (p: string, t: string): string => `http://localhost:8091/h/${p}?s11b=${t}`;
  if (kind === "back") return { urls: [flip("back", tag ?? "bk"), p81(`${tag ?? "bk"}p`)], backs: 0 };
  if (kind === "fwd") return { urls: [p81(`${tag ?? "fw"}0`), p81(`${tag ?? "fw"}1`), flip("fwd", tag ?? "fw")], backs: 2 };
  if (kind === "samedoc") return { urls: [p81(tag ?? "sd"), `${p81(tag ?? "sd")}#h2`], backs: 0 };
  return { urls: [p81(`${tag ?? "be"}0`), p81(`${tag ?? "be"}1`)], backs: 0 };
}

export const RACE_SPACING_MS = 150;
export const RACE_MIN_CALLS = 60;
export const RACE_MAX_CALLS = 120;
/** Call n (1-based) is due this many ms after the ready signal: paced from the schedule, never from the previous reply. */
export const raceDue = (n: number): number => (n - 1) * RACE_SPACING_MS;
/** Stop after the cap, or after the minimum once the last five calls were all refusals. */
export function raceDone17(outcomes: readonly string[]): boolean {
  const n = outcomes.length;
  return n >= RACE_MAX_CALLS || (n >= RACE_MIN_CALLS && outcomes.slice(-5).every((o) => o !== "ok") && n >= 5);
}

export const WINDOW_BEFORE_MS = 500;
export const WINDOW_AFTER_MS = 2500;
export interface CallSpan { start: number; end: number }
/** Bridge calls (other than the one inside) that overlap [call - 500, reply + 2 500]. */
export function windowViolations(others: readonly CallSpan[], callStart: number, reply: number): number {
  const from = callStart - WINDOW_BEFORE_MS;
  const to = reply + WINDOW_AFTER_MS;
  return others.filter((c) => c.start <= to && c.end >= from).length;
}

// ===== H8: typed-lines judges, timed RULES windows, history and gap judges =====
const optSumRe = /^(?:No upload folder: every upload is refused\.|(\d+) upload folders?\.)(?: (\d+) invalid lines? (?:is|are) not used \(marked below\)\.)?$/;
/** K-opt-sum read back: the valid and invalid counts of a summary text (null when it is not of that form). */
export function parseOptSum(s: string): { valid: number; invalid: number } | null {
  const m = optSumRe.exec(s);
  return m ? { valid: m[1] === undefined ? 0 : Number(m[1]), invalid: m[2] === undefined ? 0 : Number(m[2]) } : null;
}
/** F-HOME's five typed lines, after the found text (the `work` line, third, is a folder inside a home folder: valid). */
export const HOME_TYPED: readonly string[] = Object.freeze(["C:\\Users\\fixture-home", "C:\\Users", "C:\\Users\\fixture-home\\work", "/home/fixture-home", "/root"]);
/** R17-UP-OPT's three typed lines (as §4.23's UP-OPT). */
export const OPT_TYPED: readonly string[] = Object.freeze(["relative\\fixture-folder", "C:\\", "C:\\Users\\fixture-home"]);
const toArr = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : x === undefined || x === null ? [] : [String(x)]);
/** The K-opt-item texts of lines `from` and up, in line order (found-text lines above `from` are not this row's). */
export function itemsFrom(items: unknown, from: number): string[] {
  const n = (t: string): number => Number(/^Line (\d+): /.exec(t)?.[1] ?? -1);
  return toArr(items).filter((t) => n(t) >= from).sort((a, b) => n(a) - n(b));
}
const same2 = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
export interface FHomeObs { foundSummary: string; standing: number; summaryTyped: string; items: unknown; foundCount: number; storedEqual: boolean }
/** F-HOME: the standing text once, the summary with f+1 valid and fi+4 invalid, four home items (not the `work` line), nothing stored. */
export function judgeFHome(o: FHomeObs): J17 {
  const f = parseOptSum(o.foundSummary);
  if (!f) return nm17("the found summary is not of K-opt-sum's form");
  if (o.standing !== 1) return bad17(`K-opt-stand stood ${o.standing} times, not once`);
  const want = k17OptSum(f.valid + 1, f.invalid + 4);
  if (o.summaryTyped !== want) return bad17("the summary differs from K-opt-sum for f+1 valid and fi+4 invalid lines");
  const k = o.foundCount + 1;
  const wantItems = [0, 1, 3, 4].map((i) => k17OptItem(k + i, HOME_TYPED[i]!, K17_TEXT["K-opt-home"]));
  const got = itemsFrom(o.items, k);
  if (!same2(got, wantItems)) return bad17(`the items differ from the four K-opt-home items (got ${got.length}, want 4; the work line must not be listed)`);
  return o.storedEqual ? ok17("summary and four K-opt-home items exact, the work line valid, nothing stored") : bad17("the stored text changed by typing");
}
export interface UpOptObs extends FHomeObs {
  summaryAfterSave: string; summaryAfterRevert: string; firstTypedLine: number; o2Ms: number; o2Conflict: boolean;
  setSha: string; storedSha: string; storedWhileTypingSha: string;
}
/** R17-UP-OPT with S0F-a's expectations; O2 within 5 000 ms (Run 16 took 6 061 ms and failed; the bound is not moved). */
export function judgeUpOpt(o: UpOptObs): J17 {
  const f = parseOptSum(o.foundSummary);
  if (!f) return nm17("the found summary is not of K-opt-sum's form");
  if (o.standing !== 1) return bad17(`K-opt-stand stood ${o.standing} times, not once`);
  const saved = k17OptSum(f.valid + 1, f.invalid);
  if (o.summaryAfterSave !== saved) return bad17("the summary after the save differs from K-opt-sum");
  if (o.summaryTyped !== k17OptSum(f.valid + 1, f.invalid + 3)) return bad17("the summary while typed differs from K-opt-sum (fi+3 invalid)");
  if (o.summaryAfterRevert !== saved) return bad17("the summary after the revert differs from K-opt-sum");
  const n = o.firstTypedLine;
  const want = [k17OptItem(n, OPT_TYPED[0]!, K17_TEXT["K-opt-rel"]), k17OptItem(n + 1, OPT_TYPED[1]!, K17_TEXT["K-opt-root"]), k17OptItem(n + 2, OPT_TYPED[2]!, K17_TEXT["K-opt-home"])];
  if (!same2(itemsFrom(o.items, n), want)) return bad17("the items differ from K-opt-rel, K-opt-root and K-opt-home (no warning item)");
  if (o.setSha !== o.storedSha) return bad17("the stored text differs from the text set");
  if (o.storedWhileTypingSha !== o.storedSha) return bad17("typing stored something");
  if (o.o2Conflict) return bad17("O2 showed a conflict note");
  if (o.o2Ms > 5000) return bad17(`O2 showed the saved text after ${Math.round(o.o2Ms)} ms, over 5 000 ms`);
  return ok17(`summaries and items exact, O2 in ${Math.round(o.o2Ms)} ms`);
}
export interface CapsObs { bl: number; afterTwo: unknown; afterThree: unknown; storedEqual: boolean }
/** RD-CAPS-WARN: after H119, H120 exactly one K-caps item for line bl+2 (H119 alone warns nothing); after H121 lines bl+2 and bl+3. */
export function judgeCaps(o: CapsObs): J17 {
  const two = toArr(o.afterTwo);
  const three = toArr(o.afterThree);
  if (!same2(two, [k17Caps([o.bl + 2])])) return bad17(`after H119, H120 the caps list holds ${two.length} item(s), not exactly K-caps for line bl+2`);
  if (!same2(three, [k17Caps([o.bl + 2, o.bl + 3])])) return bad17(`after H121 the caps list holds ${three.length} item(s), not exactly K-caps for lines bl+2, bl+3`);
  return o.storedEqual ? ok17("exact K-caps items, nothing stored") : bad17("the stored block list changed by typing");
}

export type TimedMode = "at" | "inflight" | "empty";
/**
 * One timed sampler read against a call's send and reply times (ms, the same clock). at: the samples 2 300..2 700 ms after the
 * send must all equal N (RD-5b, RD-DISARM); inflight: 300 ms in from both edges, never 0 (RD-REBUILD-NARROW); empty: every sample
 * from the send to the reply is 0 (RD-BACK-EMPTY). Always: 0 after (samples from 300 ms past the reply) except `empty`.
 */
export function judgeTimedRules(mode: TimedMode, samples: readonly RuleSample[], send: number, reply: number, expectN = 0): { window: number[]; after: number | null; verdict: J17 } {
  const after = samples.filter((s) => s.t >= reply + 300).map((s) => s.n);
  const afterN = after.length ? Math.max(...after) : null;
  if (mode === "empty") {
    const w = samples.filter((s) => s.t >= send && s.t <= reply).map((s) => s.n);
    return { window: w, after: afterN, verdict: judgeBackEmpty(w) };
  }
  if (afterN === null) return { window: [], after: null, verdict: nm17("no RULES sample after the reply (the sampler ended early)") };
  if (mode === "inflight") {
    const w = sampleWindow(samples, send, reply, 300);
    return { window: w, after: afterN, verdict: judgeInFlight(w, afterN) };
  }
  const w = samples.filter((s) => s.t >= send + 2300 && s.t <= send + 2700).map((s) => s.n);
  return { window: w, after: afterN, verdict: judgeSampleThenZero(w, expectN, afterN) };
}

/** `B17 judge-history`: the history rows' pass rules over values measured after the call (hits, flip count, RULES). */
export function judgeHistoryRow(row: string, i: { kind: string; ms: number; rulesAfter: number | null; blocked?: number; flipTotal?: number }): J17 {
  const answer: Reply = i.kind === "ok" ? "ok" : i.kind === "K-tab" ? K17["K-tab"] : { code: i.kind, message: "" };
  const unmeasured = i.rulesAfter === null;
  const rulesAfter = i.rulesAfter ?? 0;
  let j: J17;
  if (row === "RD-BACK" || row === "RD-FWD") j = judgeHistory({ blocked: i.blocked ?? -1, flipTotal: i.flipTotal ?? 0, replyMs: i.ms, answer, rulesAfter });
  else if (row === "RD-BACK-SAMEDOC") j = judgeSamedoc({ replyMs: i.ms, answer, rulesAfter });
  else if (rulesAfter !== 0) j = stop17(`RULES ${rulesAfter} after the reply`);
  else j = answer === "ok" ? ok17("ok, as before Step 11b") : stop17(`answer ${answer.code}, not ok: a call on a page with no redirect answers differently`);
  return unmeasured && j.pass ? nm17(`${j.why}; RULES after the reply NOT MEASURED`) : j;
}
/** RD-5's GAP line and judge (a pure pass-through of judgeGap with its printed line). */
export const gapJudge = (pressT: number, readbackT: number, callT: number): { line: string; verdict: J17 } => ({ line: gapLine(callT - pressT), verdict: judgeGap({ pressT, readbackT, callT }) });
/** One in-flight call's answer against the sheet's expectation (`tab-or-url`: K-tab or K-url). */
export function judgeCallAnswer(expect: string, err: { code: string; message: string; data?: unknown } | undefined, label: string): J17 {
  if (expect === "ok") return err ? bad17(`${label}: answer ${err.code}, not ok`) : ok17(`${label}: ok`);
  // A covered call (K-tab or K-url expected) that answers ok proceeded: the sheet's row-level STOP, not a plain failure.
  if (err === undefined && (expect === "tab-or-url" || expect === "url")) return stop17(`${label}: a covered call proceeded after its rules failed to install`);
  const wants =
    expect === "tab-or-url" ? [K17["K-tab"], K17["K-url"]]
    : expect === "url" ? [K17["K-url"]]
    : expect === "disarmed" ? [K17["K-disarmed"]]
    : expect === "filepage" ? [K17["K-filepage"]]
    : expect === "fileurl" ? [K17["K-fileurl"]]
    : [];
  if (wants.length === 0) return nm17(`${label}: unknown expectation`);
  const rs = wants.map((w) => judgeErr17(err, w, label));
  return rs.find((r) => r.pass) ?? rs[0]!;
}

// ===== S4-helpers fixer: RD-0's STATE line, RD-DL-* judges over S9's own ROW lines, the socket marks, the console capture's title lines =====
/** RD-0 (c): the sheet's STATE line (hashes withheld; `valid`/`invalid` per `analyzeUploadFolders` of the found Upload folders text). */
export function rd0StateLine(i: { armed: boolean; evaluate: boolean; blockLines: number; valid: number; invalid: number }): string {
  return `STATE armed=${i.armed} evaluate=${i.evaluate} blocklist lines=${i.blockLines} uploadfolders valid=${i.valid} invalid=${i.invalid}`;
}
export const rd0ToggleLine = (t: "on" | "off"): string => `TOGGLE reading ${t}`;
/** RD-0 (c): armed with JavaScript on else STOP; the toggle readable (on or off) else STOP. */
export function judgeRd0State(i: { armed: boolean; evaluate: boolean; toggle: string }): J17 {
  if (!i.armed || !i.evaluate) return stop17("the found state is not armed with JavaScript on");
  if (i.toggle !== "on" && i.toggle !== "off") return stop17("the file-URL toggle is not readable");
  return ok17(`armed, JavaScript on, the toggle reads ${i.toggle}`);
}

/** RD-DL-SOCKET's two console marks: fixed, pattern-free text, typed once each at the window's ends. */
export const SOCK_MARKS = Object.freeze({ start: "S11B-SOCK-START", end: "S11B-SOCK-END" });
export type SockLabel = keyof typeof SOCK_MARKS;
export function markExpression(label: string): string {
  if (label !== "start" && label !== "end") throw new Error("label is start or end");
  return `void console.log("${SOCK_MARKS[label]}")`;
}
/** The mark's whole output line (the echoed input holds it inside code, never as a whole line). */
export function parseMarkLine(dump: string, label: string): string | null {
  if (label !== "start" && label !== "end") throw new Error("label is start or end");
  return lastMatch(dump, new RegExp(`^${SOCK_MARKS[label]}$`))?.[0] ?? null;
}

/** One `S9 call` row line: `ROW <id> <step> <ok|CODE> <message> [data <json>] (<ms> ms)`. The `-file` line has no `(ms)` and never matches. */
export interface CallRow { code: string; message: string; data?: unknown; ms: number }
export function parseCallRow(text: string, step: string): CallRow | null {
  const esc = step.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^ROW \\S+ ${esc} (ok|[A-Z][A-Z0-9_]*)(?: (.*?))? \\((\\d+) ms\\)$`);
  let hit: RegExpExecArray | null = null;
  for (const l of wholeLines(text)) hit = re.exec(l) ?? hit;
  if (!hit) return null;
  const rest = hit[2] ?? "";
  const at = rest.lastIndexOf(" data ");
  let message = rest;
  let data: unknown;
  if (at >= 0) {
    try {
      data = JSON.parse(rest.slice(at + 6));
      message = rest.slice(0, at);
    } catch {
      data = undefined;
    }
  }
  return { code: hit[1]!, message, ...(data === undefined ? {} : { data }), ms: Number(hit[3]) };
}
/** `ROW <id> <step>-file <name> exists=<yes|no> part=<yes|no>`: true when a file or its `.part` exists; null when the line is missing. */
export function fileExistsFrom(text: string, step: string): boolean | null {
  const esc = step.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = lastMatch(text, new RegExp(`^ROW \\S+ ${esc}-file \\S+ exists=(yes|no) part=(yes|no)$`));
  return m ? m[1] === "yes" || m[2] === "yes" : null;
}
/** F-FILETAB's `tabs` row: exactly one tab hidden as `blocked` (S9's `tabs total=… hidden(blocked)=<n> …` detail), else NOT MEASURED. */
export function judgeFileTabRow(row: CallRow | null): J17 {
  if (!row || row.code !== "ok") return nm17("the tabs call did not answer ok");
  const m = /hidden\(blocked\)=(\d+)/.exec(row.message);
  if (!m) return nm17("the tabs row holds no hidden(blocked) count");
  return Number(m[1]) === 1 ? ok17("exactly one tab is hidden as blocked") : nm17(`${m[1]} tabs are hidden as blocked, not exactly one`);
}
/** A row of the SDK's tab list as F-FILETAB reads it (`client.tabs()`: `hidden`, `url`, `title`; the SDK gives "" for a withheld value). */
export interface FileTabListRow { hidden?: string; url?: string; title?: string }
/**
 * F-FILETAB's clause "the row has `hidden=blocked`, no `url`, no `title` (exactly one hidden row; else NOT MEASURED)", judged over the
 * SDK's own rows (S4-helpers fixer 3, m3-2). The line holds labels and counts only: never a URL or a title.
 */
export function judgeFileTabHidden(rows: readonly FileTabListRow[]): { line: string; verdict: J17 } {
  const hid = rows.filter((r) => r.hidden !== undefined);
  const has = (v: string | undefined): "yes" | "no" => (typeof v === "string" && v !== "" ? "yes" : "no");
  if (hid.length !== 1) return { line: `TABSHIDDEN F-FILETAB rows=${rows.length} hidden=${hid.length}`, verdict: nm17(`${hid.length} hidden rows, not exactly one`) };
  const r = hid[0]!;
  const reason = r.hidden === "blocked" || r.hidden === "disarmed" ? r.hidden : "other";
  const line = `TABSHIDDEN F-FILETAB rows=${rows.length} hidden=1 reason=${reason} url=${has(r.url)} title=${has(r.title)}`;
  const bad = [reason !== "blocked" ? `hidden=${reason}, not blocked` : "", has(r.url) === "yes" ? "the hidden row has a url" : "", has(r.title) === "yes" ? "the hidden row has a title" : ""].filter(Boolean);
  return { line, verdict: bad.length ? bad17(bad.join("; ")) : ok17("the one hidden row is hidden=blocked with no url and no title") };
}
/** The answer of a parsed call row as the judges take it (`undefined` = the call did not fail). */
export const answerOfRow = (r: CallRow): { code: string; message: string; data?: unknown } | undefined => (r.code === "ok" ? undefined : { code: r.code, message: r.message, ...(r.data === undefined ? {} : { data: r.data }) });

/**
 * RD-DL-ERR / RD-DL-HOP, one trial, over S9's own row lines. A value that was not read (`null`) cannot pass: a pass with one is NOT MEASURED.
 * `err`: not DOMAIN_BLOCKED, a text other than K-fetch is recorded, not failed. `hop`: K-url no data, no file, blocked 0; an `ok` is a STOP.
 */
export function judgeDlTrial(kind: "err" | "hop", row: CallRow, i: { fileExists: boolean | null; blocked: number | null; rulesAfter: number | null }): J17 {
  const reply: Reply = row.code === "ok" ? "ok" : { code: row.code, message: row.message, ...(row.data === undefined ? {} : { data: row.data as Record<string, unknown> }) };
  const j = kind === "err" ? judgeDlErrTrial({ answer: reply, rulesAfter: i.rulesAfter ?? 0 }) : judgeDlHopTrial({ answer: reply, fileExists: i.fileExists ?? false, blocked: i.blocked ?? 0, rulesAfter: i.rulesAfter ?? 0 });
  if (!j.pass) return j;
  const lacks = [i.rulesAfter === null ? "RULES after the reply" : "", kind === "hop" && i.fileExists === null ? "the file check" : "", kind === "hop" && i.blocked === null ? "the blocked count" : ""].filter(Boolean);
  return lacks.length ? nm17(`${j.why}; NOT MEASURED: ${lacks.join(", ")}`) : j;
}
/** RD-DL-HOP's RECORD line: the three hop and err times, RD-3's time, `d` and the reading stated before the run. Any missing time: not measured. */
export function dlHopRecord(hop: readonly number[], err: readonly number[], rd3?: number): string {
  const d = hop.length === 3 && err.length === 3 ? dlHopD(hop, err) : NaN;
  const kv: Record<string, string | number> = { hop: hop.join(","), err: err.join(","), ...(rd3 === undefined ? {} : { rd3 }), d: Number.isNaN(d) ? "NOT MEASURED" : `${Math.round(d)} ms`, reading: dlHopReading(d) };
  return recordLine("RD-DL-HOP", kv);
}

/**
 * The worker console capture's window-title lines (#283): the DevTools window's name is `DevTools` or `DevTools - <profile display name>`,
 * and a Chrome window title ends in `- Google Chrome`. They are dropped from the capture before it is scanned or committed.
 */
export const isTitleLine = (l: string): boolean => /^DevTools(?: - .*)?$/i.test(l.trim()) || / - (?:Google )?Chrome$/i.test(l.trim());
export function dropTitleLines(text: string): { text: string; dropped: number } {
  const all = text.split(/\r?\n/);
  const kept = all.filter((l) => !isTitleLine(l));
  return { text: kept.join("\n"), dropped: all.length - kept.length };
}
