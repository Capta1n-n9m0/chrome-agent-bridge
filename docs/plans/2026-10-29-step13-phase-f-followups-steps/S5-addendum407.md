# S5-addendum407 — the #407 addendum: corrected POP rows (step report)

Step agent: Claude Opus 5.5, medium. Children: builder and fixers 1–3 (Sonnet, medium); verifiers 1–4 (Opus, medium);
committer (Sonnet, medium).

## 1. Verdict

**DONE.** The addendum is written per decision #407 and committed before any liveB20 observation (R5.1).

## 2. Outputs

- `docs/e2e-test-plan.md` §4.28, a pure insertion after the "STOP lines matched to a return" bullet (`git diff
  --numstat`: `8 0`). Line 2002 holds the dated note, lines 2004–2005 the table header, and lines 2006–2008 the rows
  R20-POP-BG-3, R20-POP-FG-3 and R20-POP-OTHER-3. No existing line was edited. The note states liveB20's order: after
  R20-0B and before the row-less `CLOSERPROBE`, BG-3, FG-3, OTHER-3. With them liveB20 has 11 ids and one probe.
- Each -3 row copies its original row (lines 1966–1968) cell for cell. A script compares the cells span by span
  (`S5-addendum407-verifier-diff.txt`, re-run in rounds 2–4: `S5-addendum407-verifier2-diff.txt`, `-verifier3-diff.txt`).
  The only differing spans are:
  - the ids, with the first-cell suffix "re-measures … per #407" that the preamble asks for;
  - the line ids and self cross references;
  - #407's three clauses;
  - the W2 note;
  - `holder=` and `console-join`/`console-url` in the POP lines, plus the RECORD line;
  - OTHER-3's human `CHECK` line, with `opener=`;
  - the reader names `S5-drivers-B4: R20 r20-pop-*-3` and `; decision #407`.
- `node scripts/doc-check.mjs` exits 0 with the three standing items (counts in code, `CLAUDE.md` test count,
  `next-session-prompt.md:15`). None comes from this diff. The added text holds no local path and no user name.
- No code was changed and no test was run (docs only).
- Commit: see §7. The committer reports the hash.

## 3. Verifier verdicts

| Round | Report | Verdict | Findings |
|---|---|---|---|
| 1 | `S5-addendum407-verifier.md` | FAIL | MAJOR-1: the clause (2) readings did not fit the UIA-name capture. MAJOR-2: `popup-opened` was conditioned on the opener. NIT-1–3. |
| 2 | `S5-addendum407-verifier2.md` | FAIL | MAJOR-A: the liveness control named B's probe, which the daemon refuses. MAJOR-B: `unread` was not ranked below FAIL/STOP. MINOR-C. |
| 3 | `S5-addendum407-verifier3.md` | FAIL | MAJOR-D: `unread` could hide a non-zero join or URL count. MINOR-E, NIT-F. Merged B4 list, items 1–15. |
| 4 | `S5-addendum407-verifier4.md` | **PASS-with-notes** | NIT-G, -H, -I. B4 list items 16–17 added. |

Fix rounds used: 3 of 3, all Sonnet (`S5-addendum407-fixer1.md`, `-fixer2.md`, `-fixer3.md`).

## 4. Deviations

None from the brief. The builder's report is `S5-addendum407-builder.md`.

## 5. Proposed decisions

### 2026-10-30 · S5-addendum407: how the -3 rows measure #407's console and human-leg clauses
**Decided:**
(1) **Held-call.** The clause is met when B's popup call answers code `TAB_HELD` and its message contains `held by
"<A's hello name>"`, the text `checkLease` builds, and B's control call on O answers `TAB_HELD` by code. The record
prints `holder=A`, never the message.
(2) **Console.** Content is judged over the whole worker-console capture saved after the leg. One capture line is one
UIA element name. This window is stricter than "during the leg", so it needs no prefix rule.
- A line comes from the join when it names `OpenerJoin`, `opener-join`, `opener_join` or `OPENER_JOIN`. This is a
  backstop to the static fact that `extension/src/opener-join.ts` has no log call.
- The URL parts are `localhost:<P>`, `e2e-playground.html?popup` and `popup=1`.
- A join or URL count above 0 is a FAIL whatever else reads.
- A liveness control applies: the after-leg capture must hold more `[bridge] evaluate` pieces than the before-leg
  capture. A's call on its popup is made an `evaluate` with an expression length unique in the slice. When the control
  fails, a count of 0 prints `unread`, and that turns only a would-be PASS into NOT MEASURED.
- Every other clause and STOP is judged first.
- `console-new` is a RECORD delta.
(3) **Leg `human`.** `popup-opened=yes` when a `listTabs` row that no client opened appears after the click. It is read
at or after the click's `sent` stamp + 1 000 ms. The opener is recorded (`opener=`) but not judged.
- A round with `popup-opened=yes` and `granted-to=none` is a FAIL.
- A round with no popup is NOT MEASURED.
- The leg is PASS only when 3 of 3 popups opened.
(4) **Order.** liveB20 runs the rows after R20-0B, before `CLOSERPROBE`.

**Why:** #407 states what each clause judges, not how the instrument reads it. Each reading above was chosen to be
passable on a correct build, the defect that sank the -2 rows (#406 N1), and to be at least as strict as #407. None was
written after any observation.

**Instead of:**
- a before/after difference with a prefix rule, which can read `unread` by construction;
- a `[bridge]`-fragment rule, which can fail by construction on a UIA capture;
- reading `popup-opened` through the opener, which could hide a popup leased to nobody.

**Revisit if:** liveB20 shows the liveness control failing in BG-3 (the capture cannot show the worker's rows), or a
grouped or virtualized console list.

**By:** Claude (proposed by S5-addendum407; verifier4 PASS-with-notes)

## 6. Findings

- No pre-registered check failed. No #407 clause needed escalating: verifiers 1–4 found each clause passable on a
  correct build, from the code.
- **For the B4 driver:** implement the merged list exactly. It is in `S5-addendum407-verifier3.md` §6, "NITs the B4
  driver must implement exactly", items 1–15, and `S5-addendum407-verifier4.md`, items 16–17. The key items:
  - Every actor gets an explicit ASCII hello name.
  - Both B's calls must be `TAB_HELD`, and their messages are never printed.
  - In leg `human`, B's probe runs after the `popup-opened` and grant reads.
  - The window-title name is dropped before matching.
  - A's popup `evaluate` lengths must be unique in the slice. The `1+0` series alone does not guarantee that (NIT-F).
  - An unreadable capture is handled as item 14 says.
  - A match in an earlier leg also counts in later legs (NIT-I).
- MINOR-E: in OTHER-3's `third` and `human` legs, a console list that shows only rendered rows can leave the rise
  flat on a correct build, which reads NOT MEASURED there and not in BG-3.

## 7. Handoff

Nothing is running and no child is alive. No Chrome, daemon or fixture was touched. The commit holds exactly
`docs/e2e-test-plan.md` and this stage's reports and evidence (`S5-addendum407*.md`, `S5-addendum407-verifier*-diff.txt`).
The next stage is S5-drivers-B4, which builds `r20-pop-bg-3`, `r20-pop-fg-3` and `r20-pop-other-3`.
