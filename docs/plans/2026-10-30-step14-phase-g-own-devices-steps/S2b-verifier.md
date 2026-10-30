# S2b verifier — doctor and update

**Role:** verifier (`docs/agent-rules.md` §6) · **Model / effort:** Opus, medium · **Date:** 2026-10-30 ·
**Verdict: PASS-with-notes** (no CRITICAL, no MAJOR; 4 MINOR, 7 NIT) · **Commit:** none (brief).

Read: the phase doc (Outcome as amended, § S2 and the Stages note, I2.2–I2.4, R4.1, Human gates, STOP rules, Forbidden
fixes), decisions #427–#432, Stage0.md (C2, M2, M5, M6, m4), S2a-verifier2.md (N4), `sdk/CLAUDE.md`, `daemon/CLAUDE.md`,
`recipes/CLAUDE.md`. The builder's report (`S2b-builder.md`) was audited as claims. Main tree: read and run only. Every
mutation ran in scratch clones (`<scratch>\A`, `<scratch>\B`, own `npm ci`; their `node_modules\@bridge\*` junctions
point into each clone, so a delete must remove them first, #220). Evidence: `S2b-verifier-counts.txt`,
`S2b-verifier-runs.txt`.

## Counts (re-derived, main tree, S2b uncommitted on HEAD 51a0ad8)

- `npm run typecheck`: exit 0 (the root chain now ends with `tsc -p scripts/tsconfig.json`, which covers `bridge/*.ts`).
- `npm test`: **6083 passed, 255 files**, exit 0. Builder's baseline 6055 / 253 + 28 tests in 2 new files agrees.
- `npm run build`: exit 0; daemon, mcp, extension built.
- **Red first:** in clone A with `lib.mjs`, `package.json` and `scripts/tsconfig.json` at HEAD and the new tests,
  `doctor.ts` and `update.mjs` present: **27 failed | 1 passed (28)**. The one that passes is the static source pin over
  `doctor.ts`, which passes once that file exists (the builder's 28 of 28 was run before `doctor.ts` existed; same in
  substance). With the S2b files copied in: 28 passed.
- **Mutations:** every Daemon FAIL turned into a hint → 2 failed (the tests catch it). `extensionOlder` inverted →
  **28 passed** (MINOR-1).

## Attack results

**(a) The doctor's hello.** In the daemon a client hello's `build` is only parsed (`daemon/src/handshake.ts:31`) and is
never compared: the build-id handover lives wholly in the SDK's `knock` (`sdk/src/knock.ts`), which the doctor does not
import or call. The daemon's only shutdown paths are `daemon.shutdown` (`daemon/src/route.ts`), a signal and the idle
timer; the doctor sends only `daemon.status`. It does count as a client for its few milliseconds: `registry.add` →
`client + "doctor" (1 client)` and `client - "doctor" (0 clients)` in the log (`daemon/src/main.ts:205-212`), nothing
else; the name is fixed, no token, URL or path (measured: `S2b-verifier-runs.txt` R1–R3, a real daemon from the clone's
dist on 9299 with a scratch home). Side effect: leaving re-arms a zero-client daemon's idle timer with a fresh 10 min
(NIT-3). The socket is closed in every branch (stand-in saw close 1000 after each ok/silent run, 4001 on refuse). A wrong
token: the daemon closes 4001 (`wsHost.ts:17,229-231`), the doctor reads "refused the token" and never prints the close
reason (G4). No daemon: `ECONNREFUSED` → "not running" hint, nothing spawned (G1: the port stays free). A real daemon on **another** build survived two doctor runs (R2: "daemon alive after two
doctor runs (no handover): yes"). Importing `knock.js`/`spawn.js`/`transport.js` has no top-level side effect (only
declarations). The static pin (`s14-doctor.test.ts`, last describe) forbids `connect(`, `knock(`, `spawnDaemon`,
`daemon.shutdown` and a `claude` command string; it does not forbid `child_process` (NIT-5).

**(b) Each doctor line.** Sources checked: Node (`process.versions.node`), Build (S2a's `BUILD_OUTPUTS`/`BUILD_INPUTS`/
`buildNeeded`), Token file, MCP entry (`claudeConfigPath` honours `CLAUDE_CONFIG_DIR`; `mcpDecision` normalises the path
with `path.win32.normalize`, trailing slashes and case; user scope = top-level `mcpServers`; local leftovers =
`projects[*].mcpServers`), the entry's env token (equality), shell `BRIDGE_TOKEN`/`BRIDGE_PORT` against what the MCP uses
(entry env first, else `bridge.token` and 9234, as `sdk/src/token.ts` does), Daemon and Extension from `daemon.status`,
the heuristic from `extension\dist\sw.js` mtime vs the last `extension resync` stamp in `~\.chrome-agent-bridge\daemon.log`
(the daemon's own `defaultLogPath`, `daemon/src/log.ts:23`). This is #432 as decided, with a stated 1 s allowance for the
stamp's second precision. Every failure case has a FAIL line with a fix (I2.3, unit tests + runs G3–G6). HINT vs FAIL:
I agree with the builder's three proposed decisions; "daemon not running" and "another build" heal at the next client,
and a same-valued copy is harmless. The "no bridge.token → differs" candidate is real (MINOR-4). Wrong fixes in two
corner cases (MINOR-3, NIT-1).

**(c) update.** `git status --porcelain --untracked-files=no` → dirty STOP (U3, exit 1); `git pull --ff-only`; a
non-fast-forward is recognised by git's text (U4, exit 1); any other failure stops (U5, detached HEAD, exit 1); `npm ci`
by S2a's `installNeeded`; build by S2a's `buildNeeded` (U1 ran both, U2 skipped both); reload by `reloadStep`: 0 → done,
2 → one re-run then a by-hand hint (exit 0, #431), 1/3/4/5/none → FAIL (exit 1); `--no-reload` skips; exits 0 or 1 only
(`process.exit(1)` or `exitCode` 0/1; an uncaught throw is also 1). The closing line names `/mcp` and the handover.
**Without `--no-reload` from a scratch clone:** `reload-extension.ps1` computes the extension ID from the clone's own
`extension\` path (`reload-extension.ps1:8-9`), so no card in the user's Chrome matches: if Chrome is running it opens
its own window, presses nothing, closes it, exits 2; update re-runs it once (a second window), then prints the by-hand
hint and exits 0. The user's loaded extension is never pressed or changed (G14-2 not reached), but two windows flash in
the user's Chrome and the hint wrongly suggests a reload is needed. Only `--no-reload` (S4, #431) avoids it; nothing
in update detects the case. Not a finding against S2b (decided by #431); S4's brief must keep `--no-reload`.

**(d) The token.** The doctor holds the token only in memory and sends it only in the hello frame; it spawns nothing,
so no argv; it prints only same/differs. update never reads it; its children (git, npm, powershell) get no token in
argv. Scan by equality (the verifier's own three files are free of both too): the main tree's `bridge.token` and the clone's
dummy token are absent from all 7 `S2b-builder-*` files, `S2b-builder.md`, `doctor.ts`, `update.mjs`, `lib.mjs`, every
verifier capture, the stand-in log and the scratch `daemon.log`. Neither verifier file holds the user name or a home
path.

**(e) Size.** `git diff --numstat` + `wc -l`: code `lib.mjs` +114, `doctor.ts` 75, `update.mjs` 60, `package.json` +2
net, `tsconfig` 0 net = about 251–254; tests 94 + 57 = 151; total about 404 against cap 300. Code alone is under 300 and
the total is under 450 (1.5×); the extra over 300 is test lines; one coherent piece. **It qualifies** under §7 (#320) as a
deviation the step agent records. Note the lines are dense (several over 140 characters), so the count flatters it.

## Exit criteria

- **I2.2:** met for S2b (scan above). The doctor's design keeps tokens out of output; update never reads one.
- **I2.3:** met: 19 doctor tests cover every failure case named in the Outcome plus M6 and the shell lines; each FAIL
  carries a fix; runs G3–G6 show the lines live.
- **I2.4 (achievable):** met: U1 on scratch clone B, one commit behind, no `node_modules`, `--no-reload`: pull, `npm ci`,
  build, skip, **exit 0**; U2 again, **exit 0** (`CLAUDE_CONFIG_DIR` asserted scratch).
- **R4.1 reachability:** an all-OK run exists: G2 (stand-in on 9299, same build, extension connected, resync after
  `sw.js`, entry at user scope with no env token): seven OK lines, "No part failed.", **exit 0**. On the user's real
  machine it also needs the user-scope entry for `<repo>` with no local-scope leftover (not read here: lane), and the
  session agent must say whether a HINT for a same-valued entry token (the `docs/setup.md` §3 shape, M6) counts as green;
  the builder's rule (HINT is not FAIL, exit 0) makes it so. Beware MINOR-2: the heuristic line can read OK without a
  reload.

## Findings

**MINOR-1 · `scripts/bridge/lib.mjs:140-141` · the #432 comparison is not pinned.** `extensionOlder` has no test; the
doctor tests inject its result. Evidence: clone A, `sed -i 's/swMtimeMs >= resyncMs + 1000/swMtimeMs < resyncMs/'` →
`npx vitest run scripts/test/s14-doctor.test.ts scripts/test/s14-update.test.ts` → `Tests 28 passed (28)`. Fix: a test:
`sw.js` ≥ 1 s after the resync → true; within the same second or before → false; either null → null.

**MINOR-2 · `lib.mjs:189` · the heuristic's OK text overclaims.** Every proto:2 extension hello logs a resync
(`daemon/src/intercept.ts:209-214,257`), including the old extension reconnecting to a daemon that was handed over after
the build. So `bridge-update --no-reload` (or a reload hint) → `/mcp` as `UPDATE_DONE` says → doctor prints "OK Extension
build (heuristic): reloaded after the last build" though nothing was reloaded. Inherent to #432's rule (for user
review), but the OK detail should not say "reloaded". Fix: "connected after the last build (a reconnect also counts;
not proof of a reload)"; add this case to #432's "Revisit if".

**MINOR-3 · `doctor.ts:36`, `lib.mjs:181` · no token → a wrong fix.** With neither `bridge.token` nor an entry token the
Daemon line is `FAIL Daemon: no answer (no token to knock with) - check what holds port 9234: netstat ...` (run G6).
The daemon was never asked. Fix: a hint "not checked (no token)" pointing at the Token file line, or its own state.

**MINOR-4 · `lib.mjs:85` · the builder's candidate, confirmed by code.** `bridge.token` missing and an entry token present
→ `envToken` "differs" (`"x" === undefined`) → `FAIL MCP entry's token: ... differs from bridge.token and wins`, with
the fix "remove the entry". There is nothing to differ from, and the advice removes the one token that works. Fix: when
`tokenFile` is null, report "none" (the Token file FAIL already names setup).

**NIT-1 · `lib.mjs:181,186`.** The fixes name port 9234 even when the MCP uses the entry's `BRIDGE_PORT` (run G5 probed
9299 and printed `netstat ... findstr 9234`); an entry `BRIDGE_PORT` other than 9234 is never flagged, though the
extension's Options hold 9234 per setup. Fix: pass the port used into `doctorLines`.

**NIT-2 · `lib.mjs` shell lines.** A same-valued shell `BRIDGE_PORT` is a hint whose fix reads "unset BRIDGE_PORT (every
client must use one port)" (run G3), which reads like a failure. Wording only.

**NIT-3 · the probe counts as a client.** It logs `client + "doctor"` / `client - "doctor"` and re-arms a zero-client
daemon's idle timer for a fresh 10 min (`daemon/src/idle.ts` update(0) after update(1)). Harmless; worth one line in the
docs (S5).

**NIT-4 · `update.mjs:25`.** Outside `npm run`, the fallback runs `npm.cmd`; this machine has only nvm's `npm.exe`
(Stage0 0.3; `Get-Command npm.cmd` finds nothing), so `node scripts/bridge/update.mjs` fails when an install or build
is needed. The documented path (`npm run bridge-update`) is unaffected. Fix: `npm` with `shell: true`.

**NIT-5 · `s14-doctor.test.ts` static pin.** Add `/child_process/` (and `/\bspawn\(/`) so a future edit cannot start a
process from the doctor.

**NIT-6 · the doctor needs `node_modules` (tsx).** Before `npm run setup`, `npm run doctor` fails with npm's "tsx not
recognized" instead of a FAIL line. Fine by #427 (only setup must run before `npm ci`); S5 should say "after setup".

**NIT-7 · update prints "Already up to date." twice** (git's and its own; U2). Confirmed the builder's note.

## Model and effort

Opus, medium.
