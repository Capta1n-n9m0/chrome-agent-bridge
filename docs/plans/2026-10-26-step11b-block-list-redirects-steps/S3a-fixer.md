# Step 11b — S3a fixer report (M1, N1, N3 of `S3a-verifier.md`)

Fixer: Opus 5.5, medium effort. Layer followed: the verifier report, the phase doc's STOP rule ("a rule left installed
after its call ended") and #301 (b). M2, N2, N4 left alone as briefed. Not committed; extension not reloaded; daemon
not started.

## 1. Verdict

**DONE.** All three findings fixed; none disputed.

## 2. Outputs

| Finding | Change | Test (red without the fix) |
|---|---|---|
| **M1** | `extension/src/safety-dnr-keeper.ts` `releaseFor`: the release now sends `removeRuleIds: [...ids, ...orphans]` when the call holds ids **or** orphans exist (was: only when it holds ids). A rejected removal keeps both on the list (fail safe); `l?.counts ?? NONE` since `l` may be absent. `release()` doc comment updated. | `safety-dnr-keeper.test.ts` "M1: a refused call's timed-out add that lands late is removed by that call's own release" — no sweep, no later install. Red with the condition reverted: `Tests 1 failed \| 29 passed (30)`. |
| **N3** | test only | "N3: a clear keeps the orphan list, so a timed-out add landing after the clear's read is still removed" — a hung add (orphans), a rejected rebuild (unsynced), an idle empty-list install that runs the clear, the add lands, `sweep()` removes it. Red with `this.dropOrphans()` inserted in `clear()` (the verifier's surviving mutant): `Tests 1 failed \| 29 passed (30)`. |
| **N1** | `extension/src/handlers/history.ts`: a local `settleWait(tabId, ms)` → `{done, stop}` replaces `waitForLoad`; it ends on the tab's `complete`, the tab's `onRemoved`, `stop()` or the 10 s bound, removing both listeners, and never rejects. `go()` calls `stop()` in a `finally` (tab not loading, closed, or a failed `goBack`). Same answer `{ok: true}`, same `HISTORY_SETTLE_MS`, nothing armed when `holdsRules()` is false (empty list unchanged). `tabs.ts` untouched. | `s3a-dnr-wiring.test.ts` "back/forward's settle wait ends promptly": (a) tab `complete` after the call → no listener left; (b) tab closed mid-wait → `{ok:true}` in < 1 s, no listener left. On the builder's `history.ts`: `Tests 2 failed \| 11 passed (13)` (a: a listener left; b: 5001 ms test timeout). |

Each mutant/revert was applied in the main tree, run, and restored from a scratchpad copy (`cmp` equal afterwards).

**Checks (main tree, after the fix):**
- `npm run typecheck` → exit 0.
- `npm test` → `Test Files 160 passed (160)`, `Tests 4134 passed (4134)`, exit 0. Before: 4130/160; +4 tests (keeper +2, wiring +2), no file added, none removed.
- `npm run build` → `built extension → dist/`, exit 0.
- **D3.3** `git diff ecd254f --stat -- daemon shared sdk mcp` → empty.
- **D3.5** `git diff HEAD -- extension/src | grep -c '^+.*console\.'` → 0; `extension/test/log-allowlist.ts` unchanged (+0).
- Listener count in `sw.ts` unchanged (the static test still asserts 19); the two new `addListener` calls are in
  `handlers/history.ts`, per call, removed by `end()`, like `waitForLoad`'s.

Size: about 35 lines of code (keeper ~6, history ~30 net) and ~78 of tests — about 113 in all, a little over the
brief's "well under 100" because of the two N1 tests.

## 4. Deviations

- N1 adds an `onRemoved` listener per waiting call (not in the verifier's wording, which named only a cleanup handle):
  it is what makes "a tab closed mid-wait" end promptly. `settleWait` is exported (for no caller beyond the module;
  tests go through `back`/`forward`).

## 5. Proposed decisions

### 2026-10-26 · A release removes the orphans even when its own call holds no rule
**Decided:** `releaseFor` retries every orphan id on every release, whether the call installed or not, so a refused
call whose add timed out cleans up at its own end. **Why:** the STOP rule's "no rule outlives its call" (M1).
**Instead of:** leaving them to the next install, rebuild or sweep. **Revisit if:** Chrome is shown to apply a
timed-out `updateSessionRules` *after* a later one sent by the same extension (see Findings). **By:** Claude (proposed)

## 6. Findings

- Residual (by reading, unmeasured): the fix drops the orphan list once a removal succeeds. If Chrome could apply a
  timed-out add *after* the removal sent behind it, that rule would stay until the next start-up clear (a worker
  restart). This assumes Chrome applies one extension's DNR updates in the order sent; Stage 0 did not measure it, and a
  DNR call past 5 s was never seen. The same assumption already held for S2's install/rebuild retries.

## 7. Handoff

Files touched: `extension/src/safety-dnr-keeper.ts`, `extension/src/handlers/history.ts`,
`extension/test/safety-dnr-keeper.test.ts`, `extension/test/s3a-dnr-wiring.test.ts`, and this report. `safety-call.ts`
not needed. No process left running. A fresh verifier should re-check M1, N1, N3 only.
