// Step 11b S7-helpers slice H2: pure rules of Run 17b's build proof, tab watcher and timed newTab (docs/e2e-test-plan.md section 4.25,
// rows R17B-0 (e) (f), R17B-RD-2, R17B-NEWTAB-PLAIN, R17B-NEWTAB-LOAD). No I/O here. Written 2026-10-27 by the S7-helpers H2 builder
// (Claude Sonnet 5.5); NOT run against Chrome. The console expressions print labels and numbers only: never a URL or a title.
import type { J17 } from "./s11b-rules.js";

const lastLine = (dump: string, re: RegExp): RegExpExecArray | null => {
  let hit: RegExpExecArray | null = null;
  for (const l of dump.split(/\r?\n/)) hit = re.exec(l.trim()) ?? hit;
  return hit;
};

// ===== B17 build-proof (R17B-0 (e)) =====
export const S6_COMMIT = "db3f82e";
export const S6_NAMES: readonly string[] = ["openBehindRules", "settleBlank"];
export type CreatedUrl = "about:blank" | "other";

/** How many of the two S6 names stand in the built file (0, 1 or 2). */
export const countS6Names = (src: string): number => S6_NAMES.filter((n) => src.includes(n)).length;
export const buildLine = (names: number, created: CreatedUrl): string => `BUILD disk-s6-names=${names}/2 created-url=${created}`;
export const s6CommitLine = (ancestor: boolean): string => `S6 commit=${ancestor ? "ancestor" : "not-ancestor"}`;

export function parseBuildLine(dump: string): { line: string; names: number; createdUrl: CreatedUrl } | null {
  const m = lastLine(dump, /^BUILD disk-s6-names=([012])\/2 created-url=(about:blank|other)$/);
  return m ? { line: m[0], names: Number(m[1]), createdUrl: m[2] as CreatedUrl } : null;
}

/** 2/2 names and the ancestor, and a created-url of about:blank; each miss is a STOP before any state change (a null created-url: no tabwatch read). */
export function judgeBuild(i: { names: number; ancestor: boolean; createdUrl: CreatedUrl | null }): J17 {
  if (i.names !== 2) return { pass: false, stop: true, why: `the built file holds ${i.names} of the 2 S6 names` };
  if (!i.ancestor) return { pass: false, stop: true, why: "the S6 commit is not an ancestor of HEAD" };
  if (i.createdUrl === null) return { pass: false, stop: true, why: "no TABWATCH read: the loaded worker is not proven" };
  if (i.createdUrl !== "about:blank") return { pass: false, stop: true, why: "created-url is not about:blank: the loaded worker is not the S6 build (a reload did not take)" };
  return { pass: true, why: "2/2 names, S6 is an ancestor, created-url about:blank" };
}

// ===== B17 tabwatch (R17B-0 (f), R17B-RD-2, R17B-NEWTAB-PLAIN, R17B-NEWTAB-LOAD) =====
/**
 * The listener, started in the worker console. It follows the FIRST tab created after it starts. Its only outputs are the fixed words
 * `about:blank` / `other` (the class of `pendingUrl`, else `url`, compared and never printed), counts and milliseconds. A tab's url and title are
 * compared inside, never concatenated into any printed text. `completes` = `complete` events of that tab before the first `loading`
 * that starts the navigation: a `loading` that carries a non-blank url, or any `loading` after a `complete` (the doubled blank complete of S6 N1
 * counts twice). `first` = ms from onCreated to the first `complete`. Prints nothing when started but `TABWATCH started`.
 */
export function tabwatchStartExpression(): string {
  return (
    `void (()=>{const g=globalThis,o=g.__s11bTw;if(o){chrome.tabs.onCreated.removeListener(o.c);chrome.tabs.onUpdated.removeListener(o.u)}` +
    `const s={id:null,t0:0,cls:"other",nav:false,n:0,first:-1};` +
    `s.c=t=>{if(s.id!==null)return;s.id=t.id;s.t0=Date.now();s.cls=(t.pendingUrl||t.url)==="about:blank"?"about:blank":"other"};` +
    `s.u=(id,ci)=>{if(id!==s.id||s.nav)return;if(ci.status==="complete"){s.n++;if(s.first<0)s.first=Date.now()-s.t0}` +
    `else if(ci.status==="loading"&&((ci.url&&ci.url!=="about:blank")||s.n>0))s.nav=true};` +
    `chrome.tabs.onCreated.addListener(s.c);chrome.tabs.onUpdated.addListener(s.u);g.__s11bTw=s;console.log("TABWATCH started")})()`
  );
}
/** Reads the listener, removes it, and prints the one line (or `TABWATCH none` when no tab was created). */
export function tabwatchReadExpression(): string {
  return (
    `void (()=>{const g=globalThis,s=g.__s11bTw;if(s){chrome.tabs.onCreated.removeListener(s.c);chrome.tabs.onUpdated.removeListener(s.u);g.__s11bTw=undefined}` +
    `console.log(s&&s.id!==null?"TABWATCH created-url="+s.cls+" completes="+s.n+" first-complete-ms="+(s.first<0?"none":s.first):"TABWATCH none")})()`
  );
}
export const TABWATCH_STARTED = "TABWATCH started";
export const parseTabwatchStarted = (dump: string): boolean => lastLine(dump, /^TABWATCH started$/) !== null;

export interface Tabwatch { line: string; createdUrl: CreatedUrl; completes: number; firstCompleteMs: number | null; replyMs: number | null }
/** The sheet's line: `TABWATCH created-url=<about:blank|other> completes=<n> first-complete-ms=<ms> reply-ms=<ms>`; reply-ms is the helper's own LAT, optional. */
export function parseTabwatchLine(dump: string): Tabwatch | null {
  const m = lastLine(dump, /^TABWATCH created-url=(about:blank|other) completes=(\d+) first-complete-ms=(\d+|none)(?: reply-ms=(\d+))?$/);
  if (!m) return null;
  return { line: m[0], createdUrl: m[1] as CreatedUrl, completes: Number(m[2]), firstCompleteMs: m[3] === "none" ? null : Number(m[3]), replyMs: m[4] === undefined ? null : Number(m[4]) };
}
export const tabwatchLine = (t: { createdUrl: CreatedUrl; completes: number; firstCompleteMs: number | null }, replyMs?: number): string =>
  `TABWATCH created-url=${t.createdUrl} completes=${t.completes} first-complete-ms=${t.firstCompleteMs ?? "none"}${replyMs === undefined ? "" : ` reply-ms=${Math.round(replyMs)}`}`;

export const TABWATCH_ROWS = ["R17B-NEWTAB-PLAIN", "R17B-RD-2", "R17B-NEWTAB-LOAD"] as const;
/** R17B-NEWTAB-PLAIN judges created-url=about:blank (the behavioural proof of S6); R17B-RD-2 and R17B-NEWTAB-LOAD only record. */
export function judgeTabwatch(row: string, t: Tabwatch): J17 {
  if (row === "R17B-NEWTAB-PLAIN") return t.createdUrl === "about:blank" ? { pass: true, why: "created-url=about:blank" } : { pass: false, why: "created-url is other: the S6 path was not taken" };
  return { pass: true, why: `recorded: created-url=${t.createdUrl} completes=${t.completes} first-complete-ms=${t.firstCompleteMs ?? "none"}` };
}

// ===== B17 newtab-timed (R17B-NEWTAB-LOAD) =====
export const NEWTAB_HOLD_MS = 3000;
export type PageClass = "playground" | "about:blank" | "other";
export const PLAYGROUND_MARK = "Agent Bridge E2E Playground";
/** The snapshot's page, as a class: an empty blank page, the playground (its title, or any interactive element on an http page), or other. */
export function pageClassOf(s: { url: string; title: string; elements: number }): PageClass {
  if (s.url === "about:blank") return "about:blank";
  return /^http:/.test(s.url) && (s.title.includes(PLAYGROUND_MARK) || s.elements > 0) ? "playground" : "other";
}
/** One trial: the reply came after the page loaded (LAT >= 3 000 ms and the snapshot is the page). blocked > 0 and RULES > 0 after are STOPs; unread inputs are NOT MEASURED. */
export function judgeNewtabTrial(i: { answer: string; ms: number; page: PageClass | null; blocked?: number | null; rulesAfter?: number | null }): J17 {
  if (i.answer !== "ok") return { pass: false, why: `answer ${i.answer}, not a success` };
  if ((i.blocked ?? 0) > 0) return { pass: false, stop: true, why: `blocked hits ${i.blocked}` };
  if ((i.rulesAfter ?? 0) > 0) return { pass: false, stop: true, why: `RULES ${i.rulesAfter} after the reply` };
  if (i.ms < NEWTAB_HOLD_MS) return { pass: false, why: `reply after ${Math.round(i.ms)} ms, before the ${NEWTAB_HOLD_MS} ms hold (S6 "Revisit if", #313)` };
  if (i.page !== "playground") return { pass: false, why: `the snapshot is ${i.page ?? "unread"}, not the page` };
  if (i.blocked == null || i.rulesAfter == null) return { pass: false, notMeasured: true, why: "reply and page hold; blocked or RULES after not given" };
  return { pass: true, why: `reply after ${Math.round(i.ms)} ms, page loaded, blocked 0, RULES 0` };
}

/** s9.ts `noteOpened` + `--as`: the handle joins `opened`, and the key names it, in a state object shaped like s9's. Returns a new object. */
export function withOpened<S extends { tabs: Record<string, string>; opened: string[] }>(s: S, handle: string, key: string): S {
  return { ...s, tabs: { ...s.tabs, [key]: handle }, opened: s.opened.includes(handle) ? s.opened : [...s.opened, handle] };
}
