# Stage S2: verifier report

Verifier (Opus 5.5), 2026-10-23. I audited the builder's uncommitted S2 lane in the main tree against
the phase doc §0.1–0.3, Stage S2 with its dated notes, exit checks S2.1, S2.3–S2.6, decisions #38, #39,
#82, #83, #86–#89, and stage0-audit.md F8, F20, F21, F22, F23, F33, F34. I edited no tracked or lane
file in the main tree. I committed nothing, pushed nothing and touched no Chrome.

## Method

- **The lane.** `git status --short` matches the brief's list exactly: 11 modified files, 4 new source
  files and 5 new test files. `extension/src/evaluate/result.ts` is not modified. The rest of the dirty
  tree is S3's (`sdk/…`, `S3-*.md`) and S2's own docs (`S2-builder.md`, `S2.ledger.md`). No other
  S2-related file is outside the list.
- **The clean worktree.** I ran `git worktree add <scratchpad>/s2-verify a3ac169`, then `npm ci`, then
  `npm test` for the baseline. Then I copied exactly the 20 lane files into the worktree (no `sdk/`, no
  FE docs) and ran `npm run typecheck`, `npm test` and `npm run build` there. Afterwards I removed the
  worktree with `git worktree remove --force` (Windows refused with "Directory not empty", so I ran
  `rm -rf` and `git worktree prune`). `git worktree list` now shows only the main tree.

## Counts (clean worktree)

| | Test files | Tests |
|---|---|---|
| Before, `a3ac169` | 66 passed | 1135 passed |
| After, + S2 lane | 71 passed | 1263 passed |

That is +5 files and +128 tests, the same as the builder's extension+daemon delta (684 → 812).
`npm run typecheck` exited 0 for all five projects. `npm run build` exited 0.
`grep -c "^import\|^export" extension/dist/content.js` returned `0`, so the content script is still an IIFE.

## Findings

### 1. MAJOR: `asRef` can leave the mark on the element and wrongly answer "not an Element"

This is the known gap, now confirmed by running it.

**Where:** `extension/src/handlers/evaluate.ts:64`, with `extension/src/evaluate/result.ts:142-145` and
`extension/src/debugger.ts` (the `callFn` race). The test `extension/test/evaluate-asref.test.ts:106`
pins this behaviour: status `undefined` → "no cleanup".

**What happens:**
1. The composite `SERIALIZER_SRC` runs page-side and calls `markFn`, so the attribute is set.
2. The `Runtime.callFunctionOn` reply then loses `raceTimeout`. That happens whenever the expression used
   most of its budget, because the serialiser gets only `remaining()` of the same deadline. A
   `Detached while handling command` (the user cancels the banner) has the same effect.
3. `callFn` rejects. `shapeEvaluateResult` swallows the error and returns
   `{kind:"other", description:"button#b"}` with no `__mark`.
4. `evaluateAsRef` sees `status === undefined` and throws `BAD_PARAMS "asRef needs an Element; the value
   is not one"`, although the value is an Element. It runs no unmark sweep.

**Evidence:** I ran a scratch test in the worktree only, then deleted it. It used the real `debugger.ts`
`evaluateInPage` and the real handler. The fake `sendCommand` returned a node objectId after 180 ms with
`timeoutMs: 200`, then ran the shipped `SERIALIZER_SRC` on a jsdom `<button>` and replied after 60 ms:

```
GAP code= BAD_PARAMS message= asRef needs an Element; the value is not one attr left= 3c988394-aadf-4ead-8882-f22d22a64391
Tests  1 passed (1)
```

**Why MAJOR:**
- The plan's forbidden fixes include "leaving the `data-__bridge-mark` attribute on the element".
- F21 proposed removing the mark from the CDP side "in a `finally`".
- The caller gets a wrong error code for a genuine Element.
- The fix is small.

The mark is unique per call, so it cannot corrupt a later `refOfMarked`. The only harm is a stray
attribute that page scripts or CSS could see.

**Suggested fix (handler only, no change to `debugger.ts` or `result.ts`):**
- In `evaluateAsRef`, when `status === undefined` (the composite's status never came back), run the same
  best-effort sweep, `evaluateInPage(tabId, unmarkExpression(mark), timeoutMs, DEFAULT_LIMITS)` with the
  error swallowed, before throwing.
- Throw a code that does not blame the caller, for example `INTERNAL` or `TIMEOUT`: "asRef: the
  serialiser's reply was lost (timed out or the debugger detached); any mark was swept".
- Keep `BAD_PARAMS` for an explicit `"not-element"`.
- Change the test at `evaluate-asref.test.ts:106` to expect the sweep. This is a designed change, so cite
  the fix-round decision.
- Optionally give the sweep its own short budget (for example `max(timeoutMs, 2000)`), because the
  original deadline is already spent.

### 2. MINOR: a navigation during `waitFor {locator}` can end the wait at once with `INTERNAL`

**Where:** `extension/src/handlers/locator-wait.ts:64-65`, where every other code rejects.

When the poll lands while the frame is being swapped, `executeScript` rejects with Chrome's
`Frame with ID 0 was removed.` (or a showing-error-page message). `classifyInjectError` maps that to
`INTERNAL`; the existing test `inject.test.ts` asserts exactly this. The wait then rejects instead of
re-injecting. Only `REF_STALE` (the content script is missing in the new document) re-injects. F23 asks
what `visible` does across a navigation. The builder's E2E row ("REF_STALE across a navigation") would
not notice the `INTERNAL` race.

**Evidence:** I read the code. The test `classifyInjectError("Frame with ID 0 was removed.") → INTERNAL`
is at a3ac169. This is not measured live.

**Suggested fix:** treat a frame-removed or showing-error-page `INTERNAL` like `REF_STALE`: re-inject and
keep polling until the deadline. Alternatively, record it as an S6 E2E row that navigates during the
poll.

### 3. MINOR: no test fixes the order of `waitFor`'s arms

**Where:** `extension/src/handlers/wait.ts:23`.

My mutation V10 moved `if (present(p.locator)) return waitForLocator(p)` after the `networkIdle` arm.
All 40 tests in `locator-wait.test.ts` still passed. With that mutation, `{locator, networkIdle: true}`
would silently run the network-idle wait and ignore the locator, despite `locatorWaitParams`' rule.

**Evidence:** `V10 [extension/src/handlers/wait.ts]: Tests 40 passed (40)`.

**Suggested fix:** add a handler test: `waitFor({tabId, locator, networkIdle: true})` → `BAD_PARAMS` with
no `pageTab` call. Do the same for `seconds` and `text`.

### 4. MINOR (F22, reported; S3/S5 fix it): wait timeouts longer than the daemon's 30 s call timeout

**Where:** `extension/src/handlers/wait.ts`, with `LOCATOR_MAX_TIMEOUT_MS = 60_000`.

`waitFor {locator, timeoutMs > ~34 000}` sent with the default call timeout gets the daemon's `TIMEOUT`
at 35 s. The extension keeps polling `locate` every 100 ms until its own deadline, because nothing
cancels it.

The MCP's `browser_wait_for` (`registry.ts:359`) sends no locator yet, so nothing is affected today. The
SDK must send `timeoutMs` = wait + slack, as the builder notes.

### 5. NIT: `locate` checks its params only after injecting

**Where:** `extension/src/handlers/locate.ts:15`, and `resolveTarget`'s validation in the actions.

Both check their params after `pageTab` and `ensureContent`. So a bad locator on a restricted tab answers
`RESTRICTED_URL` instead of `BAD_PARAMS`, and costs one injection. `waitFor {locator}` checks first. This
is consistent with the brief's order (pageTab → ensureContent → isLocator), so it is noted only.

### 6. NIT: an extension error names the MCP tool

**Where:** `extension/src/handlers/wait.ts:56`.

The extension-level message "browser_wait_for takes a locator alone…" names an MCP tool, but SDK callers
see it too. Suggest "waitFor takes a locator alone…".

### 7. NIT: a locator action costs one extra `executeScript` round trip

Phase doc 0.2 says "in the same `callInPage` round-trip where possible". The builder uses
`locate`, then the action, as two calls. The RefMap keeps the ref valid between them, so this is
acceptable. Noted for the cost E2E row.

### 8. NIT: the open point about `pressKey`'s focus under emulation is moot

`pressKeyAt` focuses before attaching even when `focusEmulation` is set (builder §5). #89 chose (B)
`focusFirst` (the SDK calls `focus()` first), not emulation. So this open point does not block S2.

### 9. NIT: two new parts of the router are not unit-tested

`sw.ts`'s `router.on("locate", locate)` and `focusRef`'s `scrollIntoView`-free focus are not covered by a
unit test of the router; `sw.ts` is untested by design (CLAUDE.md). The daemon row is tested.
`methods.ts` and the `sw.ts` entry must land in the same commit (S2.6). S7 or the step agent's commit
must keep them together.

**Mutation V11 is equivalent, not a finding.** Removing `markFn`'s `isConnected` check survived, but the
later root walk returns `"detached"` for a disconnected element anyway.

## Checks of the brief's focus items

| Item | Result | Evidence |
|---|---|---|
| Every action goes through `resolveTarget`, before the content-path try | yes | `actions.ts`: click `:36`, type `:66`, `inTargetTab` `:28` (scroll, hover, selectOption), `pressKeyAt` `:140`. Builder M3 (resolution moved inside the try → 13 fail) plus my V3/V4 (hover/selectOption with `p.ref` → fail). The F23 tests at `s2-actions.test.ts:195` cover LOCATOR_* → no content action, no trusted input |
| `markFn`, `unmarkFn` and `SERIALIZER_SRC` are closure-free | yes | All three bundled by esbuild (target chrome116, as `build.mjs`) and run via `new Function("return (" + src + ")")()`. Marked / not-element / detached / closed-shadow / open-shadow all behaved; the unmark sweep removed open-shadow and light-DOM marks. No `__name`, `require(` or `import` in the strings, nor in `dist/sw.js` (`grep __name` empty) |
| The composite without a mark returns exactly the old output | yes | 20-value battery, new composite vs `SERIALIZER_SRC` from `git show a3ac169:…/serialize.ts`, `JSON.stringify` equal: `same 20 diff 0`. An empty mark adds no `__mark` |
| The attribute is removed and the mark is unique | yes on the success path; no on finding 1's path | `refOfMarked` removes it (S1). `newMark` = `crypto.randomUUID()` per call (V15 fixed mark → 2 fail) |
| `waitFor {state:"hidden"}` resolves on LOCATOR_NOT_FOUND only | yes | `locator-wait.ts:53-58`. V6 (hidden resolves on REF_STALE) → 2 fail; V8 (hidden resolves on found) → 2 fail; builder M8 (AMBIGUOUS) → 2 fail |
| `toSerializableArgs` still maps undefined → null; the locator crosses as its own argument | yes | `inject.ts:40-42` unchanged, its test unchanged and green. `target.ts:14` passes `[locator]`. V17 (nested `{locator}`) → fail |
| Calls with neither, both, or `null` values | ok | Neither → `p.ref` (undefined → null), as before. Both → BAD_PARAMS. `null` counts as absent (V2 → fail) |
| `pressKey` without a target is unchanged | yes | The synthetic path's `syntheticKey` has the same body. The trusted path still has no `ensureContent` (V5 → fail) |
| `locate` result shape | `{ref, role, name}` passed through | `s2-actions.test.ts:251` |
| `nth` passes through | yes | The whole locator object is passed; `isLocator` from `@bridge/shared` (S0) validates it |
| The 30 s default call timeout (F22) | reported | Finding 4 |

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| S2.1 `npm test` after ≥ before + resolution tests; typecheck green | PASS | 1135 → 1263 tests, 66 → 71 files; typecheck exit 0 |
| S2.3 coverage | PASS (S2b part excluded) | Each of click/type/hover/scroll/selectOption/pressKey with `ref` and with `locator` through a fake `locate` (`s2-actions.test.ts:88-190`); 100 ms polling with the 10 s default (`locator-wait.test.ts:62,69,247`); hidden on NOT_FOUND (`:139-171,266`); the mark script's output (`evaluate-mark.test.ts`). The `targetTab` → BAD_PARAMS part moved to S2b (#72) and is not checked here |
| S2.4 `grep -rnE "console\.(log\|warn\|error)\(.*(url\|href)" extension/src` | PASS | Empty stdout, exit 1 |
| S2.4 widened (F20) | PASS | One hit, `handlers/evaluate.ts:36` (expression *length* only). It also exists at a3ac169 (`:34`). The S2 diff and the new files add no `console.*` line |
| S2.5 `unwrapResult` treats null or undefined as failure | PASS | `inject.test.ts` diff vs a3ac169 is +29/−0; the null/undefined tests at `:14-25`, `:43-54` are unchanged and green |
| S2.6 `locate` in the method table, lease-checked; a "locate without tab" test; the exact list updated | PASS | `methods.ts` +1 line. `methods.test.ts` is +44/−0: the list entry, the named test, and a TabLayer test (B gets `TAB_HELD` and nothing is forwarded; A's call is forwarded as `{locator, tabId: 41}`). V18 (row removed) → 3 fail. The router entry is in `sw.ts`; it must ship in the same commit |
| FE files unchanged, trusted tests green | PASS | `git diff a3ac169 --stat -- fe-actions.test.ts fe-harness.ts fixtures/ trusted-input.test.ts snapshot.test.ts evaluate-result.test.ts debugger.ts trusted-input.ts shared/ result.ts` → empty. `fe-actions` 40/40, `trusted-input` 15/15, `snapshot` 39/39 green against the unchanged `fe-cdp-baseline.json`, so a ref call's page-call sequence is the same as at a3ac169 |
| Every new test fails without its change | PASS with one gap | 18 mutations of my own: 16 killed (V1–V9, V12–V18), V11 equivalent, V10 survived (finding 3). The builder's 23 (M1–M23) are consistent with mine |

**Mutation log** (worktree only; each file restored from its `.bak` copy):

| # | Mutation | Result |
|---|---|---|
| V1 | `target.ts`: no `isLocator` check | 7 fail |
| V2 | `target.ts`: `null` counts as present | 1 fail |
| V3 | hover passes `p.ref` | 1 fail |
| V4 | selectOption passes `p.ref` | 1 fail |
| V5 | untargeted trusted pressKey calls `ensureContent` | 1 fail |
| V6 | hidden resolves on REF_STALE | 2 fail |
| V7 | a re-injection failure not swallowed | 1 fail |
| V8 | hidden resolves on found | 2 fail |
| V9 | clamp 120 000 | 1 fail |
| V10 | locator arm after `networkIdle` | **survived** |
| V11 | no `isConnected` check | survived, equivalent |
| V12 | unmark removes any mark | 1 fail |
| V13 | empty mark counts as a mark | 1 fail |
| V14 | detached → BAD_PARAMS | 1 fail |
| V15 | fixed mark | 2 fail |
| V16 | `focus` unguarded | 1 fail |
| V17 | `locate` nests `{locator}` | 1 fail |
| V18 | `"locate"` out of `TAB_METHODS` | 3 fail |

## Verdict

**FAIL**, on one MAJOR (finding 1: `asRef` can leave the mark and answer the wrong code when the
serialiser's reply is lost). Every pre-registered exit check passes. Finding 1's fix is local to
`evaluateAsRef` plus the one test at `evaluate-asref.test.ts:106`. Findings 2 and 3 are cheap to fold
into the same fix round.

## Re-check (round 1)

Verifier (Opus 5.5), 2026-10-23. I audited `S2-fixer1.md`'s claims. I edited no main-tree file except
this one.

**Worktree.** I made a fresh `git worktree add <scratchpad>/s2-verify2 a3ac169` and ran `npm ci`. Then I
copied the same 20 lane files, after confirming them with `git status --short`. Since my first pass, the
`sdk/` files are committed (db242b6) and HEAD has moved by docs-only commits (892370d); no S2 lane file
is in those commits. I removed the worktree at the end with `git worktree prune`; only the main tree is
left.

**Counts.**

| | Test files | Tests |
|---|---|---|
| `a3ac169` | 66 | 1135 |
| + the S2 lane after round 1 | 71 | 1276 |

That is +141: round 0's +128 plus the fixer's +13. `npm run typecheck` exited 0, `npm run build` exited
0, and `grep -c "^import\|^export" extension/dist/content.js` returned `0`.

**Leftover-mutation sweep.**
- All 20 lane files are identical (`cmp`) between the main tree and the worktree, and they stayed so
  after my own mutation runs.
- I re-read the full diff vs `a3ac169` of the files the fixer did not claim to touch: `methods.ts`,
  `content/actions.ts`, `content/index.ts`, `serialize.ts`, `inject.ts`, `sw.ts`, `mark.ts` and
  `locator-wait.ts`. Every condition and line is as I recorded it in round 0. That includes `markFn`'s
  checks, `unmarkFn`'s `=== mark` test, the composite's `limits.mark !== ""` test, and all of
  `pollLocator`'s branches.
- The four fixed files (`evaluate.ts`, `wait.ts`, `locate.ts`, `target.ts`) and `actions.ts` contain
  exactly what the fix report describes, and nothing else.
- No leftover mutation was found.

### Finding 1: FIXED

`evaluate.ts` now handles an absent status with the `kind:"other"` fallback envelope like this: it runs
`sweepMark`, then throws `INTERNAL "asRef: the in-page serialiser's reply was lost; any mark was
removed"`. An absent status with a primitive, null or undefined value, or an explicit `"not-element"`,
still gives `BAD_PARAMS` with no sweep.

I re-ran my round-0 scenario in a scratch test, then deleted it. It used the real `debugger.ts`
`evaluateInPage`; the reply came after the deadline, and the fake page ran the unmark expression:

```
RECHECK code= INTERNAL msg= asRef: the in-page serialiser's reply was lost; any mark was removed marked-mid= true attr left= null
```

**The designed change to the refusal table is what finding 1 requires.** The table at
`evaluate-asref.test.ts:113-121` now carries an envelope for each row. The old row, "undefined status on
a `node` envelope → no cleanup", was an envelope that cannot occur. It is replaced by rows for
undefined with json, null and undefined, which stay no-cleanup and are correct, because the serialiser
never ran on a primitive. The lost-reply case moved to three new tests: sweep then INTERNAL; the
end-to-end page-mark scenario; and a failing sweep that is swallowed.

### Finding 2: FIXED, handler side, as designed

`waitForLocator`'s attempt now ends in `.catch(frameTeardownAsStale)`, which turns three INTERNAL
messages into `REF_STALE` and passes everything else through:
- `Frame with ID n was removed`
- `Frame with ID n is showing error page`
- `No frame with id`

The new message carries no Chrome text. `pollLocator` is unchanged.

**NIT (new):** a navigation that lands on an error page keeps answering "showing error page". The wait
then re-injects until its deadline and ends in `TIMEOUT` instead of an immediate error. This is
acceptable and unmeasured, and belongs in the S6 navigation row.

### Finding 3: FIXED, tests only

The order of the arms is unchanged and was already correct. Three new tests cover `{locator,
networkIdle: true}`, `{locator, seconds}` and `{locator, text}`: each gives BAD_PARAMS with an empty log.
My round-0 mutation V10 is now killed (R7 below).

### NIT 5: FIXED

- `locate` checks `isLocator` before `pageTab`.
- The new synchronous `checkTarget(p)` in `target.ts` runs first in `click`, `type`, `inTargetTab` and
  `pressKey`. `resolveTarget` still calls it too, which is free.
- A valid `ref` call adds nothing to the page-call sequence: `fe-actions` (40 tests), `trusted-input` (15)
  and `inject` (18) are green against the unchanged `fe-cdp-baseline.json`.

### Mutations (my own sample; each file restored and confirmed identical with `cmp`)

| # | Mutation | Result |
|---|---|---|
| R1 | lost-reply branch → `false` | 3 fail |
| R2 | INTERNAL without the sweep | 3 fail |
| R3 | sweep on any absent status (kind ignored) | 3 fail (the json/undefined rows) |
| R4 | no `frameTeardownAsStale` | 3 fail |
| R5 | no `No frame with id` pattern | 1 fail |
| R6 | every INTERNAL treated as stale | 1 fail |
| R7 | locator arm after `networkIdle` (old V10) | 1 fail |
| R8 | `locate` validates after `ensureContent` | 1 fail |
| R9 | `inTargetTab` without `checkTarget` | 3 fail |
| R10 | `click` without `checkTarget` | 8 fail |
| R11 | `pressKey` without `checkTarget` | 1 fail |

Eleven of eleven were killed.

### Unchanged checks

- **S2.4:** `grep -rnE "console\.(log|warn|error)\(.*(url|href)" extension/src` printed nothing and
  exited 1. The widened F20 form still finds only the length-only `evaluate.ts:36`, which also exists at
  a3ac169.
- **Protected files:** `git diff a3ac169 --stat` over `fe-actions.test.ts`, `fe-harness.ts`, `fixtures/`,
  `trusted-input.test.ts`, `snapshot.test.ts`, `debugger.ts`, `trusted-input.ts`, `result.ts` and
  `shared/` printed nothing. `inject.test.ts` is still +29/−0 and `methods.test.ts` +44/−0, so S2.5 and
  S2.6 hold as in round 0.
- **Still open, for S3/S5 as ruled:** finding 4 (F22) and NITs 6–9.

### Verdict (round 1)

**PASS-with-notes.** Every CRITICAL or MAJOR finding is fixed, every exit check passes, and every new
test fails without its fix. The notes are finding 4 (the SDK and MCP must send call `timeoutMs` = wait
+ slack), NITs 6–9, and the new error-page NIT.
