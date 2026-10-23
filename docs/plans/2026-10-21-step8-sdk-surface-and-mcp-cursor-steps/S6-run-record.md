# S6 — run record (Run 12 (S6)), 2026-10-23

Rows and rules committed in `23b878f` before the build was loaded (S6.1). Attached: `S6-daemon-log.txt`
(36 lines; hygiene 0/0/0; course ids 0, ada.blackboard 0). No image, export or transcript is attached.

**STOPPED at step 8 (SDK-1), 13:18 UTC: a permission-classifier denial.** The driver's Bash call that
sends actor SA its second prompt (`t5-actor.ts send SA "<P0> 1. browser_snapshot with {}"`, the same
command form that ran a minute earlier) was refused by the Claude Code auto-mode classifier with
`Permission for this action was denied by the Claude Code auto mode classifier. Reason: [PII Data
Handling].` Under the integrity floor ("permission or classifier denials") and `long-run` §4 item 5 a
denial is reported, never retried or worked around, so the live part stopped there: the denied send was
not retried, SA was ended (`in.txt` holds 1 line: the second prompt never reached the actor), the driver's
windows were closed and the fixture server stopped. Steps 9–17's rows were **not run**: SM-0, MUX-1,
STAT-1, MUX-2, LEASE-1, the S5 MCP rows, SDK-8, the regression rows, SCREEN-1, SDK-6/SDK-7 live
(no Blackboard page was opened, no login was attempted) and SM-1/MUX-8 (Chrome was **not** restarted).
The pass rules and expected text are unchanged; nothing was edited after a run.

Chrome 156 (9 `chrome.exe` processes at the start), Node v25.2.1, Windows 11 Pro 10.0.26300. Run by the
driver (Claude Opus 5.5), the user not present (decisions.md #33). Times UTC.

**Shell set-up for every block.** The PowerShell tool keeps no state between calls, so every block began
by dot-sourcing one scratch file holding the wave sheet's set-up block verbatim (UTF-8 console, nvm's node
on `Path`, the §1 item 8 helpers, `. .\recipes\t5-win.ps1`, `$env:S6_OUT = "$env:TEMP\bridge-e2e\s6-run1"`,
`$env:T5_ACTORS`, `$U`, `$Chrome`, `$Fail`, `R`, `A`, `B1`, `Count`, `FailPng`), plus `TS` (UTC time) and
the driver windows' handles saved to files. Actor sends ran from Git Bash (`npx tsx recipes/t5-actor.ts`,
with `T5_ACTORS` set to the same directory), because Windows PowerShell 5.1 strips embedded `"` from a
native command's arguments and the prompts carry JSON.

**Set-up fix 1 (no row affected).** The sheet's `function R { npm run -s recipe -- @args; … }` is shadowed
in Windows PowerShell 5.1 by the built-in alias `R` → `Invoke-History`: the first stale-check call printed
`Invoke-History : A positional parameter cannot be found that accepts argument 'stale-check'.` and ran
nothing (no client connected; the log has no line for it). The prelude gained
`Remove-Item Alias:R -Force` before the function, and the stale check then ran once (below). Proposed for
the sheet's next revision: name the function something other than `R`.

**About the user's Chrome, counts only.** One browser window existed before the run (hwnd 527630); it was
never named, captured, typed into or closed by the driver. `Get-T5ChromeWindows` prints it with a fixture
title, as in Runs 8–11 (W1's old probe copy); it is not a driver window. It was the only Chrome window
again after the driver's close-down.

## Reload (step 2): exit 0

```
$ powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1 *> s6-run1\reload1.txt; $LASTEXITCODE   (13:15:09.791Z)
2026-10-23T13:15:10.304Z reload-extension: extension Chrome Agent Bridge, ID cpnemjbgecfbeicldpaaegbhjgjgjfep (from C:\Users\aliev\Projects\chrome-remote-extention\extension)
2026-10-23T13:15:10.467Z reload-extension: daemon running: no - only the UIA check will verify the reload
2026-10-23T13:15:10.922Z reload-extension: own window 4393936 opened
2026-10-23T13:15:11.865Z reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
2026-10-23T13:15:11.874Z reload-extension: pressed the reload button of the card
2026-10-23T13:15:15.432Z reload-extension: UIA: the card's service worker restart seen: yes; inspect views now: service worker, |  1 more…
2026-10-23T13:15:15.436Z reload-extension: RELOAD OK - the service worker restarted (UIA) after the press at 13:15:11.865Z; now run the stale-extension check
2026-10-23T13:15:15.660Z reload-extension: own window 4393936 closed
reload exit 0
```
(No daemon was running before the press, so only the UIA check verified it; the build is proved by step 3.)

## S6-STALE (step 3) — PASS

```
$ R recipes/s6.ts stale-check   (13:15:29.458Z)
2026-10-23T13:15:39.594Z s6-stale-check: connected — daemon build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, extension connected
2026-10-23T13:15:39.665Z s6-stale-check: opened T2 (background) at http://localhost:8080/e2e-playground.html?s6=stale
2026-10-23T13:15:39.680Z s6-stale-check: locate T2 {role:"button", name:"Sign in"} → ok {"name":"Sign in","ref":"e1","role":"button"} (9 ms)
2026-10-23T13:15:39.691Z s6-stale-check: STALE-CHECK NEW BUILD — the loaded extension answers locate: it is the S2-or-later build
exit 0
```
Expected `STALE-CHECK NEW BUILD` and exit 0 → observed. (`connected` came 10 s after the start: this call
spawned the daemon, which then waited for the reloaded extension's socket.)

## Set-up, before the reload (steps 0–1)

```
time 13:14:34.085Z
Test-Path S6_OUT: False
23b878f docs(step8): S6 — wave sheet, expected text, recipes (pre-run)
c53dd00 docs(step8): the user's grants for SDK-6/SDK-7 and SM-1 — decision #96
6a97635 docs(step8): S5 closed — decision #95, #59 updated; as-built S5
status(ext/daemon/shared/sdk/mcp): []
driver chain: 30308 19220 25820 2272 256 12176 3220 14556
mcp procs total: 0
daemon:
9234 listen:
BRIDGE_TOKEN: False
bridge.token
exports/x.json
8080 listen:
node v25.2.1
chrome procs: 9
```
(`mcp procs total: 0` = no `mcp\dist\index.js` process at all, so none descends from the driver's chain;
`daemon:` and `9234 listen:` empty = no daemon, nothing on 9234. The working tree had one modified file,
`S6.ledger.md`, docs only.)

```
fixture server pid 27624
fixture 200 13106
tsc exit 0
vitest exit 0
 Test Files  4 passed (4)
      Tests  120 passed (120)
time 13:14:54.327Z
```
(fixture server: `$HOME\miniconda3\python.exe -I -m http.server 8080 --bind 127.0.0.1 --directory
test-fixtures`, `-WindowStyle Hidden`, stderr to `s6-run1\http8080.log`; `npx tsc --noEmit -p
recipes/tsconfig.s6.json`; `npx vitest run recipes/`.)

```
$ npm run build *> s6-run1\build.txt; "build exit $LASTEXITCODE"   (13:15:00.291Z)
build exit 0
… built mcp → dist/index.js … built extension → dist/
daemon build: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
status(ext/daemon/shared/sdk/mcp): []
```

## Daemon (4) — PASS

```
$ Get-BridgeLog 8   (13:15:46.318Z)
2026-10-23T08:37:52Z client + "t5-cleanup" (1 client)
2026-10-23T08:37:52Z client - "t5-cleanup" (0 clients)
2026-10-23T13:15:30Z start pid=25652
2026-10-23T13:15:30Z config pid=25652 port=9234 idleMs=600000 build=597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
2026-10-23T13:15:30Z listening on 127.0.0.1:9234
2026-10-23T13:15:30Z client + "s6-stale-check" (1 client)
2026-10-23T13:15:39Z extension resync: 1 tabs, 0 gone
2026-10-23T13:15:39Z client - "s6-stale-check" (0 clients)
$ Get-BridgeDaemon → ProcessId 25652, ParentProcessId 22028, CreationDate 10/23/2026 5:15:30 PM (local)
$ 9234 listener → OwningProcess 25652
build file: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
```
The `config` build = step 1's `Get-DaemonBuild` = the stale check's `connected — daemon build` sha; the
9234 holder is that daemon (pid 25652; its parent 22028 was the stale-check recipe, since exited).

## Driver window (5)

```
time 13:15:54.818Z
chrome windows before: 527630 (the user's window, not touched)
Ws = 2362278 Agent Bridge E2E Playground - Google Chrome
foreground: True
T3 fixture
```

## SDK-6D, SDK-7D (6) — PASS, PASS

```
$ R recipes/blackboard/boot-bb.ts _1_1 --dry-run   (13:16:10.143Z)
2026-10-23T13:16:10.664Z boot-bb: course _1_1; source stub-bb.js (declares VERSION stub-2026-10-23, sha256 26ee6322a410…); DRY RUN
2026-10-23T13:16:10.737Z boot-bb: opened T4 (background) for course _1_1 — dry run on the localhost fixture
2026-10-23T13:16:10.757Z boot-bb: T4 loaded; origin and course checked
2026-10-23T13:16:10.767Z boot-bb: bb.js evaluated: "bb loaded"
2026-10-23T13:16:10.770Z boot-bb: bb.VERSION = stub-2026-10-23
2026-10-23T13:16:10.770Z boot-bb: SDK-6 (dry run) PASS — bb.VERSION stub-2026-10-23 from the stub, loaded by evaluate (no 8765 server)
2026-10-23T13:16:10.782Z boot-bb: closed T4
exit 0
$ R recipes/blackboard/export-grades.ts _1_1 --dry-run
2026-10-23T13:16:11.352Z export-grades: course _1_1; source stub-bb.js (declares VERSION stub-2026-10-23, sha256 26ee6322a410…); DRY RUN
2026-10-23T13:16:11.423Z export-grades: opened T5 (background) for course _1_1 — dry run on the localhost fixture
2026-10-23T13:16:11.432Z export-grades: T5 loaded; origin and course checked
2026-10-23T13:16:11.441Z export-grades: bb.js evaluated: "bb loaded"
2026-10-23T13:16:11.444Z export-grades: bb.VERSION = stub-2026-10-23
2026-10-23T13:16:11.459Z export-grades: page export done in 15 ms: 2 columns, 4 grade records, 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c
2026-10-23T13:16:11.459Z export-grades: MCP leg size: 626 characters → 1 chunk(s) of 8000; measurable: yes
2026-10-23T13:16:11.462Z export-grades: pulled 1 chunk(s); length, bytes and sha256 equal the page's: yes
2026-10-23T13:16:11.467Z export-grades: written exports\dry-_1_1-2026-10-23.json — 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c
2026-10-23T13:16:11.467Z export-grades: SDK-7 (SDK leg, dry run) PASS — 2 columns, 4 grade records; file sha256 = page sha256
2026-10-23T13:16:11.478Z export-grades: closed T5
exit 0
$ Get-FileHash exports\dry-_1_1-*.json -Algorithm SHA256
Hash : 92FE62ABC12D1AC759E6B29F287520A7A486BE9150666372028E1027D389A49C
$ Remove-Item exports\dry-_1_1-*.json → after remove: 0
```
(`_1_1` is the dry run's dummy course id on the localhost stub, not a Blackboard id.)

## SDK-2…5 (7) — PASS ×4

Failures folder before: `F0 count: 0`.

```
$ B1 → T3 fixture
$ R recipes/s6.ts sdk2   (13:16:19.977Z)
2026-10-23T13:16:21.983Z s6-sdk2: opened T6 (background) at http://localhost:8080/e2e-playground.html?s6=sdk2
2026-10-23T13:16:22.173Z s6-sdk2: click {role:"button", name:"Sgin in"} → LOCATOR_NOT_FOUND: no button named "Sgin in". Nearest: button "Sign in", button "Disabled action", button "Load message in 1.5s", button "Shadow button", button "Trusted-only button".
2026-10-23T13:16:22.173Z s6-sdk2: candidates (5): button "Sign in", button "Disabled action", button "Load message in 1.5s", button "Shadow button", button "Trusted-only button"
2026-10-23T13:16:22.173Z s6-sdk2: screenshotPath: C:\Users\aliev\.chrome-agent-bridge\failures\2026-10-23T13-16-21-999Z-T6.png; exists: yes; outside the repo: yes
2026-10-23T13:16:22.173Z s6-sdk2: attachErrors: []
2026-10-23T13:16:22.174Z s6-sdk2: --- report (40 lines) ---
LOCATOR_NOT_FOUND: no button named "Sgin in". Nearest: button "Sign in", button "Disabled action", button "Load message in 1.5s", button "Shadow button", button "Trusted-only button".
Nearest candidates:
  - button "Sign in" [ref=e5]
  - button "Disabled action" [ref=e20]
  - button "Load message in 1.5s" [ref=e21]
  - button "Shadow button" [ref=e13]
  - button "Trusted-only button" [ref=e7]
Refs: this snapshot renumbered the tab's refs — refs from before the failure are void; use the refs shown.
url: http://localhost:8080/e2e-playground.html?s6=sdk2   title: "Agent Bridge E2E Playground"
- textbox "Email address" [ref=e1]
- textbox "Password" [ref=e2]
- textbox "Search query" [ref=e3]
- combobox "Favorite fruit" [ref=e4]
- button "Sign in" [ref=e5]
- button "Click counter: 0" [ref=e6]
- button "Trusted-only button" [ref=e7]
- button "Hover me" [ref=e8]
- link "Jump to bottom" [ref=e9]
- link "Open popup" [ref=e10]
- textbox "Trusted-only input" [ref=e11]
- button "Trusted-click hit pad" [ref=e12]
- button "Shadow button" [ref=e13]
- button "Iframe button" [ref=e14]
- spinbutton "Quantity" [ref=e15]
- slider "Volume" [ref=e16]
- listbox "Tags" [ref=e17]
- textbox "Notes editor" [ref=e18]
- tab "Details tab" [ref=e19]
- button "Disabled action" [ref=e20] [disabled]
- button "Load message in 1.5s" [ref=e21]
- button "Fetch JSON" [ref=e22]
- button "Fetch 404" [ref=e23]
- button "POST form" [ref=e24]
- button "Fetch redirect" [ref=e25]
- button "Fetch unreachable" [ref=e26]
- button "Fetch black hole" [ref=e27]
- button "Fetch cross-origin" [ref=e28]
- button "Fetch 20×" [ref=e29]
Screenshot: C:\Users\aliev\.chrome-agent-bridge\failures\2026-10-23T13-16-21-999Z-T6.png
Network: no failed requests among the tab's last 1 entry.
2026-10-23T13:16:22.175Z s6-sdk2: --- end report ---
2026-10-23T13:16:22.191Z s6-sdk2: SDK-2 PASS — LOCATOR_NOT_FOUND names button "Sign in" first; screenshot saved outside the repo; the report shows the snapshot window
exit 0
```
SDK-2 PASS: code, message, the five candidates in the expected order (no `finding:` line), the report's
`Nearest candidates:` / candidate / snapshot / `Screenshot:` lines (40 ≤ 60), PNG outside the repo,
`attachErrors: []`; the `Network: no failed requests …` branch.

```
$ B1 → T3 fixture
$ R recipes/s6.ts sdk3
2026-10-23T13:16:23.913Z s6-sdk3: opened T7 (background) at http://localhost:8080/e2e-playground.html?s6=sdk3
2026-10-23T13:16:24.094Z s6-sdk3: locate {role:"button", name:"Fetch"} → LOCATOR_AMBIGUOUS: 7 elements match button named "Fetch"; pass nth (0-based) to pick one, or narrow the locator.
2026-10-23T13:16:24.094Z s6-sdk3: matches (7): "Fetch JSON", "Fetch 404", "Fetch redirect", "Fetch unreachable", "Fetch black hole", "Fetch cross-origin", "Fetch 20×"
2026-10-23T13:16:24.095Z s6-sdk3: --- report (42 lines) ---
LOCATOR_AMBIGUOUS: 7 elements match button named "Fetch"; pass nth (0-based) to pick one, or narrow the locator.
Matches (7):
  - "Fetch JSON"
  - "Fetch 404"
  - "Fetch redirect"
  - "Fetch unreachable"
  - "Fetch black hole"
  - "Fetch cross-origin"
  - "Fetch 20×"
Refs: this snapshot renumbered the tab's refs — refs from before the failure are void; use the refs shown.
url: http://localhost:8080/e2e-playground.html?s6=sdk3   title: "Agent Bridge E2E Playground"
[the same 29 snapshot lines as SDK-2's report, e1 … e29, byte-identical]
Screenshot: C:\Users\aliev\.chrome-agent-bridge\failures\2026-10-23T13-16-23-929Z-T7.png
Network: no failed requests among the tab's last 1 entry.
2026-10-23T13:16:24.095Z s6-sdk3: --- end report ---
2026-10-23T13:16:24.107Z s6-sdk3: locate {role:"button", name:"Fetch", nth:1} → e23 button "Fetch 404"
2026-10-23T13:16:24.113Z s6-sdk3: click {role:"button", name:"Fetch", nth:0} → ok
2026-10-23T13:16:24.124Z s6-sdk3: status line: "status: fetch ok.json -> 200"
2026-10-23T13:16:24.137Z s6-sdk3: SDK-3 PASS — 7 matches listed; nth:1 is Fetch 404; nth:0 clicked Fetch JSON
exit 0
```
(The 29 lines were compared in `s6-run1\sdk2.txt` / `sdk3.txt`; abbreviated here only.)

Failures folder after: `F1 count: 2`, new 2 = `2026-10-23T13-16-21-999Z-T6.png`,
`2026-10-23T13-16-23-929Z-T7.png` (the two `screenshotPath:`/`Screenshot:` paths), 35 312 bytes each;
both deleted (`Remove-Item (Join-Path $Fail <name>)`), never opened; `FailPng` count after: 0.

```
$ B1 → T3 fixture
$ R recipes/s6.ts sdk4   (13:16:41.066Z)
2026-10-23T13:16:42.738Z s6-sdk4: opened T8 (background) at http://localhost:8080/e2e-playground.html?s6=sdk4
2026-10-23T13:16:42.753Z s6-sdk4: click {role:"button", name:"Load message in 1.5s"} → ok
2026-10-23T13:16:44.751Z s6-sdk4: waitFor {locator:{text:"Async content loaded!"}} → ok after 1998 ms
2026-10-23T13:16:44.758Z s6-sdk4: evaluate: #async-area emptied
2026-10-23T13:16:44.767Z s6-sdk4: waitFor {locator:{text:"Async content loaded!"}, state:"hidden"} → ok after 9 ms
2026-10-23T13:16:44.782Z s6-sdk4: SDK-4 PASS — visible after 1998 ms, hidden after 9 ms
exit 0
$ B1 → T3 fixture
$ R recipes/s6.ts sdk5
2026-10-23T13:16:46.525Z s6-sdk5: opened T9 (background) at http://localhost:8080/e2e-playground.html?s6=sdk5
2026-10-23T13:16:46.533Z s6-sdk5: before: T9 is the human's tab (current): no
2026-10-23T13:16:46.544Z s6-sdk5: evaluateRef("document.querySelector('#email')") → e1
2026-10-23T13:16:46.549Z s6-sdk5: elements still carrying data-__bridge-mark: 0
2026-10-23T13:16:46.585Z s6-sdk5: click e1 {trusted:true} → ok (36 ms; policy focusFirst sends focusTab first, #89)
2026-10-23T13:16:46.594Z s6-sdk5: status line: "status: hit at 149,295 exp 953,754 on=email (isTrusted=true)"; document.activeElement: #email
2026-10-23T13:16:46.596Z s6-sdk5: after: T9 is the human's tab (current): yes (informational: focusFirst leaves it in front)
2026-10-23T13:16:46.618Z s6-sdk5: SDK-5 PASS — trusted click on e1 reached #email (isTrusted=true); no mark left
exit 0
$ Set-T5Foreground Ws → True; B1 → T3 fixture
FailPng: 0
```
SDK-4: 1200 ≤ 1998 ≤ 5000, 9 ≤ 1000 → PASS. SDK-5: ref `e1`, the status line matches the pre-registered
regex, activeElement `#email`, mark count 0 → PASS.

## SDK-1 (8) — not complete (stopped by the classifier denial)

```
$ $W1 = Open-T5Window "${U}sdk1-claude"   (13:17:17.893Z) → W1 = 10882048; Set-T5Foreground → True; B1 → T10 fixture
$ A start SA --tools 'browser_snapshot'   (13:17:26.300Z)
2026-10-23T13:17:27.570Z actor SA: started — host pid 24060, claude pid 460, model sonnet, tools mcp__chrome-agent-bridge__browser_snapshot; files in C:\Users\aliev\AppData\Local\Temp\bridge-e2e\s6-run1\actors\SA
$ A send SA "<P0> 1. browser_snapshot with {}"
2026-10-23T13:17:28.904Z SENT to SA: You are an E2E test actor. Call exactly the tools listed below, in order, with exactly the arguments shown, and no other tool. Do not retry a failed call. After the last call reply only DONE. 1. browser_snapshot with {}
2026-10-23T13:17:38.174Z INIT session 3b5db55b-b9c3-461b-8440-60d1953d8d37 · mcp [{"name":"chrome-agent-bridge","status":"connected","source":"user"}, …]
2026-10-23T13:17:40.987Z TOOL ToolSearch {"query":"select:mcp__chrome-agent-bridge__browser_snapshot","max_results":1}
2026-10-23T13:17:44.825Z TOOL mcp__chrome-agent-bridge__browser_snapshot {}
2026-10-23T13:17:44.850Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html?t5=sdk1-claude   title: "Agent Bridge E2E Playground"
    - textbox "Email address" [ref=e1]
    …
    - button "Sign in" [ref=e5]
    …
2026-10-23T13:17:46.356Z SAYS DONE
2026-10-23T13:17:47.733Z RESULT-OF-TURN success · DONE
```
(`ToolSearch` is the headless session loading the deferred bridge tool's schema, not a bridge call.)

```
$ R recipes/sdk-login.ts   (13:18:00.318Z)
2026-10-23T13:18:00.965Z sdk-login: connected — daemon build 597d6c28abd1…, extension connected
2026-10-23T13:18:01.024Z sdk-login: opened T11 (background) at http://localhost:8080/e2e-playground.html?s6=sdk1
2026-10-23T13:18:01.035Z sdk-login: locate {role:"button", name:"Sign in"} → e1 button "Sign in"
2026-10-23T13:18:01.039Z sdk-login: click e1 → ok
2026-10-23T13:18:01.043Z sdk-login: waitFor {text:"form submitted"} → ok after 4 ms
2026-10-23T13:18:01.052Z sdk-login: status line: "status: form submitted (email = )"
2026-10-23T13:18:01.067Z sdk-login: closed T11
2026-10-23T13:18:01.067Z sdk-login: SDK-1 PASS — located button "Sign in", clicked, the page says "status: form submitted (email = )" (118 ms in all)
exit 0
fg window: 10882048  W1=10882048
```
(The foreground window was still W1 after the script: the screen did not change.)

The next step, `A send SA "<P0> 1. browser_snapshot with {}"` (SA's second snapshot), was **denied by the
classifier** (text above) and not retried. Close-down:

```
$ A end SA   (13:18:51.041Z)
in.txt lines: 1
2026-10-23T13:18:52.537Z actor SA ended after 506 ms: 2026-10-23T13:18:52.444Z exit code 0
$ Get-BridgeLog 8
2026-10-23T13:16:48Z client + "t5-find" (1 client)
2026-10-23T13:16:48Z client - "t5-find" (0 clients)
2026-10-23T13:17:20Z client + "t5-find" (1 client)
2026-10-23T13:17:20Z client - "t5-find" (0 clients)
2026-10-23T13:17:28Z client + "claude-code #29476" (1 client)
2026-10-23T13:18:00Z client + "sdk-login" (2 clients)
2026-10-23T13:18:01Z client - "sdk-login" (1 client)
2026-10-23T13:18:52Z client - "claude-code #29476" (0 clients)
$ Close-T5Window W1; Close-T5Window Ws → chrome windows after: 527630 only
```
SDK-1's clauses seen: the script's lines and exit 0 (all as expected), SA's first snapshot of
`?t5=sdk1-claude` with `button "Sign in" [ref=e5]`, no error; the log's `client + "sdk-login" (2 clients)` /
`client - "sdk-login" (1 client)` pair; the screen unchanged. **Not seen:** SA's second snapshot (the row's
"A's two snapshots" clause). Verdict: **not complete** — neither PASS nor FAIL.

## SM-0 (9) · MUX-1, STAT-1, MUX-2 (10) · LEASE-1 (11) · S5 rows (12) · SDK-8 (13) · Regression + SCREEN-1 (14)

Not run (stopped at step 8).

## SDK-6/SDK-7 live on pp1 (15)

Not run (stopped at step 8). `bb-login.ps1` was not started; no Blackboard page or window was opened;
nothing was read from or written to Blackboard. No `exports\pp1-*` file exists from this run.

## SM-1 + MUX-8 (16)

Not run (stopped at step 8). **Chrome was not restarted** (the grant of #96 is unused); MUX-8 not run.

## Hygiene (17)

```
$ Test-SafeToKill 27624 (python.exe, the fixture server this run started) → safe: the tree of 27624 does not contain the driver
$ Stop-Process 27624 → 8080 listen after: []
http8080.log GET playground 200 count: 10
Get-BridgeDaemon → ProcessId 25652, ParentProcessId 22028   (left running; it exits on idle, 600 000 ms with no client)
mcp procs: 0
FailPng: 0
```
- Daemon log: `S6-daemon-log.txt` = `daemon.log` from step 1's `start pid=25652` line (the line before its
  `config` line, line 574) to the end at 13:19Z: 36 lines; counts `://` 0, token 0 (read into a variable,
  then `Remove-Variable`), `[line withheld:` 0, `_\d+_\d+` 0, `ada.blackboard` 0.
- Failure PNGs: 2 created (SDK-2, SDK-3), both under `C:\Users\aliev\.chrome-agent-bridge\failures`
  (outside the repo), both deleted; `FailPng` at the end: 0.
- Exports: the two dry-run files were never created as live files; the one dry-run file
  (`exports\dry-_1_1-2026-10-23.json`) was deleted in step 6; `git check-ignore exports/x.json` printed it.
- Actor SA's `out.jsonl` (`%TEMP%\bridge-e2e\s6-run1\actors\SA`) and its transcript
  (`~/.claude/projects/…/3b5db55b-b9c3-461b-8440-60d1953d8d37.jsonl`) hold fixture text only.
- S6.4 `git status --short`, taken after this file and the e2e plan block were written:

```
$ git check-ignore exports/x.json → exports/x.json
exports staged: []
$ git status --short
 M docs/e2e-test-plan.md
 M docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6.ledger.md
?? docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-daemon-log.txt
?? docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-run-record.md
```
(`S6.ledger.md` was already modified before the run, by the step agent.) No path under `exports/`, nothing
from `~/.chrome-agent-bridge/`, no PNG. The real pp1 internal ids (the 3 id-shaped values on the skill
table's pp1 line, read into a variable and never printed) occur 0 times in this record, the attached log,
the e2e plan and the run's output files; the token 0 times in each. `ada.blackboard` appears in this
record and the plan only in the hygiene labels ("ada.blackboard 0") and the plan's pre-existing SDK-6 row.

## Watch items seen

- The reload recipe's "same second" proof vs the 2 s marker wait (#94): not testable this run — no daemon
  was running at the press, so no `resync` line could pair with it (the reload exit is 13:15:15.697Z; the
  first `extension resync` is 13:15:39Z, after the stale check spawned the daemon).
- `waitFor {text}` on a background tab past its bound: not seen (SDK-4: 1998 ms).
- A residual `data-__bridge-mark`: not seen (SDK-5: 0).
- The other items (late-restore race, error-page `TIMEOUT`, `onStartup` > 2 s, background-tab tracking,
  SM-1's reload path): their rows were not run.

## Findings

1. **STOP — classifier denial** (`[PII Data Handling]`) on an actor send at SDK-1's second snapshot; the
   live part stopped. The denied command was a fixture-page snapshot prompt; the reason given does not
   name what in it was judged PII. Waits for the user (an allow rule for the actor sends, or a ruling on
   how the wave may proceed, especially SDK-7's student-data leg).
2. **Set-up fix 1:** the sheet's `function R` is shadowed by PowerShell's `R` alias (`Invoke-History`);
   proposed for the sheet: another name (decision for the step agent; no row text changes).
3. **Observation (SDK-2/SDK-3):** each call returned 190–220 ms after its tab opened, screenshot included,
   and the two PNGs had the same size (35 312 bytes). The row's "human's tab hidden for about 1.5 s" was
   not measured by these scripts (no page-side timestamps), so no flash figure is recorded; whether the
   report's capture switched tabs at all is not established by this run.
4. **Observation (SDK-5):** `hit at 149,295 exp 953,754` — the hit point and `exp` differ; the
   pre-registered regex accepts any numbers and the row's clauses are about `on=email` and `isTrusted`,
   so this is recorded, not judged.

## Verdict per row

| Row | Verdict | Observed vs expected |
|---|---|---|
| Reload | exit 0 | `RELOAD OK …`, exit 0 |
| S6-STALE | PASS | `STALE-CHECK NEW BUILD …`, exit 0 |
| Daemon (4) | PASS | config build = `Get-DaemonBuild` = stale check's sha `597d6c28…34da3f` |
| SDK-6D | PASS | `SDK-6 (dry run) PASS — bb.VERSION stub-2026-10-23 …`, exit 0 |
| SDK-7D | PASS | every expected line; `Get-FileHash` = `92FE62AB…A49C` |
| SDK-2 | PASS | `SDK-2 PASS`; candidates in the expected order; report 40 lines |
| SDK-3 | PASS | `SDK-3 PASS`; 7 matches; nth:1 `Fetch 404`; `status: fetch ok.json -> 200` |
| SDK-4 | PASS | visible after 1998 ms, hidden after 9 ms |
| SDK-5 | PASS | `on=email (isTrusted=true)`, `#email`, mark 0 |
| SDK-1 | not complete | script PASS, SA snapshot 1 ok, log pair ok; SA snapshot 2 not run (denial) |
| SM-0, MUX-1, STAT-1, MUX-2, LEASE-1, CUR-1, CUR-2, CUR-3, LOC-1, LOC-2, ASREF-1, REP-1, TAB-3, NET-12, SDK-8, ACT-1, ACT-2, ACT-3, TRUST-2, EVAL-1, NET-1, DL-1, SCREEN-1 | not run | stopped at step 8 |
| SDK-6, SDK-7 (live) | not run | stopped before step 15; no login attempted |
| SM-1, MUX-8 | not run | stopped before step 16; Chrome not restarted |

Counts (rows): 7 PASS (S6-STALE, SDK-6D, SDK-7D, SDK-2, SDK-3, SDK-4, SDK-5), 0 FAIL, 1 not complete
(SDK-1), 27 not run; the set-up checks (reload exit 0, daemon build) held.
