/**
 * Step 9 (Phase E): one gated call's safety — the gate (`safety.ts`) run at receipt, before each first side
 * effect and before the reply (the post-check), each run reading the state afresh (phase doc 0.1's F1 note;
 * decisions.md · 2026-10-24 · In-flight work at disarm and on a newly blocked tab (#137)). Pure: the state
 * read and the tab reads are injected (`sw.ts` passes `chrome.tabs.get` and the tab-info cache), so every
 * branch is unit-tested (`extension/test/safety-call.test.ts`, `gated-router.test.ts`).
 *
 * Which targets a method is tested by (S1's handoff): a tab method by its tab — live (`url`, `pendingUrl`),
 * replaced during the call (under the new id), or gone (by the last URL the worker knew, which the cache
 * keeps for the length of a call, Stage 0 R2-1); `navigate` by its tab and then its own URL; `newTab` by its
 * own URL only (never `none`); `downloadStart` by its own URL and, once known, its final URL (#140); the
 * network methods by their tab when they name one, else `none`; `downloadChunk`/`downloadEnd`/`listTabs` by
 * `none`. A read of the state that fails refuses (#139); a throw from the gate is a wiring slip the router
 * answers `INTERNAL`.
 *
 * Step 11b S3a (#292, #296, #301): a covered call (`navigate`, `back`, `forward`; the handle from `DnrKeeper.call`)
 * installs its tab rules in `effect()`, from the block list of the re-check's own read, after the re-check and before
 * the handler's side effect; the post-check releases them on every path and reads the keeper's refusal only after
 * the release settled (S2-builder.md §7). Any other call gets the inert handle and behaves as before.
 *
 * Never logs; nothing here prints a URL, title or pattern (phase doc 0.7).
 */
import type { ExtensionListTabsRow } from "@bridge/shared";
import {
  isRefusal,
  keepInQuery,
  methodClass,
  ownTarget,
  redactListTabsRow,
  refusalError,
  safetyDecisionAll,
  stateUnreadableRefusal,
  type NetworkUrls,
  type SafetyDecision,
  type SafetyPhase,
  type SafetyRefusal,
  type SafetyTarget,
} from "./safety.js";
import type { SafetyView } from "./safety-state.js";
import type { DnrCall } from "./safety-dnr-keeper.js";
import type { BlockList } from "./safety-match.js";
import type { HopWatch } from "./safety-hop.js";

/** The handle of a call that installs no rule. */
const NO_RULES: DnrCall = {
  mark: () => {},
  install: async () => {},
  refusal: () => null,
  release: async () => {},
  holding: () => false,
};

/** What a handler gets from the gated router (the second argument). Every method is safe to ignore. */
export interface HandlerSafety {
  /** Right before a first side effect: the state and the tab are checked again (phase `effect`); throws the refusal. */
  effect(): Promise<void>;
  /** `downloadStart`: the final URL after redirects, checked now and again at the post-check (#140). */
  checkFinalUrl(url: string): Promise<void>;
  /** Run when the reply is refused (e.g. release a held download, F24). */
  onRefused(fn: () => void): void;
  /** `listTabs`: the rows redacted under a fresh read of the state (#134). */
  redactRows(rows: readonly ListRowInput[]): Promise<ExtensionListTabsRow[]>;
  /** The network query filter (`keepInQuery`) under a fresh read of the state (#137 item 6). */
  networkFilter(): Promise<(entry: NetworkUrls & { tabId: number }) => boolean>;
  /** Step 11b S3a: true while this call's block-list rules are in force (after `effect()`); `back`/`forward` wait on it. */
  holdsRules?(): boolean;
  /** Step 11b S3b: `downloadStart`, after its fetch failed: did this call's own rules block a hop (bounded wait)? */
  hopBlocked?(): Promise<boolean>;
}

/** A `listTabs` row with the tab's `pendingUrl`, which is tested but never sent. */
export interface ListRowInput {
  row: ExtensionListTabsRow;
  pendingUrl?: string;
}

/** What the gated router drives: the handler's view plus the receipt, the post-check and the cleanups. */
export interface GatedCall extends HandlerSafety {
  receipt(): Promise<SafetyDecision>;
  /** The refusal that replaces the reply, or null. Never for `listTabs`. */
  post(): Promise<SafetyRefusal | null>;
  /** Runs the `onRefused` cleanups (once). */
  runRefused(): void;
}

export interface CallSafetyDeps {
  /** `SafetyStore.read()`: rejects when the state cannot be read. */
  readState(): Promise<SafetyView>;
  /** `chrome.tabs.get`: rejects when the tab does not exist. */
  getTab(tabId: number): Promise<{ url?: string; pendingUrl?: string }>;
  /** The id a tab was replaced by (`tabs.onReplaced`), if any. */
  replacedBy(tabId: number): number | undefined;
  /** The last URL the worker knew for a tab, live or recently closed. */
  lastUrl(tabId: number): string | undefined;
  /** Step 11b S3b: opens a blocked-hop watch on the call's list (`BlockedHopWatcher.open`); absent = no watch. */
  watchHops?(list: BlockList): HopWatch;
}

/** An integer `tabId`, else undefined. */
export function tabIdOf(params: Record<string, unknown>): number | undefined {
  const t = params.tabId;
  return typeof t === "number" && Number.isInteger(t) ? t : undefined;
}

const MAX_REPLACEMENTS = 4;

/**
 * A tab as the gate tests it. `seen` is a URL this call saw for the tab earlier, used when the worker
 * knows none for a closed tab.
 */
export async function resolveTabTarget(deps: CallSafetyDeps, tabId: number, seen?: string): Promise<SafetyTarget> {
  try {
    const t = await deps.getTab(tabId);
    if (t) return { kind: "live", urls: [t.url, t.pendingUrl] };
  } catch {
    // gone or replaced
  }
  let id = tabId;
  let last = deps.lastUrl(tabId);
  for (let i = 0; i < MAX_REPLACEMENTS; i++) {
    const next = deps.replacedBy(id);
    if (next === undefined || next === id) break;
    id = next;
    try {
      const t = await deps.getTab(id);
      if (t) return { kind: "replaced", urls: [t.url, t.pendingUrl] };
    } catch {
      // the replacement is gone too
    }
    last = deps.lastUrl(id) ?? last;
  }
  const lastUrl = last ?? seen;
  return lastUrl === undefined ? { kind: "gone" } : { kind: "gone", lastUrl };
}

/** Does this method's class test a tab (when the params name one)? */
function testsTab(method: string, params: Record<string, unknown>): boolean {
  switch (methodClass(method)) {
    case "tab":
    case "evaluate":
    case "closeTab":
    case "navigate":
    case "upload": // Step 11 S2 (#256): a missing label here would compile (default: false) and read no tab
      return true;
    case "network":
      return tabIdOf(params) !== undefined;
    default:
      return false;
  }
}

/**
 * This extension's root URL, as `chrome.runtime.getURL("")` gives it. An empty id still yields a
 * `chrome-extension:` base, so a relative URL is refused whatever (fails closed).
 */
export function extensionBaseUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/`;
}

/**
 * The URL Chrome opens for a `navigate`/`newTab` URL (S2a fixer r1, verifier finding 1). `chrome.tabs.update`
 * and `create` resolve a URL that is not absolute against the extension ("Relative URLs are relative to the
 * current page within the extension"; Chromium resolves it as an extension resource, i.e. under the root —
 * unmeasured here, S4 row SAFE-REL). So: a URL the parser takes as absolute is returned exactly as written
 * (no reply changes for it); anything else is resolved against `base`; a string the parser rejects even
 * against the base is tested as `base` itself, i.e. as an extension page (refused, #138) — Chrome would open
 * it under the extension too.
 */
export function resolveOpenUrl(url: string, base: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    // not absolute
  }
  try {
    return new URL(url, base).href;
  } catch {
    return base;
  }
}

/** `ownTarget` for `navigate`/`newTab`, with its URL as Chrome will open it. */
function openTarget(method: string, params: Record<string, unknown>, extensionId: string): SafetyTarget {
  const t = ownTarget(method, params);
  if (t.kind !== "own" || typeof t.url !== "string" || t.url === "") return t;
  return { kind: "own", url: resolveOpenUrl(t.url, extensionBaseUrl(extensionId)) };
}

/**
 * The targets a method is tested by (S1's handoff). `tab` is the call's tab as read (null when the method
 * reads none or the params name no tab); `finalUrl` is `downloadStart`'s final URL once known;
 * `extensionId` is this extension's id, the base a relative `navigate`/`newTab` URL resolves under. Never
 * empty.
 */
export function callTargets(
  method: string,
  params: Record<string, unknown>,
  tab: SafetyTarget | null,
  finalUrl?: string,
  extensionId = "",
): SafetyTarget[] {
  const tabTarget: SafetyTarget = tab ?? { kind: "gone" };
  switch (methodClass(method)) {
    case "tab":
    case "evaluate":
    case "closeTab":
      return [tabTarget];
    case "navigate":
      return [tabTarget, openTarget(method, params, extensionId)];
    case "newTab":
      return [openTarget(method, params, extensionId)];
    case "downloadStart":
      return finalUrl === undefined ? [ownTarget(method, params)] : [ownTarget(method, params), { kind: "own", url: finalUrl }];
    case "network":
      return tabIdOf(params) !== undefined ? [tabTarget] : [{ kind: "none" }];
    case "upload": // Step 11 S2 (#256)
      return [tabTarget];
    case "listTabs":
    case "state":
      return [{ kind: "none" }];
  }
}

/** One gated call. Built per request by the router's factory in `sw.ts`. */
export class CallSafety implements GatedCall {
  private readonly cls: ReturnType<typeof methodClass>;
  private seen: string | undefined;
  private finalUrl: string | undefined;
  private cleanups: Array<() => void> = [];
  private hop: HopWatch | null = null;

  constructor(
    private readonly method: string,
    private readonly params: Record<string, unknown>,
    private readonly deps: CallSafetyDeps,
    private readonly dnr: DnrCall = NO_RULES,
  ) {
    this.cls = methodClass(method);
  }

  /** The gate at one phase. A state that cannot be read refuses; a wiring slip throws. */
  private async decide(phase: SafetyPhase): Promise<SafetyDecision> {
    return (await this.gate(phase)).d;
  }

  /** `decide`, with the view it read (null when the read failed). */
  private async gate(phase: SafetyPhase): Promise<{ d: SafetyDecision; view: SafetyView | null }> {
    let view: SafetyView;
    try {
      view = await this.deps.readState();
    } catch {
      return { d: stateUnreadableRefusal(), view: null };
    }
    let tab: SafetyTarget | null = null;
    const tabId = tabIdOf(this.params);
    if (tabId !== undefined && testsTab(this.method, this.params)) {
      tab = await resolveTabTarget(this.deps, tabId, this.seen);
      if (tab.kind === "live" || tab.kind === "replaced") {
        const u = tab.urls.find((x) => typeof x === "string" && x !== "");
        if (u !== undefined) this.seen = u;
      }
    }
    const targets = callTargets(this.method, this.params, tab, this.finalUrl, view.ctx.extensionId);
    return { d: safetyDecisionAll(this.method, this.params, targets, view.switches, view.ctx, phase), view };
  }

  receipt(): Promise<SafetyDecision> {
    return this.decide("receipt");
  }

  async effect(): Promise<void> {
    this.dnr.mark(); // the read below is at least as new as any rebuild before it (S2-builder.md §7)
    const { d, view } = await this.gate("effect");
    if (isRefusal(d)) throw refusalError(d);
    if (view) await this.dnr.install(view.ctx.blockList); // once per call; throws the state-unreadable refusal
    // S3b (#293, #296): a download holding rules watches for its own blocked hop, on the list its rules came from
    if (view && this.cls === "downloadStart" && !this.hop && this.dnr.holding() && this.deps.watchHops) {
      this.hop = this.deps.watchHops(view.ctx.blockList);
    }
  }

  async hopBlocked(): Promise<boolean> {
    return this.hop ? this.hop.settle() : false;
  }

  holdsRules(): boolean {
    return this.dnr.holding();
  }

  async checkFinalUrl(url: string): Promise<void> {
    this.finalUrl = url;
    await this.effect();
  }

  async post(): Promise<SafetyRefusal | null> {
    if (this.cls === "listTabs") return null;
    let d: SafetyDecision;
    try {
      d = await this.decide("post");
    } finally {
      this.hop?.close();
      await this.dnr.release(); // every path; settles after any rebuild queued before it, so read refusal() after
    }
    return isRefusal(d) ? d : this.dnr.refusal();
  }

  onRefused(fn: () => void): void {
    this.cleanups.push(fn);
  }

  runRefused(): void {
    const fns = this.cleanups;
    this.cleanups = [];
    for (const fn of fns) {
      try {
        fn();
      } catch {
        // a cleanup's failure must not change the refusal
      }
    }
  }

  private async viewOrRefuse(): Promise<SafetyView> {
    try {
      return await this.deps.readState();
    } catch {
      throw refusalError(stateUnreadableRefusal());
    }
  }

  async redactRows(rows: readonly ListRowInput[]): Promise<ExtensionListTabsRow[]> {
    const view = await this.viewOrRefuse();
    return rows.map((r) => redactListTabsRow(r.row, view.switches, view.ctx, r.pendingUrl));
  }

  async networkFilter(): Promise<(entry: NetworkUrls & { tabId: number }) => boolean> {
    const view = await this.viewOrRefuse();
    return (entry) => keepInQuery(entry, this.deps.lastUrl(entry.tabId), view.ctx);
  }
}

/**
 * The relay's sender check (#139; Stage 0 F19, V6): only the offscreen document — its own URL, and not a
 * tab showing that URL — may hand the router a request.
 */
export function acceptRelaySender(sender: { url?: string; tab?: unknown; id?: string } | undefined, offscreenUrl: string): boolean {
  if (!sender || typeof offscreenUrl !== "string" || offscreenUrl === "") return false;
  return sender.tab === undefined && sender.url === offscreenUrl;
}
