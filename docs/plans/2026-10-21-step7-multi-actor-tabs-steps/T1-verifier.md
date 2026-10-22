# T1 verifier — Extension: tabId, codes, events

2026-10-22 · independent verifier, Claude Opus 5.5 · base `9322f24` + the T1 lane patch
(`scratchpad/T1-lane.patch`) in a clean worktree. Nothing in the main tree was edited except this file;
no build or full suite ran in the main tree; no Chrome, no extension reload.

## How it was run

- `git worktree add <scratch>/t1-verify 9322f24` and `<scratch>/t1-base 9322f24`; `git apply --binary
  T1-lane.patch` in `t1-verify`. `git status --short` there: 24 `M` + 7 `??`, all under `extension/`
  plus `test-fixtures/e2e-playground.html`; `git diff --quiet 9322f24 -- daemon shared sdk mcp` → clean.
- Patch = the builder's current tree: `diff -rq --strip-trailing-cr --exclude=dist --exclude=node_modules
  <main>/extension <wt>/extension` → rc 0 (identical modulo CRLF from `core.autocrlf=true`); the
  fixture `diff` → identical. Main tree `extension/dist/*` dated 17:14:48 +04 (before the 13:19:59Z
  dispatch) and has no `__bridgeError` → the builder did not build there.
- `npm ci` in both, then `npm run typecheck`, `npm test`; `npm run build` in `t1-verify` only.
- Both worktrees removed at the end (`git worktree remove --force` + `rm -rf`, `git worktree prune`;
  `git worktree list` now shows only the main tree and T2's own `t2-verify`, which I left alone).

| Run | Base `9322f24` | With T1 |
|---|---|---|
| `npm run typecheck` | exit 0 (5 packages) | exit 0 (5 packages; daemon is the base's, so no T2 noise) |
| `npm test` | `Test Files 43 passed (43)` · `Tests 600 passed (600)` | `Test Files 46 passed (46)` · `Tests 671 passed (671)` (+71, = builder's extension 211 → 282) |
| `npm run build` | — | `built extension → dist/` · `build exit 0` |

## Exit checks

| Check | Command / evidence | Result |
|---|---|---|
| T1.1 | 600 → 671 tests, typecheck exit 0 (table above) | PASS |
| T1.2 | `grep -rn "activeTab()" extension/src/handlers` → nothing (rc 1). `grep -n "activeTab" extension/src/tabs.ts` → `22:async function activeTab()` (module-private, no `export`) and `69:  return activeTab();`, the last line of `targetTab` after the once-per-method `console.warn` at :67 | PASS |
| T1.3 | router (thrown `BridgeError` → `{code,message,data}`, plain Error / non-Error → `INTERNAL`); inject (`REF_STALE` on null, undefined, missing frame; marker split); `splitCoded`; debugger-errors one test per code; target-tab "a non-numeric or non-integer tabId → BAD_PARAMS (T1.3)" — all present and each killed by a mutation below | PASS |
| T1.4 | `grep -n "await" extension/src/sw.ts` → 43, 121 (comments), 127, 134, 135, 146, 151, 152 (all inside `async function`s). Sharpened: `grep -nE "^(await\|const .*= await\|void await)" extension/src/sw.ts` → nothing. `grep -nE "^chrome\.tabs\.on[A-Za-z]+\.addListener\(" sw.ts` → 86 (network log's `onRemoved`, unchanged), 104 `onCreated`, 110 `onUpdated`, 113 `onRemoved`, 116 `onReplaced`; indented variant → nothing. Bundle: no `^await`/`^const … = await` in `dist/sw.js` | PASS |
| T1.5 | `grep -rnE "console\.(log\|warn\|error)\(.*(url\|lastUrl\|href)" extension/src` → nothing; sharpened `grep -rnE "console\.\w+\([^)]*\b(p\|params\|tab\|info\|changeInfo)\b" extension/src` → nothing. Fallback warning: `` `[bridge] ${method}: no tabId given — falling back to the human's active window (Step 6 fallback)` `` — method only; mutation M21 (adding `p`) is caught by a test | PASS |
| T1.6 | Ledger: "G7-1 deferred to T5 (user away; T1.6 allows it)"; builder report "Not done / open": G7-1 deferred to T5 | PASS (deferred, not a FAIL) |
| T1.7 | `grep -n '_blank' test-fixtures/e2e-playground.html` → `67: <a id="open-popup" href="e2e-playground.html?popup=1" target="_blank">Open popup</a>` — relative, the fixture itself | PASS |

Extra invariants checked: content bundle starts `"use strict"; (() => {` and `grep -nE "^\s*(import|export)\b" dist/content.js`
→ nothing (also 0 in `dist/sw.js`); `@bridge/shared` is not in the content bundle; `ws` stays `external`
in `daemon/build.mjs`/`mcp/build.mjs` (untouched). Codes used in `extension/src`: BAD_PARAMS,
DEBUGGER_ATTACH/CANCELLED/DEVTOOLS, DOWNLOAD_HTTP, INTERNAL, NAV_FAILED, OFFSCREEN, PAGE_ERROR, REF_STALE,
RESTRICTED_URL, TAB_UNKNOWN, TIMEOUT, UNKNOWN_METHOD — all among the 22 of `shared/src/codes.ts`; `shared/` untouched.

## What was verified (no finding)

- **`unwrapResult`**: null, undefined and a missing frame → `BridgeError("REF_STALE", <the unchanged
  text with the restricted-URL clause>)`. A page function that throws outside the guard still arrives
  as `result: null` → `REF_STALE`; a guarded throw returns `{__bridgeError:"CODE:message"}` → that code
  (content-guard + inject tests; M1–M4, M40 killed).
- **Message texts**: a script (`scratchpad/v/lits.cjs`) listed every string literal longer than 12
  characters in each touched base src file and searched for it in the new file. Missing: the
  `centerForInput` and `Invalid tab:` texts — moved byte-identical to `content/actions.ts:7,106-107` and
  `network-scope.ts:39`; inject's `(${(err as Error).message})` → `(${raw})` with `raw = (err as
  Error).message` (same text); `"No active tab in the last-focused window"` → `NO_NORMAL_WINDOW` (#43,
  intended); sw's detach `console.warn` reworded (brief §C, a log line). Nothing else changed.
- **Edited existing tests**: `git diff -U0 -- extension/test/` shows the only removed lines are
  `describeDebuggerError(…)` → `….message` (13, regexes unchanged) and router's three expected objects
  gaining `code`. No message text edited, no test removed.
- **E2E texts**: EVAL-5 — page throw → `pageError` (`PAGE_ERROR`, `formatException` text) →
  `withDebugger` → `describeDebuggerError` keeps the code and data, message `[chrome.debugger] Error:
  boom\n    at …` (test at `debugger-errors.test.ts:93-96`) → `evaluateInPage`'s catch rethrows (not
  terminated). DL-2 — the rejected `fetch` arrives as `exceptionDetails` → same path →
  `[chrome.debugger] TypeError: Failed to fetch`. `raceTimeout` → `BridgeError(TIMEOUT, "Timed out after
  Ns — …")` → `[chrome.debugger] Timed out after …`, code TIMEOUT (old text). A CDP "Execution was
  terminated" → PAGE_ERROR inside → described as the TIMEOUT text → the outer catch's
  `isExecutionTerminated` matches → `BridgeError(TIMEOUT, timeoutMessage)`, as before.
- **Hello**: probe in the worktree — `helloFrame()` = `{"type":"hello","token":…,"role":"extension","proto":2}`;
  the Step 6 daemon's `parseHello` (`daemon/src/handshake.ts` at 9322f24) → `{"ok":true,"role":"extension"}`;
  `connection.ts:45` drops a non-response frame, so the Step 6 daemon ignores events. `Router.handle` on
  an `{event,params}` frame → `null`.
- **Events**: frames pass T0's guards, carry no `id`, contain no `null`; `url: pendingUrl ?? url ?? ""`;
  `openerTabId` only when defined; `tabRemoved` takes lastUrl/lastTitle from the cache and omits empty
  values; `fill` never overwrites a live entry; `onReplaced(added, removed)` order correct; the refill
  `chrome.tabs.query({}).then(...).catch(...)` is not awaited.
- **`targetTab`** (0.1/F4/F17/F18): non-integer `tabId` (incl. `null`, `"5"`, `1.5`) → BAD_PARAMS; "No
  tab with id" → TAB_UNKNOWN; string `tab` without `tabId` → BAD_PARAMS with F17's text; closeTab /
  selectTab with neither → BAD_PARAMS, nothing closed; `discarded` refused by `pageTab` only (snapshot,
  click, type, scroll, hover, selectOption, pressKey, waitFor text, evaluate, full-page screenshot), not
  by navigate/back/forward/network/networkIdle/viewport screenshot; `humansTab` calls
  `getLastFocused({ windowTypes: ["normal"] })` then `tabs.query({active:true, windowId})` — no `focused` key.
- **Network scope** (#52/#54): integer `tabId` → that tab, no `chrome.tabs.get`; `scope:"all"` → all;
  legacy `tab` undefined/null/"active" → fallback, "all", integer (or numeric string, as before), else
  the old text as BAD_PARAMS; tests for all three forms (M14–M16 killed).
- **Viewport screenshot refusal**: only when `params.tabId !== undefined && !tab.active`; the fallback
  path is unchanged (its tab is the active tab of its window by construction).
- **`console.*`** in `extension/src` (13 lines): none prints a URL, title, params, header value or
  body; the two escalation warnings now print `codeOf(err)`.

## Findings

1. **MINOR — the fixture grows to 13 106 bytes, so NET-1's `12.6 KB` becomes `12.8 KB`.**
   `test-fixtures/e2e-playground.html:66-67`. Evidence: `wc -c` → `13106` (base `12914`); `grep -c $'\r'`
   → `0`; `git ls-files --eol` → `i/lf w/lf attr/text eol=lf`; `network-log.ts:259` prints
   `(bytes / 1024).toFixed(1)` → 13106/1024 = 12.799 → `12.8 KB`. Also stale: `docs/e2e-test-plan.md:435`
   ("the fixture is still 12 914 bytes", `12.6 KB`) and the NET-1 row; snapshot refs after "Jump to
   bottom" shift by one. Fix: the step agent / T5 owns the expected text (#35/#36 vs #6) — not decided here.
   Unconfirmed for T5: whether a synthetic click on a `target="_blank"` link opens the tab and sets
   `openerTabId` (LEASE-3 may need `trusted:true`).
2. **MINOR — several new codes have no test.** Mutations survive: M47 (`raceTimeout` rejects with a plain
   Error → INTERNAL), M53 (`DOWNLOAD_HTTP` → plain Error), M54 (evaluate's empty expression BAD_PARAMS →
   plain Error), M55 (waitFor's "requires one of" BAD_PARAMS → plain Error). `raceTimeout`
   (`debugger.ts:99-107`) is pure and testable with fake timers; `evaluate` and `waitFor` throw before any
   `chrome.*` call; `downloadStart` needs only a stubbed `fetch`. Not in T1.3's list, so no exit check
   fails. Fix: one test each (assert `code`, keep the text).
3. **NIT — `NO_NORMAL_WINDOW` placed in `errors.ts` makes T3.3's grep pass by file placement.**
   `extension/src/errors.ts:59-60`; `grep -rn "focused" extension/src/tabs.ts` → nothing, but
   `errors.ts:60` holds "…is focused…". Ruling suggestion: acceptable — T3.3's intent is "no window-focus
   call in `tabs.ts`", and this is a message string, not a focus call; the resolver call itself has no
   `focused` key. But the check now discriminates only by where a string lives. Suggest the session agent
   sharpen T3.3 with a dated note to `grep -nE "focused\s*:" extension/src/tabs.ts extension/src/errors.ts`
   (plus the existing `handlers/tabs.ts` clause), which stays discriminating whatever file a message is in.
4. **NIT — "No tab with id" → `TAB_UNKNOWN` (0.1), not F21's `TAB_GONE`.** `extension/src/tabs.ts:28-32,53-57`.
   Ruling: correct by the protocol — 0.1 is a pre-registered contract decision ("not reopened"); F21's
   `TAB_GONE` was an audit resolution never recorded in decisions.md (`grep -n TAB_GONE docs/decisions.md`
   → nothing). Suggest the session agent record that the daemon (T2), which holds the handle and the
   `tabRemoved` lastUrl, maps an extension `TAB_UNKNOWN` for a handle it resolved to `TAB_GONE` if spec
   §5's "`TAB_GONE {lastUrl}`" is to hold for the close-in-between race.
5. **NIT — `explicitTabId` treats `tabId: null` as absent.** `extension/src/handlers/tabs.ts:36-37`
   (`p.tabId ?? p.id`): `{tabId:null, id:5}` closes tab 5 and `{tabId:null}` says "closeTab requires
   tabId", while `targetTab` answers `tabId:null` with "tabId must be an integer". Harmless (#50: our
   senders never send `null`). Fix: `p.tabId !== undefined ? p.tabId : p.id`.
6. **NIT — navigate's race maps "No tab with id" to `NAV_FAILED`.** `extension/src/handlers/navigate.ts:10-16`:
   a tab closed between `targetTab`'s `get` and `tabs.update` reports NAV_FAILED, not TAB_UNKNOWN. Text
   unchanged. Fix (optional): `asTabUnknown` before wrapping.
7. **NIT — the id-less-frame router test cannot see the `id` check.** M46 (`if (!msg || !msg.method)`)
   survives: an `{event,params}` frame has no `method` either. Fix: add `{method:"x", params:{}}` without
   `id` → `null`. (M29 and M44 also survive but are equivalent mutants: the fallback tab is always
   active in its window; `JSON.stringify` drops an `undefined` `data`.)
8. **NIT — two pre-existing `console.*` lines print a raw error object.** `extension/src/sw.ts:154`
   (`connect failed:`, err) and `:166` (`reply relay failed:`, e). Unchanged by T1, outside T1.5's
   greps; their sources (storage, offscreen creation, runtime messaging) carry no page URL in practice.
   Record only; a later stage may print `codeOf(err)`.

Behaviour changes with `tabId` absent, all from a rule (listed so the step agent can cite them): the
resolver is #43's `getLastFocused({windowTypes:["normal"]})` with the new F8 text; content-script
failures now arrive with their own text and code (#38) — a stale ref through the trusted fallback reads
"ref eN not found — call browser_snapshot to re-snapshot" (what ACT-8 expects) instead of the generic
null text; closeTab/selectTab with a string `id` → BAD_PARAMS (the Step 6 MCP sends numbers);
`listTabs` adds `current: true`.

## Mutations (one at a time, `npx vitest run extension/`, restored after each; runner `scratchpad/v/mutate.cjs`, log `scratchpad/v/mutations.txt`)

Full revert of the tracked `extension/src` files to `9322f24`, new modules and tests kept:
`Test Files 7 failed | 9 passed (16)`, `Failed Tests 63` — matches the builder's (a). target-tab's 24
fail at import there, so behavioural mutations were run for each of its areas:

| # | Mutation | Result |
|---|---|---|
| M1–M3 | `unwrapResult` accepts undefined / null / a missing frame | killed ×3 |
| M4 | `unwrapResult` ignores the marker | killed |
| M5, M6 | `splitCoded` never splits / accepts any prefix | killed ×2 |
| M7–M10 | `describeDebuggerError` CANCELLED, DEVTOOLS, TIMEOUT, RESTRICTED → ATTACH | killed ×4 |
| M11 | own `BridgeError` code ignored | killed |
| M12 | hello without `proto` | killed |
| M13 | `eventFrame` with an `id` | killed |
| M14–M16 | `resolveNetworkScope` ignores `scope` / ignores `tabId` / does not validate `tabId` | killed ×3 |
| M17, M18 | `requireTabId` accepts anything / floats | killed ×2 |
| M19, M20 | `targetTab` without TAB_UNKNOWN / without the F17 refusal | killed ×2 |
| M21–M23 | fallback warn prints `p` / warns every call / never warns | killed ×3 |
| M24 | `humansTab` without `windowTypes:["normal"]` | killed |
| M25 | discarded tab not refused | killed |
| M26, M27, M56 | closeTab/selectTab fall back to 0 / selectTab, closeTab without TAB_UNKNOWN | killed ×3 |
| M28 | `listTabs` `current` = every active tab | killed |
| M29 | screenshot refusal without the `tabId` gate | **survived** (equivalent) |
| M30 | screenshot refusal removed | killed |
| M31–M33 | `pageError` stack always / name null / code INTERNAL | killed ×3 |
| M34–M38 | cache `fill` overwrites / url ignores `pendingUrl` / `openerTabId` always / empty strings known / `move` overwrites | killed ×5 |
| M39, M40 | `toMarker` default ≠ INTERNAL / `guard` rethrows | killed ×2 |
| M41, M42 | classifier without TAB_UNKNOWN / RESTRICTED_URL | killed ×2 |
| M43 | `toWireError` drops `data` | killed |
| M44 | `toWireError` sets `data: undefined` | **survived** (equivalent on the wire) |
| M45 | `UNKNOWN_METHOD` → INTERNAL | killed |
| M46 | router answers an id-less frame that has a method | **survived** (finding 7) |
| M47 | `raceTimeout` plain Error | **survived** (finding 2) |
| M48, M49 | navigate NAV_FAILED / BAD_PARAMS → plain Error | killed ×2 |
| M50–M52 | content OFFSCREEN / REF_STALE / selectOption BAD_PARAMS → INTERNAL | killed ×3 |
| M53–M55 | DOWNLOAD_HTTP, evaluate BAD_PARAMS, waitFor BAD_PARAMS → plain Error | **survived** (finding 2) |

## Verdict

**PASS-with-notes** — every exit check T1.1–T1.7 passes (T1.6 by recorded deferral to T5); no CRITICAL
or MAJOR finding; 2 MINOR (fixture size → NET-1 expected text; untested codes on four paths) and 6 NIT.
