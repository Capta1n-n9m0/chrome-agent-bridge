# S2 fixer, round 2 — `uploadFiles` enters the safety table (#256)

Model: Claude Opus 5.5. Role: fixer (`docs/agent-rules.md` §6), building the remainder that was escalated, under #256's widened lane.

## 1. Verdict

**DONE.** Commit `8ab6923` `fix(extension): S2 — uploadFiles enters the safety table as class upload, stub registration (#256) (verifier: pending)`.

## 2. Outputs

**Code.**

- `extension/src/safety.ts`:
  - `MethodClass` gains `upload`.
  - `METHOD_CLASSES.uploadFiles = "upload"`, and `TARGETS_BY_CLASS.upload = ["live","replaced","gone"]`.
  - `safetyDecision` now runs in this order: the state, then the tab (moved unchanged into `targetDecision`), then, for
    class `upload` only, `uploadRefusal(params, ctx)`. The folder rule runs in every phase (receipt, effect, post).
  - Step 2b (a tab gone at receipt) now runs the folder rule for `upload` (§5).
  - The `void params` line is gone, because the params are now read.
- `extension/src/safety-call.ts`: there are two `case "upload":` labels. In `testsTab` it returns `true`; in
  `callTargets` it returns `[tabTarget]`. Nothing else changed.
- `extension/src/sw.ts`:
  - one top-level `router.on("uploadFiles", async () => { throw new BridgeError(ErrorCodes.INTERNAL, "uploadFiles is
    not built in this extension build."); });`;
  - the import it needs (`BridgeError, ErrorCodes` from `./errors.js`).
  - No `await` was added at the top level.

**New tests** (`extension/test/s2-upload-gate.test.ts`, 15 cases). They are all red before the code change: 15 failed
out of 38 in the file.

| Group | What the cases check |
|---|---|
| Table | `uploadFiles` → `upload` with its targets. The router scan of `sw.ts` lists `uploadFiles`. The order `DISARMED` > `DOMAIN_BLOCKED` > `UPLOAD_REFUSED` holds in every phase. JavaScript off does not apply. |
| S2.2 and S2.5 through `CallSafety` + `GatedRouter` | The setup uses the real `SafetyStore`, a `getTab` mock, and a handler that calls `effect()` before an `attach` spy. Rows: the control case is allowed and attaches; a blocked tab, the own page and a `file:` page (by `url` or `pendingUrl`) → `DOMAIN_BLOCKED`, no handler; a tab that becomes blocked before the effect → no attach; disarmed → `DISARMED {scope:"all"}`, no handler; a disarm before the effect → no attach; JavaScript off → the handler runs; folders empty, absent, comments only, a path outside, one of two outside, an empty `paths`, or no `paths` → `UPLOAD_REFUSED`, no handler; folders removed before the effect → no attach; wrong-typed folders (5 values) → `DISARMED` with `STATE_UNREADABLE_MESSAGE`, no handler; the gone-tab rows. |
| Stub unreachable | `sw.ts` holds the stub, at column 1, with a fixed message that names no path. With no folder (absent, `""`, comments only, or only invalid lines) × JavaScript on/off × a tab live or gone × 6 `paths` forms, the gate answers `UPLOAD_REFUSED` and the stub (built from `sw.ts`'s own message) is never called. In the control case (a folder, a path inside it), the stub is reached and answers its `INTERNAL`. |

**Count tests moved** (each with a dated note; no body was weakened):

- `gated-router.test.ts`: 26 → 27, and its title was renamed from "26 methods" to "27 methods".
- `safety-gate.test.ts`:
  - S1.1: the scan expects 27, and the method list gains `uploadFiles` (the title was renamed: "… and Step 11's
    uploadFiles").
  - S1.2 matrix: class `upload` gets a `live` target. Its expected values are written from 0.5: an allowed tab →
    `UPLOAD_REFUSED` (`ctx` holds no folder); blocked or own → `DOMAIN_BLOCKED`; disarmed → `DISARMED`. JavaScript
    off changes nothing.
  - "other tools keep working" while JavaScript is off: `uploadFiles` gets a folder and a path inside it → `allow`.
  - "every classified method allows": the same, and for a gone tab with no folder it is now `UPLOAD_REFUSED`.
- `safety-call.test.ts` "allow for every method": `uploadFiles` expects `UPLOAD_REFUSED`, because its view holds no
  folder.
- `sw-static.test.ts`:
  - the count of registrations is 26 → 27;
  - the named-handler count stays 26;
  - **added:** the only registration that does not have the form `router.on("name", handler)` must be the
    `uploadFiles` stub, and its exact shape is matched. This keeps the "handlers come from `./handlers/`" check
    meaningful.
- `s2-upload-gate.test.ts`, the `file:` block:
  - the class set gains `upload`, and the title was renamed;
  - in two loops, `upload` gets `{paths:[IN]}`, so that those loops test only the `file:` rule, as they did before.

**Numbers:**

- `npx vitest run` before: `Test Files 137 passed (137)`, `Tests 3461 passed (3461)`.
- After: `137 passed (137)`, `3489 passed (3489)`.
- The +28 tests are 15 new cases, 12 new rows of the S1.2 matrix (`uploadFiles` × 4 states × 3 URL kinds) and 1 new
  case in "every classified method allows". No test was removed.
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10}.json`: all five exit 0.
- `npm run build`: exit 0. `git status --short` afterwards shows only the pre-existing `journal.md`.
- The log scan passes (`log-allowlist.ts` is untouched, and no log call was added).

**Mutants.** Each was run on `extension/test`, then the file was restored from a copy and checked with `cmp`.

- **The MINOR 2 mutant: the `testsTab` `upload` label dropped** (log: scratchpad `f2-mutant-teststab.log`). Result:
  `Tests 3 failed | 1877 passed (1880)`. The key line:
  `{"url":"https://www.bank.example/account"}: expected { id: 'u', result: { files: 1 } } to deeply equal { id: 'u',
  error: { …(2) } }`. With the label gone, the upload to a blocked tab is let through. The other two red cases are
  "control … getTab called with 7" and "a tab that turns blocked … no attach".
- **The folder rule removed from step 2b (gone at receipt):** 3 failed. They include the MINOR 2 gone-tab case and the
  stub-unreachable case.
- **Step 4 (the folder rule after the tab tests) removed:** 7 failed.

## 3. Deviations

- **`sw-static.test.ts` was moved as well.** The verifier's §4 list did not name it, but it is a count test that the
  new class entry moves, and it is in the test directory, inside the lane. I made it stricter: it now pins the shape
  of the inline stub.
- **The stub is an inline arrow function, not an import from `./handlers/`.** The brief puts the stub in `sw.ts`
  only.

## 4. Proposed decisions

### 2026-10-25 · S2: an upload's folder rule runs even for a tab gone at receipt
**Decided:** at receipt, a call on a gone tab is still allowed to reach the handler (#137's `TAB_UNKNOWN`), except for
class `upload`, which first runs the folder rule. A path outside the folders, an empty list or a malformed `paths`
answers `UPLOAD_REFUSED` even when the tab is gone. When every path is allowed, the handler answers as for every other
tab class. The tab's tests are unchanged: a gone tab is refused after receipt only when its last URL is blocked, own
or `file:`.
**Why:** S2 verifier MINOR 2 asked which way. This is the option that fails closed: the stub, and S3's handler, are
never reached with a refused path, whatever the tab's state. It is in the lane (`safety.ts`) and changes no existing
method's reply.
**Instead of:** leaving a gone tab to the handler before the folder rule (the handler would answer `TAB_UNKNOWN`
first, and the folder rule would be skipped at receipt).
**Revisit if:** S3's handler needs `TAB_UNKNOWN` to come before `UPLOAD_REFUSED` for a closed tab.
**By:** Claude (proposed). The spec §10 note may want one line on it; I did not edit the spec.

## 5. Findings

- None of the pre-registered checks failed.
- S2.2 is now met in full by tests through `CallSafety` with a real tab read. S2.5's gate part is covered by the same
  rows; its log count is unchanged.
- "No attach while disarmed" is proven against a stand-in handler that calls `effect()` before attaching. The real
  handler's effect check is S3's (S3.3), as the verifier noted.

## 6. Handoff

- I started no processes, and port 9234 was never bound.
- Uncommitted: `journal.md` (pre-existing) and this report.
- **Next:** a fresh verifier re-checks:
  - S2.2;
  - S2.5's gate part;
  - MINOR 1 (`5827f32`);
  - MINOR 2 (`8ab6923`, with the mutant above);
  - the new `sw-static.test.ts` assertion.
- **S3:** it replaces the stub with the real handler. Its registration must then follow `router.on("uploadFiles",
  uploadFiles)` with the handler imported from `./handlers/`. The stub assertions in `sw-static.test.ts` and in
  `s2-upload-gate.test.ts` (`STUB_RE`, the stub-unreachable group) will then fail by design, and S3 rewrites them as
  "the handler is unreachable".
