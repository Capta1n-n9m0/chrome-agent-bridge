# Step 10 Stage 0 — spec audit (findings)

Auditor: Stage 0 builder (Claude Opus 5.5), 2026-10-24, at `55ee4de` (baseline `1c43887` + the run-opening docs
commit; the code equals `f45e3bf`'s). No feature code was written and nothing outside the steps dir was edited.
Every probe ran in a scratch git worktree (`git worktree add --detach <scratchpad>/s0wt 55ee4de`, own
`npm install`), bound 127.0.0.1 port 0 only, and was deleted with the worktree; Chrome, the real daemon and
port 9234 were never touched. Evidence beside this file:

| File | What |
|---|---|
| `stage0-baseline.txt` | typecheck / test / build / `git status` at `55ee4de`; daemon build id |
| `stage0-transport.txt` + `stage0-probe-transport.test.ts.txt` | 0.4's transport measurement (command, output, source) |
| `stage0-contracts.txt` + `stage0-probe-contracts.test.ts.txt`, `stage0-probe-gate.test.ts.txt`, `stage0-probe-logcount.test.ts.txt` | Step 9 and Step 8 contracts executed; named existing tests |
| `stage0-release-trees.txt` | 0.6's intermediate trees, three variants, in a second scratch worktree (removed) |

Glossary: **gate** = the extension's safety check (`extension/src/safety.ts` `safetyDecision`, run by `CallSafety`
in `GatedRouter`); **attach set** = the 7 codes on which the SDK attaches a failure report (`sdk/src/error.ts:66`);
**host leg** = daemon ⇄ SDK and fake-extension ⇄ daemon over real `ws` (measurable here); **Chrome leg** =
`chrome.debugger` → service worker → `chrome.runtime` message → offscreen document → browser WebSocket (not
measurable without Chrome); **(A)/(B)** = 0.4's two transports; **Variant C** = the release-tree layout of §6.

Severity count: **CRITICAL 0 · MAJOR 7 · MINOR 14 · NIT 5** (26 findings, F1–F26). No Step 9 or Step 8 contract
failed (§2).

## 1. Counts (recomputed 2026-10-24, scratch worktree at `55ee4de`)

| Item | Phase doc / kickoff | Measured | Command / source |
|---|---|---|---|
| Router methods | 23 | **23** (navigate … downloadEnd); `METHOD_CLASSES` 23; sw.ts scan = table, 0 non-literal | `grep -c 'router.on(' extension/src/sw.ts` → 23; probe `S9-on` |
| Codes | 25 (24 wire + `NO_CURSOR`) | **25** = 9 daemon + 15 extension + 1 SDK; `ErrorCodes` keys 25 | probe `S9-codes` |
| MCP tools | 23 | **23** (`reg.tool(` 23; 23 distinct `"browser_*"` names) | grep |
| `npm test` | 2720 / 116 | **2720 passed, 116 files** (20.7 s) | `stage0-baseline.txt` |
| typecheck / build | 0 / 0, no tracked change | **0 / 0**; after build only this run's own untracked output files | `stage0-baseline.txt` |
| Daemon build | `99bb55c5…` | main tree **`99bb55c5913cdb6a…`**; a clean build of `55ee4de` gives the same hash | `sha256sum` |
| Log sites (Step 9 scan) | "60 (extension 15, daemon 33, sdk 0, mcp 6)" | **54** = 15 + 33 + 0 + 6, found = allowlist both ways; 54 also at `59388ed` and `6fef83c` | probe `log-sites`; F8 |
| Snapshot cap | 800 | `MAX_LINES = 800` (`extension/src/content/snapshot.ts:7`); `truncated` is `>= 800` (F23) | read |
| Download chunk | 1 MiB | `CHUNK_BYTES = 1024 * 1024` bytes (`sdk/src/download.ts:10`), base64 on the wire (≈ 1.33 MiB per frame) | read |
| 64 MiB (0.4) | threshold for (A) | undefined unit (characters vs frame bytes); host leg passes ≤ 99 MiB frames, breaks > 100 MiB | F1 |
| Serialiser limits | "100 items, depth 6" | `{maxDepth: 6, maxItems: 100, maxString: 5000}` (`serialize.ts:19`) — the 5000-character string cap is not named in 0.4 | F25 |
| `evaluate` timeout | — | clamped to [100, 60 000] ms (`handlers/evaluate.ts:13`); MCP schema max 60 000 | read |
| 20 s / 90 s / 95 s | bb-login | today: `SettleSec = 20` (`bb-login.ps1:63`), `Start-Sleep -Seconds 3` after the press (`:260`), `ScanSec = 10`; the new 90 s + 3 s + a 10 s scan can exceed S5.1's 95 s | F10 |
| S4.1's 300 characters | answer bound | the answer holds the path: `Saved <path>` + ~95 characters; a 260-character Windows path alone breaks it | F13 |
| 0.5 retirement | "tests that cover only them" | 6 tests minimum (5 in `blackboard-export-file.test.ts`, 1 in `blackboard-held.test.ts`); 15 if `--mcp-plan` goes too | F9 |
| Step 8 range | — | 60 commits in `70aa754..a1932a8`, every one `Co-Authored-By: Claude Opus 5.5`, two `Claude-Session` ids (32/28) | §6 |

## 2. Contracts — re-executed

Commands and raw output: `stage0-contracts.txt` (`npx vitest run mcp/test/zz-stage0-contracts.test.ts
extension/test/zz-stage0-gate.test.ts` → 16 passed; named tests 380 + 6 passed; log count probe).

| # | Contract (binding forward) | Verdict | Discriminating evidence |
|---|---|---|---|
| S9-1 | 25 codes; `DISARMED`, `DOMAIN_BLOCKED` on the wire; `NO_CURSOR` SDK-only | **HELD** | `PROBE S9-codes total=25 wire=24 sdkOnly=["NO_CURSOR"] ErrorCodesKeys=25`; extension import: `daemon=9 extension=15 sdk=1` |
| S9-2 | `DISARMED {scope}`: `"all"` disarmed or unreadable; `"evaluate"` for `evaluate` (also `asRef`) and a `javascript:`/`data:` `navigate`/`newTab` with JavaScript off; no handler runs | **HELD** | real `GatedRouter` + `CallSafety`: `evaluate/jsOff -> DISARMED {"scope":"evaluate"} handlerCalls=0` … `click/jsOff -> ok handlerCalls=1`, `evaluate/unreadable -> DISARMED {"scope":"all"}` (8 rows, exact list asserted) |
| S9-3 | `GatedRouter.on` throws for a method with no safety class | **HELD** | `evaluateToFile`, `evaluateChunk`, `evaluateEnd`, `saveTo`, `selectTab`, `""`, `constructor`, `__proto__`, `toString` → `safety gate: method "…" has no safety class`; all 23 classified names register; `sw.ts` scan names = table |
| S9-4 | Unknown method → `UNKNOWN_METHOD` in every state | **HELD** | 5 states (armed, disarmed, JS off, unreadable, blocked tab): `UNKNOWN_METHOD reads=0` — the state is not even read |
| S9-5 | `safetyStatus` never null; a new extension hello and a disconnect reset `daemon.status.safety` to null; identical repeat silent | **HELD** | `before=null afterReport={…} afterDisconnect=null afterNewHello=null afterDisarm={"armed":false,…}`; events seen exactly 2, both objects |
| S9-6 | Daemon redaction while disarmed (status rows, `tabGone`, `TAB_GONE`, `leaseGranted.url ""`) | **HELD** | armed rows carry `url`; disarmed rows none; `leaseGranted=[{"tab":"T3","reason":"opener","url":""}]`; `tabGone=[{"tab":"T2"}]`; `TAB_GONE data={"tab":"T2"}`, no `://` in the message, no `SENTINEL` |
| S9-7 | Attach set without the two codes; no `report()` on them | **HELD** | `DISARMED {all}`, `DISARMED {evaluate}`, `DOMAIN_BLOCKED`: `attachCalls=[] hasReport=false`; C1 below |
| S9-8 | The log scan (multiset = allowlist; sentinel) | **HELD, count wrong** | `log-scan.test.ts` 16 passed, `log-sentinel.test.ts` 2 passed; `allowlist=54 found=54 {"extension":15,"daemon":33,"mcp":6}` — the "60" in the docs is an arithmetic error (F8) |
| C1 | Attach set = 7 codes | **HELD** | each of the 7 → `attachCalls=["networkRequests","screenshot","snapshot"]`; `RESTRICTED_URL`, `INTERNAL`, `DISARMED`, `DOMAIN_BLOCKED`, `DEBUGGER_ATTACH` → `[]` |
| C2 | `code` required; codeless → `INTERNAL`, logged once per connection | **HELD** | `e1=INTERNAL/no code here e2=INTERNAL logLines=["extension error without code: click"]` |
| C3 | Session marker; a changed marker retires handles | **HELD** | 6 `chooseMarker` branches as specified; same marker → ok; A→B → `TAB_GONE`, `tabGone` with cached `lastUrl`, log `extension session changed: 2 handles retired` |
| C4 | Handle numbers never reused across daemons | **HELD** | `daemonA=T2 daemonB=T66 staleOnB=TAB_UNKNOWN` |
| C5 | MCP cursor rule | **HELD** (existing tests) | `mcp/test/tools.test.ts:167-174` asserts `["T1","T9","T1"]` and `claims()==1` (6 passed with `-t explicit`); `cursor.test.ts` 18 passed |
| C6 | `TAB_HELD {owner, since}` fail-fast | **HELD** | `code=TAB_HELD data={"owner":"probe-owner","since":…} reachedExtension=[]` |
| C7 | FIFO visibility lock; `LOCK_TIMEOUT {holder}` | **HELD** | forwarded `200@1, 201@304, 202@604` (each after the previous answer at 303/603); the 150 ms waiter → `LOCK_TIMEOUT {"holder":"probe-lock-a"}`, never forwarded |

Also executed for 0.3: an extra result field crosses the daemon unchanged (`locate` and raw `click` returned
`pastSnapshotCap: true`), and `Tab.click` resolves `undefined` (the field is dropped by the SDK's `Promise<void>`).
For 0.4 (B): `CallSafety("evaluate", …)` with no `tabId` is refused while disarmed / JS off / unreadable but
**allowed on a blocked tab**; with a `tabId` it is `DOMAIN_BLOCKED` there (F4).

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

## 4. 0.6 — base and close commits

- **Base `70aa754`** (`docs: close Step 7 (multi-actor tabs); Step 8 kickoff`) — the first commit of S7.md §4's
  checked range "`70aa754..HEAD`"; its parent is Step 7's propagator.
- **Close: recommend `a1932a8`** (`docs(step8): W2 — the user rules the 25 open decisions (#106–#127)`) — the last
  commit that is Step 8 only. Neither the as-built nor S7.md names a close commit. The alternatives:
  `e963bff` (as-built S7; before the propagator, close-out and W2 rulings), `117b16a` (close-out), `59be263`
  (`docs: close Step 8 (W2); Phase E design; Step 9 kickoff` — mixes Step 9's kickoff into the tree). Code is the
  same in all four: `git diff --stat 05a34f0 59be263 -- . ':!docs' ':!CLAUDE.md'` → only `README.md`;
  `e963bff..a1932a8` → no non-doc change.
- Hygiene: `git log --name-only 70aa754..a1932a8` and `git ls-tree -r` of both trees: 0 paths under `dist/`,
  `bridge.token`, `.env`, `exports/` or `*.png`. A branch `feat/agent-bridge` already exists (not Step 10's);
  no `release/*` branch and no tag exist.

## 5. 0.8 — can `onActivated` end the 1000 ms wait as written? **Yes.**

`extension/src/tabs.ts:249-271` (`showTab`):

```ts
const listener = (info: chrome.tabs.OnActivatedInfo): void => {
  if (info.tabId === tabId) { chrome.tabs.onActivated.removeListener(listener); done(); }
};
let done!: () => void;
const activated = new Promise<void>((resolve) => (done = resolve));
chrome.tabs.onActivated.addListener(listener);
const timer = setTimeout(() => done(), ACTIVATION_WAIT_MS);
…
await chrome.tabs.update(tabId, { active: true });
await activated;
```

`done` is bound before the listener is added, the listener is added before `tabs.update`, and an event for the
target resolves the same promise the timer would. So, as written, the first `onActivated` for the target ends the
wait; it runs to 1000 ms only if Chrome delivers no such event to this listener (or with another `tabId`, e.g. a
tab replaced mid-call). The call's other costs sit outside the wait: `reserveCaptureSlot` (up to 500 ms after a
recent capture), two `safety.effect()` reads, `captureVisibleTab` itself, a `tabs.query`, and the restore. Hence F3.

## 6. Findings

### MAJOR

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

**F3 · plan-side (0.8, SW-1, S7b) · the S7b fix is today's code, and SW-1's table cannot tell the cases apart.** §5:
the listener already ends the wait. SW-1's rule ("failed tab visible ≤ 100 ms **and** the call ≥ 1000 ms in 3/3 →
runs to its bound") reads "bound" whenever `captureVisibleTab` plus the restore take ≥ 1 s, even if `onActivated`
ended the wait at +5 ms — a fix stage on a false premise. Amendment (stricter, written before any measurement):
"*Amended 2026-10-24 (Stage 0 F3): Stage 0 read `showTab` (`extension/src/tabs.ts:249-271`): `onActivated` for the
target ends the wait as written, so 'the listener ends the wait' is already the code. SW-1 is a differential row:
per trial, (i) a default-mode screenshot of a background fixture tab in the human's window and (ii) one of a fixture
tab already in front of the same window, captures ≥ 1.5 s apart (no slot wait), three trials, page-side
`visibilitychange` stamps on both tabs. Outcome: median((i) − (ii)) ≥ 950 ms in 3/3 → the wait runs to its bound (a
fix stage S7b names why the event is missed — e.g. ends the wait on `tabs.update`'s resolved `active: true` — with
its own re-measure row); ≤ 300 ms in 3/3 → the event ends the wait and the ~1.5 s is the capture itself: recorded,
no change, the carried input closes; anything else → recorded as undetermined, no change.*"

**F4 · plan-side (0.4 (B), S4.3) · contract-level · a tab-less pull skips the block list; the daemon refuses it
anyway.** Probe `0.4B-class`: `CallSafety("evaluate", {id})` without `tabId` → `allow` on a blocked tab (the target
is `gone`, allowed at receipt — `safety.ts` step 2b), with `tabId` → `DOMAIN_BLOCKED`; and the daemon refuses an
unlisted method without `tab` (`daemon/src/methods.ts` `classify` → `untargeted` → `BAD_PARAMS "tab is
required"`). Amendment: "*Amended 2026-10-24 (Stage 0 F4): (B)'s new methods carry the tab (`tab` on the wire, a
`tabId` at the extension): they enter `daemon/src/methods.ts` `TAB_METHODS` (lease-checked, not the lock) and
`METHOD_CLASSES` as `"evaluate"`, so the kill switch, the JavaScript switch and the block list refuse each pull and
only the tab's holder can pull. The store is dropped at disarm, on JavaScript off, on the tab's close, and after a
TTL. The extension never receives the path.*" (ESCALATION: what the gate covers — listed for the user.)

**F5 · plan-side (0.3) · contract-level · there is no action result object in the SDK.** `sdk/src/tab.ts`:
`click`, `type`, `pressKey`, `hover`, `scroll`, `selectOption` all return `Promise<void>` (`:206-243`), as do the
client's mirrors (`sdk/src/client.ts:409-425`); only `locate()` returns `LocateResult` (`:245`). The probe shows the
wire field reaches `client.call` intact but `Tab.click` resolves `undefined`. Returning an object from an action
changes a Step 8 signature. The MCP's action tools also discard the reply (`registry.ts:489, 511, 523` —
`await bridge.call(…)` unused). Amendment: "*Amended 2026-10-24 (Stage 0 F5): the SDK form is (i) `LocateResult`
gains the optional `pastSnapshotCap?: true` (so `Tab.locate()` returns it) and (ii) a client event
`client.on("warning", (w: {tab: string; method: string; kind: "pastSnapshotCap"}) => …)` — a new overload of `on`,
emitted by the SDK for an action whose reply carries the flag, never carrying the locator or the element's text.
No action's return type changes; `S3.3` asserts each Step 8 signature by type equality.*"

**F6 · plan-side (S4.3 vs 0.12/S4b) · confirmed contradiction.** S4.3 pins "JavaScript off → `DISARMED {scope:
"evaluate"}`" for (B)'s methods; S4b (after S4) moves that refusal to `JS_DISABLED`, and (B)'s methods (class
`"evaluate"`) inherit the change through `safetyDecision`. Amendment: "*Amended 2026-10-24 (Stage 0 F6): S4.3's
JavaScript-off clause reads: 'each new method's refusal equals `evaluate`'s own refusal for the same state (at S4:
`DISARMED {scope:"evaluate"}`; after S4b: `JS_DISABLED`)', asserted by equality, so S4b changes no S4 test text.
S4b.2 adds: (B)'s methods answer `JS_DISABLED` with JavaScript off.*"

**F7 · plan-side (0.6) · close commit unnamed; per-Part trees apply for code, not for docs.** §4 names base
`70aa754`, close `a1932a8` (recommended). `stage0-release-trees.txt`: cherry-picking each Part's commits in Part
order (S7.md §4's map; Part 1 before Part 2) gives **0 conflicts on non-doc paths**, but (Variant A) the map alone
misses 8 commits that change code or recipes (`6398f27`, `bc78ded`, `036909f`, `7c16a00`, `75f0bd6`, `201f5c8`,
`01fc58e`, plus `117b16a`/`8dbcd00` on `CLAUDE.md`) — its final tree differs from `a1932a8` in 27 non-doc files;
(Variant B) with every commit assigned, 14 cherry-picks conflict, all under `docs/`; (Variant C) Parts 1–5 carry
their code commits with `docs/`, `CLAUDE.md`, `README.md` held at the base and Part 6 brings the whole close tree →
**final tree == `a1932a8`'s tree** (`git rev-parse` equal). Part 1's tree does not typecheck: its
`extension/src/content/locate.ts` imports `LocateResult` (4 uses), which Part 2's `shared/src/protocol.ts` adds (0 in
Part 1's tree). Amendment: "*Amended 2026-10-24 (Stage 0 F7): base `70aa754`, close `a1932a8`. The branch uses
Variant C (stage0-release-trees.txt): Parts 1–5 = the code changes of their commits (S7.md §4's map; recipe commits
`6398f27 bc78ded 036909f 7c16a00 75f0bd6` in Part 5, `201f5c8` in Part 4), docs held at the base; Part 6 = the close
tree. Intermediate trees are not buildable (Part 1 precedes the shared types); only the final tree is pinned. Each
commit carries `Co-Authored-By: Claude Opus 5.5` (as all 60 originals) and the S6 session's `Claude-Session` line,
and its body lists the original commits it carries.*"

### MINOR

**F8 · doc-side (CLAUDE.md, Step 9 as-built S2b, S2b.md, kickoff §4) · "60 log sites" is 54.** 15 + 33 + 0 + 6 = 54;
the allowlist had 54 entries at `59388ed` (S2b), `6fef83c` and `55ee4de` (`git show <c>:extension/test/log-allowlist.ts
| grep -c '{ file: "'`). The scan itself holds. Mechanical: the session agent adds dated notes ("*Corrected
2026-10-24 (Step 10 Stage 0 F8): was '60 log sites', because the allowlist has 54 entries (15 + 33 + 0 + 6) since
S2b.*"); S4.5 counts from 54.

**F9 · plan-side (0.5, S8, S8.1) · the retirement set is not a set of whole files.** `transcript.ts` is imported by
`recipes/test/blackboard-export-file.test.ts` (its `describe("parseTranscriptChunks")`, 5 tests) and
`recipes/test/blackboard-held.test.ts` (1 test, "a transcript of that plan is read back on the held key"); both
files test kept code too. `export-grades.ts:9,25,34` and `held.ts` still print/describe the MCP chunk plan
(`--mcp-plan`, `MCP_CHUNK_CHARS`, `mcpLegPlan`), whose tests are 9 more (export-file: 2 + 1; held: 3 + 2 + 1). S8's
lane ("removals only") does not allow editing `export-grades.ts`'s comment. Amendment: "*Amended 2026-10-24 (Stage 0
F9): retired = `recipes/blackboard/assemble-mcp.ts`, `transcript.ts` and the 6 tests that import `transcript.ts`
(5 in `blackboard-export-file.test.ts`, 1 in `blackboard-held.test.ts`), listed per file; `--mcp-plan` stays, its
help text naming `browser_evaluate {saveTo}` instead of `assemble-mcp.ts` (S8's lane gains that edit in
`export-grades.ts` and `held.ts`). Test count −6, documented.*"

**F10 · plan-side (0.9, S5.1) · the bounds and the mid-poll rule.** After the press the script sleeps 3 s
(`:260`); a final `Get-StableScan` can take `ScanSec` = 10 s; 3 + 90 + 10 > 95. And "another host → exit 4" during
the poll would stop a real SSO chain that passes through intermediate hosts. Amendment: "*Amended 2026-10-24 (Stage 0
F10): the 90 s bound runs from the press to the exit, every scan included; while polling, any page (SSO, an
intermediate host) is tolerated; exit 0 as soon as the Blackboard host shows no sign-in control with the address
stable 4 s; at the bound: exit 4 whatever the page, nothing more pressed. S5.1: stuck on the SSO stand-in → exit 4
at ≤ 95 s from the press; the fixture counts submits (1).*"

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

**F14 · plan-side (S3.1, S3.3) · checks that miss the boundary and pass on assignability.** S3.1 has no case at the
cap itself, none for a non-listable match past it, none for `{text}`, frames or shadow roots; S3.3's "tsc over a
pinned usage file" passes if `click` came to return an object (assignable to unused `await`). Stricter: "*Amended
2026-10-24 (Stage 0 F14): S3.1 adds: on an 801-listable page the 800th listable (index 799) → absent, the 801st →
`true`; on an 800-listable page every index → absent; a non-listable `{css}` match after the 800th listable →
`true`; a `{text}` match past the cap → `true`; listable elements inside an open shadow root and a same-origin frame
count. S3.3 asserts each Step 8 SDK signature by type equality (`expectTypeOf(...).toEqualTypeOf<…>()`) against a
list captured at `f45e3bf`.*"

**F15 · plan-side (S2.3, S4) · the pinned schema test and `saveTo`.** S2.3 diffs names and input schemas against
`f45e3bf`; S4 then adds `saveTo`/`overwrite` to `browser_evaluate` by design. Amendment: "*Amended 2026-10-24 (Stage 0
F15): S2.3's baseline is captured from the code at `f45e3bf` before S2's first code change and never regenerated;
S4 changes only `browser_evaluate`'s entry, listed in its report as #127's change.*"

**F16 · plan-side (0.7, RET-1, G10-2).** RET-1's PASS needs no session restore (the retire happens on the new hello
whatever tabs come back), but it needs the bridge **armed** at the kill: while the last state says disarmed the
daemon withholds `lastUrl` (probe S9-6), so "`tabGone` with its pre-kill URL" would fail. A kill also loses unsaved
state in the user's own tabs. Amendment: "*Amended 2026-10-24 (Stage 0 F16): RET-1 runs only with the found state
armed (else 'not run — disarmed as found'); its PASS does not depend on session restore or the 'Restore pages?'
prompt; G10-2's request names that unsaved form data in the user's open tabs is lost.*"

**F17 · plan-side (0.12, S4b) · a Step 9 extension still loaded.** Until the extension is reloaded, a Step 10
daemon/SDK/MCP talks to a Step 9 extension that still sends `DISARMED {scope:"evaluate"}`. `safetyRefusalLine`
(`sdk/src/error.ts:127-132`) must keep that branch. Amendment: "*Amended 2026-10-24 (Stage 0 F17): the SDK and MCP keep
rendering `DISARMED {scope:"evaluate"}` as the JavaScript-off line (an old extension); `SafetyScope` keeps its two
values; S4b.2 adds that case.*"

**F18 · plan-side (0.3, S3 lane) · `waitFor {locator}` and the count's cost.** The locator wait answers `{ok:true}`
from `extension/src/handlers/locator-wait.ts`, outside S3's lane. Proposed: `waitFor` does not warn (it acts on
nothing). For cost: once 800 listable elements have been counted, every later match is past the cap, so the
zero-size checks stop at 800 — the count adds at most 800 `getBoundingClientRect`s. Amendment: "*Amended 2026-10-24
(Stage 0 F18): `waitFor {locator}` carries no flag; the count stops measuring at the 800th listable element.*"

**F19 · plan-side (0.2) · focus-first is not atomic.** `focusTab` holds the visibility lock only for itself
(`daemon/src/methods.ts` `takesLock`); another actor's default capture in the same window can switch the active
tab between the focus and the trusted input (the SDK has the same gap), so the input lands on a background tab
and answers `ok`. Record as a known limit with a Revisit-if ("a live row sees it"); MCPF-1 (one actor) cannot
show it.

**F20 · plan-side (S1.5, S7.6) · a check that cannot fail on its own.** "The ledger shows every STOP line … as a
return" is the runner's own record. Stricter: "*Amended 2026-10-24 (Stage 0 F20): the fresh verifier lists every
`STOP`/guard line in the run's raw output and daemon log and matches each to a return entry in the ledger; an
unmatched one fails S1.5.*"

**F21 · plan-side (0.4 SDK) · the client mirrors `Tab`.** `BridgeClient` mirrors the cursor `Tab`'s methods (but
`close`, #90): `evaluateToFile` belongs on both (additive; the eight exported values unchanged).

### NIT

**F22** `recipes/s9-redirect.py:47` is single-threaded (`HTTPServer`), and `s9.ts` `cmdPop1` (`:669-702`) acts on the
state file's tab `a` with a new client and no claim; the daemon grants a popup only to a leased opener
(`daemon/src/intercept.ts:341`). Both confirm #194's premises.

**F23** `snapshot.ts:129` sets `truncated` at exactly 800 listed elements, when nothing was cut. Pre-existing and off
limits (S3.2); S3's tests must not use `truncated` as their oracle.

**F24** `SDK_CHUNK_CHARS = 100_000` (`recipes/blackboard/export-file.ts:8`) is a choice, not a measured limit
(S6-builder.md:85); the largest single `evaluate` string ever measured live is that 100 000.

**F25** 0.4 names the serialiser's "100 items, depth 6" but not `maxString: 5000` (`serialize.ts:19`), which also
truncates nested strings.

**F26** The kickoff's environment table and 0.1 are right: the daemon build on disk is `99bb55c5…`, reproduced by a
clean build of `55ee4de` — Run 14 measures the same code as Run 13.

## 7. Attacks on each proposal of #204

| Proposal | Verdict | Evidence / change |
|---|---|---|
| 0.1 order and #193's stop rule | holds | F26; #192 ruled (#202) |
| 0.2 `focusTab {tab}` then the action, trusted only; failure is the answer; schemas unchanged; cursor unmoved | holds, with a limit | `onTab`/`attempt` (`registry.ts:329-351`) resolve the handle once, so both calls share it; a `focusTab` refusal (`DISARMED`) becomes one line via `withSafetyRefusals`; F19 |
| 0.3 definition by the 800th listable in walk order | holds | locate's searches already use `walkElements` with an `enter` visitor (`locate.ts`); `roleOf && !skippedAsZeroSize` is the snapshot's own listability test (`snapshot.ts:112-118`) — a counter needs no rule change; F18 |
| 0.3 wire field | holds | the daemon passes it through (probe 0.3) |
| 0.3 SDK form | **choose the client event** | F5 |
| 0.4 transport | **(B)**, by its own rule | F1, F2, F4 |
| 0.4 file rules "as `browser_download`" | **stricter** | F11, F12 |
| 0.4 answer | holds, bound fixed | F13 |
| 0.4 `Tab.evaluateToFile`, no ninth export | holds, + client mirror | F21 |
| 0.4 logs | holds | the path never reaches the extension or the daemon under (B); S4.5 from 54 sites (F8) |
| 0.5 fixture leg, pp1 at G10-3, retire after PASS | holds; set named | F9 |
| 0.6 branch, final tree, tag at G10-1 | holds; commits named; Variant C | §4, F7 |
| 0.7 RET-1 at G10-2 | holds, armed only | F16 |
| 0.8 measure then decide | **premise refuted** | §5, F3 |
| 0.9 poll ≤ 90 s, exit 4 | holds, reworded | F10 |
| 0.10 five R14 rows | holds | F22; R14-5c's expected text equals `BLOCKED_URL_MESSAGE` (`safety.ts:177`) |
| 0.11 no change to the boundary | holds if F4 is taken | F4 |
| 0.12 `DISARMED` keeps `scope:"all"`; `"evaluate"` no longer produced | holds, with the old-extension case | F6, F17 |

## 8. Blind spots (kickoff §4(c)), answered from the code, and extended

- **Focus-first and the human:** `focusTab` runs `windows.update({focused:true})` (`handlers/tabs.ts:71`), so a
  trusted call on a tab in another window focuses that window and leaves it there (as #106 ruled). It takes the FIFO
  lock (C7), so it may wait behind another actor's capture (`LOCK_TIMEOUT {holder}`), and it is gated, so disarmed →
  `DISARMED` before any input (S9-2). The gap between focus and input: F19.
- **The cap warning:** a page whose count changes between snapshot and locate — the flag describes "a snapshot taken
  now"; frames and open shadow roots count (the one walk); `nth` past the cap — the flag is about the chosen match;
  `waitFor {locator}` — F18; the failure report's snapshot is a fresh one and may list different refs (Step 8, #93).
- **`saveTo`:** huge non-string / lone surrogates — F12; the 30 s default call timeout — under (B) each pull is its
  own call, the first `evaluate` keeps its `timeoutMs` (≤ 60 000); another drive or a UNC path is absolute and
  allowed (as `browser_download`); an existing directory — F11; a path inside the repo could be committed (the repo is
  public): the description and `docs/setup.md` say to write outside the repo or under `exports/` (gitignored); disk
  full → the write fails, `.part` removed, `INTERNAL` with no value; the frame size — F1/F2; the switches
  mid-transfer — each pull is gated (F4), a refusal removes `.part`; a store entry after disarm — dropped (F4);
  logging the path — never on the wire under (B).
- **The release branch:** worktree left behind — S6 ends with `git worktree list` showing only the main tree; token
  or `dist/` — 0 paths in the range and both trees (§4); trailers — F7.
- **RET-1:** F16; the session marker when the worker starts before `onStartup` waits ≤ 2 s and a no-event start is
  fresh (`chooseMarker` branches, C3), so a kill always retires; the safety state lives in `storage.local` and is read
  back after the relaunch.
- **The first live wave on an unchanged build:** the build on disk is Run 13's (F26); the loaded extension is proved
  only by SAFE-0's line; the safety state is recorded as found.
- **The token:** none of this stage's evidence contains it (`grep -c -F -f bridge.token` → 0 on every evidence file)
  or any non-loopback URL (0).
- **Extended:** (1) a Step 9 extension still loaded under Step 10's daemon/SDK (F17); (2) one oversized reply takes
  every actor down (F2); (3) `--mcp-plan`'s help text after the retirement (F9); (4) an existing `feat/agent-bridge`
  branch (§4: S6 never touches other refs).

## 9. Exit-check testability

| Check | Executable | Can fail | Pass rule before measurement | Stricter text |
|---|---|---|---|---|
| Z.1 | yes | yes | yes | "each Step 9 contract executed — daemon-side on port 0, extension-side by importing the real modules" |
| S1.1 | yes | yes | yes | §4.20's line range at `f45e3bf` extracted and compared line by line |
| S1.2–S1.4, S1.6 | yes | yes | yes | — |
| S1.5 | yes | **no, alone** | yes | F20 |
| S2.1 / S2.2 | yes | yes (must fail at `f45e3bf`) | yes | S2.1 also asserts the order (focus before action), `pressKey` trusted, an explicit `tab`, and `claims()` unchanged |
| S2.3 | yes | yes | yes | F15 |
| S3.1 | yes | partly | yes | F14 |
| S3.2 | yes | yes | yes | — |
| S3.3 | yes | **no** (assignability) | yes | F14 |
| S4.1 | yes | yes | path-dependent | F13 |
| S4.2 | yes | yes | codes unnamed | F11 |
| S4.3 | yes | yes | contradicts S4b | F6, F4 |
| S4.4 / S4.5 | yes | yes | yes | S4.5 from 54 sites (F8) |
| S4b.1–S4b.3 | yes | yes | yes | F6, F17 additions |
| S5.1 | yes | yes | bound inconsistent | F10 |
| S6.1–S6.3 | yes | yes | yes | S6.1 against `a1932a8` (F7); S6.3 adds `git tag -l step8` empty and `git worktree list` |
| S7.1–S7.6 | as S1 | as S1 | yes | F20; SW-1 per F3 |
| S8.1 | yes | yes | yes | the per-file list of F9 |

## 10. Proposed decisions

### 2026-10-24 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls (F1, F2, F4)
**Decided:** (B): an extension-side store filled by slices on the CDP leg (no message grows with the value), pulled
in 1 MiB slices of UTF-8 bytes by methods that carry the tab (`TAB_METHODS`; `METHOD_CLASSES` `"evaluate"`),
dropped at disarm, on JavaScript off, on the tab's close and after a TTL. **Why:** 0.4's own rule — no measurement
shows ≥ 64 MiB crossing the whole path; the host leg drops the extension socket for every actor above 100 MiB; a
tab-less pull would skip the block list. **Instead of:** (A) one `evaluate`; tab-less pulls of class `"state"`/
`"evaluate"`. **Revisit if:** a live measurement shows the Chrome leg carrying ≥ 64 MiB frames and (A) is wanted for
simplicity. **By:** Claude (proposed; contract-level — **for user review**).

### 2026-10-24 · Stage 0: the cap warning reaches SDK actions as a client event (F5)
**Decided:** `LocateResult.pastSnapshotCap?: true`; actions: `client.on("warning", {tab, method, kind})`. **Why:**
every SDK action returns `Promise<void>`; a result object would change a Step 8 signature. **Instead of:** a field
on an action result. **Revisit if:** a later step adds action results. **By:** Claude (proposed; contract-level —
**for user review**).

### 2026-10-24 · Stage 0: `release/step8` from `70aa754` to `a1932a8`, Variant C (F7)
**Decided:** base `70aa754`, close `a1932a8`; Parts 1–5 carry their commits' code, Part 6 the close tree; final tree
pinned, intermediate trees not buildable. **Why:** code cherry-picks with 0 conflicts in Part order; docs conflict
14 times; the final tree is verified equal. **Instead of:** one squashed tree with six messages; `59be263` as the
close (it carries Step 9's kickoff). **Revisit if:** the user wants every tree buildable (then one squashed tree).
**By:** Claude (proposed; build decision).

### 2026-10-24 · Stage 0: SW-1 is a differential row (F3)
**Decided:** the outcome table of F3. **Why:** the listener already ends the wait; the old table could read "bound"
from capture time alone. **Instead of:** 0.8's table. **Revisit if:** — . **By:** Claude (proposed; it changes a
pre-registered row before its run, stricter only — **for session-agent review**).

### 2026-10-24 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s (F11, F12)
**Decided:** F11's and F12's amendments. **Why:** "writing anywhere but the given absolute path" is on the
escalation list; download's directory mode, `mkdir -p` and `.part` clobbering each write elsewhere. **Instead of:**
copying download's rules. **Revisit if:** a user needs parent directories created. **By:** Claude (proposed;
contract-level — **for user review**).

### 2026-10-24 · Stage 0: the retirement removes six tests (F9)
**Decided:** F9's set; `--mcp-plan` stays with new help text. **Why:** 0.5 says "tests that cover only them".
**Instead of:** retiring the MCP chunk plan too (15 tests). **Revisit if:** the user wants the paging plan gone.
**By:** Claude (proposed).

### 2026-10-24 · Stage 0: bb-login's 90 s bound covers everything after the press (F10)
**Decided:** F10's amendment. **Why:** the old wording exceeded S5.1's 95 s and would stop real SSO chains.
**Instead of:** 0.9's wording. **Revisit if:** a real login needs longer than 90 s. **By:** Claude (proposed).

### 2026-10-24 · Stage 0: corrections of counts and checks (F8, F13–F17, F20)
**Decided:** the dated notes of F8 and the stricter checks of F13–F17, F20. **Why:** mechanical or stricter only.
**Instead of:** leaving checks that cannot fail. **By:** Claude (proposed).

## 11. Proposed stage split (estimates; the step agent writes it into `journal.md`)

| Order | Stage | Estimate | Note |
|---|---|---|---|
| 1 | S1 — Run 14 (live, alone) | 1 h prep + 1 h live | unchanged; F22 confirmed its premises |
| 2 | S2 — MCP focus-first | 1 h | + F15's baseline capture first |
| 3 | S3 — cap warning | 2 h | F5 form, F14 checks, F18 |
| 4 | S4 — `saveTo` (B) | **3.5 h** (was 3 h) | F2's CDP-leg slicing, F4's tab-carrying pulls, F11/F12 rules; lane + `extension/src/debugger.ts`, `daemon/src/methods.ts` |
| 5 | S4b — `JS_DISABLED` | 1.5 h | F6, F17 |
| ∥ | S5 — bb-login | 1 h | F10 |
| ∥ | S6 — `release/step8` | 0.5 h | F7's Variant C, base/close named |
| 6 | S7 — Run 15 (live, alone) | 1.5 h prep + 2 h live | SW-1 per F3; RET-1 armed only (F16) |
| 7 | S8 — retirement + docs | 1 h | F9's set; F8's notes for the session agent |

No Chrome-leg measurement stage is added: (B) needs none.
