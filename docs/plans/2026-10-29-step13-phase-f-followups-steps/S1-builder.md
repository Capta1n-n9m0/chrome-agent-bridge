# Step 13 — S1 builder report (G1, the background opener's popup)

Model: Opus, effort medium. Role: builder (`docs/agent-rules.md` §6). Not committed (brief: Commit: no).

## 1. Verdict

**DONE.** The shape of #385 is built: a pure join module, one top-level `webNavigation.onCreatedNavigationTarget`
listener in `sw.ts`, the `tabCreated` path held and released through the join, `webNavigation` in the manifest and
pinned, and the setup and e2e doc lines. The size is 359 new lines against a cap of 350 (see §4).

## 2. Outputs

Files:
- `extension/src/opener-join.ts` (new, 83 lines): `OpenerJoin` and `OPENER_JOIN_HOLD_MS = 250`, with injected timers.
  Its inputs are `created(tabId, chromeOpenerTabId)`, `navigationTarget(tabId, sourceTabId)` and `gone(tabId)`, all
  numbers. It emits `(tabId, openerTabId | undefined)`. It has no log call, and nothing but tab ids enters it.
- `extension/src/tab-events.ts` (+11): `joinedTabCreated(params, joinedOpener)` drops Chrome's `openerTabId` and puts
  in the joined one, or none. A tab without Chrome's `openerTabId` is returned as the same object.
- `extension/src/sw.ts` (+20/−2):
  - `releaseCreated` (tab id → a closure that sends the event) and the `OpenerJoin`.
  - The `onCreated` listener now registers the closure and calls `openerJoin.created`. The closure keeps today's
    `redactTabCreated` and `sendTabEvent` chain, now applied to `joinedTabCreated(...)`.
  - The new listener reads only `d.tabId` and `d.sourceTabId`.
  - `openerJoin.gone(tabId)` runs before the `tabRemoved` frame is sent, and `openerJoin.gone(removedTabId)` before
    `tabReplaced`.
- `extension/manifest.json`: `permissions` gains exactly `"webNavigation"` (diff: one line, appended).
- `extension/test/opener-join.test.ts` (new, 16 tests), `extension/test/tab-events.test.ts` (+3 tests),
  `extension/test/manifest.test.ts` (+1 test; the two older pins now read `NOW`; the header cites #374 and #393).
- `extension/test/s3a-dnr-wiring.test.ts`: the listener-count pin goes 20 → 21, with a new assertion that exactly one
  `webNavigation.onCreatedNavigationTarget.addListener(` exists. This file is outside my lane (see §4).
- `docs/setup.md`:
  - An "Updated 2026-10-29" sentence in the upgrade notes: the new permission, #374, #393, reload.
  - A dated note under Owners (leases): the popup lease and the unjoined case.
- `docs/e2e-test-plan.md`:
  - A note under §1 item 5 (load the extension): the permission.
  - Three glue rows in §4.6, after HIST-1:
    - POP-JOIN-1: the listener and the permission are live, and nothing is logged.
    - POP-JOIN-2: a background opener's popup goes to the opener's holder.
    - POP-JOIN-3: a tab with no navigation target is neither delayed nor granted; the Ctrl+click case.
  - Run 20's sheet is untouched.

Numbers (each produced by the command named):
- Tests: before **5596 passed, 235 files** (`npm test`, before any change; `S1-builder-test-before.txt`). After
  **5616 passed, 236 files** (`npm test`; `S1-builder-test-after.txt`). That is +20 (16 + 3 + 1), and no test was
  removed.
- `npm run typecheck`: exit 0. All seven `recipes/tsconfig*.json` via `npx tsc --noEmit -p`: exit 0
  (`S1-builder-typecheck.txt`).
- `npm run build`: exit 0 (`S1-builder-build.txt`). After the build, `git status --short` shows only my edits and
  the session agent's `journal.md`; there is no tracked change from the build.
- Lines (`git diff --numstat` + `wc -l`): 359 new lines of code and tests. Code is 115 (83 + 20 + 11 + 1) and tests
  are 244.

Test-first (G1.1):
- `npx vitest run extension/test/opener-join.test.ts` on the pre-slice tree failed: "Failed to load url
  ../src/opener-join.js … Does the file exist?", Test Files 1 failed (`S1-builder-red.txt`).
- `npx vitest run extension/test/tab-events.test.ts` failed: 3 failed | 11 passed, all three in `joinedTabCreated`
  (`S1-builder-red-tab-events.txt`).
- The manifest test, run against the manifest without `webNavigation`, failed 3 times (`S1-builder-red-manifest.txt`).
- All three are green after the change.

Mutants (temporary, both reverted; `git status --short daemon/` was empty after the revert, and the module is back
to its committed-to-be text):
1. **An unjoined tab falls back to Chrome's `openerTabId`.** In `opener-join.ts` the hold timer emitted
   `chromeOpenerTabId` instead of `undefined`. `opener-join.test.ts`: **3 failed | 13 passed**. The failures are
   "no join within 250 ms … never Chrome's value", "a navigation target for a tab never seen …" and "a navigation
   target after the flush …" (`S1-builder-mutant1.txt`).
2. **A grant to the caller instead of the source tab's holder.** This is only observable in the daemon, so it was
   written there temporarily. `daemon/src/intercept.ts` `request()` recorded the latest caller, and `applyOpener`
   granted to that caller over the opener tab's holder. I ran `daemon/test/tabs.test.ts`, `daemon/test/leases.test.ts`,
   `mcp/test/multi-actor.test.ts` and `sdk/test/client-events.test.ts`: **2 failed | 72 passed**. The two failures
   are both existing opener tests, "F20 window: an unrelated popup from A's tab during B's newTab is held by A …" and
   "F20 window: the opener's holder disconnecting …". The diff and output are in `S1-builder-mutant2.txt`. After the
   revert, `tabs.test.ts` gives 58 passed.

Existing opener tests (`daemon/test/tabs.test.ts`, `extension/test/tab-events.test.ts`'s `tabCreated` cases) are
unchanged and green. `daemon/src/intercept.ts` and `shared/src/protocol.ts` are unchanged.

G1.3, log sites +0:
- `extension/test/log-allowlist.ts` is unchanged (`git diff --stat` empty).
- `log-scan.test.ts` and `log-sentinel.test.ts` are green (37 passed with `s3a-dnr-wiring`).
- `opener-join.ts` contains no `console.` or `log(`, and a test pins that, along with no `url` token in the module
  source. The `sw.ts` additions contain neither.

G1.2: the manifest diff is exactly `, "webNavigation"`. The new test "permissions are Step 11b's list plus exactly
webNavigation, appended" pins it, and the file header cites #374 (item 1) and #393.

### Blind spots (stage0-audit.md §4)

Covered in tests (the extension's join):

| Spot | Covered by |
|---|---|
| B1 | Join keyed by the new tab's id: the "two held tabs join independently" test. |
| B2 | Navigation target first. |
| B3 | A tab without Chrome's opener goes straight through, also when a target came first. Today's output is kept: no `openerTabId`, sent at once. A blocked popup makes no tab, so there is nothing to join. |
| B7 | Source tab closed before the join: the join still names the source, and the daemon finds no holder (the daemon rule is unchanged). |
| B8 | Popup of a popup. |
| B9 | Pure part only: a target for a tab never seen is dropped after the hold, and a later `created` is not joined. The restart itself is glue and a documented limit (module header). |
| B10 | `tabReplaced` of a held tab flushes it unjoined. `gone` drops an early target. |
| B13 | Ids-only signature (`length` 2, numbers); the static check on the module source; the listener pin; allowlist unchanged. |

By construction only, not unit-tested:
- **B14:** `redactTabCreated` still wraps the released params, with the URLs captured at `onCreated`. The safety view
  is now read at release, up to 250 ms later, which is fresher.

Out of my lane (daemon-side, or made moot by #385):
- B4, B5, B6: the daemon's opener rule, unchanged and covered by the existing tests.
- B11: F20, the daemon's `newTab` interplay. An extension `tabs.create` carries no `openerTabId` (Stage 0, 5 of 5), so
  `newTab`'s tab is never held.
- B12: old extension and old daemon. There is no wire change; an old daemon reads the joined value as before.
- B15: a claim of the popup inside the hold. The daemon has not minted it until `tabCreated` arrives, unless a
  `listTabs` resync mints it first, in which case `applyOpener` sees a leased tab and grants nothing.
- B16: the hello feature does not apply under #385.

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **Size: 359 lines against the cap of 350**, about 1.03×. It is one coherent piece and the excess is tests. Code is
  115 lines; tests are 244. agent-rules.md §7 allows up to 1.5× in that case.
- **`extension/test/s3a-dnr-wiring.test.ts` was edited, outside the named lane.**
  - Its static pin of the `addListener(` count in `sw.ts` (20) went red with the one listener the brief requires.
  - I re-pinned it to 21 with a dated comment, the same way Step 12 S3a did, and added an assertion of exactly one
    `onCreatedNavigationTarget` listener. That makes the pin stricter, not looser.
  - The alternative was a red suite against the brief's own requirement. The step agent may reject this and escalate
    instead.
- **Order of events.** A held `tabCreated` can now go out after a later tab's events, up to 250 ms. A `tabRemoved` or
  `tabReplaced` of the held tab itself still follows it, because `gone` runs first. No daemon path depends on the
  relative order of different tabs' events, as far as I read `intercept.ts` `extensionEvent`.

## 5. Proposed decisions

### 2026-10-29 · A navigation target with no Chrome `openerTabId` on its tab is ignored
**Decided:** if `onCreatedNavigationTarget` names a tab whose `tabs.onCreated` has no `openerTabId`, the tab is sent at
once with no opener, as before S1. **Why:** #385 says "a tab without `openerTabId` is sent at once", and keeping today's
output is the conservative side. No such case was measured: 60 of 60 joined tabs had an opener. **Instead of:** granting
from `sourceTabId` alone. **Revisit if:** Run 20 finds a popup with a source but no Chrome opener. **By:** Claude (proposed)

## 6. Findings

None against the pre-registered checks. No new runtime fact; nothing was run live.

## 7. Handoff

- No processes were left running. No Chrome was touched, the extension was not reloaded and no daemon was started.
- The user's Chrome must reload the extension after this build (`recipes/reload-extension.ps1`) before Run 20's
  R20-POP-BG (G1.4).
- For the committer:
  - Files: `extension/src/opener-join.ts`, `extension/src/sw.ts`, `extension/src/tab-events.ts`,
    `extension/manifest.json`, `extension/test/opener-join.test.ts`, `extension/test/tab-events.test.ts`,
    `extension/test/manifest.test.ts`, `extension/test/s3a-dnr-wiring.test.ts`, `docs/setup.md`,
    `docs/e2e-test-plan.md`, this report and the `S1-builder-*.txt` evidence.
  - Not `journal.md`.
- The `extension/CLAUDE.md` Key files and the `daemon/CLAUDE.md` gotcha ("A popup of a background opener gets no
  lease at all …") need the session agent's update at closeout.
