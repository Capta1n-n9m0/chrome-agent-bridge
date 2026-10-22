# BG-FLAGS — step report (Step 7: background input with Chrome restarted under flags)

Step agent: Opus 5.5, 2026-10-23 (UTC 2026-10-22 23:11–23:40Z). Authority: decisions.md · 2026-10-23 ·
The driver may reload the extension by UI automation, and restart Chrome with flags for the
background-input test (#64) (2); #65; #61; #62 (4). Ledger: [`BG-FLAGS.ledger.md`](BG-FLAGS.ledger.md).

## 1. Verdict

**DONE.** The measurement ran as pre-registered. BGF-1 and BGF-2 FAIL: the flags alone do not change
the outcome. Both restarts restored the user's session (counts equal), and Chrome ends without the flags.

## 2. Outputs

- Pre-registration commit `00249de` "docs(e2e): BG-FLAGS rows pre-registered (verifier: PASS-with-notes)":
  `docs/e2e-test-plan.md` §4.16, the wave sheet's "BG-FLAGS (Run 10)", `recipes/bgf-count.ps1`,
  `recipes/bgf-quit.ps1`, `recipes/bgf-launch.ps1`, the prereg verifier file, the ledger.
- Results commit "docs(e2e): BG-FLAGS results (Run 10)": [`BG-FLAGS-run-record.md`](BG-FLAGS-run-record.md),
  [`BG-FLAGS-daemon-log.txt`](BG-FLAGS-daemon-log.txt) (66 lines; `://` 0, token 0, withheld 0),
  `docs/e2e-test-plan.md` §5 "Run 10 (BG-FLAGS)", this report, the ledger, the verifier file.
- Rows: BGF-0 (baseline, no flags) BG-1 FAIL / BG-2 FAIL; **BGF-1 FAIL** (`click e7 trusted → ok (15 ms)`,
  `status: idle`); **BGF-2 FAIL** (`type … trusted → ok (12 ms)`, field `""`); BGF-3 PASS (`NotAllowedError`
  → `Focused tab T14` → `ok`); BGF-4 PASS (text after 2065 ms, idle after 543 ms); BGF-5 (no flags,
  after) FAIL / FAIL. All `--then-focus` lines: the input works after `focusTab`.
- Session restore (counts only): first count 1 window / 1 tab / [1]; before each quit the same; after
  restart 1 and restart 2 each 2 windows (the user's + the quit window, `blank windows 1`), the quit
  window closed → 1 / 1 / [1]; final 1 / 1 / [1], switches `[--restore-last-session]`. `t5.ts check`
  PASS before and after each restart (`listTabs — 2 tab(s)` each time with one check window).
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe` 156.0.8078.48; quit by `chrome://quit`
  in the driver's own window, 0.5 s both times; never killed. Final browser process pid 31092.
- Test count: unchanged (no code change; `npm test` not run — nothing it covers changed).

## 3. Verifier verdict

Pre-registration: FAIL in round 0 (one MAJOR, fixed), then PASS-with-notes —
[`BG-FLAGS-prereg-verifier.md`](BG-FLAGS-prereg-verifier.md). Results: **PASS-with-notes**
(no BLOCKER/MAJOR; MINOR 1 and NITs 2, 4, 5 fixed in the record before the commit; NIT 3, the launch
not timestamped, stays) — [`BG-FLAGS-verifier.md`](BG-FLAGS-verifier.md).

## 4. Deviations

- Commits made by the step agent itself rather than a builder (doc/helper-only stage; exact pathspecs).
- Rows added beyond the brief's four: BGF-0 (baseline before) and BGF-5 (after), informational, so the
  reading "the flags change it" needs a FAIL on each side (pre-registered).
- Chrome was relaunched through `recipes/bgf-launch.ps1` (CreateProcess with `CREATE_BREAKAWAY_FROM_JOB`
  and the user's default environment) instead of a plain `Start-Process chrome.exe`, so the user's Chrome
  does not live in the driver's job object or inherit the session's `CLAUDE_CODE_*` / `VSCODE_*` /
  `CHROME_CRASHPAD_PIPE_NAME` variables. Effect: the final browser process is not in a job (the original
  one was, with its parent gone) — pre-stated in §4.16 as a harmless difference.
- The prereg verifier's one remaining NIT (some decisions cited by number only) was not fixed.

## 5. Proposed decisions

### 2026-10-23 · Chrome's background-throttling flags do not make trusted input reach a background tab
**Decided:** Record as measured (Run 10): with `--disable-renderer-backgrounding
--disable-backgrounding-occluded-windows --disable-background-timer-throttling`, a trusted click or typing
into a background tab still answers `ok` in 12–15 ms and the page receives nothing, as without the flags
before and after; after `focusTab` it works. BG-1/BG-2's cause is not background throttling on its own;
the Step 8 item stays focus emulation (`Emulation.setFocusEmulationEnabled`, or another way to make CDP
input reach a hidden page) or a documented "trusted input needs `focusTab`" policy in `sdk/src/policy.ts`.
**Why:** BGF-0 FAIL, BGF-1/BGF-2 FAIL, BGF-5 FAIL under rules committed before the run (`00249de`).
**Instead of:** recommending users launch Chrome with these flags.
**Revisit if:** a later Chrome changes background-tab input routing, or focus emulation is built and
also fails. **By:** Claude (proposed)

### 2026-10-23 · Restarting the user's Chrome uses `recipes/bgf-quit.ps1` and `recipes/bgf-launch.ps1`
**Decided:** A later wave that needs a Chrome restart quits by `chrome://quit` in a window it opens
(`bgf-quit.ps1`, never a kill), relaunches with `--restore-last-session` through `bgf-launch.ps1` (out of
the driver's job, default environment), checks counts with `bgf-count.ps1`, and closes the restored quit
window with `-CloseBlank -Expect N`.
**Why:** both restarts in Run 10 restored the session exactly (counts), in 0.5 s per quit, with no
user step. **Instead of:** asking the user to restart Chrome. **Revisit if:** a restore ever loses a
window or tab, or the quit window does not come back as `about:blank`. **By:** Claude (proposed; needs
the user's grant beyond #64 (2), which covered this test only)

## 6. Findings

1. **Trusted input into a background tab stays a no-op under the three flags** (BGF-1/BGF-2), in this
   build, with no product change; one trial per condition.
2. Under the flags BG-4's delayed text was seen after 2065 ms (Run 8 without flags: 3746 ms) — consistent
   with the timer clamp being off; one trial each; not judged.
3. **UIA `TabItem` is not a tab count in Chrome**: a page's `role="tab"` element is also a `TabItem`
   (ClassName empty); the tab strip's tabs have ClassName `Tab` (measured; prereg verifier finding 1). A
   `CLAUDE.md` gotcha candidate for anyone counting tabs by UIA.
4. **`chrome://quit` typed into a driver-opened window is a graceful, session-saving exit, and that
   window is restored** by `--restore-last-session` as a one-tab `about:blank` window (both restarts).
5. **The driver's shell runs inside a job object** (limit flags `0x800`) and its environment carries the
   session's variables; a process started with plain `Start-Process` inherits both. Breakaway is allowed.
   A `CLAUDE.md` gotcha candidate for anything the driver must leave running (Chrome, a daemon).
6. The user's clipboard holds `t5-bg3` (BGF-3), as in Run 8.

## 7. Handoff

Nothing running from this stage: daemon 15000 and fixture server 22316 stopped (Test-SafeToKill
`safe`); 9234 and 8080 free; actor F ended (exit 0). Chrome runs as pid 31092 with the user's 1 window /
1 tab and only `--restore-last-session`. No extension reload or user keyboard needed. Next: Step 8
takes focus emulation (#62 (4)) with this result as input.
