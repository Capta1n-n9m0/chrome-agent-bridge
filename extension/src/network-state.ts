import { NetworkLog } from "./network-log.js";
import type { NetworkLogBlob } from "./network-log.js";
import { browserApi } from "./browser-api.js";

/**
 * The service-worker-side state for network capture: the in-memory {@link NetworkLog}, the
 * rehydrate promise handlers await, and the debounced write-through to `chrome.storage.session`.
 *
 * Two MV3 constraints shape this file:
 *  - the SW is culled while idle, so the log is mirrored into `chrome.storage.session` (10 MB,
 *    in memory, cleared when Chrome exits) and merged back in on the next start;
 *  - a module service worker cannot use top-level `await`, so the rehydrate is a *promise*
 *    (`ready`) that runs alongside the listeners rather than blocking them. Live entries win an
 *    id collision — see `NetworkLog.merge`.
 *
 * Privacy: nothing here ever logs a URL, header value or body (plan §0.4) — counts only.
 */

const KEY_PREFIX = "netlog:";
const META_KEY = "netlog:meta";
const DEBOUNCE_MS = 250;
const MAX_WAIT_MS = 1000;
const DEFAULT_PORT = 9234;

export const log = new NetworkLog({ now: Date.now });

/** The bridge's WebSocket port, so `isOwnTraffic` can drop our own loopback traffic. */
let wsPort = DEFAULT_PORT;

export function ownPort(): number {
  return wsPort;
}

export function setOwnPort(port: unknown): void {
  const n = Number(port);
  if (Number.isFinite(n) && n > 0) wsPort = n;
}

function tabsFromKeys(all: Record<string, unknown>): NetworkLogBlob | null {
  const meta = all[META_KEY] as NetworkLogBlob["meta"] | undefined;
  if (!meta || meta.v !== 1) return null;
  const tabs: NetworkLogBlob["tabs"] = {};
  for (const [key, value] of Object.entries(all)) {
    if (key === META_KEY || !key.startsWith(KEY_PREFIX)) continue;
    if (Array.isArray(value)) tabs[key.slice(KEY_PREFIX.length)] = value;
  }
  return { meta, tabs };
}

async function rehydrate(): Promise<void> {
  const session = browserApi.storage.session;
  if (!session) return; // Older Safari: keep the bounded log in memory for this background-page run.
  const all = await session.get(null);
  const blob = tabsFromKeys(all as Record<string, unknown>);
  if (!blob) return;
  log.merge(blob);
  const n = Object.values(blob.tabs).reduce((sum, list) => sum + list.length, 0);
  console.log(`[bridge] network: rehydrated ${n} entries`);
}

/** Resolved once the stored log has been folded in. Handlers `await` this before querying. */
export const ready: Promise<void> = rehydrate().catch(() => {});

let timer: ReturnType<typeof setTimeout> | undefined;
let firstScheduledAt = 0;
let flushing: Promise<void> | undefined;

/** Trailing 250 ms debounce with a 1 s max wait, so a page-load storm writes a handful of times. */
export function scheduleFlush(): void {
  const now = Date.now();
  if (timer === undefined) firstScheduledAt = now;
  else if (now - firstScheduledAt >= MAX_WAIT_MS) return; // let the pending timer fire
  else clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    void flushNow();
  }, DEBOUNCE_MS);
}

/** Write every dirty tab (and the meta record) through to session storage, right now. */
export function flushNow(): Promise<void> {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  const run = (flushing ?? Promise.resolve()).then(doFlush, doFlush);
  flushing = run;
  return run;
}

async function writeTabs(dirty: Set<number>): Promise<void> {
  const session = browserApi.storage.session;
  if (!session) return;
  const set: Record<string, unknown> = { [META_KEY]: { v: 1, since: log.recordingSince } };
  const remove: string[] = [];
  for (const tabId of dirty) {
    const entries = log.entriesFor(tabId);
    if (entries) set[KEY_PREFIX + tabId] = entries;
    else remove.push(KEY_PREFIX + tabId);
  }
  if (remove.length > 0) await session.remove(remove);
  await session.set(set);
}

async function doFlush(): Promise<void> {
  const dirty = log.takeDirty();
  if (dirty.size === 0) return;
  try {
    await writeTabs(dirty);
  } catch {
    // Almost certainly the 10 MB quota. Halve the log and try once more; counts only, no URLs.
    const dropped = log.evictOldest(0.5);
    console.warn(`[bridge] network: session storage write failed, evicted ${dropped} entries`);
    // Eviction dirties more tabs than we started with — write those too, or storage keeps rows
    // the memory log no longer has.
    for (const tabId of log.takeDirty()) dirty.add(tabId);
    try {
      await writeTabs(dirty);
    } catch {
      console.warn("[bridge] network: session storage write failed again, keeping memory only");
    }
  }
}
