# S1 live verifier — Run 14 (Step 10, stage S1)

Verifier: Opus 5.5, fresh, level 2. I worked from `main` at `111cb7b`, with the runner's uncommitted `S1-run-record.md`,
`S1.ledger.md` and `S1-daemon-log.txt` in the tree. I did not use live Chrome, start a daemon, touch 9234, run any
`s9-r14.ps1` block, spawn an agent, fix anything or commit. The raw outputs were read locally. Every URL in them was
masked with `sed` before display, and the token was counted with `grep -cF`, never printed. Nothing below quotes a
non-fixture URL, a title, the token or a block-list pattern from a live read.

## Verdicts

| Check | Verdict |
|---|---|
| S1.1 | **PASS** (note N4) |
| S1.2 | **PASS** |
| S1.3 | **PASS-with-notes**: I agree with every recorded row verdict. The cause of R14-TEARDOWN's FAIL is not the one the record suggests (F1). |
| S1.4 | **PASS** (note N3) |
| S1.5 (with F20) | **PASS-with-notes**: every `STOP:` line maps to Returns 1–3. R14-TEARDOWN failed without printing a `STOP:` line (F2), and no action came after it. |
| S1.6 | **PASS-with-notes**: all counts are 0. The worker console was captured in attempt 4 only, a recorded deviation. |
| Clean-up | **PASS** |
| Process | **PASS-with-notes**: no row that had made a product observation was re-run (N1, N2). |
| **Overall** | **PASS-with-notes** |

Raw files and attempts (each archive suffix is the time of the next reset, so the archive holds the attempt before it):

| File | Lines | Time span | Attempt |
|---|---|---|---|
| `r14-raw.txt.20261024T211359Z` | 9 | 21:12:29Z | 1 |
| `…T214449Z` | 124 | 21:14:03–21:15:15Z | 2 |
| `…T220012Z` | 131 | 21:44:52–21:45:50Z | 3 |
| `r14-raw.txt` | 204 | 22:00:16–22:02:00Z | 4 |

## Row table

| Row | Attempt | Recorded | Mine | Reason |
|---|---|---|---|---|
| R14-PRE / SRV / PIN / SETUP (framing) | 2, 3, 4 | as found | agree | The texts match §4.21. Extra lines are records only: `bridge.token present: True…` (no value), and `PARK …` in attempt 4. |
| SAFE-0 (L1) | 2, 3, 4 | PASS | agree | Three ROW lines, three CHECK PASS lines and the tuple line, with §4.20's texts unchanged. The daemon-log order is as by design. |
| R14-FOUND | 2, 3, 4 | PASS | agree | The guard was reached. `FOUND STATE recorded … sha256=e3b0…b855` (the empty text). |
| R14-REL-3 | 2 | PASS | agree | `open` PASS. Exactly one class line (`wrapper=view-source inner=http own=no`), and no URL on any line of the step. Because own=no, there is no `rel-snap`. The `rel ok` and the tabs line are records. |
| R14-POP-1 | 2 | FAIL | agree | `claim` PASS was printed before `click-synthetic`. One tab opened, `no leaseGranted within 5 s`, then `CHECK … leaseGranted FAIL`, as §4.21 writes it. No trusted fallback ran, which is correct. |
| R14-3 | 2 | NOT MEASURED | agree | The placement guard failed before the switch, so §4.21 makes this a STOP. Nothing in the safety state was touched. |
| R14-3 | 3 | NOT MEASURED | agree | The disarm half matches the text: `placement-before-switch` PASS, the title OFF after 51 ms, `snap` DISARMED PASS, the options page read `Bridge OFF…`. Then `placement-before-click` FAIL, a guard and a STOP before the toolbar click. The clauses the row exists for (O showing `Bridge armed.` without a reload) never ran, and §4.21 says "NOT MEASURED never counts as a pass". A FAIL would be wrong because §4.21 calls a placement FAIL a helper stop ("the row would not measure what it names"). |
| R14-4b | 4 | PASS | agree | The type ended DISARMED {scope all} after 1283 ms, with `typed 571 of 1000` read from the page. Press at 22:00:58.369Z, reply at .374Z. R3-N1's bias can only move the stamp later, so the "press ≤ reply" verdict holds. The follow-up read `ok`, the input reads `R14ok`, and there was no DEBUGGER_DEVTOOLS. The banner is a record: shown at the press, gone between +4696 and +4955 ms. `R14-4b.banner.json` agrees: 19 of 79 samples shown, the first absent at 4955 ms. No bound is applied. |
| R14-5c-ctl | 4 | PASS | agree | `302 in 29 ms, 302 in 14 ms`. `redirect8083.log` holds both `/r14-ctl` GETs. |
| R14-5c | 4 | PASS | agree | Direct and redirect both gave DOMAIN_BLOCKED with the exact message, and no file was written (`r14-dl/` is empty). Server logs: 5c1 0/0, 5c2 hop 1 and target 1. `http8081.err` shows the 5c2 target answered 200: the bytes were fetched, then dropped by the post-check (#140's documented limit). |
| R14-RESTORE | 4 | PASS | agree | Two stored reads, nothing pressed. `read-back … equal`. `RESTORED: …`. |
| R14-LOGS | 4 | PASS | agree | Both scans show `other 0` and every pattern at 0. Positive control: 3 `disarmed by the user` lines. The attempts 2–3 console deviation is printed and recorded. |
| R14-TEARDOWN | 4 | FAIL | agree (as written) | The `raw output copied … (scan passed)` clause is unmet, and a failed check is reported, never re-tuned. The cause is a helper defect, not a URL (F1). |

**Is the record verbatim?** A script took all 204 backtick quotes in the attempt 2–4 sections of `S1-run-record.md` and
looked each one up in that attempt's raw file. Every quote was found except one: record line 180 quoting
`raw output copied to …S1-run-raw.txt (scan passed)`, which names the expected clause that was not met.

## Findings (ranked)

**F1 (MAJOR, helper defect; the record's diagnosis is wrong): the 3 "other" `://` in the attempt-4 raw scan are the
helper's own text, not URLs.**

The record and ledger guess that the 3 are the driver's `chrome-extension://` and `chrome://` lines. They are not.
`scanCounts` (`recipes/s9-rules.ts:442-464`) matches scheme URLs with a regex and puts every match that `showUrl`
accepts in the fixture class. It then raises `scheme` to the raw `://` count (line 452: "a bare `://` … still counts as
other").

Command: `head -200 r14-raw.txt`, which is the file as scanned (the SCAN line is line 201), then a count of `://` and of
`://` not preceded by a scheme character:

```
total :// 14
bare (not after a scheme char): line 165 (1), line 172 (1), line 175 (1)
```

Those three lines are attempt 4's own `SCAN …: ://=0 …` (console), `CHECK R14-LOGS scan-console PASS — … (token,
non-fixture ://, …)` and `SCAN daemon.log …: ://=0 …`.

The 11 URL forms all fall in classes that `showUrl` allows, and fixture 11 agrees:

- 6 `http://localhost:808x` fixture URLs;
- 1 `chrome://extensions`;
- 4 `chrome-extension://<this extension's id>/options.html`, the driver's own O window, one per stored read.

There is no user page and no real site among them. The same lines explain `bank.example=3`, `:8083=3` and 3 of the 4
`localhost:8081`: they are the literal names in those SCAN and CHECK texts.

So a raw output that contains R14-LOGS' lines can never pass the committed-file scan. The FAIL is real as written and
benign in content. Fixing the helper (for example, the scan lines naming `scheme-sep` instead of `://`) and deciding
whether to commit the raw output are for the step agent. R14-TEARDOWN must not be re-run (#193). The same defect would
hit S7.

**F2 (MINOR, helper/row mismatch, not a runner breach): R14-TEARDOWN's failure printed no `STOP:` line.**

§4.21 says "A failure is a `STOP:` line." `B-teardown` (`recipes/s9-r14.ps1:474-477`) runs `scan-file … --mode
committed` and on a non-zero code only prints `raw output NOT copied …`. Every other teardown clause goes through
`Fail-S14`, which prints STOP; this one does not.

The raw output's last line is `BLOCK teardown done`. Teardown is block 15, the last one: by then the restore (block 13)
had read back equal and the processes, windows and ports had been checked and ended. The runner then only made a
count-only read and wrote the ledger and record, which flags it "for the step agent to decide". No action followed the
failure, so this is not a runner that continued past a STOP (#193). It is a helper that did not print the STOP its row
text promises, and the effect was the same as a return.

**F3 (NOTE): the R14-3 occluder in attempt 3 is unidentified.**

`class=Chrome_WidgetWin_1 process=chrome`, not a driver window, appeared about 2.5 s after the options-page disarm. The
round-3 `OCCLUDER`/`CURSOR` diagnostics could not run, because R14-3 was skipped in attempt 4. Run 15's re-measurement
should keep them.

**F4 (NOTE, a record): R14-REL-3's class answers #196's question for this path.**

`view-source:/options.html` on a fixture tab resolved against the tab's own origin (`inner=http own=no`), not against
the extension. The `rel ok` was a fixture-server path, not an own page.

**N1 (process): fixer 1's prep dry run reached live Chrome before §4.21 was committed.**

`daemon.log` shows `start pid=9052` at 21:01:20Z, then `client + "s9-r14-4b"`, `safety state: armed=true evaluate=true
blocked=0`, `extension resync: 1 tabs, 0 gone`, and `exit 0 (shutdown 4002)` at 21:03:20Z. No later safety-state line
appears, and no other client.

`5f17d54` was committed at 21:11:27Z. This was no press and no row observation, so S1.1 ("before the first press")
holds. It breaches the fixer brief and is recorded in the ledger as a deviation.

Over the fixer and verifier windows between attempts, `daemon.log` has 0 lines between 21:15:20Z and 21:45:00Z and 0
between 21:46:00Z and 22:00:00Z. Nothing reached the extension there.

**N2 (process): no row that had made an observation was re-run.**

`daemon.log` shows the R14-REL-3 clients (3, at 21:14:49Z) and the R14-POP-1 client (21:14:53–59Z) only in attempt 2.
The `s9-r14-3` client appears once, at 21:45:38Z in attempt 3, and not in attempt 4.

R14-3 did run in attempt 3 after attempt 2's guard stop. Attempt 2 had printed only helper placement lines (`PLACED`,
the placement guard): no product observation, so the rule allows the rerun.

SAFE-0 and R14-FOUND were re-made in each attempt by design. They are framing rows that every attempt needs: S1.2
wants L1 = SAFE-0, and S1.4 wants each attempt's found state. Both passed every time, and no FAIL was re-run. The step
agent ruled this explicitly in (b) on Return 2.

**N3 (S1.4): attempt 4 prints one non-empty hash.**

`BLOCKLIST set to 1 line(s) of the wave's own, sha256 14ceab87…` is `sha256("localhost:8081")`, checked with
`printf 'localhost:8081' | sha256sum` → `14ceab87d7c9…402a`. It is the wave's own fixture pattern, written in advance in
R14-5c's expected text. It is not a list read from the user (the found list was empty, count 0).

§4.21's amendment says "the sha256 of a non-empty list never is" printed, so the wording is in tension with R14-5c's
own text. Content-wise nothing is leaked. Ideally a dated note on §4.21 would say "never a list read from Chrome".

**N4 (S1.1), commands and output:**

- Commit time: `git show -s --format='%h %cI' 5f17d54` → `5f17d54 2026-10-25T01:11:27+04:00`, which is 21:11:27Z.
- First press: attempt 2's first Chrome-touching line is `21:14:12.502Z opened window …`, and its first state change
  is none. Attempt 1's lines are read-only preflight at 21:12:29Z.
- `git diff --stat 5f17d54 111cb7b` → `docs/e2e-test-plan.md | 26 ++` (0 deletions). The diff body is exactly the two
  dated notes (wave fixer r1/r2 and r3); no row text or pass rule changed.
- `git diff -U0 f45e3bf -- docs/e2e-test-plan.md | grep '^@@'` → `@@ -1193,0 +1194,99 @@`, with 0 removed lines. §4.20
  is untouched.

**S1.2 evidence.** Attempts 2–4 each begin their record with SAFE-0 PASS; attempt 1 has no lines. There was no reload:

- `daemon.log` since the mark has 3 `extension resync: 2 tabs, 0 gone` lines, one per daemon start (PIDs 14188, 5412,
  33580), and no `extension session changed`.
- No raw output has a reload line, and every attempt records `SAFE-0 tuple read before any reload … (no reload
  needed)`.

**S1.4 evidence:**

| Attempt | Found | Touched | Read-back |
|---|---|---|---|
| 2 | `armed=true evaluate=true count=0 … sha256=e3b0…` | never | `RESTORE ok`, read-back equal |
| 3 | `armed=true evaluate=true count=0 … sha256=e3b0…` | disarmed 21:45:37.727Z, re-armed 21:45:43.278Z through the options page (5.55 s) | `STATE armed=true …`, `R14-STOP wait-safety reached …`, read-back equal |
| 4 | `armed=true evaluate=true count=0 … sha256=e3b0…` | R14-4b and R14-5c, each chained back by its own guard | block 13 pressed nothing, read-back equal |

**F20 / S1.5 listing.** Command: `grep -n -iE 'STOP|FAIL|guard|NOT MEASURED|refus|error|SET-UP|USAGE'` over the four
raw files, and `grep -ciE 'stop|guard' daemon.log` → 0.

| Attempt | Lines found | Match |
|---|---|---|
| 1 | 2 `STOP:` lines (preflight, dirty tree) | Return 1 |
| 2 | `CHECK R14-3 placement-before-switch FAIL` and 2 `STOP:` lines | Return 2 |
| 3 | `CHECK R14-3 placement-before-click FAIL` and 2 `STOP:` lines | Return 3 |
| 4 | 0 `STOP:` lines; 1 `CHECK SAFE-10 scan-committed FAIL` (F2) | ledger's "Attempt 4" entry, left for the step agent |

The R14-POP-1 `CHECK … FAIL` is a row FAIL, which is not a STOP by §4.21. Every `wait-safety --guard` line was
`reached`. No `STOP:` line is unmatched.

**S1.6, re-derived:**

- `daemon.log` from 21:14:17Z has 101 lines: the 93 copied plus 8 teardown and shutdown lines written after the logs
  block. Token 0, `://` 0, `localhost:8081` 0, `:8083` 0, raw `8083` 0, `bank.example` 0, `http` 0, `chrome-extension` 0.
  `diff` against `S1-daemon-log.txt`: equal on the first 93 lines.
- `r14-console.txt` (171 lines, attempt 4 only): token 0, `://` 0, `localhost` 0, `8083` 0, `bank.example` 0. The two
  press lines appear 3 times each.
- Files to be committed: `S1-run-record.md`, `S1.ledger.md`, `S1-daemon-log.txt`, `S1-prep-{builder,fixer1,verifier}.md`,
  `S1-wave-{fixer,verifier,sheet}.md` and `briefs/S1-*.md`, including this brief.
  - Token: 0 in every file.
  - Every `scheme://` form is `http://localhost:808x`, `chrome://extensions`, `chrome://…` or
    `chrome-extension://…/options.html`, written as placeholders. The rest are bare `://` in prose and in SCAN texts.
  - The test patterns `localhost:8081`, `:8083` and `bank.example` appear only in row text and SCAN lines; the record
    has 7 of each.
  - Titles: only the fixture's own.
  - Block-list patterns: no real one, since the found list was empty.

**Clean-up.** No listener on 9234, 8080, 8081 or 8083. The only `node.exe` is 22152 (parent 16936). There are no
`python.exe` processes. One titled visible Chrome window remains, and it is not a driver window (its title was
measured by length only). I killed nothing.

## Gotcha candidates

1. **A scanner whose own output contains `://` or the test patterns fails any later scan of a file that holds that
   output.** The scan lines should name the counted string without writing it (F1).
2. **Every failure path in a block must print STOP when the row text says "a failure is a `STOP:` line."** Use
   `Fail-S14` for the teardown scan too (F2).
3. **R14-POP-1 failed again** (as SAFE-POP-1 did): no `leaseGranted` for a popup opened by a synthetic click in a
   background opener tab that was held. Run 15's R15-POP-2 (wave fixer's proposal) measures `openerTabId`.
4. **The R14-4b banner** ("started debugging this browser") was gone between +4.7 and +5.0 s after a disarm during a
   trusted `type` (one run; a record). Run 13 saw it still shown at +3 s and gone by +14 s.
5. **A non-driver Chrome top-level window** (`Chrome_WidgetWin_1`) can appear above a side window within about 2.5 s of
   an options-page disarm, identity unknown. Placement guards need a park rule and occluder diagnostics before the
   re-arm click.
