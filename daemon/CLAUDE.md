# daemon/ — Key files and runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply.

## Key files
- `daemon/src/`: `index.ts` (entry → `daemon/dist/index.js`), `main.ts` (`runDaemon`: env, token,
  bind-is-the-lock, idle, signals, exit codes), `wsHost.ts` (binds 127.0.0.1, token gate, roles,
  welcome, heartbeat, `shutdown(code)`), `handshake.ts`, `registry.ts` (clients), `route.ts`
  (`daemon.*` methods, timeout bounds, forwarding), `bridge.ts` + `connection.ts` (the extension
  socket, id-correlated calls), `build.ts` (sha256 build id), `idle.ts`, `log.ts` (file log + `redact`).
  Step 7's tab layer, all pure but the last: `handles.ts` (`HandleTable`: `T<n>` ↔ Chrome tab id,
  remap on `tabReplaced`, dead handles kept 1 h / 1 000 for `TAB_GONE`), `leases.ts` (`LeaseTable`:
  one owner per tab, `TAB_HELD {owner, since}`), `lock.ts` (`VisibilityLock`: FIFO, `LOCK_TIMEOUT
  {holder}`, released on completion, deadline or disconnect), `methods.ts` (the one method-class
  table — a new extension method must enter it; `REMOVED_METHODS`: `selectTab` → `UNKNOWN_METHOD`; Step 10's
  `evaluateSaveStart`/`Chunk`/`End` are tab methods, lease-checked, no lock, #205),
  `intercept.ts` (`TabLayer`: resolve, lease check, lock, forward with `tabId`; events → handles; the
  opener rule and `leaseGranted`; `tab is required`; `retireAll` on a changed session marker; Step 9: keeps the extension's last
  `safetyState` (null until reported, from each new extension hello until that socket reports, and after the socket closes;
  `safetyStatus` is never sent with null), logs one line per change (booleans and the
  count), serves `daemon.status.safety`, broadcasts `safetyStatus`, withholds URLs/titles while the last state
  says disarmed, one `listTabs` per change),
  `handle-mark.ts` (Step 8 S2b: handle numbers continue across daemons from
  `~/.chrome-agent-bridge/handle-mark`, reserved in blocks of 64, a time base when the file fails).

## Runtime gotchas
- **The daemon's bind is the lock; the MCP never crashes when there is no daemon.** The daemon calls `listen()` once on `127.0.0.1`; `EADDRINUSE` means another daemon
  won, so it logs `port <p> in use — another daemon owns it` and exits **0**, never retrying
  (`daemon/src/main.ts`; spec §9.3; decisions.md · 2026-10-22 · D3's daemon lifecycle). Don't add a
  retry or a non-zero exit there. The MCP keeps the no-crash rule in `mcp/src/link.ts`: the 23 tools
  are registered with no daemon, a failed `connect()` stores its message (every tool error and
  `browser_status`'s `Problem:` line show it), and the next `connect()` runs 5 s after each attempt
  settles, never overlapping — also after an established connection closes with a code other than
  4002. Several Claude sessions and scripts can now share the one daemon as separate clients.
- **The daemon outlives the session on purpose** — the SDK spawns it detached with no stdio
  (`sdk/src/spawn.ts`). Once listening it exits only on idle (`BRIDGE_DAEMON_IDLE_MS`, default
  600000 ms with zero clients; the extension does not count), `daemon.shutdown`, a signal, or a fatal
  error; at start it also exits 1 on a bad `BRIDGE_PORT`, no token, no build id or a failed `listen`,
  and 0 when the port is taken (`daemon/src/main.ts`). Its only voice is
  `~/.chrome-agent-bridge/daemon.log` (`YYYY-MM-DDTHH:MM:SSZ <msg>`, cut to its last 1 MiB on start; a
  line containing `://` or the token is withheld whole) (`daemon/src/log.ts`, D3 2026-10-22). Its build
  id is the sha256 of `daemon/dist/index.js`; `daemon.status` and `browser_status` print it. After
  `npm run build` changes that file, the next client's `connect()` sees a different build in the
  welcome, sends `daemon.shutdown` (other clients get close 4002 and reconnect without a handover — a build mismatch on that reconnect
  rejects with `VERSION`; decisions.md · 2026-10-22 · A reconnect after 4002 never hands the daemon over) and spawns the new one —
  once per `connect()`, then `VERSION`; the 10 s knock budget runs per spawn cycle (`sdk/src/knock.ts`, D4 2026-10-22). Its pre-D3 `console.error`
  lines in `wsHost.ts` (routing failure, socket error, heartbeat drop) go nowhere, since there is no stdio (open NIT, D3/D5).
- **On Windows `spawn(…, {detached: true})` keeps the child in the parent's process tree** — Windows
  keeps `ParentProcessId`, so `taskkill /T` on a *live* parent kills the "detached" daemon too; a child
  whose spawner had already exited survived the same tree kill (measured with test processes, Stage 0
  audit F3, 2026-10-22). Whether Claude Code ends MCP servers that way is not established; the D6 wave
  (MUX-7) measures it (decisions.md · 2026-10-22 · The detached daemon's survival depends on how the
  session's MCP is killed).
- **A pre-Step-6 server on 9234 takes a v2 hello as the extension.** The old host accepts any hello
  with the right token as the extension, so a Step 6 client replaces the real extension's slot, gets
  no welcome, and leaves that old session broken (measured on port 0, Stage 0 audit F1, 2026-10-22).
  The SDK waits 2 s for the welcome, then gives up with `VERSION` and never spawns or hands over
  (`WELCOME_TIMEOUT_MS`, `sdk/src/knock.ts`). End every pre-Step-6 session before starting a Step 6 one.
- **Every client must agree on `BRIDGE_PORT`.** A client spawns its daemon on its own port, so an MCP
  on 9235 and a script on 9234 start two daemons and the extension (one port in its Options) reaches
  only one; the other client waits and blames Chrome (Stage 0 audit F24, by reading the code, 2026-10-22).
  `BRIDGE_DAEMON` (a dev override of the daemon path) must be a native Windows path on Windows: Node
  resolves `/c/Users/…` to `C:\c\Users\…` (F24); `paths.ts` names that in its error.
- **A daemon spawned through `Start-Process -NoNewWindow` held the caller's output pipe open** — a
  PowerShell call that ran recipes that way returned only when that daemon was stopped (W1 MUX-6,
  2026-10-22, by correlation); a plain foreground `npx tsx recipes/hello.ts` returned at once. Run
  wave blocks with their output to a file, or stop the daemon after. Measured since: `spawnDaemon`
  inherits no pipe — node parent, `sdk/test/spawn-inherit.test.ts`: end-of-file 3–6 ms before the
  child's exit with the stand-in daemon alive in 6 runs, while the `stdio:"inherit"` control held the
  pipe every run; npx parent one ad-hoc trial. The MUX-6 cause remains unmeasured (decisions.md ·
  2026-10-23 · S3.5's outcome and the Step 6 revisit items (#91)).
- **`ws` emits several frames from one TCP read synchronously**, before any promise continuation
  runs. A one-shot listener that settles a promise and unsubscribes later swallows the frames behind
  the one it waited for: the knock lost an `extensionStatus` sent in the same read as the `welcome`, so
  `connect()` waited 15 s and blamed Chrome (D4 verifier, measured, 2026-10-22). Unsubscribe inside the
  listener's own callback.
- **The daemon pings the extension socket every 30 s and terminates it on a missed pong** — browsers
  answer pings automatically, so a missed pong means Chrome (or the offscreen document) is gone. Without
  this the `Bridge` keeps a stale connection and every call waits the full 30 s timeout. Tests use
  `heartbeatMs: 30` and a `ws` client with `autoPong: false` to simulate a dead Chrome. (Pre-Step-6 this
  ran in the MCP's server; it moved with `wsHost.ts` to `daemon/src`, D1 2026-10-22.)
- **One WebSocket frame over 100 MiB closes the extension socket (1009).** `ws`'s default `maxPayload`
  (100 MiB) is set nowhere in the repo, so one oversized reply drops the extension's socket and every actor's
  in-flight call fails `NOT_CONNECTED`; a single result frame crossed daemon → client whole up to 99 MiB (measured
  on port 0 with a fake extension, Step 10 Stage 0 F1/F2, `…step10…-steps/stage0-transport.txt`, re-run by its
  verifier). Bulk data moves in slices (`downloadChunk`; `saveTo`'s pulls, decisions.md · 2026-10-25 · Stage 0:
  `saveTo` uses transport (B), with tab-carrying pulls (#205)).
- **`ws` is `external` in the daemon and MCP esbuild bundles** (it's CJS; `daemon/build.mjs`,
  `mcp/build.mjs`) — it resolves from `node_modules` at runtime, so both run from the repo.
- **An extension error frame must carry `code`.** On the wire, `code` is required since S2b: a proto:2
  extension error without one is still delivered, as `INTERNAL`, and logged once per connection as
  `extension error without code: <method>` (decisions.md · 2026-10-23 · S2b makes `code` required on
  error frames (#73); `daemon/src/wsHost.ts`).
- **Clients see handles (`T3`), never Chrome ids.** Only the daemon maps them (`daemon/src/handles.ts`);
  a daemon restart renumbers, so the MCP cursor is lost and re-claimed with a one-line notice (T4).
  `newTab`/`listTabs` results still carry the Chrome `id` beside `tab` (kept through Step 8 for its
  consumers: decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this step; network calls
  without `tab` stay "active" (#81)). Since Step 8 S2b a new daemon **never reuses a handle number**:
  `daemon/src/handle-mark.ts` continues from `~/.chrome-agent-bridge/handle-mark` (blocks of 64; a
  time base when the file cannot be read or written), so a stale `T3` from an earlier daemon answers
  `TAB_UNKNOWN` instead of landing on another tab, and the SDK's `Tab` refuses itself (`TAB_UNKNOWN`,
  no call) after a 4002 reconnect (decisions.md · 2026-10-23 · A new daemon never reuses a handle
  number; the SDK guards stale `Tab`s (#79); · S2b's details … (#94) item 8). Tests inject the base
  and directory, never the real `~/.chrome-agent-bridge/`.
- **`leaseGranted.url` starts empty for a popup** — `tabs.onCreated` fires before a `target=_blank`
  tab's url is set (Run 8 LEASE-3: `""`). The daemon polls `listTabs` (100 ms, ≤ 2 s) before sending
  the event; Run 9 R9-LEASE-3 got the url after 45 ms, and another client was refused (`TAB_HELD`) 44
  ms after the click, before the event (the grant is immediate). A popup of a **background** opener gets
  no lease at all: Chrome names another tab as its opener, so the daemon's opener rule finds no holder and
  sends no `leaseGranted` (Run 14 R14-POP-1 FAIL, explained by Run 15 R15-POP-2 (b); with the opener in front
  it was granted after 150 ms, R15-POP-2 (a); decisions.md · 2026-10-25 · S7: Run 15 stands as recorded; its
  follow-ups (#226) item 3, #211 closed). A lease for such a popup would be a design change to the opener rule,
  the user's call (#226's Revisit-if).
- **Every tab call names its tab since Step 8 S2b.** The daemon refuses a tab method without `tab`
  (`BAD_PARAMS "tab is required"`, or `VERSION` from a no-proto extension), an unlisted untargeted method
  likewise, any `id` on `closeTab`/`focusTab`, and `selectTab` (`UNKNOWN_METHOD`, before resolution);
  network calls without `tab` (or `"active"`) mean the human's tab, with no log line (Step 8 as-built §
  S2b; decisions.md · 2026-10-23 · #81, #94).
- **The session marker retires every handle when Chrome restarts.** The extension's hello carries
  `session` (`extension/src/session-marker.ts`): reused from `storage.session` on a worker restart; on
  a miss one 2 s bound waits for `runtime.onStartup` (fresh) — an extension reload (`onInstalled`
  install/update) reuses `storage.local`'s only when the bound ends, so **a reload's hello comes up to
  2 s later**; no event → fresh (costs leases, never safety). The daemon compares with the last hello's
  marker: any change after the first hello retires every live handle synchronously before the resync
  (one `tabGone` per holder with the pre-restart url/title, leases dropped, the lock untouched; log
  `extension session changed: <n> handles retired`; the marker is never logged) (decisions.md ·
  2026-10-23 · The session marker's mechanism, amended (#80); · #94 items 2–4). Measured: an
  extension reload kept the held handle (`extension resync: 5 tabs, 0 gone`, no session line; Run 12
  SM-0); `chrome://quit` closes every tab before the session changes, so a leased handle is retired by
  `tabGone` at the quit (+1539 ms) and the restart logs `0 handles retired` (Run 12 SM-1, twice;
  S6.md gotcha candidate 4). With a killed (not quit) Chrome the N ≥ 1 branch ran live: kill, relaunch,
  reconnect 106 ms; the daemon logged `extension session changed: 3 handles retired`, the holder got `tabGone`
  with its fixture URL, the old `Tab` answered `TAB_GONE`, and the safety state in `storage.local` survived
  (Run 15 RET-1R, under the user's grant G10-2; decisions.md · 2026-10-25 · S7: Run 15 stands as recorded; its
  follow-ups (#226) item 4).
- **A leaked lease on a retired handle is invisible through the API** — leases are keyed by handle and
  the handle is dead, so only a test that claims through the lease table or after the retire catches it
  (S2b verifier mutation M6, which survived until fixer round 1 added that test; S2b.md).
- **On a reload the daemon logs `safety state:` before `extension resync`** (by design:
  `daemon/src/intercept.ts` `onSafetyState` vs the resync; Run 13 SAFE-9, a wrong expected text, #195). A
  reload also closes an open options page (SAFE-9 record), and right after it `daemon.status` shows URLs one
  round trip later than the state (S3.md §6, by reading the code).

The per-call timeout the SDK passes (`client.call(…, { timeoutMs })`) and the bounds `route.ts` applies to it are described in `sdk/CLAUDE.md`.
