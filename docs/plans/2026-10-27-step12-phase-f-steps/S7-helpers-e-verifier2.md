# S7-helpers-e verifier 2 report (after fix round 1)

Model: Claude Opus 5.5, medium effort. Read and run only. In the main tree I wrote only this report and its evidence file. Nothing ran
live: no Chrome, no daemon, no port 9234. Scope: the items fix round 1 touched (MINOR-1, NIT-1, NIT-2) and the stage's whole numbers.
MINOR-2 and NIT-3 are left to the session agent and are not judged here. Raw output: `S7-helpers-e-verifier2-evidence.txt`, beside this file.

## 1. Verdict
**PASS-with-notes.** All three fixes hold. Every named mutant is killed: M1a2, M1b2, M1c2, M1d, M1f, U4, U5, U5b, U12, U13 and U14.
Six of my own extra forms are killed too. Four new override forms survive (MINOR-1b). They are the same kind of gap as round 1's MINOR-1,
one step further from the call site. There is no CRITICAL or MAJOR finding, and every exit check holds.

## 2. Outputs (re-derived from the current main tree, 2026-10-29)
- `npm test`: `Test Files 231 passed (231)`, `Tests 5520 passed (5520)`. This matches the fixer's claim: 5519 → 5520, +1.
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p` on recipes/tsconfig.json, `.fe`, `.s6`, `.s9`, `.s10`, `.s11` and `.s11b`: all seven exit 0.
- Size (`git diff --numstat HEAD -- recipes`, `wc -l`):
  - Code: `s12-win.ps1` +12/−2, and +1/−1 in each of `s12-r19-b.ps1`, `s12-r19.ps1` and `s12-r19-lib.ps1`. That is 15 new code lines (cap 150).
  - Tests: `s12-helpers-e.test.ts` has 123 lines (new file), `s12-r19-c.test.ts` +15/−1 and `s12-r19-static.test.ts` +2/−1. That is 140 test lines (cap 300).
  - Both are within their caps.
- The pin regexes are not vacuous:
  - `recipes/test/s12-r19-c.test.ts` has 0 control characters. The fixer's backspace slip is gone. Its one non-ASCII character is an em dash at `:380`, which is also in HEAD.
  - I compiled the WANT-assignment regex and tested it on sample strings. It matches `WANT.choose3.clicks = 0`, `WANT["choose3"].clicks = 0`, `WANT.x += 1` and `WANT.x ??= 1`.
  - It does not match `export const WANT = {`, `WANT.a === b` or the current `s12-r19-c.ts`.
  - The CLEAN run passes 134 of 134 on the unmutated stage tree, so the pins do not false-fail the current code.
- Scratch worktree: `git worktree add --detach` at HEAD in the session scratchpad, with the stage diff applied and the untracked test copied in. It had its own `npm ci` (exit 0).
  - After the runs, the tree's `git diff HEAD -- recipes` was byte-identical to the stage diff, so every mutant was restored.
  - Removal: the 5 `node_modules/@bridge/*` junctions each pointed inside the worktree. I deleted each one with a non-recursive `[IO.Directory]::Delete` and checked that 0 reparse points were left.
  - Then I ran `git worktree remove --force` and `git worktree prune`. `git worktree list` shows only the main tree. I did not touch `wtv`.
  - The main tree's `git status --short` was the same before and after.

### Mutant table
Each mutant ran against `s12-helpers-e`, `s12-r19-c`, `s12-r19-static`, `s12-helpers-b` and `s12-r18-static` (134 tests).
"Call-site pin" means `s12-r19-c.test.ts:209` ("every judgeChoose and wantOf call site…"). "Want pin" means `:215` (the round-1 fix).

| # | Mutant (in `s12-r19-c.ts` unless noted) | Result |
|---|---|---|
| CLEAN | the stage tree, unmutated | 134 passed |
| M1a2 | REFUSE `wantOf("BAD_PARAMS", q === "dis" ? CH_MSG.dir : message)` | killed (call-site pin) |
| M1b2 | `judgeChoose(o.obs, { ...WANT.choose3, clicks: 0 })` | killed (call-site pin) |
| M1c2 | `{ ...WANT.choose2, clicks: 1, answer: c[3].code }` | killed (call-site pin) |
| M1d | `want: { ...wantOf("TIMEOUT", CH_MSG.timeout), message: CH_MSG.missing }` | killed (want pin) |
| M1f | `Object.assign(WANT.choose3, { clicks: 0 });` before the call | killed (want pin) |
| N1 | the overridden want built in a local `w13`, then `{ want: w13, dlg` | killed (want pin) |
| N1b | the same, passed as shorthand `{ want, dlg` | killed (want pin: one site fewer) |
| N2 | `const w3 = { ...WANT.choose3, clicks: 0 }; judgeChoose(o.obs, w3)` | killed (call-site pin) |
| N3 | aliased mutation: `const t3 = WANT.choose3; t3.clicks = 0;` | **survived** (MINOR-1b) |
| N4 | override inside the `calls` table: `{ ...wantOf("BAD_PARAMS", CH_MSG.missing), message: CH_MSG.timeout }` (reaches `observe` as `c[3]`) | **survived** (MINOR-1b) |
| N5 | `(judgeChoose)(o.obs, { ...WANT.choose3, clicks: 0 })` | killed (call-site pin: one site fewer) |
| N6 | `delete WANT.choose3.clicks;` | **survived** (MINOR-1b) |
| N7 | `c[3].message = CH_MSG.timeout;` before `observe` in choose2 | **survived** (MINOR-1b) |
| N8 | `WANT["choose3"].clicks = 0;` | killed (want pin) |
| U4 | `s12-win.ps1`: `$o2T0` taken after the foreground | killed (helpers-e "time counts from the save") |
| U5 | `s12-win.ps1`: `$o2T0` not passed to `Wait-S12O2` | killed (same test) |
| U5b | `s12-win.ps1`: `Wait-S12O2` ignores `-FromMs` | killed (same test) |
| U12 | `s12-win.ps1`: `OPT O2 front` line dropped | killed (helpers-e "front line records the result") |
| U13 | `s12-win.ps1`: `Format-S19OptFront $o2Fg $o2Fg` | killed (same test) |
| U13b | `s12-win.ps1`: `$o2Fg2 $o2Fg2` | killed (same test) |
| U13c | `s12-win.ps1`: arguments swapped, `$o2Fg2 $o2Fg` | killed (same test) |
| U14 | `s12-win.ps1`: the after-save result inverted | killed (same test) |

## 3. Verifier verdict
Not applicable (this is the verifier).

## 4. Deviations
- I ran the mutants on the five relevant test files only, as the brief allows, and not on the full suite.
- My PowerShell junction listing first threw on `GetFullPath`. I re-listed the junctions with `Target` read directly, and each target lay
  inside the worktree. Only then did I delete them. No path outside the scratchpad was touched.

## 5. Proposed decisions
None.

## 6. Findings
**MINOR-1b. The want pins still miss overrides made away from the `{ want: ` site and the `judgeChoose(` call.**
- Where: `recipes/test/s12-r19-c.test.ts:215-221`. The weak points in `recipes/s12-r19-c.ts` are the `calls` table (`:196-200`), its use as `c[3]` (`:205`), and `WANT` (`:118-126`).
- Evidence: N3, N4, N6 and N7 each give `Tests 134 passed (134)`.
  - N4 is M1d's spread-and-override placed one level out, in the table whose entry reaches `observe` as `c[3]`. The want pin looks only at `{ want: ` sites, and the `wantOf(` argument pin still sees the same arguments.
  - N3 and N6 change `WANT` in place, through an alias or with `delete`. The regex catches only `WANT…=` written directly.
  - N7 changes the `c[3]` object before it is passed to `observe`.
  - None of these would be written by accident in normal editing. The pin catches the forms the brief named and the forms most likely to be written.
- Suggested fix (test-only, or a two-line source change):
  1. Forbid `...wantOf(` anywhere in the file (`expect(TS).not.toMatch(/\.\.\.wantOf\(/)`). This kills N4.
  2. Make `WANT` and `wantOf`'s result deep-frozen, and test that they are frozen with `Object.isFrozen` on every entry. This kills N3, N6 and N7: a strict-mode ES module throws on the write. A source edit is needed for this, so it is the fixer's call.
  - A pure-test alternative: forbid `delete ` and any `\bc\[3\]\.\w+\s*=` in the file. This does not catch N3.

**Checked and in order:**
- **NIT-1:** the stub `Set-S9Foreground` at `recipes/test/s12-helpers-e.test.ts:33` returns `$true` and then `$false` in the `'split'` mode.
  `:70` expects `after-save=yes before-conflict-read=no`. U13, U13b and U13c (every wrong pairing) are killed, and U12 and U14 are still killed.
- **NIT-2:** at `recipes/s12-win.ps1:156-157` the parameter is now `[long]$FromMs = 0`. `$t0` is a separate local. No other
  case-insensitive pair is left: `grep -in '\$t0\|FromMs'` shows only `$t0` locals in other functions (`:204`, `:221`).
  - The old call at `:180` passes 2 arguments positionally, so its default (now) is kept. The Run 19 pair passes `$o2T0` as the third positional argument.
  - U4, U5 and U5b are killed by the same test as in round 1, so the behaviour is the same.
- **MINOR-1 regex sources:** they say what the fixer claims (§2). The `wants` list `[", dlg: ", "c[3], su", ", dlg: ", ", dlg: ", ", dlg: "]`
  matches the five `{ want: ` sites at `s12-r19-c.ts:187`, `:205`, `:213`, `:302` and `:357`.

## 7. Handoff
Nothing is running. The scratch worktree is removed and pruned, and its folder deleted. The mutant script and its output are in the evidence
file. For the session agent: MINOR-1b is optional. A second fix round would be test-only, unless it adopts the freeze.
