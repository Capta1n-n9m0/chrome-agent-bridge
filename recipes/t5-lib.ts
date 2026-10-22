// recipes/t5-lib.ts: helpers shared by the Step 7 T5 wave scripts (recipes/t5.ts). Written
// 2026-10-22 before any run (docs/e2e-test-plan.md §4.14, the wave sheet
// docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T5-wave-sheet.md).
//
// Rules every T5 script keeps (T5.4, CLAUDE.md "never log a URL"):
// - it acts only on fixture tabs: tabs whose URL starts with FIXTURE_ORIGIN, found by a `?t5=<marker>`
//   query the driver or the script put there; it never acts on the human's own tabs;
// - it prints a URL only when it is a fixture URL; any other URL prints as `<non-fixture url withheld>`,
//   and a non-fixture title as `<non-fixture title withheld>`;
// - it never reads or prints the token (the SDK resolves it).
import { BridgeError, connect, type BridgeClient } from "@bridge/sdk";

export const FIXTURE_ORIGIN = process.env.T5_FIXTURE_ORIGIN?.trim() || "http://localhost:8080";
export const FIXTURE = `${FIXTURE_ORIGIN}/e2e-playground.html`;

/** The fixture URL a T5 step opens for `marker` (a query, so a navigation is never same-document). */
export function urlOf(marker: string): string {
  return `${FIXTURE}?t5=${encodeURIComponent(marker)}`;
}

export function isFixtureUrl(url: unknown): boolean {
  return typeof url === "string" && (url.startsWith(`${FIXTURE_ORIGIN}/`) || url === FIXTURE_ORIGIN);
}

/** A URL as a T5 script may print it. */
export function showUrl(url: unknown): string {
  return isFixtureUrl(url) ? String(url) : "<non-fixture url withheld>";
}

export function stamp(): string {
  return new Date().toISOString();
}

/** One timestamped output line, `<iso> <name>: <msg>` (the format recipes/hello.ts uses). */
export function say(name: string, msg: string): void {
  console.log(`${stamp()} ${name}: ${msg}`);
}

/** An error as one line: `<code>: <message>`, plus `data` (URLs inside it withheld unless fixture). */
export function describeError(err: unknown): string {
  if (err instanceof BridgeError) {
    let line = `${err.code}: ${err.message}`;
    if (err.data !== undefined) line += ` · data ${JSON.stringify(safeData(err.data))}`;
    return line;
  }
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

function safeData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (/url/i.test(k)) out[k] = showUrl(v);
    else out[k] = v;
  }
  return out;
}

export interface ListedTab {
  id: number;
  tab: string;
  title: string;
  url: string;
  active: boolean;
  current?: boolean;
  owner?: string;
  windowId?: number;
  openerTabId?: number;
}

export async function listTabs(client: BridgeClient): Promise<ListedTab[]> {
  const { tabs } = (await client.call("listTabs")) as { tabs: ListedTab[] };
  return tabs;
}

/** The fixture tab opened for `marker` (exact URL match), or undefined. */
export function byMarker(tabs: ListedTab[], marker: string): ListedTab | undefined {
  const want = urlOf(marker);
  return tabs.find((t) => t.url === want);
}

export function requireMarker(tabs: ListedTab[], marker: string): ListedTab {
  const t = byMarker(tabs, marker);
  if (!t) throw new Error(`no open tab for marker "${marker}" (${urlOf(marker)}) — open it first`);
  return t;
}

/** The human's tab (`current: true`), which must be a fixture page: the driver's own window. */
export function requireFixtureCurrent(tabs: ListedTab[]): ListedTab {
  const human = tabs.find((t) => t.current === true);
  if (!human) throw new Error("SET-UP: listTabs marks no current tab — no normal Chrome window is focused");
  if (!isFixtureUrl(human.url)) {
    throw new Error("SET-UP: the human's tab is not a fixture page — focus the driver's own Chrome window and retry");
  }
  return human;
}

/** A tab as a T5 line: `T3 (chrome id 412, active, current, owner "x")`. */
export function showTab(t: ListedTab): string {
  const bits = [`chrome id ${t.id}`, t.active ? "active in its window" : "background", ...(t.current ? ["current"] : [])];
  if (t.owner) bits.push(`owner ${JSON.stringify(t.owner)}`);
  return `${t.tab} (${bits.join(", ")})`;
}

export async function connectAs(name: string): Promise<BridgeClient> {
  return connect({ name });
}

/** `evaluate` on `tab`, returning the JSON value (the expression must produce JSON-able data). */
export async function evalJson<T = unknown>(client: BridgeClient, tab: string, expression: string, timeoutMs = 10_000): Promise<T> {
  const env = (await client.call("evaluate", { expression, timeoutMs, tab }, { timeoutMs: timeoutMs + 5_000 })) as {
    kind: string;
    value?: unknown;
    description: string;
  };
  if (env.kind !== "json") throw new Error(`evaluate returned kind ${env.kind}: ${env.description}`);
  return env.value as T;
}

/** Page code: a fixed colour bar across the top of the page, so a capture shows which tab it is. */
export function barExpression(colour: string, label: string, title?: string): string {
  const t = title === undefined ? "" : `document.title = ${JSON.stringify(title)};`;
  return (
    `(() => { let b = document.getElementById('t5-bar'); if (!b) { b = document.createElement('div'); b.id = 't5-bar'; document.documentElement.appendChild(b); }` +
    ` b.textContent = ${JSON.stringify(label)};` +
    ` b.style.cssText = 'position:fixed;top:0;left:0;right:0;height:48px;z-index:2147483647;font:bold 24px sans-serif;color:#000;background:${colour};';` +
    ` ${t} return document.visibilityState; })()`
  );
}

/** Page code: start (or restart) a visibilitychange log with high-resolution epoch times. */
export const VISLOG_INSTALL =
  `(() => { const now = () => performance.timeOrigin + performance.now();` +
  ` window.__t5vis = [[document.visibilityState, now(), 'start']];` +
  ` if (!window.__t5visOn) { window.__t5visOn = true; document.addEventListener('visibilitychange', () => window.__t5vis.push([document.visibilityState, performance.timeOrigin + performance.now(), 'change'])); }` +
  ` return document.visibilityState; })()`;

export const VISLOG_READ = `(window.__t5vis || [])`;

export type VisEntry = [state: string, epochMs: number, kind: string];

/** The colours T5 bars use, as #rrggbb, and their names. */
export const COLOURS: Record<string, string> = {
  magenta: "#ff00ff",
  cyan: "#00ffff",
  red: "#ff0000",
  lime: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
};

/** The colour name whose value is within `tolerance` of `hex` on every channel, else "other". */
export function colourName(hex: string, tolerance = 24): string {
  const [r, g, b] = hexRgb(hex);
  for (const [name, value] of Object.entries(COLOURS)) {
    const [R, G, B] = hexRgb(value);
    if (Math.abs(r - R) <= tolerance && Math.abs(g - G) <= tolerance && Math.abs(b - B) <= tolerance) return name;
  }
  return "other";
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Runs `main`, printing a failure as `FAILED — <error>` and exit code 1 (like recipes/hello.ts). */
export function run(name: string, main: () => Promise<void>): void {
  main().catch((err: unknown) => {
    console.log(`${stamp()} ${name}: FAILED — ${describeError(err)}`);
    // 2 = a set-up problem (nothing measured), as recipes/t5.ts's header says (verifier m2).
    process.exitCode = err instanceof Error && err.message.startsWith("SET-UP:") ? 2 : 1;
  });
}
