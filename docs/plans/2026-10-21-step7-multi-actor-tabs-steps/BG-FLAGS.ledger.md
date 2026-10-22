# BG-FLAGS ledger

Stage: background input with Chrome restarted under flags (decisions.md · 2026-10-23 · #64 (2), #65,
#61, #62 (4)). Step agent: Opus 5.5. Started 2026-10-22T23:11Z (UTC; local date 2026-10-23), HEAD c99709a.

- 23:11Z done · read common.md, CLAUDE.md, §4.14 BG rows, §4.15, wave sheet (T5 + Run 9), T5 run record BG
  rows, t5.ts bgInput/bg4/check, reload-extension.ps1, t5-win.ps1, decisions #61/#64/#65.
- 23:12Z done · facts (no Chrome touched): chrome.exe `C:\Program Files\Google\Chrome\Application\chrome.exe`
  156.0.8078.48; browser pid 8044 (no switches, parent gone, in a job); driver shell in a job, limit
  flags 0x800 (BREAKAWAY_OK, no KILL_ON_JOB_CLOSE); no daemon, 9234/8080 free, BRIDGE_TOKEN unset.
- 23:13Z done · launcher test: CreateProcess + CREATE_BREAKAWAY_FROM_JOB + CreateEnvironmentBlock →
  child not in a job, user default environment (no CLAUDE_CODE_SESSION/VSCODE_*/CHROME_CRASHPAD vars).
  → `recipes/bgf-launch.ps1`.
- 23:14Z done · `recipes/bgf-count.ps1` (counts only): 9 chrome.exe, 1 browser process, 1 browser
  window, 2 tabs, no switches.
- 23:18Z done · `recipes/bgf-quit.ps1`; bgf-count `blank windows` + `-CloseBlank`; parse check 0/0/0.
  §4.16 in e2e-test-plan.md + wave sheet "BG-FLAGS (Run 10)" written (uncommitted).
- 23:19Z started · prereg verifier (opus, background) → BG-FLAGS-prereg-verifier.md.
- 23:22Z done · prereg verifier round 0 FAIL (MAJOR: UIA TabItem counted a web role=tab element; user window
  really 1 tab); fix round 1 (ClassName 'Tab', -Expect N, step-0 precondition, STOP wording); re-check PASS-with-notes.
- 23:24Z done · prereg commit 00249de.
- 23:25Z done · pre-flight: N=1, T=1, P=[1], switches []; fixture server pid 22316; helper test OK.
- 23:26Z done · check PASS (k=2=T+1), daemon pid 15000; BGF-0 FAIL/FAIL.
- 23:27Z done · restart 1: QUIT OK 0.5 s; launch pid 22700 (not in job) with flags; restore 1/1/[1] + quit
  window closed; check PASS (k=2).
- 23:28Z done · BGF-1 FAIL, BGF-2 FAIL, BGF-4 PASS (2065/543 ms), BGF-3 PASS (actor F, ended exit 0).
- 23:29Z done · restart 2: QUIT OK 0.5 s; launch pid 31092 `--restore-last-session`; restore 1/1/[1]; check PASS.
- 23:30Z done · BGF-5 FAIL/FAIL; final count 1/1/[1] [--restore-last-session]; daemon 15000 and fixture 22316
  stopped (Test-SafeToKill safe); log hygiene 66 lines 0/0/0 → BG-FLAGS-daemon-log.txt.
- 23:33Z started · BG-FLAGS-run-record.md + §5 Run 10 written; results verifier (opus, background).
- 23:38Z done · results verifier PASS-with-notes; MINOR 1, NITs 2/4/5 fixed in the record; report written.
- [x] results commit (this commit).

NEXT: nothing — stage done; hand back.
