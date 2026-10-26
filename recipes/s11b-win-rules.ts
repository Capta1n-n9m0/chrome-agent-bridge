// recipes/s11b-win-rules.ts - the pure half of recipes/s11b-win.ps1 (Step 11b S4-helpers H6; docs/e2e-test-plan.md 4.24).
// No I/O, no process, no clock. The PowerShell helpers mirror these rules; recipes/test/s11b-win-static.test.ts ties each
// literal and runs the PowerShell functions on the same cases. Nothing here returns a path under the user's profile.
import { win32 } from "node:path";
import { scanPs1Output } from "./s11-win-rules.js";

/** RD-6: the only URLs Open-S11bWindow may type: the redirector (8083) and the allowed fixture (8081), on loopback names. */
export const S11B_URL_RE = /^http:\/\/(127\.0\.0\.1|localhost):(8083|8081)(\/|$)/;
export const allowedS11bUrl = (url: string): boolean => S11B_URL_RE.test(url);

/** F-FILETAB: a file may be opened as a `file:` page only when it lies strictly under the wave's ROOT (drive-letter paths only). */
export function fileUnderRoot(root: string, file: string): boolean {
  if (!root || !file) return false;
  if (!/^[A-Za-z]:[\\/]/.test(root) || !/^[A-Za-z]:[\\/]/.test(file)) return false;
  const r = win32.resolve(root).replace(/\\+$/, "");
  const f = win32.resolve(file);
  if (r.length < 4) return false; // a drive root
  return f.toLowerCase().startsWith(r.toLowerCase() + "\\") && f.length > r.length + 1;
}

/** The DevTools window of the worker: recorded at open time by the wave (Wait-S9NewWindow) and titled DevTools (Format-S9Title). */
export const consoleWindowOk = (title: string, recordedByWave: boolean): boolean => recordedByWave && /^(DevTools|<DevTools window>)/.test(title);

/** The console's round trip: a separate, fixed, pattern-free expression whose output line is unique (epoch ms). */
export const markerExpression = (n: number): string => `void console.log("S11B-MARK ${n}")`;
export const markerLine = (n: number): string => `S11B-MARK ${n}`;
/** The console text after the LAST whole-line marker (so an older identical result, or a collapsed repeat, never counts). */
export function tailAfterMarker(lines: readonly string[], n: number): string[] | null {
  const m = markerLine(n);
  let at = -1;
  lines.forEach((l, i) => {
    if (l === m) at = i;
  });
  return at < 0 ? null : lines.slice(at + 1);
}

/** SendKeys metacharacters are wrapped in braces; text must be one ASCII line. */
export function escapeSendKeys(text: string): string | null {
  if (!/^[\x20-\x7e]*$/.test(text)) return null;
  return text.replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);
}

/** The only B17 lines the helper prints (anchored: the console's echo of the typed input can never match). */
export const S11B_PRINTABLE_RE = /^(MANIFEST |RULES |CTX |REGEX |STORED |STOREDAT |EXPR |ROW |STOP: |NOT MEASURED: |FALLBACK: )/;
export const FALLBACK_LINE = "FALLBACK: console eval unavailable";
/** Returned by Invoke-S11bConsoleEval beside B17's own exits (0 pass, 1 fail, 2 STOP, 3 not measured / not discriminating). */
export const FALLBACK_CODE = 10;

export const S11B_SUBS = ["manifest", "rules", "ctx", "regex", "stored", "mark"] as const;
/** One sampler pass per refusal id (builder 5, section 5 item 3). */
export const S11B_SAMPLER_IDS = ["R17-UP-6-outside", "R17-UP-6-missing", "R17-UP-6-relative", "R17-UP-6-raw-dotdot", "R17-UP-6-raw-notarget", "F-RAW", "F-RAW-2", "F-RAW-DIR"] as const;

/** Output scan of s11b-win.ps1: the one line that prints B17's filtered lines carries this marker and is the only exemption. */
export const PRINT_OK_MARK = "# s11b-print-ok";
export function scanS11bOutput(src: string): string[] {
  return scanPs1Output(src.split(/\r?\n/).map((l) => (l.includes(PRINT_OK_MARK) ? "" : l)).join("\n"));
}
