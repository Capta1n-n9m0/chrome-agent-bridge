# S2 builder — the DNR rule keeper, pure (Step 11b)

Model / effort: Opus 5.5 (`claude-opus-5-5`), medium. Not committed (brief: Commit no).

## 1. Verdict

**DONE**, with one deviation: the size cap (about 500 new lines) is exceeded, 647 lines (module 283, tests 364).
Nothing remains to build; see §4.

## 2. Outputs

- `extension/src/safety-dnr-keeper.ts` (new): `DnrKeeper`, `DnrCall`, `dnrScopeOf`, `DnrUpdate`, `DnrKeeperDeps`.
  No `chrome.*` in code, no log call (the `safety-static.test.ts` glob picks the file up: +2 tests, no list edit).
- `extension/test/safety-dnr-keeper.test.ts` (new): 20 tests against a fake that holds rules, is atomic and rejects
  duplicate ids (Stage0.md §4), plus five through the real `GatedRouter`.
- Failing first: `npx vitest run extension/test/safety-dnr-keeper.test.ts` before the module →
  `Error: Failed to load url ../src/safety-dnr-keeper.js … Does the file exist?`, `Test Files 1 failed`.
- `npm test`: before **4087 / 158 files** (measured at start) → after **4109 / 159** (+20 keeper, +2 static scan), none
  removed. `npm run typecheck` exit 0; `npm run build` exit 0; `git status --short` after the build: only the two new
  files and the session agent's `journal.md` (not mine).
- Mutants (each applied to the module, test file run, restored; `cmp` confirmed the restore), all red:
  install rejection swallowed (2 red), rebuild failure not flagged unsynced (1), epoch check removed (1), release
  skips removal (14), start-up clear skipped (2), caps ignored at install (1), `rebuild(null)` not refusing (1),
  Chrome's error rethrown instead of the refusal (2), install not once (1), `sweep` removing live rules (1).

Exit checks: **D2.1** five paths (success, refusal, error, timeout, disarm) through the real router, the fake holding 3
rules during the handler and 0 after each; **D2.2** a rejecting install → `DISARMED {scope:"all"}`
`STATE_UNREADABLE_MESSAGE`, effect counter 0, also on the wire; **D2.3** a rejecting rebuild keeps the previous rules
(map equal), `synced` false, the live call's `refusal()` = `stateUnreadableRefusal()`, a new install refused with no
API call, a good rebuild restores installs; **D2.4** pre-existing ids 1, 2, 900 removed by the first update before the
call's rules (ids from 1, which the fake would reject as duplicates otherwise). Plus: parallel calls disjoint and
never reused, 0 rules after release; a list change rebuilds live calls in one update (empty → non-empty included); an
empty list makes no API call (install, rebuild, release); a sentinel in Chrome's rejection is in no refusal or reply.

## 3. Verifier verdict

n/a (builder).

## 4. Deviations

- **Size:** 647 new lines against about 500. The module is 283 (a long header documenting the contract), the tests
  364 (already de-duplicated once). I noticed only at the end, with the work complete; I did not stop mid-way.
- **0.5's "the keeper removes every rule in `onDisarm`"** is not built: the brief and #296 item 5 (F8) amend it; `sweep()`
  removes only orphans (rules no live call owns).

## 5. Proposed decisions

### 2026-10-26 · S2: covered calls are `navigate`, `back`, `forward` (tab) and `downloadStart` (download)
**Decided:** `dnrScopeOf` keys on the class (`navigate` → tab, `downloadStart` → download) and adds `back`/`forward`
by name (class `tab`, #296 item 8); `newTab` and every other method install nothing (#295). A covered tab call with no
valid `tabId` installs nothing (its handler's `targetTab` refuses it before `effect()`). **Why:** F7, #295, #296.
**Instead of:** a new method class (a `safety.ts` change, S3's lane). **Revisit if:** #295 is ruled for `newTab`.
**By:** Claude (proposed)

### 2026-10-26 · S2: a list change between a call's creation and its install refuses that install
**Decided:** each handle carries the keeper's epoch from its creation (or its last `mark()`); every `rebuild` bumps the
epoch; an install whose mark is older is refused with `stateUnreadableRefusal()`. **Why:** a call that read the old
list before the change and installs after the rebuild ran would hold stale rules no rebuild ever fixes; without a
cached list the keeper cannot tell which list is newer, so it fails closed. Rare (an options edit mid-call).
**Instead of:** keeping the last rebuild's list (a second source, forbidden by 0.5). **Revisit if:** Run 17 shows
false refusals. **By:** Claude (proposed)

### 2026-10-26 · S2: `rebuild(null)` (state unreadable) changes no rule and refuses live replies; it does not unsync
**Decided:** the rules stay (removing them would open a hop); each live call's reply is refused; new calls are not
refused by the keeper (their own gate read refuses them while the state stays unreadable). **Why:** stays fail-closed
without locking covered calls after a transient read failure that no storage change would end.
**Instead of:** unsyncing until the next good rebuild. **Revisit if:** a verifier finds a path where a new call
installs from an unreadable state. **By:** Claude (proposed)

### 2026-10-26 · S2: unsynced ends only by a successful rebuild; a failed start-up clear is retried by the next install
**Decided:** after a rejected rebuild (or caps exceeded at rebuild), new covered calls are refused until a `rebuild`
succeeds (a later list change) or the worker restarts. A failed start-up clear is retried at the next install or
rebuild (the clear does not depend on the list). **Why:** #292/#296 literally; a rebuild rejection is a property of
the list (invalid rule, caps) and would recur. **Instead of:** an install retrying the full rebuild. **Revisit if:** a
transient rejection is observed in Run 17. **By:** Claude (proposed)

### 2026-10-26 · S2: ids from one growing counter; a rejected removal leaves orphans retried by every later update
**Decided:** ids are never reused within a worker life (start at 1 after the clear, fail closed past 2^31−1); a
release whose removal rejects keeps its ids as orphans (counted against the caps), removed by the next release,
rebuild, `sweep()` or the start-up clear. **Why:** no shared or reused id across concurrent calls. **Revisit if:** a
removal rejection is ever observed (it would be a "rule left installed" STOP until swept). **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed. No runtime fact (no live run).
- The keeper does not bound a hanging `updateSessionRules`/`getSessionRules`: every covered call would wait on the
  chain. Not asked by the brief; S3 or a verifier may want a bound.

## 7. Handoff — the API for S3

`sw.ts` (S3a), top level, no `await`:
```ts
const dnrKeeper = new DnrKeeper({
  updateSessionRules: (u) => chrome.declarativeNetRequest.updateSessionRules(u as chrome.declarativeNetRequest.UpdateRuleOptions),
  getSessionRules: () => chrome.declarativeNetRequest.getSessionRules(),
  caps: () => ({ sessionRules: chrome.declarativeNetRequest.MAX_NUMBER_OF_SESSION_RULES,
                 regexRules: chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES }),
  extensionId: chrome.runtime.id,
});
void dnrKeeper.ready;            // the start-up clear, next to `void safety.start()`; installs also await it
```
- In the **existing** safety `storage.onChanged` listener (inside `if (area === "local" && touchesSafety(changes))`),
  when `changes["safety.blockList"]` is present or `safety.memory` is unreadable:
  `void safety.read().then((v) => dnrKeeper.rebuild(v.ctx.blockList), () => dnrKeeper.rebuild(null));`
  (`rebuild` never rejects.) No new listener.
- `onDisarm`: `void dnrKeeper.sweep();` — never the live calls' rules.
- `callDeps`/the factory: give `CallSafety` the handle, e.g. `new CallSafety(method, params, callDeps, dnrKeeper.call(method, params))`;
  create it in the constructor (before the receipt read), so the epoch mark is the call's start.

`safety-call.ts` (S3a/S3b):
- `decide()` must return the `SafetyView` it read (F7) so `effect()` can pass `view.ctx.blockList`.
- `effect()`: optionally `this.dnr.mark()` right before `decide("effect")`'s read (narrows false refusals); then
  `const d = await decide("effect"); if refusal throw; await this.dnr.install(view.ctx.blockList);` — install after
  the gate's re-check, before the handler's side effect; its rejection is already a `BridgeError` `DISARMED` with
  `STATE_UNREADABLE_MESSAGE`, rethrow as is. A second `effect()` (download's `checkFinalUrl`) and every uncovered
  method add nothing.
- `post()`: `try { const d = await decide("post"); if (refusal) return d; return this.dnr.refusal(); } finally { await this.dnr.release(); }`
  — the `finally` covers every path (`release` never rejects, runs once). For `listTabs` (no post-check today) the
  handle is inert anyway.
- Typing: `DnrUpdate` is structural; `DnrRule` matches `chrome.declarativeNetRequest.Rule` field names (cast at the
  call site in `sw.ts`).
