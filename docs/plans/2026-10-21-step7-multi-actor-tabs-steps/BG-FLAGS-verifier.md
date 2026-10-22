# BG-FLAGS (Run 10) — results verifier, 2026-10-23

Fresh, independent verifier (role-prompts.md §Verifier). Read: `CLAUDE.md`, `briefs/common.md`,
`docs/e2e-test-plan.md` §4.16 (committed in `00249de`), the wave sheet's "BG-FLAGS (Run 10)", the
uncommitted `BG-FLAGS-run-record.md`, `BG-FLAGS-daemon-log.txt` and §5 "Run 10 (BG-FLAGS)", §5 Run 8,
`recipes/bgf-count.ps1`, `recipes/bgf-quit.ps1`. Chrome was not touched; no daemon was started; the token
was never read into output.

Verdict: PASS-with-notes

No BLOCKER and no MAJOR finding. Every verdict follows from the copied rules, the procedure was
followed, the reading rule is applied as written, and the end state is confirmed live. The notes below
are about how the record is written down, not about the results.

## Checks made

1. **Verdicts are mechanical.**
   - BGF-1 (record l.134–137): `status: idle`, not `TRUSTED click received`, so FAIL.
   - BGF-2 (l.148–151): `status: idle`, field `""`, so FAIL.
   - BGF-4 (l.160–163): 1900 ≤ 2065 ≤ 10000, 543 ≤ 10000, `target still background: yes`, so PASS.
   - BGF-3 (l.183–193): `Selected tab T14 (…)`, then an `OUTPUT (isError)` with `NotAllowedError … Document is not focused`, then `Focused tab T14`, then `ok`, so PASS.
   - BGF-0 (l.64–77) and BGF-5 (l.237–250): FAIL/FAIL.

   Validity: a `bgf-count` with all three flags ran right before each of BGF-1 (l.128), BGF-2 (l.142),
   BGF-4 (l.155) and BGF-3 (l.170). Before BGF-0 the count shows `[]` (l.61); before BGF-5 it shows
   `[--restore-last-session]` (l.234), so neither has a flag. The §5 line (e2e-test-plan.md:1623)
   matches.
2. **Procedure.**
   - Precondition: k = 2 = T + 1 (l.50).
   - Step 1 before each quit: l.89 for restart 1; for restart 2 it is the 23:29:29.9 count (l.201), 11 s before the quit. Both equal the first count, l.31.
   - Step 2: `QUIT OK` exit 0 on both quits (l.95–96, l.210–211).
   - Step 3: the launch args are exactly as pre-registered (l.101, l.213).
   - Step 4: the poll was stable at the second count. `-CloseBlank` ran only with blank = 1 and windows = N + 1 (l.107–109, l.216–218). Its first line is the script's own pre-count (`bgf-count.ps1:70–71`).
   - Restore PASS: N/T/P, blank 0 and the expected switches, both times (l.110, l.219).
   - Step 5: k = 2 after each restart (l.116, l.224), and no reload was needed.
   - No STOP was triggered, and none went unstated.
3. **Reading rule.** BGF-1/BGF-2 FAIL ⇒ "the flags alone do not change the outcome". The record (l.283) and §5 (l.1634) apply it as written. 2065 ms against 3746 ms is under "Facts beside the verdicts (not judged)" (l.289). Run 8's figures check against §5 l.1564–1565.
4. **End state.** The final count (l.267) is 1/1/[1], blank 0, `[--restore-last-session]`. Re-measured now:
   `2026-10-22T23:34:48.938Z bgf-count: … browser windows 1 (minimized 0); tabs 1 (per window, sorted: 1); blank windows 0; browser switches: [--restore-last-session]`.
   Process query: `pid 31092 parent 34688 created 2026-10-22T23:29:42Z switches [--restore-last-session]`, which matches l.213 and l.269. Nothing is listening on 9234 or 8080. Both pre-stated differences are recorded (l.269, l.296).
5. **Integrity.**
   - The pre-existing window is identified only as W1's `127.0.0.1:8090/crlf.html` probe copy, the same wording as `T5-run-record.md:13` and `T5-run9-record.md:9`. No other title or URL appears.
   - `bgf-quit.ps1` has no kill (exit 3 path, l.104), and no kill of chrome.exe is recorded.
   - The daemon and the fixture server were each stopped after a `safe:` line (l.260–263).
   - Log hygiene, re-run: 66 lines; first line `2026-10-22T23:26:16Z start pid=15000`; `://` 0; `withheld` 0; token occurrences 0 (compared in memory, count only). The same token count of 0 holds in the record and in e2e-test-plan.md.
   - The attachment is byte-identical to `~/.chrome-agent-bridge/daemon.log` lines 464–529 of 529 (`diff` → SAME), with nothing after them.
6. **Consistency.**
   - Client numbering matches the log's `client +` order: c1 = log line 4, c9 = line 22, c23 = line 51.
   - Resyncs at 23:26:20, 23:27:25 and 23:29:43 match the record (l.123, l.293).
   - The run's client order matches the log: find/bg1/cleanup/find/bg2/cleanup/cleanup, then find/bg4/cleanup and open/info.
   - Actor F's connect and disconnect (23:28:33–23:29:22) match l.173 and l.198.
   - Tab handles, chrome ids and times agree across the record and §5.
   - The only change to e2e-test-plan.md is the hunk that adds Run 10 at l.1608. §4.16 and the wave sheet are unchanged since `00249de`.

## Findings

- **MINOR 1: two outputs are shown in another form.**
  - The close-down step `t5-actor.ts status` (wave sheet step 7) appears only as a paraphrase ("every actor ended, F `exit code 0`", record l.203), not as its verbatim output.
  - "Before the run (23:12Z) … pid 8044 … in a job object" (l.35–37) is stated, not shown as command output.
- **NIT 2: the helper test's output is one line short.** The text (l.39) says `Count` and then `Count -CloseBlank -Expect 1` were run. `-CloseBlank` prints its own pre-count first (`bgf-count.ps1:70`), so four lines are expected, but three are shown. The 1 s gap between l.41 and l.43 points to l.41 being the `-CloseBlank` pre-count, which means the plain `Count`'s output is missing.
- **NIT 3: the launch times are not stamped.** For restart 1 the gap from the quit (23:27:14.8) to the first poll (23:27:27.1) cannot be checked against "every 2 s". The 23:27:25Z resync bounds the launch as earlier than that.
- **NIT 4: actor F's log name is not in the record.** The log names actor F's MCP client `claude-code #3200`. The record gives the host pid 17292 and the claude pid 27188, but not 3200.
- **NIT 5: one "not judged" fact carries a cause.** "(the timer clamp is off)" (l.291) gives a reason for 2065 against 3746 ms. That comparison is across runs, since this run did not measure BG-4 without the flags. It would be better worded as "consistent with" than as a cause.
