# D5b — The MCP connects without waiting for the extension

Step agent report, 2026-10-22. Model: Claude Opus 5.5 at every level (builder, verifier).
Decision: decisions.md · 2026-10-22 · The MCP connects without waiting for the extension, so
Chrome closed reads as today (#27).

## 1. Verdict

**DONE.** The verifier's verdict is PASS-with-notes. It has 2 MINOR and 4 NIT findings, none of which blocks.

## 2. Outputs

- **The option:** `ConnectOptions.requireExtension?: boolean` in `sdk/src/connect.ts`.
  - **true (the default):** unchanged. `connect()` waits up to `waitForExtensionMs` (default 15 000) for the extension, then closes the client and rejects with `NOT_CONNECTED`. Scripts and D4's tests keep this.
  - **false:** `connect()` resolves as soon as the daemon welcomes the client, whatever the extension's state. It registers no wait timer and ignores `waitForExtensionMs`. The client stays open, and `client.extensionConnected` follows the daemon's `extensionStatus` events. While the extension is down, calls fail with the daemon's own `NOT_CONNECTED`.
  - The SDK's exported values are unchanged (connect, BridgeClient, BridgeError, ErrorCodes, downloadToFile). `ConnectOptions` was already a type export.
- **The MCP:**
  - `mcp/src/config.ts` gains `connectOptions(pid = process.pid)`, which returns `{ name: actorName(pid), requireExtension: false }`.
  - `mcp/src/index.ts` calls `connect(connectOptions())`.
  - In `mcp/src/link.ts` only the header comment changed. Its logic was already right: a `NOT_CONNECTED` reply makes the link check the client with `client.connect()`, which resolves at once on an open client, so the client stays.
- **The stale comment** at `sdk/src/connect.ts:48` (the D5 finding) now describes `resolvePort` itself.
- **`browser_status` with the extension down:** the verifier's own cross-package run printed exactly this:
  ```
  Daemon: connected on 127.0.0.1:<port> (build <hash>, up 0s)
  Clients (1): claude-code #<pid>
  Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?
  ```
  A tool call fails in 0–1 ms with `Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?`. That is the same text as `1a92d95:server/src/bridge.ts:4`.
- **Tests:** `npm test` went from **538 passed (41 files) → 542 passed (42 files)**. Both counts were measured by the verifier in a clean worktree after `npm ci`. `npm run typecheck` and `npm run build` exit 0. The 4 new tests are:
  - 2 SDK tests, appended to `sdk/test/connect.test.ts` (the D4 tests are unedited; the diff only adds lines);
  - 2 MCP tests in the new `mcp/test/extension-down.test.ts`. They run the real daemon `WsHost` and `Bridge` on 127.0.0.1 port 0, the real SDK `connect()` inside a real `BridgeLink`, the real `registerTools`, and a fake extension over `ws`.
- **Docs:** `docs/setup.md` gets one rewritten Troubleshooting bullet, and `docs/e2e-test-plan.md` gets the CONN-2 (b) expected text. Each carries a dated "*Superseded 2026-10-22: was …, because …*" note.
- **Commit:** see the ledger. Its message is "feat(sdk,mcp): D5b — connect without waiting for the extension; the MCP uses it (verifier: PASS-with-notes)".

## 3. Verifier verdict

**PASS-with-notes.** The verifier's file is `D5b-verifier.md` in this folder. All six exit checks D5b.1–D5b.6 pass:

- **D5b.5:** reverting the source jointly fails all 4 new tests. Reverting `connect.ts` alone fails the MCP test on behaviour, not on a missing import.
- **D5b.4:** these diffs are empty: `registry.ts` vs d6832a1, `lifecycle.ts`, `extension/`, `daemon/`, `shared/`, `client.ts`, `knock.ts`.

The verifier's own cross-package check also covered the reconnect cases:
- a 4002 close reconnects the same client, which still reports the extension down;
- a 1001 close drops the client, and the next 5 s tick creates a fresh one, as in D5.

## 4. Deviations from the phase doc

- **The MCP test imports `../../daemon/src` directly.** The import is test-only, and the mcp bundle contains no daemon code. Its purpose is that the `NOT_CONNECTED` text, the welcome and `daemon.status` come from the daemon itself rather than from a fake's copy.
- **The governing docs are not amended (verifier MINOR F2).** The phase doc's Stage D5 text and spec §9.7 do not yet mention `requireExtension` or that the MCP uses it. D5b.6 fenced the lane to `setup.md` and CONN-2, so I left them for the session agent. Suggested dated notes:
  - for the phase doc's D5 `connect({ name … })` line: "*Superseded 2026-10-22: the MCP passes `requireExtension: false` (decision #27, stage D5b).*";
  - for spec §9.7: "*Amended 2026-10-22: `requireExtension: false` skips the wait (decision #27).*"

## 5. Proposed decisions

### 2026-10-22 · The no-wait option is `requireExtension: false`, not `waitForExtensionMs: 0`
**Decided:** `connect()` gets a separate boolean, `requireExtension`, which defaults to true. When it is false, `connect()` returns once the daemon welcomes the client and ignores `waitForExtensionMs`.
**Why:** `waitForExtensionMs: 0` already has a meaning: wait 0 ms, then close the client and reject `NOT_CONNECTED`. Giving it a second meaning would silently change an existing parameter. A boolean states the intent, and adding it changes nothing else.
**Instead of:** Overloading `waitForExtensionMs: 0` or a negative value.
**Revisit if:** Step 8's review of the SDK surface settles the final name or shape.
**By:** Claude (proposed; an addition to the SDK surface, so for user review, as in #27)

### 2026-10-22 · The MCP's connect options live in `connectOptions()` in `mcp/src/config.ts`
**Decided:** `index.ts` calls `connect(connectOptions())`.
**Why:** `index.ts` runs `main()` when it is imported, so it cannot be tested. The helper makes the MCP's choice of options testable.
**Instead of:** Writing the options inline in `index.ts`.
**Revisit if:** The MCP gets more connect options or a test harness for its entry point.
**By:** Claude (proposed)

### 2026-10-22 · An MCP test may run the real daemon host in-process
**Decided:** `mcp/test/extension-down.test.ts` imports `daemon/src/wsHost.ts` and `daemon/src/bridge.ts` by relative path. It does so only in the test; no package dependency is added.
**Why:** The test pins the daemon's real `NOT_CONNECTED` text and its real status reply, not a fake's copy. The verifier confirmed that the mcp bundle is unaffected.
**Instead of:** A hand-written fake v2 daemon.
**Revisit if:** Package boundaries come to forbid test imports across packages, or a daemon refactor keeps breaking mcp tests.
**By:** Claude (proposed)

## 6. Findings

- **Verifier MINOR F1:** the `index.ts` line that calls `connect(connectOptions())` is not tested on its own. Reverting `index.ts` alone still leaves 542 tests passing. This matches D5, which also leaves the entry point untested. D6 row CONN-2 (b) covers it live.
- **Verifier MINOR F2:** the governing docs still need amending. See §4.
- **Verifier NIT F5:** the "without the option" path relies on D4's tests. The failure test among them uses a 500 ms wait rather than 15 s, and the 15 s default is pinned by the constant.
- **Verifier NIT F6:** CONN-2 (b) says "call `browser_status` at once". If the call comes within about 20 ms of the `/mcp` reconnect, the link may still have no client and print `connecting to the bridge daemon…`. This is cosmetic; D6 may reword the row.
- **Verifier NITs F3 and F4:** the relative daemon import and the comment-only `resolvePort` edit. Both are covered above.
- No new runtime gotcha for `CLAUDE.md`. Nothing new logs a URL, a header value, a body or the token. None of the forbidden fixes is present: the client reconnects only on 4002, the 5 s retry and the no-crash rule are intact, and no test was weakened or had its expected text edited.

## 7. Handoff

- **Processes:** no process I started is left. The only `node.exe` is PID 2928, which is not ours, and nothing listens on 9234. The verifier's worktree is removed and pruned.
- **For the session agent:** add the two dated notes from §4, close D5b in the as-built register, and record the decisions in §5.
- **For D6 (the user's wave):** CONN-2 (b) now expects `Daemon: connected …` and `Extension: not connected — …` with Chrome closed.
- **Needs the user's keyboard:** nothing for D5b.
