import type { DownloadChunkResult, DownloadStartResult } from "@bridge/shared";
import { BridgeError, ErrorCodes } from "../errors.js";
import { DEFAULT_CHUNK_BYTES, DownloadStore, bareContentType, suggestedFilename, toBase64 } from "../download.js";
import type { HandlerSafety } from "../safety-call.js";
import { BLOCKED_URL_MESSAGE } from "../safety.js";

const store = new DownloadStore();

/** Step 9: a disarm drops every held download (decisions.md · 2026-10-24 · #137 item 4). */
export function clearDownloads(): number {
  return store.clear();
}

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;

/**
 * Fetch a URL from the service worker with the profile's cookies and hold the bytes for the server
 * to pull. The extension's `<all_urls>` host permission is what makes this work where a page-side
 * `fetch` cannot: no CORS check, and a cross-origin redirect (Blackboard → S3) is simply followed.
 *
 * Never logs the URL or the final URL: both can carry tokens or signatures.
 *
 * Step 9 (#140, Stage 0 F8, F24): the gate is re-checked before the fetch; the final URL (`res.url`) is
 * checked as soon as `fetch` resolves, and a refusal aborts the body read, so the bytes are never kept;
 * a reply the post-check refuses releases the held bytes.
 *
 * Step 11b S3b (#293, #296): while the list is non-empty the call's session rules stop a redirect hop onto a blocked
 * host; `fetch` then rejects, and when the call's own rules blocked a hop (`call.hopBlocked()`, `safety-hop.ts`) the
 * answer is `DOMAIN_BLOCKED` with the block message and no `data`. Only a rejected `fetch` asks: `DOWNLOAD_HTTP`, a
 * body-read error and any other failure keep their answer, with no wait.
 */
export async function downloadStart(p: Record<string, unknown>, call?: HandlerSafety): Promise<DownloadStartResult> {
  const url = typeof p.url === "string" ? p.url : "";
  if (!/^https?:\/\//i.test(url)) throw new BridgeError(ErrorCodes.BAD_PARAMS, "browser_download requires an absolute http(s) URL");
  const timeoutMs = Math.min(Math.max(Number(p.timeoutMs) || DEFAULT_TIMEOUT_MS, 1_000), MAX_TIMEOUT_MS);

  await call?.effect();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  let bytes: Uint8Array;
  let refused: { err: unknown } | undefined;
  let fetched = false;
  try {
    res = await fetch(url, { credentials: "include", redirect: "follow", cache: "no-store", signal: ctrl.signal });
    fetched = true;
    if (call) {
      try {
        await call.checkFinalUrl(res.url);
      } catch (err) {
        refused = { err };
        ctrl.abort(); // never read the body of a refused download
        throw err;
      }
    }
    if (!res.ok) {
      throw new BridgeError(ErrorCodes.DOWNLOAD_HTTP, `HTTP ${res.status} ${res.statusText}`.trim(), {
        status: res.status,
        contentType: bareContentType(res.headers.get("content-type")),
      });
    }
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    if (refused) throw refused.err;
    if (ctrl.signal.aborted) throw new BridgeError(ErrorCodes.TIMEOUT, `Download timed out after ${timeoutMs} ms`);
    if (!fetched && call?.hopBlocked && (await call.hopBlocked())) throw new BridgeError(ErrorCodes.DOMAIN_BLOCKED, BLOCKED_URL_MESSAGE);
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(timer);
  }

  const id = store.put(bytes);
  call?.onRefused(() => store.release(id)); // F24: a refused reply leaves nothing held
  let finalHost = "";
  try {
    finalHost = new URL(res.url).host;
  } catch {
    // opaque or empty final URL
  }
  console.log("[bridge] download held", bytes.length, "bytes");
  return {
    id,
    size: bytes.length,
    status: res.status,
    contentType: bareContentType(res.headers.get("content-type")),
    filename: suggestedFilename(res.headers.get("content-disposition"), res.url),
    redirected: res.redirected,
    finalHost,
  };
}

export async function downloadChunk(p: Record<string, unknown>, _call?: HandlerSafety): Promise<DownloadChunkResult> {
  const bytes = store.chunk(String(p.id ?? ""), Number(p.offset ?? 0), Number(p.length ?? DEFAULT_CHUNK_BYTES));
  return { data: toBase64(bytes) };
}

export async function downloadEnd(p: Record<string, unknown>, _call?: HandlerSafety): Promise<{ released: boolean }> {
  return { released: store.release(String(p.id ?? "")) };
}
