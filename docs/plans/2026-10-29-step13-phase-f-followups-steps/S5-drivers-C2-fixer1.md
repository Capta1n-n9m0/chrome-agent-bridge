# S5-drivers-C2 fixer, round 1

Model and effort: Sonnet 5.5, medium. Nothing was run against Chrome, a daemon or a port.

## 1. Verdict
DONE. F1–F5 fixed, none disputed.

## 2. Outputs
Files: `recipes/s13-r20-c.ts` (201 → 219 lines), `recipes/test/s13-r20-c.test.ts` (130 → 172). Slice about 391 lines.
- `npm test`: 250 files, **5974 passed** (5969 before; +5 tests). `npm run typecheck` 0; all eight `recipes/tsconfig*.json` 0; `npm run build` 0; `node scripts/doc-check.mjs` 0.
- `git status --short`: the two tsconfig edits, the three earlier reports, the actor and its test, this report.
- Red proof: the new test file ran against the OLD actor in a copy outside the main tree (no `node_modules`, no link, imports rewritten to absolute file URLs, main tree's vitest with `--root <copy>`): 6 failed, 17 passed. The 6 fails: open-not-ok leg read PASS, `condGate` and `keep4Gate` not functions (3 tests), `gateCond` counts line missing. The F5 additions (unique marker, `parseCtl` anchors) pass on the old code because the code was already right: they guard against mutants m12 and m14 (not re-run as mutants).

## 3. Per finding
- **F1** `keep4Gate(after, state, opened, openMs)`: `openMs >= KEEPER_IDLE_MS` (imported from `extension/src/debugger-keeper.ts`) gives both legs `NOT MEASURED DevTools was not opened before the keeper's idle bound`. t0 now starts before the first `consoleMessages`. The CHECK line prints `open-ms` and `bound-ms`. Tests: at the bound, bound+1 (NOT MEASURED), bound-1 (PASS).
- **F2** `condGate(before, after, state, opened)`: `opened=false` gives RECORD `devtools-control-unreadable`. Used by `devtLegResult` (new `LegIn.opened`), UP-DEVT, SWEEP-HELD phase 1; `keep4Gate` checks it first. Tests: both states, plus no finding when the call is K-devt.
- **F3** UP-DEVT and SWEEP-HELD phase 1 read `ctl0` before the open and judge it through `condGate` (before `attached=yes` gives NOT MEASURED "the tab was attached before the open"). UP-DEVT's `resetPage` is dropped (the tab is fresh, the reporter starts at zero, `readPage` still waits for it), so nothing attaches before the open and no idle wait is needed. KEEP-4 reads no before-open control: undocked needs `windows=1 title=ok attached=yes`; docked is always RECORD `devtools-control-unreadable`. SWEEP-HELD phase 2 stays after-only (the verifier's wording).
- **F4** `gateCond(findings, devtLegs)`: the finding line only when at least one DEVT leg ran and all were PASS; else `CHECK R20-DEVT no-refusal legs-pass=<n> legs-other=<n>`. The three NOT RUN lines are unchanged. Tests: both branches, empty and missing legs.
- **F5** Marker test asserts `new Set(m).size === m.length`; `parseCtl` cases `"1 ok yes 8 9"` and `"9 1 ok yes 8"` must read unread.

## 4. Deviations
None. Expected texts and pass rules are unchanged (the new NOT MEASURED text is new, for F1's fixed reason).

## 5. Proposed decisions
### 2026-10-30 · A failed DevTools open is an unreadable control, in every row
**Decided:** `open` answering anything but `ok` makes that leg or row RECORD `devtools-control-unreadable`, docked or undocked. **Why:** the sheet's rule for a control the helper cannot open or undock; a docked leg's control is `attached` alone, so a failed dock change could otherwise PASS with DevTools undocked. **Instead of:** ignoring the answer. **Revisit if:** never needed. **By:** Claude (proposed)
### 2026-10-30 · KEEP-4 is judged against the keeper's idle bound, measured from before its first call
**Decided:** both legs are NOT MEASURED when the open took `KEEPER_IDLE_MS` or longer from before the kept session's first call. **Why:** past the bound the kept session may have gone, so the row could PASS without meeting DevTools. **Instead of:** recording `open-ms` without judging it. **Revisit if:** the product's bound changes (the import follows it). **By:** Claude (proposed)
### 2026-10-30 · The conditional rows read a before-open control; KEEP-4 reads none; a docked KEEP-4 leg is RECORD
**Decided:** as F3 above, with UP-DEVT's page reset dropped. **Why:** the reset attached the bridge before the open. KEEP-4's own first step keeps a session, and a docked state has no bridge-independent control (the verifier's decision, adopted). **Instead of:** an assumed `attached=no`. **Revisit if:** a UIA docked-pane reader is accepted as a docked leg's window clause. **By:** Claude (proposed)
### 2026-10-30 · The no-refusal finding needs all DEVT legs PASS
**Decided:** `gate-cond` takes `--legs`; otherwise only counts are printed. **Why:** "both conditions answer ok" is not observed when a leg was RECORD, NOT MEASURED or FAIL. **Instead of:** printing it for every `none`. **Revisit if:** never needed. **By:** Claude (proposed)

## 7. Handoff (C3)
Interface §3 changes from the builder's:
- New steps: `<row>-<leg>-ctl0` now also for `R20-UP-DEVT-<state>` and `R20-SWEEP-HELD-<state>` phase 1; **not** for KEEP-4 (steps there: `open`, `ctl1`, `close`). DEVT legs unchanged.
- `gate-cond --findings <list> --legs <comma list of the DEVT legs' verdicts, one word each: PASS, RECORD, NM or FAIL>` (new `--legs`; only PASS matters).
- Every `open` answer must be `ok` or `fail` (as before); `fail` is now a verdict.
- **Set the dock side in an earlier DevTools session** so KEEP-4's open needs no dock change (`Set-S13DockSide` returns at once when it matches), else its time may pass the 5 s bound and both legs are NOT MEASURED.
- UP-DEVT no longer attaches before the open; ctl0 must be read right after the tab opens, before anything touches it.
- F6 (carry phase 1's verdict into SWEEP-HELD's one ROW; keep the NOT MEASURED reason from the LEG line) is still C3's.
