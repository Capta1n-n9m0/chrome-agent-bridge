# Step 11 S3 — fixer report: the verifier's MINOR 1, NIT 2, NIT 3

Model: Opus 5.5 (`claude-opus-5-5`). Date 2026-10-25. Role: fixer (agent-rules §6), risk standard. Base: `01f60b2`
(S3's code at `7e12707`). Findings: `S3-verifier.md` MINOR 1, NIT 2, NIT 3. MINOR 2 (S5's rows) and NITs 1, 4, 5
are not mine and are untouched.

## 1. Verdict

**DONE.**

## 2. Outputs

Files (all in lane): `extension/src/handlers/upload.ts`, `extension/src/upload-files.ts`,
`extension/test/s3-upload-handler.test.ts`, new `extension/test/s3-closure-free.test.ts`. The verifier's report
`S3-verifier.md` goes in the same commit, unchanged.

**MINOR 1 — the sweep is scoped to the marked document.** Test first: three new handler tests were red on S3's code
(`Tests 3 failed | 21 passed (24)`: the sweep target was `{ tabId: 5 }`, and `uploadSweepTarget is not a function`).
The fix:
- `upload-files.ts`: `uploadSweepTarget(tabId, documentId)` (pure) → `{ tabId, documentIds: [id] }`, or `null` for
  no id. The two page functions move here as `UPLOAD_MARK_PAGE_FN` / `UPLOAD_UNMARK_PAGE_FN` so NIT 3's test can
  reach them.
- `handlers/upload.ts`: the mark call runs `chrome.scripting.executeScript` itself (the same target, world, args
  coercion, error code and text as `callInPage`) and keeps the `documentId` of its `InjectionResult` (Chrome ≥ 106;
  the manifest's minimum is 116) before the result is judged. The failure sweep targets only that document. A tab
  that navigated since is not scripted, because Chrome refuses a document it no longer shows, and that error is
  swallowed as before.
- Behaviour change, recorded: if the mark call's `executeScript` itself rejects, no document id is known and **no
  sweep runs**. Before, the sweep then ran on the tab. A rejected injection ran nothing in the page, so no mark
  can be left behind.
- The handler stub now acts as Chrome does: it answers with `documentId` and refuses a `documentIds` target naming
  another document. New tests: the sweep's target is `{tabId: 5, documentIds: ["DOC-1"]}`; a navigation during the
  session (DOC-1 → DOC-2) leaves no `page:unmark` in the log; the pure unit's cases.

**NIT 2.** The test at `s3-upload-handler.test.ts:277` is renamed "a CDP error (Page.createIsolatedWorld fails)".
I also added the handler-level row the verifier offered: `DOM.setFileInputFiles` fails → `DEBUGGER_ATTACH
[chrome.debugger] Not allowed`, then `Runtime.releaseObject`, detach, sweep, and no mark left. It passed on S3's code
and is coverage, not a red test.

**NIT 3 — closure-free guard** (`s3-closure-free.test.ts`, 4 tests). Each shipped source (the finder, the mark and
unmark page functions) is type-checked alone, with only the ES2022 and DOM libraries, through the TypeScript API.
A name with no declaration fails, and the set of names taken from the libraries must equal a fixed list: finder
`["String","document"]`, mark/unmark `["window"]`. Two places are checked: the sources as vitest loads them, and the
sources in an in-memory esbuild bundle with `build.mjs`'s options (bundle, target chrome116; format iife so it can
be evaluated, which leaves the function bodies unchanged). A self-test pins the check against a `__name` injection,
a module constant and an off-list global. A `keepNames` bundle must show `__name`.
Mutants, each applied to the real code, run, and restored (restore checked with `cmp`):

| Mutant | Result |
|---|---|
| M1 the finder reads a module constant `FINDER_ATTR` | 3 red (`unresolved: ['FINDER_ATTR']`) |
| M2 the unmark function references the import `UPLOAD_WORLD_NAME` | 2 red |
| M3 the bundle helper builds with `keepNames: true` | 1 red (the as-shipped bundle test) |

`grep -c __name extension/dist/sw.js` → `0` after the build.

**Gate** (main tree, S4's work present):
- `npx tsc --noEmit -p extension/tsconfig.json` → exit 0
- `npx vitest run extension`: before `Test Files 67 passed (67)`, `Tests 1933 passed (1933)`; after
  `Test Files 68 passed (68)`, `Tests 1941 passed (1941)` (+8: 4 handler, 4 closure-free; none removed)
- `npm run typecheck` → exit 0
- `npm test` → `Test Files 144 passed (144)`, `Tests 3593 passed (3593)`. I did not run the full suite before the
  fix. The before count, 3585, is 3593 − 8, derived and not measured.
- `npm run build` → exit 0, `built extension → dist/`. After the build, `git status --short` shows only my four
  files, the untracked reports, and `journal.md` (the step agent's file, not mine).

## 3. Verifier verdict

Not mine to give. A fresh verifier re-checks MINOR 1, NIT 2 and NIT 3.

## 4. Deviations

None from the brief. `inject.ts` is out of lane, so the mark call copies `callInPage`'s three lines in the handler
and does not add a `documentId` return to `callInPage`.

## 5. Proposed decisions

### 2026-10-25 · The upload's failure sweep scripts only the document it marked
**Decided:** the sweep targets `{tabId, documentIds:[the mark call's documentId]}`. With no id (the mark injection
was rejected), no sweep runs. **Why:** a tab that navigated between the mark and the failure may now show a page the
gate would refuse. The sweep does not pass the gate, so it must not reach that page. A rejected injection set no
mark. **Instead of:** sweeping the tab (S3 as built). **Revisit if:** Chrome answers a bfcache-restored document
under its old `documentId`, which would let the sweep reach it. That is harmless (the same document that was marked)
but unmeasured. **By:** Claude (proposed; with S3's "the sweep does not pass the gate", for user review)

## 6. Findings

No new runtime fact; nothing was measured live. S5 could add a RECORD row for MINOR 2 (a): a navigation during an
upload, with the old document's mark judged after a back navigation.

## 7. Handoff

No process left running. Scratch copy of `upload-files.ts` (for mutant restores):
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\upload-files.orig.ts`.
