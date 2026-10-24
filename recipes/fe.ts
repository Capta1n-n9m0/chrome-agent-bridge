// recipes/fe.ts: the SDK-side steps of Step 8 stage FE's live rows — focus emulation for trusted input
// (docs/e2e-test-plan.md §4.17; wave sheet
// docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/FE-wave-sheet.md). Written 2026-10-23,
// before any FE build was loaded or any FE row run; the rows' expected texts are the lines this
// script prints, and every verdict rule is a pure function in recipes/fe-rules.ts.
//
//   npx tsx recipes/fe.ts <command> [args]
//
//   check                      FE-0: a trusted click with focusEmulation:true must answer focusEmulation "on"
//   control --phase first|last FE-5: BG-1 and BG-2 without the option, three trials each
//   positive                   the positive control: a default-mode screenshot of a background target
//   fe1 | fe2 | fe3            FE-1 / FE-2 / FE-3 with focusEmulation:true, three trials each
//   fe3 --control              FE-3c (an observation, not in the table): FE-3 without the option
//   frames <csv> --for positive|block   judge recipes/fe-win.ps1's capture against the recorded calls
//   verdict [--results <jsonl>] [--csv-positive <csv>] [--csv-block <csv>]
//                              read the run's records and print the outcome by #78's table
//   selftest                   dry-run every rule on canned inputs (connects to nothing)
//
// Records go to $FE_OUT/fe-results.jsonl (default %TEMP%\bridge-e2e\fe): one JSON line per FE-0,
// positive control, capture judgement and trial — handles, window ids, the fixture's status line and
// visibility logs, never a URL or a title. Every tab acted on is a fixture tab
// (`?t5=<marker>`, t5-lib.ts `urlOf`); the human's tab must be the driver's `?t5=fe-human` tab.
// Exit code 0 = the script ran (read its PASS/FAIL line), 1 = it failed, 2 = a set-up problem
// (nothing measured), 3 = the driver's window is hidden or covered — as recipes/t5.ts.
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BridgeClient } from "@bridge/sdk";
import type { SnapshotResult } from "@bridge/shared";
import {
  barExpression,
  byMarker,
  connectAs,
  COLOURS,
  describeError,
  evalJson,
  listTabs,
  requireFixtureCurrent,
  run,
  say,
  sleep,
  urlOf,
  VISLOG_INSTALL,
  VISLOG_READ,
  type ListedTab,
} from "./t5-lib.js";
import {
  BG2_TEXT,
  blockCapture,
  classifyRgb,
  controlReceived,
  EXPECTED,
  FE3_KEY,
  fe0Pass,
  fe4TrialVerdict,
  HUMAN_MARKER,
  IDLE_STATUS,
  inputTrialVerdict,
  parseFrames,
  positiveCapture,
  positiveVisPass,
  readOutcome,
  targetObservation,
  type CaptureRecord,
  type Fe0Record,
  type FeRecord,
  type Frame,
  type InputKind,
  type InputTrial,
  type Poll,
  type PositiveRecord,
  type TabLite,
  type VisEntry,
} from "./fe-rules.js";

const [command = "", ...rest] = process.argv.slice(2);
const OUT = process.env.FE_OUT?.trim() || join(tmpdir(), "bridge-e2e", "fe");
const RESULTS = join(OUT, "fe-results.jsonl");
const TRIALS = 3;
const POLL_MS = 25;

function option(name: string): string | undefined {
  const i = rest.indexOf(name);
  return i >= 0 && i + 1 < rest.length ? rest[i + 1] : undefined;
}

function record(r: FeRecord): void {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(RESULTS, JSON.stringify({ ...r, ts: new Date().toISOString() }) + "\n");
}

function readRecords(file = RESULTS): FeRecord[] {
  if (!existsSync(file)) throw new Error(`SET-UP: no records at ${file} — set FE_OUT to the run's directory`);
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as FeRecord);
}

function lite(tabs: ListedTab[]): TabLite[] {
  return tabs.map((t) => ({ tab: t.tab, windowId: t.windowId, active: t.active, current: t.current }));
}

async function newTab(client: BridgeClient, name: string, marker: string): Promise<string> {
  const r = (await client.call("newTab", { url: urlOf(marker), active: false })) as { tab?: string };
  if (typeof r.tab !== "string") throw new Error("SET-UP: newTab answered without a handle — is the daemon a Step 7 build?");
  const owner = (await listTabs(client)).find((t) => t.tab === r.tab)?.owner;
  if (owner !== name) throw new Error(`newTab's tab ${r.tab} is not leased to its opener (owner: ${owner ?? "none"})`);
  return r.tab;
}

/** The driver's tab: the `?t5=fe-human` fixture tab, which must be the human's tab (current). */
function humanOf(tabs: ListedTab[]): ListedTab {
  requireFixtureCurrent(tabs);
  const h = byMarker(tabs, HUMAN_MARKER);
  if (!h || h.current !== true) throw new Error(`SET-UP: the ${HUMAN_MARKER} tab is not the human's tab (current) — focus the driver's window`);
  return h;
}

/** Installs the human's-tab visibility logger; refuses (exit 3) unless the tab reads `visible` (B4). */
async function humanVisible(client: BridgeClient, tab: string, name: string): Promise<boolean> {
  const state = await evalJson<string>(client, tab, VISLOG_INSTALL);
  if (state !== "visible") {
    say(name, `SET-UP: the human's tab reports visibilityState ${state} — the driver's window is minimized or covered; uncover it (Set-T5Topmost) and rerun`);
    process.exitCode = 3;
    return false;
  }
  return true;
}

function refOf(snap: SnapshotResult, role: string, label: string): string {
  const el = snap.elements.find((e) => e.role === role && e.name === label);
  if (!el) throw new Error(`no ${role} "${label}" in the target's snapshot`);
  return el.ref;
}

function startPoller(client: BridgeClient): { stop: () => Promise<Poll[]> } {
  const polls: Poll[] = [];
  let running = true;
  const loop = (async () => {
    while (running) {
      const s = Date.now();
      try {
        polls.push({ s, e: Date.now(), tabs: lite(await listTabs(client)) });
        polls[polls.length - 1].e = Date.now();
      } catch (err) {
        polls.push({ s, e: Date.now(), err: describeError(err) });
      }
      await sleep(POLL_MS);
    }
  })();
  return {
    stop: async () => {
      running = false;
      await loop;
      return polls;
    },
  };
}

/** A trial's label in the printed lines: `FE-1 trial 2`, `FE-5 (first) BG-2 trial 1`. */
function tagOf(s: { row: string; kind: InputKind; trial: number; phase?: string }): string {
  const kind = s.row === "FE-5" ? ` ${s.kind === "click" ? "BG-1" : "BG-2"}` : "";
  return `${s.row}${s.phase ? ` (${s.phase})` : ""}${kind} trial ${s.trial}`;
}

const READ_TARGET = `({ status: document.getElementById('status').textContent, value: document.getElementById('trusted-input').value, vis: document.visibilityState })`;
const FOCUS_FIELD = `(() => { const el = document.getElementById('trusted-input'); el.focus(); return document.activeElement === el; })()`;

/**
 * One trial on a fresh background fixture tab: bars (human cyan, target magenta), the visibility
 * loggers, the target's ref, a listTabs poller every 25 ms around the call, the call, then — after it
 * returned — the target's status line, field and visibilityState, both logs and a final listTabs. The
 * same code runs with and without the option, so the control differs from the treatment by the param.
 */
async function inputTrial(
  client: BridgeClient,
  name: string,
  spec: { row: InputTrial["row"]; kind: InputKind; option: boolean; trial: number; phase?: "first" | "last" },
): Promise<InputTrial | undefined> {
  const h = humanOf(await listTabs(client));
  const marker = `${spec.row.toLowerCase()}${spec.phase ? `-${spec.phase}` : ""}-${spec.kind}-${spec.trial}`;
  const x = await newTab(client, name, marker);
  try {
    await evalJson(client, h.tab, barExpression(COLOURS.cyan, "HUMAN"));
    await evalJson(client, x, barExpression(COLOURS.magenta, `${spec.row} TARGET`));
    if (!(await humanVisible(client, h.tab, name))) return undefined;
    const xState = await evalJson<string>(client, x, VISLOG_INSTALL);
    const snap = (await client.call("snapshot", { tab: x })) as SnapshotResult;
    const label = spec.kind === "click" ? "Trusted-only button" : "Trusted-only input";
    const ref = spec.kind === "pressKey" ? undefined : refOf(snap, spec.kind === "click" ? "button" : "textbox", label);
    let focusStep: InputTrial["focusStep"];
    if (spec.kind === "pressKey") focusStep = { activeIsField: await evalJson<boolean>(client, x, FOCUS_FIELD) };
    const tag = tagOf(spec);
    say(name, `${tag}: human ${h.tab}; target ${x} (background, leased to ${name}); target visibilityState ${xState}${focusStep ? `; focus step (evaluate el.focus()): document.activeElement is #trusted-input: ${focusStep.activeIsField ? "yes" : "no"}` : ""}`);
    const extra = spec.option ? { focusEmulation: true } : {};
    const call = (): Promise<unknown> => {
      if (spec.kind === "click") return client.call("click", { ref, trusted: true, tab: x, ...extra }, { timeoutMs: 20_000 });
      if (spec.kind === "type") return client.call("type", { ref, text: BG2_TEXT, trusted: true, submit: false, tab: x, ...extra }, { timeoutMs: 20_000 });
      return client.call("pressKey", { key: FE3_KEY, trusted: true, tab: x, ...extra }, { timeoutMs: 20_000 });
    };
    const before = lite(await listTabs(client));
    const poller = startPoller(client);
    await sleep(POLL_MS * 2);
    const t0 = Date.now();
    let result: unknown;
    let err: string | undefined;
    try {
      result = await call();
    } catch (e) {
      err = describeError(e);
    }
    const t1 = Date.now();
    await sleep(POLL_MS * 2);
    const polls = await poller.stop();
    const what = spec.kind === "click" ? `click ${ref} trusted` : spec.kind === "type" ? `type ${ref} ${JSON.stringify(BG2_TEXT)} trusted` : `pressKey ${FE3_KEY} trusted`;
    say(name, `${tag}: ${what}${spec.option ? " focusEmulation:true" : ""} → ${err ?? `ok ${JSON.stringify(result)}`} (${t1 - t0} ms)`);
    // The readings after the call. If one fails, the trial is still recorded, as a FAIL with the error
    // text (fe-rules `readErr`), never left out of the verdict (FE verifier finding 4).
    let got = { status: "", value: "", vis: "unread" };
    let humanLog: VisEntry[] = [];
    let targetLog: VisEntry[] = [];
    let after: TabLite[] = [];
    let readErr: string | undefined;
    try {
      got = await evalJson<{ status: string; value: string; vis: string }>(client, x, READ_TARGET);
      humanLog = await evalJson<VisEntry[]>(client, h.tab, VISLOG_READ);
      targetLog = await evalJson<VisEntry[]>(client, x, VISLOG_READ);
      after = lite(await listTabs(client));
    } catch (e) {
      readErr = describeError(e);
    }
    const t: InputTrial = { ...spec, human: h.tab, target: x, t0, t1, err, result, focusStep, status: got.status, value: got.value, vis: got.vis, humanLog, targetLog, before, polls, after, readErr };
    record(t);
    if (readErr !== undefined) say(name, `${tag}: evidence read failed — ${readErr} (recorded; the trial counts as a FAIL)`);
    say(name, `${tag}: target status ${JSON.stringify(got.status)}; field value ${JSON.stringify(got.value)}; target visibilityState ${got.vis} (read after the call returned)`);
    const f4 = fe4TrialVerdict(t);
    say(name, `${tag}: human's side — listTabs reads ${f4.polls} polls (${f4.overlapping} overlapping the call) + before/after; ${f4.pass ? "human current, never hidden; window active tabs unchanged; target never active" : f4.why.join("; ")} → FE-4 trial ${f4.pass ? "PASS" : "FAIL"}`);
    say(name, `${tag}: observation — ${targetObservation(t)}`);
    return t;
  } finally {
    try {
      await client.call("closeTab", { tab: x });
    } catch (e) {
      say(name, `closeTab ${x} → ${describeError(e)}`);
    }
  }
}

// ---------------------------------------------------------------------------------------- FE-0

async function check(): Promise<void> {
  const name = "fe-check";
  const client = await connectAs(name);
  try {
    const w = client.welcome;
    say(name, `connected as client ${w?.clientId ?? "?"} — daemon build ${w?.build ?? "?"}, proto ${w?.proto ?? "?"}, extension ${client.extensionConnected ? "connected" : "not connected"}`);
    const h = humanOf(await listTabs(client));
    const x = await newTab(client, name, "fe0");
    try {
      say(name, `human ${h.tab} (fixture page); target ${x} (background, leased to ${name})`);
      const snap = (await client.call("snapshot", { tab: x })) as SnapshotResult;
      const ref = refOf(snap, "button", "Trusted-only button");
      const t0 = Date.now();
      let result: unknown;
      let err: string | undefined;
      try {
        result = await client.call("click", { ref, trusted: true, focusEmulation: true, tab: x }, { timeoutMs: 20_000 });
      } catch (e) {
        err = describeError(e);
      }
      say(name, `click ${ref} trusted focusEmulation:true → ${err ?? `ok ${JSON.stringify(result)}`} (${Date.now() - t0} ms)`);
      const r: Fe0Record = { row: "FE-0", build: w?.build, result, err };
      record(r);
      if (fe0Pass(r)) say(name, 'FE-0 PASS — the result carries focusEmulation "on": the extension is the FE build');
      else {
        say(name, 'FE-0 FAIL — no focusEmulation "on" in the result ⇒ stop, reload, re-check (not an outcome; #78)');
        process.exitCode = 1;
      }
    } finally {
      await client.call("closeTab", { tab: x }).catch(() => undefined);
    }
  } finally {
    client.close();
  }
}

// -------------------------------------------------------------------------------- trial commands

async function trials(row: InputTrial["row"], kinds: InputKind[], optionOn: boolean, phase?: "first" | "last"): Promise<void> {
  const name = row.toLowerCase();
  const client = await connectAs(name);
  try {
    const done: InputTrial[] = [];
    for (const kind of kinds) {
      for (let k = 1; k <= TRIALS; k++) {
        const t = await inputTrial(client, name, { row, kind, option: optionOn, trial: k, phase });
        if (!t) return; // exit 3 already set
        done.push(t);
        const v = inputTrialVerdict(t);
        const tag = tagOf({ row, kind, trial: k, phase });
        if (row === "FE-5") say(name, `${tag}: ${kind === "click" ? "BG-1" : "BG-2"}'s rule ${v.pass ? "PASS" : "FAIL"}; received input: ${controlReceived(t) ? "yes" : "no"}`);
        else say(name, `${tag}: ${v.pass ? "PASS" : `FAIL — ${v.why.join("; ")}`}`);
      }
    }
    if (row === "FE-5") {
      const by = (kind: InputKind) => done.filter((t) => t.kind === kind);
      const got = (kind: InputKind) => by(kind).filter(controlReceived).length;
      const voided = done.some(controlReceived);
      say(name, `FE-5 control (${phase}) — BG-1 received input in ${got("click")}/${by("click").length} trials, BG-2 in ${got("type")}/${by("type").length}; control ${voided ? "VOID (received input)" : "holds"}`);
    } else if (row === "FE-3c") {
      const got = done.filter((t) => t.status === EXPECTED.pressKey).length;
      say(name, `FE-3c observation (not in the outcome table) — without the option the key reached the page in ${got}/${done.length} trials`);
    } else {
      const passed = done.filter((t) => inputTrialVerdict(t).pass).length;
      const f4 = done.filter((t) => fe4TrialVerdict(t).pass).length;
      say(name, `${row} ${passed === done.length ? "PASS" : "FAIL"} — ${passed}/${done.length} trials PASS; FE-4 trials ${f4}/${done.length} PASS (the window clauses: frames --for block)`);
    }
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------------- positive

async function positive(): Promise<void> {
  const name = "fe-positive";
  const client = await connectAs(name);
  try {
    const h = humanOf(await listTabs(client));
    const x = await newTab(client, name, "fe-pos");
    try {
      await evalJson(client, h.tab, barExpression(COLOURS.cyan, "HUMAN"));
      await evalJson(client, x, barExpression(COLOURS.magenta, "FE POSITIVE TARGET"));
      if (!(await humanVisible(client, h.tab, name))) return;
      say(name, `human ${h.tab} (cyan bar); target ${x} (magenta bar, background, leased to ${name})`);
      await sleep(1000);
      const t0 = Date.now();
      let err: string | undefined;
      try {
        await client.call("screenshot", { tab: x }, { timeoutMs: 20_000 });
      } catch (e) {
        err = describeError(e);
      }
      const t1 = Date.now();
      await sleep(1500);
      const humanLog = await evalJson<VisEntry[]>(client, h.tab, VISLOG_READ);
      const r: PositiveRecord = { row: "POS", t0, t1, err, humanLog };
      record(r);
      const v = positiveVisPass(r);
      const rel = (t: number | undefined) => (t === undefined ? "never" : `+${Math.round(t - t0)} ms`);
      say(name, `screenshot ${x} (default mode) → ${err ?? "ok"}; call ${t0} → ${t1} (${t1 - t0} ms)`);
      say(name, `human tab hidden ${rel(v.hidden)}, visible again ${rel(v.visible)}`);
      if (v.pass) say(name, "POSITIVE (page timestamps) PASS — the human's-tab logger saw hidden → visible");
      else {
        say(name, "POSITIVE (page timestamps) FAIL — FE-4's page-timestamp clause is not discriminating ⇒ the run stops and escalates (#78 item 3)");
        process.exitCode = 1;
      }
    } finally {
      await client.call("closeTab", { tab: x }).catch(() => undefined);
    }
  } finally {
    client.close();
  }
}

// ------------------------------------------------------------------------------------ frames

function framesCmd(): void {
  const name = "fe-frames";
  const csv = rest.find((a) => !a.startsWith("--") && a !== option("--for"));
  const which = option("--for");
  if (!csv || (which !== "positive" && which !== "block")) throw new Error("SET-UP: usage: frames <csv> --for positive|block");
  if (!existsSync(csv)) throw new Error(`SET-UP: no capture file ${csv}`);
  const frames = parseFrames(readFileSync(csv, "utf8"));
  const records = readRecords();
  const count = (c: "magenta" | "cyan") => frames.filter((f) => f.colours.some((x) => classifyRgb(x) === c)).length;
  say(name, `${frames.length} frames; frames showing magenta ${count("magenta")}, cyan ${count("cyan")}`);
  if (which === "positive") {
    const pos = [...records].reverse().find((r): r is PositiveRecord => r.row === "POS");
    if (!pos) throw new Error("SET-UP: no positive-control record — run `positive` first");
    const v = positiveCapture(frames, pos.t0, pos.t1);
    record({ row: "CAP", for: "positive", csv } satisfies CaptureRecord);
    say(name, `POSITIVE (capture loop) ${v.status === "pass" ? "PASS — a frame during the flash shows the target's magenta bar; none before" : `FAIL — ${v.why.join("; ")} ⇒ FE-4's window-capture clause is void; escalate`}`);
    if (v.status !== "pass") process.exitCode = 1;
    return;
  }
  const fe = records.filter((r): r is InputTrial => "kind" in r && (r.row === "FE-1" || r.row === "FE-2" || r.row === "FE-3"));
  const v = blockCapture(frames, fe);
  record({ row: "CAP", for: "block", csv } satisfies CaptureRecord);
  const text = v.status === "pass" ? "PASS — no frame shows the target; the foreground window never changed" : v.status === "void" ? `VOID — ${v.why.join("; ")} ⇒ the clause cannot be judged; escalate` : `FAIL — ${v.why.join("; ")}`;
  say(name, `FE-4 (window capture over ${fe.length} trials, ${v.frames} frames) ${text}`);
  if (v.status !== "pass") process.exitCode = 1;
}

// ----------------------------------------------------------------------------------- verdict

/** The frames of a CAP record's csv; `over` replaces the recorded paths (a verifier's attached copies). */
function frameLoader(records: FeRecord[], over: Record<string, string | undefined>): (csv: string) => Frame[] {
  const cache = new Map<string, Frame[]>();
  return (csv: string): Frame[] => {
    const rec = records.find((r): r is CaptureRecord => r.row === "CAP" && r.csv === csv);
    const path = (rec && over[rec.for]) || csv;
    if (!cache.has(path)) cache.set(path, existsSync(path) ? parseFrames(readFileSync(path, "utf8")) : []);
    return cache.get(path)!;
  };
}

function verdict(): void {
  const name = "fe-verdict";
  const records = readRecords(option("--results") ?? RESULTS);
  const frames = frameLoader(records, { positive: option("--csv-positive"), block: option("--csv-block") });
  const o = readOutcome(records, frames);
  for (const l of o.lines) say(name, l);
  if (o.kind === "STOP" || o.kind === "INCOMPLETE") process.exitCode = 1;
}

// ---------------------------------------------------------------------------------- selftest

function selftest(): void {
  const name = "fe-selftest";
  let n = 0;
  let bad = 0;
  const expect = (label: string, got: unknown, want: unknown): void => {
    n++;
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) bad++;
    say(name, `${ok ? "ok" : "MISMATCH"} — ${label}${ok ? "" : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  };

  const T0 = 1_000_000;
  const human: TabLite = { tab: "T1", windowId: 1, active: true, current: true };
  const userTab: TabLite = { tab: "T9", windowId: 2, active: true };
  const tabs = (targetActive = false, humanCurrent = true): TabLite[] => [
    { ...human, current: humanCurrent, active: !targetActive },
    { tab: "T5", windowId: 1, active: targetActive },
    userTab,
  ];
  const visLog = (hiddenAt?: number): VisEntry[] => [["visible", T0 - 2000, "start"], ...(hiddenAt ? ([["hidden", hiddenAt, "change"], ["visible", hiddenAt + 1500, "change"]] as VisEntry[]) : [])];
  const mk = (o: Partial<InputTrial> = {}): InputTrial => ({
    row: "FE-1",
    kind: "click",
    trial: 1,
    option: true,
    human: "T1",
    target: "T5",
    t0: T0,
    t1: T0 + 40,
    result: { ok: true, focusEmulation: "on" },
    status: EXPECTED.click,
    value: "",
    vis: "hidden",
    humanLog: visLog(),
    targetLog: [["hidden", T0 - 1000, "start"], ["visible", T0 + 5, "change"], ["hidden", T0 + 45, "change"]],
    before: tabs(),
    polls: [
      { s: T0 - 30, e: T0 - 20, tabs: tabs() },
      { s: T0 + 5, e: T0 + 15, tabs: tabs() },
      { s: T0 + 45, e: T0 + 55, tabs: tabs() },
    ],
    after: tabs(),
    ...o,
  });

  // Trial rule (BG-1/BG-2 copied, option added).
  expect("click trial, all clauses met → PASS", inputTrialVerdict(mk()).pass, true);
  expect("click trial without focusEmulation 'on' → FAIL", inputTrialVerdict(mk({ result: { ok: true } })).pass, false);
  expect("click trial, status idle (nothing received) → FAIL", inputTrialVerdict(mk({ status: IDLE_STATUS })).pass, false);
  expect("click trial, call error → FAIL", inputTrialVerdict(mk({ err: "DEBUGGER_ATTACH: x", result: undefined })).pass, false);
  expect("click trial, target visible after the call → FAIL", inputTrialVerdict(mk({ vis: "visible" })).pass, false);
  expect("click trial, human tab hidden during the call → FAIL", inputTrialVerdict(mk({ humanLog: visLog(T0 + 5) })).pass, false);
  expect("click trial, target active afterwards → FAIL", inputTrialVerdict(mk({ after: tabs(true) })).pass, false);
  expect("click trial, human not current afterwards → FAIL", inputTrialVerdict(mk({ after: tabs(false, false) })).pass, false);
  const typeOk = mk({ row: "FE-2", kind: "type", status: EXPECTED.type, value: BG2_TEXT });
  expect("type trial exact → PASS", inputTrialVerdict(typeOk).pass, true);
  expect("type trial, status right but value wrong → FAIL", inputTrialVerdict({ ...typeOk, value: "bg2type" }).pass, false);
  expect("type trial, a partial input status → FAIL", inputTrialVerdict({ ...typeOk, status: "status: TRUSTED input = bg2" }).pass, false);
  const keyOk = mk({ row: "FE-3", kind: "pressKey", status: EXPECTED.pressKey, focusStep: { activeIsField: true } });
  expect("pressKey trial exact → PASS", inputTrialVerdict(keyOk).pass, true);
  expect("pressKey trial, synthetic key status → FAIL", inputTrialVerdict({ ...keyOk, status: "status: synthetic key ignored" }).pass, false);
  expect("control trial without the option: no 'on' needed", inputTrialVerdict(mk({ row: "FE-5", option: false, result: { ok: true } })).pass, true);

  // FE-5's "received input".
  expect("control: status idle and empty field → not received", controlReceived(mk({ status: IDLE_STATUS, value: "" })), false);
  expect("control: status changed → received", controlReceived(mk({ status: EXPECTED.click })), true);
  expect("control: only the field changed → received", controlReceived(mk({ status: IDLE_STATUS, value: "b" })), true);

  // A trial whose readings after the call failed is recorded and counts against (FE verifier finding 4).
  const unread = mk({ readErr: "TIMEOUT: x", status: "", value: "", vis: "unread", humanLog: [], targetLog: [], after: [] });
  expect("evidence read failed → trial FAIL", inputTrialVerdict(unread).pass, false);
  expect("evidence read failed → FE-4 trial FAIL", fe4TrialVerdict(unread).pass, false);
  expect("evidence read failed → the control counts as received (void)", controlReceived({ ...unread, row: "FE-5", option: false }), true);
  expect("evidence read failed, even with good-looking fields → trial FAIL", inputTrialVerdict(mk({ readErr: "x" })).pass, false);

  // FE-4 per trial.
  expect("FE-4 trial, all reads clean → PASS", fe4TrialVerdict(mk()).pass, true);
  expect("FE-4 trial, target active in one poll → FAIL", fe4TrialVerdict(mk({ polls: [{ s: T0 + 5, e: T0 + 15, tabs: tabs(true) }] })).pass, false);
  expect("FE-4 trial, human not current in one poll → FAIL", fe4TrialVerdict(mk({ polls: [{ s: T0 + 5, e: T0 + 15, tabs: tabs(false, false) }] })).pass, false);
  const otherWindowMoved: TabLite[] = [tabs()[0], tabs()[1], { ...userTab, active: false }, { tab: "T10", windowId: 2, active: true }];
  expect("FE-4 trial, another window's active tab changed → FAIL", fe4TrialVerdict(mk({ after: otherWindowMoved })).pass, false);
  expect("FE-4 trial, human logged hidden (even before the call) → FAIL", fe4TrialVerdict(mk({ humanLog: visLog(T0 - 500) })).pass, false);
  expect("FE-4 trial, a failed poll → FAIL", fe4TrialVerdict(mk({ polls: [{ s: T0, e: T0 + 5, err: "TIMEOUT: x" }] })).pass, false);
  expect("FE-4 trial, logger started hidden → FAIL", fe4TrialVerdict(mk({ humanLog: [["hidden", T0 - 2000, "start"]] })).pass, false);
  expect("FE-4 counts overlapping polls", fe4TrialVerdict(mk()).overlapping, 1);
  expect("target observation text", targetObservation(mk()), "target page visible +5 ms, hidden again +45 ms (start hidden; read after the call hidden)");

  // The positive control's page part.
  expect("positive: hidden → visible after the call → PASS", positiveVisPass({ row: "POS", t0: T0, t1: T0 + 1600, humanLog: visLog(T0 + 6) }).pass, true);
  expect("positive: no change → FAIL", positiveVisPass({ row: "POS", t0: T0, t1: T0 + 1600, humanLog: visLog() }).pass, false);
  expect("positive: hidden but never visible again → FAIL", positiveVisPass({ row: "POS", t0: T0, t1: T0 + 1600, humanLog: [["visible", T0 - 9, "start"], ["hidden", T0 + 6, "change"]] }).pass, false);
  expect("positive: the screenshot failed → FAIL", positiveVisPass({ row: "POS", t0: T0, t1: T0 + 1600, err: "TIMEOUT: x", humanLog: visLog(T0 + 6) }).pass, false);

  // The colour classifier (positive and negative cases; quantized readings as fe-win.ps1 writes them).
  for (const [hex, want] of [
    ["#ff00ff", "magenta"],
    ["#dd00fa", "magenta"],
    ["#d800f8", "magenta"],
    ["#00ffff", "cyan"],
    ["#97fdfd", "cyan"],
    ["#90f8f8", "cyan"],
    ["#ffffff", "other"],
    ["#c8c8c8", "other"],
    ["#00b850", "other"],
    ["#ff0000", "other"],
    ["#0000ff", "other"],
    ["#000000", "other"],
    ["#f0f0f8", "other"],
    ["garbage", "other"],
  ] as const) {
    expect(`classifyRgb ${hex} → ${want}`, classifyRgb(hex), want);
  }

  // Captures.
  const frame = (ms: number, colours: string[], fg = 42): Frame => ({ ms, fg, w: 1200, h: 900, colours });
  const csv = "ms,fg,w,h,colours\n" + [frame(T0 - 100, ["#f0f0f0", "#00f8f8"]), frame(T0 + 200, ["#d800f8"])].map((f) => `${f.ms},${f.fg},${f.w},${f.h},${f.colours.join(";")}`).join("\n");
  expect("parseFrames reads fe-win.ps1's CSV", parseFrames(csv).map((f) => [f.ms, f.colours.length]), [[T0 - 100, 2], [T0 + 200, 1]]);
  const calm = (from: number, to: number, fg = 42): Frame[] => {
    const out: Frame[] = [];
    for (let ms = from; ms <= to; ms += 100) out.push(frame(ms, ["#f0f0f0", "#00f8f8"], fg));
    return out;
  };
  expect("positive capture: magenta during the flash, none before → pass", positiveCapture([...calm(T0 - 2000, T0 - 1), frame(T0 + 300, ["#d800f8"])], T0, T0 + 1600).status, "pass");
  expect("positive capture: no magenta during the flash → fail", positiveCapture(calm(T0 - 2000, T0 + 2000), T0, T0 + 1600).status, "fail");
  expect("positive capture: magenta before the call → fail", positiveCapture([frame(T0 - 500, ["#d800f8"]), frame(T0 + 300, ["#d800f8"])], T0, T0 + 1600).status, "fail");
  expect("positive capture: no frame before the call → fail", positiveCapture([frame(T0 + 300, ["#d800f8"])], T0, T0 + 1600).status, "fail");
  const block = [{ t0: T0, t1: T0 + 40 }, { t0: T0 + 5000, t1: T0 + 5040 }];
  expect("block capture: calm frames throughout → pass", blockCapture(calm(T0 - 2000, T0 + 8000), block).status, "pass");
  expect("block capture: one magenta frame in the span → fail", blockCapture([...calm(T0 - 2000, T0 + 8000), frame(T0 + 2550, ["#dd00fa"])], block).status, "fail");
  expect("block capture: the foreground window changed → fail", blockCapture([...calm(T0 - 2000, T0 + 3000), ...calm(T0 + 3100, T0 + 8000, 77)], block).status, "fail");
  expect("block capture: a 1.5 s gap around a call → void", blockCapture([...calm(T0 - 2000, T0 - 800), ...calm(T0 + 700, T0 + 8000)], block).status, "void");
  expect("block capture: no trials → void", blockCapture(calm(T0, T0 + 1000), []).status, "void");

  // The outcome table (#78), each branch and each gate.
  const capFrames: Record<string, Frame[]> = {
    pos: [...calm(T0 - 3000, T0 - 1), frame(T0 + 300, ["#d800f8"])],
    posBad: calm(T0 - 3000, T0 + 3000),
    block: calm(T0 + 9000, T0 + 200_000),
    // FE-1…FE-3's trials sit at T0 + 45 000 … T0 + 85 040 in `runOf` (after six FE-5 trials).
    blockShown: [...calm(T0 + 9000, T0 + 200_000), frame(T0 + 60_020, ["#d800f8"])],
    blockGap: calm(T0 + 9000, T0 + 15_000),
  };
  const lookup = (c: string): Frame[] => capFrames[c] ?? [];
  const fe0: Fe0Record = { row: "FE-0", build: "abc", result: { ok: true, focusEmulation: "on" } };
  const pos: PositiveRecord = { row: "POS", t0: T0, t1: T0 + 1600, humanLog: visLog(T0 + 6) };
  let at = T0 + 10_000;
  const trial = (row: InputTrial["row"], kind: InputKind, k: number, good: boolean, phase?: "first" | "last"): InputTrial => {
    at += 5000;
    const status = row === "FE-5" ? IDLE_STATUS : good ? EXPECTED[kind] : IDLE_STATUS;
    return mk({ row, kind, trial: k, phase, option: row !== "FE-5", t0: at, t1: at + 40, status, value: kind === "type" && good && row !== "FE-5" ? BG2_TEXT : "", humanLog: [["visible", at - 2000, "start"]] });
  };
  const runOf = (o: { click?: boolean[]; type?: boolean[]; pressKey?: boolean[]; fe5Received?: boolean; fe4Bad?: boolean; cap?: string; posCap?: string; posVis?: boolean; fe0Ok?: boolean; fe0Late?: boolean; drop?: boolean; posFailFirst?: boolean; capFailFirst?: boolean; unreadTrial?: boolean }): FeRecord[] => {
    at = T0 + 10_000;
    const recs: FeRecord[] = [o.fe0Ok === false ? { ...fe0, result: { ok: true } } : fe0];
    for (const kind of ["click", "type"] as const) for (let k = 1; k <= 3; k++) recs.push(trial("FE-5", kind, k, false, "first"));
    if (o.fe5Received) (recs[recs.length - 1] as InputTrial).status = EXPECTED.type;
    if (o.posFailFirst) recs.push({ ...pos, humanLog: visLog() });
    if (o.capFailFirst) recs.push(pos, { row: "CAP", for: "positive", csv: "posBad" });
    recs.push(o.posVis === false ? { ...pos, humanLog: visLog() } : pos, { row: "CAP", for: "positive", csv: o.posCap ?? "pos" });
    for (const kind of ["click", "type", "pressKey"] as const) {
      const pattern = o[kind] ?? [true, true, true];
      pattern.forEach((g, i) => {
        if (o.drop && kind === "pressKey" && i === 2) return;
        recs.push(trial(kind === "click" ? "FE-1" : kind === "type" ? "FE-2" : "FE-3", kind, i + 1, g));
      });
    }
    if (o.fe4Bad) (recs[recs.length - 1] as InputTrial).after = tabs(true);
    if (o.unreadTrial) (recs.find((r) => r.row === "FE-1") as InputTrial).readErr = "TIMEOUT: x";
    recs.push({ row: "CAP", for: "block", csv: o.cap ?? "block" });
    for (const kind of ["click", "type"] as const) for (let k = 1; k <= 3; k++) recs.push(trial("FE-5", kind, k, false, "last"));
    if (o.fe0Late) recs.push(fe0);
    return recs;
  };
  const outcome = (o: Parameters<typeof runOf>[0]) => readOutcome(runOf(o), lookup);
  expect("table: everything passes → (A)", outcome({}).kind, "A");
  expect("table: FE-5 received input in one trial → (B), FE-5 void first", outcome({ fe5Received: true }).lines.at(-1)?.startsWith("OUTCOME (B) — FE-5 void"), true);
  expect("table: FE-5 void wins over a FE-4 FAIL", outcome({ fe5Received: true, fe4Bad: true }).lines.at(-1)?.startsWith("OUTCOME (B) — FE-5 void"), true);
  expect("table: FE-4 FAIL in one trial → (B)", outcome({ fe4Bad: true }).lines.at(-1)?.startsWith("OUTCOME (B) — FE-4 FAIL"), true);
  expect("table: a capture frame shows the target → (B) by FE-4", outcome({ cap: "blockShown" }).lines.at(-1)?.startsWith("OUTCOME (B) — FE-4 FAIL"), true);
  expect("table: no kind passes → (B)", outcome({ click: [false, false, false], type: [false, false, false], pressKey: [false, false, false] }).lines.at(-1)?.startsWith("OUTCOME (B) — no kind passes"), true);
  expect("table: one failed trial fails its kind (no best-of-three) → (C)", outcome({ type: [true, false, true] }).perKind, { click: "focusEmulation", type: "focusFirst", pressKey: "focusEmulation" });
  expect("table: FE-1 and FE-2 FAIL, FE-3 PASS → (C) by #78's precedence", outcome({ click: [false, false, false], type: [false, false, false] }).kind, "C");
  expect("table: (C) type {submit} takes the stricter of type and pressKey", outcome({ pressKey: [false, true, true] }).lines.at(-1)?.endsWith("type {submit} takes the stricter of type and pressKey: focusFirst (#78 item 4)"), true);
  expect("gate: FE-0 FAIL → STOP, not an outcome", outcome({ fe0Ok: false }).kind, "STOP");
  expect("gate: an FE-0 after the trials → STOP", outcome({ fe0Late: true }).kind, "STOP");
  expect("gate: positive control (page) FAIL → STOP", outcome({ posVis: false }).kind, "STOP");
  expect("gate: capture positive control FAIL → STOP", outcome({ posCap: "posBad" }).kind, "STOP");
  expect("gate: block capture void → STOP", outcome({ cap: "blockGap" }).kind, "STOP");
  expect("gate: only 2 FE-3 trials → INCOMPLETE", outcome({ drop: true }).kind, "INCOMPLETE");
  expect("gate: a failed positive control, then a passing re-run → STOP (any failure stops)", outcome({ posFailFirst: true }).kind, "STOP");
  expect("gate: a failed capture positive control, then a passing re-run → STOP", outcome({ capFailFirst: true }).kind, "STOP");
  expect("table: a trial with unreadable evidence is counted, not dropped → (B) by FE-4", outcome({ unreadTrial: true }).lines.at(-1)?.startsWith("OUTCOME (B) — FE-4 FAIL"), true);

  // verdict's file plumbing: JSONL records and CSV captures on disk, and the --csv-* overrides.
  const dir = mkdtempSync(join(tmpdir(), "fe-selftest-"));
  const toCsv = (fs: Frame[]): string => "ms,fg,w,h,colours\n" + fs.map((f) => `${f.ms},${f.fg},${f.w},${f.h},${f.colours.join(";")}`).join("\n") + "\n";
  writeFileSync(join(dir, "pos.csv"), toCsv(capFrames.pos));
  writeFileSync(join(dir, "block.csv"), toCsv(capFrames.block));
  writeFileSync(join(dir, "shown.csv"), toCsv(capFrames.blockShown));
  const onDisk = runOf({}).map((r) => (r.row === "CAP" ? { ...r, csv: join(dir, `${r.for === "positive" ? "pos" : "block"}.csv`) } : r));
  writeFileSync(join(dir, "fe-results.jsonl"), onDisk.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const back = readRecords(join(dir, "fe-results.jsonl"));
  expect("verdict from files on disk → (A)", readOutcome(back, frameLoader(back, {})).kind, "A");
  expect("verdict with --csv-block pointing at a capture that shows the target → (B)", readOutcome(back, frameLoader(back, { block: join(dir, "shown.csv") })).kind, "B");
  expect("verdict with a missing capture file → STOP", readOutcome(back, frameLoader(back, { positive: join(dir, "absent.csv") })).kind, "STOP");
  rmSync(dir, { recursive: true, force: true });

  say(name, `SELFTEST ${bad === 0 ? "PASS" : "FAIL"} — ${n - bad}/${n} checks as expected`);
  if (bad) process.exitCode = 1;
}

// -------------------------------------------------------------------------------------- main

const commands: Record<string, () => Promise<void> | void> = {
  check,
  control: () => {
    const phase = option("--phase");
    if (phase !== "first" && phase !== "last") throw new Error("SET-UP: usage: control --phase first|last");
    return trials("FE-5", ["click", "type"], false, phase);
  },
  positive,
  fe1: () => trials("FE-1", ["click"], true),
  fe2: () => trials("FE-2", ["type"], true),
  fe3: () => (rest.includes("--control") ? trials("FE-3c", ["pressKey"], false) : trials("FE-3", ["pressKey"], true)),
  frames: framesCmd,
  verdict,
  selftest,
};

const cmd = commands[command];
if (!cmd) {
  console.log(`usage: npx tsx recipes/fe.ts <${Object.keys(commands).join("|")}> [args] — see the header of recipes/fe.ts`);
  process.exitCode = 2;
} else {
  run(`fe-${command}`, async () => {
    await cmd();
  });
}
