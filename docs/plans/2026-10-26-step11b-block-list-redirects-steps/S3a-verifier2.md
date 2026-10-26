# Step 11b — S3a verifier 2 report (re-check of M1, N1, N3 after fix round 1)

Verifier: Opus 5.5, medium effort. Read and run only; no tracked file edited. Start commit `ecd254f`; audited: the
uncommitted tree after `S3a-fixer.md` (`journal.md` ignored). Layer followed: the phase doc (0.5, exit checks, STOP
rules) as amended by #295, #296, #301; `S3a-verifier.md` for the findings.

## 1. Verdict

**PASS-with-notes.** M1, N1 and N3 are fixed correctly, each new test fails without its fix, and the stage's checks
still hold. One new MINOR finding (V2-M1, §4): the M1 fix widens an existing fail-open edge after a timed-out
**rebuild**. That edge needs a DNR call past 5 s, and the call's reply is still refused. The fixer's ordering note is
not a finding (§5).

## 2. Re-run results (main tree)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | `Test Files 160 passed (160)`, `Tests 4134 passed (4134)` |
| `npm run build` | `built extension → dist/`, exit 0; `git status --short` unchanged afterwards (14 lines) |
| Count | 4130 (verifier 1) + keeper 2 + wiring 2 = 4134 ✓; no file added or removed. Per file: `safety-dnr-keeper.test.ts` 30, `s3a-dnr-wiring.test.ts` 13 (`npx vitest run` on both: `Tests 43 passed`) |
| D3.3 | `git diff ecd254f --stat -- daemon shared sdk mcp` → empty |
| D3.5 | `git diff ecd254f -- extension/src \| grep -c '^+.*console\.'` → `0`; `extension/test/log-allowlist.ts` unchanged → **+0** |
| `sw.ts` listeners | `grep -c 'addListener('`: 19 at `ecd254f`, 19 now; the static wiring test still pins 19 |

## 3. The three fixes

Fail-before proof: a scratch worktree at `ecd254f` with its own `npm ci` and the eight stage files copied in. Each
mutant was applied in the worktree only and restored afterwards (`cmp` equal to the main tree). The suite was the
keeper and wiring tests (43).

| Mutant | Red |
|---|---|
| M1 reverted: `releaseFor` sends only when `ids.length > 0` | 1: "M1: a refused call's timed-out add …" |
| N3: `this.dropOrphans()` added in `clear()` (verifier 1's surviving mutant) | 1: "N3: a clear keeps the orphan list …" |
| N1 reverted: the builder's `history.ts` (`waitForLoad`) | 2: "not loading → no listener left"; "tab closed mid-wait" (5009 ms test timeout) |
| N1: the `onRemoved` listener does not end the wait | 1: "tab closed mid-wait" |
| N1: no `settle?.stop()` in the `finally` | 1: "not loading → no listener left" |

- **M1** ✓ `extension/src/safety-dnr-keeper.ts:216`. The release now sends `[...ids, ...orphans]` when either list is
  non-empty. A success drops the orphans, a failure keeps both. The test passes without a sweep or a later install.
- **N3** ✓ test only. The verifier-1 mutant is now red.
- **N1** ✓ `extension/src/handlers/history.ts:16–54`. `settleWait` ends on `complete`, on `onRemoved` for the tab, on
  `stop()` or on the 10 s bound, and it removes both listeners each time. It never rejects. `stop()` runs in a
  `finally`, so it also runs when `goBack` fails. In that case the error still propagates, as in the builder's version.
- **Back/forward unchanged.** The answer is still `{ok: true}` and `HISTORY_SETTLE_MS` is still 10 000. With an empty
  list, `holdsRules()` is false, so `settle` is null and the `finally` does nothing. The Chrome calls are the same as at
  `ecd254f`: `targetTab`, `effect`, `goBack`/`goForward`, with no `tabs.get` and no listener.
- **Release on every path / nothing proceeds without its rules.** `safety-call.ts` is untouched by the fixer. The fixer
  changed only `releaseFor` and `history.ts`. `release()` still never rejects: the catch keeps the ids as orphans. A
  refused install still throws before `effect()` returns.

## 4. New finding

- **V2-M1 (MINOR) — after a timed-out rebuild that Chrome applies late, any other call's release now removes the
  rules of every live call.** `extension/src/safety-dnr-keeper.ts:158` orphans a timed-out rebuild's **new** ids and
  keeps the old ids as the live calls' ids. If Chrome then applies the atomic update, the old ids are gone and the
  orphans are the only rules on the live calls' tabs. Since the M1 fix (`:216`), the next release by *any* call removes
  those orphans. The sweep at a disarm already did the same (S3a builder). The still-running calls then have no rule,
  while `holding()` still says true.
  Probe (two live calls on tabs 1 and 2, a rebuild that hangs past the 20 ms bound and then lands, followed by one
  trigger; file `…/scratchpad/v3-probe.test.ts`):
  `TRIGGER=release b-rules-before=1 b-rules-after=0 b.refusal=refused holding=true` ·
  `TRIGGER=sweep … b-rules-after=0` · `TRIGGER=install … b-rules-after=1` (the install is refused while the keeper is
  unsynced and sends nothing).
  Limits: the call's reply is refused (`refuseLive`), so no answer leaks. But the redirect hops still in flight on
  call B's tab are unprotected for the rest of the call. That is the "not a network firewall" gap this step closes,
  reopened. The trigger needs a DNR call that takes longer than 5 s, which has never been seen. I rate it MINOR, not a
  STOP: the rules were installed and the reply is refused. The session agent should still rule on it, because it sits
  next to the STOP rule "a covered call that proceeds after its rules failed".
  **Suggested fix (inside the keeper):** on a rebuild `DnrTimeout`, do not orphan the new ids. Add each live call's
  share of the new ids to that call's `ids`, next to its old ones, and add the counts too (conservative against the
  caps). The ids then leave only at that call's own release. Orphans would come only from refused installs, whose calls
  never reach their effect, so M1's release-time removal is safe. Test: the probe above, asserting
  `b-rules-after ≥ 1` after A's release and the sweep, and 0 after B's release.

## 5. The fixer's remaining-risk note (ordering)

The scenario: a removal succeeds and the orphans are dropped, but Chrome applies the timed-out add *after* that
removal. The rule would then stay until the next start-up clear.
- This depends on Chrome reordering one extension's `updateSessionRules` calls. If Chrome runs them in the order sent,
  the removal runs after the pending add and the rule goes. A removal of an id not yet present is ignored rather than
  rejected; that is from the API reference as I recall it, not measured here. A removal that is itself stuck behind the
  hung add times out, and its ids stay listed. My one web search for Chromium's per-extension call queue found nothing
  conclusive ([Chromium source tree](https://chromium.googlesource.com/chromium/src/+/main/extensions/browser/api/declarative_net_request);
  [declarativeNetRequest reference](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)),
  so the in-order claim is unverified.
- The same assumption already underlies S2's install and rebuild retries. It is not a finding.
- It is **not a Run 17 item**: no planned row can make a DNR call take more than 5 s, so Run 17 cannot observe it.
  Record it in the as-built as an unmeasured assumption. A Revisit-if fits: any measured DNR call past 1 s.

## 6. Proposed decisions

- The fixer's "a release removes the orphans even when its own call holds no rule": agree, **provided** V2-M1 is fixed
  or ruled on. Without that fix, the same change lets one call's release strip another live call's rules after a
  late-landing rebuild.

## 7. Housekeeping

The scratch worktree `…/scratchpad/v3wt` (own `npm ci`) was removed after its five `node_modules/@bridge/*` junctions
were removed with `cmd /c rmdir` (`dir /AL /S` then showed 0). `git worktree list` shows only the main tree. The main
tree's `node_modules/.bin` has 42 entries, and `git status --short` is unchanged at 14 lines. Nothing is running. The
extension was not reloaded and the daemon was not started.
