# S7-drivers-A builder: liveA19's row drivers

Model and effort: Sonnet 5.5, medium. Role: builder (agent-rules §6). Nothing was run against Chrome, the daemon or port 9234.

## 1. Verdict
**DONE-PARTIAL by size only.** Every liveA19 row has a registered driver and no row is left `NOT RUN — no driver built`. Code is about 658 lines against the 400 cap (§7: code alone over the cap is DONE-PARTIAL); tests are 297 new lines, under 600. The step agent may accept the size as a deviation or split a fixer round. Nothing in the drivers has run live, so every actor detail marked "unverified" in §6 is a first-run risk.

## 2. Outputs
- `recipes/s12-r19-a.ts` (530 lines): the actors and the pure decisions. Commands: `args-1 args-2 args-global args-csp args-stop args-3 con-read con-mcp con-cap refuse con-frame con-notea con-floor own-file banner-ctl con-banner banner banner-ctl-judge banner-con`.
- `recipes/s12-r19-a.ps1` (102 lines): the step engine, `Invoke-R19Row`, the restores, `Invoke-R19BannerCtl`, `Invoke-R19ConBanner`.
- `recipes/s12-r19.ps1` (+26 lines): dot-sources the new file, sets `$S12IdleMinMs = 20000` after the s12-win files (the Banner rule's IDLE; s12-win.ps1's 15 000 is Run 18's), registers 23 drivers.
- `recipes/test/s12-r19-a.test.ts` (297 lines, 31 tests). `s12-r19.test.ts` got N-1 (+11/-2 lines). `s12-r19-static.test.ts` and `tsconfig.s11b.json` got one-word edits (the new files).
- Counts: `npx vitest run recipes/test` 1433 passed / 61 files, before → 1464 / 62 files. `npm test`: 5364 passed, 228 files. `npm run typecheck`: exit 0 (no errors). `npm run build`: `built extension → dist/`. `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven print nothing (exit 0). No recipe tsconfig covered `s12-*` files before; `tsconfig.s11b.json` now includes `s12-r19-a.ts` and its test.

## 3. Drivers and the §4.27 lines each prints
Each actor prints `LEG <row> <label> <verdict>` lines; the driver turns them into the one `ROW` (worst verdict; deferred to R19-LOGS for every `R19-ARGS-*` and `R19-CON-*` row, `#351 (4) (b)`; R19-BANNER-CTL prints at once with `slice=A`).

| Block (row) | Lines printed |
|---|---|
| r19-banner-ctl | `IDLE`, `BANNERCTL liveA19 leg=neg …`, `leg=pos …`, `ANSWER … pos`, `CHECK`, `ROW R19-BANNER-CTL <v> slice=A`; sets the slice's control word |
| r19-args-1 | `ARGS <row> v<i>-sdk/-mcp …` per value, `ARGS … total … via=sdk|mcp`, `ANSWER … control-1/-2`; existing-tool change is STOP `existing-tool-changed` |
| r19-args-2 | `ARGSREF <label> …` ×11, `ARGSREF total …`, `EFF`, `ANSWER … semicolon`; `sent` from a wrapper on `client.call` |
| r19-args-global | `GLOBALS …` |
| r19-args-csp | `ANSWER`; control not `page eval: BLOCKED` is NOT MEASURED |
| r19-args-stop | `STOPCALL …` |
| r19-con-1, -2, -rej, -big, -nav | `CON <row> <label> …` per read (one table, `CON_ROWS`) |
| r19-con-mcp | `IDLE`, `CONMCP all/error/limit3 …`, `CHECK` (empty text, existing tools), `BANNERCALL`; five existing tools |
| r19-con-cap | `CONCAP …`, `CHECK … sdk-entries` |
| r19-con-banner | three sampler passes, `IDLE`, then `BANNERCON leg=neg|pos|after …` and the `LEG` |
| r19-args-3 | JS off by signal, `IDLE`, one sampler pass over the four refused calls, `CONREF` ×4, `ANSWER … snapshot`, `EFF`, `BANNERCALL` |
| r19-con-jsoff, -3, -4 | `IDLE`, `CONREF <row> <label> … same-as=…`, `CHECK … mcp-refused`, `BANNERCALL`; CON-4 adds `ANSWER … after` |
| r19-con-frame | `CON R19-CON-FRAME a-pattern | a-nopattern | b-oop …` |
| r19-con-notea | `CON R19-CON-NOTEA blocked | allowed … marker=` |
| r19-con-floor | `CONFLOOR …` (off and on times are the press times from the signals) |
| r19-con-own, -file | `CONREF … same-as=snapshot`, `BANNERCALL`; the target is the one new hidden-as-blocked tab |

`R19-CON-FILE`'s `NOT RUN — waits for G11-3` is the lib's gate (`Test-R19Gate`), kept as §4.27 says.

## 4. Exit criteria
- Static test: every row id parsed from §4.27's liveA19 line has a registered block and is in the runner's order; no driver prints `no driver built`.
- Failing-first decisions in TS (`judgeLine`, `judgeRefusal`, `judgeEffects`, `judgeBannerRefused`, `judgeBannerCall`, `idleSleepMs`, `bannerCtl19`, `judgeFrame`, `judgeNoteA`) and the `banner`, `banner-con`, `banner-ctl-judge` commands, tested through `main`.
- Mutants, each red (run): restore skipped (no finally); a STOP printed without `Stop-R19`; the actor's reason dropped; verdict read from the first line only; a clean row restoring anyway. The static test also fails on any `Stop9`, `Fail-S16` or raw `throw` in the new PowerShell and on a state-change registration with no `-Restore`.
- Forms by key: `CONREF`, `CONFLOOR`, `BANNERCALL` (34), `BANNERCTL` against §4.27; the eleven args texts and the CON counts against the sheet's text.
- N-1 fixed (`mutate()` with a replacer function and a parse check). N-2 to N-5 are not fixed: they bind the old-build slices (N-3, N-4) or are a label and a lost line on a path no liveA19 driver reaches (N-2, N-5).

## 5. Deviations
- Size (§1).
- The MCP actor is a scripted stdio MCP client against `mcp/dist/index.js` (`@modelcontextprotocol/sdk`), not a `claude -p` session: no model in the loop, the same MCP surface, and it writes `actors-<slice>.jsonl` as S7-helpers-d §7 says. "Tool search off" has no meaning for it.
- The actor closes the `bc` tab right after the positive leg, not at the slice's end (§4.27 line says "closes at the slice's end"): no bc-close block is in liveA19's order.
- R19-ARGS-2's "effects above 0 is a STOP" has no reason in the sheet's list of thirteen, so it is `throw-after-state`.
- Label words for the non-`all` CON-1 reads (`limit3`, `error`) and for CONREF/CON legs are mine; §4.27 leaves them open.

## 6. Findings
- Wording: R19-CON-1's second and third reads are written `limit=3` and `level=error` with no label word; a `=` in a label would break key parsing. R19-CON-MCP's banner clause is "expected `seen`", but the sheet defines no value for `none` with a valid window; I print FAIL.
- Unverified live (no run): a tab opened by the SDK `newTab(url, {active: true})` shows the banner in window W (the sampler reads W); the MCP `browser_evaluate` text parse (`JSON.parse`, else raw); `browser_new_tab`'s reply holds `T<n>`; hidden-as-blocked tabs carry `owner === undefined` for an unheld tab; `Set-S11BoxVerified` and `Set-S11Flag` return a bool as read here; `tab.close()` after a refused call; CON-FILE reuses Run 17b's `s11b-file.html` under `$Root`.
- `s12-*` recipes were in no tsconfig; only `tsconfig.s11b.json` now covers the new files, the older `s12-*` files stay uncovered.
- Nothing new measured: nothing ran live.

## 7. Handoff
- No PIDs, servers or worktrees. Not committed.
- Before S7-live: a verifier reads the actor details of §6; a first attempt at liveA19 is the first run of every driver. The rows judged from `STOPWHY` end in `Stop-R19`, so a wave stop is matched by its RETURN.
- Commit list: `recipes/s12-r19-a.ts`, `recipes/s12-r19-a.ps1`, `recipes/s12-r19.ps1`, `recipes/test/s12-r19-a.test.ts`, `recipes/test/s12-r19.test.ts`, `recipes/test/s12-r19-static.test.ts`, `recipes/tsconfig.s11b.json`, this report.
