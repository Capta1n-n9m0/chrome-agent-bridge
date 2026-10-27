# S6 — `newTab` on `about:blank` · verifier report

Verifier: Opus 5.5, effort medium. 2026-10-27. Audited: the uncommitted S6 build in the main tree (HEAD `9f7bf0b`;
S6 start `ce1f06d`, the commits between are docs only: `git diff --stat ce1f06d HEAD` touches only `docs/`).
Read only; no tracked file edited; no Chrome work. Scratch: a `git worktree` in the session scratchpad with its own
`npm ci` (its `node_modules/@bridge/*` workspace junctions pointed only inside the worktree; removed with
`cmd /c rmdir` before the folder was deleted; main `node_modules/.bin` still 42 entries, `git worktree list` shows only
main).

## 1. Verdict

**FAIL** — one MAJOR (V1): the load wait can resolve on the blank tab's own `about:blank` load, so the reply and the
rule release can come before the URL's load. The builder's tests cannot see it (all 19 pass when the URL never loads).
Every other exit check holds, and so does the keeper accounting #312 asks for.

## 2. Outputs and numbers (re-derived)

| Check | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` (main tree) | exit 0 |
| tests after | `npm test` (main tree) | `Test Files 184 passed (184)`, `Tests 4554 passed (4554)`, exit 0 |
| tests before | `npm test` in a worktree at `9f7bf0b` (code = `ce1f06d`) | `183` files, `4535` tests; 9 failed, all in `recipes/test/s11-r16-runner.test.ts` (see N4: environmental, the worktree's CRLF checkout) |
| delta | | +19 tests, +1 file, all in `s6-newtab-blank.test.ts`; `git diff ce1f06d -- extension/test` is empty (no existing test edited or removed) |
| build | `npm run build` | `built extension → dist/`, exit 0; `git status --short` afterwards: the seven S6 files only |
| E6.4 diff | `git diff ce1f06d -- daemon shared sdk mcp \| wc -l` | `0` |
| router methods | `grep -c 'router.on("' extension/src/sw.ts` before/after | 27 / 27 |
| tools, codes | `mcp/test/tools.test.ts` (24), shared code tests | pass unchanged inside the 4554 |
| log sites | no `console.`/log call in `newtab-open.ts` or the changed lines; `log-scan.test.ts` (16) and `log-sentinel.test.ts` (7) green | +0 |
| sw.ts | `git diff -U0 -- extension/src/sw.ts` | exactly one `+` line: `dnrForTab: (tabId) => dnrKeeper.call("navigate", { tabId }), …` (#312) |

**New tests fail on the code before the stage.** In the worktree (pre-stage `tabs.ts`, `safety-call.ts`):
the test file alone fails to load (`newtab-open.ts` missing: whole file red). With only `newtab-open.ts` added:
**9 failed / 10 passed of 19**. The 9 red are every handler-level E6.1/E6.2 test and both real-keeper tests. The
10 green are the 7 tests of the new module itself (they go red without it) and the 3 E6.3 tests, which pin today's
path and are meant to pass on both trees. Evidence: `pre-with-module.txt` (scratchpad).

**The plan's verifier-focus mutant** (navigate before the install resolves: `holdRules` started without waiting,
`navigate` called, then `await held`, in `newtab-open.ts`): **11 failed / 19**. That covers the pure-sequence
tests, every handler E6.1 test and E6.2. File restored and diffed equal to the main tree.

## 3. #312 "Revisit if": the second handle on every path and in the keeper's accounting

I wrote a scratch test (`zz-verifier-s6.final.ts` in the scratchpad, never in the repo). It uses the **real
`GatedRouter`**, the **real `CallSafety`** and the **real `DnrKeeper`** over a fake DNR, wired as `sw.ts:73–76`, with
a stubbed `chrome.tabs`. Each case asserts the fake's session rules = 0 and the keeper's `live` map size = 0 after
the reply. **All 9 cases pass** (with the blank tab's `complete` delivered before the listener is armed, which is
Stage 0's order):
- Release paths: success (rules = 1 at `tabs.update` and at the URL's load, 0 after); refusal at the
  `holdRulesFor` re-check (no `update`, `remove(99)`); rejected install (`DISARMED`, no `update`, `remove(99)`);
  `tabs.update` throws (`remove(99)`, Chrome's text unchanged); load timeout (tab kept, `Timed out waiting for
  tab 99 to load`); post-check refusal (`DISARMED`, tab kept); a throw before `holdRulesFor` (`tabs.create`
  throws: no handle made, nothing to release).
- Rebuild while the handle holds rules: its rule is replaced in one update by the new list's, still
  `"tabIds":[99]`. The old pattern is gone.
- Failed rebuild while it holds rules: the reply is refused `DISARMED {scope:"all"}`. `synced` stays `false` and
  `getSessionRules` is not called while the handle is live. The idle re-sync runs at its release and `synced` is
  `true` after it.

By reading: `holdRulesFor` sets `this.tabRules` before any await (`safety-call.ts:299–300`). `post()` releases it
in its `finally`, after the call's own handle (`:322–325`), and reads `tabRules.refusal()` only after both releases
(`:326`). `GatedRouter.handle` runs `post()` on every handler outcome (`router.ts:67–75`). The handle is an ordinary
`Handle`, so `installFor`/`rebuild`/`releaseFor`/`resyncIfIdle` count it through `live` with no special case.
**#312's Revisit-if is not met.**

## 4. Findings

### V1 — MAJOR — the load wait can take the blank tab's own `complete`; the reply and the release can come before the URL loads
`extension/src/newtab-open.ts:42` (with `handlers/tabs.ts:93`, `tabs.ts:299–313` `waitForLoad`).
`waitForLoad` resolves on the first `onUpdated {status:"complete"}` for the tab id. In the new sequence it is
armed after `holdRules`, on a tab that was **just created on `about:blank`** and has its own `loading → complete`
to report. If that `complete` arrives after the listener is armed, three things follow:
- `newTab` replies `{id}` before the URL has loaded.
- `post()` releases the tab's rules while the redirect chain is still in flight. This is the very leak S6 exists
  to close (R17B-RD-2 / D7.3 would show it, and only some of the time).
- A URL that never loads answers `{id}` instead of today's timeout.

`navigate` has the same arming pattern, but its tab finished loading long before, so it has no stale `complete`.
Evidence:
- Scratch V-3 (real router/CallSafety/keeper; the blank's `complete` delivered after arming, just before the URL's
  load): reply `{id}`, log `["create about:blank","update http://localhost:8083/redirect rules=1","blank-complete
  fired","url-complete rules=0"]`. The rules were gone when the URL's load finished.
- The builder's own tests do not discriminate. Their stub fires a `complete` for the `about:blank` create at
  `setTimeout(0)` (`s6-newtab-blank.test.ts:125`), and with `holdRulesFor` microtask-only that event resolves the
  wait. Removing the URL's own `complete` from the stub's `update` (`stub-noUrlLoad.txt`): **`Tests 19 passed
  (19)`**. So E6.1's "navigate → release" order on success is shown only because the blank's load stands in for the
  URL's.
- How likely this is in real Chrome is unmeasured. Stage 0's c7ab variant had one IPC (`updateSessionRules`)
  between create and arming and saw no early resolution in 10 of 10 (`url=<final>` after the wait). Production
  puts more IPCs there (the storage read and the DNR update), which makes an early blank `complete` more likely to
  have been delivered already, but no ordering is guaranteed.

**Suggested fix (design-local, in lane):** before arming, let the blank tab finish its own load: `tabs.get(id)`,
and if `status !== "complete"`, wait for its `complete` with a short bound. Alternatively, make this sequence's
load wait ignore a `complete` until the tab has reported `loading` after `navigate` was issued. Do **not** filter
on `url !== "about:blank"`: a URL such as `about:blank#x` would then hang. Add a test where the blank's `complete`
arrives after arming and the URL's load never comes: it must end in the timeout, not `{id}`, and the release must
come after the timeout. Add another where the URL's `complete` arrives later: the reply and the release must come
after it.

### V2 — NIT — `holdRulesFor` fails open when it gets an inert handle
`safety-call.ts:299`: with `deps.dnrForTab` absent, or a tab id that `dnrScopeOf` rejects (not a safe integer
≥ 0), the handle is inert. `install` resolves with no rule, and the URL is opened with no rules. Production wires
`dnrForTab` and `tabs.create` returns integer ids, so this is unreachable today. Suggest: in production wiring,
refuse (`stateUnreadableRefusal`) when no tab-scoped handle can be made, or at least document it as test-only.

### V3 — NIT — stale text outside the lane
`safety-dnr-keeper.ts:7` ("`newTab` is not covered, #295") and `extension/src/CLAUDE.md`'s bullet ("Not covered:
`newTab`'s first request") go stale once S6 lands. They are S8's or the session agent's to update (out of S6's lane).

### V4 — NIT — the pre-stage count run had 9 failures, unrelated to S6
`recipes/test/s11-r16-runner.test.ts` (Stop-S16Pid/Stop-S16Wave regex checks) failed 9 times in the fresh worktree
on both full and single-file runs. The worktree checks out `recipes/s11-r16.ps1` with CRLF (`core.autocrlf=true`).
The file is not touched by S6 and passes in the main tree. The count (4535 / 183) matches the builder's.

### V5 — NIT — answers for a URL Chrome refuses
Before S6, a URL Chrome rejects failed in `tabs.create`; now it fails in `tabs.update` after a blank tab was made
and removed. Clients therefore see a transient `tabCreated`/`tabRemoved` pair, and Chrome's error text may differ
(unmeasured). Both stay raw → `INTERNAL`. The spec note says nothing about the transient pair. Suggest an S7
RECORD row, as the builder proposes.

## 5. Spec note (E6.5)

`git diff -- docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` touches only that file, so the note can be
committed separately. It has two dated notes: §6.2 after the 2026-10-24 correction, and a §10 bullet after the S3b
one. They state the accepted differences (`tabCreated.url` = `about:blank`, one more history entry), that nothing
is added to the wire, that `{id}` is unchanged, the order, and the fail-closed refusal. This is accurate to the code
apart from V1. The §10 bullet's "the rules come out after the post-check, on every path" holds only once V1 is
fixed, because the post-check can currently run before the URL's load. E6.5 is the committer's (spec commit first).

## 6. The builder's proposed decisions and the plan's refusal handling

- **`tabs.update` failure closes the blank tab — agree.** It keeps "no orphan tab" (the STOP clause "leaving a
  blank tab after a refused install" in spirit). Before S6, a rejected URL left no tab.
- **A post-check refusal keeps the loaded tab — agree.** The tab is not blank and the install was not refused.
  This is today's `newTab` and `navigate` behaviour, so the STOP clause does not apply. The same holds for a
  refusal from a failed rebuild during the load: Chrome's previous rules stayed in force (atomic update).
- **A refusal at `holdRulesFor`'s re-check** (not the install) is handled like a rejected install: no `update`,
  the blank tab is removed, the gate's own refusal is thrown, and the handle is released (builder test plus scratch
  V-1). That is the conservative reading of the plan's fail-closed item.

## 7. Exit checks

- **E6.1:** order and mutant OK. **Not discriminating** for "release after the URL's load" on success (V1).
- **E6.2:** met (fake handle and real keeper). The scratch run with the real router agrees.
- **E6.3:** met. `git diff ce1f06d -- extension/test` is empty. The no-URL, `about:blank` and no-`call` paths
  are byte-for-byte the old body (`tabs.ts`, the lines after the new `if`).
- **E6.4:** met.
- **E6.5:** pending the committer; the note is separable.
- **Every-stage checks:** met (counts above). Size (`git diff --numstat`, `wc -l`): 52 lines in
  `newtab-open.ts`, +17/−1 in `tabs.ts`, +23/−2 in `safety-call.ts`, +1 in `sw.ts`, 326 test lines: about 419 lines
  in all against a cap of about 400. Slightly over, one coherent piece, as the builder reported.

## 8. Handoff

Nothing running. Scratch evidence is in the session scratchpad
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\d035dea7-b98d-4720-a2c2-977e538a66da\scratchpad\`
(`zz-verifier-s6.final.ts`, `v-scratch.txt`, `v-scratch2.txt`, `mutant-navfirst.txt`, `stub-noUrlLoad.txt`,
`pre-with-module.txt`, `pre-full-test.txt`, `test.txt`). A fresh verifier after the fix needs to re-check only V1:
the two new tests, the stub-without-URL-load check going red on the current code, and the scratch V-3 shape.
