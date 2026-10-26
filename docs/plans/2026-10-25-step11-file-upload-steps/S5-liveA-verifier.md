# S5-liveA verifier report (Run 16, liveA, both runs)

Model: Claude Opus 5.5. UTC start 2026-10-26T04:42:36Z, end 04:48:50Z. Read-only; no block run, nothing committed.

## 1. Verdict: FAIL

Two MAJOR findings, both about bookkeeping and coverage. No row verdict is wrong, and no row needs re-running for the
first. **S5.5 fails:** two preflight `STOP:` lines are not matched to a return in the ledger, and the runner went on
past them (F1). **S5.6 holds only in part:** the console scan covers only the second run, so none of the first run's
rows were console-scanned (F2). S5.1, S5.2, S5.3, S5.4 and S5.7 hold, with notes.

## 2. Rows (record `S5-run-record.md`; §4.23 at `docs/e2e-test-plan.md` 1445–1552)

| Row | Observed (record lines) | Expected / pass rule | My verdict | Record's verdict right? |
|---|---|---|---|---|
| UP-L1 | 10 `FOUNDCHECK root=not outside=not`; 11–14 build = sha256 of dist, raw-root and raw-outside PASS | FOUNDCHECK both `not`; build = sha256; both raw calls K-gate, page 0, mark never set | PASS | yes. The record carries verdicts, not the observed text (N3) |
| UP-0 | 26 `STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0… uploadfolders lines=0 sha256=e3b0…`; 27 `TOGGLE reading on`; 18 "nothing was pressed"; 28 plan PASS | armed+JS, toggle on/off read, nothing pressed; the empty hash may be printed | PASS | yes (CHECK line only, no ROW line: NIT) |
| UP-OPT | 47–54 eight clauses PASS; 55 `o2-follows FAIL` at 6061 ms (`opt-obs.json`: `o2Conflict false`) | O2 within 5 000 ms, no conflict note | FAIL (timing only) | yes |
| UP-FA | 57 `RECORD: not run — the toggle is on` | written so when UP-0 reads ON | RECORD | yes |
| UP-6 | 60 sampler `banner=seen`; 61–66 all five FAIL "banner seen on a refusal" | per step exact code/message, 0 files, mark never set, **no banner** | FAIL | yes for the row. The other clauses are hidden (F3) |
| UP-7 | 68–117 each leg switched, read back `hash=equal`, wait-safety reached; 118–121 a/b/c PASS | K-disarmed / K-blocked / K-gate exact, page untouched, state read back after each leg | PASS | yes |
| SAVE-REFUSE-R | 122–128 SDK: 4 exact + control prefix + no files; 129–136 MCP: tool search off, 4 contained and unprefixed, no files | SDK equality without prefix, control prefixed with `boom`; MCP containment, calls `[browser_evaluate]` | PASS | yes |
| SW-2 | run 1: 143 guard STOP before trial 0 (no trial). Run 2: 180–192, warm-up d=770 excluded, d=[-24, 95, 68], `measured 3/3`, "the event ends the wait" | 1 warm-up + 3 trials; d ≤ 300 ms in 3/3 → event ends the wait | PASS (RECORD outcome: event ends the wait; no S5b) | yes |
| UP-RESTORE | run 1 (stop path): 160/166 stored 0/0 lines with the empty hash, daemon equal, then `title armed false` → `RESTORE FAILED`. Run 2: 216–229 stored, daemon and title equal → PASS | all four equal to UP-0 by count and hash | run 1: the stored state was equal; the false STOP came from the helper defect (#281). Run 2: PASS | run 1: by the letter the STOP was correct for the helper as built; in substance the state was restored. Run 2: yes |
| UP-LOGS | 231–236 console 0, daemon 0, actors 1 fixture; all three PASS | 0 token / other / sentinel / profile; console holds the control press line | PASS for what was scanned. The console part of the first run is NOT MEASURED (F2) | the row line is right for its file; "UP-LOGS PASS" for the slice overstates it |

## 3. Exit checks

- **S5.1: holds.** `git log --format='%h %cI' -S…` gives §4.23 at `36cfc43` (2026-10-25T20:12:15Z), #273's 8081
  amendment at `d0744b2` (20:32:26Z), #277's note at `5d11c2c` (20:56:15Z) and #278's bare `localhost` at `1767de6`
  (21:24:02Z). The first wave line is `S5-liveA-framing.txt:1` at 2026-10-26T04:18:20Z and the first record line is
  04:19:14Z. `git diff 0abd25e..HEAD -- docs/e2e-test-plan.md | wc -l` → 0, and the phase doc's diff is also 0.
- **S5.2: holds (N1).** The build proof is record line 11 (`daemon build = sha256 of daemon/dist/index.js`). Lines
  1–10 come from the same UP-L1 block's found read. The build ran at 04:18:15Z from `0abd25e`: the preflight printed
  `head 0abd25e, tree clean`, and the dist mtimes are 08:18:15+04. The reload was done by `reload-extension.ps1`
  (exit 0, attempt 1, framing 37–45). The second run used the same build: `S5-liveA-daemon.txt` 2 and 36 both show
  `build=834c77ba…`, and `sha256sum daemon/dist/index.js` gives `834c77ba…`. `git diff 0abd25e..HEAD -- shared
  daemon sdk mcp extension | wc -l` → 0. No reload appears in framing2.
- **S5.3: holds (F3, N3).** Each row was judged against its §4.23 rule. Every upload or refusal judgment is the
  judge's own, never an `ok`. The record prints verdicts, not the observed texts, so the texts were checked through
  the judge: a script compared the 22 `K` constants in `recipes/s11-rules.ts` with the §4.23 table and found
  `compared 22, differ 0`.
- **S5.4: holds.** The first run's stop-path restore left the stored state equal (0/0 lines, the empty hash) and
  `daemon.status` equal. Only the title check failed, because it compared the whole two-line name (#281). The second
  run's UP-RESTORE read the state back against the first run's found record (`found.json` holds only booleans, counts
  and hashes; no text field): `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0
  hash=equal`, `title armed true`. Only the public empty-text hash is printed.
- **S5.5: FAILS (F1).** The record's STOP lines 143, 148, 171, 172 and 179 match ledger line 8 (the return at
  04:20:42Z). framing2 and the daemon log have none. Framing lines 2 (`python was not found`, 04:18:20Z) and 6
  (`a previous wave's globals exist`, 04:18:35Z) have no matching return in `S5-liveA.ledger.md`. The runner ran
  `-Block teardown` and relaunched; only `S5-liveA-runner.md` §2 records this.
- **S5.6: holds in part (F2).** UP-LOGS counts are all 0 (lines 231–236). My own scan
  (`scratchpad/scan.mjs`, token read from `bridge.token`, never printed) gives:

| File | `://` | real URLs (all fixture by #277) | bare `://` | token | sentinel `s11-`+12hex | profile (4 forms) | `aliev` |
|---|---|---|---|---|---|---|---|
| S5-run-record.md | 22 | 19: own `chrome-extension://<id>/options.html` ×18, `chrome://extensions/?id=` ×1 | 3: the SCAN lines | 0 | 0 | 0 | 0 |
| S5-liveA-framing.txt | 2 | `http://127.0.0.1:8081/s11-upload.html?s11=human`, `chrome://extensions` | 0 | 0 | 0 | 0 | 0 |
| S5-liveA-framing2.txt | 2 | same two | 0 | 0 | 0 | 0 | 0 |
| S5-liveA-daemon.txt / -occluders.txt | 0 | – | 0 | 0 | 0 | 0 | 0 |
| ledger / runner / runner2 / fixer | 3 / 5 / 8 / 6 | `chrome://extensions` only; the rest are the prose placeholders `scheme://host` and `extension://...` and literal `://=` | – | 0 | 0 | 0 | 0 |

No user tab title, real site, block alias or unmasked profile path appears; `<PROFILE>` masks it twice. Known item
(a) is confirmed: `npm run recipe -- recipes/s11-evidence.ts --file …` exits 2, and its record line reads `://=22
(fixture 19, other 3)`. Those 3 are exactly record lines 231, 233 and 235 (`grep -n '://'`), and nothing else causes
it.
- **S5.7: holds.** The warm-up is printed as `warm-up (trial 0, excluded)` and is outside the d-list. Exactly 1 + 3
  trials ran. The outcome, read off the table unchanged, is "the event ends the wait", so no S5b. The first run's
  SW-2 attempt stopped at the guard before trial 0, so the second run re-ran no trial.

## 4. Audit of the set-up fixes (`ddc3955`, `S5-liveA-fixer.md`)

- **No guard loosened.** `git show ddc3955`: `Enter-S11Guards` only gains an `OCCLUDER detail` print, and its verdict
  lines are unchanged. Teardown is unchanged: the only `s11-r16.ps1` change is the sw-2 line, and the `S16Changed`
  refusal is intact. `Get-S9ActionTitle` returns the first line, and callers still use exact `-eq`.
  `Wait-S9ActionTitle` already matched with `StartsWith` before the fix, so the change is equivalent, not looser.
  `Set-S11Place` calls `Assert-S11Own` first and moves only the wave's own window W.
- **No pass rule changed.** `recipes/s11-rules.ts` is not in the commit, and the §4.23 and phase-doc diffs are empty.
- **Tests.** `npm test` → `Test Files 153 passed (153)`, `Tests 3803 passed (3803)`. The new file has 19 tests (19
  passed), so 3784 + 19 = 3803, as claimed. With `S11_TEST_S9WIN` pointing at `git show 0abd25e:recipes/s9-win.ps1`,
  2 failed and 17 passed: the 'EQ True' test and the "not to contain 'Has access'" test, as claimed.
  `s11-evidence.ts` and `clearPlacement` are new files, so their tests cannot pass without them.

## 5. Findings

- **F1 (MAJOR): S5.5, and the phase doc's STOP rule "a live runner continuing past a STOP line (#193)".**
  `S5-liveA-framing.txt:2,6` hold two `STOP:` lines. The runner went on: it ran teardown and relaunched
  (`S5-liveA-runner.md` §2). Neither the ledger nor #281 records it. Both lines came before any Chrome action or
  state change, and the teardown found nothing to remove (framing 9–12), so nothing was affected. **Fix:** the step
  agent adds the two returns-not-made to the ledger, and the session agent rules on them (decisions.md). No re-run.
- **F2 (MAJOR): S5.6 coverage.** The worker-console capture used by UP-LOGS was opened in the second run
  (framing2 34–42). The first run's console window was closed in the stop procedure (record 173) and never read.
  Evidence: `console.txt` holds exactly one disarm/arm event (`safety: disarmed by the user` at lines 291/292/295,
  the same event printed three times by UIA), while the slice's daemon log shows two disarms (04:19:42 UP-7a and
  04:39:50 the control press). So UP-L1, UP-6, UP-7 and SAVE-REFUSE-R, the rows that sent paths and `saveTo` paths,
  were never console-scanned. The daemon and actor scans do cover both runs (`S16Mark` comes from the first
  preflight; the daemon slice starts at 04:19:08). **Fix:** record UP-LOGS (console) as NOT MEASURED for the first
  run's rows, and do not report liveA's UP-LOGS as covering them. The session agent then decides whether liveB's
  UP-LOGS covers the same refusal paths (gate, handler) or whether new console-covered rows are needed.
  SAVE-REFUSE-R's `saveTo` refusals are liveA-only.
- **F3 (MINOR): the UP-6 judgment hides its other clauses.** At `recipes/s11.ts:407`, a seen banner replaces every
  step's judgment, so the record cannot say whether K-gate, K-missing, K-relative and K-notarget were exact, or
  whether the page stayed untouched. UP-6's K-notarget is the first proof of S3's handler, and liveA leaves it
  unshown. The sampler also does not split banner-before from banner-after (record 60). **Fix:** S5-record writes
  UP-6 as "FAIL (banner); other clauses not recorded". For liveB, print the clause verdicts and then the banner
  verdict.
- **F4 (MINOR): known item (a).** `scanText` and `evidenceCounts` count every literal `://`, so the helper's own
  `SCAN …: ://=n` lines count as "other". This fails closed (it blocks a commit; it never hides a URL). **Fix:**
  count only `scheme://host` matches, or print `urls=n` in the SCAN and EVIDENCE lines. Until then the step agent's
  note is right.
- **F5 (NIT): known item (b).** The `CLICK` print at `recipes/s9-win.ps1:408` prints `$El.Current.Name` whole, which
  splits record lines 200–201 and 206–207 (and the pre-fix `ACTION` lines 146–147 and 168–169). This is Chrome UI
  text, not a leak. **Fix:** print `(Get-S9FirstLine $El.Current.Name).First`.
- **F6 (NIT): known item (c), the second run's order.** No preflight ran. Its checks were made by hand in ledger
  line 11 (ports) or were moot: HEAD `ddc3955` differs from `0abd25e` only in recipes and docs (product diff 0), and
  `git status` shows only the steps dir. UP-L1 and the reload were not repeated; the same daemon build id, the
  unchanged dist and no reload cover this. UP-0 was not re-read: UP-RESTORE compared against the first run's found
  record, which is the slice's own found state, and that is correct. No `files` block ran; SW-2 and the restore need
  no files. **Nothing the order skipped weakens a check, except the console capture (F2).** One note: SW-2 ran with
  W restored and resized and no options window open, while the first attempt ran with W maximized and window E
  open. The guard was unchanged, and the first run's Chrome occluder was never identified (fixer §5).
- **N1 (NIT):** S5.2's "first recorded line" is the UP-L1 block's found read (record 1–10); the build proof is line
  11. Nothing comes before UP-L1.
- **N3 (NIT):** the record holds verdict lines, not the observed codes and messages, so S5.3's "observed text
  against the pre-written text" was verified through the judge and the constants check above.

## 6. Handoff

Daemon PID 26292 untouched. `%TEMP%\bridge-e2e\s11\` still holds `found.json` (booleans, counts and hashes only),
`opt-obs.json` and `console.txt` outside the repo. The scratch scripts are in this session's scratchpad.
