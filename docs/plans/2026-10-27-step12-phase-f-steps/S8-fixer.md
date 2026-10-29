# S8-fixer: fix round 1 (Claude Sonnet 5.5, medium)

Docs only; no code, no test run, nothing committed. `node scripts/doc-check.mjs`: exit 0 (remaining findings are the
close-out items the verifier listed: stale counts in CLAUDE.md files, the 4665 test count, decisions.md budget).

- **MINOR-1 fixed** (`docs/setup.md`, SDK list, ~line 419). The cited tests cover the `Tab`; the sentence now says so, and
  that the client's cursor has `consoleMessages` "by the code" (`sdk/src/client.ts`), no test calling it on the client
  (grep of `sdk/test`, `mcp/test` found none).
- **MINOR-2 fixed** (`setup.md` ARGS-1 note). Now: through the MCP the printed text kept the page's order, 5 of 5
  (R19-ARGS-1, `via=mcp`); the sorted keys are the SDK's `value` only.
- **MINOR-3 fixed** (`setup.md`, Reading the console, `Object` bullet). The reading and cause are from Stage 0
  (`stage0-m1-C.txt`) and the code; live the error's text was absent (`marker=0`) and no line prints it.
- **MINOR-4 fixed** (`setup.md`). Heading is "Not shown: a second call with the same file."
- **MINOR-5 fixed** (`setup.md`, chooser limits). Measured points named by row (HUMAN, LATE, FRAME, DISARM); DISARM bullet
  now cites R19-CHOOSE-DISARM PASS, `ms=5025`; the dialog-just-before point says "by construction, not measured".
- **MINOR-6 fixed** (`setup.md` tool table row, `browser_console_messages`). Dated amendment: a same-site frame is read
  (R19-CON-FRAME); a frame in another site's process is not. Tool description left to the session agent.
- **MINOR-7 fixed** (`setup.md`). Dated Superseded markers at the chooser paragraph, the "With `chooser`" list and
  "can switch" (~line 322).
- **MINOR-8 fixed** (`S8-claude-md-proposals.md` §2). Added the `mcp/CLAUDE.md:54` amendment pointing to the daemon's hold
  (#338, #354) and the failed R19-G2-1.
- **NIT 1** kept as ruled. **NIT 2 fixed** (`progress-and-roadmap.md:891`, now #321, G12-0). **NIT 3 fixed** (README "58 row
  ids"; limits pointer adds Running JavaScript, Uploading files, Troubleshooting; roadmap "of 58 row ids"). **NIT 4 fixed**
  ("3.3 s apart" dropped). **NIT 5 fixed** (the #373 re-measurement bullet removed from proposals §6; it lives in the
  phase doc's Follow-ups). **NIT 6 fixed** (setup.md and README: "not one sent with `focusEmulation`"; the roadmap block's
  extra blank line removed).
- Disputed: none.
