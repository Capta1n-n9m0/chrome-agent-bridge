# S5 — builder report (Step 9, stage S5 "Docs")

Date 2026-10-24 · Builder (Claude Opus 5.5) · HEAD `ba6029e` · lane: docs only · nothing committed, nothing
running, Chrome untouched, port 9234 never bound.

## 1. Built

| File | Change |
|---|---|
| `docs/setup.md` | **New `## Safety`** (before § Security notes), subsections: *The kill switch: three ways to turn the bridge off* (button + pinning, `Alt+Shift+K` = `_execute_action` and `chrome://extensions/shortcuts`, the options-page switches, the 1 s re-arm guard, state in `storage.local` survives reload/restart, the badge/title table from `badge.ts`); *What agents see while the bridge is off* (`DISARMED {scope:"all"}` with the extension message and the MCP line verbatim from `safety.ts`/`sdk/src/error.ts`, the `Safety:` line, hidden `listTabs` rows, in-flight work stopped with Run 13 timings, the network log); *The JavaScript switch* (evaluate/`asRef`/`javascript:`/`data:`/`blob:` → `DISARMED {scope:"evaluate"}`, MCP line verbatim, SAFE-6c, Blackboard recipes need it on); *Blocked sites* (grammar table with reserved names only, invalid-line text verbatim from `options-model.ts`, what a block means, **what the block list does not do** — F16, #140, #154, #194's "unmeasured live"); *The bridge never opens its own pages* (#138, #175, SAFE-7/REL-1/7d; ACL-1 not measured); *When the state cannot be read or saved* (unreadable → OFF, `write-failed` incl. S2b verifier F4's options-page mismatch, failed re-arm #190, SAFE-3's background options window); *For scripts* (`client.safety()`, `on("safetyStatus")`, codes, no report, `TabInfo.hidden`). Also: §4 step 6 "pin the button"; `browser_status` table row mentions the `Safety:` line; § Running JavaScript gains a "The JavaScript switch" paragraph; § Security notes: the "no per-domain allow-list yet" sentence superseded in place + a new bullet pointing at Safety; § Troubleshooting: one `DISARMED`/`DOMAIN_BLOCKED` bullet. |
| `README.md` | A "Your controls (Step 9, Phase E safety)" paragraph (three sentences + link); test count 1714/85 → 2720/116 with a dated correction note; Run 13 named with its counts and "ratification open for the user". |
| `docs/progress-and-roadmap.md` | Header Status (Step 9 built, not closed; 23 tools, 25 codes, 2720/116; superseded note); §1 milestone row Step 9; §1 quality "Updated" note; **new §1 Step 9 block** (what exists, tests-per-stage table, Run 13, the 32 open decisions by number + title); §4 "Tab safety" mitigations superseded; §5 roadmap "Updated (Step 9 S5)" note; §5 Phase E paragraph superseded with the as-built summary, plus "Step 10 inputs from Step 9" (#194's four re-measurements). |
| `docs/e2e-test-plan.md` §1 only | A "Step 9 safety wave (§4.20)" helper bullet after the Step 7 one: `s9.ts`, `s9-rules.ts` (+ its test), `s9-actor.ts`, `s9-win.ps1`, `s9-redirect.py`, `tsconfig.s9.json`, the wave sheet, the restore/read-back duty. §4.20 and §5 untouched. |

`git diff --stat`: README.md 18, e2e-test-plan.md 7, progress-and-roadmap.md 107, setup.md 212 lines changed.

## 2. `npm test` (one run, clean tree at `ba6029e`; only the untracked S5 brief and ledger present) and counts

```
 Test Files  116 passed (116)
      Tests  2720 passed (2720)
   Start at  18:53:51
   Duration  20.48s (transform 3.67s, setup 0ms, collect 23.78s, tests 49.86s, environment 17.48s, prepare 19.42s)
```

| Count | Value | Command → output |
|---|---|---|
| Error codes | 25 (9 daemon + 15 extension + 1 SDK; 24 on the wire) | `node --import tsx -e 'import("./shared/src/codes.ts").then(m=>…)'` → `codes 25 daemon 9 ext 15 sdk 1` |
| MCP tools | 23 | `grep -oE '"browser_[a-z_]+",' mcp/src/tools/registry.ts \| sort -u \| wc -l` → `23` (also `grep -A3 "^  reg.tool(" … \| sort -u` → 23) |
| Router methods | 23 | `grep -oE 'router\.on\(\s*"[A-Za-z]+"' extension/src/sw.ts \| sort -u \| wc -l` → `23`; `METHOD_CLASSES` keys → `classes 23` |
| Tests / files | 2720 / 116 | `npm test` above |
| Per-stage counts in the roadmap table | as-built register, per stage | S1's file count 91 is derived (S0's 86 + "5 files" the register states) — not a separate run |

## 3. Greps (on `git diff -U0`, added lines only)

- **#127 (`evaluate|bulk|chunk`)**: 19 hits, all about the JavaScript switch (what it refuses, its MCP line,
  `client.safety()`'s `evaluate` field, the Blackboard recipes loading `bb.js` by SDK `evaluate`, "an agent's
  `evaluate`" in the F16 paragraph). 0 hits for `bulk` or `chunk`. None suggests paging data through
  `browser_evaluate`; the existing "Not for bulk data" paragraph of setup.md is untouched. No contradiction.
- **URLs** (`grep -oE '[a-z]+://…'`): `chrome://extensions` ×1, `chrome://extensions/shortcuts` ×1,
  `extension://` ×1 (from `chrome-extension://`), `file:///…` ×1, `file://server/…` ×1, `https://bank.example/` ×1,
  `https://www.bank.example/login?next=1` ×1 — all reserved or generic.
- **Real hostnames** (`grep -oiE '\b[a-z0-9.-]+\.(com|org|net|az|edu|io|de)\b'`): 0.
- **Token** (read from `bridge.token` inside the command, never echoed; `git diff | grep -cF "$T"`): 0.
- **Wave patterns** (`localhost:8081|:8083`): 0. Names used: `bank.example`, `notbank.example`,
  `bank.example.evil.test`, `a.b.bank.example`, `www.bank.example` (RFC 2606/6761). No IP literal is given as an
  example (described in words).

## 4. Deviations, and register/code disagreements

1. **Brief vs code — `commands.onCommand`:** the brief lists a `commands.onCommand` top-level listener as an
   invariant. The code has none, by decision #142 (`_execute_action` dispatches `action.onClicked`;
   `sw.ts:354-356` says so). The proposed gotcha states the code's form.
2. **Register vs code — `safety` null on disconnect:** the register (S3) says "a new extension hello resets it
   to null"; the code also sets it to null when the extension socket closes, logging `safety state: not
   reported (extension disconnected)` (`daemon/src/intercept.ts:248-255`), matching #132's "null again when
   the extension socket closes". Not a contradiction, the register is just shorter. setup.md says "or `not
   reported` on a fresh connection".
3. **S1 file count** in the roadmap table derived, not run (§2).
4. setup.md's statement that `storage.local` is locked to trusted contexts is marked "built, not measured
   live — row ACL-1 was not run" (S4 NOT MEASURED).
5. Not done by design: the Current state / Resume / Commands / Key files / gotchas of `CLAUDE.md` (§6, proposed
   only); `docs/decisions.md`, the phase doc and the as-built register (§7, proposed only).

## 5. Proposed decisions

### 2026-10-24 · S5: setup.md's Safety section quotes the refusal text from the code, the MCP line as Claude sees it
**Decided:** setup.md quotes the extension's messages (`safety.ts`) and the MCP's one-line forms
(`sdk/src/error.ts` `safetyRefusalLine`) verbatim, each labelled by who sees it; badge titles from `badge.ts`.
**Why:** #158/#164 fix the wording; a paraphrase would drift. **Instead of:** paraphrasing. **Revisit if:** the
wording changes (then setup.md must change with it; no test pins it).
**By:** Claude (S5 build decision)

### 2026-10-24 · S5: the roadmap's Step 9 block lists the 32 open decisions by number and short title
**Decided:** one run-in list in the Step 9 block, the S4 gate item (#192) in bold. **Why:** the brief asks for
title + number; 32 full titles as a list would double the block. **Instead of:** the full titles verbatim.
**By:** Claude (S5 build decision)

## 6. Proposed CLAUDE.md

Each block quotes an existing line (anchor) verbatim, then the action.

**6.1 Current state — Shipped.** Anchor (lines 14–16):
`- **Shipped:** Steps 1–8 (Step 7 — multi-actor tabs — closed 2026-10-23; Step 8 — the SDK surface —` …
`Public on GitHub (MIT). **23 tools, 1714 tests in 85 files** (\`npm test\` 2026-10-24 at \`a1932a8\`).`
→ **replace with:**
```
- **Shipped:** Steps 1–8 (Step 7 — multi-actor tabs — closed 2026-10-23; Step 8 — the SDK surface —
  closed 2026-10-24, as-built `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md`).
  Public on GitHub (MIT). **23 tools, 25 codes, 2720 tests in 116 files** (`npm test` 2026-10-24 at
  `ba6029e`). *Superseded 2026-10-24: was "23 tools, 1714 tests in 85 files (… at `a1932a8`)", because
  Step 9 added two codes and 1006 tests in 31 files (Step 9 as-built, per stage).*
- **Step 9 — Phase E safety — built and E2E-run (Run 13) 2026-10-24**, as-built
  `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`: the kill switch (toolbar button,
  `Alt+Shift+K`, options page), the JavaScript switch, a block list, the own-page block; Run 13 24 PASS /
  7 FAIL / 3 RECORD / 5 NOT MEASURED (live verifier), none shown a product defect. **Not closed:** the
  user rules on Run 13 (#192, the runner's four self-resolved stops) and 31 other open decisions
  (decisions.md → Open decisions → Step 9).
```

**6.2 Current state — Resume.** Anchor (line 24): `- **Resume:** Step 9 — Phase E safety: kickoff
\`docs/plans/next-session-prompt.md\`, phase doc` (through line 28 `is not a bridge client.`) → **replace with**
(conditional on #192, as the brief requires):
```
- **Resume:** the Step 9 gate — the user's ruling on Run 13 (decisions.md · 2026-10-24 · S4: Run 13
  stands as recorded, with the runner's four self-resolved stops listed (#192)) and the Step 9 open
  decisions. If the user ratifies #192, Step 9 closes and the next step is Step 10; if the user asks
  for a re-run of the affected rows (blocks 4–30: SAFE-0…SAFE-4b), that wave comes first, under #193's
  stop rule. Interactive sessions using the bridge need `/mcp` or a fresh session (the daemon build
  changed in Step 9).
```

**6.3 Next after Step 9.** Anchor (line 33–34 end of that bullet): `… \`bb-login.ps1\`'s condition-based post-submit wait, #102); **Step 11** — D3 file upload;`
→ **insert before** `; **Step 11**`: `; and Run 13's four re-measurements — SAFE-5c's redirect half (the
post-redirect `downloadStart` check, unmeasured live), SAFE-POP-1, SAFE-3, SAFE-4 (b) (#194)`.

**6.4 Architecture.** Anchor (line 78): `Network capture is separate and always on: six top-level` →
**insert after the sentence ending** `\`browser_network_requests\` / \`browser_network_clear\` query.`:
```
Since Step 9 every router method runs through one safety gate (`extension/src/safety.ts`, served by
`GatedRouter`): the human's kill switch, JavaScript switch and block list are enforced in the extension,
read from `storage.local` per call, and no wire, daemon or SDK method can change them; the network log
records nothing while disarmed and drops blocked hosts. The daemon only relays the state
(`safetyState` → `safetyStatus`, `daemon.status.safety`) and withholds URLs/titles while disarmed.
```

**6.5 Key files — codes.** Anchor (line 87): `` `codes.ts` (the 23 error codes of spec §10: 22 on the wire, plus `NO_CURSOR`, raised by the SDK `` →
**replace** "the 23 error codes of spec §10: 22 on the wire" **with** "the 25 error codes of spec §10: 24 on the
wire, Step 9's `DISARMED` and `DOMAIN_BLOCKED` among them" and append after that bullet's existing superseded
note: `*Superseded 2026-10-24: was "the 23 error codes … 22 on the wire", because Step 9 S0 added
`DISARMED` and `DOMAIN_BLOCKED` (#133).*` Also in the same bullet's `protocol.ts` list, add after `isLocator`:
"; Step 9's `SafetyState`/`isSafetyState`, `DaemonStatusSafety`, `SafetyScope`/`DisarmedData`,
`HiddenReason`, the `hidden?` row fields, the `safetyState`/`safetyStatus` events".

**6.6 Key files — daemon.** Anchor (line 101): `` `intercept.ts` (`TabLayer`: resolve, lease check, lock, forward with `tabId`; events → handles; the `` →
after `\`retireAll\` on a changed session marker` **insert** "; Step 9: keeps the extension's last
`safetyState` (null until reported and after the socket closes), logs one line per change (booleans and the
count), serves `daemon.status.safety`, broadcasts `safetyStatus`, withholds URLs/titles while the last state
says disarmed, one `listTabs` per change".

**6.7 Key files — sdk/mcp.** Anchor (line 110): `` `client.ts` (`BridgeClient`: calls, events, 4002 reconnect; Step 8's `newTab`, `claim`, `` →
insert after `\`tabs()\`` : "(rows carry `hidden?`, Step 9), Step 9's `safety()` and `on("safetyStatus")`".
In the `error.ts` mention add "; Step 9's `safetyRefusalLine` (one plain line for `DISARMED`/`DOMAIN_BLOCKED`,
no report), re-exported by `report.ts`". Anchor (line 131): `` `browser_wait_for`; `failureReport`/`failedLine`: an attach-set failure on a handle is rendered as the `` →
after `SDK's report plus a PNG` **insert** "; Step 9's `withSafetyRefusals` (a `DISARMED`/`DOMAIN_BLOCKED`
from any tool → one error line), `safetyStatusLine` (`browser_status`'s second text item `Safety: …`),
hidden rows `(hidden: the bridge is off)` / `(hidden: blocked site)`".

**6.8 Key files — recipes.** Anchor (line 145): `` `test/` (part of `npm test`), `tsconfig{,.fe,.s6}.json` (recipes are not in `npm run `` →
**replace** `tsconfig{,.fe,.s6}.json` **with** `tsconfig{,.fe,.s6,.s9}.json`, and **insert before** `` `test/` ``:
"`s9.ts`/`s9-rules.ts`/`s9-actor.ts`/`s9-win.ps1`/`s9-redirect.py` (Step 9 S4, Run 13: SDK rows, their
rules, headless MCP actors, UI Automation of the button/shortcut/options page/worker console, the port-8083
redirect server), ". Superseded note: `*Superseded 2026-10-24: was tsconfig{,.fe,.s6}, because Step 9 S4
added the s9 recipes.*`

**6.9 Key files — extension.** Anchor (line 149): `` listeners), `router.ts` (thrown error → `{code, message, data?}`), `offscreen.ts` (the socket), `` →
**replace** `` `router.ts` (thrown error → `{code, message, data?}`) `` **with** `` `router.ts` (thrown error →
`{code, message, data?}`; Step 9's `GatedRouter`, the only router `sw.ts` builds: `on` throws for a method
with no safety class, unknown → `UNKNOWN_METHOD` in every state) ``, and `` `offscreen.ts` (the socket) `` **with**
`` `offscreen.ts` (the socket; accepts only this extension's non-tab senders, `relay-sender.ts`) ``.
Anchor (line 168): `` `handlers/download.ts` (the service-worker fetch); the other half is `sdk/src/download.ts`. `` →
**insert after:**
```
  Step 9 (Phase E safety; all pure, unit-tested, no log call): `safety.ts` (the gate
  `safetyDecision`, the method table `METHOD_CLASSES` over all 23 router methods — `methodClass` throws
  on an unknown name — the refusal messages, `listTabs`/event redaction, the network predicate),
  `safety-match.ts` (the block-list grammar and matcher, dot boundary only; #135, #156), `safety-state.ts`
  (`SAFETY_KEYS` in `storage.local`, the per-call read that fails closed, `SafetyStore.toggle()` →
  `"disarmed" | "armed" | "ignored" | "write-failed"`, the 1 s re-arm guard, `readStoredArmed`, the
  `safetyState` reporter), `safety-call.ts` (one call's gate at receipt, before each first side effect,
  and the post-check), `safety-debugger.ts` (the session registry `detachAll` at disarm),
  `safety-network.ts` (the ingest filter), `badge.ts` (badge/title by state, `BadgeController.press`,
  one fixed log line per press), `options.ts` + `options-model.ts` + `extension/options.html` (the
  Safety and Blocked sites boxes), `relay-sender.ts` (the offscreen sender check). Tests that guard
  them: `extension/test/log-scan.test.ts` (+ `log-allowlist.ts`, 60 log sites) and
  `log-sentinel.test.ts` (no pattern/URL/token in any log), `safety-writers.test.ts` (only the toggle
  and the options page write the safety keys), `manifest.test.ts`.
```

**6.10 Commands.** Anchor (line 175): ``npm test             # vitest — 1714 passed, 85 files (`npm test` 2026-10-24 at eb6b991; recipes/test included)`` →
**replace with** ``npm test             # vitest — 2720 passed, 116 files (`npm test` 2026-10-24 at ba6029e; recipes/test included)``;
anchor ``npx tsc --noEmit -p recipes/tsconfig.s6.json # recipes typecheck separately (tsconfig.json, tsconfig.fe.json cover the older ones)`` →
replace `tsconfig.s6.json` comment with "(tsconfig.json, .fe, .s6, .s9 cover the others)"; and **append** to the
superseded note after the block (anchor line 181 `Step 8 added 764 tests and 26 files (Step 8 as-built, per stage; 1714 / 85 also at 75f0bd6).*`):
` *Superseded 2026-10-24: was "1714 passed, 85 files (… at eb6b991)", because Step 9 added 1006 tests and 31
files (Step 9 as-built, per stage).*`

**6.11 New gotcha block.** Anchor (line 622): `**Driving Chrome from the outside (live waves, Windows)**` → **insert before:**
```
**Step 9 — safety (2026-10-24; reports in `docs/plans/2026-10-24-step9-phase-e-safety-steps/`)**

- **Every router method passes the safety gate, and a new one cannot skip it.** `sw.ts` serves through
  `GatedRouter` only (`extension/src/router.ts`); `GatedRouter.on` throws for a name missing from
  `METHOD_CLASSES` (`extension/src/safety.ts`, no default class), and `safety-gate.test.ts` scans every
  `router.on("…")` in `sw.ts` against the table (S1.1, three mutants red; the scan is lexical — `router["on"]`
  escapes it, the throw does not; S1.md §6). A new extension method must enter both `METHOD_CLASSES` and
  `daemon/src/methods.ts`. Exempting or reclassifying a method to pass a row is a forbidden fix.
  (By construction + unit tests.)
- **The state lives in `storage.local`, is read per call, and fails closed.** Keys `safety.armed`,
  `safety.evaluate`, `safety.blockList` (`safety-state.ts` `SAFETY_KEYS`); missing keys = armed, JavaScript
  on, empty list; a failed read or a wrong-typed value refuses every call `DISARMED` (#139, #171). Never move
  it to `storage.session` (a reload would re-arm). A disarm held in memory wins over a read that still says
  armed (#176); a disarm whose write fails twice stays disarmed in memory, returns `"write-failed"` and
  lasts until the worker restarts, which reads storage again — armed (#174; S2b report §6 item 6); a
  rejected re-arm write returns memory to disarmed (S2c, #190). Measured cost of the per-call read:
  snapshot round trip median 3.6 → 5.3 ms (Run 13 SAFE-PERF; #139's Revisit-if not met).
- **Nothing on the wire changes the state.** Only `action.onClicked` (`sw.ts`, the button and the
  `_execute_action` shortcut — there is deliberately no `commands.onCommand`, #142) and the options page
  write it (`safety-writers.test.ts`; `storage.local.remove`/`clear` refused everywhere, #188). The
  `action.onClicked` and both `storage.onChanged` listeners are registered at the top level of `sw.ts`
  with no top-level `await`; `storage.local.setAccessLevel({TRUSTED_CONTEXTS})` runs at module scope after
  every listener, guarded, not awaited (#139). The offscreen document acts only on this extension's
  non-tab senders (`relay-sender.ts`, #173). Adding a wire, daemon or SDK method that arms, disarms, edits
  the list or enables JavaScript is a forbidden fix. (By construction + unit tests; ACL-1 not measured.)
- **The matcher matches only at a dot boundary** — `host === p || host.endsWith("." + p)`
  (`safety-match.ts` `patternMatches`); never substring or dot-less `endsWith` (a forbidden fix). The
  50-case table of stage0-audit.md §5 is `extension/test/safety-match.test.ts`. (Unit tests.)
- **Never log a pattern, URL or title from the safety code.** The gate, matcher and state modules have no
  log call; a press logs one fixed line (`badge.ts` `toggleLogLine`); the daemon logs booleans and the
  count (`intercept.ts` `safetyLogLine`). `log-scan.test.ts` allowlists every log site (60 at S2b: extension
  15, daemon 33, sdk 0, mcp 6) and `log-sentinel.test.ts` runs the real daemon on port 0 (#187). Run 13:
  `daemon.log` 210 lines and the worker console 0 for the token, non-fixture `://` and the test patterns
  (SAFE-10).
- **`navigate`/`newTab` are gated on the URL Chrome will open**, so a relative URL that resolves to this
  extension's `options.html` is refused, not just `chrome-extension://…` written out (S2a round-1
  CRITICAL, #175; measured in Run 13 SAFE-REL-1, PASS). `view-source:` of a relative own-page path
  answered `ok` (SAFE-REL-3 `rel`, recorded; what it opened is not shown, #196); every later call on such
  a tab is refused.
- **The disarm reaches running work fast, Chrome's banner does not.** A running trusted `type` ended
  `DISARMED` 14 ms after the press (578 of 1000 characters typed), but the "is debugging this browser"
  banner was still shown 3 s later and gone by +14 s (Run 13 SAFE-4 (b), FAIL, Chrome-owned; re-measured in
  Step 10, #194); a running `waitFor` was refused 54–92 ms after the press (SAFE-4 (a), 4c).
- **`Alt+Shift+K` is assigned as `_execute_action` on Chrome 156** and pressing it left the Windows input
  layout unchanged (`0x04090409` before and after, three layouts installed; Run 13 SAFE-2). The toolbar
  extension button and the Extensions (puzzle) button expose **no UIA Invoke pattern**: pinning and
  pressing need a mouse click at a `FromPoint`-verified point in the driver's own window (Run 13 record
  block 9; S4.md §10 finding 1).
- **Chrome refuses a `javascript:` navigation through the bridge itself**: `NAV_FAILED JavaScript URLs are
  not allowed in API based extension navigations. …`, page unchanged (Run 13 SAFE-6c, JavaScript on,
  record). With JavaScript off the gate refuses first (`DISARMED`, scope `evaluate`, SAFE-6).
- **On a reload the daemon logs `safety state:` before `extension resync`** (by design:
  `daemon/src/intercept.ts` `onSafetyState` vs the resync; Run 13 SAFE-9, a wrong expected text, #195). A
  reload also closes an open options page (SAFE-9 record), and right after it `daemon.status` shows URLs one
  round trip later than the state (S3.md §6, by reading the code).
- **Chrome 156 titles the service worker's DevTools window `DevTools`**, with no extension URL (Run 13
  SAFE-10 set-up, #195).
- **An options page in a background window did not show a `storage.onChanged` re-arm until brought to
  the front** (Run 13 SAFE-3, FAIL; cause undetermined — UIA staleness or deferred rendering; re-measured in
  Step 10, #194). After a `write-failed` disarm the options page shows the stored state ("Bridge armed.")
  while the badge says OFF and every call is refused — the memory disarm is not visible to the page (S2b
  verifier F4, by construction, not producible live). The badge is the indicator.
- **The block list is not a network firewall.** A redirect hop of a bridge `navigate` or `downloadStart`
  onto a blocked host is still requested; the post-check refuses the reply and a download drops its bytes
  (`downloadStart` checks its own URL, then `res.url`, #140, #154). The post-redirect download check is
  unit-tested only: Run 13 SAFE-5c's redirect half timed out on the single-threaded test server (#194).
  A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).
- **Build fact: esbuild keeps comments placed inside array literals** in the bundle (S0 bundle diff, S0.md
  §6 item 3) — keep comments out of literals where a bounded bundle diff is checked.
```

## 7. Proposed dated notes for the phase doc

- Stage S5 checkbox: `- [x]` with `*Done 2026-10-24 (S5 builder, verifier pending): setup.md "Safety" (the three
  controls, the shortcut, what agents see, the JavaScript switch and the Blackboard recipes, the own-page block,
  what the block list does not do), README security paragraph, the roadmap's Step 9 block and Phase E; CLAUDE.md
  changes proposed in S5-builder.md §6 for the session agent.*`
- Outcome (the header's placeholder), for the session agent at close: "**Status:** Built and E2E-run
  (Run 13); gate open (#192)"; bullets: 25 codes (`DISARMED`, `DOMAIN_BLOCKED`); tests 1714/85 → 2720/116 (`npm
  test` at `ba6029e`); one gate over 23 router methods; Run 13 24 PASS / 7 FAIL / 3 RECORD / 5 NOT MEASURED,
  none shown a product defect; four re-measurements carried to Step 10 (#194).

## 8. Unfinished

- `CLAUDE.md`, `docs/decisions.md`, the phase doc and the as-built register are proposals only (§5–§7), by lane.
- No live check of anything written (no Chrome by brief). Markdown anchors were checked by hand against
  GitHub's slug rules (`#safety`, `#the-javascript-switch`, `#blocked-sites`,
  `#when-the-state-cannot-be-read-or-saved`, `#step-9--phase-e-safety-the-kill-switch-the-javascript-switch-blocked-sites-2026-10-24`), not rendered.
