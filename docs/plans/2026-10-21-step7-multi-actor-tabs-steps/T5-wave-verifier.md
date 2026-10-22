# T5 wave (Run 8): independent verifier report

Verifier: a fresh Opus 5.5 agent, 2026-10-23. It started no daemon, ran no connecting `t5*.ts` command, did not touch Chrome, did not build and did not commit.
Inputs:
- The pre-written expected text, `git show e7e56ff:docs/e2e-test-plan.md` §4.14, the MUX-9/MUX-1/MUX-3/STAT-1/TAB/NET/DL rows, and `git show e7e56ff:…/T5-wave-sheet.md`.
- `stage0-audit.md` § "Lens (d)", and decisions.md #36, #45, #48, #56, #60 and #61.
- The record under test, `T5-run-record.md`, and §5 Run 8 in the working tree.
- The raw evidence in `%TEMP%\bridge-e2e\`: the actor streams, the script outputs, the frame CSVs, `http8080.log` and the PNGs.
- The S1 session's tool-results images, and the driver's transcript (`…/c98ff063…/subagents/agent-a88d5a4847b80aa9d.jsonl`).

## Verdict: PASS-with-notes

Every row verdict follows from the pre-written text, applied literally to the raw output, with one exception: RESOLVER-1's stricter sub-check (finding 1) is not met as written but is recorded as PASS*. The record discloses this openly. Every quote I spot-checked matches the raw file byte for byte. No verdict turns a FAIL into a PASS. The four SCREEN instrument FAILs stay FAIL. Nothing leaks: there is no token, no real site, no user window title and no non-localhost URL. The set-up re-runs are proper. The notes below are consistency and wording issues, not misstated evidence.

## Checks, with evidence

### C1. Row verdicts against the pre-written text (spot-checked against the raw files)

How I read the outputs: actor outputs were dumped from `actors/<n>/out.jsonl` by a stream parser (tool_use and tool_result, verbatim). Script outputs come from `*.out`.

| Row | Raw evidence (verbatim) | Verdict holds? |
|---|---|---|
| RELOAD-1 | transcript 19:37:35: `t5-check: CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab`; build `ee86adea…c5c5` | yes |
| MUX-1 / STAT-1 | S1 19:38:09.606 `Clients (1): claude-code #5620` … `Active tab: [T2] …?t5=check`; procs `23664 parent 5620`, `5620 parent 26300`; log lines 7–10 start/config/listening/`client + "claude-code #5620" (1 client)` | yes (note 5) |
| TAB-1…5 | S1 19:39:16 `Selected tab T3 (now this session's tab; not brought on screen — browser_focus_tab shows it)`; 19:39:54 `Focused tab T3`; 19:40:04 `Opened tab T4`; 19:40:22 `Closed tab T4` / (isError) `browser_close_tab needs tab: a handle from browser_list_tabs` | yes |
| NET-12 | S1 19:40:59 `[2974]  tab:T5    1.9s ago   GET     200  xhr …ok.json`; after the close `showing 2 of 2` (T2, T3) | yes |
| MUX-3 | `mux3.out` identical to the record; `mux3.err` 0 bytes; S1 19:42:15 `Clients (3): claude-code #5620, claude-code #2564, hello-recipe`; `[1108126308]` = `tab2: T3 (chrome id 1108126308 …)` (transcript) | yes |
| PERC-1/2 | S1 19:44:15 snapshot: `textbox "Email address" [ref=e1]` … `link "Jump to bottom" [ref=e9]` | yes |
| ACT-1/2/3, TRUST-2 | viewed the S1 tool-results PNGs: `status: email = a@b.com`, `status: counter = 1`, `status: TRUSTED click received`, `status: form submitted (email = x@y.com)` | yes |
| PERC-3/4 | PNG sizes 1920x959; full page 1905x2776 with `BOTTOM MARKER — visible only after scrolling…` at its foot (viewed) | yes |
| TRUST-2/EVAL-1/PERC-4 banner | `frames-reg/frames.csv` band changes: 106→90 at 19:45:02.354, →106 at 19:45:07.457; 90 at 19:45:17.944, →106 at 19:45:22.993; 90 at 19:45:31.524, →106 at 19:45:38.150 | yes |
| EVAL-1 | S1 19:45:17.836 `Agent Bridge E2E Playground` | yes |
| NET-1 | S1 19:46:27.503 `[2985]  1.6s ago   GET     200  document    3ms  12.6 KB  http://localhost:8080/e2e-playground.html` vs expected `12.8 KB` (#56) → FAIL | yes, correctly FAIL (C3) |
| ACT-8 | S1 19:46:43.103 (isError) `ref e6 not found — call browser_snapshot to re-snapshot` | yes |
| DL-1 | S1 19:47:54.152 `Saved …\dl1\hello.txt` / `69 bytes · text/plain · sha256 0a6b99ca…2956ce`; statuses before and after `Active tab: [T6] …`; (c) the `exists — pass overwrite:true` text; hash `0A6B99CA…` and `hello.txt` in the transcript | yes, but the SW-console clause was not observed (note 2) |
| LEASE-1 | B 19:50:58.328 (isError) `tab T7 is held by "claude-code #15352" since 19:50:38 — use browser_new_tab, or browser_list_tabs to pick a free tab`; A and B `Click counter: 1` on their own URLs; A list `T7  [claude-code #15352] …`, `T8* [claude-code #25152] …`; trees: `claude 17956 tree: 17956,13140,15352,29896`, MCP `25152` parent `13496` | yes |
| LEASE-4 | B 19:52:33 refusal; log `client - "claude-code #15352" (1 client)`; B 19:52:44 `Selected tab T7 …`; list `T7  [claude-code #25152]`; snapshot `url: …?t5=lease1` | yes |
| LEASE-7 | B 19:53:11 `T10* Agent Bridge E2E Playground — …?t5=lease7-human` (no holder) → `Selected tab T10 …` → `T10* [claude-code #25152] …` | yes |
| LEASE-2 | `lease2.out` identical to the record; C's snapshots at 19:54:29.095, 35.336 and 43.449 lie inside 19:54:24.556–19:55:08.306, each `url: …?t5=lease2-claude` | yes |
| LEASE-3 | `lease3.out`: `LEASE-3 FAIL (synthetic click) — …`; the url is empty per the F33 note line, which `t5.ts:386` prints only when `granted.url === ""` (t5.ts is unchanged since e7e56ff); C's list `T15* [t5-lease3] … ?popup=1` | yes, FAIL |
| LEASE-5 | `lease5.out` identical; `event tabGone {"tab":"T17","lastUrl":"…?t5=lease5","lastTitle":"T5 LEASE5 target"}`; `LEASE-5 PASS` | yes |
| LEASE-6 | `lease6.out` identical; `LEASE-6 PASS (b) — new chrome id 1108126396 (was 1108126391)…`; owner `t5-lease6` after the reload | yes |
| SCREEN-1 | `screen1.out` identical; FAIL comes only from the pixel (`t5.ts:577-583`: the visible-again time of 1514 ms is ≤ 2000, the human tab is active and current, the target is background) | yes, FAIL |
| SCREEN-2 | `screen2.out`: `TIMEOUT: Timed out after 35000ms calling screenshot`, then `FAILED — DEBUGGER_DEVTOOLS …`; the transcript shows the `t5-mark` lines at 20:01:18 (T21 visible) and 20:01:26 (T23 hidden) | yes, FAIL (note 3) |
| SCREEN-3 | `screen3.out` identical: `SCREEN-3 (a) FAIL — … each its own tab: no, serialised: yes`; (b) `t5-png.ts --transcript` D `#690800`, E `#453900` (other); (1900,20) D `#d92424`, E `#8fff3d` | yes, FAIL |
| SCREEN-4 | `screen4.out` identical; transcript `after: Test-T5Minimized True` | yes |
| SCREEN-5 | `screen5.out` identical; the transcript has `fg before/after: {"Hwnd":2362304…}`, `w5t=2493374`; rects at 1920,0 and 2880,0 960x1040 | yes, FAIL |
| BG-1/BG-2 | `bg1.out`/`bg2.out` identical: `click e7 trusted → ok (5 ms)` / `status: idle`; the retry-not-run lines are present | yes, FAIL |
| BG-3 | F 20:08:19.496 (isError) `[chrome.debugger] NotAllowedError: … Document is not focused.`; `Focused tab T40`; `ok` | yes |
| BG-4 | `bg4.out`: 3746 ms (inside [1900, 10000]), 552 ms (≤ 10000), `target still background: yes` | yes |
| RESOLVER-1 | R 20:10:07.392 `Active tab: [T41] … ?t5=resolver`; 20:10:07.409 `url: …?t5=resolver   title: "Agent Bridge E2E Playground"`; transcript `foreground: 9505982 is DevTools window: True` before and after | Stage 0 rule met; the stricter §4.14 sub-check is not met as written (finding 1) |

Run 8's diff only adds lines: `git diff docs/e2e-test-plan.md` has 0 removed lines, and `git diff e7e56ff HEAD` does not touch the plan or the recipes. So no expected text was edited after the run.

### C2. SCREEN instrument faults

`npx tsx recipes/t5-png.ts <png> x y` (offline) gave these readings:
- At (20,20): screen1-run1/2/3 and screen5 read `#6b0000`, screen3-a `#690800`, screen3-b `#453900`, screen3-c `#190000`. These match the record.
- At (1900,20) or (900,20): `#dd00fa` (screen1 ×3, screen5), `#d92424`, `#8fff3d` and `#3300f8`. These match the informational readings in the record.

A pixel row at y=20 (screen1-run1, using `decodePng`/`pixelHex` from t5-png.ts) reads:
`14:dd00fa … 19:dd00c1 20:6b0000 21:000000 … 28:000000 29:000028 30:6400ea`
So (20,20) is the anti-aliased left edge of a black glyph stroke. The bar uses `color:#000` and `font:bold 24px`, and its label starts at x=0 (`t5-lib.ts:130`). Away from the label, the bar reads `#dd00fa` at every probe (x=230…260, (20,5)). That is 34 off `#ff00ff` on red, which is outside the ±24 tolerance (`colourName`). The viewed `screen1-run1.png` and `screen5.png` show the magenta `SCREEN-1 TARGET` / `SCREEN-5 TARGET` bars.

Calling this an instrument fault is supported on both counts: the probe point and the colour management. No verdict was changed to PASS. Note that a probe off the label would still have failed the ±24 test, so the proposed corrected check is a new rule. It must be pre-registered and ruled on before any re-run, as the record proposes.

### C3. NET-1's cause

- `http8080.log` has plain-URL GETs only at `23:37:22` and `23:43:44` local, which is 19:37:22Z (pre-flight `Invoke-WebRequest`) and 19:43:44Z (W_r opened). There is none at the navigates of 19:44:12, 19:46:25 or 19:46:42, while `?t5=act8` was served at `23:46:42`.
- `reg-net1-id.txt` shows `status: 200 OK   from cache: yes`, `date: Thu, 22 Oct 2026 09:04:00 GMT`, `content-length: 12914` and `last-modified: Mon, 07 Sep 2026 15:43:58 GMT`. The 19:44:15 snapshot has no `link "Open popup"`.

So the diagnosis is measured, and the FAIL is the conservative reading. Literally, T5.3's "same text as the last recorded run" is Run 7's `12.6 KB`, which the run did print. Judging against #56's `12.8 KB` (the row's dated text, written before the run) is correct and does not flatter the result.

### C4. Set-up re-runs (all proper)

- **LEASE-1.** First attempt at 19:49:30: the transcript shows `tools mcp__chrome-agent-bridge__browser_snapshot` only, for both A and B. The refusal naming `#17612` was seen, and A's tree is `11012,22992,17612,27264`. The re-run used quoted lists. The first attempt is recorded.
- **LEASE-5.** First attempt: transcript `2026-10-22T19:57:14.401Z t5-lease5: FAILED — Error: evaluate returned kind undefined: undefined`, and the log shows `t5-lease5` connected for under a second. The fix touches only `evalJson`'s transport (`git diff recipes/t5-lib.ts`: `return (${expression});`). No PASS condition or verdict string changed, and `t5.ts` is unchanged. The fix ran `tsc` first. Every later `evalJson` read was consistent with what the row showed, for example BG-1's informational `TRUSTED click received` after `focusTab`.
- **SCREEN-5.** First attempt: transcript rects `1912,-8 1936x1096` for all three windows (maximized, so W5 was covered and B4 was broken). The script printed `TIMEOUT … 35000ms`, `front restored: no`, and at 20:05:44 `screen5-target: T30 (…, active in its window)`. The `Move-T5Window` fix is un-maximize only. The first attempt is recorded and kept as a finding. The re-run also marked the front and human tabs yellow and cyan; that is set-up only, not judged.
- **DL-1's banner check.** `frames-reg` ended at 19:47:23.388, before (a) at 19:47:54. The repeat of (a) at 19:48:29 ran under `frames-dl1`: 127 frames, 19:48:22.089–19:49:01.984, every band 106. It printed the same two lines. Disclosed in the record.

### C5. T5.4 / B2 and log hygiene

- The record contains only these URLs: `http://localhost:8080/…` (fixture), `chrome://discards`, `chrome://extensions`, `chrome://…`, `chrome-extension://…`, and one `http://127.0.0.1:8090/crlf.html`. That last one is W1's localhost copy of the fixture, named in the B2 note.
- Run 8 contains only `localhost:8080` and `chrome-extension://…`.
- `grep aliev` finds nothing in the record, Run 8 or the log, and no PNG is committed or untracked.
- `T5-daemon-log.txt`: 200 lines, `://` 0, `[line withheld:` 0. Token count 0: the token was read into a variable (length 32), never printed, and the count is also 0 in the record, the plan and `recipes/`. No `legacy` line.
- The attached log is identical to `~/.chrome-agent-bridge/daemon.log` from line 156 (`19:37:35Z start pid=26432`) to its end, apart from CRLF line endings.

### C6. Exit checks

- **T5.1:** stated as met. The rows were committed at e7e56ff before the run, and the reload is the first line. The `/mcp` clause is met by substitution (fresh headless sessions), and Run 8 says so.
- **T5.2:** the BG retry is stated as **not met** (#61). The flash is given with its method.
- **T5.3:** stated as **not met** (NET-1).
- **T5.4:** stated as met, and true.

All four are stated truthfully.

## Findings

1. **Medium (consistency): RESOLVER-1 is marked `PASS*`, but its stricter §4.14 sub-check is not met as written.**
   - The row requires `Get-T5Foreground` before R's calls to print `DevTools - chrome-extension://…`. It printed `<DevTools window>`; Chrome's title is just `DevTools` (`len 8; our id: False`).
   - The foreground was confirmed by handle: `9505982 is DevTools window: True`. The window showed `JavaScript context: ⚙ sw.js` and `[bridge]` lines, and the Stage 0 rule is met.
   - This is the same kind of fault as the SCREEN probe, but there it is judged "FAIL as written (instrument)" and here it is resolved toward PASS.
   - Recommendation: label it "P on the Stage 0 rule; stricter sub-check not met as written (instrument: window title)" and list it with the SCREEN rows for the user's ruling.
   - Also, R issued `browser_status` and `browser_snapshot` in parallel (20:10:07.374 and .379), not "then". The outcome is unaffected.
2. **Low: Run 8's template line says `DL-1 [P]` with no qualifier.** The expected text includes the service-worker console line `[bridge] download held 69 bytes`, which was not observed. #36 accepted that only for Run 7, which was marked `[P; SW-console line not observed]`. The record body discloses it, so the Run 8 line should carry the same qualifier.
3. **Low (wording), SCREEN-2: "the banner (band 90) stayed up for the whole call" overstates the evidence.**
   - The capture loop ended at 20:00:48.836, but the call ran until 20:01:00.687.
   - Band 90 began at 20:00:20.868, about 5 s before t0. It was raised by the script's own set-up evaluates, so the banner criterion ("differs from the frames before t0") cannot be cleanly measured.
   - The row is FAIL in any case.
4. **Low: the first SCREEN-5 attempt is not stated as its own finding.** It shows that a default-mode capture of a tab in a fully covered window hangs to `TIMEOUT` at 35 s. Findings 4 and 5 mention only the cdp hang and the missing restore.
5. **Low: MUX-1's expected "newest lines, in order" are present in order, but more lines follow them.** The extra lines are `extension resync: 2 tabs, 0 gone` (19:37:56) and the driver's B1 `t5-find` (19:38:01). The record does not mention them. Also, TAB-4's three calls were issued in parallel (19:40:22.749/.753/.754); the outputs are consistent.
6. **Info: actor S1's allowed tools included `browser_press_key`, which is not in the wave sheet's S1 list.** It was never called, so no row is affected.
7. **Info: the record names the pre-existing tab's URL (`http://127.0.0.1:8090/crlf.html`).** It is a localhost copy of the fixture left over from W1, not a real site, so it complies with T5.4.

None of these findings misstates evidence, flatters a FAIL or leaks. Hence PASS-with-notes. Findings 1 and 2 should be fixed in Run 8's template lines before the commit.
