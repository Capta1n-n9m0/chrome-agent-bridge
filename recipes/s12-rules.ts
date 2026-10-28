// Step 12 S1-helpers-a: pure rules for Run 18's helpers (docs/e2e-test-plan.md section 4.26). Node only, except scan18 (it reuses s11-rules' scanText;
// the s6 typecheck still compiles its tests). recipes/s12-win.ps1 mirrors the constants; recipes/test/s12-helpers.test.ts ties them.
import { scanText, type Scan, type ScanCtx } from "./s11-rules.js";
export const CONTROL_TEXT = "safety: disarmed by the user"; // extension/src/badge.ts `disarmed` (tied by text in the test)
export const IDLE_MIN_MS = 15_000;
/** The banner window ends 2 500 ms after the reply (the actor sleeps it); the PowerShell sampler's own tail is 0. */
export const SAMPLE_TAIL_MS = 0;
export const SLICES = { liveA18: "A", liveB18: "B" } as const;
export type Slice = keyof typeof SLICES;
export const isSlice = (s: string): s is Slice => Object.prototype.hasOwnProperty.call(SLICES, s);

export const rawCaptureName = (s: Slice): string => `console-${s}.txt`;
export const committedCaptureName = (s: Slice, attempt = 1): string => `S1-live-console-${s}${attempt > 1 ? `-att${attempt}` : ""}.txt`;
/** A capture path that already holds text is a STOP (Run 17b lost liveA's capture to an overwrite); the text is never echoed. */
export const captureStop = (existing: string | null): string | null =>
  existing !== null && existing.trim() !== "" ? "the capture file already holds text; it is never overwritten" : null;

// Mirror of dropTitleLines in s11b-rules.ts (#283); that file imports extension code, so it cannot be imported here (tied by text).
export const isTitleLine = (l: string): boolean => /^DevTools(?: - .*)?$/i.test(l.trim()) || / - (?:Google )?Chrome$/i.test(l.trim());
export function dropTitleLines(text: string): { text: string; dropped: number } {
  const all = text.split(/\r?\n/);
  const kept = all.filter((l) => !isTitleLine(l));
  return { text: kept.join("\n"), dropped: all.length - kept.length };
}
/** `CONSOLE <slice> capture=<file name only> texts=<n> control-disarmed=<n>`; texts = non-blank lines after the title lines go. */
export function consoleLine(slice: Slice, fileName: string, raw: string): string {
  if (fileName !== rawCaptureName(slice)) throw new Error("the capture file name is not this slice's");
  const t = dropTitleLines(raw).text;
  const texts = t.split("\n").filter((l) => l.trim() !== "").length;
  return `CONSOLE ${slice} capture=${fileName} texts=${texts} control-disarmed=${t.split(CONTROL_TEXT).length - 1}`;
}

export interface BannerCtl { violations?: number; idleMs: number; neg: "seen" | "none"; pos: "seen" | "none"; posAnswer: string; negPolls?: number; posPolls?: number }
/** violations = other bridge calls seen in the two windows (the CHECK lines); more than 0 FAILs the row (the answer stays the call's own). */
export const bannerCtlPass = (c: Pick<BannerCtl, "idleMs" | "neg" | "pos" | "posAnswer" | "violations">): boolean =>
  (c.violations ?? 0) === 0 && c.neg === "none" && c.pos === "seen" && c.posAnswer === "ok" && c.idleMs >= IDLE_MIN_MS;
export const bannerCtlLines = (slice: Slice, c: BannerCtl): string[] => [
  `BANNERCTL ${slice} leg=neg idle-ms=${c.idleMs} polls=${c.negPolls ?? 0} banner=${c.neg}`,
  `BANNERCTL ${slice} leg=pos answer=${c.posAnswer} polls=${c.posPolls ?? 0} banner=${c.pos}`,
  `ROW R18-BANNER-CTL ${bannerCtlPass(c) ? "PASS" : "FAIL"} slice=${SLICES[slice]}`,
];

/** The idle guard of a banner row: the IDLE line (null when the stamp is unknown) and a STOP text when under 15 000 ms or unknown. */
export function idleCheck(row: string, sinceMs: number | null): { line: string | null; stop: string | null } {
  if (sinceMs === null) return { line: null, stop: `${row}: no attach stamp, the idle since the last attach is unknown` };
  return { line: `IDLE ${row} since-attach-ms=${sinceMs}`, stop: sinceMs < IDLE_MIN_MS ? `${row}: idle since the last attach is under ${IDLE_MIN_MS} ms; no call sent` : null };
}
export const idleWaitMs = (sinceMs: number | null): number => (sinceMs === null ? IDLE_MIN_MS : Math.max(0, IDLE_MIN_MS - sinceMs));

/** `DEVT` lines: attached=yes exactly when control 1 answered DEBUGGER_DEVTOOLS. Never a verdict. */
export const devtLines = (slice: Slice, control1: string, control2: string): string[] => [
  `DEVT ${slice} control1 ${control1} attached=${control1 === "DEBUGGER_DEVTOOLS" ? "yes" : "no"}`,
  `DEVT ${slice} control2 ${control2}`,
];

// ---- S1-helpers-b: line forms (5)-(8) of section 4.26 ----
export type KMap = Record<string, { code: string; message: string }>;
const KEY_NAME = /^[A-Za-z_][\w-]{0,30}$/;
/** (5) `RAW <row> <label> code=<CODE|ok> key=<K-...|other|none> data=<none|keys:<k1,k2>>`: data KEYS only, never values; a key that is not a plain name prints as "other". */
export function rawLine(row: string, label: string, err: { code: string; message: string; data?: unknown } | undefined, k: KMap): string {
  const key = err === undefined ? "none" : (Object.entries(k).find(([, v]) => v.code === err.code && v.message === err.message)?.[0] ?? "other");
  const d = err?.data;
  const keys = d !== null && typeof d === "object" ? Object.keys(d).map((x) => (KEY_NAME.test(x) ? x : "other")) : [];
  return `RAW ${row} ${label} code=${err?.code ?? "ok"} key=${key} data=${keys.length > 0 ? `keys:${keys.join(",")}` : "none"}`;
}
/** (6) the two OPT lines; the O2 poll runs to O2_POLL_MAX_MS and stops when the saved text shows. */
export const O2_POLL_MAX_MS = 15_000;
export const optObservedLine = (standing: number, invalid: number, warned: number): string => `OPT observed standing x${standing} invalid items ${invalid} warned items ${warned}`;
export const optO2Line = (shown: boolean, atMs: number | null, polledMs: number): string => `OPT O2 shown=${shown ? "yes" : "no"} at=${shown && atMs !== null ? atMs : "none"} polled-ms=${polledMs}`;
/** (7) the ON press is timed from the last call's reply and is at least RACE_ON_MIN_MS after it. */
export const RACE_ON_MIN_MS = 1600;
export const raceOnLine = (ms: number): string => `RACE ON pressed ${ms} after last reply`;
/** (8) `LEG <row> <leg> <verdict>`. */
export const LEG_VERDICTS = ["PASS", "FAIL", "NOT MEASURED"] as const;
export const legLine = (row: string, leg: string, v: (typeof LEG_VERDICTS)[number]): string => `LEG ${row} ${leg} ${v}`;

// ---- S1-helpers-b fixer: Run 18's scanner (section 4.26 "fixture": 8081 only; a bare `://` is not a URL) ----
const FIXTURE_HOST_18 = /^(?:127\.0\.0\.1|(?:[a-z0-9-]+\.)*localhost):8081$/;
/** The sheet's fixture definition exactly: http on 127.0.0.1 / localhost / *.localhost at 8081, chrome://extensions, this extension's own pages. */
export function isFixture18(url: string, ownId = ""): boolean {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^\s/"'`)<>\\?#,;\]]+)/i.exec(url);
  if (!m) return false;
  const host = m[2]!.toLowerCase();
  const scheme = m[1]!.toLowerCase();
  return scheme === "http" ? FIXTURE_HOST_18.test(host) : scheme === "chrome" ? host === "extensions" : scheme === "chrome-extension" && ownId !== "" && host === ownId.toLowerCase();
}
/** token, sentinel and profile as `scanText` counts them; `://` counts only `scheme://host` matches, classed by isFixture18. */
export function scan18(text: string, ctx: ScanCtx): Scan {
  let urls = 0;
  let fixture = 0;
  for (const m of text.matchAll(/[a-z][a-z0-9+.-]*:\/\/[^\s/'"`<>)\]\\,;]*/gi)) {
    urls++;
    if (isFixture18(m[0], ctx.ownId)) fixture++;
  }
  return { ...scanText(text, ctx), urls, fixture, other: urls - fixture };
}
/** #351 (4) (a): when O2 showed no saved text the helper also prints this line (the row's verdict unchanged); null when it showed. */
export const optO2NoteLine = (shown: boolean, polledMs: number): string | null => (shown ? null : `O2 did not show the saved text in ${polledMs} ms`);
