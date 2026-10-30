# S2b fixer, round 1 — doctor and update

**Role:** fixer (`docs/agent-rules.md` §6) · **Model / effort:** Opus, medium · **Date:** 2026-10-30 · **Commit:** none
(brief). Fixes the S2b verifier's MINOR 1–4, NIT-4 (npm without `npm.cmd`) and NIT-1 (the port in the fixes), per the
session agent's rulings for this round. Other NITs: no change. Nothing ran against the live bridge, `~\.claude.json`,
Chrome or the extension; every test injects its facts and I/O.

## Changes

- **MINOR 1** (`scripts/test/s14-doctor.test.ts`): a test pins `extensionOlder`'s direction: `sw.js` 1 s or more after
  the resync → `true`; within the same second or before → `false`; either side unknown → `null`. The verifier's
  inverted mutant (`swMtimeMs < resyncMs`) now fails it: `1 failed | 23 passed (24)` (`S2b-fixer1-mutant.txt`); the
  source was restored and checked afterwards (`swMtimeMs >= resyncMs + 1000` present once).
- **MINOR 2** (`lib.mjs`, `doctorLines`): the heuristic's OK detail now reads "extension resynced after the last build
  (a heuristic: it cannot tell the loaded build)". The HINT wording is unchanged (#432).
- **R4.1 ruling** (`lib.mjs`): an entry `BRIDGE_TOKEN` equal to `bridge.token` is an **OK** line, "the entry's
  BRIDGE_TOKEN equals bridge.token (it works; the env entry is optional)". A differing token stays a FAIL.
- **MINOR 3** (`doctor.ts`, `lib.mjs`): with no token, `probe()` returns a new `{ state: "notoken" }`, and the Daemon
  line is `HINT Daemon: not checked: no token to knock with - run npm run setup`. It no longer gives the netstat fix.
- **MINOR 4** (`lib.mjs`, `mcpDecision`): when `bridge.token` is missing, an entry token gives `envToken: "nofile"` (it
  never gives "differs"). The doctor then prints the HINT "bridge.token missing; the MCP entry's own token is used", and
  its fix is "run npm run setup (it creates bridge.token); remove BRIDGE_TOKEN from the entry only if the doctor then
  says it differs". `setup.mjs` is outside the lane and needs no change: it creates `bridge.token` before it decides
  about the entry, and the new value prints nothing there.
- **NIT-1** (`lib.mjs`, `doctor.ts`): `doctorLines` takes `port` (the port the MCP uses: the entry's `BRIDGE_PORT`,
  otherwise 9234). The Daemon-error fix and the Extension fix name that port.
- **NIT-4** (`lib.mjs` `npmCli`, `update.mjs`): update runs npm with this node and no shell. It uses `npm_execpath`
  when that ends in `.js` (the `npm run` case). Otherwise it looks for `node_modules\npm\bin\npm-cli.js` beside
  `node.exe` and then in each `PATH` directory (the nodejs.org and nvm-windows layouts beside the `npm.cmd`/`npm.exe`
  shim), reading `PATH` or `Path`. If none is found, update stops with a FAIL line and exit 1. The `npm.cmd` +
  `shell: true` fallback is gone. Tested as a pure function with an injected `exists`.

## Counts

- `npm run typecheck`: exit 0 (`S2b-fixer1-typecheck.txt`).
- `npm test`: **6089 passed, 255 files**, exit 0 (`S2b-fixer1-test.txt`), against the verifier's 6083. The +6 are five
  doctor tests and one update test; one doctor test was reworded in place (same-valued copies).
- Size: about 55 lines net (`lib.mjs` +14, `doctor.ts` +1, `update.mjs` +0 net with 2 lines changed, tests +25 and +11),
  under the 80-line cap.
- Token and user-name scan: the main tree's `bridge.token` value and the user name appear in none of the `S2b-fixer1-*`
  files or the touched sources.
