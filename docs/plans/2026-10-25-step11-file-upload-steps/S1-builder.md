# Step 11 · S1 — builder report (Step 10's ordered follow-ups)

Model: Claude Opus 5.5. Date: 2026-10-25. Brief: the S1 builder brief (phase doc § Stage S1; decisions #244, #246).

## 1. Verdict

**DONE.** R.1 and R.2's code parts are built; SAVE-REFUSE-R and SW-2 are S5's and were not touched.

## 2. Outputs

Files (commit: see the hand-back; message `feat(extension): S1 — own saveTo refusals unprefixed in withDebugger; saveTo
names kind (verifier: pending)`):
- `extension/src/debugger-errors.ts` — `markOwnRefusal(err)` (a module-private `WeakSet`) and, in
  `describeDebuggerError`, a marked own coded `BridgeError` passes through with its code, message and `data` unchanged.
  `describeRaw`'s fallback line (`return { code: "DEBUGGER_ATTACH", message: \`[chrome.debugger] ${raw}\` };`, pinned
  by `recipes/test/s10-rules.test.ts:1276`) is byte-identical; `grep -c` of it = 1.
- `extension/src/evaluate/save.ts` — `refusal()` marks every value refusal (the seven `BAD_PARAMS` texts, the fallback
  "not saveable" text, and the `PAGE_ERROR` of `STRINGIFY_FAILED_MESSAGE`); the two throw sites of `tooLargeError` in
  this file mark it there (`evaluate-save-store.ts` itself is unchanged, so the store's own cap refusal outside
  `withDebugger` is untouched).
- `mcp/src/tools/registry.ts` — only `browser_evaluate`'s `saveTo` description: "… and answer only the path, size,
  kind ("string" for a string saved as is, "json" for anything else) and sha256. …".
- `extension/test/s1-own-refusals.test.ts` (new, 21 tests) — the shipped chain `evaluateToSave` → `withDebugger` →
  `runWithDebugger` → `debuggerError` → `toWireError` over a stubbed `chrome.debugger` whose `sendCommand` is S4's
  `FakeCdp`: (i) each `saveTo` refusal's wire message equals its constant, unprefixed, code and data kept (undefined on
  both paths, function, symbol, Map, Set, DOM node, "gives nothing", stringify throw on object and BigInt paths, the
  cap on both paths); (ii) kept prefixed: a page error (wire = `[chrome.debugger] ` + `pageError`'s text, contains
  `Error: boom`), a rejected promise, `raceTimeout`'s `TIMEOUT` (= `[chrome.debugger] ${timeoutMessage(50)}`), a raw
  Chrome error (`DEBUGGER_ATTACH`), and the save leg's own `INTERNAL` holder failure; (iii) the marker: passes code,
  message, data; returns the same object; a shape copy (`Object.assign` of the marked error's keys) is not marked; a
  marked plain `Error` is not passed through; an unmarked own `PAGE_ERROR`/`TIMEOUT` keeps today's text (EVAL-5).
- `mcp/test/s2-focus-first.test.ts` — dated note "Re-baselined 2026-10-25 (Step 11 S1; #229, #244 (b) …)" and
  `S1_SAVETO_DESCRIPTION`; the expected `browser_evaluate` entry is S4's constant with `saveTo.description` replaced.
  S4's constant and `fixtures/tool-schemas-f45e3bf.json` are untouched; every other tool still deep-equals the fixture.

**Failing first** (before any source change, tests written):
```
npx vitest run extension/test/s1-own-refusals.test.ts mcp/test/s2-focus-first.test.ts
 × names and input schemas deep-equal the fixture captured at f45e3bf (browser_evaluate re-baselined by Step 10 S4 and Step 11 S1)
   AssertionError: browser_evaluate: expected { …(5) } to deeply equal { …(5) }
 × R.1 … undefined (primitive path) / undefined (promise path) / a function / a symbol / a Map / a Set / a DOM node /
   JSON.stringify gives nothing → BAD_PARAMS …   AssertionError: expected { code: 'BAD_PARAMS', …(1) } to deeply equal …
 × R.1 … a throwing JSON.stringify (object path) / a BigInt (primitive path) → PAGE_ERROR …
 × R.1 … a value over the cap → BAD_PARAMS tooLargeError's text
 × the marker … (4 tests)   TypeError: markOwnRefusal is not a function
 Test Files  2 failed (2)
      Tests  16 failed | 49 passed (65)
```
The 15 failing new tests are exactly the changed behaviour; the 6 "keeps the prefix" tests passed before and after
(they pin what must not change). After the change the same six files (incl. `debugger-errors.test.ts`,
`s4-save-page.test.ts`, `log-scan.test.ts`, `recipes/test/s10-rules.test.ts`): `Test Files 6 passed (6)`, `Tests 239
passed (239)`.

**Exit checks:**
- `npm test` before: `Test Files 132 passed (132)`, `Tests 3273 passed (3273)`. After: `Test Files 133 passed (133)`,
  `Tests 3294 passed (3294)` = 3273 + 21 (the new file; the edited MCP test keeps its count). No test removed.
- `npm run typecheck` exit 0; `npm run build` exit 0 ("built extension → dist/").
- `git status --short` after the build: only my five files plus `docs/plans/…-steps/journal.md`, which was modified
  before I started (the session's, not mine; not committed by me).
- #246: `git diff --quiet HEAD -- extension/test/debugger-errors.test.ts` → unchanged; the pinned source line unchanged.
- `extension/test/log-scan.test.ts` passes; no log call added.

## 4. Deviations

- None from the lane. I did not add a comment beside the `saveTo` schema in `registry.ts` (the lane is the
  description only); the reason lives in the test's dated note.

## 5. Proposed decisions

### 2026-10-25 · S1: the own-refusal marker is a module-private WeakSet in `debugger-errors.ts`
**Decided:** `markOwnRefusal(err)` adds the error to a `WeakSet` private to `debugger-errors.ts` and returns it;
`describeDebuggerError` passes an error through unchanged only when it is both an own coded `BridgeError` (today's
shape check) and in that set. **Why:** explicit at the creation site (#246); it cannot be forged by shape or survive a
copy, keeps `debugger-errors.ts` import-free and pure, adds nothing to `BridgeError` or the wire, and holds no error
alive. **Instead of:** a property or symbol on the error (copyable, visible to `toWireError`'s callers); a new error
subclass in `shared/` (outside the lane, a contract surface). **Revisit if:** another module must mark errors across a
realm or serialisation boundary. **By:** Claude (proposed)

### 2026-10-25 · S1: only the value refusals are marked; the save leg's `INTERNAL` failures keep the prefix
**Decided:** marked: every `refusal()` of `evaluate/save.ts` and `tooLargeError` at its two throw sites there. Not
marked: the three `INTERNAL` texts of `collectSaveText` (holder lost, holder unreadable, slice unreadable) — they are
failures, not refusals on purpose — and `pageError`, `TIMEOUT`, raw Chrome errors (#246). A test pins the holder case
prefixed. **Why:** #246 names "the `saveTo` refusals"; #218 (4) and the cap (#218 (3)) are those; the conservative
reading changes the fewest wire texts. **Instead of:** marking every own error in the save leg. **Revisit if:** the
user wants the `INTERNAL` save failures unprefixed too. **By:** Claude (proposed; wire message text — for user review)

### 2026-10-25 · S1: the `saveTo` description's wording of `kind`
**Decided:** "… answer only the path, size, kind ("string" for a string saved as is, "json" for anything else) and
sha256. …" — names both values with their meaning, in the order of the answer line (`Saved <path>\n<bytes> bytes ·
<kind> · sha256 …`). **Why:** R.2; matches `evaluateSaveStart`'s `kind` (#218) and the tool description's "a string as
is, anything else as JSON". **Instead of:** "… size, kind and sha256" (names the field, not its values). **Revisit
if:** S6's `docs/setup.md` quote needs other wording. **By:** Claude (proposed)

## 6. Findings

- **Doc now stale (session agent's to amend):** `extension/CLAUDE.md` § Service worker, CDP and network, the `saveTo`
  store bullet, says "A refusal thrown inside `withDebugger` reaches the wire prefixed `[chrome.debugger] ` … (#227)".
  After S1 a `saveTo` value refusal reaches it unprefixed (marked by `markOwnRefusal`, #246); page errors, timeouts,
  raw Chrome errors and the save leg's `INTERNAL` failures keep the prefix. By unit test only; S5's SAVE-REFUSE-R
  measures it live. The comment at `debugger-errors.ts:17-20` still reads correctly for unmarked errors.
- No pre-registered check failed.

## 7. Handoff

No processes started, no watchers. The verifier should prove the 15 new failures at `f1d6e2f` (or `eac8324`) by
reverting only `extension/src/debugger-errors.ts`, `extension/src/evaluate/save.ts` and `mcp/src/tools/registry.ts`
in a scratch copy, and diff the live `tools/list` against the f45e3bf fixture (one string differs). S4 of Step 11
re-baselines from `S1_SAVETO_DESCRIPTION` / `EVALUATE_PROPERTIES` in `mcp/test/s2-focus-first.test.ts`. A loaded
extension needs `recipes/reload-extension.ps1` before S5 (the build changed `dist/`).
