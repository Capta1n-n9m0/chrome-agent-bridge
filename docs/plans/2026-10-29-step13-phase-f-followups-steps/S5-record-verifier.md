# S5-record verifier: Run 20's record

Claude Opus 5.5, effort medium. Read-only: nothing edited but this report, nothing committed, nothing run live, no agent
spawned. Under test: `S5-run-record.md` (new, 339 lines) and the new "### Run 20 (S5)" entry in `docs/e2e-test-plan.md` §5
(`git diff`: one hunk at 3680, 81 added, 0 removed). Builder's report `S5-record-builder.md` read as claims.

## 1. Verdict

**PASS-with-notes.** Every one of the 34 verdicts checks against §4.28, its dated notes and the #407 addendum, and against the
cited record lines. The decisions are applied as recorded. The counts re-derive and sum to 34. The gate exits are honest, and
every cited hash exists and says what the record says. Both outputs are free of private text, and the lane is clean. Three
MINOR and five NIT findings, none of which changes a count as printed or a gate status.

**Re-derived counts (as verified, the record's convention):** PASS 20 (A 10, B 6, C 4), FAIL 8 (A 4, B 3, C 1), NOT MEASURED
1 (B), NOT RUN 3 (C), RECORD 2 (A 1, B 1), NOT DISCRIMINATING 0: 20 + 8 + 1 + 3 + 2 + 0 = 34. As printed: PASS 23, FAIL 5,
NOT MEASURED 1, NOT RUN 3, RECORD 2 = 34. The only difference is the three R20-RESTORE rows (#417, #419). The §5 entry states
the same numbers. If R20-ARGS-ORDER is read by its pre-written rule (MINOR-1), the tally is PASS 21, RECORD 1.

## 2. Outputs

- This report. Commands and their output are quoted below.
- `node scripts/doc-check.mjs` → `Checked 38 living docs (6 closed phase docs skipped for paths and status).`, **exit 0**. It
  lists three items, all from before this stage: code counts, `CLAUDE.md:114  5596 passed`, and
  `docs/plans/next-session-prompt.md:15`.

## 3. Checks

**C1. The 34 verdicts.** I re-derived slice A first-hand from `S13-live-record-liveA20-att3.txt` against §4.28 lines
1965–1979:
- R20-0 PASS: A3:5 is exactly the LOADED20 line, followed by the required lines (A3:7–21), and the ROW is at A3:22.
- POP-BG, POP-FG and POP-OTHER FAIL. A3:28, 37 and 53 print `held-call=ok` and `console-new=95/90/129`, against the
  original rule's `TAB_HELD` and `console-new=0` (§4.28:1966). #406 keeps these FAILs. POP-OTHER's `human` leg printed
  `granted-to=none` (A3:55), which the original rule makes a FAIL too, and `unjoined` is NOT MEASURED (A3:57).
- POP-NONE PASS: `blocked n=0` (A3:60–65).
- CON-DESC PASS (A3:91).
- CON-NOTEA PASS: allowed `entries=2 marker=0 url=0 stack=0`, `pre entries=2` and `maxlen=6`, blocked `entries=0`, cut path
  NOT REACHABLE (A3:95–206). Port 8081 is enforced by the preflight (#405).
- CON-CAP PASS: `lines=10 … first-index=192 last-index=200`, so k = 9, as the sheet's arithmetic says (A3:100–105).
- ARGS-3, CON-4 and CON-FLOOR PASS (A3:122–181): waits 5000/3500, `disarmed-ticks=5`, `after-ticks=3`.
- ARGS-OLD PASS: `keys=sorted … listener=no … args=VERSION`, every leg as expected, `clauses=6 failed=0`, `rerun=1` (A3:238–284).
- RESTORE FAIL on "`DIALOGS` all 0", against A3:327 `wave-windows-open=1`.
- LOGS PASS: `sentinel` above 0 only on `browser_evaluate` and `browser_console_messages`, which the sheet allows; the control
  line is in the last segment; CAPSEG ×3 (A3:331–339).

All slice-A line numbers and quoted values in the record are right. Slices B and C: I checked every cited line in the held
B record, the -3 evidence, C1 and C2. All are right: B:5, 20–32, 38, 41, 55–66, 82–113, 125–144, 178–194, 226, 264–298; BE:1–8;
C1:22, 29–35, 42–44, 76, 86–96; C2:5, 22, 29–32, 50–58, 90–108, 120–121, 153–174. The verdicts equal `V-B` §1 and `V-C2` §1, and
the R20-RESTORE FAILs follow #417 and #419. R20-POP-OTHER-3 is NOT MEASURED by #407 (3), #410 (3) and #411 (1). G2-1 FAIL is
the row's own "FAIL for `covered`" (§4.28:1985). The one verdict question is R20-ARGS-ORDER (MINOR-1).

**C2. The builder's six source conflicts.**
1. **R20-ARGS-ORDER (printed RECORD, A3:90).** The pre-written pass rule judges the SDK leg only (§4.28:1970, the bold
   clause). The MCP leg is a record that "cannot discriminate". #401 and its dated note (§4.28:1956) say the `ref` leg "is
   RECORD and does not count toward the row's verdict". Every judged clause holds: A3:72–73 and 85–87, `CHECK … clauses=3
   failed=0` (A3:89). **So the pre-written text gives PASS for the row.** The printed RECORD comes from the driver passing
   both RECORD legs into the aggregate: `recipes/s13-r20-a.ts:281`, `finish(R, [j.v as V, "RECORD", "RECORD"])`. That counts
   the `ref` leg, against #401. No decision rules the row (#408 (2) rules only CHOOSE-KEPT). The record does show it "as
   printed" and reports the conflict without resolving it, which the brief allows. But it labels RECORD "as verified" and
   "the safer reading", and leaves it off both lists of items open for the user (MINOR-1).
2. **POP-OTHER-3 `third` and W2.** The sheet allows the fallback "if it cannot" be made (§4.28:2008). `V-B` F5 shows the driver
   never tried W2. The leg's discrimination rests on C holding W's active tab, so its PASS stands. The record says exactly this
   (lines 142–144, conflict 2). Handled correctly.
3. **liveC20 fix rounds.** #419 counts five passes, and the record follows #419 (lines 33, 296, 314, 324). Handled correctly.
4. **`S5-liveB20.md` lists R20-RESTORE as PASS.** #417 and `V-B` F1 read it as FAIL, and the record follows #417 (conflict 5).
   Handled correctly.
5. **The commits of attempts 1 and 2.** `git log --diff-filter=A` gives `liveA20.txt` 3c6def3, `-att2` 10db89d, `-att3`
   ed66e36, `liveC20` 3f19f28, `-att2` 1a9032e, `dockdiag` dfbac13, `-att2` e614e0c. All equal the record's header.
   Handled correctly.
6. **ARGS-OLD's old build prints `perm=yes` (A3:238).** This changes neither ARGS-OLD's verdict nor R5.2:
   - ARGS-OLD's pass rule does not judge `perm`. The sheet names `perm=no` only in a parenthetical, "recorded as the proof"
     (§4.28:1977). The old build is proved by `keys=sorted`, `listener=no` and `args=VERSION`.
   - R5.2 concerns R20-0, -0B and -0C only, all of which are exact.
   - The cause is the same as `V-B` F6. `extension/manifest.json` sits outside `extension/dist`
     (`ls extension/dist/manifest.json` → no such file), so the swap leaves HEAD's manifest loaded.
     `git show 3ab9207:extension/manifest.json | grep -c webNavigation` → `0`. The sheet's parenthetical was simply wrong.
   - The record explains this correctly; only its wording is loose (NIT-2).

**C3. "As printed" and "as verified".** Both are stated for every row: the three R20-RESTORE rows (1a, 1b, 1c), and in the
tally (1d) and the §5 entry. The one gap is MINOR-1.

**C4. Counts.** Re-derived (section 1). The id list also re-derives: 15 + 8 + 8 = 31 from the §4.28 tables (1964–1993),
plus the 3 rows of the addendum (2006–2008) = 34.

**C5. The gate exits.**
- **G1.4 met.** B:28 matches §4.28:2006 field for field. The liveness control rises from 9 to 27 (BE:1–2). The record also
  says the `human` leg is unproven.
- **R5.1 met.** `git log -1 --format=%ci`:
  - 246c115 2026-10-29 16:37:04, ee2eaa0 17:17:49, 76f4f5e 18:48:54 and a32cb8c 20:21:39 come before liveA20's first line,
    A1:1 16:24:15Z = 20:24:15 +04.
  - 8ec2789 (2026-10-30 01:26:41) and ae05349 (06:36:08) come before liveB20's first line, 02:39:22Z = 06:39:22 +04.
  - liveC20's first lines are 06:50:56 and 08:25:52 +04, also later.
  - `git show --numstat` on each note: 2/0, 2/0, 2/0, 8/0, 6/0 added/removed. `git diff 246c115 HEAD --numstat` → `20 0`.
- **R5.2 met:** A3:5, B:5, C1:5, C2:5.
- **R5.3 met with notes**, as the record states.
- **R5.4.** Met for the state by count and hash (A3:316/326, B:264/274, C2:153/163, dock side C2:121). The DIALOGS clause
  fails in all three slices (A3:327, B:275, C1:87, C2:164). This is stated honestly.
- **R5.5 not met in B** (B:284, 287, 289). Met in A and C.
- **R5.6 met.** STOP→RETURN pairs: A1:2→3, A2:185→219, B:291 (guard B:289)→297. A count of `STOP|RETURN` gives 0 in att3,
  C1, C2 and both dockdiag files.

**C6. Hashes.** I ran `git log -1` on all 17 hashes cited (the sheet, the notes, the attempt HEADs, the record commits,
dfbac13, 63c771c, 3ab9207). All exist, and the subjects match the record's claims.

**C7. Private text.** Grep of the record and of the §5 entry's added lines:
- `C:\Users`, `/c/Users`, `Users/`, `AppData`, the user's name, the family name, the e-mail local part: 0 / 0.
- Runs of 32 or more hex characters: 0 / 0.
- The literal token from `bridge.token`, read with `grep -cF`, never printed: 0 in the record, the added lines and the
  builder report.
- The one run of 40 or more characters is the steps-dir name.
- Nothing quotes options-page content.

**C8. Lane.** `git status --short` shows ` M docs/e2e-test-plan.md`, and as untracked files the two stage outputs, the
builder report and the six liveB20 files that were already untracked. `git diff --cached --name-only` → 0 lines: nothing is
staged. The held files' modification times (06:40–06:57) are earlier than the record's (08:47), which fits their being left
untouched. The diff has one hunk, after line 3682 (the end of the Run 19 entry), with no removed line, so §4.28 and the older
§5 entries are not edited.

**C9. Writing.** Plain language, and every decision is cited as #NNN. NIT-4 covers "ND".

## 4. Deviations

None from the brief.

## 5. Proposed decisions

None. MINOR-1 is a question for the user, raised by the record, not a decision for me.

## 6. Findings

**MINOR-1. R20-ARGS-ORDER's "as verified" RECORD is not what the pre-written rule gives, and it is missing from the open
items.**
- Where: `S5-run-record.md:67`, `:92–93`, `:308–312`, `:319–333`; `docs/e2e-test-plan.md` §5 entry, the `RECORD` line and
  "Open for the user".
- Evidence: §4.28:1970's pass rule judges the SDK leg. §4.28:1956 and #401 exclude the `ref` leg. A3:89 reads
  `CHECK R20-ARGS-ORDER clauses=3 failed=0`. `recipes/s13-r20-a.ts:281` reads `finish(R, [j.v as V, "RECORD", "RECORD"])`.
- Keeping the printed RECORD in the count is correct: no decision rules it. But "as verified RECORD" and "the safer
  reading" misstate it. Neither reading is a failure, and the rule plus #401 give PASS.
- Fix:
  - Make the cell "RECORD (as printed; §4.28's rule and #401 give PASS: open for the user)".
  - Drop "safer".
  - Add the row to section 7's "Held or open for the user" and to the §5 entry's "Open for the user" line.

**MINOR-2. The §5 entry misstates why liveA20's attempt 2 stopped.**
- Where: `docs/e2e-test-plan.md`, added line "attempts 1 and 2 stopped on dropped setup in the helpers".
- Evidence: A2:220 reads `STOP: the wave ended (an exception in block r20-con-notea-b (RuntimeException: window … is not on
  this extension's options page))`. `S5-liveA20.md` §4: rounds 1–2 restored dropped setup, and attempt 2 then stopped
  because the options window was read as off its page (round 3).
- Fix: "attempt 1 stopped on setup the R20 helpers had dropped; attempt 2 on the wave's options window read as off its
  page".

**MINOR-3. The record does not state the gate consequence of the failed exit checks.**
- Where: `S5-run-record.md` §2 and §7.
- Evidence: phase doc § STOP rules: "**Stops the gate** (the write-up continues): a pre-registered check fails after the
  allowed fix rounds". R5.5 is not met in slice B, and R20-RESTORE fails in A, B and C.
- The record lists the open items but never says that Step 13's gate is stopped until the user rules (#417, #419, the
  DIALOGS clause).
- Fix: add one sentence after the gate table, and the same in the §5 entry.

**NIT-1.** The §5 entry's check table says "**R5.2** the first line proves the loaded build". The record (line 221) rightly
says it is the second line, after `MANIFEST`. Fix: "the LOADED20 line".

**NIT-2.** `S5-run-record.md:105–106` says "`perm=yes` there is the disk manifest". LOADED20 reads the *loaded* manifest from
the worker console. That manifest is HEAD's, because the swap replaces only `extension/dist` (`V-B` F6). Suggested wording: "the
loaded manifest stays HEAD's, which a swap of `extension/dist` does not replace".

**NIT-3.** `S5-run-record.md:315` cites "`V-B` F7" for the slice-B tally. That tally is in `S5-liveB20-verifier1.md` §7 Handoff
(line 213), under F1's consequences.

**NIT-4.** "ND" is used without being spelled out: `S5-run-record.md` §5 table (6 uses), and the §5 entry "(R19: FAIL or ND)".
`docs/docs-writing-guide.md` rule 6 asks for abbreviations to be spelled out on first use.

**NIT-5.** `V-C2` N1 is not carried: no slice prints the `RESTORED: …` line that §4.28:1978 lists as expected text
(`grep -n "RESTORED:"` on A3, B and C2 → 0). It is a placeholder line and does not change a verdict. One line in the record's
R20-RESTORE notes would carry it.

## 7. Handoff

Nothing running. The held slice-B files are still untracked and unstaged. A fixer, if one is sent, touches only
`S5-run-record.md` and the Run 20 §5 entry, for MINOR-1 to MINOR-3 (and the NITs, optionally). Then the committer stages
exactly those two files plus the stage reports, never the held B files (#417).
