# S7-sheet verifier 3 report: re-check of V2-1..V2-4 after fix round 2 (§4.25)

Claude Opus 5.5, medium effort. 2026-10-27. Read and run only. I edited nothing except this file and made no commit.
Scope: findings V2-1 to V2-4 of `S7-sheet-verifier2.md` against `docs/e2e-test-plan.md` §4.25 (lines 1677–1716,
uncommitted), and the lines the fix touched. Read: `S7-sheet-verifier2.md`, `S7-sheet-fixer2.md` (claims to audit),
`extension/src/handlers/tabs.ts:85-100`, `extension/src/newtab-open.ts:85-105`, `extension/src/errors.ts:20-33`,
`extension/src/handlers/navigate.ts:10-20`, `recipes/s11b.ts:670-740`.

## 1. Verdict

**PASS.** V2-1 to V2-4 are resolved. The touched lines introduce no new finding. Exit checks hold.

## 2. Commands and outputs

- `git diff --stat`: `docs/e2e-test-plan.md | 40 ++++++++++++++++++++++++++++++++++++++++` (1 file, 40 insertions).
- `git diff docs/e2e-test-plan.md | grep -c '^-[^-]'` → `0`. One hunk, `@@ -1674,6 +1674,46 @@`. §4.25 runs from
  line 1677 to line 1716, and `## 5. Results template` is line 1718. §4.24 and Run 17's §5 record are untouched.
- `node scripts/doc-check.mjs --files docs/e2e-test-plan.md`: `tools: 24 · router methods: 27 · codes: 27`,
  `Checked 1 living docs (0 closed phase docs skipped for paths and status).`, `EXIT=0`.
- Grep for `JavaScript URLs are not allowed`: besides the sheet and verifier 2, the text appears in
  `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-run-record.md:84`. The pre-written Chrome text therefore has a
  measured source; it was not invented.

## 3. Per finding

| # | Was | Now |
|---|---|---|
| V2-1 | MINOR | **Resolved** |
| V2-2 | NIT | **Resolved** |
| V2-3 | NIT | **Resolved** |
| V2-4 | NIT | **Resolved** |

**V2-1** (line 1704, R17B-NEWTAB-REFUSED).

The expected code now matches the code path:
- `handlers/tabs.ts:95`: the `newTab` navigate step is `navigate: async (tabId) => void (await chrome.tabs.update(tabId, { url }))`, with no wrapping.
- `newtab-open.ts:96-101`: the navigate step runs in a `try`, and its `catch` removes the tab and then calls `throw err` unchanged.
- `errors.ts:31`: `if (err instanceof Error) return { code: ErrorCodes.INTERNAL, message: err.message };`.
- `handlers/navigate.ts:15-18` is where `NAV_FAILED` comes from: `throw new BridgeError(ErrorCodes.NAV_FAILED, message, …)`. The `newTab` path does not use it.

The row now pre-writes `INTERNAL` with Chrome's `javascript:` text, cites those lines, and attributes `NAV_FAILED` to
the `navigate` handler. Whether Chrome rejects with a plain `Error` is "recorded, not predicted", and any code is "no
mismatch". These are honest hedges on a RECORD row, and they give a forbidden-fix reader no reason to change a code.

The TABWATCH listener is now started where the row reads it. The Steps cell opens with "The console listener started
(`TABWATCH`)" and ends with "the listener read". `TABWATCH created-url` is RECORDed, with `about:blank` expected
because the path was reached.

The gate-refused branch is now NOT MEASURED:
- The Expected cell says "the judged clause is NOT MEASURED (path not reached), not a pass".
- The Pass rule cell says "On the gate-refused branch this clause is NOT MEASURED (path not reached)".

Both cells now agree with the preamble's "`NOT MEASURED` never counts".

**V2-2** (line 1716, R17B-LOGS). The stale "(e)" is gone. The row now says "it scans the console input of R17B-0 (f)
and of the `TABWATCH` listeners too". That matches the console inputs that exist after F1: (e) reads the disk, and (f)
together with the TABWATCH rows run in the console.

**V2-3** (line 1713, Helpers item (2) and item (4)).

Item (2) now says "the R17B judges print a STOP line for a non-`ok` answer of R17B-ACT-CTL, R17B-FWD's first
`forward`, R17B-BACK-SAMEDOC and R17B-BACK-EMPTY, including the first call of a `--times 2` pair". It cites the
existing FAIL-only behaviour, and I checked that behaviour against `recipes/s11b.ts`:
- The first-of-two case: `:695` reads `if (i < times && last.err) return judged(row, j17(false, \`the first ${op} did not answer ok\`))`. There is no `stop`.
- The RD-BACK-EMPTY case: `:705` returns `j17(false, \`answer ${reply.code}, not ok\`)`. There is no `stop`.

The sheet's "~690" and "~701" are approximate, and they point at the right code. Item (4) adds the test "the STOP line
for a refused target call (including the first of a `--times 2` pair)".

The STOP set in item (2) matches the STOP sentence at line 1686:
- Every target call is covered: ACT-CTL, FWD's first forward, SAMEDOC and BACK-EMPTY.
- The set-up backs are covered by the separate `--activate` STOP.
- R17B-BACK and FWD's second forward are correctly left out, because they keep FAIL-and-continue.

**V2-4** (line 1696, R17B-0 (f)). The `b0` tab is now closed (`closeTab`) at the end of R17B-0, "recorded and not
judged (else the runner's close at the end)". This is optional cleanup and changes no judgment.

## 4. New findings in the touched lines

None. Checked:
- No new contradiction with §4.25's preamble or with the STOP sentence.
- The NEWTAB-REFUSED Pass rule still judges only the tab count and the leftover-blank clause, plus NOT MEASURED on the gate branch.
- No pattern, token or non-fixture URL is printed.
- The cited line numbers resolve to the code described.

Verifier 2's side note that no op prints "no `about:blank` row is left" was left as is by the fixer. That is
acceptable: the total-count equality covers it, as verifier 2 itself said.

## 5. Exit criteria

- V2-1 to V2-4 resolved: yes.
- Insertions only, inside §4.25: yes (0 deletions; one hunk ending before line 1718).
- doc-check exits 0: yes.

## 6. Handoff

No process started; nothing to kill. Verdict **PASS**. The stage may go to its committer.
