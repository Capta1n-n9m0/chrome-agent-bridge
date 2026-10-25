# S5-rules builder report

Model: Sonnet 5.5, effort medium. UTC 2026-10-26 ~00:30 to ~00:45 (file times; approximate). Context use: about 90k tokens.

## 1. Verdict
DONE.

## 2. Outputs
- `recipes/s11-rules.ts` (532 lines incl. comments; about 450 of code), `recipes/tsconfig.s11.json`, `recipes/test/s11-rules.test.ts` (43 tests). Nothing committed.
- `npx vitest run recipes/test/s11-rules.test.ts`: 1 file, 43 passed. `npm test`: 147 files, 3668 passed. `npm run typecheck`: exit 0. `npm run build`: ok (extension built). `npx tsc --noEmit -p recipes/tsconfig.s11.json`: exit 0 (including the NO_FILE_ACCESS_MESSAGE import from extension/src/upload-files.ts).
- Test-first: the test file was run before the code existed (red: module missing), then the code was written.
- Row to function (all in `recipes/s11-rules.ts`; texts from table `K`, `MCP_UP_LINE`, `mcpOkText`):
  - UP-L1: `foundcheck` (FOUNDCHECK line, imports `parseUploadFolders`/`uploadPathsAllowed`), `buildJudge`, `refusalSteps` with K-gate.
  - UP-0: `stateLine`, `toggleLine`, `foundStateGuard`, `liveBPlan` (the 17 `NOT RUN — waits for G11-3` lines, `UP_WAITING_ROWS`).
  - UP-OPT: `optSummary`, `optExpected`, `optVerdict` (K-opt-stand/rel/root/home/sum/item).
  - UP-FA: `faVerdict`, `TOGGLE_ON_FA`. UP-6: `UP6_STEPS` + `refusalSteps`. UP-7: `UP7_LEGS` + `refusalSteps`.
  - SAVE-REFUSE-R: `saveSdkVerdict`, `saveControlVerdict`, `saveMcpVerdict`, `saveFilesVerdict`.
  - SW-2: `sw2`, `sw2TrialLine`. UP-1: `up1Outcome`. UP-2: `UP2_SPEC`, `uploadPageJudge`, `durationNote`.
  - UP-3, UP-4, UP-7J, UP-TWICE (`{changes:2,pairs:2}`): `uploadPageJudge`. UP-5: `up5Verdict`, `mcpOkText`, `MCP_UP_LINE`.
  - UP-6B: `UP6B_STEPS` + `refusalSteps`. UP-8: `up8Verdict`. UP-9: `refusalSteps` with K-gate. UP-PATCH: `patchVerdict`.
  - UP-RAW: `rawLeaks`, `rawVerdict`. UP-NAV: `navVerdict`. UP-DEVT: `devtVerdict`. UP-STALE: `staleVerdict`.
  - UP-RACE-A/B: `raceDone`, `raceVerdict`. UP-RESTORE: `restoreLine`, `restoreVerdict`. UP-LOGS: `scanText`, `logsLine`, `logsVerdict`. UP-CLICK: `UP_CLICK_LINE`.
  - Line wrappers: `rowLine`, `checkLine`.
- Byte-equality tests quote the sheet literally: K-gate, K-noacc, UP-6/6B texts, K-disarmed/blocked/devt, all four save texts (SAVE-REFUSE-R), SW-2's trial line and `d=[…] → …` line, FOUNDCHECK, STATE, TOGGLE, SCAN, the UP-OPT item lines, K-mcp-ok. Drift tests tie K-gate, K-noacc, K-notarget, K-disarmed, K-blocked, K-cycle, K-mcp-up and the four options texts to the product constants.
- Mutants (each tried, restored, `diff` against the original clean):
  - threshold 950 to 900: red `SW-2 > threshold edges`. Threshold 300 to 350: red `SW-2 > threshold edges`.
  - warm-up counted in the three d values: red `SW-2 > runs to its bound: d >= 950 in 3/3, warm-up excluded`, `SW-2 > threshold edges`, `SW-2 > the warm-up never counts`.
  - restore hash compare disabled: red `UP-RESTORE: read-back by count and hash > a changed hash with the same count fails`. Hash in `restoreLine` forced equal: same test red.

## 4. Deviations
- During the mutant run my own shell `echo "…950->900"` created stray files `350` and `900` in the repo root; deleted at once (`git status` clean of them).

## 5. Proposed decisions (design-local)
- `ROW <id> PASS|FAIL|NOT MEASURED: <why>` and `CHECK <step> …: <why>` line shapes (the sheet quotes neither). SW-2 warm-up line is `warm-up (trial 0, excluded): <trial line>`, unmeasured trial `NOT MEASURED: <state>`, unmeasured d shown `n/m`; outcome strings are `the wait runs to its bound`, `the event ends the wait`, `undetermined`. `RESTORE armed=equal evaluate=equal blocklist lines=<n> hash=equal uploadfolders lines=<n> hash=equal`.
- The SW-2 row verdict is PASS only with the warm-up present and 3/3 measured; otherwise NOT MEASURED (the outcome line still says `undetermined`).

## 6. Findings (no sheet edits made)
1. UP-0's STATE line: "hashes withheld unless the empty text's" is read as appending ` sha256=<empty hash>` after that section only when the text is empty. Ambiguous; the sheet gives no example.
2. UP-OPT: the home-folder line's number j is not stated; read as k+2 (typed order: relative, `C:\`, home).
3. SAVE-REFUSE-R: the sheet says the MCP actor runs "once per case" but judges only the four cases; no MCP rule exists for the control, so none is built.
4. UP-LOGS: "non-fixture scheme://host" is read as any `://` that is not http/https/ws/wss to 127.0.0.1, localhost or *.localhost (any port). `chrome-extension://` or `chrome://` in a console capture counts as other, so it is a STOP; the sheet does not exempt the extension's own page here (s10 did).
5. UP-2: the 5 MiB and 50 MiB hashes are recorded when the wave makes the files; `UP2_SPEC` holds names and sizes only.

## 7. Handoff
S5-actor imports `K`, `judgeError`, `PageObs`, `uploadPageJudge`, `refusalSteps` etc. from `recipes/s11-rules.ts`; add `recipes/s11.ts` to `recipes/tsconfig.s11.json`'s `include`. `extension/src/upload-files.ts` is modified in the tree by S3c (not mine); nothing is committed.
