# D0 verifier report — Shared types and codes

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), independent, 2026-10-22. Object: the uncommitted
working tree on top of `490c6c3` (`shared/package.json`, `shared/src/protocol.ts` modified; new
`shared/src/{codes,error}.ts`, `shared/test/{codes,error,protocol-v2}.test.ts`). Orchestrator files
(`journal.md`, `D0.ledger.md`) not examined.

**Verdict: PASS-with-notes** (no CRITICAL or MAJOR finding; every exit check passes).

## How "before" was derived

Backup/restore of `shared/`, not a worktree (a worktree's `node_modules/@bridge/shared` junction
would resolve to the main checkout's *modified* `shared/`). Steps: `cp -a shared <scratchpad>/shared-backup`;
recorded `git status --short`, `git diff` and a sha256 of every file under `shared/`. State A (full
HEAD): `git show HEAD:<f> > <f>` for `shared/package.json` and `shared/src/protocol.ts`, the five new
files removed → `npm test`, `npm run typecheck`, `npm run build`. State B (D0.4): HEAD `src/` and
`package.json`, the three new test files copied back → `npx vitest run shared`, `npx tsc -p shared/tsconfig.json`.
Restore: copied the backup back. Afterwards the sha256 list of `shared/` was byte-identical
(`SHARED_BYTE_IDENTICAL`), `git status --short` identical (`STATUS_SAME`), `git diff` identical
(`DIFF_SAME`). Then rebuilt and re-ran the suite on the restored tree (322 passed). `dist/` (ignored)
was rebuilt from the current tree at the end.

## Findings

1. **MINOR — the plan's D0.4 revert procedure cannot do what it says.** Location:
   `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md:419`. "the verifier reverts with
   `git stash push -u -- shared/`, so new files are included": `-u` also stashes the new *test* files,
   so the new tests disappear rather than fail. The rationale is backwards. Evidence: `git status
   --short` lists `?? shared/test/codes.test.ts`, `?? shared/test/error.test.ts` and
   `?? shared/test/protocol-v2.test.ts`; these are all under `shared/`. Fix (mechanical, step agent,
   dated note): "revert `shared/src/` and `shared/package.json` to HEAD, delete the new `src` files, keep
   the new test files, run `npx vitest run shared` **and** `tsc -p shared/tsconfig.json`". This is
   what this report did.

2. **MINOR — one new test is a no-op at runtime and passes with the change reverted.** Location:
   `shared/test/protocol-v2.test.ts:82-85` ("RequestMessage carries an optional timeoutMs"). The test
   assigns `timeoutMs: 60000` and reads it back, so it can only fail under `tsc`. Evidence (state B,
   `npx vitest run shared/test/protocol-v2.test.ts --reporter=verbose`):
   `✓ … responses (v2 error shape) > RequestMessage carries an optional timeoutMs`. On the same
   revert, `npx tsc -p shared/tsconfig.json` does catch it:
   `protocol-v2.test.ts(83,76): error TS2353: … 'timeoutMs' does not exist in type 'RequestMessage'`.
   Because `npm run typecheck` (D0.1) includes `shared/test`, the type change is still guarded.
   Fix: make it an explicit type test (`expectTypeOf<RequestMessage>().toHaveProperty("timeoutMs")`,
   or a `// @ts-expect-error` negative), or note in the test that `tsc` is what guards it.

3. **MINOR — the `code?` deviation is not recorded in the governing docs.** Location:
   `shared/src/error.ts:8` (`code?: ErrorCode | string`). The stage text at phase doc line 181 says
   `{code: ErrorCode | string, message, data?}`, and spec §10 line 305 says `{id, error:{code, message, data?}}`.
   The ruling itself is sound. `isErrorResponse` accepts a v1 `{message}` frame, and spec §10
   "Compatibility" requires one to be accepted, so a type with a required `code` would misdescribe
   what the guard lets through. The basis is stage0-audit B6. But no dated "*Superseded …*" note was
   added at line 181, and decisions.md #17 cites F2, F4–F7, F18–F20 and F22–F24, not B6. The
   SPEC-DISCREPANCY PROTOCOL says "code and spec never diverge silently".
   The builder's claim that a required `code` would have broken typecheck is **not** borne out:
   `grep -rn "ErrorResponse\|ResponseMessage\|HelloMessage" server extension` finds no consumer that
   constructs an `ErrorResponse`. `server/src/connection.ts:50` only reads `parsed.error.message`.
   `extension/src/router.ts:21,29` builds the error inside an untyped `JSON.stringify`. So the
   optional `code` is justified by wire accuracy, not by typecheck. Fix: the step agent adds a dated
   note at phase doc line 181 (with "the daemon always sends `code`"), citing B6.

4. **NIT — `BridgeError.data` is always an own property.** Location: `shared/src/error.ts:16,22`. With
   `target: ES2022`, class fields use define semantics, so `readonly data?: unknown;` creates
   `data: undefined` on every instance. That makes the `if (data !== undefined)` guard on line 22 dead.
   Evidence (esbuild bundle of `error.ts` with the shared tsconfig, probed with node):
   `has own data key: true keys: [ 'code', 'data', 'name' ]`. It does no harm: `toWire` checks
   `!== undefined`, and `toEqual` ignores undefined keys. Fix: `declare readonly data?: unknown;`, or
   drop the guard.

5. **NIT — dead runtime code reaches the server bundle.** Location: `shared/src/codes.ts:66-69` and
   `protocol.ts:3-4` (`export *`). The top-level `new Set([...])` is not tree-shaken, so
   `server/dist/index.js` now carries `DAEMON_ERROR_CODES` and `ALL_CODES` although nothing in the
   server uses them. Evidence: `grep -n "DAEMON_ERROR_CODES" server/dist/index.js` → lines 21464 and
   21491. The extension bundle is unaffected, because the extension uses `import type` only. Fix
   (optional): build the set lazily inside `isErrorCode`, or mark it `/* @__PURE__ */`.

6. **NIT — `fromWire` rewrites an empty message.** Location: `shared/src/error.ts:43`.
   `{message: ""}` becomes `"unknown error"`. Today `connection.ts:50` passes `""` through, and
   decision 0.4 says "the MCP renders `message` as before". Only empty strings are affected, which no
   handler produces. Evidence: probe `fromWire empty msg: "unknown error"`. Fix: none needed;
   optionally document it in the JSDoc. (The JSDoc already says "a missing … code becomes INTERNAL",
   but it says nothing about the message.)

Rulings audited and found sound (not findings):
- **R1:** the subpath exports plus the re-export match decisions.md #17 ("New `shared` modules go
  through `shared/package.json` `exports`") and stage0-audit F18. `package.json` is outside the
  literal D0 lane, but F18 and #17 grant it.
- **R3:** the tighter `isHello` rejects only malformed v2 fields. The extension's hello
  (`extension/src/client.ts:41`, `{type:"hello", token}`) still passes, and all server tests pass.
  The tightening matches D2's "unknown role → reject 4001" (phase doc line 219), because
  `wsHost.ts:65` closes 4001 on any `validateHello` failure.
- **R4:** `isEvent` and `isWelcome` are fine.
- **`proto: number` vs the spec's `proto?: 2`:** checking the number is correct. A proto mismatch
  must reach the version logic (→ `VERSION`), not be dropped as a malformed hello.
- **The extension's welcome with `clientId: "extension"` (B14):** `isWelcome` accepts any string,
  so it passes.
- **Logging:** neither `codes.ts` nor `error.ts` contains `console` or `token`.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| D0.1 tests ≥ before + new; typecheck green | PASS | State A (HEAD shared): `Test Files 22 passed (22)`, `Tests 301 passed (301)`; typecheck exit 0. Current tree: `Test Files 25 passed (25)`, `Tests 322 passed (322)` (+21: codes 3, error 8, protocol-v2 10); `npm run typecheck` exit 0 (shared, server, extension) |
| D0.2 coverage | PASS | `protocol-v2.test.ts`: v1 and v2 hellos accepted; `isEvent` rejects `{id,result}`, `{id,error}` and `{id,method,params}`; `isWelcome` rejects `type:"hello"`, null and a string. `error.test.ts`: `fromWire({message})` gives `INTERNAL`; `fromWire({code,message,data})` preserves all three |
| D0.3 codes exactly spec §10 | PASS | Independent extraction from spec §10 ("Error codes" bullet) vs the string literals in `codes.ts` vs the `ErrorCodes` keys: 22 = 22 = 22, `diff` empty (`IDENTICAL`, `KEYS_IDENTICAL`). The daemon/extension grouping matches the spec order |
| D0.4 new tests fail on revert | PASS (with finding 2) | State B, `npx vitest run shared`: `Tests 7 failed \| 7 passed (14)`; `codes.test.ts` and `error.test.ts` fail to load (`Failed to load url ../src/codes.js`, `../src/error.js`); failing: the malformed-v2-hello test, all 3 `isWelcome` tests and all 3 `isEvent` tests. Passing: protocol.test.ts (4, old), "accepts a v1 hello and a v2 hello" (expected regression guard), "keeps isResponse / isErrorResponse semantics" (expected regression guard), and "RequestMessage carries an optional timeoutMs" (finding 2; caught by `tsc` TS2353 on revert) |
| `git diff -- extension/ server/` empty | PASS | `git diff -- extension/ server/ \| wc -l` → 0 |
| `npm run build` | PASS | exit 0 on the current tree and on state A |
| Extension bundle unaffected | PASS | `extension/dist/*.js` sha256 equal when built at HEAD-shared and now (`EXT_DIST_IDENTICAL`); the extension has only `import type` from `@bridge/shared` (7 lines) |
| Server bundle, `ws` external | PASS | `server/dist/index.js` contains `import { WebSocketServer } from "ws"`; the bundle changed (new `isHello`, plus finding 5) |
| Tree restored | PASS | sha256 of `shared/`, `git status --short` and `git diff` are identical before and after |

## Verdict

**PASS-with-notes.** Three MINOR findings (1, 2, 3) and three NIT findings (4, 5, 6). None blocks D0.
Finding 3 needs a dated doc note from the step agent, and finding 1 needs a mechanical plan
amendment.
