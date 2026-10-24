# S5 — fixer round 1 (2026-10-23)

Findings from `S5-verifier.md` §Findings, with the step agent's rulings. Lane: `mcp/src/`, `mcp/test/`,
`docs/setup.md`, `docs/e2e-test-plan.md`. No `sdk/src` change. Nothing live was run. Nothing committed.

## Per finding

| # | Status | Diff summary |
|---|---|---|
| 1 (MINOR) | fixed | `mcp/src/tools/registry.ts` `failureReport`: after `err.report()`, when `err.message` contains `\n` or is longer than `REPORT_MESSAGE_CHARS` (300, the cap `renderReport` applies in `sdk/src/error.ts`), the text item gets `\nFull message:\n<err.message>` appended. The attach still happens for every attach code (PAGE_ERROR included, snapshot and screenshot kept). New test in `mcp/test/tools.test.ts` ("a multi-line message keeps its lines …"): a `PAGE_ERROR` from `browser_evaluate` with a 3-line message → the text starts with `report()`, contains `\nFull message:\n<msg>` and each of the three lines intact; a one-line `LOCATOR_NOT_FOUND` click → no `Full message:`. Docs: one sentence in `docs/setup.md` §Failure reports (PAGE_ERROR reported this way; refs renumbered; ~1.5 s flash; a multi-line message follows under `Full message:`); a note appended to row REP-1 in `docs/e2e-test-plan.md` §4.18 (row not run yet). |
| 5 (NIT) | fixed | `browser_wait_for` with a locator now also rejects `idleMs`; message is `browser_wait_for: locator waits alone — drop text, seconds, networkIdle and idleMs`. The existing test loop gains `{ idleMs: 800 }` and the new message; it still asserts no call was made. |
| 7 (NIT) | fixed | `RegisterToolsOptions` gains optional `attach?: typeof attachContext` (default `attachContext`, so the default path is unchanged); `failureReport` calls `attach(...)`. New test ("an attach code whose attach step left no report() …"): an `attach` stub that does nothing → the click's `LOCATOR_NOT_FOUND` is rethrown as the same object with today's text, `report` undefined, the stub called once, only `click` reached the bridge (no image, no attach calls). |

## Each new test fails without its change

Reverted the code hunk in a scratch copy, ran `npx vitest run mcp/test/tools.test.ts`, restored (cmp-checked):

- #1: `Full message` append replaced by a no-op → `× … a multi-line message keeps its lines in a Full message block …`, 1 failed | 93 passed.
- #5: `|| idleMs !== undefined` and the new message removed → `× … locator with text/seconds/networkIdle, or state without locator, is a tool error with no call`, 1 failed | 93 passed.
- #7: `const attach = attachContext` (option ignored) → `× … an attach code whose attach step left no report() is rethrown unchanged, with no image`, 1 failed | 93 passed.

With the code restored: `mcp/test/tools.test.ts` 94 passed.

## Tails

```
npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
tc exit 0

npm test
 Test Files  79 passed (79)
      Tests  1534 passed (1534)

npm run build
built mcp → dist/index.js
> @bridge/extension@0.1.0 build
built extension → dist/
```

Count: 1532 → 1534 in 79 files (two new tests; the idleMs case extends an existing test).

## Files changed

- `mcp/src/tools/registry.ts`
- `mcp/test/tools.test.ts`
- `docs/setup.md`
- `docs/e2e-test-plan.md`
- `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S5-fixer1.md` (this file)
