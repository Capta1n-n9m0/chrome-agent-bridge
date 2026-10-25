# S4 builder brief — `browser_evaluate {saveTo}` through a chunked store

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push; never touch the
user's real Chrome profile (no extension reload, no live browsing) unless your brief grants
it; never log URLs, header values or bodies from extension code. Report in the exact format
requested. Never invent results — if something did not run, say so. Decisions you take go
in your report as "Proposed decisions" (date · plain title, then Decided / Why / Instead of /
Revisit if). No internal codes without a one-line gloss. Model: Opus 5.5 (claude-opus-5-5).
Node: run `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every Bash
call that runs node/npm/npx. Tests bind port 0, never 9234. Nothing is running; do not start the real daemon on
9234 or Chrome. You must NOT spawn agents. You finish in one go and never wait.

Nothing else works in the main tree now. Still: do not use `git stash`; for failing-first evidence, run the new
tests before writing the code and paste the red output. Do NOT commit — the step agent commits after the verifier.
Base commit `f4c0ff2`; S3's report says 2989 tests / 122 files — re-derive it first (`npm test`) and use your number.

## Role: Builder (stage S4)

Implement exactly this stage. Failing tests first for the store, the file rules, the page-side slicer/validator,
the gate entries and the cross-package path; then the code. Run `npm run typecheck`, `npm test`, `npm run build`
and paste the tails. Then `git status --short` must show only your intended files (no tracked change from the build).
Write your report to `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S4-builder.md`.

## Lane (anything outside escalates — stop and say so in the report)

`extension/src/` (the evaluate handler, a new store module, `sw.ts` registration and its disarm / JavaScript-off /
tab-close drops, `safety.ts`'s `METHOD_CLASSES` — entries for the NEW methods only, `debugger.ts`),
`daemon/src/methods.ts` (the new methods in `TAB_METHODS` only), `shared/src/protocol.ts`, `sdk/src/`,
`mcp/src/tools/registry.ts`, their `test/` dirs, `extension/test/log-*` files, `mcp/test/fixtures/` only for the
re-baseline below. A change to an EXISTING method's safety class, a tab-less pull, the extension learning the path,
or any slice of the value in an answer, an error message or a log line is a STOP: do not do it, report it.

## The step agent's design brief (binding unless it contradicts the phase doc — then say so, SPEC-DISCREPANCY)

1. **Wire (contract-level; mirror `downloadStart`/`downloadChunk`/`downloadEnd` — read
   `extension/src/handlers/download.ts`, `extension/src/download.ts`, `sdk/src/download.ts`, their `shared` types
   first and copy their param/result naming and chunk encoding exactly where it fits).** Three new extension
   methods, named **`evaluateSaveStart`**, **`evaluateSaveChunk`**, **`evaluateSaveEnd`**:
   - `evaluateSaveStart {tab, expression, timeoutMs?}` (the daemon forwards `tabId`) → evaluates as `evaluate`
     does, validates the value, fills the store, returns `{id, bytes, kind}` (plus a sha256 of the stored bytes if
     download's start result carries one — mirror it). Never the value, never a preview or description of it.
   - `evaluateSaveChunk {tab, id, offset, length?}` → one slice of ≤ 1 MiB (1 048 576) of the UTF-8 bytes, encoded
     as download's chunks are (base64 if that is what `downloadChunk` does).
   - `evaluateSaveEnd {tab, id}` → drops the entry.
   - Store entries are keyed by `id` AND the `tabId` that filled them: a chunk/end naming another tab, an unknown id,
     an expired id, or an id lost to a worker restart is refused cleanly — use the same code and message shape
     `downloadChunk` uses for an unknown id (record the code under Proposed decisions as contract-level).
   - All three: `METHOD_CLASSES` class `"evaluate"` (so the kill switch, the JavaScript switch and the block list
     refuse each one at receipt and post-check, exactly as `evaluate`), `router.on(...)` with a string literal in
     `sw.ts`, `TAB_METHODS` in `daemon/src/methods.ts` (lease-checked, no visibility lock — `takesLock` stays false).
   - `shared/src/protocol.ts`: param and result types, documented like the download ones.
2. **The CDP leg slices too (Stage 0 F2, binding): no single CDP reply, runtime message or WS frame carries the
   whole value.** Plan: `Runtime.evaluate` with the same `replMode`/`awaitPromise`/`returnByValue:false`/`wrapExpression`
   behaviour as `evaluateInPage` (one deadline; `raceTimeout`; the second-promise-level gotcha); then one
   `Runtime.callFunctionOn` on the result object with a closure-free page function (a source-string constant, tested
   in jsdom/vm like `SERIALIZER_SRC`) that validates the value (a Node, Map, Set, function, symbol or `undefined` →
   `BAD_PARAMS` "nothing to save"/"not saveable", nothing stored; `JSON.stringify` throws → `PAGE_ERROR` without
   echoing any value text; a string is kept as is; any other value is `JSON.stringify`'d IN THE PAGE) and keeps the
   resulting string on a holder object returned by `objectId`, reporting only its length and kind by value; then
   `Runtime.callFunctionOn` slices of ≤ 1 MiB of code units (returned by value), joined in the worker, and
   `TextEncoder` once over the joined string (so a surrogate pair split between slices encodes correctly; a lone
   surrogate becomes U+FFFD as F12 says); release the holder; all within ONE debugger session (`withDebugger`, with
   the `HandlerSafety` guard so the gate re-checks before the first side effect, as `evaluate` does).
   **Known hard case:** CDP returns a primitive completion value (e.g. a string) BY VALUE in `Runtime.evaluate`'s
   own reply — it cannot be referenced by `objectId`. A promise-valued completion (the async-IIFE `return` form,
   `fetch(...).then(...)`) is an object: handle it with `Runtime.callFunctionOn` on the promise (`awaitPromise:
   true`, `returnByValue:false`, the holder back by objectId) instead of `Runtime.awaitPromise` by value. For a
   primitive completion value find a semantics-preserving way to keep it off a single CDP reply if one exists (you
   may consult the official CDP docs at chromedevtools.github.io/devtools-protocol with WebFetch — e.g.
   `serializationOptions`, `allowUnsafeEvalBlockedByCSP`; anything that cannot be proven without Chrome must be named
   as a row S7 must measure). If none exists without changing what the expression means, DO NOT silently change
   `evaluate`'s semantics and DO NOT silently accept the whole-value reply: build the rest, keep the primitive path
   working (sliced into the store in the worker, so no WS frame grows), and raise it in your report as a
   **SPEC-DISCREPANCY (F2, primitive completion values)** with the options you see and your recommendation. The step
   agent decides.
3. **Store module** (pure, unit-tested, injected clock; like `DownloadStore`): TTL (≤ 5 min), a few entries (≤ 8),
   a total-bytes cap you choose and record (a value over the cap → a clean refusal before anything is stored; pick
   the code by analogy with download and record it). `dropAll()` at disarm (where `sw.ts` runs
   `debuggerSessions.detachAll`), and when JavaScript is turned off (the existing top-level `storage.onChanged`
   listener — no new top-level `await`, any new listener at the top level), `dropTab(tabId)` on the tab's close
   (inside an existing top-level `chrome.tabs.onRemoved` listener, or a new top-level one) and on `tabReplaced` if
   that is how a tab id goes away. The extension NEVER receives the path: the path lives only in the SDK.
4. **SDK.** `Tab.evaluateToFile(expression, {path, overwrite?, timeoutMs?})` → `{path, bytes, kind, sha256}` and its
   `BridgeClient` mirror on the cursor (Stage 0 F21: `BridgeClient` mirrors `Tab`'s methods but `close`); no new
   top-level export VALUE (exactly eight stay; a new exported type is allowed and recorded). File rules (#207, F11,
   F12) checked BEFORE any wire call where possible: `BAD_PARAMS` for a relative path, an existing directory, a
   missing parent directory (nothing created), an existing file without `overwrite: true`, an existing
   `<path>.part` (opened `"wx"`); write to `<path>.part` then rename; `.part` removed on every failure (page error,
   pull refused, store lost, write error, size mismatch); `evaluateSaveEnd` sent best-effort on every exit; sha256 of
   the bytes written; strings UTF-8 without BOM. A refusal leaves no file. The SDK's error messages may name the
   path (the caller gave it) but never any of the value; nothing in the SDK logs the path or the value. Failure
   reports (Step 8 attach set) may attach as they do for `evaluate` — confirm nothing of the value can reach a report.
   Keep `sdk/src/tab.ts`'s Step 8 signatures and S3's `s3-signatures.test.ts` unchanged.
5. **MCP.** `browser_evaluate` gains `saveTo` (absolute path string) and `overwrite` (boolean). With `saveTo`: the
   answer is exactly two lines `Saved <path>` and `<bytes> bytes · <kind> · sha256 <hex>` — no part of the value;
   `asRef` + `saveTo` → `BAD_PARAMS` before any call; refusals render like other tool errors (DISARMED/DOMAIN_BLOCKED
   one line via `withSafetyRefusals`). Without `saveTo` everything is byte-identical to today. The description gains
   verbatim: `Paging bulk data through browser_evaluate in chunks is a test device only, never a supported pattern:
   pass saveTo to write a large value to a file instead.` (S4.4 test asserts it verbatim). **Schema baseline (#214
   item 1):** `mcp/test/s2-focus-first.test.ts` / `mcp/test/fixtures/tool-schemas-f45e3bf.json` changes BY DESIGN —
   re-baseline only `browser_evaluate`'s entry, with a dated comment citing #127 and #214, and show in your report
   (a command + output) that every other tool's schema is byte-identical to the f45e3bf fixture. Build on S2's
   focus-first and S3's warning lines (`mcp/src/tools/registry.ts`), never undo them.
6. **Logs (S4.5).** No new log line carries the value, a slice, a length-of-path, the path or the expression; at most
   a count (`[bridge] evaluateSave N bytes` style), and only if you need one. `extension/test/log-allowlist.ts`
   counts from 54 (Stage 0 F8): add only what you add, with the count change stated. Extend
   `extension/test/log-sentinel.test.ts` (and the log scan where it applies) with a sentinel VALUE and a sentinel
   PATH, run through the real daemon on port 0 and the save path, and assert neither appears in any captured line.
7. **S4.1's cross-package test:** a real daemon + SDK + MCP over real `ws` with a fake proto:2 extension on port 0
   that serves the three new methods from a value of 1 000 000 random characters (crypto; include non-ASCII so bytes
   ≠ characters), saved through the MCP and through the SDK; file sha256 = `sha256(new TextEncoder().encode(value))`;
   test path ≤ 180 chars; the MCP answer `≤ min(300, path.length + 120)` characters; no 16-character run of the value
   in the MCP answer, the SDK's return value (JSON), or any captured log line (daemon log file + console). Model it
   on `mcp/test/multi-actor.test.ts`. Also: a pull after the store is lost (fake extension forgets the id) → clean
   refusal and no `.part` left (V8); a mid-write failure → `.part` gone.
8. **S4.3 tests:** Step 9's router-scan test (`extension/test/safety-gate.test.ts`) passes with the three methods
   classified; for each new method, with JavaScript off its refusal EQUALS `evaluate`'s own refusal for the same
   state (asserted by equality, so S4b changes no S4 test text — at S4 that is `DISARMED {scope:"evaluate"}`);
   disarmed → `DISARMED {scope:"all"}`; the store emptied at disarm (and at JavaScript off, tab close, TTL); a
   blocked tab refuses each pull (`DOMAIN_BLOCKED`). With the bridge armed, JavaScript on and an empty block list,
   every existing test passes unchanged.
9. **E2E rows:** the `chrome.*` glue is not unit-tested — list in your report the rows S7's SAVE block must measure
   live (at least: a ≥ 64 MiB and a 1 MiB string saved, file hash = page hash; the primitive-completion case's CDP
   behaviour; disarm mid-pull; tab close mid-pull; JavaScript off; a blocked tab; the TTL). Do not edit
   `docs/e2e-test-plan.md` (outside the lane) — the rows go in your report.

Report sections: built (files) · test/typecheck/build results (pasted, with counts before → after) · the
failing-first evidence · the schema re-baseline evidence · deviations from the phase doc · SPEC-DISCREPANCY items ·
proposed decisions (contract-level ones marked: the method names and params, the refusal codes, the store caps, the
SDK return type, any new exported type) · rows S7 must measure · anything unfinished.

---

# Inputs, verbatim

## Phase doc `docs/plans/2026-10-24-step10-step8-follow-ups.md` — 0.4, 0.11, 0.12, Stage S4, exit checks, STOP rules

### 0.4 `browser_evaluate {saveTo}` (user)

decisions.md · 2026-10-24 · Bulk data through `browser_evaluate` was a test device only; the MCP gets a `saveTo`
path (#127): the MCP gains a way to move bulk data without the model's context — `browser_evaluate {saveTo:
<path>}` writes the value to a file and returns only path, size and sha256, as `browser_download` does; the tool
description says chunked paging is a test device only. *Proposed details:*
- **Transport — decided at Stage 0 by measurement, smallest change first.** (A) No new wire method: the MCP sends
  one `evaluate` and writes the envelope's `value` (kept whole by `extension/src/evaluate/result.ts` `cap()`, which
  trims only `description`) — only if Stage 0 measures that a string value of at least 64 MiB crosses
  `chrome.debugger` → service worker → offscreen document → WebSocket → daemon → client whole; the serialiser's
  array and depth limits (100 items, depth 6) still apply to non-strings, so (A) saves a string as is and a
  non-string through `JSON.stringify` **in the page**. (B) Otherwise an extension-side store like
  `DownloadStore` (TTL, a few entries, cleared at disarm) and a chunked pull of 1 MiB per call, as
  `downloadChunk` does. (B) adds extension methods: each enters the safety table (class of `evaluate`, so the
  JavaScript switch and the kill switch refuse it — `GatedRouter.on` throws on an unclassified method) and the
  daemon's method table (`daemon/src/methods.ts`), and the store is dropped at disarm. Recommendation: (A) if the
  measurement holds, else (B). Either way contract-level, listed under Open decisions.
  *Amended 2026-10-24 (Stage 0 F1): Stage 0 measured the host leg on port 0 — one result frame crosses daemon →
  client whole up to 99 MiB (UTF-8 bytes) and above 100 MiB (`ws`'s default `maxPayload`, set nowhere in the repo)
  the daemon closes the extension socket (1009), failing every actor's call `NOT_CONNECTED`; the Chrome leg
  (`chrome.debugger` → worker → `runtime.sendMessage` → offscreen → WebSocket) is not measurable without Chrome. No
  measurement shows ≥ 64 MiB crossing the whole path, so by this decision's own rule the transport is (B). (A) is not
  built. The threshold, where it is cited, is in UTF-8 bytes of the frame, not characters.*
  *Amended 2026-10-24 (Stage 0 F2): under (B) no frame grows with the value — the evaluate-to-store path slices
  **also on the CDP leg** (a holder object's `objectId` and `Runtime.callFunctionOn` slices of ≤ 1 MiB within one
  debugger session, never one CDP reply of the whole value), and S4's lane names `extension/src/debugger.ts`. A size
  refusal for plain `evaluate` would be a new refusal (a contract change): recorded under Open items, not built in
  Step 10 unless ruled.*
  *Amended 2026-10-24 (Stage 0 F4): (B)'s new methods carry the tab (`tab` on the wire, a `tabId` at the extension):
  they enter `daemon/src/methods.ts` `TAB_METHODS` (lease-checked, not the lock) and `METHOD_CLASSES` as
  `"evaluate"`, so the kill switch, the JavaScript switch and the block list refuse each pull and only the tab's
  holder can pull. The store is dropped at disarm, on JavaScript off, on the tab's close, and after a TTL. The
  extension never receives the path; a pull after the store is lost (a worker restart) is refused and `.part`
  removed (test).*
  (F1, F2, F4: decisions.md · 2026-10-25 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls (#205);
  contract-level, open for the user.)
  *Amended 2026-10-24 (Stage 0 F25): the serialiser also has `maxString: 5000` (`extension/src/evaluate/serialize.ts`),
  which truncates nested strings, beside the 100 items and depth 6 named above.*
- **File rules** as `browser_download` (`sdk/src/download.ts`): `saveTo` absolute, a file path; an existing file
  is refused unless `overwrite: true`; written to `<path>.part` then renamed; `.part` removed on failure; sha256 of
  the bytes written. Strings are written as UTF-8 without a BOM.
  *Amended 2026-10-24 (Stage 0 F11): `saveTo` refuses with `BAD_PARAMS` a relative path, an existing directory, a
  missing parent directory (nothing is created), an existing file without `overwrite: true`, and an existing
  `<path>.part` (opened exclusively, `"wx"`); a refusal leaves no file.*
  *Amended 2026-10-24 (Stage 0 F12): the bytes are the value's UTF-8 as `TextEncoder` makes it (a lone surrogate
  becomes U+FFFD), and tests hash the page side the same way; a Node, Map, Set, function, symbol or `undefined`
  value is `BAD_PARAMS` before anything is stored; a throw from `JSON.stringify` is `PAGE_ERROR`.*
  (F11, F12: decisions.md · 2026-10-25 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s
  (#207); contract-level, open for the user.)
- **The answer** is `Saved <path>` and `<bytes> bytes · <kind> · sha256 <hex>` — no part of the value. `asRef`
  with `saveTo` is `BAD_PARAMS`. A value of kind `undefined`, `node` or `function` is refused `BAD_PARAMS` (nothing
  to save).
- **Description.** The tool description gains: `Paging bulk data through browser_evaluate in chunks is a test
  device only, never a supported pattern: pass saveTo to write a large value to a file instead.`
- **SDK.** The SDK's public surface is exactly eight values (`sdk/src/index.ts`); a ninth export is a contract
  change. Proposed: a `Tab` method `evaluateToFile(expression, {path, overwrite?, timeoutMs?})` and no new
  top-level export (conservative).
- **Logs.** Nothing logs the value or the path (the Step 9 log scan, `extension/test` and the sentinel test,
  extended with a sentinel value and path).


### 0.11 Nothing in Step 10 changes the safety boundary (proposed)

Step 9's invariants hold unchanged: one gate in the extension over every router method (`GatedRouter`); a new
extension method enters the safety table or `GatedRouter.on` throws; no wire, daemon, SDK or MCP method changes the
safety state; the state is read per call and fails closed (decisions.md · 2026-10-24 · The state is read per call,
fails closed, and is locked to trusted contexts (#139)); the extension's own pages stay blocked; nothing logs a
pattern, URL, title, the token, an evaluated value or a `saveTo` path. With the bridge armed, JavaScript on and an
empty block list, every Step 9 test and tool behaves as at `f45e3bf`.

### 0.12 A new code `JS_DISABLED` for "JavaScript is off" (user)

The user changed Step 9's #133 (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)): while the human has turned JavaScript off,
`evaluate` (with or without `asRef`) and a `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL (#138) are
refused with a new code **`JS_DISABLED`**, not `DISARMED` with `data.scope: "evaluate"`. Spec §10 is amended first
(dated note); `shared/src/codes.ts` goes to 26 codes (25 on the wire); the extension's refusal (`safety.ts`), the
SDK's `safetyRefusalLine` and the MCP's one-line rendering ("the user turned JavaScript off; every other tool still
works; ask them") follow; `JS_DISABLED` stays out of the failure-report attach set. While the bridge is off,
`DISARMED` (scope `"all"`) still wins over `JS_DISABLED`. *Proposed, for the audit:* `DISARMED` keeps its
`data.scope: "all"` for compatibility, and `"evaluate"` is no longer produced. The tests that pinned
`DISARMED scope:"evaluate"` change their expected text **by this ruling**, each listed per file in the stage report
(this is a contract change the user ordered, not the forbidden "edit a test's text to match a changed error").

*Amended 2026-10-24 (Stage 0 F17): the SDK and MCP keep rendering `DISARMED {scope:"evaluate"}` as the
JavaScript-off line (an old extension); `SafetyScope` keeps its two values; S4b.2 adds that case.* (decisions.md ·
2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential row, the retirement set, bb-login's
bound (#209).)

### Stage S4 — `browser_evaluate {saveTo}` (3 h, after S3)
- [ ] 0.4 with Stage 0's transport ruling; the SDK `Tab` method; the MCP parameter and description; log-scan and
      sentinel updates; for (B), the safety-table and daemon-table entries and the disarm drop.
**Lane:** `extension/src/` (evaluate handler, a store module, `sw.ts` registration, `safety.ts` table — for (B) only),
`daemon/src/methods.ts` (B only), `shared/src/protocol.ts`, `sdk/src/`, `mcp/src/tools/registry.ts`, their tests.
**Parallel with:** S5, S6.
*Amended 2026-10-25 (Stage 0 stage split, `stage0.md` §7; F2, F4): the transport is (B) (#205), so the lane holds
`daemon/src/methods.ts` (the tab-carrying pulls, F4) and gains `extension/src/debugger.ts` (CDP-leg slicing, F2);
budget 3.5 h (was 3 h). The work also carries F11/F12's file rules and V8's lost-store refusal (0.4's notes).*

## Exit checks (pre-registered)

Every stage: `npm test` = before + n, no test removed unless the stage's text says so and the report lists it per
file; `npm run typecheck` and `npm run build` exit 0; `git status --short` shows no tracked change after the build.

- **S4.1** over port 0 with a fake extension (and, for (A), Stage 0's measured bound): a value of 1 000 000
  characters saved; file sha256 = the expected; the MCP answer is under 300 characters and contains no 16-character
  run of the value (tests). *Amended 2026-10-24 (Stage 0 F13): S4.1's bound is `answer.length ≤ min(300,
  path.length + 120)` with a test path of ≤ 180 characters; the value is random (crypto); the SDK's return value and
  every captured log line are checked as well as the MCP answer.* **S4.2** file rules: relative path, existing file without `overwrite`, failure mid-write
  (`.part` gone), `asRef` + `saveTo`, an `undefined` value — each refused as 0.4 says (tests). **S4.3** for (B):
  Step 9's S1.1 router-scan test passes with the new methods classified; JavaScript off → `DISARMED {scope:
  "evaluate"}`; disarmed → `DISARMED {scope:"all"}`; the store emptied at disarm (tests). *Amended 2026-10-24
  (Stage 0 F6): S4.3's JavaScript-off clause reads: 'each new method's refusal equals `evaluate`'s own refusal for
  the same state (at S4: `DISARMED {scope:"evaluate"}`; after S4b: `JS_DISABLED`)', asserted by equality, so S4b
  changes no S4 test text. S4b.2 adds: (B)'s methods answer `JS_DISABLED` with JavaScript off.* **S4.4** the description
  sentence of 0.4 verbatim (test). **S4.5** the log scan and the sentinel test pass with a sentinel value and path
  added, and find neither.

## STOP rules and forbidden fixes

**Stops the gate** (the write-up continues): a pre-registered check fails after 2 fix rounds; a router method
reachable without the safety gate; any path by which a client, the daemon or a page changes the safety state or
reaches the extension's own pages; a safety state not restored after a live wave; a pattern, URL, title, the token,
an evaluated value or a `saveTo` path in a log or committed evidence; a `CLAUDE.md` runtime invariant that would
have to change; `main` rewritten or anything pushed without G10-1; a port-9234 holder that is not the daemon, or an
orphan process; the test count dropping without a documented move or removal; a live runner continuing past a STOP
line (#193).

**Continues anyway, recorded:** a live row that fails (the fix is a proposed decision); SW-1's outcome either way;
RET-1 or the pp1 leg not run for lack of a grant.

**Forbidden fixes:** exempting or reclassifying a method in the safety table to make a row pass; a method that arms,
disarms, edits the list or turns JavaScript on; re-arming by default; enforcing safety in the daemon or SDK instead
of the extension; matching hosts by substring; editing §4.20's rows or any row's expected text after its run
(re-measurements are new rows); relaxing a bound after seeing the measurement (R14-4b's banner lifetime is a record);
changing `a11y.ts`, `locate`'s rules or the snapshot's output to make the cap warning appear; returning any part of
a `saveTo` value to the model, or writing anywhere but the given absolute path; lowering `activateForCapture`'s
1000 ms or 50 ms waits without a measurement, or adding window focus to a capture; adding
`windows.update({focused:true})` outside `focusTab`; focusing on untrusted actions; moving the MCP cursor on a
focus; rewriting `main` or force-pushing; and, from Steps 6–8, still binding: weakening a lease or lock invariant;
logging a URL, title, header value, body, locator text or the token; binding anything but `127.0.0.1` or widening
the token rule; making `BridgeClient` reconnect on a close code other than 4002; letting the MCP crash when
`connect()` fails; editing a test's expected text to match a changed error; regenerating
`sdk/test/fixtures/baseline-51de800.json`.

## Kickoff §7 row

| **S4 — `saveTo`** | phase doc S4 (0.4) | S4.1–S4.5 | 3 h | after S3; ∥ S5 or S6 | cross-package over real `ws` with a fake extension; no slice of the value in any answer or log; safety classes for (B) |

## decisions.md entries (#205, #207, #214, #216, #127)

### 2026-10-25 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls (#205)
**Decided:** 0.4's transport is (B): an extension-side store, filled in slices on the CDP leg so no single message
grows with the value, pulled in 1 MiB slices of UTF-8 bytes by new methods that carry the tab (tab methods in
`daemon/src/methods.ts`, lease-checked, no lock; class `evaluate` in `METHOD_CLASSES`); the store is dropped at disarm,
when JavaScript is turned off, when the tab closes and after a TTL; the extension never receives the path; a pull
after the store is lost (a worker restart) is refused cleanly and `.part` is removed. **Why:** 0.4's own rule — (A)
needs a measurement of ≥ 64 MiB crossing the whole path, and the Chrome leg cannot be measured without Chrome; the
host leg was measured on port 0: one frame crosses daemon → client whole up to 99 MiB, but above 100 MiB (`ws`'s
default `maxPayload`) the extension socket closes with 1009 and every actor's in-flight call fails `NOT_CONNECTED`
(Stage 0 F1, F2, `stage0-transport.txt`, re-run by the verifier); a pull without a tab skips the block list at the
gate and the daemon refuses untargeted unlisted methods anyway (F4, probed). **Instead of:** (A) one `evaluate`
carrying the whole value; tab-less pulls. **Revisit if:** a live measurement shows the Chrome leg carrying ≥ 64 MiB
and (A) is wanted for simplicity. **By:** Claude (contract-level — a new wire method and what the gate covers; open
for the user)

### 2026-10-25 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s (#207)
**Decided:** `BAD_PARAMS` for a relative path, an existing directory, a missing parent directory (nothing created),
an existing file without `overwrite: true`, and an existing `<path>.part` (opened `"wx"`); bytes are UTF-8 by
`TextEncoder` (a lone surrogate becomes U+FFFD; tests hash the page side the same way); a Node, Map, Set, function,
symbol or `undefined` value is `BAD_PARAMS` before anything is stored; a throw from `JSON.stringify` is `PAGE_ERROR`.
**Why:** `browser_download`'s directory mode, its `mkdir -p` and its `.part` clobbering each write somewhere other
than the given path, which the kickoff forbids for `saveTo` (Stage 0 F11, F12). **Instead of:** copying
`sdk/src/download.ts`'s rules as 0.4 proposed. **Revisit if:** a user needs parent directories created.
**By:** Claude (contract-level, open for the user)

### 2026-10-25 · S2: the MCP schema baseline, a failed focus's answer, and the focus sentence (#214)
**Decided:** (1) the tool-schema baseline (`mcp/test/s2-focus-first.test.ts`) is captured through a real `tools/list`
over the MCP SDK's in-memory transport (names + `inputSchema`, keys sorted, tool descriptions excluded) at `f45e3bf`;
it changes only by a dated, recorded re-baseline — the first is S4's `saveTo` parameter, ordered by #127; (2) when the
`focusTab` before a trusted action fails, the answer is what `browser_focus_tab` gives for that error (one line for
`DISARMED`/`DOMAIN_BLOCKED`, a failure report for an attach-set code), and the action is not sent; (3) the three
descriptions end "With trusted=true the tab is first brought to the front of its window (as browser_focus_tab does)
and is left there.", and `browser_focus_tab` no longer claims to be "the only tool that changes what the human sees".
**Why:** byte-for-byte what Claude Code receives; one rendering path; the old claim became false with #106.
**Instead of:** comparing zod objects; a "Focus before the trusted click failed:" prefix; leaving the false claim.
**Revisit if:** an MCP SDK upgrade changes emitted schemas with no tool change (a user-ruled re-baseline); MCPF-1 or
the user finds a focus failure's report misleading (it reads like the click's own failure, S2 verifier MINOR 2).

### 2026-10-25 · S3: the cap warning's edges as built (#216)
**Decided:** (1) "past the cap" needs > 800 listable elements, counted up to the 801st (a non-listable match after the
800th listable element on an exactly-800 page is not flagged — S3 verifier MAJOR 1, fixed); (2) a `{text}` match
inside the 800th listable element itself is flagged on a > 800 page, per 0.3's wording, pinned by a test, though the
snapshot lists the enclosing element; (3) `waitFor {locator}` carries no flag; (4) the MCP's six action tools add the
one line `Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list it.`;
(5) the SDK exports a new **type** `BridgeWarning` (values stay eight) — part of #206 for the user; (6) "absent at every
index" on 799/800 pages is a counter check plus sampled `locate` calls (the literal loop, ~2 min per page, was run
once by the verifier: 0 flagged).
**Why:** S3 report and verifier re-check (`…step10…-steps/S3.md`, `S3-verifier.md`).
**Instead of:** flagging on exactly-800 pages; a literal every-index loop in the suite.
**Revisit if:** the user prefers (2) unflagged (the snapshot does list the enclosing element).
**By:** Claude

### 2026-10-24 · Bulk data through `browser_evaluate` was a test device only; the MCP gets a `saveTo` path (#127)
**Decided:** rules Step 8 open items 24 and 25. #102 (SDK-7's MCP-leg cap raised to 600 000 characters)
and #103 (S6.3 on one held export) stay as the record of what was measured — both registered before the
legs they govern, and Run 12's earlier results stay recorded. Paging bulk data through
`browser_evaluate` in chunks (SDK-7's MCP leg: 53 calls of 8 000 characters, ≈ 418 000 characters
through a test actor's context) is a **test device only**, never a supported pattern: `docs/setup.md`
says so now, and the tool description says so in the next phase. **Work item (next phase):** the MCP
gains a way to move bulk data without the model's context — e.g. `browser_evaluate {saveTo: <path>}`
writing the value to a file and returning only path, size and sha256, as `browser_download` does; S6.3 is
then redone through it and the 53-chunk recipe (`assemble-mcp.ts`, `transcript.ts`) is retired.
**Why:** the user (2026-10-24), on item 24: "I am confused why MCP even would need to ge so many characters
in response. This should be used carefully or it will blow up agent's context. Let's dicuss before
rarifying. Please explain what is going on here"; on item 25: "I feel that this also needs discussion as
it is connected to the previous item"; after the explanation, chose "Record + test-only + saveTo". The
chunked leg proved the transport whole (53/53 chunks, hash = page's) but every slice entered a model's
context and a transcript on disk (the reason #105 deleted four actor transcripts).
**Instead of:** a plain ratification (leaves the pattern looking supported); no new tool (bulk data
SDK-only); withdrawing the MCP leg as a wrong check design.
**Revisit if:** `saveTo` lands — then S6.3's record moves to it.

## Stage 0 audit findings (`docs/plans/2026-10-24-step10-step8-follow-ups-steps/stage0-audit.md`) F1 F2 F4 F6 F8 F11 F12 F13 F21 F25 and §3, verifier V6 V8

## 3. 0.4's transport — measured (host leg) and what cannot be measured here

Command: `npx vitest run mcp/test/zz-stage0-transport.test.ts` (2026-10-24T19:35:39Z, 5 passed). One `evaluate`
whose fake reply is the envelope the extension builds for a string (`value` whole, `description` capped at
20 000 + the truncation line). Times include the fake's `JSON.stringify` and the client's `sha256`; memory is the
one process holding all three peers.

| Value | UTF-8 frame | Whole at the client | Time | Peak RSS Δ | Socket |
|---|---|---|---|---|---|
| 1 Mi × `a` | 1.02 MiB | yes | 25 ms | 3 MiB | — |
| 16 Mi × `a` | 16.02 MiB | yes | 338 ms | 144 MiB | — |
| 64 Mi × `a` | 64.02 MiB | yes | 1362 ms | 498 MiB | — |
| 99 Mi × `a` | 99.02 MiB | yes | 2095 ms | 534 MiB | — |
| 101 Mi × `a` | 101.02 MiB | **no — `NOT_CONNECTED: extension disconnected`** | 864 ms | 303 MiB | extension socket closed **1009** |
| 128 Mi × `a` | 128.02 MiB | **no** (same) | 1011 ms | 381 MiB | 1009 |
| 40 Mi × `é` | 80.04 MiB | yes | 1737 ms | 271 MiB | — |
| 64 Mi × `é` | 128.04 MiB | **no** (same) | 750 ms | 256 MiB | 1009 |
| 32 Mi × `€` | 96.06 MiB | yes | 2094 ms | 292 MiB | — |
| 20 Mi × U+0001 | 120.11 MiB (`\u0001` = 6 bytes) | **no** (same) | 1066 ms | — | 1009 |

Limit found in code: no `maxPayload` is passed anywhere (`grep -rn maxPayload daemon/src sdk/src extension/src
shared/src` → nothing); `ws` 8.21.0 defaults it to `100 * 1024 * 1024` on the server and on the client
(`node_modules/ws/lib/websocket-server.js:74`, `websocket.js:675`; probe: `default maxPayload=104857600`). The
daemon's server enforces it on the extension's socket, and a frame over it **closes that socket (1009) — every
actor's in-flight call fails `NOT_CONNECTED`**. The client side has the same default.

**Not measurable without Chrome (the Chrome leg):** (1) the size of a `chrome.debugger.sendCommand` reply — a string
primitive comes back by value in `Runtime.evaluate`'s own reply (`extension/src/debugger.ts:179-186`,
`returnByValue:false` does not box primitives), so the whole value is one CDP message; (2) `GatedRouter.handle`'s
`JSON.stringify` of it in the worker (`extension/src/router.ts`); (3) `chrome.runtime.sendMessage({target:
"offscreen", type: "send", data: reply})` (`sw.ts:297`) — a failure there only logs `[bridge] reply relay failed:`
and the call then times out; (4) the browser WebSocket send in `offscreen.ts`. Nothing in the repo states a Chrome
message limit. *Unverified outside knowledge, not a measured fact:* Chrome is commonly reported to cap extension
messages at 64 MiB; if so, (A)'s threshold could never be met through `runtime.sendMessage`.

**Recommendation (contract-level, for the user): (B).** 0.4's own rule says (A) only if a ≥ 64 MiB string is
*measured* crossing the whole path. Stage 0 cannot measure the Chrome leg, S4's lane has no live grant, and the
host leg already shows that an oversized single frame takes the extension socket down for every actor. So the rule
applies mechanically: (B). Details F1, F2, F4.

**F1 · plan-side (0.4) · (A)'s premise.** Measured (§3): the host leg carries one result frame whole up to 99 MiB
and closes the extension socket with 1009 above 100 MiB; "a string value of at least 64 MiB" has no unit — 64 Mi
characters of `é` is a 128 MiB frame and fails, 20 Mi control characters is 120 MiB and fails. The Chrome leg cannot
be measured here, and S4 has no live grant to measure it. Amendment:
"*Amended 2026-10-24 (Stage 0 F1): Stage 0 measured the host leg on port 0 — one result frame crosses daemon →
client whole up to 99 MiB (UTF-8 bytes) and above 100 MiB (`ws`'s default `maxPayload`, set nowhere in the repo)
the daemon closes the extension socket (1009), failing every actor's call `NOT_CONNECTED`; the Chrome leg
(`chrome.debugger` → worker → `runtime.sendMessage` → offscreen → WebSocket) is not measurable without Chrome. No
measurement shows ≥ 64 MiB crossing the whole path, so by this decision's own rule the transport is (B). (A) is not
built. The threshold, where it is cited, is in UTF-8 bytes of the frame, not characters.*"

**F2 · code-side (S4; existing behaviour) · one oversized reply takes the extension down for everyone.** Today a
`browser_evaluate` / `Tab.evaluate` whose string value makes a reply frame > 100 MiB (e.g. 101 Mi ASCII
characters, or ~17 Mi control characters) would, if the Chrome leg passes it, close the extension socket and fail
every actor's in-flight call (measured on the host leg, §3). Not a safety breach; an availability one. Stage item for
S4: under (B) no frame grows with the value — the evaluate-to-store path slices **also on the CDP leg** (a holder
object's `objectId` and `Runtime.callFunctionOn` slices of ≤ 1 MiB within one debugger session, never one CDP reply
of the whole value), and S4's lane names `extension/src/debugger.ts`. A size refusal for plain `evaluate` would be a
new refusal (a contract change): record it under Open decisions, do not build it in Step 10 unless ruled.

**F4 · plan-side (0.4 (B), S4.3) · contract-level · a tab-less pull skips the block list; the daemon refuses it
anyway.** Probe `0.4B-class`: `CallSafety("evaluate", {id})` without `tabId` → `allow` on a blocked tab (the target
is `gone`, allowed at receipt — `safety.ts` step 2b), with `tabId` → `DOMAIN_BLOCKED`; and the daemon refuses an
unlisted method without `tab` (`daemon/src/methods.ts` `classify` → `untargeted` → `BAD_PARAMS "tab is
required"`). Amendment: "*Amended 2026-10-24 (Stage 0 F4): (B)'s new methods carry the tab (`tab` on the wire, a
`tabId` at the extension): they enter `daemon/src/methods.ts` `TAB_METHODS` (lease-checked, not the lock) and
`METHOD_CLASSES` as `"evaluate"`, so the kill switch, the JavaScript switch and the block list refuse each pull and
only the tab's holder can pull. The store is dropped at disarm, on JavaScript off, on the tab's close, and after a
TTL. The extension never receives the path.*" (ESCALATION: what the gate covers — listed for the user.)

**F6 · plan-side (S4.3 vs 0.12/S4b) · confirmed contradiction.** S4.3 pins "JavaScript off → `DISARMED {scope:
"evaluate"}`" for (B)'s methods; S4b (after S4) moves that refusal to `JS_DISABLED`, and (B)'s methods (class
`"evaluate"`) inherit the change through `safetyDecision`. Amendment: "*Amended 2026-10-24 (Stage 0 F6): S4.3's
JavaScript-off clause reads: 'each new method's refusal equals `evaluate`'s own refusal for the same state (at S4:
`DISARMED {scope:"evaluate"}`; after S4b: `JS_DISABLED`)', asserted by equality, so S4b changes no S4 test text.
S4b.2 adds: (B)'s methods answer `JS_DISABLED` with JavaScript off.*"

**F8 · doc-side (CLAUDE.md, Step 9 as-built S2b, S2b.md, kickoff §4) · "60 log sites" is 54.** 15 + 33 + 0 + 6 = 54;
the allowlist had 54 entries at `59388ed` (S2b), `6fef83c` and `55ee4de` (`git show <c>:extension/test/log-allowlist.ts
| grep -c '{ file: "'`). The scan itself holds. Mechanical: the session agent adds dated notes ("*Corrected
2026-10-24 (Step 10 Stage 0 F8): was '60 log sites', because the allowlist has 54 entries (15 + 33 + 0 + 6) since
S2b.*"); S4.5 counts from 54.

**F11 · plan-side (0.4 file rules) · `browser_download`'s rules are not a file-path rule set.** `sdk/src/download.ts`:
a directory (existing or a trailing separator) means "save inside it" (`:42`); parents are created (`mkdir …
{recursive: true}`, `:68`); `<path>.part` is opened `"w"` (`:71`), clobbering an existing file of that name; refusals
are plain `Error`s (`:41`, `:66`). Stricter, for `saveTo` (contract-level — "writing anywhere but the given path"):
"*Amended 2026-10-24 (Stage 0 F11): `saveTo` refuses with `BAD_PARAMS` a relative path, an existing directory, a
missing parent directory (nothing is created), an existing file without `overwrite: true`, and an existing
`<path>.part` (opened exclusively, `"wx"`); a refusal leaves no file.*"

**F12 · plan-side (0.4) · (A)/(B)'s "non-string through `JSON.stringify` in the page".** `JSON.stringify` turns a
DOM node, a `Map` and a `Set` into `"{}"` (saved silently, not refused), throws on a cycle or a BigInt, and returns
`undefined` for a function. A lone surrogate is written as U+FFFD: measured in Node, `"a\ud800b"` → UTF-8 `61efbfbd62`
by `Buffer` and by `TextEncoder` alike, while it round-trips intact through `JSON.stringify`/`parse` on the wire.
Amendment: "*Amended 2026-10-24 (Stage 0 F12): the bytes are the value's UTF-8 as `TextEncoder` makes it (a lone
surrogate becomes U+FFFD), and tests hash the page side the same way; a Node, Map, Set, function, symbol or
`undefined` value is `BAD_PARAMS` before anything is stored; a throw from `JSON.stringify` is `PAGE_ERROR`.*"

**F13 · plan-side (S4.1) · the 300-character bound depends on the test path.** The answer is `Saved <path>` plus
`<bytes> bytes · <kind> · sha256 <64 hex>` (~95 characters), so any path over ~200 characters fails it. Stricter:
"*Amended 2026-10-24 (Stage 0 F13): S4.1's bound is `answer.length ≤ path.length + 120`; the value is random (crypto)
so that no 16-character run can occur in the path or the hash by chance; the SDK's return value and every captured
log line are checked as well as the MCP answer.*"

**F21 · plan-side (0.4 SDK) · the client mirrors `Tab`.** `BridgeClient` mirrors the cursor `Tab`'s methods (but
`close`, #90): `evaluateToFile` belongs on both (additive; the eight exported values unchanged).

**F25** 0.4 names the serialiser's "100 items, depth 6" but not `maxString: 5000` (`serialize.ts:19`), which also
truncates nested strings.


**V6 · NIT · F13.** The bound `answer.length ≤ path.length + 120` is looser than today's "under 300 characters" for any
path longer than 180 characters. **Fix:** use `≤ min(300, path.length + 120)`, or fix the test path at ≤ 180
characters.
**V8 · NIT · a blind spot not in audit §8.** Under (B), the store lives in the service worker's memory. A worker
restart between the store's fill and its last pull loses it (Chrome can stop the worker, though the 25 s keepalive
alarm makes this rare). **Fix:** an S4 test where a pull after the store is lost gets a clean refusal, and `.part` is
removed.

## From common.md (verbatim): ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR

**ESCALATION list** (the `step-agent` default, extended). A step agent escalates instead of deciding on:
- anything touching a pre-registered rule or a decision of the phase doc marked **(user)**;
- an effect outside its lane — another package, a later stage, the wire protocol, the manifest;
- any change to what the safety gate covers: a method exempted from or added to a class, a new extension method
  without a class, a code chosen for a refusal, what `listTabs`, an event or a log reveals;
- any path by which a client, the daemon or a page could change the safety state or reach the extension's own pages;
- the wire shape of a new field or method (`pastSnapshotCap`, `saveTo`'s transport), codes, event names or params,
  the SDK's exported surface (eight values) or any Step 8 SDK signature, MCP tool names or input schemas;
- returning any part of a `saveTo` value to the model, or writing anywhere but the given absolute path;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` null-or-undefined,
  `{__bridgeError}` returned not thrown, the IIFE content script, `toSerializableArgs`, no top-level `await` in the
  worker, listeners at the top level of `sw.ts`, `ws` external, the `hasLayout` gate, the one walk in `a11y.ts`,
  `focusTab` as the only window focus, `activateForCapture`'s 1000 ms and 50 ms waits, never logging URLs, titles,
  header values, bodies, values or the token);
- any integrity-floor item (§6) or `long-run` §4 stop — G10-0…G10-3, a reload exit other than 0 after one re-run, a
  Chrome restart or kill, the token, the bind, a safety-state restore that fails, a push or a tag, `main` rewritten;
- a STOP line met by a live runner (it returns; you decide or escalate — never "helper bug, safe to continue");
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger met;
- a port-9234 holder that is not the daemon, or an orphan `node` process it did not start;
- a test count that drops without a documented move or removal;
- a permission or classifier denial; 2 failed fix rounds; a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` gotchas are the standing list — these are the ones Step 10
touches):
- **LESSON (Run 13): a level-2 live runner RETURNS on every STOP line.** Run 13's runner resolved four stops itself
  (a restore failure, a guard, the pinning gate, a throw without a restore) and the live verifier failed the run on
  process (#192, #193). A restore failure, a guard printing STOP, a human gate (pinning, a grant) and any throw after
  the first state change all mean: restore if the state was touched, write the ledger, return. Never fix a helper
  past a stop and carry on, however obvious the bug. The wave sheet and the runner brief state this rule once, in the
  same words (Run 13's sheet said "from block 4 on" and its brief "after the first state change").
- **UI Automation facts measured in Run 13 (Chrome 156, Windows 11):** the toolbar extension button and the
  Extensions (puzzle) button expose **no UIA Invoke pattern** — pressing or pinning needs a real mouse click at a
  `FromPoint`-verified point inside your own window, and pinning that way waits for #192's ruling; the extension
  action's title has a **second line** under it ("Has access to this site") — compare only the first line; the
  service worker's DevTools window is titled `DevTools`; `Alt+Shift+K` is assigned as `_execute_action` and does not
  change the Windows input layout; an options page in a background or covered window did not show a re-arm until
  brought to the front (SAFE-3, cause undetermined).
- **Expected text is tied to the product's constants** (`recipes/test/s9-rules.test.ts` does it for §4.20); Run 13
  still wrote two rows wrong (the daemon logs `safety state:` before `extension resync` on a reload, by design; the
  DevTools title) — re-read the code for ordering and Chrome's own strings before committing a row (#195).
- **Re-measurements are new rows.** §4.20's rows and Run 13's results are never edited (dated notes only); a bound
  is never chosen after seeing the measurement (R14-4b's banner lifetime is a record).
- **Port 8082 is bound by `SystemSettings.exe` on this machine**; the redirect server uses 8083 (#197), and it must
  be threaded (Run 13's single-threaded server is the probable cause of SAFE-5c's `TIMEOUT`).
- **node may be missing from the Bash tool's PATH.** Put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1, npm 11.6.2, checked
  2026-10-24). Python is miniconda, `$HOME\miniconda3\python.exe`, for the fixtures.
- **Listeners at the top level of `sw.ts`**; no top-level `await`; a new extension method enters the safety table
  (`GatedRouter.on` throws otherwise) and the daemon's method table (`daemon/src/methods.ts`).
- **`storage.session` is emptied by a reload; `storage.local` is not.** The safety state lives in `storage.local`,
  so a reload or a Chrome restart never re-arms what the human disarmed — RET-1 reads it back after the relaunch.
- **The reload's hello comes up to 2 s later** (the session marker waits for `onStartup`); the reload script still
  proves the reload.
- **The driver is not a bridge client**: launched with `--strict-mcp-config` and an empty config; check with a
  process listing that no `mcp/dist/index.js` descends from it.
- **Headless Claude sessions are the MCP actors** (`claude -p --model sonnet --allowedTools
  mcp__chrome-agent-bridge "<prompt>"`), read verbatim from the transcript, never from a paraphrase. On Windows, send
  long prompts with `node --import tsx …`, not `npx` (`cmd.exe` refuses > 8191 chars). An MCP actor's claim is a lease
  that dies only with its connection (end the actor before another client needs that tab).
- **An `ok` is not evidence**: trusted CDP input into a background tab answers `ok` and does nothing (BG-1/BG-2,
  FE-1…3). Every row reads the page's own reporter or the refusal's code — MCPF-1 above all.
- **A capture switches the human's view ~1.5 s**; a failure report's screenshot does too (REP-0). Rows that could
  attach a non-fixture tab need REP-0's probe first (decisions.md · 2026-10-23 · A probe of the failure-report
  screenshot runs before any row that could attach a non-fixture tab (#97)).
- **UI automation of Chrome** (`recipes/reload-extension.ps1` is the model): never match by name alone; UIA
  `TabItem` is not a tab count; `chrome.exe --new-window chrome://…` opens a New Tab page — type the URL into the
  omnibox of your own window; a window handle does not survive a Chrome restart.
- **Windows PowerShell 5.1 traps**: `—` mangled unless UTF-8 is set; the alias `R`; embedded `"` stripped from
  native arguments (send JSON from Git Bash); `>` writes UTF-16LE in a `-NoProfile` shell.
- **Recipes run with `tsx`**, and `String(fn)` page code breaks under tsx (`__name`): ship page code as literal
  strings; recipes typecheck with their own `tsconfig*.json`.
- **Kill only identified PIDs** (`Test-SafeToKill`, `docs/e2e-test-plan.md` §1 item 8); RET-1's Chrome kill is G10-2.
- **`*.log` is gitignored**: attach logs as `.txt`; grep them for `://`, the token and the block-list patterns by
  count, never printing them.
- **A subagent's report is a claim**: verify by diff before accepting; re-run each "finding".
- **The repo is public**: evidence shows only fixture pages — never my tabs, a real site, a pattern I typed into my
  real block list, a `saveTo` value from a real page, or a student's data.
## SPEC-DISCREPANCY PROTOCOL (kickoff §5, lines 352–373, verbatim)

```
SPEC-DISCREPANCY PROTOCOL. Intent beats procedure. When the code you are asked to write, the
phase doc, the design spec and CLAUDE.md's measured facts disagree, trace up the chain —
phase doc → design spec → CLAUDE.md runtime gotchas — and say so in your report; the deepest
layer that is internally consistent wins. Stakes pick who resolves it: mechanical (a stale
line number, a wrong count, a renamed file) → the fixer documents it in the report and the
step agent amends the phase doc in place with a dated note; design-local (a shape the plan
left open, a default) → the session agent records a decision in docs/decisions.md with the
rejected option; contract-level (the wire protocol, event names and params, codes, what is
gated and what a refusal reveals, how the safety state is changed and by whom, what the human
sees, the token lookup, the bind, the SDK's public surface and signatures, MCP tool names and
schemas, what a saveTo answer may contain) → long-run §3: a pre-stated rule applies
mechanically, else the conservative choice (security at least as strict; every existing tool
and test behaves identically while armed with JavaScript on and an empty block list; undoable),
recorded under Open decisions for the user. Code and spec never diverge silently: whoever
changes behaviour amends the governing doc in place with "*Superseded YYYY-MM-DD: was X,
because Y.*". Verifiers report findings with the command and its output; they never rewrite
the spec or the plan.
```
**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP rule
that says escalate; a human gate (G10-0 #192 ruled before Stage 0; G10-1 creating the step8 tag
and any push; G10-2 killing and relaunching the user's real Chrome for RET-1; G10-3 any live work
beyond fixture pages in the user's profile — the real Blackboard course, a real bb-login run, any
real site, the user's credentials; pinning the toolbar button by mouse click unless #192's ruling
allows it — else ask once); an extension reload whose script (recipes/reload-extension.ps1) exits
non-zero after one re-run; any other Chrome restart (needs a fresh grant); anything destructive or
outward-facing (push, tag, publish, history rewrite, rewriting main, deleting outside the repo,
touching the user's Chrome profile data or the user's own tabs and windows, committing or logging
the token); any loosening of the security boundary (the 127.0.0.1 bind, the token gate, "never log
URLs, titles, header values or bodies"); permission or classifier denials. (2) Phase-specific: a
router method reachable without the safety gate; any way for a client, the daemon or a page to
change the safety state or reach the extension's own pages; a live wave (S1, S7) that leaves the
safety state different from the one it found — every wave records armed, JavaScript and the sha256
of the block-list text at its start, restores them and reads them back equal, never printing the
list; a block-list pattern, URL, title, evaluated value, saveTo path or the token in any log or
committed evidence; a saveTo answer carrying any part of the value; a live runner that continued
past a STOP line instead of returning (#193); a drop in the test count without a documented move
or removal; evidence showing a real site or the user's own tabs; killing a process that
Test-SafeToKill did not call safe. Standing rule: never resolve a decision in the direction that
flatters a result already seen; pass rules are written before the measurement; a failed check is
reported, never re-tuned.
```
