# T5 Run 9 — independent verifier, 2026-10-23

**Verdict: PASS-with-notes.** Each Run 9 verdict follows from the pre-registered text (`b4ea752`:
`docs/e2e-test-plan.md` §4.15 and `T5-wave-sheet.md` § "Run 9") applied literally to the raw output.
Both FAIL-as-written rows are real failures of the literal text, and they are described correctly.
Nothing judged was re-tuned. Log hygiene holds. Run 8 is untouched. The notes below are about
evidence that only the record carries, and about small precision points.

Under test: `T5-run9-record.md`, `T5-run9-daemon-log.txt`, and the "Run 9" block added to §5 of
`docs/e2e-test-plan.md` (all uncommitted). Raw evidence: `%TEMP%\bridge-e2e`. The verifier ran no daemon, no
connecting script, no Chrome and no build.

## Check 1 — each verdict against the literal text (one verbatim quote or more per row from the raw files)

| Row | Record | Raw quote checked (file) | Literal text met? |
|---|---|---|---|
| R9-RELOAD-1 | PASS | `connected as client c10 — daemon build 490f1c60…d974, proto 2, extension connected` … `CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab` (`r9-check.out`) | yes. The build matches §4.15's sha, and every RELOAD-1 (§4.14) line is present |
| R9-SCREEN-2 | FAIL as written | `screenshot T28 mode:"cdp" → OFFSCREEN: … or call focusTab first in 3 ms`; `human tab hidden: never; target visible: never`; `… #97fdfd ×3 → other (hue rule)`; `R9 SCREEN-2 (Chrome side) FAIL` (`r9-screen2.out`) | no. The required `→ cyan (hue rule)` and `PASS` lines are absent, so FAIL is correct |
| R9-SCREEN-1 | PASS | runs 1–3 `→ magenta (hue rule)`, `visible again +1594/+1563/+1563 ms` (≤ 2000), `SCREEN-1 PASS — flash per run 1588, 1557, 1556 ms; median 1557 ms` (`r9-screen1.out`) | yes. The flash over 1 s is recorded as a finding, as the row requires |
| R9-SCREEN-3 (a) | PASS | red `#d92424`, lime `#8fff3d`, blue `#3300f8`, `own colour: yes`; `alternating hidden/visible ×3: yes; each target inside its own hidden span: yes`; `SCREEN-3 (a) PASS` (`r9-screen3a.out`) | yes |
| R9-SCREEN-3 (b) | PASS | `[image 48044 base64 chars]` / `[image 47772 …]` (`r9-s3-d2.txt`, `r9-s3-e2.txt`, overlapping 22:55:56.193–57.802 and 57.331–59.300). Re-run offline: `t5-png.ts --transcript actors/D/out.jsonl --hue` → `image 2: … → red (hue rule)`; E → `image 2: … → lime (hue rule)` | yes. D's and E's streams hold one session each (`55feff22…`, `ebdaf589…`), the same sessions as the Run 9 tee files |
| R9-SCREEN-4 | PASS | `→ WINDOW_MINIMIZED: Chrome's window is minimized, so CDP cannot capture the tab — restore the window, or call focusTab first in 3 ms`; `R9 SCREEN-4 cdp PASS` (`r9-screen4.out`) | yes, for the script's lines. `Test-T5Minimized → True` appears in the record only (note 3) |
| R9-SCREEN-5 | PASS | `layout as required: yes`; `944x855 … #dd00fa ×3 → magenta (hue rule)`; `SCREEN-5 (Chrome side) PASS` (`r9-screen5.out`) | yes, for the script's lines. The foreground handle 2821048 matches `w5h.hwnd`, and W5 = 9440498 matches `w5t.hwnd`. The `Get-T5Foreground` output appears in the record only (note 3) |
| R9-RESTORE | PASS | `TIMEOUT: Timed out after 35000ms calling screenshot after 35119 ms`; `front active again +30026 ms`; `R9 RESTORE PASS` (`r9-restore.out`) | yes (check 4) |
| R9-LEASE-3 | PASS | `leaseGranted {"tab":"T44","reason":"opener","url":"http://localhost:8080/e2e-playground.html?popup=1"} after 45 ms` (≤ 2500); `TAB_HELD: tab T44 is held by "t5-lease3" since 22:58:18 …; leaseGranted had already arrived: no` (`r9-lease3.out`). C: `T44* [t5-lease3] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?popup=1`; `(isError) tab T44 is held by "t5-lease3" since 22:58:18 — …` (`r9-lease3-c.txt` = `actors/C/out.jsonl`) | yes |
| R9-NET-1 | FAIL as written | `Cleared 1 requests.`; `showing 2 of 2 (recording since 7m49s ago; 0 pending)`, `[5020] … 200  document    4ms  12.8 KB  http://localhost:8080/e2e-playground.html`, `[5021] … 404  image  3ms  460 B  http://localhost:8080/favicon.ico` (`r9-net1-b.txt`, and the same text in `actors/S/out.jsonl`); `from cache: no`, `content-length: 13106` (`r9-net1-c.txt`); server log `[23/Oct/2026 03:00:34] "GET /e2e-playground.html HTTP/1.1" 200 -` then `GET /favicon.ico … 404` | no. The text requires `showing 1 of 1`, so FAIL is correct. Every other part is met |
| R9-RESOLVER-1 | PASS | `Active tab: [T46] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=resolver`; `url: http://localhost:8080/e2e-playground.html?t5=resolver   title: "Agent Bridge E2E Playground"`; neither line contains `No normal Chrome window is focused` or `No active tab` (`r9-resolver.txt`) | yes, for R's lines. Wd = 4197312 matches `wd.hwnd`. The `Get-T5Foreground` and `Find-T5Uia` counts appear in the record only (note 3) |

No PASS was found where the literal text was not met. Neither FAIL is described wrongly.

## Check 2 — the two FAIL-as-written rows and re-tuning

- **R9-SCREEN-2.** Re-run offline: `npx tsx recipes/t5-png.ts --hue t5/r9-cdp-active.png` →
  `1920x903, bar probes (960,24) #97fdfd (1440,24) #97fdfd (1900,24) #97fdfd → other (hue rule)`.
  R = 151 fails "low ≤ 100", so the result is `other`. The source colour is `#00ffff` (`recipes/t5-lib.ts`
  `COLOURS.cyan`). `hueName` in `recipes/t5-png.ts` implements §4.15's thresholds exactly (150 / 100,
  lime R ≤ 180). §4.15's disclosure lists Run 8 readings only for magenta, red, lime and blue, and none
  for cyan. So this failure could not be foreseen from the known readings, and it was not tuned away.
- **R9-NET-1.** Confirmed: `showing 2 of 2` with a favicon 404 line, and the server log has both
  requests at 03:00:34 local (23:00:34Z).
- **Nothing re-tuned.** `git log b4ea752..HEAD -- recipes/` lists only `15320a6` (RELOAD-AUTO).
  `git diff --stat b4ea752 -- recipes/` (working tree) lists only `recipes/reload-extension.ps1`, a new
  file of 260 lines. It is the reload helper, not judged code. `t5.ts`, `t5-png.ts`, `t5-lib.ts` and
  `t5-win.ps1` are unchanged since `b4ea752`, and `git status` shows nothing modified under `recipes/`.
  `15320a6`'s change to `docs/e2e-test-plan.md` adds only §1 item 9 and leaves §4.15 untouched.

## Check 3 — the banner sub-checks

- **R9-SCREEN-2** (`frames-r9s2/frames.csv`). Window: t0 − 1 s = 22:53:37.932 to t1 + 0.5 s = 22:53:39.435.
  The frames in it are 38.003, 38.271, 38.538, 38.805, 39.069 and 39.338, all band **102**. The four
  frames in the second before t0 (38.003–38.805) are also 102. Viewed: `frame-225339.069.png` shows no
  debugger bar, only the cyan `HUMAN` bar of the fixture tab. The first band change is to 90 at
  22:53:40.140. Viewed: `frame-225340.140.png` shows `"Chrome Agent Bridge" started debugging this
  browser`. That is the script's own active-tab CDP capture, and it shows the loop working. The
  sub-check is met.
- **R9-NET-1** (`frames-r9n1/frames.csv`). 112 frames from 23:00:31.654 to 23:01:01.437, all band 106.
  This span covers the reload (23:00:34.6) and both `browser_network_requests` calls (23:00:40,
  23:00:46). Viewed: `frame-230046.729.png` has no bar. No banner is shown, as the row requires.

## Check 4 — R9-RESTORE

The hang was induced. The call ended in the daemon's own `TIMEOUT: Timed out after 35000ms` after
35119 ms. The target was active from +507 ms, so the capture did activate it and then hung. The front
tab was active again at **+30026 ms**, which is inside [25000, 35000) and before the TIMEOUT.
Afterwards the front tab is active and the target is in the background. The row's literal text is met.

## Check 5 — T5.4 / B2 hygiene

- **Counts, printed without the token's value.** The token was read from `bridge.token` into a
  variable (32 chars), and only counts were printed.
  - `T5-run9-daemon-log.txt`: 81 lines; `://` **0**, token **0**, `[line withheld:` **0**.
  - Raw `daemon-run9.log`: the same counts.
  - The record: token 0. Its 8 `://` hits are all fixture or `chrome://extensions`:
    `localhost:8080/e2e-playground.html{,?popup=1,?t5=resolver}` and `localhost:8080/favicon.ico`. Its one
    `[line withheld:` hit is the hygiene sentence itself.
  - The Run 9 block in §5: token 0; its URLs are only the fixture and favicon ones.
- **No user data.** No user window title appears (only `<DevTools window>`), no user-tab URL, and no
  user name: `C:\Users\<you>`, and the `…\t5\…` paths are shortened. The pre-existing W1 probe tab is
  omitted from C's list as B2 requires. The record's header does name it (`127.0.0.1:8090/crlf.html`),
  but that tab is a copy of the fixture, not a user tab.
- **Same as the live log.** `~/.chrome-agent-bridge/daemon.log` lines 383–463 run from
  `2026-10-22T22:52:50Z extension resync: 2 tabs, 0 gone` to `23:02:13Z client - "t5-cleanup"`, and are
  **identical** to the attached file except for line endings (note 5). The only line that is not a
  client `+`/`-` line is that resync line, as the record says.

## Check 6 — Run 8 untouched

`git diff -- docs/e2e-test-plan.md` → 34 insertions, 0 deletions, in one hunk after Run 8's
"Failures / notes" line. Run 8 is unchanged.

## Findings

1. **INFO — the verdicts are sound.** Nine rows PASS and two FAIL as written (R9-SCREEN-2's positive
   control, R9-NET-1's request count), and each follows literally from `b4ea752`. The record calls the
   two FAILs faults "in the pre-registered checks themselves, with the row's substance met". That is
   its interpretation, kept apart from the verdict. It is consistent with the evidence: an image did
   come back, and the cyan bar looks pale in the PrintWindow frame too; the document line, `from cache:
   no` and the server's 200 are all met.
2. **LOW — R9-RELOAD-1's step was not run as written.** The row's Steps say **[USER]** the extension
   reload. The reload was done instead by `recipes/reload-extension.ps1`, under decisions.md #64/#65,
   which are dated after `b4ea752`. The record and §5 both disclose this. The row's Expected text is
   fully met, and the T5b-only `OFFSCREEN` in 3 ms (R9-SCREEN-2) independently proves the new build.
   The user should see this substitution when ruling.
3. **LOW — some sub-checks rest on the record alone.** The driver-side outputs have no raw file in
   `bridge-e2e`: `Get-DaemonBuild`, `Test-T5Minimized → True`, `Get-T5Foreground` before and after
   (SCREEN-5, RESOLVER-1, NET-1), `Find-T5Uia` counts (19 / 54), `Set-T5Foreground → True`,
   `Get-T5ChromeWindows` rects, and the `^+r` time. The window handles the record names match the
   `*.hwnd` files (`w5h` 2821048, `w5t` 9440498, `wd` 4197312, `wn` 3279800). The build sha is
   corroborated by `r9-check.out` and R's `browser_status`. The server log's 03:00:34 matches the
   reload time. Nothing contradicts the record, but those sub-checks are not independently re-derived
   here.
4. **INFO — the frame called "at t0" is the first frame after t0.** `frame-225339.069` is 137 ms after
   t0. The nearest frame before t0 (38.805, 127 ms before) is also band 102. The conclusion does not
   change.
5. **INFO — line endings differ.** The attached log is CRLF while the live `daemon.log` is LF. The
   content is identical; Git's `autocrlf` will normalise it.
6. **INFO — the "colour-managed" explanation for `#97fdfd` is plausible but not measured.** It matches
   the pattern of `#dd00fa` for `#ff00ff` and `#8fff3d` for `#00ff00`. Run 9 did not measure the cause
   separately.
