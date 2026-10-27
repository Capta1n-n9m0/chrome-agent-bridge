# S4-live verifier 4: helper fix 4 (the STOP names its cause) and fix 4b (the history set-up waits for each back)

Model / effort: Opus, medium. Read and run only. Offline: `-Block plan` was the only block run. Nothing under
`%TEMP%\bridge-e2e\s11b` was touched, and `bridge.token` was not read. Scratch files are under the session scratchpad
(`…\scratchpad\atk\`, `…\scratchpad\red\`, `…\scratchpad\green\`, `…\scratchpad\mkred.mjs`).

## 1. Verdict
**PASS-with-notes.** There are no CRITICAL or MAJOR findings and no failed exit check. The notes are one MINOR and
three NITs (§6).

## 2. Outputs (re-derived)
| Gate | Command | Result |
|---|---|---|
| Tests | `npm test` | `Test Files 182 passed (182)`, `Tests 4528 passed (4528)`, exit 0. Matches fixer 4b's claim. HEAD was 4505/180 (fixer 4); +23 tests (18 + 5), +2 files |
| Recipes typecheck | `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Plan | `powershell -NoProfile -File recipes/s11b-r17.ps1 -Block plan` | exit 0; the liveA plan still lists `history` before `g1-open` |

## 3. Checks

### (A) Fix 4: the STOP line for an unexpected throw
- **Code.** `unexpectedStop17` prints the code only when `isErrorCode` accepts it. `isErrorCode` is an exact `Set`
  membership test (`shared/src/codes.ts:117-119`). Any other code prints as `<code len=n>`: a crafted code
  `C:\Users\x` printed `<code len=10>`. `data` is never read. A crafted `{url:"http://secret/"}` in `data` showed up in
  none of the 40 printed lines (`scratchpad\atk\attack.out`).
- **Message.** It is printed only when it is in `KNOWN_TEXTS` or passes `safeMessage17`, which takes scan17's counts
  with `consoleStream:false`. That setting is correct: with `true`, a line carrying `net::ERR_BLOCKED_BY_CLIENT` and
  `localhost:8085` would drop out of the body and count 0. `safeMessage17` adds the extra guards on top of the counts.
  The crafted BridgeErrors (`scratchpad\atk\attack.ts`, run with tsx against the working-tree `s11b-rules.ts`) gave:
  - **Withheld (by length):**
    - an a-run, lower and upper case, and `bank.example` in any case;
    - `Localhost:8085`, the alias in any case, the sentinel in any case;
    - the exact context token, and a 64-character hex token;
    - URLs with the `http://`, `chrome-extension://` and `file:///` schemes;
    - the paths `C:\x`, `C:/x`, `drive D:`, UNC `\\server\share` and `/etc/passwd`;
    - the profile path in `/` form;
    - non-ASCII text, a newline (so a forged `ROW …` line cannot be injected), a tab, and texts of 200 and 201
      characters (the 200 case through the 24-run guard);
    - a sheet text with a URL appended;
    - a fake `SCAN …` line. scan17's own-line filter would have dropped that line from the counts, but the extra
      guards catch it.
  - **Printed:**
    - the exact sheet text;
    - the plain messages below, which are the gap reported as MINOR-1: `file:x.html`, `about:blank`,
      `javascript:alert(1)`, `data:text,hi`, a bare host `mail.google.com`, `localhost:8081`, `127.0.0.1:9234`, an
      e-mail address, `~someone`, a profile *name* with no path, a 12+12 a-run split by a space (which scan17 does not
      count either), and segmented token-like strings (base64 with `+`/`=`, dot-separated segments, space-separated
      segments) when they are not the context token.
  - The real token is always caught: it is in the context (`token()` reads `BRIDGE_TOKEN`, else `bridge.token`, the
    same sources the SDK uses).
- **Not a BridgeError.** A `TypeError` printed `unexpected TypeError` and a thrown string printed `unexpected throw`,
  which is HEAD's form exactly. If the throw happens during the history build, the line also gets ` at=<step>`
  (NIT-2). An `Error` named `BridgeError` with a non-string `code` printed `unexpected Error`, so a code that is not a
  string is never printed.
- **`histStep`.** It only ever holds fixed labels: `connect`, `claim`, `navigate <i>`, `back <i>` (integers from loop
  indexes). It is cleared after a successful build (`s11b.ts`, `histStep = undefined` before the `HISTORY` line) and
  again on entry to `main`. It is never printed except through `at=`.
- **Exit code 2.** `main`'s catch returns 2 on every path. `stopCtx` wraps `scanCtx` in a try. The one throw left in
  the catch is NIT-1, which no real BridgeError can reach. The end-to-end test in `s11b-stop-cause.test.ts` asserts
  `main` returns 2 with both the printed and the withheld form.

### (B) Fix 4b: the set-up wait
- **Scope.** `git diff HEAD -- recipes/s11b.ts` has no hunk in `historyCall`: `grep -c historyCall` on the diff is 0,
  and the only hunks are the import list, `history()`, and `main` with its helpers. The measured `B17 back` and
  `B17 forward` ops are byte-identical to HEAD.
- **Targets.** `historyPlan('fwd')` is `[P0 …fw0, P1 …fw1, flip /h/fwd?s11b=fw]` with `backs: 2`.
  `historyBackTarget(plan, 1)` = `urls[1]` (P1) and `historyBackTarget(plan, 2)` = `urls[0]` (P0). That matches the
  sheet's RD-FWD row: "`[P0] [P1] [flip /h/fwd?s11b=fw (200)]` built and moved back twice (to P0)". RD-BACK, samedoc
  and empty have `backs: 0`, so the new loop body never runs for them and their `HISTORY` line is unchanged.
- **No premature match.** Before back 1 the tab is on the flip URL, which is not P1. Before back 2 it is on P1, which
  is not P0. `fw0` and `fw1` are distinct query values, so a match can only mean that back has landed.
- **Nothing printed.** The comparison is `sameUrl17` in memory. A timeout throws
  `Stop("history set-up at=back <n>: the tab did not reach its history entry within 10000 ms")`: fixed text and
  numbers only. A throw from `c.tabs()` goes out through fix 4's `at=back <n>` path.
- **Hidden rows.** `listTabs` sends `url: t.url ?? ""` and a hidden row carries no url (`handlers/tabs.ts:30,39`).
  `sameUrl17("", x)` is false, as tested. A disarmed or blocked row therefore times out to the fixed STOP and never
  matches.
- **What the wait reads.** `chrome.tabs` `url` is the last committed URL, and `pendingUrl` is never sent
  (`tabs.ts:39`). The wait therefore ends at commit, and the fixed 500 ms settle covers commit to `complete` on a local
  8081 page.
- **The settle cannot change what the measured rows mean.** The measured calls run later, in separate node processes
  (`R17 rd-fwd` → `B17 forward`), after G1's save and its read-back. Several G1 rows run before RD-FWD, so a load still
  pending from the set-up has long ended by then. HEAD added no wait at all. The fix can only make the start state more
  settled.
- **Flip request count.** The count RD-FWD's pass rule reads is unchanged.
  - `--flip-total` comes from `Get-R17Hits $Tag -BlockedOnly -Flip` (`s11b-r17.ps1:256-259`), which counts the flip
    server's (8091) log lines for the tag.
  - The set-up requests the flip URL once (`navigate 3` → its first GET → 200).
  - Both set-up backs land on 8081 entries (P1, then P0). Neither targets the flip entry, so a bfcache miss on a back
    cannot add a flip request. A back that leaves the flip page does not fetch it.
  - The wait adds only `c.tabs()` reads, which are a list call and no page load.
  - HEAD made the same two backs. The only possible difference is that under HEAD a second `goBack` sent during the
    first back's pending load could leave the tab somewhere other than P0. The fix makes the end state the sheet's P0
    deterministically, and G1's forward → P1 → forward → flip (second GET → 302) still gives the "2 requests" the rule
    expects.
  - The flip page's bfcache eligibility is set by its `no-store` header and by leaving it on back 1, both as at HEAD.

### (C) The working tree is the intended final state
- `git status --short` (ignored files included) under `recipes/` shows only `s11b-rules.ts`, `s11b.ts` and
  `tsconfig.s11b.json` (modified) and the two new tests. There is no backup copy and no cut-down copy.
- `git diff HEAD --stat -- recipes` reports `3 files changed, 78 insertions(+), 8 deletions(-)`.
- The `s11b-rules.ts` diff is purely additive: the `isErrorCode` import, `safeMessage17`, `unexpectedStop17`,
  `historyBackTarget`, `sameUrl17`, the three `HIST_*` constants and `pollUntil17`. No HEAD text was lost, and nothing
  of fixer 4b's cut-down copy is left: the full file typechecks and all 4528 tests pass. The `s11b.ts` diff is exactly
  the described hunks. The ledger diff consists of the step agent's three appended lines.

### (D) The new tests are red without the change
- `scratchpad\mkred.mjs` copies HEAD's `s11b.ts` and `s11b-rules.ts` (from `git show HEAD:`) and the two new tests
  outside the repo, with their imports made absolute. Vitest then runs them with `--root` at that copy.
- **Red (HEAD copies):** `23 failed`, exit 1. The `main` test fails behaviourally with
  `Received: "STOP: unexpected BridgeError"`, which is exactly attempt 5's line. The other tests fail on the missing
  exports (`pollUntil17 is not a function`, …).
- **Green control (working-tree copies, same harness):** `Tests 23 passed (23)`, exit 0. The harness is sound.
- No `git stash`, `checkout` or `reset` was used.

### (E) Nothing protected changed
The diff touches no pass rule, judge (`judgeHistory`, `judgeHistoryRow`, `verdict17`), expected text, K17 entry, sheet
(`docs/e2e-test-plan.md` is unmodified), s9 or s11 file, or product file. `git status` lists only the five lane files,
the ledger and the untracked runner and record docs.

### (F) Gates
All pass; see §2.

## 4. Deviations
- While building the first attack command I ran a stray `cp` into `node_modules/.vitest-atk.tmp` and removed it in
  the same command. `ls` confirms it is gone. No tracked or lane file was affected.

## 5. Proposed decisions
None.

## 6. Findings
- **MINOR-1: the message filter passes identifiers without a scheme.**
  - Where: `recipes/s11b-rules.ts`, `safeMessage17`.
  - Evidence: `scratchpad\atk\attack.out`, the `safe=true` lines:
    - `"Timed out loading mail.google.com"` printed as is; the same for `refused localhost:8081`,
      `refused 127.0.0.1:9234`, `user someone@example.org`, `about:blank`, `javascript:alert(1)`, `data:text,hi` and
      `file:x.html`;
    - segmented tokens that are not the context token, such as `t QzT9kLmN2pR+7sV4wX8yA1bC3dE5fG6hJ==` and a dotted
      JWT-like string.
  - Why this matters: the STOP line goes into a committed run record in a public repo, and §2 says evidence never shows
    a real site.
  - How likely it is: low. The history set-up navigates fixture URLs only. Chrome's URL-bearing texts usually carry
    `://`, which is caught. scan17's own counts would not flag these strings either, so the filter is consistent with
    RD-LOGS's leak definition. Hence MINOR, not MAJOR.
  - Suggested fix: also withhold a message that matches `@`, `/\b[a-z][\w+.-]*:(?!\s)/i` (any scheme-like prefix),
    `/:\d{2,5}\b/` (a port), or `/\b[\w-]+\.[a-z]{2,}\b/i` (a dotted host). Check that the sheet texts still print by
    the `known` path, as they do today.
- **NIT-1: one throw left in `main`'s catch.** An object that passes `e instanceof Error`, `e.name === "BridgeError"`
  and has a string `code` but a non-string `message` makes `safeMessage17` throw inside the catch. Evidence:
  `THROWS on non-string message: TypeError`. `main` would then reject instead of returning 2. The case is unreachable,
  because `shared/src/error.ts` `BridgeError` always passes its message to `super(message)`. The fix would be a
  `typeof e.message === "string"` guard.
- **NIT-2: a non-BridgeError throw during the history build gains a suffix.** It prints
  `unexpected TypeError at=claim` rather than HEAD's bare form. This is intended and safe, since the labels are fixed.
  Outside the build the form is HEAD's exactly.
- **NIT-3: no test checks that `history()` calls the poll.** The wiring that `history()` polls `c.tabs()` after each
  `back()` and throws the fixed Stop is covered only by the typecheck and by reading the code. The helpers are tested.
  This is SDK glue, consistent with the testing philosophy; the next liveA's `HISTORY fwd built` line is its live
  check.
- **Fixer claims checked.**
  - Fixer 4 claimed HEAD's copies fail all 18 tests. Reproduced outside the repo: all 18 stop-cause tests and the 5
    hist-wait tests failed (23 of 23).
  - Fixer 4b's 4528/182 count is reproduced.
  - Fixer 4's diagnosis is sound. RD-BACK has `backs: 0` per the sheet, so `tab.back()` first ran in the fwd build,
    which never printed its `HISTORY` line. The runner's "after the history body" reading is wrong.
  - Fixer 4's report says it used a Python replace script rather than Write or Edit. The result matches the described
    diff.

## 7. Handoff
- Nothing was left running.
- A `-Block teardown` is still required before the next liveA (runner5 Leftovers).
- Files to commit (step agent's committer): `recipes/s11b.ts`, `recipes/s11b-rules.ts`,
  `recipes/tsconfig.s11b.json`, `recipes/test/s11b-stop-cause.test.ts`, `recipes/test/s11b-hist-wait.test.ts`,
  `S4-live-fixer4.md`, `S4-live-fixer4b.md`, and this report.
