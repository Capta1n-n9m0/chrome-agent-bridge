# D3 verifier report — Daemon lifecycle

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), independent; no agents spawned. Date 2026-10-22.
Subject: the builder's uncommitted D3 changes in the main tree on HEAD `cbd91f9`. Modified files:
`daemon/build.mjs`, `daemon/package.json`, `daemon/src/wsHost.ts`, `daemon/test/wsHost.test.ts`,
`package-lock.json`. New files: `daemon/src/{build,idle,index,log,main}.ts`,
`daemon/test/{build,idle,log,main}.test.ts`.

Method: I made a scratch worktree at `cbd91f9` (`git worktree add <scratchpad>/D3-verify cbd91f9`),
ran `npm ci`, measured the "before" numbers, copied the 14 lane files over from the main tree,
ran `npm ci` again, then ran typecheck, test and build. I also ran mutations, probes and child-process
runs there. The worktree was then removed. I edited nothing in the main tree except this file.

## Before / after

| | Command (worktree) | Result |
|---|---|---|
| before | `npm ci && npm test` at `cbd91f9` | **479 passed, 37 files** (matches the expected 479 / 37) |
| after | lane files copied, `npm ci && npm test` | **525 passed, 41 files**, exit 0 |
| typecheck | `npm run typecheck` (exit code read directly, not through a pipe) | exit 0 |
| build | `npm run build` | exit 0: `built daemon → dist/index.js`, `built mcp → dist/index.js`, `built extension → dist/` |

Delta +46, which matches the new tests: main.test 20 + log.test 12 + idle.test 9 + build.test 3 +
wsHost.test 2 (new `onShutdown` describe; the file has 7 tests now).

## Exit checks

**D3.1. PASS.** 525 ≥ 479 + the idle/build/log tests (all included). Typecheck exit 0.

**D3.2. PASS.** Each required item has a test:
- idle arms at 0, cancels at 1, re-arms at 0 and fires once: `idle.test.ts` "arms at count 0 and fires once after ms",
  "cancels at count 1 and never fires while a client is connected", "re-arms at 0 with the full interval",
  "fires at most once ever".
- `redact` refuses `://` and the token: `log.test.ts` "refuses a string containing ://" and "refuses a string containing the token".
- `buildHash` is stable for a known file: `build.test.ts` checks sha256("abc") = `ba7816bf…15ad` twice.
- The log is truncated to its last 1 MiB on start: `log.test.ts` "truncates a file over 1 MiB to its last 1 MiB on start, starting at a whole line".

**D3.3. PASS.**
```
$ grep -n "console\." daemon/src/index.ts ; echo rc=$?
rc=1
$ grep -n "console\.\|process\.std" daemon/src/main.ts daemon/src/log.ts daemon/src/idle.ts daemon/src/build.ts ; echo rc=$?
rc=1
```

**D3.4. PASS (they stay, per #17).** `daemon/src/startup.ts` and `daemon/test/startup.test.ts` exist
and are unchanged: `git diff --stat HEAD -- daemon/src/startup.ts daemon/test/startup.test.ts` prints
nothing. `mcp/src/index.ts:6` still has `import { startWsHost } from "@bridge/daemon/startup";`. The
note that says why they stay until D5 is decisions.md 2026-10-22 #17, together with phase-doc D5.1
and the D5 lane.

**D3.5. PASS.**
```
$ grep -rnE "retry|setInterval|startWsHost" daemon/src/index.ts ; echo rc=$?
rc=1
$ grep -nE "retry|setInterval|startWsHost" daemon/src/main.ts ; echo rc=$?
rc=1
$ grep -n "listen(" daemon/src/main.ts daemon/src/index.ts
daemon/src/main.ts:5:   (comment)
daemon/src/main.ts:26:  listen(): Promise<number>;          (interface)
daemon/src/main.ts:166:    const bound = await live.listen();   (the only call)
```
Reading the code confirms a single `listen()` call. `EADDRINUSE` leads to `exitOnce(0, "port in use")` and
a `return`. Nothing schedules a timer on that path. The child-process run R1 below confirms it.

**D3.6. PASS.** `git diff --stat -- extension/` is empty, and `git status --short extension/` is empty too.

## Mutation and revert results (worktree only, every file restored and compared with `cmp` to the main tree afterwards)

Removing each new src module makes its test file fail. Each of these test files failed to load
("no tests") with its module removed: `build.ts`, `idle.ts`, `log.ts`, `main.ts`. Reverting
`wsHost.ts` to HEAD fails 2 tests: the `onShutdown` "calls once…" test and the end-to-end
`daemon.shutdown` test in main.test. The "an onShutdown that throws does not reject" test passes
against HEAD, as expected for a guard test.

Behavioural mutations. All 15 were caught:

| # | Mutation | Result |
|---|---|---|
| M1 | idle cancels only when count > 1 | idle.test 2 failed |
| M2 | every 0 re-arms (resets the deadline) | idle.test 1 failed |
| M2b | can fire twice | idle.test 3 failed |
| M3 | `redact` without the token check | log.test 2 failed |
| M4 | `redact` without the `://` check | log.test 2 failed |
| M5 | no start-time truncation | log.test 2 failed |
| M6 | `build: "dev"` passed to WsHost | main.test 1 failed |
| M7 | `EADDRINUSE` exits 1 | main.test 2 failed |
| M8 | `EADDRINUSE` retries `listen()` after 5 s | main.test 2 failed |
| M9 | signal and idle shut down with 1000 instead of 1001 | main.test 4 failed |
| M10 | idle timer not armed at start | main.test 3 failed |
| M11 | SIGBREAK not installed | main.test 1 failed |
| M12 | `onShutdown` called before the sockets close | wsHost.test 2 failed |
| M13 | token not handed to `logger.setSecret` | main.test 1 failed |
| M14 | 4002 shutdown exits 1 | main.test 2 failed |

## Build identity and bundle

```
$ sha256sum daemon/dist/index.js
50e06b5e7c640de9d1d7a7ab7f4a44e0eff4b2a9aae0904da28c58a82ef02040
$ npx tsx -e "buildHash('daemon/dist/index.js'); hashDaemon('daemon/dist/index.js')"   (daemon/src/build.ts, sdk/src/spawn.ts)
buildHash 50e06b5e7c640de9d1d7a7ab7f4a44e0eff4b2a9aae0904da28c58a82ef02040
hashDaemon 50e06b5e7c640de9d1d7a7ab7f4a44e0eff4b2a9aae0904da28c58a82ef02040
```
All three are equal. The real daemon's `welcome.build` in run R2 was also `50e06b5e…2040`, so the
real hash reaches WsHost and the welcome is never `"dev"`.

The bundle (`daemon/dist/index.js`, 27 408 bytes):
- `ws` is external: `import { WebSocketServer, WebSocket } from "ws";` is the only non-`node:` import.
- From the SDK, only `// ../sdk/src/token.ts` is bundled. `grep -c "BridgeClient\|knock\|spawnDaemon\|hashDaemon\|tryConnect"` returns 0.
- The bind is `new WebSocketServer({ host: "127.0.0.1", port: this.options.port })`.
- The only `console.*` calls left are the three D2-era calls in `wsHost.ts`. See F3.

Lockfile: `git diff HEAD -- package-lock.json` adds exactly 2 lines under the daemon workspace,
`"@bridge/sdk": "*"` and `"@bridge/shared": "*"`. After `npm install --package-lock-only` in the
worktree, the file was identical to the builder's apart from line endings
(`diff <(tr -d '\r' …)` printed nothing), so npm itself produces this file.

## Process check (optional; done, never on 9234, never detached)

I ran the built `node daemon/dist/index.js` as a non-detached child from the worktree, with stdio
piped, a 15 s kill timer, `BRIDGE_TOKEN=dummy-test-token-77`, and `HOME`/`USERPROFILE` set to a fresh
temp dir. Child PIDs (all exited by themselves; none needed killing): 15380, 13852, 27872, 26668,
12920, 26800.

| Run | Setup | Exit | stdout / stderr | Log |
|---|---|---|---|---|
| R1 | ephemeral port already held by my own `net` listener | **0** after 124 ms | `""` / `""` | `start` → `config … build=50e06b5e…` → `port 44709 in use — another daemon owns it` → `exit 0 (port in use) …`. Token absent. |
| R2 | free port, `BRIDGE_DAEMON_IDLE_MS=800`, a v1 extension hello connected at 300 ms and kept open | **0** after 938 ms; extension saw close **1001** | `""` / `""` | `listening on 127.0.0.1:44710` → `idle for 800 ms with no clients — shutting down` → `exit 0 (shutdown 1001)`. **The extension did not count.** |
| R3 | client hello, then `daemon.shutdown` | **0** after 432 ms; client got `{ok:true}` then close **4002** | `""` / `""` | `client + "verifier" (1 client)` → `client - …` → `exit 0 (shutdown 4002)` |
| R4 | `~/.chrome-agent-bridge` is a regular file, so the log cannot be opened; port held | **0** | `""` / `""` | none. No crash, no fallback to stdout or stderr |
| R5 | existing 2 600 000-byte log; port held | **0** | `""` / `""` | 1 048 857 bytes afterwards. The first line is whole (`old 029836 …`) and the last old line (`old 049999`) is kept |
| R6 | `BRIDGE_DAEMON_IDLE_MS=3000000000`, free port | **0 after 133 ms** | stderr: `TimeoutOverflowWarning: 3000000000 does not fit into a 32-bit signed integer. Timeout duration was set to 1.` | `idle for 3000000000 ms with no clients — shutting down` → `exit 0`. See **F1** |

None of the logs contained the token (`log.includes(TOKEN)` was false every time).

Not tested live: SIGINT, SIGTERM and SIGBREAK delivery. On Windows, `child.kill(sig)` from Node is
`TerminateProcess`, so no handler runs. The signal → `shutdown(1001)` → exit 0 path is covered only
by the unit tests (main.test "a signal shuts the host down with 1001…", plus mutations M9 and M11).

## Edge probes (tsx, in the worktree, real WsHost on ephemeral ports)

- **P1/P2: an idle value above the `setTimeout` maximum.** `new IdleTimer({ms: 3e9})` fired after
  about 56 ms, and the TimeoutOverflowWarning went to stderr. `runDaemon` with the same env logged
  `idleMs=3000000000` and shut down at once. See F1.
- **P3: a signal before `listen()` resolves.** The handlers are installed before `await listen()`
  (main.ts:163 before :166). SIGINT during the pending listen ran `shutdown(1001)`: no `wss` yet,
  so it resolved at once, `onShutdown` ran and exit 0 was called once. With the exit mocked, `listen`
  then still bound the port and logged `listening on …` after the exit line. In production
  `process.exit(0)` runs first, so this is harmless. No finding.
- **P4: client names and a connect during shutdown.**
  - A client name containing the token was withheld, both the `client +` and the `client -` line.
  - A name containing `https://` was withheld as well.
  - A name with an embedded newline and a fake timestamp was written JSON-escaped (`"line1\nline2 …"`)
    on one line, so a name cannot forge a log line.
  - A client connecting after SIGTERM got `ECONNREFUSED`: the listener was already closed.
  - Exit 0 was called once.
- **Unhandled rejections.** `index.ts` uses `void runDaemon(...)`, and `runDaemon` installs
  `uncaughtException` and `unhandledRejection` before anything else. Either one leads to
  `fatal: <ErrorName>` and exit 1, and the error message is never logged (main.test "an uncaught
  exception logs only its name": its message contains a URL and the token, and neither reaches the log).
- **`onShutdown` and existing behaviour.** The hook runs in `.finally` after `doShutdown`. With no
  hook, `shutdown()` behaves exactly as before: all 5 pre-existing wsHost tests pass unedited, and
  the D2 contracts hold (1 s grace, 4002 on `daemon.shutdown`; see R3). If `doShutdown` ever rejected,
  the rejection would still propagate and the hook would still run once. On Windows, run R3 shows the
  `onShutdown` → `process.exit(0)` path ending cleanly: the 4002 close reached the client before the exit.
- **Token exposure.**
  - The token reaches the daemon through env (`sdk/src/spawn.ts:35`), never argv.
  - `resolveToken`'s error text names places, not values.
  - Bind and hash failures log only `err.code` or `err.name`.
- **`BRIDGE_PORT`.** The SDK spawns the daemon with `String(port)` already normalised
  (`sdk/src/spawn.ts:35`), so the daemon's stricter digits-only parse (`main.ts:54-59`) cannot reject
  a value that the SDK accepted.

## Findings

1. **MINOR: `BRIDGE_DAEMON_IDLE_MS` above 2 147 483 647 makes the daemon idle out after 1 ms.**
   - Location: `daemon/src/main.ts:62-67` (`parseIdleMs` accepts any safe integer) and `daemon/src/idle.ts:57`.
   - Evidence: run R6 above exited 0 after 133 ms, with
     `stderr="(node:26800) TimeoutOverflowWarning: 3000000000 does not fit into a 32-bit signed integer.\nTimeout duration was set to 1.…"`
     and the log line `idle for 3000000000 ms with no clients — shutting down`. Probe P1 shows the
     same result for `IdleTimer` alone (`fired=1 after ~56 ms`).
   - Effect: someone who sets a large value to mean "never idle out" gets a daemon that exits before
     any client can connect. The SDK then knocks for 10 s and gives up. Node also writes a warning to
     stderr, which is a stderr write from the daemon (invisible only because the spawn uses
     `stdio: "ignore"`).
   - Suggested fix: reject or clamp values above 2 147 483 647 in `parseIdleMs`, log it the way the
     non-numeric case is logged, and add a test for it.

2. **NIT: phase-doc decision 0.6 says the idle fire does `host.close()`; the code does `host.shutdown(1001)`.**
   - Location: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md` §0.6 ("On fire: `host.close()` then `process.exit(0)`"); `daemon/src/main.ts:183`.
   - Evidence: R2, where the extension saw close 1001 on idle.
   - The code follows decisions.md #15 (a graceful shutdown with a close code) and the D3 checklist's
     signal line, so the behaviour is right. Only the wording of 0.6 is now stale.
   - Suggested fix: the step agent adds a dated "*Superseded 2026-10-22*" note to 0.6.

3. **NIT: three `console.error` calls in `wsHost.ts` are the daemon's only diagnostics for socket errors, missed pongs and routing failures, and they go nowhere.**
   - Location: `daemon/src/wsHost.ts:94`, `:177`, `:187`.
   - Evidence: the bundle grep above. These calls predate D3 (D2). Under `stdio: "ignore"` they are
     harmless, but a heartbeat termination never reaches `daemon.log`.
   - This is outside the D3 checks, which cover `index.ts` only.
   - Suggested fix (D5 or later): pass the `Logger` into `WsHost` as an optional sink and log counts
     or names only.

4. **NIT: a losing daemon truncates the shared log before it tries the bind.**
   - Location: `daemon/src/index.ts:10` (`createFileLogger()` runs before `runDaemon`) and `daemon/src/log.ts:89-95`.
   - When a loser starts while the winner's log is over 1 MiB, its read-then-`writeFileSync` can drop
     a winner line appended inside that window.
   - This is theoretical, the only cost is a lost log line, and no correctness or security effect follows.
   - Suggested fix: none needed now. Optionally truncate only after a successful `listen()`.

No CRITICAL or MAJOR findings. Every item in the verifier focus checked out: the idle timer fires
once and never while a client is connected; the extension does not count; `redact` withholds lines
with `://` or the test token; the entry path makes no stdout or stderr write of its own; `EADDRINUSE`
exits 0 after a single listen with no retry; signal handlers are installed before the listen; 4002
leads to exit 0; the log is at `~/.chrome-agent-bridge/daemon.log`, truncated at start, and fails
silently; `ws` stays external and the SDK client is not bundled; the bind is 127.0.0.1; the token
appears in no log, argv or error; the real build hash reaches WsHost; and `onShutdown` changes no
existing behaviour.

## Cleanup

- `git worktree remove --force` deregistered the worktree. It could not delete the directory
  ("Directory not empty"), so I removed it with `rm -rf`, ran `git worktree prune`, and checked
  that `git worktree list` shows only the main tree.
- I deleted my 6 temp `d3v-home-*` dirs under `%TEMP%`.
- `tasklist | grep -i node` shows only `node.exe 2928` (the known codex process, untouched).
- `netstat -ano | grep :9234` prints nothing (rc=1), so 9234 is free.
- `git status --short` in the main tree is unchanged apart from this file.

## Verdict

**PASS-with-notes.** All six exit checks pass. There are no CRITICAL or MAJOR findings: one MINOR
(F1, an idle value above the timer maximum) and three NITs (F2–F4).

## Re-check r1 (2026-10-22): finding 1 only

Scope: the fixer's uncommitted change for F1.
- `daemon/src/idle.ts` adds `MAX_IDLE_MS = 2_147_483_647`. The `IdleTimer` constructor now throws
  `RangeError` unless `ms` is a whole number from 1 to that maximum.
- `daemon/src/main.ts:70`: `parseIdleMs` also requires `n <= MAX_IDLE_MS`, and the fallback log line
  names the maximum.
- 3 new tests in `daemon/test/{idle,main}.test.ts`.

Method: a fresh worktree at `cbd91f9` in the scratchpad (`D3-r1`). I copied all 14 D3 lane files
from the main tree and ran `npm ci`.

**Counts**
```
npm ci → 0;  npm run typecheck → 0;  npm run build → 0 (built daemon / mcp / extension)
npm test → Test Files 41 passed (41) · Tests 528 passed (528)
```
That is 525 + 3, as expected.

**The new tests fail with the fix reverted** (worktree only; files restored afterwards and checked
with `cmp` against the main tree). Two edits undo the fix:
- `idle.ts:28`: the guard becomes `if (false) {`
- `main.ts:70`: `&& n <= MAX_IDLE_MS` is dropped

```
$ npx vitest run daemon/test/idle.test.ts daemon/test/main.test.ts
 × IdleTimer > rejects an ms outside 1..2147483647 or not a whole number with a RangeError
 × runDaemon — configuration > parseIdleMs caps at setTimeout's maximum (2147483647 ms)
 × runDaemon — configuration > a BRIDGE_DAEMON_IDLE_MS above setTimeout's maximum logs and uses the default, never a 1 ms timer
 Tests  3 failed | 29 passed (32)
```

**Greps (main tree)**
```
$ grep -n "console\." daemon/src/index.ts daemon/src/main.ts                          → rc=1 (none)
$ grep -nE "retry|setInterval|startWsHost" daemon/src/index.ts daemon/src/main.ts     → rc=1 (none)
$ grep -n "\.listen(" daemon/src/main.ts  → 170:    const bound = await live.listen();   (only call)
$ git diff --stat -- extension/           → empty
```

**Child process R7.** I ran the built `daemon/dist/index.js`, not detached, on ephemeral port
41994, with a dummy token, a temp HOME/USERPROFILE and `BRIDGE_DAEMON_IDLE_MS=99999999999`. Child
PID 10664. The daemon was still running at 5 s, so I killed it myself.
```
R7 at 5 s: exited=false — killing pid 10664
R7 exit code=null signal=SIGTERM after 5035 ms stdout="" stderr=""
log:
  start pid=10664
  BRIDGE_DAEMON_IDLE_MS is not a whole number of ms from 1 to 2147483647; using 600000
  config pid=10664 port=41994 idleMs=600000 build=795fb769…
  listening on 127.0.0.1:41994
```
stderr is empty: no TimeoutOverflowWarning. The oversize value falls back to the 600 000 ms default
and the daemon stays up. The `RangeError` in the constructor cannot be reached from `runDaemon`,
because `parseIdleMs` filters first.

**Cleanup**
- The worktree is deregistered. `git worktree remove` again could not delete the directory, so I
  removed it with `rm -rf` and ran `prune`.
- I deleted the temp home dirs.
- `tasklist | grep -i node` shows only PID 2928 (the known codex process).
- `netstat -ano | grep :9234` prints nothing.

**F1: resolved.** F2–F4 (NITs) are unchanged.

**Updated verdict: PASS-with-notes.** No CRITICAL, MAJOR or MINOR findings remain open; the three
NITs F2–F4 remain.
