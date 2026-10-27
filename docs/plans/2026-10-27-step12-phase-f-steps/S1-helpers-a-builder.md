# S1-helpers-a builder report

Model: Sonnet 5.5, effort medium. Leaf builder: no agents spawned, nothing committed, nothing run against Chrome, a daemon or a port.

## 1. Verdict
DONE.

## 2. Outputs
Files (the committer stages exactly these; line counts from `wc -l` and `git diff --stat`):
- `recipes/s12-rules.ts` (new, 52): pure rules, node-only so the s6 typecheck compiles its test.
- `recipes/s12-win.ps1` (new, 131): PowerShell helpers; dot-source AFTER s9-win, s11-win, s11b-win.
- `recipes/test/s12-helpers.test.ts` (new, 140): 16 tests.
- `recipes/s11b.ts` (changed, +44 / -1): import, `sliceOf`, `devt --slice/--row`, `bannerctl`, `bannerctl-judge`, `console-line`.
- `docs/plans/2026-10-27-step12-phase-f-steps/S1-helpers-a-builder.md` (this report).

Size: 323 new lines + 45 changed = about 368 of the 450 cap.

Commands and results:
- `npx vitest run recipes/test` before: 47 files, 1056 passed. After: 48 files, 1072 passed (+16).
- The seven recipes tsconfigs (`tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`): each exit 0.
- `npm test`: 195 files, 4744 passed. `npm run typecheck`: exit 0. `npm run build`: exit 0 (dist/ is gitignored).

## 3. Tests and why each fails on the pre-slice tree
All 16 tests live in one file that imports `../s12-rules.js`, and that module and `recipes/s12-win.ps1` did not exist before this slice. So the whole file fails to load pre-slice; the verifier can prove it by checking out the old tree for those files. Beyond that, each test pins one thing:
1. Capture names per slice differ and match the sheet's `console-liveA18.txt`, `S1-live-console-…-att3.txt`.
2. A capture holding text is a STOP, blank or absent is free, and the text is never echoed (the Run 17b overwrite).
3. `CONTROL_TEXT` equals badge.ts `disarmed`, read as text.
4. The CONSOLE line drops title lines before counting; a path or another slice's file name throws.
5. The title-line regex is the same text as in `s11b-rules.ts` (tie by text; importing that file would not compile under s6).
6. `bannerCtlPass` table: idle 14 999 fails, neg seen fails, pos none fails, a non-ok answer fails.
7. The three BANNERCTL/ROW lines, character for character.
8. Every line form is in §4.26 by key (`BANNERCTL`, `IDLE`, `DEVT`, `CONSOLE`, `ROW R18-BANNER-CTL`).
9. IDLE: 15 000 passes and prints, 14 999 is a STOP, an unknown stamp is a STOP with no IDLE line. The wait is the remainder, or 15 s when unknown.
10. `DEVT` lines: `attached=yes` exactly for `DEBUGGER_DEVTOOLS`.
11. s12-win.ps1 is ASCII and passes `Parser::ParseFile` with zero errors.
12. The tail: `$S11SampleTailMs = 0` at line start, `Assert-S12Tail` STOPs unless it reads 0, and `Invoke-S12Sampler` calls it before `Invoke-S11Sampler ... 6>&1`. The old 4000 pin in s11-win.ps1 stays. This fails pre-slice (no override, no guard).
13. The 15000 threshold, `console-$Slice.txt`, the `IDLE $Row since-attach-ms=$n` form and the SAMPLER regex are mirrored. The regex is run on an example of the s11-win.ps1 SAMPLER form, which the test also reads as text.
14. Guards: the capture path is outside the repo and a STOP when it holds text; DevTools keys are sent only to an owned window after a foreground check; a DevTools window or pane left open is a STOP; the PS file never says `attached=yes`.
15. s11b.ts wiring: the three new subcommands exist, `devtLines` is used only under `--slice`, and the default `ANSWER UP-DEVT control1` line and `finalRow` stay.

Not covered by tests, because s11b.ts cannot be imported under tsconfig.s6 and the s6 exclude list is not mine to edit: `main()` runs of the new subcommands. Their logic is in s12-rules.ts (tested); s11b.ts is covered by static ties and the `.s11b` typecheck.

## 4. Deviations
- `bannerctl-judge` and `console-line` are s11b subcommands, so the judging and line formatting stay in tested TS and the PS only passes values. The PS mirrors only the threshold, the file name, the IDLE form and the SAMPLER regex.
- The positive leg's expression is `return (1);` (the same wrapper as UP-DEVT's controls), which evaluates to 1. The sheet says "an `evaluate` of `1`".
- The neg-leg guard in `Invoke-S12BannerLeg` is a STOP when the idle is under 15 000 ms or unknown. It is stricter than the judge's FAIL clause, and it is a runner-bug backstop.

## 5. Proposed decisions
### 2026-10-27 · The attach stamp is a file the runner writes after every actor process
**Decided:** `last-attach.stamp` (epoch ms) in the out folder, written by `Set-S12AttachStamp`, which the runner calls after every actor process (conservatively: any of them may attach). A missing stamp means unknown. `Wait-S12Idle` then waits the full 15 s and stamps now; `Test-S12Idle` treats unknown as a STOP.
**Why:** the actor is not the only attacher (screenshots, trusted input), and the runner already owns the process boundary. A stamp at process end is later than the reply, so the measured idle is shorter, never longer.
**Instead of:** the actor writing the stamp at its reply (misses non-actor attaches).
**Revisit if:** an attach path appears that does not run inside an actor process.
**By:** Claude (proposed)

### 2026-10-27 · The banner tail is overridden to 0 in s12-win.ps1, guarded by a STOP
**Decided:** `$S11SampleTailMs = 0` in s12-win.ps1, with `Assert-S12Tail` called by `Invoke-S12Sampler`; s11-win.ps1 line 30 and its 4000 pin test are untouched.
**Why:** the real post-reply window was about 6.5 s (2.5 s actor sleep + 4 s tail); §4.26 and #340 fix it at 2.5 s. With tail 0 the sampler's do-while still polls once after the signal.
**Instead of:** editing s11-win.ps1:30.
**Revisit if:** a runner dot-sources s12-win.ps1 before s11-win.ps1 (the guard then prints a STOP).
**By:** Claude (proposed)

### 2026-10-27 · DevTools opens by F12, then Ctrl+Shift+I only if no DevTools shows
**Decided:** `Open-S12DevTools` checks the UI after each key (a new DevTools window, or a pane in X by UIA) and returns whether it saw DevTools. It never claims attachment; control 1's code does.
**Why:** both keys toggle, so a second key after a missed F12 detection could close DevTools again; the UI check keeps that to the case where nothing shows.
**Instead of:** always pressing both.
**Revisit if:** a live run shows the pane detector missing a docked DevTools.
**By:** Claude (proposed)

## 6. Findings
- The pane detector (any element named `^DevTools`, or a TabItem `Elements`/`Console` in X) was written without a live check. If the Chrome 156 UIA tree names the docked pane differently, `Open-S12DevTools` returns $false while DevTools is open. Control 1 still decides the row; `Close-S12DevTools` could then not close a pane it never saw, and its left-open check uses the same detector.
- s11b-rules.ts imports extension code, so no s6-compiled test can import it; every tie to it is by text.
- §4.26 wording: the BANNERCTL idle is `idle-ms=<n>` of the negative leg only. The helper measures it just before the sampler starts, which is a lower bound of the real idle at the window start, because the actor process starts after the wait. No wording problem otherwise.

## 7. Handoff for S1-helpers-b and the Run 18 runner
Dot-source order: s9-win, s11-win, s11b-win, then s12-win.ps1 (`Assert-S12Tail` STOPs otherwise). Name no top-level runner variable with an S12 prefix.
Console capture (per slice, liveA closed before liveB opens): `Save-S12Console $D 'liveA18'` just before the console window closes (R18-RESTORE done), then `s11b console-line --slice liveA18 --file <out>\console-liveA18.txt` after R18-RESTORE, then `s9/s11b scan` over the same file. The committed copy is `S1-live-console-liveA18.txt` (`-att2` for a later attempt), made by the existing `redact-console` into the steps dir.
Banner control (per slice, before its first banner row):
1. Open the control tab `http://localhost:8081/e2e-playground.html?s12=bc` (a newTab does not attach) and get its handle.
2. `Wait-S12Idle` (returns the idle).
3. Neg: `Invoke-R17Node 's11b' @('bannerctl','--leg','neg') { Invoke-S12BannerLeg 'neg' @($hwnd) }`; keep its returned IdleMs, Polls, Banner; then `Set-S12AttachStamp`.
4. Pos: `Invoke-R17Node 's11b' @('bannerctl','--leg','pos','--tab',<handle>) { Invoke-S12BannerLeg 'pos' @($hwnd) }`; take the answer from the `ANSWER R18-BANNER-CTL pos <ok|CODE>` output line; then `Set-S12AttachStamp`.
5. `s11b bannerctl-judge --slice liveA18 --idle-ms <neg IdleMs> --neg-polls <n> --neg-banner <b> --pos-answer <a> --pos-polls <n> --pos-banner <b>` prints the two BANNERCTL lines and the ROW (exit 0 PASS, 1 FAIL).
Call `Set-S12AttachStamp` after every other actor process too. Before a banner row's first call: `Wait-S12Idle`, then `if (-not (Test-S12Idle '<row>')) { throw 'stop' }`. Use `Invoke-S12Sampler` where a row calls `Invoke-S11Sampler` (it re-prints the SAMPLER line).
DevTools row: `Invoke-R17Node 's11b' @('devt','--slice','liveB18','--row','R18-UP-DEVT') { Invoke-S12DevtRow $X }`. Without the flags `devt` prints exactly what it did before. S1-helpers-b still owns the VERDICT_LINE and aggregator changes, the RAW and OPT lines, and the runner.
