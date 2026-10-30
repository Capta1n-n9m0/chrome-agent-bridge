# S5 verifier, round 3 (Step 14, docs): re-check after fix round 2, R1 only

Model: Opus, medium effort. Role: verifier (`docs/agent-rules.md` §6), affected items only. Read and run only; no edit.

## 1. Verdict

**PASS.** R1 is fixed as `S5-fixer2.md` claims; F1–F4 and N2 survived; no dangling step reference; `node scripts/doc-check.mjs`
exits 0; no local path or user name in the added lines.

## 2. Checks

| Item | Where | Result |
|---|---|---|
| R1 | `docs/setup.md` "Install on a new device", step 2 | Fixed. Step 2 "Follow the next steps setup prints" holds a nested list 1–6 that matches `scripts/bridge/lib.mjs` `nextSteps` (lines 110–117) and the capture `S4-rehearsal-setup1.txt` lines 48–54 item by item: 1 chrome://extensions + Developer mode (top right); 2 Load unpacked, the `extension\` folder; 3 Options page (Details → Extension options); 4 Port 9234, Token by Ctrl+V or `bridge.token` in Notepad, Save; 5 pin, kill switch, Alt+Shift+K; 6 `/mcp` or a new session, `browser_status`. The doc's item 4 leaves out the terminal's "(or run npm run setup again to copy it)", and item 6 adds "the daemon is connected"; both are true and neither shifts a number. |
| Token step number | setup.md step 1, "The one question" | Now "step 4 of the list below", the same number as `scripts/bridge/setup.mjs:115` ("After pasting the token in step 4"). The old parenthetical is gone. |
| Order | the whole section | Reads 1 clone + setup, 2 the six Chrome steps, 3 the doctor, then Updating later. The nested list ends directly before "3." at column 0, which closes it and continues the outer list. |
| Dangling references | `grep -rnE "install-on-a-new-device\|Install on a new device"` over all `*.md`; `grep -niE "(step\|item) [1-6] (above\|below\|of)…"` over setup.md, e2e-test-plan.md, README.md | The only links are README.md:25 and :94, to the anchor, not to a step number. The README Quick start cites no step number. The one step reference in the section is the "step 4 of the list below" line, which is correct. Other "Step 6"-style hits are the project's Step numbers, unrelated. |
| F1 | setup.md, paragraph after **You need**; README Quick start | Present: `npm.ps1 cannot be loaded`, `npm.cmd run setup` / `doctor` / `bridge-update`, unmeasured, no policy change. |
| F2 | setup.md step 3 (the doctor); README | Present: "Without Claude Code, the MCP entry line fails (exit 1)…"; README "Without Claude Code the MCP entry line fails". |
| F3 | — | Resolved by R1 (see above). |
| F4 | setup.md **You need**; README | Present: "run `git pull` first" / "An older clone needs `git pull` first". |
| N2 | setup.md exit codes | Present, unchanged. |
| doc-check | `node scripts/doc-check.mjs` | exit 0; 25 tools, 28 router methods, 27 codes; notices only the known `CLAUDE.md:113` 6030 and the plan's `docs/install.md` (an "or" option the plan named, not taken). |
| Local path / user name | `git diff -U0 README.md docs/setup.md docs/e2e-test-plan.md`, `+` lines grepped for the user's names, e-mail, `C:\Users`, `/c/Users` | 0 hits (grep exit 1). |

## 3. Findings

None.

## 4. Deviations

None.
