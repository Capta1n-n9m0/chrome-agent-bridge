# Step 9 — common brief parts (part of every brief)

Built 2026-10-24 by the session agent from the kickoff, frozen at `kickoff.md` in this directory
(a byte copy of `docs/plans/next-session-prompt.md` at commit 59be263, which a later phase-kickoff
overwrites). The blocks below are cut verbatim from it by line range. Where this file and the kickoff
disagree, the kickoff wins; where the kickoff and the phase doc's pre-registered rules disagree, the
pre-registered rules win.

## Fixed facts

- Repo: `C:\Users\aliev\Projects\chrome-remote-extention`, branch `main`, Git Bash shell. Baseline
  commit `59be263` (`docs: close Step 8 (W2); Phase E design; Step 9 kickoff`), parent `a1932a8`.
- Baseline (kickoff, 2026-10-24): `npm test` 1714 passed in 85 files; `npm run typecheck` exit 0;
  `npm run build` exit 0 with no tracked file changed; 23 router methods, 23 tools, 23 codes (22 on
  the wire + `NO_CURSOR`). Stage 0 re-checks and dates these. Port 9234 free at 2026-10-24 08:50Z.
- Model: every agent is Claude Opus 5.5 (`claude-opus-5-5`; `model: "opus"` on every Agent call) —
  decisions.md · 2026-10-24 · Step 9 agents run Opus 5.5 (#130). Only S4's headless E2E actor
  sessions (`claude -p`) may run Sonnet.
- Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every
  Bash call that runs node/npm/npx.
- Phase doc: `docs/plans/2026-10-24-step9-phase-e-safety.md` (all dated notes bind). Design of
  record: that doc's "Decisions", and `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §5, §6,
  §10 wherever Step 9 touches them. Step 8 as-built:
  `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md`. Step 9 as-built register:
  `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` (created at the first stage close).
- Kickoff proposals recorded before Stage 0 (decisions.md, 2026-10-24): #130 model; #131 the
  phase doc's proposals 0.1, 0.3 (listTabs redaction, network log while disarmed, attach set), 0.4
  (redaction and network filter for blocked hosts, own-page block), 0.6, 0.7, as proposed. Contract-level
  ones are under Open decisions for the user. Stage 0 attacks them.
- Steps dir: this directory. `journal.md` is the session agent's (append-only). Each stage writes
  `<STAGE>.ledger.md` and `<STAGE>.md` (report) here; sub-reports `<STAGE>-builder.md`,
  `<STAGE>-verifier.md`, `<STAGE>-fixer<n>.md` are fine.
- Only the session agent writes `docs/decisions.md`, the as-built register and `CLAUDE.md`.
- WAITING: you hold long waits yourself — run the job in the background, end your turn, get
  re-invoked by its completion; never a foreground sleep loop. A notice that a child is "waiting on
  its own background work" is NOT completion: end your turn and wait for its hand-back report. Your
  builders/verifiers/fixers finish in one go and never wait.
- Role prompts for builder / verifier / fixer: `.claude/skills/step-agent/role-prompts.md` (common
  preamble + role block + stage inputs). Report schema: `.claude/skills/step-agent/SKILL.md`.

## Agent contract and STEP BRIEF template (kickoff §2, verbatim)

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


## ESCALATION list (kickoff §2, verbatim)

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

## LESSONS (kickoff §2, verbatim)

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

## SPEC-DISCREPANCY PROTOCOL (kickoff §5, verbatim)

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

## Decisions and INTEGRITY FLOOR (kickoff §6, verbatim)

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

## Stages table and the S4 wave (kickoff §7, verbatim)

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

## STOP RULES and forbidden fixes (kickoff §9, verbatim)

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


## Running state (session agent updates this section at each dispatch)

- 2026-10-24 08:50Z: Stage 0 (spec audit) dispatched alone. Nothing running; port 9234 free.
