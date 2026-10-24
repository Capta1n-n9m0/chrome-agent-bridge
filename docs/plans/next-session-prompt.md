# Step 9 kickoff — Phase E: safety (the human's kill switch, a JavaScript switch, blocked sites)

Written 2026-10-24 by wave W2 (the session that ruled Step 8's 25 open decisions and closed Step 8), with
the `phase-kickoff` skill, phase kind. Paste everything below the line into a **fresh** Claude Code
session started in `C:\Users\aliev\Projects\chrome-remote-extention`, launched so that it is **not a
bridge client**: `claude --strict-mcp-config --mcp-config <scratch>\no-mcp.json`, where the file holds
`{"mcpServers":{}}` (LESSON "the driver is not a bridge client" below). The Step 8 kickoff this file
replaces stays in git history (`git log --format=%h -2 -- docs/plans/next-session-prompt.md`, the
second hash).

---

Dear Claude, you are the SESSION AGENT for **Step 9 — Phase E: safety** of the chrome-agent-bridge repo
(a localhost daemon plus a Chrome MV3 extension, with an MCP server and a TypeScript SDK as its clients,
that let an agent or a script drive the user's real, logged-in Chrome profile). Step 9 gives the human
three controls inside Chrome — a kill switch, a JavaScript switch and a list of blocked sites — enforced
by the extension itself, so they hold whatever a client, the daemon or a leaked token does. This prompt
is self-contained; its reading list is in §3.

## 1. Opening

**Binding documents.**
- Phase doc (the plan; its checkboxes are the work items; "Exit checks (pre-registered)", "Human gates"
  and "STOP rules and forbidden fixes" are the pre-registered rules):
  `docs/plans/2026-10-24-step9-phase-e-safety.md`. Its "Decisions" 0.2–0.5 marked **(user)** were
  decided with the user (decisions.md · 2026-10-24 · Phase E's design: the kill switch, the disarmed
  state, blocked sites, the JavaScript switch (#128)); the rest are proposals Stage 0 audits.
- Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §5 (layer contract),
  §6 (the human), §10 (protocol v2 and codes) bind wherever Step 9 touches them. A new code amends §10
  first (`shared/src/codes.ts`' header: "Add a code only by amending the spec first").
- What Step 8 built: `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md` — every
  "Contracts (binding forward)", the gate checklist and the *Ruled 2026-10-24* note. **Stage 0
  re-examines those contracts by execution.**
- Workflow: the `long-run` skill (`.claude/skills/long-run/SKILL.md`); briefs, ledgers, reports and role
  prompts from the `step-agent` skill (`SKILL.md`, `role-prompts.md`); bookkeeping with
  `session-closeout`; the next kickoff with `phase-kickoff`; writing rules in `docs/docs-writing-guide.md`.
- Decisions: §3 item 3. **None is open** — the user ruled all 25 Step 8 items on 2026-10-24 (#106–#127).

**Precedence:** pre-registered rules (the phase doc's exit checks, human gates, STOP rules) > the phase
doc > the skills. The user's standing rulings apply on top: live waves are Claude's end to end
(decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end (#33)); reloads by
`recipes/reload-extension.ps1` (decisions.md · 2026-10-23 · Later extension reloads use
`recipes/reload-extension.ps1` (#65)), an exit-2 reload may be re-run (decisions.md · 2026-10-23 · S6's
findings ruled: the user's answers, stage S6b for REP-1, re-registered rows (#99) (1)).

**Model.** Every agent at every level runs **Claude Opus 5.5, `claude-opus-5-5`**, as Step 8's did by
the user's ruling (decisions.md · 2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7
open decisions (#69): "I like higher quality product"; · 2026-10-23 · Step 8 agents run Opus 5.5 (#70)).
Record "Step 9 agents run Opus 5.5" as your first `docs/decisions.md` entry, `By: user`, citing #69.
Pass `model: "opus"` on every `Agent` call. Exception: headless E2E actor sessions (`claude -p`) in S4
may run Sonnet.

**AUTONOMOUS — I am away; do not block on me.** Decide and record per `long-run` §3. What waits for me is
the integrity floor (§6).
- **Live wave S4 is yours** (#33), including toggling the extension's safety state and pressing its
  toolbar button and shortcut by UI automation in a window you opened (G9-1). **You must restore the
  safety state** you found (armed, JavaScript on, the block list as read at the start) and record the
  read-back; a restore that fails is a stop — ask me.
- **Reload** by `recipes/reload-extension.ps1`; my keyboard only if it exits non-zero twice.
- **No Chrome restart** is planned; one would need a fresh grant.
- **Standing:** never push or tag; never commit `bridge.token`, `.env`, `dist/`, `exports/` or a
  screenshot; never use my own tabs or windows; any loosening of the token gate, the bind, a lease or
  lock rule, or the cursor rule is a contract change — stop.

**Goal.** The extension refuses page calls while the human has disarmed it (toolbar button, options
page, shortcut; badge `OFF`), refuses `evaluate` while JavaScript is off, refuses any call on a blocked
site or on its own pages; agents see the state in `browser_status` and the SDK and get two new codes
(`DISARMED`, `DOMAIN_BLOCKED`); nothing logs a pattern, URL or the token; the E2E wave proves it live and
leaves the state as it found it.

**Baseline state** (verified 2026-10-24 by W2; table in §3): `main` at the W2 close-out commit that adds
this file (`git log -1 --format=%h -- docs/plans/next-session-prompt.md`; its parent is `a1932a8`,
`docs(step8): W2 — the user rules the 25 open decisions (#106–#127)`). `npm test` → 1714 passed, 85
files; `npm run typecheck` exit 0; `npm run build` exit 0 with no tracked file changed; 23 tools; 23
codes. Port 9234 free. Re-check all of it at Stage 0 and date it.

## 2. Agent contract

Read `.claude/skills/long-run/SKILL.md` and hold to it: §1 context discipline (you read reports and write
markdown; you never write feature code, run the suite in your own context, run or kill the daemon, or
read diffs line by line), §2 agent tree, §3 decisions, §4 the stop list, §5 waiting, §6 revival, §7 end
of phase.

**Form: three-level.** One **step agent per stage** (Stage 0, S0, S1, S2, S3, S4, S5 — §7); each spawns
its own builder, an independent verifier and at most two fixer rounds. Level-2 agents never spawn
agents; a step agent reads and decides, it does not build or commit itself. Steps dir:
`docs/plans/2026-10-24-step9-phase-e-safety-steps/` — create it first with an append-only `journal.md`
and `briefs/common.md` (model: Step 8's `…step8-sdk-surface-and-mcp-cursor-steps/briefs/common.md`).
As-built register: `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` (created at the first stage
close).

**Parallelism** (host tests bind port 0, never 9234). **At most two step agents at once; the live part
runs alone.** Stage 0, then S0, alone. **S1 ∥ S3** after S0 (`extension/src/safety.ts` vs
`daemon/ sdk/ mcp/`: file-disjoint). S2 after S1. S4 after S2 and S3, alone, with no uncommitted code in
the main tree. S5 last. Only the real daemon ever owns 9234, and only S4 starts it.

**STEP BRIEF TEMPLATE** (paste for every step agent; fill the angle brackets):

```
You are the STEP AGENT for stage <STAGE> ("<plain stage name>") of Step 9 (Phase E: safety — the
human's kill switch, a JavaScript switch, blocked sites) of the chrome-agent-bridge repo
(C:\Users\aliev\Projects\chrome-remote-extention; Git Bash shell; checks: `npm run typecheck`,
`npm test`, `npm run build`). Read CLAUDE.md first — its "Runtime gotchas" are measured facts and
bind. Then read docs/plans/2026-10-24-step9-phase-e-safety-steps/briefs/common.md in full: it is part
of this brief.
Model: claude-opus-5-5 (Opus 5.5); every agent you spawn: model "opus" (S4 only: headless E2E actor
sessions may run Sonnet).
GOAL: <one paragraph>.   INPUTS: <the phase-doc stage text verbatim with every dated note; the
kickoff's §7 row for this stage verbatim; the phase-doc "Decisions" 0.1–0.7 that bind it; the design
spec sections that bind (§5, §6, §10 where touched); the Step 8 as-built contracts it touches; the
Step 9 as-built register so far; prior step reports; PIDs of anything running (normally nothing)>.
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
LEDGER: keep docs/plans/2026-10-24-step9-phase-e-safety-steps/<STAGE>.ledger.md current after every
substep; resume from it if respawned; on a pause let running level-2 agents finish, write the ledger,
start nothing new, return.
AUTHORITY: decide mechanical and stage-local design questions; put each in your report under
"Proposed decisions" in the decisions.md format. Never edit decisions.md, the as-built register or
CLAUDE.md yourself.
ESCALATE (stop that line of work, report, return): <the ESCALATION list, verbatim>.
OUTPUT: docs/plans/2026-10-24-step9-phase-e-safety-steps/<STAGE>.md per the report schema (Verdict,
Outputs, Verifier verdict, Deviations, Proposed decisions, Findings, Handoff; test count before →
after).
Commit your stage's work via a builder: exact file list (never dist/, bridge.token, .env, exports/ or a
screenshot; never `git add -A`), message "<type>(<scope>): <stage> — <what> (verifier: PASS|
PASS-with-notes)" with a body that says why, plus the session's Co-Authored-By / Claude-Session
trailers; on git index.lock wait and retry; a classifier denial is reported, never retried or worked
around. Never push.
Return a ≤ 15-line summary + the report path.
<SPEC-DISCREPANCY PROTOCOL — §5, verbatim>  <INTEGRITY FLOOR — §6, verbatim>  <LESSONS — below, verbatim>
```

**ESCALATION list** (the `step-agent` default, extended). A step agent escalates instead of deciding on:
- anything touching a pre-registered rule or a decision of the phase doc marked **(user)**;
- an effect outside its lane — another package, a later stage, the wire protocol, the manifest's
  permissions beyond `action` and `commands`;
- any change to what is gated: a method exempted from or added to a class, a code chosen for a refusal,
  what `listTabs` or an event reveals, what the network log records while disarmed or for a blocked
  host;
- any path by which a client, the daemon or a page could change the safety state, or reach the
  extension's own pages;
- the wire shape of the safety state (0.6), codes, event names or params, the SDK's exported surface,
  MCP tool names or schemas;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` null-or-undefined,
  `{__bridgeError}` returned not thrown, the IIFE content script, `toSerializableArgs`, no top-level
  `await` in the worker, listeners at the top level of `sw.ts`, `ws` external, the `hasLayout` gate,
  never logging URLs, titles, header values, bodies or the token);
- any integrity-floor item (§6) or `long-run` §4 stop — a reload exit other than 0 after one re-run, a
  Chrome restart, the token, the bind, a safety-state restore that fails;
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger met;
- a port-9234 holder that is not the daemon, or an orphan `node` process it did not start;
- a test count that drops without a documented move or removal;
- a permission or classifier denial; 2 failed fix rounds; a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` gotchas are the standing list — these are the ones
Step 9 touches):
- **node may be missing from the Bash tool's PATH.** Put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1, npm 11.6.2,
  checked 2026-10-24). Python is miniconda, `$HOME\miniconda3\python.exe`, for the fixtures.
- **Listeners at the top level of `sw.ts`.** `action.onClicked`, `commands.onCommand` and
  `storage.onChanged` must be registered synchronously at the top level, like the `webRequest` and
  `chrome.tabs` listeners, or a click that wakes the worker is lost. No top-level `await`.
- **`storage.session` is emptied by a reload; `storage.local` is not.** The safety state lives in
  `storage.local` so a reload or a Chrome restart never re-arms what the human disarmed.
- **The reload's hello comes up to 2 s later** (the session marker waits for `onStartup`); the reload
  script still proves the reload (decisions.md · 2026-10-23 · S2b's details: the `selectTab` refusal
  grep, the marker's edge cases, the handle mark (#94)).
- **The driver is not a bridge client**: launched with `--strict-mcp-config` and an empty config; check
  with a process listing that no `mcp/dist/index.js` descends from it.
- **Headless Claude sessions are the MCP actors** (`claude -p --model sonnet --allowedTools
  mcp__chrome-agent-bridge "<prompt>"`), read verbatim from the transcript, never from a paraphrase.
  On Windows, send long prompts with `node --import tsx …`, not `npx` (`cmd.exe` refuses > 8191 chars).
- **An `ok` is not evidence**: trusted CDP input into a background tab answers `ok` and does nothing
  (BG-1/BG-2, FE-1…3). Every SAFE row reads the page's own reporter or the refusal's code.
- **UI automation of Chrome** (`recipes/reload-extension.ps1` is the model): never match by name alone
  (the toolbar's Reload and the card's reload share it); UIA `TabItem` is not a tab count; `chrome.exe
  --new-window chrome://…` opens a New Tab page — type the URL into the omnibox of your own window. A
  toolbar extension button may be inside the extensions menu until pinned (G9-2).
- **Windows PowerShell 5.1 traps**: `—` mangled unless UTF-8 is set; the alias `R`; embedded `"`
  stripped from native arguments (send JSON from Git Bash); `>` writes UTF-16LE in a `-NoProfile` shell.
- **Recipes run with `tsx`**, and `String(fn)` page code breaks under tsx (`__name`): ship page code as
  literal strings; recipes typecheck with their own `tsconfig*.json`.
- **Kill only identified PIDs** (`Test-SafeToKill`, `docs/e2e-test-plan.md` §1 item 8).
- **`*.log` is gitignored**: attach logs as `.txt`; grep them for `://`, the token and the block-list
  patterns by count, never printing them.
- **A subagent's report is a claim**: verify by diff before accepting; re-run each "finding".
- **The repo is public**: evidence shows only fixture pages — never my tabs, a real site, a pattern I
  typed into my real block list, or a student's data.

## 3. Reading order

1. `docs/plans/2026-10-24-step9-phase-e-safety.md` — all of it.
2. `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §5, §6, §10 with their dated notes.
3. `docs/decisions.md` — by date + title:
   - 2026-10-24 · Phase E's design: the kill switch, the disarmed state, blocked sites, the JavaScript
     switch (#128); · The roadmap after Step 8 (#129)
   - 2026-10-24 · Bulk data through `browser_evaluate` was a test device only; the MCP gets a `saveTo`
     path (#127) — Step 10's, but S5's setup text must not contradict it
   - 2026-10-24 · Failure reports stay on by default (#120) — the attach set stays as it is, without the
     two new codes
   - 2026-10-22 · Content-script failures are returned, not thrown, to carry `CODE:message` (#38);
     2026-10-23 · S2b makes `code` required on error frames (#73)
   - 2026-10-22 · The daemon's method classes are one table, and the download methods are free (#39) —
     the extension's safety table is the same idea on the other side
   - 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window (#43)
   - 2026-10-22 · Live E2E waves are run by Claude end to end (#33); 2026-10-23 · The driver may reload
     the extension by UI automation, and restart Chrome with flags for the background-input test (#64);
     · Later extension reloads use `recipes/reload-extension.ps1` (#65)
4. `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md` — contracts, the Ruled note.
5. `CLAUDE.md` — "Runtime gotchas" and "Testing philosophy" bind; "Key files" is the map.
6. `docs/setup.md` (§ Security notes, § Running JavaScript; S5 adds "Safety") and
   `docs/e2e-test-plan.md` §1 items 8–9 (wave helpers, the reload script), §4.17–§4.19 and §5 Runs 11–12
   (the model for S4's rows and record).
7. `.claude/skills/step-agent/role-prompts.md`.

**Environment facts** (verified 2026-10-24 by W2 unless stated):

| Fact | Value | Source |
|---|---|---|
| OS | Windows 11 Pro 10.0.26300 | session environment |
| Shell for agents | Git Bash; Windows PowerShell 5.1 also present | session environment |
| Node / npm | v25.2.1 / 11.6.2 | `node -v`, `npm -v` |
| Chrome (real profile) | 156.x, Developer mode on, no flags (Run 12, 2026-10-23) | S6-run-record.md |
| Baseline commit | the W2 close-out commit adding this file, parent `a1932a8` | `git log` |
| `npm test` | 1714 passed, 85 files | 2026-10-24 |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0, no tracked file changed | 2026-10-24 |
| Daemon build on disk | `597d6c28…` (the Run 12 build) | `sha256sum daemon/dist/index.js` |
| Extension id | `cpnemjbgecfbeicldpaaegbhjgjgjfep` | `docs/e2e-test-plan.md` §1 item 9 |
| Manifest | no `action`, no `commands`; `options_page: options.html` (port + token only) | `extension/manifest.json` |
| Router methods | 23 (`router.on(` in `extension/src/sw.ts`) | `grep` |
| Tools / codes | 23 / 23 (22 wire + `NO_CURSOR`) | `registry.ts`, `codes.ts` |
| Token | `bridge.token` at the repo root (gitignored) | #32 |
| Port 9234 | free | `netstat -ano`, 2026-10-24 |

## 4. Stage 0 — spec audit (one agent, before any code)

One step agent; its builder is the auditor, its verifier re-executes five findings. No feature code.

**(a) Code-cite compliance** — executed or confirmed live, not just read: every router method in
`sw.ts` (23) and how `router.ts` dispatches (where a gate can sit before every handler, including
errors thrown before the handler); `chrome.action.onClicked` with no popup, `setBadgeText`/
`setBadgeBackgroundColor`/`setTitle`; `chrome.commands` (manifest `suggested_key`, whether `Alt+Shift+K`
is free in Chrome 156, `onCommand` waking the worker); `storage.local`/`onChanged` in an MV3 worker;
`chrome.debugger.getTargets` / detaching every session the extension holds (`debugger.ts`'s
`withDebugger` bookkeeping); whether `chrome.scripting` or `chrome.debugger` can reach
`chrome-extension://<own id>/…` pages at all (if neither can, the own-page block is still required for
`navigate`/`newTab` and trusted input — confirm); the download handler's redirect handling (where the
final URL is known); `network-state.ts`'s ingest path (where a filter can drop an event before it is
stored); the daemon's relay of `extensionStatus` (the model for 0.6).

**Re-examine Step 8's contracts by execution** (as-built "Contracts (binding forward)"), on port 0 with
a fake proto:2 extension: the attach set (7 codes); `code` required with `INTERNAL` on receipt; the
session marker's branches; handle numbers never reused; the cursor rule; `TAB_HELD`; the visibility
lock. A contract that does not hold is a CRITICAL finding.

**(b) Internal consistency** — recompute: 23 router methods, 23 → 25 codes (24 on the wire), 23 tools,
1714 tests / 85 files; every count in the phase doc.

**(c) Blind spots — seed list; extend it:**
- **Self-re-arming.** An agent opening the options page, `chrome://extensions` (the card's toggle,
  "Remove"), or `chrome://extensions/shortcuts`, and acting there. `chrome://` pages refuse the
  debugger (restricted URLs) — confirm; the extension's own pages need the 0.4 block.
- **The human's tab claimed while blocked** (`tabs.claim {active:true}` on a blocked site): refuse the
  claim, or claim and refuse every call? Rule it (conservative).
- **In-flight work at disarm**: a `waitFor` poll, a running `evaluate` (CDP does not stop page work
  already started — `CLAUDE.md`), a download being chunked, a failure report's capture under the lock.
- **The visibility lock and disarm**: a call queued on the lock when disarm lands must be refused, not
  run after.
- **Redirects and frames**: a navigation that redirects onto a blocked host; a blocked host in a
  cross-origin iframe (not walked by the snapshot, but visible in a screenshot — state it).
- **The network log** of an allowed page that requests a blocked host; entries recorded before disarm.
- **Matcher edge cases**: `bank.com` vs `notbank.com`, ports, IDN/punycode, IP literals, `localhost`,
  trailing dots, case, empty/invalid lines, whitespace.
- **Worker restart mid-disarm**: the state comes from `storage.local` on the next call; no window in
  which a call slips through before it is read.
- **What the human sees**: the badge in every state; the button's title; the options page's text.
- **Log hygiene**: no new line carries a pattern, URL, title or the token.
- **The token**: unchanged; nothing in Step 9 prints it.

**(d) Testability** — every exit check S0.1–S5.1 executable and discriminating, pass rules written
before any measurement; SAFE rows with expected text before the run; flag any check that cannot fail.

**Output:** `…-steps/stage0-audit.md`, findings ranked CRITICAL / MAJOR / MINOR / NIT, tagged plan-side
(amend the phase doc in place with a dated note) or code-side (a stage item). All resolved before S0;
then the stage split with estimates in `journal.md`. The proposals of the phase doc's Decisions not
marked **(user)** are recorded by you in `docs/decisions.md` before Stage 0 is spawned, so the audit can
attack them; a wrong premise is a finding and you amend the decision with a dated note.

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
sees, the token lookup, the bind, the SDK's public surface, MCP tool names and schemas) →
long-run §3: a pre-stated rule applies mechanically, else the conservative choice (security at
least as strict; every existing tool and test behaves identically while armed with JavaScript on
and an empty block list; undoable), recorded under Open decisions for the user. Code and spec
never diverge silently: whoever changes behaviour amends the governing doc in place with
"*Superseded YYYY-MM-DD: was X, because Y.*". Verifiers report findings with the command and its
output; they never rewrite the spec or the plan.
```

## 6. Decisions and integrity floor

Decisions follow `long-run` §3: build decisions (module layout, test placement, badge colours, the
options page's layout and wording, defaults the plan left open) you take and record `By: Claude`;
contract decisions (codes, the wire shape of the safety state, what each class gates, what a refusal
or `listTabs` reveals, the pattern grammar, the network log's behaviour while disarmed) apply a
pre-stated rule or the conservative rule and are listed under **Open decisions** in `docs/decisions.md`
and in the as-built register for me at the gate. Only you write `docs/decisions.md`.

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP rule
that says escalate; a human gate (G9-1 the S4 wave is the driver's, with the safety state restored
and read back; G9-2 pinning the button: the driver may pin it by UI automation, else ask once);
an extension reload whose script (recipes/reload-extension.ps1) exits non-zero after one re-run;
a Chrome restart (needs a fresh grant); anything destructive or outward-facing (push, tag,
publish, history rewrite, deleting outside the repo, touching the user's Chrome profile data or
the user's own tabs and windows, committing or logging the token); any loosening of the security
boundary (the 127.0.0.1 bind, the token gate, "never log URLs, titles, header values or bodies");
permission or classifier denials. (2) Phase-specific: a router method reachable without the safety
gate; any way for a client, the daemon or a page to change the safety state or reach the
extension's own pages; a safety state left different from the one found before S4; a block-list
pattern, URL, title or the token in any log or committed evidence; a drop in the test count
without a documented move or removal; evidence showing a real site or the user's own tabs;
killing a process that Test-SafeToKill did not call safe. Standing rule: never resolve a decision
in the direction that flatters a result already seen; pass rules are written before the
measurement; a failed check is reported, never re-tuned.
```

## 7. Stages

Each stage's deliverables are the phase doc's checkbox lines, pasted verbatim into the brief with their
dated notes. Exit checks are the phase doc's pre-registered IDs (Stage 0 may only make them stricter).
Budgets are estimates; the step report records the actual beside each. One commit per stage close.

| Stage | Deliverables | Exit checks | Budget | Parallel | Verifier focus (beyond the phase doc's) |
|---|---|---|---|---|---|
| **0 — Spec audit** | §4 | findings file with evidence; Step 8 contracts executed; proposals attacked; split in `journal.md` | 1.5 h | first, alone | re-execute 5 findings; the contract runs are real (port 0) |
| **S0 — Types and codes** | phase doc S0 | S0.1, S0.2 | 0.5 h | alone | spec §10 note precedes the code commit; bundles differ only by the codes and the guard (bounded diff, as Step 8's #86) |
| **S1 — Gate + matcher** | phase doc S1 | S1.1–S1.3 | 2 h | ∥ S3 | the method-table test fails on an unclassified mutation; the matcher cases written first |
| **S2 — Extension wiring + UI** | phase doc S2 | S2.1–S2.4 | 3 h | after S1 | no handler before the gate; top-level listeners; no top-level `await`; IIFE content bundle; own-page block |
| **S3 — Daemon, SDK, MCP** | phase doc S3 | S3.1–S3.3 | 2 h | ∥ S1 | cross-package verifier over real `ws` with a fake extension; the attach set unchanged |
| **S4 — E2E (live)** | phase doc S4 | S4.1–S4.4 | 1 h prep + 2 h live | alone | rows before the build; restore read-back; logs grepped by count |
| **S5 — Docs** | phase doc S5 | S5.1 | 1 h | last | every new gotcha sourced; nothing contradicts #127's bulk-data rule |

**S4, how the wave runs** (#33): (1) rows and expected text committed; (2) record the safety state as
found (armed? JavaScript? block list — **counted, not printed**, since it is my real list); (3) main-tree
`npm run build` of committed code, `recipes/reload-extension.ps1` (exit 0; one re-run on exit 2), SAFE-0
first; (4) fixtures on 8080 and 8081, actors: SDK scripts and headless `claude -p` sessions; the toolbar
button and the shortcut pressed by UI automation in your own window; (5) restore and read back; (6)
results into `docs/e2e-test-plan.md` §5 as Run 13, with `S4-run-record.md` and the daemon log as
`.txt`; a fresh verifier re-reads the record against the pre-written text and greps for `://`, the token
and the test patterns by count. A failed row is recorded, never fixed in the wave.

Propagator after S5: compares the as-built register with the phase doc, the design spec, `CLAUDE.md`,
`docs/setup.md`, `docs/e2e-test-plan.md` and `README.md`; dated correction notes in place; a ledger. No
code.

## 8. Close-out contract

- The phase doc's **Outcome** as results and its **Status**.
- The **as-built register** per `.claude/skills/phase-kickoff/asbuilt.md`: contracts binding forward
  (the safety table and its classes, the two codes and what they reveal, the state's storage and
  defaults, the wire shape, the own-page block, the matcher's grammar); decisions; deviations;
  estimates vs actuals; open decisions; S4's as-built.
- The **gate checklist** (item → met? → evidence): S0.1–S5.1; STOP rules not fired; one commit per stage
  with no `dist/`, token, `exports/` or screenshot; the safety state restored.
- **Needs the user's keyboard**, plainly: the open decisions; a reload only if the script failed twice;
  G9-2 if pinning failed; `/mcp` in any interactive Claude session of mine that ran during the phase
  (its MCP bundle predates S3); any push.
- Then `session-closeout`, and `phase-kickoff` for **Step 10 — the Step 8 follow-ups** (decisions.md ·
  2026-10-24 · The roadmap after Step 8 (#129)), carrying: #106 the MCP's trusted tools focus first;
  #117 a warning when a locator resolves past the snapshot's 800 cap; #125 a squashed `step8` release
  tag (`main` untouched; a tag needs my grant); #126 a live row that retires N ≥ 1 handles on a killed
  Chrome (a Chrome kill needs my grant); #127 `browser_evaluate {saveTo}` with S6.3 redone through it
  and the chunked recipe retired; the ~1.5 s failure-report screen switch; `bb-login.ps1`'s
  condition-based post-submit wait (#102). Then Step 11 (D3 file upload) and Step 12 (Phase F: `args`
  for `browser_evaluate`, console capture, keep-attached debugger session).

## 9. STOP RULES

**Stops the gate** (the write-up continues): a pre-registered exit check fails after 2 fix rounds; a
router method reachable without the gate; any path by which a client, the daemon or a page changes the
safety state or reaches the extension's own pages; the safety state not restored after S4; a pattern,
URL, title or the token in a log or committed evidence; a `CLAUDE.md` runtime invariant that would have
to change; a port-9234 holder that is not the daemon, or an orphan `node` process; the test count drops
without a documented move or removal.

**Continues anyway, recorded:** a SAFE row that fails (the wave records it; the fix is a proposed
decision); the badge's exact look; build decisions on layout and wording; an audit finding resolved
plan-side with a dated note.

**Forbidden fixes:**
- exempting a method from the gate, or reclassifying it, to make a row or test pass;
- a wire, daemon, SDK or MCP method that arms, disarms, edits the block list or enables JavaScript;
- re-arming by default on a reload, an update or a Chrome restart after the human disarmed;
- matching blocked hosts by substring or by `endsWith` without a dot boundary;
- logging a pattern, URL or title to debug the matcher or the gate;
- leaving the safety state changed after the wave, or printing my real block list anywhere;
- and, from Steps 6–8, still binding: weakening a lease or lock invariant; adding
  `chrome.windows.update({focused: true})` outside `focusTab`; logging a URL, title, header value, body,
  locator text or the token; binding anything but `127.0.0.1` or widening the token rule; making
  `BridgeClient` reconnect on a close code other than 4002; letting the MCP crash when `connect()`
  fails; editing a test's expected text to match a changed error; editing a row's expected text after
  its run; regenerating `sdk/test/fixtures/baseline-51de800.json`; changing a locator rule to make
  something match.

**Final report** leads with "Decisions taken while you were away" (date + title), then the gate
measurements (test counts per stage with the command, the codes, SAFE rows with their observed text, the
restore read-back), then open decisions, then what needs my keyboard (§8).

I trust you — decide well and leave a trail we can audit.
