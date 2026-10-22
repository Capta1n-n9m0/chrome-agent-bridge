// Step 7 T2 — the daemon's tab layer (phase doc T2; spec §6, §10; decisions.md #39–#44, #52–#54).
//
// Every client request that is not `daemon.*` passes through `TabLayer.request` (via `route.ts`):
// handles are resolved to Chrome tab ids, leases are checked (fail fast), the visibility lock is taken
// for screen-needing methods, and the call is forwarded with a numeric `tabId` and never a `tab` key.
// Extension events keep the handle table current; a client's disconnect drops its leases and its hold
// on the lock.
//
// Logging: only handles, client names and counts — never a URL, title, header value, body or token.
import {
  BridgeError,
  ErrorCodes,
  isTabCreatedEvent,
  isTabRemovedEvent,
  isTabReplacedEvent,
  type EventMessage,
  type LeaseGrantedParams,
  type TabCreatedParams,
  type TabGoneParams,
} from "@bridge/shared";
import type { Bridge } from "./bridge.js";
import type { ExtensionConnection } from "./connection.js";
import { HandleTable } from "./handles.js";
import { LeaseTable } from "./leases.js";
import { VisibilityLock } from "./lock.js";
import { classify, takesLock, LEGACY_ID_METHODS, NETWORK_METHODS } from "./methods.js";
import { DAEMON_SLACK_MS, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, MIN_TIMEOUT_MS } from "./route.js";

export const RELOAD_HINT =
  "the Chrome extension is an older build — reload it at chrome://extensions (↻ on Chrome Agent Bridge)";
export const NO_HUMAN_TAB =
  "No normal Chrome window is focused (a DevTools or popup window may have focus) — click a normal Chrome window and retry";

/** The client a request came from. */
export interface Caller {
  clientId: string;
  name: string;
}

export interface TabLayerDeps {
  bridge: Bridge;
  /** A connected client's name; undefined once it is gone. */
  nameOf: (clientId: string) => string | undefined;
  /** Send an event frame to one client (dropped if it is gone). */
  sendTo: (clientId: string, frame: EventMessage<object>) => void;
  log?: (msg: string) => void;
  now?: () => number;
}

export interface StatusTab {
  tab: string;
  tabId: number;
  owner?: string;
  url?: string;
}

interface ListedTab {
  id: number;
  url?: unknown;
  title?: unknown;
  current?: unknown;
  [k: string]: unknown;
}

type Params = Record<string, unknown>;

function clampTimeout(timeoutMs: number | undefined): number {
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, timeoutMs ?? DEFAULT_TIMEOUT_MS));
}

function hhmmss(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(11, 19);
}

function without(params: Params | undefined, ...keys: string[]): Params {
  const out: Params = { ...(params ?? {}) };
  for (const k of keys) delete out[k];
  return out;
}

const bad = (message: string) => new BridgeError(ErrorCodes.BAD_PARAMS, message);

export class TabLayer {
  readonly handles: HandleTable;
  readonly leases = new LeaseTable();
  readonly lock: VisibilityLock;
  private readonly now: () => number;
  /** Extension connections whose hello carried `proto` ≥ 2 (#42). */
  private readonly protoConnections = new WeakSet<ExtensionConnection>();
  /** Clients that already got their one legacy log line. */
  private readonly legacyLogged = new Set<string>();
  /**
   * In-flight `newTab` calls (F20). While any is in flight, an opener grant is made at once (so the
   * tab is never unheld) but its `leaseGranted` is held back until they settle: a `newTab` that
   * turns out to have created the tab overrides the lease, and the held-back event is dropped.
   */
  private newTabsInFlight = 0;
  private heldBackGrants: Array<{ handle: string; clientId: string; url: string }> = [];
  /** tabId → client closing it (no `tabGone` to the closer). */
  private readonly closing = new Map<number, string>();

  constructor(private readonly deps: TabLayerDeps) {
    this.now = deps.now ?? Date.now;
    this.handles = new HandleTable({ now: this.now });
    this.lock = new VisibilityLock({ nameOf: (id) => this.name(id), now: this.now });
  }

  private name(clientId: string): string {
    return this.deps.nameOf(clientId) ?? clientId;
  }

  private isProto(): boolean {
    const conn = this.deps.bridge.currentConnection();
    return conn !== null && this.protoConnections.has(conn);
  }

  // ------------------------------------------------------------------ extension side

  /** A new extension socket said hello. A proto:2 one gets the F15 resync. */
  extensionConnected(conn: ExtensionConnection, proto: boolean): void {
    if (!proto) return;
    this.protoConnections.add(conn);
    void this.resync(conn);
  }

  private async resync(conn: ExtensionConnection): Promise<void> {
    const before = this.handles.live().map((h) => h.handle);
    let result: unknown;
    try {
      result = await conn.call("listTabs", undefined, { timeoutMs: DEFAULT_TIMEOUT_MS + DAEMON_SLACK_MS });
    } catch {
      return; // the socket went away; the next hello resyncs
    }
    if (this.deps.bridge.currentConnection() !== conn) return;
    const tabs = this.record(result);
    const present = new Set(tabs.map((t) => t.id));
    let gone = 0;
    for (const handle of before) {
      const r = this.handles.resolve(handle);
      if (r.kind === "live" && !present.has(r.tabId)) {
        this.tabGone(r.tabId, {});
        gone++;
      }
    }
    this.handles.prune(this.now());
    this.deps.log?.(`extension resync: ${tabs.length} tabs, ${gone} gone`);
  }

  /** A `{event, params}` frame from the extension (already counted by the host). */
  extensionEvent(conn: ExtensionConnection, frame: unknown): void {
    if (this.deps.bridge.currentConnection() !== conn) return; // a replaced socket's late event
    if (isTabCreatedEvent(frame)) {
      const p = frame.params;
      this.handles.mint(p.tabId);
      this.handles.note(p.tabId, { url: p.url });
      if (p.openerTabId === undefined) return;
      const grant = this.applyOpener(p);
      if (!grant) return;
      if (this.newTabsInFlight > 0) this.heldBackGrants.push(grant);
      else this.sendLeaseGranted(grant);
    } else if (isTabRemovedEvent(frame)) {
      const p = frame.params;
      const last: { lastUrl?: string; lastTitle?: string } = {};
      if (p.lastUrl !== undefined) last.lastUrl = p.lastUrl;
      if (p.lastTitle !== undefined) last.lastTitle = p.lastTitle;
      this.tabGone(p.tabId, last);
      this.handles.prune(this.now());
    } else if (isTabReplacedEvent(frame)) {
      const p = frame.params;
      const { retired } = this.handles.replace(p.removedTabId, p.addedTabId, (h) => this.leases.ownerOf(h) !== undefined);
      if (retired) this.notifyGone(retired);
    }
  }

  /**
   * The opener rule (0.3): a tab opened from a leased tab is granted to that tab's holder at once,
   * unless already leased. Returns the grant (for the `leaseGranted` event), or undefined.
   */
  private applyOpener(p: TabCreatedParams): { handle: string; clientId: string; url: string } | undefined {
    if (p.openerTabId === undefined) return undefined;
    const handle = this.handles.handleOf(p.tabId);
    if (!handle || this.leases.ownerOf(handle)) return undefined;
    const openerHandle = this.handles.handleOf(p.openerTabId);
    const owner = openerHandle ? this.leases.ownerOf(openerHandle) : undefined;
    if (!owner) return undefined; // an unleased opener's tab stays unheld
    this.leases.grant(handle, owner.clientId, "opener", this.now());
    return { handle, clientId: owner.clientId, url: p.url };
  }

  private sendLeaseGranted(g: { handle: string; clientId: string; url: string }): void {
    const frame: EventMessage<LeaseGrantedParams> = { event: "leaseGranted", params: { tab: g.handle, reason: "opener", url: g.url } };
    this.deps.sendTo(g.clientId, frame);
  }

  /** Mark a tab's handle gone, drop its lease, tell its holder (unless the holder closed it). */
  private tabGone(tabId: number, last: { lastUrl?: string; lastTitle?: string }): void {
    const handle = this.handles.remove(tabId, last);
    if (!handle) return;
    const owner = this.leases.ownerOf(handle);
    this.leases.release(handle);
    if (owner && this.closing.get(tabId) !== owner.clientId) this.sendGone(owner.clientId, handle);
  }

  /** A handle retired by `replace`: drop its lease and tell the holder. */
  private notifyGone(handle: string): void {
    const owner = this.leases.ownerOf(handle);
    this.leases.release(handle);
    if (owner) this.sendGone(owner.clientId, handle);
  }

  private sendGone(clientId: string, handle: string): void {
    const params: TabGoneParams = { tab: handle };
    const r = this.handles.resolve(handle);
    if (r.kind === "gone") {
      if (r.lastUrl !== undefined) params.lastUrl = r.lastUrl;
      if (r.lastTitle !== undefined) params.lastTitle = r.lastTitle;
    }
    this.deps.sendTo(clientId, { event: "tabGone", params });
  }

  // ------------------------------------------------------------------ client side

  /** A client disconnected (F14): its leases and its hold on (or place in) the lock go at once. */
  clientGone(clientId: string): void {
    this.leases.releaseAll(clientId);
    this.lock.releaseAllOf(clientId);
    this.legacyLogged.delete(clientId);
  }

  status(): { tabs: StatusTab[]; lock: { holder?: string } } {
    const tabs = this.handles.live().map((h) => {
      const row: StatusTab = { tab: h.handle, tabId: h.tabId };
      const owner = this.leases.ownerOf(h.handle);
      if (owner) row.owner = this.name(owner.clientId);
      if (h.url !== undefined) row.url = h.url;
      return row;
    });
    const holder = this.lock.holder();
    return { tabs, lock: holder ? { holder: this.name(holder) } : {} };
  }

  /**
   * Route one client request (not `daemon.*`). Resolves with the result to send, or rejects with a
   * `BridgeError`. `receivedAt` is taken here, synchronously, for the one deadline (#44).
   */
  async request(caller: Caller, method: string, params: Params | undefined, timeoutMs: number | undefined): Promise<unknown> {
    const deadline = this.now() + clampTimeout(timeoutMs);
    this.handles.prune(this.now());
    const cls = classify(method, params);

    if (method === "tabs.claim") return this.claim(caller, params ?? {}, deadline);
    if (method === "tabs.release") return this.release(caller, params ?? {});

    if (!this.deps.bridge.isConnected()) throw this.deps.bridge.notConnectedError();
    const proto = this.isProto();

    if (cls === "free" || cls === "listTabs" || cls === "newTab") {
      // A no-proto extension gets exactly what Step 6 sent it (#42: only tab methods are refused).
      if (!proto) return this.forward(method, params, deadline);
      if (cls === "listTabs") return this.listTabs(without(params, "tab"), deadline);
      if (cls === "newTab") return this.newTab(caller, without(params, "tab"), deadline);
      if (method === "networkRequests") return this.networkRequests(caller, params ?? {}, deadline);
      return this.forward(method, without(params, "tab"), deadline);
    }

    // Tab-carrying (incl. closeTab and an unlisted method with a `tab`).
    if (!proto) throw new BridgeError(ErrorCodes.VERSION, RELOAD_HINT);
    const p = params ?? {};
    if (method === "networkClear" && p.tab === "all") return this.networkClearAll(caller, p, deadline);

    const target = await this.resolveTarget(caller, method, p, deadline);
    this.checkLease(target.handle, caller);

    let release: (() => void) | undefined;
    let tabId = target.tabId;
    if (takesLock(method, p)) {
      if (this.deps.nameOf(caller.clientId) === undefined) {
        throw new BridgeError(ErrorCodes.NOT_CONNECTED, "client disconnected");
      }
      release = await this.lock.acquire(caller.clientId, deadline);
      try {
        // The wait may have been long: the tab may have closed, moved or been claimed meanwhile.
        tabId = this.resolveHandle(target.handle);
        this.checkLease(target.handle, caller);
      } catch (err) {
        release();
        throw err;
      }
    }
    const forwarded = without(p, "tab", ...(LEGACY_ID_METHODS.has(method) ? ["id"] : []));
    forwarded.tabId = tabId;
    if (method === "closeTab") this.closing.set(tabId, caller.clientId);
    try {
      const result = await this.forward(method, forwarded, deadline);
      if (method === "closeTab") {
        if (this.handles.handleOf(tabId) === target.handle) this.handles.remove(tabId, {});
        if (this.handles.resolve(target.handle).kind !== "live") this.leases.release(target.handle);
      }
      return result;
    } finally {
      if (method === "closeTab" && this.closing.get(tabId) === caller.clientId) this.closing.delete(tabId);
      release?.();
    }
  }

  /** Forward to the extension, waiting `deadline − now + 5000` (#44). */
  private forward(method: string, params: Params | undefined, deadline: number): Promise<unknown> {
    const wait = deadline - this.now() + DAEMON_SLACK_MS;
    if (wait <= 0) {
      return Promise.reject(new BridgeError(ErrorCodes.TIMEOUT, `Timed out before calling ${method}`));
    }
    return this.deps.bridge.call(method, params, { timeoutMs: wait });
  }

  // ------------------------------------------------------------------ resolution

  private resolveHandle(handle: string): number {
    const r = this.handles.resolve(handle);
    if (r.kind === "live") return r.tabId;
    if (r.kind === "gone") {
      const data: TabGoneParams = { tab: handle };
      if (r.lastUrl !== undefined) data.lastUrl = r.lastUrl;
      if (r.lastTitle !== undefined) data.lastTitle = r.lastTitle;
      throw new BridgeError(ErrorCodes.TAB_GONE, `tab ${handle} was closed — call listTabs to pick another tab`, data);
    }
    throw new BridgeError(ErrorCodes.TAB_UNKNOWN, `unknown tab handle ${handle} — call listTabs`);
  }

  private checkLease(handle: string, caller: Caller): void {
    const c = this.leases.check(handle, caller.clientId);
    if (c.ok) return;
    const owner = this.name(c.owner);
    throw new BridgeError(
      ErrorCodes.TAB_HELD,
      `tab ${handle} is held by ${JSON.stringify(owner)} since ${hhmmss(c.since)} — use browser_new_tab, or browser_list_tabs to pick a free tab`,
      { owner, since: c.since },
    );
  }

  /** The target of a tab-carrying call: an explicit handle, or (#41/#54) the legacy forms. */
  private async resolveTarget(
    caller: Caller,
    method: string,
    p: Params,
    deadline: number,
  ): Promise<{ handle: string; tabId: number }> {
    const tab = p.tab;
    if (NETWORK_METHODS.has(method)) {
      if (tab === undefined) return this.humanTab(caller, deadline, true);
      if (tab === "active") return this.humanTab(caller, deadline, false);
      if (typeof tab === "number") {
        if (!Number.isInteger(tab)) throw bad(`tab must be a handle, "all" or "active"`);
        return this.legacyId(caller, tab, deadline);
      }
      if (typeof tab !== "string") throw bad(`tab must be a handle, "all" or "active"`);
      return { handle: tab, tabId: this.resolveHandle(tab) };
    }
    if (tab !== undefined) {
      if (typeof tab !== "string") throw bad(`tab must be a tab handle like "T3"`);
      return { handle: tab, tabId: this.resolveHandle(tab) };
    }
    if (LEGACY_ID_METHODS.has(method)) {
      // Never the human's tab here: closing or focusing "whatever is active" is not a Step 6 behaviour.
      if (p.id === undefined) throw bad("tab is required");
      if (typeof p.id !== "number" || !Number.isInteger(p.id)) throw bad("id must be a Chrome tab id (an integer)");
      return this.legacyId(caller, p.id, deadline);
    }
    return this.humanTab(caller, deadline, true);
  }

  private legacyLog(caller: Caller, what: string): void {
    if (this.legacyLogged.has(caller.clientId)) return;
    this.legacyLogged.add(caller.clientId);
    this.deps.log?.(`legacy client ${JSON.stringify(caller.name)}: ${what}`);
  }

  /** The human's tab (#43): the `current: true` tab of a fresh `listTabs`. */
  private async humanTab(caller: Caller | undefined, deadline: number, legacy: boolean): Promise<{ handle: string; tabId: number }> {
    const tabs = this.record(await this.forward("listTabs", undefined, deadline));
    const human = tabs.find((t) => t.current === true);
    if (!human) throw new BridgeError(ErrorCodes.INTERNAL, NO_HUMAN_TAB);
    if (legacy && caller) this.legacyLog(caller, "no tab — resolved to the active tab");
    return { handle: this.handles.mint(human.id), tabId: human.id };
  }

  /** A Step 6 client's Chrome tab id → its handle; refresh once from `listTabs` if unseen. */
  private async legacyId(caller: Caller, tabId: number, deadline: number): Promise<{ handle: string; tabId: number }> {
    let handle = this.handles.handleOf(tabId);
    if (!handle) {
      this.record(await this.forward("listTabs", undefined, deadline));
      handle = this.handles.handleOf(tabId);
    }
    if (!handle) throw new BridgeError(ErrorCodes.TAB_UNKNOWN, `unknown tab id ${tabId} — call listTabs`);
    this.legacyLog(caller, `Chrome tab id — resolved to ${handle}`);
    return { handle, tabId };
  }

  /** Mint and cache every tab of a `listTabs` result; never marks anything gone. */
  private record(result: unknown): ListedTab[] {
    const raw = (result as { tabs?: unknown } | null)?.tabs;
    if (!Array.isArray(raw)) return [];
    const tabs = raw.filter((t): t is ListedTab => typeof t === "object" && t !== null && Number.isInteger((t as ListedTab).id));
    for (const t of tabs) {
      this.handles.mint(t.id);
      this.handles.note(t.id, {
        url: typeof t.url === "string" ? t.url : undefined,
        title: typeof t.title === "string" ? t.title : undefined,
      });
    }
    return tabs;
  }

  // ------------------------------------------------------------------ intercepts

  private async listTabs(params: Params, deadline: number): Promise<unknown> {
    const result = await this.forward("listTabs", params, deadline);
    if (!Array.isArray((result as { tabs?: unknown } | null)?.tabs)) return result;
    const tabs = this.record(result);
    return {
      ...(result as object),
      tabs: tabs.map((t) => {
        const handle = this.handles.mint(t.id);
        const owner = this.leases.ownerOf(handle);
        return owner ? { ...t, tab: handle, owner: this.name(owner.clientId) } : { ...t, tab: handle };
      }),
    };
  }

  private async newTab(caller: Caller, params: Params, deadline: number): Promise<unknown> {
    this.newTabsInFlight++;
    try {
      const result = await this.forward("newTab", params, deadline);
      const id = (result as { id?: unknown } | null)?.id;
      if (typeof id !== "number" || !Number.isInteger(id)) return result;
      const handle = this.handles.mint(id);
      // Overrides an opener grant made for the same tab (F20). A caller gone meanwhile gets nothing.
      if (this.deps.nameOf(caller.clientId) !== undefined) this.leases.grant(handle, caller.clientId, "opened", this.now());
      return { ...(result as object), tab: handle };
    } finally {
      this.newTabsInFlight--;
      if (this.newTabsInFlight === 0) {
        const held = this.heldBackGrants;
        this.heldBackGrants = [];
        for (const g of held) {
          // Sent only if the opener grant still stands: not overridden by a newTab, not released,
          // and its holder still connected (a disconnect already dropped the lease).
          const owner = this.leases.ownerOf(g.handle);
          if (!owner || owner.clientId !== g.clientId || owner.reason !== "opener") continue;
          if (this.deps.nameOf(g.clientId) === undefined) continue;
          this.sendLeaseGranted(g);
        }
      }
    }
  }

  private async networkRequests(caller: Caller, p: Params, deadline: number): Promise<unknown> {
    let forwarded: Params;
    if (p.id !== undefined) forwarded = without(p, "tab"); // a request-id lookup is global
    else if (p.tab === "all") forwarded = { ...without(p, "tab"), scope: "all" };
    else {
      const target = await this.resolveTarget(caller, "networkRequests", p, deadline); // free: no lease check
      forwarded = { ...without(p, "tab"), tabId: target.tabId };
    }
    const result = await this.forward("networkRequests", forwarded, deadline);
    const entries = (result as { entries?: unknown } | null)?.entries;
    if (!Array.isArray(entries)) return result;
    return {
      ...(result as object),
      entries: entries.map((e) => {
        const tabId = (e as { tabId?: unknown } | null)?.tabId;
        if (typeof tabId !== "number" || !Number.isInteger(tabId) || tabId < 0) return e;
        // The live handle, else the newest dead one; a tab id never seen gets no `tab` — a network
        // entry must not mint a live handle for a tab no listTabs or event has shown (verifier V3).
        const handle = this.handles.lastHandleOf(tabId);
        return handle ? { ...(e as object), tab: handle } : e;
      }),
    };
  }

  /**
   * `networkClear {tab:"all"}` (#40): refused while another client holds a tab that has entries. Fails
   * closed (verifier V8): a probe that throws or returns a non-number `total` counts as "has entries".
   */
  private async networkClearAll(caller: Caller, p: Params, deadline: number): Promise<unknown> {
    for (const lease of this.leases.entries()) {
      if (lease.clientId === caller.clientId) continue;
      const r = this.handles.resolve(lease.handle);
      if (r.kind !== "live") continue;
      let hasEntries = true;
      try {
        const res = await this.forward("networkRequests", { tabId: r.tabId, limit: 1 }, deadline);
        const total = (res as { total?: unknown } | null)?.total;
        hasEntries = !(typeof total === "number" && total <= 0);
      } catch {
        // fail closed: unknown counts as "has entries"
      }
      if (hasEntries) this.checkLease(lease.handle, caller);
    }
    return this.forward("networkClear", { ...without(p, "tab"), scope: "all" }, deadline);
  }

  private async claim(caller: Caller, p: Params, deadline: number): Promise<unknown> {
    let handle: string;
    if (p.tab === undefined && p.active === true) {
      if (!this.deps.bridge.isConnected()) throw this.deps.bridge.notConnectedError();
      if (!this.isProto()) throw new BridgeError(ErrorCodes.VERSION, RELOAD_HINT);
      handle = (await this.humanTab(undefined, deadline, false)).handle;
    } else if (typeof p.tab === "string") {
      handle = p.tab;
      this.resolveHandle(handle);
    } else {
      throw bad('tabs.claim needs {tab: "<handle>"} or {active: true}');
    }
    this.checkLease(handle, caller);
    if (!this.leases.ownerOf(handle) && this.deps.nameOf(caller.clientId) !== undefined) {
      this.leases.grant(handle, caller.clientId, "claimed", this.now());
    }
    return { tab: handle };
  }

  private release(caller: Caller, p: Params): unknown {
    if (typeof p.tab !== "string") throw bad('tabs.release needs {tab: "<handle>"}');
    this.resolveHandle(p.tab);
    this.checkLease(p.tab, caller);
    this.leases.release(p.tab);
    return { ok: true };
  }
}
