# S5 verifier brief — `bb-login.ps1`'s condition-based post-submit wait

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge). Shell: Git Bash on Windows; the script
under test is Windows PowerShell 5.1. Checks: `npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md
first; its "Runtime gotchas" (above all the PowerShell 5.1 traps, "Driving Chrome from the outside", "Chrome
restarts and live sites") bind. HARD RULES: never commit or print the token; never bind anything but 127.0.0.1;
never push, never tag; never run `recipes/bb-login.ps1` (old or new) without `-DryRunBase` on 127.0.0.1 (human gate
G10-3 — the real Blackboard site, a real bb-login run, real credentials — is NOT granted); never touch the user's
tabs or windows (close only windows the script printed, by that handle, after checking class `Chrome_WidgetWin_1`;
stop only servers you started, by PID). Never invent results. Model: Claude Opus 5.5. You are a level-2 agent:
do NOT spawn agents; finish in one go (never return while your own work still runs). You may read and run; you
may NOT edit any file in the repo except your report. Node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Python: `$HOME\miniconda3\python.exe`.

## Role: Verifier (stage S5) — INDEPENDENT

Inputs: the builder's inputs — `briefs/S5-builder.md` (read it in full: the stage texts, exit check S5.1 with its
F10 note, the design, the ESCALATION list etc.) — plus the builder report `S5-builder.md`, which is **claims to
audit, not facts**. The change is uncommitted in the main tree: `recipes/bb-login.ps1` (modified) and 8 new files
in `recipes/fixtures/` (`bb-standin-{delayed,stuck,elsewhere}.html`, `sso-standin-{delayed,stuck,elsewhere}.html`,
`sso-submit-delayed.html`, `elsewhere-landing.html`). Base for "old": `git show 09fa604:recipes/bb-login.ps1`
(unchanged at HEAD's parent chain; check). Other stages (S3) have uncommitted files in the main tree — ignore them,
touch nothing of theirs.

Task:
1. **Re-run every leg yourself** (own python server on a free port other than 8080/8081/8082/8083/8090/9234 —
   e.g. 8091; check it is free first; server stderr to your scratchpad): leg 1 OLD first then NEW on
   `bb-standin-delayed.html` (old 4, new 0); leg 2 NEW `bb-standin-stuck.html` (exit 4, ≥ 90 s and ≤ 95 s from the
   press); leg 3 NEW `bb-standin-elsewhere.html` (exit 4 at the bound, not before); the regressions
   `bb-standin.html` (0), `bb-standin-bad.html` (4, nothing pressed), `bb-standin-otherhost.html` (4, nothing
   pressed). For each: exit code, full output, submit count from YOUR server log, time from the press (computed by
   you from the `invoked` line's timestamp to the last line, not only the script's own print). Use a different
   `-WaitSec` once (e.g. `-WaitSec 20` on leg 2) to show the bound follows the parameter.
2. **Attack the script** by reading it and by experiment where cheap:
   - nothing can be pressed after the first press (every path from `Finish-AfterPress`; `Invoke-Once` reachable?);
     a stuck page that still shows the allowlisted "Sign in" button is the case to watch;
   - the bound counted from the press, every scan and sleep included; can any single step (a scan, the address
     read, a sleep) start before and end well after the deadline? worst case vs 95 s;
   - exit 0 can't be reached off the Blackboard host, with a sign-in control present, with an empty document, or
     with the address changing; a page that redirects to Bb and then away again inside 4 s;
   - nothing before the press changed (compare `git diff` hunks: only the header, `param(...)`, the press stopwatch
     line and `Finish-AfterPress` should differ) and every old parameter / exit-code meaning is kept (the
     `blackboard-ultra` skill boots through it);
   - printing rules held: no URL, path, title, field, value or control name printed; host printed only if Bb or
     SSO-allowlisted;
   - PowerShell 5.1 traps: file is pure ASCII (check bytes > 0x7F), no BOM issues, case-insensitive variable
     collisions (the builder hit `$h`/`$H` once — look for others: `$s/$S`, `$w/$W`, etc. in dynamic scope),
     culture-dependent number formatting, `$ErrorActionPreference='Stop'` paths;
   - the fixtures: exactly one allowlisted button each; each submit leaves exactly one counted line; nothing else
     requests the counter path; the delayed redirect is 12 s; no real host, `example.invalid` only.
3. Re-run `npm run typecheck`, `npm test`, `npm run build` (S5 changes no TS — say what counts you see and whether
   they match the tree without S5's files; a separate `git worktree` at HEAD is the clean way to confirm "before ==
   after"; remove any worktree you add). After the build, `git status --porcelain` shows no tracked change beyond
   the S5 files and other stages' known files.
4. Cleanup: every window your runs left open closed by its printed handle; your server stopped by PID; nothing
   temporary in the repo.

Output: write `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S5-verifier.md`: the per-leg table (exit,
submits, time from the press, verbatim outputs in an appendix), then numbered findings, each with severity
(CRITICAL / MAJOR / MINOR / NIT), location (`file:line`), evidence (command + output excerpt), suggested fix; then
the verdict: **FAIL** if any CRITICAL or MAJOR finding or S5.1 fails; MINOR/NIT only → **PASS-with-notes**; else
**PASS**. Report findings; never rewrite the spec or the plan. Return a ≤ 15-line summary with the verdict.

## ESCALATION, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, LESSONS (verbatim from briefs/common.md)

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


## Decisions and INTEGRITY FLOOR (kickoff §6, lines 374–408, verbatim)

Decisions follow `long-run` §3: build decisions (module layout, test placement, wording of the warning line and the
descriptions, fixture shapes, the release branch's intermediate trees) you take and record `By: Claude`; contract
decisions (0.3's wire field and SDK form, 0.4's transport and SDK method, anything the safety table classifies)
apply a pre-stated rule or the conservative rule and are listed under **Open decisions** in `docs/decisions.md` and
in the as-built register for me at the gate. Only you write `docs/decisions.md`.

**INTEGRITY FLOOR** (verbatim in every brief):

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
