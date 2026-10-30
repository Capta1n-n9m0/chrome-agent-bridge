# closeout-claudemd — verifier report

Claude Opus 5.5, effort medium. 2026-10-30. Read-only; nothing edited, nothing committed. Subject: the uncommitted diff on
the seven package `CLAUDE.md` files and the spec (`git diff`), the brief's items (b), (d) 1–7, 9, d10, 8 minus the
DevTools sentence, (e), (g).

## 1. Verdict

**PASS-with-notes.** 0 CRITICAL, 0 MAJOR, 1 MINOR, 5 NIT.

## 2. Outputs

- `node scripts/doc-check.mjs` → exit 0. Findings left: `Dead paths CLAUDE.md:28 docs/decisions-archive/step13.md`,
  `Test counts CLAUDE.md:115 6030 passed`, `Status text docs/plans/next-session-prompt.md:15`: all three pre-existing, as
  the brief names. No "Over word budget", no "Same gotcha in two places", no new dead path.
- Word counts (`wc -w`, the same split doc-check uses, `scripts/doc-check.mjs:18`): `daemon/CLAUDE.md` 1910,
  `extension/CLAUDE.md` 3498 (budget 3500), `recipes/CLAUDE.md` 3036, `sdk/CLAUDE.md` 1670, `mcp/CLAUDE.md` 1172,
  `extension/src/CLAUDE.md` 1076 (budget 1200), `extension/src/evaluate/CLAUDE.md` 497. Each equals the builder's figure.
- typecheck/test/build not re-run: the diff touches only `.md` files (`git status --short`: eight `M` docs, no code).
- Line endings: every changed file is uniformly CRLF (`wc -l` = `grep -c $'\r'` for each), so the LF→CRLF warning is
  the index's, not mixed endings.

## 4. Deviations

None from the brief.

## 6. Findings

### Checks that hold (evidence)

- **Opener join (daemon/CLAUDE.md:78-85, extension/CLAUDE.md:23-27).** `extension/src/opener-join.ts:16`
  `OPENER_JOIN_HOLD_MS = 250`; header comment: Chrome's `openerTabId` names the active tab for a background opener "(25 of
  30, Stage 0)", joined tabs emit `sourceTabId`, unjoined "none, never Chrome's value", "No log call", line 67 a held tab
  is released first on `onRemoved`/`onReplaced`. S1.md:45-46 states N2 exactly as the clause. S5-run-record.md:141, 226:
  R20-POP-BG-3 `granted-to=A in-ms=110` in 3 of 3; :128, 244 R20-POP-OTHER-3 NOT MEASURED. The old "gets no lease at all
  … the user's call (#226's Revisit-if)" claim is gone; `grep -rn "no lease at all\|background opener"` over every
  `CLAUDE.md` finds only the new text.
- **Settle release (daemon/CLAUDE.md:118-120).** `daemon/src/intercept.ts:577` `void this.sleep(pause).then(release,
  release)`; `daemon/test/s6-trusted-focus.test.ts:382` `describe("Step 13 S4 (#390, T4.2): a rejecting settle sleep"`.
- **Manifest (extension/CLAUDE.md:56-58).** `extension/manifest.json:8` ends `"declarativeNetRequestWithHostAccess",
  "webNavigation"`; `extension/test/manifest.test.ts:39` `ADDED_13 = "webNavigation"`; `s3a-dnr-wiring.test.ts:227-228`
  `toHaveLength(21)` and one `webNavigation.onCreatedNavigationTarget.addListener(`; #393 (decisions.md:512) "warning list
  and the card's permissions are unchanged".
- **Console cap (mcp/CLAUDE.md:62-67).** `sdk/src/format/console-messages.ts:11` `MAX_TEXT_CHARS = 20_000`, :44 marker
  `` `… [truncated: ${start} older lines cut — narrow with level/limit]` `` first, then `rows.slice(start)`;
  S5-run-record.md:98 `lines=10 body-chars=18278 marker=yes first-index=192 last-index=200`; #398. Description:
  `mcp/test/s12-console-cross.test.ts:151,154` pin both sentences.
- **Key order (mcp:20, sdk:120-122, evaluate/CLAUDE.md:30-35).** `extension/src/debugger.ts:274`
  `functionDeclaration: SERIALIZER_JSON_SRC`, :287 `parseEnvelopeText(...)`, so "parsed in the extension" is right;
  `extension/test/s12-engine-cdp.ts:17` `Object.keys(v).sort()`; S5-run-record.md:80 `LOADED20 keys=page`, :91 SDK leg
  `value-equal=5`, :67 row RECORD as printed; S2.md:48-50 N1/N2 match the two limits; #397 matches the `toJSON` limit.
- **Chooser (extension/src/CLAUDE.md:47-56).** `extension/src/handlers/upload.ts:49` `CHOOSER_BUSY_MESSAGE`, :166 thrown
  with `ErrorCodes.DEBUGGER_DEVTOOLS`; `extension/test/s5a-chooser.test.ts:577-578`; `mcp/test/s13-chooser-busy.test.ts:44`
  `expect(res.isError).toBe(true)`; S5-run-record.md:152-156 for TWICE (`names-devtools=no`), KEPT and REFUSE-DIS (`flip`
  BAD_PARAMS). No other `CLAUDE.md` still says a second chooser call answers the overlap text (`grep "#335|second
  chooser"`).
- **Console texts (extension/src/CLAUDE.md:63-68).** `sdk/src/tab.ts:390` JSDoc names the other-site-process limit;
  R20-CON-NOTEA and -DESC PASS at S5-run-record.md:68-69; #387.
- **Recipes UIA bullet (recipes/CLAUDE.md:91-96).** Matches S5-liveC20b.md:27-42 (two Buttons of one name; opener
  ExpandCollapse only, inner icon Invoke only; menu in X's own tree "with no new window"; Group+Invoke, Button+Toggle,
  "Dock to right" Toggle=On) and §6 item 1 (Group Invoke undocks and docks), Chrome 156, 2026-10-30.
  `recipes/s13-devt.ps1` exists.
- **Spec (§10, lines 1016-1018).** `git diff -U0` on the spec has no `-` line: three added lines, a dated sub-bullet,
  the existing bullet unedited. Its claim holds: `intercept.ts:682` rows are `{ ...t, tab: handle }` (the spread keeps
  `openerTabId`), `record()` (:649-668) reads only `id`, `hidden`, `url`, `title`; the daemon reads `openerTabId` only on
  `tabCreated` (:323, :350); `grep -rn openerTabId sdk/src mcp/src` finds nothing.
- **Scope.** `git diff --quiet -- CLAUDE.md docs/e2e-test-plan.md docs/decisions.md docs/setup.md README.md
  docs/plans/2026-10-29-step13-phase-f-followups.md` → clean; `journal.md` not in `git status`; the six liveB20 files
  keep mtimes 06:40-06:57, before the builder's edits (09:21+). The #419 sentence is unchanged (`extension/CLAUDE.md:103`
  "Undocked and DevTools-first are measured in Step 13's Run 20."). S4's N3 not applied.
- **Style.** `git diff | grep '^+' | grep -iE "aliev|abbas|hurual|C:\\|/c/Users|Users/|superseded|formerly|liveB20|
  S13-live-record"` → no match; no `B:<n>` or `.txt:<n>` cite (#417).

### Findings

**F1 (MINOR) — extension/CLAUDE.md:158, a hedge turned into a claim.** Old: "The 25 s keepalive alarm means the worker
rarely idles out, so the write-through is really insurance against a forced stop or a crash." New: "The 25 s keepalive
alarm keeps the worker from idling out, so the write-through insures …". "Rarely" became "keeps … from", a stronger fact
than was measured; the tightening was for words only. Evidence: `git diff extension/CLAUDE.md` hunk `@@ -151,6 +155,5`.
Fix: "keeps the worker from idling out most of the time" or restore "rarely idles out".

**F2 (NIT) — extension/CLAUDE.md:76, a Key-files description dropped.** Old named what the four older handlers serve
"(the DOM actions, evaluate, navigate, snapshot and screenshot methods)"; new keeps only the file names. Not a measured
fact, but a reader-facing one lost in the tightening. Fix: restore the parenthesis if words allow, or leave.
Also dropped, minor: `upload-exists.ts` "its pure parts tested" (:66) and the daemon's decision cite
"decisions.md · 2026-10-25 · S7: Run 15 stands as recorded; its follow-ups (#226) item 3, #211 closed" (daemon:84-85).
`SAFETY_KEYS` "in `storage.local`" was dropped at :59 but the fact stays at :218, so nothing is lost there.

**F3 (NIT) — extension/CLAUDE.md:23, the hold is narrower than stated.** "holds a `tabCreated` up to … 250 ms" reads as
every `tabCreated`; `opener-join.ts:9` holds only a tab that carries Chrome's `openerTabId` ("A tab without Chrome's
`openerTabId` is emitted at once, with none"). Fix: "holds a `tabCreated` that carries Chrome's `openerTabId` up to …".

**F4 (NIT) — extension/src/CLAUDE.md:53, an interpretation without a source.** "which is Chrome's unchanged-selection
rule" is not in S5-run-record.md:153-155 (it records only that an identical selection fires no `input`/`change` and
`cancel` fires); it first appears in S6-claude-md-proposals.md:103. The behaviour matches the HTML spec's
cancel-on-unchanged-selection step, so it is likely true. Fix: say "as the HTML spec's file-input steps describe" or
drop the clause.

**F5 (NIT) — extension/src/evaluate/CLAUDE.md:33, an ambiguous source.** "Limits left (S2.md)" names a bare file name
that exists in several steps' dirs; the bullet's other cite uses `…step12…-steps/`. Fix: `…step13…-steps/S2.md` §3.

**F6 (NIT) — extension/CLAUDE.md:56-58, placement.** The `webNavigation` permission fact sits inside the `safety-dnr.ts`
entry's parenthesis, which it has nothing to do with (it is where the proposal put it, beside the other permission).
Fix, optional: move it to the `opener-join.ts` entry or the `manifest.test.ts` mention at :75.

Note (no finding): the slice-B verdicts cited (R20-POP-BG-3, -OTHER-3, CHOOSE-TWICE/KEPT/REFUSE-DIS) come from the
committed S5-run-record.md, not the held liveB20 files; #417 holds only R20-LOGS's ruling, so they stand as recorded.

## 7. Handoff

No processes started. The step agent may accept as is or send F1 (and any NITs) to a fixer.
