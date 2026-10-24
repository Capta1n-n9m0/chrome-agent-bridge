# S4 prep builder brief (Step 9, stage S4 — E2E live; prep half)

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows (Windows PowerShell 5.1 also
present). Checks: `npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" (especially "Driving Chrome from the outside (live waves, Windows)" and the Step 7/8 bullets)
and "Testing philosophy" bind. HARD RULES: never commit or print the token (`bridge.token`, `.env`);
never bind anything but 127.0.0.1; never push; never touch the user's real Chrome profile — **you are
the PREP builder: no Chrome interaction at all, no extension reload, no `npm run build`, no daemon, no
bridge client, nothing on port 9234** (the live wave is a later agent's). Report in the exact format
requested. Never invent results — if something did not run, say so. Decisions you take go in your report
as "Proposed decisions" (date · plain title, then Decided / Why / Instead of / Revisit if). No internal
codes without a one-line gloss. Model: Opus 5.5. You must NOT spawn agents.

Read in full `docs/plans/2026-10-24-step9-phase-e-safety-steps/briefs/common.md`: it is part of this brief
(LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, STOP rules / forbidden fixes bind you).
Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every Bash call
that runs node/npm/npx. Python for fixtures: `$HOME\miniconda3\python.exe`.

## Goal

Prepare the live wave of Step 9 (Run 13) so that a runner can execute it in order without design work:

1. **§4.20 rows, committed FIRST** (exit check S4.1: rows committed before the build is loaded — `git log`
   order). Write `### 4.20 SAFE rows (Step 9: the kill switch, the JavaScript switch, blocked sites)` into
   `docs/e2e-test-plan.md` after §4.19 and before `## 5.`. One merged table: ID · preconditions/steps ·
   **expected text, written now, exact where the code fixes it** (copy refusal messages, titles, status
   lines and `Safety:` lines from the committed code and rulings, citing file or decision) · how observed
   (which reporter, which UIA read, which transcript line). Every row reads the page's own reporter, a
   refusal's code or a UIA read — "an `ok` is not evidence". Rows marked "record, not a check" say so.
   Commit: `test(e2e): S4 — SAFE rows before the build (Step 9)`, exact file list (the plan file, plus
   this stage's ledger if you touch it — you should not), body says why; trailers below.
2. **Helpers** in `recipes/` (second commit, `test(e2e): S4 — wave helpers (Step 9)`): what the runner needs,
   each typechecked (TS recipes with their own `recipes/tsconfig.s9.json`; `npx tsc --noEmit -p
   recipes/tsconfig.s9.json` exit 0) and with pure logic tested under `recipes/test/` (part of `npm test`;
   run `npm test` and paste the count: 2685 / 115 before + yours). Page code ships as literal strings (tsx
   `__name` gotcha). No product code change: nothing outside `recipes/`, `test-fixtures/` (new fixture files
   only), `docs/e2e-test-plan.md` and the steps dir.
3. **The wave sheet** `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md`: the run order,
   one numbered block per row with the exact commands, and the record template the runner fills
   (`S4-run-record.md` lines: timestamp · row · observed text verbatim · pass/fail vs §4.20). Commit it with
   the helpers.

## Inputs (read; they bind)

- Phase doc `docs/plans/2026-10-24-step9-phase-e-safety.md`: "### Stage S4" with its dated notes; exit
  checks S4.1–S4.4 with #141's stricter wording (S4.3: observed vs pre-written expected text row by row by a
  fresh verifier; S4.4: armed, JS and the **sha256 of the block-list text** read back equal the start's,
  neither the list nor the hash input printed); human gates G9-1, G9-2.
- Row sources to MERGE (keep their IDs; add new IDs for rows only one source has):
  `stage0-audit.md` §7 (SAFE-0…SAFE-11, 1b, 4b, 5b–5d, 6b, 6c, 7b–7d); `S2a.md` §7 Handoff (eleven Chrome-only
  rows incl. SAFE-REL-1/2, view-source); `S2b.md` §7 Handoff (UI rows 1–8 with exact titles, status lines,
  control names, UIA hints); `S2c.md` §7; `S3.md` §6–§7 (the `Safety:` line as browser_status's SECOND text
  item from a live headless transcript — decisions.md #162; the refusal lines as an MCP actor sees them;
  `daemon.status` while disarmed with no `url`; the generation-count delay after a reload).
  Stage 0's four Chrome-only facts get rows too: whether Alt+Shift+K is assigned (and whether Alt+Shift
  switches the Windows input language — read the keyboard layout before/after); whether the action click /
  shortcut wakes the worker (note the 25 s keepalive alarm: if it cannot be put to sleep, the row records
  "not measurable" — pre-register that); whether chrome.debugger can reach this extension's options page
  (SAFE-7c: not measured without an exemption, which is forbidden — pre-register "not measured; blocked
  before attach"); whether Chrome refuses a `javascript:` navigation (SAFE-6c, a record).
- All rulings #128–#191 in `docs/decisions.md` — the expected text follows the rulings AS RULED (several
  S2a/S2b/S3 proposals were ruled with changes; read each). The as-built register
  `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`. The committed code is the as-built contract for
  exact strings: `sdk/src/report.ts` (`safetyRefusalLine`), `mcp/src/tools/registry.ts`, `extension/src/badge.ts`,
  `extension/src/options*.ts`, `extension/options.html`, `extension/src/safety*.ts`, `daemon/src/`.
- Models for rows and records: `docs/e2e-test-plan.md` §1 items 8–9 (`Test-SafeToKill`, the reload script),
  §4.17–§4.19 and §5 Runs 11–12; `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6.md` and its
  run record (how Run 12 ran headless `claude -p` MCP actors: config file, `--strict-mcp-config`, transcript
  capture, `node --import tsx` for long prompts); existing helpers `recipes/t5-win.ps1`, `fe-win.ps1`,
  `t5-lib.ts`, `s6.ts`, `reload-extension.ps1`, `bgf-*.ps1`; fixtures `test-fixtures/`, `recipes/fixtures/`.

## Stage-local decisions already taken by the step agent (apply them; list them in your report)

- **Redirect server on 8083, not 8082**: 8082 is `Bound` on 0.0.0.0 by `SystemSettings.exe` (PID 25896, a
  Windows process). Rows SAFE-5b/5c use 8083. Serve it with a tiny Python or Node script under
  `recipes/` bound to 127.0.0.1 (a 302 to `http://localhost:8081/<page>`; logs request paths only to its own
  stdout file — the runner counts hits, never commits URLs from it... the fixture paths are not secrets, but
  the log greps count `://`).
- **The found state**: the extension in Chrome runs a pre-Step-9 build (no safety keys, no safety UI), so the
  record states that before the build, and the Step 9 state "as found" is the first read after the reload,
  before any toggle: `daemon.status` safety `{armed, evaluate, blockedCount}` and, through the options page in
  the driver's own tab, the checkboxes and the sha256 of the textarea's text. Check in `safety-state.ts` /
  `parseStoredSafety` what absent keys parse as, and pre-write the expected found state (likely armed, JS on,
  0 blocked). The restore (SAFE-11) returns to that state and reads back the same values and hash.
- **The block-list text is never printed or committed.** The read helper prints only `count=<n>
  sha256=<hex>` (hash of the exact textarea value, UTF-8, as read by UIA ValuePattern). Restore needs the
  original text: if the found count is 0 and the text is empty, restore = empty text. If it is non-empty
  (unexpected), the helper saves it to a file **outside the repo** in
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad\s4-found\`
  (never cat'd by any agent), and deletes it after the read-back matches. Never read the Token field.
- **The toolbar button**: an unpacked extension's button is usually inside the Extensions menu. G9-2 grants
  pinning by UIA in the driver's window; the helper records whether it was pinned before, pins if needed, and
  the wave ends by restoring the pin state found (unpin if we pinned). If pinning fails, the runner stops and
  the step agent asks the user once. Match the button by the name prefix `Chrome Agent Bridge` (its title),
  never by a bare name; record the measured accessible name.
- **Driver's own window**: opened with `chrome.exe --new-window http://localhost:8080/<fixture>?s4=<nonce>`
  (http URLs open directly; `chrome://` ones do not — type those into the omnibox of the driver's window).
  Identify it by HWND diff before/after; every UIA action targets that HWND only; never the user's windows
  or tabs. Closing it at the end restores the window set.
- **Actors**: SDK scripts (`npm run recipe -- recipes/s9*.ts …` — the first client spawns the daemon on 9234;
  record its PID) and headless `claude -p --model sonnet` sessions with an MCP config that names only
  `chrome-agent-bridge` (`--strict-mcp-config --mcp-config <file> --allowedTools mcp__chrome-agent-bridge`),
  transcripts saved verbatim (`--output-format stream-json --verbose` or as Run 12 did) under the steps dir as
  `.txt` after a count-grep for `://`/token/patterns (fixture `http://localhost` URLs in transcripts are the
  fixture's own; decide and pre-register how the SAFE-10 `://` count treats committed transcripts — e.g.
  transcripts stay in scratchpad and only extracted lines go in the record, or count rule "0 non-fixture").
- **Test patterns** use fixture names only: `localhost:8081` and reserved names (`bank.example`); never
  a real site.
- **SAFE-4b** needs two clients holding a lock: a second SDK script. Keep it if feasible; if it needs product
  support that does not exist, pre-register it as "record" with the reason.
- **SAFE-REL-2** (what Chrome opens for `chrome.tabs.create` from the worker) needs code running in the
  worker — only possible through DevTools on the service worker, which the driver may open in its own window.
  If that is not cleanly doable by UIA, pre-register it as "not measured" (unit-tested only); do not invent
  a path that changes the gate.
- **Worker console capture (SAFE-10's second half and S2b row 1's console lines)**: attempt by opening the
  service worker's DevTools from `chrome://extensions` in the driver's window and reading the console text by
  UIA; pre-register the fallback "not captured → that half is recorded NOT MEASURED (not a pass)".
- **Rows not producible live** (write-failed disarm, rejected arm write): listed in §4.20 as "unit-tested
  only, not run" so the record is complete.
- **Order** (S4.2): the record's first two lines after the pre-build state are the reload script's exit 0
  and SAFE-0. Rows that toggle state are ordered so that each row restores armed / JS on / list as found
  before the next, except where a row deliberately chains.

## Helpers to provide (suggested; adapt with reasons)

- `recipes/s9-win.ps1` (PowerShell 5.1, UTF-8 output set): open/identify/close the driver window; find,
  pin/unpin and press the toolbar button by UIA (Invoke) and read its name/title/badge; press Alt+Shift+K into
  the driver window (foreground it first; record the keyboard layout id before/after via
  `GetKeyboardLayout`); read `chrome://extensions/shortcuts` for the command's key; open the options page in
  a driver tab (omnibox) and toggle `Bridge on …` / `Allow JavaScript …` by UIA, set/read the textarea, press
  `Save blocked sites`, read the `role=status` lines; `Read-SafetyState` → `armed=<b> evaluate=<b>
  count=<n> sha256=<hex>`; a `Test-SafeToKill` reuse (§1 item 8). Exit codes documented.
- `recipes/s9.ts` (+ `s9-rules.ts` pure, tested): SDK row actions printing one machine-readable line per
  step (`ROW <id> <step> <code|ok> <message>` with the message verbatim — refusal messages carry no host by
  contract; never print a URL, title or pattern from a live read, print counts instead).
- A redirect server script (8083) and any fixture page needed (e.g. an input for the 200-char trusted type
  with an in-page counter; a `visibilitychange` reporter — check `test-fixtures/e2e-playground.html` first).
- An MCP actor runner (Git Bash or `node --import tsx`) writing the config and the transcript.
- A log grep helper printing counts only: `://`, the token (read from `bridge.token` inside the script, never
  echoed), `localhost:8081`, `8083`, `bank.example`, over `~/.chrome-agent-bridge/daemon.log` lines new since a
  mark, and over any file to be committed.

## Commits

Exact file lists (never `dist/`, `bridge.token`, `.env`, `exports/`, a screenshot, or a transcript with
content you have not count-grepped; never `git add -A`); bodies say why; trailers:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW
```

On git index.lock wait and retry; a classifier denial is reported, never retried or worked around. Never push.

## Report

Write `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-prep-builder.md` (commit it with the helpers) and
return its path with a ≤ 15-line summary: built (files) · commits (hashes, in order — rows first) · recipes
typecheck + `npm test` tails with counts · the §4.20 row list (IDs, one line each) · rows pre-registered as
record/not measured and why · deviations · proposed decisions · anything unfinished. Helpers are untested
against Chrome by you — say so; the runner's first steps are their live smoke.
