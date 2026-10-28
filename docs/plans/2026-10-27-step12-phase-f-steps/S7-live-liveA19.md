# S7-live liveA19: Run 19 slice A, live (step report)

Step agent: Claude Opus 5.5, medium. Runner: Claude Sonnet 5.5, medium (`S7-live-runner-liveA19-att1.md`). Ledger:
`S7-live.ledger.md`. No fixer or verifier ran: no fix round was spent.

## 1. Verdict
**ESCALATE.** Attempt 1 stopped in R19-ARGS-1 on the pre-registered STOP `existing-tool-changed`, the second row after
R19-0. The stop is real by the sheet's rule. The step agent's diagnosis is that the rule's expected value is wrong for
the real product (§6). Changing the judge would edit a STOP's expected text after its run, which only the session
agent can rule on (agent-rules §2, §3 item 1). No state change had run, so there was nothing to restore. Nothing is
left running.

## 2. Outputs
- **HEAD and build:** `41690ed`. The runner ran `npm run build` from a clean tree, and the tree stayed clean after it.
  The out dir is `$TEMP/bridge-e2e/s19-live/a1`, outside the repo. Exit code 2.
- **Files in the steps dir:**
  - `S7-live-record-liveA19.txt`, written by the runner script. It has 56 lines; the first is `MANIFEST
    dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`.
  - `S7-live-evidence-liveA19-att1.txt`, the stdout filtered by the runner, with paths redacted.
  - `S7-live-runner-liveA19-att1.md` and `S7-live.ledger.md`.
  - No console file. R19-LOGS never ran, so no console evidence copy was written.
- **Scans** (`recipes/s11b.ts scan18 --what other --file`, run by the runner): the record and the evidence file both
  print `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`.

### Rows as printed
- `ROW RD-0 (a) PASS`, `ROW RULES PASS: RULES 0`, `ROW RD-0 (c) PASS`, `ROW RD-0 (d) PASS` and `ROW R17B-0 (e)(f)
  PASS`, once in preflight and once in R19-0.
- `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`
- `ROW R19-0 PASS slice=A`
- `ROW R19-BANNER-CTL PASS slice=A`: `BANNERCTL liveA19 leg=neg idle-ms=20002 polls=16 banner=none`; `leg=pos answer=ok
  polls=16 banner=seen`.
- R19-ARGS-1 printed no ROW line. Its lines were:
  - SDK: `v1-sdk ok value-equal=no json-equal=yes`, v2–v5 `ok value-equal=yes json-equal=yes`; `total table=5
    value-equal=4 json-equal=5 via=sdk`.
  - MCP: v1–v5 all `ERROR value-equal=no json-equal=no`; `total table=5 value-equal=0 json-equal=0 via=mcp`.
  - `ANSWER R19-ARGS-1 control-1 ok`, `ANSWER R19-ARGS-1 control-2 ok`.
- Not reached: R19-ARGS-2 through R19-CON-FILE, R19-RESTORE and R19-LOGS. No `CHECK rows` line was printed.

### STOP and return (R7.6)
`STOPWHY existing-tool-changed` → `STOP: R19-ARGS-1 stopped (existing-tool-changed)` → `RETURN 1
after-stop=existing-tool-changed restored=n/a readback=n/a` → `STOP: the wave ended (an exception in block r19-args-1
(RuntimeException: stop existing-tool-changed))`. Each STOP is matched to that RETURN, and the runner returned.

### Restore
**Not run** (`restored=n/a`). R19-0 found the slice armed with JavaScript on, and nothing ran after it that changes
state: liveA19's first state change is R19-ARGS-3's JavaScript off. There was therefore no R19-RESTORE read-back by
count and hash in this attempt, and no `DIALOGS` line. The script closed its four windows and stopped its 8081 server
on the STOP. After that, `-Block teardown` with `S11_OUT=a1` exited 0 (`CHECK clean PASS`).

## 3. Verifier verdict
None: no fix round ran.

## 4. Deviations
- **A diagnostic probe the sheet does not have.** It is not a row and judges nothing. It was one SDK script, run by the
  step agent. It used its own fixture server on 127.0.0.1:8081 and its own tab
  (`e2e-playground.html?s12=probe-c2`), and closed both after. It made two raw `evaluate` calls without `args` and
  printed only the answer's kind and keys:
  - `PROBE raw expr=decl kind=undefined keys=description,kind,truncated` for `function f() {}`
  - `PROBE raw expr=paren kind=function keys=description,kind,truncated` for `(function f() {})`
  The script was in the scratchpad and is not committed.

## 5. Proposed decisions (for the session agent)
### 2026-10-29 · R19-ARGS-1 control-2: the expected `kind: "function"` was taken from a fake extension
**Decided (proposed):** a dated §4.27 note before attempt 2. Control-2's "today's answer" is the real product's answer
to the raw call, `kind: "undefined"`. A function declaration in REPL mode completes with `undefined`, and the live probe
measured exactly that. The judge would change to `kind === "undefined"`. The sheet's source was
`mcp/test/s12-args-cross.test.ts:178`, whose fake extension echoes `{kind:"function"}`. The alternative is to keep the
call and change its expression to `(function f() {})`, which measured `kind=function`. That edits the step text instead
of the expected value.
**Why:** the STOP's purpose is "a call without `args` is byte for byte as before". The no-`args` path passes the
expression unchanged under `replMode` (`extension/src/evaluate/wrap.ts`, `save.ts:101`). The old-build answer was not
measured. It is argued from the code, and liveD19's old build could measure it.
**Instead of:** a re-run, which measures the same STOP, or a quiet judge edit, which is forbidden.
**Revisit if:** the session agent wants the old build's answer measured first.
**By:** Claude (proposed; for the session agent, since a STOP's expected text changes after its run).

### 2026-10-29 · The scripted MCP actor waits for its link before the first tool call (helper fix, fix round 1)
**Decided (proposed):** in `recipes/s12-r19-a.ts`, the MCP client retries (or polls `browser_status`) while a tool
answers `connecting to the bridge daemon…` (`mcp/src/link.ts:14`, `CONNECTING_REASON`), within a bound such as 15 s,
and a failure is printed as such. `handleOf` returning `""` becomes a thrown helper error instead of a call with an
empty handle. **Why:** `actors-liveA19.jsonl` shows the first `browser_new_tab` answered with the connecting text, and
all ten `browser_evaluate` calls answered `unknown tab handle  — call listTabs`. The same pattern appears at lines 170,
300, 314, 330, 353 and 399, so CON-MCP, CON-CAP and ARGS-3 would fail the same way. This is recipes-only and moves no
pass rule. **By:** Claude (proposed; one fix round with an Opus verifier, together with the ruling above).

## 6. Findings
- **The STOP's cause:** `recipes/s12-r19-a.ts:185` stops when `c2.v.kind !== "function"`. The live answer is `undefined`
  for the declaration, so the STOP fires on any build. That makes it a false STOP of the product by the probe, but still
  a STOP by the rule.
- **The MCP leg's five `ERROR`s are a helper defect, not a product result** (§5).
- **R19-ARGS-1 v1-sdk `value-equal=no json-equal=yes`** is recorded here, not judged. The row printed no verdict. With
  `json-equal=yes`, `eqJson` of the returned value differs from the JSON string the page itself built. One possible
  cause is a CDP by-value mangle of the returned object (Stage0.md:63 names key sorting and dropped `null`
  properties). That is a possible product finding for R19-ARGS-1 once it runs to a verdict.
- **New runtime fact for `recipes/CLAUDE.md`** (proposed): a scripted stdio MCP client's first tool call, made right
  after spawn, answers `connecting to the bridge daemon…` and does nothing. Measured in Run 19 liveA19 att1 on
  2026-10-28.

## 7. Handoff
- Nothing is running. The daemon (PID 38440, `daemon/dist/index.js`, spawned by the wave) was stopped with
  `npx tsx recipes/s9.ts daemon-shutdown`. At 22:12Z nothing listened on 9234 or 8080–8089. The loaded extension is
  the `41690ed` build.
- Budget: liveA19 has used 1 of 3 attempts; fix rounds used are 0 of 3. Attempt 2 needs a fresh `S11_OUT`, for example
  `$TEMP/bridge-e2e/s19-live/a2`, and `-Att 2`, after the ruling and the helper fix.
- Needs the user's keyboard: nothing.
