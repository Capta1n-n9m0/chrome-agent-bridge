# S7-live liveC19: Run 19 slice C, live (the file chooser and G2; step report)

Step agent: Claude Opus 5.5, medium. Fixer Sonnet 5.5 medium (`S7-live-C-fixer.md`), verifier Opus 5.5 medium
(`S7-live-C-verifier.md`), runner Sonnet 5.5 medium (`S7-live-runner-liveC19-att1.md`), committer Sonnet 5.5 medium.
Ledger: `S7-live.ledger.md` (the liveC19 entries).

## 1. Verdict
**DONE.** Attempt 1 ran to its end with no STOP: exit 0, `CHECK rows19 rows=26 warns=0 stop-return=0`. R19-RESTORE PASS
(equal to R19-0 by count and hash), R19-LOGS PASS, `DIALOGS liveC19 native=0 devtools=0 wave-windows-open=1`. Of the 20
R19 rows: PASS 15, FAIL 3 (R19-CHOOSE-REFUSE, R19-CHOOSE-KEPT, R19-G2-1), RECORD 2 (R19-CHOOSE-FRAME, -HUMAN). The FAILs
are recorded, not fixed (§6). Budget used: attempts 1 of 3, fix rounds 1 of 3 (#367).

## 2. Outputs
- **Commits:** `0c42637` fix round 1 (verifier PASS-with-notes); attempt 1's evidence and this report in the commit after
  it (hash in the ledger and the session agent's journal).
- **Fix round 1, before attempt 1:** R19-CHOOSE-MCP leg b targeted `{css: "#in"}`, a `hidden` input on `s12=c1`, which
  the locator walk prunes (`extension/src/content/a11y.ts:73`): `LOCATOR_NOT_FOUND` on any build (#368's class). Now
  `{css: "#vis"}`, c1's visible file input; want, judge and dialog step unchanged. New
  `recipes/test/s12-r19-c-legb.test.ts` (2 tests, red on the old line). npm test 5588 -> 5590 (234 files); typecheck and
  the seven recipes tsconfigs exit 0 (verifier's re-run). Verifier: 9 mutants, 7 killed; NIT N1 (leg b's want and
  `chooser: true` not pinned, untested before too); NIT N2 (the choice of `#vis` is the driver's, as #368).
- **Attempt 1** (HEAD `0c42637`, out `$TEMP/bridge-e2e/s19-live/c1` fresh, `-Att 1`, build `built extension → dist/`):
  `S7-live-record-liveC19.txt` (387 lines; att 1 carries no suffix, as liveA19's and liveB19's),
  `S7-live-evidence-liveC19-att1.txt` (547), `S7-live-console-liveC19-att1-1.txt` (1291; 4 lines starting `DevTools`
  dropped, the window-title lines among them). The runner also wrote a `-2` copy from `console-liveC19-all.txt`; it was
  byte-identical to `-1` (`cmp`), so the step agent deleted it before the commit.
- **File scans** (`recipes/s11b.ts scan18 --what other`), record, evidence, console: `://=0 (fixture 0, other 0) token=0
  sentinel=0 profile=0`. A search of every liveC19 file for the user's name or a `Users\` path: 0.

## 3. Attempt 1 rows as printed
- `ROW R19-0 PASS slice=C` (RD-0 (a)(c)(d), RULES 0, R17B-0 (e)(f) PASS; `LOADED consoleMessages=answered entries=11
  console=10 exception=1 args=answered`; `TOGGLE reading on`).
- `ROW R19-BANNER-CTL PASS slice=C`: neg `idle-ms=20000 polls=16 banner=none`, pos `answer=ok polls=15 banner=seen`.
- `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=147 native-after=0` (the human-style click proved).
- `ROW R19-CHOOSE-1 PASS`: sdk `ok files=1 change=1 clicks=1 bytes-equal=yes dialog=0 ms=34`; ref the same, `ms=16`;
  `BANNERCALL … idle-ms=20014 polls=16 banner=seen control=pass`.
- `ROW R19-CHOOSE-LABEL PASS`: label `files=1 change=1 clicks=1 bytes-equal=yes`; input `files=1 change=1 clicks=0`;
  multi `files=2 change=1`; each `dialog=0`.
- **`ROW R19-CHOOSE-REFUSE FAIL`** (clauses=4 failed=1): picker, single, dir `BAD_PARAMS exact=yes files=0 change=0
  clicks=1 dialog=0` (19–21 ms); **dis `TIMEOUT exact=no files=0 change=0 clicks=1 dialog=0 ms=5023`**.
- `ROW R19-CHOOSE-2 PASS`: outside `UPLOAD_REFUSED exact=yes files=0 change=0 clicks=0`; missing `BAD_PARAMS exact=yes …
  clicks=0`; banner `idle-ms=20008 banner=none control=pass`; (c) not run (toggle on).
- `ROW R19-CHOOSE-3 PASS`: `TIMEOUT exact=yes files=0 change=0 clicks=1 dialog=0 ms=5022`.
- R19-CHOOSE-MCP legs a, b, c, e PASS: a `ok files=1 change=1 clicks=1`; b (`#vis`) `ok files=1 change=1 clicks=0`; c
  `TIMEOUT exact=yes files=0 clicks=1 ms=6567`; e `form=run16`. Leg d with JavaScript off: `JS_DISABLED files=0 change=0
  clicks=0 dialog=0 ms=8` PASS -> `ROW R19-CHOOSE-MCP PASS`.
- **`ROW R19-CHOOSE-KEPT FAIL`**: first `ok files=1 change=1 clicks=1 ms=94`; second `ok files=1 change=1 clicks=2
  ms=13`; `KEEPSEQ … calls=2 gap-ms=2000 answers=2/2 banner=continuous end-ms=10309 poll-ms=369`. The judge
  (`judgeKept`, `s12-r19-c.ts:81`) wants `change` 1 then 2; the page read 1 then 1.
- `ROW R19-CHOOSE-FRAME RECORD`: `frame ok files=1 change=1 clicks=1 dialog=0 ms=64` (the activation reached the
  same-origin child frame); dialog leg PASS.
- `ROW R19-CHOOSE-HUMAN RECORD`: `HUMAN … received=clicked-input dialog=0 files=1` (no `outside-file-reached-page` STOP).
- `ROW R19-CHOOSE-LATE PASS`: `opener-ms=4900 opened=yes dialog=0`, `opener-ms=5100 opened=no dialog=0`.
- `ROW R19-KEEP-OVERLAP PASS slice=C`: `leg=chooser first=TIMEOUT second=DEBUGGER_DEVTOOLS exact=yes`, page clicks 1.
- `ROW R19-CHOOSE-4 PASS`: `DIALOG leg=a|b|c before=0 after-click=1 after-close=0 ms=122|125|120 change=0` (Chrome's own
  dialog opened after each exit, and the wave closed it).
- `ROW R19-CHOOSE-DISARM PASS`: `DISARMED exact=yes files=0 change=0 clicks=1 dialog=0 ms=5025`; then `DIALOG leg=a
  before=0 after-click=1 after-close=0 ms=124 change=0`.
- `ROW R19-CHOOSE-JSOFF PASS`: sdk `JS_DISABLED exact=yes files=0 change=0 clicks=0 ms=6`; control `ok files=1 change=1`;
  banner `idle-ms=20006 banner=none control=pass`.
- **`ROW R19-G2-1 FAIL`**: `G2 … a-reply=34 b-reply=35106 gap-ms=35072 holder-after-reply-ms=477 a-effect=1 b=TIMEOUT`;
  the focusFirst variant (recorded): `a-reply=15 b-reply=35118 gap-ms=35103 holder-after-reply-ms=479`.
- `ROW R19-G2-2 PASS`: five `G2TYPE round=<i> sent=40 got=40 lost=0 b-calls=3 b-ok=3 b-lock-timeout=0`.
- `ROW R19-RESTORE PASS slice=C`; `ROW R19-LOGS PASS slice=C` (§5).

## 4. STOPs and returns (R7.6)
None (`stop-return=0`). No native dialog was left open at any read: CLOSERPROBE's, CHOOSE-4's three and DISARM's one were
each closed by the wave (`after-close=0`); every other `dialog=` read 0.

## 5. Restore, R19-LOGS, after-state
- R19-RESTORE: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`;
  read-back `stored page equal true, daemon.status equal true, title armed true`; `ROW UP-RESTORE PASS`; `RULES 0`;
  `DIALOGS liveC19 native=0 devtools=0 wave-windows-open=1` (the last a record, #363).
- R19-LOGS: `SCAN console` and `SCAN daemon` all 0; `DAEMONLOG liveC19 sentinel=0 console-text=0 args-text=0`; SCANTOOL
  all 0 except `browser_upload_file shot-line=1` (leg c's TIMEOUT failure report saves a screenshot); `SCAN actors: ://=1
  (fixture 1, other 0) token=0 sentinel=0 profile-other=0 shot-line=1`; `CHECK actors profile-all=1` (in the out folder's
  actors file, not committed; liveB19 read 0, and leg c's saved-screenshot line is the likely carrier, not checked).
  `CAPSEG liveC19 seg=1 saved=yes before=end`.
- After: the runner stopped daemon PID 37668 (`daemon\dist\index.js`) by `daemon-shutdown`; nothing listening on 9234 or
  8080-8089 (step agent re-read); node PID 22152 (unrelated) only; no python. Chrome top-level windows: 38602544 and
  68708, the user's, as before the run (the runner's listing missed 68708; the step agent's UIA read shows it present and
  visible); no DevTools or wave window left; nothing closed by hand.

## 6. Findings (the three FAILs, recorded; cause readings for S7-record)
1. **R19-CHOOSE-REFUSE `dis`: the expected value looks unreachable (an expected-value question, raised before the run).**
   The `dis` page's button calls `click()` on a `disabled` file input; the HTML spec makes `click()` on a disabled form
   control return at once, so no chooser opens and the call answers `TIMEOUT` at the 5 s wait (measured: `ms=5023`,
   `clicks=1`, `files=0`). The product's disabled refusal (`extension/src/upload-files.ts:457`) runs only after a
   `fileChooserOpened`. Page unchanged, no dialog: the leg shows no harm, but the sheet's `the file input is disabled`
   cannot be reached this way on any build (the verifier's side opinion agrees, from the spec).
2. **R19-CHOOSE-KEPT: `change` stayed 1 on the second call.** Both calls answered `ok` with `files=1`, `clicks` went 1 → 2,
   banner continuous. Both calls set the same file (`s11-1k.bin`) into the same input; the likely cause is that the
   browser fires no `change` when the selection does not change (inferred, not measured). If so, the judge's `change` 1 → 2
   (#363's reading of "+1 each") cannot hold with one file on any build. Not a product failure shown.
3. **R19-G2-1: B's screenshot ended `TIMEOUT` at about 35 s in both variants.** The hold itself was seen
   (`holder-after-reply-ms=477`, `479`, ≥ 450) and A's click landed (`a-effect=1`); B never answered `ok`, so the `b=ok`
   and gap clauses fail. G2-2, with the same two windows, had 15 of 15 B screenshots `ok`. First candidate:
   `extension/CLAUDE.md`'s "a capture of a tab in a fully covered window hangs" (TIMEOUT at 35 s): window X is opened by
   `New-S16Window` and brought to the front (`s12-r19-b.ps1:37`), and B's tab is in W. Why G2-2 did not hang is not
   explained. Cause not established.
- **Same defect class outside this slice:** `recipes/s12-r19-de.ts:81` (liveE19's R19-VERSION) uses `IN = { css: "#in" }`
  too; if its page hides `#in` as c1 does, it answers `LOCATOR_NOT_FOUND`. For liveE19's step agent.
- Recorded, not judged: KEEPSEQ `poll-ms=369` above the sheet's line form `≤250` (as liveB19's 280, 319).
- Gotcha candidates for `recipes/CLAUDE.md` (close-out): (1) a `hidden` file input cannot be a locator target (the walk
  prunes it); use the visible input or its label; (2) a page's `click()` on a disabled file input opens no chooser; (3)
  setting the same file again may fire no `change` (inferred).

## 7. Proposed decisions
### 2026-10-29 · R19-CHOOSE-MCP leg b's target is the driver's, and `#vis` is it
**Decided:** accept fix round 1 (`0c42637`): leg b targets c1's visible file input `#vis`. **Why:** the sheet names only
"the file input itself", and the hidden `#in` cannot be located on any build. **Instead of:** a fixture change, or a leg
that fails on the locator. **Revisit if:** the session agent reads the target as a sheet constant. **By:** Claude
(proposed)

### 2026-10-29 · R19-CHOOSE-REFUSE `dis` and R19-CHOOSE-KEPT's `change`: the sheet's expected values, for a ruling
**Decided:** none; this needs a ruling. Both FAILs stand as printed. In both, the measurement fits a browser fact that no
build can change: a disabled input's `click()` opens nothing; the same file set twice may fire no `change`. S7-record
reads each: either the clause is NOT DISCRIMINATING on this page (as #366 handled a wrong constant), or a later wave
re-measures it as a new row. For `dis`, the target would be the disabled input itself, if the product's pre-click target
rule refuses it. For KEPT, the second call would use a second file. **Why:** an expected value is never edited after its
run, and a FAIL is not turned into a PASS here. **Instead of:** a fourth fix round now, or a re-run changed after seeing
the answer. **Revisit if:** a measurement shows the browser fires `change` for the same file, which would make KEPT a
product finding. **By:** Claude (proposed, for the session agent; the #366 kind)

### 2026-10-29 · R19-G2-1's B timeout goes to S7-record for a cause reading
**Decided:** R19-G2-1 stands FAIL. S7-record reads the cause from the evidence; the first candidate is the covered-window
capture hang. If that is the cause, the row is NOT DISCRIMINATING for its `b=ok` clause (a helper placement), never PASS;
a product cause stays FAIL. **Why:** cause before verdict, as #367. **Instead of:** attempt 2 now with no fix; a placement
fix after seeing the FAIL. **Revisit if:** the session agent wants a re-measure with X placed beside W, as a new row.
**By:** Claude (proposed)

## 8. Handoff
Nothing running: no listener on 9234 or 8080–8089, daemon shut down, no repo node or python. Safety state as found
(read back equal by count and hash). No native dialog, DevTools or wave window open; the user's two Chrome windows were
untouched. liveC19 closes at attempt 1 (2 attempts and 2 fix rounds unused). Next: liveD19 (a fresh step agent), with
§6's `-de.ts:81` note.
