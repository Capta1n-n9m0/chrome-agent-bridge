# S6 verifier r3 — S6 Part 3 pre-run work

Written 2026-10-23 by the S6 pre-run verifier (round 3, Claude Opus 5.5), level 2. Base HEAD `0a6c82c`; the work
under review is the main tree's uncommitted diff (8 tracked files) plus the untracked `recipes/fixtures/` (4 pages)
and `S6-builder-r3.md`. Nothing was committed, no agent was spawned, Blackboard was not contacted, and no file
in the main tree was edited except this report. The only live action: `bb-login.ps1`'s loopback dry runs (check 3).

## Verdict: FAIL

One MAJOR finding: in live mode, `bb-login.ps1` treats *any* https-or-"assumed" page off ada.blackboard.com as the
SSO page and would press its one allowlisted button whatever the host. This contradicts the expected text the
builder registered and the script's own refusal message. It is a small fix, and it must land before P3-h. Everything else
passes: the re-registrations match their rulings, the new rule holds and can fail, the suite count is the expected
one, and the hygiene counts are 0. Two MINOR sheet fixes and four NITs are listed below.

| # | Severity | Finding |
|---|---|---|
| F1 | MAJOR | Live SSO branch: no host check. A press can happen on an unknown host, or with an unreadable address bar. The code contradicts the §4.19 SDK-6 note and its own `:274` message |
| F2 | MINOR | "https by absence of the Not-secure chip" is not conservative on its own and has no positive control |
| F3 | MINOR | P3-e/P3-e' carry on with the wave after a reload exit other than 0/2, which goes against the integrity floor and P3-b |
| F4 | MINOR | P3-i does not amend step 8's "wait for `SM-1 PASS\|FAIL\|NOT MEASURED`", which Part 3's `sm1` never prints |
| N1 | NIT | `sm1Part3Verdict`'s log window starts at the quit's whole second, so a line in that second before `$Q` counts |
| N2 | NIT | The Alt tap before `SetForegroundWindow` goes to whichever window is in front (it was already there before this change) |
| N3 | NIT | Most bad-case tests assert only `pass === false`. They start from a passing base, so they still discriminate |
| N4 | NIT | The address bar is an Edit control and its value is read, in memory only. This is disclosed |

## Check 1 — re-registrations vs rulings

Commands: `git diff docs/e2e-test-plan.md > e2e.diff`, plus a difflib comparison of each removed row against its
added row (`scratchpad/cmp.py`).

```
== LOC-1 ★ old 676 new 2472     insert '' -> '*2026-10-23 (S6 Part 3, #99/#100, before its re-run; … (#99) (5): "the typed value is read by a tool output"): …'
== ASREF-1 ★ old 546 new 840    insert '' -> "*Superseded 2026-10-23: was `2` then `(no ref: the result is not an element)`, because … (#99 (6)); Run 12's FAIL stays recorded.* (The note covers the optional clause only; …)"
== REP-1 ★ old 1074 new 4037    insert '' -> '*2026-10-23 (S6 Part 3, #99/#100, … `…-steps/S6b.md` §5 second block): …'
== SDK-6 old 3447 new 6139      insert … (two inserts: the login step's Part 3 note)
== SM-0 ★ old 1383 new 2115     insert '' -> '*2026-10-23 (S6 Part 3, #99 (1), (3), before its re-run; the expected text and rule above are unchanged): …'
== SM-1 old 4743 new 8894       insert '' -> '*2026-10-23 (S6 Part 3, #99/#100, before its re-run): Part 3 judges SM-1 by a new pre-registered rule …'
```
Every change is a pure insert. All the old text is kept, and every note is dated. Hunks: `@@ -963,10` and `@@ -998,11` only. §5 starts at
line 1054 and `### Run 12 (S6)` sits at line 1870, so no Run 12 line in §5 was touched. `git diff --stat -- …/S6-run-record.md` printed
nothing.

- **SM-1 vs #99 (5):** the note quotes #99's clause verbatim. (a) "gone by tabGone at the quit or by the session change",
  (b) `snapshot` → `TAB_GONE` and (c) "no handle minted before the quit resolves after it", read as "listTabs lists no
  handle ≤ T<m>", are all there. The step agent's stricter clause is (e): exactly one `extension session changed: <n> handles
  retired` line after `$Q`, any n, no marker value, resync ≤ 30 s after it. The unchanged clauses are kept as (d): no tab owned
  by the recipe, pid, build, `reconnected: no`, uptime, counts, FAIL on a live T<a>. The note also keeps Part 2's two-tabGone /
  other-lastUrl FAILs, a disclosed tightening. The code (`recipes/s6-rules.ts` `sm1Part3Verdict`) implements exactly
  (a)–(e) as written.
- **LOC-1:** call 2 `browser_evaluate {"expression":"document.getElementById('email').value"}` → `a@b.com`. Citations
  checked:
  ```
  $ sed -n 31p test-fixtures/e2e-playground.html
        <input id="email" type="text" form="login-form" />
  $ sed -n 149p extension/src/evaluate/result.ts
    return cap({ kind: "json", value: r.value, description: asString(r.value), truncated: false }, maxChars);
  $ grep -n "function asString" -A3 extension/src/evaluate/result.ts   → return String(v);
  $ sed -n 705-710p mcp/src/tools/registry.ts
        const lines = [envelope.description];
        if (typeof envelope.ref === "string") lines.push(`[ref=…`);
        else if (asRef === true) lines.push("(no ref: the result is not an element)");
        if (envelope.kind === "node") …   if (envelope.truncated) …
  $ sed -n 178p mcp/src/tools/registry.ts
    if (ref !== undefined && locator !== undefined) return { error: toolError(`${tool} takes ref or locator, not both`) };
  ```
  A plain string therefore prints as exactly one line, unquoted. Run 12 Part 2's printed lines `Typed into textbox "Email address"`,
  `Clicked button "Click counter"` and `browser_click takes ref or locator, not both` (S6-run-record.md:823/825/833) match the
  note. The LOC/ASREF/REP tool list includes `browser_evaluate` (wave sheet :428).
- **REP-1 vs S6b.md §5 second block:** code line first, last report line `failedLine`, then the notice only if the cursor
  was re-claimed, no `is_error`, ≥ 1 image part in that call's own tool_result counted with `count-images.mjs`, and the
  `[Image: source: …]` part. All present, and the unchanged clauses are kept. Exact string:
  ```
  $ STR='The call failed (LOCATOR_NOT_FOUND). This result is not flagged as an error only so that the screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them, drop images from error results).'
  $ grep -cF "$STR" docs/e2e-test-plan.md            → 1
  registry.ts:54-56: `The call failed (${code}). This result is not flagged as an error only so that the screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them, drop images from error results).`
  ```
  The sheet's row cites it as `failedLine("LOCATOR_NOT_FOUND")` (0 literal copies there), which is fine because the note holds the literal.
  Run 12's message (211 characters) is under the 300-character `Full message:` threshold, so "no `Full message:`" holds.
- **ASREF-1:** one dated *Superseded* note on the optional clause only, and the row is not re-run. **SM-0:** the expected text and rule
  are unchanged (pure insert). The note adds the informational `closed …` line and the reload rule.

## Check 2 — dry runs of the new checks

```
$ npx vitest run recipes/
 Test Files  4 passed (4)
      Tests  151 passed (151)
```
151 in 4 files, as the builder claimed. The 13 new tests start from Part 2's measured run (PASS) and change one field at a time. That is discriminating
even where only `pass === false` is asserted (N3).

Extra cases the builder did not write (`npx tsx scratchpad/sm1probe.ts`, importing `recipes/s6-rules.ts`):
```
good part2 => PASS []
bad: other pre-quit handle == T<m> (tab T214, maxPre 216, T216 listed) => FAIL ["listTabs after the restart lists handle(s) minted before the quit (≤ T216): T216"]
bad: resync 31 s after => FAIL ["the resync came 31 s after the session-changed line (> 30 s)"]
edge: resync 30 s after => PASS []
bad: session changed line in quit's second but before $Q only (no line after) => PASS []      ← N1
bad: retired n>=1 claimed but snapshot answers => FAIL ["snapshot T216 after the restart answered — a live T216"]
bad: tabGone at quit but session-changed has marker => FAIL ["the session-changed line carries more than the count (a marker value?)"]
bad: T<a> listed after restart (uppercase same) => FAIL ["listTabs still lists T216 — a live T216", "listTabs after the restart lists handle(s) minted before the quit (≤ T216): T216"]
bad: tabGone before $Q (stale) and 0 retired => FAIL ["T216 not shown gone: … retired 0 (≥ 1 needed without the tabGone)"]
```
`s6.ts`: `sm1 --observed` writes `{flag:"wx"}` to an absolute path outside the repo (`observedPath` refuses a path inside the repo, a file that already exists or a missing
directory) and prints no Part 2 verdict. `sm1-log --observed` prints only `SM-1 (Part 3 rule) …`, with exit 0/1/3. `report()` only
sets `process.exitCode`, so `sm0`'s new close after the verdict always runs.

`count-images.mjs` (usage `node count-images.mjs <file.jsonl> <tool name>`, matching the sheet's invocation) on the S6b
transcripts (`~/.claude/projects/C--…-scratchpad-s6b-probe/<id>.jsonl`, ids from `s6b-probe/sessions.txt`):
```
v1 transcript: "tool_results":[{"is_error":false,"content_types":["image","text"],"image_parts":1}],"images_in_tool_results":1
v2 transcript: "tool_results":[{"is_error":false,"content_types":["text","image","text"],"image_parts":1}],"images_in_tool_results":1
v3 transcript: "tool_results":[{"is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0
v2.out.jsonl:  "images_in_tool_results":1      v3.out.jsonl: "images_in_tool_results":0
```
The positive controls (V1/V2 ≥ 1) and the negative control (V3 = 0) hold. Its object walk is recursive, so `t5-actor`'s wrapped `out.jsonl`
(`{"t","m":…}`) is counted too.

## Check 3 — `bb-login.ps1`

Static review, line by line:
- Never reads a page Edit's value: `Get-Scan` only counts Edits (`:186`). Button names are compared in memory (`:188`, `Norm`)
  and never printed. The omnibox value is read in memory (`:150`), which is disclosed (N4).
- Never types into the page: there is no SendKeys or SetValue on the page. One Alt tap (`:222`) runs only while its own window is *not* in front,
  so it goes to the foreground window (N2, already in the fixer-r1 version: `git diff` shows it moved, not added).
- At most one press per run: there is one `$script:Pressed` guard and one `Invoke()` (`:228-229`). Each path calls `Invoke-Once` once, then
  `Finish-AfterPress` always exits. The `Invoke-Once` fix (called as a statement, `$script:InvokeOk`) is right: the exits
  inside it (`:225` exit 2, `:227` exit 4) now print their reason.
- Prints: counts, yes/no and `$hostShown` (an IdP or under-ada.edu.az host only, else `other host`). The window handle is printed;
  no URL, path, query, title or name. Exits are 0/2/4, with 1 for an uncaught error (`$ErrorActionPreference='Stop'`).
- The `-DryRunBase` guard (`:85`), run on bad inputs (no window is opened, exit 2 each):
  ```
  [https://example.com/] exit 2 :: … DRY RUN refused - -DryRunBase must be http://127.0.0.1:<port>/ or http://localhost:<port>/ - nothing opened
  [http://127.0.0.1@example.com:8089/] exit 2 :: … DRY RUN refused …
  [http://localhost.example.com:8089/] exit 2 :: … DRY RUN refused …
  [http://[::1]:8089/] exit 2 :: … DRY RUN refused …
  [ftp://127.0.0.1/] exit 2 :: … DRY RUN refused …
  [http://127.0.0.1:8089/ page=../x.html] exit 2 :: … DRY RUN refused - -DryRunPage must be a file name like bb-standin.html - nothing opened
  ```
- Allowlist (`:109-115`): whole-name match on sign in, log in, login, log on, next, submit, continue and the az/ru words.
  An account tile's name (an e-mail address or a person's name) cannot equal any of them. Parse: 0 errors; non-ASCII bytes: 0.

**F1 (MAJOR) — no host check on the live SSO branch.** `:268`:
```
  $isSso = $w.Https -ne 'no' -and $w.Https -notlike 'no *'
```
The host takes no part in this test: `$underAda` and `$IdpHosts` only choose what is *printed* (`:269`). Yet `:274` says
`… a page that is not the SSO page (not https, or an unknown host) …`, and the §4.19 SDK-6 note registers "`<a>` = 0 or ≥ 2, **or
a page that is not the SSO page (not https, or an unknown host)** ⇒ `WAITS FOR THE USER …` (exit 4)". As written, a
redirect to any host that reads https or "assumed" and shows exactly one button named e.g. `Continue` or `Next` is pressed.
That could be an unexpected third-party page, a consent page or an error page. The address bar does not need to be readable either: `Get-Addr` returns `''` on
an exception, `Get-Where('')` gives host `''` and, with the scheme hidden, https `assumed`, so `isSso` = yes. The dry run cannot catch this. In
dry mode `isSso` is plain host equality with the other loopback name (`:265`), so the live predicate is never run. Fix (mechanical,
conservative): live `$isSso = ($underAda -or $IdpHosts -contains $w.Host) -and <https not 'no'>`. Then add one known-bad dry
run where the SSO page sits on a host that is not the stand-in (for example, make the dry-mode predicate the same allowlist test against a third
loopback name) and confirm exit 4 with nothing pressed.

**F2 (MINOR) — the https inference.** `Get-Where` reads https from an explicit scheme, else as "assumed" when no element
named exactly `Not secure` is found outside the page (`:154-161`, `:165-170`). That is absence-of-evidence ⇒ yes, so it is **not
conservative** on its own: in a non-English Chrome UI, or if Chrome 156's chip exposes another accessible name, an http page reads
`assumed`. On loopback Chrome shows no chip, so the dry run printed `assumed` and never ran the chip branch, which leaves it without
a positive control (builder doubt 2). Its worst case is an extra press on an http page, which F1 makes reachable. Once F1's host allowlist
is in place, the inference is only a backstop (the IdP hosts are https-only), and that is acceptable if it is recorded as unproven.

Live dry runs (post-edit; the server on 127.0.0.1:8089, hidden; `scratchpad/dryrun.ps1`, output verbatim):
```
listeners on 8089 before: 0
chrome processes: 10
server pid 32700
bb-standin.html -> 200 1024 bytes
bb-standin-bad.html -> 200 709 bytes
sso-standin.html -> 200 1192 bytes
sso-standin-two.html -> 200 1085 bytes
--- KNOWN-GOOD ---
2026-10-23T16:30:30.803Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8089); no real site is contacted
2026-10-23T16:30:31.287Z bb-login: own window 2165710 opened
2026-10-23T16:30:36.562Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-23T16:30:36.564Z bb-login: SSO scan: document: yes; Edit controls: 2; Button controls: 2; allowlisted submit buttons: 1 (scans: 2)
2026-10-23T16:30:36.581Z bb-login: invoked the one allowlisted SSO submit button once (the autofilled form submitted; nothing typed, nothing read)
2026-10-23T16:30:44.718Z bb-login: after submit: on the blackboard stand-in (127.0.0.1): yes; sign-in buttons: 0 (document: yes; scans: 2)
2026-10-23T16:30:44.723Z bb-login: SIGNED IN - SSO autofill + one submit; own window 2165710 closed
bb-login exit 0
--- KNOWN-BAD ---
2026-10-23T16:30:47.186Z bb-login: DRY RUN on the loopback stand-ins: blackboard = 127.0.0.1, SSO = localhost (port 8089); no real site is contacted
2026-10-23T16:30:47.663Z bb-login: own window 4066480 opened
2026-10-23T16:30:52.929Z bb-login: after load: on the blackboard stand-in (127.0.0.1): no; SSO page: yes; host under ada.edu.az: no; host: stand-in SSO host (localhost); https: assumed (scheme hidden, no Not secure chip)
2026-10-23T16:30:52.929Z bb-login: SSO scan: document: yes; Edit controls: 1; Button controls: 2; allowlisted submit buttons: 2 (scans: 2)
2026-10-23T16:30:52.931Z bb-login: WAITS FOR THE USER - 2 allowlisted submit buttons on the SSO page (1 needed: a picker, MFA, empty autofill or an unknown form); nothing pressed; window 4066480 left open
bb-login exit 4
window 4066480 class: Chrome_WidgetWin_1; process: chrome
elements named PRESSED*: 0
elements named 'SSO stand-in (two buttons)': 2
window 4066480 still exists after WM_CLOSE: False
--- server log (GET lines) ---
GET /bb-standin.html HTTP/1.1" 200 -          (the four 200s are my own probes)
GET /bb-standin-bad.html HTTP/1.1" 200 -
GET /sso-standin.html HTTP/1.1" 200 -
GET /sso-standin-two.html HTTP/1.1" 200 -
GET /bb-standin.html HTTP/1.1" 304 -
GET /sso-standin.html HTTP/1.1" 304 -
GET /bb-standin.html?signedin=1 HTTP/1.1" 304 -
GET /bb-standin-bad.html HTTP/1.1" 304 -
GET /sso-standin-two.html HTTP/1.1" 304 -
safe: the tree of 32700 does not contain the driver
listeners on 8089 after: 0
chrome processes: 10
```
Both outcomes are as expected. The good run now prints the `invoked … once` line (builder doubt 1 is closed). In the bad run nothing was pressed and no request
followed the two-button page. The script's leftover window (its own, `Chrome_WidgetWin_1` of `chrome`) was closed by WM_CLOSE, and no other
Chrome window or tab was touched. The server was stopped by its PID after `Test-SafeToKill` printed `safe`.

## Check 4 — full suite, clean worktree

`git worktree add scratchpad/s6p3-verify HEAD` → `HEAD is now at 0a6c82c`. Then `git apply` of `git diff --binary`, the
4 fixtures and `S6-builder-r3.md` were copied in (`git status --short` showed the same 8 M + 2 ?? as the main tree), and:
```
npm ci            → exit 0
npm test          → Test Files 84 passed (84) · Tests 1696 passed (1696) · exit 0
npm run typecheck → exit 0
npx tsc --noEmit -p recipes/tsconfig.s6.json → exit 0
```
That is 1683 + 13 = 1696 in 84 files, as expected. The worktree was removed (`git worktree list` → only the main tree). The main tree's dists:
`597d6c28…34da3f daemon/dist/index.js`, `4b07b464…3153 mcp/dist/index.js`, which equal P3-a's expected hashes.

## Check 5 — the Part 3 sheet section

- Order: P3-a set-up → **P3-b stale check as the first result line** → P3-c daemon → P3-d window → P3-e SM-0 (→ P3-e') →
  P3-f LOC-1 → P3-g REP-1 → P3-h SDK-6/7 live (SSO, MCP leg actor M, S6.3 byte-compare via steps 4–9) → P3-i SM-1 last.
  MUX-8 is not re-run and ASREF-1 is not re-run. All correct.
- Fresh actors: LO3 for LOC-1 and RP for REP-1 (started after the S6b build). The failures-folder rule is written for REP-1 (`$F0`/`$F1`, deleted unopened) and
  for M (count only). The reload rule is there: `Set-T5Topmost -Off` before each run, ≤ 3 runs, only exit 2 re-run, ≥ 30 s of hold or a fresh
  `sm0`. The evidence rules are complete: OS frames are cropped or judged by numbers and never viewed; no Blackboard content, ids, titles or URLs; `exports/` is left out of commits; a denial is
  recorded, not retried, and that line stops. Every row has a written pass rule (rows table).
- Builder's additions: one SM-1 re-run after NOT MEASURED is consistent with #98 (unlimited restarts). Login exit 1 ⇒ as 4 is
  conservative (an error after a press is never retried). The stale check after an SM-0 reload is a sound addition, **except F3**.

**F3 (MINOR).** P3-e: "a **third exit 2**, or **any exit other than 0 or 2**, ⇒ SM-0 **not measured**, that line stops
(integrity floor), and the next step is P3-e'". P3-e' then goes on to LOC-1 if `STALE-CHECK NEW BUILD`. The integrity floor
(common.md) lists "an extension reload whose script (recipes/reload-extension.ps1) exits non-zero" as an item that *waits for
the user*. #99 (1) exempts only exit 2. P3-b itself says "the reload (exit `0` required, else STOP and ask the user)". Exits
3 (pressed, not verified), 4 (its own window left open) and 1 (error, maybe after the press) are not covered by any grant. Also,
the stale check cannot tell a reloaded extension from an un-reloaded one (no new build in Part 3), so it does not make up for the
missing ruling. Fix: an exit other than 0/2 ⇒ STOP the live part and ask the user (as in P3-b).

**F4 (MINOR).** P3-i amends steps 3 and 9 and skips 5 and 10, but leaves step 8 as "Then wait for `SM-1 PASS|FAIL|NOT
MEASURED`". With `--observed`, `sm1` prints neither `SM-1 PASS` nor `SM-1 FAIL`. It ends with `the verdict is sm1-log's
"SM-1 (Part 3 rule)" line …` or `SM-1 (Part 3 rule) NOT MEASURED — …` (`recipes/s6.ts`, observed branch). A literal
driver would wait for a line that never comes. Fix: in P3-i, "step 8 waits for `the verdict is sm1-log's …` or `SM-1 (Part 3 rule)
NOT MEASURED`".

## Check 6 — hygiene (counts only, nothing printed)

Run over the added lines of `git diff` plus the whole of the 5 untracked files:
```
token (read from bridge.token into a variable, then unset): token hits: 0
_\d+_\d+ distinct: _1_1            (pre-existing: git grep -c '_1_1' HEAD -- docs recipes → 10 files)
the 17 distinct _<3+ digits>_<n> ids in ~/.claude/skills/blackboard-ultra: total hits 0
dist/ | exports/ | .png in git status --untracked-files=all: 0
ada.blackboard.com/<path> in bb-login.ps1 / S6-builder-r3.md: 0 / 0
```

## NITs

- **N1:** `sm1Part3Verdict` keeps lines from `floor($Q to the second)` (the same as Part 2's `sm1LogVerdict`), so a session-changed line
  in the quit's second, logged before `$Q`, counts (shown PASS above). This is practically unreachable, because the line comes only on the extension's hello
  after the restart, and the restart's own line would make two (FAIL). Consider starting the window at the first second after `$Q`.
- **N2:** the Alt tap `keybd_event(0x12)` (`:222`) reaches the window in front, which could be the user's. It was already there before this change, it is harmless, and it is
  outside "into the page".
- **N3:** the bad-case tests assert `pass === false`. That is sufficient from a passing base, but asserting the reason would pin which clause fired.
- **N4:** the header says "never reads an Edit control's value", but the address bar (an Edit control, `OmniboxViewViews`) is read in memory. This is
  disclosed at `:149` and `:19`. Wording only.

## Re-check after fixer r1

Re-checked 2026-10-23 by the S6 Part 3 verifier (level 2, Claude Opus 5.5) against the uncommitted diff on
`0a6c82c` and `S6-fixer3.md`. No agent, no commit, no edit outside this section, no Blackboard contact; the
only live actions were `bb-login.ps1`'s three loopback dry runs in windows it opened itself.

1. **F1 — fixed.** By reading: `$pat.Invoke()` exists only in `Invoke-Once` (`bb-login.ps1:254`), called from
   two places: `:282` (host exactly `$BbHost`, one Blackboard sign-in button) and `:306`, reached only past
   `if (-not $isSso) { … exit 4 }` (`:301-304`) with `$isSso = $hostOk -and -not $httpsVeto` (`:293`) and
   `$hostOk = Test-SsoHost …` (`:291`), then exactly one allowlisted button. `$script:Pressed` caps it at one
   press. Empty address bar → `AddrRead` false and host `''` → `Test-SsoHost` false (`:134`); an unparsable or
   relative string → host `''` (`:179-180`). The refusal prints `address bar unreadable` / `other host` / `read
   as http`, never the host; the host is printed only when `$hostOk` (`:294-297`). Edits are only counted
   (`:209`), nothing is typed. Harness (`scratchpad/v/host.ps1`: `Test-SsoHost` and `Get-Where` extracted from
   the script's AST, chip stubbed false; parse errors 0), live list:
   ```
   ada.edu.az / sso.ada.edu.az/x / https://login.microsoftonline.com/common / ADA.EDU.AZ   → ok=True
   evil.com:443@sso.ada.edu.az → host sso.ada.edu.az ok=True   (userinfo; the real host is sso.ada.edu.az)
   http://sso.ada.edu.az/      → ok=True, https=no              (vetoed live by $httpsVeto)
   evilada.edu.az, evil-ada.edu.az, ada.edu.az.evil.com, login.microsoftonline.com.evil.com,
   evil.com/ada.edu.az, ada.edu.az@evil.com (host evil.com), evil.com?x=.ada.edu.az, evil.com#.ada.edu.az,
   login.microsoft.com, xn--ada-edu-az.evil, sso.localhost:8089/x, localhost:8089/x   → ok=False
   evil.com\@ada.edu.az, .ada.edu.az, 'not a url %%' → host '' ok=False;  '' → host '' ok=False read=False
   ada.edu.az. (trailing dot) → ok=False (fails closed)
   dry list @('localhost'): localhost:8089/a True; sso.localhost, 127.0.0.1, localhost.evil.com, evil.localhost False
   ```
   No suffix trick passes.
2. **Dry runs — as claimed** (`scratchpad/v/dry.ps1` = the fixer's driver with its own log name; output
   `scratchpad/v/dry.out.txt`). Port 8089 free before and after; chrome processes 10 before and after; server
   pid 30184. Known-good: `invoked the one allowlisted SSO submit button once …`, `SIGNED IN - SSO autofill + one
   submit; own window 4656398 closed`, exit 0. Two buttons: `allowlisted submit buttons: 2`, `WAITS FOR THE USER
   - 2 allowlisted submit buttons …`, exit 4, `PRESSED*: 0`, window `Chrome_WidgetWin_1`/`chrome`, closed by
   WM_CLOSE. Other host: `SSO page: no; … host: other host`, `allowlisted submit buttons: 1`, `WAITS FOR THE
   USER - off the blackboard stand-in (127.0.0.1) on a page that is not the SSO page (other host: …); nothing
   pressed`, exit 4, `PRESSED*: 0`, closed. Server log: 13 GET lines (6 probes, then every page incl.
   `bb-standin.html?signedin=1`, all 304); `pressed` occurs 0 times. `safe: the tree of 30184 does not contain
   the driver`; stopped; `tasklist` finds no 30184.
3. **F2 — can only block:** `$httpsVeto` enters only as `-and -not` (`:293`); dry runs set it false. **F3** —
   sheet P3-e (`:200-206`) and the SM-0 row: a third exit 2 or any exit other than 0/2 ⇒ not measured and STOP;
   P3-e' only after exit 0. Correct. **F4** — P3-i's three strings match `recipes/s6.ts:431,433,435` byte for
   byte, `extension back` matches `:383`, step 9's `SM-1 (Part 3 rule) PASS|FAIL|NOT MEASURED — …` matches
   `:465-470`. **N1** — test `s6-rules.test.ts:380-384` present; discriminating: `Date.parse` of the line
   (`15:08:17Z`) is `< Q` (`15:08:17.8649083Z`) but `≥` its truncation (node: `false true`), so without the
   truncation the count is 1 and the test would fail.
4. `npx vitest run recipes/` → 4 files, 152 passed; `npx tsc --noEmit -p recipes/tsconfig.s6.json` → exit 0;
   `npm run typecheck` → exit 0; `npm test` (main tree, 22 s) → 84 files, **1697 passed** (1696 + the N1 test).
5. Hygiene over the diff's added lines + every untracked file (1593 lines), nothing printed: token 0;
   `_\d+_\d+` other than `_1_1` 0; the skill's 17 course-table ids 0; `dist/` / `exports/` / `.png` in
   `git status --untracked-files=all` 0; `git diff` of `S6-run-record.md` 0 bytes.

NIT (no action): `evil.com\@ada.edu.az` parses to an empty host in .NET (Chrome would show `evil.com`); it fails
closed as `other host`, so it is harmless. The https backstop stays unproven, as recorded.

**Verdict: PASS.**
