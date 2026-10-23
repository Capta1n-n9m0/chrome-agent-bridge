# S6 fixer r3 — S6 Part 3 pre-run work, fix round 1

Written 2026-10-23 by the S6 Part 3 fixer (level 2, round 1, Claude Opus 5.5), for the findings in
`S6-verifier-r3.md`, under the step agent's rulings. Base HEAD `0a6c82c`. I spawned no agent, made no
commit and did not contact Blackboard. The only live actions were `bb-login.ps1`'s loopback dry runs, in
windows the script opened itself. No Part 3 row has run, so everything below is still pre-registration.

## F1 (MAJOR) — the live SSO branch now presses only on an allowlisted host

`recipes/bb-login.ps1`:
- `:128-138`: the **SSO host allowlist**, written in one place. `$SsoExact = @('ada.edu.az',
  'login.microsoftonline.com')`, `$SsoSuffix = @('.ada.edu.az')`, and `Test-SsoHost` (exact match, or the
  host ends with a suffix and is longer than it). An empty host gives false. The old `$IdpHosts` print
  list is gone, so only a host on this list is ever printed.
- `:139-140`: in a dry run the whole allowlist is the other loopback name (`localhost` when the base is
  `127.0.0.1`), with no suffix rule. It is tested by the same `Test-SsoHost`, so the dry run exercises the
  live predicate's code path.
- `:180`, `:185`: `Get-Where` takes the host only from an absolute `Uri`, and adds `AddrRead` (false when the
  address bar reads empty or `Get-Addr` threw).
- `:286-303`: `$isSso = $hostOk -and -not $httpsVeto`. In a live run `$httpsVeto` is true when https reads
  `no` or `no (Not secure chip)`. The host prints as `address bar unreadable` (empty or unreadable address
  bar), `other host` (not on the list, or a host that does not parse), `stand-in SSO host (<h>)` in a dry
  run, or the allowlisted host. On refusal it prints `WAITS FOR THE USER - off <bb> on a page that is not
  the SSO page (<other host | address bar unreadable | read as http>: the host must be on the SSO host
  allowlist and not read as http); nothing pressed; window <h> left open` and exits 4, before any press.
- Header `:15-58`: steps 3 and 5 and the dry-run paragraph now describe the allowlist. Step 3 also says
  that the address bar is itself an Edit control read in memory (N4).

Host predicate check (`Test-SsoHost` extracted from the script, `$TEMP\hosttest.ps1`):
```
'ada.edu.az' True · 'sso.ada.edu.az' True · 'a.b.ada.edu.az' True · 'login.microsoftonline.com' True
'evil-ada.edu.az' False · 'ada.edu.az.evil.com' False · 'login.microsoft.com' False · 'accounts.google.com' False
'' False · 'xada.edu.az' False · 'LOGIN.microsoftonline.com.' False
```
Parse: 0 errors. Non-ASCII bytes in the script: 0.

**The non-allowlisted-host stand-in.** New files `recipes/fixtures/bb-standin-otherhost.html` and
`recipes/fixtures/sso-standin-otherhost.html`. The first redirects to `http://sso.localhost:<port>/sso-standin-otherhost.html`.
That page has exactly one allowlisted button (`Sign in`, like the known-good page), so only the host check can
refuse it. A press would change its heading to `PRESSED go …` and GET `/pressed-otherhost`. Why `sso.localhost`
and not `[::1]`: python's `http.server --bind 127.0.0.1` does not serve `::1`. The dry run's probe printed
`[::1]:8089 -> ERROR (python bound to 127.0.0.1 does not serve ::1): Unable to connect to the remote server`.
Chrome resolves every `*.localhost` name to loopback itself, with no DNS lookup, so the same 127.0.0.1 server
answers it (its log shows `GET /sso-standin-otherhost.html`). No second server is needed. The name is also a
near miss for the allowlisted `localhost`, which checks that the match is exact.

**Dry runs (after the last edit to the script; `scratchpad/fixer3-dryrun.ps1`, output verbatim):**
```
listeners on 8089 before: 0
chrome processes: 10
server pid 20496
bb-standin.html -> 200 1024 bytes
bb-standin-bad.html -> 200 709 bytes
bb-standin-otherhost.html -> 200 956 bytes
sso-standin.html -> 200 1192 bytes
sso-standin-two.html -> 200 1085 bytes
sso-standin-otherhost.html -> 200 1292 bytes
[::1]:8089 -> ERROR (python bound to 127.0.0.1 does not serve ::1): Unable to connect to the remote server
--- KNOWN-GOOD ---
2026-10-23T16:42:39.744Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8089); no real site is contacted
2026-10-23T16:42:40.230Z bb-login: own window 5573542 opened
2026-10-23T16:42:45.516Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-23T16:42:45.516Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-23T16:42:45.533Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-23T16:42:53.652Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 (document: yes; scans: 2)
2026-10-23T16:42:53.658Z bb-login: SIGNED IN - SSO autofill + one submit; own window 5573542 closed
bb-login exit 0
--- KNOWN-BAD (two buttons) ---
2026-10-23T16:42:56.122Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8089); no real site is contacted
2026-10-23T16:42:56.615Z bb-login: own window 3607546 opened
2026-10-23T16:43:01.893Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-23T16:43:01.894Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 2 (scans: 2)
2026-10-23T16:43:01.894Z bb-login: WAITS FOR THE USER - 2 allowlisted submit buttons on the SSO page (1 needed: a picker, MFA, empty autofill or an unknown form); nothing pressed; window 3607546 left open
bb-login exit 4
window 3607546 class: Chrome_WidgetWin_1; process: chrome
elements named PRESSED*: 0
elements named 'SSO stand-in (two buttons)': 2
window 3607546 still exists after WM_CLOSE: False
--- KNOWN-BAD (non-allowlisted host sso.localhost, one allowlisted button) ---
2026-10-23T16:43:04.523Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8089); no real site is contacted
2026-10-23T16:43:05.003Z bb-login: own window 3542020 opened
2026-10-23T16:43:10.285Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: no; host under ada.edu.az: no; host: other host; https: assumed (scheme hidden, no Not secure chip)
2026-10-23T16:43:10.287Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-23T16:43:10.287Z bb-login: WAITS FOR THE USER - off the blackboard stand-in (127.0.0.1) on a page that is not the SSO page (other host: the host must be on the SSO host allowlist and not read as http); nothing pressed; window 3542020 left open
bb-login exit 4
window 3542020 class: Chrome_WidgetWin_1; process: chrome
elements named PRESSED*: 0
elements named 'SSO stand-in (other host)': 2
window 3542020 still exists after WM_CLOSE: False
--- server log (GET lines) ---
GET /bb-standin.html HTTP/1.1" 200 -
GET /bb-standin-bad.html HTTP/1.1" 200 -
GET /bb-standin-otherhost.html HTTP/1.1" 200 -
GET /sso-standin.html HTTP/1.1" 200 -
GET /sso-standin-two.html HTTP/1.1" 200 -
GET /sso-standin-otherhost.html HTTP/1.1" 200 -
GET /bb-standin-otherhost.html HTTP/1.1" 304 -
GET /sso-standin-otherhost.html HTTP/1.1" 304 -
safe: the tree of 20496 does not contain the driver
listeners on 8089 after: 0
chrome processes: 10
```
All three come out as expected. In the server log, the first six 200s are the script's own probes. In this run
Chrome served the older stand-ins from its HTTP cache without a request (heuristic freshness), and it
revalidated the two new files (304). An earlier set of three runs, made before an edit that only added a
comment (N2), had the same three outcomes (exit 0 / 4 / 4, `PRESSED*: 0` both times). Its server log listed
every page, including `GET /bb-standin.html?signedin=1`, and had no `/pressed-otherhost` (`scratchpad/fixer3-dryrun.out.txt`).
Neither run requested `/pressed-otherhost`. Both windows left open were the script's own (`Chrome_WidgetWin_1`
of `chrome`), and the dry run closed them with WM_CLOSE. No other window or tab was touched. The server was
stopped by its PID after `Test-SafeToKill` printed `safe` (20496 in this run, 15692 in the earlier one).

**Registered text.** `docs/e2e-test-plan.md:1001` (the §4.19 SDK-6 note, the builder's pre-run insert, edited
before any run) now spells out the allowlist, the conditions for `SSO page: yes`, the host print values (`other
host` / `address bar unreadable`), the new refusal line with its exit 4 "whatever `<a>` is", the https reading as
an unproven backstop that can only veto, and the three dry-run outcomes. The sheet's login step note
(`S6-wave-sheet.md:483-495`) and `recipes/README.md:34` say the same thing.

## F2 (MINOR) — the https inference is recorded as an unproven backstop

`bb-login.ps1:38-42` (header) and `:286-288`: the https reading can only **veto** a press (`$httpsVeto`); it
can never allow one, because `$isSso` needs `$hostOk` first. It is marked unproven, for two reasons: Chrome
shows no chip for localhost, so the dry run never sees one, and a non-English Chrome may name the chip
differently. The same is recorded in the SDK-6 note and the sheet. If it misreads, an http page reads
`assumed`. The host allowlist still decides, so the failure direction is "no press" (or no change).

## F3 (MINOR) — a reload exit other than 0/2 stops the live part

`S6-wave-sheet.md:204-208` (P3-e): a third exit 2, or any exit other than 0 or 2 (1, 3, 4, …), now means SM-0
is **not measured** AND the live part STOPS. P3-e', LOC-1 and every later row are skipped, and the driver reports
to the step agent: under the integrity floor such an exit waits for the user, P3-b already says so, and only #99 (1)
exempts exit 2. P3-e' (`:211-213`) now runs only after an exit-0 reload. The SM-0 row in the rows table
(`:289`) says the same.

## F4 (MINOR) — SM-1 step 8 waits for the lines Part 3's `sm1` prints

`S6-wave-sheet.md:243-251` (P3-i): step 8 waits for `extension back`, then for `observations written to
<S6_OUT>\sm1-observed.json (held tab's events, handles, counts; no URL or title)`, then for either
`the verdict is sm1-log's "SM-1 (Part 3 rule)" line (run sm1-log --since $Q --observed <this file>)` (exit 0)
or `SM-1 (Part 3 rule) NOT MEASURED — the extension did not disconnect and reconnect during the hold — the
restart was not seen` (exit 3). These strings were checked against `recipes/s6.ts:430-435`. Step 9 waits for
`sm1-log`'s `SM-1 (Part 3 rule) PASS|FAIL|NOT MEASURED — …` (`recipes/s6.ts:470-474`).

## NITs

- **N1 (decided: the stricter reading).** The window still starts at `$Q` truncated to its whole second, which
  is what the code already did. The log stamps whole seconds, so a line stamped in `$Q`'s second counts as after
  `$Q`. It can only add to the count and make "exactly one" FAIL; it can never hide a second line.
  - Comment: `recipes/s6-rules.ts:363-365`.
  - New test `recipes/test/s6-rules.test.ts:377-385`: a line at `15:08:17Z` (Q = `15:08:17.86Z`) plus the
    restart's line ⇒ FAIL with `2 "extension session changed" line(s)`.
  - A line at `15:08:16Z` is still ignored (`:375`).
  - Stated in the SM-1 note (`docs/e2e-test-plan.md:1005`, clause (e)) and in P3-i (`S6-wave-sheet.md:251-253`).
  - What the reading accepts: a lone line in `$Q`'s second, stamped just before the quit, with no line after the
    restart. The log's one-second resolution cannot tell such a line apart, and the verifier judged it practically
    unreachable, because the restart's own line always follows.
- **N2.** Comment only (`bb-login.ps1:245-246`): the Alt tap reaches whatever window is in front. Behaviour is
  unchanged, since this is not a key into any page.
- **N3.** The Part 3 bad-case tests now go through a `bad(o, log, /reason/)` helper (`s6-rules.test.ts:320-325`).
  It asserts `pass === false` and that a `why` entry matches the clause expected to fire. 17 expectations were
  converted, and all pass. Example: `minted before the quit \(≤ T216\): T215$`.
- **N4.** Header wording, `bb-login.ps1:20-23` (see F1).

## Counts

```
npx vitest run recipes/                          → Test Files 4 passed (4) · Tests 152 passed (152)   (151 + the N1 test)
npx tsc --noEmit -p recipes/tsconfig.s6.json     → exit 0
npm run typecheck                                → exit 0
```
P3-a's expected count in the sheet is now **152 tests in 4 files** (`S6-wave-sheet.md:183`).

Hygiene, counted over the added lines of `git diff` plus the whole of every untracked file (the fixtures,
`S6-builder-r3.md`, `S6-verifier-r3.md`). Nothing was printed.
```
token (from bridge.token into a variable, then unset): 0
_\d+_\d+ distinct: _1_1 only
blackboard-ultra skill course-table ids (17 distinct _<3+ digits>_<n>): 0 hits
dist/ | exports/ | .png in git status --untracked-files=all: 0
```

## Commit pathspec (the whole Part 3 pre-run file list)

```
docs/e2e-test-plan.md
docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md
docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6.ledger.md
docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-builder-r3.md
docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-verifier-r3.md
docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-fixer3.md
recipes/README.md
recipes/bb-login.ps1
recipes/s6-rules.ts
recipes/s6.ts
recipes/test/s6-rules.test.ts
recipes/fixtures/bb-standin.html
recipes/fixtures/bb-standin-bad.html
recipes/fixtures/bb-standin-otherhost.html
recipes/fixtures/sso-standin.html
recipes/fixtures/sso-standin-two.html
recipes/fixtures/sso-standin-otherhost.html
```
(`S6.ledger.md` is the step agent's file and was not touched by me. It belongs to the same commit if the step
agent wants it there.)
