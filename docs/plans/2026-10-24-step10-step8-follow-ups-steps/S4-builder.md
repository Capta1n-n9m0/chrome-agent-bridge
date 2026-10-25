# Step 10 S4 — builder report: `browser_evaluate {saveTo}` through a chunked store

Builder, 2026-10-25, base `f4c0ff2`, Opus 5.5. Not committed. No live work: no Chrome, no reload, no daemon on 9234.
Transport (B) as ruled by #205. Exit checks S4.1–S4.5 each have tests (below).

## 1. Built (files)

New:
- `extension/src/evaluate-save-store.ts`: `EvaluateSaveStore` (pure, injected clock). Entries are keyed by `id` and
  by the tab that filled them. TTL 5 min (each pull refreshes it), 8 entries, 256 MiB per value and 256 MiB in
  total (the oldest entries go first), slices ≤ 1 MiB, `dropAll`, `dropTab`. Also `javaScriptOff(memory)`, which
  is `sw.ts`'s JavaScript-off test, and `tooLargeError`.
- `extension/src/evaluate/save.ts`: the CDP leg (pure, `send` and timers injected). The three page functions are
  literal source strings: `SAVE_PREPARE_SRC`, `SAVE_META_SRC` and `SAVE_SLICE_SRC`. Also
  `collectSaveText`, `primitiveSaveText`, `saveEvaluateParams` (exactly `evaluateInPage`'s `Runtime.evaluate`
  params), and the fixed refusal messages.
- `extension/src/handlers/evaluate-save.ts`: `evaluateSaveStart`, `evaluateSaveChunk`, `evaluateSaveEnd`,
  `clearEvaluateSaves`, `dropEvaluateSavesForTab`. Nothing in this file logs.
- `sdk/src/evaluate-save.ts`: `saveEvaluateToFile` (the client half), `checkSaveTarget` (the file rules), and the
  types `EvaluateToFileOptions` and `EvaluateToFileResult`.
- Tests:
  - `extension/test/s4-save-store.test.ts`
  - `extension/test/s4-save-page.test.ts`
  - `extension/test/s4-save-handler.test.ts`
  - `extension/test/s4-save-gate.test.ts`
  - `extension/test/s4-fake-cdp.ts` (a helper: a fake CDP that runs the shipped page sources)
  - `daemon/test/s4-save-methods.test.ts`
  - `sdk/test/s4-evaluate-to-file.test.ts`
  - `mcp/test/s4-save-tool.test.ts`
  - `mcp/test/s4-save-cross.test.ts`

Changed:
- `shared/src/protocol.ts`: adds `EvaluateSaveKind`, `EvaluateSaveStartParams/Result`, `EvaluateSaveChunkParams/Result`
  and `EvaluateSaveEndParams`, documented like the download types.
- `extension/src/debugger.ts`: adds `evaluateToSave`, which runs one `withDebugger` session with the `HandlerSafety`
  guard. The evaluation shares `timeoutMs`'s deadline (`raceTimeout`). Reading the value out gets `SAVE_TRANSFER_MS`
  = 120 s more. A terminated script maps to `TIMEOUT`.
- `extension/src/sw.ts`:
  - Registers the three methods with string literals.
  - `onDisarm` calls `clearEvaluateSaves()`.
  - The existing `storage.onChanged` safety branch calls `clearEvaluateSaves()` after `applyChanges` when
    `javaScriptOff(safety.memory)`.
  - The existing top-level `tabs.onRemoved` (network) listener calls `dropEvaluateSavesForTab(tabId)`.
  - The existing `tabs.onReplaced` listener calls `dropEvaluateSavesForTab(removedTabId)`.
  - No new listener, no top-level `await`.
- `extension/src/safety.ts`: `METHOD_CLASSES` gains only the three new entries, each `"evaluate"`, plus doc comments.
  No existing entry changed.
- `daemon/src/methods.ts`: `TAB_METHODS` gains the three names. `takesLock` is unchanged (false for them).
- `sdk/src/tab.ts`: adds `Tab.evaluateToFile(expression, {path, overwrite?, timeoutMs?})`, which goes through the
  stale guard and `#reported`.
- `sdk/src/client.ts`: adds the cursor mirror `BridgeClient.evaluateToFile` (F21).
- `sdk/src/index.ts`: adds two type exports. The values stay eight.
- `sdk/src/download.ts`: re-exports `saveEvaluateToFile` and `checkSaveTarget`, so the `@bridge/sdk/download` subpath
  is the MCP's door to them.
- `mcp/src/tools/registry.ts`: `browser_evaluate` gains `saveTo` and `overwrite`, plus the description sentence
  (verbatim). With `saveTo`:
  - `asRef` → `BAD_PARAMS` (thrown `BridgeError`, before any call).
  - `checkSaveTarget` runs before `onTab`, so a bad path makes no claim.
  - The answer is `Saved <path>\n<bytes> bytes · <kind> · sha256 <hex>`.
  - Without `saveTo` the code path is unchanged.
- Existing tests changed by design, because three methods were added. Each has a dated note citing #205:
  - `daemon/test/methods.test.ts`: the expected `TAB_METHODS` list gains the three names.
  - `daemon/test/safety-surface.test.ts`: the `STEP8` lists are untouched. A new `STEP10_S4_TAB_METHODS` is appended
    in the equality, so any other added, removed or renamed method still fails.
  - `extension/test/gated-router.test.ts`: method count 23 → 26.
  - `extension/test/sw-static.test.ts`: two `router.on` counts 23 → 26.
  - `extension/test/safety-gate.test.ts`:
    - The scan count goes 23 → 26 and the table list gains three names.
    - The S1.2 oracle's JavaScript-off rule was `method === "evaluate"` and is now `cls === "evaluate"`.
    - The "other tools keep working" loop now excludes the class `evaluate`, not only the method `evaluate`.
    - No refusal text changed.
  - `extension/test/log-sentinel.test.ts`: two tests added (S4.5).
  - `mcp/test/s2-focus-first.test.ts`: the schema re-baseline (§4).
  - No test was removed.

## 2. Results

| Check | Before (`f4c0ff2`, re-derived) | After |
|---|---|---|
| `npm test` | 2989 passed, 122 files | **3126 passed, 130 files** (+137 tests, +8 files) |
| `npm run typecheck` | — | exit **0** |
| `npm run build` | — | exit **0** |

The +137 tests include 36 new S1.2 matrix cases in `safety-gate.test.ts`: 3 methods × 4 states × 3 URL kinds,
generated from `METHOD_CLASSES`.

Tails:
```
 Test Files  130 passed (130)
      Tests  3126 passed (3126)
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
TYPECHECK EXIT 0
built mcp → dist/index.js
built extension → dist/
BUILD EXIT 0
```

- After the build, `git status --short` shows no tracked build output. `dist/` is ignored.
- The bundle contains the page source intact: `async function (awaitIt)` appears once in `extension/dist/sw.js`.
- Recipes typecheck: `tsconfig.json`, `.fe` and `.s9` exit 0.
- `tsconfig.s6.json` exits 2 with `extension/src/tabs.ts: Cannot find namespace 'chrome'`. This is **not caused by
  S4**: that config includes `recipes/test/*.test.ts`, and `recipes/test/s9-rules.test.ts` (Step 9, unchanged)
  imports `extension/src/tabs.ts` without chrome types. Neither file is touched by S4. It looks pre-existing and is
  not an exit check. Flagged for the step agent.

`git status --short` (after the build):
```
 M daemon/src/methods.ts
 M daemon/test/methods.test.ts
 M daemon/test/safety-surface.test.ts
 M extension/src/debugger.ts
 M extension/src/safety.ts
 M extension/src/sw.ts
 M extension/test/gated-router.test.ts
 M extension/test/log-sentinel.test.ts
 M extension/test/safety-gate.test.ts
 M extension/test/sw-static.test.ts
 M mcp/src/tools/registry.ts
 M mcp/test/s2-focus-first.test.ts
 M sdk/src/client.ts
 M sdk/src/download.ts
 M sdk/src/index.ts
 M sdk/src/tab.ts
 M shared/src/protocol.ts
?? daemon/test/s4-save-methods.test.ts
?? docs/plans/.../S4.ledger.md, briefs/S4-builder.md, briefs/S4-inputs.md   (the step agent's, pre-existing)
?? extension/src/evaluate-save-store.ts
?? extension/src/evaluate/save.ts
?? extension/src/handlers/evaluate-save.ts
?? extension/test/s4-fake-cdp.ts
?? extension/test/s4-save-gate.test.ts
?? extension/test/s4-save-handler.test.ts
?? extension/test/s4-save-page.test.ts
?? extension/test/s4-save-store.test.ts
?? mcp/test/s4-save-cross.test.ts
?? mcp/test/s4-save-tool.test.ts
?? sdk/src/evaluate-save.ts
?? sdk/test/s4-evaluate-to-file.test.ts
(+ this report)
```

## 3. Failing-first evidence

I ran the new and extended tests before any production code existed:
`npx vitest run <the 8 new test files> mcp/test/s2-focus-first.test.ts extension/test/log-sentinel.test.ts`.
ANSI codes are stripped below.

```
 FAIL  extension/test/s4-save-gate.test.ts      (import: module not found)
 FAIL  extension/test/s4-save-handler.test.ts   (import)
 FAIL  extension/test/s4-save-page.test.ts      (import)
 FAIL  extension/test/s4-save-store.test.ts     (import)
 FAIL  sdk/test/s4-evaluate-to-file.test.ts     (import)
 × S4 — the daemon's method table > each new method is a tab method, not free, and takes no lock
 × S4.4 — the description > browser_evaluate's description carries the sentence verbatim
 × browser_evaluate {saveTo} > answers exactly two lines with path, size, kind and sha256 — no part of the value
 × browser_evaluate {saveTo} > on the cursor: the first touch claims the human's tab, then saves there
 × browser_evaluate {saveTo} > asRef with saveTo → BAD_PARAMS before any call
 × browser_evaluate {saveTo} > a relative path, an existing file without overwrite → BAD_PARAMS before any call (no claim)
 × browser_evaluate {saveTo} > overwrite:true replaces an existing file
 × browser_evaluate {saveTo} > a DISARMED refusal is the one safety line; no file is left
 × browser_evaluate {saveTo} > an undefined value (BAD_PARAMS from the extension) is a tool error; no file is left
 × S2.3 ... names and input schemas deep-equal the fixture captured at f45e3bf (browser_evaluate re-baselined by S4)
 × S4.5 sentinel test ... > extension: the CDP leg, the store and the handlers
 × S4.5 sentinel test ... > daemon + SDK over real ws (port 0): ...
 × S4.1 — saveTo over the real daemon, SDK and MCP (port 0) > a 1 000 000-character value ...
 × S4.1 ... > V8: a pull after the store is lost is refused cleanly and leaves no .part
 × S4.1 ... > a refusal mid-pull (the human disarms) through the MCP: the one safety line, .part gone
 Test Files  10 failed (10)
      Tests  15 failed | 47 passed (62)
```

The 47 that passed are the existing tests in `s2-focus-first` and `log-sentinel`.

Changes made after this run (the tests themselves were not weakened):
1. `s4-save-gate.test.ts`: dropped the `jsdom` environment (jsdom's `URL` broke `fileURLToPath`) and made two
   regexes CRLF-tolerant. The working copy of `sw.ts` has CRLF line ends.
2. `log-sentinel`'s S4.5 test: added the stand-in `daemon.js` file, which `connect()` requires.
3. The JavaScript-off drop moved from a `storage.onChanged` key check to `javaScriptOff(safety.memory)` (§6 item 1).
   `s4-save-store`'s and `s4-save-gate`'s checks of it were rewritten to match, and a composition test was added
   (a real `SafetyStore` change drops the store).

## 4. The schema re-baseline (#214 item 1)

- `mcp/test/fixtures/tool-schemas-f45e3bf.json` is **untouched**.
- In `s2-focus-first.test.ts`, every tool except `browser_evaluate` still deep-equals its fixture entry.
- `browser_evaluate` must equal the fixture entry plus exactly `saveTo` and `overwrite`, written out literally in the
  test. A dated comment there cites #127 and #214.

Evidence: `npx tsx <scratchpad>/schema-check.mts` captures the live `tools/list` through `mcp/test/tool-schemas.ts`
and compares JSON strings with the fixture:
```
tools 23 | byte-identical to f45e3bf: 22 | different: browser_evaluate
added properties: overwrite,saveTo
browser_evaluate minus saveTo/overwrite == fixture entry (byte-identical JSON): true
```

## 5. How each exit check is met

- **S4.1** (`mcp/test/s4-save-cross.test.ts`). The setup is:
  - the real `WsHost` on port 0, with a real file logger and a raw logger;
  - the SDK's `connect()`, with BridgeLink, TabCursor and the tools;
  - a fake proto:2 extension serving the three methods from 1 000 000 crypto-random characters (ASCII plus `éж€中ßøΩ`,
    so bytes > characters).

  The test then checks:
  - Saved through the MCP (the cursor claims the human's tab) and through the SDK (`Tab.evaluateToFile` on a new tab).
  - file sha256 = sha256(TextEncoder(value)).
  - The answer is exactly the two lines, and `answer.length ≤ min(300, path.length + 120)`. The test path is ≤ 180
    characters (asserted).
  - No 16-character run of the value appears in the answer, the SDK result JSON, the daemon log file, the raw daemon
    log lines or the console (each line checked).
  - Pulls are ≤ 1 MiB, each end is sent, nothing is left held, no `.part` remains, and the extension never sees
    `tab` (only `tabId`).
- **V8** (same file): the fake extension forgets the store after the first pull. The result is `INTERNAL Unknown or
  expired evaluateSave id: …`, no file and no `.part`, and the end is still sent.
- **A refusal mid-pull** (same file): `DISARMED` on the 2nd pull through the MCP gives one safety line and no `.part`.
- **S4.2**:
  - Relative path, trailing separator, existing directory, missing parent (nothing created), existing file without
    overwrite, existing `.part` (untouched): all `BAD_PARAMS` before any call (`sdk/test/s4-evaluate-to-file.test.ts`).
  - The MCP also refuses before its claim (`mcp/test/s4-save-tool.test.ts`).
  - Mid-write failure: an fs write error on the 2nd write, an empty slice, and a size mismatch all remove `.part` and
    send the end.
  - `asRef` + `saveTo` → `BAD_PARAMS` with no call.
  - `undefined` → `BAD_PARAMS`, nothing stored (page test, handler test and MCP test).
- **S4.3** (`extension/test/s4-save-gate.test.ts`):
  - The scan passes with the three methods classified (S1.1's own test, now at 26).
  - `safetyDecision` equals `evaluate`'s for every state × target × phase (180 comparisons).
  - JavaScript off: each wire refusal **equals** `evaluate`'s, by `toEqual`. Today that is `DISARMED {scope:"evaluate"}`;
    S4b changes no text here.
  - Disarmed → `DISARMED {scope:"all"}`.
  - A blocked tab refuses all three (`DOMAIN_BLOCKED`).
  - The post-check replaces a pull's reply when the tab becomes blocked mid-call.
  - Armed: each reaches its handler.
  - The store is emptied at disarm (a real `SafetyStore.toggle()` with `onDisarm` → `clearEvaluateSaves`), at
    JavaScript off (composition test), on tab close and replace (`dropTab`, plus a static check of `sw.ts`), and after
    the TTL (store test).
  - The pre-existing tests all pass with armed, JavaScript on and an empty list.
- **S4.4**: the description sentence is asserted verbatim (`s4-save-tool.test.ts`).
- **S4.5**:
  - The log allowlist stays at **54** entries (54 → 54). S4 adds no log line anywhere: the handlers, the store, the CDP
    leg and the SDK module have no `console`/`log` call, and a handler test asserts zero console lines.
  - `log-sentinel.test.ts` gains two tests with a sentinel VALUE, EXPRESSION and PATH:
    - The extension's CDP leg, store and handlers.
    - The real daemon on port 0, with an injected logger and a real file logger, and the SDK's `evaluateToFile`
      writing into a `sentinel-path-P5W2` directory, plus a refused second save.
  - Neither test finds a sentinel in any captured line, and each capture is checked to be live.

## 6. Deviations from the brief and the phase doc

1. **The JavaScript-off drop reads the memory copy, not the storage key.** `safety-writers.test.ts` and
   `sw-static.test.ts` (Step 9) allow `SAFETY_KEYS` and value imports of `safety-state.ts` only in specific files, and
   my first version broke both. `sw.ts` now runs `if (javaScriptOff(safety.memory)) clearEvaluateSaves();` right after
   `safety.applyChanges(changes)` inside the existing safety branch.
   - The store module imports only a **type** from `safety-state.ts`, which those tests allow.
   - It also drops the store when the copy is unknown or unreadable (fail closed).
   - It drops on every safety change while JavaScript is off, which is harmless: starts are refused then, so the
     store is already empty.
2. **The start result has no sha256.** `downloadStart`'s result has none either (mirrored as the brief says). The SDK
   hashes the bytes it writes.
3. **`EvaluateSaveChunkResult` = `DownloadChunkResult` (`{data}`, base64).** The default and ceiling are 1 MiB. The
   `downloadChunk` ceiling is 8 MiB, but the brief says ≤ 1 MiB.
4. **Slices never split a surrogate pair in the page.** The brief asked to join the slices and encode once, which is
   done. In addition, `SAVE_SLICE_SRC` shortens a slice by one unit rather than end on a high surrogate, because how CDP
   carries a lone surrogate in a by-value string is unmeasured (row SAVE-SURR).
5. **Two time bounds.** `timeoutMs` (clamped as `evaluate`'s) bounds the page's work. Reading out gets a fixed 120 s
   more (`SAVE_TRANSFER_MS`). The SDK's start call timeout is `timeoutMs + 120 000 + 5 000`.
6. **The MCP's asRef + saveTo refusal is a thrown `BridgeError(BAD_PARAMS, …)`.** It renders like every other thrown
   tool error. The MCP's no-call locator errors use `toolError(…)` text without a code instead. I chose the thrown form
   so the code is literally `BAD_PARAMS`.
7. **The MCP description gains one sentence before the verbatim one:** "With saveTo the value is written to that file
   instead (a string as is, anything else as JSON, no caps) and the answer is only the path, size, kind and sha256."
   Descriptions are outside the schema baseline.

## 7. SPEC-DISCREPANCY (F2, primitive completion values)

**What happens.** When the expression's completion value is a primitive (a bare `"…"` string expression, a variable
holding a string, `JSON.stringify(x)` as the last expression), CDP returns it **by value inside
`Runtime.evaluate`'s own reply**. A primitive has no `objectId`, so there is no handle to slice. The whole value is
then one CDP message, from the browser to the worker through `chrome.debugger.sendCommand`. Stage 0 F2 forbids that.

**What is built.** The primitive path works. The string reaches the worker in that one reply, then goes into the store
and is pulled in 1 MiB slices. So **no runtime message and no WebSocket frame grows with it**: Stage 0's measured
failure (the 1009 close above 100 MiB) cannot happen. Only the CDP leg is whole.

The object and promise paths are fully sliced, and a test asserts no reply carries the whole value. The promise path
covers:
- any `return …` (wrapped in an async function);
- `fetch(…).then(…)`;
- `await` chains that end in a promise value.

**Options.**
- (a) **Accept and document**. The CDP leg is whole for primitive completions only, and S7 measures a ≥ 64 MiB
  primitive string through it (row SAVE-PRIM). The tool and SDK docs say "use `return …` for large values".
  This keeps `evaluate`'s semantics, and the WS/runtime legs are already safe.
- (b) **Save-only rewrite: wrap the expression so the value is always an object**, e.g. evaluate
  `(async () => { return (0, eval)(<expression as a string literal>) })()`. This changes semantics:
  - `replMode`'s top-level `await` and `let`/`const` re-declaration are lost;
  - the expression runs in indirect-eval scope;
  - a page CSP without `unsafe-eval` may block it (CDP's `allowUnsafeEvalBlockedByCSP` defaults to allowing eval
    *in the evaluated code*, which is unverified here).

  It is forbidden as a silent change.
- (c) **`Runtime.evaluate {serializationOptions: {serialization: "idOnly"}}`**. The Runtime docs page could not be
  read here (the site renders by JavaScript; WebFetch got only a redirect). Whether `idOnly` gives a primitive an
  `objectId` is **unknown**. If it does, it is the clean fix (row SAVE-IDONLY).
- (d) **Refuse a primitive completion over N bytes** with a hint to use `return`. This is a new refusal (contract-level)
  and would make the saveTo path behave differently from `evaluate`.

**Recommendation:** (a) now, and S7 measures SAVE-PRIM and SAVE-IDONLY. If `idOnly` (c) proves out live, switch to it
in a later stage. If SAVE-PRIM fails at 64 MiB, adopt (d) with the measured bound. The step agent decides.

## 8. Proposed decisions

1. **2026-10-25 · S4: the saveTo wire methods and params (contract-level).**
   - **Decided:** three tab methods, `evaluateSaveStart {expression, timeoutMs?}` → `{id, bytes, kind:"string"|"json"}`;
     `evaluateSaveChunk {id, offset, length?}` → `{data}` (base64, ≤ 1 MiB); `evaluateSaveEnd {id}` →
     `{released}`. Clients add `tab` and the daemon forwards `tabId`. `METHOD_CLASSES` `"evaluate"`, `TAB_METHODS`,
     no lock.
   - **Why:** mirrors `download*` (#205, F4); the brief's names.
   - **Instead of:** a sha256 in the start result (download has none); tab-less pulls.
   - **Revisit if:** S7 finds a need for the hash on the extension side.
2. **2026-10-25 · S4: the pull refusal reuses download's shape (contract-level).**
   - **Decided:** an unknown, expired, lost or other-tab id → plain `Error`, so `INTERNAL`, with message
     `Unknown or expired evaluateSave id: <id>`. The same message is used for another tab's id (it reveals nothing).
     An end naming another tab → `{released: false}`.
   - **Why:** the brief, by analogy with `downloadChunk`.
   - **Instead of:** `BAD_PARAMS` or `TAB_UNKNOWN`.
   - **Revisit if:** clients need to tell "lost" from a bug.
3. **2026-10-25 · S4: store caps and the over-cap code (contract-level).**
   - **Decided:**
     - TTL 5 min, refreshed per pull; 8 entries.
     - 256 MiB per value and 256 MiB total. The oldest entries are evicted to fit, as `DownloadStore` evicts by
       count.
     - A value over 256 MiB → `BAD_PARAMS` "The value is over the 256 MiB limit…". The limit is first checked by
       code units in the page (units ≤ bytes), before any slice is read, and again on the encoded bytes before
       storing.
   - **Why:** worker memory (the joined UTF-16 string plus the bytes, transiently about 3× the value). `BAD_PARAMS`
     because the size is the caller's request, as download's caller-side refusals are.
   - **Instead of:** no cap; a total cap that refuses rather than evicts.
   - **Revisit if:** S7's SAVE-64 shows memory pressure, or a user needs more than 256 MiB.
4. **2026-10-25 · S4: the value refusals (contract-level, per #207).**
   - **Decided:**
     - `undefined`, a function, a symbol, a Map, a Set, a DOM node, or a value whose `JSON.stringify` is
       `undefined` → `BAD_PARAMS` with fixed texts.
     - `JSON.stringify` throws (a cycle, a BigInt, a throwing `toJSON` or getter) → `PAGE_ERROR`
       `{name:"TypeError"}` with a fixed text.
     - The page's own exception or rejection → `PAGE_ERROR` exactly as `evaluate` renders it.
     - Primitive NaN/±Infinity → `"null"`, -0 → `"0"` (as `JSON.stringify`).
     - No refusal echoes value text.
   - **Why:** F12.
   - **Instead of:** echoing `JSON.stringify`'s own message (it can quote keys).
5. **2026-10-25 · S4: the SDK return type and new exported types (contract-level, surface).**
   - **Decided:** `Tab.evaluateToFile(expression, {path, overwrite?, timeoutMs?})` →
     `{path, bytes, kind, sha256}`, plus the `BridgeClient` mirror. New **types** exported from the main entry:
     `EvaluateToFileOptions` and `EvaluateToFileResult`. The values stay eight (test). `saveEvaluateToFile` and
     `checkSaveTarget` are reachable through the existing `@bridge/sdk/download` subpath for the MCP; no new subpath
     and no `package.json` change.
   - **Why:** brief §4; F21; the eight-value rule.
   - **Instead of:** a ninth value; a new `./save` subpath (needs `sdk/package.json`, outside the lane).
   - **Revisit if:** the user wants `saveEvaluateToFile` public.
6. **2026-10-25 · S4: two time bounds for a save.**
   - **Decided:** `timeoutMs` bounds the page's work as `evaluate`'s does. The read-out gets 120 s more. The client
     waits `timeoutMs + 125 s`.
   - **Why:** a 64 MiB value is 64+ CDP slice calls after the page's work.
   - **Revisit if:** SAVE-64's read-out time is near 120 s.
7. **2026-10-25 · S4: the JavaScript-off drop reads `SafetyStore.memory`.**
   - **Decided:** see §6 item 1.
   - **Why:** Step 9's writer and import invariants.
   - **Instead of:** reading `safety.evaluate` from the change batch.

## 9. Rows S7's SAVE block must measure live

Fixture pages only.
- **SAVE-1M:** a 1 MiB string via `return` saved through MCP `saveTo` and SDK `evaluateToFile`. The file hash
  equals the page's hash, computed in the page as sha256 of `TextEncoder` output via `crypto.subtle`.
- **SAVE-64:** a ≥ 64 MiB string via `return` (the promise path, sliced): hash equal; record the read-out time, the
  worker memory, and the MCP answer length.
- **SAVE-PRIM:** the same ≥ 64 MiB string as a primitive completion (`window.big` as the last expression, no
  `return`): does `Runtime.evaluate`'s reply carry it, and how long does it take? Record any CDP or worker failure.
  This is §7.
- **SAVE-IDONLY:** whether `serializationOptions:{serialization:"idOnly"}` gives a primitive string an `objectId` on
  Chrome 156 (a probe, not a product change).
- **SAVE-SURR:** a string with astral characters across a 1 MiB boundary and a lone surrogate. The file equals the
  page's `TextEncoder` bytes, so the lone surrogate is `efbfbd`.
- **SAVE-JSON:** an object with more than 100 items, depth more than 6 and nested strings over 5000 characters. The
  file equals the page's `JSON.stringify`, with no serialiser caps.
- **SAVE-REFUSE:** `undefined`, `document.body`, `new Map()`, and a cycle each give their code, with no file and no
  `.part`.
- **SAVE-DISARM:** disarm mid-pull (a large value, a press between pulls). The next pull is `DISARMED {scope:"all"}`,
  the `.part` is removed, and the store is empty (a re-arm then a pull of the old id → `INTERNAL Unknown or expired…`).
- **SAVE-CLOSE:** close the tab mid-pull. The pull is refused and the `.part` removed.
- **SAVE-JSOFF:** JavaScript off. The start is refused with `evaluate`'s refusal, and a held entry is dropped when
  JavaScript is turned off mid-pull.
- **SAVE-BLOCK:** a tab on the block list. The start and each pull give `DOMAIN_BLOCKED`.
- **SAVE-TTL:** a start with no pulls for more than 5 min, then a pull → `INTERNAL Unknown or expired…`.
- **SAVE-HOLD:** another client pulling a held tab's id → `TAB_HELD` from the daemon.
- **SAVE-LOG:** the worker console and `daemon.log` hold no value, expression or path after the block, checked by
  counts and never printed.

## 10. Unfinished / notes

- Nothing unfinished in the lane. No STOP item met.
- No existing method's safety class changed, no pull is tab-less, the extension never receives the path, and no slice
  of the value appears in any answer, error or log.
- Flag: the `recipes/tsconfig.s6.json` typecheck failure in §2 looks pre-existing (Step 9's `s9-rules.test.ts`).
- Mixed line ends: `sw.ts` keeps its working-copy CRLF. Files written fresh are LF. `core.autocrlf=true` normalises
  them on commit.
