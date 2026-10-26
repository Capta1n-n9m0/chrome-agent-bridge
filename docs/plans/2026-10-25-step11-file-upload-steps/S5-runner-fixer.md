# S5-runner fixer report

Model: Sonnet 5.5 (effort medium per #270). UTC 2026-10-26T04:02Z -> 04:09Z. Role: fixer (agent-rules section 6). Nothing ran live
(no daemon, no Chrome UIA, no reload, no 8081/8084 server; node ran only throwaway scripts). No commit.
New tests live in `recipes/test/s11-r16-fixes.test.ts` (8 tests: the real text of the runner's functions and blocks runs in
PowerShell 5.1 with UIA/node helpers stubbed) and in `recipes/test/s11-r16-runner.test.ts` (scan tests).
"Fails without the fix": I put each old behaviour back in a copy of the .ps1 (mutants M1-M4) and re-ran; and I ran the old scan
(`scanPs1Output`) over each planted leak.

## MAJOR-1: second restore after a failed UP-RESTORE
Change: `recipes/s11-r16.ps1` `$Blocks['up-restore']` (about :337-344): the `try/finally` is gone; `S16InRestore` is cleared only
after a successful restore (`$global:S16Changed = $false; $global:S16InRestore = $false`). A false return or a throw leaves it set,
so `Stop-S16Wave` says "no second restore". Test: `s11-r16-fixes.test.ts` "MAJOR-1" (3 tests) runs the real `Step-S16`, `up-restore`,
`Invoke-S16Block`, `Stop-S16Wave` and main catch; false return and throw each give exactly one `RESTORE-CALLED`, exit 2; a clean
restore gives exit 0. Mutant M1 (finally restored): both failure tests fail.

## MINOR-1: static scan gaps
Change: `recipes/s11-r16-plan.ts` `scanR16`: sinks now include `WriteAllLines/AppendAllLines/WriteAllBytes`, `Out-String`,
`Out-Host`, `Out-Default`, `Export-Clixml/Export-Csv` (the one real `Export-Clixml` in `Save-S16`, ps1 :75, carries a new
`# vetted-clixml` tag; exactly one such site is required); any `Show-S16` call other than the function line, Say9/Stop9, the vetted
node-output line, `Show-S16 $out` and `Show-S16 ([string[]]$o)` is a violation; a line that only names a path variable
(`$Root`, `$FoundJson`, `$FoundDir`, `$DaemonLog`, `$NowJson`, `$OptJson`, `$Record`, `$GlobalsFile`, `$Framing`, `$env:*`, bare or in
quotes) is a violation. Existing rules untouched. Tests: "catches planted leaks" gained nine plants (Show-S16 with `$Root`,
`$FoundDir`, `$env:USERPROFILE`; WriteAllLines; Export-Clixml; Out-String; bare `$Root`, `$FoundJson`, `"$DaemonLog"`), a second
vetted clixml/file-write site, and a test that the two vetted Show-S16 arguments stay allowed. The old `scanPs1Output` flagged 0 of
the 9 plants (run in a scratch script); the new scan flags all.

## MINOR-2: liveB refuses before any state change
Evidence: reading the toggle needs only a window of its own on `chrome://extensions/?id=...` (`Read-S11FileAccess` asserts the
window is ours and presses nothing); it needs no reload, no fixture server and no W. So the earliest refusal is right after the
preflight. Change: new `Read-S16Early` (ps1 :175-187) and one line in the slice loop (:391): liveB only, after `preflight`, it
opens/reads/closes that window, sets `S16Toggle`; off -> says so, removes the globals file (`S16Gone`), the loop exits 3 with no
server, file, window, prestale, reload or tab; unreadable -> STOP (exit 2 via the main catch). UP-0 still reads and records the
toggle later as before; the loop gate stays. Test: "MINOR-2" runs the real main loop with stubs: off -> blocks run = `preflight`
only, window closed, exit 3; on -> all liveB blocks; liveA never opens the window. Mutant M2 (early read removed): both fail.

## MINOR-3: a node crash looked like a failed check
Change: `Invoke-S16Node` (ps1 :130-131): exit 1 with no `^(ROW|CHECK) ` line in the output throws (a STOP; message names
node-err.txt, not its text). Test: "MINOR-3" runs the real function against a throwaway script: `process.exit(1)` -> THREW, no
result; a CHECK or ROW line + exit 1 -> result 1 and `S16Fail` 1. Mutant M3: the crash test fails.

## MINOR-4: tree kill
Change: `Stop-S16Pid` (ps1 :87-89): `/T` only for names `srv*`; node is killed with `/F` alone. Found by the test: my first form
`$ta = if (...) { @('/F') }` unrolls a one-element array to a string and `@ta` splatted its characters (`/`, `F`); now
`$ta = @(if ...)`. Test: "Stop-S16Pid" stubs `Get-Process` and `taskkill`: node -> `/F /PID`, srv8081/srv8084 -> `/T /F /PID`.
Mutant M4 (always /T): fails. The existing one-`taskkill`-line and never-chrome test still passes.

## Left alone
NIT-1..NIT-5 (none is a one-line consequence of a fix). Unproven-until-live list unchanged.

## Results
- `s11-r16.ps1`: 403 lines (`wc -l`), 0 non-ASCII bytes, ParseFile 0 errors (PowerShell 5.1).
- `npm run typecheck` exit 0. `npm run build` exit 0 ("built extension -> dist/").
- `npm test`: Test Files 152 passed (152), Tests 3784 passed (3784). Before: 151 files / 3775 (+9 = 8 in s11-r16-fixes, 1 in
  the runner file's new vetted-Show-S16 test).
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11}.json`: all six exit 0. `tsconfig.s11.json` also lists
  `s11-r16-plan.ts`, `s11-r16-opt.ts`, `test/s11-r16-runner.test.ts` (builder) and now `test/s11-r16-fixes.test.ts`.
- Note: Windows Python rewrote files as CRLF during the fix; I converted the four touched files back to LF (the tests' regexes
  match `\n`).

## Proposed decisions
None.
