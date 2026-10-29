# S5-drivers-B4 — step report: liveB20's -3 POP rows, entry script, RESTORE/LOGS and How to run

Step agent: Opus, medium. Children: Sonnet builders, fixer and committers; Opus verifiers; all at medium.

## 1. Verdict

**DONE.** Split at the start into B4a and B4b, because the scope was plainly over ~600 lines (agent-rules §7). liveB20 can
be run from §8 below. Nothing ran against Chrome, a daemon, a fixture server or a port.

## 2. Outputs

- **B4a** `489bf47` (the three -3 rows): a new actor `recipes/s13-r20-b4.ts`, the PS blocks `recipes/s13-r20-b4.ps1` and
  two tests. It reuses slice A's POP round and human click (`s13-r20-a.ts` exports, an optional `v3`; `New-R20PopSteps
  -Pop3`); liveA20 is unchanged. About 471 lines. Tests 5872 → 5899, files 245 → 247.
- **B4b** (commit in the journal): the entry script `recipes/s13-r20-b.ps1`, slice B's blocks `recipes/s13-r20-b-defs.ps1`
  (window guard, `serve` step with the 120 s idle and 600 s budget bounds, G2-1 / VERSION handlers, restore, logs, -3
  evidence copy), the liveB20 order in `s13-r20.ps1`, `Invoke-R20Zero` taking a row id, B4a's MINOR-1 fix and tests. About
  480 lines. Tests 5899 → 5934, files 247 → 248. One assertion in `s13-r20-ps.test.ts` was moved to the new order;
  verifier1 found the moved assertion stricter, not weaker.
- Gates at B4b's verifier2: `npm test` 5934 passed / 248 files; `npm run typecheck`, all eight `recipes/tsconfig*.json`,
  `npm run build`, `node scripts/doc-check.mjs` exit 0; `-Block plan` exit 0, order: preflight servers files window reload
  console r20-0b r20-pop-bg-3 r20-pop-fg-3 r20-pop-other-3 root-add closerprobe r20-choose-twice r20-choose-kept
  r20-choose-refuse-dis r20-g2-1 r20-version r20-restore r20-logs.
- READ list given to children: agent-rules; recipes/CLAUDE.md; phase doc § S5, Exit checks (G1.4, R5.1–R5.6), Human
  gates, STOP rules; decisions #385, #391, #394, #395, #399–#410; e2e plan §4.28 by line range (1938–1960, 1980–2008);
  S5-helpers §7, S5-drivers-A/-A2, S5-liveA20 §4/§6, S5-drivers-B2, -B3-builder/-verifier/-verifier2, S5-addendum407 and
  its verifier3/verifier4; the s13 recipes and tests; Run 17/19 helpers read-only.

## 3. Verifier verdicts

- B4a: `S5-drivers-B4a-verifier.md` **PASS-with-notes**, 0 fix rounds. MINOR-1 (human leg's LEG word), MINOR-2 (two
  rules unpinned), MINOR-3 (the first-hit evidence spans attempts), NIT-1 (script scope): all carried into B4b and fixed
  there. NIT-2 and NIT-3 were left as notes.
- B4b: `S5-drivers-B4b-verifier.md` **FAIL** (F1 MAJOR: the `serve` step had no time bound, so a silent live actor hung
  the slice before its STOP, restore and RETURN; F2–F4 MINOR; 3 NIT) → `S5-drivers-B4b-fixer1.md` →
  `S5-drivers-B4b-verifier2.md` **PASS-with-notes** (1 of 3 rounds). Verifier2 bounded every slice-B row's longest
  legitimate gap from the code: each stays well under 120 s and each row under 600 s. These are estimates, not
  measurements. Open NITs: NIT-A (the dispatch forwarding of `s`/`i` is untested; it is equivalent today), NIT-2 (slice B's
  guard and CHECK texts read `R20-0`).
- Both verifiers ruled `root-add` after the three -3 rows consistent with the sheet. R20-0B is "before ROOT is added";
  the -3 rows' state column has no ROOT, and their originals ran in liveA20 without it.

## 4. Deviations

- The verifiers' red proofs and mutants partly could not run as briefed. The permission classifier refused a scratch
  copy with a `node_modules` junction (B4a verifier, B4b builder), and later an `rm -rf` of scratch folders (B4b
  verifier2). None was retried (§3 item 10). Red was shown by construction or on junction-free copies outside the tree
  (#395 held). The scratch folders are left in the session scratchpad.
- B4b verifier2 deleted verifier1's scratch `red/` probe folder in the scratchpad before reusing the name. It was not
  cited evidence.
- The `recipes/CLAUDE.md` lines for the new files are left to the session agent (agent-rules §5).

## 5. Proposed decisions (for the session agent to record)

### 2026-10-30 · S5-drivers-B4a: the unstated cases of the -3 judges
**Decided:** (1) `judgePop3` ranks STOP, then FAIL (a counted round failing a clause, or a join or URL count above 0),
then too few counted rounds (NOT DISCRIMINATING, or NOT MEASURED in leg `human`), then NOT MEASURED for an unreadable
capture or a failed control. (2) The actor reads `popup-opened` from `listTabs` (Chrome `id`, `openerTabId`), before
the click and at `sent` + 1 000 ms or later; there is no PS step for it. (3) `console-new=unread` when a capture is
unreadable. B's loop is stopped before leg `human`. With no counted round, `granted-to` reads A only if a round granted
A. A skipped click prints no popup-opened line. The root window-title Name is dropped by exact match, and an unreadable
Name makes the capture unreadable. **Why:** each is the strict reading of #407/#410. **Instead of:** `judgePop`'s order
(count first). **Revisit if:** liveB20 shows the liveness control flat. **By:** Claude (proposed by S5-drivers-B4a;
verifier PASS-with-notes)

### 2026-10-30 · S5-drivers-B4b: liveB20's PowerShell side
**Decided:** (1) `root-add` runs after R20-POP-OTHER-3 and before CLOSERPROBE. (2) Slice-B actor rows answer their value
steps through one `serve` step. It answers whichever ids are asked, ends on actor exit (by PID and recorded start
time), and throws at 120 s idle or 600 s per row; that throw is the STOP `throw-after-state`. (3) WB is found by the URL
marker `s12=g2b` among the wave's own windows only, before WA opens. If it is not found (`wb-unknown`), the STOP is
`throw-after-state`, not a guess, and a human window is never read. (4) R20-VERSION is NOT RUN when the old build is not
loadable (reload exit 2 twice, or a proof reading neither `keys=sorted` nor `perm=no`). A NOT RUN without ROOT stays as
a defensive guard; it is unreachable. (5) The -3 evidence file is rotated at R20-0B, so first-hit holds per attempt.
(6) `outside-file-reached-page` stays in the STOP list and the how-to, but no slice-B reader raises it: the actors send
only files under ROOT, and no CHOOSE or VERSION row in §4.28 pre-registers an outside-file reading (it comes from Run
19's R19-CHOOSE-2). **Why:** each is the strict reading of an unstated case, and none changes a pass rule. **Instead
of:** an id-by-id list, which hangs 120 s on an unasked step; an unbounded serve (verifier1 F1); guessing WB.
**Revisit if:** liveB20 shows a legitimate gap over 120 s, or the document URL unreadable by UIA. **By:** Claude
(proposed by S5-drivers-B4b; verifier2 PASS-with-notes)

## 6. Findings

- Measured (PowerShell 5.1, a unit test): a function that returns a `[long[]]` hands its caller `Object[]`, so
  `$global:S13Owned` needs the cast at the assignment. `Get-Process -Id` stays true for a reused PID; only the start-time
  check tells the wave's own node apart.
- Carried, unchanged: B3 verifier1's N3 (coverage clipped to WA's display) and N4 (VERSION's `clicks` judged but not
  printed; decision (4)'s sentence on `args`).

## 7. Handoff (the liveB20 runner, the session agent)

- Nothing is running; no PID, watcher or port.
- Before liveB20, the session agent records the two decisions above, adds the `recipes/CLAUDE.md` Key-files line for
  `s13-r20-b{,-defs}.ps1`, `s13-r20-b4.{ts,ps1}`, `s13-win.ps1` and `s13-r20-b.ts`, and commits every bookkeeping edit
  (the clean-tree guard).
- The runner reads §8. Watch for the liveness control (#410's Revisit-if) and verifier3's MINOR-E / NIT-F rise rule in
  the later legs, which only a live run shows. The committed -3 evidence copy is
  `S13-live-evidence-liveB20-pop3[-att<k>].txt`.

## 8. How to run liveB20

**Ready to run** once this stage's commit and the session agent's bookkeeping are committed.

- **Command.** From the repo root, from **Git Bash** (python is on Git Bash's PATH), **in the background** (a slice outlasts the 600 s tool cap):
  `S11_OUT=<fresh dir outside the repo> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-b.ps1 -Block liveB20`
  - A later attempt: `-Att <k>` with a fresh `S11_OUT`.
  - `-Block plan` prints the order and runs nothing.
  - `-Block teardown -Att <k>` cleans up after the slice or a return (see the exception under Resume). **Run it with the attempt's own `S11_OUT`** (the one that attempt used, not a fresh one): the globals file, the capture and `r20-pop3-evidence.txt` are read from it, and with another folder the evidence copy silently copies nothing. It also copies the -3 evidence file into the steps dir.
  - Exit codes: 0 done, 2 STOP, 3 not run.
- **Prerequisites:**
  - A clean tree at a committed HEAD (every bookkeeping edit committed), then `npm run build`, then `recipes/reload-extension.ps1` (one re-run on exit 2).
  - Chrome running with the extension loaded and its toolbar button pinned; JavaScript on and armed, as found.
  - Port 9234 free or held by the daemon; **port 8081 free** (the `servers` block starts the fixture server; the actors' URLs hard-code 8081).
  - ROOT: the `root-add` block adds the wave's own folder `<S11_OUT>\wave\root` to the Upload folders after the -3 rows; nothing to do by hand.
  - **The old build `63c771c`** for R20-VERSION: network for the scratch worktree's own `npm ci`, which lives under `S11_OUT` (the code refuses one inside the repo).
  - Window X (the wave's window) in front for the UIA click of R20-POP-OTHER-3's `human` leg; the screen must hold room for two windows side by side of at least 500 x 400 each (R20-G2-1's `uncovered` leg), otherwise that leg is NOT MEASURED.
- **Expected first record lines (R20-0B):** `MANIFEST ...`, then exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, then R20-0's remaining lines, `HEAD <sha> tree=clean`, the S4 line and `ROW R20-0B PASS slice=B`.
- **Where the record lands:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveB20.txt` (`-att<k>` for a later attempt); the -3 rows' counts in `S13-live-evidence-liveB20-pop3[-att<k>].txt` (written at R20-LOGS or at teardown). In `S11_OUT`: the console segments `console-liveB20-<k>.txt`, the actors file `actors-liveB20.jsonl`, the scan inputs and `r20-pop3-evidence.txt`. The window rectangles' answers stay in `S11_OUT`; only the printed `RECT` lines reach the record.
- **What each STOP return means** (every `STOP <reason>` is followed by `RETURN <seq> after-stop=<reason> restored=... readback=...`, and the runner returns):
  - `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0B, before any state change): rebuild and reload, new attempt.
  - `popup-lease-wrong` (the -3 rows): a product defect; escalate.
  - `existing-tool-changed` (R20-VERSION's control upload, with the old build loaded): escalate; the swap restores HEAD first.
  - `chooser-interception-left-on` (a CHOOSE row's control upload failed): check the safety state first; escalate.
  - `outside-file-reached-page` (listed by the sheet for the CHOOSE rows and R20-VERSION; no slice-B reader raises it, the actors send only files under ROOT): if it appears, escalate and do not commit the record until it is understood.
  - `dialog-left-open`, `devtools-left-open` (a native dialog or a DevTools window left on screen): close it only with the user.
  - `old-build-left-loaded` (the swap could not restore HEAD, reload it and prove it): check which build is loaded before anything else.
  - `not-restored` (the read-back differs from R20-0B's by count or hash): escalate; never retry past it.
  - `text-leak` (R20-LOGS: a name, path, sentinel or token count above 0): escalate and do not commit the record.
  - `throw-after-state` (a helper or environment throw after the first state change; the restore ran first). Includes R20-G2-1's `wb-unknown` (B's window not found), and a **hung slice-B actor row**: the serve step throws `no ready signal for serve within the bound (120 s)` when the actor neither asks for a step nor exits for 120 s, or `serve exceeded its budget of 600 s` for the row; the runner then kills the actor (only the wave's own node, by recorded start time), restores, and returns. A slice that never exits cannot happen any more: it returns as this STOP. What to do: read the actor's capture in `S11_OUT`, note the row as not measured by the record's own lines, fix a helper only between rows, then teardown and a new attempt.
- **R20-VERSION's NOT RUN outcomes** (printed as `ROW R20-VERSION NOT RUN ...`): (1) the old build `63c771c` cannot be loaded, either because its reload failed twice (exit 2 twice) or because its own proof reads neither `keys=sorted` nor `perm=no`; (2) ROOT is not in the Upload folders (a defensive guard, unreachable while `root-add` runs first). Both are recorded as NOT RUN, never a pass, and the wave goes on to R20-RESTORE and R20-LOGS; the swap's `finally` has already restored HEAD and printed `LOADED20 rerun=<k>`. A failed restore of HEAD is the STOP `old-build-left-loaded`, not a NOT RUN.
- **Resume after a return:** run `-Block teardown -Att <k>` with that attempt's own `S11_OUT`; fix a helper only between rows, never past a STOP line; a new attempt takes `-Att <k+1>` and a fresh `S11_OUT` (at most three per slice). **Exception:** after a RETURN that reads `restored=no`, run neither teardown nor a re-run; return to the user. A leg that ends NOT MEASURED, NOT DISCRIMINATING, NOT RUN or RECORD is recorded and the wave goes on.
