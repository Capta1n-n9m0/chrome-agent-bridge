# Step 6 — Stage 0 report: spec audit

**Step agent:** Claude Opus 5.5 (`claude-opus-5-5`); the auditor (builder) and the verifier also ran on Opus 5.5.
**Dates:** 2026-10-21/22 · **Baseline:** `1a92d95`.

## 1. Verdict

**DONE.** The audit is written and the verifier passed it with notes. No feature code was written.
Three findings are contract-level and wait for the session agent's ruling: F1, F3 and F8(b). F3 also
touches decision 0.8, which is on the escalation list. None of them blocks D0 or D1.

## 2. Outputs

| File | sha256 |
|---|---|
| `stage0-audit.md` (auditor; 34 findings, a D1 move map, builder ambiguities B1–B18, amendments A1–A13) | `2cd28fd71a4d5c40312aceee3dfa0956db79e9706f92a430ff39ad230ee375bd` |
| `stage0-verifier.md` (independent verifier) | `395fbc473f731a24edf265a1ea4d5a9d5e997990e5613f91b8f221a008569c75` |
| `stage0.ledger.md`, this report | — |
| Phase doc `2026-10-21-step6-daemon-and-protocol-v2.md`: mechanical amendments A1, A2, A3, A4 and A13, each with a dated "*Amended 2026-10-21 (Stage 0)*" note | — |

**Measured baseline.** The auditor and the verifier each ran these on `1a92d95`:
- `npm run typecheck` exit 0.
- `npm test` exit 0: `Test Files 22 passed (22)`, `Tests 301 passed (301)`.
- Per package: shared 1 file / 4 tests, server 8 / 86, extension 13 / 211.
- `npm run build` exit 0, and no tracked file changed.
- 21 tools.

**Findings by severity:** 0 CRITICAL, 8 MAJOR (F1–F8), 17 MINOR (F9–F25), 9 NIT (F26–F34).

The experiment scripts are in the session scratchpad: the auditor's under plain names, the verifier's
with a `verif-` prefix.

## 3. Verifier verdict

**PASS-with-notes** (`stage0-verifier.md`).
- **Spot-checks:** 38 re-executed: 33 confirmed, 3 partial (wording only), 0 refuted.
- **Evidence:** none fabricated.
- **All 8 MAJOR findings:** re-run by the verifier's own experiments where they were executable.

The verifier's notes:
- **V1:** F8(a)'s "exit before the close frames are flushed → code 1006" did not reproduce. An
  immediate `process.exit` after `close(4002)` still delivered `4002 "upgrading"`. It stays a
  hypothesis; the bounded wait in the proposal costs nothing.
- **V2:** F8(b) is contract-level, not design-local. I agree and moved it.
- **V3:** F2 is an ambiguity, not an error. "`../daemon/dist`, relative to the sdk package" is right
  for the package directory but wrong for `import.meta.url`.
- **V4:** F5's title overstates the problem. The body is right.
- **V5:** A13's anchor occurs twice in the doc. The applied edit hit the right line.
- **V6:** 9234 also appears in the tests as fake `hostState` literals. Nothing binds it.
- **V7:** I applied the five mechanical amendments while the verification was running, not after it.
  The verifier checked the resulting diff: exactly those amendments, each with a dated note.

## 4. Deviations from the phase doc

None in the work itself. The stage applied only the amendments that fix plan-side facts:
- **A1:** a constant name that does not exist.
- **A2:** `browser_download` also passes a per-call timeout.
- **A3:** tests bind port 0, so the "same test port" reason for running D2 and D3 one after the
  other is wrong. They still run one after the other because they edit the same files.
- **A4:** the "Files touched" list now matches D1 and 0.10: `download.ts` goes to `sdk/` and
  `lifecycle.test.ts` moves too.
- **A13:** the steps dir now exists.

**Held back as proposals:** A5–A12. Each one edits a checkbox or a pre-registered exit check (D0.4,
D3.5, D5.1, D5.4, D5.5, D7.1, the D1 and D7 checkboxes). That is the escalation list's "pre-registered
rule", so the session agent rules on them. Their exact old and new text is in `stage0-audit.md`
§Mechanical amendments.

## 5. Proposed decisions

### 2026-10-22 · A Step 6 client gives up with VERSION when no welcome arrives (for user review)
**Decided:** after sending `hello`, the SDK's knock waits a bounded time (proposed: 2 s) for
`welcome`. If none comes, it closes the socket and rejects with `VERSION`. The message names the
cause: a pre-Step-6 bridge server holds the port, so end the old session. It never spawns a daemon
or hands over in that case. The MCP's stored reason names the same cause. `setup.md` says "end
every pre-Step-6 session first".
**Why:** this is F1. Measured on port 0, a v1 `WsHost` accepts a v2 hello as *the extension*:
- it replaces the real extension's slot;
- it sends the old session's calls to the client;
- it never answers.

Without a timeout, `connect()` hangs, and D5's 5 s retry repeats the hijack every 5 s.
**Instead of:** leaving 0.7 as written, with no "connected but no welcome" branch.
**Revisit if:** v1 servers can no longer exist (e.g. after Step 8).
**By:** Claude (proposed; contract-level: it adds a client-side protocol rule)

### 2026-10-22 · The detached daemon's survival depends on how the session's MCP is killed (for user review)
**Decided:**
- Keep 0.8 as written for the autonomous stages.
- Amend MUX-7 to name the kill method and the expected result for each:
  - `taskkill /T` while the MCP is alive;
  - a normal session end;
  - killing the nvm shim alone.
- Add a D6 measurement: end a Claude session normally and check that its daemon is still alive.
- Keep "double spawn via a short-lived launcher" as the fallback the user picks if D6 shows the
  daemon dying with its session.
- POSIX stays unverified. This is recorded and does not block.

**Why:** this is F3, measured and confirmed by the verifier on a dummy tree. Windows keeps
`ParentProcessId`, so `taskkill /T /F` on the spawning process kills the "detached" child. A child
whose parent has already exited survives the same tree kill. `claude.exe` contains a
`taskkill /T /F` call. Whether it is used on MCP servers was not established. The verifier's
re-check of that grep was blocked by the auto-mode classifier and not retried.
**Instead of:** changing the spawn now. That is decision 0.8, part of the design of record, and the
step agent may not change it.
**Revisit if:** D6 shows the daemon dying when the session that spawned it ends.
**By:** Claude (proposed; touches 0.8, escalated)

### 2026-10-22 · What clients do on a close code other than 4002 (for user review)
**Decided:**
- The daemon's shutdown stops accepting new connections and sends `close(code, reason)` to every
  socket.
- It waits up to 1 s for the close events, then calls `terminate()` and exits.
- `BridgeClient` never reconnects on any code but 4002. That is a forbidden fix, and it is kept.
- When an established connection closes with another code, the MCP stores the reason and calls a
  fresh `connect()` on its existing 5 s retry. Scripts get an error.

**Why:** this is F8 plus the verifier's V2. Close codes are contract-level. Today's `WsHost.close()`
uses `terminate()`, which clients see as 1006. The plan does not say what the MCP does after an
established connection drops.
**Instead of:** leaving the MCP's behaviour after a drop unspecified.
**Revisit if:** Step 8's SDK surface adds reconnect.
**By:** Claude (proposed; contract-level)

### 2026-10-22 · Design-local resolutions for the stage builders
**Decided:** adopt these from `stage0-audit.md` §Builder ambiguities:
- **F4 / B1 (D1 move map):**
  - `server/src/index.ts` moves to `mcp/src/index.ts` unchanged.
  - `mcp` gets a temporary dependency on `@bridge/daemon`, removed in D5.
  - `daemon/` has no entry and no build until D3.
- **F5 / F19 / F20 (order and counts):**
  - `startup.ts` and its 5 tests are deleted in D5 as a documented removal (amendment A9).
  - Run D4 before D3, so D3 imports the real `token.ts` and needs no stub.
  - Run D0 before D1, not in parallel.
- **B3 (the token function):** it lives in `sdk/src/token.ts`, behind a `./token` subpath export.
  The daemon imports only that subpath.
- **F2 / B12 (finding the daemon):**
  - The daemon path resolves from the workspace root, found by the same walk-up as `bridge.token`.
  - `BRIDGE_DAEMON` still overrides it.
  - A missing `daemon/dist/index.js` rejects before the knock.
- **F6:** the three `browser_status` tests are a planned output change, replaced one for one.
- **F7 (timeouts):**
  - The daemon waits `clamp(timeoutMs ?? 30000) + 5000`.
  - `BridgeClient` waits that plus 1 s.
  - The MCP's call sites and `tools.test.ts:263` stay unchanged.
- **F18:** new `shared` modules are re-exported through `shared/package.json` `exports`.
- **F22:** `tsx` becomes a root devDependency in D1.
- **F23:** any `daemon.*` method other than `status` and `shutdown` answers `UNKNOWN_METHOD` and is
  never forwarded.
- **F24:** document that every client must agree on `BRIDGE_PORT`.

**Why:** each closes a gap a builder would otherwise fill on its own, and none changes the wire
contract.
**Instead of:** leaving each choice to its stage builder.
**Revisit if:** a stage's verifier finds one of them conflicts with the spec.
**By:** Claude (proposed)

### 2026-10-22 · Apply the held amendments A5–A12
**Decided:** apply A5–A12 as written in `stage0-audit.md`:
- **A5:** D1 runs `npm install`.
- **A6:** D5.5 names the `e2e-test-plan.md` lines and the CONN rows.
- **A7:** D7.1's grep adds the "one session" variants.
- **A8:** D0.4 covers only tests of new behaviour and uses `git stash -u`.
- **A9:** D5.1 becomes "≥ before − 5".
- **A10:** D3.5's grep adds `startWsHost`.
- **A11:** the D7 checkbox for `setup.md` states the token precedence (`BRIDGE_TOKEN` env wins over
  the file). This closes the W0 item.
- **A12:** D5.4 expects an empty `lifecycle.ts` diff.

**Why:** as written, each check either cannot hold or misses its target. The evidence is in the
audit.
**Instead of:** builders discovering this mid-stage and tripping STOP rules.
**Revisit if:** —
**By:** Claude (proposed; edits pre-registered checks, so it needs the session agent's sign-off)

## 6. Findings

- **The ruled premises hold, confirmed by execution:**
  - Under the nvm shim, `ppid` is the shim and `process.execPath` is the real node.
  - `actions.ts` has 4 `activeTab()` calls.
  - The fixture has no `_blank` button.
  - There are 0 DL rows.
  - The spec §10 and D0.3 lists hold the same 22 codes.
  - `setup.md` names `server/dist` at lines 18, 36, 46 and 262.
  - MCP SDK 1.29.0 keeps the handler at `_registeredTools[name].handler`.
  - ws 8.21.0 has `autoPong`.
- **Git history survives the move.** `git mv` keeps `git log --follow` history for single files and
  for the `server/` → `daemon/` directory rename (tried on a scratch branch, since deleted).
- **The spawn does not expose the token.** A spawn with `stdio: "ignore"` and `windowsHide`, run with
  a fake token, did not put the token on the command line or in a console.
- **F25, a fact correction for the session agent:** PID 2928 is not Claude Code's node. It is a codex
  `@oai/artifact-tool` `host-daemon.mjs`; Claude Code runs as `claude.exe`. The label in
  `journal.md` and in `briefs/common.md` (fixed facts / ESCALATION list) is wrong. The process does
  not hold 9234.
- **F21:** there is no `bridge.token` on this machine, so the D6 scripts need `BRIDGE_TOKEN` or a
  file the user creates.
- **F31:** extension tests are not typechecked, because `extension/tsconfig.json` includes only
  `src`. This predates Step 6, and the step does not touch the extension.
- **A classifier denial:** the auto-mode classifier denied the verifier a grep of the `claude.exe`
  binary. It was not worked around. It affects only F3's side note.
- **Candidate new CLAUDE.md gotcha (measured):** on Windows, `spawn(..., {detached: true})` does not
  detach from the parent-process tree. `taskkill /T` on the parent still kills the child, while a
  child whose parent has already exited survives the same kill.

## 7. Handoff

- **Processes and port:** nothing is running. No PIDs, no logs, no watchers. Port 9234 is free.
- **Git:** `git diff -- extension/` is empty, HEAD is `1a92d95` before this stage's commit, and the
  branches are main plus the pre-existing `feat/agent-bridge`.
- **Before D0 and D1:** rule on the proposed decisions above. That means F1, F3 and F8(b) for user
  review, the A5–A12 sign-off, and the stage order D0 → D1 → D2 → D4 → D3 → D5.
- **For the D1 builder:** `stage0-audit.md` §D1 move map. It covers all 21 tracked `server/` files,
  and its per-file test counts sum to 301.
- **Nothing needs the user's keyboard yet.** F3's measurement and the token file belong to the D6
  wave.
