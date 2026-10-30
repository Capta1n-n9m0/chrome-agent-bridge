# S5-drivers-C2 verifier, round 2: liveC20's actor

Model and effort: Opus 5.5, medium. Read and run only. Nothing was run against Chrome, a daemon or a port.
Evidence: `S5-drivers-C2-verifier2-evidence.txt` (the mutant method, the 14 mutants and their results).
Scope: what fixer round 1 changed for verifier1's F1 to F5, under the step agent's rulings.

## 1. Verdict
**FAIL**: one MAJOR (G1), one MINOR (G2), one NIT (G3). F1, F2, F4 and F5 are fixed and the tests discriminate. F3 is
fixed for the before-open read, but the fix drops the earlier attach for every refusing leg. So under R20-DEVT-UNDOCK's
refusal (#369 condition 1), the conditional rows reproduce condition 2 instead (G1). The gates pass.

## 2. Outputs (re-derived)
- `npm test`: **Test Files 250 passed (250); Tests 5974 passed (5974)**, exit 0. That is 5969 + 5, all 5 in
  `recipes/test/s13-r20-c.test.ts` (23 tests, `m00_base`). The fixer's count holds.
- `npm run typecheck` exit 0. All eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` exit 0. `npm run build`
  exit 0. `node scripts/doc-check.mjs`: "Checked 38 living docs (6 closed phase docs skipped …)", exit 0.
- `git status --short`: only the two tsconfig edits, `recipes/s13-r20-c.ts` (219 lines), its test (172 lines), the
  C2 reports and verifier1's evidence. This report and its evidence file are new.
- Privacy: no `C:\Users`, user name or `AppData` in the two code files (grep exit 1).
- Mutants: 14 run on copies outside the repo, with no `node_modules` and no links (`find -type l` = 0). 13 were killed
  and 1 survived, `f4d` (see G2). Verifier1's survivors **m12 (duplicate marker) and m14 (unanchored `parseCtl`) are now
  killed**: "expected 5 to be 6" and "expected 'yes' to be 'unread'". F1: `f1a` (bound check removed) and `f1b` (`>=` made
  `>`) are killed. F2: `f2a` (condGate ignores open), `f2b` (keep4Gate ignores open) and `f2c` (devtLegResult passes
  `true`) are killed. F3: `f3a` (condGate uses an assumed before) and `f3b` (docked KEEP-4 judged) are killed. F4: `f4a`
  (finding always printed), `f4b` (finding on any PASS) and `f4c` (finding on an empty list) are killed.

## 4. Deviations
None by this verifier.

## 5. Proposed decisions
### 2026-10-30 · The conditional rows reproduce the refusing leg's condition, not only its dock state
**Decided:** under a refusal in R20-DEVT-UNDOCK's `undock` leg, the conditional rows UP-DEVT and SWEEP-HELD (phase 1)
run that leg's earlier attach and idle wait before `ctl0`. That is `evaluate "1 + 1"` answering 2, then idle ≥
`IDLE_MIN_MS_19`, as in `devtLeg`'s `earlier` branch, with the same NOT MEASURED words. Under an R20-DEVT-EARLY leg they
attach nothing before the open (the code as it stands). KEEP-4 stays as ruled, since its own first step keeps a session.
**Why:** §4.28 says "the conditional rows then run under this leg", and the leg is the condition (an earlier attach for
UNDOCK, none for EARLY), not just undocked or docked. **Instead of:** condition 2 for every leg, which turns a refusal
seen only under condition 1 into a false FAIL. **Revisit if:** the session agent reads "the refusing leg's DevTools
state" as the dock state alone. **By:** Claude (proposed by verifier; for the step agent)

## 6. Findings

**G1 MAJOR: under a refusing `undock` leg, the conditional rows run condition 2, not condition 1.** `recipes/s13-r20-c.ts:91`
(`need` accepts only `undocked`/`docked`), `:113-118` (UP-DEVT), `:153-155` (SWEEP-HELD phase 1).
§4.28 line 1990 (R20-DEVT-UNDOCK) says: "the conditional rows below then run under this leg". Its leg is undocked
DevTools *after an earlier attach and ≥ 20 000 ms idle*. Line 1992 says: "Under the **refusing leg's** DevTools state,
opened by the same method". The actor takes only `--leg undocked|docked`. The fixer dropped `resetPage` and attaches
nothing before the open, so a refusing `undock` leg is re-run as R20-DEVT-EARLY's `undocked` leg (condition 2). The
fixer's own words: "nothing attaches before the open and no idle wait is needed".
Suppose only condition 1 refuses (the case #369 could not reach in Run 19). Then UP-DEVT's controls pass, control 1
answers `ok`, and `upDevtLegs` gives `control1 FAIL` (`:97`). SWEEP-HELD's after-reload call answers `ok` and gives FAIL.
Both are **wrong verdicts recorded as product failures**, though not flattering ones. Verifier1's F3 fix named this case:
"Choose by the refusing condition: no attach for EARLY, attach then idle for UNDOCK". The builder's version
(`resetPage`, an attach with no idle) did not reproduce condition 1 either, so the gap was not created by the fixer. But
the fix left it open.
**Fix:** add a condition option, e.g. `--cond earlier|none`, with C3 passing `earlier` for a refusing `undock` leg. In
UP-DEVT and SWEEP-HELD phase 1, with `earlier`, run `devtLeg`'s earlier block before `ctl0`. Factor it out to share the
two NOT MEASURED texts. Print the condition in the `CHECK <row> <state> open=…` line. Add a test, e.g. a pure helper that
maps the refusing leg label (`undock`, `undocked`, `docked`) to `{state, earlier}`.

**G2 MINOR: `gate-cond`'s `--legs` plumbing is untested.** `s13-r20-c.ts:196-198`. Mutant `f4d` passes a fixed `"PASS"`
in place of `o.legs`, and all 23 tests still pass. `gateCond` itself is covered (f4a–f4c are killed), but the
argv-to-function path C3 depends on is not. If `--legs` were mis-parsed, a wrong finding could print, or the counts would
read `0/0`. The default `""` fails safe: it gives counts, never the finding.
**Fix:** one test calling `cmds["gate-cond"](["--findings","none","--legs","PASS,RECORD"])` and capturing `say`, or
export the argv parser and test it.

**G3 NIT: `afterGate`'s comment is stale.** `:33` says "the conditional rows read it before each call". It is now used
only for SWEEP-HELD phase 2. Suggested: "SWEEP-HELD phase 2: the after-reload read, phase 1's ctl0 being the
before-open".

### The checks the brief named
- **UP-DEVT's page reset dropped: safe.** In Run 19, `upDevt` (`s12-r19-b.ts:111-114`) `findTab`s a block-level tab
  (`s12x=devt`) that already exists, so `reset` (`window.__s11.reset()`, `s11-upload.js:196`) cleared events and files
  from earlier use. It also proved the reporter loaded before the call. C2 opens a fresh tab per run (`x.open`:
  `newTab` + 1200 ms, `s12-r19-a.ts:171`), and the reporter starts empty (`S = { inputs: {}, events: [], pending: 0 }`,
  `s11-upload.js:29`). `readPage` still waits for `pending === 0`. R18-UP-DEVT's steps (§4.26 line 1764) contain no
  reset, so none of its steps is lost. A reporter that had not loaded by the upload would give FAIL, never PASS. If G1
  adds an earlier `evaluate`, it does not touch the reporter.
- **SWEEP-HELD phase 2's after-only control matches the sheet.** DevTools stays open across the reload, so phase 2 has
  no before-open moment. The sheet's before-open read is phase 1's `ctl0` (`:155`, judged by `condGate`). Phase 2's
  `ctl2` is read before its first call. The reload ends the old worker's sessions, and `findTab`/`claim` make no CDP
  call, so `attached=yes` there is not the bridge's own session. This holds only if C3 carries phase 1's verdict into
  the one ROW (verifier1's F6, still C3's).
- **No ruling loosens a pass rule or changes expected text.** Each new branch is stricter or not-measured:
  open-fail → RECORD; open-ms ≥ `KEEPER_IDLE_MS` → NOT MEASURED; docked KEEP-4 → always RECORD (it cannot PASS); before
  `attached=yes` → NOT MEASURED; the finding line only when every leg was PASS. `KEEP4_LATE` is a new NOT MEASURED reason
  and replaces no expected text. The NOT RUN texts, K-devt and the CTRL20/DEVT20 forms are unchanged, and the tests still
  assert them verbatim. KEEP-4's t0 is taken before the first `consoleMessages` (`:136`), and open-ms runs until the
  `open` answer, after any dock change. The measure is therefore an upper bound and errs toward NOT MEASURED.
- **No regressions elsewhere:** `devtLeg` and the DEVT rows are as before, apart from `opened` passing through.
  `keep4Legs`, `sweepVerdict`, `gateDock` and the exit codes are unchanged.

## 7. Handoff
A fixer takes G1 (Sonnet, unless the step agent rules G1 as a contract reading and decides it), plus G2 and G3. Then a
fresh verifier re-checks G1 and G2. C3's interface will gain the condition option. Nothing is left running. My copies sit
in the session scratchpad, outside the repo.
