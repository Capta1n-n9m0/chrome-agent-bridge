# S4-live fixer 1 (Sonnet, medium)

1. Verdict: DONE
2. Outputs
- recipes/s11b-r17.ps1: `$Blocks['f-filetab']` now starts with `if (Test-S11Own $global:O) { Close-S11Window $global:O; $global:O = 0; Save-S16; Say9 "F-FILETAB closed the wave's options window O before the file window (own page is hidden as blocked)" }`, before `Open-S11bFileWindow`. ASCII only. No pass rule, judge, expected text or s9.ts check changed.
- recipes/test/s11b-r17-static.test.ts: new test pinning guard < Close-S11Window < Save-S16 < Open-S11bFileWindow inside the f-filetab block.
- npm test: 4487/178 -> 4488 passed, 178 files. Seven recipes/tsconfig*.json exit 0 (fe, base, s10, s11, s11b, s6, s9). `npm run typecheck` exit 0. `-Block plan` exit 0.
- git status: only the two lane files changed, plus the steps-dir files that were already there.
3. Deviations: red-before was not run as a separate step (I edited code and test together, then ran). The test fails by construction without the change: every `indexOf` for the guard, the close and the save would be -1 or out of order.
4. Findings: `$global:O` is read directly only in `Use-S16Options` (s11b-r17.ps1:303-304), which reopens a fresh O when absent or dead. Every other use (rd0 Save-S11Found, g1-open/close, rd5, rd5b, rd-dl-socket, root-add, r17-up-*, f-home, rd-restore, teardown restore at ~350) goes through `Use-S16Options`. F-HOME (`$Blocks['f-home']`) calls `Use-S16Options`, so it opens a fresh O. Nothing assumes O stays open across F-FILETAB. Side effect: the next block that needs O opens a new window (one more `New-S16Window`).
