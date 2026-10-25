# S7 post-relaunch runner brief (after Return 4; Chrome relaunched by the session agent)

Repo C:\Users\aliev\Projects\chrome-remote-extention, `main` at `8acde66` + the runner's uncommitted `S7-run-record.md`,
`S7.ledger.md`, `S7-daemon-log.txt`, `S7-run-raw.txt`. Model: Opus 5.5. Level-2 LIVE RUNNER: do NOT spawn agents; finish
in one go; do not commit. Shells: PowerShell tool for the helpers (dot-source `recipes/s10-win.ps1` as the wave does),
Git Bash for reads. Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` in Bash calls
running node. Long commands in the background or with a bounded timeout.

Read first: `CLAUDE.md` (Step 9 and "Driving Chrome from the outside"); `briefs/common.md`; `S7.ledger.md` (Return 4);
`S7-run-record.md` ("Attempt 3 (runner 4)", RET-1's lines); `docs/e2e-test-plan.md` §4.22 row RET-1 (its pre-written text
— judge against it, never re-tune); `S7-wave-sheet.md` §6; `recipes/s10-ret1.ps1`, `recipes/s10-ret1.ts`,
`recipes/s10-win.ps1` (`Test-S10LegState`, `Stop-S15Pid`/`Test-SafeToKill`).

Facts: RET-1 killed Chrome's browser process 32708 at ~10:51 UTC; the relaunch failed by our bug (`-ArgLine ''`); the
session agent relaunched Chrome at about 10:5x UTC with `recipes/bgf-launch.ps1 -Exe "…\chrome.exe"` (no `-ArgLine`):
"started pid 6448 … in job: False; user default environment", exit 0. Still running: RET-1's holder node 15396 (+ child
22500), the fixture server python 23944, a daemon node 17360. **RET-1 stays NOT MEASURED as the record shows** (its
relaunch failed by our bug); what follows is RECORD only.

STOP RULE (#193): on any STOP line — a restore that fails, a guard that prints STOP, a human gate (pinning, a grant), any
throw — run the restore first if the safety state was touched since the found-state record, record its read-back, write
the ledger, and RETURN to the step agent. A helper may be fixed only between rows, before any observation of the next
row, and never past a STOP line.

## Do, in order (append to the record under "After Return 4 (RECORD; RET-1 stays NOT MEASURED)")

1. **Record what happened after the relaunch**, verbatim, UTC stamps: from `~/.chrome-agent-bridge/daemon.log` since
   RET-1's mark (find it in the raw output), every `extension resync`, `extension session changed: <n> handles retired`,
   `safety state:` line (lines with `://` are withheld by the log itself — count, never print a URL); the holder's own
   output (where `s10-ret1.ps1`/`s10-ret1.ts` write it under `%TEMP%\bridge-e2e\s15\`) — any `tabGone`, old-tab call
   result or judge line; and the process state of 15396/22500. Judge each against RET-1's pre-written text and write
   "RECORD (RET-1 NOT MEASURED: relaunch failed by our bug)" beside it — no PASS/FAIL re-judgement of RET-1. Read only
   the extension's own / fixture tab facts; never the user's tabs, titles or URLs (count them if needed).
2. **RET-1's end read-back**: once the extension has reconnected (a `safety state:` or `extension resync` line after
   the relaunch, or `node --import tsx recipes/s9.ts wait-safety --row RET-1-end --timeout 90000`), run
   `Test-S10LegState RET-1 end` (it opens the options page in a window of its own, reads stored state, `daemon.status`,
   and the block-list sha256; it closes its window). Record its line verbatim. **Not equal → that is a STOP: write the
   ledger and RETURN at once** (first line of your return: "SAFETY STATE NOT EQUAL").
3. **End the leftovers by identified PID**: the holder 15396 and its child 22500 (check each command line names
   `s10-ret1` / tsx and its creation time predates the relaunch as recorded; `Test-SafeToKill` must say safe), python
   23944 (command line `http.server` on 8080 under `test-fixtures`), and the daemon 17360 by `daemon.shutdown` (an SDK
   call — e.g. `node --import tsx recipes/s9.ts shutdown` if present, else its identified PID via `Test-SafeToKill`).
   **Never** touch chrome.exe, node 22152, claude 23208/24284. Show ports 9234/8080/8081/8083/8085 have no LISTENING
   line after.
4. Update `S7.ledger.md` ("Live PIDs", a "After Return 4" entry). Return ≤ 12 lines: the recorded lines (n retired?
   tabGone?), the read-back verdict, the PIDs ended, anything unexpected.
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
