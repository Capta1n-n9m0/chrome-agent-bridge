# S5 builder report: `bb-login.ps1`'s condition-based post-submit wait

Builder, Step 10 stage S5, 2026-10-25 (Claude Opus 5.5). Base: `09fa604`; HEAD moved to `2479301` (S2 and S6
committed by the step agent) while this stage ran. Nothing committed by the builder. Dry runs only (`-DryRunBase`,
loopback fixtures); G10-3 not touched: no real site, no credential.

## 1. Built

- `recipes/bb-login.ps1` (modified, still ASCII, parses clean under PS 5.1):
  - new parameter `-WaitSec` (default 90), appended after the existing ones (all old parameters kept);
  - `Invoke-Once`: `$script:PressSw = [Diagnostics.Stopwatch]::StartNew()` immediately before `$pat.Invoke()`
    (one added line; the at-most-one-press backstop unchanged);
  - `Finish-AfterPress` body replaced: a poll loop inside one deadline (press + WaitSec) that covers every scan
    and sleep. Each step checks the deadline first, reads the address bar, and only on the Blackboard host runs
    ONE `Get-Scan` (checked against the deadline again before starting). It never calls `Invoke-Once`. Exit 0
    when: host = `$BbHost`, address unchanged >= 4 s, and two consecutive scans (~1 s apart, both after the last
    address change; an address change during a scan resets the count) found the document with >= 1 control and
    0 `$BbSignIn` matches. At the deadline: exit 4 whatever the page, window left open; the line prints the time
    from the press, the last poll (on-Bb yes/no, the host only if Bb or SSO-allowlisted else `other host` /
    `address bar unreadable`, address-stable time, document/control/sign-in counts or `not scanned`), the poll
    count, the scan count and the worst single scan. The exit-0 line prints the time from the press too.
  - helpers added: `Get-AddrHost` (host only, no `Not secure` chip walk), `Show-Host` (the printing rule),
    `Sec` (ms -> `N.N s`, invariant culture);
  - header: dated note at the top, the two usage lines gain `[-WaitSec 90]`, step 6 rewritten with a
    `*Changed 2026-10-25 (Step 10 S5): was ..., because ...*` note, the dry-run paragraph lists the three new legs
    and their counter paths.
  - Everything before the press is byte-identical (checked: the only removed lines in `git diff` are the two
    usage lines, the step-6 text, the dry-run paragraph's last line, the `param(...)` line and the old
    `Finish-AfterPress` body). `Wait-Settled`, `Get-StableScan`, `Get-Where` are unchanged and still used before
    the press.
- `recipes/fixtures/` (8 new files, ASCII, header comments as the existing ones):
  - leg 1: `bb-standin-delayed.html` -> `sso-standin-delayed.html` (localhost; one "Sign in") -> its click opens
    `sso-submit-delayed.html?t=<now>` (counter: `GET /sso-submit-delayed.html`), which `location.replace`s to
    `http://127.0.0.1:<port>/bb-standin.html?signedin=1` 12 000 ms after its `load`;
  - leg 2: `bb-standin-stuck.html` -> `sso-standin-stuck.html` (one "Sign in"; a click updates the heading and
    fetches `/submit-stuck?t=<now>`, a 404 - the counter; the page and its button stay);
  - leg 3: `bb-standin-elsewhere.html` -> `sso-standin-elsewhere.html` (one "Sign in") -> its click opens
    `http://sso.localhost:<port>/elsewhere-landing.html?t=<now>` (counter: `GET /elsewhere-landing.html`; one
    plain "Open dashboard" button, no redirect).
  - The `?t=<now>` query keeps Chrome's cache from answering a counter request (see §4 for why that matters).

## 2. Dry-run outputs (verbatim)

Server: `python -I -m http.server 8090 --bind 127.0.0.1 --directory recipes/fixtures`, PID 29524, stderr to the
scratchpad (`netstat` showed 8090 free before; only `127.0.0.1:8090` LISTENING by 29524 after). Scripts run from
Git Bash as `powershell -NoProfile -ExecutionPolicy Bypass -File <script> -DryRunBase http://127.0.0.1:8090/
-DryRunPage <page>`, stdout+stderr to a file. Server-log lines are local time (UTC+4); script lines UTC.

### Leg 1 OLD (`git show 09fa604:recipes/bb-login.ps1` in the scratchpad), `bb-standin-delayed.html` - exit 4

```
2026-10-24T22:28:52.059Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:28:52.557Z bb-login: own window 1314002 opened
2026-10-24T22:28:57.866Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:28:57.867Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:28:57.885Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:29:11.081Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): no; sign-in buttons: 0 (document: yes; scans: 7)
2026-10-24T22:29:11.081Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control (still on the SSO page, MFA, a picker, an error or a second step); nothing more pressed; window 1314002 left open
```
Server: `"GET /sso-submit-delayed.html?t=1792880937886 HTTP/1.1" 200` at 02:28:57 (1 line), then the redirect back
`"GET /bb-standin.html?signedin=1 HTTP/1.1" 200` at 02:29:09 - after the old script had read the host. Window
1314002 closed by WM_CLOSE (`closed: True`).

### Leg 1 NEW, first attempt - exit 1 (script error, a bug of mine; fixed)

```
2026-10-24T22:29:24.845Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:29:25.339Z bb-login: own window 17501574 opened
2026-10-24T22:29:30.622Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:29:30.622Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:29:30.644Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
Cannot convert the "127.0.0.1" value of type "System.String" to type "System.IntPtr".
At C:\Users\aliev\Projects\chrome-remote-extention\recipes\bb-login.ps1:251 char:22
+ ... Close-Own { [void][LoginWin]::PostMessage([IntPtr]$H, 0x0010, [IntPtr ...
+                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : ConvertToFinalInvalidCastException
```
Cause: PowerShell variable names are case-insensitive; my local `$h` (the host) in `Finish-AfterPress` hid the
script's window handle `$H` from `Close-Own` (dynamic scope). The condition itself had been met (it reached the
exit-0 branch). Fixed by naming it `$hn` (comment in the script). Submit lines: 1 (`?t=1792880970644`). Window
17501574 closed by WM_CLOSE (`closed: True`).

### Leg 1 NEW, `bb-standin-delayed.html` - exit 0 (run after the fix; the print had no `scans:` field yet)

```
2026-10-24T22:30:14.166Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:30:14.684Z bb-login: own window 593110 opened
2026-10-24T22:30:19.995Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:30:19.997Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:30:20.015Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:30:36.264Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 1; address stable 4.1 s; 16.2 s from the press (polls: 17; worst single scan 17 ms)
2026-10-24T22:30:36.266Z bb-login: SIGNED IN - SSO autofill + one submit; own window 593110 closed
```
Submit lines: 1. Window check afterwards: `window 593110 already gone`.

### Leg 1 NEW, final code - exit 0

```
2026-10-24T22:35:00.080Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:35:00.575Z bb-login: own window 1704436 opened
2026-10-24T22:35:05.841Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:35:05.841Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:35:05.860Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:35:22.097Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 1; address stable 4.1 s; 16.2 s from the press (polls: 17; scans: 5; worst single scan 16 ms)
2026-10-24T22:35:22.097Z bb-login: SIGNED IN - SSO autofill + one submit; own window 1704436 closed
```
Submit lines: 1 (`?t=1792881305861`). `window 1704436 already gone`.

### Leg 2 NEW, `bb-standin-stuck.html` - exit 4 (first run, before the print change)

```
2026-10-24T22:30:43.137Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:30:43.622Z bb-login: own window 1707218 opened
2026-10-24T22:30:48.901Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:30:48.902Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:30:48.922Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:32:18.943Z bb-login: after submit: bound of 90 s reached at 90.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: stand-in SSO host (localhost); address stable 90.0 s; not scanned (off the blackboard host) (polls: 90; worst single scan 0 ms)
2026-10-24T22:32:18.943Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 90 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 1707218 left open
```
Submit lines: 1 (`GET /submit-stuck?t=1792881048922` 404). Window 1707218 closed by WM_CLOSE (`closed: True`).
"worst single scan 0 ms" with no scan read as a claim, so the print gained `scans: N` and `n/a` (the final run
below and leg 3 carry it).

### Leg 2 NEW, final code - exit 4

```
2026-10-24T22:35:23.340Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:35:23.825Z bb-login: own window 2033512 opened
2026-10-24T22:35:29.094Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:35:29.096Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:35:29.114Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:36:59.136Z bb-login: after submit: bound of 90 s reached at 90.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: stand-in SSO host (localhost); address stable 90.0 s; not scanned (off the blackboard host) (polls: 90; scans: 0; worst single scan n/a)
2026-10-24T22:36:59.136Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 90 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 2033512 left open
```
Submit lines: 1 (`?t=1792881329115`). Window 2033512 closed by WM_CLOSE (`closed: True`).

### Leg 3 NEW, `bb-standin-elsewhere.html` - exit 4 (final code)

```
2026-10-24T22:32:39.276Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:32:39.756Z bb-login: own window 1049072 opened
2026-10-24T22:32:45.037Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:32:45.039Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:32:45.056Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:34:15.069Z bb-login: after submit: bound of 90 s reached at 90.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: other host; address stable 89.0 s; not scanned (off the blackboard host) (polls: 90; scans: 0; worst single scan n/a)
2026-10-24T22:34:15.069Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 90 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 1049072 left open
```
Submit lines: 1 (`GET /elsewhere-landing.html?t=1792881165057` 200). Exit 4 came at the bound, not before (no
early exit on "other host"). Window 1049072 closed by WM_CLOSE (`closed: True`).

### Regressions NEW (final code)

`bb-standin.html` - exit 0:
```
2026-10-24T22:34:23.750Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:34:24.242Z bb-login: own window 1509224 opened
2026-10-24T22:34:29.520Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:34:29.522Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:34:29.541Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:34:33.676Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 1; address stable 4.1 s; 4.1 s from the press (polls: 5; scans: 5; worst single scan 18 ms)
2026-10-24T22:34:33.676Z bb-login: SIGNED IN - SSO autofill + one submit; own window 1509224 closed
```
Submit lines: **0 in the server log** - the existing fixture's submit target `bb-standin.html?signedin=1` was
answered from Chrome's cache (it had been fetched once, in leg 1 OLD). This fixture has no cache-proof counter;
submit = 1 rests on the script's single `invoked` line only. `window 1509224 already gone`.

`bb-standin-bad.html` - exit 4, nothing pressed (no `invoked` line):
```
2026-10-24T22:34:34.903Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:34:35.391Z bb-login: own window 1442292 opened
2026-10-24T22:34:40.669Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:34:40.671Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 2 (scans: 2)
2026-10-24T22:34:40.671Z bb-login: WAITS FOR THE USER - 2 allowlisted submit buttons on the SSO page (1 needed: a picker, MFA, empty autofill or an unknown form); nothing pressed; window 1442292 left open
```
(`sso-standin-two.html` makes no request on a press; the evidence is the absent `invoked` line.) Window 1442292
closed (`closed: True`).

`bb-standin-otherhost.html` - exit 4, nothing pressed:
```
2026-10-24T22:34:43.447Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8090); no real site is contacted
2026-10-24T22:34:43.942Z bb-login: own window 1442288 opened
2026-10-24T22:34:49.230Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: no; host under ada.edu.az: no; host: other host; https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:34:49.230Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:34:49.230Z bb-login: WAITS FOR THE USER - off the blackboard stand-in (127.0.0.1) on a page that is not the SSO page (other host: the host must be on the SSO host allowlist and not read as http); nothing pressed; window 1442288 left open
```
`/pressed-otherhost` lines: 0. Window 1442288 closed (`closed: True`).

## 3. Submit counts and times from the press

Counted over the whole server log at the end (`grep -cF "GET /<path>"`): `/sso-submit-delayed.html` 4 = 4 runs on
the delayed fixture (old, new attempt 1, new, new final), one each by timestamp/`t=`; `/submit-stuck` 2 = 2 stuck
runs, one each; `/elsewhere-landing.html` 1 = 1 run; `/pressed-otherhost` 0; `bb-standin.html?signedin` 1 (the
redirect back in leg 1 OLD; later loads came from the cache).

| Leg | Script | Exit | Submits (server log) | From the press to the last line |
|---|---|---|---|---|
| 1 delayed | OLD (09fa604) | 4 | 1 | 13.2 s (22:28:57.885 -> 22:29:11.081) |
| 1 delayed | NEW attempt 1 | 1 (bug, fixed) | 1 | - |
| 1 delayed | NEW | 0 | 1 | 16.2 s |
| 1 delayed | NEW final | 0 | 1 | 16.2 s |
| 2 stuck | NEW | 4 | 1 | 90.0 s |
| 2 stuck | NEW final | 4 | 1 | 90.0 s |
| 3 elsewhere | NEW final | 4 | 1 | 90.0 s |
| reg. bb-standin | NEW final | 0 | 0 in log (cache), 1 `invoked` line | 4.1 s |
| reg. bad | NEW final | 4 | no press | - |
| reg. otherhost | NEW final | 4 | 0 `/pressed-otherhost` | - |

Worst single scan seen: 18 ms (on the 1-button stand-in page; a real Blackboard page will be larger - not measured).
Exit 4 came at 90.0 s both times (<= 95 s); the overshoot past the bound was < 30 ms.

## 4. typecheck / test / build

```
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit=0
 Test Files  117 passed (117)
      Tests  2807 passed (2807)
built mcp -> dist/index.js
built extension -> dist/
build exit=0
```
2807 / 117 is the tree at `2479301` (S2 committed meanwhile, its tests included) plus this stage, which changes no
TypeScript. `git status --porcelain` after the build: ` M recipes/bb-login.ps1`, the 8 new fixtures, and
untracked step-agent files (`S3.ledger.md`, `S5.ledger.md`, `briefs/S3-builder.md`, `briefs/S5-builder.md`) that
are not mine; no other tracked change.

## 5. Deviations

1. A first NEW run on leg 1 exited 1 (script error: `$h` hid `$H`; see §2). Fixed and re-run; reported, not
   hidden. The old-first order held (OLD ran first and exited 4).
2. After legs 1-2 the final line gained `scans: N` and `worst single scan n/a` when nothing was scanned (print
   only). Legs 1 and 2 were re-run on the final code; both runs of each are reported.
3. The regression `bb-standin.html` cannot show its submit in the server log (cached target); I did not change the
   existing fixture (outside "regressions use the existing"). Proposed below.
4. The brief's "two consecutive scans ~1 s apart": scans run on every poll step on the Bb host, so with a 4 s
   stability rule the exit comes at the first poll where >= 2 clean scans exist AND >= 4 s stability (in practice
   4-5 clean scans, `scans: 5`).

## 6. Proposed decisions

- **2026-10-25 · bb-login's "no sign-in control" needs the document, >= 1 control and two clean scans**
  Decided: exit 0 only when the Blackboard host shows, on two consecutive single scans after the last address
  change, a document with at least one Edit/Button control and no sign-in button, with the address unchanged 4 s.
  Why: Chrome builds a page's accessibility tree lazily (the S6 r3 hypothesis), so an empty scan would read as
  "no sign-in control". Instead of: one scan with 0 matches (the old reading; can pass on an empty tree), or a
  `Get-StableScan` (can run up to `-ScanSec` past the bound, F10). Revisit if: a real logged-in Blackboard page
  ever shows 0 Edit/Button controls in the document (the script would then wait to the bound and exit 4).
- **2026-10-25 · The post-press poll reads the host without the "Not secure" chip**
  Decided: `Get-AddrHost` parses the address bar for the host only; the https backstop is not applied after the
  press. Why: after the press nothing is pressed again, so the veto has nothing to veto, and the chip lookup walks
  the whole window each poll. Instead of: reusing `Get-Where` per poll. Revisit if: an exit-0 decision ever needs
  the scheme.
- **2026-10-25 · Counter requests carry a fresh query** - Decided: every new fixture's counted request has
  `?t=<Date.now()>`. Why: Chrome answered a repeated `bb-standin.html?signedin=1` from its cache (§2), so a plain
  path can under-count. Instead of: plain paths, or a no-cache server. Revisit if: never (fixture detail).
- **2026-10-25 · Leave `bb-standin.html`'s regression without a server-log counter** - Decided: not changed in
  S5. Alternative: point `sso-standin.html`'s click at `bb-standin.html?signedin=1&t=<now>` (one-line change; the
  pattern `[?&]signedin=1(&|$)` still matches). Recommend S8 or the verifier decide; it would make the old
  known-good leg countable.

## 7. README text proposal for S8 (`recipes/README.md`, the `bb-login.ps1` row)

> `bb-login.ps1` - the Blackboard login step (Windows PowerShell 5.1): opens one window of its own, presses at
> most one autofilled submit, then polls up to `-WaitSec` (default 90) from the press until it is back on
> Blackboard with no sign-in control and the address stable 4 s (exit 0, window closed); else exit 4 at the bound,
> window left open, nothing more pressed. Dry runs: `-DryRunBase http://127.0.0.1:<port>/ -DryRunPage <page>` on
> `recipes/fixtures/` (`bb-standin.html` good, `-bad`, `-otherhost`, and since Step 10 S5 `-delayed` (exit 0 after
> a 12 s redirect), `-stuck` and `-elsewhere` (exit 4 at the bound)).

## 8. Left unfinished / cleanup

- Nothing unfinished in the lane. A run on the real site needs G10-3 (not run).
- Cleanup done: every window the script left open was closed by its printed handle (WM_CLOSE, Chrome-class
  checked first); exit-0 windows were already gone. Python server PID 29524 (checked: `python.exe`, command line
  `http.server 8090`) stopped; 8090 no longer listening. The old script copy, the close helper and the logs are in
  the scratchpad (`...\scratchpad\s5\`), nothing temporary in the repo. No bridge port, daemon or extension used.
