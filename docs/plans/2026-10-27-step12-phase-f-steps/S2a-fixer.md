# S2a fixer — fix round 1 (F1, F2)

Role: fixer (`docs/agent-rules.md` §6), Opus, medium. Lane: `extension/test/s12-args-cdp.test.ts` and the S2a note in
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10. No product code changed. Nothing committed.

## F1 · the other-tab paused event now discriminates

`extension/test/s12-args-cdp.test.ts` (the "at the deadline" test, about line 192): the tab-99 `Debugger.paused` event
now carries `scriptId: "other"` instead of `FN_SCRIPT`. Without the tabId filter, `waitPaused` takes that event first.
Its frame is not the function's script, so the call resumes without `terminateOnResume`, and the test fails.

Proof (mutant h, made by hand). I saved a copy of `extension/src/debugger.ts`, then changed line 250 to
`if (method === "Debugger.paused")`:

```
FAIL extension/test/s12-args-cdp.test.ts > the bound through debugger.ts: pause, terminate, today's TIMEOUT > at the deadline: …
AssertionError: expected [ {} ] to deeply equal [ { terminateOnResume: true } ]
 ❯ extension/test/s12-args-cdp.test.ts:199:41
Tests  1 failed | 23 passed (24)
```

I restored the file by copying the saved copy back. `cmp` against the saved copy prints `IDENTICAL`, so the
builder's uncommitted diff of `debugger.ts` is unchanged. Then:

```
npx vitest run extension/test/s12-args-cdp.test.ts   → Test Files 1 passed (1); Tests 24 passed (24)
npx tsc -p extension/tsconfig.json --noEmit          → exit 0
```

## F2 · the spec note says "no trailing `;`"

I added one sentence to the S2a note in §10, after "a syntax error is today's `PAGE_ERROR`". It says the source is
evaluated as the parenthesised expression `(<source>\n)`. So the source must be a single function expression with no
trailing `;`. A source such as `"(a) => a.n;"` is a syntax error there and answers `PAGE_ERROR`, not the not-a-function
`BAD_PARAMS`.

The code shows why it is `PAGE_ERROR`. In `callWithArgs` (`extension/src/evaluate/call.ts`), the step that evaluates the
source first checks `fnRaw.exceptionDetails` and throws `pageError(...)`. `pageError` (`extension/src/evaluate/result.ts:82`)
builds a `PAGE_ERROR`. The `BAD_PARAMS` not-a-function check runs only after that.

## Full suite

`npm test` (this round): 195 files, 4744 passed, 0 failed (checked with the JSON reporter).

The builder had 4728 tests in 194 files. I added no test, so the difference comes from other agents' uncommitted
files in the same tree. `recipes/s12-win.ps1` and an edit to `recipes/s11b.ts` both appeared during this round. One
earlier run in this round showed `1 failed | 194 passed (195)` files with all 4728 tests passing. The re-run was all
green, so that run most likely caught another agent's file in the middle of an edit. I did not open or touch those
files.

## Proposed decisions

None.
