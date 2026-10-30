# Step 14 · S2a verifier 2 — re-check after fix round 1 (F1, F2, F4, F5, F7)

**Role:** verifier (S2a, after fix round 1; affected items only). **Model / effort:** Opus, medium. **Date:** 2026-10-30.
**Lane:** read and run; nothing in the main tree edited except this report and its evidence (one lane slip, §6).
Evidence: `S2a-verifier2-*.txt` (this dir; `<repo>` = the checkout, `<s>` = my scratch folder, `~` = the home folder,
`<user>` = the user name). Claims audited: `S2a-fixer1.md` (and `S2a-builder.md` for context). Read: the phase doc
(Outcome, § S2, § S4, exit checks I2.1–I2.3, STOP rules, forbidden fixes), decisions #427–#432, `S2a-verifier.md`,
`docs/setup.md` §4, the five workspaces' `package.json` and `build.mjs`, `tsconfig.base.json`, and every line of
`scripts/bridge/lib.mjs`, `scripts/bridge/setup.mjs`, `scripts/test/s14-setup.test.ts`.

## 1. Verdict

**PASS-with-notes.** F1, F2, F4, F5 and F7 are fixed as the fixer reports; nothing regressed; the token rules hold.
No CRITICAL or MAJOR finding; four NITs (§4). One lane slip of mine (§6): a real `claude mcp add` ran once against a
scratch `CLAUDE_CONFIG_DIR`; the user's `~/.claude.json` was not touched (mtime unchanged).

## 2. Outputs (re-derived)

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` (main tree) | exit 0; the chain ends with `tsc -p scripts/tsconfig.json` | `S2a-verifier2-typecheck.txt` |
| `npx vitest run` (main tree) | **6055 passed, 253 files**, exit 0; `scripts/test/s14-setup.test.ts` 17 tests. The only uncommitted test file is that one, so HEAD (`b2c45b7`, S1 committed) = **6038 / 252**; +17 / +1 matches. | `S2a-verifier2-test.txt` |
| 14 mutations of a copy of `lib.mjs` with the copied test | 13 caught (1 test red each), 1 survives: M13 (the explicit missing-output check dropped) is an equivalent mutant (`Math.min` reads `null` as 0, so the build still runs), as the fixer said | `S2a-verifier2-mutations.txt` |
| Copies of `setup.mjs` + `lib.mjs` run **non-dry** in a fake repo under `<s>` (dummy sources/outputs/token, fake `claude.cmd` shims, `CLAUDE_CONFIG_DIR=<s>/cfg`, stdin `/dev/null`), 8 runs | see F1, F2 below | `S2a-verifier2-fakerun.txt` |
| `CLAUDE_CONFIG_DIR=<s>/cfg-main npm run setup -- --dry-run </dev/null` (main tree) | exit 0; `npm ci` skipped, `npm run build skipped (dist/ untouched)`, token kept, `would run: claude mcp add -s user …`, steps 1–6; `<s>/cfg-main` still empty | `S2a-verifier2-dryrun.txt` |

## 3. The re-checked findings

- **F1 (build skip) — fixed.** `lib.mjs:47-60`, `setup.mjs:176-182`. What the build really reads (read, not assumed):
  root `build` = `npm run build --workspaces --if-present`; only `daemon`, `mcp`, `extension` have a build script, each
  `node build.mjs` → esbuild over `src/` (bundles `@bridge/*` workspace sources through `node_modules` junctions, plus
  `ws`/`zod`/the MCP SDK from `node_modules`; `ws` external), reading `package.json` and `tsconfig.json` (which extends
  `tsconfig.base.json`). No `define`, no git or env input, no import outside the five workspaces' `src/` (grep of every
  `from "…"`). The extension's `manifest.json`, `options.html`, `offscreen.html` are **not** copied by the build (Chrome
  loads them from `extension/` itself), so they are rightly not inputs. Every real input is in `BUILD_INPUTS`
  (`node_modules/.package-lock.json` stands for the installed dependencies; `npm ci` rewrites it). Measured in the fake
  repo: outputs newer → skipped; one source newer → `would run: npm run build`; one output deleted → build; a source
  file deleted (only its folder's mtime moves; `newest()` counts folder mtimes) → build. Every input entry is pinned
  (M5–M8, M14 red).
- **F2 (exit codes) — fixed.** Fake repo: `claude` shim exiting 1 → `FAIL: claude exited 1: run it yourself: …`, the
  next steps, `Setup finished, but these parts failed (see above): claude add.`, **exit 2** (runs 1 and 2); unparsable
  config → `FAIL: cannot parse …`, steps, closing line, **exit 2** (run 5); shim exiting 0 → `done.`, **exit 0** (run 3);
  no `claude` on PATH → `The claude CLI is not on PATH: install Claude Code …, then:` + the `run: claude mcp add …`
  line, **exit 0** (run 4). `finish` is pinned (M9 red).
  **The proposed decision (missing CLI → exit 0): agreed.** Phase doc 0.5 / #424 say only that the command "says what to
  add and where"; nothing was attempted, the exact command is printed, and the rehearsal (S4) runs where `claude` exists.
  See N2 for one wording note.
- **F4 (next steps vs `docs/setup.md` §4) — fixed.** Step 5 now matches §4 step 6 (pin, kill switch, `Alt+Shift+K`);
  test-pinned (M10 red). Steps 1–4 match §4 steps 1–5. The service-worker console check (`[bridge] connection: up`)
  is replaced by step 6's `browser_status` check, which proves more; acceptable.
- **F5 (clipboard on Ctrl+C / closed stdin) — fixed (read, not run).** `setup.mjs:227-237`: after a copy, `empty()` is
  once-only and hooked to `process.on("exit")`; `rl` `SIGINT` → `process.exit(130)`; `rl` `close` while not emptied →
  `process.exit(130)`; both run the exit hook, whose `spawnSync("clip.exe", {input: ""})` is synchronous and therefore
  allowed there. Enter → `empty()` then `rl.close()` → the close listener sees `emptied` and does nothing; the exit hook
  is a no-op. Between the copy (line 222) and the hooks (line 231) there is no `await`, so no keypress can be handled in
  that gap. Remaining gaps: N3.
- **F7 (pins discriminate) — fixed.** M1 (node-command check dropped) and M2 (`<repo>\extension\dist`) both turn one
  test red.

## 4. Exit checks

- **I2.1 (achievability):** a second run changes nothing. Fake repo, runs 1 → 2: the snapshot of every file's path and
  mtime, the token's sha256 and the scratch config folder's listing is identical before run 1 and after run 2 ("none"):
  `npm ci` skipped, build skipped, token kept. In the main tree the dry run says both skip. With a working `claude`, the
  second run reads the entry and says "already points at this checkout: left as it is" (run 3 vs run 1 shape; also seen
  with the real CLI in §6). The exit code of a run is 0 only when every attempted part worked (F2).
- **I2.2 (setup's output):** the token never reaches output. Paths unchanged since `S2a-verifier.md` §3 except the new
  `empty()` (empty input only). Scan in §7.
- **I2.3 (setup's own lines):** every failed part names its fix (`run it yourself: claude …`, `fix the file and run setup
  again`, the prerequisite fixes) and the closing line names the failed parts.

## 5. New findings (NIT only)

**N1 · NIT · `setup.mjs:176-182` (mtime rule's known limit).** A source restored with an *older* mtime than the
outputs (a copy that keeps timestamps, an archive extract) would skip the build. `git pull`/`checkout` write the current
time, so the documented paths are safe. No fix needed; a doc line in S5 at most ("`npm run build` forces it").

**N2 · NIT · `setup.mjs:207` + `lib.finish`.** With no `claude` CLI the install hint sits mid-output and the run ends
with exit 0 and no closing line, while step 6 says "In Claude Code run /mcp". A closing hint ("The MCP entry was not
registered: install Claude Code, then run the line above") would keep it visible. Not a failure (decision agreed, §3).

**N3 · NIT · `setup.mjs:221` (first prompt) and window close.** Ctrl+C at the `[y/N]` prompt (before any `SIGINT`
listener) makes readline close the interface, the pending `question` rejects, and the top-level `await` ends the run with
an error stack (exit 1). Nothing was copied, so no secret is at stake; only the message is rough. Closing the console
window at the Enter prompt may end the process without the exit hook (not measured); the Win+V note already covers that
the clipboard can keep a copy.

**N4 · NIT · exit 2.** Exit 2 also means "re-run once" for `recipes/reload-extension.ps1` (#65, #99). If S2b's `update`
runs setup's logic and the reload script, it should keep the two meanings apart in its own exit code and text.

## 6. Lane slip (mine)

My first fake-repo script put a `C:/…` path in a colon-separated bash `PATH`, which broke the entry, so setup's
`which("claude")` found the **real** `claude.exe` instead of the fake shim. Run 1 then executed the real
`claude mcp add -s user chrome-agent-bridge -- node <s>\fake\mcp\dist\index.js` with `CLAUDE_CONFIG_DIR=<s>/cfg`. The CLI
reported `File modified: <s>\cfg\.claude.json` (it also wrote `<s>\cfg\backups\…`). The user's `~/.claude.json` mtime
was 14:12:09 before and is 14:12:09 after (the run was at 14:18; checked by `stat` only, the file was not read), so the
isolation of #429 held and no STOP rule fired. The scratch config has since been deleted. Chrome and the extension were
not touched. The rerun guards every non-dry run with setup's own `which()` logic and stops unless it resolves to a fake
shim or to none (`S2a-verifier2-lane-slip.txt` is the slipped output; `S2a-verifier2-fakerun.txt` the guarded one).
Side fact from it: the real CLI accepts setup's argv and exits 0 under a scratch `CLAUDE_CONFIG_DIR`.

## 7. Post-write checks

- Token scan: the main tree's `bridge.token` (trimmed) compared by equality in memory, never printed, against this
  report, every `S2a-verifier2-*.txt`, and every other `S2a-*` file in this folder (builder, fixer 1, verifier 1):
  **26 files, 0 token hits.**
- User-name (login and full name) and home-path scan (`C:\`, `C:/` and `/c/` forms) over the same 26 files: **0 hits**.
- `git status`: only this report and six `S2a-verifier2-*.txt` added; no tracked file changed by me.
