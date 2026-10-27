# Step 12 S2b — builder report (`args` for evaluate: the daemon's VERSION rule, the SDK, the MCP tool)

Model / effort: Opus, medium. Base: `e481efe` (S2a code), spec note `3ab9207`. Followed: the phase doc's dated note under
§ Stage 0 and decisions #330–#332 over 0.4 where they differ (`agent-rules.md` §4); B2.1/B2.3 as rewritten in
`stage0-audit.md` §5; F13 for the schema baseline; F15 for where the sentinel is counted.

## 1. Verdict

DONE.

## 2. Outputs

Not committed (brief: commit no). Files changed or created by this slice, exactly:

- Daemon (the hello record and the VERSION rule): `daemon/src/handshake.ts` (`helloFeatures(data)`),
  `daemon/src/wsHost.ts` (passes `helloFeatures(data)` to the tab layer), `daemon/src/intercept.ts`
  (`argsConnections` WeakSet filled in `extensionConnected(conn, proto, session, features = [])`; in `request()`, after
  the proto check and before any resolution, an `evaluate`/`evaluateSaveStart` whose params hold the key `args` gets
  `VERSION` `ARGS_RELOAD_HINT` unless the current connection listed `"evaluateArgs"`; never forwarded).
- SDK: `sdk/src/evaluate-save.ts` (`EvaluateToFileOptions.args?`, `evaluateArgsParams(expression, options)` — the
  string-only rule and `checkEvaluateArgs` from shared, run first in `saveEvaluateToFile` before the target checks and
  the `.part` open), `sdk/src/tab.ts` (`evaluate(fn, {timeoutMs, args})`, `evaluateRef(fn, {args})`; both run
  `evaluateArgsParams` before `#send`), `sdk/src/client.ts` (the cursor mirrors' option types).
- MCP: `mcp/src/tools/registry.ts` (`browser_evaluate {args}` as `z.any().optional()` with its description; one tool
  description sentence with the function form and "no trailing `;`"; `checkEvaluateArgs` before any claim; `args`
  passed on both the plain and the `saveTo` paths only when given).
- Tests: `daemon/test/s12-args-feature.test.ts` (new, 2 tests), `mcp/test/s12-args-cross.test.ts` (new, 3 tests: real
  `WsHost` on port 0 + real SDK `connect()` + `browser_evaluate` against a fake proto:2 extension with or without the
  feature), `mcp/test/s2-focus-first.test.ts` (the written-out delta `S2B_ARGS_PROPERTY` + one description test),
  `sdk/test/s3-signatures.test.ts` (the two pinned signatures updated, with a dated exception line in its header).
- Docs: `docs/setup.md`, the `browser_evaluate` Tools-table row only.

Exit criteria:
- **B2.1 (SDK/MCP side):** five values (nested object with Unicode/emoji, numbers incl. `-0.5` and `1e21`, `null`
  properties, arrays, a top-level `null`, an empty array/object/string, a string, a sentinel key/value) each sent by
  `tab.evaluate` and by `browser_evaluate`; the fake extension receives `{expression, timeoutMs, args, tabId}` equal,
  and `JSON.stringify(args)` byte-equal (key order kept); the SDK gets the value back equal.
- **B2.3:** with a hello lacking the feature: `tab.evaluate` (`args` object and `args: null`), `tab.evaluateRef`,
  `tab.evaluateToFile` (no file, no `.part`), `client.evaluate`, raw `client.call("evaluate"|"evaluateSaveStart")`
  and `browser_evaluate` all reject `VERSION` containing "reload it at chrome://extensions"; the fake received **0**
  `evaluate*` frames. Without `args` the call is forwarded unchanged and the raw answer keeps `kind: "function"`
  (`tab.evaluate` → `undefined`, as today). The daemon test also shows the feature is per socket: a later socket
  without it is refused again, and `snapshot` with a stray `args` key is forwarded.
- **SDK guard first:** undefined, over 1 MiB, BigInt, function value, and a real function as `fn` → `BAD_PARAMS` with
  0 wire calls and no file; MCP over-cap → `BAD_PARAMS`, no call.
- **Sentinel:** `sentinel-args-K7W3-` carried in `args` on both the feature and no-feature paths: 0 occurrences in the
  daemon's injected logger lines and every `console.*` line of the test (B2.1 and B2.3 tests).
- **Log sites +0:** no log call added (diff grep); `extension/test/log-allowlist.ts` still 54 entries; log-scan 16/16.
- **Schema:** only `browser_evaluate` differs from the #214 baseline, by `properties.args = {description: …}` (zod's
  `any` emits no `type`); `required` unchanged; 24 tools; the fixture file untouched.
- **New tests fail on pre-slice code:** the seven `src` files replaced by `git show HEAD:<file>`, the three test files
  run: 7 failed / 44 passed (all 5 new tests + the re-baselined schema test + the description test); then restored.

Commands (results quoted):
- Per package `npx tsc --noEmit -p <pkg>/tsconfig.json`: shared 0, daemon 0, sdk 2 at first (the pinned signatures in
  `s3-signatures.test.ts`, then updated) → 0, mcp 0, extension 0.
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p recipes/tsconfig*.json` (fe, json, s10, s11, s11b, s6, s9): all exit 0.
- `npx vitest run` before (at HEAD + the tree's uncommitted S1-helpers work, before any S2b file): `Test Files 195
  passed (195)`, `Tests 4744 passed (4744)`. After: `Test Files 197 passed (197)`, `Tests 4750 passed (4750)` (+6,
  none removed).
- `npm run build`: exit 0 (`built extension → dist/`); `git status --short` shows no tracked change from the build.

Size (`git diff --numstat -- daemon sdk mcp docs/setup.md` + `wc -l` of the new files): code +89 (handshake 13,
intercept 13, wsHost 2, registry 23, client 3, evaluate-save 21, tab 14); tests +283 (s2-focus-first 18, s3-signatures
6, new files 58 + 201 = 259); docs +1. Total 372 against the 300 cap.

## 4. Deviations

- **Size:** 372 lines, 1.24× the 300 cap (#339). Code is 89, well under the cap; the overrun is tests only (the
  cross-package harness: a fake extension, the round-trip table, the B2.3 matrix over five entry points, the sentinel),
  within §7's 1.5× tests-only allowance. One coherent piece.
- **`sdk/test/s3-signatures.test.ts` changed:** it pins every SDK signature; the brief's new option objects change two
  of them (`evaluate`'s options, `evaluateRef`'s new optional options, on `Tab` and `BridgeClient`). Updated with a
  dated exception line, as Step 10 did for its own exceptions. In lane (`sdk/test/`).
- **Sentinel location:** 0.10 names `log-sentinel.test.ts` (extension/, outside this lane); the daemon-side sentinel
  lives in `mcp/test/s12-args-cross.test.ts`, counted in the daemon's logger and `console.*` lines per F15 (not the
  `daemon.log` file, which is R19-LOGS').

## 5. Proposed decisions

### 2026-10-27 · S2b: the #214 baseline gains `browser_evaluate.args` as a written-out delta
**Decided:** `mcp/test/s2-focus-first.test.ts` adds `S2B_ARGS_PROPERTY` (`{description}` only, as zod's `any` emits) to
`browser_evaluate`'s expected properties; `required` stays `["expression"]`; every other tool deep-equals the
`f45e3bf` fixture, which is not regenerated; S3b's 24 → 25 builds from here. **Why:** #214's rule and stage0-audit F13;
the delta shows exactly what changed. **Instead of:** regenerating the fixture; a typed `args` (JSON Schema has no "any
JSON" type short of a union). **Revisit if:** an MCP SDK or zod upgrade emits a different shape for `any`. **By:**
Claude (proposed, for the session agent — contract-level: MCP schema)

### 2026-10-27 · S2b: the daemon's refusal text and what "carrying args" means
**Decided:** the refusal is `VERSION` "the Chrome extension is an older build without evaluate args — reload it at
chrome://extensions (↻ on Chrome Agent Bridge)" (`ARGS_RELOAD_HINT`, `RELOAD_HINT`'s wording plus three words); a
call carries `args` when its params hold the key (so `args: null` counts; the wire cannot hold `undefined`, and the
SDK drops undefined keys). The check runs after the proto check and before handle resolution, so it reveals nothing
about the tab. **Why:** #332 asks for "the reload hint"; naming the missing feature tells a user with a recently
reloaded but Step-11 build why. **Instead of:** `RELOAD_HINT` verbatim. **By:** Claude (proposed)

### 2026-10-27 · S2b: the SDK refuses a non-string `fn` with `args`; the MCP runs the guard too
**Decided:** with `args`, a non-string `expression` is `BAD_PARAMS` "args: pass the function source as a string, such
as "(a) => a.rows.length" — not a function" before any call (never `String(fn)`); without `args` nothing changes. The
MCP calls `checkEvaluateArgs` itself before any claim (its JSON can fail only the size cap), and its `saveTo` path
gets the SDK's check again. **Why:** 0.4 and the forbidden-fix list ban `String(fn)`; a JS caller can still pass a
function. **Instead of:** only the TypeScript type. **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed. No defect found in S2a's `shared/` or `extension/` code.
- The raw MCP tool handler (`_registeredTools[name].handler`) throws a refusal rather than returning `isError`; the
  MCP SDK turns the throw into the error result (the cross test asserts the throw).
- Not covered here (by design): the extension's handling of the args frame (S2a's tests), and live rows (§4.27, S7).

## 7. Handoff

No processes left; port 0 only; no Chrome. The test count "before" includes the S1-helpers lane's uncommitted
`recipes/test/s12-helpers.test.ts` (as S2a-verifier2 noted); its files were not touched. A committer stages exactly the
12 files of §2 (plus this report). The MCP change needs `/mcp` or a fresh session; the daemon change takes effect at the next client's
build-id handover.
