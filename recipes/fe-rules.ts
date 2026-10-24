// recipes/fe-rules.ts: the pure verdict rules of Step 8 stage FE's live rows (docs/e2e-test-plan.md
// §4.17, wave sheet docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/FE-wave-sheet.md).
// Written 2026-10-23 before any FE build was loaded or any FE row run. Nothing here connects: the
// rules run on recorded observations, so `recipes/fe.ts selftest` dry-runs every one of them on canned
// good and bad inputs, and `fe.ts verdict` re-computes the outcome from a run's recorded JSON.
//
// The outcome table is decisions.md · 2026-10-23 · FE's rows and outcome table, amended before anything
// is measured (#78) item 2, verbatim in `readOutcome`: FE-5 void → (B); else FE-4 FAIL → (B); else every
// kind passes all trials → (A); else no kind passes → (B); else (C). One failed trial = FAIL for that
// kind; every recorded trial counts (no best-of-three).

export const HUMAN_MARKER = "fe-human";
export const BG2_TEXT = "bg2typed";
/** FE-3's key: its keydown sets the status line, and it changes no value, so no `input` event overwrites it. */
export const FE3_KEY = "ArrowLeft";
export const IDLE_STATUS = "status: idle";
export const EXPECTED = {
  click: "status: TRUSTED click received",
  type: `status: TRUSTED input = ${BG2_TEXT}`,
  pressKey: `status: TRUSTED key = ${FE3_KEY}`,
} as const;

export type InputKind = "click" | "type" | "pressKey";
export type VisEntry = [state: string, epochMs: number, kind: string];

/** A listTabs row as the FE script records it: handles and window ids only (no URL, no title). */
export interface TabLite {
  tab: string;
  windowId?: number;
  active: boolean;
  current?: boolean;
}

export interface Poll {
  s: number;
  e: number;
  tabs?: TabLite[];
  err?: string;
}

/** One input trial (FE-1, FE-2, FE-3, the FE-5 control, the FE-3c observation), as recorded. */
export interface InputTrial {
  row: "FE-1" | "FE-2" | "FE-3" | "FE-5" | "FE-3c";
  phase?: "first" | "last";
  kind: InputKind;
  trial: number;
  option: boolean;
  human: string;
  target: string;
  t0: number;
  t1: number;
  err?: string;
  result?: unknown;
  /** FE-3/FE-3c: what the focus step left focused (`document.activeElement` is `#trusted-input`). */
  focusStep?: { activeIsField: boolean };
  status: string;
  value: string;
  vis: string;
  humanLog: VisEntry[];
  targetLog: VisEntry[];
  before: TabLite[];
  polls: Poll[];
  after: TabLite[];
  /**
   * Set when a reading after the call (the target's status line, a visibility log, the final listTabs)
   * failed: the trial is still recorded and counts as a FAIL for its kind, an FE-4 FAIL, and for the
   * FE-5 control as "received" (each the conservative side; FE verifier finding 4).
   */
  readErr?: string;
}

export interface Fe0Record {
  row: "FE-0";
  build?: string;
  result?: unknown;
  err?: string;
}

export interface PositiveRecord {
  row: "POS";
  t0: number;
  t1: number;
  err?: string;
  humanLog: VisEntry[];
}

export interface CaptureRecord {
  row: "CAP";
  for: "positive" | "block";
  csv: string;
}

export type FeRecord = Fe0Record | PositiveRecord | CaptureRecord | InputTrial;

// ------------------------------------------------------------------------------------------ rows

function firstChange(log: VisEntry[], state: string, from: number): number | undefined {
  return log.find((e) => e[2] === "change" && e[0] === state && e[1] >= from)?.[1];
}

function onResult(result: unknown): boolean {
  return typeof result === "object" && result !== null && (result as { focusEmulation?: unknown }).focusEmulation === "on";
}

/** FE-0: the result carries `focusEmulation: "on"` (a stale extension ignores the param). */
export function fe0Pass(r: Fe0Record): boolean {
  return r.err === undefined && onResult(r.result);
}

/**
 * BG-1 / BG-2's PASS rule (§4.14, `recipes/t5.ts` bgInput), copied, with the option added when
 * `t.option`: no error; the result carries `focusEmulation: "on"`; the status line exact (BG-2 also the
 * field value); the target's `visibilityState` `hidden` as read after the call returned (#78 item 1);
 * the human's tab not hidden from 50 ms before the call; afterwards the human's tab active and current
 * and the target in the background. FE-3 uses the same clauses with its own status line (§4.17).
 */
export function inputTrialVerdict(t: InputTrial): { pass: boolean; exact: boolean; why: string[] } {
  const why: string[] = [];
  const exact = t.status === EXPECTED[t.kind] && (t.kind !== "type" || t.value === BG2_TEXT);
  if (t.readErr !== undefined) why.push(`evidence read failed (${t.readErr})`);
  if (t.err !== undefined) why.push(`the call failed (${t.err})`);
  if (t.option && t.err === undefined && !onResult(t.result)) why.push('no focusEmulation "on" in the result');
  if (!exact) why.push(`expected ${JSON.stringify(EXPECTED[t.kind])}${t.kind === "type" ? ` and value ${JSON.stringify(BG2_TEXT)}` : ""}`);
  if (t.vis !== "hidden") why.push(`target visibilityState ${t.vis} after the call`);
  if (firstChange(t.humanLog, "hidden", t.t0 - 50) !== undefined) why.push("the human's tab went hidden");
  const hA = t.after.find((x) => x.tab === t.human);
  const xA = t.after.find((x) => x.tab === t.target);
  if (!(hA?.active === true && hA.current === true)) why.push("the human's tab is not active and current afterwards");
  if (xA?.active !== false) why.push("the target is not in the background afterwards");
  return { pass: why.length === 0, exact, why };
}

/**
 * FE-5's control: did the page receive input at all? Any change from a fresh tab's state — the status
 * line not `status: idle`, or a non-empty field — counts (broader than the PASS rule, so the control is
 * voided more easily: the conservative side, since a void reads as (B)).
 */
export function controlReceived(t: InputTrial): boolean {
  if (t.readErr !== undefined) return true; // unreadable: it cannot show that nothing arrived
  return t.status !== IDLE_STATUS || t.value !== "";
}

/** The positive control (#78 item 3): the human's tab logged `hidden` then `visible` during the screenshot. */
export function positiveVisPass(r: PositiveRecord): { pass: boolean; hidden?: number; visible?: number } {
  const hidden = firstChange(r.humanLog, "hidden", r.t0 - 50);
  const visible = hidden === undefined ? undefined : firstChange(r.humanLog, "visible", hidden);
  return { pass: r.err === undefined && hidden !== undefined && visible !== undefined, hidden, visible };
}

function activeMap(tabs: TabLite[]): string {
  return tabs
    .filter((t) => t.active)
    .map((t) => `${t.windowId ?? "?"}:${t.tab}`)
    .sort()
    .join(",");
}

export interface Fe4Trial {
  pass: boolean;
  why: string[];
  polls: number;
  overlapping: number;
  pollErrors: number;
}

/**
 * FE-4 for one trial (#78 item 1, the human's side only): the human's tab current in every listTabs
 * read (before, each poll, after); its page logged no `hidden` at any time since the trial installed
 * the logger (stricter than BG's "from the call"); every window's active tab the same in every read;
 * the target never `active`. A failed poll fails the trial (it could not be checked). The debugging
 * banner is not judged. The foreground window and the window captures are judged over the block by
 * `blockCapture`.
 */
export function fe4TrialVerdict(t: InputTrial): Fe4Trial {
  const why: string[] = [];
  const ok = t.polls.filter((p) => p.tabs !== undefined);
  const pollErrors = t.polls.length - ok.length;
  const views: TabLite[][] = [t.before, ...ok.map((p) => p.tabs!), t.after];
  if (t.readErr !== undefined) why.push(`evidence read failed (${t.readErr})`);
  if (pollErrors > 0) why.push(`${pollErrors} listTabs poll(s) failed`);
  if (t.humanLog[0]?.[0] !== "visible") why.push("the human's tab was not visible when the logger started");
  if (t.humanLog.some((e) => e[0] === "hidden")) why.push("the human's tab logged hidden");
  if (!views.every((v) => v.find((x) => x.current === true)?.tab === t.human)) why.push("the human's tab was not current in every read");
  if (views.some((v) => v.find((x) => x.tab === t.target)?.active === true)) why.push("the target was active in its window");
  const base = activeMap(t.before);
  if (views.some((v) => activeMap(v) !== base)) why.push("a window's active tab changed");
  const overlapping = t.polls.filter((p) => p.s <= t.t1 && p.e >= t.t0).length;
  return { pass: why.length === 0, why, polls: t.polls.length, overlapping, pollErrors };
}

/** The target's own visibility during the trial: an observation (#78 item 1), not a PASS clause. */
export function targetObservation(t: InputTrial): string {
  const v = firstChange(t.targetLog, "visible", t.t0 - 50);
  const h = v === undefined ? undefined : firstChange(t.targetLog, "hidden", v);
  const rel = (x: number | undefined): string => (x === undefined ? "never" : `+${Math.round(x - t.t0)} ms`);
  return `target page visible ${rel(v)}, hidden again ${rel(h)} (start ${t.targetLog[0]?.[0] ?? "?"}; read after the call ${t.vis})`;
}

// ------------------------------------------------------------------------------- window captures

/**
 * The bar colour of one sampled `#rrggbb` (a uniform row of a window capture, quantized to steps of 8
 * by recipes/fe-win.ps1). Captures are colour-managed (CLAUDE.md: `#ff00ff` read `#dd00fa`, CDP's
 * `#00ffff` read `#97fdfd`), so the rule has slack. magenta = R ≥ 150, B ≥ 150, G ≤ 100 (§4.15's hue
 * rule); cyan = G ≥ 150, B ≥ 150, R ≤ 170 and R at least 60 below both G and B. Thresholds chosen
 * before any FE capture, with those two Step 7 readings known; the positive control checks them live.
 */
export function classifyRgb(hex: string): "magenta" | "cyan" | "other" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "other";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  if (r >= 150 && b >= 150 && g <= 100) return "magenta";
  if (g >= 150 && b >= 150 && r <= 170 && r <= Math.min(g, b) - 60) return "cyan";
  return "other";
}

export interface Frame {
  ms: number;
  fg: number;
  w: number;
  h: number;
  colours: string[];
}

/** recipes/fe-win.ps1's CSV: `ms,fg,w,h,colours` with colours `;`-separated. */
export function parseFrames(csv: string): Frame[] {
  const out: Frame[] = [];
  for (const line of csv.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("ms,")) continue;
    const [ms, fg, w, h, colours = ""] = line.split(",");
    const f: Frame = { ms: Number(ms), fg: Number(fg), w: Number(w), h: Number(h), colours: colours ? colours.split(";").filter(Boolean) : [] };
    if (Number.isFinite(f.ms)) out.push(f);
  }
  return out.sort((a, b) => a.ms - b.ms);
}

export function frameShows(f: Frame, colour: "magenta" | "cyan"): boolean {
  return f.colours.some((c) => classifyRgb(c) === colour);
}

export interface CaptureVerdict {
  status: "pass" | "fail" | "void";
  why: string[];
  frames: number;
}

/**
 * The capture loop's positive control (FE-4's window-capture clause): during the default-mode
 * screenshot's flash the loop must see the target's magenta bar — at least one frame in [t0, t1 + 500]
 * shows magenta — and none of the frames in the 3 s before the call (at least one) shows magenta.
 * Fail = the clause is void and the run escalates (never silently dropped).
 */
export function positiveCapture(frames: Frame[], t0: number, t1: number): CaptureVerdict {
  const why: string[] = [];
  const pre = frames.filter((f) => f.ms >= t0 - 3000 && f.ms < t0);
  const during = frames.filter((f) => f.ms >= t0 && f.ms <= t1 + 500);
  if (pre.length === 0) why.push("no frame in the 3 s before the call");
  if (pre.some((f) => frameShows(f, "magenta"))) why.push("magenta already before the call");
  if (!during.some((f) => frameShows(f, "magenta"))) why.push("no frame shows the target's magenta bar during the flash");
  return { status: why.length === 0 ? "pass" : "fail", why, frames: pre.length + during.length };
}

/**
 * FE-4's window clauses over the block FE-1…FE-3 (#78 item 1): no frame from 500 ms before the first
 * call to 1500 ms after the last shows the target's magenta bar, and the foreground window is the same
 * in every frame of that span. Void (the clause could not be judged ⇒ escalate) unless, for every
 * trial, a frame lies in [t0 − 1000, t0] and one in [t1, t1 + 1000], with no gap over 1000 ms between
 * frames in [t0 − 1000, t1 + 1000].
 */
export function blockCapture(frames: Frame[], trials: { t0: number; t1: number }[]): CaptureVerdict {
  const why: string[] = [];
  if (trials.length === 0) return { status: "void", why: ["no FE-1…FE-3 trials recorded"], frames: 0 };
  for (const t of trials) {
    const win = frames.filter((f) => f.ms >= t.t0 - 1000 && f.ms <= t.t1 + 1000);
    const hasPre = win.some((f) => f.ms <= t.t0);
    const hasPost = win.some((f) => f.ms >= t.t1);
    let gap = 0;
    for (let i = 1; i < win.length; i++) gap = Math.max(gap, win[i].ms - win[i - 1].ms);
    if (!hasPre || !hasPost || gap > 1000) {
      return { status: "void", why: [`capture does not cover the call at ${t.t0} (frame before: ${hasPre}, after: ${hasPost}, largest gap ${gap} ms)`], frames: win.length };
    }
  }
  const start = Math.min(...trials.map((t) => t.t0)) - 500;
  const end = Math.max(...trials.map((t) => t.t1)) + 1500;
  const span = frames.filter((f) => f.ms >= start && f.ms <= end);
  const shown = span.filter((f) => frameShows(f, "magenta"));
  if (shown.length > 0) why.push(`${shown.length} frame(s) show the target's magenta bar (first at ${shown[0].ms})`);
  const fgs = new Set(span.map((f) => f.fg));
  if (fgs.size > 1) why.push(`the foreground window changed (${fgs.size} different windows in the span)`);
  return { status: why.length === 0 ? "pass" : "fail", why, frames: span.length };
}

// --------------------------------------------------------------------------------------- outcome

export type Policy = "focusEmulation" | "focusFirst";

export interface Outcome {
  kind: "A" | "B" | "C" | "STOP" | "INCOMPLETE";
  lines: string[];
  perKind?: Record<InputKind, Policy>;
}

const ROW_OF: Record<InputKind, "FE-1" | "FE-2" | "FE-3"> = { click: "FE-1", type: "FE-2", pressKey: "FE-3" };

/**
 * The outcome, by the table of #78 (precedence verbatim), after three gates that are not outcomes:
 * the last FE-0 record PASSes and precedes every trial ("FE-0 FAIL is stop, reload, re-check"); the
 * positive control's page-timestamp part passed (else FE-4's page clause is not discriminating: the run
 * stops and escalates); the capture loop's positive control passed and the block capture is not void
 * (else FE-4's window clause is void: escalate). `frames` maps a CAP record's csv path to its frames.
 */
export function readOutcome(records: FeRecord[], frames: (csv: string) => Frame[]): Outcome {
  const lines: string[] = [];
  const stop = (why: string): Outcome => ({ kind: "STOP", lines: [...lines, `STOP — ${why}`] });
  const trials = records.filter((r): r is InputTrial => "kind" in r && "trial" in r);
  const firstTrialAt = records.findIndex((r) => "kind" in r && "trial" in r);

  const fe0Idx = records.map((r) => r.row).lastIndexOf("FE-0");
  const fe0 = fe0Idx >= 0 ? (records[fe0Idx] as Fe0Record) : undefined;
  if (!fe0) return stop("no FE-0 record: run the stale check first (#78)");
  if (!fe0Pass(fe0)) return stop("FE-0 FAIL — stop, reload, re-check; not an outcome (#78)");
  if (firstTrialAt >= 0 && firstTrialAt < fe0Idx) return stop("an FE-0 record follows a trial: the run's rows must all follow the passing FE-0");
  lines.push(`FE-0: PASS (daemon build ${fe0.build ?? "?"})`);

  // EVERY positive-control record must pass, not only the last: a failed control stops the run and is
  // never "repaired" by a re-run (§4.17; FE verifier finding 2). Each capture judgement is read against
  // the positive control recorded before it.
  if (!records.some((r) => r.row === "POS")) return stop("the positive control was not run");
  if (records.some((r) => r.row === "POS" && !positiveVisPass(r).pass)) {
    return stop("positive control FAIL — FE-4's page-timestamp clause is not discriminating; the run stops and escalates (#78 item 3)");
  }
  let lastPos: PositiveRecord | undefined;
  let capSeen = false;
  for (const r of records) {
    if (r.row === "POS") lastPos = r;
    if (r.row === "CAP" && r.for === "positive") {
      capSeen = true;
      const cp = lastPos ? positiveCapture(frames(r.csv), lastPos.t0, lastPos.t1) : { status: "fail", why: ["no positive control recorded before it"] };
      if (cp.status !== "pass") return stop(`the capture loop's positive control FAIL (${cp.why.join("; ")}) — FE-4's window-capture clause is void; escalate`);
    }
  }
  if (!capSeen) return stop("the capture loop's positive control was not run — FE-4's window-capture clause is void; escalate");
  lines.push("positive control: page timestamps PASS; capture loop PASS");

  const count = (row: string, kind: InputKind, phase?: string): InputTrial[] =>
    trials.filter((t) => t.row === row && t.kind === kind && (phase === undefined || t.phase === phase));
  const missing: string[] = [];
  for (const phase of ["first", "last"]) {
    for (const kind of ["click", "type"] as const) if (count("FE-5", kind, phase).length < 3) missing.push(`FE-5 ${phase} ${kind === "click" ? "BG-1" : "BG-2"}`);
  }
  for (const kind of ["click", "type", "pressKey"] as const) if (count(ROW_OF[kind], kind).length < 3) missing.push(ROW_OF[kind]);
  if (missing.length) return { kind: "INCOMPLETE", lines: [...lines, `INCOMPLETE — fewer than 3 recorded trials: ${missing.join(", ")}; no outcome`] };

  const capBlock = [...records].reverse().find((r): r is CaptureRecord => r.row === "CAP" && r.for === "block");
  if (!capBlock) return stop("no capture of the FE-1…FE-3 block — FE-4's window-capture clause is void; escalate");
  const fe = trials.filter((t) => t.row === "FE-1" || t.row === "FE-2" || t.row === "FE-3");
  const cb = blockCapture(frames(capBlock.csv), fe);
  if (cb.status === "void") return stop(`the block capture is void (${cb.why.join("; ")}) — FE-4's window-capture clause cannot be judged; escalate`);

  const fe5 = trials.filter((t) => t.row === "FE-5");
  const received = (phase: string, kind: InputKind): number => fe5.filter((t) => t.phase === phase && t.kind === kind && controlReceived(t)).length;
  const n5 = (phase: string, kind: InputKind): number => count("FE-5", kind, phase).length;
  const fe5Void = fe5.some(controlReceived);
  lines.push(
    `FE-5 (first): BG-1 received input in ${received("first", "click")}/${n5("first", "click")}, BG-2 in ${received("first", "type")}/${n5("first", "type")}; ` +
      `(last): BG-1 ${received("last", "click")}/${n5("last", "click")}, BG-2 ${received("last", "type")}/${n5("last", "type")} → ${fe5Void ? "VOID (the control received input)" : "control holds"}`,
  );

  const kindPass = {} as Record<InputKind, boolean>;
  for (const kind of ["click", "type", "pressKey"] as const) {
    const ts = count(ROW_OF[kind], kind);
    const passed = ts.filter((t) => t.option && inputTrialVerdict(t).pass).length;
    kindPass[kind] = passed === ts.length;
    lines.push(`${ROW_OF[kind]} (${kind}): ${passed}/${ts.length} trials PASS → ${kindPass[kind] ? "PASS" : "FAIL"}`);
  }
  const fe4Trials = fe.map(fe4TrialVerdict);
  const fe4TrialsPass = fe4Trials.filter((v) => v.pass).length;
  const fe4 = fe4TrialsPass === fe.length && cb.status === "pass";
  lines.push(`FE-4: trials ${fe4TrialsPass}/${fe.length} PASS; window capture ${cb.status === "pass" ? "PASS (no frame shows the target; foreground constant)" : `FAIL (${cb.why.join("; ")})`} → ${fe4 ? "PASS" : "FAIL"}`);

  // The table (#78 item 2), in this order.
  if (fe5Void) return { kind: "B", lines: [...lines, 'OUTCOME (B) — FE-5 void: the comparison is void; policy "focusFirst"; listed for the user (#78)'] };
  if (!fe4) return { kind: "B", lines: [...lines, 'OUTCOME (B) — FE-4 FAIL: policy "focusFirst"'] };
  const kinds = ["click", "type", "pressKey"] as const;
  if (kinds.every((k) => kindPass[k])) return { kind: "A", lines: [...lines, 'OUTCOME (A) — every kind passes all trials and FE-4 PASS: policy "focusEmulation"'] };
  if (kinds.every((k) => !kindPass[k])) return { kind: "B", lines: [...lines, 'OUTCOME (B) — no kind passes: policy "focusFirst"'] };
  const perKind = Object.fromEntries(kinds.map((k) => [k, kindPass[k] ? "focusEmulation" : "focusFirst"])) as Record<InputKind, Policy>;
  const submit = perKind.type === "focusEmulation" && perKind.pressKey === "focusEmulation" ? "focusEmulation" : "focusFirst";
  return {
    kind: "C",
    perKind,
    lines: [
      ...lines,
      `OUTCOME (C) — per kind: click ${perKind.click}, type ${perKind.type}, pressKey ${perKind.pressKey}; type {submit} takes the stricter of type and pressKey: ${submit} (#78 item 4)`,
    ],
  };
}
