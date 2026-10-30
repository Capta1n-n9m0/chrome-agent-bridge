# S5 verifier report (Step 14, docs)

Model: Opus, medium effort. Role: verifier (`docs/agent-rules.md` §6). Read and run only; no edit to the main tree.

## 1. Verdict

**PASS-with-notes.** D5.1 holds: following only "Install on a new device" on a new clone, every command the section
gives ran and ended as the section says; the Chrome steps' text agrees with setup's printed steps, the manual §4 and the
Options page; `node scripts/doc-check.mjs` exits 0. Findings: 4 MINOR, 6 NIT; no CRITICAL or MAJOR.

## 2. Outputs

- The walk (Windows PowerShell 5.1.26100; a new clone of `<repo>` at HEAD `625e315` in `<scratch>\s5\clone`;
  `CLAUDE_CONFIG_DIR=<scratch>\s5\claude-config`, new and empty, asserted before every step; `BRIDGE_TOKEN` and
  `BRIDGE_PORT` unset; no TTY). Evidence: `S5-verifier-walk.txt`.

| Step | Command | Result |
|---|---|---|
| 0 | `claude mcp list` (scratch config) | exit 0, "No MCP servers configured." (isolation) |
| 1 | `npm run setup -- --dry-run` | exit 0; "would run" lines for npm ci, build, token, `claude mcp add -s user …`; the 6 next steps |
| 2 | `npm run setup` | exit 0; npm ci, build, "Created bridge.token (random, 256 bits; not shown)", "Added stdio MCP server … to user config" (file modified: the scratch config only), "No terminal to ask in: the token was not copied", the 6 next steps |
| 3 | `npm run setup` again | exit 0; every step skipped ("npm ci skipped", "build skipped", "kept", "already points at this checkout: left as it is") |
| 4 | scratch config read by node (not `claude mcp list`, which would start the clone's MCP) | one entry, `chrome-agent-bridge`, `node <scratch>\s5\clone\mcp\dist\index.js`, `env: {}` |
| 5 | `npm run doctor` | exit 1: OK Node.js, Build, Token file, MCP entry; **FAIL Daemon: running, but it refused the token** (the user's daemon refusing the clone's own token, as briefed); HINT Extension: not checked |
| 6 | `npm run bridge-update -- --no-reload` | exit 0; "Already up to date." (twice), npm ci and build skipped, the `--no-reload` hint, the `/mcp` line |
| 7 | `npm run doctor` again | exit 1, same lines as step 5 |

- Token scan: 11 raw captures and the scratch config, 0 contain the clone's token (compared by value in node; never
  printed).
- `npm test` in the clone (not a gate for a docs stage; for the count): **6080 passed, 9 failed (6089) in 255 files**; all
  9 in `recipes/test/s11-r16-runner.test.ts`, the known CRLF-checkout reds (Stage0 m2, S1-verifier). So 6089 tests / 255
  files is the count for the CLAUDE.md update.
- `node scripts/doc-check.mjs`: exit 0 (`S5-verifier-doccheck.txt`): one planned path (`docs/install.md`, phase doc
  line 109, the alternative not taken); counts 25 tools, 28 router methods, 27 codes; the test-count notice at
  `CLAUDE.md:113` (6030, now 6089).
- Chrome steps (not performed, G14-2), compared by text: section steps 2–4, setup's `nextSteps` (`scripts/bridge/lib.mjs`),
  manual §4 (`docs/setup.md:206`), `extension/options.html:19-21` (labels **Port**, **Token**, **Save**), `extension/manifest.json`
  (`options_page`, name "Chrome Agent Bridge", `minimum_chrome_version` 116, `Alt+Shift+K`). All agree. Step 5's
  `browser_status` claim matches `mcp/src/tools/registry.ts:401,408` ("Daemon: connected on …", "Extension: connected").
- Every command, flag, exit code and quoted line in the section checked against `scripts/bridge/{setup,update}.mjs`,
  `lib.mjs`, `doctor.ts`: the question text, `--dry-run`, `--replace-mcp`, `--no-reload`, exits 0/1/2 for setup and 0/1 for
  update, the doctor's part names, `No part failed.`, "Extension: not checked", "resynced after the last build", the
  reload retry once then the by-hand hint. All match (exceptions below).
- The moved manual install: the diff only demotes headings (`##`→`###`, `###`→`####`) and adds one line about
  `start-bridge.sh` (true: its header TODO says it is macOS-only for one machine). Nothing removed.
- Cross-references: every `](#…)` in `docs/setup.md` (47) and every `setup.md#…` in `README.md` resolves (slug check by
  node). The "§1–§4" references elsewhere (`CLAUDE.md:121`, `docs/e2e-test-plan.md:36`, `docs/progress-and-roadmap.md:549`,
  `docs/plans/next-session-prompt.md:36`, setup.md's own "(§4)" at lines 168 and 1563) still point right, because the
  numbers are kept and `docs/setup.md:89` says so.
- README status vs root `CLAUDE.md` Current state: Step 13 closed 2026-10-30 (#420), not pushed; Run 20 24/4/1/3/2: equal.
- No local path or user name in the diff (grep of the three files: the two hits are old lines outside the diff,
  `docs/setup.md:693` a generic example and `docs/e2e-test-plan.md:2671` an old run record).

## 3. Findings

**F1 MINOR — the first command may meet PowerShell's execution policy.** `docs/setup.md:83` ("Use PowerShell") and
`README.md` Quick start. On a fresh Windows 11 the default policy is Restricted and the official Node.js installer puts an
`npm.ps1` shim on PATH, so `npm run setup` in PowerShell can fail with "npm.ps1 cannot be loaded because running scripts
is disabled" (external fact, one search:
[inventivehq KB](https://inventivehq.com/knowledge-base/microsoft/powershell-running-scripts-is-disabled-on-this-system-fix)).
Not measured: this machine has nvm's `npm.exe` and `CurrentUser = RemoteSigned` (`Get-Command npm -All`,
`Get-ExecutionPolicy -List`; Stage0.md 0.3 marked the MSI case not measured). A reader would stall on line one.
Fix: one line, e.g. "If PowerShell says running scripts is disabled, type `npm.cmd run setup` (and `npm.cmd` for the
other commands), or run them from Command Prompt." U.1 will tell.

**F2 MINOR — a scripts-only reader gets a FAIL forever.** The section says Claude Code is optional (`docs/setup.md:83`),
but without it the doctor prints `FAIL MCP entry: no user-scope chrome-agent-bridge entry - run npm run setup` and exits
1 (`lib.mjs` `doctorLines`), and the README says "every line should say OK". Fix: one sentence in step 6: without Claude
Code, the MCP entry line fails and can be ignored.

**F3 MINOR — step numbers disagree between the doc and the terminal.** The doc says "paste the token in step 3 below"
(`docs/setup.md:101`); setup's prompt says "After pasting the token in step 4, press Enter" (`setup.mjs`), meaning its own
printed list (step 4 = Port/Token). A reader holding both may hesitate. Fix: the doc says "(step 4 of the steps setup
prints)", or drops the number.

**F4 MINOR — GitHub has no `npm run setup` until G14-1.** The clone line uses `origin`'s public URL; Steps 13–14 are not
pushed, so today the section's step 1 ends in `npm error Missing script: "setup"`. Not a doc defect; the walk cloned the
main checkout instead. The section is correct only after the push the close asks for (G14-1).

**N1 NIT** — the doctor's "Daemon: running, but it refused the token" is not described in the section (seen in the walk).
On a new device it needs an older daemon with another token, and the line names its fix; acceptable as is.

**N2 NIT** — exit 1 "a prerequisite is missing" (`docs/setup.md:106`): a missing Chrome is a HINT and exits 0
(`checkPrereqs`). "Node, npm or git missing" would be exact.

**N3 NIT** — the clone URL carries the GitHub account handle (`docs/setup.md:18`, `README.md:15`). Guide rule 9 forbids the
user's name; the project's public address is needed to clone. See the proposed decision.

**N4 NIT — builder claim inaccurate:** S5-builder.md says setup.md's own §4 pointer now says "Manual install §N"; the diff
changes no such line (168 and 1563 still read "(§4)"). Harmless: the numbers hold.

**N5 NIT — proposal inaccurate:** S5-claude-md-proposals.md says `tsc -p scripts/tsconfig.json` "covers `scripts/bridge/`
only"; `scripts/tsconfig.json` also includes `test/*.ts`. Say "`scripts/bridge/` and `scripts/test/`". The rest of the
proposals match the code (the three scripts, their flags, exits, `examples/list-tabs.ts`, the §4 wording); the count to
write is 6089 tests in 255 files (`npm test` in the clone, 9 known CRLF reds; 6089 is the LF total too by test count).

**N6 NIT (code, outside S5's lane)** — `bridge-update` prints "Already up to date." twice (git's line and its own). Not
quoted by the docs.

## 4. Deviations

- Step 4 of the walk read the scratch config with node instead of `claude mcp list`: `list` starts the configured
  server, which would have run the clone's MCP against the user's daemon.
- The clone came from the main checkout, not GitHub (F4).

## 5. Proposed decisions

### 2026-10-30 · The clone line in the install docs keeps the project's public GitHub URL
**Decided:** `docs/setup.md` and `README.md` name the repository's GitHub URL in `git clone`. **Why:** a reader cannot
clone without it; it is the project's public address, not a local path or the user's personal name.
**Instead of:** `<repo-url>`, which the reader would have to guess. **Revisit if:** the user wants the handle out of the
docs. **By:** Claude (proposed)

## 6. Handoff

- The s5 clone is left in place at `<scratch>\s5\clone` with its `node_modules` (and any `@bridge/*` junctions npm made,
  #220): remove junctions with `cmd /c rmdir` before any recursive delete. Scratch config `<scratch>\s5\claude-config`
  holds only the clone's entry. Raw (unscrubbed) captures in `<scratch>\s5\raw`.
- No process left running; no change to the user's `~/.claude.json`, extension, Options, Chrome or tabs. The doctor's
  two hellos with the clone's token were refused by the user's daemon (4001), as in S4.
- Evidence: `S5-verifier-walk.txt`, `S5-verifier-doccheck.txt` (scrubbed: `<scratch>`, no user name, no token).
