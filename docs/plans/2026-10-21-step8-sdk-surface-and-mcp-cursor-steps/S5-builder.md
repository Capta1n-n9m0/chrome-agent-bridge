# S5 builder report — the MCP cursor and tools

2026-10-23 · builder · Opus 5.5 · base d72aeda (S2b committed meanwhile as efb8557/9b903d9) · nothing
committed, nothing run live.

## Blocker outside the lane (read first)

`mcp/test/multi-actor.test.ts` (not in this lane: "do not edit it") asserts the pre-S5 `browser_new_tab`
behaviour: actor B, whose first-touch claim was refused (so it has **no cursor**), opens a tab and the
test expects `Opened tab T\d+` and `newTab {url, active: true}`. Under phase doc 0.6 applied literally
(design point 4, F26) B's tab opens in the background. That one test now fails — the only failure in
`npm test`. The fix is the designed change, four lines, checked on a copy (`mcp/test/zz-tmp-multi.test.ts`,
deleted after: 4/4 passed):

```diff
-    // B opens its own tab (active:true, 0.8) and works there.
+    // B opens its own tab and works there; with no cursor yet it opens in the background (0.6, F26).
     const opened = await b.run("browser_new_tab", { url: "http://localhost:8080/other.html" });
-    expect(opened).toMatch(/^Opened tab T\d+$/);
-    const bTab = opened.slice("Opened tab ".length);
-    expect(ext.received.find((r) => r.method === "newTab")!.params).toEqual({ url: "http://localhost:8080/other.html", active: true });
+    expect(opened).toMatch(/^Opened tab T\d+ \(in the background — browser_focus_tab shows it\)$/);
+    const bTab = opened.match(/^Opened tab (T\d+)/)![1];
+    expect(ext.received.find((r) => r.method === "newTab")!.params).toEqual({ url: "http://localhost:8080/other.html", active: false });
```

Its header comment also says "the 22 tools" (now 23). The script that applies it:
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\98d37e15-74d6-4e30-9f89-cd26d9d75a28\scratchpad\patch-multi.cjs`
(`node patch-multi.cjs mcp/test/multi-actor.test.ts mcp/test/multi-actor.test.ts`). S2b is committed,
so the file is now free to whoever the step agent grants it to.

## Built

- `mcp/src/tools/registry.ts`
  - `registerTools(server, bridge, cursor?, options?)`; `RegisterToolsOptions {actorName?, failureReports?}`
    (defaults: `actorName()`, real timers / `process.env` / `os.homedir` / `Date.now`). Existing call
    sites unchanged in shape.
  - **`browser_use_active_tab`** (23rd tool, `{}`): `tabs.claim {active:true}` → `cursor.set` →
    `Now using T7 (the human's active tab) as this session's tab`. Description: call only on "this tab" /
    "the tab I opened" / "the tab I'm on"; never on own initiative. Errors propagate; nothing released.
  - **`browser_status`** (extension-connected branch only): existing lines byte-identical including
    `Active tab:`; then `Cursor: none yet — the first tab tool claims the human's active tab` /
    `Cursor: T3 "Title" — url (held by me|held by <owner>|not held)` / `Cursor: T3 (not open any more)`;
    then, only when a cursor is set, a human tab exists and differs:
    `Human's active tab: T7 "Gmail" — not mine; call browser_use_active_tab to work there`, or
    `… — held by <owner>, not mine` when another actor holds it (no suggestion: the claim would be
    refused). Status never claims. The not-connected branches are unchanged.
  - **`browser_new_tab`**: `active` is true only if `cursor.tab !== null` and a `listTabs` row with
    `current: true` has `tab === cursor.tab`; no cursor (no listTabs call), lost cursor, failed listTabs
    → `active: false`. Moves the cursor. Text `Opened tab T5`, plus ` (in the background —
    browser_focus_tab shows it)` when not active. Never sends `focusTab`.
  - **Locators**: nested `locator: {role?, name?, exact?, text?, css?, nth: int ≥ 0}` (`name` is a
    string in the MCP schema; the wire's `{regex}` form is not offered) on click/type/hover/select_option
    (exactly one of ref/locator) and scroll (both optional, both = error, neither = page scroll).
    Checked before any call (not even a claim): `<tool> takes ref or locator, not both`,
    `<tool> needs ref (from browser_snapshot) or locator`, and shape via `isLocator` from
    `@bridge/shared` with the SDK's texts (`<tool> locator: a locator with "name" needs "role" — …`,
    `<tool> locator: not a locator — use one of …`). Params carry `locator` and no `ref` key, or `ref`
    and no `locator` key. Texts: ref unchanged; locator described (`Clicked button "Sign in"`,
    `Hovered text "Menu" #1`, `Selected L in css #size`, `Scrolled to heading`). `browser_press_key`
    unchanged.
  - **`browser_wait_for`**: `locator` + `state: "visible"|"hidden"`. Locator call is exactly
    `waitFor {locator, state, tab}` (state defaults to `visible`); locator with text/seconds/networkIdle
    → `browser_wait_for: locator waits alone — drop text, seconds and networkIdle`; `state` without
    locator → `browser_wait_for: state is only used with locator`. Call `timeoutMs`: locator, text,
    networkIdle and the empty call 15 000; `seconds` alone `s*1000 + 5000`. No `timeoutMs` field.
  - **`browser_evaluate {asRef}`**: `asRef: true` forwarded only when true; a string `ref` adds
    `[ref=e12] — pass it as ref to browser_click etc.` (after the description, before the existing node
    hint); asRef without a ref adds `(no ref: the result is not an element)`.
  - **Failure reports**: `onTab` runs `fn` through `attempt(t, fn)`; a thrown `BridgeError` with
    `isAttachCode(code)` on a handle `/^T\d+$/` → `attachContext(err, t, {...failureReports, call})`;
    if it set `report`, the tool returns `{isError: true, content: [text report(), image PNG]}` (image
    only when `screenshotPath` is set and readable; a failed read adds one line). Everything else is
    rethrown unchanged. The explicit-handle network path now also goes through `attempt` ("all" is
    skipped by the handle test). The notice still prefixes via `withNotice`. Not wired into
    select_tab/close_tab/new_tab/list_tabs/status/download/use_active_tab/the network id lookup.
    `browser_focus_tab` is enriched (it uses `onTab`; F25, not special-cased).
- `mcp/src/index.ts`: passes `{ actorName: connectOptions().name }`.
- `mcp/src/cursor.ts`: header and `set` doc name the third mover.
- `sdk/src/report.ts` (new): re-exports `attachContext`, `isAttachCode`, `ATTACH_CODES` and the types
  `AttachOptions`, `FailureReportConfig`, `RawCall` from `./error.js`. `sdk/package.json`: export
  `"./report": "./src/report.ts"`. `sdk/src/index.ts` untouched (8 values).
- Tests: `mcp/test/tools.test.ts` (extended), `mcp/test/s5-cross.test.ts` (new).
- Docs: `docs/setup.md`, `docs/e2e-test-plan.md`.

## Results

Scoped (`npx vitest run mcp/ sdk/`): **before 469 passed in 25 files** (at d72aeda + S2b's uncommitted
tree) → **after 508 tests in 26 files: 507 passed, 1 failed** (the multi-actor test above).

```
 Test Files  1 failed | 25 passed (26)
      Tests  1 failed | 507 passed (508)
```

Full `npm test` (allowed after S2b's commit; no before-count taken by me):

```
 Test Files  1 failed | 78 passed (79)
      Tests  1 failed | 1531 passed (1532)
```

`npm run typecheck`: all five `tsc -p` ran with no output (exit 0). `npm run build`: `built daemon →
dist/index.js`, `built mcp → dist/index.js`, `built extension → dist/` (dist/ not staged; gitignored).
`grep -c "server.tool(" mcp/src/tools/registry.ts` → **23**.

## How each new test was shown to fail without its change

1. Whole change reverted (`registry.ts` replaced by the d72aeda copy, tests kept), run, restored:
   **38 failed** — every S5 describe test except those in (2), the 3 cross-package tests, and the 6
   designed-change edits of existing tests (23-tool count ×2, new_tab ×2, the status `.at(-1)`, the
   no-daemon ARGS list).
2. Tests that pass against the old code (regression guards) were checked by mutating the new code,
   one mutation at a time, restored after each (`cmp` confirmed):
   - asRef always forwarded → fails "without asRef (or asRef:false) the params carry no asRef key".
   - attach gate on any tab (handle test removed) → fails "a plain Error, and an attach code on the
     'all' network scope, are rethrown unchanged".
   - scroll target required → fails "browser_scroll with neither ref nor locator still scrolls the page"
     (+2 existing tests).
   - ref calls carrying a `locator` key → fails "with a ref the params have no locator key".
   - `locator` added to press_key → fails "browser_press_key keeps its schema".
   - MCP code gate removed (`isAttachCode` check) → the TAB_HELD test still passed, because
     `attachContext` refuses non-attach codes itself. Added "the MCP's own code gate: a non-attach error
     that already carries report() is still thrown, not rendered", which fails under that mutation.
   - status moving the cursor to the human's tab → fails the core cursor test, three status tests and
     cross test (a).
   - "an explicit tab with a locator…" passed against the old code at first; strengthened to assert
     the T9 params carry the locator (fails in run 1's revert).

## E2E rows

- Dated notes (before any run of the S5 build): STAT-1, MUX-1 (`Cursor:` line), MUX-8 (branch unchanged,
  stated), TAB-3 (activation rule), LEASE-1 (B's tab in the background, for S5-build runs only; Run 8
  stands), NET-12 (tab may be in the background).
- New §4.18, not yet run: CUR-1, CUR-2, CUR-3, LOC-1, LOC-2, ASREF-1, REP-1; results-template line added.
- S2b's SCREEN-4 hunk was committed by S2b (efb8557) before my edits; untouched.

## Deviations from the phase doc / design

- `browser_status`'s human line when another actor holds that tab reads `— held by <owner>, not mine`
  (no browser_use_active_tab suggestion). When the human's tab is held by *me* but is not the cursor,
  it reads `— not mine; call …` ("not mine" = not this session's tab).
- The MCP locator's `name` is a string only (no `{regex, flags}`), per the brief's schema.
- An empty `browser_wait_for {}` gets the 15 000 bound (unspecified).
- Existing tests edited as designed changes (no error text edited): tool count 22→23 (two tests),
  the two `browser_new_tab` tests (replaced, now the no-cursor branch), the status test's `.at(-1)`
  (now `toContain` the `Active tab:` line plus the last line is `Cursor: none yet …`), the no-daemon
  ARGS list (`browser_use_active_tab: {}`).

## Proposed decisions

### 2026-10-23 · With no cursor yet, browser_new_tab opens in the background
**Decided:** `browser_new_tab` sends `active: true` only when the cursor is set and `listTabs` shows its
tab as `current`; no cursor (a session's first tab), a lost cursor and a failed `listTabs` all open in
the background, with ` (in the background — browser_focus_tab shows it)` in the result.
**Why:** phase doc 0.6's rule applied literally (Stage 0 F26); on doubt the human's view does not change.
**Instead of:** treating "no cursor" as "the human is watching" and opening in front, as Step 7 did.
**Revisit if:** E2E (CUR-3 (c), TAB-3) shows models then fail to find their tab, or the user wants a
session's first tab in front.
**By:** Claude (proposed)

### 2026-10-23 · browser_status keeps `Active tab:` and adds `Cursor:` and `Human's active tab:`
**Decided:** the four Step 7 lines stay byte-identical; `Cursor: …` follows (always, when the
extension is connected) and `Human's active tab: …` only when it differs from the cursor; the
not-connected branches are unchanged and make no extra call.
**Why:** STAT-1/MUX-1/MUX-8 quote `Active tab:`; additive lines keep recorded runs readable.
**Instead of:** replacing `Active tab:` with the 0.6 pair.
**Revisit if:** the duplication (`Active tab:` and `Human's active tab:` naming the same tab) confuses
models in E2E.
**By:** Claude (proposed)

### 2026-10-23 · browser_press_key stays untargeted
**Decided:** no `ref`/`locator` on `browser_press_key`; it presses on the focused element.
**Why:** the SDK's `pressKey` is untargeted (#92 item 2); the MCP mirrors it.
**Instead of:** a locator that focuses an element first.
**Revisit if:** E2E shows models needing a focus-then-press pair often.
**By:** Claude (proposed)

### 2026-10-23 · browser_wait_for takes `state` but no `timeoutMs`
**Decided:** `locator` + `state` are added; the locator wait uses the extension's default 10 s bound; no
`timeoutMs` field on the tool.
**Why:** keeps the schema small and matches the other wait kinds' fixed 10 s.
**Instead of:** exposing the wire's `timeoutMs` on the locator arm.
**Revisit if:** real pages need longer locator waits than 10 s.
**By:** Claude (proposed)

### 2026-10-23 · The MCP attaches failure reports in its tab wrapper through `@bridge/sdk/report`
**Decided:** `onTab` (and explicit-handle network calls) pass an attach-set `BridgeError` on a handle to
`attachContext` with the MCP's raw call, then return `report()` text plus the PNG as an image block;
any other error is rethrown unchanged. Timers/env/homedir/clock are injectable through
`registerTools` options.
**Why:** #93 item 2; the model sees what the script saw; today's error texts stay for every other code.
**Instead of:** wrapping `BridgeLink.call` (would enrich the cursor claim, status and the report's own
reads).
**Revisit if:** the ~1.5 s flash at failures or the covered-window ~30 s exposure bothers the user.
**By:** Claude (proposed)

### 2026-10-23 · Wait calls carry their own bound
**Decided:** `browser_wait_for`'s call `timeoutMs` is 15 000 for locator, text, networkIdle (and an
empty call), and `seconds*1000 + 5000` for a seconds wait.
**Why:** #90 item 5 / F22 — a 60 s `seconds` wait hit the 30 s default.
**Instead of:** the 30 s default for all.
**Revisit if:** the extension's 10 s bound changes.
**By:** Claude (proposed)

## Unfinished

- `mcp/test/multi-actor.test.ts` needs the four-line change above (out of lane), so `npm test` is not
  green until it is applied. S5.1 is therefore not met as the tree stands.
- No live run (none allowed). §4.18 rows are not yet run.

## Files changed (git status)

- `mcp/src/tools/registry.ts`
- `mcp/src/index.ts`
- `mcp/src/cursor.ts`
- `mcp/test/tools.test.ts`
- `mcp/test/s5-cross.test.ts` (new)
- `sdk/src/report.ts` (new)
- `sdk/package.json`
- `docs/setup.md`
- `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S5-builder.md` (this report, new)
- separately: `docs/e2e-test-plan.md` — only my hunks now; S2b's SCREEN-4 hunk was committed by S2b
  (efb8557) before I edited the file.
- not mine: `docs/plans/…-steps/S5.ledger.md` (the step agent's, untracked).

## Round 2 (multi-actor grant)

2026-10-23 · the step agent granted `mcp/test/multi-actor.test.ts` for exactly the F26 change above plus its header comment ("22 tools" → "23 tools"). Applied; nothing else in that file changed. Not committed. This closes the blocker and S5.1 (the full suite is green).

Diff of the file:

```diff
diff --git a/mcp/test/multi-actor.test.ts b/mcp/test/multi-actor.test.ts
index 72545ff..7de153f 100644
--- a/mcp/test/multi-actor.test.ts
+++ b/mcp/test/multi-actor.test.ts
@@ -1,5 +1,5 @@
 // Step 7 T4, cross-package: the real daemon host (handles, leases, intercept) in process on
-// 127.0.0.1 port 0, the real SDK `connect()`/BridgeClient, BridgeLink, TabCursor and the 22 tools,
+// 127.0.0.1 port 0, the real SDK `connect()`/BridgeClient, BridgeLink, TabCursor and the 23 tools,
 // against a fake proto:2 extension over real `ws`. Two MCP actors with different names share one
 // daemon; then the daemon is restarted on the same port, on both the non-4002 path (a fresh client
 // from BridgeLink) and the 4002 path (the same client's reconnect), and the cursor-lost notice appears.
@@ -218,11 +218,11 @@ describe("Step 7 T4 — two MCP actors over the real daemon and SDK", () => {
     expect(held.message).toMatch(/^tab T\d+ is held by "claude-code #1001" since \d\d:\d\d:\d\d — use browser_new_tab, or browser_list_tabs to pick a free tab$/);
     expect(ext.methods()).not.toContain("click");
 
-    // B opens its own tab (active:true, 0.8) and works there.
+    // B opens its own tab and works there; with no cursor yet it opens in the background (0.6, F26).
     const opened = await b.run("browser_new_tab", { url: "http://localhost:8080/other.html" });
-    expect(opened).toMatch(/^Opened tab T\d+$/);
-    const bTab = opened.slice("Opened tab ".length);
-    expect(ext.received.find((r) => r.method === "newTab")!.params).toEqual({ url: "http://localhost:8080/other.html", active: true });
+    expect(opened).toMatch(/^Opened tab T\d+ \(in the background — browser_focus_tab shows it\)$/);
+    const bTab = opened.match(/^Opened tab (T\d+)/)![1];
+    expect(ext.received.find((r) => r.method === "newTab")!.params).toEqual({ url: "http://localhost:8080/other.html", active: false });
     expect(await b.run("browser_click", { ref: "e1" })).toBe("Clicked e1");
     expect(ext.received.find((r) => r.method === "click")!.params).toEqual({ ref: "e1", trusted: false, tabId: 200 });
 
```

`npm run typecheck`:

```
> chrome-remote-extention@0.1.0 typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json

typecheck exit 0
```

Full `npm test`:

```
 Test Files  79 passed (79)
      Tests  1532 passed (1532)
```

`npm run build` (tail; daemon built first, as in round 1):

```
> node build.mjs

built mcp → dist/index.js

> @bridge/extension@0.1.0 build
> node build.mjs

built extension → dist/
```
