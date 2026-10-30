# S2b builder — doctor and update

**Role:** builder (`docs/agent-rules.md` §6) · **Model / effort:** Opus, medium · **Date:** 2026-10-30 · **Status:** DONE
(size over the cap within 1.5×, see Deviations) · **Commit:** none (brief).

## What was built

- `npm run doctor` → `tsx scripts/bridge/doctor.ts` (new, 75 lines). Prints one line per part (`OK`/`FAIL`/`HINT`,
  each non-OK line with its fix) and exits 1 when any line is `FAIL`, else 0. Parts: Node.js; Build (the six bundles
  present and newer than every build input, S2a's `buildNeeded`); Token file; MCP entry (read from
  `<CLAUDE_CONFIG_DIR or ~>\.claude.json`, S2a's `mcpDecision`: missing / this checkout at user scope / another
  checkout / unparsable); the entry's `BRIDGE_TOKEN` (same / differs from `bridge.token`); each local-scope leftover;
  the shell's `BRIDGE_TOKEN` and `BRIDGE_PORT` against what the MCP uses (the entry's env, else `bridge.token` and
  9234), equality only; Daemon (not running / refused the token / no answer / running the build on disk / running
  another build); Extension (connected or not, from `daemon.status`); and, when connected, "Extension build
  (heuristic)" (#432).
- `npm run bridge-update [-- --no-reload]` → `node scripts/bridge/update.mjs` (new, 60 lines, Node built-ins only).
  `git status --porcelain --untracked-files=no` (dirty → STOP), `git pull --ff-only` (non-ff or any failure → STOP),
  `npm ci --no-audit --no-fund` when needed, `npm run build` when needed, `recipes/reload-extension.ps1` through
  `powershell.exe -NoProfile -ExecutionPolicy Bypass -File` unless `--no-reload`, then the `/mcp` + handover line.
  Exits 0 or 1 only.
- `scripts/bridge/lib.mjs` (+114): `formatLine`, `lastResyncMs`, `extensionOlder`, `doctorLines`, `pullOutcome`,
  `reloadStep`, `UPDATE_DONE`, `newestMtime` (fs injected). All pure; no token value enters them.
- `package.json`: scripts `doctor`, `bridge-update` (neither a lifecycle name; pinned by the new update test).
  `scripts/tsconfig.json`: includes `bridge/*.ts`. `tsx` is a root devDependency (`^4.23.15`).

## How the doctor stays read-only (Stage0.md m4, M5; #429)

It does not use `connect()` or `knock()` (both spawn on a refused port, and `knock` hands over a daemon on another
build). It opens one socket with the SDK's `tryConnect` (`sdk/src/transport.ts`), sends one client hello (build = the
sha256 of `daemon\dist\index.js` by the SDK's `hashDaemon`, `proto` = the SDK's `PROTOCOL_VERSION`), sends only
`daemon.status`, compares `status.build` itself and closes. A refused port reads "not running — it starts with the
first client". Close 4001 reads "refused the token"; the close reason is never printed. It never calls the `claude`
CLI. A static test pins that `doctor.ts` holds no `connect(`, `knock(`, `spawnDaemon`, `daemon.shutdown` or a `claude`
command string, and does send `"daemon.status"`.

## Exit criteria

- **I2.3:** `scripts/test/s14-doctor.test.ts` (19 tests): every part green → all OK, no fix; each failure case (old
  Node, dist missing, dist stale, token missing, config unparsable, no entry, another checkout, daemon refused, no
  answer, extension not connected, entry token differs, local leftover, shell token differs, shell port differs) is
  `FAIL` with its fix line; same-valued copies are hints; no daemon → hint and the extension not checked; another
  daemon build → hint naming `/mcp`; the #432 heuristic (older or no resync seen) → "may be older than the build",
  fix "reload it"; `lastResyncMs` over a CRLF log. `scripts/test/s14-update.test.ts` (9 tests): pull dirty /
  updated / current / non-ff / other failure; reload `--no-reload` skip, 0 done, 2 → retry at attempt 1 then hint at
  attempt 2, 1/3/4/5/null → fail naming the code; the closing line names `/mcp` and the next client's handover;
  `newestMtime`; the root scripts.
- **Red first:** both files run before `lib.mjs` had the functions: 28 failed of 28 (`S2b-builder-red.txt`).
- **I2.4 achievable:** on a scratch clone `B` one commit behind its origin `A` (both scratch clones, `A` holding these
  files as a local scratch commit), with no `node_modules`: U1 `npm run bridge-update -- --no-reload` fast-forwarded,
  ran `npm ci` and `npm run build`, skipped the reload with its hint, **exit 0**; U2 a second run: already up to date,
  `npm ci` and the build skipped, **exit 0**; U3 a modified tracked file: STOP line, exit 1; U4 diverged: git's
  "Not possible to fast-forward", STOP line, exit 1 (`S2b-builder-update-runs.txt`). `CLAUDE_CONFIG_DIR` was asserted
  to be a scratch folder before the runs.
- **Doctor runs (manual, isolated):** `CLAUDE_CONFIG_DIR` and the home folder (`USERPROFILE`) set to scratch folders
  and asserted; the scratch entry carries a dummy token and port 9299; a stand-in daemon (`ws` on 9299, answering
  welcome and `daemon.status`) for the "up" cases. A: nothing on 9299 → Daemon HINT not running; B: same build,
  connected, resync after `sw.js` → Daemon, Extension and the heuristic OK; B2: resync older than `sw.js` → heuristic
  HINT; C: another build, not connected, shell token and port set → Daemon HINT, Extension FAIL, both shell lines
  FAIL. The stand-in logged one hello named `doctor` and one `daemon.status` per run, nothing else
  (`S2b-builder-doctor-runs.txt`). Every run exits 1 because the dummy entry token differs from the main tree's
  `bridge.token` (the intended FAIL line). The user's live bridge, `~/.claude.json`, Chrome and the extension were
  not touched; `reload-extension.ps1` and `git pull` were never run in the main tree.
- **I2.2:** the doctor prints only same/differs for tokens and ports; the token goes only into the hello frame,
  never argv or a log; update never reads it. Every `S2b-builder-*.txt` was scanned for the token by equality: absent
  in all 7; none holds the user's name or a home path (`<repo>`, `<scratch>`, `~`).

## Counts (commands run in the main tree)

- `npm run typecheck`: exit 0 (`S2b-builder-typecheck.txt`).
- `npm test`: before **6055 passed, 253 files** → after **6083 passed, 255 files** (+28: 19 doctor, 9 update)
  (`S2b-builder-test-before.txt`, `S2b-builder-test-after.txt`).
- `npm run build`: exit 0, daemon, mcp and extension built (`S2b-builder-build.txt`).

## Deviations

- **Size:** about 403 new lines against the 300 cap: code 252 (`lib.mjs` +114, `doctor.ts` 75, `update.mjs` 60,
  `package.json` and `tsconfig` 3), tests 151. Code alone is under the cap and the whole is under 1.5×, one coherent
  piece (§7, #320).

## Proposed decisions

### 2026-10-30 · The doctor runs under tsx and probes with its own hello and `daemon.status`
**Decided:** `doctor` is `tsx scripts/bridge/doctor.ts`; it imports `tryConnect`, `hashDaemon` and `PROTOCOL_VERSION`
from `sdk/src/` by relative path (no SDK change, not the public surface) and sends one hello and one `daemon.status`.
**Why:** `connect()`/`knock()` spawn on a refused port and hand over a daemon on another build (m4); `knock` returns a
welcome only for a matching build, so it cannot report a mismatch read-only. **Instead of:** `connect()` with a
refusing `spawnDaemon` (still hands over). **Revisit if:** the SDK gains a read-only status probe. **By:** Claude (proposed)

### 2026-10-30 · What the doctor compares against, and which lines are hints
**Decided:** the probe and the shell checks use what the MCP uses: the entry's env `BRIDGE_TOKEN`/`BRIDGE_PORT`, else
`bridge.token` and 9234. "Daemon not running" and "daemon on another build" are hints (each heals at the next client);
"extension may be older" is a hint (#432's heuristic); a same-valued token copy is a hint. The heuristic flags when
`sw.js` is at least 1 s newer than the last resync stamp (second precision), or when no resync line is found.
**Why:** R4.1's green is "connected and not flagged older"; a heuristic must not fail the run. **By:** Claude (proposed)

### 2026-10-30 · update exits 0 or 1; reload exit 2 twice is a hint
**Decided:** any STOP or failure → 1; the reload's exit 2 is re-run once (#99), then a by-hand hint with exit 0 (#431);
the reload's other codes (1, 3, 4, 5, none) → 1. **Why:** keeps setup's exit 2 and the reload's exit 2 apart (S2a
verifier2 N4). **By:** Claude (proposed)

## Notes for the verifier

- NIT: after an up-to-date pull, git's own "Already up to date." and update's line both print.
- MINOR candidate: with `bridge.token` missing and an entry token present, the doctor also prints "the entry's
  BRIDGE_TOKEN differs from bridge.token" (comparison against nothing); the Token file FAIL line comes first.
- The update's `npm ci` decision reuses S2a's `installNeeded`, so the doctor and update agree with setup.
- `journal.md` shows as modified in the tree; this builder did not edit it.
- The scratch clones `A` and `B` (B has its own `node_modules` with `@bridge/*` junctions into B's own workspaces)
  remain in this session's scratchpad (`…/scratchpad/s2b/`); if deleted, remove the junctions first (#220, #364).
