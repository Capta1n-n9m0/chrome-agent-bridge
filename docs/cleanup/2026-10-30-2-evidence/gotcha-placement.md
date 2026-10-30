# Gotcha placement: cleanup pass 2026-10-30-2

Scope: `git diff dffb405..HEAD`, root `CLAUDE.md`, every package `CLAUDE.md`. Read only. Word counts (`wc -w`) against the budgets in `scripts/doc-check.mjs`: root 2230/3000, daemon 1923, sdk 1679, mcp 1172, shared 155, recipes 3144, **extension 3493/3500**, `src/` files 497 to 1071 of 1200. doc-check reports nothing over budget.

## Findings

1. **`scripts/` has no Key files entry anywhere (mechanical-ish; a new file is needs-the-user).**
   Location: root `CLAUDE.md` "Where the code is" (lines ~84-95) and every package file.
   What is wrong: the tree gained `scripts/bridge/{setup.mjs,lib.mjs,update.mjs,doctor.ts}`, `scripts/test/s14-*.test.ts`, `scripts/tsconfig.json`, `examples/list-tabs.ts`. "Where the code is" lists shared, daemon, sdk, mcp, extension, recipes only. An agent editing `lib.mjs` reads no `CLAUDE.md` that loads for it. Only the Commands block (lines 115-117, 123) names the files, in one-line run-on comments. `scripts/doc-check.mjs` is also unlisted (older gap).
   Evidence: `grep scripts/bridge **/CLAUDE.md` hits only root lines 18, 22, 115-116. `scripts/` is in doc-check's `PKG_DIRS`.
   Fix: add a `scripts/CLAUDE.md` (about 300 words: Key files, the gotchas of findings 2 and 4) and one bullet in "Where the code is" (`scripts/`, `examples/`). Needs the user (new `CLAUDE.md` file, a rule-set change).

2. **The lifecycle-name rule lives only in a plan's steps dir.**
   Location: `scripts/bridge/lib.mjs` (`LIFECYCLE_NAMES`, line 10) vs no `CLAUDE.md`.
   What is wrong: a binding fact ("no root npm script may be named like a lifecycle hook; `npm ci` would run it") and its companion ("the install entry runs before `npm ci`: plain `.mjs`, Node built-ins only, no tsx, no deps") are recorded only in `docs/plans/2026-10-30-step14-phase-g-own-devices-steps/Stage0.md` (C1, section 0.3) and in a code comment. An agent adding a root script (a new `npm run x` in root `package.json`) reads nothing about it.
   Evidence: `grep -i lifecycle CLAUDE.md */CLAUDE.md` finds only unrelated daemon/mcp/testing-philosophy hits. Stage0.md:41 "no npm script may be named `install`, `preinstall`, ...".
   Fix: put both facts in the new `scripts/CLAUDE.md`, plus a one-line pointer in root Commands. Needs the user (adds a rule; a gotcha placement per #232).

3. **sdk/CLAUDE.md does not mention the new `homeAsTilde` / `ReportInput.home` behaviour.**
   Location: `sdk/CLAUDE.md` lines 62-66 (the failure report bullet) and Key files line 19 / 30 for `error.ts`.
   What is wrong: `sdk/src/error.ts` now prints `Screenshot: ~\...` through `homeAsTilde(p, home)` where `home` is the injected `opts.homedir()`. Facts an editor must know: display only (`error.screenshotPath` stays absolute), a throwing `homedir` is swallowed, a Windows home matches case-insensitively with ASCII-only folding (U+0130 would shift the slice), a path not strictly inside home is unchanged. Only comments in code carry it.
   Evidence: `grep '~\|homeAsTilde' sdk/CLAUDE.md mcp/CLAUDE.md` finds only the unrelated line 71 (`~/.chrome-agent-bridge/failures/`). Code comment: "Fold ASCII A-Z only: `toLowerCase()` would turn U+0130 into two code units".
   Fix: add 2 lines to the failure report bullet in `sdk/CLAUDE.md` (display-only `~`, ASCII fold, test file `sdk/test/s14-home-path.test.ts`). Mechanical. Also check whether the MCP's failure report text (`mcp/CLAUDE.md` line 57 area) should carry a pointer: it does not now, and the plan's item was the MCP failure report's screenshot path; verify whether the MCP renders through `renderReport` (then a pointer is enough).

4. **Install-rehearsal gotcha sits in `recipes/CLAUDE.md`, but binds `scripts/bridge/`.**
   Location: `recipes/CLAUDE.md` lines 202-207 ("Rehearsing an install").
   What is wrong: the bullet is about `claude mcp get/list` starting the MCP, `CLAUDE_CONFIG_DIR`, hashing only `mcpServers`, and `update.mjs --no-reload` with `reload-extension.ps1` exit 2 from a scratch clone. Three of the four facts bind `setup.mjs` and `update.mjs`; the `reload-extension.ps1` fact binds `recipes/`. An agent editing `setup.mjs` (which calls `claude mcp add`/`get`) does not load `recipes/CLAUDE.md`.
   Evidence: "`claude mcp get` and `claude mcp list` health-check each server, so they start `mcp/dist/index.js`; decide from the config file instead."
   Fix: move the `claude mcp`/`CLAUDE_CONFIG_DIR`/`~/.claude.json` facts to `scripts/CLAUDE.md` and leave a pointer plus the `reload-extension.ps1` exit-2 fact in `recipes/CLAUDE.md`. Needs the user (moves rules between files).

5. **"9 reds in a fresh clone" is stated only in recipes/CLAUDE.md, while root Commands states a clean count.**
   Location: root `CLAUDE.md` line 112 vs `recipes/CLAUDE.md` lines 168 and 207.
   What is wrong: line 207 repeats line 168 (CRLF `.ps1` checkouts, 9 failing tests of `s11-r16-runner.test.ts`), a near-duplicate inside one file: Step 14 added a second statement of the same fact. Root says "6089 passed, 255 files" with no note that a fresh Windows clone shows 9 failures; a new-device installer (the phase's whole purpose) will see them.
   Evidence: recipes/CLAUDE.md:168 "9 tests of `recipes/test/s11-r16-runner.test.ts` fail"; :207 "A fresh clone's `npm test` has 9 reds in `recipes/test/s11-r16-runner.test.ts`".
   Fix: delete the second sentence at :206-207 (point to the first bullet); add "on a fresh Windows clone 9 recipes tests fail (CRLF, recipes/CLAUDE.md)" to the root test-count line or `docs/setup.md`. Mechanical for the duplicate; the root wording is a rule edit (needs the user).

6. **Root cross-package gotcha about the typecheck chain omits `scripts/`.**
   Location: root `CLAUDE.md` Gotchas, "`npm run typecheck` chains the projects with `&&`".
   What is wrong: the chain now ends with `tsc -p scripts/tsconfig.json`; the recipes typecheck list in Commands (eight configs) is unchanged and `scripts/tsconfig.json` (`allowJs`, `checkJs` on `bridge/*.mjs`) has no note. The text says "per package `tsc -p <pkg>/tsconfig.json`", which still works for `scripts`.
   Evidence: Commands line 113 does list `scripts`; the gotcha bullet does not.
   Fix: none needed beyond the new `scripts/CLAUDE.md` mentioning `checkJs`. Low.

7. **Root Commands lines are too long and carry package facts.**
   Location: root `CLAUDE.md` lines 115-117 and 123.
   What is wrong: `npm run setup/doctor/bridge-update` comments run 200+ characters and restate behaviour (exit 0/1/2, `--dry-run`, "never spawns or hands over a daemon", "heuristic (#432)") that belongs with the code (`scripts/bridge/`). Line 123 is one sentence of about 120 words mixing token lookup, reload, new-device and examples pointers. Root total is within budget (2230/3000).
   Fix: shorten each to one clause and a pointer to `scripts/CLAUDE.md` once it exists. Needs the user (CLAUDE.md rewrite).

8. **extension/CLAUDE.md is 7 words under budget.**
   Location: `extension/CLAUDE.md` (3493/3500). Step 14's edit shortened it, but the file has no headroom; the next measured fact trips doc-check.
   Fix: none now; a future addition must move text to `extension/src/*/CLAUDE.md`. `recipes/CLAUDE.md` is also close (3144/3500).

9. **`examples/list-tabs.ts` and its `file:` dependency have no gotcha home.**
   Location: `sdk/CLAUDE.md` (token lookup, line 25 `token.ts`).
   What is wrong: the example imports `@bridge/sdk` through a `file:` dependency and relies on the SDK's repo-root `bridge.token` lookup (the file says "never reads or prints it"). A change to `resolveToken` or the package name would break scripts outside the repo, and `sdk/CLAUDE.md` does not name that consumer. Only `docs/setup.md` and the plan do.
   Evidence: `sdk/CLAUDE.md:25` lists `token.ts` with no mention of out-of-repo scripts; `examples/list-tabs.ts:13` `import ... from "@bridge/sdk"`.
   Fix: one line in `sdk/CLAUDE.md` Key files (consumer: `examples/list-tabs.ts`, #430) and in `scripts/CLAUDE.md`. Mechanical for the sdk line.

## Checked, no finding
- `extension/CLAUDE.md` diff (the DevTools measured line) sits with `withDebugger`/`describeDebuggerError`; correct home, no duplicate.
- No history notes or duplicate gotchas flagged by doc-check; its other output (the `docs/install.md` plan paths, the stale root test count line 112, 6089 vs the last `npm test`) belongs to the State and Plan drift areas.
- No local path or user name found in the changed `CLAUDE.md` files.
