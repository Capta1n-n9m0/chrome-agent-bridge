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

---

# Attempt 2 (2026-10-29; fresh step agent, Claude Opus 5.5, medium)

Fix round 1 (`079a063`; fixer Sonnet `S7-live-fixer.md`, verifier Opus `S7-live-verifier.md` PASS-with-notes) applied
#366: control-2 must answer `ok` and its kind is recorded; ARGS-OLD's raw twin sends `function f() {}`; the scripted MCP
client re-sends on the connecting reply for at most 15 s; an empty tab handle is a `HelperDefect`. Runner: Claude
Sonnet 5.5, medium (`S7-live-runner-liveA19-att2.md`). Out `$TEMP/bridge-e2e/s19-live/a2`, `-Att 2`, HEAD `079a063`,
build from a clean tree (`built extension → dist/`), tree clean after.

## A2.1 Verdict
Slice ended by a **helper-defect STOP** in R19-CON-BANNER, about 3 minutes in (exit 2). No state change had run, so
there was nothing to restore. Not a failed restore and not an integrity-floor item.

## A2.2 Rows as printed (counts)
- Preflight and R19-0: `ROW RD-0 (a) PASS`, `ROW RULES PASS: RULES 0`, `ROW RD-0 (c) PASS`, `ROW RD-0 (d) PASS`,
  `ROW R17B-0 (e)(f) PASS` (twice); `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`;
  `ROW R19-0 PASS slice=A`.
- `ROW R19-BANNER-CTL PASS slice=A` (neg `idle-ms=20004 polls=16 banner=none`; pos `answer=ok polls=15 banner=seen`).
- R19-ARGS-1: sdk `total table=5 value-equal=4 json-equal=5` (v1 `value-equal=no json-equal=yes`); mcp `total table=5
  value-equal=5 json-equal=5`; control-1 `ok`, control-2 `ok`, `CHECK R19-ARGS-1 control-2 kind=undefined`;
  `LEG R19-ARGS-1 table FAIL`; `CHECK R19-ARGS-1 clauses=3 failed=1`. **Row FAIL (recorded, not fixed).**
- `failed=0` by their CHECK lines (console clauses `pending R19-LOGS`, so no row verdict was printed): R19-ARGS-2
  (`ARGSREF total refusals=11 exact=11 data-none=11 sent=2 effects=0 control=1`), R19-ARGS-GLOBAL, R19-ARGS-CSP,
  R19-ARGS-STOP (`answer=TIMEOUT ms=1511 bound-ms=1500`), R19-CON-1 (3 clauses), R19-CON-2, -REJ, -BIG, -NAV, R19-CON-MCP
  (4 clauses; `existing tools=5 ok=5`, `empty-text=exact`, `banner=PASS`), R19-CON-CAP (`sdk-entries=200 more=191`).
- Not reached: R19-CON-BANNER's verdict and every later row, R19-RESTORE, R19-LOGS, `CHECK rows`.

## A2.3 STOP and return (R7.6)
`window 44303224 is alive but not taken as the driver's (title not one of the wave's own)` → `STOP: window 44303224 is
not one this wave opened (banner sampler)` → `WAVE stopping: an exception in block r19-con-banner` → `STOP
throw-after-state` → `RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a`. Matched; the runner returned.

## A2.4 Diagnosis (step agent)
44303224 is W, the wave's own driver window (evidence line 24, `WINDOW W is 44303224`). R19-CON-BANNER's driver opens
`s12-console.html` as W's **active** tab (`recipes/s12-r19-a.ts:569`), so W's title became `S12 console fixture`;
`Format-S9Title` (`recipes/s11-win.ps1:16`) knows no S12 title and returns `<other window>`, and `Test-S9Live`
(`s9-win.ps1:1052`) refuses W. A helper defect, first reached now (attempt 1 stopped before it). Fix round 2 adds Run
19's own fixture titles, exactly, in `recipes/s12-win.ps1` (the runner's patch file); no guard is otherwise changed.

## A2.5 Restore, logs, after
- Restore: not run (`restored=n/a`); the state was only read (armed, JavaScript on, RULES 0). ARGS-3, the slice's first
  state change, comes after CON-BANNER.
- R19-LOGS: not run; no console evidence copy. Scans of the record and evidence files (`recipes/s11b.ts scan18 --what
  other --file`): both `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`.
- After: `-Block teardown` (a2) exit 0, `CHECK clean PASS`; daemon PID 35924 stopped by `s9.ts daemon-shutdown`; the
  con-banner driver (PID 38644, which the runner saw still connected) had exited by itself; nothing on 9234 or
  8080–8089.
- Budgets: attempts 2 of 3; fix rounds 1 of 3 before fix round 2.

## A2.6 Findings and proposals
- **R19-ARGS-1 FAIL, SDK leg v1:** `value-equal=no json-equal=yes` in both attempts; the MCP leg is 5 of 5. The value the
  SDK returns for TABLE[0] differs from the sent value under `JSON.stringify` comparison, while the page's own
  `JSON.stringify(a)` matches. A product finding for S7-record (cause not established here: candidates are key order or
  `-0`/`1e21` handling on the SDK's by-value path).
- **Runner misreading (no effect):** the runner wrote that control-2's kind "was not recorded"; `kind=undefined` *is*
  the recorded kind (the declaration's completion value, as attempt 1's probe measured).
- **Gotcha candidate for `recipes/CLAUDE.md`:** a row that opens a fixture as the driver window's active tab changes the
  window's title, and the title guard (`Format-S9Title`) must know that fixture's `<title>`, or the next guarded action
  STOPs (Run 19 liveA19 att2, 2026-10-29).

---

# Attempt 3 (2026-10-29; same step agent)

Fix round 2 (`922f757`; fixer Sonnet `S7-live-fixer2.md`, verifier Opus `S7-live-verifier2.md` PASS-with-notes): the
window guard's `Format-S9Title` (overridden in `recipes/s12-win.ps1`) accepts exactly Run 19's own fixture titles
(`S12 console fixture`, `S12 chooser fixture`, `S12 chooser frame`); every other title is unchanged. Runner: Claude
Sonnet 5.5, medium (`S7-live-runner-liveA19-att3.md`). Out `$TEMP/bridge-e2e/s19-live/a3`, `-Att 3`, HEAD `922f757`,
build from a clean tree (`built extension → dist/`).

## A3.1 Verdict
**DONE: the slice ran to its end, with no STOP.** It printed 22 R19 rows plus R19-0, R19-BANNER-CTL, R19-RESTORE and
R19-LOGS: 5 FAIL, the rest PASS. `CHECK rows19 rows=32 warns=0 stop-return=0`, then `SLICE liveA19 done: calls with a
failed check 5, not measured 0`. The runner started the script with `&` in Git Bash, so its exit code was not captured;
the slice's own lines above are the evidence for the end. The FAILs are recorded here and not fixed (brief; phase doc §
STOP rules: "a Run 19 row that fails (its fix is a proposed decision)").

## A3.2 Rows as printed
- `ROW R19-0 PASS slice=A` (RD-0 (a)/(c)/(d), `RULES 0`, R17B-0 (e)(f) PASS) and `ROW R19-BANNER-CTL PASS slice=A`.
- **PASS** (17): R19-ARGS-2, -ARGS-GLOBAL, -ARGS-CSP, -ARGS-STOP (`STOPCALL answer=TIMEOUT ms=1516 bound-ms=1500`),
  R19-CON-1, -CON-2, -CON-REJ, -CON-BIG, -CON-NAV, -CON-MCP (`existing tools=5 ok=5`, `empty-text=exact`), -CON-CAP
  (`sdk-entries=200 more=191`), -CON-BANNER, -CON-JSOFF (`mcp-refused=yes`), -CON-3 (`mcp-refused=yes`), -CON-FRAME
  (2 clauses), -CON-OWN, -CON-FILE.
- **FAIL** (5):
  - **R19-ARGS-1** `clauses=3 failed=1`: sdk `total table=5 value-equal=4 json-equal=5`; mcp `value-equal=5 json-equal=5`;
    `LEG table FAIL`. Control-1 `ok`, control-2 `ok`, `CHECK R19-ARGS-1 control-2 kind=undefined` (the kind recorded,
    #366; judged at S7-record against R19-ARGS-OLD).
  - **R19-ARGS-3** `clauses=5 failed=1`: `CONREF … sdk code=JS_DISABLED exact=yes`, raw `JS_DISABLED exact=yes`, noargs
    `JS_DISABLED exact=yes`, **mcp `code=ok exact=no`** → `LEG mcp FAIL`; `EFF before=1 after=1`; state PASS; banner PASS.
  - **R19-CON-NOTEA** `clauses=1 failed=1`: `CON … blocked entries=0 console=0 …`, `CON … allowed entries=2 console=2
    sentinel=1 …`; `LEG notea FAIL`.
  - **R19-CON-4** `clauses=2 failed=1`: `CONREF … disarmed code=DISARMED exact=yes data=keys:scope`; **`CHECK R19-CON-4
    mcp-refused=no`** → `LEG mcp FAIL`; after PASS; banner PASS.
  - **R19-CON-FLOOR** `clauses=1 failed=1`: `CONFLOOR disarmed-ticks=2 in-reply-disarmed=0 after-ticks=2 in-reply-after=2
    exc-disarmed=1 exc-in-reply-disarmed=0 exc-after=2 exc-in-reply-after=2`; `LEG floor FAIL`.
- `ROW R19-RESTORE PASS slice=A`; `ROW R19-LOGS PASS slice=A`.

## A3.3 STOPs (R7.6)
None printed: no `STOP`, `STOPWHY` or `RETURN` line; `stop-return=0`.

## A3.4 Restore (R7.4)
`RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `CHECK UP-RESTORE
stored PASS` (equal to UP-0 by count and hash) and `daemon PASS`; read-back `stored page equal true, daemon.status equal
true, title armed true`; `RULES 0`; `DIALOGS liveA19 native=0 devtools=0 wave-windows-open=1`. Each state-changing row
also printed its own `RESTORE blocklist lines=0 hash=equal` (×3). Restore equal to R19-0: **yes**, by count and hash.

## A3.5 R19-LOGS (R7.5)
`CONSOLE liveA19 segments=1 … texts=1277 control-disarmed=9`; `CONSOLE window-title lines dropped=3`; `SCAN console:
://=0 … token=0 sentinel=0 profile=0`; `SCAN daemon: ://=0 … token=0 sentinel=0 profile=0`; `DAEMONLOG liveA19 sentinel=0
console-text=0 args-text=0`; SCANTOOL for 7 tools, all `token=0 profile=0 shot-line=0 image-line=0`, and `sentinel=0`
except `tool=browser_console_messages sentinel=25` (that tool's job is to return the fixture's console text, which holds
the sentinel); `SCAN actors: ://=5 (fixture 5, other 0) token=0 sentinel=25 profile-other=0`. The row printed PASS by its
rule. `actors-liveA19.jsonl` stays in the out folder and is not committed.

## A3.6 Evidence files and their scans
`S7-live-record-liveA19-att3.txt` (440 lines, written by the runner script), `S7-live-evidence-liveA19-att3.txt` (606
lines, stdout with `<HOME>`/`<OUT>` placeholders), `S7-live-console-liveA19-att3.txt` (1274 lines; the runner dropped two
window-title lines from the copy, one of which carried the profile's display name). Each file and the runner report,
re-scanned by the step agent with `recipes/s11b.ts scan18 --what other --file`: `SCAN other: ://=0 (fixture 0, other 0)
token=0 sentinel=0 profile=0` (4 of 4). The three `DevTools` strings left in the console copy are Chrome's own UI text
(`Customize and control DevTools` ×2, `DevTools is undocked`), as in S1-live's liveA18 copy.

## A3.7 After
Teardown ran inside the slice (`CHECK clean PASS`). The daemon (PID 14348) was stopped by `s9.ts daemon-shutdown`.
Afterwards nothing listened on 9234 or 8080–8089, and no node or python process of this repo was alive (the one other
node.exe is not this repo's). Budgets: **attempts 3 of 3, fix rounds 2 of 3**.

## A3.8 Findings for S7-record (recorded, not ruled; first reads by the step agent)
1. **R19-ARGS-1, SDK leg v1** (`value-equal=no json-equal=yes`, the same in attempts 2 and 3; MCP leg 5 of 5). The MCP
   actor's text for v1 reads back the same object. So the SDK's by-value result for TABLE[0]
   (`{rows:[1,2,{z:null,…}], name, n:-0.5, big:1e21}`) differs from the sent value under `JSON.stringify`, while the page's
   own `JSON.stringify(a)` matches. Cause not established; a product question for S7-record.
2. **R19-ARGS-3 mcp `code=ok exact=no` and R19-CON-4 `mcp-refused=no`: possibly the helper's judge, not the product.**
   The ARGS-3 judge (`recipes/s12-r19-a.ts` args3, `mr.isError && mr.text.includes(MSG.jsOff)`) requires `isError`. But
   the MCP sends some failure reports without `isError`, with the code on line 1 (`mcp/src/tools/registry.ts:59-75`,
   332), and `recipes/s12-r19-c.ts` `mcpCodeOf` reads both forms. `actors-liveA19.jsonl` holds `browser_evaluate`
   answers whose text starts with `JS_DISABLED: …`, but the file does not record `isError`. So whether the product
   refused there is **not established**. S7-record should read the MCP's answer form before calling either row a
   product FAIL. No re-measurement is possible in this stage (attempts exhausted).
3. **R19-CON-NOTEA** (blocked tab entries=0, allowed entries=2 with sentinel=1) and **R19-CON-FLOOR**
   (`in-reply-disarmed=0`, `exc-in-reply-disarmed=0`) failed by their pass rules. Their cause was not examined here; for
   S7-record.
4. **The verifier's MINOR-1 is carried to liveB19:** KEEP-3's `nav-blocked` may give window X an error-page title
   (`S7-live-verifier2.md` §6 (d)).

## A3.9 Proposed decisions
### 2026-10-29 · Run 19's driver window guard knows Run 19's own fixture titles
**Decided (proposed):** keep fix round 2's exact-title override in `recipes/s12-win.ps1` for every later slice, and add
a `recipes/CLAUDE.md` gotcha: a row that opens a fixture as the driver window's active tab changes that window's title,
so the title guard must know the fixture's `<title>`. **Why:** liveA19 attempt 2 stopped on it, and the verifier found
the same exposure in liveB19 (KEEP-2, X) and liveC19. **Instead of:** opening those tabs in the background, which would
change the rows. **Revisit if:** a new fixture is added; the static test fails first. **By:** Claude (proposed).

### 2026-10-29 · S7-record reads the MCP failure form before judging ARGS-3's and CON-4's MCP legs
**Decided (proposed):** S7-record rules on whether `code=ok` and `mcp-refused=no` are the product or the judge. It reads
`mcp/src/tools/registry.ts` and liveA19's actor file (the out folder `a3`, outside the repo, kept). If the judge was
wrong, it records the row as a helper defect in the judge (NOT DISCRIMINATING), never as a PASS. **Why:** expected text
is never edited after a run, and a FAIL caused by the judge is not a product finding. **By:** Claude (proposed; for the
session agent).

---

## Final (all attempts)
**Verdict: DONE.** Attempt 3 ran liveA19 to its end with no STOP, and the restore read back equal by count and hash.
Attempt 3 printed 5 row FAILs: R19-ARGS-1, R19-ARGS-3, R19-CON-NOTEA, R19-CON-4 and R19-CON-FLOOR. Attempts used: 3 of
3. Fix rounds used: 2 of 3 (`079a063`, `922f757`). Evidence commits: `e1c05c4` (attempt 1), `491a794` (attempt 2), and
this attempt's commit.
