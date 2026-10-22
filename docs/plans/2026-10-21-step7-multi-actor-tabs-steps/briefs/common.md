# Step 7 — common brief block (part of every step brief, verbatim)

Written 2026-10-22 by the session agent from the Step 7 kickoff (`docs/plans/next-session-prompt.md`,
HEAD 0773a98). Every step agent reads this file **in full** before anything else; it is part of the
brief. Pass the SPEC-DISCREPANCY PROTOCOL, the INTEGRITY FLOOR and the LESSONS to every builder,
verifier and fixer you spawn (paste them, or point them at this file as part of their prompt).

## Fixed facts

- Repo: `C:\Users\aliev\Projects\chrome-remote-extention` (Git Bash path `/c/Users/aliev/Projects/chrome-remote-extention`).
- Baseline commit: `0773a98`. Baseline (W1, 2026-10-22): `npm test` 542 passed (42 files);
  typecheck exit 0; build exit 0; 21 tools (`grep -c "server.tool(" mcp/src/tools/registry.ts`);
  13 `activeTab()` call sites in `extension/src/handlers` (4 in `actions.ts`). Re-measure, never assume.
- Phase doc (plan; its checkboxes are the work items; its "Exit checks (pre-registered)", "Human
  gates" and "STOP rules and forbidden fixes" are pre-registered rules; its dated *Corrected* notes
  bind): `docs/plans/2026-10-21-step7-multi-actor-tabs.md`.
- Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §5, §6, §7, §10 bind;
  §8.3 only as far as T4's "claim on first touch"; §12–§13 risks / open questions.
- Step 6 as-built: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` ("Contracts
  binding forward", "W1 as-built"). Step 7 as-built register (once it exists):
  `docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md`.
- Steps dir: `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/`. Journal: `journal.md` there
  (session agent only). Your ledger `<STAGE>.ledger.md`, your report `<STAGE>.md`, verifier files
  `<STAGE>-verifier.md`, evidence — all there.
- Role prompts: `.claude/skills/step-agent/role-prompts.md`; report schema and ledger format:
  `.claude/skills/step-agent/SKILL.md`; long-run contract: `.claude/skills/long-run/SKILL.md`;
  writing rules: `docs/docs-writing-guide.md`; decisions: `docs/decisions.md` (only the session
  agent writes it).
- **Model:** every agent at every level runs **Claude Opus 5.5 (`claude-opus-5-5`)**; pass
  `model: "opus"` on every `Agent` call (decisions.md · 2026-10-22 · Step 7 agents run Opus 5.5).
  T5 only: the headless E2E actor sessions (`claude -p`) may run Sonnet or Haiku.
- Commit trailers (end of every commit message):
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_0138S4sf4L1MUSLv6LDJHGjY
  ```
- Git user is the user's; never push; never commit `dist/`, `bridge.token`, `.env`; never `git add -A`.

## Standard brief parts

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
under "Proposed decisions" in the decisions.md format. Never edit decisions.md, the as-built
register or CLAUDE.md yourself.

OUTPUT: docs/plans/2026-10-21-step7-multi-actor-tabs-steps/<STAGE>.md per the report schema
(step-agent skill: Verdict, Outputs, Verifier verdict, Deviations, Proposed decisions, Findings,
Handoff; test count before → after).

COMMIT: commit your stage's code/docs via a builder: exact file list (never dist/, never
bridge.token or .env, never `git add -A`), message
"<type>(<scope>): <stage> — <what> (verifier: PASS|PASS-with-notes)" with a body that says
why, plus the trailers above; on git index.lock, wait and retry. If the commit is denied by the
permission classifier, do not retry: report it. Never push.

RETURN: a ≤ 15-line summary + the report path.

## ESCALATION list (verbatim)

A step agent escalates instead of deciding on:
- anything touching a pre-registered rule (an exit check, a human gate, a STOP rule) or a fact of the
  design of record (§5, §6, §7, §10 of the spec; phase-doc decisions 0.1–0.8);
- an effect outside its lane — another package (`shared/`, `daemon/`, `sdk/`, `mcp/`, `extension/`), a
  later stage, a shared script, the wire protocol — except the grants written into the stage's Lane
  (T1: `test-fixtures/e2e-playground.html`; T3/T4: moving test cases from `extension/test/` to
  `sdk/test/`; T5: `docs/e2e-test-plan.md` and `recipes/`);
- any change to the lease or lock semantics (who may act on a held tab; FIFO; when the lock is taken
  and released), to what the human sees (0.5 no window focus, 0.8 `newTab` in the background), or to
  the event names, params or codes on the wire;
- any integrity-floor item (below) or anything on the `long-run` §4 stop list — in particular the
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

## SPEC-DISCREPANCY PROTOCOL (verbatim)

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

## INTEGRITY FLOOR (verbatim)

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

## Forbidden fixes (kickoff §9, verbatim list)

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

## LESSONS (verbatim)

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

## Running state (session agent updates this section at each dispatch)

- 2026-10-22T12:14:55Z: nothing running from this run. Port 9234 free. Unrelated `node.exe` PID
  22152 (codex `host-daemon.mjs`) — not ours, never kill it.
- 2026-10-22 (T1 ∥ T2 dispatch, HEAD 9322f24, 600 tests / 43 files): nothing running from this run.
  **Parallel-stage rules while T1 and T2 share the working tree:** each stage touches only its lane;
  builders run tests scoped to their own package (`npx vitest run <pkg>/`) plus `npm run typecheck`;
  the full-suite count is taken by the verifier in its own clean worktree (`git worktree add` at HEAD,
  then apply the stage's lane diff, `npm ci`), never in the main tree. Commit with an explicit
  pathspec of the stage's own files only. **No `npm run build` in the main tree from now until T4's
  commit** (decisions.md · 2026-10-22 · A Step 6 client keeps working against a Step 7 daemon for one
  release (#41) (B)); builds run in the verifier's worktree. Level-2 agents (builder/fixer) do the
  code and commit work; the step agent reads and decides.
