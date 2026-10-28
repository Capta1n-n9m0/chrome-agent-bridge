# S7-drivers-B verifier, round 2 (fresh): fix round 1 re-checked

Model and effort: Opus 5.5, medium. Nothing ran live: no daemon, Chrome, fixture server or port 9234. Raw output:
`S7-drivers-B-verifier2-evidence.txt` (sections §1–§5). Scope: F1–F11 of `S7-drivers-B-verifier.md`, as fixed in
`S7-drivers-B-fixer.md`, against the step agent's rulings on F1 (carried banner rows never STOP) and F3 (SWEEP-HELD as
two actor runs, the reload, segments and R19-0 re-run at block level, no edit to `Invoke-R17Node` or shared scripts).

## 1. Verdict
**PASS-with-notes.** F1–F11 are all resolved. The exit checks are green. All 16 of the first verifier's mutant cases
are now killed, including the 10 that survived round 1. Of my 14 new mutants, 11 are killed. Three survive (one MINOR
finding, N-1). They all sit on actor call sites in `s12-r19-b.ts`, which no test drives. The code there is correct when
read. liveA19's behaviour is unchanged. There are no CRITICAL or MAJOR findings.

## 2. Outputs
- `npx vitest run recipes/test`: `Test Files 63 passed (63)`, `Tests 1553 passed (1553)`. This matches the fixer's
  claim of 1553/63 and is up from round 1's 1530; no test was removed.
- `npm test`: `Test Files 229 passed (229)`, `Tests 5453 passed (5453)`.
- `npm run typecheck`: exit 0. `npm run build`: exit 0, `built extension → dist/`.
- All 7 `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0: fe, json, s10, s11, s11b, s6, s9 (evidence §1).
- Size, from `wc -l` and `git diff --numstat` (§2):
  - **Code: 542** (321 + 156 new, plus 65 added in the edited files). Cap 750.
  - **Tests: 611 exactly** (585 new, plus 3 + 23 added). Cap 600.
  - The tests are 11 over their cap, well inside the 1.5× that agent-rules §7 allows when the extra is tests. Code is
    under its own cap. Accept it as a stated deviation.
  - The fixer's "combined 1,350" reasoning is a different reading of the cap. It does not change the outcome.
- Tree: the sha256 of every `recipes/*.ps1|ts|json`, `recipes/test/*.ts` and `S7-drivers-B-*` report is identical
  before and after my run (§5). `git status --short` gained only ` M docs/plans/…/journal.md`, which changed during my
  run and is not mine: I wrote nothing outside my two output files. Mutants ran in place, one at a time, each file
  restored and sha-checked (`restored=true` on all 30). No worktree was made.

## 4. Deviations
None from the brief. I ran the mutants in place (one of the brief's two options) only after every exit check had
finished, so no check saw a mutated file.

## 6. Findings, per item

| Item | Resolved | Evidence |
|---|---|---|
| F1 | yes | See below. |
| F2 | yes | See below. |
| F3 | yes | See below. |
| F4 | yes; call site not pinned (N-1) | See below. |
| F5 | yes; two call sites not pinned (N-1) | See below. |
| F6 | yes | All 16 of the first verifier's mutant cases are killed (§3). |
| F7 | yes | See below. |
| F8 | yes | `s12-r19-b.ts:243`: the idle leg sets `next = code(…con.evaluate("1"))`. |
| F9 | yes | `s12-r19-b.ps1:44,154`: `rc -eq 2` goes to `Stop-R19Actor` (test K5; its in-suite mutant is red). |
| F10 | yes | `s12-r19-b.ts:294`: `browser_close_tab {tab: mt}`. |
| F11 | yes | See below. |

**F1, the carried banner rows.**
- UP-6 and F-RAW* now run `-Banner carried` (`s12-r19-b.ps1:86,88`).
- `judgeBannerCarried` (`s12-r19-a.ts:63`) gives:
  - FAIL for `seen` with IDLE ≥ 20 000 and the control `pass`;
  - PASS for `none`;
  - NOT MEASURED otherwise.
- `bannerCmd` returns 1 on FAIL. It returns 2, with `STOPWHY`, only on `STOP`, which this kind never gives
  (`:557-561`).
- A leg with `CALLS <id> calls-sent=0` gets `record`, which still obeys IDLE and the control.
- This matches the STOP map, which does not name the carried rows (`e2e-test-plan.md:1856`). It also matches the phase
  doc's "a carried Run 18 row that fails with a passing control (a product finding, proposed)" (phase doc `:444-446`).
- Killed: N1a (carried judged as refused), N1b (control ignored), N1c (F-RAW back to `refused`) and N1d (the no-call leg
  not detected).

**F2, the capture window read as DevTools.**
- After `Open-R19Seg`, `$global:D` joins `$S12Before` (`s12-r19-b.ps1:64`), so `Close-S12DevTools` no longer counts
  the capture window as left open.
- `devtools-open` now comes from `Test-R19DevOpen` (`:130-135`):
  - for a DevTools window, X's own record by handle (`$S12Dev`, set by `Open-S12DevToolsMenu`, `s12-win-b.ps1:61`),
    read with `Test-S9Live`;
  - for a pane, UIA on X with every current window excluded.
- Killed: N2a (window always "open") and N2b (the capture appended before it was reopened).

**F3, nested node calls.**
- Phase 1 is `Invoke-R19Node … sweep-held --phase 1`, with only the DevTools `do` step in its driver.
- `Invoke-R19SweepReload` then runs at block level, inside `Invoke-R19DevRow`'s `-Run` (`:145`), so no node call
  nests inside an actor.
- Phase 2 runs through `Invoke-R19Row`, with a restore.
- `git status` shows no shared script changed (`s11b-r17.ps1`, `s9-win.ps1` and `s11*` are untouched).
- Killed: N3a (the reload put back inside the phase-1 driver; test S4 catches it) and N3b (phase 2 run without
  `Invoke-R19Row`).

**F4, KEEP-OVERLAP leg a.**
- `overlapRun` starts the second call before it awaits the first (`s12-r19-b.ts:52`).
- `judgeOverlap` also needs the first value `1`.
- Killed: N4a and N4b.
- **Survived: N4c**, which makes `overlapA`'s call site sequential again (N-1).

**F5, KEEP-4's line and the unattached case.**
- The KEEPDT devtools line prints `code(dv)`, or `not-run` when the poll never reached K-devt (`:133`).
- `judgeKeep4(…, attached)` returns NOT MEASURED for both legs.
- An unattached SWEEP-HELD phase 1 prints `ROW … NOT MEASURED — DevTools was not attached` and reloads nothing (test
  S4).
- Killed: N5b.
- **Survived: N5a** (`p.attached` not passed to the judge at `:138`) and **N5c** (`SWEEPPRE attached=yes` printed
  regardless of the poll, `:150`) (N-1).

**F7, BANNER-CTL ignored.**
- `keep1Decision(…, ctl)` and `judgeKeep2(…, ctl)` return NOT MEASURED when the control did not pass.
- A wrong KEEP-1 answer is still the STOP.
- The pure test is green, and S0 is killed.

**F11, line forms.**
- `IDLE R19-UP-6 since-attach-ms=<n>` is printed once per leg (`idle(idleRow)` with `idleRow = R`).
- The driver pairs the n-th line with the n-th leg (`Get-R19IdleOf -Nth`; test R1: `,,21001` to `,,21005` in leg
  order).
- `CALLS <id> calls-sent=<n>` carries the sheet's `calls-sent` token.

### N-1 · MINOR · Three call sites of the F4/F5 fixes are not pinned by any test
- **Where:**
  - `recipes/s12-r19-b.ts:301`: `overlapA` calls `overlapRun`.
  - `:138`: `judgeKeep4(dv, …, p.attached)`.
  - `:150`: `SWEEPPRE attached=${p.attached …}`.
- **What survives:**
  - N4c: the second call awaited after the first, the round-1 F4 defect itself.
  - N5a: `p.attached` dropped, so an unattached KEEP-4 is a product FAIL again.
  - N5c: `attached=yes` constant, so SWEEP-HELD reloads and judges FAIL when DevTools never attached.
- **Evidence:** `node new-mutants.mjs` → all three `vitest exit=0 (SURVIVED) | Tests 63 passed (63)` (97 for N5c)
  (evidence §4).
- **Why only MINOR:**
  - The code as written is correct at all three sites (read above).
  - The fixed logic underneath is pinned: N4a, N4b and N5b are killed.
  - The actors are SDK glue that no test drives, which agent-rules §6 allows.
  - The fixer already pins the KEEPDT line at `:133` with a source check (`expect(TS).toContain(…)`).
- **Suggested fix:** add the same kind of source checks:
  - `overlapRun(() => att(` in `overlapA`;
  - `?.length }, p.attached)`;
  - `` SWEEPPRE attached=${p.attached ? "yes" : "no"} ``.

### N-2 · NIT · Two line shapes outside §4.27's forms
- **The lines:**
  - `SWEEPPRE attached=<yes|no>` (`s12-r19-b.ts:150`) is a new line that no sheet form names.
  - `KEEPDT … leg=devtools next=not-run` (`:133`) is a value the sheet's KEEPDT form does not list. It is the sheet's
    own word in DEVNOFLAG, though, and `devnoflagLine` maps it consistently.
- **Impact:** neither is a ROW or CHECK line or a scanned form, and both carry counts and fixed words only (no leak).
- **Gap:** the fixer recorded `CALLS`'s form as an ambiguity but did not record these two.
- **Suggested fix:** record both under the stage's Deviations. Or print SWEEPPRE as
  `CHECK R19-SWEEP-HELD pre attached=<yes|no>`, with the driver's regex changed to match.

### Note · SWEEP-HELD's `devtools-open` for a DevTools window is "the window is alive"
`Test-S9Live` on X's DevTools handle is not a UIA read of the DevTools contents. The sheet says "DevTools still open
(UIA)". The fixer recorded this as a deviation. It still discriminates against a sweep that closes the DevTools window.
It cannot see a frontend that stays open but detached. That is a gap for the step agent to accept or rule on; it is not
a defect in the fix.

### Checked and holding (round 1's list, re-checked after the fix)
- **liveA19 is unchanged.** For every liveA19 row:
  - the `s` step id equals the row id (`s12-r19-a.ps1:28` with the `New-R19Steps` callers in `s12-r19.ps1`; BANNER-CTL
    and CON-BANNER do not use `Invoke-R19Row`'s banner loop);
  - no liveA19 actor prints `CALLS` (`grep CALLS recipes/s12-r19-a.ts recipes/s12-r19.ts`: none).
  So the kind stays `$Banner`, the label stays `$Banner`, and the IDLE read is the same regex as before. With no own-id
  line, `Get-R19IdleOf $Id 0` on an id with no match is 0, as before.
  - `-BudgetS 300` equals `Invoke-R17Node`'s default (`s11b-r17.ps1:114`).
  - `Set-S11Front` for kind `t`, the `default` step branch and `R19PassNote` touch no liveA19 row.
  - `s12-r19-a.test.ts` is green, with its in-suite mutants red.
  - M9 and M15, the liveA19 hooks, are now killed (in `s12-r19-b.test.ts`).
- **Every block is registered.** The static test is green.
- **DevTools only in a wave window** (`Open-S12DevToolsMenu`); M8 is killed.
- **DEVPROBE's `attached` comes from its answer code.** M1 is killed.
- **The NOT MEASURED path touches nothing.** The new phase-1 NOT MEASURED path closes DevTools and X in the `finally`.
- **UP-OPT** is unchanged by the fix.
- **N-2, N-3 and N-5** are unchanged by the fix; their tests and mutants are green and red respectively.
- **MINOR-A** is unchanged.
- **Redaction:** the MCP actor's new `browser_close_tab` result is not printed.
- **The security boundary:** the slice touches no product code, token, bind, gate or log site; only `recipes/` changed.

## 7. Handoff
- Nothing is running. My scratch files are in the scratchpad `b7v2/`: `checks.sh`, `new-mutants.mjs` and their
  outputs. No process of mine is left.
- `docs/plans/…/journal.md` was modified by someone else during my run; I did not touch it.
- For the step agent:
  - N-1 is optional hardening: three source checks.
  - N-2 is a wording record.
  - Neither blocks the commit.
