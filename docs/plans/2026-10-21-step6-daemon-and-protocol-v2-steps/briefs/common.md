# Step 6 — common brief block (part of every step brief, verbatim)

Written 2026-10-21 by the session agent from the Step 6 kickoff (`docs/plans/next-session-prompt.md`,
commit 1a92d95). Every step agent reads this file **in full** before anything else; it is part of
the brief. Pass the SPEC-DISCREPANCY PROTOCOL, the INTEGRITY FLOOR and the LESSONS to every
builder, verifier and fixer you spawn (paste them, or point them at this file as part of their
prompt).

## Fixed facts

- Repo: `C:\Users\aliev\Projects\chrome-remote-extention` (Git Bash path `/c/Users/aliev/Projects/chrome-remote-extention`).
- Baseline commit: `1a92d95` (parent `e60a83a`, docs only between). Baseline: `npm test` 301 passed
  (22 files); typecheck exit 0; build exit 0; 21 tools.
- Phase doc: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`. Design of record:
  `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (§4, §5, §9, §10, §11 bind).
- Steps dir: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/`. Journal (session agent
  only): `journal.md` there.
- Role prompts: `.claude/skills/step-agent/role-prompts.md`; report schema and ledger format:
  `.claude/skills/step-agent/SKILL.md`; long-run contract: `.claude/skills/long-run/SKILL.md`.
- Model: every agent at every level runs **Claude Opus 5.5 (`claude-opus-5-5`)**. Pass
  `model: "opus"` on every `Agent` call. State it in every prompt you write.
- Node PATH line for every Bash command that needs node/npm (node is not on PATH by default):
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`
- Commit trailers (end every commit message with exactly these two lines):
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01VkvemMK3BDof1y2UWWsEja
  ```
- Never push. Never commit `dist/`, `bridge.token`, `.env`. Never `git add -A`. Never start a real
  daemon or anything that binds port 9234 (tests bind port 0). Do not use the `chrome-agent-bridge`
  MCP tools.
- `git diff -- extension/` must stay empty for the whole step.

## ESCALATION list

A step agent escalates instead of deciding on:
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
  `node.exe`: PID 2928, a codex `host-daemon.mjs`, not Claude Code — corrected 2026-10-22 by
  Stage 0 F25; it does not hold 9234 and is not ours to touch; the daemon is never started by the autonomous run);
- a test count that drops without a documented move (D1 must keep 301);
- anything that needs the real Chrome profile (extension reload, live E2E) — none is granted; D6 is
  the user's wave;
- a permission or classifier denial;
- 2 failed fix rounds;
- a check that cannot be made discriminating.

## SPEC-DISCREPANCY PROTOCOL

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

## INTEGRITY FLOOR

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

G6-1 is **granted** (this session does not use the bridge MCP; the user updates the MCP config path
to `mcp/dist/index.js` after the phase). G6-2: D6 is a wave with the user — the autonomous run only
writes the rows and `recipes/hello.ts`. G6-3: any token-lookup or bind question stops the run.

## Forbidden fixes for this step

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

## LESSONS

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

## Waiting

You hold long waits yourself — run the job in the background, end your turn, get re-invoked by its
completion; never a foreground sleep loop. A notice that a child is "waiting on its own background
work" is NOT completion: end your turn and wait for its hand-back report. Builders, verifiers and
fixers finish in one go and never wait.

## Stage 0 rulings (added 2026-10-22)

Read `docs/decisions.md` entries 2026-10-22 #13–#17 and `stage0-audit.md` (§D1 move map, §Builder
ambiguities) for your stage. The phase doc already carries the resulting amendments as dated notes.
Stage order: D0 → D1 → (D2 ∥ D4) → D3 → D5 → D6 rows → D7. Other step agents may be running in
parallel lanes: never touch files outside your lane, and stage only your own files when committing
(`git add <exact paths>`); on `index.lock`, wait and retry.
