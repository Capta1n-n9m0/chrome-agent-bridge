# S5-liveA20 verifier 2 (fix round 2 of 3)

Role: verifier (agent-rules §6), Claude Opus 5.5, medium. I only read and ran things. No live block was run, and no daemon, Chrome window or port was touched. The one PowerShell probe dot-sources only `s9-win.ps1` and `s11-win.ps1`. Raw output: `S5-liveA20-verifier2.txt`.

## Verdict: PASS-with-notes

Round 1's F1 and F2 are fixed as ruled. The four Run 19 top-level variables are back, with the same text as Run 19. Preflight now refuses a port other than 8081 before any state change. Every exit check passes.

The bounded static walk, from `preflight` to R20-0's first state change, found no other setup that would throw when the runner sets `S11_OUT`, which every documented invocation does. It found one latent ordering difference from Run 19 that matters only when `S11_OUT` is not set (M1, MINOR).

## F1 and F2 re-checked

| Item | Result |
|---|---|
| F1: `$FixtureHuman`, `$Fix81`, `$Blk`, `$EncName` | **Fixed.** `recipes/s13-r20-a.ps1:46-49` match `recipes/s12-r19.ps1:46-49` and `s11b-r17.ps1:45-48` line for line. The file is still ASCII: `$EncName` builds the u-umlaut with `[char]0x00FC`, as Run 19 does. The probe evaluates the four lines as written. `Test-S11Url $FixtureHuman` = True, so the `window` block's `Open-S11Window` will not print its allow-list STOP. `Join-Path $Root $EncName` gives a real leaf of 16 characters, so `files` (`s11b-r17.ps1:418`) no longer writes to `<root>\`. |
| F1: the reused-block guard | **Fixed.** `s13-r20-a.ps1:61` now names `'root-add'`, as Run 19's `:69` does. Register-R20Blocks reuses it at `s13-r20.ps1:99`. |
| F1: the dropped `Invoke-S19Opt` check | **Accepted.** I searched lib, `-a`, `-c` and `s13-r20*.ps1`: nothing on R20's path calls `Invoke-S19Opt`. Only `s12-r19-b.ps1` (liveB19) does. |
| F1: `$Dash` not set | **Accepted.** The parity test's derived list would fail if Run 17's functions or blocks, or Run 17b's `r17b-0` and its three functions, read `$Dash`. They do not, and the test passes. `s12-r19-c.ps1` is dot-sourced by R20, but it reads `$Dash` only in CHOOSE rows that liveA20 does not run. |
| F2 (a): preflight fails when the port is not 8081 | **Fixed as ruled.** `s13-r20.ps1:109` runs `Set-R20Port; if ($global:R20Port -ne 8081) { Fail-S16 "port 8081 is not free: ..." }`. It comes after the PORT line and before the 9234 check, `New-Item $LogDir`, the `S16Mark` set and `Assert-R19CaptureFree`. So nothing has changed when it fires. `Fail-S16` → `Stop9` + throw → `Invoke-R19Slice` catch → `Stop-R19Wave`, with `S16Changed` false → `STOP throw-after-state` / `RETURN ... restored=n/a`. That is the same path attempt 1 took. The message names a port number only: no URL, path or token. It also makes round 1's 8090 note moot. |
| Scope | **Confirmed.** Round 2 changes only the three named files. No expected text, STOP rule, pass rule or product code changed. |

## Exit checks (re-run by me)

| Check | Result |
|---|---|
| New tests red on HEAD | HEAD's `s13-r20.ps1` and `s13-r20-a.ps1` were copied to the scratchpad, and `S13_R20_PS1` / `S13_R20_A_PS1` were pointed at them. Result: **5 failed, 31 passed (36)**: the two round-1 tests, plus "assigns each of them", "guard names root-add" and "refuses a port other than 8081". The fifth round-2 test, "the derived list holds the four", reads only Run 17, 17b and 19 files, so it passes on HEAD by design. That matches the fixer's count. |
| Green on the fix | `recipes/test/s13-r20-ps.test.ts`: **36 passed (36)**. |
| `npm test` | **Test Files 243 passed (243); Tests 5804 passed (5804)**, matching the fixer's 5800 → 5804. |
| Eight recipes tsconfigs | `tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`: **all exit 0**. |
| `S11_OUT=<fresh dir> ... -Block plan` | **Exit 0.** It printed the 22-block liveA20 order, the same as the ledger. |

## Bounded static walk: preflight → servers → files → window → reload → console → r20-0

I compared R20's entry script and wrapper with Run 19's (`s12-r19.ps1` and `s12-r19-lib.ps1`) for each kind of drop the brief named.

- **Unset script-scope variables.** Every variable the prologue and R20-0 read is set:
  - `$Steps` (read by `Assert-R17TreeClean` and `Get-R19Head`)
  - `$LogDir` (by `Start-R17Srv`)
  - `$DaemonLog`
  - `$GlobalsFile` and `$Persist` (by `Save-S16`, which `Set-S16Pid` calls)
  - `$Framing`, `$Record` and `$FramingBlocks` (by `Set-R19Raw` and `Set-S17Raw`)
  - `$Root` and `$EncName` (by `files`)
  - `$FixtureHuman` (by `window`)
  - `$FoundDir` and `$FoundJson` (by `r17b-0`)
  - `$S9Id` and `$S9OptionsUrl` (s9-win)
  - `$S11Utf8` (s11-win, read by `Write-R17File`)
  - `$R20S4Commit` and `$R17bZero`
- **Functions not dot-sourced.** R20 does not dot-source `s12-r19-b.ps1`, `s12-r19-de.ps1` or `s12-r19.ps1`. Of the functions defined only there, the only one R20's files call is `Invoke-R19StepB` (`s12-r19-a.ps1:22`, the default branch of `Invoke-R19Steps`). R20 defines its own at `s13-r20.ps1:154`. `Open-R19Xk` and `Close-R19Xk` are called only inside `s12-r19-c.ps1`'s own CHOOSE and dialog code. Every helper the prologue and R20-0 use is defined in a file R20 sources: `Start-S11bConsoleEval`, `Get-S11bTail`, `Save-S11bConsole`, `Set-S12AttachStamp`, `Open-S11Window`, `Get-S10PinState`, `Open-S9ChromePage`, `Open-S9WorkerConsole` and `Test-S9Live`. `s13-r20.ts` handles `port`, `proof` and `s4` (lines 149-151).
- **Files and dirs not created.** `$env:S11_OUT` is created at `s13-r20-a.ps1:32`. `$LogDir` is created in both preflight and servers. `wave\root` comes from `s11 make` (`s11.ts:424`), as in Run 19.
- **Globals and `$Persist`.** A liveA20 slice runs every block in one process (`Invoke-R19Slice`). `$Persist` is Run 19's list plus `R20Port`, so the globals the prologue sets survive into a separate `-Block teardown` process: W, E, D, S16Pids/Born, S16Mark and R20Port.

**M1: MINOR (latent; not hit when the runner sets `S11_OUT`). R20 dot-sources the window helpers before it sets the `S11_OUT` default, which reverses Run 19's order.**
- Run 19 sets `$env:S11_OUT` (`s12-r19.ps1:31`) before it dot-sources `s11-win.ps1` (`:53`). R20 dot-sources `s11-win.ps1` at `s13-r20-a.ps1:24` and sets the default only at `:31`. R20 needs this order because `-Block plan` uses `Get-R19Order` from `s13-r20.ps1`.
- `s11-win.ps1:27` fixes `$S11Out` at dot-source time. Signals, `found.json`, `now.json`, the console `.expr`/`.dump` files and `last-attach.stamp` are all read through `$S11Out`; see `s11-win.ps1:57,64,66,228-229,475`, `s11b-win.ps1:236-248` and `s12-win.ps1:39-42`. `$FoundJson`, `$NowJson` and node's children use `$env:S11_OUT`.
- Probe (`S5-liveA20-verifier2.txt`): with `S11_OUT` unset, the env path ends in `s13` but `$S11Out` ends in `s11`, so `equal=False`. With `S11_OUT` set, the two are equal.
- So a run without `S11_OUT` would split the wave's files across two folders. The restore compare (`Invoke-R20RestoreCheck`, which reads `$FoundJson` while `Save-S11Found` wrote to `$S11Out`) and the actor signals would then miss. That is past R20-0, but it would cost a live attempt.
- Not blocking: the header (`s13-r20-a.ps1:5`), the ledger's runner command and the brief all set `S11_OUT`. Suggested fix, if the step agent wants it: move lines 31-34 above the dot-sources, after the plan exit is moved or kept. Or make the runner brief state that `S11_OUT` is mandatory, as it already does in practice.

**N1: NOTE.** As in round 1, the round-2 tests check source text only, not behaviour. The parity test is a useful guard: it derives the needed names from `s12-r19.ps1` and the Run 17 and 17b bodies. But it would not catch a name that Run 19 also never set, or a variable read before it is assigned (M1's kind). The live attempt is still the real proof.

## Recommendation to the step agent
Accept round 2 and go to attempt 2 with a fresh `S11_OUT` and `-Att 2`. M1 does not need a fix round if the runner always sets `S11_OUT`.
