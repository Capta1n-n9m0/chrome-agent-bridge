# Step 13 — Phase F follow-ups: a background opener's popup, evaluate's key order, the console fixes, and Run 20

**Date:** 2026-10-29 · **Status:** Planned; G13-0 met by #374
**Design of record:** this doc's "Decisions"; the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
binds for everything it does not change (§10 protocol, events and codes with their dated notes) · **Carried from:**
`docs/plans/2026-10-27-step12-phase-f.md` (closed; its § Follow-ups and the gate checklist) · **Steps dir:**
`docs/plans/2026-10-29-step13-phase-f-followups-steps/` (created at kickoff).

> **PRECONDITION (G13-0) — met.** The user ruled Step 12's gate and named Step 13's scope:
> decisions-archive/step12.md · 2026-10-29 · The user rules Step 12's gate; Step 12 closes (#374), items 1 and 3–7 and
> 11. So this doc has no scope questions. If `docs/decisions.md` → Open decisions holds anything at kickoff that this
> step would touch, the session agent writes one journal line and asks the user before Stage 0.

## Why

Step 12 shipped Phase F's four features and left a short list. The user granted the `webNavigation` permission, so
the popup lease Step 12 could not build (G1, #337) can now be built. Run 19 found two product defects the user asked to
fix: `evaluate` returns its value with sorted keys (R19-ARGS-1), and a console message logged before the read shows an
object as just `Object` (R19-CON-NOTEA). The user also ruled the console cap's direction (#355) and two texts. Run 19
left a dozen rows that its helpers could not judge (#373); they are re-measured in the same live wave as the new rows.
This step is small on purpose: after it comes a minimal Phase G (#374 item 11).

## Outcome (planned)

- A popup opened by a background tab is leased to the client that holds the opener (#226 closed), through
  `webNavigation.onCreatedNavigationTarget`'s `sourceTabId`; the foreground case is unchanged.
- `evaluate`'s returned `value` keeps the page's key order; no wire shape change.
- A replayed console object shows its contents, or this is a documented limit (Stage 0 decides by measurement).
- `formatConsole` keeps the newest lines and says how many older lines were cut; the console tool's text says only
  other-site frames are not read; the second-chooser refusal no longer names DevTools.
- **Run 20** records the new rows and Run 19's re-measurement list under new `R20-…` ids.
- Counts after the recommended scope: **25 tools, 28 router methods, 27 codes (26 on the wire)**, unchanged; the
  manifest gains one permission. If Stage 0 picks a new code for the chooser text, codes become 28 (27 on the wire).

## Decisions

**(user)** marks a choice already ruled (#374). **(proposed)** marks Claude's proposal; the session agent records each
in `docs/decisions.md` (with its own number) before Stage 0, so the audit can attack it. Proposals here carry no number.

### 0.1 Order and slices (proposed)

Stage 0 → **S1 G1** (the popup lease) → **S2 key order** → **S3a console object** (only if Stage 0 says yes) → **S3b
console texts** → **S4 small fixes** (the chooser text; the optional `.then(release, release)`) → **S5 Run 20** (sheet,
helpers and drivers, live, record) → **S6 docs**. S2, S3b and S4 touch disjoint files and may run beside S1 once S1's
spec note is committed; every live slice runs alone. G1 goes first because it changes the manifest, and every later
reload, test and live row must run with the new permission loaded.

### 0.2 G1 — a lease for a background opener's popup (user — the permission, #374 item 1; proposed — the shape)

- **The draft.** `docs/plans/2026-10-27-step12-phase-f-steps/Stage0.md` §6 "S6-G1 draft" is the design: its lane,
  failing tests and exit checks (renamed G1.1–G1.4 below). Stage 0 measured that `sourceTabId` names the real opener
  15 of 15 times with the permission (decisions-archive/step12.md · 2026-10-27 · Stage 0: G1 waits for G12-2; it
  stays a documented limit (#337)). The limit it closes is decisions-archive/step10.md · 2026-10-25 · S7: Run 15
  stands as recorded; its follow-ups (#226), item (3).
- **One event or two.** `tabCreated` gains an optional `sourceTabId` if Stage 0 shows the navigation-target event can
  be joined to `tabs.onCreated` within a short bound; else a new `tabOpener` event (a §10 event, not a router method)
  carries it late, and the daemon grants the lease on arrival if the tab is still unleased. Stage 0 picks by the
  measured order and spread; the bound is set from it.
- **The daemon rule** (`daemon/src/intercept.ts`): `sourceTabId` when present, else today's `openerTabId`. It grants
  only to the client that holds the source tab; a source tab held by another client grants to that client, never to
  the caller.
- **No new router method**, so `METHOD_CLASSES` (`extension/src/safety.ts`) and `daemon/src/methods.ts` do not change
  (root `CLAUDE.md`, Invariants). The listener is one top-level `chrome.webNavigation.onCreatedNavigationTarget` in
  `extension/src/sw.ts`; it keeps only the tab ids for the join, never the event's `url`, and logs nothing.
- **The manifest changes.** `permissions` gains exactly `webNavigation`; `extension/test/manifest.test.ts` pins it
  (as Step 11b did for its permission: decisions-archive/step11b.md · 2026-10-26 · Step 11b: the permission and the
  rule's scope ruled; Step 11's follow-ups become its stage S0F (#290)). The user's Chrome must reload the extension
  after the build (`recipes/reload-extension.ps1`); `docs/setup.md` (its load and upgrade steps) and
  `docs/e2e-test-plan.md` (the extension set-up) name the new permission.
- **An old extension** sends no `sourceTabId`, so the daemon applies today's rule: no `VERSION` refusal is needed.

### 0.3 Key order of `evaluate`'s value (user — the fix, #374 item 4; proposed — the mechanism)

- **The cause** (`docs/plans/2026-10-27-step12-phase-f-steps/S7-run-record.md` §4 item 1): the serialiser's result
  crosses with `returnByValue: true` (`extension/src/debugger.ts`, `serializerCall`), and Chrome returns that object
  with its keys sorted. The text form (`description`, `extension/src/evaluate/serialize.ts`) is built in the page by
  `JSON.stringify` and keeps the page's order.
- **Proposed:** the serialiser returns its envelope as one JSON string, and the extension parses it, the same
  string-crossing #330 uses for `args` (decisions-archive/step12.md · 2026-10-27 · Stage 0: `args` crosses as a JSON
  string beside a function object (#330)). The reply's shape is unchanged; only the key order changes. Every path that
  uses the serialiser (`evaluate`, `asRef`, `evaluateSaveStart`) is covered; Stage 0 lists them and checks that the
  envelope holds no value a JSON string would change.
- *Instead of:* re-sorting on receipt (the page's order is already lost); documenting the sorted keys.

### 0.4 CON-NOTEA — a replayed console object (user — fix if cheap, else a limit, #374 item 5; proposed — the test)

- **The fact** (`S7-run-record.md` §4 item 2): replayed console arguments carry no `preview`, so the reducer
  (`extension/src/console-messages.ts`) prints the class name only.
- **Stage 0 measures** whether a replayed argument carries an `objectId` and whether one CDP read gives its contents
  without running page code: the candidate is `Runtime.getProperties {objectId, ownProperties: true, generatePreview:
  true}`, tested on a fixture object with a counting getter, a `Proxy`, an Error-valued property and a large array.
- **"Cheap" means all of these:** no page script and no getter run (the counter stays 0); one CDP call per object
  argument, at most one per entry and a fixed number per read; the reply bound of today's read holds; the text goes
  through the same filters and cuts as a live preview (filter before stripping, the Error cut, no URL or stack:
  decisions-archive/step12.md · 2026-10-27 · Stage 0: the console read — C1 on the tab's session, filtered before
  stripping (#333); · S3a: the reply `{entries}` and the `level` threshold; a shortened preview fails closed now; caps
  count code from here on (#344)).
- **If yes,** S3a builds it. **If no,** S3a is not run; S6 writes the limit in `docs/setup.md` and the tool's
  description says an object logged before the read shows its class name only.

### 0.5 The console texts (user — #374 items 6 and 7; proposed — the wording)

- **The cap's direction.** `formatConsole` (`sdk/src/format/console-messages.ts`) keeps whole lines from the newest
  back while the text fits, prints them oldest first, and opens with one marker line naming how many older lines were
  cut. The marker's wording is the builder's, checked by the verifier against #374 item 6. The tests that pin the old
  marker change in the same commit.
- **The frames sentence.** `mcp/src/tools/registry.ts` (`browser_console_messages`) and the JSDoc of
  `Tab.consoleMessages` (`sdk/src/tab.ts`) take the wording proposed in `docs/cleanup/2026-10-29-evidence/plan-drift.md`
  finding 1, and the pinned `toContain` in `mcp/test/s12-console-cross.test.ts` changes with them. The #214 baseline
  pins input schemas only, so no re-baseline (finding 1). The doc amendments that finding names are S6's.

### 0.6 The second-chooser refusal (user — #374 item 7; proposed — code or message, decided at Stage 0)

Today a second chooser call on a tab is refused with the overlap text of `describeDebuggerError`
(`extension/src/handlers/upload.ts`, `chooserUpload`), which tells the agent to close DevTools
(decisions-archive/step12.md · 2026-10-28 · S5a: the chooser's refusal texts; two by-construction claims and the
disarm wait go to Run 19 (#353)).
- **(a) recommended:** keep the code `DEBUGGER_DEVTOOLS` and give this one path its own fixed message that says
  another chooser upload is running on the tab and to retry after it ends. The code stays true (the first call holds
  the tab's one debugger session); counts unchanged; no hello feature, since an old extension's answer differs only in
  text.
- (b) a new code for "a chooser call is already running": codes become 28 (27 on the wire), with a spec §10 note
  first, `shared/src/codes.ts`, the SDK's `ATTACH_CODES` choice (`sdk/src/error.ts`) and the MCP's printed line.
- Either way the code set's rules hold: the §10 note is committed before the code, the message is fixed and names no
  path, and no other path's text changes. Stage 0 records which one, with its reason.

### 0.7 The optional hardening (proposed)

The trusted input's settle pause releases the lock only on success (`daemon/src/intercept.ts`, `.then(release)`); a
rejecting injected `sleep` would hold it until disconnect (decisions-archive/step12.md · 2026-10-28 · S6-G2: the
daemon focuses under its own hold; an earlier client `focusTab` stays harmless (#354)). Built in S4 as
`.then(release, release)` with one failing test first, if S4 stays under its cap; else left in Follow-ups.

### 0.8 Run 20 (proposed)

New `docs/e2e-test-plan.md` §4.28 (Stage 0 checks the next free number), ids `R20-…`, expected text committed before
any observation, fixture pages only. **Old rows are never edited**; a re-measured row gets a new id that names the old
one (#373's Why: decisions-archive/step12.md · 2026-10-29 · Run 19's record accepted; its findings go to the user and
a later recipes-only wave (#373)). Seed rows for Stage 0 and S5-sheet:
- **R20-0** found state; the loaded build proven by an answer only the new build gives (a value with unsorted keys
  coming back in page order).
- **New rows:** R20-POP-BG (a background opener's popup leased to its holder), R20-POP-FG (the foreground case, as
  today), R20-POP-OTHER (a source tab another client holds); R20-ARGS-ORDER (SDK and MCP legs, page order, re-measures
  R19-ARGS-1); R20-CON-NOTEA (a replayed object's contents, or the documented class-name line), and, if S3a is built, a
  blocked frame's object reaching the cut path (#373's second proposal in `S7-run-record.md` §6); R20-CON-CAP (newest
  kept, the marker's count); R20-CHOOSE-TWICE (the second call's text names no DevTools).
- **Re-measured** (Step 12 phase doc § Follow-ups, the bullet citing #373): R20-ARGS-3 against the MCP's own line; the
  MCP legs of CON-4, ARGS-OLD and VERSION, read from the MCP's own lines (`sdk/src/error.ts`) and `isError`;
  R20-CON-FLOOR with #361's waits; R20-CHOOSE-KEPT with a second, different file and an `input`/`cancel` counter;
  R20-G2-1 with the window rectangles of each actor recorded; R20-CHOOSE-REFUSE-DIS on a page that targets the disabled
  input itself (#370; the sheet states first whether the refusal is reachable there, else the row is written as a
  RECORD); R20-DEVT-UNDOCK and R20-DEVT-EARLY, #369's two conditions (decisions-archive/step12.md · 2026-10-29 ·
  liveB19 closed at attempt 3; docked DevTools on Chrome 156 does not refuse the bridge's debugger (#369)), each with a
  control that proves DevTools is attached; if either refuses, UP-DEVT, KEEP-4 and SWEEP-HELD are re-run under it as
  R20 rows; #374 item 3 rewords the doc claim only after this.
- **R20-LOGS** (sentinel, token and the user's name counted per slice, 0) and **R20-RESTORE** (by hash).

### 0.9 Not in Step 13 (proposed)

Response bodies over CDP and WebSocket frames; console lines in `evaluate` results; banner-free evaluate through
`chrome.userScripts`; frame targeting; cookie and storage reads; multi-window awareness; dropping the client's own
`focusTab` before a trusted input (#354). After Step 13 comes **a minimal Phase G**, packaging for the user's own use
only (#374 item 11); wider distribution later.

### Dated note (2026-10-29, after Stage 0)

Stage 0 (`…-steps/Stage0.md`, `8f23ac9`) changed the proposals above; where they differ, these entries win:
- **0.1:** stages run one at a time in the main tree; S3a is dropped (#384). S5's slices: sheet, helpers, drivers
  A/B/C, live A (R20-0, POP, ARGS, CON), live B (CHOOSE, G2), live C (DevTools rows alone), record.
- **0.2:** replaced by #385. The join lives in the extension: a new pure join module in `extension/src/` (250 ms
  hold, ids only), `tabCreated.openerTabId` carries `sourceTabId` when joined and is absent when not; no fallback to
  Chrome's `openerTabId` (it names the active tab for a background opener, 25 of 30). `shared/src/protocol.ts` and
  `daemon/src/intercept.ts` are not in S1's lane. G1.1 adds a mutant that falls back to Chrome's `openerTabId` for an
  unjoined tab: it must be red. For the user's review at the gate.
- **0.3:** amended by #386 (a closure-free wrapper; the shape checked on receipt; the fake CDP sorts keys first;
  `evaluateSaveStart` is not a serialiser path).
- **0.4:** "no" (#387): S3a is not run; the tool's limit sentence goes to S3b, `docs/setup.md` to S6.
- **0.5:** two outside pins join S3b's lane (#388).
- **0.6:** (a) (#389), with a dated spec §10 note in S4's lane.
- **0.7:** kept, its reason corrected (#390); S4 owns `daemon/src/intercept.ts`.
- **0.8:** Run 20's seven row changes (#391). **0.9:** kept (#392). The permission is not a G13-2 matter (#393).

## Stages

**Lane** is the explicit grant a step agent needs (`docs/agent-rules.md` §3 item 5). **Risk**, models, effort, fix
rounds and the size cap: `agent-rules.md` §6–§8 (#289, #271, #320, #367). Every step brief opens with the in-turn wait
rule (#286, #350). Pure logic is tested first (root `CLAUDE.md`, Testing philosophy).

### Stage 0 — Spec audit (2 h, first, alone; risk: standard)
- [ ] Four lenses over this doc, as Step 12's Stage 0: every cited file and function **executed** (the line numbers
      here are left out on purpose; the audit finds them); counts recomputed by `node scripts/doc-check.mjs` and the
      code (25 tools, 28 router methods, 27 codes), the test count by `npm test`, the log-site count from
      `extension/test/log-allowlist.ts`, all at the start commit; the seed blind-spot list below extended; every exit
      check executable and discriminating. Output `…-steps/stage0-audit.md`, findings tagged plan-side (a dated note
      here) or code-side.
- [ ] **Seed blind spots:** an `onCreatedNavigationTarget` that arrives before `tabs.onCreated`, or never (a popup
      blocked by Chrome); a source tab closed before the join; a popup of a popup; the join's memory after a worker
      restart; a serialiser envelope value a JSON string changes (`-0`, a lone surrogate, a huge number); the save and
      `asRef` paths of the serialiser; `getProperties` on a revoked `Proxy` or a cross-realm object; the formatter's
      marker when no whole line fits; the chooser text in the MCP's printed line.
- [ ] **Measured in a scratch Chrome on its own temporary profile** (decisions-archive/step11b.md · 2026-10-26 · Stage
      0 measures DNR in a separate scratch Chrome on a temporary profile (#294); never a bare `chrome.exe`, · Stage 0's
      incident: a stray `chrome.exe --version` reached the user's Chrome; never run Chrome without an own profile
      (#297)): G1's event order and spread over at least 15 popups, foreground and background; reloading an unpacked
      extension that gained `webNavigation` (does it stay enabled with no prompt, and does its warning list change);
      the key-order mechanism of 0.3; CON-NOTEA's read of 0.4 with its getter counter; #369's two DevTools conditions,
      so Run 20's rows are written with a working control. Each fact with how it was obtained.
- [ ] Decide 0.6 (a) or (b) and record it with its reason.
- [ ] Step 12's contract tests (`args`, console, keeper, chooser, G2) re-run on port 0.

**Lane:** the steps dir; a scratch extension and profile outside the repo; read-only elsewhere; port 0 only.
**Verifier focus:** re-execute five findings; every Chrome fact is a measurement or a cited source, never a belief.

### S1 — G1, the background opener's popup (3 h; risk: standard; cap 350)
- [ ] Spec §10 note first (the event field or the late event, the lease rule), committed before the code.
- [ ] Failing tests first, as the Stage0.md §6 draft lists them, plus Stage 0's blind spots.
- [ ] The manifest line and its pinning test; `docs/setup.md` and `docs/e2e-test-plan.md` name the permission.
**Lane:** `extension/manifest.json`, `extension/src/{tab-events,sw}.ts`, `shared/src/protocol.ts`,
`daemon/src/intercept.ts`, their tests, `extension/test/manifest.test.ts`, the spec note, the two doc lines.
**Verifier focus:** the manifest diff is exactly one permission; no URL kept or logged; a mutant that grants to the
caller instead of the source tab's holder is red; every existing opener test passes unchanged.

### S2 — Key order (2 h; risk: standard; cap 300)
- [ ] Failing tests first: a value with keys in non-sorted order (nested, arrays of objects) comes back in page order
      through a fake CDP; the `description` is unchanged; the save and `asRef` paths as Stage 0 lists them.
**Lane:** `extension/src/debugger.ts`, `extension/src/evaluate/*`, their tests; the key-order assertion in
`mcp/test/` or `sdk/test/` cross tests that use `toEqual` (which ignores order, `S7-run-record.md` §5 item 4).
**Verifier focus:** a mutant that keeps `returnByValue` on the envelope is red; every existing evaluate test passes
unchanged; no value in any message or log.

### S3a — The replayed console object (2 h; risk: standard; cap 300; only if Stage 0 says yes)
- [ ] Failing tests first: a replayed argument with an `objectId` is read once and printed as a live preview is; the
      getter counter stays 0 in the fake; the #344 filters and cuts apply; the per-read call bound holds.
**Lane:** `extension/src/console-messages.ts`, `extension/src/handlers/console.ts`, their tests.
**Verifier focus:** a mutant that reads through `callFunctionOn` (page code) is red; the console sentinel 0 in logs.

### S3b — The console texts (1 h; risk: standard; cap 200)
- [ ] Failing tests first for the formatter's direction and marker count; then the frames sentence in the MCP
      description and the SDK JSDoc with the pinned test.
**Lane:** `sdk/src/format/console-messages.ts`, `sdk/src/tab.ts` (the JSDoc), `mcp/src/tools/registry.ts` (the one
description), their tests. **Verifier focus:** the newest line is always kept when it fits; the marker's count equals
the lines cut.

### S4 — Small fixes (1 h; risk: standard; cap 150)
- [ ] The chooser text as Stage 0 decided (spec §10 note first if (b)); a failing test that the second call's message
      names no DevTools. The `.then(release, release)` with a failing test of a rejecting `sleep`, if it fits.
**Lane:** `extension/src/handlers/upload.ts` and its tests; under (b) also `shared/src/codes.ts`, `sdk/src/error.ts`,
the spec note; `daemon/src/intercept.ts` and its test for 0.7. **Verifier focus:** the other `DEBUGGER_DEVTOOLS` texts
unchanged; under (b) the code count is 28 everywhere it is stated.

### S5 — Run 20 (live), in slices (prep low, live standard)
As Step 12's S7: **S5-sheet** (§4.28 from 0.8 and the stages' placeholders, committed before any observation; ports by
`netstat`) → **S5-helpers** and **S5-drivers** (on Run 19's helpers, `recipes/s12-r19*` and `recipes/s12-forms*`, as
new `recipes/s13*` files; a failing test first for each; slices of at most ~600 lines, the split written before they
start) → **S5-live** (main-tree build of committed code, the reload script, R20-0 first; one live slice at a time;
runner attempts at most three per slice; returns on every STOP line, #193) → **S5-record** (`…-steps/S5-run-record.md`,
§5 Run 20, a fresh verifier against the pre-written text). Readers of MCP legs match the MCP's own lines, never the
extension's (`S7-run-record.md` §4 item 8). **Lane:** `recipes/s13*`, `recipes/test/`, `test-fixtures/` (new pages
only), `docs/e2e-test-plan.md` §4.28 and §5, the steps dir. **No product code.** **Verifier focus:** counts and
page reporters are the evidence, never an `ok`; each re-measured row names its R19 row; no native dialog or DevTools
window left open; restore by hash.

### S6 — Docs (1 h, last; risk: low)
- [ ] `docs/setup.md` (the permission, the popup lease, key order, the console changes or the CON-NOTEA limit, the
      chooser text), the amendments `plan-drift.md` finding 1 names, the roadmap, `README.md` if it lists behaviour;
      the #369 claim reworded only from Run 20's DevTools rows; CLAUDE.md proposals in `…-steps/S6-claude-md-proposals.md`
      for the session agent. **Lane:** docs only. **Verifier focus:** every changed behaviour sentence cites an R20 row
      or a test; no local path or user name (`docs/docs-writing-guide.md` Rules item 9).

## Exit checks (pre-registered)

Every stage: `npm test` = before + n with no test removed unless listed per file; `npm run typecheck`, every
`recipes/tsconfig*.json` and `npm run build` exit 0; `git status --short` clean of tracked changes after the build;
every new pure test fails on the code before the stage (the verifier proves it).

- **Z.1** (Stage 0) findings ranked with command and output; every Chrome fact of 0.2–0.4 and 0.8 measured or cited;
  0.6 decided; counts recomputed; every (proposed) decision attacked; Step 12's contracts green on port 0.
- **G1.1** (S1) the join and the lease rule tests pass and fail on the pre-slice code; **G1.2** the manifest diff is
  exactly `webNavigation`, citing #374; **G1.3** log sites +0; **G1.4** R20-POP-BG passes (judged in S5).
- **K2.1** (S2) page order through every serialiser path (mutant red); **K2.2** existing evaluate tests unchanged and
  the reply shape unchanged.
- **C3.1** (S3a, if run) contents read with the getter counter 0 and the #344 filters; console sentinel 0 in logs;
  **C3.2** (S3b) the newest lines kept and the marker's count exact; **C3.3** the frames sentence in both places and
  the pinned test, in one commit.
- **T4.1** (S4) the second call's message names no DevTools; other texts unchanged; counts as Stage 0 decided;
  **T4.2** (if built) the lock released after a rejecting `sleep`.
- **R5.1** (S5) §4.28 committed before the first observation; **R5.2** R20-0 proves the loaded build; **R5.3** each
  row judged by its pre-written text; **R5.4** restore by hash in each slice; **R5.5** R20-LOGS by count per slice;
  **R5.6** every STOP line matched to a return in the ledger.
- **D6.1** (S6) every changed behaviour sentence cites a row or a test; `node scripts/doc-check.mjs` shows no dead
  path, no count mismatch and no unnumbered decision from this step's docs.
- **Counts at the close:** 25 tools, 28 router methods, 27 codes (26 on the wire), or 28 (27) under 0.6 (b), stated
  the same in every doc that states them.

## Human gates

- **G13-0** — the scope: met by #374.
- **G13-1** — any push or tag. #374 item 2 granted Step 12's push only; nothing of Step 13 is pushed without a fresh
  grant.
- **G13-2** — a manifest permission beyond `webNavigation`, or a change to what the human sees beyond #374: a new
  permission warning, the extension disabled or asking for approval on reload, a page hook, the banner kept past the
  keeper's bound, an interception outside a call. Returns to the user before it is built or run.
- **G13-3** — any live row on a real site or with the user's credentials; Run 20 uses fixture servers on
  `127.0.0.1` / `localhost` only.
- **Carried:** live fixture waves are Claude's (#33); reloads by `recipes/reload-extension.ps1`, one re-run on exit 2
  (#65, #99); the block list and Upload folders edited only in the wave's own options window, restored exactly; the
  file-URL toggle read, never pressed; DevTools opened only in a window the wave opened on a fixture page, undocked
  included, and closed by the wave; a native dialog the wave causes is closed by the wave; no Chrome restart planned;
  Stage 0's scratch Chrome on its own temporary profile (#294, #297).

## STOP rules and forbidden fixes

**Stops the gate** (the write-up continues): a pre-registered check fails after the allowed fix rounds; a popup leased
to a client that does not hold its source tab; a navigation URL kept past the join or logged; the extension disabled or
asking for approval after the reload; a page script or getter run by the console read; an existing tool answering
differently on a call that does not touch the changed paths (key order aside); console text, a value, a path, a URL,
the token or the user's name in a log or committed evidence; a native dialog or DevTools window left open on the
user's screen; a safety state not restored; anything pushed or tagged; a port-9234 holder that is not the daemon, or
an orphan process.

**Continues anyway, recorded:** Stage 0 shows no cheap read for CON-NOTEA (S3a not run; the limit documented); G1's
event cannot be joined within a usable bound (then the late event of 0.2; if neither works, G1 stays #226's limit and
the user is told); a re-measured row that fails with a passing control (a product finding, proposed); #369's two
DevTools conditions both fail to refuse (recorded; #374 item 3's reword waits for the user).

**Forbidden fixes:** a permission beyond `webNavigation`; a router method added for G1 without both tables; storing
or logging navigation URLs; reading a console object through page code; sorting or re-ordering keys anywhere to make a
row pass; a changed message on any path other than the second-chooser refusal; a new code without the §10 note first;
editing an R18 or R19 row, or a row's expected text after its run; a reader that matches the extension's text on an
MCP leg; and every forbidden fix of Steps 9–12 still binding (`docs/plans/2026-10-27-step12-phase-f.md` § STOP rules,
`docs/agent-rules.md` §2).

## As built

One block per stage, written by the session agent at the stage close (format: `docs/docs-writing-guide.md` § Phase
doc header); at the phase close, the gate checklist (item → met? → evidence).

### Stage 0 — Spec audit and the scratch-Chrome measurements · 2026-10-29 · verifier: PASS-with-notes · commit `8f23ac9` · models Opus auditors, measurers and verifier
- **Contracts (binding forward):** the measured facts in `Stage0.md` § Measured facts (Chrome 156, scratch profile):
  `tabs.onCreated` precedes `onCreatedNavigationTarget` 60/60 within 0.6 ms; `sourceTabId` names the opener 60/60;
  Chrome's `openerTabId` names the active tab for a background opener 25/30; `returnByValue` sorts keys, a JSON string
  keeps page order 6/6; `Runtime.getProperties` runs an Error subclass's `message` getter; undocked DevTools and
  DevTools opened before the first attach did not refuse the bridge's attach (flagged scratch Chrome, controls
  independent of the bridge). Counts at `ff121a4`: 25 tools, 28 router methods, 27 codes, 54 log sites, 5596 tests /
  235 files; Step 12's contract tests green on port 0.
- **Decisions:** #384–#393 (Stage 0's attack on #375–#383). **Deviations:** two audit bodies, not merged; a first
  Stage 0 step agent ended on an API login expiry with no output, and a fresh one ran (#225).
- **Numbers:** tests 5596 → 5596 (no product code); ~40 min for the second agent.
- **Needs the user:** #385 (G1's shape) and #389 (chooser text) at the gate.

### S1 — G1, the background opener's popup · 2026-10-29 · verifier: PASS-with-notes (round 1 of 3, then PASS-with-notes) · commits `6cb3d4b` (spec note), `8f6fc4d` · models Opus builder, fixer and verifiers
- **Contracts (binding forward):** `tabCreated.openerTabId` is the navigation source when the extension joined
  `webNavigation.onCreatedNavigationTarget` within 250 ms (`extension/src/opener-join.ts`, `OPENER_JOIN_HOLD_MS`), and
  absent when it did not; a held `tabCreated` is released before that tab's `tabRemoved`/`tabReplaced`; the join keeps
  tab ids only and logs nothing (log sites +0). The manifest gains exactly `webNavigation`, pinned by
  `extension/test/manifest.test.ts`. The daemon's opener rule and the wire shape are unchanged. Spec §10 dated note.
- **Decisions:** #394, #395. **Deviations:** 381 new lines against 350 (code 115; the extra is tests); the listener
  pin in `extension/test/s3a-dnr-wiring.test.ts` (outside the lane, stricter: 20 → 21 listeners, exactly one
  `onCreatedNavigationTarget`). The first S1 step agent and its verifier were cut off by the terminal closing; a fresh
  step agent and verifier finished it (journal).
- **Numbers:** tests 5596 → 5617, files 235 → 236; 14 of 15 mutants red, incl. the fallback-to-Chrome's-opener and
  grant-to-caller mutants.
- **Left for later (notes):** N2, an unjoined tab's `tabCreated` can be overtaken by other tabs' events for up to
  250 ms; N3, the spec bullet's "reads" should say "acts on; the daemon relays" (S6).
- **Needs the user:** the extension reload (the script exited 2 twice at 10:53Z; S5-live's R20-0 does it); #385 at
  the gate.

### S2 — Key order of `evaluate`'s value · 2026-10-29 · verifier: FAIL → PASS-with-notes (round 1 of 3) · commit `3ca60bd` · models Opus builder, fixer and verifiers
- **Contracts (binding forward):** the serialiser's envelope crosses as one JSON string written by a closure-free
  wrapper whose JSON writer calls no page `toJSON`; the extension parses it in `serializerCall`'s `callFn` and accepts
  only the envelope's own keys and types, `__mark` exactly when asked, else today's fallback. `SERIALIZER_SRC`
  byte-identical; paths `evaluate`, `args`, `asRef`, the mark sweep; reply shape unchanged; log sites +0. The fake CDP
  (`extension/test/s12-engine-cdp.ts`) sorts keys under `returnByValue` as Chrome does.
- **Decisions:** #396, #397. **Deviations:** exactly at the 300-line cap (code 85, tests 215).
- **Numbers:** tests 5617 → 5648, files 236 → 237; 26 new tests red on the pre-slice code; the K2.1 mutant red (5).
- **Left for later (notes):** no test of a non-function enumerable property on `Object.prototype`; a page that replaces
  `Object.keys` can still bend `value` (pre-existing).
- **Needs the user:** nothing new.

### S3a — not run (#387)

### S3b — The console texts · 2026-10-29 · verifier: PASS-with-notes · commit `22d2217` · models Opus builder and verifier
- **Contracts (binding forward):** `formatConsole` keeps whole lines from the newest back, prints them oldest first, and
  opens with the #398 marker; the console tool's description and `Tab.consoleMessages`' JSDoc say only other-site frames
  are not read, and the description says an object logged before the call shows its class name only (#387).
- **Decisions:** #398. **Deviations:** none (+82/−45 lines, cap 200).
- **Numbers:** tests 5648 → 5650 (237 files); 8 changed tests red on the pre-stage code; 10 of 10 mutants red.
- **Left for later:** Run 19's frozen helpers (`recipes/s12-forms-b.ts`, `recipes/s12-forms.ts`) find no marker in the
  new form, so Run 20's helpers read the marker first; `mcp/CLAUDE.md`, `extension/src/CLAUDE.md` and `docs/setup.md`
  still describe the old direction and frames text (S6 and the session agent).

### S4 — Small fixes · 2026-10-29 · verifier: PASS-with-notes · commits `c63273a` (spec note), `b3cbe84` · models Opus builder and verifier
- **Contracts (binding forward):** a second chooser upload on a tab answers `DEBUGGER_DEVTOOLS` with the fixed
  `CHOOSER_BUSY_MESSAGE` (`extension/src/handlers/upload.ts`: "uploadFiles: another file chooser upload is still
  running on this tab; retry after it ends"); every other `DEBUGGER_DEVTOOLS` text byte-identical; the MCP prints it
  bare with `isError: true`. The settle pause releases the visibility lock on rejection too (`daemon/src/intercept.ts`,
  `.then(release, release)`). Codes 27 (26 on the wire), log sites +0.
- **Decisions:** #389, #390 as built. **Deviations:** none (126 lines, cap 150).
- **Numbers:** tests 5650 → 5654, files 237 → 238; new extension and daemon tests red on `33ba954` in a scratch
  worktree (#395); 3 of 3 mutants red.
- **Left for later (NITs):** the new extension test frees the chooser slot only on pass; the MCP test's fake does not
  assert the method; E5.3's path-check list lacks the new constant. Docs naming the old overlap text are S6's.

## Follow-ups

- The Phase F items left out (0.9): response bodies and WebSocket frames on the kept session; console lines in
  `evaluate` results; `chrome.userScripts`; frame targeting; cookie and storage reads; multi-window awareness.
- Dropping the SDK's and MCP's own `focusTab` before a trusted input (#354).
- Whatever Run 20 leaves NOT MEASURED or NOT DISCRIMINATING, as proposed decisions.
- **Next: a minimal Phase G**, packaging for the user's own use only (#374 item 11).
