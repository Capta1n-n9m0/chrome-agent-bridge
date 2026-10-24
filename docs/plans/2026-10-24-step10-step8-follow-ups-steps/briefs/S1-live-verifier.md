# S1 live verifier brief (Step 10, stage S1 — Run 14)

Repo C:\Users\aliev\Projects\chrome-remote-extention, `main` at `111cb7b` + the runner's uncommitted `S1-run-record.md`,
`S1.ledger.md` and new `S1-daemon-log.txt`. Git Bash. Model: Opus 5.5. FRESH, INDEPENDENT level-2 LIVE VERIFIER
(`.claude/skills/step-agent/role-prompts.md` §Verifier; Run 13's `docs/plans/2026-10-24-step9-phase-e-safety-steps/
briefs/S4-live-verifier.md` is the model): the record and the runners' returns are claims. Do not spawn agents, do not
fix, do not commit, finish in one go. **No live Chrome, no daemon, no 9234, no `s9-r14.ps1` block.** Never print the
token, a non-fixture URL, a title or a block-list pattern from a live read: count them.

## Read

`CLAUDE.md`; `…-steps/briefs/common.md`; phase doc `docs/plans/2026-10-24-step10-step8-follow-ups.md` 0.1, 0.10, Exit
checks S1.1–S1.6 with the F20 note; `docs/e2e-test-plan.md` §4.21 (the pre-written text and pass rules, with its dated
notes) and §4.20 (untouched); `S1-wave-sheet.md`; `S1.ledger.md` (Returns 1–3 with the step agent's decisions; attempt
4); `S1-run-record.md` (attempts 1–4); `S1-daemon-log.txt`; the reports `S1-prep-*.md`, `S1-wave-fixer.md`,
`S1-wave-verifier.md`. Raw outputs (outside the repo, read locally, count — never copy lines with URLs/patterns into
your report): `%TEMP%\bridge-e2e\s14\r14-raw.txt` (attempt 4) and the archived `r14-raw.txt.20261024T211359Z`,
`…T214449Z`, `…T220012Z` (attempts 1–3 — confirm which is which), `r14-console.txt`, `redirect8083.log`,
`http808*.err`, `R14-4b.*`; `~/.chrome-agent-bridge/daemon.log`.

## Judge (each with command + output)

1. **S1.1** `git log` order: §4.21 committed in `5f17d54` before the record's first timestamp of any press (attempt 2's
   first state-touching or Chrome-touching line); later commits `bfadbbc`, `111cb7b` changed only helpers and §4.21
   dated notes — show `git diff 5f17d54 111cb7b -- docs/e2e-test-plan.md` touches no row text or pass rule; `git diff
   f45e3bf -- docs/e2e-test-plan.md` changes no line inside §4.20's rows.
2. **S1.2** each attempt's first recorded line is SAFE-0 with the §4.20 text unchanged; no reload except by
   `recipes/reload-extension.ps1` (state whether any reload happened).
3. **S1.3** row by row, observed text (record AND raw output — check the record quotes the raw verbatim) against
   §4.21's pre-written text and pass rules: R14-REL-3, R14-POP-1 (attempt 2), R14-3 (attempt 3: NOT MEASURED per the
   step agent's ruling — judge whether that verdict follows §4.21's rules), R14-4b, R14-5c-ctl, R14-5c, R14-RESTORE,
   R14-LOGS, R14-TEARDOWN (attempt 4), and the framing rows. Your verdict per row: agree / disagree with the recorded
   verdict, with reasons. R14-4b's banner lifetime is a RECORD (no bound).
4. **S1.4** found state and read-back per attempt (2, 3, 4): armed, JavaScript, sha256 equal; nothing printed beyond
   what §4.21 allows (empty-text sha256 only).
5. **S1.5 (with Stage 0 F20)** list every `STOP:` / guard line in all four raw outputs and in the daemon log since
   the wave began; match each to a Return entry in `S1.ledger.md`; any unmatched fails S1.5. Also judge: attempt 4's
   R14-TEARDOWN FAIL — §4.21 says a teardown failure "is a `STOP:` line" but the script printed none and exited 0;
   was any action taken after it (the runner says teardown was the last block)? Is this a runner continuing past a
   STOP (it was not printed) or a helper/row mismatch? Say which and why.
6. **S1.6** `daemon.log` (from attempt 2's mark) and the worker console captured (attempt 4 only; attempts 2–3 not
   captured — a recorded deviation): count the token, non-fixture `://`, `localhost:8081`, `:8083`, `bank.example` and
   any other test pattern — must be 0. Re-derive the counts yourself. Then the same counts over every file that will be
   committed (`S1-run-record.md`, `S1.ledger.md`, `S1-daemon-log.txt`, the reports) — fixture URLs/patterns quoted in
   row text are expected there; say exactly what is present and whether any non-fixture URL, title, token or real
   block-list pattern appears. Identify the 3 "other" `://` lines of the attempt-4 raw output by CLASS only (scheme +
   whether it is a driver window's own page), never printing them.
7. **Clean-up** port 9234/8080/8081/8083 free; no node but 22152; no driver windows left (read-only process/window
   listing; never kill anything).
8. **Process** fixer 1's dry run that reached the extension (prep deviation) and the step agent's three resume decisions:
   did any re-run a row that had made an observation? (Rule: never.)

Write `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-live-verifier.md`: verdict PASS / PASS-with-notes / FAIL
per exit check S1.1–S1.6 and overall; a row table (row, attempt, recorded verdict, your verdict); findings ranked with
command + output; gotcha candidates. Return ≤ 15 lines.


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
