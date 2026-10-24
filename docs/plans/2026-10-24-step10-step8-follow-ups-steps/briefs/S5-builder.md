# S5 builder brief — `bb-login.ps1`'s condition-based post-submit wait

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server + Chrome MV3 extension;
TypeScript; vitest). Shell: Git Bash on Windows; the script under work is Windows PowerShell 5.1. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime gotchas" (above all the
PowerShell 5.1 traps, "Driving Chrome from the outside" and "Chrome restarts and live sites") and "Testing
philosophy" bind. HARD RULES: never commit or print the token (`bridge.token`, `.env`); never bind anything but
127.0.0.1; never push, never tag; never touch the user's real Chrome profile beyond what this brief grants; never
log URLs, header values or bodies. Report in the exact format requested. Never invent results — if something did
not run, say so. Decisions you take go in your report as "Proposed decisions" (date · plain title, then Decided /
Why / Instead of / Revisit if). No internal codes without a one-line gloss. Model: Claude Opus 5.5. You are a
level-2 agent: you must NOT spawn agents. Finish in one go (run long dry runs in the foreground with a timeout, or
in the background and collect them before you report — never return while your own work is still running).
Node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Python: `$HOME\miniconda3\python.exe`.

## Role: Builder (stage S5)

Implement exactly this stage. There is no pure TypeScript logic here (PowerShell recipe + HTML fixtures), so the
proof is the dry runs below, not unit tests. Run `npm run typecheck`, `npm test`, `npm run build` at the end and
paste the tails (S5 changes no TS: expect the same counts as before your change; note that S2 has uncommitted
`mcp/` work in the main tree — do not touch `mcp/` or any S2 file, and say what counts you saw). After
`npm run build`, `git status --porcelain` must show no tracked change you did not make (dist/ is ignored).
Report to `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S5-builder.md`: built (files) · dry-run outputs
(verbatim, per leg, old and new) · submit counts per leg (with the server-log lines counted) · times from the
press · typecheck/test/build tails · deviations · proposed decisions (with the alternatives considered) · README
text proposal for S8 · anything left unfinished. Do NOT commit (the step agent commits after the verifier).

## Stage inputs (verbatim from `docs/plans/2026-10-24-step10-step8-follow-ups.md`)

**0.9 `bb-login.ps1`'s condition-based post-submit wait (user — the item; proposed details).** The item is
decisions.md · 2026-10-23 · SDK-7's MCP leg is re-registered with a cap that fits pp1's export (#102) ("accepted as
a later item"), planned by #129. *Proposed:* after its one press the script polls until it is back on the
Blackboard host with no sign-in control and an address stable for 4 s, at most 90 s, then exits 0; still on the
SSO page, another host, or the bound reached → exit 4, nothing more pressed. Proven by `-DryRunBase` runs on
`recipes/fixtures/` pages served from 127.0.0.1, with a new fixture whose redirect back arrives after 12 s: the new
script exits 0 where the old one (run first on the same fixture) exits 4. A run on the real site needs G10-3.

*Amended 2026-10-24 (Stage 0 F10): the 90 s bound runs from the press to the exit, every scan included; while
polling, any page is tolerated; exit 0 as soon as the Blackboard host shows no sign-in control with the address
stable 4 s; at the bound, exit 4 whatever the page, nothing more pressed. S5.1 is extended, not replaced: (1) the
old-vs-new pair on the delayed-redirect fixture stays (old exits 4, new exits 0); (2) stuck on the SSO stand-in →
exit 4 at ≤ 95 s from the press; (3) a fixture that ends on a non-Blackboard host → exit 4 at the bound; in every
leg the fixture counts submits = 1.* (decisions.md · 2026-10-25 · Stage 0: count corrections, stricter checks, SW-1
as a differential row, the retirement set, bb-login's bound (#209).)

**Stage S5 — `bb-login.ps1`'s condition wait (1 h, any time after S1)**
- [ ] 0.9; the delayed-redirect fixture; dry runs old vs new on it.
**Lane:** `recipes/bb-login.ps1`, `recipes/fixtures/`, the steps dir. Driver-opened windows on 127.0.0.1 only.
**Parallel with:** S2–S4 (file-disjoint; it uses no bridge port). It runs only when no live stage runs.

**Exit check S5.1** on the delayed-redirect fixture the old script exits 4 and the new exits 0; stuck on the SSO
stand-in → exit 4 within 95 s, nothing pressed after the first press; another host → exit 4, nothing pressed
(dry-run outputs in the report). *Amended 2026-10-24 (Stage 0 F10): extended as 0.9's note says — three legs,
"another host" judged only at the bound, ≤ 95 s from the press, submits = 1 in every leg.*

**Human gate G10-3** — any live work beyond the standing grant of fixture waves in the user's profile: the real
Blackboard course, a real `bb-login.ps1` run, any real site, the user's credentials. NOT granted: dry runs on
fixtures only. Never run the script without `-DryRunBase`.

Stage 0 audit F10 (`stage0-audit.md`): "After the press the script sleeps 3 s (`:260`); a final `Get-StableScan`
can take `ScanSec` = 10 s; 3 + 90 + 10 > 95. And 'another host → exit 4' during the poll would stop a real SSO chain
that passes through intermediate hosts."

Kickoff §7 row: "| **S5 — `bb-login.ps1` wait** | phase doc S5 (0.9) | S5.1 | 1 h | beside S2–S4, never during
S1/S7 | old-vs-new on the same delayed fixture; nothing pressed after the first press |"

Compatibility: the `blackboard-ultra` skill boots through this script. Keep every existing parameter
(`-SettleSec -TimeoutSec -ScanSec -DryRunBase -DryRunPage`) and the meaning of every exit code (0 logged in, 2
nothing touched, 4 waits for the user, 1 script error); keep everything before the press unchanged (pre-press
settle, scans, host allowlists, the at-most-one-press rule, what is printed and never printed). Name any change in
your report.

## What to build (step agent's stage-local design — follow it, or say why not in Deviations)

1. **The new post-press wait** (replaces `Finish-AfterPress`'s body; nothing else in the script's logic changes):
   - Record the press instant (immediately before/after `$pat.Invoke()` in `Invoke-Once`, e.g. a `Stopwatch`
     started at the press). New parameter `-WaitSec` (default 90): the deadline is press + WaitSec, and it covers
     every scan and sleep — no `Start-Sleep -Seconds 3` outside it, no `Get-StableScan` (up to `ScanSec`) that can
     run past it. Each poll step must check the remaining time before starting work and use single `Get-Scan`
     calls (a UIA FindAll on a big page can take time — measure and report the worst single scan you saw).
   - While polling: tolerate any page (SSO, an intermediate host, a page with or without a sign-in control);
     NEVER press anything (`Invoke-Once` is not called again; keep its second-press refusal as a backstop).
   - Exit 0 as soon as: host = the Blackboard host (`$BbHost`), the address unchanged for ≥ 4 s, the document
     present with ≥ 1 control, and 0 sign-in matches (`$BbSignIn`) on two consecutive scans ~1 s apart within that
     stable window. (The "≥ 1 control, two scans" part guards Chrome's lazily built accessibility tree — a stricter
     reading of "no sign-in control"; record it as a proposed decision.) Close own window, as today.
   - At the deadline: exit 4 whatever the page, window left open, nothing more pressed. The final line prints
     the elapsed time from the press (ms or s with one decimal), what the last poll saw (counts, yes/no, the
     allowlisted host only — same printing rules as today: never a URL, path, title, field or control name), and
     how many polls ran. Also print the elapsed time from the press on the exit-0 line.
   - Expected worst case: exit 4 at ≤ WaitSec + one poll step (≤ 95 s from the press with the default).
   - Update the header comment (steps 2/6, the `-WaitSec` usage line, the dry-run legs) with a dated note
     ("*Changed 2026-10-25 (Step 10 S5): …, because …*"), file stays ASCII (PS 5.1 reads BOM-less as ANSI).
2. **Fixtures** in `recipes/fixtures/` (served by `python -I -m http.server <port> --bind 127.0.0.1 --directory
   recipes/fixtures`; page names must match the script's `^[a-z0-9-]+\.html$`). Each SSO stand-in has exactly ONE
   allowlisted button ("Sign in"), and every click of it leaves exactly ONE distinctive request line in the server
   log (the submit counter, e.g. a GET of a path used for nothing else) — nothing else may request that path.
   - **delayed** (leg 1): `bb-standin-delayed.html` → SSO stand-in on `localhost`; the submit goes to a page on the
     SSO host that redirects back to `http://127.0.0.1:<port>/bb-standin.html?signedin=1` after 12 s (12 000 ms,
     counted from that page's load).
   - **stuck** (leg 2): the submit is counted but the page stays on the SSO stand-in (the "Sign in" button still
     there — the script must not press it again).
   - **ends elsewhere** (leg 3): the submit leads (possibly via the SSO host) to a page on a non-Blackboard host
     (e.g. `sso.localhost`, which Chrome resolves to loopback itself) and stays there.
   Header comments as in the existing fixtures (what it is, who wrote it, when, how served). No real site, no
   credential, `example.invalid` only.
3. **Dry runs** — a free port first (8090 suggested; check with `netstat -ano | findstr :8090`; never 8080, 8081,
   8082, 8083, 9234), one python server per batch, its stderr log to a file under your scratchpad, its PID noted.
   - Leg 1 OLD first: `git show 09fa604:recipes/bb-login.ps1` into a temp file OUTSIDE the repo (scratchpad), run it
     with `-DryRunBase http://127.0.0.1:8090/ -DryRunPage bb-standin-delayed.html`; expected exit 4. Then NEW on
     the same fixture: expected exit 0. Old-first is pre-registered; if the old exits 0 the pair fails (report it;
     never re-tune the fixture after seeing it).
   - Leg 2 NEW (stuck): exit 4, elapsed from the press ≥ 90 s and ≤ 95 s.
   - Leg 3 NEW (ends elsewhere): exit 4 at the bound (elapsed ≥ 90 s, ≤ 95 s), not before.
   - Regressions NEW: the existing `bb-standin.html` (exit 0, submits 1), `bb-standin-bad.html` (exit 4, nothing
     pressed: 0 PRESSED in the page / no press line) and `bb-standin-otherhost.html` (exit 4, nothing pressed: 0
     `/pressed-otherhost` lines).
   - For every leg: exit code, the script's full output (it prints only counts/yes-no/loopback hosts — check, and
     never paste anything else), the submit count from the server log (count lines matching the leg's submit path;
     the log is loopback-only), and the elapsed time from the press.
   - Run each script as `powershell -NoProfile -ExecutionPolicy Bypass -File <script> …` with stdout redirected
     to a file read as UTF-8 (beware `>` writing UTF-16LE in PS; redirect from Git Bash or use `Out-File -Encoding
     utf8`). The script needs a running Chrome; it opens exactly one new window of its own (else exit 2 untouched).
   - Cleanup: after each exit 4 the script leaves its own window open — close exactly that window (the handle the
     script printed) by `WM_CLOSE` (PostMessage 0x0010), never any other window; after exit 0 it closes it itself
     (check). Stop the python server by its identified PID at the end. Leave no window, server or temp script in
     the repo. Do not touch the user's tabs or windows.

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
