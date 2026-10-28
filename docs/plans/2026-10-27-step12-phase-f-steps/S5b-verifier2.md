# S5b verifier 2: re-check after fix round 1 (F1–F4)

Verifier, Opus, medium effort. I checked only the items the fixer changed (`S5b-fixer.md`), against `S5b-verifier.md`
and the spec note `8eab22c`. Then I ran § Every stage on a clean tree. I did not audit or touch the S6-G2 work.
Command output is in `S5b-verifier2-evidence.txt`, next to this file.

## 1. Verdict

**PASS-with-notes.** F1–F4 are closed, and nothing regressed. The only notes are the two the first verifier already
left open for the gate: the F3 feature-flag decision and F5, the cut keeping the oldest lines.

## 2. Outputs

**F1 (closed).** The new test `s12-console-cap.test.ts:37-41` builds a joined text of exactly 20 000 characters, which
is kept whole, and one of 20 001 characters, which is cut. I ran each mutant of `MAX_TEXT_CHARS` alone and restored
the file afterwards (`cmp` identical). Each one turns the new test red:

| Mutant | Result |
|---|---|
| 19 000 | 1 failed / 4 |
| 20 308 | 1 failed / 4 |
| 19 999 | 1 failed / 4 |
| 20 001 | 1 failed / 4 |
| Unmutated | 4 passed |

`toHaveLength(20_000)` asserts the fixture's own arithmetic, so the comment's sum does not have to be trusted.

**F2 (closed).**
- The property now reads "(a button or link; a file input works too)". The spec note `8eab22c` line 28 allows "a
  button, a link, a label, or the file input itself", and the new text agrees with it. It leaves out "label", which is
  harmless.
- `S5B_CHOOSER_PROPERTY` (`s2-focus-first.test.ts:252-256`) matches the code string character for character.
- Reverting the code string alone turns S2.3 red (1 failed / 50).
- The S2.3 test still gives special treatment to only `browser_upload_file` and `browser_console_messages` (written
  out) and `browser_evaluate` (the props delta). Every other tool is compared against the fixture with `toEqual`. The
  fixture file is untouched.
- The tool sentence at `registry.ts:613` ("may instead be the button or link") offers an option and bans nothing.
- The built `mcp/dist/index.js` carries the new text, with no occurrence of the old phrase.

**F3 (closed as a doc fix).** The new sentence says an older extension ignores `chooser` and answers as for a file
input. That is true at `2099c08^`:
- `isUploadFilesParams` says "Other keys … are not checked here".
- `checkUploadParams` reads only `ref`, `locator` and `paths`.
- A button target gets `UPLOAD_TARGET_REQUIRED_MESSAGE` or the input-path refusals, and both name a file input.

The daemon feature flag is still an open proposal, and it is the session agent's to rule (fixer §5).

**F4 (closed).** "(built, not yet run live; Run 19 checks it)" now qualifies the sentence about the one-call flow.
The paragraph's other sentences are as the first verifier checked them against S5a's code. The two new clauses are
plain and short.

**§ Every stage, on a clean tree.** I used a scratch worktree at `7e26dab` and ran `npm ci` (exit 0), with no
junction into the main tree. Then I copied in exactly S5b's 10 files.

| Check | Result |
|---|---|
| `npm test`, bare HEAD | 5075 tests (9 failed), 214 files |
| `npm test`, with S5b | **5087** tests (9 failed), 217 files: +12, the builder's 11 plus the fixer's 1. None removed. |
| The 9 failures | The same list at bare HEAD and with S5b (`diff` empty). All are in `recipes/test/s11-r16-runner.test.ts`, the worktree's CRLF artifact. |
| `npm run typecheck` | exit 0 |
| Seven `recipes/tsconfig*.json` | exit 0 each |
| `npm run build` | exit 0. `git status` afterwards shows only S5b's 7 modified and 3 new files. |
| Log sites | +0: no `console.`, `log(` or `logger` in the added sdk/mcp lines. The allowlist has 54 entries. |
| Size | Code 62 of 150. Tests 231 of 225 (1.03×, test-only, within the 1.5× allowance). Docs +30/−5, not counted. |

## 3. Verifier verdict

Not applicable (this is the verifier's report).

## 4. Deviations

- `git worktree remove` stopped at "Directory not empty", after the worktree's registration was already gone.
  - Three `node_modules/@bridge` junctions were left. All three pointed inside the worktree.
  - I removed them with `cmd /c rmdir`, as the root `CLAUDE.md` requires, then deleted the folder.
  - `git worktree list` now shows only the main tree. The main tree's `node_modules/.bin` still has 42 entries.
- During my run the main tree's HEAD moved from `7e26dab` to `397a13d`, through the S6-G2 commits `e467f48`, `ae123de`
  and `397a13d`.
  - None of those commits touches `sdk/`, `mcp/` or `docs/setup.md`.
  - The clean-tree run was at `7e26dab`, as briefed. S5b together with S6-G2's daemon code was not run as one tree.
    The fixer's main-tree `npm run typecheck` (exit 0) ran with the S6-G2 code present.

## 5. Proposed decisions

None new. The fixer's two proposals stand for the session agent: the property text, for user review, and the old
extension handling (documented now, flag to be ruled).

## 6. Findings

None new. F1–F4 are closed. F5 (NIT, the cut keeps the oldest lines) stays for the user at the gate, unchanged.

## 7. Handoff

- Nothing is running, and port 9234 is free.
- The scratch worktree is removed.
- In the main tree I changed only this report and its evidence file.
- Not committed.
- For the committer: S5b's 10 files and its reports. Commit them on top of `397a13d`.
