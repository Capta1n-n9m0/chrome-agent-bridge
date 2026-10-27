# Step 12 — Stage 0 verifier

**Model / effort:** Opus 5.5, medium. **Tree:** `0ba82f6`; no tracked change except `journal.md` (`git status --short`).
**Pass rules:** `stage0-v-passrules.txt`, written before any run. **Evidence:** `stage0-v-chrome.txt` (V1–V3, raw output,
fixtures, leg scripts), `stage0-v-code.txt` (counts, V4–V6). **Read:** the phase doc in full, `agent-rules.md`,
`Stage0.md`, both audits, the three measurer reports, their pass rules, set-up files and the evidence I cite.
`mcp/CLAUDE.md` loaded.

## 1. Verdict

**FAIL**, on two MAJOR findings in Stage0.md §5 (V-1, V-2). Both are text fixes to proposals. No measurement and no
count is wrong. The five re-executed findings all reproduce. Z.1 and the four Stage 0 boxes are met apart from V-1 and V-2.
A fresh verifier needs to re-check only V-1 and V-2, and V-3 to V-6 if the fixer takes them.

## 2. Five findings re-executed

| # | Finding | Command (evidence) | Reading | Result |
|---|---|---|---|---|
| V1 | m1 B1 (`callFunctionOn {value}` mangles JSON) and the (i′) variant | Scratch Chrome 156.0.8078.48, headless, probe `chrome.debugger`; `scripts/v1.js` on `plain.html` and `csp.html` (control `evalBlocked "yes"`) | Value route: the page sees `{"a":1,"e":"","m":{"b":[1,null,{}]},…}`, so keys are sorted and null properties dropped (an array's null is kept). Top-level `null` arrives as `undefined\|undefined`. (i′) returns `JSON.stringify(W)+"\|object"` exactly, and `null\|object`; async gives 3; globals 984 → 984 (0 added, 0 removed); same on the CSP page | **REPRODUCED**, both halves. (i′) now also passes a rule written before its run (see V-3) |
| V2 | m3 B10 (pause + `terminateOnResume` ends a sync loop) | `scripts/v2.js` LEG=run on vb1–3; LEG=ctl on vbc | 3 of 3: paused in 26–27 ms; the pending call answers `{"code":-32000,"message":"Execution was terminated"}` 1 ms after the resume; session `1+1`→2 and call→5; follow-up (i′) exact. Control (no pause): no reply 3 s later, so the check discriminates | **REPRODUCED** 3/3, control holds. The answer is a command error that `isExecutionTerminated`'s unanchored `/execution was terminated/` matches (`debugger-errors.ts:99-101`). This supports Stage0.md's "no new text" |
| V3 | m2 E7 (`Page.fileChooserOpened` needs `Page.enable`) | `scripts/v3.js`, order balanced: tab A without then with (same session), tab B with then without (new session); headless, tab `active:false` every sample | Without `Page.enable`: 0/5 and 0/5. With it: 5/5 and 5/5 (`selectSingle`, `backendNodeId` present). The page counted 10 clicks per tab | **REPRODUCED**. This also clears m2's order confound: m2 always ran "with" first on the same tab. It holds headless too |
| V4 | F2 / G-9: the daemon classes any unlisted method that carries `tab` as a tab method, and no test links the two tables | `npx tsx -e` `classify(...)` from `daemon/src/methods.ts`; a grep for tests naming both `METHOD_CLASSES` and the daemon sets | `consoleMessages {tab}` → `tab`, and `{}` → `untargeted`. `madeUpMethod {tab}` → `tab` (`methods.ts:68-76`). Test files linking the two tables: 0 | **REPRODUCED** |
| V5 | F14: `doc-check` cannot fail | `git archive 0ba82f6` into scratch; "24 tools" → "99 tools" in that copy's `CLAUDE.md`; `node scripts/doc-check.mjs; echo exit=$?` | The output names the mismatch (`CLAUDE.md:17 says 99 tools, code has 24`), and the exit code is `exit=0`. `process.exit\|exitCode` count: 0 | **REPRODUCED** |
| (+) | G-3: the MCP's `browser_evaluate` calls the bridge directly | `grep`/`sed` of `mcp/src/tools/registry.ts` | `bridge.call("evaluate", …)` at `:840-841`; `saveEvaluateToFile((m,p,o) => bridge.call(…))` at `:834`. No `Tab.evaluate` | **REPRODUCED** |

**Counts at `0ba82f6`, my own commands** (`stage0-v-code.txt`):
- 24 tools (24 `reg.tool(` calls, 24 unique names).
- 27 router methods (`router.on` unique) and 27 `METHOD_CLASSES` keys (by import).
- Codes: DAEMON 9 + EXTENSION 17 = 26 on the wire, + SDK 1 = 27.
- Log allowlist: 54.
- `npm test`: `Test Files 191 passed (191)`, `Tests 4665 passed (4665)`, exit 0. This full suite contains the Step 9, 11 and 11b contract sets, which all passed. I did not re-run the three sets apart.
- §4.x: the last heading is `### 4.25` (`e2e-test-plan.md:1682`); the last §5 record is `### Run 17b (S7)` (`:3159`) before `## 6.` (`:3234`). So **§4.26 / §4.27 confirmed**.

Everything matches.

**Spot check of A's defect list** (`stage0-audit-2.md` §3): `s11-win.ps1:307` is the obs JSON line, so the record's `:306` is off by one, as G-23 says. `s11b-win.ps1:334` waits until 1600 ms. `s11b-r17b-rules.ts:152` has `ROW \S+`. All confirmed.

## 3. Integrity checks

- **Pass rules before runs.** The file times (local, UTC+4) and the logs agree:
  - m1: rules last written 14:14:40Z. First run 14:06Z; the addenda are dated and appended, and the second Chrome started at 14:15:52Z.
  - m2: rules last written 14:14:38Z. D4c's stop ran at 14:15:51Z (`stoppedAt` 1793110551764) and E at 14:22:31Z (event `t`). Both are after the addenda.
  - m3: rules written 14:27:46Z, launch at 14:28:56Z.

  No rule text contradicts its reading. Re-measurements are new rows (B6r2, E3r2, E48r2, B7-R).
- **VOID and NOT MEASURED are reported as such:** B7's control VOID (Stage0.md §4); D3c's no-flag control NOT MEASURED (§4, §5); the E123/E3568 "no dialog" readings marked not evidence; F not measured.
- **Rows that were not pre-registered** are recorded, not passed: (i′) run 5, m3 B11's `about:blank`, and m3's "discriminate" rows. Stage0.md presents (i′) as "passes" (V-3).
- **Every §4 Chrome fact** traces to a reading in an evidence file. I found no belief stated as a fact. One citation is wrong: the "1 MiB in ~25 ms" figure is run 4, not run 5 (V-3).
- **Public-safe.** Grep of every `stage0-*` and `Stage0*` file:
  - No user path (`aliev`, `C:\Users`, `AppData`: 0 files).
  - Hosts only `a.test`, `b.test`, `*.test` and `127.0.0.1`. No real site.
  - The bridge token string is in 0 files.
  - "token" occurs only in a SyntaxError text.

  My own files: the launch log's path was shortened to `%TEMP%`, and a grep gives 0.
- **The safety boundary.** No proposal loosens the gate, token, bind or logging. The class of `consoleMessages` and E's JavaScript reading default to the conservative option until the user rules. G2 adds lock holding and loosens nothing.

## 4. Findings

**V-1 · MAJOR · `Stage0.md:139-142` (keeper decision, start-up sweep), from `stage0-m2-D.txt:43-49`.** The sweep detaches "every tab
`chrome.debugger.getTargets()` shows attached **by this extension**". Measurer 2's own D4c reading shows that this
condition cannot be observed. While this extension held the session, both before and after the worker stop, the entry read
`"targets":[{"attached":true,"ext":"none"}]`. The leg's code (`stage0-m2-src.txt`, `D4c2.js`) maps `extensionId === chrome.runtime.id`
to "this extension", and the field was absent. Chrome's `TargetInfo.extensionId` names the *target* when it is an
extension background page, not the attacher (chrome.debugger API reference, TargetInfo).

The impact: a builder who follows the sentence filters on `extensionId`, sweeps nothing, and a fake `getTargets` written to the
same belief keeps every test green. After a worker restart the orphaned session, its banner and the false
`DEBUGGER_DEVTOOLS` remain, which trips the STOP "a debugger session attached after a disarm". Measurer 2's §5 has the same
wording, and its "a detach of a tab the extension does not hold fails harmlessly" is unmeasured.

*Fix:* the sweep calls `chrome.debugger.detach` on every `attached: true` tab target and ignores "not attached" errors. Name
that unmeasured part for Run 19 or a scratch row (a detach of a DevTools-held tab, error text and no side effect). The D4.2 test
uses a fake `getTargets` with no `extensionId`.

**V-2 · MAJOR · `Stage0.md:143-148` (keeper decision).** Per-tab serialisation "so a second concurrent call waits instead
of failing `DEBUGGER_DEVTOOLS` — the one changed answer, listed" changes an existing tool's answer on a call without
new parameters. The phase doc's pre-registered STOP rule names exactly that ("an existing tool answering differently on a
call without the new parameters"), and `agent-rules.md` §4 makes such a change contract-level. Yet the decision ends
"**By:** Claude (proposed)", without "contract-level, for user review". It sits in no question for the user (§8 names only "the
contract-level proposals of §5 and G12-2").

*Fix:* mark it "contract-level, for user review". Name the STOP rule it would trip and the alternative that keeps today's
answer (the second call still answers `DEBUGGER_DEVTOOLS` while the first runs, which is undoable and identical to today).

**V-3 · MINOR · `Stage0.md:21, 57, 99`.**
- (i′) is said to "pass" and "pass its rule" (§1 item 1, §5 "(i′) passes (m1 run 5)"), but m1 recorded it as "Not pre-registered (new rows, recorded only)" (`Stage0-measurer1.md` §2).
- "1 MiB in ~25 ms" is m1 **run 4** (`stage0-m1-B.txt` `jsonString1MiB`), not run 5.

*Fix:* write "measured (not pre-registered), reproduced under a pre-written rule by the verifier (V1)" and cite run 4 for the size. Likewise mark m3 B11's `about:blank` (`stage0-m3-B.txt:181`) and B10's scriptId discrimination (`:106-109`) as recorded rows in §4 and §5.

**V-4 · MINOR · `Stage0.md:194-207` (caps against the phase doc).** The proposed caps exceed the phase doc's pre-registered stage limits:
- S2a 450 > S2's "≤ ~400"
- S3a 450 > S3's "≤ ~400 each"
- S5a 550 > S5's "≤ ~500"
- S6-G1 350 > S6's "≤ ~300 each" (its estimate is already 305)

The phase doc outranks `agent-rules` §7. All caps are under §7's ~600.

*Fix:* a dated phase-doc note raising those limits, or slices sized to them.

**V-5 · MINOR · `Stage0.md:233` (G6.6).** "Every existing daemon lock and trusted-input test passes unchanged" holds today. The daemon tests
check `takesLock` with untrusted `{}` only (`daemon/test/methods.test.ts:106-117`), and the SDK and MCP order tests use fake bridges. But the
check does not name the new predicate's own test. A build that folds trusted inputs into `takesLock` would break
`methods.test.ts:114-116`'s loop only for `click {}`, not for `click {trusted:true}`.

*Fix:* G6.5 names `trustedFocus(method, p)` as a separate predicate, with a table test, and `takesLock` unchanged.

**V-6 · NIT · `Stage0.md:50, 259`.** The placeholders "(filled in after the verifier returns)" and "(hash after the committer)" are still open. They are expected at this point.

## 5. §5 and §6 attacked (beyond V-1, V-2, V-4, V-5)

- **The old-extension proposal (hello `features`, daemon `VERSION`):**
  - It covers the SDK, `evaluateRef`, `evaluateToFile` and the MCP, which reaches `bridge.call` directly (V6).
  - It is marked contract-level.
  - S2a's lane must then include the shared hello type and the daemon's hello handling. §6 puts "hello `features`" in S2a and the daemon `VERSION` check in S2b; that order is fine.
- **The pause/terminate bound:**
  - The answer text matches `isExecutionTerminated` (V2).
  - The "loop after an `await`: never replies" case is covered by the kept `raceTimeout`.
  - The idle-pause hazard depends on the scriptId test, a recorded row, not pre-registered (V-3).
- **C:** conservative throughout (the class is gated on the user; filter before strip; never `discardConsoleEntries`). The one top-level `onEvent` listener in `sw.ts` must enter S3a's lane, which today allows only one `router.on` line. It is listed in §6 S3a; the phase doc needs the dated note (F7).
- **E:** `Page.enable` is reproduced (V3). The `JS_DISABLED` params rule is conservative and marked for the user.
- **G2 (ii-a):** daemon-only. `LOCK_TIMEOUT` is listed as a new answer and marked for the user. It does not loosen the boundary.
- **S6 drafts:**
  - Executable and discriminating: G6.1 (the join and lease tests fail on the pre-slice code); G6.2 (`git diff` of the manifest); G6.3 (count 54); G6.5 (a mutant); G6.7.
  - G6.4 and G6.8 are live rows, so they need §4.27's pre-written text from S7-sheet (stated).

## 6. Exit criteria judged

| Item | Met? | Evidence |
|---|---|---|
| Z.1: findings ranked with command and output | yes | `stage0-audit.md` §4, `stage0-audit-2.md` §5 |
| Z.1: each "not confirmed" Chrome fact of 0.4–0.9 measured or cited | yes (F out of scope; D3c no-flag NOT MEASURED, reported) | §4; V1–V3 |
| Z.1: counts recomputed | yes | V counts match |
| Z.1: every proposed decision attacked | yes (#322–#329) | `stage0-audit-2.md` §1 |
| Z.1: contracts on port 0 | yes | `stage0-a1-contracts.txt`; full `npm test` green |
| Box 1: four lenses, `stage0-audit.md` | yes | |
| Box 2: scratch-Chrome measurements | yes, with V-1's misreading in the proposal, not in the measurement | |
| Box 3: A's defect list with lines | yes | spot check §2 |
| Box 4: contracts re-run | yes | |

## 7. Handoff

**Scratch Chrome:**
- Launched 15:04:41Z, pid 17268, `--user-data-dir` under `%TEMP%\claude\s12-stage0-v`, headless.
- Closed by `Browser.close` → `{}`, `chrome exited code=0` (15:05:51Z).
- The fixture server, python PID 10856, was checked by its CommandLine and stopped by PID.
- Afterwards, chrome, node, python and timeout processes with "s12-stage0-v" in their CommandLine: 0. netstat shows nothing on 18530–18539 or 9234.

**Scratch root:** `dir /AL /S /B` → "File Not Found", then deleted; `Test-Path` → False.

**Not touched:** the user's Chrome, profile, windows and tabs. No daemon was started and 9234 was not used. `npm run build` was not run. No commit was made.

For the fixer: V-1, V-2 (Stage0.md §5), then V-3 to V-5.
