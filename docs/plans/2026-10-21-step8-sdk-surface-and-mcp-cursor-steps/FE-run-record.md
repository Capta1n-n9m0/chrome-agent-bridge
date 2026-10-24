# FE — run record (Step 8 stage FE: focus emulation for trusted input), 2026-10-23

Evidence for the FE rows of `docs/e2e-test-plan.md` §4.17. Each block is the command and the text it
printed, copied from the driver's shell. Times UTC (2026-10-23 08:34–08:39Z). Rows and rules committed in
`6398f27` before the build was loaded (FE.4); the FE build is `6742c1f`; HEAD at the run `257dd8d`
(the ledger commit of step −1, docs only). Attached: `FE-daemon-log.txt` (37 lines; hygiene 0/0/0),
`FE-run-results.txt`, `FE-frames-positive.txt`, `FE-frames-block.txt`. No images were kept.

Chrome 156.0.8078.48, Node v25.2.1, Windows 11 Pro 10.0.26300. Run by the driver (Claude Opus 5.5),
the user not present (decisions.md #33). The driver session has no bridge MCP (`mcp procs: 0`).

**Shell set-up for every block.** The PowerShell tool keeps no state between calls, so every block began
by dot-sourcing one scratch file holding, verbatim, the wave sheet's set-up block (UTF-8 console,
nvm's node on `Path`, `. .\recipes\t5-win.ps1`, `$env:FE_OUT = "$env:TEMP\bridge-e2e\fe-run1"`, `$U`,
`FE`, `Start-FECapture`) and the §1 item 8 helpers, plus three conveniences: `B1` = `npx tsx
recipes/t5.ts find --current`, `TS` = the current UTC time, and `$Wf` re-read from a file holding the
driver window's handle (written once in step 3). Long outputs were sent to files under
`%TEMP%\bridge-e2e\` and printed from there (MUX-6 rule).

**About the user's Chrome, counts only.** One browser window with one tab existed before the run
(hwnd 527630) and was never named, captured, typed into or closed by the driver. `Get-T5ChromeWindows`
prints it with a fixture title, as in Runs 8–10 (W1's old probe copy of the fixture); it is not a driver
window. It was still there, unchanged, after close-down. 9 `chrome.exe` processes after the run.

## Step −1 — commit of the ledger line

```
$ git add docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/FE.ledger.md && git commit -m "docs(step8): FE ledger — build part closed, live part starting …"
257dd8d docs(step8): FE ledger — build part closed, live part starting
$ git status --short
status:[]
```

## Pre-flight (step 0) — 08:34:55Z

```
time 08:34:55.429Z
Test-Path FE_OUT: False
257dd8d docs(step8): FE ledger — build part closed, live part starting
97d6123 docs(step8): FE build closed — decision #88; journal
6742c1f feat(extension): FE — focus emulation for trusted input (verifier: PASS-with-notes)
status(ext/daemon/shared/sdk/mcp): []
status(all): []
daemon:
9234 listen:
BRIDGE_TOKEN: False
bridge.token
8080 listen:
node v25.2.1
driver chain: 29984 11568 25820 2272 256 12176 3220 14556
```
(`daemon:` and `9234 listen:` empty = no daemon, nothing on 9234. HEAD is two docs-only commits after
the FE build `6742c1f`, which itself follows the rows' commit `6398f27`: no extension/daemon change after
the build under test.)

```
mcp procs: 0
fixture server pid 15936
fixture 200 13106
time 08:35:11.105Z
```
(fixture server: `$HOME\miniconda3\python.exe -I -m http.server 8080 --bind 127.0.0.1 --directory
test-fixtures`, `-WindowStyle Hidden`, stderr to `%TEMP%\bridge-e2e\http8080.log`.)

```
$ npx tsc --noEmit -p recipes/tsconfig.fe.json; "tsc exit $LASTEXITCODE"
tsc exit 0
$ FE selftest   (last lines)
2026-10-23T08:35:19.259Z fe-selftest: ok — verdict with --csv-block pointing at a capture that shows the target → (B)
2026-10-23T08:35:19.260Z fe-selftest: ok — verdict with a missing capture file → STOP
2026-10-23T08:35:19.261Z fe-selftest: SELFTEST PASS — 79/79 checks as expected
exit 0
```

## Build (step 1) — 08:35:25Z

```
$ npm run build *> %TEMP%\bridge-e2e\fe-run1-build.txt; "build exit $LASTEXITCODE"
build exit 0
…
built mcp → dist/index.js
…
built extension → dist/
build sha 7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e
status: []
FE_OUT exists: False
```
(PowerShell 5.1 printed a `NativeCommandError` record for the daemon build's stderr line `built daemon →
dist/index.js` — the known 5.1 stderr wrapping; the exit code is 0.) The daemon build equals S0's
`7712e1af…` (decision #86): FE changed only the extension.

A daemon was started before the reload so that the reload's `daemon.log` check runs (§1 item 9:
"A daemon running before the press makes the check stronger"):
```
$ npx tsx recipes/hello.ts      (08:35:36Z; lines containing '://' filtered — there were none)
hello exit 0
2026-10-23T08:35:37.506Z hello-recipe: connecting (pid 31336)
2026-10-23T08:35:44.975Z hello-recipe: connected in 7469 ms as client c1 — daemon build 7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e, proto 2
2026-10-23T08:35:44.977Z hello-recipe: daemon.status — port 9234, up 7s, extension connected, clients (1): hello-recipe
2026-10-23T08:35:44.980Z hello-recipe: listTabs — 1 tab(s); active: [1108127127] Agent Bridge E2E Playground
2026-10-23T08:35:44.980Z hello-recipe: closed after 7474 ms — OK
daemon: ProcessId 21880, ParentProcessId 31336, CreationDate 10/23/2026 12:35:37 PM (local, UTC+4)
9234 listen: 127.0.0.1  21880
```
(The one tab listed is the user's window's tab, whose title is the fixture title, see above.)

## Reload (step 2) — the first recorded line

```
$ powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1; $LASTEXITCODE     (08:35:52.795Z)
2026-10-23T08:35:53.319Z reload-extension: extension Chrome Agent Bridge, ID cpnemjbgecfbeicldpaaegbhjgjgjfep (from C:\Users\aliev\Projects\chrome-remote-extention\extension)
2026-10-23T08:35:53.477Z reload-extension: daemon running: yes (pid 21880)
2026-10-23T08:35:53.929Z reload-extension: own window 3214576 opened
2026-10-23T08:35:54.881Z reload-extension: card found: ID cpnemjbgecfbeicldpaaegbhjgjgjfep, 1 reload button ('Reload', AutomationId dev-reload-button); inspect views: service worker, |  1 more…
2026-10-23T08:35:54.892Z reload-extension: pressed the reload button of the card
2026-10-23T08:35:58.453Z reload-extension: UIA: the card's service worker restart seen: yes; inspect views now: service worker, |  1 more…
2026-10-23T08:35:58.802Z reload-extension: daemon.log: new line '2026-10-23T08:35:55Z extension resync: 2 tabs, 0 gone'
2026-10-23T08:35:58.804Z reload-extension: RELOAD OK - the extension reconnected to the daemon after the press at 08:35:54.883Z; now run the stale-extension check
2026-10-23T08:35:59.023Z reload-extension: own window 3214576 closed
exit 0
```
**Exit `0`.**

## Driver window (step 3) — 08:36:05Z

```
windows before:
  Hwnd Title                                       Minimized Rect
527630 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096     (the user's window, see above)
$ $Wf = Open-T5Window "${U}fe-human"
Hwnd      : 1051630
Title     : Agent Bridge E2E Playground - Google Chrome
Minimized : False
Rect      : 1912,-8 1936x1096
(width 1936 ≥ 800: no Move-T5Window)
$ Set-T5Topmost $Wf.Hwnd; Set-T5Foreground $Wf.Hwnd
Set-T5Foreground: True
$ npx tsx recipes/t5.ts find --current
T3 fixture
windows after:
1051630 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
 527630 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
```

## FE-0 (step 4) — 08:36:15Z

```
Get-DaemonBuild: 7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e
T3 fixture
2026-10-23T08:36:17.465Z fe-check: connected as client c4 — daemon build 7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e, proto 2, extension connected
2026-10-23T08:36:17.534Z fe-check: human T3 (fixture page); target T4 (background, leased to fe-check)
2026-10-23T08:36:17.568Z fe-check: click e7 trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (21 ms)
2026-10-23T08:36:17.569Z fe-check: FE-0 PASS — the result carries focusEmulation "on": the extension is the FE build
exit 0
```
→ **FE-0 PASS** (first check; no re-check needed). `<sha>` = `Get-DaemonBuild`.

## FE-5 first (step 5) — 08:36:23Z

```
T3 fixture
2026-10-23T08:36:25.334Z fe-5: FE-5 (first) BG-1 trial 1: human T3; target T5 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:36:25.472Z fe-5: FE-5 (first) BG-1 trial 1: click e7 trusted → ok {"ok":true} (6 ms)
2026-10-23T08:36:25.490Z fe-5: FE-5 (first) BG-1 trial 1: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:36:25.491Z fe-5: FE-5 (first) BG-1 trial 1: human's side — listTabs reads 4 polls (0 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:36:25.491Z fe-5: FE-5 (first) BG-1 trial 1: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:36:25.499Z fe-5: FE-5 (first) BG-1 trial 1: BG-1's rule FAIL; received input: no
2026-10-23T08:36:25.592Z fe-5: FE-5 (first) BG-1 trial 2: human T3; target T6 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:36:25.734Z fe-5: FE-5 (first) BG-1 trial 2: click e7 trusted → ok {"ok":true} (5 ms)
2026-10-23T08:36:25.753Z fe-5: FE-5 (first) BG-1 trial 2: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:36:25.753Z fe-5: FE-5 (first) BG-1 trial 2: human's side — listTabs reads 4 polls (0 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:36:25.753Z fe-5: FE-5 (first) BG-1 trial 2: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:36:25.760Z fe-5: FE-5 (first) BG-1 trial 2: BG-1's rule FAIL; received input: no
2026-10-23T08:36:25.857Z fe-5: FE-5 (first) BG-1 trial 3: human T3; target T7 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:36:26.001Z fe-5: FE-5 (first) BG-1 trial 3: click e7 trusted → ok {"ok":true} (5 ms)
2026-10-23T08:36:26.019Z fe-5: FE-5 (first) BG-1 trial 3: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:36:26.020Z fe-5: FE-5 (first) BG-1 trial 3: human's side — listTabs reads 4 polls (0 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:36:26.020Z fe-5: FE-5 (first) BG-1 trial 3: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:36:26.028Z fe-5: FE-5 (first) BG-1 trial 3: BG-1's rule FAIL; received input: no
2026-10-23T08:36:26.126Z fe-5: FE-5 (first) BG-2 trial 1: human T3; target T8 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:36:26.271Z fe-5: FE-5 (first) BG-2 trial 1: type e11 "bg2typed" trusted → ok {"ok":true} (12 ms)
2026-10-23T08:36:26.288Z fe-5: FE-5 (first) BG-2 trial 1: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:36:26.288Z fe-5: FE-5 (first) BG-2 trial 1: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:36:26.288Z fe-5: FE-5 (first) BG-2 trial 1: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:36:26.295Z fe-5: FE-5 (first) BG-2 trial 1: BG-2's rule FAIL; received input: no
2026-10-23T08:36:26.386Z fe-5: FE-5 (first) BG-2 trial 2: human T3; target T9 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:36:26.535Z fe-5: FE-5 (first) BG-2 trial 2: type e11 "bg2typed" trusted → ok {"ok":true} (11 ms)
2026-10-23T08:36:26.551Z fe-5: FE-5 (first) BG-2 trial 2: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:36:26.551Z fe-5: FE-5 (first) BG-2 trial 2: human's side — listTabs reads 4 polls (0 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:36:26.551Z fe-5: FE-5 (first) BG-2 trial 2: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:36:26.558Z fe-5: FE-5 (first) BG-2 trial 2: BG-2's rule FAIL; received input: no
2026-10-23T08:36:26.649Z fe-5: FE-5 (first) BG-2 trial 3: human T3; target T10 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:36:26.791Z fe-5: FE-5 (first) BG-2 trial 3: type e11 "bg2typed" trusted → ok {"ok":true} (10 ms)
2026-10-23T08:36:26.807Z fe-5: FE-5 (first) BG-2 trial 3: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:36:26.807Z fe-5: FE-5 (first) BG-2 trial 3: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:36:26.807Z fe-5: FE-5 (first) BG-2 trial 3: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:36:26.814Z fe-5: FE-5 (first) BG-2 trial 3: BG-2's rule FAIL; received input: no
2026-10-23T08:36:26.815Z fe-5: FE-5 control (first) — BG-1 received input in 0/3 trials, BG-2 in 0/3; control holds
exit 0
```
→ **control holds** (0/3, 0/3).

## FE-PC positive control (step 6) — 08:36:34Z

```
T3 fixture
$ $c = Start-FECapture $Wf.Hwnd positive 30
capture pid 20428 started 08:36:35.403Z
(Start-Sleep -Seconds 3)
$ FE positive
2026-10-23T08:36:39.538Z fe-positive: human T3 (cyan bar); target T11 (magenta bar, background, leased to fe-positive)
2026-10-23T08:36:43.700Z fe-positive: screenshot T11 (default mode) → ok; call 1792744600543 → 1792744602178 (1635 ms)
2026-10-23T08:36:43.700Z fe-positive: human tab hidden +5 ms, visible again +1619 ms
2026-10-23T08:36:43.700Z fe-positive: POSITIVE (page timestamps) PASS — the human's-tab logger saw hidden → visible
exit 0
(wait until $c.HasExited)
capture exited: True at 08:37:06.083Z
$ FE frames "$env:FE_OUT\frames-positive.csv" --for positive
2026-10-23T08:37:07.094Z fe-frames: 295 frames; frames showing magenta 16, cyan 279
2026-10-23T08:37:07.097Z fe-frames: POSITIVE (capture loop) PASS — a frame during the flash shows the target's magenta bar; none before
exit 0
```
→ **page PASS; capture PASS.** (The flash, +5 → +1619 ms, matches Runs 8/9's ~1.5 s.)

## FE-1, FE-2, FE-3 and the block capture (step 7) — 08:37:15Z

One PowerShell call, nothing else started in between (output sent to a file and printed after):
```
time 08:37:15.623Z
Set-T5Foreground: True
capture pid 15344 started 08:37:16.048Z
(Start-Sleep -Seconds 3)
Get-T5Foreground:
Hwnd  : 1051630
Title : Agent Bridge E2E Playground - Google Chrome
Wf.Hwnd 1051630
T3 fixture
2026-10-23T08:37:21.302Z fe-1: FE-1 trial 1: human T3; target T12 (background, leased to fe-1); target visibilityState hidden
2026-10-23T08:37:21.447Z fe-1: FE-1 trial 1: click e7 trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (18 ms)
2026-10-23T08:37:21.466Z fe-1: FE-1 trial 1: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:21.467Z fe-1: FE-1 trial 1: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:21.467Z fe-1: FE-1 trial 1: observation — target page visible +6 ms, hidden again +19 ms (start hidden; read after the call hidden)
2026-10-23T08:37:21.475Z fe-1: FE-1 trial 1: FAIL — expected "status: TRUSTED click received"
2026-10-23T08:37:21.566Z fe-1: FE-1 trial 2: human T3; target T13 (background, leased to fe-1); target visibilityState hidden
2026-10-23T08:37:21.715Z fe-1: FE-1 trial 2: click e7 trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (23 ms)
2026-10-23T08:37:21.732Z fe-1: FE-1 trial 2: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:21.733Z fe-1: FE-1 trial 2: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:21.733Z fe-1: FE-1 trial 2: observation — target page visible +6 ms, hidden again +23 ms (start hidden; read after the call hidden)
2026-10-23T08:37:21.739Z fe-1: FE-1 trial 2: FAIL — expected "status: TRUSTED click received"
2026-10-23T08:37:21.836Z fe-1: FE-1 trial 3: human T3; target T14 (background, leased to fe-1); target visibilityState hidden
2026-10-23T08:37:21.988Z fe-1: FE-1 trial 3: click e7 trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (34 ms)
2026-10-23T08:37:22.005Z fe-1: FE-1 trial 3: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:22.005Z fe-1: FE-1 trial 3: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:22.005Z fe-1: FE-1 trial 3: observation — target page visible +7 ms, hidden again +35 ms (start hidden; read after the call hidden)
2026-10-23T08:37:22.012Z fe-1: FE-1 trial 3: FAIL — expected "status: TRUSTED click received"
2026-10-23T08:37:22.012Z fe-1: FE-1 FAIL — 0/3 trials PASS; FE-4 trials 3/3 PASS (the window clauses: frames --for block)
exit 0
T3 fixture
2026-10-23T08:37:24.279Z fe-2: FE-2 trial 1: human T3; target T15 (background, leased to fe-2); target visibilityState hidden
2026-10-23T08:37:24.437Z fe-2: FE-2 trial 1: type e11 "bg2typed" trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (39 ms)
2026-10-23T08:37:24.454Z fe-2: FE-2 trial 1: target status "status: TRUSTED input = bg2typed"; field value "bg2typed"; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:24.454Z fe-2: FE-2 trial 1: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:24.454Z fe-2: FE-2 trial 1: observation — target page visible +5 ms, hidden again +39 ms (start hidden; read after the call hidden)
2026-10-23T08:37:24.461Z fe-2: FE-2 trial 1: PASS
2026-10-23T08:37:24.555Z fe-2: FE-2 trial 2: human T3; target T16 (background, leased to fe-2); target visibilityState hidden
2026-10-23T08:37:24.746Z fe-2: FE-2 trial 2: type e11 "bg2typed" trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (38 ms)
2026-10-23T08:37:24.763Z fe-2: FE-2 trial 2: target status "status: TRUSTED input = bg2typed"; field value "bg2typed"; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:24.763Z fe-2: FE-2 trial 2: human's side — listTabs reads 5 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:24.763Z fe-2: FE-2 trial 2: observation — target page visible +5 ms, hidden again +38 ms (start hidden; read after the call hidden)
2026-10-23T08:37:24.770Z fe-2: FE-2 trial 2: PASS
2026-10-23T08:37:24.863Z fe-2: FE-2 trial 3: human T3; target T17 (background, leased to fe-2); target visibilityState hidden
2026-10-23T08:37:25.037Z fe-2: FE-2 trial 3: type e11 "bg2typed" trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (39 ms)
2026-10-23T08:37:25.053Z fe-2: FE-2 trial 3: target status "status: TRUSTED input = ped"; field value "ped"; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:25.053Z fe-2: FE-2 trial 3: human's side — listTabs reads 5 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:25.053Z fe-2: FE-2 trial 3: observation — target page visible +5 ms, hidden again +39 ms (start hidden; read after the call hidden)
2026-10-23T08:37:25.060Z fe-2: FE-2 trial 3: FAIL — expected "status: TRUSTED input = bg2typed" and value "bg2typed"
2026-10-23T08:37:25.060Z fe-2: FE-2 FAIL — 2/3 trials PASS; FE-4 trials 3/3 PASS (the window clauses: frames --for block)
exit 0
T3 fixture
2026-10-23T08:37:27.323Z fe-3: FE-3 trial 1: human T3; target T18 (background, leased to fe-3); target visibilityState hidden; focus step (evaluate el.focus()): document.activeElement is #trusted-input: yes
2026-10-23T08:37:27.495Z fe-3: FE-3 trial 1: pressKey ArrowLeft trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (34 ms)
2026-10-23T08:37:27.513Z fe-3: FE-3 trial 1: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:27.513Z fe-3: FE-3 trial 1: human's side — listTabs reads 5 polls (2 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:27.513Z fe-3: FE-3 trial 1: observation — target page visible +4 ms, hidden again +33 ms (start hidden; read after the call hidden)
2026-10-23T08:37:27.520Z fe-3: FE-3 trial 1: FAIL — expected "status: TRUSTED key = ArrowLeft"
2026-10-23T08:37:27.616Z fe-3: FE-3 trial 2: human T3; target T19 (background, leased to fe-3); target visibilityState hidden; focus step (evaluate el.focus()): document.activeElement is #trusted-input: yes
2026-10-23T08:37:27.748Z fe-3: FE-3 trial 2: pressKey ArrowLeft trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (14 ms)
2026-10-23T08:37:27.766Z fe-3: FE-3 trial 2: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:27.766Z fe-3: FE-3 trial 2: human's side — listTabs reads 4 polls (0 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:27.766Z fe-3: FE-3 trial 2: observation — target page visible +3 ms, hidden again +14 ms (start hidden; read after the call hidden)
2026-10-23T08:37:27.774Z fe-3: FE-3 trial 2: FAIL — expected "status: TRUSTED key = ArrowLeft"
2026-10-23T08:37:27.870Z fe-3: FE-3 trial 3: human T3; target T20 (background, leased to fe-3); target visibilityState hidden; focus step (evaluate el.focus()): document.activeElement is #trusted-input: yes
2026-10-23T08:37:28.052Z fe-3: FE-3 trial 3: pressKey ArrowLeft trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (22 ms)
2026-10-23T08:37:28.071Z fe-3: FE-3 trial 3: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:28.071Z fe-3: FE-3 trial 3: human's side — listTabs reads 5 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:28.071Z fe-3: FE-3 trial 3: observation — target page visible +3 ms, hidden again +22 ms (start hidden; read after the call hidden)
2026-10-23T08:37:28.078Z fe-3: FE-3 trial 3: FAIL — expected "status: TRUSTED key = ArrowLeft"
2026-10-23T08:37:28.078Z fe-3: FE-3 FAIL — 0/3 trials PASS; FE-4 trials 3/3 PASS (the window clauses: frames --for block)
exit 0
stop file at 08:37:28.124Z
capture exited: True at 08:37:28.396Z
2026-10-23T08:37:29.400Z fe-frames: 113 frames; frames showing magenta 0, cyan 113
2026-10-23T08:37:29.402Z fe-frames: FE-4 (window capture over 9 trials, 71 frames) PASS — no frame shows the target; the foreground window never changed
exit 0
```
→ FE-1 **FAIL** (0/3), FE-2 **FAIL** (2/3: trial 3 got `ped`), FE-3 **FAIL** (0/3); FE-4 trials 9/9
PASS; block capture **PASS** (not void). The foreground read was `$Wf.Hwnd` at once (no second
`Set-T5Foreground`). Exit codes all `0`; no trial command exited 1, 2 or 3, so nothing was re-run.

## FE-5 last (step 8) — 08:37:36Z

```
T3 fixture
2026-10-23T08:37:38.706Z fe-5: FE-5 (last) BG-1 trial 1: human T3; target T21 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:37:38.832Z fe-5: FE-5 (last) BG-1 trial 1: click e7 trusted → ok {"ok":true} (11 ms)
2026-10-23T08:37:38.849Z fe-5: FE-5 (last) BG-1 trial 1: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:38.850Z fe-5: FE-5 (last) BG-1 trial 1: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:38.850Z fe-5: FE-5 (last) BG-1 trial 1: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:38.857Z fe-5: FE-5 (last) BG-1 trial 1: BG-1's rule FAIL; received input: no
2026-10-23T08:37:38.948Z fe-5: FE-5 (last) BG-1 trial 2: human T3; target T22 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:37:39.096Z fe-5: FE-5 (last) BG-1 trial 2: click e7 trusted → ok {"ok":true} (6 ms)
2026-10-23T08:37:39.112Z fe-5: FE-5 (last) BG-1 trial 2: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:39.112Z fe-5: FE-5 (last) BG-1 trial 2: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:39.113Z fe-5: FE-5 (last) BG-1 trial 2: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:39.119Z fe-5: FE-5 (last) BG-1 trial 2: BG-1's rule FAIL; received input: no
2026-10-23T08:37:39.210Z fe-5: FE-5 (last) BG-1 trial 3: human T3; target T23 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:37:39.351Z fe-5: FE-5 (last) BG-1 trial 3: click e7 trusted → ok {"ok":true} (7 ms)
2026-10-23T08:37:39.367Z fe-5: FE-5 (last) BG-1 trial 3: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:39.367Z fe-5: FE-5 (last) BG-1 trial 3: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:39.368Z fe-5: FE-5 (last) BG-1 trial 3: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:39.374Z fe-5: FE-5 (last) BG-1 trial 3: BG-1's rule FAIL; received input: no
2026-10-23T08:37:39.466Z fe-5: FE-5 (last) BG-2 trial 1: human T3; target T24 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:37:39.590Z fe-5: FE-5 (last) BG-2 trial 1: type e11 "bg2typed" trusted → ok {"ok":true} (11 ms)
2026-10-23T08:37:39.608Z fe-5: FE-5 (last) BG-2 trial 1: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:39.608Z fe-5: FE-5 (last) BG-2 trial 1: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:39.608Z fe-5: FE-5 (last) BG-2 trial 1: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:39.615Z fe-5: FE-5 (last) BG-2 trial 1: BG-2's rule FAIL; received input: no
2026-10-23T08:37:39.708Z fe-5: FE-5 (last) BG-2 trial 2: human T3; target T25 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:37:39.859Z fe-5: FE-5 (last) BG-2 trial 2: type e11 "bg2typed" trusted → ok {"ok":true} (10 ms)
2026-10-23T08:37:39.875Z fe-5: FE-5 (last) BG-2 trial 2: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:39.875Z fe-5: FE-5 (last) BG-2 trial 2: human's side — listTabs reads 4 polls (0 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:39.875Z fe-5: FE-5 (last) BG-2 trial 2: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:39.882Z fe-5: FE-5 (last) BG-2 trial 2: BG-2's rule FAIL; received input: no
2026-10-23T08:37:39.973Z fe-5: FE-5 (last) BG-2 trial 3: human T3; target T26 (background, leased to fe-5); target visibilityState hidden
2026-10-23T08:37:40.096Z fe-5: FE-5 (last) BG-2 trial 3: type e11 "bg2typed" trusted → ok {"ok":true} (12 ms)
2026-10-23T08:37:40.113Z fe-5: FE-5 (last) BG-2 trial 3: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:40.113Z fe-5: FE-5 (last) BG-2 trial 3: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:40.113Z fe-5: FE-5 (last) BG-2 trial 3: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:40.120Z fe-5: FE-5 (last) BG-2 trial 3: BG-2's rule FAIL; received input: no
2026-10-23T08:37:40.120Z fe-5: FE-5 control (last) — BG-1 received input in 0/3 trials, BG-2 in 0/3; control holds
exit 0
```
→ **control holds** (0/3, 0/3).

## FE-3c observation (step 9) — 08:37:40Z

```
T3 fixture
2026-10-23T08:37:42.332Z fe-3c: FE-3c trial 1: human T3; target T27 (background, leased to fe-3c); target visibilityState hidden; focus step (evaluate el.focus()): document.activeElement is #trusted-input: yes
2026-10-23T08:37:42.472Z fe-3c: FE-3c trial 1: pressKey ArrowLeft trusted → ok {"ok":true} (5 ms)
2026-10-23T08:37:42.488Z fe-3c: FE-3c trial 1: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:42.488Z fe-3c: FE-3c trial 1: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:42.488Z fe-3c: FE-3c trial 1: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:42.496Z fe-3c: FE-3c trial 1: FAIL — expected "status: TRUSTED key = ArrowLeft"
2026-10-23T08:37:42.600Z fe-3c: FE-3c trial 2: human T3; target T28 (background, leased to fe-3c); target visibilityState hidden; focus step (evaluate el.focus()): document.activeElement is #trusted-input: yes
2026-10-23T08:37:42.723Z fe-3c: FE-3c trial 2: pressKey ArrowLeft trusted → ok {"ok":true} (4 ms)
2026-10-23T08:37:42.739Z fe-3c: FE-3c trial 2: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:42.739Z fe-3c: FE-3c trial 2: human's side — listTabs reads 3 polls (0 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:42.739Z fe-3c: FE-3c trial 2: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:42.746Z fe-3c: FE-3c trial 2: FAIL — expected "status: TRUSTED key = ArrowLeft"
2026-10-23T08:37:42.840Z fe-3c: FE-3c trial 3: human T3; target T29 (background, leased to fe-3c); target visibilityState hidden; focus step (evaluate el.focus()): document.activeElement is #trusted-input: yes
2026-10-23T08:37:42.964Z fe-3c: FE-3c trial 3: pressKey ArrowLeft trusted → ok {"ok":true} (5 ms)
2026-10-23T08:37:42.982Z fe-3c: FE-3c trial 3: target status "status: idle"; field value ""; target visibilityState hidden (read after the call returned)
2026-10-23T08:37:42.982Z fe-3c: FE-3c trial 3: human's side — listTabs reads 4 polls (1 overlapping the call) + before/after; human current, never hidden; window active tabs unchanged; target never active → FE-4 trial PASS
2026-10-23T08:37:42.982Z fe-3c: FE-3c trial 3: observation — target page visible never, hidden again never (start hidden; read after the call hidden)
2026-10-23T08:37:42.990Z fe-3c: FE-3c trial 3: FAIL — expected "status: TRUSTED key = ArrowLeft"
2026-10-23T08:37:42.990Z fe-3c: FE-3c observation (not in the outcome table) — without the option the key reached the page in 0/3 trials
exit 0
```
→ FE-3c: 0/3 without the option (FE-3 would have discriminated; it failed with the option too).

## Verdict (step 10) — 08:37:43Z

```
2026-10-23T08:37:44.048Z fe-verdict: FE-0: PASS (daemon build 7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e)
2026-10-23T08:37:44.049Z fe-verdict: positive control: page timestamps PASS; capture loop PASS
2026-10-23T08:37:44.049Z fe-verdict: FE-5 (first): BG-1 received input in 0/3, BG-2 in 0/3; (last): BG-1 0/3, BG-2 0/3 → control holds
2026-10-23T08:37:44.049Z fe-verdict: FE-1 (click): 0/3 trials PASS → FAIL
2026-10-23T08:37:44.049Z fe-verdict: FE-2 (type): 2/3 trials PASS → FAIL
2026-10-23T08:37:44.049Z fe-verdict: FE-3 (pressKey): 0/3 trials PASS → FAIL
2026-10-23T08:37:44.049Z fe-verdict: FE-4: trials 9/9 PASS; window capture PASS (no frame shows the target; foreground constant) → PASS
2026-10-23T08:37:44.049Z fe-verdict: OUTCOME (B) — no kind passes: policy "focusFirst"
exit 0
```
→ **OUTCOME (B)** — no kind passes: policy `"focusFirst"`. Re-run on the attached copies after
close-down (`FE verdict --results FE-run-results.txt --csv-positive FE-frames-positive.txt --csv-block
FE-frames-block.txt`, 08:38:34Z) printed the same eight lines (timestamps aside), last line
`fe-verdict: OUTCOME (B) — no kind passes: policy "focusFirst"`, `exit 0`.

## Observations (not judged)

- **The target page's visibility with the option on** (each trial's `observation —` line): in all nine
  FE-1…FE-3 trials the target page logged `visible` 3–7 ms after the call began and `hidden` again
  14–39 ms after it, i.e. at about the call's end (call times 14–39 ms), and read `hidden` after the call
  returned. This confirms stage0-audit F1's reading of Chromium's source for Chrome 156 (emulation
  raises the page to `visible` while it is on). Without the option (FE-5, FE-3c) the target logged no
  change (`visible never`).
- **Emulation still on after a call (decision #88's Revisit-if):** not seen. In every one of the nine
  trials the target read `hidden` after the call returned and its logger had already recorded `hidden
  again` inside the call's span. No disable failure was reported (every result `{"ok":true,
  "focusEmulation":"on"}`).
- **The human's side:** the human's tab (T3) stayed `current` and never `hidden` in every read of every
  trial (FE-4 trials 9/9; FE-5 and FE-3c too); no window capture showed the target; the foreground
  window was `1051630` in every frame of the block span. Whatever the input did, the human saw nothing
  but (presumably) the debugging banner (not captured: the capture records colours of the page's top
  rows, not the banner).
- **What arrived:** clicks did not (0/3, status `idle`); typing arrived whole in 2/3 trials and
  **partly** in trial 3 (`ped` — the last three characters of `bg2typed`; the first five were lost); the
  `ArrowLeft` keydown did not arrive (0/3) though `el.focus()` set `document.activeElement` to
  `#trusted-input` in every trial (`yes` ×6, FE-3 and FE-3c). The partial `ped` suggests the emulated
  focus/visibility takes effect asynchronously, a few `Input.*` events after the enable — a race, which
  would also explain the lost single click and single keydown (unconfirmed; not judged).
- **Call times:** FE-1 18/23/34 ms; FE-2 39/38/39 ms; FE-3 34/14/22 ms; FE-5 5–12 ms; FE-3c 4–5 ms; FE-0
  21 ms. Positive control: screenshot 1635 ms, human's tab hidden +5 → visible +1619 ms.
- **FE-0's click** reached the page or not — not judged (§4.17).
- The block capture had 113 frames over ~12 s, 71 of them in the judged span; the positive capture 295
  frames in 30 s (16 magenta, in the flash).

## Close-down and hygiene (step 11) — 08:37:51Z

```
time 08:37:51.473Z
2026-10-23T08:37:52.542Z t5-cleanup: closed T3 (fe-human)
cleanup exit 0
$ Set-T5Topmost $Wf.Hwnd -Off
windows before close:
527630 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
$ Close-T5Window $Wf.Hwnd
windows after close:
527630 Agent Bridge E2E Playground - Google Chrome     False 1912,-8 1936x1096
fixture server 15936 : safe: the tree of 15936 does not contain the driver
```
(`cleanup` closed the driver's only tab T3, which closed Wf with it, as in Run 10; `Set-T5Topmost -Off`
and `Close-T5Window` then went to a handle that no longer existed — harmless. The user's window 527630
was untouched.)

```
time 08:38:06.300Z
Test-SafeToKill 15936 -> safe: the tree of 15936 does not contain the driver
stopped fixture server 15936
daemon: ProcessId 21880, ParentProcessId 31336, CreationDate 10/23/2026 12:35:37 PM
Test-SafeToKill 21880 -> safe: the tree of 21880 does not contain the driver
stopped daemon 21880
daemon now: 0
9234 listen: 0
8080 listen: 0
fe-win procs: 0
node procs (repo): 0
```

Log hygiene (wave sheet; §4.12's block) on `daemon.log` from the reload's `extension resync` line
(`2026-10-23T08:35:55Z extension resync: 2 tabs, 0 gone`) to the end, copied to
`%TEMP%\bridge-e2e\fe-daemon.log`:
```
resync line index 535 of 572
lines 37
'://' count 0
token count 0
withheld count 0
fe-results.jsonl '://' count 0
frames-positive.csv '://' count 0
frames-block.csv '://' count 0
```
(and `title|playground|localhost|http` in `fe-results.jsonl`: 0 matches.) **0 / 0 / 0.** Attached:
`FE-daemon-log.txt` (37 lines), `FE-run-results.txt` (28 records), `FE-frames-positive.txt` (296 lines),
`FE-frames-block.txt` (114 lines). Left running: Chrome only (9 `chrome.exe` processes).

## Deviations and set-up fixes

- **No set-up fix**: no helper, recipe or rule was edited; no command exited 2 or 3; no row or trial was
  re-run. `FE-0` passed at the first check.
- **Not in the sheet, recorded:** (1) a daemon was started with `npx tsx recipes/hello.ts` (foreground,
  returned at once) before the reload, so the reload script's `daemon.log` check could run and the
  hygiene window could start at the reload's `extension resync` line (§1 item 9 recommends it); it
  cannot affect a verdict. (2) Each PowerShell block re-loaded the set-up from one scratch file (the tool
  keeps no shell state); the block of step 7 was one call, with nothing started between `fe1`, `fe2`
  and `fe3` but the B1 checks the sheet asks for. (3) Step 7's, 8–10's and 11's outputs went to files
  under `%TEMP%\bridge-e2e\` and were printed after the call (the sheet's "send long output to a file").
  (4) The wave sheet's pre-flight wording "HEAD is the FE commit that holds this sheet and §4.17, or a
  later commit with no extension/daemon change": HEAD `257dd8d` follows the FE build commit `6742c1f`
  (which changed `extension/`, the build under test) by two docs-only commits; read as intended.
