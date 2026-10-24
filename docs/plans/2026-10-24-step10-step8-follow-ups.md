# Step 10 — the Step 8 follow-ups (MCP focus-first, the 800-cap warning, `saveTo`, the release tag, a live retire row, Step 9's live re-measurements)

**Date:** 2026-10-24 · **Status:** Stage 0 closed 2026-10-25 (`9f91e5f`); next S1. *Superseded 2026-10-25: was
"Planned (kickoff `docs/plans/next-session-prompt.md`, written 2026-10-24)", because Stage 0 closed and its
amendments are applied below as dated notes (`…-steps/stage0.md` §6).*
**Design of record:** this doc's "Decisions"; the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
binds for everything it does not change (§5 layer contract, §6 the human, §10 protocol and codes, with Step 9's
dated notes) · **Roadmap:** `docs/progress-and-roadmap.md` §5 ("Step 10 inputs from Step 9") · **As-built:**
`docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md` (created at the first stage close) · **Steps dir:**
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/` (created at kickoff).

> **PRECONDITION — the Step 10 run starts only after the user has ruled on decisions.md · 2026-10-24 · S4:
> Run 13 stands as recorded, with the runner's four self-resolved stops listed (#192).** The four stops the
> Run 13 runner resolved itself instead of returning (record blocks 4, 8, 9, 30): block 4, a failed restore
> check (a helper bug in the window count, fixed mid-run); block 8, the found-state guard printing STOP (a
> reader bug, fixed, state re-read); block 9, pinning the toolbar button by a real mouse click after UI
> Automation found no Invoke pattern, where gate G9-2 said to ask the user once; block 30, a helper throw after
> the first state change with no restore run. No safety state was changed at any of them, and the final
> read-back equalled the found state by hash. If the user asks for a re-run of Run 13's blocks 4–30 (SAFE-0 …
> SAFE-4b), **that wave runs first**, as Step 10's first live stage, and may carry the re-measurements of 0.10
> (decisions.md · 2026-10-24 · The Step 10 kickoff carries Run 13's live follow-ups as its first wave (#201),
> its "Revisit if"). If #192 is unruled, the session agent stops before Stage 0 and asks.

*Met 2026-10-24: the user ratified Run 13 (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)); no re-run. S1 runs as written. The ruling does not
pre-approve pinning by mouse click: a wave that cannot pin by UI Automation asks the user once (or finds the button
already pinned).*

## Why

Step 8 shipped the SDK surface and Step 9 the human's safety controls. The user's rulings on Step 8's open
decisions (wave W2) left six work items, and Step 9's live wave (Run 13) left rows that failed on tooling or on
an unmeasured Chrome timing. Together they close known gaps: the MCP's trusted tools still answer `ok` and do
nothing on a background tab; a locator can silently act on an element the snapshot never showed; bulk data
reaches a file only by paging it through a model's context; Step 8's history has no squashed release form; the
"retire N ≥ 1 handles on a Chrome restart" branch was never seen live; and Step 9's post-redirect download check
has never run live. The order (Step 10, then D3 file upload, then Phase F) is decisions.md · 2026-10-24 · The
roadmap after Step 8 (#129).

## Outcome (planned; rewritten as results at the close)

- The MCP's trusted `browser_click` / `browser_type` / `browser_press_key` call `focusTab` first, as the SDK's
  `Tab` does (`sdk/src/policy.ts` `"focusFirst"`); a trusted MCP action on a background fixture tab lands.
- A locator that resolves to an element past the snapshot's 800-element cap carries a warning to the SDK and the MCP.
- `browser_evaluate {saveTo}` writes the value to a file and returns only path, size and sha256; S6.3 is redone
  through it and the 53-chunk recipe (`recipes/blackboard/assemble-mcp.ts`, `transcript.ts`) is retired.
- A `step8` release branch whose commits carry Step 8's six Part messages, with `main` untouched; the tag at
  the user's grant.
- Live: Run 14 (Step 9's re-measurements) and Run 15 (Step 10's own rows, the N ≥ 1 retire row at the user's
  grant), each leaving the safety state as found. Baseline: `npm test` 2720 passed / 116 files at `f45e3bf`.

## Decisions

**(user)** marks a choice the user already ruled (cited by date + title); the *what* is fixed, the *how* below
it is proposed. Everything marked **(proposed)** is recorded by the session agent in `docs/decisions.md` before
Stage 0 is spawned, so the audit can attack it; a wrong premise is a finding, and the decision gets a dated note.

### 0.1 Precondition and the order of the live waves (proposed — after #201)

- Nothing starts until #192 is ruled (the box above). The ruling decides the first live stage: a re-run of
  Run 13's blocks 4–30 if the user asks for one (it may carry 0.10's rows), else 0.10's wave alone.
- Two live waves, each alone: **Run 14** (stage S1, 0.10) on the build already on disk — Step 9's code
  unchanged, daemon build `99bb55c5…` — before any Step 10 code lands, so it measures exactly what Run 13
  measured; **Run 15** (stage S7) after the code stages, on the Step 10 build.
- Every live runner works under decisions.md · 2026-10-24 · S4: Live runners return on every stop; one stop rule
  for sheet and brief (#193): a level-2 runner may fix a helper only between rows with no observation, never past
  a STOP line (a restore failure, a guard, a human gate such as pinning); any throw from the first state change on
  runs the restore first, then returns.

### 0.2 The MCP's trusted tools focus first (user)

decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools focus first too (#106): the
MCP's trusted `browser_click` / `browser_type` / `browser_press_key` also call `focusTab` first — the tab comes to
the front and stays. This replaces "the MCP's trusted tools keep today's behaviour" (`sdk/src/policy.ts` header).
*Proposed details:*
- In `mcp/src/tools/registry.ts`, with `trusted: true` (ref or locator target): `focusTab {tab}` on the resolved
  handle, then the action on the **same** handle. A `focusTab` failure is the tool's answer; the action is not sent.
- Untrusted actions never focus (the extension's own CDP escalation of a failed content action stays out of the
  MCP's sight, as in the SDK; `policy.ts` header, "One case escapes the SDK").
- The three tool descriptions say that `trusted=true` brings the tab to the front of its window first and leaves
  it there. Tool names and schemas are unchanged (no new parameter).
- `focusTab` is the one call that runs `windows.update({focused:true})`; the MCP calls it and adds focus nowhere
  else. It takes the visibility lock (`daemon/src/methods.ts`) and passes the safety gate (disarmed → `DISARMED`
  before any input).
- The MCP cursor does not move: an explicit `tab` and the cursor's tab are focused alike, and focusing is not
  `browser_select_tab` (`CLAUDE.md`, "The MCP cursor never follows the human …").
- *Amended 2026-10-24 (Stage 0 F19): a known limit — focus and input are two calls (`focusTab` holds the visibility
  lock only for itself), so another actor's default capture in the same window can come between them and the input
  lands on a background tab answering `ok` (the SDK has the same gap); MCPF-1 (one actor) cannot show it. Revisit
  if a live row sees it.*

### 0.3 A warning when a locator resolves past the snapshot's cap (user)

decisions.md · 2026-10-24 · S1's locator details are ratified; a locator past the snapshot's cap warns (#117): when
a locator resolves to an element past the snapshot's 800-element cap (one the snapshot never showed), the SDK and
the MCP say so. *Proposed details:*
- **Definition.** The page's listable elements (what `buildSnapshot` lists, by `a11y.ts`'s one walk) number more
  than 800, and the match comes after the 800th of them in walk order. A `{text}` or `{css}` match that is not
  listable is "past the cap" only when it comes after the 800th listable element in walk order. Nothing changes
  on a page with ≤ 800 listable elements.
- **Wire.** `LocateResult` (`shared/src/protocol.ts`) gains an optional `pastSnapshotCap?: true`, set only then;
  an action resolved from a locator (`extension/src/handlers/target.ts`) carries the same flag on its reply. Absent
  otherwise, so old clients see today's results byte for byte. Contract-level: conservative rule, listed under
  Open decisions.
- **SDK.** `tab.locate()` returns the flag; for actions the SDK must not change an existing return type —
  Stage 0 rules between a field on the action's result object (where one exists) and a client event
  (`client.on("warning", …)`), choosing the form that leaves every Step 8 signature as it is.
  *Amended 2026-10-24 (Stage 0 F5): the SDK form is (i) `LocateResult` gains the optional `pastSnapshotCap?: true`
  (so `Tab.locate()` returns it) and (ii) a client event `client.on("warning", (w: {tab: string; method: string;
  kind: "pastSnapshotCap"}) => …)` — a new overload of `on`, emitted by the SDK for an action whose reply carries the
  flag, never carrying the locator or the element's text. No action's return type changes; `S3.3` asserts each Step 8
  signature by type equality.* (decisions.md · 2026-10-25 · Stage 0: the cap warning reaches SDK actions as a client
  event (#206); contract-level, open for the user.)
- **MCP.** One extra line after the tool's normal answer: `Warning: this element is past the snapshot's
  800-element cap — browser_snapshot does not list it.` (wording a build decision; never the element's text).
- **Never** a change to `a11y.ts`'s rules, `locate`'s matching or the snapshot's output to make the warning appear
  (`CLAUDE.md`, "Locators are resolved by the snapshot's own rules — change `a11y.ts`, not two places").
- *Amended 2026-10-24 (Stage 0 F18): `waitFor {locator}` carries no flag; the count stops measuring at the 800th
  listable element.* (decisions.md · 2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential
  row, the retirement set, bb-login's bound (#209).)

### 0.4 `browser_evaluate {saveTo}` (user)

decisions.md · 2026-10-24 · Bulk data through `browser_evaluate` was a test device only; the MCP gets a `saveTo`
path (#127): the MCP gains a way to move bulk data without the model's context — `browser_evaluate {saveTo:
<path>}` writes the value to a file and returns only path, size and sha256, as `browser_download` does; the tool
description says chunked paging is a test device only. *Proposed details:*
- **Transport — decided at Stage 0 by measurement, smallest change first.** (A) No new wire method: the MCP sends
  one `evaluate` and writes the envelope's `value` (kept whole by `extension/src/evaluate/result.ts` `cap()`, which
  trims only `description`) — only if Stage 0 measures that a string value of at least 64 MiB crosses
  `chrome.debugger` → service worker → offscreen document → WebSocket → daemon → client whole; the serialiser's
  array and depth limits (100 items, depth 6) still apply to non-strings, so (A) saves a string as is and a
  non-string through `JSON.stringify` **in the page**. (B) Otherwise an extension-side store like
  `DownloadStore` (TTL, a few entries, cleared at disarm) and a chunked pull of 1 MiB per call, as
  `downloadChunk` does. (B) adds extension methods: each enters the safety table (class of `evaluate`, so the
  JavaScript switch and the kill switch refuse it — `GatedRouter.on` throws on an unclassified method) and the
  daemon's method table (`daemon/src/methods.ts`), and the store is dropped at disarm. Recommendation: (A) if the
  measurement holds, else (B). Either way contract-level, listed under Open decisions.
  *Amended 2026-10-24 (Stage 0 F1): Stage 0 measured the host leg on port 0 — one result frame crosses daemon →
  client whole up to 99 MiB (UTF-8 bytes) and above 100 MiB (`ws`'s default `maxPayload`, set nowhere in the repo)
  the daemon closes the extension socket (1009), failing every actor's call `NOT_CONNECTED`; the Chrome leg
  (`chrome.debugger` → worker → `runtime.sendMessage` → offscreen → WebSocket) is not measurable without Chrome. No
  measurement shows ≥ 64 MiB crossing the whole path, so by this decision's own rule the transport is (B). (A) is not
  built. The threshold, where it is cited, is in UTF-8 bytes of the frame, not characters.*
  *Amended 2026-10-24 (Stage 0 F2): under (B) no frame grows with the value — the evaluate-to-store path slices
  **also on the CDP leg** (a holder object's `objectId` and `Runtime.callFunctionOn` slices of ≤ 1 MiB within one
  debugger session, never one CDP reply of the whole value), and S4's lane names `extension/src/debugger.ts`. A size
  refusal for plain `evaluate` would be a new refusal (a contract change): recorded under Open items, not built in
  Step 10 unless ruled.*
  *Amended 2026-10-24 (Stage 0 F4): (B)'s new methods carry the tab (`tab` on the wire, a `tabId` at the extension):
  they enter `daemon/src/methods.ts` `TAB_METHODS` (lease-checked, not the lock) and `METHOD_CLASSES` as
  `"evaluate"`, so the kill switch, the JavaScript switch and the block list refuse each pull and only the tab's
  holder can pull. The store is dropped at disarm, on JavaScript off, on the tab's close, and after a TTL. The
  extension never receives the path; a pull after the store is lost (a worker restart) is refused and `.part`
  removed (test).*
  (F1, F2, F4: decisions.md · 2026-10-25 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls (#205);
  contract-level, open for the user.)
  *Amended 2026-10-24 (Stage 0 F25): the serialiser also has `maxString: 5000` (`extension/src/evaluate/serialize.ts`),
  which truncates nested strings, beside the 100 items and depth 6 named above.*
- **File rules** as `browser_download` (`sdk/src/download.ts`): `saveTo` absolute, a file path; an existing file
  is refused unless `overwrite: true`; written to `<path>.part` then renamed; `.part` removed on failure; sha256 of
  the bytes written. Strings are written as UTF-8 without a BOM.
  *Amended 2026-10-24 (Stage 0 F11): `saveTo` refuses with `BAD_PARAMS` a relative path, an existing directory, a
  missing parent directory (nothing is created), an existing file without `overwrite: true`, and an existing
  `<path>.part` (opened exclusively, `"wx"`); a refusal leaves no file.*
  *Amended 2026-10-24 (Stage 0 F12): the bytes are the value's UTF-8 as `TextEncoder` makes it (a lone surrogate
  becomes U+FFFD), and tests hash the page side the same way; a Node, Map, Set, function, symbol or `undefined`
  value is `BAD_PARAMS` before anything is stored; a throw from `JSON.stringify` is `PAGE_ERROR`.*
  (F11, F12: decisions.md · 2026-10-25 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s
  (#207); contract-level, open for the user.)
- **The answer** is `Saved <path>` and `<bytes> bytes · <kind> · sha256 <hex>` — no part of the value. `asRef`
  with `saveTo` is `BAD_PARAMS`. A value of kind `undefined`, `node` or `function` is refused `BAD_PARAMS` (nothing
  to save).
- **Description.** The tool description gains: `Paging bulk data through browser_evaluate in chunks is a test
  device only, never a supported pattern: pass saveTo to write a large value to a file instead.`
- **SDK.** The SDK's public surface is exactly eight values (`sdk/src/index.ts`); a ninth export is a contract
  change. Proposed: a `Tab` method `evaluateToFile(expression, {path, overwrite?, timeoutMs?})` and no new
  top-level export (conservative).
- **Logs.** Nothing logs the value or the path (the Step 9 log scan, `extension/test` and the sentinel test,
  extended with a sentinel value and path).

### 0.5 S6.3 redone through `saveTo`; the chunked recipe retired (user — #127; proposed details)

- **Fixture leg (no grant needed):** a fixture page builds and holds a synthetic export of about 420 000
  characters (the size of the Step 8 pp1 export, 418 406 characters, #102), made of reserved names only. The SDK
  leg reads it as `export-grades.ts` does today; the MCP leg is one `browser_evaluate {saveTo}` by a headless actor.
  PASS = equal sha256 for both files and the page's own hash; the actor's transcript holds no 32-character run of
  the export (counted, never printed).
- **pp1 leg (human gate G10-3):** the same on the user's course, as in decisions.md · 2026-10-23 · S6.3 compares one
  in-page export read through both paths (#103), only under a fresh grant for the course and the login.
- **Retirement:** after the fixture leg passes, `recipes/blackboard/assemble-mcp.ts`, `transcript.ts` and the tests
  that cover only them are removed, `recipes/README.md` and `docs/setup.md` updated; the removed test count is
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

### 0.6 A squashed `step8` release branch; the tag at the user's grant (user)

decisions.md · 2026-10-24 · S7.3 is met by the commit map; a squashed `step8` release tag carries the Part
messages (#125): a squashed release branch or tag `step8` whose commits carry the Step 8 phase doc's listed Part
messages; `main` is not rewritten. *Proposed details:*
- A **local** branch `release/step8` from Step 8's base commit, whose final tree is byte-identical to `main` at
  Step 8's close commit (Stage 0 names both commits from the Step 8 as-built and `S7.md` §4). Its commits carry,
  in order, the six messages of the Step 8 phase doc (S7.3 list): `feat(extension): locators resolved by the
  snapshot's rules; waitFor locator; evaluate asRef`, `feat(sdk): typed Tab API with cursor and locators`,
  `feat(sdk): failure reports with snapshot, screenshot and network`, `feat(mcp): cursor that does not follow the
  human; browser_use_active_tab; locator fields`, `feat(recipes): hello, boot-bb, export-grades`, `docs: Step 8 E2E
  results`. Since the stage commits interleave (S7.md §4's map), the intermediate trees are a build choice (Stage 0
  rules: per-Part cumulative trees if they apply cleanly, else one squashed tree carrying all six messages); only
  the final tree is pinned.
  *Amended 2026-10-24 (Stage 0 F7; listed for the user — a third layout beyond this decision's two): base `70aa754`,
  close `a1932a8`. The branch uses Variant C (stage0-release-trees.txt): Parts 1–5 = the code changes of their
  commits (S7.md §4's map; recipe commits `6398f27 bc78ded 036909f 7c16a00 75f0bd6` in Part 5, `201f5c8` in Part 4),
  docs held at the base; Part 6 = the close tree. Intermediate trees are not buildable (Part 1 precedes the shared
  types); only the final tree is pinned. Each commit carries `Co-Authored-By: Claude Opus 5.5` (as all 60 originals)
  and the S6 session's `Claude-Session` line, and its body lists the original commits it carries.* (decisions.md ·
  2026-10-25 · Stage 0: `release/step8` from `70aa754` to `a1932a8`, Variant C (#208); contract-level, open for the
  user — the single squashed tree remains the conservative alternative.)
- **Human gate G10-1:** creating the annotated tag `step8` and pushing the branch or the tag. decisions.md · 2026-10-24 · The user grants the skill edit, the data deletion and the push at Step 8's close (#105) said "Push is
  allowed" was given at Step 8's close and is not read as a standing grant.

### 0.7 A live row that retires N ≥ 1 handles on a killed Chrome (user)

decisions.md · 2026-10-24 · SM-1's and LOC-1's re-registered text is ratified; a live row exercises N ≥ 1 retires
(#126): a pre-registered live row ends Chrome without an orderly quit, so the session-change path retires N ≥ 1
held handles live (Run 12 saw only `0 handles retired`, because `chrome://quit` closes every tab first).
*Proposed details:*
- Row **RET-1**: an SDK recipe holds a handle on a fixture tab; the driver kills Chrome's identified processes
  (`Test-SafeToKill`), relaunches it the way `recipes/bgf-launch.ps1` does (breakaway, clean environment), and
  session restore reopens the tabs. PASS = `daemon.log` shows `extension session changed: <n> handles retired`
  with n ≥ 1; the holder got `tabGone` for that handle with its pre-kill URL (a fixture URL); a call on the old
  `Tab` answers `TAB_GONE` or `TAB_UNKNOWN`, never acting on another tab; the safety state read back equals the
  found state (it lives in `storage.local`).
- **Human gate G10-2:** the kill and the relaunch of the user's real Chrome. Blind spots for Stage 0: Chrome's
  "Restore pages?" prompt after a crash versus automatic session restore (the profile's start-up setting); the
  user's own tabs coming back; a window handle not surviving the restart (`CLAUDE.md`, "Chrome restarts and live
  sites").
- *Amended 2026-10-24 (Stage 0 F16): RET-1 runs only with the found state armed (else 'not run — disarmed as
  found'); its PASS does not depend on session restore or the 'Restore pages?' prompt; G10-2's request names that
  unsaved form data in the user's open tabs is lost.* (decisions.md · 2026-10-25 · Stage 0: count corrections,
  stricter checks, SW-1 as a differential row, the retirement set, bb-login's bound (#209).)

### 0.8 The ~1.5 s failure-report screen switch (proposed: measure, then decide)

A failure report's screenshot is an ordinary default-mode capture, so it switches the window to the failed tab for
about 1.5 s (decisions.md · 2026-10-24 · Failure reports stay on by default (#120): "The ~1.5 s screen switch stays
a carried input"; that ruling turned down "a screenshot only when the failed tab is already in front"). Run 12 REP-0
already suggests where the time goes: the failed tab was `visible` at +20 ms but the call took 1344 ms, which fits
`activateForCapture`'s 1000 ms wait for `onActivated` running to its bound (`CLAUDE.md`, "The switch flash is ~1.5 s,
not a frame": "suggests `onActivated` does not end the wait (unconfirmed)").
- **Stage 0** reads `extension/src/tabs.ts` `activateForCapture` and says, from the code, whether `onActivated` can
  end the wait as written.
- **Run 15 row SW-1** (pre-registered): page-side `visibilitychange` stamps on the human's fixture tab and the failed
  fixture tab, plus the call's duration, three trials. Outcome table written before the run: the failed tab visible
  ≤ 100 ms after the call starts **and** the call ≥ 1000 ms in 3/3 → the wait runs to its bound → a fix stage S7b
  (the listener ends the wait; the 1000 ms bound and the 50 ms settle stay as they are) with its own re-measure row;
  otherwise → recorded, no change, and the carried input closes.
  *Amended 2026-10-24 (Stage 0 F3): Stage 0 read `showTab` (`extension/src/tabs.ts:249-271`): `onActivated` for the
  target ends the wait as written. That listener has been in the code since T3 (`43c0a53`, 2026-10-22), before Runs
  8, 9 and 12 measured ~1.3–1.5 s, so the measured time was taken with this code: either the event is missed (it is
  registered only per call — `sw.ts` has no top-level `tabs.onActivated` listener) or the capture itself is slow.
  SW-1 is a differential row: per trial, (i) a default-mode screenshot of a background fixture tab in the human's
  window and (ii) one of a fixture tab already in front of the same window, ≥ 1.5 s apart, three trials; d =
  client-measured duration of (i) − that of (ii). d ≥ 950 ms in 3/3 → the wait runs to its bound → S7b first names
  the mechanism (a top-level listener would touch the 'listeners at the top level of `sw.ts`' invariant and
  escalates); d ≤ 300 ms in 3/3 → the event ends the wait, recorded, no change, the carried input closes; anything
  else → undetermined, recorded, no change. The `visibilitychange` stamps stay as a record.* (decisions.md ·
  2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential row, the retirement set,
  bb-login's bound (#209).)
- Never lower the 1000 ms or 50 ms waits without a measurement; never add window focus to the capture.

### 0.9 `bb-login.ps1`'s condition-based post-submit wait (user — the item; proposed details)

The item is decisions.md · 2026-10-23 · SDK-7's MCP leg is re-registered with a cap that fits pp1's export (#102)
("accepted as a later item"), planned by #129. *Proposed:* after its one press the script polls until it is back on
the Blackboard host with no sign-in control and an address stable for 4 s, at most 90 s, then exits 0; still on the
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

### 0.10 Step 9's live follow-ups: the first live wave (proposed — #194, #196, #201)

From decisions.md · 2026-10-24 · S4: SAFE-5c's redirect half, SAFE-POP-1, SAFE-3 and SAFE-4(b) are re-measured in
the next live wave (Step 10) (#194) and · S4: SAFE-REL-3 prints a URL class, not "withheld" (#196). New row IDs in a
new `docs/e2e-test-plan.md` §4.21; the §4.20 rows and their Run 13 results are never edited (dated notes only, as
decisions.md · 2026-10-24 · S4: Dated notes on §4.20 for two expected-text errors (#195)).
- **R14-5c** — SAFE-5c's redirect half with a threaded redirect server on 8083 (`ThreadingHTTPServer`; 8083 per
  decisions.md · 2026-10-24 · S4: The redirect server uses port 8083 (#197)). Positive control before the row: two
  concurrent requests to 8083 both answered within 1 s. Expected: SAFE-5c's own text for the redirect half
  (`DOMAIN_BLOCKED That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the
  user.`), no file written, and SAFE-5c's server-log counts (the 8083 hop logged once; the 8081 target logged once,
  since the hop is still requested — the documented limit of #140). This is the first live run of the post-redirect `downloadStart` check (decisions.md ·
  2026-10-24 · `downloadStart` and redirects onto a blocked host (#140)).
- **R14-POP-1** — SAFE-POP-1's expected text, with the recipe claiming the opener tab first (its claim line precedes
  the click in the output).
- **R14-3** — SAFE-3's expected text, with the options window visible (not covered) beside the driver window,
  checked by window rectangles before the toolbar click.
- **R14-4b** — the disarm during a trusted `type`: the call ends `DISARMED` with 0 < k < 1000 characters typed
  (SAFE-4 (b)'s product clauses); then, after re-arming, a trusted call on the same tab succeeds with no "another
  debugger" error (the session was detached). The banner is polled every 250 ms for at least 20 s and its lifetime
  is a **record**, not a pass rule: SAFE-4 (b)'s "banner gone ≤ 1 s" stays FAIL for Run 13 and is not re-judged, and
  no new bound is chosen after seeing 14 s.
- **R14-REL-3** — SAFE-REL-3's `rel` leg prints the URL class (wrapper scheme, inner scheme, own page yes/no),
  never the URL.
- The wave records the safety state as found (armed? JavaScript? the block list counted and hashed, never printed),
  restores it and reads it back equal (sha256 of the list text).

### 0.11 Nothing in Step 10 changes the safety boundary (proposed)

Step 9's invariants hold unchanged: one gate in the extension over every router method (`GatedRouter`); a new
extension method enters the safety table or `GatedRouter.on` throws; no wire, daemon, SDK or MCP method changes the
safety state; the state is read per call and fails closed (decisions.md · 2026-10-24 · The state is read per call,
fails closed, and is locked to trusted contexts (#139)); the extension's own pages stay blocked; nothing logs a
pattern, URL, title, the token, an evaluated value or a `saveTo` path. With the bridge armed, JavaScript on and an
empty block list, every Step 9 test and tool behaves as at `f45e3bf`.

### 0.12 A new code `JS_DISABLED` for "JavaScript is off" (user)

The user changed Step 9's #133 (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)): while the human has turned JavaScript off,
`evaluate` (with or without `asRef`) and a `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL (#138) are
refused with a new code **`JS_DISABLED`**, not `DISARMED` with `data.scope: "evaluate"`. Spec §10 is amended first
(dated note); `shared/src/codes.ts` goes to 26 codes (25 on the wire); the extension's refusal (`safety.ts`), the
SDK's `safetyRefusalLine` and the MCP's one-line rendering ("the user turned JavaScript off; every other tool still
works; ask them") follow; `JS_DISABLED` stays out of the failure-report attach set. While the bridge is off,
`DISARMED` (scope `"all"`) still wins over `JS_DISABLED`. *Proposed, for the audit:* `DISARMED` keeps its
`data.scope: "all"` for compatibility, and `"evaluate"` is no longer produced. The tests that pinned
`DISARMED scope:"evaluate"` change their expected text **by this ruling**, each listed per file in the stage report
(this is a contract change the user ordered, not the forbidden "edit a test's text to match a changed error").

*Amended 2026-10-24 (Stage 0 F17): the SDK and MCP keep rendering `DISARMED {scope:"evaluate"}` as the
JavaScript-off line (an old extension); `SafetyScope` keeps its two values; S4b.2 adds that case.* (decisions.md ·
2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential row, the retirement set, bb-login's
bound (#209).)

## Stages

**Lane** is the explicit grant a step agent needs under the `step-agent` ESCALATION list. Budgets are estimates.

### Stage 0 — Spec audit (1.5 h, first, alone)
- [x] The four lenses of the kickoff §4 over this doc; Step 9's contracts re-executed on port 0 (the as-built's
      "Contracts (binding forward)"); counts recomputed (23 router methods, 25 codes, 23 tools, 2720 tests / 116
      files); 0.4's transport measured or shown unmeasurable without Chrome (then S4 measures it first, live-free
      where possible); 0.6's base and close commits named; 0.8's code reading.
**Lane:** the steps dir; read-only elsewhere; port 0 only.
*Done 2026-10-25 (`9f91e5f`): report `…-steps/stage0.md`, verifier PASS-with-notes; its amendments are the dated
"Stage 0 Fn" notes in this doc.*

### Stage S1 — Live wave A, Run 14: Step 9's follow-ups (1 h prep + 1 h live, after Stage 0, alone)
- [ ] §4.21 rows R14-5c, R14-POP-1, R14-3, R14-4b, R14-REL-3 with expected text, committed before the wave's first
      press; helper changes in `recipes/s9*.{ts,ps1,py}` (threaded 8083 server, opener claim, window placement,
      banner poll, URL class); the record `…-steps/S1-run-record.md`; §5 Run 14.
- [ ] The safety state restored and read back equal to the found state.
**Lane:** `recipes/s9*`, `recipes/test/s9-rules.test.ts`, `recipes/tsconfig.s9.json`, `docs/e2e-test-plan.md` §4.21
and §5, the steps dir. **No product code.** If #192's ruling asks for a re-run of Run 13's blocks 4–30, those rows
run here first under the same rules.

### Stage S2 — MCP trusted tools focus first (1 h, after S1)
- [ ] 0.2 in `mcp/src/tools/registry.ts`; tests first.
**Lane:** `mcp/src/tools/registry.ts`, `mcp/test/`. **Parallel with:** S5 and S6 (file-disjoint).

### Stage S3 — The 800-cap warning (2 h, after S2)
- [ ] 0.3: `pastSnapshotCap` computed in `extension/src/content/locate.ts`, carried by `handlers/target.ts` and
      `handlers/locate.ts`; the type in `shared/src/protocol.ts`; the SDK and MCP surfaces; tests first, on a fixture
      with 1 000 listable elements.
**Lane:** `shared/src/protocol.ts`, `extension/src/content/locate.ts`, `extension/src/handlers/{target,locate,actions}.ts`,
`sdk/src/`, `mcp/src/tools/registry.ts`, their `test/` dirs. Not `a11y.ts`, not `snapshot.ts`.
**Parallel with:** S5, S6 (after S2 because both edit `registry.ts`).

### Stage S4 — `browser_evaluate {saveTo}` (3 h, after S3)
- [ ] 0.4 with Stage 0's transport ruling; the SDK `Tab` method; the MCP parameter and description; log-scan and
      sentinel updates; for (B), the safety-table and daemon-table entries and the disarm drop.
**Lane:** `extension/src/` (evaluate handler, a store module, `sw.ts` registration, `safety.ts` table — for (B) only),
`daemon/src/methods.ts` (B only), `shared/src/protocol.ts`, `sdk/src/`, `mcp/src/tools/registry.ts`, their tests.
**Parallel with:** S5, S6.
*Amended 2026-10-25 (Stage 0 stage split, `stage0.md` §7; F2, F4): the transport is (B) (#205), so the lane holds
`daemon/src/methods.ts` (the tab-carrying pulls, F4) and gains `extension/src/debugger.ts` (CDP-leg slicing, F2);
budget 3.5 h (was 3 h). The work also carries F11/F12's file rules and V8's lost-store refusal (0.4's notes).*

### Stage S4b — The `JS_DISABLED` code (1.5 h, after S4)
- [ ] 0.12: spec §10 note first; the code in `shared/src/codes.ts` and its type; the extension's refusal; the SDK and
      MCP wording; `docs/setup.md`'s Safety section; tests first; the changed expected texts listed per file.
**Lane:** `docs/specs/…-design.md` (§10 note), `shared/src/`, `extension/src/safety.ts`, `sdk/src/`,
`mcp/src/tools/registry.ts`, their `test/` dirs, `recipes/s9-rules.ts` and its test if they pin the old text,
`docs/setup.md` (Safety). **Parallel with:** S5, S6 (after S4 because both edit `registry.ts`).
*Added 2026-10-24 by the user's ruling on #133 (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)).*

### Stage S5 — `bb-login.ps1`'s condition wait (1 h, any time after S1)
- [ ] 0.9; the delayed-redirect fixture; dry runs old vs new on it.
**Lane:** `recipes/bb-login.ps1`, `recipes/fixtures/`, the steps dir. Driver-opened windows on 127.0.0.1 only.
**Parallel with:** S2–S4 (file-disjoint; it uses no bridge port). It runs only when no live stage runs.

### Stage S6 — The `release/step8` branch (0.5 h, any time after Stage 0)
- [ ] 0.6: the local branch; the tree check; the message list. Tag and push wait for G10-1.
**Lane:** git refs only (a new local branch), the steps dir. **Parallel with:** anything; it never checks out
another branch in the main working tree (a separate worktree, removed after).

### Stage S7 — Live wave B, Run 15: Step 10's rows (1.5 h prep + 2 h live, after S4 and S5, alone)
- [ ] §4.22 rows, committed before the build is loaded: **MCPF-1** (an MCP actor's trusted click, type and press on
      a background fixture tab land 3/3 each, page reporter `isTrusted: true`, the tab in front after); **CAP-1** (a
      1 000-element fixture: a locator on listable element 900 warns through the SDK and the MCP, one on element 10 does not);
      **SAVE-1…n** (0.4's rules live, including 0.5's fixture leg); **SW-1** (0.8); **BBL-1** (0.9's dry runs);
      **RET-1** (0.7, at G10-2 only); the S6.3 pp1 leg (G10-3 only); the safety-state restore and read-back.
- [ ] S7b, only if SW-1 reads "runs to its bound": the fix (failing test first where pure) and its re-measure row.
      *Amended 2026-10-24 (Stage 0 F3): SW-1 is the differential row of 0.8's note; S7b first names the mechanism,
      and a top-level `tabs.onActivated` listener escalates (it touches the 'listeners at the top level of `sw.ts`'
      invariant). F16: RET-1 runs only with the found state armed (0.7's note).*
**Lane:** `recipes/`, `docs/e2e-test-plan.md` §4.22 and §5, the steps dir; S7b: `extension/src/tabs.ts` and tests.

### Stage S8 — Retire the chunked recipe; docs (1 h, last)
- [ ] 0.5's retirement (if the fixture leg passed); `docs/setup.md` (focus-first on the MCP's trusted tools, the
      warning, `saveTo`, the test-device sentence), `recipes/README.md`, `README.md` where the tool text changed;
      `CLAUDE.md` changes proposed for the session agent; the roadmap's Step 10 block.
**Lane:** `recipes/blackboard/` (removals only), `recipes/test/` (removals only), docs.
*Amended 2026-10-24 (Stage 0 F9): the lane also allows the header/help-text edits in
`recipes/blackboard/export-file.ts`, `export-grades.ts`, `held.ts`, `recipes/test/blackboard-export-file.test.ts`
and `recipes/README.md` (`--mcp-plan`'s help text naming `browser_evaluate {saveTo}`); the retirement set and its
−7 tests are 0.5's note.*

## Exit checks (pre-registered)

Every stage: `npm test` = before + n, no test removed unless the stage's text says so and the report lists it per
file; `npm run typecheck` and `npm run build` exit 0; `git status --short` shows no tracked change after the build.

- **Z.1** (Stage 0) findings ranked with command and output; each Step 9 contract executed on port 0 (held or
  CRITICAL); counts recomputed; every **(proposed)** decision attacked; the stage split in `journal.md`.
- **S1.1** §4.21 committed before the first press (`git log` order against the record's first timestamp); `git diff
  f45e3bf -- docs/e2e-test-plan.md` shows no changed line inside §4.20's rows (dated notes beside them allowed).
  **S1.2** the first recorded line proves the loaded build (SAFE-0's check, unchanged text); a reload only by
  `recipes/reload-extension.ps1`. **S1.3** observed text against the pre-written text, row by row, by a fresh
  verifier. **S1.4** armed, JavaScript and the sha256 of the block-list text read back equal to the start, none
  printed. **S1.5** the ledger shows every STOP line the wave met as a return to the step agent (#193); a runner
  that continued past one fails the stage on process. **S1.6** `daemon.log` and the worker console captured in
  the wave: 0 for the token, a non-fixture `://`, and the test patterns, by count.
  *Amended 2026-10-24 (Stage 0 F20): the fresh verifier lists every `STOP`/guard line in the run's raw output and
  daemon log and matches each to a return entry in the ledger; an unmatched one fails S1.5.* (Applies to S7.6 through
  "as S1.5–S1.6"; decisions.md · 2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential
  row, the retirement set, bb-login's bound (#209).)
- **S2.1** for ref and locator targets, trusted click / type / press send `focusTab {tab:T}` then the action with
  the same `tab`; untrusted sends no `focusTab` — tests that fail on the code at `f45e3bf`. **S2.2** a `focusTab`
  error is the answer and the action is not sent (test). **S2.3** the MCP tool list's names and input schemas equal
  `f45e3bf`'s (a test diffs them); the three descriptions carry the focus sentence.
  *Amended 2026-10-24 (Stage 0 F15): S2.3's baseline is captured from the code at `f45e3bf` before S2's first code
  change and never regenerated; S4 changes only `browser_evaluate`'s entry, listed in its report as #127's change.*
- **S3.1** on a fixture with 1 000 listable elements, `locate` of listable element 900 → `pastSnapshotCap: true`; element 10 → absent; on a
  799-element page → absent at every index; a non-listable `{css}` match before the 800th listable → absent
  (tests). **S3.2** `extension/test/fixtures/snapshot-pre-s1.json` and `sdk/test/fixtures/baseline-51de800.json`
  checks still pass unchanged; `git diff f45e3bf -- extension/src/content/a11y.ts extension/src/content/snapshot.ts`
  is empty. **S3.3** the MCP warning line and the SDK surface tested; every Step 8 SDK signature unchanged (a
  type-level test or `tsc` over a pinned usage file).
  *Amended 2026-10-24 (Stage 0 F14): S3.1 adds: on an 801-listable page the 800th listable (index 799) → absent, the
  801st → `true`; on an 800-listable page every index → absent; a non-listable `{css}` match after the 800th
  listable → `true`; a `{text}` match past the cap → `true`; listable elements inside an open shadow root and a
  same-origin frame count. S3.3 asserts each Step 8 SDK signature by type equality
  (`expectTypeOf(...).toEqualTypeOf<…>()`) against a list captured at `f45e3bf`.*
- **S4.1** over port 0 with a fake extension (and, for (A), Stage 0's measured bound): a value of 1 000 000
  characters saved; file sha256 = the expected; the MCP answer is under 300 characters and contains no 16-character
  run of the value (tests). *Amended 2026-10-24 (Stage 0 F13): S4.1's bound is `answer.length ≤ min(300,
  path.length + 120)` with a test path of ≤ 180 characters; the value is random (crypto); the SDK's return value and
  every captured log line are checked as well as the MCP answer.* **S4.2** file rules: relative path, existing file without `overwrite`, failure mid-write
  (`.part` gone), `asRef` + `saveTo`, an `undefined` value — each refused as 0.4 says (tests). **S4.3** for (B):
  Step 9's S1.1 router-scan test passes with the new methods classified; JavaScript off → `DISARMED {scope:
  "evaluate"}`; disarmed → `DISARMED {scope:"all"}`; the store emptied at disarm (tests). *Amended 2026-10-24
  (Stage 0 F6): S4.3's JavaScript-off clause reads: 'each new method's refusal equals `evaluate`'s own refusal for
  the same state (at S4: `DISARMED {scope:"evaluate"}`; after S4b: `JS_DISABLED`)', asserted by equality, so S4b
  changes no S4 test text. S4b.2 adds: (B)'s methods answer `JS_DISABLED` with JavaScript off.* **S4.4** the description
  sentence of 0.4 verbatim (test). **S4.5** the log scan and the sentinel test pass with a sentinel value and path
  added, and find neither.
- **S5.1** on the delayed-redirect fixture the old script exits 4 and the new exits 0; stuck on the SSO stand-in →
  exit 4 within 95 s, nothing pressed after the first press; another host → exit 4, nothing pressed (dry-run
  outputs in the report). *Amended 2026-10-24 (Stage 0 F10): extended as 0.9's note says — three legs, "another
  host" judged only at the bound, ≤ 95 s from the press, submits = 1 in every leg.*
- **S6.1** `git diff <step8-close> release/step8` is empty; **S6.2** the branch's messages are the six Part messages
  in order (plus trailers); **S6.3** `git rev-parse main` unchanged across the stage; no commit on the branch names
  `dist/`, `bridge.token`, `.env`, `exports/` or a PNG; no tag exists before G10-1.
- **S7.1–S7.4** as S1.1–S1.4 for §4.22. **S7.5** RET-1 runs only after G10-2 is granted, the pp1 leg only after
  G10-3; otherwise both are recorded "not run — waits for the user". **S7.6** as S1.5–S1.6.
- **S8.1** the retirement's removed tests listed per file with the count change; `grep -rn "assemble-mcp\|transcript.ts"
  recipes docs/setup.md` finds only dated history notes; every new `CLAUDE.md` gotcha cites its source.
  *Amended 2026-10-24 (Stage 0 F9): the removed tests are the 7 of 0.5's note (count −7).*
- **S4b.1** `codes.ts` lists 26 codes with `JS_DISABLED` on the wire list; spec §10's note precedes the code commit
  (`git log` order). **S4b.2** with JavaScript off: `evaluate`, `evaluate {asRef}` and a `javascript:`/`data:`
  navigation answer `JS_DISABLED`; with the bridge off they answer `DISARMED`; with JavaScript on nothing changes
  (tests, each failing at the S4 close). **S4b.3** `JS_DISABLED` is not in `ATTACH_CODES` (test); the MCP renders it
  as one line (test). *Added 2026-10-24 (#202).* *Amended 2026-10-24 (Stage 0 F6, F17): S4b.2 adds (B)'s methods
  answering `JS_DISABLED` with JavaScript off, and an old extension's `DISARMED {scope:"evaluate"}` still rendered by
  the SDK and MCP as the JavaScript-off line.*

## Human gates

- **G10-0** — #192 ruled before Stage 0 (the box at the top).
- **G10-1** — creating the `step8` tag, and any push (branch, tag or `main`).
- **G10-2** — killing and relaunching the user's real Chrome for RET-1.
- **G10-3** — any live work beyond decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end (#33)'s
  standing grant of fixture waves in the user's profile: the real Blackboard course (the S6.3 pp1 leg, a real
  `bb-login.ps1` run), any real site, the user's credentials. decisions.md · 2026-10-23 · The user grants the pp1 course for SDK-6/SDK-7 and one Chrome restart for SM-1 (#96) and · The user allows unlimited Chrome restarts and unpublished Blackboard writes (#98) were given for Step 8's wave and are not
  read as standing.
- **Carried:** reloads by `recipes/reload-extension.ps1`, one re-run on exit 2 (decisions.md · 2026-10-23 · Later
  extension reloads use `recipes/reload-extension.ps1` (#65); · S6's findings ruled: the user's answers, stage S6b
  for REP-1, re-registered rows (#99)); pinning the toolbar button: UI Automation cannot press it (Run 13), so the
  runner asks the user once unless #192's ruling allows the verified mouse click; every live wave restores the
  safety state it found, and a failed restore stops the run.

## STOP rules and forbidden fixes

**Stops the gate** (the write-up continues): a pre-registered check fails after 2 fix rounds; a router method
reachable without the safety gate; any path by which a client, the daemon or a page changes the safety state or
reaches the extension's own pages; a safety state not restored after a live wave; a pattern, URL, title, the token,
an evaluated value or a `saveTo` path in a log or committed evidence; a `CLAUDE.md` runtime invariant that would
have to change; `main` rewritten or anything pushed without G10-1; a port-9234 holder that is not the daemon, or an
orphan process; the test count dropping without a documented move or removal; a live runner continuing past a STOP
line (#193).

**Continues anyway, recorded:** a live row that fails (the fix is a proposed decision); SW-1's outcome either way;
RET-1 or the pp1 leg not run for lack of a grant.

**Forbidden fixes:** exempting or reclassifying a method in the safety table to make a row pass; a method that arms,
disarms, edits the list or turns JavaScript on; re-arming by default; enforcing safety in the daemon or SDK instead
of the extension; matching hosts by substring; editing §4.20's rows or any row's expected text after its run
(re-measurements are new rows); relaxing a bound after seeing the measurement (R14-4b's banner lifetime is a record);
changing `a11y.ts`, `locate`'s rules or the snapshot's output to make the cap warning appear; returning any part of
a `saveTo` value to the model, or writing anywhere but the given absolute path; lowering `activateForCapture`'s
1000 ms or 50 ms waits without a measurement, or adding window focus to a capture; adding
`windows.update({focused:true})` outside `focusTab`; focusing on untrusted actions; moving the MCP cursor on a
focus; rewriting `main` or force-pushing; and, from Steps 6–8, still binding: weakening a lease or lock invariant;
logging a URL, title, header value, body, locator text or the token; binding anything but `127.0.0.1` or widening
the token rule; making `BridgeClient` reconnect on a close code other than 4002; letting the MCP crash when
`connect()` fails; editing a test's expected text to match a changed error; regenerating
`sdk/test/fixtures/baseline-51de800.json`.

## Open items

- Ruled at Stage 0 (conservative rule, listed for the user): 0.3's wire field and SDK form; 0.4's transport and the
  SDK method; 0.6's intermediate trees; 0.8's fix, if SW-1 calls for one.
- *Amended 2026-10-25: Stage 0 ruled these conservatively, and each stays open for the user — 0.3's SDK form as a
  client event (decisions.md · 2026-10-25 · Stage 0: the cap warning reaches SDK actions as a client event (#206));
  0.4's transport (B) with tab-carrying pulls and the stricter file rules (· Stage 0: `saveTo` uses transport (B),
  with tab-carrying pulls (#205); · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s (#207));
  0.6's layout Variant C (· Stage 0: `release/step8` from `70aa754` to `a1932a8`, Variant C (#208)). The rest of
  Stage 0's rulings are #209. A size refusal for plain `evaluate` (F2) is not built unless the user rules it. 0.8's
  fix, if any, is decided by SW-1 as amended (F3).*
- Waiting for the user: G10-0 (#192), G10-1, G10-2, G10-3.
- Not this step: blocking a redirect hop onto a blocked host (`declarativeNetRequest`, #140); SAFE-7c stays unmeasured
  (decisions.md · 2026-10-24 · SAFE-7c (the debugger on this extension's own options page) stays unmeasured (#200)).

## Follow-ups (decisions.md · 2026-10-24 · The roadmap after Step 8 (#129))

- **A later step — the block list stops redirected requests** (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)): a `declarativeNetRequest`
  session rule (a new permission) so a redirect hop of a download or a navigation onto a blocked site is never
  sent (decisions.md · 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140)). Its place in the order is
  set when Step 10 closes.
- **Step 11 — D3 file upload:** `browser_upload_file` / `Tab.upload` via `DOM.setFileInputFiles`.
- **Step 12 — Phase F:** `args` for `browser_evaluate`, console/error capture, the keep-attached debugger session if
  the design allows.
