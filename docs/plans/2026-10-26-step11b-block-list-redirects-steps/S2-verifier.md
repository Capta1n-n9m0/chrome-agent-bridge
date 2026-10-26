# Step 11b S2 — the DNR rule keeper, pure · verifier report

**Date:** 2026-10-26 · **Role:** verifier (`docs/agent-rules.md` §6) · **Model / effort:** Opus 5.5, medium ·
**Tree:** HEAD `8d07a89` + the uncommitted `extension/src/safety-dnr-keeper.ts` (sha256 `1b6b1aeb86dd80f5…`) and
`extension/test/safety-dnr-keeper.test.ts` (sha256 `2647d3fbb8a6642d…`). `journal.md` was modified by someone else, so I
ignored it.
**Read:** agent-rules §6, §7 and §9; phase doc 0.5, 0.6, the Stages note, S2, the exit checks (the every-stage line and
D2.1–D2.4) and the STOP rules; decisions #292, #295 and #296; `Stage0.md` §4 and §6 items 5–7; `stage0-audit.md` F7, F8
and F12–F15; `safety-call.ts`, `router.ts` (`GatedRouter`), `safety-dnr.ts` (API), `sw.ts` (the listeners, `onDisarm`,
the router factory); the `navigate`, `history` and `download` handlers and `tabs.ts` `targetTab`. I audited the claims in
`S2-builder.md`.
**Evidence** (in the scratchpad, not committed):
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\evidence\s2v-mutants.txt`
(the mutant table) and `…\scratchpad\evidence\s2v-probes.txt` (probes P1–P7). Both scripts are in the same scratchpad:
`mutate.mjs` and `zz-s2-verifier-scratch.test.ts`.

## 1. Verdict

**PASS-with-notes.** Every pre-registered check passes (D2.1–D2.4 and the every-stage line), and both required mutants
are red. There is no CRITICAL or MAJOR finding. I found no path in the keeper where a covered call goes ahead after its
install was rejected. A rule can outlive its call in only one case: Chrome rejects the removal itself (V4). The notes
below are things S3a/S3b must wire correctly, two gaps in the tests, and one lock-out that the user may want ruled on
(V3).

## 2. Outputs (numbers from commands I ran)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests after | `npm test` | `Test Files 159 passed (159)` · `Tests 4109 passed (4109)` |
| Tests before | the two S2 files moved to the scratchpad, `npx vitest run`, then moved back (`cmp` equal) | `Test Files 158 passed (158)` · `Tests 4087 passed (4087)`: the tree equals HEAD `8d07a89` plus `journal.md` |
| Delta | — | +22 = 20 (`safety-dnr-keeper.test.ts`: 1+2+5+2+3+1+6) + 2 (the `safety-static.test.ts` glob now also matches `safety-dnr-keeper.ts`). No test removed. Matches the builder's claim |
| Build | `npm run build` | exit 0 (`built extension → dist/`) |
| Tree after build | `git status --short`; `git diff --stat` | only ` M …/journal.md` (pre-existing, +1 line), `?? S2-builder.md`, `?? safety-dnr-keeper.ts`, `?? safety-dnr-keeper.test.ts` |
| New tests fail without the change | before the change the module did not exist, so the 20 keeper tests fail to load and the 2 static tests are absent | proven by the before-run above |
| Purity | `safety-static.test.ts` (no `console.`, no `chrome.` in code); `grep -n "chrome\.\|console" safety-dnr-keeper.ts` | only the doc comment at line 43 (`chrome.runtime.id`). Log-scan unchanged and green |
| Size | `wc -l` | module 283 + tests 364 = 647 against the ~500 cap (V9) |

**Mutants** (applied to the module one at a time with apply-and-restore in `mutate.mjs`; `restored: true`; `cmp` against
the saved original equal; `git status`/`git diff --stat` above unchanged): **26 of 30 red**.
- **Required, all red:** an install's update error swallowed (M1 `.catch(()=>{})` at the call: 2 red; M1b
  "record no ids and resolve": 2 red); a rebuild's update error swallowed (M2 catch no-op: 1; M2e `.catch` at the call:
  1; M2b no live refusal: 1; M2c not unsynced: 1); "no rule left" by the fake's count (M3 release removes nothing: 14
  red; M3b removes only orphans: 14; M3c a rejected removal is dropped and not orphaned: 1).
- **Also red:** a failed clear treated as done (M4), the clear removing nothing (M4b), the epoch check removed (M5) or
  never bumped (M5b), `rebuild(null)` a no-op (M6), ids reused (M7: 5 red), install caps ignoring live calls (M8),
  Chrome's text rethrown (M9: 2), `sweep` lifting live rules (M10), an empty list calling the API (M11), a rebuild that
  keeps old ids (M12), `refusal()` never set (M13), install not once (M14), `newTab` covered (M15), install allowed
  while unsynced (M16), a good rebuild not clearing unsynced (M17), a rebuild that never updates live ids (M2f).
- **Survived:** M3d (the `h.released` check removed: V5), M8b (install caps ignoring orphans: V6), M2d (rebuild caps
  check removed: V6; Chrome's own cap rejection would give the same result), M18 (equivalent: the queue serialises
  release and rebuild).

**Exit checks.** **D2.1** passes: the real `GatedRouter` runs five paths, each with the fake holding 3 rules during the
handler and 0 after. **D2.2** passes: `DISARMED {scope:"all"}` with `STATE_UNREADABLE_MESSAGE`, the effect counter at 0,
on the wire too. **D2.3** passes: the rules map is unchanged, `synced` is false, the live call's `refusal()` is set, a
new install is refused with no API call, and a good rebuild restores installs. **D2.4** passes: the first update is
`{removeRuleIds:[1,2,900]}`, before the call's rules. Ids: disjoint, never reused, 0 after release. A list change during
a call rebuilds that call's rules in one update. An empty list makes no API call. The sentinel text reaches no refusal
and no wire reply.

## 3. Verifier verdict

This report (PASS-with-notes).

## 4. Deviations

None from my brief. The builder's two deviations are confirmed: the size overrun (V9), and 0.5's "disarm clears every
rule" not built. The second is correct under #296 item 5 / F8 (`Stage0.md` §6 item 5).

## 5. Proposed decisions

### 2026-10-26 · S2 verifier: the unsynced state ends when no live call is left, not only at a list change
**Decided:** a failed rebuild keeps refusing new covered calls while any call it refused is still live. When the last
of them is released, the keeper is synced again: rules no longer exist that could be stale. **Why:** probe P3 (V3).
**Instead of:** the build as it stands, which stays unsynced until the next block-list edit or a worker restart, even
with no live call and Chrome healthy. **Revisit if:** the user prefers 0.5's literal wording. **By:** Claude (proposed,
for user review: 0.5 is contract-level).

## 6. Findings

**V1 · MINOR · S3a handoff: the order inside `post()` can let a reply through while a failed rebuild is still
queued.** `S2-builder.md` §7 suggests `try { d = await decide("post"); …; return this.dnr.refusal(); } finally { await
this.dnr.release(); }`. `refusal()` is read synchronously. A `rebuild` that is already queued (the listener has fired)
but has not yet run has not set the flag. Probe P2 (`fake.delayMs=5`, `reject=true`, `keeper.rebuild(LIST_B)` not
awaited) printed `P2 refusal before rebuild settles: null after: DISARMED`. Then
`P2 refusal after awaiting release: DISARMED`, because `release` queues behind the rebuild. Impact: the reply is
allowed in exactly the window the refusal exists to cover, though the post-check's fresh `decide("post")` still checks
the final URL against the new list. **Fix (S3a):** `const d = await decide("post"); await this.dnr.release(); return
isRefusal(d) ? d : this.dnr.refusal();`, with `release` also in a `finally`. Alternatively, the keeper could expose a
`settled()` that awaits its queue.

**V2 · MINOR · `safety-dnr-keeper.ts:157-178`, 182-197: a never-settling `updateSessionRules`/`getSessionRules` hangs
every later covered call** (open item (d)). Probe P5 printed
`P5 a settled: false b install settled: false b release settled: false`. With S3's `await release()` in `post()`, the
reply never leaves, and the daemon's own timeout is what answers the client. This fails closed (nothing proceeds), but
it costs liveness for `navigate`, `back`, `forward` and `downloadStart` until the worker restarts. Uncovered methods are
not affected. **Fix (S3a, or an S2 fixer if the step agent wants it now):** bound each DNR call, for example at 5 s, and
treat a timeout as a rejection. A timed-out *add* must still record its ids as orphans, because Chrome may apply it
late; otherwise the bound itself creates a rule with no owner. Alternatively, do not `await` `release()` in `post()` so
that the reply never waits on the queue (`release` never rejects, and removal order is kept).

**V3 · MINOR (design; see §5) · `safety-dnr-keeper.ts:103-105`, 133-136: after a failed rebuild, covered calls are
refused until the next list edit or a worker restart, even with no live call.** Probe P3 printed
`P3 rules after live ended: 0 synced: false` and then
`P3 new install with no live call and Chrome healthy: DISARMED`. The keepalive alarm keeps the worker alive, so in
practice only a block-list edit or an extension reload ends it. The user-facing text says the safety state cannot be
read, which is misleading here. This matches 0.5/#292 literally ("refused until a rebuild succeeds"), so it is no exit
failure. But the unsynced state only protects *live* calls' stale rules: a new call installs from its own fresh read.
Note also that a rebuild with no live call always succeeds: no update, or orphans only. So the failure is tied to the
live load, for example the caps summed over concurrent calls. That cause is transient, while the lock-out lasts. My
judgment on (c): acceptable as fail-closed, but harsher than 0.5's intent. See §5.

**V4 · MINOR · `safety-dnr-keeper.ts:22-23` vs `:173`: the header says "every later update retries" orphans, but an
install's update does not.** `installFor` sends `update([], rules)`. Only a release, rebuild, `sweep` or the start-up
clear retries orphans. Probe P4 printed `P4 rules after the call ended: 3`, then `P4 after sweep: 0`. So after a
rejected removal, a tab-scoped rule stays on the human's tab until one of those runs. That is the STOP rule's "rule
left installed after its call ended" if it is ever observed. The keeper cannot prevent a Chrome rejection; it can only
retry. **Fix:** add `this.orphans` to the install's `removeRuleIds`. Chrome ignores unknown removal ids, and the caps
check already counts orphans. Or correct the header. Record it for Run 17 as a STOP condition if seen.

**V5 · MINOR · tests: mutant M3d survives (an install after its call's release).** No test calls `install` after
`release`. The real code refuses it (`:161`; probe P1 printed
`P1 rules after install-after-release: 0`), but without that line the rules would go in and never be removed. That is
a leak a test should pin. **Fix:** a test that releases first, then installs, and expects a refusal and 0 rules.

**V6 · NIT · tests: M8b (install caps ignoring orphan counts) and M2d (the rebuild caps check removed) survive.** M2d is
nearly equivalent, because Chrome rejects an over-cap update atomically. M8b is not equivalent: without it, an install
over the caps reaches Chrome. **Fix:** a test with orphans present at an install near the cap.

**V7 · NIT (open item (e)): the rebuild's caps check omits orphan counts, and that is correct.** The orphans are removed
in the same atomic update (`:121`). Probe P6 (cap 4, 3 orphans + 1 live) printed
`P6 install: ok rebuild synced: true rules: 1`. A one-line comment at `:125` would stop the question coming back.

**V8 · NIT · `safety-dnr-keeper.ts:52-53`: a covered method with an invalid `tabId` installs nothing and resolves.**
This is safe today only because `targetTab` (`tabs.ts:43-58`, `requireTabId`) and then `chrome.tabs.get` refuse before
`effect()`. A covered method whose scope comes back null could refuse instead, to fail closed without depending on the
handler's order. Probe P7 belongs with the epoch: any `rebuild`, even of an unchanged list, refuses the installs of
calls created before it (`P7 install after an unrelated rebuild: DISARMED`). That is harmless if S3a calls `mark()` at
the start of `effect()` and rebuilds only when `changes["safety.blockList"]` is present.

**V9 · NIT (record only, item (a)):** 647 new lines against a ~500 cap (#271), noticed by the builder only at the end.
The module's 283 lines include a 25-line contract header.

**Item (b), the API against the real `safety-call.ts`.** It is usable with three changes S3a must make, all named in
`S2-builder.md` §7 apart from V1's order. (1) `decide()` returns `SafetyDecision` only (`safety-call.ts:218-236`), so
the effect read must also return the `SafetyView` before `install(view.ctx.blockList)` can take the gate's own list
(0.5's "one source"). (2) `mark()` can run right before that read: call it at the top of `effect()`. On a download's
second `effect()` it does nothing, because `installing` is already set. (3) In `GatedRouter.handle`
(`router.ts:62-76`), `post()` runs on every path after the handler, whether success, a throw, a handler `TIMEOUT` or a
disarm refusal, so `release` in `post()` covers D2.1's five paths. A receipt refusal skips `post()` but installs
nothing.

Two limits are outside S2. The daemon's timeout does not end the extension's handler: rules stay until the handler's
own bound, which is `waitForLoad` 30 s or the download timer. `back`/`forward` (`handlers/history.ts:5-17`) return after
`chrome.tabs.goBack`/`goForward` without waiting for the load, so their rules may be released before the history
navigation's redirect hops are requested. That is a coverage gap, not a leak. **S3a/Run 17** should measure it, or give
`back`/`forward` a load wait.

**Item (f).** No path in the keeper lets a covered call proceed after a rejected install:
- `installFor` throws the refusal on a clear failure, unsynced, the caps, an id overflow or a rejection.
- `Handle.install` caches the rejection, so a second `effect()` rejects again.
- Uncovered or empty-list installs resolve by design: #295, F15.

A rule outlives its call only through V4 (a rejected removal) or a handler that has not ended (above).

No new runtime fact (no live run).

## 7. Handoff

- S3a: wire `post()` in V1's order. Decide V2's bound. Return the view from `decide()`. Call `mark()` at the top of
  `effect()`. Rebuild only when `safety.blockList` changed or the read fails. Call `sweep()` in `onDisarm`.
- An S2 fixer (if the step agent sends one): V4 (orphans in the install's update or the header), V5 and V6 (tests),
  V7's comment. V3 waits on the user or the session agent (§5).
- The tree is as I found it: the mutants were restored (`cmp` equal) and the probe test file was removed from
  `extension/test/`. `git status --short` shows only the pre-existing `journal.md` and the three S2 files.
