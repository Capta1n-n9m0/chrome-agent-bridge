# Step 12 S4b — the kept debugger session: wiring the keeper (verifier)

Model / effort: Opus, medium. Date 2026-10-28. Role: verifier (`docs/agent-rules.md` §6). Deviations: none. Read and run
only. Every run was made in a scratch git worktree (HEAD `af56b3a` plus the slice's six files, copied byte-identical, with
its own `npm ci` and no junction). Raw output is in `S4b-verifier-evidence.txt` (§ numbers below refer to it).

## 1. Verdict

**PASS-with-notes.** D4.1–D4.4 hold. Both required mutants are red when I re-run them: a kept session across a disarm,
and a re-check skipped (through the wiring and inside the keeper). Log sites are +0. § Every stage holds, and so do the
size cap and the empty daemon/shared/sdk/mcp diff. No CDP call site bypasses the keeper. I found three MINOR and three
NIT findings, and none of them changes an answer:
- the `sw.ts` wiring has no test at all;
- most feature paths are never run through the keeper in a unit test;
- the re-check runs before the wait on a pending detach.

## 2. Exit checks

| Check | Result | Evidence |
|---|---|---|
| § Every stage: test count | before `Tests 5010 passed (5010)`, 210 files. After `5021 passed (5021)`, 211 files. Per file, the only change is `s4b-keeper-wiring.test.ts` +11, and no test was removed | §1 (vitest JSON per file, compared) |
| New tests fail on pre-slice code | `11 failed (11)`. Ten fail on missing exports. T6 fails on behaviour (`expected 'DEBUGGER_CANCELLED' to be 'e'`) | §2 |
| tsc for shared, daemon, sdk, mcp and extension; `npm run typecheck`; the seven `recipes/tsconfig*.json`; `npm run build` | all exit 0. `git status --short` is identical before and after the build | §3 |
| D4.1 (one attach, idle detach at 5 s) | green through `withDebugger` (`s4b-keeper-wiring` D4.1) and in the 49 keeper tests | §1 |
| D4.2 mutant M2 (the keeper on its own `new DebuggerSessions()`) | **red**: `1 failed \| 516 passed (517)` (D4.2 disarm) | §4 |
| D4.3 mutant M3 (`withDebugger` passes no `guard`) | **red**: `1 failed` (D4.3 through the wiring) | §4 |
| D4.3 mutant M3b (the keeper skips the guard only on a reused session) | **red**: 6 failed (5 keeper tests, 1 wiring test) | §4 |
| V4-1 mutant M1 (the fix reverted) | **red** (T6) | §4 |
| D4.4 | `git diff c9bb6cb --stat -- daemon shared sdk mcp` is empty. Since `c9bb6cb`, `extension/test` gained only the new file | §7 |
| Log sites +0 (allowlist 54) | no `console.` line added (`grep '^+.*console\.'` matches only a `+++` header). `log-allowlist.ts` is untouched; the sizes are [15, 33, 0, 6]. log-scan, safety-gate, sw-static, log-sentinel, safety-debugger and keeper tests: `513 passed (513)` | §7 |
| Size cap 250 + 375 (#344 (4)) | code 136 added (72 + 47 + 2 + 15), tests 260 | §7 |
| No new top-level listener, no top-level `await` | `addListener` count in `sw.ts`: 20 at HEAD, 20 with the slice. The only added `await` is inside a comment | §7 |

The builder's numbers agree with mine: 5010 → 5021, six mutants each `1 failed | 59 passed`, 136/260 lines.

## 3. The attack points

**(c) Bypass.** `grep -rn "sendCommand\|\.attach(\|getTargets\|chrome\.debugger" extension/src`:
- `sendCommand` is called only in `debugger.ts:18` (`send`).
- `attach` and `detach` are called only in `keepSessions`'s deps (`debugger.ts:36-38`), in `runWithDebugger`'s deps
  (`:74-75`; production never reaches them once `sw.ts` installs the keeper) and in the disarm's `detachAll` (`sw.ts:62`).
- `waitPaused` (`debugger.ts:291-303`) adds and removes an `onEvent` listener within the call; that is not a command.
- `handlers/console.ts` now sends through `send`, so its commands are tracked.

**No bypass.**

**(d) The safety boundary.**
- **Disarm.** Kept sessions live in `debuggerSessions` (`keepSessions` → `sessions: debuggerSessions`), so `detachAll`
  marks and detaches them (M2 shows it).
- **Block list.** `storage.onChanged`'s safety branch calls `recheckAll` (`sw.ts:409`). `onUpdated` calls `recheckTab`
  on a URL change or a load start, and `resolveTabTarget` reads `pendingUrl` (`safety-call.ts:123`).
- **`file:` and own pages.** `keptTabRefusal` (class `tab` at phase `effect`) refuses disarmed, blocked, own and `file:`,
  and passes JavaScript off (#347 item 2; the test is red under my M14).
- **Bounds.** `tabCheck` is bounded at its source (`within`, 1 s; #347 item 8), and so is the sweep's `getTargets`.
- **Re-check order.** The guard runs before every use, and after `ready` (the sweep). See V3 for its position relative
  to the pending-detach wait.

**(b) Does a reused session change an answer?** I read every path for domain state:
- `Debugger.disable` runs in a `finally` (`evaluate/call.ts:144`), and `setBreakpointsActive false` runs at each enable.
- `Runtime.disable` runs in a `finally` (`console-messages.ts:82-89`).
- Focus emulation is switched off in a `finally`.
- The upload enables no domain.
- `replMode` bindings belong to the page's context, not the session. The command-line API is absent (m3 B9).
- What is left is memory only: remote objects and isolated worlds held until the session ends, which the builder
  reports.
- The overlap answer, the attach-failure mapping and the guard's own error all match `runWithDebugger`'s. The keeper
  writes Chrome's own "Another debugger…" text, which goes through the same `mapError`.

**Not measured:** a second `Runtime.enable` in the **same** session replaying the stored messages (CON-KEPT). C7
measured it only across sessions. Until CON-KEPT runs, 0.6's "answers do not change" is unproven for
`browser_console_messages`.

**(a) The keeper runs only where `sw.ts` installs it.**
- **Probe.** I added `keepSessions(async () => null)` at the import of `debugger.ts` in the scratch copy and ran
  `npx vitest run extension`. Result: `38 failed | 2427 passed`, in 8 files (§5). Every failure is an attach or detach
  count or order assertion: `expected 'cdp:Runtime.evaluate' to be 'attach'`, `detach … 0 times`, logs one or two
  entries short. In the tests I looked at, the answer assertions that come before them passed (for example
  `s12-console-gate.test.ts:117` and `handler-codes.test.ts:134`).
- **What this means.** The builder's argument holds: those tests pin per-call detach and cannot pass unchanged with the
  keeper installed. Keeping them on `runWithDebugger` meets D4.4's "existing tests unchanged" to the letter. Its cost is
  real, though: no existing handler test runs the production session path any more (V2).
- **Consistency.** This matches the plan: the phase doc requires that existing tests pass unchanged, and
  `runWithDebugger` is kept with its tests (S4a Handoff allows keeping it).

## 4. Findings

### V1 · MINOR · `extension/src/sw.ts:85-86, 186, 230, 239, 368, 409`: no test guards the worker's wiring
- **Evidence.** These mutants, each applied alone, left all 517 tests in the S4 set green:
  - M7: `recheckAll` removed;
  - M8: `onDetach` not forwarded;
  - M9: neither `tabGone`;
  - M10: no `recheckTab`;
  - M11: no sweep;
  - M12: `keepSessions` never called, so production silently falls back to per-call sessions.

  I checked that each substitution applied (`grep -c "// mutant"` gives 6 for M7–M11) (§4).
- **Impact.** M7 or M10 would leave an idle session on a newly blocked, own or `file:` page for up to 5 s. That is a
  phase STOP condition, and Run 19's KEEP-3 would be the first to see it.
- **Precedent.** The repo pins safety-relevant worker wiring statically: `s4-save-gate.test.ts:194` matches the
  `onRemoved` body.
- **Fix.** Add a static test of the same kind, about 30 lines and within the test cap. It should check that
  `keepSessions(` and `void keeper.sweep()` sit at the top level, `keeper.recheckAll()` sits in the `touchesSafety`
  branch, `keeper.tabGone(` sits in the first `onRemoved` and in `onReplaced`, `keeper.recheckTab(` sits in `onUpdated`,
  and `keeper.onDetach(` sits in `onDetach`.

### V2 · MINOR · `extension/test/s4b-keeper-wiring.test.ts`: only the screenshot and trusted-input paths run through the keeper
- **Evidence.** M13 (`handlers/console.ts` back to a raw `chrome.debugger.sendCommand`, so `Runtime.disable` is no
  longer tracked) is green in the S4 set (§4). No test runs `evaluateFunctionInPage` (S2a's `Debugger.enable`/`disable`),
  `evaluateToSave`, `uploadByMark` or `consoleMessages` with `keepSessions` installed. The four "clean-up calls `drop()`"
  obligations (S4a Handoff, F4) are proven only for focus emulation.
- **Fix.** Over the existing `fakeChrome`, add one test each:
  - `consoleMessages`, or `collectConsole` through `send`, with `Runtime.disable` failing: the session is detached at
    the call's end;
  - an `args` evaluate whose `Debugger.disable` fails or is still pending at the bound: detached.

  Both are small.

### V3 · MINOR · `extension/src/debugger-keeper.ts:134-140`: the re-check runs before the wait on a pending detach
- **What happens.** `use` runs `guard.effect()` and then `settled(tabId)`, which waits up to 1 s for each pending detach
  (and, with V4-1's fix, waits again if a newer one replaces it). A block-list edit during that wait is seen neither by
  the call's guard, which has already passed, nor by `recheckAll`: the tab has no `kept` entry while it detaches.
- **Probe P-ORDER (§6).** The steps: a use, then `tabGone` with a slow detach, then a second use, then the tab is
  blocked and `recheckAll` runs. The result: `{"out":"b","order":["guard:ok","attach","guard:ok","attach","SIDE
  EFFECT"]}`.
- **Why MINOR.** The post-check refuses the reply, and the window is Chrome's detach latency, bounded at 1 s. It is
  still wider than `runWithDebugger`'s guard-to-attach gap. The phase doc's STOP lists "a debugger session attached … on
  a tab whose page is blocked", and 0.6 says "before its first side effect". The code is from S4a (accepted by #347),
  but S4b reopened the module.
- **Fix.** Move `await this.settled(tabId)` (and `await this.ready`) before the `guard.effect()` try block. The busy
  check that follows still keeps decision 3. Add a test: a refusal that lands during the wait refuses the use.

### V4 · NIT · `docs/setup.md:548-550` (the debugging banner): the disarm timing and the 10 s total
- **Banner after a disarm.** "a disarm detaches it at once (the banner then goes in Chrome's ~5 s)" is narrower than
  what was measured: 3–14 s (Run 13 SAFE-4 (b)) and +4.7 to +5.0 s (R14-4b), as in `extension/CLAUDE.md` § Safety gate.
- **The 10 s total.** "about 10 s in all" is a sum of the bound and Stage 0's m2 D2. KEEP-2 has not measured it, and
  the builder says so.
- **Fix.** Write "the banner then goes within seconds (3–14 s measured)", and leave the 10 s total to S8.1's
  row citation.

### V5 · NIT · `extension/src/handlers/console.ts:3, 31`: a lane deviation not declared
The phase doc's S4 lane is `extension/src/{debugger,safety-debugger,sw}.ts`, a keeper module and their tests. The
two-line change is justified, because S4a's Handoff names `handlers/console.ts:25` as a call site. It should still be
listed under Deviations. **Fix:** a sentence in the builder or stage report.

### V6 · NIT · `extension/src/debugger.ts:215, 328, 356`: the pending-detach wait comes out of the evaluate's own time budget
- `deadline` is set before `withDebugger`, so a `settled` wait (up to 1 s per pending detach) is taken out of
  `timeoutMs`.
- For a small `timeoutMs` right after a detach, this could give a `TIMEOUT` that the per-call path would not.
- Time only, and unmeasured. With V3's fix it is unchanged. Record it for KEEP-2, or start the deadline inside the use.

### Notes (no severity)
- **#335's pre-ship measurement is open.** #335 requires "a sweep detach of a tab another client holds" to be measured
  "before S4b ships". The builder lists it as SWEEP-HELD for Run 19, so S4b must not count as shipped before then.
- **V3-4 is settled by argument.** The builder's argument (fails closed; the attach is about 0.2 ms, m2 D1) is
  consistent with #347 and V4-1's fix. KEEP-2's attach and detach durations are its Revisit-if.
- **Each feature's domain state at the end of its call.** I confirmed by reading every path (§3 (b)); there was nothing
  to add.
- **Builder's claims.** Every claim in `S4b-builder.md` §2 that I re-derived matched. The proposed decisions are
  reasonable. "Commands not tracked drop" fails closed: a `Runtime.releaseObject` that fails on a page that navigated
  now ends the session early, which costs time only.

## 5. Handoff
- The scratch worktree was removed after the runs. Its `node_modules` came from its own `npm ci`, with no junction. No
  process is left running and no port is bound.
- No tracked file was edited in the main tree. The other lane's files (S1-record, `docs/e2e-test-plan.md`) were not read
  or touched.
- For the step agent:
  - V1–V3 are fixable inside the caps: about 30 + 40 test lines, and a two-line code move for V3.
  - Live rows for S7 are the builder's list, plus CON-KEPT and SWEEP-HELD as gating facts for 0.6's "answers do not
    change" and for #335.
