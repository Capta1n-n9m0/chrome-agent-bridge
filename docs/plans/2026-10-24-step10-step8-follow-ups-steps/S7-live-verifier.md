# S7 live verifier — Run 15 (§4.22), attempts 1–4, PP1, RET-1, RET-1R

Fresh, independent level-2 live verifier (Opus 5.5), 2026-10-25 ~12:00–12:15Z, under `briefs/S7-live-verifier.md` as
amended by `briefs/S7-live-verifier2.md`. Read-only: no Chrome action, no daemon start, no 9234 client, no block, no
`claude -p`. HEAD `0e7647a`; uncommitted: `S7-run-record.md`, `S7.ledger.md`, `S7-daemon-log.txt`, `S7-run-raw.txt`
(+ `briefs/S7-live-verifier2.md`). The record and the returns were treated as claims; every count below was re-derived
with my own scanners (`<scratchpad>/vscan.py`, `<scratchpad>/vruns.py`, not in the repo), which print counts only.

## Verdicts

| Exit check | Verdict |
|---|---|
| S7.1 (§4.22 before the run; §4.20/§4.21 untouched) | **PASS** |
| S7.2 (build on committed code; reload; L1 = SAFE-0 discriminating) | **PASS** |
| S7.3 (rows vs §4.22) | **PASS-with-notes** — I agree with every recorded verdict (table below) |
| S7.4 (found state and read-back per attempt) | **PASS** |
| S7.5 (as superseded by #221/#222: PP1, RET-1, RET-1R; kills) | **PASS-with-notes** |
| S7.6 (STOP lines ↔ returns; log/transcript/committed-file counts) | **PASS-with-notes** |
| Clean-up | **PASS** |
| **Overall** | **PASS-with-notes** |

## Row table

| Row | Attempt | Recorded | Mine | Reason |
|---|---|---|---|---|
| SAFE-0 / SAFE-0-S10 (L1) | 1–4 | PASS | agree | `evaluateSaveStart` → `BAD_PARAMS` (Step 10 handler), build = disk sha; discriminating |
| R15-FOUND, REP-0 probe | 1–4 | RECORD / probe PASS | agree | framing rows, re-run per attempt by the sheet's design; REP-0 summary wording noted (N6) |
| BBL-1 (4 legs) | 1 | PASS | agree | old exit 4 / new exit 0; stuck 90006 ms, elsewhere 90013 ms ≤ 95 s; 1 press, 1 submit each |
| MCPF-1 | 1 | FAIL | agree | named `CHECK MCPF-1 <kind>-1-calls/-answer` printed FAIL (×6, raw); page 9/9 trusted is recorded, not a pass |
| CAP-1 | 1 | FAIL | agree | `CHECK CAP-1-mcp calls-0900`/`answer-0900` FAIL (raw); SDK half all PASS |
| SW-1 | 1 | NOT MEASURED | agree | STOP in set-up before trial 1 |
| SW-1R | 2 | RECORD, undetermined | agree | d = [101, 1276, 1421]; `swOutcome` needs 3/3 ≥ 950 or 3/3 ≤ 300 |
| R15-POP-2 | 2 | (a) PASS, (b) RECORD | agree | (a) grant 150 ms; (b) another tab, no grant — #211's Revisit-if not met |
| SAVE-1M, 4M, SURR, JSON, HOLD, CLOSE, FIX, 64, TTL | 2 | PASS | agree | every named CHECK PASS in the archived raw; hashes re-proved (below) |
| SAVE-PRIM / SAVE-IDONLY | 2 | RECORD, #217 not met | agree | primitive saved whole; idOnly gave no objectId |
| SAVE-REFUSE | 2 | FAIL | agree | 4 × `… with another message` (the `[chrome.debugger] ` prefix); the rule is character-exact. The prefix is the coded-error path of `extension/src/debugger-errors.ts:17-28` (documented, EVAL-5) — the row text was wrong, the FAIL stands |
| R15-3 | 2 | NOT MEASURED | agree | guard STOP before the re-arm click |
| SAVE-DISARM, SAVE-JSOFF, SAVE-BLOCK, JSD, MCPF-1-off | 3 | PASS | agree | all CHECK PASS; 0 FAIL lines in attempt 3's raw |
| R15-RESTORE / LOGS / SAVE-LOG / TEARDOWN | 3 | PASS | agree (LOGS with N3) | |
| PP1 | 3 | PASS | agree, with N2 | SDK = MCP = page sha256 in the record and in the actor transcript; only own files deleted; `exports/` empty now |
| RET-1 | 3 | NOT MEASURED | agree | kill observed, relaunch failed by our bug; never counts as a pass; not re-run (#222) |
| MCPF-1R | 4 | PASS | agree | 28 `CHECK MCPF-1R … PASS`, 0 FAIL; 9 page lines, 0 with `isTrusted=false`/`hidden`/`active=false`; 0 `ToolSearch` in the 3 actors' out.jsonl (5 in attempt 1's mcpf-click); focus answer quoted verbatim from the transcript |
| CAP-1R | 4 | PASS | agree | 6 CHECK PASS; MCP leg only, the one stated difference |
| R15-3R | 4 | PASS | agree | see #224 check below |
| R15-RESTORE / TEARDOWN | 4 | PASS | agree | |
| R15-LOGS | 4 | daemon + 14 transcripts PASS; console NOT MEASURED | agree | console capture holds only `safety: armed by the user` lines (3), no disarm control line — the rule names the disarm line |
| RET-1R | 4 | PASS | agree | `KILLED … 6448`, `relaunched at`, reconnect 106 ms, `tabGone` T1348 with its fixture URL, old Tab `TAB_GONE`, `3 handles retired`, tuple as found, start/end read-backs equal |

## Checks (commands and outputs, abridged)

**S7.1.** `git log -S"<row>" -- docs/e2e-test-plan.md`: §4.22 rows in `b55048d` (09:13:30Z) before runner 1's preflight
(09:14:19Z); SW-1R in `0fca1ea` (10:24:13Z) before attempt 2's reset (10:24:45Z); MCPF-1R, CAP-1R, R15-3R, RET-1R in
`29f9efc` (11:46:57Z) before runner A (11:47:44Z) and attempt 4 (reset 11:51:39Z); #224 in `d4983eb` (11:19Z). `git diff
--word-diff b55048d 0e7647a -- docs/e2e-test-plan.md`: only added rows and dated notes; RET-1 and PP1 rows gained only
the `*Granted 2026-10-25 (#221, …)*` note (`e28b609`, before runner 2). `git diff 02eb0c2 HEAD -- docs/e2e-test-plan.md`
→ one hunk `@@ -1290,6 +1290,140 @@`, pure addition after §4.21. `git diff --stat 02eb0c2 0e7647a -- daemon extension
mcp sdk shared` → empty (no product change during the wave).

**S7.2.** Each attempt's block 2: `tracked changes … 0`, `no tracked change after the build`, six dist hashes equal
before/after (ledger, raw). Reload `exit 0 (attempt 1)` in all four attempts, each proved by a `extension resync` line.

**S7.4.** Found = end in every attempt: `sha256=e3b0c442…b855`, armed, JavaScript on, 0 sites (attempt 1 and 2 by the
stop procedure, 3 and 4 by block 33, PP1 start/end, RET-1 start, RET-1 end redone under #223, RET-1R start/end). The
daemon log's last state line before the idle exit: `11:58:15Z safety state: armed=true evaluate=true blocked=0`.

**#224 / R15-3R (A3).** Raw 11:56:06.774Z: `OCCLUDER 1 … rect [3617,80,3840,105] owner=driver:O rootOwner=driver:O`, one
occluder only (`occluders above O 1`; 0 at `placement-before-switch`); read rects all start at y ≥ 121, the occluder
spans y 80–105 → no overlap with any of the five; `EXEMPT 1 yes`. `r3rOccluderExempt` (`recipes/s10-rules.ts:1329`)
first refuses a driver window itself, then requires owner AND root owner driver windows and no overlap. Both #224
conditions met; no other occluder exempted. R14-3's pass rule: OFF title 49 ms, `DISARMED` with `{scope:"all"}`, O
`Bridge OFF…`/armed off, armed title 68 ms, `OPTIONS-WAIT reached 'Bridge armed.' after 31 ms`, state as found.

**S7.6 STOP lines.** `grep "STOP:"` over the five raws, `legs-raw.txt`, `s15-ret1/`, `s15-ret1r/`: 8 lines — runner 1
×2 (Return 1), sw1 ×2 (Return 2), r3 ×2 (Return 3), RET-1 relaunch (Return 4), RET-1 end NOT equal (Return 5); attempt
3/4 raws, legs-raw and RET-1R: 0; daemon.log: 0. All matched. **No observed row re-run:** ROW/CHECK ids per raw — attempt
2 has none of attempt 1's rows, attempt 3 none of 1–2's (its 9 `MCPF-1-off` lines are a new row; 0 `MCPF-1 ` lines),
attempt 4 only `MCPF-1R`, `CAP-1R`, `R15-3R` plus framing rows. Every `CHECK … FAIL` in the raws (8 in attempt 1, 5 in
attempt 2, 0 later) is in the record.

**S7.6 counts (A4), re-derived.** `vscan.py` over every file under `s15\actors\` (14 actors + pp1: transcripts, turn
files, `out.jsonl`, `in.txt`, `mcp.json`): non-allowed `scheme://host` 0, token 0, test pattern 0, real course host 0 —
in every file (my scan also counted 0 fixture URLs there: actors pass `tab` handles only). daemon.log since the mark
(401 lines now; 370 copied): URLs 0, token 0, pattern 0, `__s10`/`s15v-` 0. Console capture (attempt 4's): all 0.
Committed/uncommitted evidence: token 0, non-fixture hosts 0, real host 0 in record, ledger, `S7-daemon-log.txt`,
`S7-run-raw.txt` and every S7 report/brief; `S7-run-raw.txt` = the first 447 lines of `r15-raw.txt` (`cmp`), the daemon
copy = the first 370 lines since the mark (`cmp`). **Value runs:** `vruns.py` regenerated all six fixture values from
`test-fixtures/s10-save.html`'s deterministic builders and proved each by its recorded sha256 (1m, 4m, surr, json,
fix, 64m: `matches … True` ×6); positive control (40-char slices of four values in a probe file) counted 9 windows
each; then 196 files (all actor files, all raws incl. archives, `s15-ret1*`, every `S7*` file in the steps dir,
daemon.log since the mark) → 32-character runs 0 in every file. This closes attempt 4's "no value files" limit for the
synthetic values. **What stays unprovable:** the pp1 export (real data, deleted by design) — only the runner's count at
the time (`value-runs32 by value pp1-mcp:0`), quoted in the record with no surviving raw (N2).

**Clean-up.** `netstat`: one `TIME_WAIT` on 9234 (daemon 1428 idled out: `12:08:28Z … exit 0 (shutdown 1001)`), no
LISTENING on 9234/8080/8081/8083/8085. Processes: node 22152, claude 23208/24284 only (not ours); no python, esbuild,
wave node or claude; chrome 11, 0 with a headless/temp-profile/remote-debugging command line; browser pid 948 (RET-1R's
relaunch). `sv` gone; 0 `s15v-*` files anywhere under `bridge-e2e`; 0 PNGs under `s15`; `~/.chrome-agent-bridge/failures`
empty; `exports/` empty. Visible Chrome windows: 2 — by title category only: one "New Tab", one other (not printed); no
driver, fixture, options or DevTools window left.

## Findings (ranked)

- **N1 (A2, NOTE — not a wave kill): a Chrome start at 09:33:08Z is in no trace.** Runner 1's preflight read `Chrome
  windows 2; Chrome start 2026-10-24T18:52:20Z` (09:14:20Z); runners 2–4 read `Chrome windows 1; Chrome start
  2026-10-25T09:33:08.530Z`. Return 1 had ended every wave PID by 09:14:41Z; daemon.log has no line between then and
  09:57:05Z; wave fixer 1 ran after `488e69e` (09:33:50Z). The restart coincides with the user's #221 answer and is not
  the wave's, but the ledger never records it. Kills in the traces: exactly two — `KILLED … 32708` (RET-1, G10-2) and
  `KILLED … 6448` (RET-1R, G10-2); starts: the session agent's relaunch 10:52:55Z (recovery of RET-1's kill, #222) and
  RET-1R's 11:58:14Z. Daemon `extension session changed` lines: exactly these two (10:52:55Z n=2, 11:58:15Z n=3).
- **N2 (PP1 evidence): PP1's SDK-leg, bb-login and compare lines exist only as quoted in the record.** No raw holds them
  (`grep -rl "page export done in\|SDK-7 (SDK leg)\|SIGNED IN - SSO autofill" bridge-e2e` → only older runs and the BBL
  dry runs); `legs-raw.txt` holds only the state checks, and attempt 3's raw was archived at 10:40Z, before PP1. What I
  could check: the pp1 transcript (one `browser_evaluate` with `saveTo`, answer `419015 bytes · string · sha256
  efd3513c…c6df`, 0 hosts/token/pattern/value runs by my scan), start/end read-backs `-> equal` in `legs-raw.txt`,
  `exports/` and `pp1-failures/` empty. The course is named only "pp1" in the record.
- **N3 (A5): no trace shows a user window touched; one wave window was likely left open from Return 5 until RET-1R's
  kill.** Every close is by handle (driver handles, or #223's marked window with proof). The post-relaunch read
  (10:54:37Z) threw in `Wait-S9NewWindow` (`recipes/s9-win.ps1:237`) after its own `--new-window` launch — "found 2 …
  none is touched" — so its window was never closed. Runner A then saw 3 visible windows (11:47:44Z), RET-1R start 3,
  RET-1R end 2, now 2 (one "New Tab", one other). The 3 → 2 drop is consistent with that leftover not coming back
  after the granted kill — an inference; session restore is "not judged" by §4.22. Nothing the wave pressed reached a
  window it did not own.
- **N4 (S7.6): attempt 3's console PASS cannot be re-derived** — `r15-console.txt` was overwritten by attempt 4's capture
  (213 texts, all counts 0, 3 `armed by the user` lines, no disarm control → NOT MEASURED per the rule; agreed). The
  committed `S7-run-raw.txt` covers attempt 4 only; attempts 1–3's raws stay in `%TEMP%` archives (my spot check of 19
  quoted record lines across all four raws: 19 found verbatim).
- **N5 (record form):** MCPF-1R trials 2–3 and type/press repeats are condensed ("same lines as click-1"), not quoted;
  the raw has every line (28 PASS checks). Actor answers that are quoted (MCPF-1/1R focus question) match the
  transcripts verbatim.
- **N6 (carried):** REP-0's driver summary `(0 PASS, 1 FAIL, 3 NOT DISCRIMINATING …)` contradicts its own `REP-0 PASS`
  line in all four attempts — recorded as printed; a wording bug of the wrapper, unjudged.
- **N7 (doc NIT):** §4.22's preamble (lines 1299–1300) still says RET-1 and PP1 are "prepared here and NOT run"; only
  the row cells carry the grant note — no "*Superseded …*" note on the preamble.
- **N8 (process, recorded by the step agent):** the post-relaunch runner wrote `RET-1.pressed` beyond its brief; RET-1
  stays NOT MEASURED and its holder lines are RECORD only, so no verdict depends on it.

## Gotcha candidates

1. SW-1R's (ii) "front" capture took 870 ms in trial 1 against 287/218 ms in trials 2–3, while the human tab's
   `visible` came back at +962/+1554/+1630 ms in all three: a differential capture row can be confounded by the 2/s
   capture-slot spacing or other first-call cost — a d < 950 ms trial does not by itself show the event ended the wait.
2. A read-back helper that throws after launching its own window (`Wait-S9NewWindow` with 2 new windows) leaves that
   window open by design ("none is touched"); a later window count then includes it — record the leftover in the
   ledger when it happens.
3. Overwriting a scan's input file (`r15-console.txt`) on resume makes an earlier attempt's PASS unverifiable — archive
   per attempt as the raws already are.
