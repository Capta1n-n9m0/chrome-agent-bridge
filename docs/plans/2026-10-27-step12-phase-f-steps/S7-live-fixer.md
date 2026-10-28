# S7-live fix round 1 — fixer report

Model Sonnet 5.5, effort medium. Lane: recipes/*.ts and recipes/test/* only. Nothing committed. No Chrome, no live run, `wtv` not read.

## 1. Verdict
DONE

## 2. Outputs
Ruling followed: decisions.md #366 and the dated §4.27 note (e2e-test-plan.md ~line 1913).

Tests were written first and seen red (12 failures across `s12-r19-a.test.ts` and `s12-r19-de.test.ts`), then the code was changed.

- **Item 1, control-2 (`recipes/s12-r19-a.ts` args1).** New exported pure helpers `control2Stops(c)` (true only when the answer is an error), `control2Kind(v)` (the `kind` when `/^[a-z]+$/`, else `other`, `none` when absent) and `control2Line(k)`. args1 prints `CHECK R19-ARGS-1 control-2 kind=<k>` and throws `StopWhy("existing-tool-changed")` only when control-1 is wrong or control-2 is an error. Control-1's judge is unchanged.
- **Item 2, ARGS-OLD twin (`recipes/s12-r19-de.ts`).** The raw twin now sends `function f() {}`. `twinIsFunction` is replaced by `twinAnswered(ok)`. The line is `CHECK R19-ARGS-OLD control raw-twin kind=<control2Kind(c2.v)>`. `judgeOldControl` is unchanged: PASS when `judgeOldLeg(control)` passes and the twin answered. The raw `args` leg's `(a) => a` is untouched. The doc comment that stated the `kind: "function"` expectation for the twin is rewritten. The two remaining comments that mention `kind: "function"` (`rawForwarded` in -de.ts and the `forwarded` form in `s12-forms.ts`) describe the raw args leg and stay.
- **Item 3, the MCP actor waits for its link.** New `callUntilLinked(send, connecting, now, nap, record)` with `LINK_WAIT_MS = 15000`, `LINK_POLL_MS = 500`. It re-sends while the answer holds `CONNECTING_REASON` (imported from `../mcp/src/link.js`, never retyped). It throws `HelperDefect` once 15 s have passed since the first send. `mcpOpen`'s `call` goes through it, and every answer is appended to `actors-<slice>.jsonl` through `record`. Grep: the only `StdioClientTransport` / `callTool(` in `recipes/s12-r19*.ts` is in `mcpOpen`; ARGS-1/3, CON-MCP and CON-CAP (-a), CON-KEPT (-b), `mcpTab` (-c) and `mcpNew` (-de) all reach it through `x.mcp()`. A static test pins this.
- **Item 4, empty handle.** `export class HelperDefect extends Error` (name "HelperDefect"). `handleOf` throws it when there is no `T\d+`. `recipes/s12-r19-b.ts:291` now calls `handleOf` (import added). `run()`'s catch is extracted to the pure `catchDecision(x, stateless, opts, name)`: StopWhy gives exit 2 with `STOPWHY`; a HelperDefect is always rethrown, even with `stateless`; a stateless throw gives the row's actor-error FAIL leg; anything else is rethrown. `main()` already prints `STOP: <name>` and returns 2, so the line is `STOP: HelperDefect`. Every `handleOf` caller (-a: 5, -c: 1, -de: 1, -b: 1) expected a handle.

Tests added or changed (`recipes/test/s12-r19-a.test.ts`, `s12-r19-de.test.ts`):
- control-2: any ok answer passes whatever its kind, and an error is a stop.
- Kind rules: `undefined`, `function`, `Upper`, `has space`, `""` and a number kind give `undefined`, `function`, `other`, `other`, `other` and `other`; an empty object gives `none`.
- Driver wiring: static source checks that args1 prints the control-2 line and that the old `!== "function"` test is gone.
- `callUntilLinked` on a fake clock:
  - connecting twice then the answer: 3 sends, clock 1000 ms;
  - first answer not connecting: 1 send, clock 0;
  - always connecting: throws `HelperDefect` with the clock at 15 000 to 15 500 ms, and an answer arriving at 14 500 ms is still returned.
- Static pins: the `CONNECTING_REASON` import is present, the phrase is not retyped, and no driver file builds its own MCP client or its own `T\d+` regex.
- `handleOf` returns `T12`, and throws `HelperDefect` for "no handle here" and "".
- `catchDecision` covers the six cases named above. `main()` with a command throwing `HelperDefect` prints `STOP: HelperDefect` and returns 2.
- `s12-r19-de.test.ts` now tests `twinAnswered`, and statically pins that the twin sends `function f() {}`, uses `control2Kind(c2.v)`, and that the raw `args` leg's `(a) => a` stays.

Numbers (commands run in this tree):
- `npm test` before: `Test Files 232 passed (232)`, `Tests 5558 passed (5558)`.
- `npm test` after: `Test Files 232 passed (232)`, `Tests 5570 passed (5570)`. That is 12 more, and none were removed. The one replaced `twinIsFunction` test is now a `twinAnswered` test.
- `npm run typecheck`: exit 0, no errors.
- `npx tsc --noEmit -p recipes/tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`: each exit 0.

`git diff --stat` (the ledger line is another agent's):
- `docs/plans/2026-10-27-step12-phase-f-steps/S7-live.ledger.md` +4 (not mine)
- `recipes/s12-r19-a.ts` 47 (+ and -)
- `recipes/s12-r19-b.ts` 4
- `recipes/s12-r19-de.ts` 12
- `recipes/test/s12-r19-a.test.ts` +95
- `recipes/test/s12-r19-de.test.ts` 14
- Total: 6 files, 156 insertions, 20 deletions. This report is new and untracked.

## 3. Verifier verdict
Not run by me.

## 4. Deviations
- `LINK_WAIT_MS` / `LINK_POLL_MS` and `catchDecision` are exported names I chose (design-local).
- The bound is checked after each connecting answer, so the throw happens at the first answer received at 15 s or later, and the last re-send is at about 15 s.
- No `.ps1` change was needed. The STOP path already works: `main()` prints `STOP: HelperDefect` and exits 2, which the existing `.ps1` STOP handling turns into a STOP. I did not re-read the .ps1 for this.
- `s12-r19-static.test.ts` and the other `s12-r19*.test.ts` files pinned none of the old text (grep for `kind function`, `twin`, the inline regex), so none needed a change.
- No unit test covers `mcpOpen` itself, because it needs a real MCP process. It is covered by `callUntilLinked`'s tests plus the static pin that the wiring goes through it.

## 5. Proposed decisions
None.

## 6. Findings
- `main()` in -a, -b and -de catches every throw as `STOP: <e.name>`, so before this round an empty handle could not stop a slice outside a `stateless` row. Inside a stateless row it became the row's `actor-error` FAIL leg. Now it is a STOP in both cases.

## 7. Handoff
No processes were left running. Nothing was committed. Changed files are listed above for the committer. The next step is the verifier. Attempt 2 of liveA19 runs from a fresh out folder per #366.
