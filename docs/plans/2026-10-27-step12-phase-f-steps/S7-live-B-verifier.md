# S7-live liveB19 fix round 1: verifier report

Model Opus 5.5, effort medium. Role: verifier (`docs/agent-rules.md` §6). I read and ran things and edited nothing; the
mutants were temporary and were restored byte for byte. Evidence: `S7-live-B-verifier-evidence.txt` (beside this file).
Claim audited: `git diff HEAD -- recipes/` at HEAD `0f4392d`, which changes `recipes/s12-r19-b.ts` (1 line) and
`recipes/test/s12-r19-b.test.ts` (+12 lines). I did not read the scratch worktree `wtv`.

## 1. Verdict

**PASS-with-notes.** The diagnosis holds up against the code, the fix is right and touches nothing else, the counts
agree, and every typecheck exits 0. There is one MINOR: the new test lets through three selectors that can never match.
There is one NIT.

## 2. Outputs

- `npm test` on the tree: `Test Files 233 passed (233)`, `Tests 5577 passed (5577)`. Before the fix: 5576, re-derived.
  I ran HEAD's version of the test file as a temp copy beside the tree's version: `s12-r19-b.test.ts (64 tests)` vs
  `zz-head-s12-r19-b.test.ts (63 tests)`, so the +1 is the new `it`. 5576 → 5577, and the copy was deleted.
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p` on each of the seven recipes tsconfigs (`tsconfig.json`, `.fe`, `.s6`,
  `.s9`, `.s10`, `.s11`, `.s11b`): exit 0, all 7.
- Mutants: 8 of 11 killed, 3 survived (§6, F1).
- `git diff --stat HEAD -- recipes/ test-fixtures/` after the restore: `s12-r19-b.ts | 2 +-`,
  `s12-r19-b.test.ts | 12 +++`, the same as the fixer's diff. Both mutated files compare equal (`cmp`) to their backups.

## 3. Verifier verdict

This file.

## 4. Deviations

- The brief says "a tag present twice if you can construct one by mutating the fixture copy in a temp dir". The test
  reads `test-fixtures/s12-console.html` by its fixed path, so a copy in a temp dir would never be read. I backed up the
  real fixture to the scratchpad, added a second `<h1>`, ran the test and restored it with `cp`. `cmp` confirms equal and
  `git diff` shows no change under `test-fixtures/`.
- Re-deriving the HEAD count needed a temp test file inside `recipes/test/`, which I deleted at once. `git status`
  afterwards matched the start-of-task status.

## 5. Proposed decisions

None.

## 6. Findings

### Check 1: the diagnosis and the fix, from the code

- **`{css:"body"}` can never match, on any page.** `walkElements` begins at `doc.body.children`
  (`extension/src/content/a11y.ts:176`). It calls `visitor.enter` only on those children and their descendants, which
  include open shadow roots and the body children of same-origin frames. `searchCss` tests `el.matches(p.css)` only
  inside `enter` (`extension/src/content/locate.ts:275-284`). So `body`, `html`, `head` and everything in `head` (`title`,
  `meta`) are never candidates. A frame's own `body` is not visited either, only its children. The result is zero matches,
  which the probe saw as `LOCATOR_NOT_FOUND`. The step agent's reading is confirmed.
- **`h1` is unique, visible and non-zero in size on `s12-console.html?s12=con`.**
  - The static file has exactly one `<h1>`, with text `S12 console fixture` (`test-fixtures/s12-console.html:12`).
  - `s12-console.js` creates no element for `s12=con`. Its only DOM writers are `script()` (used by `notea`/`noteaok`)
    and `frame()` (used by `frame`/`frameoop`), and neither branch runs for `con`. Grep for
    `h1|createElement|insertAdjacent|innerHTML` finds only those two helpers (evidence §3).
  - The page has no stylesheet, so `hidesSubtree` (`a11y.ts:71-76`) cannot prune the `h1`, and a text heading has a
    non-zero layout box.
  - The step agent's second probe measured `click-trusted-h1 ok` (ledger, liveB19 diagnosis). I did not re-measure it
    live: verifiers do not drive Chrome.
  - The page has no click listener for `con`, so the click changes nothing the next calls read. `consoleMessages` runs
    before the click, and the screenshot is judged only as non-empty.
- **The target is the helper's choice, not a sheet constant.** The R19-KEEP-1 ★ row (`docs/e2e-test-plan.md:1821`) says
  "a trusted `click`" and names no target. Its answer is `ok`. The diff leaves all of these alone:
  - the judge `() => true`, i.e. "answered without an error" (`s12-r19-b.ts:225`);
  - the 3 000 ms gap (`step`, line 220);
  - the five-call order;
  - `keepseqLine` and its fields (line 230);
  - `keep1Decision` and the STOP `existing-tool-changed` (lines 231-232);
  - the leg lines and `finish` (lines 233-234).

  `git diff --stat` shows that one line changed in the driver.
- The new test has no `skipIf`. It runs in every `npm test`, including on hosts without PowerShell.

### Check 2: other locators in the liveB19 drivers that could never match

None found. Each locator in `recipes/s12-r19-b.ts`, with the page it runs on:

| Line | Locator | Page | Present |
|---|---|---|---|
| 117 (R19-UP-DEVT) | `#up-single` | `s11-upload.html?s11=xwin&s12x=devt` (`recipes/s12-r19.ps1:133`) | `test-fixtures/s11-upload.html:22`, static, not hidden |
| 190, 192 (R19-UP-6) | `#up-single` | `u6` = `s11-upload.html?s11=u6` (`recipes/s11.ts:153`) | yes |
| 206 (R19-F-RAW*) | `#up-single` / `#up-multi` | `raw` = `s11-upload.html?s11=raw` (`recipes/s11.ts:156`) | `s11-upload.html:22,26` |
| 244 (R19-KEEP-2) | `#open` | `s12-chooser.html?s12=single` | `BTN` is inserted for `single` (`test-fixtures/s12-chooser.js:40,47`), a visible `<button>` |

- R19-UP-6's `raw-notarget` leg sends no locator on purpose: its expected code is K-notarget.
- KEEP-3, CON-KEPT, OVERLAP-A, KEEP-4, SWEEP-HELD and DEVPROBE send no locator.
- The functions imported from `s12-r19-a.ts` (`att`, `entriesOf`, `idle`, `run`, `URL`, …) carry none.
- `recipes/s12-r19-b.ps1` has no `css`/`locator` text.
- `s11-upload.js` adds and removes no element (its only "removed" is a mutation-record label, line 118).

### Check 3: re-runs

See §2. The counts agree with the fixer's 5577. The fixer's "before" was taken from the ledger; I re-derived it above.

### Check 4: mutants

Command: `npx vitest run recipes/test/s12-r19-b.test.ts -t "keep1's trusted click target"`. The driver line 225 or the
fixture was mutated, then restored from a scratch backup after each mutant.

| Mutant | Result |
|---|---|
| `body` | killed: `expected [ 'body', 'html', 'head' ] to not include 'body'` |
| `html` | killed (same assertion) |
| `head` | killed (same assertion) |
| `p` (absent from the fixture) | killed: `expected undefined to be 1` |
| `button` (absent from the fixture) | killed: `expected undefined to be 1` |
| `, { trusted: true }` dropped | killed: `expected null not to be null` (the test also pins `trusted`) |
| fixture with a second `<h1>` (count 2) | killed: `expected 2 to be 1` |
| unmutated control | passes: `Tests 1 passed \| 63 skipped (64)` |
| `title` | **survived** |
| `meta` | **survived** |
| `script` | **survived** |

**F1 · MINOR · `recipes/test/s12-r19-b.test.ts:593-594`: the test admits three selectors that can never match live.**

- What it checks: the selector is not in a body/html/head deny-list, and `<sel` appears exactly once anywhere in the
  fixture's text.
- `title` and `meta` sit in `<head>`, which the walk never visits (`a11y.ts:176`), so they would answer
  `LOCATOR_NOT_FOUND` exactly as `body` did.
- `script` is a body child, but `hidesSubtree` prunes it: its computed `display` is `none` (`a11y.ts:75`).
- All three appear exactly once in `s12-console.html`, so the test passes for each of them.
- The test's own title says "never body/html/head (the locator walk starts at body's children)", but it does not encode
  that rule. It encodes three names.
- The current value `h1` is correct, so this does not block the fix. It only limits how far the test guards against a
  repeat.
- Suggested fix (for a later round or S7-record, not needed for att2): count only inside the
  `<body>…</body>` slice of the fixture, and refuse `script`/`style`/`template`. Simpler still, pin the value
  (`expect(sel).toBe("h1")`) and keep the fixture count.

**F2 · NIT · `recipes/test/s12-r19-b.test.ts:589`: the test reads only the first trusted `css` click in the driver.**
`TS.match` without the `g` flag takes the first match. Today there is exactly one such call in the file (line 225), so
this is correct. If a second one were ever added, it would go unchecked.

### Check 5: product code and private data

- `git diff HEAD --name-only` lists nothing outside `docs/` and `recipes/`. No extension, daemon, SDK, MCP or shared
  file is touched.
- The diff adds no `say(`, `console.` or other output line. The new test reads only repo files (the driver source and a
  fixture).

### Not checked

- The live behaviour of `{css:"h1"}` (the step agent measured it, see Check 1).
- Whether `poll-ms=319` against the sheet's `<p≤250>` matters. The ledger records it for S7-record, it is outside this
  diff, and no judge reads it.

## 7. Handoff

- No processes started apart from vitest and tsc, which have exited. Nothing is listening on any port.
- The tree is as the fixer left it: the two recipes files modified, the ledger and the liveB19 att1 files untracked or
  modified as at the start.
- Next: the committer for `recipes/s12-r19-b.ts` and `recipes/test/s12-r19-b.test.ts`, with verdict PASS-with-notes;
  F1 is carried as a MINOR. Then liveB19 attempt 2. Fix rounds used: 1 of 3.
