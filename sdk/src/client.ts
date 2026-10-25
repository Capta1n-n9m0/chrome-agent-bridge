// BridgeClient: one welcomed connection to the daemon, id-correlated calls, events, and the
// close-code rules of decision #15 — reconnect on 4002 only; any other close fails the client.
import os from "node:os";
import {
  BridgeError,
  ErrorCodes,
  fromWire,
  isErrorResponse,
  isEvent,
  isHiddenReason,
  isLeaseGrantedEvent,
  isResponse,
  isSafetyState,
  isSafetyStatusEvent,
  isTabGoneEvent,
  type EventMessage,
  type ExtensionStatusParams,
  type HiddenReason,
  type LeaseGrantedParams,
  type SafetyState,
  type SafetyStatusParams,
  type RequestMessage,
  type TabGoneParams,
  type WelcomeMessage,
} from "@bridge/shared";
import type { LocateResult, Locator, NetworkEntry, SnapshotResult, WaitForParams } from "@bridge/shared";
import type { DownloadOutcome } from "./download.js";
import type { EvaluateToFileOptions, EvaluateToFileResult } from "./evaluate-save.js";
import type { UploadOptions, UploadResult } from "./upload.js";
import type { Knocked } from "./knock.js";
import type { Target } from "./locator.js";
import {
  Tab,
  type DownloadOptions,
  type NetworkListOptions,
  type ScreenshotOptions,
  type ScrollOptions,
  type BridgeWarning,
  type TabHost,
  type TrustedOption,
} from "./tab.js";
import type { FailureReportConfig } from "./error.js";
import type { Connection } from "./transport.js";

/** Close code the daemon sends when it is replaced (`daemon.shutdown`, handover). */
export const CLOSE_UPGRADING = 4002;
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MIN_TIMEOUT_MS = 100;
export const MAX_TIMEOUT_MS = 600_000;
/** The daemon waits the bounded timeout plus this, so the extension's own timer reports first. */
export const DAEMON_SLACK_MS = 5_000;
/** The client waits 1 s longer than the daemon, so the daemon's TIMEOUT always arrives first. */
export const CLIENT_MARGIN_MS = 1_000;

/** The client's own timer for a call: `clamp(timeoutMs ?? 30000, 100, 600000) + 5000 + 1000`. */
export function clientTimeoutMs(timeoutMs: number | undefined): number {
  const requested = timeoutMs !== undefined && Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const bounded = Math.min(Math.max(requested, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  return bounded + DAEMON_SLACK_MS + CLIENT_MARGIN_MS;
}

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface CallOptions {
  /** Per-call timeout sent to the daemon (it bounds it to [100, 600000] and adds 5 s). */
  timeoutMs?: number;
}

/** What the client tells its knock: `reconnect` is true on the knock that follows a 4002 close. */
export interface KnockContext {
  reconnect: boolean;
}

export interface BridgeClientOptions {
  /**
   * Runs the knock (a fresh one per connect and per 4002 reconnect). `connect()` disables the
   * handover when `ctx.reconnect` is true (decision #10: one handover, never back and forth).
   */
  knock: (ctx: KnockContext) => Promise<Knocked>;
  timers?: Timers;
  /**
   * Default true: a `Tab` call that fails with an attach-set code gets a failure report (phase doc
   * 0.5); false: errors are rethrown untouched with no extra call. Raw `call()` is never enriched.
   */
  failureReports?: boolean;
  /** Where `BRIDGE_FAILURES_DIR` is read from. Default `process.env`. */
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  /** Test seam: the home directory of the default failures directory. Default `os.homedir`. */
  homedir?: () => string;
  /** Test seam: epoch ms, names the failure screenshot. Default `Date.now`. */
  now?: () => number;
}

type FailureListener = (err: BridgeError) => void;
/**
 * Package-internal (not re-exported from index.ts): `connect()` uses it to stop waiting for the
 * extension as soon as the client fails. Kept off the class so the public surface does not grow.
 */
const failureListeners = new WeakMap<BridgeClient, Set<FailureListener>>();

/** Calls `listener` once if `client` fails (a non-4002 close, or a failed 4002 reconnect). */
export function onClientFailure(client: BridgeClient, listener: FailureListener): () => void {
  let set = failureListeners.get(client);
  if (!set) {
    set = new Set();
    failureListeners.set(client, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

type EventListener = (event: EventMessage) => void;
type ReconnectListener = (welcome: WelcomeMessage) => void;
type WarningListener = (warning: BridgeWarning) => void;

/** The daemon → client events with typed params (spec §10), each checked before delivery. */
interface TypedEvents {
  tabGone: TabGoneParams;
  leaseGranted: LeaseGrantedParams;
  extensionStatus: ExtensionStatusParams;
  /** Step 9 (#132): the extension's safety state, on every change. */
  safetyStatus: SafetyStatusParams;
}
type TypedEventName = keyof TypedEvents;
type TypedListener = (params: never) => void;

/**
 * The params of `message` if it is a well-formed `name` event, else null. `tabGone`/`leaseGranted`
 * use the shared guards; `extensionStatus` has none in `@bridge/shared`, so its one field is checked
 * here (the same check `extensionConnected` already applied).
 */
function typedParams(name: TypedEventName, message: EventMessage): object | null {
  switch (name) {
    case "tabGone":
      return isTabGoneEvent(message) ? message.params : null;
    case "leaseGranted":
      return isLeaseGrantedEvent(message) ? message.params : null;
    case "extensionStatus":
      return message.event === "extensionStatus" && typeof message.params.connected === "boolean"
        ? message.params
        : null;
    case "safetyStatus":
      return isSafetyStatusEvent(message) ? message.params : null;
  }
}

function isTypedEventName(name: string): name is TypedEventName {
  return name === "tabGone" || name === "leaseGranted" || name === "extensionStatus" || name === "safetyStatus";
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: BridgeError) => void;
  timer: unknown;
}

type State = "idle" | "connecting" | "open" | "reconnecting" | "failed" | "closed";

/** One entry of `BridgeClient.tabs()`. */
export interface TabInfo {
  /** The daemon's handle, e.g. `"T3"`: pass it to `claim()`. */
  handle: string;
  title: string;
  url: string;
  /** The actor name of the client that holds the tab, if one does. */
  owner?: string;
  /** The human's tab: the active tab of the last-focused normal window (decision #43). */
  current: boolean;
  /**
   * Step 9: set when the extension withheld this tab's title and url — `"disarmed"` (the user turned the
   * bridge off) or `"blocked"` (a blocked site); `title` and `url` are then `""` (decisions.md ·
   * 2026-10-24 · The SDK's `TabInfo` keeps `title` and `url` as strings and gains an optional `hidden` (#148)).
   */
  hidden?: HiddenReason;
}

const NO_CURSOR_MESSAGE = "No tab cursor: call newTab() or claim() first";

export class BridgeClient {
  private readonly knockFn: (ctx: KnockContext) => Promise<Knocked>;
  private readonly timers: Timers;
  private state: State = "idle";
  private conn: Connection | null = null;
  private detachConn: (() => void) | null = null;
  private ready: Promise<WelcomeMessage> | null = null;
  private failure: BridgeError | null = null;
  private readonly pending = new Map<string, Pending>();
  private nextId = 1;
  private readonly eventListeners = new Set<EventListener>();
  private readonly reconnectListeners = new Set<ReconnectListener>();
  private readonly warningListeners = new Set<WarningListener>();
  private readonly typedListeners = new Map<TypedEventName, Set<TypedListener>>();
  private currentWelcome: WelcomeMessage | null = null;
  private extensionUp = false;
  /** Bumped synchronously by every 4002 close: a `Tab` from an older generation is void (#79). */
  private generation = 0;
  private cursor: Tab | null = null;
  private readonly failureReports: FailureReportConfig | null;
  private readonly host: TabHost = {
    call: (method, params, options) => this.call(method, params, options),
    generation: () => this.generation,
    failureReports: () => this.failureReports,
    notifyWarning: (warning) => this.emitWarning(warning),
  };

  constructor(options: BridgeClientOptions) {
    this.knockFn = options.knock;
    this.timers = options.timers ?? realTimers;
    this.failureReports =
      options.failureReports === false
        ? null
        : {
            timers: this.timers,
            env: options.env ?? process.env,
            homedir: options.homedir ?? os.homedir,
            now: options.now ?? Date.now,
          };
  }

  /**
   * The latest welcome from the daemon (build, proto, clientId, extensionConnected); null before the
   * first connect. It is replaced after every 4002 reconnect.
   */
  get welcome(): WelcomeMessage | null {
    return this.currentWelcome;
  }

  /**
   * Whether the daemon reports the Chrome extension connected: from the latest welcome, then kept
   * current by `extensionStatus` events (including any that arrived right behind the welcome).
   */
  get extensionConnected(): boolean {
    return this.extensionUp;
  }

  /** Runs the knock; resolves when welcomed. */
  async connect(): Promise<WelcomeMessage> {
    if (this.state === "open" && this.currentWelcome) return this.currentWelcome;
    if (this.state === "connecting" || this.state === "reconnecting") return this.ready!;
    if (this.state === "closed") throw this.closedError();
    if (this.state === "failed") throw this.failure!;
    this.state = "connecting";
    this.ready = this.establish(false);
    try {
      return await this.ready;
    } catch (err) {
      if (this.state === "connecting") this.state = "idle";
      throw err;
    }
  }

  async call(method: string, params?: Record<string, unknown>, options: CallOptions = {}): Promise<unknown> {
    if (this.state === "connecting" || this.state === "reconnecting") {
      try {
        await this.ready;
      } catch {
        // reported below from the state the failure left behind
      }
    }
    if (this.state === "closed") throw this.closedError();
    if (this.state === "failed") throw this.failure!;
    if (this.state !== "open" || !this.conn) {
      throw new BridgeError(ErrorCodes.NOT_CONNECTED, `Not connected to the bridge daemon (call connect() first) calling ${method}`);
    }
    return this.send(this.conn, method, params, options.timeoutMs);
  }

  /** `daemon.status` — build, uptime, clients, extension. */
  status(): Promise<unknown> {
    return this.call("daemon.status");
  }

  /**
   * The extension's safety state as the daemon last heard it (Step 9, decisions.md · 2026-10-24 · The safety
   * state travels as two events and a `daemon.status` field (#132)): `{armed, evaluate, blockedCount}`, or
   * null when the extension has not reported one (not connected, or a build older than Step 9; a daemon
   * older than Step 9 reports none either). Read-only: only the human changes the state, in Chrome.
   */
  async safety(): Promise<SafetyState | null> {
    const result = (await this.call("daemon.status")) as { safety?: unknown } | null;
    const s = result?.safety;
    return isSafetyState(s) ? { armed: s.armed, evaluate: s.evaluate, blockedCount: s.blockedCount } : null;
  }

  /**
   * `"event"`: every daemon → client event frame (e.g. `extensionStatus`).
   *
   * `"reconnected"`: fires after a 4002 reconnect has been welcomed, with the new welcome. This is
   * the hook where Step 7/8 clear the client's tab cursor (decision #11): a replaced daemon knows
   * nothing of the tabs the old one handed out. Not fired for the first connect.
   *
   * `"tabGone"` / `"leaseGranted"` / `"extensionStatus"` / `"safetyStatus"` (Step 9, #132): that event's
   * params, only when the frame is well-formed (`isTabGoneEvent` / `isLeaseGrantedEvent` / a boolean
   * `connected` / `isSafetyStatusEvent`); a malformed frame
   * still reaches `"event"` listeners. Delivered synchronously from the socket's message callback, so
   * several frames from one read arrive in order, each after the previous listener returned.
   *
   * `"warning"` (Step 10 S3, decisions.md #117, #206): a client-side event, never a daemon frame (so
   * `"event"` listeners do not see it). Emitted once by a `Tab` action — and its cursor mirror here —
   * whose reply said the element it acted on is past the snapshot's 800-element cap:
   * `{tab, method, kind: "pastSnapshotCap"}`, with no locator or element text. Fired before the action's
   * promise settles; a listener that throws is ignored (the action still succeeds) and later listeners
   * still run. `locate()` emits none (its result carries `pastSnapshotCap`), nor does a raw `call()`.
   *
   * Returns an unsubscribe.
   */
  on(type: "event", listener: EventListener): () => void;
  on(type: "reconnected", listener: ReconnectListener): () => void;
  on(type: "tabGone", listener: (params: TabGoneParams) => void): () => void;
  on(type: "leaseGranted", listener: (params: LeaseGrantedParams) => void): () => void;
  on(type: "extensionStatus", listener: (params: ExtensionStatusParams) => void): () => void;
  on(type: "safetyStatus", listener: (params: SafetyStatusParams) => void): () => void;
  on(type: "warning", listener: (warning: BridgeWarning) => void): () => void;
  on(
    type: "event" | "reconnected" | "warning" | TypedEventName,
    listener: EventListener | ReconnectListener | WarningListener | TypedListener,
  ): () => void {
    if (type === "warning") {
      const l = listener as WarningListener;
      this.warningListeners.add(l);
      return () => {
        this.warningListeners.delete(l);
      };
    }
    if (isTypedEventName(type)) {
      const l = listener as TypedListener;
      let set = this.typedListeners.get(type);
      if (!set) {
        set = new Set();
        this.typedListeners.set(type, set);
      }
      const listeners = set;
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    }
    if (type === "event") {
      const l = listener as EventListener;
      this.eventListeners.add(l);
      return () => {
        this.eventListeners.delete(l);
      };
    }
    const l = listener as ReconnectListener;
    this.reconnectListeners.add(l);
    return () => {
      this.reconnectListeners.delete(l);
    };
  }

  // ── tabs and the cursor (phase doc 0.4) ──────────────────────────────────────

  /**
   * Opens a tab (in the background unless `active: true`), leased to this client, and makes it the
   * cursor.
   */
  async newTab(url?: string, options: { active?: boolean } = {}): Promise<Tab> {
    const params: Record<string, unknown> = {};
    if (url !== undefined) params.url = url;
    if (options.active !== undefined) params.active = options.active;
    return this.adopt("newTab", params);
  }

  /** Takes the lease on a tab by handle, or on the human's tab with `{active: true}`; sets the cursor. */
  async claim(target: string | { active: true }): Promise<Tab> {
    return this.adopt("tabs.claim", typeof target === "string" ? { tab: target } : { active: true });
  }

  /**
   * The cursor: the `Tab` of the last `newTab()` or `claim()`. Throws `NO_CURSOR` if there is none,
   * including after a 4002 reconnect (the replaced daemon's handles are void). Releasing or closing
   * the cursor tab does not clear it.
   */
  tab(): Tab {
    if (!this.cursor) throw new BridgeError(ErrorCodes.NO_CURSOR, NO_CURSOR_MESSAGE);
    return this.cursor;
  }

  /** Every tab: handle, title, url, holder, and which one is the human's (`current`). */
  async tabs(): Promise<TabInfo[]> {
    const result = (await this.call("listTabs")) as { tabs?: unknown } | null;
    const list = Array.isArray(result?.tabs) ? (result.tabs as Record<string, unknown>[]) : [];
    const out: TabInfo[] = [];
    for (const e of list) {
      if (typeof e?.tab !== "string") continue;
      const info: TabInfo = {
        handle: e.tab,
        title: typeof e.title === "string" ? e.title : "",
        url: typeof e.url === "string" ? e.url : "",
        current: e.current === true,
      };
      if (typeof e.owner === "string") info.owner = e.owner;
      if (isHiddenReason(e.hidden)) info.hidden = e.hidden;
      out.push(info);
    }
    return out;
  }

  // The cursor's Tab methods, mirrored — every one but `close`, which keeps its Step 6 meaning here
  // (close the client); close the cursor tab with `client.tab().close()`. No cursor → NO_CURSOR.

  async navigate(url: string): Promise<void> {
    return this.tab().navigate(url);
  }
  async back(): Promise<void> {
    return this.tab().back();
  }
  async forward(): Promise<void> {
    return this.tab().forward();
  }
  async snapshot(): Promise<SnapshotResult> {
    return this.tab().snapshot();
  }
  screenshot(options: ScreenshotOptions & { path: string }): Promise<string>;
  screenshot(options?: Omit<ScreenshotOptions, "path">): Promise<Buffer>;
  async screenshot(options: ScreenshotOptions = {}): Promise<Buffer | string> {
    return this.tab().screenshot(options as ScreenshotOptions & { path: string });
  }
  async click(target: Target, options?: TrustedOption): Promise<void> {
    return this.tab().click(target, options);
  }
  async type(target: Target, text: string, options?: TrustedOption & { submit?: boolean }): Promise<void> {
    return this.tab().type(target, text, options);
  }
  async pressKey(key: string, options?: TrustedOption): Promise<void> {
    return this.tab().pressKey(key, options);
  }
  async hover(target: Target): Promise<void> {
    return this.tab().hover(target);
  }
  /** `Tab.scroll` on the cursor: `"down"` (default) or `"up"`; `direction` is ignored with a `target`. */
  async scroll(options?: ScrollOptions): Promise<void> {
    return this.tab().scroll(options);
  }
  async selectOption(target: Target, values: string[]): Promise<void> {
    return this.tab().selectOption(target, values);
  }
  async locate(locator: Locator): Promise<LocateResult> {
    return this.tab().locate(locator);
  }
  async waitFor(p: WaitForParams): Promise<void> {
    return this.tab().waitFor(p);
  }
  async evaluate<T = unknown>(expression: string, options?: { timeoutMs?: number }): Promise<T> {
    return this.tab().evaluate<T>(expression, options);
  }
  async evaluateRef(expression: string): Promise<string> {
    return this.tab().evaluateRef(expression);
  }
  /**
   * `Tab.evaluateToFile` on the cursor (Step 10 S4; Stage 0 F21). Produce a very large value with `return …`: it
   * is then read out of the page in slices, while a bare string expression crosses Chrome's debugger as one piece.
   */
  async evaluateToFile(expression: string, options: EvaluateToFileOptions): Promise<EvaluateToFileResult> {
    return this.tab().evaluateToFile(expression, options);
  }
  async network(options?: NetworkListOptions | { id: string }): Promise<NetworkEntry[]> {
    return this.tab().network(options);
  }
  async networkClear(): Promise<number> {
    return this.tab().networkClear();
  }
  async download(url: string, path: string, options?: DownloadOptions): Promise<DownloadOutcome> {
    return this.tab().download(url, path, options);
  }
  /** `Tab.upload` on the cursor (Step 11 S4, #240): the preflight, then `uploadFiles` with the real paths. */
  async upload(target: Target, paths: string | string[], options?: UploadOptions): Promise<UploadResult> {
    return this.tab().upload(target, paths, options);
  }
  async focus(): Promise<void> {
    return this.tab().focus();
  }
  async release(): Promise<void> {
    return this.tab().release();
  }

  /** Closes the socket and rejects pending calls. Never reconnects. */
  close(): void {
    if (this.state === "closed") return;
    this.state = "closed";
    const conn = this.conn;
    this.drop();
    this.rejectAll(this.closedError());
    conn?.close(1000, "client closed");
  }

  // ── internals ────────────────────────────────────────────────────────────────

  /**
   * Sends a tab-minting call and wraps the handle in a `Tab` of the generation the call was sent in.
   * If a 4002 close lands between the answer and this continuation (one `ws` read can carry both),
   * the handle belongs to the replaced daemon: `TAB_UNKNOWN`, and the cursor is left alone.
   */
  private async adopt(method: string, params: Record<string, unknown>): Promise<Tab> {
    const generation = this.generation;
    const result = (await this.call(method, params)) as { tab?: unknown } | null;
    if (typeof result?.tab !== "string") {
      throw new BridgeError(ErrorCodes.INTERNAL, `${method} answered without a tab handle`);
    }
    if (generation !== this.generation) {
      throw new BridgeError(
        ErrorCodes.TAB_UNKNOWN,
        `tab ${result.tab} came from a bridge daemon that restarted (close 4002) before it reached this client — call claim() again`,
      );
    }
    const tab = new Tab(this.host, result.tab, generation);
    this.cursor = tab;
    return tab;
  }

  private closedError(): BridgeError {
    return new BridgeError(ErrorCodes.NOT_CONNECTED, "BridgeClient is closed");
  }

  private async establish(reconnect: boolean): Promise<WelcomeMessage> {
    const { conn, welcome } = await this.knockFn({ reconnect });
    if (this.state === "closed") {
      conn.close(1000, "client closed");
      throw this.closedError();
    }
    this.attach(conn, welcome);
    this.state = "open";
    return welcome;
  }

  private attach(conn: Connection, welcome: WelcomeMessage): void {
    this.conn = conn;
    this.currentWelcome = welcome;
    this.extensionUp = welcome.extensionConnected;
    const offMessage = conn.onMessage((m) => this.handleMessage(m));
    const offClose = conn.onClose((code, reason) => this.handleClose(conn, code, reason));
    this.detachConn = () => {
      offMessage();
      offClose();
    };
  }

  private drop(): void {
    this.detachConn?.();
    this.detachConn = null;
    this.conn = null;
  }

  private send(
    conn: Connection,
    method: string,
    params: Record<string, unknown> | undefined,
    timeoutMs: number | undefined,
  ): Promise<unknown> {
    const id = String(this.nextId++);
    const request: RequestMessage = { id, method };
    if (params !== undefined) request.params = params;
    if (timeoutMs !== undefined) request.timeoutMs = timeoutMs;
    const wait = clientTimeoutMs(timeoutMs);
    return new Promise((resolve, reject) => {
      const timer = this.timers.setTimeout(() => {
        this.pending.delete(id);
        reject(new BridgeError(ErrorCodes.TIMEOUT, `Timed out after ${wait}ms calling ${method}`));
      }, wait);
      this.pending.set(id, { resolve, reject, timer });
      conn.send(request);
    });
  }

  private handleMessage(message: unknown): void {
    if (isResponse(message)) {
      const p = this.pending.get(message.id);
      if (!p) return;
      this.pending.delete(message.id);
      this.timers.clearTimeout(p.timer);
      if (isErrorResponse(message)) p.reject(fromWire(message.error));
      else p.resolve(message.result);
      return;
    }
    if (isEvent(message)) {
      if (message.event === "extensionStatus" && typeof message.params.connected === "boolean") {
        this.extensionUp = message.params.connected;
      }
      for (const l of [...this.eventListeners]) l(message);
      if (isTypedEventName(message.event)) {
        const set = this.typedListeners.get(message.event);
        const params = set && set.size > 0 ? typedParams(message.event, message) : null;
        if (set && params) {
          // A listener removed by an earlier one in this same dispatch is skipped.
          for (const l of [...set]) if (set.has(l)) (l as (p: object) => void)(params);
        }
      }
    }
  }

  private handleClose(conn: Connection, code: number, reason: string): void {
    if (conn !== this.conn) return;
    this.drop();
    if (this.state === "closed") return;

    if (code === CLOSE_UPGRADING) {
      // Before anything else can run (frames behind this close in the same read, queued calls): the
      // new daemon renumbers handles, so every older Tab is void and the cursor is gone (#11, #79;
      // stage0-audit F24).
      this.generation += 1;
      this.cursor = null;
      this.rejectAll(
        new BridgeError(
          ErrorCodes.NOT_CONNECTED,
          "daemon restarting (4002) — the call was in flight when the daemon was replaced; reconnecting",
        ),
      );
      this.state = "reconnecting";
      const ready = this.establish(true).then(
        (welcome) => {
          for (const l of [...this.reconnectListeners]) l(welcome);
          return welcome;
        },
        (err: unknown) => {
          if (this.state !== "closed") {
            this.state = "failed";
            this.failure =
              err instanceof BridgeError ? err : new BridgeError(ErrorCodes.NOT_CONNECTED, String(err));
            this.notifyFailure(this.failure);
          }
          throw err;
        },
      );
      ready.catch(() => {}); // surfaced by the next call()
      this.ready = ready;
      return;
    }

    const why = reason ? ` "${reason}"` : "";
    const err = new BridgeError(
      ErrorCodes.NOT_CONNECTED,
      `The connection to the bridge daemon closed (code ${code}${why}); this client does not reconnect — ` +
        "call connect() for a new client to continue",
    );
    this.state = "failed";
    this.failure = err;
    this.rejectAll(err);
    this.notifyFailure(err);
  }

  /** Delivers a `warning` to each listener; a listener's throw is swallowed (S3: it never fails the action). */
  private emitWarning(warning: BridgeWarning): void {
    for (const l of [...this.warningListeners]) {
      if (!this.warningListeners.has(l)) continue;
      try {
        l({ tab: warning.tab, method: warning.method, kind: warning.kind });
      } catch {
        // ignored by design: the action already succeeded
      }
    }
  }

  private notifyFailure(err: BridgeError): void {
    const set = failureListeners.get(this);
    if (!set) return;
    failureListeners.delete(this);
    for (const l of [...set]) l(err);
  }

  private rejectAll(err: BridgeError): void {
    for (const [id, p] of this.pending) {
      this.pending.delete(id);
      this.timers.clearTimeout(p.timer);
      p.reject(err);
    }
  }
}
