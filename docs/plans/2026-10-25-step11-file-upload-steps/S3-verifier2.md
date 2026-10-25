# Step 11 S3 — verifier report, fix round 1 re-check

Model: Opus 5.5 (`claude-opus-5-5`). Date 2026-10-25. Role: verifier (agent-rules §6), risk standard. Commit checked:
`d4718ca` (the fixer's commit; its git parent is `01f60b2`, with `9835027` and `01f60b2` (S4 docs, S4b) between it
and S3's `7e12707`). Scope: S3-verifier.md MINOR 1, NIT 2, NIT 3, the copied `callInPage` code, the every-stage
checks, S3.2, the lane. Commit: none (brief).

## 1. Verdict

**PASS-with-notes.** MINOR 1, NIT 2 and NIT 3 are closed. The every-stage checks pass and S3.2 still holds. Two new
NITs (A, B) and one observation remain. None blocks the stage.

## 2. Outputs and checks

Two `git archive` copies (`d4718ca`, `7e12707`) under `%TEMP%\s3v2`, each with its own `npm ci` and a local git for
`status`. Workspace links in `node_modules/@bridge` pointed inside each copy. Both copies are deleted, and the main
tree was not touched.

| Check | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` (d4718ca) | exit 0 |
| tests after | `npm test` (d4718ca) | `Test Files 144 passed (144)`, `Tests 3593 passed (3593)` |
| tests before | `npm test` (7e12707) | `Test Files 143 passed (143)`, `Tests 3583 passed (3583)` |
| delta by package | `npx vitest run extension\|sdk\|mcp` in both | extension 1933 → 1941 (+8, the fixer); sdk 488 → 489, mcp 321 → 322 (+2, S4b's `01f60b2`, which touches no extension file). +10 = 8 + 2, and no test is removed |
| build | `npm run build` | exit 0, `built extension → dist/` |
| tree after build | `git status --short` | empty |
| shipped finder | `grep -c __name extension/dist/sw.js` | `0` |
| lane | `git show --stat d4718ca` | `handlers/upload.ts`, `upload-files.ts`, `test/s3-closure-free.test.ts`, `test/s3-upload-handler.test.ts`, `S3-fixer.md`, `S3-verifier.md` (all in lane). `git diff 7e12707 d4718ca --stat -- extension/src/content extension/src/log-allowlist.ts extension/test/log-scan.test.ts` is empty. The other files in `7e12707..d4718ca` come from `9835027`/`01f60b2`, not from the fixer |
| logging | grep `console.`/`log(` in the two changed source files | none |

**The new tests fail on 7e12707.** I copied d4718ca's two test files into the 7e12707 copy and ran
`npx vitest run …s3-upload-handler… …s3-closure-free…`. Result: `Tests 5 failed | 23 passed (28)`. Red: the sweep
target (`expected { tabId: 5 } to deeply equal { tabId: 5, documentIds: [ 'DOC-1' ] }`), the navigation test (same
message), `uploadSweepTarget is not a function`, and both closure-free placements (`mark: expected { unresolved: [],
globals: [] }`, because the exports do not exist yet). The setFileInputFiles row and the self-test pass on both
commits, as the fixer reported (coverage).

**My mutants.** Each was applied to the d4718ca copy. I ran the handler, closure-free and target test files, then
restored the copy (`git status` clean).

| Mutant | Result |
|---|---|
| W1: the sweep targets `{tabId}`, not the document | 2 red (the target test and the navigation test) |
| W2: the sweep never runs | 8 red: both CDP errors, the target and navigation tests, timeout, disarm mid-session, disarm at the effect, attach failure |
| W3: `onDocument` called after `unwrapResult` | **0 red**, an equivalent mutant (see Observation) |
| W4: no id falls back to `{tabId}` | 1 red (the `uploadSweepTarget` unit) |
| W5: the mark page function reads a module constant | 2 red (both closure-free placements) |
| W6: `extension/build.mjs` gets `keepNames: true` | **0 red**; that build ships `__name(visit, "visit")` in `dist/sw.js` (NIT A) |

## 3. The findings re-checked

**MINOR 1: closed.** `handlers/upload.ts` `markInPage` keeps the mark injection's `documentId` before the result is
judged. `sweepUploadMark` targets `uploadSweepTarget(tabId, id)` = `{tabId, documentIds:[id]}`, and does nothing when
no id is known. `@types/chrome` has `documentIds` on the injection target and `documentId` on `InjectionResult`. The
manifest's `minimum_chrome_version` is `116`, so Chrome supports both (≥ 106).
- **Every failure path still sweeps when the document is unchanged.** W2 is red on all 8 paths that set a mark and
  then fail, and each of them asserts `marks() === 0`. "Not found" needs no sweep, because the page removed the input.
- **"No sweep when the mark injection was rejected" cannot leave a mark in a live document.** `markUploadTarget`
  (`content/upload-target.ts:109-119`) throws every refusal before `setAttribute`, and `setAttribute` is its last
  statement before `return {ok:true}`. If `executeScript` rejects, either nothing ran (restricted URL, tab gone) or the
  frame went away while the call was in flight. In that case the marked document is gone or in the back/forward
  cache, which is the same as S3-verifier NIT 1, and the next `markUpload` sweeps any stray mark. Before the fix, the
  tab-level sweep could not reach that document either, so this is no regression.
- Not measured: whether Chrome refuses a `documentIds` target naming a document it no longer shows (the stub assumes
  it does). This belongs with S3-verifier MINOR 2 (a) as an S5 RECORD row.

**NIT 2: closed.** `s3-upload-handler.test.ts:288` is renamed "a CDP error (Page.createIsolatedWorld fails)". The new
row at `:296` fails `DOM.setFileInputFiles` and asserts the wire error `DEBUGGER_ATTACH [chrome.debugger] Not
allowed`, the tail `DOM.setFileInputFiles → Runtime.releaseObject → detach → page:unmark`, and `marks() === 0`. W2
turns it red.

**NIT 3: closed for the code, with a gap in the build config (NIT A).** `s3-closure-free.test.ts` covers exactly the
upload's page-run code: the finder (`Runtime.evaluate`, through `uploadFinderExpression`) and the mark and unmark
functions (`executeScript func`). `ensureContent` uses `files`, so it needs no check. The fixed lists (`finder:
String, document`, `mark/unmark: window`) are exact. The check discriminates: its self-test, the fixer's M1–M3, and
my W5 all turn it red.

## 4. Findings

**NIT A — the "as shipped" bundle check copies `build.mjs`'s options rather than reading them.**
`extension/test/s3-closure-free.test.ts:77-87` hard-codes `bundle: true, target: "chrome116"`. With W6
(`keepNames: true` added to `build.mjs`'s `common`), all 44 tests stay green, yet
`node build.mjs; grep -o '__name(visit[^;]*' dist/sw.js` prints `__name(visit, "visit")` twice. The fixer's report
says the bundle uses "build.mjs's options", but it uses a copy of them. Suggested fix (S6 or a later stage): read the
options from `build.mjs`, or add a line to `extension/CLAUDE.md` saying `keepNames` must never enter the build. This
residue is smaller than the NIT it replaces.

**NIT B — the copied `callInPage` code differs only on a rejection that is not an `Error`.**
`handlers/upload.ts:73-78` vs `inject.ts:79-96`. For an `Error` (Chrome's rejections are `Error`s), the code
(`classifyInjectError` on the same message) and the text (identical template, identical `(${raw})`) match. For a
thrown string, the copy prints the string where `callInPage` prints `undefined`. For a plain `{message}` object, the
copy classifies and prints `[object Object]` where `callInPage` uses `.message`. Neither case is reachable from Chrome
as far as I know. Nothing is logged, and the raw Chrome text in the message is the same as on every other handler's
path. No fix needed. Exporting a `callInPage` variant that returns the `InjectionResult` would remove the copy, but
`inject.ts` is outside the fixer's lane.

**Observation: W3 is an equivalent mutant.** Passing the document id before `unwrapResult` makes no difference today,
because no content refusal follows the mark. It is defensive ordering. It becomes load-bearing only if
`markUploadTarget` ever refuses after `setAttribute`.

## 5. Deviations

The brief gives d4718ca's parent as 7e12707, but it is 01f60b2. I took the before count and the red proof at
7e12707, as the brief asked, and split the +10 by package so the fixer's +8 stands apart from S4b's +2.

## 6. Proposed decisions

None. The fixer's decision ("the upload's failure sweep scripts only the document it marked") holds, as far as the
tests and the code reading above go. Its "Revisit if" (bfcache) and the unmeasured Chrome refusal of a stale
`documentIds` both belong in S5's RECORD row with S3-verifier MINOR 2 (a).

## 7. Handoff

No process left running. The scratch copies `%TEMP%\s3v2` are deleted (ordinary delete; their `@bridge` links
pointed inside the copy). My mutant script is in the session scratchpad and does not touch the repo.
