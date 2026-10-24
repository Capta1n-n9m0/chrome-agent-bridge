# S2c — verifier brief (Step 9, stage S2c)

Written 2026-10-24 by the S2c step agent. You are the INDEPENDENT VERIFIER. Read `CLAUDE.md`, `briefs/common.md`
(binds in full), `.claude/skills/step-agent/role-prompts.md` (Common preamble + §Verifier), the builder brief
`briefs/S2c-builder.md` (goal, lane, exit criteria E1–E6 — pre-registered), and treat
`S2c-builder.md` (the builder's report) as claims, never as evidence.

Level-2: you must NOT spawn agents, must NOT commit, must not edit the source under review (a throwaway mutation in a
scratch copy or a `git stash`/worktree you restore is fine — leave the main tree exactly as you found it, check with
`git status` and `git diff --stat` before and after). No real Chrome, no real daemon, never bind 9234. Node first:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Scratch: use
C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad.

## What to do
1. From a clean worktree of HEAD 9a5366c + the working-tree changes (e.g. `git worktree add` in the scratchpad, copy
   the changed/new files in, `npm install` or link node_modules): run `npm run typecheck`, `npm test`, `npm run build`;
   re-derive the test count (claimed 2660/113 → 2670/115). Remove the worktree after.
2. E1: prove each new test fails without the fix (revert only `safety-state.ts`/`sw.ts` to HEAD in the worktree) and
   passes with it. Judge whether the tests are discriminating: a test that fails only on a missing import is weak —
   check whether a variant of HEAD's behaviour with the helper present but `get(null)` used would be caught.
   Mutate the fix (no revert; revert unconditionally; move `lastDisarmAt`; skip `onDisarm`; swallow the rejection) and
   report which tests catch each mutation.
3. Attack the fix: read the diff of `safety-state.ts` and `sw.ts` in full. Is memory ever left armed after a failed
   arm write (any interleaving with `applyChanges`, `read()`, a second queued `toggle()`, `start()`)? Does a failed arm
   still reject (#174)? Does the badge (#181/#182: rejected arm → `OFF`, "turning on failed…") still behave — run the
   badge tests and read `badge.ts`'s press path against the new rejection timing. Is `onArm` → `onDisarm` ordering safe
   (`sw.ts` hooks: `debuggerSessions.refuse(null)` on arm; detach/clear on disarm)? Behaviour on every success path
   unchanged?
4. Hunt independently for other memory-before-write paths in `extension/src` (grep `storage.local.set`, `deps.set`,
   `writeSafety`, `.apply(`), including `options.ts`. Confirm or refute the builder's hunt table.
5. Item (2): confirm the badge read asks only `SAFETY_KEY_NAMES`; no `storage.local.get(null)` or key-less `get()`
   remains for `local` anywhere in `extension/src`; `sw.ts` names no safety key; writers / sw-static / log-scan /
   log-sentinel tests pass UNCHANGED (`git diff` on `extension/test` shows only the two new files). Is the deviation
   (helper in `safety-state.ts`, not `badge.ts`) sound?
6. E3: content bundle IIFE (no top-level import/export in `extension/dist/content.js`), no top-level `await` in `sw.ts`,
   listeners at top level. E5: no tracked file other than the two sources changed after build.

## Report
`docs/plans/2026-10-24-step9-phase-e-safety-steps/S2c-verifier.md`: verdict PASS | PASS-with-notes | FAIL; E1–E6 each
with the command and its output lines; mutation table; findings numbered with severity (CRITICAL/MAJOR/MINOR/NIT) and
evidence; what you did not check. Return a ≤ 15-line summary.

---
# Pasted verbatim from briefs/common.md (lines 110–278)

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

