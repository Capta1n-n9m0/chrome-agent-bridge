# Step 8 — common brief parts (part of every brief)

Built 2026-10-23 by the session agent from the kickoff, frozen at `kickoff.md` in this directory
(a byte copy of `docs/plans/next-session-prompt.md` at commit 70aa754, which a later phase-kickoff
overwrites). The blocks below are pasted verbatim from it. Where this file and the kickoff
disagree, the kickoff wins; where the kickoff and the phase doc's pre-registered rules disagree,
the pre-registered rules win.

## Fixed facts

- Repo: `C:\Users\aliev\Projects\chrome-remote-extention`, branch `main`, Git Bash shell. Baseline
  commit `70aa754` (`docs: close Step 7 (multi-actor tabs); Step 8 kickoff`), parent `b1fc1da`.
- Baseline (kickoff, 2026-10-23): `npm test` 950 passed in 59 files; `npm run typecheck` exit 0;
  22 tools (`grep -c "server.tool(" mcp/src/tools/registry.ts`); 22 codes in `shared/src/codes.ts`,
  `NO_CURSOR` absent. Stage 0 re-checks and dates these.
- Model: every agent is Claude Opus 5.5 (`claude-opus-5-5`; `model: "opus"` on every Agent call) —
  decisions.md · 2026-10-23 · Step 8 agents run Opus 5.5 (#70). Only FE's and S6's headless E2E actor
  sessions (`claude -p`) may run Sonnet.
- Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every
  Bash call that runs node/npm/npx.
- Phase doc: `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md` (all dated notes bind).
  Design of record: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (§8; §5/§6/§7/§10 where
  touched). Step 7 as-built: `docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md`. Step 8 as-built
  register: `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md` (created at the first
  stage close). Stages, the FE outcome table, S2b and S3.5: `kickoff.md` §7. Stop rules and forbidden
  fixes: `kickoff.md` §9.
- Kickoff proposals recorded before Stage 0 (decisions.md, 2026-10-23): #71 FE stage and its outcome
  table; #72 S2b's lane and scope; #73 `code` required; #74 the session marker; #75 S3.4 re-exports;
  #76 `NO_CURSOR`; #77 the inherited-handles check S3.5. Contract-level ones are under Open decisions.
- Steps dir: this directory. `journal.md` is the session agent's (append-only). Each stage writes
  `<STAGE>.ledger.md` and `<STAGE>.md` (report) here; sub-reports `<STAGE>-builder.md`,
  `<STAGE>-verifier.md`, `<STAGE>-fixer<n>.md` are fine.
- Only the session agent writes `docs/decisions.md`, the as-built register and `CLAUDE.md`.

## Standard brief parts

- WAITING: you hold long waits yourself — run the job in the background, end your turn, get
  re-invoked by its completion; never a foreground sleep loop. A notice that a child is "waiting on
  its own background work" is NOT completion: end your turn and wait for its hand-back report. Your
  builders/verifiers/fixers finish in one go and never wait.
- Level-2 agents never spawn agents. The step agent reads and decides; it neither builds nor commits
  itself (a builder commits).
- Parallel stages share one working tree: builders run tests scoped to their package
  (`npx vitest run <pkg>/`) plus `npm run typecheck`; the verifier runs the full suite in its own
  clean worktree (`git worktree add` at HEAD, apply the lane diff, `npm ci`) and removes it after.
- Commits: an explicit pathspec of the stage's own files; never `dist/`, `bridge.token`, `.env`,
  `exports/`, a failure screenshot; never `git add -A`; never push. Trailers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01BkTidDEqcrGQDLJF2R2B8L`. A classifier denial is
  reported, never retried or worked around.

## ESCALATION list (verbatim)

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
surface, the locator rules, the attach set, the cursor rule, MCP tool names and schemas) →
long-run §3: a pre-stated rule applies mechanically, else the conservative choice (security at
least as strict; every existing tool and test behaves identically; undoable), recorded under
Open decisions for the user. Code and spec never diverge silently: whoever changes behaviour
amends the governing doc in place with "*Superseded YYYY-MM-DD: was X, because Y.*". Verifiers
report findings with the command and its output; they never rewrite the spec or the plan.
```

## INTEGRITY FLOOR (verbatim)

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

## Forbidden fixes and STOP rules (kickoff §9, verbatim)


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


## LESSONS (verbatim)

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

## Running state (session agent updates this section at each dispatch)

- 2026-10-23: steps dir created; decisions #70–#77 recorded; Stage 0 dispatched alone.
