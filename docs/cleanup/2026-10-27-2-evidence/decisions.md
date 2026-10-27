# Decisions area — cleanup pass 2026-10-27 (2)

Area cleaner: Decisions (Opus, medium). Scope: `git diff c1a78b1..HEAD`; `docs/decisions.md`, `docs/decisions-archive/`,
`#N` citations in the living docs. Read only.

**Checks that passed (no finding):**
- Numbering: the Log holds #289–#319 with no gap or duplicate; the archive headings match the index exactly (step6
  #1–#36 + #2b = 37; step7 33; step8 58; step9 #128–#200, #202 = 74; step10 #201, #203–#229 = 28; step11 #230–#288
  less #265 = 58, and "#265 was never used" is stated in `step11.md:5`).
- Every `#N` (N < 400) in the root and package `CLAUDE.md` files, `docs/setup.md`, `docs/progress-and-roadmap.md`,
  `docs/e2e-test-plan.md`, the Step 11b phase doc and `decisions.md` resolves to an entry (scripted scan; the only
  unresolved `#N` are process ids such as `claude-code #14996`). Every "date · title" citation checked matches its entry's
  title (the shortened `…` forms included).
- Open decisions lists only #318, correctly: the title and options match the #318 Log entry, and #318 is not resolved
  anywhere. The root `CLAUDE.md:29`, `progress-and-roadmap.md:5`, `:828` and phase doc `:3`, `:637` cite it as open.
- #292, #293, #295 and #307–#309 are no longer listed as Open. `decisions.md:12` and `:19` say they were ruled by #311,
  and the phase doc's Open items (`:654`) says the same.
- #311 is in Standing → How we work (`decisions.md:47`). #297's Standing line carries "reported to the user 2026-10-27"
  (P5).

## Findings

1. **`docs/progress-and-roadmap.md:696-697`: the living text still says `newTab`'s first request reaches a blocked
   host.**
   Evidence: "The block list is not a network firewall: a page can still load a blocked host, and so can a `newTab`'s
   first request (decisions.md · 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140))". Against
   that: #311 item 2 and S6 (`db3f82e`), and #318: "**R17B-RD-2 blocked 0** (Run 17: 1), so S6 closes the `newTab`
   leak". `docs/setup.md:1003` already marks the same claim superseded. The text dates from S5 (`c5d0099`) and S8 did
   not reach it.
   Fix: "…a page can still load a blocked host (decisions.md · … (#140)). *Superseded 2026-10-27: was "and so can a
   `newTab`'s first request", because S6 opens `about:blank` first (#311) and Run 17b measured 0 (R17B-RD-2).*"
   **Mechanical** (stale status against a measured row).

2. **`docs/decisions.md:109` (Standing, #140 line): "to be covered" is stale.**
   Evidence: "…the gate ruled by #311 (`newTab` to be covered by opening `about:blank` first, S6)". Against that: S6 is
   built (`db3f82e`, #312–#314), and #318 says R17B-RD-2 blocked 0.
   Fix: "…the gate ruled by #311; `newTab` covered by opening `about:blank` first (S6, #314), measured by Run 17b
   (#318)". **Mechanical.**

3. **P2 from the previous report (D4.3 labelled "part" in one place, "not met" in others): the ruling settled the
   reading, but the "not met" side is not yet marked.**
   Settled: #311 item 1, "D4.3 is read by the pre-run Stages note (RD-2 a RECORD): **part**". The phase doc `:587`, `:596`
   and the roadmap `:834` ("Gate check D4.3 is part (ruled, #311)") agree with it.
   Still "not met", with no dated note: `docs/e2e-test-plan.md:3100` ("D4.3 NOT met (RD-2 blocked=1)"), `:3141`
   ("| **D4.3** … | **NOT met** |"), and `…-steps/S4-run-record.md:91`, `:119` ("| D4.3 | not met |").
   Fix (records keep their text and get a dated note, `docs-writing-guide.md:42`): under the Run 17 exit-check table
   (`e2e-test-plan.md` after `:3146`) and under `S4-run-record.md` §3, add "*Note 2026-10-27: the user ruled D4.3
   **part**, reading RD-2 as the RECORD of the pre-run Stages note (#311 item 1); the verdict above stays as
   judged.*" **Mechanical** (the user has ruled; only the marker is left).

4. **P4 from the previous report (the Revisit-if of #300 and #303, the 119-character regex bound): settled by #311.
   Three places do not yet say so.**
   Settled: #311 item 4, "The 119-character regex bound stays (it over-warns, never under-blocks); raising it is a Claude
   follow-up." Not yet saying so:
   (a) `docs/e2e-test-plan.md:3125`: "**RD-REGEX** — #300's and #303's revisit trigger is met (the 119 bound over-warns,
   never under-blocks)." It has no ruling note.
   (b) Phase doc `:664` (Follow-ups): "the 119-character regex bound is conservative (RD-REGEX: 120 and 121 supported;
   #300, #303)". It does not say the bound stays or that the raise is Claude's.
   (c) The #300 and #303 Log entries (`decisions.md:456`, `:412`) have no note.
   Fix: (a) append "*Ruled 2026-10-27 (#311 item 4): the bound stays; raising it is a Claude follow-up.*"; (b) rewrite
   it as "…; the bound stays, raising it is a Claude follow-up (#311 item 4)"; (c) a note at the archive move (finding 6).
   **Mechanical.** Nothing is left for the user.

5. **`docs/e2e-test-plan.md:3118`, `:3124` (Run 17 record, Open items) still say the user will rule.**
   Evidence: "- **Gate** — not met (D4.3, D4.6, the fired STOP); the user rules (#307, #308)." and "…fix 5 turned it into
   NOT BUILT; the user rules beside #307/#308." Against that: #311 item 1 accepts #307–#309 (a) and acknowledges fix 5.
   Fix: a dated note after the Open items list: "*Ruled 2026-10-27 (#311): #307–#309 option (a); D4.3 part; fix 5
   acknowledged as disclosed; the re-registered rows ran as Run 17b (§4.25, #318).*" **Mechanical.**

6. **Log entries the ruling settled carry no note saying so. Add the notes at the archive move, by the precedent.**
   Evidence: #292 (`:556`) and #293 (`:543`) still read "(proposed, contract-level, for user review)". #295 (`:514`)
   reads "`newTab` stays uncovered until the user rules…", and its Revisit-if "the user rules for it" is met. #307,
   #308 and #309 (`:365`, `:349`, `:329`) read "Revisit if: the user rules." #297 (`:491`) reads "By: Claude (to be
   reported to the user)", while its Standing line (`:46`) says reported. #310's Revisit-if is met and answered by #319
   (`:190`), with no note on #310. Precedent: `step11.md:5`, "Dated italic notes at the end of an entry were added at
   the move", for example `*Accepted 2026-10-26: as built, at the gate (#288).*`.
   Fix: when Step 11b closes and its Log moves to `decisions-archive/step11b.md`, add one note to each:
   - #292, #293: `*Ruled 2026-10-27 by the user (#311 item 3): confirmed as built.*`
   - #295: `*Ruled 2026-10-27 by the user (#311 item 2): option (a), built as S6 (#312–#314); R17B-RD-2 blocked 0 (#318).*`
   - #307–#309: `*Ruled 2026-10-27 by the user (#311 item 1).*`
   - #297: `*Reported to the user 2026-10-27 (#311 item 7).*`
   - #300, #303: `*Revisit-if met by RD-REGEX; ruled 2026-10-27 (#311 item 4): the bound stays.*`
   - #310: `*Revisit-if met; answered by #319.*`
   **Mechanical**, at the move. Doing it now instead also fits the format.

7. **Phase doc `docs/plans/2026-10-26-step11b-block-list-redirects.md:660-662` (Follow-ups) cites #307–#309 as
   "(Open decisions)" and lists done work as pending.**
   Evidence: "*Added 2026-10-27:* the user's ruling on #307–#309 (Open decisions), then a short **Run 17b** of the rows
   not run (…) as new rows; `newTab` on `about:blank` if #295 is ruled for it; …". Against that: #307–#309 are no longer
   under Open decisions (`decisions.md:10-17`), #311 ruled them, S6 built `newTab`, and Run 17b ran (#318).
   Fix: append "*Done 2026-10-27: ruled by #311; S6 built `newTab` on `about:blank`; Run 17b ran (§4.25, #318). Left:
   #308 (b) (Step 12), the S3b notes, the 119 raise (finding 4).*" **Mechanical.**

8. **Standing decisions list no Step 11b product promise except through the #140 line.**
   Evidence: "Product promises: the safety gate" (`decisions.md:100-138`) has nothing from #290–#319. The ruled and
   built promises appear only inside #140's chain (`:109`) or not at all: #292 (the rules equal the block list and fail
   closed), #293 (the answers stay as today when a hop is blocked), #300 (the two-regex split; an over-long regex fails
   closed), #308 (a bridge `back`/`forward` reaches only activated pages, documented by #311) and #295/#314 (`newTab` on
   `about:blank`).
   Fix: at the Step 11b close, add one Standing line each for #292, #293, #295 (as ruled), #300 and #308 under the
   safety gate heading, pointing to `decisions-archive/step11b.md`. **Needs the user** (which entries count as standing
   is a choice), but low stakes: the lead can propose the list at the close-out.

9. **Minor: `decisions.md:12` and `:19` say the same thing twice.**
   Evidence: `:12` "Step 11b (the user ruled #292, #293, #295 and #307–#309 on 2026-10-27, #311):" and `:19` "Step 11b's
   were ruled on 2026-10-27 (#311); Step 11's on 2026-10-26 (…)".
   Fix: shorten `:12` to "Step 11b:". **Mechanical**, optional.

#318 is listed and cited correctly, and nothing here proposes resolving it.
