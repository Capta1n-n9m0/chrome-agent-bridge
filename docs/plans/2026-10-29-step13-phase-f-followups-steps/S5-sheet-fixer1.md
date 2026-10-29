# S5-sheet fixer, round 1

Fixer: Claude Sonnet 5.5, medium. Edited only `docs/e2e-test-plan.md` §4.28 and this report. All findings fixed; none disputed.

## Per finding (rows in §4.28)

- **MAJOR-1** (R20-CON-NOTEA; Fixtures and ports; liveA20 header and bullet). Chose the first option: `<P>` must be 8081 for this row (the fixture hard-codes it, `test-fixtures/s12-console.js`); if held, both legs are NOT MEASURED "fixture port"; no port-relative copy is made. Added a pre-pattern read on the `notea` page (`CON R20-CON-NOTEA pre entries=2`); the `blocked` leg passes only if `pre` read `entries=2` and `blocked` reads `entries=0`, else NOT MEASURED "the blocked host's script did not log". The control sentence now names the pre-pattern read as the control and says the `allowed` leg proves the reader, not the drop. The header row and the bullet now agree: `allowed` and the `pre` read early, the `blocked` leg after CON-FLOOR.
- **MINOR-2** (R20-DEVT-EARLY; form (7)). Added step (0), `CTRL20 … when=before-open … attached=no`, as a pass condition; `before-open attached=yes` is NOT MEASURED. Form (7) now allows `windows=n/a title=n/a` for a docked leg.
- **MINOR-3** (R20-POP-BG, R20-POP-OTHER). Before every round B's (C's for `third`) `focusTab` on H, then the `active-guard` read; a round reading `fg` is NOT DISCRIMINATING and not counted.
- **MINOR-4** (R20-0C, R20-RESTORE slice C). R20-0C reads the found dock side in the wave's own capture window (window list for undocked, UIA Dock side buttons for docked), prints `DOCK R20-0C side=…`; `unread` makes the DevTools rows NOT RUN. Slice C's R20-RESTORE re-docks to that side before the last close and prints `DOCK R20-RESTORE side=…`; a difference is the STOP `not-restored`. New form (13) `DOCK`.
- **MINOR-5** (R20-LOGS; form (11)). `SCAN20 actors <tool>:` one line per tool; `sentinel` above 0 only on `browser_console_messages`, `tab.consoleMessages`, `browser_evaluate`; else the STOP `text-leak`.
- **MINOR-6** (Line forms). Carried list now names `ARGS` (both forms), `KEEPDT`, `SWEEPHELD`, `RESTORED: …`. New "Redefined" sentence: `CONCAP` (`lines=<k+1>` counts the marker, the #398 text) and `CHOOSE`'s `names-devtools=<yes or no>`. New form (12) `S4 commit=<ancestor or not>`.
- **MINOR-7** (R20-CHOOSE-REFUSE-DIS). `flip` decides alone unless it answers TIMEOUT; then `self`: `BAD_PARAMS` exact = PASS, TIMEOUT = RECORD, `ok` with `files=1` = FAIL.
- **MINOR-8** (builder §7, not edited): corrected item below.
- **NIT-9** order agrees (see MAJOR-1). **NIT-10** `R20-CLOSER` replaced by the row-less `CLOSERPROBE`. **NIT-11** "All five" now "All four" with the items named.

## Corrected "needs an s13 counterpart" item for MINOR-8

Replace the builder's last bullet with: "The MCP-leg readers inside `s12-r19-a.ts`/`-de.ts` and, in `s12-r19-c.ts`, `mcpCodeOf` (l.94) and `judgeMcpErr` (l.101) (they read a code on line 1 and match with `text.includes`; `s12-r19-de.ts` imports `mcpCodeOf` at l.14 and uses it at l.64 and l.95; `s12-r19-c.ts` also uses both at l.374, 388, 408): none is reused; replaced by the MCP-line judges. Grep over `recipes/*.ts` finds no other reader of these two names."

## Checks

- `git diff --numstat docs/e2e-test-plan.md`: `58 0` (one hunk, `@@ -1935,6 +1935,64 @@`); `git diff --stat`: `1 file changed, 58 insertions(+)`. (The fixer's edits are inside the same uncommitted additions, so the numbers match the earlier count: §4.28 is still 58 lines, under 600.)
- `node scripts/doc-check.mjs`: counts line `tools: 25 · router methods: 28 · codes: 27`; no dead path; only flag is the pre-existing `CLAUDE.md:110  5596 passed`; `Checked 38 living docs (6 closed phase docs skipped for paths and status).`
