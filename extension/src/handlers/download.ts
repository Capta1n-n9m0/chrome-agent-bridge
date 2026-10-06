import type { DownloadChunkResult, DownloadStartResult } from "@bridge/shared";
import { DEFAULT_CHUNK_BYTES, DownloadStore, bareContentType, suggestedFilename, toBase64 } from "../download.js";

const store = new DownloadStore();

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;

/**
 * Fetch a URL from the service worker with the profile's cookies and hold the bytes for the server
 * to pull. The extension's `<all_urls>` host permission is what makes this work where a page-side
 * `fetch` cannot: no CORS check, and a cross-origin redirect (Blackboard → S3) is simply followed.
 *
 * Never logs the URL or the final URL: both can carry tokens or signatures.
 */
export async function downloadStart(p: Record<string, unknown>): Promise<DownloadStartResult> {
  const url = typeof p.url === "string" ? p.url : "";
  if (!/^https?:\/\//i.test(url)) throw new Error("browser_download requires an absolute http(s) URL");
  const timeoutMs = Math.min(Math.max(Number(p.timeoutMs) || DEFAULT_TIMEOUT_MS, 1_000), MAX_TIMEOUT_MS);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  let bytes: Uint8Array;
  try {
    res = await fetch(url, { credentials: "include", redirect: "follow", cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    if (ctrl.signal.aborted) throw new Error(`Download timed out after ${timeoutMs} ms`);
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(timer);
  }

  const id = store.put(bytes);
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

export async function downloadChunk(p: Record<string, unknown>): Promise<DownloadChunkResult> {
  const bytes = store.chunk(String(p.id ?? ""), Number(p.offset ?? 0), Number(p.length ?? DEFAULT_CHUNK_BYTES));
  return { data: toBase64(bytes) };
}

export async function downloadEnd(p: Record<string, unknown>): Promise<{ released: boolean }> {
  return { released: store.release(String(p.id ?? "")) };
}
