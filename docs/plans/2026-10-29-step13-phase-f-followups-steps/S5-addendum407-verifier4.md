# S5-addendum407 verifier report, round 4

Model Opus, effort medium. I only read files and ran commands; the only file I wrote in the repo is this report. I ran
no Chrome, daemon, fixture, `npm test` or build, and read no raw run record. I re-checked only the items round 3
raised (MAJOR-D) and the cell diff, in the uncommitted note at `docs/e2e-test-plan.md:2002` and rows 2006-2008 (HEAD
`39b51cd`), against #407 (`docs/decisions.md:221`), round 3's report and the fixer's claims in
`S5-addendum407-fixer3.md`.

## 1. Verdict

**PASS-with-notes.** MAJOR-D is fixed. Rows 2006-2008 are unchanged since round 3. The numstat is `8 0`, the scan is
clean and doc-check shows nothing new. I found three new NITs, all for the B4 driver, and none needs a plan edit.

## 2. Outputs

- This report. Scratch files only (not in the repo): `celldiff.py`, `out-r3.txt`, `out-now.txt`, `dc.txt` in the
  session scratchpad.

## 3. Verifier verdict

Not applicable (this is the verifier).

## 4. Deviations

None. Round accounting: `S5-addendum407-fixer3.md` was the stage's third fix round, on Sonnet, and that is allowed
(§7). Round 3's handoff said "a fourth fix round must run on an Opus fixer", but the round that followed was the third.
Since this verdict is not FAIL, no fourth round is needed.

## 5. Proposed decisions

None.

## 6. Findings

### Item 1: MAJOR-D, re-checked: fixed

The new spans at l.2002, quoted from `sed -n 2002p docs/e2e-test-plan.md`:
- **Precedence span:** "the clause can pass only on a capture that shows the worker's lines (a count above 0 fails it
  on any capture)".
- **Print rule:** "`console-join` and `console-url` always print their counts, and a count above 0 is a FAIL whatever
  the control reads; if the control does not hold, `unread` replaces only a count of 0, and then turns a leg that would
  otherwise PASS into NOT MEASURED (a stated instrument limit)."
- **Verdict order:** "Every other clause is judged first: a STOP or a FAIL stands whatever the console reads; a round
  with `popup-opened=yes` and `granted-to=none` is a FAIL whatever the console reads."

**The checks the brief asked for:**
- **A count above 0 is printed and FAILs whatever the control reads:** yes, stated twice (the precedence span and the
  print rule).
- **`unread` replaces only a 0:** yes ("replaces only a count of 0").
- **`unread` changes only a would-be PASS:** yes ("then turns a leg that would otherwise PASS into NOT MEASURED").
- **The spans agree with the line form:** `console-join=<n or unread> console-url=<n or unread>` fits: n is printed
  whenever it is above 0, or when it is 0 and the control holds; `unread` is printed only for a 0 under a failed control.
  The "expected on a passing leg" text, `console-join=0 console-url=0`, can be met only when the control holds, which
  agrees with "can pass only on a capture that shows the worker's lines".
- **The fixer's claims hold:** the old and new spans in `S5-addendum407-fixer3.md` §2 match the file.

**A whole read of l.2002 for contradictions from rounds 1-3:**
- **Can a FAIL #407 orders print as NOT MEASURED or PASS?** No.
  - The lease FAIL, the `held-call` FAIL (clause 1 and leg `human`'s "a `held-call` not as clause (1)"), the STOP
    `popup-lease-wrong` and the human `granted-to=none` FAIL are all judged before the console ("Every other clause is
    judged first").
  - Clause (2)'s own FAIL (a count above 0) now stands whatever the control reads.
  - `unread` touches only a 0 count under a would-be PASS.
- **Can a clause of #407 no longer pass on a correct build?** No.
  - Clause (1) is unchanged since round 3.
  - Clause (3) is unchanged. It passes on 3 of 3 opened rounds.
  - Clause (2) can pass on a correct build. Round 3's item 2 showed that the liveness control can rise in every leg
    that can PASS, and that BG-3 cannot read `unread` by construction; that argument is untouched by this edit.
  - **URL match on a correct build:** I checked whether the whole-capture URL match could hit on a correct build
    through the slice's own typed worker-console text. It does not. R20-0B's typed expression (`recipes/s13-r20.ps1:46`,
    the `R20READ` string) holds `chrome.runtime.getManifest().permissions…`, `chrome.webNavigation…` and
    `chrome.management.getSelf()`, and no `localhost:`, `e2e-playground.html?popup` or `popup=1`. Product code never
    logs a URL (root `CLAUDE.md` § Invariants; `extension/test/log-scan.test.ts`).
- **The two `unread` sentences agree.** Clause (2)'s "no `unread` from a shifted list" means that the content check
  itself never yields `unread`. The liveness control is the only source of `unread`, and the note says so. No
  contradiction.

### NIT-G (new): "always print their counts" next to "`unread` replaces only a count of 0"

- **Where:** `docs/e2e-test-plan.md:2002`, the print rule.
- **Evidence:** read alone, "always print their counts" conflicts with the next clause, where `unread` replaces a 0.
  The line form (`<n or unread>`) and the clause that follows settle the meaning, so a driver cannot misread it.
- **Suggested fix:** none in the plan. B4 implements round 3's NIT item 12 as written.

### NIT-H (new): the unreadable-capture case is not stated in the note

- **Where:** l.2002. Round 3's suggested sentence ended "(or a capture cannot be read)". The fixer left that part out.
- **Evidence:**
  - If the after-leg capture cannot be read, there is no join or URL count at all. So no count above 0 can be hidden,
    and `unread` is the only honest print. This is not a hidden FAIL.
  - If only the before-leg capture cannot be read, the content counts still come from the after-leg capture, and a
    count above 0 still FAILs.
- **Suggested fix:** none in the plan. B4 implements round 3's NIT item 14. When the after-leg capture is unreadable,
  B4 prints `unread` for both counts and gives NOT MEASURED. It never gives PASS.

### NIT-I (new): a join or URL line from an earlier leg also counts in every later leg

- **Where:** l.2002, "no worker-console line printed during the leg" next to "judged over the whole capture as saved
  after the leg".
- **Evidence:** the whole after-leg capture still holds lines printed in earlier legs and earlier rows, as long as they
  are still rendered. One matching line in BG-3 can therefore FAIL FG-3 and OTHER-3's legs too. This errs toward FAIL,
  so it flatters nothing, and BG-3 (G1.4) runs first, so its verdict is its own. Round 3 accepted the whole-capture
  rule (MINOR-C).
- **Suggested fix:** none in the plan. B4 writes, in the evidence file (round 3's NIT item 15), the leg where a count
  first rose above 0. A later FAIL that carries an earlier one can then be told apart from a fresh one.

### Item 2: cell diff, numstat, scans, doc-check

**Cell diff.** I ran round 1's SCRIPT section (`S5-addendum407-verifier-diff.txt` l.5-43) as `celldiff.py` with
`python -I celldiff.py docs/e2e-test-plan.md`. I compared its output with the FULL CURRENT OUTPUT section of
`S5-addendum407-verifier3-diff.txt` (l.41 to the end).
```
exit=0
$ diff --strip-trailing-cr out-r3.txt out-now.txt
diffexit=0
```
Rows 2006-2008 are unchanged since round 3. The fixer's claim "Rows 2006-2008: unchanged" holds.

**Numstat.**
```
$ git diff --numstat docs/e2e-test-plan.md
8	0	docs/e2e-test-plan.md
```

**Path and name scan.** I took the added lines of `git diff -U0 docs/e2e-test-plan.md`, stripped the URL scheme, and
grepped case-insensitively for a drive path, `Users/`, `AppData`, and the user's and the git user's names. Exit 1, no
match.

**doc-check.** `node scripts/doc-check.mjs` exits 0. It lists the same three standing items as round 3, and nothing new:
- the code counts (tools 25, router methods 28, codes 27);
- `CLAUDE.md:114 5596 passed`;
- `docs/plans/next-session-prompt.md:15`.

It checked 38 living docs.

### NITs the B4 driver must implement exactly

Round 3's merged list carries forward unchanged by reference: `S5-addendum407-verifier3.md` § 6, "NITs the B4 driver
must implement exactly (rounds 1, 2 and 3 merged)", items 1-15. Item 12 now matches the plan text as written.

Two more items:

16. **Unreadable after-leg capture (NIT-H):** both counts print `unread` and the leg is NOT MEASURED, never PASS. An
    unreadable before-leg capture fails only the control. The content counts still come from the after-leg capture,
    and a count above 0 FAILs.
17. **Carried matches (NIT-I):** the evidence file names the leg where a join or URL count first rose above 0.

Round 3's MINOR-E (the rise rule can stay flat in the later legs on a correct build) and NIT-F (the uniqueness of the
example series) stand as round 3 wrote them, both left to B4's dry run and to item 13.

### Escalation items

None.

## 7. Handoff

Nothing is running and nothing is committed. The tree holds the uncommitted 8-line edit to `docs/e2e-test-plan.md`,
the modified journal, and the stage's reports. The committer stages the stage's file list with the verdict
PASS-with-notes.
