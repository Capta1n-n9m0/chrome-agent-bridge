# S1-helpers-b — Run 18's helpers, part b (step report)

Step agent: Claude Opus 5.5, effort medium. Risk: low. Sonnet 5.5 at medium effort ran the builder, three fixers and the committer. Opus 5.5 at medium ran four verifiers. All the code was written by Sonnet. Nothing in this slice drove Chrome or a daemon, or used port 9234.

## 1. Verdict
DONE. Verifier 4 gave **PASS-with-notes** after three fix rounds (3 of 3).

## 2. Outputs
- **Commit:** made by the committer after the verdict. The hash is in the step agent's return; the session agent puts it in the journal (agent-rules §6).
- **Files** (code by Sonnet):
  - Modified: `recipes/s11-win.ps1`, at its lane lines only (verifier 4: line 24 and lines 296–297 differ from HEAD); `recipes/s11b-r17b-build.ts`; `recipes/s11b-r17b-rules.ts`; `recipes/s11b-r17b.ps1`; `recipes/s11b-win.ps1` (the stale comment at :352); `recipes/s11b.ts`; `recipes/s12-rules.ts`; `recipes/s12-win.ps1`; `recipes/test/s11-win-static.test.ts`; `recipes/test/s11b-r17b-fix.test.ts`.
  - New: `recipes/test/s12-helpers-b.test.ts`, `recipes/test/s12-helpers-b-fix.test.ts`, `recipes/test/s12-helpers-b-fix2.test.ts`.
  - Reports, all in this folder: `S1-helpers-b-builder.md`, `-verifier.md` (+ `-evidence.txt`), `-fixer.md`, `-verifier2.md` (+ evidence), `-fixer2.md`, `-verifier3.md` (+ evidence), `-fixer3.md`, `-verifier4.md` (+ evidence), and this file.
- **What was built:**
  - **Line forms (5)–(8)** (`s12-rules.ts`): `rawLine`, `optObservedLine`, `optO2Line`, `raceOnLine`, `legLine`. Each is tied by key to §4.26's text.
  - **R18-UP-L1:** `s11b raw-l1` (`rawL1Run`) replaces `S11 l1` for this row. It makes the same two raw calls once, prints `S11 l1`'s checks, and prints each call's own `RAW` line beside them.
  - **R18-UP-OPT:** `Invoke-S12Opt`, built at load by patching the loaded `Invoke-S11Opt` text. Each patch must match exactly once, else it throws. O2 is polled to 15 000 ms and the poll stops on a match.
  - **The `$S11Warning` text:** `$S11Warning` now holds §4.24's S0F-a K-opt-stand text.
  - **The OPT counts:** the invalid and warned items are read only from the `uploadfolders-invalid` and `uploadfolders-warned` lists. A missing list prints a STOP line and throws.
  - **R18-UP-RACE-A:** run with `s11b race --to-cap` (the loop runs to 120 calls) and `Invoke-S12RaceA`. ON is pressed 1 600 ms after the last call's reply, read from an atomically written loop-done file. The `RACE ON pressed <ms> after last reply` line prints the measured gap.
  - **Aggregator:**
    - `VERDICT_LINE` takes a multi-token id.
    - `aggregateRows` / `s11b rows18` count one `ROW` per (id, slice) and print `WARN row printed twice: <id>` for a repeat.
    - NEWTAB-LOAD's interim verdict is now a `CHECK` line.
    - `r17b-history` lines go to the record, not the framing file.
  - **Scanner:** `scan18` / `s11b scan18` use §4.26's fixture definition. A `://` with no scheme before it is not counted.
  - **`now shows` lines:** the `window … now shows` line prints a URL class only. `Set-S9Omnibox` is re-defined in `s12-win.ps1`.
  - **F-b:** `bannerctl` prints the call's own answer, plus `CHECK bannerctl-<leg> violations=<n>`. `bannerctl-judge --violations` is required and FAILs the row above 0.
- **Counts:**
  - `npx vitest run recipes/test`: 1090 → 1131 (+41). The 1090 is verifier 1's re-derivation at HEAD, and no test was removed.
  - `npm test` (fixer 3, main tree): 4881 passed, 207 files, 0 failed. Verifier 4's clean worktree: 4865 passed, 205 files (the other agent's uncommitted files are not in it).
  - All seven `recipes/tsconfig*.json` and the five package typechecks exit 0.
  - `npm run build` exits 0 in verifier 4's worktree.
  - The four changed `.ps1` files parse with 0 errors and are ASCII.
- **Size:** 757 new lines: code 259 (cap 350), tests 498 (verifier 4's count).

## 3. Verifier verdict
- **Verifier 1** (`S1-helpers-b-verifier.md`): **FAIL**.
  - F1: the scanner item was still open. The cause was bare `://` text in `SCAN` lines and `127.0.0.1:8081`, not the own page.
  - F2: `raw-l1` added a second pair of raw calls.
  - F3: four fixes had no red test.
  - MINOR F4–F7; NIT F8–F9.
- **Fix round 1:** step agent rulings for F1 (a Run 18 scanner inside the lane, by §4.26's definition) and F2 (`raw-l1` is the row's only raw-call step).
- **Verifier 2:** **FAIL**.
  - F-A: the `raw-l1` test did not discriminate.
  - MINOR F-B–F-D; NIT F-E.
- **Fix round 2:** step agent ruling for F-D (read only the Upload-folders lists).
- **Verifier 3:** **FAIL**.
  - F-1: the "equivalent" mutant was not equivalent.
  - MINOR F-2: a missing list read as a silent 0.
  - NIT F-3, F-4.
- **Fix round 3:** ruling for F-2 (a STOP line and a throw).
- **Verifier 4** (`S1-helpers-b-verifier4.md`): **PASS-with-notes**. Every fix is proven by red mutants.
  - MINOR F-A: under `SilentlyContinue` with no `try`, the throw is swallowed. Ruled out of scope: no runner in `recipes/` uses `SilentlyContinue`, and S1-helpers-c must not (Handoff).
  - Carried NIT: whether UIA exposes an empty `<ul>` is not measured.

## 4. Deviations
- **Size:** 757 new lines against the 350 cap (2.16×). Code alone is 259, under the cap; the extra is tests that the verifiers' rounds required. The brief allows a tests-only overrun "as #341", and this is recorded under that clause.
- **Fix rounds:** all three were used, so none is left.
- **Process slips, all reported by the agents themselves; no damage was found:**
  - The builder ran `git checkout -- recipes/s11-win.ps1` once, which agent-rules §10 forbids. The file had no uncommitted change, and verifier 1 confirmed the final file is HEAD plus the lane lines.
  - Verifier 1 set `core.autocrlf` in the shared `.git/config` and unset it at once.
  - Verifier 2 put a scratch script into `recipes/` for under a minute.
- **Lane:** `s9-win.ps1` and `s9-rules.ts` are untouched. The fixes outside the lane are overrides in `s12-win.ps1` and new code in `s12-rules.ts`.

## 5. Proposed decisions
### 2026-10-27 · Run 18's log scan uses §4.26's fixture definition, and a bare `://` is not a URL
**Decided:** R18-LOGS scans with `s11b scan18`.
- Token, sentinel and profile are counted by the existing scanners' own functions.
- `://` counts only `scheme://host` matches, classed by §4.26's "Fixtures and ports" definition: `127.0.0.1:8081`, `localhost:8081` and `*.localhost:8081`; `chrome://extensions`; the extension's own pages.
- A `://` with no scheme before it, such as the helpers' own `SCAN …: ://=<n>` text, is neither fixture nor other.
- `Get-S12UrlClass` uses the same definition, and a test ties the two.

**Why:** verifier 1 showed that Run 17b's committed-mode `non-fixture ://` FAILs came from the record's own `SCAN` lines and from `127.0.0.1:8081`, which s9's fixture list lacks. They did not come from the own page, as S7-run-record §5 item 8 and §4.26 say. §4.26 counts "every non-fixture `scheme://host`". Verifiers 2–4 checked that `scan18` is at least as strict as s11's scanner on every attack URL tried.

**Instead of:** editing `s9-rules.ts` (outside the lane), or skipping the `SCAN` lines.

**Revisit if:** the S1-record must also pass `S9 scan-file`.

**By:** Claude (step agent's ruling, proposed)

### 2026-10-27 · R18-UP-L1's raw calls are made once, by `s11b raw-l1`
**Decided:** `raw-l1` replaces `S11 l1` for R18-UP-L1. It makes the same two calls and the same checks, plus the `RAW` lines. §4.26's Helper cell still names `S11 l1`; that is a wording finding and the cell was not edited.

**Why:** a second pair of calls would change a carried row's steps beyond #320's two re-writes. `s11.ts` is outside the lane.

**Instead of:** four raw calls, or editing `s11.ts`.

**By:** Claude (step agent's ruling, proposed)

### 2026-10-27 · A missing Upload-folders list is a helper STOP, never a 0
**Decided:** `s11-win.ps1:296–297` print a STOP line and throw when `uploadfolders-invalid` or `uploadfolders-warned` is not found.

**Why:** a silent 0 would weaken the OPT counts.

**Revisit if:** Run 18's prologue measures that UIA omits an empty `<ul>` (see Handoff).

**By:** Claude (step agent's ruling, proposed)

The builder proposed two more decisions (`S1-helpers-b-builder.md` §5):
- the `now shows` line prints `url-class=<fixture|about-blank|chrome-extensions|own-page|other>`;
- a duplicate `ROW` counts once, at the worse verdict.

## 6. Findings
- **§4.26 wording (no edit made):**
  - The "Aggregator fixes" clause blames Run 17b's scanner FAIL on the own page. The measured cause is bare `://` text and `127.0.0.1:8081` (verifier 1, F1).
  - The Helper cells still name `S11 l1` and the old scanners.
  - Form (6), "computed from §4.24's S0F-a texts", is computed from the page's own items.
- **S7-run-record §5 item 8 has the cause wrong,** for the same reason (verifier 1's one-command reproduction).
- **`S11 scan`** (`s11-rules.ts`) counts `:8084` as fixture, against §4.26. Run 18 uses `scan18`, and `s11-rules.ts` was not changed.
- **Run 16's runner is retired for UP-OPT.** Its `judgeOpt` expects Run 16's texts, but `$S11Warning` now holds the S0F-a text.
- **Unmeasured:** whether Chrome's UIA exposes an empty `<ul id="uploadfolders-warned">`. If it does not, R18-UP-OPT STOPs on a correct page after the wave's first Upload-folders change.
- **Known CRLF effect:** a fresh worktree fails 9 tests in `s11-r16-runner.test.ts` until the untouched `.ps1` files are checked out with LF (verifiers 3 and 4). This is not caused by the slice.

## 7. Handoff (for S1-helpers-c, the Run 18 block runner)
Nothing is running: no PIDs, watchers or worktrees are left. The binding call list is `S1-helpers-b-fixer.md` §7 as amended by `-fixer2.md` §5 and `-fixer3.md` § Handoff changes, and S1-helpers-a's `S1-helpers-a-fixer.md` § Handoff for its own pieces.

**Setup**
1. **Load order:** dot-source `s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, then `s12-win.ps1`, then call `Assert-S12Patched`.
2. **Error handling:** keep an outer `try` around the wave, so a helper throw becomes a wave STOP. Never set `$ErrorActionPreference = 'SilentlyContinue'` (verifier 4, F-A).
3. **Prologue, before any state change:** at R18-0's options read, check that `Get-S9ById` finds both `uploadfolders-invalid` and `uploadfolders-warned`, the warned list empty included. If one is not found, STOP before any state change, and the empty-list rule needs a ruling.

**liveA rows**
4. **R18-UP-L1:** `S11 foundcheck`, then `s11b raw-l1` only, never `S11 l1`. Map its `ROW UP-L1 <v>` line to `ROW R18-UP-L1 <v>`.
5. **R18-UP-OPT:** `Invoke-S12Opt $O $Root $ObsJson`, which prints `OPT observed …` and `OPT O2 shown=… at=… polled-ms=…`. Then `Get-S11bOptObs`, as in the R17 block.
6. **R18-SAVE-REFUSE:**
   - Capture each leg's record lines to a file outside the repo.
   - Run `s11b leg-line --row R18-SAVE-REFUSE --leg sdk-leg|mcp-leg --from <file>`.
   - The runner prints the row's single `ROW`.

**liveB row**
7. **R18-UP-RACE-A:** start the actor with `s11b race --to-cap`, and run the driver `Invoke-S12RaceA $Btn`. It prints `RACE ON pressed <ms> after last reply`.

**Every banner control (each slice)**
8. **R18-BANNER-CTL:** as S1-helpers-a's handoff. `bannerctl-judge` now requires `--violations`, the sum of the two legs' `CHECK bannerctl-<leg> violations=<n>` numbers.

**End of each slice**
9. **R18-LOGS:** run `s11b scan18 --what console|daemon|actors [--file f]` per stream, in place of `s11b scan` and `S9 scan-file`. Commit text only after a passing scan.
10. **Aggregation:** run `s11b rows18 --from <record lines file>` per slice.
