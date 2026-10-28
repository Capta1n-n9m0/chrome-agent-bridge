# Step 12 S4b — the kept debugger session: wiring the keeper (builder)

Model / effort: Opus, medium. Date 2026-10-28. Role: builder (`docs/agent-rules.md` §6). Slice start `c9bb6cb` (the
S4a keeper); HEAD `547944a`. No commit (brief). Mutant and pre-slice outputs: scratchpad `mutants.txt`, `preslice.txt`
(quoted below).

## 1. Verdict

**DONE.** Every CDP use goes through the keeper. D4.1–D4.3 hold through the wiring, and D4.4's diff is empty. Each
required mutant is red. V4-1 is fixed, V3-4 is settled by argument plus a live row, and the size is under the cap.

## 2. Outputs

**Changed files** (`git diff --numstat`, added/removed):

| File | + | − | What |
|---|---|---|---|
| `extension/src/debugger-keeper.ts` | 72 | 3 | V4-1's fix (`settled`: `if (this.detaching.get(tabId) === p) return;`, with the unused `done` removed); new pure wiring parts: `within` (a source bound), `UseCommands`, `pageChanged`, `keptTabRefusal`, `KEEPER_TAB_CHECK_MS = 1000` |
| `extension/src/debugger.ts` | 47 | 3 | `keepSessions(tabCheck)` builds the one keeper on `debuggerSessions`. `tabCheck` and the sweep's `getTargets` are each bounded by `within` at 1 s. `withDebugger` → `keeper.use(tabId, …, {guard, mapError})` when a keeper is installed. `send` is exported, and inside a kept use it tracks each command (`UseCommands`) |
| `extension/src/sw.ts` | 15 | 1 | `const keeper = keepSessions((id) => keptTabRefusal(callDeps, id)); void keeper.sweep();` at the top level. `tabs.onRemoved` (the first one) → `tabGone`. `onReplaced` → `tabGone(removedTabId)`. `onUpdated` → `recheckTab` when `pageChanged`. `storage.onChanged` (the safety branch) → `recheckAll`. `onDetach` → `keeper.onDetach` (its log line unchanged). The disarm line and `onArm` are unchanged |
| `extension/src/handlers/console.ts` | 2 | 2 | its `Runtime.enable/disable` go through `debugger.ts`'s `send`, so they are tracked (same `sendCommand({tabId}, method, {})`) |
| `extension/test/s4b-keeper-wiring.test.ts` | 260 | 0 | new, 11 tests |
| `docs/setup.md` | 8 | 4 | the banner sentences only (§ The debugging banner; § Running JavaScript, "The banner.") |

**Size (#344 (4)).** Code is 136 lines added (cap 250). Tests are 260 (cap 375).

**Files whose CDP calls route through the keeper:**
- With no change of their own, through `withDebugger`: `debugger.ts`'s eight callers (trusted input, the two screenshots,
  `evaluateInPage`, `evaluateFunctionInPage`, `evaluateToSave`, `evaluateFunctionToSave`, `uploadByMark`), which
  serve `handlers/{actions,perceive,evaluate,evaluate-save,upload}.ts`. `evaluate/call.ts`, `evaluate/save.ts` and
  `upload-files.ts` send through the `send` they are handed.
- With a two-line change: `handlers/console.ts`.

**Tests and checks:**
- `npx vitest run` before: `Test Files 210 passed (210)`, `Tests 5010 passed (5010)`.
- After: `Test Files 211 passed (211)`, `Tests 5021 passed (5021)`. That is +11, and none removed.
- `npx vitest run extension` with the wiring and before the new file: `2454 passed (2454)`. So every existing
  debugger, evaluate, save, upload, console and trusted-input test passes unchanged.
- One static test (`s4-save-gate.test.ts:194`) matches the `onRemoved` body. It failed while I had put `tabGone` first;
  I moved my line after `dropEvaluateSavesForTab`, and the test was not touched.
- Per-package `tsc --noEmit` (shared, daemon, sdk, mcp, extension): exit 0. `npm run typecheck`: exit 0. All seven
  `recipes/tsconfig*.json`: exit 0. `npm run build`: exit 0, with `git status --short` identical before and after.
- D4.4: `git diff c9bb6cb --stat -- daemon shared sdk mcp` is empty.
- Logs: no new `console.` line. `log-scan`, `safety-gate` and `sw-static` give `Tests 442 passed (442)`; the allowlist
  is unchanged at 54.

**Mutants.** Each was applied, the new file and the keeper file were run (60 tests), and the files were restored; the
SHA-256 values match the pre-mutant copies.

| Mutant | Red test |
|---|---|
| M1: V4-1 reverted | probe T6 |
| M2: **keeper on its own `new DebuggerSessions()` (keeps a session across a disarm)** | D4.2 disarm |
| M3: **`withDebugger` drops `guard` (skips the re-check)** | D4.3 re-check |
| M4: `tabCheck` unbounded | the tab-check bound |
| M5: commands not tracked | failed clean-up |
| M6: sweep's `getTargets` unbounded | sweep bound |

Each mutant gave `1 failed | 59 passed (60)`.

**Pre-slice.** I put `debugger.ts` and `debugger-keeper.ts` back to `c9bb6cb` and ran the new file: all 11 red, then
restored. T6 fails on the behaviour; the other ten fail on missing exports (`within is not a function`, and so on).

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **The keeper is installed by `sw.ts` (`keepSessions`). A module that imports `debugger.ts` without it keeps today's
  `runWithDebugger` path.** I chose this because the existing handler tests import `debugger.ts` over a fake `chrome`,
  and they assert detach-per-call ordering (`log.at(-1) === "detach"`, `detach` = 1). Under the brief, those tests must
  pass unchanged, and with a kept session they cannot. So:
  - production (`sw.ts`) always runs the keeper;
  - the existing tests run the pre-S4b path, which `safety-debugger.test.ts` still covers;
  - the kept path is covered by the new wiring tests and the 49 keeper tests.
  - `runWithDebugger` is therefore kept, not retired.
  - A verifier should weigh this: the existing handler tests no longer exercise the production session path.
- **The four clean-ups that must call `drop()` (S4a Handoff) are met generically, not at each call site.** Inside a
  kept use, `send` tracks every command. One that rejects, or is still pending when the use ends, drops the session.
  This covers `evaluate/call.ts`'s quiet `Debugger.disable` (failure or bound expiry), `console-messages.ts`'s
  `Runtime.disable`, focus emulation off (tested), the upload's `Runtime.releaseObject`, and any raced loser. No
  callee changed, so none of their tests changed. Cost: a page whose `getProperties` fails (a bound or native
  function, `args` path) ends its session at the call's end, as before S4b.
- The optional "post-check refusal → `keeper.recheckTab`" was not wired. A page that becomes refused is already seen
  by `onUpdated` or `storage.onChanged`, and by the keeper's own fresh-use check.

## 5. Proposed decisions

### 2026-10-28 · S4b: the keeper is installed by the worker; tests importing `debugger.ts` alone keep the per-call session
**Decided:** `keepSessions` is called once at the top level of `sw.ts`. Without it, `withDebugger` runs
`runWithDebugger` as before. **Why:** the existing handler tests pin per-call detach ordering, and D4.4 forbids
changing them. **Instead of:** rewriting those assertions for a kept session. **Revisit if:** a verifier finds a
production path that bypasses the keeper. **By:** Claude (proposed)

### 2026-10-28 · S4b: a CDP command that fails or is unfinished at a use's end drops the kept session
**Decided:** `UseCommands` in `withDebugger` stands in for a `drop()` at each clean-up site. **Why:** it is one
mechanism for every state a use can leave, including future features (E's interception), and it fails closed.
**Instead of:** a `drop()` call in each of the four callees. **Revisit if:** a live row shows sessions churning on a
common path. **By:** Claude (proposed)

### 2026-10-28 · S4b: V3-4 is left as is, under F5's Revisit-if
**Decided:** no code change for V3-4. **Why:** it needs an attach slower than 1 s **and** a kill landing during it.
m2 D1 measured the attach at about 0.2 ms of cost (0.8 ms median), and it fails closed (a later call answers
`DEBUGGER_CANCELLED`, nothing is left attached). V4-1's fix does not change it. **Instead of:** tracking
attach-then-detach as one pending detach (more keeper code for an unmeasured order). **Revisit if:** KEEP-2 measures a
detach or attach over 1 s. **By:** Claude (proposed)

### 2026-10-28 · S4b: the keeper's tab check is a class-`tab` gate at phase `effect`, bounded at 1 s
**Decided:** `keptTabRefusal` = `safetyDecision("snapshot", {tabId}, resolveTabTarget(…), …, "effect")`. It refuses on
disarmed, own page, `file:` or blocked. JavaScript off does not refuse, because the evaluate is refused by its own
guard and #347 keeps the session. An unreadable state or a 1 s timeout counts as a refusal, so the session is
detached. **By:** Claude (proposed)

## 6. Findings

**Each feature's CDP domain state at the end of its call** (brief item):
- **S2a `Debugger`** (`evaluate/call.ts:142-145`): `Debugger.disable` runs in a `finally` on every path, through
  `quiet` (bounded, failure swallowed). It now drops the session on a failure or a bound expiry. `setBreakpointsActive
  false` is re-sent at every enable.
- **S3a `Runtime`** (`console-messages.ts:82-89`): `Runtime.disable` runs in a `finally`, failure swallowed, and now
  drops the session. **Not measured:** that a second `Runtime.enable` *in the same session* replays the stored
  messages again (C7 measured it in a second session). It needs a live row; otherwise a repeated
  `browser_console_messages` could answer with fewer entries.
- **Trusted input** (`debugger.ts` `runTrustedInput`): focus emulation off in a `finally`. A failure keeps its warn
  line, which stays true because the drop detaches.
- **Upload** (`upload-files.ts`): enables no domain; `Runtime.releaseObject` runs in a `finally`. Whether a
  `Page.createIsolatedWorld` world is bound to the session is not known. Each call makes a new world with the same
  name.
- **Screenshots and plain evaluate:** no domain enabled.
- **Remote object handles** outlive a use in a kept session: the `args` path's function object, and an object left
  when the serialiser throws. They are released by a navigation or the session's end, no longer at the call's end.
  Memory only; no answer changes. This is a candidate for a follow-up (an `objectGroup` per use, released at its end).

Other findings:
- **V4-1 is fixed and pinned by T6.** It is red on the revert (M1) and on `c9bb6cb`. The 49 keeper tests are
  unchanged and green.
- No pre-registered check failed. No new runtime fact: nothing ran against Chrome.

## 7. Handoff

No process is running and no port is bound. The scratch copies are in the session scratchpad, not in the repo.

**Live rows needed** (for §4.27; I did not edit `docs/e2e-test-plan.md`):
- **KEEP-1:** sequential calls of every CDP tool on one tab: one attach, a steady banner, answers as today.
- **KEEP-2:** the detach time after the last call (5 s bound), with the banner gone about 5 s later. Record Chrome's
  attach and detach durations, which is V3-4's and V4-1's Revisit-if.
- **KEEP-3:** with an idle kept session:
  - a disarm detaches it and the next call answers `DISARMED`;
  - a block-list edit that blocks the tab detaches it;
  - navigating it to a blocked, own or `file:` page detaches it;
  - closing the tab, and a Memory-Saver replace, each end the session.
- **KEEP-4:** the banner's Cancel, and DevTools opened on a kept tab: `onDetach`, and the next call attaches again or
  answers `DEBUGGER_DEVTOOLS`.
- **SWEEP-HELD (#335):** a worker start while another client (DevTools, another extension) holds a tab. Record the
  sweep's detach error text, and that it has no side effect on that client.
- **DEVTOOLS-NOFLAG (#339):** re-measure "DevTools open → attach throws" in the real profile, without
  `--enable-unsafe-extension-debugging`.
- **CON-KEPT:** two `browser_console_messages` in one kept session return the same entries (the same-session
  `Runtime.enable` replay).
- **OVERLAP:** two overlapping CDP calls on one tab: the second answers `DEBUGGER_DEVTOOLS` (#335).

For the verifier: the `docs/setup.md` banner sentences cite Stage 0's measurement (5.0–5.2 s); the 10 s total awaits
KEEP-2.
