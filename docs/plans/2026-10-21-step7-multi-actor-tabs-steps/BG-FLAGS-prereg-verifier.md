# BG-FLAGS pre-registration: independent verifier

Date: 2026-10-23. Verifier: Opus 5.5 (role-prompts.md §Verifier). Scope: the uncommitted §4.16 of
`docs/e2e-test-plan.md`, the wave sheet's "BG-FLAGS (Run 10)" section, and `recipes/bgf-{count,quit,launch}.ps1`
(`git status --short` at HEAD c99709a). Chrome was not touched; no script was run against Chrome.

Verdict: FAIL

One MAJOR finding (F1): the tab count that guards the user's session can count things that are not tabs,
and the cross-check meant to catch that has no consequence written down. The fix is small (see F1). The
rest is MINOR/NIT. The copied pass rules, the result-reading rule, the no-kill rule and the launcher are sound.

## Checks that pass

- **(1) Copied rules.** BGF-1…4's Expected text was compared word by word with §4.14 BG-1…4 (`grep -n "^| BG-\|^| BGF-" docs/e2e-test-plan.md`,
  lines 679–682 against 822–825). It is the same, with three changes. BG-1's pointer "(see the wave sheet: T5.2's retry is returned
  as a proposed decision)" now reads "(focus emulation is Step 8's, #62 (4))". "so is the line" now reads "so is the script's line".
  BG-4 gains a sentence that is only recorded ("with the timer clamp off, `<t>` nearer 2000 ms is expected but not required"). None
  of these loosens a rule. The PASS conditions (`hidden` target, exact status and value, 1900 ≤ t ≤ 10000, n ≤ 10000, the
  isError/`ok` pair for BG-3) are unchanged. The steps run the same commands (`t5.ts bg1 --then-focus`, `bg2 --then-focus`, `bg4`,
  `open bg3` / `info bg3` plus actor F's four calls). "uncovered" became `Set-T5Topmost`, which is stricter.
- **(2) Result reading.** "The flags change BG-1 iff BGF-0 FAILs, BGF-1 PASSes and BGF-5 FAILs" is applied per row. A BGF-5 PASS is
  read as "not attributable" and a BGF-0 PASS as "not determinable". The validity rule (the flags must show in `browser switches`
  right before each row) is written before any measurement. No outcome reads "flags changed it" without all three.
- **(3) No kill.** `grep -n "Stop-Process\|taskkill\|Kill\|TerminateProcess" recipes/bgf-*.ps1` finds nothing. bgf-quit's only
  exit from a still-running Chrome is exit 3 plus a STOP (bgf-quit.ps1:104). All waits are bounded: 15 s for the window and the
  address bar, 5 s for its value, 60 s for the exit, and 5 s for `-CloseBlank`. Only counts are recorded. The quit is graceful
  (chrome://quit). The end state is N/T/P and no flags.
- **(4) Parse and layout.** `[Management.Automation.Language.Parser]::ParseFile` gives bgf-count 0, bgf-quit 0 and bgf-launch 0
  errors. The STARTUPINFO declared exactly as in bgf-launch.ps1 compiles to `Marshal.SizeOf` = **104** with `IntPtr.Size` 8 (the
  correct x64 size). The field order matches the Win32 struct (cb, 3 strings, 8 DWORDs, 2 WORDs, lpReserved2, 3 handles), and so does
  PROCESS_INFORMATION. The flags are `0x01000000|0x400|0x200`. `bInheritHandles` is false. The environment comes from
  `CreateEnvironmentBlock(…, false)`. The command line is `"<exe>" <args>`. If CreateProcess fails, for example because breakaway is
  refused, the script exits 2 and starts nothing.
- bgf-quit acts only on a window it opened. That window is a new handle, exactly one, with an omnibox that reads `about:blank`. Only
  after that check does it set the value. It sends the single Enter only when the foreground window is its own, the focused element
  `Automation.Compare`s equal to the omnibox, and the value is `chrome://quit` (bgf-quit.ps1:94). `Close-Own` can only be reached
  after the `about:blank` check. The script prints no title or URL. Its exit codes match its header.

## Findings

1. **MAJOR. The UIA `TabItem` count can include ARIA tabs inside web pages, and the listTabs cross-check is not a gate**
   (bgf-count.ps1:50–54; §4.16 step 1/5; wave sheet step 1). `FindAll(TreeScope.Descendants, ControlType=TabItem)` from the window
   root also walks the active tab's web-content accessibility tree. Chrome exposes it over UIA once a UIA client asks, so any page
   with `role="tab"` elements adds to `tabs` and to P. Such a page could be one of the user's active tabs, or the fixture if it has
   any. Whether that content is counted also depends on load and accessibility timing, which will differ before and after a
   restore. This has two consequences:
   - A spurious Restore FAIL after restart 1. That is a STOP that leaves the user's Chrome running with the flags, and the wave
     sheet's "restart 2 at once if … the session is intact" is ambiguous here, because the only test of "intact" is this count.
   - In principle, an inflated count could hide a lost tab.

   §4.16 step 5 makes `listTabs` the "second, independent tab count", and the wave sheet says "expected T + 1". Neither says what
   happens if the pre-flight `k` ≠ T + 1. **Fix:** count only tab-strip tabs (add `ClassName = 'Tab'` with an `AndCondition`, or
   search only the tab strip's children). Confirm it in the pre-flight helper test. Also make "pre-flight `k` = T + 1" a
   precondition of restart 1, so that otherwise `bgf-count` is fixed as a set-up fix before restart 1, or the stage STOPs. State the
   same rule in both §4.16 and the wave sheet.
2. **MINOR. Step 1's comparison has no consequence** (§4.16 restart step 1). "bgf-count must print the same … as the stage's first
   count" does not say what happens on a mismatch, including a first count with `blank windows` ≠ 0. Add "else STOP (nothing is
   quit)".
3. **MINOR. A 60 s poll that times out is not handled** (§4.16 step 4). If two equal results with ≥ N windows never appear, the
   text does not say what follows. Say "then the final count is judged as is (⇒ STOP if not Restore PASS)".
4. **MINOR. `-CloseBlank` should also require N + 1 windows** (§4.16 step 4; bgf-count.ps1:65–69). The script closes the blank
   window whenever exactly one exists. With N windows and blank = 1, a user's window is missing, and the driver's window is closed
   before the STOP. Gate it on "N + 1 windows and blank 1" in the doc. The script may stay as it is.
5. **MINOR. The STOP end state is not spelled out.** For a STOP after restart 1 that is not followed by restart 2, say plainly what
   is left: Chrome running with the flags and `--restore-last-session`, and possibly the driver's unrecognised blank window. Say
   that the record must name this for the user.
6. **MINOR. A missing BGF-5 or BGF-1/2 has no named reading** (§4.16 "Reading the result"). Under the iff rule, if restart 2
   STOPs and BGF-5 is not run, or if BGF-1/2 is "not run (set-up)", then "the flags change it" cannot be claimed. Name that reading
   ("not determinable") so it is not argued later. "Both outcomes are fine" should read "Every outcome".
7. **MINOR. BGF-0 has no validity rule.** BGF-0 is valid only if the first count's `browser switches` shows none of the three
   flags. Add that. The ledger records "no switches", so it holds today.
8. **MINOR. The end state is not compared with the original switches.** The final rule expects `[--restore-last-session]`, but the
   first count's switches (recorded) are never compared. Note that the user's Chrome keeps `--restore-last-session` until its next
   ordinary start, and that it was in a job originally (ledger 23:12Z) but will not be afterwards. Both are harmless, but the
   record should state them.
9. **MINOR. The Alt tap may go to a window the script did not open** (bgf-quit.ps1:85). The Alt press and release before
   `SetForegroundWindow` reaches whatever window is in front, which may be the driver's terminal or a user's window. It is not
   typing, and it is the same as the accepted `reload-extension.ps1`, but it qualifies "never sends keys to a window it did not open".
10. **NIT.** bgf-launch also sets `CREATE_NEW_PROCESS_GROUP` (0x200). It is harmless for a GUI program, but §4.16 does not mention
    it.
11. **NIT.** `CreateProcess` gets an immutable .NET `string` as `lpCommandLine`, which CreateProcessW may write to. The string is a
    fresh concatenation, so this is harmless. A `StringBuilder` is the textbook form.
12. **NIT.** In the wave sheet, BGF-0 and BGF-5 end with `cleanup`. In §4.16 the same rows end with `cleanup --keep bg-human` (BGF-0)
    or with no cleanup (BGF-5). Align them. The wave sheet's order BGF-1, 2, 4, 3 is allowed, since §4.16 defers the order to it.
13. **NIT (docs guide, decisions rule).** Decisions are cited by number alone ("#61; #62 (4)", "(#65)", "decisions.md #64 (2), #61,
    #62 (4)"). The guide says to cite by date and title. The Chrome version cites "measured at 23:12Z" rather than the command that
    measured it.
14. **NIT.** There is one trial per condition (BGF-0/1/5). That is acceptable because three conditions must line up, but the record
    should not call a single PASS a reproduction.

Consistency between §4.16 and the wave sheet (5) is otherwise good. Driver windows are closed before each restart (wave steps 2
and 4), and the check window is opened in restart step 5 and closed in wave step 4/6. STOP handling (restart 2 at once only from
restart 1, with the flags on and the session intact) and the check-count rule agree, apart from F1's missing gate.

## Re-check (round 1)

Verdict: PASS-with-notes

Re-checked only the affected items, against `git diff` of §4.16, the wave sheet and `recipes/bgf-count.ps1`.
Chrome was used read-only, for one run of `bgf-count.ps1` without `-CloseBlank`.

- **F1 (MAJOR): fixed.** bgf-count.ps1:53–55 is now an `AndCondition` of ControlType `TabItem` and ClassName `Tab`.
  The parse check gives 0 errors. The read-only run printed `browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1);
  blank windows 0; browser switches: []`, which matches the builder's measurement (1 `Tab`, plus 1 web element that was counted
  before). §4.16 step 0 makes "pre-flight `k` = T + 1" restart 1's precondition, with a set-up fix allowed before any restart,
  else STOP. Wave sheet step 1 cites that rule.
- **F2–F8: fixed** as described.
  - F2: step 1 now says "else ⇒ STOP (no quit)".
  - F3: at 60 s the last count is judged as it stands.
  - F4: `-CloseBlank -Expect N` acts only with blank 1 and N + 1 windows (bgf-count.ps1:72–73), and closes nothing if `-Expect`
    is missing.
  - F5: the STOP record names what is left behind.
  - F6: a missing row is read as "not determinable", the doc says "Every outcome", and one trial per condition is stated.
  - F7: the validity rule now covers BGF-0 and BGF-5 (none of the flags).
  - F8: the end state is compared with the first count's `[]`, and the two harmless differences are stated.
- **F9:** left as it is, as in the accepted `reload-extension.ps1`. Accepted.
- **NITs:** these are fixed. `CREATE_NEW_PROCESS_GROUP` is now described in §4.16, the BGF-0/BGF-5 cleanup is aligned in both
  docs, and §4.16's header cites decisions by date and title.
- **Remaining NIT:** the wave sheet's header and §4.16's body still cite "#64 (2), #61, #62 (4)" and "(#65)" by number alone.
  These are the same decisions that §4.16's header cites by title, so this is not blocking.
