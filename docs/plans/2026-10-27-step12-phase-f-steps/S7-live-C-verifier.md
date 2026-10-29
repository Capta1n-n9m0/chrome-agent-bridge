# S7-live liveC19 verifier, fix round 1

Model: Claude Opus 5.5, effort medium. Role: verifier (agent-rules §6). Read and ran only; no edit, no commit. Nothing run
against Chrome, the daemon or port 9234; `wtv` not read. Mutants were run in the main tree with backups and restored;
`md5sum -c` on both mutated files read `OK` after the last mutant, and `git status --short` at the end is the four entries
found at the start (ledger `M`, `recipes/s12-r19-c.ts` `M`, fixer report `??`, `recipes/test/s12-r19-c-legb.test.ts` `??`).

## 1. Verdict

**PASS-with-notes** (no CRITICAL, no MAJOR; two NITs below).

## 2. What was checked

The change, from `git diff HEAD -- recipes/`: a single line, `recipes/s12-r19-c.ts:387`, where only the locator token
changes, `{ css: "#in" }` → `{ css: "#vis" }`. `git diff HEAD --stat` shows the ledger (another agent's edit, ignored) and
`recipes/s12-r19-c.ts | 2 +-`, plus the new untracked test file. No existing test file was modified.

### (1) `#vis` is a visible file input on c1, and a locator reaches it: confirmed

- `test-fixtures/s12-chooser.js`: `VIS = '<p><input id="vis" type="file" /></p>'`, `HID = '<input id="in" type="file" hidden />'`,
  `c1: BTN + HID + VIS`, appended to `body` by `insertAdjacentHTML`. `#vis` has no `hidden`, no style and no ancestor except
  `<p>` under `body`.
- `extension/src/content/a11y.ts:71-76` `hidesSubtree` prunes `hidden`, `inert`, `aria-hidden="true"`, `display:none`,
  `visibility:hidden` and `opacity:0`; `walkElements` (`:175-177`) starts at `body`'s children, so `body` itself is never
  visited (the #368 class). `extension/src/content/locate.ts:265-286` `searchCss` matches only elements the walk enters,
  and skips zero-size ones. `#in` is pruned at `hidesSubtree` (it carries `hidden`), so `{css:"#in"}` is LOCATOR_NOT_FOUND
  on any build. `#vis` is entered (`p` → `input`), a file input has a non-zero box, and it is the only `#vis`, so it is one
  match without `nth`. The diagnosis holds.
- The sheet (`docs/e2e-test-plan.md:1842`) says only "(b) the same with the file input itself as the target and
  `chooser: true`", with no element named. On c1, `#vis` is the only file input a locator or ref can reach (a hidden input is
  in neither the snapshot nor the locate walk: `extension/src/content/CLAUDE.md`, the upload bullet). So the target is the
  driver's choice, as in the #368 precedent (`docs/decisions.md:225-230`, `{css:"body"}` → `h1`).

### (2) The chooser path on `#vis`, and the want `files=1 change=1`: confirmed from code

- `extension/src/handlers/upload.ts:164-186` `chooserUpload` resolves `ref | locator`, then marks the resolved element
  itself with `CHOOSER_MARK_PAGE_FN` and applies no file-input rule ("the input is known from the event"). `upload-target.ts`
  `uploadInputOf` is not on this path.
- `extension/src/upload-files.ts:414-472` `setFilesByChooser` runs `Page.enable`, turns interception on, and evaluates
  `chooserClickExpression(mark)` in an isolated world with `userGesture: true`. `chooserClickFn` (`:259-310`) finds the one
  marked element and calls `el.click()`. On an enabled `<input type=file>` under a user gesture, that opens the chooser,
  which the interception turns into `Page.fileChooserOpened` with `#vis`'s `backendNodeId`. The input rules then pass:
  one path, so no `selectMultiple` is needed; `describeNode` shows neither `webkitdirectory` nor `disabled`.
  `DOM.setFileInputFiles` sets one file on `#vis`.
- R19-CHOOSE-LABEL's `input` leg (`{css:"#in2"}`, `recipes/s12-r19-c.ts:172`) already uses this same mechanism, a file input
  as the chooser target.
- The c1 reporter: `files` is summed over every `input[type=file]` (`s12-chooser.js` `allInputs`). `#in` holds 0 files and
  `#vis` 1, so `files=1`. `change` counts change events of any file input (the capture listener on `document`), so
  `change=1`. `__s12ch.clicks` counts only `#open`/`#lab`, and leg b does not judge clicks (`mcpLeg`, `:375-382`).
- `judgeMcpOk` (`:89-92`) matches `^Uploaded 1 file\(s\) to .+:\n<name> · <bytes> bytes · sha256 <hex>$`. The target's
  description sits inside `.+`, so the judge does not depend on the locator. `forbidden` is `[ROOT(), s.sentinel]`, and
  neither one is `#vis`.

### (3) Nothing else in the leg changed: confirmed

The diff line keeps `mcpLeg(m, R, "b", CH("c1"), …, paths: [f], chooser: true }, ok, { files: 1, change: 1 }, \`${R}-dlg2\`)`
byte for byte except the locator.

### (4) No test deleted, skipped or weakened: confirmed

- `git diff HEAD --stat` touches no test file. The new file adds 1 file and 2 tests.
- `npm test`: 234 files / 5590 passed. The baseline, 233 files / 5588 tests, is derived from the diff, not run.

### (5) Other locators in liveC19's drivers: none unmatched

Checked from code against the fixtures:

| Locator | Page | Reachable? |
|---|---|---|
| `BTN` `{role:"button",name:"Open chooser"}` | c1, none, picker, single, dir, dis, late49/51, human | Yes: a visible `<button>` under `body` |
| `{css:"#lab"}`, `{css:"#in2"}` | `s12=label` | Yes: visible, no `hidden` |
| `FB` `{role:"button",name:"Open frame chooser"}` | `s12-chooser-frame.html` in a same-origin iframe | Yes: the walk enters same-origin frames. The driver also falls back to a snapshot ref (`:242-245`) |
| `{css:"#up-single"}` | `s11-upload.html?s11=s12c` | Yes: a visible input (`s11-upload.html:22`) |
| `{css:"#s12-btn"}`, `{css:"#tb"}` | `e2e-playground.html?s12=g2a` | Yes: in a `<section>` appended to `body` (`e2e-playground.html:263-269`), no hiding attribute |

The `-b` helpers that driver C imports (`code`, `ev`, `fileOf`, `findTab`, `overlapRun`, `ROOT`, `state`, `timeline`) use
no locator. `findTab` matches by URL marker and claims.

## 3. Commands and results

| Command | Result |
|---|---|
| `npx vitest run recipes/test/s12-r19-c-legb.test.ts recipes/test/s12-r19-c.test.ts` | `Test Files 2 passed (2)`, `Tests 55 passed (55)` |
| `npm test` | `Test Files 234 passed (234)`, `Tests 5590 passed (5590)`, exit 0 |
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |

On the typecheck: `tsconfig.s11b.json` includes `s12-r19-c.ts`, and `tsconfig.s6.json`'s `test/*.test.ts` glob covers the new
test file.

### The new test is red on HEAD's line 387

The `#vis` → `#in` revert was confirmed equal to HEAD (`git diff --quiet HEAD -- recipes/s12-r19-c.ts` succeeded). Running
the new file then gave `Tests 1 failed | 1 passed (2)`. The fixture test stays green, as it should, because the fixture
did not change. The old file alone on HEAD's line gave `Tests 53 passed (53)`, so before the fix nothing pinned leg b's
target.

### Mutants (each restored by copy from a backup)

| # | Mutant | New test file |
|---|---|---|
| M0 | leg b back to `{ css: "#in" }` (HEAD) | killed (1 failed) |
| M1 | leg b `{ css: "#open" }` | killed |
| M2 | leg b `{ css: "#vis", nth: 1 }` | killed |
| M3 | `#vis` moved to leg a, `BTN` on leg b | killed |
| M4 | fixture `VIS` gains `hidden` | killed |
| M5 | fixture `HID` loses `hidden` | killed |
| M6 | `c1: BTN + HID` (no `VIS`) | killed |
| M8 | leg b want `change: 0` | survived (both files, 55 passed) |
| M9 | leg b `chooser: true` dropped | survived (both files, 55 passed) |

That is 7 killed and 2 survived. The survivors concern parts of line 387 that the fix did not touch and that were unpinned
on HEAD too (see N1).

## 4. Findings

**N1 · NIT · `recipes/test/s12-r19-c-legb.test.ts:14-19`**
- **What:** the new test pins only leg b's locator. Leg b's want (`files: 1, change: 1`) and its `chooser: true` are not
  pinned by any test.
- **Evidence:** M8 and M9 above, `Tests 55 passed (55)` over both files. The same gap existed on HEAD (M0', 53 passed).
- **Suggested fix (optional):** also assert `chooser: true` and `{ files: 1, change: 1 }` on the leg-b line, or cover all
  three MCP legs in the anchored table of `s12-r19-c.test.ts`. This is not needed for this round, because the fix kept
  those tokens unchanged.

**N2 · NIT · `recipes/s12-r19-c.ts:387` against `docs/e2e-test-plan.md:1842`**
- **What:** "the file input itself" could be read as the input that leg a's button opens (`#in`). `#vis` is a different
  input on the same page.
- **Why it is only a note:** `#in` cannot be reached by any locator or ref (hidden), and the want counts files over every
  input, so `#vis` satisfies the row as written.
- **Suggested fix:** the step agent records the target choice in the stage report (the #368 pattern: the sheet names no
  element, so the driver chooses; the want is unchanged). No code change.

## 5. Side opinion (NOT a finding on this change): R19-CHOOSE-REFUSE leg `dis`

On `s12=dis`, the bridge clicks `#open` (`BTN`). The page handler then calls `input.click()` on
`<input id="in" type="file" disabled />` (`s12-chooser.js`, the last line of the IIFE).

- **The HTML spec:** `click()`'s first step returns when the element is a disabled form control. It was added to WHATWG
  HTML in 2014 (r8421, "Make sure .click() doesn't fire on disabled form controls"). That rule covers `click()` only, not a
  `dispatchEvent`.
- **What follows for the bridge:** a disabled file input's `click()` produces no activation and opens no chooser, so no
  `Page.fileChooserOpened` arrives. The bridge's own click lands on the enabled button and reaches the input only through
  that `input.click()`. Nothing in `chooserClickFn` touches `#in`.

**Expected outcome:** I expect the `dis` leg to answer `TIMEOUT` with `CHOOSER_TIMEOUT_MESSAGE` about 5 s after the click,
not `BAD_PARAMS "the file input is disabled"`. Against the pre-registered want (`WANT.refuse`, `answer: "BAD_PARAMS"`,
`exact: true`), that would be a FAIL. `files=0 change=0 clicks=1` would still hold.

**When the `disabled` refusal is reachable:** the post-event refusal (`upload-files.ts:457`) fires only when a chooser
opens for an input that `describeNode` then reports as `disabled`. Examples are a page that enables the input, calls
`click()` and disables it again before the event is read, or a chooser that CDP opens for an input disabled meanwhile. A
plain `disabled` fixture never gets there; it is covered only by unit tests with a fed event (`S5a-verifier.md:46`).

**Not measured; this is from the spec and the code.** If the step agent wants the leg to be discriminating, its expected
text has to change before the run (never after), or the fixture has to make the event reachable. Either is a sheet or
fixture decision for the step agent, not the fixer's lane.

Sources: [WHATWG commit r8421](https://lists.whatwg.org/pipermail/commit-watchers-whatwg.org/2014/023038.html);
[whatwg list, click() on disabled controls (2015)](https://lists.w3.org/Archives/Public/public-whatwg-archive/2015May/0008.html);
[WebKit bug 215461](https://bugs.webkit.org/show_bug.cgi?id=215461).

## 6. Handoff

No processes left running. The scratch backups are in the session scratchpad. The tree is as found.
