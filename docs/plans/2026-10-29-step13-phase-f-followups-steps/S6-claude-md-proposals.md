# S6 — proposals for the CLAUDE.md files

For the session agent, who alone edits `CLAUDE.md` files (`docs/agent-rules.md` §5). Written 2026-10-30 by the S6 builder
(Claude Sonnet 5.5, medium). `CLAUDE.md` files are overwritten in place with no marker (`docs/docs-writing-guide.md`
Rules item 5). Each item: file, current text, proposed text, citation. Sources: `S5-run-record.md` (verdicts, §1d, §4,
§7), `S1.md`, `S2.md`, `S3b.md`, `S4.md`, `S5-liveC20b.md` §6, and the code at `f6bafc5`.

## (a) Root `CLAUDE.md` — Current state block

Replace the heading and the two Step 13 bullets ("Next: Step 13", "Step 13 resume point") with:

- Heading: `## Current state (2026-10-30, Step 13 built and Run 20 recorded; the gate waits for the user)`.
- **Shipped:** Steps 1–12; Step 13 built: Stage 0 (`8f23ac9`), S1 G1 (`8f6fc4d`), S2 key order (`3ca60bd`), S3b console
  texts (`22d2217`), S4 small fixes (`b3cbe84`); S3a not run (#387). Run 20 recorded (S5; `2c2c214`, `a64e11e`): 34
  verdicts as verified, 20 PASS, 8 FAIL, 1 NOT MEASURED, 3 NOT RUN, 2 RECORD (`…-steps/S5-run-record.md` §1d). S6 docs done
  (this stage; verifier and commit pending). **25 tools, 27 codes (26 on the wire), 28 router methods** (unchanged,
  `node scripts/doc-check.mjs`, 2026-10-30).
- **The gate is stopped and waits for the user:** #417 (slice B's `text-leak` STOP; its record and five more files are
  untracked and held), #419 (liveC20 spent five fixer passes against a cap of three; accept attempt 2's DevTools rows or
  rule them NOT MEASURED), the `DIALOGS` clause (three R20-RESTORE rows read FAIL by the literal rule), R20-ARGS-ORDER (RECORD as
  printed, PASS by the pass rule and #401), #374 item 3 (the "one debugger per tab" reword, now with both conditions
  measured: neither refused), #385 (G1's shape) and #389 (the chooser text). G1.4 is met on R20-POP-BG-3 (#407). Nothing of
  Step 13 is pushed (G13-1).
- **Next:** the user's rulings, then Step 13's close and a minimal Phase G for the user's own use.
- Drop the "Step 13 resume point (2026-10-30, after a power cut)" bullet; its work is done.

## (b) `recipes/CLAUDE.md` — new runtime gotcha

Place: Runtime gotchas, beside the existing Windows UI Automation (UIA) bullets (the ones at lines ~74-89, the toolbar
button and the extension card), because it is a fact about driving Chrome by UIA. Proposed bullet:

> - **Chrome's DevTools toolbar buttons are nested pairs with one name; the dock-side menu is a Group plus a Button.**
>   Each DevTools toolbar button is an outer `toolbar-button` and an inner icon with the same name, so a reader that needs
>   exactly one button of that name finds two. For the main menu the outer offers ExpandCollapse and the inner offers
>   Invoke. The menu opens in the window's own UIA tree. Its Dock side items are a Group with Invoke plus a Button with
>   Toggle; the pressed side reads Toggle=On. Invoking the Group undocks and docks. Measured 2026-10-30 on Chrome 156 with
>   DevTools docked in a wave window (`S5-liveC20b.md` §6 item 1; `recipes/s13-devt.ps1`; Run 20 slice C attempt 2 read
>   `side=right`).

## (c) Root `CLAUDE.md` — Commands

Current: `npm test  # vitest — 5596 passed, 235 files (`npm test` 2026-10-29, Step 12 S8; recipes/test included)`.
Proposed: `# vitest — 6030 passed, 251 files (`npm test` 2026-10-30, HEAD `f6bafc5`; recipes/test included)`. Source: the
`npm test` run of this stage ("Test Files 251 passed (251)", "Tests 6030 passed (6030)"). `scripts/doc-check.mjs` flags
`CLAUDE.md:114  5596 passed` until this lands.

## (d) The plan-drift finding 1 caveats, and old console text

1. `mcp/CLAUDE.md` ~line 62-66, the console bullet. Current: "`browser_console_messages` output is capped at 20 000
   characters and keeps the oldest lines, then one marker `… [truncated: N more lines, the newest — narrow with
   level/limit]` (… measured `body-chars=18278 marker=yes first-index=1`, R19-CON-CAP PASS …). Which end to keep is open
   for the user (#355). Its description says "frames are not read", but a same-site frame's messages are read
   (R19-CON-FRAME, `extension/src/CLAUDE.md`)." Proposed: "`browser_console_messages` output is capped at 20 000
   characters and keeps the newest whole lines, printed oldest first, with one marker line first, `… [truncated: <n> older
   lines cut — narrow with level/limit]` (`formatConsole`, `sdk/src/format/console-messages.ts`; measured
   `body-chars=18278 marker=yes first-index=192 last-index=200`, R20-CON-CAP PASS, 2026-10-30;
   `sdk/test/s12-console-cap.test.ts`; #398). The description says only a frame in another site's process is not read, and
   that an object logged before the call shows its class name only (R20-CON-DESC PASS; `mcp/test/s12-console-cross.test.ts`)."
   (Citation: plan-drift finding 1; `S3b.md`; `S5-run-record.md` §1a.)
2. `mcp/CLAUDE.md` line 20: "the returned `value` has sorted object keys, which Step 13 fixes: `extension/src/evaluate/CLAUDE.md`,
   #374". Proposed: "the returned `value` keeps the page's key order since Step 13 S2 (`extension/test/s13-envelope.test.ts`;
   R20-ARGS-ORDER SDK leg 5 of 5 equal, printed verdict RECORD)".
3. `extension/src/CLAUDE.md` lines 60-61: delete the last sentence ("The MCP tool's description still says only "frames are not
   read" (`mcp/CLAUDE.md`).") and add "The tool's description and `Tab.consoleMessages`' JSDoc say so (Step 13 S3b, R20-CON-DESC PASS)."
4. `extension/src/CLAUDE.md` lines 55-58, the replayed-args bullet: keep the measured text; add "Step 13 made this the
   documented limit, not a defect (#387; R20-CON-NOTEA PASS; the tool's description says it)". Drop "R19-CON-NOTEA FAIL" as the
   final word only by adding, not replacing, the R20 result.
5. `extension/src/evaluate/CLAUDE.md` lines 26-29 ("`returnByValue` sorts object keys in the returned `value`"): the fact stays
   measured as Chrome's; add: "Since Step 13 S2 the serialiser's envelope crosses as one JSON string written by a closure-free
   wrapper and parsed in `serializerCall`'s `callFn`, so `value` keeps the page's order (`extension/test/s13-envelope.test.ts`,
   `extension/test/s12-args-cdp.test.ts`; R20-0 `keys=page`); the fake CDP (`extension/test/s12-engine-cdp.ts`) sorts keys like
   Chrome. Limits left (`S2.md`): a page that replaces `Object.keys` can still bend `value`; no test of a non-function
   enumerable property on `Object.prototype`; `toJSON` on `description` (#397)." Change "compare ... never by key order" to
   say the order is now the page's.
6. `sdk/CLAUDE.md` lines 120-121: "`evaluate`'s returned `value` has its object keys sorted ... Step 13 fixes the sorted keys
   (#374)." Proposed: "keeps the page's key order since Step 13 S2 (R20-ARGS-ORDER SDK leg `value-equal=5`; the row prints RECORD)."
   Line 121-122: "`Tab.consoleMessages` reads same-site frames too" stays true; add "its JSDoc says so since S3b".
7. `daemon/CLAUDE.md` lines 78-83 ("A popup of a **background** opener gets no lease at all ... would be a design change to the
   opener rule, the user's call"): now false for an extension that holds the permission. Proposed: "Since Step 13 S1 the
   extension joins `tabCreated` with `webNavigation.onCreatedNavigationTarget` within 250 ms and sends `openerTabId` = the
   navigation source, or none (`extension/src/opener-join.ts`, `extension/test/opener-join.test.ts`); the daemon's opener rule
   is unchanged. A background opener's popup is leased to the opener's owner (R20-POP-BG-3 PASS, 3 of 3, `in-ms=110`); a popup
   with no bridge caller is not measured (R20-POP-OTHER-3 NOT MEASURED). Chrome's own `openerTabId` names the active tab for a
   background opener (25 of 30, Stage 0), so the extension never falls back to it."
8. `extension/CLAUDE.md` Key files, line ~22: add `opener-join.ts` (pure: holds a `tabCreated` up to `OPENER_JOIN_HOLD_MS` = 250
   ms and joins it with `onCreatedNavigationTarget`'s `sourceTabId`; ids only, no log; a held event is released before that
   tab's `tabRemoved`/`tabReplaced`; `extension/test/opener-join.test.ts`, `tab-events.test.ts`) next to `tab-events.ts`. Add the
   manifest fact where permissions are listed (line ~55 names only `declarativeNetRequestWithHostAccess`): "`webNavigation`,
   granted by the user (#374), no new install warning (#393); `extension/test/manifest.test.ts`; `extension/test/s3a-dnr-wiring.test.ts`
   pins 21 listeners with exactly one `onCreatedNavigationTarget`". Line 96-97: "Undocked and DevTools-first are measured in
   Step 13's Run 20" -> add the result once the user rules #419: "neither refused the attach (R20-DEVT-UNDOCK, R20-DEVT-EARLY PASS,
   Chrome 156, 2026-10-30)". The text there is also bound by item (f).
9. `extension/src/handlers/CLAUDE.md` or `extension/CLAUDE.md` chooser text: if either states that a second chooser call answers the
   DevTools overlap text, replace with: "a second chooser upload on a tab answers `DEBUGGER_DEVTOOLS` with the fixed
   `CHOOSER_BUSY_MESSAGE` (`extension/src/handlers/upload.ts`; `extension/test/s5a-chooser.test.ts`; R20-CHOOSE-TWICE PASS,
   `names-devtools=no`); every other `DEBUGGER_DEVTOOLS` text is unchanged; the MCP prints it bare with `isError`
   (`mcp/test/s13-chooser-busy.test.ts`)." My grep of those two files found no sentence about it, so this may be only a Key-files
   mention. `daemon/CLAUDE.md` (the trusted settle pause releases the visibility lock on rejection, `.then(release, release)`,
   #390, `daemon/test/s6-trusted-focus.test.ts`) deserves one line.
- (d10) `extension/src/CLAUDE.md` lines 47-51 (the chooser bullet) is stale: it says the disabled-input refusal cannot be reached live
  (R19-CHOOSE-REFUSE leg `dis`, #370) and R19-CHOOSE-KEPT's cause is not established. Append: Run 20 reached it live on a page whose own
  control flips the input to disabled after the chooser opens (R20-CHOOSE-REFUSE-DIS, PASS, `BAD_PARAMS`); an identical second
  selection fires no `input`/`change` and `cancel` fires, which is Chrome's unchanged-selection rule (R20-CHOOSE-KEPT, RECORD).

## (e) Out-of-lane items from S1 and S4

- **S1's N3.** The spec bullet added in S1's spec note (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, §10) says no
  daemon, SDK or MCP path "reads" a `listTabs` row's `openerTabId`; the daemon relays it unchanged (`daemon/src/intercept.ts`
  ~676-683). Proposed wording: "acts on it; the daemon relays it". Not in S6's lane (spec).
- **S4's NIT (N3).** `E5.3`'s list of chooser messages checked for paths (`docs/e2e-test-plan.md`) lacks the new
  `CHOOSER_BUSY_MESSAGE`; optional, because `mcp/test/s13-chooser-busy.test.ts` pins the exact text and checks it has no digit.
  Not in S6's lane (the e2e plan). S4's two other NITs (the extension test frees the chooser slot only on pass; the MCP test's
  fake does not assert the method) stay as recorded.
- S1's N2: an unjoined tab's `tabCreated` can be overtaken by other tabs' events for up to 250 ms; no daemon path depends on it.
  Worth one clause in `extension/CLAUDE.md` beside the `opener-join.ts` entry.

## (f) The #369 reword — waits for the user (#374 item 3, #419)

Not applied to `docs/setup.md` or `README.md`. Do not apply until the user rules #419 (whether liveC20 attempt 2's DevTools rows
stand) and #374 item 3. Places: `docs/setup.md` The debugging banner ("**Not measured:** Chrome's DevTools opened docked did not
make the bridge's calls fail ..."), Troubleshooting ("Chrome allows one debugger per tab, and DevTools wins ... *Limit,
2026-10-29:* ..."), and `extension/CLAUDE.md` line ~96-98.

Proposed `docs/setup.md` Troubleshooting text, replacing the first sentence and the Limit note:

> **"Chrome DevTools (or another extension) is already attached to this tab"**: another debugger client holds the tab's
> debugger, so the trusted action cannot attach. Close that client on the tab and retry. *Measured 2026-10-30 (Chrome 156,
> fixture pages): neither DevTools undocked and opened after an earlier attach (R20-DEVT-UNDOCK, PASS) nor DevTools opened
> before the bridge's first attach, docked or undocked (R20-DEVT-EARLY, PASS), made the bridge's attach refuse; each call
> answered `ok` with a bridge-independent control showing DevTools open and attached.* So "DevTools wins" is not shown for
> these cases; the message is still produced for another extension's debugger (not measured). R20-UP-DEVT, R20-KEEP-4 and
> R20-SWEEP-HELD were not run because no condition refused.

Proposed banner-section sentence, replacing "**Not measured:** ... NOT MEASURED; decisions.md #369": "Chrome's DevTools did not
make the bridge's calls fail in Run 19 (docked, 31 of 31 `ok`) or in Run 20 (undocked after an earlier attach, and opened
before the first attach, docked and undocked; R20-DEVT-UNDOCK, R20-DEVT-EARLY PASS). A kept session meeting DevTools and the
start-up sweep of a held tab are not shown live (R20-UP-DEVT, R20-KEEP-4, R20-SWEEP-HELD NOT RUN; R19 rows NOT MEASURED)."
Citation: `S5-run-record.md` §4 and §7; the phase doc's "continues anyway, recorded" case. Waits for the user.

## (g) Anything else

- `extension/CLAUDE.md` line 17 says the hello carries `features: ["evaluateArgs", "uploadChooser"]`; unchanged by Step 13
  (S1 adds no feature flag; the wire shape is unchanged). No edit.
- `shared/CLAUDE.md`: no change (the wire protocol and codes are unchanged; 27 codes, 26 on the wire).
- `recipes/CLAUDE.md` Key files (line ~36) already lists `s13-devt.ps1`. The Run 20 helper facts the record names as proposals
  (`S5-run-record.md` §7 proposals 1-3: count `wave-windows-open` after the options window closes; pass a failures folder to
  the MCP actor; a human-leg route that is not a UIA click) are decisions for the user, not CLAUDE.md edits yet.
- The held liveB20 files stay untracked until the user rules #417; no CLAUDE.md should cite their line numbers.
