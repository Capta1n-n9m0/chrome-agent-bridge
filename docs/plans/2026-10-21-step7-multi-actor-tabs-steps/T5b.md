# T5b: fixes from Run 8

Step agent report, Claude Opus 5.5, 2026-10-23. The brief came from the session agent; the user's
ruling is decisions.md · 2026-10-23 · The user rules on Run 8: fix stage T5b, then Run 9 (#62).
Base HEAD `8ed3e89`.

## 1. Verdict

**DONE.** All three Run 8 defects are fixed, each with tests that fail without its fix. The verifier
failed round 0 on one MAJOR finding (F1): a hung restore could wedge a window's capture chain. Fix
round 1 closed it. Re-check: **PASS-with-notes**.

Tests: **934 → 965 passed, 59 files** (+31; no test removed). One existing T3 test was re-pointed to
fit the designed change; see § 5.

## 2. Outputs

- **Code** (all in the lane):
  - `extension/src/tabs.ts`: `captureOnce`, `restorePrevious`, `noteFocus`, `cdpCaptureRefusal`.
  - `extension/src/handlers/perceive.ts`: the `mode:"cdp"` branch.
  - `extension/src/handlers/tabs.ts`: `focusTab` calls `noteFocus`.
  - `extension/src/debugger.ts`: a comment only.
  - `daemon/src/intercept.ts`: `fillUrl`, `deliverGrant` and `grantStands`, plus the `sleep` dep.
  - `daemon/src/wsHost.ts`: passes the `sleep` option through.
- **Tests**:
  - `extension/test/capture.test.ts`
  - `extension/test/handler-codes.test.ts`
  - `extension/test/target-tab.test.ts`
  - `daemon/test/tabs.test.ts`
- **Docs**:
  - this report;
  - `T5b.ledger.md`;
  - `T5b-verifier.md` (round 0, and the round-1 re-check);
  - a dated note under Stage T5 in the phase doc.

### What each fix does

1. **A failed or hung switch capture restores the previous tab.**
   - **When.** The restore runs at most once. It runs when the capture settles (success or failure),
     or when the existing 30 s `CHAIN_RELEASE_MAX_MS` bound expires, whichever comes first.
   - **When it is skipped.** It is skipped if the window's active tab, read fresh, is no longer the
     target. It is also skipped if a `focusTab` touched that window since the switch: a per-window
     counter, `noteFocus`, closes T3 V4.
   - **The chain.** It is always released no later than 30 s after the link starts, and it never
     waits on a hung restore (round-1 fix).
   - **Unchanged:** no window focus, and the 1000 ms and 50 ms waits.
2. **`screenshot {mode:"cdp"}` refuses before the debugger attaches.**
   - A minimized window gets `WINDOW_MINIMIZED`.
   - A tab that is not active in its window gets `OFFSCREEN`.
   - Both come with an actionable message: use the default mode, or call `focusTab`.
   - `fullPage` is unchanged.
3. **The daemon fills `leaseGranted.url`.**
   - The opener grant still takes effect at once (F20).
   - When the url is `""` or `about:blank`, the daemon polls the extension's existing `listTabs`, at
     once and then every 100 ms, for at most 2 s. Then it sends the event (or holds it back while a
     `newTab` is in flight), but only if the grant still stands.
   - At the bound it sends the best url it has seen.
   - It adds no wire name, param or code, and no log line.

## 3. Verifier verdict

- **Round 0: FAIL.** F1 is MAJOR: the round-0 code cleared the 30 s bound before the restore settled,
  so a hung `tabs.query` or `tabs.update` wedged the chain. HEAD did not have this defect.
- **Round 1: PASS-with-notes.**
  - In a fresh clean worktree: 965 / 59, typecheck 0, build 0.
  - Mutations: every F1 and F5 mutant is killed (M17–M19, R5). The one survivor, R6 (`release`
    made non-idempotent), is equivalent.
- **Checks that hold:**
  - No lease or lock invariant is loosened; the grant takes effect before any await.
  - `windows.update` appears only in `focusTab`.
  - No new log line.
  - `sw.ts`, `inject.ts` and the content script are unchanged.
  - Nothing changed in `shared/`, `sdk/` or `mcp/`, or on the wire.

## 4. Exit criteria

| Criterion | Status | Evidence |
|---|---|---|
| (a) ≥ 934 + new tests; typecheck and build green in the verifier's worktree | met | 965 / 59 |
| (b) each fix has a test that fails without it | met | builder's revert checks, the verifier's 19 mutations in round 0 and its round-1 re-run |
| (c) invariants intact | met | see § 3 |
| (d) a live expectation per fix | met | see § 9 |
| (e) a phase-doc note naming T5b | met | under Stage T5 |

## 5. Deviations

- **A T3 test was re-pointed.** "mode cdp → Page.captureScreenshot of the viewport on the tab
  itself" (`target-tab.test.ts`) used to capture background tab 12, which fix 2 now refuses by design.
  - It now captures tab 21, which is active in its window and is not the human's tab.
  - A sibling test pins that tab 12 gets `OFFSCREEN` with no debugger.
  - No message text was edited. The verifier accepted it.
- **A same-stage test was replaced in round 1.** The builder's uncommitted test asserted the old
  "release after the restore" rule (next link at 33 000 ms). Its replacement asserts that the chain
  is released at the 30 s bound (next link at 30 000 ms).

## 6. Proposed decisions (for the session agent)

- **2026-10-23 · A switch capture restores the previous tab on its own outcome or at the 30 s bound,
  unless the window moved on.**
  - **Decided:** The restore runs at most once, on whichever comes first: the capture settles, or
    `CHAIN_RELEASE_MAX_MS` expires. It is skipped if the window's active tab is no longer the target,
    or if `focusTab` touched the window since the switch (`noteFocus`).
  - **Decided:** The chain is released no later than 30 s after the link started, without waiting
    on the restore.
  - **Why:** Run 8 SCREEN-5's first attempt left the target in front for ≥ 49 s; T3 V4; verifier F1
    (spec §6.4: a hung screenshot cannot wedge everyone).
  - **Instead of:**
    - restoring only when the capture settles;
    - releasing the chain only after the restore settles (round 0, which could wedge);
    - a new, shorter capture bound (an unmeasured constant).
  - **Revisit if:** a live run shows a restore undoing a human's or an actor's own tab choice, or
    verifier N1 is seen.
- **2026-10-23 · `screenshot {mode:"cdp"}` refuses a minimized window (`WINDOW_MINIMIZED`) or a
  background tab (`OFFSCREEN`) before it attaches the debugger.**
  - **Why:** Run 8 measured both hanging to `TIMEOUT` (SCREEN-2 35 s, SCREEN-4 25 s). A refusal
    shows no banner and adds no unmeasured timing constant.
  - **Why `OFFSCREEN`:** it is the closest existing code ("the target is not on screen").
  - **Instead of:**
    - a time bound on the CDP capture, which still hangs for the bound with the banner up;
    - `INTERNAL`, which reads as a bug;
    - a new code such as `TAB_HIDDEN`, which is a contract change.
  - **Revisit if:** Chrome is measured to capture a hidden tab through CDP, or `fullPage` is measured
    to hang the same way.
- **2026-10-23 · The daemon fills a popup's empty url by polling `listTabs` (every 100 ms, at most
  2 s) before it sends `leaseGranted`; the grant itself takes effect at once.**
  - **Why:** LEASE-3 / F33. No extension→daemon event carries a later url, and the wire is frozen.
  - **Instead of:**
    - a url-update event (a contract change);
    - delaying `tabCreated` in the extension (would delay the grant: breaks F20);
    - documenting `""` as normal.
  - **Revisit if:** a popup's url often takes more than 2 s to appear, or the polling load shows.
- **Doc amendments the SPEC-DISCREPANCY PROTOCOL needs** (outside my lane: for the session agent or T6):
  - (i) Spec §7, the table's `cdp` row ("on the background tab"), and §7.3 ("that *is* the `cdp`
    mode"). These get "*Superseded 2026-10-23: was 'CDP captures a background tab', because Run 8
    SCREEN-2/4 measured it hanging; cdp now refuses hidden and minimized tabs (#62, T5b)*". The same
    goes into the as-built register.
  - (ii) The `ScreenshotMode` comment in `shared/src/protocol.ts` should say "the active tab of a
    visible window only".
  - (iii) The `LeaseGrantedParams.url` comment in `protocol.ts` ("`tabCreated`'s, so may be ''")
    should say "filled from `listTabs` within 2 s; may still be '' or `about:blank` at the bound".
- **Open for the session agent: the switch-mode `WINDOW_MINIMIZED` message (verifier F4).**
  - The message still says `or pass mode:"cdp"`, and cdp now refuses minimized windows too.
  - Changing its text needs a recorded decision. It also needs SCREEN-4's expected text and the
    pinned text in `capture.test.ts:93` changed together, before Run 9 measures anything.
  - Proposed: "restore the window, or call focusTab first".
  - I left it unchanged: editing expected message text is a forbidden fix unless a decision is
    recorded first.

## 7. Escalations

None. The changes stay in the lane: no change to `shared/`, the wire, or the lease and lock rules.

## 8. Findings

Verifier findings, as re-checked:

- **F2/F3: doc staleness** (§ 6 (i)–(iii)).
- **F4: the stale advice** in the switch-mode `WINDOW_MINIMIZED` message.
- **F6: the fill can take up to ~3.1 s.** Its last 1000 ms `listTabs` call can run past the 2 s
  bound. It never loops without limit. After an extension-socket change it sends the best url it has
  (`""`).
- **F8: one case skips the restore for good.** If the bound fires while the switch to the target is
  still pending, the restore is skipped. This is rare.
- **F9: `fullPage` is still unrefused and unmeasured** on hidden or minimized tabs, and `OFFSCREEN`
  now has a second meaning (a hidden tab, besides an element out of view).
- **N1: a late restore can spoil the next capture.** Once the 30 s bound has released the window, a
  slow restore that lands during the next capture's frame wait makes that capture photograph the
  human's tab. The window still ends on the human's tab. For the as-built register.
- **Residual `focusTab` race.** A `focusTab` that lands between the restore's last check and its
  `tabs.update` can still be undone. It is narrowed, not closed; closing it means running `focusTab`
  through the capture chain.

## 9. Handoff

**Run 9 rows** (each needs `npm run build`, the extension reload and the new daemon build):

- **Fix 1.** In an occluded window, a default-mode capture of a background tab hangs. The previous
  tab must be active in its window again about 30 s after the call started, before the daemon's
  `TIMEOUT` (35 s). With a `focusTab` on the target during the hang, the target must stay in front.
- **Fix 2.** On a background tab, `screenshot {tab, mode:"cdp"}` must return `OFFSCREEN` in < 1 s,
  with no debugger banner (SCREEN-2). The same call in a minimized window must return
  `WINDOW_MINIMIZED` in < 1 s (SCREEN-4's cdp sub-case). The active tab of a visible window must
  still capture.
- **Fix 3.** LEASE-3's popup must give `leaseGranted.url` = the popup's url (`…/e2e-playground.html?popup=1`),
  not `""`, within ~2 s of the click. Another client acting on the popup must get `TAB_HELD` even
  before the event arrives.

**Build and count:** the new daemon build id is recorded in `T5b.ledger.md` § Build. The test count
to carry forward is **965 passed, 59 files**.
