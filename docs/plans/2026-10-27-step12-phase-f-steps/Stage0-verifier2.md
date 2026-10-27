# Step 12 — Stage 0 verifier, round 2 (V-1 to V-5 only)

**Model / effort:** Opus 5.5, medium. **Scope:** findings V-1 to V-5 of `Stage0-verifier.md` against the fixed
`Stage0.md` (fix round 1, by the step agent). Nothing else was re-audited. No Chrome was run, no build, no daemon, and
9234 was not touched. **Read:** `Stage0-verifier.md`, `Stage0.md`, the phase doc § Stages (`:296-360`) and § STOP rules
(`:409-432`), `agent-rules.md` §4–§6, and the evidence files named below.

## 1. Verdict

**PASS-with-notes.** V-1 to V-5 are closed. The V-2 fix left one stale cell in §6 (N-1, MINOR). There are two NITs
(N-2, N-3). No fix loosens the security boundary. Every contract-level decision in §5 is still marked "for user review".

## 2. Findings re-checked

| # | Fixed text | Evidence checked | Judgement |
|---|---|---|---|
| V-1 | `Stage0.md:146-153`: the sweep detaches **every** `attached: true` tab target and ignores "not attached". It says why no filter to "this extension" is possible. It names the unmeasured detach of a tab held by DevTools or another extension for Run 19 or a scratch row before S4b. S4a's test uses a fake `getTargets` with no `extensionId`. | `stage0-m2-D.txt:47,51`: both the control and the new-worker reading give `"targets":[{"attached":true,"ext":"none"}]` while this extension held the session. `stage0-m2-src.txt:611`: `ext` is `"none"` only when `t.extensionId` is falsy, so the field was absent and not "other". The fix matches the reading. | **Closed.** The sweep runs at worker start-up, when no call is in flight, so it cannot cut off a live call. A detach only removes sessions, so nothing is loosened. |
| V-2 | `Stage0.md:155-163`: the default is now "overlapping calls keep today's answer": a second call while one is in flight answers `DEBUGGER_DEVTOOLS`, as today. Serialisation moves to **Instead of (for user review)** and quotes the STOP rule. **By:** "contract-level for the overlap answer, for user review". | The phase doc STOP rule at `:415-416`: "an existing tool answering differently on a call without the new parameters". `agent-rules.md` §4: the conservative option for a contract question is "every existing tool and test behaving identically, undoable". `stage0-m2-D.txt:43` (D5): today's second attach gets the text that `debugger-errors.ts:48` maps to `DEBUGGER_DEVTOOLS`. | **Closed, and stronger than the suggested fix.** It adopts the conservative option instead of only marking the change. A call that does not overlap gives the same answer as today, so no existing answer changes. **But see N-1.** |
| V-3 | `:21`: (i′) is "measured working as a recorded (not pre-registered) row and reproduced under a pre-written rule by the verifier (V1)". `:62`: the 1 MiB time is cited to run 4 (`jsonString1MiB`), and the row says "recorded rows, not pre-registered". `:104`: "worked as a recorded row (m1 runs 4–5)". `:68` and `:111`: the after-`await` and scriptId rows are "recorded, not pre-registered". `:70`: the B11 `about:blank` leg is a recorded row. | `Stage0-measurer1.md:30-31`: "Not pre-registered (new rows, recorded only)". `stage0-m1-B.txt:327,408-421`: run 4 has `jsonString1MiB` at 28/25/25 ms. `stage0-m3-B.txt:106-109`: `[recorded row]`. `stage0-m3-B.txt:181`: `[new row, not pre-registered]`. | **Closed.** No "passes" claim on a recorded row is left (grep of `pass` in `Stage0.md`: the hits at `:42,53,67,104,238,250,252` are all pre-registered or verifier rules). See N-2. |
| V-4 | `Stage0.md:226`: names the four overruns against the phase doc limits. Proposes a dated phase-doc note by the session agent, or else cutting each slice to its limit. | Phase doc limits: S2 ≤ ~400 at `:306`, S3 ≤ ~400 each at `:318`, S5 ≤ ~500 at `:339`, S6 ≤ ~300 each at `:349`. All four match the fixed text. Every cap is under `agent-rules.md` §7's ~600. Stage limits are phase-doc text, not a pre-registered rule as §4 defines one, so a dated note by the session agent is the right route. | **Closed.** |
| V-5 | `Stage0.md:248-252`: G6.5 asks for a separate predicate `trustedFocus(method, p)` with its own table test, and for `takesLock` unchanged. A mutant that folds trusted inputs into `takesLock` must be red. G6.6 is kept. | `daemon/test/methods.test.ts:106-117`: `takesLock` is tested with untrusted `{}` only (the `click {}` loop at `:114-116`). `daemon/src/methods.ts:83-84`: `takesLock` is today's predicate, and `focusTab` gives `true`. | **Closed.** "`takesLock` unchanged" can be checked by `git diff`, so the folding mutant is caught. See N-3 on how the mutant is detected. |

## 3. New findings from the fix

**N-1 · MINOR · `Stage0.md:217` (§6, S4a row).** The row still lists "**per-tab serialisation**" as S4a's work. The fixed
keeper decision (`:155-163`) makes serialisation the user-review alternative and makes "overlapping calls keep today's
answer" the default. A builder briefed from §6 would build the behaviour the STOP rule forbids, which is the hazard V-2
was about. *Fix:* in that cell, replace "per-tab serialisation" with "overlap answers `DEBUGGER_DEVTOOLS` as today (no
second attach)". Add the D4.2/S4a test: a second call while one is in flight answers `DEBUGGER_DEVTOOLS`, and the fake
counts one attach. This fits the phase doc's own S4a test "one attach for concurrent calls" (`:329`). Fix this before
the S4a brief is written; it does not block Stage 0.

**N-2 · NIT · `Stage0.md:62`.** The 1 MiB time comes from run 4, "the JSON-string variant" (`stage0-m1-B.txt:327`). (i′)
itself, the function by `objectId` plus the JSON string, is run 5 (`:424`). The cell cites runs 4 and 5 separately, so
the citation is honest. Still, "1 MiB in ~25 ms" was measured on run 4's variant, not on (i′) exactly. *Fix
(optional):* write "1 MiB in ~25 ms (run 4's JSON-string variant)".

**N-3 · NIT · `Stage0.md:251`.** "A mutant folding trusted inputs into `takesLock` is red on the predicate's table" holds
only if `trustedFocus` is built on `takesLock`. A change to `takesLock` alone leaves `trustedFocus`'s table green. The
mutant is still caught by "`takesLock` unchanged" (`git diff`). *Fix (optional):* add `takesLock("click", {trusted:
true}) === false` and the same for `type` and `pressKey` to the existing lock-class table, so a test also pins it.

## 4. "For user review" on the contract-level decisions (§5)

- Marked for user review:
  - B (i′) (`:106-107`)
  - the pause/terminate bound (`:116`)
  - the old-extension `features`/`VERSION` (`:125`)
  - the console read (`:134-135`)
  - the `consoleMessages` class (`:138`, `:142`)
  - the keeper's overlap answer (`:159`, `:163`)
  - E with the `JS_DISABLED` reading (`:179`)
  - G2 with `LOCK_TIMEOUT` (`:193`)
- G1 goes to the user as G12-2 (`:181-184`, `:276-277`).
- Not contract-level, and correctly "(proposed)" only:
  - the DevTools gotcha re-measure (`:168`), which keeps today's bullet
  - the plan-side corrections (`:203`)
- §8 (`:276`) sends "the contract-level proposals of §5" to the user, and that now includes the keeper.

**Security boundary:** no fix touches the gate, the token, the bind or logging. V-1 only detaches. V-2 keeps today's
answers. V-5 keeps `takesLock` unchanged.
