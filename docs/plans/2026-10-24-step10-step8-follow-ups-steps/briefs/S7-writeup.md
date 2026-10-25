# S7 write-up builder — §5 Run 15, S7.md, commit

You are a NEW level-2 BUILDER (Opus 5.5) for Step 10 stage S7 of the chrome-agent-bridge repo
(C:\Users\aliev\Projects\chrome-remote-extention; Git Bash). Role: `.claude/skills/step-agent/role-prompts.md`
§Builder; report schema: `.claude/skills/step-agent/SKILL.md`. Writing rules: `docs/docs-writing-guide.md`. Read
CLAUDE.md, then in `docs/plans/2026-10-24-step10-step8-follow-ups-steps/`: `S7.ledger.md` (all of it), `S7-run-record.md`,
`S7-live-verifier.md` (the live verifier: PASS-with-notes), `S7-wave-sheet.md`, `S7.md` (interim), the reports
`S7-prep-builder.md`, `S7-prep-fixer1.md`, `S7-prep-verifier.md` (all sections), `S7-wave-fixer1.md`, `-fixer2.md`,
`-fixer3.md`, `S7-fix223.md`; the phase doc `docs/plans/2026-10-24-step10-step8-follow-ups.md` (Stage S7, S7.1–S7.6);
`docs/e2e-test-plan.md` §4.22 and §5 Run 14 (the model for Run 15's entry); decisions.md #193, #210–#225.
No Chrome, no daemon, no 9234, no build. Never edit decisions.md, the as-built register or CLAUDE.md; never edit a
§4.22 row's text (dated notes only).

DO:
1. `docs/e2e-test-plan.md` §5: a new `### Run 15 (S7) — 2026-10-25 (Step 10: Step 10's own rows, §4.22)` after Run 14,
   in Run 14's form: attempts and returns (1–5, runner A's redo, attempt 4), a row table with verdicts (from the record
   and the live verifier's row table), the found state and every restore read-back (equal by sha256), the STOP lines
   and their returns, counts (logs 0), PP1 and RET-1/RET-1R, the evidence files (`S7-run-record.md`,
   `S7-daemon-log.txt`, `S7-run-raw.txt`). Only fixture hosts; no token, pattern, value, saveTo path, real course name
   beyond "pp1".
2. §4.22: a dated `*Superseded 2026-10-25: …*` note where its opening paragraph still says RET-1 and PP1 are "NOT run"
   (granted by #221/#222; ran in Run 15) — the live verifier's minor.
3. Rewrite `S7.md` per the schema: Verdict; Outputs (commits since `02eb0c2` — list them from `git log`); Verifier
   verdict (prep, wave fixers' checks, #223 checks, live verifier); Deviations; **Proposed decisions** in decisions.md
   format, at least: SAVE-REFUSE's `[chrome.debugger] ` prefix on the product's own refusals (row text wrong vs product
   wording — recommend and give options), the R15-3 rule (#212/#224 outcome: R15-3R PASS with the exemption; whether
   R15-3's guard text keeps the narrower wording), SW-1R undetermined (d = 101, 1276, 1421) so no S7b, #217's outcome
   (SAVE-PRIM and SAVE-IDONLY: Revisit-if not met), MCPF-1/CAP-1 FAIL superseded in substance by MCPF-1R/CAP-1R PASS,
   the step-agent decisions D1–D6 at the ledger head, the #223 NITs (Chrome-start race; a late marked window left open;
   a TS-only mutant on empty target URLs), the worker-console check needing a toolbar disarm, and the live verifier's
   N1–N4; Findings with **gotcha candidates** (at least: Windows PowerShell 5.1 drops an empty argument passed through
   `-File`, e.g. `-ArgLine ''` → "Missing an argument"; headless `claude -p` actors call `ToolSearch` first unless
   `ENABLE_TOOL_SEARCH=false`; session restore adds windows after a relaunch, so "exactly one new window" needs a stable
   set + a title marker (#223); a Chrome-owned popup owned by the options window appears after a switch through it;
   `printf` in Git Bash turns `\a` in a Windows path into a control character); Handoff (S8 next; what the session agent
   should rule; daemon/processes state: all ended, Chrome running); test count 3165/130 → 3280/132; estimate (1.5 h prep +
   2 h live) vs actual from the ledger's stamps.
4. Commit (exact list, never `git add -A`; scan the additions first by count for the token — read `bridge.token` into a
   variable, never print it — non-fixture `scheme://host`, the real course host's domain; any hit → no commit, report): 
   `docs/e2e-test-plan.md` and in the steps dir `S7.md`, `S7.ledger.md`, `S7-run-record.md`, `S7-daemon-log.txt`,
   `S7-run-raw.txt`, `S7-live-verifier.md`, `briefs/S7-live-verifier2.md`, `briefs/S7-writeup.md` (and any other S7 file
   `git status` shows modified — list them). Message: `docs(e2e): S7 — Run 15 results and the stage report (verifier:
   PASS-with-notes)` with a body saying why, ending with exactly one trailer line after a blank line:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or tag; on index.lock wait and retry.
Finish in one go; spawn no agents. Return ≤ 10 lines: the commit hash, `git status --short`, anything not done.

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
