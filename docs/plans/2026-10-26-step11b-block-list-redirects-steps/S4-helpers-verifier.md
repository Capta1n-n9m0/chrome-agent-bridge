# S4-helpers verifier: Run 17's live helpers (H1–H8)

Model Opus 5.5, effort medium. 2026-10-27. Read-only. My only outputs are scratch files under my temp dir and this report.

## 1. Verdict: FAIL

Five MAJOR findings. Each is a helper that cannot produce a sheet clause as pre-written, or that prints a measured-looking
count for something it did not measure. All five are small fixes inside the lane. The offline machinery is sound:

- the pure rules, the K17 ties, the hit counter, the fragment builder;
- the allow-lists, the console targeting guards and the stop procedure;
- counts, typecheck and build.

## 2. Exit criteria

| # | Check | Result |
|---|---|---|
| 1 | Every listed command exists, with a test or a dry-run line | Exists, all 7 items. The gaps are inside blocks (M1–M5), not missing commands. |
| 2 | Recipes suite and the seven `recipes/tsconfig*.json` | `npx tsc --noEmit -p` exits 0 for fe, base, s10, s11, s11b, s6 and s9. The 14 `s11b-*` files pass. |
| 3 | `npm test` = 4158/161 + n, none removed | `Test Files 175 passed (175)`, `Tests 4406 passed (4406)`. The new files sum to 248 tests, so 4406 − 248 = 4158 and 161 + 14 = 175. `git status` shows no tracked test file modified, so nothing was removed or weakened. |
| 4 | typecheck, build, clean tree | `npm run typecheck` 0, `npm run build` 0 (`built extension → dist/`). Tracked changes after the build: `journal.md` (not this slice) and `recipes/tsconfig.s6.json` only. |
| 5 | Nothing sensitive printed; hash-not-printed test | The test exists (`s11b-console.test.ts:239`). A mutant that appends the sha to the `STORED` line is killed. No list text or hash is typed into the console. Fails in part, see M4 and m5. |
| 6 | STOP map against the sheet | Mostly mapped; gaps in m2 and m4. |
| 7 | Lane | `git diff HEAD --stat -- docs/e2e-test-plan.md recipes/s9* recipes/s11.ts recipes/s11-* extension daemon sdk mcp shared test-fixtures` is empty. The `tsconfig.s6.json` exclude lines are a documented deviation (n4). |

**Dry runs I re-ran** (`scratchpad/dry.sh`, output in `dry-out.txt`; servers on ports 26762–26764, all killed):

- **Flip server:** `200` then `302`, logged `GET /h/back?s11b=bk 200` / `… 302`.
- **Delay server:** `302 1.002742s loc=http://localhost:8085/e2e-playground.html?s11b=rd5b`.
- **Slow server:** `200 1.06s`; `..%2F` gives `404`.
- **`hits`:** `HITS bk redirect=2 blocked=1` / `FLIP bk n200=1 n302=1 total=2`.
- **Console `--expr`:**
  - `EXPR manifest ok len=281`, `EXPR regex ok len=659`, `EXPR ctx ok len=317`.
  - With `--alias rd7`: `STOP: console input holds a pattern`, exit 2. The pre-type check works.
- **Console `--read`:**
  - manifest: PASS on `absent`, FAIL on `present`.
  - rules: `RULES 1 --expect 0` gives `ROW RULES STOP`, exit 2.
  - ctx: count 1 gives `ROW RD-7 STOP`, exit 2.
- **`foundlist`:** `no` exit 0; `localhost` gives `yes`, STOP exit 2.
- **`scan`:** an 8085 URL gives `localhost:8085=1`, STOP exit 2.
- **`--dry`:** every SDK subcommand prints its `PLAN` line, exit 0.
- **Judges:** `judge-history` and `judge-gap` give PASS, NOT DISCRIMINATING and NOT MEASURED as specified.
- **`R17 -Block plan`:** the slice orders as builder 8 §3.
- **PowerShell parser:** 0 errors in both `.ps1` files.

**New tests fail without their code** (`scratchpad/mutate.mjs` on a scratch copy; output in `mut-out.txt`; the
`node_modules` junction was removed with `cmd /c rmdir`):

- **Killed, 14 of 17:**
  - pre-type check without `127.0.0.1`;
  - hits counted by tag prefix, and by total;
  - scanner with a 25-`a` run, and admitting 8084;
  - flip total 1 not judged NOT DISCRIMINATING;
  - `STORED` printing the hash;
  - a `"8085"` literal in the fragments, and a literal `://`;
  - allow-list admitting 8085 (ps1);
  - ROOT check by prefix (ps1);
  - FOUNDLIST without 8085;
  - K-own text drift;
  - liveA with rd0 and up-l1 swapped.
- **Survived, 3** (m4, n5):
  - the `dlHopReading` band edge;
  - removing `throw` on the rules-stuck line;
  - removing `-not $S16InRestore` from the stop procedure.

## 3. Findings

### M1 · MAJOR · `recipes/s11b-r17.ps1:407-424` — MANIFEST is not the record's first line (D4.2)

- **Evidence:**
  - `Set-S16Raw 'rd0'` points `S9_RAW` at the record.
  - The block then opens a window and calls `Read-S11FileAccess`, which prints
    `Say9 "TOGGLE reading $reading (candidates …)"` (`s11-win.ps1:250`).
  - Then it calls `Save-S11Found` (`FOUND STATE recorded`, `:231`) and `S11 found` (the `STATE` line).
  - Only after these does it run `Invoke-S11bConsoleEval $global:D 'manifest'` (`:416`).
  - The sheet's RD-0 says `MANIFEST …` (**the first line of the record**), and D4.2 says "the first line proves". On the
    FALLBACK branch, (a') also comes after these lines.
- **Fix:**
  - Run the manifest eval first. It is read-only and needs nothing.
  - Route the toggle and found reads to the framing file, or print them after (a)/(b).
  - Add a static test that the first record-bound print of `rd0` is the manifest eval.

### M2 · MAJOR · RD-0 (c) — the `STATE` line is Run 16's form, not the sheet's

- **Evidence:**
  - The sheet expects
    `STATE armed=true evaluate=true blocklist lines=<bl> uploadfolders valid=<f> invalid=<fi>`, with hashes withheld.
  - The runner reuses `S11 found`, whose line comes from `stateLine` (`recipes/s11-rules.ts:204-205`):
    `` `STATE … blocklist lines=${…}${shaPart} uploadfolders lines=${…}${shaPart}` ``.
  - So it prints `uploadfolders lines=`, has no `valid=`/`invalid=`, and appends the empty hash when a box is empty.
  - No `s11b` builder of the sheet's form exists. F-HOME and UP-OPT derive `f`/`fi` from the summary text instead.
- **Fix:**
  - Add a `B17 state --found <json> --folders <file>` that prints the sheet's form. Compute `valid`/`invalid` from the
    found folders text with `analyzeUploadFolders` (already K17-tied).
  - Tie it with a test.

### M3 · MAJOR · `s11b-r17.ps1:732-740`, `:675-692`; `s11b.ts:329` — RD-LOGS prints unmeasured counts as 0 and PASS (D4.6)

- **(a) `alias7`:** the runner never passes `--alias`. `B17 scan` reads `sentinel` from `state.json` but not `alias`, which
  `s11.ts:423` stores there. So `alias7=0` holds by construction. The sheet says the alias is "passed to the scan by
  argument".
- **(b) `sock127`:** no marks are written in `rd-dl-socket`, and `--mark-from/--mark-to` are never passed. `verdict17`
  sets `sockMarksMissing` only when `sock` is given, so the row prints `sock127=0` and PASS. My dry run shows the same:
  `M1 127.0.0.1 M2` gives `sock127=0 … PASS` without marks, and `sock127=1 … STOP` with them. Builder 8 notes this as
  "0 by construction".
- **(c) Actor results:** these are scanned by Run 16's `S11 scan` (`s11.ts:888-905`, `scanText`).
  - It allows fixture ports 8081 and 8084 only (`s11-rules.ts:502`).
  - It has no `localhost:8085`, 24-`a`, `bank.example`, `alias7` or `sock127` counts.
  - It prints Run 16's `SCAN … token= sentinel= profile=` line, not RD-LOGS's line.
- **Fix:**
  - `B17 scan` reads the alias from `state.json`, as it does the sentinel, and gets an `--what actors` mode with S11's file
    walk.
  - `rd-dl-socket` types two console markers (fixed text, pre-type checked) and records the daemon-log line counts at the
    window's ends.
  - `rd-logs` passes the marks. Missing marks or a missing alias print NOT MEASURED.

### M4 · MAJOR (likely, not measured) · `s11b.ts:224-238`, `s11b-rules.ts:312-319`, runner `rd5` (`--for 20000`) — the stored poller outlives its listener

- **Evidence:**
  - `storedListen` calls `finish(at)` on the first match, then `server.closeAllConnections()` and `close()`.
  - The typed poller keeps reading for `--for` ms and POSTs every distinct value.
  - RD-5 restores the list (`Set-S11bBlockList $O @()`) a few node runs later, well inside 20 s.
  - The poller then fetches `http://127.0.0.1:<ephemeral>/`, which no longer listens.
  - Chrome normally logs a failed request in that context's console (`… net::ERR_CONNECTION_REFUSED`), caught or not.
  - The capture is scanned by `scan17`. An ephemeral port is not a fixture port, so `other=1` and RD-LOGS STOPs.
  - No list text leaks; the risk is a false STOP after a pass.
- **Fix:**
  - Keep the listener accepting POSTs until `--for` + 1 s after the match: signal at the match, judge only up to the
    match, close at the end.
  - Or make the poller stop after the first POST of a value whose length equals the expected length. That is a weaker
    signal; the first fix is preferred.
  - Add a CLI test: a POST after the match must still get 204.

### M5 · MAJOR · `s11b-r17.ps1:431-440` — F-FILETAB (★) is incomplete

- **Evidence:** the block runs `tabs`, `snapshot blocked1`, `navigate blocked1 <8081>` (all `record`) and closes the
  window. Missing:
  - the sheet's **control** `navigate` of a fixture tab to the `file:` URL (K-fileurl);
  - the `tabCreated url-empty=<b>` RECORD;
  - any judgement of K-filepage or K-fileurl (S9's `--expect` has no such form; builder 7 §5 says so).
- **Fix:** add the control call through `B17 call` (extend `judgeCallAnswer` with `filepage` and `fileurl`, tied to K17).
  Read the opening's tab event, or record it NOT MEASURED with a reason. Judge the three answers.

### MINOR

- **m1 · `s11b-r17.ps1:497-514` — RD-DL-ERR and RD-DL-HOP:**
  - `LAT` is the node process's wall time, and its line form differs from the sheet: a `Say9` prefix and a
    `(node start included)` suffix. The sheet's form is `LAT RD-DL-HOP-<i> <ms> ms`.
  - `d` and `dlHopReading` are never computed. `judgeDlErrTrial`, `judgeDlHopTrial`, `dlHopD` and `dlHopReading` have no
    caller (grep shows none in `s11b.ts`, `s11b-r17.ps1` or `s11b-win.ps1`).
  - RD-DL-ERR uses `--expect code:INTERNAL`. That fails a non-INTERNAL, non-DOMAIN_BLOCKED code, which the sheet passes.
  - Fix: take `ms` from S9's own `ROW … (<ms> ms)` and run the pure judges through a `B17 judge-dl`. RD-1's `LAT RD-1` is
    likewise never printed.
- **m2 · RD-7 and RD-8 (`:516-538`):**
  - The UIA read of the options heading is not built, so on the FALLBACK branch no RD-7 STOP can fire.
  - Neither block reads `RULES` after its navigate reply. A stuck rule is caught only at RD-BACK's read and named for the
    wrong row.
- **m3 · RD-5 (`:628-660`):** if the stored value's format differs from `Write-S11bExpected`'s text (CRLF, trailing
  newline; builder 8 lists it as unproven), `stored` exits 3 at 30 s, but the call child waits up to 60 s for `--go`.
  It then exits with `STOP: the go signal did not come within 60 s`, and `Wait-R17Bg` throws a wave STOP. A measurement
  artefact ends the wave; the sheet calls that NOT DISCRIMINATING or NOT MEASURED. Fix: on a `stored` exit of 3, write a
  cancel file the call child honours, and record NOT MEASURED.
- **m4 · STOP map coverage:**
  - "tracked file changed outside the steps dir" is checked only in `preflight`, not before the record is committed.
  - "covered call proceeds" is a STOP only for RD-1 and RD-3; for RD-DL-HOP, RD-5 and RD-5b it is a FAIL.
  - Two survivors show the `.ps1` guards are untested: the no-double-restore condition in `Stop-S16Wave` (only its TS twin
    `stopPlan` is tested), and the `throw` after `Stop9` in `Read-R17Rules`. Without that `throw` the block keeps
    running after a STOP line until `Invoke-S16Block` notices.
- **m5 · Window-title lines are kept:** the sheet says "the capture drops window-title lines (profile display name,
  #283)". The runner uses `Read-S9WorkerConsole` as is (`s9-win.ps1:588-598`): every UIA name, no title filter. Nothing
  in the scan counts a profile display name. If S4-live commits the capture, #283 can recur. Fix: drop the window-title
  line in `rd-logs` before the scan.
- **m6 · `reload` runs `S11 setup` for every Run 16 tab (`:405`):**
  - This includes `u8` on `localhost:8084`. Nothing serves 8084 in Run 17, and the preflight does not check it, so a
    foreign holder of 8084 would be loaded in a wave tab.
  - The S11 key `rb` (an alias-host tab) is overwritten in the shared `state.json` by RD-BACK's `rb`, which leaves an
    orphan tab.
  - Fix: `S11 setup --only u6,raw,ra,j7,a7,w,sv` (plus `x` in liveB), and rename the history keys.

### NIT

- **n1:** RD-7 prints `CTX r7 count=<n>`, but its row writes `CTX tab=<label> count=<n>`. This is a sheet inconsistency; the
  closing list's form was kept. Record it in S4-record. The tab filter `includes("s11b=rd7")` also matches the setup tag
  `rd7p`. It is the same tab, so no harm, but compare the query value instead.
- **n2:** RD-BACK and RD-FWD print `HITS bk redirect=2 blocked=0` (the flip log as the redirect log). The sheet's form is
  `HITS bk blocked=0`.
- **n3:** `preTypeCheck` has no sentinel, and the runner never passes `--alias` to console subcommands. Neither can occur in
  the fixed builders' output.
- **n4:** the exclude lines in `recipes/tsconfig.s6.json` are outside the sheet's "no exception" lane. They are necessary
  (the s6 glob would pull in chrome-typed tests) and documented by builder 2.
- **n5:** the `dlHopReading` band edges are untested (a mutant survived), and the function is unwired (m1).
- **n6:** RD-4 and RD-6 STOP on any blocked count other than 1. The sheet names 0. This is stricter, not looser.
- **n7:** the K17 test asserts the code for K-url/K-tab/K-own/K-file*, but not for K-disarmed, K-gate and K-notarget.
  Those are inherited from `s11-rules`' K.
- **n8:** a risk in the sheet, not the helpers: S3b blocks RD-3's and RD-DL-HOP's hop by DNR. Chrome may log
  `GET http://localhost:8085/… net::ERR_BLOCKED_BY_CLIENT` in the worker console. By the sheet's own RD-LOGS rule (a
  Chrome-owned line naming a pattern), RD-LOGS would then fail. This is worth naming to S4-live before the run. The
  helpers implement the sheet as written.

## 4. Attacks that held
K17 ties by constant name (a drift mutant killed); hits per exact tag; RD-REGEX fragments with no pattern contiguous and `regexProof` discriminating (port and `://` mutants killed); the pre-type check on every builder and on the stored expression; `Invoke-S11bConsoleEval` keys only to the recorded live `DevTools` window, foreground and focus checked before the text and before Enter, FALLBACK before anything but the marker is typed, RD-0 refused after a state change; `Open-S11bWindow` admits 8083 and 8081 only, `Open-S11bFileWindow` strictly under ROOT, no `file:` URL printed (mutants killed); the stop procedure restores first, once, kills own PIDs only (start time checked), never `chrome.exe`, `$S9PinUiaOnly` set; the scanner counts an 8085 URL as a pattern (STOP) and drops its own `SCAN` lines; `B17 stored` hashes in-process and prints `STORED match=<yes|no> lines=<n>` (R3-1, R3-2 settled apart from M4).

## 5. Proposed decisions (builders') — my reading

- **Delay server logs no status (H1):** accept. The sheet's rows count its tag only.
- **`stored` POSTs the raw list to a loopback listener (H2, H4):** accept the design, with M4's fix.
- **`S11B-MARK` marker (H6):** accept. It is pattern-free and anchors the read.
- **`reload` before `console` (H8):** accept as design-local. The worker DevTools window detaches on a reload. Record that
  the capture then starts after `S11 setup`'s tabs and after the worker's start-up lines.
- **RD-7 CTX by query tag (H8):** accept; see n1.
- **The race `.press` file (H5, H6):** accept.
- **s11b-win.ps1's line cap 400 to 440 (H8):** accept. It is the builder's own size guard, not a protective check.
- **`dlHopReading` bands (H3):** acceptable as stated, but moot until m1 is fixed.

## 6. Handoff

- Nothing left running: the dry-run servers were killed, there are no python processes, and the junction was removed;
  the main `node_modules/.bin` is intact (42 entries). No Chrome, daemon or port 8081–8091/9234 was used.
- Evidence:
  - `…/scratchpad/dry.sh`, `dry-out.txt`
  - `mutate.mjs`, `mut-out.txt`
  - `npmtest.txt`, `checks.txt`
- Re-check after the fix:
  - M1–M5;
  - m1–m6 if they are fixed;
  - the three surviving mutants;
  - counts, the seven tsconfigs, build.
