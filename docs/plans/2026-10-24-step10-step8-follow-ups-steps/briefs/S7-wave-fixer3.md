# S7 wave fixer brief, round 3 — re-measurement rows after Return 4 (non-live)

Repo C:\Users\aliev\Projects\chrome-remote-extention, `main` at `8acde66` + uncommitted record/ledger/log files that a
concurrent post-relaunch runner is writing — **do not edit `S7-run-record.md` or `S7.ledger.md`**. Model: Opus 5.5.
Level-2 FIXER: do NOT spawn agents; finish in one go; do not commit. **No Chrome action, no daemon, no port 9234, no
bridge MCP client, no `npm run build`.** Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`
in Bash calls running node/npm/npx. Every long command in the background with a bounded timeout; keep your report
`S7-wave-fixer3.md` current as you go. Write/Edit tools for code with backslashes.

Read: `CLAUDE.md`; `briefs/common.md`; decisions.md #210, #212, #221, #222; `S7.ledger.md` (Returns 2–4 and my
decisions); `S7-run-record.md` (MCPF-1, CAP-1, R15-3, SAVE-REFUSE, RET-1 lines); `docs/e2e-test-plan.md` §4.22;
`S7-wave-sheet.md`; `briefs/S7-runner.md`; `S7-wave-fixer2.md` (the `--no-tool-search` harness fix); `recipes/s10-r15.ps1`,
`s10-win.ps1`, `s10.ts`, `s10-rules.ts`, `s10-ret1.ps1`, `s10-ret1.ts`, `recipes/test/s10-rules.test.ts`; Run 15's raw
output `%TEMP%\bridge-e2e\s15\r15-raw.txt` (read locally; quote no URL).

The session agent's order (#222 allows Chrome restarts; re-measurements are NEW rows, never edits of observed rows; pass
rules written and committed before running):

1. **RET-1R:** fix `recipes/s10-ret1.ps1:73` (drop `-ArgLine ''`; the launcher's default applies — re-read
   `bgf-launch.ps1` to confirm that is a plain launch) and add a rule test that the launch line passes no empty argument
   (a text tie on the script, as other s10 tests do). New §4.22 row **RET-1R**: RET-1's steps, expected text and pass
   rule verbatim with the ID changed (its STOP rules unchanged, incl. "Chrome NOT running → the step agent tells the user
   at once"), plus a dated note: "*Added 2026-10-25 (S7 Return 4, #222): RET-1's relaunch failed by our bug (`-ArgLine ''`
   dropped by PS 5.1); RET-1 is NOT MEASURED and re-measured once as RET-1R.*" The script must accept a row ID (e.g.
   `-Row RET-1R`) so its lines print `RET-1R`; `-Granted G10-2` stays required.
2. **MCPF-1R and CAP-1R's MCP leg:** new rows whose steps, expected text and pass rules are MCPF-1's and CAP-1's MCP
   leg verbatim with the IDs changed, and one stated difference written into the row text before running: "the actor
   starts with tool search off (`--no-tool-search` → `ENABLE_TOOL_SEARCH=false`, S7 wave fixer 2; its start line must
   confirm it, else STOP), so its first call is a bridge tool; no check is relaxed." (The conservative form: no clause
   is loosened; ToolSearch is prevented, not excluded.) A dated note: "*Added 2026-10-25 (S7 Return 2/4, #222): MCPF-1
   and CAP-1 FAIL stand as recorded (first call ToolSearch); re-measured as MCPF-1R / CAP-1R with tool search off.*"
   Judged by the page reporter as before. New blocks (e.g. `mcpf1r-click`, `mcpf1r-type`, `mcpf1r-press`, `cap1r`) that
   reuse the existing helpers with the new row IDs; budgets under the 600 s cap; dependency test updated. CAP-1R's
   SDK half: decide — the SDK half passed in Run 15; re-run it only if the row needs it for the MCP leg's set-up, and
   say so in the row.
3. **R15-3:** from the raw output's occluder diagnostics, decide whether you can show the occluder was a window the wave
   itself opened (owned by O, the driver's options window) **and** that a guard which excludes such windows is not
   weaker for what R15-3 judges: e.g. the exclusion applies only to windows whose owner chain is a driver HWND AND whose
   rect does not intersect the UIA rects of the elements R15-3 reads (status text, checkboxes, summary) — measured, not
   assumed, at guard time. If you can, add **R15-3R** (R15-3 verbatim but the ID and that one guard rule written into the
   row, a dated note citing #212 and the coordinator's order) with a rule test of the exclusion predicate (owner chain,
   rect intersection) that fails without it. If you cannot show it, add nothing: write a proposed decision in your report.
4. **SAVE-REFUSE:** a dated note beside the row (never an edit of its text): "*Note 2026-10-25 (Run 15): observed codes,
   data and no-file as expected, but each message carried a `[chrome.debugger] ` prefix this row's expected text lacks;
   recorded FAIL as observed; see S7.md's proposed decision.*" Find where the prefix comes from in the product
   (`extension/src/debugger*.ts`, `evaluate/save.ts` — read only) and state it in your report with file:line, so the
   proposed decision can say whether the row text or the product is wrong.
5. **The new attempt's sheet:** a subsection "Re-measurements after Return 4 (attempt 4)" in the sheet and the runner
   brief: the exact command sequence for a new attempt that runs only the framing blocks the script requires
   (preflight … SAFE-0, found state, REP-0) then `mcpf1r-*`, `cap1r`, `r3r` (if added), restore, logs (scanning **every**
   Run 15 actor transcript, including attempts 1–2's — `mcpf-click`, `mcpf-type`, `mcpf-press`, `cap`, `save`, `fix`,
   `big` — the gap runner 4 reported; add this to the logs block if it is not there), teardown, then RET-1R per §6 with the
   fixed script; derive the exact `-Block reset -Attempt 4 -Skip …` call from the script's rule (the skip set = every row
   block observed so far) and prove it on a COPY of the state files (accepted; variants re-running an observed block
   refused; the real state files unchanged by hash). Note that the post-relaunch runner may still be ending PIDs while you
   work — read the state files, never write the real ones.

Keep the STOP sentence byte-identical in sheet and runner brief. Checks: tsc s10 and s9 0; `npm run typecheck` 0; `npm
test` = 3247 + n (per file); PowerShell parse 0 errors; `git diff 8acde66 -- docs/e2e-test-plan.md` only additions (new
rows and dated notes). Write `S7-wave-fixer3.md` (each item: change, file:line, proof; R15-3's verdict with evidence;
SAVE-REFUSE's prefix source; the commit file list). Return ≤ 12 lines.
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
