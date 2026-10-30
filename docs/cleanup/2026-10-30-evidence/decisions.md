# Cleanup pass 2026-10-30 — area: Decisions

Area cleaner (Opus, medium). Scope: `git diff 815255a..HEAD`, `docs/decisions.md`, `docs/decisions-archive/`, and Step 13
`#N` citations (#375–#419) across committed docs. Read only; this file is the only write.

**Checked and clean (no finding):**
- Numbering: every heading number #1–#419 exists exactly once across `decisions.md` and the archive (script over the
  `### … (#N)` headings); the one gap, #265, is the documented one (index row `step11.md`: "#230–#264, #266–#288").
  The Log holds #375–#419 with no gap or duplicate.
- Archive index (`decisions.md:190-199`): every row's range and entry count match its file (step6 37 incl. #2b, step7
  33, step8 58, step9 74, step10 28, step11 58, step11b 32, step12 54).
- `#374 item N` citations in Step 13 entries match #374's numbered items (#376 item 1, #377 item 4, #378/#387 item 5,
  #379 items 6–7, #380 item 7, #383 items 11 and 1–7, #398 item 6). #417's history cites (#349, #370) are the
  screenshot-path entries in `step12.md:508` and `:106`.
- About 45 Step 13 citations spot-checked in `CLAUDE.md`, the package `CLAUDE.md` files, `README.md`, `docs/setup.md`,
  `docs/progress-and-roadmap.md`, `docs/e2e-test-plan.md` §4.28 and the Run 20 record, and the phase doc: each resolves
  to the right entry. No skill cites #375 or later.
- The phase doc's § As built decision lists (Stage 0 #384–#393, S1 #394–#395, S2 #396–#397, S3b #398, S4 #389–#390,
  S5 #399–#419) match the Log.

## Findings

1. **`docs/decisions.md:12` — Open decisions opens with "None." above five open items.**
   - Wrong: "None. The user ruled Step 12's gate on 2026-10-29 (#374, …); every item listed here before was settled by
     it." Lines 16-30 then list #385, #389, #417, #419 and R20-ARGS-ORDER, and `CLAUDE.md:23` says "The gate is stopped
     and waits for the user (`docs/decisions.md` Open decisions …)".
   - Fix: replace the first sentence with "Step 12's items were settled by the user's ruling of 2026-10-29 (#374,
     `decisions-archive/step12.md`). Step 13's gate waits for the items below." Keep the scope sentence.
   - Type: mechanical (stale status wording).

2. **`docs/decisions.md:15` — one lead-in labels all five items "contract-level … the run goes on with the conservative
   option".**
   - Wrong: that is true of #385 and #389 (built conservatively, Stage 0). #417, #419 and R20-ARGS-ORDER are rulings on
     Run 20's record and the gate's R5.4/R5.5 (phase doc Gate checklist, `…-followups.md:441-447`: "R5.4 and R5.5 wait
     for the user's rulings on #417 and #419 (and R20-ARGS-ORDER)"); nothing "goes on" for them, the gate is stopped.
   - Fix: two lead-ins: "Contract-level (built with the conservative option):" over #385, #389; "Run 20's record and
     the gate (R5.3–R5.5; the gate is stopped until these are ruled):" over #417, #419, R20-ARGS-ORDER.
   - Type: mechanical.

3. **Open items differ between `docs/decisions.md` and the run record.**
   - `…-steps/S5-run-record.md` §7 "Held or open for the user" and `docs/e2e-test-plan.md:3768` ("Open for the user
     (record section 7): … G1's human leg, #374 item 3") list "**G1.4** is met on R20-POP-BG-3 as the user ruled in
     #407; whether the unmeasured human leg needs another route is open." `docs/decisions.md` Open (lines 15-30) has no
     such line; `CLAUDE.md:23-27` neither. (#407's Revisit-if, "the `human` leg shows a popup opened and leased to
     nobody", is not met: R20-POP-OTHER-3 is NOT MEASURED, no popup opened.)
   - Also `docs/progress-and-roadmap.md:5` and `:174` list the gate's open items as #417, #419, DIALOGS,
     R20-ARGS-ORDER, #374 item 3, without #385 and #389, which `decisions.md:16-19`, `CLAUDE.md:27` and the phase doc
     (`…-followups.md:419-420`) list.
   - Fix: either add one Open line ("G1's human leg: R20-POP-OTHER-3 NOT MEASURED, no popup opened in 3 clicks; leave it
     to the phase doc's Follow-ups ('Whatever Run 20 leaves NOT MEASURED …') (recommended) or measure it by another
     route"), or move it to the phase doc's Follow-ups and drop "open" from the record's wording; add #385, #389 to the
     roadmap's two lists (State area's call).
   - Type: whether the human leg is a decision for the user is needs-the-user (or the lead's call); the roadmap
     addition is mechanical.

4. **`docs/decisions.md:29-30` — the R20-ARGS-ORDER Open line has no source.**
   - Every other Open line points to a Log entry; this one has none and says only "#401 makes the `ref` leg RECORD but
     the row may read PASS". The conflict is written up in `…-steps/S5-run-record.md` §7 "Source conflicts" item 1
     (`finish(R, [PASS, RECORD, RECORD])` in `recipes/s13-r20-a.ts`; alternative tally PASS 21, RECORD 1).
   - Fix: append "(`…-steps/S5-run-record.md` §7, conflict 1)".
   - Type: mechanical.

5. **`docs/decisions.md:535-540` (#389) does not say it waits for the user, though Open lists it.**
   - Entry: "**By:** Claude (Stage 0 decides, per the phase doc's 0.6)". Open, line 19: "#389, the chooser text. Option
     (a) … (recommended); (b) a new code." Phase doc Stage 0 as built (`…-followups.md:349`): "**Needs the user:** #385
     (G1's shape) and #389 (chooser text) at the gate." #385's entry (line 570-571) says "**for the user's review at the
     gate**"; #389's does not.
   - Fix: end #389's By line with ", for the user's review at the gate (built as option (a), S4)".
   - Type: mechanical.

6. **Replaced, withdrawn or narrowed entries carry no pointer to what replaced them.**
   - #376 (`decisions.md:616-620`) still reads "the popup lease from `webNavigation`'s `sourceTabId`, as one field or a
     late event"; #385 (line 562): "#376 replaced." The note at lines 580-582 ("Each holds as written … until Stage 0 or
     a later entry changes it") covers #375–#383 only in general.
   - #404 (lines 424-435): "In every leg the lease clause held"; "New rows `R20-POP-BG-2` … run in liveB20"; "G1.4 is
     judged on both sets at the gate." #406 (lines 403-409): "no `R20-POP-*-2` rows run in Step 13 … #404's 'in every leg
     the lease clause held' is corrected to: in legs `bg`, `fg` and `third`"; #407: "G1.4 is judged on R20-POP-BG-3".
     #404 is outside the 580-582 note, so nothing in it warns the reader.
   - #386 (lines 554-559): "a value without the envelope's own keys and types falls back as today (a page's `toJSON` hook
     controls the string)". #396 (line 487): "#386 narrowed: the wrapper's own JSON writer calls no page `toJSON`, so a
     hooked object no longer falls back". Also outside the 580-582 note.
   - #406 (lines 413-414): "G1.4 goes to the user at the gate with this evidence" — ruled the next day by #407.
   - Precedent in the same Log: #405 carries "As built (S5-drivers-B2, amended 2026-10-30 by #408): …".
   - Fix: one dated line at the end of each: #376 "*Replaced 2026-10-29 by #385.*"; #404 "*Withdrawn 2026-10-29 by #406
     (no -2 rows ran; the lease-clause sentence corrected there); G1.4 judged on R20-POP-BG-3 by #407.*"; #386
     "*Narrowed 2026-10-29 by #396 (no page `toJSON` reaches `value`).*"; #406 "*Ruled 2026-10-30 by #407.*". Optionally
     the same for #375 (→ #384), #377 (→ #386), #378 (→ #387), #379 (→ #388), #380 (→ #389), #381 (→ #390), #382
     (→ #391), so a reader landing on one by number sees it.
   - Type: mechanical (pointers only; no decision text changes).

7. **Two Revisit-ifs look met and are not noted.**
   - #413 (line 311): "**Revisit if:** liveC20 shows the DevTools UIA names differ"; #418 (line 225): "the dock-side
     reader read `unread` twice: #413's Revisit-if is met."
   - #416 (line 275): "**Revisit if:** liveC20 reads the side." #419 (lines 212-213): attempt 2 read R20-DEVT-UNDOCK PASS
     and R20-DEVT-EARLY PASS, which need a read side (the lead should confirm in the liveC20 attempt-2 record before
     writing it).
   - Fix: "*Revisit-if met 2026-10-30: #418.*" on #413; on #416, only after the record confirms, "*Revisit-if met
     2026-10-30 (liveC20 attempt 2, #419); rule (1) kept for later runs*" or whatever the lead finds.
   - Type: mechanical for #413; #416 mechanical once confirmed.

8. **#395 binds every later brief but sits in no rule file and not in Standing.**
   - #395 (lines 495-501): "a verifier or builder proves a test red on the pre-slice code, or runs a mutant, only in a
     scratch git worktree … never by reverting, moving or editing files in the main tree … **Revisit if:** never; it
     binds every later stage brief." #402 (line 449-450) records a breach "so the next briefs repeat the rule". `grep`
     of `docs/agent-rules.md` and `.claude/skills/*/SKILL.md` finds no "#395" and no mutant/main-tree rule; Standing
     (lines 38-60) has no line for it. When Step 13's entries move to the archive, nothing in a briefed file will carry it.
   - Fix: a Standing line under "How we work": "2026-10-29 · S1: mutants and pre-slice runs never touch the main tree
     (#395) — `decisions.md` Log (Step 13)"; and the rule itself in `agent-rules.md` (§7 or §10, beside #220's worktree
     rule).
   - Type: the Standing line is mechanical; the `agent-rules.md` text is needs-the-user (a rule change).

9. **Standing has no product promise from Step 12, and Step 13's will need lines at its close.**
   - Standing's product sections (lines 62-184) end at Step 11b (#311, #308); the only Step 12 lines are #321 and #374
     under "How we work". Step 12 built promises that still bind (the console cap's direction, now #374 item 6 / #398;
     the kept debugger session; `uploadFiles {chooser}`; G2's blocking trusted input). The 2026-10-29 pass raised the
     same gap (`docs/cleanup/2026-10-29-evidence/decisions.md` finding 6) and added only #321.
   - At Step 13's close (not now), the candidates are #385 (what `tabCreated.openerTabId` means), #386/#396 (key order,
     no page `toJSON` in `value`), #387 (CON-NOTEA a documented limit), #389 (the chooser-busy text), #398 (the cap
     marker), #407 (G1 judged on R20-POP-BG-3).
   - Fix: the user picks which Step 12 promises get Standing lines; the Step 13 lines go in with the archive move.
   - Type: needs-the-user (which entries are standing is a judgment).

10. **`CLAUDE.md:28` — `docs/decisions-archive/step13.md` (doc-check "Dead paths").**
    - Text: "**Next:** the user's rulings, then Step 13's close (decisions to `docs/decisions-archive/step13.md`) and a
      minimal Phase G". Judgment: the sentence makes it clear the file is the planned destination after the ruling
      ("then Step 13's close"), so a reader is not misled; only the script is.
    - Fix (optional): "(its decisions move to a new `decisions-archive/step13.md`)", or leave it and record the hit as
      expected in the report. Do not create the file now.
    - Type: mechanical, optional.

Raised: 10. Mechanical: 1, 2, 4, 5, 6, 7, 10, and the Standing line of 8 and the roadmap part of 3. Needs the user: 3
(the human-leg question), 8 (the rule text), 9.
