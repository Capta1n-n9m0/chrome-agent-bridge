# S5-fixtures fixer report

Model: Claude Sonnet 5.5, effort medium. UTC 2026-10-25T20:24:32Z to 2026-10-25T20:26:14Z. Role: fixer (`docs/agent-rules.md` §6).

- MINOR-1: `recipes/test/s11-fixtures.test.ts` UP-TWICE test (~:222) now swaps in a stub `FileReader` whose first read finishes 80 ms after the second, so the `gen` guard (`test-fixtures/s11-upload.js:93`) is exercised; restores the real reader in `finally`. Mutation (guard replaced by a comment): 1 failed; restored.
- MINOR-2: the UP-4 frame test now fires `load` on the iframe, asserts `inputs["up-frame-input"]` exists, sets and removes the mark in the frame, and expects `added:up-frame-input`, `removed:up-frame-input` and `final` 0. Mutation (`wireFrame();` removed, `s11-upload.js:248`): 1 failed; restored.
- MINOR-3: `s11-upload.js:246` attaches the reporter to `#up-text` via `attachInput` (a record with files 0, names [], its own changeEvents/inputEvents). Other fields unchanged; `totals` gain only what `#up-text` itself fires. New test "UP-6B: the text input has its own change/input record"; the id-list test now expects `up-text`. Mutation (line removed): 2 failed; restored. Note for S5-helpers: `inputs["up-text"]` now exists.
- NIT-1: stale "s11-rules.ts" comment in the test header replaced. NIT-2: `s11-upload.js:7` no longer names `recipes/s11.ts`.
- NIT-3: left; accepted by the verifier (skipIf without python), no fix in this lane.
- NIT-4 and the port note: not acted on, as instructed.

Mutations were done in place on a backup (`cmp` against the backup after each; tree byte-identical). Exit: typecheck exit 0; `npm test`: "Test Files 146 passed (146)", "Tests 3625 passed (3625)" (3624 + the one new test); build exit 0; git status shows only the pre-existing journal.md change and the slice's untracked files. No servers started.
