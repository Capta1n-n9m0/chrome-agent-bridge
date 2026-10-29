# Step 13 — S1 verifier report (G1, the background opener's popup)

Model: Opus, effort medium. Role: verifier (`docs/agent-rules.md` §6), the second verifier of S1. The earlier verifier's
partial files (`S1-verifier-checks.txt`, `S1-verifier-test-*.txt`) are not mine; this report uses only `S1-verifier-r-*.txt`.
Read: phase doc § 0.2, the dated note, § S1, Exit checks, STOP rules; decisions.md #385, #393; `Stage0.md` §5 and its
Measured facts; `stage0-audit.md` §4; spec §10's note (commit `6cb3d4b`); the `CLAUDE.md` files of `extension/`,
`extension/src/` and `daemon/`. I audited the claims in `S1-builder.md`.

## 1. Verdict

**PASS-with-notes.** Every pre-registered check S1 owns passes: G1.1 (with the dated note's added mutant), G1.2, G1.3,
and the every-stage checks. There are 0 CRITICAL, 0 MAJOR, 2 MINOR and 2 NIT findings (§6).

## 2. Outputs (commands I ran)

Main tree, the uncommitted S1 build, run read-only:
- `npm test`: **Test Files 236 passed (236), Tests 5616 passed (5616)**, exit 0 (`S1-verifier-r-test.txt`).
  - n re-derived: 16 `it(` in `opener-join.test.ts` (`grep -c "^  it("`), plus 4 `+ it(` lines in the diff of
    `tab-events.test.ts` and `manifest.test.ts` (3 + 1). That makes n = 20, and 5596 + 20 = 5616.
  - The diff of `extension/test` has 0 removed `it(` lines.
- `npm run typecheck`: exit 0. All seven `recipes/tsconfig*.json` files pass `npx tsc --noEmit -p`: `.fe`, `tsconfig`,
  `.s10`, `.s11`, `.s11b`, `.s6` and `.s9` each exit 0. There are 0 `error TS` lines (`S1-verifier-r-typecheck.txt`).
- `npm run build`: exit 0 (`S1-verifier-r-build.txt`).
  - `git status --short` after the build, against the status taken before it: only my own `S1-verifier-r-*` files
    were added. There is no tracked change from the build (`S1-verifier-r-status-after-build.txt`).
  - `extension/dist/sw.js:6275` holds the one listener.

Scratch worktree at `6cb3d4b`, outside the repo, with its own `npm ci`; removed afterwards:
- **The new tests fail on the pre-slice code.** I copied in only the four changed or new test files
  (`S1-verifier-r-red-preslice2.txt`): Test Files 4 failed (4), Tests 7 failed | 27 passed.
  - `opener-join.test.ts` fails to load (the module does not exist).
  - The 3 `joinedTabCreated` tests fail.
  - The 3 manifest pins fail.
  - The listener-count pin in `s3a-dnr-wiring` fails.
- **Mutants:** 15 mutants, on the S1 code copied into the worktree (`S1-verifier-r-mutants.txt`). **14 red and 1
  survivor** (V13, glue order; see M2). Among them:
  - V1, the dated note's G1.1 mutant (an unjoined tab falls back to Chrome's `openerTabId`): **red**, 3 failed.
  - V15, a grant to the caller instead of the source tab's holder (the builder's mutant 2, re-applied in the worktree's
    `daemon/src/intercept.ts`): **red**, with 2 failed in `daemon/test/tabs.test.ts` (the F20 opener tests).
  - V7, the join keyed by `sourceTabId` instead of the new tab's id: 5 red.
  - V14, a `console.log` of `d.url` in the listener: `log-scan` 4 red.
  - V3, `gone` dropping the held tab: 2 red. V4, every tab held: 2 red. V5 and V6 (the early-target rules): red.
  - V9 and V10 (`joinedTabCreated`): red. V11 (the hold changed to 2500 ms): red. V12 (the listener removed): red.

## 3. Verifier verdict

Not applicable (this is the verifier's own report).

## 4. Deviations

- **The scratch worktree's `@bridge/*` junctions.** The brief said to remove them before anything else. I removed all
  five with PowerShell's `cmd /c rmdir`.
  - With them removed, `tab-events.test.ts` cannot load `@bridge/shared`, so the pre-slice run proved nothing
    (`S1-verifier-r-red-preslice.txt`: "Failed to load url @bridge/shared").
  - I re-created the five junctions with `New-Item -ItemType Junction`, each pointing at the worktree's own package
    folder, never the main tree. I ran the proof and the mutants, then removed the junctions again with `cmd /c rmdir`
    before `git worktree remove --force`.
  - `git worktree list` now shows only the main tree, and the path is gone.
  - The incident the rule guards against (#220) was a junction into the main tree, and none existed here.
- I edited no file in the main tree apart from my outputs. The S1 files were copied *from* the main tree into the
  worktree, never back.

## 5. Proposed decisions

None. The builder's one proposal (a navigation target for a tab that has no Chrome `openerTabId` is ignored) is
consistent with #385 ("a tab without `openerTabId` is sent at once") and is the conservative side. I agree with it.

## 6. Findings

### M1 · MINOR · the spec §10 note leaves out two sentences #385 said it carries
- **Where:** `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, the 2026-10-29 note (commit `6cb3d4b`).
- **What #385 requires:** Stage0.md §5 (#385) says "The note also says that `listTabs` rows keep Chrome's own
  `openerTabId`", and that the worker-restart loss inside the 250 ms hold is "documented as a limit".
- **What is there:** `git show 6cb3d4b -- docs/specs` has neither sentence. The restart limit appears only in the header
  of `extension/src/opener-join.ts:12`, and `docs/setup.md` does not mention it.
- **Why it matters:** a reader of the spec could assume `listTabs` rows and `tabCreated` agree on the opener. They do
  not: `extension/src/handlers/tabs.ts:35` still copies Chrome's `t.openerTabId`.
- **Fix:** add the two sentences to the §10 note. This is the session agent's or a doc fixer's lane, since the note is
  already committed.

### M2 · MINOR · the order "held `tabCreated` before `tabRemoved`" has no test
- **Where:** `extension/src/sw.ts:249` (and the same order at line 257 for `tabReplaced`).
- **Evidence:** mutant V13 moved `openerJoin.gone(tabId)` after the `tabRemoved` send. All of `extension/test` stayed
  green: Test Files 85 passed, Tests 2536 passed (`S1-verifier-r-mutants.txt`).
- **What the code does:** it is correct by reading. `gone` emits synchronously into `sendTabEvent`'s one ordered chain
  (`sw.ts:208-219`), ahead of the `tabRemoved` frame.
- **Why it matters:** the reversed order would make the daemon mint a handle for a tab that is already gone, a leaked
  dead handle. No e2e row covers a close inside the hold either.
- **Fix (either):**
  - a static pin in `s3a-dnr-wiring.test.ts` that `openerJoin.gone(` comes before `tabRemovedParams(` in the
    `onRemoved` listener (and before `tabReplacedParams(` in the `onReplaced` one);
  - or an e2e row (close a popup within 250 ms of opening it from a tab with no navigation target).

### N1 · NIT · stale test title
- **Where:** `extension/test/s3a-dnr-wiring.test.ts:224`.
- **What:** the title still reads "the listener count is unchanged (19)" while the test pins 21. The comment explains
  the history, but the title is wrong.
- **Fix:** retitle it.

### N2 · NIT · ordering across tabs, accepted but not written down outside the builder's report
- **What:** a held `tabCreated` can now be overtaken by other tabs' events for up to 250 ms. In practice that happens
  only when no join comes, since a join arrives within 0.6 ms.
- **Daemon impact:** I read `daemon/src/intercept.ts:313-342`. No daemon path depends on the relative order of
  different tabs' events. A popup of an unjoined popup gets no grant, which is right, since the parent has no holder.
- **Fix:** a phrase in the closeout's gotcha would do.

### Checks attacked, with no finding
- **Held events and timers:** every held entry leaves through the timer, a join or `gone`, and the `releaseCreated`
  entry is deleted on every emit. Early targets expire at 250 ms (V6 red if not). A duplicate `onCreated` emits once.
  A tab filtered out by `tabCreatedParams` only leaves an early entry that expires. No leak.
- **Blind spots:** I checked each covered one by reading the test and by its mutant.
  - B1 (V7), B2, B3 (V4, V5), B7, B8, B9 (pure part), B10 (V3) and B13 (V14, the source scan) hold.
  - B14 holds by reading: the released params still pass `redactTabCreated` with the URLs captured at `onCreated`.
  - B15 holds by reading: a claim or a `listTabs` mint inside the hold leaves `applyOpener` to grant only to an
    unleased tab, so the rule is unchanged.
  - B4–B6, B11, B12 and B16 are outside S1's lane or moot under #385. The daemon is unchanged, and its opener tests
    pass unchanged (V15 shows they are discriminating).
- **Logging and security:**
  - The listener passes only `d.tabId` and `d.sourceTabId` (`sw.ts:243`).
  - `opener-join.ts` has no `url` token and no log call, and a test pins both.
  - `extension/test/log-allowlist.ts` is unchanged (not in `git status`), and `log-scan` and `log-sentinel` are green.
    G1.3 log sites: +0.
  - No router method was added, so `METHOD_CLASSES` and `daemon/src/methods.ts` are unchanged.
  - `shared/src/protocol.ts` and `daemon/src/intercept.ts` are unchanged.
- **G1.2:** the manifest diff is exactly one appended `"webNavigation"`. `host_permissions` is unchanged and there are
  no `optional_*` keys. The test header cites #374 item 1 and #393.
- **The s3a pin change:** this is not a weakening. 20 → 21 counts the one listener the brief requires, and a new
  assertion pins exactly one `webNavigation.onCreatedNavigationTarget.addListener(`, so a second listener or a missing
  one goes red (V12 red).
- **The doc lines:**
  - `docs/setup.md` matches the code: 250 ms, unowned when no match comes, a reload needed.
  - `docs/e2e-test-plan.md` §1 item 5 matches.
  - POP-JOIN-1/2/3 describe what the code does. POP-JOIN-3's Ctrl+click case expects the `opener` lease, which matches
    a join (verifier V4 in Stage 0: 10/10).

No new runtime fact; nothing was run live.

## 7. Handoff

- No processes were left running. The daemon and Chrome were not touched, and the extension was not reloaded.
- The scratch worktree and its junctions are removed.
- Evidence (all in this directory):
  - `S1-verifier-r-test.txt`, `S1-verifier-r-typecheck.txt`, `S1-verifier-r-build.txt`;
  - `S1-verifier-r-status-after-build.txt`;
  - `S1-verifier-r-red-preslice.txt` (without the junctions, not discriminating) and `S1-verifier-r-red-preslice2.txt`
    (the proof);
  - `S1-verifier-r-mutants.txt`.
- For the step agent: M1 and M2 are fixable in one small round, or can be left for closeout. Neither blocks the verdict.
