# S7-record: step report (Run 19's record)

Step agent: Claude Opus 5.5, medium. Docs only; read-only investigation (no code edit, no live run, no Chrome, no daemon,
no port 9234). Model choice (stated, as the brief allowed): the cause readings needed code judgment, so they went to an
**Opus investigator** first; the record itself is docs and went to a **Sonnet builder** with those readings; fixers Sonnet;
every verifier Opus; all at medium effort.

## 1. Verdict

**DONE.** Verifier chain: round 1 **FAIL** (1 MAJOR, 5 MINOR, 2 NIT) → fix round 1 → round 2 **PASS-with-notes** (1 MINOR,
3 NIT) → fix round 2 (MINOR-A, NIT-A, NIT-B) → round 3 **PASS-with-notes**. Two fix rounds of three.

## 2. Outputs

- `S7-run-record.md` (Run 19 judged against §4.27 as amended by #358–#366, with the rulings below), and the Run 19 entry in
  `docs/e2e-test-plan.md` §5 (one hunk, +89 / −0, after Run 18's entry).
- Children's reports: `S7-record-investigator.md`, `S7-record-builder.md` (its totals predate fix round 1; the record and
  `S7-record-fixer.md` hold the current ones), `S7-record-verifier.md`, `S7-record-fixer.md`, `S7-record-verifier2.md`,
  `S7-record-fixer2.md`, `S7-record-verifier3.md`.
- Commit: see Handoff.

**Totals** (re-added by verifier round 2 from the record's §1e): row level, 58 ids (56 table rows; one row holds F-RAW,
F-RAW-2, F-RAW-DIR): **PASS 42, FAIL 5, NOT DISCRIMINATING 5, NOT MEASURED 3, RECORD 3, NOT RUN 0**. Slice-rows (74): PASS 58,
FAIL 5, ND 5, NOT MEASURED 3, RECORD 3 (A 26, B 19, C 21, D 4, E 4). liveB19 att 2 and att 3 read the same on every row.

| Row | Verdict | One-line cause |
|---|---|---|
| R19-ARGS-1 | FAIL | SDK `value-equal=4`: Chrome's `returnByValue` sorts object keys (Stage 0 measured, pre-existing); page receipt exact (`json-equal` 5/5); control-2 PASS by #366 (`kind=undefined` on both builds) |
| R19-ARGS-3 | FAIL | the sheet's expected text wants the extension's message in the MCP text, which the MCP never prints (it prints its own `JS_DISABLED:` line); the reader follows the sheet, so FAIL by #195; effect counter 1 → 1 |
| R19-CON-NOTEA | FAIL | product: replayed console args carry no preview, so an object holding an Error reaches the agent as `Object` (no URL or stack leaked) |
| R19-CHOOSE-KEPT | FAIL | `change` 1 where 2 is wanted; cause not established |
| R19-G2-1 | FAIL | B's screenshot TIMEOUT ~35 s in both variants; cause not established (covered-window hang fits, not shown) |
| R19-CON-4 | ND | MCP leg: the reader looks for the extension's message; the MCP prints its own `DISARMED:` line |
| R19-ARGS-OLD | ND | MCP leg: a rethrown non-safety error is the bare hint text, no code on line 1, so `mcpCodeOf` reads `ERROR`; other five legs PASS |
| R19-VERSION | ND | MCP leg: same mechanism with the chooser hint (`hint=yes exact=yes files=0`) |
| R19-CON-FLOOR | ND | the driver waited 3 s / 2.5 s, not #361's amended 5 s / 3.5 s, so the ≥ 3 precondition was not reached; the floor held (0 disarmed entries returned) |
| R19-CHOOSE-REFUSE | ND | leg `dis`: `click()` on a disabled input does nothing (HTML spec), so the refusal is unreachable on that page (#370) |
| R19-UP-DEVT, -KEEP-4, -SWEEP-HELD | NOT MEASURED | DEVPROBE `answer=ok attached=no`: docked DevTools on Chrome 156 did not make `chrome.debugger` refuse (#369) |

**Exit checks:** R7.1 met (§4.27 rows `a1b8544`, last pre-run note `ed6abbc` 22:04:50Z before the first evidence line 22:07:34Z;
#366's note is disclosed as after observation); R7.2 met (each slice's `LOADED … args=answered`, line 107 of each judged
evidence file; D also proved the old build); R7.3 met (every feature row judged by its rule; CHOOSE-4 legs a–c
`after-click=1 after-close=0`); R7.4 met (all five slices `hash=equal`, `RULES 0`, `native=0 devtools=0`); R7.5 met (five
`ROW R19-LOGS PASS`, control line in each last segment); R7.6 met (four STOP events, each matched to one return and one
ledger return). Sources line by line: the record's §3.

## 3. Verifier verdict

`S7-record-verifier3.md`: **PASS-with-notes** (final). Round 1 (`S7-record-verifier.md`) re-derived every FAIL, ND and NOT
MEASURED and ten seeded-random PASSes across four slices: one MAJOR (ARGS-3 had been taken ND in the result's favour; the
step agent ruled FAIL by #195) and five MINOR (G2-2 judge citation, the row-count explanation, CON-FLOOR wording, two factual
errors in the §5 entry, KEEP-1's `poll-ms=280` against `≤250` wording), two NIT; all fixed (round 2 confirms). Round 2's
MINOR-A (the user's name spelled out in round 1's report) and two NITs fixed (round 3 confirms). Carried notes: the
builder's report keeps the pre-fix totals (historical); two verifier lines list the path and mail scan patterns literally
(no real path or address; counts 1, optional rewording).

## 4. Deviations

- The brief listed CON-FLOOR's FAIL as `in-reply-disarmed=0`; the investigator showed that is the passing value and the
  FAIL is on the page's window counts (`disarmed-ticks=2`, `exc-disarmed=1`). Judged ND on the instrument (#361's waits
  not used), never PASS.
- ARGS-1: the investigator classed it H (ND). Where the rule is ambiguous ("0 of the 5 differing in key order") the step
  agent chose against the result (the S1 precedent): FAIL with the cause named; the ND reading is in the record §7 and §6.
- ARGS-3: the brief grouped it with the ND MCP legs; its reader follows the sheet's own expected text, so it is FAIL by #195.
- KEEP-1 stays PASS on its answers; the banner-gap clause is not measured at the sheet's resolution (`poll-ms=280` vs
  `≤250`), stated in the record.

## 5. Proposed decisions

In the record's §6 (agent-rules §5 form, "By: Claude (proposed)"): (1) ARGS-1: keep FAIL and put the sorted-keys fact to the
user (which reading of "key order" holds is for user review); (2) CON-NOTEA: product finding; a later wave adds a
live-logged-object leg; (3) a recipes-only later wave re-runs, as new row ids, ARGS-3 (corrected expected text), CON-4,
ARGS-OLD and VERSION (MCP texts read by the MCP's own lines), CON-FLOOR (with #361's waits), CHOOSE-KEPT (a second file) and
G2-1 (with window geometry recorded); (4) the DevTools premise stays open for the user (#369); Run 18's banner-seen
findings marked not reproduced with 20 s idle; (5) gotchas at the close-out: replayed console args carry no preview
(`extension/CLAUDE.md`); `evaluate`'s `value` has sorted keys while `description` keeps page order; a reader rule for MCP
text (`sdk/src/error.ts` lines, `mcpCodeOf`).

## 6. Findings (for the user)

1. `evaluate`'s returned `value` has sorted object keys (Chrome `returnByValue`; Stage 0 measured; pre-existing); ARGS-1 FAIL.
2. A console object logged before `consoleMessages` reaches the agent as `Object`, its contents lost (replay has no preview); CON-NOTEA FAIL.
3. Docked DevTools on Chrome 156 does not make `chrome.debugger` refuse the bridge; the `DEBUGGER_DEVTOOLS` path may be unreachable as written (#369).
4. CHOOSE-KEPT: two chooser calls with the same file left `change` at 1; cause not established.
5. G2-1: B's screenshot timed out (~35 s) while A held the lock; G2-2 with the same set-up answered 15 of 15; cause not established.
6. Run 18's banner `seen` on the refused-upload rows did not reproduce with 20 s idle and a passing control (cause not shown).
7. Known limits now measured: CHOOSE-HUMAN (the file goes to the input the human opened), CHOOSE-LATE (4 900 ms `ok`, 5 100 ms `TIMEOUT`), CHOOSE-FRAME (same-origin frame reached), CON-CAP keeps the oldest lines (#355, open for user review).
8. The MCP prints no code for a non-safety, non-attach error, and its safety lines are the SDK's own; four legs were read against texts the MCP does not print (a reader rule for later waves, not a product defect).

## 7. Handoff

Nothing running; no process, port or window touched. Committer (Sonnet) commits the lane files below. The session agent
rules the §6 proposals, especially ARGS-1's reading (user review) and the later-wave re-run; S8 docs follow.
