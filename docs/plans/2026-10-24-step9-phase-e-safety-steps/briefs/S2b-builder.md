# S2b — builder brief (Step 9, stage S2b "Extension UI and the 0.7 log scan")

Written 2026-10-24 by the S2b step agent. Step 9's S2b; Step 8's S2b is unrelated. Read in this order:
`CLAUDE.md` (its "Runtime gotchas" are measured facts and bind); `briefs/common.md` in this directory (ALL of it
is part of this brief: ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, STOP rules and
forbidden fixes bind you verbatim); `.claude/skills/step-agent/role-prompts.md` (Common preamble + §Builder bind
you); then this file.

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

You are a level-2 agent: you must NOT spawn agents. Finish in one go; never wait on background work. Do NOT
commit — the step agent commits after the verifier. Do not reload the extension, touch the real Chrome, start the
real daemon or bind 9234 (socket tests bind port 0). Node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

## Baseline

HEAD `55f4d6e`; `npm test` 2561 passed / 106 files; `npm run typecheck` exit 0; `npm run build` exit 0 with no
tracked file changed. Re-run all three first and record the numbers.

## LANE

`extension/manifest.json`, `extension/options.html`, `extension/src/options.ts`, a pure options-page helper module
beside it if you want one (`extension/src/options-*.ts`, step agent's layout decision), a badge module of its own
under `extension/src/` (e.g. `badge.ts`) plus its start-up and the `chrome.action.onClicked` registration in
`extension/src/sw.ts` (only those additions in `sw.ts`), the log-scan / sentinel / storage-writer / manifest tests
in `extension/test/` (they may *read and import* other packages' sources; they never edit them),
`extension/build.mjs` only if the options bundle needs it. Report:
`docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b-builder.md`. Everything else (incl. `safety.ts`,
`safety-match.ts`, `safety-state.ts`, `router.ts`, handlers, daemon/sdk/mcp/shared code): read only. If you think
one needs a change, stop that line, describe the minimal change, report it — do not make it. In particular, if a
log call site anywhere in the four packages already prints a URL, title, pattern or the token, **report it as a
finding; do not fix it** (it is outside your lane) — allowlist it with a note `KNOWN-VIOLATION` only if the test
must stay green, and say so prominently.

## INPUTS (read them; they bind verbatim)

- Phase doc `docs/plans/2026-10-24-step9-phase-e-safety.md`: Decisions 0.2 (lines ~75–106), 0.5, 0.6 (with the F23
  note), 0.7 (with the F28 note) (~230–300); "### Stage S2" with every dated note and "#### Stage S2b" (~328–388);
  exit checks S2.3, S2.4 and S3.3 with their #141 amendments (~462–520). The S2b checkbox, verbatim:
  > (From S2's checkbox, by content:) manifest `action` + `commands` (`_execute_action`, F20 note above); the
  > top-level `action.onClicked` listener calling S2a's toggle; badge and title (#143), re-derived from
  > `storage.local` at every worker start (Stage 0 F42, #144); the options page (switches, block list with invalid
  > lines marked and counted — 0.6's F23 note — and a link that opens `chrome://extensions/shortcuts`); the 0.7 log
  > scan and sentinel test (0.7's F28 note).
- `docs/decisions.md`: #142 (shortcut = `_execute_action`, `Alt+Shift+K`, one `action.onClicked`, no
  `commands.onCommand`), #143 (badge and title — exact titles), #144 (re-arm within 1 000 ms ignored; disarm never
  debounced; options switch not debounced; badge re-derived at every worker start), #135 (block-list grammar:
  invalid lines kept, shown, not counted), #138 (own pages), #139, #141, #147, #171 (storage keys), #174
  (write-failed), #176 (memory disarm wins); the rest of #132–#180 as context.
- `…-steps/S2a.md` §7 Handoff — the toggle API (`safety.toggle()` outcomes `"disarmed" | "armed" | "ignored" |
  "write-failed"`, a failed **arm** write rejects → show still OFF; `writeSafety(chrome.storage.local.set, {armed?,
  evaluate?, blockList?})`; read with `chrome.storage.local.get([...SAFETY_KEY_NAMES])` + `parseStoredSafety`; key
  strings only via `SAFETY_KEYS`; badge at worker start from `safety.read()`, a rejection → `OFF`). Its §7 S4 rows:
  do not run them. Also `S2a-builder.md` §4 and `S2a-fixer1.md` §3 for the exact signatures.
- `…-steps/stage0-audit.md`: F20, F23, F28, F37, F42, F43, and §6's S2.3/S2.4 wording.
- As-built register `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`.
- Existing code: `extension/src/{sw,safety-state,safety,safety-match,options}.ts`, `extension/options.html`,
  `extension/build.mjs`, `extension/test/sw-static.test.ts` (S2a's AST test — reuse its approach), and for the scan:
  every `console.*` and injected-logger call in `extension/src`, `daemon/src`, `sdk/src`, `mcp/src` (find the
  daemon's injected logger names — `options.log`, `deps.log`, and any other — by reading, and list them).

## GOAL — what to build

1. **Manifest**: add `"action": {…}` (no `default_popup`; a `default_title` is fine — choose one that is not wrong
   in any state, e.g. the extension name) and `"commands": {"_execute_action": {"suggested_key": {"default":
   "Alt+Shift+K"}}}` (#142). Nothing else changes: `permissions`, `host_permissions`, the rest identical. A test
   pins it: permissions list equal to today's, no new top-level key other than `action` and `commands`, the
   `commands` object exactly #142's, no `default_popup`.
2. **Badge module** (pure derivation + thin glue): input = a read state (`{armed, evaluate, …}`), an unreadable
   read, or a toggle outcome (incl. `"write-failed"`, `"ignored"`, an arm rejection) → `{text, color, title}`.
   #143 binds: disarmed → `OFF` red, title "Chrome Agent Bridge — OFF: agents are refused (click to turn on)";
   armed + JavaScript off → `JS` amber, title "Chrome Agent Bridge — armed, JavaScript off (click to turn off)";
   armed → no badge (`""`), title "Chrome Agent Bridge — armed (click to turn off)". `OFF` wins (F37). Unreadable
   state → `OFF`. `"write-failed"` → `OFF` with a title saying the OFF holds but was not saved (wording yours).
   A rejected arm → still `OFF` (title may say turning on failed). Colours are yours (record them). Unit-test every
   state. Glue: `chrome.action.setBadgeText/setBadgeBackgroundColor/setTitle`, never throwing synchronously.
3. **`sw.ts` additions only**: one `chrome.action.onClicked.addListener(...)` at the **top level, synchronously**
   (button and `_execute_action` share it; **no** `commands.onCommand` anywhere) calling `safety.toggle()` then
   the badge; the badge re-derived at every worker start (from `safety.read()`, not awaited at top level — no
   top-level `await`) and on every change of a safety key (hook S2a's existing top-level `storage.onChanged`
   listener or add one at top level — re-read the state rather than trusting the change record). The toggle
   logs **one line** per press, content-free: e.g. `safety: disarmed by the user`, `safety: armed by the user`,
   `safety: re-arm ignored (within 1 s of a disarm)`, `safety: disarm not saved (storage write failed)`,
   `safety: arm failed (storage write failed)` — never a pattern, URL, title or the token. Keep S2a's registrations
   untouched and in their `router.on("name", …)` form.
4. **Options page** (`options.html` + `options.ts`; keeps port + token and their save exactly as today):
   - the armed switch and "Allow JavaScript (`browser_evaluate`)" switch, each saving at once on change through
     `writeSafety` (not debounced, #144), showing a write failure and re-reading the stored state;
   - the block list: a textarea, one pattern per line, saved through `writeSafety` (a Save button is fine);
     invalid lines **marked** (which line, why — use S1's parser from `safety-match.ts`/`safety.ts`, never a
     second grammar) and **counted**; the blocked count shown = valid patterns only (same count the
     `safetyState` event's `blockedCount` uses — reuse that function);
   - reflects changes made elsewhere (the toolbar) live via `chrome.storage.onChanged`;
   - a link/button that opens `chrome://extensions/shortcuts` (an `<a href="chrome://…">` does not navigate from
     an extension page — use `chrome.tabs.create`);
   - logs nothing that carries a pattern/URL/title/token (prefer logging nothing).
   Put the line analysis and the view-model in a pure, tested module; the DOM glue stays thin. Give every control
   a visible `<label>` (S4's UI automation finds them by accessible name — list the names in your report).
5. **0.7 log scan** (S2.3 as #141 words it): a vitest test that uses the TypeScript compiler API to enumerate
   **every** `console.*` call site and every call of the daemon's injected logger(s) in `extension/src`,
   `daemon/src`, `sdk/src`, `mcp/src` and compares the set with a committed allowlist (file + the call's normalized
   source text + a one-line note of what it may print). Fails on a site not in the allowlist **and** on an
   allowlist entry no longer found. Show it red on a mutation adding `console.log("x", url)` in a scratch-copied or
   temporarily edited file (restore it; paste the commands/outputs). Note: a site whose text matches the allowlist
   but whose arguments changed is a different text, so it fails — confirm with a second mutation.
6. **Sentinel test** (0.7's F28 note): drive the gate (S1's decision functions), the matcher, the toggles (S2a's
   store with stubbed storage, incl. write-failed), the badge/toggle log lines, the options-page model, and the
   daemon's safety relay (import its real module; bind port 0 only if a socket is truly needed) with a sentinel
   pattern, URL, title and token; capture every `console.*` and injected-logger line; assert none contains any
   sentinel. Show it red on a mutation that logs a sentinel.
7. **S3.3's `storage.local.set` half** (#141/#147): a static test over `extension/src` — the safety keys are written
   only by the toggle module (`safety-state.ts`) and the options page (`options.ts` / its helper). Make it
   discriminating against indirection: enumerate every `storage.local.set` reference (called or passed as a value)
   and every use of `SAFETY_KEYS`/the key strings, and allow only the named files (plus, if S2a's `sw.ts` passes
   `chrome.storage.local.set` into the store, that one documented injection). Show it red on a mutation adding a
   safety-key write elsewhere (e.g. in a handler).
8. **S2.4 at this close**: after `npm run build`, `grep -c '^import\b' extension/dist/content.js` → 0 and
   `grep -c '^export\b' extension/dist/content.js` → 0; `sw-static.test.ts`'s AST test still green; column-0 grep
   `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` → 0. Add a static test that the
   `chrome.action.onClicked.addListener` call is a statement at the SourceFile level of `sw.ts` and that no
   `commands.onCommand` appears in `extension/src` (red on a mutation moving it into a function).

## Rules that bind (breaking one is an ESCALATION, not a choice)

No top-level `await` in `sw.ts`; every listener registered synchronously at the top level; the content script
stays an IIFE (you do not touch `content/**`); never log a URL, title, header value, body, pattern or the token;
no new permission beyond `action` and `commands`; nothing a page, client or the daemon can call changes the state
(no router method, no `runtime.onMessage`/`onMessageExternal` path to the toggle or `writeSafety`); the options page
stays unreachable by agents (S2a's own-page block — do not touch it). `chrome.*` glue is not unit-tested; pure logic
is TDD — **write each failing test first**, run it, see it fail, then the code. Existing tests pass unchanged; no
expected text edited (forbidden fix). Test count may only rise.

## Report (`S2b-builder.md`)

Built (files) · typecheck/test/build tails pasted with counts (before → after, with the command) · how each exit
criterion is met (test names; mutation commands + outputs, each restored) · the allowlist's size per package and
any `KNOWN-VIOLATION` · the injected-logger names found · `git diff extension/manifest.json` pasted · the new
`console.` lines pasted · Chrome-only facts for S4 rows with expected text (button click → badge/title; shortcut;
`write-failed` cannot be produced live — say so; options page controls; the shortcuts link; the badge at worker
start after a reload while disarmed) · UIA hints (the button's accessible name, each options control's accessible
name) · deviations · proposed decisions (with alternatives) · anything unfinished. Nothing committed.
