# S5-drivers-B3-fixer1 — fix round 1 for R20-G2-1, R20-VERSION and the window helper

Fixer: Claude Sonnet 5.5, medium. No Chrome, no daemon, no real window touched (every Win32 call stubbed). Red proofs ran on a copy outside the tree (#395).

## 1. Verdict

DONE. F1, F2, F3 and the N2 NIT are closed. No finding was disputed.

## 2. Outputs

Files changed (lane only): `recipes/s13-win.ps1`, `recipes/s13-r20-b.ts`, `recipes/test/s13-win-ps.test.ts`, `recipes/test/s13-r20-b.test.ts`.

| Check | Result |
|---|---|
| `npm test` | 245 files, 5872 passed (5864 + 8); none removed |
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p` on all eight `recipes/tsconfig*.json` | all exit 0 |
| `npm run build` | exit 0 |
| `git status --short` | only the slice's files (the same 4 M and 4 ?? as before; this report is the 5th ??) |

New tests: 2 in `s13-win-ps.test.ts` (the raise; the 0x0013 flags), 6 in `s13-r20-b.test.ts`. Existing PowerShell tests got a `placeShort` case and the stubs for the raise.

## 3. Fixes

**F1 (MAJOR), raise after placement.** `recipes/s13-win.ps1`:
- New C# `Raise` calls `SetWindowPos(h, HWND_TOP, 0, 0, 0, 0, 0x0013)` (NOMOVE, NOSIZE, NOACTIVATE) and a thin wrapper `Raise-S13Window`, stubbed in the tests.
- `Invoke-S13Place` calls it on WB, then on WA, after `Test-S13Placed` passes. It sits after the ownership check, so only the wave's own handles are raised. Nothing is raised on a refusal (not-wave-window, gone, minimized before, no-room, did-not-fit).
- Tests: `ok RAISES=2,1` (order WB then WA); a foreign handle gives `RAISES=0`; a move that did not take gives `RAISES=0`; a window minimized after the move gives `refused minimized`; and the C# flags are pinned at 0x0013.
- Not done (B4's, as briefed): closing or minimising the options window before G2, and finding B's tab window as WB. A Chrome topmost popup still sits above a raised WB. If so the leg reads NOT DISCRIMINATING honestly.

**F2 (MINOR), surviving mutants.**
- T4: a test where covered times out and uncovered FAILs without a timeout names no cause. The code was already right (the `unc.v === "PASS"` condition is in `g2Rows`); only the test was missing. No code change.
- T8: a `winCovered` case where the only rectangle above lies in the taskbar strip outside the work area gives 0.
- T10: `judgeVersionCall` with `files: 1` and every other clause right is FAIL.
- N1 also covered: T1 (30 000 exactly counts), T22 (negative work-area size is a defect), T23 (bare `refused` is a defect), P9 (a work area wide but only 420 px high gives no placement). P8 (minimized after the move) is covered by the `minAfter` case.

**F3 (MINOR), leg gate as a pure function.** `g2LegGate(leg, {placeOk?, aloneErr?, bCov?}): V | "run"` is exported from `s13-r20-b.ts`. A refused placement (uncovered only) gives NOT MEASURED. A failed alone-control, or an uncovered WB not at 0 px, gives NOT DISCRIMINATING. Anything else gives `run`. `g2One` calls it in two steps as the facts arrive (placement before the rectangles are read, then alone-control and coverage). The printed CHECK lines and the verdict mapping are unchanged. The test table covers each branch for both legs.

**N2 (NIT), the LEG line survives a malformed after-read.** The after-leg rectangles are now read after `legLine` is printed, through the pure `afterCheckLine(R, leg, raw)`. A malformed answer prints `b-covered-after-px=unread`; an error that is not a `HelperDefect` still throws. Tests: a valid answer, garbage and an empty string.

Other NITs (N3, N4) left, as briefed.

## 4. Red proofs

A copy of the four changed files sat in the session scratchpad, with imports pointed at the main tree's unchanged modules. It was green at 55/55, and 19 mutants ran one at a time. Every one went RED:
- PowerShell: no raise of WB; no raise of WA; WA raised before WB; a raise before the ownership refusal; flags 0x0013 → 0x0014.
- TypeScript, gate: placement refusal for the covered leg too; alone-control ignored; bCov test loosened to `< 0`; bCov checked for the covered leg too; `afterCheckLine` rethrowing `HelperDefect`.
- TypeScript, F2 and N1: T4 (cause without `unc.v === "PASS"`); T8 (no work-area clip); T10 (no `files === 0`); T1 (`>=` → `>`); T22; T23.

One run of the T4 mutant was misread as a survivor because of a string mismatch in my driver; a manual re-run showed it RED (`expected … to deeply equal { covered: 'FAIL', uncovered: 'FAIL' }`).

## 5. Deviations

None. The scratch copy lives only in the session scratchpad.

## 6. Proposed decisions

None.

## 7. Findings

- `Test-S13Placed` and the raise do not change `GetWindowRect` space, so the read-back and the raise are independent.
- Tooling: Python's `subprocess` finds a different `bash` than Git Bash on this machine, so mutant drivers must call Git Bash by its full path. In a Bash heredoc `\r\n` was lost again (memory note); the driver was written with the Write tool.

## 8. Handoff

B4 still carries the §7 items of the verifier's report: closing or minimising the wave's options window before R20-G2-1, finding B's tab window as WB (`$global:S13Hwnd`), `$global:S13Owned`, the value steps `R20-G2-1-place` and `-rects-*`. A fresh verifier re-checks F1 (the stubbed raise tests), F2 and F3.
