# S7 live runner brief (Step 10, stage S7 — Run 15, the live wave)

Written 2026-10-25 by the S7 prep builder (model: `briefs/S1-runner.md`); the step agent fills `b55048d` (the S7 prep
commit) and commits this brief before it spawns the runner (#213).

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge), branch `main`. Shell: the PowerShell tool
(Windows PowerShell 5.1) for the wave's blocks; Git Bash for git. Model: Opus 5.5. You are a level-2 LIVE RUNNER: you
must NOT spawn agents. The only other processes you start are the ones the sheet's blocks start — among them the
headless `claude -p` MCP actors of `recipes/s9-actor.ts` (processes, not agents; the blocks start and end them). Finish
in one go: run the wave start to end — or to the first STOP — then return.

Read first, in full: `CLAUDE.md` (its "Runtime gotchas" are measured facts and bind — the Step 8 and Step 9 sections
and "Driving Chrome from the outside (live waves, Windows)" above all); `docs/plans/2026-10-24-step10-step8-follow-ups-steps/
briefs/common.md` (part of this brief); `docs/e2e-test-plan.md` §4.22 (the R15 rows — the expected text and pass rules
are fixed; you never edit them) and §1 items 8–9; `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md`
(the run order and the commands — follow it block by block); `S7-prep-builder.md` (helper notes, untested-live
guesses); `S7.ledger.md`.

**STOP RULE (#193): on any STOP line — a restore that fails, a guard that prints STOP, a human gate (pinning, a
grant), any throw — run the restore first if the safety state was touched since the found-state record, record its
read-back, write the ledger, and RETURN to the step agent. A helper may be fixed only between rows, before any
observation of the next row, and never past a STOP line.**

`recipes/s10-r15.ps1` runs the restore itself on every STOP inside a block and exits 2: you then write the ledger and
return. For a STOP outside a block, run `-Block stop -Why "<what>"` first. Never resolve a STOP yourself — not a helper
bug, not an "obvious" fix, not a re-read (Run 13's runner did, four times, and the run failed on process: #192, #193).

## Grant and limits (decisions.md #33 standing grant of fixture waves; phase doc "Human gates")

You drive the user's REAL Chrome profile on fixture pages only: windows YOU open (W, E, D, O, R; bb-login's own window
in BBL-1's dry runs), the toolbar button pressed by a `FromPoint`-verified mouse click in W (pressing is allowed;
PINNING by mouse is not), the options page by UIA patterns, SDK scripts, headless MCP actors on fixture tabs, and one
throwaway headless Chrome with its own temporary profile (SAVE-IDONLY; never the user's profile). Binding:
- Never use the user's own tabs or windows; every UIA action targets the driver's own HWNDs (the helpers check
  identity). Never restart or kill the user's Chrome (RET-1 is prepared only: G10-2) → that is a STOP. No real site and
  no real login (BBL-1 is dry runs on 127.0.0.1:8085 only; the pp1 leg is prepared only: G10-3).
- **Pre-flight before any state change** (block 1, read-only): git clean (tracked files outside the steps dir —
  the ledger and the record live in the steps dir and may change) and HEAD includes the S7 prep commit `b55048d`; no `mcp/dist/index.js` process (none descending from your session, none from another); port 9234
  free or held only by a bridge daemon; 8080/8081/8083/8085 free. **PINNING RULE** (block 4): if the button is already
  pinned, proceed. If not pinned and UI Automation cannot pin it, the script prints `STOP: … HUMAN GATE (pinning) …` —
  return (no mouse-click pinning; #202 does not pre-approve it).
- **This wave builds**: block 2 runs `npm run build` of the committed code (no tracked change may follow), block 6
  reloads the extension by `recipes/reload-extension.ps1` (one re-run on exit 2; anything else is a STOP), and **L1 =
  SAFE-0** (block 8) proves the Step 10 build is loaded (§4.20's SAFE-0 text unchanged, plus the daemon's build id =
  the disk build and `evaluateSaveStart` answering the Step 10 `BAD_PARAMS`, never `UNKNOWN_METHOD`). A failed L1 is a
  STOP (no second reload).
- **Found-state guard** (block 8's tuple and block 10): anything other than armed, JavaScript on, an empty list → STOP
  before any change. The block-list count may be printed; its sha256 only when it is the empty text's; the restore
  prints only `block-list sha256 vs found equal`/`DIFFERENT`.
- Rows that need the pinned toolbar button: R15-3, SAVE-DISARM, block off. No row uses `Alt+Shift+K`.
- Kill only PIDs `Test-SafeToKill` calls safe, or ones the wave started and identified (the script does both). Node PID
  22152 is not ours: never touch it. The daemon ends by `daemon.shutdown` (or its identified PID); the servers by their
  own PIDs; the headless Chrome by `Browser.close`, then its identified PIDs.
- Never print or write the token, a block-list pattern read from Chrome, the test pattern, a `saveTo` path, an
  expression, an evaluated value, or a URL or title of the user's tabs. Evidence shows only fixture pages. Logs and
  transcripts are counted (`scheme://host`, the token, the pattern, the markers, 32-character value runs) before any of
  their lines enter the repo; the script copies `S7-daemon-log.txt` and `S7-run-raw.txt` only after their scans pass.
  No screenshot is committed. The saveTo files (`%TEMP%\bridge-e2e\s15\sv\`) are deleted at teardown.
- A failed row is RECORDED as failed with the observed text verbatim and the wave goes on (a `CHECK … FAIL` is not a
  STOP). Never re-run a row to make it pass; never edit a row's expected text; never change product code; never exempt
  anything from the gate; never choose a bound after seeing a measurement (SAVE-64's time and memory, SW-1's outcome,
  R15-POP-2's class and SAVE-IDONLY are records or pre-written outcome tables).
- RET-1 and PP1 are recorded `not run — waits for the user (G10-2 / G10-3)`; you never run `recipes/s10-ret1.ps1` or
  any `recipes/blackboard/` script.
- Long blocks: the PowerShell tool caps a call at 10 min; the longest block (save-ttl) takes about 6 min — call every
  block with the tool's timeout at its maximum (600 000 ms). Every block stops itself within its budget (sheet §1:
  budget + stop procedure ≤ 570 s). **A block that the tool still ends at its cap is a STOP:** run `-Block stop -Why
  "<block> hit the tool's 600 s cap"`, write the ledger and RETURN. Never a foreground sleep loop of your own.

## Record

Write `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-run-record.md` AS YOU GO (template in the wave sheet §8):
header, then **L1 = SAFE-0** as the record's first recorded line (S7.2), then every observation — the lines of blocks
1–7 go to `S7.ledger.md` ("Found state" / "Live PIDs"), not into the record before L1: UTC time · row ID · block ·
observed text verbatim · PASS / FAIL / NOT MEASURED / RECORD against §4.22; the outcome tables (SW-1, SAVE-PRIM,
SAVE-IDONLY, R15-POP-2) filled from the lines; RET-1 and PP1 recorded not run. The found state and the final read-back
by armed, JavaScript, count and sha256 only. Keep `S7.ledger.md`'s "Live PIDs", "Found state" and "STOP lines met /
returns" sections current (`-Block status` prints the PIDs and handles). Every STOP line you meet goes into the ledger
as a return, quoted verbatim (the live verifier matches each `STOP:` line in `%TEMP%\bridge-e2e\s15\r15-raw.txt` and
the daemon log to a return entry: S7.6 with Stage 0 F20).

At the end (block 35): all PIDs stopped, driver windows closed, the headless Chrome gone, the saveTo files deleted, pin
state and layout as found, ports 9234/8080/8081/8083/8085 free. Do not commit (the step agent commits after the live
verifier). Do not write §5 Run 15 (a later builder does).

## Return

≤ 20 lines: rows PASS / FAIL / NOT MEASURED / RECORD with the failed IDs; the outcome tables (SW-1, SAVE-PRIM,
SAVE-IDONLY, R15-POP-2); any STOP met (verbatim) and the restore read-back; the found state and the end read-back
(equal? sha256 equal?); log counts; PIDs started and stopped; deviations and set-up fixes (between rows only); anything
that needs the user; the record path.

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
