/**
 * Step 9 (Phase E): the safety gate. Pure — no `chrome.*`, no log call — so every method and every
 * state is unit-tested (`extension/test/safety-*.test.ts`); S2a wires it into the router, the
 * handlers' first side effects, the post-check, `withDebugger`, the poll loops, the tab events and the
 * network log.
 *
 * - The method table classifies every router method; `methodClass` throws on a name it does not know,
 *   so a new method cannot bypass the gate (phase doc 0.1; S1.1).
 * - `safetyDecision(method, params, target, state, ctx, phase)` — Stage 0 F7's signature: the state first
 *   (disarmed → `DISARMED {scope:"all"}`; JavaScript off and a method of class `evaluate`, or a script URL
 *   for `navigate`/`newTab` → `JS_DISABLED`, no `data`), then the tab or the call's own URL
 *   (→ `DOMAIN_BLOCKED`); `listTabs` is redacted, never refused (decisions.md · 2026-10-24 · #133, #134,
 *   #137, #138). *Superseded 2026-10-25 (Step 10 S4b): was "→ `DISARMED {scope:"evaluate"}`" for JavaScript
 *   off, because #202 changed #133 (spec §10's Step 10 note). Which calls are refused, and when, is
 *   unchanged.*
 * - The extension's own id and the parsed block list come in through `ctx` (never read here); since Step 11 S2 also
 *   the parsed upload folders (`ctx.uploadFolders`, missing = none), which `uploadRefusal` reads (#236, #237).
 * - Step 11 S2, #245 (a): a tab call on a `file:` page and a `navigate`/`newTab` to a `file:` URL → `DOMAIN_BLOCKED`
 *   (`FILE_PAGE_MESSAGE`, `FILE_URL_MESSAGE`), for every method; `listTabs` rows and events are not hidden by it.
 *
 * Messages never contain a URL, a pattern or a title. Never log any of them from here (0.7).
 */
import { ErrorCodes, type DisarmedData, type HiddenReason } from "@bridge/shared";
import type { ExtensionListTabsRow, TabCreatedParams, TabRemovedParams } from "@bridge/shared";
import { BridgeError } from "./errors.js";
import { isExtensionUrl, isFileUrl, isOwnExtensionPage, isUrlBlocked, urlScheme, type BlockList } from "./safety-match.js";
import { uploadPathsAllowed, type UploadFolders } from "./upload-paths.js";

// ------------------------------------------------------------------------------------------------
// The method table
// ------------------------------------------------------------------------------------------------

/**
 * - `tab`: reads or acts on one tab (`tabId`): tested by the tab's URLs.
 * - `navigate`: a tab plus its own URL (`params.url`): tested by both.
 * - `evaluate`: a tab plus the JavaScript switch (`evaluate`, and Step 10 S4's `evaluateSaveStart`,
 *   `evaluateSaveChunk`, `evaluateSaveEnd`).
 * - `newTab`: its own URL (optional); the post-check is the state only.
 * - `closeTab`: a tab; the post-check is the state only (the tab is gone by then).
 * - `listTabs`: redacted (rows hidden), never refused.
 * - `network`: `tabId` (tested by that tab's URL, live or last known) | `scope:"all"` | an `id` lookup
 *   (never refused while armed; entries filtered instead).
 * - `downloadStart`: its own URL (and, at the post-check, the final URL after redirects).
 * - `state`: no tab, no URL — the state only (`downloadChunk`, `downloadEnd`).
 */
export type MethodClass =
  | "tab"
  | "navigate"
  | "evaluate"
  | "newTab"
  | "closeTab"
  | "listTabs"
  | "network"
  | "downloadStart"
  | "state";

/**
 * Every router method (`extension/src/sw.ts`), classified. A new method must enter here. Step 10 S4 (decisions.md
 * #205; Stage 0 F4): `browser_evaluate {saveTo}`'s three `evaluateSave*` methods carry the tab and are refused as
 * `evaluate` is — by the kill switch, the JavaScript switch and the block list.
 */
export const METHOD_CLASSES: Readonly<Record<string, MethodClass>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, MethodClass>, {
    navigate: "navigate",
    snapshot: "tab",
    screenshot: "tab",
    click: "tab",
    type: "tab",
    scroll: "tab",
    hover: "tab",
    selectOption: "tab",
    pressKey: "tab",
    back: "tab",
    forward: "tab",
    listTabs: "listTabs",
    focusTab: "tab",
    newTab: "newTab",
    closeTab: "closeTab",
    waitFor: "tab",
    evaluate: "evaluate",
    locate: "tab",
    networkRequests: "network",
    networkClear: "network",
    downloadStart: "downloadStart",
    downloadChunk: "state",
    downloadEnd: "state",
    evaluateSaveStart: "evaluate",
    evaluateSaveChunk: "evaluate",
    evaluateSaveEnd: "evaluate",
  } satisfies Record<string, MethodClass>),
);

/** The class of a router method. Throws on a name with no class: there is no default. */
export function methodClass(method: string): MethodClass {
  const cls = Object.prototype.hasOwnProperty.call(METHOD_CLASSES, method) ? METHOD_CLASSES[method] : undefined;
  if (cls === undefined) throw new Error(`safety gate: method "${method}" has no safety class`);
  return cls;
}

/**
 * The names a source registers through `router.on(<name>, …)` (S1.1's scan of `sw.ts`, Stage 0 F17).
 * `nonLiteral` lists any first argument that is not a string literal (it would escape the scan).
 */
export function routerMethodNames(source: string): { names: string[]; nonLiteral: string[] } {
  const names: string[] = [];
  const nonLiteral: string[] = [];
  const re = /\brouter\s*\.\s*on\s*\(\s*([^,)]*?)\s*(?:,|\))/g;
  for (const m of source.matchAll(re)) {
    const arg = m[1]!;
    const lit = /^(["'`])([^"'`]*)\1$/.exec(arg);
    if (lit) names.push(lit[2]!);
    else nonLiteral.push(arg);
  }
  return { names, nonLiteral };
}

// ------------------------------------------------------------------------------------------------
// Targets, state, decisions
// ------------------------------------------------------------------------------------------------

/**
 * What the gate tests (Stage 0 F7):
 * - `live {urls}`: the tab's current `url` and `pendingUrl`;
 * - `replaced {urls}`: a tab replaced during the call, read under its new id;
 * - `gone {lastUrl?}`: a tab closed during the call (or unreadable), by the last URL the worker knew;
 * - `own {url?}`: the call's own URL (`navigate`, `newTab`, `downloadStart`; the final URL after redirects);
 * - `none`: nothing to test beyond the state (`scope:"all"`, an `id` lookup, `listTabs` as a whole,
 *   `downloadChunk`/`downloadEnd`).
 */
export type SafetyTarget =
  | { kind: "live"; urls: readonly (string | undefined)[] }
  | { kind: "replaced"; urls: readonly (string | undefined)[] }
  | { kind: "gone"; lastUrl?: string }
  | { kind: "own"; url?: string }
  | { kind: "none" };

export type SafetyTargetKind = SafetyTarget["kind"];

/** The target forms each class takes; any other form is a wiring error and throws (fails closed). */
export const TARGETS_BY_CLASS: Readonly<Record<MethodClass, readonly SafetyTargetKind[]>> = Object.freeze({
  tab: ["live", "replaced", "gone"],
  navigate: ["live", "replaced", "gone", "own"],
  evaluate: ["live", "replaced", "gone"],
  newTab: ["own", "live", "replaced", "gone", "none"],
  closeTab: ["live", "replaced", "gone"],
  listTabs: ["live", "none"],
  network: ["live", "replaced", "gone", "none"],
  downloadStart: ["own"],
  state: ["none"],
});

/** The two switches the gate reads (the stored state; `blockedCount` is not needed here). */
export interface SafetySwitches {
  armed: boolean;
  evaluate: boolean;
}

/**
 * Inputs the pure gate cannot read itself: `chrome.runtime.id`, the parsed block list and (Step 11 S2) the parsed
 * upload folders. `uploadFolders` missing means no folder: every upload is refused (fails closed).
 */
export interface SafetyContext {
  extensionId: string;
  blockList: BlockList;
  uploadFolders?: UploadFolders;
}

/** Where the gate runs (0.1's F1 note): at receipt, before a first side effect, or before the reply. */
export type SafetyPhase = "receipt" | "effect" | "post";

export interface SafetyRefusal {
  code:
    | typeof ErrorCodes.DISARMED
    | typeof ErrorCodes.DOMAIN_BLOCKED
    | typeof ErrorCodes.JS_DISABLED
    | typeof ErrorCodes.UPLOAD_REFUSED;
  message: string;
  /** `DISARMED` only: `{scope: "all"}` (#133; Step 10 S4b, #202: `"evaluate"` is no longer produced). */
  data?: DisarmedData;
}

export type SafetyDecision = "allow" | { redact: HiddenReason } | SafetyRefusal;

export function isRefusal(d: SafetyDecision): d is SafetyRefusal {
  return typeof d === "object" && "code" in d;
}

// Messages (#133: the bridge off and JavaScript off read differently). Never a URL, pattern or title.
export const DISARMED_ALL_MESSAGE =
  "The user has turned the bridge off in Chrome, so every page call is refused. Stop and ask the user to turn it back on; do not retry.";
/**
 * `JS_DISABLED`'s message (Step 10 S4b, #202): Step 9's JavaScript-off text, unchanged — the code changed,
 * the meaning did not (phase doc 0.12).
 */
export const JS_DISABLED_MESSAGE =
  "The user has turned JavaScript off for the bridge in Chrome (browser_evaluate and script URLs are refused). Every other tool still works; ask the user before relying on browser_evaluate.";
/**
 * Step 9's name for the same text, kept exported (2026-10-25, Step 10 S4b): `recipes/test/s9-rules.test.ts`
 * pins Run 13's expected text against it, and that text is history (§4.20). Do not use it in new code.
 */
export const DISARMED_EVALUATE_MESSAGE = JS_DISABLED_MESSAGE;
export const STATE_UNREADABLE_MESSAGE =
  "The bridge could not read its safety state in Chrome, so it refuses the call. Ask the user to check the extension.";
export const BLOCKED_TAB_MESSAGE =
  "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user.";
export const OWN_PAGE_MESSAGE =
  "This tab shows one of the bridge extension's own pages, which the bridge never reads or acts on.";
export const BLOCKED_URL_MESSAGE =
  "That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user.";
export const EXTENSION_URL_MESSAGE = "The bridge never opens extension pages.";
/** #245 (a), Step 11 S2: a tab showing a `file:` page. Names no path. */
export const FILE_PAGE_MESSAGE = "This tab shows a local file (a file: page), which the bridge never reads or acts on.";
/** #245 (a), Step 11 S2: `navigate`/`newTab` to a `file:` URL. Names no path. */
export const FILE_URL_MESSAGE = "The bridge never opens local files (file: URLs).";
/**
 * `UPLOAD_REFUSED`'s message (Step 11 S2; phase doc 0.5's proposed wording; #237): fixed, naming no path, folder,
 * count or file name. The same text for a malformed `paths` (#249).
 */
export const UPLOAD_REFUSED_MESSAGE =
  "That file is not in a folder the user allows for uploads in Chrome (extension options → Upload folders); the bridge will not upload it. Ask the user.";

/** `DISARMED {scope:"all"}` — the only scope a Step 10 extension produces (#202). */
function disarmed(message = DISARMED_ALL_MESSAGE): SafetyRefusal {
  return { code: ErrorCodes.DISARMED, message, data: { scope: "all" } };
}

/** `JS_DISABLED`, with no `data` (Step 10 S4b, #202; was `DISARMED {scope:"evaluate"}`). */
function jsDisabled(): SafetyRefusal {
  return { code: ErrorCodes.JS_DISABLED, message: JS_DISABLED_MESSAGE };
}

function domainBlocked(message: string): SafetyRefusal {
  return { code: ErrorCodes.DOMAIN_BLOCKED, message };
}

/** F10: a failed read of the stored state refuses the call, `DISARMED {scope:"all"}`, with its own message. */
export function stateUnreadableRefusal(): SafetyRefusal {
  return disarmed(STATE_UNREADABLE_MESSAGE);
}

/**
 * Step 11 S2 — the folder rule of the safety class `upload` (phase doc 0.5; #237, #249): every entry of
 * `params.paths` must lie strictly inside a folder of `ctx.uploadFolders` (`extension/src/upload-paths.ts`), else
 * `UPLOAD_REFUSED` with no `data`. A malformed `paths` (absent, not an array, empty, more than 20, a hole, a
 * non-string) and a context with no folders are refused (fails closed). Returns null when every path is allowed.
 * It runs after the state and the tab tests (order `DISARMED` > `DOMAIN_BLOCKED` > `UPLOAD_REFUSED`).
 */
export function uploadRefusal(params: Record<string, unknown>, ctx: SafetyContext): SafetyRefusal | null {
  if (uploadPathsAllowed(params.paths, ctx.uploadFolders)) return null;
  return { code: ErrorCodes.UPLOAD_REFUSED, message: UPLOAD_REFUSED_MESSAGE };
}

/** A refusal as the error the router sends (`{code, message, data?}` on the wire). */
export function refusalError(r: SafetyRefusal): BridgeError {
  return new BridgeError(r.code, r.message, r.data);
}

/** The call's own URL as a target: `navigate`/`newTab`/`downloadStart` → `own`, every other method → `none`. */
export function ownTarget(method: string, params: Record<string, unknown>): SafetyTarget {
  if (method !== "navigate" && method !== "newTab" && method !== "downloadStart") return { kind: "none" };
  const u = params.url;
  return u === undefined || u === null || u === "" ? { kind: "own" } : { kind: "own", url: String(u) };
}

/** #138: the schemes refused for navigation while JavaScript is off. */
const SCRIPT_SCHEMES = new Set(["javascript:", "data:", "blob:"]);

/** A tab URL that hides/blocks: one of this extension's own pages, or a blocked host. */
function tabUrlBlocked(url: string | undefined, ctx: SafetyContext): "own" | "list" | null {
  if (typeof url !== "string" || url === "") return null;
  if (isOwnExtensionPage(url, ctx.extensionId)) return "own";
  if (isUrlBlocked(url, ctx.blockList)) return "list";
  return null;
}

function firstBlocked(urls: readonly (string | undefined)[], ctx: SafetyContext): "own" | "list" | null {
  let found: "own" | "list" | null = null;
  for (const u of urls) {
    const b = tabUrlBlocked(u, ctx);
    if (b === "own") return "own";
    if (b) found = b;
  }
  return found;
}

/**
 * The gate. Order in every phase: the target form is checked against the class (a wrong form throws);
 * the state (disarmed; JavaScript off); then, except for `newTab`/`closeTab` at the post-check, the tab
 * or the call's own URL. A tab gone at receipt is allowed whatever its last URL (the handler answers
 * `TAB_UNKNOWN` as today), except for the network class; later (effect, post), or for a network `tabId`,
 * a gone tab is refused only when its last known URL is blocked (#137; 0.3's F30 note).
 */
export function safetyDecision(
  method: string,
  params: Record<string, unknown>,
  target: SafetyTarget,
  state: SafetySwitches,
  ctx: SafetyContext,
  phase: SafetyPhase = "receipt",
): SafetyDecision {
  const cls = methodClass(method);
  if (!TARGETS_BY_CLASS[cls].includes(target.kind)) {
    throw new Error(`safety gate: target "${target.kind}" is not valid for method "${method}"`);
  }
  void params; // the target carries what the gate needs; params are kept in the F7 signature for S2a

  // 1. The state.
  if (cls === "listTabs") {
    if (!state.armed) return { redact: "disarmed" };
    if (target.kind === "live" && firstBlocked(target.urls, ctx)) return { redact: "blocked" };
    return "allow";
  }
  if (!state.armed) return disarmed();
  // Step 10 S4b (#202): JavaScript off → JS_DISABLED (was DISARMED {scope:"evaluate"}); the same calls.
  if (!state.evaluate) {
    if (cls === "evaluate") return jsDisabled();
    if ((cls === "navigate" || cls === "newTab") && target.kind === "own" && typeof target.url === "string") {
      const scheme = urlScheme(target.url);
      if (scheme !== null && SCRIPT_SCHEMES.has(scheme)) return jsDisabled();
    }
  }

  // 2. newTab and closeTab post-check the state only.
  if (phase === "post" && (cls === "newTab" || cls === "closeTab")) return "allow";

  // 2b. #137: at receipt an unreadable tab is left to the handler (today's TAB_UNKNOWN), whatever its last
  // URL — except a network `tabId`, which 0.3's F30 note tests by its last known URL (S1 fixer r1, finding 1).
  if (phase === "receipt" && target.kind === "gone" && cls !== "network") return "allow";

  // 3. The tab, or the call's own URL.
  switch (target.kind) {
    case "none":
      return "allow";
    case "live":
    case "replaced": {
      const b = firstBlocked(target.urls, ctx);
      if (b === "own") return domainBlocked(OWN_PAGE_MESSAGE);
      if (target.urls.some((u) => isFileUrl(u))) return domainBlocked(FILE_PAGE_MESSAGE); // #245 (a)
      if (b === "list") return domainBlocked(BLOCKED_TAB_MESSAGE);
      return "allow";
    }
    case "gone": {
      const b = tabUrlBlocked(target.lastUrl, ctx);
      if (b === "own") return domainBlocked(OWN_PAGE_MESSAGE);
      if (isFileUrl(target.lastUrl)) return domainBlocked(FILE_PAGE_MESSAGE); // #245 (a)
      if (b === "list") return domainBlocked(BLOCKED_TAB_MESSAGE);
      return "allow";
    }
    case "own": {
      const u = target.url;
      if (typeof u !== "string" || u === "") return "allow";
      // #138: navigation to ANY extension page is refused. downloadStart is tested by the block list only
      // (0.4); every chrome-extension:// URL is left to the handler's BAD_PARAMS, as today (S1 fixer r1,
      // finding 5b: no reply changes while armed, JS on, empty list).
      if ((cls === "navigate" || cls === "newTab") && isExtensionUrl(u)) return domainBlocked(EXTENSION_URL_MESSAGE);
      // #245 (a), Step 11 S2: the bridge never opens a file: page (downloadStart's own handler refuses non-http(s)).
      if ((cls === "navigate" || cls === "newTab") && isFileUrl(u)) return domainBlocked(FILE_URL_MESSAGE);
      if (isUrlBlocked(u, ctx.blockList)) return domainBlocked(BLOCKED_URL_MESSAGE);
      return "allow";
    }
  }
}

/** The post-check before the reply (#137 item 1): the gate at phase `"post"`. */
export function postCheck(
  method: string,
  params: Record<string, unknown>,
  target: SafetyTarget,
  state: SafetySwitches,
  ctx: SafetyContext,
): SafetyDecision {
  return safetyDecision(method, params, target, state, ctx, "post");
}

/**
 * The gate over several targets (e.g. `navigate`: its tab, then its own URL): the first decision that is
 * not `"allow"`. No target at all is a wiring error and throws (fails closed), like a wrong single form —
 * except for the classes that take no target (`state`, `listTabs`), where it is `none` (S1 fixer r1,
 * finding 2).
 */
export function safetyDecisionAll(
  method: string,
  params: Record<string, unknown>,
  targets: readonly SafetyTarget[],
  state: SafetySwitches,
  ctx: SafetyContext,
  phase: SafetyPhase = "receipt",
): SafetyDecision {
  if (targets.length === 0) {
    const cls = methodClass(method);
    if (cls === "state" || cls === "listTabs") return safetyDecision(method, params, { kind: "none" }, state, ctx, phase);
    throw new Error(`safety gate: no target given for method "${method}"`);
  }
  for (const t of targets) {
    const d = safetyDecision(method, params, t, state, ctx, phase);
    if (d !== "allow") return d;
  }
  return "allow";
}

// ------------------------------------------------------------------------------------------------
// Redaction of listTabs rows and tab events (#134, #146)
// ------------------------------------------------------------------------------------------------

/** Why a tab's title/URL is withheld: disarmed (any tab), else a blocked URL or this extension's page. */
export function hiddenReason(
  urls: readonly (string | undefined)[],
  state: SafetySwitches,
  ctx: SafetyContext,
): HiddenReason | null {
  if (!state.armed) return "disarmed";
  return firstBlocked(urls, ctx) ? "blocked" : null;
}

/**
 * A `listTabs` row: hidden → keeps `id`, `windowId`, `active`, `openerTabId`, `current`, drops `title` and
 * `url`, adds `hidden`. `pendingUrl` (not on the wire row) is tested too. Unchanged → the same object.
 */
export function redactListTabsRow(
  row: ExtensionListTabsRow,
  state: SafetySwitches,
  ctx: SafetyContext,
  pendingUrl?: string,
): ExtensionListTabsRow {
  const reason = hiddenReason([row.url, pendingUrl], state, ctx);
  if (reason === null) return row;
  const out: ExtensionListTabsRow = { id: row.id, active: row.active, windowId: row.windowId };
  if (row.openerTabId !== undefined) out.openerTabId = row.openerTabId;
  if (row.current !== undefined) out.current = row.current;
  out.hidden = reason;
  return out;
}

/**
 * `tabCreated`: `url` → `""` while disarmed or for a blocked/own URL, with no marker (#134 as written,
 * #146). `urls` are the tab's `url`/`pendingUrl` when the caller has them; `params.url` is always tested.
 * Unchanged → the same object.
 */
export function redactTabCreated(
  params: TabCreatedParams,
  state: SafetySwitches,
  ctx: SafetyContext,
  urls: readonly (string | undefined)[] = [],
): TabCreatedParams {
  if (hiddenReason([params.url, ...urls], state, ctx) === null) return params;
  return { ...params, url: "" };
}

/**
 * `tabRemoved`: drops `lastUrl`/`lastTitle` and adds `hidden` while disarmed or when the last URL is
 * blocked/own (#134). Unchanged → the same object.
 */
export function redactTabRemoved(params: TabRemovedParams, state: SafetySwitches, ctx: SafetyContext): TabRemovedParams {
  const reason = hiddenReason([params.lastUrl], state, ctx);
  if (reason === null) return params;
  return { tabId: params.tabId, hidden: reason };
}

// ------------------------------------------------------------------------------------------------
// The network-log filter predicate (#137 item 6; phase doc 0.4's F9 note)
// ------------------------------------------------------------------------------------------------

/** The fields of a webRequest event or a stored network entry the filter reads. */
export interface NetworkUrls {
  url: string;
  redirectUrl?: string;
  initiator?: string;
}

/**
 * An entry is blocked when its `url`, `redirectUrl` or `initiator` host is blocked, or the tab's last
 * known top-level URL is blocked (or is one of this extension's pages).
 */
export function networkEntryBlocked(entry: NetworkUrls, tabTopUrl: string | undefined, ctx: SafetyContext): boolean {
  const list = ctx.blockList;
  if (isUrlBlocked(entry.url, list) || isUrlBlocked(entry.redirectUrl, list) || isUrlBlocked(entry.initiator, list)) return true;
  return tabUrlBlocked(tabTopUrl, ctx) !== null;
}

/** The ingest form: drop everything while disarmed, and every blocked entry. */
export function dropAtIngest(
  entry: NetworkUrls,
  tabTopUrl: string | undefined,
  state: SafetySwitches,
  ctx: SafetyContext,
): boolean {
  return !state.armed || networkEntryBlocked(entry, tabTopUrl, ctx);
}

/** The query form (every query, an `id` lookup included): no disarmed clause; keep what is not blocked. */
export function keepInQuery(entry: NetworkUrls, tabTopUrl: string | undefined, ctx: SafetyContext): boolean {
  return !networkEntryBlocked(entry, tabTopUrl, ctx);
}
