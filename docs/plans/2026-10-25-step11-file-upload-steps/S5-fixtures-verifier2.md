# S5-fixtures verifier report, round 2 (re-check after the fix round)

Model: Claude Opus 5.5. UTC 2026-10-25T20:26:38Z to 2026-10-25T20:30:30Z. Role: verifier (`docs/agent-rules.md` §6).
Scope: MINOR-1, MINOR-2, MINOR-3, NIT-1, NIT-2 of `S5-fixtures-verifier.md`, as fixed per `S5-fixtures-fixer.md`.
Read: `docs/agent-rules.md`; both reports; `test-fixtures/s11-upload.js`; `recipes/test/s11-fixtures.test.ts`;
`docs/e2e-test-plan.md` lines 1445–1540 (§4.23) only; `recipes/CLAUDE.md`.

## 1. Verdict

**PASS.** Each finding is fixed, each new or changed test fails under a mutation of the code it covers, the
reporter's existing fields are unchanged, and every exit check holds. NIT-3 and NIT-4 were out of scope and
remain as recorded in round 1.

## 2. Mutation evidence (scratch copy, repo untouched)

Method: a copy of `test-fixtures/s11-*`, `recipes/test/s11-fixtures.test.ts`, `extension/src` and `shared` in
`<scratchpad>/mut2`, run with the repo's vitest (`npx vitest run --config <repo>/vitest.config.ts --root <scratch>
s11-fixtures`). Before each run the script copied the repo's `s11-upload.js` fresh and applied one `perl`
substitution to the copy only (the "lines differing" count was checked > 0 for every mutation).
Control: `Tests 25 passed (25)`.

| Finding | Mutation of `s11-upload.js` (copy) | Result |
|---|---|---|
| MINOR-1 | the `gen` guard at `:93` deleted | 1 failed: "a second change replaces the first (UP-TWICE)…" |
| MINOR-2 | the `wireFrame();` call at `:248` deleted | 1 failed: "UP-4: #up-frame-wrap reaches the input inside the same-origin frame" |
| MINOR-2 | `frame.addEventListener("load", go)` at `:239` deleted | 1 failed: same UP-4 test |
| MINOR-2 | `observe(doc)` in the frame's `go` at `:235` deleted | 1 failed: same UP-4 test (the frame mark is not recorded) |
| MINOR-3 | the `attachInput(...("up-text"))` line `:246` deleted | 2 failed: the id-list test and "UP-6B: the text input has its own change/input record" |
| MINOR-3 | the `inputEvents++` listener at `:109` emptied | 1 failed: the UP-6B text-input test |

MINOR-1: the stub reader (`s11-fixtures.test.ts:250-263`) finishes the first read 80 ms after the second, and
the test asserts the second file's `sha256` (`:278`); `settle()` waits for `pending` 0, so the late read has
landed before the assertion. The real `FileReader` is restored in `finally` (`:279-281`).

## 3. Leftovers in the tree

No `*.bak`/`*.orig`/backup file in the repo (`find`, excluding `node_modules`); `git stash list` empty. Only two
slice files changed since the builder (mtimes 2026-10-26 00:25 +04, inside the fixer's window): `s11-upload.js`
and `s11-fixtures.test.ts`. Their contents hold exactly what the report and tests imply: the guard at `:93`, the
load listener `:239`, the `up-text` attach `:246`, `wireFrame()` `:248`; 255 lines (round 1: 254, +1 for `:246`).
No mutation remains (the six mutations above all fail against these files, the control passes).

## 4. MINOR-3 against §4.23's reporter fields

The change is one added line (`s11-upload.js:246`). `state()` (`:161-181`) is byte-for-byte the round-1 shape:
`version`, `inputs.<id>.{files, names, sizes, sha256, errors, changeEvents, inputEvents, trusted}`, `pending`,
`marks.{events, final}`, `totals.{files, changeEvents, inputEvents}`, `patchedCalls`, `arrivedAfterNav`; no
rename, no format change. Additive effects only: `inputs["up-text"]` exists (files 0, since a text input's
`files` is null, `:166`); `totals` also counts the text field's own events; `reset()` also clears the text
field's value; the painted report lists it. §4.23's refusal clause ("0 files, no `change` and no `input` event",
e2e plan line 1449) can now be judged on the text step of UP-6B; no row uses a fixed input count, so the new key
breaks no rule. S5-helpers should know `inputs["up-text"]` exists (the fixer says so too).

## 5. NITs

NIT-1: the test header (`s11-fixtures.test.ts:1-8`) no longer names `s11-rules.ts`. NIT-2: `s11-upload.js:7`
now says "the S5 helper recipe". `grep -n "s11-rules\|s11\.ts"` over the slice files → no match (exit 1).

## 6. Every-stage checks (fresh runs, this tree)

- `npm run typecheck` → exit 0.
- `npm test` → `Test Files 146 passed (146)`, `Tests 3625 passed (3625)`; 3624 (round 1) + 1 new test = 3625;
  before the slice 3593 / 144. The two slice files alone: `2 passed`, `32 passed` (25 + 7).
- `npm run build` → exit 0. `git status --short` after: ` M .../journal.md` (pre-existing) and the slice's
  untracked files only; no tracked change.
- No python left running (`tasklist | grep -ci python` = 0). I started no server; port 8080 is still held by
  PID 28444 (VS Code, as round 1 noted), 9234 has no listener.

## 7. Findings

None new. (Round 1's NIT-3, NIT-4 and the port-8080 handoff note stand unchanged.)

## 8. Proposed decisions

None.
