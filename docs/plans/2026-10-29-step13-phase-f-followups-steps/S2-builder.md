# Step 13 — S2 builder: key order of `evaluate`'s value

Builder (Opus, medium), 2026-10-29. Built as decisions.md #386 (Stage0.md §5, #377 amended); red proofs under #395.

## 1. Verdict
DONE. K2.1 and K2.2 met by the builder's runs; 203 new lines (cap 300).

## 2. What changed
| File | Change |
|---|---|
| `extension/src/evaluate/serialize.ts` | `SERIALIZER_JSON_SRC`: a closure-free wrapper `function bridgeSerializeToJson(limits) { return JSON.stringify((SERIALIZER_SRC).call(this, limits)); }`. `SERIALIZER_SRC` is unchanged byte for byte (pinned by a test). |
| `extension/src/evaluate/result.ts` | `parseEnvelopeText(text)`: `JSON.parse` of a string, accepted only as an object whose keys are a subset of `kind, value, description, truncated, __mark`, with `kind` one of the four the serialiser sends (`json`, `node`, `function`, `error`), `description` a string, `truncated` a boolean, `value` only with `kind: "json"`, `__mark` only a `MarkStatus`. Anything else, a parse error included, throws the fixed message `the serialiser's reply is not an envelope` (no part of the text). |
| `extension/src/debugger.ts` | `serializerCall` ships `SERIALIZER_JSON_SRC` (still `returnByValue: true`, now on a string) and returns `parseEnvelopeText(res.result?.value)`. The parse sits inside `callFn`, so a failure reaches `shapeEvaluateResult`'s existing catch → `{kind: "other", description: r.description}` (today's fallback). Both serialiser users (`evaluateInPage`, `evaluateFunctionInPage`) share it, so `evaluate`, `args`, `asRef` and the mark sweep all go through it. `evaluateSaveStart` untouched (not a serialiser path, #386). |
| `extension/test/s12-engine-cdp.ts` | `byValue`: the fake's `returnByValue` now sorts object keys at every depth, arrays in place (the engine then puts integer-like keys first, as measured in Chrome, stage0-m2-K.txt). |
| `extension/test/s12-args-cdp.test.ts` | +7 tests (describe "Step 13 S2"): the fake sorts; `evaluate` and `evaluate {args}` keep nested objects and arrays of objects in page order, top-level envelope keys in serialiser order, `description` equal to the page's `JSON.stringify(v, null, 2)`; `asRef` mints the ref (the `__mark` crossed) and refuses a non-element as today; the mark sweep leaves no mark after a failed `refOfMarked`; a page `Object.prototype.toJSON` hook and a forged envelope (extra `ref`) each give exactly today's fallback. |
| `extension/test/s13-envelope.test.ts` | new, 19 tests: the wrapper's exact source; its string parses to `serializeForAgent`'s envelope in page order (integer-like keys, a lone surrogate exact); `__mark` rides the string; 14 refused shapes; the accepted kinds; a refused reply reaches the fallback. |
| `mcp/test/s12-args-cross.test.ts` | B2.1: `JSON.stringify(back) === JSON.stringify(value)` beside the `toEqual` (it cannot discriminate this fix — the fake extension echoes — but pins that the SDK keeps the order). |

No log call added (`git diff … | grep -c console.` → 0); `log-scan.test.ts` and `log-sentinel.test.ts` pass in the full run.

## 3. Evidence (all in this steps dir)
- `S2-builder-test-before.txt`: `Test Files 236 passed (236)`, `Tests 5617 passed (5617)` (my run, main tree before any edit).
- `S2-builder-red.txt`: scratch worktree at `518d6dc` + own `npm ci`, only the fake and the new describe applied → `Tests 4 failed | 27 passed (31)`: the existing "an object returned whole … keys in the page's order" (Received `{"a":1,"n":null,"z":…}`), the two page-order tests, the toJSON hook test (pre-slice gives `kind: json`, description `"HOOKED"`).
- `S2-builder-mutant.txt`: (R2) `s13-envelope.test.ts` on the pre-slice code → 18 failed | 1 passed (the one passing is the fallback guard, which passes there because the missing import throws into the same catch); (K2.1 mutant) the slice with `serializerCall` back on `SERIALIZER_SRC` and `res.result?.value as EvalEnvelope` → `4 failed | 46 passed (50)`; control, the slice as built → `50 passed (50)`.
- `S2-builder-typecheck.txt`: `npm run typecheck` exit 0; all seven `recipes/tsconfig*.json` exit 0.
- `S2-builder-test-after.txt`: `Test Files 237 passed (237)`, `Tests 5643 passed (5643)` = 5617 + 26 (7 + 19), none removed.
- `S2-builder-build.txt`: `npm run build` exit 0; `git status --short` after it shows only this stage's files and the `journal.md` change that was there before I started.
- The worktree's `node_modules/@bridge/*` junctions were removed with PowerShell `cmd /c rmdir` first, then `git worktree remove --force`; the main tree's `node_modules/@bridge` still lists its five packages. A stash made inside the worktree was dropped (it held only this stage's diff).

## 4. K2.2
Every existing evaluate test passes unchanged (only the existing page-order test went red on the pre-slice code once the fake sorts, as #386 predicted). The reply shape is unchanged: the parsed envelope has the same keys, and the shape check refuses any other.

## 5. Notes for the verifier
- **#386 Revisit-if (a hook that passes the shape check with a wrong value):** a page can still make the check pass, e.g. `Object.prototype.toJSON = function () { return this.kind ? {kind: "json", value: 1, description: "1", truncated: false} : this; }`. That gives a well-shaped envelope whose value differs from the expression's. I did not add a test for it: the page can already make its expression return any value it likes, and no key outside the envelope (`ref`), no wrong type and no unknown `__mark` passes. A forged `__mark: "marked"` on a non-element only sends `asRef` to `refOfMarked`, which finds no mark and fails, then sweeps — as today for a lost element. Proposed decision below.
- With a page hook today's code returned `kind: "json"` with the hooked `description`; now it returns the fallback (`kind: "other"`, CDP's own description). That is the intended "falls back as today" path, a change in output only for a page that hooks `toJSON`.
- `-0` nested now crosses as `0` inside `value` — the router's `JSON.stringify` already did that (audit-2 §1.3), so no client change.

## 6. Proposed decisions
### 2026-10-29 · S2: a page hook that forges a well-shaped envelope is accepted
**Decided:** the shape check refuses only what is outside the envelope's keys and types; a page `toJSON` hook that
returns a valid envelope is taken as the page's value. **Why:** the page controls its own value anyway; nothing outside
the envelope (`ref`, an unknown `__mark`, a `value` on a non-json kind) gets through, and a forged `__mark` fails at
`refOfMarked`. **Instead of:** serialising in an isolated world or with a captured `JSON.stringify` (closure-free
source cannot capture one safely before page code runs). **Revisit if:** a hook is found that makes the extension act on
a forged envelope beyond the returned value. **By:** Claude (proposed)

## 7. Deviations
None from the brief. The cross-test assertion is in `mcp/test/s12-args-cross.test.ts` (the only cross test that
compares an evaluate value with `toEqual`; the others compare call params or safety states).
