# Step 14 · S2a builder — `npm run setup` and the shared logic

**Role:** builder (S2a). **Model / effort:** Opus, medium. **Date:** 2026-10-30. **Lane:** `scripts/bridge/`,
`scripts/test/`, `scripts/tsconfig.json`, root `package.json` `scripts`. Evidence: `S2a-builder-*.txt` (this dir;
the checkout path is replaced by `<repo>`).

## 1. Verdict

**DONE.**

## 2. Outputs

| File | Lines | What |
|---|---|---|
| `scripts/bridge/lib.mjs` | 96 | Pure, `// @ts-check` + JSDoc, Node built-ins only: `checkPrereqs`, `tokenDecision`, `installNeeded`, `claudeConfigPath`, `entryPath`, `mcpDecision`, `mcpAddArgv`, `MCP_REMOVE_ARGV`, `nextSteps`, `LIFECYCLE_NAMES`, `SERVER_NAME`, `PORT`, `MIN_NODE_MAJOR`. S2b reuses it. |
| `scripts/bridge/setup.mjs` | 103 | Thin I/O entry, built-ins only (runs before `npm ci`). Flags: `--dry-run`, `--replace-mcp`. |
| `scripts/test/s14-setup.test.ts` | 100 | 13 tests (picked up by the root `**/test/**/*.test.ts`). |
| `scripts/tsconfig.json` | 5 | `allowJs` + `checkJs` over `bridge/*.mjs` and `test/*.ts`. |
| `package.json` | 2 changed | `"setup": "node scripts/bridge/setup.mjs"`; `typecheck` gains `&& tsc -p scripts/tsconfig.json` at the end. |

Size: **299 new lines of code + tests** (`wc -l`), cap 300; plus 5 config lines and 2 changed script lines.

Results (counts from the commands; S1's in-flight files were in the tree for both runs):
- Red first: `npx vitest run scripts/test/s14-setup.test.ts` before `lib.mjs` existed → `Test Files 1 failed`, "no tests"
  (`S2a-builder-red.txt`). Then 13 of 13 pass.
- `npx vitest run`: **6036 passed, 252 files → 6049 passed, 253 files**, exit 0 (`S2a-builder-test-before.txt`,
  `S2a-builder-test-after.txt`). +13 = this file.
- `npm run typecheck`: exit 0, now including `tsc -p scripts/tsconfig.json` (`S2a-builder-typecheck.txt`).
- `npm run build`: exit 0 (`S2a-builder-build.txt`).
- `npm run setup -- --dry-run` with `CLAUDE_CONFIG_DIR` pointed at two scratch folders and stdin not a TTY
  (`S2a-builder-dryrun.txt`): exit 0 both. A (empty config): prerequisites OK, `npm ci` skipped (tree current), "would
  run: npm run build", token kept (not shown), "would run: claude mcp add -s user chrome-agent-bridge -- node
  <repo>\mcp\dist\index.js", next steps. B (an entry elsewhere with a dummy env token, a local-scope leftover): reports
  the other path and the `--replace-mcp` flag, the leftover with its remove command, "env BRIDGE_TOKEN differs".
  The user's `~/.claude.json` was never read; the dry run writes nothing and spawns only `npm --version`, `git --version`.
- Token scan: the real `bridge.token` value compared (in memory, never printed) against every `S2a-builder-*` file and
  the five changed files: **0 hits in 11 files**. User-name scan of the evidence: 0 after the path scrub.

How setup behaves:
1. Prerequisites: Node ≥ 20, npm, git are fails with a fix line (exit 1); Chrome (three standard install folders,
   `existsSync` only, `chrome.exe` is never run) is a hint.
2. `npm ci --no-audit --no-fund` only when `node_modules/.package-lock.json` is missing or older than
   `package-lock.json`; then `npm run build`. npm is run as `node <npm_execpath>` under `npm run` (no `.cmd` shim, no
   shell); otherwise through `npm` on PATH.
3. Token: kept if `bridge.token` is non-blank, else 32 random bytes as hex written to `bridge.token` only. Never printed.
4. MCP: reads `<CLAUDE_CONFIG_DIR or ~>\.claude.json` read-only (unparsable → skip registration and say so); add /
   leave / report / replace (`--replace-mcp`: `claude mcp remove -s user …` then add); local-scope leftovers and the
   entry's `env.BRIDGE_TOKEN` (same / differs, by equality) reported. `claude` missing from PATH → prints the exact
   command to run after installing Claude Code; setup still exits 0.
5. Clipboard: only with a TTY and not in a dry run; asks `[y/N]`; `clip.exe` with the token on stdin; prints the next
   steps; waits for Enter; then `clip.exe` with empty input. No TTY → says it was not copied and how to copy it later.
6. Next steps: `chrome://extensions`, Developer mode, Load unpacked `<repo>\extension`, Options, port 9234, where the
   token comes from, `/mcp`.

## 4. Deviations

- None from the brief. One judgement under its "idempotent": a second run skips `npm ci` (tree current), keeps the
  token and leaves the MCP entry; it **does re-run `npm run build`**, which rewrites `dist/` with byte-identical output
  (Stage0.md: same-commit bundles are identical, so no daemon handover). S4 should state I2.1 against that reading.

## 5. Proposed decisions

### 2026-10-30 · The setup's Node floor is 20, set in `lib.mjs`
**Decided:** `MIN_NODE_MAJOR = 20` from `docs/setup.md` Prerequisites; no `engines` field added. **Why:** no package
declares `engines`; my lane is `scripts` entries only. **Instead of:** an `engines` field (a package.json change outside
the lane). **Revisit if:** a dependency needs more. **By:** Claude (proposed)

### 2026-10-30 · Setup is idempotent by skipping `npm ci` when npm's hidden lockfile is current
**Decided:** as §2 step 2; the build always runs. **Why:** `npm ci` deletes and reinstalls `node_modules` every time;
the hidden lockfile is npm's own record of the installed tree. **Instead of:** always `npm ci`, or a `--reinstall`
flag. **Revisit if:** S4 finds a second run touching `node_modules`. **By:** Claude (proposed)

### 2026-10-30 · The `.mjs` scripts are typechecked by `scripts/tsconfig.json`, chained last in `npm run typecheck`
**Decided:** `allowJs` + `checkJs` + `// @ts-check`, extending `tsconfig.base.json`; `doc-check.mjs` stays out.
**Why:** the setup must stay plain Node, yet a token-handling script deserves a typecheck. **Instead of:** no typecheck.
**By:** Claude (proposed)

## 6. Findings

- **Not measured (for S4):** that `clip.exe` with empty stdin empties the clipboard; I did not touch this machine's
  clipboard. A history-excluded copy was not measured, so it is not used (#428); setup tells the user Win+V may keep a
  copy. The `.cmd`-shim path of `claude` (npm-installed Claude Code; spawned through a shell with quoted argv) is not
  exercised here, where `claude` is an `.exe`.
- The real `claude mcp add`, `npm ci`, the token write and the clipboard were not run (brief).

## 7. Handoff

- No process left running. Scratch configs `cfgA`, `cfgB` (dummy content) in the session scratchpad.
- S2b: import from `scripts/bridge/lib.mjs` (`claudeConfigPath`, `mcpDecision` with its `envToken`, `entryPath`,
  `checkPrereqs`); add `"doctor"` and `"bridge-update"` to root scripts (the lifecycle test covers them).
- S4: run `npm run setup -- --dry-run` first, then the real run with `CLAUDE_CONFIG_DIR` set to a scratch folder and no
  TTY (stdin `</dev/null`), then a second run to check I2.1.
