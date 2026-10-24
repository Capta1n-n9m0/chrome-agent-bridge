# Step 10 S1 — wave fixer report (Run 14, between rows, after Return 2)

Fixer: Opus 5.5, level 2, 2026-10-25. Brief `briefs/S1-wave-fixer.md`; rulings (a)–(d) under Return 2 in
`S1.ledger.md`. Base `e321c1a` plus the runner's uncommitted record/ledger edits. Those two files were not touched.
**No live Chrome, no daemon, no connection to 9234, no `s9-r14.ps1` block run against Chrome.** The dry runs below used
only `-Block reset`, `-Block status` and blocks that the order check refuses. Each ran with `S9_OUT` set to a scratchpad
copy of attempt 2's globals. `Get-S9OccluderIds` and `S9Geo.OccluderList` were called only on handle 0, which compiles
the C# and enumerates nothing. No window was moved. The real `%TEMP%\bridge-e2e\s14` is unchanged: attempt 2's globals
are still there and not reset. No product code changed.

## Checks

| Check | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s9.json` | 0 |
| `npm run typecheck` | 0 |
| `npm test` | **2757 passed, 116 files** (was 2751 / 116; +6, all in `recipes/test/s9-rules.test.ts`, 66 → 72) |
| `npm run build` | 0. The sha256 values of `daemon/dist/index.js` and the four extension bundles are unchanged and still equal `s9-r14.ps1`'s `$Dist` (`99bb55c5…`, `5a2888f7…`, `bcb20e28…`, `a8beec6c…`, `f8b52058…`). `git status` shows no dist change. |
| PowerShell parse (`Parser.ParseFile`) of `s9-r14.ps1`, `s9-win.ps1` | 0 errors each |
| STOP RULE, same bytes in the sheet, the runner brief and §4.21 | one sha256 (`ddce1848…`) in all three |
| Failing first | the 6 new tests ran red before the code: 5 failed (missing exports); the 6th, "guard unchanged", passed by design |

## 1. Occluder identity and placement order (ruling (a))

**What "occluders above O" counts.** `recipes/s9-win.ps1:126-141` (`S9Geo`) walks the windows above O with
`GetWindow(GW_HWNDPREV)`, from O up to the top of the z-order. It counts each window that meets all of these:

- visible
- not minimized
- not DWM-cloaked
- not see-through (layered and click-through, or alpha 0)
- has a non-empty rect that overlaps O's rect with a positive area

Windows of any process count: the desktop's own windows, other apps, and Chrome's own bubbles. Attempt 2 printed only
the count.

**Can E or D be the occluder?** Reading the code says they should not be, but it does not rule them out. E and D open in
block 4 (`setup`) and O opens later, in block 6 (`found`), so O starts above them. After that only W and O are raised,
by `Set-S9Foreground`. That function's return value is ignored, so a foreground change it was refused, or anything
Chrome raises on its own, could leave E or D above O. The placement never moved E or D. W's rect touches O's rect but
does not overlap it, so W is never counted. The fix assumes E or D might be the occluder.

**Changes:**
- `s9-win.ps1:132` adds `S9Geo.OccluderList`: the same walk, returning the handles. `Occluders` now returns its
  `Length`, so the rule is unchanged.
- `s9-win.ps1:873` adds `Get-S9OccluderIds`. It names each occluder by handle as `driver = W|E|D|O`, or else by
  `GetClassName` and the owning process's `ProcessName`. It never reads a title.
- `s9-win.ps1:920` changes `Test-S9Placement`: it writes `occluderIds` into the JSON and takes the count from them. It
  also takes `-Attempt <n> -Area <rect>`, which turns the check into one try (a record line, no CHECK line).
- `s9-win.ps1:849` changes `Set-S9SideBySide`: a new `-Area` parameter defaults to W's monitor work area, as before.
  Before placing O, it restores E and D (when they are the driver's live windows) and moves them inside W's new rect,
  off O's rect, so they cannot overlap O whatever their z-order. It prints `MOVED driver window E|D inside W's rect …`.
- `s9-win.ps1:892` adds `Find-S9FreePlacement`, which works in four steps:
  1. It gets the order from `s9.ts placement-order`: W's monitor work area, then each other monitor's work area in the
     order `EnumDisplayMonitors` lists them.
  2. For each area in turn, it calls `Set-S9SideBySide -Area`, then `Test-S9Placement -Attempt`, and prints the try.
  3. It keeps the first free area and prints `PLACEMENT chosen: attempt <n> of <m>`.
  4. If no area is free, it prints `PLACEMENT none of the <m> work areas is free` and returns `$false`.
- `s9-r14.ps1:334` (`B-r3`) calls `Find-S9FreePlacement` where it called `Set-S9SideBySide`. When no area is free it
  raises **the existing** `Fail-S14 'R14-3 placement guard: …'` text. The guard checks that follow
  (`placement-before-switch` and `placement-before-click`, zero occluders) are unchanged.
- `recipes/s9-rules.ts` (pure, tested):
  - `OccluderId` and `Placement.occluderIds?` (`:741`).
  - `occluderText` (`:760`): `driver:X` only for W, E, D or O; otherwise `class=… process=…`. Any character outside
    `[A-Za-z0-9_.#+-]` becomes `_` (so `/`, `:` and spaces cannot carry a URL), each part is capped at 64 characters,
    and an empty part prints as `?`.
  - `placementLine` adds ` · occluder ids …` only when there are some. The line for 0 is byte-identical to the
    expected text.
  - `placementOrder` (`:828`), `firstFreePlacement` (`:835`) and `placementAttemptLine` (`:839`).
- `recipes/s9.ts`:
  - `rect-check --attempt <n>` (`:1049`) prints `ROW R14-3 placement-attempt-<n> …` and
    `PLACEMENT attempt <n> on work area […]: free|not free — …`. It prints no CHECK line and exits 1 when the area is
    not free.
  - The new `placement-order` command (`:1070`, registered at `:1225`).
  - The header documents both.
- On the PowerShell side, "first free" means the first try that exits 0, which is the same rule as `firstFreePlacement`.

**Tests:** `recipes/test/s9-rules.test.ts:626-690`, six tests:
- identity formatting, including the stripping and the 64-character cap;
- `placementLine` with identities, and unchanged at 0;
- the guard unchanged by the identities;
- the order: W's area first, the system's order after it, duplicates once, W's area tried first even when it is
  missing from the list;
- the choice, including `[]` → -1;
- the attempt line.

**No-Chrome dry run:** fabricated JSON (attempt 2's rects with 0, 1 and 2 occluders) printed `· occluder ids driver:E`
and `driver:D, class=Shell_SecondaryTrayWnd process=explorer`, with the expected exit codes. `placement-order` for
attempt 2's monitors printed `[1920,0,3840,1080] [0,0,1920,1080]`, and the PowerShell regex parsed both areas.

**Dated note:** a procedure step that R14-3 names changed, so §4.21 has a dated note after its table
(`docs/e2e-test-plan.md`, "Note 2026-10-25 (S1 wave fixer …)"). The row's expected text and pass rule are not edited.

## 2. Resume without re-running recorded rows (ruling (b))

`recipes/s9-r14.ps1`:
- New parameters `-Attempt`, `-Skip` and `-LogMark` (`:61`). Any block other than `reset` refuses them: `NOT RUN …`,
  exit 3.
- `$Skippable = @('rel3','pop1')` (`:80`).
- `S14Resume` and `S14LogMark` are added to the saved globals.

`B-reset` (`:468`) with `-Attempt <n ≥ 2> -Skip rel3,pop1` runs these checks **before anything is archived**:
- each skip name must be one of the two;
- the source globals must be stopped or torn down. The source is the current file, else the newest archived
  `r14-globals.clixml.*`;
- the source's `S14Done` must name every skipped block.

If all checks pass, it archives as before and writes new globals: `S14Resume {Attempt, Skip, Mark, MarkFrom}`,
`S14LogMark`, an empty `S14Done`. It then prints:
- `RESUME attempt 3: rel3, pop1 recorded in attempt 2, not re-run`
- the run order and the mark.

The order check in main (`:518`):
- On a resume the order is `$Order` minus the skipped blocks.
- A skipped block answers `NOT RUN: block … is skipped in this resume …` (exit 3).
- Every other block needs its predecessor in that order. Out-of-order calls are still refused.
- The block right after a skipped one (r3) prints the RESUME line again into the raw output.

A plain `-Block reset` behaves as before.

**Dry runs** (scratchpad `S9_OUT`, no Chrome), each with its exit code:

| Call | Result |
|---|---|
| `-Skip type` | refused, 3 |
| `-Attempt 1` | refused, 3 |
| `-Attempt` on `status` | ignored (status exits first), 0 |
| `-Attempt` on `r3` | refused, 3 |
| `reset -Attempt 3 -Skip rel3,pop1` | both RESUME lines; mark `2026-10-24T21:14:17.041Z (the WaveStart stored in the current globals)`; 0 |
| then `rel3` and `pop1` | skipped, 3 |
| then `r3` and `servers` | `needs block found` / `needs block preflight first`, 3 |
| with Done through `found`, `type` | `needs block r3 first`, 3 (r3, not pop1, is its predecessor) |
| resume from an archive only | works, mark taken from the archive |
| source without pop1 in Done | refused, 3 |
| no mark stored, no `-LogMark` | refused, 3 |
| no mark stored, with `-LogMark` | the line names `-LogMark`, 0 |
| no source at all | refused, 3 |

**Docs:**
- The wave sheet has a new subsection, "Resume after Return 2 (attempt 3)", with the exact calls, the refusals, the new
  r3 and logs lines, and a record heading for attempt 3.
- `briefs/S1-runner.md` now points to that subsection, right after the STOP-rule paragraph.
- The STOP RULE sentence is unchanged and byte-identical in all three files.

## 3. R14-POP-1 diagnosis (ruling (c)): read only, nothing changed

**Verdict: most likely neither the daemon's opener rule nor the SDK. The likely cause is the helper's set-up (the
opener tab was in the background) meeting how Chrome sets `openerTabId`.** This is inferred, not measured; the Chrome half is a **conjecture** (round 2, verifier N1).

| Candidate | Evidence | Verdict |
|---|---|---|
| Listener on the wrong client, or a mismatched event name | `s9.ts:868` (round 2: was `:854`, stale — verifier F3 found it at `:863` before round 2's header lines): the listener is on the same client `c` that claims `a` (`:869`) and is the owner (`claim-owner T835 owner="s9-r14-pop1"`). The name `leaseGranted` matches `shared/src/protocol.ts:85,243`, `sdk/src/client.ts:142,307`, and the daemon's frame at `daemon/src/intercept.ts:400`. | ruled out |
| SDK drops the frame | `sdk/src/client.ts:139-145`: delivered when `isLeaseGrantedEvent` holds (`tab` string, `reason:"opener"`, `url` string). The daemon always sends that shape (`intercept.ts:397-401`; the url is `""` while redacting). | ruled out |
| Daemon url poll | `intercept.ts:313` delivers **after** `fillUrl` in every case: the url is found, the 2 s bound (`:101`) passes, the tab is gone, or the row is hidden (`:369-371`). The helper waited 5 s. A grant is withheld only when it no longer stands (`:391-395`) or a `newTab` is in flight (`:383`, none here). | unlikely |
| Step 9 tab-event changes | `extension/src/sw.ts:173-178` keeps `openerTabId` (`tab-events.ts:141`); `redactTabCreated` (`safety.ts:375-383`) only blanks `url`. The relay works for events: daemon.log shows `safety state:` lines in this wave. | unlikely |
| The opener tab id names a tab nobody holds | `intercept.ts:335-341`: the grant goes to the holder of **`openerTabId`'s** tab. With no holder, nothing is granted and nothing is logged. Tab `a` was a **background** tab: `s9.ts setup` opens it with `newTab` without `active` (`s9.ts:361` → `openTab` `:320-321`; CLAUDE.md: `newTab` opens in the background). Block pop1 brings W, whose active tab is `w`, to the front, and the click is synthetic. **Conjecture (not shown):** in Chrome's tab strip, a tab opened by a link click takes as its opener the window's **active** tab, not necessarily the tab that clicked (my knowledge of Chromium's `TabStripModel`, which the verifier's reading shares; nothing in this repo or any live record measures `openerTabId` for a background opener). The tabs API's `openerTabId` reports that tab-strip opener. If so, `openerTabId` named `w` (T834, unheld after `setup` ended), so the rule correctly granted nothing. Every passing run had the opener **in front**: LEASE-3 and R9-LEASE-3 used `recipes/t5.ts:371` `newTab(…, true)`, "opened … (active)". Run 13's SAFE-POP-1 clicked a background, unclaimed `a`, then a trusted click after `focusTab a`; both unheld. | **most likely (conjecture)** |

**daemon.log, 21:14:50Z–21:15:01Z:** 2 lines. Neither contains `://`. They are the fixed texts
`client + "s9-r14-pop1" (1 client)` (21:14:53Z) and `client - "s9-r14-pop1" (0 clients)` (21:14:59Z). There is no
`malformed event dropped` line and no extension-error line. The daemon logs no per-tab event, so the log can neither
confirm nor rule out the hypothesis.

So whether this is a product gap is still open. If `openerTabId` follows the active tab, the documented rule "a popup of
a held tab is leased to its holder" does not hold for a popup opened from a held **background** tab. In that case the
grant goes to the active tab's holder, if any. That would be a product limitation (the daemon trusts Chrome's
`openerTabId`), not a defect in the daemon's code. It needs a measurement.

**Proposed decision (for decisions.md; a new Run 15 row, never a Run 14 re-run):**

> ### 2026-10-25 · R14-POP-1's missing `leaseGranted` is measured in Run 15 by a row that reads the popup's `openerTabId` (#…)
> **Decided:** R14-POP-1's FAIL stands as recorded. Run 15 adds a row, R15-POP-2, written before it runs. Its client
> claims fixture tab `a` and runs two legs. In leg A, `a` is brought to the front first (`focusTab a`); in leg B, `a`
> stays in the background, as in R14-POP-1. Each leg makes one synthetic click on `Open popup`. Each leg prints the new
> popup row's `openerTabId` as the handle of the listed row with that Chrome `id` (`a`, `w` or `other`), plus the
> `leaseGranted` line or `no leaseGranted within 5 s`. Pass rule: leg A gets `leaseGranted {reason:"opener", url: the
> popup URL}` within 2500 ms and opener = `a`. Leg B is a RECORD: which tab Chrome names as the opener, and whether a
> grant came. If leg B names `w`, the opener rule's documentation (CLAUDE.md "a popup of a held tab") gains the measured
> limit "only when the held tab is the active tab of its window, as Chrome reports the opener". Any product change is a
> separate decision.
> **Why:** the code path from `tabCreated` to `leaseGranted` is intact (listener, event name, guard, url poll, Step 9
> redaction). The one input the daemon takes on trust is Chrome's `openerTabId`. That Chrome names the window's active
> tab as the opener of a popup from a background tab is a conjecture from Chromium's `TabStripModel`, not a measurement;
> this row measures it. Every passing run (LEASE-3,
> R9-LEASE-3) had the opener in front, and both failing runs (SAFE-POP-1, R14-POP-1) clicked a background tab. Reading
> `openerTabId` separates "Chrome named another opener" from "the daemon dropped the grant".
> **Instead of:** re-running R14-POP-1 in Run 14 (a failed row is never re-run, #193); changing the daemon to infer the
> opener some other way before the measurement (the bound and the rule would then be chosen after seeing a result);
> calling it a product defect on reading alone.
> **Revisit if:** leg A also gets no grant with opener = `a` (then the daemon or the relay is at fault and becomes a
> defect to fix); or Chrome omits `openerTabId` in both legs (then the opener rule cannot work for synthetic clicks at
> all).

## 4. Logs window (ruling (d))

`B-logs` (`s9-r14.ps1:420-428`) counts `daemon.log` `--since $global:S14LogMark`, falling back to `WaveStart` when
there is no resume. On a resume it prints two lines:
- `R14-LOGS daemon.log counted from <mark> (attempt 2's wave mark: <how it was taken>) - attempts 2 and 3`
- `R14-LOGS attempt 2's worker console was not captured (its window D closed with attempt 2's stop procedure) - a
  recorded deviation; the console counted here is attempt 3's only`

**Where the mark comes from:** attempt 2's mark is stored. `%TEMP%\bridge-e2e\s14\r14-globals.clixml` holds
`WaveStart = 2026-10-24T21:14:17.041Z`, the same value as the record's attempt-2 line `wave start
2026-10-24T21:14:17.041Z`. The resume reset carries it into `S14LogMark` and says so: `(the WaveStart stored in the
current globals)`. If that file and every archive are gone, the reset refuses unless `-LogMark <the record's attempt-2
wave start>` is passed, and the line then names `-LogMark` as the source.

## Notes for the step agent

- The preflight needs a clean tracked tree. Commit this fix and the runner's record and ledger edits before
  dispatching runner 3.
- The new r3 lines (`PLACEMENT order`, `MOVED`, the extra `PLACED` per try, `placement-attempt-<n>`, `PLACEMENT
  chosen`) are records. The live verifier should not read `PLACEMENT attempt <n> … not free` as a CHECK FAIL: it is not
  one, and only the guard's own CHECK lines judge.
- Moving E and D inside W's rect is untested live. If Chrome refuses a `MoveWindow` on D (DevTools), the next try still
  reports D by name, and no free area means the same STOP.
- Spec-discrepancy: none found.

## Round 2 (2026-10-25, the step agent's rulings on `S1-wave-verifier.md` F1–F3)

Same limits as round 1: no live Chrome, no daemon, no connection to 9234, no block against Chrome, and
`%TEMP%\bridge-e2e\s14` untouched. Its globals still hash md5 `983CB7C9…`, the same value the verifier read. No commit,
no product code.

**F1 (MAJOR): the placement area is cut above the shell taskbars; the guard is unchanged.**
- `recipes/s9-rules.ts:853` `taskbarCut` (`TASKBAR_CLASSES` = `Shell_TrayWnd`, `Shell_SecondaryTrayWnd`):
  - A try's area is the work area with its bottom set to the top of every shell taskbar window whose rect overlaps it
    with a positive area. An auto-hidden taskbar's 2 px strip counts.
  - If several overlap, the highest top wins.
  - The rule is fixed: no margin.
  - Every other window class is left to the guard.
- `:862` `taskbarCutLine` prints `PLACEMENT work area […] cut to y=<n> by taskbar class=<class>`, or `… not cut (no
  shell taskbar intersects it)`.
- `recipes/s9.ts:1075` `placement-order`:
  - It now needs `{wWork, work, shell}`. The old JSON shape is a set-up STOP; it was dry-run.
  - It prints one cut line per work area, then `PLACEMENT order <m>:` with the areas as they will be tried.
- `recipes/s9-win.ps1:135` `S9Geo.ShellTrays()` lists every top-level window of those two classes with its rect
  (`EnumWindows` + `GetClassName` + `GetWindowRect`; no title). `:912` passes them into the order JSON.
- `placementVerdict` and the `Occluders` walk are untouched. If O overlaps a taskbar, that taskbar still counts as an
  occluder and the wave still STOPs. The cut area lies inside the uncut work area, so the guard's work-area clause still
  holds.

Test: `recipes/test/s9-rules.test.ts:679` was red first (1 failed / 72 passed), then green. It covers:
- the verifier's measured strips: both monitors cut at y=1078;
- a docked taskbar (no cut);
- a non-shell class (no cut);
- the highest top among several taskbars;
- a side-by-side split of the cut area that passes `placementVerdict` with 0 occluders, with O touching the strip but
  not overlapping it.

Dry run (read-only, the same enumeration as the verifier's): `ShellTrays` →
`Shell_SecondaryTrayWnd 1920 1078 3840 1126 | Shell_TrayWnd 0 1078 1920 1126`. `placement-order` then printed:
- `PLACEMENT work area [1920,0,3840,1080] cut to y=1078 by taskbar class=Shell_SecondaryTrayWnd`
- `… [0,0,1920,1080] cut to y=1078 by taskbar class=Shell_TrayWnd`
- `PLACEMENT order 2: [1920,0,3840,1078] [0,0,1920,1078]`

The PowerShell regex parsed both tries.

Documentation:
- §4.21's dated note gained a round-2 sentence (procedure only; no row line changed: `git diff` shows no table line).
- The wave sheet's resume subsection names the cut lines.

**F2 (MINOR): the resume is exactly ruling (b).** `recipes/s9-r14.ps1:470-505` and the header (`:32-42`):
- Accepted only as `-Attempt 3` with `-Skip` naming both `rel3` and `pop1`, in either order, with nothing else.
- The stored state must be attempt 2's:
  - `S14Stopped` begins `r3:`;
  - `S14Done` is exactly `preflight … pop1`;
  - there is no `S14Resume`.
  The state is read from the current globals, else the newest archive.
- `-LogMark` is refused while attempt 2's `WaveStart` is stored.
- Every refusal prints `USAGE: … nothing changed` (never `STOP:`), exits 3 and archives nothing.

Dry runs on scratchpad copies (`scratchpad\r2\a|b|c`):

| Call | Result |
|---|---|
| `-Attempt 7 -Skip pop1` | USAGE, 3 |
| `-Attempt 3 -Skip pop1` | USAGE, 3 |
| `-Skip rel3,rel3` | USAGE, 3 |
| `-Skip rel3,pop1,type` | USAGE, 3 |
| `-LogMark` with the mark stored | USAGE, 3 |
| `-Skip` without `-Attempt` | USAGE, 3 |
| after all of the above | the folder still holds only `r14-globals.clixml` |
| `-Attempt 3 -Skip pop1,rel3` | both RESUME lines, 0 |
| the same reset again (the state is now a resume) | USAGE, 3 |
| `rel3` | skipped, 3 |
| `r3` | needs `found`, 3 |
| from an archive only | the resume works, 0 |
| a state with only rel3 done | USAGE, 3; folder unchanged |

Updated: the wave sheet's resume subsection.

**F3: the report is corrected.**
- The listener is now cited at `s9.ts:868`, the claim at `:869`. The verifier's `:863` was right before round 2's
  header lines moved it.
- Ruling (c)'s Chrome-opener claim is marked a **conjecture** in the verdict, in its table row and in the proposed
  decision's *Why*.

**Checks (round 2)**

| Check | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s9.json` | 0 |
| `npm run typecheck` | 0 |
| `npm test` | **2758 passed, 116 files**. Round 1 had 2757; +1, all in `recipes/test/s9-rules.test.ts` (72 → 73). |
| `npm run build` | 0. The dist sha256 values are unchanged (`99bb55c5`, `5a2888f7`, `bcb20e28`, `a8beec6c`, `f8b52058`, equal to `$Dist`), and there is no dist change in `git status`. |
| PowerShell parse | 0 errors in both files |
| STOP RULE | the same sha256 (`ddce1848…`) in the sheet, the runner brief and §4.21 |
| §4.21 rows and pass rules | unedited (only the italic note after the table grew) |
