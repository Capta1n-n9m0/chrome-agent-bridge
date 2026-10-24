# S1 prep builder brief (Step 10, stage S1 — Run 14 prep)

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge), branch `main`, HEAD `b016712`. Shell: Git
Bash on Windows (Windows PowerShell 5.1 for UIA helpers). Model: Opus 5.5. You are a level-2 BUILDER: you must NOT
spawn agents; finish in one go; never wait on background work. Role: `.claude/skills/step-agent/role-prompts.md`
§common preamble + §Builder. Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`
first in every Bash call running node/npm/npx.

**You prepare the wave; you do not run it.** No live Chrome action, no daemon, no press, no reload, no fixture server
against Chrome. You may run the threaded redirect server on 8083 locally for a unit-level check of its threading
(start it, two concurrent requests, stop it by your own PID) — nothing else live. No commit (the step agent commits
after the verifier).

## Read first

`CLAUDE.md` (Runtime gotchas bind; Step 9 section and "Driving Chrome from the outside" above all);
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/common.md` (part of this brief); phase doc
`docs/plans/2026-10-24-step10-step8-follow-ups.md` — Decisions 0.1, 0.10 (binding verbatim), 0.11; "Stage S1"; Exit
checks S1.1–S1.6 with the F20 note; Human gates; STOP rules. `docs/decisions.md` #140, #192–#197, #201, #202 (search
"(#19" / "(#140)" / "(#201)" / "(#202)"). Stage 0: `…-steps/stage0-audit.md` F20, F22 and the 0.10 row of its table.
Run 13 as the model: `docs/plans/2026-10-24-step9-phase-e-safety-steps/` `S4.md`, `S4-wave-sheet.md`,
`S4-run-record.md`, `S4-live-verifier.md`, `briefs/S4-runner.md`, `briefs/S4-prep-builder.md`; `docs/e2e-test-plan.md`
§1 items 8–9, §4.19, §4.20, §5 Run 13; `recipes/s9.ts`, `s9-rules.ts`, `s9-actor.ts`, `s9-win.ps1`, `s9-redirect.py`,
`recipes/test/s9-rules.test.ts`, `recipes/tsconfig.s9.json`, `recipes/README.md`. Product code you must re-read (not
change) for ordering and strings: `extension/src/safety.ts` (`BLOCKED_URL_MESSAGE` etc.), `safety-call.ts`,
`handlers/download.ts`, `sw.ts` (`action.onClicked`), `badge.ts`, `options.ts`/`options-model.ts`,
`debugger.ts`/`safety-debugger.ts`, `daemon/src/intercept.ts` (the opener rule ~`:341`, `safetyLogLine`).

## GOAL

Write, so that a fresh live runner can execute it mechanically and a fresh verifier can judge it:

1. **`docs/e2e-test-plan.md` §4.21** — new section after §4.20 (never edit a line of §4.20's rows; a dated note
   beside one is allowed but not needed). Rows **R14-5c, R14-POP-1, R14-3, R14-4b, R14-REL-3**, each derived from 0.10
   verbatim (quote 0.10's bullet under each row), each with: preconditions, exact steps (commands), the expected
   observed text written out character for character, the pass rule (written now, before any measurement), and what
   is a RECORD rather than a pass rule (R14-4b's banner lifetime; R14-REL-3's URL class is whatever the leg prints,
   pass = the class line is printed in the agreed form and no URL is printed — decide and write the exact rule). Also
   the wave's framing rows: the first line = SAFE-0's check with its text unchanged (S1.2); the found-state record
   (armed, JavaScript, block-list count + sha256, never printed) and its guard; the final restore + read-back (S1.4);
   R14-5c's positive control (two concurrent requests to 8083 both answered within 1 s) before R14-5c; the log
   capture and count greps (S1.6). Expected text is tied to the product's constants through
   `recipes/test/s9-rules.test.ts` (as Run 13 did for §4.20) — re-read the code for event/log ORDER and Chrome's own
   strings (#195's lesson: Run 13 wrote two rows wrong).
2. **Helper changes** in `recipes/s9*.{ts,ps1,py}` only: `s9-redirect.py` on `ThreadingHTTPServer` (port 8083 per
   #197; keep its request log counts usable for R14-5c's "8083 hop logged once; 8081 target logged once"); `s9.ts`
   `cmdPop1` (or a new subcommand) claiming the opener tab first, its claim line printed before the click (F22: the
   daemon grants a popup only to a leased opener); R14-3 window placement — the options window visible (not covered)
   beside the driver window, checked by window rectangles (both rects printed, non-overlapping, both on a monitor's
   work area, neither minimized) before the toolbar click; R14-4b — the trusted `type` of 1000 characters disarmed
   mid-call, k counted from the page's own reporter, the banner polled every 250 ms for ≥ 20 s (lifetime recorded,
   no bound), then re-arm and a trusted call on the same tab that must succeed with no "another debugger" error;
   R14-REL-3 — the `rel` leg prints the URL class (wrapper scheme, inner scheme, own page yes/no), never the URL.
   Rule tests in `recipes/test/s9-rules.test.ts` (or `s9-rules.ts` + test) for every new pure rule (class
   formatter, rect check, banner-lifetime arithmetic, k-range rule, server-log count rule) — failing test first.
   Recipes typecheck: `npx tsc --noEmit -p recipes/tsconfig.s9.json` exit 0. Page code as literal strings (tsx
   `__name` gotcha).
3. **The wave sheet** `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-wave-sheet.md`: blocks in run order
   with exact commands, the record template (`S1-run-record.md`: header, line 1 = SAFE-0's check — a reload by
   `recipes/reload-extension.ps1` ONLY if it fails, one re-run on exit 2 — then UTC time · row ID · observed text
   verbatim · PASS / FAIL / NOT MEASURED / RECORD), PIDs to track, the restore commands (`Restore-S9All` or its
   successor) and their read-back, the end-of-wave clean-up (daemon stopped by identified PID via Test-SafeToKill or
   `daemon.shutdown`, servers by own PID, driver windows closed, pin state and layout as found, port 9234 free), and
   the log capture (daemon log section since the wave's mark → `S1-daemon-log.txt` only after the count greps are 0;
   worker console likewise → counts in the record).
4. **The runner brief** `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S1-runner.md` modelled on Run
   13's `briefs/S4-runner.md`, with the ESCALATION list, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR and LESSONS pasted
   verbatim from `briefs/common.md`.

## Binding rules for the sheet and the runner brief

- **The ONE stop rule, in the SAME WORDS in the sheet and in the runner brief** (#193): copy this sentence exactly
  into both: "**STOP RULE (#193): on any STOP line — a restore that fails, a guard that prints STOP, a human gate
  (pinning, a grant), any throw — run the restore first if the safety state was touched since the found-state
  record, record its read-back, write the ledger, and RETURN to the step agent. A helper may be fixed only between
  rows, before any observation of the next row, and never past a STOP line.**" Every guard in the helpers prints a
  line beginning `STOP:`.
- **Pre-flight before any state change** (read-only): git clean (tracked) and HEAD includes the S1 prep commit; no
  `mcp/dist/index.js` descending from the runner's session; port 9234 free or held only by the daemon; the toolbar
  button's pin state read by UIA. **PINNING RULE:** if the button is already pinned, proceed. If not pinned and UI
  Automation cannot pin it, that is a human gate: STOP and return (no mouse-click pinning — #202 does not pre-approve
  it). Mark which rows need the pinned toolbar button and which use `Alt+Shift+K` (`_execute_action`), and put the pin
  check early so the gate is met before any state change.
- **Found-state guard:** record armed, JavaScript, block-list count + sha256 (never printed). Conservative default, as
  Run 13: anything other than armed, JavaScript on, empty list → `STOP:` before any toggle (a non-empty list or a
  disarm may be the human's own setting). If you think another rule is needed, write it as a Proposed decision in
  your report, not in the sheet.
- No Chrome restart or kill; driver-opened windows only; never the user's tabs/windows; evidence shows fixture pages
  only; logs and transcripts grepped by count (`://` non-fixture, the token, the test patterns) before any line enters
  the repo; no screenshot committed; the token never printed. Kill only PIDs Test-SafeToKill calls safe or ones the
  runner started and identified; node PID 22152 is not ours.
- The build on disk is Step 9's (daemon build `99bb55c5…`); **no `npm run build` in this wave** unless SAFE-0's check
  fails (then: the sheet says what — a reload by the script first; a build only if dist is not Step 9's, and that is
  a STOP to return on, since it changes what is measured).
- Lane: `recipes/s9*`, `recipes/test/s9-rules.test.ts`, `recipes/tsconfig.s9.json`, `docs/e2e-test-plan.md` §4.21
  (and §1 only if a dated note is unavoidable — say so), the steps dir. No product code. Anything outside → escalate in
  your report.

## Checks before you return

`npx tsc --noEmit -p recipes/tsconfig.s9.json` 0; `npm run typecheck` 0; `npm test` = 2720 + n (state n per file);
`npm run build` 0 and `git status --short` shows no tracked change from the build (only your intended files);
`git diff f45e3bf -- docs/e2e-test-plan.md` touches no line inside §4.20's rows. Write
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-prep-builder.md` (report schema: what you did, files, test
count before → after, untested-live guesses for the runner, deviations, proposed decisions, gotcha candidates). Return
≤ 15 lines + the exact file list for the commit.


## Pasted verbatim from common.md

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
