# S5-drivers-B — the liveB20 driver and the POP re-measurement rows (step report)

Step agent: Claude Opus 5.5, medium. Children: addendum builder and fixer1 (Sonnet, medium), verifier and verifier2
(Opus, medium).

## 1. Verdict

**ESCALATE** (agent-rules §3 items 1 and 6). The brief's first goal, the §4.28 addendum, was stopped by a pass-rule
contradiction that needs a ruling. Nothing has been committed. The driver slices were not started, because the brief
puts the addendum first.

## 2. Outputs

- The addendum to `docs/e2e-test-plan.md` §4.28 is **uncommitted** in the main tree. `git diff --numstat` shows 8 added
  lines and 0 deleted. It holds the R20-POP-BG-2, -FG-2 and -OTHER-2 rows. The Expected and Pass cells were pasted
  byte for byte from the original rows, and verifier2 checked them with a script.
- Leaf reports, all in this directory:
  - `S5-drivers-B-addendum-builder.md`
  - `S5-drivers-B-addendum-verifier.md` (F1 MAJOR, F2–F4 MINOR, F5 NIT)
  - `S5-drivers-B-addendum-fixer1.md` (round 1: F1–F5 fixed)
  - `S5-drivers-B-addendum-verifier2.md` (F1–F5 confirmed fixed; new N1 MAJOR; one NIT)
- Tests: 5807 before (`npm test`, run at start). No code changed.

## 3. Verifier verdicts

- verifier: FAIL, with 1 MAJOR, 3 MINOR and 1 NIT.
- verifier2: FAIL, needs a ruling, with 1 MAJOR and 1 NIT. One fix round has been used.

## 4. Deviations

None from the brief. The stage stops at its first goal.

## 5. Open decision (for the session agent and the user; not decided here)

**N1. The copied pass rule can never pass.** R20-POP-BG's expected text, which -FG and -OTHER inherit, requires B's
call on the popup to be TAB_HELD "equal in code and message" to B's control call on O. #404 copies that text
unchanged. The daemon's TAB_HELD message names the handle and the lease time (`daemon/src/intercept.ts` `checkLease`):
`tab <handle> is held by "<owner>" since <hh:mm:ss> — …`. A call on the popup and a call on O therefore never have the
same message.

The old reader enforced that clause (`recipes/s13-r20-a.ts` `popRound`, `controlSame`). That is why liveA20 printed
`held-call=ok` while the ANSWER lines read TAB_HELD. So #404's diagnosis of `held-call` as a "reader defect" is wrong:
the reader followed the sheet, and the sheet's clause is what cannot hold. Reader (1) of #404 ("held-call from the
ANSWER control", by code) contradicts the copied rule, and under agent-rules §4 the pass rule wins.

Options:
- **(a)** Compare the messages with the handle and the time masked. This amends #404's "same expected text", but keeps
  the clause's intent.
- **(b)** Compare the code only, and strike the message clause. This loosens a clause after seeing its FAIL.
- **(c)** Keep the clause and accept the FAILs. The -2 rows then fail by construction.

Each option changes a pass rule after its FAIL was seen, or knowingly keeps one that cannot pass, so it is an
integrity-floor matter (agent-rules §2), not mine to rule. If (a) is chosen, its wording belongs in a dated note
before the addendum is committed.

**Also for the gate** (from both verifiers, outside this lane): #404 says "in every leg the lease clause held". That is
false for leg `human` of R20-POP-OTHER, which printed `granted-to=none` in attempt 3. The addendum's -OTHER-2 row
already states it correctly (F1).

## 6. Findings

- N1 as above.
- verifier2's NIT: the BG-2 Steps cell keeps the old wording "read from each round's ANSWER control". Fix it together
  with the ruling.

## 7. Handoff

Nothing is running from this stage. No child is alive, and no Chrome or daemon was touched; the product daemon on
9234 was left alone.

The main tree has one tracked change, the uncommitted addendum in `docs/e2e-test-plan.md`, plus the five untracked
reports above. Once N1 is ruled, a fresh step agent can:
1. Apply the ruling's wording (and the NIT) in one fix round. Rounds used so far: 1 of 3.
2. Re-verify only those cells, then commit the addendum (the brief's first goal).
3. Start the driver slices. Planned split, at most 600 lines each:
   - **B1:** the POP reader fixes in A's code, with failing tests first; the -2 rows; the #405 `taskkill /F /T`
     override; and the 8081 preflight, which `Register-R20Blocks` already has.
   - **B2:** `s13-r20-b.ts`, with the judges for R20-0B, CHOOSE×3, G2-1 and VERSION, and their tests.
   - **B3:** `s13-win.ps1`, the `s13-r20-b.ps1` entry, slice B's RESTORE and LOGS wiring, and "How to run liveB20".

The console-new reader (#404 reader 2) has not been examined yet. B1 must establish how the window between the first
popup and the last grant is bounded when the worker-console lines carry no time.

"How to run liveB20" is not written: the driver does not exist yet.
