# S4-live verifier 5b: re-check of MINOR-1 (only `INTERNAL` at a set-up back is NOT BUILT)

Model / effort: Opus, medium. I only read and ran things, and edited no repo file. I worked offline and ran only
`-Block plan`. I did not touch `%TEMP%\bridge-e2e\s11b`. Scratch work went in `<scratchpad>\red5b`, outside the repo,
with no junctions. I never stashed, checked out or reset.

## 1. Verdict
**PASS-with-notes.** MINOR-1 is fixed. There are 2 NITs, no CRITICAL, MAJOR or MINOR finding, and every exit check passed.

## 2. MINOR-1
- **The guard.** `recipes/s11b-rules.ts:688` now ends `|| c !== "INTERNAL") return undefined;`, where it used to end
  `typeof c !== "string"`. So only a BridgeError whose code is `INTERNAL`, at a step matching `^back \d+$`, gives the
  NOT BUILT line. Any other code, any other step, an error that is not a BridgeError, and a missing step all give
  `undefined`. The caller (`recipes/s11b.ts:726`, `if (!nb) throw e;`) then rethrows, and `main`'s catch prints a
  STOP. `bridgeErrText17(c, …)` still gets a string, because `c` is narrowed to `"INTERNAL"`, and both typechecks pass.
- **The test.** The new case in `recipes/test/s11b-hist-notbuilt.test.ts` pins six codes at `back 1` as STOPs:
  `DISARMED`, `TIMEOUT`, `TAB_HELD`, `JS_DISABLED`, `DOMAIN_BLOCKED`, and one outside the enum. It also pins
  `INTERNAL` at `back 1` and at `back 2` as NOT BUILT.
- **Red on the pre-5b code.**
  - I built the scratch copy myself: `git archive HEAD recipes extension/src tsconfig.base.json`, then the current
    `s11b.ts`, `.ps1`, tsconfig, test and `s11b-rules.ts` on top. In the rules file I reverted line 688 to
    `typeof c !== "string"`.
  - That copy differs from the fixer's saved `%TEMP%\fixer5b\s11b-rules.before.ts` only in the doc comment (checked
    with `diff --strip-trailing-cr`).
  - A vitest config there aliased `@bridge/shared*` and `vitest` to the main tree.
  - Result: `1 failed | 6 passed (7)`. The failure is
    `DISARMED: expected 'HISTORY fwd set-up NOT BUILT at=back …' to be undefined` (received
    `HISTORY fwd set-up NOT BUILT at=back 1 DISARMED "x"`).
- **Green.**
  - With the current rules file in the scratch copy: `7 passed (7)`.
  - In the repo, `npx vitest run recipes/test/s11b-hist-notbuilt.test.ts`: `7 passed (7)`.

## 3. Nothing else changed since verifier 5
- **Changed since then.** `find -newer S4-live-verifier5.md` (node_modules and .git skipped) lists only four files:
  - `recipes/s11b-rules.ts`;
  - `recipes/test/s11b-hist-notbuilt.test.ts`;
  - `S4-live-fixer5b.md`;
  - `S4-live.ledger.md`, whose diff adds only ledger lines up to verifier 5's verdict.
- **Not changed since then.** `recipes/s11b.ts`, `recipes/s11b-r17.ps1` and `recipes/tsconfig.s11b.json` are older
  than verifier 5's report.
- **Inside `s11b-rules.ts`.** Compared with the pre-5b copy, the only changes are line 688 and the doc comment above
  it.
- **`git status --short`** shows the same entries as at the start, plus this report.

## 4. Exit checks (re-run by me)
| Check | Result |
|---|---|
| `npm test` | `Test Files 183 passed (183)`, `Tests 4535 passed (4535)`. The claim was 4535/183, and it holds. |
| `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` (base, fe, s6, s9, s10, s11, s11b) | Each exits 0. |
| `npm run typecheck` | Exits 0. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File ./recipes/s11b-r17.ps1 -Block plan` | Exits 0. liveA keeps `… history g1-open … rd-back rd-fwd …`, and `PLAN not built:` is empty. |

## 5. Findings
- **NIT-1. A stale comment and test title.**
  - The comment at the caller, `recipes/s11b.ts:725`, still says "a set-up back's BridgeError is recorded … else a
    STOP". The test title at `s11b-hist-notbuilt.test.ts:15` still says "a BridgeError at a set-up back is NOT BUILT".
    Both should now say "an `INTERNAL` BridgeError".
  - Behaviour is right. Fix this only if the file is touched again.
- **NIT-2. A small mismatch in the fixer's report.** `S4-live-fixer5b.md` §2 says the saved before-copy had "its
  imports rewritten to absolute paths". In fact `%TEMP%\fixer5b\s11b-rules.before.ts` keeps the relative imports, and
  it differs from the current file only at line 688 and the comment. The red evidence still holds, because I
  reproduced it independently.
