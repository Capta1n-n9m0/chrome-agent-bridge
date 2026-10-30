# Step 14 · S2a verifier — `npm run setup` and the shared logic

**Role:** verifier (S2a). **Model / effort:** Opus, medium. **Date:** 2026-10-30. **Lane:** read and run only; nothing in
the main tree edited except this report and its evidence. Evidence: `S2a-verifier-*.txt` (this dir; `<wt>` = the
scratch worktree, `<v>` = a scratch folder of dummy configs, `~` = the home folder, `<user>` = the user name).
Claims audited: `S2a-builder.md`. Read: the phase doc (Outcome, Decisions, Stages note, exit checks, gates, STOP rules,
forbidden fixes), `Stage0.md` §3 0.3–0.5 and C1, M3–M6, m3, decisions #427–#429 (and #432 for its interaction),
`docs/setup.md` Prerequisites and §1–§4, `sdk/src/token.ts`.

## 1. Verdict

**PASS-with-notes.** No CRITICAL or MAJOR finding. The token never reaches output, argv, a log or an error text by any
path found; #427, #428 and #429 are applied as decided; every new test fails under a mutation of the logic it pins
(two small gaps, F7). Seven MINOR and four NIT findings; F1 and F2 need a line in the S4 brief before S4 runs.

## 2. Outputs (re-derived)

Scratch worktree at HEAD `6e22e3b`, S2a's five files copied in, its own `npm ci --no-audit --no-fund` (exit 0, 205
packages; `node_modules/@bridge/*` junctions point into the worktree itself, never the main tree, #220).

| Command (in the worktree) | Result | Evidence |
|---|---|---|
| `npm run typecheck` | exit 0; the chain ends with `tsc -p scripts/tsconfig.json` | `S2a-verifier-typecheck.txt` |
| `npm run build` | exit 0 | `S2a-verifier-build.txt` |
| `npx vitest run` | **6034 passed, 9 failed, 6043 total; 251 of 252 files**. `scripts/test/s14-setup.test.ts` 13 of 13. All 9 failures are `recipes/test/s11-r16-runner.test.ts`, the known CRLF-`.ps1` scratch-checkout fact (`recipes/CLAUDE.md`; Stage0.md measured the same 9 in a clone at HEAD). HEAD's 6030 tests / 251 files + 13 / 1 = 6043 / 252: matches. The builder's 6049 / 253 includes S1's in-flight file. | `S2a-verifier-test.txt` |
| Red without the change | no `lib.mjs` → "no tests", file failed; HEAD's `package.json` (no `setup`) → 1 failed | `S2a-verifier-mutations.txt` |
| 14 mutations of `lib.mjs` / `package.json` | 12 caught (1–2 tests red each), 2 survive (F7) | `S2a-verifier-mutations.txt` |
| `npm run setup -- --dry-run`, stdin `</dev/null`, `CLAUDE_CONFIG_DIR` = 4 scratch folders (none, same checkout in upper case with `/` and a trailing slash and a full `node.exe` path, elsewhere + dummy env token + local leftover, unparsable), plus `--replace-mcp` | exit 0 all five; add / leave / report / unparsable-skip / remove+add as decided; leftover and "env BRIDGE_TOKEN differs" reported | `S2a-verifier-dryrun.txt` |
| Second `npm run build` | all six bundles byte-identical (sha256), **every mtime changed** (F1) | `S2a-verifier-build.txt` |
| `clip.exe` once with a dummy string, then with empty input | copy exact (20 chars); after the empty copy `Get-Clipboard -Raw` length 0 (an empty text, formats String/UnicodeText remain) | `S2a-verifier-clip-and-spawn.txt` |
| `claude` here | native `claude.exe` (`Get-Command`: Application, `~\.local\bin`); `spawnSync('claude',['--version'])` with no shell → status 0, `2.1.314 (Claude Code)` | same |
| `.cmd` shim path | `run()` replicated against a fake `claude.cmd` in a folder with a space: argv arrives intact for paths with a space, `&`, parentheses; the exit status propagates; `%NAME%` in a path is expanded by cmd (F11) | same |
| Help text only | `claude mcp add --help`: `-s` default `local`; `claude mcp remove --help`: `-s` optional | (quoted in F5) |

Token scan: the main tree's `bridge.token` compared in memory (never printed) against this report and every
`S2a-verifier-*` file: 0 hits (§6). The user's `~/.claude.json` was never read or touched; no `claude mcp add/remove/
get/list` was run; Chrome and the extension untouched.

## 3. Exit checks and decisions

- **I2.2 (setup's share):** no path found by which the token reaches stdout/stderr, argv, a log, an error message or an
  exception text. Read line by line (`setup.mjs`): the token is only (1) written to `bridge.token`, (2) passed to
  `mcpDecision` which returns an enum (`"same"/"differs"`, test-pinned and mutation-checked), (3) written to `clip.exe`'s
  stdin. `spawnSync("clip.exe", {input})` (two-argument form) works (measured). No `-e BRIDGE_TOKEN`, no
  `Set-Clipboard -Value`. The JSON parse error is swallowed, not printed; fs errors name paths only. A new token is 32
  bytes from `randomBytes` as 64 hex characters (256 bits, ASCII) plus `\n`; `resolveToken` trims both the env and the
  file value (`sdk/src/token.ts:53,67`), so the newline is harmless; the clipboard gets `token.trim()`. The file is
  written only when missing or blank (test-pinned). No TTY → no copy, says so (dry run seen; the real non-TTY branch
  is read, not run).
- **I2.3 (setup's own failure lines):** Node/npm/git missing or old → a FAIL line with its fix, exit 1; `npm ci`/build
  failure → `FAIL: npm … failed (above)`, exit 1; Chrome missing → a hint. Prerequisite lines are unit-tested; the exit
  codes are read from the code, not run. See F2 for the failures that end in exit 0.
- **I2.1 achievability:** achievable as the builder reads it (content). A second run skips `npm ci` when
  `node_modules/.package-lock.json` is not older than `package-lock.json`, keeps the token, leaves the entry — and
  rewrites six bundles with identical bytes but new mtimes (F1).
- **#427:** Node `.mjs`, built-ins only in `setup.mjs` and `lib.mjs` (imports checked); names `setup`; `npm ci
  --no-audit --no-fund`; the lifecycle test exists and catches an added `postinstall` or `prepare`. Applied.
- **#428:** `clip.exe` on stdin, asks `[y/N]`, says so, waits for Enter, empties the clipboard (measured: it does),
  warns about Win+V history; no Options page opened; no history-excluded copy (not measured, so not used). Applied.
- **#429:** reads `<CLAUDE_CONFIG_DIR or ~>\.claude.json` read-only; `-s user` always; replace only with
  `--replace-mcp`; env token compared by equality. Applied; F6 notes two rare CLI file-name cases.
- **Node floor 20:** the dependencies' `engines` ask for `>=18` (vite 5.4.21, vitest 2.1.9, tsx 4.23.15, esbuild
  0.24.2, MCP SDK 1.29.0, jsdom 25.0.1); no Node-22-only API found in `shared/daemon/sdk/mcp/scripts`. 20 matches
  `docs/setup.md`. Not run under Node 20 (only v25.2.1 here).
- **Typecheck chain (g):** `scripts` is appended last, so an earlier package's error still hides it (the known `&&`
  gotcha), and a `scripts` error never hides another package's. `tsconfig.base.json` has `noEmit`, so `allowJs` writes
  nothing (worktree `git status` clean after it).

## 4. Findings

**F1 · MINOR · `scripts/bridge/setup.mjs:57` (`npmStep("Building", …)` always runs).** A second run rewrites
`daemon/dist/index.js`, `mcp/dist/index.js` and `extension/dist/{sw,content,offscreen,options}.js` with identical bytes
and new mtimes (`S2a-verifier-build.txt`: sha256 equal, 6 of 6 mtimes changed). No daemon handover follows (same
hash). But #432's doctor heuristic is mtime-based (`extension\dist\sw.js` newer than the last `extension resync`), so
after a second setup the doctor will say "the extension may be older than the build — reload it" for unchanged code.
And I2.1's "changes nothing" holds only under a content reading. Fix: either setup skips the build when every bundle
exists and is newer than every tracked source it is built from (or than `HEAD`'s commit time), or the session agent
records before S4 that I2.1 is judged by content (sha256 of `dist/`, the token file, the scratch config) and S2b's
heuristic is told about it. Pre-register the reading before S4 runs (§2 integrity floor).

**F2 · MINOR · `setup.mjs:77,68`.** Setup ends with exit 0 when the registration did not happen: `claude` exits
non-zero (line 77 prints "claude exited N: run it yourself", status stays 0), the config is unparsable (line 68), or
`claude` is missing. The missing-CLI case is #424/0.5's intent; the other two make I2.1's "exit 0" blind to a failed
`claude mcp add`. Fix: exit non-zero (e.g. 2) after a failed `claude` run or an unparsable config, keeping the next
steps; or S4 checks the scratch `.claude.json` content instead of relying on the exit code.

**F3 · MINOR · `setup.mjs` (no check of the shell's own `BRIDGE_TOKEN` / `BRIDGE_PORT`).** If the user's environment
sets `BRIDGE_TOKEN`, scripts and the MCP server (spawned by Claude Code with that environment) use it over
`bridge.token` (`sdk/src/token.ts:53-54`), while setup copies `bridge.token` to the clipboard: the extension then holds
the wrong token. Same shape as M6, one level up. `BRIDGE_PORT` ≠ 9234 makes step 4's "Port: 9234" wrong. Fix: compare
`process.env.BRIDGE_TOKEN` with the file by equality (the same enum) and say which wins; print the port from
`BRIDGE_PORT` when set.

**F4 · MINOR · `lib.mjs:85-95` vs `docs/setup.md` §4 step 6.** The next steps omit pinning the toolbar button, which
is the kill switch (and `Alt+Shift+K`), and the check "service worker console says `[bridge] connection: up`". The
rest matches §4: `chrome://extensions`, Developer mode, Load unpacked `<repo>\extension` (the folder holding
`manifest.json`), Options (Details → Extension options), port 9234, token, Save. Fix: add a step 6 "Pin the extension's
button (puzzle-piece menu): it is the kill switch; Alt+Shift+K also works."

**F5 · MINOR · `setup.mjs:100-103` (not measured; read).** If the user presses Ctrl+C at "press Enter to empty the
clipboard", nothing empties it: there is no `SIGINT` handler on `rl` and no exit hook. The token stays on the
clipboard (on top of the Win+V copy the message already admits). Fix: `rl.on("SIGINT", …)` / `process.on("exit")`
running the empty `clip.exe` when `copied`. Not run: it needs a TTY and a real secret on the clipboard.

**F6 · MINOR · `lib.mjs:47-49` vs the installed CLI.** The CLI's config file name is `.claude${suffix}.json`, the
suffix empty for prod but `-custom-oauth` / `-staging-oauth` / `-local-oauth` under some env settings, and it prefers a
legacy `<config home>\.config.json` when that file exists (`grep -a` of `claude.exe`, the functions holding
`.config.json` and `CLAUDE_CONFIG_DIR`; nothing run). On this machine `~\.claude\.config.json` does not exist. Rare;
setup would then decide from the wrong file (e.g. "add" when an entry exists, and `claude mcp add` then fails — F2).
Fix: a comment and, at most, a "legacy config found" hint; S4's read-only `claude mcp list` under the scratch
`CLAUDE_CONFIG_DIR` (#429) stays the isolation proof.

**F7 · MINOR · `scripts/test/s14-setup.test.ts:52-55,82-90` (test gaps).** Two mutations survive
(`S2a-verifier-mutations.txt`): dropping the `node(.exe)` command check in `mcpDecision` (an entry `{command:"npx",
args:[<this checkout>…]}` would read "leave"), and `nextSteps` naming `<repo>\extension\dist` (`toContain` matches the
prefix). Fix: one case with a non-node command → `report`; assert the line ends with `\extension` (regex `/\\extension$/m`).

**F8 · NIT · `setup.mjs:85-86`.** After `--replace-mcp` the new entry carries no env token, yet "The entry's env
BRIDGE_TOKEN differs … remove BRIDGE_TOKEN from the entry" still prints (dry run, last block). In the `report` case,
step 5 promises `browser_status` will say connected though the entry still points elsewhere.

**F9 · NIT · `LIFECYCLE_NAMES` test covers the root only.** `npm ci` also runs workspace packages' lifecycle scripts;
none exists today (`grep` of `*/package.json`: no `prepare`/`postinstall`). "update" is not an npm lifecycle name
(harmless). Fix optional: loop over the workspaces' `package.json` too.

**F10 · NIT · Node ≤ 16.** `node:readline/promises` is imported at load, so Node 16 crashes with an unknown-module
error before the friendly "install Node.js 20" line. Node 16 is out of support; a dynamic import would fix it.

**F11 · NIT · `setup.mjs:20-21` (`.cmd` route only).** Under `shell: true` cmd expands `%NAME%` in a quoted path
(measured with a fake shim: `C:\100%PATH%\…` arrived expanded), and Node ≥ 24 prints `DEP0190` once. Only an npm-
installed `claude.cmd` takes this route; the native `claude.exe` here does not. A repo path with `%` is unlikely.

## 5. Proposed decisions

### 2026-10-30 · I2.1 is judged by content, recorded before S4
**Decided:** "a second run changes nothing" means: `npm ci` not run, `bridge.token` byte-equal, the scratch
`.claude.json` byte-equal, every `dist/` bundle sha256-equal; mtimes are not part of it. **Why:** F1; the integrity
floor wants the reading fixed before the measurement. **Instead of:** making setup skip an unneeded build (also
acceptable; then mtimes count). **Revisit if:** the doctor's #432 heuristic flags a reload after a second setup in S4.
**By:** Claude (proposed)

## 6. Handoff

- S4 brief needs: F1's reading (or the fix), F2 (check the scratch config, not only the exit code), F3's shell-env
  check if fixed.
- Scratch worktree `s2a-verify` removed after its `@bridge/*` junctions were removed with `cmd /c rmdir` (§7). The
  scratch configs in `<v>` hold dummy content only. The clipboard holds an empty text (the dummy string is in Win+V
  history). No process left running.

## 7. Post-write checks

- Token scan (the main tree's `bridge.token` compared by equality in memory, never printed) of this report and the six
  `S2a-verifier-*.txt` files: **7 files, 0 token hits, 0 user-name or home-path hits**.
- Scratch worktree: its five `node_modules/@bridge/*` junctions removed with PowerShell `cmd /c rmdir` (0 left), then
  `git worktree remove --force`; the main tree's `node_modules/@bridge/sdk` and `.bin` still present afterwards.
