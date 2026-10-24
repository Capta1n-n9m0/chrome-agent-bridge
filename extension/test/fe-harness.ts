/**
 * Stage FE's handler harness (Step 8; stage0-audit.md F19; exit check FE.2). It drives the real
 * `click`/`type`/`pressKey` handlers of `extension/src/handlers/actions.ts` with `inject.js` and
 * `tabs.js` mocked (the test file declares the `vi.mock` calls and hands their fns here) and a stub
 * `chrome.debugger`, and writes every call into ONE ordered log: `pageTab`, `ensureContent`, each
 * page call by its `__agentBridge` method name, `attach`, each `sendCommand`, `detach`.
 *
 * `extension/test/fixtures/fe-cdp-baseline.json` was recorded with this harness on the pre-FE code
 * (base commit in the fixture) and is never regenerated.
 */
import { vi } from "vitest";
import { BridgeError } from "../src/errors.js";

export type LogEntry =
  | { op: "pageTab"; method: string }
  | { op: "ensureContent"; tabId: number }
  | { op: "page"; name: string; tabId: number; args: unknown[] }
  | { op: "attach"; target: { tabId: number }; version: string }
  | { op: "sendCommand"; target: { tabId: number }; method: string; params: unknown }
  | { op: "detach"; target: { tabId: number } };

export interface HarnessOptions {
  /** Page calls (by `__agentBridge` method name) that throw this error instead of answering. */
  pageThrows?: Record<string, Error>;
  /** `sendCommand` throws this error for every method this predicate accepts. */
  sendThrows?: { when: (method: string, params: unknown, n: number) => boolean; error: Error };
}

/** The `__agentBridge` method an injected page function calls, from its source text. */
export function pageFnName(fn: unknown): string {
  const m = /__agentBridge!?\.(\w+)/.exec(String(fn));
  return m ? m[1] : "<inline>";
}

const PAGE_ANSWERS: Record<string, unknown> = {
  centerForInput: { x: 10, y: 20 },
  focusForTyping: { ok: true },
  click: { ok: true },
  type: { ok: true },
};

/**
 * Wires the mocks: `pageTab` → `{id: 7}`, `ensureContent` a no-op, `callInPage` recorded and
 * answered from `PAGE_ANSWERS`, and a global `chrome.debugger` stub. Returns the shared log.
 * JSON round-trips each entry, which is how the fixture stores it (undefined members drop out).
 */
export function installHarness(
  mocks: { pageTab: ReturnType<typeof vi.fn>; ensureContent: ReturnType<typeof vi.fn>; callInPage: ReturnType<typeof vi.fn> },
  opts: HarnessOptions = {},
): LogEntry[] {
  const log: LogEntry[] = [];
  const push = (e: LogEntry) => log.push(JSON.parse(JSON.stringify(e)) as LogEntry);

  mocks.pageTab.mockImplementation(async (_p: unknown, method: string) => {
    push({ op: "pageTab", method });
    return { id: 7 };
  });
  mocks.ensureContent.mockImplementation(async (tabId: number) => {
    push({ op: "ensureContent", tabId });
  });
  mocks.callInPage.mockImplementation(async (tabId: number, fn: unknown, args: unknown[] = []) => {
    const name = pageFnName(fn);
    push({ op: "page", name, tabId, args });
    const err = opts.pageThrows?.[name];
    if (err) throw err;
    return PAGE_ANSWERS[name] ?? { ok: true };
  });

  let sent = 0;
  vi.stubGlobal("chrome", {
    debugger: {
      attach: vi.fn(async (target: { tabId: number }, version: string) => {
        push({ op: "attach", target, version });
      }),
      detach: vi.fn(async (target: { tabId: number }) => {
        push({ op: "detach", target });
      }),
      sendCommand: vi.fn(async (target: { tabId: number }, method: string, params: unknown) => {
        push({ op: "sendCommand", target, method, params });
        const n = sent++;
        if (opts.sendThrows?.when(method, params, n)) throw opts.sendThrows.error;
        return {};
      }),
    },
  });
  return log;
}

/** A recorded case as the fixture stores it. */
export interface RecordedCase {
  name: string;
  handler: "click" | "type" | "pressKey";
  params: Record<string, unknown>;
  log: LogEntry[];
  result?: unknown;
  error?: { name: string; code?: string; message: string };
}

export interface CaseDef {
  name: string;
  handler: "click" | "type" | "pressKey";
  params: Record<string, unknown>;
  opts: () => HarnessOptions;
}

/** A content-action failure, as `unwrapResult` raises one for a stale ref. */
export const staleRef = () => new BridgeError("REF_STALE", "Element ref e1 is stale");
/** Chrome's wording when the banner's Cancel ends the session mid-command (→ DEBUGGER_CANCELLED). */
export const detachedMidCommand = () => new Error("Detached while handling command.");

/** The cases the baseline fixture records (FE.2 stricter: click; type "a.\n" + submit; pressKey Tab). */
export const BASELINE_CASES: CaseDef[] = [
  { name: "click trusted", handler: "click", params: { tabId: 7, ref: "e1", trusted: true }, opts: () => ({}) },
  {
    name: "type trusted submit",
    handler: "type",
    params: { tabId: 7, ref: "e2", text: "a.\n", submit: true, trusted: true },
    opts: () => ({}),
  },
  { name: "pressKey trusted Tab", handler: "pressKey", params: { tabId: 7, key: "Tab", trusted: true }, opts: () => ({}) },
  {
    name: "click escalation",
    handler: "click",
    params: { tabId: 7, ref: "e1" },
    opts: () => ({ pageThrows: { click: staleRef() } }),
  },
  {
    name: "type escalation",
    handler: "type",
    params: { tabId: 7, ref: "e2", text: "ok" },
    opts: () => ({ pageThrows: { type: staleRef() } }),
  },
  {
    name: "click trusted, first Input.* throws",
    handler: "click",
    params: { tabId: 7, ref: "e1", trusted: true },
    opts: () => ({ sendThrows: { when: (m) => m.startsWith("Input."), error: detachedMidCommand() } }),
  },
];

export function errorShape(e: unknown): { name: string; code?: string; message: string } {
  const err = e as { name?: string; code?: unknown; message?: string };
  const out: { name: string; code?: string; message: string } = { name: String(err?.name), message: String(err?.message) };
  if (typeof err?.code === "string") out.code = err.code;
  return out;
}
