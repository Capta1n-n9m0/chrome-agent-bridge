# S6 — live verifier (Run 12 (S6), the part that was run), 2026-10-23

Fresh, read-only verifier (level 2: no agents, no commits, Chrome, the daemon, 9234 and Blackboard untouched;
no recipe run). Scope: the record of what WAS run — reload, S6-STALE, the daemon check, SDK-6D, SDK-7D,
SDK-2…5, the partial SDK-1 — against the expected text and rules committed before the run in `23b878f`
(`docs/e2e-test-plan.md` §4.19, `S6-wave-sheet.md`), `briefs/common.md`, `S6-run-record.md`,
`S6-daemon-log.txt` and the uncommitted §5 "Run 12 (S6)" block. Commands ran in Git Bash at the repo root.

**Verdict: PASS-with-notes.** Each recorded PASS meets its pre-written rule. SDK-1 and the stop are recorded
accurately, and nothing ran after the denial except close-down. Hygiene counts are 0 where they must be.
The notes are one MINOR (the SDK-2/SDK-3 flash clause, which the rule does not cover, plus a timing that
argues against it) and five NITs about expected-text details the record glossed.

## 1. Order, and no expected text edited after the run

```
$ git log --oneline -6
23b878f docs(step8): S6 — wave sheet, expected text, recipes (pre-run)
c53dd00 docs(step8): the user's grants for SDK-6/SDK-7 and SM-1 — decision #96
6a97635 docs(step8): S5 closed — decision #95, #59 updated; as-built S5
...
$ git diff 23b878f --stat -- docs/e2e-test-plan.md
 docs/e2e-test-plan.md | 31 +++++++++++++++++++++----------
$ git diff 23b878f -- docs/e2e-test-plan.md | grep '^@@'
@@ -1857,21 +1857,32 @@ Evidence in short (the record has every line):
$ diff <(git show 23b878f:<steps>/S6-wave-sheet.md) <steps>/S6-wave-sheet.md && echo SHEET-UNCHANGED
SHEET-UNCHANGED
```
The one hunk starts at line 1857, inside `### Run 12 (S6)` in §5. §4.19 runs from line 971 to 1069, so it is
untouched. The record shows the run at HEAD `23b878f` (set-up `git log` lines) at 13:14–13:19 UTC, after
the commit. The wave sheet is byte-identical to the pre-run version. **OK.**

## 2. Reload, then the stale check, first; NEW BUILD; build matches

- The record's first two result sections are `## Reload (step 2): exit 0`, then `## S6-STALE (step 3) — PASS`,
  and only then `## Set-up, before the reload (steps 0–1)`. That is the sheet's skeleton order (#84).
- The reload ends `RELOAD OK - the service worker restarted (UIA) …` / `reload exit 0`.
- Stale check: `STALE-CHECK NEW BUILD — the loaded extension answers locate: it is the S2-or-later build`,
  then `exit 0`. That is the sheet's step 3 "NEW BUILD ⇒ go on" outcome and the row's rule (`STALE-CHECK NEW
  BUILD` and exit 0).
- Build: the stale check's `connected — daemon build 597d6c28…4434da3f`, step 1's `daemon build: 597d6c28…`,
  the log's `config … build=597d6c28…4434da3f` (record and attached log line 2) and `build file:` all name
  the same sha. The e2e block's `Daemon build:` line matches.
- The "Set-up fix 1" attempt (`R` shadowed by `Invoke-History`) ran no recipe. The attached log's first
  line is `start pid=25652` at 13:15:30Z, and its first client is `s6-stale-check`, so no earlier client
  connected. **OK.**

## 3. PASS rows against the expected text and rules (pre-run versions)

| Row | Pre-written rule | Observed (record, verbatim) | Supported? |
|---|---|---|---|
| S6-STALE | `STALE-CHECK NEW BUILD` and exit 0 | as above | yes. NIT-1: expected `ok {"ref":"e<N>","role":"button","name":"Sign in"}`, observed `ok {"name":"Sign in","ref":"e1","role":"button"}`. Same keys in a different order (`s6.ts:136` prints `JSON.stringify(result)`). Outside the rule, and the record does not mention it |
| SDK-6D | `SDK-6 (dry run) PASS — bb.VERSION stub-2026-10-23 …`, exit 0 | every §4.19 SDK-6D line in order, the PASS line, `closed T4`, exit 0 | yes |
| SDK-7D | the four lines + `Get-FileHash` = `92FE62AB…A49C` | `… 2 columns, 4 grade records, 627 bytes, sha256 92fe62abc12d…a49c`; `MCP leg size: 626 characters → 1 chunk(s) of 8000; measurable: yes`; `… equal the page's: yes`; `written exports\dry-_1_1-2026-10-23.json …`; `SDK-7 (SDK leg, dry run) PASS`; hash `92FE62ABC12D1AC759E6B29F287520A7A486BE9150666372028E1027D389A49C` | yes, all characters equal |
| SDK-2 | `sdk2Verdict`: code, message start, first candidate `button "Sign in"`, the report's candidate / snapshot / `Screenshot:` lines, ≤ 60 lines, PNG outside the repo, `attachErrors: []` | message and `candidates (5)` exactly as expected, in the expected order (so no `finding:`); report 40 lines with `Nearest candidates:`, the five candidate lines, the `Refs:` line, the url line, `- button "Sign in" [ref=e5]`, `Screenshot: C:\Users\aliev\.chrome-agent-bridge\failures\…-T6.png`; `exists: yes; outside the repo: yes`; `attachErrors: []`; `SDK-2 PASS — …` | yes. NIT-2: expected `Network: no failed requests among the tab's last <n> entries.`, observed `… last 1 entry.` (singular). Not in the rule |
| SDK-3 | `sdk3Verdict`: exact message, the 7 matches in order, `Matches (7):` + 7 lines, nth:1 = `Fetch 404`, status `status: fetch ok.json -> 200` | all equal, character for character; `SDK-3 PASS — …` | yes. The report's 29 snapshot lines are abbreviated in the record and said to be compared in out-of-repo files (NIT-3). Same singular `entry.` as SDK-2 |
| SDK-4 | visible 1200–5000 ms, hidden ≤ 1000 ms | `ok after 1998 ms`, `ok after 9 ms`, `SDK-4 PASS — visible after 1998 ms, hidden after 9 ms` | yes |
| SDK-5 | ref `e<N>`; status matches `^status: hit at -?\d+,-?\d+ exp -?\d+,-?\d+ on=email \(isTrusted=true\)$`; `#email`; mark 0 | `→ e1`; `"status: hit at 149,295 exp 953,754 on=email (isTrusted=true)"`; `#email`; `data-__bridge-mark: 0`; before `no` / after `yes`; `SDK-5 PASS` | yes |

**The driver's observations, and whether the rule covers them:**
- **SDK-2/SDK-3 flash (record finding 3).** §4.19 states "The human's tab (Ws) is hidden for about 1.5 s
  during the call (0.5 accepts the flash)" and "a second ~1.5 s flash". That sentence describes behaviour
  the design accepts. It is not a pass condition, and `sdk2Verdict`/`sdk3Verdict` do not test it, so the
  PASS stands under the pre-written rule. The record's timings argue against the sentence, though. SDK-2's
  tab opened at 13:16:21.983, the PNG name is stamped 21.999, and the whole report was printed at 22.173.
  SDK-3 took 24.094 − 23.913 ≈ 180 ms. A switch capture that left the human's tab hidden for ~1.5 s (Runs
  8/9) cannot finish in under 200 ms unless `onActivated` now ends the 1000 ms wait early
  (`extension/src/tabs.ts:227-238` does allow that) or the capture did not switch tabs. → **MINOR-1.**
- **SDK-5 `hit` vs `exp` (record finding 4).** The rule's regex accepts any numbers, so this is covered.
  The fixture also explains the gap. `exp` is the centre of `#hit-pad`, not of the clicked element
  (`test-fixtures/e2e-playground.html:176-182`: `ex = r.left + r.width/2` of `pad = #hit-pad`). A click on
  `#email` should therefore differ from `exp`. Not a defect. The record left it "not judged" and can now
  be closed as expected.

**Actor transcript spot-check (SA, session `3b5db55b-…`, counts only):**
```
$ J=~/.claude/projects/C--Users-aliev-Projects-chrome-remote-extention/3b5db55b-b9c3-461b-8440-60d1953d8d37.jsonl
47 lines; last modified Oct 23 17:18 (local) = 13:18Z
url line 'url: http://localhost:8080/e2e-playground.html?t5=sdk1-claude   title: "Agent Bridge E2E Playground"': 1
'button "Sign in" [ref=e5]': 1
tool_use of mcp__chrome-agent-bridge__browser_snapshot: 1
"is_error":true: 0
first / last timestamp: 2026-10-23T13:17:38.100Z / 2026-10-23T13:17:47.730Z
```
The cited lines exist verbatim. There is one snapshot call, and nothing in the transcript after 13:17:47.
That matches "the second prompt never reached the actor" (`in.txt` 1 line).

## 4. SDK-1 and the denial

- Partial evidence in the record:
  - all nine expected `sdk-login` lines in order;
  - exit 0;
  - SA's first snapshot of `?t5=sdk1-claude` with `button "Sign in" [ref=e5]`;
  - the log's `client + "sdk-login" (2 clients)` / `client - "sdk-login" (1 client)`;
  - the foreground window still W1.
- It is labelled **not complete**: the row's "A's two snapshots" clause is missing. Not PASS, not FAIL.
  That is the right reading of the rule.
- The denial text is quoted, reported, not retried and not worked around (common.md stop list: "a
  permission or classifier denial").
- Nothing after the denial except close-down. The client names in the attached log, in order:
  `s6-stale-check, t5-find, boot-bb, export-grades, t5-find, s6-sdk2, t5-find, s6-sdk3, t5-find, s6-sdk4,
  t5-find, s6-sdk5, t5-find, t5-find, claude-code #29476, sdk-login (+/-), claude-code #29476 (-)`. The last
  line is `13:18:52Z client - "claude-code #29476" (0 clients)` (SA ended), and `awk '$1>"…13:18:52Z"'` → 0
  lines. No SM-0 reload, no new client, no Blackboard, and Chrome was not restarted.
- The §5 block marks every later row `not run` and SDK-1 `not complete`. **OK.**

## 5. Hygiene (counts only)

```
token: read from bridge.token into a variable (length 32), then unset
pp1 ids: the one ada-instance.md row matching -i 'pp1' (no row contains 'pp1-'): 3 ids _N_1, plus courseId and foundationsId (5 values), never printed

file                 ://   ://localhost  other://  token  pp1-ids  [line withheld:  ada.blackboard
S6-run-record.md      10        9            1        0       0           1               4
S6-daemon-log.txt      0        0            0        0       0           0               0
e2e diff               2        0            2        0       0           0               1
S6.ledger.md           –        –            –        –       0           –               –
```
- The non-localhost `://` lines are hygiene labels only (`'://' count …`): record line 381, e2e diff lines
  28/34. They are not URLs.
- `[line withheld:` 1 and `ada.blackboard` 4/1 are also label text or the pre-existing SDK-6 row
  (record lines 4, 382, 403-404; diff line 34).
- Every `localhost` URL in the record is a fixture URL (`localhost:8080/e2e-playground.html?…`), which the
  sheet allows (B2).
- The daemon log is 0/0/0.

```
$ ls ~/.chrome-agent-bridge/failures/*.png 2>/dev/null | wc -l
0
$ git check-ignore exports/x.json
exports/x.json
$ ls exports 2>/dev/null
(nothing)
$ git status --short
 M docs/e2e-test-plan.md
 M docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6.ledger.md
?? docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-daemon-log.txt
?? docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-run-record.md
```
`git status` lists exactly the four expected paths (this report is written after the check). **OK.**

## 6. Watch items and findings in the record

- Watch items match the evidence:
  - SDK-4 1998 ms is under every bound.
  - The mark count is 0.
  - The reload "same-second" item is correctly called untestable: no daemon ran at the press, and the first
    `resync` is 13:15:39Z, from the stale check's spawn. The reload exit time 13:15:15.697Z it quotes is not
    in the reload block, whose last line is 15.660Z (NIT-4).
- Findings 1–4 match the evidence:
  - Finding 4 can be closed (see §3).
  - Finding 3's "not established" is accurate.
  - Finding 2 (the `R` alias) is real and changes no row.

## Findings

- **MINOR-1 — the SDK-2/SDK-3 flash.** The record is accurate, and the PASS stands under the pre-written
  rule. However, the ~180–190 ms report timings conflict with §4.19's "hidden for about 1.5 s" and with the
  Step 7 flash measurements. Either the activation wait now ends on `onActivated`, which would contradict
  CLAUDE.md's flash gotcha, or the failure-report capture did not switch tabs. In the second case the PNG
  could show the human's visible tab rather than the failed one. Here that tab was a fixture (Ws), so there
  is no exposure in this run. The two PNGs having the same size (35 312 B) does not settle it. Suggest a
  probe in the resumed wave: page-side `visibilitychange` on Ws during `s6.ts sdk2`, or a hue check of the
  report PNG against a marked target tab, before relying on the report screenshot.
- **NIT-1** — the S6-STALE `ok {…}` key order differs from the expected text (outside the rule; not noted
  in the record).
- **NIT-2** — SDK-2/SDK-3 print `last 1 entry.`, where the expected text has `last <n> entries.` (outside
  the rule; the record says only "the `Network: no failed requests …` branch").
- **NIT-3** — SDK-3's report snapshot lines are abbreviated in the record ("byte-identical", compared in
  `%TEMP%` files that are not attached).
- **NIT-4** — the reload exit time 13:15:15.697Z in the watch items does not appear in the reload block.
  The hygiene bullet "the two dry-run files were never created as live files; the one dry-run file …" is
  garbled.
- **NIT-5** — the §5 heading still reads `### Run 12 (S6) — <date>` (a context line; the date is filled in
  the block below it).

No BLOCKER, no MAJOR.
