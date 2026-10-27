# Step 12 — Stage 0 (spec audit and Chrome measurements): step report

**Date:** 2026-10-27 · **Step agent:** Opus 5.5, medium · **Tree:** start commit `0ba82f6` (no product code changed) ·
**Children (all Opus, medium):** auditor 1 (`Stage0-auditor1.md`, `stage0-audit.md`), auditor 2 (`Stage0-auditor2.md`,
`stage0-audit-2.md`), measurer 1 (B, C: `Stage0-measurer1.md`), measurer 2 (D, E, G1, G2: `Stage0-measurer2.md`),
measurer 3 (a bound for `args` calls: `Stage0-measurer3.md`), verifier (`Stage0-verifier.md`).
**Brief READ list:** the phase doc in full; decisions.md Open decisions and #321–#329; spec §5, §6.5, §10 with its
Step 9–11b notes; Step 11b phase doc § As built and § STOP rules; Step 11b `S7-run-record.md` §1 and §5; Step 11 phase
doc 0.7 and 0.13; Step 11b's Stage 0 files (scratch-Chrome method); `env-checker.md`; the package `CLAUDE.md` files;
`docs/e2e-test-plan.md` by grep only.

## 1. Verdict

**DONE** (verifier: FAIL in round 1 on two text findings of this report, fixed; round 2 **PASS-with-notes**, §3). Z.1 and the four boxes of § Stage 0 are met. Every "not confirmed" Chrome fact of 0.4–0.7
and 0.9 was measured in a scratch Chrome (branded 156.0.8078.48, a fresh `--user-data-dir` per run, a probe extension
loaded by CDP `Extensions.loadUnpacked`, every page command through the probe's `chrome.debugger`; closed by
`Browser.close`, profiles deleted, no process left: `stage0-m{1,2,3}-setup.txt`). F was not measured (not in scope).
No STOP rule fired. **Five measurements rule out or change a recommended mechanism**; each names its fallback or a
measured replacement as a proposed decision (§5), not a STOP:
1. **B (i) as written fails:** `callFunctionOn {arguments:[{value}]}` through `chrome.debugger` sorts keys, drops
   null-valued properties and turns a top-level `null` into `undefined` (m1 B1). A variant (i′) was measured working as a recorded (not pre-registered) row and reproduced under a
   pre-written rule by the verifier (V1).
2. **B loses today's timeout:** `callFunctionOn` takes none and `Runtime.terminateExecution` is refused to
   `chrome.debugger`; a sync loop wedges the tab (m1 B7). A measured bound exists: `Debugger.pause` +
   `Debugger.resume {terminateOnResume:true}` (m3 B10).
3. **D: a session survives a service-worker stop** (m2 D4c), against 0.6's "sessions do not survive it".
4. **G1 needs `webNavigation`**, absent from the manifest; `sourceTabId` names the real opener 15 of 15, but no
   source the current manifest allows does (m2 G1). G1 goes to the user as **G12-2**; S6-G1 is not run until then.
5. **C1 stands** (replay exists), but the replay runs one page getter (an Error subclass's `message`, m1 C8), which
   bears on #323's class.

## 2. Outputs

- Audit: `stage0-audit.md` (part 1: counts, contracts, cited files, F1–F20, exit-check table, blind spots, §4.x) and
  `stage0-audit-2.md` (part 2: attacks on #322–#329, G2's mechanisms, A's defect list, sizes, G-1–G-25). Evidence
  `stage0-a1-*.txt`, `stage0-a2-*.txt`.
- Measurements: `stage0-m{1,2,3}-passrules.txt` (each written before its runs; addenda dated and appended before
  their legs), `-setup`, `-src`, and the readings `stage0-m1-B.txt`, `stage0-m1-C.txt`, `stage0-m2-{D,E,G1,G2}.txt`,
  `stage0-m3-B.txt`.
- **Counts at `0ba82f6`** (auditor 1, `stage0-a1-counts.txt`): 24 tools, 27 router methods (`sw.ts` and
  `METHOD_CLASSES`), 27 codes (26 on the wire: daemon 9 + extension 17; SDK-only `NO_CURSOR`), `npm test` **4665
  passed / 191 files**, log-scan allowlist **54**. All match the phase doc; the post-scope 25 / 28 / 27 holds (G2 by
  (ii-a) adds no method). Test count unchanged (no code).
- **Contracts on port 0** (`stage0-a1-contracts.txt`): Step 9's set 32 files / 1071 tests, Step 11's 16 / 501,
  Step 11b's (derived from its code commits' test files, list in `stage0-audit.md` §2) 15 / 504; all exit 0.
- **§4.x:** Run 18 → **§4.26**, Run 19 → **§4.27**; their records go after `### Run 17b (S7)` in §5
  (`stage0-audit.md` §7).

## 3. Verifier verdict

- `Stage0-verifier.md`: **FAIL** (V-1, V-2 MAJOR; V-3–V-5 MINOR; V-6 NIT). Five findings re-executed and reproduced
  (m1 B1 and (i′), m3 B10, m2 E7 re-measured in its own scratch Chrome; F2/G-9, F14, G-3 in code); counts and §4.26/§4.27
  confirmed; integrity and public-safety checks pass. V-1 to V-5 fixed in this report (fix round 1, by the step agent:
  the findings are text in its own report).
- `Stage0-verifier2.md`: **PASS-with-notes** (round 2, V-1–V-5 only): all five closed; N-1 (MINOR, the S4a row still
  said serialisation) and N-2, N-3 (NIT) applied in this report as mechanical text fixes.
- Deviation: fix round 1 was made by the step agent in its own report (the findings were text in it), not by a fixer.

## 4. Measured facts (Chrome 156.0.8078.48; each from the file named)

| Item | Fact | How obtained |
|---|---|---|
| B | `callFunctionOn {arguments:[{value}]}` mangles JSON (keys sorted, null props dropped, top-level `null` → `undefined`); Unicode and numbers survive | m1 B1/B3/B4, headless, plain and CSP pages |
| B | **(i′)** source → function object by `Runtime.evaluate`, then `callFunctionOn` on `globalThis` with `function (fn, json) { return fn(JSON.parse(json)); }` and `[{objectId}, {value: JSON.stringify(args)}]`: exact JSON, async resolves, 0 globals added, works under `script-src 'self'`, 1 MiB in ~25 ms (run 4's JSON-string variant) | m1 run 5, the 1 MiB time run 4 (`jsonString1MiB`); recorded rows, not pre-registered; reproduced by the verifier under a pre-written rule (`Stage0-verifier.md` V1) |
| B | No page global with either form (984 → 984 names) | m1 B2 |
| B | Rejections surface as `exceptionDetails`, and the reply also carries a `result` (check `exceptionDetails` first) | m1 B4 |
| B | An old extension answers `kind: "function"` only for expression-bodied sources; `function f(a){ return a; }` → `kind: "undefined"` (wrapped) | m1 B6; auditor 2 `stage0-a2-wrap.txt` (block arrows, `function` forms, `asRef`/`saveTo` → `BAD_PARAMS`) |
| B | `userGesture: true` on `callFunctionOn` gives an activation | m1 B8 |
| B | No timeout on `callFunctionOn`; `terminateExecution` refused (`not allowed for untrusted clients`); a wedged tab survives detach/re-attach | m1 B7 (its control VOID as worded; re-row B7-R in m3 PASS: product `Runtime.evaluate {timeout}` answers `-32603 "Internal error"` in ~1 s and the session recovers, 5 of 5) |
| B | `Debugger.enable` before the call, then at the deadline `Debugger.pause` → `Debugger.resume {terminateOnResume:true}` ends the loop (`"Execution was terminated"`, ~60 ms), session usable, next call exact; a loop after an `await` is ended but its call never replies; an idle pause stops the page's next task (told apart by the function's scriptId in the paused frames) | m3 B10, 3 of 3 + 1 CSP (reproduced 3 of 3 with a no-pause control, verifier V2); the after-`await` and idle-pause/scriptId rows are recorded, not pre-registered |
| B | `$_` and the whole command-line API are absent for a `chrome.debugger` client | m3 B9 |
| B | A wedged tab recovers by a cross-site or `about:blank` navigation (~110 ms), not by a reload or same-host navigation (15 s) | m3 B11 (the `about:blank` leg is a recorded row, not pre-registered) |
| C | `Runtime.enable` replays earlier `consoleAPICalled` (10 of 10, original timestamps), again in a second session | m1 C1, C7 |
| C | Store bound 1000 messages, oldest dropped, plus a size bound (261 of 1000 × 20 kB kept) | m1 C2 |
| C | Uncaught errors and unhandled rejections replay as `exceptionThrown`; `Log.enable` gives 0 | m1 C3 |
| C | Any navigation (same- or cross-origin) clears the store | m1 C4 |
| C | OOPIF messages not on the tab session (0 of 5); need `Target.setAutoAttach` and a child session (5 of 5) | m1 C5 |
| C | No length cap (1,000,000 chars arrive whole); `stackTrace` with URLs on each event | m1 C6, C1 |
| C | `Runtime.discardConsoleEntries` empties the store for every later reader | m1 C7 |
| C | Replay calls an Error subclass's prototype `message` getter once; no other getter, `toString`, primitive or proxy trap ran | m1 C8 |
| D | Attach ≈ 0.2 ms of cost (0.8 vs 0.6 ms median); D's gain is the banner, not time | m2 D1, n=20 |
| D | Banner continuous while attached (0 gaps in ~790 samples × 3); goes 5.02–5.16 s after a detach → ~10 s after a last call with a 5 s idle bound | m2 D2, UIA on the scratch window |
| D | `target_closed` on close; `canceled_by_user` on the banner's Cancel (next command: `Debugger is not attached`) | m2 D3a/b |
| D | F12 DevTools coexisted with the extension session (no `onDetach`, attach ok both orders) — **with `--enable-unsafe-extension-debugging`; the no-flag control NOT MEASURED** | m2 D3c |
| D | A session survives same/cross-origin navigation and a worker stop (`ServiceWorker.stopWorker`): the new worker can send without attaching; attach answers `Another debugger is already attached…`; banner stays | m2 D4 |
| D | A same-extension second attach answers `Another debugger is already attached to the tab with id: N.` (the text `debugger-errors.ts:48` maps to `DEBUGGER_DEVTOOLS`) | m2 D5 |
| E | Interception accepted via `chrome.debugger`; `Page.fileChooserOpened` arrives on the call's own session 5 of 5 on a **background** tab after a `userGesture` eval click, **only with `Page.enable`** (0 of 5 without); `mode` single/multiple, `backendNodeId` | m2 E1, E2, E7 |
| E | `DOM.setFileInputFiles` delivers the file 5 of 5 (E3r2); same file set twice fires no `change` | m2 E3 |
| E | Interception ends with the session; with it off Chrome's dialog opens (2 of 2, closed by UIA); without interception a background tab's chooser is cancelled at once | m2 E4 |
| E | No `userGesture` → nothing; a trusted CDP mouse click on a background tab does not reach the page (0 of 3) | m2 E5, E6 |
| E | Cancel of an intercepted chooser: `files:[]`, interception off, or detach all fire no event, leave the input as it was (`files:[]` does not clear), and free the chooser | m2 E8 |
| E | `showOpenFilePicker` gives the event with no `backendNodeId` | m2 E2 |
| G1 | `webNavigation` not in `extension/manifest.json`; with it, `sourceTabId` = real opener 15 of 15 while `openerTabId` = the active tab 15 of 15; without it, `chrome.webNavigation` undefined, `Target.setDiscoverTargets` `Not allowed`, `Page.windowOpen` has no tab id | m2 G1-1..3 |
| G2 | Visibility 22 ms (max 24) after the focus calls; input handled before the CDP reply; next frame ≤ 9.6 ms; 0 of 150 keys lost or misrouted for a tab switch 0–500 ms after; the hazard is before the input (E6) | m2 G2 a–c |

## 5. Proposed decisions

Recorded by the session agent if accepted. Contract-level ones are for user review. Each child's full text is in its
report (cited); here the consolidated set, with the two auditor disagreements resolved conservatively (`agent-rules.md`
§4).

### 2026-10-27 · Step 12 Stage 0: `args` crosses as a JSON string beside a function object (B (i′))
**Decided:** 0.4's call form is replaced by (i′) (§4): the source evaluated to a function object, `callFunctionOn` on
`globalThis` with a fixed wrapper and `[{objectId}, {value: JSON.stringify(args)}]`, `userGesture: true` as today's
evaluate; then today's serialiser; `asRef` and `saveTo` on the same form; `wrapExpression` off the `args` path.
**Why:** (i) fails its pass rule (m1 B1); (i′) worked as a recorded row (m1 runs 4–5) and passed the verifier's
pre-written rule (V1). **Instead of:** (i) as written; 0.4 (ii) (unmeasured).
**Revisit if:** a page that replaced `JSON.parse` breaks a live row. **By:** Claude (proposed, contract-level, for user
review)

### 2026-10-27 · Step 12 Stage 0: an `args` call is bounded by a debugger pause and terminate
**Decided:** m3's six steps (`Stage0-measurer3.md` §5): `Debugger.enable` + `setBreakpointsActive {active:false}` before
the call; at `timeoutMs`, `Debugger.pause`, terminate only if a paused frame carries the function's scriptId (a recorded row of m3, not pre-registered: S2a's fake-CDP tests and a Run 19 row pin it), else plain
resume; `Debugger.disable` always; `raceTimeout` kept; nothing from `Debugger.paused` logged. `isExecutionTerminated`
gains no new text (the terminate answer already matches). **Why:** m1 B7, m3 B10; today's evaluate is bounded.
**Instead of:** (a) a documented limit plus m3 B11's recovery (cross-site or `about:blank`), the fallback; (b) 0.4 (ii).
**Revisit if:** `Debugger.enable` with a human's DevTools open, or on a heavy page, misbehaves (not measured).
**By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · Step 12 Stage 0: an old extension is detected positively, never by the answer's `kind`
**Decided:** the conservative of the two auditor proposals: the extension's hello gains an optional
`features: ["evaluateArgs"]` (proto stays 2), and the **daemon** answers `VERSION` with the reload hint to any
`evaluate`/`evaluateSaveStart` carrying `args` when the hello lacked it — so the SDK, `evaluateRef`, `evaluateToFile`
and the MCP (which calls the bridge directly, G-3) are all covered, and a real function result stays `kind:
"function"`. **Why:** m1 B6, G-1, G-3, F1 (`evaluateRef`'s precedent is `BAD_PARAMS`, not `VERSION`). **Instead of:**
#322's `kind` test; auditor 1's reply marker checked in the SDK (misses the MCP unless duplicated). **Revisit if:** the
hello cannot change in Step 12. **By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · Step 12 Stage 0: the console read — C1, tab session only, filtered before stripping
**Decided:** C1 (m1 C1–C3). Read `consoleAPICalled` and `exceptionThrown` (drop those revoked by `exceptionRevoked`); no
`Log.enable`; **never** `discardConsoleEntries`; the tab's own session only (OOPIFs excluded, C5). Before URLs and stacks
are stripped, the reducer drops entries whose source URL is blocked, own-extension or `file:`, and entries timestamped
before the latest arm (messages from a disarmed period replay, C1). `exceptionThrown`'s `description` is cut at its
first stack line (F8). `text` ≤ 2 000 characters, ≤ 200 entries. A `chrome.debugger.onEvent` listener is added (none
exists, F7) as a top-level listener in `sw.ts` feeding a per-call collector. **Why:** m1 C1–C8; F7, F8, G-7.
**Instead of:** C2; auto-attach to frames. **Revisit if:** the user wants frame messages. **By:** Claude (proposed,
contract-level, safety, for user review)

### 2026-10-27 · Step 12 Stage 0: the class of `consoleMessages`, weighed with C8
**Decided (for user review):** recommended class `tab`: the JavaScript switch promises no agent-supplied script runs,
and C8's one getter is the page's own code, which a human's open DevTools console runs too. Conservative alternative:
class `evaluate` (refused while JavaScript is off), with the option label saying so. Until the user rules, S3a builds
class `tab` only if the user agrees; else `evaluate`. **Why:** m1 C8; G-8. **Revisit if:** the user reads the switch
as "no page code at all". **By:** Claude (proposed, contract-level, safety, for user review)

### 2026-10-27 · Step 12 Stage 0: the keeper's lifecycle, amended by the measurements
**Decided:** 0.6 plus: the keeper's live sessions are registered in `debuggerSessions` while kept, idle or not (F3);
detach on a `storage.onChanged` safety change that blocks a kept tab (F4, G-11); a **start-up sweep** that calls
`chrome.debugger.detach` on **every** `attached: true` tab target of `chrome.debugger.getTargets()` and ignores the
"not attached" error (m2 D4c; 0.6's "do not survive" amended). The sweep cannot filter to "attached by this
extension": in D4c this extension's own held session read `attached: true` with no `extensionId`
(`stage0-m2-D.txt:43-49`), and `TargetInfo.extensionId` names the target, not the attacher (chrome.debugger API
reference, TargetInfo; verifier V-1). Not measured, so named for a Run 19 or scratch row before S4b ships: a detach of
a tab another client (DevTools, another extension) holds — its error text and that it has no side effect. S4a's sweep
test uses a fake `getTargets` with no `extensionId`. Drop a session after a call timeout or a failed clean-up (G-10);
every feature switches its own domain state off (`Runtime`, `Page`, `Debugger`, interception, focus emulation) before
its call ends (F5). **Overlapping calls keep today's answer:** while one CDP call is in flight on a tab, a second
answers `DEBUGGER_DEVTOOLS` as today; only calls that do not overlap reuse the kept session (F5, G-13). The keeper
never attaches twice, so `Another debugger…` on a held tab while no call runs is the keeper's own state, never mapped
to `DEBUGGER_DEVTOOLS` (m2 D5). KEEP-2 judges the detach time, not the banner's end (G-14; banner ≈ detach + 5.1 s, m2
D2). **Why:** m2 D2–D5; F3–F6; G-10–G-14; V-1, V-2. **Instead of (for user review):** per-tab serialisation, where a
second overlapping call waits instead of failing — friendlier, but it changes an existing tool's answer on a call
without new parameters, which the phase doc's STOP rule ("an existing tool answering differently …") forbids without
the user's ruling. **Revisit if:** a culled (not CDP-stopped) worker loses the session; the user prefers
serialisation. **By:** Claude (proposed, contract-level for the overlap answer, for user review)

### 2026-10-27 · Step 12 Stage 0: the DevTools gotcha is re-measured live before it changes
**Decided:** `extension/CLAUDE.md`'s "DevTools open → attach throws" bullet stays until Run 19 measures it in the real
profile (m2 D3c ran with `--enable-unsafe-extension-debugging`, its no-flag control NOT MEASURED). KEEP-4 and A's
UP-DEVT need a DevTools-attach helper that is proven (G-22). **By:** Claude (proposed)

### 2026-10-27 · Step 12 Stage 0: E on the call's own session, with `Page.enable`
**Decided:** m2's proposal (`Stage0-measurer2.md` §5) plus auditor 2's: E does not depend on D (E2); `Page.enable`
before the interception; the click is (i) `Runtime.evaluate {userGesture:true}` (E2; (ii) is ruled out on a
background tab, E6, so E does not depend on G2, G-17 closed); an event with no `backendNodeId` is refused; the
`multiple` check runs on the event's `mode`, and a refusal after the click ends the chooser by interception off and
detach (E8; not `files:[]`); one chooser call per tab at a time; a shared prologue (params, the Upload folders rule,
the file-URL check, the missing-file check) both upload paths call, so E5.2 tests the prologue, not the input rules
(F9). **JavaScript off:** the auditors disagree (auditor 1: class `upload`, switch not applied; auditor 2 and #325:
`JS_DISABLED`); the conservative reading, `JS_DISABLED` on `chooser: true` by a params rule in the gate (`safety.ts` in
S5a's lane; three docs amended), holds until the user rules. **By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · Step 12 Stage 0: G1 waits for G12-2
**Decided:** the phase doc's fallback: G1 stays a documented limit; the question "add the `webNavigation` permission?"
goes to the user as G12-2 (m2 G1). S6-G1 below is a draft for a yes. `Page.windowOpen` is not used (no tab id, needs a
session and its banner on every held tab). **By:** Claude (proposed)

### 2026-10-27 · Step 12 Stage 0: G2 by the daemon, one request, 500 ms pause
**Decided:** auditor 2's (ii-a) (`stage0-audit-2.md` §2): for `click`/`type`/`pressKey` with `trusted: true` and no
`focusEmulation`, the daemon takes the visibility lock, forwards `focusTab`, re-checks the caller and the lease,
forwards the input, replies, then holds the lock for the settle pause before releasing. No wire, extension, SDK or MCP
change; an old extension works. The pause stays **500 ms** (#321; m2 G2 measures ~10 ms needed, so 500 is supported
with margin). New answer under contention: `LOCK_TIMEOUT {holder}` for trusted inputs (G-19), listed in the spec
§10 note. **Instead of:** (i) one wire call with `focus` (a silent no-op on an old extension); (ii-b) a hold token.
**By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · Step 12 Stage 0: plan-side corrections (mechanical and design-local)
Dated notes in the phase doc for F1–F20 and G-1–G-25 tagged plan-side (`stage0-audit.md` §4–§5, `stage0-audit-2.md`
§5), among them: both method tables in S3a's one commit plus a cross-table test (F2, G-9); lanes gain
`sdk/src/evaluate-save.ts`, `sdk/src/client.ts`, `extension/src/debugger.ts` (F10); `result.ts` → `serialize.ts`
(F19); no `evaluate` guard exists in `protocol.ts` yet (F12); the #214 baseline is a written-out delta in
`s2-focus-first.test.ts`, not a re-pin (F13); S8.1's doc-check never fails (F14: add a count mismatch exit, or check by
hand); R18-BANNER-CTL's negative leg waits ≥ 15 s (G-21); 0.3 gains a DevTools-attach helper fix and G-23's four items;
"legs that send no call" → "legs that attach no debugger" (G-24); the exit-check rewrites of `stage0-audit.md` §5
(B2.1, B2.3, C3.1, C3.3, C3.4, D4.2, E5.2, S8.1). **By:** Claude (proposed)

## 6. Proposed stage split (S1–S8; sizes from `stage0-audit-2.md` §4 plus Stage 0's additions, estimates)

| Slice | What | Lines (code / tests) | Risk | Cap |
|---|---|---|---|---|
| S1-sheet | §4.26 rows of 0.3 with G-21–G-24 | docs ~250 | low (Sonnet) | 400 |
| S1-helpers-a | per-slice console capture, banner-sampler control, DevTools-attach helper | ~200 / 200 | low | 450 |
| S1-helpers-b | UP-RACE-A, UP-OPT (+ stale `$S11Warning`), aggregator fixes, G-23 items | ~150 / 150 | low | 350 |
| S1-live, S1-record | Run 18 | — | standard (runner Sonnet) | — |
| S2a | shared guard; extension (i′) call form for evaluate/save/`asRef`; the pause-terminate bound; hello `features` | ~170 / 250 | standard | 450 |
| S2b | daemon `VERSION` on `args` without the feature; SDK options (`evaluate`, `evaluateRef`, `evaluateToFile`, `evaluate-save.ts`); MCP schema; #214 delta; setup row | ~90 / 160 | standard | 300 |
| S3a | shared entry type; pure reducer (filters before stripping); `onEvent` collector; handler; **both** method tables + cross-table test | ~200 / 220 | standard | 450 |
| S3b | SDK method + formatter; MCP tool; #214 delta; setup | ~75 / 110 | standard | 250 |
| S4a | pure keeper (refcount, idle 5 s, an overlapping call answers `DEBUGGER_DEVTOOLS` as today with no second attach (test: a fake counts one attach), detach reasons, re-check per use, the sweep's logic) | ~170 / 260 | standard | 450 |
| S4b | wiring: `debugger.ts`, `safety-debugger.ts`, `sw.ts` (storage edit, start-up sweep, existing listeners) | ~110 / 90 | standard | 250 |
| S5a | extension: shared prologue, chooser step list (`Page.enable` → intercept → click → event → mode check → set files → off/detach on every path), gate params rule | ~230 / 290 | standard | 550 |
| S5b | shared param, SDK option, MCP schema, #214 delta, setup | ~40 / 60 | standard | 150 |
| S6-G1 | **not run until G12-2 rules yes** (draft below) | ~110 / 195 | standard | 350 |
| S6-G2 | draft below | ~65 / 170 | standard | 300 |
| S7-sheet / -helpers / -live / -record | Run 19 (§4.27) with the G2 rows from S6-G2's as-built | — | prep low, live standard | as S1 |
| S8 | docs | — | low | — |

**Caps against the phase doc (V-4).** Four caps exceed the phase doc's stage limits, which outrank `agent-rules.md` §7: S2a 450 (S2 ≤ ~400), S3a 450 (S3 ≤ ~400 each), S5a 550 (S5 ≤ ~500), S6-G1 350 (S6 ≤ ~300 each). Proposed: a dated phase-doc note by the session agent raising those four limits to the caps above (each under §7's ~600, the extra from Stage 0's added work: the pause-terminate bound, the cross-table test, the shared prologue and cancel paths, the late-opener case); without that note each slice is cut to its phase-doc limit and the remainder becomes the next slice.

Order: Stage 0 → S1 (sheet, helpers a/b beside S2a, file-disjoint) → live → record → S2a → S2b → S3a → S3b → S4a →
S4b → S5a → S5b → S6-G2 (→ S6-G1 if G12-2 yes) → S7 → S8. E does not wait on D or G2 (m2 E2, E6).

**S6-G1 draft (only on a G12-2 yes).** Lane: `extension/manifest.json` (`webNavigation`), `extension/src/tab-events.ts`,
`sw.ts` (one top-level `webNavigation.onCreatedNavigationTarget` listener), `shared/src/protocol.ts` (`tabCreated`
gains optional `sourceTabId`, or a new `tabOpener` event if the event must come late), `daemon/src/intercept.ts` (the
opener rule), `extension/test/manifest.test.ts`, their tests, spec §10 note first. Failing tests: the extension joins
`onCreatedNavigationTarget` to `tabs.onCreated` by `tabId` with a bounded wait; the daemon grants the opener's holder
the lease from `sourceTabId` when present, else today's `openerTabId` rule; a late opener after the tab was already
unleased; a `sourceTabId` of a tab another client holds grants to that client only; the manifest test pins the new
permission. Exit checks: **G6.1** the join and the lease rule tests pass and fail on the pre-slice code; **G6.2** the
manifest diff is exactly `webNavigation` and its decision is cited; **G6.3** no log site added (allowlist 54);
**G6.4** a Run 19 row R19-POP-BG: a background opener's popup is leased to the opener's holder.

**S6-G2 draft.** Lane: `daemon/src/{methods,intercept}.ts`, `daemon/test/`, the spec §10/§6.4 note first. No wire,
extension, SDK or MCP change (`git diff -- shared extension sdk mcp` empty). Failing tests: a trusted `click`/`type`/
`pressKey` takes the lock once and forwards `focusTab` then the input under it (a fake extension records order and
lock holder); a screenshot queued during the hold runs only after the pause (fake clock); the pause runs after an
input error too; a client disconnect mid-hold releases at once and the input is not forwarded; the lease re-check
between the forwards; `focusEmulation: true` and untrusted inputs take no lock (unchanged); one deadline covers wait,
both forwards and the pause, with the reply sent before the pause. Exit checks: **G6.5** a separate predicate `trustedFocus(method, p)` with its own
table test (true only for `click`/`type`/`pressKey` with `trusted: true` and no `focusEmulation`), `takesLock`
unchanged; the order and hold tests pass and fail on the pre-slice code (a mutant releasing between focus and input is
red; a mutant folding trusted inputs into `takesLock` is red by `git diff` of `takesLock` and by new rows `takesLock("click"|"type"|"pressKey", {trusted: true}) === false` in
the existing lock-class table, V-5, N-3); **G6.6** every existing daemon
lock and trusted-input test passes unchanged; **G6.7** `LOCK_TIMEOUT` for a trusted input under contention is in the
spec note and a test; **G6.8** Run 19 rows R19-G2-1 (a screenshot by another client waits out the hold, timed) and
R19-G2-2 (typed text complete under a competing capture).

## 7. Findings

- Ranked findings: `stage0-audit.md` §4 (F1–F20: 0 CRITICAL, 11 MAJOR, 7 MINOR, 2 NIT) and `stage0-audit-2.md` §5
  (G-1–G-25: 12 MAJOR, 12 MINOR, 1 NIT); code-side: F3 (with a plan note), G-9 (the daemon tables unlinked), G-20 (the
  screenshot restore runs after its reply).
- A's defect list re-derived with record and helper lines (`stage0-audit-2.md` §3): all of 0.3 confirmed; the record's
  UP-OPT line is `s11-win.ps1:307`, not `:306`; four record items 0.3 misses (G-23); the DevTools helper defect unfixed
  (G-22).
- Candidate `CLAUDE.md` bullets (measured, Chrome 156.0.8078.48, 2026-10-27, scratch profile): `extension/src/evaluate/`
  — `callFunctionOn {value}` mangles JSON; `returnByValue` sorts keys (today's `value` too); no timeout on
  `callFunctionOn`, `terminateExecution` refused, pause + `terminateOnResume` works; a wedged renderer is freed only by
  a cross-site or `about:blank` navigation. `extension/` — a session survives a worker stop; the same-extension double
  attach gives the "Another debugger" text; the banner goes ~5.1 s after a detach; `Page.fileChooserOpened` needs
  `Page.enable`; a background tab's chooser is cancelled at once without interception; `discardConsoleEntries` empties
  the store; the replay bound is 1000. Code note (not a bullet): `isExecutionTerminated` does not match the
  `Runtime.evaluate {timeout}` answer `"Internal error"`; `raceTimeout` covers it (code reading).

## 8. Handoff

No process of Stage 0 remains (each measurer's §7 / Handoff; their scratch roots deleted). Port 9234 untouched; the
daemon not started. For the user: the contract-level proposals of §5 and **G12-2** (the `webNavigation` permission for
G1). The session agent writes the phase doc's dated notes and decisions.md entries. Commit: *(hash after the
committer)*.
