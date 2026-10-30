# S5 verifier, round 2 (Step 14, docs): re-check after fix round 1

Model: Opus, medium effort. Role: verifier (`docs/agent-rules.md` §6), affected items only. Read and run only; no edit.

## 1. Verdict

**PASS-with-notes.** D5.1 still holds. F1, F2, F4, N2 and N5 are fixed as `S5-fixer1.md` claims. F3 is mitigated, not
removed: one MINOR finding (R1) recommends making the doc's Chrome steps follow setup's printed numbering. No CRITICAL or
MAJOR. `node scripts/doc-check.mjs` exits 0.

## 2. Checks

| Item | Where | Result |
|---|---|---|
| F1 | `docs/setup.md` "Install on a new device", the paragraph after **You need**; README Quick start | Fixed. The hint names the error text (`npm.ps1 cannot be loaded`), gives `npm.cmd run setup` / `npm.cmd run doctor` / `npm.cmd run bridge-update` or Command Prompt, says it is not measured here, and says not to change the policy. Correct for Windows PowerShell 5.1: the official Node.js installer puts `npm.cmd` beside `npm.ps1`, and typing `npm.cmd` runs the cmd shim, which the execution policy does not govern. This machine (read-only, `Get-Command npm -All`, `Get-Command npm.cmd,npm.ps1`, `Get-ExecutionPolicy -List`, `$PSVersionTable`): PowerShell 5.1.26100.9711; npm is nvm's `npm.exe` only, no `npm.cmd` and no `npm.ps1`; CurrentUser RemoteSigned, Process Bypass. So the case cannot arise here and the hint stays unmeasured, as the doc says. `bridge-update`'s own reload runs `powershell.exe -ExecutionPolicy Bypass -File …` (`scripts/bridge/update.mjs:53`), so the policy does not reach it. |
| F2 | setup.md step 6; README Quick start | Fixed. "Without Claude Code, the MCP entry line fails (exit 1): a script-only reader can ignore that line." Matches `lib.mjs` (`MCP entry` is a `fail` line). The README's "every line should say OK" is followed by the same caveat. |
| F3 | setup.md step 1, "The one question" | Mitigated: "(step 3 below; setup's own list calls it step 4)". Both numbers are true (`setup.mjs:115` "After pasting the token in step 4"; `lib.mjs` `nextSteps` 4 = Port/Token/Save). See R1. |
| F4 | setup.md **You need**; README Quick start | Fixed as far as a doc can: "if you cloned the bridge earlier, run `git pull` first" / "An older clone needs `git pull` first". The underlying cause (GitHub lacks Steps 13–14 until G14-1) remains a close item, not a doc defect. |
| N2 | setup.md exit codes | Fixed: "`1` Node, npm or git is missing, or `npm ci` or the build failed". Matches `checkPrereqs` (Node, npm, git `fail`; Chrome `hint`) and `setup.mjs:40,50`. |
| N5 | `S5-claude-md-proposals.md` | Fixed and now accurate: `scripts/tsconfig.json` includes `bridge/*.mjs`, `bridge/*.ts`, `test/*.ts`; `typecheck` ends with `tsc -p scripts/tsconfig.json` (`package.json:9`); the three script names and flags match `package.json:13-15` and the sources (`--dry-run`, `--replace-mcp`, `--no-reload`); `examples/list-tabs.ts` exists; the count 6089 in 255 files cites its source (S5-verifier.md §2). |
| N1, N3, N4, N6 | — | Unchanged, as the fixer says; acceptable (N3 is the proposed decision; N4 a builder-report inaccuracy; N6 code, outside S5). |
| Local path / user name | `git diff -U0 README.md docs/setup.md docs/e2e-test-plan.md`, added lines grepped for the user's name, account, `C:\Users`, `/c/Users`, e-mail | 0 hits (grep exit 1). The clone URL's GitHub handle is N3. |
| doc-check | `node scripts/doc-check.mjs` | exit 0; counts 25 tools, 28 router methods, 27 codes; the one notice is `CLAUDE.md:113` 6030 (the proposal's 6089 replaces it). |

`git diff` was read for `README.md`, `docs/setup.md`, `docs/e2e-test-plan.md` only.

## 3. Findings

**R1 MINOR — the doc's Chrome steps can follow setup's printed numbering, and should.** Setup prints six Chrome steps
(`scripts/bridge/lib.mjs` `nextSteps`): 1 chrome://extensions + Developer mode, 2 Load unpacked, 3 open Options,
4 Port/Token/Save, 5 pin, 6 `/mcp`. The doc's list is 1 clone+setup, 2 load (setup's 1–2), 3 Options (setup's 3–4),
4 pin (setup's 5), 5 connect (setup's 6), 6 doctor. A reader with the terminal beside the doc meets an offset on every
Chrome step, not only the token: the terminal says "step 4" and "step 5 pin", the doc says 3 and 4. The fixer's
parenthetical resolves the token line only, and asks the reader to translate. Nothing forces the offset: the doc can
keep "1. Clone and run setup", make "2. Do the Chrome steps setup prints" with a nested list 1–6 worded as `nextSteps`
(Options and Port/Token as separate items), and end with "3. Check with the doctor". The token line then says "step 4
of the Chrome steps", the same number the terminal uses, and the parenthetical goes. Docs-only; no code change.

## 4. Deviations

None.
