# recipes/ — Key files, live-run and Windows tooling gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply.

## Key files
- `recipes/` (run with `npm run recipe -- <file>`, i.e. `tsx`; index in `recipes/README.md`):
  `hello.ts` (SDK smoke script; its output is pinned by MUX rows), `sdk-login.ts` (row SDK-1: the
  typed `Tab` end to end on the fixture), `reload-extension.ps1` (reloads the Chrome Agent Bridge
  card by UI Automation and verifies it; exit 2 = pressed nothing), `t5*.ts`/`t5-win.ps1` (the Step 7
  E2E driver helpers), `fe.ts`/`fe-rules.ts`/`fe-win.ps1` (Step 8 stage FE, focus emulation),
  `s6.ts`/`s6-rules.ts` (Step 8 S6's SDK rows), `blackboard/` (`boot-bb.ts` loads the
  blackboard-ultra skill's `bb.js` in a tab of its own; `export-grades.ts` reads a gradebook into
  gitignored `exports/`; `held.ts` and their helpers `export-file.ts`,
  `guard.ts`, `readonly.ts`, `session.ts`, `stub-bb.js`; read-only by construction,
  `failureReports: false`), `bb-login.ps1` (that login step; since Step 10 S5 a condition wait inside one
  `-WaitSec` bound, #215), `fixtures/` (its Blackboard and SSO stand-in pages; Step 10 S5 added
  `{bb,sso}-standin-{delayed,stuck,elsewhere}.html`, `elsewhere-landing.html`, `sso-submit-delayed.html`),
  `bgf-*.ps1` (Chrome quit/relaunch/count: BG-FLAGS, then SM-1), `s9.ts`/`s9-rules.ts`/`s9-actor.ts`/`s9-win.ps1`/`s9-redirect.py` (Step 9 S4, Run 13: SDK rows, their
  rules, headless MCP actors, UI Automation of the button/shortcut/options page/worker console, the port-8083
  redirect server, threaded since Step 10 S1), `s9-r14.ps1` (Step 10 S1, Run 14's block runner),
  `s10.ts`/`s10-rules.ts`/`s10-r15.ps1`/`s10-win.ps1`/`s10-mem.ps1`/`s10-ret1.ts`/`s10-ret1.ps1` (Step 10 S7, Run 15;
  `s10-ret1.*` kills and relaunches the user's Chrome, only under a grant), `test/` (part of `npm test`),
  `tsconfig{,.fe,.s6,.s9,.s10}.json` (recipes are not in `npm run
  typecheck`: `npx tsc --noEmit -p recipes/tsconfig.s6.json`). Step 10's fixtures for the bridge are
  `test-fixtures/s10-{cap,mcpf,save}.html`.

## Runtime gotchas (live runs, Windows tooling, driving Chrome from the outside)
- **Windows PowerShell 5.1 mangles `—`** (U+2014): it decodes program output with the console code
  page and writes `Add-Content`/`Set-Content` in ANSI, so `—` becomes `â€"` (D6 fixer; again in W1,
  2026-10-22). Set `[Console]::OutputEncoding = [Text.Encoding]::UTF8`, read with `-Encoding UTF8`, and
  write UTF-8 text with Node or `[IO.File]::WriteAllText`.
- **A hard reload re-fetches `favicon.ico`, and a plain fixture URL can come from Chrome's cache.** Run 8
  NET-1 served W1's 12 914-byte copy from the HTTP cache (`from cache: yes`, the server never hit) and
  printed `12.6 KB` for a 13 106-byte file; Run 9's Ctrl+Shift+R got `12.8 KB`, `from cache: no`, but
  the tab also logged a `404 image favicon.ico`, so `showing 1 of 1` became `2 of 2` (R9-NET-1). Write
  network rows with a fresh query string and a `types` filter.
- **Captures are colour-managed**: a `#ff00ff` bar drawn by the E2E driver (`recipes/t5-lib.ts:148-149`)
  read `#dd00fa` and its cyan `#00ffff` bar `#97fdfd` in a capture
  (Run 8 SCREEN rows, Run 9 R9-SCREEN-2), so pixel checks need a hue rule with slack,
  probed off any label text. In default-mode captures lime `#00ff00` read `#8fff3d` and blue
  `#0000ff` read `#3300f8` (named blue; Run 9, and Run 12 REP-0 control A); cyan through the default
  capture was not measured and is expected to shift like lime: use blue or magenta for colour
  controls (S6 verifier r2, from Run 9's readings; `…step8…-steps/S6.md` gotcha candidate 7).
- **Recipes run with `tsx` (`npm run recipe -- <file>`), and `String(fn)` page code breaks under tsx.**
  tsx's keepNames wraps inner named functions and named arrows in `__name(…)`, so `String(fn)` of such a
  function throws `ReferenceError: __name is not defined` in the page; under vitest the same function
  is self-contained, so a unit test cannot catch it (S6 verifier §7, reproduced in `node:vm`, tsx
  v4.23.15). Recipes ship page code as literal strings. The extension's `SERIALIZER_SRC` is unaffected
  (bundled by esbuild without keepNames). Recipes are not in `npm run typecheck`: use their own
  `tsconfig*.json` (root `CLAUDE.md`, Commands); a recipes test that imports chrome-typed extension code belongs in a tsconfig
  with `"chrome"` in `types` (`tsconfig.s9`/`.s10`) — `tsconfig.s6.json`'s `test/*.test.ts` glob pulled in
  `s9-rules.test.ts` (since `e91e437`, 26 errors in `extension/src/tabs.ts`) and, through `s10-rules.test.ts`,
  `debugger.ts` (since `b55048d`, 3 more) until Step 10 S8 excluded them (S8-builder.md item 3; decisions.md ·
  2026-10-25 · S8: the retirement as done, the s6 typecheck fix, and where the pointers go (#228)).
- **`Alt+Shift+K` is assigned as `_execute_action` on Chrome 156** and pressing it left the Windows input
  layout unchanged (`0x04090409` before and after, three layouts installed; Run 13 SAFE-2). The toolbar
  extension button and the Extensions (puzzle) button expose **no UIA Invoke pattern**: pinning and
  pressing need a mouse click at a `FromPoint`-verified point in the driver's own window (Run 13 record
  block 9; S4.md §10 finding 1).
- **Chrome 156 shows a second line under the extension's action title** ("Has access to this site"; Run 13
  record SAFE-1 (4), SAFE-9): read only the first line when checking the title by UI automation.
- **Chrome 156 titles the service worker's DevTools window `DevTools`**, with no extension URL (Run 13
  SAFE-10 set-up, #195).
- **`chrome.exe --new-window chrome://…` opens a New Tab page, not the page** (Run 8 set-up fix 4;
  RELOAD-AUTO F1). Type the URL into the omnibox of a window the driver opened instead.
- **The extension reload is scripted: `recipes/reload-extension.ps1`** (decisions.md · 2026-10-23 ·
  Later extension reloads use `recipes/reload-extension.ps1`). On `chrome://extensions` Chrome 156's
  UIA tree flattens each card into siblings; the card's reload is AutomationId `dev-reload-button`,
  and the toolbar's Reload is also named "Reload" (AutomationId `view_1003`), so never match by name.
  An unpacked extension's id is sha256(absolute path as UTF-16LE), first 16 bytes as letters a–p.
  Proof of a reload: a new `extension resync` line in `daemon.log` in the same second (5 of 5).
  (RELOAD-AUTO F1–F6.) *Updated 2026-10-24: since Step 8 S2b a reload's hello waits up to 2 s for the
  session marker, so the line can come later: pressed 16:53:10.415Z, resync stamped 16:53:12Z, and the
  script still found it and exited 0 (Run 12 SM-0, one reload; decisions.md · 2026-10-23 · S2b's
  details … (#94), whose Revisit-if names this).*
- **UIA `TabItem` is not a tab count**: a page element with `role="tab"` is a `TabItem` too (empty
  ClassName); the tab strip's tabs have ClassName `Tab` (BG-FLAGS finding 3).
- **The driver's shell runs inside a job object** (limit flags `0x800`, breakaway allowed), and a
  process started with plain `Start-Process` inherits the job and the session's environment
  (BG-FLAGS finding 5). Anything that must outlive the driver (Chrome, a daemon) needs breakaway and
  a clean environment — `recipes/bgf-launch.ps1` does both.
- **Windows PowerShell 5.1 traps met in Run 12 (Step 8 S6)** (`…step8…-steps/S6.md` gotcha candidates
  2, 3, 10, 16): the built-in alias `R` (`Invoke-History`) shadows a function named `R`; embedded `"`
  are stripped from a native command's arguments, so send JSON-bearing prompts from Git Bash;
  `Get-ChildItem` with a wildcard in the middle of the path plus `-Filter` returns nothing (put the
  pattern in the path); `>` in a `-NoProfile` shell writes UTF-16LE (`ff fe`), which a UTF-8 reader
  turned into a page `SyntaxError` — read a file's encoding from its BOM. Met in Step 10: variable names are
  case-insensitive, so a local `$h` in a function shadows a script-level `$H` through dynamic scope (S5 builder:
  `Close-Own` cast "127.0.0.1" to IntPtr, exit 1; S5.md Findings 3); and `powershell -File` drops an empty
  argument — `-ArgLine ''` arrived with no value, `Missing an argument for parameter 'ArgLine'`, exit 1 (Run 15
  RET-1, Return 4; S7.md Findings 1): omit an empty parameter and let its default apply.
- **`npx` on Windows goes through `cmd.exe`, which refuses a long argument**: an ~8 000-character actor
  prompt via `npx tsx …` printed `The command line is too long.` and exited 1 with nothing sent
  (cmd's 8191-character limit); `node --import tsx …` worked (Run 12 MCP leg; S6.md candidate 14).
- **Chrome restarts and live sites** (Run 12; S6.md candidates 8, 11–13, 15): a window handle does not
  survive a Chrome restart (session restore brings windows back under new HWNDs) — find the window
  again or open your own; a full-window OS frame includes Chrome's own UI (the bookmark bar), so judge
  frames by numbers or crop to the viewport; Chrome resolves every `*.localhost` name to loopback with
  no DNS lookup (one 127.0.0.1 server can stand in for a second host); the login script's old post-submit
  check (address stable 4 s, at most 20 s) read the SSO page about 8 s after the press, yet the login had
  worked (decisions.md · 2026-10-23 · SDK-6/SDK-7 run in the session the login actually opened (#101)) — so
  since Step 10 S5 `bb-login.ps1` polls on a condition inside one `-WaitSec` bound (default 90) from the press:
  exit 0 on a delayed redirect where the old script exits 4, exit 4 at the bound on a stuck or foreign page (Run
  15 BBL-1: 90006 ms, 90013 ms; decisions.md · 2026-10-25 · S5: `bb-login.ps1`'s post-submit wait — exit rules and
  the hard bound (#215)), and the real pp1 login took one press (Run 15 PP1); session restore adds windows after
  a relaunch, so "exactly one new window" is no safe test — wait for a stable window set and pick only a window
  with a unique title marker (Run 15 Return 5; decisions.md · 2026-10-25 · RET-1's end safety read-back reads only
  a window the wave opens and marks (#223); S7.md Findings 3); and live data can
  change between two reads minutes apart (inferred from counts, not proven), so compare two
  transports over one held snapshot (decisions.md · 2026-10-23 · S6.3 compares one in-page export read through both paths (#103)).
- **A headless `claude -p` actor calls `ToolSearch` first unless tool search is off.** Claude Code 2.1.310 defers
  MCP tools, so an actor's first call was `ToolSearch`, and a row checking "the actor called exactly
  [browser_click]" failed while the page saw 9/9 trusted inputs (Run 15 MCPF-1, CAP-1 FAIL); with
  `ENABLE_TOOL_SEARCH=false` in the actor's environment (`recipes/s9-actor.ts --no-tool-search`) the
  re-measurements MCPF-1R and CAP-1R passed (S7.md Findings 2; `S7-wave-fixer2.md`, an offline dummy-MCP probe).
- **Occlusion guards meet windows you did not open.** An auto-hidden Windows taskbar is a visible topmost window
  whose 2 px strip lies inside the monitor's work area (`[x,1078,…,1126]` on a 1080-px monitor): cut placements
  at the taskbar (Run 14 Return 2; S1.md Findings 1). After a switch is toggled on the options page, a
  Chrome-owned topmost, no-activate popup (`Chrome_WidgetWin_1`, 223×25 px at the window's top right, owned by the
  options window) appears over it (Run 14 Return 3; Run 15 Return 3 and attempt 4; S1.md Findings 2, S7.md
  Findings 4); R15-3R exempted it only because a driver window owned it and it covered none of the read elements
  (#224). Park the cursor and print occluder diagnostics before a click that a guard protects (decisions.md ·
  2026-10-25 · S1: Run 14's wave mechanics are kept for Run 15 (#213)).
- **Expected texts are tied to the product's constants, and re-read from the code before a row is committed.** Run 13's
  SAFE-9 and SAFE-10 expected texts were wrong, not the product (the `safety state:` log line precedes `extension
  resync` by design; Chrome 156 titles the worker's DevTools window `DevTools`), and both rows stayed FAIL because
  expected text is never edited after its run (decisions.md · 2026-10-24 · S4: Dated notes on §4.20 for two
  expected-text errors (#195)). `recipes/test/s9-rules.test.ts` and `s10-rules.test.ts` compare every expected text
  with the committed constant it was copied from, so a wording change fails there first.
