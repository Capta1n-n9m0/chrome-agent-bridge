# Step 10 S1 — wave verifier report (Run 14, between rows, after Return 2)

Verifier: Opus 5.5, level 2, independent, 2026-10-25. Brief `briefs/S1-wave-verifier.md`. Base `e321c1a` plus the
uncommitted fixer and runner edits. The fixer's report `S1-wave-fixer.md` was read as claims and re-checked below.
**No live Chrome, no daemon, no connection to 9234, no `s9-r14.ps1` block against Chrome.** `%TEMP%\bridge-e2e\s14` was
only read: `r14-globals.clixml` md5 `983cb7c9…` and `r14-raw.txt` md5 `ad76ee75…` are the same before and after, and the
directory still holds 12 files. Dry runs used `S9_OUT` set to scratchpad copies (`scratchpad\wv\a`, `wv\b`). At the end
nothing listens on 9234, and the only `node.exe` is PID 22152, which is not ours.

## Verdict: **PASS-with-notes** on rulings (a)–(d). Do not dispatch runner 3 until the step agent rules on F1

The code does what rulings (a)–(d) ask, and every check passes. There is one problem with the desk itself (F1): on this
machine, the fixed placement order will very likely hit the same STOP in attempt 3.

## Findings (ranked)

**F1 MAJOR (a measurement taken now, read-only, no Chrome): both monitors have an auto-hidden taskbar that counts as an
occluder, so no work area will be free.**

I enumerated the shell windows with a read-only PowerShell script (`scratchpad\wv\tray.ps1`: `Screen.AllScreens`,
`FindWindowEx`, `GetWindowRect`, `IsWindowVisible`, DWM cloaked, the extended style). It printed:

```
screen bounds {X=0,Y=0,Width=1920,Height=1080} work {X=0,Y=0,Width=1920,Height=1080} primary=True
screen bounds {X=1920,Y=0,Width=1920,Height=1080} work {X=1920,Y=0,Width=1920,Height=1080} primary=False
Shell_TrayWnd rect [0,1078,1920,1126] visible=True iconic=False cloaked=0 exstyle=0x88
Shell_SecondaryTrayWnd rect [1920,1078,3840,1126] visible=True iconic=False cloaked=0 exstyle=0x88
```

Here is what that output means:
- Each work area is the whole monitor, so the taskbar is set to auto-hide.
- Each taskbar is visible, not cloaked and topmost (`0x88` = TOPMOST | TOOLWINDOW, no LAYERED flag, so `SeeThrough`
  does not drop it).
- Each taskbar's rect covers the bottom 2 px of its monitor's work area.

`S9Geo.OccluderList` (s9-win.ps1:132) therefore counts it whenever O reaches the bottom of the work area, and
`Set-S9SideBySide` always makes O as tall as the work area.

In attempt 2, O was `[3072,0,3840,1080]`. It overlaps `Shell_SecondaryTrayWnd` by 768×2 px, which is exactly one
occluder, matching attempt 2's count of 1. On the left monitor, `Shell_TrayWnd` overlaps it the same way. Attempt 3 will
therefore most likely print `PLACEMENT none of the 2 work areas is free` and the same STOP. The ids line will name
`class=Shell_SecondaryTrayWnd process=explorer` and `class=Shell_TrayWnd process=explorer`.

This is not a deviation from ruling (a), whose rule is "none free → STOP". But runner 3 would be spent with no new
information. The step agent decides; I did not fix it. There are two options:
- **Option (i):** change the placement and leave the guard alone. W and O would end above the top of any topmost
  window that sits at the bottom of the area, for example `bottom = min(work.bottom, tray.top)`. The guard is unchanged.
- **Option (ii):** decide whether a 2-px auto-hide strip counts as covering O. That changes the guard, which is a
  pre-registered rule, so it must be escalated.

The taskbar state could change before the run, but it is a user setting on the same machine.

**F2 MINOR: the resume is narrower than before, but not as narrow as ruling (b).**

Ruling (b) says to skip rel3 *and* pop1 in attempt 3. The code accepts:
- either name on its own;
- any `-Attempt` n ≥ 2, without checking it against the source.

Dry run on `wv\b`:

```
-Block reset -Attempt 7 -Skip pop1  →
RESUME attempt 7: pop1 recorded in attempt 6, not re-run
RESUME attempt 7: blocks preflight, servers, window, setup, safe0, found, rel3, r3, type, ctl, 5c, restore, logs, teardown; …
EXIT 0
(Done set to preflight…found) -Block r3 → NOT RUN: block r3 needs block rel3 first (…minus the resume's skipped blocks)
```

So a single-name skip re-runs R14-REL-3, a recorded row, and the attempt label can be false. The sheet's exact call
(`-Attempt 3 -Skip rel3,pop1`) is correct, so this matters only if a runner deviates from it. A stricter rule would
require exactly `{rel3, pop1}` and `Attempt = 3`.

**F3 MINOR (mechanical): one stale file:line in the fixer's item 3.** The report puts the `leaseGranted` listener at
`s9.ts:854` and the claim at `:855`. In the current file the listener is at `recipes/s9.ts:863`
(`grep -n 'c.on("leaseGranted"'` → 798, 863). The other citations check out:
- `intercept.ts:309` returns when there is no `openerTabId`;
- `applyOpener` is at `:335-345`;
- `URL_FILL_MAX_MS` is at `:101`;
- the `fillUrl` hidden-row return is at `:369-371`;
- the `newTabsInFlight` hold is at `:383`;
- the `sendLeaseGranted` frame is at `:397-401`;
- `sdk/src/client.ts:142` (`isLeaseGrantedEvent`);
- `shared/src/protocol.ts:85` (the event name);
- `extension/src/sw.ts:173-178` (`onCreated` → `redactTabCreated`);
- `safety.ts:375-383` (blanks only `url`).

**N1: ruling (c)'s Chromium claim is a conjecture, not shown.** The claim is "a background opener → Chrome names the
active tab as opener". Nothing in the repo or in any live record measures `openerTabId` for a link clicked in a
background tab. My own reading of Chromium's `TabStripModel` agrees with the fixer: with `ADD_INHERIT_OPENER`, the opener
is set to the window's active contents. That is still knowledge, not a measurement.

The code-path evidence is sound:
- The listener is on the claiming client.
- The event name matches.
- `fillUrl` always ends in `deliverGrant`.
- `applyOpener` grants only to the holder of `openerTabId`'s handle (`:341`, "an unleased opener's tab stays
  unheld").
- daemon.log has no per-tab line, so it can neither confirm nor rule out the conjecture.

The proposed R15-POP-2 row (leg A: opener in front; leg B: background, a RECORD) separates the two causes, and its pass
rule is written before the measurement. `cmdR14Pop1` is unchanged: the diff of `recipes/s9.ts` touches only the header,
the imports, `cmdRectCheck`, the new `cmdPlacementOrder` and the command table. The §4.21 R14-POP-1 row is unchanged
(item 5).

**N2: the new pure helpers are only partly on the live path, and the resume logic has no unit test.**
- `firstFreePlacement` is tested, but the live code does not use it: PowerShell takes the first try whose `rect-check
  --attempt` exits 0, which is the same rule.
- The resume logic is PowerShell and has no vitest test. It is covered only by the fixer's dry runs and mine.

**N3: moving E and D inside W's rect can put them above W. The click is still guarded.** `Invoke-S9ActionButton` →
`Click-S9Element` (s9-win.ps1:361-366) throws "nothing clicked" in two cases:
- W is not in the foreground;
- `FromPoint` at the button's centre does not `Compare` equal to W's own button. E (chrome://extensions) has its own
  toolbar button at the same point, so this check also catches E sitting on top.

Either throw comes after `S14Touched`, so it goes through the stop procedure with a restore. Before the switch,
`placement-before-switch` re-checks the chosen placement with the same verdict.

**N4: the logs window.** `daemon.log` is 70 391 bytes, far below the 1 MiB trim at daemon start. It has 31 lines since
`2026-10-24T21:14:17Z`, and none of them contains `://` (counted with awk/grep and not printed). So attempt 2's lines
survive attempt 3's daemon start. The count since the mark will include any daemon activity between the two attempts;
none is expected.

## Checks (command → output)

### 1. Ruling (a)

`git diff e321c1a -- recipes/s9-win.ps1`:
- `Occluders(target)` is now `OccluderList(target).Length`.
- `OccluderList` runs the identical walk and filter, with `list.Add(h)` where it used to do `n++`.
- `Test-S9Placement` sets `occluders = $ids.Count`. `Get-S9OccluderIds` emits one object for each handle (it uses
  ForEach-Object with no filter), so the count cannot drop below what the old code counted.

`placementVerdict` is untouched by the diff and ignores `occluderIds`. The test "the guard itself is unchanged by the
identities" covers this.

How an occluder is identified:
- by handle → `driver = W|E|D|O`;
- else `[S9Win]::Cls` + `Get-Process(pid).ProcessName`;
- no title API is called;
- `occluderText` maps any character outside `[A-Za-z0-9_.#+-]` to `_` and caps each part at 64 characters.

The order is computed once, before the tries:
- `placementOrder(wWork, all)` puts W's work area first, then `WorkAreas()` in system order, without duplicates.
- The loop takes the first try that exits 0, and nothing adapts.
- None free → `Fail-S14` with the byte-identical old guard text (s9-r14.ps1:338). The old `placement-before-switch`
  guard line follows unchanged (:339).

### 2. Ruling (b)

Dry run on `wv\a`, a copy of attempt 2's globals (`S14Done = preflight,…,found,rel3,pop1`, `S14Stopped = r3: …`):

```
-Skip type            → reset refused: -Skip allows only rel3, pop1 (got 'type')   EXIT 3
-Skip rel3,r3         → reset refused: -Skip allows only rel3, pop1 (got 'r3')     EXIT 3
-Block r3 -Attempt 3  → NOT RUN: the wave stopped at 'r3: …'                       EXIT 3
-Block reset -Attempt 3 -Skip rel3,pop1 →
  RESUME attempt 3: rel3, pop1 recorded in attempt 2, not re-run
  RESUME attempt 3: blocks preflight, servers, window, setup, safe0, found, r3, type, ctl, 5c, restore, logs, teardown; daemon.log mark 2026-10-24T21:14:17.041Z (the WaveStart stored in the current globals)   EXIT 0
-Block rel3 / pop1    → NOT RUN: block … is skipped in this resume (RESUME attempt 3: recorded in attempt 2, not re-run)  EXIT 3
-Block r3             → NOT RUN: block r3 needs block found first (…)              EXIT 3
-Block servers        → NOT RUN: block servers needs block preflight first (…)     EXIT 3
-Block status         → S14Stopped = · S14Done = · S14Resume = attempt=3 skip=rel3,pop1 mark=2026-10-24T21:14:17.041Z · S14LogMark = 2026-10-24T21:14:17.041Z
```

Code reading:
- r3 prints the RESUME line again, because its predecessor in RunOrder (found) is not `Order[i-1]`.
- Nothing set up by rel3 or pop1 is needed later. Teardown copes with having no `r3` tab (s9-r14.ps1:437-451).
- Narrowness: see F2.

### 3. Ruling (c)

See N1 and F3.

### 4. Ruling (d)

`B-logs` (s9-r14.ps1:420-428):
- It counts from `$since = S14LogMark` (else `WaveStart`).
- On a resume it prints `R14-LOGS daemon.log counted from … - attempts 2 and 3` and `R14-LOGS attempt 2's worker console
  was not captured …`.
- `scan-log` (s9.ts:1086-1108, not in the diff) still uses `scanCounts(text, tokenOf(), OWN_ID)` and `scanVerdict`, so
  it still counts the token, non-fixture `://`, `localhost:8081`, `:8083` and `bank.example`.
- The console half (`scan-file --mode console-s16`) is unchanged.

### 5. §4.21, §4.20 and the STOP RULE

- `git diff 5f17d54 -- docs/e2e-test-plan.md` adds one italic dated note after the §4.21 table and changes no row line.
- `git diff -U0 f45e3bf` has a single hunk, `@@ -1193,0 +1194,84 @@`, which adds lines only. Lines 1070–1193 (§4.20)
  have the same md5 at `f45e3bf` and now: `6ef40925…` = `6ef40925…`.
- The STOP RULE paragraph extracted from the sheet, `briefs/S1-runner.md` and §4.21 has one md5 in all three,
  `9f3f7bfb…`.
- The sheet's diff adds only the "Resume after Return 2" subsection. The runner brief's diff adds only the pointer
  paragraph, placed after the STOP RULE.

### 6. Builds, tests and lane

| Check | Output |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s9.json` | 0 |
| `npm run typecheck` | 0 |
| `npm test` | 116 files passed, **2757 passed** |
| `recipes/test/s9-rules.test.ts` | `it(` count 66 at `e321c1a` → 72 now; 72/72 pass |
| Mutant M1: `idPart` without the character replace | 1 failed / 71 passed (the "never a title" test) |
| Mutant M2: `placementOrder` without W's area first | 1 failed / 71 passed (the order test) |
| After the mutants | `recipes/s9-rules.ts` restored from a scratch copy; `md5sum -c` → OK (`3ecb134f…`) |
| `npm run build` | 0 |
| dist sha256 | `99bb55c5…`, `5a2888f7…`, `bcb20e28…`, `a8beec6c…`, `f8b52058…`, equal to `s9-r14.ps1` `$Dist` |
| `git status` after the build | no dist path |
| PowerShell `Parser.ParseFile` | `s9-r14.ps1` 0 errors, `s9-win.ps1` 0 errors |

Lane: the changed tracked files are `recipes/s9-r14.ps1`, `s9-win.ps1`, `s9.ts`, `s9-rules.ts`,
`recipes/test/s9-rules.test.ts`, `docs/e2e-test-plan.md` (the dated note only) and steps-dir docs. No product code
changed.

## Round 2 re-check (2026-10-25, the fixer's round 2 on F1–F3, affected items only)

**Verdict: PASS.** F1, F2 and F3 are closed. There is one new note (R2-N1), which does not block. I kept the same limits
as before:
- no Chrome, no daemon, no 9234 (`netstat` shows 0 LISTENING on it at the end);
- `%TEMP%\bridge-e2e\s14` was not touched: `r14-globals.clixml` still has md5 `983cb7c9…`, and the directory still
  holds 12 files.

**F1 (the taskbar cut).**
- `s9-rules.ts taskbarCut` cuts each try's area to the top of any `Shell_TrayWnd` / `Shell_SecondaryTrayWnd` whose rect
  overlaps it. If several do, it takes the highest top. There is no margin.
- `S9Geo.ShellTrays` (s9-win.ps1:135) lists the taskbars by class and rect only.
- `s9.ts placement-order` applies the cut to each area in `placementOrder`.
- `placementVerdict` has the same md5 at `e321c1a` and now (`199d14b2…`). The only line the diff removes from
  `s9-rules.ts` is the old `placementLine` return. So the guard still counts a taskbar or any other window overlapping
  O.

What the code finds on this desk (read-only):
- `[S9Geo]::ShellTrays()` → `Shell_SecondaryTrayWnd 1920 1078 3840 1126` and `Shell_TrayWnd 0 1078 1920 1126`. These
  are the same rects as my first read.
- `s9.ts placement-order` on those rects prints `cut to y=1078 by taskbar class=Shell_SecondaryTrayWnd`, `… class=Shell_TrayWnd` and
  `PLACEMENT order 2: [1920,0,3840,1078] [0,0,1920,1078]`, exit 0.

Intersection check with plain node arithmetic, same split as `sideBySide`:

| Area | Area ∩ taskbars | O after the cut | O ∩ taskbars | W ∩ taskbars | Uncut O ∩ taskbars (control) |
|---|---|---|---|---|---|
| `[1920,0,3840,1078]` | 0 / 0 | `[3072,0,3840,1078]` | 0 / 0 | 0 | 1536 px² |
| `[0,0,1920,1078]` | 0 / 0 | `[1152,0,1920,1078]` | 0 / 0 | 0 | 1536 px² |

Discriminating test: the new test is "round 2 (F1): a try's area is the work area with its bottom cut …".

| Mutant | Result |
|---|---|
| (i) `taskbarCut` returns the uncut area | 1 failed / 72 passed |
| (ii) the class filter is removed, so any window cuts | 1 failed / 72 passed |

After the mutants, `recipes/s9-rules.ts` was restored and `md5sum -c` → OK.

**F2 (the narrow resume).** Dry runs on `scratchpad\wv\c`, a copy of attempt 2's globals:

```
-Attempt 7 -Skip rel3,pop1               → USAGE: -Attempt 7 refused - the only resume is …; nothing changed   EXIT 3
-Attempt 3 -Skip pop1                    → USAGE: -Skip 'pop1' refused …                                        EXIT 3
-Attempt 3 -Skip rel3,rel3               → USAGE: -Skip 'rel3,rel3' refused …                                   EXIT 3
-Attempt 3 -Skip rel3,pop1,type          → USAGE: -Skip 'rel3,pop1,type' refused …                              EXIT 3
-Attempt 3 -Skip rel3,pop1 -LogMark …    → USAGE: -LogMark refused - attempt 2's wave mark is stored …          EXIT 3
(after those five: the dir holds only r14-globals.clixml, md5 983cb7c9… — nothing archived or changed)
-Attempt 3 -Skip rel3,pop1               → archived …; RESUME attempt 3: rel3, pop1 recorded in attempt 2, not re-run; RESUME attempt 3: blocks preflight, …, found, r3, …, teardown; daemon.log mark 2026-10-24T21:14:17.041Z   EXIT 0
the same call again (now a resume)       → USAGE: the current globals is not attempt 2's stopped state (… resume=yes) …  EXIT 3
-Block rel3 / -Block pop1                → NOT RUN: block … is skipped in this resume …                         EXIT 3
-Block r3                                → NOT RUN: block r3 needs block found first (… minus the resume's skipped blocks)  EXIT 3
```

Every refusal says `USAGE:`, none says `STOP:`. An earlier batch of dry runs in a different scratch directory, `wv\c`
under a mistyped `S9_OUT`, answered "no stored state". That was my wrong path, not the script: a `-Block status` on the
right path then read attempt 2's globals. Only the batch above counts.

**F3 (the citations).** `S1-wave-fixer.md` now gives `s9.ts:868` for the listener and `:869` for the claim. `grep -n`
finds `868: … c.on("leaseGranted" …` and `869: … c.call("tabs.claim", { tab: a })`, so these are right after round 2's
header lines. The Chrome-opener claim is marked **conjecture (not shown)** in three places: the verdict (line 148), the
table row (line 156) and the proposed decision (line 182).

**Checks.**

| Check | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s9.json` | 0 |
| `npm run typecheck` | 0 |
| `npm test` | 116 files, **2758 passed** (`s9-rules.test.ts` `it(` count 73, +1) |
| `npm run build` | 0 |
| dist sha256 | still `99bb55c5…`, `5a2888f7…`, `bcb20e28…`, `a8beec6c…`, `f8b52058…`; no dist path in `git status` |
| STOP RULE paragraph, sha256 in the sheet, the runner brief and §4.21 | `ddce18480d7b4248…` in all three |
| `git diff 5f17d54 -- docs/e2e-test-plan.md` | 0 removed lines, the dated note only (it now also says the guard still STOPs on a taskbar) |
| `git diff -U0 f45e3bf` | one hunk `@@ -1193,0 +1194,88 @@`, adds only, so §4.20 is untouched |

**R2-N1 (note, not a finding):** if an auto-hidden taskbar were docked at the *top*, the rule would cut a monitor's area
to `bottom = top`, leaving it empty. The guard would then fail it ("rect is empty"), and with no free area that ends in
the STOP. That fails closed, and it is not this desk's layout.

## Round 3 check (2026-10-25, the fixer's "Round 3 (after Return 3)", against rulings (a)–(c) under Return 3)

**Verdict: PASS-with-notes.** HEAD `bfadbbc` plus the uncommitted round-3 fix. The same limits held:
- no Chrome, no daemon, nothing listening on 9234;
- `%TEMP%\bridge-e2e\s14` only read: its globals are attempt 3's (md5 `4487be5b…` before and after), 16 files.

The dry runs used scratch copies in `scratchpad\wv\e` (attempt 3's globals) and `wv\f` (attempt 2's globals).

**(a) The narrow resume.** On `wv\e`, attempt 3's state, `status` shows `S14Stopped = r3: … before the toolbar click`,
`S14Done = preflight,…,found` and `S14Resume = attempt=3 skip=rel3,pop1`.

```
-Attempt 4 -Skip rel3,pop1            → USAGE: -Skip 'rel3,pop1' refused for attempt 4 …          EXIT 3
-Attempt 4 -Skip rel3,pop1,r3,type    → USAGE … refused for attempt 4 …                           EXIT 3
-Attempt 4 -Skip rel3,r3,r3           → USAGE … refused for attempt 4 …                           EXIT 3
-Attempt 5 -Skip rel3,pop1,r3         → USAGE: -Attempt 5 refused …                               EXIT 3
-Attempt 3 -Skip rel3,pop1            → USAGE: the current globals is not attempt 2's stopped state … EXIT 3
-Attempt 4 … -LogMark <iso>           → USAGE: -LogMark refused - attempt 2's wave mark is stored … EXIT 3
(after those six: wv\e holds only r14-globals.clixml, md5 4487be5b… — nothing changed)
wv\f (attempt 2's state): -Attempt 4 -Skip rel3,pop1,r3 → USAGE: … not attempt 3's stopped state … EXIT 3; folder unchanged
-Attempt 4 -Skip r3,rel3,pop1         → archived …; RESUME attempt 4: rel3, pop1 recorded in attempt 2; r3 recorded NOT MEASURED in attempt 3; not re-run
                                        RESUME attempt 4: blocks preflight, servers, window, setup, safe0, found, type, ctl, 5c, restore, logs, teardown; daemon.log mark 2026-10-24T21:14:17.041Z (attempt 2's wave mark carried …)   EXIT 0
-Block rel3 / pop1 / r3               → NOT RUN: block … is skipped in this resume (RESUME attempt 4: …)   EXIT 3 each
-Block type                           → NOT RUN: block type needs block found first (… minus the resume's skipped blocks)  EXIT 3
-Block servers                        → NOT RUN: … needs block preflight first …                  EXIT 3
the same reset again                  → USAGE: … not attempt 3's stopped state …                  EXIT 3
status                                → S14Resume = attempt=4 skip=rel3,pop1,r3 mark=2026-10-24T21:14:17.041Z · S14LogMark = 2026-10-24T21:14:17.041Z
```

In `B-logs`, `$since = S14LogMark`, which is attempt 2's mark. For attempt 4 it prints "attempts 2, 3 and 4" and the
line about the uncaptured consoles of attempts 2 and 3. `scan-log` is unchanged.

**(b) Diagnostics only.**
- Nothing is removed from `recipes/s9-rules.ts` or `recipes/s9.ts`: `git diff bfadbbc | grep '^-[^-]'` is empty for both.
- These functions have the same md5 at `bfadbbc` and now:

  | Function | md5 |
  |---|---|
  | `placementVerdict` | `199d14b2` |
  | `placementLine` | `39063660` |
  | `occluderText` | `5e1bd6c0` |
  | `taskbarCut` | `1d4f63a6` |
  | `placementOrder` | `cd4543d0` |
  | `placementAttemptLine` | `e9c6dcc2` |
  | `sideBySide` | `4bf640bb` |

- `OccluderList` itself is unchanged.
- The new fields are read with `Rect`, `GW_OWNER`, `GA_ROOTOWNER`, `GetWindowLong` (style and exstyle) and
  `GetCursorPos`. Grepping the added lines for `GetWindowText`, `.Name` or `Title` finds nothing.
- An owner or root owner prints as `driver:X`, `other` or `none`, never a handle or a title.
- The ROW and CHECK lines and the guard's `Fail-S14` texts are untouched. The diagnostic lines go between ROW and CHECK,
  and only when there is an occluder.

**(c) The park.**
- The point comes from `parkPoint`: the page area's top-left corner + `PARK_INSET_PX = 4`, a constant. It is not
  measured and does not adapt, and the cache only avoids repeating the node call for the same W rect.
- It always lies strictly inside W's UIA `RootWebArea`, so it is below Chrome's toolbar. On the fixture page it falls in
  the body's 8 px default margin, before the `<h1>`, so not on a link.
- Click-S9Element order: `Park` → `Set-S9Foreground` (throws if W is not in front) → `FromPoint` + `Compare` (throws if
  that is not the target) → click → `Park`. So the FromPoint check still runs after the park.
- No guard text, threshold or condition changed; parking only adds `SetCursorPos` calls and PARK lines.

**Tests and mutants.**
- `s9-rules.test.ts` has 78 tests (+5).
- Mutant 1 (the park point without the inset) → 2 failed / 76 passed: the park-point test and the "inside the page"
  test.
- Mutant 2 (the cursor line printed with 0 occluders) → 1 failed / 77 passed: the diagnostics test.
- After the mutants, `recipes/s9-rules.ts` was restored and `md5sum -c` → OK.

**Checks.**

| Check | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s9.json` | 0 |
| `npm run typecheck` | 0 |
| `npm test` | 116 files, **2763 passed** |
| `npm run build` | 0 |
| dist sha256 | `99bb55c5`, `5a2888f7`, `bcb20e28`, `a8beec6c`, `f8b52058`, unchanged; no dist path in `git status` |
| PowerShell parse | 0 errors in both files |
| STOP RULE, sha256 in the sheet, the runner brief and §4.21 | `ddce18480d7b4248` in all three |
| `git diff bfadbbc -- docs/e2e-test-plan.md` | 0 removed lines, 0 added table rows (the dated note only) |
| `git diff 5f17d54` | 0 removed lines |
| `git diff -U0 f45e3bf` | a single hunk that only adds (`@@ -1193,0 +1194,99 @@`), so §4.20 is untouched |

**Notes (none blocking).**
- **R3-N1:** in `Invoke-S9ActionButton`, the press time `$last = Now9` is taken after `Click-S9Element` returns, and that
  now includes the after-click park (one `SetCursorPos` and one `Say9` line). The recorded press time therefore comes a
  few ms after the real click. In `r14TypeVerdict` that bias can only move a borderline press toward "after the reply"
  (NOT DISCRIMINATING → the pre-registered re-run), never toward a pass. The live verifier should know about it.
  Swapping it for the ms-scale cost would be a design change; I propose none.
- **R3-N2:** nothing checks that no other window (for example E or D, wherever Chrome placed them) covers W at the park
  point. That does not matter for the guards: the cursor's position is not a guard, and `FromPoint` still protects the
  click. But "never over another window" holds by the point's position only, not by a check.
- **R3-N3:** the park also runs inside the stop procedure's paths (`Set-S9Omnibox` during restore, `Restore-S9Layout`).
  It returns early with no W or no page area, and its node call is in `try/finally`. A UIA exception there would surface
  as a restore failure, which is a STOP and a return: fail-closed.
- **Verifier process note:** two of my early dry-run batches, in round 2 and round 3, ran with a malformed `S9_OUT`.
  They resolved to the empty `scratchpad\wv\`, every call was refused, and nothing was written there; I discarded them.
  Only the batches above count.
