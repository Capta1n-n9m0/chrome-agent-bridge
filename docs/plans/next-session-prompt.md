# Step 8 kickoff — the SDK surface: locators, the typed `Tab`, failure reports, the MCP cursor, the background-input policy, first recipes

Written 2026-10-23 by the session that closed Step 7 (multi-actor tabs), with the `phase-kickoff`
skill, phase kind. Paste everything below the line into a **fresh** Claude Code session started in
`C:\Users\aliev\Projects\chrome-remote-extention`, launched so that it is **not a bridge client**:
`claude --strict-mcp-config --mcp-config <scratch>\no-mcp.json`, where the file holds
`{"mcpServers":{}}` (LESSON "the driver is not a bridge client" below). The Step 7 kickoff this file
replaces stays in git history (`git show 0773a98:docs/plans/next-session-prompt.md`).

---

Dear Claude, you are the SESSION AGENT for **Step 8 — the SDK surface and the MCP cursor** of the
chrome-agent-bridge repo (a localhost daemon plus a Chrome MV3 extension, with an MCP server and a
TypeScript SDK as its clients, that let an agent or a script drive the user's real, logged-in Chrome
profile). Step 8 makes the SDK something Claude can write a working script against from its types
alone, and fix from the error alone. This prompt is self-contained; its reading list is in §3.

## 1. Opening

**Binding documents.**
- Phase doc (the plan; its checkbox lines are the work items, its "Exit checks (pre-registered)",
  "Human gates" and "STOP rules and forbidden fixes" are the pre-registered rules):
  `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`. **All its dated notes bind** — the
  *Corrected 2026-10-22* notes of Step 6's propagator and the eighteen *Corrected 2026-10-23* notes of
  Step 7's propagator (ledger: `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/propagator.md`).
- Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §8 (SDK and the MCP as
  its client: §8.1 shape, §8.2 errors, §8.3 cursor) binds; §5 (layer contract), §6 (handles, leases,
  the visibility lock, the human), §7 (screenshots) and §10 (protocol v2) bind wherever Step 8 touches
  them; §12–§13 for risks and open questions (§13 now holds the session-marker question).
- What Step 7 actually built: `docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md` — every
  stage's "Contracts (binding forward)", T5b's, "RELOAD-AUTO, Run 9, BG-FLAGS" and the gate checklist.
  **Stage 0 re-examines those contracts by execution.**
- Workflow: the `long-run` skill (`.claude/skills/long-run/SKILL.md`); briefs, ledgers, reports and
  role prompts from the `step-agent` skill (`.claude/skills/step-agent/SKILL.md`, `role-prompts.md`);
  bookkeeping with `session-closeout`; the next kickoff with `phase-kickoff`; writing rules in
  `docs/docs-writing-guide.md` (plain language, decisions cited by date + title, codes glossed on
  first use).
- Decisions that bind, by date + title in `docs/decisions.md`: §3 item 3. **None is open** — the user
  ruled every Step 7 decision on 2026-10-23 (#68, #69).

**Precedence when documents disagree:** pre-registered rules (the phase doc's exit checks, human
gates, STOP rules) > the phase doc > the skills. Two sets of rulings apply on top, already: the user's
decisions on live waves and reloads (decisions.md · 2026-10-22 · Live E2E waves are run by Claude end
to end (#33); · 2026-10-23 · Later extension reloads use `recipes/reload-extension.ps1` (#65)), which
amend G8-2 and S6's "wave run with the user"; and the user's ruling that focus emulation is measured
before the policy is set (decisions.md · 2026-10-23 · The user rules on Run 8: fix stage T5b, then
Run 9 (#62) item 4), which amends G8-1. The phase doc already carries dated notes for both. A
spec-vs-plan-vs-code conflict goes through the SPEC-DISCREPANCY PROTOCOL in §5.

**Model.** Every agent at every level — you, each step agent, every builder, verifier, fixer and the
propagator — runs **Claude Opus 5.5, model id `claude-opus-5-5`**, by the user's ruling (decisions.md ·
2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7 open decisions (#69): "I like
higher quality product", with Sonnet builders named as the rejected option). Record it as your first
`docs/decisions.md` entry, "Step 8 agents run Opus 5.5", `By: user`, citing #69. State it in every
brief; pass `model: "opus"` on every `Agent` call. The only exception: the **headless E2E actor
sessions** (`claude -p`) of the live parts (stage FE and S6) may run Sonnet, as Step 7's did.

**AUTONOMOUS — I am away; do not block on me.** Decide and record per `long-run` §3. What waits for
me is the integrity floor (§6): the `long-run` §4 list plus this phase's gates.
- **The extension reload is not a human gate any more.** The driver reloads with
  `recipes/reload-extension.ps1` (decisions.md · 2026-10-23 · The driver may reload the extension by UI
  automation, and restart Chrome with flags for the background-input test (#64) (1); · Later extension
  reloads use `recipes/reload-extension.ps1` (#65)), then proves the build with a stale-extension check
  that only the new build can pass. **My keyboard is needed only if that script exits non-zero** (exit 2
  = it pressed nothing on doubt): then stop that live part with its package ready and ask me once.
- **Live waves are yours** (#33): headless Claude actors, SDK scripts, PowerShell, Chrome windows the
  driver opens on fixture pages, window captures. Never my own tabs or windows.
- **A Chrome restart** (with or without flags) needs a **fresh grant** from me: #64 (2) covered the
  BG-FLAGS test only (decisions.md · 2026-10-23 · Chrome's anti-throttling flags do not fix background
  input; Step 8 takes it from there (#66)). Ask once; without an answer, record the row as "not run —
  needs a Chrome restart grant" and continue.
- **G8-1** (the background-input policy) is resolved inside the run by stage FE (§7), with both
  outcomes written down before the measurement. It is not a stop.
- **G8-2** (the S6 wave) is the driver's, except **SDK-6 and SDK-7**, which run on a Blackboard course
  of mine that I name: ask once at S6; without an answer they are recorded "waits for the user" and the
  gate lists them.
- **G8-3** (editing `~/.claude/skills/blackboard-ultra`, a separate repo) is **not granted** by this
  kickoff: S7 lists it under "needs the user's keyboard".
- **Any token or bind question** stops the run (`long-run` §4.4).
- **Standing:** never push; never commit `bridge.token`, `.env`, `dist/`, `exports/` or a failure
  screenshot; any loosening of a lease or lock rule, or a cursor that follows the human outside
  `browser_use_active_tab` and the first touch, is a contract change — stop.

**Goal.** Locators (`{role, name}`, `{text}`, `{css}`) resolved in the content script by the snapshot's
own rules; actions that take `ref | locator`; `waitFor({locator})`; `evaluate` node results turned into
refs; a typed `Tab` API with the actor's cursor; a `BridgeError` that carries a snapshot, a screenshot
path and the last 20 network entries, rendered by `error.report()`; the MCP's cursor that does not
follow the human unless told to (`browser_use_active_tab`; 22 → 23 tools); the **policy for trusted
input into a background tab**, set from a focus-emulation measurement this step adds; the removal of
Step 7's one-release compatibility forms; and the first recipes (`boot-bb.ts`, `export-grades.ts`) as
the dogfood.

**Baseline state** (verified 2026-10-23 by the Step 7 close-out session; table in §3): `main` at the
**close-out commit that adds this file** (`git log -1 --format=%h -- docs/plans/next-session-prompt.md`
finds it; its parent is `b1fc1da`, `docs: Step 7 propagator — 49 corrections`). `npm test` → 950
passed, 59 files; `npm run typecheck` exit 0; 22 tools (`grep -c "server.tool(" mcp/src/tools/registry.ts`);
22 codes in `shared/src/codes.ts`. `npm run build` was not re-run by the kickoff (it would rewrite
`extension/dist/sw.js`, see the table). Port 9234: free. Re-check all of it at Stage 0 and date it.

## 2. Agent contract

Read `.claude/skills/long-run/SKILL.md` and hold to it: §1 context discipline (you read reports and
write markdown; you never write feature code, run the suite in your own context, run or kill the
daemon, or read diffs line by line), §2 agent tree, §3 decisions, §4 the exhaustive stop list, §5
waiting, §6 revival, §7 end of phase.

**Form: three-level.** You spawn one **step agent per stage** (Stage 0, S0, S1, FE, S2, S2b, S3, S4,
S5, S6, S7 — see §7); each step agent spawns its own builder, independent verifier and at most two
rounds of fixer. Level-2 agents never spawn agents, and they do the work: a step agent reads and
decides, it does not build or commit itself (Step 7 T0 lesson). The live parts (FE's measurement, S6)
hold long waits: their step agents hold them per `long-run` §5. Steps dir:
`docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/` — create it first, with an append-only
`journal.md` and a `briefs/common.md` (the Step 7 one, `…step7-multi-actor-tabs-steps/briefs/common.md`,
is the model: fixed facts, standard brief parts, ESCALATION, the two protocol blocks, forbidden fixes,
LESSONS, running state). As-built register: `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md`
(you create it at the first stage close).

**Parallelism** (host tests bind port 0, never 9234). **At most two step agents run at once, and a
live part runs alone** (the quota lesson: "we ran out of limits quickly because of many heavy parallel
sessions", #69's why):
- Stage 0 first, alone. S0 next, alone (everything imports its types).
- **S1 ∥ FE (build part)** after S0: file-disjoint (`extension/src/content/` vs `extension/src/debugger.ts`
  + the trusted branch of `handlers/actions.ts`), both unit work, no port.
- **FE (live part)** alone, after FE's build part is committed **and no other stage has uncommitted
  code in the main tree** (the loaded extension is built from the main tree's `extension/`; LESSONS).
- S2 after S1 and FE (both touch `handlers/actions.ts`). S2b after S2 (both touch `sw.ts` and
  `daemon/src/methods.ts`).
- **S3 ∥ (S2, S2b)** once FE's outcome is recorded in `docs/decisions.md`: `sdk/` is disjoint from
  `extension/` and `daemon/`. S3 may start earlier on everything but `sdk/src/policy.ts`, if the
  two-agent limit allows.
- S4 after S3. S5 after S3, S4 and S2 (it renders the locator fields and `asRef`). S6 after
  everything. S7 last.
- Only one thing owns 9234 at a time: the real daemon. No stage starts it except FE's live part and S6.

**STEP BRIEF TEMPLATE** (paste for every step agent; fill the angle brackets from the phase doc and §7):

```
You are the STEP AGENT for stage <STAGE> ("<plain stage name>") of Step 8 (the SDK surface:
locators, the typed Tab, failure reports, the MCP cursor, the background-input policy, first
recipes) of the chrome-agent-bridge repo (C:\Users\aliev\Projects\chrome-remote-extention; Git
Bash shell; checks: `npm run typecheck`, `npm test`, `npm run build`). Read CLAUDE.md first — its
"Runtime gotchas" are measured facts and bind. Then read
docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/briefs/common.md in full: it is part
of this brief.
Model: claude-opus-5-5 (Opus 5.5); every agent you spawn: model "opus" (FE and S6 only: the
headless E2E actor sessions may run Sonnet).
GOAL: <one paragraph>.   INPUTS: <the phase-doc stage text verbatim: its checkboxes, Lane,
Parallel with, Verifier focus, Needs the user's keyboard, and every dated note under it; the
kickoff's §7 row and items for this stage, verbatim; the phase-doc "Decisions" 0.1–0.7 that bind
this stage; the design-spec sections that bind (§8, and §5/§6/§7/§10 where touched); the Step 7
as-built contracts this stage touches; the Step 8 as-built register so far
(docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md); prior step reports; PIDs of
anything running (normally nothing)>.
EXIT CRITERIA: <the pre-registered exit checks for this stage, by ID, verbatim — the phase doc's
and the kickoff's new ones (FE.*, S2b.*, S3.5); pass rules are written down before anything is
measured>.
LANE: <the stage's Lane from the phase doc, with the grants of kickoff §7>. Anything outside the
lane escalates.
WAITING: you hold long waits yourself — run the job in the background, end your turn, get
re-invoked by its completion; never a foreground sleep loop. A notice that a child is
"waiting on its own background work" is NOT completion: end your turn and wait for its
hand-back report. Your builders/verifiers/fixers finish in one go and never wait.
HOW YOU WORK: a builder does the work (role-prompts.md §Builder; failing test first for
pure logic). Then an INDEPENDENT verifier (never the builder; treats the builder report as
claims to audit; re-runs typecheck/test/build from a clean worktree, re-derives counts, attacks
the spec as well as the code, checks the CLAUDE.md invariants, checks that new tests fail
without the change). FAIL → fixer → the verifier re-checks only the affected items. At most
2 fix rounds, then escalate. Level-2 agents must NOT spawn agents. You read and decide; you do
not build or commit yourself. Read their outputs and the resulting files yourself before
accepting.
LEDGER: keep docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/<STAGE>.ledger.md
current after every substep. If respawned, resume from it. If the run is paused (usage limits,
the session agent's stop): let running level-2 agents finish, write the ledger, start nothing new,
return.
AUTHORITY: decide mechanical and stage-local design questions. Put each one in your report
under "Proposed decisions" in the decisions.md format. Never edit decisions.md, the as-built
register or CLAUDE.md yourself.
ESCALATE (stop that line of work, report, return): <the ESCALATION list below, verbatim>.
OUTPUT: docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/<STAGE>.md per the report
schema (step-agent skill: Verdict, Outputs, Verifier verdict, Deviations, Proposed decisions,
Findings, Handoff; test count before → after).
Commit your stage's code/docs via a builder: exact file list (never dist/, never bridge.token,
.env, exports/ or a failure screenshot, never `git add -A`), message
"<type>(<scope>): <stage> — <what> (verifier: PASS|PASS-with-notes)" with a body that says
why, plus the session's Co-Authored-By / Claude-Session trailers; on git index.lock, wait
and retry. If the commit is denied by the permission classifier, do not retry and do not work
around it: report it (the session agent asks the user). Never push.
Return a ≤ 15-line summary + the report path.
<SPEC-DISCREPANCY PROTOCOL — §5 of the kickoff, verbatim>  <INTEGRITY FLOOR — §6, verbatim>
<LESSONS — the block below, verbatim>
```

**ESCALATION list** (the `step-agent` default, extended for this phase). A step agent escalates
instead of deciding on:
- anything touching a pre-registered rule (an exit check, a human gate, a STOP rule) or a fact of the
  design of record (§8, and §5, §6, §7, §10 where touched; phase-doc decisions 0.1–0.7);
- an effect outside its lane — another package (`shared/`, `daemon/`, `sdk/`, `mcp/`, `extension/`), a
  later stage, a shared script, the wire protocol — except the grants written into the stage's Lane
  (phase doc and kickoff §7: S1 `extension/build.mjs`; FE `recipes/` and `docs/e2e-test-plan.md`; S2
  `extension/src/sw.ts` and `daemon/src/methods.ts` for the `locate` method; S2b `daemon/src/`,
  `daemon/test/` and the extension files named in §7; S6 `recipes/`, root `package.json`,
  `docs/e2e-test-plan.md`, `.gitignore`);
- any change to the locator rules (0.1's invariant: what Claude saw in a snapshot is what a locator
  matches), the `Tab` method set or signatures, the attach set, the cursor rule, MCP tool names or
  schemas, the SDK's exported surface, or the event names, params or codes on the wire;
- any change to the lease or lock semantics (who may act on a held tab; FIFO; when the lock is taken
  and released), or to what the human sees (no window focus outside `focusTab`; `newTab` in the
  background unless the activation rule of 0.6 says otherwise);
- any integrity-floor item (§6) or anything on the `long-run` §4 stop list — in particular a
  `reload-extension.ps1` exit other than 0, a Chrome restart, the token lookup, the `127.0.0.1` bind;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` treating null OR
  undefined as failure, `{__bridgeError:"CODE:message"}` for page-function failures, the content script
  as an IIFE, `toSerializableArgs`, no top-level `await` in the service worker, `webRequest` and
  `chrome.tabs` listeners at the top level, `ws` external to the daemon and MCP bundles, the zero-size
  snapshot filter gated on `hasLayout`, a closure-free `SERIALIZER_SRC`-style page script, never logging
  URLs, titles, header values, bodies or the token);
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger being met
  (decisions.md entries of 2026-10-21 to 2026-10-23);
- a port-9234 holder that is not the daemon (`node …/daemon/dist/index.js`, its pid and build in
  `~/.chrome-agent-bridge/daemon.log`), or an orphan `node` process it did not start;
- a test count that drops without a documented move or removal (S2b removes legacy-path tests: the
  removal is listed test by test, as #67 did);
- anything that needs the real Chrome profile outside FE's live part and S6, a Chrome restart at any
  time, or the user's own data (SDK-6, SDK-7);
- a permission or classifier denial;
- 2 failed fix rounds;
- a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` runtime gotchas are the standing list — these
are the ones Step 8 touches, carried from Step 7's `briefs/common.md` and extended with what Step 7
learned):
- **node is not on the Bash tool's PATH here.** Put the nvm-windows shim directory first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1, npm
  11.6.2). Every builder and verifier brief carries this line. Python is miniconda, not on PowerShell's
  PATH: `$HOME\miniconda3\python.exe` (Python 3.14.7) serves the fixtures.
- **"The human's tab" is one resolver** (decisions.md · 2026-10-22 · "The human's tab" is the active
  tab of the last-focused normal window (#43)): `humansTab()` in `extension/src/tabs.ts`. `listTabs`
  marks it `current: true`; `active` keeps Chrome's per-window meaning. `tabs()` in the SDK and
  `browser_use_active_tab` use `current`, never `active`. Still: never leave a DevTools window focused
  during a live row (W1 MUX-5); opening the service-worker console moves the last-focused window.
- **The driver is not a bridge client.** Launch it with `claude --strict-mcp-config --mcp-config <empty>`
  (decisions.md · 2026-10-22 · W1's set-up: the driver has no bridge MCP, the token moves from the MCP
  config into `bridge.token`); check with a process listing that no `mcp/dist/index.js` descends from it.
- **Headless Claude sessions are the E2E actors**:
  `claude -p --model sonnet --allowedTools mcp__chrome-agent-bridge "<prompt>"` in the repo, resumed
  with `--resume <session id>` across a row; each is a separate MCP client named `claude-code #<pid>`
  and loads the current `mcp/dist/index.js`. Read tool outputs verbatim from the transcript
  (`~/.claude/projects/C--Users-aliev-Projects-chrome-remote-extention/<session>.jsonl`), never from a
  model's paraphrase.
- **Reloads are scripted, and a reload is proved by the build, not by the script** (#64, #65; RELOAD-AUTO
  15320a6): `recipes/reload-extension.ps1` presses only the Chrome Agent Bridge card's reload button in
  its own window (exit 0; exit 2 = pressed nothing on doubt), then a stale-extension check that **only
  the new build** can pass (Step 7 used `screenshot {mode:"cdp"}` on a background tab → `OFFSCREEN` in
  < 1 s for T5b). Every live part that needs a new extension writes its own such check first. Developer
  mode must already be on; the extension id on this machine is `cpnemjbgecfbeicldpaaegbhjgjgjfep`
  (derived from the path of `extension/`).
- **The loaded extension is the main tree's.** Its id comes from the path of `extension/`, so a live
  check runs the main tree's `extension/dist`: build in the main tree, from committed code, with no
  other stage's work in flight. A main-tree build also rewrites `daemon/dist/index.js` when daemon
  code changed: the next client hands the running daemon over (build-id handover, `CLAUDE.md`), and my
  interactive sessions see a 4002 reconnect and a "cursor lost" notice. Verifiers build in clean
  worktrees.
- **An `ok` is not evidence.** Trusted CDP input into a background tab answers `ok` in 5–15 ms and the
  page receives nothing (BG-1/BG-2 Run 8; BGF-1/2 Run 10 with `--disable-renderer-backgrounding
  --disable-backgrounding-occluded-windows --disable-background-timer-throttling`); both work after
  `focusTab`. Every input row reads the page's own reporter (`status:` line, field value, `isTrusted`).
- **The switch flash is ~1.5 s, not a frame**: default-mode screenshot of a background tab, median
  1493 ms (Run 8 SCREEN-1) and 1557 ms (Run 9 R9-SCREEN-1), measured by page-side `visibilitychange`
  timestamps. A failure report's screenshot (0.5) shows it to the human; a `focus()`-first policy
  changes the human's view for good (no restore).
- **A covered window does not capture**: R9-RESTORE got `TIMEOUT` at 35 119 ms and the previous tab
  back at +30 026 ms. The 5 s attach cut of 0.5 ends the SDK's wait, not the extension's switch.
  `mode:"cdp"` refuses a background tab (`OFFSCREEN`) and a minimized window (`WINDOW_MINIMIZED`)
  before attaching (decisions.md · 2026-10-23 · T5b's three fixes (#63)).
- **CDP renders saturated colours differently** (decisions.md · 2026-10-23 · The user rules on
  R9-SCREEN-2 and the last five Step 7 open decisions (#69)): cyan `#00ffff` read `#97fdfd` through
  CDP; magenta `#ff00ff` read `#dd00fa` through the default capture. Colour checks name the nearest hue
  or use less saturated colours, and carry a positive control.
- **Pre-registered checks can be wrong themselves**: four Run 8 rows failed on their own checks
  (a pixel probe on label text, a DevTools window title Chrome does not use) and R9-NET-1 on an
  uncounted `favicon.ico` re-fetch (#62, #68). Dry-run every check's logic on a known-good input before
  the run, and give every heuristic a positive control. A threshold chosen after seeing earlier
  readings is disclosed in the row (Run 9's hue thresholds were).
- **Memory Saver gives a discarded tab a new id** on Chrome 156 (LEASE-6 outcome (b), `tabReplaced`;
  #45's premise was wrong); a popup's url arrives late (`leaseGranted` polls `listTabs` ≤ 2 s, #63).
- **Windows PowerShell 5.1 mangles `—`** into `â€"`: set `[Console]::OutputEncoding = [Text.Encoding]::UTF8`,
  read with `-Encoding UTF8`, write UTF-8 with Node or `[IO.File]::WriteAllText`. PowerShell 5.1 splits
  `Start-Process -ArgumentList '-Command', '<string with spaces>'`: put the block in a `.ps1` and use `-File`.
- **A daemon spawned through `Start-Process -NoNewWindow` held the caller's output pipe open** (W1
  MUX-6, by correlation; `CLAUDE.md`): send wave blocks' output to a file, or stop the daemon after.
  Stage S3 now tests the inherited handles (decisions.md · 2026-10-22 · The user rules on the W1
  proposals (#36)).
- **`*.log` is gitignored:** attach logs as `.txt`. Grep the attached daemon log for `://` and the token
  by count, never printing them.
- **Kill only identified PIDs:** `Test-SafeToKill <pid>` (`docs/e2e-test-plan.md` §1 item 8) must print
  `safe: …` before any `Stop-Process`/`taskkill`. On Windows a `detached` daemon dies in a tree kill of
  its own spawner (decisions.md · 2026-10-22 · The detached daemon's survival depends on how the
  session's MCP is killed). Quit Chrome only by `chrome://quit`, and only under a restart grant.
- **`ws` emits several frames from one TCP read synchronously**: a one-shot listener unsubscribes
  inside its own callback (the cursor clear on `reconnected`, `waitFor` loops in the SDK, typed events).
- **Parallel stages share one working tree**: builders run tests scoped to their package
  (`npx vitest run <pkg>/`) plus `npm run typecheck`; the full-suite count is the verifier's, in its
  own clean worktree (`git worktree add` at HEAD, apply the lane diff, `npm ci`); commits name an
  explicit pathspec of the stage's own files.
- **A subagent's report is a claim: verify by diff before accepting.** Re-run each "finding" against
  the file it cites before acting on it.
- **The permission classifier may deny a subagent's commit** (Step 7 T6): report it, never retry or
  work around it; the session agent asks the user, who approved T6's.
- **On a pause** (usage limits, a stop): level-2 agents finish what they are doing, step agents write
  their ledgers and stop, nothing new starts; revival is from the ledgers (`long-run` §6).
- **The repo is public** (guide rule 8): evidence shows only the fixture pages — never a page, title
  or URL of my own tabs, never a Blackboard page, student name or grade (S6: failure screenshots and
  `exports/` stay outside the repo or gitignored).

## 3. Reading order

1. `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §8 first; §5, §6, §7, §10 with their
   dated notes; §12–§13.
2. `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md` — all of it, every dated note.
3. `docs/decisions.md` — the entries that bind this phase, by date + title:
   - 2026-10-21 · Steps 6–8 run under the long-run contract
   - 2026-10-21 · The actor name carries the MCP's own process id
   - 2026-10-21 · selectTab stays as an alias of focusTab for one release (S2b removes it)
   - 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon restart
   - 2026-10-21 · Step 8 SDK-4 waits for the fixture's delayed text with a {text} locator
   - 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes
   - 2026-10-22 · The SDK reports configuration and connection failures as NOT_CONNECTED; · BridgeClient
     exposes welcome, extensionConnected and on("reconnected") in Step 6; · A reconnect after 4002 never
     hands the daemon over; · What clients do on a close code other than 4002; · D5b's shape:
     `requireExtension: false`, a `connectOptions()` helper, a test-only daemon import; · setup.md
     documents stopping the daemon by killing its process, with no stop script; · A Step 6 client gives
     up with VERSION when no welcome arrives — each names Step 8 as its revisit point (phase doc, Open
     items); S3 rules on each
   - 2026-10-22 · Live E2E waves are run by Claude end to end (#33)
   - 2026-10-22 · The user rules on the W1 proposals (#36) — the inherited-handles check (S3.5)
   - 2026-10-22 · Content-script failures are returned, not thrown, to carry `CODE:message` (#38)
   - 2026-10-22 · The daemon's method classes are one table, and the download methods are free (#39) —
     a new extension method (`locate`) must enter the table
   - 2026-10-22 · The `tab` parameter keeps its "all"/"active" meanings for the network tools (#40)
   - 2026-10-22 · A Step 6 client keeps working against a Step 7 daemon for one release, without
     loosening a lease (#41); · A stale extension is refused for tab calls, detected by its hello (#42)
   - 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window (#43)
   - 2026-10-22 · The formatters reach the MCP through a `@bridge/sdk/format` subpath (#46)
   - 2026-10-22 · v2 peers do not yet require `code` (#51)
   - 2026-10-22 · The daemon sends the network "all" scope as `scope`, and two Step 6 test fakes speak
     the new hello (#52); · `selectTab` takes the visibility lock, like `focusTab` (#53); · A bare number
     in a network `tab` is a legacy Chrome id, not `BAD_PARAMS` (#54)
   - 2026-10-22 · T1's extension details (#55); · T2's daemon details (#57); · T3's snapshot fields and
     capture rules (#58); · T4's MCP cursor and tool details (#59)
   - 2026-10-22 · BG-1/BG-2's focus-emulation retry cannot run in this wave; T5.2 reports it unmet if
     they fail (#61)
   - 2026-10-23 · The user rules on Run 8: fix stage T5b, then Run 9 (#62); · T5b's three fixes (#63)
   - 2026-10-23 · The driver may reload the extension by UI automation, and restart Chrome with flags for
     the background-input test (#64); · Later extension reloads use `recipes/reload-extension.ps1` (#65)
   - 2026-10-23 · Chrome's anti-throttling flags do not fix background input; Step 8 takes it from there (#66)
   - 2026-10-23 · T6 removes the extension's dead network formatters with their 15 tests (#67)
   - 2026-10-23 · The user rules on the Step 7 close-out questions (#68); · The user rules on R9-SCREEN-2
     and the last five Step 7 open decisions (#69)
4. `docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md` — every "Contracts (binding forward)",
   the gate checklist; the propagator's ledger `…step7-multi-actor-tabs-steps/propagator.md` (§ "Seen, not
   corrected" and § "Contract-level questions raised" are inputs to this kickoff, resolved in §7);
   `…-steps/T2-verifier.md` V4 (the session marker); `…-steps/T5-wave-sheet.md`, `T5-run9-record.md`
   and `BG-FLAGS-run-record.md` as the models for FE's and S6's sheets and records.
5. `CLAUDE.md` — "Runtime gotchas" and "Testing philosophy" bind; "Key files" is the map.
6. `docs/setup.md` (S5 and S7 change it) and `docs/e2e-test-plan.md` — §1 item 8 (the wave helpers:
   `Get-BridgeDaemon`, `Get-BridgeLog`, `Test-SafeToKill`, …) and item 9 (the reload script), §4.14–§4.16
   (the LEASE/SCREEN/BG, Run 9 and BG-FLAGS rows — the model for FE and SDK rows; BG-1/BG-2's PASS
   rules are FE's), §5 Runs 8–10 (how Step 7's waves were recorded).
7. `.claude/skills/step-agent/role-prompts.md` — the builder / verifier / fixer / propagator prompts.

**Environment facts** (verified 2026-10-23 by the Step 7 close-out session unless stated):

| Fact | Value | Source |
|---|---|---|
| OS | Windows 11 Pro 10.0.26300 | session environment |
| Shell for agents | Git Bash; Windows PowerShell 5.1 also present | session environment |
| Node / npm | v25.2.1 / 11.6.2 via the nvm-windows shim dir (not on Git Bash PATH; see LESSONS) | `node -v`, `npm -v` |
| Python | miniconda `$HOME\miniconda3\python.exe` (3.14.7), not on PowerShell's PATH | W1 set-up |
| Chrome (real profile) | 156.0.8078.48, Developer mode on, started without flags | Run 10 header (2026-10-23) |
| Baseline commit | the close-out commit that adds this file, parent `b1fc1da` | `git log` |
| `npm test` | 950 passed, 59 files | `npm test`, 2026-10-23, on `b1fc1da` + the close-out's docs |
| `npm run typecheck` | exit 0 | 2026-10-23 |
| `npm run build` | not re-run by the kickoff; last main-tree build at T5b (`12ecb65`); T6 (`430e6fe`) changed `extension/src/network-log.ts` (dead code, #67) without a build | T6 report § "Nothing running … no build" |
| Daemon build on disk | `490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974` (T5b) | Step 7 as-built § T5b; `daemon/dist/index.js` dated 2026-10-23 01:44 local |
| Loaded extension | the T5b build, reloaded by script for Runs 9–10; T6's removal is in neither the loaded worker nor `dist/` (no behaviour change) | Runs 9–10; #67 |
| Extension id | `cpnemjbgecfbeicldpaaegbhjgjgjfep` | `docs/e2e-test-plan.md` §1 item 9 |
| Tools | 22 | `grep -c "server.tool(" mcp/src/tools/registry.ts` |
| Codes | 22; `LOCATOR_NOT_FOUND`, `LOCATOR_AMBIGUOUS` present; **`NO_CURSOR` absent** | `shared/src/codes.ts` |
| Focus emulation | no `setFocusEmulationEnabled` anywhere in `extension/src`, `daemon/src`, `sdk/src` | `grep -rn` |
| Legacy forms still in place | `activeTab()` wrapper `extension/src/tabs.ts:22`, used at `:69`; `LEGACY_ID_METHODS` `daemon/src/methods.ts:36`; `selectTab` in the lock class (`takesLock`) and `router.on("selectTab", focusTab)` `extension/src/sw.ts:32`; switch-mode `WINDOW_MINIMIZED` text `extension/src/tabs.ts:196` | grep, 2026-10-23 |
| SDK entry points | `sdk/package.json` exports `.`, `./token`, `./download`, `./format`; `sdk/src/index.ts` five exports | file |
| `browser_new_tab` | always sends `active: true` (`mcp/src/tools/registry.ts:320`) | file |
| MCP entry (`~/.claude.json`, user scope) | `<repo>/mcp/dist/index.js`, no `env` | decisions #32 |
| Token | `bridge.token` at the repo root (gitignored); `BRIDGE_TOKEN` unset | decisions #32 |
| Port 9234 | free (no listener) | `netstat -ano`, 2026-10-23 |
| Host tests' port | `port: 0` | `daemon/test/*.test.ts` |
| `bb.js` for `boot-bb.ts` | `~/.claude/skills/blackboard-ultra/scripts/bb.js` exists | `ls`, 2026-10-23 |

## 4. Stage 0 — spec audit (one agent, before any code)

Spawn one step agent for Stage 0 with the brief template; its builder is the auditor, its verifier
re-executes five of the audit's findings. No feature code is written. Four lenses:

**(a) Code-cite compliance** — every `file:line`, function, message type, test name and Chrome / CDP /
`ws` / MCP-SDK API the phase doc and spec §8 cite exists and behaves as stated, **executed or confirmed
live**, not just read. Includes: `roleOf` (`snapshot.ts:52`), `hasLayout` (`:76`), `buildSnapshot`
(`:260`) and what an `a11y.ts` split must carry; `content/guard.ts` and `codedError` (`locate` must be a
guarded `window.__agentBridge` method, #38); `RefMap` and whether anything but `snapshot` resets it;
`toSerializableArgs` / `unwrapResult` in `extension/src/inject.ts`; `evaluate/serialize.ts`'s
`SERIALIZER_SRC` pattern (the model for `markScript`); `handlers/actions.ts`, `handlers/wait.ts`,
`handlers/evaluate.ts`; `debugger.ts`'s `withDebugger`, `trustedClick`, `trustedType`,
`trustedPressKey`; the daemon's forward path (`daemon/src/intercept.ts` — does an extra param such as
`focusEmulation` or `locator` reach the extension unchanged?); `methods.ts`' tables; `mcp/src/cursor.ts`
and `mcp/src/tools/registry.ts:320`, `:424–430`; `sdk/src/client.ts`'s `on("reconnected")`;
`sdk/src/spawn.ts` (`detached`, `stdio: "ignore"`, `windowsHide`); `sdk/package.json`'s exports. Chrome
and CDP behaviour the plan relies on, confirmed by the current docs or a scratch experiment (record the
source): `Emulation.setFocusEmulationEnabled` (is it per debugger session; is it cleared on detach; does
it affect `document.hasFocus()`/`visibilityState` or only focus events); `Runtime.callFunctionOn` on a
MAIN-world node setting an attribute the ISOLATED world can see (0.3's bridge); `chrome.runtime.onStartup`
and `chrome.storage.session`/`local` lifetimes (the session marker, §7 S2b).

**Re-examine Step 7's contracts by execution** (as-built "Contracts (binding forward)"), on port 0 with
a fake proto:2 extension: handles `T<n>` monotonic and `mint` idempotent; one lease per tab,
`TAB_HELD {owner, since}`; the FIFO lock around default-mode `screenshot`, `focusTab` and `selectTab`,
released once per acquisition on completion, deadline (`LOCK_TIMEOUT {holder}`) or disconnect; one
deadline per call (#44); the extension never receives `tab`; the legacy path (#41, #54) and the
no-proto `VERSION` refusal (#42); `networkClear` "all" → `TAB_HELD` while another client holds a tab;
`tabGone`/`leaseGranted` shapes and the resync on a proto:2 hello; `daemon.status`' `tabs`/`lock`;
`tabs.claim`/`tabs.release` results; `{__bridgeError}` → coded `BridgeError` and null/undefined →
`REF_STALE`; `listTabs`' `current`; `SnapshotResult` fields (#58); the formatters byte-identical to
`sdk/test/fixtures/baseline-51de800.json`; the MCP cursor (#59) and its one-time notice on both the
4002 and the non-4002 path. A contract that does not hold is a CRITICAL finding.

**(b) Internal consistency** — recompute from the real repo: 950 tests in 59 files, 22 → 23 tools,
22 codes (23 with `NO_CURSOR`, §7 S0), the seven-code attach set and its three exclusions (0.5), the
`Locator` union (three variants, `nth` on all, `exact` on two), `WaitForParams`' four arms, the 100 ms
poll / 10 s default of `waitFor`, the 5 s attach budget, the 60-line `report()` cap, the 1.5 s flash
and the 30 s restore (measured, §2 LESSONS), and every count the phase doc states.

**(c) Blind spots — what the plan never states.** Seed list; **extend it**:
- **`Tab.locate()` needs a wire method.** 0.4 gives `Tab` a `locate(locator)`, but S2 adds no `locate`
  extension method, router entry or daemon method-table row (#39: a new method must enter the table;
  unlisted methods with a `tab` are lease-checked by default). Proposed home: S2 (grant `sw.ts`,
  `methods.ts`); confirm.
- **SDK-1's `hello.ts`** — S6.2 (pre-registered) records `npm run recipe -- recipes/hello.ts`, but the
  existing `recipes/hello.ts` is judged by MUX-3/5/6/8/10. Rule which: rewrite it and re-date those rows'
  expected text before any run, or write the flow as another recipe and amend S6.2 with a dated note.
- **SDK-8 without my Gmail.** The row names Gmail; the repo is public and the driver must not use my
  tabs. Proposed: the "human's tab" is a fixture tab in a driver-opened window, as LEASE-7 did; the row
  gets a dated note.
- **A Step 7 MCP against an S2b daemon.** My interactive sessions may still run the Step 7 MCP bundle
  when S2b's daemon is built. Confirm by execution (the Step 7 `mcp/test/multi-actor.test.ts` against
  the S2b daemon) that it never relies on a removed form: untargeted calls (always `tab` from the
  cursor?), the `id` beside `tab` in `newTab`/`listTabs` results (`registry.ts:320`'s fallback),
  numeric network `tab` (dropped from the MCP schema by #59).
- **What a Chrome restart does to a held handle today** (T2 verifier V4): measured by a unit test on
  the resync before S2b changes it.
- **The failure-report screenshot on a covered or minimized window**: lands in `attachErrors` within
  5 s, but the human may see the failed tab for up to 30 s (R9-RESTORE). S4 states it; S5 says what the
  MCP shows.
- **Focus emulation and the human**: does enabling it on a background tab change anything the human
  sees (window focus, the active tab, the "debugging" banner — it attaches the debugger like any trusted
  call)? FE-4 measures it.
- **MV3 worker culling and the session marker**: a marker kept only in memory changes on every worker
  restart and would retire every handle; it must outlive a worker restart and change on a Chrome
  restart.
- **The `unknown method` symptom** after S2: a stale extension answers `locate` with
  `UNKNOWN_METHOD`; through the daemon a no-proto extension is refused with `VERSION` (#42). FE's and
  S6's stale checks must be answerable only by the new build.
- **Log hygiene**: no new log line carries a URL, a title, a locator's `name`/`text` (it can be page
  content), an `evaluate` expression or the token; the daemon withholds any line containing `://`.
- **Windows vs POSIX**: the daemon's and MCP's lifecycle stay unverified on POSIX; the inherited-handles
  test (S3.5) runs on Windows here — record, do not block.
- **The token**: unchanged path (`bridge.token`, env wins); nothing in Step 8 prints it.

**(d) Testability** — every exit check S0.1–S7.4, FE.1–FE.6, S2b.1–S2b.8 and S3.5 is executable and
discriminating, with its pass rule written before any measurement; FE's and S6's rows each get an
expected text before the run; flag any check that cannot fail (Step 7's T6.1 grep could not, #48).
Mark which checks are unit, which are live rows the driver runs, and which need me (SDK-6, SDK-7, a
Chrome restart for SM-1, a non-zero reload exit).

**The kickoff's proposals to audit** (§7 marks each "proposed by the kickoff, the session agent records
it"; record them in `docs/decisions.md` before Stage 0 is spawned, so the audit can attack them): the
FE stage and its outcome table; S2b's lane and scope; `code` required (#51); the session marker;
S3.4 vs #46; `NO_CURSOR` in `codes.ts`; the inherited-handles check in S3. A wrong premise is a
finding; the session agent then amends the decision with a dated note.

**Rulings to re-check by premise, not reopen** (the phase doc's "Open items", *Ruled 2026-10-21*):
SDK-4's `{text}` locator on `#load-later`; the DL rows; the actor name from the MCP's own `process.pid`;
the S7 Phase F wording; the cursor clear after a 4002 reconnect; the `selectTab` alias removal. A wrong
premise is a finding; a disagreement with a ruling is not.

**Phase-doc notes Stage 0 writes** (dated, plan-side): the FE and S2b stages and their exit checks
(copied from §7, may only be made stricter); S2.2's `activeTab`/`selectTab` greps move to S2b's close;
G8-1 resolved by FE; S3.4 per the S3.4 decision; S0 gains `NO_CURSOR`, `focusEmulation?` and the
hello's `session?`; S3 gains S3.5; SDK-8's fixture "human tab"; SDK-1's recipe ruling; the new row SM-1.

**Output:** `…-steps/stage0-audit.md` — findings ranked CRITICAL / MAJOR / MINOR / NIT, each tagged
**plan-side** (amend the phase doc in place with a dated note; record a decision if more than
mechanical) or **code-side** (becomes a stage item). **All resolved before S0 starts.** Then write the
stage split (default §7) with estimates into `journal.md`.

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
surface, the locator rules, the attach set, the cursor rule, MCP tool names and schemas) →
long-run §3: a pre-stated rule applies mechanically, else the conservative choice (security at
least as strict; every existing tool and test behaves identically; undoable), recorded under
Open decisions for the user. Code and spec never diverge silently: whoever changes behaviour
amends the governing doc in place with "*Superseded YYYY-MM-DD: was X, because Y.*". Verifiers
report findings with the command and its output; they never rewrite the spec or the plan.
```

## 6. Decisions and integrity floor

Decisions follow `long-run` §3: build decisions (module layout inside `extension/src/content/`,
`sdk/src/`, `mcp/src/`, the similarity metric's internals, test placement, the `report()` wording,
the recipes' file layout, defaults the plan left open, plain plan defects) you take and record
`By: Claude`; contract decisions (anything in `shared/src/protocol.ts` or `codes.ts`, the hello,
event names and params, the lease and lock rules, what the human sees, the SDK's exported surface and
`Tab` signatures, the locator rules, the attach set, the cursor rule, MCP tool names and schemas, the
removal of a compatibility form) apply a pre-stated rule or the conservative rule and are listed under
**Open decisions** in `docs/decisions.md` and in the as-built register for me to review at the gate.
Only you write `docs/decisions.md`; subagents propose. FE's policy is **not** a judgement call: it is
read off the outcome table written in §7 before the measurement.

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP
rule that says escalate; a human gate (G8-1 is resolved in the run by stage FE's pre-written
outcome table; G8-2, the S6 wave, is the driver's per decisions.md · 2026-10-22 · Live E2E
waves are run by Claude end to end, except SDK-6/SDK-7 on the user's own course; G8-3, the
blackboard-ultra skill edit, is not granted); an extension reload whose script
(recipes/reload-extension.ps1) exits non-zero; a Chrome restart, which needs a fresh grant
(decisions.md · 2026-10-23 · Chrome's anti-throttling flags do not fix background input; Step 8
takes it from there); anything destructive or outward-facing (push, tag, publish, history
rewrite, deleting outside the repo, touching the user's Chrome profile data or the user's own
tabs and windows, committing or logging the token); any loosening of the security boundary
(the 127.0.0.1 bind, the token gate, "never log URLs, titles, header values or bodies");
permission or classifier denials. (2) Phase-specific: a locator rule changed to make something
match (0.1's invariant); the cursor following the human anywhere but browser_use_active_tab and
the first touch; any loosening of a lease or lock invariant, including keeping a handle alive
across a changed extension session; raising the 5 s attach budget or letting an attach failure
throw; a FE outcome read any way but the pre-written table, or a FE row re-run under a looser
rule; a drop in the test count without a documented move or removal; evidence that shows a real
site's page content, a student's data or the user's own tabs; committing exports/ or a failure
screenshot; killing a process that Test-SafeToKill did not call safe. Standing rule: never
resolve a decision in the direction that flatters a result already seen; pass rules are written
before the measurement; a failed check is reported, never re-tuned.
```

## 7. Stages

Each stage's deliverables are the phase doc's checkbox lines for that stage, pasted verbatim into the
brief with their dated notes, plus the items this section adds. Exit checks are the phase doc's
pre-registered IDs plus the new ones below (Stage 0 copies them into the phase doc as dated notes;
they may only be made stricter). Budget slices are estimates (Step 7's stages took a third to a half
of theirs in agent time); the step report records the actual beside each. One commit per stage
close, messages from S7's list (FE: `feat(extension): FE — focus emulation for trusted input`; S2b:
`refactor(daemon,extension): S2b — remove the Step 6 compatibility path; session marker`).

**The four gaps the Step 7 propagator raised, and two it saw, are resolved here.** Each is *proposed
by the kickoff, the session agent records it* (contract-level ones by the conservative rule, listed
under Open decisions for me):

1. **S2's daemon half → a stage of its own, S2b** (propagator question 1). The removals S2 owns are
   partly in the daemon (decisions #41, #52, #53, #54, #57). S2's lane stays the extension handlers;
   **S2b** gets `daemon/src/` (`intercept.ts`, `methods.ts`, `handshake.ts`, `route.ts` as needed),
   `daemon/test/`, and in the extension `tabs.ts`, `sw.ts`, `network-scope.ts`, `offscreen.ts` (the
   hello), `errors.ts`, `extension/test/`; `shared/src/error.ts` for `code`; plus one grant per consumer
   Stage 0 finds of a removed form (for example `mcp/src/tools/registry.ts:320`'s `id` fallback). Why a
   separate stage: the removals are a compatibility contract, not locator work, and S2 would otherwise
   span three packages. Removing the legacy path **triggers #51**: `code` becomes required (item 2 of
   S2b below).
2. **Focus emulation before `policy.ts` → stage FE** (propagator question 2; #62 (4), #66, #61). A
   `focusEmulation` option for trusted input in the extension, unit-tested, then measured live (BG-1/
   BG-2 under the option), with both outcomes written below before anything is built.
3. **S3.4 vs #46 → an explicit Stage 0 decision, recorded before S3** (propagator question 3). #46,
   accepted by the user (#69), keeps `@bridge/sdk/format` and leaves the main entry to Step 8. Proposal:
   **S3.4 applies as written** — `sdk/src/index.ts` also re-exports `formatSnapshot` and
   `formatNetwork`, and the `./format` subpath stays (the MCP keeps importing it). Why: S3.4 is a
   pre-registered check, so it is the pre-stated rule; the change is additive (every existing import
   keeps working). Rejected: amending S3.4 to the subpath only. Stage 0 confirms that the re-export
   pulls no new runtime dependency into the main entry.
4. **The session marker → S0 (type) + S2b (behaviour)** (propagator question 4; T2 verifier V4; spec
   §13). A wire change, so contract-level, conservative rule: the extension hello gains an **optional**
   `session` string that stays the same across service-worker restarts and extension reloads and
   changes when Chrome restarts (Stage 0 confirms the mechanism, for example a value written on
   `chrome.runtime.onStartup`). The daemon: same marker → today's resync by id; a **different** marker,
   or none after one was seen → retire **every** handle (send `tabGone` to holders, drop leases, mint
   anew); no marker ever → today's behaviour. Stricter in every branch; undoable (the field is optional).
   Rejected: no marker (a lease can land on a reused id — possibly my tab); a marker that changes on
   every worker restart (retires leases for nothing). Live row SM-1 needs a Chrome restart → my grant.
5. **`NO_CURSOR`** (propagator, "seen"): not among the 22 codes. Proposal: S0 adds it to
   `shared/src/codes.ts` (23 codes; spec §10 gets a dated note); it is raised by the SDK only, never by
   the daemon or the extension. Additive. Rejected: an SDK-local code outside `ErrorCodes`.
6. **Inherited handles** (#36; propagator, "seen"): the Step 8 plan has no item. Proposal: S3.5 below.

**Also carried:** the `WINDOW_MINIMIZED` rewrite (#63) in S2b with SCREEN-4's dated note; #59's revisit
trigger (`browser_use_active_tab`) answered at S5 with an *Updated* note on #59; #40's trigger stays
unmet unless S5 redesigns the network tools (it does not plan to); the residual late-restore race (T3
verifier V4, T5b verifier N1) stays a watch item for S6, recorded if seen, not a stage item.

| Stage | Deliverables | Exit checks | Budget | Parallel | Verifier focus (beyond the phase doc's) |
|---|---|---|---|---|---|
| **0 — Spec audit** | §4 | findings file; every finding has evidence; Step 7 contracts executed; the kickoff proposals attacked; stage split in `journal.md` | 1.5 h | first, alone | re-execute 5 findings; the contract runs are real (port 0), not read |
| **S0 — Types** | phase doc S0 + `NO_CURSOR`; `focusEmulation?: boolean` on the trusted-input params; the hello's optional `session?: string`; `asRef?` on evaluate params | S0.1–S0.3; S0.4 (new): `grep -c` of codes → 23 with `NO_CURSOR`; the hello guard accepts a hello with and without `session` and rejects a non-string one | 0.5 h | alone | `Locator` exactly 0.1; daemon and extension bundles byte-identical after S0 (types only, no handover) |
| **S1 — Content `locate`** | phase doc S1 | S1.1–S1.5 | 2 h | ∥ FE build | behaviour-neutral `a11y.ts` (elements identical to the pre-S1 capture); `locate` never resets the RefMap; IIFE content bundle |
| **FE — Focus emulation** | below | FE.1–FE.6 | 1.5 h build + 1.5 h live | build ∥ S1; live alone | the option's CDP sequence; no window focus; outcome read off the table |
| **S2 — Handlers: `ref \| locator`, `waitFor`, node→ref** | phase doc S2 minus the `tabs.ts`/`selectTab` removal (moved to S2b), plus a `locate` method (`sw.ts`, `daemon/src/methods.ts` as a tab method) | S2.1, S2.3–S2.5; S2.6 (new): `locate` is in the daemon's method table and lease-checked | 2.5 h | after S1, FE | every action through `resolveTarget`; `markScript` closure-free, attribute removed, unique mark; `hidden` resolves on `LOCATOR_NOT_FOUND` only |
| **S2b — Compatibility removals + session marker** | below | S2b.1–S2b.8 (S2.2 checked here) | 2.5 h | after S2; ∥ S3 | the removals are stricter, never looser; the Step 7 MCP still works; the documented test removals |
| **S3 — SDK `Tab`, cursor, locators, policy** | phase doc S3 + S3.5 | S3.1–S3.5 (S3.4 per item 3) | 3 h | after FE's ruling; ∥ S2/S2b | `policy.ts` cites FE's rows and the decision; every `Tab` method's exact `{method, params}`; the Step 6 revisit items each ruled |
| **S4 — Failure reports** | phase doc S4 | S4.1–S4.3 | 2 h | after S3 | the attach set exactly 7 codes; the 5 s cut by an injected clock; the covered-window case stated |
| **S5 — MCP cursor + tools** | phase doc S5 | S5.1–S5.4 | 2.5 h | after S2, S3, S4 | 23 tools; the cursor stays when the fake `listTabs` moves `current`; `browser_new_tab`'s rule both ways; STAT-1/MUX-1/MUX-8 expected text re-dated before any run; **cross-package verifier** `shared/`+`daemon/`+`sdk/`+`mcp/` over real `ws` with a fake extension |
| **S6 — Recipes + E2E** | phase doc S6 + SM-1 | S6.1–S6.5 | 1.5 h autonomous + 3 h live | after all; live alone | expected text before the run; `exports/` and failure screenshots outside the repo or gitignored |
| **S7 — Docs + commits** | phase doc S7 | S7.1–S7.4 | 1 h | last | every new gotcha cites its source; 23 tools in `setup.md` |

**FE — focus emulation for trusted input, measured** (lane: `extension/src/debugger.ts`, the trusted
branch of `extension/src/handlers/actions.ts`, a pure helper module under `extension/src/` if needed,
`extension/test/`, `recipes/` for the measurement script, `docs/e2e-test-plan.md` for a new §4.17):
- [ ] A `focusEmulation: true` param on `click`/`type`/`pressKey` that take the trusted path (explicit
      `trusted:true`, or the escalation after a content-action failure): inside the same `withDebugger`
      session, send `Emulation.setFocusEmulationEnabled {enabled: true}` before the `Input.*` commands
      and `{enabled: false}` after them, in a `finally`. No `chrome.windows.update`, no `tabs.update`,
      no `focusTab` inside it. The result carries `focusEmulation: "on"`, so a stale extension (which
      ignores the unknown param) is detectable. Without the param, today's command sequence is unchanged.
- [ ] Rows (pre-registered, committed before the build is loaded): **FE-0** the stale check
      (`focusEmulation: "on"` in a result); **FE-1** BG-1 with `focusEmulation:true`; **FE-2** BG-2 with
      it; **FE-3** a trusted `pressKey` into the background tab's trusted-only input with it (the
      fixture's keydown reporter, `test-fixtures/e2e-playground.html:168`, PASS = `status: TRUSTED key = <key>`); **FE-4** the
      human's side during FE-1…3 — the human's tab stays `current` and never `hidden`, the foreground
      window is unchanged, the target stays `hidden` (window capture and page timestamps as Run 8/9);
      **FE-5** BG-1/BG-2 without the option on the same build (control: expected FAIL as in Runs 8 and 10,
      which makes FE-1/FE-2 discriminating). PASS rules are BG-1's and BG-2's (§4.14), copied, with the
      option added; three trials each.
- [ ] The live part: commit; main-tree `npm run build` of committed code; `recipes/reload-extension.ps1`
      (exit 0, else stop and ask me); FE-0 first; then the rows; `FE-run-record.md` with every command
      and its text; daemon log attached as `.txt`; a fresh verifier re-reads the record against the
      pre-written rules.
- **Outcome table** (written now; the session agent records the matching decision, "The background-input
  policy", citing the rows, and S3 sets `sdk/src/policy.ts` from it):
  - **(A) FE-1, FE-2, FE-3 PASS in all trials and FE-4 PASS** → policy `"focusEmulation"`: the SDK's
    trusted actions send `focusEmulation: true`; no `focus()`, no flash; the MCP's trusted tools do the
    same (S5).
  - **(B) FE-1 and FE-2 FAIL, or FE-4 FAIL** (the human saw something) → policy `"focusFirst"`: the
    plan's fallback (0.4; #66 "Revisit if") — `Tab.click/type/pressKey({trusted:true})` call `focus()`
    first, and the docs say the tab comes to the front and stays there.
  - **(C) mixed** (one input kind passes all trials, another fails; FE-4 PASS) → per kind: the passing
    kinds use emulation, the failing kinds `focus()` first; recorded per kind.
  - A trial that passes once and fails once counts as FAIL for that kind (no best-of-three).
  - FE-5 passing (the control no longer fails) voids the comparison: record it, read the policy as (B),
    and list it for me.
- Exit checks: **FE.1** `npm test` after ≥ before + the new tests; typecheck green. **FE.2** a pure,
  tested function builds the CDP command list: with the option, enable → the input commands → disable,
  and disable also after a failing input command; without it, the list equals today's (asserted
  against a recorded list). **FE.3** `grep -nE "windows\.update|focused\s*:" extension/src/debugger.ts`
  → nothing new; the option path calls no `focusTab`. **FE.4** rows FE-0…FE-5 committed before the build
  is loaded (`git log` order). **FE.5** the live run's first recorded line is the reload's exit 0 and FE-0
  PASS. **FE.6** the decision "The background-input policy" names the outcome (A)/(B)/(C) and the rows.
- *FE is proposed by the kickoff, the session agent records it.*

**S2b — the Step 6 compatibility path, `code` required, the session marker, the minimized-window
message** (lane in item 1 above):
- [ ] Daemon: remove the legacy path (#41: no `tab` → the human's tab; a Chrome `id` on
      `closeTab`/`focusTab` → its handle; #54: a bare number in a network `tab`); a non-free call
      without `tab` → `BAD_PARAMS "tab is required"` (T2.4's original clause, superseded by #41, returns);
      a numeric network `tab` → `BAD_PARAMS` (#40's original rule); `LEGACY_ID_METHODS` gone; `selectTab`
      out of the method table and the lock class (#53), so a `selectTab` call is answered as an unknown
      method; `newTab`/`listTabs` results without the Chrome `id` beside `tab` (#57) — *unless* Stage 0
      finds a consumer that needs it, then a dated decision.
- [ ] Extension: delete the `activeTab()` fallback in `targetTab` (`tabs.ts:22`, `:69`) → `BAD_PARAMS`
      when `tabId` is missing; remove `router.on("selectTab", …)` (`sw.ts:32`); drop the old `tab:"all"`
      scope from `network-scope.ts` (#52); rewrite the switch-mode `WINDOW_MINIMIZED` message
      (`tabs.ts:196`, #63) to stop suggesting `mode:"cdp"` — proposed text: `Chrome's window is
      minimized, so the tab cannot be captured — restore the window, or call focusTab first` (cdp's
      refusal already says "restore the window, or call focusTab first"). The test asserting the old
      text is replaced in the same commit, citing #63 (a designed change decided before the edit, not a
      test edited to match), and the SCREEN-4 row in `docs/e2e-test-plan.md` gets a dated
      *Superseded* note on its expected text; its recorded result is not touched.
- [ ] `code` required (#51's trigger; *proposed by the kickoff*, conservative rule): `WireError.code`
      becomes required in the type; the extension's every error path sends a code (a test over
      `router.ts`'s paths); on receipt, a proto:2 peer's error without a non-empty string code is still
      delivered as `INTERNAL` (never dropped, never turned into a timeout) with one log line per
      connection naming the method only; a no-proto peer keeps today's mapping. Rejected: refusing or
      dropping the frame.
- [ ] The session marker (item 4 above).
- Exit checks: **S2b.1** `npm test` after = before − the listed removed tests + the new tests; typecheck
  green. **S2b.2** S2.2 (`grep -rn "activeTab" extension/src`, `grep -rn "selectTab" extension/src` →
  nothing) and `grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src` → nothing. **S2b.3** tests: no `tab`
  → `BAD_PARAMS`; numeric network `tab` → `BAD_PARAMS`; `selectTab` → `UNKNOWN_METHOD`; `closeTab`/
  `focusTab` with `id` only → `BAD_PARAMS`; every lease and lock test from Step 7 still green unchanged.
  **S2b.4** the `code` rule's tests, both peer kinds. **S2b.5** the marker's four branches tested
  (same; changed; dropped; never), `tabGone` to each holder exactly once; the marker is never logged
  (the log says `extension session changed: <n> handles retired`). **S2b.6** the new `WINDOW_MINIMIZED`
  text in `extension/src/tabs.ts` and nowhere the old `pass mode:"cdp"` hint. **S2b.7** the Step 7
  cross-package test `mcp/test/multi-actor.test.ts` green with no edit beyond a documented fake.
  **S2b.8** every removed test listed with the form it covered (the count drop is a documented removal).
- *S2b is proposed by the kickoff, the session agent records it.*

**S3.5 — the inherited handles** (#36; lane `sdk/src/spawn.ts`, `sdk/test/`; *proposed by the kickoff*):
a test spawns, through `spawnDaemon`'s options, a stand-in long-lived node script (never the real
daemon, never port 9234) from a child process whose stdout is a pipe; the child exits; PASS = the
reader sees end-of-file within 2 s while the stand-in is still alive (then killed by its recorded pid).
Both outcomes written now: if the test **passes at the baseline**, nothing changes and the MUX-6 gotcha
gets a dated note that `spawnDaemon` inherits no pipe (the hold came from `Start-Process -NoNewWindow`
itself); if it **fails**, S3 fixes the spawn so nothing is inherited, and the test is the proof.

**S6, how the wave runs** (decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end):
1. Autonomous part first (SDK-1…8 and SM-1 with expected text, the regression rows' expected text from
   their last recorded run — Run 9 for those it re-ran, NET-1 `12.8 KB` and `showing 2 of 2` after a hard
   reload (#56, #68) — a wave sheet `…-steps/S6-wave-sheet.md`, `exports/` in `.gitignore`), committed.
2. `npm run build` in the main tree, `recipes/reload-extension.ps1` (exit 0, else stop and ask me), the
   stale check as the first recorded line (an S2 `locate` call answered), fixtures on 8080 (and 8081)
   with miniconda's Python, the daemon from the new build (`Get-BridgeLog`, `Get-DaemonBuild`).
3. Actors: headless `claude -p --model sonnet` sessions for SDK-8, MUX-2 and LEASE-1; scripts with
   `npm run recipe -- <file>`. SDK-8's "human" tab is a fixture tab in a driver-opened window. **SDK-6
   and SDK-7**: ask me once for the course; without an answer, "waits for the user". **SM-1** (a held
   handle across a Chrome restart → `tabGone`, never a live handle on a reused id): ask me once for a
   restart grant (`chrome://quit`, session restore, counts checked as in Run 10); without it, "not run".
4. Results into `docs/e2e-test-plan.md` §5 as Run 11, with `S6-run-record.md` (every command and its
   text, from the transcripts) and the daemon log attached as `.txt`; a fresh verifier re-reads the
   record against the pre-written text and greps the log for `://` and the token by count. Failure
   screenshots and `exports/` are checked to be outside the repo or gitignored before any commit.
5. A failed row is recorded, never fixed in the wave; anything needing a code change returns as a
   proposed decision (the wave loop).

Propagator after S7: compares the as-built register with the phase doc, the design spec, `CLAUDE.md`,
`docs/setup.md`, `docs/e2e-test-plan.md` and `README.md`; writes dated correction notes in place;
returns a correction ledger. It edits no code.

## 8. Close-out contract

- Measured numbers into the phase doc: rewrite its **Outcome** as results (test count per stage with
  the command; tool count 23; FE's rows and the policy it set; S6's rows; timings with their source);
  its **Status** line.
- The **as-built register** `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md` per
  `.claude/skills/phase-kickoff/asbuilt.md`: one section per stage, appended at stage close, never
  rewritten (corrections are dated notes); contracts binding forward (the `Locator` rules and
  `locate`'s RefMap rule; `ref | locator` on the wire; `asRef` and the mark; the `Tab` surface and
  `index.ts` exports; the cursor; the attach set and `report()`; `policy.ts`'s value; the removed
  compatibility forms; `code` required; the session marker; 23 tools) — the next phase's Stage 0
  re-examines them by execution; decisions taken; deviations; estimates vs actuals; needs the user's
  keyboard; open decisions; FE's and S6's as-built at the end.
- The **gate checklist** (item → met? → evidence): S0.1–S7.4, FE.1–FE.6, S2b.1–S2b.8, S3.5; the STOP
  rules not fired; one commit per stage with no `dist/`, token, `exports/` or failure screenshot.
- **Needs the user's keyboard**, listed plainly: (1) SDK-6 and SDK-7 on a course I name, if not run;
  (2) SM-1's Chrome restart grant, if not run; (3) the `blackboard-ultra` skill edit (G8-3); (4) a
  reload only if `reload-extension.ps1` exited non-zero; (5) `/mcp` or a restart of any interactive
  Claude session of mine that ran during the phase (its MCP bundle predates S5); (6) the rulings on the
  open decisions (the kickoff's proposals among them); (7) any push.
- Then the `session-closeout` skill (phase doc, `docs/decisions.md`, `docs/progress-and-roadmap.md`,
  the `CLAUDE.md` Current state block, new gotchas as measured facts, memory, commit) and the
  `phase-kickoff` skill again for the next item on the roadmap (overwriting
  `docs/plans/next-session-prompt.md`).

## 9. STOP RULES

**Stops the gate** (the stage is not closed; the write-up continues): a pre-registered exit check
fails after 2 fix rounds; S1.2 (the behaviour-neutral refactor) fails and the proposed fix touches
`snapshot.test.ts`'s expectations; FE's outcome is not recorded when S3 reaches `policy.ts` (G8-1 as
amended); a `CLAUDE.md` runtime invariant would have to change (`unwrapResult` null-or-undefined, the
`{__bridgeError}` return, the IIFE content script, `toSerializableArgs`, no top-level `await`, the
top-level listeners, never logging URLs); a security-boundary question; a recipe that would write or
change anything on Blackboard (0.7: the first jobs are read-only); a port-9234 holder that is not the
daemon, or an orphan `node` process the run did not start; the test count drops without a documented
move or removal; a change that would let one actor act on another's tab, or keep a handle alive across
a changed extension session.

**Continues anyway, recorded:** FE's outcome in any direction (the table decides the policy); a
`nearest()` ranking that looks odd on a real page (report the candidates); a flash seen during a
failure screenshot (0.5 accepts it; ~1.5 s); SDK-6/SDK-7/SM-1 not run for want of my answer; build
decisions on the similarity metric's internals, test placement, the `report()` wording; an audit
finding resolved plan-side with a dated note.

**Forbidden fixes for this step** (the phase doc's list, extended):
- changing a locator rule (`roleOf`, the accessible-name computation, the pruning gates in `a11y.ts`)
  to make a fixture or an E2E row match;
- making `locate` reset the RefMap, or minting a ref without going through the RefMap;
- raising the 5 s attach budget, or letting an attach failure throw, to make a report test pass;
- making the cursor follow the human's tab anywhere but `browser_use_active_tab` and the first touch;
- leaving the `data-__bridge-mark` attribute on the element, or using a non-unique mark;
- restoring the `activeTab()` fallback or the daemon's legacy path to make something work without a
  `tab`/`tabId`;
- making focus emulation "work" by focusing the window, activating the tab or calling `focusTab`
  inside the option; leaving emulation enabled after the call; re-running an FE row under a looser
  rule, or reading the outcome other than by the table;
- dropping or refusing an error frame that lacks a `code` (it is delivered as `INTERNAL`);
- a session marker that changes on a worker restart, or a resync that keeps a leased handle across a
  changed marker;
- committing `exports/`, failure screenshots, or any captured page content as evidence;
- editing the `blackboard-ultra` skill without the grant of G8-3;
- restarting Chrome without a fresh grant, or quitting it any way but `chrome://quit`;
- and, from Steps 6–7 and still binding: weakening a lease or lock invariant (a call on a held tab let
  through, the lock skipped or made non-FIFO, released on anything but the holder's completion,
  timeout or disconnect); adding `chrome.windows.update({focused: true})` anywhere but `focusTab`;
  lowering the 1 s activation wait or the 50 ms frame wait without a measurement; logging a URL,
  `lastUrl`, title, header value, body, locator text or the token; binding anything but `127.0.0.1` or
  widening the token rule; lowering the `+5000` daemon slack, the `[100, 600000]` bounds or the
  heartbeat; making `BridgeClient` reconnect on a close code other than 4002; letting the MCP crash
  when `connect()` fails; editing a test's expected message text to match a changed error (S2b's
  `WINDOW_MINIMIZED` rewrite is a designed change under #63, done as stated in §7); editing a row's
  expected text after its run; regenerating `sdk/test/fixtures/baseline-51de800.json` from the current
  formatter.

**Final report** leads with "Decisions taken while you were away" (each cited by date + title, the
kickoff's proposals first), then the gate measurements (test counts per stage with their command, tool
count, FE's rows with their observed text and the policy set, S6's rows, timings with their source),
then open decisions, then what needs my keyboard (§8's list).

I trust you — decide well and leave a trail we can audit.
