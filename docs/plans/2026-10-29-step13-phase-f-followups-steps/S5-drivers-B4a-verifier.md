# S5-drivers-B4a verifier report

Model and effort: Opus, medium. Read and run only. No tracked file edited; nothing committed. No daemon, Chrome, fixture
server or live run started.

## 1. Verdict

**PASS-with-notes.** No CRITICAL or MAJOR. Three MINOR, three NIT. Every gate exits 0. Items 1–17 are met (item 7 has
a MINOR in the printed leg word only). No pass rule is changed. liveA20 is unchanged in behaviour and in printed lines.

## 2. Outputs

- Evidence: `S5-drivers-B4a-verifier-gates.txt` (gates), `S5-drivers-B4a-verifier-probe.txt` (judge probes).
- `npm test`: Test Files 247 passed, Tests 5899 passed, exit 0. Start 5872 / 245, so +27 tests and +2 files. That
  matches the new files: 20 `it` in `s13-r20-b4.test.ts` and 7 in `s13-r20-b4-ps.test.ts`.
- `npm run typecheck` exit 0. All eight `recipes/tsconfig*.json` (fe, json, s10, s11, s11b, s13, s6, s9) exit 0.
  `npm run build` exit 0. `node scripts/doc-check.mjs` exit 0.
- Size (`wc -l`): new files 160 + 46 + 145 + 90 = 441, edits +30. About 471 against the 600 cap. Code alone is about
  236 lines.
- Private-path and user-name scan (`grep -il` for the user's name, `C:/Users`, `AppData`) over the four new files and
  the builder's report and evidence: no match.

## 3. Verifier verdict

This file.

## 4. Deviations

- **Red proof and mutants not re-run by me.** Creating a scratch copy outside the tree with a `node_modules` junction
  was denied by the permission classifier. Per agent-rules §3 item 10 I did not retry it or work around it.
  - Instead I proved red by construction. `s13-r20-b4.test.ts` imports `../s13-r20-b4.js`, which HEAD lacks. The PS
    test dot-sources `s13-r20-b4.ps1` and calls `New-R20PopSteps … -Pop3`, a parameter HEAD's `s13-r20.ps1` lacks.
  - I also audited the builder's red and mutant evidence (`-red.txt`, `-mutants.txt`, 13 of 14 killed). The survivor
    `after-null-pass` is equivalent, as claimed: with `after === null`, `control` is already false.
  - I ran read-only probes of `judgePop3` from the main tree's module, via a script kept in the session scratchpad.
    Their output is in `-probe.txt`.

## 5. Proposed decisions

None of my own. My ruling on the builder's §6:
- **1. FAIL above too few counted rounds: strict, accept.** It never turns a non-PASS into PASS. It matches #407's
  human-leg text ("FAIL if any round has a popup opened and granted-to=none … else NOT MEASURED") and item 12. It is
  untested (MINOR-2).
- **2. popup-opened read by the actor from `listTabs`: accept.** The daemon passes the Chrome `id` and `openerTabId`
  through. `extension/src/handlers/tabs.ts:27-35` builds them, and `daemon/src/intercept.ts:672-684` adds `tab` and
  keeps the rest. This is the sheet's own definition.
- **3(a)–(e): accept.**
  - (b) follows the sheet ("Leg `human` (no bridge caller at all) … B and C idle"). It is not a loosening. It also
    leaves A's popup calls (lengths 21, 23, 25) as the only `[bridge] evaluate` lines in that leg, which the control
    can see.
  - (e) is stricter: an unreadable root Name gives `unread`.
  - (c) and (d) change printing only.

## 6. Findings

### (a) Can each -3 row PASS on a correct build?

- **Holder text: yes.**
  - `checkLease` builds `` `tab ${handle} is held by ${JSON.stringify(owner)} since …` `` (`daemon/src/intercept.ts:612`).
  - `owner` is the registry name, which is the hello name verbatim (`daemon/src/wsHost.ts:251`,
    `daemon/src/registry.ts:42`, `sdk/src/knock.ts:163`). No SDK code rewrites a TAB_HELD message (grep: no hit).
  - A's client is `run()`'s client, `` name: `s12-r19-a-${name}` `` (`recipes/s12-r19-a.ts:161`). It holds O (`x.open`),
    so the opener grant goes to A.
  - `a.ts:125` tests `` includes(`held by ${JSON.stringify(holderName)}`) `` with `holderOf(ACTOR.x)`. The probe shows
    the substring present for `s12-r19-a-popbg3`, `-popfg3` and `-popother3`.
  - The -2 defect (comparing messages) is gone: `controlSame` is still computed for liveA20 but `judgePop3` never reads
    it, and the test at `b4.test.ts:41` pins that.
- **Liveness control: yes, with a residual risk.**
  - The worker logs `console.log("[bridge] evaluate", expression.length, "chars")` (`extension/src/handlers/evaluate.ts:39`)
    for every call that reaches the extension.
  - B's refused calls stop at the daemon's lease check, so they print nothing.
  - A's popup call lengths are 3,5,7 | 9,11,13 | 15–25 (probe). Each follows a `window.open` line, so no two
    consecutive lines are identical and none can be grouped.
  - Residual risk (spec-level, verifier3 MINOR-E, #410 Revisit-if): a virtualized console could keep the count flat.
    That gives NOT MEASURED, never a false PASS. liveA20's capture grew 90–129 lines per leg (`S5-liveA20.md` §6 item 1),
    which is evidence that the rendered list grows. Left to the dry run.

### (b) Is anything less strict than the addendum or #410?

No.
- Order: STOP over all rounds, then FAIL (clauses or a hit), then too few counted rounds, then control or unreadable,
  then PASS (`b4.ts:74-78`).
- `unread` replaces a 0 only (`b4.ts:64`).
- popup-opened is read at `sent` + 1 000 ms or later, against the pre-click Chrome ids, with the actors' own handles
  excluded (`b4.ts:46-51, 94-95`). The opener is a label only.
- The probe runs only when a popup opened, after the popup-opened read and the grant wait (`a.ts:118-121`).
- STOP comes from any round, counted or not, in every leg (probes P2, P3).
- 3 of 3 holds. The holder is printed as a label only. The only printed text is fixed words and counts. `ANSWER`
  prints codes, and `main` prints only `e.name`.

### (d) liveA20

Line-by-line diff of `s13-r20-a.ts` and `s13-r20.ps1` against HEAD:
- The TS changes are exports, an optional `r3`, and `V3`.
- In `popRound` without `v3`: `po` is undefined, so the guard is `handle && true`. `call`'s default parameter
  `expression = "1"` receives `undefined` from `o.v3?.nextExpr()`, so the result is the same `"1"`. `r3` is not spread.
  The `ANSWER` line and the return fields are unchanged.
- `judgePop`, `popLeg`, `popBgFg` and `popOther` are untouched.
- `New-R20PopSteps` without `-Pop3` yields the same `{ Get-R20ConsoleCount }` block (PS test `stepsPlain`).
- All `s13-r20-a`, `-a2` and `-ps` tests pass.

### (e) The B4b interface

It works with the Run 17/19 runner:
- `Invoke-R19Row` appends `--slice` and `--ctl`, and `run()` parses the pairs, so `--click yes|no` reaches
  `x.opts.click`.
- `Invoke-R17Node` runs `recipes\s13-r20-b4.ts`.
- `Invoke-R19StepB` (`s13-r20.ps1:183`) reads the ready content only for `-click\d$` ids. None of the `-cn0`/`-cn1`
  ids match. It passes `''` to `f`, and the `[scriptblock]::Create` blocks ignore it. They resolve
  `Invoke-R20Pop3Cap` in the entry script's session state.
- `Get-R19Verdict` drops the `unjoined` ROW line (`s13-r20.ps1:23`).
- Exit codes are slice A's.

### Findings

1. **MINOR-1: leg `human` prints NOT DISCRIMINATING where item 7 and the sheet say NOT MEASURED.**
   - Where: `recipes/s13-r20-b4.ts:77`.
   - Evidence: probes P4 (a guard-skip round plus two good rounds) and P5 (a pre-click round plus two good rounds) both
     give `v=NOT DISCRIMINATING` for leg `human`.
   - Item 7 says "NOT MEASURED (`human`)". The addendum says "PASS only when all three rounds opened a popup … else
     NOT MEASURED".
   - The row verdict is unaffected, because `finish` maps ND to NM (`b4.ts:146`). Only the `LEG` line's word differs.
   - Fix: `fin(o.human ? "NOT MEASURED" : "NOT DISCRIMINATING")`, plus a test.
2. **MINOR-2: proposed decision 1 and item 5's every-round STOP are correct but unpinned.**
   - Every STOP and FAIL test in `s13-r20-b4.test.ts:31-46, 80-84, 105-111` uses three counted rounds.
   - So two mutants would survive the suite (by reading the tests): one that restores `judgePop`'s order (counted < 3
     before FAIL), and one that restricts `wrong` to counted rounds.
   - Probes P1, P2, P3 and P7 show the code is right today.
   - Fix: add tests for two counted rounds with a failing clause (FAIL), a grant to C in a guard-`fg` round of leg `bg`
     (STOP), and a pre-click grant to B (STOP).
3. **MINOR-3: the evidence file's first-hit rule spans attempts.**
   - Where: `recipes/s13-r20-b4.ps1:5, 39`.
   - `r20-pop3-evidence.txt` lives in `S11_OUT`, and `Clear-S11Signals` removes only `*.ready` and `*.pressed`
     (`recipes/s11-win.ps1`).
   - So a second liveB20 attempt appends to attempt 1's lines, and its own first-hit is suppressed by attempt 1's line.
     That defeats item 17 for that attempt. The builder states this persistence as intended.
   - Fix (B4b): remove or rotate the file at slice start, before R20-0B, or tag each line with the attempt.
4. **NIT-1: `$R20Pop3Evidence` is script-scoped, not global as report §3 says** (`b4.ps1:5`). B4b must dot-source the
   file at the entry script's top level. Otherwise `& $R20Pop3Evidence` throws in a value step, which is a STOP, not a
   false pass. Fix: `$global:` or a note.
5. **NIT-2: the holder substring is tied to `checkLease` by inspection only.** `a.ts:125` is glue, and no test builds
   the daemon's text. The probe confirms all three names. A test could build the expected text from
   `intercept.ts:612`'s shape.
6. **NIT-3 (spec-level, for the record): the whole-capture rule carries any earlier URL- or join-bearing worker line
   into every later leg and row.** That is item 17's purpose. Product code never logs a URL (log-scan), so on a correct
   build only a Chrome-generated line could trip it. No builder change is asked.

No exit check failed. No new runtime fact for a package `CLAUDE.md`.

## 7. Handoff

- Nothing is running.
- My scratch probe scripts (`drv.ts` and `drv.mts`) are in the session scratchpad, outside the repo. No junction was
  created and nothing was deleted.
- `dist/` was rebuilt by `npm run build` (gitignored).
- For B4b: MINOR-3's fix (clear the evidence file per attempt) and NIT-1 (dot-source at top level) belong in the entry
  script. MINOR-1 and MINOR-2 are a small B4a fix round, or they can be carried as notes at the step agent's choice.
