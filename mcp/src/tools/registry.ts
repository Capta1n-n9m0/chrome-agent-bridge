import { readFile } from "node:fs/promises";
import os from "node:os";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isLocator, type EvalEnvelope, type Locator, type SnapshotResult } from "@bridge/shared";
import { BridgeError, ErrorCodes, downloadToFile, type BridgeClient } from "@bridge/sdk";
import { formatEntry, formatNetwork, formatSnapshot, type FormattableResult } from "@bridge/sdk/format";
import { attachContext, isAttachCode, type FailureReportConfig } from "@bridge/sdk/report";
import { CONNECTING_REASON } from "../link.js";
import { TabCursor } from "../cursor.js";
import { actorName } from "../config.js";

const DEFAULT_EVAL_TIMEOUT_MS = 10_000;
/** The extension races its own timer at `timeoutMs`; give the server a little more before it gives up. */
const SERVER_TIMEOUT_SLACK_MS = 5_000;
/** Mirrors the extension's default quiet period for `browser_wait_for { networkIdle: true }`. */
const DEFAULT_NETWORK_IDLE_MS = 500;
/**
 * The extension's own bound for a text, networkIdle or locator wait (10 s), plus the slack: the call's
 * `timeoutMs` (Step 8 S5; #90 item 5 / stage0-audit F22 — the 30 s default cut a 60 s `seconds` wait).
 */
const WAIT_BOUND_MS = 10_000;

/** A handle the daemon minted ("T3"); "all" and anything else get no failure report. */
const HANDLE = /^T\d+$/;

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
type ToolResult = { content: Content[]; isError?: boolean };

function text(s: string): ToolResult {
  return { content: [{ type: "text", text: s }] };
}

/** A tool error returned as a result without calling anything (no destructive default, #57). */
function toolError(s: string): ToolResult {
  return { content: [{ type: "text", text: s }], isError: true };
}

/** `notice` and a newline before the first text item, or a text item of its own before an image. */
function withNotice(result: ToolResult, notice: string | null): ToolResult {
  if (!notice) return result;
  const [first, ...rest] = result.content;
  if (first?.type === "text") return { ...result, content: [{ type: "text", text: `${notice}\n${first.text}` }, ...rest] };
  return { ...result, content: [{ type: "text", text: notice }, ...result.content] };
}

/**
 * What the tools need: a `BridgeClient`'s `call`/`status`, plus whether a client is held and why not
 * (`BridgeLink` in `../link.ts` supplies both; tests pass a fake).
 */
export interface ToolBridge extends Pick<BridgeClient, "call" | "status"> {
  readonly hasClient: boolean;
  readonly reason: string | null;
}

/** The `daemon.status` result (daemon/src/route.ts). */
interface DaemonStatus {
  build: string;
  uptime: number;
  extensionConnected: boolean;
  clients: Array<{ id: string; name: string; since: number }>;
  port: number;
}

/** One row of a Step 7 `listTabs` result: the extension's fields plus the daemon's handle and owner. */
interface ListedTab {
  id: number;
  /** The daemon's handle ("T3"). */
  tab?: string;
  title: string;
  url: string;
  /** Active in its own window. */
  active: boolean;
  /** The human's tab: the active tab of the last-focused normal window (#43, #55). */
  current?: boolean;
  /** The holder's actor name. */
  owner?: string;
}

/**
 * The `tab` argument of every tab-touching tool (spec §8.3; exit check T4.3 greps each tool's schema
 * for the literal `z.string().optional()` on `tab`). Handles come from browser_list_tabs.
 */
const TAB_DESCRIPTION =
  'Tab handle from browser_list_tabs (e.g. "T3"). Omitted: this session\'s tab — the active tab, claimed on first use and then kept.';

/** On the network tools `tab` keeps its scope meanings (#40, Stage 0 F3). */
const NETWORK_TAB_DESCRIPTION =
  'Which tab: a handle from browser_list_tabs, "all" for every tab, or "active"/omitted for this session\'s tab (the active tab, claimed on first use).';

function notConnected(problem: string) {
  return text(`Daemon: not connected\nProblem: ${problem}`);
}

// ── Locator input (Step 8 S5; decisions.md · 2026-10-23 #83 item 2, #86) ─────────────────────────

const LOCATOR_SHAPES = "{role, name?}, {text} or {css} (each may add nth; role and text may add exact)";

/** The nested `locator` field of the actions and browser_wait_for. */
const LOCATOR_SCHEMA = z
  .object({
    role: z.string().optional(),
    name: z.string().optional(),
    exact: z.boolean().optional(),
    text: z.string().optional(),
    css: z.string().optional(),
    nth: z.number().int().min(0).optional(),
  })
  .optional()
  .describe(
    'Find the element without a ref: {role, name?} (e.g. {role:"button", name:"Sign in"}), {text} (visible text), or {css} (a selector). Each may add nth (0-based) to pick one of several matches; exact:true with name or text means case-sensitive equality instead of a substring match. What a browser_snapshot shows (role and name) is what a locator matches.',
  );

const REF_DESCRIPTION = "Element ref from browser_snapshot (e.g. \"e12\"). Pass ref or locator, not both.";

type LocatorInput = z.infer<typeof LOCATOR_SCHEMA>;

/** The locator with its absent keys dropped, as the wire wants it. */
function compact(locator: NonNullable<LocatorInput>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(locator).filter(([, v]) => v !== undefined));
}

/** Why `value` is not a locator — the same texts as the SDK's `sdk/src/locator.ts`. */
function locatorProblem(value: Record<string, unknown>, what: string): string {
  if (value.name !== undefined && value.role === undefined && value.text === undefined && value.css === undefined) {
    return `${what}: a locator with "name" needs "role" — use {text} or add role (e.g. {role: "button", name: …})`;
  }
  return `${what}: not a locator — use one of ${LOCATOR_SHAPES}`;
}

/** A checked locator, or the tool error to return (no call made). */
function checkLocator(tool: string, locator: NonNullable<LocatorInput>): { locator: Locator } | { error: ToolResult } {
  const wire = compact(locator);
  if (isLocator(wire)) return { locator: wire };
  return { error: toolError(locatorProblem(wire, `${tool} locator`)) };
}

type Target = { ref: string } | { locator: Locator };

/**
 * Exactly one of `ref` / `locator` (or, with `optional`, neither): the wire half of the params, or
 * the tool error to return without calling anything.
 */
function targetOf(
  tool: string,
  ref: string | undefined,
  locator: LocatorInput,
  optional = false,
): { target: Target | null } | { error: ToolResult } {
  if (ref !== undefined && locator !== undefined) return { error: toolError(`${tool} takes ref or locator, not both`) };
  if (locator !== undefined) {
    const checked = checkLocator(tool, locator);
    return "error" in checked ? checked : { target: checked };
  }
  if (ref !== undefined) return { target: { ref } };
  if (optional) return { target: null };
  return { error: toolError(`${tool} needs ref (from browser_snapshot) or locator`) };
}

/** A locator in a result text: `button "Sign in"`, `text "Menu" #1`, `css #size`. */
function describeLocator(l: Locator): string {
  let s: string;
  if ("role" in l) s = typeof l.name === "string" ? `${l.role} "${l.name}"` : l.role;
  else if ("text" in l) s = `text "${l.text}"`;
  else s = `css ${l.css}`;
  return l.nth !== undefined ? `${s} #${l.nth}` : s;
}

/** A ref as today's texts print it, or the locator described. */
function describeTarget(t: Target): string {
  return "ref" in t ? t.ref : describeLocator(t.locator);
}

/** Options of `registerTools` (tests inject fakes; the MCP passes its actor name). */
export interface RegisterToolsOptions {
  /** This MCP's actor name, compared with a `listTabs` row's `owner` (default `actorName()`). */
  actorName?: string;
  /** Timers, env, home directory and clock for the failure reports (default: the real ones). */
  failureReports?: FailureReportConfig;
  /** Fills in a failure report's context (default: the SDK's `attachContext`; tests stub it). */
  attach?: typeof attachContext;
}

/** `report()` shows the message on one line, cut at this many characters (`sdk/src/error.ts`). */
const REPORT_MESSAGE_CHARS = 300;

const realFailureReports = (): FailureReportConfig => ({
  timers: {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  },
  env: process.env,
  homedir: os.homedir,
  now: Date.now,
});

/**
 * Registers the 23 tools. `cursor` is this session's tab: by default a fresh one over `bridge`; the MCP
 * passes the one its BridgeLink feeds (`../index.ts`), so a daemon restart is noticed.
 */
export function registerTools(
  server: McpServer,
  bridge: ToolBridge,
  cursor: TabCursor = new TabCursor(bridge),
  options: RegisterToolsOptions = {},
): void {
  const me = options.actorName ?? actorName();
  const reports = options.failureReports ?? realFailureReports();
  const attach = options.attach ?? attachContext;

  /**
   * A failure report for `err` on `tab` (phase doc 0.5, Step 8 S5): only a `BridgeError` with an
   * attach-set code on a handle. Returns the tool error to show — `report()` as text, plus the saved
   * screenshot as an image block when there is one — or null, and the caller rethrows `err` unchanged.
   */
  async function failureReport(err: unknown, tab: string): Promise<ToolResult | null> {
    if (!(err instanceof BridgeError) || !isAttachCode(err.code) || !HANDLE.test(tab)) return null;
    await attach(err, tab, { ...reports, call: (m, p, o) => bridge.call(m, p, o) });
    if (typeof err.report !== "function") return null;
    let report = err.report();
    // report() flattens the message to one capped line; keep what the tool showed before (S5 fixer).
    if (err.message.includes("\n") || err.message.length > REPORT_MESSAGE_CHARS) {
      report += `\nFull message:\n${err.message}`;
    }
    const content: Content[] = [];
    if (err.screenshotPath !== undefined) {
      try {
        const png = await readFile(err.screenshotPath);
        content.push({ type: "image", data: png.toString("base64"), mimeType: "image/png" });
      } catch (readErr) {
        report += `\n(the screenshot file could not be read: ${readErr instanceof Error ? readErr.message : String(readErr)})`;
      }
    }
    return { isError: true, content: [{ type: "text", text: report }, ...content] };
  }

  /** Runs `fn` on `tab`; an attach-set failure becomes a failure report, any other is rethrown. */
  async function attempt(tab: string, fn: (tab: string) => Promise<ToolResult>): Promise<ToolResult> {
    try {
      return await fn(tab);
    } catch (err) {
      const report = await failureReport(err, tab);
      if (report) return report;
      throw err;
    }
  }

  /**
   * Runs `fn` on `tab` when given (passed through unchanged; the cursor does not move), else on the
   * cursor, claimed on first touch. After a lost cursor was re-claimed the result carries the notice.
   */
  async function onTab(tab: string | undefined, fn: (tab: string) => Promise<ToolResult>): Promise<ToolResult> {
    if (tab !== undefined) return attempt(tab, fn);
    const resolved = await cursor.resolve();
    try {
      return withNotice(await attempt(resolved.tab, fn), resolved.notice);
    } catch (err) {
      if (resolved.notice) cursor.restoreNotice(resolved.notice);
      throw err;
    }
  }

  /**
   * A network tool's target: "all" and handles pass through; omitted and "active" go to the cursor,
   * whose listing keeps the "active tab" label, so the text matches the recorded E2E runs (NET-1).
   */
  async function onNetworkScope(
    tab: string | undefined,
    fn: (tab: string, scope: string) => Promise<ToolResult>,
  ): Promise<ToolResult> {
    if (tab === undefined || tab === "active") return onTab(undefined, (t) => fn(t, "active"));
    return attempt(tab, (t) => fn(t, tab));
  }

  /** The `owner` of a row as the status lines print it. */
  function holder(row: ListedTab): string {
    if (row.owner === undefined) return "not held";
    return row.owner === me ? "held by me" : `held by ${row.owner}`;
  }

  server.tool(
    "browser_status",
    "Diagnose the bridge: is the daemon connected, is the extension connected, and which tab is the human's active one (by handle). Call this first when other browser tools fail.",
    {},
    async () => {
      // No client: say why without calling anything.
      if (!bridge.hasClient) return notConnected(bridge.reason ?? CONNECTING_REASON);
      let status: DaemonStatus;
      try {
        status = (await bridge.status()) as DaemonStatus;
      } catch (err) {
        return notConnected(err instanceof Error ? err.message : String(err));
      }
      const lines = [
        `Daemon: connected on 127.0.0.1:${status.port} (build ${status.build}, up ${Math.round(status.uptime / 1000)}s)`,
        `Clients (${status.clients.length}): ${status.clients.map((c) => c.name).join(", ")}`,
      ];
      if (!status.extensionConnected) {
        lines.push("Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?");
        return text(lines.join("\n"));
      }
      lines.push("Extension: connected");
      const { tabs } = (await bridge.call("listTabs")) as { tabs: ListedTab[] };
      // `current` is the human's tab (#43, #55); `active` is per window.
      const human = tabs.find((t) => t.current === true);
      lines.push(human ? `Active tab: [${human.tab ?? human.id}] ${human.title} — ${human.url}` : "Active tab: none");
      // Step 8 S5 (0.6): this session's tab, and the human's when it is another one. Status never
      // claims: with no cursor it says so.
      const mine = cursor.tab;
      if (mine === null) {
        lines.push("Cursor: none yet — the first tab tool claims the human's active tab");
        return text(lines.join("\n"));
      }
      const row = tabs.find((t) => t.tab === mine);
      lines.push(row ? `Cursor: ${mine} "${row.title}" — ${row.url} (${holder(row)})` : `Cursor: ${mine} (not open any more)`);
      if (human?.tab !== undefined && human.tab !== mine) {
        const other = human.owner !== undefined && human.owner !== me;
        lines.push(
          other
            ? `Human's active tab: ${human.tab} "${human.title}" — held by ${human.owner}, not mine`
            : `Human's active tab: ${human.tab} "${human.title}" — not mine; call browser_use_active_tab to work there`,
        );
      }
      return text(lines.join("\n"));
    },
  );

  server.tool(
    "browser_use_active_tab",
    "Make the human's active tab (the tab they are looking at) this session's tab. Call it only when the user says \"this tab\", \"the tab I opened\", \"the tab I'm on\" or otherwise asks you to work where they are looking — never on your own initiative: this session's tab deliberately does not follow the human when they switch tabs. Fails if another actor holds that tab. The previous tab is not released.",
    {},
    async () => {
      const result = (await bridge.call("tabs.claim", { active: true })) as { tab?: unknown } | null;
      const handle = result?.tab;
      if (typeof handle !== "string") throw new BridgeError(ErrorCodes.INTERNAL, "tabs.claim answered without a tab handle");
      cursor.set(handle);
      return text(`Now using ${handle} (the human's active tab) as this session's tab`);
    },
  );

  server.tool(
    "browser_navigate",
    "Navigate this session's tab (the active tab is claimed on first use) or `tab` to a URL.",
    { url: z.string().url().describe("Absolute URL to navigate to"), tab: z.string().optional().describe(TAB_DESCRIPTION) },
    async ({ url, tab }) =>
      onTab(tab, async (t) => {
        await bridge.call("navigate", { url, tab: t });
        return text(`Navigated active tab to ${url}`);
      }),
  );

  server.tool(
    "browser_snapshot",
    "Capture an accessibility snapshot of this session's tab (the active tab is claimed on first use) or `tab`, with element refs.",
    { tab: z.string().optional().describe(TAB_DESCRIPTION) },
    async ({ tab }) =>
      onTab(tab, async (t) => text(formatSnapshot((await bridge.call("snapshot", { tab: t })) as SnapshotResult))),
  );

  server.tool(
    "browser_screenshot",
    "Capture a screenshot of the viewport of this session's tab (the active tab is claimed on first use) or `tab`.",
    {
      fullPage: z.boolean().optional().describe("Capture the full scrollable page (Milestone 4)"),
      tab: z.string().optional().describe(TAB_DESCRIPTION),
    },
    async ({ fullPage, tab }) =>
      onTab(tab, async (t) => {
        const result = (await bridge.call("screenshot", { fullPage: fullPage ?? false, tab: t })) as { dataUrl: string };
        const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, "");
        return { content: [{ type: "image", data: base64, mimeType: "image/png" }] };
      }),
  );

  server.tool(
    "browser_click",
    "Click the element with the given ref (or found by `locator`) in this session's tab (the active tab is claimed on first use) or `tab`. Set trusted=true to force real CDP input (shows the debugging banner).",
    {
      ref: z.string().optional().describe(REF_DESCRIPTION),
      locator: LOCATOR_SCHEMA,
      trusted: z.boolean().optional(),
      tab: z.string().optional().describe(TAB_DESCRIPTION),
    },
    async ({ ref, locator, trusted, tab }) => {
      const checked = targetOf("browser_click", ref, locator);
      if ("error" in checked) return checked.error;
      const target = checked.target!;
      return onTab(tab, async (t) => {
        await bridge.call("click", { ...target, trusted: trusted ?? false, tab: t });
        return text(`Clicked ${describeTarget(target)}`);
      });
    },
  );

  server.tool(
    "browser_type",
    "Type text into the element with the given ref (or found by `locator`) in this session's tab (the active tab is claimed on first use) or `tab`. Optionally submit. Set trusted=true to send real CDP keystrokes (shows the debugging banner) for sites that ignore synthetic input; the trusted path selects the field's existing text and replaces it.",
    {
      ref: z.string().optional().describe(REF_DESCRIPTION),
      locator: LOCATOR_SCHEMA,
      text: z.string().describe("What to type (not a locator: use locator.text to find an element by its text)."),
      submit: z.boolean().optional(),
      trusted: z.boolean().optional(),
      tab: z.string().optional().describe(TAB_DESCRIPTION),
    },
    async ({ ref, locator, text: value, submit, trusted, tab }) => {
      const checked = targetOf("browser_type", ref, locator);
      if ("error" in checked) return checked.error;
      const target = checked.target!;
      return onTab(tab, async (t) => {
        await bridge.call("type", { ...target, text: value, submit: submit ?? false, trusted: trusted ?? false, tab: t });
        return text(`Typed into ${describeTarget(target)}`);
      });
    },
  );

  server.tool(
    "browser_press_key",
    "Press a key (e.g. Enter, Escape, Tab) on the focused element of this session's tab (the active tab is claimed on first use) or `tab`. Set trusted=true to send a real CDP keystroke (shows the debugging banner) for sites that ignore synthetic input.",
    { key: z.string(), trusted: z.boolean().optional(), tab: z.string().optional().describe(TAB_DESCRIPTION) },
    async ({ key, trusted, tab }) =>
      onTab(tab, async (t) => {
        await bridge.call("pressKey", { key, trusted: trusted ?? false, tab: t });
        return text(`Pressed ${key}`);
      }),
  );

  server.tool(
    "browser_scroll",
    "Scroll to a ref (or the element found by `locator`), or scroll the page up/down, in this session's tab (the active tab is claimed on first use) or `tab`.",
    {
      ref: z.string().optional().describe(REF_DESCRIPTION),
      locator: LOCATOR_SCHEMA,
      direction: z.enum(["up", "down"]).optional(),
      tab: z.string().optional().describe(TAB_DESCRIPTION),
    },
    async ({ ref, locator, direction, tab }) => {
      const checked = targetOf("browser_scroll", ref, locator, true);
      if ("error" in checked) return checked.error;
      const target = checked.target;
      return onTab(tab, async (t) => {
        if (target !== null && "locator" in target) {
          await bridge.call("scroll", { locator: target.locator, direction: direction ?? "down", tab: t });
          return text(`Scrolled to ${describeLocator(target.locator)}`);
        }
        await bridge.call("scroll", { ref, direction: direction ?? "down", tab: t });
        return text("Scrolled");
      });
    },
  );

  server.tool(
    "browser_hover",
    "Hover the element with the given ref (or found by `locator`) in this session's tab (the active tab is claimed on first use) or `tab`.",
    { ref: z.string().optional().describe(REF_DESCRIPTION), locator: LOCATOR_SCHEMA, tab: z.string().optional().describe(TAB_DESCRIPTION) },
    async ({ ref, locator, tab }) => {
      const checked = targetOf("browser_hover", ref, locator);
      if ("error" in checked) return checked.error;
      const target = checked.target!;
      return onTab(tab, async (t) => {
        await bridge.call("hover", { ...target, tab: t });
        return text(`Hovered ${describeTarget(target)}`);
      });
    },
  );

  server.tool(
    "browser_select_option",
    "Select option(s) in a <select> (by ref or `locator`) by value or visible label, in this session's tab (the active tab is claimed on first use) or `tab`.",
    {
      ref: z.string().optional().describe(REF_DESCRIPTION),
      locator: LOCATOR_SCHEMA,
      values: z.array(z.string()).min(1),
      tab: z.string().optional().describe(TAB_DESCRIPTION),
    },
    async ({ ref, locator, values, tab }) => {
      const checked = targetOf("browser_select_option", ref, locator);
      if ("error" in checked) return checked.error;
      const target = checked.target!;
      return onTab(tab, async (t) => {
        await bridge.call("selectOption", { ...target, values, tab: t });
        return text(`Selected ${values.join(", ")} in ${describeTarget(target)}`);
      });
    },
  );

  server.tool(
    "browser_back",
    "Navigate this session's tab (the active tab is claimed on first use) or `tab` back in history.",
    { tab: z.string().optional().describe(TAB_DESCRIPTION) },
    async ({ tab }) =>
      onTab(tab, async (t) => {
        await bridge.call("back", { tab: t });
        return text("Went back");
      }),
  );

  server.tool(
    "browser_forward",
    "Navigate this session's tab (the active tab is claimed on first use) or `tab` forward in history.",
    { tab: z.string().optional().describe(TAB_DESCRIPTION) },
    async ({ tab }) =>
      onTab(tab, async (t) => {
        await bridge.call("forward", { tab: t });
        return text("Went forward");
      }),
  );

  server.tool(
    "browser_list_tabs",
    "List all open tabs, one per line: the handle (pass it as `tab`), `*` on the human's active tab, the holding actor in [brackets] when a tab is held, then title — URL.",
    {},
    async () => {
      const { tabs } = (await bridge.call("listTabs")) as { tabs: ListedTab[] };
      const lines = tabs.map(
        (t) => `${t.tab ?? t.id}${t.current ? "*" : " "} ${t.owner ? `[${t.owner}] ` : ""}${t.title} — ${t.url}`,
      );
      return text(lines.join("\n"));
    },
  );

  server.tool(
    "browser_select_tab",
    "Make `tab` this session's tab: claims it for this session and moves the cursor there, without bringing it on screen (browser_focus_tab does that). Fails if another actor holds it.",
    { tab: z.string().optional().describe("Tab handle from browser_list_tabs (required).") },
    async ({ tab }) => {
      if (tab === undefined) return toolError("browser_select_tab needs tab: a handle from browser_list_tabs");
      const result = (await bridge.call("tabs.claim", { tab })) as { tab?: unknown };
      const handle = typeof result?.tab === "string" ? result.tab : tab;
      cursor.set(handle);
      return text(`Selected tab ${handle} (now this session's tab; not brought on screen — browser_focus_tab shows it)`);
    },
  );

  server.tool(
    "browser_focus_tab",
    "Bring this session's tab (the active tab is claimed on first use) or `tab` on screen and focus its window. The only tool that changes what the human sees; it does not change this session's tab.",
    { tab: z.string().optional().describe(TAB_DESCRIPTION) },
    async ({ tab }) =>
      onTab(tab, async (t) => {
        await bridge.call("focusTab", { tab: t });
        return text(`Focused tab ${t}`);
      }),
  );

  server.tool(
    "browser_new_tab",
    "Open a new tab and make it this session's tab. It comes to the front only when the human is looking at this session's tab right now (they were watching you); otherwise it opens in the background — including the session's first tab — and browser_focus_tab shows it.",
    { url: z.string().url().optional() },
    async ({ url }) => {
      // Phase doc 0.6 (Step 8 S5): active only if the cursor is set and listTabs shows it is the
      // human's tab (`current`, #43). No cursor, a lost cursor or a failed listTabs → background:
      // the human's view is not changed on doubt (stage0-audit F26).
      let active = false;
      const mine = cursor.tab;
      if (mine !== null) {
        try {
          const { tabs } = (await bridge.call("listTabs")) as { tabs: ListedTab[] };
          active = tabs.find((t) => t.current === true)?.tab === mine;
        } catch {
          active = false;
        }
      }
      const { id, tab } = (await bridge.call("newTab", { url, active })) as { id: number; tab?: unknown };
      const where = active ? "" : " (in the background — browser_focus_tab shows it)";
      if (typeof tab !== "string") return text(`Opened tab ${id}${where}`);
      cursor.set(tab);
      return text(`Opened tab ${tab}${where}`);
    },
  );

  server.tool(
    "browser_close_tab",
    "Close `tab` (a handle from browser_list_tabs). Fails if another actor holds it.",
    { tab: z.string().optional().describe("Tab handle from browser_list_tabs (required).") },
    async ({ tab }) => {
      if (tab === undefined) return toolError("browser_close_tab needs tab: a handle from browser_list_tabs");
      await bridge.call("closeTab", { tab });
      return text(`Closed tab ${tab}`);
    },
  );

  server.tool(
    "browser_wait_for",
    "Wait until text appears on this session's tab (the active tab is claimed on first use) or `tab`, wait a number of seconds, `networkIdle:true` to wait until the tab has made no network request for `idleMs` (default 500), or `locator` to wait (up to 10s) until an element matching it is visible (or, with state:\"hidden\", gone). Network idle is activity-based, so a long-poll or EventSource left hanging will not block it; a tab that has recorded no requests at all (nothing since capture started, e.g. right after the extension reloaded) counts as idle and returns immediately.",
    {
      locator: LOCATOR_SCHEMA,
      state: z
        .enum(["visible", "hidden"])
        .optional()
        .describe('With locator only: "visible" (default) waits until it matches, "hidden" until it no longer does.'),
      text: z.string().optional().describe("Text to wait for in the page's visible text (up to 10s)."),
      seconds: z.number().optional().describe("Fixed wait, in seconds (max 60)."),
      networkIdle: z
        .boolean()
        .optional()
        .describe("Wait until the tab has made no network request for `idleMs` (up to 10s)."),
      idleMs: z
        .number()
        .int()
        .min(100)
        .max(10000)
        .optional()
        .describe("Quiet period that counts as idle, in ms. Default 500. Only used with networkIdle."),
      tab: z.string().optional().describe(TAB_DESCRIPTION),
    },
    async ({ locator, state, text: waitText, seconds, networkIdle, idleMs, tab }) => {
      if (locator !== undefined) {
        if (waitText !== undefined || seconds !== undefined || networkIdle !== undefined || idleMs !== undefined) {
          return toolError("browser_wait_for: locator waits alone — drop text, seconds, networkIdle and idleMs");
        }
        const checked = checkLocator("browser_wait_for", locator);
        if ("error" in checked) return checked.error;
        const wanted = state ?? "visible";
        return onTab(tab, async (t) => {
          await bridge.call(
            "waitFor",
            { locator: checked.locator, state: wanted, tab: t },
            { timeoutMs: WAIT_BOUND_MS + SERVER_TIMEOUT_SLACK_MS },
          );
          return text(`Waited for ${describeLocator(checked.locator)} to be ${wanted}`);
        });
      }
      if (state !== undefined) return toolError("browser_wait_for: state is only used with locator");
      // The call's own bound: the wait's, plus the slack (#90 item 5).
      const timeoutMs =
        seconds !== undefined && !waitText && !networkIdle
          ? seconds * 1000 + SERVER_TIMEOUT_SLACK_MS
          : WAIT_BOUND_MS + SERVER_TIMEOUT_SLACK_MS;
      return onTab(tab, async (t) => {
        await bridge.call("waitFor", { text: waitText, seconds, networkIdle, idleMs, tab: t }, { timeoutMs });
        if (networkIdle) return text(`Network idle for ${idleMs ?? DEFAULT_NETWORK_IDLE_MS}ms`);
        return text(waitText ? `Waited for text: ${waitText}` : `Waited ${seconds ?? 0}s`);
      });
    },
  );

  server.tool(
    "browser_evaluate",
    "Run JavaScript in the page context of this session's tab (the active tab is claimed on first use) or `tab` and return the result, like the DevTools console: the last expression's value is returned, top-level `await` works, and `return` is allowed. Results are JSON where possible; DOM nodes, functions and errors come back as short descriptions — use browser_snapshot refs to act on elements. Output is capped (~20k chars, 100 items per array, depth 6) — select what you need. Runs with the page's full logged-in authority and shows Chrome's 'is debugging this browser' banner while it runs.",
    {
      expression: z
        .string()
        .min(1)
        .describe("JavaScript to evaluate in the page. The last expression's value is returned; top-level await and a bare `return` both work."),
      timeoutMs: z
        .number()
        .int()
        .min(100)
        .max(60000)
        .optional()
        .describe("Default 10000. Also bounds the server-side wait."),
      asRef: z
        .boolean()
        .optional()
        .describe("Return a [ref=eN] for a DOM element result, to act on it with the other tools."),
      tab: z.string().optional().describe(TAB_DESCRIPTION),
    },
    async ({ expression, timeoutMs, asRef, tab }) =>
      onTab(tab, async (t) => {
        const pageTimeoutMs = timeoutMs ?? DEFAULT_EVAL_TIMEOUT_MS;
        const envelope = (await bridge.call(
          "evaluate",
          // `asRef` only when asked, so today's params stay identical.
          { expression, timeoutMs: pageTimeoutMs, ...(asRef === true ? { asRef: true } : {}), tab: t },
          { timeoutMs: pageTimeoutMs + SERVER_TIMEOUT_SLACK_MS },
        )) as EvalEnvelope;
        const lines = [envelope.description];
        if (typeof envelope.ref === "string") lines.push(`[ref=${envelope.ref}] — pass it as ref to browser_click etc.`);
        else if (asRef === true) lines.push("(no ref: the result is not an element)");
        if (envelope.kind === "node") lines.push("(DOM node — use browser_snapshot refs to act on it)");
        if (envelope.truncated) lines.push("(output truncated — narrow the expression, e.g. pick fields or slice the array)");
        return text(lines.join("\n"));
      }),
  );

  server.tool(
    "browser_download",
    "Download a URL to a file on disk with the browser profile's cookies — for files behind a login (course files, reports, exports). The extension fetches it from its service worker, so there is no CORS limit and cross-origin redirects (e.g. to a signed S3 URL) are followed; no tab is touched and no debugger banner shows. `path` is absolute: a file path, or a directory (existing, or ending in a separator) to save under the server-suggested filename. Returns the saved path, size, content type and sha256. A `text/html` result for a binary file usually means a login page or an error page came back.",
    {
      url: z.string().url().describe("Absolute http(s) URL; same-site paths of the logged-in site work, redirects are followed."),
      path: z.string().min(1).describe("Absolute destination: a file path, or a directory to save under the suggested filename."),
      overwrite: z.boolean().optional().describe("Replace an existing file. Default false."),
      timeoutMs: z.number().int().min(1000).max(600000).optional().describe("Fetch timeout. Default 120000."),
    },
    async ({ url, path: dest, overwrite, timeoutMs }) => {
      const r = await downloadToFile((m, p, o) => bridge.call(m, p, o), { url, path: dest, overwrite, timeoutMs });
      const lines = [
        `Saved ${r.path}`,
        `${r.size} bytes · ${r.start.contentType || "unknown type"} · sha256 ${r.sha256}`,
      ];
      if (r.start.redirected) lines.push(`(followed redirects to ${r.start.finalHost})`);
      if (r.start.contentType === "text/html" && !/\.html?$/i.test(r.path)) {
        lines.push("Warning: the response is HTML — possibly a login or error page rather than the file.");
      }
      return text(lines.join("\n"));
    },
  );

  server.tool(
    "browser_network_requests",
    "List recent network requests made by this session's tab (the active tab is claimed on first use), `tab`, or every tab — method, status, type, duration, size, URL — captured continuously with no debugger banner, like the DevTools Network panel with 'Preserve log'. Newest 50 by default, printed oldest first. `filter` matches the URL (substring or /regex/), `types` narrows by resource type (xhr, script, image, document, …), `failedOnly` keeps network errors and 4xx/5xx. Pass `id` for one request's headers and request-body summary. Response bodies are not available (use browser_evaluate to re-fetch if you need one). Call browser_network_clear before an action to see only what it caused.",
    {
      tab: z.string().optional().describe(NETWORK_TAB_DESCRIPTION),
      filter: z.string().optional().describe("Match the URL: a case-insensitive substring, or /regex/flags when wrapped in slashes."),
      types: z.array(z.string()).optional().describe("Resource types to keep: xhr, fetch, document, frame, script, stylesheet, image, font, media, websocket, ping, other."),
      failedOnly: z.boolean().optional().describe("Keep only network errors and responses with status >= 400."),
      limit: z.number().int().min(1).max(500).optional().describe("How many of the newest matching requests to print. Default 50."),
      includeHeaders: z.boolean().optional().describe("Keep the (redacted) headers on the returned entries. The printed table never shows headers — use `id` to read one request's headers."),
      id: z.string().optional().describe("Show one request in full — headers and request-body summary — by its id from a previous listing."),
    },
    async (params) => {
      // An id lookup is global (the daemon drops `tab` for it): nothing to resolve, nothing claimed.
      if (params.id !== undefined) {
        const result = (await bridge.call("networkRequests", params)) as FormattableResult;
        const entry = result.entries[0];
        return text(entry ? formatEntry(entry, { now: Date.now() }) : `No request with id ${params.id}`);
      }
      return onNetworkScope(params.tab, async (tab, scope) => {
        const result = (await bridge.call("networkRequests", { ...params, tab })) as FormattableResult;
        return text(formatNetwork(result, { now: Date.now(), scope }));
      });
    },
  );

  server.tool(
    "browser_network_clear",
    'Forget the recorded network requests for this session\'s tab (the active tab is claimed on first use), `tab`, or `tab:"all"`. Use it right before an action so the next browser_network_requests shows only what that action caused.',
    { tab: z.string().optional().describe(NETWORK_TAB_DESCRIPTION) },
    async (params) =>
      onNetworkScope(params.tab, async (tab) => {
        const { cleared } = (await bridge.call("networkClear", { ...params, tab })) as { cleared: number };
        return text(`Cleared ${cleared} requests.`);
      }),
  );
}
