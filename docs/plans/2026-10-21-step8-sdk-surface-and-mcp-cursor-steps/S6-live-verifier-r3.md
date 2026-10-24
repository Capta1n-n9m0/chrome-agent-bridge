# S6 live verifier r3: Run 12 (S6) Part 3 record

Fresh level-2 verifier, 2026-10-23. I made no live bridge calls, did not contact Blackboard, opened no PNG
or OS frame, and printed no token, Blackboard URL, id or title. I changed nothing except this file.
Under review: the uncommitted `## Part 3 — 2026-10-23, 16:52–17:01 UTC` section of `S6-run-record.md`, the
Part 3 span of `S6-daemon-log.txt`, the Run 12 (S6) Part 3 paragraph in `docs/e2e-test-plan.md` §5, and the
ledger lines. I read them against the wave sheet's "Part 3 (2026-10-23, after S6b)" section and its rows,
"SDK-6/SDK-7 live", "SM-1 and MUX-8", §4.18 LOC-1/REP-1 and §4.19 SM-0/SM-1/SDK-6 with their Part 3 notes,
and decisions #96–#100.

## Verdict: PASS-with-notes

Every Part 3 verdict follows its pre-written rule from the recorded lines, and every raw source I could reach
matches the record verbatim. Nothing that decides a rule was edited after `036909f`. Hygiene counts are 0.
There are 2 MINOR findings and 4 NITs. None of them changes a row's verdict.

## 1. Order and freeze

- `git log -1 --format='%H %cI' 036909f` → `036909fe… 2026-10-23T20:49:46+04:00` (= 16:49:46Z). Part 3's first
  recorded line is `time 16:52:03.713Z` (P3-a set-up). P3-b's stale check (16:52:28Z) is the first result line,
  and only set-up lines come before it. `git log 036909f..HEAD --oneline | wc -l` → `0`.
- `git status --short` lists only 4 files, all `M`: `docs/e2e-test-plan.md`, `S6-daemon-log.txt`,
  `S6-run-record.md` and `S6.ledger.md`. `git diff --stat` → 506 insertions.
- `git diff 036909f --stat -- recipes <sheet> briefs mcp daemon sdk shared extension test-fixtures docs/decisions.md` →
  empty. The e2e plan has one hunk only, `@@ -1931,0 +1932,28 @@` (the §5 paragraph), with 0 removed lines. The
  record, log and ledger also have 0 removed lines each. No expected text, rule or recipe changed.

## 2. Verdicts against the pre-written rules

- **S6-STALE (P3-b) PASS.** `STALE-CHECK NEW BUILD …`, exit 0. That outcome means no reload under R-b. P3-e'
  also printed NEW BUILD.
- **Daemon (P3-c) PASS.** The `config … build=597d6c28…34da3f` in the attached log equals the stale check's sha
  and the P3-a hash `597D6C28…34DA3F`.
- **SM-0 PASS.** Reload run 1 exited 0 and `sm0.out` has `SM-0 PASS — the reload kept T261 …`. Log check on the
  attached file: `awk '$1>="…16:53:10Z" && $1<"…16:59:02Z"' | grep -c 'extension session changed'` → `0`, and the
  same window holds `2026-10-23T16:53:12Z extension resync: 5 tabs, 0 gone`. Over the whole Part 3 span there is
  exactly 1 `session changed` line: SM-1's, at 16:59:15Z.
- **LOC-1 PASS.** I parsed LO3's raw `out.jsonl` (the `{t,m}` wrapper):
  - the tool calls were `ToolSearch, browser_type, browser_evaluate, browser_click, browser_snapshot, browser_click`;
  - the results were `"Typed into textbox \"Email address\""`, then `"a@b.com"` (call 2: exactly one line), then
    `"Clicked button \"Click counter\""`, then a snapshot containing `- button "Click counter: 1" [ref=e6]`;
  - call 5 has `is_error=true` and `"browser_click takes ref or locator, not both"`.
  - Every clause holds. `ToolSearch` loads deferred schemas and is not a bridge call, as in Parts 1 and 2.
- **REP-1 PASS.**
  - I re-ran the counter on the transcript:
    `node mcp/test/probe/count-images.mjs ~/.claude/projects/C--Users-aliev-Projects-chrome-remote-extention/4f4e8134-3ab0-4e0b-a759-06cfc578741e.jsonl mcp__chrome-agent-bridge__browser_click` →
    `…"tool_results":[{"tool_use_id":"toolu_01WF5GBVH69975eRYyUZjz54","is_error":false,"content_types":["text","image","text"],"image_parts":1}],"images_in_tool_results":1,"images_in_toolUseResult":1,"raw_image_tokens":2,…`.
    This matches the record, except that `"lines"` now reads 70 against the recorded 68 (NIT-3).
  - The same command on `s6-run3\actors\RP\out.jsonl` gives output identical to the record's line
    (`"lines":17`, `images_in_toolUseResult":0`).
  - Script check on both files (`last.mjs`, scratchpad) gives the same result for each: `is_error: undefined`,
    41 text lines, line 1 starts with `LOCATOR_NOT_FOUND: no button named "No such button".`, and
    `last==failedLine: true` against `registry.ts:54-56` `failedLine("LOCATOR_NOT_FOUND")`. There is no
    `Full message:` line, there is a `- button "Sign in" [ref=e5]` line, and there is 1 `Screenshot:` line.
  - The failures folder went from F0 0 to F1 1, and the new file's name is the printed `…-T265.png`.
- **SDK-6/SDK-7 live: waits for the user (correct).**
  - `bb-login.ps1` exited 4. That is the sheet's outcome for "waits for the user".
  - There is exactly one `invoked the one allowlisted SSO submit button once` line, and the script refuses a second
    press (`bb-login.ps1:243`). Nothing was retried.
  - boot-bb, export-grades, the plan, actor M, assemble-mcp, S6.3 and close-bb-tab are recorded as not run.
    `ls exports | grep -c pp1` → `0`. No Blackboard read or write is recorded.
- **SM-1 PASS (Part 3 rule).**
  - I re-ran `sm1Part3Verdict` (via `npx tsx`, importing `recipes/s6-rules.ts`) on `s6-run3\sm1-observed.json`
    with since `2026-10-23T16:59:02.6537526Z` (`Q.txt`), once against the attached log and once against
    `s6-daemon-part3.log`. Both returned `{"pass":true,"why":[],"findings":[],"retired":0,"line":"T268 gone by
    tabGone at the quit (+1539 ms after $Q); …; one session-changed line (0 retired), resync +0 s"}`. That is the
    recorded line, verbatim.
  - Negative control (a second tabGone added) → `pass: false`.
  - The log after $Q holds exactly one `extension session changed: 0 handles retired` line, with the resync in the
    same second.
  - The daemon pid is 18192 before and after. Counts after `-CloseBlank` equal C1 (4 windows, 1,1,1,1), and after
    cleanup they equal C0 (3 windows).
  - The quit was by `bgf-quit.ps1` (`chrome://quit`) only, and there was one restart.

## 3. Verbatim match against raw outputs (`%TEMP%\bridge-e2e\s6-run3`)

`match.mjs` (scratchpad) decodes the UTF-16LE files, restores PowerShell's `ΓÇö`/`ΓåÆ`/`ΓÇª`, and searches the
Part 3 section for each line:

```
sm0.out: 12/12 lines verbatim in Part 3
sm1.out: 11/11 lines verbatim in Part 3
sm0.ps1: 3/3 lines verbatim in Part 3
sm1.ps1: 3/3 lines verbatim in Part 3
```

The other raw sources also match:

- `loc1.txt` and `rep1.txt` (the actor renderings) match the recorded `OUTPUT:` blocks.
- `s6-daemon-part3.log` (39 lines) diffs identical to the 39 lines appended to `S6-daemon-log.txt`, and identical
  to the live `daemon.log` span `15:09:54Z < t ≤ 16:59:46Z` (`LIVE-SPAN-IDENTICAL`).

**bb-login:** there is no raw output file in `s6-run3`, because the output went to the terminal only (NIT-4). I
checked the recorded lines against the script's format strings instead: `bb-login.ps1:256`, `:265`, `:270`, `:299`
and `:300`.

- The script prints only counts, yes/no values and `$hostShown`.
- `$hostShown` is the host only when it is on the allowlist (`:291-297`); otherwise it is `other host` or
  `address bar unreadable`.
- The script never prints a URL, title, field value or button name.
- The recorded host `eis-prod.ec.ada.edu.az` ends in `.ada.edu.az`, so it is on the allowlist (`$SsoSuffix`, `:132`).

## 4. Hygiene (counts only)

```
S6-daemon-log.txt: ://  0 | token 0 | [line withheld: 0 | _\d+_\d+ 0 | ada.blackboard 0
added diff lines: token 0 | _\d+_\d+ distinct: "1 _1_1" | non-localhost http(s) URLs 0
blackboard-ultra skill ids (17 distinct _NN.._N from references/ + SKILL docs): 0 hits in the diff, 0 in the log
skill course codes / courseIds (ada-instance.md, 4): 0 hits in the diff
git status --short | grep -ciE 'png|exports/|dist/|chrome-agent-bridge' → 0
~/.chrome-agent-bridge/failures: files written since 16:49Z → 0 (folder total 0)
```

The 9 `ada.blackboard` lines in the diff are the host label `on ada.blackboard.com: no` printed by the script.
None of them is a URL.

## 5. The driver's findings, judged

- **(a) `rep1-front` leased to RP. Cause: the opener rule. MINOR (design observation); no effect on REP-1.**
  - `daemon/src/intercept.ts:233-244` (`applyOpener`): a created tab whose `openerTabId` is a leased tab goes at
    once to that tab's holder. The extension forwards `tab.openerTabId` (`extension/src/tab-events.ts:91`).
  - RP called only `browser_snapshot` (cursor claim) and `browser_click`. `t5-find` and `t5-info` only read. No
    other grant path fits, so Chrome must have set T265 (the active, held tab of Wp) as the opener of the tab that
    `chrome.exe <url>` opened.
  - REP-1's clauses are unaffected:
    - the report names `T265` and `?t5=rep1`, so the cursor did not move;
    - "B1 after = rep1-front" asks whether the previous on-screen tab came back, and T266 was the tab in front
      before the click;
    - the lease does not take part in `activateForCapture`'s restore.
  - Worth recording for the step agent: a tab the human opens from outside Chrome (a link from another app) into a
    window whose active tab an agent holds is leased to that agent. That is 0.3 as written, but it was unmeasured
    until now.
- **(b) The tool-results PNG count printed 0. A sheet bug, not a wrong record. NIT-1.** Windows PowerShell 5.1
  test, count only:

  ```
  sheet cmd ("…\projects\*\<id>\tool-results" -Filter *.png): 0
  literal path, -Filter *.png: 1
  Resolve-Path of the wildcard path: 1
  "…\projects\*\<id>\tool-results\*.png" (no -Filter): 1
  ```

  Combining the mid-path wildcard with `-Filter` returns 0. The driver kept the command's output and recorded 1 by
  a direct check, which is correct. The count is informational and is not in REP-1's pass rule.
- **(c) No exit code in `sm1.out`. No rule needs it. NIT-2.**
  - The Part 3 row rule is the `SM-1 (Part 3 rule) PASS` line from `sm1-log` (exit 0, recorded), plus the pid and
    the counts.
  - Step 8 waits for lines, and those lines tell the outcome apart: `the verdict is sm1-log's …` means exit 0, and
    `… NOT MEASURED …` means exit 3.

## 6. Watch items

All 8 sheet watch items have a recorded entry. The "same second" item records the press at 16:53:10.415Z, the
resync stamped 16:53:12Z (2 s later, not the same second) and the reload exit at 16:53:14.578Z. The reload-after-
relaunch item is recorded as not needed (`extension back at +20311 ms`).

## Findings

- **MINOR-1: the S6.4 `git status --short` output is missing from Part 3.** The record's hygiene list ends with
  `**S6.4 \`git status --short\`** after this record and the plan block were written: below.`, but no block
  follows, and the sheet says "record the output". My `git status --short` shows the 4 modified docs and nothing
  else, with no PNG or `exports/` path, so nothing is hidden. The block should be added before the commit.
- **MINOR-2:** the opener-rule lease of the driver-opened `rep1-front` tab (5a). It has no effect on any verdict;
  it is a design observation for the step agent.
- **NIT-1:** the sheet's tool-results PNG count command undercounts on PS 5.1 (5b). Use `…\tool-results\*.png`
  without `-Filter`.
- **NIT-2:** `sm1.out` carries no exit code (5c). No rule needs it.
- **NIT-3:** the transcript now has 70 lines against the recorded `"lines":68`. Its last two entries,
  `last-prompt` and `cost-state`, were written when the session ended (file mtime 16:58:11Z, `A end RP`), after
  the count ran. All the counts are unchanged.
- **NIT-4:** the outputs of the stale checks, the reload and `bb-login.ps1` exist only in the record (terminal
  output, no file in `s6-run3`), so I could not match them against a raw file. They are consistent with the
  daemon log (stale check, reload resync line) and with the script's format strings (bb-login).
