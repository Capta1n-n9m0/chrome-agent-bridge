# S6 builder r3 — S6 Part 3 pre-registration (the remaining live rows)

Written 2026-10-23 by the S6 builder (round 3, Claude Opus 5.5), before any Part 3 run, for decisions.md ·
2026-10-23 · S6's findings ruled: the user's answers, stage S6b for REP-1, re-registered rows (#99) and
decisions.md · 2026-10-23 · An MCP failure report with a screenshot is returned as a non-error result (#100).
Base: HEAD `0a6c82c`. Nothing was run on the bridge; the only live action was `bb-login.ps1`'s localhost dry run
(§5). No Run 12 Part 1/2 line or verdict was changed: every row change is a dated note beside the old text.

## 1. What changed (the commit pathspec)

| File | Change |
|---|---|
| `recipes/s6-rules.ts` | `sm1Part3Verdict` + `Sm1Observed`/`Sm1Part3Result`: SM-1's Part 3 rule (#99 (5)), pure; `sm1Verdict`/`sm1LogVerdict` unchanged. |
| `recipes/s6.ts` | `sm1 --observed <file>` writes the observations (held tab's events as booleans, handles, counts, 12-hex build; no URL/title) and prints no Part 2 verdict; `sm1-log --since <iso> --observed <file>` prints `SM-1 (Part 3 rule) PASS/FAIL/NOT MEASURED` instead of `SM-1 LOG …`; `sm0` closes its own tab after the verdict on every outcome and prints the outcome (mechanical fix (b)); help/header. |
| `recipes/test/s6-rules.test.ts` | 13 tests for `sm1Part3Verdict` (Part 2's measured run passes; the five known-bad inputs fail; window edges; NOT MEASURED; bad since). |
| `recipes/bb-login.ps1` | ADA SSO path (#99 (1)), retried UIA scan (`-ScanSec`), one-press guard, `-DryRunBase`/`-DryRunPage` for loopback stand-ins; ASCII only. |
| `recipes/fixtures/bb-standin.html` | Dry-run "blackboard" stand-in (127.0.0.1): redirects to the SSO stand-in on `localhost`; `?signedin=1` = signed in. |
| `recipes/fixtures/bb-standin-bad.html` | Known-bad start page: redirects to the two-button SSO stand-in. |
| `recipes/fixtures/sso-standin.html` | Known-good SSO stand-in: fake prefilled e-mail (`example.invalid`), one "Sign in" button that returns to the stand-in signed in. |
| `recipes/fixtures/sso-standin-two.html` | Known-bad SSO stand-in: two allowlisted buttons ("Next", "Sign in"). |
| `recipes/README.md` | `s6.ts` `--observed`; `bb-login.ps1` SSO + dry run. |
| `docs/e2e-test-plan.md` | Dated notes: §4.18 LOC-1, ASREF-1 (*Superseded*, optional clause), REP-1; §4.19 SM-0 (informational line + reload rule), SDK-6 (login step), SM-1 (Part 3 rule + procedure). |
| `docs/plans/…-steps/S6-wave-sheet.md` | New section "## Part 3 (2026-10-23, after S6b)" (P3-a … P3-i, evidence rules, record, prompts, rows table); dated note on "SDK-6/SDK-7 live" step 1. |
| `docs/plans/…-steps/S6-builder-r3.md` | This report. |

Not in the pathspec: `S6.ledger.md` (the step agent's, modified before this round), any `dist/`, `exports/`,
`bridge.token`, PNGs. `.gitignore` is unchanged (nothing new to ignore: the fixtures are committed, the dry-run
server log went to the scratchpad).

## 2. dist freshness (task 1)

Before (`sha256sum`, main tree at `0a6c82c`):
```
597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f  daemon/dist/index.js
4b07b4643ea78c82146952bba66a23d9788049b6a481d79a740a01e714c63153  mcp/dist/index.js
bcb20e289758f6118c021b54a734ef3cd6de32e7c9158a527d4808fdb899587a  extension/dist/content.js
93af3da93439437df929174eb25bdf7aa9d4c8022ddd07da972140e4e94cf400  extension/dist/offscreen.js
9093499a71f56cd1a503a564d949e1ce03223173cbf60e3ee61e61ee73b50c52  extension/dist/options.js
27493950f4689203257cc4937d83b72070a7b15e295fad8856b160060cc51eff  extension/dist/sw.js
```
`npm run build` → exit 0. After: **identical** (`diff` of the two lists empty) — no handover, no reload, no
mcp rebuild needed. `git log --stat 24b5ce5..HEAD -- extension daemon sdk shared` → printed nothing (exit 0).

## 3. Test counts and checks (task 9)

- `npx vitest run recipes/` → `Test Files 4 passed (4)`, `Tests 151 passed (151)` (138 before; +13 new). TDD:
  the 13 tests were run red first (`12 failed | 139 passed (151)`; the 13th, "refuses a bad since", passed
  trivially on the missing function's TypeError), then green.
- `npx tsc --noEmit -p recipes/tsconfig.s6.json` → exit 0. `npm run typecheck` → exit 0.
- PowerShell parse of `bb-login.ps1` (`[Parser]::ParseFile`) → 0 errors; non-ASCII bytes in it and the fixtures: 0.
- Offline CLI dry run of the new SM-1 path on Part 2's data (an `Sm1Observed` JSON built from Part 2's printed
  lines in the scratchpad, `--since` = Part 2's `$Q`; `sm1-log` connects to nothing and read the local
  `daemon.log`, printing only its session lines):
  ```
  2026-10-23T15:08:52Z extension session changed: 0 handles retired
  2026-10-23T15:08:52Z extension resync: 4 tabs, 0 gone
  2026-10-23T16:13:01.517Z s6-sm1-log: SM-1 (Part 3 rule) PASS — T216 gone by tabGone at the quit (+1505 ms after $Q); snapshot → TAB_GONE; no handle ≤ T216 listed after the restart; none owned by s6-sm1; same daemon (build 597d6c28abd1…, no reconnect, uptime kept counting); one session-changed line (0 retired), resync +0 s
  exit 0
  … --observed C:/nope.json → s6-sm1-log: FAILED — SET-UP: C:/nope.json does not exist — run sm1 with the same --observed first   exit 2
  ```

## 4. New expected text (with sources)

### SM-1 (Part 3 rule) — `docs/e2e-test-plan.md` §4.19 SM-1, Part 3 note
#99's clause made measurable (all must hold): (a) gone = the recipe's `tabGone {tab:T<a>}` with the pre-restart
lastUrl between `$Q` and `extension back` + 30 s, OR exactly-one session-changed line after `$Q` with n ≥ 1;
(b) `snapshot {tab:T<a>}` → `TAB_GONE`; (c) `listTabs` after lists no handle ≤ T<m>; (d) no tab owned by the
recipe, pid unchanged (driver), same build, `reconnected: no`, uptime kept counting, counts equal; FAIL on any live
T<a>; (e) exactly one `extension session changed: <n> handles retired` line after `$Q` (any n ≥ 0, recorded), no
marker value, `extension resync:` ≤ 30 s after it. Also FAIL: two tabGone for T<a>, or one with another lastUrl
(kept from Part 2's rule). Code: `recipes/s6-rules.ts:355` (`sm1Part3Verdict`), line text `:413-418`.
Printed lines: `recipes/s6.ts:431` `observations written to <file> (held tab's events, handles, counts; no URL or
title)`; `:435` `the verdict is sm1-log's "SM-1 (Part 3 rule)" line (run sm1-log --since $Q --observed <this
file>)`; `:433` `SM-1 (Part 3 rule) NOT MEASURED — …` (exit 3); `sm1-log`: `:472` `SM-1 (Part 3 rule) PASS — <T#a>
gone by tabGone at the quit (+<ms> ms after $Q) | by the session change (<n> retired); snapshot → TAB_GONE; no
handle ≤ T<m> listed after the restart; none owned by s6-sm1; same daemon (build <12 hex>…, no reconnect, uptime
kept counting); one session-changed line (<n> retired), resync +<s> s`; `:474` `… FAIL — <reasons>` (exit 1);
`:470` `… NOT MEASURED — …` (exit 3).

### LOC-1 — §4.18 LOC-1, Part 3 note; prompt P-LOC1 (Part 3) in the sheet
`Typed into textbox "Email address"`; call 2 (`browser_evaluate {"expression":"document.getElementById('email').value"}`)
→ exactly `a@b.com`, one line — a string prints unquoted (`extension/src/evaluate/result.ts:147-149`,
`description: asString(r.value)`), and the tool adds nothing for a plain string without `asRef`
(`mcp/src/tools/registry.ts:705-710`); the field is `<input id="email">` (`test-fixtures/e2e-playground.html:31`);
the CDP banner is not tool output; `Clicked button "Click counter"`; snapshot `button "Click counter: 1"`; call 5
`OUTPUT (isError):` exactly `browser_click takes ref or locator, not both` (`registry.ts:178`, returned at
`:422-423` before any call, `toolError` `:34-37` — hence "the counter stays at 1"). The LOC actor's tool list
already has `browser_evaluate` (wave sheet, "Tool lists for `A start`").

### REP-1 — §4.18 REP-1, Part 3 note
Line 1 `LOCATOR_NOT_FOUND: no button named "No such button".<…>` (`extension/src/content/locate.ts:272`); last
report line exactly `The call failed (LOCATOR_NOT_FOUND). This result is not flagged as an error only so that the
screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them, drop images from error results).`
(`mcp/src/tools/registry.ts:54-56` `failedLine`, appended `:268`), then the notice only if the cursor was
re-claimed (`withNotice` `:63-73`); no `Full message:` (`:213`, `:251-253`); no `is_error` (`:266-269`) ⇒
`recipes/t5-actor.ts:191` prints `OUTPUT:`; the image shows as `[image <n> base64 chars]` (`t5-actor.ts:172`),
then Claude Code's `[Image: source: …\tool-results\….png]` text part (`S6b-probe-record.md` finding 2). Image
rule: `node mcp/test/probe/count-images.mjs <transcript> mcp__chrome-agent-bridge__browser_click` →
`images_in_tool_results` ≥ 1, `is_error` false (the transcript decides; the same on `out.jsonl` should agree).
Fresh actor RP (`browser_snapshot,browser_click`): P-REP1-a claims the `rep1` tab, then `Open-T5Tab` puts
`rep1-front` on screen, then P-REP1. Session-store copy of the PNG: count recorded only.

### SSO login step — §4.19 SDK-6, Part 3 note; sheet "SDK-6/SDK-7 live" step 1 note
Lines (`recipes/bb-login.ps1`): `:142` `own window <h> opened`; on ada `:254` `after load: on ada.blackboard.com:
yes; sign-in buttons: <n> (document: …; scans: …)`, `:255` `LOGGED IN - no sign-in control; own window <h>
closed` (0), `:256` `WAITS FOR THE USER - <n> sign-in buttons …` (4); off ada `:272` `after load: on
ada.blackboard.com: no; SSO page: <y/n>; host under ada.edu.az: <y/n>; host: <allowlisted host | other host>;
https: <…>`, `:273` `SSO scan: document: <y/n>; Edit controls: <e>; Button controls: <b>; allowlisted submit
buttons: <a> (scans: <k>)`; `:274`/`:275` `WAITS FOR THE USER - … nothing pressed; window <h> left open` (4);
`:231` `invoked the one allowlisted SSO submit button once (…)`; `:240` `after submit: on ada.blackboard.com: …`;
`:243` `SIGNED IN - SSO autofill + one submit; own window <h> closed` (0); `:245` `WAITS FOR THE USER - the submit
did not end on ada.blackboard.com without a sign-in control (…); nothing more pressed; window <h> left open` (4).
Exits unchanged 0/1/2/4; 4 ⇒ waits for the user; 2 ⇒ once more, a second 2 ⇒ as 4.

## 5. bb-login dry runs (verbatim)

Server: `Start-Process -WindowStyle Hidden -PassThru "$HOME\miniconda3\python.exe" -ArgumentList
'-I','-m','http.server','8089','--bind','127.0.0.1','--directory','recipes/fixtures'` → pid 26564 (8089 had no
listener before); the four pages answered 200 (1024/1192/709/1085 bytes). Chrome: 10 processes running.

Known-good (`-DryRunBase http://127.0.0.1:8089/`):
```
2026-10-23T16:16:21.295Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8089); no real site is contacted
2026-10-23T16:16:21.809Z bb-login: own window 2034682 opened
2026-10-23T16:16:27.108Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-23T16:16:27.110Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-23T16:16:35.246Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 (document: yes; scans: 2)
2026-10-23T16:16:35.252Z bb-login: SIGNED IN - SSO autofill + one submit; own window 2034682 closed
bb-login exit 0
```
(The `invoked the one … once` line is missing from this output: swallowed by a PowerShell capture, fixed after this run, not re-run — §7 doubt 1.)

Known-bad (`-DryRunBase http://127.0.0.1:8089/ -DryRunPage bb-standin-bad.html`):
```
2026-10-23T16:16:45.067Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8089); no real site is contacted
2026-10-23T16:16:45.551Z bb-login: own window 1772810 opened
2026-10-23T16:16:50.837Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-23T16:16:50.839Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 2 (scans: 2)
2026-10-23T16:16:50.839Z bb-login: WAITS FOR THE USER - 2 allowlisted submit buttons on the SSO page (1 needed: a picker, MFA, empty autofill or an unknown form); nothing pressed; window 1772810 left open
bb-login exit 4
```
Then (builder, on the script's own window 1772810, checked `Chrome_WidgetWin_1` of `chrome`): UIA elements named
`PRESSED*` 0 (the stand-in renames its heading if either button is pressed), elements named
`SSO stand-in (two buttons)` 2; `WM_CLOSE` → window gone. Refusals (no window opened): `-DryRunBase
https://example.com/` → `DRY RUN refused - -DryRunBase must be http://127.0.0.1:<port>/ or http://localhost:<port>/
- nothing opened`, exit 2; `-DryRunPage '../x.html'` → `DRY RUN refused - -DryRunPage must be a file name like
bb-standin.html - nothing opened`, exit 2. Server log (GET lines; the first four are the builder's own 200
probes): `bb-standin.html`, `sso-standin.html`, `favicon.ico 404`, `bb-standin.html?signedin=1`, `favicon.ico 404`,
`bb-standin-bad.html`, `sso-standin-two.html` — no request after the two-button page. Server stopped:
`Test-SafeToKill 26564` → `safe: the tree of 26564 does not contain the driver`; `Stop-Process` → 8089 listeners 0.
The script was not run against ada.blackboard.com.

## 6. Deviations

1. **SM-1's verdict moved to `sm1-log`** (it needs both the recipe's observations and the daemon log): `sm1
   --observed` writes a JSON file (no URL or title; only the held tab's events as `{atMs, lastUrlMatches}`) and
   prints no verdict; `sm1-log --observed` prints the one `SM-1 (Part 3 rule)` line and no `SM-1 LOG` line, so
   Part 2's two line names cannot appear in Part 3. Without `--observed` both commands behave as in Part 2.
2. **Stricter than #99's text, disclosed:** (e) as the brief rules; plus FAIL on two tabGone for T<a> or one with
   another lastUrl (kept from the Part 2 rule). A tabGone outside the window is a `finding:` line and does not
   count for (a).
3. **bb-login on ada.blackboard.com** now scans the page document only (not the whole window, which includes
   Chrome's toolbar) and matches `Sign in`/`Log in`/`Login` in any case (was: those five exact spellings over the
   window). The wider SSO allowlist is used **only** off ada, so a "Next"/"Continue" button on a logged-in
   Blackboard page is never pressed.
4. **https on the live SSO page is a heuristic:** Chrome hides the scheme in the address bar, so the script reads
   https from an explicit scheme, else from the absence of a `Not secure` element outside the page. Chrome does not
   show that chip for loopback hosts, so the dry run printed `assumed` and did **not** exercise the chip branch
   (no positive control; doubt 2). Its failure mode on the live site is limited to the script's own window after
   ada.blackboard.com's redirect.
5. **The sheet's SDK-6 login step**: exit `1` (a script error) is now read as `4`, recorded (the brief named 0/2/4
   only; conservative). **SM-1**: a NOT MEASURED may be rerun once under #98 (the old text said "not rerun, one
   restart"; #98 lifted the limit). **SM-0**: after any reload run that did not exit 2, the stale check is run once
   more before the next row (P3-e'), since an exit other than 0/2 leaves the extension in an unknown state.
6. **SM-0's new `closed …` line** comes after the verdict on every outcome (was a silent close before the verdict);
   informational, not in the rule; §4.19 SM-0's note says so.

## 7. Open doubts

1. **The known-good dry run printed no `invoked the one allowlisted SSO submit button once …` line**, although the
   server log shows the press took effect (`bb-standin.html?signedin=1` requested) and the script ended `SIGNED IN`.
   Cause, by reading the code: `Invoke-Once` was called inside `if (…)`, and PowerShell returns a function's
   `Write-Output` (the `Say` line) as part of its value, so the line was swallowed by the test (still truthy). The
   same swallowing hit every `Say` in it — `my window is not in front …` (then exit 2) and `the … has no Invoke
   pattern …` (then exit 4) would have exited silently, and a refused second press would have returned a truthy
   array. **Fixed after the dry runs** (mechanical, `recipes/bb-login.ps1:214-232`, `:257-258`, `:276-277`):
   `Invoke-Once` is called as a statement and reports through `$script:InvokeOk`; the press logic (one
   `$script:Pressed` guard, one `Invoke()`) and every exit code are unchanged. **Not re-run** — the brief allows one
   dry-run pair; the step agent may authorise one more known-good dry run (same command) to show the `invoked …`
   line before Part 3 (proposed below). Parse check after the fix: 0 errors.
2. The `Not secure` chip branch is untested (deviation 4); the chip's name is UI-language dependent.
3. A real SSO page may build its accessibility tree later than 10 s, or show "Next" first and a password page
   second (Microsoft's two-step form): both end in exit 4 by design (one press only).
4. `sm0`'s Part 2 open tab: why the old silent close left it open is not known; the new line will show it.

## 8. Proposed decisions (decisions.md format)

### 2026-10-23 · SM-1's Part 3 verdict is one combined line printed by `sm1-log --observed` (proposed)
**Decided:** `s6.ts sm1 --observed <file>` writes its observations (no URL or title) and prints no verdict;
`s6.ts sm1-log --since $Q --observed <file>` applies `sm1Part3Verdict` (#99 (5) made measurable, plus the step
agent's stricter log clause and Part 2's two-tabGone/lastUrl FAILs) and prints `SM-1 (Part 3 rule) PASS|FAIL|NOT
MEASURED`. **Why:** clause (a) needs both the recipe's events and the daemon log; one line with a distinct name
cannot be confused with Part 2's `SM-1 PASS` / `SM-1 LOG FAIL`. **Instead of:** two separate verdict lines under
the old names, or reading the log from inside the held recipe with its own start time (before `$Q`). **By:** Claude
(S6 builder r3).

### 2026-10-23 · `bb-login.ps1` follows ADA's SSO with one allowlisted submit (proposed)
**Decided:** off ada.blackboard.com on an https page, the script counts Edit/Button controls in the page document
and the buttons whose whole name (any case) is on a fixed submit allowlist (en/az/ru), prints only counts, yes/no
and an allowlisted host, invokes exactly one such button once, and exits 0 only back on ada.blackboard.com with no
sign-in button; else 4 with the window open. At most one press per run; the scan is retried up to 10 s; a
loopback dry run (`-DryRunBase`) with stand-in pages in `recipes/fixtures/`. **Why:** the user's #99 (1); Run 12
Part 2 landed on the SSO page with `sign-in buttons: 0`. **Instead of:** typing or reading credentials (forbidden),
or pressing a named button outside the allowlist. **By:** Claude (S6 builder r3; the user's grant #96/#99).

### 2026-10-23 · `bb-login.ps1`'s swallowed press line: fixed, one known-good dry run to confirm (proposed, mechanical)
**Decided:** `Invoke-Once` is called as a statement and reports through `$script:InvokeOk` (done by S6 builder
r3 after its dry runs); the step agent authorises one more known-good loopback dry run (`-DryRunBase
http://127.0.0.1:<port>/`, same procedure) before Part 3 to show the `invoked the one … once` line. **Why:** §7
doubt 1 — inside `if (…)` the function's `Say` lines were its return value and were never printed. **Instead
of:** a Part 3 record without the press line, or exits 2/4 with no reason printed. **By:** Claude (S6 builder r3),
for the step agent.

## 9. Hygiene of this diff (task 10)

Counted (never printed) over the added lines of `git diff HEAD` for the tracked files of §1 plus the whole of the five
new files (this report included), 2026-10-23 after the last edit: the token (read from `bridge.token` into a shell
variable, then unset) **0**; `_\d+_\d+` patterns: only the existing dry-run id `_1_1` (in quoted Part 1/2 text and
this section), after the test's two Part 2 uptimes, first written with TypeScript numeric separators (which match
the pattern), were rewritten as plain numbers; the 17 distinct `_<3+ digits>_<n>` ids in the `blackboard-ultra` skill tree (a superset of its course
table): **0** occurrences; `://` only as fixture or example URLs — `http://127.0.0.1`, `http://localhost`,
`https://ada.blackboard.com` (the script's target, as before), `https://example.com` (the dry-run refusal),
`chrome://quit`, and the code literal `'https://'`. No PNG, no `exports/` path, no `dist/` file in the pathspec.
