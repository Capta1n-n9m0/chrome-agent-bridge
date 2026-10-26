# S5-runner step report: Run 16's block runner

Step 11 (D3 file upload), stage S5 (Run 16), slice S5-runner. Risk: low. Step agent: Opus 5.5, 2026-10-26 03:39Z → 04:17Z.

## 1. Verdict

**DONE.** The verifier's final verdict is **PASS-with-notes** (`S5-runner-verifier2.md`). Nothing ran live. Port 9234 stayed free throughout, and no server ran on 8081 or 8084.

## 2. Outputs

- `recipes/s11-r16.ps1`: 403 lines by `wc -l`, under the 500 cap. PowerShell 5.1 `ParseFile` reports 0 errors, and the file is ASCII with LF line endings.
- `recipes/s11-r16-plan.ts` holds the pure parts: the row-to-block table, the gate, and `scanR16`.
- `recipes/s11-r16-opt.ts` is UP-OPT's judge, built on `optExpected`/`optVerdict` from `s11-rules.ts`.
- New tests: `recipes/test/s11-r16-runner.test.ts` and `recipes/test/s11-r16-fixes.test.ts`.
- `recipes/tsconfig.s11.json` now includes the new files.
- Test count, from `npm test` as the builder ran it and the verifiers re-ran it: 150 files / 3746 tests before, 152 / 3784 after.
- `npm run typecheck`, `npm run build` and all six recipes tsconfigs exit 0 (verifier 2).
- The commit goes through a fresh Sonnet committer: `test(e2e): S5-runner — Run 16 block runner (verifier: PASS-with-notes)`.

## 3. Row-to-block map

Verifier 1 re-derived this map from §4.23 itself. Each row has its own block, which is the per-row re-run.

- **liveA:**
  1. UP-L1
  2. UP-0
  3. UP-OPT
  4. UP-FA
  5. UP-6
  6. UP-7
  7. SAVE-REFUSE-R
  8. SW-2
  9. UP-RESTORE
  10. UP-LOGS
- **liveB:**
  1. UP-0
  2. `root-add` (not a row)
  3. UP-1 to UP-5
  4. UP-6B
  5. UP-8
  6. UP-9
  7. UP-PATCH
  8. UP-TWICE
  9. UP-RAW
  10. UP-NAV
  11. UP-DEVT
  12. UP-STALE
  13. UP-7J
  14. UP-RACE-A
  15. UP-RACE-B
  16. UP-RESTORE
  17. UP-LOGS
- **Shared rows:** UP-0, UP-RESTORE and UP-LOGS run in both slices, because the sheet's Live column reads "A, B" for them. The brief said each row appears in exactly one block. The sheet is a pre-registered rule, so it outranks the brief (agent-rules §4); verifier 1 agreed.
- **liveB refusal:** liveB reads the file-access toggle right after preflight, with an own window and no reload, server, file or tab. If the toggle is OFF, liveB exits 3. Its 17 upload rows plus `root-add` are then recorded "NOT RUN — waits for G11-3".

## 4. Command lines for the live slices

Run each in the background, because a slice is longer than the tool's 600 s cap.
- S5-liveA: `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11-r16.ps1 -Block liveA`
- S5-liveB: `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11-r16.ps1 -Block liveB`
- To re-run one row between rows, use the same command with the row's block name, for example `-Block up-6`.
- Exit codes: 0 means done, 2 means a STOP (after one restore, read back by hash), and 3 means liveB was refused at G11-3.

## 5. Verifier verdict and findings by severity

**Round 1** (`S5-runner-verifier.md`, Opus): **FAIL**.
- **MAJOR-1:** when the restore failed inside UP-RESTORE, the stop path restored a second time, because a `finally` cleared the in-restore flag.
- **MINOR-1:** the static scan missed 5 of 21 planted leaks.
- **MINOR-2:** with file access off, liveB still reloaded the extension and opened tabs before it refused.
- **MINOR-3:** a node crash was counted as a failed check.
- **MINOR-4:** `taskkill /T` on node could have killed the daemon.
- NIT-1 to NIT-5 were also recorded.

**Fix round 1** (`S5-runner-fixer.md`, Sonnet medium): fixed all five findings, each with a test that fails when the old behaviour is put back.

**Round 2** (`S5-runner-verifier2.md`, Opus): **PASS-with-notes**. All five fixes held against the verifier's harness and four mutants. Three notes remain open:
- **MINOR-A:** a vetted tag exempts its whole line from the scan, so a leak added to a tagged line would go undetected. The three tagged lines as written today are safe.
- **NIT-A:** `Read-S16Early` runs outside a block, so a `STOP:` line printed during it is not counted. No real helper prints one there.
- **NIT-B:** a line that is only a string, such as `"x $Root"`, passes the scan.

Round-1 NIT-1 to NIT-5 also stay open.

## 6. Agents

| Agent | Model, effort | UTC |
|---|---|---|
| Builder | Sonnet 5.5, medium | 03:40Z → 03:52Z |
| Verifier 1 | Opus 5.5 | 03:53Z → 04:01Z |
| Fixer | Sonnet 5.5, medium | 04:02Z → 04:09Z |
| Verifier 2 | Opus 5.5 | ~04:09Z → ~04:16Z |

The builder used roughly 150k tokens of context, by its own estimate, and wrote 384 lines. The fixer brought the runner to 403 lines.

## 7. Deviations

- The three shared rows run in both slices (§3).
- `s11-r16-opt.ts` was added because `s11.ts` has no subcommand that judges UP-OPT. Verifier 1 judged it sound.

## 8. Proposed decisions

### 2026-10-26 · Run 16's shared rows run in both live slices
**Decided:** UP-0, UP-RESTORE and UP-LOGS have one block each and run in both liveA and liveB.
**Why:** the sheet's Live column ("A, B") is a pre-registered rule and outranks the brief.
**Instead of:** placing each row in exactly one slice.
**Revisit if:** the sheet is changed.
**By:** Claude (proposed)

## 9. Handoff to the live slices

**Open from the builder and the verifiers.** None of these has been tested live; S5-liveA and S5-liveB record them.
- Whether `Start-Process` with redirected output works beside the UI Automation driver.
- Whether the window handles from the s9 helpers can be used as the runner expects.
- That UP-DEVT's tab lands in window X.
- UP-STALE in liveB is stale only relative to liveB's own reload. It does not carry a Step 10 content script if liveA already loaded the Step 11 build, so record it that way.
- SW-2's occluder guard, run without read areas, may STOP on Chrome's own topmost popup.
- Whether the fixture servers survive between separate `-Block` runs.
- The 8081 server listens on 127.0.0.1 only.

**State.**
- No PIDs or watchers are running.
- `journal.md` has the session agent's uncommitted line. It is left out of this slice's commit.
