# D1 verifier report — repository split (pure moves)

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), independent, 2026-10-22. Subject: the builder's D1 work,
uncommitted but fully staged on top of `818a884`. Method: worktree A = `818a884` (before); worktree
B = `818a884` + `git diff --cached --binary` from the main tree applied with `git apply --index` (all
renames applied); `npm ci` in both, so each is a clean tree. Both worktrees and the scratch branch
`scratch-d1-verify` were removed afterwards (`git worktree remove --force` + `rm -rf` of the leftover
`node_modules` directories, `git worktree prune`, `git branch -D`). `git worktree list` now shows only
the main tree. Nothing in the main tree was edited, staged or unstaged; this report is the only file
written there.

## Findings

1. **MINOR — `daemon/package.json` does not declare `@bridge/shared`.**
   Evidence: `grep -ln "@bridge/shared" daemon sdk mcp -r --include=*.ts` →
   `daemon/src/connection.ts`, `daemon/src/handshake.ts` (plus sdk and mcp files). `daemon/package.json`
   lists only `ws` (and `@types/ws`). The move map's B4 gives `daemon → shared, ws`. It works today
   only because the workspace link `node_modules/@bridge/shared` is hoisted. The old
   `server/package.json` had the same gap, so D1 did not introduce it.
   Fix: add `"@bridge/shared": "*"` to `daemon/package.json` `dependencies`. That is a manifest change,
   so it is in D1's lane. Or record it for D3, which rewrites the daemon's manifest anyway.

2. **NIT — `mcp/package.json` drops `ws`, but the MCP bundle still imports `ws` at runtime.**
   Evidence: `mcp/dist/index.js:21461: import { WebSocketServer } from "ws";` (external, from
   `@bridge/daemon/wsHost`). `ws` resolves through the interim `@bridge/daemon` dependency, which is
   hoisted. That is correct while the dependency exists. D5 removes `@bridge/daemon`, and the bundle's
   `ws` then comes from `@bridge/sdk`, which declares it. No action is needed in D1. This is a reminder
   for D5.

3. **NIT — `daemon/build.mjs` is a stale copy of the server build.**
   Evidence: `daemon/build.mjs:4 entryPoints: ["src/index.ts"]` (that file does not exist) and
   `:13 console.error("built server → dist/index.js")`. `daemon/package.json` has no `scripts.build`, so
   nothing runs it, which matches the ruling "no entry and no build until D3". Its `bin` points to a
   `dist/index.js` that does not exist yet. `npm ci` linked no `chrome-bridge-daemon` bin and gave no
   warning. Fix: D3 updates the log string when it adds the entry.

4. **NIT — git pairs the old `server/package.json` with `mcp/package.json`, not `daemon/package.json`.**
   Evidence: `git diff --cached -M --summary` → `rename {server => mcp}/package.json (55%)`,
   `create mode 100644 daemon/package.json`. The move map renames it to `daemon/package.json`. This is
   cosmetic: it only affects `--follow` on a manifest. The content is correct for both packages.

5. **NIT — where the 635 insertions come from. There is no line-ending churn.**
   Evidence: `package-lock.json` accounts for 557 of the `+` lines:
   - `node_modules/tsx`, its nested `esbuild@0.28.2` and 25 `@esbuild/*` platform entries;
   - a hoisted `node_modules/@esbuild/openharmony-arm64@0.28.2` (an optional dependency of tsx's esbuild);
   - the `daemon`, `sdk` and `mcp` workspace entries;
   - 6 `"peer": true` annotations added by npm 11.

   Only 12 lines are removed, all of them the `server` / `@bridge/server` entries. The root `esbuild`
   stays at `0.24.2`.

   Line endings: `git ls-files --eol` → all 134 tracked files are `i/lf`. The R100 renames show 0 changed
   lines, and the edited files carry only their intended hunks.

6. **NIT — remaining `server/` path text outside D1.3's grep.**
   Evidence: `git grep -n "server/dist"` (excluding plans, specs and decisions) lists:
   - `docs/e2e-test-plan.md:19,23,88,380,537` (the builder listed these, scheduled for D5.5);
   - `mcp/src/index.ts:35` (a runtime message string, scheduled for D5);
   - `docs/progress-and-roadmap.md:168`, which the builder did not list. It is a historical
     "Quality state" line ("256 unit tests…"), and `docs/progress-and-roadmap.md` is a D7 item.

   `CLAUDE.md:30,48,61,70,94` still name `server/src` / `server/`, which D7.1's grep covers.
   Fix: none in D1. Tell D7 about `progress-and-roadmap.md:168`.

No CRITICAL or MAJOR findings.

## Diff audit (every non-R100 hunk)

`git diff --cached -M --stat`: 30 files, 21 R, 5 A, 4 M. The builder's claim is confirmed. Every R is
100 % except four:

- `mcp/src/index.ts` (94 %): the three import specifiers `./bridge.js|./wsHost.js|./startup.js` →
  `@bridge/daemon/{bridge,wsHost,startup}`, nothing else.
- `mcp/src/tools/registry.ts` (99 %): `../bridge.js` → `@bridge/daemon/bridge` (type import) and
  `../download.js` → `@bridge/sdk/download`.
- `mcp/test/tools.test.ts` (99 %): line 1, `../src/bridge.js` → `@bridge/daemon/bridge`. Line 235: the
  dynamic import `../src/connection.js` → `@bridge/daemon/connection`, which is why
  `daemon/package.json` exports `./connection`. The `.ExtensionConnection(() => {})` call and the
  expected strings are unchanged.
- `mcp/package.json` (55 %): name, bin and dependencies only. `scripts.build` (`node build.mjs`), the MCP
  SDK and zod are kept.

The added files are the manifests and tsconfigs, plus `mcp/build.mjs`, a copy of the server build with
`external: ["bufferutil","utf-8-validate","ws"]` and a new log string. The modified files are:

- `package.json`: 5 workspaces, typecheck across 5 tsconfigs, build `--workspaces --if-present`, `tsx ^4.23.15`;
- `docs/setup.md`: lines 18, 36, 46 and 262;
- `start-bridge.sh`: `$bridge_dir/server/dist/index.js` → `mcp/dist/index.js`;
- the lockfile.

Logic changes: none.

Other checks:

- **`lifecycle.ts`:** `git diff 818a884:server/src/lifecycle.ts :mcp/src/lifecycle.ts` → empty. Blob
  `041690eb…` on both sides.
- **No artifacts or secrets staged:** `git diff --cached --name-only | grep -E "dist/|bridge.token|\.env"`
  → nothing.
- **Main tree state:**
  - `ls server` → no such directory;
  - `daemon/` has no `dist/`;
  - `node_modules/@bridge/` holds `daemon`, `extension`, `mcp`, `sdk` and `shared`, with no stale
    `server` link;
  - `node_modules/.bin` has only `chrome-bridge-mcp*`.
- **Lockfile:** the hand edit is consistent. `npm ci` in worktree B exits 0, and
  `npm install --package-lock-only` in worktree B leaves `package-lock.json` byte-identical (`cmp` → equal).
- **Root `build`:** `npm run build --workspaces --if-present` is a fair reading of "build covers all":
  - it runs `@bridge/mcp`, then `@bridge/extension`, and skips the script-less shared, daemon and sdk;
  - D3 picks up daemon automatically once it adds a script;
  - it fails loudly. With `mcp/build.mjs` replaced by a throw (scratch only, restored afterwards),
    `npm run build` exits **1** with `npm error workspace @bridge/mcp@0.1.0`. It still builds the
    extension afterwards.
- **Test collection:** `vitest.config.ts` include `**/test/**/*.test.ts` picks up every package.
  Tests do not bind 9234: every `9234` in `*/test/*` is a string, a mock value or a `hostState` literal.
  `startup.test.ts` mocks the bind.
- **Bundle equivalence:** `diff wtA/server/dist/index.js wtB/mcp/dist/index.js` → 14 changed lines, all
  esbuild path comments (`// src/bridge.ts` → `// ../daemon/src/bridge.ts`, ×7 pairs for bridge, wsHost
  ×2, connection, handshake, startup and download). Sizes are 767,619 → 767,686 bytes, a difference of
  67 bytes, which equals the added `../daemon/` and `../sdk/` path prefixes. Both bundles have exactly
  one `import { WebSocketServer } from "ws";` at line 21461, so `ws` stays external.
  `diff -r` of `extension/dist` between A and B → identical.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| D1.1 test count unchanged; typecheck and build green from a clean tree | **PASS** | A (`818a884`, `npm ci`): `npm test` → 25 files / **322** passed, exit 0; typecheck 0; build 0. B (after, `npm ci`): `npm test` → 25 files / **322** passed, exit 0; `npm run typecheck` exit 0 (all 5 tsconfigs); `npm run build` exit 0 (mcp + extension) |
| D1.2 `--follow` keeps the pre-move history | **PASS** | Scratch commit `3c8d672` in B. `git log --follow --oneline -- daemon/src/wsHost.ts` → 3c8d672, d9a0ba0, 0a41a16, 57598ff, which equals `git log --oneline 818a884 -- server/src/wsHost.ts` (d9a0ba0, 0a41a16, 57598ff) plus the move. `mcp/src/lifecycle.ts` → 3c8d672, af2835d (= before). `sdk/src/download.ts` → 3c8d672, eec05a0 (= before). `mcp/src/index.ts` and `registry.ts` also follow |
| D1.3 `grep -rn "server/dist" docs/setup.md README.md CLAUDE.md` returns nothing | **PASS** | no output, grep exit 1 |
| D1.4 `ls server` fails; root `package.json` lists five workspaces | **PASS** | `ls: cannot access 'server'`, exit 2. Staged `package.json`: `"workspaces": ["shared", "daemon", "sdk", "mcp", "extension"]` |
| D1.5 `git diff --stat 818a884 -- extension/` is empty | **PASS** | Empty for the staged index (`--cached`), the working tree, and `818a884`→worktree |

## Counts

| | Command | Result |
|---|---|---|
| Before (`818a884`, worktree A) | `npm test` | 25 files, 322 tests |
| Before, server only | `npx vitest run server/` | 86 |
| After (worktree B) | `npm test` | 25 files, 322 tests |
| After, per package | `npx vitest run <pkg>/` | daemon 30, mcp 44, sdk 12, shared 25, extension 211 (= 322; 30 + 44 + 12 = 86 = the old `server/`) |

The task's expected figure of 322 tests matched the "before" count I derived myself. The move map's 301
and its shared count of 4 are pre-D0 figures: D0 added 21 tests to shared.

## Verdict

**PASS-with-notes.** All five exit checks pass. The diff contains only moves, manifests, configs, import
specifiers and doc paths. `lifecycle.ts` is byte-identical, `ws` stays external, the MCP bundle matches
the old server bundle apart from path comments, and `extension/` is untouched. I found one MINOR issue
(finding 1, the undeclared `@bridge/shared` dependency in daemon) and five NITs. Worktrees A and B and
the scratch branch are removed.
