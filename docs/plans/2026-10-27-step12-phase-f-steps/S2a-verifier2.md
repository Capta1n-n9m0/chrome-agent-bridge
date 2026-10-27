# S2a verifier — re-check after fix round 1 (F1, F2)

Role: verifier (`docs/agent-rules.md` §6), Opus, medium. Scope: F1 and F2 of `S2a-verifier.md` only. Read and run
only; port 0; no Chrome, no daemon. Nothing committed.

**Verdict: PASS** for F1 and F2.

## F1 · the other-tab event test now discriminates — fixed

The tab-99 `Debugger.paused` event in the "at the deadline" test (`extension/test/s12-args-cdp.test.ts:192`) now carries
`scriptId: "other"`.

I ran mutant h myself. First I saved `extension/src/debugger.ts` to the scratchpad (`debugger.ts.v2save`). Then I
changed `debugger.ts:250` to `if (method === "Debugger.paused")`:

```
npx vitest run extension/test/s12-args-cdp.test.ts
FAIL … > at the deadline: pause → paused in the function's script → terminate; …
AssertionError: expected [ {} ] to deeply equal [ { terminateOnResume: true } ]
Tests  1 failed | 23 passed (24)
```

I restored the file from the saved copy, and `cmp` printed `IDENTICAL`. The re-run gave `Tests 24 passed (24)`.
`debugger.ts` is also byte-identical to verifier 1's snapshot (`scratchpad/orig/extension/src/debugger.ts`), so neither
the fixer's mutant nor mine left a change behind.

## F2 · the spec sentence is true of the code — fixed

The sentence, in the §10 S2a note of `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, says three things. The
source is evaluated as `(<source>\n)`. So `"(a) => a.n;"` is a syntax error there. It answers `PAGE_ERROR`, not the
not-a-function refusal. The code bears out each one:

- **The parentheses:** `functionSourceParams` (`extension/src/evaluate/call.ts:46-48`) builds
  ``expression: `(${source}\n)` ``.
- **The order of the checks:** `callWithArgs` checks `exceptionDetails` before the type check.
  `call.ts:117` is `if (fnRaw.exceptionDetails) throw pageError(fnRaw.exceptionDetails);`. The `BAD_PARAMS`
  `notAFunctionMessage` check comes after it, at `:118-121`.
- **The error code:** `pageError` (`extension/src/evaluate/result.ts:82-91`) returns
  `new BridgeError(ErrorCodes.PAGE_ERROR, …)`.
- **The syntax error:** in node, `(0,eval)("((a) => a.n;\n)")` throws `SyntaxError`. Without the `;`, the same form
  gives `function`.

The function name the sentence cites, `functionSourceParams`, exists.

## The fixer touched only the two files

Verifier 1's snapshot of the S2a files is `scratchpad/orig/` (taken at 19:38). I compared it with `cmp` against the
current tree:

- 12 of the 13 files are identical: `client.ts`, `debugger.ts`, `evaluate/call.ts`, `evaluate/save.ts`,
  `handlers/evaluate.ts`, `handlers/evaluate-save.ts`, `shared/src/protocol.ts`, and the tests `log-sentinel`,
  `tab-events`, `s12-args-call`, `s12-engine-cdp` and `protocol-step12`.
- Only `extension/test/s12-args-cdp.test.ts` differs, and by line 192 alone (shown by `diff`).
- The snapshot did not include the spec, so I could not diff it. In the §10 note, the new sentence is the only text
  that cites "S2a verifier F2".

`git diff --stat HEAD` on the S2a files shows the same 7 tracked files as before, plus the untracked S2a files. The
fixer added no new file except its report.

## Runs

| Command | Result |
|---|---|
| `npx vitest run extension/test/s12-*.test.ts shared/test/protocol-step12.test.ts` | 3 files, 62 passed |
| `npx tsc --noEmit -p extension/tsconfig.json` | exit 0 |
| `npm test` | 195 files passed, 4744 tests passed, 0 failed (first run, no re-run needed) |

## Handoff

No processes are left. The mutant is reverted (`cmp` IDENTICAL). The scratchpad holds `debugger.ts.v2save`.
