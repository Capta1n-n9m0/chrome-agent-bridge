# S2 fixer — MINOR 1 (POSIX folder line ending in `\`)

Model: Claude Opus 5.5. Role: fixer (`docs/agent-rules.md` §6).

## 1. Verdict

**DONE.** Commit `5827f32` `fix(extension): S2 — a POSIX folder line ending in a backslash is refused (#249) (verifier: pending)`.

## 2. Outputs

- `extension/test/upload-paths.test.ts`: a new case in "S2.1 — folder lines", "S2 verifier MINOR 1 (#249)":
  - invalid: `/home/u/Up\`, `/srv/drop\`, `/\`;
  - valid: `D:\Data\Shared\`, `C:/Up/`, `C:\Up/` (drive-letter lines ending `/`), `/srv/drop/`, `/home/u/Up/`;
  - `parseUploadFolders("/home/u/Up\\")` counts 0, and `/home/u/Up/x` is not allowed by it.
- `extension/src/upload-paths.ts` `parseUploadFolderLine`: the trailing `\` is stripped only on a drive-letter line
  (`WIN_DRIVE_RE`); a trailing `/` is stripped as before. On a POSIX line the `\` stays, so `shapeOf` refuses it
  BACKSLASH.
- Red before the fix: `npx vitest run extension/test/upload-paths.test.ts` → 1 failed | 125 passed (126),
  `"/home/u/Up\\": expected 'valid' to be 'invalid'`. Green after: 126 passed (126).
- `npm run typecheck` exit 0. `npm test` → Test Files 137 passed (137), Tests 3461 passed (3461) (before 3460 / 137).
  `npm run build` exit 0. `git status --short` after the build showed only my two files plus the pre-existing
  `journal.md`, `S2-builder.md`, `S2-verifier.md` (left alone).

## 3. Deviations

None. Followed the verifier's first suggested fix and #249.

## 4. Proposed decisions

None.

## 5. Findings

None new. MINOR 2 and the missing `uploadFiles` class entry are not touched (escalated elsewhere).

## 6. Handoff

A fresh verifier re-checks MINOR 1 against `5827f32`. No processes started; port 9234 untouched.
