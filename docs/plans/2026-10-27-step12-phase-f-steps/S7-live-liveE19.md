# S7-live liveE19: Run 19 slice E, live (old build, chooser; step report)

Step agent: Claude Opus 5.5, medium. Runner Sonnet 5.5 medium (`S7-live-runner-liveE19-att1.md`), committer Sonnet 5.5
medium. No fixer or verifier: no fix round was needed. Ledger: `S7-live.ledger.md` (the liveE19 entries).

## 1. Verdict
**DONE.** Attempt 1 exited 0 with no STOP (`CHECK rows19 rows=10 warns=0 stop-return=0`; `SLICE liveE19 done: calls with
a failed check 1, not measured 0`). **The current build is loaded and proven** (`RESTOREHEAD ok`, reload exit 0, then
`LOADED rerun=1 consoleMessages=answered entries=11 console=10 exception=1 args=answered`). **The safety state is equal to
R19-0 by count and hash** (`RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0
hash=equal`). Budget: attempts 1 of 3; fix rounds 0 of 3.

## 2. Outputs
- Pre-attempt code check (from code, no run) of R19-VERSION's driver (`recipes/s12-r19-de.ts` `version`,
  `recipes/s12-r19-de.ps1`, the frame `Invoke-R19Swapped` in `recipes/s12-r19-lib.ps1`) for this wave's defect classes:
  1. Hidden or `body` locator targets (#368/#370): `IN = {css:"#vis"}` (`bd523bb`) is c1's visible file input
     (`test-fixtures/s12-chooser.js`, `BODY.c1`). Every leg uses it, the control too.
  2. Unknown fixture titles (#367): only `s12=c1` pages, titled `S12 chooser fixture`, which the guard accepts
     (`recipes/s12-win.ps1:17`).
  3. The MCP actor's link wait (#366): `x.mcp()` is `mcpOpen` with the wait (it worked in liveD19); `handleOf` throws on
     no handle.
  4. Wrong closers (#371): the capture windows are closed by `Close-R19CaptureWindows` (`c55cf9d`); ROOT goes through
     `Add-R19RootOnce`, the same `root-add` block liveB19 and liveC19 ran.
  Nothing found, so no fix round ran before attempt 1.
- **Attempt 1:** HEAD `772a53e`, out `$TEMP/bridge-e2e/s19-live/e1`, `-Att 1`, ran 02:37–02:39Z.
- Evidence (steps dir): `S7-live-record-liveE19.txt` (160 lines; the script names attempt 1 without a suffix, as every
  other slice), `S7-live-evidence-liveE19-att1.txt` (282), `S7-live-console-liveE19-att1-1.txt`, `-2`, `-3`, `-all`
  (587, 149, 142, 878 after dropping `DevTools` lines).
- Commit: attempt 1's evidence, the runner report, this report and the ledger (hash in the step agent's return).

## 3. Attempt 1 lines as printed (record `S7-live-record-liveE19.txt`)
- ROW verdict lines: **10 PASS, 1 FAIL** (`CHECK rows19 rows=10`).
  - PASS: RD-0 (a), RULES x2, RD-0 (c), RD-0 (d), R17B-0 (e)(f), **R19-0 PASS slice=E**, UP-RESTORE,
    **R19-RESTORE PASS slice=E**, **R19-LOGS PASS slice=E**.
  - FAIL: **R19-VERSION FAIL**.
- Prologue and R19-0: `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`, `HEAD
  772a53e0e207 tree=clean`, `ROW R19-0 PASS slice=E`.
- ROOT (#365): `BOX uploadfolders set (1 non-blank line(s); saved; text withheld)`, `STATE … uploadfolders lines=1`.
- Swap: `CAPSEG liveE19 seg=1 saved=yes before=reload` (D and E closed: `window <h> closed` x2), `SWAP old build is in
  extension/dist`, `reload-extension.ps1 exit 0 (attempt 1)`, the console reopened.
- R19-VERSION (on `63c771c`):
  - `VERSIONCH R19-VERSION leg=sdk code=VERSION hint=yes files=0 exact=yes` -> `LEG … sdk PASS`
  - **`VERSIONCH R19-VERSION leg=mcp code=ERROR hint=yes files=0 exact=yes` -> `LEG … mcp FAIL`**
  - `leg=raw code=VERSION hint=yes files=0 exact=yes` -> PASS
  - `leg=control code=ok hint=no files=1 exact=no` -> PASS
  - `CHECK R19-VERSION args=answered` -> `LEG … args PASS`
  - `CHECK R19-VERSION clauses=5 failed=1`; `ROW R19-VERSION FAIL`.
- Back to HEAD: `RESTOREHEAD ok`; `CAPSEG liveE19 seg=2 saved=yes before=reload`; reload exit 0 (attempt 1);
  **`LOADED rerun=1 consoleMessages=answered entries=11 console=10 exception=1 args=answered`**.
- R19-RESTORE: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `ROW
  UP-RESTORE PASS`; `RULES 0`; **`DIALOGS liveE19 native=0 devtools=0 wave-windows-open=1`**; `CAPSEG liveE19 seg=3
  saved=yes before=end`.
- R19-LOGS: `CONSOLE liveE19 segments=3 … texts=895 control-disarmed=3`; `SCAN console`, `SCAN daemon` all 0;
  `DAEMONLOG liveE19 sentinel=0 console-text=0 args-text=0`; SCANTOOL browser_new_tab / upload_file / evaluate /
  close_tab all 0; `SCAN actors: ://=1 (fixture 1, other 0)`, `profile-all=0`.
- Teardown by the script: `CHECK clean PASS`.
- No old-build `LOADED` line: none is in liveE19's order (only ARGS-OLD's driver prints one). The old build's presence
  shows in the legs: the sdk and raw legs answered `VERSION` with the exact `CHOOSER_RELOAD_HINT`, and `files=0`.

## 4. The mcp leg FAIL (recorded, not fixed)
The MCP `browser_upload_file` answer (actors file, out folder) was the daemon's text alone, `the Chrome extension is an
older build without the file chooser upload — reload it at chrome://extensions (↻ on Chrome Agent Bridge)`, with no code
on line 1. `mcpCodeOf` (`recipes/s12-r19-c.ts:94-99`) reads the code from line 1's leading capitals, so it returns `ERROR`.
The other clauses held (`hint=yes exact=yes files=0`). This is the same shape as liveD19's ARGS-OLD mcp leg (#371): it
stands FAIL as printed, and S7-record reads whether the code is reachable from the tool's text or the reader is wrong.

## 5. STOPs
None.

## 6. Restore and after-state
- The current build is loaded and proven (§1). The safety state is equal to R19-0; read-back `CHECK UP-RESTORE stored PASS`,
  `daemon PASS`. ROOT, added inside the block, is gone (`uploadfolders lines=0 hash=equal`).
- The runner shut down the daemon (PID 4280) with `s9.ts daemon-shutdown`.
- The step agent re-read the after-state:
  - nothing listens on 9234/8080-8089;
  - node PID 22152 (unrelated) only, and no python;
  - `git worktree list` shows the main tree only; `<out>\old-wt` has 0 entries;
  - Chrome top-level windows: 38602544 and 68708, as before the run. No DevTools or wave window is left; none was
    closed by an agent.

## 7. Scans
- `scan18 --what other` on the record, evidence and the four console files: all 0.
- The step agent grepped every liveE19 file for the user's name, `Users\`, `Users/`, `AppData`. One hit: the runner
  report listed the user's name forms as scan patterns. It now reads "the user's name (three forms)". There were no other
  hits.

## 8. Proposed decisions
### 2026-10-29 · liveE19 closes on attempt 1
**Decided (proposed):** liveE19's result is attempt 1. R19-0, R19-RESTORE and R19-LOGS PASS. R19-VERSION FAIL from the mcp
leg alone (`code=ERROR`; `hint=yes exact=yes files=0`). The sdk, raw, control and args clauses PASS. S7-record reads the
mcp leg with liveD19's ARGS-OLD mcp leg and liveA19's MCP legs (#367, #371). **Why:** the run printed it with no STOP,
and the budget leaves no reason to re-run a FAIL whose cause sits in a reader, not the product. **Revisit if:** S7-record
finds `mcpCodeOf` wrong for an MCP text with no code line; then the leg is NOT DISCRIMINATING, never PASS. **By:** Claude
(proposed)

## 9. Findings
- Measured: the swap of `63c771c` (worktree, `npm ci`, build, copy) took about 17 s (CAPSEG seg=1 at 02:38:37, the
  reload's start at 02:38:54) and left no worktree.
- 20 committed files in this steps dir carry the user's name in some form (`git grep -l` count, HEAD `772a53e`). One is
  liveD19's attempt-2 runner report, which lists the name forms as scan patterns; the others were not read here. That is
  a public-repo item for the session agent (agent-rules §2, a cleanup pass). Those files are outside this slice's
  outputs, so they are not edited here.
- The runner brief's habit of naming the scan patterns verbatim leaks them. A runner brief should name them only as "the
  user's name" (gotcha candidate, process).
