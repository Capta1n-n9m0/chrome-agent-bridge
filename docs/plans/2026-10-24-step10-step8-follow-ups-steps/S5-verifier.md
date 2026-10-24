# S5 verifier report: `bb-login.ps1`'s condition-based post-submit wait

Independent verifier, Step 10 stage S5, 2026-10-25 (Claude Opus 5.5). Audited: `briefs/S5-builder.md`, the builder
report `S5-builder.md` (read as claims), the uncommitted `recipes/bb-login.ps1` and the 8 new files in
`recipes/fixtures/`. Base for "old": `git show 09fa604:recipes/bb-login.ps1`; `git diff --quiet 09fa604 HEAD --
recipes/bb-login.ps1` is clean, so 09fa604's copy is HEAD's copy. Dry runs only (`-DryRunBase` on 127.0.0.1); G10-3
not touched: no real site, no credential, no bridge port, no daemon, no extension.

**Verdict: PASS-with-notes** (S5.1 holds on all three legs; one MINOR, four NIT findings).

## 1. Set-up

- Server A: `python -I -m http.server 8091 --bind 127.0.0.1 --directory recipes/fixtures`, PID 29692 (checked by
  command line), stderr to the scratchpad. 8091 and 8092 were free before (no listener).
- Server B (attacks only): the same on 8092 over a scratchpad directory of my own attack pages (§3), PID 16376.
- Each run: `powershell -NoProfile -ExecutionPolicy Bypass -File <script> -DryRunBase http://127.0.0.1:<port>/
  -DryRunPage <page> [-WaitSec N]` from Git Bash, stdout+stderr to a UTF-8 file. Time from the press is computed by
  me from the `invoked ...` line's timestamp to the last line's timestamp. Submits are counted from my server's log
  (lines of the leg's counter path, after the leg's start offset). After each run the window handle printed by the
  script was checked for class `Chrome_WidgetWin_1` and closed by `WM_CLOSE` if still there.
- Old script copied to the scratchpad (outside the repo).

## 2. Per-leg table (my runs)

| Leg | Script | Page | Exit | Submits (my server log) | Press -> last line (mine) | Expected | Result |
|---|---|---|---|---|---|---|---|
| 1 | OLD 09fa604 (run first) | bb-standin-delayed | 4 | 1 (`/sso-submit-delayed.html?t=1792881726698`) | 13.217 s | 4 | PASS |
| 1 | NEW | bb-standin-delayed | 0 | 1 (`?t=1792881753042`) | 16.229 s | 0 | PASS |
| 2 | NEW | bb-standin-stuck | 4 | 1 (`/submit-stuck?t=1792881780982`) | 90.011 s | 4, 90-95 s | PASS |
| 2b | NEW `-WaitSec 20` | bb-standin-stuck | 4 | 1 (`?t=1792881884625`) | 20.002 s | bound follows the parameter | PASS |
| 3 | NEW | bb-standin-elsewhere | 4 | 1 (`/elsewhere-landing.html?t=1792881913343`) | 90.028 s | 4 at the bound, not before | PASS |
| reg | NEW | bb-standin | 0 | 0 in log (target cached by Chrome), 1 `invoked` line | 4.155 s | 0 | PASS (see F5) |
| reg | NEW | bb-standin-bad | 4 | no `invoked` line (nothing pressed) | - | 4, nothing pressed | PASS |
| reg | NEW | bb-standin-otherhost | 4 | no `invoked` line; 0 `/pressed-otherhost` | - | 4, nothing pressed | PASS |

Whole-log totals on server A: `/sso-submit-delayed.html` 2 (old + new), `/submit-stuck` 2 (legs 2, 2b),
`/elsewhere-landing.html` 1, `/pressed-otherhost` 0. In leg 1 the redirect back (`GET /bb-standin.html?signedin=1`)
reached the server at 02:42:18 local for a submit at 02:42:06 (1 s log resolution), i.e. the 12 s delay; the OLD
script read the address about 7.5 s after the press (3 s sleep + a 4 s settle on `sso-submit-delayed.html`) and
decided at 13.2 s, so the old/new pair discriminates with a margin of several seconds, not by a hair.

My numbers reproduce the builder's (old 13.2 s / exit 4; new 16.2 s / exit 0, 17 polls, 5 scans; legs 2 and 3 at
90.0 s, 90 polls, 0 scans; regressions 0 / 4 / 4). The builder's claims in §2-§3 of `S5-builder.md` hold.

**S5.1:** (1) old 4, new 0 on the delayed fixture, old run first: met. (2) stuck on the SSO stand-in: exit 4 at
90.011 s from the press (<= 95 s), one submit, the "Sign in" button still on the page and never pressed again: met.
(3) another host: exit 4 at 90.028 s, at the bound and not before (`polls: 90`), one submit: met.

## 3. Attacks

### 3.1 By experiment (scratchpad pages on server B, `-WaitSec 20`; each SSO stand-in has one allowlisted "Sign in")

| Attack | Landing after the one press | Exit | Press -> last | Polls / scans / worst scan | Pressed again? |
|---|---|---|---|---|---|
| bounce | Bb host (one plain button) for 2.5 s, then `location.replace` to `sso.localhost` | 4 | 20.008 s | 20 / 2 / 11 ms | n/a |
| sign-in on Bb | Bb host page whose only button is "Sign in" (click -> `GET /pressed-again`) | 4 | 20.025 s | 20 / 19 / 12 ms | no: 0 `/pressed-again` lines |
| empty | Bb host page with no control | 4 | 20.019 s | 20 / 19 / 14 ms (`controls: 0`) | n/a |
| churn | Bb host, 400 buttons + 400 inputs rebuilt every 20 ms | 0 | 5.812 s | 5 / 4 / 482 ms | n/a (no crash) |
| heavy | Bb host, "Sign in" + 8 000 buttons | 4 | **23.099 s** | 6 / 5 / **3 759 ms** | no: 0 `/pressed-again` |
| heavy churn | Bb host, "Sign in" + 3 000 buttons rebuilt every 20 ms | 4 | **21.330 s** | 5 / 4 / **4 249 ms** | n/a |

So: a page that reaches the Blackboard host and leaves again inside 4 s does not exit 0; a sign-in control on the
Blackboard host is never pressed (the script's only `Invoke-Once` calls are at `:341` and `:365`, before
`Finish-AfterPress`; nothing in `Finish-AfterPress` (`:297-331`) calls it, and the `$script:Pressed` backstop at
`:259` is unchanged); an empty document does not exit 0 (`controls: 0`); a fast-mutating DOM did not crash a scan
under `$ErrorActionPreference = 'Stop'`. The two heavy pages show the bound is not hard (F1).

### 3.2 By reading

- **Bound.** The loop checks the deadline before each poll (`:302`) and again before the scan (`:308`); the sleep is
  `min(1000, left)` (`:324`). Nothing else waits. The one unbounded step is a `Get-Scan` (`:310`, UIA `FindAll` over
  the document + a name read per button) started just before the deadline: the exit then comes one scan late (F1).
  The address read (`Get-Addr`, a ValuePattern read) is not measurable at this scale. Exit 0 is also not re-checked
  against the deadline after a scan (F2).
- **Exit 0 conditions** (`:305-320`): the address non-empty and on `$BbHost`, two consecutive clean scans
  (`Doc` and `Edits+Buttons > 0` and 0 `$BbSignIn` matches), both after the last address change (`$clean` reset on a
  change at `:305`, and when the address moved during the scan at `:313`), and `>= 4000 ms` since the last change.
  Off the host, with a sign-in control, with an empty document or with the address changing, `$clean` is 0 and no
  exit 0 is reachable. Confirmed by the bounce / sign-in / empty attacks and legs 2-3.
- **Diff before the press.** `git diff -- recipes/bb-login.ps1` has exactly these hunks: the header (a dated note,
  `[-WaitSec 90]` on both usage lines, step 6 rewritten with a `*Changed 2026-10-25 ...*` note, the dry-run paragraph),
  the `param(...)` line (`[int]$WaitSec = 90` appended last, so positional use is unchanged), the one stopwatch line
  in `Invoke-Once` (`:270`, just before `$pat.Invoke()`), and the `Finish-AfterPress` block with three helpers before
  it (`Get-AddrHost`, `Show-Host`, `Sec`). Nothing else changed. All old parameters are kept; `-SettleSec`/`-ScanSec`
  still govern the pre-press wait and scans (they no longer act after the press, as the header says). Exit codes keep
  their meanings (0 / 2 / 4 / 1). No caller parses the output: `grep -rn bb-login` finds only `recipes/README.md`
  outside the script, and the `blackboard-ultra` skill directory has no reference to it.
- **Printing rules.** The new lines print counts, yes/no, times, the poll/scan counts, and the host through
  `Show-Host` only: `$BbHost`, an SSO-allowlisted host (`stand-in SSO host (...)` in a dry run), else `other host` /
  `address bar unreadable`. No URL, path, title, field or control name. Seen in every output in the appendix (the
  only hosts printed are `127.0.0.1` and `localhost`).
- **PowerShell 5.1 traps.** File bytes: 26 338, 0 bytes > 0x7F, no BOM, LF endings (as at HEAD: 0 CR in both).
  Case-insensitive names: the locals of `Finish-AfterPress` (`kind sw deadline polls clean lastAddr since worstScan
  scans seen a hn t s dt el left scanText`) do not collide with any script-scope name its callees read (`$omni`,
  `$root`, `$docCond`, `$editCond`, `$btnCond`, `$H`, `$BbHost`, `$BbLabel`, `$BbSignIn`, `$SsoExact`, `$SsoSuffix`,
  `$Dry`, `$WaitSec`); the builder's `$h`/`$H` collision is gone (`$hn`). `Get-AddrHost`'s `$s`/`$u` are its own
  locals. Numbers: `Sec` formats with `InvariantCulture`; the other numbers are integers. `Stop` paths: `[Uri]` cast in
  a `try`; `Get-Addr` in a `try`; `Get-Doc`/`FindAll` are not wrapped (F3).
- **Fixtures.** Each new SSO stand-in has two buttons, "Forgot password?" and "Sign in" - exactly one on the
  allowlist; `sso-submit-delayed.html` has no control, `elsewhere-landing.html` one plain "Open dashboard". Counter
  paths (`/sso-submit-delayed.html`, `/submit-stuck`, `/elsewhere-landing.html`) are requested only by the matching
  button's click (other fixtures name them in comments only); each click carries a fresh `?t=` so it cannot be
  served from cache; each run left exactly one counter line. The delay is `setTimeout(..., 12000)` after `load`
  (`sso-submit-delayed.html:20`). Hosts: only `127.0.0.1`, `localhost`, `sso.localhost` and `example.invalid`. All
  ASCII, LF, header comments as the existing fixtures.

## 4. typecheck / test / build

The main tree is not a clean base: stage S3 is in flight there (while I ran, it modified `extension/src`, `mcp/src`,
`sdk/src`, `shared/src` and added `s3-*.test.ts` files, some red by design; a main-tree `vitest run` gave `4 failed |
2980 passed (2984)` in 122 files, then other numbers on re-run). So I compared in a separate worktree at HEAD
`2479301`:

| Tree | `npm run typecheck` | `vitest run` | `npm run build` |
|---|---|---|---|
| worktree at HEAD, without S5 | exit 0 | 117 files, 2807 passed | - |
| same worktree + S5's 9 files copied in | exit 0 | 117 files, 2807 passed | exit 0 (`built extension -> dist/` last) |
| main tree, S3's test files excluded (`--exclude '**/s3-*.test.ts'`) | (S3 in flight) | 117 files, 2807 passed | not run (S3 in flight) |

Before == after: 117 / 2807, matching the builder's 2807 / 117. No test reads `recipes/fixtures/` or the script
(grep). After the worktree build, `git status --porcelain` there showed only ` M recipes/bb-login.ps1`, the 8 new
fixtures and my `tc.txt` log; no tracked change. I did not run `npm run build` in the main tree, so as not to build
S3's half-written sources under it. The worktree was removed (`git worktree list` shows only the main tree).

## 5. Findings

**F1 - MINOR - the 90 s bound is not a hard cap: one scan can run past it** (`recipes/bb-login.ps1:308-311`).
Evidence: `-WaitSec 20` on a Blackboard-host page with "Sign in" + 8 000 buttons: `bound of 20 s reached at 23.1 s
from the press ... (polls: 6; scans: 5; worst single scan 3759 ms)`; with 3 000 churning buttons `21.3 s ...
worst single scan 4249 ms`. The deadline check at `:308` is made before a scan whose length is not bounded, so the
worst case is WaitSec + one scan, and "<= 95 s with the default" holds only while one scan of the real page stays
under ~5 s. The builder's worst scan (16-23 ms) and "overshoot < 30 ms" are from one-button fixture pages; a real
Blackboard page's scan time is unmeasured (G10-3). Off the Blackboard host nothing is scanned, so legs 2-3 and the
SSO-stuck case are tight (90.0 s). Suggested fix: do not start a scan unless the time left exceeds a margin (e.g.
`max(5000, 2 * $worstScan)` ms), or state "WaitSec + one scan" in the header and measure one scan on the real page
when G10-3 is granted.

**F2 - NIT - exit 0 is not re-checked against the deadline after the scan** (`:316`). A clean scan that ends past the
deadline still exits 0 (late by at most that scan). Harmless in direction (it only accepts a page that met every
condition); mention it with F1 or add `$sw.ElapsedMilliseconds -lt $deadline + <margin>` if a hard bound is wanted.

**F3 - NIT - a window closed by the user mid-poll would end in exit 1, not exit 4** (`:211`, `:310`, by reading, not
run). `Get-Doc` (`$root.FindFirst`) and `FindAll` are not in a `try`, and `$ErrorActionPreference = 'Stop'`; an
`ElementNotAvailableException` on a vanished window ends the script as "script error". Nothing is pressed in that
case, and the pre-press scans had the same exposure; the post-press poll only lengthens the window (up to 90 s, and
on the Blackboard host only). Suggested fix: wrap the scan in `try { } catch { }` and treat a failure as an unclean
scan.

**F4 - NIT - address stability compares case-insensitively** (`:305`, `$a -ne $lastAddr`; PowerShell's `-ne` ignores
case). A change of the address in letter case only would not reset the 4 s window. Negligible in practice; `-cne`
would be exact.

**F5 - NIT - the `bb-standin.html` regression has no server-side submit counter** (existing fixture, not S5's):
its submit target `bb-standin.html?signedin=1` came from Chrome's cache in my run as in the builder's (no log line),
so submit = 1 rests on the single `invoked` line. I agree with the builder's proposed decision 4 (a fresh `&t=` on
`sso-standin.html`'s click) for S8.

No CRITICAL or MAJOR finding. Proposed decisions 1-3 of the builder report are consistent with what I measured (the
two-clean-scans rule held on churn and empty pages; `Get-AddrHost` without the chip walk is what keeps a poll cheap).

## 6. Cleanup

Every window my runs left open was closed by the handle the script printed (class `Chrome_WidgetWin_1` checked
first, `WM_CLOSE`, `closed: True`); exit-0 windows were already gone (`already gone`). Servers PID 29692 (8091) and
16376 (8092) stopped by PID after a command-line check; no listener on 8091/8092 after. The worktree was removed.
Old script, attack pages, close helper and logs are in my scratchpad only; nothing temporary in the repo. The only
repo file I wrote is this report.

## Appendix: verbatim outputs (my runs)

Each block is the script's own output (stdout+stderr), unedited; exit codes and the computed times are in the tables
of §2 and §3.1. Leg names: `leg*` and `reg-*` on server A (repo fixtures), `atk-*` on server B (scratchpad pages).

### leg1-old

```
2026-10-24T22:42:00.904Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:42:01.385Z bb-login: own window 2099048 opened
2026-10-24T22:42:06.680Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:42:06.680Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:42:06.698Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:42:19.913Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): no; sign-in buttons: 0 (document: yes; scans: 7)
2026-10-24T22:42:19.915Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control (still on the SSO page, MFA, a picker, an error or a second step); nothing more pressed; window 2099048 left open
```

### leg1-new

```
2026-10-24T22:42:27.243Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:42:27.733Z bb-login: own window 2886866 opened
2026-10-24T22:42:33.020Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:42:33.022Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:42:33.043Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:42:49.272Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 1; address stable 4.1 s; 16.2 s from the press (polls: 17; scans: 5; worst single scan 16 ms)
2026-10-24T22:42:49.272Z bb-login: SIGNED IN - SSO autofill + one submit; own window 2886866 closed
```

### leg2-new

```
2026-10-24T22:42:55.195Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:42:55.682Z bb-login: own window 1379540 opened
2026-10-24T22:43:00.963Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:43:00.963Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:43:00.981Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:44:30.992Z bb-login: after submit: bound of 90 s reached at 90.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: stand-in SSO host (localhost); address stable 90.0 s; not scanned (off the blackboard host) (polls: 90; scans: 0; worst single scan n/a)
2026-10-24T22:44:30.992Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 90 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 1379540 left open
```

### leg2-wait20

```
2026-10-24T22:44:38.813Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:44:39.315Z bb-login: own window 2163184 opened
2026-10-24T22:44:44.605Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:44:44.607Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:44:44.627Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:45:04.629Z bb-login: after submit: bound of 20 s reached at 20.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: stand-in SSO host (localhost); address stable 20.0 s; not scanned (off the blackboard host) (polls: 21; scans: 0; worst single scan n/a)
2026-10-24T22:45:04.629Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 2163184 left open
```

### leg3-new

```
2026-10-24T22:45:07.555Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:45:08.036Z bb-login: own window 2557800 opened
2026-10-24T22:45:13.322Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:45:13.324Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:45:13.342Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:46:43.370Z bb-login: after submit: bound of 90 s reached at 90.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: other host; address stable 89.0 s; not scanned (off the blackboard host) (polls: 90; scans: 0; worst single scan n/a)
2026-10-24T22:46:43.370Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 90 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 2557800 left open
```

### reg-bb-standin

```
2026-10-24T22:46:50.071Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:46:50.584Z bb-login: own window 1707220 opened
2026-10-24T22:46:55.865Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:46:55.867Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:46:55.884Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:47:00.038Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 1; address stable 4.1 s; 4.1 s from the press (polls: 5; scans: 5; worst single scan 23 ms)
2026-10-24T22:47:00.039Z bb-login: SIGNED IN - SSO autofill + one submit; own window 1707220 closed
```

### reg-bb-standin-bad

```
2026-10-24T22:47:01.441Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:47:01.956Z bb-login: own window 4064632 opened
2026-10-24T22:47:07.235Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:47:07.237Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 2 (scans: 2)
2026-10-24T22:47:07.237Z bb-login: WAITS FOR THE USER - 2 allowlisted submit buttons on the SSO page (1 needed: a picker, MFA, empty autofill or an unknown form); nothing pressed; window 4064632 left open
```

### reg-bb-standin-otherhost

```
2026-10-24T22:47:10.241Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8091); no real site is contacted
2026-10-24T22:47:10.740Z bb-login: own window 2951016 opened
2026-10-24T22:47:16.041Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: no; host under ada.edu.az: no; host: other host; https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:47:16.043Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:47:16.043Z bb-login: WAITS FOR THE USER - off the blackboard stand-in (127.0.0.1) on a page that is not the SSO page (other host: the host must be on the SSO host allowlist and not read as http); nothing pressed; window 2951016 left open
```

### atk-bounce

```
2026-10-24T22:47:41.958Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8092); no real site is contacted
2026-10-24T22:47:42.444Z bb-login: own window 2100436 opened
2026-10-24T22:47:47.729Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:47:47.731Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:47:47.751Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:48:07.759Z bb-login: after submit: bound of 20 s reached at 20.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): no; host: other host; address stable 16.9 s; not scanned (off the blackboard host) (polls: 20; scans: 2; worst single scan 11 ms)
2026-10-24T22:48:07.759Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 2100436 left open
```

### atk-signin

```
2026-10-24T22:48:10.714Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8092); no real site is contacted
2026-10-24T22:48:11.199Z bb-login: own window 2624726 opened
2026-10-24T22:48:16.483Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:48:16.485Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:48:16.504Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:48:36.529Z bb-login: after submit: bound of 20 s reached at 20.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): yes; host: 127.0.0.1; address stable 19.0 s; document: yes; controls: 1; sign-in buttons: 1 (polls: 20; scans: 19; worst single scan 12 ms)
2026-10-24T22:48:36.529Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 2624726 left open
```

### atk-empty

```
2026-10-24T22:48:39.485Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8092); no real site is contacted
2026-10-24T22:48:39.980Z bb-login: own window 3344232 opened
2026-10-24T22:48:45.257Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:48:45.259Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:48:45.278Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:49:05.297Z bb-login: after submit: bound of 20 s reached at 20.0 s from the press; last poll: on the blackboard stand-in (127.0.0.1): yes; host: 127.0.0.1; address stable 19.0 s; document: yes; controls: 0; sign-in buttons: 0 (polls: 20; scans: 19; worst single scan 14 ms)
2026-10-24T22:49:05.297Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 3344232 left open
```

### atk-churn

```
2026-10-24T22:49:08.225Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8092); no real site is contacted
2026-10-24T22:49:08.721Z bb-login: own window 3475304 opened
2026-10-24T22:49:13.994Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:49:13.996Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:49:14.019Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:49:19.831Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 on 2 consecutive scans; controls: 800; address stable 4.7 s; 5.8 s from the press (polls: 5; scans: 4; worst single scan 482 ms)
2026-10-24T22:49:19.831Z bb-login: SIGNED IN - SSO autofill + one submit; own window 3475304 closed
```

### atk-heavy

```
2026-10-24T22:49:36.635Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8092); no real site is contacted
2026-10-24T22:49:37.115Z bb-login: own window 2949710 opened
2026-10-24T22:49:42.395Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:49:42.397Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:49:42.416Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:50:05.513Z bb-login: after submit: bound of 20 s reached at 23.1 s from the press; last poll: on the blackboard stand-in (127.0.0.1): yes; host: 127.0.0.1; address stable 22.1 s; document: yes; controls: 8001; sign-in buttons: 1 (polls: 6; scans: 5; worst single scan 3759 ms)
2026-10-24T22:50:05.515Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 2949710 left open
```

### atk-heavychurn

```
2026-10-24T22:50:08.488Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8092); no real site is contacted
2026-10-24T22:50:08.985Z bb-login: own window 3149014 opened
2026-10-24T22:50:14.255Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-24T22:50:14.257Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-24T22:50:14.276Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-24T22:50:35.605Z bb-login: after submit: bound of 20 s reached at 21.3 s from the press; last poll: on the blackboard stand-in (127.0.0.1): yes; host: 127.0.0.1; address stable 20.1 s; document: yes; controls: 3001; sign-in buttons: 1 (polls: 5; scans: 4; worst single scan 4249 ms)
2026-10-24T22:50:35.606Z bb-login: WAITS FOR THE USER - the submit did not end on the blackboard stand-in (127.0.0.1) without a sign-in control within 20 s of the press (still on the SSO page, MFA, a picker, an error, a second step or another host); nothing more pressed; window 3149014 left open
```

## Round 2 re-check (after fixer round 1)

Re-check, 2026-10-25, of the items changed by fixer round 1 (`S5-fixer1.md`, read as claims; rulings in
`briefs/S5-fixer1.md`). Changed files: `recipes/bb-login.ps1`, `recipes/fixtures/sso-standin.html`. Dry runs only on
127.0.0.1; G10-3 not touched. Servers: A `http.server 8095 --bind 127.0.0.1 --directory recipes/fixtures` (PID 31900),
B the same on 8096 over my round-1 attack pages in the scratchpad (PID 27224); both free before, stopped by PID after
a command-line check, no listener after. No npm command run this round (S5 changes no TypeScript; S3 is in flight in
the main tree). Every window left open was closed by its printed handle after the class check.

### Re-run table (times computed by me: `invoked` line -> last line)

| Leg | Script | Page | Exit | Submits (my server log) | Press -> last line | Expected | Result |
|---|---|---|---|---|---|---|---|
| 1 | OLD 09fa604 (run first) | bb-standin-delayed | 4 | 1 `/sso-submit-delayed.html?t=1792883833980` | 13.211 s | 4 | PASS |
| 1 | NEW | bb-standin-delayed | 0 | 1 `?t=1792883855936` | 16.226 s | 0 | PASS |
| 2 | NEW | bb-standin-stuck | 4 | 1 `/submit-stuck?t=1792883955196` | 90.019 s | 4, 90-95 s | PASS |
| 3 | NEW | bb-standin-elsewhere | 4 | 1 `/elsewhere-landing.html?t=1792884053926` | 90.021 s (`polls: 90`) | 4 at the bound | PASS |
| reg | NEW | bb-standin | 0 | **1** `/bb-standin.html?signedin=1&t=1792883879448` | 4.150 s | 0, 1 counted submit | PASS |
| F1 | NEW `-WaitSec 20` | bb-atk-heavy (Sign in + 8 000 buttons) | 4 | 0 `/pressed-again` | **20.017 s** (round 1: 23.099 s) | <= 20 s + slack | PASS |
| F1 | NEW `-WaitSec 20` | bb-atk-heavychurn (Sign in + 3 000 churning) | 4 | 0 `/pressed-again` | **20.002 s** (round 1: 21.330 s) | <= 20 s + slack | PASS |
| F3 | NEW `-WaitSec 30`, own window closed (WM_CLOSE, printed handle) 5 s after the `invoked` line | bb-standin-stuck | 4 | 1 | 6.100 s | 4 at once | PASS |
| F3 | NEW `-WaitSec 30`, closed ~2.8 s after the press (inside the first ~4 s scan window) | bb-atk-heavy | 4 | 0 `/pressed-again` | 5.922 s (`polls: 3; scans: 2`) | 4 at once | PASS |

F1 lines, verbatim: `bound of 20 s reached at 20.0 s ... not scanned (less than 5.0 s left before the bound)
(polls: 9; scans: 4; skipped near the bound: 5; worst single scan 3974 ms)` and `... (polls: 7; scans: 4; skipped
near the bound: 3; worst single scan 4619 ms)`. F3 lines: `after submit: own window 2557976 is gone (closed outside
the script) at 6.1 s from the press (polls: 7; scans: 0)` / `WAITS FOR THE USER - the own window is gone; nothing more
pressed`. Whether a scan itself threw in the heavy trial is not visible in the output (the close landed while a scan
could be running; the result is exit 4 either way).

### Per-item status

- **F1 - fixed (verified).** `:329-332`: no scan starts with less than `max(5000, $worstScan)` ms left; both heavy
  pages now end at 20.0 s. Residual, as the header now says: one scan longer than its start margin + 5 s could still
  overrun; a real Blackboard page's scan time is unmeasured (G10-3).
- **F2 - fixed (by reading).** `:350`: after every scan, past the deadline -> `break` -> the exit-4 path, before the
  exit-0 test. Not producible live now that F1 keeps scans out of the last 5 s.
- **F3 - fixed (verified), premise corrected.** `:323`, `:340`, `:362`: own-window check (`IsWindow` + class
  `Chrome_WidgetWin_1`) each poll, after a failed scan and after the loop -> `Exit-WindowGone`, exit 4; `Get-Scan`
  and `Get-Addr` in `try`. My round-1 F3 said "exit 1" by reading; the fixer's control runs of the builder's script
  ended in exit 4 at the bound with a false `window ... left open` line instead. I accept that correction: the real
  defect was the useless wait and the wrong line, which the fix removes.
- **F4 - fixed (by reading).** `:326`, `:346` use `-cne`. `Wait-Settled`'s pre-press `-ne` left unchanged (outside
  the finding; correct, nothing before the press may change).
- **F5 - fixed (verified).** `sso-standin.html`'s submit now carries `&t=<Date.now()>`; the known-good leg left one
  counted line; `bb-standin.html`'s `signedin=1` test still matched (exit 0).

### Diff checks

- **Nothing pressed after the first press:** `Invoke-Once` is still called only at the two pre-press sites; no new
  call in `Finish-AfterPress`, `Test-OwnWindow` or `Exit-WindowGone`; leg 2 (the "Sign in" button stays) and the
  heavy pages (a "Sign in" on the Blackboard host) left 1 / 0 counter lines.
- **Nothing before the press changed:** `git diff -U0` hunks are the header, the dry-run paragraph, `param(...)`, one
  `IsWindow` `DllImport` line added to `LoginWin` (a declaration; nothing pre-press calls it), the stopwatch line, and
  the post-press block. Exit-code meanings kept.
- **ASCII:** `bb-login.ps1` 29 132 bytes, `sso-standin.html` 1 514 bytes: 0 bytes > 0x7F, no BOM, 0 CR.
- **Case collisions:** new names `$slack $margin $skipped $a2` and `Exit-WindowGone`'s params `$sw $polls $scans`
  do not match any script-scope name a callee reads; the new helpers read `$H`, and the only `$h` locals/params
  (`Test-SsoHost`, the `Get-ChromeWindows` callback, `Get-Where`) never call them.

### New finding

**R2-N1 - NIT - the header's dated note repeats the unverified "exit 1"** (`recipes/bb-login.ps1:62`: "a vanished
window ended in exit 1"). The fixer's own control runs showed exit 4 at the bound with a false "left open" line.
Suggested fix: "a vanished window was waited on to the bound and reported as left open". Wording only.

### Round 2 verdict: **PASS-with-notes**

F1-F5 resolved (F1, F3, F5 by experiment; F2, F4 by reading); S5.1's three legs and the regression hold on the fixed
script; one NIT (R2-N1). Round-2 outputs are in my scratchpad (`v5/out-r2-*.txt`), summarised verbatim above.
