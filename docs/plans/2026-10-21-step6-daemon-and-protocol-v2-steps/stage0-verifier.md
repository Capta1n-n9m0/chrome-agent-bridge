# Step 6 — Stage 0 verifier report

**Date:** 2026-10-21 (UTC; local clock past midnight) · **Role:** independent verifier of
`stage0-audit.md`, Claude Opus 5.5 (`claude-opus-5-5`) · **Baseline:** `1a92d95` · No agents spawned;
no tracked file edited; nothing bound 9234 (every socket experiment bound port 0, fake tokens only).

Reproduce: Git Bash, `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`,
from the repo root. `$S` = the session scratchpad
(`/c/Users/aliev/AppData/Local/Temp/claude/C--Users-aliev-Projects-chrome-remote-extention/a407b1a6-0dd7-44a3-ac0a-18226111b130/scratchpad`).
My scripts there carry a `verif-` prefix; TypeScript ones are bundled with the auditor's esbuild line.
The phase doc was read **at `HEAD`** (`git show HEAD:<plan> > $S/verif-plan-head.md`) because the step
agent edited the working copy during this verification (see V7).

## Spot-checks (re-executed)

| # | Item | Command | Output excerpt | Result |
|---|---|---|---|---|
| 1 | Baseline typecheck | `npm run typecheck` | exit 0 | CONFIRMED |
| 2 | Baseline tests | `npm test` | exit 0; `Test Files 22 passed (22)`, `Tests 301 passed (301)` | CONFIRMED |
| 3 | Baseline build | `npm run build` | exit 0; `built server → dist/index.js`, `built extension → dist/` | CONFIRMED |
| 4 | Tree after checks | `git status --short` (right after 1–3) | only `?? docs/plans/…-steps/` | CONFIRMED |
| 5 | Per-package counts | `npx vitest run --reporter=json` + own node tally | `extension 13/211, shared 1/4, server 8/86`, total 301; server: bridge 9, connection 7, download 12, handshake 4, lifecycle 16, startup 5, tools 28, wsHost 5 | CONFIRMED |
| 6 | 21 tools | `grep -c "server.tool(" server/src/tools/registry.ts` | `21` | CONFIRMED |
| 7 | **F1** v2 knock hijacks a v1 host | `$S/verif-v1v2.ts` (own script; v1 `WsHost` on port 0, fake ext, then v2 client) | client frames after hello `[]`; `bridge conn replaced: true`; after `daemon.status` `[]`; client got `{"id":"1","method":"snapshot"…}`, ext got `[]`; `Timed out after 400ms calling snapshot`; **added:** after the client closes `bridge connected = false`, ext `readyState = 1` (stranded) | CONFIRMED |
| 8 | **F2** `../daemon/dist` resolution | `node -e` with `new URL("../daemon/dist/index.js", pathToFileURL(f))` | from `mcp/dist/index.js` → `…\mcp\daemon\dist\index.js`; from `sdk/src/knock.ts` → `…\sdk\daemon\dist\index.js` | PARTIAL — true for resolution relative to the importing *file*; the plan's literal "relative to the sdk **package**" (`sdk/` + `../daemon`) is correct. See V3 |
| 9 | **F3** `taskkill /T` kills the detached child | `$S/verif-tree.cjs` started with the real node via `Start-Process`, then `taskkill /T /F /PID <that pid>` (own processes only) | direct: `child ParentProcessId=3060` … `3060 gone`, `24820 gone`; double spawn: child parent `9420` (exited launcher) … `17772 gone`, `1384 alive` (then stopped by me) | CONFIRMED |
| 10 | F3 sub-claim: `claude.exe` contains `taskkill /T` | `grep -a -o … ~/.local/bin/claude.exe` | **denied by the auto-mode classifier**; not worked around | NOT RE-VERIFIED (auditor states MCP-server use itself was unestablished) |
| 11 | **F4** D1 silent on `server/src/index.ts` | `sed -n 1,10p server/src/index.ts`; `grep -n "index.ts" <plan@HEAD>`; `sed -n 1,5p` of `tools.test.ts`, `registry.ts` | entry imports `WsHost`, `Bridge`, `startWsHost`, `registerTools`, `installLifecycle`, `loadConfig`; plan: `index.ts (daemon entry)` (l.50), `mcp/src/index.ts` only in D5 (l.294), no D1 line; `tools.test.ts:4 import { Bridge }`, `registry.ts:3 import type { Bridge }` | CONFIRMED |
| 12 | **F5** D3.1/D5.1 vs deleting `startup.test.ts` | `grep -n "D3.1\|D5.1" <plan@HEAD>`; `sed -n 252,262p` | `417: D3.1 … after ≥ before + the idle/build/log tests`; `440: D5.1 … after ≥ before`; l.258-259 "delete with its test"; startup.test.ts = 5 tests (row 5) | PARTIAL — conflict real for D3.1; D5.1 fails only if D5 adds < 5 tests (the body says so; the title "cannot both hold" overstates). See V4 |
| 13 | **F6** `browser_status` tests pin host text | `grep -n` on `server/test/tools.test.ts` | `201 reports a busy port…`, `208-211 /9234/ /not listening/ /extension: not connected/ /EADDRINUSE/`, `220 /listening on 127\.0\.0\.1:9234/`, `238 /extension: connected/` | CONFIRMED |
| 14 | **F7** slack pinned on the MCP side; client timer unspecified | `grep -n` registry/tools.test/plan | `registry.ts:205 { timeoutMs: pageTimeoutMs + SERVER_TIMEOUT_SLACK_MS }`; `tools.test.ts:263 gives the server 5s more…`, `270 { timeoutMs: 35_000 }`; `download.ts:61 timeoutMs + 5_000`; plan l.100 daemon `+ 5000`; `BridgeClient` lines 271-272 give `call(method, params?, {timeoutMs?})` and no own-timer rule | CONFIRMED |
| 15 | **F8** ws close semantics | `$S/verif-close.ts` (port 0) | `close(4001) → 4001 "invalid token"`, `close(4002) → 4002 "upgrading"`, `terminate() → 1006 ""`; after `wss.close` client `readyState 1`, callback `false` until last socket closed, then `true` | CONFIRMED (measured parts) |
| 16 | F8(a) hypothesis "exit before flush → 1006" (stated conditionally, not measured by the auditor) | same script, forked child server: `close(4002)` then `process.exit(0)` immediately / next tick / on `close` | all three: client sees `4002 "upgrading"` | NOT BORNE OUT on this machine (one local client). See V1 |
| 17 | F15 baseline guards | `$S/verif-guards.ts` | `isHello(v2) true`, `isHello(role=bogus) true`, `validateHello(bogus role) {"ok":true}`, `isResponse(event) false`, `isResponse(welcome) false` | CONFIRMED |
| 18 | F25 PID 2928 identity (read-only) | `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` | only `2928 parent=12932 …\codex-runtimes\…\node.exe …\@oai\artifact-tool\dist\artifact-session\host-daemon.mjs`; `claude.exe` = 32676, 20208 | CONFIRMED (journal and `common.md:55` label "Claude Code's own" is wrong) |
| 19 | F21/F22 no `bridge.token`, no `tsx` | `ls bridge.token`; `ls node_modules/tsx`; `grep -n tsx package.json */package.json` | `No such file or directory` ×2; `no tsx in manifests` | CONFIRMED |
| 20 | F14 stale `server/dist` lines | `grep -n "server/dist" docs/setup.md docs/e2e-test-plan.md start-bridge.sh` | setup 18, 36, 46, 262; e2e 19, 23, 88 (CONN-7), 380, 537; `start-bridge.sh:20` | CONFIRMED |
| 21 | Confirmed-row: bind `127.0.0.1` | `grep -n "127.0.0.1" server/src/wsHost.ts` | `28: new WebSocketServer({ host: "127.0.0.1", …` | CONFIRMED |
| 22 | Confirmed-row: 4001 + reasons | `grep -n 4001 wsHost.ts; grep -n "reason:" handshake.ts` | `65: ws.close(4001, result.reason)`; `expected hello handshake` (10, 12), `invalid token` (13) | CONFIRMED |
| 23 | Confirmed-row: heartbeat 30 000 | `grep -n 30_000 server/src/wsHost.ts` | `58: }, this.options.heartbeatMs ?? 30_000);` | CONFIRMED |
| 24 | Confirmed-row: offscreen backoff 0.5–10 s | `grep -n backoffMs extension/src/client.ts` | `13 = 500`, `40 reset`, `54 Math.min(… * 2, 10_000)` | CONFIRMED |
| 25 | Confirmed-row: 45 checkboxes | `grep -c '^ *- \[ \]' <plan@HEAD>` | `45` | CONFIRMED |
| 26 | Confirmed-row: spec §10 codes = D0.3 codes | `sed -n 315,318p <spec>` / `sed -n 385,390p <plan@HEAD>` → `grep -oE … \| sort` | same 22 unique codes (plan text names `INTERNAL` twice) | CONFIRMED |
| 27 | Confirmed-row: `.gitignore` covers new outputs | `git check-ignore -v daemon/dist/index.js mcp/dist/index.js sdk/dist/index.js bridge.token recipes/out.log recipes/hello.ts` | all ignored via `dist/`, `bridge.token`, `*.log`; `recipes/hello.ts` not ignored | CONFIRMED |
| 28 | Confirmed-row / F11: no test binds 9234 | `grep -rn "port: [1-9]" server/test shared/test extension/test` | only `hostState = { …, port: 9234 }` fakes (`bridge.test.ts:60`, `tools.test.ts:204,217,234`) — no bind | CONFIRMED (wording NIT, V6) |
| 29 | A1 old text + new facts | `grep -cF` on plan@HEAD; `grep -n NOT_CONNECTED server/src/bridge.ts` | old at l.92 ×1; `3: const NOT_CONNECTED =`, text on l.4, used at l.44 | CONFIRMED |
| 30 | A2 | `grep -cF`; `grep -n timeoutMs server/src/download.ts` | old at l.98 ×1; `download.ts:61 … { timeoutMs: timeoutMs + 5_000 }`; `registry.ts:205` | CONFIRMED |
| 31 | A3 | `grep -cF` ×3 | l.174, 175, 241 ×1 each | CONFIRMED |
| 32 | A5 | `grep -cF`; `ls -la node_modules/@bridge/`; `grep -n '"server"\|@bridge/server' package-lock.json` | old at l.204 ×1; `server -> /c/…/server` symlink; lock l.13, 50-51, 3819-3820 | CONFIRMED (dangling after `git mv` follows; the move itself not re-executed) |
| 33 | A7, A8, A10, A11 | `grep -cF` | l.459, 391, 423, 359 ×1 each; `startup.ts:26 retryMs = options.retryMs ?? 5000` (A10's reason) | CONFIRMED |
| 34 | A12 | `grep -cF`; `sed -n 50,62p server/src/index.ts`; `sed -n 8,14p server/src/lifecycle.ts` | old texts l.304, 311, 446 ×1; shutdown callback = `index.ts:54-59`; `lifecycle.ts:11 shutdown: (reason) => …` is an option | CONFIRMED |
| 35 | A13 | `grep -cF "(does not"` | **2** hits (l.5 and l.6) — anchor ambiguous; the applied edit chose l.6 correctly | PARTIAL (V5) |
| 36 | D1 move map completeness | `git ls-files server/ shared/` vs map | all 21 `server/` files mapped (3 manifests, 10 src, 8 tests); 30 + 44 + 12 + 4 + 211 = 301; `shared/` files implicitly unchanged | CONFIRMED |
| 37 | Git state | `git status --short; git branch; git log --oneline -1; git diff --stat -- extension/` | `branches feat/agent-bridge, * main`; `1a92d95`; extension diff empty; status now also ` M docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md` (step agent, 19:59:18Z, see V7) | CONFIRMED with V7 |
| 38 | Port 9234 | `netstat -ano \| grep 9234` | empty (grep exit 1) | CONFIRMED |

**Tally:** 38 rows — 33 CONFIRMED, 3 PARTIAL (rows 8 F2, 12 F5, 35 A13), 0 REFUTED, 2 other
(row 10 not re-verified: classifier denial; row 16 not borne out: a conditional hypothesis, not a
claimed measurement). All 8 MAJOR findings re-checked; 8 Confirmed-table
rows, 9 amendments (A1–A3, A5, A7, A8, A10–A13), the counts, the tool count, PID 2928 and the move
map re-executed. No fabricated evidence found: every auditor output I re-ran reproduced (pids differ, as
expected).

## Findings of my own

**V1 — MINOR — F8(a)'s motivating risk did not reproduce.** Location: `stage0-audit.md` F8(a) ("If
`daemon.shutdown` calls `process.exit` before the 4002 frames are flushed, clients see 1006").
Evidence: `node $S/verif-close.cjs` → `V child exit-now: client sees 4002 "upgrading"` (also
`exit-next-tick`, `wait-close`). The auditor wrote it conditionally and did not claim a measurement, so
not fabricated. One local client on Windows only; many clients or a full send buffer may differ. Fix:
keep the bounded wait as defence in depth, but word F8(a) as "unmeasured risk; one client exiting
immediately still received 4002"; F8's MAJOR rank rests on (b).

**V2 — MINOR — F8(b)'s resolution is mis-tagged design-local; it is contract-level.** Location: F8
"Proposed resolution", B10. Evidence: SPEC-DISCREPANCY PROTOCOL (`briefs/common.md`) lists "close
codes" and "one session at a time" as contract-level; plan@HEAD l.134 "`BridgeClient` auto-reconnects
on 4002 only; any other close is an error to the script"; forbidden fix l.509 "making `BridgeClient`
reconnect on any close code other than 4002". The proposal ("the MCP treats any post-connect close
other than 4002 like a failed connect … retry every 5 s") does not by itself break the forbidden fix if
it is the MCP calling a fresh `connect()` (with the one-handover limit) and not `BridgeClient`
reconnecting, but that boundary must be stated. Fix: route F8(b)/B10 under long-run §3 to Open
decisions, and phrase it as "the MCP discards the closed client and calls `connect()` again on its 5 s
timer; `BridgeClient` itself never reconnects on non-4002".

**V3 — MINOR — F2 overstates the plan's error.** Location: F2 title/body. Evidence: the plan says
"resolved relative to the sdk package → `../daemon/dist/index.js`" (plan@HEAD l.112-113), which from
`sdk/` is correct; the failure appears only when an implementation resolves against
`import.meta.url` (`mcp/dist/index.js` → `mcp\daemon\dist`). Also measured:
`new URL("../../daemon/dist/index.js", import.meta.url)` gives `…\daemon\dist\index.js` from both
`mcp/dist/index.js` and `sdk/src/knock.ts` (the server bundle is ESM, `server/build.mjs` `format:
"esm"`, so `import.meta.url` exists). The ambiguity is real (the bundled MCP has no "sdk package"
location), so the finding stands as a builder ambiguity; MAJOR vs MINOR is debatable and the
walk-up resolution remains the more robust choice. Fix: reword F2 as "the plan does not say how
code that runs from a bundle locates the sdk package".

**V4 — NIT — F5's title says D3.1 and D5.1 "cannot both hold".** Evidence: plan@HEAD l.417, 440. If
D5 deletes the 5 tests and adds ≥ 5, D5.1 holds as written; D3.1 fails only if D3 deletes them. The
body states this correctly; A9 is still the right amendment (it makes the removal documented).

**V5 — NIT — A13's anchor `(does not` is not unique.** Evidence: `grep -cF "(does not"
$S/verif-plan-head.md` → `2` (l.5 as-built, l.6 steps dir). The applied edit hit the right line.

**V6 — NIT — "9234 appears only inside strings/assertions" (F11, Confirmed table).** Evidence: also in
`hostState = { listening: …, port: 9234 }` object literals (`bridge.test.ts:60`,
`tools.test.ts:204,217,234`). They are fake state, not binds; the conclusion holds.

**V7 — observation (not an audit defect) — the phase doc was edited while this verification ran.**
Evidence: `git status --short` before the checks: only the untracked steps dir; afterwards
` M docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`, mtime 23:59:18 local = ledger line
`2026-10-21T19:59:18Z · S0.3 mechanical amendments A1 A2 A3 A4 A13 applied`, while the ledger's own
S0.2 line says "apply mechanical amendments after verdict". `git diff` shows exactly A1–A4 and A13
(A3 incl. l.241), each with a dated note; nothing else. Fix: none needed for the audit; the step agent
should record the ordering in the step report. `git diff -- extension/` stays empty.

No CRITICAL issue found. No severity mis-rank that changes routing other than V2. No proposed
resolution weakens a test, guard, timeout, the token rule or the bind; A9 edits a pre-registered check
and is correctly held for the session agent's sign-off.

## Verdict

**PASS-with-notes.** ≥ 5 spot-checks re-executed (38 rows); no evidence fabricated; no MAJOR or
CRITICAL claim refuted (F2 and F5 are PARTIAL on wording, F8's measured parts reproduce);
port 9234 free, HEAD `1a92d95`, branches `main` + pre-existing `feat/agent-bridge`, extension diff
empty. The only tree change beyond the untracked steps dir is the step agent's logged amendment of the
phase doc (V7), not the auditor's. Notes: V1–V3 (MINOR), V4–V6 (NIT), V7 (observation).
