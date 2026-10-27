// Step 12 S1-helpers-a: pure rules for Run 18's helpers (docs/e2e-test-plan.md section 4.26). Self-contained (node only), so the
// s6 typecheck can compile its tests. recipes/s12-win.ps1 mirrors the constants; recipes/test/s12-helpers.test.ts ties them.
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

export interface BannerCtl { idleMs: number; neg: "seen" | "none"; pos: "seen" | "none"; posAnswer: string; negPolls?: number; posPolls?: number }
export const bannerCtlPass = (c: Pick<BannerCtl, "idleMs" | "neg" | "pos" | "posAnswer">): boolean =>
  c.neg === "none" && c.pos === "seen" && c.posAnswer === "ok" && c.idleMs >= IDLE_MIN_MS;
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
