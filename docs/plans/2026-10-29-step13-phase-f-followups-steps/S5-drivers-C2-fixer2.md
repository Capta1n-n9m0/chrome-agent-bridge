# S5-drivers-C2 fixer, round 2

Model and effort: Sonnet 5.5, medium. Nothing was run against Chrome, a daemon or a port.

## 1. Verdict
DONE. G1, G2, G3 fixed, none disputed.

## 2. Outputs
Files: `recipes/s13-r20-c.ts` (219 -> 236 lines), `recipes/test/s13-r20-c.test.ts` (172 -> 205). About 50 new lines.
- `npm test`: 250 files, **5977 passed** (5974 before; +3 tests). `npm run typecheck` 0; all eight `recipes/tsconfig*.json` 0 (s13 needed one type fix in the new test, then 0); `npm run build` 0; `node scripts/doc-check.mjs` 0.
- `git status --short`: the two tsconfig edits, the actor, its test, the C2 reports.
- Red proof, by construction (no copy run: a copy has no `node_modules`, #395/#220): the G1 tests import `earlierVerdict`, `condOf`, `EARLIER_NM_*`, which do not exist in the old actor, so they fail there; the G2 test pins `gate-cond --legs PASS,RECORD` to the counts line, which mutant f4d (fixed `"PASS"`) would turn into the finding.

## 3. Handoff: the complete C3 interface (supersedes builder 3 and fixer1)
Run through `Invoke-R19Row` with `-Actor 's13-r20-c'` and `-StepList @(@{k='serve'; h=<handlers>; s=600})`. Window X is put in front before each DEVT/conditional row (tabs open active). The port is 8081. `finally` on the PS side: `Close-S13DevTools`. Set the dock side in an earlier DevTools session so KEEP-4's open needs no dock change (else open-ms may pass the 5 s bound and both legs are NOT MEASURED).

Commands, in signal order:
1. `gate-dock --dock <bottom|right|left|undock|unread>`: unread prints the five rows NOT RUN, exit 3.
2. `devt-undock` (no args). Actor: `evaluate "1 + 1"`, idle to 20 000 ms (NOT MEASURED on a wrong value or short idle), then steps `R20-DEVT-UNDOCK-undock-{ctl0, open, ctl1, close}`. Labels: `undock`.
3. `devt-early` (no args). Steps `R20-DEVT-EARLY-undocked-{ctl0, open, ctl1, close}`, then `R20-DEVT-EARLY-docked-{ctl0, open, ctl1, close}`; no call before the open.
4. `gate-cond --findings <refusing legs, or none> --legs <the DEVT legs' verdicts, comma list of PASS|RECORD|NM|FAIL>`. Refusing legs come from `CHECK <row> finding=devtools-refuses leg=<label>` lines. No refusing leg: three rows NOT RUN, then the finding (all legs PASS) or counts, exit 3; else `CHECK gate-cond run=yes refusing-legs=<n>`, exit 0.
5. `up-devt --leg undocked|docked --cond earlier|none`: steps `R20-UP-DEVT-<leg>-{ctl0, open, ctl1, ctl2, close}`. With `earlier` the actor first runs the earlier attach and idle (printed as leg `control` NOT MEASURED, and ends, on a failure). No page reset.
6. `keep-4 --leg undocked|docked` (no `--cond`): steps `R20-KEEP-4-<leg>-{open, ctl1, close}`; no ctl0. Docked is always RECORD.
7. `sweep-held --leg undocked|docked --cond earlier|none --phase 1`: steps `R20-SWEEP-HELD-<leg>-{ctl0, open, ctl1}`; with `earlier` the attach and idle run first (leg `control-pre`). Then C3 reloads the extension, reopens the capture, prints `LOADED20`, and runs `sweep-held --leg <leg> --phase 2` (`--cond` is not read in phase 2): steps `-{ctl2, check, close}`. C3 carries phase 1's verdict into the one ROW.

Answers: `ctl*` = `<windows|na> <ok|none|na> <yes|no|unread> <targets>`; `open` = `ok|fail` (fail is a RECORD verdict); `close` = remaining count or `unread` (not a count: STOP `devtools-left-open`); `check` = `yes|no`. Markers, exit codes (0 pass/RECORD, 1 FAIL, 2 STOP, 3 NOT MEASURED), LEG labels as in builder 3. A missing or other `--cond` ends `STOP: HelperDefect`. The `CHECK <row> <leg> cond=<earlier|none> open=...` line prints the condition used.

Mapping a refusing leg to `--leg` and `--cond`:
- UNDOCK leg `undock` -> `--leg undocked --cond earlier`
- EARLY leg `undocked` -> `--leg undocked --cond none`
- EARLY leg `docked` -> `--leg docked --cond none`

## 4. Deviations
None. The earlier block is `earlierAttach`, shared by `devtLeg` and both conditional rows; its texts are the old ones (now exported constants).

## 5. Proposed decisions
### 2026-10-30 · The conditional rows run under the refusing leg's condition, chosen by `--cond`
**Decided:** `--cond earlier` re-creates condition 1 (earlier `evaluate "1 + 1"` answering 2, idle >= 20 000 ms, same NOT MEASURED words) before ctl0; `none` re-creates condition 2. **Why:** the leg is the condition, not just the dock state (verifier2 G1). **Instead of:** condition 2 for every leg. **Revisit if:** never needed. **By:** Claude (proposed)
### 2026-10-30 · When more than one leg refused, the conditional rows run once, under the first in sheet order
**Decided:** order UNDOCK `undock`, then EARLY `undocked`, then EARLY `docked`; the others are named in the record as not re-run. **Why:** the sheet says one run, "the refusing leg"; sheet order is not chosen by any result seen. **Instead of:** the most convenient leg. **Revisit if:** the user wants one run per refusing leg. **By:** Claude (proposed)

## 6. Findings
G2 test and `gateCmd` export: `gateCmd` is now exported (not needed by the test, which uses `cmds`). G3 done: `afterGate`'s comment names SWEEP-HELD phase 2 only.
