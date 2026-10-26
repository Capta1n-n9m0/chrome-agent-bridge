# S5-record verifier report: the Run 16 section in §5

Model: Opus 5.5 (verifier, default effort). UTC start 2026-10-26T05:27:46Z, end 05:34Z (`date -u`). Read-only. Nothing
live ran, and I started no Chrome, daemon or server. I edited only this report and committed nothing. Scratch files are
in the session scratchpad, outside the repo: the extracted section, the scan script, and the profile name read from
`dbe6022`, which is never printed.

## 1. Verdict

**PASS-with-notes.** Every row verdict and every `REC:` range in the new section matches `S5-run-record.md`, and
#281, #282 and #284 are applied as ruled. The section puts S5.5 (liveA) and part of S5.6 down as failed, as the record
shows, and does not smooth them over. The tally re-derives exactly. The section is placed correctly, adds 132 lines and
removes none, and its own leak scans are all 0. The findings are 5 MINOR and 4 NIT. **For the gate:** over the whole
run, S5.5 FAILED (liveA) and S5.6 FAILED in part (liveA's run-1 console). Under #282 and the phase doc's STOP rules,
both stop the gate for the user. This verdict is about how faithfully the section records the run. It does not cure
those two checks.

## 2. Outputs and checks run

- `git diff HEAD --numstat -- docs/e2e-test-plan.md` gives `132 0`. The section runs from line 2759, after Run 15's
  section (which starts at 2647 and ends at 2757), to just before `## 6. Exit criteria` at line 2891. The only other
  tracked change is `journal.md`, which belongs to the session agent.
- **Row audit.** I read the record (lines 1–410) and checked every row line and `REC:` range in the section against it:
  all agree. I recounted the `^ROW` lines myself. liveA has UP-L1 P, UP-OPT F, UP-FA R, UP-6 F, UP-7 P, SAVE-REFUSE-R
  P (×2 legs), SW-2 P, UP-RESTORE P (run 2) and UP-LOGS P×3. liveB has 13 PASS line-rows, 1 FAIL, 3 RECORD and 3 NOT
  MEASURED (`awk 'NR>=237' … | sort | uniq -c`). UP-0 has CHECK lines only (REC:28, 253). Its §4.23 pass rule is
  armed with JavaScript on, the toggle reading on or off, and nothing pressed. REC:26–27 and 251–252 meet it, so
  counting it PASS is faithful, and the section says it has no ROW line.
- **Tally.** I get 30 row lines: liveA 10 (P6/F2/R1, plus 1 split) and liveB 20 (P13/F1/R3/NM3). That is PASS 19 /
  FAIL 3 / NOT MEASURED 3 / RECORD 4 / split 1, the same as the section. The 17 G11-3 rows (I re-read the list in the
  §4.23 G11-3 paragraph) come to 10/1/3/3, the same as LB §3 and VB:38. The builder's stated differences hold: LA has
  no totals; #284's PASS list leaves out UP-0 (B); the "11 PASS" appears in the ledger (`S5-liveB.ledger.md:8`). See
  NIT-2.
- **Decisions.** #281 is applied: UP-6 and UP-OPT keep their FAIL, run 1's restore is put down to the title-check
  defect, and SW-2 had no trial in run 1. #282 is applied: S5.5 failed for liveA; the UP-LOGS console is NOT MEASURED
  for UP-L1, UP-6, UP-7 and SAVE-REFUSE-R; SW-2 reads "the event ends the wait", so no S5b; liveA is not re-run. #284 is
  applied: UP-1 received the file on a background tab; the UP-6/UP-6B banner FAILs stand with no product defect filed;
  UP-RAW is a contract question for the user. #283 appears in the S5.6 row and in the open items. The gap against
  #281 (d) is MINOR-3.

## 3. Exit checks, re-derived over the whole run

| Check | Verdict | Evidence (my commands) |
|---|---|---|
| S5.1 | **held** | `git log --format='%h %cI' 36cfc43^..HEAD -- docs/e2e-test-plan.md` lists only 4 commits since §4.23: `36cfc43` 20:12:15Z, `d0744b2` 20:32:26Z, `5d11c2c` 20:56:15Z and `1767de6` 21:24:02Z (all 2026-10-25, +04:00 converted to UTC). `git log -L1445,1552` gives the same set. Their hunks are `-1507 +1507`, `+1541,7` and `-1544,2 +1544,2`, all inside §4.23 (1445–1547 at `1767de6`). No commit after `1767de6` touches the file. The first observation is REC:1, 2026-10-26T04:19:14.611Z. The earliest framing line, FA:1 at 04:18:20Z, is also after every note, and the last note precedes REC:1 by 6 h 55 m. |
| S5.2 | **held** (notes VA N1, VB N1) | The build proof is REC:11. The reloads are FA:45 and FB:194 (`reload-extension.ps1 exit 0 (attempt 1)`), and no other reload mechanism appears. DA:2, DA:36 and DB:2 all show build `834c77bac996…`, which matches `sha256sum daemon/dist/index.js`. `git diff 0abd25e..HEAD --stat -- shared daemon sdk mcp extension` is empty. liveB's extension proof lies in its row answers and in DB, not in a first REC line. |
| S5.3 | **held** | Both live verifiers were fresh Opus. VA compared 22 constants with 0 differences. VB found 17 error constants equal, and its 4 "differ" are the K-opt rows. The page judges are `uploadPageJudge` and `refusalPageJudge` (`recipes/s11.ts:53,76,505`). The record holds verdicts, not texts (VA N3). |
| S5.4 | **held** | liveA's found state (REC:8) equals run 2's read-back (REC:226–229). liveB's found state (REC:249) equals REC:400–403. liveB's found state also equals liveA's end state. Run 1's stop path shows the stored state and daemon equal (REC:166, 170), and its `RESTORE FAILED` comes from the title check (#281). Only the empty-text hash is printed. |
| S5.5 | **FAILED (liveA)**, held (liveB) | The STOP counts per file are: REC 5 (lines 143, 148, 171, 172, 179), FA 4 (lines 2, 4, 6, 8), FB 4 (the same as FA), and 0 in FA2, DA, DB, the console and the occluders file. FA:2 and FA:6 have no return. The ledger entry at 04:50Z is a back-fill. The REC lines match the 04:20:42Z return. The non-STOP guard lines (REC:142, 184) do not add any unreturned line. |
| S5.6 | **FAILED in part (liveA)**, held (liveB) | Every SCAN count is 0 (REC:231–236, 405–410). Run 1 has no console capture (#282, VA F2). Also, the title line committed in `dbe6022` is a gate item (#283). See NIT-4. |
| S5.7 | **held** | REC:188 shows the warm-up recorded and excluded. REC:185–190 shows 1 warm-up plus 3 measured trials with d = [-24, 95, 68], all ≤ 300 ms in 3/3, which phase doc 0.14 (c) reads as "the event ends the wait", so there is no S5b. Run 1 ran no trial (REC:143). #277's NOT-MEASURED edge cases are not met. |

## 4. Leak scan, by count only

`scan.mjs` (in the scratchpad) reads the token from `bridge.token` and the profile display name from
`git show dbe6022:…/S5-liveB-console.txt` line 1. It prints neither. It covers 21 files: `S5-run-record.md`, the 18
`S5-liveA*`/`S5-liveB*` files, the extracted section and `S5-record-builder.md`. Results:

- **Token, profile display name and sentinel** (the `s11-` + 12-hex shape): 0 in all 21 files.
- **Non-fixture `scheme://host`, using #277/#278's fixture set:** 0, apart from two hosts too short to be an extension
  id (lengths 3 and 6). They turn out to be `<id>` at VA:57 and `cpnem…` at VB:80, both placeholders. The other prose
  hits are placeholders with an empty host.
- **Profile path** (the five profile-path forms):
  0 in Run 16's evidence and in the section, and 6 in `S5-record-builder.md` (MINOR-5).
- **Window-title lines:** 0 in the evidence and the section. There is 1 each in S5-liveB.md and S5-liveB-verifier.md,
  but both are the placeholder `<profile display name>`, as the profile-name count of 0 confirms. The console's
  remaining "DevTools" lines (2, 7, 19, 20, 596) are UI labels, not titles.
- **Repo-public rule:** the section holds no path, URL, PID, title or token.

## 5. Findings

- **MINOR-1** `docs/e2e-test-plan.md:2886`: the section says UP-RACE-A, UP-RACE-B and UP-DEVT were "re-registered as
  new rows", but no such rows exist. `grep -rn "re-regist"` finds only this line and LB:131. LB:131 names only
  UP-RACE-A and UP-DEVT, and says they "go to S5-record as re-registered rows". *Fix:* write "to be re-registered as
  new pre-registered rows (proposed, LB §9: UP-RACE-A, UP-DEVT)", or have the step agent propose them.
- **MINOR-2** `:2837`: UP-RACE-A's "no per-call time (VB F2)" leaves out VB F2's safety-relevant point. VB F2 says "an
  ok returned during the disarm would look exactly like this record; this row does not exclude one", with UP-7 (a)
  covering the gate. *Fix:* state that the row does not exclude an `ok` during the disarm.
- **MINOR-3** `:2883` and the builder's §5 "None": #281 (d) says UP-6's and UP-OPT's "cause goes to S5-record as a
  proposed decision". #284 settles UP-6. UP-OPT has only "the committed reports establish no cause". *Fix:* the step
  report carries a proposed decision for UP-OPT. The FAIL stands, and a new pre-registered row timing O2's update is
  one option.
- **MINOR-4** The section omits UP-CLICK. §4.23 lists it (RECORD, "Not run (#251) … Listed for completeness; never
  counts as a pass"). *Fix:* add a row line `UP-CLICK — [NOT RUN] (#251), not counted`.
- **MINOR-5** `S5-record-builder.md` §3 spells out the profile-path forms (6 matches, plus 5 of the username). If the
  stage commits it, a profile path lands in committed evidence. There is precedent for this:
  `git grep -l -i -E <the profile-path pattern> | wc -l` gives 114, and VA:55 already carries `<username>` as a column header.
  But Run 16's evidence was otherwise kept to `<PROFILE>`. *Fix:* replace the forms with "the four profile-path forms"
  before committing.
- **NIT-1** `:2850–2851`: "each read back hash=equal (REC:91, 99, 108, 116, 361, 390)". UP-OPT's set (REC:32, 38, 43)
  has no hash line. liveB UP-0's read-back is REC:260, which the section does not cite. REC:91 and REC:116 are set
  read-backs, not restores.
- **NIT-2** `:2869`: "the runner's and the ledger's '11 PASS'". `S5-liveB-runner.md` states no total. Only the ledger
  line, which records the runner's hand-back, has it.
- **NIT-3** `:2773`: "No row that had made an observation was re-run" is absolute. UP-RESTORE observed on run 1's stop
  path (REC:167, 170) and ran again in run 2. The differences list handles this, but the preamble sentence could
  name it.
- **NIT-4** `:2888`: run 1 had no console capture from 04:19:08Z to 04:20:42Z, which also covers UP-0 and UP-OPT. The
  section follows #282's list of four rows, which is faithful. Wording it as "all of run 1" would be more precise.

## 6. Deviations, proposed decisions, handoff

There were no deviations and I propose no decisions. MINOR-1 to MINOR-5 are for the step agent to fix before the
commit. S5.5 and S5.6 (liveA) and the history of `dbe6022` (#283) remain items for the user at the gate.

Redacted 2026-10-26 by the S5-record fixer (round 2): profile-path forms and the username replaced by placeholders (verifier2 NEW-1); nothing else changed.
