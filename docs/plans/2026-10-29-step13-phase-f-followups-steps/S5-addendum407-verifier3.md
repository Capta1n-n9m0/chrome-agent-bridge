# S5-addendum407 verifier report, round 3

Model Opus, effort medium. I only read files and ran commands. The only files I wrote are this report and its evidence
file. I ran no Chrome, daemon, fixture, `npm test` or build, and read no raw run record. I re-checked only the items
round 2 raised, in the uncommitted note at `docs/e2e-test-plan.md:2002` and rows 2006-2008 (HEAD `39b51cd`). I checked
them against #407 (`docs/decisions.md:221`), round 2's
report and the fixer's claims in `S5-addendum407-fixer2.md`.

## 1. Verdict

**FAIL**, on one MAJOR finding.
- MAJOR-A, MAJOR-B and MINOR-C are fixed as round 2 asked.
- The new liveness sentence adds **MAJOR-D**: when the control fails, a **non-zero** join or URL count is replaced by
  `unread`. A clause (2) FAIL that #407 orders would then print as NOT MEASURED.
- The fix is one sentence, and no escalation is needed.
- This was the stage's third fix round, so under agent-rules §7 a fourth round runs only on an Opus fixer.

## 2. Outputs

- This report.
- `docs/plans/2026-10-29-step13-phase-f-followups-steps/S5-addendum407-verifier3-diff.txt`, which holds:
  - the cell diff compared with rounds 1 and 2;
  - the numstat;
  - the path and name scan;
  - doc-check;
  - the `evaluate.ts:39` line and the liveA20 driver's popup call.

## 3. Verifier verdict

Not applicable (this is the verifier).

## 4. Deviations

None.

## 5. Proposed decisions

None.

## 6. Findings

### Item 1: round 2's findings, re-checked

**MAJOR-A (wrong source, cannot be tied to the leg): fixed.** The new spans at l.2002:
- **Where the lines come from:** "the worker prints `[bridge] evaluate <n> chars` only for calls that reach the
  extension: A's `window.open` evaluate on O (one per round in legs `bg`, `fg`, `third`), B's own `evaluate "1"` on its
  tab in leg `third`, and A's call on its popup; B's calls on the popup and on O are refused `TAB_HELD` by the daemon
  and print nothing."
- **A's popup call:** "So A's call on its popup (the original's "A's call on its popup is `ok`") is an `evaluate` whose
  expression length is unique within the slice (for example `1+0`, `1+0+0`, …), made in every round whose popup opened,
  after B's held-call probe, so identical consecutive lines cannot be grouped into one."
- **The rule:** "The control holds when the after-leg capture holds more `[bridge] evaluate` pieces than the capture
  saved just before the leg; if it does not, `console-join` and `console-url` print `unread`."

This is round 2's option (a). It is operational and attributable, because the count is bracketed by the leg.

**MAJOR-B (precedence): fixed for the lease and held-call clauses.** The new span reads: "Every other clause is judged
first: a STOP or a FAIL stands whatever the console reads; `unread` only turns a leg that would otherwise PASS into NOT
MEASURED (a stated instrument limit); a round with `popup-opened=yes` and `granted-to=none` is a FAIL whatever the
console reads." Clause (2)'s **own** FAIL is not covered (MAJOR-D).

**MINOR-C (whole-capture claim): fixed.** The new spans read:
- "the whole capture as saved after the leg (the console's rendered rows, which may not reach back to the slice's
  start)";
- "The content check is a backstop to the static fact that `extension/src/opener-join.ts` has no log call".

### Item 2: can the new control pass on a correct build? (from code)

**Which calls print the piece.**
- `extension/src/handlers/evaluate.ts:39` runs `console.log("[bridge] evaluate", expression.length, "chars")` after
  `pageTab` and before the run, for every `evaluate` that reaches the handler.
- `daemon/src/intercept.ts:606-615` (`checkLease`) throws `TAB_HELD` in the daemon, so B's popup call and B's O control
  never reach the worker. The note says this correctly.
- Calls that print, per leg:
  - `bg` and `fg`: A's `window.open` evaluate on O, plus A's popup evaluate when the popup opened.
  - `third`: the same, plus B's `evaluate "1"` every 300 ms.
  - `human`: only A's popup evaluate, in rounds whose popup opened. A round with no popup is NOT MEASURED anyway.

**Grouping.**
- DevTools merges only identical consecutive messages.
- A's popup line has a unique length, so it never merges with its neighbour: the `window.open` line before it, or B's
  `1` line in leg `third`.
- The `window.open` lines are separated by popup lines, and in `third` by B's lines, so they do not merge either.
- B's repeated `evaluate 1 chars` lines merge among themselves, but every A line breaks the run.
- Result: at least one new row per opened round, so the count can rise in every leg that can PASS.

**The A popup `evaluate` is an instrument choice, not a new pass condition.**
- The liveA20 driver already made A's own popup call an `evaluate`: `recipes/s13-r20-a.ts:114`
  `const call = (c, tab) => att(() => c.call("evaluate", { tab, expression: "1" }))`, with
  `own = await call(P.A.c, handle)` after `popB` and `ctl`. This is quoted in the evidence file.
- liveA20 measured it as `own=ok` in legs bg, fg and third (#407's "measured the lease right").
- Only the expression changes, from `1` to a unique-length sum.
- The order (after B's probe, before the sweep closes the popup) and the criterion (`ok`) are unchanged.

**How the capture is taken.**
- `Save-S11bConsole` (`recipes/s11b-win.ps1:185-193`) writes every non-empty UIA Name in the DevTools window.
- `Get-R20ConsoleCount` (`recipes/s13-r20.ps1:183-185`) counts those lines, or returns -1.
- Because `evaluate.ts:39` logs three arguments, a message may show up as one Name or as pieces. Either way, at least one
  line per message holds the substring `[bridge] evaluate`, so a per-line substring count rises once per new message.

**Can the control turn R20-POP-BG-3 (G1.4) into NOT MEASURED by construction? No.**
- BG-3 runs right after R20-0B, the slice's first row. The capture before BG-3 therefore holds only the slice prologue
  and R20-0B's lines: the reload, a few SDK evaluates, and the typed permission expressions with their results.
- BG-3's three rounds add at least six new evaluate messages (window.open and popup in each round).
- The count stays flat only if the capture is bounded (a virtual list) **and** every row pushed out of it is also an
  evaluate row. With R20-0B's typed lines in the tail, that cannot happen.
- liveA20 also measured the capture growing across legs (`console-new` 95, 90 and 129, cited in round 1's report l.110).
- MINOR-E covers the later legs, where the same rule is weaker.

### MAJOR-D: `unread` hides a non-zero join or URL count

**Where:** `docs/e2e-test-plan.md:2002`. Three spans together:
- "the clause is judged only on a capture that shows the worker's lines";
- "if it does not, `console-join` and `console-url` print `unread`";
- "`unread` only turns a leg that would otherwise PASS into NOT MEASURED".

**Evidence:**
- #407 clause (2) (`docs/decisions.md:221`, "(2) **console:**") orders that "no worker-console line … comes from the
  opener join, and none holds the popup's URL". A matching line is therefore a FAIL.
- The control exists only to guard against a false **zero**: a frozen or detached window reads 0 for the wrong reason.
  A positive match is evidence whatever the control reads, because the note judges the whole capture.
- As written, the control is checked before clause (2) is judged ("judged only on a capture that …"). A failed control
  prints `unread` in place of a count of 1 or more. "Every other clause is judged first" covers the other clauses, not
  clause (2)'s own result, so the leg reads NOT MEASURED.
- This is reachable in all four legs, BG-3 included. It needs a build where the join throws or logs a URL, plus a
  capture whose evaluate count did not rise (MINOR-E).
- This is exactly the "FAIL #407 orders printed as NOT MEASURED" that item 3 rules out.

**Suggested fix (one sentence, in the liveness span):** "`console-join` and `console-url` are always counted; a count
above 0 is printed and is a FAIL whatever the control reads; `unread` replaces only a count of 0 when the control does
not hold (or a capture cannot be read)."

### MINOR-E: the rise rule can stay flat on a correct build in the later legs

**Where:** l.2002, "holds more `[bridge] evaluate` pieces than the capture saved just before the leg".

**Evidence:**
- If the UIA tree holds only DevTools' rendered rows (round 2's MINOR-C; not measured in this repo), the count of
  matching lines is not monotone. Once the list is full, each new evaluate row pushes out the oldest row. If those
  oldest rows were evaluate rows too, the count stays flat.
- By R20-POP-OTHER-3's legs `third` and `human`, the tail is made of BG-3's and FG-3's evaluate rows. In those legs a
  correct build could read `unread`, which gives NOT MEASURED.
- The error is honest, not flattering, and it does not reach BG-3, so G1.4 is safe.

**Suggested fix (optional, for the step agent):** make the control "the after-leg capture holds a line with the leg's
last popup-evaluate length next to `[bridge] evaluate`". The newest line is always in a rendered tail. Use this only if
B4's dry run shows that a Name carries the number; otherwise keep the rise rule. Either way, B4 writes the two evaluate
counts to the evidence file (NIT list, item 15), so that an `unread` can be explained.

### NIT-F: "unique within the slice" is not guaranteed by the example series

**Where:** l.2002, "(for example `1+0`, `1+0+0`, and so on …)".

**Evidence:**
- The series has lengths 3, 5, 7 and so on. The slice also issues other evaluates: R20-0B's SDK reads, B's `1`, and the
  `window.open` expression.
- No collision is likely, because about 12 popup calls stay under 30 characters and the `window.open` text is longer.
  But the series alone does not prove uniqueness.

**Suggested fix:** for B4 (NIT list, item 13). No edit to the plan is needed.

### Item 3: precedence

- The lease FAIL, the `held-call` FAIL, the STOP `popup-lease-wrong` and the human `granted-to=none` FAIL all stand
  whatever the console reads.
- NOT DISCRIMINATING is untouched, since `unread` changes only a would-be PASS.
- #407's three clauses, `others=0`, the guard, the 1 000 ms bound and the 3-of-3 rule are unchanged.
- The only gap is MAJOR-D.

### Item 4: cell diff, numstat, scans, doc-check

- **Cell diff:** round 2's output against the current output gives `diff` exit 0, so nothing changed in rows 2006-2008.
  Against round 1 the only change is OTHER-3 cell 4's inserted `opener=<O or other or none> `. The fixer's claim
  "Rows 2006-2008: no change" holds.
- **Numstat:** `git diff --numstat docs/e2e-test-plan.md` gives `8	0`.
- **Path and name scan:** with the URL scheme stripped, the scan of the added lines exits 1 (no match). Without the
  strip, row 2006's `http://` hits the drive pattern, a false hit.
- **doc-check:** `node scripts/doc-check.mjs` exits 0 with the same three standing items (code counts 25/28/27;
  `CLAUDE.md:114 5596 passed`; `next-session-prompt.md:15`) over 38 living docs. Nothing is new.

### NITs the B4 driver must implement exactly (rounds 1, 2 and 3 merged)

1. **Holder name:** `holder=A` requires the substring `held by ` + `JSON.stringify(<A's hello name>)`. Every actor gets
   an explicit plain-ASCII hello name with no quote or backslash.
2. **What `held-call=TAB_HELD` means:** **both** B's popup call and B's control on O answer code `TAB_HELD`. Never
   compare the messages, and never print them.
3. **Human-leg order:** in leg `human`, B's probe runs after the `popup-opened` read and the grant read.
   `held-call=n/a` applies only to rounds with no popup.
4. **When `popup-opened` is read:** at or after `sent` + 1 000 ms, comparing Chrome `id`s with the pre-click
   `listTabs` set and excluding any tab an actor opened with `newTab`. `openerTabId` is used only for the `opener=`
   label.
5. **Per-round STOP:** `popup-lease-wrong` on a grant to B or C, in every leg including `human`.
6. **Console matching (corrected for round 2's whole-capture rule):**
   - Join: case-insensitive `opener-join|openerjoin|opener_join`.
   - URL: `localhost:<P>` (the slice's real port), `e2e-playground.html?popup`, `popup=1`.
   - Both are matched over the **whole after-leg capture**, not a delta, with the root window-title Name dropped.
   - Print counts only.
7. **Counted rounds:** `n=` counts only counted rounds. Fewer than 3 gives NOT DISCRIMINATING (`bg`/`third` guard) or
   NOT MEASURED (`human`), never PASS.
8. **The RECORD line:** one `CHECK <row> <leg> console-new=<n> RECORD` per leg, never part of the verdict.
9. **The window title:** drop the window-title (root) Name before any match, so a profile name can neither match nor
   be printed.
10. **Liveness count:** case-sensitive substring `[bridge] evaluate`, counted per capture line.
11. **Capture timing:** the before-leg capture is taken just before the leg's first call. The after-leg capture is
    taken after the leg's last call has answered and its popup is closed.
12. **Verdict order (MAJOR-D included):** compute the lease, held-call and STOP verdicts first. A join or URL count
    above 0 is printed and FAILs whatever the control reads. `unread` replaces only a 0, and only turns a would-be PASS
    into NOT MEASURED.
13. **A's popup call:**
    - It is `evaluate`.
    - Its expression length differs from every other evaluate expression the slice issues (R20-0B's, `window.open`,
      B's `1`, and earlier popup calls).
    - It is made after B's probe and before the popup is closed.
    - Its criterion stays `ok`, as in `recipes/s13-r20-a.ts:114-116`.
14. **Unreadable capture:** if either capture cannot be read (`Get-R20ConsoleCount` -1, or `Save-S11bConsole` throws),
    the control does not hold. That gives `unread` under item 12's rule, and `console-new` prints its own unreadable
    value.
15. **Evidence file:** write the before and after `[bridge] evaluate` line counts to the slice's evidence file (not the
    record, whose line forms are fixed), so that an `unread` can be explained.

### Escalation items

None. Every clause can pass as #407 words it once MAJOR-D's sentence is in. Round 1's E1 (a live read that is provably
complete) is not needed, because the clause now rests on the static fact and the live read is stated to be a backstop.

## 7. Handoff

Nothing is running and nothing is committed. A fourth fix round must run on an **Opus** fixer (§7). Its job is
MAJOR-D's one sentence at l.2002, plus MINOR-E's optional rule if the step agent wants it. If that fails, §3 item 9
applies. The next verifier re-checks only the liveness and precedence spans and re-runs the cell diff. The baseline is
the FULL CURRENT OUTPUT section of `S5-addendum407-verifier3-diff.txt`.
