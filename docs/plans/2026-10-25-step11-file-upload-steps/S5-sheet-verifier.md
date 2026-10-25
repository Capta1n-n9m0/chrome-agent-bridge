# S5-sheet verifier report

**Model:** Claude Opus 5.5. **Role:** verifier (agent-rules §6), read-only. **Audited:** the uncommitted
`docs/e2e-test-plan.md` §4.23 (lines 1445–1540) at HEAD `7c4857d`; the builder's claims in `S5-sheet-builder.md`.

## 1. Verdict

**FAIL**: two MAJOR findings. In both, a row as written cannot measure what it names: UP-L1 fails by construction, and
UP-6's `..` step cannot fail for its named cause. Everything else holds or is MINOR/NIT. Both fixes are small text
edits to the pre-written rows, made before any observation, so they do not re-tune a result.

## 2. Exit criteria checked

| Criterion | Result | Evidence |
|---|---|---|
| Placement after §4.22, before §5 | holds | `grep -n "^## \|^### 4.2[23]"`: §4.22 at 1304, §4.23 at 1445, `## 5.` at 1541 |
| Only `docs/e2e-test-plan.md` changed by this slice | holds | `git diff --stat HEAD`: e2e-test-plan.md +96, journal.md +1 (the session agent's earlier edit, not a finding); 0 removed lines (`grep -c '^-[^-]'` = 0) |
| 0.12's rows as corrected by #251 | holds, except F1/F2 | UP-0…UP-9, UP-LOGS, UP-CLICK (not run), restore. UP-6 judges "no call" by the SDK constant and the reporter; UP-8 is on port 8084; UP-LOGS counts tool results only |
| S3.md §7's twelve items | holds | the map at 1522–1537; each item has at least one row |
| SAVE-REFUSE-R: equality to the constants, no prefix (#246, #254) | holds | K-undef/K-node/K-map/K-cycle equal `save.ts:112,118,116,121-122`; `data {"name":"TypeError"}` matches `save.ts:129`; all four are marked (`markOwnRefusal`, `save.ts:129-130`); same four cases as Run 15's SAVE-REFUSE (§4.22 row at 1409) |
| SW-2: warm-up recorded and excluded; 0.14 (c)'s table verbatim | holds | the phase doc 335–339 and §4.23:1500, from "d ≥ 950 ms in 3/3" to "no change.", normalised for line breaks: `IDENTICAL`. The d definition matches. The warm-up is excluded from 3/3, and a NOT MEASURED trial gives "anything else" |
| Every row has expected text and a pass rule | holds | 28 rows; UP-CLICK is marked "never counts as a pass" |
| G11-3 branch (#245), the waiting list against code order | holds, with F3 | see F3 |
| Restore read back by hash (S5.4) | holds | UP-RESTORE checks all four values against UP-0 of the same slice; a mismatch is a STOP |
| liveA/liveB of #271 marked per row | holds | a "Live" column on every row. Order nit: F5 |
| Size ~150–250 lines or justified | justified | 96 lines but ~29 KB, one table line per row as in §4.22 (NIT N2) |
| Commands only as placeholders | holds | every step is `⟨helper: …⟩` |

**Constants, text and file:line re-read at `7c4857d`:** `safety.ts:194-195, 209-210, 224-225`;
`upload-files.ts:34-35`; `handlers/upload.ts:31`; `content/upload-target.ts:25-26, 27, 28, 29-30, 31`;
`sdk/src/upload.ts:68, 74` (`refuse` adds `upload: `, line 41); `debugger-errors.ts:48-52` (the DEBUGGER_DEVTOOLS
message carries no prefix, from `describeRaw`); `sdk/src/error.ts:136-137`; `mcp/src/tools/registry.ts:634-635`
(`describeLocator` gives `css #up-single`, registry.ts:261); `options-model.ts:103, 105, 109, 162-165`;
`options.ts:70, 77`. All texts match character for character. The one exception is the line number in N1.

## 3. Findings

### F1 — MAJOR — UP-L1's first call cannot answer K-notarget: the gate answers first
`docs/e2e-test-plan.md:1493`. UP-L1 runs first in liveA (1453), before UP-OPT adds `<ROOT>`. Its first raw call
`uploadFiles {tab, paths:[<ROOT>\s11-1k.bin]}` with no target is gated at receipt
(`extension/src/router.ts:52-54`: `call.receipt()` before `handler(...)`). For class `upload` the gate runs the folder
rule on every path (`safety.ts:339-341` → `uploadRefusal`, `safety.ts:253-254`). With `<ROOT>` not yet allowed, the
answer is `UPLOAD_REFUSED` (K-gate). The handler's `UPLOAD_TARGET_REQUIRED_MESSAGE` check (`handlers/upload.ts:36-37`,
in `checkUploadParams`, called at `:96`) is never reached. The row's rationale "Only the S3 handler answers
`BAD_PARAMS` here" is wrong for the same reason, and "Any FAIL is a STOP" makes this a STOP of liveA's first row by
construction.
**Fix:** expect K-gate for both calls. `UPLOAD_REFUSED` is still a proof of the Step 11 build, because Step 10's
extension answers `UNKNOWN_METHOD` (`router.ts:44-46`). Or move the no-target call after UP-OPT (for example into
UP-6) and keep K-notarget there.

### F2 — MAJOR — UP-6's `..` step cannot test the gate's `..` refusal, and may fail as K-missing
`docs/e2e-test-plan.md:1497`. The step is an SDK upload of `<ROOT>\..\outside\s11-out.bin`. The SDK preflight sends
`fs.realpath` of the path (`sdk/src/upload.ts:71`, `return { path: real, … }` at :89), so the `..` never reaches the
gate. The step is then the same as the "outside" step and passes even if the gate's DOTSEG rule
(`upload-paths.ts:96`) were broken: it is not discriminating for the cause it names (#251: "a `..` path is refused by
the gate"). Also, the sheet never says where `<OUTSIDE>` lies. If `<ROOT>\..\outside\s11-out.bin` does not exist, the
preflight answers K-missing (`upload: paths[0] does not exist`), and the row fails by construction.
**Fix:** send the `..` path in a **raw** `uploadFiles` call (as UP-L1 and UP-RAW do), with a css target and the path
unnormalised. Expect K-gate, no `data`. And define `<OUTSIDE>` as `<ROOT>`'s sibling folder `outside`, made by the
wave.

### F3 — MINOR — UP-9 is in the waiting list, but its decisive answer comes before the file-access check
`docs/e2e-test-plan.md:1455, 1508`. Code order: the gate's folder rule at receipt (`router.ts:52`), then the handler's
params check, then the file-access read (`handlers/upload.ts:96-99`), then the content-script target rule
(`markInPage`, `:107`), then CDP. UP-9 sends the junction's real path (outside `<ROOT>`), so the gate refuses it with
K-gate whatever the toggle, as the row's own expected text says. The sheet's stated criterion for "still run"
("decisive answer comes before the handler's file-access check") therefore puts UP-9 among the rows that still run.
Keeping it waiting follows 0.12's correction text ("UP-1…UP-5, UP-8, UP-9 wait"), which is the phase doc and outranks
the sheet. That is conservative and not wrong, but the sheet contradicts its own rule.
**Fix:** either move UP-9 to liveA (propose a dated note on 0.12), or say in 1455 that UP-9 waits only because 0.12
lists it.
The other 16 waiting rows are right by code order: UP-6B's refusals are content-script refusals after the file-access
check; UP-RAW's in-ROOT path passes the gate and would get K-noacc; UP-DEVT and UP-STALE attach after the check. The
rows that still run (UP-6, UP-7 (a)–(c), UP-L1's second call, SAVE-REFUSE-R, SW-2) answer at the gate, in the SDK
preflight, or need no upload. The count of 17 is right.

### F4 — MINOR — "the helper test that re-reads the constant by name is the authority" can let expected text follow the code
`docs/e2e-test-plan.md:1489`. As worded, "authority" is meant for line numbers. Read loosely, it would let a helper
that reads the constant at run time replace a changed text, which is a pass rule following the code (§2).
**Fix:** say that the text in the K-table is the pass rule; the name re-read only relocates the line. If the helper
reads a constant whose text differs from the table, that is a STOP before liveA.

### F5 — MINOR — UP-OPT's "found + 1 folders" names no moment
`docs/e2e-test-plan.md:1495`. The page re-analyses on every keystroke (`options.ts:176` `input` →
`renderFolders`). While the typed home-folder line `C:\Users\fixture-home` is present, it is a valid line, so the
summary counts found + 2 folders and 2 invalid lines. Found + 1 holds only after the save and after the revert.
**Fix:** pre-write the summary for both moments: after the save, `<found+1> upload folders.`; while typed,
`<found+2> upload folders. 2 invalid lines are not used (marked below).`, with K-opt-sum's singular/plural.

### N1 — NIT — K-opt-stand's line
The sheet cites `options-model.ts:99-100`; the constant is at `:100-101` (99 is its comment). The text is exact.

### N2 — NIT — size and order
- The 96 dense lines are justified by the row-per-line form.
- UP-L1 precedes UP-0, while the phase doc's "How the live wave runs" step (2) records the found state before the
  reload. UP-L1 changes nothing, so this is harmless. Consider saying that the found state is also read in the
  preflight (the ledger), or put UP-0 first and keep "the first *recorded* line proves the build" (S5.2) by recording
  UP-L1's line first.

## 4. The builder's proposed decisions

1. **Restore and scan at the end of each slice:** endorse. agent-rules §6 requires every live wave to leave the state
   as found, and each slice is a wave.
2. **SAVE-REFUSE-R's control judged by the prefix plus `boom`:** acceptable. It is pre-registered and selective (the
   refusals by equality, the control by prefix). Equality with EVAL-5's text is not available as a pre-written string
   (EVAL-5 at §4:329 is itself a containment rule).
3. **MCP leg judged by containment plus absence of `[chrome.debugger]`:** acceptable. The MCP's frame (failure report
   or tool error) varies with the attach set (`mcp/CLAUDE.md`), and the rule is fixed before the run.
4. **Options texts fixed now:** endorse. The texts match the source (see §2).

## 5. Integrity floor (§2)

There are no observation-dependent thresholds. Every bound is pre-stated: 5 000 ms for O2, 4 s for the banner,
120 s for UP-2's wait, 15 s CDP recorded and never re-tuned, SW-2's 950/300 ms. RECORD rows cannot pass by
re-tuning, and NOT MEASURED never counts. The one wording that could let a rule drift after the fact is F4. F1 and F2
must be fixed **before** any liveA observation and committed with the slice. They are not candidates for a mid-wave
fix.

## 6. Handoff

No processes and no edits besides this file. A fixer touches only §4.23 lines 1455, 1489, 1493, 1495 and 1497 (and
1508 if UP-9 moves). Then a fresh verifier re-checks F1–F5.
