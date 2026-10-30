# S4 rehearsal (Step 14, stage S4)

Runner: Sonnet, medium effort. Date: 2026-10-30. `<repo>` = the main checkout, `<scratch>` = the S4 scratch folder
(`<scratch>\clone` is the fresh clone), `~` = the home folder. Raw captures: `S4-rehearsal-*.txt` in this folder.

## Pass rules (pre-registered, written before any command ran; never edited)

- **I2.1:** on the fresh clone, `npm run setup` (real run, not `--dry-run`) ends exit 0 with the next steps printed; a
  second run changes nothing (compare a listing of mtimes+sizes of the clone's tracked-and-generated files incl.
  `dist/`, `bridge.token`'s sha256 (hash held in memory only; record "same"/"differs"), and the scratch config file's
  sha256) and ends exit 0.
- **I2.2:** none of the rehearsal's captures contains the clone's token or the real token (equality scan; only hit
  counts printed).
- **I2.4:** `npm run bridge-update -- --no-reload` on the clone ends exit 0 (clone made one commit behind first with
  `git reset --hard HEAD~1` IN THE CLONE ONLY, so the pull does real work; then a second update run, also exit 0).
- **R4.1:** `npm run doctor` in the main checkout prints every part OK (green) and exits 0.

STOP rules: any change to the user's real `~/.claude.json` (sha256 before/after); `claude mcp list` under the scratch
`CLAUDE_CONFIG_DIR` showing any server; a token in any capture; any effect on the user's Chrome beyond the one allowed
reload.

## Record

Shell: Windows PowerShell 5.1, each command through `cmd /c "... > capture 2>&1 < NUL"` (no TTY, so the clipboard copy is
skipped). Node v25.2.1, npm 11.6.2.

| # | Step | Result | Capture |
|---|---|---|---|
| 0 | `git clone <repo> <scratch>\clone` at HEAD (`8f50b9e`); sha256 + mtime + `mcpServers`-key hash of the real `~/.claude.json` recorded (hash only) | clone ok | (this file) |
| 1 | `CLAUDE_CONFIG_DIR=<scratch>\claude-config` set and asserted in the same shell; `claude mcp list` | exit 0: "No MCP servers configured." Isolation proven. | `S4-rehearsal-mcp-list.txt` |
| 2 | `npm run setup` (run 1, real) | **exit 0**. Prerequisites 4 OK; `npm ci --no-audit --no-fund` added 205 packages in 10 s; build ran; "Created bridge.token (random, 256 bits; not shown)"; `claude mcp add -s user` wrote only `<scratch>\claude-config\.claude.json`; "No terminal to ask in: the token was not copied"; the 6 next steps printed. | `S4-rehearsal-setup1.txt` |
| 3 | listing (2116 entries: tracked files + `daemon/mcp/extension dist` + `bridge.token` + `node_modules/.package-lock.json`, size + mtime ticks), then `npm run setup` (run 2), then the listing again | **exit 0**. Run 2 said: npm ci skipped, build skipped, "bridge.token exists: kept", "already points at this checkout: left as it is", next steps printed. Listing diffs: **0**. `bridge.token` sha256: **same**. Scratch config file sha256: **same**. | `S4-rehearsal-setup2.txt`, `S4-rehearsal-listing-before-run2.txt`, `S4-rehearsal-listing-after-run2.txt` |
| 4 | `npm run doctor` in the clone | exit 1 (not a pass rule). OK: Node, Build, Token file, MCP entry (user scope, this checkout). FAIL Daemon: "running, but it refused the token - it was started with another token" (the expected 4001 refusal of the clone's own token by the user's daemon; nothing handed over). HINT Extension: not checked. | `S4-rehearsal-doctor-clone.txt` |
| 5 | in the clone only: `git reset --hard HEAD~1` (to `0a5ea8f`), then `npm run bridge-update -- --no-reload` | **exit 0**. "Updating 0a5ea8f..8f50b9e, Fast-forward" (11 files: S3 docs + `examples/list-tabs.ts`), "Pulled the new commits."; npm ci and build skipped (no source change); "--no-reload: the extension was not reloaded"; /mcp hint. Clone back at `8f50b9e`. | `S4-rehearsal-update1.txt` |
| 6 | `npm run bridge-update -- --no-reload` again | **exit 0**. "Already up to date." (printed twice), the same skips. | `S4-rehearsal-update2.txt` |
| 7 | **R4.1** `npm run doctor` in `<repo>` (real config, `CLAUDE_CONFIG_DIR` unset) | **exit 0**. All 7 lines OK: Node, Build, Token file, MCP entry (user scope, this checkout), Daemon (running the build on disk), Extension (connected), Extension build (heuristic: "resynced after the last build"). "No part failed." No reload was needed or run. | `S4-rehearsal-doctor-main1.txt` |

## Verdicts against the pre-registered rules

- **I2.1: PASS** (rows 2, 3).
- **I2.2: PASS.** Equality scan of the 10 `S4-rehearsal*` files in this folder (the 9 captures and this record, after
  the writing): real token 0 hits, clone token 0 hits (scan run after this file was written; see S4-runner.md).
- **I2.4: PASS** (rows 5, 6).
- **R4.1: PASS** (row 7).

## Safety readbacks

- Real `~/.claude.json`: sha256 same, mtime same, `mcpServers`-key hash same, before and after the whole rehearsal.
- `claude` ran only under the scratch `CLAUDE_CONFIG_DIR`, once for the empty `mcp list` and once inside setup run 1
  (`mcp add`); setup run 2 and the doctor did not call it.
- Chrome, the extension, its Options, the safety state and the tabs were not touched; no reload ran; nothing was
  pulled or reset in `<repo>`; the daemon was not handed over.

## Observations (recorded, not rules)

- The clone's doctor against the user's daemon: FAIL Daemon, exit 1, as the Stage 0 m4 design says (dummy/own token is
  refused with close 4001).
- `bridge-update` prints "Already up to date." twice when nothing is new (git pull's stdout and stderr both carry it).
- Raw captures written through `cmd` redirection show the build script's arrow glyph as mojibake; the committed copies
  replace non-ASCII runs with `->`.

## Handoff

- The clone is left at `<scratch>\clone` (`<scratch>` = the session scratchpad's `s4` folder), at `8f50b9e`, with its
  own `node_modules\@bridge\*` junctions, its own `bridge.token`, and the scratch Claude config at
  `<scratch>\claude-config` holding one `chrome-agent-bridge` entry pointing at the clone. Never recursive-delete across
  the junctions (#220).
- No process left running.
