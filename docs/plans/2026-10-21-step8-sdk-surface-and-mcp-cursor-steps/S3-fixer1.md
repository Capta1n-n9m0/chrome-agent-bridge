# S3 fixer report, round 1: the SDK's typed Tab, cursor, locators and policy

Fixer: Claude Opus 5.5, 2026-10-23. Input: `S3-verifier.md`, findings 1, 2, 4, 5, 6, 7 and 8. Findings
3, 9 and 10 were not assigned to this round. Lane: `sdk/src/`, `sdk/test/` only. Nothing in
`extension/`, `daemon/`, `mcp/` or `docs/e2e-test-plan.md` was edited. Nothing was committed.

Files changed: `sdk/src/tab.ts`, `sdk/src/client.ts`, `sdk/src/index.ts` (one type-only export
added), `sdk/src/policy.ts` (comment only), `sdk/src/locator.ts`, `sdk/test/tab.test.ts`,
`sdk/test/locator.test.ts`.

## "Fails without the change" evidence

Each fix was reverted on its own by a scripted one-place mutation of the source. I then ran
`npx vitest run sdk/test/tab.test.ts sdk/test/locator.test.ts` (88 tests) and restored the file from a
backup. `cmp` against the backup confirmed the restore.

| Mutation | Result |
|---|---|
| A: scroll direction check off | 1 failed: `scroll({direction: 'left' \| 'right' \| other}) → BAD_PARAMS, no call …` |
| B: `network({id})` guard removed | 1 failed: `the tab-less network({id}) of an old Tab is TAB_UNKNOWN with no frame …` |
| C: `download` guard removed | 1 failed: `the tab-less download of an old Tab is TAB_UNKNOWN with no frame …` |
| D: `evaluateRef` node branch off | 1 failed: `kind node without ref → names an extension older than Step 8 S2; …` |
| E: `tab` key put first again | 1 failed: `network({tab}) and waitFor({..., tab}) still send the Tab's handle` |
| F: `seconds` check off | 1 failed: `waitFor({seconds}) non-finite or negative → BAD_PARAMS, no call` |
| G: old `{name}` wording restored | 2 failed: the locator test and the tab `click({name})` test |

## Per finding

1. **MAJOR, `scroll` left/right: fixed.**
   - A new exported type `ScrollOptions {target?: Target; direction?: "up" | "down"}` is used by both
     `Tab.scroll` and `BridgeClient.scroll`. It is also exported as a type from `index.ts`, so the
     value exports are unchanged and `index.test.ts` stays green.
   - `Tab.scroll` throws `BridgeError(BAD_PARAMS, 'scroll: direction must be "up" or "down" (got …) —
     there is no horizontal scroll')` for any value other than `undefined`, `"up"` or `"down"`. The
     check runs before `normalizeTarget` and before any call.
   - The JSDoc on both methods and on the type says that with a `target`, the extension scrolls the
     element into view and ignores `direction`.
   - Test (`tab.test.ts`): "scroll({direction: 'left' | 'right' | other}) → BAD_PARAMS, no call (the
     extension would scroll down)". It tries `"left"`, `"right"`, `"UP"` and `""` on the Tab, and
     `"left"` through `client.scroll`. All are rejected with no frame sent, and `"down"` still sends.
     It fails under mutation A.
2. **MINOR, untested stale guard on the two tab-less paths: fixed.**
   - Two tests in the 4002 describe: "the tab-less network({id}) of an old Tab is TAB_UNKNOWN with no
     frame" and "the tab-less download of an old Tab is TAB_UNKNOWN with no frame". Each claims a Tab,
     fires close 4002, flushes, then calls the old Tab. It asserts `TAB_UNKNOWN` and 0 frames on the
     new connection.
   - They fail under mutations B and C respectively. These are the verifier's M15 and M16, which are
     now killed.
4. **MINOR, `evaluateRef` misdiagnoses a stale extension: fixed.**
   - When there is no `ref` and `kind === "node"`, the message is `evaluateRef: the extension did not
     return a ref for the node — a loaded extension older than Step 8 S2 ignores asRef and does this;
     reload the extension` (BAD_PARAMS).
   - Other kinds keep `the value is not an Element (kind "…") — no ref to return`.
   - Test: "kind node without ref → names an extension older than Step 8 S2; other kinds → not an
     Element". It asserts both messages, and that neither contains the other's text. It fails under
     mutation D.
5. **MINOR, policy comment: fixed (comment only).** In `policy.ts`, the line "Untrusted … actions
   never focus: they work on a background tab" is replaced by text that says:
   - an untrusted `click`/`type` whose content-script path fails is escalated by the extension to CDP
     input (`extension/src/handlers/actions.ts`);
   - on a background tab that escalation answers ok and does nothing (BG-1/BG-2);
   - the SDK cannot see the escalation;
   - a script that needs certainty passes `trusted: true` (which focuses first) or calls `focus()`.

   No code changed.
6. **NIT, a caller's `tab` key overrides the handle: fixed.**
   - `#send` now builds `defined({ ...params, tab: this.handle })`, and its doc comment says why.
   - The bug was reachable through public methods: `network(options)` and `waitFor(p)` spread
     caller objects.
   - Test: "network({tab}) and waitFor({..., tab}) still send the Tab's handle". It sends a cast
     `tab: "T9"` through both methods and asserts `tab: "T3"` on the wire. It fails under mutation E.
7. **NIT, clamps not documented and `seconds: NaN`: fixed.**
   - `Tab.waitFor` throws BAD_PARAMS (`waitFor: seconds must be a finite number ≥ 0 (got …); the
     extension waits at most 60`) when `seconds` is present and is not finite or is negative. No call
     is made. No other clamps were added.
   - The `waitFor` JSDoc lists the extension's clamps, read from the sources:
     - `seconds` at most 60 (`wait.ts`: `Math.min(Math.max(p.seconds, 0), 60)`);
     - `{text}` gives up at 10 s;
     - locator `timeoutMs` defaults to 10 000 with a ceiling of 60 000 (`wait.ts`
       `LOCATOR_DEFAULT_TIMEOUT_MS`/`LOCATOR_MAX_TIMEOUT_MS`; `locator-wait.ts` holds only the poll
       loop);
     - `idleMs` is clamped to [100, 10 000] with a default of 500, and the idle wait is capped at
       10 s.
   - The `evaluate` JSDoc now states the extension's `timeoutMs` clamp [100, 60 000]
     (`handlers/evaluate.ts` `MIN_TIMEOUT_MS`/`MAX_TIMEOUT_MS`).
   - Test: "waitFor({seconds}) non-finite or negative → BAD_PARAMS, no call". It tries NaN, Infinity
     and -1, then checks that `seconds: 0` still sends with call `timeoutMs` 5 000. It fails under
     mutation F.
8. **NIT, wording: fixed.**
   - The message is now `target: a locator with "name" needs "role" — use {text} or add role (e.g.
     {role: "button", name: …})`. The prefix is `locate`/`waitFor` for `requireLocator`. The
     `normalizeTarget` JSDoc was updated to match.
   - `locator.test.ts` asserts the exact phrase `use {text} or add role`, and so does the tab
     `click({name})` test. Both fail under mutation G.

## Commands (main tree, with S2's in-flight edits present)

```
$ npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck rc=0

$ npx vitest run sdk/
 Test Files  18 passed (18)
      Tests  291 passed (291)

$ npm run build
built daemon → dist/index.js
built mcp → dist/index.js
built extension → dist/
build rc=0
```

The sdk suite went from 285 to 291 tests (+6: scroll, seconds, tab-key, evaluateRef, and the two 4002
guards). The edited locator and tab assertions were changed in place, not added.

## Not done here

- Finding 3 (npx-parent evidence for S3.5) is a report and measurement item and was not assigned.
- Finding 9 (proposed decisions) belongs to the session agent.
- Finding 10 is noted for the E2E wave.
