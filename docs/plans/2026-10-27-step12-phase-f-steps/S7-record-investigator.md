# S7-record investigator: cause readings for Run 19's FAILs

Read-only leaf (agent-rules §6). This leaf ran nothing live and edited nothing except this report. It did not read `wtv` or
any out folder outside the repo. Steps-dir files are cited by bare name (dir `docs/plans/2026-10-27-step12-phase-f-steps/`).

## 1. Verdict
**DONE.** 9 items: **H** 6 (1, 2, 4, 5, 6, 7), **P** 1 (3), **U** 2 (8, 9).

## 2. Outputs
This file only. Each item gives the evidence, the code, the class, the cause and the consequence under #366/#367/#370–#372.

### Item 1: R19-ARGS-1, SDK leg `value-equal=4` (class H)
- **Evidence:** `S7-live-evidence-liveA19-att3.txt:140` `v1-sdk ok value-equal=no json-equal=yes`; `:142–148` v2–v5 SDK
  `value-equal=yes`; `:150` `via=sdk value-equal=4 json-equal=5`; `:151` `via=mcp value-equal=5 json-equal=5`. The same
  v1 reading appears in attempt 2 (`S7-live-liveA19.md:157-161`). The evidence does not print the returned value.
- **Code:** the driver compares the returned value by `JSON.stringify` equality (`recipes/s12-r19-a.ts:192`, `:204`),
  which is sensitive to key order. The SDK returns `envelope.value` (`sdk/src/tab.ts:319-324`). The extension gets the
  envelope from `Runtime.callFunctionOn` with `returnByValue: true` (`extension/src/debugger.ts:270-272`). The MCP prints
  `envelope.description` (`mcp/src/tools/registry.ts:872`), which the page builds with `JSON.stringify(value, null, 2)`
  (`extension/src/evaluate/serialize.ts:374`), so it keeps the page's key order.
- **Measured before (Stage 0):** "`returnByValue` keeps nulls but **sorts object keys**. The same happens in today's
  product evaluate" (`Stage0-measurer1.md:36-37`, `:108-109`).
- **Cause:** TABLE[0] is the only value with more than one key (`rows, name, n, big`, and a nested `z, a`). Its `value`
  comes back with sorted keys, so the order-sensitive compare fails. v2–v5 have no multi-key object, which fits 4 of 5.
  Nothing points to a lost null or number: Stage 0 measured nulls kept, and `json-equal=yes` shows the page received the
  value exactly.
- **Why H and not P:** the spec promises "the page receives exactly the sent JSON (key order, `null`s)" (row 1785):
  the receive side, which `json-equal=5/5` meets. The expected `value-equal=5` came from a fake-extension test that
  echoes `args` with no CDP and checks the return with `toEqual`, which ignores key order
  (`mcp/test/s12-args-cross.test.ts:131`). The key sort predates Step 12. If the row's "0 of the 5 differing in key
  order" is read as covering the return path, this is a pre-existing product fact, not an `args` defect. The session
  agent rules which reading holds.
- **Consequence:** the SDK `value-equal` clause is **NOT DISCRIMINATING**. Named cause: an order-sensitive compare of a
  `value` that Chrome's `returnByValue` key-sorts (Stage 0). The other clauses pass by their counts: `json-equal` 5/5
  SDK and 5/5 MCP, MCP `value-equal` 5/5, control-1 `ok` (`:152`), control-2 `ok` with `kind=undefined` (`:153-154`).
  Control-2 equals liveD19's old-build twin `kind=undefined` (`S7-live-evidence-liveD19-att2.txt:166`;
  `S7-live-evidence-liveD19-att1.txt:165`), so it **PASSES by #366**.

### Item 2: R19-ARGS-3, MCP leg `exact=no` (class H)
- **Evidence:** `S7-live-evidence-liveA19-att3.txt:303` `CONREF R19-ARGS-3 mcp code=ok exact=no`; `:304` `LEG … mcp
  FAIL`; `:299-306` the sdk, raw and noargs legs all `JS_DISABLED exact=yes`; `:308` `EFF R19-ARGS-3 before=1 after=1`;
  `:307` snapshot `ok`; `:310`, `:313` state and banner PASS.
- **Reader:** this leg does not use `mcpCodeOf`. Its check is
  `mr.isError && mr.text.includes(MSG.jsOff) ? {code:"JS_DISABLED"…} : undefined` (`recipes/s12-r19-a.ts:439`).
  `MSG.jsOff` is the extension's `JS_DISABLED_MESSAGE` (`recipes/s12-r19-a.ts:23` → `recipes/s10-rules.ts:148-149`, the
  same text as `extension/src/safety.ts:203-204`). A miss is printed as `code=ok`.
- **What the MCP sends:** `withSafetyRefusals` turns every `JS_DISABLED` into `toolError(safetyRefusalLine(…))`, with
  `isError: true` (`mcp/src/tools/registry.ts:169-182`, `:48-51`). Line 1 (the whole text) is the SDK's
  `JS_DISABLED_LINE` (`sdk/src/error.ts:122-124`, `:147`): `JS_DISABLED: the user has turned JavaScript off for the
  bridge in Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying
  on it; do not retry it.` That text does not contain the extension's message, by design (#202; pinned in
  `mcp/test/safety.test.ts` and `mcp/test/safety-cross.test.ts`). So `includes(MSG.jsOff)` is false on any build that
  ships this MCP. Line 1 itself is not in committed evidence. The step agent reports that the uncommitted actors file
  holds texts that start with `JS_DISABLED: …` (`S7-live-liveA19.md:243-245`).
- **Against §4.27:** row 1787 wants "the MCP leg's result text contains it" (the extension's message). The shipped MCP
  never sends that text, so the sheet's expectation contradicts the MCP's pinned design. That is a sheet and reader
  error, not a product one. `EFF before=1 after=1` counts all four refused calls, the MCP's included, so the MCP call
  did not run the function.
- **Consequence:** the MCP leg is **NOT DISCRIMINATING**. Named cause: the reader checks for the extension's message,
  which the MCP's own safety line never carries. The other four clauses pass by their counts.

### Item 3: R19-CON-NOTEA (class P; Chrome's reason taken from Stage 0)
- **Evidence:** `S7-live-evidence-liveA19-att3.txt:405` blocked `entries=0 … url=0 stack=0 … marker=0` (meets its
  counts); `:406` allowed `entries=2 console=2 exception=0 sentinel=1 url=0 stack=0 maxlen=16 cut=0 … marker=0`; `:407`
  `LEG notea FAIL`.
- **Reader:** `judgeNoteA` (`recipes/s12-r19-a.ts:469-476`): the allowed leg wants `entries=2 … sentinel=1 marker=1`.
  The RECORD branch covers `entries=1 marker=0` only, as the sheet says (row 1802), so `entries=2 marker=0` is a FAIL.
  The judge matches the sheet. `marker` counts `s12-noteaok` in the whole reply (`recipes/s12-forms.ts:56`).
- **What the evidence shows:** the fixture logs `{e: new Error("s12-noteaok")}` and then the sentinel
  (`test-fixtures/s12-noteaok.js`). The sentinel is 16 characters (`test-fixtures/s12-console.js:13`) and `maxlen=16`.
  So the Error-holding entry was kept, but its text has at most 16 characters and does not contain the message.
- **Code:** `remoteText` (`extension/src/console-messages.ts:168-177`) adds the preview's `{e: …}` only when
  `preview.properties` is an array. Otherwise the text is the description head alone (`Object`). The collector reads
  the messages Chrome replays on `Runtime.enable` (`console-messages.ts:6-7`, `:80`). The fixture logged at load, 2 s
  before the read (`recipes/s12-r19-a.ts:492-495`), so this entry is a replayed one.
- **Measured before (Stage 0):** the replayed `consoleAPICalled` args carry **no `preview`**: an Object is
  `{type, className, description:"Object"}` only (`stage0-m1-C.txt:216-244`). Live args do carry one (`:277-350`).
- **Cause:** on the replay path, an object holding an Error is reported as `Object`, without its properties. The
  sheet's `marker=1` (an `Object {e: Error: …}` text) assumed a preview that replayed messages never carry. The product
  behaves this way on every build. The Error's message is not shown, but no URL or stack leaks (`url=0 stack=0`).
- **Consequence:** **FAIL + a finding for the user** (Findings 1). Side note: the blocked leg met its counts, but with
  no preview on replay it cannot reach the preview-cut path (F1, #344 (3)) it was written to test.

### Item 4: R19-CON-4, `mcp-refused=no` (class H)
- **Evidence:** `S7-live-evidence-liveA19-att3.txt:432` `CONREF … disarmed code=DISARMED exact=yes data=keys:scope
  same-as=snapshot` PASS; `:435` `CHECK R19-CON-4 mcp-refused=no`; `:436` `LEG mcp FAIL`; `:437-438` after `ok` PASS;
  `:441` banner PASS.
- **Reader:** `judgeMcpRefusal` for CON-4 wants `r.isError && r.text.includes(MSG.disarmed)`
  (`recipes/s12-r19-a.ts:373-375`, printed at `:415`). `MSG.disarmed` is the extension's `DISARMED_ALL_MESSAGE`
  (`recipes/s10-rules.ts:146-147` = `extension/src/safety.ts:197-198`).
- **What the MCP sends:** `isError: true`, and line 1 (the whole text) is `DISARMED_ALL_LINE`
  (`sdk/src/error.ts:119-120`, `:151`): `DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user
  to turn it back on; do not retry.` That text lacks the extension's ", so every page call is refused", so the
  `includes` check cannot succeed with the shipped MCP. CON-JSOFF and CON-3, judged by text equal to the control, read
  `mcp-refused=yes` (`S7-live-runner-liveA19-att3.md:30`).
- **Against §4.27:** row 1796 gives no MCP text. "An error carrying the disarmed message" is the driver's own reading,
  which the MCP's pinned line (#133) cannot meet.
- **Consequence:** the MCP leg is **NOT DISCRIMINATING**. Named cause: the reader checks for the extension's message,
  which the MCP's `DISARMED` line does not carry. The other clauses pass: disarmed CONREF, after `ok`, banner.

### Item 5: R19-CON-FLOOR (class H: the sheet's timing, predicted before the run)
- **Evidence:** `S7-live-evidence-liveA19-att3.txt:462`: `CONFLOOR disarmed-ticks=2 in-reply-disarmed=0 after-ticks=2
  in-reply-after=2 exc-disarmed=1 exc-in-reply-disarmed=0 exc-after=2 exc-in-reply-after=2`; `:463` FAIL.
- **Correction to the brief:** `in-reply-disarmed=0` is the passing value. The failing terms are `disarmed-ticks=2`
  (the rule wants ≥ 3) and `exc-disarmed=1` (wants ≥ 3) (`recipes/s12-r19-a.ts:515`). Those are the page's own counts
  inside the judged window, not product answers.
- **Code:** the window is `[off + 500, on − 500)` (`recipes/s12-forms.ts:75`); the driver waits the sheet's 3 s
  (`recipes/s12-r19-a.ts:507`); the page ticks at 1 Hz. The span is about 2.1–2.6 s: 2 ticks for certain, a third only
  sometimes. Predicted before the run (`S7-drivers-A-verifier2.md:98-110`, N1 MAJOR; kept as a risk,
  `S7-drivers-A.md:48`). The press times fit (`:449-458`: off title 22.606 s, ON press 25.868 s).
- **Cause:** the sheet's wait is too short for its own `≥ 3` bound. Why only 1 exception fell in the window against 2
  ticks is not established.
- **Consequence:** the precondition clause is **NOT DISCRIMINATING** for `≥ 3`. Named cause: the 3 s wait against the
  ±500 ms margins (N1). The floor clauses pass by their counts: 0 of 2 disarmed ticks and 0 of 1 disarmed exceptions in
  the reply; 2 of 2 after-ticks and 2 of 2 after-exceptions present.

### Item 6: R19-ARGS-OLD, MCP leg `code=ERROR` (class H)
- **Evidence:** `S7-live-evidence-liveD19-att2.txt:157-158` `leg=mcp code=ERROR hint=yes` FAIL; attempt 1 the same
  (`S7-live-evidence-liveD19-att1.txt:156-157`). Both: sdk, ref, file `VERSION hint=yes`, raw `forwarded=no`, control
  `ok`, `clauses=6 failed=1` (att2 `:155-168`); old build proven (`:154`), current build back (`:198`).
- **What the MCP sends:** `VERSION` is neither in the attach set (`sdk/src/error.ts:66-74`) nor a safety code
  (`sdk/src/error.ts:145-152`). So `failureReport` returns null and the handler rethrows (`registry.ts:314-315`,
  `:343-351`, `:169-180`). The MCP SDK then returns `{content:[{text: error.message}], isError: true}`
  (`node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:141`, `:152-161`, v1.29.0). Line 1 (the whole text) is
  the daemon's `ARGS_RELOAD_HINT` (`daemon/src/intercept.ts:41-42`): `the Chrome extension is an older build without
  evaluate args — reload it at chrome://extensions (↻ on Chrome Agent Bridge)`. A unit test pins this flow: "The raw
  tool handler throws; the MCP SDK turns the throw into an isError result" (`mcp/test/s12-args-cross.test.ts:160-164`).
- **Reader:** `mcpCodeOf` (`recipes/s12-r19-c.ts:94-96`) expects an `isError` text that starts with the code. Line 1
  starts with lowercase `the`, so `/^([A-Z][A-Z_]*)/` does not match and the reader returns `ERROR`. That printed
  `ERROR` also shows `isError` was true. `hint=yes` (`includes(ARGS_RELOAD_HINT)`, `recipes/s12-r19-de.ts:28`) shows the
  text is the daemon's hint.
- **Against §4.27:** row 1791 wants `leg=mcp code=VERSION hint=yes`, and the message is the daemon's `ARGS_RELOAD_HINT`.
  The message clause is met. The MCP prints no code for an error outside the safety and attach paths, so `code=VERSION`
  cannot be read from MCP text on any build. The product's answer is the designed one.
- **Consequence:** the MCP leg's code clause is **NOT DISCRIMINATING**. Named cause: `mcpCodeOf` assumes a code on line
  1, which a rethrown non-attach error never carries. The hint clause passes, and the other five legs pass in both
  attempts. Both attempts read the same, so nothing is replaced (#371).

### Item 7: R19-VERSION, MCP leg `code=ERROR` (class H)
- **Evidence:** `S7-live-evidence-liveE19-att1.txt:163` `VERSIONCH … leg=mcp code=ERROR hint=yes files=0 exact=yes`,
  `:164` FAIL; `:161-170` sdk and raw `VERSION hint=yes files=0 exact=yes` PASS, control `ok files=1` PASS, args PASS.
- **What the MCP sends:** `browser_upload_file` has no catch of its own (`registry.ts:633-646`), so the same rethrow
  path as item 6 applies. Line 1 (the whole text) is `CHOOSER_RELOAD_HINT` (`daemon/src/intercept.ts:44-45`): `the
  Chrome extension is an older build without the file chooser upload — reload it at chrome://extensions (↻ on Chrome
  Agent Bridge)`. `exact=yes` (`includes(CHOOSER_RELOAD_HINT)`, `recipes/s12-r19-de.ts:95`) confirms the text.
- **Reader and §4.27 (row 1846):** `mcpCodeOf` returns `ERROR`, as in item 6. The daemon's text is met; the code cannot
  be read from MCP text by design.
- **Consequence:** the MCP leg's code clause is **NOT DISCRIMINATING**, for the same named cause as item 6. Its other
  printed clauses pass (`hint=yes files=0 exact=yes`). `clicks` and the leak count are judged but not printed for this
  leg. The other four legs pass.

### Item 8: R19-CHOOSE-KEPT (class U)
- **Evidence:** `S7-live-record-liveC19.txt:122` first `ok … files=1 change=1 clicks=1 dialog=0`; `:123` second `ok …
  files=1 change=1 clicks=2 dialog=0`; `:124` `KEEPSEQ … answers=2/2 banner=continuous`; `:125` FAIL.
- **Code:** both calls run on one page load with the same file into the same hidden `#in`
  (`recipes/s12-r19-c.ts:219-229`). `judgeKept` wants `change` 1 then 2 (`:81-83`). The fixture counts `change` events
  only, with no `input` or `cancel` counter, and `files` is the input's live count (`test-fixtures/s12-chooser.js:13-35`).
  The product's reply `files` is "the number of paths handed to `DOM.setFileInputFiles` … not proof that the page took
  them" (`extension/src/upload-files.ts:183-187`).
- **What can and cannot be told apart:** `files=1` after the second call fits both "the same file set again, no `change`
  fired" and "the second set never reached the input". `clicks=2` shows the opener was clicked. The idea that Chrome
  fires no `change` for an unchanged selection would be Chromium behaviour. Nothing in the repo or the evidence measures
  it.
- **Consequence:** **FAIL, "cause not established"**. By #370, this becomes a later-wave row with a second, different
  file (and, to tell the two causes apart, an `input` or `cancel` counter). The other clauses pass by their counts: 2/2
  `ok`, banner continuous, `dialog=0`, `files=1`.

### Item 9: R19-G2-1, leg b TIMEOUT (class U; the covered-window hang is not shown)
- **Evidence:** `S7-live-record-liveC19.txt:297` `G2 … a-reply=34 b-reply=35106 gap-ms=35072 holder-after-reply-ms=477
  a-effect=1 b=TIMEOUT`; `:300` the focusFirst variant `b-reply=35118 … holder-after-reply-ms=479`. G2-2, run next with
  the same set-up, had 5 of 5 rounds `b-ok=3 b-lock-timeout=0` (`:309-318`).
- **Code:** A's trusted call has the daemon focus A's tab, and `chrome.windows.update(…, {focused:true})` brings window
  X to the front (`extension/src/handlers/tabs.ts:72`; `daemon/src/methods.ts:101-102`). B's default screenshot never
  raises W (`extension/src/tabs.ts:127-130`). The gotcha says a capture in a fully covered window hangs, with `TIMEOUT`
  at 35 119 ms (`extension/CLAUDE.md:187-192`). B's call has `timeoutMs: 30_000` (`recipes/s12-r19-c.ts:418`).
- **Why the hang is not shown:** B's ~35.0 s fits the gotcha, but also any hang that runs to the 30 s timeout plus
  slack. No window rectangle or occlusion state is in the evidence. G2-1 and G2-2 open X with the same helper
  (`recipes/s12-r19-c.ps1:136-138`), and A focuses X in both, yet G2-2's 15 B screenshots all answered `ok`. Nothing in
  the evidence or code explains the difference. The worker console copy has no capture lines.
- **Consequence:** by #370, `b=ok` stays **FAIL, "cause not established"**, and is not NOT DISCRIMINATING. The other
  clauses pass by their counts: A `ok` first (34 ms), `holder-after-reply-ms=477` (≥ 450), `a-effect=1`. The gap of
  35 072 ms meets the ≥ 450 bound only because B never answered, so it carries no hold information.

## 3. Verifier verdict
Not applicable (investigator).

## 4. Deviations
- I corrected the brief on item 5: `in-reply-disarmed=0` is the expected value, and the FAIL is on the page's
  `disarmed-ticks` and `exc-disarmed`.
- Items 2 and 4 are not read by `mcpCodeOf`. Their drivers use their own `includes(<extension message>)` checks
  (`recipes/s12-r19-a.ts:439`, `:373-375`), and I read those instead.
- I did not read the uncommitted actor files outside the repo.

## 5. Proposed decisions
### 2026-10-29 · S7-record: the H readings are NOT DISCRIMINATING; NOTEA is a product finding
**Decided (proposed):** NOT DISCRIMINATING, cause named, never PASS: ARGS-1 SDK `value-equal`; the ARGS-3 and CON-4 MCP
legs; the ARGS-OLD and VERSION MCP code; CON-FLOOR's `≥ 3` precondition. CON-NOTEA stays FAIL with Findings 1.
CHOOSE-KEPT and G2-1 stay FAIL, "cause not established". Control-2 PASSES by #366. **Why:** each H reading rests on
code, a pinned test or a Stage 0 measurement, and no pass rule moves. **Revisit if:** the user reads ARGS-1's "key
order" clause as covering the return path. **By:** Claude (investigator, proposed).

## 6. Findings
1. **CON-NOTEA (P):** a console object logged before `consoleMessages` reaches the agent as `Object`, with no
   properties. Chrome's `Runtime.enable` replay carries no `preview` (`stage0-m1-C.txt:216-244`), and `remoteText` then
   uses the description alone (`extension/src/console-messages.ts:175-176`). So the logged Error's message is lost
   (Run 19 liveA19 att 3, `:406`, `maxlen=16 marker=0`). Gotcha candidate for `extension/CLAUDE.md`: "replayed console
   args carry no preview; an object logs as its class name only" (Stage 0 measured, Run 19 seen).
2. **Gotcha candidate (Stage 0 measured, still in no `CLAUDE.md`):** `evaluate`'s `value` has keys sorted by
   `returnByValue`, while `description` keeps the page's order (`Stage0-measurer1.md:36-37`).
3. **Reader rule for later waves:** a check of MCP text must use the MCP's own lines (`sdk/src/error.ts:119-128`) or
   `mcpCodeOf`. A rethrown non-attach, non-safety error is the bare message, with no code on line 1.

## 7. Handoff
Nothing was started. No process, port or window was touched. The next stage needs the session agent's ruling on §5 and
on item 1's reading.
