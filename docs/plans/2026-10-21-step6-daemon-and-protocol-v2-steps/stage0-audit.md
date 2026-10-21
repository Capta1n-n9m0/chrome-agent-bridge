# Step 6 — Stage 0 spec audit

**Date:** 2026-10-21 · **Role:** auditor (Stage 0 builder), Claude Opus 5.5 (`claude-opus-5-5`) ·
**Baseline commit:** `1a92d95` · **Audited:** the phase doc
`docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md` (all, with its dated notes), the design spec
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (§4, §5, §9–§11 binding; §12–§13 context),
`docs/decisions.md` (2026-10-21 entries), `CLAUDE.md`, `docs/setup.md`, `docs/e2e-test-plan.md`, and
the Step 7 plan's "Prerequisite" paragraph. No feature code was written; nothing tracked was changed.

Glossary used below: **D0…D7** are the phase doc's stages (D0 shared types, D1 repository split, D2
daemon routing, D3 daemon lifecycle, D4 SDK, D5 MCP over the SDK, D6 the end-to-end wave with the
user, D7 docs). **D2.7** etc. are the pre-registered exit checks. **MUX-n / DL-n / CONN-n** are rows of
`docs/e2e-test-plan.md` (MUX = multiplexing rows Step 6 adds, DL = download rows, CONN = connection
rows that exist today). **G6-1…G6-3** are the phase doc's human gates. **0.1…0.10** are the phase
doc's decisions. **v1** = today's protocol/server; **v2** = the Step 6 protocol. **Fn** numbers the
findings in this file.

How to reproduce: every node/npm command needs
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first (Git Bash), run from
`/c/Users/aliev/Projects/chrome-remote-extention`. `$S` below is the scratchpad
`/c/Users/aliev/AppData/Local/Temp/claude/C--Users-aliev-Projects-chrome-remote-extention/a407b1a6-0dd7-44a3-ac0a-18226111b130/scratchpad`;
the experiment scripts named there are kept in it. TypeScript experiments are bundled with
`NODE_PATH="$(cygpath -w $PWD/node_modules)" npx esbuild "$(cygpath -w $S/<f>.ts)" --bundle --platform=node --format=cjs --external:bufferutil --external:utf-8-validate --outfile="$(cygpath -w $S/<f>.cjs)"`
then run with `node`. Every socket experiment binds port 0; nothing bound 9234. Only fake tokens were
used.

## Summary

| Severity | Count | Findings |
|---|---|---|
| CRITICAL | 0 | — |
| MAJOR | 8 | F1–F8 |
| MINOR | 17 | F9–F25 |
| NIT | 9 | F26–F34 |

Baseline (on `1a92d95`, this session): `npm run typecheck` exit 0; `npm test` exit 0 —
`Test Files 22 passed (22)`, `Tests 301 passed (301)`; `npm run build` exit 0 (`built server →
dist/index.js`, `built extension → dist/`); `git status --short` afterwards shows only
`?? docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/` (dist output is ignored).
`git diff -- extension/` is empty.

No premise of a 2026-10-21 ruling was found wrong (see "Rulings re-checked"). The two W0 leftovers are
recorded: the token-precedence line is **not** in any D5/D7 checkbox yet (F21, mechanical amendment
A11); the POSIX lifecycle stays unverified (recorded under F3, not blocking).

---

## Findings

### MAJOR

**F1 — A Step 6 client that knocks on a still-running pre-Step-6 server hijacks that server's
extension slot and never gets a welcome.** *Plan-side (blind spot in 0.7 / D4's knock state machine);
contract-level.*

The v1 host accepts any frame that passes `isHello` with the right token as *the extension*
(`server/src/wsHost.ts:61-71`: `validateHello` → `this.bridge.setConnection(connection)`), and
`isHello` ignores extra fields (`shared/src/protocol.ts:34-38`). So a v2 hello
`{type:"hello", token, role:"client", …}` is taken as a new extension connection: it replaces the real
extension on the old server's `Bridge`, the old session's next tool call is sent *to the SDK client*,
the client gets no `welcome`, and a `daemon.status` request gets no answer (v1
`ExtensionConnection.handleMessage` drops anything that is not a response). When the client's socket
closes, the old server is left with no connection at all while the real extension socket stays open
(it answers pings, so it never reconnects) — the old session stays broken. D5's 5 s connect retry
would repeat the hijack every 5 s.

Evidence — `$S/v1-vs-v2.ts` (baseline `WsHost` on port 0, a fake v1 extension, then a v2 client):
```
after extension hello: bridge connected = true
v2 client: frames received after hello = [] closed = null
bridge connection replaced by the v2 client = true
v2 client: frames after daemon.status = []
v2 client received request frame = ["{\"id\":\"1\",\"method\":\"snapshot\",\"params\":{}}"]
extension received request frame = []
old MCP snapshot call: rejected: Timed out after 500ms calling snapshot
```
When it happens: any pre-Step-6 `server/dist/index.js` still running (an old Claude session, or an
orphan — `docs/e2e-test-plan.md:537` records orphans on this machine) while a Step 6 MCP or script
knocks. The 0.7 diagram has no "connected, no welcome" branch, so `connect()` would hang.

Proposed resolution (contract-level → session agent, conservative rule of `long-run` §3): add a
welcome timeout to the knock (e.g. 2 s after `hello`); on expiry close the socket and reject with
`VERSION` and a message naming the cause ("port 9234 is held by a pre-Step-6 bridge server that sent
no welcome — end the old Claude session or stop the old `node …/server/dist/index.js`"); never spawn or
hand over in that case. Add a D4 test (fake server that accepts the hello and stays silent → `VERSION`
within the injected timeout) and a D6 row or MUX-8 note. The momentary hijack itself cannot be avoided
from the client side (v1 sends nothing before a hello), so `docs/setup.md` (D5.5/D7) must say "end
every pre-Step-6 session before starting a Step 6 one". The MCP's 5 s retry stays (forbidden fix), but
the stored reason should name this cause.

**F2 — "Resolved relative to the sdk package → `../daemon/dist/index.js`" (0.5) resolves to a path that
does not exist when the SDK is bundled into the MCP or run from source.** *Plan-side; design-local.*

`mcp/dist/index.js` will be an esbuild bundle containing the SDK, and scripts run the SDK from
`sdk/src/*.ts` via tsx, so `import.meta.url` is never "the sdk package directory":
```
$ node -e '…new URL("../daemon/dist/index.js", base+from)…'
relative ../daemon/dist/index.js from mcp/dist/index.js -> /C:/…/chrome-remote-extention/mcp/daemon/dist/index.js
relative ../daemon/dist/index.js from sdk/src/knock.ts -> /C:/…/chrome-remote-extention/sdk/daemon/dist/index.js
relative ../daemon/dist/index.js from sdk/dist/index.js -> /C:/…/chrome-remote-extention/sdk/daemon/dist/index.js
```
A wrong path means the SDK hashes a missing file and spawns nothing — every knock with no daemon
running fails after 10 s.

Proposed resolution (design-local, keeps 0.5's intent): resolve the daemon as
`<workspace root>/daemon/dist/index.js`, where the workspace root is found by the same walk-up 0.9
uses for `bridge.token` (first directory whose `package.json` has `"workspaces"`); `BRIDGE_DAEMON`
still overrides. Specify what happens when the file is missing (proposed: reject before knocking with
"daemon not built — run `npm run build`", never connect-and-skip-the-check). Test the resolver in D4
over a temp tree, including the bundled-location case.

**F3 — `taskkill /T` (process-tree kill) on the session that spawned the daemon kills the "detached"
daemon too; MUX-7's expected result can be false, and the daemon's persistence depends on how Claude
Code ends its MCP servers on Windows.** *Plan-side (blind spot in 0.8 / spec §12 / MUX-7);
contract-level (0.8 is a design-of-record decision) → escalate.*

Windows keeps `ParentProcessId`; `taskkill /T` walks it. A child spawned exactly as 0.8 says
(`process.execPath`, `detached: true`, `stdio: "ignore"`, `windowsHide: true`, `unref()`):

- survives its parent and the nvm shim exiting normally (`$S/detach-survive.cjs`: child pid 22164 still
  listed by `Get-Process` after parent + shim exited; `IsProcessInJob` = False, so the shim's job does
  not hold it);
- **dies** when the tree is killed while the parent is alive (`$S/tree-parent.cjs`):
  ```
  child ParentProcessId=20040
  SUCCESS: The process with PID 32804 (child process of PID 20040) has been terminated.
  SUCCESS: The process with PID 20040 (child process of PID 16720) has been terminated.
  SUCCESS: The process with PID 16720 (child process of PID 24412) has been terminated.
  16720 gone / 20040 gone / 32804 gone
  ```
- survives the same tree kill when spawned through a launcher that exits at once (double spawn, so
  the daemon's parent pid names a dead process) (`$S/tree-parent2.cjs`): `8472 gone / 11332 gone /
  30020 alive`.

Claude Code itself uses tree kills for some children on Windows: the binary at
`~/.local/bin/claude.exe` contains `dt("taskkill",["/T","/F","/PID",String(ce.pid)])`
(`grep -a -o -E ".{0,160}taskkill(\.exe)?[\"'\`].{0,200}"`). Whether MCP stdio servers are among them
was **not** established (no live session was used). If they are, the daemon dies whenever the session
that spawned it ends, every other client sees close 1006 (not 4002), and per 0.7 scripts error out.
Also measured: Claude Code-side processes are in a Job object (`IsProcessInJob` True for the real node
under the shim), the shim is not, and the detached child is not.

Proposed resolution (contract-level → session agent / user): keep 0.8 as written for the autonomous
stages (conservative: undoable, nothing ships live before D6), but (a) amend MUX-7 to name the kill
method and expected result per method (`taskkill /T` while the MCP lives vs. ending the session
normally vs. killing the shim alone), and add a D6 measurement "end a Claude session normally and check
the daemon it spawned is alive (`Get-Process -Id <daemon pid>`)"; (b) put "double spawn via a
short-lived launcher" in front of the user as the fallback if D6 shows the daemon dying with its
session. POSIX: `detached` there means `setsid`, so a tree kill by process group does not reach it —
**unverified**, recorded, not blocking (the W0 open item).

**F4 — D1 never says where the MCP entry (`server/src/index.ts`) goes, yet D1 must end with a green
build and `docs/setup.md` pointing at `mcp/dist/index.js`.** *Plan-side (builder ambiguity);
design-local.*

`server/src/index.ts` is both the MCP entry and the WebSocket host (it imports `WsHost`, `Bridge`,
`startWsHost`, `registerTools`, `installLifecycle`, `loadConfig` — `server/src/index.ts:1-8`). D1 moves
`tools/registry.ts`, `lifecycle.ts`, `config.ts` to `mcp/` and keeps `wsHost`/`bridge`/`startup` in
`daemon/`; `daemon/build.mjs` builds `src/index.ts` (`server/build.mjs:4`); the "Files touched" list
calls `daemon/src/index.ts` "daemon entry" (a D3 item) and `mcp/src/index.ts` new (a D5 item). Also
`server/test/tools.test.ts:4` imports the runtime `Bridge` class, and `registry.ts:3` imports the
`Bridge` type, so the moved MCP files need `daemon/` code until D5, while D1 lists `mcp`'s dependencies
as `@bridge/sdk, @bridge/shared, MCP SDK, zod` only.

Proposed resolution (design-local, "moves and manifests only" kept): D1 `git mv`s
`server/src/index.ts` → `mcp/src/index.ts` (same code, same in-process host) and copies
`server/build.mjs` to `mcp/build.mjs` (entry `src/index.ts` → `mcp/dist/index.js`, same
`external: ["bufferutil","utf-8-validate","ws"]`); `mcp` gets a **temporary** dependency on
`@bridge/daemon` (subpath exports for `bridge`, `wsHost`, `startup`, like `shared`'s TS-source
`exports`), removed in D5; `daemon/` has no `src/index.ts` and no `build` script until D3 (root `build`
= `mcp` + `extension` in D1, + `daemon` from D3). See the D1 move map below.

**F5 — Exit checks D3.1 and D5.1 cannot both hold once `startup.ts`'s 5 tests are deleted, and
that deletion is scheduled (D3 checkbox, D3.4, D5's lane).** *Plan-side; mechanical text, but it edits a
pre-registered exit check → needs the session agent's sign-off.*

`server/test/startup.test.ts` has 5 tests (vitest JSON reporter, table below). D3.1 says "after ≥
before + the idle/build/log tests"; D5.1 says "after ≥ before". Deleting 5 tests makes the stage's
count `before − 5 + new`, which fails D3.1 as written (and D5.1 if D5 deletes and adds fewer than 5),
and also trips the STOP rule "test count drops without a documented move". Under F4's resolution the
interim MCP entry still imports `startWsHost` until D5, so the deletion lands in D5.

Proposed amendment (A9): D3.1 unchanged if D3 keeps `startup.ts` (D3.4's "note says why they stay");
D5.1 → "`npm test` after ≥ before − 5 (the deleted `startup.test.ts`, named in the stage report as a
documented removal) + the new D5 tests; typecheck and build green."

**F6 — D5 must rewrite three `browser_status` tests whose expected text describes the in-process
WebSocket host; as written that looks like a forbidden fix.** *Plan-side (builder ambiguity);
design-local.*

`server/test/tools.test.ts:201-239` assert `listening on 127\.0\.0\.1:9234`, `not listening`,
`EADDRINUSE`, `extension: (not )?connected` from `bridge.hostState` / `unavailableReason()`, which no
longer exist in the MCP after D5 (D5's checkbox changes `browser_status` to print `daemon.status`). The
forbidden-fix list says "editing a test's expected message text to match a changed error instead of
keeping the message"; 0.4 says "tests that matched message strings keep passing".

Proposed resolution (design-local, recorded in decisions.md by the session agent): the three
`browser_status` tests are a **planned output change** (D5 checkbox), not an error-message edit; D5
replaces them one-for-one (count kept) with tests of the new output, keeping the substrings that still
apply (`extension: connected`, `extension: not connected`, the active-tab line). Every other
message-matching test (`bridge.test.ts:8,35,43`, `connection.test.ts:23,30,42,49,57`,
`wsHost.test.ts:140`, `tools.test.ts:293,342`) keeps its expected text.

**F7 — Where the +5 000 ms slack is added, and what the SDK client's own timer is, is unspecified;
the existing test pins the MCP to adding it.** *Plan-side (builder ambiguity); design-local.*

Today the MCP adds the slack itself: `registry.ts:205` passes `{ timeoutMs: pageTimeoutMs +
SERVER_TIMEOUT_SLACK_MS }`, pinned by `tools.test.ts:263` "gives the server 5s more than the page
timeout"; `download.ts:61` adds `+ 5_000` too. 0.3 adds a daemon-side `timeoutMs + 5000`. If the MCP
keeps sending page+5 000 as the envelope `timeoutMs`, the daemon waits page+10 000 (harmless). But the
plan never says what `BridgeClient.call`'s own timer is: if it equals the envelope `timeoutMs` (or the
30 s default), the client times out **before** the daemon, leaving the daemon's pending entry and
giving a client-side message instead of the daemon's `TIMEOUT`. Also unspecified: whether an absent
`timeoutMs` means 30 000 or 30 000 + 5 000 at the daemon.

Proposed resolution (design-local; conservative = every existing test unchanged): the MCP keeps its
call sites and `tools.test.ts:263` as they are; the daemon waits `clamp(timeoutMs ?? 30000, 100,
600000) + 5000`; `BridgeClient` waits that same value plus a 1 000 ms margin so the daemon always
answers first. Test both in D2 (D2.5) and D4.

**F8 — A close code other than 4002 reaches clients in normal operation, and neither the daemon's
shutdown flush nor the MCP's behaviour after such a close is specified.** *Plan-side (blind spot);
design-local.*

(a) `ws` closes need a completed close handshake to deliver the code. Measured with ws 8.21.0
(`$S/ws-close.ts`): `4001 "invalid token"` and `4002 "upgrading"` arrive with their reasons when the
server calls `socket.close(code, reason)`; `wss.close()` alone leaves connected clients **open**
(`client readyState = 1`) and its callback fires only after the last socket closes. Today's
`WsHost.close()` (`wsHost.ts:87-93`) uses `terminate()`, which sends no close frame (clients see 1006).
If `daemon.shutdown` calls `process.exit` before the 4002 frames are flushed, clients see 1006 and,
per 0.7, do **not** reconnect — the handover silently strands every other client.
(b) D3 sends 1001 on SIGINT/SIGTERM/SIGBREAK; F3 adds 1006 on a tree kill. 0.7 makes those an error
"to the script"; for the MCP the plan only says "failure to connect must not crash … retry `connect()`
every 5 s" (D5), not what happens when an established connection drops.

Proposed resolution (design-local): `host.shutdown(code)` = stop accepting (`wss.close`), `close(code,
reason)` every client and the extension, wait for their `close` events (bounded, e.g. 1 s, then
`terminate`), then exit; D2's 4002 test asserts the code **and** reason on the client. The MCP treats
any post-connect close other than 4002 like a failed connect (store the reason, retry every 5 s) — the
no-crash rule extended; scripts keep 0.7's "error on any other close".

### MINOR

**F9 — `NOT_CONNECTED_MESSAGE` does not exist.** *Plan-side; mechanical.* 0.2 (line 92) cites "the
`NOT_CONNECTED_MESSAGE` in `server/src/bridge.ts`". The constant is `NOT_CONNECTED`, module-private:
`grep -n "NOT_CONNECTED" server/src/bridge.ts` → `3:const NOT_CONNECTED =` and
`44:    if (!this.connection) throw new Error(this.reason ?? NOT_CONNECTED);`; text
`"Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?"`
(`bridge.ts:4`). Amendment A1. Builder note: `Bridge.call` throws a plain `Error`, so route.ts cannot
tell `NOT_CONNECTED` from other failures unless `Bridge.call` throws a `BridgeError` with that code
(0.4) — see Builder ambiguities B5.

**F10 — 0.3 says only `browser_evaluate` passes a per-call timeout; `browser_download` does too.**
*Plan-side; mechanical (also `CLAUDE.md:151-153`, which D7 rewrites).* `server/src/download.ts:61`:
`call("downloadStart", { url: opts.url, timeoutMs }, { timeoutMs: timeoutMs + 5_000 })`, with
`timeoutMs` up to 600 000 (`registry.ts:221` `.max(600000)`), so the call option reaches 605 000 —
above 0.3's `[100, 600000]` bound, which clamps it to 600 000 and then waits 605 000: the same total as
today. Amendment A2.

**F11 — "Only one process may own port 9234 … any stage whose tests bind a real socket (D2, D3)
serialises" — no test binds 9234.** *Plan-side; mechanical.* `grep -rn "9234\|port: [1-9]"
server/test shared/test extension/test` shows 9234 only as a string in assertions
(`bridge.test.ts:34-35,60-61`, `startup.test.ts:38-54`, `tools.test.ts:204-208`); every host binds
`port: 0` (`wsHost.test.ts:35,52,81,120,133`; `startup.test.ts:22-26` binds 0 then reuses that port).
D2/D3 still serialise — on files. Amendment A3.

**F12 — "Files touched" disagrees with D1, 0.10 and D3.** *Plan-side; mechanical.* Line 56 puts
`download.ts` in `mcp/src/` "(moved → later to sdk)", but 0.10 and the D1 checkbox move it to `sdk/` in
D1; line 57 lists only `test/tools.test.ts` for `mcp/` while D1 also moves `test/lifecycle.test.ts`;
line 51 says `startup.ts` gets "no retry in daemon mode" while D3 says it is deleted with its test.
Amendment A4 (download/lifecycle); the `startup.ts` line is covered by B2.

**F13 — D1 never runs `npm install`; after `git mv server daemon` the workspace link dangles.**
*Plan-side; mechanical.* On the scratch branch, after `git mv server daemon`:
`ls node_modules/@bridge/server/` → `No such file or directory` (the link
`node_modules/@bridge/server -> …/server` points at the moved directory); `package-lock.json` lists
`"server"` and `node_modules/@bridge/server` (lines 12-14, 50-51). New `@bridge/daemon`, `@bridge/sdk`,
`@bridge/mcp` links exist only after `npm install`. Also measured: `git mv server daemon` carries the
**ignored** `server/dist/` along (`git status --short --ignored daemon` → `!! daemon/dist/`), so a
stale `daemon/dist/index.js` (today's MCP bundle) exists right after the move until D3 rebuilds it.
Amendment A5.

**F14 — Stale `server/dist` and "one session" text outside D1.3's and D7.1's greps.** *Plan-side;
mechanical.* `grep -n "server/dist" docs/setup.md README.md CLAUDE.md docs/e2e-test-plan.md
start-bridge.sh` → `setup.md:18,36,46,262` (the four lines the plan names), and also
`e2e-test-plan.md:19,23` (setup steps), `:88` (row CONN-7), `:380,537` (dated run records — leave),
`start-bridge.sh:20`. Rows that become false under Step 6 and are not scheduled: **CONN-3** ("stop and
restart the MCP server → SW logs `connection: down` then `up`" — an MCP restart no longer restarts the
host) and **CONN-7** (busy-port self-heal in the MCP — the mechanism is removed). D7.1's pattern
`"one Claude session\|server/dist\|server/src"` misses `CLAUDE.md:228` ("treat "one session at a time"
as temporary") and `CLAUDE.md:91` ("a 2nd session causes `EADDRINUSE`"). Other occurrences found:
`setup.md:265`, `CLAUDE.md:93`, `server/src/index.ts:17,34`, `server/src/startup.ts:15`,
`e2e-test-plan.md:539` (run record — leave). Amendments A6, A7. `start-bridge.sh` is a macOS-only TODO
script (its own header says so); proposed: D7 either updates its last line to `mcp/dist/index.js` or
records it as a known stale helper.

**F15 — D0.4 ("each new test fails with the change reverted, verifier re-runs with a stash") cannot
hold for the "v2 hello accepted" test, and a plain stash misses new files.** *Plan-side; mechanical.*
Baseline guards on v2 frames (`$S/guards.ts`):
```
baseline isHello(v2 hello) = true
baseline isHello(hello with unknown role) = true
baseline validateHello(unknown role, right token) = {"ok":true}
baseline isResponse(event frame) = false
baseline isResponse(welcome frame) = false
baseline isResponse(request frame) = false
```
So D0.2's "a v2 hello accepted by `isHello`" passes on the baseline — it is a regression guard, not a
discriminating test. `git stash` without `-u` leaves the new untracked `codes.ts`/`error.ts` in place.
Type-only changes (`role?`, `timeoutMs?`) cannot fail any vitest test (vitest does not typecheck).
Amendment A8.

**F16 — D3.5's grep cannot catch the most likely bind retry.** *Plan-side; mechanical.* `startWsHost`
retries every 5 s **by default** (`startup.ts:26` `const retryMs = options.retryMs ?? 5000;`), so a
daemon entry calling `startWsHost(host)` passes `grep -rn "retry\|setInterval" daemon/src/index.ts`.
Amendment A10.

**F17 — D5.4 expects a non-empty `lifecycle.ts` diff, but the shutdown call is not in `lifecycle.ts`.**
*Plan-side; mechanical.* `lifecycle.ts` takes `shutdown` as an option
(`server/src/lifecycle.ts:11`); the WS-host shutdown is in the entry, `server/src/index.ts:54-59`
(`started.stop(); await host.close(); …`). So the correct D5.4 result is an **empty** diff. Amendment
A12.

**F18 — D0's lane excludes `shared/package.json`, but new modules are only reachable through it.**
*Plan-side (builder ambiguity); design-local.* `shared/package.json`: `"main": "src/protocol.ts",
"exports": { ".": "./src/protocol.ts" }`. New `codes.ts` / `error.ts` are importable as
`@bridge/shared` only if re-exported from `protocol.ts` or added to `exports`. Proposed: re-export
from `protocol.ts` (`export * from "./codes.js"; export * from "./error.js";`) — stays in D0's lane, and
the extension (which imports only types from `@bridge/shared`: `grep -rn "@bridge/shared"
extension/src` → 7 `import type` lines) is unaffected.

**F19 — D3's fallback "if D4 has not landed, D3 stubs the import and D5 wires it" crosses D5's lane.**
*Plan-side; design-local.* D5's lane is `mcp/src/`, `mcp/test/` (+ deleting `startup.ts`), not
`daemon/src/`. Proposed: run D4 before D3 (D4 needs only D0, so the order D0 → D1 → D2 → D4 → D3 → D5,
or D4 in parallel with D2, costs nothing) so D3 imports the real `token.ts`; no stub, no lane crossing.

**F20 — D0 ∥ D1 entangles counts and typecheck.** *Plan-side; design-local.* D1.1 is "after == before"
with before = D1's starting commit; if D0 commits while D1 runs, D1's count includes D0's tests. D0's
verifier focus says "`npm run typecheck` passes for `server/` … unchanged", which does not exist once D1
lands. Proposed: run D0 then D1 sequentially (D0 is small), or define D1.1's before as "baseline 301 +
the D0 tests in the tree" and D0's typecheck target as "whichever of `server/`/`daemon/`+`mcp/`+`sdk/`
exists".

**F21 — Token file: precedence not scheduled in a checkbox, and no `bridge.token` exists on this
machine.** *Plan-side; mechanical (A11) + wave prep.* `grep -n "precedence\|bridge.token" docs/setup.md`
→ nothing (setup only knows `BRIDGE_TOKEN` env, lines 37, 46). The W0 open item says setup.md must
state "env wins" in D5/D7; neither checkbox says so. `ls bridge.token` → `No such file or directory`
(the token today lives only in the MCP config's env). MUX-3, MUX-5 and MUX-6 run scripts that have no
MCP config, so they need either `BRIDGE_TOKEN` in the shell or a `bridge.token` the user creates
(gitignored: `git check-ignore -v bridge.token sdk/bridge.token` → `.gitignore:16:bridge.token`). The D6
row preconditions must say so; the run never creates or reads the real file (G6-3).

**F22 — `tsx` is not installed, but MUX-3 runs `npx tsx recipes/hello.ts`.** *Plan-side; design-local.*
`ls node_modules/tsx` → `No such file or directory`; no `package.json` lists it (spec §11: "Scripts run
with `tsx` (dev dependency)"). `npx` would download it at wave time. Proposed: add `tsx` as a root
devDependency in D1 (root `package.json` is in D1's lane); `recipes/` is outside every typecheck —
D6 may add `recipes/` to a tsconfig or accept that.

**F23 — Only `daemon.status` and `daemon.shutdown` are intercepted; any other `daemon.*` call is
forwarded to the extension.** *Plan-side; design-local.* The unchanged extension answers a forwarded
daemon method with `unknown method: …` (`$S/router-welcome.ts`:
`daemon.status forwarded by mistake -> {"id":"7","error":{"message":"unknown method: daemon.status"}}`),
which the daemon then wraps as `INTERNAL` — the stale-extension symptom from `CLAUDE.md`, now caused
by the daemon. The plan/spec name these daemon-local methods: Step 6 — `daemon.status`,
`daemon.shutdown` (both intercepted ✓); Step 7 — `tabs.claim`, `tabs.release`; follow-up —
`daemon.clients`. Proposed: route.ts answers every `daemon.`-prefixed method it does not implement with
`UNKNOWN_METHOD` (spec §10 daemon code) instead of forwarding.

**F24 — Port and path consistency across clients is unenforced.** *Plan-side (blind spot);
design-local.* The spawn passes the spawner's `BRIDGE_PORT` (0.8) and the knock uses the same config,
so one client is self-consistent; but an MCP with `BRIDGE_PORT=9235` and a script on the default 9234
start two daemons, and the extension (one port in Options) reaches only one — the other client waits
15 s and gets the "is Chrome open" text, which misleads. Proposed: the `NOT_CONNECTED` text from
`connect()` names the port it waited on. `BRIDGE_DAEMON` given as a Git-Bash path is mis-resolved by
Node on Windows: `path.win32.resolve('/c/Users/aliev')` → `"C:\\c\\Users\\aliev"` (`$S/walkup.cjs`);
setup.md (D7) should say "native Windows path". Walk-up termination is fine: `path.win32.dirname('C:\\')`
→ `"C:\\"`, UNC root `\\srv\share\` → itself, `posix.dirname('/')` → `"/"`; a loop that stops when
`dirname(dir) === dir` ends at `C:\` after 7 steps from `sdk\src`.

**F25 — PID 2928 is not Claude Code's node.** *Fact correction for the journal; mechanical.* The
kickoff journal and this brief call the one `node.exe` "Claude Code's own". `Get-CimInstance
Win32_Process -Filter "Name='node.exe'"` → `2928 parent=12932
C:\Users\aliev\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe …\@oai\artifact-tool\dist\artifact-session\host-daemon.mjs`.
Claude Code runs as `claude.exe` (pids 32676, 20208). It does not hold 9234 (`netstat -ano | grep
":9234 "` → empty), predates the run, and was not touched — not an escalation, but the journal's label
is wrong.

### NIT

**F26** — 0.1's rationale says `ExtensionConnection` "already fit[s] clients"; it is a *requester*
(sends requests, resolves responses — `connection.ts:23-52`), while for clients the daemon is the
responder; D2 adds a `ClientConnection`. Rationale text only; not reopened.

**F27** — `lifecycle.ts`'s comments (`lifecycle.ts:25-28`) talk about the WebSocket server and port
9234; under D5's "byte-identical" rule they stay, stale. Accept, or let D7 note it.

**F28** — The existing bad-token test asserts only `code > 0` (`wsHost.test.ts:86`
`resolves.toBeGreaterThan(0)`); D2.2 needs an exact `4001` assertion (the code is set at
`wsHost.ts:65`, reasons `"expected hello handshake"` / `"invalid token"` at `handshake.ts:10,12,13`).

**F29** — Spec §9.4 sends the extension "the same welcome", whose shape requires `clientId`; the
extension is not in the registry. Proposed: `clientId: "extension"`. The v1 extension ignores the
frame either way (`$S/router-welcome.ts`: `welcome -> null`, `event -> null`).

**F30** — Phase doc lines 6-7 say the steps dir "does not exist yet"; it exists since kickoff.

**F31** — `extension/tsconfig.json` includes only `src`, so extension tests are never typechecked, and
vitest strips types: type-only protocol changes have no runtime test anywhere (pre-existing).

**F32** — `git branch` shows a pre-existing `feat/agent-bridge` (`git log -1 --format='%h %ci %s'
feat/agent-bridge` → `ae3945f 2026-06-04 … docs: record E2E validation + runtime fixes; add
CLAUDE.md`); the brief expected only `main`. Not created by this audit.

**F33** — Step 7's prerequisite re-examines "Step 6's as-built register by execution — welcome shape,
`extensionStatus` event, close code 4002, the error envelope". D7 should make sure the as-built lists
exactly those four contracts with the test that exercises each.

**F34** — The daemon's 30 s ping applies to clients (D2): a script that blocks its event loop for
roughly 30–60 s misses a pong and is terminated (close 1006 → an error under 0.7). Worth one line in
the SDK's JSDoc / setup.md.

---

## Confirmed (no finding)

Each row was executed in this session; re-run with the PATH line above.

| Cited fact | Command | Result |
|---|---|---|
| 21 MCP tools | `grep -c "server.tool(" server/src/tools/registry.ts` | `21` |
| 301 tests, 22 files | `npm test` | `Test Files 22 passed (22)` / `Tests 301 passed (301)` |
| Per-package files/tests | `npx vitest run --reporter=json --outputFile=$S/vitest.json; node $S/count.cjs "$(cygpath -w $S/vitest.json)"` | shared 1 file / 4; server 8 / 86; extension 13 / 211; `TOTAL 301 files 22 passed 301` |
| `SERVER_TIMEOUT_SLACK_MS = 5_000` | `grep -n SERVER_TIMEOUT_SLACK_MS server/src/tools/registry.ts` | `9:const SERVER_TIMEOUT_SLACK_MS = 5_000;`, used at `205` |
| `ExtensionConnection`, per-call `timeoutMs`, 30 s default | `grep -n "timeoutMs\|30_000" server/src/connection.ts` | `20: private readonly timeoutMs = 30_000`, `27: const timeoutMs = options?.timeoutMs ?? this.timeoutMs;` |
| Per-call timeout tests | `npx vitest run server/test/connection.test.ts` | 7 passed, incl. "uses a per-call timeoutMs when given" |
| 600 000 upper bound exists today (download) | `grep -n "600000" server/src/tools/registry.ts` | `221: …max(600000)…` |
| Heartbeat test pattern | `grep -n "heartbeatMs\|autoPong" server/test/wsHost.test.ts`; `npx vitest run server/test/wsHost.test.ts -t pings` | `120,133: heartbeatMs: 30`, `135: autoPong: false`; 2 passed |
| Heartbeat default 30 000 | `grep -n "30_000" server/src/wsHost.ts` | `58: }, this.options.heartbeatMs ?? 30_000);` |
| Bind `127.0.0.1` | `grep -n "127.0.0.1" server/src/wsHost.ts` | `28: new WebSocketServer({ host: "127.0.0.1", port: this.options.port })` |
| Close code 4001 and its texts | `grep -n "4001" server/src/wsHost.ts; grep -n "reason:" server/src/handshake.ts` | `65: ws.close(4001, result.reason)`; reasons `expected hello handshake`, `invalid token` |
| Port 9234 default, token env-only | `cat server/src/config.ts` | `env.BRIDGE_PORT ?? "9234"`, `env.BRIDGE_TOKEN ?? ""` (no file lookup today — 0.9 is new) |
| MCP SDK version and the handler quirk | `grep -m1 '"version"' node_modules/@modelcontextprotocol/sdk/package.json; sed -n 606,620p node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` | `1.29.0`; `registeredTool = { … handler: handler, …}` (line 616), stored at `this._registeredTools[name] = registeredTool` (649), called via `tool.handler` (111, 212, 250) |
| Tool tests use the quirk | `npx vitest run server/test/tools.test.ts -t "registers browser_navigate"` | passed; test reads `._registeredTools["browser_navigate"]` (`tools.test.ts:22-23`) |
| `ws` version, `autoPong` option | `grep -m1 '"version"' node_modules/ws/package.json; grep -n autoPong node_modules/ws/lib/websocket.js` | `8.21.0`; `637` doc, `670: autoPong: true` default, `1251` honoured |
| 4001/4002 delivered with reason; `wss.close()` semantics | `$S/ws-close.ts` (bundle + run) | `4001 "invalid token"`, `4002 "upgrading"`; after `wss.close()` client `readyState = 1`, callback only after last socket closed |
| esbuild `external: ["ws"]` | `cat server/build.mjs` | `external: ["bufferutil", "utf-8-validate", "ws"]` |
| `lifecycle.ts` parent check | `sed -n 70-99p server/src/lifecycle.ts`; `npx vitest run server/test/lifecycle.test.ts -t parent` | `currentParentPid() !== parentPid \|\| !isAlive(parentPid)`; `process.kill(pid, 0)`, EPERM = alive; 3 passed |
| `startup.ts` retry, 5 s | `grep -n "retryMs" server/src/startup.ts; grep -n BIND_RETRY_MS server/src/index.ts` | `26: options.retryMs ?? 5000`; `10: const BIND_RETRY_MS = 5000;` |
| Offscreen `ReconnectingClient` backoff 0.5–10 s (spec §9.5) | `grep -n "backoffMs" extension/src/client.ts` | `13: backoffMs = 500`, `40: reset on open`, `54: Math.min(this.backoffMs * 2, 10_000)` — so a fresh daemon sees the extension within ≤ 10 s, inside the 15 s `waitForExtensionMs` |
| v1 extension sends a hello without `role` | `sed -n 39-43p extension/src/client.ts` | `ws.send(JSON.stringify({ type: "hello", token: this.opts.token }))` |
| Extension router ignores a welcome / event (spec §9.4) | `$S/router-welcome.ts` (bundle + run) | `welcome -> null`, `event -> null`; empty-string id → `null` (the daemon must never forward `id: ""`) |
| Extension `connection: down` log (MUX-4) | `grep -n "connection:" extension/src/sw.ts` | `136: connection: up`, `137: connection: down` |
| Protocol message kinds today | `grep -n "^export" shared/src/protocol.ts` | wire: `RequestMessage`, `SuccessResponse`, `ErrorResponse {message}`, `ResponseMessage`, `HelloMessage {type, token}`; guards `isResponse`, `isErrorResponse`, `isHello`; payload types `EvalEnvelope`, `NetworkEntry`, `DownloadStartResult`, `DownloadChunkResult`, `NetworkRequestsResult` |
| Spec §10 codes == D0.3 codes (9 daemon + 13 extension) | `sed -n 315,318p <spec> \| grep -oE '\b[A-Z][A-Z_]{3,}\b' \| sort` vs `sed -n 387,390p <plan> \| …`; `diff` | 22 each, `identical code sets`; spec §5 lists the same 9 daemon codes |
| `setup.md` lines naming `server/dist` | `grep -n "server/dist" docs/setup.md` | `18, 36, 46, 262` |
| `setup.md` line 36 is the MCP config path (G6-1) | same | `"args": ["<absolute-path-to-repo>/server/dist/index.js"]` |
| `selectTab` at `registry.ts:145` (decision #2b) | `grep -n selectTab server/src/tools/registry.ts` | `145: await bridge.call("selectTab", { id });` |
| Phase doc has 45 checkboxes (decision #4) | `grep -c '^ *- \[ \]' <plan>` | `45` (D0 4, D1 5, D2 7, D3 5, D4 6, D5 4, D6 10, D7 4) |
| Three root scripts, three workspaces today | `cat package.json` | `typecheck`, `test`, `build`; `workspaces: ["shared","server","extension"]` |
| `vitest` already picks up `*/test/**` | `cat vitest.config.ts` | `include: ["**/test/**/*.test.ts"]` — covers `daemon/ sdk/ mcp/` without change |
| `.gitignore` covers new outputs | `git check-ignore -v daemon/dist/index.js mcp/dist/index.js sdk/dist/index.js bridge.token sdk/bridge.token recipes/out.log` | all ignored (`dist/`, `bridge.token`, `*.log`); `recipes/hello.ts` not ignored |
| `git mv` keeps `--follow` history | scratch branch: `git mv server/src/lifecycle.ts mcp/src/lifecycle.ts`, commit, `git log --follow --oneline -- mcp/src/lifecycle.ts` | `1a853e7 tmp…` + `af2835d fix(server): exit with the Claude session instead of orphaning`; without `--follow` only the tmp commit |
| D1.2 on the directory rename | scratch: `git mv server daemon`, commit, `git log --follow --oneline -- daemon/src/wsHost.ts` | rename commit + `d9a0ba0`, `0a41a16`, `57598ff` (all 3 pre-move commits; `main` shows 3) |
| Rebuild while a daemon runs (MUX-5 premise) | `$S`: run a node script, overwrite / rename / delete its file meanwhile | `overwrite while running: OK`, `rename … OK`, `delete … OK` |
| No test binds 9234 | `grep -rn "9234\|port: [1-9]" server/test shared/test extension/test` | 9234 appears only inside strings/assertions; hosts use `port: 0` |
| `git diff -- extension/` empty | `git diff --stat -- extension/` | empty (start and end of the audit) |

### Rulings re-checked (premise only)

| Ruling (phase doc "Open items") | Premise | Command | Result |
|---|---|---|---|
| Actor name uses the MCP's own `process.pid` | under the nvm shim `process.ppid` is the shim | `node $S/parent.cjs` | `self pid 14792 ppid 1520 execPath …\nvm\installs\v25.2.1\node.exe`; `parent 1520 33588 node.exe …\nvm\.nodejs\node.exe` (the 766 KB shim in `.shim/`); `grand 33588 … bash.exe` — premise holds; `process.execPath` is the real node (0.8 premise holds) |
| Step 7 T1 `activeTab()` ×4 in actions.ts, 13 in handlers | count | `grep -rn "activeTab()" extension/src/handlers` | actions.ts lines 6, 12, 39, 85; 13 in total — holds |
| Fixture has no `_blank` button (decision #6) | absence | `grep -n "_blank\|target=" test-fixtures/*.html` | no output — holds |
| No `DL` rows yet (decision #5) | absence | `grep -c "DL-" docs/e2e-test-plan.md` | `0` — holds; the families present are ACT, CONN, EVAL, HIST, NAV, NET, PERC, REAL, SEC, SMOKE, STAT, TAB, TRUST, WAIT (a `UTF-` hit is `charset=UTF-8`, line 595) — matches the plan |
| MUX-9 regression rows exist | ACT-1/2, TRUST-2, EVAL-1, NET-1 | `grep -n "^\| ACT-1 \|^\| ACT-2 \|^\| TRUST-2 \|^\| EVAL-1 \|^\| NET-1 " docs/e2e-test-plan.md` | lines 117, 118, 131, 157, 192 — DL-1 is written by D6 |
| `connection.ts` changes per 0.4 | it rejects with plain `Error` today | `grep -n "new Error" server/src/connection.ts` | lines 31, 50, 57 — the change is real work |
| `extensionStatus` emit is a D2 checkbox | present | phase doc lines 231-234, exit check D2.7 line 413 | holds |
| One handover then `VERSION` | carried by D4 and D4.2 | phase doc lines 276-278, 431-432 | holds |
| `windowsHide` + `stdio:"ignore"` do not surface the token (0.8, G6-3) | env not on a console or command line | `node $S/spawn-exp.cjs` (FAKE token) | `stdout/stderr handles: null null`; `child CommandLine contains FAKE token: false`; the child saw `env=FAKE-TOKEN-… port=59999`; its `console.log` reached nobody. The env remains readable by same-user processes — the same exposure as the MCP config's env today |

---

## Testability of the exit checks

"Can fail" = a wrong implementation would make it fail. Unit = no keyboard; E2E = the user's wave.

| Check | Executable? | Discriminating? | Unit / E2E | Note |
|---|---|---|---|---|
| D0.1 | yes | yes | unit | count must rise |
| D0.2 | yes | partly | unit | the "v2 hello accepted by `isHello`" item **cannot fail** (baseline already accepts it, F15); keep as a regression guard |
| D0.3 | yes | yes | unit | compare `Object.values(ErrorCodes)` with the 22 spec codes |
| D0.4 | yes, as amended (A8) | yes for new-behaviour tests | unit | plain `git stash` misses new files; use `-u` |
| D1.1 | yes | yes | unit | needs `npm install` first (F13); define "before" if D0 lands mid-D1 (F20) |
| D1.2 | yes | yes | unit | verified on a scratch branch |
| D1.3 | yes | yes | unit | coverage gap: `e2e-test-plan.md`, `start-bridge.sh` (F14) |
| D1.4 | yes | yes | unit | `git mv` also moves the ignored `server/dist` (F13), so `ls server` does fail |
| D1.5 | yes | yes | unit | |
| D2.1 | yes | yes | unit | |
| D2.2 | yes | yes | unit | bad token must assert exactly 4001 (F28); unknown role is discriminating (baseline accepts it, F15) |
| D2.3 | yes | **cannot fail against today's code** | unit | v1 `handleMessage` already drops events (`isResponse(event) = false`); a guard against regressions only. The "logged as a count" part is untested |
| D2.4 | yes | weakly | unit | only catches a literal `url`/`href`/`token` on the console line; a variable holding a URL passes |
| D2.5 | yes | yes | unit | specify the absent-`timeoutMs` default (F7) |
| D2.6 | yes | yes | unit | |
| D2.7 | yes | yes | unit | emit `connected:false` only when the *current* extension socket closes (B7) |
| D3.1 | yes | yes | unit | conflicts with deleting `startup.test.ts` if done in D3 (F5) |
| D3.2 | yes | yes | unit | |
| D3.3 | yes | yes | unit | other daemon files keep `console.error` (`wsHost.ts:43,52`); harmless with no stdio |
| D3.4 | yes | **cannot fail** (either outcome passes with a note) | unit | acceptable as a record |
| D3.5 | yes, as amended (A10) | as written, no | unit | default 5 s retry slips past the grep (F16) |
| D3.6 | yes | yes | unit | |
| D4.1 | yes | yes | unit | |
| D4.2 | yes | yes | unit | add the "no welcome" case (F1) and the resolver case (F2) |
| D4.3 | yes | yes | unit | test `Object.keys(await import("../src/index.js")).sort()` |
| D4.4 | partly (grep + reading) | weakly | unit | judgement on each `console.` line |
| D5.1 | yes, as amended (A9) | yes | unit | −5 for `startup.test.ts` (F5) |
| D5.2 | count yes; "schemas unchanged" needs a method | yes with a method | unit | proposed: dump `name`, `description`, JSON schema of each tool via the MCP SDK's `InMemoryTransport` (`node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js` exists) + `listTools()` at `1a92d95` and after, `diff` |
| D5.3 | yes | yes | unit | |
| D5.4 | yes, as amended (A12) | as written vacuous | unit | expected diff is empty (F17) |
| D5.5 | partly (grep for `mcp/dist`, daemon, CONN-3/7) | yes with A6 | unit | |
| D6.1 | yes (`grep -c "MUX-[1-9]\|DL-[12]"`) | yes | unit (doc check) | written by the autonomous run |
| D6.2 | yes | yes | **E2E** | MUX-6 by process listing; MUX-4 two timestamps |
| D6.3 | yes | yes | **E2E** | grep the attached log for `://` and the token |
| D6.4 | yes | yes | **E2E** | |
| D7.1 | yes, as amended (A7) | as written misses `CLAUDE.md:228`, `:91` | unit | |
| D7.2 | yes | yes | unit | |
| D7.3 | yes | yes | unit | |

---

## D1 move map

Per the phase doc (D1 checkboxes, 0.10) plus F4's resolution for the entry. Test counts from the
vitest JSON reporter on `1a92d95` (`$S/count.cjs`). After D1: daemon 30 + mcp 44 + sdk 12 + shared 4 +
extension 211 = **301**.

| Old path | New path | Tests | Note |
|---|---|---|---|
| `server/` (whole dir) | `daemon/` | — | `git mv server daemon`; package `@bridge/daemon`, bin `chrome-bridge-daemon` |
| `server/package.json` | `daemon/package.json` | — | rename; add TS-source subpath `exports` for `bridge`, `wsHost`, `startup` (interim, for `mcp`) |
| `server/tsconfig.json` | `daemon/tsconfig.json` | — | unchanged |
| `server/build.mjs` | `daemon/build.mjs` | — | not run until D3 adds `daemon/src/index.ts`; copy → `mcp/build.mjs` (entry `src/index.ts`, same `external`) |
| `server/src/bridge.ts` | `daemon/src/bridge.ts` | — | |
| `server/src/connection.ts` | `daemon/src/connection.ts` | — | |
| `server/src/handshake.ts` | `daemon/src/handshake.ts` | — | |
| `server/src/wsHost.ts` | `daemon/src/wsHost.ts` | — | D1.2's `--follow` target |
| `server/src/startup.ts` | `daemon/src/startup.ts` | — | interim MCP entry imports it until D5 deletes it |
| `server/src/index.ts` | `mcp/src/index.ts` | — | **not stated in the plan** (F4); same code; imports `@bridge/daemon` until D5 |
| `server/src/tools/registry.ts` | `mcp/src/tools/registry.ts` | — | `Bridge` type from `@bridge/daemon`, `downloadToFile` from `@bridge/sdk` |
| `server/src/lifecycle.ts` | `mcp/src/lifecycle.ts` | — | byte-identical from here on |
| `server/src/config.ts` | `mcp/src/config.ts` | — | |
| `server/src/download.ts` | `sdk/src/download.ts` | — | 0.10 |
| `server/test/bridge.test.ts` | `daemon/test/bridge.test.ts` | 9 | |
| `server/test/connection.test.ts` | `daemon/test/connection.test.ts` | 7 | |
| `server/test/handshake.test.ts` | `daemon/test/handshake.test.ts` | 4 | |
| `server/test/startup.test.ts` | `daemon/test/startup.test.ts` | 5 | deleted in D5 (F5) |
| `server/test/wsHost.test.ts` | `daemon/test/wsHost.test.ts` | 5 | |
| `server/test/tools.test.ts` | `mcp/test/tools.test.ts` | 28 | imports runtime `Bridge` → `@bridge/daemon` |
| `server/test/lifecycle.test.ts` | `mcp/test/lifecycle.test.ts` | 16 | |
| `server/test/download.test.ts` | `sdk/test/download.test.ts` | 12 | |
| new | `mcp/package.json`, `mcp/tsconfig.json`, `sdk/package.json`, `sdk/tsconfig.json` | — | `mcp`: MCP SDK, zod, `@bridge/sdk`, `@bridge/shared`, interim `@bridge/daemon`; `sdk`: `ws`, `@bridge/shared` (sdk tsconfig needs `types: ["node"]`) |
| root `package.json` | same | — | `workspaces` ×5; `typecheck` adds `daemon`, `sdk`, `mcp` tsconfigs; `build` = mcp + extension (+ daemon from D3); add `tsx` (F22) |
| `package-lock.json`, `node_modules/@bridge/*` | regenerated by `npm install` | — | F13 |
| `docs/setup.md:18,36,46,262` | `mcp/dist/index.js` (262: the troubleshooting text is rewritten in D5/D7) | — | D1.3 |
| unchanged | `shared/test/protocol.test.ts` 4; `extension/test/*` 211 | 215 | |

Moving files between `daemon/` and `mcp/`/`sdk/` in the same commit as `git mv server daemon` is
fine: git records `server/src/lifecycle.ts → mcp/src/lifecycle.ts` directly (rename detection keeps
`--follow`, verified on the scratch branch), as long as the import-path edits keep each file above
git's 50 % similarity threshold.

---

## Builder ambiguities

| # | Ambiguity | Proposed resolution |
|---|---|---|
| B1 | Where the MCP entry lives in D1 and what `daemon/` builds before D3 | F4: `server/src/index.ts` → `mcp/src/index.ts`; `daemon` has no entry/build until D3 |
| B2 | Does `startup.ts` survive D3? ("Files touched" says modified; D3 says delete) | It stays through D3 (the interim MCP entry uses it; D3.4's note) and is deleted in D5 with its 5 tests, documented (F5). The daemon entry never imports it |
| B3 | Where the token function lives for the daemon (D3's lane vs D4's `sdk/src/token.ts`) | Keep it in `sdk/src/token.ts` (0.9 "the daemon uses the same function"); `sdk` exposes a `./token` subpath export; `daemon` depends on `@bridge/sdk` and imports only that subpath, so the daemon bundle never pulls in the client. Run D4 before D3 (F19). Not in `shared/` — it needs `node:fs`, and `shared` is imported by the extension |
| B4 | Workspace dependency direction and build order | `shared` ← everyone (extension: types only). `sdk` → `shared`, `ws`. `daemon` → `shared`, `ws`, `@bridge/sdk/token`. `mcp` → `sdk`, `shared`, MCP SDK, `zod` (+ interim `daemon`, D1–D4). No cycle: `sdk` refers to the daemon by **path** only. Every package is consumed as TS source (`exports` → `src/*.ts`, as `shared` does), each esbuild bundle is independent, so there is no build order. Whether `sdk` gets a `dist/` (spec §11 says build builds sdk): proposed no build in Step 6 — scripts run the TS source via tsx; revisit in Step 8 |
| B5 | How `BridgeError` crosses package boundaries | Defined once in `shared/src/error.ts`, re-exported by `@bridge/sdk` (D4.3). Every package resolves `@bridge/shared` to the same file through the workspace link, and each bundle contains one copy, so `instanceof` works within a process; across the wire only `{code, message, data?}` travels and `fromWire` rebuilds it. `Bridge.call` throws `BridgeError(NOT_CONNECTED, <today's text or the stored reason>)`; `ExtensionConnection` timeout → `TIMEOUT` with today's text `Timed out after Nms calling X`; `rejectAll("extension disconnected")` → `NOT_CONNECTED` keeping the text `extension disconnected` (tests `connection.test.ts:42`, `wsHost.test.ts:140` match `disconnected`) |
| B6 | `ErrorResponse.error.code` required or optional in the type | The wire type keeps `code?` (a v1 extension sends none); `fromWire` normalises to `INTERNAL`; the daemon always sends `code` |
| B7 | `extensionStatus {connected:false}` when an *old* extension socket closes after a newer one connected | Emit only when the closing connection is `bridge.currentConnection()` (the existing "keeps the newest connection" test, `wsHost.test.ts:50`) |
| B8 | Client ids: string only? Collisions? | Echo the client's `id` verbatim; the daemon remaps to its own `ExtensionConnection` ids (never `""` — the extension drops an empty id, `$S/router-welcome.ts`). A non-string id → `BAD_PARAMS` |
| B9 | Default timeout and slack layering; the SDK's own timer | F7 |
| B10 | MCP behaviour after an established connection closes with a code other than 4002 | F8: treat as a failed connect (stored reason + 5 s retry) |
| B11 | `daemon.shutdown` ordering | F8: stop accepting → reply `{ok:true}` → `close(4002, "upgrading")` each socket → wait (≤ 1 s) → exit 0. A daemon in shutdown accepts no new hello |
| B12 | Missing `daemon/dist/index.js` at `connect()` | F2: reject before knocking ("run `npm run build`") |
| B13 | No welcome after hello (pre-Step-6 server on the port) | F1: welcome timeout → `VERSION` with the cause |
| B14 | `clientId` in the extension's welcome | F29: `"extension"` |
| B15 | Unknown `daemon.*` methods | F23: `UNKNOWN_METHOD`, not forwarded |
| B16 | D5's `browser_status` tests | F6: planned output change, replaced one-for-one |
| B17 | Schema-unchanged check for D5.2 | Dump `listTools()` over `InMemoryTransport` at `1a92d95` and after; `diff` the JSON |
| B18 | Which file the build hash is computed from during tests vs D6 | Unit tests hash fixture files only (D3.2 "known file"; D4 injects `hashDaemon`). In D6, `daemon.status`'s build must equal `sha256sum daemon/dist/index.js` taken right after the wave's `npm run build`; a `dist/` older than `src/` is not detected by the hash (both sides read the same stale file), so the wave starts with a fresh build |

---

## Mechanical amendments (for the step agent to apply with dated notes; this audit did not edit the phase doc)

All locations are in `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md` at `1a92d95`.

- **A1** (F9) — line 92, 0.2. Old: ``the `NOT_CONNECTED_MESSAGE` in `server/src/bridge.ts`).`` New:
  ``the module-private `NOT_CONNECTED` constant at `server/src/bridge.ts:3-4`). *Amended 2026-10-21:
  was `NOT_CONNECTED_MESSAGE`, a name that does not exist (stage0-audit F9).*``
- **A2** (F10) — line 98, 0.3. Old: ``Today only the MCP's `browser_evaluate` passes a per-call timeout, in-process.``
  New: ``Today the MCP's `browser_evaluate` (`registry.ts:205`) and `browser_download`
  (`download.ts:61`, `timeoutMs + 5_000`) pass a per-call timeout, in-process. *Amended 2026-10-21
  (stage0-audit F10).*``
- **A3** (F11) — lines 174-175. Old: ``Only one process may own port 9234 at a time, so any`` /
  ``stage whose tests bind a real socket (D2, D3) serialises with any other that does.`` New: ``Tests
  bind port 0 (none binds 9234), so stages never contend for the port; D2 and D3 serialise because
  they edit the same files. *Amended 2026-10-21 (stage0-audit F11).*`` And line 241, old: ``never with
  D3 (same files and the same test port)`` → new: ``never with D3 (same files)``.
- **A4** (F12) — line 56. Old: ``` `src/lifecycle.ts` (moved unchanged), `src/config.ts` (moved), `src/download.ts` (moved → later to sdk);``` New:
  ``` `src/lifecycle.ts` (moved unchanged), `src/config.ts` (moved); `download.ts` moves to `sdk/src/` in D1 (0.10);```
  Line 57, old: ``` `test/tools.test.ts` (moved)``` → new: ``` `test/tools.test.ts`, `test/lifecycle.test.ts` (moved)```.
- **A5** (F13) — line 204, D1. Old: ``- [ ] `npm test`, `npm run typecheck`, `npm run build` green;`` New:
  ``- [ ] `npm install` (relinks `node_modules/@bridge/*`, rewrites `package-lock.json`; *added
  2026-10-21, stage0-audit F13*), then `npm test`, `npm run typecheck`, `npm run build` green;``
- **A6** (F14) — lines 447-448, D5.5. Old: ``updated in this stage for anything the user must
  do differently (the MCP path, the daemon).`` New: ``updated in this stage for anything the user
  must do differently (the MCP path, the daemon) — at least `e2e-test-plan.md` lines 19 and 23
  (`server/dist/index.js`), row CONN-3 (an MCP restart no longer restarts the host) and row CONN-7
  (the busy-port self-heal is gone from the MCP); dated run records stay as written. *Amended
  2026-10-21 (stage0-audit F14).*``
- **A7** (F14) — line 459, D7.1. Old: ``grep -rn "one Claude session\|server/dist\|server/src" CLAUDE.md docs/setup.md``
  New: ``grep -rnE "one Claude session|one session at a time|2nd session|server/dist|server/src" CLAUDE.md docs/setup.md``
- **A8** (F15) — line 391, D0.4. Old: ``Each new test fails with the type/guard change reverted (verifier re-runs with a stash).``
  New: ``Each new test that asserts new behaviour (`isWelcome`, `isEvent`, `fromWire`, a rejected
  malformed v2 field) fails with the change reverted (the verifier reverts with
  `git stash push -u -- shared/`, so new files are included). The "v1 and v2 hello accepted" test is a
  regression guard: today's `isHello` already accepts a v2 hello (stage0-audit F15).``
- **A9** (F5; edits a pre-registered check — apply only with the session agent's sign-off) — lines
  440-441, D5.1. Old: ``D5.1 `npm test` after ≥ before (the moved `tools.test.ts` now drives a fake `BridgeClient`); typecheck``
  ``and build green.`` New: ``D5.1 `npm test` after ≥ before − 5 (the deleted `startup.test.ts`,
  named in the stage report as a documented removal) + the new D5 tests (the moved `tools.test.ts`
  now drives a fake `BridgeClient`); typecheck and build green. *Amended 2026-10-21 (stage0-audit
  F5).*`` If D3 instead deletes `startup.ts`, the same "− 5" goes into D3.1 (line 417).
- **A10** (F16) — line 423, D3.5. Old: ``grep -rn "retry\|setInterval" daemon/src/index.ts`` New:
  ``grep -rnE "retry|setInterval|startWsHost" daemon/src/index.ts`` (append: ``— `startWsHost`
  retries every 5 s by default, stage0-audit F16``).
- **A11** (F21) — line 359, D7. Old: ``- [ ] `docs/setup.md`: MCP path, token file, daemon log, how to stop the daemon by hand.``
  New: ``- [ ] `docs/setup.md`: MCP path, token file (`bridge.token` at the repo root, gitignored) and
  its precedence (`BRIDGE_TOKEN` env wins over the file), daemon log, how to stop the daemon by hand,
  "end every pre-Step-6 session first" (F1).``
- **A12** (F17) — line 304, D5. Old: ``- [ ] `lifecycle.ts` unchanged; its `shutdown` closes the SDK client instead of the WS host.``
  New: ``- [ ] `lifecycle.ts` unchanged; the `shutdown` callback passed to it in `mcp/src/index.ts`
  (today `server/src/index.ts:54-59`) closes the SDK client instead of the WS host.`` Line 311, old:
  ``` `lifecycle.ts` is byte-identical to the baseline apart from the shutdown call``` → new:
  ``` `lifecycle.ts` is byte-identical to the baseline```. Line 446, D5.4, old: ``shows only the
  shutdown call changed.`` → new: ``is empty (the shutdown callback lives in `mcp/src/index.ts`).``
- **A13** (F30) — lines 6-7. Old: ``(does not`` / ``exist yet; created at kickoff for ledgers, briefs, reports and evidence)`` →
  New: ``(created at kickoff 2026-10-21 for ledgers, briefs, reports and evidence)``.

Not mechanical (for the session agent): F1, F3 (contract-level; F3 touches 0.8), F2, F4, F6, F7, F8,
F18–F20, F22–F24 (design-local), F25 (journal correction, session agent only).

---

## Git state after the scratch-branch experiment

```
$ git status --short; git branch; git log --oneline -1
?? docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/
  feat/agent-bridge
* main
1a92d95 docs: Step 6 kickoff + plan rulings
```
The scratch branch `scratch-stage0-gitmv` (commits `1a853e7`, `be66a89`) was deleted; `feat/agent-bridge`
predates this run (F32). Because `git mv server daemon` carried the ignored `server/dist/` along, the
leftover `daemon/dist/` was moved back to `server/dist/` and the empty `daemon/` removed after
`git switch main`; `ls server/dist` → `index.js`. Temporary experiment processes were all stopped;
`node.exe` processes at the end: only PID 2928 (F25); port 9234 has no listener.
