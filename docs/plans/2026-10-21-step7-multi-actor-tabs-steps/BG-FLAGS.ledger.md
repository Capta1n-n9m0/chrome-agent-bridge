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
- [ ] prereg commit.
- [ ] Run: pre-flight, BGF-0 baseline, quit #1, relaunch with flags, counts, check, BGF-1..4, quit #2,
  relaunch plain, counts, check, BGF-5.
- [ ] Record, verifier, commit, report.

NEXT: read the prereg verifier, fix, commit; then the run (wave sheet "BG-FLAGS (Run 10)").
