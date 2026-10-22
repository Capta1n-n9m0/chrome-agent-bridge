# T1 builder report — Extension: tabId, codes, events

2026-10-22 · builder, Claude Opus 5.5 · start HEAD `9322f24` · nothing committed, no `npm run build`,
`extension/dist/` untouched, nothing outside `extension/` and `test-fixtures/e2e-playground.html` edited.

## Built
- New: `extension/src/errors.ts` (re-exports shared `BridgeError`/`ErrorCodes`; `toWireError`, `splitCoded`,
  `codeOf`, `NO_NORMAL_WINDOW`), `content/guard.ts` (`codedError`, `toMarker`, `guard`), `tab-events.ts`
  (`TabInfoCache`, `tabCreatedParams`/`tabRemovedParams`/`tabReplacedParams`, `eventFrame`), `network-scope.ts`
  (`resolveNetworkScope(p, fallback)`: `tabId` → `scope:"all"` → legacy `tab`, per #52).
- Changed: `router.ts` (codes; `UNKNOWN_METHOD`), `inject.ts` (`classifyInjectError`; `REF_STALE`; marker split),
  `debugger-errors.ts` (returns `{code, message, data?}`, texts unchanged), `debugger.ts` (`withDebugger`/`raceTimeout`/
  evaluate timeout throw `BridgeError`), `evaluate/result.ts` (`pageError` → `PAGE_ERROR {name, stack?}`),
  `tabs.ts` (`humansTab`, private `activeTab`, `targetTab`, `pageTab`/`assertNotDiscarded`, `requireTabId`, `asTabUnknown`),
  all `handlers/*` (13 sites → `targetTab`/`pageTab`; codes per brief §A; `closeTab`/`selectTab` `tabId ?? id`;
  `listTabs` `current`; viewport-screenshot refusal for an explicit background tab), `content/actions.ts` (codes;
  `centerForInputRef` extracted), `content/index.ts` (every public method guarded), `sw.ts` (4 tab listeners at
  column 1, non-awaited refill, reworded detach line), `client.ts` (`helloFrame`: `role:"extension", proto:2`).
- Fixture: `<a id="open-popup" href="e2e-playground.html?popup=1" target="_blank">Open popup</a>` after the jump link.
  LF kept (`grep -c $'\r'` → 0). **Size 12 914 → 13 106 bytes** (`wc -c`) — 13 106/1024 = 12.8 KB, so NET-1's `12.6 KB` changes.
- Tests new: `content-guard.test.ts`, `tab-events.test.ts` (incl. hello), `target-tab.test.ts` (targetTab, humansTab,
  closeTab/selectTab, listTabs, screenshot refusal, navigate codes, resolveNetworkScope's 3 forms + fallback);
  blocks added to `router`, `inject`, `debugger-errors`, `evaluate-result` tests.

## Results
- `npx vitest run extension/` before: **211 passed, 13 files**; after: **282 passed, 16 files** (+71).
- `npm run typecheck`: red only in `daemon/test/tabs.test.ts(214,70)` / `(214,76)` (T2's in-flight work, not touched).
  `npx tsc -p extension --noEmit` exit 0; shared/sdk/mcp each exit 0.
- Scratch esbuild (same options as `build.mjs`, outdir in my scratchpad): exit 0; `grep -nE "^\s*(import|export)\b"`
  on `content.js` prints nothing; `sw.js` 0 such lines, 0 `^await `.

## Exit-check greps (after)
- T1.2a `grep -rn "activeTab()" extension/src/handlers` → nothing. T1.2b `grep -n "activeTab" extension/src/tabs.ts` →
  `22:async function activeTab()…` and `69:  return activeTab();` (last line of `targetTab`, after the `console.warn`).
- T1.4a `grep -n "await" extension/src/sw.ts` → lines 43, 121 (comments), 127, 134, 135, 146, 151, 152 (inside async functions).
  T1.4b `grep -nE "^(await|const .*= await|void await)" extension/src/sw.ts` → nothing. `chrome.tabs.on*.addListener(` at
  column 1: 86 (network log's onRemoved, unchanged), 104 onCreated, 110 onUpdated, 113 onRemoved, 116 onReplaced.
- T1.5a and T1.5b (sharpened) greps → nothing. T1.7 → `67: <a id="open-popup" href="e2e-playground.html?popup=1" target="_blank">`.
- `grep -rn "focused" extension/src/tabs.ts` → nothing (see Proposed decision 1).

## Tests that fail without the change
- (a) tracked `extension/src` reverted to HEAD, new modules kept: **63 failed | 219 passed (282), 7 files failed** —
  router (5: the 3 edited + 2 new), inject (8), debugger-errors (21: all `.message`-path tests + 7 code tests),
  evaluate-result (3 PAGE_ERROR), content-guard (6 of 9), target-tab (24 of 24 — file-level: old `tabs.ts` lacks the
  exports), tab-events (1: hello). Then restored; `diff -r` backup vs tree identical.
- (b) also the 4 new modules removed: 7 files fail to load, 167 tests pass. Restored; 282 pass.
- Weakness: target-tab's and resolveNetworkScope's failures without the change are import-level, not assertion-level.

## Edited existing test assertions (all access-path / `code` added; no message text changed)
- `router.test.ts:22` `{message:"unknown method: nope"}` → `{code:"UNKNOWN_METHOD", message:…}`; `:37` and `:47` add `code:"INTERNAL"`.
- `debugger-errors.test.ts` (original lines) 6, 12, 13, 18, 19, 23, 29, 30, 36, 42, 48, 49, 62: `describeDebuggerError(…)` →
  `describeDebuggerError(…).message`; every regex unchanged.
- `inject.test.ts`, `evaluate-result.test.ts`, `actions.test.ts`: no existing assertion edited.

## Deviations / behaviour changes (all from the brief or decisions; listed so the verifier can check)
- No-`tabId` path: the resolver is now #43's `getLastFocused({windowTypes:["normal"]})`; its failure text is the new
  `NO_NORMAL_WINDOW` (was "No active tab in the last-focused window").
- Content failures now arrive with their real text and code (#38): a stale ref yields `REF_STALE` "ref eN not found —
  call browser_snapshot to re-snapshot" (what ACT-8 expects) instead of the generic "returned no result" text.
- `closeTab`/`selectTab` with a non-integer `id` (e.g. `"5"`) → `BAD_PARAMS` (Step 6 MCP sends numbers, `z.number()`).
- Escalation `console.warn` in `handlers/actions.ts` prints `codeOf(err)` instead of `err`.
- Brief's sample warning text (`…using the focused normal window's active one…`) would fail T3.3 ("focused") and
  T1.5b (word `tab` in the later wording); used `` `[bridge] ${method}: no tabId given — falling back to the human's active window (Step 6 fallback)` ``.
- Fixture: refs after "Jump to bottom" shift by one (historic run records name e10/e11…; rows use placeholders).
  Unconfirmed for T5: Chrome treats `target="_blank"` as noopener and may block a popup from a *synthetic* click;
  whether `openerTabId` is set — LEASE-3 should use `trusted:true` and record it.

## Proposed decisions
1. 2026-10-22 · The no-normal-window message lives in `errors.ts`. **Decided:** `NO_NORMAL_WINDOW` (the exact F8 text,
   which contains "focused") is defined in `errors.ts`, and `tabs.ts`' comments avoid the word. **Why:** T3.3 greps
   `tabs.ts` for `focused`; its intent (no `{focused}` key, no window focus) holds. **Instead of:** the string in
   `tabs.ts` (T3.3 fails on a message, not a focus call). **Revisit if:** the verifier reads this as evading T3.3 —
   then T3.3 should grep `focused:` / `focused: true`.
2. 2026-10-22 · `PAGE_ERROR.data.stack` is the formatted description. **Decided:** `stack` = `formatException`'s text
   (≤ 8 lines, ≤ 2000 chars) when the exception has a multi-line description; `name` = `className` ?? `"Error"`.
   **Why:** CDP's description is V8's `err.stack`; the cap keeps `data` bounded. **Instead of:** the raw uncapped
   description. **Revisit if:** the SDK's failure enrichment wants the full stack.
3. 2026-10-22 · The network fallback calls `targetTab({}, method)`. **Why:** the legacy string `tab` ("active") is a
   scope there, so F17's refusal must not fire. **Revisit if:** Step 8 removes the legacy `tab`.
4. 2026-10-22 · `describeDebuggerError` recognises our `BridgeError` by `name === "BridgeError"` + string `code`.
   **Why:** keeps the pure module import-free. **Instead of:** importing the class.
5. 2026-10-22 · `navigate` adds `loaded.catch(() => {})`. **Why:** a rejected `tabs.update` left the 30 s load timer's
   rejection unhandled; the thrown error is unchanged (`NAV_FAILED`). Router also returns null (not a throw) for a
   JSON non-object such as `null`.

## Not done / open
- G7-1 (build + reload + run against the Step 6 daemon) not done — deferred to T5 (T1.6), as the ledger says.
- `handlers/network.ts`'s wiring of `fallbackTab` and the `sw.ts` listeners are chrome glue, not unit-tested
  (CLAUDE.md testing philosophy); covered by the scratch bundle build and the greps above.
- Scope addition from the step agent (resolveScope's three forms + fallback, #52) is done in `network-scope.ts` and tested.

## Fix round 1 (verifier finding 2, MINOR) — 2026-10-22
- Added `extension/test/handler-codes.test.ts` (5 tests; test file only, no src change): `raceTimeout` rejects
  `BridgeError` `TIMEOUT` with `timeoutMessage(1000)` (fake timers); `downloadStart` non-http URL → `BAD_PARAMS`
  (no fetch); HTTP 404 → `DOWNLOAD_HTTP` "HTTP 404 Not Found" `{status:404, contentType:"text/html"}` (stubbed
  `fetch`); `evaluate` with `""`/`"   "`/undefined/42 → `BAD_PARAMS`; `waitFor({})` → `BAD_PARAMS`. All texts unchanged.
- Each fails with its src line mutated (one at a time, file restored byte-identical after each):
  - `debugger.ts` `reject(new BridgeError(ErrorCodes.TIMEOUT, message))` → `reject(new Error(message))`: 1 failed |
    4 passed — "expected Error: Timed out after 1s … to be an instance of BridgeError".
  - `download.ts` BAD_PARAMS throw → `new Error(…)`: 1 failed — "expected undefined to be 'BAD_PARAMS'".
  - `download.ts` `ErrorCodes.DOWNLOAD_HTTP` → `ErrorCodes.INTERNAL`: 1 failed — "expected 'INTERNAL' to be 'DOWNLOAD_HTTP'".
  - `download.ts` data `status: res.status` → `status: 0`: 1 failed — "expected { … } to deeply equal { status: 404, … }".
  - `evaluate.ts` BAD_PARAMS throw → `new Error(…)`: 1 failed — "expected undefined to be 'BAD_PARAMS'".
  - `wait.ts` "requires one of" BAD_PARAMS → `new Error(…)`: 1 failed — "expected undefined to be 'BAD_PARAMS'".
- `npx vitest run extension/`: **287 passed, 17 files** (was 282 / 16). `npx tsc -p extension --noEmit`: exit 0.
