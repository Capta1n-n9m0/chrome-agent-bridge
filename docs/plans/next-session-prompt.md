# Step 7 kickoff — multi-actor tabs: `tabId` everywhere, handles, leases, the visibility lock, structured errors

Written 2026-10-22 by the session that ran wave W1 (the Step 6 live E2E wave), with the
`phase-kickoff` skill, phase kind. Paste everything below the line into a **fresh** Claude Code
session started in `C:\Users\aliev\Projects\chrome-remote-extention`, launched so that it is **not a
bridge client**: `claude --strict-mcp-config --mcp-config <scratch>\no-mcp.json`, where the file holds
`{"mcpServers":{}}` (LESSON "the driver is not a bridge client" below). The Step 6 kickoff this file
replaces stays in git history.

---

Dear Claude, you are the SESSION AGENT for **Step 7 — multi-actor tabs** of the chrome-agent-bridge
repo (a localhost daemon plus a Chrome MV3 extension, with an MCP server and a TypeScript SDK as its
clients, that let an agent or a script drive the user's real, logged-in Chrome profile). Step 7 lets
several actors work in parallel on different tabs without their actions mixing. This prompt is
self-contained; its reading list is in §3.

## 1. Opening

**Binding documents.**
- Phase doc (the plan; its checkbox lines are the work items, its "Exit checks (pre-registered)",
  "Human gates" and "STOP rules and forbidden fixes" are the pre-registered rules):
  `docs/plans/2026-10-21-step7-multi-actor-tabs.md`. Its dated *Corrected 2026-10-22* notes (written
  by Step 6's propagator) bind.
- Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, §5 (layer contract),
  §6 (multi-actor control: handles, leases, the visibility lock, the human), §7 (screenshots), §10
  (protocol v2, with its *Corrected 2026-10-22* note); §8.3 (MCP cursor) only as far as T4's
  "claim on first touch"; §12–§13 for risks and open questions.
- What Step 6 actually built: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` —
  "Contracts binding forward" and the "W1 as-built" section. Stage 0 re-examines them by execution.
- Workflow: the `long-run` skill (`.claude/skills/long-run/SKILL.md`); briefs, ledgers, reports and
  role prompts from the `step-agent` skill (`.claude/skills/step-agent/SKILL.md`, `role-prompts.md`);
  bookkeeping with `session-closeout`; the next kickoff with `phase-kickoff`; writing rules in
  `docs/docs-writing-guide.md` (plain language, decisions cited by date + title, codes glossed on
  first use).
- Decisions that bind, by date + title in `docs/decisions.md`: §3 item 3.

**Precedence when documents disagree:** pre-registered rules (the phase doc's exit checks, human
gates, STOP rules) > the phase doc > the skills — with one ruling already applied on top: the user's
decision of 2026-10-22 on live waves (below) amends the phase doc's G7-2 "a wave run with the user";
Stage 0 writes the dated note into the phase doc. A spec-vs-plan-vs-code conflict goes through the
SPEC-DISCREPANCY PROTOCOL in §5.

**Model.** Every agent at every level — you, each step agent, every builder, verifier, fixer and the
propagator — runs **Claude Opus 5.5, model id `claude-opus-5-5`**. The phase doc names no model;
this continues decisions.md · 2026-10-21 · Step 6 agents run Opus 5.5 and the user's W1 instruction
(2026-10-22) to delegate work to Opus subagents, but the user has not ruled it for Step 7. Put it to
the user with the W1 proposals (§1 precondition) and record it as your first `docs/decisions.md`
entry ("Step 7 agents run Opus 5.5": `By: user` if they answer, otherwise `By: Claude (default,
flagged for veto)`). State it in every brief; pass `model: "opus"` on every `Agent`
call. The only exception: the **E2E actor sessions** of stage T5 (headless `claude -p` sessions that
play Claude actors) may run Sonnet or Haiku, as wave W1's did.

**AUTONOMOUS — I am away; do not block on me.** Decide and record per `long-run` §3. What waits for
me is the integrity floor (§6): the `long-run` §4 list plus this phase's gates.
- **G7-1 — T1's live check** (build, reload the extension, run against the Step 6 daemon): needs my
  keyboard for the reload. If I am not present at T1's close, the step agent records it as deferred
  to the T5 wave (the phase doc allows this; exit check T1.6) and the T1 commit says so. Do not wait.
- **G7-2 — T5, the live E2E wave.** *Amended by decisions.md · 2026-10-22 · Live E2E waves are run by
  Claude end to end (#33):* you run the wave yourself — headless Claude sessions as actors, scripts
  through the SDK, PowerShell windows, launching and arranging Chrome windows, window captures for
  banner and flash checks. Only **one** step needs my keyboard: the **extension reload** after
  `npm run build` (`chrome://extensions` → ↻ on Chrome Agent Bridge), because Step 7 changes the
  extension (T1, T3) and #33 keeps "no extension change or reload" with me. When the autonomous part
  of T5 is done, ask me once to reload; if I do not answer, stop at G7-2 with the package (rows
  written, wave sheet ready) — that is the gate, not a failure.
- **G7-3** (the fixture's "open popup" button) needs no gate.
- **Any token or bind question** stops the run (`long-run` §4.4).
- **Standing:** never push; never commit `bridge.token`, `.env` or `dist/`; any loosening of the lease
  or lock semantics that lets one actor act on another's tab is a contract change — stop.

**Before Stage 0: the six W1 proposals (precondition).** `docs/decisions.md` → "Open decisions" lists
six proposals from wave W1, each with options and a recommendation in the Step 6 as-built (§ "W1
as-built" → "Proposed decisions — for the user"):
1. MUX-5 (the build handover row) is accepted on its re-measurement — recommended A.
2. NET-1's (the network-list regression row) expected size is corrected to `12.6 KB` — recommended A.
3. Step 7 makes `browser_status` and the actions agree on the active tab — recommended A (a Step 7
   Stage 0 item).
4. Step 8 checks which handles the spawned daemon inherits — recommended A (a Step 8 item).
5. DL-1's service-worker log line is accepted as not observed — recommended A.
6. Step 6 closes (gate G6-2) once 1 and 2 are accepted — recommended A.

If I have ruled on them when you start (they then appear in the log with `By: user`), apply the
rulings. If not, follow the wave loop of the `phase-kickoff` skill: ask me **once**, as one option
question per proposal with its recommendation; if I leave one unanswered, apply the recommendation as
a default, record it in `docs/decisions.md` as `By: Claude (ratified <date> as a default)`, flag it
for my veto in the final report, and continue. Step 6's close (proposal 6) then follows: mark it in
the Step 6 phase doc's Status line with a dated note. Proposal 3 is seeded in the Stage 0 blind-spot
list (§4) **either way**; if accepted, it becomes an audit item with a stage owner. Proposal 2 matters
to exit check T5.3 (the NET-1 regression row).

**Goal.** Several actors work in parallel on different tabs without their actions mixing. Every
extension method takes an explicit `tabId`; the daemon mints **handles** (`T1, T2, …`), enforces
**leases** (one actor per tab, fail fast with `TAB_HELD`) and holds a **visibility lock** around the
only instructions that need the tab on screen (`screenshot` in its default mode, `focusTab`); the
extension emits tab lifecycle events, so a handle survives a Memory-Saver discard and a dead tab
reports its last URL; errors carry codes end to end; the extension returns data and the text
formatters move to `sdk/src/format/`, rendering byte-identical text. The MCP tool count goes 21 → 22
(`browser_focus_tab`). After this step a script on T3 and Claude on T1 run at the same time, and a
screenshot of either flashes the tab for a frame and restores the human's view. Locators, the typed
`Tab` API and the MCP cursor tools are Step 8.

**Baseline state** (verified 2026-10-22 by the W1 session; see §3 for the table): `main` at the
commit `docs: Step 6 E2E results`, made right after this file was written, on top of `fef70ff`
(`git log -1 --format=%h -- docs/plans/next-session-prompt.md` finds it). `npm test` → 542 passed,
42 files; `npm run typecheck` exit 0; `npm run build` exit 0; 21 tools
(`grep -c "server.tool(" mcp/src/tools/registry.ts`). The loaded extension matches `extension/dist`
(no extension change since `1a92d95`; no `unknown method` error in W1). Port 9234: a daemon may be
running or idling out; nothing else holds it. Re-check all of it at Stage 0 and date it.

## 2. Agent contract

Read `.claude/skills/long-run/SKILL.md` and hold to it: §1 context discipline (you read reports and
write markdown; you never write feature code, run the suite in your own context, run or kill the
daemon, or read diffs line by line), §2 agent tree, §3 decisions, §4 the exhaustive stop list, §5
waiting, §6 revival, §7 end of phase.

**Form: three-level.** You spawn one **step agent per stage** (Stage 0, T0–T6); each step agent spawns
its own builder, independent verifier and at most two rounds of fixer. Level-2 agents never spawn
agents. T5's live part holds long waits (idle exits, 30 s typing, flash captures): its step agent
holds them per `long-run` §5. Steps dir: `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/` —
create it first, with an append-only `journal.md`; ledgers, briefs, reports and evidence go there.
As-built register: `docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md` (you create it at the
first stage close).

**Parallelism** (from the phase doc's "Order of work"; host tests bind port 0, never 9234):
- Stage 0 first, alone. T0 next, alone (T1 and T2 import its types).
- **T1 ∥ T2** after T0: file-disjoint (`extension/` + the fixture vs `daemon/`), no shared port, no
  running process. Stage 0 may re-order (Step 6's audit did; decisions.md · 2026-10-22 · Stage order
  D0 → D1 → (D2 ∥ D4) → D3 → D5, and the Stage 0 builder resolutions).
- T3 after T1 (same files). T4 after T2 and T3. T5 after T4. T6 last.
- Only one thing owns 9234 at a time: the real daemon. No autonomous stage before T5 starts one;
  T5's live part is serialised (one wave, one step agent).

**STEP BRIEF TEMPLATE** (paste for every step agent; fill the angle brackets from the phase doc):

```
You are the STEP AGENT for stage <STAGE> ("<plain stage name>") of Step 7 (multi-actor tabs:
tabId everywhere, handles, leases, the visibility lock, structured errors) of the
chrome-agent-bridge repo (C:\Users\aliev\Projects\chrome-remote-extention; Git Bash shell; checks:
`npm run typecheck`, `npm test`, `npm run build`). Read CLAUDE.md first — its "Runtime gotchas"
are measured facts and bind.
Model: claude-opus-5-5 (Opus 5.5); every agent you spawn: model "opus" (T5 only: the headless
E2E actor sessions may run Sonnet or Haiku).
GOAL: <one paragraph>.   INPUTS: <the phase-doc stage text verbatim: its checkboxes, Lane, Parallel
with, Verifier focus, Needs the user's keyboard, and every dated note under it; the phase-doc
"Decisions" 0.1–0.8 that bind this stage; the design-spec sections that bind (§5, §6, §7, §10);
the Step 6 as-built contracts this stage touches; the Step 7 as-built register so far
(docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md); prior step reports; PIDs of anything
running (normally nothing)>.
EXIT CRITERIA: <the phase doc's pre-registered exit checks for this stage, by ID, verbatim; pass
rules are written down before anything is measured>.
LANE: <the stage's Lane from the phase doc>. Anything outside the lane escalates.
WAITING: you hold long waits yourself — run the job in the background, end your turn, get
re-invoked by its completion; never a foreground sleep loop. A notice that a child is
"waiting on its own background work" is NOT completion: end your turn and wait for its
hand-back report. Your builders/verifiers/fixers finish in one go and never wait.
HOW YOU WORK: a builder does the work (role-prompts.md §Builder; failing test first for
pure logic). Then an INDEPENDENT verifier (never the builder; treats the builder report as
claims to audit; re-runs typecheck/test/build from a clean tree, re-derives counts, attacks
the spec as well as the code, checks the CLAUDE.md invariants, checks that new tests fail
without the change). FAIL → fixer → the verifier re-checks only the affected items. At most
2 fix rounds, then escalate. Level-2 agents must NOT spawn agents. Read their outputs and
the resulting files yourself before accepting.
LEDGER: keep docs/plans/2026-10-21-step7-multi-actor-tabs-steps/<STAGE>.ledger.md current
after every substep. If respawned, resume from it.
AUTHORITY: decide mechanical and stage-local design questions. Put each one in your report
under "Proposed decisions" in the decisions.md format (below). Never edit decisions.md,
the as-built register or CLAUDE.md yourself.
ESCALATE (stop that line of work, report, return): <the ESCALATION list below, verbatim>.
OUTPUT: docs/plans/2026-10-21-step7-multi-actor-tabs-steps/<STAGE>.md per the report schema
(step-agent skill: Verdict, Outputs, Verifier verdict, Deviations, Proposed decisions, Findings,
Handoff; test count before → after).
Commit your stage's code/docs via a builder: exact file list (never dist/, never
bridge.token or .env, never `git add -A`), message
"<type>(<scope>): <stage> — <what> (verifier: PASS|PASS-with-notes)" with a body that says
why, plus the session's Co-Authored-By / Claude-Session trailers; on git index.lock, wait
and retry. If the commit is denied by the permission classifier, do not retry: report it.
Never push.
Return a ≤ 15-line summary + the report path.
<SPEC-DISCREPANCY PROTOCOL — §5 of the kickoff, verbatim>  <INTEGRITY FLOOR — §6, verbatim>
<LESSONS — the block below, verbatim>
```

**ESCALATION list** (the `step-agent` default, extended for this phase). A step agent escalates
instead of deciding on:
- anything touching a pre-registered rule (an exit check, a human gate, a STOP rule) or a fact of the
  design of record (§5, §6, §7, §10 of the spec; phase-doc decisions 0.1–0.8);
- an effect outside its lane — another package (`shared/`, `daemon/`, `sdk/`, `mcp/`, `extension/`), a
  later stage, a shared script, the wire protocol — except the grants written into the stage's Lane
  (T1: `test-fixtures/e2e-playground.html`; T3/T4: moving test cases from `extension/test/` to
  `sdk/test/`; T5: `docs/e2e-test-plan.md` and `recipes/`);
- any change to the lease or lock semantics (who may act on a held tab; FIFO; when the lock is taken
  and released), to what the human sees (0.5 no window focus, 0.8 `newTab` in the background), or to
  the event names, params or codes on the wire;
- any integrity-floor item (§6) or anything on the `long-run` §4 stop list — in particular the
  extension reload (G7-1, G7-2), the token lookup, the `127.0.0.1` bind;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` treating null OR
  undefined as failure, the content script as an IIFE, no top-level `await` in the service worker,
  `webRequest` — and now `chrome.tabs` — listeners at the top level, `ws` external to the daemon and
  MCP bundles, the zero-size snapshot filter gated on `hasLayout`, never logging URLs, titles, header
  values, bodies or the token);
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger being met
  (decisions.md entries of 2026-10-21 and 2026-10-22);
- a port-9234 holder that is not the daemon (`node …/daemon/dist/index.js`, its pid and build in
  `~/.chrome-agent-bridge/daemon.log`), or an orphan `node` process it did not start;
- a test count that drops without a documented move (T3 and T4 move tests; the move is counted);
- anything that needs the real Chrome profile before T5, or the extension reload at any time;
- a permission or classifier denial;
- 2 failed fix rounds;
- a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` runtime gotchas are the standing list — these
are the ones Step 7 touches, plus those learned in Step 6 and wave W1):
- **node is not on the Bash tool's PATH here.** Put the nvm-windows shim directory first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1). Every
  builder and verifier brief carries this line. Python is miniconda, not on PowerShell's PATH:
  `$HOME\miniconda3\python.exe` (Python 3.14.7) serves the fixtures.
- **The active-tab mismatch** (W1, MUX-5; `CLAUDE.md` gotcha "`browser_status`'s active tab is not
  always the tab actions use"): `listTabs` marks the first active tab of *any* window, every action
  resolves `tabs.query({active:true, lastFocusedWindow:true})` (`extension/src/tabs.ts`). A focused
  DevTools window (the service-worker console) makes status name a tab that every action refuses with
  `No active tab in the last-focused window`. Touches T1 (`targetTab`'s fallback), T2 (`listTabs`'
  `active` annotation, `tabs.claim {active:true}`), T4 (the MCP's first-touch claim) and T5 (never
  leave a DevTools window focused during a row; focus a normal Chrome window first).
- **Opening the service-worker console moves the last-focused window** (W1, MUX-5 and DL-1): a check
  that needs it disturbs the row. Prefer evidence that does not need DevTools (tool output, the daemon
  log, window captures); if a row needs the console, open it in its own step and close it before the
  next action.
- **The driver is not a bridge client.** A driver session with the bridge MCP is itself a client: it
  changes every client count, and in Step 7 it could hold leases. Launch it with
  `claude --strict-mcp-config --mcp-config <empty>` (decisions.md · 2026-10-22 · W1's set-up: the
  driver has no bridge MCP, the token moves from the MCP config into `bridge.token`). This session is
  launched that way; check with a process listing that no `mcp/dist/index.js` descends from it.
- **Headless Claude sessions are the E2E actors** (W1, MUX-9 on):
  `claude -p --model sonnet --allowedTools mcp__chrome-agent-bridge "<prompt>"` in the repo, resumed
  with `--resume <session id>` across a row; each one is a separate MCP client named
  `claude-code #<pid>`. Several at once is exactly what LEASE-1, LEASE-4 and SCREEN-3 need. A
  headless session cannot run `/mcp`; a fresh one loads the current `mcp/dist/index.js`.
- **Read tool outputs verbatim from the transcript**, `~/.claude/projects/C--Users-aliev-Projects-chrome-remote-extention/<session>.jsonl`,
  never from a model's paraphrase of them (W1 run record).
- **Banner and flash checks by window capture:** W1 captured Chrome's window with `PrintWindow`
  every 0.5 s (works when the window is covered) and compared a pixel signature of the band under the
  bookmarks bar. SCREEN-1's flash needs a much finer method (a faster capture loop, or page-side
  `visibilitychange` timestamps on the fixture tab) — chosen and written down before the run.
- **Windows PowerShell 5.1 mangles `—`** into `â€"` (program output decoded with the console code
  page; `Add-Content`/`Set-Content` write ANSI). Set `[Console]::OutputEncoding = [Text.Encoding]::UTF8`,
  read with `-Encoding UTF8`, write UTF-8 with Node or `[IO.File]::WriteAllText` (`CLAUDE.md` gotcha).
- **PowerShell 5.1 splits `Start-Process -ArgumentList '-Command', '<string with spaces>'`** — put the
  block in a `.ps1` and use `-File` (W1 finding 3).
- **A daemon spawned through `Start-Process -NoNewWindow` held the caller's output pipe open** (W1,
  MUX-6, by correlation; `CLAUDE.md` gotcha): send wave blocks' output to a file, or stop the daemon
  afterwards. (Fixing the inheritance is a Step 8 item if proposal 4 is accepted.)
- **`*.log` is gitignored:** attach logs as `.txt` (W1 attached `W1-daemon-log.txt`).
- **Kill only identified PIDs:** `Test-SafeToKill <pid>` (docs/e2e-test-plan.md §1 item 8) must
  print `safe: …` before any `Stop-Process`/`taskkill` (#33's limit). On Windows a `detached` daemon
  dies in a tree kill of its own spawner (decisions.md · 2026-10-22 · The detached daemon's survival
  depends on how the session's MCP is killed; measured in W1 MUX-7 (a)).
- **`npm run build` changes the live daemon's build** (build-id handover, `CLAUDE.md`): the next
  client to connect on this machine hands the running daemon over. From the stage that changes the
  daemon until T4, a daemon built from the main tree may not match the MCP my own sessions run
  (§4 (c)). Verifiers build in a clean worktree, as Step 6's did.
- **`ws` emits several frames from one TCP read synchronously** (`CLAUDE.md`): a one-shot listener
  must unsubscribe inside its own callback — T2's events (`tabCreated` right after a `newTab`
  result) and T4's typed events are exactly this shape.
- **Editing extension code requires a manual reload**, not even a Chrome restart picks it up. Through
  the Step 6 daemon a stale extension's `unknown method: X` reaches clients with code `INTERNAL`
  (match the message text, not the code, until T1 teaches the extension codes).
- **A subagent's report is a claim: verify by diff before accepting** (Step 6 W0 and every stage
  since). Re-run each "finding" against the file it cites before acting on it.
- **The repo is public** (guide rule 8): evidence from the real profile shows only the fixture pages
  — never a page, title or URL of the user's own tabs (exit check T5.4).

## 3. Reading order

1. `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §5, §6, §7, §10 bind; §8.3 for the
   cursor; §12 (risks E2E must settle) and §13 (open questions).
2. `docs/plans/2026-10-21-step7-multi-actor-tabs.md` — all of it, including every dated note.
3. `docs/decisions.md` — "Open decisions" (the six W1 proposals, §1) and the entries that bind this
   phase, by date + title:
   - 2026-10-21 · Steps 6–8 run under the long-run contract
   - 2026-10-21 · Step 6 agents run Opus 5.5 (continued for Step 7, §1)
   - 2026-10-21 · The actor name carries the MCP's own process id
   - 2026-10-21 · selectTab stays as an alias of focusTab for one release
   - 2026-10-21 · Step 7 T1's `activeTab()` count is 4 in actions.ts, 13 across handlers
   - 2026-10-21 · Step 7 T1 adds the fixture's "open popup" button
   - 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon restart
   - 2026-10-21 · Step 6 writes the DL rows for browser_download before its D6 wave
   - 2026-10-22 · D0's protocol shapes: optional wire code, strict v2 hello fields, events without
     id (its revisit trigger — "Step 7 teaches the extension codes" — fires in T0/T1)
   - 2026-10-22 · D2's daemon details: parseHello beside validateHello, BAD_PARAMS for bad ids, no
     forwarded timeoutMs, interim defaults (its trigger "Step 7's extension wants the envelope
     timeout" — check in T2)
   - 2026-10-22 · BridgeClient exposes welcome, extensionConnected and on("reconnected") in Step 6
   - 2026-10-22 · A reconnect after 4002 never hands the daemon over
   - 2026-10-22 · What clients do on a close code other than 4002
   - 2026-10-22 · D5's MCP link: a `client.connect()` health check, a thin config, interim exports gone
   - 2026-10-22 · The MCP connects without waiting for the extension, so Chrome closed reads as today
   - 2026-10-22 · D3's daemon lifecycle: idle armed at start, every shutdown exits 0, bad env values,
     the log policy
   - 2026-10-22 · The detached daemon's survival depends on how the session's MCP is killed, and
     2026-10-22 · The user rules on the seven Step 6 open decisions (#31) — MUX-7 confirmed #14 in
     W1, so per #31 **no double-spawn launcher is a Step 7 prerequisite**
   - 2026-10-22 · The D6 wave's set-up: token from `bridge.token`, a quiet recipe, a dist-comment
     rebuild, a local redirect fixture, tagged steps
   - 2026-10-22 · W1's set-up: the driver has no bridge MCP, the token moves from the MCP config into
     `bridge.token`
   - 2026-10-22 · Live E2E waves are run by Claude end to end
4. `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` — every stage section's
   contracts, "Contracts binding forward", and "W1 as-built"; the W1 evidence in
   `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/W1-run-record.md`; the Step 6 wave sheet
   `…-steps/D6.md` as the model for T5's.
5. `CLAUDE.md` — "Runtime gotchas" (three are new from W1: the active-tab mismatch, the
   `Start-Process -NoNewWindow` pipe, PowerShell's `—`) and "Testing philosophy" bind; "Key files" is
   the map.
6. `docs/setup.md` (T4 and T6 change it: handles, owners, `browser_focus_tab`, screenshot modes) and
   `docs/e2e-test-plan.md` — §1 item 8 (the wave helpers: `Get-BridgeDaemon`, `Get-BridgeLog`,
   `Test-SafeToKill`, …), §4.12 and §4.13 (the MUX and DL rows, as the model for LEASE/SCREEN/BG
   rows), §5 Run 7 (how the last wave was recorded).
7. `.claude/skills/step-agent/role-prompts.md` — the builder / verifier / fixer / propagator prompts.
8. `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md` only for what Step 8 expects from
   Step 7's as-built (BG-1/BG-2 set `sdk/src/policy.ts`; the `CODE:message` convention; the
   `activeTab()` fallback removal).

**Environment facts** (verified 2026-10-22 by the W1 session unless stated):

| Fact | Value | Source |
|---|---|---|
| OS | Windows 11 Pro 10.0.26300 | session environment |
| Shell for agents | Git Bash; Windows PowerShell 5.1 also present | session environment |
| Node | v25.2.1 via the nvm-windows shim dir (not on Git Bash PATH; see LESSONS) | `node -v` |
| Python | miniconda `$HOME\miniconda3\python.exe` (3.14.7), not on PowerShell's PATH | W1 set-up |
| Chrome (real profile) | 156.0.8078.48 | W1 Run 7 header |
| Baseline commit | `docs: Step 6 E2E results`, parent `fef70ff` | `git log` |
| `npm test` | 542 passed, 42 files | W1, start of the wave and the verifier's re-run |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 | W1 |
| Tools | 21 | `grep -c "server.tool(" mcp/src/tools/registry.ts` |
| `activeTab()` call sites in handlers | 13 | `grep -rn "activeTab()" extension/src/handlers \| wc -l`, 2026-10-22 |
| Loaded extension vs `extension/dist` | match (no extension change since `1a92d95`; no `unknown method` in W1) | W1 |
| MCP entry (`~/.claude.json`, user scope) | `<repo>/mcp/dist/index.js`, no `env` | decisions #32 |
| Token | `bridge.token` at the repo root (gitignored); `BRIDGE_TOKEN` unset | decisions #32 |
| Port 9234 | the daemon only, if any (running or idling out); nothing else | W1 end |
| Host tests' port | `port: 0` | `daemon/test/*.test.ts` |

## 4. Stage 0 — spec audit (one agent, before any code)

Spawn one step agent for Stage 0 with the brief template; its builder is the auditor, its verifier
re-executes five of the audit's findings. No code is written. Four lenses:

**(a) Code-cite compliance** — every `file:line`, function, message type, test name and Chrome / CDP /
`ws` / MCP-SDK API the phase doc and spec §5–§7, §10 cite exists and behaves as stated, **executed or
confirmed live**, not just read. Includes: the 13 `activeTab()` call sites and `extension/src/tabs.ts`;
`extension/src/router.ts`'s error serialisation; `unwrapResult` in `extension/src/inject.ts`;
`describeDebuggerError`'s Chrome strings in `extension/src/debugger-errors.ts`; `handlers/tabs.ts`
(`newTab` creates with `active: true` today; `selectTab`; `listTabs`' `active`);
`NetworkRequestsResult.text` at `shared/src/protocol.ts:204`; the 22 codes in `shared/src/codes.ts`
against spec §10; `route.ts`'s `daemonWaitMs` and its `daemon.*` set; `wsHost.ts` ignoring and
counting extension events; `registry.ts`'s disconnect path (T2 hangs `releaseAll` on it); whether the
offscreen relay (`extension/src/offscreen.ts`) can carry an id-less `{event, params}` frame today
(it has no event path yet); `BridgeClient.on("event")` / `on("reconnected")`; where today's snapshot
text and `NetworkLog.format` are built (`extension/src/network-log.ts:259`, `:302`) and which Step 5
fixture entries T4.2's byte-identical test will use. Chrome behaviour the plan relies on, confirmed
by reading the current Chrome extension docs or a scratch experiment (record the source): `tabs.onReplaced`
on a Memory-Saver discard in Chrome 156 (LEASE-6's premise — does a discard still change the tab
id?); `captureVisibleTab` on a minimized and on an occluded window; `tabs.onActivated` timing.

**Re-examine Step 6's contracts by execution** (as-built "Contracts binding forward"): run, on port 0
with a fake extension, the welcome shape; `daemon.status`'s shape; the error envelope and the
`INTERNAL` mapping of a v1 `{message}`; close 4001 (each reason), 4002 after `daemon.shutdown`, 1001
on idle; `extensionStatus` on hello and on the current socket's close only; `timeoutMs` clamped and
never forwarded; any other `daemon.*` → `UNKNOWN_METHOD`; the SDK's five exports, `requireExtension`,
the getters and `on("reconnected")`; the 2 s no-welcome → `VERSION`; no handover on a 4002 reconnect.
A contract that does not hold is a CRITICAL finding.

**(b) Internal consistency** — recompute from the real repo: 13 call sites (4 in `actions.ts`), 21 →
22 tools, 542 tests in 42 files, 22 codes, the event list (spec §10's `tabCreated | tabRemoved |
tabReplaced` and `tabGone | leaseGranted | extensionStatus` vs T0's param types and T1's payloads —
spec `tabRemoved {tabId}` vs plan `{tabId, lastUrl?, lastTitle?}`), the `daemon.status` additions
(`tabs`, `lock`), the timings (1 s activation wait, 50 ms frame, 1 h / 1 000 dead handles), the lock
deadline from the envelope's `timeoutMs`, and every count the phase doc states.

**(c) Blind spots — what the plan never states.** Seed list; **extend it**:
- **The active-tab mismatch (W1 proposal 3; `CLAUDE.md` gotcha):** `listTabs`' `active`, `activeTab()`
  and the coming `tabs.claim {active:true}` must name the same tab, and the error must say why when
  none qualifies (a focused DevTools window). Which stage owns it (T1 for the extension, T2 for the
  claim), and does fixing it change any E2E expected text (STAT-1, CONN rows)? Seeded whether or not
  the user accepts proposal 3; if accepted, it is an audit item with an owner.
- **A Step 6 MCP against a Step 7 daemon:** after T2, a method with no `tab` that is not free gets
  `BAD_PARAMS "tab is required"`. Until T4 lands — and on any machine or session still running the
  Step 6 MCP bundle — every tool call of that MCP would fail. The plan gives the extension a
  one-release fallback (0.1) but the daemon none. Decide (contract-level, conservative rule) how the
  phase avoids breaking the user's own sessions between T2's and T4's commits (for example: do not
  run `npm run build` in the main tree between them; or a fallback with a warning); record it.
- **The building session's own `npm run build`** rewrites `daemon/dist/index.js` and hands the live
  daemon over to whichever client connects next, including the user's sessions (build-id handover).
- **Events lost while the extension or daemon is down:** a `tabCreated`/`tabRemoved` emitted while the
  socket is down is lost; a daemon restart renumbers handles. Does the `HandleTable` resync from
  `listTabs` on extension (re)connect? What does the MCP's cursor do after a non-4002 close
  (decisions.md · 2026-10-22 · What clients do on a close code other than 4002) — the plan's
  amended 0.2 covers it; confirm the one-line notice reaches both paths.
- **MV3 worker culling:** `tabRemoved`'s `lastUrl`/`lastTitle` come from an in-memory cache built
  from `onUpdated`; a culled worker loses it. Is `storage.session` needed, and does it break "never
  log a URL"? The three `chrome.tabs` listeners must be top-level and synchronous.
- **Windows that are not normal windows** (DevTools, popups, app windows) in `listTabs`,
  `activateForCapture` and `focusTab`; incognito tabs; `chrome://` tabs (`RESTRICTED_URL`).
- **The human's tabs during the live wave:** SCREEN rows switch the active tab of a window. T5 runs
  in Chrome windows the driver opens on fixture pages, never in the user's own windows (#33's revisit
  trigger is "an autonomous run disturbs the user's own Chrome work").
- **Lease leaks:** a hung script holds its tabs until it disconnects (`daemon.kick` is a follow-up);
  `tabs.claim` on a held tab fails fast — check that the MCP's first touch on a held active tab gives
  an actionable `TAB_HELD` naming the owner.
- **Log hygiene:** `daemon.status` now returns URLs; the log withholds a whole line containing `://`,
  so a new log line carrying a URL would silently vanish rather than leak — check that no new log line
  needs a URL to be useful. Never log titles either.
- **The `unknown method` symptom** after T3: `unknown method: focusTab` / `BAD_PARAMS tabId` means a
  stale extension; through a Step 7 daemon, which code does it arrive with?
- **Windows vs POSIX:** the daemon's and MCP's lifecycle stay unverified on POSIX; record, do not block.
- **The token:** unchanged path (`bridge.token`, env wins); nothing in Step 7 may print it.

**(d) Testability** — every exit check T0.1–T6.3 is executable and discriminating, with its pass rule
written before any measurement; T5's rows each get an expected text before the run; BG-1…4 and
SCREEN-4 are recorded either way but still need a written criterion for what counts as PASS; flag any
check that cannot fail. Mark which checks are unit (T0–T4, T6), which are live rows the driver runs
(T5), and which need the user's keyboard (only the extension reload).

**Rulings to re-check by premise, not reopen** (the phase doc's "Open items", *Ruled 2026-10-21*):
`selectTab` alias; 4 `activeTab()` calls in `actions.ts`, 13 in all; DL-1/DL-2 exist in
`docs/e2e-test-plan.md` (they do since D6); the popup button (T1); the actor name from the MCP's own
`process.pid`; the cursor clear after a daemon restart. A wrong premise is a finding; a disagreement
with a ruling is not. `networkClear` stays lease-checked (consistent with spec §6.3).

**Phase-doc notes Stage 0 writes** (dated, plan-side): G7-2 and T5's "Needs the user's keyboard"
amended by decisions #33 (the driver runs the wave; the user only reloads the extension); the
Prerequisite paragraph's "Step 6's live E2E has not run yet" superseded by W1 (Run 7) and the
user's rulings on the W1 proposals.

**Output:** `…-steps/stage0-audit.md` — findings ranked CRITICAL / MAJOR / MINOR / NIT, each tagged
**plan-side** (amend the phase doc in place with a dated note; record a decision if more than
mechanical) or **code-side** (becomes a stage item). **All resolved before T0 starts.** Then write the
stage split (default T0 → (T1 ∥ T2) → T3 → T4 → T5 → T6) with estimates into `journal.md`.

## 5. SPEC-DISCREPANCY PROTOCOL (verbatim in every brief)

```
SPEC-DISCREPANCY PROTOCOL. Intent beats procedure. When the code you are asked to write, the
phase doc, the design spec and CLAUDE.md's measured facts disagree, trace up the chain —
phase doc → design spec → CLAUDE.md runtime gotchas — and say so in your report; the deepest
layer that is internally consistent wins. Stakes pick who resolves it: mechanical (a stale
line number, a wrong count, a renamed file) → the fixer documents it in the report and the
step agent amends the phase doc in place with a dated note; design-local (a shape the plan
left open, a default) → the session agent records a decision in docs/decisions.md with the
rejected option; contract-level (the wire protocol, event names and params, codes, close codes,
the lease and lock rules, what the human sees, the token lookup, the bind, the SDK's public
surface, MCP tool names and schemas) → long-run §3: a pre-stated rule applies mechanically,
else the conservative choice (security at least as strict; every existing tool and test
behaves identically; undoable), recorded under Open decisions for the user. Code and spec
never diverge silently: whoever changes behaviour amends the governing doc in place with
"*Superseded YYYY-MM-DD: was X, because Y.*". Verifiers report findings with the command and
its output; they never rewrite the spec or the plan.
```

## 6. Decisions and integrity floor

Decisions follow `long-run` §3: build decisions (module layout inside `daemon/src/`, `extension/src/`
and `sdk/src/format/`, the internals of `HandleTable`/`LeaseTable`/`VisibilityLock`, test structure
and placement, defaults the plan left open, plain plan defects) you take and record `By: Claude`;
contract decisions (anything in `shared/src/protocol.ts` or `codes.ts`, event names and params, the
lease and lock rules, what the human sees, the SDK's exported surface, MCP tool names and schemas,
compatibility between Step 6 and Step 7 pieces) apply a pre-stated rule or the conservative rule and
are listed under **Open decisions** in `docs/decisions.md` and in the as-built register for me to
review at the gate. Only you write `docs/decisions.md`; subagents propose.

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP
rule that says escalate; a human gate (G7-1, T1's live check, needs the user's extension
reload or is deferred to T5; G7-2, the T5 wave, which the driver runs itself per decisions.md
· 2026-10-22 · Live E2E waves are run by Claude end to end, except the extension reload);
anything destructive or outward-facing (push, tag, publish, history rewrite, deleting outside
the repo, touching the user's Chrome profile data or the user's own tabs and windows,
committing or logging the token); any loosening of the security boundary (the 127.0.0.1 bind,
the token gate, "never log URLs, titles, header values or bodies"); permission or classifier
denials. (2) Phase-specific: any loosening of a lease or lock invariant (a call on a held tab
let through, the lock skipped or made non-FIFO, released on anything but the holder's
completion, timeout or disconnect); regenerating T4.2's stored expected text from the new
formatter; a drop in the test count without a documented move; evidence that shows a real
site's page content (only the fixture; T5.4); killing a process that Test-SafeToKill did not
call safe. Standing rule: never resolve a decision in the direction that flatters a result
already seen; pass rules are written before the measurement; a failed check is reported,
never re-tuned.
```

## 7. Stages

Each stage's deliverables are the phase doc's checkbox lines for that stage, pasted verbatim into the
brief with their dated notes. Exit checks are the phase doc's pre-registered IDs. Budget slices are
estimates (Step 6's stages took about a quarter of their estimates in agent wall time); the step
report records the actual beside each. One commit per stage close, messages from T6's list.

| Stage | Deliverables (phase doc) | Exit checks | Budget | Parallel | Verifier focus (beyond the phase doc's) |
|---|---|---|---|---|---|
| **0 — Spec audit** | §4 of this kickoff | findings file; every finding has evidence; Step 6 contracts executed; stage split in `journal.md` | 1.5 h | first, alone | re-execute 5 findings; the Step 6 contract runs are real (port 0), not read |
| **T0 — Types** | `SnapshotElement`, `SnapshotResult`, the five event param types, `ScreenshotMode`; `NetworkRequestsResult` loses `text`; guard tests | T0.1–T0.3 | 0.5 h | alone | `codes.ts` complete against spec §10; the typecheck breakage is exactly the `text` consumers T3/T4 own, listed; whether v2 peers now require `code` (the D0 decision's revisit trigger) is ruled and recorded |
| **T1 — Extension: `tabId`, codes, events** | `targetTab`, `errors.ts`, `router.ts`/`inject.ts`/`debugger-errors.ts`, three tab listeners → events through the offscreen relay, the fixture's popup button | T1.1–T1.7 | 2.5 h | ∥ T2 | no `activeTab()` left in handlers; `unwrapResult` null-or-undefined → `REF_STALE`; listeners top-level, no top-level `await`; no URL in a `console.*`; the fallback warns; the active-tab mismatch handled as Stage 0 ruled; G7-1 recorded or deferred |
| **T2 — Daemon: handles, leases, lock, intercept** | `handles.ts`, `leases.ts`, `lock.ts`, `intercept.ts`, `route.ts`, `wsHost.ts` events, `daemon.status` `tabs`/`lock`, real-`ws` tests | T2.1–T2.5 | 3 h | ∥ T1 | attack the lock (holder timeout, holder disconnect mid-call, two waiters past deadline: each releases exactly once); unleased-opener tab stays unheld; the extension never sees `tab`; lock taken when the target is already active; no URL or title in `daemon.log`; **cross-package verifier** `shared/` ↔ `daemon/` ↔ a fake extension emitting T1's events |
| **T3 — Extension: data, screenshot modes, `focusTab`** | `buildSnapshot` → elements; `screenshot {mode}`; `activateForCapture`; `newTab` background by default; `focusTab` + `selectTab` alias; network result without `text` | T3.1–T3.5 | 2.5 h | after T1 | `hasLayout` gate kept; no `focused` outside `focusTab`; `minimized` checked before switching; moved test count stated |
| **T4 — SDK formatters + MCP pass-through** | `sdk/src/format/{snapshot,network}.ts` + byte-identical fixture test; typed client events; optional `tab` on every tab tool; cursor = claim on first touch; `browser_focus_tab`; `browser_list_tabs` columns; `setup.md` + `e2e-test-plan.md` | T4.1–T4.5 | 2.5 h | after T2 + T3 | the expected text is captured from the **baseline** formatter on the pre-T3 commit; 22 tools by grep; `browser_select_tab` claims, never activates; `TAB_HELD` renders the owner's actor name; the cursor-lost notice on both the 4002 and the non-4002 path; **cross-package verifier** `shared/` + `daemon/` + `sdk/` + `mcp/` over real `ws` with a fake extension |
| **T5 — E2E** | autonomous part: LEASE-1…7, SCREEN-1…5, BG-1…4 rows with expected text in `docs/e2e-test-plan.md`, a wave sheet (`…-steps/T5.md`, steps tagged as in D6), the LEASE-2 typing script; live part: the wave | T5.1–T5.4 | 1.5 h autonomous + 3 h live | after T4; serialised | every expected text precedes the run; SCREEN-1's flash method and BG pass criteria written first; evidence names every actor; fixture pages only |
| **T6 — Docs + commits** | `CLAUDE.md` gotchas and architecture ("Control targets the active tab" removed), `setup.md`, roadmap Step 7 block with the BG findings | T6.1–T6.3 | 1 h | last | every new gotcha cites the stage report or row that measured it; 22 tools in `setup.md` |

**T5, how the wave runs** (decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end):
1. Autonomous part first (rows, wave sheet, scripts, pass rules), committed. Then `npm run build`,
   and ask me once for the **extension reload**. Without it, stop at G7-2 with the package.
2. After the reload: the stale-extension check (`unknown method: focusTab` / `BAD_PARAMS tabId` ⇒ the
   reload did not take) as the first recorded line; fixtures served on 8080 (and 8081 if needed) with
   miniconda's Python; the daemon from the new build (`Get-BridgeLog`, `Get-DaemonBuild`).
3. Actors: headless `claude -p --model sonnet --allowedTools mcp__chrome-agent-bridge` sessions
   (two or three at once for LEASE-1, LEASE-4, SCREEN-3), scripts through the SDK with `tsx`. The
   driver opens its own Chrome windows on fixture pages (`chrome.exe --new-window <fixture URL>`),
   opens the "human" tab for LEASE-7 the same way, closes a tab by hand (LEASE-5), uses
   `chrome://discards` (LEASE-6), minimizes a window and uses two windows (SCREEN-4/5) by UI
   automation, and measures the flash (SCREEN-1) with the method written in the wave sheet.
4. Results into `docs/e2e-test-plan.md` §5 as Run 8, with a `T5-run-record.md` (every command and the
   text it printed, from the transcripts) and the daemon log attached as `.txt`; a fresh verifier
   (model "opus") re-reads the record against the pre-written expected text and greps the log for
   `://` and the token without printing them.
5. A failed row is recorded, never fixed in the wave; anything needing a code change returns as a
   proposed decision (the wave loop).

Propagator after T6: compares the as-built register with the phase doc, the Step 8 plan, the design
spec, `CLAUDE.md` and `docs/setup.md`; writes dated correction notes in place; returns a correction
ledger. It edits no code.

## 8. Close-out contract

- Measured numbers into the phase doc: rewrite its **Outcome** as results (test count per stage with
  the command; tool count 22; the T5 rows' results; SCREEN-1's flash in ms with its method; BG-1…4 as
  facts); its **Status** line.
- The **as-built register** `docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md` per
  `.claude/skills/phase-kickoff/asbuilt.md`: one section per stage, appended at stage close, never
  rewritten (corrections are dated notes); contracts binding forward (the handle, lease and lock rules
  as built; the event shapes; the `CODE:message` convention; the `daemon.status` additions; the
  `tabId` fallback still in place; the formatters' home) — Step 8's Stage 0 re-examines them by
  execution; decisions taken; deviations; estimates vs actuals; needs the user's keyboard; open
  decisions; the T5 wave's as-built at the end.
- The **gate checklist** (item → met? → evidence): T0.1–T6.3; the STOP rules not fired; one commit
  per stage with no `dist/` and no token; `CLAUDE.md` no longer says "Control targets the active tab".
- **Needs the user's keyboard**, listed plainly — in Step 7 that is short: (1) the **extension
  reload** after the build (G7-1 if taken at T1; at the start of the T5 wave in any case); (2) the
  rulings on any open decision, and on the W1 proposals if they were applied as defaults; (3)
  `/mcp` or a restart of any interactive Claude session of mine that ran during the phase (its MCP
  bundle predates T4); (4) any push. Everything else in T5 the driver does.
- Then the `session-closeout` skill (phase doc, `docs/decisions.md`, `docs/progress-and-roadmap.md`,
  the `CLAUDE.md` Current state block, new gotchas as measured facts, memory, commit) and the
  `phase-kickoff` skill again for the Step 8 kickoff (overwriting `docs/plans/next-session-prompt.md`),
  carrying BG-1/BG-2 as the input `sdk/src/policy.ts` needs.

## 9. STOP RULES

**Stops the gate** (the stage is not closed; the write-up continues): a pre-registered exit check
fails after 2 fix rounds; the byte-identical formatter test (T4.2) fails and the proposed fix is to
regenerate the expected text; a `CLAUDE.md` runtime invariant would have to change (`unwrapResult`
null-or-undefined, the IIFE content script, no top-level `await`, top-level `webRequest` and
`chrome.tabs` listeners, never logging URLs); a security-boundary question; a port-9234 holder that is
not the daemon (its pid and build are in `~/.chrome-agent-bridge/daemon.log`), or an orphan `node`
process the run did not start; the test count drops without a documented move; a change that would let
one actor act on another's tab.

**Continues anyway, recorded:** BG-1…4 and SCREEN-4 results in either direction (Step 8 reads them); a
longer-than-expected flash in SCREEN-1 (report the number and its method); build decisions on module
layout inside `daemon/src/`, `extension/src/` or `sdk/src/format/`; an audit finding resolved plan-side
with a dated note; the user not answering the reload request (stop at G7-2, report — not a failure).

**Forbidden fixes for this step** (the phase doc's list, derived from 0.1–0.8 and `long-run` §3):
- weakening a lease or lock invariant to make a test or an E2E row pass: letting a call on a held tab
  through, skipping the lock when the target "is already active", making the lock not FIFO, releasing
  it on anything but the holder's completion/timeout/disconnect;
- regenerating the stored expected text in T4.2 from the new formatter (the fixture is captured from
  the baseline, once);
- adding `chrome.windows.update({focused: true})` to `activateForCapture` to make a capture work (0.5:
  no window focus; `focusTab` is the only exception);
- removing the `tabId` fallback or its warning early (Step 8 owns the removal), or making the daemon
  omit `tabId`;
- logging a URL, `lastUrl`, title, header value or body from the service worker or the daemon to debug
  a handle or lease;
- lowering the 1 s activation wait or the 50 ms frame wait to shave the flash without a measurement
  that says it is safe;
- changing `newTab`'s default back to `active: true` in the extension (the MCP passes it explicitly);
- and, from Step 6 and still binding: binding anything but `127.0.0.1` or widening the token rule;
  lowering the `+5000` daemon slack, the `[100, 600000]` bounds or the heartbeat to make a race pass;
  making `BridgeClient` reconnect on a close code other than 4002; letting the MCP crash when
  `connect()` fails; editing a test's expected message text to match a changed error; reloading the
  extension or editing its Options from the driver; editing a row's expected text after its run.

**Final report** leads with "Decisions taken while you were away" (each cited by date + title, the W1
proposals first if they were applied as defaults), then the gate measurements (test counts per stage
with their command, tool count, the T5 rows with their observed text, SCREEN-1's flash with its
method, timings with their source), then open decisions, then what needs my keyboard (the extension
reload if the wave stopped at G7-2, `/mcp` on my interactive sessions, any push).

I trust you — decide well and leave a trail we can audit.
