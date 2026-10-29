# S5-liveA20 runner, attempt 1 (Claude Sonnet 5.5, medium)

## 1. Verdict
**ESCALATE (STOP, nothing measured).** Attempt 1 stopped in block `servers`, before R20-0 and before any state change. No ROW line was printed.

## 2. Outputs
- Preflight: `git status --short` showed only the untracked ledger file `S5-liveA20.ledger.md` in the steps dir (no tracked change); HEAD `a32cb8c`; nothing on 9234 or 8080-8089.
- Build: `npm run build` ended `built extension → dist/` (exit 0).
- Reload: no separate run; the script's own `reload` block does it per §8. It never ran (the wave stopped earlier), so there are no reload exits.
- Script: `recipes/s13-r20-a.ps1 -Block liveA20 -Att 1`, S11_OUT `$TEMP/bridge-e2e/s20-live/a1`. Exit code 2. Start 2026-10-29T16:23:56Z, end 16:24:15Z.
- STOP / RETURN, verbatim:
  - `STOP: the fixture server did not answer (at 2026-10-29T16:24:15.255Z)` (raised by `Fail-S16` in `Register-R20Blocks`' `servers` block, `recipes/s13-r20.ps1:108`, after `Test-R17Listens` waited its 15 s)
  - `2026-10-29T16:24:15.286Z s9-win: STOP throw-after-state`
  - `2026-10-29T16:24:15.298Z s9-win: RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a`
- Record lines: only the WAVE/STOP/RETURN lines. No ROW, no RESTORE/DIALOGS/SCAN20 line. Record: `S13-live-record-liveA20.txt` (4 lines; no home path or name found).
- `PORT 8081 checked=2026-10-29T16:23:58.211Z listed=119`.
- Teardown (`-Block teardown -Att 1`, exit 0): `CHECK clean PASS: the wave folder and state.json removed`; `TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed`.
- Evidence: `S5-liveA20-evidence-att1.txt` (script stdout + teardown output, home path redacted; scanned for the user's name and home path: none). No console segment exists.

## 3. Deviations
- Preflight "git status empty" did not hold literally (the untracked ledger); it is inside the steps dir, which the clean-tree guard ignores, and the guard passed.
- No separate `reload-extension.ps1` run (the script's block does it).

## 4. Findings
- The fixture server on 8081 (python `-m http.server 8081 --bind 127.0.0.1 --directory test-fixtures`, started via `cmd /c` with output to `p8081.txt` in the wave's log dir) did not accept a connection within 15 s. Cause not determined: the server's log (`p8081.txt`) lived in the wave folder, which the first stop's teardown then removed. I did not fix or retry (brief: helper fixes go to the step agent). Observations: `python` resolves in Git Bash to miniconda (`<home>/miniconda3/python`); I did not check what `(Get-Command python).Source` returns under powershell.exe 5.1 (a Windows Store stub or a different interpreter is a possibility, unverified). Suggest the step agent reproduce `Start-R17Srv` by hand with the log kept.
- Attempts used: 1 of 3 for this slice. No state was changed (restored=n/a), so a new attempt needs only a fresh S11_OUT and `-Att 2`.

## 5. Handoff
- After: netstat shows nothing on 9234 or 8080-8089.
- Processes: I started no node/python process that remains. One `node.exe` (PID 22152, started 2026-10-22, a Codex artifact-tool host daemon) is not mine and was left alone. Chrome untouched.
- Screen: no window, dialog, DevTools or options window was opened by the run (it stopped before `window`); nothing left open that I know of.
- Tree after: the new untracked files are the record, this report and the evidence file (plus the step agent's ledger). Nothing committed.
