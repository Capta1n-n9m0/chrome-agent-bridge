# S2c — fixer round 1 report ("Fix: failed re-arm write; narrow badge read", Step 9)

Fixer: Opus 5.5, 2026-10-24. Brief: `briefs/S2c-fixer1.md`. No agents spawned, nothing committed, no Chrome, no
daemon, 9234 never bound. Inputs: the verifier's findings F1, F2 (`S2c-verifier.md`), the builder brief's lane and
E1–E6.

## Per finding
- **F1 (MINOR) — fixed.** The revert no longer tests object identity.
- **F2 (NIT) — fixed.** The static check now pins `sw.ts`'s `storedArmed` glue and every `storage.local.get` in
  `sw.ts`.
- **F3 (NIT, E4 count)** — no change asked; the E4 count is restated below with the same filter as the verifier.

## F1 — the change
`extension/src/safety-state.ts`:
- `SafetyStore` gains `private armedChanges = 0`. `applyChanges` increments it when the batch has the
  `safety.armed` key (after the existing `touchesSafety` early return).
- `toggleOnce`'s arm branch records `armedChangesAtApply = this.armedChanges` before its `apply`, and on a rejected
  write:
  ```ts
  const now = this.mem;
  if (this.armedChanges === armedChangesAtApply && now !== null && now.unreadable !== true && now.armed) {
    this.apply({ ...now, armed: false }, "revert");
  }
  throw err;
  ```
  So memory's `armed` goes back to false with the other fields as they are in memory now (a newer block list or
  JavaScript switch stands); `onDisarm` fires on that transition (`apply`, unchanged); `lastDisarmAt` is not moved
  (`"revert"` source, unchanged from the builder); no revert when a change that touched `safety.armed` landed after
  the apply; an unreadable copy stays unreadable. The comment above it says why identity is not used.
- Nothing else in the file changed; `sw.ts` unchanged by this round.

The rule is the step agent's amended D2 as written in the brief; no new decision was taken.

### Tests (appended to `extension/test/safety-rearm-failure.test.ts`, new describe "S2c fixer 1 …", 5 tests)
Harness: disarm at t0, tick exactly `REARM_GUARD_MS`, start a re-arm whose `set` stays pending.
1–2. (`it.each`) `applyChanges` touching only `safety.blockList` / only `safety.evaluate` → write rejects → memory
   `{armed:false, <newer field>}`, `ingestView()` and `read()` disarmed, `onDisarm` ×1, `onArm` ×0; next toggle with
   no time passing returns `"armed"` (guard measured from t0, i.e. `lastDisarmAt` not moved) and keeps the newer field.
3. A change touching `armed` (→ true) then one touching only the block list → the armed state stands, no `onDisarm`.
4. A change touching `armed` (→ false) → no second `onDisarm`, memory disarmed.
5. A wrong-typed block-list change → memory `{unreadable:true}` stays so after the rejection, `onDisarm` ×1.

The builder's "a storage change that landed while the arm write was pending stands" test is untouched and passes; it
still models "touched armed" (its change carries `safety.armed`), so no extra test was needed for that; test 3 adds
the case where a later non-armed change follows the armed one.

### Failing first (fixed tests on the builder's code, before my edit)
`npx vitest run extension/test/safety-rearm-failure.test.ts` → **2 failed | 10 passed (12)**:
```
× … a change to the block list only: … → expected { armed: true, evaluate: true, …(1) } to deeply equal { armed: false, evaluate: true, …(1) }
× … a change to the JavaScript switch only: … → expected { armed: true, evaluate: false, …(1) } to deeply equal { armed: false, evaluate: false, …(1) }
```
(the verifier's interleaving; tests 3–5 pass on the builder's code, as identity also covered them — their
discrimination is shown by mutation below). After the fix: **12 passed (12)**.

## F2 — the change
`extension/test/badge-stored-read.test.ts` (no existing expected value edited):
- The whole-area check now unwraps `as`, `<T>`, `!`, parentheses and `satisfies`, and also counts `void …` (so
  `get(undefined as any)` is a whole-area read anywhere in `extension/src`).
- New `swStorageReadProblems(text)` (TypeScript AST over `sw.ts`): (a) the `storedArmed` property must be exactly
  `() => readStoredArmed((p) => chrome.storage.local.get([...p]))` — one param, forwarded as the single spread
  element, nothing else — and appear once; (b) every `*.storage.local.get(…)` in `sw.ts` is either such an exact
  forward of its own arrow's parameter or names literal keys (string literals / identifier constants) none of which
  starts with `safety.` or contains `SAFETY`; a key-less, `null`, `undefined`(-cast) or `void` argument fails.
- New tests (10): the current `sw.ts` passes; 8 in-memory mutations of the glue each fail it (`get(null)`,
  `get(undefined as any)`, `get()`, `get(["token", ...keys])`, `get([...keys, "port"])`, `get(keys as string[])`,
  `get(["safety.armed"])`, the pre-S2c `get(null).then(parseStoredSafety…)`); one test mutating the marker read
  (`get(["safety.armed"])`, `get(undefined as any)`, `get([MARKER_KEY, ...extra])`) fails it.

## Mutation results (on disk, full `npx vitest run extension/test`, source restored; script
`<scratchpad>/mutate.mjs`, sha256 of both sources identical before and after: `OK`)

| Mutation | Result | Caught by |
|---|---|---|
| F1-a identity check back (`now === applied`) | 2 failed / 1464 | fixer-1 block-list-only, evaluate-only |
| F1-b counter never incremented | 2 failed | builder "storage change … stands"; fixer-1 test 3 |
| F1-c counter incremented on any safety change | 2 failed | fixer-1 block-list-only, evaluate-only |
| F1-d revert from `current` (drops newer fields) | 2 failed | fixer-1 block-list-only, evaluate-only |
| F1-e unreadable guard dropped | 1 failed | fixer-1 test 5 (unreadable stays) |
| F1-f revert moves `lastDisarmAt` | 5 failed | builder retry, worker-start retry, ingest; fixer-1 tests 1–2 |
| F2 S-b `sw.ts` `get(undefined as any)` (survived before) | 2 failed | whole-area static; `sw.ts` glue static |
| F2 S-c `sw.ts` `get(["token", ...keys])` (survived before) | 1 failed | `sw.ts` glue static |
| F2 S-a `sw.ts` `get(null)` | 2 failed | whole-area static; glue static |
| F2 S-e `SafetyStore` deps `get([...keys, "token"])` (line 36) | 1 failed | `sw.ts` static (non-exact forward) |

## Exit criteria re-run
- **E1 PASS** — on 9a5366c's `safety-state.ts`/`sw.ts` (written over the files, run, restored, sha256 `OK`):
  `npx vitest run extension/test/safety-rearm-failure.test.ts extension/test/badge-stored-read.test.ts` →
  **11 failed | 14 passed (25)** (the builder's 8, plus fixer-1 block-list/evaluate and the new `sw.ts`-as-it-stands
  static; the 14 passing on HEAD are the limit guards and the mutation tests that run on mutated text). With the
  fix: 25/25.
- **E2 PASS** — `npm test`: **Test Files 115 passed (115), Tests 2685 passed (2685)**. `git diff --stat --
  extension/test` empty: no tracked test edited; only the two stage-new test files (untracked) grew.
- **E3 PASS** — `extension/dist/content.js` starts `"use strict";\n(() => {`; `grep -cE "^\s*(import|export)\b"` → 0.
  `sw.ts` not touched this round; `sw-static.test.ts` passes.
- **E4 PASS** — `npx vitest run extension/test/log-scan extension/test/log-sentinel extension/test/safety-writers
  extension/test/sw-static extension/test/badge extension/test/safety-state extension/test/safety-network` →
  **8 files, 153 tests passed** (verifier's 143 + 10 new in `badge-stored-read.test.ts`; F3: the `badge` filter
  matches it).
- **E5 PASS** — `npm run typecheck` exit 0; `npm run build` exit 0; `git status --short`: ` M
  extension/src/safety-state.ts`, ` M extension/src/sw.ts`, the two new tests and the S2c docs (untracked) — nothing
  else.
- **E6 PASS** — 2670 → **2685** (+15: +5 in `safety-rearm-failure.test.ts`, 7 → 12; +10 in
  `badge-stored-read.test.ts`, 3 → 13); 115 files unchanged.

## Notes
- Lane kept: `safety-state.ts` and the two stage-new tests. No proposed decisions (the rule was ruled by the step
  agent).
- Not covered (as before): aliases such as `const a = chrome.storage.local; a.get(null)` are not traced by the static
  check; nothing in `sw.ts` uses one today. Nothing live was run.
