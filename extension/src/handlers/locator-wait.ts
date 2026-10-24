/**
 * `waitFor {locator, state}`'s loop (Step 8 phase doc 0.2; stage0-audit.md F23). Pure: no `chrome.*`;
 * the page call (`attempt`), the re-injection (`reinject`), the clock and the sleep are injected.
 *
 * It runs in the service worker, not the page, because a hidden tab's page timers are throttled
 * (Run 8 BG-4: a text due at 2000 ms was seen at 3746 ms). Polls never overlap: the next one starts
 * `pollMs` after the previous one settles.
 */
import { BridgeError, ErrorCodes } from "../errors.js";

export type LocatorState = "visible" | "hidden";

export interface PollLocatorOptions {
  state: LocatorState;
  timeoutMs: number;
  pollMs?: number;
  /** One `locate` round-trip; resolves when the locator matched exactly one element. */
  attempt: () => Promise<unknown>;
  /** Re-inject the content script (after a navigation). Its failure is swallowed: polling goes on. */
  reinject: () => Promise<unknown>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /**
   * Step 9: the gated call's effect check, run before every poll; its refusal ends the wait at once
   * (decisions.md · 2026-10-24 · #137 item 3). Absent → today's loop.
   */
  check?: () => Promise<void>;
}

export const DEFAULT_POLL_MS = 100;

function codeOf(err: unknown): string | undefined {
  return err instanceof BridgeError ? err.code : undefined;
}

/**
 * Resolves `{ok: true}` when the locator reaches `state`:
 * - `visible`: `attempt` resolves. `LOCATOR_NOT_FOUND` keeps polling; `LOCATOR_AMBIGUOUS` rejects at
 *   once (waiting cannot make it unique).
 * - `hidden`: `attempt` rejects with `LOCATOR_NOT_FOUND` — the only outcome that resolves it. A match
 *   or `LOCATOR_AMBIGUOUS` (the elements are still there) keeps polling.
 * - `REF_STALE` (the content script is gone, or the page call gave no result): re-inject, keep polling.
 * - Any other error rejects at once, unchanged.
 * The deadline (start + `timeoutMs`) is checked after each poll that did not settle, so a poll in
 * flight at the deadline is awaited; a timeout is `TIMEOUT`, carrying (for `visible`) the last
 * `LOCATOR_NOT_FOUND`'s data. The message names no locator text.
 */
export async function pollLocator(opts: PollLocatorOptions): Promise<{ ok: true }> {
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const deadline = opts.now() + opts.timeoutMs;
  let lastNotFoundData: unknown;
  for (;;) {
    if (opts.check) await opts.check(); // outside the try: a refusal is never read as a locator outcome
    try {
      await opts.attempt();
      if (opts.state === "visible") return { ok: true };
    } catch (err) {
      const code = codeOf(err);
      if (code === ErrorCodes.LOCATOR_NOT_FOUND) {
        if (opts.state === "hidden") return { ok: true };
        lastNotFoundData = (err as BridgeError).data;
      } else if (code === ErrorCodes.LOCATOR_AMBIGUOUS) {
        if (opts.state === "visible") throw err;
      } else if (code === ErrorCodes.REF_STALE) {
        try {
          await opts.reinject();
        } catch {
          /* keep polling: the page may still be loading */
        }
      } else {
        throw err;
      }
    }
    if (opts.now() >= deadline) {
      const message = `Timed out after ${opts.timeoutMs} ms waiting for the locator to be ${opts.state}`;
      if (opts.state === "visible" && lastNotFoundData !== undefined) {
        throw new BridgeError(ErrorCodes.TIMEOUT, message, lastNotFoundData);
      }
      throw new BridgeError(ErrorCodes.TIMEOUT, message);
    }
    await opts.sleep(pollMs);
  }
}
