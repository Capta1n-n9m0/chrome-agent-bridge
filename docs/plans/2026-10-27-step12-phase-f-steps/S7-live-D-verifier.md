# S7-live liveD19, fix round 1: verifier report

Model: Opus 5.5, effort medium. Role: verifier (agent-rules §6). I read files and ran commands and edited nothing except
this report and its evidence file. Mutants ran in the main tree and each was restored by copying the file back, checked
with `sha256sum -c` OK. Nothing ran against Chrome, a daemon or port 9234. The scratch worktree `wtv` was not read.
Raw output: `S7-live-D-verifier-evidence.txt`.

## 1. Verdict
**PASS-with-notes** (one MINOR finding, one NIT; no CRITICAL or MAJOR finding).

## 2. Checks
1. **Diagnosis holds, checked against the code.** In `test-fixtures/s12-chooser.js:41-44`, `c1: BTN + HID + VIS`, where
   `HID = '<input id="in" type="file" hidden />'` and `VIS = '<p><input id="vis" type="file" /></p>'`. A `{css}` locator
   is matched in `searchCss` (`extension/src/content/locate.ts:265`). That calls `walkElements` with no `hides`, so the
   default `hidesSubtree` applies (`extension/src/content/a11y.ts:181`), and `hidesSubtree` returns true on the `hidden`
   attribute (`a11y.ts:73`). So `#in` is pruned and gets LOCATOR_NOT_FOUND, while `#vis` is reachable. The page
   reporter's `files` is a live sum over every `input[type=file]` (`s12-chooser.js:22`), so it counts `#vis`. liveC19
   already uses this fix (`recipes/s12-r19-c.ts:387`, leg b uses `{ css: "#vis" }`), and decision #370
   (`docs/decisions.md:200`, the last bullet) orders this exact fix at `s12-r19-de.ts:81`.
2. **The other locators reach their elements, and the discrimination holds.** R19-ARGS-OLD uses no locator (it opens
   `s12=none` and makes only `evaluate*` calls). In R19-VERSION, `IN` is the only locator, and the sdk, mcp, raw and
   control legs all use it. The sheet row (`docs/e2e-test-plan.md:1846`) says "the **file input itself** as the target (so
   an old extension that ignored `chooser` would upload into it)". `#vis` is `<input type="file">`, not hidden, with no
   opener, so an extension that ignored `chooser` would set files on it and the reporter would read `files=1`. That gives
   `judgeVersionLeg` FAIL, which is the discrimination the row wants. The control leg (`tc.upload(IN, f)`, no `chooser`)
   can now reach `files=1`. With `#in` it got LOCATOR_NOT_FOUND on every build, so the control leg failed whatever the
   build did.
3. **No want, judge, order or STOP changed.** `git diff HEAD` on `recipes/s12-r19-de.ts` is one line, line 81, which
   changes only `"#in"` to `"#vis"`. No tracked test file changed (`git diff HEAD --stat` lists only the driver and the
   ledger). The suite went from 234 to 235 files and from 5590 to 5592 tests, and the +1 file and +2 tests are the new
   file. Nothing was dropped or weakened.
4. **The new test is red without the fix.** I ran four mutants on `recipes/test/s12-r19-de-target.test.ts`:
   - Line 81 set back to `#in`: test (a) is red, `1 failed | 1 passed (2)`.
   - Line 81 set to `#open`: test (a) is red.
   - Line 81 set to `input[type=file]`: test (a) is red.
   - The fixture's `#vis` given `hidden`: test (b) is red.

   All files were restored.
5. **The gates exit 0.**
   - `npm test`, run twice, exit 0 both times. Each run: `Test Files 235 passed (235)`, `Tests 5592 passed (5592)`. Run 2
     ran while `npm run typecheck` and the seven recipe `tsc` runs loaded the machine, and it still passed.
   - `npm run typecheck`: exit 0.
   - `npx tsc --noEmit -p` on each of `recipes/tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11` and `.s11b`: all exit 0.

## 3. Findings
- **MINOR (cannot be identified): the fixer's one `npm test` failure.** The fixer's report (§6) says one of its runs had
  `1 failed | 5591 passed` and it did not capture which test failed. I could not reproduce it: two runs passed, one of
  them under extra load. The fixer reported its first run as red (5592 tests with 1 failed, its own red test on the old
  line). It is possible the "unexplained" run also came before the edit, or overlapped it, but that cannot be shown from
  the report. The long PowerShell mutant tests (1-3.6 s each, in the evidence file) remain a plausible timing flake. No
  action is needed for this fix. If a later suite run fails, its runner should keep the unfiltered output.
- **NIT: the fixer's baseline was derived, not measured.** The fixer says so in its Deviations section. My count agrees:
  the only test change is the new untracked file with 2 tests, so HEAD's 5590 tests in 234 files follows.

## 4. Handoff
Accept the fix for commit. The files to commit are `recipes/s12-r19-de.ts` and `recipes/test/s12-r19-de-target.test.ts`,
plus the fixer and verifier reports and this evidence file as the step agent decides. The ledger
(`S7-live.ledger.md`) is the step agent's to commit. The tree is as I found it: the same four `git status` entries, and
`recipes/s12-r19-de.ts` and `test-fixtures/s12-chooser.js` match their pre-mutant sha256.
