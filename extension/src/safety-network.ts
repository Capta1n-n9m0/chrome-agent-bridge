/**
 * Step 9 (Phase E): the network log's ingest filter (phase doc 0.3/0.4's F9 note; decisions.md · 2026-10-24
 * · In-flight work at disarm and on a newly blocked tab (#137) item 6). Pure: the log, the tab URL lookup
 * and the state view are injected (`extension/test/safety-network.test.ts`).
 *
 * - While disarmed every event is dropped, so traffic of the disarmed period never reaches an agent after
 *   re-arming; a request whose event was dropped stays dropped (its later events too), so it is never
 *   rebuilt from a later event. Entries recorded while armed stay.
 * - While armed, an event whose `url`, `redirectUrl` or `initiator` is blocked, or whose tab's top-level URL
 *   is blocked (or this extension's page), is dropped and the request's entry, if one was recorded, is
 *   discarded (a redirect onto a blocked host).
 * - Before the stored state is known (a worker start), events are held in a bounded buffer and decided once
 *   it is — never recorded blind. When the buffer is full the oldest event goes, and its request with it.
 *
 * The query side is `keepInQuery`, applied by the network handler. Never logs (phase doc 0.7).
 */
import { dropAtIngest } from "./safety.js";
import type { SafetyView } from "./safety-state.js";
import type { WebRequestDetails, WebRequestEvent } from "./network-log.js";

export interface IngestGateDeps {
  /** `NetworkLog.ingest` (plus the flush schedule). */
  ingest(event: WebRequestEvent, d: WebRequestDetails): void;
  /** `NetworkLog.discard`. */
  discard(requestId: string): void;
  /** The tab's last known top-level URL. */
  tabUrl(tabId: number): string | undefined;
  /** The memory copy's view, synchronous; null while the state is not yet known. */
  view(): SafetyView | null;
  /** Events held before the state is known (default 2 000). */
  maxBuffer?: number;
  /** Dropped request ids remembered (default 5 000). */
  maxDropped?: number;
}

export class NetworkIngestGate {
  private readonly held: Array<[WebRequestEvent, WebRequestDetails]> = [];
  private readonly dropped = new Set<string>();
  private readonly maxBuffer: number;
  private readonly maxDropped: number;

  constructor(private readonly deps: IngestGateDeps) {
    this.maxBuffer = deps.maxBuffer ?? 2000;
    this.maxDropped = deps.maxDropped ?? 5000;
  }

  get buffered(): number {
    return this.held.length;
  }

  /** One `chrome.webRequest` event (the bridge's own traffic already excluded). */
  offer(event: WebRequestEvent, d: WebRequestDetails): void {
    const view = this.deps.view();
    if (view === null) {
      this.held.push([event, d]);
      while (this.held.length > this.maxBuffer) {
        const [, old] = this.held.shift()!;
        if (old && typeof old.requestId === "string") this.remember(old.requestId);
      }
      return;
    }
    this.flushWith(view);
    this.decide(event, d, view);
  }

  /** Decide the held events once the state is known (no-op while it is not). */
  flush(): void {
    const view = this.deps.view();
    if (view !== null) this.flushWith(view);
  }

  private flushWith(view: SafetyView): void {
    while (this.held.length > 0) {
      const [e, d] = this.held.shift()!;
      this.decide(e, d, view);
    }
  }

  private decide(event: WebRequestEvent, d: WebRequestDetails, view: SafetyView): void {
    if (!d || typeof d.requestId !== "string") return;
    if (this.dropped.has(d.requestId)) return;
    if (!view.switches.armed) {
      this.remember(d.requestId);
      return;
    }
    const tabUrl = typeof d.tabId === "number" && d.tabId >= 0 ? this.deps.tabUrl(d.tabId) : undefined;
    if (dropAtIngest({ url: d.url, redirectUrl: d.redirectUrl, initiator: d.initiator }, tabUrl, view.switches, view.ctx)) {
      this.remember(d.requestId);
      this.deps.discard(d.requestId);
      return;
    }
    this.deps.ingest(event, d);
  }

  private remember(requestId: string): void {
    this.dropped.add(requestId);
    while (this.dropped.size > this.maxDropped) {
      const first = this.dropped.values().next().value as string;
      this.dropped.delete(first);
    }
  }
}
