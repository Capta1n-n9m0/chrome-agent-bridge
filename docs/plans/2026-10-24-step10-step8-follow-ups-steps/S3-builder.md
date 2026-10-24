# S3 builder report — the 800-cap warning

Builder, Step 10 stage S3 (phase doc 0.3; decisions.md #117, #206, #209). Model: Opus 5.5 (claude-opus-5-5).
Date 2026-10-25. Nothing committed; no live work; no daemon or Chrome started.

## Built

Code (lane only):
- `shared/src/protocol.ts` — `LocateResult` gains `pastSnapshotCap?: true` (documented: set only to `true`, absent otherwise).
- `extension/src/content/locate.ts` — `SNAPSHOT_CAP = 800`; `capCounter(layout)` counts, in walk order, elements with
  `roleOf(el) && !skippedAsZeroSize(el, layout)` (the snapshot's own test, `snapshot.ts:112-113`, same calls, same order;
  both exported from `a11y.ts`) and stops counting at 800 (F18). Each search (`role`, `text`, `css`) calls `visit` first in
  its existing walk and records which matches are past the cap; `locate` adds `pastSnapshotCap: true` to the chosen result
  only (never to `candidates`/`matches` in error data). No new walk, no rule change.
- `extension/src/handlers/target.ts` — `resolveTargetCapped` (returns `{ref, pastSnapshotCap}`), `withCapFlag(reply, past)`
  (returns the same object when not past); `resolveTarget` kept, same signature and result (now a wrapper).
- `extension/src/handlers/actions.ts` — click, type, hover, scroll, selectOption, pressKey-with-a-target add the flag on
  every branch (content path, trusted, focus emulation, content-failure escalation). `ActionResult` type gains the key.
- `extension/src/handlers/locate.ts` — comment only (the content script's flag already passes through).
- `sdk/src/tab.ts` — `BridgeWarning {tab, method, kind: "pastSnapshotCap"}`; `TabHost.notifyWarning?`; private `#action`
  used by click/type/pressKey (via `#trusted`), hover, scroll, selectOption: after the reply, if `pastSnapshotCap === true`,
  one `notifyWarning`. All actions still resolve `undefined`. `locate()` doc updated.
- `sdk/src/client.ts` — new overload `on("warning", (w: BridgeWarning) => void)`, a separate listener set (not a daemon
  frame), `emitWarning` that copies the three keys and swallows a listener's throw.
- `sdk/src/index.ts` — type-only export `BridgeWarning` (the eight values unchanged).
- `mcp/src/tools/registry.ts` — exported `CAP_WARNING_LINE`; `capped(reply, message)` appends it as the last line in
  browser_click, browser_type, browser_press_key, browser_scroll (both branches), browser_hover, browser_select_option.
  browser_wait_for untouched. No input schema changed.

Tests (new): `extension/test/s3-locate-cap.test.ts` (63), `extension/test/s3-actions-cap.test.ts` (34),
`sdk/test/s3-signatures.test.ts` (5), `sdk/test/s3-warning.test.ts` (38), `mcp/test/s3-cap-warning.test.ts` (37).
Amended (not removed): `shared/test/protocol-step8.test.ts` "LocateResult is {ref, role, name}" now pins
`{ref, role, name, pastSnapshotCap?: true}` plus `Omit<…,"pastSnapshotCap">` = the old three fields, with a dated note.

## Baseline

- `npm test` before any edit (at `2479301` + S5's uncommitted files): **117 files, 2807 tests, all passed**.
- `git diff --stat f45e3bf HEAD -- extension shared sdk`: empty (no output).

## Failing-first evidence

Signature test written first, `npx tsc --noEmit -p sdk/tsconfig.json` before any code (only the two by-design exceptions
red; every other pinned signature, overloads and the generic `evaluate` included, already equal):

```
sdk/test/s3-signatures.test.ts(128,48): error TS2344: Type '{ ref: string; role: string; name: string; pastSnapshotCap?: true | undefined; }' does not satisfy the constraint '{ role: string; name: string; ref: string; pastSnapshotCap?: "Expected: undefined, Actual: never" | "Expected: literal boolean: true, Actual: never" | undefined; }'.
sdk/test/s3-signatures.test.ts(145,34): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Argument of type '"warning"' is not assignable to parameter of type '"safetyStatus"'.
sdk/test/s3-signatures.test.ts(145,46): error TS7006: Parameter 'w' implicitly has an 'any' type.
sdk/test/s3-signatures.test.ts(146,37): error TS2344: Type '{ tab: string; method: string; kind: "pastSnapshotCap"; }' does not satisfy the constraint 'never'.
```

The five new test files run before the code (vitest):

```
 Test Files  4 failed | 1 passed (5)
      Tests  114 failed | 61 passed (175)
```
Sample failures: `TypeError: capCounter is not a function`; `expected { ok: true } to deeply equal { ok: true, pastSnapshotCap: true }`;
`expected [] to deeply equal [ { tab: 'T3', method: 'type', …(1) } ]`; `expected 'Clicked text "secret-needle"' to be 'Warning: this element is past the sna…'`.
(The file that "passed" is the type-only signature file at vitest runtime.) After this run I restructured two blocks of
`s3-locate-cap.test.ts` (see Deviations 1–2), which is why the final count is 177, not 175.

## Signature test red on mutation

Scratch edit of `sdk/src/tab.ts` `click(...)`'s return type to `Promise<{ ok: true }>`, then reverted (file restored from a
copy; `tsc` clean again):

```
sdk/src/client.ts(429,5): error TS2322: Type '{ ok: true; }' is not assignable to type 'void'.
sdk/src/tab.ts(235,61): error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
sdk/test/s3-signatures.test.ts(56,48): error TS2344: Type '(target: Target, options?: TrustedOption | undefined) => Promise<void>' does not satisfy the constraint '"Expected: function, Actual: function"'.
```
`sdk/tsconfig.json` has `"include": ["src", "test", "build.mjs"]`, so `npm run typecheck` checks the file. The eight exported
values stay pinned at runtime by `sdk/test/index.test.ts` ("exports exactly Tab, connect, BridgeClient, …"), unchanged and green.
Not pinned: the `Tab` constructor (it takes the package-internal `TabHost`, which gains the optional `notifyWarning`).

## Results (after)

```
npm run typecheck   → exit 0
npm test            → Test Files  122 passed (122) / Tests  2984 passed (2984)   (before 117 / 2807: +5 files, +177 tests, none removed)
npm run build       → exit 0 ("built extension → dist/", mcp, daemon)
```
Per new file: s3-signatures 5, s3-warning 38, s3-actions-cap 34, s3-cap-warning 37, s3-locate-cap 63 (= 177).

S3.2: `git diff f45e3bf -- extension/src/content/a11y.ts extension/src/content/snapshot.ts | wc -l` → `0`.
`extension/test/snapshot-capture.test.ts` (2 tests, "every fixture's elements equal the capture taken at dcb72db" ✓) and
`sdk/test/format-baseline.test.ts` (37 tests ✓) pass unchanged; `mcp/test/s2-focus-first.test.ts` (44, schema baseline ✓)
and `extension/test/log-scan.test.ts` (16 ✓) pass unchanged — no log site added (allowlist untouched).
Bundle: `extension/dist/content.js` has 0 lines starting `import `/`export ` and contains the flag.

`git status --short` after the build: my files (M: the 9 source files + `shared/test/protocol-step8.test.ts`; ?? the five
new tests and this report) plus S5's files (`recipes/bb-login.ps1`, `recipes/fixtures/*`, `S5*`, briefs) — no tracked
`dist` change.

Recipes: `recipes/tsconfig.json` exit 0, `.fe` exit 0, `.s9` exit 0; `.s6` exit 2 with **26 errors, all in
`extension/src/tabs.ts`** (`Cannot find name 'chrome'`), a file S3 did not touch — pulled in by `recipes/test/s9-rules.test.ts`
(its `include` has `test/*.test.ts`). Pre-existing since Step 9 by every sign (no error in an S3 file); not fixed (outside
the lane). Worth a line for the step agent: CLAUDE.md's Commands block names `.s6` as the recipes typecheck.

## Deviations

1. **"Absent at every index" on the 799/800 pages is checked through the counter, not one `locate` per index.** One
   `locate` costs ~140 ms on an 800-button jsdom page; the literal loop took 111 702 ms (799) and 114 418 ms (800) on the
   first run, before any code (the suite is ~25 s). The test now walks once with `capCounter` (the very code each search
   calls) and asserts no index is past, and runs `locate` end to end at indices 0, 1, n/2, n−2, n−1; for 801 it asserts the
   counter calls exactly index 800 past, plus the end-to-end 799 → absent, 800 → `true`.
2. **The pre-S1 capture holds 45 fixtures, not 46, and three list 800 elements.** The brief (and CLAUDE.md's "46
   fixtures") say 46 and "≤ 800 each, < 800"; the JSON array has 45 entries and includes `cap: 900 buttons`, `cap: 800
   buttons`, `cap: 850 mixed …`. Mechanical (spec-discrepancy protocol): the cross-check asserts 45, checks on every fixture
   that nothing the snapshot lists is past the cap and the counter's count = `min(listed, 800)` (equal and nothing past when
   < 800), runs `locate {css:"*", nth:i}` over every element on pages with < 800 listed and ≤ 200 elements, and asserts on the
   900-button fixture that exactly 100 elements are past. CLAUDE.md's "46" wants a correction by the propagator.
3. **The 800 is a constant in `locate.ts`** (`SNAPSHOT_CAP`), because `snapshot.ts`'s `MAX_LINES` is not exported and
   `snapshot.ts` is off limits. A test pins that an 801-listable snapshot lists exactly 800.
4. **One existing test amended** (`shared/test/protocol-step8.test.ts`), by design of 0.3: its exact `LocateResult` pin had
   to admit the new optional key. Not removed; the old three-field shape is still pinned via `Omit`.
5. **The host hook is `notifyWarning`, not `warn`.** A first name `warn` was flagged by `log-scan.test.ts` as a log call site
   (`this.#host.warn?.(…)` matches its injected-logger rule); renamed rather than allowlisted, so S3 adds no log site.

## Proposed decisions

- **2026-10-25 · The SDK's warning fires before the action resolves, and a throwing listener is ignored.**
  Decided: `Tab` emits `warning` synchronously after the reply arrives, before its promise settles; `emitWarning` swallows a
  listener's throw and still calls the later listeners. Why: a script that awaits `tab.click()` has seen the warning by the
  next line, and a bug in a listener must not turn a successful click into an error. Instead of: emitting on a later tick
  (the script may miss it) or letting the throw reject the action (changes an action's outcome). Revisit if: a user wants
  warnings surfaced as errors (a strict mode). By: Claude.
- **2026-10-25 · `locate()` emits no warning; a raw `client.call()` emits none.** Decided as the brief proposed. Why: the flag
  is in `locate`'s return value; `call()` is the untyped escape hatch and returns the reply with the flag in it. Instead of:
  an event for both. Revisit if: scripts miss the flag on `locate`. By: Claude.
- **2026-10-25 · `pressKey` warns too.** Decided: the SDK's `pressKey` (no target in the SDK) and the MCP's
  `browser_press_key` (no target either) append/emit when a reply carries the flag, through the same path as the others;
  today no reply of theirs can carry it (only the extension's additive `pressKey {ref|locator}` can). Why: one rule for every
  action, no special case. Instead of: excluding them. By: Claude.
- **2026-10-25 · The flag is added last and only to an object reply** (`withCapFlag`): `{ok, focusEmulation?, pastSnapshotCap}`;
  a reply without it is the identical object. By: Claude.
- **2026-10-25 · Type export `BridgeWarning`** from `@bridge/sdk` (type only; the eight values unchanged). Contract-adjacent
  (the SDK's surface): listed for the step agent to carry under #206's open decision. Instead of: no exported name (users
  would write the shape by hand).
- **2026-10-25 · MCP wording** `Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list
  it.` — the brief's text verbatim, exported as `CAP_WARNING_LINE`. It follows a failure-free answer only (a failure report
  never carries it: the action threw). With a cursor notice the notice stays first, the warning last.
- **Contract-level, already open (#117, #206):** the wire key and the SDK event form as built here — applied as the phase doc
  states; nothing new to rule beyond `BridgeWarning`'s name.

## Doc texts for S8 (propose, do not edit)

`docs/setup.md` (quoted with line numbers):

```
383 `LOCATOR_AMBIGUOUS` and none with `LOCATOR_NOT_FOUND`, whose `error.data.candidates` names the nearest
384 elements. `tab.locate(locator)` resolves one to `{ref, role, name}` without acting. A `{name}` with
385 no `role` is refused at once (`BAD_PARAMS`, use `{text}` or add `role`).
```
Proposed after line 384's sentence: "When the element comes after the 800th element a snapshot lists (a `snapshot()` does
not show it), the result also carries `pastSnapshotCap: true`, and an action on such an element emits one
`client.on("warning", (w) => …)` event `{tab, method, kind: "pastSnapshotCap"}` (no locator or text) — the action itself
still resolves `undefined`."

```
422 **Experimental surface.** `client.welcome`, `client.extensionConnected`, `client.on("reconnected", …)`,
```
Consider whether `client.on("warning", …)` belongs in this experimental list (S8's call). Line 830 documents
`client.on("safetyStatus", …)`; the warning event could sit beside it.

MCP tool descriptions: none mentions locate's result (there is no locate tool); the six action tools' descriptions could
add "If the element is past the snapshot's 800-element cap, the answer ends with a warning line." — optional, and it changes
only descriptions (the schema baseline `mcp/test/tool-schemas.ts` leaves descriptions out on purpose, so it stays green).

## Unfinished

Nothing in the stage. Not done by design: no live row (S3 has none). The recipes `.s6` typecheck failure is pre-existing
and outside the lane (reported above).
