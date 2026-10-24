# S2b — builder report (Step 9, stage S2b "Extension UI and the 0.7 log scan")

Builder, 2026-10-24, Claude Opus 5.5 (claude-opus-5-5). Nothing committed. Nothing running; port 9234 never bound
(the daemon tests in this stage bind port 0); the extension was not reloaded and Chrome was not touched.

## 1. Built (files)

Changed (tracked):
- `extension/manifest.json` — `action {default_title}` and `commands {_execute_action}` added; nothing else.
- `extension/options.html` — a "Safety" fieldset (status line, two switches, error line, shortcuts button) and a
  "Blocked sites" fieldset (textarea, Save button, summary, conflict/error lines, the invalid-line list). Port, token
  and their Save are byte-identical.
- `extension/src/options.ts` — two imports at the top; the port/token code unchanged; the safety glue appended.
- `extension/src/sw.ts` — one import and one block before the `setAccessLevel` statement (diff in §6). S2a's lines
  and its `router.on("name", …)` registrations untouched.

New:
- `extension/src/badge.ts` — `badgeOf` (pure), `BADGE_TITLES`, `BADGE_COLORS`, `toggleLogLine`, `BadgeModel` (keeps a
  failed write on the badge), `showBadge` + `BadgeController` (thin glue over an injected `chrome.action`).
- `extension/src/options-model.ts` — `analyzeBlockList` (S1's `parseBlockList`, no second grammar),
  `optionsStatus`, `blockListAfterStoredChange`, `writeFailedMessage`, `INVALID_LINE_REASON`.
- Tests: `extension/test/badge.test.ts` (30), `options-model.test.ts` (12), `manifest.test.ts` (4),
  `sw-action.test.ts` (9), `safety-writers.test.ts` (16), `log-scan.test.ts` (11), `log-sentinel.test.ts` (2);
  helpers `extension/test/log-scan.ts` (the enumerator) and `extension/test/log-allowlist.ts` (the allowlist).

`extension/build.mjs` unchanged (the options bundle is already an ESM entry).

## 2. Checks (before → after)

| Command | Before (HEAD 55f4d6e, clean tree) | After |
|---|---|---|
| `npm test` | 2561 passed, 106 files | **2645 passed, 113 files** (+84 tests, +7 files; none removed) |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm run build` | exit 0, no tracked file changed | exit 0, no tracked file changed beyond the four edits above |

Tails (after):
```
 Test Files  113 passed (113)
      Tests  2645 passed (2645)
typecheck=0
build=0      (> node build.mjs  /  built extension → dist/)
```
Per file: badge 30, options-model 12, manifest 4, sw-action 9, safety-writers 16, log-scan 11, log-sentinel 2 = 84.
Also: the new test files typecheck (a scratch tsconfig extending `extension/tsconfig.json` over `src` + the nine new
test files: exit 0, no output; the scratch config was deleted).

## 3. How each exit criterion is met

**GOAL 1 — manifest.** `manifest.test.ts`: permissions and host permissions equal today's lists, no
`optional_*`; the only added top-level keys are `["action","commands"]` and every old key is unchanged; `commands`
deep-equals #142's; `action` has only `default_title: "Chrome Agent Bridge"` (no `default_popup`). Red before the
edit (3 of 4 failed; the permissions test passed, as it should on the old file).

**GOAL 2 — badge.** `badge.test.ts`: the three #143 titles verbatim; `OFF` wins with JavaScript off; unreadable →
`OFF`; `"write-failed"` → `OFF` + "not saved"; a rejected arm → `OFF` + "turning on failed"; `BadgeModel` holds a
failure until a read says armed or a saved press; `showBadge` swallows a synchronous throw and a rejection;
`BadgeController.press` for every outcome (one log line, the right badge), refreshes serialised. Red first (module
missing), then green.

**GOAL 3 — `sw.ts`.** `sw-action.test.ts`: exactly one `chrome.action.onClicked.addListener(` and it is a statement
of the SourceFile, its text calls `badge.press(` and `safety.toggle()`; `safety.toggle` is referenced once, inside
that statement; a top-level `void badge.refresh();`; a top-level `storage.onChanged` listener that calls
`badge.refresh()` under `touchesSafety(changes)`; no `onCommand` identifier and no `chrome.commands` anywhere in
`extension/src`. S2a's `sw-static.test.ts` still green (incl. "setAccessLevel after the last top-level addListener":
the new listeners sit before it).

**GOAL 4 — options page.** Pure parts in `options-model.test.ts`: invalid lines marked by 1-based number with the
reason and counted; statuses equal `parseBlockList`'s kinds on 14 sample lines (no second grammar); the count equals
`SafetyStore.read().blockedCount` (the number `safetyState` reports); singular/plural; CRLF/CR; the status line for
the four states; unsaved textarea edits survive a change made elsewhere (conflict flagged). The glue is not
unit-tested (house rule) — S4 rows in §8.

**GOAL 5 — 0.7 scan (S2.3 first half).** `log-scan.test.ts` + `log-scan.ts`: the TypeScript compiler API enumerates
every call whose callee is `console.*` / `console[…]`, an identifier `log`, or a property `.log` on anything but
`console`, plus any `console` used as a value; text whitespace-normalised; compared as a multiset with
`log-allowlist.ts` both ways. 48 sites. In-memory mutations (in the test): a new `console.log("x", url)`, a changed
argument (unlisted + stale), a duplicate, a removal, every daemon logger form, `console` in every form.
On-disk mutations (each file restored from a byte copy; `git diff --quiet` / `cmp` confirmed):
```
== M1: console.log("x", url) appended to extension/src/handlers/navigate.ts
   (function __mutation(url: string) { console.log("x", url); })
 × … > found sites = the allowlist, both ways
AssertionError: log call sites not in extension/test/log-allowlist.ts: expected [ Array(1) ] to deeply equal []
restored navigate.ts (git diff empty)
== M2: evaluate.ts log argument expression.length -> expression (same text otherwise)
 × … > found sites = the allowlist, both ways
AssertionError: log call sites not in extension/test/log-allowlist.ts: expected [ Array(1) ] to deeply equal []
restored evaluate.ts (git diff empty)
```
(In both runs the in-memory mutation tests also failed, because they compare whole lists against the mutated tree;
expected.) The exact unlisted/stale strings for M2's shape are pinned by the in-memory test "an allowlisted text with
a changed argument is unlisted, and its entry is stale".

**GOAL 6 — sentinel test (S2.3 second half).** `log-sentinel.test.ts`, sentinels: pattern
`sentinel-pattern-q7.example`, URL `https://www.sentinel-pattern-q7.example/secret-path-Z9?k=SENTINELQ`, a second URL,
title `Sentinel Title X4K2`, token `sentinel-token-R8M3-5f1e`, an invalid line. Test 1 drives the matcher, the gate
(every method × armed/disarmed × JS on/off × 6 targets × 3 phases, >100 decisions), the redaction functions,
`keepInQuery`, the real `GatedRouter` over `CallSafety` (refusal, allow, a handler error carrying the URL, a
mid-call disarm caught by the post-check, an unknown method named with the URL), `NetworkIngestGate` + `NetworkLog`,
S2a's `SafetyStore` through `BadgeController.press` (disarmed, ignored, armed, write-failed, arm-failed — storage
stubbed, its error message carrying the items), `SafetyReporter`, the options model. Test 2 runs the daemon's real
`WsHost` + `Bridge` on port 0 with the token as a sentinel: a wrong-token hello with the URL in its name, a fake
proto:2 extension answering `listTabs` with sentinel titles/URLs and a `snapshot` error carrying them, a client's
`listTabs`/`tabs.claim`/`snapshot`/`daemon.status`, `safetyState` with an extra `patterns` key, a malformed one with a
URL, a disarm with hidden rows, `tabCreated`/`tabRemoved` with the URL and title. Every `console.*` (6 methods
spied) and every daemon log line is captured; the capture is shown live (the five press lines are asserted in order;
the daemon's `safety state: armed=true evaluate=true blocked=3` and `safety state: malformed event dropped` are
asserted); no captured line contains any sentinel substring, case-insensitive.
On-disk mutation:
```
== M3: options-model.ts analyzeBlockList logs its text (console.log("[bridge] options: analysing", text))
 × 0.7 sentinel test … > extension: matcher, gate, redaction, network gate, toggles, badge, options model
AssertionError: a sentinel (sentinel-pattern-q7) in a log line: 215 chars: expected true to be false
restored (grep -c analysing → 0; cmp with the byte copy: same)
== M3b: badge.ts press logs the toggle's error (console.warn("[bridge] toggle failed:", err))
 Tests 2 passed (2)
restored
```
M3b is reported as run: it stays green because the stubbed storage error carries the key name and value
(`{"safety.armed":true}`), not a sentinel — the test catches sentinel content, not every new log line (the scan
catches that: M3b's line is not allowlisted).

**GOAL 7 — S3.3's `storage.local.set` half.** `safety-writers.test.ts` (AST over every file in `extension/src`):
`chrome.storage` only as `.local`/`.session`/`.onChanged`; `chrome.storage.local` only as `.get/.set/.setAccessLevel`
called on the spot (`remove`/`clear`, aliases, element access and a method passed as a value refused); every
`.set(…)` one of four documented sites (sw.ts's injection into `new SafetyStore({set})`, sw.ts's `{[MARKER_KEY]: …}`,
options.ts's `{port, token}`, options.ts's injection as `writeSafety`'s first argument); `SAFETY_KEYS`,
`SAFETY_KEY_NAMES`, `toStorageItems`, `writeSafety`, `SafetyStore` referenced only in the named files; a key-name
string only in `safety-state.ts`; `new SafetyStore(` once. 13 in-memory mutations, each caught. On disk:
```
== M4: handlers/tabs.ts gains `void chrome.storage.local.set({ "safety.armed": true });`
 × sw-static > the stored key names appear in safety-state.ts only
 × sw-static > no handler calls storage.local.set; the call sites are sw.ts and options.ts
 × safety-writers > no violation in extension/src
 × safety-writers > exactly the four documented storage.local.set sites exist
restored
== M4b: handlers/tabs.ts gains `const area = chrome.storage.local; void area.set(items);`
 × safety-writers > no violation in extension/src
 Tests 1 failed | 29 passed (30)        ← S2a's sw-static tests stay green on this alias; the new test catches it
restored
```

**GOAL 8 — S2.4 at this close.** After `npm run build`: `grep -c '^import\b' extension/dist/content.js` → `0`;
`grep -c '^export\b' extension/dist/content.js` → `0`; `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` →
`0` (my first draft gave `1` — `read: async () => (await safety.read()).switches` at column 0, inside an arrow so
the AST test passed — rewritten as `safety.read().then((v) => v.switches)`); `sw-static.test.ts`'s AST test green.
New static test (above) plus on-disk mutations:
```
== M5: sw.ts — the onClicked registration moved into `function registerLater()` called from a promise
 × action.onClicked in sw.ts > exactly one registration, a top-level statement, …
AssertionError: expected false to be true
restored (cmp: same)
== M6: sw.ts gains `chrome.commands.onCommand.addListener(() => void safety.toggle());`
 × no commands.onCommand anywhere … > no onCommand and no chrome.commands reference in code
AssertionError: sw.ts: expected 1 to be +0
restored (cmp: same)
```

## 4. The allowlist and the injected loggers

Sizes: **extension/src 15, daemon/src 29, sdk/src 0, mcp/src 4** (48). **No `KNOWN-VIOLATION`** — no site was found
that prints a pattern, URL, title or the token. Sites whose argument is an Error or free text, recorded with notes
(not violations, but the verifier may want to judge them): `extension/src/sw.ts` `console.error("[bridge] connect
failed:", err)` and `console.warn("[bridge] reply relay failed:", e)` (Chrome API errors); `mcp/src/index.ts`
`… unavailable (retrying every 5 s): ${reason}` (the SDK's connect message) and `console.error("[chrome-bridge]
fatal:", err)` (a start-up Error with its stack); `daemon/src/wsHost.ts` `socket error: err.message` (to no stdio);
`daemon/src/main.ts` `client ± ${JSON.stringify(name)}` (a client-chosen name; the file logger withholds a line with
`://` or the token).

Injected-logger names found (by reading): `Logger.log` (`daemon/src/log.ts`, `createFileLogger`) called as
`logger.log(…)` in `main.ts`; `WsHostOptions.log?` (`wsHost.ts:45`), wired `log: (msg) => logger.log(msg)` and copied
into `const log = this.options.log` (`wsHost.ts:240`) and passed on as `log: options.log` (`wsHost.ts:147`);
`TabLayerDeps.log?` (`intercept.ts:53`) called as `this.deps.log?.(…)`; `createHandleMark({log})`
(`handle-mark.ts`) called as `log(…)`. `connection.ts`'s `onMissingCode` hook reaches the log only through
`wsHost.ts:241`'s `log(…)` (scanned). The SDK and the MCP have no injected logger; the SDK has no log call at all.

## 5. New `console.` lines (all)

```
extension/src/badge.ts:    console.log(toggleLogLine(r));
```
`toggleLogLine` returns one of: `safety: disarmed by the user` · `safety: armed by the user` · `safety: re-arm
ignored (within 1 s of a disarm)` · `safety: disarm not saved (storage write failed)` · `safety: arm failed (storage
write failed)`. `options.ts` and `options-model.ts` log nothing.

## 6. Diffs

`git diff extension/manifest.json`:
```
@@ -7,5 +7,7 @@
   "background": { "service_worker": "dist/sw.js", "type": "module" },
   "permissions": ["debugger", "tabs", "scripting", "activeTab", "alarms", "storage", "offscreen", "webRequest"],
   "host_permissions": ["<all_urls>"],
-  "options_page": "options.html"
+  "options_page": "options.html",
+  "action": { "default_title": "Chrome Agent Bridge" },
+  "commands": { "_execute_action": { "suggested_key": { "default": "Alt+Shift+K" } } }
 }
```
`git diff extension/src/sw.ts` (additions only):
```
+import { BadgeController } from "./badge.js";
…
+const badge = new BadgeController({ api: chrome.action, read: () => safety.read().then((v) => v.switches) });
+
+chrome.action.onClicked.addListener(() => void badge.press(() => safety.toggle()));
+
+chrome.storage.onChanged.addListener((changes, area) => {
+  if (area === "local" && touchesSafety(changes)) void badge.refresh();
+});
+
+void badge.refresh();
```
(plus a 7-line comment above the block; inserted after `void connect();`, before the `setAccessLevel` `try`).

## 7. Badge titles and colours (as built)

| State | Text | Colour | Title |
|---|---|---|---|
| disarmed (JS either way) | `OFF` | `#d93025` | `Chrome Agent Bridge — OFF: agents are refused (click to turn on)` |
| armed, JS off | `JS` | `#e37400` | `Chrome Agent Bridge — armed, JavaScript off (click to turn off)` |
| armed | `` | (`#5f6368`, unseen) | `Chrome Agent Bridge — armed (click to turn off)` |
| unreadable | `OFF` | `#d93025` | `Chrome Agent Bridge — OFF: the safety state cannot be read, so agents are refused (check the options page)` |
| write-failed | `OFF` | `#d93025` | `Chrome Agent Bridge — OFF, but not saved (storage write failed): agents are refused until the extension restarts (click to turn on)` |
| arm rejected | `OFF` | `#d93025` | `Chrome Agent Bridge — OFF: turning on failed (storage write failed), agents are still refused (turn it on from the options page)` |

## 8. Chrome-only facts for S4 rows (expected text, written before any run)

1. **Button click** (armed, JS on): badge text `OFF`, title `Chrome Agent Bridge — OFF: agents are refused (click to
   turn on)`; the worker console shows `safety: disarmed by the user`; a call → `DISARMED` scope all. Click again
   ≥ 1 s later: badge empty, title `Chrome Agent Bridge — armed (click to turn off)`, `safety: armed by the user`.
   Click again within 1 s of a disarm: badge stays `OFF`, `safety: re-arm ignored (within 1 s of a disarm)`.
2. **Shortcut** `Alt+Shift+K`: same as 1 (one listener). Whether Chrome assigned it (chrome://extensions/shortcuts
   shows "Activate the extension" = `Alt+Shift+K`) and whether Alt+Shift switches the Windows input language are
   SAFE-2's readings.
3. **JS off** (options switch): badge `JS`, colour amber, title `Chrome Agent Bridge — armed, JavaScript off (click to
   turn off)`; disarm while JS off → `OFF` (OFF wins).
4. **`write-failed` and the rejected arm cannot be produced live** (they need `storage.local.set` to fail); unit-tested
   only.
5. **Options page controls** (accessible names, from their `<label>`s): checkbox `Bridge on (agents may use this
   browser)`; checkbox `Allow JavaScript (browser_evaluate)`; textarea `Blocked sites, one per line`; button `Save
   blocked sites`; button `Change the keyboard shortcut`; unchanged: `Port`, `Token`, button `Save`. Status line
   (`role=status`): `Bridge armed.` / `Bridge armed; JavaScript (browser_evaluate) off.` / `Bridge OFF: agents are
   refused.` / `The safety state cannot be read, so agents are refused.`. Each switch saves on change (no Save
   needed); the toolbar badge follows within the `onChanged` delivery. Typing `bank.example` and `not a host!` shows
   `1 blocked site. 1 invalid line is not counted (marked below).` and a list item `Line 2: “not a host!” — not a site
   pattern: write a host (bank.example), *.host for its subdomains only, host:port, an IP address, or paste an http(s)
   address`; after Save, `safetyStatus.blockedCount` = 1. A toolbar click while the options page is open flips its
   `Bridge on …` checkbox and status line live.
6. **The shortcuts link**: the `Change the keyboard shortcut` button opens a new tab at
   `chrome://extensions/shortcuts` (via `chrome.tabs.create`; an `<a href="chrome://…">` would not navigate). Not
   measured; if Chrome refused it the click would do nothing (the rejection is swallowed) — record what happens.
7. **Badge at worker start after a reload while disarmed**: disarm, run `recipes/reload-extension.ps1`, then read the
   button: badge `OFF`, title as row 1 (the badge is re-derived from `storage.local` at the worker start; Chrome
   itself resets the badge on reload). Also after a worker idle-out (harder to force; optional).
8. **Toolbar button UIA hints**: the button's accessible name is its title (one of the §7 titles, so match by the
   prefix `Chrome Agent Bridge —`, not by the whole string, and never by "Chrome Agent Bridge" alone if the extensions
   menu also lists the name); it may sit inside the Extensions menu until pinned (G9-2).

## 9. Deviations

- The brief's sentinel list names "the daemon's safety relay (import its real module)": I ran the real `WsHost` +
  `Bridge` (which build the `TabLayer`), over `ws` on port 0 — a socket is needed for the relay path.
- The quick grep in GOAL 8 forced a rewrite of the badge's `read` (no `await` at column 0); behaviour identical.
- `options.ts`: two `import` lines added at the top of the file (the port/token code below is unchanged).
- Nothing else.

## 10. Proposed decisions (all `By: Claude`, build-level unless marked)

1. **2026-10-24 · S2b: badge colours, and titles for the unreadable, unsaved-disarm and failed-arm states.**
   Decided: §7's table (#143's three titles verbatim; `#d93025` red, `#e37400` amber). Why: #143 leaves colours and
   the failure wording to the build; S2a's handoff asks the unsaved disarm to be visible. Instead of: one OFF title
   for every OFF (hides a failed write). Revisit if: the user prefers other words or colours.
2. **2026-10-24 · S2b: a failed write stays on the badge until the state moves on.** Decided: `BadgeModel` keeps
   `write-failed` / `arm-failed` while reads say disarmed; an ignored re-arm keeps it; a read saying armed or a saved
   press clears it. Why: otherwise the next `onChanged` refresh would replace the "not saved" title with the plain OFF
   title. Instead of: showing it only until the next refresh. Revisit if: S4 shows a stale failure title.
3. **2026-10-24 · S2b: one fixed reason for every invalid block-list line.** Decided: each invalid line is marked by
   number with one reason text naming the grammar's shapes. Why: S1's parser returns only `invalid`; per-cause
   diagnostics would need a second grammar (forbidden by the brief). Instead of: re-deriving causes in the options
   model; extending `safety-match.ts` (S1's file, out of lane). Revisit if: the user wants per-cause messages (then
   S1's parser returns a cause).
4. **2026-10-24 · S2b: unsaved block-list edits survive a change made elsewhere.** Decided: an untouched textarea
   follows the stored text; edited text is kept and a conflict line says Save replaces the stored list. Why: never
   lose typing; never silently overwrite without saying so. Instead of: always reloading; never reloading.
   Revisit if: two options tabs editing at once matters.
5. **2026-10-24 · S2b: options page names and layout.** Decided: §8 row 5's labels; switches save on change; the
   block list has its own Save; a status line per state. Why: #144 (switch not debounced); UIA finds by name.
   Instead of: one Save for everything. Revisit if: S4's automation finds a name ambiguous.
6. **2026-10-24 · S2b: the log scan counts any call named `log` as an injected logger, in all four packages.**
   Decided: by name (identifier `log`, property `.log` not on `console`), plus `console` used as a value. Why:
   stricter than listing today's three logger expressions; a new logger called `log` is caught. Instead of: a fixed
   list (`options.log`, `deps.log`). Revisit if: a non-logging method named `log` appears (allowlist it with a note).
7. **2026-10-24 · S2b: S3.3's writer test refuses `storage.local.remove`/`clear` everywhere.** Decided: as built.
   Why: removing a safety key restores its default — armed — so it is a write in effect. Instead of: allowing them
   outside the writers. Contract-adjacent (how the state is changed): conservative, nothing uses them today.
   Revisit if: a feature needs `remove` (then name its site in the test).

## 11. Findings (outside my lane — reported, not fixed)

1. **S2a: a failed arm write leaves the memory copy armed while storage says disarmed** (`safety-state.ts`
   `toggleOnce`: `this.apply({...current, armed: true}, "toggle")` before `await this.deps.set(…)`, never reverted on a
   rejection). Effects: `read()` still refuses every call (storage says disarmed; memory-disarm-wins does not apply
   the other way), so the gate is safe; but `ingestView()` reports armed, so the **network ingest records traffic
   while every call is refused**, and the **next press disarms** (memory armed) instead of retrying the arm — which is
   why I worded the failed-arm title "turn it on from the options page", not "click to try again". Minimal change
   (S2a's file): on a rejected arm write, restore the memory copy to disarmed (without moving `lastDisarmAt`) before
   rethrowing; plus a test. Severity: low (needs a `storage.local.set` failure, e.g. quota), not reachable by an agent.
2. **S2a's `sw-static.test.ts` "no handler calls storage.local.set" is a text regex**: it misses an alias
   (`const area = chrome.storage.local; area.set(…)`, M4b above). The new `safety-writers.test.ts` closes that.
3. Stale comment in S2a's part of `sw.ts` (line ~31): "S2b's `action.onClicked` will call it" — now true; left as is
   (not my lines).

## 12. Unfinished

Nothing in the brief. Not done by design: no S4 rows written into `docs/e2e-test-plan.md` (S4's lane; §8 gives the
expected text), no live check of the badge, the shortcut or `chrome.tabs.create("chrome://extensions/shortcuts")`.
