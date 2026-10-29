# S1 fixer, round 1: M1, M2, N1

Role: fixer (`docs/agent-rules.md` §6), Opus, medium. Findings from `S1-verifier.md`. N2 was not in this round's scope.

## 1. What was fixed

- **M1:** the spec's 2026-10-29 §10 note (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`) now has two more
  bullets, written from the code:
  - `listTabs` rows still carry Chrome's own `openerTabId` (`extension/src/handlers/tabs.ts` copies `t.openerTabId`), so
    a row and the tab's `tabCreated` can name different openers. No daemon, SDK or MCP path reads the row's value
    (the Stage0.md §5 #385 text).
  - The limit: a service-worker restart inside the 250 ms hold loses the held `tabCreated` itself, not only its grant.
    The daemon then learns of the tab from its next `listTabs` reply, which mints a handle leased to nobody
    (`daemon/src/intercept.ts` `record()` mints every row; `opener-join.ts` header).
- **M2:** a new static test in `extension/test/s3a-dnr-wiring.test.ts` ("a removed or replaced tab releases its held
  tabCreated before its own event"). It finds the listener that builds the event (the `onRemoved` listener holding
  `tabRemovedParams(`, since `sw.ts` has an earlier `onRemoved` listener too; the `onReplaced` one holding
  `tabReplacedParams(`). In each, `openerJoin.gone(` must come before the params builder, the event name and
  `sendTabEvent(`.
- **N1:** the listener-count test is retitled "the listener count is 21; …".

## 2. Red proof for M2

The main tree's `sw.ts` was only read. A scratch script applies the pin's logic to the real `sw.ts` and to two mutants
held in memory (script: `S1-fixer1-red-script.txt`; output: `S1-fixer1-red.txt`):
- original: GREEN
- mutant A, V13 (`gone` moved after the `tabRemoved` send): RED, 3 checks failed
- mutant B (the same swap in `onReplaced`): RED, 3 checks failed

The first version of the pin went red on the original. It had sliced from the first `onRemoved` listener (line 184),
not the one that sends `tabRemoved` (line 248). The final pin anchors on the listener that holds the builder.

## 3. Exit checks

- `npm test`: `Test Files 236 passed (236)`, `Tests 5617 passed (5617)`, exit 0 (5616 + 1 new test; none removed).
  Evidence: `S1-fixer1-test.txt`.
- `npm run typecheck`: exit 0 (`S1-fixer1-typecheck.txt`).
- `npm run build`: exit 0 (`S1-fixer1-build.txt`).
- The tracked tree is the same before and after the build (`S1-fixer1-status-before.txt`, `S1-fixer1-status-after.txt`).
  The only tracked files changed by this round are the spec and `s3a-dnr-wiring.test.ts`.

## 4. Proposed decisions

None. No product code changed.
