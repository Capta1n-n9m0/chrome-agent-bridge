# Step 12 S2a — builder report (`args` for evaluate: the guard, the call form, the bound, the hello feature)

Model / effort: Opus, medium. Commit: none (brief). Layer followed: the phase doc's Stage 0 note and decisions
#330–#332 over 0.4 where they differ (`agent-rules.md` §4).

## 1. Verdict

**DONE-PARTIAL by the size rule only** (`agent-rules.md` §7, #320): every item of the brief is built and every exit
criterion below is met, nothing remains to build, but the slice is 1083 new lines against a 450 cap (code 399, under the
cap; tests 684). The overrun is tests. The step agent decides whether to accept it as a deviation or split it (§4).

## 2. Outputs

**Counts** (commands run by me):
- `npm test` before (at `2286036` + other agents' doc edits): `Test Files 191 passed (191)`, `Tests 4665 passed (4665)`.
- `npm test` after: `Test Files 194 passed (194)`, `Tests 4728 passed (4728)` — +63 tests, +3 files, none removed
  (23 in `protocol-step12.test.ts`, 15 in `s12-args-call.test.ts`, 24 in `s12-args-cdp.test.ts`, 1 in `log-sentinel.test.ts`).
- `npx tsc --noEmit -p <pkg>/tsconfig.json`: shared 0, daemon 0, sdk 0, mcp 0, extension 0; `npm run typecheck` exit 0.
- `npx tsc --noEmit -p recipes/<each>`: tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b — all exit 0.
- `npm run build` exit 0 (`built extension → dist/`); `git status --short` after it shows no tracked change from the build
  (the only other tracked changes are `docs/e2e-test-plan.md` and the journal, another agent's work).
- Log sites +0: `log-scan.test.ts` passes against `extension/test/log-allowlist.ts` unchanged (no new `console.*`).

**Size** (`git diff --numstat` + `wc -l`): modified code client.ts +8, debugger.ts +111, save.ts +11, evaluate-save.ts +9,
evaluate.ts +26, protocol.ts +88 = 253; new `call.ts` 146 → **code 399**. Tests: log-sentinel +44, tab-events +4 (4 edited
lines), protocol-step12 90, s12-args-call 214, s12-args-cdp 254, s12-engine-cdp 78 → **tests 684**. Total 1083.

**The exact shapes:**
- Hello field: `features?: string[]` on `HelloMessage`; `isHello` refuses a present `features` that is not an array of
  strings (loop check, so a hole fails). `helloFrame(token, session?)` always sends `features: ["evaluateArgs"]`
  (`EXTENSION_FEATURES` in `client.ts`, from `FEATURE_EVALUATE_ARGS = "evaluateArgs"` in `protocol.ts`); proto stays 2.
  Today's daemon: `parseHello` (`daemon/src/handshake.ts`) checks only the known keys through the old `isHello`, which
  reads no unknown key, so a hello with `features` is accepted — no STOP.
- Guard: `export function checkEvaluateArgs(args: unknown): EvaluateArgsCheck` with
  `type EvaluateArgsCheck = { ok: true; json: string } | { ok: false; message: string }` and
  `EVALUATE_ARGS_MAX_BYTES = 1_048_576` (UTF-8 bytes of the JSON). `EvaluateSaveStartParams` gains `args?: unknown`.
- Refusal messages (all `BAD_PARAMS`, no `data`):
  - `args: the value holds undefined, which JSON cannot carry — use null, or leave the key out`
  - `args: the value holds a function, which JSON cannot carry — pass plain JSON data`
  - `args: the value holds a symbol, which JSON cannot carry — pass plain JSON data`
  - `args: the value holds a BigInt, which JSON cannot carry — pass it as a string or a number`
  - `args: the value holds NaN or an infinite number, which JSON turns into null — pass null or a string`
  - `args: the value holds a cycle (an object that contains itself), which JSON cannot carry`
  - `args: JSON.stringify threw on the value (a throwing toJSON or getter) — pass plain JSON data`
  - `args: the value is <n> bytes as JSON, over the 1 MiB cap (1048576 bytes)`
  - inside the session (marked own refusal, unprefixed): `args: with args, expression must be a function source such as "(a) => a.rows.length"; it evaluated to <type>` (`<type>` is CDP's lowercase type word, else "something else").

**What runs** (`extension/src/evaluate/call.ts`, `callWithArgs`): `Debugger.enable` → `setBreakpointsActive {active:false}`
→ `Runtime.evaluate {expression: "(" + source + "\n)", no replMode, timeout, userGesture}` → must be `type: "function"` →
`Runtime.getProperties` `[[FunctionLocation]].scriptId` → `Runtime.evaluate "globalThis"` → `Runtime.callFunctionOn
{objectId: global, functionDeclaration: CALL_WRAPPER_SRC, arguments: [{objectId: fn}, {value: json}], awaitPromise,
userGesture}` raced by `raceTimeout`; on its TIMEOUT: `Debugger.pause`, `waitPaused` ≤ 500 ms, own scriptId →
`resume {terminateOnResume:true}`, else plain resume, no event → nothing; the race's TIMEOUT re-thrown. `then` (the
serialiser, or `collectSaveFromRaw`) runs before `Debugger.disable`, which runs in a `finally` (each stop/disable command
bounded 500 ms, failures swallowed). `debugger.ts` adds `evaluateFunctionInPage`, `evaluateFunctionToSave`, a per-wait
`chrome.debugger.onEvent` listener (`waitPaused`, removed on both outcomes, filtered by tabId), and `serializerCall`
(extracted from `evaluateInPage`, same commands). Handlers: `evaluateArgsJson(p)` (key present → guard → JSON) before the
tab read; `asRef` takes a runner, so `{args, asRef}` reuses today's mark/ref/sweep path.

**Exit criteria → tests:** B2.1 value only in the wrapper's 2nd argument, never in an `expression`/`functionDeclaration`;
round-trip table (nested, Unicode, numbers, null in properties, arrays, key order) + null top-level + `{args, asRef}` +
`{args, saveTo}`, run through the real wrapper source in this engine (`s12-args-cdp.test.ts`); refusals undefined,
function, BigInt, cycle, > 1 MiB through both handlers with attach 0 / CDP 0, and the full table in
`protocol-step12.test.ts`. B2.2 `JS_DISABLED` through `GatedRouter` + real `CallSafety` + real handlers for `evaluate
{args}`, `evaluate {args, asRef}`, `evaluateSaveStart {args}`: attach 0, detach 0, sendCommand 0, with a JavaScript-on
control. Bound: order, terminate/plain/no-event, no location, hanging stop steps, deadline before the call, disable on
success/page exception/CDP error/enable failure/syntax error/not-a-function (`s12-args-call.test.ts`); through
`debugger.ts` the deadline answer equals `evaluateInPage`'s timeout answer, the listener count returns to 0, and both
"Execution was terminated" forms give `{TIMEOUT, timeoutMessage(ms)}`. Hello: guard valid/absent/non-array/non-string
member; `helloFrame` test. Sentinel: `log-sentinel.test.ts` drives success, page throw, not-a-function, oversize,
function, saveTo and the deadline stop with a sentinel in `args` and in the paused frame; 0 occurrences, capture live.
Mutants run by me: `args` appended to the source expression → 8 red; the deadline stop disabled → 5 red.

**Files.** Spec note: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (§10, the "Amended 2026-10-27 (Step 12
S2a …)" note; commit it before the code, B2.4). Code: `shared/src/protocol.ts`, `extension/src/evaluate/call.ts` (new),
`extension/src/debugger.ts`, `extension/src/evaluate/save.ts`, `extension/src/handlers/evaluate.ts`,
`extension/src/handlers/evaluate-save.ts`, `extension/src/client.ts`, `shared/test/protocol-step12.test.ts` (new),
`extension/test/s12-args-call.test.ts` (new), `extension/test/s12-args-cdp.test.ts` (new), `extension/test/s12-engine-cdp.ts`
(new helper), `extension/test/log-sentinel.test.ts`, `extension/test/tab-events.test.ts`.

## 4. Deviations

- **Size:** 1083 lines vs 450 (2.4×); code 399 within the cap, the extra is tests (§1).
- **`tab-events.test.ts`: four existing hello assertions edited** to add `features: ["evaluateArgs"]` (the hello now
  always carries it, by #332). Not an evaluate, save or safety test; the brief's "no edits" rule covers those, which are
  unchanged. The alternative (send `features` only when a third argument is passed) would leave `helloFrame`'s default
  frame without the feature.
- `save.ts`: `collectSaveText` now delegates steps 2–5 to the new `collectSaveFromRaw` (same commands, same order).
- No e2e rows: `waitPaused` and the two new `debugger.ts` wrappers are `chrome.*` glue; `docs/e2e-test-plan.md` is outside
  this lane — the R19-ARGS rows (S7) must cover the live pause-terminate and the no-global check.

## 5. Proposed decisions

### 2026-10-27 · S2a: the args guard's refusal set and texts
**Decided:** `checkEvaluateArgs` stringifies with a replacer that refuses undefined, function, symbol, BigInt and
non-finite numbers wherever they sit (after `toJSON`), maps a cyclic `TypeError` to the cycle text and any other throw to
a fixed text; size counted as UTF-8 bytes; the eight texts of §2. A `Map` or class instance passes as its JSON. **Why:**
"survives `JSON.stringify`" read as nothing dropped or nulled; texts name type or size only. **Instead of:** refusing every
non-plain object (would refuse `Date`). **Revisit if:** S2b's SDK finds a value users pass that this refuses. **By:** Claude (proposed)

### 2026-10-27 · S2a: the source runs as `(source\n)` without replMode; a non-function is refused
**Decided:** the source is evaluated in parentheses (a function declaration becomes an expression: no page global; the
newline keeps a trailing `//` comment harmless), no `replMode`, with `timeout`; anything but `type: "function"` is
`BAD_PARAMS` (marked own refusal). **Why:** measured form evaluated the bare source, which for `function f(a){}` yields
undefined and declares a global. **Instead of:** the bare source. **Revisit if:** a live row shows a source form that breaks. **By:** Claude (proposed)

### 2026-10-27 · S2a: a 500 ms paused wait, the listener per wait, the stop steps bounded
**Decided:** `PAUSE_WAIT_MS = 500` for the paused wait and as the bound of each of `pause`, `resume`, `disable`; the
`onEvent` listener is added at the deadline and removed on event or timeout; no paused event → no resume. **Why:** m3
measured ~60 ms; the bounds keep the stop under the daemon's +5 s margin. **Instead of:** a top-level listener (F7).
**Revisit if:** R19 measures a pause slower than 500 ms. **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed. Not measured: the stop path in real Chrome (S7's row); a hung `Debugger.disable`.
- Fact for the verifier: a `raceTimeout` TIMEOUT reaches the wire as `[chrome.debugger] Timed out after …` (own code kept,
  message prefixed) on both today's path and the `args` path — asserted equal, not changed.

## 7. Handoff

No processes left running; no port used beyond the existing port-0 tests. S2b needs: `FEATURE_EVALUATE_ARGS` and
`checkEvaluateArgs` from `@bridge/shared` for the daemon's VERSION rule and the SDK's precheck. A loaded extension needs
`npm run build` + reload before any live row.
