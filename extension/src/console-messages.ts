/**
 * Step 12 S3a (phase doc 0.5 with its Stage 0 note; decisions.md #323, #333, #334): `consoleMessages`' pure parts.
 *
 * - `ConsoleCollectors`: the per-call collectors the one top-level `chrome.debugger.onEvent` listener in `sw.ts`
 *   feeds; only the tab's own session (no `sessionId`), only four `Runtime.*` events, bounded.
 * - `collectConsole`: inside one debugger session, `Runtime.enable` (Chrome replays the stored messages and uncaught
 *   errors, Stage0-measurer1 C1–C3), a settle wait, `Runtime.disable` on every path. Never `Log.enable`, never
 *   `Runtime.discardConsoleEntries` (it empties the page's store for every later reader, C7).
 * - `reduceConsole`: events → entries. BEFORE anything is stripped it drops an entry whose source (a stack URL, the
 *   exception's `url`, a URL in its description's stack, the execution context's origin) the gate would hide, an
 *   entry with no known source, a revoked exception and an entry timestamped before the latest arm; then it keeps
 *   `{level, text, ts, kind}` only, text from `value`, `description` and `preview` only: no CDP-supplied source URL or
 *   stack (a description or preview value is cut at its first stack line); text the page itself logs is passed as
 *   logged.
 * - `ArmFloor`: the latest arm in this worker (its start, until an arm).
 *
 * No log call: console text is page data (root `CLAUDE.md`, the log invariant).
 */
import { CONSOLE_ENTRIES_MAX, CONSOLE_LEVELS, CONSOLE_TEXT_MAX, type ConsoleEntry, type ConsoleLevel } from "@bridge/shared";
import { urlHost, urlScheme } from "./safety-match.js";
import type { MemoryState } from "./safety-state.js";

export interface CdpEvent {
  method: string;
  params: unknown;
}

const COLLECTED = new Set(["Runtime.consoleAPICalled", "Runtime.exceptionThrown", "Runtime.exceptionRevoked", "Runtime.executionContextCreated"]);

export interface ConsoleCollector {
  readonly tabId: number;
  readonly events: CdpEvent[];
}

export class ConsoleCollectors {
  private readonly live = new Set<ConsoleCollector>();
  constructor(private readonly max = 4000) {}

  start(tabId: number): ConsoleCollector {
    const c: ConsoleCollector = { tabId, events: [] };
    this.live.add(c);
    return c;
  }

  stop(c: ConsoleCollector): void {
    this.live.delete(c);
  }

  get size(): number {
    return this.live.size;
  }

  /** `chrome.debugger.onEvent`'s arguments. A child session's event (`sessionId`) is never collected. */
  feed(source: { tabId?: number; sessionId?: string }, method: string, params?: unknown): void {
    if (source.sessionId !== undefined || !COLLECTED.has(method)) return;
    for (const c of this.live) {
      if (c.tabId !== source.tabId) continue;
      c.events.push({ method, params });
      if (c.events.length > this.max) c.events.shift();
    }
  }
}

/** The one registry the worker's listener feeds. */
export const consoleCollectors = new ConsoleCollectors();

/** How long the replay is given after `Runtime.enable` answers. */
export const CONSOLE_SETTLE_MS = 100;

export interface CollectDeps {
  collectors: ConsoleCollectors;
  send(method: string): Promise<unknown>;
  wait(ms: number): Promise<void>;
}

/** Run inside the call's debugger session: enable, settle, disable; the collector closed on every path. */
export async function collectConsole(tabId: number, deps: CollectDeps): Promise<CdpEvent[]> {
  const c = deps.collectors.start(tabId);
  try {
    await deps.send("Runtime.enable");
    await deps.wait(CONSOLE_SETTLE_MS);
  } finally {
    try {
      await deps.send("Runtime.disable");
    } catch {
      /* the detach that follows disables it anyway */
    }
    deps.collectors.stop(c);
  }
  return c.events;
}

/** The latest arm, as `Date.now()`; this worker's start until the first arm it sees. */
export class ArmFloor {
  private t: number;
  constructor(private readonly now: () => number) {
    this.t = now();
  }
  armed(): void {
    this.t = this.now();
  }
  get floor(): number {
    return this.t;
  }
}

export const consoleArmFloor = new ArmFloor(Date.now);

/**
 * True when the safety state lands on armed from anything but armed: unknown (a failed first load), unreadable or
 * disarmed. `sw.ts` moves the floor on it after a `storage.onChanged` batch, which also covers the unknown → armed
 * change `onArm` does not see (S3a verifier M-2). Moving the floor later only drops more (fails closed).
 */
export function armedFromUnknown(prev: MemoryState | null, next: MemoryState | null): boolean {
  const nowArmed = next !== null && next.unreadable !== true && next.armed;
  const wasArmed = prev !== null && prev.unreadable !== true && prev.armed;
  return nowArmed && !wasArmed;
}

export interface ReduceOptions {
  /** True for a source URL or origin the gate hides (blocked, own extension, `file:`). */
  dropSource(url: string): boolean;
  /** Entries before this time (ms since the epoch) are dropped. */
  floor: number;
  level?: ConsoleLevel;
  limit: number;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === "object" && v !== null ? (v as Obj) : {});
const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

const STACK_LINE = /\n\s*at\s/;
const URL_IN_TEXT = /[a-z][a-z0-9+.-]*:\/\/[^\s()]+/gi;

/** Marks a cut part V8 shortened (it ends in `…`): its sources are unknown, so the entry is dropped (#344 (3)). */
const SHORTENED = "\u0000shortened";

/** A description cut at its first stack line; the cut part's URLs are sources. */
function cutStack(s: string, sources: string[]): string {
  const m = STACK_LINE.exec(s);
  if (!m) return s;
  const cut = s.slice(m.index);
  for (const u of cut.match(URL_IN_TEXT) ?? []) sources.push(u);
  if (cut.trimEnd().endsWith("…")) sources.push(SHORTENED);
  return s.slice(0, m.index).trimEnd();
}

/**
 * A preview's properties; each value cut like a description (an Error-valued property's value is its stack, F1).
 * A non-string value V8 shortened (ends in `…`) is an unknown source whether or not a stack line survived (S3b F1);
 * a string value is shortened in the middle and carries no source.
 */
function previewText(p: Obj, sources: string[]): string {
  const props = Array.isArray(p.properties) ? (p.properties as unknown[]).map(obj) : [];
  const isArray = p.subtype === "array";
  const parts = props.map((q) => {
    const raw = String(q.value ?? "");
    if (q.type !== "string" && raw.trimEnd().endsWith("…")) sources.push(SHORTENED);
    const v = cutStack(raw, sources);
    return isArray ? v : `${String(q.name)}: ${v}`;
  });
  if (p.overflow === true) parts.push("…");
  return isArray ? `[${parts.join(", ")}]` : `{${parts.join(", ")}}`;
}

/** A RemoteObject as text: `value`, `unserializableValue`, `description` and `preview` only (never a page call). */
function remoteText(v: unknown, sources: string[]): string {
  const r = obj(v);
  if (r.type === "string") return typeof r.value === "string" ? r.value : "";
  if (r.type === "undefined") return "undefined";
  if (r.subtype === "null") return "null";
  if (r.type !== "object" && r.type !== "function") return str(r.unserializableValue) ?? str(r.description) ?? String(r.value);
  const head = cutStack(str(r.description) ?? str(r.className) ?? String(r.type), sources);
  const preview = obj(r.preview);
  return r.subtype !== "error" && Array.isArray(preview.properties) ? `${head} ${previewText({ ...preview, subtype: preview.subtype ?? r.subtype }, sources)}` : head;
}

function stackUrls(st: unknown, sources: string[]): void {
  for (let s = obj(st), depth = 0; Object.keys(s).length > 0 && depth < 32; s = obj(s.parent), depth++) {
    for (const f of Array.isArray(s.callFrames) ? (s.callFrames as unknown[]) : []) {
      const u = str(obj(f).url);
      if (u) sources.push(u);
    }
  }
}

const HOSTLESS_SOURCE_SCHEMES = new Set(["file:", "data:", "blob:", "about:", "chrome-extension:", "chrome:"]);
function isSourceUrl(u: string): boolean {
  return urlHost(u) !== null || HOSTLESS_SOURCE_SCHEMES.has(urlScheme(u) ?? "");
}

function levelOf(type: unknown): ConsoleLevel {
  if (type === "error" || type === "assert") return "error";
  if (type === "warning") return "warning";
  if (type === "debug") return "debug";
  return "info";
}

function capText(s: string): string {
  if (s.length <= CONSOLE_TEXT_MAX) return s;
  let cut = s.slice(0, CONSOLE_TEXT_MAX - 1);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut + "…";
}

export function reduceConsole(events: readonly CdpEvent[], o: ReduceOptions): ConsoleEntry[] {
  const origins = new Map<unknown, string>();
  const revoked = new Set<unknown>();
  for (const e of events) {
    const p = obj(e.params);
    if (e.method === "Runtime.executionContextCreated") {
      const c = obj(p.context);
      origins.set(c.id, typeof c.origin === "string" ? c.origin : "");
    } else if (e.method === "Runtime.exceptionRevoked") revoked.add(p.exceptionId);
  }
  const maxRank = o.level === undefined ? CONSOLE_LEVELS.length - 1 : CONSOLE_LEVELS.indexOf(o.level);
  const out: ConsoleEntry[] = [];
  for (const e of events) {
    const p = obj(e.params);
    const sources: string[] = [];
    let entry: ConsoleEntry;
    if (e.method === "Runtime.consoleAPICalled") {
      const text = (Array.isArray(p.args) ? (p.args as unknown[]) : []).map((a) => remoteText(a, sources)).join(" ");
      stackUrls(p.stackTrace, sources);
      const origin = str(origins.get(p.executionContextId));
      if (origin) sources.push(origin);
      entry = { level: levelOf(p.type), text, ts: p.timestamp as number, kind: "console" };
    } else if (e.method === "Runtime.exceptionThrown") {
      const d = obj(p.exceptionDetails);
      if (revoked.has(d.exceptionId)) continue;
      const head = typeof d.text === "string" ? d.text : "Uncaught";
      const text = d.exception === undefined ? head : `${head} ${remoteText(d.exception, sources)}`;
      const url = str(d.url);
      if (url) sources.push(url);
      stackUrls(d.stackTrace, sources);
      const origin = str(origins.get(d.executionContextId));
      if (origin) sources.push(origin);
      entry = { level: "error", text, ts: p.timestamp as number, kind: "exception" };
    } else continue;
    // The filters, before anything is stripped (#333): every source must pass, and there must be a real one. A string
    // that is not a URL with a host or a known scheme (`null`, `<anonymous>`, a bare `//# sourceURL=` name) still meets
    // the predicate, but does not count as the one source (M-1).
    if (sources.includes(SHORTENED) || sources.some((u) => o.dropSource(u)) || !sources.some(isSourceUrl)) continue;
    if (typeof entry.ts !== "number" || !Number.isFinite(entry.ts) || entry.ts < o.floor) continue;
    if (CONSOLE_LEVELS.indexOf(entry.level) > maxRank) continue;
    out.push({ ...entry, text: capText(entry.text) });
  }
  out.sort((a, b) => a.ts - b.ts);
  const limit = Math.min(Math.max(1, Math.floor(o.limit)), CONSOLE_ENTRIES_MAX);
  return out.slice(-limit);
}
