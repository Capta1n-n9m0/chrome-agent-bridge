# Step 10 kickoff — the Step 8 follow-ups (MCP focus-first, the 800-cap warning, `saveTo`, the release tag, a live retire row, Step 9's live re-measurements)

Written 2026-10-24 at Step 9's close, with the `phase-kickoff` skill, phase kind. Paste everything below the line
into a **fresh** Claude Code session started in `C:\Users\aliev\Projects\chrome-remote-extention`, launched so that
it is **not a bridge client**: `claude --strict-mcp-config --mcp-config <scratch>\no-mcp.json`, where the file holds
`{"mcpServers":{}}` (LESSON "the driver is not a bridge client" below). The Step 9 kickoff this file replaces stays
in git history and, frozen, as `docs/plans/2026-10-24-step9-phase-e-safety-steps/kickoff.md`.

---

Dear Claude, you are the SESSION AGENT for **Step 10 — the Step 8 follow-ups** of the chrome-agent-bridge repo (a
localhost daemon plus a Chrome MV3 extension, with an MCP server and a TypeScript SDK as its clients, that let an
agent or a script drive the user's real, logged-in Chrome profile). Step 10 closes the gaps the user's rulings on
Step 8 and the Step 9 live wave (Run 13) left: the MCP's trusted tools focus first, a warning for a locator past the
snapshot's 800-element cap, `browser_evaluate {saveTo}`, a squashed `step8` release branch, a live row that retires
N ≥ 1 handles on a killed Chrome, the failure-report screen switch, `bb-login.ps1`'s wait, and Step 9's four
re-measurements. This prompt is self-contained; its reading list is in §3.

## 0. PRECONDITION (check before anything else)

*Met 2026-10-24: the user ratified Run 13 (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)); no re-run — go to Stage 0. The ruling does not
pre-approve pinning by mouse click. The same ruling adds stage S4b, a new code `JS_DISABLED` (phase doc 0.12).*

**The run starts only after the user has ruled on decisions.md · 2026-10-24 · S4: Run 13 stands as recorded, with
the runner's four self-resolved stops listed (#192).** Read that entry and the Open decisions list in
`docs/decisions.md`. The four stops the Run 13 runner resolved itself instead of returning (record blocks 4, 8, 9,
30 of `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-run-record.md`):
1. block 4 — the restore check printed `RESTORE FAILED (safety true, desk false)`: a helper bug in the window count,
   fixed mid-run, the restore re-run;
2. block 8 — the found-state guard printed STOP: a reader bug, fixed, the state re-read;
3. block 9 — `Set-S9Pin` failed three times (UI Automation finds no Invoke pattern on Chrome 156's toolbar buttons);
   gate G9-2 said ask the user once; the runner pinned by a real mouse click at a `FromPoint`-verified point instead;
4. block 30 — a helper throw after the first state change, with no restore run.
No safety state was changed at any of them, and the final read-back equalled the found state by hash.

- **#192 still open** → stop here: write one line in the run journal and ask the user to rule (ratify Run 13, or
  re-run blocks 4–30). Do nothing else.
- **Ratified** → Stage 0, then the stages of §7 as written.
- **Re-run requested** → that re-run is Step 10's first live stage (S1), run before any Step 10 code, under the
  same rules as §7's S1, and it may carry the re-measurements of the phase doc's 0.10 (decisions.md · 2026-10-24 ·
  The Step 10 kickoff carries Run 13's live follow-ups as its first wave (#201)). Record the ruling as a decision
  `By: user` before Stage 0.
- Whatever the ruling says about pinning by mouse click becomes the pinning rule for every Step 10 wave.

## 1. Opening

**Binding documents.**
- Phase doc (the plan; its checkboxes are the work items; "Exit checks (pre-registered)", "Human gates" and "STOP
  rules and forbidden fixes" are the pre-registered rules): `docs/plans/2026-10-24-step10-step8-follow-ups.md`. Its
  Decisions marked **(user)** (0.2, 0.3, 0.4, 0.5's what, 0.6, 0.7, 0.9's item) were ruled by the user; the rest,
  and every proposed detail under a (user) heading, are proposals Stage 0 audits.
- Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §5 (layer contract), §6 (the human),
  §10 (protocol and codes), with Step 9's dated notes. A new code amends §10 first (`shared/src/codes.ts`' header).
- What Step 9 built: `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` — every "Contracts (binding
  forward)"; and Step 8's: `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md`. **Stage 0
  re-examines Step 9's contracts by execution.**
- Workflow: the `long-run` skill (`.claude/skills/long-run/SKILL.md`); briefs, ledgers, reports and role prompts from
  the `step-agent` skill (`SKILL.md`, `role-prompts.md`); bookkeeping with `session-closeout`; the next kickoff with
  `phase-kickoff`; writing rules in `docs/docs-writing-guide.md`.

**Precedence:** pre-registered rules (the phase doc's exit checks, human gates, STOP rules) > the phase doc > the
skills. The user's standing rulings apply on top: live fixture waves are Claude's end to end (decisions.md ·
2026-10-22 · Live E2E waves are run by Claude end to end (#33)); reloads by `recipes/reload-extension.ps1`
(decisions.md · 2026-10-23 · Later extension reloads use `recipes/reload-extension.ps1` (#65)), an exit-2 reload may
be re-run once (decisions.md · 2026-10-23 · S6's findings ruled: the user's answers, stage S6b for REP-1,
re-registered rows (#99)).

**Model.** Every agent at every level runs **Claude Opus 5.5, `claude-opus-5-5`**, as Steps 8 and 9 did by the
user's ruling (decisions.md · 2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7 open decisions
(#69): "I like higher quality product"; · 2026-10-24 · Step 9 agents run Opus 5.5 (#130)). Record "Step 10 agents
run Opus 5.5" as your first `docs/decisions.md` entry, `By: user`, citing #69. Pass `model: "opus"` on every `Agent`
call. Exception: headless E2E actor sessions (`claude -p`) in S1 and S7 may run Sonnet.

**AUTONOMOUS — I am away; do not block on me.** Decide and record per `long-run` §3. What waits for me is the
integrity floor (§6) and these gates:
- **G10-0** #192 ruled (§0). **G10-1** creating the `step8` tag, and **any push** (branch, tag or `main`) — prepare
  the local branch and stop there. **G10-2** killing and relaunching my real Chrome for row RET-1 — prepare the row
  and its recipe, ask, run only on a yes. **G10-3** any live work beyond fixture pages in my profile: my Blackboard
  course (the S6.3 pp1 leg, a real `bb-login.ps1` run), any real site, my credentials. decisions.md · 2026-10-23 · The user grants the pp1 course for SDK-6/SDK-7 and one Chrome restart for SM-1 (#96) and · The user allows unlimited Chrome restarts and unpublished Blackboard writes (#98) were given for
  Step 8's wave; they are not standing.
- **Live waves S1 and S7 are yours** on fixture pages (#33), including toggling the extension's safety state and
  pressing its toolbar button and shortcut in windows you opened. **Every live wave must leave the safety state as it
  found it** (armed? JavaScript? the block list, counted and hashed, never printed) and record the read-back; a
  restore that fails is a stop — ask me.
- **Standing:** never push or tag; never commit `bridge.token`, `.env`, `dist/`, `exports/` or a screenshot; never use
  my own tabs or windows; any loosening of the token gate, the bind, a lease or lock rule, the cursor rule or the
  safety gate is a contract change — stop.

**Goal.** The six W2 work items and the carried inputs of decisions.md · 2026-10-24 · The roadmap after Step 8 (#129)
built, unit-tested and proven live, with Step 9's four re-measurements and SAFE-REL-3's URL class measured first;
the safety boundary unchanged; every live wave leaving the safety state as found.

**Baseline state** (verified 2026-10-24, table in §3): `main` at `f45e3bf` (`docs(step9): propagator's CLAUDE.md
items; #200–#201`) plus the commit that adds this file and the phase doc; `npm test` → 2720 passed, 116 files;
`npm run typecheck` exit 0; `npm run build` exit 0 with no tracked file changed; 23 tools, 25 codes (24 on the wire
+ `NO_CURSOR`), 23 router methods. The daemon build on disk is Run 13's (`99bb55c5…`); whether the loaded extension
matches `dist/` is not known until S1's first row (SAFE-0's check) proves it. Port 9234 free. Re-check all of it at
Stage 0 and date it.

## 2. Agent contract

Read `.claude/skills/long-run/SKILL.md` and hold to it: §1 context discipline (you read reports and write markdown;
you never write feature code, run the suite in your own context, run or kill the daemon, or read diffs line by line),
§2 agent tree, §3 decisions, §4 the stop list, §5 waiting, §6 revival, §7 end of phase.

**Form: three-level.** One **step agent per stage** (Stage 0, S1–S8 — §7); each spawns its own builder (or live
runner), an independent verifier and at most two fixer rounds. Level-2 agents never spawn agents; a step agent reads
and decides, it does not build or commit itself. Steps dir: `docs/plans/2026-10-24-step10-step8-follow-ups-steps/` —
create it first with an append-only `journal.md`, `briefs/common.md` (model: Step 9's
`docs/plans/2026-10-24-step9-phase-e-safety-steps/briefs/common.md`) and `kickoff.md`, a byte copy of this file.
As-built register: `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md` (created at the first stage close).

**Parallelism** (host tests bind port 0, never 9234). **At most two step agents at once; a live stage runs alone.**
Stage 0 alone; S1 (live) alone. Then S2 → S3 → S4 in series (all three edit `mcp/src/tools/registry.ts`); S5
(`recipes/bb-login.ps1`, fixtures, no bridge port) and S6 (git refs in a separate worktree) may each run beside one of
them, never during a live stage. S7 (live) alone, after S4 and S5, with no uncommitted code in the main tree. S8 last.
Only the real daemon ever owns 9234, and only S1 and S7 start it.

**STEP BRIEF TEMPLATE** (paste for every step agent; fill the angle brackets):

```
You are the STEP AGENT for stage <STAGE> ("<plain stage name>") of Step 10 (the Step 8 follow-ups — MCP
focus-first, the 800-cap warning, saveTo, the release tag, a live retire row, Step 9's live
re-measurements) of the chrome-agent-bridge repo (C:\Users\aliev\Projects\chrome-remote-extention; Git
Bash shell; checks: `npm run typecheck`, `npm test`, `npm run build`). Read CLAUDE.md first — its
"Runtime gotchas" are measured facts and bind. Then read
docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/common.md in full: it is part of this brief.
Model: claude-opus-5-5 (Opus 5.5); every agent you spawn: model "opus" (S1/S7 only: headless E2E actor
sessions may run Sonnet).
GOAL: <one paragraph>.   INPUTS: <the phase-doc stage text verbatim with every dated note; the
kickoff's §7 row for this stage verbatim; the phase-doc "Decisions" that bind it; the design spec
sections that bind (§5, §6, §10 where touched); the Step 9 and Step 8 as-built contracts it touches;
the Step 10 as-built register so far; prior step reports; PIDs of anything running (normally nothing)>.
EXIT CRITERIA: <the pre-registered exit checks for this stage, by ID, verbatim; pass rules written
before anything is measured>.
LANE: <the stage's Lane from the phase doc, with §7's grants>. Anything outside the lane escalates.
WAITING: you hold long waits yourself — run the job in the background, end your turn, get re-invoked
by its completion; never a foreground sleep loop. A child "waiting on its own background work" is NOT
completion. Your builders/verifiers/fixers finish in one go and never wait.
HOW YOU WORK: a builder does the work (role-prompts.md §Builder; failing test first for pure logic).
Then an INDEPENDENT verifier (never the builder; treats the builder report as claims; re-runs
typecheck/test/build from a clean worktree, re-derives counts, attacks the spec as well as the code,
checks the CLAUDE.md invariants, proves new tests fail without the change). FAIL → fixer → the
verifier re-checks only the affected items. At most 2 fix rounds, then escalate. Level-2 agents must
NOT spawn agents. You read and decide; you do not build or commit yourself.
LIVE STAGES (S1, S7): the runner is a level-2 agent. It RETURNS to you on every STOP line — a restore
that fails, a guard that prints STOP, a human gate (pinning, a grant), any throw — after running the
restore if the safety state was touched. It may fix a helper only between rows, before any observation
of the next row, and never past a STOP line (decisions.md · 2026-10-24 · S4: Live runners return on
every stop; one stop rule for sheet and brief (#193)). The wave sheet and the runner brief carry this
one rule in the same words.
LEDGER: keep docs/plans/2026-10-24-step10-step8-follow-ups-steps/<STAGE>.ledger.md current after every
substep; resume from it if respawned; on a pause let running level-2 agents finish, write the ledger,
start nothing new, return.
AUTHORITY: decide mechanical and stage-local design questions; put each in your report under
"Proposed decisions" in the decisions.md format. Never edit decisions.md, the as-built register or
CLAUDE.md yourself.
ESCALATE (stop that line of work, report, return): <the ESCALATION list, verbatim>.
OUTPUT: docs/plans/2026-10-24-step10-step8-follow-ups-steps/<STAGE>.md per the report schema (Verdict,
Outputs, Verifier verdict, Deviations, Proposed decisions, Findings, Handoff; test count before →
after).
Commit your stage's work via a builder: exact file list (never dist/, bridge.token, .env, exports/ or a
screenshot; never `git add -A`), message "<type>(<scope>): <stage> — <what> (verifier: PASS|
PASS-with-notes)" with a body that says why, plus the session's Co-Authored-By / Claude-Session
trailers; on git index.lock wait and retry; a classifier denial is reported, never retried or worked
around. Never push, never tag.
Return a ≤ 15-line summary + the report path.
<SPEC-DISCREPANCY PROTOCOL — §5, verbatim>  <INTEGRITY FLOOR — §6, verbatim>  <LESSONS — below, verbatim>
```

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

## 3. Reading order

1. `docs/plans/2026-10-24-step10-step8-follow-ups.md` — all of it.
2. `docs/decisions.md` — Open decisions (#192 first), then by date + title:
   - 2026-10-24 · S4: Run 13 stands as recorded, with the runner's four self-resolved stops listed (#192); · S4: Live
     runners return on every stop; one stop rule for sheet and brief (#193); · S4: SAFE-5c's redirect half,
     SAFE-POP-1, SAFE-3 and SAFE-4(b) are re-measured in the next live wave (Step 10) (#194); · S4: Dated notes on
     §4.20 for two expected-text errors (#195); · S4: SAFE-REL-3 prints a URL class, not "withheld" (#196); · S4: The
     redirect server uses port 8083 (#197); · SAFE-7c (the debugger on this extension's own options page) stays
     unmeasured (#200); · The Step 10 kickoff carries Run 13's live follow-ups as its first wave (#201)
   - 2026-10-24 · The roadmap after Step 8 (#129); · FE and `focusFirst` are ratified; the MCP's trusted tools focus
     first too (#106); · S1's locator details are ratified; a locator past the snapshot's cap warns (#117); · S7.3 is
     met by the commit map; a squashed `step8` release tag carries the Part messages (#125); · SM-1's and LOC-1's
     re-registered text is ratified; a live row exercises N ≥ 1 retires (#126); · Bulk data through
     `browser_evaluate` was a test device only; the MCP gets a `saveTo` path (#127); · Failure reports stay on by
     default (#120)
   - 2026-10-23 · SDK-7's MCP leg is re-registered with a cap that fits pp1's export (#102); · S6.3 compares one
     in-page export read through both paths (#103); · The background-input policy (#89)
   - 2026-10-24 · Phase E's design: the kill switch, the disarmed state, blocked sites, the JavaScript switch (#128);
     · The state is read per call, fails closed, and is locked to trusted contexts (#139); · `downloadStart` and
     redirects onto a blocked host (#140)
3. `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` — contracts, S4's as-run; then `…-steps/S4.md` and
   `S4-run-record.md` (Run 13) and `propagator.md`.
4. `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md` and `…-steps/S7.md` §4 (the commit map for 0.6).
5. `CLAUDE.md` — "Runtime gotchas" (with the Step 9 block) and "Testing philosophy" bind; "Key files" is the map.
6. `docs/setup.md` (Safety; Running JavaScript; Writing a script) and `docs/e2e-test-plan.md` §1 items 8–9, §4.19,
   §4.20 and §5 Runs 12–13 (the model for S1's and S7's rows and records).
7. `.claude/skills/step-agent/role-prompts.md`.

**Environment facts** (verified 2026-10-24 at `f45e3bf` unless stated):

| Fact | Value | Source |
|---|---|---|
| OS | Windows 11 Pro 10.0.26300 | session environment |
| Shell for agents | Git Bash; Windows PowerShell 5.1 also present | session environment |
| Node / npm | v25.2.1 / 11.6.2 (after the nvm PATH line) | `node -v`, `npm -v`, 2026-10-24 |
| Chrome (real profile) | 156.0.8078.48, Developer mode on, no flags (Run 13) | `S4.md` §2 |
| Baseline commit | `f45e3bf` + the commit adding this file; tree clean | `git log -1`, `git status --short`, 2026-10-24 |
| `npm test` | 2720 passed, 116 files (`Test Files 116 passed (116)`, `Tests 2720 passed (2720)`, 21.4 s) | `npm test`, 2026-10-24 19:23 local |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0, `git status --short` empty after | 2026-10-24 |
| Daemon build on disk | `99bb55c5913c…` (Run 13's build) | `sha256sum daemon/dist/index.js`, 2026-10-24 |
| Loaded extension | the Run 13 build at Step 9's close; not re-checked (no Chrome touched) — S1's first row proves it | `S4.md` §2 |
| Safety state at Run 13's end | armed, JavaScript on, empty block list (sha256 of the empty text) | `S4.md` §5 |
| Extension id | `cpnemjbgecfbeicldpaaegbhjgjgjfep` | `docs/e2e-test-plan.md` §1 item 9 |
| Router methods / tools / codes | 23 / 23 / 25 (24 on the wire + `NO_CURSOR`) | `grep -c 'router.on(' extension/src/sw.ts`, `grep -c 'reg.tool(' mcp/src/tools/registry.ts`, `codes.ts` |
| Ports | 9234 free (`netstat -ano`, 2026-10-24); 8082 bound by `SystemSettings.exe` (Run 13) | `netstat`, #197 |
| Token | `bridge.token` at the repo root (gitignored) | `CLAUDE.md` |

## 4. Stage 0 — spec audit (one agent, before any code)

One step agent; its builder is the auditor, its verifier re-executes five findings. No feature code.

**(a) Code-cite compliance** — executed or confirmed, not just read: `mcp/src/tools/registry.ts`'s trusted click /
type / press paths and how a `focusTab` call would sit before them; `sdk/src/tab.ts` line ~167 (`focusFirst`);
`extension/src/content/locate.ts` and `a11y.ts` (where the walk can count listable elements before a match without
changing a rule); `extension/src/handlers/{target,locate,actions}.ts` (how a flag would reach an action's reply);
`LocateResult` in `shared/src/protocol.ts`; `extension/src/evaluate/result.ts` `cap()` (`value` kept whole) and the
serialiser's limits; **0.4's transport** — measure on port 0 with the real daemon and a fake extension how large a
single result frame crosses daemon → client, and state plainly what cannot be measured without Chrome
(`chrome.debugger` → worker → offscreen document), so S4 measures that first, in S7's prep at the latest; why
`export-grades.ts` chunks even on the SDK leg (`SDK_CHUNK_CHARS`); `sdk/src/download.ts` (the file rules 0.4
copies); `extension/src/tabs.ts` `activateForCapture` (can `onActivated` end the 1000 ms wait as written? 0.8);
`recipes/bb-login.ps1`'s post-submit loop; `recipes/s9-redirect.py` (single-threaded?), `s9.ts pop1` (no opener
claim?); the Step 8 base and close commits for 0.6 from the Step 8 as-built and `S7.md` §4.

**Re-examine Step 9's contracts by execution** (as-built "Contracts (binding forward)"), on port 0 with a fake
proto:2 extension where the code is host-testable: 25 codes, `DISARMED {scope}`; `GatedRouter.on` throws on an
unclassified method; an unknown method `UNKNOWN_METHOD` in every state; `safetyStatus` never null and reset by a new
extension hello; the daemon's redaction while disarmed; the attach set without the two codes; the log scan's 60
sites. A contract that does not hold is a CRITICAL finding. Also re-run Step 8's C1–C7 set (attach set, `code`
required, session marker, handle numbers never reused, cursor rule, `TAB_HELD`, FIFO lock).

**(b) Internal consistency** — recompute: 23 router methods, 25 codes, 23 tools, 2720 tests / 116 files; every count
and bound in the phase doc (the 800 cap, the 1 MiB chunk, 64 MiB, 90 s, 95 s, 20 s, the S4.1 300-character answer
bound); which tests 0.5's retirement removes and how many.

**(c) Blind spots — seed list; extend it:**
- **Focus-first and the human:** `focusTab` moves my view to the agent's tab and leaves it there; a trusted MCP call
  on a tab in another window focuses that window; the visibility lock's FIFO with another actor's capture; a
  `focusTab` refused while disarmed must stop the action.
- **The cap warning:** pages whose listable count changes between the snapshot and the locate; frames and open
  shadow roots in the count; `nth` past the cap; `waitFor {locator}` (does it warn?); the failure report's snapshot.
- **`saveTo`:** a value that is a huge non-string (the serialiser's limits); a string with lone surrogates (UTF-8
  encoding); the 30 s default call timeout (`timeoutMs` must be passed); a path on another drive, a UNC path, an
  existing directory, a path under the repo (committing it); disk full; the daemon's frame size; the JavaScript
  switch and the kill switch mid-transfer; a store entry left after disarm; logging the path.
- **The release branch:** a worktree left behind; the branch's commits carrying a token or `dist/` from history;
  trailers on squashed commits.
- **RET-1:** Chrome's crash-restore prompt versus automatic restore; my own tabs and windows coming back; the
  extension's session marker when the worker starts before `onStartup`; the safety state after the relaunch.
- **The first live wave on an unchanged build:** the loaded extension may have been reloaded or replaced since Run
  13 — SAFE-0's check decides; the safety state may have been changed by me since — record it as found.
- **The token**: unchanged; nothing in Step 10 prints it.

**(d) Testability** — every exit check Z.1–S8.1 executable and discriminating, pass rules written before any
measurement; R14 and §4.22 rows with expected text before their run; flag any check that cannot fail.

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

## 6. Decisions and integrity floor

Decisions follow `long-run` §3: build decisions (module layout, test placement, wording of the warning line and the
descriptions, fixture shapes, the release branch's intermediate trees) you take and record `By: Claude`; contract
decisions (0.3's wire field and SDK form, 0.4's transport and SDK method, anything the safety table classifies)
apply a pre-stated rule or the conservative rule and are listed under **Open decisions** in `docs/decisions.md` and
in the as-built register for me at the gate. Only you write `docs/decisions.md`.

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

## 7. Stages

Each stage's deliverables are the phase doc's checkbox lines, pasted verbatim into the brief with their dated notes.
Exit checks are the phase doc's pre-registered IDs (Stage 0 may only make them stricter). Budgets are estimates; the
step report records the actual beside each. One commit per stage close.

| Stage | Deliverables | Exit checks | Budget | Parallel | Verifier focus (beyond the phase doc's) |
|---|---|---|---|---|---|
| **0 — Spec audit** | §4 | Z.1 | 1.5 h | first, alone | re-execute 5 findings; the contract runs are real (port 0); 0.4's measurement reproducible |
| **S1 — Run 14 (live): Step 9's follow-ups** | phase doc S1 (0.10; a Run 13 re-run first if #192 asks) | S1.1–S1.6 | 1 h prep + 1 h live | alone | rows before the first press; §4.20 untouched; every stop a return; restore read-back by hash |
| **S2 — MCP focus-first** | phase doc S2 (0.2) | S2.1–S2.3 | 1 h | ∥ S5 or S6 | tests fail at `f45e3bf`; schemas unchanged; no focus on untrusted |
| **S3 — The 800-cap warning** | phase doc S3 (0.3) | S3.1–S3.3 | 2 h | after S2; ∥ S5 or S6 | `a11y.ts`/`snapshot.ts` diff empty; the 46-fixture and format baselines pass; old clients see identical results |
| **S4 — `saveTo`** | phase doc S4 (0.4) | S4.1–S4.5 | 3 h | after S3; ∥ S5 or S6 | cross-package over real `ws` with a fake extension; no slice of the value in any answer or log; safety classes for (B) |
| **S4b — `JS_DISABLED`** | phase doc S4b (0.12) | S4b.1–S4b.3 | 1.5 h | after S4; ∥ S5 or S6 | spec §10 note before the code; every changed expected text listed per file and traced to #202; the attach set unchanged |
| **S5 — `bb-login.ps1` wait** | phase doc S5 (0.9) | S5.1 | 1 h | beside S2–S4, never during S1/S7 | old-vs-new on the same delayed fixture; nothing pressed after the first press |
| **S6 — `release/step8`** | phase doc S6 (0.6) | S6.1–S6.3 | 0.5 h | any time after Stage 0, never during S1/S7 | tree identity by `git diff`; `main` unchanged; no tag |
| **S7 — Run 15 (live): Step 10's rows** | phase doc S7 (+ S7b only if SW-1 says so) | S7.1–S7.6 | 1.5 h prep + 2 h live | alone | MCPF-1 by the page's reporter; CAP-1 both clients; SAVE rows' files by hash; RET-1/pp1 only with grants |
| **S8 — Retirement + docs** | phase doc S8 | S8.1 | 1 h | last | removed tests listed per file; setup text matches the code byte for byte |

**How the two live waves run** (#33, #193): (1) rows and expected text committed; (2) record the safety state as
found (armed? JavaScript? block list **counted and hashed, never printed**); (3) for S1: SAFE-0's check as the first
line — a reload by `recipes/reload-extension.ps1` only if it fails (one re-run on exit 2); for S7: main-tree `npm run
build` of committed code, the reload script (exit 0), SAFE-0's check first; (4) fixtures on 8080/8081 (+ the
threaded 8083 for R14-5c), actors: SDK scripts and headless `claude -p` sessions; the toolbar button and shortcut
pressed in your own window; (5) on any STOP line the runner restores and returns; (6) restore and read back; (7)
results into `docs/e2e-test-plan.md` §5 as Run 14 / Run 15, with the run record and the daemon log as `.txt`; a fresh
verifier re-reads the record against the pre-written text and greps for `://`, the token and the test patterns by
count. A failed row is recorded, never fixed in the wave.

Propagator after S8: compares the as-built register with the phase doc, the design spec, `CLAUDE.md`,
`docs/setup.md`, `docs/e2e-test-plan.md`, `recipes/README.md` and `README.md`; dated correction notes in place; a
ledger. No code.

## 8. Close-out contract

- The phase doc's **Outcome** as results and its **Status**.
- The **as-built register** per `.claude/skills/phase-kickoff/asbuilt.md`: contracts binding forward (focus-first on
  the MCP's trusted tools, `pastSnapshotCap` and its surfaces, `saveTo`'s transport and file rules, the release
  branch's commits, RET-1's measurement, SW-1's outcome); decisions; deviations; estimates vs actuals; open decisions;
  each live wave's as-run.
- The **gate checklist** (item → met? → evidence): Z.1–S8.1; STOP rules not fired; one commit per stage with no
  `dist/`, token, `exports/` or screenshot; the safety state restored after each wave.
- **Needs the user's keyboard**, plainly: the open decisions; G10-1 (the tag, any push), G10-2 (RET-1) and G10-3 (the
  pp1 leg, a real login) if not granted during the run; a reload only if the script failed twice; pinning if it was
  needed; `/mcp` in any interactive Claude session of mine that ran during the phase (the MCP bundle changes in S2–S4).
- Then `session-closeout`, and `phase-kickoff` for **Step 11 — D3 file upload** (`browser_upload_file` / `Tab.upload`
  via `DOM.setFileInputFiles`), then **Step 12 — Phase F** (`args` for `browser_evaluate`, console/error capture, the
  keep-attached debugger session) — decisions.md · 2026-10-24 · The roadmap after Step 8 (#129).

## 9. STOP RULES

**Stops the gate** (the write-up continues): a pre-registered exit check fails after 2 fix rounds; a router method
reachable without the safety gate; any path by which a client, the daemon or a page changes the safety state or
reaches the extension's own pages; a safety state not restored after a live wave; a pattern, URL, title, evaluated
value, `saveTo` path or the token in a log or committed evidence; a `saveTo` answer carrying any part of the value;
a `CLAUDE.md` runtime invariant that would have to change; `main` rewritten, a tag created or anything pushed without
G10-1; a live runner that continued past a STOP line; a port-9234 holder that is not the daemon, or an orphan `node`
process; the test count drops without a documented move or removal.

**Continues anyway, recorded:** a live row that fails (the wave records it; the fix is a proposed decision); SW-1's
outcome either way; RET-1 or the pp1 leg not run for lack of a grant ("not run — waits for the user"); build
decisions on wording and layout; an audit finding resolved plan-side with a dated note.

**Forbidden fixes:**
- exempting a method from the safety gate, or reclassifying it, to make a row or test pass; a new extension method
  without a safety class;
- a wire, daemon, SDK or MCP method that arms, disarms, edits the block list or enables JavaScript; re-arming by
  default on a reload, an update or a Chrome restart; enforcing safety in the daemon or SDK instead of the extension;
  matching blocked hosts by substring or by `endsWith` without a dot boundary;
- leaving the safety state changed after a wave, or printing my real block list anywhere;
- editing §4.20's rows or any row's expected text after its run; choosing a bound after seeing the measurement;
- changing `a11y.ts`, a locator rule or the snapshot's output to make the cap warning appear;
- returning any part of a `saveTo` value to the model, writing anywhere but the given absolute path, or logging the
  value or the path;
- lowering `activateForCapture`'s 1000 ms or 50 ms waits without a measurement; adding window focus to a capture;
  adding `chrome.windows.update({focused: true})` outside `focusTab`; focusing on an untrusted action; moving the MCP
  cursor on a focus;
- rewriting `main`, force-pushing, tagging or pushing without G10-1;
- a runner fixing a helper past a STOP line and carrying on;
- and, from Steps 6–8, still binding: weakening a lease or lock invariant; logging a URL, title, header value, body,
  locator text or the token; binding anything but `127.0.0.1` or widening the token rule; making `BridgeClient`
  reconnect on a close code other than 4002; letting the MCP crash when `connect()` fails; editing a test's expected
  text to match a changed error; regenerating `sdk/test/fixtures/baseline-51de800.json`.

**Final report** leads with "Decisions taken while you were away" (date + title), then the gate measurements (test
counts per stage with the command, Run 14 and Run 15 rows with their observed text, the restore read-backs), then
open decisions, then what needs my keyboard (§8).

I trust you — decide well and leave a trail we can audit.
