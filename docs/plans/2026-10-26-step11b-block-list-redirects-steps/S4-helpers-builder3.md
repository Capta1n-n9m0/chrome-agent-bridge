# S4-helpers builder slice H3: row judges and the Run 17 log scanner

Model Sonnet 5.5, effort medium. 2026-10-27. Verdict: DONE (about 615 new lines: s11b-rules.ts +270, tests 344).

## 1. Outputs
- `recipes/s11b-rules.ts`: imports now also `countRules`, `isUrlBlocked`, `median` (s9-rules), `type Judged` (s11-rules); new sections H3 (types and lines), H3a (RULES), H3b (FOUNDLIST), H3c (timing and judges), H3d (scanner). H1/H2 sections unchanged.
- `recipes/test/s11b-judges.test.ts` (H3a-c), `recipes/test/s11b-scan.test.ts` (H3d).
- `recipes/tsconfig.s11b.json` include extended; `recipes/tsconfig.s6.json` exclude extended with both tests (same remedy as H2: their imports are chrome-typed).

## 2. Exported names (H4 / H6)
Shared: `J17 extends Judged {nd?, stop?}` (nd = NOT DISCRIMINATING, stop = a STOP line); `row17Line(id, j): string` (`ROW <id> PASS|FAIL|NOT MEASURED|NOT DISCRIMINATING|STOP: <why>`); `recordLine(row, kv): string` (`RECORD <row> k=v …`).
RULES: `sampleWindow(samples: {t,n}[], sendT, replyT, margin=300): number[]` (edges included); `rulesSamplesLine(ns): string|null`; `rulesExpectLine(n)`; `expectedRuleCount(foundText): number` (= `countRules(found lines + BLK).rules`, BLK = the fixture pattern, never printed); `judgeInFlight(inFlight, after)` (RD-REBUILD-NARROW); `judgeSampleThenZero(at, expectN, after)` (RD-5b, RD-DISARM); `judgeBackEmpty(ns)`.
FOUNDLIST: `foundList(text): {blocks, line, verdict}` (matcher `isUrlBlocked` on 127.0.0.1 and localhost URLs of 8081, 8083, 8085, 8086, 8087, 8088, 8089, 8091; yes is a stop).
Timing: `latLine(row, ms)`, `gapLine(ms)`, `judgeGap({pressT, readbackT, callT})`; `RD_CTL_LIMITS`, `ctlRowLine(two: {status,ms}[], idle)`, `ctlFlipLine([200,302])`, `judgeCtl({idleSocket, ports, flip, ctlBlocked}): {lines, verdict}` (lines include the ROW RD-CTL per port, the CTL line and `HITS ctl redirect=0 blocked=<n>`); `judgeHistory({blocked, flipTotal, replyMs, answer: "ok"|K17Error, rulesAfter})` (RD-BACK, RD-FWD; `HISTORY_REPLY_MAX_MS`); `judgeSamedoc({replyMs, answer, rulesAfter})`; `dlHopD(hop, err)`, `dlHopReading(d)`, `judgeDlHopTrial`, `judgeDlErrTrial`; `socketLine(samples: boolean[])`, `judgeSocket({samples, callsOk, calls, rulesAfter})`; `callLine(c)`, `judgeRaceA(calls, p): {verdict, record}`.
Scanner: `isFixture17(url, ownId?)`, `scan17(text, ctx: Scan17Ctx, sock?: {start,end}): Scan17`, `scanLine17(what, s)`, `verdict17(s, {consoleControl?})`.

## 3. Decisions
- **`RECORD` forms** (no line form in the sheet): `RECORD R17-UP-RACE-A first-refusal-after-P=<ms> ms` (earliest refusal start minus P, may be negative); for H4 to print via `recordLine`: `RECORD RD-BACK answer=<ok|K-tab|CODE> reply=<ms> loading=<true|false|unknown>`, `RECORD RD-DL-HOP d=<ms> reading=<text>` (three medians and the readings' text from `dlHopReading`), `RECORD RD-DL-ERR text=<as-prewritten|NOT as pre-written>`. Only the race one is built here; the others are `recordLine` calls with these keys, listed so the sheet's RECORD clauses have a form.
- **NOT DISCRIMINATING and STOP** are printed by `row17Line`; s11-rules' `rowLine` cannot print them. Rule misses that the sheet makes STOPs (a rule left after a reply, RD-CTL's misses) are `stop`.
- **Judge order in `judgeHistory`:** rules left (stop), wrong answer, blocked, slow, then flip count (0 NOT MEASURED, 1 NOT DISCRIMINATING), so a failure outranks not discriminating. Reply of exactly 12 000 ms passes; `judgeSamedoc` at exactly 1 000 ms fails; `judgeGap` of exactly 1 000 ms passes; a call at exactly P + 1 000 ms that answers ok fails.
- **`dlHopReading` bands** (the sheet says "about"): -350..-250 in hand at the rejection; -50..50 late in the window (revisit trigger of #303); above 50 unexplained; else "between the readings".
- **RD-5b / RD-DISARM sample judge** takes all samples at 2.5 s and requires each to equal N.
- **Scanner:** fixture ports are the sheet's table ports 8081, 8083, 8085, 8086, 8087, 8088, 8089, 8090, 8091. Own whole `SCAN …` lines (strict form) are removed before counting (their labels hold `localhost:8085` and 24 `a`); any other text is scanned. `aaaa…=` counts runs of 24 or more `a`. `sock127` counts `127.0.0.1` between the first `start` mark and the next `end` mark; marks missing gives `sockMarksMissing` and NOT MEASURED. Stop outranks NOT MEASURED. An 8085 URL is a fixture `://` and also a `localhost:8085` hit (by design, so STOP). The alias is counted, never printed; the lines hold counts only.
- `*.localhost` in a found list does not block `localhost` itself (subdomains only), so FOUNDLIST says `no` for it; tested.

## 4. Numbers
- Baseline H2: 165 files, 4216 tests. After: `Test Files 167 passed (167)`, `Tests 4257 passed (4257)` (+41, +2 files, none removed). Red run before the code: the tests failed on import; two test assumptions about the matcher/rule count were then corrected (plain hosts share one rule; a `host:port` is its own regex rule).
- `npx tsc --noEmit -p` for all seven `recipes/tsconfig*.json`: exit 0. `npm run typecheck` 0, `npm run build` 0; after the build `git status` shows no tracked change except `journal.md` (not mine) and `tsconfig.s6.json` (my exclude edit).

## 5. Deviations and findings
- tsconfig.s6.json edited (exclude only), as H2.
- A long Bash heredoc failed again (unterminated quote); the code went in via Write plus `cat >>`.
- Not covered: `S11 scan`'s `ScanCtx`-based caller still uses `scanText`; H6/H4 must call `scan17`, not `scanText`.
