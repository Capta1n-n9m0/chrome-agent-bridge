# Stage S2: fixer report, round 1

Fixer (Opus 5.5), 2026-10-23. Inputs: `S2-verifier.md` findings 1, 2, 3 and NIT 5, with the step agent's
ruled shape. I worked in the S2 lane only: `extension/src/handlers/{evaluate,wait,locate,target,actions}.ts`
and `extension/test/{evaluate-asref,locator-wait,s2-actions}.test.ts`. I touched nothing in `sdk/`,
`mcp/`, `daemon/`, `debugger.ts`, `result.ts`, the FE files or `docs/e2e-test-plan.md`. No commit, no push,
no Chrome.

Each mutation below was applied to the working copy, run, and reverted. Afterwards a `sha1sum -c` check
confirmed the four source files matched their fixed state.

## Finding 1 (MAJOR): the mark was left when the serialiser's reply was lost. Fixed

**Diff** (`handlers/evaluate.ts`):
- After the `detached` and `closed-shadow` checks, there is a new branch for an absent status with
  `env.kind === "other"`. That kind is `shapeEvaluateResult`'s fallback when `callFn` failed or timed
  out. The branch runs `sweepMark(tabId, mark, timeoutMs)` and then throws `INTERNAL "asRef: the in-page
  serialiser's reply was lost; any mark was removed"`. The message has no value text and no expression.
- An absent status with any other kind (primitive, null, undefined) still gets `BAD_PARAMS` with no
  sweep. In those cases the serialiser never ran, so nothing was marked.
- An explicit `"not-element"` still gets `BAD_PARAMS` with no sweep.
- The best-effort unmark is factored into `sweepMark`, which swallows its own failure. The existing
  `refOfMarked`-failure path uses it too, with unchanged behaviour. The sweep keeps the call's
  `timeoutMs` as its own fresh budget, since each `evaluateInPage` call gets a new one.

**Designed change to an existing test (fix round 1):** `evaluate-asref.test.ts:106` pinned "status
undefined → BAD_PARAMS, no cleanup" on a `kind:"node"` envelope. That envelope cannot occur without a
status. The refusal table now carries the envelope for each row:
- `undefined` with `json 3`, `json null` and `undefined` → BAD_PARAMS, no cleanup.
- `"not-element"` with `node` and with `other` → BAD_PARAMS, no cleanup.
- `detached` and `closed-shadow` are unchanged.

So 4 rows became 7.

**New tests:**
- "no status with the 'other' fallback envelope … → sweep, then INTERNAL". It checks the order
  `[pageTab, ensureContent, evaluate, evaluate:unmark]`, the same mark in the unmark expression,
  `DEFAULT_LIMITS`, and that neither the message nor the value text leaks.
- "the verifier's scenario". A fake page: the main evaluate adds the mark to a page-side set and
  returns `{kind:"other", description:"button#b"}` with no `__mark`, because the reply was lost. The
  unmark call removes the mark. Expected: `INTERNAL`, the set is empty, and `refOfMarked` is never
  called.
- "a failing lost-reply sweep is swallowed: still INTERNAL".

**Fails without the fix:**
```
F1 no lost-reply branch (condition → false):     Tests  3 failed | 17 passed (20)
  FAIL … no status with the 'other' fallback envelope … → sweep, then INTERNAL
       AssertionError: expected 'BAD_PARAMS' to be 'INTERNAL'
  FAIL … the verifier's scenario: the serialiser marks, its reply is lost → … INTERNAL not BAD_PARAMS
       AssertionError: expected 'BAD_PARAMS' to be 'INTERNAL'
  FAIL … a failing lost-reply sweep is swallowed: still INTERNAL
F1 sweep but BAD_PARAMS:                          Tests  3 failed | 17 passed (20)
F1 INTERNAL without the sweep:                    Tests  3 failed | 17 passed (20)
F1 sweep on ANY absent status (kind ignored):     Tests  3 failed | 17 passed (20)   (the primitive/null/undefined rows)
```

## Finding 2 (MINOR): a navigation during `waitFor {locator}` ended the wait at once. Fixed (handler side)

**Diff** (`handlers/wait.ts`):
- `waitForLocator`'s attempt is now `locateInPage(...).catch(frameTeardownAsStale)`.
- `frameTeardownAsStale` (exported) rethrows an `INTERNAL` whose message matches `FRAME_TEARDOWN` as
  `REF_STALE "the frame was replaced during the wait (navigation)"`. The new message carries no Chrome
  text, which can hold a URL. `pollLocator` then re-injects and keeps polling.
- Every other error passes through unchanged, so every other INTERNAL still rejects at once.
- The pure loop `locator-wait.ts` is unchanged.

**Patterns:**
- `/Frame with ID \d+ (was removed|is showing error page)/i`
- `/No frame with id/i`: I included it as plausible for the same race (a frame id that disappears
  between lookup and injection). It has not been seen in a log either.

The comment says this comes from code reading and is unmeasured, and names the S6 E2E row.

**New tests** (`locator-wait.test.ts`):
- Three cases, one per message: `"Frame with ID 0 was removed."`, `"Frame with ID 12 is showing error
  page"` and `"No frame with id 3 in tab 7."`, each wrapped in `callInPage`'s real message prefix. Each
  must re-inject and then resolve on the next poll, with 2 `ensureContent` calls and 2 page calls.
- "any other INTERNAL still rejects at once, unchanged". It is the same error object, after 1 page call.

**Fails without the fix:**
```
F2 no teardown wrapper:              Tests  3 failed | 44 passed (47)
F2 no "No frame with id" pattern:    Tests  1 failed | 46 passed (47)
F2 every INTERNAL treated as stale:  Tests  1 failed | 46 passed (47)
```

## Finding 3 (MINOR): no test fixed the arm order. Fixed (tests only)

The code was already correct. The locator arm is first, and `locatorWaitParams` rejects `text`,
`seconds` and a non-false `networkIdle` before any tab or page call. So no order change was needed.

**New tests:** `{locator, networkIdle: true}`, `{locator, seconds: 1}` and `{locator, text}` each give
`BAD_PARAMS`. The log must stay empty: no `pageTab`, no `targetTab`, no page call, and no wait (fake
timers).

**Fails with the arm moved:**
```
F3 locator arm after networkIdle (verifier's V10):   Tests  1 failed | 46 passed (47)
F3 locator arm after seconds/networkIdle, before text: Tests  2 failed | 45 passed (47)
```

## NIT 5: param check order. Fixed for both `locate` and `resolveTarget`

- **`locate`** (`handlers/locate.ts`): the `isLocator` check now runs before `pageTab`/`ensureContent`.
- **`resolveTarget`** (`handlers/target.ts`, `handlers/actions.ts`):
  - Its validation is split out as the synchronous `checkTarget(p)`, which makes no page call. It checks
    both ref and locator, and an invalid locator.
  - `resolveTarget` still calls it first.
  - `click`, `type`, `inTargetTab` (scroll, hover, selectOption, synthetic untargeted pressKey) and
    `pressKey` call `checkTarget(p)` before `pageTab`.
  - For a valid `ref` call (or neither) this adds nothing to the ordered page-call sequence.
  - Proof: the FE fixture tests are unchanged (the diff below is empty) and green in the full run.
    `fe-actions` and `trusted-input` compare the page-call sequence against `fe-cdp-baseline.json`.

**Tests:** the existing BAD_PARAMS tests in `s2-actions.test.ts` (both ref and locator per action, the
seven invalid locators, `pressKey {ref, locator}`, and `locate` with a bad or missing locator) now also
assert that `log` is empty, so no `pageTab` or `ensureContent` ran.

**Fails without the fix:**
```
N5 locate validates after inject:   Tests  1 failed | 46 passed (47)
N5 actions without checkTarget:     Tests 13 failed | 34 passed (47)
```

## Left alone, as ruled

- Finding 4 (F22, the 30 s call timeout): for S3/S5.
- NITs 6–9.

## Checks

```
$ npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
exit=0

$ npx vitest run extension/ daemon/
 Test Files  45 passed (45)
      Tests  825 passed (825)

$ npm run build
built mcp → dist/index.js
built extension → dist/
exit=0
(grep -c "^import\|^export" extension/dist/content.js → 0: still an IIFE)

$ grep -rnE "console\.(log|warn|error)\(.*(url|href)" extension/src
(empty) grep exit=1

$ git diff a3ac169 --stat -- extension/test/fe-actions.test.ts extension/test/fe-harness.ts extension/test/fixtures/ extension/test/trusted-input.test.ts extension/test/snapshot.test.ts
(empty)
```

Before this round there were 812 tests. The 825 after it break down as +3 refusal rows and +3 new
asRef tests in `evaluate-asref`, plus +3 arm-order, +3 frame-teardown and +1 other-INTERNAL tests in
`locator-wait`. Typecheck was green across all five projects, including S3's `sdk/` at the time of the
run. No new `console.*` line was added.

One stray item: a `bak/` directory already existed in my scratchpad (not created this round), and my
first mutation pass copied backups into it by mistake, so files were not restored between mutations.
I restored all four source files by hand, confirmed the result against the intended diff, and then
re-ran every mutation with a file backup. The numbers above come from that clean re-run.
