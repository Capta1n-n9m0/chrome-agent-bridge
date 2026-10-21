# D6 verifier report — E2E rows (autonomous part)

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-22. Read-only except this file. Audited the
uncommitted working tree on HEAD `32d227e`: `docs/e2e-test-plan.md` (+178 lines), `recipes/hello.ts`,
`recipes/tsconfig.json`, `test-fixtures/dl/hello.txt`, `test-fixtures/redirect_server.py`.

## Checks run (all green unless noted)

| Check | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` | exit 0 |
| recipe typecheck | `npx tsc --noEmit -p recipes` | exit 0 |
| tests | `npm test` | `42 passed (42)`, `542 passed (542)` |
| build | `npm run build` | exit 0 |
| extension untouched | `git diff -- extension/ \| wc -l` | `0` |
| additions only | `git diff -- docs/e2e-test-plan.md \| grep '^-' \| grep -v '^---' \| wc -l` | `0` (CONN-1/2/3/6/7 and STAT-1 unchanged) |
| token ignored | `git check-ignore -v bridge.token` | `.gitignore:16:bridge.token	bridge.token` |
| fixture hash | `sha256sum test-fixtures/dl/hello.txt; wc -c` | `0a6b99ca…2956ce`, `69` (matches the claim) |
| daemon build deterministic (MUX-5 undo) | `sha256sum daemon/dist/index.js; npm run build --workspace daemon; sha256sum …` | `795fb769…37bd` before and after |
| PowerShell syntax | the 4 ```` ```powershell ```` blocks extracted to the scratchpad (placeholders `<D>`, `<P2>`… replaced by numbers), parsed with `[System.Management.Automation.Language.Parser]::ParseFile` in `powershell -NoProfile` (5.1) | `0 errors` in each; no `&&`, `?.` or ternaries in the inline commands either |
| no-token path | `BRIDGE_PORT=47811 npx tsx recipes/hello.ts` (temp HOME/USERPROFILE, BRIDGE_TOKEN unset) | `FAILED after 2 ms — NOT_CONNECTED: No bridge token: set the BRIDGE_TOKEN environment variable, or put the token in C:\…\bridge.token (missing or empty). …`, exit 1, no token printed |
| missing daemon | `BRIDGE_DAEMON='C:\nope\index.js' …` | `FAILED after 2 ms — NOT_CONNECTED: daemon not built — run \`npm run build\` (looked for C:\nope\index.js, from BRIDGE_DAEMON; …)`, exit 1 |
| MUX-8 text + timing | throwaway daemon, dummy token, port 47811, no extension | `FAILED after 15301 ms — NOT_CONNECTED: Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 15000 ms on port 47811)` — text matches `sdk/src/connect.ts` and the row; 15301 ∈ [15000, 16500] |
| log line formats | `cat <tempHOME>/.chrome-agent-bridge/daemon.log` | `2026-10-21T22:41:48Z start pid=28616`, `config pid=28616 port=47811 idleMs=20000 build=795fb769…`, `listening on 127.0.0.1:47811`, `client + "hello-recipe" (1 client)`, `client - "hello-recipe" (0 clients)` — all as quoted in the rows |
| MUX-3 lines | fake extension (a `ws` client sending a v1 hello, answering `listTabs`) + `npx tsx recipes/hello.ts 3000` | `connecting (pid …)`, `connected in 15 ms as client c2 — daemon build 795f…, proto 2`, `daemon.status — port 47811, up 26s, extension connected, clients (1): hello-recipe`, `listTabs — 1 tab(s); active: [7] Fake tab`, `holding the connection for 3000 ms — call browser_status now`, `closed after 3028 ms — OK`, exit 0 — matches the row |
| MUX-4 idle | same daemon, `BRIDGE_DAEMON_IDLE_MS=20000` | `22:42:17Z client - "hello-recipe" (0 clients)` → `22:42:37Z idle for 20000 ms with no clients — shutting down` → `22:42:37Z exit 0 (shutdown 1001) clients=0 extensionEvents=0 ignoredClientFrames=0`; fake extension saw close `1001` at 22:42:37.427. T1 − T0 = 20 s. The recipe process exited promptly after `— OK` |
| MUX-5 handover | a scratch copy of `daemon/dist/index.js` (node_modules junction) via `BRIDGE_DAEMON`; recipe A held, comment appended to the copy, recipe B run | B: `connected in 530 ms … build 18d15dca…` (new), `up 0s`, OK. A: `daemon restarted (4002) — reconnected as client c1 to build 18d15dca…`. So the appended comment changes the hash that `daemon/src/build.ts` and `sdk/src/spawn.ts hashDaemon` compute, the SDK hands over, and a connected client follows on 4002 with the handover disabled (same file → same expected build). Log excerpt in finding 4 |
| MUX-6 race | `node --import tsx recipes/hello.ts` ×2 in background, no daemon | both OK, both `.err` empty; log: two `start`, one `listening`, one `port 47811 in use — another daemon owns it` + `exit 0 (port in use)`; one listener left |
| redirect fixture | `python -I test-fixtures/redirect_server.py 48181 http://localhost:48080/dl/hello.txt`; `curl -si http://127.0.0.1:48181/dl2` | bound `127.0.0.1:48181` only; `HTTP/1.0 302 Found`, `Location: http://localhost:48080/dl/hello.txt`, `Content-Length: 0`, `Cache-Control: no-store`, no `Access-Control-*` header (also none with `Origin:` sent); window logs `"GET /dl2 HTTP/1.1" 302 -`. Item-7-style server: `Content-type: text/plain`, `Content-Length: 69`; `curl -sL` through the redirect → sha256 `0a6b99ca…2956ce` |
| cleanup | `tasklist`, `netstat -ano \| grep :9234` | only the pre-existing PID 2928 (codex host-daemon) remains; nothing on 9234 at any time; nothing left on 47811/48080/48181; the scratch junction removed with `rmdir` (target intact, 167 entries) |

Source cross-checks: every quoted `browser_status` line matches `mcp/src/tools/registry.ts:54–66` (and
`notConnected` at :35); the `browser_download` lines match `registry.ts:251–258`; `(followed redirects
to <host>)` is printed whenever `res.redirected` is true (`extension/src/handlers/download.ts`), with
no host comparison, and `finalHost = new URL(res.url).host` includes the port — so
`127.0.0.1:8081 → localhost:8080` prints `(followed redirects to localhost:8080)`, and a
`localhost:8080 → 127.0.0.1:8081 → localhost:8080` chain would print the same line (the row does not
claim otherwise); the `exists — pass overwrite:true` text matches `sdk/src/download.ts`; the VERSION
text of MUX-10 matches `sdk/src/knock.ts`; `taskkill /T` output format (`SUCCESS: The process with PID
30020 (child process of PID 31620) has been terminated.`) was observed while cleaning up; the
nvm shim (`…\nvm\.nodejs\node.exe`, same arguments) does spawn the real node, as MUX-7 assumes;
`sdk/src/spawn.ts` passes `{...process.env, BRIDGE_TOKEN, BRIDGE_PORT}`, so `BRIDGE_DAEMON_IDLE_MS`
set in the recipe's PowerShell reaches the daemon; `sdk/src/token.ts` precedence (non-empty trimmed
env, else `bridge.token` at the first ancestor with `"workspaces"`) is described correctly in §1
item 8; the SW's `connection: down` is logged on every `onclose`, including each failed reconnect,
with backoff 500 ms doubling to 10 s (`extension/src/client.ts:13,53–54`) — as MUX-4 says.

## Findings

1. **MAJOR — DL-1 is run twice without a reset, so the second run's step (a) fails by construction.**
   Location: `docs/e2e-test-plan.md:307` (MUX-9 "then DL-1 (§4.13)") and `:373` (DL-1), Run 7
   skeleton `:1005` and the separate `DL-1 — (a)–(d)` evidence line. Evidence: DL-1 (a) expects
   "Exactly two lines: `Saved …\dl1\hello.txt` …", but MUX-9 runs DL-1 first and leaves
   `%TEMP%\bridge-e2e\dl1\hello.txt` behind; `sdk/src/download.ts` then throws
   `` `${target} exists — pass overwrite:true to replace it` `` on the standalone run. The Run 7
   skeleton records MUX-9's DL-1 and DL-1 (a)–(d) separately, so a user following the plan top to
   bottom measures a FAIL that is a plan defect — and the integrity floor forbids re-tuning it after
   the measurement. Fix: give DL-1 a precondition step `Remove-Item -Recurse -Force
   "$env:TEMP\bridge-e2e\dl1" -ErrorAction SilentlyContinue` (also for DL-2's `dl2`), or say in
   MUX-9 that its DL-1 *is* the DL-1 run (one evidence line, not two).

2. **MINOR — MUX-9 says "exactly as written there" for NET-1, but its expected text needs a step
   §4.8 NET-1 does not have.** Location: `:307` vs `:251`. §4.8 NET-1's steps are "Navigate to the
   fixture, then `browser_network_requests {}`"; MUX-9 expects `Cleared <n> requests.` and
   `showing 1 of 1`. The log is per tab and survives navigation (Run 6 cleared first, `:700`), so
   without the clear the listing shows every earlier request of the tab and `1 of 1` fails. Fix:
   write MUX-9's NET-1 steps out (`browser_network_clear {}`, navigate to the playground,
   `browser_network_requests {}`), as Run 6 did. Same row, NIT: say "reload the playground first" so
   ACT-2's `counter = 1` holds.

3. **MINOR — decisions #15, #21 and #27 are informed by rows but not cited; #15 has no row that
   exercises it.** Location: `:299–308`, Run 7 `:1010`. MUX-8 measures #27 (the session's
   `browser_status` shows `Daemon: connected …` + `Extension: not connected …` while Chrome is
   closed) and #21 (the `NOT_CONNECTED` code), and MUX-1's "again after ~15 s" is #27's shape; none
   cites them. #15 (on a non-4002 close the MCP stores the reason and reconnects on its 5 s retry)
   is assumed by §1 item 8 ("a live MCP starts a new daemon within ~5 s") but no row measures it.
   Fix: cite #21/#27 in MUX-8 and Run 7; add a short step (e.g. in MUX-7 (c)'s aftermath or a
   MUX-4 variant): with a session connected, `Stop-Process` the daemon → within ~5–6 s
   `Get-BridgeDaemon` shows a new pid whose parent is the MCP and `browser_status` is connected
   again without `/mcp` — *informs #15*.

4. **MINOR — MUX-5's log expectation reads as contiguous, but the real log interleaves.**
   Location: `:303`. Evidence (handover run, port 47811):
   ```
   22:42:58Z client + "B" (2 clients)
   22:42:58Z client - "B" (1 client)
   22:42:58Z client - "A" (0 clients)
   22:42:58Z exit 0 (shutdown 4002) clients=0 extensionEvents=0 ignoredClientFrames=0
   22:42:58Z start pid=29904
   22:42:58Z start pid=32996
   22:42:58Z config pid=29904 …
   22:42:58Z config pid=32996 …
   22:42:58Z listening on 127.0.0.1:47811
   22:42:58Z port 47811 in use — another daemon owns it
   22:42:58Z exit 0 (port in use) …
   ```
   The old daemon writes `client -` lines for every client between `client + "hello-recipe" (2
   clients)` and `exit 0 (shutdown 4002)` (always `clients=0`), and two racing starters' lines
   interleave, so "`start pid=<D2>`, `config pid=<D2>…`, `listening…`" is not a contiguous run and
   the loser's `start` can precede the winner's. A strict reader could fail a correct run. Fix: say
   "lines of two starters may interleave; `<D2>` is the pid whose `config` precedes `listening`
   and matches `Get-BridgeDaemon`; the old daemon logs `client -` for each client before
   `exit 0 (shutdown 4002) clients=0 …`".

5. **MINOR — MUX-4's `$t1 − $t0` lower bound depends on `npx` teardown latency.** Location:
   `:302`, `:313–321`. `$t0` is taken after `npx tsx` returns, which is after the daemon saw the
   close (T0) by however long npm/tsx take to exit; the window 19.5–22.0 s tolerates only 0.5 s of
   that. In the test the recipe printed `closed … — OK` at 22:42:17.410 and the idle line came at
   :37 (whole seconds), so the bound is plausible but not guaranteed. Fix: take `$t0` from the
   recipe's own `closed after … — OK` ISO timestamp (or capture `Get-Date` inside the recipe's
   output), or widen the lower bound to 19.0 s with the reason; T1 − T0 from the log stays the
   primary judgement. The `20 s ± 1 s` window on whole-second stamps is justified by
   `daemon/src/idle.ts` (armed at the 0-count update, fires after `ms`) and was observed as 20 s.

6. **MINOR — DL-2's page-side check does not isolate the redirect.** Location: `:374`. Page origin
   `http://localhost:8080` → `http://127.0.0.1:8081` is cross-origin (host differs), the GET is
   "simple" so it reaches the fixture (`"GET /dl2 HTTP/1.1" 302 -`), and the 302 carries no
   `Access-Control-Allow-Origin` (verified with curl), so `fetch` rejects with `TypeError: Failed to
   fetch` — the row's expectation is correct. But the page would fail the same way with no redirect
   at all: the blocker is origin B's missing CORS header on the first hop, not the cross-origin
   redirect that `browser_download` exists for (Blackboard → S3: a same-origin first hop that
   redirects cross-origin). Fix (optional but closer to the spec's "the page could not"): let
   `redirect_server.py` serve a tiny HTML page at e.g. `/page`, navigate the tab to
   `http://127.0.0.1:8081/page`, and `fetch('/dl2')` there — same-origin first hop, cross-origin 302
   to `localhost:8080` without CORS → `TypeError: Failed to fetch`; or keep the row and state
   plainly what it demonstrates.

7. **MINOR — §1 items 3, 4 and 6 still tell the user to use `<TOKEN>` via the MCP env; item 8
   overrides them.** Location: `:21–29` vs `:35–57`. Read top to bottom the set is consistent only
   because item 8 says to remove `BRIDGE_TOKEN` from the MCP env and re-paste a new token into
   Options, so a user does items 3–6 and then undoes two of them. Fix (inside D6's lane): add a
   dated note to items 3, 4 and 6 — "for the Step 6 wave, item 8 replaces this" — or reword item 8
   as "instead of items 3, 4's `BRIDGE_TOKEN` and 6". (docs/setup.md is D7's lane, not judged here.)

8. **MINOR — the phase doc's MUX-5 line still says "the script reports 'upgraded daemon'".**
   Location: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md:383–384`. The row correctly
   records that no such message exists (the handing-over recipe prints only the new build and
   `up 0s`; a *connected* recipe prints `daemon restarted (4002) — reconnected …`). Under the
   SPEC-DISCREPANCY protocol this is mechanical: the step agent amends the phase doc in place with a
   dated note. The other builder deviations (Get-CimInstance for MUX-1, MUX-3 hold arg, MUX-4
   "reconnect attempts" = repeated `connection: down`, MUX-7 (d)) are faithful to the code and
   need at most the same one-line note.

9. **NIT — EVAL-1's "banner appeared and cleared" is attributed to Run 6 / NET-15, which records
   only the title.** Location: `:307`; Run 6 `:907–909` says `EVAL-1 (document.title → Agent Bridge
   E2E Playground)`; the banner evidence is Run 5 `:571`. The expectation is still right (§4.7
   row); fix the citation to "Run 6 NET-15 (text), Run 5 (banner)".

10. **NIT — MUX-7 (d) should wait for S4's spawn before starting S5.** Location: `:305`. If S5's
    MCP knocks first, `<D4>`'s parent is `<M5>` and the tree kill takes it, which looks like a
    failure of (d). Fix: "start S5 only after `Get-BridgeDaemon` shows `<D4>` with
    `ParentProcessId` = `<M4>`". Also, MUX-1 identifies `<M>` as "the node whose command line
    contains `mcp\dist\index.js`" — the nvm shim matches too; `<M>` is the pid in
    `claude-code #<M>` (as MUX-7 says).

11. **NIT — small hygiene points.** (a) Item 8 puts the token on the clipboard; `Set-Clipboard
    'cleared'` does not purge Windows clipboard history (Win+V) if enabled — say so, or have the
    user type it from `notepad bridge.token`. (b) MUX-10 creates a git worktree and never removes
    it — add `git worktree remove ..\bridge-v1`. (c) `recipes/hello.ts` prints `— OK` even if the
    connection dropped during the hold (it does not observe client failure); MUX-3's
    `browser_status` during the hold covers it. (d) The builder's files outside the written lane
    (`recipes/tsconfig.json`, `test-fixtures/dl/hello.txt`, `test-fixtures/redirect_server.py`) are
    needed by the rows; record them in the step report.

## How each row can fail

| Row | An observable that contradicts the expected text (FAIL) | Can fail? |
|---|---|---|
| MUX-1 | `Get-BridgeDaemon` lists 0 or 2 processes, or its `ParentProcessId` ≠ the pid in `claude-code #<M>`; `build <sha>` ≠ `Get-DaemonBuild`; `Clients (n)` ≠ 1; log lacks `start`/`config … idleMs=600000`/`listening`/`client +` in order | yes |
| MUX-2 | `Clients (1)` or differing order/build between sessions; a snapshot without the playground refs in one session; a second daemon pid or a new `start` line | yes |
| MUX-3 | recipe exit ≠ 0 or a `FAILED` line; `clients (…)` without `hello-recipe`; `listTabs` active id ≠ `browser_status`'s; `browser_status` during the hold not ending with `, hello-recipe`, or listing it afterwards; a new `start` line | yes |
| MUX-4 | `config … idleMs` ≠ 20000 (env did not reach the daemon); T1 − T0 outside 19–21 s; no `idle for 20000 ms …` / `exit 0 (shutdown 1001)`; `$t1 − $t0` outside 19.5–22.0 s (see finding 5); a daemon reappears | yes |
| MUX-5 | recipe's build = `<old>` or `up` > 1 s; no `exit 0 (shutdown 4002)`; session's `browser_status` still `<old>`, or not connected without `/mcp`; `browser_snapshot` errors; two daemons or `<D2>` = `<D1>` | yes (ordering wording, finding 4) |
| MUX-6 | `Get-BridgeDaemon` lists ≠ 1 process; an exit code ≠ 0; non-empty `.err`; two `listening` lines; a `start` without a matching `listening`/`port in use` line (#25's lost-line trigger) | yes |
| MUX-7 | (b) `<D>` gone after `/exit` (→ #14's fallback); (c) `<M2>` alive after ~4 s, or `<D>` gone, or `/mcp` spawns a new daemon; (a) `<D3>` alive or no `child process of PID <M3>` line; (d) `<D4>` gone | yes |
| MUX-8 | exit 0 with Chrome closed; text ≠ the quoted `NOT_CONNECTED` message; `<ms>` outside 15000–16500; session shows `Daemon: not connected`; second run not OK | yes |
| MUX-9 | any status/title/listing text differs from the quoted last-run text; banner on NET-1; DL-1 lines differ | yes (NET-1 steps and DL-1 reuse, findings 1–2) |
| MUX-10 (opt.) | no `VERSION` line, `<ms>` outside 2000–3000, a daemon spawned, or rerun after Ctrl-C not OK | yes |
| DL-1 | lines ≠ the two quoted; size/hash/type differ; a `(followed redirects …)` or `Warning:` line; a `.part` left; (c) succeeds instead of the `exists` error; banner or tab change | yes (spurious on 2nd run, finding 1) |
| DL-2 | (a) the page fetch resolves (returns a status) instead of `TypeError: Failed to fetch`; (b) no `(followed redirects to localhost:8080)` line, a name other than `hello.txt`, or a different hash | yes |
| D6.3 | any of the three counts ≠ 0 | yes |

Exit criteria: D6.1 (rows MUX-1…9, DL-1…2 exist, expected texts written, none filled in) — met.
Every row names its commands — met. MUX-6 judged by a process listing, MUX-4 by two timestamps —
met. MUX-7 covers (a), (b), (c) and the spawning-session normal end, with kill methods and expected
results, linked to #14 — met. MUX-9 quotes match the last recorded runs — met for ACT-1/ACT-2/
TRUST-2/NET-1 text, EVAL-1 attribution off (finding 9). DL-1/DL-2 — written; DL-1 has the
run-twice defect (finding 1). D6.3 written as commands that never print the token — met. Recipe
typechecks, reads the token only through the SDK, never prints it or a URL — met. Typecheck/test
(542/42)/build green, extension diff empty, plan diff additions only — met.

## Verdict

**FAIL** — one MAJOR finding (1: DL-1 is executed twice with no reset, so its own step (a) fails by
construction on the second run). Everything else is MINOR/NIT; with finding 1 fixed (one precondition
line, or one sentence in MUX-9) and ideally findings 2–5 addressed, the row set would be
PASS-with-notes.

---

# Round 2 — re-verification after fixer round 1 (2026-10-22)

Verifier: Claude Opus 5.5 (`claude-opus-5-5`). Scope: round-1 findings 1–11 and the fixer's new
material (A)–(H). Read/run only. Port 9234 never touched, Chrome never touched. Scratch daemons ran
on 47812 with a dummy token and a temp HOME/USERPROFILE.

## Checks re-run

| Check | Result |
|---|---|
| `npm run typecheck` / `npx tsc --noEmit -p recipes` / `npm run build` | exit 0 / 0 / 0 |
| `npm test` | `42 passed (42)`, `542 passed (542)` |
| `git diff -- extension/ \| wc -l` | `0` |
| removed lines in the `docs/e2e-test-plan.md` diff | `0` (+348 lines, additions only) |
| `sha256sum test-fixtures/dl/hello.txt` | unchanged, `0a6b99ca…2956ce` |
| PowerShell 5.1 parser on all 6 `powershell` blocks (scratch copies, placeholders replaced by numbers) | `0 errors` in each |
| Helpers, run without killing: `Get-DriverChain`, `Test-SafeToKill` | chain `27508 powershell <- 30680 bash <- … <- 20208 claude.exe <- … <- Code.exe`. `Test-SafeToKill $PID` → `UNSAFE: … contains driver PID(s) 27508`; on the top ancestor → `UNSAFE`, listing the whole chain; on 2928 (codex) → `safe: …`. `Get-ProcTree` returns the descendants by `ParentProcessId`, as `taskkill /T` walks them |
| (E) recipe paths | no token: `FAILED after 2 ms — NOT_CONNECTED: No bridge token: …`, exit 1. Missing daemon: `FAILED after 2 ms — NOT_CONNECTED: daemon not built — …`, exit 1. Hold 2000 with a fake extension: `… still connected after the hold — clients (1)`, then `closed after 2631 ms — OK`, exit 0. Daemon killed (`taskkill /F`) during an 8000 ms hold: `FAILED after 8299 ms — NOT_CONNECTED: The connection to the bridge daemon closed (code 1006); this client does not reconnect — call connect() for a new client to continue`, so the post-hold check turns a drop into FAILED, never OK |
| (D) MUX-4 `$t0` parse | in PS 5.1, a node line `<ISO> hello-recipe: closed after 2631 ms — OK` is captured with `$o = node …`, matched by `'closed after \d+ ms'` (the new `still connected after the hold` line does not match), and parsed by `[DateTimeOffset]::Parse(…, InvariantCulture)`. The `—` survives with `[Console]::OutputEncoding = UTF8`. `npx` here is `npx.exe` (nvm shim), so the execution policy does not apply |
| MUX-3 file wait | a `Start-Process … -RedirectStandardOutput` file is readable by `Select-String -Quiet` while the process runs (found after 1 loop) |
| (F) redirect fixture | `python -I test-fixtures/redirect_server.py 48182 …`: `GET /page` (and `/page?x=1`) → `200`, `text/html; charset=utf-8`, 163 bytes, no CORS header; `GET /dl2` → `302`. Bound 127.0.0.1 only; stopped afterwards |

## Round-1 findings — status

1. **Fixed.** DL-1 is run once, as MUX-9's last step ("this **is** the DL-1 run"; §4.13: "DL-1 runs
   once, as the last step of MUX-9"). DL-1 and DL-2 each gained step (0): `Remove-Item … dl1` /
   `dl2`, then `Test-Path` → `False`. The Run 7 skeleton records DL-1 once.
2. **Fixed.** MUX-9 writes out NET-1 as Run 6 ran it (`browser_network_clear {}`, navigate,
   `browser_network_requests {}`). The playground is freshly loaded first ("so the counter starts at
   0").
3. **Fixed.** MUX-8 cites #21 and #27; MUX-7 (e) informs #15; Run 7 lists #15, #21 and #27.
4. **Fixed.** MUX-5's log expectation is now constraints (1)–(5). They match the interleaved log I
   recorded in round 1 (old-daemon `client -` lines before `exit 0 (shutdown 4002) clients=0`; one
   or two starters; one `listening`; the loser's `port … in use`).
5. **Fixed.** `$t0` is the recipe's own `closed after … — OK` timestamp (tested above). The window
   19.5–22.0 s is now conservative. "T1 − T0 = 19, 20 or 21 s": only 20 and 21 can occur, since the
   true gap is ≥ 20.0 s; harmless.
6. **Fixed.** DL-2 (a) now runs from `http://127.0.0.1:8081/page`. `fetch('/page')` gives 200 (same
   origin). `fetch('/dl2')` is a same-origin first hop whose `302` goes cross-origin to
   `localhost:8080`. That response carries no `Access-Control-Allow-Origin`, and the
   cross-origin-redirected request goes out with `Origin: null`, so the CORS check fails and the
   promise rejects with `TypeError: Failed to fetch`. That isolates the redirect, the
   Blackboard → S3 shape. Loopback → loopback, so Local Network Access does not intervene. The
   item-7 server may log the redirected GET; recording it as "not judged" is correct.
7. **Fixed.** Items 3, 4 and 6 carry dated notes that item 8 replaces them for the wave.
8. **Fixed.** The phase doc (lines 386–390) has a dated "*Amended 2026-10-22 (D6, mechanical)*" note
   under MUX-5. It matches the code: `welcome` carries only build/proto/clientId/extensionConnected,
   and `on("reconnected")` fires only on a 4002 reconnect.
9. **Fixed.** EVAL-1 is attributed as text: Run 6, NET-15; banner: Run 5.
10. **Fixed.** MUX-7 (d) waits for `<D4>` with `ParentProcessId` = `<M4>` before starting S5. MUX-1
    and MUX-7 identify `<M>` by the pid in `claude-code #<M>` and note that the shim has the same
    command line.
11. **Fixed**, apart from the lane note (d), which belongs in the step report, not here. The other
    items: the clipboard-history warning with a Notepad alternative, `git worktree remove` for
    MUX-10, and the recipe's post-hold `daemon.status` check (verified FAILED on a drop).

## New material (A)–(H)

- **(A) Tags.** Every step of MUX-1…10, DL-1/2 and D6.3, and every bullet of §1 item 8, carries
  [UI], [SH] or [USER]. Almost every expected item is literal text, a count, or a comparison of
  printed values. Three are not backed by a printed value (R2-1, R2-2 below).
- **(B) Cautions A1–A10 and the helpers.** They parse, and the helpers behave as documented.
  `Test-SafeToKill` does exclude the driver's own tree: it refuses any target whose `taskkill /T`
  tree contains a PID of the driver's ancestor chain, which covers the shell, `claude.exe` and the
  hosting terminal. Limitation (R2-4): it does not flag the driver's non-ancestor processes, such
  as its own MCP servers; A1 already requires the driver to have none. The Driver check (a
  `(mcp|server)[\\/]dist[\\/]index\.js` process whose parent is in the chain) catches the driver's
  MCP with the shim (shim parent = `claude.exe`) and without it.
- **(C) MUX-7 (e) ≤ 12.0 s is sound.** `mcp/src/link.ts` ticks every `RETRY_MS = 5000`. On a tick,
  `probe` → `client.connect()` rejects at once on a failed client (closed 1006 by the kill), and
  `attempt()` runs in the same tick. The knock is ECONNREFUSED → one spawn → knock every 250 ms; the
  daemon listens within about 0.3–0.6 s (round 1: `connected in 419–620 ms` including the spawn), and
  `requireExtension: false` resolves at the welcome. Typical time is ≤ 5 + ~1 s. The worst case is a
  tick that lands in the few ms between the kill and the client seeing the close: then the next tick
  comes 5 s later, ≈ 11.5 s total, still under 12.0. The poll runs to 15 s, so a slow case is
  observed, not cut off. Parent = `<M4>` holds because the spawn uses the MCP's `process.execPath`.
  `Clients (1)` holds because S5's MCP died in (d).
- **(D) `$t0`.** Correct, see above.
- **(E) Recipe.** Correct, see above.
- **(F) `/page` contrast.** Correct, see finding 6.
- **(G) `--bind 127.0.0.1` with `http://localhost:8080`.** Chrome never sends `localhost` to DNS;
  it resolves it to the loopback addresses (`::1` and `127.0.0.1`). On `::1` it gets an immediate
  connection refusal and falls back to the next address, so the IPv4-only server is reached; curl
  showed the same fallback in round 1. The SW fetch in DL-1/2 follows the same path. The note "if
  the playground does not load, drop `--bind`, as item 7 does" is an adequate fallback.
- **(H) MUX-3 counts.** Correct. S1 and S2 are both connected from MUX-1/2, and the registry lists
  in insertion order. During the hold: `Clients (3): claude-code #<M1>, claude-code #<M2>,
  hello-recipe`; the recipe's own `clients (3)` and `still connected … clients (3)` match. After:
  `Clients (2)`. The log shows `(3 clients)` then `(2 clients)`. All of this holds only with no
  driver MCP, as A1 says.

## Round-2 findings

- **R2-1 — MINOR. DL-1 (a) judges "`browser_status`'s `Active tab` is the same before and after",
  but the DL-1 steps never call `browser_status`.** Location: §4.13 DL-1 row. As written, the judge
  has no printed value to compare. Fix: add "**[UI]** `browser_status` before (a) and after (a)".
- **R2-2 — NIT. Two expectations have no command behind them.** MUX-7 (b) "`<P1>` gone too": the
  (b) poll checks only `<M1>`; add `Get-Process -Id <P1> -ErrorAction SilentlyContinue` (prints
  nothing). MUX-4 "`Get-BridgeDaemon` prints nothing when checked ≥ 30 s after `$t1`": add
  `Start-Sleep 30; Get-BridgeDaemon` to the MUX-4 block.
- **R2-3 — NIT. Item 7 and item 8 both start the item-7 server.** Item 8 says "instead of two
  visible windows", but item 7's window without `--bind` still exists, and a user doing both gets
  two listeners on 8080 (Python sets `SO_REUSEADDR`, which on Windows lets the second bind succeed).
  Fix: one sentence in item 8, "do not also start item 7's server".
- **R2-4 — NIT.** `Test-SafeToKill` guards the driver's ancestor chain only; see (B). Say so in A2.
- **R2-5 — ESCALATE (not a row defect): an orphan `node.exe` I did not start.** PID 11092, command
  line `…\nvm\installs\v25.2.1\node.exe …\scratchpad\fakeext.mjs` (the scratchpad root, not my
  `bin\fakeext.mjs`). Created 2026-10-22 02:59:22 local; its parent 17920 no longer exists. It is
  presumably another D6 agent's fake extension. It binds nothing (it is a WS client), and nothing
  listens on 9234. I did not kill it. My own processes (two fake extensions, scratch daemons on
  47811/47812, python fixtures on 48080/48181/48182) are all gone. I removed the scratch
  `node_modules` junction with `rmdir`; the repo's `node_modules` is intact.

## Round-2 verdict

**PASS-with-notes.** Round-1 findings 1–10 are fixed, and 11 is fixed apart from its lane note,
which goes in the step report. The new material is sound: the tags, the cautions, the helpers that
parse and behave, the MUX-7 (e) bound, the recipe's post-hold check, the `/page` contrast, the
`--bind` fallback note and the MUX-3 counts. Remaining: one MINOR (R2-1) and three NITs (R2-2 to
R2-4). One process for the step agent to resolve: PID 11092 (R2-5).
