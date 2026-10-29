# S7-live liveD19: Run 19 slice D, live (old build, args; step report)

Step agent: Claude Opus 5.5, medium. Fixer Sonnet 5.5 medium (`S7-live-D-fixer.md`), verifier Opus 5.5 medium
(`S7-live-D-verifier.md`), runner Sonnet 5.5 medium (`S7-live-runner-liveD19-att1.md`), committers Sonnet 5.5 medium.
Ledger: `S7-live.ledger.md` (the liveD19 entries).

## 1. Verdict
**ESCALATE.** Attempt 1 ended on the STOP `devtools-left-open` at R19-RESTORE (`DIALOGS liveD19 native=0 devtools=2
wave-windows-open=1`), one the sheet marks as escalating (§4.27 R19-RESTORE: "a DevTools window still open … is a STOP
… that escalates (integrity floor)"). The STOP is matched: `RETURN 1 after-stop=devtools-left-open restored=n/a
readback=n/a`. **The current build is loaded and proven** (`LOADED rerun=1 consoleMessages=answered entries=11 console=10
exception=1 args=answered`, after `RESTOREHEAD ok`), and **the safety state is restored, equal to R19-0 by count and hash**
(`RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`, read-back `stored
page equal true, daemon.status equal true, title armed true`). R19-LOGS did not run. No attempt 2 and no further fix round:
the STOP returns to the session agent. Budget: attempts 1 of 3, fix rounds 1 of 3.

## 2. Outputs
- **Commits:** `bd523bb` fix round 1 (verifier PASS-with-notes). Its trailer reads `Claude Opus 5.5`; the code was
  written by the Sonnet fixer (a slip in the committer brief; not amended, §10 forbids rewriting). Attempt 1's evidence and
  this report in the commit after it.
- **Fix round 1, before attempt 1:** R19-VERSION's `IN = {css:"#in"}` (`recipes/s12-r19-de.ts:81`, liveE19) targeted c1's
  `hidden` input, which the locator walk prunes: `LOCATOR_NOT_FOUND` on any build (#368/#370 class; #370 orders this fix).
  Now `{css:"#vis"}`, c1's visible file input; nothing else changed. New `recipes/test/s12-r19-de-target.test.ts` (2
  tests). npm test 5590 -> 5592 (235 files; the verifier ran it twice, both green). Verifier: mutants `#in`, `#open`,
  `input[type=file]` and a hidden `#vis` all killed; typecheck and the seven recipes tsconfigs exit 0. MINOR: one fixer run
  had 1 unidentified failing test, not reproduced.
- Pre-run checks of the other defect classes (from code): titles (`S12 console fixture`, `S12 chooser fixture`) known; the
  MCP actor is `mcpOpen` with the #366 link wait, `handleOf` throws on no handle; ARGS-OLD uses no locator. Swap junction
  removal probed in the scratchpad (not a row): `realSwapIO` found a `node_modules/@bridge` junction and node's
  `cmd /c rmdir` removed it, target kept.
- **Attempt 1** (HEAD `bd523bb`, out `$TEMP/bridge-e2e/s19-live/d1`, `-Att 1`; ran 02:05–02:07Z): `S7-live-record-liveD19.txt`
  (142 lines; att 1 carries no suffix, as the other slices), `S7-live-evidence-liveD19-att1.txt` (251),
  `S7-live-console-liveD19-att1-1.txt`, `-2`, `-3` (588, 92, 143; `DevTools` title lines dropped).
- **File scans** (`recipes/s11b.ts scan18 --what other`) of record, evidence and the three console segments: all 0 (`://`,
  token, sentinel, profile). The user's name, `Users\`, `Users/`, `AppData`: 0 in every committed file (the reload lines
  already read `<PROFILE>`).

## 3. Attempt 1 lines as printed
- Prologue and R19-0: `ROW RD-0 (a) PASS`, `ROW RULES PASS`, `ROW RD-0 (c) PASS`, `ROW RD-0 (d) PASS`, `ROW R17B-0 (e)(f)
  PASS`, `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`, `HEAD bd523bb4b78f tree=clean`,
  **`ROW R19-0 PASS slice=D`**.
- Swap: `CAPSEG liveD19 seg=1 saved=yes before=reload`; `SWAP old build is in extension/dist`; reload exit 0 (attempt 1).
- Old-build proof: **`LOADED consoleMessages=UNKNOWN_METHOD entries=0 console=0 exception=0 args=VERSION`**.
- R19-ARGS-OLD legs (no `ROW R19-ARGS-OLD` line was printed: the STOP ended the slice before the row's console clause,
  pending R19-LOGS, could close it):
  - `OLD R19-ARGS-OLD leg=sdk code=VERSION hint=yes forwarded=n/a` -> `LEG … sdk PASS`
  - **`OLD R19-ARGS-OLD leg=mcp code=ERROR hint=yes forwarded=n/a` -> `LEG … mcp FAIL`**
  - `leg=ref code=VERSION hint=yes forwarded=n/a` PASS; `leg=file code=VERSION hint=yes forwarded=n/a` PASS
  - `leg=raw code=VERSION hint=yes forwarded=no` PASS
  - `leg=control code=ok hint=no forwarded=n/a` PASS; **`CHECK R19-ARGS-OLD control raw-twin kind=undefined`**
  - `CHECK R19-ARGS-OLD clauses=6 failed=1`; `CHECK R19-ARGS-OLD console-clause pending R19-LOGS`
- Back to HEAD: `RESTOREHEAD ok`; `CAPSEG liveD19 seg=2 saved=yes before=reload`; reload exit 0 (attempt 1);
  **`LOADED rerun=1 consoleMessages=answered entries=11 console=10 exception=1 args=answered`**.
- R19-RESTORE: `RESTORE … equal …`, `ROW UP-RESTORE PASS`, `RULES 0`, `ROW RULES PASS`, **`DIALOGS liveD19 native=0
  devtools=2 wave-windows-open=1`**, `STOP: a DevTools window is still open at the slice end (devtools-left-open)`,
  `CAPSEG liveD19 seg=3 saved=yes before=end`, `RETURN 1 after-stop=devtools-left-open restored=n/a readback=n/a`.
- Not printed: `ROW R19-ARGS-OLD`, `ROW R19-RESTORE`, R19-LOGS (`SCAN`, `DAEMONLOG`, `CONSOLE`), `CHECK rows19`.

**The control-2 reference kind (#366): `undefined`** on the pre-S2a build, the same as liveA19's `CHECK R19-ARGS-1
control-2 kind=undefined` (att2/att3). S7-record judges control-2; read by #366's rule this is the "same kind on both
builds" case.

## 4. The STOP: cause (helper defect, read from code and the evidence)
The two DevTools windows left are the **earlier worker-console capture windows**, not a DevTools window on a page:
`44437174` (the prologue's capture) and `53349404` (the one reopened after the swap). Both times `Save-R19Seg 'reload'`
saved the segment and then printed `window <D> is not live and the wave's own - not closed`
(evidence: after `CAPSEG … seg=1` and `seg=2`). `Save-R19Seg` (`recipes/s12-r19-lib.ps1:108`) closes the capture with
`Close-S11Window $global:D`, which requires the handle in `$global:S11Own` (`recipes/s11-win.ps1:104,124`); the capture is
opened by `Open-S9WorkerConsole` (`recipes/s11b-r17.ps1:430`) and never enters `S11Own`, so the close is skipped. Every
other path closes D with `if (Test-S9Live $h) { Close-S9Window $h }` (`s11b-r17.ps1:323`, `s11-r16.ps1:170`). Also, each
`Open-R19Seg` re-runs the `console` block, which opens a new chrome://extensions window E and overwrites `$global:E`, so
the earlier E windows (`21433154`, `42143640`) were left too (`wave-windows-open` is a record, not judged). First reached
now: liveB19's one reload (R19-SWEEP-HELD) was NOT MEASURED, so `Save-R19Seg 'reload'` never ran before. Not a product
result; the build swap, both proofs and the restore worked.

After the run the step agent closed the four leftover wave windows by UIA `WindowPattern.Close` (2 DevTools, 2
Extensions; kinds read by title, not printed); the user's two windows (38602544, 68708) were untouched.

## 5. The mcp leg FAIL (recorded, not fixed)
The MCP `browser_evaluate` answer was the daemon's text alone, `the Chrome extension is an older build without evaluate
args — reload it at chrome://extensions (↻ on Chrome Agent Bridge)` (actors file, out folder), with no code on line 1.
`mcpCodeOf` (`recipes/s12-r19-c.ts:94-99`) reads the code from line 1's leading capitals and so returns `ERROR`; the hint
clause held (`hint=yes`). Whether the MCP leg's `code=VERSION` is reachable from the tool's text, or the reader is wrong,
is for S7-record (the same family as liveA19's ARGS-3 and CON-4 MCP legs, #367).

## 6. After-state
Daemon PID 9352 shut down by the runner (`s9.ts daemon-shutdown`); nothing listening on 9234 or 8080-8089 (step agent
re-read by `netstat`); node PID 22152 (unrelated) only; no python. `git worktree list`: the main tree only; `<out>\old-wt`
empty (the swap removed and pruned its worktree itself). Chrome top-level windows: 38602544 and 68708, as before the run.
Current build loaded and proven; safety state equal to R19-0 by count and hash.

## 7. Proposed decisions
### 2026-10-29 · liveD19's `devtools-left-open` was the capture segment's own window, not closed by a helper defect
**Decided:** none by the step agent (the STOP escalates by the sheet). Proposed: a recipes-only fix round 2 for liveD19
(Sonnet fixer, Opus verifier with mutants): in `Save-R19Seg`'s reload branch close D with `if (Test-S9Live $global:D)
{ Close-S9Window $global:D }` and close the reload's E window the same way (or have `Open-R19Seg` reuse E), with a test;
then attempt 2 from a fresh out folder `d2`. **Why:** the windows left were the wave's own capture windows (§4); state and
build were restored and proven; the same frame serves liveE19, which would stop the same way. **Instead of:** accepting
attempt 1 as the slice's result (ARGS-OLD has no ROW and R19-LOGS did not run). **Revisit if:** the session agent reads
the STOP as a true integrity-floor event. **By:** Claude (proposed, for the session agent)

### 2026-10-29 · ARGS-OLD's mcp leg `code=ERROR`: reader or tool text, for S7-record
**Decided:** stands FAIL as printed; S7-record reads whether the MCP's VERSION text carries a code. **By:** Claude (proposed)

## 8. Findings
- Gotcha candidate (`recipes/CLAUDE.md`): a worker-console window opened by `Open-S9WorkerConsole` is not in `S11Own`;
  close it with `Test-S9Live` + `Close-S9Window`, never `Close-S11Window`.
- Measured: the swap of `3ab9207` (worktree, `npm ci`, build, copy) took about 20 s here and left no worktree.
</content>
</invoke>
