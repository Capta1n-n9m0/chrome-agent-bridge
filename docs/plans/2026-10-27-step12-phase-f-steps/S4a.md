# Step 12 S4a — the kept debugger session: the pure keeper (step report)

Step agent: Opus, medium. Children: builder, three fixers and four verifiers, all Opus, medium; the committer is Sonnet,
medium. Dates 2026-10-27/28. Slice start `c6ad96f`. HEAD moved to `5e9ef9a` during the slice through another lane's
recipes and docs commits.

READ list given to every child: phase doc §0.6, §0.10, § S4, D4.1–D4.4, § Every stage, § STOP rules, the Stage 0 dated
note; decisions #321 (Q3), #324, #335, #339, #344 (4); Stage0.md §4 and §6; Stage0-measurer2.md D1–D5; stage0-audit.md
§4 F3–F6 and §5 D4.2; stage0-audit-2.md G-10–G-14; `extension/src/{debugger,safety-debugger,debugger-errors}.ts`,
`evaluate/call.ts`, `console-messages.ts`; `extension/CLAUDE.md`, `extension/src/CLAUDE.md`. Excluded: run records,
raw logs, the e2e plan.

## 1. Verdict

**DONE.** The verifier passed it on round 4 with notes. Two items go to S4b: V4-1 (MINOR) and V3-4 (NIT).

## 2. Outputs

- `extension/src/debugger-keeper.ts` (new, 358 lines): `DebuggerKeeper`, `KEEPER_IDLE_MS = 5000`,
  `KEEPER_DETACH_WAIT_MS = 1000`, and the dependency and use types. It is imported by nothing yet, contains no
  `chrome.*` call and no log call.
- `extension/test/debugger-keeper.test.ts` (new, 710 lines, 49 tests): the builder's 35, then 9, 2 and 3 added in fix
  rounds 1–3. Each block was red on the module before its round and is byte-identical in later rounds (hashes in the
  verifier reports).
- Tests:
  - `npm test` before: 4881 passed (207 files), from the builder.
  - Extension alone after: `npx vitest run extension` 2454 passed (82 files), from verifier 4.
  - Full run after: 2 failed of 5000, and 2 failed of 5008 on the re-run. Every failure is in the other lane's untracked,
    in-progress `recipes/test/s12-r18.test.ts` (verifier 4). The keeper's +49 are the only additions in this lane, and
    no test was removed.
- Checks: per-package `tsc`, `npm run typecheck`, the seven recipes tsconfigs and `npm run build` all exit 0, and the
  build left no tracked change. `git diff c6ad96f -- daemon shared sdk mcp` is empty. Log sites +0, and
  `log-scan.test.ts` is green. All from verifier 4.
- Commit: the hash is in the committer's line below.

## 3. Verifier verdicts

| Round | File | Verdict | Findings |
|---|---|---|---|
| 1 | S4a-verifier.md | FAIL | F1 MAJOR: three races left a session attached (P1, P2, P5). F2, F3, F5 MINOR. F4 MINOR, a handoff note |
| 2 | S4a-verifier2.md | PASS-with-notes | N1, N2 MINOR: a false `DEBUGGER_CANCELLED`, both from round 1's fixes. N3 NIT |
| 3 | S4a-verifier3.md | FAIL | V3-1 MAJOR: a late `onDetach` left an orphan after a disarm. V3-2, V3-3 MINOR. V3-4 NIT |
| 4 | S4a-verifier4.md | **PASS-with-notes** | V4-1 MINOR, from round 3's timeout: fails closed, one answer changes |

Fix rounds used: 3 of 3 (S4a-fixer.md, S4a-fixer2.md, S4a-fixer3.md). Round 2 was optional, because verifier 2 had
passed the slice. I ran it because N1 changed an answer, which breaks §0.6 "answers do not change". It turned up V3-1.

The exit checks verifier 4 confirmed:
- D4.1: one attach for N uses, and the idle detach at exactly 5000 ms.
- The overlap rule: `DEBUGGER_DEVTOOLS`, attach count 1.
- D4.2: one test per trigger, the block-list change and the start-up sweep included.
- D4.3: both mutants are red (round 1, re-confirmed in round 4).
- D4.4 first half: the diff is empty.

## 4. Deviations

- **Tests 710 against the 675 cap.** Code plus tests is 1068 of 1125, and the extra lines are all tests: the race tests
  from fix rounds 1–3. `agent-rules.md` §7 accepts this as a deviation; code is 358 of 450.
- **Fix round 2 after a passing verdict.** The reason is in §3.
- **No separate clock.** The injected timers are the clock, since the idle bound and the wait bound are the only times
  the keeper reads. (Builder.)

## 5. Proposed decisions

The full text is in the children's reports, in §5/§7 of S4a-builder.md, S4a-fixer.md, S4a-fixer2.md and
S4a-fixer3.md. Verifiers 1, 2 and 4 agreed with them.

1. A kept session is detached after any error of a use. A use whose clean-up failed calls `KeptUse.drop()`.
2. A re-check refusal of `JS_DISABLED` or `UPLOAD_REFUSED` keeps the session. Any other refusal, or a failure, detaches
   it.
3. A refusing recheck of a busy tab ends that call with the refusal, not `DEBUGGER_CANCELLED`.
4. A use waits for a pending detach on its tab, for at most `KEEPER_DETACH_WAIT_MS` (1 s).
5. A session killed while its attach is pending is detached when the attach lands, and the use's end sends no detach.
6. `onDetach` forgets an attached entry, then reads `getTargets` within the 1 s bound. If the tab still reads
   attached, or the read times out or fails, it detaches. It leaves an entry whose attach is still pending.
7. The post-attach tab check (P5) releases only its own entry. A refusal there does not change the use's answer,
   because the call's post-check refuses the reply.
8. S4b bounds `tabCheck` at its source (N3). The keeper does not.

## 6. Findings

- No pre-registered check failed in the final round.
- **V4-1 (MINOR, carried to S4b):** the bounded `getTargets` check in `onDetach` can detach a newer session. Nothing is
  orphaned, but one answer changes to `DEBUGGER_CANCELLED`. It happens when a use stopped waiting on its 1 s bound for an
  earlier detach that took more than 1 s, then attached before the check timed out. Verifier 4 checked a one-line fix on
  a scratch copy (49/49 tests and every probe as before): `if (this.detaching.get(tabId) === p) return;` before the
  detach at `debugger-keeper.ts:300`. A fourth round, which only an Opus fixer may run, was not used: the slice passes,
  the fix is known, and S4b touches the module anyway.
- **V3-4 (NIT, carried):** a second detach queued by F5's bound can land after the next attach. It fails closed.
  Measuring Chrome's detach time in S4b settles it.
- No new runtime fact. P1, P2 and P4 are reachable in real Chrome only if Chrome orders events in ways not yet
  measured; they are covered anyway.

## 7. Handoff to S4b

**The keeper's interface** (`extension/src/debugger-keeper.ts`):

```ts
new DebuggerKeeper(deps: KeeperDeps)
KeeperDeps = { attach(tabId), detach(tabId), getTargets(): Promise<{tabId?, attached}[]>,
               timers: {set(fn, ms), clear(h)}, sessions: DebuggerSessions,
               tabCheck(tabId): Promise<SafetyRefusal | null> }   // must settle promptly; a timeout or throw counts as a refusal
keeper.use<T>(tabId, fn: (u: KeptUse) => Promise<T>, { guard?: EffectGuard, mapError(err): Error }): Promise<T>
KeptUse.drop()                 // a failed clean-up: detach when this use ends
keeper.onDetach(tabId, reason) // chrome.debugger.onDetach
keeper.tabGone(tabId)          // tab closed, or the removed id of a replace
keeper.recheckTab(tabId)       // the tab's page changed
keeper.recheckAll()            // the safety state or block list changed
keeper.sweep(): Promise<number>// worker start: call synchronously at top level, not awaited
keeper.state(tabId) / keeper.size
```

**The call sites that must go through it** (line numbers at `5e9ef9a`):
- **`extension/src/debugger.ts:27-44`.** `withDebugger` calls `keeper.use(tabId, fn, {guard, mapError})` in place of
  `runWithDebugger`. The keeper is built on the existing `debuggerSessions` (`:44`), with `chrome.debugger.attach`,
  `detach` and `getTargets`, `setTimeout`/`clearTimeout`, and a bounded `tabCheck`. Every `withDebugger` caller
  (`:81`, `:120`, `:134`, `:174`, `:287`, `:317`, `:341`, `:367`, and `handlers/console.ts:25`) then goes through the
  keeper without a change of its own.
- **`extension/src/safety-debugger.ts:92`.** Production no longer calls `runWithDebugger`. Keep it, or retire it with
  its tests as a documented move. Its existing tests stay unchanged (D4.4).
- **`extension/src/sw.ts`:**
  - `:355` `chrome.debugger.onDetach` → `keeper.onDetach`.
  - `:176` and `:223` `tabs.onRemoved` → `keeper.tabGone`.
  - `:228` `tabs.onReplaced` → `keeper.tabGone(removedTabId)`.
  - `:220` `tabs.onUpdated` (URL change) → `keeper.recheckTab`.
  - `:380` and `:426` `storage.onChanged` (state, block list) → `keeper.recheckAll`.
  - `keeper.sweep()` once at top level, not awaited.
  - The disarm line `:61` (`debuggerSessions.detachAll`) and `:67` stay as they are: kept sessions are in the registry.
  - No new top-level listener.
- **The `drop()` obligations (F4):**
  - `evaluate/call.ts:144`: a quiet `Debugger.disable`.
  - `console-messages.ts:83-85`: `Runtime.disable`.
  - Trusted input's focus-emulation off, in `debugger.ts` around `:81-95` and `trusted-input.ts`.
  - `upload-files.ts`'s isolated world.
- **Also for S4b:**
  - Apply V4-1's one-line fix, with a test, and settle V3-4.
  - Optionally send a post-check refusal to `keeper.recheckTab`.
  - #335's open measurement: a sweep detach on a tab another client holds.
  - `docs/setup.md`: the banner's new behaviour.

No processes are running and no port is bound. The other lane (S1-helpers) has uncommitted files in `recipes/` and
`docs/plans/…-steps/S1-helpers-c-*`; the S4a commit does not include them.
