# S6 — wave sheet (Step 8 stage S6, live part: Run 12 (S6))

Written 2026-10-23 by the S6 pre-run builder, before the S6 build was loaded and before any S6 row ran
(exit check S6.1: rows and this sheet are committed before the main-tree build). Revised the same day by
the S6 fixer (round 1), still before any run, for the verifier's findings (`S6-verifier.md`: MAJOR-1/2,
MINOR-1…4, NIT-1…4) and the user's grant (decisions.md · 2026-10-23 · The user grants the pp1 course for
SDK-6/SDK-7 and one Chrome restart for SM-1 (#96)); each change is listed in `S6-fixer1.md`. Rows, expected
text and PASS rules: `docs/e2e-test-plan.md` §4.19 (new rows), §4.18 (S5's MCP rows), and the rows named under
"Regression rows" below. Integrity floor, forbidden fixes and STOP rules: `briefs/common.md`. Nothing
below changes a row's text or rule after step 2 starts; a failed row is recorded, never fixed in the
wave (kickoff §7 S6 item 5).

**Standing rules** (Steps 7–8 waves, unchanged): the driver runs every step itself (#33) and is **not a
bridge client** (launched with `--strict-mcp-config` and an empty MCP config; checked in step 0); every
tab acted on is a fixture tab (`…?s6=<marker>` opened by a script in the background, or `…?t5=<marker>`
in a driver window from `Open-T5Window`) — the Blackboard exceptions are below; evidence shows fixture
pages only (B2) — the user's windows and tabs are never named, captured, typed into or closed, and
`listTabs`/`browser_list_tabs` lines about them are replaced by `[<n> non-fixture lines omitted]`; no
DevTools window focused during a row (B3); the driver's window uncovered for flash rows (B4); one-turn
sessions drop leases, so every multi-prompt actor is a `t5-actor.ts` session (B5); actors are ended,
never tree-killed (B6); kill only identified PIDs after `Test-SafeToKill <pid>` prints `safe: …`.

**The user's grant (#96), and its conditions (session agent, binding).**
- **Blackboard** is touched only in SDK-6/SDK-7 live, on course **pp1**, through the recipes' own
  background tabs and `recipes/bb-login.ps1`'s own window — never a tab or window of the user's. The
  login uses Chrome's autofilled credentials: Chrome fills the form, the script invokes the one sign-in
  button; the username and password are never read, typed, printed, logged or recorded, in any file,
  transcript excerpt or record. No snapshot, screenshot, evaluate or value read of a login page. Login
  that needs anything beyond autofill + one submit (MFA, an account picker, a CAPTCHA, empty autofill)
  ⇒ SDK-6/SDK-7 **"waits for the user"**, nothing retried, nothing typed.
- **Read-only (0.7):** any step that would write or change anything on Blackboard is a STOP. The recipes
  call only GETs (the course lookup, `bb.all` on the two gradebook paths; `recipes/blackboard/readonly.ts`).
- **Evidence is public-repo safe:** no Blackboard page content, student name, grade, course URL, course
  title or course id — counts, sizes, hashes, handles and the label `pp1` only. `exports/` is gitignored.
  The recipes print the label and never the id they resolve.
- **Chrome restart:** ONE, for SM-1 (MUX-8 runs inside it). Quit only by `chrome://quit` typed into the
  address bar of a window the driver opened (`recipes/bgf-quit.ps1`); relaunch with session restore and no
  behaviour flags (`recipes/bgf-launch.ps1 … -ArgLine '--restore-last-session'`); counts before and after
  as in Run 10 (`recipes/bgf-count.ps1`); the extension must come back (`reload-extension.ps1` only if it
  does not, recorded). No second restart for any reason: a row that would need one is "not measured".

**Actors (accepted by the step agent, S6.ledger).** Every actor is Step 7's persistent host,
`npx tsx recipes/t5-actor.ts start <name> --tools <list> [--model sonnet]` (which runs exactly
`claude -p --model sonnet --input-format stream-json --allowedTools mcp__chrome-agent-bridge__<tool>…`),
fed with `t5-actor.ts send <name> "<prompt>"`, ended with `t5-actor.ts end <name>`, because a `--resume`d
`claude -p` turn is a new MCP client (its cursor and leases gone, B5). Outputs are read verbatim from
`send`'s `OUTPUT:` blocks or the actor's `out.jsonl`, never from the model's paraphrase. **An actor's
cursor is claimed by its first untargeted tool (S5) and moves only by `browser_use_active_tab`,
`browser_select_tab` or `browser_new_tab`**, so an actor is never reused for a row on another window: each
row group below names the actor it starts (MAJOR-1).

## Set-up (Windows PowerShell 5.1, repo root)

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
# §1 item 8 helpers (Get-BridgeLog, Get-BridgeDaemon, Get-BridgeProcs, Get-DaemonBuild, Get-DriverChain,
# Test-SafeToKill) — paste the block from docs/e2e-test-plan.md §1 item 8
. .\recipes\t5-win.ps1        # Open-T5Window, Open-T5Tab, Set-T5Foreground, Get-T5Foreground, Set-T5Topmost, Close-T5Window, Save-T5Frame
$env:S6_OUT = "$env:TEMP\bridge-e2e\s6-run1"     # a directory that does not exist yet
Test-Path $env:S6_OUT                             # must print False
New-Item -ItemType Directory $env:S6_OUT | Out-Null
$env:T5_ACTORS = "$env:S6_OUT\actors"
$U = 'http://localhost:8080/e2e-playground.html?t5='
$Chrome = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe').'(default)'
$Fail = "$HOME\.chrome-agent-bridge\failures"
function R  { npm run -s recipe -- @args; "exit $LASTEXITCODE" }     # R recipes/s6.ts sdk2
function A  { npx tsx recipes/t5-actor.ts @args }                   # A start C --tools '…' | A send C "…" | A end C
function B1 { npx tsx recipes/t5.ts find --current }                # must print '<T#> fixture'
function Count { powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-count.ps1 @args }
function FailPng { @(Get-ChildItem $Fail -Filter *.png -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }) }
```
Fixture servers (hidden, never `-NoNewWindow`, CLAUDE.md MUX-6):
`Start-Process -WindowStyle Hidden -FilePath "$HOME\miniconda3\python.exe" -ArgumentList '-I','-m','http.server','8080','--bind','127.0.0.1','--directory','test-fixtures' -RedirectStandardError "$env:S6_OUT\http8080.log"`.
No row of this wave needs 8081 (DL-1 and NET-12 use 8080; the redirect rows are not in this wave), so
8081 is not started.

**Failures-folder rule** (MINOR-2): around every row that can write a failure report (SDK-2, SDK-3, REP-1,
SDK-7's MCP leg), `$F0 = FailPng` before and `$F1 = FailPng` after; the row's files are `$F1` minus `$F0`.
Record their count and, for SDK-2/SDK-3/REP-1, the one path the row printed; delete exactly those files
(`Remove-Item (Join-Path $Fail <name>)` each — outside the repo, the driver's own output); never open,
attach or copy one. For a Blackboard row the names are not recorded either, only the count.

## Order of work

0. **Set-up checks [SH]** (set-up lines, recorded under "Set-up" before the reload — #84 makes the reload
   exit and the stale check the first *result* lines): `git log --oneline -3` (HEAD = the S6 pre-run commit
   holding this sheet and §4.19, or later with no `extension/ daemon/ sdk/ mcp/ shared/` change);
   `git status --short -- extension daemon shared sdk mcp` → nothing; the driver is not a client
   (`Get-DriverChain` lists no `mcp\dist\index.js`); `Get-BridgeDaemon` (none, or one — record its pid and
   build); `Test-Path Env:BRIDGE_TOKEN` → `False`; `git check-ignore bridge.token exports/x.json` → both
   paths; the 8080 server answers `200` for `/e2e-playground.html`;
   `npx tsc --noEmit -p recipes/tsconfig.s6.json` → exit 0; `npx vitest run recipes/` → all passed (the
   rules' dry run; 120 tests at the fixer's revision).
1. **Build [SH]** (set-up) — `npm run build` in the main tree (exit 0); `Get-DaemonBuild` (record the sha256).
2. **Reload [SH]** — `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1; $LASTEXITCODE`
   → `0`. Anything else ⇒ **STOP the live part and ask the user** (integrity floor); no row runs.
3. **S6-STALE [SH] — the first recorded line after the reload exit** (S6.1 as reworded by #84) —
   `R recipes/s6.ts stale-check`. Outcomes (MINOR-3):
   - `STALE-CHECK NEW BUILD` (exit 0) ⇒ go on.
   - `STALE-CHECK STALE` ⇒ step 2 once more (exit `0` required) and step 3 once more; a second `STALE` ⇒ STOP.
   - `STALE-CHECK UNEXPECTED` ⇒ STOP and escalate.
   - `FAILED — <code>: …` followed by `STALE-CHECK FAILED — a bridge error before locate answered: neither
     NEW BUILD nor STALE …` (exit 1; e.g. `NOT_CONNECTED`) ⇒ **STOP the live part and report**; no rerun.
   The check proves "S2-or-later", which tells the S6 build from the only other build loaded since Run 11
   (the FE-era one); step 1's main-tree build and step 4's build check make it the S6 build.
4. **Daemon [SH]** — `Get-BridgeLog 6`: the newest `config pid=<D> port=9234 idleMs=600000 build=<sha>`
   has `<sha>` = step 1's `Get-DaemonBuild`, and the stale check's `connected — daemon build <sha>` line
   names the same sha. A different build ⇒ STOP (a stale daemon holds 9234; `Test-SafeToKill` before
   anything is stopped).
5. **Driver window [UI]** — `$Ws = Open-T5Window "${U}s6-human"`; `Set-T5Topmost $Ws.Hwnd`;
   `Set-T5Foreground $Ws.Hwnd` → `True`; `B1` → `<T#> fixture`. Repeat `B1` before every script below that
   needs Ws current; on `not a fixture page`, `Set-T5Foreground $Ws.Hwnd` and check again.
6. **SDK-6D, SDK-7D [SH]** (localhost only) — `R recipes/blackboard/boot-bb.ts _1_1 --dry-run`;
   `R recipes/blackboard/export-grades.ts _1_1 --dry-run`; `Get-FileHash exports\dry-_1_1-*.json -Algorithm SHA256`
   (= `92FE62AB…A49C`); then `Remove-Item exports\dry-_1_1-*.json` (inside the repo, gitignored; the
   driver's own output).
7. **SDK-2, SDK-3, SDK-4, SDK-5 [SH]** — `$F0 = FailPng`; B1, `R recipes/s6.ts sdk2`; B1, `… sdk3`;
   `$F1 = FailPng` (2 new names expected: the two `screenshotPath:` lines); delete those two (failures-folder
   rule). B1, `… sdk4`; B1, `… sdk5`, then `Set-T5Foreground $Ws.Hwnd`.
8. **SDK-1 [SH, UI]** — `$W1 = Open-T5Window "${U}sdk1-claude"`; B1 (prints the `sdk1-claude` tab);
   `A start SA --tools 'browser_snapshot'`; `A send SA "<P-SDK1>"`; `R recipes/sdk-login.ts`;
   `A send SA "<P-SDK1>"`; `Get-BridgeLog 4`; `A end SA`; `Close-T5Window $W1.Hwnd`; `Set-T5Foreground $Ws.Hwnd`.
9. **SM-0 [SH]** — `Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList '-NoProfile','-File',"$env:S6_OUT\sm0.ps1"`
   where `sm0.ps1` holds `npm run -s recipe -- recipes/s6.ts sm0 --hold 120 *> "$env:S6_OUT\sm0.out"`
   (PowerShell 5.1 splits `-Command` strings: LESSONS); when `sm0.out` shows `holding <T#a> for 120 s`,
   step 2's reload command (exit `0`); wait for `SM-0 PASS|FAIL|NOT MEASURED` in `sm0.out`; `Get-BridgeLog 12`.
10. **MUX-1, STAT-1, MUX-2 [SH, UI]** — no actor or script running (`A status`: all ended).
    `R recipes/s6.ts daemon-shutdown` (refuses while another client is connected); `Get-BridgeDaemon` →
    nothing within 5 s. B1 (Ws current). `A start S1 --tools 'browser_status,browser_navigate,browser_snapshot,browser_list_tabs'`;
    `A send S1 "<P-MUX1>"`; `Get-BridgeDaemon`; `Get-BridgeProcs`; `Get-BridgeLog 8`. Then MUX-2:
    `A start S2 --tools 'browser_status,browser_snapshot'`;
    `A send S1 "<P-STATUS>"`; `A send S2 "<P-STATUS>"`; `A send S1 "<P-MUX2-S1>"` (S1's first tab tool: it
    claims Ws's tab and navigates it to `?t5=mux2`); `A send S2 "<P-SNAP>"` (refused: `TAB_HELD`);
    `Get-BridgeDaemon`; `Get-BridgeLog 3`. STAT-1: `A send S1 "<P-STATUS>"` (S1 now holds `?t5=mux2`: five
    lines with `Cursor: <T#> … (held by me)`). Then `A end S2`; `A end S1`. Ws's tab is now `?t5=mux2`
    and unheld: `Close-T5Window $Ws.Hwnd`; `$Ws = Open-T5Window "${U}s6-human"`; `Set-T5Topmost $Ws.Hwnd`.
11. **LEASE-1 [SH, UI] — fresh actors A and B, as Run 8 set them up** (MAJOR-1): `$WL = Open-T5Window "${U}lease1"`;
    `Set-T5Foreground $WL.Hwnd` → `True`; B1 → the `lease1` tab. `A start LA --tools 'browser_snapshot,browser_click,browser_list_tabs,browser_new_tab'`;
    `A start LB --tools 'browser_snapshot,browser_click,browser_list_tabs,browser_new_tab'` (neither has called
    a tool: no cursor). `A send LA "<P-L1-A1>"` (LA's first touch claims the human's tab = `lease1`);
    B1 again (still `lease1`); `A send LB "<P-L1-B1>"` (refused, `TAB_HELD`; LB keeps no cursor);
    `A send LB "<P-L1-B2>"` (LB's new tab, in the background, S5 note); `P-L1-par` to LA and LB, the two
    `send`s started within 1 s (two background `Start-Process` blocks writing to files; record both start
    times); `A send LA "<P-L1-A3>"`. `A end LA`; `A end LB`; `npx tsx recipes/t5.ts cleanup --keep s6-human`
    (closes `lease1` and `lease1-b`, both unheld now).
12. **The S5 MCP rows [UI]** — CUR-1, CUR-2, CUR-3, LOC-1, LOC-2, ASREF-1, REP-1, TAB-3, NET-12 (§4.18 /
    §4.6 / §4.8 with their S5 notes), each on its own driver window, with fresh actors as the prompt table
    says (CUR-3 (c) needs a session that has called no tool). REP-1 under the failures-folder rule.
13. **SDK-8 [UI, SH]** — §4.19 SDK-8 steps with a fresh actor C and prompts P-S8-1…4.
14. **Regression rows [UI, SH] — a fresh actor R on window Wr, as Run 8** (MAJOR-1; Run 8, the last recorded
    run of ACT-1…3/TRUST-2/EVAL-1/DL-1, ran them after `browser_select_tab {"tab":"T6"}` and a navigate to the
    plain URL, `T5-run-record.md` § "Regression rows (T5.3)"; this sheet follows that, not a first-touch
    claim): `$Wr = Open-T5Window "${U}regr"`; `Set-T5Topmost $Wr.Hwnd`; `Set-T5Foreground $Wr.Hwnd` → `True`;
    B1 → `<T#r> fixture`. `A start R --tools 'browser_select_tab,browser_navigate,browser_snapshot,browser_type,browser_click,browser_screenshot,browser_evaluate,browser_network_clear,browser_network_requests,browser_download,browser_status'`;
    `A send R "<P-R0>"` (selects `<T#r>`, navigates it to the plain URL). Then ACT-1, ACT-2, TRUST-2 (capture
    loop on Wr), EVAL-1, ACT-3 with their prompts; NET-1 by R9-NET-1's procedure on Wr (P-NET1-a, the
    driver's hard reload of Wr, P-NET1-b); DL-1 (P-DL1). `A end R`; `Close-T5Window $Wr.Hwnd`.
    **SCREEN-1 — its own window** (MINOR-1; `t5.ts screen1` needs a current tab with marker `screen-human`,
    `recipes/t5.ts:563-584`, as §4.14/R9): `$Wsh = Open-T5Window "${U}screen-human"`; `Set-T5Topmost $Wsh.Hwnd`;
    `Set-T5Foreground $Wsh.Hwnd` → `True`; B1 → the `screen-human` tab; nothing covers it;
    `npx tsx recipes/t5.ts screen1 --hue`; `Close-T5Window $Wsh.Hwnd`.
15. **SDK-6, SDK-7 live (course pp1, #96)** — below, "SDK-6/SDK-7 live".
16. **SM-1 with MUX-8 inside its quit window (the one restart, #96)** — below, "SM-1 and MUX-8".
17. **Close-down and hygiene** — below; then `S6-run-record.md` and the Run 12 block in
    `docs/e2e-test-plan.md` §5.

**Re-runs.** A command that exits `2` (set-up) or `3` (not measured) measured nothing: fix the set-up and
run it again, recording both — except SM-1 and anything else that would need a second Chrome restart,
which is recorded "not measured", and the Blackboard login, which is never retried. Exit `1` is a result:
recorded as is. An actor that calls a tool outside its prompt, or retypes an expression it was given
(SDK-7's MCP leg: START is checked by the page and the hash, STATUS/CHUNK are matched character for
character by `assemble-mcp.ts`), makes that step invalid (recorded; the step is rerun once in a fresh
actor). No row is rerun under a looser rule.

## Actor prompts (verbatim; `<…>` filled from earlier outputs before sending)

Every prompt starts with the prefix **P0**: `You are an E2E test actor. Call exactly the tools listed
below, in order, with exactly the arguments shown, and no other tool. Do not retry a failed call. After
the last call reply only DONE.` — then one numbered line per call.

| Id | Prompt after P0 |
|---|---|
| P-SDK1 | `1. browser_snapshot with {}` |
| P-STATUS | `1. browser_status with {}` |
| P-SNAP | `1. browser_snapshot with {}` |
| P-MUX1 | `1. browser_status with {}` |
| P-MUX2-S1 | `1. browser_navigate with {"url":"http://localhost:8080/e2e-playground.html?t5=mux2"} 2. browser_snapshot with {}` |
| P-L1-A1 / P-L1-B1 | `1. browser_snapshot with {}` |
| P-L1-B2 | `1. browser_new_tab with {"url":"http://localhost:8080/e2e-playground.html?t5=lease1-b"} 2. browser_snapshot with {}` |
| P-L1-par | `1. browser_click with {"ref":"<the ref of button \"Click counter: 0\" in your last snapshot>"} 2. browser_snapshot with {}` (sent to LA and LB within 1 s) |
| P-L1-A3 | `1. browser_list_tabs with {}` |
| P-CUR1-a | `1. browser_snapshot with {}` |
| P-CUR1-b | `1. browser_snapshot with {} 2. browser_status with {}` (the status is CUR-2's first) |
| P-CUR1-c | `1. browser_use_active_tab with {} 2. browser_snapshot with {} 3. browser_status with {}` (CUR-2's second) |
| P-CUR3-a | `1. browser_new_tab with {"url":"http://localhost:8080/e2e-playground.html?s5=c"}` |
| P-CUR3-b | `1. browser_new_tab with {"url":"http://localhost:8080/e2e-playground.html?s5=d"} 2. browser_snapshot with {}` |
| P-CUR3-c | `1. browser_new_tab with {"url":"http://localhost:8080/e2e-playground.html?s5=e"}` (a fresh actor, no tool called before) |
| P-LOC1 | `1. browser_type with {"locator":{"role":"textbox","name":"Email address"},"text":"a@b.com"} 2. browser_click with {"locator":{"role":"button","name":"Click counter"}} 3. browser_snapshot with {} 4. browser_click with {"ref":"e1","locator":{"text":"Sign in"}}` |
| P-LOC2 | `1. browser_click with {"locator":{"role":"button","name":"Load message in 1.5s"}} 2. browser_wait_for with {"locator":{"text":"Async content loaded!"}} 3. browser_evaluate with {"expression":"document.getElementById('async-area').textContent = ''"} 4. browser_wait_for with {"locator":{"text":"Async content loaded!"},"state":"hidden"} 5. browser_wait_for with {"state":"hidden","text":"x"}` |
| P-ASREF1 | `1. browser_evaluate with {"expression":"document.getElementById('counter')","asRef":true} 2. browser_click with {"ref":"<the eN on the [ref=eN] line of call 1>"} 3. browser_snapshot with {} 4. browser_evaluate with {"expression":"1+1","asRef":true}` |
| P-REP1 | `1. browser_click with {"locator":{"role":"button","name":"No such button"}}` |
| P-TAB3 | `1. browser_new_tab with {"url":"https://example.com"} 2. browser_snapshot with {}` (TAB-3's own URL, as Run 8; example.com is a public test domain, not the user's) |
| P-NET12 | `1. browser_new_tab with {"url":"http://localhost:8080/e2e-playground.html?s6=net12"} 2. browser_click with {"locator":{"role":"button","name":"Fetch JSON"}} 3. browser_network_requests with {"tab":"all"} 4. browser_close_tab with {"tab":"<the handle call 1 printed>"} 5. browser_network_requests with {"tab":"all"}` (`browser_close_tab` requires `tab`, registry.ts:577) |
| P-S8-1 | `1. browser_snapshot with {}` |
| P-S8-2 | `1. browser_click with {"locator":{"role":"button","name":"Click counter"}} 2. browser_snapshot with {}` |
| P-S8-3 | `1. browser_status with {}` |
| P-S8-4 | (no P0) `The user says: "use this tab". Do what the user asks with the browser tools you have, then call browser_status with {}. Reply only DONE.` |
| P-R0 | `1. browser_select_tab with {"tab":"<T#r>"} 2. browser_navigate with {"url":"http://localhost:8080/e2e-playground.html"}` (Run 8's set-up for the regression rows) |
| P-ACT1 | `1. browser_snapshot with {} 2. browser_type with {"ref":"<the ref of textbox \"Email address\">","text":"a@b.com"} 3. browser_screenshot with {}` |
| P-ACT2 | `1. browser_click with {"ref":"<the ref of button \"Click counter: 0\">"} 2. browser_screenshot with {} 3. browser_snapshot with {}` |
| P-TRUST2 | `1. browser_click with {"ref":"<the ref of button \"Trusted-only button\">","trusted":true} 2. browser_screenshot with {}` |
| P-EVAL1 | `1. browser_evaluate with {"expression":"document.title"}` |
| P-ACT3 | `1. browser_type with {"ref":"<the ref of textbox \"Email address\">","text":"x@y.com","submit":true} 2. browser_screenshot with {}` |
| P-NET1-a | `1. browser_network_clear with {}` — then the driver's hard reload (R9-NET-1) — P-NET1-b: `1. browser_network_requests with {} 2. browser_network_requests with {"id":"<the document row's id>"}` |
| P-DL1 | `1. browser_status with {} 2. browser_download with {"url":"http://localhost:8080/dl/hello.txt","path":"<$env:TEMP>\\bridge-e2e\\dl1\\"} 3. browser_status with {}` (then (c) and (d) of DL-1 with the same prompt, (d) adding `"overwrite":true`) |
| P-SDK7-M | (SDK-7 MCP leg, a fresh actor M with tools `browser_select_tab,browser_evaluate`; one `send` per numbered block, so no single turn grows large) M1: `1. browser_select_tab with {"tab":"<T#>"} 2. browser_evaluate with {"expression": <the START text, copied from sdk7-plan.txt into the prompt by the driver, byte for byte>}`; M2 (repeated, one `send` each, at most 60 times, until its output shows `"state": "done"` or `"state": "error"`): `1. browser_evaluate with {"expression": <the STATUS text>}`; M3…: for start = 0, 8000, 16000, … while start < `<L>`, one `send` per chunk: `1. browser_evaluate with {"expression": <the CHUNK text with that start and end = start + 8000>}`. Each expression is pasted into the prompt as a JSON string (the driver builds it with `ConvertTo-Json`); the model copies it into the call. NIT-4: START (~3 800 characters) is copied by the model, not pasted by the tool; a copy error is caught (the page refuses an unknown op, the export key or hash differs, or `assemble-mcp.ts` finds no matching STATUS/CHUNK) and makes the step invalid (rerun once in a fresh actor), never a silent pass. |
| P-STATUS-X | (MUX-8's actor X, tools `browser_status`) `1. browser_status with {}` |

Tool lists for `A start`: SA `browser_snapshot`; S1/S2 as in step 10; LA/LB as in step 11; C
`browser_snapshot,browser_click,browser_status,browser_use_active_tab`; the CUR actor
`browser_snapshot,browser_status,browser_use_active_tab,browser_new_tab`; LOC/ASREF/REP actor
`browser_type,browser_click,browser_snapshot,browser_wait_for,browser_evaluate`; TAB-3/NET-12 actor
`browser_new_tab,browser_snapshot,browser_click,browser_network_requests,browser_close_tab`; R as in step 14;
M `browser_select_tab,browser_evaluate`; X `browser_status`.

## Rows: command, expected text, pass rule, evidence

Expected texts are §4.19's (new rows), §4.18's (S5 rows) and the rows' own (regression), quoted there in
full; the table fixes the pass rule and the evidence. "verbatim" = copied from the script's stdout or the
actor's `OUTPUT:` block into `S6-run-record.md`.

| Row | Command(s) | Pass rule (written now) | Evidence |
|---|---|---|---|
| S6-STALE | `R recipes/s6.ts stale-check` | `STALE-CHECK NEW BUILD` and exit 0 (`staleVerdict`); `STALE-CHECK FAILED` is a STOP (step 3) | stdout verbatim |
| SDK-6D | `R recipes/blackboard/boot-bb.ts _1_1 --dry-run` | `SDK-6 (dry run) PASS — bb.VERSION stub-2026-10-23 …`, exit 0 | stdout |
| SDK-7D | `R recipes/blackboard/export-grades.ts _1_1 --dry-run`; `Get-FileHash` | `page export done … 2 columns, 4 grade records, 627 bytes, sha256 92fe62ab…a49c`; `MCP leg size: 626 characters → 1 chunk(s) of 8000; measurable: yes`; `… equal the page's: yes`; `SDK-7 (SDK leg, dry run) PASS`; `Get-FileHash` = `92FE62ABC12D1AC759E6B29F287520A7A486BE9150666372028E1027D389A49C` | stdout, hash |
| SDK-2 | `R recipes/s6.ts sdk2` | its `SDK-2 PASS` line (`sdk2Verdict`): code, message start, first candidate `button "Sign in"`, the report's candidate / snapshot (`- button "Sign in" [ref=e<N>]`) / `Screenshot:` lines, ≤ 60 lines, PNG exists outside the repo, `attachErrors: []`. Candidates 2–5 differing = `finding:`, recorded | stdout incl. the report block; the PNG path (file deleted) |
| SDK-3 | `R recipes/s6.ts sdk3` | `SDK-3 PASS` (`sdk3Verdict`): exact message, the 7 matches in order, `Matches (7):` + 7 lines in the report, nth:1 = `Fetch 404`, status `status: fetch ok.json -> 200` | stdout |
| SDK-4 | `R recipes/s6.ts sdk4` | `SDK-4 PASS`: visible 1200–5000 ms, hidden ≤ 1000 ms | stdout |
| SDK-5 | `R recipes/s6.ts sdk5` | `SDK-5 PASS`: ref `e<N>`; status matches `^status: hit at -?\d+,-?\d+ exp -?\d+,-?\d+ on=email \(isTrusted=true\)$`; activeElement `#email`; mark count 0 | stdout |
| SDK-1 | `R recipes/sdk-login.ts` with SA holding `?t5=sdk1-claude` | `SDK-1 PASS` + exit 0, and SA's two snapshots both of `?t5=sdk1-claude` with no error, and the log's `client + "sdk-login"` / `client - "sdk-login"` pair (S6.2 records this command and its output) | stdout; SA's two `OUTPUT:` blocks (first lines); log lines |
| SM-0 | `s6.ts sm0 --hold 120` + reload | reload exit 0; `SM-0 PASS` (`sm0Verdict`: disconnect and reconnect seen, no `tabGone` for `<T#a>`, snapshot ok, owner `s6-sm0`); and the log, from the reload on, has a new `extension resync:` line and no `extension session changed` line. `NOT MEASURED` = rerun | `sm0.out`; reload output; log lines |
| MUX-1 | as step 10 | §4.12 MUX-1 with its S5 note: five status lines ending `Cursor: none yet — the first tab tool claims the human's active tab`; one daemon with `ParentProcessId` = `<M>`; log `start` / `config … build=<sha>` / `listening` / `client + "claude-code #<M>" (1 client)` | S1 `OUTPUT:`; process listings; log |
| STAT-1 | `A send S1 "<P-STATUS>"` after MUX-2 | §4.3 STAT-1 with its S5 note: the four lines + `Cursor: <T#> "Agent Bridge E2E Playground" — http://localhost:8080/e2e-playground.html?t5=mux2 (held by me)`; a sixth line only if the human's tab differs | `OUTPUT:` |
| MUX-2 | step 10 | §4.12 MUX-2 **as corrected 2026-10-23 (S6 builder, §4.19)**: both statuses the same `build <sha>`, `Clients (2): claude-code #<M1>, claude-code #<M2>` in the same order, each ending `Cursor: none yet — …`; S1's snapshot of `…?t5=mux2` with `textbox "Email address" [ref=…]` and `button "Sign in" [ref=…]`; S2's snapshot the error `tab <T#> is held by "claude-code #<M1>" since <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab`; one daemon, the same `<D>` as MUX-1; log `client + "claude-code #<M2>" (2 clients)` and no new `start` | `OUTPUT:` blocks; listings; log |
| LEASE-1 | step 11, fresh actors LA (= A) and LB (= B), window `…?t5=lease1` | Run 8's expected text (§4.14) with its S5 note: LA's first snapshot of `?t5=lease1` with `button "Click counter: 0" [ref=e<N>]`; LB's refusal exactly `tab <T#a> is held by "claude-code #<A>" since <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab`; LB's tab `Opened tab <T#b> (in the background — browser_focus_tab shows it)`; parallel clicks each `Clicked e<N>` and each own snapshot `button "Click counter: 1"`; LA's list both lines with holders, `*` on `<T#a>` | `OUTPUT:` blocks with times |
| CUR-1…3, LOC-1, LOC-2, ASREF-1, REP-1 | §4.18 steps, prompts above | §4.18's Expected column, exactly; REP-1's PNG outside the repo, deleted after (failures-folder rule) | `OUTPUT:` blocks (REP-1's image block noted, not kept) |
| TAB-3 | P-TAB3 on a session whose tab is not on screen | TAB-3's S5 note: `Opened tab <T#> (in the background — browser_focus_tab shows it)` (or `Opened tab <T#>` if run with the session's tab on screen — record which); the snapshot acts on the new tab | `OUTPUT:` (example.com's snapshot url line only) |
| NET-12 | P-NET12 | NET-12 with its S5 note: the second tab's entries with a `tab:<T#>` column, gone after the close; the first tab's intact | `OUTPUT:` (fixture rows only) |
| SDK-8 | §4.19 SDK-8 | every clause of §4.19 SDK-8's Expected, including the `browser_use_active_tab` call in P-S8-4's transcript and `peek` → `Click counter: 0` | `OUTPUT:` blocks; peek stdout; the P-S8-4 `TOOL` lines |
| SDK-6 (live) | login step; `R recipes/blackboard/boot-bb.ts pp1` | §4.19 SDK-6 (live, pp1): `bb-login.ps1` exit 0; the resolution lines (branch recorded); `SDK-6 PASS — bb.VERSION <V> …`, exit 0; 8765 checks empty. `bb-login.ps1` exit 4 or any `REFUSED` ⇒ "waits for the user" | stdout (no id, title or URL in it) |
| SDK-7 (live) | "SDK-6/SDK-7 live" steps 4–10 | §4.19 SDK-7 (live, pp1): SDK leg PASS; plan has no id; MCP leg (if measurable) STATUS = the SDK leg's values, assemble 0 bad, `(= the page's: yes)`; S6.3 hashes equal; both paths ignored; 0 new failure PNGs (else a finding) | stdout (counts and hashes only); hashes; PNG counts |
| SM-1 | "SM-1 and MUX-8" | §4.19 SM-1 (pre-registered, copied verbatim; R1–R6): `SM-1 PASS` (`sm1Verdict`), `SM-1 LOG PASS` (`sm1LogVerdict`), daemon pid unchanged, counts equal. `NOT MEASURED` ⇒ recorded, not rerun | `sm1.out`; `sm1-log` stdout; listings; counts |
| MUX-8 | inside SM-1's quit window | §4.12 MUX-8 with its S5 correction (§4.19 "Also run"): first run `FAILED after <ms> ms — NOT_CONNECTED: …` (15000–16500 ms), exit 1; X's two status lines; second run `… — OK`, exit 0; the optional run not run | `mux8-1.out`, `mux8-2.out`; X's `OUTPUT:`; log lines |

### SDK-6/SDK-7 live (course pp1)

1. **Login [UI]** — no row before needs Blackboard. `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bb-login.ps1; $LASTEXITCODE`.
   It opens its own window on `https://ada.blackboard.com/`, prints counts and yes/no only, and invokes at
   most one sign-in button once (Chrome's autofill has filled the form; the script never reads or types a
   field). Exit `0` ⇒ step 2. Exit `4` ⇒ SDK-6 and SDK-7 **"waits for the user"**; the window is left open
   for the user; go to "SM-1 and MUX-8". Exit `2` (nothing touched) ⇒ once more; a second `2` ⇒ as `4`.
   The driver never takes a screenshot, snapshot or evaluate of that window, and never types into it.
2. **SDK-6 [SH]** — `Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue`;
   `R recipes/blackboard/boot-bb.ts pp1`; the 8765 check again. A `REFUSED — not logged in …` here means
   the login did not take: "waits for the user" for both rows (no second login).
3. **SDK-7 SDK leg [SH]** — `R recipes/blackboard/export-grades.ts pp1 --keep-open` → note `<T#>` and the
   `MCP leg size:` line (`<L>`, `<k>`, measurable).
4. **The plan [SH]** — `npm run -s recipe -- recipes/blackboard/export-grades.ts pp1 --mcp-plan > "$env:S6_OUT\sdk7-plan.txt"`;
   `Select-String -Path "$env:S6_OUT\sdk7-plan.txt" -Pattern '_\d+_\d+' -Quiet` → `False` (no course id in it).
5. If `measurable: no` ⇒ the MCP leg and S6.3 are recorded "not measured — `<L>` characters over the cap";
   skip to step 9.
6. `$F0 = FailPng`. `A start M --tools 'browser_select_tab,browser_evaluate'`; send M1, then M2 until done
   or error (at most 60), then M3… one chunk per `send` (P-SDK7-M, chunks of 8000); `A end M`; `$F1 = FailPng`.
7. **Failures folder [SH]** — the new names (`$F1` minus `$F0`): count recorded (expected 0); each deleted;
   the names are not recorded (a Blackboard page).
8. `R recipes/blackboard/assemble-mcp.ts "$env:T5_ACTORS\M\out.jsonl" pp1`.
9. `Get-FileHash exports\pp1-<date>.json, exports\pp1-<date>-mcp.json -Algorithm SHA256` → equal;
   `git check-ignore -v exports\pp1-<date>.json exports\pp1-<date>-mcp.json` → both printed.
10. `R recipes/s6.ts close-bb-tab <T#>` — closes the recipe's own course tab (unheld after `A end M`, or
    after step 3 if the MCP leg did not run), only if it is on an ada course page (checked in memory, never
    printed); `closed <T#> (the Blackboard recipe's course tab)`, exit 0. A refusal (exit 2) leaves it open
    and is recorded; the driver closes nothing else.
11. **Data hygiene:** M's `out.jsonl` and its `~/.claude/projects/…/<session>.jsonl` hold the export's text
    (student data) outside the repo; nothing from them is copied into the record but counts and hashes;
    deleting them is outside the repo and is the user's call (listed in the run record).

### SM-1 and MUX-8 (the one restart)

Before step 1: Ws and every other driver window closed (`Close-T5Window`), every actor ended (`A status`),
no recipe running. Steps as §4.19 SM-1 (1)–(12), with MUX-8 inside:
1. `A start X --tools 'browser_status'` (it calls nothing yet); `Get-BridgeDaemon` → pid `<D>` (record).
2. `$Wm = Open-T5Window "${U}sm1"`; `Count` → C1 (record windows `N`, tabs, per-window list, switches).
3. `Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList '-NoProfile','-File',"$env:S6_OUT\sm1.ps1"`
   with `sm1.ps1` = `npm run -s recipe -- recipes/s6.ts sm1 *> "$env:S6_OUT\sm1.out"`; wait for its
   `holding <T#a>` line (and its `daemon.status before:` line).
4. `$Q = [DateTime]::UtcNow.ToString('o')`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-quit.ps1; $LASTEXITCODE`
   → `0` (`QUIT OK`). `3` ⇒ STOP (Chrome still running; nothing is killed); `2` ⇒ nothing was sent: once more.
5. **MUX-8, first run:** `Get-Process chrome -ErrorAction SilentlyContinue` → nothing;
   `npx tsx recipes/hello.ts *> "$env:S6_OUT\mux8-1.out"; $LASTEXITCODE` (about 15 s); then
   `A send X "<P-STATUS-X>"`.
6. `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-launch.ps1 -Exe $Chrome -ArgLine '--restore-last-session'; $LASTEXITCODE` → `0`.
7. `Count` every 2 s until two equal readings; `Count -CloseBlank -Expect N` → equals C1, switches
   `[--restore-last-session]`.
8. Wait for `sm1.out`'s `extension back` line; none 120 s after step 6 ⇒ `reload-extension.ps1` once (exit
   `0`, else STOP), its time recorded. Then wait for `SM-1 PASS|FAIL|NOT MEASURED`.
9. `R recipes/s6.ts sm1-log --since $Q`; `Get-BridgeDaemon` → the same pid `<D>`.
10. **MUX-8, second run:** `$W8 = Open-T5Window "${U}mux8"`; `Set-T5Foreground $W8.Hwnd` → `True`; B1 →
    `<T#> fixture`; `npx tsx recipes/hello.ts *> "$env:S6_OUT\mux8-2.out"; $LASTEXITCODE`; `Close-T5Window $W8.Hwnd`;
    `A end X`; `Get-BridgeLog 12` (both `hello-recipe` pairs, the session-changed and resync lines).
11. `npx tsx recipes/t5.ts cleanup` (closes the restored `?t5=sm1` tab and its window); `Count` → equals
    the count before step 2.

## Regression rows (S6.5) — expected text from the last recorded run

| Row | Last recorded run | Expected text (unchanged unless noted) |
|---|---|---|
| MUX-2 | Run 7 (W1) | `Clients (2): claude-code #<M1>, claude-code #<M2>` in both statuses, same build; one daemon; log `client + "claude-code #<M2>" (2 clients)`, no new `start`. **Designed change** (Step 7 leases: one owner per tab, the `TAB_HELD` text of decisions.md · 2026-10-22 · T2's daemon details (#57); the S5 `Cursor:` line, decisions.md · 2026-10-23 · S5's MCP details … (#95) item 2): S2's snapshot is the `TAB_HELD` refusal above, not a second snapshot of the same tab; both statuses end `Cursor: none yet — …` (dated note in §4.19). |
| LEASE-1 | Run 8 | §4.14 LEASE-1 Expected; **designed change** S5 (#95, F26): B's new tab opens in the background, `Opened tab <T#b> (in the background — browser_focus_tab shows it)`, `*` stays on `<T#a>` (the row's dated note). |
| SCREEN-1 | Run 9 R9-SCREEN-1 | `npx tsx recipes/t5.ts screen1 --hue` on its own `?t5=screen-human` window: per run `… → magenta (hue rule) …`, `run k: human tab hidden +<a> ms, visible again +<b> ms → flash <f> ms`, the after line, `run k: PASS` for k = 1, 2, 3; `SCREEN-1 PASS — flash per run <f1>, <f2>, <f3> ms; median <m> ms (…)`. PASS needs the human's tab visible again ≤ 2000 ms after the call started; the flash is a number (Run 9: 1588 / 1557 / 1556, median 1557 ms; Run 8: median 1493 ms), over 1 s a finding, not a FAIL. No Step 8 change touches the switch path. |
| ACT-1 | Run 8 | `Typed into e1`; screenshot `status: email = a@b.com`. |
| ACT-2 | Run 8 | `Clicked e6`; screenshot `status: counter = 1`; snapshot `button "Click counter: 1" [ref=e6]`. |
| ACT-3 | Run 8 | `Typed into e1`; screenshot `status: form submitted (email = x@y.com)`. |
| TRUST-2 | Run 8 | `Clicked e7`; screenshot `status: TRUSTED click received`; the banner appears and clears (capture loop on Wr, as Run 8). **No change under #89**: the policy `focusFirst` is the SDK's; the MCP's trusted tools are unchanged (FE as-built). The session's tab must be the one on screen (the MCP does not focus): Wr is in front (step 14). |
| EVAL-1 | Run 8 | `Agent Bridge E2E Playground`; banner appears and clears. |
| NET-1 | Run 9 R9-NET-1 (#56, #68) | After `browser_network_clear {}` and a hard reload by keyboard (`Set-T5Foreground $Wr.Hwnd` → `True`, SendKeys `^+r`): `Network — active tab: showing 2 of 2 (recording since <t> ago; 0 pending)`, the rows `[<id>]  <t> ago   GET     200  document    <n>ms  12.8 KB  http://localhost:8080/e2e-playground.html` and `[<id2>]  <t> ago   GET     404  image       <n>ms  460 B   http://localhost:8080/favicon.ico` (R9-NET-1 verbatim apart from ids and times); the id lookup has `from cache: no` and `content-length: 13106` (the fixture is still 13 106 bytes at the pre-run commit); a new `"GET /e2e-playground.html HTTP/1.1" 200` in `http8080.log`; no banner. R's cursor is Wr's tab (P-R0), so its network calls read that tab. |
| DL-1 | Run 8 | (0) `False`; (a) exactly `Saved C:\Users\<you>\AppData\Local\Temp\bridge-e2e\dl1\hello.txt` and `69 bytes · text/plain · sha256 0a6b99ca15c2a72ad024d78d94d3980833b77efda41af17d0571d21fee2956ce`, no banner, both statuses the same `Active tab: [<T#>] …` line (each status now also ends with a `Cursor:` line, S5 — the compared line is unchanged); (b) `0A6B99CA…2956CE`, listing exactly `hello.txt`; (c) `… hello.txt exists — pass overwrite:true to replace it`; (d) the two lines of (a). |

## Hygiene (before anything is committed)

- **Daemon log** — copy `~/.chrome-agent-bridge/daemon.log` from step 1's `config` line to the end into
  `$env:S6_OUT\s6-daemon.log`; count — never print — `://`, the token (read into a variable from
  `bridge.token`, then `Remove-Variable`) and `[line withheld:`; expected `0`, `0`, `0`; a non-zero first or
  second count ⇒ not attached. Attach as `S6-daemon-log.txt` beside this sheet. Also count `_\d+_\d+` in it
  (expected 0: the daemon never logs a course id) and `ada.blackboard` (expected 0).
- **Failure screenshots** — the failures-folder rule above; `FailPng` at the end lists no file this wave made.
- **Exports** — `exports/` is gitignored (`git check-ignore exports/x.json` prints it); the dry-run files are
  deleted in step 6; the live files stay outside git.
- **S6.4** — `git status --short` after the wave: no path under `exports/`, nothing from
  `~/.chrome-agent-bridge/`, no PNG; record the output.
- Actor `out.jsonl` files and transcripts are evidence sources, not attachments: copy only fixture lines;
  from M, counts and hashes only.

## Watch items (record if seen; none is provoked)

- The residual late-restore race (T3 verifier V4 / T5b N1): a restore of a timed-out capture landing after a
  `focusTab` or spoiling the next capture.
- `waitFor {text}` on a long-hidden tab past its bound (the extension's 10 s; the MCP's 15 000 ms call
  timeout), e.g. in SDK-4 or LOC-2 if Chrome throttles the background tab.
- A navigation onto an error page ending a `waitFor {locator}` in `TIMEOUT` instead of `REF_STALE`/`NAV_FAILED`.
- A residual `data-__bridge-mark` attribute after `evaluateRef`/`asRef` (SDK-5 counts it; ASREF-1 may be
  checked with `document.querySelectorAll('[data-__bridge-mark]').length` if a run looks odd).
- `onStartup` arriving > 2 s after `onInstalled`, and a spurious `extension session changed` (retire) on a
  plain reload (SM-0 would FAIL on it).
- The reload recipe's "same second" proof (a new `extension resync` line in the same second, #65) against the
  up-to-2 s marker wait (#94): record the times of the reload's exit and of the `resync` line.
- A model losing track of a background-opened tab (CUR-3 (c), TAB-3; #95): an actor acting on a tab it did
  not mean, or asking for `browser_focus_tab` unprompted.
- SM-1: a reload needed after the relaunch (#80's reload path reuses `storage.local`'s marker — if the worker
  never ran after the restart, a reload could keep the old marker, and SM-1 would FAIL on it; record it).

## User-dependent rows

- **SDK-6, SDK-7** — granted (#96) on pp1; "waits for the user" only on the login or resolution outcomes
  named above. SDK-6D and SDK-7D run regardless.
- **SM-1** and **MUX-8** — granted (#96): one restart, both rows inside it.

## S6-run-record.md skeleton

```markdown
# S6 — run record (Run 12 (S6)), <date>
Rows and rules committed in <commit> before the build was loaded (S6.1). Attached: S6-daemon-log.txt
(<n> lines; hygiene <a>/<b>/<c>; course ids 0, ada.blackboard 0). No image, export or transcript is attached.

## Reload (step 2): exit <0>                                  ← the first recorded result line (#84)
## S6-STALE (step 3)                                         ← the second
## Set-up, before the reload (steps 0–1): pre-flight lines, build sha
## Daemon (4) · Driver window (5)
## SDK-6D, SDK-7D (6) · SDK-2…5 (7) · SDK-1 (8) · SM-0 (9)
## MUX-1, STAT-1, MUX-2 (10) · LEASE-1 (11) · S5 rows (12) · SDK-8 (13) · Regression + SCREEN-1 (14)
## SDK-6/SDK-7 live on pp1 (15): login exit, resolution branch, lines (no id/title/URL) | waits for the user
## SM-1 + MUX-8 (16): counts C1/after, quit, MUX-8 runs, launch, sm1.out, sm1-log, pid before/after
## Hygiene (17): counts, S6.4 git status, failure PNG counts deleted
## Watch items seen · Findings · Verdict per row
```
