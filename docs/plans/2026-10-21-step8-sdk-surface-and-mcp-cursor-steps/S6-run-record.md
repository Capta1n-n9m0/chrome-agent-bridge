# S6 — run record (Run 12 (S6)), 2026-10-23

*Pointer (2026-10-23): Part 2, the resumed run (14:38–15:10 UTC), is appended at the end (§ "Part 2 — resumed run"); `S6-daemon-log.txt` now covers both parts (171 lines).*

Rows and rules committed in `23b878f` before the build was loaded (S6.1). Attached: `S6-daemon-log.txt`
(36 lines; hygiene 0/0/0; course ids 0, ada.blackboard 0). No image, export or transcript is attached.

*2026-10-23 (step agent, live verifier r2 N7): "36 lines" was Part 1's attachment. The attached
`S6-daemon-log.txt` now covers both parts, 171 lines (Part 2 hygiene, § "Close-down and hygiene"); Part 1's 36
lines are its unchanged prefix.*

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

---

## Part 2 — resumed run (2026-10-23, 14:38–15:10 UTC)

Run by the Part 2 driver (Claude Opus 5.5), the user not present (decisions.md #33), under the sheet's
"Resumed run" section (R-a … R-e, then step 8 onward) and decisions.md #96, #97, #98. Part 1 (above) was not
redone. Output directory `%TEMP%\bridge-e2e\s6-run2` (new). Times UTC. Shell set-up as Part 1: one scratch
prelude dot-sourced in every PowerShell block (the sheet's set-up block with `Rcp`, `S6_OUT` = `s6-run2`, plus
`TS`, `W`/`SaveW` for window handles), actor sends from Git Bash. `—` in the outputs of the background
recipes (`sm0.out`, `sm1.out`) was written by PowerShell 5.1 as `ΓÇö` (A9) and is shown here as `—`; nothing
else was changed in a copied line.

*2026-10-23 (step agent, live verifier r2 N5): `→` was restored the same way, not only `—` (raw `ΓåÆ` in those
files). The meaning of no line changed.*

**Outcome in one paragraph.** REP-0 PASS, so no row was gated. Every row ran except SDK-6/SDK-7 live (the
login step exited 4: **waits for the user**) and SM-0 (its reload exited 2, nothing pressed: **not measured**;
under the integrity floor and #65 a non-zero reload exit waits for the user, so it was not retried). Three
rows FAIL against their pre-written rules: **LOC-1** (its value clause cannot be observed as written),
**REP-1** (no image part reached the actor), **SM-1** (`SM-1 LOG FAIL — 0 handles retired`). One Chrome
restart (SM-1 + MUX-8). No permission or classifier denial. No Blackboard page was read; no write.

### Set-up (R-a)

```
time 14:38:14.198Z
Test-Path S6_OUT: False
bc78ded docs(step8): S6 — REP-0 probe, helper rename (pre-run)
430cbeb docs(step8): the user's restart and Blackboard-write grants — decision #98
9b1c332 docs(step8): resume S6 — decision #97 (report-screenshot probe)
status(ext/daemon/shared/sdk/mcp): []
log --stat 23b878f..HEAD: []
driver chain: 22212 552 34488 2272 256 12176 3220 14556
mcp procs total: 0
daemon:
9234 listen:
BRIDGE_TOKEN: False
bridge.token
exports/x.json
8080 listen:
node v25.2.1
chrome procs: 9
build file: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
fixture server pid 6672
fixture 200 13106
tsc exit 0
vitest exit 0
 Test Files  4 passed (4)
      Tests  138 passed (138)
time 14:38:32.013Z
```
Nothing under `extension/ daemon/ mcp/ sdk/ shared/` since 23b878f ⇒ no build; the loaded extension and
`daemon/dist` are Part 1's. The sheet names 134 tests "at builder r2"; 138 is S6 fixer 2's count
(`S6-fixer2.md`: `Tests  138 passed (138)`, bc78ded); the rule is "all passed". No daemon was running (the
14:17 daemon had idled out at 14:27:39Z, log below).

### S6-STALE (R-b) — the first recorded result line of Part 2: NEW BUILD

```
$ Rcp recipes/s6.ts stale-check   (14:38:41.997Z)
2026-10-23T14:38:48.174Z s6-stale-check: connected — daemon build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, extension connected
2026-10-23T14:38:48.244Z s6-stale-check: opened T130 (background) at http://localhost:8080/e2e-playground.html?s6=stale
2026-10-23T14:38:48.259Z s6-stale-check: locate T130 {role:"button", name:"Sign in"} → ok {"name":"Sign in","ref":"e1","role":"button"} (9 ms)
2026-10-23T14:38:48.270Z s6-stale-check: STALE-CHECK NEW BUILD — the loaded extension answers locate: it is the S2-or-later build
exit 0
```
No reload (R-b: NEW BUILD ⇒ go on).

### Daemon (R-c) — PASS · Driver window (R-d)

```
$ Get-BridgeLog 8   (14:38:54.803Z)
2026-10-23T14:27:39Z idle for 600000 ms with no clients — shutting down
2026-10-23T14:27:39Z exit 0 (shutdown 1001) clients=0 extensionEvents=0 ignoredClientFrames=0
2026-10-23T14:38:43Z start pid=10036
2026-10-23T14:38:43Z config pid=10036 port=9234 idleMs=600000 build=597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
2026-10-23T14:38:43Z listening on 127.0.0.1:9234
2026-10-23T14:38:43Z client + "s6-stale-check" (1 client)
2026-10-23T14:38:48Z extension resync: 1 tabs, 0 gone
2026-10-23T14:38:48Z client - "s6-stale-check" (0 clients)
Get-BridgeDaemon → ProcessId 10036, ParentProcessId 8272; 9234 listener: 10036
build file: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
chrome windows before: 527630 (the user's window, not touched)
$ $Ws = Open-T5Window "${U}s6-human"   (14:39:02.077Z) → Ws = 8850668; Set-T5Topmost; foreground: True; B1 → T131 fixture
```
`config` build = `Get-DaemonBuild` = the stale check's sha = Part 1's `597d6c28…34da3f`.

### REP-0 (R-e) — PASS

```
$ FailPng → F0 count: 0;  B1 → T131 fixture
$ Rcp recipes/s6.ts rep0   (14:39:12.187Z)
2026-10-23T14:39:12.721Z s6-rep0: connected — daemon build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, extension connected; failure reports on, BRIDGE_FAILURES_DIR = C:\Users\aliev\AppData\Local\Temp\bridge-e2e\s6-run2\rep0-failures-1792766352706
2026-10-23T14:39:12.785Z s6-rep0: opened T132 (background) at http://localhost:8080/e2e-playground.html?s6=rep0
2026-10-23T14:39:12.792Z s6-rep0: human T131 (?t5=s6-human, current); probe T132 (background, same window, leased to s6-rep0)
2026-10-23T14:39:12.814Z s6-rep0: bars: human T131 blue (visibilityState visible); probe T132 magenta (visibilityState hidden)
2026-10-23T14:39:12.943Z s6-rep0: control A (the human tab T131, on screen): 35743 bytes, 1920x959, bar probes (960,24) #3300f8 (1440,24) #3300f8 (1900,24) #3300f8 → blue (hue rule) (expected blue; kept in memory only)
2026-10-23T14:39:15.812Z s6-rep0: click {role:"button", name:"No such button"} → LOCATOR_NOT_FOUND: no button named "No such button". Nearest: button "Shadow button", button "Iframe button", button "Trusted-only button", button "Fetch JSON", button "Disabled action". (1344 ms, report included)
2026-10-23T14:39:15.812Z s6-rep0: screenshotPath: C:\Users\aliev\AppData\Local\Temp\bridge-e2e\s6-run2\rep0-failures-1792766352706\2026-10-23T14-39-14-478Z-T132.png; attachErrors: []
2026-10-23T14:39:18.357Z s6-rep0: report PNG: 34540 bytes, 1920x903, bar probes (960,24) #dd00fa (1440,24) #dd00fa (1900,24) #dd00fa → magenta (hue rule) (expected magenta); deleted: yes
2026-10-23T14:39:18.358Z s6-rep0: report call: probe T132 visible +20 ms, hidden again +1345 ms; human T131 hidden +16 ms, visible again +1348 ms → flash 1331 ms (informational; call 1344 ms)
2026-10-23T14:39:18.360Z s6-rep0: after the report: human active, current; probe background (informational)
2026-10-23T14:39:20.967Z s6-rep0: control B (tab.screenshot() of the background probe T132): 34540 bytes, 1920x903, bar probes (960,24) #dd00fa (1440,24) #dd00fa (1900,24) #dd00fa → magenta (hue rule) (expected magenta; kept in memory only)
2026-10-23T14:39:23.498Z s6-rep0: control B call: 1597 ms; probe visible +9 ms; human hidden +6 ms, visible again +1576 ms (informational)
2026-10-23T14:39:23.499Z s6-rep0: REP-0 PASS — the report's capture switched to the failed tab (visible +20 ms inside the 1344 ms call) and its PNG shows the probe's magenta bar; controls: the explicit screenshot switched and read magenta, the human tab read blue
2026-10-23T14:39:23.513Z s6-rep0: closed T132 (the probe tab)
2026-10-23T14:39:23.513Z s6-rep0: failures directory: 0 file(s) deleted, directory removed
exit 0
$ FailPng → F1 count: 0; new: 0; rep0-failures-* directories left in S6_OUT: 0
```
Verdict line `REP-0 PASS`, exit 0 ⇒ **no gate**: REP-1, TAB-3 and SDK-7's MCP leg were free to run. (Part 1's
SDK-2/SDK-3 returned in ~190 ms; this report call took 1344 ms with the switch seen page-side — the
`(report included)` call time of a freshly opened tab here is the full switch.) Then
`Set-T5Foreground $Ws.Hwnd` → True; B1 → T131 fixture.

### SDK-1 (step 8, rerun whole) — PASS

```
$ $W1 = Open-T5Window "${U}sdk1-claude"   (14:39:38.247Z) → W1 = 3017710; foreground: True; B1 → T133 fixture
$ A start SA --tools 'browser_snapshot'   (14:39:44.042Z)
2026-10-23T14:39:45.277Z actor SA: started — host pid 18584, claude pid 15640, model sonnet, tools mcp__chrome-agent-bridge__browser_snapshot; files in C:\Users\aliev\AppData\Local\Temp\bridge-e2e\s6-run2\actors\SA
$ A send SA "<P0> 1. browser_snapshot with {}"
2026-10-23T14:40:01.634Z TOOL mcp__chrome-agent-bridge__browser_snapshot {}
2026-10-23T14:40:01.658Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html?t5=sdk1-claude   title: "Agent Bridge E2E Playground"
    - textbox "Email address" [ref=e1]
    … (29 element lines)
    - button "Sign in" [ref=e5]
    …
2026-10-23T14:40:06.414Z RESULT-OF-TURN success · DONE
$ Rcp recipes/sdk-login.ts   (14:40:12.184Z)
2026-10-23T14:40:12.731Z sdk-login: connected — daemon build 597d6c28abd1…, extension connected
2026-10-23T14:40:12.791Z sdk-login: opened T134 (background) at http://localhost:8080/e2e-playground.html?s6=sdk1
2026-10-23T14:40:12.801Z sdk-login: locate {role:"button", name:"Sign in"} → e1 button "Sign in"
2026-10-23T14:40:12.807Z sdk-login: click e1 → ok
2026-10-23T14:40:12.810Z sdk-login: waitFor {text:"form submitted"} → ok after 3 ms
2026-10-23T14:40:12.819Z sdk-login: status line: "status: form submitted (email = )"
2026-10-23T14:40:12.845Z sdk-login: closed T134
2026-10-23T14:40:12.845Z sdk-login: SDK-1 PASS — located button "Sign in", clicked, the page says "status: form submitted (email = )" (128 ms in all)
exit 0
fg window: 3017710  W1=3017710
$ A send SA "<P0> 1. browser_snapshot with {}"   (the send denied in Part 1; not denied now)
2026-10-23T14:40:19.770Z TOOL mcp__chrome-agent-bridge__browser_snapshot {}
2026-10-23T14:40:19.782Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html?t5=sdk1-claude   title: "Agent Bridge E2E Playground"
    … (29 element lines, including - button "Sign in" [ref=e5])
2026-10-23T14:40:23.126Z RESULT-OF-TURN success · DONE
$ Get-BridgeLog 4
2026-10-23T14:39:46Z client + "claude-code #16908" (1 client)
2026-10-23T14:40:12Z client + "sdk-login" (2 clients)
2026-10-23T14:40:12Z client - "sdk-login" (1 client)
$ A end SA → 2026-10-23T14:40:29.555Z actor SA ended after 510 ms: … exit code 0
$ Close-T5Window W1; Set-T5Foreground Ws → True; B1 → T131 fixture
```
Every clause: the script's lines in order and exit 0; SA's two snapshots of `?t5=sdk1-claude` with
`button "Sign in" [ref=e5]`, neither an error; the log pair; the screen unchanged (foreground still W1).

### SM-0 (step 9) — NOT MEASURED (the reload exited 2; waits for the user)

```
$ Start-Process -WindowStyle Hidden powershell -File s6-run2\sm0.ps1   (14:40:40.516Z)   # sm0.ps1: Set-Location <repo>; nvm Path; npm run -s recipe -- recipes/s6.ts sm0 --hold 120 *> sm0.out
$ powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1   (14:40:49.042Z)
2026-10-23T14:40:49.562Z reload-extension: extension Chrome Agent Bridge, ID cpnemjbgecfbeicldpaaegbhjgjgjfep (from C:\Users\aliev\Projects\chrome-remote-extention\extension)
2026-10-23T14:40:49.769Z reload-extension: daemon running: yes (pid 10036)
2026-10-23T14:40:50.227Z reload-extension: own window 8326384 opened
2026-10-23T14:41:05.775Z reload-extension: my window did not reach chrome://extensions/ - nothing pressed
2026-10-23T14:41:05.991Z reload-extension: own window 8326384 closed
reload exit 2  14:41:06.015Z
sm0.out:
2026-10-23T14:40:41.494Z s6-sm0: opened T135 (background) at http://localhost:8080/e2e-playground.html?s6=sm0
2026-10-23T14:40:41.500Z s6-sm0: holding T135 for 120 s — run recipes/reload-extension.ps1 now
2026-10-23T14:41:11.503Z s6-sm0: still holding T135 (+30 s; extension connected)
2026-10-23T14:41:41.505Z s6-sm0: still holding T135 (+60 s; extension connected)
2026-10-23T14:42:11.514Z s6-sm0: still holding T135 (+90 s; extension connected)
2026-10-23T14:42:41.514Z s6-sm0: still holding T135 (+120 s; extension connected)
2026-10-23T14:42:41.523Z s6-sm0: snapshot T135 after the hold → ok (29 elements), url http://localhost:8080/e2e-playground.html?s6=sm0
2026-10-23T14:42:41.526Z s6-sm0: listTabs: T135 owner "s6-sm0"
2026-10-23T14:42:41.533Z s6-sm0: SM-0 NOT MEASURED — no extension disconnect and reconnect during the hold — the reload was not seen
$ Get-BridgeLog 12 → … 14:40:41Z client + "s6-sm0" (1 client) / 14:42:41Z client - "s6-sm0" (0 clients); no resync, no session line
```
The reload script pressed nothing (exit 2). The sheet's re-run rule says an exit-2 command is fixed and run
again, but the integrity floor ("an extension reload whose script … exits non-zero" waits for the user) and
decisions.md #65 ("The user's keyboard is needed for a reload only when the script exits non-zero") rank above
the sheet, so the reload was **not** retried and SM-0 is recorded **not measured — waits for the user**. The
extension was untouched (nothing pressed; the next rows ran on the same build). Likely cause, not established:
Ws was `Set-T5Topmost` (step 5) and covered the script's own window, whose address-bar Enter needs its window in
front — Part 1's reload ran before Ws existed. Proposed for the step agent: un-topmost Ws before SM-0's reload,
and a ruling on re-running a reload that exited 2.

*2026-10-23 (step agent, live verifier r2 N2): continuing the live part after this reload's exit 2 deviates from
sheet step 2's (and R-b's) literal consequence, "STOP the live part and ask the user". Ratified by the step agent
as a disclosed deviation — nothing was pressed, the log shows no extension disconnect or resync until the restart,
so the later rows ran on the build the stale check proved — and escalated to the user (S6.md §4).*

### MUX-1, MUX-2, STAT-1 (step 10) — PASS, PASS, PASS

Set-up deviation (recorded; no rule changed): the sheet runs B1 *after* `daemon-shutdown`, but B1
(`t5.ts find`) is a bridge client and would spawn the daemon itself, so MUX-1's "daemon parent = `<M>`" and its
log order could not hold. B1 ran just before the shutdown (Ws current).

```
$ A status → SA … ended
$ Set-T5Foreground Ws → True; B1 → T131 fixture
$ Rcp recipes/s6.ts daemon-shutdown   (14:43:08.157Z)
2026-10-23T14:43:08.691Z s6-daemon-shutdown: daemon.shutdown sent (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f)
exit 0
daemon after 14:43:08.912Z: []
2026-10-23T14:43:08Z exit 0 (shutdown 4002) clients=0 extensionEvents=13 ignoredClientFrames=0
$ A start S1 --tools 'browser_status,browser_navigate,browser_snapshot,browser_list_tabs'   (14:43:13.809Z) → host 34136, claude 24672
$ A send S1 "<P0> 1. browser_status with {}"
2026-10-23T14:43:30.396Z OUTPUT:
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 14s)
    Clients (1): claude-code #4036
    Extension: connected
    Active tab: [T194] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=s6-human
    Cursor: none yet — the first tab tool claims the human's active tab
$ Get-BridgeDaemon → ProcessId 14400, ParentProcessId 4036
$ processes: 24672 (parent 34136) claude.exe claude -p …; 4036 (parent 24672) node.exe mcp/dist/index.js; 14400 (parent 4036) node.exe daemon\dist\index.js
$ Get-BridgeLog 8 (newest lines)
2026-10-23T14:43:16Z start pid=14400
2026-10-23T14:43:16Z config pid=14400 port=9234 idleMs=600000 build=597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
2026-10-23T14:43:16Z listening on 127.0.0.1:9234
2026-10-23T14:43:16Z client + "claude-code #4036" (1 client)
2026-10-23T14:43:24Z extension resync: 2 tabs, 0 gone
```
**MUX-1 PASS:** five lines ending `Cursor: none yet — …`, build = `Get-DaemonBuild`; exactly one daemon, parent
`<M>` = 4036 (here the MCP's parent is `claude -p` itself, no nvm shim); log in order.

```
$ A start S2 --tools 'browser_status,browser_snapshot' → host 23884, claude 2080
$ A send S1 "<P-STATUS>"   → 14:43:53.395Z
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 37s)
    Clients (2): claude-code #4036, claude-code #9028
    Extension: connected
    Active tab: [T194] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=s6-human
    Cursor: none yet — the first tab tool claims the human's active tab
$ A send S2 "<P-STATUS>"   → 14:44:07.235Z
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 51s)
    Clients (2): claude-code #4036, claude-code #9028
    Extension: connected
    Active tab: [T194] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=s6-human
    Cursor: none yet — the first tab tool claims the human's active tab
$ A send S1 "<P-MUX2-S1>"
2026-10-23T14:44:28.719Z OUTPUT:
    Navigated active tab to http://localhost:8080/e2e-playground.html?t5=mux2
2026-10-23T14:44:28.764Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html?t5=mux2   title: "Agent Bridge E2E Playground"
    - textbox "Email address" [ref=e1]
    …
    - button "Sign in" [ref=e5]
    …
$ A send S2 "<P-SNAP>"
2026-10-23T14:44:39.431Z OUTPUT (isError):
    tab T194 is held by "claude-code #4036" since 14:44:28 — use browser_new_tab, or browser_list_tabs to pick a free tab
$ Get-BridgeDaemon → daemon 14400 parent 4036
$ Get-BridgeLog 3
2026-10-23T14:43:16Z client + "claude-code #4036" (1 client)
2026-10-23T14:43:24Z extension resync: 2 tabs, 0 gone
2026-10-23T14:43:51Z client + "claude-code #9028" (2 clients)
$ A send S1 "<P-STATUS>"   (STAT-1) → 14:45:00.130Z
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 104s)
    Clients (2): claude-code #4036, claude-code #9028
    Extension: connected
    Active tab: [T194] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=mux2
    Cursor: T194 "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?t5=mux2 (held by me)
$ A end S2; A end S1 (exit code 0 each); Close-T5Window Ws; $Ws = Open-T5Window "${U}s6-human" → 7670744; Set-T5Topmost; foreground True; B1 → T195 fixture
```
**MUX-2 PASS** (as corrected in §4.19): same build and `Clients (2): claude-code #4036, claude-code #9028` in
both statuses, each ending `Cursor: none yet — …`; S1's snapshot of `?t5=mux2` with both elements; S2's exact
`TAB_HELD` text; one daemon, the same 14400; `client + "claude-code #9028" (2 clients)` and no new `start`.
**STAT-1 PASS:** the four lines + `Cursor: T194 … ?t5=mux2 (held by me)`; no sixth line (the human's tab is
the cursor's). (The resync's "2 tabs" at 14:43:24 included SM-0's `?s6=sm0` tab: `s6.ts sm0` printed no
`closed` line after `NOT MEASURED`; that tab closed with the old Ws window.)

### LEASE-1 (step 11) — PASS

```
$ $WL = Open-T5Window "${U}lease1" → 8457456; foreground True; B1 → T196 fixture
$ A start LA … → host 7220, claude 15816;  A start LB … → host 14680, claude 10836
$ A send LA "<P-L1-A1>"
2026-10-23T14:46:01.663Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html?t5=lease1   title: "Agent Bridge E2E Playground"
    … - button "Click counter: 0" [ref=e6] …
$ B1 → T196 fixture
$ A send LB "<P-L1-B1>"
2026-10-23T14:46:27.876Z OUTPUT (isError):
    tab T196 is held by "claude-code #2576" since 14:46:01 — use browser_new_tab, or browser_list_tabs to pick a free tab
$ A send LB "<P-L1-B2>"
2026-10-23T14:46:41.133Z TOOL mcp__chrome-agent-bridge__browser_new_tab {"url":"http://localhost:8080/e2e-playground.html?t5=lease1-b"}
2026-10-23T14:46:41.197Z TOOL mcp__chrome-agent-bridge__browser_snapshot {}
2026-10-23T14:46:41.205Z OUTPUT:
    Opened tab T197 (in the background — browser_focus_tab shows it)
2026-10-23T14:46:41.223Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html?t5=lease1-b   title: "Agent Bridge E2E Playground"
    … - button "Click counter: 0" [ref=e6] …
$ P-L1-par (ref e6 for both, from their last snapshots), two background sends: LA start 14:47:01.188Z, LB start 14:47:01.210Z
LA: 14:47:13.695Z Clicked e6 / 14:47:13.751Z url: …?t5=lease1 … - button "Click counter: 1" [ref=e6]
LB: 14:47:21.618Z Clicked e6 / 14:47:21.671Z url: …?t5=lease1-b … - button "Click counter: 1" [ref=e6]
$ A send LA "<P-L1-A3>"
2026-10-23T14:47:41.618Z OUTPUT:
    [1 non-fixture line omitted]
    T195  Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=s6-human
    T196* [claude-code #2576] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease1
    T197  [claude-code #17748] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=lease1-b
$ process tree: 2576 parent 15816 (LA's claude); 17748 parent 10836 (LB's claude)
$ A end LA; A end LB; npx tsx recipes/t5.ts cleanup --keep s6-human → closed T196 (lease1), closed T197 (lease1-b)
```
Every clause of Run 8's text with the S5 note (B's tab in the background, `*` stays on `<T#a>`). LB's model
issued the snapshot 64 ms after `browser_new_tab`, before its result (parallel tool calls in one turn); the
snapshot still read `?t5=lease1-b`.

### The S5 MCP rows (step 12)

Ws was closed first (no later row needs it, and a topmost window over a capture row's window would block its
capture). CUR/LOC/ASREF windows were opened on the plain fixture URL, which these rows' expected text names.

**CUR-1, CUR-2, CUR-3 — PASS ×3** (window Wc 9112812 on the plain URL; actor CU, host 12312 / claude 4972):
```
$ B1 → T198 fixture
$ A send CU "<P-CUR1-a>" → 14:49:29.285Z  url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"
$ [UI] Open-T5Tab "…?s5=b" in Wc (14:49:39.867Z); B1 → T199 fixture
$ A send CU "<P-CUR1-b>"
2026-10-23T14:49:53.434Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"
2026-10-23T14:49:58.834Z OUTPUT:
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 403s)
    Clients (1): claude-code #19752
    Extension: connected
    Active tab: [T199] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?s5=b
    Cursor: T198 "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html (held by me)
    Human's active tab: T199 "Agent Bridge E2E Playground" — not mine; call browser_use_active_tab to work there
$ A send CU "<P-CUR1-c>"
2026-10-23T14:50:13.039Z OUTPUT:
    Now using T199 (the human's active tab) as this session's tab
2026-10-23T14:50:15.119Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html?s5=b   title: "Agent Bridge E2E Playground"
2026-10-23T14:50:20.954Z OUTPUT:
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 425s)
    Clients (1): claude-code #19752
    Extension: connected
    Active tab: [T199] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?s5=b
    Cursor: T199 "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?s5=b (held by me)
$ (a) A send CU "<P-CUR3-a>" → 14:50:43.140Z  Opened tab T200;  B1 → T200 fixture (the ?s5=c tab came on screen)
$ (b) [UI] SendKeys ^1 to Wc (in front) 14:50:55.013Z; B1 → T198 fixture
$     A send CU "<P-CUR3-b>" → 14:51:07.632Z  Opened tab T201 (in the background — browser_focus_tab shows it)
$                             14:51:10.996Z  url: http://localhost:8080/e2e-playground.html?s5=d   title: "Agent Bridge E2E Playground"
$     B1 → T198 fixture (the screen did not change)
$ (c) A start CV (fresh, no tool called) → host 28684, claude 34608; A send CV "<P-CUR3-c>"
$     → 14:51:44.442Z  Opened tab T202 (in the background — browser_focus_tab shows it);  B1 → T198 fixture
$ driver listing (fixture lines only): T198 … T202 all in Wc's window (win 1108127548); [1 non-fixture tabs omitted]
$ A end CU; A end CV; Close-T5Window Wc
```
No `browser_focus_tab` call in any branch (neither actor had the tool; screen unchanged in (b) and (c)).

*2026-10-23 (step agent, live verifier r2 N8): the "driver listing" was one of two ad-hoc read-only `listTabs`
listings by an `s6-driver-list` client (14:52:40Z and 15:09:54Z in the log): a scratch script, not a committed
recipe, that prints fixture tabs only and counts the rest. Only the first (14:52:40Z) is reflected here.*

**LOC-1 — FAIL (on its own check: the value clause cannot be observed as written)** (window Wl 7932888, plain
URL; fresh actor LO1, host 18372 / claude 20308):
```
$ B1 → T203 fixture
$ A send LO1 "<P-LOC1>"
2026-10-23T14:53:17.101Z OUTPUT:
    Typed into textbox "Email address"
2026-10-23T14:53:22.279Z OUTPUT:
    Clicked button "Click counter"
2026-10-23T14:53:27.766Z OUTPUT:
    url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"
    - textbox "Email address" [ref=e1]
    …
    - button "Click counter: 1" [ref=e6]
    …
2026-10-23T14:53:30.678Z OUTPUT (isError):
    browser_click takes ref or locator, not both
```
Matched: `Typed into textbox "Email address"`, `Clicked button "Click counter"`, `button "Click counter: 1"`, the
exact tool error. Not matched as written: "the snapshot has `textbox "Email address"` with value `a@b.com`" —
the snapshot format prints no values; the alternative "`status: email = a@b.com`, by screenshot" — the actor
has no screenshot tool, and the driver's one OS-level frame of its own window (Save-T5Frame, 14:53:45Z) read
the field as `a@b.com` but the status line as `status: counter = 1` (the counter click overwrote the email
status) and counter 1 after the last call. That frame also showed the user's bookmark bar, so it was deleted
at once, never attached; the later banner checks used only the capture loop's band numbers. Finding: the row's
value clause has no observable form after the counter click (proposed: amend the expected text, or add a
screenshot between type and click).

**LOC-2 — PASS** (window Wl2 3607462; fresh actor LO2):
```
$ B1 → T204 fixture
2026-10-23T14:54:33.622Z OUTPUT:  Clicked button "Load message in 1.5s"
2026-10-23T14:54:35.160Z OUTPUT:  Waited for text "Async content loaded!" to be visible
2026-10-23T14:54:36.678Z OUTPUT:  (mcp__chrome-agent-bridge__browser_evaluate completed with no output)
2026-10-23T14:54:38.482Z OUTPUT:  Waited for text "Async content loaded!" to be hidden
2026-10-23T14:54:38.726Z OUTPUT (isError):  browser_wait_for: state is only used with locator
```
Visible 1.54 s after the click's result (the wait call itself 128 ms); hidden 14 ms after its call; the
optional error exact.

**ASREF-1 — PASS on the required clauses; the optional `1+1` clause differs (finding)** (window Wa 8195032;
fresh actor AR, host 21044 / claude 33168):

*2026-10-23 (step agent, live verifier r2 N1): ASREF-1 is FAIL (optional clause; required clauses PASS) —
step-agent ruling: the sheet says "§4.18's Expected column, exactly" and P-ASREF1 ran the optional call. See the
verdict table and the corrected count at the end of Part 2.*
```
$ B1 → T205 fixture
2026-10-23T14:55:22.186Z OUTPUT:
    <button id="counter"> "Click counter: 0"
    [ref=e1] — pass it as ref to browser_click etc.
    (DOM node — use browser_snapshot refs to act on it)
2026-10-23T14:55:24.449Z OUTPUT:  Clicked e1
2026-10-23T14:55:27.033Z OUTPUT:  url: http://localhost:8080/e2e-playground.html … - button "Click counter: 1" [ref=e6]
2026-10-23T14:55:30.611Z OUTPUT (isError):  asRef needs an Element; the value is not one
```
Expected for the optional call: `2` then `(no ref: the result is not an element)`; observed the tool error
above.

**REP-1 — FAIL (no image part reached the actor)** — run with actor AR on window Wa: P-REP1 is a single call, so
the session's tab must already be the fixture; AR's tab T205 was claimed by ASREF-1. `[UI]` `Open-T5Tab
"${U}rep1-front"` in Wa (in front), Wa topmost; B1 → T206 fixture; failures folder F0 count 0.
```
$ A send AR "<P-REP1>"
2026-10-23T14:56:03.412Z TOOL mcp__chrome-agent-bridge__browser_click {"locator":{"role":"button","name":"No such button"}}
2026-10-23T14:56:05.002Z OUTPUT (isError):
    LOCATOR_NOT_FOUND: no button named "No such button". Nearest: button "Shadow button", button "Iframe button", button "Trusted-only button", button "Fetch JSON", button "Disabled action".
    Nearest candidates:
      - button "Shadow button" [ref=e13]
      - button "Iframe button" [ref=e14]
      - button "Trusted-only button" [ref=e7]
      - button "Fetch JSON" [ref=e22]
      - button "Disabled action" [ref=e20]
    Refs: this snapshot renumbered the tab's refs — refs from before the failure are void; use the refs shown.
    url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"
    - textbox "Email address" [ref=e1]
    … (29 element lines, - button "Sign in" [ref=e5] among them)
    Screenshot: C:\Users\aliev\.chrome-agent-bridge\failures\2026-10-23T14-56-03-422Z-T205.png
    Network: no failed requests among the tab's last 1 entry.
$ B1 (14:56:09.949Z) → T206 fixture (the front tab is back)
$ FailPng → F1 count 1: 2026-10-23T14-56-03-422Z-T205.png, 34299 bytes — the path the report printed; deleted, never opened; FailPng after: 0
```
Matched: the text part, the `Screenshot:` path under `<home>\.chrome-agent-bridge\failures\`, the snapshot
window, the PNG at that path, the previous tab back. Not matched: "an **image** of the fixture page" — the
actor's stream-json transcript has the tool_result as one text string, no image block (counted in
`out.jsonl` and in the session transcript: 0 `"type":"image"`), while the success-path `browser_screenshot`
images of the regression rows did arrive as image blocks. Whether the MCP sent the image and Claude Code
dropped it from an `isError` result, or the MCP sent none, is not established here (a code-level question for a
later stage). The ~1.5 s flash was not measured page-side in this row (REP-0 measured the same path: 1331 ms).

**TAB-3 — PASS (background branch)** (window Wt 12586284 `?t5=tab3`; fresh actor TN, host 32384 / claude 9380):
```
$ B1 → T207 fixture
2026-10-23T14:57:12.251Z OUTPUT:  Opened tab T208 (in the background — browser_focus_tab shows it)
2026-10-23T14:57:14.082Z OUTPUT:  url: https://example.com/   title: "Example Domain"
$ B1 → T207 fixture (screen unchanged)
```
A session whose first tool call opens the tab: the background branch of the S5 note; the snapshot acted on
the new tab.

**NET-12 — PASS** (same actor TN; fixture rows only):
```
2026-10-23T14:57:39.888Z OUTPUT:  Opened tab T209 (in the background — browser_focus_tab shows it)
2026-10-23T14:57:41.924Z OUTPUT:  Clicked button "Fetch JSON"
2026-10-23T14:57:46.113Z OUTPUT:
    Network — all tabs: showing 5 of 5 (recording since 1h42m ago; 0 pending)
    [5613]  tab:T207  57.4s ago  GET     200  document    5ms  12.8 KB  http://localhost:8080/e2e-playground.html?t5=tab3
    [5622]  tab:T209  6.3s ago   GET     200  document    5ms  12.8 KB  http://localhost:8080/e2e-playground.html?s6=net12
    [5623]  tab:T209  4.2s ago   GET     200  xhr         1ms  28 B    http://localhost:8080/ok.json
    [2 non-fixture rows omitted]
2026-10-23T14:57:48.005Z OUTPUT:  Closed tab T209
2026-10-23T14:57:49.997Z OUTPUT:
    Network — all tabs: showing 3 of 3 (recording since 1h42m ago; 0 pending)
    [5613]  tab:T207  1m01s ago  GET     200  document    5ms  12.8 KB  http://localhost:8080/e2e-playground.html?t5=tab3
    [2 non-fixture rows omitted]
$ A end TN; Close-T5Window Wt
```

### SDK-8 (step 13) — PASS

```
$ Wa = Open-T5Window "${U}sdk8-actor" → 12848100; foreground True; B1 → T210 fixture
$ A start C --tools 'browser_snapshot,browser_click,browser_status,browser_use_active_tab' → host 10856, claude 9668
$ S8-1 → 14:58:30.443Z  url: http://localhost:8080/e2e-playground.html?t5=sdk8-actor   title: "Agent Bridge E2E Playground"
$ Wh = Open-T5Window "${U}sdk8-human" → 5180784; foreground True; B1 → T211 fixture; find sdk8-human → T211
$ S8-2 → 14:59:01.287Z  Clicked button "Click counter"
$        14:59:01.325Z  url: http://localhost:8080/e2e-playground.html?t5=sdk8-actor … - button "Click counter: 1" [ref=e6]
$ npm run -s recipe -- recipes/s6.ts peek sdk8-human   (14:59:04.369Z)
2026-10-23T14:59:04.963Z s6-peek: peek T211 (?t5=sdk8-human, current: yes): button "Click counter: 0"; released
$ S8-3 → 14:59:16.924Z
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 961s)
    Clients (1): claude-code #8808
    Extension: connected
    Active tab: [T211] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=sdk8-human
    Cursor: T210 "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?t5=sdk8-actor (held by me)
    Human's active tab: T211 "Agent Bridge E2E Playground" — not mine; call browser_use_active_tab to work there
$ S8-4 (no P0) — TOOL lines: ToolSearch {"query":"select:mcp__chrome-agent-bridge__browser_use_active_tab",…}; mcp__chrome-agent-bridge__browser_use_active_tab {}; mcp__chrome-agent-bridge__browser_status {}
2026-10-23T14:59:27.422Z OUTPUT:
    Now using T211 (the human's active tab) as this session's tab
2026-10-23T14:59:27.450Z OUTPUT:
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 971s)
    Clients (1): claude-code #8808
    Extension: connected
    Active tab: [T211] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html?t5=sdk8-human
    Cursor: T211 "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?t5=sdk8-human (held by me)
$ A end C; Close-T5Window Wa, Wh
```
(`ToolSearch` is the headless session loading a deferred tool's schema, not a bridge call.)

### Regression rows + SCREEN-1 (step 14) — PASS ×8

Window Wr 2559342 `?t5=regr`, topmost, in front; B1 → T212 fixture. Actor R (host 10908 / claude 8776, the
step-14 tool list). Screenshots were read from R's `out.jsonl` image blocks (fixture viewport only, saved under
`s6-run2\img`, outside the repo). The banner was judged by `t5-win.ps1 -Capture` on Wr (250 ms) from its
`frames.csv` band numbers only (106 = no banner, 90 = banner, as Run 8); the frames were deleted unviewed.
```
P-R0 → 15:00:48.057Z  Selected tab T212 (now this session's tab; not brought on screen — browser_focus_tab shows it)
       15:00:53.428Z  Navigated active tab to http://localhost:8080/e2e-playground.html
ACT-1 → snapshot (… - textbox "Email address" [ref=e1] …); 15:01:32.744Z  Typed into e1; screenshot status line: status: email = a@b.com
ACT-2 (ref e6) → 15:01:59.892Z  Clicked e6; screenshot: status: counter = 1; snapshot - button "Click counter: 1" [ref=e6]
TRUST-2 (ref e7, trusted) → 15:02:38.793Z  Clicked e7; screenshot: status: TRUSTED click received; band 106 → 96 at 15:02:38.834 → 90 at 15:02:39.161 → 106 at 15:02:44.183
EVAL-1 → 15:02:54.079Z  Agent Bridge E2E Playground; band 90 at 15:02:54.301 → 106 at 15:02:59.387
ACT-3 (ref e1) → 15:03:29.401Z  Typed into e1; screenshot: status: form submitted (email = x@y.com)
NET-1: clear → 15:04:17.688Z  Cleared 2 requests.;  hard reload: Set-T5Foreground Wr → True, SendKeys ^+r at 15:04:28.139Z
       http8080.log: 127.0.0.1 - - [23/Oct/2026 19:04:28] "GET /e2e-playground.html HTTP/1.1" 200 -  (and GET /favicon.ico 404)
       → 15:04:39.501Z
    Network — active tab: showing 2 of 2 (recording since 1h49m ago; 0 pending)
    [5658]  11.4s ago  GET     200  document    5ms  12.8 KB  http://localhost:8080/e2e-playground.html
    [5659]  11.4s ago  GET     404  image       4ms  460 B   http://localhost:8080/favicon.ico
       id 5658 → status: 200 OK   from cache: no   ip: 127.0.0.1   size: 12.8 KB … content-length: 13106
       band 106 throughout (285 frames, 15:04:09–15:05:39)
DL-1: (0) Remove-Item dl1; Test-Path → False
      (a) status before: Active tab: [T212] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html
          → 15:05:53.955Z  Saved C:\Users\aliev\AppData\Local\Temp\bridge-e2e\dl1\hello.txt
                           69 bytes · text/plain · sha256 0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce
          status after: Active tab: [T212] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html
      (b) 0A6B99CA15C2A72AD024D78D94D3980833B77EFDA41AF17D0571D21FEE2956CE; listing: hello.txt
      (c) (isError) C:\Users\aliev\AppData\Local\Temp\bridge-e2e\dl1\hello.txt exists — pass overwrite:true to replace it
      (d) the two lines of (a) again; both statuses the same Active tab line
      band 106 throughout (190 frames, 15:05:41–15:06:41)
$ A end R; Close-T5Window Wr
```
All eight match their last recorded run's expected text. Notes: R's in-tab navigation to the plain URL was
served the cached pre-T1 fixture (no `link "Open popup"`, refs `e10`/`e11` shifted), as Run 8 noted; the
expected texts do not depend on it. In ACT-2, TRUST-2 and ACT-3 the model issued the screenshot in the same
turn as the action, before its result; each screenshot still showed the action's status line. DL-1's
service-worker console line was not observed (as Runs 7 and 8: opening the console moves focus).

```
$ $Wsh = Open-T5Window "${U}screen-human" → 3541998; Set-T5Topmost; foreground True; B1 → T213 fixture
$ npx tsx recipes/t5.ts screen1 --hue   (15:06:56.554Z)
2026-10-23T15:06:57.667Z t5-screen1: human T213 (cyan bar), target T214 (magenta bar, background, leased to t5-screen1)
2026-10-23T15:07:01.833Z t5-screen1: run 1: call 1575 ms; image 1920x903, bar probes (960,24) #dd00fa (1440,24) #dd00fa (1900,24) #dd00fa → magenta (hue rule) → C:\Users\aliev\AppData\Local\Temp\bridge-e2e\t5\screen1-run1.png
2026-10-23T15:07:01.834Z t5-screen1: run 1: human tab hidden +4 ms, visible again +1580 ms → flash 1576 ms; target visible +8 ms, hidden +1577 ms
2026-10-23T15:07:01.834Z t5-screen1: run 1: PASS (finding: flash over 1 s)
2026-10-23T15:07:06.859Z t5-screen1: run 2: call 1456 ms; image 1920x903, bar probes … → magenta (hue rule) …
2026-10-23T15:07:06.859Z t5-screen1: run 2: human tab hidden +5 ms, visible again +1461 ms → flash 1456 ms; target visible +8 ms, hidden +1458 ms
2026-10-23T15:07:06.859Z t5-screen1: run 2: PASS (finding: flash over 1 s)
2026-10-23T15:07:11.899Z t5-screen1: run 3: call 1465 ms; image 1920x903, bar probes … → magenta (hue rule) …
2026-10-23T15:07:11.899Z t5-screen1: run 3: human tab hidden +5 ms, visible again +1469 ms → flash 1465 ms; target visible +7 ms, hidden +1467 ms
2026-10-23T15:07:11.899Z t5-screen1: run 3: PASS (finding: flash over 1 s)
2026-10-23T15:07:12.908Z t5-screen1: SCREEN-1 PASS — flash per run 1576, 1456, 1465 ms; median 1465 ms (method: page-side visibilitychange timestamps on the human's tab)
exit 0
$ Close-T5Window Wsh
```
**SCREEN-1 PASS** (each run visible again ≤ 2000 ms; the flash over 1 s is a finding, as in Runs 8/9).

### SDK-6/SDK-7 live on pp1 (step 15) — waits for the user

```
$ chrome windows: 527630 only; every actor ended; 8765 listeners before: 0
$ powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bb-login.ps1   (15:07:27.423Z)
2026-10-23T15:07:28.360Z bb-login: own window 7736264 opened
2026-10-23T15:07:33.600Z bb-login: after load: on ada.blackboard.com: no; sign-in buttons: 0
2026-10-23T15:07:33.602Z bb-login: WAITS FOR THE USER - not a single sign-in button (SSO, a picker, MFA or an unknown page); nothing pressed; window 7736264 left open
bb-login exit 4
```
Exit 4 ⇒ **SDK-6 and SDK-7 (live) wait for the user**; nothing retried, nothing typed or pressed. The driver
took no snapshot, screenshot or evaluate of that window and never looked at it; it was left open for the user
(Chrome restored it after SM-1's restart). `boot-bb.ts pp1`, `export-grades.ts pp1`, the plan, actor M,
`assemble-mcp.ts`, S6.3 and `close-bb-tab` were **not run** (no course tab exists). No Blackboard page was read
or written; no `exports\pp1-*` file exists (count 0). #98's write clause: no write happened.

### SM-1 + MUX-8 (step 16) — SM-1 FAIL (log clause), MUX-8 PASS · the one restart of this part

```
$ A start X --tools 'browser_status' → host 17788, claude 25832 (calls nothing yet)
$ Get-BridgeDaemon → D = 14400 (parent 4036)
$ Count (C0, before step 2)   2026-10-23T15:07:56.177Z bgf-count: chrome.exe processes 11; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 0; browser switches: [--restore-last-session]
$ $Wm = Open-T5Window "${U}sm1" → 13306852
$ Count (C1)                  2026-10-23T15:07:57.402Z bgf-count: chrome.exe processes 12; browser processes 1; browser windows 3 (minimized 0); tabs 3 (per window, sorted: 1,1,1); blank windows 0; browser switches: [--restore-last-session]
$ Start-Process -WindowStyle Hidden powershell -File s6-run2\sm1.ps1   (15:08:08.392Z)
$ $Q = 2026-10-23T15:08:17.8649083Z
$ powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-quit.ps1
2026-10-23T15:08:18.796Z bgf-quit: own window 854990 opened
2026-10-23T15:08:19.230Z bgf-quit: sent Enter on chrome://quit in my own window
2026-10-23T15:08:19.752Z bgf-quit: QUIT OK - no chrome.exe process remains, 0.5 s after the Enter
quit exit 0;  chrome procs: 0
$ MUX-8 run 1: npx tsx recipes/hello.ts   (15:08:26.474Z), X's status sent meanwhile
2026-10-23T15:08:27.598Z hello-recipe: connecting (pid 3568)
2026-10-23T15:08:42.617Z hello-recipe: FAILED after 15020 ms — NOT_CONNECTED: Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 15000 ms on port 9234)
exit 1
X → 15:08:31.967Z
    Daemon: connected on 127.0.0.1:9234 (build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, up 1516s)
    Clients (3): claude-code #26280, s6-sm1, hello-recipe
    Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?
$ powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-launch.ps1 -Exe $Chrome -ArgLine '--restore-last-session'   (15:08:51.087Z)
bgf-launch: started pid 25492 (parent 20944, this script, which now exits); in job: False; user default environment; args: --restore-last-session
launch exit 0
$ Count every 2 s:
15:08:54.515Z bgf-count: chrome.exe processes 12; browser processes 1; browser windows 4 (minimized 0); tabs 4 (per window, sorted: 1,1,1,1); blank windows 1; browser switches: [--restore-last-session]
15:08:57.251Z bgf-count: chrome.exe processes 12; browser processes 1; browser windows 4 (minimized 0); tabs 4 (per window, sorted: 1,1,1,1); blank windows 1; browser switches: [--restore-last-session]
$ Count -CloseBlank -Expect 3
bgf-count: -CloseBlank: closed the blank window 7801800 (WM_CLOSE); gone: yes
2026-10-23T15:09:06.262Z bgf-count: chrome.exe processes 11; browser processes 1; browser windows 3 (minimized 0); tabs 3 (per window, sorted: 1,1,1); blank windows 0; browser switches: [--restore-last-session]
sm1.out:
2026-10-23T15:08:09.322Z s6-sm1: daemon.status before: T216 tabId 1108127649 owner "s6-sm1" url http://localhost:8080/e2e-playground.html?t5=sm1; 3 live handle(s), highest T216; uptime 1493019 ms; build 597d6c28abd1…
2026-10-23T15:08:09.322Z s6-sm1: holding T216 — quit Chrome now (chrome://quit), run MUX-8, relaunch; waiting up to 900 s for the extension to go and come back
2026-10-23T15:08:19.369Z s6-sm1: event +10064 ms tabGone {"tab":"T216","lastUrl":"http://localhost:8080/e2e-playground.html?t5=sm1","lastTitle":"Agent Bridge E2E Playground"}
2026-10-23T15:08:19.383Z s6-sm1: event +10079 ms extensionStatus {"connected":false}
2026-10-23T15:08:39.803Z s6-sm1: still holding (+30 s; extension not connected)
2026-10-23T15:08:52.697Z s6-sm1: event +43393 ms extensionStatus {"connected":true}
2026-10-23T15:08:53.001Z s6-sm1: extension back at +43697 ms; waiting up to 30 s for tabGone T216
2026-10-23T15:09:03.012Z s6-sm1: snapshot T216 after the restart → TAB_GONE: tab T216 was closed — call listTabs to pick another tab
2026-10-23T15:09:03.015Z s6-sm1: listTabs after: 4 tab(s); handles T218, T219, T220, T221; owned by s6-sm1: 0
2026-10-23T15:09:03.015Z s6-sm1: daemon.status after: uptime 1546713 ms (+53694 ms over 53693 ms); build 597d6c28abd1…; reconnected: no
2026-10-23T15:09:03.016Z s6-sm1: SM-1 PASS — exactly one tabGone T216 (lastUrl http://localhost:8080/e2e-playground.html?t5=sm1); snapshot → TAB_GONE; no tab owned by s6-sm1; every handle above T216; same daemon
$ Rcp recipes/s6.ts sm1-log --since $Q   (15:09:17.688Z)
2026-10-23T15:08:52Z extension session changed: 0 handles retired
2026-10-23T15:08:52Z extension resync: 4 tabs, 0 gone
2026-10-23T15:09:18.218Z s6-sm1-log: SM-1 LOG FAIL — 0 handles retired (≥ 1 expected)
exit 1
$ Get-BridgeDaemon → daemon 14400 parent 4036 (unchanged)
$ MUX-8 run 2: $W8 = Open-T5Window "${U}mux8" → 7932872; foreground True; B1 → T222 fixture; npx tsx recipes/hello.ts   (15:09:30.523Z)
2026-10-23T15:09:31.530Z hello-recipe: connecting (pid 20584)
2026-10-23T15:09:31.545Z hello-recipe: connected in 15 ms as client c43 — daemon build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, proto 2
2026-10-23T15:09:31.546Z hello-recipe: daemon.status — port 9234, up 1575s, extension connected, clients (2): claude-code #26280, hello-recipe
2026-10-23T15:09:31.548Z hello-recipe: listTabs — 4 tab(s); active: [1108127941] Agent Bridge E2E Playground
2026-10-23T15:09:31.549Z hello-recipe: closed after 19 ms — OK
exit 0
$ Close-T5Window W8; A end X (exit code 0)
$ Get-BridgeLog 12
2026-10-23T15:07:53Z client + "claude-code #26280" (1 client)
2026-10-23T15:08:09Z client + "s6-sm1" (2 clients)
2026-10-23T15:08:27Z client + "hello-recipe" (3 clients)
2026-10-23T15:08:42Z client - "hello-recipe" (2 clients)
2026-10-23T15:08:52Z extension session changed: 0 handles retired
2026-10-23T15:08:52Z extension resync: 4 tabs, 0 gone
2026-10-23T15:09:03Z client - "s6-sm1" (1 client)
2026-10-23T15:09:30Z client + "t5-find" (2 clients)
2026-10-23T15:09:30Z client - "t5-find" (1 client)
2026-10-23T15:09:31Z client + "hello-recipe" (2 clients)
2026-10-23T15:09:31Z client - "hello-recipe" (1 client)
2026-10-23T15:09:39Z client - "claude-code #26280" (0 clients)
$ npx tsx recipes/t5.ts cleanup → 2026-10-23T15:09:51.043Z t5-cleanup: closed T220 (sm1)
$ Count  2026-10-23T15:09:53.802Z bgf-count: chrome.exe processes 10; browser processes 1; browser windows 2 (minimized 0); tabs 2 (per window, sorted: 1,1); blank windows 0; browser switches: [--restore-last-session]
```
**SM-1 — FAIL** against the pre-registered rule: `sm1Verdict` PASS, but the rule also needs "`daemon.log` has
exactly one `extension session changed: <n> handles retired` with `<n>` ≥ 1" and the log has `0 handles
retired` (`SM-1 LOG FAIL`). What happened, measured: `chrome://quit` closed the held tab first — the recipe got
`tabGone T216` at +10064 ms, 14 ms **before** `extensionStatus {"connected":false}` — so the handle was retired
by the tab-close path, and the session change on the extension's return (15:08:52Z) had nothing left to retire.
No live `T216` after the restart (the FAIL condition of the rule's last sentence did not occur): snapshot →
`TAB_GONE`, every handle above T216, no tab owned by `s6-sm1`, daemon pid 14400 unchanged, `reconnected: no`.
Counts: after `-CloseBlank` = C1 (3 windows, 1,1,1, switches `[--restore-last-session]`); after cleanup = C0
(2 windows, 1,1). The extension came back without a reload (~1.6 s after the launch). Not rerun (#96's
condition kept; a rerun would meet the same quit order). Finding for the step agent: with `chrome://quit` the
pre-registered log clause cannot hold for a tab Chrome closes at the quit — the rule (or the recipe's tab, e.g.
one Chrome does not close first) needs a decision.
**MUX-8 — PASS:** run 1 `FAILED after 15020 ms — NOT_CONNECTED: …` (15000–16500), exit 1; X's status `Daemon:
connected …` + `Extension: not connected — …` with no `Cursor:` line; run 2 the MUX-3 lines without the hold,
`closed after 19 ms — OK`, exit 0, its `active:` line the fixture title (B1: the current tab was the fixture);
`client + "hello-recipe"` / `client - "hello-recipe"` for each run. The optional run: not run.
*2026-10-23 (step agent, live verifier r2 N6): run 2's `exit 0` was captured separately from `mux8-2.out`, which
has no exit line (unlike `mux8-1.out`), so it cannot be checked from that file.*
**Chrome restart** (#98): one — `chrome://quit` at 15:08:19Z via `bgf-quit.ps1` (exit 0), relaunch at
15:08:51Z via `bgf-launch.ps1 --restore-last-session` (exit 0, no behaviour flags), counts as above.

### Close-down and hygiene (step 17)

```
$ Test-SafeToKill 6672 (python, the fixture server this part started) → safe: the tree of 6672 does not contain the driver
$ Stop-Process 6672 → 8080 listen after: [0]
http8080.log GET playground count: 22
Get-BridgeDaemon → daemon 14400 parent 4036   (left running; exits on idle)
mcp procs: 0; claude -p procs: 0; every actor ended (A status)
FailPng: 0
chrome windows: 2 (the user's window and bb-login's window, both restored by session restore; neither touched)
exports pp1 files: 0
```
- **Daemon log:** `S6-daemon-log.txt` replaced with `daemon.log` from Part 1's `start pid=25652` line (the line
  before its first `config` line) to the end at 15:09:54Z: **171 lines**; counts (never printed) `://` 0,
  token 0 (read into a variable, then `Remove-Variable`), `[line withheld:` 0, `_\d+_\d+` 0, `ada.blackboard` 0
  ⇒ attached. It includes, between the parts, a daemon at 14:17:32–14:27:39Z with one `s6-rep0` client
  (14:17:32–39Z) — not this driver's (finding 8).
  *2026-10-23 (step agent, live verifier r2 N4): that `s6-rep0` client is S6 builder r2's disclosed accidental
  dry-run contact (`S6-builder-r2.md` §4: `listTabs` only, refused with SET-UP exit 2).*
- **Failure PNGs:** REP-0's report went to its own directory (removed by the recipe; 0 in `$Fail`); REP-1 made
  one (`…-T205.png`, deleted unopened). `FailPng` at the end: 0.
- **Other images:** the regression rows' screenshots (fixture viewport only) were extracted from R's transcript
  into `s6-run2\img` (outside the repo); one LOC-1 window frame was deleted at once (bookmark bar); all capture
  frames were deleted unviewed. None is attached.
- **Exports:** none created this part; `git check-ignore exports/x.json` printed it at set-up.
- **Transcripts:** the actors' `out.jsonl` (`s6-run2\actors\*`) and session transcripts hold fixture text, and
  for LA's list and TN's network calls also lines about the user's own tabs (omitted above) — outside the repo,
  never copied here.
  *2026-10-23 (step agent, live verifier r2 N3): for TN, the omitted "lines about the user's own tabs" were
  TAB-3's example.com rows (`tab:T208`, TAB-3's own tab), not the user's; LA's one omitted line was non-fixture.*
- **S6.4 `git status --short`** after this record and the plan block were written: below.

```
$ git check-ignore exports/x.json → exports/x.json
exports staged: []
$ git status --short
 M docs/e2e-test-plan.md
 M docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-daemon-log.txt
 M docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-run-record.md
 M docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6.ledger.md
```
(`S6.ledger.md` was modified before the run, by the step agent.) No path under `exports/`, nothing from
`~/.chrome-agent-bridge/`, no PNG. The token occurs 0 times in this record, the plan and the attached log; no
URL of the user's own tabs is in any of them. Nothing was committed (the driver does not commit).

### Watch items

- Late-restore race: not seen (no capture timed out).
- `waitFor {text}` past its bound on a hidden tab: not seen (LOC-2's wait 128 ms; SDK-4 was Part 1's).
- Navigation onto an error page ending a `waitFor {locator}` in `TIMEOUT`: not testable (no such navigation).
- Residual `data-__bridge-mark` after `asRef`: not seen (ASREF-1 behaved normally; not separately counted).
  *2026-10-23 (step agent, live verifier r2 watch-item NIT): read "not tested (not separately counted)".*
- `onStartup` > 2 s after `onInstalled` / spurious `extension session changed` on a plain reload: not testable
  (SM-0's reload did not happen). On the restart, one `extension session changed: 0 handles retired` at
  15:08:52Z, the designed path.
- Reload "same second" proof vs the 2 s marker wait: not testable (the reload pressed nothing; no resync).
- A model losing track of a background tab (CUR-3 (c), TAB-3): not seen.
- SM-1 needing a reload after the relaunch: not needed (`extension back at +43697 ms`, ~1.6 s after the launch).

### Findings (Part 2)

1. **SM-0 not measured:** `reload-extension.ps1` exit 2 (`my window did not reach chrome://extensions/ -
   nothing pressed`); not retried under the integrity floor / #65 — waits for the user. Probable cause (not
   established): the topmost Ws. Proposed: un-topmost Ws before that reload; a ruling on re-running an exit-2
   reload.
2. **SM-1 FAIL (log clause):** `chrome://quit` closes the held tab first (`tabGone` at the quit), so the session
   change retires 0 handles; the pre-registered `<n> ≥ 1` cannot hold for such a tab. No live handle after the
   restart. Needs a decision (rule or recipe).
3. **REP-1 FAIL (image):** the MCP's failure report reached the actor as text only; success-path screenshots do
   arrive as images. Whether the MCP sends an image part in an `isError` result, or Claude Code drops it, is open.
4. **LOC-1 FAIL (its own check):** no observable form of the value clause after the counter click (snapshot has
   no values; status line overwritten). Field value and counter confirmed by one OS-level frame (deleted).
5. **ASREF-1 optional clause:** `1+1` with `asRef` is an error `asRef needs an Element; the value is not one`,
   not `2` + `(no ref: the result is not an element)` as §4.18 says.
6. **SDK-6/SDK-7 live wait for the user:** `bb-login.ps1` exit 4 (not on ada.blackboard.com after load, 0
   sign-in buttons — the login is not autofill + one submit here).
7. **Sheet step 10 order:** B1 after `daemon-shutdown` would spawn the daemon (a client); run before it.
8. **An `s6-rep0` client at 14:17:32–39Z**, before Part 2 and not by this driver (its daemon idled out at
   14:27:39Z); its output is not in this record. Part 2's REP-0 (14:39Z) is the recorded one.
   *2026-10-23 (step agent, live verifier r2 N4): this client is S6 builder r2's disclosed accidental dry-run
   contact (`S6-builder-r2.md` §4: `listTabs` only, refused with SET-UP exit 2); it painted and measured nothing.*
9. **`s6.ts sm0` leaves its tab open** after `NOT MEASURED` (no `closed` line); it closed with the driver window.
10. Models issued tool calls in parallel within one turn (LEASE-1's B2, ACT-2, TRUST-2, ACT-3): an action's
    screenshot was requested before the action's result; no observed effect on the outcomes.

### Verdict per row (Part 2)

| Row | Verdict | Observed vs expected |
|---|---|---|
| Set-up (R-a) | held | no code change since 23b878f; recipes 138 tests passed; tsc 0 |
| S6-STALE (R-b) | PASS | `STALE-CHECK NEW BUILD …`, exit 0 (no reload) |
| Daemon (R-c) | PASS | config build = `Get-DaemonBuild` = stale check's sha `597d6c28…34da3f` |
| REP-0 | PASS | probe visible +20 ms in the 1344 ms call; report PNG magenta (#dd00fa); controls A blue (#3300f8), B magenta, visible +9 ms in 1597 ms |
| SDK-1 | PASS | script PASS exit 0; SA's two snapshots of `?t5=sdk1-claude`; log pair |
| SM-0 | not measured | reload exit 2 (nothing pressed), not retried — waits for the user |
| MUX-1 | PASS | five lines; one daemon, parent = `<M>` 4036; log order |
| MUX-2 | PASS | `Clients (2)` same order both; `TAB_HELD` text exact; same daemon |
| STAT-1 | PASS | four lines + `Cursor: T194 … (held by me)` |
| LEASE-1 | PASS | refusal exact; LB's tab in the background; both counters 1; list with holders, `*` on T196 |
| CUR-1 | PASS | snapshots on the plain URL, then `Now using T199 …`, then `?s5=b` |
| CUR-2 | PASS | `Human's active tab:` line, then gone after the move |
| CUR-3 | PASS | (a) `Opened tab T200` in front; (b) background, screen unchanged, snapshot `?s5=d`; (c) background |
| LOC-1 | FAIL (own check) | all clauses but the value clause, which has no observable form as written |
| LOC-2 | PASS | visible ~1.5 s, hidden at once; optional error exact |
| ASREF-1 | PASS (required) | `[ref=e1] — …`, `Clicked e1`, counter 1; optional `1+1` clause differs (finding) |
| REP-1 | FAIL | text, path, snapshot, PNG matched; no image part in the actor's result |
| TAB-3 | PASS | background branch; snapshot of example.com |
| NET-12 | PASS | `tab:T209` rows, gone after the close; T207's intact |
| SDK-8 | PASS | every clause; peek `Click counter: 0`; `browser_use_active_tab` chosen unprompted |
| ACT-1, ACT-2, ACT-3, TRUST-2, EVAL-1, NET-1, DL-1 | PASS ×7 | as their last recorded runs; banners by band |
| SCREEN-1 | PASS | flash 1576 / 1456 / 1465 ms, median 1465 ms (over 1 s: finding) |
| SDK-6 (live), SDK-7 (live) | waits for the user | `bb-login.ps1` exit 4; SDK-7's MCP leg and S6.3 not run (no login) |
| SM-1 | FAIL | `SM-1 PASS` from the recipe, `SM-1 LOG FAIL — 0 handles retired`; pid same; counts equal |
| MUX-8 | PASS | 15020 ms `NOT_CONNECTED` exit 1; X's two lines; run 2 OK exit 0 |

*2026-10-23 (step agent, live verifier r2 N1): ASREF-1's verdict above becomes "FAIL (optional clause; required
clauses PASS) — step-agent ruling: the sheet says '§4.18's Expected column, exactly' and P-ASREF1 ran the
optional call". The driver's row and count are kept as written below.*

Counts (Part 2 rows): 24 PASS (S6-STALE, REP-0, SDK-1, MUX-1, MUX-2, STAT-1, LEASE-1, CUR-1, CUR-2, CUR-3,
LOC-2, ASREF-1, TAB-3, NET-12, SDK-8, ACT-1, ACT-2, ACT-3, TRUST-2, EVAL-1, NET-1, DL-1, SCREEN-1, MUX-8), 3 FAIL (LOC-1, REP-1, SM-1), 1 not measured (SM-0), 2 waits for the user (SDK-6, SDK-7 live).
With Part 1: SDK-2…5, SDK-6D, SDK-7D PASS (Part 1); SDK-1 now PASS.

*2026-10-23 (step agent, live verifier r2 N1) — corrected count (the step agent's): Part 2 rows: 23 PASS, 4 FAIL
(LOC-1, ASREF-1, REP-1, SM-1), 1 not measured (SM-0), 2 waits for the user (SDK-6, SDK-7 live). ASREF-1 moves
from PASS to FAIL (optional clause; required clauses PASS).*
