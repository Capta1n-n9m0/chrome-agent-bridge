# S6 — `newTab` on `about:blank` · builder report

Builder: Opus 5.5, effort medium. 2026-10-27. Start commit `9f7bf0b` (S6 start for E6.4: `ce1f06d`; the commits
between are docs only). Brief: the S6 builder brief (lane widened by #312, option A of `S6.md`).

## 1. Verdict

**DONE.** Nothing committed (brief: commit no).

## 2. Outputs

**Spec-note commit** (to go first, E6.5):
- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — two dated notes (2026-10-27, #311 item 2): one under
  §6.2's `tabCreated` paragraph (the line range the brief named, after the 2026-10-24 correction), and one §10
  amendment bullet after the S3b one. Both say: for a `newTab` with a URL, `tabCreated.url` reads `about:blank` and
  the tab has one more history entry; no event, field, code or message added; the reply is unchanged.

**Code commit:**
- `extension/src/newtab-open.ts` (new, pure, 52 lines) — `opensBehindRules(url)`, `openBehindRules(steps)`, `BLANK_URL`.
- `extension/src/handlers/tabs.ts` — `newTab` takes the sequence when `call.holdRulesFor` exists and the URL is not
  `about:blank`; the old body is untouched below it.
- `extension/src/safety-call.ts` — `HandlerSafety.holdRulesFor?(tabId)`, `CallSafetyDeps.dnrForTab?(tabId)`,
  `CallSafety.holdRulesFor`, `post()` releases the second handle.
- `extension/src/sw.ts` — exactly one added `callDeps` line:
  `dnrForTab: (tabId) => dnrKeeper.call("navigate", { tabId }), // Step 11b S6 (#312): newTab's blank tab`
- `extension/test/s6-newtab-blank.test.ts` (new, 19 tests).

**Numbers** (commands run in the main tree, Git Bash):
- `npx vitest run` before any change: **4535 passed, 183 files**. `npm test` after: **4554 passed, 184 files** (+19,
  all in the new file; none removed).
- `npm run typecheck`: exit 0. `npm run build`: exit 0 (`built extension → dist/`).
- `git status --short` after the build: the six lane files above only (four `M`, two `??`).
- `git diff ce1f06d --stat -- daemon shared sdk mcp`: empty. 27 codes / 27 router methods / 24 tools: the existing
  count tests pass unchanged (no method, code or tool touched). Log-scan: no `console.` in any changed file (grep: 0),
  `log-scan.test.ts` green → allowlist count +0.
- Size: 41 new source lines + 326 test lines + 1 `sw.ts` line ≈ 420 (cap ~400; slightly over, one coherent piece).

**The design as built.**
1. `newTab`: `effect()` on the URL as today (#175, unchanged) → `tabs.create({url:"about:blank", active})` →
   `call.holdRulesFor(id)` → arm `waitForLoad` → `tabs.update(id, {url})` → await the load → `{id}`.
2. `holdRulesFor(tabId)`: takes `deps.dnrForTab(tabId)` (a `navigate`-class tab handle, so the keeper's caps, epoch,
   rebuild, re-sync and release rules apply unchanged), stores it **before any await** (so `post()` releases it on
   every path), calls `mark()` right before the gate's `effect` read, throws that read's refusal, else
   `install(view.ctx.blockList)` (throws the keeper's `DISARMED`/`STATE_UNREADABLE_MESSAGE`). Once per call (a
   second call throws a plain Error: a wiring slip, answered `INTERNAL`).
3. `post()`: `finally { hop.close; await dnr.release(); await tabRules?.release(); }`, then
   `refusal ?? dnr.refusal() ?? tabRules.refusal()` — both refusals read only after both releases settled.
4. Fail closed: a refusal at the re-check, a rejected install, or a failed `tabs.update` → the blank tab is removed
   (a failing remove is swallowed so the original error passes unchanged) and the error is rethrown; the URL is
   never handed to Chrome before the install resolved. A load timeout keeps the tab, as today.
5. Unchanged paths: no URL, `about:blank`, no `call`, or a `call` without `holdRulesFor` (the handler tests' fakes)
   run the old body byte for byte. Without `deps.dnrForTab` `holdRulesFor` re-checks and installs nothing (inert
   handle); production always wires it.

**Why a pure module:** the brief allowed it; `chrome.*` glue is not unit-tested by convention, so the order lives in
`openBehindRules` with injected steps and the handler only binds `chrome.tabs`/`waitForLoad`. The tests also drive the
real handler with a stubbed `chrome.tabs` and a real `CallSafety`, and once with the real `DnrKeeper` wired exactly as
`sw.ts` wires it.

**Exit checks.**
- **E6.1** — met. Tests "newTab with a URL: about:blank → rules → navigate": the full log order on success
  (`create about:blank` → `dnrForTab 99` → `mark` → `read` → `install` → `installed` → `update <url>` → `read`(post) →
  `release`), refusal at the re-check, error (`tabs.update` throws), timeout (fake timers, 30 s), and a deferred
  install proving `tabs.update` is not called until it resolves. Mutants, each run then restored from a scratchpad copy
  (`diff` confirmed restore):
  - M1 hold not awaited before navigating: **11 failed / 19**. M1b navigate before the hold: **11 failed**.
  - M2 second handle not released in `post()`: **7 failed**. M3 no tab removal after a failed hold: **4 failed**.
  - M4 refusal read before the release settles: **1 failed**. M5 no `mark()`: **6 failed** (by the log order only).
- **E6.2** — met. "a rejecting install": 0 `tabs.update`, `tabs.remove(99)`, `DISARMED` +
  `STATE_UNREADABLE_MESSAGE` + `{scope:"all"}`, released; and with the real keeper whose update rejects: the same.
  The real-keeper success test shows rules with `tabIds:[99]` in force at `tabs.update` and none after `post()`.
- **E6.3** — met. `s2a-handlers.test.ts` (`newTab({}, fakeCall)` → `["effect","tabs.create"]`) and every other existing
  `newTab` test pass unchanged; new tests pin no-URL, `about:blank` and no-`call` to one `create` with the old props.
- **E6.4** — met (above). **E6.5** — for the committer: the spec note commit before the code commit.

## 3. Verifier verdict

None yet (builder).

## 4. Deviations

- The spec note sits in two places: §6.2 (the line range the brief named) and §10 (the phase doc says "§10's
  `tabCreated` paragraph"; §10 has the Step 11b amendment list). Mechanical; both in the spec-note commit.
- Size ≈ 420 lines against ~400; not split (one coherent piece, mostly tests).

## 5. Proposed decisions

### 2026-10-27 · S6: a failed navigation call also closes the blank tab; a load timeout keeps it
**Decided:** if `tabs.update` itself throws after the rules are held, the blank tab is removed and Chrome's error
passes unchanged; a load timeout keeps the tab (and its error) as `newTab` always did. **Why:** before S6 a URL Chrome
refused failed in `tabs.create` and left no tab; removing the blank tab keeps "no orphan tab". **Instead of:** leaving
a blank tab behind on a refused URL. **Revisit if:** Chrome's `tabs.update` error text for a bad URL differs from
`tabs.create`'s in a way a client relies on (unmeasured; an S7 RECORD row could read it). **By:** Claude (proposed)

### 2026-10-27 · S6: a reply refused at the post-check leaves the opened tab, as before
**Decided:** a disarm or a failed rebuild during the load refuses the reply (via `post()`), and the loaded tab stays,
exactly as a pre-S6 `newTab` refused at the post-check. No `onRefused` cleanup added. **Why:** unchanged behaviour
outside the brief's scope; the rules were held through the load. **Revisit if:** the user wants a refused `newTab` to
close its tab. **By:** Claude (proposed)

## 6. Findings

None measured live (no Chrome work). Unmeasured, for S7: the daemon's handling of the earlier `tabCreated` with
`url:"about:blank"` followed by the `{id}` reply, and the exact `tabs.update` error text for a URL Chrome refuses.

## 7. Handoff

Nothing running; no scratch file left in the repo (mutant backups in the session scratchpad only). The committer
needs two commits in order: (1) the spec file; (2) the five code/test files. The loaded extension is not reloaded;
S7 needs `recipes/reload-extension.ps1` after `npm run build`.
