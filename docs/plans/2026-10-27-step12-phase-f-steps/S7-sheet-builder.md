# S7-sheet (part A) — builder report

Model and effort: Claude Sonnet 5.5, medium. No commit (brief).

## 1. Verdict
DONE (part A). The sheet half of R7.1 is met: `docs/e2e-test-plan.md` §4.27 exists, written before any observation. No
Chrome, daemon or page was touched; the only commands were `netstat -ano`, `date -u`, `Get-NetTCPConnection`, `Get-Date`.

## 2. Outputs
- `docs/e2e-test-plan.md`: new `### 4.27 R19 rows …` inserted between §4.26's end and `## 5. Results template`.
  `git diff --stat`: 42 insertions, 0 deletions, one hunk (42 file lines; the rows are long paragraphs, so the size cap
  of ~350 lines is far from reached). Part B replaces the placeholder sentence "Part B (the D, E, G2 and carried rows,
  slices and order, R19-LOGS, R19-RESTORE) follows." (it sits just before the table; part B's rows go in the same table,
  the table's last row is `R19-CON-BANNER`).
- `node scripts/doc-check.mjs`: exit 0; "Checked 38 living docs". It lists one dead path,
  `docs/e2e-test-plan.md:1778  test-fixtures/s12-console.html` (the page S7-helpers builds; expected until then), and the
  existing count drifts (24 vs 25 tools, 27 vs 28 methods in CLAUDE.md files, README, 4665 tests) that are not this lane.
- Fixtures and ports (by `netstat -ano` at 2026-10-28 06:01 UTC): 8000 held (PID 27152, avoided); 8082 Bound (PID 25896,
  avoided); 8081 and 9234 free. Chosen: 8081 only.

## 3. Rows (27)
R19-0; R19-ARGS-1, -2, -3, -GLOBAL, -CSP, -STOP, -OLD; R19-CON-1, -2, -REJ, -3, -4, -OWN, -FILE, -JSOFF, -FLOOR, -FRAME,
-NOTEA, -BIG, -NAV, -MCP, -BANNER. (The extra B and C ids come from the Handoffs of S2b §7, S3a §7, S3b §7.) Left to
part B as briefed: CON-KEPT, R19-LOGS (which also carries S3a check 9 and S3b's CON-LOGS), R19-RESTORE, slices and order.
Rows that change state: ARGS-3 and CON-JSOFF (JavaScript off), CON-3, -FRAME, -NOTEA (block list `s12blk.localhost`),
CON-4 and CON-FLOOR (toolbar disarm), ARGS-OLD (a pre-S2a build loaded, then the current one reloaded and R19-0 re-run).

## 4. Line forms defined (part A; every value a count or fixed code)
(1) `LOADED consoleMessages=<answered|CODE> entries=<n> console=<c> exception=<x> args=<answered|CODE>`;
(2) `ARGS <row> <label> <ok|CODE> value-equal=… json-equal=…` and `ARGS <row> total table=<n> value-equal=<k> json-equal=<k> via=<sdk|mcp|raw>`;
(3) `ARGSREF <label> code=… exact=… data=… sent=<0|1>` and `ARGSREF total refusals=… exact=… data-none=… sent=… effects=… control=…`;
(4) `EFF <row> before=<n|absent> after=<n|absent>`; (5) `GLOBALS <row> args=… fn=… new-own-keys=<n>`;
(6) `STOPCALL <row> answer=… ms=… bound-ms=… usable=… next=…`; (7) `OLD <row> code=… hint=… forwarded=<n>`;
(8) `CON <row> <label> entries=… console=… exception=… sentinel=… url=… stack=… maxlen=… cut=… uncaught-first=…`;
(9) `CONREF <row> <label> code=… exact=… data=… same-as=<snapshot|evaluate|none>`;
(10) `CONFLOOR disarmed-ticks=… in-reply-disarmed=… after-ticks=… in-reply-after=…`;
(11) `CONMCP <label> lines=… form=… truncated=… entries-via-sdk=…`;
(12) `BANNERCON leg=<neg|pos|after> polls=… banner=… idle-ms=…` then `ROW R19-CON-BANNER <PASS|FAIL>`.
Existing §4.26 forms are carried by reference.

## 5. Fixture pages described (not built)
`test-fixtures/s12-console.html` + `s12-console.js` with queries `con` (10 messages: 8 log, 1 warn, 1 error, then one
uncaught error; sentinel in all), `rej`, `big` (1 MB ASCII string), `tick`, `frame` (iframe of `s12blk.localhost:8081`),
`notea` (script from `s12blk.localhost:8081` logging `{e: err}`, a short and a 3 000-character message), `nav`/`nav2`;
reporter `window.__s12`, effect counter `window.__s12eff`. Existing `e2e-playground.html` and `e2e-playground-csp.html`
reused. One block-list pattern: `s12blk.localhost`.

## 6. Expected texts and their sources
- args refusals (8 texts) and the not-a-function text: spec §10 S2a note; `shared/src/protocol.ts` `ARGS_REFUSALS`;
  not-a-function also `extension/test/s12-args-call.test.ts:192` (grepped). The SDK's ninth: spec §10 S2b note.
- `ARGS_RELOAD_HINT`: `daemon/src/intercept.ts:40`; containment pinned by `mcp/test/s12-args-cross.test.ts` B2.3.
- `JS_DISABLED_MESSAGE`, `DISARMED_ALL_MESSAGE`, `BLOCKED_TAB_MESSAGE`, `OWN_PAGE_MESSAGE`, `FILE_PAGE_MESSAGE`:
  `extension/src/safety.ts:197–220`. Tests import the constants rather than repeat the text (`extension/test/gated-router.test.ts:58`);
  `recipes/test/s11-rules.test.ts` pins the JS-off text as a string. §4 of this file already repeats the disarmed text 8
  times, JS-off 3, own-page 3, file 1.
- Console line form, `No console messages.`, the cap marker: `sdk/test/s12-console-format.test.ts` (10–33),
  `sdk/test/s12-console-cap.test.ts:10` (grepped). Exception text form and the 2000 cap: `extension/test/s12-console-reduce.test.ts` (:82, :157, :230).
- Level and limit rules, entry shape, drop rules, floor, class: spec §10 S3a note. Checks 1–10: `S3a.md` §7; CON-MCP,
  -JSOFF, -REFUSE, -NOTEA: `S3b.md` §7. Unknown method text: `extension/src/router.ts:45`.
- Stage 0 facts quoted (direct-value form mangles JSON; navigation clears; banner ~5.1 s after detach; replay up to 1000):
  phase doc § As built and `Stage0.md` §4.

## 7. Deviations
None from the brief. Judgment calls to check:
1. Row table's second column is "Slice / state" (the state a row needs), because slices belong to part B.
2. R19-CON-FRAME's second read (pattern removed) is there to tell a block-list drop from a frame-scope drop; an
   out-of-process frame cannot be built on loopback and is recorded as not measured.
3. R19-CON-BANNER carries its own negative and after legs (self-contained control) so part A does not depend on a
   part B banner control; part B's KEEP rows may reuse the form.
4. Pass bounds I set that no committed source states: `STOPCALL ms` between 1 500 and 3 500 (the 500 ms paused wait plus
   terminate is in the spec note; the margin is mine); ±500 ms margin around the toolbar press in CON-FLOOR; the page's
   10-message level mix (8/1/1), chosen so level filters have exact counts.

## 8. Proposed decisions
None.

## 9. Findings
- Spec/phase-doc mismatch worth knowing: phase doc 0.5 says `consoleMessages` is class `tab` (JS-off does not gate it),
  but decision #334 and the spec's S3a note class it `evaluate` (JS off refuses it). The sheet follows the spec and #334
  (R19-CON-JSOFF expects `JS_DISABLED`).
- Sources not found: none for the committed texts above. The phase doc names no S6-G2 row source for part A (part B).

## 10. Handoff
- For part B: append rows to the same table (after `R19-CON-BANNER`), replace the placeholder sentence, add the
  **Line forms (part B)** paragraph, slices/order, R19-LOGS (sentinel and token counts per slice, covering the `args`
  sentinel `s12=a1` and console `SENTINEL`), R19-RESTORE (block list by count and hash too), the open items.
- For S7-helpers: the pages above; `Set-S11Flag -Which evaluate` (JS), `Set-S9BlockList`, the toolbar press of
  `Restore-S11Safety`; ARGS-OLD needs a scratch worktree build of `3ab9207` with its own `npm ci` (open item for the
  session agent; the row is `NOT RUN` if the old build cannot be loaded).
- No processes, no files outside the repo except the scratch draft in the session scratchpad.
