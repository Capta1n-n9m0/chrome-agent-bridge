# S5-drivers-B4a builder report

Model and effort: Sonnet, medium. Nothing was run against Chrome, a daemon, a fixture server or a port. Nothing is committed.

## 1. Verdict

DONE. Size: 441 new lines in new files plus 30 added lines in edited files (`git diff --numstat`: s13-r20-a.ts +25/-17, s13-r20.ps1 +3/-3, the two tsconfigs +1/-1), about 470 against the 600 cap.

## 2. Outputs

New files (`wc -l`): `recipes/s13-r20-b4.ts` 160, `recipes/s13-r20-b4.ps1` 46, `recipes/test/s13-r20-b4.test.ts` 145, `recipes/test/s13-r20-b4-ps.test.ts` 90.
Edited: `recipes/s13-r20-a.ts` (exports, an optional `v3` parameter of `popRound`, optional `Round.r3`), `recipes/s13-r20.ps1` (`New-R20PopSteps` gets `[switch]$Pop3`), `recipes/tsconfig.s13.json` (the four new files), `recipes/tsconfig.s6.json` (the two new tests in `exclude`).

Gates (evidence `S5-drivers-B4a-builder-*.txt`):
- `npm test`: Test Files 247 passed, Tests 5899 passed, exit 0 (start 5872 / 245; +27 tests, +2 files). Every liveA20 test passes unchanged.
- `npm run typecheck` exit 0; `npm run build` exit 0; all eight `recipes/tsconfig*.json` exit 0; `node scripts/doc-check.mjs` exit 0.
- Red (`-red.txt`): in a scratch copy outside the tree, at HEAD's `s13-r20-a.ts` and `s13-r20.ps1` without the b4 files, the TS test suite fails to load and 7 of 7 PS tests fail. Green again with the build.
- Mutants (`-mutants.txt`, scratch copy, 14 runs): 13 killed. Survivor `after-null-pass` is an equivalent mutant (`control` is already false when `after` is null).
- Scratch dir and its junctions removed with `cmd /c rmdir` before the tree check; the main `node_modules/.bin` still holds 42 entries.

Where the code lives: a new `s13-r20-b4.ts` (and `.ps1`), not the b file. `s13-r20-b.ts` is 395 lines and carries the chooser and G2 rows; the -3 rows share nothing with them but slice A's round, and a separate file gives B4b a separate `-Actor` name. liveA20 is untouched in behaviour: `popRound` without `v3` runs the same statements in the same order (only `call` gained an optional expression argument); `judgePop`, `popLeg`, `popBgFg`, `popOther` are unchanged.

## 3. Interface for B4b

Actor script: `-Actor 's13-r20-b4'`. Commands, each with `--port <P>` (the block runner adds `--slice` and `--ctl`):
- `pop-bg-3` (row `R20-POP-BG-3`, leg `bg`), `pop-fg-3` (`R20-POP-FG-3`, leg `fg`), `pop-other-3 --click yes|no` (`R20-POP-OTHER-3`, legs `third` then `human`).
- Exit codes and `LEG` / `STOPWHY` lines as slice A's. The `unjoined` note prints as `ROW R20-POP-OTHER-3 unjoined NOT MEASURED ...`, which `Get-R19Verdict` already filters (`ROW \S+ unjoined `).
- Registered in `cmds` (`s13-r20-b4.ts:149`); runs as `main` when invoked.

PowerShell (`recipes/s13-r20-b4.ps1`, definitions only; dot-source it after `s13-r20.ps1`, then call `Register-R20B4Blocks` after `Register-R20Blocks`):
- `Register-R20B4Blocks` adds `$global:R19Blocks['r20-pop-bg-3' | 'r20-pop-fg-3' | 'r20-pop-other-3']` (the last one reads `Test-R20Click`). The order (after R20-0B, before `CLOSERPROBE`) is B4b's.
- `New-R20PopSteps <row> <legs> <click-bool> -Pop3` builds the value steps. `Invoke-R20Pop3Cap <row> <leg> before|after`, `Read-R20Pop3Capture`, `Get-R20Pop3Counts`, `Get-R20RootName`, `Add-R20Pop3Evidence`.
- Global: `$R20Pop3Evidence` (a scriptblock returning `<S11_OUT>/r20-pop3-evidence.txt`). It is outside the repo; B4b copies it into the steps dir under a name it chooses (counts only, no text). No other global state: the first-hit rule reads the file, so it survives a re-run inside the same `S11_OUT`.

Value-step ids per row (signal order) and the answers (written by the PS side, never by B4b):

| step id | answer |
|---|---|
| `<row>-<leg>-cn0` (leg's first call is next) | `ok <lines> <eval>` or `unread` |
| `<row>-human-click1..3` (ready content `go` or `skip`) | `sent <epoch ms>` or `unsent` (liveA20's `Invoke-R20PopClick`, unchanged) |
| `<row>-<leg>-cn1` (last call answered, popup closed) | `ok <lines> <eval> <join> <url>` or `unread` |

Ids: `R20-POP-BG-3-bg-cn0/-cn1`; `R20-POP-FG-3-fg-cn0/-cn1`; `R20-POP-OTHER-3-third-cn0/-cn1`; `R20-POP-OTHER-3-human-cn0`, `-human-click1..3`, `-human-cn1`. `Register-R20B4Blocks` already builds this list.

The hello name of A is `s12-r19-a-popbg3` / `popfg3` / `popother3` (`run()` names the client; plain ASCII); B is `s13-r20-b`, C `s13-r20-c`.

## 4. Items 1 to 17

1. Holder: `s13-r20-a.ts:125` (`held by ` + `JSON.stringify(holderName)`); names `s13-r20-b4.ts:82` (ACTOR), tested against `run()`'s naming.
2. Held-call by code only: `a.ts:125` (`ctlHeld` by code) and `b4.ts:61` (`heldOk`); no message is compared or printed.
3. Human order: `a.ts:118-121` (popup-opened read, then B's probe), grant read before.
4. popup-opened: `b4.ts:46` (`popupRead`, ids from the pre-click set, `newTab` handles excluded, `openerTabId` only the label) and `b4.ts:95` (read at `sent` + 1 000 ms or later).
5. `popup-lease-wrong` in every leg including human: `b4.ts:74`; the STOP is thrown at `b4.ts:106`.
6. Console matching: `b4.ps1:9-19` (join names, `localhost:<P>`, `e2e-playground.html?popup`, `popup=1`, case-insensitive, whole capture, counts only).
7. Counted rounds, fewer than 3: `b4.ts:57`, `b4.ts:77` (ND for bg/third/fg guard, NM for human with a no-popup click).
8. RECORD line, one per leg, outside the verdict: `b4.ts:25`, `b4.ts:72`.
9. Window-title Name dropped before any match: `b4.ps1:13`; an unreadable Name makes the capture unreadable (`b4.ps1:22-28`).
10. `[bridge] evaluate`, case-sensitive, per line: `b4.ps1:15` (`.Contains`).
11. Capture timing: before at `cn0` (start of the leg), after at `cn1`, after the last round's sweep closed the popup: `b4.ts:87`, `b4.ts:101`.
12. Verdict order: `b4.ts:74-79` (STOP, then FAIL incl. join/url above 0, then ND/NM, then PASS); `unread` replaces a 0 only (`b4.ts:64`).
13. A's popup call: an `evaluate` of `1+0`, `1+0+0`, ... (`b4.ts:39-43`, `a.ts:121`), made after B's probe, before the sweep; a distinct index range per command (BASE) so lengths 3 to 25 never repeat across the three processes, and never equal `1`, `window.open(...)` or `(a) => a`; its criterion stays `ok`.
14. Unreadable capture: `b4.ts:62` (control needs both captures), `b4.ps1:35`, `b4.ts:31-37` (strict parse, anything else is unreadable); `console-new` prints `unread`.
15. Evidence file: `b4.ps1:36-37` (before and after eval counts, and `unread` lines).
16. Unreadable after-capture: both counts `unread`, NM, a count above 0 impossible to read so none FAILs; other clauses still judged first: `b4.ts:64`, `b4.ts:78`.
17. First-hit leg: `b4.ps1:39` (one `first-hit <row> <leg>` line, once per file).

## 5. Deviations

- None from the brief. Two points where the code is stricter than the original rows (see Proposed decisions 1 and 2).

## 6. Proposed decisions

### 2026-10-30 · The -3 judge ranks a counted round's FAIL above too few counted rounds
**Decided:** `judgePop3` returns STOP first, then FAIL (a counted round failing a clause, or a join or URL count above 0), then NOT DISCRIMINATING or NOT MEASURED for fewer than 3 counted rounds, then NOT MEASURED for an unreadable capture or failed control. liveA20's `judgePop` checks the count first. **Why:** #407 says a FAIL stands whatever else reads; a human round with a popup opened and no grant must FAIL even if another click made no popup. **Instead of:** copying `judgePop`'s order. **Revisit if:** the verifier reads #407 the other way. **By:** Claude (proposed)

### 2026-10-30 · `popup-opened` is read by the actor, not by a PowerShell value step
**Decided:** the actor reads `listTabs` (rows carry Chrome `id` and `openerTabId`, the daemon passes them) before the click and at `sent` + 1 000 ms or later; there is no PS step for it. **Why:** PowerShell has no tab list; the actor already has one. B4b registers none. A grant with no new row reads `popup-opened=no` (round not counted, no probe). **Instead of:** a new value step. **By:** Claude (proposed)

### 2026-10-30 · Smaller unstated cases
(a) `CHECK <row> <leg> console-new=unread RECORD` when either capture is unreadable (the original form's `n/a` is for `popLine`). (b) In leg `human` B's `evaluate "1"` loop is stopped and awaited before the leg starts, because the sheet says no bridge caller at all; liveA20's `popOther` leaves it running. (c) With no counted round, `granted-to` reads A only if some round granted A, else `none` (liveA20 printed `A`). (d) No human `CHECK ... popup-opened` line for a skipped click (guard not fg): no click was made. (e) The root window-title Name is dropped by exact equality with the root element's Name; an unreadable Name makes the capture unreadable.

## 7. Findings and handoff

- A scratch copy for red proofs needs `mcp/` as well as `daemon/ sdk/ shared/ extension/ recipes/` (`s12-r19-a.ts` imports `../mcp/src/link.js`); without it the red run failed for the wrong reason (caught and redone).
- Two mutation drivers started by mistake ran at once against one scratch dir; their results were discarded, the processes killed (only mine), and one driver re-run.
- B4b needs: dot-source `s13-r20-b4.ps1` after `s13-r20.ps1`; call `Register-R20B4Blocks`; put the three block names in `$R19Order['liveB20']` after `r20-0b`; copy `r20-pop3-evidence.txt` into the steps dir; run the dry-run NIT-F/MINOR-E checks of verifier3 (the rise rule in the later legs) live.
- Nothing is running. Nothing needs the user's keyboard.
