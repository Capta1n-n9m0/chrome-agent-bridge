import { pageTab, targetTab } from "../tabs.js";
import { BridgeError, ErrorCodes } from "../errors.js";
import { callInPage, ensureContent } from "../inject.js";
import { log, ready } from "../network-state.js";
import { isLocator } from "@bridge/shared";
import { pollLocator, type LocatorState } from "./locator-wait.js";
import { locateInPage } from "./target.js";
import type { HandlerSafety } from "../safety-call.js";

/** Quiet period that counts as idle when the caller does not say. */
const DEFAULT_IDLE_MS = 500;
const MIN_IDLE_MS = 100;
const MAX_IDLE_MS = 10_000;
/** The same 10 s ceiling the text form uses. */
const WAIT_CEILING_MS = 10_000;
const POLL_MS = 100;
/** `waitFor {locator}`: default and ceiling of `timeoutMs` (Step 8 phase doc 0.2). */
const LOCATOR_DEFAULT_TIMEOUT_MS = 10_000;
const LOCATOR_MAX_TIMEOUT_MS = 60_000;

const present = (v: unknown): boolean => v !== undefined && v !== null;

export async function waitFor(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true; idleAfterMs?: number }> {
  if (present(p.locator)) return waitForLocator(p, call);
  if (p.networkIdle === true) return waitForNetworkIdle(p, call);
  if (typeof p.seconds === "number") {
    const secs = Math.min(Math.max(p.seconds, 0), 60);
    if (!call) {
      await new Promise((r) => setTimeout(r, secs * 1000));
      return { ok: true };
    }
    // Step 9 (phase doc 0.3's F5 note, the build choice): the sleep is cut into 100 ms ticks, each
    // re-checking the gate, so a disarm ends the wait within one tick.
    const deadline = Date.now() + secs * 1000;
    for (;;) {
      await call.effect();
      const left = deadline - Date.now();
      if (left <= 0) return { ok: true };
      await new Promise((r) => setTimeout(r, Math.min(POLL_MS, left)));
    }
  }
  const needle = String(p.text ?? "");
  if (!needle) throw new BridgeError(ErrorCodes.BAD_PARAMS, "browser_wait_for requires one of text, seconds or networkIdle");
  const tab = await pageTab(p, "waitFor");
  // Step 9: checked before the page call; the page-side poll then ends on its own and the post-check
  // replaces its reply (phase doc 0.3's F5 note).
  await call?.effect();
  // Poll the page (in its own context) for the text, up to 10s. The func is async;
  // chrome.scripting.executeScript awaits its returned promise. It always resolves to a
  // defined object so callInPage's "no result" guard never trips.
  const res = await callInPage<{ found: boolean }>(
    tab.id!,
    async (text) => {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if ((document.body?.innerText ?? "").includes(text as string)) return { found: true };
        await new Promise((r) => setTimeout(r, 200));
      }
      return { found: false };
    },
    [needle],
  );
  if (!res.found) throw new BridgeError(ErrorCodes.TIMEOUT, `Timed out waiting for text: "${needle}"`);
  return { ok: true };
}

/** The locator arm's params, checked before any page call. */
export function locatorWaitParams(p: Record<string, unknown>): { state: LocatorState; timeoutMs: number } {
  const bad = (msg: string) => new BridgeError(ErrorCodes.BAD_PARAMS, msg);
  if (present(p.text) || present(p.seconds) || (present(p.networkIdle) && p.networkIdle !== false)) {
    throw bad("browser_wait_for takes a locator alone — not with text, seconds or networkIdle");
  }
  if (!isLocator(p.locator)) {
    throw bad("locator must be one of {role, name?, exact?, nth?}, {text, exact?, nth?} or {css, nth?}");
  }
  let state: LocatorState = "visible";
  if (p.state !== undefined) {
    if (p.state !== "visible" && p.state !== "hidden") throw bad('state must be "visible" or "hidden"');
    state = p.state;
  }
  let timeoutMs = LOCATOR_DEFAULT_TIMEOUT_MS;
  if (present(p.timeoutMs)) {
    if (typeof p.timeoutMs !== "number" || !Number.isFinite(p.timeoutMs)) throw bad("timeoutMs must be a finite number");
    timeoutMs = Math.min(Math.max(Math.round(p.timeoutMs), 0), LOCATOR_MAX_TIMEOUT_MS);
  }
  return { state, timeoutMs };
}

/**
 * `waitFor {locator, state}`: `locate` every 100 ms from the service worker (`pollLocator`), up to
 * `timeoutMs`. The text arm above keeps its page-side 200 ms poll (stage0-audit.md F22).
 */
async function waitForLocator(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true }> {
  const { state, timeoutMs } = locatorWaitParams(p);
  const tab = await pageTab(p, "waitFor");
  const tabId = tab.id!;
  await call?.effect();
  await ensureContent(tabId);
  return pollLocator({
    state,
    timeoutMs,
    attempt: () => locateInPage(tabId, p.locator).catch(frameTeardownAsStale),
    reinject: () => ensureContent(tabId),
    now: Date.now,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    // Step 9: the gate re-checked every tick (#137 item 3).
    ...(call ? { check: () => call.effect() } : {}),
  });
}

/**
 * Chrome's transient frame-teardown rejections of `executeScript` while the tab navigates, which
 * `classifyInjectError` maps to INTERNAL. From reading the code, not measured live (S2-verifier
 * finding 2; an S6 E2E row navigates during the poll). "No frame with id" is included as plausible
 * for the same race (a frame id gone between lookup and injection); it is not seen in a log either.
 */
const FRAME_TEARDOWN = [/Frame with ID \d+ (was removed|is showing error page)/i, /No frame with id/i];

/**
 * The locator wait's attempt wrapper: a frame-teardown INTERNAL becomes REF_STALE, so `pollLocator`
 * re-injects and keeps polling; every other error passes through unchanged (other INTERNALs still
 * reject at once). The new error carries no Chrome text (it can hold a URL).
 */
export function frameTeardownAsStale(err: unknown): never {
  if (err instanceof BridgeError && err.code === ErrorCodes.INTERNAL && FRAME_TEARDOWN.some((r) => r.test(err.message))) {
    throw new BridgeError(ErrorCodes.REF_STALE, "the frame was replaced during the wait (navigation)");
  }
  throw err;
}

/**
 * Activity-based idle: no `chrome.webRequest` event for the active tab in the last `idleMs`.
 * Deliberately *not* pending-based — a long poll or EventSource stays pending for its whole life
 * and would hang a Playwright-style `networkidle` forever (plan §0.6).
 *
 * A tab the log has seen no activity for at all reports `lastActivityAt === 0` and is therefore
 * idle at once. That is also what happens right after a service-worker restart, since
 * `lastActivity` is in-memory only and is not part of the serialised `storage.session` blob.
 */
async function waitForNetworkIdle(p: Record<string, unknown>, call?: HandlerSafety): Promise<{ ok: true; idleAfterMs: number }> {
  await ready;
  const requested = Number(p.idleMs ?? DEFAULT_IDLE_MS);
  const idleMs = Number.isFinite(requested)
    ? Math.min(Math.max(requested, MIN_IDLE_MS), MAX_IDLE_MS)
    : DEFAULT_IDLE_MS;
  const tab = await targetTab(p, "waitFor");
  const startedAt = Date.now();
  const deadline = startedAt + WAIT_CEILING_MS;
  for (;;) {
    await call?.effect(); // Step 9: the gate re-checked every tick (#137 item 3)
    const last = log.lastActivityAt(tab.id!);
    const quietFor = last === 0 ? Infinity : Date.now() - last;
    if (quietFor >= idleMs) return { ok: true, idleAfterMs: Date.now() - startedAt };
    if (Date.now() >= deadline) {
      throw new BridgeError(ErrorCodes.TIMEOUT, `Timed out waiting for network idle: no ${idleMs}ms quiet period in 10s`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
