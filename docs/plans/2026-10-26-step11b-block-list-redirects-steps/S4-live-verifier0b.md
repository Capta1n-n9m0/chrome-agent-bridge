# S4-live substep 0 — verifier report, round b (re-check after fixer0; #306)

Model/effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6), re-checking only the items fixer0 touched.
I only read and ran things. I edited no repo file and ran nothing live. Scratch work (copies of the code, vitest
configs, CLI captures) is in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v0b\`.
None of it is committed.

## 1. Verdict
**PASS-with-notes.** No CRITICAL or MAJOR finding. N1 and N4 are fixed, and the three new tests fail on the pre-fix
code. The refusal does not loosen anything. It is not quite "no file on NOT MEASURED", though: R1 below finds one
NOT MEASURED path where `redact-console` still writes the evidence copy. It also finds that a NOT MEASURED console
scan now ends `rd-logs` in a STOP. Both are MINOR and leak nothing.

## 2. Outputs (numbers from commands I ran)
- **N1, one context.** `recipes/s11b.ts:381` `scanCtx(a, what)` builds the only `Scan17Ctx`: the token, the
  state.json sentinel, `--alias` (else the one in state.json), `ownId`, the profile and `consoleStream`. `scan`
  (line 418) and `redactConsole` (line 427) both use it. `redactChromeBlocked17` now gets the same context that
  `scan17`/`verdict17` judged. `recipes/s11b-r17.ps1:843` passes `$ac` to `redact-console`, exactly as the scan call
  on line 842 does. CLI check: on a capture holding the control line, the Chrome line and a plain line, run with
  `--alias`, the output was `CONSOLE chrome-blocked lines redacted=1`, exit 0. The output file reads
  `safety: disarmed by the user` / `[chrome-blocked line redacted]` / `plain line`.
- **Refusal.** `stop()` throws before `writeFileSync`. `outsideRepo(--out)` only resolves the path, so nothing is
  written before the verdict. CLI results:
  - `[bridge]` Chrome line → `STOP: the console scan did not pass; no evidence copy is written`, exit 2, no file.
  - The passing capture without `--alias` (and no state.json in the scratch `S11_OUT`) → the same STOP, exit 2, no file.
  - The redactor only ever replaces a line that `isChromeBlockedLine17` accepts under the scan's own context, so the
    refusal adds a gate and widens nothing.
  - Exception: R1.
- **N4.** `--out` goes through `outsideRepo` (line 425). The new test sits in the `recipes/tsconfig.s11b.json`
  include and the `recipes/tsconfig.s6.json` exclude, and nowhere else in either file (diff above, one entry each).
- **Red without the fix.** Method:
  - Scratch copies of `recipes/s11b.ts`, with imports made absolute and `REPO` pointed at a scratch `fakerepo`.
    The pre-fix copy swaps in builder0's `redactConsole`: no shared context, no refusal, no `--out` guard.
  - A scratch copy of the test with `REPO` set to the same `fakerepo`, so the pre-fix `--out` test wrote into scratch
    and never into the repo. `BRIDGE_TOKEN` was set to a scratch value.
  - Vitest configs aliased the module under test.
  - Results: fixed copy **13 passed (13)**; pre-fix copy **3 failed | 10 passed (13)**. The three failures are the
    three new CLI tests: `expected [ Array(4) ] to deeply equal …` (the own-URL line left raw), `expected +0 to be 2`
    (no refusal) and `expected +0 to be 2` (`--out` in the repo accepted). In the real tree the file shows 13 passed (13).
- **Earlier verdict's core (CLI `scan`, alias given).** Results:
  - Plain Chrome line on the console stream → `… profile=0 chrome-blocked=1`, `ROW RD-LOGS PASS`, exit 0.
  - `[bridge] GET http://localhost:8085/hop?s11b=x net::ERR_BLOCKED_BY_CLIENT` on the console stream →
    `localhost:8085=1`, STOP, exit 2.
  - The same Chrome line with `--what daemon` → `localhost:8085=1`, STOP, exit 2.
- **Gates.** `npm test`: **`Test Files 178 passed (178)` / `Tests 4485 passed (4485)`**, which matches the fixer's
  claim (4482 + 3). All seven `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: exit 0. `npm run typecheck`:
  exit 0. `npm run build`: exit 0. `git status --short` after the build is unchanged.
- **Lane.** `git diff HEAD --stat` lists only `docs/e2e-test-plan.md` (+2), `recipes/s11b-r17.ps1` (+1),
  `recipes/s11b-rules.ts`, `recipes/s11b.ts`, `recipes/tsconfig.s11b.json` and `recipes/tsconfig.s6.json`. The only
  untracked files are `recipes/test/s11b-chrome-blocked.test.ts` and the step docs. The `s11b-rules.ts` diff is
  builder0's alone, and the fixer did not touch it.

## 4. Deviations
None. The red-without check used scratch copies and scratch vitest configs. I never stashed, checked out or reset
the main tree.

## 5. Proposed decisions
None.

## 6. Findings

**R1 — MINOR — `recipes/s11b.ts:428` and `recipes/s11b-r17.ps1:842-843`: the refusal judges a different verdict
from the scan's when the socket window is in play, and it changes how `rd-logs` handles NOT MEASURED.**
- (a) `rd-logs` passes `$sc` (`--sock-console`) to the console scan but not to `redact-console`, and `redactConsole`
  calls `scan17(text, ctx)` with no window. When RD-DL-SOCKET ran but its marks are missing, the scan is NOT MEASURED,
  while the redactor sees no window, passes and writes the copy. CLI on the same capture:
  ```
  scan --what console … --alias alias7.localhost --sock-console
    ROW RD-LOGS NOT MEASURED: RD-DL-SOCKET's window marks were not found   exit=3
  redact-console --file … --out …\ev-sock.txt --alias alias7.localhost
    CONSOLE chrome-blocked lines redacted=1   exit=0   (ev-sock.txt exists)
  ```
  The copy has no private text: every other count is 0 and `127.0.0.1` outside a window is a fixture URL. But the
  fixer's "no output file unless the scan passed" does not hold on this path.
- (b) In the other direction, a console scan that is NOT MEASURED for another reason (no alias, no control line,
  token not found) exits 3, which `Invoke-R17Node` counts (`S16NM++`) and moves past. `redact-console` then exits 2,
  and `Invoke-R17Node` (line 139) throws `node s11b ended in a STOP`. So `rd-logs` now ends in a STOP and skips the
  daemon and actor scans, where before #306's fix it recorded NOT MEASURED and went on. This is stricter, not looser,
  but it is a return point that the RD-LOGS row and its `STOP-MAP log-hit` comment do not name.
- *Fix:* in `rd-logs`, keep the console scan's exit code and run `redact-console` only when it is 0 (otherwise
  `Say9` that no evidence copy is written). Optionally, give `redact-console` the same `--sock-console` /
  `--sock-lines` options and pass `$sc`, so its own verdict is the scan's.

**R2 — MINOR — `recipes/test/s11b-chrome-blocked.test.ts`, the test "redacts exactly the lines …": it depends on a
token being present.** The CLI's verdict needs `token()`, which reads `BRIDGE_TOKEN` or the gitignored
`bridge.token`. My scratch harness first ran without either and got `expected 2 to be +0`: the refusal fired
because the token was NOT MEASURED. So the test passes here only because `bridge.token` exists in the main tree. A
clean clone or CI without a token goes red. No other `recipes/test/s11b-*` test reads the token this way (grep
for `BRIDGE_TOKEN`: only `s11-r16-runner` and `s11-win-static`). *Fix:* set `process.env.BRIDGE_TOKEN` to a test value
in that `describe` (restoring it in `afterAll`), and point `S11_OUT` at the temp dir so that no real `state.json`
alias can feed the no-`--alias` case.

**R3 — NIT — `redactConsole`: a refusal leaves an earlier copy in place.** A refused run writes nothing, so a
`console-evidence.txt` from an earlier slice (A) stays in `S11_OUT` under the same name after slice B refuses. The
throw ends the wave, so this does not mislead the runner. Someone collecting evidence by hand could still pick up the
stale copy. *Fix (optional):* delete `--out` before the verdict.

## 7. Handoff
No processes left running. I started nothing against Chrome, the extension or the daemon. The CLI runs used scratch
files and a scratch `S11_OUT`, and the `fakerepo` output file was removed. I checked fixer0's claims: the 4485/178
count, the seven tsconfigs, typecheck, build and the lane all match. The fixer could not run red-before; this report
supplies it, 3 of 3 red. R1 and R2 are cheap, and whether to fix them before the live runner starts is for the step agent.
