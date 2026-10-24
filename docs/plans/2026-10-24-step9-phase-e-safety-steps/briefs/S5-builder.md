# S5 — builder brief (Step 9, stage S5 "Docs")

Written 2026-10-24 by the S5 step agent. Read in this order: `CLAUDE.md`; `briefs/common.md` in this
directory (all of it is part of this brief: ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL,
INTEGRITY FLOOR, STOP rules and forbidden fixes bind you verbatim — they are reproduced at the end);
`.claude/skills/step-agent/role-prompts.md` (Common preamble + §Builder bind you);
`docs/docs-writing-guide.md` (binds every line you write); then this file.

## Common preamble (role-prompts.md, verbatim)

```
Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push; never touch the
user's real Chrome profile (no extension reload, no live browsing) unless your brief grants
it; never log URLs, header values or bodies from extension code. Report in the exact format
requested. Never invent results — if something did not run, say so. Decisions you take go
in your report as "Proposed decisions" (date · plain title, then Decided / Why / Instead of /
Revisit if). No internal codes without a one-line gloss. Model: Claude Opus 5.5 (claude-opus-5-5).
```

You are a level-2 agent: you must NOT spawn agents. Finish in one go; never wait on background work.
Do NOT commit — the step agent commits after the verifier. Never touch Chrome, never start the daemon,
never bind 9234. Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`
first in every Bash call that runs node/npm/npx.

## GOAL

Document Step 9 (Phase E: safety) **as built** — the as-built register
`docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` binds: document what was built, not what was
planned; where the register, the code and the phase doc disagree, the code is what ships — say so in
your report, never silently.

1. `docs/setup.md` gains a **"Safety"** section:
   - the three controls: the toolbar button, the options page's switches, the `Alt+Shift+K` shortcut
     (assigned as `_execute_action`, #142) and how to change it at `chrome://extensions/shortcuts`;
     pinning the button (it is the kill switch; Chrome may hide it in the Extensions menu until pinned);
   - what disarmed does, and what agents see: `DISARMED` with its scope, `DOMAIN_BLOCKED`, hidden
     `listTabs` rows, `browser_status`'s `Safety:` line, the SDK's `client.safety()`; quote refusal text
     only from the code or the as-built register (#158, #164);
   - the badge/title states (#143, #181) at the level a user needs;
   - the JavaScript switch (what it refuses: `browser_evaluate`, `asRef`, `javascript:`/`data:`-style
     script URLs per #138/#157 — as built) and that the Blackboard recipes need it on (`boot-bb.ts`
     loads `bb.js` by evaluate);
   - the block-list grammar (#135, #156) with examples using **reserved names only** (`example.com`,
     `*.example.org`, `bank.example`, `.test`/`.invalid`/`.localhost` style — RFC 2606/6761);
   - the own-page block (#138, #155: the bridge never opens extension pages);
   - the threat model of Stage 0 F16: the block list is not a network firewall — a redirect hop onto a
     blocked host is still requested (#140; `downloadStart` checks its own URL only, #154); and note,
     per #194, that the post-redirect check is unit-tested but not yet measured live;
   - the failure states: a write that failed (`write-failed`, #174, #182, #190) and an unreadable state
     (#139, #171, #180) → treated as OFF (fails closed).
   - Update § Security notes and § Running JavaScript (or whatever the existing headings are called) to
     point at the new section.
   - Nothing may contradict decisions.md #127 (bulk data through `browser_evaluate` was a test device
     only; the MCP gets a `saveTo` path). Grep your touched docs for `evaluate`, `bulk`, `chunk` and check
     each hit against #127.
2. `README.md`'s security paragraph: the kill switch, block list, JavaScript switch in two or three
   sentences, pointing at setup.md's Safety section.
3. `docs/progress-and-roadmap.md`'s Phase E block: Step 9 built (stages Stage 0, S0, S1, S3, S2a, S2b,
   S2c, S4, S5 — check the as-built register); Run 13 (results as S4.md §4 adopts them: verifier PASS 24 /
   FAIL 7 / RECORD 3 / NOT MEASURED 5, with #192–#197); the open decisions for the user (list them by
   title + number as `docs/decisions.md` → Open decisions → Step 9 lists them; do not rule them); Steps
   10–12 per #129, with #194's four re-measurements (SAFE-5c redirect half, SAFE-POP-1, SAFE-3,
   SAFE-4(b)) added to Step 10's inputs. Follow the shape of the existing Step 7/8 blocks there.
4. `docs/e2e-test-plan.md` **§1 only**, and only if §1's helper list needs the S4 helpers named
   (`recipes/s9.ts`, `s9-rules.ts`, `s9-actor.ts`, `s9-win.ps1`, `s9-redirect.py`, `tsconfig.s9.json`).
   Do not touch §4.20 or §5 Run 13.
5. **PROPOSE (do not write) CLAUDE.md changes**, as exact replacement/insert blocks with anchors (an
   existing line quoted verbatim, then "insert after" / "replace with"), in your report §Proposed
   CLAUDE.md:
   - Key files: `extension/src/safety.ts`, `safety-match.ts`, `safety-state.ts`, the badge module (find
     its real name), `GatedRouter` in `router.ts`, `options.ts` (+ its HTML), the S4 recipes; any new
     shared/daemon/sdk/mcp files Step 9 added (check `git diff --stat 59be263..HEAD`);
   - the counts, re-derived: 25 codes (`shared/src/codes.ts`), 23 tools (`mcp/src/tools/registry.ts`),
     router method count, tests/files — run `npm test` **once** in the clean tree and quote its tail
     verbatim; replace the "Current state" block's and Commands' stale counts (1714/85) with superseded
     notes in the house style (`*Superseded 2026-10-24: was X, because Y.*`);
   - a **"Step 9 — safety (2026-10-24; reports in `docs/plans/2026-10-24-step9-phase-e-safety-steps/`)"**
     gotcha block in the style of the Step 7/Step 8 blocks: every gotcha measured in S4 (S4.md §10
     findings 1–8, each with its row ID from `S4-run-record.md`) or by a verifier in any Step 9 stage
     report (stage0.md, S0.md, S1.md, S3.md, S2a.md, S2b.md, S2c.md and their `-verifier.md` files),
     each citing its source (row ID / report §). Include the invariants a future editor must keep
     (state in `storage.local`, fails closed, listeners for `action.onClicked`/`commands.onCommand`/
     `storage.onChanged` at top level, every `router.on` name in the safety table, no wire method changes
     the state, matcher dot boundary, never log a pattern) — only where the code shows them; cite the
     file. Mark which are measured and which are by-construction.
   - the "Resume" / "Current state" lines are the session agent's; propose them, but keep the Step 9
     close wording conditional on the user's ruling on #192 (Run 13 is escalated, open for the user).

## INPUTS (read; quote facts only from these and the code)

- Phase doc `docs/plans/2026-10-24-step9-phase-e-safety.md`, "### Stage S5" (verbatim below) and
  Decisions 0.1–0.7 with all dated notes.
- As-built register `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` (binding).
- `docs/decisions.md` #127–#197 and its "Open decisions" → Step 9 list.
- Stage reports in `docs/plans/2026-10-24-step9-phase-e-safety-steps/`: stage0.md (+ stage0-audit.md for
  F16), S0.md, S1.md, S3.md, S2a.md, S2b.md, S2c.md, S4.md, S4-run-record.md, and the `*-verifier.md`
  files for verifier-measured facts.
- The code: `extension/src/safety*.ts`, `extension/src/router.ts`, `extension/src/options.ts`,
  `extension/options.html`, `extension/manifest.json`, `shared/src/codes.ts`, `shared/src/protocol.ts`,
  `sdk/src/client.ts`, `mcp/src/tools/registry.ts`, `daemon/src/intercept.ts`.

Phase doc Stage S5 (verbatim):

```
### Stage S5 — Docs
- [ ] `docs/setup.md` "Safety" section (the three controls, the shortcut, what agents see, the
      JavaScript switch and the Blackboard recipes, the own-page block); `CLAUDE.md` (key files,
      gotchas measured in S4); `README.md` security paragraph; the roadmap's Phase E block.
**Lane:** docs only.
*Amended 2026-10-24 (#145): S5's budget is 1 h, last. The "Safety" section also states what the block list
does not do (0.4's F16 note).*
```

Kickoff §7 row (verbatim): "| **S5 — Docs** | phase doc S5 | S5.1 | 1 h | last | every new gotcha
sourced; nothing contradicts #127's bulk-data rule |"

## EXIT CRITERIA (pre-registered; the verifier checks them)

- **S5.1** `setup.md` documents the three controls and the shortcut; every new gotcha cites its source.
- Nothing in the touched docs contradicts #127 (grep `evaluate|bulk|chunk`, each hit read).
- Every count stated in the touched docs (and in the proposed CLAUDE.md text) matches a re-derived value.
- No real hostname, user tab, real block-list pattern or the token in any touched doc (grep by count;
  print counts, not the token — read it inside the command, never echo it).
- `docs/docs-writing-guide.md` rules followed.

## LANE

Write only: `docs/setup.md`, `README.md`, `docs/progress-and-roadmap.md`, `docs/e2e-test-plan.md` §1,
and your report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S5-builder.md`. NOT `CLAUDE.md`,
`docs/decisions.md`, the as-built register or the phase doc — propose changes to them in your report.
A needed change anywhere else escalates (report it, do not make it).

## REPORT (`S5-builder.md`)

1. Built (files, with a one-line summary per section added/changed) · 2. `npm test` tail verbatim (one
run, clean tree) and how each count was derived (command + output) · 3. Grep results (#127 hits with
your reading; real-host / token / pattern counts with the commands) · 4. Deviations, and any place the
as-built register and the code disagree · 5. Proposed decisions · 6. **Proposed CLAUDE.md** — exact
blocks with anchors · 7. Proposed dated notes for the phase doc (S5 checkbox / Outcome) · 8. Anything
left unfinished.

## Bound verbatim from common.md

See `briefs/common.md` §§ ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, STOP
RULES and forbidden fixes — they bind you verbatim; read them there in full before starting.

## Verbatim from common.md (ESCALATION, LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, STOP rules)

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

