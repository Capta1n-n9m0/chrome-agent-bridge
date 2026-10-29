# S7-live liveB19 fix round 3 - verifier report

Model: Claude Opus 5.5, effort medium. This was a leaf run: I read and ran things only. I made no edits to the tree,
started no agents and made no commits. Nothing ran against Chrome, a daemon or a port. Raw output is in
`S7-live-B-verifier3-evidence.txt` (same folder).

## 1. Verdict

**PASS-with-notes.** Round 2's F1 (MAJOR) and F2 are fixed, and F3's bounded re-find is correct. No pre-registered rule
breaks. My mutants found one MINOR gap and three NITs, all on lines round 3 wrote. None is a defect in the product code.

## 2. Outputs

- This report and `S7-live-B-verifier3-evidence.txt`.
- **Tree state, before and after:** `git status --short`, `git diff --stat` (3 files, 144+/22-) and the sha256 of
  `recipes/s12-win-b.ps1` (`ecc7ac0b...de326`), `recipes/test/s12-ps-b.test.ts` (`7c6b52f4...0299f`) and
  `S7-live.ledger.md` (`b62973c4...c63c19`) are the same before and after (evidence: `SHA-SAME STAT-SAME STATUS-SAME`).
  Every mutant ran on a scratch copy in the session scratchpad (`v3/`). The tree's ps1 was never swapped.
- **Re-runs from the tree:**
  - `npm test`: exit 0, `Test Files 233 passed (233)`, `Tests 5588 passed (5588)`. That is 5580 + 3 restored + 5 new mutants.
  - `npm run typecheck`: exit 0.
  - `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0, with no output.
  - `file recipes/s12-win-b.ps1` prints `ASCII text`, and a byte scan found 0 bytes over 127.

## 3. Checks

### (1) F1: B18-B20 restored, and no HEAD test removed or weakened

- `git show HEAD:recipes/test/s12-ps-b.test.ts | grep` gives B18-B20 at HEAD `:211-213`. They are in the tree at
  `s12-ps-b.test.ts:276-278`, byte for byte identical (evidence §1). `git diff` has no `-` or `+` line for them.
- **They kill:** on the fixed file, all 39 of the file's own tests pass in my scratch harness (`Tests 53 passed (53)` =
  39 + 14 VMUT). Each mutant test asserts that its check goes red, so B18, B19 and B20 each turn their `escape` check red.
- **Every removed line vs HEAD, read one by one (evidence §1):**
  - These lines were extended, not weakened: the `PRE` globals line, the `Find-S12UiaByName` stub (now counts reads), the
    `T` wrapper (resets the counters), and the find-throw check (now covers both finders).
  - `$ALL`, `mkRoot.FindAll`, `find-roots`, `open-throw-C/S`, `open-find-throw`, `no-more`, `no-button` and B16 were
    retargeted from `Customize and control*` to the ClassName button. Round 2 made those changes, and verifier 2 audited
    them.
  - The `find-roots` check went from `FH 7|FH 30|FH 7|FH 30` to `FH 7|FH 30`. It now makes one lookup, not two. The
    dropped `BYHWND-OTHER` print was never read by any check.
  - B17 moved below B20 with the same `from`/`to`. Its check name was extended.
  - The only check round 3 changed is "a missing step ...": `count(FIND) === 2` became `count(FIND Developer) === 0 &&
    count(FIND More) > 1`. "The later steps are not looked for" still holds (no Developer lookup). The no-button half
    still demands exactly one FIND. The old `=== 2` also pinned "More tools read once", which the poll removes by design.
    That is a needed change, not a weakening.
- Nothing else from HEAD was removed.

### (2) F2: the opener-uses-`Invoke-S12UiaElement` mutant is killed

- B26 (`-not (Open-S12UiaItem $el)` -> `-not (Invoke-S12UiaElement $el)`) passes in the tree and in my harness, so the
  mutant goes red.
- The new check is `item` / "the opener presses with Open-S12UiaItem ...". It uses `open-expanded`: both finders return an
  already-Expanded item whose Expand throws. `Open-S12UiaItem` skips the Expand, so the result is found=yes. The
  stubbed-out `Invoke-S12UiaElement` is not in play in the `item` group (it uses `${REAL}`, the real helper), which would
  Expand and throw, so the result would be found=no and Escape.
- My own V13 (the `Open-S12UiaItem` result ignored) is also killed (`uia` throwing-press check).

### (3) F3: the bounded re-find (`s12-win-b.ps1:72-84`)

- **The bound:**
  - `$t0` is taken at `:72` and again at `:83`, right after each `found=yes` and before the 700 ms pause.
  - The loop breaks when an element is found, when the step is `menu-button` (one read), or when
    `(Get-S12NowMs) - $t0 -ge 3000` (`:78`). Otherwise it sleeps 200 ms (`:79`).
  - So the bound is "3000 ms from the previous success", and it includes the 700 ms pause. That leaves about 2300 ms of
    polling after the pause. This is what the brief states.
  - The bound for more-tools runs from the button's success. The bound for developer-tools runs from more-tools' success.
  - My mutants V3 (no reset) and V4 (reset after the pause) are both killed, so the anchor is pinned.
- **No infinite loop on a throw:**
  - The `try`/`catch` wraps only the find (`:77`). A throw sets `$el = $null` and falls through to the elapsed test, which
    is outside the `try`.
  - That test's only call is `Get-S12NowMs` (`[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()`), so the loop ends at
    the bound whatever the finder does.
  - My V11 (elapsed sign flipped, never ends) is killed: the harness's 60 s spawn timeout cut the `uia` group off
    (`SLOW 60034ms`), and four checks went red.
- **The clock:**
  - `Get-S12NowMs` is defined once, at `recipes/s12-win.ps1:38`.
  - `recipes/s12-r19.ps1` dot-sources `s12-win.ps1` at `:55`, before `s12-win-b.ps1` at `:56`, and `s12-r19.ps1:56` is
    the only place that dot-sources `s12-win-b.ps1`.
  - `Invoke-S12Timeline` in the same file (`:115`) uses the same function, so it is the same clock.
- **Unchanged (diff context, `:65-90`):**
  - `Assert-S11Own $Hwnd 'DevTools menu'`, the 8081 regex with Stop9/throw, and the `S12Before`/`S12Dev` reset.
  - `CHECK devtools-menu step=<name> found=no|yes` with the three step names.
  - `Send-S12Escape $Hwnd; return $false` on a miss, the 700 and 1500 ms pauses, the `devtools-ui method=` line, the
    `S11Own` record, `[bool]$seen`, and `$S12DevMethod = 'uia-menu'` (`:11`).
- **Red on round 2, green on round 3:** I ran my harness with `-t "every check|mutant B"` on round 2's ps1 (scratch copy,
  sha `7bbdd23a...`, the hash verifier 2 recorded). Result: `Tests 5 failed | 33 passed | 15 skipped (53)`. The reds are
  `menu: every check`, B27, B28, B29 and B30. The 15 skipped are the F12 static test and the 14 VMUT. This matches the
  fixer's "5 failed | 34 passed (39)", whose 34 includes the F12 test.
- **Worst-case added time** (read from the code; not measured, since the UIA read cost `R` was not measured):
  - **Success path:** the item reads that find something can start up to just under 3200 ms after `$t0`: the last read
    after a 200 ms sleep that began before 3000.
    - Developer tools is invoked at most about 6.4 s + 3R after the button is found.
    - The opener returns after at most about 8.6 s + 3R (+ setup).
    - Round 2 took about 3.6 s + 3R, the "~3.6 s" in #362. Round 3 adds up to about 5 s.
  - **Miss path:** at most about 3.5 s (more-tools miss) or 6.7 s (developer-tools miss), Escape included.
- **Does this break a pre-registered rule?** No.
  - KEEP-4's #362 note (`docs/e2e-test-plan.md:1878`, `decisions.md:335-346`) asks for DevTools open "before the keeper's
    5 s idle bound, the time printed", and leaves the pass rule unchanged.
  - `extension/src/debugger-keeper.ts:11` detaches only "`KEEPER_IDLE_MS` after the last use ends". Meanwhile the actor's
    `keep4` (`recipes/s12-r19-b.ts:126-140`) calls `consoleMessages` every 500 ms through `pollUntilDevtools`, which has
    a 15 s deadline (`recipes/s12-forms-b.ts:14, 23-33`). So the kept session is used throughout, and the idle bound
    cannot lapse while the opener polls.
  - DEVPROBE's 15 s deadline also covers the about 8.6 s worst case.
  - Not round 3's concern: `keep4` does not print the poll's `ms`, so "the time printed" rests on the runner's own
    lines. That predates this round (see F-N3).

### (4) Mutants (14, on scratch copies; a mutant is killed when any check in any group goes red)

| # | Mutant | Result |
|---|---|---|
| V1 | poll gap 200 -> 2000 ms | killed (`menu`: never-appears) |
| V2 | poll gap 200 -> 50 ms | **survived** (F-N1) |
| V3 | no `$t0` reset after a success | killed (`menu`: never-appears) |
| V4 | `$t0` reset after the 700 ms pause | killed (`menu`: never-appears) |
| V5 | `-ge 3000` -> `-gt 3000` | survived (equivalent at ms resolution) |
| V6 | bound 2500 | killed |
| V7 | bound 3300 | killed |
| V8 | a find throw ends the poll (`catch { $el = $null; break }`) | **survived** (F-N2) |
| V9 | a found item keeps polling | killed (`menu`, three checks) |
| V10 | first `$t0` removed | survived (equivalent: the button step never reads `$t0`) |
| V11 | elapsed sign flipped (never ends) | killed (timeout, four checks) |
| V12 | `$el = $null` before the loop removed | survived (equivalent: the loop assigns `$el` on every pass) |
| V13 | `Open-S12UiaItem` result ignored | killed (`uia`) |
| V14 | button step uses `Find-S12UiaByName 'BrowserAppMenuButton' 'Button'`, not `Find-S12AppMenuButton` | **survived** (F-M1) |

That is 8 of 14 killed. Of the 6 survivors, 3 are equivalent (V5, V10, V12) and 3 are gaps (V2, V8, V14).

## 4. Findings

**F-M1 - MINOR - no check pins the button step to `Find-S12AppMenuButton`** (`s12-win-b.ps1:77`).

- Mutant V14 changes the round-3 selector to `if ($false) { Find-S12AppMenuButton $Hwnd } else { Find-S12UiaByName ... }`,
  and it survives.
- The cause is the harness: in the `menu` group both stubs print the same `FIND BrowserAppMenuButton` line
  (`s12-ps-b.test.ts:28-29`). The by-name stub also returns an element for the label `BrowserAppMenuButton`, because
  `$ALL` contains it. So late3's `count(FIND BrowserAppMenuButton) === 1` cannot tell the two finders apart.
- Live, the mutant would look up a Name `BrowserAppMenuButton`. Chrome 156 names the button `Chrome` (measurer §2), so the
  result would be `found=no` at `menu-button`, an `attached=no` DEVPROBE, and every DevTools row NOT MEASURED. That is the
  same loss that round 1 fixed.
- Suggested fix: make the button stub print `FIND-BTN` (or make the by-name stub refuse `BrowserAppMenuButton`), and have
  the `menu` group require that line once.

**F-N1 - NIT - the 200 ms poll gap is not pinned from below** (V2).

- The never-appears check needs `>= 10` reads and an elapsed time inside `[3000, 3200]`. A 50 ms gap passes both. Its name
  says "every 200 ms".
- Live, it only means more UIA reads.
- Optional: bound the read count from above too (`<= 13` reads for `never`).

**F-N2 - NIT - "re-find after a throw" is not pinned** (V8).

- If a find throw ended the poll, it would still give found=no and Escape, which is safe. But a transient COM throw while
  the menu draws would then lose the step.
- No test throws once and then succeeds.
- Optional: add a case where the stub throws on read 1 and returns on read 2.

**F-N3 - NIT, predates this round - KEEP-4's "the time printed".** `keep4` (`recipes/s12-r19-b.ts:126-140`) does not
print `pollUntilDevtools`' `ms`. Outside this round's scope. It is recorded only because the brief asked about the #362
note.

Round 2's F5 (V13-V15 of verifier 2) was left as the fixer reported. It was not re-checked, as it was outside the
affected items.

## 5. Deviations

- I added 14 mutants, against the 6 the brief asked for as a minimum.
- I ran the round-2 red run in my own scratch harness, not by swapping files in the tree.

## 6. Proposed decisions

None.

## 7. Handoff

- No process is left running.
- The scratch files (`gen.mjs`, `psb.test.ts`, `fix.ps1`, `r2.ps1`, `head.ps1` and the logs) are in the session
  scratchpad under `v3/`.
- The tree is byte-identical to how I found it.
- F-M1 is the only finding worth a fix before commit, and the step agent may also accept it as a note.
