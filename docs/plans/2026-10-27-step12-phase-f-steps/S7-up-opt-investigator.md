# Step 12 S7: the UP-OPT investigator (#351 (1))

Model: Claude Opus 5.5, medium effort. Run 2026-10-28, 19:23Z to 19:31Z. Chrome **156.0.8078.48**, branded, on a fresh
scratch profile with no daemon and no token. I wrote the pass rules (`s7-upopt-passrules.txt`) before any measurement. Two
sections were appended later, each before its own repetitions ran; no earlier text was edited.

## 1. Verdict

**DONE. The cause is the poll, not the page.** The options page in O2 follows a save made in O in 12–23 ms in every
repetition, whether O2 is visible or covered. The helper's UIA read (`Get-S11Box`) reads the right control, `uploadfolders`
by its ValuePattern, but the value comes from Chrome's accessibility tree. Chrome does not update that tree while the window
is covered. The helper covers O2 itself: `Set-S11Box`'s `ValuePattern.SetValue` on O brings O to the front (10 of 10, every
geometry). When O hides O2, UIA keeps reading the old text for the whole 15 s, and it still does from a fresh `FromHandle`.
Bringing O2 to the front after the save fixes it: UIA saw the saved text in 56–217 ms, 5 of 5.

One caveat: no run record says whether O covered O2 in Run 18. That part is inferred from the mechanism and was not
measured in the real profile (§6).

## 2. Outputs

These files are in `docs/plans/2026-10-27-step12-phase-f-steps/`:
- `s7-upopt-passrules.txt`: the pass rules, with two dated appends (types C/D, then type E).
- `s7-upopt-run.txt`: 25 JSON lines, one per repetition, plus the trial notes and a field key.
- `s7-upopt-setup.txt`: the copy, the launch, the close and clean-up, and the tool sources (`launch.mjs`, `drive.mjs`,
  `uia.ps1`, `closeall.mjs`).

Each repetition opened two windows on the extension's `options.html`: O first, then O2 (the newer window, in front before the
write, 25 of 25). The write into O was done the helper's way (SetValue, 250 ms, Invoke `save-uploadfolders`) with a new
fixture line appended. UIA polled O2 every 150 ms for 15 000 ms with the calls of `Get-S11Box`/`Get-S9Doc`. Times run from
the Invoke. All 25 repetitions are valid: O's `chrome.storage.local` equals S after the save, and O2 showed the previous
text before the write.

| Type (O2 placement) | Reps | O2 DOM equal to S (CDP) | UIA equal to S | UIA agrees with the DOM at 15 s | O2 `visibilityState` at the end |
|---|---|---|---|---|---|
| A (partly covered; DOM read once at the end) | 5 | yes at the end, 5/5 | **21, 26, 23, 25, 24 ms** | 5/5 | visible |
| B (partly covered; DOM polled) | 5 | **13, 12, 12, 13, 23 ms** | **25, 23, 23, 25, 30 ms** | 5/5 | visible |
| C (fully covered by O; DOM polled) | 5 | **14, 16, 18, 17, 14 ms** (already `hidden` at the first read) | **never in 15 s** (15 015–15 097 ms, 89–90 polls; the old text) | **0/5** | hidden |
| D (fully covered; DOM read once at the end) | 5 | yes at the end, 5/5 | **never in 15 s** (15 053–15 166 ms) | **0/5** | hidden |
| E (as D, then O2 brought to the front right after the Invoke) | 5 | yes at the end, 5/5 | **74, 215, 56, 63, 217 ms** | 5/5 | visible |

Judged by the pre-written rules:
- **A/B:** NOT REPRODUCED. With O2 partly visible, the page and the poll are both in time, 10 of 10.
- **C/D:** **H-OCC/POLL** holds. In C the page was in time and UIA failed, 5 of 5; in D UIA failed, 5 of 5; UIA disagreed
  with the DOM in 10 of 10.
- **E:** **FIX-WORKS**, 5 of 5.

**Earlier runs, re-read against the code.** In Runs 16 and 17b the poll stopped at 6 s
(`recipes/s11-win.ps1:278`), and when the text never showed, `o2Ms` was set to the elapsed time (`s11-win.ps1:283`). So
Run 16's "6 061 ms" and Run 17b's "6 105 ms" were most likely **no match within 6 s**, not a late match: the same failure as
Run 18's `shown=no` at 15 136 ms. That is also where the ROW wording defect of `S1-run-record.md` §5 item 2 comes from.

## 3. Verifier verdict

Not applicable (read-only leaf).

## 4. Deviations

- **The extension copy.** I measured a scratch **copy** of `extension/` as built. `options.html`, `dist/options.js` and
  `manifest.json` are byte-identical to the tree (sha256 in `s7-upopt-setup.txt`). In the copy's `dist/sw.js` only the two
  `DEFAULT_PORT = 9234` literals were changed, to the unused port 18569. Loaded unchanged, the worker would dial 9234 with an
  empty token, and the brief forbids port 9234. The options page does not read that constant.
- **The scratch folder.** It was my session scratchpad, not `%TEMP%\claude\s12-…`.
- **No windows typed into.** The windows were opened by CDP `Target.createTarget {newWindow}` and placed by
  `Browser.setWindowBounds`, not opened with `chrome.exe --new-window` and an address-bar entry as `Open-S11Window` does. The
  page is the same and so is the UIA read.
- **Two appended rule sections (C/D, then E).** Each was written after the earlier repetitions and before its own ran.
  A/B was the only registered set, and it did not reproduce the failure.
- **The ALT tap in type E.** Type E sends an ALT tap before `SetForegroundWindow`, as `Set-S9Foreground` does. It was sent
  only when the foreground window belonged to the scratch browser's pid. It did, 5 of 5.

## 5. Proposed decisions

### 2026-10-28 · R19-UP-OPT: bring O2 to the front after the save before polling it (helper fix, S7-helpers)
**Decided:** In `Invoke-S11Opt`, right after `Set-S11Box $O 'uploadfolders' $next` (`recipes/s11-win.ps1:276`), and before
the poll (`:277`, replaced by `Wait-S12O2` in `recipes/s12-win.ps1:156`), call `[void](Set-S9Foreground $O2)`. The time
still counts from the save, so the 5 000 ms bound is unchanged. A `FIX` line names this. The same applies to the conflict
read at `s11-win.ps1:284`, which reads O2 by UIA too. Another way, or an addition: place O and O2 side by side so that
neither covers the other (A/B read 21–30 ms with O2 only partly covered). Either way, record O2's foreground or visibility
in the `OPT O2` evidence.
**Why:** In 25 of 25 repetitions the page updated in 12–23 ms. A covered O2 made UIA read stale text in 10 of 10, and
bringing O2 to the front fixed it in 5 of 5 (56–217 ms). The row asks whether a second window shows the save, which a person
sees only in a window they can see.
**Instead of:** a product change to `options.ts` (the page already follows another window's change), or moving the bound.
**Revisit if:** R19-UP-OPT still reads `shown=no` with O2 in front, which would be a real-profile difference to measure.
**By:** Claude (proposed).

### 2026-10-28 · The options-page gotcha is about UIA, not the page
**Decided:** Narrow the `extension/CLAUDE.md` bullet "An options page follows a `storage.onChanged` change only while
visible" to the measured fact. In a covered window the page's DOM still follows within about 20 ms (`visibilityState`
`hidden`), but Chrome's accessibility tree, and so UIA, stays stale until the window is visible. Add a `recipes/CLAUDE.md`
bullet: `ValuePattern.SetValue` on a Chrome window brings it to the front (10 of 10 here), which can cover the driver's other
windows. Run 13 SAFE-3's reading was probably the same effect; it was not re-measured.
**By:** Claude (proposed); the session agent writes CLAUDE.md files.

## 6. Findings

- **No product finding for UP-OPT.** The page met the 5 000 ms bound by a wide margin in every repetition. **F1 of
  `S1-run-record.md` is explained by the poll**, if O covered O2 in Run 18. That is plausible, since the helper's own write
  brings O to the front, but Run 18 did not record the geometry. A real-profile check is R19-UP-OPT with the fix.
- **New runtime facts** (Chrome 156, scratch profile, 2026-10-28):
  - UIA `ValuePattern.SetValue` on a Chrome page brings its window to the foreground (10 of 10).
  - Chrome stops updating a fully covered window's accessibility tree, so a UIA read returns the old value for at least 15 s.
    The DOM is current (14–18 ms) and `document.visibilityState` reads `hidden`.
  - The tree catches up within 56–217 ms after the window is brought to the front.
- **A latent risk in the same poll, not measured:** `Add-S11Line` keeps the found text's CRLF (`s11-win.ps1:39`), while a
  textarea's `.value` normalises line breaks to LF. With a found text that holds CRLF lines, `$setSha` would never equal O2's
  value even when the window is visible. Run 18's found text was empty, so this did not apply there. A unit check in
  S7-helpers would settle it.
- A PowerShell trap of my own tool, already known from `recipes/CLAUDE.md`: `$u` shadowed `$U` (case-insensitive names).
  The trial T0 crashed and I fixed the tool before any registered repetition.

## 7. Handoff

- **Clean-up:** the scratch Chrome closed by `Browser.close` (exit code 0). No process with the scratch root in its command
  line remains (chrome, node, timeout, powershell = 0). Ports 18560–18569 hold only TIME_WAIT sockets. There were 0 reparse
  points (Get-ChildItem and `dir /AL /S /B`: File Not Found), and the scratch root is deleted (`Test-Path` False).
- **Not touched:** the user's Chrome, profile, windows, daemon and port 9234. No product or recipe file was changed, no
  `npm` command was run, `wtv` was not read, and nothing was committed.
- **Next:** S7-helpers makes the §5 fix between rows, then R19-UP-OPT runs with a `FIX` line.
