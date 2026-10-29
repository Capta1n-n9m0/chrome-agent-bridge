# Step 13 — S2 fixer 1: key order of `evaluate`'s value

Fixer (Opus, medium), round 1 of 3, 2026-10-29. Scope: S2-verifier F1–F4 on the uncommitted S2 change (#386). Red
proofs and mutants ran only in a scratch worktree at `518d6dc` under the session scratchpad with its own `npm ci`
(#395); nothing in the main tree was reverted, stashed or moved.

## 1. Verdict
DONE. F1–F3 fixed with tests, F4 answered below. K2.1 and K2.2 still hold. The stage is at exactly 300 new lines (cap 300).

## 2. What changed
| File | Change |
|---|---|
| `extension/src/evaluate/serialize.ts` | New `envelopeJsonFn` (closure-free, shipped as `String(fn)`, like `serializerFn`): a hand-written JSON writer. Only strings, numbers and booleans go through `JSON.stringify`. On a primitive, `JSON.stringify` never reads `toJSON` (SerializeJSONProperty step 2 applies only to an Object or BigInt). Objects use `Object.keys` order and skip non-data values. Arrays write `null` for non-data items. String concatenation, no `push` or `join`. `SERIALIZER_JSON_SRC` is now `return (envelopeJsonFn)((SERIALIZER_SRC).call(this, limits))`. `SERIALIZER_SRC` is unchanged byte for byte: the test checks that the wrapper ends with `")((" + SERIALIZER_SRC + ").call(this, limits));\n}"`. |
| `extension/src/evaluate/result.ts` | `parseEnvelopeText(text, markRequested)`: `("__mark" in env) === markRequested`, and when a mark was requested the status must be a `MarkStatus`. |
| `extension/src/debugger.ts` | `serializerCall` passes `typeof lim.mark === "string" && lim.mark !== ""`, the same condition the composite uses to attach `__mark`. No wire change. |
| `extension/test/s13-envelope.test.ts` | The pin test now checks the new wrapper around the unchanged `SERIALIZER_SRC`. New: writer parity (Map, Set, `-0`, `NaN`, escapes, U+2028, a Date, the depth cap, the item cap: the text equals `JSON.stringify(serializeForAgent(page))` byte for byte). New: F1, with `Array.prototype.toJSON` and `Object.prototype.toJSON` set, the value is the page's value in page order. New: F2/F3, `__mark` refused when not requested, required when requested, and an unknown status refused. The table row "an unknown `__mark`" became "a `__mark` on a call that asked for none"; the unknown status is now asserted with a mark requested. |
| `extension/test/s12-args-cdp.test.ts` | The builder's "toJSON hook → fallback" test is replaced. It now runs through the handler with both hooks and expects `kind: "json"` and the page value in page order. New, F2: a forged `__mark` on a plain call falls back, and no `__mark` reaches the reply. New, F3: in an `asRef` reply that drops `__mark` after the page was marked, the mark is swept, the call answers `INTERNAL`, and `refOfMarked` is never called. |

No log call added: the diff has 0 `console.` lines, and `log-scan` passes.

## 3. F1: why (b), the writer
- **(a) was admissible.** I checked `SERIALIZER_SRC`: every object or array the envelope holds is fresh. `walk` returns `out` (a new array or object), `{__type, entries|values}`, or `[walk(k), walk(v)]`, and the envelope itself is an object literal. It never returns a page `v`. One edge case: a page own key `__proto__` makes `out["__proto__"] = walk(…)` set the prototype of `out` to a fresh object. That is not an own key, so both writers skip it. This is true before and after the change.
- **(b) was chosen anyway**, for three reasons:
  - It mutates nothing.
  - It does not depend on that provenance argument staying true through future serialiser edits.
  - It does not call `Object.defineProperty`, which a page can replace too.
- **What both shapes still trust in the page realm:** `JSON.stringify` (on primitives here), `Object.keys`, `Array.isArray` and `Function.prototype.call`. A page that replaces these is hostile. It controls its own value anyway, and the shape check still bounds what it can forge (no `ref`, no wrong type, `__mark` exactly as requested).
- **Behaviour now.** With a prototype `toJSON` hook the value is right, not a fallback. So #386's "a hooked envelope falls back" now applies only to a replaced global. A silently wrong value from a benign library hook is gone.
- **Residue, out of scope, existing before S2:** `description` is still built by the serialiser's own page `JSON.stringify(value, null, 2)`, so a hook still shows there (verifier F1, "pre-existing"). The test notes this.

## 4. Evidence
- `S2-fixer1-test.txt`: `npm test` gives `Test Files 237 passed (237)`, `Tests 5648 passed (5648)`, exit 0. Before: 5643 (S2-verifier-test.txt). Net +5: s13 went from 19 to 22, and s12 S2 from 7 to 9. One test was replaced and none was removed.
- `S2-fixer1-typecheck.txt`: `npm run typecheck` and all seven `recipes/tsconfig*.json` exit 0.
- `S2-fixer1-build.txt`:
  - `npm run build` exits 0, and `git status --short` afterwards shows only the stage's files, the S2 reports and the earlier `journal.md` edit.
  - A doc-comment-only trim followed (outside the shipped function). After it, 115/115 tests across the evaluate files and `log-scan` pass, `tsc` for the extension exits 0, the build exits 0, and the status is the same.
  - `extension/dist/sw.js` has no `__name`.
- `S2-fixer1-red-mutants.txt` (script: `S2-fixer1-variant.mjs.txt`), run over 102 tests:

| Variant | Result |
|---|---|
| fix (control) | all pass |
| preslice | 26 red |
| builder (pre-fix) | 7 red: every new test of this round except writer parity |
| mF1 (the old `JSON.stringify` wrapper) | 3 red: both F1 tests and the pin |
| mF2 | 3 red |
| mF3 | 2 red |
| mK21 | 5 red: K2.1 still discriminating |
| mWsort | 7 red |

- **mWundef survives.** It is an equivalent mutant: the serialiser never puts `undefined` in an array (it writes the string `"undefined"`).
- **Worktree:** the five `@bridge` junctions were removed with `cmd /c rmdir`, then `git worktree remove --force`. `git worktree list` shows only main, and the main tree's `node_modules/@bridge` still lists its five packages.
- **Size:** 300 new lines (`git diff --numstat` plus the new s13 file): debugger 9, result 34, serialize 42, s12-args-cdp 82, engine 13, mcp 3, s13 117. Of these, 85 are code (the builder's 51 plus 34) and 215 are tests.

## 5. F4: new S2 tests that pass on the pre-slice code, and what catches each
These pass at `518d6dc` (preslice run):

| Test | What catches it |
|---|---|
| s12 "the fake's returnByValue sorts keys" | It tests the fake. It is the precondition that makes mK21 red. |
| s12 "asRef: the mark status crosses" | Verifier's M3 (shape check drops `__mark`). Here, mF3-style breaks of the mark path also make it red through the F3 test. |
| s12 "the mark sweep runs through the same path" | Verifier's M3 |
| s12 "a forged envelope (an extra key) falls back" | Verifier's M2 (no shape check). It passes vacuously at preslice. |
| s12 "a `__mark` on a call that asked for none falls back" (new, F2) | mF2. It passes vacuously at preslice, because a string reply is not an envelope there. |
| s13 "a refused reply reaches shapeEvaluateResult's fallback" | Verifier's M2 |
| mcp "key order too" | Cannot discriminate this change: the fake extension echoes. It pins the SDK leg only. |

All other new tests are red at preslice (26, listed in the evidence). The writer-parity test is red at preslice and passes on the builder's code (`JSON.stringify` is trivially equal to itself); mWsort catches it.

## 6. Deviations
None. The builder's hook test was rewritten rather than kept. Its expectation (fallback) was the F1 defect's own behaviour, and the brief allows the "same value" outcome.

## 7. Proposed decisions
### 2026-10-29 · S2: the envelope's text is written by a closure-free hand-written writer; page `toJSON` hooks never reach `value`
**Decided:** `SERIALIZER_JSON_SRC` writes the envelope with `envelopeJsonFn`. `JSON.stringify` is used only on
primitives, so no page `toJSON` is consulted, and nothing is mutated. `__mark` must be present exactly when the call
asked for a mark.
**Why:** a benign prototype hook (`Array.prototype.toJSON`, Prototype.js style) otherwise changed `value` silently and
passed the shape check (S2-verifier F1). A forged or dropped `__mark` changed the reply shape or left a mark (F2, F3).
**Instead of:**
- an own `toJSON: undefined` on each envelope object. That is safe, because every envelope object is the serialiser's
  fresh copy, but it mutates objects and relies on the page's `Object.defineProperty`.
- the fallback on any hook. That throws away a correct value.
**Revisit if:** a page that replaces `JSON.stringify`, `Object.keys` or `Array.isArray` is seen passing the check with a
wrong value in practice. The `description` field still shows hooks; that predates S2.
**By:** Claude (proposed). This replaces the builder's "a page hook that forges a well-shaped envelope is accepted",
narrowing it to replaced globals.

## 8. Handoff
No process left, no daemon, no extension reload, worktree removed. A fresh verifier should re-check F1–F3, mK21 and the
counts (5648, 300 lines).
