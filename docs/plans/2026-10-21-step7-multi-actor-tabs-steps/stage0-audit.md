# Step 7 — Stage 0 spec audit

**Date:** 2026-10-22 · **Role:** auditor (Stage 0 builder), Claude Opus 5.5 (`claude-opus-5-5`) ·
**Baseline commit:** `0773a98` · **Audited:** the phase doc
`docs/plans/2026-10-21-step7-multi-actor-tabs.md` (all, with every dated note); the design spec
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §5, §6, §7, §10 (binding), §8.3, §12, §13;
the Step 6 as-built `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` ("Contracts
binding forward", "W1 as-built"); `…-step6-…-steps/W1-run-record.md`; `docs/decisions.md` (the kickoff's
§3 item 3 list and #33–#37); the Step 8 plan (only what it expects from Step 7); `docs/e2e-test-plan.md`
(§1 item 8, §4.6, §4.12, §4.13, STAT-1, CONN rows); `CLAUDE.md`; the code under `shared/`, `daemon/`,
`sdk/`, `mcp/`, `extension/`. No feature code was written; no source, test or config file was changed.
The only repo edits are this file and dated *Corrected 2026-10-22 (Stage 0)* notes in the phase doc.

Glossary used below. **T0…T6** are the phase doc's stages (T0 shared types, T1 extension `tabId` +
codes + events, T2 daemon handles/leases/lock, T3 extension data + screenshot modes + `focusTab`, T4
SDK formatters + MCP pass-through, T5 the live E2E wave, T6 docs). **T1.2** etc. are its pre-registered
exit checks; **0.1…0.8** its decisions; **G7-1/G7-2** its human gates. A **handle** is a daemon-minted
tab name (`T3`); a **lease** says which client may act on a tab; the **visibility lock** serialises the
calls that need a tab on screen. **LEASE-n / SCREEN-n / BG-n** are the rows T5 writes; **MUX-n / DL-n /
CONN-n / STAT-1 / TAB-n** are existing rows of `docs/e2e-test-plan.md`. **W1** is Step 6's live wave
(Run 7). **Close codes:** 4001 = failed hello, 4002 = "upgrading" (the daemon is being replaced; clients
reconnect), 1001 = "going away" (idle exit or a signal). **CDP** = Chrome DevTools Protocol. **MV3** =
Chrome's Manifest V3 extension model (its service worker, **SW**, can be stopped by Chrome at any time).
**Cn** numbers the Step 6 contract runs; **Fn** numbers the findings; **#n** is a `docs/decisions.md`
entry number.

## How to reproduce

Every node/npm command needs, first (Git Bash):
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`, run from
`/c/Users/aliev/Projects/chrome-remote-extention`. `$S` is the scratchpad
`/c/Users/aliev/AppData/Local/Temp/claude/C--Users-aliev-Projects-chrome-remote-extention/c98ff063-f897-4628-815e-2841acf83300/scratchpad`
(Windows: `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad`).
The scripts are kept there:

- `$S/step6-contracts.mts` — the Step 6 contract runs C1–C17:
  `env -u BRIDGE_TOKEN timeout 120 npx tsx $S/step6-contracts.mts`. Output of this run:
  `$S/step6-contracts.out.txt`. ~15 s wall time.
- `$S/probe-extra.mts` — probes P1–P4 (an extension hello with `proto:2`; a `tab` param through a
  Step 6 daemon; the registry's disconnect hook; a client-sent event frame):
  `env -u BRIDGE_TOKEN timeout 60 npx tsx $S/probe-extra.mts`. Output: `$S/probe-extra.out.txt`.

Both import the real `daemon/src/*.ts` and `sdk/src/*.ts` by absolute path (tsx; `.mts` so top-level
`await` works) and `ws` through `createRequire` anchored at the repo. Every host binds `127.0.0.1` on
port 0 or on a port the OS handed out (C6's `runDaemon` needs a 1–65535 port, so it takes one from a
`net` server bound to port 0 and closed). Nothing bound 9234. The token is the fake
`fake-token-stage0-not-real`, passed to the daemon directly and to `connect()` as `BRIDGE_TOKEN` in an
`env` object, so `bridge.token` is never read. `connect()` runs with `io.spawnDaemon` overridden to
record a call and do nothing, so no daemon process is ever spawned. A fake extension is a `ws` client
sending the v1 hello `{type:"hello", token}`.

Chrome behaviour was checked against the current docs (URLs at each finding); nothing ran against the
user's Chrome or profile.

## Baseline (re-measured 2026-10-22, 12:18–12:22 UTC)

| Item | Value | Command |
|---|---|---|
| HEAD | `0773a98` (`docs: close Step 6 on the user's W1 rulings; pin HTML fixtures to LF`) | `git log -1 --format='%h %s'` |
| typecheck | exit 0 | `npm run typecheck` |
| tests | `Test Files  42 passed (42)` · `Tests  542 passed (542)`; exit 0 | `npm test` |
| build | exit 0 (`built daemon → dist/index.js`, `built mcp → dist/index.js`, `built extension → dist/`) | `npm run build` |
| daemon build id after the build | `795fb769aeae…` (sha256 of `daemon/dist/index.js`) — the same id W1's MUX-1 recorded, so this build reproduced the live daemon's build byte for byte | `sha256sum daemon/dist/index.js` |
| port 9234 | nothing listening (before and after) | `netstat -ano \| grep LISTEN \| grep :9234` |
| `git status --short` after | ` M docs/decisions.md` (the session agent's, untouched by me) · `?? docs/plans/2026-10-21-step7-multi-actor-tabs-steps/` | `git status --short` |

`npm run build` rewrote `daemon/dist/index.js` in the main tree. Nothing was listening on 9234, so no
live daemon was handed over; and since the id equals the one already recorded, a client connecting
later sees no build change. Node: v25.2.1.

Building in the main tree went against the LESSON "verifiers build in a clean worktree"
(`briefs/common.md`), the discipline F5 (B) relies on. It did no harm here (nothing on 9234, the same
build id as W1), but it should not be repeated: from now until T4's commit, every stage, Stage 0's
re-checks included, builds only in a clean worktree. (fixed after verifier V6, 2026-10-22)

## Summary

| Severity | Count | Findings |
|---|---|---|
| CRITICAL | 0 | — every Step 6 contract held when executed (25/25 runs) |
| MAJOR | 9 | F1–F9 |
| MINOR | 17 | F10–F26 |
| NIT | 9 | F27–F35 |

Plan-side resolutions applied by this audit (mechanical, dated notes in the phase doc): A1–A6 (see
"Amendments"). Everything else is a proposal for the session agent.

---

## Step 6 contracts executed

All runs on 2026-10-22 against the real `daemon/src` and `sdk/src` code, fake extension, fake token,
port 0 / OS-assigned ports (`$S/step6-contracts.mts`, output `$S/step6-contracts.out.txt`).

| # | Contract (as-built "Contracts binding forward") | What was run | Observed | Verdict |
|---|---|---|---|---|
| C1 | client welcome `{type:"welcome", build, proto:2, clientId:"c<n>", extensionConnected}` | raw `ws` client hello `{role:"client", name, build, proto:2}` | `{"type":"welcome","build":"795fb769aeae…","proto":2,"clientId":"c1","extensionConnected":false}` — exactly those five keys | HOLDS |
| C1b | extension welcome `clientId:"extension"`; `extensionStatus {connected:true}` on the extension hello | v1 hello from the fake extension | ext welcome `clientId=extension`; client got `{"event":"extensionStatus","params":{"connected":true}}` | HOLDS |
| C2 | `daemon.status` → `{build, uptime (ms), extensionConnected, clients:[{id,name,since}], port}` | `daemon.status` | `{"build":"795f…","uptime":43,"extensionConnected":true,"clients":[{"id":"c1","name":"stage0-raw","since":1792672122354}],"port":3225}` — exactly those keys | HOLDS |
| C3a | error envelope; a v1 `{message}` becomes `INTERNAL` | fake extension answers `focusTab` with `{id, error:{message:"unknown method: focusTab"}}` | `{"id":"e1","error":{"code":"INTERNAL","message":"unknown method: focusTab"}}` | HOLDS |
| C3b | a v2 error passes through | fake extension answers `{code:"REF_STALE", message, data:{ref}}` | `{"id":"e2","error":{"code":"REF_STALE","message":"stale","data":{"ref":"e1"}}}` | HOLDS |
| C3c | no extension → `NOT_CONNECTED` with today's text | call after the extension closed | `{"code":"NOT_CONNECTED","message":"Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?"}` | HOLDS |
| C4 | close 4001, each reason | first frame `not json` / wrong token / `role:"admin"` | `4001 "expected hello handshake" \| 4001 "invalid token" \| 4001 "unknown role"` | HOLDS |
| C5 | 4002 after `daemon.shutdown` replies `{ok:true}` | `daemon.shutdown` with two clients and the extension connected | reply `{"id":"sd","result":{"ok":true}}`; closes: caller `4002 "upgrading"`, other client 4002, extension 4002 | HOLDS |
| C6 | 1001 on idle; the extension does not count | `runDaemon` (real `WsHost`), `BRIDGE_DAEMON_IDLE_MS=1500`, extension + one client, client leaves | extension close `1001 "daemon shutting down"` after 1761 ms; `exit(0)`; log `client - "idle-probe" (0 clients)` / `idle for 1500 ms with no clients — shutting down` / `exit 0 (shutdown 1001) clients=0 extensionEvents=0 ignoredClientFrames=0` | HOLDS |
| C7 | `extensionStatus` true on every extension hello; false only when the **current** socket closes | three extension hellos (the 2nd and 3rd replace the 1st), close the replaced one, then the current one | 3 `true` events; `false` count 1 → 1 after the replaced socket closed → 2 after the current one closed | HOLDS |
| C8a | `timeoutMs` never forwarded | `snapshot` with `timeoutMs:1234`; read what the fake extension received | `{"id":"3","method":"snapshot","params":{"a":1}}` — no `timeoutMs`, daemon's own id | HOLDS |
| C8b | daemon wait `clamp(timeoutMs ?? 30000, 100, 600000) + 5000` | `daemonWaitMs(undefined, 1, 1e9, 20000)` | `35000, 5100, 605000, 25000` | HOLDS |
| C8c | a non-number `timeoutMs` → `BAD_PARAMS` | `timeoutMs:"soon"` | `{"code":"BAD_PARAMS","message":"request timeoutMs must be a finite number"}` | HOLDS |
| C8d | clamped up to 100 | a call the extension never answers, `timeoutMs:1` | `{"code":"TIMEOUT","message":"Timed out after 5100ms calling hang"}` after 5119 ms | HOLDS |
| C9a | any other `daemon.*` → `UNKNOWN_METHOD`, never forwarded | `daemon.kick` | `{"code":"UNKNOWN_METHOD","message":"unknown daemon method: daemon.kick"}`; extension received 0 frames | HOLDS |
| C9b | (fact for T2) `tabs.claim` is forwarded today | `tabs.claim {active:true}` | forwarded; the extension's v1 `unknown method: tabs.claim` came back as `INTERNAL` | HOLDS (as the as-built says) |
| C10 | extension events ignored and counted | fake extension sends `tabCreated`, `tabRemoved` | `extensionEvents 0 → 2`; client received 0 frames | HOLDS |
| C11 | the SDK's five exports | `Object.keys(await import("sdk/src/index.ts"))` | `BridgeClient, BridgeError, ErrorCodes, connect, downloadToFile` | HOLDS |
| C12a | `requireExtension` default true: no extension → `NOT_CONNECTED` after the wait | `connect({waitForExtensionMs:400})`, no extension | `NOT_CONNECTED: Extension not connected — … (waited 400 ms on port 1860)` after 409 ms | HOLDS |
| C12b | `requireExtension:false` resolves on the welcome; getters `welcome`, `extensionConnected` | connect, then the extension connects | `welcome.clientId=c2`; `extensionConnected false → true` | HOLDS |
| C13 | `on("reconnected")` after a 4002 reconnect; `welcome` replaced | another client sends `daemon.shutdown`; a new host with the same build on the same port | `reconnected` fired with the new welcome (`clientId=c1` — the new daemon numbers from c1 again); `client.welcome` is that object; the next call answered `ok` | HOLDS |
| C14 | no handover on a 4002 reconnect | as C13 but the new host has build `ffff…` | `VERSION: The bridge daemon on port 1860 was replaced by build ffffffff…, but this client expects build 795fb769…; after a daemon restart (4002) this client does not hand the daemon over. …`; the new host never got `daemon.shutdown` and kept listening | HOLDS |
| C15 | no welcome within 2 s → `VERSION` | a `ws` server that accepts and never answers | `VERSION: No welcome from 127.0.0.1:1872 within 2 s after hello: a pre-Step-6 bridge server holds po…` after 2002 ms; 0 spawn calls | HOLDS |
| C16 | a call in flight across 4002 | a call the extension never answers, then 4002 | `NOT_CONNECTED: daemon restarting (4002) — the call was in flight when the daemon was replaced; reconnecting` | HOLDS |
| C17 | a non-4002 close fails the client, no reconnect | `host.shutdown(1001)` then a call | `NOT_CONNECTED: The connection to the bridge daemon closed (code 1001 "daemon shutting down"); this client does not reconnect — call connect() for a new client to continue` | HOLDS |

The override recorded 2 `spawnDaemon` calls (the C13 and C14 reconnect knocks each hit a refused port
once while the next host was starting); no process was spawned. After the run only the unrelated
`node.exe` PID 22152 was running (`tasklist`), and nothing listened on 9234.

Extra probes (`$S/probe-extra.mts`):
- **P1** a Step 6 daemon accepts an extension hello `{type:"hello", token, role:"extension", proto:2}`:
  `{"type":"welcome","build":"b","proto":2,"clientId":"extension","extensionConnected":true}` (used by F6).
- **P2** a Step 6 daemon forwards a client's `tab` verbatim: the extension received
  `{"id":"1","method":"click","params":{"tab":"T3","ref":"e1"}}` and `{"method":"networkRequests","params":{"tab":"all"}}` (used by F3, F22).
- **P3** `ClientRegistry.onCountChange` calls back with the count only: `[[1],[0]]` (used by F14).
- **P4** an `{event, params}` frame sent by a client is dropped and counted (`ignoredClientFrames 0 → 1`), not forwarded.

---

## Counts re-derived

| Count | Plan says | Measured | Command |
|---|---|---|---|
| `activeTab()` call sites in handlers | 13 (4 in `actions.ts`) | **13**; `actions.ts` **4** (lines 6, 12, 39, 85); `perceive.ts` 6, 12; `navigate.ts` 6; `history.ts` 4, 10; `wait.ts` 22, 57; `evaluate.ts` 29; `network.ts` 10 | `grep -rn "activeTab()" extension/src/handlers` (13 lines); `grep -c "activeTab()" extension/src/handlers/actions.ts` → 4 |
| other `activeTab` users | — | only its definition, `extension/src/tabs.ts:1`; `network.ts:10` serves both `networkRequests` and `networkClear` (via `resolveScope`) | `grep -rn "activeTab" extension/src --include=*.ts \| grep -v handlers/` |
| MCP tools | 21 → 22 after T4 | **21** | `grep -c "server.tool(" mcp/src/tools/registry.ts` |
| tests | 542 in 42 files | **542 in 42** | `npm test` |
| error codes | 22 | **22** = 9 daemon + 13 extension, one by one equal to spec §10's list (daemon: NOT_CONNECTED TIMEOUT UNKNOWN_METHOD BAD_PARAMS TAB_HELD TAB_GONE TAB_UNKNOWN LOCK_TIMEOUT VERSION; extension: REF_STALE LOCATOR_NOT_FOUND LOCATOR_AMBIGUOUS OFFSCREEN RESTRICTED_URL DEBUGGER_ATTACH DEBUGGER_CANCELLED DEBUGGER_DEVTOOLS PAGE_ERROR NAV_FAILED DOWNLOAD_HTTP WINDOW_MINIMIZED INTERNAL) | `shared/src/codes.ts:8-35` |
| `NetworkRequestsResult.text` | `shared/src/protocol.ts:204` | **line 204** (interface at 194) | `grep -n "  text: string;" shared/src/protocol.ts` |
| `text` consumers T3/T4 will touch | — | `extension/src/handlers/network.ts:53-56` (builds it), `mcp/src/tools/registry.ts:281` (reads it), `extension/src/network-log.ts:58` (`Omit<…,"text">`, compiles either way); snapshot `text`: `extension/src/content/snapshot.ts:166-177`, `content/index.ts:10`, `handlers/perceive.ts:5`, `mcp/src/tools/registry.ts:82-83` | grep |
| `webRequest` observers | 6 | 6 | `grep -c "chrome.webRequest.on" extension/src/sw.ts` |
| existing `chrome.tabs` listeners in `sw.ts` | — | 1 (`onRemoved` → `networkLog.forgetTab`, `sw.ts:85`) | read |
| snapshot cap | 800 | `MAX_LINES = 800` (`content/snapshot.ts:4`) | read |
| new event param types (T0) | 5 | 5 named; with the existing `ExtensionStatusParams` (`protocol.ts:61`) the protocol then has 6 event shapes | read |
| `captureVisibleTab` calls/s | — (not stated) | **2** (`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`) — F10 | Chrome docs |

---

## Findings

### MAJOR

**F1 — The `CODE:message` convention relies on content-script throws "coming back as strings", but a
throw comes back as `result: null` — its message is lost.** *Plan-side (0.6, T1 checkbox 2, T1.3);
design-local. Code-side owner T1.*

0.6: "Content-script throws come back as strings through `executeScript`; the content script prefixes
them `CODE:message` and `unwrapResult` splits". The measured fact (`CLAUDE.md` gotcha "A thrown injected
function does NOT reject `executeScript` — Chrome resolves the frame with `result: null`") and the code
say otherwise: `unwrapResult` (`extension/src/inject.ts:31-39`) sees only `null`/`undefined` and throws
its generic "may be stale … or restricted URL" text. The current Chrome reference documents
`InjectionResult` as `{documentId, frameId, result?}` only — no `error` field
(https://developer.chrome.com/docs/extensions/reference/api/scripting, read 2026-10-22). So today
`centerForInput`'s two specific throws (`content/index.ts:36-48`, the would-be `OFFSCREEN`) and every
`clickRef`/`typeRef` "ref not found" message never reach the agent. A `CODE:message` prefix on a throw
would vanish the same way; T1.3's "`CODE:message` split" unit test would pass while live never sees one.
**Resolution:** the page functions *return* the failure instead of throwing — e.g. the content script's
public methods catch and return `{__bridgeError: "CODE:message"}`; `unwrapResult` keeps null-or-undefined
→ `REF_STALE` (the `CLAUDE.md` invariant), and adds: a result object with `__bridgeError` → split into
`BridgeError(code, message)`. One place, tested. The convention keeps its name; Step 8's `LOCATOR_*`
(Step 8 plan line 243) inherits it. T1's verifier checks a page function that throws still maps to
`REF_STALE`, and one that returns the marker maps to its code.

**F2 — The routing rule "no `tab` and not free → `BAD_PARAMS`" would break `browser_download`: the
download methods carry no tab and are not in the free list.** *Plan-side (0.3, T2 `route.ts` checkbox,
T2.4); design-local (applies spec §6.3 "calls touching no tab are free").*

The plan's free list is `listTabs`, `networkRequests`, `daemon.*`, `tabs.claim/release`. But
`downloadStart`, `downloadChunk`, `downloadEnd` (`extension/src/handlers/download.ts`; "no tab is
touched", `mcp/src/tools/registry.ts:242`) take no tab, and `newTab` takes none either. Read literally,
T2 answers every download with `BAD_PARAMS "tab is required"` — DL-1/DL-2 (regression smoke, T5.3)
would fail. **Resolution:** T2 states the method classes as one table in `route.ts` (and the plan):
*tab-carrying, lease-checked* — `navigate snapshot screenshot click type scroll hover selectOption
pressKey back forward waitFor evaluate networkClear closeTab focusTab selectTab`; *intercepted, no tab*
— `newTab`, `listTabs`; *intercepted and lease-checked* — `closeTab` (check, forward, then remove the
handle: spec §10 `design.md:347-348`, T2's intercept checkbox plan `:283`) (fixed after verifier V7,
2026-10-22); *free, forwarded* — `networkRequests downloadStart downloadChunk downloadEnd`;
*daemon-handled* — `daemon.* tabs.claim tabs.release`. Any other method → `UNKNOWN_METHOD`-style
rejection is **not** proposed (it would change forwarding of unknown methods, which today reach the
extension and come back `INTERNAL` — C3a); an unlisted method is forwarded as "free" only if it carries
no `tab`, else resolved. `waitFor {seconds}` touches no tab but stays checked (it carries one). T2.4
gains "a `downloadStart` without `tab` succeeds".

**F3 — `tab` is already a wire parameter of `networkRequests`/`networkClear`, with values `"active"`,
`"all"` or a Chrome tab id; the daemon's "resolve `params.tab` → `tabId`" and T4's
`tab: z.string().optional()` collide with it.** *Plan-side (spec §10 "Tab parameter", plan 0.3, T2,
T4); contract-level (wire params and MCP tool schemas) — for user review.*

Evidence: `extension/src/handlers/network.ts:8-17` (`resolveScope(p.tab)`: undefined/`"active"` → active
tab, `"all"`, or an integer); `mcp/src/tools/registry.ts:263-266` (`tabTarget = z.union([z.literal("active"),
z.literal("all"), z.number().int()])` on both network tools). P2: a Step 6 daemon forwards `tab:"all"`
verbatim. A T2 daemon resolving every `tab` as a handle would answer `TAB_UNKNOWN` for `"all"`/`"active"`
/`412`; T4's string schema would drop the number form. Also open: `networkClear {tab:"all"}` clears other
actors' tabs' logs — what does its lease check check?
**Resolution (conservative):** on the wire the daemon treats `tab` as: a handle `T<n>` → `tabId`;
`"all"` → passed as a scope (`{scope:"all"}`, no `tabId`); `"active"` or absent → the caller's target
(for the MCP: its cursor; F5's fallback otherwise); a number → `BAD_PARAMS` "pass a handle from
listTabs" from a Step 7 client (the old number form stays only in F5's legacy path). The extension's
network handler reads `tabId` / `scope`. The MCP keeps `"active" | "all" | <handle>` (a
`z.union([z.literal("all"), z.literal("active"), z.string()])`). `networkClear {tab:"all"}`: allowed only
when no tab with entries is held by another client, else `TAB_HELD` naming the first holder (no
loosening: it never clears a held foreign tab). `networkRequests` stays free in every scope (spec §6.3).

**F4 — `closeTab` and `selectTab` read `p.id`, not `tabId`; and 0.1's "absent `tabId` → active tab"
fallback must not apply to them.** *Code-side, owner T1 (T3 for `focusTab`); design-local.*

`extension/src/handlers/tabs.ts:12-17, 27-30` use `Number(p.id)`; the daemon after T2 sends `tabId`
(spec §10). With 0.1 applied blindly, `closeTab` with no `tabId` would close the **active** tab — a
destructive default that does not exist today (today a missing id fails). **Resolution:** `closeTab`,
`selectTab` and `focusTab` take `tabId` (and accept `id` for the one release of the 0.1 fallback, for a
Step 6 daemon); with neither they throw `BAD_PARAMS`, never fall back to the active tab. The 13
`activeTab()` sites are the only fallback users. T1.3 gains "`closeTab` with no `tabId`/`id` →
`BAD_PARAMS`".

**F5 — A Step 6 MCP against a Step 7 daemon (between T2's and T4's commits, and on any session started
before T4): every tool call fails, and the SDK cannot notice the mismatch.** *Plan-side (seeded blind
spot); contract-level (compatibility between Step 6 and Step 7 pieces) — for user review.*

Why it happens: the knock hashes the daemon file **on disk** at knock time (`sdk/src/knock.ts:162`,
`expected = await io.hashDaemon(daemonPath)`), not a build baked into the MCP bundle. After any
`npm run build` in the main tree, a running Step 6 MCP's next `connect()` hands the old daemon over and
adopts the new one, and a 4002 reconnect to it matches too (C13 shows a 4002 reconnect to a same-hash
daemon succeeds). The protocol stays `proto: 2`, so nothing reports `VERSION`. Then every tab tool of
that MCP (no `tab`) gets `BAD_PARAMS "tab is required"` from T2's daemon; `browser_select_tab {id}` /
`browser_close_tab {id}` send Chrome ids the daemon does not resolve. Interactive sessions keep the
bundle they loaded until `/mcp` (kickoff §8 "Needs the user's keyboard" item 3), so this lasts past T4's
commit for every session started before it.

Options weighed:
- **(A) daemon-side legacy path, one release:** a tab-carrying method with no `tab` from a client is
  resolved by the daemon to the **active tab** (the same resolver as `tabs.claim {active:true}`, F8),
  and an `id` on `closeTab`/`selectTab` is mapped from a Chrome id to its handle; then the **lease of
  the resolved tab is checked** exactly as for an explicit `tab` — `TAB_HELD` if another client holds
  it; no lease is granted. The method's lock class applies unchanged (the lock is taken even when the
  target is already active): a legacy `screenshot` takes the visibility lock like any other — skipping
  it because the legacy target "is already active" is a forbidden fix (fixed after verifier V3,
  2026-10-22). Forwarded with `tabId` (never without: forbidden fix "making the daemon omit
  `tabId`"). One `daemon.log` line per client: `legacy client "<name>": no tab — resolved to the active
  tab` (no URL). Removed with the extension's fallback in Step 8 S2.
- **(B) build discipline only:** no `npm run build` in the main tree between T2's and T4's commits;
  verifiers build in clean worktrees (Step 6 practice). Does not help sessions started before T4, nor
  other machines.
- **(C) both.**

Lease check: a fallback that **forwarded without resolving** (letting the extension's 0.1 fallback pick
the active tab) would let a Step 6 client act on a tab another actor holds — a lease loosening, so
forbidden. (A) as written resolves first and checks the lease, so a held tab stays protected; an unheld
active tab is acted on exactly as Step 6 does today. **Recommendation: (C)** — (A) keeps every existing
tool behaving identically for an old MCP, is undoable (one code path, removed in Step 8), loosens
nothing; (B) costs nothing and avoids handing the user's live daemon over mid-phase. T2 owns (A); the
session agent writes (B) into the T2–T4 briefs. T2 tests: a legacy call on an unheld active tab
succeeds with a numeric `tabId` forwarded; on a held active tab → `TAB_HELD`; the log line appears
once per client; a legacy `screenshot` (default mode) acquires the visibility lock — while another
client holds it, the legacy call waits in FIFO order (or gets `LOCK_TIMEOUT {holder}`) and is not
forwarded before the holder releases (fixed after verifier V3, 2026-10-22).

**F6 — A stale (pre-T1) extension behind a Step 7 daemon ignores `tabId` and acts on the active tab —
silently, past every lease.** *Plan-side (blind spot); contract-level (what the extension's hello
says; how the daemon reacts) — for user review. Owners T1 + T2.*

The old handlers never read `tabId` (`activeTab()` at all 13 sites); the daemon forwards params as they
are (P2). So with the extension not reloaded after `npm run build` (the `CLAUDE.md` gotcha: not even a
Chrome restart picks up `dist/`), a script's `click {tab:"T3"}` is resolved, lease-checked, forwarded
with `tabId: 412`, and executed on **whatever tab is active** — possibly the human's or another actor's.
Only methods the old extension lacks (`focusTab`) fail, with `INTERNAL` "unknown method" (C3a). The T5
stale-extension check catches it at the wave; nothing catches it on a normal day after a rebuild.
**Resolution:** T1's extension sends `{type:"hello", token, role:"extension", proto:2}` — the existing
v2 hello fields; P1 shows a Step 6 daemon accepts it (so T1 stays compatible with the Step 6 daemon,
as T1's "no behaviour change" requires). T2's daemon records whether the current extension's hello
carried `proto:2`; if not, every tab-carrying method gets `VERSION` "the Chrome extension is an older
build — reload it at chrome://extensions (↻ on Chrome Agent Bridge)". Free and daemon-handled methods
still work, so `browser_status` can say why. This is stricter, never looser; undoable.

**F7 — LEASE-6's premise ("a Memory-Saver discard replaces the tab id; `tabReplaced` keeps the handle")
is probably false on Chrome 156.** *Plan-side (spec §3 "Tab addressing", §6.2; T5 LEASE-6); design-local.
Unconfirmed — T5 LEASE-6 confirms live.*

Sources: the `tabs` reference documents `onReplaced` as "Fired when a tab is replaced with another tab
due to prerendering or instant" — no discard
(https://developer.chrome.com/docs/extensions/reference/api/tabs, also the MV2 page
https://developer.chrome.com/docs/extensions/mv2/reference/tabs; `discard()` says only "Discarded tabs
are still visible on the tab strip and are reloaded when activated"). Chromium commit `00d39277`
(2024-08-21, bug 347770670, "Reland 'Implement WebContents discard by clearing the primary frame
document'", https://chromium.googlesource.com/chromium/src/+/00d3927706c48be0896aac45e9341db2470c16bd)
discards by clearing the document instead of replacing the tab's `WebContents`, and keeps the render
process. A tab that keeps its `WebContents` most likely keeps its id, so no `onReplaced` fires. Neither
source states the id outright, hence "unconfirmed". Consequences: LEASE-6 as written would pass on the
handle (trivially) and fail on "the SW console shows the replaced event", and it would not exercise the
remap path at all. **Resolution:** keep `tabReplaced` handling (prerender swaps still fire it; T2 unit
tests cover the remap); rewrite LEASE-6 in T5 as a measurement written both ways before the run:
record `tabId` before/after the discard via `listTabs`/the daemon log (no URL) — expected
(a) same id, no `tabReplaced`, the handle works after reload → PASS ("discard keeps ids"); (b) new id
with `tabReplaced` and the handle works → PASS ("remap works"); anything else → FAIL. The spec §3
rationale "Chrome ids change … on Memory-Saver discard" gets a dated note at T6 if (a). Also record what
an action on a still-discarded leased tab returns (F18).

**F8 — The active-tab mismatch (W1 proposal 3, accepted by decisions.md · 2026-10-22 · The user rules
on the W1 proposals, #36) has no stage owner and no stated resolver.** *Code-side, owners T1
(extension) and T2 (`tabs.claim {active:true}`), T4 (MCP status/list), T5 (recipe); design-local.*

Measured: `listTabs` (`extension/src/handlers/tabs.ts:3-10`) marks `active` for the active tab of
**every** window (`t.active`; Chrome: "Whether the tab is active in its window. Does not necessarily
mean the window is focused"); `browser_status` (`mcp/src/tools/registry.ts:65`) and `recipes/hello.ts:74`
then take the **first** one; actions use `tabs.query({active:true, lastFocusedWindow:true})`
(`extension/src/tabs.ts:2`), which returns nothing when a DevTools window was last focused (W1 MUX-5:
`No active tab in the last-focused window`). (The `CLAUDE.md` gotcha's "marks the first active tab of
any window" is slightly off: the extension marks all, the readers pick the first — F31.)
**Resolution:** one resolver in `extension/src/tabs.ts`: the active tab of
`chrome.windows.getLastFocused({windowTypes:["normal"]})` (the docs' default filter is
`['normal','popup']`, https://developer.chrome.com/docs/extensions/reference/api/windows; "normal" skips
DevTools and popups, which matches what a human calls "the tab I'm looking at"). **Unconfirmed:** the
`windows` reference documents the default filter but not what `getLastFocused({windowTypes:["normal"]})`
returns while a DevTools window holds focus — W1 MUX-5 measured only that
`tabs.query({lastFocusedWindow:true})` returns nothing then. Pre-registered live check (at G7-1 if
taken at T1, else a T5 row): with the service-worker DevTools window focused, `browser_status` and
`browser_snapshot` must name and act on the same tab (PASS = the snapshot succeeds on the fixture
page that status's `Active tab:` line names, with no `No … window` error; anything else is recorded as
a FAIL of the resolver, never re-tuned) (fixed after verifier V2,
2026-10-22). `activeTab()` (the 0.1
fallback) and a new `listTabs` field (e.g. `current: true` on exactly one tab, beside the per-window
`active`, plus `windowId` which T3 already adds) both use it. When no normal window exists, the error
names the cause: "No normal Chrome window is focused (a DevTools or popup window may have focus) —
click a normal Chrome window and retry". T2: `tabs.claim {active:true}`, F5's legacy path and the
daemon's `listTabs` annotation use `current`. T4: `browser_status`'s `Active tab:` line and
`browser_list_tabs`' `*` use `current`. T5: `recipes/hello.ts` picks `current` (a recipe change, T5
lane), and T5 rows still focus a normal window first (LESSON).
E2E expected text: STAT-1 (`e2e-test-plan.md:193`, `Active tab: [id] title — url`), MUX-1 (`:427`),
MUX-3 (`:429`, recipe's `active: [<id>]` equals status's id) and DL-1 (`:554`) keep their wording; in
normal conditions (a normal window focused) the named tab is the same, so no expected text changes.
They change only in the DevTools-focused case, which no row expects. With two normal windows open
(SCREEN-5, plan `:406`), today's first-active-of-any-window and the new last-focused-normal resolver
can name different tabs; the conclusion still holds because every expected text uses an `[<id>]`
placeholder (fixed after verifier V5, 2026-10-22). W1's MUX-5 failure text is in
the Run 7 record, not an expectation. The ids inside those lines become handles after T4 — a T4.5
item (F24).

**F9 — The lock's deadline and the forwarded call's wait share one envelope timeout, but the plan does
not say how; done naively the daemon outlives the client's own timer.** *Plan-side (0.4 and its
Corrected note); design-local. Owner T2.*

The client gives up at `clamp(timeoutMs) + 5000 + 1000` (`sdk/src/client.ts:28-32`); the daemon waits
`clamp(timeoutMs) + 5000` for the extension (C8b). If T2 waits up to `clamp(timeoutMs)` for the lock and
then starts a fresh `daemonWaitMs` for the forwarded call, a screenshot queued behind another can take
up to `2 × clamp + 5000` — the SDK reports `TIMEOUT` while the daemon still holds or awaits the lock.
**Resolution:** one deadline per call, `deadline = receivedAt + clamp(timeoutMs ?? 30000, 100, 600000)`;
the lock wait ends at `deadline` (`LOCK_TIMEOUT {holder}`); the forwarded call waits
`deadline − now + 5000`. The total stays inside the client's margin. The extension does **not** need the
deadline: it has its own 1 s activation bound (0.5) and `timeoutMs` is never forwarded (C8a) — so the
revisit trigger of decisions.md · 2026-10-22 · D2's daemon details ("Step 7's extension wants the
envelope timeout") does not fire. T2 tests: a waiter whose deadline passes rejects once; the holder's
forwarded call times out at `deadline + 5000` and releases exactly once.

### MINOR

**F10 — `captureVisibleTab` is limited to 2 calls per second; serialised screenshots can hit it.**
*Code-side, owner T3; T5 SCREEN-3 records.* Docs: `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` = 2,
"captureVisibleTab is expensive and should not be called too often"
(https://developer.chrome.com/docs/extensions/reference/api/tabs). The lock makes three actors (or a
script's loop) capture back to back; the third within a second fails with Chrome's quota message, which
arrives as `INTERNAL`. **Resolution:** `activateForCapture` keeps the time of the last capture and waits
until 500 ms have passed before capturing (inside the lock; counted against the call's timeout), and
maps a quota error, if one still occurs, to one retry after 500 ms. T5 SCREEN-3 runs three actors and
records it.

**F11 — T4.2's byte-identical baseline has no stored text to compare with yet, and the cites for it are
off.** *Plan-side (0.7, T4.2) mechanical cites + design-local capture; owners T3/T4.* The snapshot
"formatter" today is not separate: `buildSnapshot` walks and formats in one function
(`extension/src/content/snapshot.ts:170-177`; element line at `:151`), and `snapshot.test.ts` (23 cases)
asserts with `toContain`, never a whole text. There is no `NetworkLog.format` method: the formatters
are free functions `formatEntries` (`extension/src/network-log.ts:287`) and `formatEntry` (`:338`), with
`formatAgo :240`, `formatDuration :253`, `formatSize :257`, `scopeLabel :263`, `formatRow :318` (the
kickoff's `:259` and `:302` point inside `formatSize` and `formatEntries`). The "Step 5 fixture entries"
are the ones the `formatEntries`/`formatEntry` tests build (`extension/test/network-log.test.ts:572-759`,
clock `NOW`/`T0` injected). **Resolution:** T4's builder captures the expected strings by running the
*baseline* `buildSnapshot` (over each `snapshot.test.ts` fixture document, jsdom) and `formatEntries`/
`formatEntry` (over each listed test's entries and clock) **in a worktree of T3's parent commit**, stores
them under `sdk/test/fixtures/` with the commit id in a header comment, once; the verifier re-runs the
capture in its own worktree and diffs. Mechanical note A5 corrects the `NetworkLog.format` name in 0.7.

**F12 — Chrome tab ids still reach the model's text and `daemon.status`.** *Plan-side; design-local
(text) / contract-level for `daemon.status` (for user review); owners T2/T4.* Spec §6.2: "Actors never
see Chrome tab ids". But `formatRow` prints `tab:<chromeId>` in the `"all"` scope and `scopeLabel` prints
`tab <n>` (`network-log.ts:263-267, 320`); network entries carry `tabId`; the plan's `daemon.status`
addition is `tabs: [{tab, tabId, owner, url?}]`. **Resolution:** `formatNetwork(result, {now, scope,
handleOf})` renders `tab:T3` / `tab T3` through a `tabId → handle` map the MCP builds from `listTabs`
(byte-identical for the baseline fixtures when the map is the identity — the T4.2 test passes the
identity); the daemon annotates each network entry with `tab` beside `tabId`. `daemon.status`'s `tabId`
stays (a diagnostic, not an actor API) — proposed to the user as is, since removing it later is a
breaking change.

**F13 — The event parameters are not fully specified, and spec and plan differ.** *Plan-side (spec §6.2,
§10; plan T0, T1, 0.3); contract-level — for user review (applying the plan's more specific shapes).*
`tabGone` has no params anywhere; `tabCreated.openerTabId` is optional in the spec, required in T1;
`tabRemoved` is `{tabId}` in the spec, `{tabId, lastUrl?, lastTitle?}` in T1 (the spec's own `TAB_GONE
{lastUrl, lastTitle}` needs the extension to send them, so the plan is the consistent one);
`tabReplaced` params are only in the spec; `leaseGranted` is `{tab, reason}` in the spec, `{tab,
reason:"opener", url}` in 0.3. **Resolution (T0 writes exactly):** `TabCreatedParams {tabId, openerTabId?,
url}`; `TabRemovedParams {tabId, lastUrl?, lastTitle?}`; `TabReplacedParams {addedTabId, removedTabId}`;
`TabGoneParams {tab, lastUrl?, lastTitle?}`; `LeaseGrantedParams {tab, reason: "opener", url}`. T1 sends
`url: tab.pendingUrl ?? tab.url ?? ""` (at `onCreated` the URL is often not set yet — F33). The spec §6.2
gets a dated note at T6.

**F14 — The daemon has no per-client context in `route`, and the registry's disconnect hook carries no
id.** *Code-side, owner T2 (expected work, stated so the estimate holds).* `RouteContext`
(`daemon/src/route.ts:29-33`) is `{bridge, registry, host}`, shared by every `ClientConnection`
(`wsHost.ts:158-160, 211`); `ClientRegistry.onCountChange` calls back with the count only (P3:
`[[1],[0]]`; `registry.ts:72-77`); the close path is `wsHost.ts:221-233`. T2 adds the caller's `clientId`
(and name) to the context and a removal hook with the id, where `LeaseTable.releaseAll(clientId)` and
`VisibilityLock.releaseAllOf(clientId)` hang. Note: client ids restart at `c1` in every daemon (C13), so a
lease never outlives its daemon.

**F15 — Nothing rebuilds the `HandleTable` when the extension (re)connects; events sent while the socket
is down are lost.** *Plan-side (0.2); design-local; owner T2.* The offscreen client drops a send when the
socket is not open (`extension/src/client.ts:28-30`); `tabCreated`/`tabRemoved` during a daemon restart,
an extension reload or a Chrome restart never arrive; Chrome restarts renumber tab ids. 0.2's "a tab seen
in `listTabs` without a handle gets one" has no trigger. **Resolution:** on every extension hello the
daemon calls `listTabs` once, mints handles for unseen ids and marks handles whose `tabId` is absent as
gone (last URL/title from its own cache of the last `listTabs`/`tabRemoved`). Leases on gone handles are
dropped and their holders get `tabGone`. A daemon restart renumbers (0.2, documented).

**F16 — The `lastUrl`/`lastTitle` cache is lost when MV3 stops the service worker.** *Code-side, owner T1;
design-local.* The cache built from `onUpdated` is in memory; a stopped worker loses it (the 25 s
keepalive alarm, `sw.ts:150-157`, makes that rare). **Resolution:** no `storage.session` (it would hold
URLs at rest for little gain); at worker start, after the three listeners are registered synchronously at
the top level, fill the cache with one `chrome.tabs.query({})` (not awaited at top level — no top-level
`await`, `CLAUDE.md`). A tab closed between a cull and the fill reports no `lastUrl` — acceptable,
`TAB_GONE`'s fields are optional. Nothing is logged.

**F17 — The extension does not reject a `tab` key it should never see.** *Code-side, owner T1.* P2: a
Step 6 daemon forwards `tab:"T3"`; a T1 extension with the 0.1 fallback would ignore it and act on the
active tab — the mirror of F6 (a Step 7 client with an old daemon, e.g. through a mismatched
`BRIDGE_DAEMON`). **Resolution:** `targetTab(p)` throws `BAD_PARAMS` "got a tab handle — the bridge
daemon is older than the extension; run `npm run build` and reconnect" when `p.tab` is a string and
`p.tabId` is absent (except `networkRequests`/`networkClear`, whose old `tab` scope stays readable for
the one release, F3).

**F18 — A discarded or frozen background tab is not handled.** *Code-side, owner T1; T5 records;
unconfirmed.* `Tab.discarded` (Chrome 54+) and `Tab.frozen` (Chrome 132+, "cannot execute tasks,
including event handlers or timers") exist (tabs reference). What `executeScript` and `chrome.debugger`
do on such a tab is not documented. **Resolution:** `targetTab` reads `discarded`; a call on a discarded
tab throws a clear message ("tab T3 was discarded by Chrome's Memory Saver — call browser_navigate or
focus it to reload") rather than whatever Chrome says; T5 LEASE-6 and BG-4 record what a frozen tab
does.

**F19 — The lock can be released while the extension is still switching tabs.** *Plan-side (0.4/0.5);
design-local; owner T3.* The daemon releases on the holder's timeout (0.4) without stopping the
extension's activate → capture → restore; a next holder could then switch the same window before the
first restore. **Resolution:** `activateForCapture` also runs under a small extension-side mutex
(per window), so the extension never overlaps two switches even after the daemon gave up on one. It
adds no wait in the normal case.

**F20 — `newTab`'s own `tabCreated` races its result, and Chrome's `openerTabId` for an
extension-created tab is not established.** *Code-side, owner T2; unconfirmed (T5 LEASE-1/3 record).*
`onCreated` fires before `chrome.tabs.create` resolves, and `ws` delivers both frames possibly in one
read (`CLAUDE.md` gotcha). If Chrome sets `openerTabId` to the window's active tab for
`tabs.create`, and that tab is held by another actor, the opener rule would grant B's new tab to A.
**Resolution:** `mint` is idempotent (`handleOf` first); the `newTab` intercept always leases the result
to the caller, overriding an opener grant made milliseconds earlier for the same `tabId` (and sends no
`leaseGranted` for it). T2 test: `tabCreated {openerTabId: <A's tab>}` arriving before B's `newTab`
result leaves the tab with B.

**F21 — `TAB_UNKNOWN` (0.1) and `TIMEOUT` (0.6) are daemon codes in spec §5/§10 and `codes.ts`, but the
plan has the extension raise them; no code is named for "no active tab".** *Plan-side; design-local.*
`codes.ts` groups them in `DAEMON_ERROR_CODES` (`:8-18`) but `ErrorCode` is one union, so it compiles.
**Resolution:** allow the cross-use and say so in the T0 comment; for "No tab with id" after the daemon
resolved a handle (the tab closed in between) the extension raises `TAB_GONE`, not `TAB_UNKNOWN` (the
handle was valid). "No normal window focused" (F8) stays `INTERNAL`, as today's "No active tab in
the last-focused window" is; a dedicated code would need the spec amended first (`codes.ts:3-4`), so
T0 may rule one but this audit does not propose it.

**F22 — The `unknown method` symptom through a Step 7 daemon arrives as `INTERNAL`.** *Plan-side
confirmation.* C3a: a v1 `{message:"unknown method: focusTab"}` becomes
`{code:"INTERNAL", message:"unknown method: focusTab"}`; nothing in T2 changes `fromWire`. T5's stale
check matches the message text, as the LESSON says. With F6 the daemon answers `VERSION` with a reload
hint first, for tab-carrying methods.

**F23 — T4 needs the formatters without changing the SDK's public surface, but the Step 8 plan expects
them as Step 7 exports.** *Plan-side; contract-level (SDK surface) — for user review.* As built
`sdk/src/index.ts` exports exactly five values (C11; Step 6 as-built § D4); Step 8 S3.4
(`…step8….md:444-445`) lists `formatSnapshot`, `formatNetwork` among "the Step 6 and Step 7 exports".
**Resolution (conservative):** T4 adds a package subpath `@bridge/sdk/format` (like `./token`) for the
MCP; `index.ts` keeps its five; Step 8 S3 adds them to `index.ts`. Step 8's S3.4 wording gets a note from
the propagator.

**F24 — T4.5 does not list the TAB rows, whose expected text changes.** *Plan-side; design-local; owner
T4.* `docs/e2e-test-plan.md:247-250`: TAB-1 "the active one marked `*`", TAB-2 "`browser_select_tab
{"id":<other>}` … control target followed the switch", TAB-3 "New active tab opens", TAB-4
`browser_close_tab {"id":<id>}`. After T4 the ids are handles, `browser_select_tab` claims without
activating, `browser_new_tab` still activates (0.8). T4.5 names TAB-1…4 and the `[<id>]` inside STAT-1,
MUX-1, MUX-3, DL-1 (now a handle). These rows are not in T5.3's regression list, so T5.3 is unaffected.

**F25 — Weak or unfailable exit checks.** *Plan-side; touches pre-registered checks → for the session
agent (not applied).*
- **T6.1 cannot fail:** "Control targets the" and "**active tab**" are on two lines
  (`CLAUDE.md:50-51`), so `grep -n "active tab" CLAUDE.md` never shows that sentence, before or after;
  and the grep also hits lines 23, 158, 308. Proposed: `grep -n "Control targets" CLAUDE.md` returns
  nothing.
- **T1.4** ("shows no top-level `await`") needs judgement. Proposed mechanical form:
  `grep -nE "^(await|const .*= await|void await)" extension/src/sw.ts` returns nothing, and the three
  `chrome.tabs.on*.addListener(` lines start at column 1.
- **T1.5** is one-line and keyword-based: `console.warn("[bridge] fallback", p)` (whole params, which
  carry `url` for `navigate`) or logging a `tab` object passes it. Proposed addition: no `console.*` call
  in `extension/src` passes `p`, `params`, `tab`, `info`, `changeInfo` or a `chrome.tabs.Tab` as an
  argument (grep `console\.\w+\([^)]*\b(p|params|tab|info|changeInfo)\b`), and the 0.1 warning prints
  only the method name.
- **T3.2** says "closed shadow root" — the walk deliberately does not enter closed roots
  (`snapshot.ts:154`); the check means "the closed root's content is absent". Wording only.

**F26 — T5 rows have intents, not expected text; five need a written PASS rule even though recorded
either way.** *Plan-side; design-local; owner T5 (rows are written in T5's autonomous part).* See
"Testability" for the list and the proposed rules.

### NIT

*Each NIT below carries a tag, evidence and a resolution (fixed after verifier V1, 2026-10-22).*

**F27 — G7-2 and T5's "Needs the user's keyboard" predate decisions.md · 2026-10-22 · Live E2E waves
are run by Claude end to end (#33).** *Plan-side; mechanical.* Evidence: decisions.md #33 vs the plan's
G7-2 (`…multi-actor-tabs.md` § Human gates) and T5's "Needs the user's keyboard" text. Applied (A1, A2, A3).

**F28 — The Prerequisite paragraph's "Step 6's live E2E (the D6 wave) has not run yet" is superseded by
W1 (Run 7) and #34–#36.** *Plan-side; mechanical.* Evidence: the W1 run record and decisions.md
#34–#36. Applied (A4).

**F29 — Error texts say "the active tab"** (`inject.ts:9, :58`; `debugger-errors.ts:19`) and will be
wrong for a background target. *Code-side, owner T1; design-local.* Changing them changes tested text; the forbidden fix is
"editing a test's expected message text to match a changed error". Proposed: T1 keeps the old texts
(the 0.1 fallback still targets the active tab) and says "the target tab" only in new code paths; any
reworded message gets a new test, the old assertion is not edited.

**F30 — `unwrapResult`'s null also covers restricted URLs**, so `REF_STALE` will sometimes be the wrong
code. *Code-side, owner T1; design-local.* Evidence: `extension/src/inject.ts:34-35`, the thrown text
"The page action returned no result — the element ref may be stale (run browser_snapshot to refresh), "
+ "or the tab may be a restricted URL (chrome://, the New Tab page, or the Chrome Web Store)." — one
null result for both causes. Resolution: T1 maps it to `REF_STALE` and keeps the message's "or the tab
may be a restricted URL" clause (it is the invariant's text); a restricted URL caught earlier by
`ensureContent` gets `RESTRICTED_URL` there.

**F31 — The `CLAUDE.md` gotcha and the LESSON say `listTabs` "marks the first active tab of any
window"**; it marks every window's active tab, and the readers take the first (F8). *Plan-side
(`CLAUDE.md` text); mechanical; owner T6.* Evidence: `extension/src/handlers/tabs.ts:3-10` (`active:
t.active` on every tab) and `mcp/src/tools/registry.ts:65` (`tabs.find((t) => t.active)`). Resolution:
T6 rewrites the gotcha once F8 lands.

**F32 — The human switching tabs during the ≤ 1.05 s switch window** gets overridden by the restore.
*Plan-side (0.5); design-local; owner T6 (docs).* Evidence: plan 0.5's restore step,
`docs/plans/2026-10-21-step7-multi-actor-tabs.md:174`, `if prev switched: chrome.tabs.update(prev.id,
{active:true})` — it re-activates `prev` unconditionally, whatever the human did after the switch; the
bound is the 1 s `onActivated` wait + 50 ms frame (`:171-172`). Resolution: accepted risk; T6's "what
the human sees" in `setup.md` says so.

**F33 — `tabCreated.url` at creation is often empty.** *Code-side, owner T1; design-local.* Evidence
(Chrome tabs reference, https://developer.chrome.com/docs/extensions/reference/api/tabs, fetched
2026-10-22): `onCreated` — "Note that the tab's URL and tab group membership may not be set at the time
this event is fired, but you can listen to onUpdated events so as to be notified when a URL is set";
`Tab.pendingUrl` (Chrome 79+) — "The URL the tab is navigating to, before it has committed. This
property is only present if the extension has the "tabs" permission or has host permissions for the
page and there is a pending navigation."; `Tab.url` — "May be an empty string if the tab has not yet
committed." Resolution: T1 sends `pendingUrl ?? url ?? ""` (F13).

**F34 — Log hygiene is intact so far.** *Plan-side; recorded (no change).* No log line in the plan needs
a URL; the daemon's lines are in `daemon/src/main.ts` (`logger.log`), names only (`client + "<name>"`).
New lease/lock lines should carry handle + client name only. A line with `://` is withheld whole
(`daemon/src/log.ts:29`, `if (text.includes("://")) return WITHHELD;`; the constant is `:14`)
(fixed after verifier V4, 2026-10-22), so a URL would vanish, not leak — T2.5 as corrected covers it.

**F35 — Recorded, not blocking.** *Plan-side; recorded (no change).* The daemon/MCP lifecycle is unverified on POSIX; the token path is
unchanged (`BRIDGE_TOKEN` wins, else `bridge.token`; `sdk/src/token.ts:49-76`) and nothing in Step 7
prints it; `daemon.kick` stays a follow-up for a hung script's leases (its heartbeat still drops a
client whose event loop is blocked, `wsHost.ts:185-193`).

---

## Lens (a) — code-cite compliance (what was checked)

| Cite | Status |
|---|---|
| 13 `activeTab()` sites; `extension/src/tabs.ts` (`activeTab`, `waitForLoad`) | exact (see Counts); `tabs.ts:2` is the `lastFocusedWindow` query |
| `router.ts` error serialisation | `extension/src/router.ts:18-31`: unknown method → `{id, error:{message:"unknown method: X"}}`; a throw → `{error:{message}}`; no `code` anywhere today (T1 adds it) |
| `unwrapResult` (`inject.ts`) | `:31-39`, null **or** undefined → throw (invariant holds); F1 for the code |
| `describeDebuggerError` Chrome strings | `debugger-errors.ts:15-24`: "another debugger is already attached" → DEVTOOLS; "cannot attach to this target / cannot access a chrome:// / cannot access contents of" → RESTRICTED_URL; "detached while handling command / debugger is not attached" → CANCELLED; `isExecutionTerminated` → TIMEOUT; fallback `[chrome.debugger] …` → DEBUGGER_ATTACH. All five codes of 0.6 have a source string |
| `handlers/tabs.ts` | `newTab` creates with `active: true` (`:20`) ✓; `selectTab` focuses the window then activates (`:12-17`) ✓; `listTabs` returns `{id,title,url,active}` with per-window `active` (`:3-10`); `closeTab`/`selectTab` read `p.id` (F4) |
| `NetworkRequestsResult.text` at `protocol.ts:204` | exact |
| 22 codes vs spec §10 | equal one by one |
| `route.ts` `daemonWaitMs`, `daemon.*` set | `:14-17`, `:96-116` (`status`, `shutdown`, else `UNKNOWN_METHOD`); executed C8, C9 |
| `wsHost.ts` ignores and counts extension events | `:247-260`; executed C10 |
| `registry.ts` disconnect path | `wsHost.ts:221-233` → `registry.remove` → `onCountChange(count)` (F14) |
| offscreen relay and an id-less `{event, params}` | `extension/src/offscreen.ts:30-32`: `type:"send"` passes any string to `ReconnectingClient.send` (`client.ts:28-30`), so the SW can send `JSON.stringify({event, params})` today; nothing in `sw.ts` does yet. Dropped silently when the socket is down (F15). Read, not executed (needs Chrome) |
| `BridgeClient.on("event")` / `on("reconnected")` | `sdk/src/client.ts:176-191`; executed C12b, C13 |
| snapshot text / network formatters | F11 (line cites corrected) |
| Step 5 fixture entries for T4.2 | `extension/test/network-log.test.ts:572-759` (`formatEntries`, `formatEntry` describes) |
| `mcp/src/config.ts` actor name | `actorName(pid = process.pid)` → `claude-code #<pid>` (`:10-12`) ✓ |
| Chrome: `tabs.onReplaced` on discard | F7 (unconfirmed, likely no) |
| Chrome: `captureVisibleTab` on a minimized window | docs: "Captures the visible area of the currently active tab in the specified window" — nothing on minimized/occluded. **Unconfirmed; T5 SCREEN-4 (minimized) and SCREEN-5 (an unfocused/covered window) confirm live.** 0.5's `WINDOW_MINIMIZED` check before switching stands regardless |
| Chrome: `captureVisibleTab` rate | F10 (2/s, documented) |
| Chrome: `tabs.onActivated` timing | docs: "Fires when the active tab in a window changes" and "the tab's URL may not be set at the time this event fired" — nothing on paint timing. **Unconfirmed; SCREEN-1's flash measurement confirms the 1 s / 50 ms choice live** |
| Chrome: `tabs.update {active}` does not focus the window | docs: "Does not affect whether the window is focused (see windows.update)" ✓ (0.5's premise) |
| Chrome: `windows.getLastFocused` filter | default `['normal','popup']`; `devtools` is a window type (F8) |

## Lens (b) — internal consistency

- **Events:** see F13 (shapes) — spec §10 lists E→D `tabCreated | tabRemoved | tabReplaced` and D→C
  `tabGone | leaseGranted | extensionStatus`; T0 names exactly the five new param types; T1 emits the
  three E→D events; T2 emits the two new D→C events. Consistent once F13's shapes are written.
- **`daemon.status` additions:** `tabs: [{tab, tabId, owner, url?}]`, `lock: {holder?}`. `holder` is not
  defined — propose the holder's client **name** (as `TAB_HELD.owner` and `LOCK_TIMEOUT.holder` are
  names); `owner` likewise a name, absent when unheld. Additive to the C2 shape, so `browser_status` and
  `recipes/hello.ts` keep working. `url` goes to clients, never to the log (F34).
- **Timings:** 1 s activation wait and 50 ms frame (0.5) — no contradiction; the spec's "flashes
  ~100–200 ms" is a prediction SCREEN-1 measures. 1 h / 1 000 dead handles (0.2, spec §12) consistent.
  The 2/s capture quota (F10) adds a 500 ms spacing the plan did not state.
- **Lock deadline:** F9.
- **Counts:** all re-derived (Counts table); none wrong. The plan's T1 site list matches the code.
- **Free methods:** plan 0.3 and spec §6.3 agree that `networkRequests` is free in every scope, and that
  `networkClear` is not listed free — "checked" is consistent with the spec (doubt closed; F3 adds the
  `"all"` case).
- **0.1 vs T1's title:** "no behaviour change when `tabId` is absent" holds for the 13 sites; F4 adds
  the three methods that must not fall back.

## Lens (c) — blind spots (seed list, each resolved)

| Seed item | Finding / resolution |
|---|---|
| Active-tab mismatch (W1 proposal 3, #36) | F8 — owners T1 (resolver, `listTabs` `current`, error text), T2 (claim), T4 (status/list), T5 (recipe); no E2E expected text changes |
| A Step 6 MCP against a Step 7 daemon | F5 — recommend (C): daemon legacy path that resolves + lease-checks + logs once, plus no main-tree build between T2 and T4 |
| The building session's own `npm run build` | F5 (B); and the baseline above: this audit's build reproduced the recorded id, so nothing moved |
| Events lost while a socket is down; resync | F15 — resync from `listTabs` on every extension hello |
| The MCP's cursor after a non-4002 close | covered by 0.2's Corrected note (`BridgeLink` makes a new client; C17 shows the old client does not reconnect). T4 test: the one-line notice appears after both a 4002 reconnect (`on("reconnected")`, C13) and a new client from `BridgeLink` — the MCP must remember "had a cursor" across the client swap |
| MV3 worker culling vs the `lastUrl` cache; `storage.session`; top-level listeners | F16 — no `storage.session`; refill at start; listeners top-level and synchronous (T1.4 as F25 sharpens it) |
| Non-normal windows; incognito; `chrome://` | F8 (normal windows only for "the human's tab"); `activateForCapture`/`focusTab` act on the target's own window, whatever its type; incognito tabs are invisible unless the user allows the extension in incognito (then they are ordinary targets — note in T6); `chrome://` targets: content methods → `RESTRICTED_URL` from `ensureContent`/`describeDebuggerError` (T1), `captureVisibleTab` of a `chrome://` page — unconfirmed, SCREEN rows use fixture pages only |
| The human's tabs during the wave | T5 opens its own Chrome windows on fixture pages (kickoff §7 T5 step 3); SCREEN-1/5 switch only those windows' tabs; LEASE-7's "human" tab is opened by the driver. Recorded as a T5 sheet rule (#33's revisit trigger) |
| Lease leaks | F35 (`daemon.kick` later); `tabs.claim` on a held tab fails fast with `TAB_HELD {owner, since}`. Proposed message (T2 writes, T4 renders): `tab T3 is held by "export-grades.ts" since 12:01:33 — use browser_new_tab, or browser_list_tabs to pick a free tab`. T4.4 checks the owner's name appears |
| Log hygiene | F34 |
| The `unknown method` symptom | F22 (`INTERNAL`, match text); F6 adds a `VERSION` reload hint |
| Windows vs POSIX | F35 |
| The token | F35 |
| *Added:* `CODE:message` cannot ride on throws | F1 |
| *Added:* download methods vs the "tab is required" rule | F2 |
| *Added:* the existing `tab` parameter of the network tools | F3 |
| *Added:* `closeTab`/`selectTab` take `id` | F4 |
| *Added:* a stale extension silently ignores `tabId` | F6 |
| *Added:* discard semantics | F7, F18 |
| *Added:* capture quota | F10 |
| *Added:* Chrome ids in model text / status | F12 |
| *Added:* `newTab` vs opener race | F20 |
| *Added:* lock released while the extension still switches | F19 |

## Lens (d) — testability of the exit checks

Kind: **U** = unit/repo check (T0–T4, T6), **L** = live row the driver runs (T5), **K** = needs the
user's keyboard (only the extension reload).

| Check | Kind | Executable / discriminating? | Note |
|---|---|---|---|
| T0.1 | U | yes | list the `text` consumers (Counts) |
| T0.2 | U | yes | "each new event guard rejects a frame without `params`" — `isEvent` already does (`protocol.ts:102`); a test per event name still fails if a guard drops the check |
| T0.3 | U | yes (`git diff` of `codes.ts`) | |
| T1.1 | U | yes | |
| T1.2 | U | yes | grep empty + fallback-only use |
| T1.3 | U | yes | add F1's marker case, F4's `closeTab` case, F17's `tab`-key case |
| T1.4 | U | weak (judgement) | F25 mechanical form |
| T1.5 | U | weak (single-line keyword grep) | F25 addition |
| T1.6 | K or deferred | yes (a recorded fact) | G7-1 |
| T1.7 | U | yes | |
| T2.1–T2.4 | U | yes | add F2 (download without `tab` succeeds), F5 (legacy path, including a legacy `screenshot` taking the lock — V3), F6 (`VERSION` for a no-proto extension), F9 (one deadline), F15 (resync), F20 (race) |
| T2.5 | U | yes (corrected grep) | |
| T3.1–T3.2 | U | yes | T3.2 wording (F25) |
| T3.3 | U | yes | grep for `focused` is case-sensitive, so F8's `getLastFocused`/`lastFocusedWindow` in `tabs.ts` do not trip it — keep the resolver's call free of a lowercase `focused` key |
| T3.4–T3.5 | U | yes | |
| T4.1–T4.5 | U | yes | T4.2 per F11 (worktree capture); T4.5 per F24 |
| T5.1 | L (+K: the reload) | yes | |
| T5.2 | L | needs the PASS rules below | |
| T5.3 | L | yes | NET-1 now `12.6 KB` (#36) |
| T5.4 | L | yes | |
| T6.1 | U | **cannot fail** as written | F25 |
| T6.2–T6.3 | U | yes | |

Rows that lack an expected text today (all of them, by design — T5 writes them before the run); those
whose intent is not yet discriminating, with a proposed rule:
- **LEASE-2** "no interleaving": the script types a known 30-character string into the fixture's text
  box on its tab at a slow trusted pace while Claude snapshots its own tab 3 times; PASS = the script's
  box holds exactly that string, Claude's three snapshots succeed and never show the script's tab's URL.
- **LEASE-6:** F7's two-way rule.
- **SCREEN-1:** method chosen first (page-side `visibilitychange` timestamps on the fixture are the
  finest: the target tab logs `visible`/`hidden` with `performance.now()` and the human's tab likewise);
  PASS = the image is the target page, the human's tab is active again within 2 s, and the flash is
  reported as a number (any value; > 1 s noted as a finding, not a fail).
- **SCREEN-2:** PASS = no tab switch (the human's tab logs no `hidden`), the banner seen in the capture
  loop, and the image shows the target page's title text.
- **SCREEN-4 (recorded either way):** PASS-as-designed = the default mode answers `WINDOW_MINIMIZED`
  without un-minimizing the window; the `cdp` case is recorded as "rendered image / blank / error" with
  the exact text — no pass/fail.
- **BG-1 / BG-2 (recorded either way):** PASS = the fixture's `isTrusted` reporter shows `true` for the
  click (BG-1) and the typed string is exact (BG-2) on a background tab with the human's tab unchanged;
  FAIL is recorded with the text, then retried with `Emulation.setFocusEmulationEnabled` and recorded
  again (T5.2).
- **BG-3:** PASS = the first `evaluate` returns `NotAllowedError` (or the document-focus message) and the
  one after `browser_focus_tab` succeeds.
- **F8's resolver under a focused DevTools window (unconfirmed; pre-registered):** at G7-1 if taken at
  T1, else a T5 row — focus the service-worker DevTools window, then call `browser_status` and
  `browser_snapshot`; PASS = the snapshot succeeds on the fixture page that status's `Active tab:` line
  names, with no `No … window` error; anything else is a FAIL of the resolver, recorded, never re-tuned.
  Close the console before the next row (LESSON) (fixed after verifier V2, 2026-10-22).
- **BG-4 (recorded either way):** PASS = `waitFor {text}` finds a fixture text that appears after 2 s,
  and `networkIdle` returns, both within 10 s on a background tab; the elapsed times are recorded.

## Rulings re-checked by premise (not reopened)

| Ruling | Premise | Result |
|---|---|---|
| `selectTab` stays an alias of `focusTab` for one release (#2b) | `selectTab` today = focus window + activate (`handlers/tabs.ts:12-17`) | holds; the alias must accept `id` and `tabId` (F4) |
| 4 `activeTab()` in `actions.ts`, 13 in all (#8) | grep | holds (lines 6, 12, 39, 85; 13 total) |
| DL-1/DL-2 exist (#5) | `docs/e2e-test-plan.md:554, :555` | holds |
| T1 adds the "open popup" button (#6) | no `_blank` or `window.open` in `test-fixtures/e2e-playground.html` today; fixture pages available: `e2e-playground.html`, `e2e-playground-csp.html`, `ok.json`, `dl/`, `redir/` | holds (the button is still to add; target `e2e-playground-csp.html` or a new fixture page, T1.7) |
| Actor name from the MCP's own `process.pid` (#2) | `mcp/src/config.ts:10-12` | holds |
| The SDK clears its cursor after a daemon restart (#11) | the hook exists and fires after a 4002 reconnect (C13); a non-4002 close yields a new client (C17) | holds; T4 covers both paths |
| `networkClear` stays lease-checked | spec §6.3 free list excludes it | holds (doubt closed; F3 adds `"all"`) |

## Proposed stage split

Default kept: **T0 → (T1 ∥ T2) → T3 → T4 → T5 → T6.** Reasons: T1 and T2 stay file-disjoint even with
the findings (F1/F4/F6-hello/F8-resolver/F16/F17/F18 in `extension/`; F2/F3-daemon/F5/F6-gate/F9/F14/
F15/F20 in `daemon/`); both read T0's shapes (F13). T3 shares `extension/` files with T1. T4 needs T2's
`tab`/`current` annotations and T3's data. The T2–T4 compatibility window is handled by F5 (C) — no
re-order needed; T4 cannot move before T2 because the MCP needs the daemon's handles.

| Stage | Absorbs | Kickoff budget | Expected agent wall time (Step 6 ran at about a quarter) |
|---|---|---|---|
| T0 | F13 (exact param shapes), F21 (code cross-use comment), the D0 revisit ruling (does v2 require `code`?) | 0.5 h | ~10 min |
| T1 | F1, F4, F6 (hello `proto:2`), F8 (resolver, `current`, error text), F16, F17, F18, F29, F30, F33; T1.4/T1.5 sharpened (F25) | 2.5 h | ~45 min (+15 for F1/F8) |
| T2 | F2, F3 (daemon side), F5 (A), F6 (gate), F8 (claim), F9, F12 (entry `tab`), F14, F15, F20, the `TAB_HELD` message | 3 h | ~60 min (+20 for F5/F6/F15) |
| T3 | F10, F19; `focusTab`/`selectTab` with `tabId`/`id` (F4) | 2.5 h | ~40 min |
| T4 | F3 (MCP schema), F11 (worktree capture), F12 (handle map), F23 (subpath), F24, the cursor notice on both paths | 2.5 h | ~45 min |
| T5 | F7, F10 (SCREEN-3 with three actors), F18, F26's PASS rules, `recipes/hello.ts` uses `current` (F8), F8's DevTools-focused check unless taken at G7-1 (V2) | 1.5 h + 3 h live | ~25 min + the live wave |
| T6 | F25 (T6.1 form), F31, F32, spec §6.2 note (F13), spec §3 note if F7 (a) | 1 h | ~15 min |

Session-agent items before T2's dispatch: F5 (B) in the T2, T3 and T4 briefs ("no `npm run build` in the
main tree until T4's commit; verifiers build in a clean worktree").

## Amendments

Applied by this audit to `docs/plans/2026-10-21-step7-multi-actor-tabs.md` (mechanical, each a dated
*Corrected 2026-10-22 (Stage 0)* note placed after the line it corrects; the original text is kept):
- **A1** T5 opening paragraph ("a wave run with the user") — #33: the driver runs the wave.
- **A2** T5 "Needs the user's keyboard" — only the extension reload (#33).
- **A3** G7-2 — the driver runs the wave; the user's keyboard only for the extension reload (#33); and
  the Open items' keyboard summary.
- **A4** Prerequisite paragraph — Step 6 closed 2026-10-22 on W1 (Run 7) and #34–#36; MUX-7 confirmed
  #14, so no launcher prerequisite (#31); the Step 6 contracts were executed by this audit (25/25 hold).
- **A5** 0.7's `NetworkLog.format` → the free functions `formatEntries`/`formatEntry` with line numbers;
  snapshot text built in `buildSnapshot` (F11's mechanical part).
- **A6** Open items: the `extensionStatus` premise verified by execution (C1b, C7); the `networkClear`
  doubt closed.

Proposals left for the session agent (not applied: design-local or contract-level, or touching a
pre-registered check): F1–F26 resolutions; F25's three check rewrites (T1.4, T1.5, T6.1) and T3.2's
wording; F26's PASS rules for the T5 rows; F5 (B) in the briefs.

## Proposed decisions

### 2026-10-22 · Content-script failures are returned, not thrown, to carry `CODE:message`
**Decided:** The content script's public methods catch their own errors and return
`{__bridgeError: "CODE:message"}`; `unwrapResult` splits that into a `BridgeError`, and still treats a
null or undefined result as `REF_STALE`.
**Why:** a thrown injected function resolves `executeScript` with `result: null` (`CLAUDE.md` gotcha;
the Chrome reference lists no `error` field), so a prefix on a throw never arrives (Stage 0 F1).
**Instead of:** prefixing thrown messages, as plan 0.6 says.
**Revisit if:** Chrome adds an `error` field to `InjectionResult`.
**By:** Claude (proposed)

### 2026-10-22 · The daemon's method classes are one table, and the download methods are free
**Decided:** `route.ts` classifies every method as tab-carrying (lease-checked), intercepted without a
tab (`newTab`, `listTabs`), intercepted and lease-checked (`closeTab`: check, forward, remove the
handle — spec §10; fixed after verifier V7, 2026-10-22), free and forwarded (`networkRequests`, `downloadStart/Chunk/End`) or
daemon-handled (`daemon.*`, `tabs.claim`, `tabs.release`); only a tab-carrying method without `tab` gets
`BAD_PARAMS "tab is required"` (or F5's legacy path).
**Why:** the plan's free list omits the download methods, which touch no tab; spec §6.3 makes such calls
free (Stage 0 F2).
**Instead of:** "no `tab` and not free → `BAD_PARAMS`", which would break `browser_download`.
**Revisit if:** a new extension method is added — it must be put in the table.
**By:** Claude (proposed)

### 2026-10-22 · The `tab` parameter keeps its "all"/"active" meanings for the network tools — for user review
**Decided:** The daemon reads `tab` as a handle, or `"all"` (passed as a scope), or `"active"`/absent (the
caller's target); a bare number from a Step 7 client is `BAD_PARAMS`. The MCP's network tools take
`"active" | "all" | <handle>`. `networkClear {tab:"all"}` is refused with `TAB_HELD` if another client
holds a tab with entries.
**Why:** `tab` already means a scope on `networkRequests`/`networkClear` and in their MCP schemas (Stage 0
F3); this keeps both tools' behaviour and never clears a foreign held tab.
**Instead of:** resolving every `tab` as a handle (breaks `"all"`), or renaming the network scope param.
**Revisit if:** Step 8 redesigns the network tools' arguments.
**By:** Claude (proposed, contract-level)

### 2026-10-22 · A Step 6 client keeps working against a Step 7 daemon for one release, without loosening a lease — for user review
**Decided:** (C): a tab-carrying call with no `tab` (and `closeTab`/`selectTab` with a Chrome `id`) from a
client is resolved by the daemon to the active tab (or the id's handle), lease-checked like an explicit
`tab`, forwarded with `tabId`, and logged once per client with no URL; no lease is granted. The
method's lock class applies unchanged (the lock is taken even when the target is already active); a
T2 unit test shows a legacy `screenshot` waits for the visibility lock (fixed after verifier V3,
2026-10-22). Step 8 S2
removes it with the extension's fallback. And: no `npm run build` in the main tree between T2's and T4's
commits; verifiers build in clean worktrees.
**Why:** the knock adopts whatever daemon is on disk (`sdk/src/knock.ts:162`), so after a build every
running Step 6 MCP joins the Step 7 daemon and would get `BAD_PARAMS` on every tool (Stage 0 F5);
resolving before forwarding keeps held tabs protected.
**Instead of:** (A) or (B) alone; a fallback that forwards without `tabId` (a lease loosening, forbidden).
**Revisit if:** Step 8 S2 lands, or a legacy-path log line appears after every session has been
restarted.
**By:** Claude (proposed, contract-level)

### 2026-10-22 · A stale extension is refused for tab calls, detected by its hello — for user review
**Decided:** T1's extension sends `{type:"hello", token, role:"extension", proto:2}`; T2's daemon answers
every tab-carrying method with `VERSION` "the Chrome extension is an older build — reload it at
chrome://extensions" while the connected extension's hello had no `proto`.
**Why:** an extension that was not reloaded ignores `tabId` and acts on the active tab, past every lease
(Stage 0 F6); the Step 6 daemon accepts this hello (probe P1), so T1 stays compatible.
**Instead of:** relying on the T5 stale check and the `unknown method` text.
**Revisit if:** the extension hello gains a build id (then compare builds instead).
**By:** Claude (proposed, contract-level)

### 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window
**Decided:** One resolver (`windows.getLastFocused({windowTypes:["normal"]})` → its active tab) serves the
0.1 fallback, a new `listTabs` field marking that one tab, `tabs.claim {active:true}`, F5's legacy path,
`browser_status` and `browser_list_tabs`; with no normal window the error says a DevTools or popup
window may have focus. What `getLastFocused({windowTypes:["normal"]})` returns while a DevTools window
holds focus is **unconfirmed** (not documented; W1 MUX-5 measured only `lastFocusedWindow:true`); a
pre-registered live check (G7-1 or a T5 row: with the service-worker DevTools window focused,
`browser_status` and `browser_snapshot` name and act on the same tab) confirms it
(fixed after verifier V2, 2026-10-22).
**Why:** W1 proposal 3, accepted by decisions.md · 2026-10-22 · The user rules on the W1 proposals;
`browser_status` and the actions disagree today (Stage 0 F8).
**Instead of:** `lastFocusedWindow:true` (empty under DevTools) or "first active tab of any window".
**Revisit if:** a row shows a popup window the user expects to be "the active tab", or the
DevTools-focused check fails.
**By:** Claude (proposed)

### 2026-10-22 · One deadline per call covers the lock wait and the forwarded call
**Decided:** `deadline = received + clamp(timeoutMs ?? 30000, 100, 600000)`; the lock wait ends at it
(`LOCK_TIMEOUT {holder}`), the forwarded call waits `deadline − now + 5000`; the extension gets no
deadline.
**Why:** two independent waits would outlive the SDK client's timer (Stage 0 F9); the extension bounds
its own activation wait.
**Instead of:** a fresh `daemonWaitMs` after the lock is acquired; forwarding `timeoutMs`.
**Revisit if:** the extension needs to cut a capture short on the caller's deadline.
**By:** Claude (proposed)

### 2026-10-22 · LEASE-6 measures whether a discard keeps the tab id, with both outcomes pre-written
**Decided:** LEASE-6 records the tab id before and after a `chrome://discards` discard and reload;
"same id, no `tabReplaced`, handle works" and "new id, `tabReplaced`, handle works" both PASS; the
remap itself is covered by T2's unit tests.
**Why:** Chrome documents `onReplaced` only for prerender/instant, and Chromium's 2024 discard clears the
document in place (Stage 0 F7) — the premise is likely false on Chrome 156.
**Instead of:** the row as written, which would fail on an event that no longer fires.
**Revisit if:** LEASE-6 shows a new id.
**By:** Claude (proposed)

### 2026-10-22 · The formatters reach the MCP through a `@bridge/sdk/format` subpath — for user review
**Decided:** T4 adds a `./format` export to `sdk/package.json`; `sdk/src/index.ts` keeps its five values;
Step 8 S3 adds `formatSnapshot`/`formatNetwork` to `index.ts`.
**Why:** the SDK's public surface is Step 8's (decisions.md · 2026-10-22 · BridgeClient exposes welcome,
extensionConnected and on("reconnected") in Step 6), but Step 8's S3.4 reads as if Step 7 exported them
(Stage 0 F23).
**Instead of:** exporting them from `index.ts` in Step 7.
**Revisit if:** a recipe needs them before Step 8.
**By:** Claude (proposed, contract-level)

### 2026-10-22 · T4.2's baseline is captured in a worktree of T3's parent commit
**Decided:** T4's builder runs the baseline `buildSnapshot` and `formatEntries`/`formatEntry` over the
existing test fixtures in a worktree of T3's parent commit, stores the strings under `sdk/test/fixtures/`
with that commit id, once; the verifier repeats the capture and diffs.
**Why:** no whole-text baseline exists (the snapshot tests use `toContain`), and T4 runs after T3
changed `buildSnapshot` (Stage 0 F11).
**Instead of:** capturing from the new code (forbidden) or asking T3 to capture outside its lane.
**Revisit if:** the worktree capture cannot run the jsdom fixtures.
**By:** Claude (proposed)
