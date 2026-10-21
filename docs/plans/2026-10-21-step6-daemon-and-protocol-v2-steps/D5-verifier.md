# D5 verifier report: MCP over the SDK

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), independent, 2026-10-22. I worked in a scratch worktree
at `b693eca` with the builder's uncommitted change applied from `scratchpad/d5.patch`. The worktree
has since been removed.

**Verdict: PASS-with-notes.** Every exit check passed (D5.1–D5.5, plus an empty `extension/` diff),
and so did every independent run below. The findings are 2 MINOR and 2 NIT. There is nothing
CRITICAL or MAJOR.

## Setup

- `sha256sum d5.patch` gave `95afbf69…0312`, which matches the stated hash. The patch applied cleanly
  (`git apply --check`) and touches 13 paths. After applying it, each file matched the main repo's
  working tree with CR differences ignored (`diff -q --strip-trailing-cr`, all 11 modified or added
  files). Both deleted files are absent in the main repo too.
- `npm ci` ran. The BEFORE run at `b693eca` gave **41 files / 528 tests passed**.
- After the patch, `npm install` left `package-lock.json` identical to the patched one. The lockfile
  diff is only the `mcp` workspace's dependencies: `@bridge/daemon` removed, `ws ^8.18.0` added.

## 1. Gates (re-run)

```
npm run typecheck   → tsc ×5 (shared, daemon, sdk, mcp, extension), exit 0, no output
npm test            → Test Files 41 passed (41) · Tests 538 passed (538)
npm run build       → built daemon → dist/index.js · built mcp → dist/index.js · built extension → dist/
```

I compared the per-test JSON reports from before and after the patch (`vitest --reporter=json`):

- Before: 528 tests. After: 538 tests. 528 − 5 − 3 + 13 + 5 = 538.
- **Removed (8):**
  - `daemon/test/startup.test.ts` (5 tests, a documented removal under decision #17):
    - `startWsHost returns ok with the bound port on success`
    - `… returns ok:false WITHOUT throwing when the port is already in use`
    - `bind retry keeps retrying a busy port on a timer and reports recovery`
    - `bind retry stop() cancels a pending retry`
    - `bind retry does not schedule retries when the first bind succeeds`
  - `mcp/test/tools.test.ts` (3 tests, replaced one for one under #17):
    - `browser_status reports a busy port without touching the bridge`
    - `… reports listening + not connected when Chrome hasn't dialed in`
    - `… includes the active tab when connected`
- **Added (18):**
  - 13 in `mcp/test/link.test.ts`.
  - 3 replacement `browser_status` tests:
    - `reports the stored reason without calling anything when there is no daemon`
    - `reports the daemon, its clients by name, and the extension not connected`
    - `includes the client names and the active tab when connected`
  - 2 new `no daemon (connect() failing)` tests.
- No other test changed its expected text. The only other edit in `tools.test.ts` is the harness: the
  `fakeBridge` and `evalTool` fakes. This satisfies decision 0.4.

## 2. Exit checks

| Check | Command | Result |
|---|---|---|
| D5.1 | the test-count arithmetic above. The floor is ≥ 528 − 5 + new tests | 538 ≥ 523 + 18 − 3 replaced. typecheck and build green. **PASS** |
| D5.2 | `grep -c "server.tool(" mcp/src/tools/registry.ts` | `21` (the baseline `1a92d95:server/src/tools/registry.ts` also has 21). Schemas: see §3. **PASS** |
| D5.3 | tests `no daemon (connect() failing) › registers all 21 tools and a tool call carries the stored reason` and `browser_status › reports the daemon, its clients by name…` | Both pass. Both fail under mutation (§4). **PASS** |
| D5.4 | `git diff b693eca -- mcp/src/lifecycle.ts \| wc -c` | `0`. The file is also identical to `1a92d95:server/src/lifecycle.ts` with CR differences ignored. **PASS** |
| D5.5 | `git diff b693eca -- docs/` | Updated: lines 19–20 and 23 (`mcp/dist/index.js`), CONN-3, CONN-7, CONN-6, STAT-1. The hunks touch only the prerequisites and the §4.1 table; the dated run records (§5, line 360 on) are untouched. setup.md names the daemon, `mcp/dist/index.js`, and the token precedence. **PASS** (stale lines remain: finding 1) |
| extension | `git diff b693eca -- extension/ \| wc -c` and `git diff 1a92d95 --stat -- extension/` | `0` and empty. **PASS** |

## 3. Tool schemas compared with the baseline `1a92d95`

I ran `git show 1a92d95:server/src/tools/registry.ts` and diffed it against `mcp/src/tools/registry.ts`
with CR differences ignored. The only differences are:

- The imports: `Bridge` and `../download.js` are now `downloadToFile`/`BridgeClient` from
  `@bridge/sdk`, plus `CONNECTING_REASON`.
- A new `ToolBridge` interface, a `DaemonStatus` type, and a `notConnected` helper.
- The `registerTools` parameter type.
- `browser_status`: its description is now "is the daemon connected" and its body is new.

All 21 tool names, every zod schema, every other description and every other tool body are
byte-identical to the baseline. That includes the `browser_evaluate` timeout constants and every call
site.

## 4. Do the new tests catch real faults? (mutation runs)

A scratch script applied one mutation at a time to the worktree, ran `npx vitest run mcp/test`, and
restored the file. Afterwards both files matched the main tree with CR differences ignored.

| # | Mutation | Result |
|---|---|---|
| M1 | tick never probes (`if (c) {schedule; return}`) | 2 failed |
| M2 | overlapping attempts (schedule at attempt start) | 5 failed (incl. "never overlaps attempts") |
| M3 | `stop()`: no close of a client resolved after stop | 1 failed |
| M4 | an attempt failure skips `setReason` | 4 failed (incl. both `no daemon` tool tests) |
| M5 | a probe failure skips `setReason` | 3 failed |
| M6 | a NOT_CONNECTED call does not probe | 2 failed |
| M7 | `stop()` does not close the current client | 1 failed |
| M8 | a failed probe does not close the client | 2 failed |
| M9 | a successful connect does not clear the reason | 4 failed |
| M10 | a failed probe waits a further tick before reconnecting | 4 failed |
| M11 | `browser_status` omits the client names | 2 failed |
| M12 | `browser_status` ignores the stored reason | 2 failed |
| M13 | `through()` always reports CONNECTING_REASON | 4 failed |

All 13 mutations were caught.

I also ran the new `tools.test.ts` against the old (`b693eca`) registry, with the `@bridge/daemon`
type import stubbed. **4 failed**: the three `browser_status` tests and "registers all 21 tools and a
tool call carries the stored reason". "every tool except browser_status surfaces the stored reason"
passes against the old registry. That is expected, because that behaviour lives in `BridgeLink`, and
M4 and M13 show that this test catches faults there.

## 5. No-crash run of the real `mcp/dist/index.js`

Before running anything, I checked that the run could not spawn a daemon. `connect()` resolves the
token, then the port, then `resolveDaemonPath` (`sdk/src/connect.ts`). `resolveDaemonPath` throws for
a missing `BRIDGE_DAEMON` file before any knock (`sdk/src/paths.ts`, `isFile` false →
`throw new Error("daemon not built …")`), so no spawn is possible.

The harness (scratch `nocrash.mjs`) used the `@modelcontextprotocol/sdk` `Client` with
`StdioClientTransport`, running `node mcp/dist/index.js`. Its environment:

- `BRIDGE_PORT`: a port reserved on 127.0.0.1 and then released (6713).
- `BRIDGE_TOKEN=dummy-test-token`.
- `BRIDGE_DAEMON`: a nonexistent file.
- A `--require` preload that only writes a stderr line whenever that path is `stat`ed, to count
  connect attempts.

```
tools: 21
browser_status: "Daemon: not connected\nProblem: daemon not built — run `npm run build` (looked for …\\no-such-daemon\\index.js, from BRIDGE_DAEMON; …)" isError: false
browser_snapshot: "daemon not built — run `npm run build` (looked for …)" isError: true
alive after 12685 ms: true
browser_status later: (same Problem line)
exit after stdin end: 63 ms
--- child stderr ---
[statspy] connect attempt at …22:02:19.619Z
[chrome-bridge] bridge daemon unavailable (retrying every 5 s): daemon not built — …
[statspy] connect attempt at …22:02:24.635Z
[statspy] connect attempt at …22:02:29.637Z
[chrome-bridge] shutting down: stdin ended (MCP client disconnected)
```

The process stayed alive, retried at a 5.0 s cadence, and exited 63 ms after stdin ended. The
`[chrome-bridge]` unavailable line prints only when the reason changes (`onChange`), so it appears
once. Afterwards `Get-Process node` showed only PID 2928.

## 6. Cross-package end-to-end over real `ws` sockets

This was a scratch vitest file in the worktree, not committed. Everything bound to 127.0.0.1 port 0.
The pieces:

- An in-process `WsHost` with `build` set to the sha256 of a scratch `BRIDGE_DAEMON` file, so no
  handover could happen.
- A fake v1 extension: hello `{type, token}`, answering `listTabs` and `snapshot`.
- The SDK's `connect({name:"claude-code #123", port, env:{BRIDGE_TOKEN, BRIDGE_DAEMON}, io:{spawnDaemon: spy}})`.
- The MCP's `BridgeLink`, then `registerTools` on an `McpServer`.

A throwing spawn would have been swallowed by `knock.ts` ("A failed spawn … keep knocking"), so I
used a spy and asserted on its calls instead. **4/4 passed:**

1. **Connected, no spawn.** `spawnDaemon` was not called. `browser_status`:
   ```
   Daemon: connected on 127.0.0.1:22227 (build 5a10bc45…1c2e, up 0s)
   Clients (1): claude-code #123
   Extension: connected
   Active tab: [7] Playground — http://localhost:8080/e2e-playground.html
   ```
   `browser_snapshot` returned the extension's text.
2. **(a) A non-4002 close.** I called `host.shutdown(1001)`. Straight after, `browser_status` showed
   `Daemon: not connected` and `Problem: The connection to the bridge daemon closed (code 1001
   "daemon shutting down"); this client does not reconnect — …`. Because the status call rejected
   with NOT_CONNECTED, it also dropped the client. A fresh `connect()` followed **4993 ms** after the
   close, on the default 5 s tick. `link.reason` kept the close message, and `browser_snapshot`
   rejected with it. `onChange` fired once.
3. **Recovery.** I set `retryMs` to 300. The spawn spy started a new in-process host and extension on
   the same port. The link reconnected, `onChange` went `[reason, null]` (the reason cleared, so it
   does not go stale), there were 2 connect calls, and `browser_status` listed `claude-code #123` and
   `Extension: connected` again.
4. **4002 (the daemon replaced).** `BridgeClient` reconnected by itself. Several 200 ms ticks probed
   during the reconnect, and `client.connect()` waited on `ready`. The link never dropped the client:
   1 connect call, `reason` stayed null, and `snapshot` worked on the new host.
5. **(b) No welcome.** A raw `ws` server on port 0 that never answers. `connect()` rejected after
   **2017 ms** with `No welcome from 127.0.0.1:<port> within 2 s after hello: a pre-Step-6 bridge
   server holds port <port>. End the old Claude session (or stop the old \`node
   …/server/dist/index.js\`) and try again.` The spawn spy was not called. `browser_status` showed
   exactly `Daemon: not connected\nProblem: <that text>`, and `browser_snapshot` rejected with the
   same message and code `NOT_CONNECTED`. The CONN-7 row quotes this text correctly
   (`sdk/src/knock.ts:196-198`).

## 7. Audit

- **Shutdown closes the client.** `mcp/src/index.ts`'s shutdown is `link.stop(); await server.close()`.
  `stop()` closes the held client and any client that resolves after stop (M3, M7).
- **The bundle keeps `ws` external.** `grep 'from "ws"' mcp/dist/index.js` → `import WebSocket from
  "ws";`. `mcp/build.mjs` has `external: [..., "ws"]`, and `mcp/package.json` declares
  `ws ^8.18.0` (same as sdk and daemon). The bundle contains no `WsHost`/`startWsHost` (count 0).
- **Nothing imports `@bridge/daemon`.** `grep -rn "@bridge/daemon"` outside `daemon/` finds only the
  daemon's own workspace entry in `package-lock.json`. The interim exports block is gone from
  `daemon/package.json` (decision #19).
- **`validateHello` is untouched.** `git diff --stat b693eca -- daemon/src shared sdk` shows only the
  deletion of `startup.ts`, and `daemon/test/handshake.test.ts` still pins `validateHello`. Decision
  #20's "Revisit if" is not triggered: no non-test caller existed before D5 either.
- **Logging.** `grep -rn "console\." mcp/src` finds 4 lines. They print a fixed text, the stored
  reason, the shutdown reason, or a fatal error. Each reason comes from the SDK: token errors never
  contain the token (`token.ts`), and the 4001 close reason passes through `safeReason`, which
  scrubs the token. Paths can appear; URLs, header values and the token cannot.
- **Actor name.** `actorName(pid = process.pid)` returns `claude-code #${pid}`. `ppid` is used only
  for the lifecycle.
- **`client.connect()` on an open client sends nothing.** `sdk/src/client.ts:132` is
  `if (state === "open" && currentWelcome) return currentWelcome;`, which never touches the socket.
  On a reconnecting client it returns `this.ready` (line 133), so the probe waits, as case 4 of §6
  shows. On a failed client it throws the stored failure (line 135).
- **Races in `link.ts`.**
  - A probe from a call racing the tick's probe: both await, and only the one that still sees
    `client === c` drops it (guard at line 128). The tick then runs one `attempt()`.
  - A probe on a client that has already been replaced: the guard stops it.
  - `stop()` during a probe: the client is already null, so the probe does not drop it; `attempt()`
    and `schedule()` both return when stopped.
  - Double close: `BridgeClient.close()` is idempotent.
  - Only one timer chain exists. `schedule()` is called only when an attempt settles or after a
    healthy probe, so no two attempts overlap (M2).
  - The probe is bounded: a reconnect's knock is limited by the 10 s budget and the 2 s welcome
    timeout.

  I found no defect.

## Findings

1. **MINOR. Some `docs/e2e-test-plan.md` lines still describe the old in-MCP server.** The specific
   lines D5.5 names are done, but these remain:
   - §2 Diagnostics (lines 64–65) still says: "**Server stderr:** … Expect the `WebSocket host
     listening on 127.0.0.1:9234` line." The MCP now prints `[chrome-bridge] connected to the bridge
     daemon`, and the host line belongs to the daemon, which has no stdio.
   - CONN-1's step says "Start server", and CONN-2's says "Stop the server (or disable the
     extension), then call any tool". After D5, stopping the MCP leaves no tool to call. Stopping the
     daemon gives `The connection to the bridge daemon closed …`, and the next tick respawns the
     daemon, so the "Extension not connected" text appears only on the disable-the-extension branch.

   Evidence: `grep -n "WebSocket host\|CONN-1 \|CONN-2 " docs/e2e-test-plan.md` gives 65, 85, 86.
   Fix: amend §2 and the CONN-1/CONN-2 steps with dated notes in D5 or D7 (it is the D6 wave's
   checklist).

2. **MINOR (spec interplay, behaviour matches the stage text). The 15 s extension wait hides a running
   daemon.** `mcp/src/index.ts` calls `connect({ name })` with the default
   `waitForExtensionMs` = 15 000, and `connect()` rejects and closes its client when the extension
   never comes up (`sdk/src/connect.ts`). With Chrome closed, the MCP therefore never holds a client:
   - For the first ~15 s after start, every tool returns `connecting to the bridge daemon…`, and
     `browser_status` says `Daemon: not connected` even though the daemon is up.
   - After that it says `Daemon: not connected` / `Problem: Extension not connected — … (waited 15000
     ms on port 9234)`.
   - The MCP opens and closes a daemon client every ~20 s (a 15 s wait plus the 5 s retry), so the
     daemon's client list and log churn.
   - The `browser_status` branch "daemon connected, extension not connected" is reachable only when
     the extension drops after the MCP has connected (e.g. CONN-6).

   The builder reported the same thing. This is design-local, not a D5 defect: the spec text is
   `connect({ name })`. Options: accept and document it; or have the MCP connect with a short
   `waitForExtensionMs` and keep a client whose welcome says the extension is down. The SDK has no
   "connected without the extension" mode today. That needs a session-agent decision, not a verifier
   fix.

3. **NIT. A stale comment in `sdk/src/connect.ts:48` (outside D5's lane).** It reads "`BRIDGE_PORT`,
   validated exactly like `mcp/src/config.ts`", but `mcp/src/config.ts` no longer reads or validates
   the port; it holds only `actorName`. The builder noted this too. Fix it in D7.

4. **NIT. The stderr retry line prints only on a change of reason.** In §5 it appeared once while
   three attempts ran. That is fine and avoids spam, but nobody can see from stderr that the MCP is
   still retrying. No change needed. If wanted, log at most one "still retrying" line per minute.

No other findings. The builder's own CONN-6 finding is correct: the heartbeat's `console.error` goes
nowhere in a daemon spawned with `stdio: "ignore"` (`daemon/src/wsHost.ts:187`,
`sdk/src/spawn.ts:33`), and the amended CONN-6 row says so.

## Cleanup

- The scratch test, harness and preload lived only inside the worktree. I removed the worktree with
  `git worktree remove --force` (Windows needed a `Remove-Item` for the leftover folder) and pruned
  it; `git worktree list` now shows only main.
- Every node process I started has exited: `Get-Process node` shows only PID 2928, which I did not
  touch.
- `netstat -ano | grep -c ':9234'` → `0`.
- Main repo: during setup I ran `git add -N` on the two new files by mistake. I reverted it at once
  with `git reset -q -- mcp/src/link.ts mcp/test/link.test.ts`, and `git status` shows them as `??`
  again, exactly as at the start. The only main-repo file I wrote is this report.
