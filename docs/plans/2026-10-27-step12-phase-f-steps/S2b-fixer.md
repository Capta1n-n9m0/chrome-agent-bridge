# S2b — fixer report, round 1

Role: fixer (`docs/agent-rules.md` §6), Opus, medium. Findings fixed: S2b-verifier.md F1 and F3 (the `docs/setup.md`
troubleshooting NIT). F2, F4, F5 not touched (the session agent's). Layer followed: the verifier's findings as written.

## 1. Changes

- `mcp/test/s12-args-cross.test.ts`, test B2.3 (no-feature extension): one more call,
  `browser_evaluate({expression: "(a) => a", args: SENTINEL, saveTo: <root>/m.json, tab})` → rejects `VERSION` with
  "reload it at chrome://extensions"; no `m.json`, no `m.json.part`; the existing `ext.evaluateCalls()` is `[]` check
  now runs after it (0 `evaluate*` frames). Writes only in the test's `mkdtemp` root, removed in `afterEach`; port 0.
- `docs/setup.md` (Troubleshooting row, ~line 1249): the row now names both daemon texts — `RELOAD_HINT` as before,
  and `ARGS_RELOAD_HINT` ("…an older build without evaluate args — reload it at chrome://extensions") for an evaluate
  call with `args`. Both quotes are substrings of the texts in `daemon/src/intercept.ts:37-41`.

## 2. Mutant M7 (proved red, then restored)

Deleted the line `            ...argsPart,` (one match) from the `saveEvaluateToFile` options in
`mcp/src/tools/registry.ts`; `npx vitest run mcp/test/s12-args-cross.test.ts` → `Tests 1 failed | 2 passed (3)`,
B2.3 failing with `expected Error: wrote 0 bytes … to match object { code: 'VERSION', … }` (the call reached the fake).
Restored from a copy; `sha256sum -c` on the pre-mutation hash → `mcp/src/tools/registry.ts: OK`.

## 3. Checks

| Command | Result |
|---|---|
| `npx tsc -p mcp/tsconfig.json --noEmit` | exit 0 |
| `npx vitest run mcp sdk daemon` | Test Files 64 passed (64); Tests 1121 passed (1121) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; `git status --porcelain` identical before and after |

## 4. Proposed decisions

None.
