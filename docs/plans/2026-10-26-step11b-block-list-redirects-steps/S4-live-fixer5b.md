# S4-live fixer 5b: only `INTERNAL` at a set-up back is NOT BUILT

Fix round b on helper fix 5. Fixes MINOR-1 of `S4-live-verifier5.md`. Model: Opus, medium. Offline only. Not committed.

## 1. The fix

`histNotBuilt17` (`recipes/s11b-rules.ts`) used to accept a BridgeError with any string code at `back <n>`. Now the
guard reads `c !== "INTERNAL"`, so it returns undefined (a STOP) for every other code. `INTERNAL` is the code of
Chrome's refusal measured in attempt 6. The doc comment now says the same and cites MINOR-1.

## 2. The tests

`recipes/test/s11b-hist-notbuilt.test.ts` has one new case:
- `DISARMED`, `TIMEOUT`, `TAB_HELD`, `JS_DISABLED`, `DOMAIN_BLOCKED` and a code outside the enum, each at `back 1`,
  give undefined (STOP).
- `INTERNAL` at `back 1` and at `back 2` gives `HISTORY fwd set-up NOT BUILT at=back <n> INTERNAL "x"`.

**Red before the change.** I kept a copy of the old file outside the repo (`%TEMP%\fixer5b\s11b-rules.before.ts`,
its imports rewritten to absolute paths) and ran the new case's codes against it with tsx. All six returned a NOT BUILT
line, for example `DISARMED -> HISTORY fwd set-up NOT BUILT at=back 1 DISARMED "x"`, so all six were red. The suite run
inside the repo before the change failed on the new case too: `1 failed | 6 passed (7)`.

**Green after the change.** The file's tests pass: `7 passed (7)`.

## 3. Exit criteria

- `npm test`: `Test Files 183 passed (183)`, `Tests 4535 passed (4535)`. Before this fix it was 4534/183; the new case
  adds one.
- All seven `recipes/tsconfig*.json` (`.`, fe, s6, s9, s10, s11, s11b) exit 0. `npm run typecheck` exits 0.
- `git status --short` shows the same entries as before. The two lane files were already listed (`M
  recipes/s11b-rules.ts`, `?? recipes/test/s11b-hist-notbuilt.test.ts`), and so is this report.

Size: 2 lines changed in the code, 3 in the comment, and 4 in the test.

## 4. Proposed decisions

None.
