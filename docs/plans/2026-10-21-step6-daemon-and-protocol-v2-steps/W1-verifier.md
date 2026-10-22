# Wave W1 — independent verifier report (D6 E2E), 2026-10-22

Verifier: a fresh agent that did not run the wave. It judged the record against the expectations
committed at `HEAD` (`fef70ff`, `git show HEAD:docs/e2e-test-plan.md` §4.12, §4.13, §5 Run 7
skeleton), the filled Run 7 (working copy), `W1-run-record.md`, and `W1-daemon-log.txt` (the
primary source for daemon lines). It changed no file except this one, ran no row, started or
killed no process, and did not touch Chrome.

## Overall verdict: PASS-with-notes

Every Step 6 behaviour the rows measure is evidenced and agrees with the daemon log line by line
(timestamps, pids, client counts, and every `up <n>s` value I recomputed from the log's `start`
stamps). Decision #14 stands: MUX-7 (b), (c) and (d) are as expected, so #31's launcher fallback
is **not** triggered. Exit checks: D6.2 PASS-with-notes, D6.3 PASS (0 / 0 / 0), D6.4
PASS-with-deviation (NET-1's `12.6 KB`: the record's claim holds), (d) PASS (no `extension/` diff;
542 passed, 42 files).

Two items need the user's ruling, because no single run met their pre-written text as written:
**MUX-5** (the snapshot sub-check failed in the only run done as the row specifies; the
re-measurement that passed was outside the 15 s bound and in a headless session) and **NET-1's
literal `12.9 KB`** (the expectation is wrong, see D6.4). Neither shows a Step 6 defect.

## Per-row verdicts

| Row | Verdict | Deviations / items not evidenced |
|---|---|---|
| MUX-1 | PASS | All four `browser_status` lines; one daemon 21144, parent 14996 = `<M>`; log lines 6–9 in the expected order. `up 15s` at 09:01:09 matches `start` 09:00:54. |
| MUX-2 | PASS | Same build, `Clients (2): claude-code #14996, claude-code #17384` in both; both snapshots have `textbox "Email address" [ref=e1]` and `button "Sign in" [ref=e5]`; log line 10; no new `start`. |
| MUX-3 | PASS | All seven `mux3.out` lines in order; `mux3.err` empty; exit 0; `Clients (3)` during the hold, `Clients (2)` after; `listTabs` active id 1108125907 = `browser_status`'s; log lines 11–12. |
| MUX-4 | PASS | T0 09:10:57, T1 09:11:17 → 20 s (allowed 19–21); `$t1 − $t0` 20.2 s (allowed 19.5–22.0); `exit 0 (shutdown 1001) … extensionEvents=0 ignoredClientFrames=0`; `30.1 s after $t1: … 0 process(es)` (≥ 30.0). NIT: the service-worker console is given as counts (`7× connection: down`, …), not the literal `[bridge] connection: down` text. |
| MUX-5 | PASS-with-deviation (Run 1: FAIL on one sub-check) | Run 1 (as the row specifies): recipe, log constraints (1)–(5), `build <new>`, the same `claude-code #21044` without `/mcp`, `<D2>` 31944 ≠ `<D1>` 10964, SW console down/up — all met. **`browser_snapshot` → `No active tab in the last-focused window`** — expected a snapshot. R3: every text item met (new build, `up 0s`, same `claude-code #11268`, snapshot returned, `<D2>` 8528 ≠ `<D1>` 15664), but the calls came 15.4 s / 16.9 s after the recipe (row: "within 15 s"), the session was headless (`/mcp` impossible, so "no `/mcp`" holds trivially), and the SW console was not observed. See finding M1. |
| MUX-6 | PASS | Exactly one daemon (2456, parent 22364 = race-a's pid); exits 0, 0; both `.out` end `— OK`; `.err` empty; log lines 41–51: one `listening`, two `start`, the loser's `port 9234 in use …` and `exit 0 (port in use)`, `client + "race-a"`, `client + "race-b"`. NIT: the listing comes from a separate `Format-List` call, not the block's own `Get-BridgeDaemon` (which printed an empty row). |
| MUX-7 (b) | PASS | `(b) M1 alive: False; waited 0.0 s` (≤ 10.0); `Get-Process -Id 11584` nothing; D 6872 listed; log line 56 `client - "claude-code #21408" (0 clients)`, no `exit`. NIT: the poll began "a few seconds after the `/exit`", not "at once", so 0.0 s bounds nothing; survival is still shown (6872 listed; log line 57, a new client on the same daemon with no `start`). |
| MUX-7 (c) | PASS (2nd attempt) | Attempt 1: `waited 0.2 s` (≤ 4.5), D alive, log line 58 — but the `/mcp` + `browser_status` part was not done before D idled out (lines 59–60, by design). Attempt 2: `waited 0.2 s`, 31436 alive, line 67, `/mcp` → `Clients (1): claude-code #19796` (line 68), no `start`. See finding m2 (who spawned 31436). |
| MUX-7 (a) | PASS (expected = Stage 0 measurement) | `SUCCESS: The process with PID 2576 (child process of PID 28880) has been terminated.` literal; 2576 gone; no `exit` line (line 75 is the next daemon's `start`); SW `connection: down` (user). Procedure deviated: S3 connected to 31436 first and spawned D3 only after the driver stopped 31436 (line 70 → 71, 5 s later); the precondition (`<D3>` parent `<M3>`) still held. |
| MUX-7 (d) | PASS | `taskkill` names 19040, 10872, 16460 only; D4 30296 alive; line 80 `client - "claude-code #10872" (1 client)`; S4 `Daemon: connected …` (`up 170s` = 10:01:42 → 10:04:32), `Extension: connected`. |
| MUX-7 (e) | PASS | `(e) waited 3.3 s` (≤ 12.0); 20360, parent 31352; lines 81–84 `start pid=20360` … `client + "claude-code #31352" (1 client)`; no `exit` for 30296; S4 status without `/mcp`, `Clients (1): claude-code #31352`, `up 162s` (= 10:05:02 → 10:07:44). 3.3 s < 5 s is consistent with `mcp/src/link.ts` (a 5 s health-check tick notices the drop 0–5 s after it). |
| MUX-8 | PASS | `FAILED after 15029 ms — NOT_CONNECTED: …(waited 15000 ms on port 9234)` literal, in [15000, 16500]; exit 1; lines 85–86 15 s apart; S4 meanwhile `Daemon: connected …` + the literal `Extension: not connected — …` line; second run `… — OK`, exit 0; optional run `closed after 3672 ms` (< 15000), exit 0. NIT: the second run's `connecting` line is not quoted. |
| MUX-9 | PASS-with-deviation | ACT-1 `status: email = a@b.com`, ACT-2 `status: counter = 1`, TRUST-2 `status: TRUSTED click received` + banner during (11:18:18) / gone 6 s after, EVAL-1 `Agent Bridge E2E Playground` + banner during / gone 8 s after, NET-1 `Cleared 15 requests.`, the header line, no banner — all match. **NET-1 prints `12.6 KB`, the row expects `12.9 KB`** (D6.4 below). NIT: the row's precondition (`browser_status` shows both connected) is not quoted for the MUX-9 session (DL-1's status a minute later shows it). |
| MUX-10 | PASS | `FAILED after 2016 ms — VERSION: No welcome …` (in [2000, 3000]; text matches `sdk/src/knock.ts:196-198`); exit 1; `Get-BridgeDaemon` empty; rerun `— OK`, exit 0, `up 0s` (log 109–113). Deviations: the old server read the token from the file itself (fine for A8); the worktree was force-removed although the refusal was a tracked change (`package-lock.json`), which the row's `--force` precondition does not cover — harmless for a throwaway worktree. |
| DL-1 | PASS-with-deviation | (0) `False`; (a) the two literal lines, no extra lines, no banner, same `Active tab: [1108126126] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html` before and after; (b) hash literal, listing `hello.txt`; (c) literal error; (d) the two lines. **Not evidenced: `[bridge] download held 69 bytes`** (SW console not open). |
| DL-2 | PASS | (0) `False`; (a) `200`, tool error containing `TypeError: Failed to fetch`, fixture `"GET /dl2 HTTP/1.1" 302 -`; (b) `Saved …\dl2\hello.txt`, `(followed redirects to localhost:8080)`, fixture and 8080 log lines; (c) = DL-1 (b). NIT: the record elides the (b) sha256 line and the (c) hash (`0a6b99ca…2956ce`) where the row asks for literal text. |

## Exit checks

**D6.2 — PASS-with-notes.** Every row has its command and observed text, in the run record and
summarised in Run 7. MUX-6's evidence is a process listing showing one daemon (2456); MUX-4's is two
timestamps twice over (log T0/T1 and the block's `$t0`/`$t1`). Elisions where literal text was due:
DL-2 (b)/(c) hashes, MUX-4's SW console as counts, MUX-8's second-run `connecting` line.

**D6.3 — PASS.** Counted in `W1-daemon-log.txt` (148 lines) with the token held in a variable and
never printed: `://` **0**, token **0**, `[line withheld:` **0**. The same token count is 0 in
`W1-run-record.md`, `docs/e2e-test-plan.md`, `docs/decisions.md` and the as-built.

**D6.4 — PASS-with-deviation.** ACT-1, ACT-2, TRUST-2, EVAL-1 match their last recorded runs (Run 2
line `status: email = a@b.com`; Run 6 NET-15 `status: counter = 1`, `status: TRUSTED click
received`, `Agent Bridge E2E Playground`; banners per Run 5/6). NET-1 differs only in the size
column. The record's claim that `12.9 KB` is an expectation error **holds**:
- `test-fixtures/e2e-playground.html` is 12 914 bytes, 254 lines, 0 CR bytes; `git ls-files --eol`
  → `i/lf w/lf`; the committed blob is also 12 914 bytes and unchanged since `ac469da` (2026-09-07).
- `formatSize` (`extension/src/network-log.ts:257-261`) prints `(bytes / 1024).toFixed(1)` KB; the
  size is the `content-length` header (`network-log.ts:628-629`). 12 914 / 1024 = 12.61 → `12.6 KB`.
- Run 6 itself shows the same page as `[374] … 12.6 KB` (NET-11) after `[3893] … 12.9 KB` (NET-1).
- So the row's "the fixture is still 12 914 bytes" and `12.9 KB` cannot both be true.

The *cause* the record gives (Run 6's NET-1 "read a CRLF copy", 13 168 bytes → 12.86 KB) fits the
numbers but is not proven: `12.9 KB` covers 13 159–13 260 bytes, and the fixture was being edited
during Run 6 (it was committed in `ac469da` after that run, growing from 10 692 bytes), so an
intermediate version is an equally possible source (finding n3).

**(d) of the wave's exit checks — PASS.** `git diff -- extension/` is 0 bytes and `git status
--short -- extension/` is empty. `npm test`: `Test Files 42 passed (42)`, `Tests 542 passed (542)`.
Also `daemon/dist/index.js` hashes to `795fb769…a337bd` again (the MUX-5 undo held).

## Task E — MUX-5's code claim and R3

The code claim is correct. `activeTab()` (`extension/src/tabs.ts:1-5`) is
`chrome.tabs.query({ active: true, lastFocusedWindow: true })` and throws exactly `No active tab in
the last-focused window`; the snapshot/action/evaluate handlers use it. `listTabs`
(`extension/src/handlers/tabs.ts:3-8`) queries `{}` and returns every tab's `active` flag, and
`browser_status` (`mcp/src/tools/registry.ts:62-66`) prints the first tab with `active` true, in any
window. A focused DevTools window (no tabs) therefore makes status name a tab while every action
fails. The DevTools-had-focus part is the user's confirmation, not measured.

R3 meets every text item of the row except: the 15 s bound (status 15.4 s, snapshot 16.9 s after the
recipe closed), and the SW console `down`/`up` (not observed). The `/mcp` clause holds only
trivially (a headless session cannot run it). The bound's purpose — the MCP follows the handover
without `/mcp` — is shown independently by the log: `client + "claude-code #11268" (2 clients)` on
the new daemon at 11:30:24, the same second as `listening` (line 146), and likewise line 37 in
Run 1. So R3 does not meet the row as written; it is strong evidence the behaviour under test works.

## Task F — MUX-7 vs decision #31

(b) as expected (daemon alive after a normal end), (c) as expected on the second attempt (the first
attempt's kill also left the daemon alive; only its `/mcp` follow-up was lost to the by-design 10 min
idle exit), (d) as expected (alive after a tree kill of a non-spawning session). #31's trigger
("the daemon dies in a case where the row expects it alive") is not met: **#14 stands, no
launcher is built as a Step 7 prerequisite.** (a) and the extra `taskkill /PID 1480 /T /F` (which
also ended 20360) both reproduce Stage 0 F3: the daemon dies only in a tree kill of its own
spawner's live tree.

## Findings

### MAJOR
- **M1 — MUX-5 has no run that meets its pre-written Expected as written.** Run 1 (the specified
  procedure) failed `browser_snapshot returns a snapshot (no error)` with `No active tab in the
  last-focused window`; R3 passed it at 16.9 s against "within 15 s", headless, without the SW
  console. The cause is verified in code and is not a Step 6 defect (the status/action active-tab
  mismatch predates Step 6), and the handover itself passed in all three runs. Run 7 marks it `F`
  and defers to the user, which is the right handling; the verifier agrees it needs that ruling
  rather than a silent PASS.

### MINOR
- **m1 — DL-1's `[bridge] download held 69 bytes` was not observed.** One expected item of a ★ row
  has no evidence; Run 7 says so.
- **m2 — An unexplained client spawned the daemon used by MUX-7 (c) attempt 2.** Log lines 61–66:
  `start pid=31436` at 09:53:45 with `client + "claude-code #20604" (1 client)`, gone at 09:53:50,
  the same second `claude-code #16492` (the measured session) joins. The record says only "connected
  to daemon 31436, which it had not spawned" and never names #20604 or 31436's `ParentProcessId`.
  #20604 is also the pid of the pre-wave session's MCP (line 4, gone 08:56:33). Most likely a pid
  reuse by a short-lived first MCP start of the new session, but A2 asks that no unrelated Claude
  session be open during MUX-7, and the record should say what #20604 was. Not affecting (c)'s
  result (16492 was measured as a non-spawning client).
- **m3 — NET-1's literal `12.9 KB` is not met** (D6.4). The verifier confirms the expectation is
  wrong; the row text should be corrected (dated) rather than the result.

### NIT
- n1 — MUX-7 (b)'s poll started a few seconds late, so `waited 0.0 s` bounds nothing (survival is
  shown otherwise).
- n2 — Elisions where literal text was due: DL-2 (b)/(c) hashes; MUX-4 SW console as counts; MUX-8
  second run's `connecting` line; MUX-9's precondition status not quoted.
- n3 — "Run 6's NET-1 read a CRLF copy" is stated as fact in both the record and Run 7; it is a
  consistent hypothesis, not a measurement (see D6.4).
- n4 — The MUX-10 message in the record is written ``…stop the old ``node …/server/dist/index.js``)…``
  (double backticks inside a code span); the SDK's text has single backticks
  (`sdk/src/knock.ts:198`). Markdown escaping, not a different message.
- n5 — MUX-10's `--force` worktree removal went past the row's stated precondition (a tracked
  `package-lock.json` change, not build output).
- n6 — Pid reuse makes the record easy to misread: 14996 is S1's MCP in MUX-1 and the shim `P` in
  MUX-7 (c) attempt 2.

### Leak / invention check (task H)
No line looks invented: every log claim in the record (starts, configs, `listening`, `port in use`,
client `+`/`-` lines with counts, exits) is present in `W1-daemon-log.txt` in the stated order, and
every `up <n>s` agrees with the log's `start` stamps (`Math.round`, `mcp/src/tools/registry.ts:54`).
No URL other than `localhost`, `127.0.0.1` and `chrome://` appears; the extension id is written
`<extension id>`; the token count is 0 everywhere. The Windows user name appears in `C:\Users\…`
paths (DL-1, DL-2), as it already does in nine committed files — not a new exposure.

Note: during this verification `docs/decisions.md`, the as-built and the phase doc were being
modified by another session; they were outside this report's scope and were not judged.
