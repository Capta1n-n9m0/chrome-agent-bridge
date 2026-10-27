# S4-live substep 0 — verifier report, round c (re-check after fixer0b; #306)

Model/effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6). I re-checked only R1a, R1b, R2 and R3 of
`S4-live-verifier0b.md`, on the uncommitted working tree. I only read and ran things. I edited no repo file, ran nothing
live, and never read or moved `bridge.token`. Scratch work is in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v0c\`
(`make.mjs` builds the code copies, `mkps.mjs` builds the PowerShell harness, `cli\` holds the CLI captures). None of it is
committed.

## 1. Verdict
**PASS-with-notes.** R1a, R1b, R2 and R3 are fixed, and both new tests fail on the pre-fix code. I found one NIT (n1)
and one note that needs no action (n2).

## 2. Outputs (numbers from commands I ran)

### R1b: `rd-logs` in `recipes/s11b-r17.ps1:842-844`
**Helper semantics (PowerShell 5.1.26100), from reading `Invoke-R17Node` (lines 114-142):**
- Every STOP throws *before* the `$n` return on line 141:
  - exit 2, or a new `STOP:` line counted by `Show-S16` → line 137;
  - exit 1 with `-StopOnFail` → `Stop9` + `throw 'stop'`, line 139;
  - budget, driver or crash → lines 134-138.
- A throw inside `( … )` on the right side of `$cn = …` is not swallowed. The assignment never happens and the throw
  leaves the block.
- On exit 0 or 3 the function's only pipeline output is `$n`:
  - `Show-S16`, `Say9` and `Stop9` use `Write-Host`;
  - `$null = $p.Handle`;
  - `.Remove()` on the `@{}` hashtables returns void;
  - `Save-S16` pipes into `Export-Clixml`, which writes nothing to the pipeline.
- So `$cn` is the scalar int 0 or 3, and `$cn -eq 0` is a scalar comparison, not an array filter.

**Empirical check.** A scratch harness holds the real `Show-S16`/`Say9`/`Stop9` (lines 57-64), `Load-S16`/`Save-S16`/
`Set-S16Pid`/`Stop-S16Pid` (lines 71-97) and `Invoke-R17Node` (lines 114-142), copied verbatim. The one change: node runs a
stub that exits with a planned code per call. I ran the rd-logs lines 839-847 (current) against lines 839-845 of
`git show HEAD:recipes/s11b-r17.ps1`, both under `powershell.exe` 5.1:

| console scan exit | HEAD | current |
|---|---|---|
| 0 | console, daemon, actors, tree check; returned | console, **redact (`--file --out --alias --sock-console`)**, daemon, actors, tree check; returned |
| 3 | NM=1; daemon, actors, tree check run; returned | NM=1; **`CONSOLE evidence copy not written (scan not passed)`**; daemon, actors, tree check run; returned |
| 1 | `STOP: … row-level STOP`; threw `stop`; Stops=1; daemon not run | identical |
| 2 | threw `node s11b scan ended in a STOP`; daemon not run | identical |
| 3, then daemon exit 2 | NM=1, then threw on daemon | identical, plus the skip line |
| 0, then redact exit 2 | (no redact) returned | **threw `node s11b redact-console ended in a STOP`**; daemon not run |

**Every behavioural difference from HEAD, line by line:**
- **842:** `[void](…)` becomes `$cn = (…)`. The call, its arguments, `-StopOnFail` and every throw and count are
  unchanged. Only the return value is kept.
- **843 (new):** on exit 0, `redact-console` runs without `-StopOnFail`, with `+ $ac + $sc`.
  - Its exit 2 throws a STOP (n1).
  - An exit 1 without a ROW line throws as a crash.
  - It never exits 3: `redactConsole` either calls `stop()` or prints and returns.
- **844 (new):** on any value other than 0 (only 3 is reachable), one `Say9` line is printed. It is not a `STOP:` line, so
  nothing is counted.
- **845-847:** same as HEAD's lines 843-845.

### R1a: the same verdict as `scan` under the socket window
`recipes/s11b.ts:396` `sockWindow(a)` is used by both `scan` (line 423) and `redactConsole` (line 434). I ran the real
CLI with a scratch `BRIDGE_TOKEN` and a scratch `S11_OUT`, so the token file is never read:

| capture | `scan --what console` | `redact-console` (same options) |
|---|---|---|
| A: control, Chrome line, both marks, nothing in the window (`--sock-console`) | `… chrome-blocked=1`, PASS, exit 0 | `redacted=1`, exit 0, copy = control / label / marks |
| B: control, Chrome line, no marks (`--sock-console`) | NOT MEASURED (marks not found), exit 3 | STOP no evidence copy, exit 2, stale copy gone |
| C: marks with `ws://127.0.0.1:9234` inside (`--sock-console`) | STOP, exit 2 | STOP, exit 2, stale copy gone |
| D: `127.0.0.1` outside the marks (`--sock-console`) | fixture 1, PASS, exit 0 | exit 0, copy written |
| E: `--mark-from MF --mark-to MT`, `127.0.0.1` inside | STOP, exit 2 | STOP, exit 2, no copy |
| B without `--sock-console` | PASS, exit 0 | exit 0 |

The two verdicts agree in all six cases.

### R3: stale `--out` removed before the verdict, never inside the repo
`redactConsole`, line 431, runs `outsideRepo(need(a, "out"))`, then line 432 runs `rmSync(out, { force: true })`. The
repo check comes first, and `stop()` throws (line 81), so `rmSync` is never reached for an in-repo path. Test: a scratch
copy of `s11b.ts` with `REPO` set to the scratch `fake-now` folder, holding `recipes\victim.txt` and `sub\v2.txt`. Each
`--out` below gave `STOP: a file of this command lies inside the repo` and exit 2, and the file was still there:
- `<fake>/recipes/victim.txt`
- `<fake>\sub\..\sub\v2.txt`
- the upper-cased `<FAKE>/sub/v2.txt` (`path.relative` on win32 ignores case)
- `<fake>/sub`, a directory

The stale-copy deletion is shown by cases B and C above.

### R2: the CLI tests pass with no token anywhere
`token()` (`recipes/s11b.ts:106-110`) reads `BRIDGE_TOKEN` first, else `join(REPO, "bridge.token")`. My copies of the
module and the test set `REPO` to a scratch folder with no `bridge.token`, and I ran vitest with `env -u BRIDGE_TOKEN`:
- **now** (current code, current test, current ps1): **15 passed (15)**. The test's own `BRIDGE_TOKEN` line is enough.
- **notok** (the same, with the test's `process.env.BRIDGE_TOKEN = …` line removed): **1 failed | 14 passed**, on
  `redacts exactly the lines …` with `expected 2 to be +0`. So that harness truly had no token, and the fix carries
  the test.
- The real tree's `npm test` passes as well (below).

### Red without the fix (the two new tests)
Variant **pre**: `redactConsole` without the `rmSync` line, `scan17(text, ctx)` without `sockWindow(a)` (fixer0's form),
and HEAD's `s11b-r17.ps1` in the scratch repo. Result: **2 failed | 13 passed (15)**:
- `agrees with the scan under the socket window …`: `expected +0 to be 2`;
- `rd-logs runs redact-console only when …`: `expected '# recipes/s11b-r17.ps1: …' to contain '$cn = (Invoke-R17Node …'`.

Green on **now**.

### Gates
- `npm test`: **`Test Files 178 passed (178)` / `Tests 4487 passed (4487)`**, exit 0. This matches fixer0b's claim.
- All seven `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: exit 0.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0.

### Lane
`git diff HEAD --stat` lists only:
- `docs/e2e-test-plan.md` (+2);
- `recipes/s11b-r17.ps1` (+3 −1);
- `recipes/s11b-rules.ts`;
- `recipes/s11b.ts`;
- `recipes/tsconfig.s11b.json`;
- `recipes/tsconfig.s6.json`.

The only untracked files are `recipes/test/s11b-chrome-blocked.test.ts` and the step docs. `git status --short` is the
same after the build.

## 3. Findings

**n1 — NIT — `recipes/s11b-r17.ps1:843`: the new STOP return point is not named.** When the console scan exits 0 and
`redact-console` exits 2, the block throws (`node s11b redact-console ended in a STOP`) and skips the daemon and actor
scans. This is not reachable through a verdict mismatch, because the two commands now share the context, the window and
the text. It is reachable only through an environment fault:
- the capture vanished between the two calls;
- `S11_OUT` inside the repo;
- `--out` the same path as `--file`. In the scratch run, `rmSync` deleted the capture, the read then failed, and the
  CLI printed `STOP: unexpected Error`, exit 2. rd-logs uses two distinct names, so this case does not arise there.

A STOP is the conservative outcome. The RD-LOGS row's `STOP-MAP log-hit` comment and the wave sheet name only the scans.
*Fix (optional):* a trailing `# STOP-MAP log-hit` on line 843, or a line in the row's notes.

**n2 — note, no action — `recipes/test/s11b-chrome-blocked.test.ts:76`: the `S11_OUT` override does not reach the
module.** `S11_OUT` in `recipes/s11b.ts:513` is a module-level `const`, read when the module is imported, which is
before the `describe` body sets `process.env.S11_OUT`. Proof:
- a scratch test sets `process.env.S11_OUT` to an empty dir, while vitest was launched with `S11_OUT` pointing at a dir
  whose `state.json` holds the alias;
- `redact-console` with no `--alias` then exits 0. It took the launch-time alias;
- launched with an empty `S11_OUT` instead, the same call exits 2.

The test's results do not depend on this:
- its no-`--alias` case (`c3.txt`) has no control line, so it is NOT MEASURED whatever the alias;
- no test line holds a `state.json` sentinel;
- the real default `%TEMP%\bridge-e2e\s11\state.json` does not exist today (checked by existence only).

The comment "no real state.json" overstates the fix. If a future CLI test relies on the alias being absent, set
`S11_OUT` before the import, for example through `vi.stubEnv` in a setup file or a dynamic `await import("../s11b")`.

## 4. Deviations
None. All checks ran on scratch copies (with `REPO` pointed at scratch folders) or the real CLI with scratch
`BRIDGE_TOKEN`/`S11_OUT`. I never stashed, checked out or reset anything.

## 5. Proposed decisions
None.

## 6. Handoff
No processes are left running, and nothing touched Chrome, the extension or the daemon. fixer0b's claims all match:
- the 4487/178 count, the seven tsconfigs, typecheck, build and the lane;
- R1b leaves NOT MEASURED counted, and the STOP still ends the block;
- R1a's shared `sockWindow`;
- R3's order;
- R2's token.

The substep can go to the committer. Whether to fix n1 or n2 first is for the step agent.
