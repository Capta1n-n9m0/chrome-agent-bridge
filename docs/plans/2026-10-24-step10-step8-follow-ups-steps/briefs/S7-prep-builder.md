# S7 prep builder brief (Step 10, stage S7 — Run 15 prep)

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge), branch `main`, HEAD `02eb0c2`. Shell: Git
Bash on Windows (Windows PowerShell 5.1 for UIA helpers). Model: Opus 5.5. You are a level-2 BUILDER: you must NOT
spawn agents; finish in one go; never wait on background work. Role: `.claude/skills/step-agent/role-prompts.md`
§common preamble + §Builder. Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first
in every Bash call running node/npm/npx. Tests at HEAD: 3165 / 130.

**You prepare the wave; you do not run it.** No live Chrome action, no daemon on 9234, no press, no reload, no
`claude -p` actor, no fixture server against Chrome, no headless Chrome. Local checks that bind only port 0 or a
fixture server you start and stop yourself (by your own PID) with plain HTTP requests are fine. **Do not run
`npm run build`** (the Step 10 dist must first be loaded by the wave itself, after the prep commit; a build now would
not be harmful to git, but the wave's own build is its first block — say in your report that you did not build). No
commit (the step agent commits after the verifier).

## Read first

`CLAUDE.md` (Runtime gotchas bind; Step 8, Step 9 and "Driving Chrome from the outside" above all);
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/common.md` (part of this brief); the phase doc
`docs/plans/2026-10-24-step10-step8-follow-ups.md` — Decisions 0.2, 0.3, 0.4, 0.5, 0.7, 0.8, 0.9, 0.12 with every
dated note, "Stage S7", Exit checks S7.1–S7.6 (= S1.1–S1.6 for §4.22, with F20's S1.5), Human gates, STOP rules.
`docs/decisions.md` #97, #193, #205–#220 (search "(#2"). Stage reports and their handoffs: `…-steps/S2.md`, `S3.md`,
`S4.md` (§7 "S7's SAVE rows must measure live" — all 14 rows), `S4b.md` (Handoff), `S5.md` (BBL legs), `S1.md`
(proposed decisions → #210–#213). The S1/Run 14 materials are your model: `…-steps/S1-wave-sheet.md`,
`S1-run-record.md`, `S1-live-verifier.md`, `briefs/S1-runner.md`, `briefs/S1-prep-builder.md`; `recipes/s9-r14.ps1`,
`s9.ts`, `s9-rules.ts`, `s9-win.ps1`, `s9-actor.ts`, `s9-redirect.py`, `recipes/test/s9-rules.test.ts`,
`recipes/tsconfig.s9.json`; `docs/e2e-test-plan.md` §1 items 8–9, §4.20 (SAFE-0, SAFE-3, SAFE-POP-1), §4.21, §5 Run
14. Product code to re-read (never change) for ordering, codes and exact strings: `mcp/src/tools/registry.ts`
(focus-first, `CAP_WARNING_LINE`, `saveTo` answer, `withSafetyRefusals`, `failureReport`), `sdk/src/tab.ts`,
`sdk/src/client.ts` (`on("warning")`, `evaluateToFile`), `sdk/src/error.ts` (`safetyRefusalLine`, `ATTACH_CODES`),
`sdk/src/download.ts`, `extension/src/evaluate/save.ts` and the save store/handler, `extension/src/safety.ts`
(`JS_DISABLED_MESSAGE`, `BLOCKED_URL_MESSAGE`, …), `extension/src/content/locate.ts`, `extension/src/tabs.ts`
(`activateForCapture`/`showTab`), `daemon/src/intercept.ts` (the opener rule, `leaseGranted`), `daemon/src/methods.ts`,
`recipes/blackboard/export-grades.ts` + `export-file.ts` (how the SDK leg reads today), `recipes/bb-login.ps1`.

## GOAL

Write, so that a fresh live runner executes it mechanically and a fresh verifier can judge it:

1. **`docs/e2e-test-plan.md` §4.22** — a new section after §4.21 ("R15 rows (Step 10 S7, Run 15: Step 10's own
   rows)"). Never edit a line of §4.20 or §4.21 (dated notes beside a row only if unavoidable — say so). Each row:
   source (quote the phase-doc / decision / handoff text it derives from), preconditions, exact steps (commands), the
   expected observed text character for character (tied to the product's constants through a rule test), the pass
   rule written now, and what is a RECORD. Every row reads the page's own reporter or the refusal's code — an `ok` is
   never evidence. Rows:
   - **Framing:** pre-flight (clean tracked tree, HEAD contains the prep commit, no `mcp/dist/index.js` process, port
     9234 free or the daemon's, pin state by UIA — pinned → proceed, not pinned and UIA cannot pin → `STOP: … HUMAN
     GATE (pinning)`); the **build block**: main-tree `npm run build` of committed code, `git status --short` shows no
     tracked change, then `recipes/reload-extension.ps1` (exit 0; one re-run on exit 2; any other exit → STOP); the
     record's first line **SAFE-0's check proving the Step 10 build is loaded** (state the exact discriminating
     check: e.g. `daemon.status` build id = sha256 of the new `daemon/dist/index.js`, and a Step 10-only method such as
     `evaluateSaveStart` NOT answering `UNKNOWN_METHOD`/`unknown method`, plus Step 9's SAFE-0 safety/own-page lines);
     the found-state record + guard (armed, JavaScript, block-list count + sha256, never printed; anything but armed /
     JavaScript on / empty list → STOP before any change — #213); **REP-0's probe** (#97) before any row whose failure
     could attach a tab (all rows use fixture tabs; run the probe anyway as a framing row, as Run 12 REP-0 did); the
     final restore + read-back (S7.4); the log capture and count greps (S7.6: `daemon.log` since the wave's mark, the
     worker console, every actor transcript, the raw output — 0 for the token, a non-fixture **`scheme://host`** (not a
     bare `://`, #213), the test patterns, and for SAVE rows the 32-character-run checks); teardown (a scan failure
     prints `STOP:` and takes the stop path — #213).
   - **MCPF-1** (0.2, S2's handoff): a headless MCP actor's trusted `browser_click`, `browser_type` and
     `browser_press_key` on a **background** fixture tab of the driver's window land 3/3 each — the page's own reporter
     shows each event with `isTrusted: true` — and that tab is in front of its window after (read by the driver, e.g.
     `listTabs` active/`current` or UIA). Plus the disarmed leg (S2): with the bridge disarmed (toolbar button), the
     actor's trusted click answers the one `DISARMED:` line and the page reporter shows **no input received**; the
     tab is not brought to the front. Also record (not pass) whether the actor read the focus sentence correctly.
   - **CAP-1** (0.3, #216): a fixture of 1 000 listable elements (add it under `test-fixtures/`; listable by
     `a11y.ts`'s rules — check them): through the SDK, `tab.locate(<locator of element 900>)` → `pastSnapshotCap: true`
     and an action on it emits exactly one `warning` event `{tab, method, kind: "pastSnapshotCap"}`; element 10 → no
     flag, no event. Through the MCP (headless actor): an action on element 900 → the answer carries
     `CAP_WARNING_LINE` verbatim; on element 10 → it does not. The page reporter confirms each action landed on the
     intended element.
   - **SAVE rows** (0.4, #205/#207/#217/#218, `S4.md` §7 — all of them): SAVE-1M, SAVE-64, SAVE-PRIM, SAVE-IDONLY,
     SAVE-SURR, SAVE-JSON, SAVE-REFUSE, SAVE-DISARM, SAVE-CLOSE, SAVE-JSOFF, SAVE-BLOCK, SAVE-TTL, SAVE-HOLD, SAVE-LOG,
     plus **SAVE-FIX** (0.5's fixture leg: a fixture page builds and holds a synthetic ~420 000-character export of
     reserved names only; the SDK leg reads it as `export-grades.ts` does today; the MCP leg is one
     `browser_evaluate {saveTo}` by a headless actor; PASS = equal sha256 for both files and the page's own hash; the
     actor's transcript holds no 32-character run of the export — counted, never printed). Hashes: the page's own
     `TextEncoder`/`crypto.subtle` sha256 vs the file's vs the answer's. Answer bounds per S4.1 as amended (≤
     min(300, path.length + 120)) and no 16-character run of the value in any answer. **#217's Revisit-if conditions
     are judged by SAVE-PRIM (fails at ≥ 64 MiB?) and SAVE-IDONLY (does a primitive get an `objectId`?) — write their
     outcome table now.** Step-agent rulings: SAVE-IDONLY is a RECORD probe in a throwaway **headless** Chrome (same
     `chrome.exe`, a temp `--user-data-dir` under `%TEMP%`, its own free `--remote-debugging-port`, a fixture page; a
     small Node CDP script over `ws`; ended by `Browser.close`, then its own PIDs checked gone) — never the user's
     profile; SAVE-64's worker memory and read-out time are RECORDS (no bound; the memory read from the extension's
     process by the method you pick, stated now); SAVE-BLOCK blocks only a `*.localhost` fixture name (e.g.
     `saveblk.localhost`), added and removed through the options page as R14-5c did; SAVE-TTL waits > 5 min idle
     (state the exact seconds) and expects the code/text the product gives for an expired id (re-read it; a worker
     restart gives the same text — note that the row cannot tell them apart). Saved files live outside the repo
     (`%TEMP%\bridge-e2e\s15\…`) and are deleted at teardown; only hashes and sizes are recorded.
   - **JSD rows** (S4b handoff, #219): with JavaScript off (options page, UIA) on a fixture tab: `browser_evaluate`,
     `{asRef}`, `{saveTo}` and a `javascript:` and a `data:` navigate answer `JS_DISABLED` — MCP: one line starting
     `JS_DISABLED:` (exact body from the code); SDK: `e.code === "JS_DISABLED"`, no report, no screenshot (no PNG
     written). With the bridge off the same calls answer `DISARMED` `{scope:"all"}`. With JavaScript back on,
     `evaluate` works unchanged (a control). Decide SDK vs MCP leg split so each client is covered at least once per
     state; write it out.
   - **SW-1** (0.8 with Stage 0 F3 — paste the differential row and its outcome table verbatim from the phase doc's
     0.8 note): per trial (i) a default-mode screenshot of a background fixture tab in the human's (driver's) window
     and (ii) one of a fixture tab already in front, ≥ 1.5 s apart, three trials; d = (i) − (ii) client-measured;
     `visibilitychange` stamps on both tabs as a record. d ≥ 950 ms in 3/3 → "runs to its bound" (S7b); d ≤ 300 ms in
     3/3 → "the event ends the wait"; else undetermined.
   - **BBL-1** (0.9, #215, `S5.md`): `recipes/bb-login.ps1` dry runs on `recipes/fixtures/` served on **port 8085**:
     the old script (from git, `git show <S5's parent>:recipes/bb-login.ps1` to a temp file — name the commit) exits 4
     and the new exits 0 on the delayed-redirect fixture; stuck → exit 4 within 95 s of the press; elsewhere → exit 4
     at the bound; submits = 1 in every leg. No real site.
   - **R15-POP-2** (#211): the popup's `openerTabId` class (the held opener / another tab / none) with the opener (a)
     in front and (b) in the background of its window, then `leaseGranted` judged (within 5 s) — print the class,
     never a URL. Write the outcome reading: held opener named and no grant → product defect (#211's Revisit-if).
   - **R15-3** (#212): SAFE-3's expected text re-measured with the options window visible beside the driver window,
     occluder diagnostics (rect, owner process/class, styles, cursor) printed before the re-arm, the fixed cursor
     park; if a non-driver window occludes, the guard STOPs (exempting it is the user's call).
   - **RET-1** (0.7, F16) — **prepared, NOT run**: the SDK recipe holding a handle, the driver script (kill of
     identified Chrome PIDs via `Test-SafeToKill`, relaunch as `recipes/bgf-launch.ps1`), the row with expected text
     and pass rule, armed-only precondition, and a short **ready-to-ask package** for G10-2 (what is killed, that unsaved
     form data in the user's open tabs is lost, the "Restore pages?" prompt, how long, what is read back). The sheet
     records it `not run — waits for the user`; the runner never executes it.
   - **PP1** — the S6.3 pp1 leg — **prepared, NOT run**: the same SAVE-FIX comparison on the real course under G10-3
     (decisions.md #103), the commands and a ready-to-ask package (course, login, what is read, what is written and
     where, that nothing is written to Blackboard). The runner never executes it.
2. **Helpers** in `recipes/` only (new files `recipes/s10*.{ts,ps1,py}` preferred; reuse `s9*` by import/dot-source
   without changing its Run 14 behaviour — if you must change an `s9*` file, keep `s9-rules.test.ts` green and say why),
   new fixture pages under `test-fixtures/` or `recipes/fixtures/`, `recipes/tsconfig.s10.json`, rule tests in
   `recipes/test/s10-rules.test.ts` for every new pure rule (expected-text builders tied to imported product
   constants, hash/answer-bound checks, the 32-char-run counter, SW-1's outcome classifier, POP-2's class, BBL exit
   rules, the `scheme://host` scanner) — failing test first. The block runner `recipes/s10-r15.ps1` on
   `s9-r14.ps1`'s model (#213): one STOP path that restores and refuses later blocks; resume only through a narrow,
   named `-Attempt N -Skip a,b` form that cannot re-run an observed row; placements cut at the taskbar; a fixed cursor
   park before occluder guards. Headless actors: `claude -p --model sonnet --strict-mcp-config --mcp-config <a config
   naming only chrome-agent-bridge> --allowedTools mcp__chrome-agent-bridge "<prompt>"`, transcripts saved outside the
   repo and read verbatim; long prompts via `node --import tsx …` (cmd 8191 limit); each actor ended before another
   client needs its tab (its claim is a lease); explicit `tab` handles in prompts — re-read how an MCP explicit `tab`
   on another client's or an unleased tab behaves (`TAB_HELD`, claims) and design the hand-offs accordingly. Page code
   as literal strings (tsx `__name`). Recipes typecheck with their tsconfigs (`npx tsc --noEmit -p
   recipes/tsconfig.s10.json` exit 0; note `tsconfig.s6.json`'s pre-existing failure, S4.md §6 — don't fix it unless in
   lane and trivial; say).
3. **The wave sheet** `…-steps/S7-wave-sheet.md`: blocks in run order (rows that change no safety state first, then
   the disarm / JavaScript-off / block-list rows, then the restore), exact commands, the record template
   (`S7-run-record.md`: header; **L1 = SAFE-0's Step 10 build check**, after the build + reload block whose lines go to
   the ledger; then UTC time · row ID · block · observed text verbatim · PASS / FAIL / NOT MEASURED / RECORD), PIDs to
   track, the restore commands and their read-back, timing per block (the PowerShell tool caps a call at 10 min —
   split long blocks, e.g. SAVE-TTL and BBL-1; no foreground sleep loop by the runner beyond a block's own waits), the
   end-of-wave clean-up (daemon by `daemon.shutdown` or identified PID, servers by own PIDs, driver windows closed,
   headless Chrome gone, saved value files deleted from `%TEMP%`, pin and layout as found, ports 9234/8080/8081/8083/
   8085 free), and the log capture (`S7-daemon-log.txt`, `S7-run-raw.txt` copied into the steps dir only after their
   scans are 0).
4. **The runner brief** `…-steps/briefs/S7-runner.md` modelled on `briefs/S1-runner.md`, with `<PREP>` left for the
   step agent to fill; the runner MAY spawn nothing but the headless `claude -p` actors the sheet names (they are
   processes, not agents); append `briefs/S7-verbatim.md` to it whole.

## Binding rules for the sheet and the runner brief

- **The ONE stop rule, in the SAME WORDS in the sheet and in the runner brief** (#193): "**STOP RULE (#193): on any
  STOP line — a restore that fails, a guard that prints STOP, a human gate (pinning, a grant), any throw — run the
  restore first if the safety state was touched since the found-state record, record its read-back, write the
  ledger, and RETURN to the step agent. A helper may be fixed only between rows, before any observation of the next
  row, and never past a STOP line.**" Every guard prints a line beginning `STOP:`.
- A failed row is RECORDED (a `CHECK … FAIL` is not a STOP) and the wave goes on; never re-run a row to make it pass;
  never edit expected text; no product code; never choose a bound after a measurement.
- No Chrome restart or kill (RET-1 is prepared only); driver-opened windows only; never the user's tabs/windows; no
  real site, no real login (BBL-1 dry runs only); evidence shows fixture pages only; no screenshot or saved value file
  committed; the token never printed; kill only PIDs `Test-SafeToKill` calls safe or ones the wave started; node PID
  22152 is not ours.
- Toggling the safety state and pressing the toolbar button and `Alt+Shift+K` in the driver's own windows are granted
  (#33); pinning by mouse is not.
- Lane: `recipes/` (incl. `recipes/test/`, tsconfigs, `recipes/fixtures/`), `test-fixtures/` (new pages only),
  `docs/e2e-test-plan.md` §4.22 (and §5 only for a Run 15 header stub if useful), the steps dir. No product code.
  Anything outside → escalate in your report.

## Checks before you return

`npx tsc --noEmit -p recipes/tsconfig.s10.json` 0 (and `tsconfig.s9.json` still 0); `npm run typecheck` 0; `npm test`
= 3165 + n (state n per file; nothing removed); `git diff 02eb0c2 -- docs/e2e-test-plan.md` touches no line inside
§4.20 or §4.21; `git status --short` lists only your intended files. Write
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-prep-builder.md` (what you did, files, test count before →
after, untested-live guesses for the runner — be explicit about each UIA step and timing you could not try —,
deviations, proposed decisions, gotcha candidates). Return ≤ 15 lines + the exact file list for the commit.

## Pasted verbatim from briefs/common.md (lines 42–50, 125–201, 204–224, 235–260)

## Lessons learned during Step 10 (session agent, binding on every later brief)

- **Scratch worktrees:** run `npm ci` in the worktree, or remove a `node_modules` junction only with `cmd /c rmdir
  <link>` before removing the worktree — never `rm -rf` / `Remove-Item -Recurse` across it (it emptied the main
  tree's `node_modules/.bin` in S4b; decisions.md · 2026-10-25 · Scratch worktrees never share `node_modules` through
  a junction a recursive delete can follow (#220)).
- **Live waves:** every brief fill-in and bookkeeping edit is committed before a runner starts (Run 14 Return 1, #213).
- **Codes since S4b:** 26 codes (25 on the wire); JavaScript-off refusals answer `JS_DISABLED` (no `data`), bridge off
  `DISARMED {scope:"all"}` (#219).

**ESCALATION list** (the `step-agent` default, extended). A step agent escalates instead of deciding on:
- anything touching a pre-registered rule or a decision of the phase doc marked **(user)**;
- an effect outside its lane — another package, a later stage, the wire protocol, the manifest;
- any change to what the safety gate covers: a method exempted from or added to a class, a new extension method
  without a class, a code chosen for a refusal, what `listTabs`, an event or a log reveals;
- any path by which a client, the daemon or a page could change the safety state or reach the extension's own pages;
- the wire shape of a new field or method (`pastSnapshotCap`, `saveTo`'s transport), codes, event names or params,
  the SDK's exported surface (eight values) or any Step 8 SDK signature, MCP tool names or input schemas;
- returning any part of a `saveTo` value to the model, or writing anywhere but the given absolute path;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` null-or-undefined,
  `{__bridgeError}` returned not thrown, the IIFE content script, `toSerializableArgs`, no top-level `await` in the
  worker, listeners at the top level of `sw.ts`, `ws` external, the `hasLayout` gate, the one walk in `a11y.ts`,
  `focusTab` as the only window focus, `activateForCapture`'s 1000 ms and 50 ms waits, never logging URLs, titles,
  header values, bodies, values or the token);
- any integrity-floor item (§6) or `long-run` §4 stop — G10-0…G10-3, a reload exit other than 0 after one re-run, a
  Chrome restart or kill, the token, the bind, a safety-state restore that fails, a push or a tag, `main` rewritten;
- a STOP line met by a live runner (it returns; you decide or escalate — never "helper bug, safe to continue");
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger met;
- a port-9234 holder that is not the daemon, or an orphan `node` process it did not start;
- a test count that drops without a documented move or removal;
- a permission or classifier denial; 2 failed fix rounds; a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` gotchas are the standing list — these are the ones Step 10
touches):
- **LESSON (Run 13): a level-2 live runner RETURNS on every STOP line.** Run 13's runner resolved four stops itself
  (a restore failure, a guard, the pinning gate, a throw without a restore) and the live verifier failed the run on
  process (#192, #193). A restore failure, a guard printing STOP, a human gate (pinning, a grant) and any throw after
  the first state change all mean: restore if the state was touched, write the ledger, return. Never fix a helper
  past a stop and carry on, however obvious the bug. The wave sheet and the runner brief state this rule once, in the
  same words (Run 13's sheet said "from block 4 on" and its brief "after the first state change").
- **UI Automation facts measured in Run 13 (Chrome 156, Windows 11):** the toolbar extension button and the
  Extensions (puzzle) button expose **no UIA Invoke pattern** — pressing or pinning needs a real mouse click at a
  `FromPoint`-verified point inside your own window, and pinning that way waits for #192's ruling; the extension
  action's title has a **second line** under it ("Has access to this site") — compare only the first line; the
  service worker's DevTools window is titled `DevTools`; `Alt+Shift+K` is assigned as `_execute_action` and does not
  change the Windows input layout; an options page in a background or covered window did not show a re-arm until
  brought to the front (SAFE-3, cause undetermined).
- **Expected text is tied to the product's constants** (`recipes/test/s9-rules.test.ts` does it for §4.20); Run 13
  still wrote two rows wrong (the daemon logs `safety state:` before `extension resync` on a reload, by design; the
  DevTools title) — re-read the code for ordering and Chrome's own strings before committing a row (#195).
- **Re-measurements are new rows.** §4.20's rows and Run 13's results are never edited (dated notes only); a bound
  is never chosen after seeing the measurement (R14-4b's banner lifetime is a record).
- **Port 8082 is bound by `SystemSettings.exe` on this machine**; the redirect server uses 8083 (#197), and it must
  be threaded (Run 13's single-threaded server is the probable cause of SAFE-5c's `TIMEOUT`).
- **node may be missing from the Bash tool's PATH.** Put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1, npm 11.6.2, checked
  2026-10-24). Python is miniconda, `$HOME\miniconda3\python.exe`, for the fixtures.
- **Listeners at the top level of `sw.ts`**; no top-level `await`; a new extension method enters the safety table
  (`GatedRouter.on` throws otherwise) and the daemon's method table (`daemon/src/methods.ts`).
- **`storage.session` is emptied by a reload; `storage.local` is not.** The safety state lives in `storage.local`,
  so a reload or a Chrome restart never re-arms what the human disarmed — RET-1 reads it back after the relaunch.
- **The reload's hello comes up to 2 s later** (the session marker waits for `onStartup`); the reload script still
  proves the reload.
- **The driver is not a bridge client**: launched with `--strict-mcp-config` and an empty config; check with a
  process listing that no `mcp/dist/index.js` descends from it.
- **Headless Claude sessions are the MCP actors** (`claude -p --model sonnet --allowedTools
  mcp__chrome-agent-bridge "<prompt>"`), read verbatim from the transcript, never from a paraphrase. On Windows, send
  long prompts with `node --import tsx …`, not `npx` (`cmd.exe` refuses > 8191 chars). An MCP actor's claim is a lease
  that dies only with its connection (end the actor before another client needs that tab).
- **An `ok` is not evidence**: trusted CDP input into a background tab answers `ok` and does nothing (BG-1/BG-2,
  FE-1…3). Every row reads the page's own reporter or the refusal's code — MCPF-1 above all.
- **A capture switches the human's view ~1.5 s**; a failure report's screenshot does too (REP-0). Rows that could
  attach a non-fixture tab need REP-0's probe first (decisions.md · 2026-10-23 · A probe of the failure-report
  screenshot runs before any row that could attach a non-fixture tab (#97)).
- **UI automation of Chrome** (`recipes/reload-extension.ps1` is the model): never match by name alone; UIA
  `TabItem` is not a tab count; `chrome.exe --new-window chrome://…` opens a New Tab page — type the URL into the
  omnibox of your own window; a window handle does not survive a Chrome restart.
- **Windows PowerShell 5.1 traps**: `—` mangled unless UTF-8 is set; the alias `R`; embedded `"` stripped from
  native arguments (send JSON from Git Bash); `>` writes UTF-16LE in a `-NoProfile` shell.
- **Recipes run with `tsx`**, and `String(fn)` page code breaks under tsx (`__name`): ship page code as literal
  strings; recipes typecheck with their own `tsconfig*.json`.
- **Kill only identified PIDs** (`Test-SafeToKill`, `docs/e2e-test-plan.md` §1 item 8); RET-1's Chrome kill is G10-2.
- **`*.log` is gitignored**: attach logs as `.txt`; grep them for `://`, the token and the block-list patterns by
  count, never printing them.
- **A subagent's report is a claim**: verify by diff before accepting; re-run each "finding".
- **The repo is public**: evidence shows only fixture pages — never my tabs, a real site, a pattern I typed into my
  real block list, a `saveTo` value from a real page, or a student's data.

## SPEC-DISCREPANCY PROTOCOL (kickoff §5, lines 352–373, verbatim)

```
SPEC-DISCREPANCY PROTOCOL. Intent beats procedure. When the code you are asked to write, the
phase doc, the design spec and CLAUDE.md's measured facts disagree, trace up the chain —
phase doc → design spec → CLAUDE.md runtime gotchas — and say so in your report; the deepest
layer that is internally consistent wins. Stakes pick who resolves it: mechanical (a stale
line number, a wrong count, a renamed file) → the fixer documents it in the report and the
step agent amends the phase doc in place with a dated note; design-local (a shape the plan
left open, a default) → the session agent records a decision in docs/decisions.md with the
rejected option; contract-level (the wire protocol, event names and params, codes, what is
gated and what a refusal reveals, how the safety state is changed and by whom, what the human
sees, the token lookup, the bind, the SDK's public surface and signatures, MCP tool names and
schemas, what a saveTo answer may contain) → long-run §3: a pre-stated rule applies
mechanically, else the conservative choice (security at least as strict; every existing tool
and test behaves identically while armed with JavaScript on and an empty block list; undoable),
recorded under Open decisions for the user. Code and spec never diverge silently: whoever
changes behaviour amends the governing doc in place with "*Superseded YYYY-MM-DD: was X,
because Y.*". Verifiers report findings with the command and its output; they never rewrite
the spec or the plan.
```

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP rule
that says escalate; a human gate (G10-0 #192 ruled before Stage 0; G10-1 creating the step8 tag
and any push; G10-2 killing and relaunching the user's real Chrome for RET-1; G10-3 any live work
beyond fixture pages in the user's profile — the real Blackboard course, a real bb-login run, any
real site, the user's credentials; pinning the toolbar button by mouse click unless #192's ruling
allows it — else ask once); an extension reload whose script (recipes/reload-extension.ps1) exits
non-zero after one re-run; any other Chrome restart (needs a fresh grant); anything destructive or
outward-facing (push, tag, publish, history rewrite, rewriting main, deleting outside the repo,
touching the user's Chrome profile data or the user's own tabs and windows, committing or logging
the token); any loosening of the security boundary (the 127.0.0.1 bind, the token gate, "never log
URLs, titles, header values or bodies"); permission or classifier denials. (2) Phase-specific: a
router method reachable without the safety gate; any way for a client, the daemon or a page to
change the safety state or reach the extension's own pages; a live wave (S1, S7) that leaves the
safety state different from the one it found — every wave records armed, JavaScript and the sha256
of the block-list text at its start, restores them and reads them back equal, never printing the
list; a block-list pattern, URL, title, evaluated value, saveTo path or the token in any log or
committed evidence; a saveTo answer carrying any part of the value; a live runner that continued
past a STOP line instead of returning (#193); a drop in the test count without a documented move
or removal; evidence showing a real site or the user's own tabs; killing a process that
Test-SafeToKill did not call safe. Standing rule: never resolve a decision in the direction that
flatters a result already seen; pass rules are written before the measurement; a failed check is
reported, never re-tuned.
```
