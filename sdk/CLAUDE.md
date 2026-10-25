# sdk/ — Key files and runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply.

## Key files
- `sdk/src/`: `index.ts` (public surface, exactly eight values: `connect`, `BridgeClient`, `Tab`,
  `BridgeError`, `ErrorCodes`, `downloadToFile`, `formatSnapshot`, `formatNetwork`; the rest are
  types), `connect.ts` (`connect({name, failureReports?, …})`), `knock.ts` (knock/spawn/handover state
  machine), `client.ts` (`BridgeClient`: calls, events, 4002 reconnect; Step 8's `newTab`, `claim`,
  `tab()` — the cursor, `NO_CURSOR` without one — `tabs()` (rows carry `hidden?`, Step 9), Step 9's `safety()`
  and `on("safetyStatus")`, Step 10's `on("warning")` (a `BridgeWarning {tab, method, kind: "pastSnapshotCap"}`,
  #206), and the cursor's `Tab` methods mirrored but
  `close`), `tab.ts` (Step 8 `Tab {handle}`: navigate…release, stale after a 4002 reconnect →
  `TAB_UNKNOWN` with no call; Step 10's `evaluateToFile` and the type `BridgeWarning`), `evaluate-save.ts` (Step 10
  S4: `saveEvaluateToFile` — the target checks, `.part` opened `"wx"`, 1 MiB pulls, the hard-link finish,
  `SAVE_TRANSFER_MS`; re-exported with `checkSaveTarget` on the `@bridge/sdk/download` subpath; #207, #218),
  `locator.ts` (`Target = ref | Locator`, `normalizeTarget`), `error.ts`
  (failure reports: the attach set, the 5 s budget, `report()`; Step 9's `safetyRefusalLine` — one plain line
  for `DISARMED`/`DOMAIN_BLOCKED` and, since Step 10 S4b, `JS_DISABLED` (#219), no report — re-exported by
  `report.ts`), `report.ts` (the `@bridge/sdk/report`
  subpath: `attachContext` for the MCP), `policy.ts` (`TRUSTED_INPUT_POLICY = "focusFirst"`),
  `transport.ts` (the `ws` socket), `spawn.ts`,
  `paths.ts` (daemon path, `BRIDGE_DAEMON`), `token.ts` (`resolveToken`, also used by the daemon),
  `download.ts` (`browser_download`'s client half: target path, chunked pull, atomic write, sha256),
  `format/{snapshot,network}.ts` (the pure text formatters, moved from the extension in Step 7 T4,
  byte-identical to the baseline `sdk/test/fixtures/baseline-51de800.json`), exported as the
  `@bridge/sdk/format` subpath (`sdk/package.json` `exports["./format"]`) and from `index.ts`.

## Runtime gotchas
- **The call timeout is per-call** — `client.call(method, params, { timeoutMs })`. The daemon bounds
  it to `[100, 600000]` and waits 5 s longer; the client waits 1 s more than the daemon (`route.ts`,
  `sdk/src/client.ts`). The default is still 30 s, so anything that may run longer (`browser_evaluate`,
  `browser_download`) must pass `timeoutMs`, or the daemon reports a timeout while the extension is
  still working. Since Step 7 one deadline covers both the visibility-lock wait (`LOCK_TIMEOUT`) and
  the forwarded call (decisions.md · 2026-10-22 · One deadline per call covers the lock wait and the
  forwarded call).
- **The text formatters live in `sdk/src/format/`** (`@bridge/sdk/format`), not in the extension: the
  extension returns `SnapshotResult {url, title, elements, truncated}` and network entries, and the MCP
  renders them. The output is pinned byte-identical by `sdk/test/format-baseline.test.ts` against
  `sdk/test/fixtures/baseline-51de800.json`, captured once from the pre-T3 code (T4.2). Never
  regenerate that fixture from the new formatter.
- **The SDK's knock hashes `daemon/dist/index.js` on disk at every knock** (`sdk/src/knock.ts:162`,
  `io.hashDaemon`, defined in `sdk/src/spawn.ts:44`), not a build baked into the client, so a client
  started from an older bundle adopts whatever daemon was built last (Stage 0 F5, found by reading
  the code; the Stage 0 verifier re-read it and ran only a same-build 4002 reconnect, so no old-bundle
  client has been run against a newer daemon). That is why the Step 7 daemon kept a legacy path
  for Step 6 clients for one release (decisions.md · 2026-10-22 · A Step 6 client keeps working
  against a Step 7 daemon for one release, without loosening a lease).
- **Failure reports take the visibility lock and switch the screen.** On `LOCATOR_NOT_FOUND
  LOCATOR_AMBIGUOUS REF_STALE OFFSCREEN PAGE_ERROR NAV_FAILED TIMEOUT` a `Tab` call (and the MCP on a `T<n>`
  handle) reads the tab once more — `snapshot`, a default-mode `screenshot`, the last 20 network
  entries — in one 5 s budget, sets them on the same `BridgeError` (`snapshot`, `screenshotPath`,
  `network`, `attachErrors`, `report()` ≤ 60 lines) and never throws from it (`sdk/src/error.ts`). The
  screenshot is an ordinary capture under the FIFO lock (another actor's lock → `LOCK_TIMEOUT` or the
  5 s cut in `attachErrors`) and **switches the window to the failed background tab**: probe tab
  `visible` +20 ms, the human's tab hidden 1331 ms, call 1344 ms, PNG showing the failed tab (Run 12
  REP-0, with blue/magenta controls; decisions.md · 2026-10-23 · A probe of the failure-report screenshot
  runs before any row that could attach a non-fixture tab (#97)). On a fully covered window the 5 s cut
  ends the SDK's wait, not the extension's switch (the failed tab may stay in front ~30 s, R9-RESTORE).
  PNGs go to `BRIDGE_FAILURES_DIR`, else `~/.chrome-agent-bridge/failures/` — outside the repo; a
  script on a real site's private pages passes `connect({failureReports: false})`, as
  `recipes/blackboard/boot-bb.ts` and `export-grades.ts` do.

`saveTo`'s file finish (`.part`, the hard link) is in `extension/src/evaluate/CLAUDE.md`, beside the extension's store.
