# Step 14 · S2a fixer, round 1 — F1, F2, F4, F5, F7

**Role:** fixer (S2a, round 1). **Model / effort:** Opus, medium. **Date:** 2026-10-30. **Lane:** `scripts/bridge/lib.mjs`,
`scripts/bridge/setup.mjs`, `scripts/test/s14-setup.test.ts`; nothing else edited. Evidence: `S2a-fixer1-*.txt` (this
dir; the home folder is written `~`). Findings: `S2a-verifier.md` §4. Decisions followed: the session agent's for this
round (in the brief). F3 not built (S2b's doctor); F6 unchanged.

## 1. What changed (65 lines added: lib +23, setup +17, tests +25)

- **F1 · build skip.** `lib.BUILD_OUTPUTS` (the six bundles), `lib.BUILD_INPUTS` (for each of shared, daemon, sdk, mcp,
  extension: `src/` walked whole, `package.json`, `tsconfig.json`, `build.mjs`; plus the root `package.json`,
  `package-lock.json`, `tsconfig.base.json` and `node_modules/.package-lock.json`, so a fresh `npm ci` forces a build).
  `lib.buildNeeded(outputMtimes, inputMtimes)` builds unless every output exists and is **strictly** newer than the
  newest input; no outputs, no inputs or a missing output → build. Setup walks the inputs (missing ones skipped) and
  says one line: either `Building: npm run build` or `Every build output is newer than its sources: npm run build
  skipped (dist/ untouched).`
- **F2 · failed parts end non-zero.** An unparsable config (`FAIL: cannot parse …`) and a `claude` run with a non-zero
  status (`FAIL: claude exited N: run it yourself: …`) are recorded; setup still prints the remaining steps, then
  `lib.finish(failed)` prints `Setup finished, but these parts failed (see above): …` and sets exit code 2. A missing
  `claude` CLI stays exit 0 (#424 / 0.5's intent; not in this round's decision).
- **F4 · pin step.** Next steps gain step 5, "Pin the extension's toolbar button (puzzle-piece menu > pin): it is the
  kill switch, and so is Alt+Shift+K." (`docs/setup.md` §4 step 6 in substance); `/mcp` moves to step 6. The clipboard
  prompt's "after pasting the token in step 4" is still right.
- **F5 · Ctrl+C / closed stdin at the Enter prompt.** When the token was copied, a once-only `empty()` (empty input to
  `clip.exe`) is hooked to `process.on("exit")`; `rl` `SIGINT` and an early `rl` `close` exit with 130, which runs it.
  The normal Enter path calls it before `rl.close()`, so it runs once.
- **F7 · test gaps.** A `{command: "npx", args: [<this checkout's entry>]}` entry → `report` (and a full
  `C:\Program Files\nodejs\NODE.EXE` path → `leave`); the load-unpacked line must end with `…\bridge\extension`
  (`/…\\extension$/m`).

## 2. Checks

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | exit 0 (the chain ends with `scripts`) | `S2a-fixer1-tsc.txt` |
| `npx vitest run` | **6055 passed, 253 files**, exit 0; `s14-setup.test.ts` 17 of 17 (was 13). Includes S1's in-flight file. | `S2a-fixer1-test.txt` |
| 6 mutations of `lib.mjs` | 5 caught (1 test red each): node check dropped, `extension\dist`, `>=`→`>`, finish code 0, pin step dropped. 1 survives: dropping the explicit missing-output check is an equivalent mutant (a `null` reads as 0 in `Math.min`, so the build still runs) | `S2a-fixer1-mutations.txt` |
| `npm run setup -- --dry-run` (stdin `/dev/null`, `CLAUDE_CONFIG_DIR` at scratch folders) | before `npm run build` (S1's `sdk/src` edit is newer): "would run: npm run build"; after a build: "npm run build skipped (dist/ untouched)", exit 0; unparsable scratch config: the FAIL line, all next steps, the closing line, **exit 2** | `S2a-fixer1-dryrun.txt` |

Not measured: the F5 path (needs a TTY and a copied secret) and a real failing `claude mcp add` (dry runs only by the
brief); both read from the code, and the exit-code rule is unit-tested through `finish`. `npm run build` was run once
in the main tree (dist bundles rebuilt from the current sources); the extension in Chrome was not reloaded or touched.

Token scan: `bridge.token` compared by equality in memory (never printed) against this report and every
`S2a-fixer1-*` file: 0 hits; no user name.

## 3. For the step agent

- I2.1 can now be read by mtimes too: a second run on an unchanged tree skips both `npm ci` and the build, so #432's
  mtime heuristic is not tripped by setup. A `git pull` that changes any source (git sets a new mtime) forces a build.
- S4's brief: a failed registration now shows as exit 2; checking the scratch `.claude.json` content stays the
  stronger proof.
- F8 (stale env-token hint after `--replace-mcp`) is untouched and still a NIT.

## Proposed decisions

### 2026-10-30 · A missing claude CLI stays exit 0; a failed claude run or unparsable config is exit 2
**Decided:** exit 2 only for a part that was attempted and failed; a missing CLI prints its install line and exits 0.
**Why:** #424 / Stage0 0.5 treat a missing CLI as a hint, and the brief's F2 decision names the two other cases only.
**Instead of:** exit 2 for a missing CLI too. **Revisit if:** S4 or the user wants every unregistered run flagged.
**By:** Claude (proposed)
