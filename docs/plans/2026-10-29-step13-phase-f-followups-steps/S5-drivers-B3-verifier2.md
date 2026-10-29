# S5-drivers-B3-verifier2 — re-check of fix round 1 (F1, F2, F3, N2)

Verifier: Claude Opus 5.5, medium. Read and run only. No Chrome, no daemon, no live run, no window listed, moved or
touched. Every red proof ran on a copy in the session scratchpad, with its imports pointed at the unchanged main-tree
modules (#395). The main tree was not written.

## 1. Verdict

**PASS-with-notes.** F1, F2, F3 and N2 are closed. Two NITs remain (§6). Every exit check passes, and the fix
introduced no regression.

## 2. Outputs (re-derived)

| Check | Command | Result |
|---|---|---|
| tests | `npm test` | `Test Files 245 passed (245)`, `Tests 5872 passed (5872)`, exit 0 |
| count | `it(` count: `s13-r20-b.test.ts` 22 at `97e7533` → 44 now; `s13-win-ps.test.ts` new, 11 | 5839 + 22 + 11 = 5872 = 5864 + 8 (fixer: +6 TS, +2 PS). The diff's 2 removed lines are an import widened and the `cmds` key list extended; no test removed |
| typecheck | `npm run typecheck` | exit 0 |
| recipes | `npx tsc --noEmit -p` on all eight `recipes/tsconfig*.json` | all eight exit 0 |
| build | `npm run build` | exit 0 (`built extension → dist/`) |
| tree after the build | `git status --short` | only the slice's files: 4 M (`s13-r20-b.ts`, its test, `tsconfig.s13.json`, `tsconfig.s6.json`) and 5 ?? (`s13-win.ps1`, `s13-win-ps.test.ts`, the builder, verifier and fixer1 reports) |
| private data | grep for a home path, user name or e-mail in the four slice code files and the three reports | none |

## 3. Red proofs (on a copy; 25 mutants, 24 RED, 1 survivor)

**How it ran:** `setup.mjs` copied the four slice files to the scratchpad and repointed their imports. The PowerShell
test was pointed at the copy (`S13_WIN_REPO`). `mut.mjs` applied each mutant to a fresh copy and ran vitest there.
- The copy runs green: 55/55, the fixer's number.
- Files: `mutants.log`, `muts.json`, `setup.mjs`, `mut.mjs`, `run.sh` in `scratchpad/v3b3`. Not committed.

**Pre-fix code (the brief's "red against the pre-fix code"):**
- PRE-FIX-PS: the C# `Raise`, its wrapper and the two calls removed. **RED**, 2 tests: the raise order and the 0x0013
  pin.
- PRE-FIX-TS: `g2LegGate` and `afterCheckLine` absent. **RED**, 2 tests.
- The T4, T8, T10 and N1 tests are test-only additions over unchanged code. The fixer says so, and the code at those
  lines is the builder's. They pass on the pre-fix code by design, and their proof is the mutant of each clause.

**Mutants:**

| Group | Mutants (all RED) |
|---|---|
| F1 raise | M1 no raise of WB; M2 no raise of WA; M3 WA before WB; M4 raise before the ownership check; M5 raise before the placement read-back (it would raise on `did-not-fit`); M6 flags 0x0013 → 0x0003 (activating); M7 `HWND_TOPMOST`; M8 post-raise minimized check removed |
| F3 gate | G1 refusal for the covered leg too; G2 refusal → NOT DISCRIMINATING; G3 alone-control ignored; G4 `bCov > 1`; G5 bCov checked for covered; G6 bCov check removed |
| N2 | N2a `afterCheckLine` rethrows `HelperDefect` |
| F2 / N1 | T4 cause without `unc.v === "PASS"`; T8 no work-area clip in `winCovered`; T10 no `files === 0`; T1 `>=` → `>`; T22 negative size accepted; T23 `/^refused/`; P9 `MinH` ignored |

**Survived:** N2b. `afterCheckLine` swallowing every error, not just `HelperDefect`, stays green (N1 below).

## 4. The affected items, re-checked against the sheet (§4.28, line 1985)

### F1: closed. The raise is not assumed; the leg reads the result back.
- **The raise:** `recipes/s13-win.ps1:127-128` raises WB, then WA, with `HWND_TOP` and
  `SWP_NOSIZE|SWP_NOMOVE|SWP_NOACTIVATE` (0x0013, `:35`).
- **Ownership:** the raise runs only after the ownership refusal (`:117`) and the placement read-back (`:125`). M4 and M5
  are RED.
- **The brief's question (a raise Windows refuses or ignores):** the code does not trust the raise.
  - `Raise`'s return value is discarded (`[void]`, `:127-128`).
  - What decides the leg is a fresh read. The actor asks for `R20-G2-1-rects-uncovered` **after** `-place`
    (`s13-r20-b.ts`, `g2One`). That answer is built from `EnumWindows`' z-order at the time of the read
    (`Format-S13Rects`). Every counted, non-taskbar window above WB is listed there, and its overlap is cut to the
    work area.
  - `g2LegGate("uncovered", {bCov})` turns any `bCov !== 0` into NOT DISCRIMINATING. It also prints
    `CHECK … b-covered-by-others-px=<n> precondition=failed`.
- **Consequences:**
  - A refused or ignored raise gives NOT DISCRIMINATING, never a false PASS. So does a topmost window over WB, such as
    Chrome's options-toggle popup.
  - The leg cannot name the "capture of a covered window" cause unless both legs are usable (`g2Rows`).
- **One residual, not a finding:** the read precedes the alone-control and the timeline by a few seconds. A window that
  rises over WB in that gap is caught only by the recorded `-after` line, not by the gate. The sheet asks for the
  rectangles "before each leg", which this does.

### F2: closed.
- T4: `s13-r20-b.test.ts:182`. T8: `:171-174`. T10: `:185`.
- Each test turns its mutant RED (§3).

### F3: closed.
- `g2LegGate` (`s13-r20-b.ts:252-257`) is pure and exported.
- Its table (`test:187-196`) reaches each branch for both legs, and G1–G6 are RED.
- **Wiring in `g2One`:**
  - First call: `{placeOk}`. `placeOk` is `undefined` for covered, so covered never reads NOT MEASURED.
  - Second call: `{aloneErr: !!alone.e, bCov: winCovered(rects, "B")}`.
  - The printed lines and the verdict mapping are the builder's: NOT MEASURED for a refused placement; NOT
    DISCRIMINATING for a failed alone-control or WB not at 0 px. Both match the sheet's clauses and the accepted
    decision (2).

### N2: closed.
- `legLine` is printed before the `-after` read (`g2One`).
- `afterCheckLine` maps a `HelperDefect` to `b-covered-after-px=unread`. Tests: a valid answer, garbage and an empty
  string. N2a is RED.

### No regression
- B2's judges, Run 17/19 code and slice A are untouched by this round.
- The judges of R20-G2-1 and R20-VERSION are unchanged, apart from the extracted gate.
- `cmds` is unchanged.

## 5. Deviations

None.

## 6. Findings

### N1 NIT: a test title claims a branch no test reaches (`recipes/test/s13-r20-b.test.ts:197`)
- **Claim:** the title says "other errors still throw".
- **Gap:** no assertion covers that branch, so mutant N2b (swallow every error) survives.
- **Why it is only a NIT:** `parseRects` and `winCovered` throw only `HelperDefect`, so the branch is unreachable today.
- **Fix:** drop the clause from the title, or add a case.

### N2 NIT: B4 must answer the step sequence the gate implies
- On a refused placement, `g2One` asks for neither `-rects-uncovered` nor `-rects-uncovered-after`.
- On a leg the gate stops, it does not ask for `-after`.
- B4's PowerShell side must answer only the steps actually asked. The value-step runner's existing contract
  presumably covers this; the B4 builder should confirm it.

## 7. Handoff

- **B4 still carries the first verifier's §7:**
  - close or minimise the wave's options window before R20-G2-1;
  - find WB as the window that holds B's tab;
  - set `$global:S13Owned` and `$global:S13Hwnd`;
  - answer the value steps (`-place`, `-rects-*`, `-after`, `R20-VERSION-dlg`);
  - the old-build swap and the window guard's titles.
- **Not done in this round (N3, N4 of the first verifier):** both were left by the brief. N4's sentence for decision (4)
  is still open.
- **No commit made.** The committer stages the slice's files named in §2.
