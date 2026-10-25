# S5-sheet builder report

**Model:** Claude Sonnet 5.5 (effort medium). **Context use:** about 110k tokens (the largest reads were the salvage patch and the two phase-doc ranges).

## 1. Verdict
DONE.

## 2. Outputs
- `docs/e2e-test-plan.md` §4.23 inserted before `## 5. Results template` (line 1445 to 1540): 96 lines, about 29 KB. Lines are dense because a row is one table line, as in §4.22. Not committed.
- `git diff --stat`: `docs/e2e-test-plan.md` (+96) only. `journal.md` was already modified before I started (not mine).
- The file keeps its CRLF line endings. No other file touched except this report.

## 3. What §4.23 holds
- Pass rules, STOP rule, slice order (liveA/liveB, #271), the G11-3 branch (the 17 waiting rows, the 10 that still run), the windows/state paragraph.
- A constants table (K-*) with the exact text and `file:line` of each throwing constant, no prefix: gate, no-file-access, target rule, the five content-script refusals, SDK preflight, DEBUGGER_DEVTOOLS, DISARMED, DOMAIN_BLOCKED, MCP line and answer, the four `saveTo` refusals, the options-page texts.
- 27 rows (each with Live, Steps, Expected, Pass rule): UP-L1, UP-0, UP-OPT, UP-FA, UP-6, UP-7, SAVE-REFUSE-R, SW-2 (liveA); UP-1, UP-2, UP-3, UP-4, UP-5, UP-6B, UP-8, UP-9, UP-PATCH, UP-TWICE, UP-RAW, UP-NAV, UP-DEVT, UP-STALE, UP-7J, UP-RACE-A, UP-RACE-B (liveB); UP-RESTORE, UP-LOGS (end of each slice); UP-CLICK (not run).
- SW-2 carries 0.14 (c)'s outcome table verbatim, the warm-up excluded, and SW-1R's pre-check condition. UP-1 carries 0.6's outcome table.
- The S3.md §7 twelve-item map.

## 4. Deviations
- I did not take the salvage patch as written. It referenced helper names, test files and a wave-sheet file that do not exist yet, and it ran far over the size budget. I rewrote the section smaller and took facts from it only after checking them against the sources. No hand-copied claim was kept without a source check.
- Line numbers in the salvage were off by one in places (`upload-target.ts`, K-notinput 25-26 and so on); I re-read the code and used the verified lines. `safety.ts:224-225`, `upload-files.ts:34-35`, `save.ts:112/116/118/121-122` and `debugger-errors.ts:48-52` verified.
- 0.12 and #251 name UP-9 among the waiting rows; I kept it waiting (conservative, matches the salvage list), although its decisive refusal is the gate's.
- Phase doc 0.12's line "UP-0 also reads the toggle" is satisfied by UP-0.

## 5. Proposed decisions
### 2026-10-25 · Run 16 restores and scans at the end of each live slice
**Decided:** UP-0, UP-RESTORE and UP-LOGS run in both liveA and liveB; each slice records its own found state and leaves the safety state as found. **Why:** with two slices a single end-of-wave restore could not be guaranteed. **Instead of:** one restore after liveB. **Revisit if:** the user wants one wave. **By:** Claude (proposed)
### 2026-10-25 · SAVE-REFUSE-R's control is judged by prefix plus `boom`
**Decided:** the control's pass rule is `PAGE_ERROR`, message begins `[chrome.debugger] ` and contains `boom`; the SDK side compares the four refusals by equality. **Why:** the sources fix the prefix (EVAL-5) but the full control text is only in a code comment (`debugger-errors.ts:20`). **Instead of:** equality on the control's text. **By:** Claude (proposed)
### 2026-10-25 · MCP leg of SAVE-REFUSE-R is judged by containment
**Decided:** the MCP result must contain the constant byte for byte and not contain `[chrome.debugger]`. **Why:** the MCP wraps refusals in its own formatting; its exact frame was not in my read list. **Instead of:** equality of the whole tool text. **By:** Claude (proposed)
### 2026-10-25 · Option-page texts are fixed in the section now
**Decided:** UP-OPT's expected texts (K-opt-*) are in the §4.23 constants table, from `options-model.ts`/`options.ts`. No later fill-in. **By:** Claude (proposed)

## 6. Findings
- `daemon.log` logs no calls (#251): rows judge "no call" by the SDK message and the reporter, as written.
- UP-6's `..` and `outside` rows and UP-7 all expect K-gate, which is the gate's text (before the file-access check), so they can run with the toggle off. UP-L1's second call is the same.

## 7. Handoff
- Not committed. The step agent commits after the verifier's verdict (exact file: `docs/e2e-test-plan.md`, plus this report).
- Later slices must build helpers to the placeholders `⟨helper: …⟩` here; S5-helpers should have a test that re-reads each K-constant by name.
- Open for the verifier: the 17-row waiting list should be checked against the code order (UP-9 is the one that could run).
