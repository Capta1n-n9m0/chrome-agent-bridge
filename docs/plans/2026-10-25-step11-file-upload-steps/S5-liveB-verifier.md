# S5-liveB verifier report (Run 16, liveB)

Model: Claude Opus 5.5. UTC start 2026-10-26T05:05:06Z, end 05:17Z. I only read and ran checks: I drove no Chrome,
started no daemon or server and committed nothing. The evidence is commit `dbe6022`, and the set-up fixes are
`341491e`.

## 1. Verdict: PASS-with-notes

Exit checks S5.2–S5.6 hold for liveB, and every record verdict is the one its pre-written rule gives. The set-up fixes
change no pass rule and no guard, and their tests fail on the pre-fix code. All findings are MINOR or NIT. One of them
matters for S5-record: **F1, the banner clause is not discriminating.** UP-6B's banner FAIL (and liveA's UP-6) is most
likely caused by the wave's own `evaluate` reads, so it is not evidence of a product defect.

## 2. Rows (record = the lines `dbe6022` appended to `S5-run-record.md`; rules from `docs/e2e-test-plan.md` §4.23)

| Row | Record | Mine | Reason |
|---|---|---|---|
| UP-0 (B) | CHECK PASS | PASS | Both found states are `armed=true evaluate=true`, with 0/0 lines and the empty hash, which may be printed. `TOGGLE reading on (candidates 1; on 1, off 0); nothing was pressed`. ROOT was added with `BOX uploadfolders set (1 …)` and read back with `RESTORE uploadfolders lines=1 hash=equal`. |
| UP-1 | PASS | PASS (F1 on the banner clause) | 0.6's table gives "received on a background tab: no focus needed". The rule `up1Outcome` (`s11-rules.ts:260-274`) checks `knownBehind`, then the page hash, `isTrusted`, `active=false` after the call and the human's tab unchanged. The front leg also passes. |
| UP-2 | PASS | PASS | The judge compares 3 files in order against the wave's sha256 (framing 167–169). The call took 119 ms against the 15 s bound. |
| UP-3 / UP-4 | PASS | PASS | Each step passes `simple()`'s four clauses: ok, the result's files, no other input changed, and the page judge. |
| UP-5 | PASS | PASS | I re-read the actor's tool results. Turn 1 holds `Uploaded 1 file(s) to css #up-single:` and `s11-sent.bin · 1024 bytes · sha256 259854eb…`, which equals the framing's line 170. Turn 2 holds K-mcp-up. `MCP_UP_LINE` equals the sheet's text. |
| UP-6B | FAIL (banner) | FAIL as recorded | The five clause verdicts are shown and all PASS (exact, page untouched); only `CHECK UP-6B banner FAIL` fails. **F1: the sampler window contains the helper's own `evaluate` calls.** |
| UP-8 | PASS | PASS | The `csp` check passes (the header plus the blocked/ran pair), then the standard upload clauses. |
| UP-9 | PASS | PASS | K-gate is exact and the page is untouched. Framing 172 shows the junction resolves outside `<ROOT>`. |
| UP-PATCH | PASS | PASS | `patchVerdict` would have returned NOT MEASURED if the control had not been counted. |
| UP-TWICE | PASS | PASS | 2 changes, 2 mark pairs, and the page holds the 5 MiB file. |
| UP-RAW | RECORD | RECORD | No leak; the mark is balanced. Observed: `ok; the page holds 1 file(s)` for a **file that does not exist** (F4). |
| UP-NAV | RECORD | RECORD | `navVerdict` would have returned NOT MEASURED if the new document were not `?s11=nav-after`. Observed: `REF_STALE` (93 characters, not in the table). |
| UP-DEVT | NOT MEASURED | NOT MEASURED (honest, per rule) | The call succeeded, and the rule says that is NOT MEASURED. Nothing in the evidence shows DevTools opened in X (F3). |
| UP-STALE | RECORD | RECORD (F5) | The tab was opened before liveB's reload (framing 181–184), so the row is honest. But the script it held was liveA's Step 11 build, not Step 10's as the sheet says. |
| UP-7J | PASS | PASS | `evaluate -> false`, the upload, then `-> true`, each read back equal. The daemon log (lines 48–49) agrees. |
| UP-RACE-A | NOT MEASURED (not discriminating) | NOT MEASURED (honest, per rule) | `80 ok, then 0 K-disarmed`. See F2: the record cannot show that the loop ended before the press. |
| UP-RACE-B | NOT MEASURED (not discriminating) | NOT MEASURED (honest, per rule) | `80 ok, then 0 K-blocked`. `loop-done` was seen 6 ms after the block-list save, so the loop ended before the edit. |
| UP-RESTORE | PASS | PASS | See S5.4. |
| UP-LOGS | PASS ×3 | PASS | See S5.6. The console holds the control press: `safety: disarmed by the user`, 2 events. |

Totals: 10 PASS, 1 FAIL, 3 RECORD and 3 NOT MEASURED, over the 17 rows that wait on G11-3. UP-RESTORE and UP-LOGS also
pass. The ledger's "11 PASS" is off by one (NIT).

## 3. Exit checks

- **S5.2: holds (N1).** liveB ran no build. The `dist/` files have mtime 08:18:15+04, which is liveA's build from
  `0abd25e`. `git diff 0abd25e..HEAD -- shared daemon sdk mcp extension | wc -l` gives `0`. `sha256sum
  daemon/dist/index.js` gives `834c77ba…`, which equals `S5-liveB-daemon.txt:2` (`build=834c77ba…`). The reload was
  done by `reload-extension.ps1` (`exit 0 (attempt 1)`, framing 184–195), after `prestale`, for UP-STALE. The first
  liveB row answers prove the loaded extension: Step 11's `uploadFiles` and S3's K-notinput. **N1:** the record's
  liveB part starts with the toggle read and UP-0, not with a build line. The sheet puts UP-L1 in liveA only, so
  nothing was skipped, but the proof sits in the daemon slice and the framing, not in the record's first line.
- **S5.3: holds (F1–F5).** I judged each row above against §4.23 and the code that judged it (`recipes/s11.ts`
  586–760, `s11-rules.ts`). A script (`scratchpad/kB.ts`) compared the 21 keys in `K` with the sheet's table and
  found `compared 21, differ 4`. The 4 are the K-opt rows, flagged only because their "code" column is not an error
  code (liveA only). All 17 error constants match the table exactly. Every upload row's verdict comes from `uploadPageJudge` or
  `refusalPageJudge` against the hashes the wave recorded, never from an `ok`. Refusals left 0 files: UP-6B ×5, UP-9,
  and UP-5 turn 2. Every final mark count is 0. The runner's row lines are verbatim except for three that carry
  parenthetical notes the record lacks (UP-1, UP-6B, UP-LOGS; NIT).
- **S5.4: holds.** `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`,
  plus `stored page equal true, daemon.status equal true, title armed true` (record 163–165). These equal liveB's
  UP-0 (record 14 and 16). The daemon log ends `armed=true evaluate=true blocked=0` (line 66). Only the empty-text
  hash is printed. `%TEMP%\bridge-e2e\s11\found.json` holds only booleans, `{lines, sha256}` and the toggle.
- **S5.5: holds for liveB.** `diff` of the raw `%TEMP%\bridge-e2e\s11\r16-framing.txt` against the committed
  `S5-liveB-framing.txt` gives exit 0 (identical, 281 lines). Its only `STOP` lines are 2–8, which are liveA's
  04:18Z ones. The liveB lines (153–281), the liveB record part, the daemon slice and the console capture have 0
  `STOP`/throw/exception lines. The only "guard" words are `PARK … (before the … guard)` notes. Nothing needed a
  return.
- **S5.6: holds.** My scan (`scratchpad/scan.mjs`) read the token from `bridge.token` and never printed it. It treats
  as fixture only the #277/#278 set, matches the sentinel as `s11-`+12 hex (`s11.ts:422`), and checks the profile
  path in 4 forms:

| File | URLs | fixture | other | token | sentinel | profile |
|---|---|---|---|---|---|---|
| record, liveB part | 11 | 11 | 0 | 0 | 0 | 0 |
| S5-run-record.md (whole) | 30 | 30 | 0 | 0 | 0 | 0 |
| S5-liveB-framing.txt (whole / liveB lines 153–281) | 7 / 3 | 7 / 3 | 0 | 0 | 0 | 0 |
| S5-liveB-console.txt | 0 | 0 | 0 | 0 | 0 | 0 |
| S5-liveB-daemon.txt | 0 | 0 | 0 | 0 | 0 | 0 |
| UP-5 actor results (re-filtered with `resultLines`) | 1 | 1 | 0 | 0 | 0 | 0 |
| ledger, runner and fixer reports | 1 / 0 / 2 | 0 | prose `scheme://` and `file:///` only | 0 | 0 | 0 |

The fixture hosts were `http://127.0.0.1:8081`, `chrome://extensions` and `chrome-extension://cpnem…/`. **Console
coverage:** the console block ran 05:01:23.9–05:01:26.0Z, before `up-0` started at 05:01:26.009Z
(`S5-liveB-framing.txt:220-229`). The capture runs from `[bridge] connection: up` (the worker restart after the
reload) to the second disarm/arm pair (UP-RESTORE's control), so it covers every liveB row. NIT N2: the capture's
first line is the DevTools window title, `DevTools - <Chrome profile display name>` (`S5-liveB-console.txt:1`).
That is a name, not a path, and no UP-LOGS rule counts it, but it is a user-identifying string in public evidence.

## 4. The set-up fixes (`341491e`)

- `npm test` gives `Test Files 154 passed (154)`, `Tests 3811 passed (3811)`: 3803 + 8 new, as claimed. All six
  recipes tsconfigs (`tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`) exit 0.
- I ran the new test file against the pre-fix code in a git worktree at `decb6fb` with its own `npm ci`. **6 of 8
  failed:** both F3 pure tests, F4 "SCAN lines do not count", F5 CLICK, the console stop-path test, and F3 wiring.
  2 passed, both as expected: "real URLs still count", which guards against a regression, and "console before
  UP-0", which was already true. The worktree was removed after its three junctions were unlinked with `rmdir`; each
  pointed inside the worktree. The main `node_modules` is intact (`.bin` 42 entries).
- **The row equals the old `all(...)`.** `scratchpad/eqB.ts` ran 160 000 cases: UP6, UP6B, mixed and empty step lists;
  missing, wrong-code, wrong-message, extra-`data` and no-error observations; touched pages; all four sampler/seen
  pairs. It gave `row differs 0, clauses differ from refusalSteps 0`. This is also true by construction, because
  `refusalRowVerdicts.row` is the same expression as `all` (`s11.ts:203-205`).
- **No pass rule or guard changed.** The `s11-rules.ts` diff adds one function and changes `scanText`'s URL count
  only. The fixture rule and the token, sentinel and profile counts are untouched, and `logsVerdict` is unchanged.
  The `s11-r16.ps1` diff adds `Save-S16Console` and the `S16ConsoleRead` persist only. `s9-win.ps1` changes its
  print only. `git diff decb6fb..HEAD -- docs/e2e-test-plan.md docs/plans/2026-10-25-step11-file-upload.md` is
  empty.

## 5. Findings

- **F1 (MINOR, for S5-record): the banner clause cannot tell the product's attach from the wave's own.** `refusalRow`
  (`recipes/s11.ts:401-412`) wraps `body` in `sampled()`, and `body` calls `observe()` → `reset()` / `readPage()` →
  `ev()` → the `evaluate` method. That method attaches `chrome.debugger` (`extension/src/handlers/evaluate.ts:37-39`,
  and the console shows `[bridge] evaluate N chars` ×112). The sampler (`recipes/s11-win.ps1:78-95`) counts any poll
  with a banner and does not separate polls taken before the call from polls taken after. So UP-6B's `banner=seen`,
  and liveA's UP-6, are expected even if no refusal ever attaches. UP-1's `banner seen` PASS cannot be separated from
  the `reset()` evaluate just before its window either (`s11.ts:606-607`; R14-4b says the banner lingers). The
  verdicts stand as pre-written; nothing is re-run. **Suggested:** S5-record writes UP-6/UP-6B as "FAIL (banner); the
  sampler window contains the wave's own debugger attaches, so the clause is not discriminating", and files no
  product defect from them. A later row should sample without any `evaluate` in the window.
- **F2 (MINOR): UP-RACE-A cannot show that its 80 oks all came before the disarm.** The loop (`s11.ts:760-764`)
  records no per-call time. The press was at ready + 1.63 s (record 99–103), and race B's loop took ≤ 2.43 s, so 80
  calls in 1.63 s is close. An ok returned during the disarm would look exactly like this record. UP-7 (a) (liveA)
  shows the gate refuses an upload while disarmed, so a breach is unlikely, but this row does not exclude one.
  **Suggested:** a re-registered row with per-call timestamps and the press before the cap can be reached.
- **F3 (MINOR): UP-DEVT never shows DevTools open.** `Send-S11DevTools` waits 1.8 s after F12 (`s11-win.ps1:337-342`)
  but checks no DevTools window. "DevTools was not attached" is the sheet's label, not an observation. Chrome 156 may
  also let `chrome.debugger` attach beside DevTools. Either way the row is NOT MEASURED, as the rule says.
- **F4 (MINOR, a RECORD fact): a raw call with a missing path under `<ROOT>` answered `ok`, and the page holds 1
  file** (record 60–61). The extension does not check that the file exists, only the SDK preflight does, so a raw
  client can give the page a phantom `File`. No path leaked. This is for S5-record's proposed decisions.
- **F5 (NIT): UP-STALE's script was liveA's Step 11 build, not "the Step 10 content script"** (§4.23, the row's
  steps; `s11.ts:463` comment). The row still measures S3 §7 item 7: a content script older than the reload.
- **N1 (NIT):** S5.2's proof is not the record's first liveB line (see §3).
- **N2 (NIT):** the Chrome profile display name appears in `S5-liveB-console.txt:1`.
- **N3 (NIT):** the ledger says "11 PASS" where the count is 10 (plus UP-RESTORE and UP-LOGS). The runner report
  says it ended "~05:10Z", but its evidence was committed at 05:04:44Z. Three "verbatim" row lines carry notes the
  record does not have.

## 6. Deviations and handoff

- The scratchpad already held a stale non-git copy of the repo, `scratchpad/wt`, from an earlier agent. My first
  `git worktree add` there failed, and the `npm ci` chained after it ran inside that copy, replacing its
  `node_modules` with real directories. Its five `@bridge/*` junctions point inside `wt` only, and the main tree was
  not touched (checked after). I left it in place. I ran the real check in `scratchpad/vB-pre` and removed it.
- No processes of mine remain. Only node PID 22152 (the user's) is running, and 9234 is free (the daemon made its
  idle exit). The uncommitted `S5-liveB.ledger.md` and `journal.md` belong to the step agent and the session agent.
- Scratch scripts: `scratchpad/scan.mjs`, `eqB.ts`, `kB.ts`, `kB2.ts`, `actB.ts`.
