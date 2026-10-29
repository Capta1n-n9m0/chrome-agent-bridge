# Step 13 — S2 verifier 2: re-check after fixer 1 (key order of `evaluate`'s value)

Verifier (Opus, medium), 2026-10-29. Scope: S2-verifier F1–F4, K2.1, K2.2 and the every-stage counts, on the
uncommitted S2 change after fixer 1. I read the phase doc (0.3, S2, Exit checks), #386, #395, `S2-verifier.md` and the
three `CLAUDE.md` files. `S2-fixer1.md` and its evidence were treated as claims. Mutants ran only in a scratch worktree
at `518d6dc` under the session scratchpad with its own `npm ci` (#395). Probes ran in memory (`node:vm` realms). Nothing
in the main tree was edited, reverted or stashed, apart from these report files.

## 1. Verdict

**PASS-with-notes.** F1–F3 are fixed. Each has tests that fail on the builder's pre-fix code. F4 is answered. K2.1, K2.2
and every exit check pass. Two NITs remain (N1, N2). Neither needs a fix round.

## 2. Exit checks (re-derived)

| Check | Result | Evidence |
|---|---|---|
| `npm test` (main tree) | `Test Files 237 passed (237)`, `Tests 5648 passed (5648)`, exit 0 | `S2-verifier2-test.txt` |
| Count vs `518d6dc` (5617) | +31, made of `s13-envelope` 22 (new file) and `s12-args-cdp` 33 against 24 before (+9). No test title from `518d6dc` is missing from any changed test file. The diff has 3 removed lines, and none is an assertion: an import line, the fake's `byValue` line (which now models the key sort) and the mcp line, whose `toEqual` is kept beside the new order check | `S2-verifier2-mutants.txt` (tail) |
| `npm run typecheck` and all seven `recipes/tsconfig*.json` | all exit 0 | `S2-verifier2-typecheck.txt` |
| `npm run build` | exit 0. `git status --short` is identical before and after: the stage's 7 files, the S2 report and evidence files, and the earlier `journal.md` edit | `S2-verifier2-build.txt` |
| `SERIALIZER_SRC` byte-identical vs `518d6dc` | both are 7673 chars with the same sha256 prefix `e6d7c40e1be51a2f` (in memory). The wrapper contains it exactly once. `git diff serialize.ts` removes 0 lines | `S2-verifier2-probes.txt` (end) |
| Log sites +0 | 0 added `console.` lines. `log-scan` and `log-sentinel` pass | — |
| No value in any message | both throws in `parseEnvelopeText` (`result.ts:106-125`) use one fixed text, and the tests assert "with a fixed message" | — |
| Size cap 300 | 300 new lines (`git diff --numstat`, plus `wc -l` 117 for the new file). Code is 85 lines: debugger 9, result 34, serialize 42. Tests are 215 lines: s12-args-cdp 82, engine 13, mcp 3, s13 117. This is at the cap, not over it | — |
| Worktree hygiene | five `@bridge` junctions removed with `cmd /c rmdir`, then `git worktree remove --force`. `git worktree list` shows only main. Main's `node_modules/@bridge` still lists daemon, extension, mcp, sdk and shared | — |

## 3. Re-checked items

Mutant runs (`S2-verifier2-mutants.txt`): each mutant is a variant of the three source files, run against main's current
tests over 9 evaluate files (170 tests). The mutations are my own perl edits, not the fixer's script. Control: 170/170.

**F1 (page `toJSON` hooks reach `value`): resolved.**
- The pre-fix variant puts back the builder's `JSON.stringify` wrapper and mark rule: **7 red**. Among them are both F1
  tests:
  - s13 "page toJSON hooks … change neither the value nor its order"
  - s12 "page toJSON hooks … do not reach the value"
- "F1 only" (just the wrapper put back): 3 red.
- "WtoJSON" (the writer honours a callable `toJSON`): 2 red.

The writer attack, probes P1–P4 in `S2-verifier2-probes.txt`:
- **P1, parity.** The shipped `SERIALIZER_JSON_SRC` text equals `JSON.stringify(envelope)` byte for byte in a clean
  realm. 15 cases, all OK:
  - lone surrogates in keys and values
  - all 32 control characters, U+007F, U+2028/2029, quote, backslash, slash
  - `-0` (as `0`), 1e308, 5e-324
  - `NaN`/`±Infinity` (the serialiser turns them into strings first)
  - nested and empty `{}`/`[]`
  - `undefined`, function, symbol and bigint at object and array positions (the serialiser turns each into a string)
  - Map, Set, Date, RegExp
  - the depth cap and the item cap
  - an own `__proto__` key
  - a page `toJSON` own key
  - a long string
  - a sparse array

  The serialiser's `walk` puts only `null`, booleans, finite numbers, strings and fresh arrays/objects into `value`
  (`serialize.ts` walk). So the writer's `undefined` branches are unreachable. That explains why the fixer's mWundef
  survives as an equivalent mutant.
- **P2, hooks.** With `toJSON` set on Object, Array, String, Number and Boolean `.prototype`, `kind` and `value` equal the
  clean-realm ones in all 15 cases, and no hook text appears in `value`. `JSON.stringify` on a primitive reads no
  `toJSON`, and P2 confirms it for String, Number and Boolean.
- **P3, no mutation.** A deep Proxy around the envelope records 0 set, defineProperty, deleteProperty or setPrototypeOf
  traps, and the text is still exact.
- **P4, closure-free.** The writer runs in an empty realm. Its free identifiers are only `JSON`, `Array` and `Object`.
  The built `extension/dist/sw.js` ships it verbatim, with no `__name` (0 hits).

**F2 (a forged `__mark` on a plain call): resolved.**
- Pre-fix variant: the s12 test "a `__mark` on a call that asked for none falls back; the reply carries no `__mark`"
  and both s13 mark tests are red.
- "F2 only" mutant: 3 red.
- `serializerCall` (`debugger.ts:287`) passes `typeof lim.mark === "string" && lim.mark !== ""`. This is no wire change:
  only the in-extension call changed.

**F3 (a dropped `__mark` leaves a mark): resolved.**
- Pre-fix variant: the s12 test "asRef: a reply that drops `__mark` … is swept and answered INTERNAL" is red.
- "F3 only" mutant (a dropped mark accepted, a present mark still status-checked): 2 red.
- My first F3 mutant loosened only the first clause (`result.ts:121`). It was equivalent: the next clause still needs a
  known status when a mark was asked for. So the rule is enforced twice. That is harmless, not a defect.
- The asRef path now reaches the existing sweep, and `refOfMarked` is never called. The test asserts both.

**F4: answered.** The preslice run reproduces exactly 26 red, the same set as the fixer's list. The fixer's §5 table
names the new tests that pass at `518d6dc` and the mutant that discriminates each:
- verifier 1's M2 and M3
- this round's F2 and F3 mutants
- the mcp test, which cannot discriminate (the fake extension echoes)

I accept the table as the record against "every new pure test fails on the code before the stage". Each of those tests
is a path guard proven by a mutant, not a vacuous test.

**K2.1: holds.** The K21 mutant puts back `SERIALIZER_SRC` with `returnByValue` on the envelope object: **5 red**. Among
them are the pre-existing B2.1 test "an object returned whole … keys in the page's order", plain evaluate, `{args}` and
the F1 hook test.

**K2.2: holds.** `518d6dc`'s own 24 `s12-args-cdp` tests pass on the fixed source with `518d6dc`'s fake. The
`evaluate-*.test.ts` files are untouched and pass. On an unhooked page the reply keeps its keys. `__mark` can no longer
reach a plain reply (F2).

## 4. Findings

**N1 — NIT — `serialize.ts:434`: no test pins `Object.keys` (own keys) against inherited enumerables.** The mutant
"Wforin" makes the writer read keys with `for…in`, so inherited enumerable properties are included. It survives
170/170. The F1 hooks are function-valued, so `w` drops them under that mutant too. A page with an enumerable
`Object.prototype.foo = 1` (an old library pattern) would get `foo` added to every object. The code is right today.
**Suggested (optional):** add one parity case with an enumerable non-function `Object.prototype` property. This can go
with a later stage. It need not cost a fix round at the 300-line cap.

**N2 — NIT — residue from replaced globals (recorded, not a defect of S2).** Probe P5, through `parseEnvelopeText`:
- An `Object.keys` that sorts gives sorted keys, and the reply is accepted.
- An `Array.isArray` that returns false turns an array into `{"0":…,"1":…}`, and the reply is accepted.

The serialiser's own `walk` (`518d6dc`) already uses both globals and produces the same wrong value, so neither is new.
New with S2:
- A forged `JSON.stringify` is refused into the fallback.
- A throwing `JSON.stringify` makes the wrapper throw, which also gives the fallback.

At `518d6dc` both still gave the right `value` (only `description` was affected). The result is a fallback, not a wrong
value, and only on a hostile page. The fixer's proposed decision covers it.

## 5. Proposed decisions

**The fixer's "the envelope's text is written by a closure-free hand-written writer; page `toJSON` hooks never reach
`value`": endorsed.** It narrows the builder's "a well-shaped forged envelope is accepted" to replaced globals, which I
asked for in round 1. One sharpening for its Revisit-if: a replaced `Object.keys` or `Array.isArray` already misleads
the serialiser before S2 (N2). So only a replaced `JSON.stringify` is new, and it ends in the fallback, not a wrong
value.

**On the fixer's `description` note: confirmed, pre-existing.** `serialize.ts:374` builds `description` with the page's
`JSON.stringify(value, null, 2)` inside `SERIALIZER_SRC`, which is byte-identical to `518d6dc`. In P2 the `description`
differs under the hooks in 14 of 15 cases, while `value` is identical in all 15. Fixing it would mean changing
`SERIALIZER_SRC`, which S2 keeps byte-identical. A follow-up could reuse `envelopeJsonFn`-style writing for
`description`. That is a decision for the step agent, not this stage.

## 6. Findings for CLAUDE.md
Verifier 1's §6 code fact stands, updated for the fix. Write it into `extension/src/evaluate/CLAUDE.md` once S2 lands:
- `value` crosses as text written by `envelopeJsonFn`, so page `toJSON` hooks do not reach it.
- `description` still comes from the page's `JSON.stringify`.
- `parseEnvelopeText` requires `__mark` exactly when a mark was asked for.
- The evaluate fake models `returnByValue`'s key sort.

## 7. Handoff
No process left running, no daemon, no extension reload. The scratch worktree is removed. Evidence:
- `S2-verifier2-test.txt`
- `S2-verifier2-typecheck.txt`
- `S2-verifier2-build.txt`
- `S2-verifier2-mutants.txt` (harness included)
- `S2-verifier2-probes.txt` (probe scripts included)
