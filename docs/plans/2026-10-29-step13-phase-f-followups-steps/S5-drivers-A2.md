# S5-drivers-A2 — the liveA20 driver, second half (step report)

Step agent: Claude Opus 5.5, medium. Builder and fixers Sonnet 5.5, medium; verifiers Opus 5.5, medium; committer Sonnet 5.5, medium.

## 1. Verdict

**DONE.** A2 finishes the liveA20 driver on A1 (`2224637`). A1's four carried findings (S5-drivers-A.md §6 items 1–4) are fixed with
tests. Every slice-A row of §4.28 now has a code path that prints its pre-written form and verdict. Every STOP line is followed by its
RETURN, with a test for each STOP. Nothing was run live: no Chrome, no daemon on 9234, no reload.

## 2. Outputs

- **New files:**
  - `recipes/s13-r20-a2.ts`: the CON-DESC, CON-NOTEA, CON-CAP, CON-4, CON-FLOOR and ARGS-OLD actors and their judges.
  - `recipes/s13-r20-a.ps1`: the entry script.
  - `recipes/test/s13-r20-a2.test.ts`.
- **Changed files:**
  - `recipes/s13-r20.ts` (`scanExit20`: a sentinel count is now a `text-leak`, as R20-LOGS's rule says).
  - `recipes/s13-r20-a.ts` (`grantTiming`, finding 1).
  - `recipes/s13-r20.ps1`: R20-0's line order; the `go`-only click; the W2 CHECK line; the CON, ARGS-OLD, RESTORE and LOGS blocks; the
    deferral turned off; and `s12-r19-c.ps1` dot-sourced read-only for the dialog counts.
  - The three A1 test files, plus `recipes/tsconfig.s13.json` and `tsconfig.s6.json` (include and exclude lists).
- **Size:** 585 new lines of code and tests, against a cap of 600 (`git diff --numstat 76f4f5e -- recipes` insertions plus `wc -l` of the
  untracked files; recounted by verifier3).
- **Tests:** `npm test` went from 242 files / 5,772 passed to 243 files / 5,798 passed (+26, none removed; verifier3 re-ran it).
  - Three expectations changed from `PEND` to `ROW` (`carry`, `noteaNoHandle`, `recordRow`) because those rows are no longer deferred.
    Verifier3 found none of them weaker.
- **Gates:** `npm run typecheck`, all eight `recipes/tsconfig*.json` and `npm run build` exit 0. After the build the tree holds only the
  lane's files.
- **Not edited:** no `recipes/s12-*` file and no `s13-forms.ts`.
- **Public-repo check:** no local home path and no user name in any slice file or evidence.
- **STOP reasons A2 adds, each tested STOP → RETURN:**
  - `text-leak` (`logsLeak`)
  - `old-build-left-loaded` (`oldLeft`)
  - `dialog-left-open` (`dialogLeft`)
  - `devtools-left-open` (`devtoolsLeft`)
- **Red proofs (#395 kept by every child):** they ran on scratch copies (`S13_R20_REPO`), in memory, or in a scratch worktree with its
  own `npm ci`. None of them edited the main tree.
  - Verifier round 0: 11 failures on HEAD's code.
  - Verifier round 1: every fixer-1 mutant was killed.
  - Verifier round 2: N1, N2 and N3 were each red before their fix.

Leaf reports: `S5-drivers-A2-builder.md`, `-fixer1.md`, `-fixer2.md`, `-verifier.md`, `-verifier2.md`, `-verifier3.md` (evidence `.txt`
files beside them). The READ list given to each child was:
- `S5-drivers-A.md` and `-verifier3.md`
- `S5-sheet.md` §7 and `S5-sheet-fixer1.md`
- `S5-helpers.md`
- e2e plan §4.28 (l.1938–1999)
- the phase doc l.251–332
- decisions #387, #391, #395, #398–#402
- `recipes/CLAUDE.md`
- A1's files and tests
- Run 19's drivers, read-only

## 3. Verifier verdict

- **Round 0 (`S5-drivers-A2-verifier.md`): FAIL.** 2 MAJOR, 5 MINOR, 3 NIT.
  - MAJOR: ARGS-OLD was gated on the very refusal the row tests.
  - MAJOR: R20-LOGS scanned the console capture without Run 19's `clean-console` step.
  - MINOR: RECORD legs printed PASS; the settle step turned a row's own FAIL into NOT MEASURED; three test gaps; three missing run facts;
    a CON-DESC throw stopped the wave.
- **Round 1 (`-verifier2.md`): FAIL.** 1 new MAJOR, 2 MINOR, 1 NIT.
  - N1 MAJOR: the deferral covered ARGS and CON rows, which have no console clause. It could change their verdicts and dropped ROW lines
    on a STOP.
  - N2 MINOR: the entry-script header lacked two operating notes.
  - N3 MINOR: CON-CAP's line length was not printed.
- **Round 2 (`-verifier3.md`): PASS-with-notes.** 0 MINOR or above; 3 NITs:
  - two test names still say "settled at R20-LOGS";
  - `stopBeforeLogs` does not assert that the STOP line fired;
  - Run 19's "console-clause pending" text can no longer be reached.

Fix rounds used: 2 of 3. Findings in total: 3 MAJOR, 7 MINOR, 7 NIT across three rounds.

## 4. Deviations

- **Finding 3 (W2) was resolved by a line, not a second window.** The driver prints `CHECK R20-POP-OTHER third b-window=W (sheet: W2)`.
  No SDK, MCP or daemon call opens a tab in a chosen window. The leg still discriminates by its stated rule (A1 verifier3 §3.3).
- **The deferral is turned off (step agent's ruling, N1, confirmed by verifier3).** I re-read §4.28 l.1968–1975: no slice-A ARGS or CON
  row has a worker-console clause, because their `sentinel=` counts are page reads. So `$R19DeferRe` in `s13-r20.ps1` matches nothing,
  and every row prints its own ROW inline.
- **R20-CON-DESC has no line form in §4.28.** The driver prints `CHECK R20-CON-DESC sentence-1=<n> sentence-2=<n> control-tool=<read|missing>`
  and a `LEG` line. This needs a dated sheet note (§5).
- **R20-CON-NOTEA runs as two actor runs tied by a tab handle.** The first run keeps the `notea` tab, and the second claims it for the
  `blocked` leg. The daemon releases a gone client's leases and keeps the handle (`daemon/src/intercept.ts`, `clientGone` → `releaseAll`;
  verifier round 0 §4). A failed claim gives NOT MEASURED `claim-failed`, never a PASS.

## 5. Proposed decisions

### 2026-10-29 · S5-drivers-A2: a grant that lands before the click is not counted
**Decided:** `grantTiming(grants, t0)` gives a tolerance of `PRE_CLICK_TOL_MS = 20`. A first grant earlier than `t0 - 20` is `preClick`:
the leg prints `CHECK <row> <leg> grant-before-click=yes`, the round is not counted, and the leg reads NOT DISCRIMINATING.
**Why:** the grant was not caused by this round's click, and not counting it can never give a false pass.
**Instead of:** clamping `in-ms` at 0.
**Revisit if:** live runs show clock skew between Node and .NET above 20 ms.
**By:** Claude (proposed)

### 2026-10-29 · S5-drivers-A2: no deferral of slice-A rows to R20-LOGS
**Decided:** Run 20 slice A defers no row to R20-LOGS. ARGS and CON rows print their own ROW line inline.
**Why:** §4.28 l.1968–1975 give none of them a worker-console clause. Deferring them let a logs problem change their verdicts, and a STOP
before R20-LOGS dropped their ROW lines.
**Instead of:** Run 19's `^R19-(ARGS|CON)-` deferral.
**Revisit if:** a slice-A row gains a console clause.
**By:** Claude (proposed)

### 2026-10-29 · S5-drivers-A2: R20-CON-DESC's line form
**Decided:** the driver prints `CHECK R20-CON-DESC sentence-1=<n> sentence-2=<n> control-tool=<read|missing>`. A throw from the tool
listing prints `LEG R20-CON-DESC actor-error FAIL`.
**Why:** §4.28 gives no form for this row.
**Instead of:** an unstated form.
**Revisit if:** the session agent prefers another form. A dated §4.28 note before the run is needed either way.
**By:** Claude (proposed)

## 6. Findings

- **For the session agent:**
  - `recipes/CLAUDE.md` says "all seven" tsconfigs. It should say "eight", name the `.s6` exclude list, and name the new entry script
    `recipes/s13-r20-a.ps1`.
  - A dated §4.28 note is needed for CON-DESC's form and for the deferral ruling.
- **Carried NITs** (verifier3; none blocks the run): the stale test names; `stopBeforeLogs` not asserting the STOP; the unreachable Run 19
  pending text. Also from round 0: `conrefLine` prints `same-as=snapshot` as a fixed word, and a `notea` tab left by a throw stays open
  until the slice's end.
- **`SCAN20 actors` covers MCP results only.** The actors file is written by the MCP wrapper, as in Run 19.

## 7. Handoff

No processes running and nothing live. The commit is made by the committer started after this report.

## 8. How to run liveA20

**Ready to run** once this stage's commit and the session agent's bookkeeping (the dated §4.28 notes) are committed.

- **Command.** Run it from the repo root, from **Git Bash** (python is on Git Bash's PATH), **in the background** (a slice outlasts the
  600 s tool cap):
  `S11_OUT=<fresh dir outside the repo> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-a.ps1 -Block liveA20`
  - A later attempt: `-Att <k>` with a fresh `S11_OUT`.
  - `-Block plan` prints the order without running anything.
  - `-Block teardown` cleans up after the slice, or after a return (see the exception under Resume).
  - Exit codes: 0 done, 2 STOP, 3 not run.
- **Prerequisites:**
  - §4.28's slice prologue (preflight and the `PORT` line).
  - A clean tree at a committed HEAD, then `npm run build`, then `recipes/reload-extension.ps1` (one re-run on exit 2).
  - Chrome running with the extension loaded and its toolbar button pinned; JavaScript on and armed, as found.
  - Port 9234 free or held by the daemon.
  - Port 8081 free: CON-NOTEA's two legs need it, otherwise both are NOT MEASURED `fixture-port`. The `servers` block starts the fixture
    server.
  - The worker-console capture is opened by the `console` block before the first row.
  - Every bookkeeping edit committed (a clean-tree guard stops the wave otherwise).
  - For R20-ARGS-OLD: network for the scratch worktree's own `npm ci`. The worktree lives under `S11_OUT`, and the code refuses one
    inside the repo.
- **Expected first two record lines (R20-0):** `MANIFEST …`, then exactly
  `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`.
  - In the FALLBACK (the console cannot evaluate), `perm` and `listener` read `unread`. The `CHECK R20-0 …` lines (the disk manifest and
    the `enabled` source) follow LOADED20, never precede it.
- **Where the record lands:**
  - The record: `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveA20.txt` (`-att<k>` for a later attempt).
  - In `S11_OUT`: the console segments `console-liveA20-<k>.txt`, the actors file `actors-liveA20.jsonl`, and the scan inputs.
- **What each STOP return means.** Every `STOP <reason>` is followed by `RETURN <seq> after-stop=<reason> restored=… readback=…`, and the
  runner returns.
  - `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0, before any state change): rebuild and reload, then start a new
    attempt.
  - `popup-lease-wrong` (POP rows): a product defect; escalate.
  - `existing-tool-changed` (an ARGS or CON control answered differently): escalate.
  - `args-ran-js-off` (R20-ARGS-3's effect counter moved with JavaScript off): escalate.
  - `old-build-left-loaded` (the ARGS-OLD frame could not restore and reload the HEAD build): check which build is loaded before anything
    else.
  - `not-restored` (the read-back differs from R20-0's by count or hash): escalate; never retry past it.
  - `dialog-left-open`, `devtools-left-open` (R20-RESTORE): a window was left on the user's screen; close it only with the user.
  - `text-leak` (R20-LOGS: a name, path or sentinel count above 0): escalate, and do not commit the record.
  - `throw-after-state` (a helper or environment throw after the first state change; the restore ran first).
- **Resume after a return:**
  - Run `-Block teardown`.
  - Fix a helper only between rows, never past a STOP line.
  - Start a new attempt with `-Att <k+1>` and a fresh `S11_OUT`. A slice gets at most three attempts.
  - **Exception:** after a RETURN that reads `restored=no`, run neither teardown nor a re-run; return to the user.
  - A leg that ends NOT MEASURED, NOT DISCRIMINATING or RECORD is recorded, and the wave goes on.
