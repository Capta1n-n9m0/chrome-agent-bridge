# S5 fixer report, round 1: `bb-login.ps1`'s condition-based post-submit wait

Fixer round 1, Step 10 stage S5, 2026-10-25 (Claude Opus 5.5). Work list: findings F1-F5 of `S5-verifier.md` §5,
fixed as the step agent's rulings in `briefs/S5-fixer1.md` say. Lane: `recipes/bb-login.ps1` and
`recipes/fixtures/sso-standin.html` only. Dry runs only (`-DryRunBase` on 127.0.0.1); G10-3 not touched: no real
site, no credential, no bridge port, no daemon, no extension. No TypeScript changed, no npm command run, no commit.

**Result:** F1, F2, F4, F5 fixed; F3 fixed, with its premise (exit 1) not reproduced - see F3.

## 1. Changes

`recipes/bb-login.ps1` (64 changed lines against the builder's copy; still pure ASCII, LF, no BOM: 29 132 bytes,
0 bytes > 0x7F, 0 CR; PowerShell parser: 0 errors):

- `LoginWin` gains `IsWindow` (one `DllImport` line).
- Two new helpers before `Finish-AfterPress`: `Test-OwnWindow` (`IsWindow($H)` and class `Chrome_WidgetWin_1`)
  and `Exit-WindowGone` (two `Say` lines, exit 4).
- `Finish-AfterPress`:
  - **F1**: before a scan, `$margin = max(5000, $worstScan)`; when the time left is under `$margin` the poll does
    not scan (`$skipped++`, `$clean = 0`, the last-poll text says `not scanned (less than <margin> left before
    the bound)`).
  - **F2**: after every scan, `if ($sw.ElapsedMilliseconds -ge $deadline) { break }` before the exit-0 test, so a
    scan that ends past the bound goes to the exit-4 path.
  - **F3**: the window is checked at the top of every poll and after the loop (gone -> `Exit-WindowGone`, exit 4);
    `Get-Addr` (already catching) and `Get-Scan` are wrapped in `try`/`catch`; a scan that throws is "not
    scanned" for that poll (`$clean = 0`, text `not scanned (the scan failed)`), then the window is checked.
    `$ErrorActionPreference = 'Stop'` is unchanged elsewhere.
  - **F4**: both address comparisons in `Finish-AfterPress` use `-cne` (the one at the poll's start and the
    re-read after the scan). `Wait-Settled`'s pre-press `-ne` is outside the finding and left as it was.
  - The bound line gains `skipped near the bound: <n>`; the not-scanned reason comes from the poll (`off the
    blackboard host` as before, or the two new ones).
- Header step 6: "Worst case: -WaitSec plus one poll step" replaced by the sentence the ruling asks for: *no scan
  starts with less than max(5 s, the slowest scan so far) left, and a scan that ends past the bound leads to exit 4,
  never exit 0: the exit comes at most -WaitSec plus (one scan - 5 s), so <= 95 s with the default whenever one scan
  takes <= 10 s (a scan is one synchronous UIA call and cannot be cut)*, plus the F3 sentence and a dated
  `*Changed 2026-10-25 ...: was ...*` note. A comment over the helpers says the same.
- New locals `$slack $margin $skipped $a2` and the helpers' params (`$sw $polls $scans`) do not collide,
  case-insensitively, with a script-scope name a callee reads; the new helpers read `$H`, and no caller has a
  `$h` local (`grep -nE '\$h\b'`: only `Test-SsoHost`'s param, `Get-ChromeWindows`' callback param and
  `Get-Where`'s local, none of which calls them, plus one comment).

Consequence (as the ruling says, conservative): exit 0 is impossible in the last max(5 s, worst scan) before the
bound; such a run ends in exit 4 with nothing pressed.

`recipes/fixtures/sso-standin.html` (**F5**): the submit goes to `bb-standin.html?signedin=1&t=" + Date.now()`
(`bb-standin.html`'s test `/[?&]signedin=1(&|$)/` still matches), with a header note dated 2026-10-25. ASCII,
LF, 1 514 bytes.

## 2. Runs

Server A: `python -I -m http.server 8093 --bind 127.0.0.1 --directory recipes/fixtures`, PID 4328; server B: the
same on 8094 over a copy of the verifier's attack pages in my scratchpad (`f1/attack`), PID 34184. Each run:
`powershell -NoProfile -ExecutionPolicy Bypass -File <script> -DryRunBase http://127.0.0.1:<port>/ -DryRunPage
<page> [-WaitSec N]`, output to a file; submits counted from the server's log lines after the run's start offset;
time from the press = last line's timestamp - the `invoked` line's. Old script = `git show 09fa604:recipes/bb-login.ps1`
in my scratchpad; "builder" = a copy of the builder's script taken before my edits.

| Leg | Script | Page | Exit | Submits (server log) | Press -> last line | Expected | Result |
|---|---|---|---|---|---|---|---|
| 1 | OLD (run first) | bb-standin-delayed | 4 | 1 `/sso-submit-delayed.html?t=1792883188773` | 13.218 s | 4 | PASS |
| 1 | NEW | bb-standin-delayed | 0 | 1 `?t=1792883211757` | 16.277 s | 0 | PASS |
| 2 | NEW | bb-standin-stuck | 4 | 1 `/submit-stuck?t=1792883241092` | 90.015 s | 4, 90-95 s | PASS |
| 3 | NEW | bb-standin-elsewhere | 4 | 1 `/elsewhere-landing.html?t=1792883341278` | 90.015 s | 4 at the bound | PASS |
| reg | NEW | bb-standin | 0 | **1** `/bb-standin.html?signedin=1&t=1792883447070` | 4.162 s | 0, 1 counted submit | PASS |
| reg | NEW | bb-standin-bad | 4 | 0, no `invoked` line | - | 4, no press | PASS |
| reg | NEW | bb-standin-otherhost | 4 | 0 `/pressed-otherhost`, no `invoked` line | - | 4, no press | PASS |
| F1 heavy | NEW `-WaitSec 20` | bb-atk-heavy (Sign in + 8 000 buttons) | 4 | 0 `/pressed-again` | **20.001 s** | <= 20 s + the slack rule | PASS |
| F1 heavy churn | NEW `-WaitSec 20` | bb-atk-heavychurn (Sign in + 3 000 churning) | 4 | 0 `/pressed-again` | **20.008 s** | <= 20 s + the slack rule | PASS |
| F3 stuck | NEW `-WaitSec 30`, window closed 5 s after the press | bb-standin-stuck | 4 | - | 6.088 s | 4, at once | PASS |
| F3 heavy | NEW `-WaitSec 30`, window closed ~4 s after the press | bb-atk-heavy | 4 | - | 5.598 s | 4, at once | PASS |
| F3 control | builder | bb-atk-heavy, closed the same way | 4 | - | 30.028 s | (verifier: 1) | see F3 |
| F3 control | builder | bb-standin-stuck, closed the same way | 4 | - | 30.010 s | (verifier: 1) | see F3 |

Compare F1: the verifier's runs of the builder's script on the same two pages ended at 23.099 s and 21.330 s.

Cleanup: every window a run left open was closed by the handle the script printed after the class check
(`closed: True`; exit-0 windows `already gone`); F3 windows were closed by me mid-run the same way, by the printed
handle. Servers 4328 and 34184 stopped by PID after a command-line check; no listener on 8093/8094 after. Nothing
temporary in the repo.

## 3. Per finding

**F1 - fixed.** Evidence: heavy page at `-WaitSec 20`: `bound of 20 s reached at 20.0 s ... not scanned (less than
5.0 s left before the bound) (polls: 6; scans: 4; skipped near the bound: 1; worst single scan 3875 ms)`, 20.001 s
from the press (was 23.099 s). Heavy churn: `not scanned (less than 5.4 s left before the bound) (polls: 5;
scans: 3; skipped near the bound: 1; worst single scan 5424 ms)` - the margin followed the worst scan (5 424 ms >
5 s) - 20.008 s from the press (was 21.330 s). Legs 2-3 (off the host, nothing scanned) unchanged at 90.0 s. The
bound remains "by construction as far as a synchronous UIA call allows": a single scan longer than its start
margin + 5 s would still overrun; a real Blackboard page's scan time is unmeasured (G10-3).

**F2 - fixed** by the `break` after the scan; by reading (an exit 0 inside the last 5 s cannot occur at all now,
since no scan starts there, so no run can reach the post-scan check past the deadline unless one scan exceeds its
margin; not produced live).

**F3 - fixed; premise partly disputed.** The verifier's "exit 1" (by reading) was not reproduced: the builder's
script with its window closed mid-poll ended in **exit 4 at the bound (30.0 s)**, not exit 1, on both pages - the
heavy page's two scans had finished before the close, and afterwards `Get-Addr` (already catching) read empty, so
the loop just ran on (`host: address bar unreadable ... not scanned (off the blackboard host)`) and printed
`window <H> left open` for a window that no longer existed. That wrong line and the useless wait are what the fix
removes: the new script ends **at once with exit 4** (`after submit: own window 3475248 is gone (closed outside the
script) at 6.1 s from the press (polls: 7; scans: 0)` / `WAITS FOR THE USER - the own window is gone; nothing more
pressed`; heavy page: `at 5.6 s ... (polls: 3; scans: 2)`). Whether a scan *throws* on a vanishing window was not
produced in my two trials (the close did not land inside a scan, or the scan did not throw); the `try`/`catch`
around `Get-Scan` covers that path by reading.

**F4 - fixed** (`-cne` at both comparisons in `Finish-AfterPress`); by reading - a case-only address change was not
produced live.

**F5 - fixed.** The known-good leg now leaves one countable line: `GET /bb-standin.html?signedin=1&t=1792883447070
HTTP/1.1" 200`, exit 0, 4.162 s from the press, `scans: 5` as before.

## 4. Proposed decisions

None new. Note for the step agent: the header's bound sentence now promises "<= 95 s whenever one scan takes
<= 10 s"; the first G10-3 live run should record the worst single scan on the real Blackboard page.

## Appendix: verbatim outputs (NEW script unless named)

### leg1-old (09fa604)
```
2026-10-24T23:06:22.533Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:06:23.175Z bb-login: own window 2952404 opened
2026-10-24T23:06:28.733Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:06:28.735Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:06:28.773Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:06:41.991Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): no; sign-in buttons: 0 (document: yes; scans: 7)
2026-10-24T23:06:41.991Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control (still on the SSO page, MFA, a picker, an error or a second step); nothing more pressed; window 2952404 left open
```
### leg1-new
```
2026-10-24T23:06:45.957Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:06:46.454Z bb-login: own window 6686090 opened
2026-10-24T23:06:51.736Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:06:51.738Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:06:51.757Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:07:08.034Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 1; address stable 4.1 s; 16.3 s from the press (polls: 17; scans: 5; worst single scan 12 ms)
2026-10-24T23:07:08.034Z bb-login: SIGNED IN - SSO autofill + one submit; own window 6686090 closed
```
### leg2-new
```
2026-10-24T23:07:15.257Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:07:15.769Z bb-login: own window 3736048 opened
2026-10-24T23:07:21.070Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:07:21.072Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:07:21.091Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:08:51.106Z bb-login: after submit: bound of 90 s reached at 90.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: stand-in SSO host (localhost); address stable 90.0 s; not scanned (off the blackboard host) (polls: 90; scans: 0; skipped near the bound: 0; worst single scan n/a)
2026-10-24T23:08:51.106Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 90 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 3736048 left open
```
### leg3-new
```
2026-10-24T23:08:55.473Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:08:55.972Z bb-login: own window 4132050 opened
2026-10-24T23:09:01.257Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:09:01.259Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:09:01.277Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:10:31.290Z bb-login: after submit: bound of 90 s reached at 90.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: other host; address stable 90.0 s; not scanned (off the blackboard host) (polls: 90; scans: 0; skipped near the bound: 0; worst single scan n/a)
2026-10-24T23:10:31.292Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 90 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 4132050 left open
```
### reg-bb-standin
```
2026-10-24T23:10:41.261Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:10:41.756Z bb-login: own window 2950960 opened
2026-10-24T23:10:47.052Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:10:47.052Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:10:47.070Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:10:51.232Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 1; address stable 4.1 s; 4.1 s from the press (polls: 5; scans: 5; worst single scan 12 ms)
2026-10-24T23:10:51.232Z bb-login: SIGNED IN - SSO autofill + one submit; own window 2950960 closed
```
### reg-bb-standin-bad
```
2026-10-24T23:10:54.084Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:10:54.601Z bb-login: own window 4394194 opened
2026-10-24T23:10:59.900Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:10:59.902Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 2 (scans: 2)
2026-10-24T23:10:59.902Z bb-login: WAITS FOR THE USER - 2 allowlisted submit buttons on the SSO page (1 needed: a picker, MFA, empty autofill or an unknown form); nothing pressed; window 4394194 left open
```
### reg-bb-standin-otherhost
```
2026-10-24T23:11:03.810Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:11:04.303Z bb-login: own window 1049404 opened
2026-10-24T23:11:09.611Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: no; host under ada.edu.az: no; host: other host; https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:11:09.613Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:11:09.613Z bb-login: WAITS FOR THE USER - off the blackboard stand-in (127.0.0.1) on a page that is not the SSO page (other host: the host must be on the SSO host allowlist and not read as http); nothing pressed; window 1049404 left open
```
### atk-heavy (-WaitSec 20)
```
2026-10-24T23:11:13.630Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8094); no real site is contacted
2026-10-24T23:11:14.138Z bb-login: own window 7275914 opened
2026-10-24T23:11:19.423Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:11:19.425Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:11:19.446Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:11:39.447Z bb-login: after submit: bound of 20 s reached at 20.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): yes; host: 127.0.0.1; address stable 18.9 s; not scanned (less than 5.0 s left before the bound) (polls: 6; scans: 4; skipped near the bound: 1; worst single scan 3875 ms)
2026-10-24T23:11:39.447Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 7275914 left open
```
### atk-heavychurn (-WaitSec 20)
```
2026-10-24T23:11:43.470Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8094); no real site is contacted
2026-10-24T23:11:43.968Z bb-login: own window 4721874 opened
2026-10-24T23:11:49.261Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:11:49.263Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:11:49.283Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:12:09.291Z bb-login: after submit: bound of 20 s reached at 20.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): yes; host: 127.0.0.1; address stable 18.7 s; not scanned (less than 5.4 s left before the bound) (polls: 5; scans: 3; skipped near the bound: 1; worst single scan 5424 ms)
2026-10-24T23:12:09.291Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 4721874 left open
```
### f3-stuck (-WaitSec 30; WM_CLOSE sent 23:12:33.135Z)
```
2026-10-24T23:12:21.921Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:12:22.424Z bb-login: own window 3475248 opened
2026-10-24T23:12:27.772Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:12:27.774Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:12:27.795Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:12:33.883Z bb-login: after submit: own window 3475248 is gone (closed outside the script) at 6.1 s from the press (polls: 7; scans: 0)
2026-10-24T23:12:33.885Z bb-login: WAITS FOR THE USER - the own window is gone; nothing more pressed
```
### f3-heavy (-WaitSec 30; WM_CLOSE sent 23:12:45.824Z)
```
2026-10-24T23:12:35.667Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8094); no real site is contacted
2026-10-24T23:12:36.173Z bb-login: own window 1508156 opened
2026-10-24T23:12:41.455Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:12:41.455Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:12:41.476Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:12:47.074Z bb-login: after submit: own window 1508156 is gone (closed outside the script) at 5.6 s from the press (polls: 3; scans: 2)
2026-10-24T23:12:47.074Z bb-login: WAITS FOR THE USER - the own window is gone; nothing more pressed
```
### f3-heavy, builder's script (control; WM_CLOSE sent 23:13:10.027Z)
```
2026-10-24T23:12:59.867Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8094); no real site is contacted
2026-10-24T23:13:00.355Z bb-login: own window 1639228 opened
2026-10-24T23:13:05.650Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:13:05.652Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:13:05.671Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:13:35.698Z bb-login: after submit: bound of 30 s reached at 30.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: address bar unreadable; address stable 24.3 s; not scanned (off the blackboard host) (polls: 27; scans: 2; worst single scan 3651 ms)
2026-10-24T23:13:35.699Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 30 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 1639228 left open
```
### f3-stuck, builder's script (control; WM_CLOSE sent 23:13:47.415Z)
```
2026-10-24T23:13:36.276Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8093); no real site is contacted
2026-10-24T23:13:36.774Z bb-login: own window 7865738 opened
2026-10-24T23:13:42.052Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T23:13:42.054Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T23:13:42.072Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T23:14:12.082Z bb-login: after submit: bound of 30 s reached at 30.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: address bar unreadable; address stable 23.9 s; not scanned (off the blackboard host) (polls: 30; scans: 0; worst single scan n/a)
2026-10-24T23:14:12.082Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 30 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 7865738 left open
```
