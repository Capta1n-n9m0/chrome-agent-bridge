/**
 * Step 11b S1: the block list as `declarativeNetRequest` session rules. Pure: no `chrome.*`, no log call. The rules
 * are a function of the gate's own parsed `BlockList` only (phase doc 0.5; decisions.md · 2026-10-26 · Step 11b: the
 * rule set stays equal to the block list and fails closed (#292)), and block exactly what `patternMatches` blocks.
 *
 * The translation (Stage0.md §6 item 7, ruled by #296; the measured DNR facts are Stage0.md §4):
 * - plain hosts (no `*.`, no port, not an IP literal) → one `requestDomains` rule with the canonical hosts
 *   (Chrome: the host or a subdomain, dot boundary, port ignored, a trailing-dot URL host matching; one such rule
 *   took 1,000,000 hosts, Stage0.md §1 (4));
 * - `*.`, `:port` and IP literals → one anchored `regexFilter` each, two for a default port (`:80`, `:443`, `:21`:
 *   one regex per pattern would write the host twice and pass Chrome's 2 KiB regex memory cap; S1-fixer.md) (RE2
 *   subset: no lookaround, no backreference), matched case-insensitively on the canonical URL, where a default port
 *   never appears; a host too long for the cap makes Chrome reject the rule, which fails closed (phase doc 0.5); IP
 *   literals cannot use
 *   `requestDomains` (Chrome suffix-matches them: `0.0.1` blocked `127.0.0.1`).
 *
 * Two scopes (phase doc 0.4 (C), #290): a tab (`tabIds: [tabId]`, `main_frame`) and the download
 * (`tabIds: [-1]`, the own initiator, `xmlhttprequest` — never untyped: an untyped rule cut the offscreen socket).
 * Ids run contiguously from `idBase`; `countRules` tells a caller in advance how many ids and regex rules a list takes,
 * and `fitsCaps` checks the sum over every live call against the caps Chrome reports at run time.
 *
 * Never log a rule, pattern or URL from here (CLAUDE.md); nothing but the rules carries pattern text.
 */
import type { BlockList, HostPattern } from "./safety-match.js";

export type DnrResourceType = "main_frame" | "xmlhttprequest";

/** The subset of `chrome.declarativeNetRequest.Rule` this module produces (structural; no `@types/chrome` needed). */
export interface DnrRule {
  id: number;
  priority: 1;
  action: { type: "block" };
  condition: {
    requestDomains?: string[];
    regexFilter?: string;
    isUrlFilterCaseSensitive?: false;
    tabIds: number[];
    initiatorDomains?: string[];
    resourceTypes: DnrResourceType[];
  };
}

export type DnrScope =
  | { kind: "tab"; tabId: number }
  | { kind: "download"; extensionId: string };

/** How many rules (= ids) and how many of them regex rules a list takes, whatever the scope. */
export interface DnrCounts {
  rules: number;
  regexRules: number;
}

/** Chrome's caps, read at run time (`MAX_NUMBER_OF_SESSION_RULES`, `MAX_NUMBER_OF_REGEX_RULES`). */
export interface DnrCaps {
  sessionRules: number;
  regexRules: number;
}

/** The default schemes of a port, as a regex (`safety-match.ts` DEFAULT_PORTS: the canonical URL omits that port). */
const DEFAULT_PORT_SCHEMES: Readonly<Record<number, string>> = { 80: "(?:http|ws)", 443: "(?:http|ws)s", 21: "ftp" };

/**
 * The parts, sized for Chrome's per-regex memory cap (RE2, Latin-1, 2 KiB: S1-fixer.md has the calibration). Each is
 * exact on the canonical URL, where the scheme is the text before the first `:` and an `@` in the authority is only
 * the userinfo's end (the userinfo's own `@` is percent-encoded):
 * - SCHEME: a valid scheme holds no `:` or `/`;
 * - MAYBE_SUB: nothing, or any authority text ending in `@` (the userinfo) or `.` (a label boundary); the host
 *   literal that follows runs to the authority's end, so the `.` before it is the host's own and the subdomain
 *   match keeps its dot boundary;
 * - SUBS: the same, at least one label (`*.`);
 * - USERINFO: an IP literal's optional userinfo.
 */
const SCHEME = "[^:/]+";
const MAYBE_SUB = "(?:[^/?#]*[@.])?";
const SUBS = "[^/?#]*\\.";
const USERINFO = "(?:[^/?#]*@)?";
const END = "(?:[/?#]|$)";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const isPlain = (p: HostPattern) => !p.ip && !p.subdomainsOnly && p.port === undefined;

/**
 * The anchored regexes of one non-plain pattern: one, or two for a default port (the URL without a port on that
 * port's schemes, and the explicit port on any scheme), so that no single regex writes the host twice.
 */
function regexesOf(p: HostPattern): string[] {
  const host = p.ip ? USERINFO + escapeRe(p.host) : (p.subdomainsOnly ? SUBS : MAYBE_SUB) + escapeRe(p.host) + "\\.?";
  if (p.port === undefined) return [`^${SCHEME}://${host}(?::[0-9]+)?${END}`];
  const explicit = `^${SCHEME}://${host}:${p.port}${END}`;
  const defaults = DEFAULT_PORT_SCHEMES[p.port];
  return defaults === undefined ? [explicit] : [`^${defaults}://${host}${END}`, explicit];
}

/** The URL conditions of a list, in a fixed order: the `requestDomains` set first, then the regexes, deduplicated. */
function conditionsOf(list: BlockList): { domains: string[]; regexes: string[] } {
  const domains = new Set<string>();
  const regexes = new Set<string>();
  for (const p of list.patterns) {
    if (isPlain(p)) domains.add(p.host);
    else for (const re of regexesOf(p)) regexes.add(re);
  }
  return { domains: [...domains], regexes: [...regexes] };
}

export function countRules(list: BlockList): DnrCounts {
  const { domains, regexes } = conditionsOf(list);
  return { rules: (domains.length > 0 ? 1 : 0) + regexes.length, regexRules: regexes.length };
}

/** Do the rules of every live call (each call's `countRules`) fit together under the caps? */
export function fitsCaps(live: readonly DnrCounts[], caps: DnrCaps): boolean {
  let rules = 0;
  let regexRules = 0;
  for (const c of live) {
    rules += c.rules;
    regexRules += c.regexRules;
  }
  return rules <= caps.sessionRules && regexRules <= caps.regexRules;
}

/**
 * The session rules for `list` in `scope`, ids `idBase` … `idBase + countRules(list).rules - 1`. An empty list (or
 * one of invalid and ignored lines only) gives `[]`.
 */
export function rulesOf(list: BlockList, scope: DnrScope, idBase: number): DnrRule[] {
  if (!Number.isSafeInteger(idBase) || idBase < 1) throw new Error("rulesOf: idBase must be a positive integer");
  let scoped: Pick<DnrRule["condition"], "tabIds" | "initiatorDomains" | "resourceTypes">;
  if (scope.kind === "tab") {
    if (!Number.isSafeInteger(scope.tabId) || scope.tabId < 0) throw new Error("rulesOf: tabId must be a tab's id");
    scoped = { tabIds: [scope.tabId], resourceTypes: ["main_frame"] };
  } else {
    if (!/^[a-p]{32}$/.test(scope.extensionId)) throw new Error("rulesOf: extensionId must be an extension id");
    scoped = { tabIds: [-1], initiatorDomains: [scope.extensionId], resourceTypes: ["xmlhttprequest"] };
  }
  const { domains, regexes } = conditionsOf(list);
  const conditions: DnrRule["condition"][] = [];
  if (domains.length > 0) conditions.push({ requestDomains: domains, ...copy(scoped) });
  for (const re of regexes) conditions.push({ regexFilter: re, isUrlFilterCaseSensitive: false, ...copy(scoped) });
  return conditions.map((condition, i) => ({ id: idBase + i, priority: 1, action: { type: "block" }, condition }));
}

/** Fresh arrays per rule, so a caller mutating one rule never changes another. */
function copy(s: Pick<DnrRule["condition"], "tabIds" | "initiatorDomains" | "resourceTypes">) {
  const out: Pick<DnrRule["condition"], "tabIds" | "initiatorDomains" | "resourceTypes"> = {
    tabIds: [...s.tabIds],
    resourceTypes: [...s.resourceTypes],
  };
  if (s.initiatorDomains) out.initiatorDomains = [...s.initiatorDomains];
  return out;
}
