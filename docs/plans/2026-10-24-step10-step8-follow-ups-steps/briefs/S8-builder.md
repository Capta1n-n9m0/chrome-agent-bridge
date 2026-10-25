# S8 builder brief — retire the chunked MCP recipe; Step 10 docs

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server + Chrome MV3 extension;
TypeScript; vitest). Shell: Git Bash on Windows. Checks: `npm run typecheck`, `npm test`, `npm run build`. Read
CLAUDE.md first; its "Runtime gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push, never tag; never touch the user's real
Chrome profile — S8 is OFFLINE: do not start the daemon, do not run any recipe against the bridge, do not touch
Chrome; never log URLs, header values or bodies. Report in the exact format requested. Never invent results — if
something did not run, say so. Decisions you take go in your report as "Proposed decisions" (date · plain title,
then Decided / Why / Instead of / Revisit if). No internal codes without a one-line gloss. Model: Claude Opus 5.5.
You are a level-2 agent: you must NOT spawn agents. Finish in one go: run long commands (`npm test`, build) in the
background with a bounded timeout and collect them before you report — never return while your own work is still
running, never a foreground command that can hang. Node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

Also read `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/common.md` § "Lessons learned during
Step 10" (pasted below too). The ESCALATION list, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR and LESSONS below bind
you: on any ESCALATION item, stop that line of work and say so in your report.

## Role: Builder (stage S8)

Implement exactly this stage. Run `npm run typecheck`, `npm test`, `npm run build` at the end and paste the tails
with counts. Before you change anything, record `npm test`'s count at `312cadb` (expected 3280 passed / 132 files —
re-derive it). After the build, `git status --porcelain` must show no tracked change you did not make. Do NOT commit
(the step agent commits after the verifier).

Report to `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S8-builder.md`: built (files, per item) · the removed
tests listed per file by name with the count change · S8.1's grep output verbatim · every quoted user-visible text
with its source `file:line` in the code · typecheck/test/build tails (before and after counts) · item 3's
investigation (cause, evidence, fix or report) · deviations · proposed decisions (with alternatives) · anything left
unfinished. The CLAUDE.md proposals go to a separate file (item 4).

## Stage inputs (verbatim from `docs/plans/2026-10-24-step10-step8-follow-ups.md`)

**0.5 — Retirement:** after the fixture leg passes, `recipes/blackboard/assemble-mcp.ts`, `transcript.ts` and the
tests that cover only them are removed, `recipes/README.md` and `docs/setup.md` updated; the removed test count is
documented. Run 12's S6.3 record stays as written (decisions.md · 2026-10-23 · SDK-7's MCP leg is re-registered
with a cap that fits pp1's export (#102)). If the fixture leg fails, nothing is retired (a proposed decision).
*Amended 2026-10-24 (Stage 0 F9): retired = `recipes/blackboard/assemble-mcp.ts`, `transcript.ts`,
`export-file.ts`'s `assemble()`, and the 7 tests that cover only them (5 in `blackboard-export-file.test.ts` —
`parseTranscriptChunks` — plus its `assemble` test, 1 in `blackboard-held.test.ts`), listed per file, test count
−7 documented; `--mcp-plan` stays, its help text naming `browser_evaluate {saveTo}`. S8's lane gains the
header/help-text edits in `export-file.ts`, `export-grades.ts`, `held.ts`,
`recipes/test/blackboard-export-file.test.ts` and `recipes/README.md`, so that S8.1's grep finds only dated
history notes.* (decisions.md · 2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential
row, the retirement set, bb-login's bound (#209).)

The fixture leg PASSED (Run 15, S7.md: SAVE rows PASS; PP1 (G10-3) PASS, page = SDK file = MCP file by sha256).

**Stage S8 — Retire the chunked recipe; docs (1 h, last)**
- [ ] 0.5's retirement (if the fixture leg passed); `docs/setup.md` (focus-first on the MCP's trusted tools, the
      warning, `saveTo`, the test-device sentence), `recipes/README.md`, `README.md` where the tool text changed;
      `CLAUDE.md` changes proposed for the session agent; the roadmap's Step 10 block.
**Lane:** `recipes/blackboard/` (removals only), `recipes/test/` (removals only), docs.
*Amended 2026-10-24 (Stage 0 F9): the lane also allows the header/help-text edits in
`recipes/blackboard/export-file.ts`, `export-grades.ts`, `held.ts`, `recipes/test/blackboard-export-file.test.ts`
and `recipes/README.md` (`--mcp-plan`'s help text naming `browser_evaluate {saveTo}`); the retirement set and its
−7 tests are 0.5's note.*

**Exit check S8.1** the retirement's removed tests listed per file with the count change; `grep -rn
"assemble-mcp\|transcript.ts" recipes docs/setup.md` finds only dated history notes; every new `CLAUDE.md` gotcha
cites its source. *Amended 2026-10-24 (Stage 0 F9): the removed tests are the 7 of 0.5's note (count −7).*

Kickoff §7 row: "| **S8 — Retirement + docs** | phase doc S8 | S8.1 | 1 h | last | removed tests listed per file;
setup text matches the code byte for byte |".

## Your work items

1. **Retirement.** Remove `recipes/blackboard/assemble-mcp.ts`, `recipes/blackboard/transcript.ts`,
   `export-file.ts`'s `assemble()` (and anything now dead only because of it), and exactly the 7 tests of 0.5's note.
   Before deleting, confirm by grep that nothing else imports these (recipes, recipes/test, tsconfigs, package.json
   scripts, docs that run them). Keep `--mcp-plan`; its help text names `browser_evaluate {saveTo}`. Edit the
   headers/help texts of `export-file.ts`, `export-grades.ts`, `held.ts` and `recipes/test/blackboard-export-file.test.ts`
   so that `grep -rn "assemble-mcp\|transcript.ts" recipes docs/setup.md` finds only dated history notes (a dated
   note reads like "*Retired 2026-10-25 (Step 10 S8): … was X …*"). If a different number than 7 tests goes, stop
   and state why. A test count that drops without a documented removal is an ESCALATION item.
2. **Docs, quoting user-visible texts byte for byte from the code** (decisions.md #198's rule: every tool
   description, error line, warning line, status line you quote is copied from the source and you cite
   `file:line`):
   - `docs/setup.md`: focus-first on the MCP's trusted tools (fix the stale texts S2 listed: setup.md:148, L280–285,
     L430–431, L922–923 — line numbers as of S2, re-find them); the 800-cap warning (S3.md "Doc texts for S8");
     `browser_evaluate {saveTo}` with the test-device sentence (S4.md "Doc texts for S8", phase doc 0.4); the SDK's
     `evaluateToFile`; `JS_DISABLED` (S4b.md, phase doc 0.12, decisions #219). Also the code count (26 codes, 25 on
     the wire) wherever setup.md states it.
   - `recipes/README.md`: the s10 recipes (find them: `ls recipes | grep -i s10`, plus anything S1/S7 added), the
     `bb-login.ps1` row with the new `-WaitSec` (S5.md's proposed text — check it against the script's param block),
     and the retirement (a dated note; drop the retired files from the index).
   - `README.md` where tool text changed (compare with `mcp/src/tools/registry.ts`).
   - `docs/e2e-test-plan.md:306` per S2's proposal (`S2-builder.md` § "Proposed texts"): a dated note only — never
     edit a row or a run record, nothing inside §4.20–§4.22's rows; history rows (Run records) stay as written.
   - `sdk/src/policy.ts` lines ~19–20: header COMMENT only, per S2's proposal. No code change in that file.
   - `docs/progress-and-roadmap.md`: the Step 10 block (what was built, per stage, with commits — from the as-built
     register `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md` and the stage reports; S8 itself "this
     commit"). Follow `docs/docs-writing-guide.md`.
   Use `*Superseded 2026-10-25: was X, because Y.*` where you change a stated fact in place.
3. **`npx tsc --noEmit -p recipes/tsconfig.s6.json` fails with 26 errors** (S3.md:84, S4.md:174–175, S4b.md:60/114:
   already at `2479301`; reported cause: `recipes/test/s9-rules.test.ts` imports `extension/src/tabs.ts` without
   chrome types). Establish the cause with evidence (which file, which import chain, since which commit — `git log`
   / checking out in a scratch worktree is fine; if you make a worktree, run `npm ci` in it, never a `node_modules`
   junction, and remove it with `git worktree remove`). Fix it ONLY if the fix lies in `recipes/` files or
   `recipes/tsconfig*.json` (e.g. an `include`/`exclude` or `types` entry), and record the cause. Otherwise report it
   with options. Then run every recipes tsconfig (`ls recipes/tsconfig*.json`) and paste each result.
4. **CLAUDE.md proposals** (do NOT edit CLAUDE.md): write
   `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S8-claude-md-proposals.md`: for each change, the location in
   CLAUDE.md, the old text, the new text (with `*Superseded 2026-10-25: …*` notes in CLAUDE.md's style), and its
   source. Contents: (a) every gotcha candidate from S1.md, S2.md, S4.md, S4b.md, S5.md and S7.md (sections
   "Findings"/"gotcha candidates"; also their sub-reports where the candidate originates), each with its source
   (report + item, and the measurement or "by reading"), and your recommendation (add / merge into an existing
   bullet / skip, with why); (b) count and map updates: 26 codes (25 on the wire; `JS_DISABLED`), the new router
   methods (find them in `extension/src/safety.ts` `METHOD_CLASSES` and `daemon/src/methods.ts` — compare with
   CLAUDE.md's "23 router methods"), the new tool count if it changed, test counts (your final `npm test`), the
   45-fixture correction (CLAUDE.md says "A pre-S1 capture of 46 fixtures"; find the source of the correction in the
   stage reports/decisions and verify the actual count in `extension/test/fixtures/snapshot-pre-s1.json`), the new
   key files (diff `git diff --stat 1c43887..HEAD -- '*.ts' '*.ps1' '*.py'` for added files and map them to
   CLAUDE.md's Key files list), the Current state block (as a proposal for the session agent).

INPUTS to read: the phase doc (0.2, 0.3, 0.4, 0.5, 0.9, 0.12 and their dated notes); the as-built register; stage
reports `stage0.md`, `S1.md`–`S7.md`, `S4b.md` and the sub-reports they point to; `docs/decisions.md` #203–#227
(grep `(#2[0-2][0-9])`).

## Lane (anything outside it escalates — write it in your report instead)

- `recipes/blackboard/`: removals, plus header/help-text edits in `export-file.ts`, `export-grades.ts`, `held.ts`.
- `recipes/test/`: removals, plus `blackboard-export-file.test.ts`'s header.
- `recipes/README.md`, `README.md`, `docs/setup.md`, `docs/e2e-test-plan.md` (dated notes outside §4.20–§4.22's
  rows; never edit a row or a run record), `docs/progress-and-roadmap.md`.
- `sdk/src/policy.ts` [header comment only].
- `recipes/tsconfig*.json` and recipe sources [only for item 3's fix].
- The steps dir (your report, the proposals file).
Never edit `docs/decisions.md`, the as-built register or `CLAUDE.md`. No code change in `shared/`, `daemon/`,
`sdk/` (beyond the comment), `mcp/`, `extension/`.

## Lessons learned during Step 10 (verbatim from common.md)

- **Scratch worktrees:** run `npm ci` in the worktree, or remove a `node_modules` junction only with `cmd /c rmdir
  <link>` before removing the worktree — never `rm -rf` / `Remove-Item -Recurse` across it (it emptied the main
  tree's `node_modules/.bin` in S4b; decisions.md · 2026-10-25 · Scratch worktrees never share `node_modules` through
  a junction a recursive delete can follow (#220)).
- **Live waves:** every brief fill-in and bookkeeping edit is committed before a runner starts (Run 14 Return 1, #213).
- **Codes since S4b:** 26 codes (25 on the wire); JavaScript-off refusals answer `JS_DISABLED` (no `data`), bridge off
  `DISARMED {scope:"all"}` (#219).

## ESCALATION list (verbatim)
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

## LESSONS (verbatim)
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

## SPEC-DISCREPANCY PROTOCOL (kickoff §5, lines 352–373, verbatim)

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

## INTEGRITY FLOOR (verbatim)
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
