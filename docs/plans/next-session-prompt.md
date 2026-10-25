# Step 11 kickoff — D3 file upload (`browser_upload_file`, `Tab.upload`), with Step 10's ordered follow-ups

Written 2026-10-25 at Step 10's close, with the `phase-kickoff` skill, phase kind. Paste everything below the line
into a **fresh** Claude Code session started in `C:\Users\aliev\Projects\chrome-remote-extention`, launched so that
it is **not a bridge client**: `claude --strict-mcp-config --mcp-config <scratch>\no-mcp.json`, where the file holds
`{"mcpServers":{}}` (LESSON "the driver is not a bridge client" below). The Step 10 kickoff this file replaces stays
in git history and, frozen, as `docs/plans/2026-10-24-step10-step8-follow-ups-steps/kickoff.md`.

---

Dear Claude, you are the SESSION AGENT for **Step 11 — D3 file upload** of the chrome-agent-bridge repo (a localhost
daemon plus a Chrome MV3 extension, with an MCP server and a TypeScript SDK as its clients, that let an agent or a
script drive the user's real, logged-in Chrome profile). Step 11 lets a script or an agent put local files into a
page's `<input type="file">` — `Tab.upload` in the SDK, `browser_upload_file` in the MCP — through CDP
`DOM.setFileInputFiles`, with the files that may be uploaded decided by the human in Chrome. Before the upload work it
builds the two small items the user ordered at Step 10's close, and its live wave re-measures the ~1.5 s capture
switch. This prompt is self-contained; its reading list is in §3.

## 0. PRECONDITION (check before anything else)

*Met 2026-10-25: the user ruled every Step 10 open decision (decisions.md · 2026-10-25 · The user rules on Step 10's
open decisions; Step 10 closes (#229)). Go to Stage 0.*

**The run starts only after the user has ruled Step 10's open decisions** (decisions.md → Open decisions → Step 10:
#204's contract-level parts, #205–#208, #216 item 2, #217, #218, #219 item 1, #227). A ruling may add a small stage to
Step 11 — as #229 did. What #229 says, and what it means here:
1. #204–#208, #216 item 2, #217, #218, #219 item 1 are **accepted as built**: they are now contracts, not proposals.
2. **#227 option (b)**: the bridge's own coded refusals thrown inside `withDebugger` keep their message unprefixed;
   raw Chrome and page errors keep `[chrome.debugger] `; EVAL-5 is unchanged. Failing test first; a new live row
   SAVE-REFUSE-R in Run 16 → stage **S1** (phase doc 0.14 (a)).
3. **`kind` in `browser_evaluate`'s `saveTo` parameter description**, with a dated re-baseline of the MCP schema test
   for that one tool (decisions.md · 2026-10-25 · S2: the MCP schema baseline, a failed focus's answer, and the focus
   sentence (#214)) → stage **S1** (0.14 (b)).
4. **SW-2**: Run 16 re-measures the ~1.5 s capture switch as a new row, with a discarded warm-up trial first and its
   outcome table written before the run; no code change unless SW-2 decides one (0.14 (c); S5b only then).
5. The network rule against redirects onto blocked sites (#140, `declarativeNetRequest`) is **its own small step after
   Step 11**, before Step 12 — not Step 11's work (phase doc Follow-ups).
6. **G10-1 granted** (the `step8` tag and its push): that is Step 10's close-out. If it has not been done when you
   start, it is not yours — Step 11 never tags or pushes (G11-1).

If an open Step 10 decision were still unruled, you would stop here: one line in the run journal, ask the user, do
nothing else.

## 1. Opening

**Binding documents.**
- Phase doc (the plan; its checkboxes are the work items; "Exit checks (pre-registered)", "Human gates" and "STOP
  rules and forbidden fixes" are the pre-registered rules): `docs/plans/2026-10-25-step11-file-upload.md`. Its
  Decisions marked **(user)** (0.2's what, 0.14's what) were ruled by the user; the rest, and every proposed detail
  under a (user) heading, are proposals Stage 0 audits.
- Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §5 (layer contract), §6 (the human),
  §10 (protocol and codes), with the Step 9 and Step 10 dated notes. A new code amends §10 first (`shared/src/codes.ts`'
  header).
- What Step 10 built: `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md` — every "Contracts (binding
  forward)", now ratified by #229; and Step 9's: `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`. **Stage 0
  re-examines Step 10's and Step 9's contracts by execution.**
- Workflow: the `long-run` skill (`.claude/skills/long-run/SKILL.md`); briefs, ledgers, reports and role prompts from
  the `step-agent` skill (`SKILL.md`, `role-prompts.md`); bookkeeping with `session-closeout`; the next kickoff with
  `phase-kickoff`; writing rules in `docs/docs-writing-guide.md`.

**Precedence:** pre-registered rules (the phase doc's exit checks, human gates, STOP rules) > the phase doc > the
skills. The user's standing rulings apply on top: live fixture waves are Claude's end to end (decisions.md ·
2026-10-22 · Live E2E waves are run by Claude end to end (#33)); reloads by `recipes/reload-extension.ps1`
(decisions.md · 2026-10-23 · Later extension reloads use `recipes/reload-extension.ps1` (#65)), an exit-2 reload may
be re-run once (decisions.md · 2026-10-23 · S6's findings ruled: the user's answers, stage S6b for REP-1,
re-registered rows (#99)); fresh agents, never resumed ones (decisions.md · 2026-10-25 · Fresh agents instead of
resumed ones (#225)).

**Model.** Every agent at every level runs **Claude Opus 5.5, `claude-opus-5-5`** — step agents, builders,
verifiers, fixers, runners, the propagator — by the user's standing choice; headless E2E actor sessions (`claude -p`)
may run Sonnet, as in Steps 9 and 10, to spare the usage limit (decisions.md · 2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7
open decisions (#69): "I like higher quality product"; · 2026-10-24 · Step 10 agents run Opus 5.5 (#203)). Record
"Step 11 agents run Opus 5.5" as your first `docs/decisions.md` entry, `By: user`, citing #69 and #203. Pass `model:
"opus"` on every `Agent` call.

**Commits** end with exactly one trailer line and nothing after it:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` — no `Claude-Session` line (the user's instruction since
Step 10 S7; the `CLAUDE.md` Conventions line that mentions it is superseded for this run). Exact file lists; never
`git add -A`; never `dist/`, `bridge.token`, `.env`, `exports/`, a screenshot or a test file of the wave's.

**AUTONOMOUS — I am away; do not block on me.** Decide and record per `long-run` §3. What waits for me is the
integrity floor (§6) and these gates:
- **G11-0** Step 10's decisions ruled (§0) — met. **G11-1** any push or tag of Step 11's work. **G11-2** any upload to
  a page that is not a fixture on 127.0.0.1 or `*.localhost`, any real site, my credentials — decisions.md ·
  2026-10-25 · The user widens Step 10's grants: unlimited Chrome restarts, repeated pp1 reads, hidden pp1 writes
  (#222) was for Step 10 and is not standing; no Chrome restart is planned, and any needs a fresh grant.
- **Run 16 (S5) is yours** on fixture pages (#33), including toggling the safety switches, pressing the toolbar
  button and shortcut in windows you opened, and (phase doc "Human gates", proposed) adding the wave's own scratch
  folder to the options page's Upload folders and restoring the found text exactly. **Every live wave leaves the
  safety state as it found it** — armed? JavaScript? the block list and the upload folders, each counted and hashed,
  never printed — and records the read-back; a restore that fails is a stop: ask me.
- **Standing:** never push or tag; never use my own tabs or windows; never upload a file that is not one the wave made;
  any loosening of the token gate, the bind, a lease or lock rule, the cursor rule or the safety gate is a contract
  change — stop.

**Goal.** #229's two items built and proven; file upload built test-first across `shared`, `extension`, `daemon`,
`sdk` and `mcp`, with the human-held Upload folders enforced in the extension; Run 16 proving by the page's own hash
that each page received exactly the file on disk, every refusal leaving the page with nothing, SAVE-REFUSE-R and SW-2
measured; the safety state left as found.

**Baseline state** (verified 2026-10-25, table in §3): `main` at `eac8324` (`docs(step10): close-out — results, gate
checklist, Current state`) plus the commits that record #229 and add this file and the phase doc; `npm test` → 3273
passed, 132 files; `npm run typecheck` exit 0; `npm run build` exit 0 with no tracked file changed; 23 tools, 26
codes (25 on the wire + `NO_CURSOR`), 26 router methods. The daemon build on disk is `021286ab5f32…`, Run 15's;
the loaded extension was Run 15's build at Step 10's close (Step 10 `S7.md` Handoff) — S5's first row proves what is
loaded. Port 9234 free. Re-check all of it at Stage 0 and date it.

## 2. Agent contract

Read `.claude/skills/long-run/SKILL.md` and hold to it: §1 context discipline (you read reports and write markdown;
you never write feature code, run the suite in your own context, run or kill the daemon, or read diffs line by line),
§2 agent tree, §3 decisions, §4 the stop list, §5 waiting, §7 end of phase. **§6 revival is replaced by #225:** a
stage that must continue goes to a **new** step agent that resumes from its ledger; never `SendMessage` an earlier
agent.

**Form: three-level.** One **step agent per stage** (Stage 0, S1–S6 — §7); each spawns its own builder (or live
runner), an independent verifier and at most two fixer rounds, each a fresh agent. Level-2 agents never spawn agents;
a step agent reads and decides, it does not build or commit itself. Steps dir:
`docs/plans/2026-10-25-step11-file-upload-steps/` — create it first with an append-only `journal.md`,
`briefs/common.md` (model: Step 10's `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/common.md`, its
blocks cut verbatim from this file by line range) and `kickoff.md`, a byte copy of this file. As-built register:
`docs/plans/2026-10-25-step11-file-upload-asbuilt.md` (created at the first stage close).

**Parallelism** (host tests bind port 0, never 9234). **At most two step agents at once; a live stage runs alone.**
Stage 0 alone; S1 alone (it edits `debugger-errors.ts` and `registry.ts`, which S2–S4 edit after it); S2 alone (every
later stage builds on its types, code and gate); then **S3 ∥ S4** (file-disjoint: `extension/` vs `sdk/` + `mcp/`); S5
(live) alone after both, with no uncommitted code in the main tree; S6 last. Only the real daemon ever owns 9234, and
only S5 starts it.

**STEP BRIEF TEMPLATE** (paste for every step agent; fill the angle brackets):

```
You are the STEP AGENT for stage <STAGE> ("<plain stage name>") of Step 11 (D3 file upload —
browser_upload_file / Tab.upload via DOM.setFileInputFiles, the human-held Upload folders, and Step 10's
ordered follow-ups #227(b), saveTo's kind, SW-2) of the chrome-agent-bridge repo
(C:\Users\aliev\Projects\chrome-remote-extention; Git Bash shell; checks: `npm run typecheck`,
`npm test`, `npm run build`). Read CLAUDE.md first — its "Runtime gotchas" are measured facts and bind.
Then read docs/plans/2026-10-25-step11-file-upload-steps/briefs/common.md in full: it is part of this
brief. Model: claude-opus-5-5 (Opus 5.5); every agent you spawn: model "opus" (live stages only: headless E2E
actor sessions `claude -p` may run Sonnet).
GOAL: <one paragraph>.   INPUTS: <the phase-doc stage text verbatim with every dated note; the
kickoff's §7 row for this stage verbatim; the phase-doc "Decisions" that bind it; the design spec
sections that bind (§5, §6, §10 where touched); the Step 10 and Step 9 as-built contracts it touches;
the Step 11 as-built register so far; prior step reports; PIDs of anything running (normally nothing)>.
EXIT CRITERIA: <the pre-registered exit checks for this stage, by ID, verbatim; pass rules written
before anything is measured>.
LANE: <the stage's Lane from the phase doc, with §7's grants>. Anything outside the lane escalates.
WAITING: you hold long waits yourself — run the job in the background, end your turn, get re-invoked
by its completion; never a foreground sleep loop. A child "waiting on its own background work" is NOT
completion. Your builders/verifiers/fixers finish in one go and never wait. A child whose transcript
has not grown for an hour is stopped (TaskStop), checked for orphans, and its work handed to a FRESH
agent from the partial state and its report — never resumed by message (#225).
HOW YOU WORK: a builder does the work (role-prompts.md §Builder; failing test first for pure logic).
Then an INDEPENDENT verifier (never the builder; treats the builder report as claims; re-runs
typecheck/test/build from a clean worktree, re-derives counts, attacks the spec as well as the code,
checks the CLAUDE.md invariants, proves new tests fail without the change). FAIL → a FRESH fixer → a
FRESH verifier re-checks only the affected items. At most 2 fix rounds, then escalate. Level-2 agents
must NOT spawn agents. You read and decide; you do not build or commit yourself. Every agent is new:
never continue an earlier agent with SendMessage (#225).
LIVE STAGE (S5): the runner is a level-2 agent. It RETURNS to you on every STOP line — a restore
that fails, a guard that prints STOP, a human gate (pinning, a grant), any throw — after running the
restore if the safety state was touched. It may fix a helper only between rows, before any observation
of the next row, and never past a STOP line (decisions.md · 2026-10-24 · S4: Live runners return on
every stop; one stop rule for sheet and brief (#193)). The wave sheet and the runner brief carry this
one rule in the same words. Everything the runner reads is committed before it starts.
LEDGER: keep docs/plans/2026-10-25-step11-file-upload-steps/<STAGE>.ledger.md current after every
substep; a fresh step agent resumes from it; on a pause let running level-2 agents finish, write the
ledger, start nothing new, return.
AUTHORITY: decide mechanical and stage-local design questions; put each in your report under
"Proposed decisions" in the decisions.md format. Never edit decisions.md, the as-built register or
CLAUDE.md yourself.
ESCALATE (stop that line of work, report, return): <the ESCALATION list, verbatim>.
OUTPUT: docs/plans/2026-10-25-step11-file-upload-steps/<STAGE>.md per the report schema (Verdict,
Outputs, Verifier verdict, Deviations, Proposed decisions, Findings, Handoff; test count before →
after).
Commit your stage's work via a builder: exact file list (never dist/, bridge.token, .env, exports/, a
screenshot or a wave test file; never `git add -A`), message "<type>(<scope>): <stage> — <what>
(verifier: PASS|PASS-with-notes)" with a body that says why, ending with exactly the one trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and no other; on git index.lock wait and
retry; a classifier denial is reported, never retried or worked around. Never push, never tag.
Return a ≤ 15-line summary + the report path.
<SPEC-DISCREPANCY PROTOCOL — §5, verbatim>  <INTEGRITY FLOOR — §6, verbatim>  <LESSONS — below, verbatim>
```

**ESCALATION list** (the `step-agent` default, extended). A step agent escalates instead of deciding on:
- anything touching a pre-registered rule or a decision of the phase doc marked **(user)**, or a Step 10 contract
  ratified by #229;
- an effect outside its lane — another package, a later stage, the wire protocol, the manifest;
- any change to what the safety gate covers: a method exempted from or added to a class, a new extension method
  without a class, a new class, a code chosen for a refusal, what `listTabs`, an event, a refusal or a log reveals;
- any path by which a client, the daemon or a page could change the safety state — **the Upload folders included** —
  or reach the extension's own pages;
- the folder rule: where it is enforced, its boundary, case or link handling, its default, its storage key;
- the wire shape of `uploadFiles`, `UPLOAD_REFUSED`, codes, event names or params, the SDK's exported surface (eight
  values) or any Step 8 or Step 10 SDK signature, MCP tool names or input schemas (a schema re-baseline is recorded,
  never silent — #214);
- sending file bytes over the wire, or adding focus or the visibility lock to the upload;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` null-or-undefined,
  `{__bridgeError}` returned not thrown, the IIFE content script, `toSerializableArgs`, no top-level `await` in the
  worker, listeners at the top level of `sw.ts`, `ws` external, the `hasLayout` gate, the one walk in `a11y.ts`,
  `focusTab` as the only window focus, `activateForCapture`'s 1000 ms and 50 ms waits, never logging URLs, titles,
  header values, bodies, values, paths or the token);
- any integrity-floor item (§6) or `long-run` §4 stop — G11-1, G11-2, a reload exit other than 0 after one re-run, a
  Chrome restart or kill, the token, the bind, a safety-state restore that fails, a push or a tag;
- a STOP line met by a live runner (it returns; you decide or escalate — never "helper bug, safe to continue");
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger met;
- a port-9234 holder that is not the daemon, or an orphan `node`/`esbuild` process it did not start;
- a test count that drops without a documented move or removal;
- a permission or classifier denial; 2 failed fix rounds; a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` gotchas are the standing list — these are the ones Step 11
touches, the first eight carried from Step 10):
- **LESSON (Runs 13–15): a level-2 live runner RETURNS on every STOP line** (#192, #193). A restore failure, a guard
  printing STOP, a human gate (pinning, a grant) and any throw after the first state change all mean: restore if the
  state was touched, write the ledger, return. Never fix a helper past a stop and carry on, however obvious the bug.
  Run 14 returned three times and Run 15 five times, each correctly; that is the rule working.
- **LESSON (Step 10, #225): fresh agents, never resumed ones.** A stage that must continue goes to a new step agent
  reading its ledger; every builder, verifier and fixer is new. The S7 step agent was resumed five times with a
  nearly full context before the user stopped it. If a resume looks like the only way, the work is missing from a
  ledger or report: write it there first.
- **LESSON (S4b, #220): no `node_modules` junction in a scratch worktree.** Run `npm ci` in the worktree, or remove a
  junction only with `cmd /c rmdir <link>` before removing the worktree — never `rm -rf` / `Remove-Item -Recurse`
  across it: it emptied the main tree's `node_modules/.bin` and broke the jsdom tests.
- **LESSON (Run 14 Return 1, #213): commit before dispatching a runner.** Every brief fill-in, sheet edit and
  bookkeeping line is committed before a live runner starts; the wave's clean-tree guard caught an uncommitted
  journal and stopped the run.
- **LESSON (Run 15 RET-1): Windows PowerShell 5.1 drops an empty `-File` argument.** `-ArgLine ''` arrived with no
  value (`Missing an argument for parameter 'ArgLine'`, exit 1) and left Chrome down mid-row. Never pass an empty
  string to a `powershell -File` script; omit the parameter or use a sentinel, and test the call line in the helper's
  rule tests.
- **LESSON (Run 15 MCPF-1, CAP-1): a headless `claude -p` actor spends its first call on `ToolSearch`** (Claude Code
  defers MCP tools), so a row checking "the actor called exactly X" failed while the page saw every input. Start
  actors with tool search off (`ENABLE_TOOL_SEARCH=false`, `recipes/s9-actor.ts --no-tool-search`), or write the row
  to ignore `ToolSearch` — decide before the run, never after.
- **LESSON (Run 15 Return 5, #223): session restore adds windows after a relaunch.** "Exactly one new window" is not a
  test: wait until the window set is stable, open your own window with a unique title marker, and read only it. No
  relaunch is planned in Step 11; the rule binds any window-finding helper.
- **LESSON (S7 prep): a hung child is stopped when its transcript has not grown for an hour.** A prep fixer sat ~2.5 h
  with no file activity before it was stopped. Check its ledger and the partial edits, check for orphans (`node`,
  `python`, tsx's `esbuild.exe`), stop it, and hand the work to a fresh agent with the partial state named.
- **LESSON (#227, until S1 lands): an own coded `BridgeError` thrown inside `withDebugger` reaches the wire prefixed
  `[chrome.debugger] `.** Run 15's SAVE-REFUSE row was written to the throwing constant and FAILed. After S1 the
  bridge's own refusals pass unprefixed; raw Chrome and page errors keep the prefix. Tie expected texts to the code
  path, re-read `extension/src/debugger-errors.ts` before writing a row.
- **LESSON (#214): the MCP schema baseline changes only by a recorded, dated re-baseline**, one tool at a time (S1:
  `browser_evaluate`; S4: the new `browser_upload_file`); every other entry stays byte-identical.
- **An upload sends a local file to a web page.** Only files the wave created, only into fixture pages on 127.0.0.1 or
  `*.localhost`; evidence prints paths as `<ROOT>\<name>`; scan committed evidence and logs for the user's profile
  path by count. Never upload anything from my folders.
- **An `ok` is not evidence**: trusted CDP input into a background tab answers `ok` and does nothing (BG-1/BG-2,
  FE-1…3). Every upload row reads the page's own reporter (count, names, sizes, sha256, `isTrusted`), never the call's
  answer.
- **UI Automation facts (Chrome 156, Windows 11):** the toolbar extension button and the Extensions (puzzle) button
  expose **no UIA Invoke pattern** — the button is already pinned (#221); a reader that says otherwise returns and I
  am asked once, never a mouse click; the action title has a **second line** — compare the first only; the service
  worker's DevTools window is titled `DevTools`; after a switch is toggled on the options page a small Chrome-owned
  popup appears over it (decisions.md · 2026-10-25 · R15-3R: the guard ignores a popup owned by the wave's own window that covers nothing the row reads (#224)); an auto-hidden taskbar's 2 px strip lies in the work area — cut placements there.
- **Expected text is tied to the product's constants** (`recipes/test/s9-rules.test.ts`, `s10-rules.test.ts` do it);
  re-read the code for ordering and Chrome's own strings before committing a row (decisions.md · 2026-10-24 · S4: Dated notes on §4.20 for two expected-text errors (#195)). Re-measurements are new rows;
  a bound is never chosen after seeing the measurement.
- **Ports:** 8082 is bound by `SystemSettings.exe` on this machine; 8083 is the redirect server's (decisions.md · 2026-10-24 · S4: The redirect server uses port 8083 (#197)); pick the CSP
  fixture server's port at Stage 0 by `netstat`, threaded.
- **node may be missing from the Bash tool's PATH.** Put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1, npm 11.6.2, checked
  2026-10-25). Python is miniconda, `$HOME\miniconda3\python.exe`, for the fixtures. Run long checks in the background
  with a timeout; never a foreground command that can hang.
- **Listeners at the top level of `sw.ts`**; no top-level `await`; a new extension method enters the safety table
  (`GatedRouter.on` throws otherwise) and the daemon's method table (`daemon/src/methods.ts`).
- **`storage.local` holds the safety state** (a reload or a restart never re-arms); the Upload folders key joins it,
  read per call, failing closed. **The reload's hello comes up to 2 s later**; the reload script still proves it.
- **The driver is not a bridge client**: launched with `--strict-mcp-config` and an empty config; check with a process
  listing that no `mcp/dist/index.js` descends from it.
- **Headless actors** are read verbatim from the transcript, never from a paraphrase; send long prompts with `node
  --import tsx …`, not `npx` (`cmd.exe` refuses > 8191 chars); an actor's claim dies only with its connection.
- **A capture switches the human's view ~1.5 s** (SW-2 re-measures it); a failure report's screenshot does too.
- **UI automation of Chrome** (`recipes/reload-extension.ps1` is the model): never match by name alone; UIA `TabItem`
  is not a tab count; `chrome.exe --new-window chrome://…` opens a New Tab page — type the URL into your own window's
  omnibox. **A trusted click on a file input may open a native dialog** — never in a row without a tested way to close
  it in your own window (UP-CLICK).
- **Windows PowerShell 5.1 traps**: `—` mangled unless UTF-8 is set; the alias `R`; embedded `"` stripped from native
  arguments (send JSON from Git Bash); `>` writes UTF-16LE in a `-NoProfile` shell; variable names ignore case.
- **Recipes run with `tsx`**, and `String(fn)` page code breaks under tsx (`__name`): ship page code — the upload
  finder included, in tests and recipes — as literal strings; recipes typecheck with their own `tsconfig*.json`.
- **Kill only identified PIDs** (`Test-SafeToKill`, `docs/e2e-test-plan.md` §1 item 8); never `chrome.exe`.
- **`*.log` is gitignored**: attach logs as `.txt`; grep them for `scheme://host`, the token, the test patterns and
  the user's profile path by count, never printing them.
- **A subagent's report is a claim**: verify by diff before accepting; re-run each "finding".
- **The repo is public**: evidence shows only fixture pages and wave-made files — never my tabs, a real site, a
  pattern or folder I typed into my real options page, or a path under my profile.

## 3. Reading order

1. `docs/plans/2026-10-25-step11-file-upload.md` — all of it.
2. `docs/decisions.md` — Open decisions, then by date + title:
   - 2026-10-25 · The user rules on Step 10's open decisions; Step 10 closes (#229); · Fresh agents instead of resumed
     ones (#225); · S7: SAVE-REFUSE's `[chrome.debugger] ` prefix — the product stays for now; a fix is offered (#227);
     · S7: Run 15 stands as recorded; its follow-ups (#226); · S4: `saveTo`'s wire methods, refusals, store caps, SDK
     form and file finish (#218); · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s (#207); · S2:
     the MCP schema baseline, a failed focus's answer, and the focus sentence (#214); · S1: Run 14's wave mechanics are
     kept for Run 15 (#213); · RET-1's end safety read-back reads only a window the wave opens and marks (#223); ·
     Scratch worktrees never share `node_modules` through a junction a recursive delete can follow (#220); · The user
     grants RET-1's Chrome kill (G10-2) and the pp1 leg (G10-3) once for Run 15; the button is already pinned (#221)
   - 2026-10-24 · The roadmap after Step 8 (#129); · Phase E's design: the kill switch, the disarmed state, blocked
     sites, the JavaScript switch (#128); · The state is read per call, fails closed, and is locked to trusted
     contexts (#139); · The block-list grammar (#135); · `downloadStart` and redirects onto a blocked host (#140); · S4:
     Live runners return on every stop; one stop rule for sheet and brief (#193)
   - 2026-10-23 · The background-input policy (#89)
3. `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md` (contracts, S7's as-run), then `…-steps/S7.md`,
   `S7-run-record.md`, `propagator.md`; Step 9's as-built contracts.
4. `docs/plans/2026-09-03-step2-phase-d-action-fidelity.md` "Part D3 (optional) — file upload" (the 2026-09-03
   sketch this step expands).
5. `CLAUDE.md` — "Runtime gotchas" (the Step 9 and Step 10 blocks above all) and "Testing philosophy" bind; "Key
   files" is the map.
6. `docs/setup.md` (Safety; Running JavaScript; Writing a script) and `docs/e2e-test-plan.md` §1 items 8–9, §4.20–§4.22
   and §5 Runs 13–15 (the model for Run 16's rows and record).
7. `.claude/skills/step-agent/role-prompts.md`.

**Environment facts** (verified 2026-10-25 at `eac8324` unless stated):

| Fact | Value | Source |
|---|---|---|
| OS | Windows 11 Pro 10.0.26300 | session environment |
| Shell for agents | Git Bash; Windows PowerShell 5.1 also present | session environment |
| Node / npm | v25.2.1 / 11.6.2 (after the nvm PATH line) | `node --version`, `npm --version`, 2026-10-25 |
| Chrome (real profile) | 156.0.8078.48, Developer mode on, no flags (Run 15) | `docs/e2e-test-plan.md` §5 Run 15 |
| Baseline commit | `eac8324` (`docs(step10): close-out — results, gate checklist, Current state`), committed 2026-10-25 16:56 +0400; the docs-only commit `5a21346` (#229, the review doc) follows it; code unchanged | `git log -1`, `git status --short`, 2026-10-25 |
| `npm test` | 3273 passed, 132 files (`Test Files 132 passed (132)`, `Tests 3273 passed (3273)`, 28.4 s) | `vitest run` (= `npm test`), 2026-10-25 ~16:57 local |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0; no tracked file changed after the build | 2026-10-25 |
| Daemon build on disk | `021286ab5f32…` (Run 15's build) | `sha256sum daemon/dist/index.js`, 2026-10-25 |
| Loaded extension | Run 15's build at Step 10's close; not re-checked (no Chrome touched) — S5's first row proves it | Step 10 `S7.md` Handoff |
| Safety state at Run 15's end | read back equal to the found state after every attempt (armed, JavaScript on, empty block list as Run 13 left it) | Step 10 as-built § S7 |
| Extension id | `cpnemjbgecfbeicldpaaegbhjgjgjfep` | `docs/e2e-test-plan.md` §1 item 9 |
| Router methods / tools / codes | 26 / 23 / 26 (25 on the wire + `NO_CURSOR`) | `grep -c 'router.on(' extension/src/sw.ts`, `grep -c 'reg.tool(' mcp/src/tools/registry.ts`, `shared/src/codes.ts` |
| Ports | 9234 free (`netstat -ano` shows no `:9234`, 2026-10-25 16:57); 8082 bound by `SystemSettings.exe`; 8083 the redirect server's | `netstat`, #197 |
| Token | `bridge.token` at the repo root (gitignored) | `CLAUDE.md` |

## 4. Stage 0 — spec audit (one agent, before any code)

One step agent; its builder is the auditor, its verifier re-executes five findings. No feature code.

**(a) Code-cite compliance** — executed or confirmed, not just read: `extension/src/debugger.ts` (`withDebugger`,
`runWithDebugger`'s guard and session registry) and `extension/src/debugger-errors.ts` (where an own `BridgeError` is
prefixed — S1's change point; EVAL-5's expected text); `extension/src/safety.ts` (`METHOD_CLASSES`, `safetyDecision`,
how a new class `upload` and a path check sit in it), `safety-state.ts` (`SAFETY_KEYS`, the per-call read, the
wrong-type rule), `safety-match.ts` (the model for the folder matcher); `extension/src/evaluate/mark.ts` and
`content/marked.ts` (the mark pattern 0.7 reverses); `extension/src/content/a11y.ts` (file inputs are listed with
role `button`; `display:none` inputs are pruned — confirm by test); `handlers/target.ts` and `handlers/actions.ts` (how
an action resolves its target and carries `pastSnapshotCap`); `extension/src/options.ts`, `options.html`,
`options-model.ts` and `extension/test/safety-writers.test.ts`; `daemon/src/methods.ts`; `sdk/src/tab.ts`,
`client.ts`, `index.ts`, `download.ts`, `evaluate-save.ts`; `mcp/src/tools/registry.ts` (`browser_click`,
`browser_evaluate`'s `saveTo` description, `withSafetyRefusals`) and `mcp/test/s2-focus-first.test.ts` (the baseline);
`shared/src/protocol.ts` and `codes.ts`. **`DOM.setFileInputFiles`** — its parameters (`files`, `nodeId`,
`backendNodeId`, `objectId`), whether it needs `DOM.enable`/`DOM.getDocument` first, the events it fires, what it does
with a missing path, a directory, `accept` and a non-`multiple` input — from Chrome's protocol documentation (one
targeted search; record the source), stated plainly where only S5 can measure it.

**Re-examine Step 10's and Step 9's contracts by execution** (the as-built "Contracts (binding forward)", now ratified
by #229), on port 0 with a fake proto:2 extension where host-testable: 26 codes, `JS_DISABLED` without `data`,
`DISARMED {scope:"all"}`; `GatedRouter.on` throws on an unclassified method; `UNKNOWN_METHOD` in every state; the
`evaluateSave*` methods' classes and refusals; `pastSnapshotCap`; the `warning` event; the schema baseline; the log
scan's count. A contract that does not hold is a CRITICAL finding.

**(b) Internal consistency** — recompute: 26 router methods, 26 codes (27 after S2), 23 tools (24 after S4), 3273 tests
/ 132 files, the log-scan count; every bound in the phase doc (1–20 paths, the ≥ 40-case table, file sizes, SW-2's
950 ms / 300 ms thresholds).

**(c) Blind spots — seed list; extend it:**
- **The folder rule on Windows:** drive-letter case, `/` vs `\`, trailing separators on a folder, 8.3 short names
  (`PROGRA~1`), UNC and `\\?\` prefixes, alternate data streams, a folder given with `..`, a mapped network drive, a
  `subst` drive, OneDrive placeholders (files not on disk until read); POSIX case; a symlink or junction **as** an
  allowed folder; the real path on a different drive.
- **Exfiltration routes around the rule:** a file name that is a device (`CON`), a hard link inside the folder to a
  secret outside (realpath does not reveal hard links — record), a file swapped between the client's check and
  Chrome's read, the options page accepting a folder an agent wrote somewhere (it cannot write storage — confirm).
- **The element:** an input replaced by the page between the mark and the CDP call; an input in a cross-origin frame
  or a closed shadow root (no ref reaches it — confirm the message); a framework that re-renders on `change`; `input`
  vs `change` event order; a form that uploads on `change` (the fixture must not send anything anywhere).
- **The finder under CSP and with JavaScript off:** `Runtime.evaluate` under a strict CSP; whether the finder counts
  as "agent JavaScript" (0.5 says no — attack it).
- **Background tabs:** does `DOM.setFileInputFiles` work on a hidden tab (UP-1's outcome table); the debugger banner;
  a disarm during the call.
- **Logs:** the daemon's `redact` withholds lines with `://` or the token — a path has neither, so only "never log
  params" protects it; the SDK's failure report (does it carry params?); the MCP's error rendering; Claude Code's own
  transcript of an MCP actor (the model's prompt holds the path — evidence must replace the profile path).
- **S1:** which callers rely on the prefix today (`EVAL-5`, `describeDebuggerError`'s tests); whether `JS_DISABLED`
  or `DISARMED` thrown inside a session changes text.
- **SW-2:** the warm-up trial's place, the pre-checks of SW-1R, three measured trials, the table unchanged.
- **The token**: unchanged; nothing in Step 11 prints it.

**(d) Testability** — every exit check Z.1–S6.1 executable and discriminating, pass rules written before any
measurement; §4.23 rows with expected text before their run; flag any check that cannot fail.

**Output:** `…-steps/stage0-audit.md`, findings ranked CRITICAL / MAJOR / MINOR / NIT, tagged plan-side (amend the
phase doc in place with a dated note) or code-side (a stage item). All resolved before S1; then the stage split with
estimates in `journal.md`. The phase doc's **(proposed)** decisions, and the proposed details under its (user)
headings, are recorded by you in `docs/decisions.md` before Stage 0 is spawned, so the audit can attack them; a wrong
premise is a finding and you amend the decision with a dated note.

## 5. SPEC-DISCREPANCY PROTOCOL (verbatim in every brief)

```
SPEC-DISCREPANCY PROTOCOL. Intent beats procedure. When the code you are asked to write, the
phase doc, the design spec and CLAUDE.md's measured facts disagree, trace up the chain —
phase doc → design spec → CLAUDE.md runtime gotchas — and say so in your report; the deepest
layer that is internally consistent wins. Stakes pick who resolves it: mechanical (a stale
line number, a wrong count, a renamed file) → the fixer documents it in the report and the
step agent amends the phase doc in place with a dated note; design-local (a shape the plan
left open, a default) → the session agent records a decision in docs/decisions.md with the
rejected option; contract-level (the wire protocol, event names and params, codes, what is
gated and what a refusal reveals, how the safety state — the Upload folders included — is
changed and by whom, which files may be uploaded and where that is enforced, what the human
sees, the token lookup, the bind, the SDK's public surface and signatures, MCP tool names and
schemas) → long-run §3: a pre-stated rule applies mechanically, else the conservative choice
(security at least as strict; every existing tool and test behaves identically while armed with
JavaScript on, an empty block list and no upload folders; undoable), recorded under Open
decisions for the user. Code and spec never diverge silently: whoever changes behaviour amends
the governing doc in place with "*Superseded YYYY-MM-DD: was X, because Y.*". Verifiers report
findings with the command and its output; they never rewrite the spec or the plan.
```

## 6. Decisions and integrity floor

Decisions follow `long-run` §3: build decisions (module layout, test placement, the mark's attribute name, the
refusal's and the options page's wording, fixture shapes, the path cap's number) you take and record `By: Claude`;
contract decisions (0.3–0.6, 0.8, 0.9 of the phase doc, anything the safety table classifies) apply a pre-stated rule
or the conservative rule and are listed under **Open decisions** in `docs/decisions.md` and in the as-built register
for me at the gate. Only you write `docs/decisions.md`.

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP rule
that says escalate; a human gate (G11-1 any push or tag; G11-2 any upload to a page that is not a
fixture on 127.0.0.1 or *.localhost, any real site, the user's credentials; pinning the toolbar
button by mouse click — never; a reader that says "unpinned" returns and the user is asked once);
an extension reload whose script (recipes/reload-extension.ps1) exits non-zero after one re-run;
any Chrome restart or kill (needs a fresh grant); anything destructive or outward-facing (push,
tag, publish, history rewrite, rewriting main, deleting outside the repo, touching the user's
Chrome profile data or the user's own tabs and windows, uploading a file the wave did not make,
committing or logging the token); any loosening of the security boundary (the 127.0.0.1 bind, the
token gate, "never log URLs, titles, header values, bodies or paths"); permission or classifier
denials. (2) Phase-specific: a router method reachable without the safety gate; an upload accepted
for a file outside the human's Upload folders; the folder rule enforced anywhere but the extension,
or any way for a client, the daemon or a page to change the safety state (the Upload folders
included) or reach the extension's own pages; a live wave that leaves the safety state different
from the one it found — the wave records armed, JavaScript, and the sha256 of the block-list and
Upload-folders texts at its start, restores them and reads them back equal, never printing either;
a path, folder, file name, block-list pattern, URL, title, evaluated value or the token in any log
or committed evidence (fixture names under <ROOT> excepted); a live runner that continued past a
STOP line instead of returning (#193); an agent resumed by message instead of replaced (#225); a
drop in the test count without a documented move or removal; evidence showing a real site, the
user's own tabs or a path under the user's profile; killing a process that Test-SafeToKill did not
call safe. Standing rule: never resolve a decision in the direction that flatters a result already
seen; pass rules are written before the measurement; a failed check is reported, never re-tuned.
```

## 7. Stages

Each stage's deliverables are the phase doc's checkbox lines, pasted verbatim into the brief with their dated notes.
Exit checks are the phase doc's pre-registered IDs (Stage 0 may only make them stricter). Budgets are estimates; the
step report records the actual beside each. One commit per stage close.

| Stage | Deliverables | Exit checks | Budget | Parallel | Verifier focus (beyond the phase doc's) |
|---|---|---|---|---|---|
| **0 — Spec audit** | §4 | Z.1 | 2 h | first, alone | re-execute 5 findings; the contract runs are real (port 0); `DOM.setFileInputFiles`'s source cited |
| **S1 — Step 10's ordered follow-ups** | phase doc S1 (0.14 (a), (b)) | R.1, R.2 | 1 h | alone | the new test fails at `eac8324`; raw Chrome and page errors keep the prefix; EVAL-5 text unchanged; baseline differs in one entry |
| **S2 — The contract** | phase doc S2 (0.4–0.6, 0.10, 0.11) | S2.1–S2.5 | 2.5 h | alone | spec §10 note before the code; three matcher mutants red; no attach while disarmed; 27 codes; log count unchanged |
| **S3 — The extension** | phase doc S3 (0.7, 0.4's options page) | S3.1–S3.4 | 3 h | ∥ S4 | mark removed on every path; shipped strings tested; `a11y.ts`/`snapshot.ts`/`locate.ts` diff empty; writers test |
| **S4 — The SDK and the MCP** | phase doc S4 (0.8, 0.9) | S4.1–S4.4 | 2 h | ∥ S3 | zero calls on a preflight refusal; real path sent; eight values; one added schema entry; no directory in any answer |
| **S5 — Run 16 (live)** | phase doc S5 (0.12, 0.14 (a) row, (c); S5b only if SW-2 says so) | S5.1–S5.7 | 1.5 h prep + 1.5 h live | alone | every upload row by the page's reporter; refusals leave 0 files; restore read-back by hash incl. Upload folders; SW-2's warm-up excluded |
| **S6 — Docs** | phase doc S6 | S6.1 | 1 h | last | setup text matches the code byte for byte; gotchas cite sources |

**How the live wave runs** (#33, #193, #213): (1) rows and expected text committed, with every brief fill-in; (2)
record the safety state as found (armed? JavaScript? block list and Upload folders **counted and hashed, never
printed**); (3) main-tree `npm run build` of committed code, the reload script (exit 0; one re-run on exit 2), the
loaded-build proof first; (4) fixtures on 8080/8081 and the threaded CSP server, files made by the wave under
`<ROOT>`, actors: SDK scripts and headless `claude -p` sessions (Sonnet allowed) with tool search off; the toolbar button
and shortcut pressed and the options page edited only in your own windows; (5) on any STOP line the runner restores
and returns; (6) restore and read back; (7) results into `docs/e2e-test-plan.md` §5 as Run 16, with the run record
and the daemon log as `.txt`; a fresh verifier re-reads the record against the pre-written text and greps for
`scheme://host`, the token, the test patterns, the sentinel folder and the profile path by count. A failed row is
recorded, never fixed in the wave.

Propagator after S6: compares the as-built register with the phase doc, the design spec, `CLAUDE.md`,
`docs/setup.md`, `docs/e2e-test-plan.md`, `recipes/README.md`, `README.md` and the roadmap; dated correction notes in
place; a ledger. No code.

## 8. Close-out contract

- The phase doc's **Outcome** as results and its **Status**.
- The **as-built register** per `.claude/skills/phase-kickoff/asbuilt.md`: contracts binding forward (S1's unprefixed
  refusals and the re-baselined `browser_evaluate` entry; `uploadFiles`, `UPLOAD_REFUSED`, class `upload`, the Upload
  folders key and matcher, the target rule and the mark, `Tab.upload` and `browser_upload_file`; UP-1's background
  outcome; SW-2's outcome); decisions; deviations; estimates vs actuals; open decisions; Run 16's as-run.
- The **gate checklist** (item → met? → evidence): Z.1–S6.1; STOP rules not fired; one commit per stage with no
  `dist/`, token, `exports/`, screenshot or wave file; the safety state restored after the wave.
- **Needs the user's keyboard**, plainly: the open decisions; G11-1 (any push); a reload only if the script failed
  twice; `/mcp` in any interactive Claude session of mine (the MCP and daemon bundles change in S1–S4); and the one
  thing only I can do for real use — adding my own folder under Upload folders.
- Then `session-closeout`, and `phase-kickoff` for **the network-rule step** (the block list stops redirected
  requests with a `declarativeNetRequest` session rule, #140 — its own small step, by #229), then **Step 12 — Phase F**
  (`args` for `browser_evaluate`, console/error capture, the keep-attached debugger session, and with it file-chooser
  interception) — decisions.md · 2026-10-24 · The roadmap after Step 8 (#129); · 2026-10-25 · The user rules on Step
  10's open decisions; Step 10 closes (#229).

## 9. STOP RULES

**Stops the gate** (the write-up continues): a pre-registered exit check fails after 2 fix rounds; a router method
reachable without the safety gate; an upload accepted for a file outside the Upload folders; any path by which a
client, the daemon or a page changes the safety state (the Upload folders included) or reaches the extension's own
pages; a safety state not restored after the wave; a path, folder, file name, pattern, URL, title, evaluated value or
the token in a log or committed evidence; an upload to a non-fixture page; a `CLAUDE.md` runtime invariant that would
have to change; anything pushed or tagged; a live runner that continued past a STOP line; an agent resumed by message;
a port-9234 holder that is not the daemon, or an orphan `node` process; the test count drops without a documented
removal.

**Continues anyway, recorded:** a live row that fails (the wave records it; the fix is a proposed decision — UP-1's
background outcome above all); SW-2's outcome either way; UP-CLICK not run; build decisions on wording and layout; an
audit finding resolved plan-side with a dated note.

**Forbidden fixes:**
- enforcing the folder rule in the daemon, the SDK or the MCP instead of the extension (the client preflight is a
  convenience); matching a folder by bare string prefix, or case-insensitively on POSIX; dropping the real-path step;
- a wire, daemon, SDK or MCP method that reads, adds or removes an Upload folder, arms, disarms, edits the block list
  or turns JavaScript on; re-arming by default on a reload, an update or a Chrome restart;
- exempting a method from the safety gate, or reclassifying it, to make a row or test pass; a new extension method
  without a safety class;
- sending file bytes over the wire without a ruling; adding focus or the visibility lock to the upload without a
  measurement; judging an upload by its `ok`;
- a refusal message that names a path, folder or file; leaving the upload mark on an element;
- changing `a11y.ts`, a locator rule or the snapshot's output to make a hidden input targetable;
- removing the `[chrome.debugger] ` prefix from raw Chrome or page errors, or changing EVAL-5's expected text, in S1;
- re-baselining the MCP schema test silently, or for more than the one tool a stage names;
- leaving the safety state changed after the wave, or printing my real block list or Upload folders anywhere;
- editing a row's expected text after its run; choosing a bound after seeing the measurement (SW-2's table is 0.8's);
- lowering `activateForCapture`'s 1000 ms or 50 ms waits without SW-2 deciding it; adding window focus to a capture;
  adding `chrome.windows.update({focused: true})` outside `focusTab`;
- a runner fixing a helper past a STOP line and carrying on; resuming an agent by message;
- rewriting `main`, force-pushing, tagging or pushing;
- and, from Steps 6–10, still binding: weakening a lease or lock invariant; logging a URL, title, header value, body,
  locator text, an evaluated value, a `saveTo` path or the token; binding anything but `127.0.0.1` or widening the
  token rule; making `BridgeClient` reconnect on a close code other than 4002; letting the MCP crash when `connect()`
  fails; editing a test's expected text to match a changed error (S1's changed texts are ordered by #229 and listed
  per file); regenerating `sdk/test/fixtures/baseline-51de800.json`.

**Final report** leads with "Decisions taken while you were away" (date + title), then the gate measurements (test
counts per stage with the command, Run 16 rows with their observed text, the restore read-back), then open decisions,
then what needs my keyboard (§8).

I trust you — decide well and leave a trail we can audit.
