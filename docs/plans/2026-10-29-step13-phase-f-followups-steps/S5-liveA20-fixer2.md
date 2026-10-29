# S5-liveA20 fixer 2 (fix round 2 of 3)

Role: fixer, Sonnet, medium. No live block was run. Round 1's diff is kept as it was.

## F1: the four top-level variables
- `recipes/s13-r20-a.ps1`: `$FixtureHuman`, `$Fix81`, `$Blk`, `$EncName` added right after `$DaemonLog`, identical to `s12-r19.ps1:46-49` (ASCII; `$EncName` builds the u-umlaut with `[char]0x00FC`).
- The reused-block guard now also names `'root-add'` (R20 reuses it: `s13-r20.ps1:99`).
- `Invoke-S19Opt` check: not added. Nothing R20 runs calls it (it is used only by `s12-r19-b.ps1`, liveB19).

## Sweep (script-scope variables assigned by s12-r19.ps1, s11b-r17.ps1, s11b-r17b.ps1 against what R20's reused code reads)
Reads taken from Run 17's functions and blocks, Run 17b's `r17b-0` block and `Set-S17Raw`, `Start-R17bWatch`, `Read-R17bWatch`.

| Variable | Read by reused code | R20 entry script |
|---|---|---|
| Repo, Steps, Record, Framing, GlobalsFile, FoundDir, LogDir, Root, FoundJson, NowJson, DaemonLog, FramingBlocks, Persist | yes | already set |
| FixtureHuman (`window`), EncName (`files`), Fix81 (`New-R17Tab`, `r17b-0`), Blk (RD rows) | yes | MISSING, added |
| NeedsAccess, SliceA, SliceB, NotBuilt | read inside Run 17's own main only, not by a dot-sourced function or run block | not needed |
| OldGlobals, Carried, GateRows | Run 17b main only | not needed |
| Dash | r17b uses it at lines 84 and 334, outside `r17b-0` and the three functions; R19 uses it only in `s12-r19-c.ps1` and `-de.ps1` (liveC/D) | not needed |
| UpOptReport, Framing, R17Blocks, R17bZero | set by R20 | already set |
| `$global:S16*`, `R17NB` | globals | already set (R17NB is read only by rows R20 does not run) |

## F2: port 8081
- `recipes/s13-r20.ps1` preflight, right after `Set-R20Port`: `if ($global:R20Port -ne 8081) { Fail-S16 "port 8081 is not free: the reused Run 17 window and R20-0 pages need it (the chosen port is ...)" }`. It runs before any state change; no expected text, STOP rule or pass rule is edited.

## Tests (`recipes/test/s13-r20-ps.test.ts`, 4 new)
- The parity test computes the needed list from source: names assigned at top level in `s12-r19.ps1` that appear in Run 17's body or Run 17b's `r17b-0` and the three functions. It asserts the four dropped ones are in the list and that `s13-r20-a.ps1` assigns each (`S13_R20_A_PS1` overrides the file under test).
- A guard test for `root-add`, and a source test for the F2 line.

## Evidence
- Red: `S5-liveA20-fixer2-red.txt` (HEAD copies of both ps1 files in `$TEMP/s20fix2`): 5 failed, 31 passed (the 3 new parity/guard/F2 tests that depend on the changed files plus the 2 round-1 tests that HEAD's s13-r20.ps1 also fails).
- Green: s13-r20-ps.test.ts 36 passed.
- `npm test`: 5800 passed (243 files) before, 5804 passed (243 files) after.
- Recipes tsconfigs: all 8 exit 0.
- `-Block plan` with a fresh S11_OUT: prints the liveA20 order, exit 0.
