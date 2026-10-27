Part 2 (decision attacks, A's defects, G2, sizes): stage0-audit-2.md

# Step 12 Stage 0 audit, part 1: the phase doc against the code

Auditor 1 of 2, Claude Opus 5.5, effort medium, read-only, 2026-10-27. Start commit `0ba82f6`; the tree had only the
steps dir's uncommitted docs (`journal.md` modified, `env-checker.md` new). Chrome not touched, daemon not started,
port 9234 not used. Evidence: `stage0-a1-files.txt` (cited paths), `stage0-a1-counts.txt`, `stage0-a1-npmtest.txt`,
`stage0-a1-contracts.txt`, `stage0-a1-code.txt` (the lines each finding quotes).

## 1. Counts (lens b), recomputed at `0ba82f6`

| What | Command | Result | Phase doc |
|---|---|---|---|
| MCP tools | `grep -c "reg\.tool(" mcp/src/tools/registry.ts`; `grep -oE '"browser_[a-z_]+"' … \| sort -u \| wc -l` | 24; 24 | 24 ✓ |
| Router methods | `grep -oE 'router\.on\("[A-Za-z.]+"' extension/src/sw.ts \| sort -u \| wc -l` | 27 (27 lines, 27 unique) | 27 ✓ |
| `METHOD_CLASSES` keys | entries of `extension/src/safety.ts:66-92` | 27 | 27 ✓ |
| Daemon `TAB_METHODS` | the set in `daemon/src/methods.ts` | 20 | (not stated) |
| Error codes | the `*_CODES` arrays of `shared/src/codes.ts` | DAEMON 9 + EXTENSION 17 = **26 on the wire**, + SDK 1 (`NO_CURSOR`) = **27** | 27 (26) ✓ |
| `npm test` | `npm test` (background, 900 s bound) | `Test Files 191 passed (191)`, `Tests 4665 passed (4665)`, exit 0 | 4665 / 191 (root CLAUDE.md) ✓ |
| Log-scan allowlist | `grep -c '^  { file:' extension/test/log-allowlist.ts` | 54 | 54 ✓ |
| doc-check | `node scripts/doc-check.mjs` | `tools: 24 · router methods: 27 · codes: 27`; exit 0 | ✓ |
| Schema baseline | `tool-schemas-f45e3bf.json` length | **23** tools (the test adds `browser_upload_file` as a written-out delta, `expect(all).toHaveLength(24)`) | see F13 |

After the scope: one tool (`browser_console_messages`) and one router method (`consoleMessages`), no code, gives **25,
28, 27 (26)**: consistent with the Outcome line. G2's mechanism (one wire call or the daemon holding the lock) could
add a parameter but no method; if Stage 0 picks a new wire method, the 28 changes. Part 2 owns G2.

## 2. Contracts on port 0 (item 6)

None of the files below names 9234 (`grep -rn 9234` over the socket tests: empty); the socket tests bind
`port: 0` (e.g. `extension/test/log-sentinel.test.ts:239`). Results, `stage0-a1-contracts.txt`:

- **Step 9** (the command of Step 11b's `stage0-audit.md` §2, unchanged): `Test Files 32 passed (32)` ·
  `Tests 1071 passed (1071)`, exit 0. (Step 11b's Stage 0 read 1059; these files have gained tests since.)
- **Step 11** (same source): `Test Files 16 passed (16)` · `Tests 501 passed (501)`, exit 0 (was 499).
- **Step 11b**, derived: the `*.test.ts` files added or changed by the code commits the § As built blocks name
  (S0F-a `62eee7e`, S0F-b `0202888`, S1 `a675ab7`, S2 `e7bb081`, S3a `c9db926`, S3b `7580d59`, S6 `db3f82e`;
  `git show --stat <c> -- '*/test/*.test.ts'`), without `recipes/test/s11-rules.test.ts` (a wave rule, not a product
  contract): `npx vitest run extension/test/{s0f-file-tabs,s0f-home-folders,s0f-upload-exists,safety-dnr,
  safety-dnr-keeper,s3a-dnr-wiring,s3b-download-hop,s6-newtab-blank,manifest,log-sentinel,options-model,s2-upload-gate,
  s3-upload-handler,s3-options-upload}.test.ts mcp/test/s2-focus-first.test.ts` → `Test Files 15 passed (15)` ·
  `Tests 504 passed (504)`, exit 0. Later stages should reuse this list as Step 11b's set.

## 3. Cited files and functions (lens a)

Every cited path exists (`stage0-a1-files.txt`): `extension/src/evaluate/result.ts`, `sdk/src/tab.ts`,
`mcp/test/fixtures/tool-schemas-f45e3bf.json`, `extension/test/log-allowlist.ts`, `extension/test/log-sentinel.test.ts`,
`extension/test/safety-gate.test.ts`, `extension/src/{debugger,safety-debugger,sw,safety,upload-files}.ts`,
`extension/src/handlers/{history,upload,evaluate,evaluate-save}.ts`, `extension/src/content/upload-target.ts`,
`shared/src/protocol.ts`, `daemon/src/methods.ts`, `mcp/src/tools/registry.ts`, `sdk/src/{upload,tab}.ts`,
`sdk/src/format/`, `scripts/doc-check.mjs`. The claims, each read:

| Claim | Holds? | Where |
|---|---|---|
| `debuggerSessions`, `detachAll` at a disarm | yes | `debugger.ts:43`; `sw.ts:59` (`onDisarm`); `safety-debugger.ts` `detachAll` |
| `runWithDebugger` re-checks the gate before the attach | yes, per call (`guard.effect()` before `sessions.begin`) | `safety-debugger.ts` |
| D: "the keeper's sessions are in `debuggerSessions`" | **no**: a session is recorded only from `begin` to `end` inside one call | F3 |
| `onDetach` line logs a tab id and a reason only | yes | `sw.ts:348-349` |
| an existing top-level `tabs.onUpdated` listener | yes; today it only feeds `tabInfo.update` | `sw.ts:213-215`; F4 |
| `evaluateRef`'s old-extension mapping is `VERSION` | **no**: `BAD_PARAMS` | `sdk/src/tab.ts:342-352`; F1 |
| "the existing serialiser (`evaluate/result.ts`)" | partly: the serialiser is `evaluate/serialize.ts` (`SERIALIZER_SRC`); `result.ts` shapes CDP results | F19 |
| a shared guard for `evaluate` in `protocol.ts` | **no** such guard; `isUploadFilesParams` exists but no product code calls it | F12 |
| `safety-gate.test.ts`'s router scan | yes: `routerMethodNames`, `expect(names).toHaveLength(27)` (`:75`) | |
| the daemon's table test | yes: `daemon/test/methods.test.ts:11` and `safety-surface.test.ts` pin the lists element for element | F2 |
| `focusFirst` | yes: `sdk/src/policy.ts:40`, used at `sdk/src/tab.ts:186`; the MCP calls `focusTab` itself | |
| `handlers/history.ts` holds the DNR rules for `back`/`forward` | yes (`HISTORY_SETTLE_MS`, `settleWait`) | |
| `upload-files.ts`, `content/upload-target.ts` (`uploadInputOf`, `checkUploadInput`) | yes | F9 |
| the #214 baseline "re-pinned" | the fixture is never regenerated; each re-baseline is a written-out delta in `s2-focus-first.test.ts` | F13 |
| Lanes S2–S5 | the paths exist; S2 and S5 miss files the work needs | F10 |

## 4. Findings, ranked

No CRITICAL. "Plan-side" = needs a dated note in the phase doc (or a decision); "code-side" = binds the build.

**F1 · MAJOR · plan-side (contract) — B's old-extension `VERSION` mapping has no precedent and cannot discriminate.**
0.4 says the SDK maps an old extension's `kind: "function"` answer to `VERSION` "as `evaluateRef` does for a missing
ref"; `evaluateRef` throws `BAD_PARAMS` (`sdk/src/tab.ts:344-347`). And `kind: "function"` is not a sign of an old
extension: on a new one `"(a) => () => a"` legitimately returns a function; on an old one `"function f(a){…}"` (a
declaration under `replMode`) completes as `undefined`, `evaluateToFile` gets `evaluateSaveStart`'s own `BAD_PARAMS`
refusal for a function value, and `evaluateRef` gets `BAD_PARAMS "not an Element"`. B2.3 passes on a build that
misreports a real function result as `VERSION`. *Fix:* the new extension marks the reply (e.g. an `EvalEnvelope` and
`evaluateSaveStart` field saying `args` was applied); the SDK maps its absence, with `args` sent, to `VERSION` on all
three methods. Contract change to `EvalEnvelope`: a decision before S2.

**F2 · MAJOR · plan-side — 0.10's "both tables in the same commit" contradicts S3's split, and no test links the
tables.** 0.10 requires `METHOD_CLASSES` and `daemon/src/methods.ts` in one commit; S3a's lane has `safety.ts`, S3b's
has `methods.ts`. Worse, a missing daemon entry is invisible: `classify` forwards any unlisted method that carries `tab`
as a tab method (`methods.ts`: `return hasTab(params) ? "tab" : "untargeted"`), so `consoleMessages` works and every
test stays green without its daemon line. *Fix:* move the `methods.ts` line into S3a (or say the two commits are one
stage's), and add a cross-package test: every `METHOD_CLASSES` key is in `TAB_METHODS ∪ FREE_METHODS ∪ {newTab,
closeTab, listTabs}` and vice versa; make C3.1 cite it.

**F3 · MAJOR · code-side, with a plan note — an idle kept session is not in `debuggerSessions`.** `runWithDebugger`
calls `sessions.begin` before its attach and `sessions.end` in its `finally`; an idle session (count 0, waiting out the
5 s) has no record, so `detachAll` at a disarm does not detach it, which is a STOP ("a debugger session attached after
a disarm"). 0.6 states the opposite as a fact. *Fix:* the keeper registers its sessions for their whole life
(attach → detach), and D4.2 names a test: an idle session at a disarm is detached and the next call refused.

**F4 · MAJOR · plan-side — D misses the block-list edit.** 0.6 detaches on "the tab's page becoming blocked … seen in
the existing `tabs.onUpdated` listener". A block-list edit that blocks the page a kept session is on fires no
`onUpdated`; the session stays up to 5 s on a blocked page (a STOP rule). *Fix:* the keeper also sweeps from the
existing `storage.onChanged` listeners (`sw.ts:370`, `:412`; no new listener) and on a state read that fails; add to
D4.2.

**F5 · MAJOR · plan-side — "Answers do not change" is false for concurrent calls, and session state bleeds.** Today
two CDP calls on one tab overlap into `DEBUGGER_DEVTOOLS` for the second ("Another debugger is already attached",
`debugger-errors.ts:48-52`); with a shared session both run. Inside one shared session one call's state reaches the
other: focus emulation (`trusted-input.ts`), E's interception, C's `Runtime.enable`, `uploadByMark`'s isolated worlds,
`evaluateInPage`'s "no `Runtime.enable` … nothing to tear down" premise (`debugger.ts:161`). The STOP rule "an existing
tool answering differently on a call without the new parameters" would fire on the first. *Fix:* either run CDP calls
on one tab one at a time through the keeper (a per-tab queue, today's answers kept apart from the overlap) or record
the overlap change as a decision; every session-state command is reset inside its call; a test per state.

**F6 · MAJOR · plan-side — a worker restart with a session attached is unmeasured.** 0.6 says "sessions do not survive
it"; Stage 0's measurement list does not include it. If Chrome keeps the extension's attach across a worker restart, a
kept tab answers `DEBUGGER_DEVTOOLS` until the human closes the banner, and the banner stays. *Fix:* add to the
measurers' list; the keeper sweeps its own attaches at start-up (`chrome.debugger.getTargets()`, `attached` and this
extension), behind no top-level `await`.

**F7 · MAJOR · plan-side — C and E need `chrome.debugger.onEvent`, which no code has.** `grep -rn debugger.onEvent
extension/src` is empty. C1 reads `Runtime.consoleAPICalled`/`exceptionThrown`, E waits for `Page.fileChooserOpened`;
S3a's lane allows one `router.on` line in `sw.ts`, S5's has no `sw.ts`, S4b forbids a new top-level listener. *Fix:*
state the choice: a listener added and removed inside the call (no top-level change; events filtered by `tabId`), or one
top-level `onEvent` line in S3a's lane. Either way a test that the listener is gone after every path.

**F8 · MAJOR · plan-side (safety) — C's entries can carry what the gate otherwise hides.** (a) An uncaught error's
`exceptionDetails.exception.description` is its stack, with URLs: "no stack" needs the field named
(`exceptionDetails.text` and the exception's class and first line only). (b) `Runtime.enable` replays messages logged
while the bridge was disarmed, where the network log "records nothing while disarmed". (c) A same-process frame of a
blocked host logs into the tab's main target. (d) Turning a `RemoteObject` argument into text by
`Runtime.callFunctionOn` runs page-side code; then class `tab` (no JavaScript switch) no longer fits. *Fix:* 0.5 states
the text source (`value`, `description` of primitives, `preview` only; no `callFunctionOn`), and a decision on (b)
(drop entries whose `ts` falls in a disarmed window, or accept as `evaluate` would) and (c) (accepted, like F16 of
Step 11b for screenshots, or refused).

**F9 · MAJOR · plan-side — E's JavaScript reading and E5.2 cannot be built as written.** #325's conservative reading
refuses the chooser path `JS_DISABLED`, but class `upload` ignores the switch (`safety.ts:46-47`) and classes are per
method, so it needs a parameter-aware gate in `safety.ts`, outside S5's lane. My weighing: the click is a bridge-written
`click()`, which a class-`tab` `click` already does with JavaScript off, and today's upload already runs bridge-written
isolated-world code with it off, so class `upload` without the switch is consistent; if the conservative reading
stays, add `safety.ts` and a `GatedRouter` test to S5. E5.2 ("the upload rules identical") cannot hold for the input
checks (`uploadInputOf`, `checkUploadInput`: one file input, not disabled, not a directory, `multiple` against the
path count), since the input is known only from the event. *Fix:* split E5.2 into the gate rules (folders, file-URL,
missing file, `paths` caps: the same tests run on both paths) and the chooser's own input rules (the event's `mode`
against the path count, the node's `webkitdirectory` and `disabled` by `DOM.describeNode`), each tested.

**F10 · MAJOR · plan-side — lanes miss files the work needs.** S2: `sdk/src/evaluate-save.ts` builds
`evaluateSaveStart`'s params (`:165-166`), and `sdk/src/client.ts` mirrors `evaluate`/`evaluateRef`/`evaluateToFile`
with fixed option types (`:455-466`). S5: the upload's CDP leg `uploadByMark` is in `extension/src/debugger.ts` (`:278`),
not in `upload-files.ts`; `sdk/src/client.ts` mirrors `upload`. *Fix:* add them to the lanes (dated note).

**F11 · MAJOR · plan-side — B loses today's timeout on synchronous code and may lose the activation.** `evaluateInPage`
passes `timeout: timeoutMs` and `userGesture: true` to `Runtime.evaluate` (`debugger.ts:181-188`); CDP's
`Runtime.callFunctionOn` has no `timeout` parameter (the auditor's reading of the CDP Runtime domain, not looked up
here: the measurers or the S2 builder confirm it), so a `while(true)` in an `args` function answers `TIMEOUT` by the race but
leaves the page hung (today the script is terminated). *Fix:* on the race's loss call `Runtime.terminateExecution`;
pass `userGesture: true` (R17B-ACT-CTL relies on the activation); a fake-CDP test for both and a Stage 0 measurement of
the terminate.

**F12 · MINOR · plan-side — "the shared guard … and the extension check again".** No `evaluate` guard exists in
`shared/src/protocol.ts`, and `isUploadFilesParams` is used only by `shared/test/protocol-step11.test.ts` (grep). The
daemon calls no params guard. *Fix:* say the shared guard is a typed helper the SDK and the extension call, or drop it.

**F13 · MINOR · plan-side — "the #214 baseline re-pinned".** The fixture holds 23 tools and is "never regenerated"
(`mcp/test/tool-schemas.ts:6`); every re-baseline is a dated, written-out delta in `mcp/test/s2-focus-first.test.ts`
(`toHaveLength(24)`, `toHaveLength(23)`). *Fix:* lanes name `s2-focus-first.test.ts` and "a written-out delta under a
recorded decision", not "the fixture"; S3b changes 24 → 25.

**F14 · MINOR · plan-side — S8.1's "`node scripts/doc-check.mjs` passes" cannot fail.** The script never sets an exit
code (`grep -c "process.exit\|exitCode"` = 0; exit 0 with findings). *Fix:* "its output has no section besides `Counts
in the code` and `Test counts stated`, and the counts read 25 · 28 · 27".

**F15 · MINOR · plan-side — "0 occurrences in `daemon.log`".** `log-sentinel.test.ts` captures the daemon's injected
logger (`log: (m) => daemonLog.push(m)`, `:239`), not the file. *Fix:* C3.4 and 0.10 say "in the daemon's logger lines
and every `console.*` line of the test"; `daemon.log` is for R19-LOGS.

**F16 · MINOR · plan-side — E's edges.** A chooser opened after the 5 s bound, with interception off, opens Chrome's
dialog on the human's screen (a STOP); the bound should outlast the click's activation, or the call keeps interception
until it lapses. Also unstated: `Page.enable` (likely needed for the event; the measurers' item), `showOpenFilePicker`
(not a file input, never intercepted: `TIMEOUT`), and an off step that fails with D's session kept (then detach).

**F17 · MINOR · plan-side — C has no clear and no cursor.** If enable replays the store, every call returns the same
old entries again; CDP has `Runtime.discardConsoleEntries`. State whether `consoleMessages` clears, and that
`Runtime.disable` ends the call on a kept session.

**F18 · MINOR · plan-side — D changes what the human sees with no spec note.** §6.5 (the human) describes the banner per
mode; S4 has no "spec note first" item, unlike S2, S3a and S5. Add one.

**F19 · NIT · plan-side.** 0.4 calls `result.ts` the serialiser (it is `serialize.ts`). The mechanism has an in-tree
precedent the doc could cite: `Runtime.callFunctionOn {objectId, functionDeclaration, arguments: [{value: lim}]}` in
`evaluateInPage` (`debugger.ts:211-214`).

**F20 · NIT · plan-side.** R1.6 names `R18-LOGS`, a row id 0.3 does not list (0.3 says "the log scan re-run").

## 5. Exit checks (lens d)

| Check | Decided by | A wrong build shows | Verdict |
|---|---|---|---|
| Every stage | `npm test` counts vs before, per-file removal list; `npm run typecheck`; `npx tsc --noEmit -p recipes/tsconfig*.json`; `npm run build`; `git status --short` | a lower count, a non-zero exit, a tracked change | OK |
| Z.1 | this audit + part 2 + the measurers' reports | — | OK (review check) |
| R1.1 | `git log --format='%h %cI' -- docs/e2e-test-plan.md` before the first evidence file's time | sheet commit after an observation | OK |
| R1.2 | `grep` of the control line in each slice's capture file, quoted in the record | one file for two slices (Run 17b's defect) | OK |
| R1.3–R1.5, R1.7 | the pre-written rules; hash read-backs; ledger vs STOP lines | — | OK |
| R1.6 | the log scan per slice | — | NIT F20: name `R18-LOGS` in 0.3 |
| B2.1 | fake CDP: the value only in `callFunctionOn.arguments[0].value`; no `expression` contains it | a string-built call | **Rewrite:** "a page global `args` is absent" is not seen by a fake CDP; split into that fake-CDP test plus R19-ARGS live |
| B2.2 | `GatedRouter` test, JavaScript off, attach counter 0 | `evaluate {args}` reaching the debugger | OK |
| B2.3 | SDK test with a fake old reply | see F1 | **Rewrite** per F1: the marker's absence → `VERSION` on `evaluate`, `evaluateRef`, `evaluateToFile`; a legit function result stays `kind: "function"` |
| B2.4 | `git log` order; the decision entry | code before the note | OK |
| C3.1 | `safety-gate.test.ts` (27 → 28), `methods.test.ts`, `safety-surface.test.ts` | — | **Rewrite** per F2: cite the cross-table test; today a missing daemon line passes |
| C3.2 | `GatedRouter` tests disarmed, blocked, own, `file:` | — | OK |
| C3.3 | reducer tests | — | Add a case with a stack and URL in `exception.description` (F8) |
| C3.4 | counts; allowlist 54; sentinel | — | Reword per F15; counts "25 tools, 28 router methods, 27 codes (26 on the wire)" |
| D4.1, D4.3 | keeper fakes; mutant | — | OK |
| D4.2 | keeper tests | an idle session left at a disarm or a block-list edit | **Extend** per F3, F4 (and F6's start-up sweep) |
| D4.4 | `git diff <S4 start> -- daemon shared sdk mcp` empty; existing tests unchanged | any diff | OK; but "existing tests unchanged" needs F5's ruling on overlapping calls |
| E5.1 | fake counting the off step on every path | interception left on | OK |
| E5.2 | shared tests | — | **Rewrite** per F9 (gate rules shared; input rules the chooser's own) |
| E5.3 | existing upload tests unchanged; log scan | — | OK |
| R7.1–R7.6 | as S1 | — | OK; R7.3's CHOOSE-4 needs the dialog closed by the wave (carried gate) |
| S8.1 | doc-check | — | **Rewrite** per F14: it cannot fail today |

## 6. Blind spots (lens c), ranked

1. D's lifecycle against the gate: idle sessions outside the registry (F3), the block-list edit (F4), the worker
   restart (F6). Each is a STOP if built as written.
2. D's shared session against today's answers: overlap and state bleed (F5).
3. C's text against the gate's hiding rules: stacks, disarmed-window replay, blocked frames, `callFunctionOn` (F8).
4. B's timeout and activation (F11); B's old-extension mapping (F1).
5. The missing `onEvent` listener for C and E (F7); the lanes (F10); the tables' commit (F2).
6. E's JavaScript reading and its input rules (F9); E's late chooser (F16).
7. B with `evaluateSaveStart`/`asRef`: `evaluateToSave` and the `asRef` mark both run through `wrapExpression`
   (`handlers/evaluate-save.ts:60`, `handlers/evaluate.ts:39,54`); with `args` the function form must skip the wrapper
   and `RETURN_RE`, and the `asRef` mark rides the serialiser on the returned `objectId`, so it composes, but no test
   is named for `{args, asRef}` or `{args, saveTo}`: add both to S2's round-trip table.
8. C vs the network log: separate (webRequest vs CDP); only the hiding rules differ (item 3). C vs a kept session:
   F17.
9. doc-check counts tools by `reg.tool(` and methods by `router.on(` (`scripts/doc-check.mjs:81-82`): the new tool
   and method must use those forms or the counts drift silently.

## 7. §4.x numbers (item 5)

`grep -n "^### 4\.\|^## " docs/e2e-test-plan.md`: the last case section is `### 4.25 R17B rows` (line 1682), then `## 5.
Results template` (line 1722); §5's last record is `### Run 17b (S7)` (line 3159), then `## 6. Exit criteria` (line
3234). **Run 18 → §4.26** and `### Run 18` in §5 after Run 17b's record; **Run 19 → §4.27** and `### Run 19`.
