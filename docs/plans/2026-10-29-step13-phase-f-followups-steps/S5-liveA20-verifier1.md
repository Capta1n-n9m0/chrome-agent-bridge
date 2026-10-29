# S5-liveA20 verifier 1 (fix round 1 of 3)

Role: verifier (agent-rules §6), Claude Opus 5.5, medium. I only read and ran things. No live block was run and Chrome was not touched. Raw output: `S5-liveA20-verifier1.txt`.

## Verdict: FAIL

The fixer's diff is correct and scoped as claimed: the diagnosis holds, and each restored line matches Run 19 with R20's port. But the brief also asked whether R20 dropped other setup that Run 19 had, and it did. The R20 entry script `recipes/s13-r20-a.ps1` never defines `$EncName`, `$FixtureHuman`, `$Fix81` or `$Blk`. Run 19's entry script defines all four (`recipes/s12-r19.ps1:46-49`). The reused Run 17 blocks `files` and `window` read the first two. So attempt 2 will STOP in `files`, the block right after `servers` (F1). That is the same kind of defect as the one fixed here, in the same prologue, so it needs fix round 2 before another live attempt.

## The fix as claimed (all confirmed)

| Claim | Result |
|---|---|
| Diagnosis: no `$LogDir`, so the cmd redirect fails and python never starts | **Confirmed.** I ran `Start-R17Srv`'s exact command line (`s11b-r17.ps1:367-373`) on free ports. With a missing log dir, cmd exited at once and nothing listened (8087). With an existing dir, python listened and its parent was the cmd PID (8088). I killed only those PIDs. |
| preflight and servers match Run 19 (`s12-r19.ps1:76-94`) | **Confirmed.** The following lines are the same as Run 19's: the dist, Chrome and python checks; `New-Item $LogDir`; the `S16Mark` set; `Assert-R19CaptureFree`; `New-Item` before `Start-R17Srv` in servers; and the own-server `Test-S16Port` check (on `$global:R20Port`, not 8081). Each fail text is Run 19's, except the port-check line, which now uses the R20 port. Two Run 19 lines were left out on purpose, as the fixer reported: `Assert-S12Patched` and the PREFLIGHT `Say9`. I accept both. R20 serves `test-fixtures` as it is, and that `Say9` names port 8081. |
| Nothing else changed | **Confirmed.** `git diff --stat`: the two files, +36/-2. No expected text, STOP line, pass rule or product code changed. The file is still ASCII only (0 bytes above 127). |
| `S16Mark` reaches R20-LOGS | **Confirmed.** It is set in preflight (`s13-r20.ps1:111`) and read with `Select-Object -Skip` (`s13-r20.ps1:219`). `'S16Mark'` is in `$Persist` (`s13-r20-a.ps1:47`). |
| The post-start check passes for the wave's own server | **Confirmed.** `Test-S16Port` (`s11b-r17.ps1:101-110`) treats a listener as the wave's own when its PID, or its parent's PID, is in `$global:S16Pids`. `Set-S16Pid "srv$Port"` stores the cmd PID, and python's parent is that cmd (measured: `parentIsCmd=True`). |
| PS 5.1 traps | **None found.** Blocks run with `&` (`s12-r19-lib.ps1:197`), so `$r20f` and `$r20k` are local to the block. The functions at `s13-r20.ps1:150` and `:156` assign their own `$r20f` before reading it. The rename away from Run 19's `$f` is harmless. |
| Red on HEAD, green on the fix | **Confirmed.** With `S13_R20_PS1` pointing at a `$TEMP` copy of HEAD's ps1: 2 failed, 30 passed. On the working tree: 32 passed. |
| `npm test` | **5800 passed, 243 files** (matches the fixer's count) |
| Recipes typechecks | **All 8 exit 0:** `tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13` |
| `-Block plan` | **Exit 0.** It printed 22 blocks, the same list as the ledger. |

## Findings

**F1: BLOCKER. R20's entry script drops four of Run 19's top-level variables, and the reused `files` and `window` blocks read two of them.**
- Run 19 sets `$FixtureHuman`, `$Fix81`, `$Blk` and `$EncName` at `recipes/s12-r19.ps1:46-49` (copied from `s11b-r17.ps1:45-48`). `recipes/s13-r20-a.ps1:36-47` sets none of them, and `grep -rn "FixtureHuman|EncName|Fix81|\$Blk" recipes/s13* recipes/test/s13*` finds nothing. `Get-R18Defs` (`s12-r18-lib.ps1:295-305`) reads only functions and `$Blocks[...]`, never top-level assignments, so nothing else defines them.
- `files` (`s11b-r17.ps1:418`) runs `Write-R17File (Join-Path $Root $EncName)`. With `$EncName` null, the path becomes `<root>\`. Reproduced: `WriteAllLines` throws `Could not find a part of the path '...\wave\root\'`. That throw comes in the block right after `servers`, so the STOP is `throw-after-state`, before R20-0.
- `window` (`s11b-r17.ps1:423`) runs `New-S16Window $FixtureHuman`. With the variable empty, `Test-S11Url ''` returns False (reproduced), so `Open-S11Window` prints its allow-list STOP and `New-S16Window` throws `no wave window`.
- `teardown` (`s11b-r17.ps1:867`) runs `Remove-Item (Join-Path $Root $null)`, which targets the root folder itself, silenced. That is harmless, but the encoded-name file is never named.
- `$Fix81` (`New-R17Tab`, F-FILETAB) and `$Blk` (RD rows) are used only by Run 17 rows that liveA20 does not run. Restoring them anyway keeps parity with Run 19.
- Fix (lane `recipes/s13-r20-a.ps1`): add Run 19's four lines next to `$DaemonLog`. Add a test that `s13-r20-a.ps1` defines every top-level variable the reused R17 blocks read (`files`, `window`, `console`, `reload`, `teardown`, `root-add`, `rd-restore`, `r17b-0`). Compare against `s12-r19.ps1`'s list so the next drop is caught. The stubbed PS test replaces `$R17Blocks`, which is why this was never seen.
- Also check `$S11Utf8`, which `Write-R17File` reads. It is set in `s11-win.ps1:29`, and that file is dot-sourced, so it is fine. `$Dash` (Run 19 sets it at `s12-r19.ps1:70`) is read only by the `s12-r19-c.ps1` CHOOSE rows, which are not in liveA20. Not a defect.

**F2: MAJOR (latent; not hit while 8081 is free). Two reused paths hard-code 8081, but R20's port is chosen at run time.**
- `window`'s `$FixtureHuman` is an 8081 URL. `Test-S11Url` (`s11-win.ps1:53`) allows fixtures only on 8081 and 8084. R20-0 runs Run 17b's `r17b-0`, which opens `http://localhost:8081/e2e-playground.html?s11b=b0`.
- If `Select-R20Port` ever picks 8082 or higher, the window block STOPs and R20-0 drives a page that no server answers.
- Attempt 1 got 8081, and netstat shows 8081-8089 free now, so this does not block attempt 2. The step agent should decide between two options: (a) STOP in preflight when `$global:R20Port -ne 8081`, with a plain reason; or (b) let the plan's form (10) stand and record this as a known limit. Separately, a port of 8090 would make the new post-start `Test-S16Port` check always fail, because Run 17's helper hard-codes 8090 as the closed port. That needs 8081-8089 all held, so it is a remote case and a note only.

**N1: NOTE. The new tests check source text only.** I agree with the fixer's own caveat. The two tests prove the lines exist, not that the blocks behave. The live re-run is the real proof. The `blk()` slicer ends at the next `\n  $global:R19Blocks[`, which also works with CRLF line endings.

## Recommendation to the step agent
Run fix round 2 on F1 (entry-script variables plus a parity test), and rule on F2 (a) or (b) before attempt 2. Keep this round's diff as it is: it is correct.
