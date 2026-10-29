# Step 13 — S2 verifier: key order of `evaluate`'s value

Verifier (Opus, medium), 2026-10-29. Read the phase doc (0.3, the dated note, S2, Exit checks, STOP rules), decisions
#386 and #395, Stage0.md §5 (#377 amended) and its Measured facts, `stage0-m2-K.txt`, `stage0-a2-serialiser-probe.txt`,
`stage0-audit-2.md` §1 with `Stage0-auditor2.md` F1, F2, F5, F6 and F11, and the three `CLAUDE.md` files myself.
`S2-builder.md` and its evidence were treated as claims. Red proofs, mutants and probes ran only in a scratch worktree
at `518d6dc` under the session scratchpad, with its own `npm ci` (#395). Nothing in the main tree was moved, reverted
or edited apart from these report files.

## 1. Verdict

**FAIL**: one MAJOR (F1). Every pre-registered exit check passes. But the change gives a wrong `value` with no error
on a page that defines `Array.prototype.toJSON`, and today's code gives the right value there. This is the case
#386's Revisit-if names ("a page hook that passes the shape check with a wrong value"), and the hook is a benign
library pattern, not an attack. The fix is small and stays in S2's lane (F1). F2 and F3 are MINOR and share one fix.

## 2. Outputs (re-derived)

| Check | Result | Evidence |
|---|---|---|
| `npm test` (main tree, after) | `Test Files 237 passed (237)`, `Tests 5643 passed (5643)` | `S2-verifier-test.txt` |
| Count before (pre-slice worktree, full run) | `Tests … (5617)` over 236 files. 9 recipes PowerShell tests fail only from a worktree path (s11-r16, the stop procedure, liveB); none is an evaluate test. So 5617 + 26 = 5643, +1 file. The diff deletes no test line (`git diff --numstat`: only `mcp/test/s12-args-cross.test.ts` has a deleted line, and its assertion is kept, see K2.2) | `S2-verifier-red.txt` R0 |
| `npm run typecheck` and all seven `recipes/tsconfig*.json` | all exit 0 | `S2-verifier-typecheck.txt` |
| `npm run build` | exit 0. `git status --short` afterwards shows only the stage's files, the earlier `journal.md` edit and the S2 report files | `S2-verifier-build.txt` (before: `S2-verifier-status-before.txt`) |
| Size cap 300 | 203 new lines: debugger 9 + result 31 + serialize 11 + s12-args-cdp 57 + engine 13 + mcp 3 + s13-envelope 79 (`git diff --numstat`, `wc -l`) | — |
| `SERIALIZER_SRC` byte-identical | `git diff extension/src/evaluate/serialize.ts` has 0 removed lines. The diff only adds `SERIALIZER_JSON_SRC` after the array. A test also pins it as `"…((" + SERIALIZER_SRC + ").call(this, limits))…"` | — |
| Log sites +0 | `git diff \| grep -c "console\."` → 0. `log-scan` and `log-sentinel` pass in the full run | — |
| Worktree hygiene | five `@bridge` junctions removed with `cmd /c rmdir`, then `git worktree remove --force`. `git worktree list` shows only main. The main tree's `node_modules/@bridge` still lists daemon, extension, mcp, sdk and shared | — |

### K2.1: page order through every serialiser path, and the mutant
- Red on the pre-slice code (`S2-verifier-red.txt`). With only the slice's fake (`byValue` sorting), the existing
  `s12-args-cdp.test.ts` test "an object returned whole … keys in the page's order" turns red, as #386 predicted. With
  the slice's tests on the pre-slice source the result is **22 failed | 31 passed (53)**: 18 of 19 tests in
  `s13-envelope`, plus the old page-order test, `evaluate` page order, `evaluate {args}` page order and the toJSON-hook
  fallback.
- Mutants on the slice (`S2-verifier-mutants.txt`, 7 evaluate test files, 153 tests; control M0 153/153 green):
  - **M1 (K2.1)**: `serializerCall` back on `SERIALIZER_SRC` with `value as EvalEnvelope`, so `returnByValue` stays on
    the envelope object. Result: **4 red**.
  - M2: `JSON.parse` with no shape check. Result: 9 red, including the forged-`ref` test.
  - M3: the shape check drops `__mark`. Result: 5 red, including asRef, the mark sweep and Step 12's `{args, asRef}`.
  - M4: `value` accepted beside any kind. Result: 1 red.
- Paths covered: `evaluateInPage` and `evaluateFunctionInPage` both build `callFn` from the one `serializerCall`
  (`debugger.ts:252`, `:339`). So plain evaluate, `args`, `asRef` and the mark sweep all take the new crossing.
  `evaluateSaveStart` does not use the serialiser (#386, audit-2 F5). The parse sits inside `callFn`
  (`debugger.ts:287`), and its throw reaches `shapeEvaluateResult`'s catch (`result.ts:170-173`). Probe P4 and the
  s13 test confirm it.
- The fake matches Chrome. `byValue` sorts by code unit, and the engine then puts integer-like keys first, ascending.
  For K4 that gives `2, 10, -1, 01, 1.5, a, b`, the order `stage0-m2-K.txt` measured. Arrays keep their order (K3).

### K2.2: existing tests unchanged, reply shape unchanged
- `git diff` shows only added lines in `s12-args-cdp.test.ts` and `s12-engine-cdp.ts`. The one changed existing line,
  `mcp/test/s12-args-cross.test.ts:131`, keeps `expect(back).toEqual(value)` and adds a `JSON.stringify` equality, so
  nothing is weakened. `evaluate-serialize.test.ts` and `evaluate-mark.test.ts` are untouched (audit-2 F6 avoided:
  the composite still returns an object).
- On an unhooked page the reply keys are unchanged. Only their order moves, to `kind, value, description, truncated`.
  On a hooked page see F1–F3.

## 3. Findings

**F1 — MAJOR — `extension/src/evaluate/serialize.ts:419` (`SERIALIZER_JSON_SRC`) with `result.ts:104-122`: a benign
prototype `toJSON` silently changes `value`, and the shape check passes.**
The wrapper calls the page's `JSON.stringify` on the envelope. The envelope's arrays and objects are page-realm objects,
so `Array.prototype.toJSON` (Prototype.js 1.6 defined one that returns a string; I know this from the library's
history, not from a live site) turns every array inside `value` into a string. Probe P1 (`S2-verifier-probes.txt`),
`({a:[1,2], b:{c:[3]}})`:
- slice: `{"kind":"json","value":{"a":"[1, 2]","b":{"c":"[3]"}}, …}`
- pre-slice: `value {"a":[1,2],"b":{"c":[3]}}`

The pre-slice `description` was already hooked, because the serialiser builds it with the page's `JSON.stringify`
(pre-existing, out of scope). The value was not. So on such pages the slice turns a correct value into a wrong one with
no error. That is #386's Revisit-if. The builder's proposed decision ("a page hook that forges a well-shaped envelope is
accepted … the page controls its own value anyway") considers only a hostile hook. A library hook is not the page
choosing its value. **Suggested fix (in lane, closure-free, `SERIALIZER_SRC` untouched):** before the stringify, have
the wrapper walk the envelope it just received (plain serialiser-made objects and arrays) and give each one an own,
non-enumerable `toJSON: undefined` (`Object.defineProperty`). `SerializeJSONProperty` then finds a non-callable
`toJSON` and skips the inherited one. Add a test with `Array.prototype.toJSON` and `Object.prototype.toJSON` returning
non-envelopes. A replaced `JSON.stringify` stays hostile-only and is covered by the shape check. An alternative is a
small hand-written encoder in the wrapper. If the step agent prefers to accept the residue, it is a decision for #386's
Revisit-if, not the builder's to take.

**F2 — MINOR — `result.ts:118-119` and `handlers/evaluate.ts:46`: a forged `__mark` reaches a plain evaluate's
reply.** The check accepts `__mark` whether or not a mark was requested, and the non-`asRef` path returns the envelope
as it is. Probe P2 shows reply keys `["kind","value","description","truncated","__mark"]`, an extra wire key. That goes
against "reply shape unchanged" and the builder's claim that nothing outside the envelope gets through (the value is
only a known status word, so nothing leaks). **Fix:** `parseEnvelopeText(text, markRequested)` from `serializerCall`
(`lim.mark` is a non-empty string): refuse `__mark` when none was requested, and require it when one was (the composite
always sets it then).

**F3 — MINOR — the same lines, `asRef`: a hook that drops `__mark` leaves the mark in the page.** The serialiser marks
the element before the wrapper stringifies the envelope. A hook that returns a well-shaped envelope without `__mark`
makes the handler answer `BAD_PARAMS "asRef needs an Element"` with no sweep. Probe P3: 1 `data-__bridge-mark` left.
Today the hook cannot reach `__mark`. F2's "require it when requested" turns this into the fallback, then the existing
sweep and `INTERNAL`. Add a test.

**F4 — NIT — the exit-check wording "every new pure test fails on the pre-slice code".** 5 of the 26 new tests pass on
`518d6dc`:
- the fake-sorts test (it tests the fake)
- asRef crosses
- the mark sweep
- the forged-`ref` fallback (it passes vacuously: today's code falls back because a string is not an envelope)
- the s13 fallback guard

Each is a path guard that a mutant discriminates (M2, M3), as recorded above. The `mcp` key-order assertion cannot
discriminate, because the fake extension echoes. The builder says so. The builder's report should list these rather
than imply every new test is red before the slice.

Other points checked and fine:
- The parse error is a fixed text that never reaches the wire or a log.
- The JSON text is parsed into plain data, so no page getter runs in the worker.
- An own `__proto__` key at the top is refused, and nested ones are own properties (no prototype pollution).
- `-0`, lone surrogates and large numbers behave as Stage 0 listed.
- A replaced `JSON.stringify` that returns a non-string, or that throws, falls back (P4).

## 4. Deviations
None. Red proofs, mutants and probes ran only in the scratch worktree.

## 5. Proposed decisions
- The builder's "S2: a page hook that forges a well-shaped envelope is accepted": **not endorsed as written.** Limit
  it to a replaced `JSON.stringify` (hostile, the page's own choice) after F1's fix. Prototype `toJSON` hooks must not
  change `value`.

## 6. Findings for CLAUDE.md
Code fact for `extension/src/evaluate/CLAUDE.md` once S2 lands, so a later test cannot pass vacuously: the evaluate
fake (`s12-engine-cdp.ts`) models `returnByValue`'s key sort. `value` crosses as the page's `JSON.stringify` text, so a
prototype `toJSON` reaches it unless the wrapper shadows it (F1).

## 7. Handoff
No process left running, no daemon, no extension reload. The scratch worktree is removed. A fixer needs F1 (with a
test), then F2 and F3 (one change, two tests). A fresh verifier then re-checks F1–F3, M1 and the counts.
