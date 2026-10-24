// Step 8 S3 — the typed `Tab` (phase doc 0.4): one daemon handle ("T3") and the calls that act on it.
// Every method sends the method's own params with the routing key `tab` beside them; the daemon turns
// the handle into a numeric `tabId`. A `Tab` from before a 4002 reconnect is void (decision #79).
//
// No runtime import of client.ts: the client hands each Tab a small `TabHost`.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BridgeError,
  ErrorCodes,
  type EvalEnvelope,
  type LocateResult,
  type Locator,
  type NetworkEntry,
  type ScreenshotMode,
  type SnapshotResult,
  type WaitForParams,
} from "@bridge/shared";
import { downloadToFile, type DownloadOutcome } from "./download.js";
import { normalizeTarget, requireLocator, type Target } from "./locator.js";
import { TRUSTED_INPUT_POLICY, type TrustedInputPolicy } from "./policy.js";

/** What a `Tab` needs from its client. Package-internal. */
export interface TabHost {
  call(method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }): Promise<unknown>;
  /** The client's connection generation: bumped by every 4002 reconnect. */
  generation(): number;
}

/** The extension's own ceiling for `waitFor {text}` / `{networkIdle}`, and the locator arm's default. */
export const WAIT_DEFAULT_MS = 10_000;
/** How much longer than the wait itself the call may take (stage0-audit F22). */
export const WAIT_CALL_SLACK_MS = 5_000;
/** `evaluate`'s page-side default, as the MCP's `browser_evaluate`. */
export const EVALUATE_DEFAULT_MS = 10_000;
/** The call outlives the page-side timeout by this, so the extension reports its own timeout first. */
export const EVALUATE_CALL_SLACK_MS = 5_000;

export interface ScreenshotOptions {
  /** The whole page (CDP), not just the viewport. */
  fullPage?: boolean;
  /** `"switch"` (default) brings the tab to the front briefly; `"cdp"` needs it in front already. */
  mode?: ScreenshotMode;
  /** Write the PNG here (parent directories are created) and resolve with this path. */
  path?: string;
}

export interface TrustedOption {
  /**
   * Real CDP input through the debugger (shows Chrome's debugging banner). Under the SDK's policy
   * (decision #89, outcome B) the tab is focused first — it comes to the front of its window, the
   * window is focused, and it stays there.
   */
  trusted?: boolean;
}

export interface NetworkListOptions {
  filter?: string;
  types?: string[];
  failedOnly?: boolean;
  limit?: number;
  includeHeaders?: boolean;
}

export interface ScrollOptions {
  /** Scroll this element into view (`direction` is then ignored). */
  target?: Target;
  /** `"down"` (default) or `"up"`, by about 90 % of a viewport. No horizontal scroll exists. */
  direction?: "up" | "down";
}

export interface DownloadOptions {
  overwrite?: boolean;
  timeoutMs?: number;
}

/** `obj` without its `undefined` values. */
function defined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

function decodePng(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  return Buffer.from(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, "base64");
}

/** The call timeout for a `waitFor`: the wait's own bound plus `WAIT_CALL_SLACK_MS`. */
export function waitForCallTimeoutMs(p: WaitForParams): number {
  if ("locator" in p) return (p.timeoutMs ?? WAIT_DEFAULT_MS) + WAIT_CALL_SLACK_MS;
  if ("seconds" in p) return p.seconds * 1000 + WAIT_CALL_SLACK_MS;
  return WAIT_DEFAULT_MS + WAIT_CALL_SLACK_MS;
}

export class Tab {
  /** The daemon's handle for this tab, e.g. `"T3"`. */
  readonly handle: string;
  readonly #host: TabHost;
  readonly #generation: number;
  readonly #policy: TrustedInputPolicy;

  /**
   * Internal: get a `Tab` from `BridgeClient.newTab()`, `claim()` or `tab()`. `generation` is the
   * client's connection generation when the handle was obtained; `policy` exists for tests.
   */
  constructor(host: TabHost, handle: string, generation: number, policy: TrustedInputPolicy = TRUSTED_INPUT_POLICY) {
    this.handle = handle;
    this.#host = host;
    this.#generation = generation;
    this.#policy = policy;
  }

  /** `TAB_UNKNOWN` (no call) when the daemon that minted this handle has since been replaced. */
  #guard(): void {
    if (this.#host.generation() !== this.#generation) {
      throw new BridgeError(
        ErrorCodes.TAB_UNKNOWN,
        `tab ${this.handle} is from before the bridge daemon restarted (close 4002) — call tabs() or claim() for a new Tab`,
      );
    }
  }

  /**
   * Sends `method` with `{...params, tab}` (undefined values dropped), after the stale guard. `tab`
   * goes last so a caller's own `tab` key (untyped JS, a cast) cannot reroute the call.
   */
  #send(method: string, params: Record<string, unknown> = {}, timeoutMs?: number): Promise<unknown> {
    this.#guard();
    const options = timeoutMs === undefined ? undefined : { timeoutMs };
    return this.#host.call(method, defined({ ...params, tab: this.handle }), options);
  }

  async #trusted(method: string, params: Record<string, unknown>, trusted: boolean | undefined): Promise<void> {
    this.#guard();
    if (trusted === true && this.#policy === "focusFirst") await this.#send("focusTab");
    await this.#send(method, { ...params, trusted });
  }

  async navigate(url: string): Promise<void> {
    await this.#send("navigate", { url });
  }

  async back(): Promise<void> {
    await this.#send("back");
  }

  async forward(): Promise<void> {
    await this.#send("forward");
  }

  /** The interactive elements with their refs (`SnapshotResult`); `formatSnapshot` renders it. */
  async snapshot(): Promise<SnapshotResult> {
    return (await this.#send("snapshot")) as SnapshotResult;
  }

  /**
   * A PNG of the viewport (or the whole page with `fullPage`). Resolves with the bytes, or, given
   * `path`, writes them there and resolves with the path. The default mode switches to the tab for
   * about 1.5 s and back; `mode: "cdp"` refuses a tab that is not in front (`OFFSCREEN`).
   */
  screenshot(options: ScreenshotOptions & { path: string }): Promise<string>;
  screenshot(options?: Omit<ScreenshotOptions, "path">): Promise<Buffer>;
  async screenshot(options: ScreenshotOptions = {}): Promise<Buffer | string> {
    const { dataUrl } = (await this.#send("screenshot", { fullPage: options.fullPage, mode: options.mode })) as {
      dataUrl: string;
    };
    const png = decodePng(dataUrl);
    if (options.path === undefined) return png;
    await mkdir(path.dirname(options.path), { recursive: true });
    await writeFile(options.path, png);
    return options.path;
  }

  async click(target: Target, options: TrustedOption = {}): Promise<void> {
    await this.#trusted("click", normalizeTarget(target), options.trusted);
  }

  async type(target: Target, text: string, options: TrustedOption & { submit?: boolean } = {}): Promise<void> {
    await this.#trusted("type", { ...normalizeTarget(target), text, submit: options.submit }, options.trusted);
  }

  /** Presses `key` on the focused element of the page. */
  async pressKey(key: string, options: TrustedOption = {}): Promise<void> {
    await this.#trusted("pressKey", { key }, options.trusted);
  }

  async hover(target: Target): Promise<void> {
    await this.#send("hover", normalizeTarget(target));
  }

  /**
   * Scrolls the page by about 90 % of a viewport, down (default) or `"up"`. Only these two directions
   * exist: the extension has no horizontal scroll, so any other value is `BAD_PARAMS` with no call.
   * Given a `target`, the extension scrolls that element into view instead and `direction` is ignored.
   */
  async scroll(options: ScrollOptions = {}): Promise<void> {
    const direction: unknown = options.direction;
    if (direction !== undefined && direction !== "up" && direction !== "down") {
      throw new BridgeError(
        ErrorCodes.BAD_PARAMS,
        `scroll: direction must be "up" or "down" (got ${JSON.stringify(direction)}) — there is no horizontal scroll`,
      );
    }
    const where = options.target === undefined ? {} : normalizeTarget(options.target);
    await this.#send("scroll", { ...where, direction: options.direction });
  }

  async selectOption(target: Target, values: string[]): Promise<void> {
    await this.#send("selectOption", { ...normalizeTarget(target), values });
  }

  /** The one element `locator` matches, as `{ref, role, name}`; `LOCATOR_NOT_FOUND` / `_AMBIGUOUS` else. */
  async locate(locator: Locator): Promise<LocateResult> {
    return (await this.#send("locate", { locator: requireLocator(locator, "locate") })) as LocateResult;
  }

  /**
   * Waits for text, a locator (`state: "hidden"` waits for it to go), network idle, or a number of
   * seconds. The call itself may take `WAIT_CALL_SLACK_MS` longer than the wait.
   *
   * The extension clamps silently, and the SDK does not re-check these:
   * - `{seconds}`: at most 60 (`extension/src/handlers/wait.ts`). A non-finite or negative `seconds`
   *   is `BAD_PARAMS` here, with no call.
   * - `{text}`: the extension gives up after 10 s (`TIMEOUT`); there is no timeout parameter.
   * - `{locator, timeoutMs}`: default 10 000, ceiling 60 000 (a larger value waits 60 s).
   * - `{networkIdle, idleMs}`: `idleMs` is clamped to [100, 10 000] (default 500), and the whole wait
   *   gives up after 10 s.
   */
  async waitFor(p: WaitForParams): Promise<void> {
    if ("locator" in p) requireLocator(p.locator, "waitFor");
    if ("seconds" in p && p.seconds !== undefined && !(Number.isFinite(p.seconds) && p.seconds >= 0)) {
      throw new BridgeError(
        ErrorCodes.BAD_PARAMS,
        `waitFor: seconds must be a finite number ≥ 0 (got ${String(p.seconds)}); the extension waits at most 60`,
      );
    }
    await this.#send("waitFor", { ...p }, waitForCallTimeoutMs(p));
  }

  /**
   * Runs `expression` in the page and resolves with its value when the value is plain JSON
   * (`EvalEnvelope.value`); `undefined` for any other kind (a DOM node, a function, `undefined`, …).
   * For an element use `evaluateRef`. A page exception rejects with `PAGE_ERROR`. `timeoutMs`
   * (default 10 000) is clamped by the extension to [100, 60 000] (`extension/src/handlers/evaluate.ts`).
   */
  async evaluate<T = unknown>(expression: string, options: { timeoutMs?: number } = {}): Promise<T> {
    const t = options.timeoutMs ?? EVALUATE_DEFAULT_MS;
    const envelope = (await this.#send("evaluate", { expression, timeoutMs: t }, t + EVALUATE_CALL_SLACK_MS)) as EvalEnvelope;
    return envelope.value as T;
  }

  /** A ref (for click/type/…) to the `Element` that `expression` evaluates to; `BAD_PARAMS` otherwise. */
  async evaluateRef(expression: string): Promise<string> {
    const envelope = (await this.#send(
      "evaluate",
      { expression, timeoutMs: EVALUATE_DEFAULT_MS, asRef: true },
      EVALUATE_DEFAULT_MS + EVALUATE_CALL_SLACK_MS,
    )) as EvalEnvelope;
    if (typeof envelope.ref !== "string") {
      if (envelope.kind === "node") {
        throw new BridgeError(
          ErrorCodes.BAD_PARAMS,
          "evaluateRef: the extension did not return a ref for the node — a loaded extension older than " +
            "Step 8 S2 ignores asRef and does this; reload the extension",
        );
      }
      throw new BridgeError(
        ErrorCodes.BAD_PARAMS,
        `evaluateRef: the value is not an Element (kind "${envelope.kind}") — no ref to return`,
      );
    }
    return envelope.ref;
  }

  /**
   * This tab's recorded network requests (newest last), or with `{id}` the one request by id from any
   * tab (sent without `tab`: an id lookup is global).
   */
  async network(options: NetworkListOptions | { id: string } = {}): Promise<NetworkEntry[]> {
    let result: { entries: NetworkEntry[] };
    if ("id" in options && options.id !== undefined) {
      this.#guard();
      result = (await this.#host.call("networkRequests", { id: options.id })) as { entries: NetworkEntry[] };
    } else {
      result = (await this.#send("networkRequests", { ...options })) as { entries: NetworkEntry[] };
    }
    return result.entries;
  }

  /** Forgets this tab's recorded requests; resolves with how many were dropped. */
  async networkClear(): Promise<number> {
    return ((await this.#send("networkClear")) as { cleared: number }).cleared;
  }

  /**
   * Downloads `url` with the profile's cookies to the absolute `path` (a file, or a directory for the
   * suggested name). The fetch runs in the extension, not this tab.
   */
  async download(url: string, filePath: string, options: DownloadOptions = {}): Promise<DownloadOutcome> {
    this.#guard();
    return downloadToFile((m, p, o) => this.#host.call(m, p, o), {
      url,
      path: filePath,
      overwrite: options.overwrite,
      timeoutMs: options.timeoutMs,
    });
  }

  /** Brings the tab to the front of its window and focuses the window (`focusTab`). */
  async focus(): Promise<void> {
    await this.#send("focusTab");
  }

  /** Closes the Chrome tab. */
  async close(): Promise<void> {
    await this.#send("closeTab");
  }

  /** Gives up this client's lease on the tab; the tab stays open. */
  async release(): Promise<void> {
    await this.#send("tabs.release");
  }
}
