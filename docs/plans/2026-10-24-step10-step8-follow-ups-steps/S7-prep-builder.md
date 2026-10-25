# S7 prep builder report (Step 10, stage S7 — Run 15 prep)

Prep builder, Opus 5.5, 2026-10-25. Base `02eb0c2`. Brief `briefs/S7-prep-builder.md`. Nothing was run against Chrome,
no daemon on 9234, no actor, no build (`npm run build` was **not** run: the wave's block 2 builds the committed code).
Nothing committed.

## 1. What was built

- **`docs/e2e-test-plan.md` §4.22** (110 added lines after §4.21's last note, before §5; `git diff -U0 02eb0c2` shows
  one hunk `@@ -1292,0 +1293,110 @@` — no line of §4.20 or §4.21 changed). Framing rows R15-PRE, R15-BUILD, R15-SRV,
  R15-PIN, R15-DAEMON, R15-RELOAD, R15-SETUP, **SAFE-0 (L1) with the Step 10 check**, R15-CONSOLE, R15-FOUND, REP-0,
  R15-RESTORE, R15-LOGS (with SAVE-LOG), R15-TEARDOWN; rows BBL-1, MCPF-1 (+ MCPF-1-off), CAP-1, SW-1 (0.8's F3 note
  pasted verbatim with its outcome table), R15-POP-2, SAVE-1M, SAVE-4M (control), SAVE-SURR, SAVE-JSON, SAVE-REFUSE,
  SAVE-HOLD, SAVE-CLOSE, SAVE-FIX, SAVE-64, SAVE-PRIM, SAVE-IDONLY, SAVE-TTL, R15-3, SAVE-DISARM, SAVE-JSOFF,
  SAVE-BLOCK, JSD; RET-1 and PP1 prepared, not run. Each row: source quoted, steps, exact expected text tied to the
  product by tests, pass rule, RECORD clauses. The ONE stop rule appears verbatim (whitespace-normalised count 1 in
  §4.22, the sheet and the brief).
- **Helpers (recipes/, all new; no `s9*` file changed):** `s10.ts` (SDK side, 35 commands), `s10-rules.ts` (pure
  rules + expected texts), `s10-win.ps1` (dot-sources `s9-win.ps1`; overrides `Format-S9Title` to accept the S10
  fixture titles; `Test-S10Placement`/`Find-S10FreePlacement` with the row as a parameter; `Write-S10Cursor`;
  `Close-S10Foreign`; memory sampler control; headless-PID lookup; UTF-8 BOM), `s10-mem.ps1` (SAVE-64 sampler),
  `s10-r15.ps1` (the block runner, 30 blocks, ASCII), `s10-ret1.ts` + `s10-ret1.ps1` (RET-1, prepared; the driver
  refuses without `-Granted G10-2`), `tsconfig.s10.json`.
- **Fixtures (test-fixtures/, new):** `s10-mcpf.html` (page reporter: click/input/keydown with `isTrusted`, `vis`;
  visibility log), `s10-cap.html` (exactly 1 000 listable buttons, generated once), `s10-save.html` (deterministic
  values 1m/4m/64m/surr/json/fix with the page's own `TextEncoder` + `crypto.subtle` sha256; letters G–Z only, so no
  answer run can match by chance).
- **Tests (recipes/test/, new):** `s10-rules.test.ts` 42 tests — drift (safety messages, the MCP one-liners via
  `safetyRefusalLine`, `CAP_WARNING_LINE`, `evaluateSaveStart`'s empty-expression text by calling the handler, the
  save refusals via `primitiveSaveText`/`collectSaveText` with a fake CDP, the store's expired-id text incl. a real TTL
  expiry, `TAB_HELD`/`TAB_GONE`/answer/retire texts by source line, fixtures' titles and counters, bb-login's own
  lines) and every rule (sharedRuns, save/answer verdicts, SURR, #217's two outcome tables, judge10, step10Check,
  MCPF/CAP verdicts, SW-1's table on every branch, POP-2 class/reading, BBL-1 legs, server hits, scans incl. "a scan of
  its own SCAN line counts 0" (Run 14 F1), memRecord, the actor-turn parser, toolLine redaction, prompts, RET-1);
  `s10-fixtures.test.ts` 9 tests (jsdom: the real `buildSnapshot`/`locate` on the CAP and MCPF pages — 800 listed,
  `Cap item 0900` flagged, `0010` not; node:vm: the save page's lengths, alphabet, SURR offsets, JSON shape, the fix
  export's reserved names, 64 MiB). Rules were written before their tests here (not test-first); discriminating power
  shown by mutants instead: SW-1 950→900 (1 fail), the JavaScript-off text (1), the sharedRuns window start off by one
  (3), BBL presses `!== 1` → `> 2` (1); one equivalent mutant survived (skipping the string confirm after a hash hit —
  only a 32-bit hash collision tells them apart).
- **Wave sheet** `S7-wave-sheet.md` (blocks, times, resume, PIDs, restore, end, known limits, RET-1 and PP1 packages,
  the record template) and **runner brief** `briefs/S7-runner.md` (`<PREP>` left for the step agent; `S7-verbatim.md`
  appended whole).

## 2. Checks

| Check | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s10.json` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig.s9.json` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm test` | **3216 passed / 132 files** (was 3165 / 130): +42 `recipes/test/s10-rules.test.ts`, +9 `recipes/test/s10-fixtures.test.ts`; nothing removed |
| `git diff 02eb0c2 -- docs/e2e-test-plan.md` | one hunk of pure additions at line 1293 (after §4.21's last note) |
| `npx tsc --noEmit -p recipes/tsconfig.s6.json` | pre-existing failure (S4.md §6): 26 errors in `extension/src/tabs.ts` at base; with the new tests (its `test/*.test.ts` glob takes them) also 3 in `extension/src/debugger.ts` (chrome types, via `handlers/evaluate-save.ts`). Not fixed (out of lane: the fix is `types: ["chrome"]` in that tsconfig or excluding s9/s10 tests — for S8 / the session agent). |
| PowerShell parse (`Parser::ParseFile`) of `s10-r15.ps1`, `s10-win.ps1`, `s10-mem.ps1`, `s10-ret1.ps1` | 0 errors each |
| `git status --short` | only the intended files (below) plus the step agent's own `S7.ledger.md`, `briefs/S7-prep-builder.md`, `briefs/S7-prep-verifier.md`, `briefs/S7-verbatim.md` |

## 3. Dry runs without Chrome (scratchpad `S10_OUT`, removed after)

- `s10-r15.ps1`: out-of-order block → `NOT RUN: block servers needs block build first`; `preflight` with no `-Prep` →
  `STOP: …`, the stop procedure (`RESTORE safety: nothing to restore`, `no daemon of this wave recorded - none
  touched`, `STOPPED at block preflight …`), exit 2; every later block `NOT RUN: the wave stopped …` exit 3; reset
  `-Attempt 3` → `USAGE: … (the stored attempt is 1)`; `-Skip mcpf` → `USAGE: -Skip must be exactly ''…`; `-Skip
  found` → `USAGE: -Skip names framing block(s)`; a resume before any mark → `USAGE: the first attempt's daemon-log
  mark is not stored`; `status` prints the globals.
- `s10.ts`: `--help` exit 0; unknown command → one `STOP:` line, exit 2; `scan --mode committed` on a fixture-only file
  PASS, and after appending its own SCAN lines plus a planted non-fixture URL, the pattern, the path marker and a value
  run → exactly those four counted (the SCAN lines themselves counted 0); `bbl-judge` on a synthetic stuck leg PASS;
  `mem-record` on synthetic samples; `pp1-plan` printed the prompt (it then created an empty `sv` folder in
  `%TEMP%\bridge-e2e\s15` — removed, and `pp1-plan` changed to create nothing).

## 4. Untested live — guesses for the runner (each a possible set-up fix between rows, never past a STOP)

1. **Block order around the reload:** the daemon block spawns the new-build daemon so `reload-extension.ps1` can prove
   the reload by a `extension resync` line; the fixture tabs are opened only after the reload, because content.js
   installs `window.__agentBridge` only `if (!window.__agentBridge)` — a page injected by the Step 9 content script
   before the reload might keep the old object (unmeasured; avoided by order). W's own tab was opened before the reload
   but gets no content-script call.
2. **The Step 10 check** assumes the GatedRouter allows `evaluateSaveStart` (class evaluate, armed, JS on) and the
   handler throws `BAD_PARAMS` before `pageTab` — true in the code and the drift test calls the real handler; live
   unmeasured.
3. **Actors:** `claude.exe` resolved by `Get-Command claude.exe` into `S9_CLAUDE` (Run 13 relied on PATH). Prompts go
   through `spawnSync(node, [s9-actor.ts, send, name, prompt])` (no shell); the actor host runs in the repo (it loads
   CLAUDE.md, as Run 13's did). A sonnet actor may add a tool call (e.g. `browser_status`); `callsVerdict` then FAILS
   the row (recorded) — not a STOP. A turn that does not end in 300 s is a STOP (`did not end`).
4. **MCPF-1:** the trusted click needs the button on screen after `focusTab`; the page is short. `mcpfBehind` asserts
   the tab behind via `focusTab w` (focuses W too). `vis` at the event is a record of what the page saw.
5. **CAP-1:** the synthetic click on `Cap item 0900` (far below the fold, background tab) relies on the content path's
   scroll-into-view; the jsdom test proves the locator and flag, not the live click.
6. **SW-1:** W must be in front and uncovered (a covered window's capture hangs 35 s → the trial's d is not measured →
   undetermined). The VISLOG `evaluate` shows the debugging banner briefly before each trial (1.6 s settle).
7. **R15-POP-2 (a):** `focusTab pop` then the synthetic click; Run 14's popup opened from a synthetic click on a
   background tab — not measured for a front one.
8. **SAVE rows:** 64 MiB build in the page takes ~1–3 s (node: < 2 s); the 64 MiB MCP leg's actor waits for the
   default page bound 10 s + 120 s transfer; SAVE-PRIM may stress `chrome.debugger` with a 64 MiB reply (that is the
   measurement) — the guard after it STOPs if the extension dropped. The memory sampler's `--extension-process`
   filter is a guess at Chrome 156's command line.
9. **SAVE-IDONLY:** `chrome.exe --headless=new --user-data-dir=<temp> --remote-debugging-port=<p>` alongside the
   user's running Chrome (a separate profile starts a separate browser); `Browser.close` may not answer (the script
   waits for the socket close ≤ 5 s, then checks the PIDs by profile path). The profile path has no spaces.
10. **Background rows (SAVE-DISARM/-JSOFF/-BLOCK):** the READY/pressed file protocol of Run 14 (`Invoke-S9PressWhenReady`
    / `Invoke-S9WhenReady`); `s10.ts` waits for `daemon.status` to show the new state (≤ 5 s) before the next pull, so
    the pull never races the press.
11. **BBL-1:** the old script is written CRLF/UTF-8-no-BOM from `git show 2479301:recipes/bb-login.ps1` (ASCII);
    bb-login's own window is closed by its printed handle only if it is a Chrome window. Server-log counting uses the
    8085 log's line offset per leg.
12. **R15-3:** the placement and guard are R14-3's code with the row renamed; the always-printed `CURSOR … (before the
    re-arm)` and a park before every try are new. Any occluder → STOP (#212).
13. **JSD:** `browser_navigate` with `javascript:void(0)` / `data:text/html,S15` passes `z.string().url()` (both parse
    with `new URL`) — if zod refuses, the MCP answers an input error and the row FAILS (recorded).

## 5. Deviations from the brief / phase doc

1. **Block order:** the brief lists "build, then reload" as one block; the sheet has `build` (block 2), then servers,
   window, `daemon` (5), `reload` (6), `setup` (7) — the reload needs a running daemon to prove itself, and the tabs
   must be opened after it (§4 item 1). The ledger takes blocks 1–7; L1 is still SAFE-0.
2. **SAVE-4M** is an extra control row (the multi-pull value saved whole), so the paused rows' value is in the
   value-run scans and a positive control exists for their refusals.
3. **SAVE rows' leg split:** SDK and MCP for 1M, 64M and FIX; SDK only for SURR, JSON, REFUSE, HOLD, CLOSE, TTL and the
   paused rows (S4.md §7 names MCP+SDK only for SAVE-1M).
4. **REP-0** reuses `recipes/s6.ts rep0` unchanged in its own window R (`?t5=s6-human`); its verdict is recorded, not a
   gate (every R15 report can only attach a fixture tab).
5. **No `s9*` change:** the R15-3 placement functions are copies with a `-Row` parameter in `s10-win.ps1`
   (`Test-S9Placement` hard-codes `R14-3`).
6. The raw output's committed scan counts `scheme://host`, the pattern, the two markers and value runs (stricter than
   #213's minimum); the daemon-log rule stays "no URL at all".

## 6. Proposed decisions

- **2026-10-25 · S7: the reload proves itself against the wave's own new daemon, and the fixture tabs open after it** —
  Decided: blocks daemon → reload → setup. Why: the reload script's proof needs a daemon; content.js keeps an existing
  `__agentBridge`. Instead of: reloading before any daemon (proof by UIA only) or opening tabs first. Revisit if: the
  first live reload is not proven (exit 3).
- **2026-10-25 · S7: Run 15's resume skips every observed row block, computed, not listed by hand** — Decided:
  `-Attempt <n+1> -Skip` must equal the done/previously-skipped/stopped row blocks exactly. Why: #213 for any stop
  point, not only one foreseen. Instead of: Run 14's per-attempt hard-coded sets. Revisit if: the step agent wants to
  re-run a stopped row whose observation never started (then a new row ID, a dated amendment).
- **2026-10-25 · S7: SAVE values use letters G–Z only; answers are judged with k = 16, logs and transcripts with k = 32**
  — Why: a hex sha256 or a path cannot share a run with the value by chance, so a hit means a leak. Revisit if: a row
  needs a realistic value (FIX already is one: reserved names).
- **2026-10-25 · S7: the SAVE-64 memory record is the largest rise among `--extension-process` renderers** — D3's
  method choice, a RECORD. Instead of: Chrome's task manager by UIA (fragile).
- **2026-10-25 · S7: JSD's bridge-off leg runs with JavaScript also off** — so `DISARMED` must win over `JS_DISABLED`
  live (0.12's ordering). Instead of: bridge off with JavaScript on (proves less).

## 7. Gotcha candidates

1. A Bash heredoc in this environment drops backslashes in a Python/JS one-liner too (a mutant regex became a
   non-global `/:/` and hung vitest; killed by its task id, the file restored from a copy) — use the Write/Edit tools
   for any code with backslashes (memory already says so; it bit again).
2. Windows PowerShell 5.1 reads a BOM-less `.ps1` as ANSI: a helper with `—` in a literal needs a UTF-8 BOM
   (`s9-win.ps1` has one; `s10-win.ps1` now too); keep runners ASCII.
3. `recipes/tsconfig.s6.json`'s `test/*.test.ts` glob takes every new recipes test, so its pre-existing failure grows
   with each test that imports chrome-typed extension modules.

## 8. Files for the commit

recipes/s10.ts, recipes/s10-rules.ts, recipes/s10-win.ps1, recipes/s10-mem.ps1, recipes/s10-r15.ps1,
recipes/s10-ret1.ts, recipes/s10-ret1.ps1, recipes/tsconfig.s10.json, recipes/test/s10-rules.test.ts,
recipes/test/s10-fixtures.test.ts, test-fixtures/s10-mcpf.html, test-fixtures/s10-cap.html, test-fixtures/s10-save.html,
docs/e2e-test-plan.md, docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md,
docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S7-runner.md,
docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-prep-builder.md (plus the step agent's own S7.ledger.md and
briefs/S7-prep-builder.md, S7-prep-verifier.md, S7-verbatim.md).
