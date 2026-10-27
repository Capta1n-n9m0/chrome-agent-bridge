# Step 12 S4a — the kept debugger session: the pure keeper (verifier report)

Model / effort: Opus, medium. Date 2026-10-27. Role: verifier (`docs/agent-rules.md` §6). Audited the uncommitted
`extension/src/debugger-keeper.ts` and `extension/test/debugger-keeper.test.ts`. The brief names the start commit
`c6ad96f` as HEAD, but HEAD is `5e9ef9a`. The two commits in between (`1bf351e`, `5e9ef9a`) touch only `recipes/` and
`docs/`, so the diffs below are taken against `c6ad96f`. Raw output is in `S4a-verifier-evidence.txt` (same folder).

## 1. Verdict

**FAIL**: one MAJOR finding (F1) and four MINOR. Every pre-registered exit check passes. The FAIL comes from the design
attack. In three races the keeper keeps a session that no trigger detaches, which is the phase doc's STOP rule. Today's
`runWithDebugger` guards against this by always detaching in its `finally`. The fixes are small.

## 2. Exit checks

| Check | Result | Evidence |
|---|---|---|
| D4.1: N sequential uses make one attach; idle detach at 5 s on a fake clock | PASS | tests at lines 108–127; m2b, pre red |
| Overlap rule: a second use answers `DEBUGGER_DEVTOOLS` and attach count stays 1 | PASS | lines 171–191; m11 red (2) |
| D4.2 as extended (stage0-audit §5): one test per trigger | PASS | disarm idle and busy, blocked / own / `file:` page, block-list change (`recheckAll`), close, replace, the three `onDetach` reasons, timeout / use error, `drop()`, sweep with no `extensionId`; m4 red (7), m5 (2), m6 (4), m7 (2), m8 (1) |
| D4.3 mutant: reuse without the re-check | **red**, 3 failed / 32 | evidence §4, m1 |
| D4.3 mutant: keep a session across a disarm | **red**, m2a 3 failed (record not registered); m2b 1 failed (killed record reused) | evidence §4 |
| D4.4: `git diff c6ad96f -- daemon shared sdk mcp` empty | PASS (empty) | evidence §1 |
| Existing extension tests unchanged | PASS: `git diff --stat c6ad96f -- extension` is empty; the only additions are the 2 untracked files | evidence §1 |
| Log sites +0 | PASS: `console.` count 0 in the module; `log-scan.test.ts` 16 passed | evidence §1, §2 |
| Test count | before 4881 / 207 files (full run with the new file excluded) → after 4916 / 208. +35, all from the new file, none removed | evidence §2 |
| tsc per package (5), `npm run typecheck`, the 7 `recipes/tsconfig*.json` | all exit 0 | evidence §3 |
| `npm run build` exit 0; no tracked change after the build | PASS; `git status --short` identical before and after | evidence §3 |
| New tests fail on pre-slice code | module absent: the file fails to load (0 of 35 run); today's `runWithDebugger` behind the keeper's interface (`pre`): 21 of 35 red | evidence §4 |
| Size cap | code 234 (cap 450), tests 460 (cap 675) | `wc -l` |
| Nothing wired into debugger.ts / safety-debugger.ts / sw.ts | PASS: the keeper is imported nowhere | evidence §1 |

On `pre`, 14 tests pass. They pin today's answers or end states, and always-detaching code satisfies those trivially
(for example "recheck detaches": the session is already gone). Each of them is made red by a keeper-specific mutant (m4–m8).

Mutants m4–m11 are my own additions. They show that every trigger's test discriminates. Each was run on a scratch copy
(`extension/src/zz-s4av-*.ts` plus a test copy), and all were deleted afterwards. The SHA-256 of both real files is
identical before and after (`0ec81a4e…`, `a4bbc1f1…`).

## 3. Findings

### F1 · MAJOR · `extension/src/debugger-keeper.ts:113-138, 155, 197-209` — three races leave a session attached that no trigger reaches

Each probe asserts the safe outcome, and each is red against the real module (evidence §5; the probe source is there).

- **P5, reachable.** The page becomes blocked after the guard's read but before line 114. `recheckTab` (line 155)
  returns early because there is no entry yet. The use attaches, succeeds and arms the idle timer. The session then
  stays idle on the blocked page until the 5 s bound or the next use's guard. Today the same window exists, but the
  `finally` detaches at the end of the call. The post-check refuses the reply, but the STOP rule is about the session,
  not the reply.
  Probe: `expect(state==="idle" && attached).toBe(false)` → received true.
- **P1, P2: a disarm or a refusing recheck while the attach is pending.** If the detach lands before Chrome's attach
  completes (the fake answers "not attached"), the attach then succeeds. Line 124 throws the refusal, and the `finally`
  only `forget`s (line 135), or does nothing because the entry was already deleted (P2). Either way Chrome stays
  attached. Today's `runWithDebugger` detaches in its `finally` even when the session was killed
  (`safety-debugger.ts:110-116`).
  - Whether Chrome can order things this way is unmeasured. Read from memory of Chromium, `DebuggerAttachFunction`
    responds synchronously after the host attaches, which would make P1 and P2 unreachable.
  - Even so, the keeper removes a defence the pre-slice code had. That is not "security at least as strict"
    (`agent-rules.md` §4).
  - Probes: `attached.has(7)` → true after `DISARMED` / `DOMAIN_BLOCKED`.

**Suggested fix (a few lines):**
- (a) Whenever `use` finds `record.killed`, or finds its entry released, after the attach has resolved, call
  `deps.detach` and ignore its error, instead of only `forget`ting. This puts back today's always-detach for killed
  sessions; the detach is a no-op when `detachAll` already did it.
- (b) Before arming the idle timer, run `deps.tabCheck(tabId)` and release on a refusal or a throw. Alternatively,
  have `recheckTab` also see uses that are past the guard but not yet registered, for example by inserting the entry
  before the guard.
- Add P1, P2 and P5 as tests.

### F2 · MINOR · `debugger-keeper.ts:102` — another call's guard failure detaches a busy session without marking it killed

- A call whose guard throws anything outside `KEEP_ON` runs `release(tabId, null)`, even when a different call is
  using the session. That other use then reads `DEBUGGER_CANCELLED` (probe P3: `expected 'DEBUGGER_CANCELLED' to be 'a'`).
- For a `DISARMED` or `DOMAIN_BLOCKED` refusal, the first call's post-check refuses anyway, so the answer is masked.
- For an unexpected throw (for example a wiring slip, or a refusal specific to the second call), an unrelated call's
  answer changes.
- **Fix:** when the entry is busy, pass the refusal to `release` so `killed` is set, which matches proposed decision 3.
  Or skip the release when the entry is busy, since that call's own post-check covers the tab.

### F3 · MINOR · `debugger-keeper.ts:143-146` — `onDetach` forgets whatever entry the tab id names

- A late `onDetach` for a session Chrome already ended can forget a newer session (probe P4). For that to happen, two
  uses must run before the event arrives: one errors and drops the session, the next attaches.
- The newer session is then attached, outside the registry, and out of reach of the disarm (`detachAll` returns 0 and
  the tab stays attached). Every later use answers a false `DEBUGGER_DEVTOOLS` until the human cancels the banner.
- Reachability depends on the order in which Chrome delivers the event and the command reply (unmeasured; likely the
  event comes first).
- **Fix:** on `onDetach`, `release` (detach, ignoring "not attached") instead of `forget`. That costs one no-op call.
  Adjust the test at lines 296–309, which pins `detaches() === 0`.

### F4 · MINOR · plan / handoff to S4b — session state that "the detach clears" today survives a kept session

Two places assume the detach that follows clears their state. Under the keeper the session survives the call, so they
must call `u.drop()` when their clean-up fails:
- `evaluate/call.ts:144` swallows a failed `Debugger.disable` (`quiet`).
- `console-messages.ts:83-85` swallows a failed `Runtime.disable`, with the comment "the detach that follows disables
  it anyway".

`upload-files.ts`'s `Page.createIsolatedWorld` world also persists within a kept session (stage0-audit F5). None of this
is S4a code, but S4b's brief should name each one (G-10 / #335 "each feature switches its CDP domains off").

### F5 · MINOR · `debugger-keeper.ts:105` and the builder's proposed decision 4 — the wait for a pending detach is unbounded

- A `chrome.debugger.detach` that never settles holds every later use on that tab until the daemon's call timeout.
- The decision itself is consistent with #335: it avoids a false `DEBUGGER_DEVTOOLS`, and the window it covers is not
  an overlap of calls.
- **Fix (optional):** bound the wait, for example at the 1 s order of the other worker bounds, then proceed. Or record
  the unbounded wait in the decision.

## 4. The builder's proposed decisions

1. **Detach after any use error.** A superset of #335's "after a call timeout or failed clean-up". It changes no
   answer and fails closed. **Agree.**
2. **`JS_DISABLED` / `UPLOAD_REFUSED` re-check keeps the session.** Consistent with 0.6, since every use is gated. These
   class rules say nothing about the tab, and #321 Q3 rules a steady banner. **Agree.** Caveat: F2 shows the same
   branch also runs for other calls' failures on a busy tab.
3. **A refusing recheck of a busy tab ends the call with the refusal.** Consistent with #137 and the STOP rule.
   **Agree.**
4. **A use waits for a pending detach.** **Agree**, with F5's note.

## 5. Interface for S4b

`use(tabId, fn(u), {guard, mapError})` keeps the order of `runWithDebugger`: the registry refusal, the guard, then
attach or reuse, the killed check, then `mapError`. So answers are preserved on non-overlapping calls. The overlap
answers `describeDebuggerError`'s `DEBUGGER_DEVTOOLS` through the caller's `mapError` (per-call `what`).

What S4b also needs:
- the `tabCheck` builder;
- the sweep called synchronously at the top level, before any message, because `ready` is captured only when `sweep()`
  is called;
- after F1(b), optionally a post-check refusal → `keeper.recheckTab`;
- #335's still-open measurement of a sweep detach on a tab another client holds.

## 6. Hygiene

- No tracked or new repo file was edited.
- Scratch copies were created and deleted in `extension/src` and `extension/test` (`zz-s4av-*`), and the hashes of
  the real files are unchanged.
- No port was bound and no process left running. I did not touch `recipes/`. An untracked `recipes/s12-r18-lib.ps1`
  appeared during the run, from another agent.
