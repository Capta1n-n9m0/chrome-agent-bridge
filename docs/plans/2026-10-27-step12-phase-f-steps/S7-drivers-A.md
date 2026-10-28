# S7-drivers-A: liveA19's row drivers (step report; step agent Opus 5.5, medium)

## 1. Verdict
**DONE-PARTIAL, by size only.** Every liveA19 row id in §4.27 line 1851 (26 ids; verifier1 parsed them itself) has a registered driver. None prints `NOT RUN — no driver built`. R19-CON-FILE keeps the lib's `waits for G11-3` gate. The verifier's final verdict is PASS-with-notes. Code is 732 lines against the 400 cap (1.8×), and tests are 461 against 600. Under agent-rules §7, code alone over the cap is DONE-PARTIAL, and accepting it as one coherent piece is the session agent's call (#360's Revisit-if is met). No rows are left unbuilt. Nothing drove Chrome, the daemon or port 9234.

## 2. Outputs
- New code: `recipes/s12-r19-a.ts` (actors, judges, the scripted stdio MCP client, the redacted actor records; 591 lines) and `recipes/s12-r19-a.ps1` (the row engine `Invoke-R19Row` with step/undo/restore in a `finally`, `Switch-R19Toolbar`, the banner paths, `Close-R19Bc`; 109).
- Edited code: `recipes/s12-r19.ps1` (+26: 23 `$global:R19Blocks[...]` registrations), `recipes/s12-r19-lib.ps1` (+1: `Close-R19Bc` after the safety restore in R19-RESTORE, liveA19 only), `recipes/s12-forms.ts` (+5: `floorCounts` takes `readAt`), and `recipes/tsconfig.s11b.json` (it now covers `s12-*`).
- Tests: `recipes/test/s12-r19-a.test.ts` (new, 449 lines), `recipes/test/s12-r19.test.ts` (S7-helpers-d's N-1: a replacer function and a parse check for each mutant), and `recipes/test/s12-r19-static.test.ts`.
- Counts are from verifier3's runs:
  - `npx vitest run recipes/test`: 1433 passed / 61 files before, 1484 / 62 after.
  - `npm test`: 5384 passed, 228 files.
  - `npm run typecheck`, `npm run build` and all seven `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0.
- Mutants: the 8 classes from round 1 (a clause judged from the wrong line ×3, a STOP not routed through `Stop-R19` ×2, a skipped restore ×3) are red, and so are 7 that undo fix round 2. Each mutated file parses, and the files were restored by sha256.
- Commit: §7.

## 3. Verifier verdict
- Round 1, `S7-drivers-A-verifier.md` (Opus, medium): **FAIL**, with six MAJORs.
  - M1: refusal-row clauses lost from the ROW.
  - M2: ARGS-2's `sent` capped at 2.
  - M3: CON-FLOOR's ON time taken late.
  - M4: `browser_list_tabs` writes the human's tabs to the actors file.
  - M5: the mutant criterion was not met.
  - M6: size.
  - It also raised MINORs m1–m7.
- Fix round 1, `S7-drivers-A-fixer.md` (Sonnet, medium): fixed M1–M5, m2–m7 and the `bc` tab, which now closes at R19-RESTORE. For M4, by my direction, the probe stays and only a redacted record is written; `scan-actors` is untouched. The M1 dispute about CON-OWN and CON-FILE was upheld by verifier2.
- Round 2, `S7-drivers-A-verifier2.md` (Opus, medium): **FAIL**.
  - N1 (CON-FLOOR's 3 s wait leaves too few judged ticks).
  - N2 (ticks after the read were counted).
  - Three MINORs and four NITs.
- Fix round 2, `S7-drivers-A-fixer2.md` (Sonnet, medium):
  - Fixed N2, the three MINORs (the after-window starts at the ON title; `browser_status` is redacted; `Close-R19Bc` runs after the restore) and NIT-1 and NIT-4.
  - Left N1 by my ruling (below).
  - Found and fixed `Test-R19Armed`, which compared against the worker's log line instead of the toolbar title.
- Round 3, `S7-drivers-A-verifier3.md` (Opus, medium): **PASS-with-notes**. It confirmed fixer2's title fix against `extension/src/badge.ts:46-55` and `recipes/s9-win.ps1:178-180`. Notes carried, unfixed:
  - **MINOR-A:** `Switch-R19Toolbar`'s disarm direction accepts any title that is not armed, including a null read (`recipes/s12-r19-a.ps1:69-73`). This gives no false PASS, but a failed read would be blamed on the product. Fix: require the `$S9TitleOff` prefix.
  - **NIT-A:** §4.27's R19-CON-4 step text (line 1796) quotes the worker's log line as the toolbar "title". It needs a dated note, not an edit.
  - **NIT-2, NIT-3** of round 2 (see `S7-drivers-A-fixer2.md`).
- Fix rounds used: 2 of 3.

## 4. Deviations
- **Size:** 732 code lines against 400 is over 1.5×, so DONE-PARTIAL. The slice is one coherent set of 23 drivers, and splitting it now gains nothing (as with #360 for S7-helpers-d).
- **The MCP actor is a scripted stdio client** of `mcp/dist/index.js` (`@modelcontextprotocol/sdk`, no model), not §4.27's "headless MCP actor (tool search off)". This affects ARGS-1, ARGS-3, CON-MCP and CON-CAP. It has the same tool surface and exact arguments. It needs a ruling before the run.
- R19-ARGS-2's "effects above 0 is a STOP" has no reason in the sheet. It maps to `throw-after-state` by R7.6's catch-all (verifier1: follows the governing layer).
- I only reasoned about S7-helpers-d's N-2 to N-5, and none binds a liveA19 path. N-3 and N-4 bind the old-build slices (-DE); N-2 and N-5 bind R19-0's re-proof paths.

## 5. Proposed decisions (for the session agent)
### 2026-10-28 · CON-FLOOR keeps the sheet's 3 s wait; the risk is a finding, not an edit
**Decided:** the driver waits 3 s disarmed and 2.5 s after the ON press, as §4.27's step text says (`recipes/s12-r19-a.ts:474`). **Why:** a sheet bound is a finding, never an edit. Verifier2 estimates, without a measurement, that the judged disarmed span is about 2.1–2.6 s of 1 Hz ticks, so `disarmed-ticks ≥ 3` fails on most runs. Verifier3 adds that the after side (about 2.0 s from the ON title to the read) can leave 1 tick where the rule needs 2. **Instead of:** the driver waiting 4.5 s on its own authority. **Revisit if:** the session agent rules a new wait before Run 19. That would be a dated §4.27 note and a one-line driver change, and it would remove a likely false FAIL that blames the product. **By:** Claude (step agent; for the session agent's ruling before S7-live)

### 2026-10-28 · The actor's records of existing-tool probes keep counts, never the human's tab text
As `S7-drivers-A-fixer2.md` §5. `browser_list_tabs` and `browser_status` are written to `actors-<slice>.jsonl` as fixed words and counts only. Each row judges them on the raw text before they are written. **Instead of:** an exemption in `scanActors`. This is the conservative direction: the scan stays strict, and no tab of the human's reaches a file. **By:** Claude (proposed; for session-agent review)

### 2026-10-28 · The ON toolbar signal carries two times
As `S7-drivers-A-fixer2.md` §5. The `-done` file holds `"<press>,<title>"`. CON-FLOOR's disarmed window ends at the press, and its after window starts at the title. **By:** Claude (proposed)

### 2026-10-28 · liveA19's MCP rows use a scripted stdio MCP client
As `S7-drivers-A-verifier.md` §6. **By:** Claude (proposed; for the session agent, ruled before the run)

## 6. Findings
- Wording problems in §4.27 (none edited):
  - CON-1's `limit=3` and `level=error` reads have no label word.
  - R19-CON-MCP's banner `none` case is undefined; the driver prints FAIL.
  - CON-4's step text calls the log line a title (NIT-A).
  - CON-FLOOR's 3 s wait against `disarmed-ticks ≥ 3` and the ±500 ms margins (N1; Open item 2's unsourced bound).
- A defect found in passing and fixed: an armed check with `-like '*armed*'` matches "disarmed". Toolbar checks compare against `$S9TitleArmed` exactly. This is code, not a runtime fact, so there is no CLAUDE.md bullet.
- No new runtime fact; nothing ran live. First-run risks the builder lists (`S7-drivers-A-builder.md` §6):
  - the banner showing for an SDK-opened active tab;
  - parsing the MCP text;
  - finding the hidden own and file tabs.

## 7. Handoff
- Nothing running: no PIDs, servers or worktrees.
- Commit: the one titled `test(e2e): S7-drivers-A — liveA19's row drivers (verifier: PASS-with-notes)`, made by the committer (Sonnet, medium). This report is in that commit, so it cannot hold the hash; the hash goes in the step agent's return and the session agent's journal.
- **What -B, -C and -DE reuse:**
  - `Invoke-R19Row` from `recipes/s12-r19-a.ps1`. It runs the steps, the banner, the undo in a `finally` and the verdict as the worst LEG, and routes every STOP through `Stop-R19` with the actor's reason, falling back to `throw-after-state`.
  - `Switch-R19Toolbar` and `Test-R19Armed`. Use the exact `$S9Title*` constants, and fix MINOR-A first.
  - The banner paths (`Invoke-R19BannerCtl`, 20 000 ms idle), whose `bannerctl` judge now accepts R19 slices.
  - The stdio MCP client and `actorRecord`'s redaction in `recipes/s12-r19-a.ts`. Any tool whose text names a tab gets the same redaction.
  - `Close-R19Bc`. The B and C drivers must call it for their own `bc` tabs, or extend R19-RESTORE's liveA19-only call.
  - The test pattern in `recipes/test/s12-r19-a.test.ts`: stubbed `Invoke-R19Row` scenarios with in-place mutants, each one parse-checked.
- Still open from S7-helpers-d: N-2 to N-5 (for -B and -DE), and DEVPROBE's caller (for -B).
- Before S7-live, the session agent rules on: N1's wait, the scripted MCP actor, the redaction decision, the size (M6), and NIT-A's dated note.
- Needs the user's keyboard: nothing.
- Briefs' READ lists: as the step brief. The verifiers also read the builder and fixer reports as claims to audit.
