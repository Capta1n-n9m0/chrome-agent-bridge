# S8-verifier: the Step 12 docs change, checked against § S8 and S8.1

Claude Opus 5.5, effort medium. Read and run only; no file edited but this report; nothing committed.
Audited: the uncommitted `git diff HEAD -- docs/setup.md docs/progress-and-roadmap.md README.md` and the untracked
`S8-claude-md-proposals.md`, with `S8-builder.md` taken as claims to audit.

## 1. Verdict

**PASS-with-notes.** Findings: 0 CRITICAL, 0 MAJOR, 8 MINOR, 6 NIT. S8.1 is met. Every behaviour sentence I walked
cites a Run 18 or Run 19 row or a test file. No FAIL, NOT DISCRIMINATING or NOT MEASURED row backs a positive claim, and
the five limits named in the brief are stated as limits. Three citations say less than their sentence does (MINOR-1 to
MINOR-3). `npm test` is unchanged and `doc-check` exits 0.

## 2. Outputs (my own commands)

- **Counts.**
  - Tools: **25**. `grep -ho '"browser_[a-z_]*"' mcp/src/tools/registry.ts | sort -u | wc -l` printed 25.
  - Router methods: **28**, the keys of `METHOD_CLASSES` in `extension/src/safety.ts`, counted with awk. `consoleMessages`
    is the 28th.
  - Error codes: **27, 26 on the wire**. `shared/src/codes.ts` has 9 daemon codes, 17 extension codes and 1 SDK code.
  - These match README.md:23, the proposals file and `doc-check`'s "tools: 25 · router methods: 28 · codes: 27".
- **`npm test`:** `Test Files 235 passed (235)`, `Tests 5596 passed (5596)`, exit 0. The diff holds no test or code file
  (`git status --short` lists only the five lane files), so this is HEAD's count, and it equals the builder's.
- **`node scripts/doc-check.mjs`:** exit 0. The remaining findings:
  - stale counts at `CLAUDE.md:17`, `:18`, `:88`, `extension/CLAUDE.md:42` and `mcp/CLAUDE.md:9`;
  - the test count at `CLAUDE.md:113` (4665);
  - `docs/decisions.md` is 14834 words against a 10000 budget.

  All of these are close-out items. The CLAUDE.md files are the session agent's (agent-rules §5) and decisions.md is
  the session agent's. None falls in the builder's lane. README's earlier finding (24 tools) is fixed.
- **Lane:** only `README.md`, `docs/setup.md`, `docs/progress-and-roadmap.md` and two new steps-dir files changed. The
  roadmap diff is one hunk (`@@ -872,0 +873,25`) inside § 5's Phase F block, so the Status line and § 1 are untouched.
- **Privacy:** grep of the diff and both new files for the user's name, `Users\` and `localappdata` found 0 hits.

## 3. The limits the brief named

| Limit | Where | Stated plainly? |
|---|---|---|
| ARGS-1 sorted keys | setup.md:607-611; roadmap; proposals §3 | Yes. The cause is attributed to Stage 0 (`Stage0-measurer1.md:36-37`, which also covers today's no-`args` evaluate). See MINOR-2. |
| CON-NOTEA `Object` | setup.md:746-750 | Yes, as a limit. See MINOR-3 on what was printed live. |
| Docked DevTools did not refuse (#369) | setup.md:572-575, 1413-1416; roadmap | Yes: NOT MEASURED, and the 31 of 31 figure comes from #369 / DEVPROBE. Never claimed as a pass. |
| CHOOSE-KEPT, G2-1 causes not established | setup.md:904-906, 322-327, 1402-1404; README; roadmap | Yes, except the heading in MINOR-4. |
| CHOOSE-REFUSE `dis` (#370) | setup.md (Run 19 chooser bullets) | Yes: ND, proved by `s5a-chooser.test.ts` "the chooser's own input rules" (line 296; the disabled case is at :302). |

Spot checks of other claims against the records and the code:
- KEEP-2's control is "a refusal that drops the session at once". This matches §4.27's row (SINGLE_FILE refusal) and
  the medians 10 132 / 5 028.
- CON-FRAME's three legs match the sheet (a-pattern 2, a-nopattern 13, b-oop 2).
- G2's "500 ms after the reply" matches `TRUSTED_SETTLE_MS = 500` (`daemon/src/methods.ts:94`).
- The reload texts match `daemon/src/intercept.ts:41-45`.
- `No console messages.` and the cap marker match `sdk/src/format/console-messages.ts:7` and `:39`.
- The cap direction for the user matches #355.
- Every test file cited exists, and its named test is present. I grepped the `describe`/`it` names: B2.1, B2.2,
  "no page global" (s12-args-cdp:121), "allowed" (s12-console-gate:113), "ArmFloor … the worker's start"
  (s12-console-reduce:307-308), the source filter (:108-136), and B2.3 "never forwarded".
- The Run 18 totals (6 PASS, 6 FAIL, 1 NOT MEASURED of 13) match `S1-run-record.md` §1.
- The Run 19 totals (42/5/5/3/3 of 58 ids) match `S7-run-record.md` §1 and #373.

## 4. Findings

**MINOR-1. A citation does not test its claim.** `docs/setup.md:419`
- **Evidence:** the sentence "The client's cursor has `consoleMessages` too" cites `mcp/test/s12-console-cross.test.ts`
  C3.4 and R19-CON-MCP. C3.4 calls `tab.consoleMessages` and the MCP tool, never `client.consoleMessages`
  (lines 109-124). The claim is true in the code (`sdk/src/client.ts:474`), but no cited test or row covers it.
- **Fix:** cite `sdk/src/client.ts` or a test that calls `client.consoleMessages()`. If none exists, say "by the code".

**MINOR-2. The ARGS-1 note says the MCP leg was not judged, but it was measured and passed.** `docs/setup.md:610-611`
- **Evidence:** the doc says "the MCP's printed text was not judged here". The record (`S7-run-record.md` §1a, ARGS-1)
  shows the MCP leg `via=mcp value-equal=5 json-equal=5` at A3E:151. The MCP prints `description`, which is in the
  page's order. This is an understatement, not an over-claim, but the sentence is false.
- **Fix:** "Through the MCP the printed text kept the page's order, 5 of 5 (R19-ARGS-1, `via=mcp`); the sorted keys are
  the SDK's `value` only."

**MINOR-3. The `Object` text is stated as a live reading, but no Run 19 line prints it.** `docs/setup.md:746-750`
- **Evidence:** the record says "Cause (INV item 3 …; taken from Stage 0 and the code: no Run 19 line prints the entry's
  text)". The live row shows only `entries=2 … marker=0`: the Error's message was not in the reply.
- **Fix:** add that the `Object` reading and its cause are from Stage 0 (`stage0-m1-C.txt`) and the code, and that live
  the error's text was absent (`marker=0`).

**MINOR-4. A heading claims a defect whose cause is not established.** `docs/setup.md:904`
- **Evidence:** the bullet is headed "**Not working: two calls in a row.**", but its body and #370 say the cause is not
  established. No `change` event for an unchanged selection would fit the same reading.
- **Fix:** head it "**Not shown: a second call with the same file.**"

**MINOR-5. A miscount, and a measured point labelled "by construction".** `docs/setup.md:957`
- **Evidence:** the line says "Run 19 measured the first two points, the rest are by construction". The list now has a
  third measured bullet (CHOOSE-FRAME, RECORD). The "Turning the bridge off during the 5 s wait" bullet (:967) was
  measured too: R19-CHOOSE-DISARM PASS, `DISARMED` at `ms=5025`.
- **Fix:** name the measured bullets by row: HUMAN, LATE, FRAME, DISARM. Only the dialog-just-before point and the
  after-the-files point are by construction.

**MINOR-6. The doc contradicts itself on frames.** `docs/setup.md:163`
- **Evidence:** the tool table row for `browser_console_messages` still says "the page's frames are not read". Run 19
  read a same-site frame (R19-CON-FRAME PASS), and setup.md:733 now says so. The builder kept the row to match the tool
  description (S8-builder §4). The table is in the builder's lane, though; the description is not.
- **Fix:** amend the row with a dated note: "a frame in another site's process is not read". Keep the tool-description
  proposal for the session agent.

**MINOR-7. Old text was replaced without a Superseded marker** (docs-writing-guide rule 5).
- **Evidence:** three replacements carry no "*Superseded …: was X, because Y*" marker:
  - setup.md chooser paragraph: "(built, not yet run live; Run 19 checks it)" was deleted;
  - setup.md:957: "(by construction, not yet measured live; Run 19 checks them …)" was replaced;
  - setup.md:321: "can switch" became "could switch".
- **Fix:** add a dated Superseded marker at each place.

**MINOR-8. The proposals file misses a CLAUDE.md sentence that is now stale.** `mcp/CLAUDE.md:54`
- **Evidence:** the line still says "Focus and input are two calls, so another actor's capture in the same window can
  come between them (… not seen live)". After S6-G2 the daemon holds the lock across both, and setup.md was updated.
  The proposals file proposes the G2 fact for `daemon/CLAUDE.md` only (§5).
- **Fix:** add to §2: amend `mcp/CLAUDE.md:54` with a pointer to the daemon's hold (#338, #354).

**NITs.**
1. **The DevTools note may need confirming.** #369 says "No product or doc change is made meanwhile". setup.md:1413-1416
   adds a measurement beside the DevTools claim and deletes nothing. The brief asked for it. The session agent should
   confirm this does not cross #369.
2. **Wrong decision cited.** `docs/progress-and-roadmap.md:891` cites "#311" for back/forward staying a limit. The
   ruling that parked F is #321 (G12-0, item 5 (a)).
3. **README wording.**
   - README.md:62 says "58 rows". These are 58 row ids in 56 table rows; say "58 row ids".
   - README.md:63-64 points the known limits to `#reading-the-console` only. The limits are also under Running
     JavaScript, Uploading files and Troubleshooting.
4. **An unclear phrase.** setup.md:569, "Run 18 had read a banner on those rows 3.3 s apart", has no meaning a reader
   can recover. Drop "3.3 s apart" or explain it.
5. **A plan in a CLAUDE.md proposal.** Proposals §6's last bullet (the #373 re-measurement wave) is a follow-up, not a
   gotcha. It already lives in the phase doc's Follow-ups and does not belong in `recipes/CLAUDE.md`.
6. **Small omissions.**
   - setup.md:322 and the README say the hold covers "a trusted click, type or key press". The code exempts
     `focusEmulation: true` (`daemon/src/methods.ts:102`).
   - The roadmap block ends with two blank lines.

## 5. The proposals file (check 3)

- **Old text exists verbatim:**
  - `CLAUDE.md:17-18`, `:88`, `:113`;
  - `mcp/CLAUDE.md:9`, `:52` ("the 24 tools");
  - `extension/CLAUDE.md:42` ("all 27 router methods").
- **Code anchors exist:**
  - `sdk/src/error.ts:119-128` (the three refusal lines);
  - `daemon/src/intercept.ts:41-45` (the two hints);
  - `TRUSTED_SETTLE_MS` in `daemon/src/methods.ts:94`;
  - `consoleMessages` "lease-checked, no visibility lock" at `daemon/src/methods.ts:33`;
  - the hello features test, `extension/test/s12-args-call.test.ts:203-204`;
  - "exactly eight values", `sdk/test/s12-console-format.test.ts:37`;
  - the `console.` scan, `sdk/test/failure-report.test.ts:899-906`.
- **Gotcha candidates against the decisions:**
  - #364 and #365 (junctions; `cmd //c` against `cmd /c`), #366 (control-2's kind; the MCP actor's wait), #367 (window
    titles), #368 (`{css:"body"}`, the `Chrome` menu button, windows left after a STOP), #369 (docked DevTools; the
    Chrome 156 menu facts), #370 (the disabled `click()`), #371 (`Save-R19Seg` and `Close-S11Window`): each traces to
    its entry.
  - #373's three close-out gotchas are all proposed: the missing preview (extension), sorted keys (sdk), and the MCP's
    own code lines (mcp).
- **Gaps:** MINOR-8 and NIT 5.

## 6. Handoff

The fixer touches only `docs/setup.md`, `README.md`, `docs/progress-and-roadmap.md` and `S8-claude-md-proposals.md`,
for MINOR-1 to MINOR-8. The NITs are optional. The doc-check count findings and the decisions.md budget stay with the
session agent's close-out. No process was left running.
