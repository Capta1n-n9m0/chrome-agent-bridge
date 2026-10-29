# recipes/

Claude-written scripts that drive the real Chrome through the bridge's TypeScript SDK (`@bridge/sdk`),
plus the helpers of the live E2E waves. Each script's header comment says what it does, what it needs
open, and how it fails (Step 8 phase doc 0.7).

Run one with `tsx` from the repo root:

```bash
npm run recipe -- recipes/<file>.ts [args]      # the same as: npx tsx recipes/<file>.ts [args]
```

The SDK finds, starts or hands over the daemon itself; the token comes from `BRIDGE_TOKEN`, else
`bridge.token` at the repo root, and no recipe reads or prints it. The fixture rows need
`python -m http.server 8080 --directory test-fixtures` (`docs/e2e-test-plan.md` §1 item 7).

## Scripts

| File | What it does |
|---|---|
| `hello.ts` | The smallest SDK script: connect, `daemon.status`, `listTabs`, optional hold. The instrument of rows MUX-3/5/6/8/10 — its output is pinned by those rows, so do not change it. |
| `sdk-login.ts` | Row SDK-1: `newTab` to the fixture → `locate({role:"button", name:"Sign in"})` → `click` → `waitFor({text})` → print the page's status line → close. |
| `s6.ts` | Step 8 S6's SDK rows, one subcommand each: `stale-check` (first line after a reload), `sdk2`…`sdk5`, `sm0`, `sm1` and `sm1-log` (SM-1 across a Chrome restart; with `--observed <file>`, SM-1's Part 3 rule `SM-1 (Part 3 rule)`, #99, added 2026-10-23), `rep0` (REP-0, #97: does a failure report's screenshot switch to the failed tab; added 2026-10-23), and the helpers `peek`, `daemon-shutdown`, `close-bb-tab`. `--help` lists them. |
| `s6-rules.ts` | The pure pass rules `s6.ts` and `sdk-login.ts` print (tested in `test/s6-rules.test.ts`). |
| `blackboard/boot-bb.ts` | Row SDK-6: open the named course in its own tab, load the blackboard-ultra skill's `bb.js` by `evaluate`, print `bb.VERSION`. |
| `blackboard/export-grades.ts` | Row SDK-7: the course gradebook, read-only, into `exports/<course>-<date>.json` (gitignored); prints counts and sha256 only. `--hold` keeps the export in its tab's page memory for the MCP leg, `--drop-held <T#>` drops it after both reads. `--mcp-plan` prints the MCP leg's expressions; the MCP leg reads the held export with one `browser_evaluate {saveTo}`, never in chunks (Run 15's PP1 row). |
| `blackboard/guard.ts`, `readonly.ts`, `export-file.ts`, `held.ts` | Pure parts of the Blackboard recipes: course argument and origin guard, the read-only allowlist and page code, file names and hashes, the held-export plan (tested in `test/blackboard-*.test.ts`). `session.ts` holds the shared open-and-boot steps. |
| `blackboard/stub-bb.js` | A fake `bb.js` with invented data, for `--dry-run` on the localhost fixture. |
| `fe.ts`, `fe-rules.ts`, `fe-win.ps1` | Step 8 stage FE's live rows (focus emulation). |
| `t5.ts`, `t5-lib.ts`, `t5-actor.ts`, `t5-png.ts`, `t5-win.ps1` | Step 7's wave tools: SDK steps, the persistent headless actor, PNG probes, window helpers. Reused by later waves. |
| `reload-extension.ps1` | Reloads the unpacked extension by UI Automation and proves it (exit 0; exit 2 = pressed nothing). |
| `bgf-*.ps1` | Chrome quit/relaunch/count (BG-FLAGS, then SM-1 under #96; every Chrome restart needs a fresh grant from the user). |
| `bb-login.ps1` | SDK-6/SDK-7's login step (Windows PowerShell 5.1): its own window on ada, Chrome's autofill, at most one invoke in a run — Blackboard's own sign-in button, or (since 2026-10-23, #99) the one allowlisted submit button of ADA's SSO page, only on a host on its SSO host allowlist (`ada.edu.az` and hosts under it, or exactly `login.microsoftonline.com`); counts, yes/no and an allowlisted host only, never reads or types a field. After the one press it polls up to `-WaitSec` (default 90) from the press until it is back on Blackboard with no sign-in control and the address stable 4 s (exit 0, window closed); else exit 4 at the bound (or at once if its window is gone), window left open, nothing more pressed (exit 2: nothing touched). `-DryRunBase http://127.0.0.1:<port>/ [-DryRunPage <page>]` runs it against the loopback stand-ins in `fixtures/` (`bb-standin.html` good, `-bad`, `-otherhost`, and since Step 10 S5 `-delayed` (exit 0 after a 12 s redirect), `-stuck` and `-elsewhere` (exit 4 at the bound)). *Updated 2026-10-25 (Step 10 S5, #215): the condition wait and `-WaitSec`; was "exit 0 logged in, 4 waits for the user, 2 nothing touched" after a fixed wait.* |
| `s9.ts`, `s9-rules.ts` | Step 9's live wave (Run 13, `docs/e2e-test-plan.md` §4.20; order in `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md`): one bridge call per `call <ROW> <step> <op>`, printed `ROW …` and judged `CHECK …`; the timed rows (`safe4a`, `safe4c`, `safe4-type`, `safe4b`, `cap1`) signal `$S9_OUT\<row>.ready` for the driver's press; `scan-log` / `scan-file` print counts only. listTabs, `daemon.status` and the network log as counts, never a non-fixture URL or title. |
| `s9-actor.ts` | Step 9's MCP actors: a persistent `claude -p --model sonnet` with an MCP config naming only `chrome-agent-bridge` (`--strict-mcp-config`), tool results printed item by item (#162's `Safety:` item). |
| `s9-win.ps1` | Step 9's UI Automation (dot-source it): the toolbar button (pin, press, title), Alt+Shift+K and the keyboard layout, the options page (switches, block list — read as line count and sha256 only), `chrome://extensions/shortcuts`, the worker's console; only in the driver's own windows. A UTF-8 BOM file (the em dash in the titles). |
| `s9-redirect.py` | Port and target from its arguments (default 8083 → `http://localhost:8081`): every GET → 302 to the same path on the target (SAFE-5b/5c; §4.24 runs more); 127.0.0.1 only. Threaded since Step 10 S1 (Run 13's single-threaded server is the probable cause of SAFE-5c's `TIMEOUT`). |
| `s9-r14.ps1` | Step 10 S1's block runner for Run 14 (`docs/e2e-test-plan.md` §4.21; order in `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-wave-sheet.md`): one block per call (`-Block preflight … restore`), the wave's globals kept between calls, one stop procedure (#193). Reuses `s9.ts`, `s9-rules.ts` and `s9-win.ps1`, which S1 extended. |
| `s10.ts`, `s10-rules.ts` | Step 10's live wave (Run 15, §4.22; order in `…-steps/S7-wave-sheet.md`): one subcommand per row step (`mcpf`, `cap1-sdk`/`cap1-mcp`, `save-sdk`/`save-mcp` — `Tab.evaluateToFile` and one `browser_evaluate {saveTo}` by a headless actor —, `sw1`, `pop2`, `scan`, …; `--help` lists them), printed `ROW …` and judged `CHECK …`; the pure rules in `s10-rules.ts` (tested in `test/s10-rules.test.ts`, which ties every expected text to the product constant it was copied from). Never prints a `saveTo` path (`<saveTo>`), an expression (`<expr>`) or a value — hashes, sizes and counts only. Run with `node --import tsx` (the runner does). |
| `s10-r15.ps1` | Run 15's block runner (`-Block preflight`, `build`, `servers`, … one block per call, in the sheet's order); every printed line also appended to `$env:S10_OUT\r15-raw.txt`. |
| `s10-win.ps1` | Step 10's UI Automation (dot-sources `s9-win.ps1`): the S10 fixture titles, R15-3's placement guard, `Close-S10Foreign`, the SAVE-64 memory sampler's start/stop. |
| `s10-mem.ps1` | SAVE-64's memory sampler: the private memory of every `--extension-process` `chrome.exe`, every `-PollMs`, to `-Out`; reads process counters only. |
| `s11.ts`, `s11-rules.ts`, `s11-evidence.ts`, `s11-csp.py` | Step 11's live wave (Run 16, `docs/e2e-test-plan.md` §4.23; order in `docs/plans/2026-10-25-step11-file-upload-steps/S5-sheet.md`): the SDK-side actor (`Tab.upload` and `browser_upload_file` rows), its pure pass rules, the committed-evidence scanner (counts only) and the CSP fixture server. |
| `s11-r16.ps1`, `s11-r16-plan.ts`, `s11-r16-opt.ts`, `s11-win.ps1`, `s11-win-rules.ts` | Run 16's block runner (`-Block liveA` / `liveB` / one block), its pure plan, UP-OPT's judge, and the UI Automation for the Upload folders box (dot-sources `s10-win.ps1`; reads the box as a line count and sha256 only). |
| `s11b.ts`, `s11b-rules.ts`, `s11b-delay.py`, `s11b-flip.py`, `s11b-slow.py` | Step 11b's live wave (Run 17, `docs/e2e-test-plan.md` §4.24): the SDK-free side of the helpers (`B17 <sub>`; Run 17b added `tabwatch`, `build-proof`, `newtab-timed`, `ctl-slow` and `history --activate`), their pure pass rules, and three fixture servers (a delayed 302, a 200-then-302, a slow file). |
| `s11b-r17.ps1`, `s11b-r17-plan.ts`, `s11b-win.ps1`, `s11b-win-rules.ts` | Run 17's block runner (`-Block liveA` / `liveB` / `plan` / one block), its pure plan, and the UI Automation helpers with their pure half. |
| `s11b-r17b.ps1`, `s11b-r17b-plan.ts`, `s11b-r17b-build.ts`, `s11b-r17b-rules.ts` | Run 17b (`docs/e2e-test-plan.md` §4.25): the block runner (`-Block liveA17B` / `liveB17B` / `plan` / one block; runs Run 17's carried blocks from `s11b-r17.ps1` by its parser), its pure plan, and the pure rules of the build proof, tab watcher and timed `newTab`, and of the history helpers. |
| `s12-rules.ts`, `s12-win.ps1`, `s12-r18.ps1`, `s12-r18-lib.ps1` | Step 12's Run 18 (`docs/e2e-test-plan.md` §4.26; order in `docs/plans/2026-10-27-step12-phase-f-steps/S1-sheet.md`): the pure rules, the Windows helpers (mirroring the rules' constants), the block runner, and its sequencing, STOP and restore logic (unit-tested with stubs). |
| `s12-forms.ts`, `s12-forms-b.ts`, `s12-forms-c.ts` | Run 19's line forms (§4.27) as pure formatters, each tied to the sheet's own paragraph by its test; counts and fixed codes only, never a text. |
| `s12-r19.ts`, `s12-r19.ps1`, `s12-r19-lib.ps1`, `s12-r19-{a,b,c,de}.{ts,ps1}` | Run 19's block runner (§4.27; order in `…-steps/S7-sheet.md`): the pure part and its thin commands (`proof`, `swap`, `restore-head`), the runner and its STOP/RETURN and old-build logic, and per slice (liveA19–liveE19) the node actors and their PowerShell row drivers. |
| `s12-win-b.ps1`, `s12-win-c.ps1`, `s12-oldbuild.ts` | Run 19's Windows helpers for liveB19 and liveC19 (dot-sourced after `s12-win.ps1`), and the old-build swap and restore of #356 (2): a scratch worktree with its own `npm ci`, never a `node_modules` junction (#220). |
| `s10-ret1.ts`, `s10-ret1.ps1` | RET-1 (a killed Chrome retires N ≥ 1 held handles): the SDK holder and its driver, which **kills and relaunches the user's real Chrome** — only under the user's grant G10-2 (run in Run 15 as RET-1R under #221/#222). |

*Retired 2026-10-25 (Step 10 S8): `blackboard/assemble-mcp.ts` (rebuilt SDK-7's MCP leg from an actor's transcript into
`exports/<course>-<date>-mcp.json`) and `blackboard/transcript.ts` (transcript parsing), with `export-file.ts`'s
`assemble()` and their 7 tests, because the MCP leg is now one `browser_evaluate {saveTo}`: Run 15's SAVE rows and its
PP1 row passed (page = SDK file = MCP file by sha256). Paging bulk data through `browser_evaluate` in chunks is a test
device only (phase doc 0.5 with Stage 0 F9, #209; decisions.md · 2026-10-24 · #127). Run 12's S6.3 record stays as
written.*

## The Blackboard recipes' rules

- They run only on `https://ada.blackboard.com`, on the course given on the command line (an id such as
  `_12345_1`, its course URL, or a short course key such as `pp1`, which they resolve on ada by one
  read-only GET and then print and file under the key: the resolved id is never printed or written). With no course they refuse; they never pick a course or claim a tab
  they did not open. After the page loads they check its origin and course again (a login redirect is
  refused, and the recipe's own tab closed).
- `--dry-run` opens the localhost fixture and loads `blackboard/stub-bb.js`; it refuses any page but
  `http://localhost:<port>` / `http://127.0.0.1:<port>`. A real run refuses the stub.
- They are read-only by construction: `export-grades.ts` sends only page code built from the allowlist
  in `blackboard/readonly.ts` (`bb.all` on the gradebook read paths); any other op throws before
  anything reaches the page. Failure reports are off (`failureReports: false`), so no screenshot or
  snapshot of a Blackboard page is saved.
- Output is counts, sizes, sha256 and file paths — never a grade, a name or a Blackboard URL. Exports go
  to `exports/` (gitignored) and are never committed.

## Typecheck and tests

```bash
npx tsc --noEmit -p recipes/tsconfig.s6.json   # the S6 files (tsconfig.json and tsconfig.fe.json cover the older ones)
npx tsc --noEmit -p recipes/tsconfig.s9.json   # the Step 9 S4 files (and Step 10 S1's additions to them)
npx tsc --noEmit -p recipes/tsconfig.s10.json  # the Step 10 S7 files
npx tsc --noEmit -p recipes/tsconfig.s11.json  # the Step 11 S5 files
npx tsc --noEmit -p recipes/tsconfig.s11b.json # the Step 11b S4 files and Step 12's s12-r19-{a,b,c,de}.ts (the other s12-*.ts compile through their tests under .s6)
npx vitest run recipes/                        # recipes/test/*.test.ts (part of `npm test`)
```
