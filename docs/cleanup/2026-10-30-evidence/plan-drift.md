# Plan drift — cleanup pass 2026-10-30 (full, Step 13 close-out)

Area cleaner (Opus, medium). Scope: `git diff 815255a..HEAD`, read against Step 13's as-built
(`docs/plans/2026-10-29-step13-phase-f-followups.md` § As built) and the code. Read only; this file is the one write.
Not touched: the #369 / "DevTools wins" wording, decisions archiving, a Phase G kickoff, the six untracked liveB20 files.

## Findings

### 1. Root `CLAUDE.md` Commands names seven recipe tsconfigs; there are eight — mechanical
- **Location:** `CLAUDE.md:118`.
- **Wrong:** "tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b cover the others; all seven exit 0, 2026-10-29 cleanup pass".
- **Evidence:** `ls recipes/tsconfig*` lists `tsconfig.s13.json` too (added in Step 13 S5; it includes `s13-forms.ts`,
  `s13-r20*.ts` and their tests, and `tsconfig.s6.json` now excludes those tests). `recipes/CLAUDE.md:39-40` already says
  "`tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` … all eight exit 0".
- **Fix:** add `.s13` and say "all eight", with the date of a fresh run of all eight (the lead runs them; don't carry
  2026-10-29 over a file that did not exist then).

### 2. `recipes/README.md` has no Step 13 entries and no `.s13` typecheck line — mechanical
- **Location:** `recipes/README.md` Scripts table (ends at the `s12-*` rows, lines 48-52), Typecheck block (lines 78-85).
- **Wrong:** 16 Step 13 files are not listed: `s13-forms.ts`, `s13-r20.{ts,ps1}`, `s13-r20-a.{ts,ps1}`, `s13-r20-a2.ts`,
  `s13-r20-b.{ts,ps1}`, `s13-r20-b-defs.ps1`, `s13-r20-b4.{ts,ps1}`, `s13-r20-c.{ts,ps1}`, `s13-r20-c-defs.ps1`,
  `s13-win.ps1`, `s13-devt.ps1` (and the fixture `test-fixtures/s13-chooser.{html,js}`). The typecheck block has no
  `npx tsc --noEmit -p recipes/tsconfig.s13.json`.
- **Evidence:** `ls recipes/s13*` (16 files); `git diff --stat 815255a..HEAD -- recipes/README.md` is empty.
- **Fix:** add rows in the existing form, e.g. "`s13-forms.ts` | Run 20's line forms (§4.28) as pure formatters …";
  "`s13-r20*.{ts,ps1}`, `s13-r20-{b,c}-defs.ps1` | Run 20's block runner and slice drivers (§4.28; order in
  `…step13…-steps/S5-sheet.md`)"; "`s13-win.ps1`, `s13-devt.ps1` | Run 20's Windows helpers and the DevTools
  opener/dock reader (#368, #369, #418)". Add the `.s13` typecheck line ("the Step 13 S5 files").

### 3. Base spec §5.1's permission note stops at Step 11b — mechanical
- **Location:** `docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md:89-91`.
- **Wrong:** "*Superseded 2026-10-27: Step 5 added `webRequest` and Step 11b `declarativeNetRequestWithHostAccess` …; the
  list of record is `extension/manifest.json`.*" — no mention of `webNavigation`.
- **Evidence:** `extension/manifest.json` permissions end with `"declarativeNetRequestWithHostAccess", "webNavigation"`
  (Step 13 S1, pinned by `extension/test/manifest.test.ts`).
- **Fix:** append `*Corrected 2026-10-30: was "Step 5 added webRequest and Step 11b declarativeNetRequestWithHostAccess";
  as built Step 13 S1 also added webNavigation (#374, #385; phase doc § As built).*`

### 4. Multi-actor spec §6.2's opener paragraph has no pointer to the Step 13 S1 note — mechanical
- **Location:** `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:208-210` (§6.2, "A tab that a page opens itself
  (`target=_blank`, a popup) carries `openerTabId`; the daemon leases it to the opener's holder …").
- **Wrong:** §6.2 still reads as if `openerTabId` were Chrome's value. Since S1 it is the `webNavigation` source tab
  when joined within 250 ms, and absent otherwise; that is only in §10 (lines 997-1018). Every earlier change to §6.2's
  events (2026-10-23, 2026-10-24, 2026-10-27) carries its own dated pointer under the paragraph; this one does not.
- **Evidence:** `extension/src/opener-join.ts` (`OPENER_JOIN_HOLD_MS = 250`; "Not joined: emitted with none, never
  Chrome's value"); `extension/src/tab-events.ts` `joinedTabCreated`; spec §10 "Note 2026-10-29 (Step 13 S1 …)".
- **Fix:** add under the 2026-10-27 amendment: `*Amended 2026-10-30 (Step 13 S1, #385): tabCreated.openerTabId is the
  tab whose page opened the new tab (webNavigation.onCreatedNavigationTarget's sourceTabId, joined within 250 ms), or
  absent; never Chrome's openerTabId. A background opener's popup and a Ctrl+click or middle-click tab now go to the
  opener's holder. See §10's Step 13 S1 note.*`

### 5. Roadmap's Step 10 summary says, in the present tense, that a background opener's popup gets no lease — mechanical
- **Location:** `docs/progress-and-roadmap.md:262-263` (§1, Step 10).
- **Wrong:** "A popup of a background opener gets no lease because Chrome names another tab as its opener (R15-POP-2)."
- **Evidence:** Step 13 S1 (`extension/src/opener-join.ts`); R20-POP-BG-3 PASS 3 of 3 (`…step13…-steps/S5-run-record.md`,
  #407). The same section's §5 block (line 889) already carries the 2026-10-30 update. `daemon/CLAUDE.md` and
  `docs/setup.md` Owners say "before S1".
- **Fix:** append `*Updated 2026-10-30: Step 13 S1 leases it to the opener's holder through a webNavigation join
  (#385; R20-POP-BG-3 PASS, 3 of 3).*`

### 6. `docs/setup.md`'s upgrade note says an old extension leaves the popup "unowned"; it can lease the popup to another client — mechanical (wording; the lead re-checks)
- **Location:** `docs/setup.md:103-105`.
- **Wrong:** "an extension not reloaded since Step 12 leaves a background tab's popup unowned".
- **Evidence:** an extension older than S1 sends Chrome's `openerTabId` (spec §10 S1 note: "An extension older than S1
  sends Chrome's `openerTabId` as before"). For a background opener, Chrome names the window's active tab (25 of 30,
  Stage 0, `Stage0.md` § Measured facts). The daemon grants the new tab to whoever holds the named tab
  (`daemon/src/intercept.ts` `applyOpener`: `const owner = openerHandle ? this.leases.ownerOf(openerHandle) : undefined;
  … this.leases.grant(handle, owner.clientId, "opener", …)`). So when the active tab is held by another client (as in
  POP-JOIN-2's setup), the old build leases the popup to that client. It stays unowned only when the active tab is unheld,
  which was the R14/R15 case.
- **Fix:** "… leaves a background tab's popup unowned, or leases it to whoever holds the window's active tab
  ([Owners](#owners-leases); …)".

### 7. `sdk/CLAUDE.md`'s key-file entry for `formatConsole` cites only the open-direction decision — mechanical (NIT)
- **Location:** `sdk/CLAUDE.md:34`.
- **Wrong:** "`format/console-messages.ts` (`formatConsole`, capped at 20 000 characters, #345, #355)". #355 left the
  direction open; the entry does not say which end is kept.
- **Evidence:** `sdk/src/format/console-messages.ts`: "Whole lines are kept from the newest back … A cut opens with one
  marker line"; #398; `mcp/CLAUDE.md:62-65` already says so.
- **Fix:** "(`formatConsole`, capped at 20 000 characters, keeps the newest whole lines under one marker line; #345,
  #398)".

### 8. `extension/CLAUDE.md`'s top-level-listener gotcha does not name the new `webNavigation` listener — mechanical (NIT; it may belong to gotcha placement)
- **Location:** `extension/CLAUDE.md:141-144`.
- **Wrong:** the rule lists the `chrome.webRequest` listeners and the `chrome.tabs.on{Created,Updated,Removed,Replaced}`
  listeners as the ones that must be registered synchronously at the top level of `sw.ts`. It does not name
  `chrome.webNavigation.onCreatedNavigationTarget`, which feeds the same tab events through the join.
- **Evidence:** `extension/src/sw.ts` registers
  `chrome.webNavigation.onCreatedNavigationTarget.addListener((d) => openerJoin.navigationTarget(d.tabId, d.sourceTabId))`
  at the top level. `extension/test/s3a-dnr-wiring.test.ts:224-228` pins 21 listeners, exactly one of them this one.
  A lazily registered listener would miss the event that wakes the worker, and the popup would go out unjoined (unowned).
- **Fix:** append "and the `webNavigation.onCreatedNavigationTarget` listener that feeds the opener join (Step 13 S1)".

## Checked, no drift
- `docs/setup.md`: the permission (l.102-105), Owners (l.285-295), key order (l.626-630), the console cap, frames and
  NOTEA (l.752-784, tools table l.166), and the chooser text (l.911, l.1452) all match the code (`console-messages.ts`,
  `registry.ts`, `upload.ts` `CHOOSER_BUSY_MESSAGE`).
- `docs/e2e-test-plan.md`: §1 item 5 note (l.46), POP-JOIN-1..3 (l.316-318), §4.28 and Run 20 added. The standing §4.7
  rows make no key-order claim. The R19 sheet rows are frozen records.
- `README.md` Step 13 paragraph and test count (l.66-79).
- Multi-actor spec §10 S1 and S4 notes (l.997-1026) match `opener-join.ts`, `sw.ts`, `tab-events.ts` and `upload.ts`.
  There is no spec claim about `evaluate`'s value order to correct.
- Package `CLAUDE.md` files: `daemon` (l.77-85), `mcp` (l.20, l.62-66), `sdk` (l.120-123), `extension` (l.23-28, the
  21-listener pin, 54 log sites), `extension/src` (chooser, console), `extension/src/evaluate` (`SERIALIZER_JSON_SRC`).
  Root Current state and counts (6030 / 251; 25 tools, 28 methods, 27 codes).
- Phase doc plan body: the S1 lane still names `shared/src/protocol.ts` and `daemon/src/intercept.ts`, but the dated
  note after Stage 0 (0.2, "not in S1's lane") already corrects it.
- `docs/plans/handoffs.md` (no Step 13 wave). `next-session-prompt.md` is marked spent. Roadmap §5 Phase G (l.916-918)
  is consistent with #374 item 11.
