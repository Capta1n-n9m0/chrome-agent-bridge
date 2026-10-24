# S3 — builder brief (Step 9, stage S3 "Daemon relay, SDK and MCP")

Written 2026-10-24 by the S3 step agent. Read in this order: `CLAUDE.md`; `briefs/common.md` in this
directory (all of it is part of this brief: ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL,
INTEGRITY FLOOR, STOP rules and forbidden fixes bind you verbatim); `.claude/skills/step-agent/role-prompts.md`
(Common preamble + §Builder bind you); then this file.

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

## Parallel stage — read this

Stage S1 (`extension/src/safety.ts`, `extension/test/`) runs at the same time in the same working tree.
Touch nothing outside your lane. Files outside your lane in `git status` are S1's — leave them. A failing
or flaky extension test may be S1's work in progress: report it, do not fix it. `npm run typecheck` chains
packages with `&&`: run `npx tsc --noEmit -p <pkg>/tsconfig.json` for shared, daemon, sdk, mcp separately
(and report extension's result as information only). Tests bind port 0 only, never 9234. Do not start the
real daemon. Do NOT commit — the step agent commits after the verifier.

Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every Bash call
that runs node/npm/npx.

## LANE

`daemon/src/`, `daemon/test/`, `sdk/src/`, `sdk/test/`, `mcp/src/`, `mcp/test/`. Your report goes to
`docs/plans/2026-10-24-step9-phase-e-safety-steps/S3-builder.md`. Anything else — `shared/` (the S0 types
are fixed; import, never redefine; a needed shared change ESCALATES), `extension/`, docs, the SDK's exported
VALUE list (`sdk/src/index.ts`'s eight values; new exported TYPES are allowed and are a proposed decision),
MCP tool names or input schemas — escalates: stop that line, say so in the report.

## INPUTS (they bind verbatim; read them)

- Phase doc `docs/plans/2026-10-24-step9-phase-e-safety.md`: "### Stage S3" (lines ~389–396) with its dated
  note; Decisions 0.1–0.7 with all dated amendment notes (lines 24–300), esp. 0.3, 0.4, 0.6; exit checks
  S3.1–S3.3 with #141's stricter wording (lines ~500–520).
- Stage S3 text (verbatim):
  > - [ ] The daemon relays the safety state; `daemon.status` carries it; the SDK exposes it read-only;
  >   `browser_status`'s `Safety:` line; the MCP's one-line rendering of the two codes; both codes stay
  >   out of the attach set (a test).
  > **Lane:** `daemon/src/`, `daemon/test/`, `sdk/src/`, `sdk/test/`, `mcp/src/`, `mcp/test/`.
  > *Amended 2026-10-24 (#145): S3's budget is 2.5 h, in parallel with S1. Its wire shape is #132; its output
  > redaction and hidden-row rendering #134 (0.3's F2/F40 notes, 0.4's F41 note).*
- `docs/decisions.md` rulings #132, #133, #134, #136, #141, #146, #147 (S3 keeps the methods.ts / tool-list
  half of S3.3), #148; and #120 (failure reports stay on; attach set unchanged).
- `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md`: F2, F12, F13, F25, F26, F40, F41, §2
  (Step 8 contracts C1–C7, which must still hold), §6 rows S3.1–S3.3.
- `…/S0.md` §7 Handoff: the shared names to import (`SafetyState`, `isSafetyState`, `DaemonStatusSafety`,
  `SafetyScope`, `DisarmedData`, `isDisarmedData`, `HiddenReason`, `ListTabsRow`, `TabRemovedParams.hidden`,
  `SafetyStateParams`, `isSafetyStateEvent`, `SafetyStatusParams`, `isSafetyStatusEvent`).
- Design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §5, §6, §10 (dated notes bind).
- Step 8 as-built `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md` "Contracts (binding
  forward)": the attach set of 7 codes, `code` required, the session marker, handles never reused, the cursor
  rule, `TAB_HELD`, the lock — all still hold.
- Baseline: HEAD a3ec4f5; 1783 tests / 86 files; typecheck 0; build 0.

## What to build (the step agent's reading of the rulings; where this disagrees with a ruling, the ruling wins — say so)

### Daemon (`daemon/src/`)
1. **Relay (#132).** Accept the extension→daemon event `safetyState` (guard `isSafetyStateEvent`; a malformed
   one is dropped like an unknown event, with a content-free log line). Keep the latest state: `null` until
   reported, `null` again when the extension socket closes. On every change (compare armed/evaluate/blockedCount;
   null→state counts): one log line with booleans and the count only (e.g. `safety state: armed=true
   evaluate=true blocked=0`) — never a URL, title, pattern or the token; broadcast the daemon→client event
   `safetyStatus` (params = the state) to every client. `SafetyStatusParams` is `SafetyState`, not nullable: do
   not broadcast null (a reset to null is visible through `daemon.status` and the existing `extensionStatus`);
   record that as a proposed decision. An identical repeat changes nothing (no log, no broadcast, no listTabs).
2. **`daemon.status.safety`**: `SafetyState | null` (`DaemonStatusSafety`).
3. **Redaction while the last state says disarmed (#134, F2)**: `daemon.status` rows omit `url`; `tabGone` and
   `TAB_GONE`'s data omit `lastUrl`/`lastTitle`. The cache is kept (re-arming restores today's output).
   A `null` state redacts nothing (identical to today).
4. **Cache clearing (#134, F41)**: a `listTabs` row with `hidden: "blocked"` clears that handle's cached
   url/title; a `tabRemoved` with `hidden: "blocked"` marks the handle gone with no `lastUrl`/`lastTitle`
   (today `handles.remove` keeps the cached url when the event has none — fix that for `"blocked"`). A row or
   `tabRemoved` with `hidden: "disarmed"` must not overwrite the cache with `""` (cache kept). On every
   safety-state change, while the extension is connected, the daemon runs one `listTabs` (as `resync` does)
   so a newly blocked tab's cache is cleared within one round trip; a failure of that call is logged
   content-free and never crashes or retries in a loop.
5. **Opener rule (F40)**: `leaseGranted.url` is `""` for a hidden popup, and `fillUrl` stops polling at a row
   carrying `hidden` (the grant goes out at once, not after `URL_FILL_MAX_MS`).
6. Rows passed to clients in `listTabs` replies keep `hidden` and lack `title`/`url` when the extension
   dropped them — the daemon adds nothing back.

### SDK (`sdk/src/`)
7. `client.safety(): Promise<SafetyState | null>` (reads `daemon.status`) and `client.on("safetyStatus", …)`
   in the existing event mechanism — read-only; nothing that changes the state.
8. `TabInfo` (#148): `title`/`url` stay `string`, `""` when absent; add `hidden?: HiddenReason`. The SDK's
   formatters/renderers print `(hidden: the bridge is off)` / `(hidden: blocked site)` from `hidden`.
9. `report()` / the error rendering (`sdk/src/error.ts`): `DISARMED` and `DOMAIN_BLOCKED` render as one plain
   line telling the reader to stop and ask the user, never to retry; `DISARMED` differs by `data.scope`
   (`"all"`: the user turned the bridge off; `"evaluate"`: the user turned JavaScript off, every other tool
   still works). A `DISARMED` without a valid scope is rendered as `"all"` (the stricter reading). Neither code
   enters `ATTACH_CODES` (S3.1 test). Read how `report()` behaves for codes outside the attach set today and
   choose the least invasive place; record it.
10. F25 test: an attach-set failure (e.g. `TIMEOUT`) whose attach calls are answered `DISARMED` → the report
    carries `attachErrors`, and no PNG is written. F26 test: `Tab.click({trusted:true})` while `focusTab` is
    refused `DISARMED` → the trusted action is never sent and the error is `focusTab`'s.

### MCP (`mcp/src/`)
11. `browser_status` prints `Safety: armed | DISARMED by the user · JavaScript on|off · N blocked site(s)`
    (singular "1 blocked site", plural otherwise), or `Safety: not reported (reload the extension)` when null.
    Place it so every existing line keeps its text and order; record where.
12. Hidden rows render as `(hidden: the bridge is off)` / `(hidden: blocked site)` everywhere a row's
    title/url is printed (`browser_list_tabs`, `browser_status`'s `Active tab:` / `Cursor:` / `Human's active
    tab:` lines, any other) — never `undefined`.
13. A tool failing with `DISARMED` or `DOMAIN_BLOCKED` returns the one plain line (by scope for DISARMED) as an
    error result; never a failure report, never a screenshot.
14. No tool is added, removed or renamed; no input schema changes.

### Exit criteria (pre-registered; #141's wording binds)
- **S3.1** `DISARMED` and `DOMAIN_BLOCKED` are not in `ATTACH_CODES` (test).
- **S3.2** `browser_status` prints the `Safety:` line in all four armed × JS states **and** 'not reported',
  singular/plural blocked count; and the MCP line and the SDK `report()` for `DISARMED` differ by `data.scope`
  (`"all"` vs `"evaluate"`), both tested.
- **S3.3** (S3's half, #147) no daemon/SDK/MCP method name is added beyond #132's events: a test diffs the
  `daemon/src/methods.ts` tables and the MCP tool list against Step 8's (hard-code Step 8's lists from
  `git show a3ec4f5:daemon/src/methods.ts` and the 23 tool names); plus run and paste
  `grep -niE "arm|disarm|setSafety|block" daemon/src/methods.ts` and the same over the tool-name list —
  expected empty and exit 1 (if an existing Step 8 name matches, report it verbatim; do not rename anything).
- A **cross-package test over real `ws` on port 0** (model: `mcp/test/multi-actor.test.ts`): real daemon +
  SDK + MCP against a fake proto:2 extension that sends `safetyState` and hidden rows — checks
  `daemon.status.safety`, the `safetyStatus` event at an SDK client, `browser_status`'s line, hidden-row
  rendering, `tabGone` redaction while disarmed, `leaseGranted.url ""` sent without the 2 s wait, the
  listTabs-on-change cache clear, null after the extension socket closes.
- **Old-client compatibility (probe P3)**: a client that does not know `safetyStatus` (e.g. a raw `ws` v2 client
  or an SDK client with no listener) keeps working across a broadcast.
- **Log hygiene test**: the daemon's safety log lines carry no `://`, title, pattern or token (assert on the
  captured log lines in a test).
- **Unchanged while armed / JS on / 0 blocked, and while null**: every existing test passes unmodified; no
  existing test's expected text is edited (forbidden fix). New tests must fail without the change (note which
  you checked).

## Report (`…/S3-builder.md`)
Built (files) · per-package `tsc` results, `npm test` tail with counts (before 1783/86 → after), `npm run
build` tail · the S3.3 grep commands and outputs · which tests cover each item 1–14 and each exit check ·
deviations · Proposed decisions (decisions.md format, contract-level ones marked "for user review") ·
anything unfinished · what S2a's extension must send for the relay to work (event name, params, when).
