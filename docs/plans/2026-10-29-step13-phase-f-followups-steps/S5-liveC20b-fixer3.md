# S5-liveC20b fixer3 (decision #418; Sonnet, effort medium)

1. **Verdict:** DONE

2. **Outputs:** `recipes/s13-devt.ps1` and `recipes/test/s13-devt-ps.test.ts` only.
- New `Press-S13DockKind` (with `Test-S13Invokable`, `Invoke-S13Toggle`). `Set-S13DockSide` calls it instead of `Invoke-S13Item` on the Button.
  - It lists the opened menu window's items and keeps the Groups whose name maps to the asked kind.
  - Exactly one such Group that offers InvokePattern: `Invoke-S13Item` on it.
  - Two Groups, or one without Invoke: nothing pressed, so done=false and the menu is closed as before.
  - No Group at all: `TogglePattern.Toggle()` on the matched Button only if it reads Off. An On or unreadable Button is never toggled.
- The item list the reader judges is unchanged (`Get-S13DockItems`, Button/MenuItem/RadioButton), and so are `Read-S13DockSide` and #413's rule. No expected text or pass rule was touched.
- N1: `Open-S13Customize` and `Invoke-S13OpenTries` take the window X as an extra argument. The between-tries Escape goes only when the scope window is X. A menu in the wave's own DevTools window gets no key. The header comment (Escape into X only) is now true.
- Size: about 25 lines of code and 25 of tests, under the cap.

Checks:
- `npm test`: Test Files 251 passed (251), Tests 6030 passed (6030). Before: 6029 / 251; +1 test.
- `npm run typecheck`: exit 0, no error lines.
- Recipe tsconfigs (`recipes/tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`): all eight exit 0.
- `npm run build`: ends with "built extension -> dist/".
- `node scripts/doc-check.mjs`: exit 0.
- `s13-r20-c.ps1 -Block plan`: exit 0.

3. **Verifier verdict:** none yet (a fresh Opus verifier is next).

4. **Deviations:**
- Three existing log expectations in `s13-devt-ps.test.ts` changed from `inv:dock:<side>` to `tog:dock:<side>`. The old stubs had no Group, so the no-Group fallback now presses them by Toggle. These are test expectations of the helper, not run expected texts.
- The test stub adds Groups, `Invoke-S13Toggle` and `Test-S13Invokable`.

5. **Proposed decisions:** none.

6. **Findings:**
- New tests cover:
  - the measured pair (Group Invoke chosen);
  - no Group with an Off Button (Toggle);
  - a Button already On (nothing toggled);
  - an unreadable Button (nothing toggled);
  - two Groups (nothing pressed);
  - a Group without Invoke (nothing pressed);
  - a full `Set-S13DockSide` through the Group;
  - the N1 case (menu in own DevTools window: no `esc50`).
- Not measured live. The Group-invoke path rests on the diag2 evidence (Group, pattern Invoke only), and its effect on the real dock is unproven until the next live attempt.
- The Toggle fallback never fires on the measured structure.

7. **Handoff:**
- Uncommitted: `recipes/s13-devt.ps1`, `recipes/test/s13-devt-ps.test.ts`, this report.
- The untracked steps-dir files were not touched.
- Nothing was run against Chrome, a port or the daemon.
