# S3 builder report — the SDK's typed Tab, cursor, locators and policy

Builder: Claude Opus 5.5, 2026-10-23. Lane: `sdk/src/`, `sdk/test/` only. Nothing committed. `sdk/package.json` untouched (no export-map entry needed). `sdk/src/spawn.ts` unchanged (S3.5 outcome 1).

## Built

| File | What |
|---|---|
| `sdk/src/locator.ts` (new) | `Target = string \| Locator`; `normalizeTarget(target)` → `{ref}` \| `{locator}`, throws the shared `BridgeError(BAD_PARAMS)` locally; `requireLocator(value, what)` for `locate`/`waitFor`. |
| `sdk/src/policy.ts` (new) | `TrustedInputPolicy = "none" \| "focusFirst"`, `TRUSTED_INPUT_POLICY = "focusFirst"`; comment cites #89 outcome (B), BG-1/BG-2 (Run 8 FAIL), BGF-1/BGF-2 (Run 10 FAIL), FE-0 PASS, FE-PC PASS, FE-1 0/3, FE-2 2/3, FE-3 0/3, FE-4 PASS 9/9, FE-5 control 0/12 (not void) → "no kind passes" → (B), and #78 item 4. |
| `sdk/src/tab.ts` (new) | `class Tab` (phase doc 0.4): the stale guard, every method, the focus-first rule. Depends on a small `TabHost {call, generation()}` interface, so no runtime import of `client.ts`. Policy is the constructor's 4th argument (default the constant); not exported from `index.ts`. Named constants `WAIT_DEFAULT_MS` 10 000, `WAIT_CALL_SLACK_MS` 5 000, `EVALUATE_DEFAULT_MS` 10 000, `EVALUATE_CALL_SLACK_MS` 5 000. |
| `sdk/src/client.ts` | Connection `generation` and `cursor`. Both are changed synchronously at the top of `handleClose`'s 4002 branch, before `rejectAll` and the reconnect knock. Also `newTab`, `claim`, `tab`, `tabs` (with the `TabInfo` type) and the 20 mirrored methods. A private `adopt()` captures the generation before the minting call. `welcome`, `extensionConnected`, `on`, `status`, `call`, `connect` and `close` are unchanged. |
| `sdk/src/index.ts` | Exports the values `Tab, connect, BridgeClient, BridgeError, ErrorCodes, downloadToFile, formatSnapshot, formatNetwork` plus types only. |
| `sdk/test/tab.test.ts` (new) | Exact frames for every Tab method (31 cases), results, local bad-target errors, the policy both ways, the cursor, `tabs()` `current` mapping, the 20 mirrored methods (19 in a table plus `download`), the 4002 reconnect (4 tests). |
| `sdk/test/locator.test.ts` (new) | `normalizeTarget` accepted shapes and every rejection; `requireLocator`. |
| `sdk/test/errors.test.ts` (new) | `instanceof` the exported `BridgeError` for connect NOT_CONNECTED, VERSION, an unwrapped daemon error frame, NO_CURSOR, BAD_PARAMS, TAB_UNKNOWN. |
| `sdk/test/spawn-inherit.test.ts` (new) | S3.5: check (A) and positive control (B). |
| `sdk/test/index.test.ts` | **Designed change of a pinned list:** the exact-values test now lists the eight values of S3.4 / #75 (was Step 6's five). The "one class" test is kept, and a test was added that the formatters are the `./format` subpath's own functions. |

## Wire call per Tab method

`tab` is the handle. Keys whose value is `undefined` are never sent. "call timeout" is the request's `timeoutMs`. Every method runs the stale guard first: from an older generation it throws `TAB_UNKNOWN` "tab <h> is from before the bridge daemon restarted (close 4002) — call tabs() or claim() for a new Tab", and no call is sent.

| Method | Frame(s) | Call timeout | Returns |
|---|---|---|---|
| `navigate(url)` | `navigate {tab, url}` | — | void |
| `back()` / `forward()` | `back {tab}` / `forward {tab}` | — | void |
| `snapshot()` | `snapshot {tab}` | — | `SnapshotResult` |
| `screenshot({fullPage?, mode?, path?})` | `screenshot {tab, fullPage?, mode?}` (never `path`) | — | `Buffer` (decoded PNG), or with `path` writes it (mkdir -p) and returns the path |
| `click(target, {trusted?})` | `click {tab, ref\|locator, trusted?}`; trusted + focusFirst: `focusTab {tab}` first, awaited | — | void |
| `type(target, text, {submit?, trusted?})` | `type {tab, ref\|locator, text, submit?, trusted?}`; same focus rule | — | void |
| `pressKey(key, {trusted?})` | `pressKey {tab, key, trusted?}`; same focus rule | — | void |
| `hover(target)` | `hover {tab, ref\|locator}` | — | void |
| `scroll({target?, direction?})` | `scroll {tab, ref\|locator?, direction?}` | — | void |
| `selectOption(target, values)` | `selectOption {tab, ref\|locator, values}` | — | void |
| `locate(locator)` | `locate {tab, locator}` (a non-locator → BAD_PARAMS locally) | — | `LocateResult` |
| `waitFor({locator, state?, timeoutMs?})` | `waitFor {tab, locator, state?, timeoutMs?}` | `(timeoutMs ?? 10000) + 5000` | void |
| `waitFor({seconds})` | `waitFor {tab, seconds}` | `seconds*1000 + 5000` | void |
| `waitFor({text})` / `({networkIdle, idleMs?})` | `waitFor {tab, text}` / `{tab, networkIdle, idleMs?}` | `15000` | void |
| `evaluate(expr, {timeoutMs?})` | `evaluate {tab, expression, timeoutMs: t}`, `t = timeoutMs ?? 10000` | `t + 5000` | `envelope.value as T` |
| `evaluateRef(expr)` | `evaluate {tab, expression, timeoutMs: 10000, asRef: true}` | `15000` | `envelope.ref`; none → BAD_PARAMS `not an Element (kind "<kind>")` |
| `network(opts)` | `networkRequests {tab, filter?, types?, failedOnly?, limit?, includeHeaders?}` | — | `result.entries` |
| `network({id})` | `networkRequests {id}` (no `tab`) | — | `result.entries` |
| `networkClear()` | `networkClear {tab}` | — | `cleared` |
| `download(url, path, {overwrite?, timeoutMs?})` | `downloadToFile`: `downloadStart {url, timeoutMs}` (+5 s), `downloadChunk {id, offset, length}`, `downloadEnd {id}` — no `tab` | `timeoutMs + 5000` on start | `DownloadOutcome` |
| `focus()` | `focusTab {tab}` | — | void |
| `close()` | `closeTab {tab}` | — | void |
| `release()` | `tabs.release {tab}` | — | void |

Client: `newTab(url?, {active?})` → `newTab {url?, active?}`. `claim("T3")` → `tabs.claim {tab:"T3"}`. `claim({active:true})` → `tabs.claim {active:true}`. Both set the cursor. `tabs()` → `listTabs` with no params → `[{handle, title, url, owner?, current}]`.

## Results (pasted)

sdk before (at start, before any edit): `npx vitest run sdk/`
```
 Test Files  14 passed (14)
      Tests  197 passed (197)
```
sdk after:
```
 Test Files  18 passed (18)
      Tests  285 passed (285)
```
`npm run typecheck` (all five projects, MCP included, since it imports the SDK):
```
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit 0
```
`npm run build`:
```
built daemon → dist/index.js
built mcp → dist/index.js
built extension → dist/
build exit 0
```
`npm test` (full suite, in this shared tree, so it includes S2's in-flight `extension/` + `daemon/` edits):
```
 Test Files  70 passed (70)
      Tests  1225 passed (1225)
```
That figure mixes S2's work with mine. The clean-worktree figure is the verifier's.

**Each test fails without its change.** I checked this by mutation, restoring each file after, and confirmed the restore with `diff`. Results on tab + errors tests (78):

| Mutation | Result |
|---|---|
| M1: no generation bump | 4 failed |
| M2: no cursor clear | 2 failed |
| M3: bump on the reconnect welcome instead of synchronously | 2 failed |
| M4: `adopt` without the generation check | 1 failed |
| M5: policy ignored (never focus) | 5 failed |
| M6: always focus on trusted | 1 failed |
| M7: `tabs()` also reads `active` | 1 failed |
| M8: `waitFor` without call timeout | 5 failed |
| M9: stale guard off | 3 failed |
| `spawn.ts` `stdio: "inherit"` | S3.5 check (A) failed (no EOF in 2 s), control still held |

For `locator.ts`, `policy.ts` and `index.ts`, the tests were written with the code in the same step, not before it. `tab.test.ts` was run before `tab.ts` existed and failed to load.

## S3.5 — measured, and the outcome

Harness: the child is `process.execPath child.mjs`, with no tsx layer. It imports `file:///…/sdk/src/spawn.ts`; Node v25.2.1's native type stripping works (checked first: `typeof spawnDaemon === "function"`). The child's stdio is `["ignore","pipe","inherit"]`. The stand-in is a temp `.mjs` that writes its pid and idles: it never binds a port and is not the daemon. Port 0, token `s35-dummy-token`, `BRIDGE_TOKEN` deleted from the child's env. The stand-in is killed by its recorded pid and polled until gone. After the runs, a process scan found 0 leftover stand-ins.

Three runs, identical:
```
[S3.5] inherit: {"eofAfterExitMs":null,"standInAlive":true,"eofAfterKill":true,"stdout":"spawned\n"}
[S3.5] default: {"eofAfterExitMs":-3,"standInAlive":true,"eofAfterKill":null,"stdout":"spawned\n"}
```
- **(A), the check:** EOF 3 ms *before* the child's `exit` event (−3 ms), stand-in alive → PASS.
- **(B), the positive control:** no EOF within 2 s of exit while the stand-in lived; EOF came after it was killed → holds.
- **Pre-written outcome (1) applies:** no change to `spawn.ts`. "`spawnDaemon` inherits no pipe (node parent); the MUX-6 cause remains unmeasured." The npx parent case was **not run**.
- Caveat: when EOF precedes the pidfile read, the "alive" check runs a few ms after EOF rather than at it. Nothing kills the stand-in in between, so the reading holds.

## esbuild external imports of the main entry

```
npx esbuild sdk/src/index.ts --bundle --platform=node --format=esm --packages=external --outfile=<scratch>/sdk-index.mjs --metafile=<scratch>/sdk-meta.json
  ...sdk-index.mjs  44.5kb
@bridge/shared
node:child_process
node:crypto
node:fs
node:fs/promises
node:path
node:url
ws
```
These are only `@bridge/shared`, `node:*` and `ws`, so no new runtime dependency.

## Deviations from the phase doc / brief

1. **`listTabs` answers `{tabs: [...]}`, not a bare array** (as the MCP reads it, `registry.ts:137`). `tabs()` reads `result.tabs`. A missing `title`/`url` becomes `""`.
2. **`adopt()` guard (beyond the brief).** `newTab`/`claim` capture the generation before sending. If a 4002 close lands between the answer and the continuation (one `ws` read can carry both, as in the CLAUDE.md gotcha), they throw `TAB_UNKNOWN` and leave the cursor alone, so a dead handle never becomes the cursor. An answer without a string `tab` → `INTERNAL`. Tested: "a claim whose answer and the 4002 close arrive in one read".
3. **`requireLocator` helper; `waitFor`'s locator arm is validated locally** (BAD_PARAMS, no call), as `locate` is.
4. **`trusted: false` is sent as `trusted: false`.** Only `undefined` is dropped, which matches "only keys whose value is defined".
5. **`Tab`'s constructor is TypeScript-public**, because the class is exported. It is documented as internal. The policy is its 4th argument, so it is reachable by anyone who builds a `Tab` by hand, but it is not an `index.ts` export.
6. **The stale guard also covers `network({id})` and `download`** (both send no `tab`), following "every method first runs the stale guard".
7. **Mirrored methods are `async`**, so a missing cursor rejects (NO_CURSOR) rather than throwing synchronously. `client.tab()` itself throws synchronously.
8. The `NO_CURSOR` text is "No tab cursor: call newTab() or claim() first".
9. **Extra type exports** from `index.ts`: `TabInfo`, `Target`, `ScreenshotOptions`, `TrustedOption`, `NetworkListOptions`, `DownloadOptions`, `EvalEnvelope`, `LocateResult`, `Locator`, `LocatorName`, `NetworkEntry`, `ScreenshotMode`, `SnapshotElement`, `SnapshotResult`, `WaitForParams`, `FormatNetworkOptions`, `FormattableResult`. These are types only.
10. **Line endings.** `client.ts`'s working copy went from CRLF to LF; it was rewritten by a script. The index copy is LF and `core.autocrlf=true`, and `git diff --stat` shows only the real +172 lines.

## Proposed decisions

**2026-10-23 · `BridgeClient.close()` keeps closing the client; the cursor tab is closed with `client.tab().close()`**
- Decided: phase doc 0.4 says "every Tab method mirrored on the client", but `close` is the one mirrored method left out; `BridgeClient.close()` keeps its Step 6 meaning.
- Why: Step 6 shipped `close()` as "close the client", and the existing tests and the MCP (`link.stop()`) rely on it. Mirroring would silently turn a client shutdown into a tab close.
- Instead of: (a) mirroring `close` and renaming the client's to `disconnect()`, which breaks the Step 6 surface and the MCP; (b) a `closeTab()` mirror on the client, which adds surface the phase doc does not name.
- Revisit if: the user wants a one-call "close the cursor tab" on the client. Then add `closeTab()`, never repurpose `close()`.

**2026-10-23 · Releasing or closing the cursor tab does not clear the cursor (for user review)**
- Decided: as built, per the literal 0.4 rule. Only `newTab`/`claim` set the cursor and only a 4002 reconnect clears it. `release()`, `close()` and a `tabGone` event leave it, and the next cursor call reaches the daemon and answers its own error (`TAB_GONE`, or `TAB_HELD` if someone else took it).
- Why: the phase doc names only those transitions. The daemon's error is truthful and names the tab.
- Instead of: clearing on `release()`/`close()`/`tabGone`, which would give a local `NO_CURSOR` with the "call newTab() or claim() first" hint (arguably friendlier, not built).
- Revisit if: the user prefers the friendlier local error, or S5's MCP cursor behaves differently and the two should agree.

**2026-10-23 · A tab-minting call that races a 4002 close yields `TAB_UNKNOWN`, not a stale Tab**
- Decided: see deviation 2.
- Why: the generation must be the one in force when the handle was minted. Otherwise a handle from the replaced daemon becomes a "fresh" Tab and cursor, which is exactly the stage0-audit F2 hazard (a stale `T3` resolving to another tab).
- Instead of: returning the Tab with the old generation (it would void itself on first use, but would still become the cursor), or ignoring the race.
- Revisit if: the daemon gains an epoch in handles, making the local guard redundant.

## Unfinished / not run

- S3.5 with an **npx parent** was not run (the brief's "if you also run it"). Only the node parent was measured.
- Nothing ran against a real daemon or Chrome (by rule). `locate` and `evaluate {asRef}` depend on S2's extension/daemon work, which is in flight in this tree. The SDK tests use fakes only.
- The full `npm test` figure (1225 / 70) includes S2's uncommitted edits. A clean-worktree run is the verifier's.
- `docs/decisions.md`'s #89 entry already exists. S3.2's "the session agent writes it" needs nothing from S3.
