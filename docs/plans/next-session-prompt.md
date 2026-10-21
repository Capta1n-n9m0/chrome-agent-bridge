# Step 6 kickoff — the daemon, protocol v2, and the `daemon/ sdk/ mcp/` split

Written 2026-10-21 by wave W0 (`docs/plans/handoffs.md`) with the `phase-kickoff` skill, phase
kind. Paste everything below the line into a **fresh** Claude Code session started in
`C:\Users\aliev\Projects\chrome-remote-extention`. The session must **not** need the
`chrome-agent-bridge` MCP: stage D1 moves the MCP entry point, which kills that connection.

---

Dear Claude, you are the SESSION AGENT for **Step 6 — the daemon, protocol v2, and the
`daemon/ sdk/ mcp/` split** of the chrome-agent-bridge repo (an MCP server plus a Chrome MV3
extension that let an agent drive the user's real, logged-in Chrome profile). This prompt is
self-contained; its reading list is in §3.

## 1. Opening

**Binding documents.**
- Phase doc (the plan; its checkbox lines are the work items):
  `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`.
- Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, §4 (topology),
  §5 (layer contract), §9 (daemon lifecycle), §10 (protocol v2), §11 (repository layout).
- Workflow: the `long-run` skill (`.claude/skills/long-run/SKILL.md`); briefs and reports from the
  `step-agent` skill (`.claude/skills/step-agent/SKILL.md`, `role-prompts.md`); bookkeeping with
  `session-closeout`; writing rules in `docs/docs-writing-guide.md`.
- Decisions that bind, cited by date + title in `docs/decisions.md`: see §3 item 3.

**Precedence when documents disagree:** pre-registered rules (the phase doc's "Exit checks",
"Human gates", "STOP rules and forbidden fixes") > the phase doc > the skills. A spec-vs-plan-vs-code
conflict goes through the SPEC-DISCREPANCY PROTOCOL in §5.

**Model.** Every agent at every level — you, each step agent, every builder, verifier, fixer and the
propagator — runs **Claude Opus 5.5, model id `claude-opus-5-5`** (decisions.md · 2026-10-21 · Step 6
agents run Opus 5.5). State it in every brief; pass `model: "opus"` on every `Agent` call.

**AUTONOMOUS — I am away; do not block on me.** Decide and record per `long-run` §3. The only
things that wait for me (the integrity floor, §6) are the `long-run` §4 list plus this phase's human
gates:
- **G6-1 (before D1)** is **granted** on two stated conditions, both met by this kickoff: (1) this
  session does not use the `chrome-agent-bridge` MCP — if it is configured and connects, do not call
  its tools; and (2) the MCP config path changes from `server/dist/index.js` to `mcp/dist/index.js`,
  which I update myself after the phase, before the next session connects (the final report lists
  it first under "needs the user's keyboard"). D1 may proceed.
- **G6-2:** stage D6 (the live MUX-1…9 and DL-1…2 rows) is a wave run with me. The autonomous run
  writes the rows and `recipes/hello.ts`, then **stops at G6-2** with the decision package.
- **G6-3:** any question about the token lookup or the bind stops the run (`long-run` §4.4).
- Standing: the extension is **not modified** in this step, so no extension reload exists; never
  push; never commit `bridge.token`, `.env` or `dist/`.

**Goal.** Turn the MCP-owned WebSocket host into a persistent, shared daemon on `127.0.0.1:9234`
that any number of clients connect to, started by whoever knocks first and gone after 10 min with
zero clients; give scripts a first SDK (`connect()` + raw `call()`); make the MCP server the first
SDK client. At the end everything behaves as today for Claude, through the daemon; a second Claude
session connects alongside the first; a script runs `await b.call("snapshot")` while Claude is
connected. Tab leases and handles are Step 7; the typed `Tab` API is Step 8.

**Baseline state** (measured 2026-10-21 by wave W0, see §3 for the full table): the commit that
added this file (`git log -1 --format=%h -- docs/plans/next-session-prompt.md`), whose parent
`e60a83a` differs only in docs. On `e60a83a`: `npm test` → 301 passed (22 files); `npm run typecheck`
exit 0; `npm run build` exit 0; port 9234 free; 21 tools (`grep -c "server.tool(" server/src/tools/registry.ts`).
Whether the loaded extension matches `extension/dist/` was not verified in W0 and does not matter
for Step 6: the extension is untouched and keeps speaking v1.

## 2. Agent contract

Read `.claude/skills/long-run/SKILL.md` and hold to it: §1 context discipline (you read reports and
write markdown; you never write feature code, run the suite in your own context, or read diffs line
by line), §2 agent tree, §3 decisions, §4 the exhaustive stop list, §5 waiting, §6 revival, §7 end
of phase.

**Form: three-level.** You spawn one **step agent per stage** D0–D7; each step agent spawns its own
builder, independent verifier and (at most two rounds of) fixer. Level-2 agents never spawn agents.
Stage D6 is split off as a wave with me (G6-2). Steps dir:
`docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/` — create it first, with an append-only
`journal.md`; ledgers, briefs, reports and evidence go there.

**Parallelism** (from the phase doc's "Order of work" and lanes; host tests bind port 0, so 9234 is
only ever owned by a real daemon, which the autonomous run never starts):
- D0 ∥ D1 (file-disjoint: `shared/` vs the move). Nothing else runs while D1 moves files.
- D2 ∥ D4 after both D0 and D1 have closed (`daemon/` vs `sdk/`, file-disjoint, no shared socket).
- D3 after D2, in the `daemon/` lane; it may overlap D4.
- D5 after D2, D3 and D4. D7's non-E2E part after D5. Then stop at G6-2.

**STEP BRIEF TEMPLATE** (paste for every step agent; fill the angle brackets from the phase doc):

```
You are the STEP AGENT for stage <STAGE> ("<plain stage name>") of Step 6 (the daemon, protocol v2,
and the daemon/sdk/mcp split) of the chrome-agent-bridge repo
(C:\Users\aliev\Projects\chrome-remote-extention; Git Bash shell; checks: `npm run typecheck`,
`npm test`, `npm run build`). Read CLAUDE.md first — its "Runtime gotchas" are measured facts and
bind.
Model: claude-opus-5-5 (Opus 5.5); every agent you spawn: model "opus".
GOAL: <one paragraph>.   INPUTS: <the phase-doc stage text verbatim: its checkboxes, Lane, Parallel
with, Verifier focus, Needs the user's keyboard; the phase-doc "Decisions" 0.1–0.10 that bind this
stage; the design-spec sections that bind; the as-built register so far
(docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md); prior step reports; PIDs of
anything running (normally nothing)>.
EXIT CRITERIA: <the phase doc's pre-registered exit checks for this stage, by ID, verbatim; pass
rules are written down before anything is measured>.
LANE: <the stage's Lane from the phase doc>. D1 alone has a repo-wide grant and must change no
behaviour (moves and manifests only). Anything outside the lane escalates.
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
LEDGER: keep docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/<STAGE>.ledger.md current
after every substep. If respawned, resume from it.
AUTHORITY: decide mechanical and stage-local design questions. Put each one in your report
under "Proposed decisions" in the decisions.md format (below). Never edit decisions.md,
the as-built register or CLAUDE.md yourself.
ESCALATE (stop that line of work, report, return): <the ESCALATION list below, verbatim>.
OUTPUT: docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/<STAGE>.md per the report schema
(step-agent skill: Verdict, Outputs, Verifier verdict, Deviations, Proposed decisions, Findings,
Handoff; test count before → after).
Commit your stage's code/docs via a builder: exact file list (never dist/, never
bridge.token or .env, never `git add -A`), message
"<type>(<scope>): <stage> — <what> (verifier: PASS|PASS-with-notes)" with a body that says
why, plus the session's Co-Authored-By / Claude-Session trailers; on git index.lock, wait
and retry. Never push.
Return a ≤ 15-line summary + the report path.
<SPEC-DISCREPANCY PROTOCOL — §5 of the kickoff, verbatim>  <INTEGRITY FLOOR — §6, verbatim>
<LESSONS — the block below, verbatim>
```

**ESCALATION list** (the `step-agent` default, extended for this phase). A step agent escalates
instead of deciding on:
- anything touching a pre-registered rule (an exit check, a human gate, a STOP rule) or a fact of the
  design of record (§9, §10, §11 of the spec; phase-doc decisions 0.1–0.10);
- an effect outside its lane — another package (`shared/`, `daemon/`, `sdk/`, `mcp/`, `extension/`), a
  later stage, a shared script, the wire protocol — except the grants written into the stage's Lane
  (D1: the whole repository, moves and manifests only; D5: deleting `daemon/src/startup.ts` and its
  test if D3 left them);
- **any non-empty `git diff -- extension/`** at any point of this step (the extension is not
  modified; a STOP rule);
- any integrity-floor item (§6) or anything on the `long-run` §4 stop list — in particular the gates
  G6-1…G6-3 above: the token lookup (phase-doc 0.9), the spawned daemon's environment (0.8), the
  `127.0.0.1` bind;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` treating null OR
  undefined as failure, the content script as an IIFE, no top-level `await` in the service worker,
  `webRequest` listeners at the top level, `ws` external to the server bundle, never logging URLs,
  header values, bodies or the token);
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger being
  met (decisions.md entries of 2026-10-21);
- an unexplained port-9234 holder or an orphan `node` process it did not start (W0 saw exactly one
  `node.exe`, Claude Code's own; the daemon is never started by the autonomous run);
- a test count that drops without a documented move (D1 must keep 301);
- anything that needs the real Chrome profile (extension reload, live E2E) — none is granted; D6 is
  the user's wave;
- a permission or classifier denial;
- 2 failed fix rounds;
- a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` runtime gotchas are the standing list — these
are the ones that touch lifecycle, ports and paths, plus three from wave W0):
- **The server must exit with its session** (`server/src/lifecycle.ts`, verified on Windows
  2026-10-21 including force-killing the nvm shim alone; not verified on Linux). On Windows a dead
  parent stays as `ppid`, so the check is `kill(pid, 0)`; on POSIX the process is re-parented. D5 moves
  this file **unchanged** apart from the shutdown call (exit check D5.4). The daemon gets none of it.
- **The server must not crash on a busy WS port** (`startup.ts` never throws; retry every 5 s). In
  the daemon the rule inverts: the bind is the lock, `EADDRINUSE` → log and exit 0, no retry (spec
  §9.3; exit checks D3.5, D3.4). The MCP keeps the no-crash shape for its SDK `connect()` (D5).
- **The 30 s ping / missed-pong termination** stays for both roles (D2 verifier focus); tests use
  `heartbeatMs: 30` and a `ws` client with `autoPong: false`.
- **`ws` is `external` in the server esbuild bundle** — it resolves from `node_modules` at runtime;
  the daemon and the SDK bundles keep that.
- **The nvm-windows shim sits between Claude Code and node:** `process.ppid` names the shim. That is
  why the actor name uses the MCP's own `process.pid` (decisions.md · 2026-10-21 · The actor name
  carries the MCP's own process id) and why the spawn uses `process.execPath` (phase-doc 0.8).
- **node is not on the Bash tool's PATH in this environment** (W0, 2026-10-21: `node: command not
  found` in both Bash and PowerShell tools). Put the shim directory first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1,
  npm 11.6.2). Every builder and verifier brief carries this line.
- **A subagent's report is a claim: verify by diff before accepting.** W0 re-counted the plan
  rewrite's checkbox lines against `HEAD` and re-ran every "finding" against the files it cited
  before putting it to the user; one count was wrong (`actions.ts ×5` → 4).
- **The building session's own MCP connection dies at D1; do not run Step 6 from a session that
  needs the bridge.** The MCP entry moves from `server/dist/index.js` to `mcp/dist/index.js`.
- **Editing extension code requires a manual reload** — not relevant here because the extension is
  untouched, but an `unknown method` error during D6 means the loaded extension is stale for some
  other reason; report it, do not "fix" it in the daemon.

## 3. Reading order

1. `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §4, §5, §9, §10, §11 bind; §12 (risks)
   and §13 (open questions) for context.
2. `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md` — all of it; the dated notes marked
   *Superseded 2026-10-21* / *Amended 2026-10-21* / *Added 2026-10-21* are W0's rulings and bind.
3. `docs/decisions.md` — the entries that bind this phase, by date + title:
   - 2026-10-21 · Steps 6–8 run under the long-run contract
   - 2026-10-21 · The actor name carries the MCP's own process id
   - 2026-10-21 · connection.ts changes in Step 6, per decision 0.4
   - 2026-10-21 · Stage D2 emits the extensionStatus event
   - 2026-10-21 · Step 6 writes the DL rows for browser_download before its D6 wave
   - 2026-10-21 · One daemon handover per connect(), then a VERSION error
   - 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon restart (Step 7/8
     scope; Step 6's `BridgeClient` has no cursor yet — only the 4002 reconnect it builds must leave
     room for it)
   - 2026-10-21 · Step 6 agents run Opus 5.5
   - (recorded for Steps 7–8, not this phase: selectTab alias; the popup button; SDK-4's {text}
     locator; the `activeTab()` count; the Phase F wording)
4. Earlier as-built registers: **none exist** — Steps 1–5 predate the method. Stage 0 instead
   re-examines by execution the `CLAUDE.md` gotchas Step 6 builds on (§4).
5. `CLAUDE.md` — "Runtime gotchas" and "Testing philosophy" bind; "Key files" is the map of
   `server/` before the split.
6. `docs/setup.md` (lines 18, 36, 46, 262 name `server/dist/index.js`; D1 and D5/D7 change them) and
   `docs/e2e-test-plan.md` (§4 row families; §5 run records; D6 adds § MUX and § DL rows).
7. `.claude/skills/step-agent/role-prompts.md` — the builder / verifier / fixer / propagator prompts.
8. `docs/plans/2026-10-21-step7-multi-actor-tabs.md` only for what Step 7 expects from Step 6's
   as-built (its "Prerequisite" paragraph: welcome shape, `extensionStatus`, close code 4002, the
   error envelope).

**Environment facts** (checked 2026-10-21 by W0 unless stated):

| Fact | Value | Source |
|---|---|---|
| OS | Windows 11 Pro 10.0.26300 | session environment |
| Shell for agents | Git Bash (`bash.exe`); PowerShell 5.1 also present | session environment |
| Node / npm | v25.2.1 / 11.6.2, via the nvm-windows shim dir (see LESSONS for PATH) | `node -v`, `npm -v` |
| Chrome (real profile) | 156.0.8078.48 (Official Build) (64-bit) | user, `chrome://version`, 2026-10-21 |
| Port 9234 | free (no listener) | `netstat -ano`, 2026-10-21 19:07 UTC |
| Stray node processes | one `node.exe` (Claude Code's own) | `tasklist` |
| Baseline commit | the commit adding this file; parent `e60a83a` (docs only between them) | `git log` |
| `npm test` | 301 passed, 22 files, 13.9 s | on `e60a83a` |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 (`built server → dist/index.js`, `built extension → dist/`) | on `e60a83a` |
| Tools | 21 | `grep -c "server.tool(" server/src/tools/registry.ts` |
| Host tests' port | `port: 0` (ephemeral) | `server/test/wsHost.test.ts:35` |
| Loaded extension vs `dist/` | not verified in W0; irrelevant (extension untouched) | — |
| `chrome-agent-bridge` MCP | must not be used by this session (G6-1) | this kickoff |

## 4. Stage 0 — spec audit (one agent, before any code)

Spawn one step agent for Stage 0 with the brief template; its builder is the auditor, its verifier
spot-checks the audit's own claims. No code is written. Four lenses:

**(a) Code-cite compliance.** Every `file:line`, function, message type, test name and Chrome / CDP /
MCP-SDK / `ws` API the phase doc and spec §9–§11 cite exists and behaves as stated — **executed or
confirmed live**, not just read. Includes: `NOT_CONNECTED_MESSAGE` in `server/src/bridge.ts`;
`SERVER_TIMEOUT_SLACK_MS = 5_000` in `server/src/tools/registry.ts`; `ExtensionConnection` in
`server/src/connection.ts` and its per-call `timeoutMs`; the `heartbeatMs` / `autoPong: false` test
pattern in `server/test/wsHost.test.ts`; the `_registeredTools[name].handler` quirk of
`@modelcontextprotocol/sdk` (read the installed version's source); `lifecycle.ts`'s parent check;
`startup.ts`'s retry; the esbuild `external: ["ws"]`; the offscreen `ReconnectingClient` backoff the
spec §9.5 cites; whether `git mv` across a workspace keeps `git log --follow` history (try it on a
scratch branch and discard).

**(b) Internal consistency.** Recompute from the real repo: tool count (21), test count (301), test
files per package, the message kinds in `shared/src/protocol.ts`, the timeouts (30 s default, the
+5 000 slack, 600 000 upper bound), the 4001 close code and its text, the port and handshake facts,
the four `setup.md` lines naming `server/dist`. Recompute every count the phase doc states.

**(c) Blind spots — what the plan never states.** Seed list; **extend it**:
- Windows vs POSIX lifecycle (`kill(pid, 0)` vs re-parenting); the daemon on POSIX is unverified.
- Port-9234 contention and orphans: a pre-Step-6 `server/dist/index.js` still running from an old
  session holds 9234 and speaks v1 to the extension; what does a Step 6 client see when it knocks?
- The manual extension reload: none in this step, but the extension's `ReconnectingClient` will
  reconnect to a *new* daemon after handover — does the v1 hello path (no `role`) land in the
  registry or as the extension?
- MV3 worker culling: the offscreen document holds the socket; nothing changes, but confirm the
  daemon's heartbeat does not treat the extension's reconnect as a client.
- "One session at a time" is being removed: find every doc, test and comment that assumes it.
- Token handling: `bridge.token` file lookup (0.9) is new; the daemon log must never contain it
  (D3 `redact`); the spawned environment carries it (0.8) — confirm `windowsHide` + `stdio: "ignore"`
  do not surface it in a console.
- The `unknown method` symptom: a Step 6 daemon forwarding `daemon.status` by mistake would produce
  it from the extension — check `route.ts`'s intercept list is exhaustive.
- Two clients with different `BRIDGE_DAEMON` paths: ruled (one handover, then `VERSION`); confirm the
  D4 checkbox and D4.2 carry it.
- `BRIDGE_PORT` ≠ 9234: does every piece (extension options, daemon, SDK, MCP config) agree, and does
  the knock use the same value the spawn passes?
- The build hash is of `daemon/dist/index.js`; `npm run build` on a dirty tree changes it — a stale
  `dist/` while tests run on `src/`: which does the verifier hash?
- Windows path handling in `token.ts`'s walk-up (drive roots, `cygpath` vs native paths).

**(d) Testability.** Every exit check D0.1–D7.3 is executable and discriminating, with its pass rule
written before any measurement; which are unit (D0–D5, D7) and which are E2E rows needing my keyboard
(all of D6, parts of D7). Flag any check that cannot fail.

**Rulings to re-check by premise, not reopen** (the *Ruled 2026-10-21* lines under the phase doc's
"Open items"): confirm each premise by execution (for example: that `process.ppid` under the shim
really is the shim; that `actions.ts` has 4 `activeTab()` calls; that `test-fixtures/` has no
`_blank` button; that `docs/e2e-test-plan.md` has no `DL` rows). A wrong premise is a finding; a
disagreement with the ruling is not.

**Still open from W0** (the audit resolves or records): `docs/setup.md` must state the token
precedence (env wins over the file) — confirm it is scheduled in D5/D7; the POSIX lifecycle stays
unverified (record, do not block).

**Output:** `…-steps/stage0-audit.md` — findings ranked by severity (CRITICAL / MAJOR / MINOR / NIT),
each tagged **plan-side** (the doc is wrong; you amend the phase doc in place with a dated note and
record a decision if it is more than mechanical) or **code-side** (the code differs from what the plan
assumes; becomes a stage item). **All resolved before stage D0 starts.** Then you write the stage
split (D0 ∥ D1 → D2 ∥ D4 → D3 → D5 → D7 → stop at G6-2) with estimates into `journal.md`.

## 5. SPEC-DISCREPANCY PROTOCOL (verbatim in every brief)

```
SPEC-DISCREPANCY PROTOCOL. Intent beats procedure. When the code you are asked to write, the
phase doc, the design spec and CLAUDE.md's measured facts disagree, trace up the chain —
phase doc → design spec → CLAUDE.md runtime gotchas — and say so in your report; the deepest
layer that is internally consistent wins. Stakes pick who resolves it: mechanical (a stale
line number, a wrong count, a renamed file) → the fixer documents it in the report and the
step agent amends the phase doc in place with a dated note; design-local (a shape the plan
left open, a default) → the session agent records a decision in docs/decisions.md with the
rejected option; contract-level (the wire protocol, codes, close codes, the token lookup, the
bind, the SDK's public surface, "one session at a time") → long-run §3: a pre-stated rule
applies mechanically, else the conservative choice (security at least as strict; every
existing tool and test behaves identically; undoable), recorded under Open decisions for the
user. Code and spec never diverge silently: whoever changes behaviour amends the governing
doc in place with "*Superseded YYYY-MM-DD: was X, because Y.*". Verifiers report findings
with the command and its output; they never rewrite the spec or the plan.
```

## 6. Decisions and integrity floor

Decisions follow `long-run` §3: build decisions (module layout inside `daemon/` and `sdk/`, test
structure, defaults the plan left open, plain plan defects) you take and record `By: Claude`;
contract decisions (anything in `shared/src/protocol.ts` or `codes.ts`, close codes, the token
lookup, the bind, the SDK's exported surface, MCP tool names and schemas, compatibility promises)
apply a pre-stated rule or the conservative rule and are listed under **Open decisions** in
`docs/decisions.md` and in the as-built register for me to review at the gate. Only you write
`docs/decisions.md`; subagents propose.

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP
rule that says escalate; a human gate (G6-1 is granted on the kickoff's two conditions; G6-2,
the D6 wave; G6-3, any token or bind question); anything destructive or outward-facing
(push, tag, publish, history rewrite, deleting outside the repo, touching the Chrome profile,
committing or logging the token); any loosening of the security boundary (the 127.0.0.1 bind,
the token gate, "never log URLs, header values or bodies"); permission or classifier denials.
(2) Phase-specific: a non-empty `git diff -- extension/`; a drop in the test count without a
documented move; the DL and MUX rows' measurements (the user's keyboard); the MCP config path
change (the user's, after the phase). Standing rule: never resolve a decision in the direction
that flatters a result already seen; pass rules are written before the measurement; a failed
check is reported, never re-tuned.
```

## 7. Stages

Each stage's deliverables are the phase doc's checkbox lines for that stage; paste them verbatim into
the brief. Exit checks are the phase doc's pre-registered IDs. Budget slices are estimates; the step
report records the actual beside it. One commit per stage close, message from the D7 list.

| Stage | Deliverables (phase doc) | Exit checks | Budget | Parallel | Verifier focus (beyond the phase doc's) |
|---|---|---|---|---|---|
| **0 — Spec audit** | §4 of this kickoff | findings file exists; every finding has evidence; stage split in `journal.md` | 1.5 h | first, alone | spot-check 5 findings by re-executing them |
| **D0 — Shared types and codes** | `codes.ts`, protocol v2 types + guards, `BridgeError.fromWire`, tests | D0.1–D0.4 | 1 h | ∥ D1 | the full §10 code list, nothing invented; v1 hello still passes; `server/` and `extension/` typecheck unchanged |
| **D1 — Repository split** | `git mv server daemon`; new `mcp/`, `sdk/`; root workspaces; `setup.md` path | D1.1–D1.5 | 1.5 h | ∥ D0; **nothing else** | test count exactly 301; `git log --follow` history; `ls server` fails; `git diff --stat -- extension/` empty; **no behaviour change** (the diff is moves and manifests) |
| **D2 — Daemon roles, registry, routing** | `handshake.ts`, `registry.ts`, `wsHost.ts` welcome, `route.ts`, events ignored, **`extensionStatus` emit**, tests over real `ws` | D2.1–D2.7 | 3 h | ∥ D4, after D0+D1 | colliding ids from two clients; 4001 for bad token and unknown role with nothing logged about the token; missed pong still terminates; `extensionStatus` reaches clients; **cross-package verifier**: `shared/` ↔ `daemon/` ↔ the untouched `extension/` v1 hello |
| **D3 — Daemon lifecycle** | `build.ts`, `idle.ts`, `log.ts` + `redact`, daemon `index.ts` (bind once, no stdio, signals), env defaults | D3.1–D3.6 | 1.5 h | after D2; may overlap D4 | idle fires once and never with a client; `redact` refuses `://` and the token; no `console.*` in the entry; `EADDRINUSE` exits 0 without retry |
| **D4 — SDK core** | `client.ts`, `knock.ts` (one handover, then `VERSION`), `spawn.ts`, `token.ts`, `connect({waitForExtensionMs})`, `index.ts` exports | D4.1–D4.4 | 3 h | ∥ D2/D3, after D0 | injected clock, never real time; reconnect on 4002 only; second mismatch → `VERSION`; `token.ts` finds the file only at the workspace root; `spawn.ts` passes exactly `detached`, `stdio: "ignore"`, `windowsHide` and calls `unref()` |
| **D5 — MCP over the SDK** | `mcp/src/index.ts` (`claude-code #${process.pid}`, no-crash connect, 5 s retry), registry over `BridgeClient`, `lifecycle.ts` unchanged but the shutdown call, tests | D5.1–D5.5 | 2 h | after D2, D3, D4 | 21 tools with unchanged schemas (`git diff` on the definitions); every tool error carries the stored reason with no daemon; **cross-package verifier**: `shared/` + `daemon/` + `sdk/` + `mcp/` end to end over a real `ws` socket with a fake extension; `setup.md` states env-over-file token precedence |
| **D6 — E2E (wave with me)** | MUX-1…9 and DL-1…2 rows with expected text, `recipes/hello.ts` | D6.1 (autonomous part); D6.2–D6.4 with me | 1 h autonomous | after D5; **stops at G6-2** | each row's expected text precedes the run; the rows name the commands; `hello.ts` typechecks |
| **D7 — Docs + commits** | `CLAUDE.md` (architecture, key files, commands, gotchas; "one session" rule removed), `setup.md` (path, token file, log, stopping the daemon), roadmap entry (E2E part waits) | D7.1–D7.3 | 1 h | last before G6-2 | every key-file path exists; no doc says `server/dist` or "one session" except as a dated marker; the E2E results part is marked "waits for the D6 wave" |

Propagator after D7 (end of the autonomous part): compares the as-built register with the phase
doc, the Step 7 and Step 8 plans, `CLAUDE.md` and `docs/setup.md`; writes dated correction notes in
place; returns a correction ledger. It edits no code.

## 8. Close-out contract

- Measured numbers into the phase doc: rewrite its **Outcome** as results (test count per stage
  with the command; tool count; what D6 measured once the wave runs); its **Status** line.
- The **as-built register** `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` per
  `.claude/skills/phase-kickoff/asbuilt.md`: one section per stage, appended at stage close, never
  rewritten (corrections are dated notes); contracts binding forward (the welcome shape, the
  `extensionStatus` event, close code 4002, the error envelope, the `VERSION` rule — Step 7's Stage 0
  re-examines them by execution); decisions taken; deviations; estimates vs actuals; needs the user's
  keyboard; open decisions.
- The **gate checklist** (item → met? → evidence) at the end of the as-built: the phase doc's exit
  checks D0–D5 and D7, the autonomous part of D6, the STOP rules not fired, `git diff -- extension/`
  empty across the phase, one commit per stage with no `dist/` and no token.
- **Needs the user's keyboard**, listed plainly: (1) update the MCP config path to `mcp/dist/index.js`
  and reconnect (`/mcp`); (2) the D6 wave — MUX-1…9 and DL-1…2, including a second Claude session
  (MUX-2), killing the process tree and the nvm shim (MUX-7), closing and reopening Chrome (MUX-8), a
  rebuild mid-session (MUX-5); (3) any push.
- Then the `session-closeout` skill (phase doc, `docs/decisions.md`, `docs/progress-and-roadmap.md`,
  the `CLAUDE.md` Current state block, new gotchas as measured facts, memory, commit) and the
  `phase-kickoff` skill again: a **wave** handoff for D6 (prepend to `docs/plans/handoffs.md`) and,
  after the wave, the Step 7 phase kickoff overwriting `docs/plans/next-session-prompt.md`.

## 9. STOP RULES

**Stops the gate** (the stage is not closed; the write-up continues): a pre-registered exit check
fails after 2 fix rounds; `git diff -- extension/` is non-empty at any stage of this step; the test
count drops without a documented move; a security-boundary question (G6-3); an unexplained
port-9234 holder or an orphan `node` process the run did not start; a second daemon handover
attempted inside one `connect()`.

**Continues anyway, recorded:** a surprising measurement that trips no rule (for example the idle exit
taking longer than 20 s in MUX-4 — report the number); a build decision the plan left open (module
layout, test structure) — decided and recorded per `long-run` §3; an audit finding resolved plan-side
with a dated note.

**Forbidden fixes for this step** (from the phase doc, derived from its decisions 0.1–0.10 and
`long-run` §3):
- widening the token rule or binding to anything but `127.0.0.1`;
- lowering the `+5000` daemon-side slack, the `[100, 600000]` bounds, the 10 s knock limit or the
  heartbeat to make a race or timeout test pass;
- logging a URL, header value, body or token — including "temporarily, to debug the daemon";
- making the daemon retry the bind (the bind is the lock, 0.7 / spec §9.3) or exit non-zero on
  `EADDRINUSE`;
- making `BridgeClient` reconnect on any close code other than 4002, or letting `connect()` attempt a
  second handover instead of failing with `VERSION`;
- letting the MCP crash when `connect()` fails (D5's no-crash rule), or removing the 5 s retry;
- editing a test's expected message text to match a changed error instead of keeping the message
  (0.4: existing message-matching tests keep passing);
- weakening any test, guard or timeout to make a check pass; touching `extension/` for any reason.

**Final report** leads with "Decisions taken while you were away" (each cited by date + title),
then the gate measurements (test counts per stage with their command, tool count, timings with
their source), then open decisions, then what needs my keyboard (the MCP config path, the D6 wave,
any push).

I trust you — decide well and leave a trail we can audit.
