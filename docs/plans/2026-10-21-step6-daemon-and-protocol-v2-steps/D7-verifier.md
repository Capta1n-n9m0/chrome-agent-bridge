# D7 verifier report — Docs (the non-E2E part)

- **Date:** 2026-10-22 · **Verifier:** Claude Opus 5.5 (`claude-opus-5-5`) · **HEAD:** `32d227e`
- **Audited:** the uncommitted working-tree diff to `CLAUDE.md`, `docs/setup.md`,
  `docs/progress-and-roadmap.md` (`git diff --stat`: 3 files, +229 / −62). `README.md` unchanged.
- **Verdict: FAIL** — one MAJOR finding (F1: a current-status `server/dist/index.js` line left in
  `docs/progress-and-roadmap.md`, against the brief's pre-registered kickoff criterion). The three
  pre-registered exit checks D7.1–D7.3 pass; every sampled claim checks out against the code.

## Findings

**F1 — MAJOR — `docs/progress-and-roadmap.md:168-169`.** §1 "Where we are" still reads, undated and in
the present tense: "**Quality state:** 256 unit tests pass; `tsc` typecheck clean across all three
packages; all four bundles build (`server/dist/index.js`, `extension/dist/{sw,options,offscreen,content}.js`)."
The D7 brief's pre-registered criteria say "Kickoff: no doc says `server/dist` or "one session" except
as a dated marker", and the phase doc's Stage D7 verifier focus says "no doc still says
`server/dist/index.js` … except as a dated superseded marker". D7.1's grep does not cover this file, so
the exit check passes, but the criterion does not. The line sits directly under the new Step 6 row
of the same table, so a reader gets 256 tests / three packages / `server/dist` next to 542 / five
packages.
Evidence: `grep -nE "startup\.ts|301|server/" CLAUDE.md docs/setup.md docs/progress-and-roadmap.md` →
`docs/progress-and-roadmap.md:169:bundles build (\`server/dist/index.js\`, …`.
Fix: rewrite the paragraph to the as-built (542 tests, 42 files, `npm test` at `033b1bc`; typecheck
across the five packages; bundles `daemon/dist/index.js`, `mcp/dist/index.js`,
`extension/dist/{sw,options,offscreen,content}.js`) with
`*Superseded 2026-10-22: was "256 unit tests … three packages … server/dist/index.js", because …*`,
or date it explicitly as the pre-Step-6 state.

**F2 — MINOR — `docs/progress-and-roadmap.md` §5 (the new "*Updated 2026-10-22:*" paragraph after
"Step 6 starts by pasting it…").** The writing guide's rule 5 says "Supersede, don't append … No growing
'Update' sections at the end." The builder did remove "Nothing is built" in place and left a marker,
but then appended a separate *Updated* paragraph. Fix: fold the new sentences into the paragraph
itself and keep only the dated *Superseded* marker.

**F3 — NIT — `docs/progress-and-roadmap.md:5`.** The header's marker reads "*Superseded 2026-10-22: the
header said "…", because …*". The guide's form is "*Superseded YYYY-MM-DD: was X, because Y.*".
Fix: "was "…"".

**F4 — NIT — `docs/setup.md` "Stopping it by hand", paragraph after the code blocks.** "Any client
still connected starts a new daemon: an open Claude session's MCP tries again 5 s after the connection
drops, and a running script gets an error." The second half contradicts the first: a script gets an
error and does **not** start a daemon (`sdk/src/client.ts:313`, a non-4002 close fails the client).
The MCP half is right (`mcp/src/link.ts:1-9`). Fix: "An open Claude session's MCP starts a new one
5 s after the connection drops; a running script gets an error instead."

**F5 — NIT — `CLAUDE.md`, the "daemon outlives the session" gotcha, last sentence.** It names two
`console.error` lines that are lost (the heartbeat drop and the socket error). There is a third:
`daemon/src/wsHost.ts:94` `"[chrome-bridge] routing failed:"`. Evidence:
`grep -n "console.error" daemon/src/wsHost.ts` → lines 94, 177, 187. Fix: say "its `console.error`
lines in `wsHost.ts` (routing failure, socket error, heartbeat drop)".

**F6 — NIT — `CLAUDE.md`, same gotcha: "it exits only on idle, … `daemon.shutdown`, a signal, or a
fatal error".** `daemon/src/main.ts` also exits at start on a bad `BRIDGE_PORT` (exit 1), no token
(exit 1), no build id (exit 1), and losing the bind race (exit 0). Arguably "fatal error" covers the
first three; the bind-race exit is covered by the busy-port gotcha. Optional wording fix.

**F7 — NIT — `docs/setup.md` stop commands.** Both work as described for the default layout (see the
claim table), but `Stop-Process -Id (Get-NetTCPConnection …).OwningProcess` errors when nothing
listens, and `pkill -f daemon/dist/index.js` misses a daemon started from a `BRIDGE_DAEMON` path with
a different tail. D6's working copy of `docs/e2e-test-plan.md:62` defines `Get-BridgeDaemon` (a
command-line match on `daemon[\\/]dist[\\/]index\.js`); harmonising the two after D6 commits is an
option, not a requirement.

**F8 — NIT — `README.md:23,28` (not changed).** It says "**20 tools**" and "256 unit tests green";
the truth is 21 tools and 542 tests. It names neither `server/` nor the one-session rule, so under
D7's lane ("path/claim fixes only, if it names `server/` or the one-session rule") leaving it was
correct. Route the stale counts to the session agent's close-out.

**F9 — NIT — cross-stage drift risk.** `docs/progress-and-roadmap.md` "Not done" names "D6 rows
MUX-1…9 and DL-1/2"; D6's uncommitted `docs/e2e-test-plan.md` now has a `MUX-10` result row (line
1006). Reconcile at D6 close.

No D6 content is in the three D7 files (`git diff -U0 … | grep -E "recipes|hello\.ts|redirect_server"`
→ nothing; MUX/DL are only named as pending). D7 touched no D6 file: the D7 ledger lists the three
files only; `docs/e2e-test-plan.md` became modified during this verification (D6's concurrent work).
`git diff -- extension/ | wc -l` → 0. Line endings: the working copies of `CLAUDE.md` and
`progress-and-roadmap.md` are CRLF with `core.autocrlf=true` (normalised on commit), not a finding.

## Exit checks

| Check | Command | Result | Verdict |
|---|---|---|---|
| D7.1 | `grep -rnE "one Claude session\|one session at a time\|2nd session\|server/dist\|server/src" CLAUDE.md docs/setup.md` | no output, exit 1 | PASS |
| D7.2 | `[ -e ]` on all 50 expanded key-file paths (shared 3, daemon 11, sdk 9, mcp 5, extension 22 incl. `handlers/` dir) | 50 OK, 0 missing | PASS |
| D7.3 | `git log --oneline 1a92d95..HEAD`; `git show --stat --format= <c> \| grep -E "dist/\|bridge\.token\|\.env"` per stage; `git log --name-only 1a92d95..HEAD \| grep …` | one commit per stage; no `dist/`, token or `.env` in any commit of the range | PASS (D7's own commit pending) |
| Current state block | awk-extract `## Current state` → `## Architecture`, sha256 working tree vs `git show HEAD:CLAUDE.md` | both `993c0ea5…c9fa4`; `cmp` (CR-stripped) IDENTICAL | PASS |
| Kickoff: no doc says `server/dist` except as a dated marker | grep above across the three files + README | `progress-and-roadmap.md:169` | **FAIL** (F1) |
| Kickoff: roadmap numbers cite their source | read | header cites `npm test` at `033b1bc`; table cites `npm test` per stage commit and the as-built register | PASS |
| Kickoff: E2E results part marked "waits for the D6 wave" | read | "**E2E results — waits for the D6 wave** (with the user, gate G6-2…)" | PASS |
| typecheck / test / build | `npm run typecheck`; `npm test`; `npm run build` | exit 0; **Test Files 42 passed (42), Tests 542 passed (542)**; exit 0 (`built daemon → dist/index.js`, `built mcp → dist/index.js`, `built extension → dist/`) | PASS |

## D7.3 commit mapping

| Stage | Commit | Subject | D7-list text | `dist/` / token / `.env` |
|---|---|---|---|---|
| Stage 0 | `618a3ae` | docs(step6): stage 0 — spec audit (verifier: PASS-with-notes) | none (audit, not a Part) — expected | none |
| D0 | `6f7768c` | feat(shared): D0 — protocol v2: roles, welcome, error codes, events | `feat(shared): protocol v2 — roles, welcome, error codes, events` ✓ | none |
| D1 | `80e540c` | refactor: D1 — split server into daemon/sdk/mcp workspaces | `refactor: split server into daemon/sdk/mcp workspaces` ✓ | none |
| D2 | `4d0241e` | feat(daemon): D2 — client multiplexing over one extension socket | `feat(daemon): client multiplexing over one extension socket` ✓ | none |
| D4 | `9f3fc86` | feat(sdk): D4 — connect-or-spawn client with daemon handover | `feat(sdk): connect-or-spawn client with daemon handover` ✓ | none |
| D3 | `3964eb1` | feat(daemon): D3 — build hash, idle exit, shutdown, log | `feat(daemon): build hash, idle exit, shutdown, log` ✓ | none |
| D5 | `d6832a1` | refactor(mcp): D5 — run as an SDK client | `refactor(mcp): run as an SDK client` ✓ | none |
| D5b | `033b1bc` | feat(sdk,mcp): D5b — connect without waiting for the extension; … | not in the list (stage added later, decisions.md · 2026-10-22 · #27) — expected | none |
| D7 | pending | brief: "docs: D7 — CLAUDE.md, setup and roadmap for the daemon (verifier: …)" | the list's `docs: Step 6 E2E results` belongs after the D6 wave | — |

Expected extras: the session agent's `docs(step6): …` bookkeeping commits `078c9d3`, `490c6c3`,
`818a884`, `8b30882`, `524ffa3`, `cbd91f9`, `b693eca`, `f5063e9`, `d3022f8`, `32d227e`.

## Claim sample

### CLAUDE.md (14 sampled)

| # | Claim | Doc place | Source checked | Verdict |
|---|---|---|---|---|
| 1 | Daemon `EADDRINUSE` → logs `port <p> in use — another daemon owns it`, exits 0, no retry | busy-port gotcha | `daemon/src/main.ts` (one `listen()`, `exitOnce(0, "port in use")`); register D3 "held port → exit 0" | ✓ |
| 2 | Idle `BRIDGE_DAEMON_IDLE_MS` default 600000, zero clients, extension does not count | daemon gotcha | `main.ts` `DEFAULT_IDLE_MS = 600_000`; `idle.ts:2`; register D3 | ✓ |
| 3 | Log `~/.chrome-agent-bridge/daemon.log`, `YYYY-MM-DDTHH:MM:SSZ <msg>`, cut to last 1 MiB on start, a line with `://` or the token withheld whole | daemon gotcha | `daemon/src/log.ts` (`defaultLogPath`, `formatLine`, `MAX_LOG_BYTES = 1024*1024`, `truncateToTail` in `createFileLogger`, `redact`) | ✓ |
| 4 | Build id = sha256 of `daemon/dist/index.js`; `daemon.status` and `browser_status` print it | daemon gotcha | `build.ts` (lowercase hex of file bytes of `argv[1]`); `route.ts:98`; `mcp/src/tools/registry.ts:54` | ✓ |
| 5 | Handover once per `connect()`, other clients get 4002 and reconnect, then `VERSION` | daemon gotcha | `sdk/src/knock.ts:5-11,124,222-270`; `connect.ts:98-100` (`allowHandover: !reconnect`) | ✓ |
| 6 | SDK spawns detached with no stdio | daemon gotcha | `sdk/src/spawn.ts` (`detached: true, stdio: "ignore", windowsHide: true`, `unref()`) | ✓ |
| 7 | `taskkill /T` on a live parent kills the detached child; a child whose spawner exited survived (Stage 0 F3, measured) | Windows gotcha | `stage0-audit.md:112-135` (`tree-parent.cjs`, `tree-parent2.cjs` outputs) | ✓ |
| 8 | Pre-Step-6 server takes v2 hello as extension (F1, measured on port 0); SDK gives up with `VERSION` after 2 s | pre-Step-6 gotcha | `stage0-audit.md:52-75`; `knock.ts:19` `WELCOME_TIMEOUT_MS = 2_000`, `:190-198` | ✓ |
| 9 | `BRIDGE_PORT` mismatch starts two daemons (F24, by reading code); `BRIDGE_DAEMON` Git Bash path → `C:\c\…`; `paths.ts` names it | port gotcha | `stage0-audit.md:369-378` (path part measured with `path.win32.resolve`); `sdk/src/paths.ts` hint | ✓ |
| 10 | `ws` multi-frame one-shot listener, 15 s wait blaming Chrome (D4 verifier, measured) | ws gotcha | register D4 "Verifier: FAIL on the first pass … waited 15 s" | ✓ |
| 11 | MCP `link.ts`: 21 tools with no daemon, stored reason, next `connect()` 5 s after each attempt settles, no overlap, also after a non-4002 close | busy-port gotcha | `mcp/src/link.ts:1-12` (`RETRY_MS = 5000`, probe); register D5 | ✓ |
| 12 | `lifecycle.ts` moved unchanged; MCP on exit only closes its client | lifecycle gotcha | `git diff 1a92d95 HEAD -M --stat` → `{server => mcp}/src/lifecycle.ts \| 0`; `mcp/src/index.ts:36-39` (`link.stop()`, `server.close()`) | ✓ |
| 13 | Timeout bounds `[100, 600000]`, daemon +5 s, client +1 s; `browser_download` passes `timeoutMs` | timeout gotcha | `daemon/src/route.ts:7-15`; `sdk/src/client.ts:20-31`; `sdk/src/download.ts:60-61` | ✓ |
| 14 | `ws` external in daemon and MCP bundles; 22 error codes; SDK exports exactly 5 values; build outputs; typecheck over five packages | key files / commands | `daemon/build.mjs:11`, `mcp/build.mjs:11`; `grep -cE … shared/src/codes.ts` → 22; `sdk/src/index.ts`; `package.json:7-11`; build output | ✓ |

### docs/setup.md (8 sampled)

| # | Claim | Doc place | Source checked | Verdict |
|---|---|---|---|---|
| 1 | Token: `BRIDGE_TOKEN` wins, else `bridge.token` at the repo root (first dir up with `"workspaces"`), whitespace trimmed, gitignored | §2 | `sdk/src/token.ts` (`resolveToken`, `findWorkspaceRoot`, `.trim()`); `.gitignore:16` | ✓ |
| 2 | The spawned daemon gets that client's token and port | §2 | `spawn.ts` env `{…, BRIDGE_TOKEN, BRIDGE_PORT}` | ✓ |
| 3 | Log line shapes `start pid=…`, `config pid=… port=… idleMs=… build=…`, `listening on 127.0.0.1:9234`, `client + "claude-code #1234" (1 client)`, `exit <code> (<why>) …` | The daemon | `main.ts` log calls (`JSON.stringify(name)`, `clients()`); `mcp/src/config.ts` `claude-code #<pid>` | ✓ |
| 4 | `browser_status` first line `Daemon: connected on 127.0.0.1:9234 (build <sha256>, up <s>s)` | The daemon | `mcp/src/tools/registry.ts:54` | ✓ |
| 5 | `sha256sum` and `Get-FileHash` match the build id (the latter upper case) | The daemon | measured: `sha256sum` `795fb769aeae5dbd…`, Node `createHash` `795fb769aeae5dbd…`, `Get-FileHash` `795FB769AEAE5DBD…` | ✓ |
| 6 | Stop by hand: `Get-NetTCPConnection -LocalPort 9234 -State Listen`'s `OwningProcess` is the daemon; `pkill -f daemon/dist/index.js` | The daemon | the daemon owns the `127.0.0.1` listener and is spawned as `process.execPath <root>/daemon/dist/index.js` (`spawn.ts`, `paths.ts`), so both match the default layout (not run live: no daemon may be started) | ✓ (F7 NIT) |
| 7 | `daemon.shutdown` replies `{ok:true}`, closes clients with 4002, exits 0; not a stop button because clients reconnect | The daemon | `route.ts:111-112`; `main.ts` `onShutdown → exitOnce(0)`; `client.ts` reconnects on 4002 and the reconnect knock can spawn (`connect.ts:98-100`, handover only disabled) | ✓ |
| 8 | Troubleshooting texts "No welcome from 127.0.0.1:9234 within 2 s after hello: a pre-Step-6 bridge server holds port 9234" and "Could not reach the bridge daemon on 127.0.0.1:9234 within 10 s … — see …daemon.log" | Troubleshooting | `knock.ts:136-142, 194-198` | ✓ |
| 9 | Clients on another port fail with `Extension not connected — …` | §2 | `daemon/src/bridge.ts:5`, `sdk/src/connect.ts:16` | ✓ |

### docs/progress-and-roadmap.md numbers

| Row | Doc | As-built register | Verdict |
|---|---|---|---|
| Baseline `1a92d95` 301 / 22 | table | header "301 tests, 22 files" | ✓ |
| D0 `6f7768c` 322 / 25 | table | D0 "301 → 322 passed (22 → 25 files)" | ✓ |
| D1 `80e540c` 322 / 25 | table | D1 "322 → 322 passed, 25 files" | ✓ |
| D2 `4d0241e` 385 / 28 | table | D2 "322 → 385 passed (25 → 28 files)" | ✓ |
| D4 `9f3fc86` 479 / 37 | table | D4 "385 → 479 passed (28 → 37 files)" | ✓ |
| D3 `3964eb1` 528 / 41 | table | D3 "479 → 528 passed (37 → 41 files)" | ✓ |
| D5 `d6832a1` 538 / 41, −5 `startup.test.ts` | table + note | D5 "528 → 538 passed (41 files): −5 `startup.test.ts`" | ✓ |
| D5b `033b1bc` 542 / 42 | header + table | D5b "538 → 542 passed (41 → 42 files)"; re-measured now: 542 / 42 | ✓ |
| 21 tools, schemas identical to `1a92d95` except `browser_status` | Step 6 block | D5 "21 tools, names and schemas byte-identical … apart from `browser_status`'s description and body" | ✓ |

## Other greps (task 5)

`grep -nE "startup\.ts|301|server/" CLAUDE.md docs/setup.md docs/progress-and-roadmap.md`:
- `CLAUDE.md:14` "Steps 1–5 (21 tools, 301 tests …)" — inside the Current state block, which D7 must
  not touch; the session agent refreshes it at close-out. OK.
- `progress-and-roadmap.md:5` — inside the dated superseded marker. OK.
- `progress-and-roadmap.md:169` — **F1**.
- `progress-and-roadmap.md:195` — the Baseline row of the per-stage table. OK.
- `progress-and-roadmap.md:204` — the documented `startup.test.ts` removal. OK.

`grep -nE "one session|single session|single Claude|two Claude sessions"` over the three files and
README → only `CLAUDE.md:108` and `progress-and-roadmap.md:308`, both inside dated markers.
No private hostnames or tokens in the diff (the only host named is `127.0.0.1`; examples use
`claude-code #1234`, `C:\…`, `/c/Users/…`).

## Verdict

**FAIL** — F1 (MAJOR). Everything else is MINOR/NIT; the fix round is one paragraph in
`docs/progress-and-roadmap.md` (F1), optionally with F2–F6.

## Round 2 re-check (after fix round 1, 2026-10-22)

Scope: F1–F7 and the F9 wording in the uncommitted `CLAUDE.md`, `docs/setup.md`,
`docs/progress-and-roadmap.md`. The stop commands were not run.

| Item | Where | Evidence | Verdict |
|---|---|---|---|
| D7.1 widened | `grep -nE "one Claude session\|one session at a time\|2nd session\|server/dist\|server/src" CLAUDE.md docs/setup.md docs/progress-and-roadmap.md` | one hit, `progress-and-roadmap.md:172`, inside the new `*Superseded 2026-10-22: was "256 unit tests … (server/dist/index.js, …)", because Step 6 split server/ …*` marker | PASS |
| F1 | `progress-and-roadmap.md:168-173` | "542 unit tests pass in 42 files (`npm test` at D5b commit `033b1bc`, 2026-10-22); … all five packages …; `npm run build` produces `daemon/dist/index.js`, `mcp/dist/index.js` and `extension/dist/…`" plus a dated marker. The extra Keepalive fix (`:316-320`) names `daemon/src/wsHost.ts` (heartbeat at `wsHost.ts:185-193`) with a dated marker | Fixed |
| F2 | `progress-and-roadmap.md:341-352` | the 2026-10-22 *Updated* paragraph is gone; its text is folded into the existing 2026-10-21 W0 paragraph with `*Superseded 2026-10-22: was "… Nothing is built.", because …*`; `grep -n "Updated 2026"` → only the pre-existing 2026-10-21 line | Fixed |
| F3 | `progress-and-roadmap.md:5` | marker now `*Superseded 2026-10-22: was "21 tools, 301 unit tests green …", because …*` | Fixed |
| F4 | `setup.md:151-152` | "An open Claude session's MCP starts a new daemon 5 s after the connection drops; a running script gets an error instead." Matches `mcp/src/link.ts:1-12` and `sdk/src/client.ts:313` | Fixed |
| F5 | `CLAUDE.md:135-136` | "(routing failure, socket error, heartbeat drop)" = `wsHost.ts:94,177,187` | Fixed |
| F6 | `CLAUDE.md:126-129` | "at start it also exits 1 on a bad `BRIDGE_PORT`, no token, no build id or a failed `listen`, and 0 when the port is taken": all five paths are in `daemon/src/main.ts` (`exitOnce(1, "bad BRIDGE_PORT" / "no token" / "no build id" / "listen failed")`, `exitOnce(0, "port in use")`) | Fixed |
| F7 | `setup.md:138-149` | `Get-NetTCPConnection … -ErrorAction SilentlyContinue \| ForEach-Object { Stop-Process -Id $_.OwningProcess }`: empty pipeline when nothing listens, so "does nothing" is accurate. The `pkill` note covers the `BRIDGE_DAEMON` path. Not executed | Fixed |
| F9 | `progress-and-roadmap.md:209` | "the D6 MUX and DL rows in `docs/e2e-test-plan.md`" (no count) | Fixed |
| Current state block | awk-extract sha256, working tree vs HEAD | both `993c0ea549b1…c9fa4` | Identical |
| New contradictions | `grep -nE "256 unit\|three packages\|startup\.ts"` over the three files | only inside the F1 marker and the documented `startup.test.ts` removal note (`:208`) | None |
| Lanes | `git diff -- extension/ \| wc -l` → 0; `git diff --quiet -- README.md` → unchanged | the three D7 files only (`docs/e2e-test-plan.md`, `recipes/`, `test-fixtures/` are D6's) | OK |
| Tests | `npm test` | Test Files 42 passed (42), Tests 542 passed (542) | PASS |

Still open, not blocking: F8 (README "20 tools" / "256 unit tests", outside D7's lane; route it to
close-out).

**Round 2 verdict: PASS-with-notes.** F1 (MAJOR) is resolved, and so are F2–F7 and F9. The only
item left is the F8 NIT.
