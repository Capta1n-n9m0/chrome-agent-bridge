# Stage S2: builder report

Builder (Opus 5.5), 2026-10-23. Base commit `a3ac169` (HEAD `cad2274` is docs only). Nothing committed,
no Chrome touched, no agent spawned, nothing left running.

## 1. Built

New files:
- `extension/src/handlers/target.ts`: `resolveTarget(tabId, p)` and `locateInPage(tabId, locator)`. The
  locator crosses as its own top-level `callInPage` argument (F34).
- `extension/src/handlers/locate.ts`: the `locate` wire method. Order: pageTab("locate") → ensureContent →
  `isLocator` (else BAD_PARAMS) → locate → `{ref, role, name}`.
- `extension/src/handlers/locator-wait.ts`: the pure loop `pollLocator` (no chrome imports).
- `extension/src/evaluate/mark.ts`: `MARK_ATTR`, the closure-free `markFn`/`unmarkFn`, shipped as
  `MARK_SRC`/`UNMARK_SRC`, plus `unmarkExpression(mark)` and `newMark()` (`crypto.randomUUID()`).
- Tests: `extension/test/{s2-actions,locator-wait,evaluate-mark,evaluate-asref,s2-content-focus}.test.ts`.

Changed files:
- `extension/src/handlers/actions.ts`: click, type, hover, scroll and selectOption call `resolveTarget`
  after ensureContent and before the content-path try, then use the resolved ref everywhere after that
  (content action, `centerForInput`, `focusForTyping`). `inTargetTab` now takes an args builder. pressKey:
  with no ref and no locator, both paths are unchanged. With a target, the order is pageTab →
  ensureContent → resolveTarget → content `focus(ref)` → the same synthetic or trusted path (focus before
  attaching). The synthetic key function moved to a module const, `syntheticKey`, with an identical body.
- `extension/src/handlers/wait.ts`: a non-null `locator` selects the new arm first. `locatorWaitParams`
  validates. `waitForLocator` runs pageTab("waitFor") → ensureContent → `pollLocator` (attempt = locate,
  reinject = ensureContent). The networkIdle, seconds and text arms are unchanged.
- `extension/src/handlers/evaluate.ts`: with `asRef !== true` the path is unchanged (no ensureContent,
  `DEFAULT_LIMITS` itself). With `asRef === true` it calls `evaluateAsRef` as the brief specifies.
- `extension/src/evaluate/serialize.ts`: `SerializeLimits.mark?`. `SERIALIZER_SRC` is now a closure-free
  composite string: `(serializerFn).call(this, limits)` first, then (only for a non-empty string
  `limits.mark`) `(markFn).call(this, mark)`, whose status lands in `env.__mark`. `serializeForAgent` is
  unchanged. `result.ts` was not changed, because `cap()` spreads the envelope and so keeps `__mark`.
- `extension/src/content/actions.ts`: `focusRef(refs, ref)`, which uses the same `resolve` (and so the
  same REF_STALE error) and then calls plain `el.focus()`. `content/index.ts` adds a guarded `focus`
  method and the Window type entry.
- `extension/src/inject.ts` (F33): "the active tab" became "the target tab" in both messages. No test
  asserted the old text: `grep -rn "Could not inject\|Could not run script"` outside `inject.ts` found
  nothing.
- `extension/src/sw.ts`: `router.on("locate", locate)` plus its import.
- `daemon/src/methods.ts`: `"locate"` is in `TAB_METHODS`.
- `daemon/test/methods.test.ts`: `"locate"` is added to the exact sorted list. Two new tests:
  - The named test "locate without tab is a tab method (today: the legacy path, the human's tab
    lease-checked; after S2b: BAD_PARAMS)".
  - A TabLayer drive (≈40 lines, a real `Bridge` with a fake connection). When A has claimed the human's
    tab, B's `locate` with no `tab` gets `TAB_HELD` and nothing is forwarded. A's untargeted and handle
    calls are forwarded as `{locator, tabId: 41}`.
- `extension/test/inject.test.ts`: additions only (+29/−0). These are its own hoisted imports plus the
  F33 test.

`debugger.ts`, `trusted-input.ts`, `shared/`, the FE files, `snapshot.test.ts` and the existing tests of
`inject.test.ts` were not edited.

## 2. Checks (pasted)

`npx vitest run extension/ daemon/`. Before (at HEAD `cad2274` = `a3ac169` code, run before any edit):
```
 Test Files  40 passed (40)
      Tests  684 passed (684)
```
After:
```
 Test Files  45 passed (45)
      Tests  812 passed (812)
```
That is +128 tests and +5 files. `fe-actions.test.ts` is green with the fixture unchanged.

`npm run typecheck`: exit 0. All five projects passed on the final run. An earlier run failed only in
`sdk/` (S3's work in progress: `sdk/src/tab.ts` TS6133, `sdk/test/spawn-inherit.test.ts` TS2339). Over
that period `tsc -p shared`, `tsc -p daemon` and `tsc -p extension` each exited 0.

`npm run build`: exit 0 (daemon, mcp, extension). Note: the mcp bundle includes S3's uncommitted sdk
changes in the shared tree. The daemon's build id changed (`daemon/dist/index.js` was rebuilt).

`grep -c "^import\|^export" extension/dist/content.js` → `0`.

S2.4: `grep -rnE "console\.(log|warn|error)\(.*(url|href)" extension/src` printed nothing, exit 1.

Widened F20 form, `grep -rnE "console\.(log|warn|error)\(.*(url|href|locator|name|text|expression|title)" extension/src`:
```
extension/src/handlers/evaluate.ts:36:  console.log("[bridge] evaluate", expression.length, "chars");
```
This line existed at `a3ac169` (line 34) and logs the length only. S2 added no new hit and no new
`console.*` call.

`git diff a3ac169 --stat -- extension/test/fe-actions.test.ts extension/test/fe-harness.ts extension/test/fixtures/ extension/test/trusted-input.test.ts extension/test/snapshot.test.ts`
printed nothing.

The shipped strings in `extension/dist/sw.js` (`function markFn(mark)`, `function unmarkFn(mark)`, the
`bridgeSerializeAndMark` composite) have no `__name` helper or other injected identifier.

## 3. Tests confirmed to fail without their change

I applied each mutation to the source, ran the named test file(s), and restored the file:

| # | Mutation | Result |
|---|---|---|
| M1 | `"locate"` removed from `TAB_METHODS` | 3 fail (sorted list, named test, TabLayer TAB_HELD) |
| M2 | click passes `p.ref`, not the resolved ref | 1 fails |
| M3 | resolution moved inside click's content-path try (escalation possible) | 13 fail |
| M4 | locator nested as `{locator}` | 10 fail |
| M5 | no BAD_PARAMS on ref+locator | 6 fail |
| M6 | no `isLocator` check | 7 fail |
| M7 | pressKey target without `focus` | 4 fail |
| M8 | hidden also resolves on AMBIGUOUS | 2 fail |
| M9 | visible AMBIGUOUS keeps polling | 1 fails |
| M10 | REF_STALE without reinject | 4 fail |
| M11 | poll 200 ms | 9 fail |
| M12 | default timeout 5 s | 2 fail |
| M13 | TIMEOUT drops the NOT_FOUND data | 2 fail |
| M14 | composite always attaches `__mark` | 2 fail |
| M15 | markFn ignores closed shadow | 1 fails |
| M16 | markFn stops at the first document (no frame walk) | **survived** at first; caught (1 fail) after I added the "unreachable frameElement" test |
| M17 | unmark skips shadow roots | 1 fails |
| M18 | asRef skips ensureContent | 7 fail |
| M19 | asRef no cleanup | 1 fails |
| M20 | asRef leaves `__mark` | 1 fails |
| M21 | inject wording reverted | 1 fails |
| M22 | focusRef selects instead of focusing | 1 fails |
| M23 | `state: null` accepted | 1 fails |

`unwrapResult`'s null/undefined test is unchanged and green (S2.5).

## 4. E2E rows needed (S6 writes them; SDK-5 owns asRef)

- **asRef live round trip** (SDK-5): an element in the light DOM, in an open shadow root and in a
  same-origin iframe gets a usable ref, and no `data-__bridge-mark` is left in the DOM. A text node or
  `window` gets BAD_PARAMS. A closed-shadow element gets BAD_PARAMS.
- **Each action with `locator`** on the playground: click, type, hover, scroll, selectOption, and pressKey
  with ref and with locator. Also a `LOCATOR_AMBIGUOUS` click, which must show no debugger banner (F23).
- **`waitFor {locator}`** on a background tab: SW-side polling under throttling (compare BG-4), `hidden`
  after removal, and `REF_STALE` across a navigation (reinject).
- **The cost of `locate` per poll** on a large live page (S1 §6: jsdom ≈ 1.4 s for 5 000 text elements).
  An overlong attempt stretches the poll period, because polls never overlap.
- **pressKey `{ref, trusted}`**: does a key reach an element focused before attaching, including with
  `focusEmulation`?

## 5. Deviations and open points

- **pressKey with a target and `focusEmulation`:** the focus runs before attaching, as the brief says.
  `type` instead runs its focus inside the session, after the enable (#85 item 3). If FE's outcome-B
  policy depends on focusing under emulation, pressKey with a target may need the same treatment. That
  needs `runTrustedInput`'s focus step for `pressKey`, which is in `debugger.ts`/`trusted-input.ts` and
  outside my lane, so I did not build it.
- **A residual mark:** if `Runtime.callFunctionOn` succeeds page-side but its CDP reply times out
  (`raceTimeout`), `shapeEvaluateResult` swallows the error into `kind: "other"` with no `__mark`. The
  handler then answers BAD_PARAMS "not an Element", and an attribute may remain. I added no cleanup for
  this (it is not in the design, and it would cost another attach), and it is unmeasured.
- **"A serialiser throw leaves no mark"** is guaranteed by the order in the composite (mark after
  serialise). I found no input that makes `serializerFn` throw on an Element, so there is no test for it.
- **Arm-combination rule (my reading):** `text`/`seconds` count as given when not undefined/null, and
  `networkIdle` when not undefined/null/false. `state: null` is BAD_PARAMS, following the letter of the
  brief.
- **The daemon call timeout (F22):** `waitFor {locator}` can wait up to 60 s, but the daemon's default
  call timeout is 30 s, so the SDK/MCP must send call `timeoutMs` = wait + slack (S3/S5).
- **The text arm keeps its page-side 200 ms poll** (F22). The locator arm polls at 100 ms from the
  service worker.

## 6. Proposed decisions

### 2026-10-23 · `asRef` marks through the serialiser call, not a new CDP call
**Decided:** `SERIALIZER_SRC` is a closure-free composite: it serialises first, then marks only when
`limits.mark` is a non-empty string, and attaches `__mark`, which the handler reads and deletes.
`debugger.ts` is unchanged. **Why:** the objectId is released inside that callback (F21), and the mark has
to run before that release, inside the session. Without a mark the output is deep-equal to today's on a
22-value battery. **Instead of:** a third `Runtime.callFunctionOn` in `evaluateInPage`. **Revisit if:** a
serialiser timeout leaves residual marks in practice.

### 2026-10-23 · pressKey takes an optional target, focused without selection
**Decided:** pressKey with `ref`/`locator` focuses through a new guarded content method,
`focus(ref)` (plain `el.focus()`), before the key. Without a target it is byte-identical. **Why:** S2.3
requires a target for pressKey, and `focusForTyping` selects all, which changes what Backspace does.
**Instead of:** leaving pressKey untargeted; reusing `focusForTyping`. **Revisit if:** the SDK surface
(0.4) adds a target to `pressKey`, or FE shows that focusing must happen under emulation.

### 2026-10-23 · `waitFor {locator}` validation
**Decided:** `state` is "visible" (the default) or "hidden"; `timeoutMs` defaults to 10 000, and a finite
number is rounded and clamped to [0, 60 000]. A non-number or non-finite value is BAD_PARAMS, and so is
combining a locator with text, seconds or networkIdle. All of this is checked before any tab or page
call. **Why:** the brief's rules; a fast failure before work. **Instead of:** silently ignoring the other
arms. **Revisit if:** the MCP schema wants a looser `timeoutMs`.

## 7. Unfinished

Nothing in the brief is unbuilt. The E2E rows above are for S6. The S2b items (the `targetTab`
BAD_PARAMS, the removal of `activeTab`/`selectTab`) were not touched, as instructed.
