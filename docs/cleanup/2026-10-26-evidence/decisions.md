# Cleanup pass 2026-10-26 — area: Decisions

Model: Claude Opus 5.5 (claude-opus-5-5). Scope: `git diff 965b1af..HEAD`. Read only, apart from this file.

## Method
- Numbering: a script parsed every `### <date> · <title> (#N)` heading in `docs/decisions.md` and
  `docs/decisions-archive/*.md`. It found no duplicates and one gap (#265). The archive index row counts all check
  out (step6 37 incl. #2b, step7 33, step8 58, step9 74, step10 28; each file's `###` count is the same).
- Citations: a script (`node <scratchpad>/cites.mjs`) checked every `date · title (#N)` citation, and every bare
  `#2NN`, in the tracked living docs (docs/ without the closed steps dirs, all `CLAUDE.md` files, `.claude/skills`,
  README). Every number resolves. One title is wrong (finding 3). The script also flagged two items in closed
  records, which were parse artefacts and are dropped.
- Code checks against the Step 11 entries all hold:
  - `UPLOAD_REFUSED` is the 27th code (`shared/src/codes.ts:66`).
  - `uploadFiles: "upload"` (`extension/src/safety.ts:93`) and `"uploadFiles"` (`daemon/src/methods.ts:32`) (#237, #238).
  - `UPLOAD_FILES_MAX_PATHS = 20` (`shared/src/protocol.ts:578`) and `UPLOAD_MAX_PATH_CHARS = 4096` (#257).
  - `UPLOAD_CDP_TIMEOUT_MS = 15_000` (#268).
  - `isAllowedFileSchemeAccess` in `handlers/upload.ts` (#245 b).
  - `createIsolatedWorld` in `upload-files.ts` (#267).
  - `webkitdirectory` refused in `content/upload-target.ts` (#247).
  - A module-private `WeakSet` in `debugger-errors.ts:76` (#253).
  - `prepareUpload` on `sdk/src/download.ts:17` (#261).
  - The SDK main entry still exports eight values (#240).
  - `safety.uploadFolders` is written only by `options.ts` (#269).

## Findings

1. **`docs/decisions.md:13–35` (Open decisions) leaves out #286, which the root `CLAUDE.md` lists as open.**
   - Evidence: the root `CLAUDE.md:27–28` says "Open decisions list the rest (#235–#238, … #266, #268, #284, #286)".
     #286's By line is "Claude (process; for user review with the lean-procedures trial)", and its Decided text
     names an item it did not change: "Not changed, for the user: briefs pass no `effort` for Opus verifiers". The
     Open list in decisions.md has no #286 line. The two lists also differ on #264: the root names it as its own
     item, while decisions.md mentions it only inside #263's line ("wording #264"). That difference is harmless.
   - Fix: add one line to the Open list: "2026-10-26 · Step agents never end their turn on a running child; commits
     carry the verifier's verdict (#286) — process, with the lean-procedures trial; the verifiers' `effort`."
   - Mechanical.

2. **`docs/decisions.md:13–35`: the gate items the user has to rule are not in Open decisions.**
   - Evidence:
     - #282: "S5.5 failed for liveA … stops the gate for the user"; Revisit if "the user wants liveA re-run at the gate".
     - #285: "UP-RACE-A … and UP-DEVT … are offered to the user as re-registered rows for a later wave"; Revisit if
       "the user wants UP-OPT, UP-RACE-A or UP-DEVT re-measured before the gate".
     - The phase doc's gate checklist points to the Open list for the user's items ("Open decisions | waiting |
       `docs/decisions.md` → Open decisions (Step 11)"). The Open list itself names only the contract items, #283
       and #284.
   - Fix: add one line: "Step 11's gate: S5.5 and part of S5.6 failed for liveA (#282); re-measure UP-OPT, UP-RACE-A,
     UP-DEVT or not (#285); the push G11-1 (with #283) — see the phase doc § As built, Gate checklist."
   - Mechanical: a pointer that adds no new ruling.

3. **`docs/setup.md:746–747` and `docs/setup.md:1038–1039` cite #245 with a shortened title.**
   - Evidence: setup.md has "Stage 0: uploads need Chrome's file access, and the bridge never opens `file:` pages
     (#245)" in both places. The heading at `docs/decisions.md:669` reads "… and the bridge never opens **or reads**
     `file:` pages (#245)".
   - Fix: insert "or reads " in both places.
   - Mechanical.

4. **`docs/progress-and-roadmap.md:265–266` gives a range of Step 11 decisions that stops before the last two.**
   - Evidence: the roadmap says Step 11's decisions "run from … (#233) to '2026-10-26 · S5 closes: Run 16 stands as
     recorded; UP-OPT keeps its FAIL with no cause stated (#285)'". The log now ends at "2026-10-26 · S6 accepted;
     Step 11 stops at the gate (#287)" (`docs/decisions.md:182`), added in `38e237b` after the roadmap's last edit
     (`0a74608`).
   - The same paragraph also says "the session agent's closeout and the user's rulings are open", but the closeout
     to the gate ran in `38e237b`. That part belongs to the State area.
   - Fix: change the end of the range to #287.
   - Mechanical.

5. **`docs/decisions.md:20–22`: the Open line for #245 still says G11-3 holds the upload rows.**
   - Evidence: the Open line reads "the new human gate G11-3 (the 'Allow access to file URLs' toggle) holds Run 16's
     upload rows". The phase doc's gate checklist (line ~577) says "G11-3 (file-URL toggle) | not needed | found ON
     by UP-0, never pressed", and #284 records liveB's upload rows as run.
   - Fix: change it to "… and the new human gate G11-3 (the toggle; Run 16 found it on, so it was not needed)".
   - Mechanical: status wording only.

6. **#230 (`docs/decisions.md:371–388`) has no superseded marker, although #270 replaced its model rule.**
   - Evidence: #230 says "Low-risk stages … get Sonnet at effort high for builders and fixers, Opus after two failed
     Sonnet fix rounds". #270 says "builders, fixers and live runners run Sonnet, effort medium, on every stage …
     Instead of: #230's Opus doers on standard stages and Sonnet high on low ones". `agent-rules.md:144` already
     says "This replaces the two bullets above". The Standing line for #230 (`decisions.md:56`) has no pointer to
     #270 either.
   - Fix: add `*Superseded 2026-10-25 (the models): was Sonnet high on low-risk stages and Opus doers on standard
     ones, because the user moved every doer to Sonnet medium (#270).*` to #230, and "; models amended by #270" to
     its Standing line.
   - Needs the user: the change is a marker only, but the skill reserves decision text for the user.

7. **#244 (a) (`docs/decisions.md:688`, Decided (a)) has no marker, although #246 reworded it.**
   - Evidence: #244 (a) says "an own `BridgeError` whose code is not a debugger code passes through unchanged". #246
     says "#244 (a) is reworded … Instead of: #244 (a)'s code-based rule". The code follows #246 (the WeakSet marker,
     #253).
   - Fix: add `*Superseded 2026-10-25 (item a): was the code-based rule, because Stage 0 F2 showed it unprefixed page
     errors too; see #246.*`.
   - Needs the user.

8. **#239 (`docs/decisions.md:743`) and #248 (`:637`) do not point to the finder choice that was finally made.**
   - Evidence:
     - #239 says "a closure-free finder by `Runtime.evaluate` returning an `objectId`" in the page's world, and
       weighs `DOM.getDocument {pierce}`.
     - #248 says "Amends #239", but leaves the choice open: "or by walking `DOM.getDocument …` (S3's choice,
       recorded)".
     - #267 records the choice: "`Page.getFrameTree` → `Page.createIsolatedWorld` → `Runtime.evaluate {contextId}`,
       not `DOM.getDocument {pierce}`".
     - Neither #239 nor #248 carries a marker or a pointer.
   - Fix: add a marker to #239 ("finder world amended by #248; mechanism chosen in #267"), and to #248 ("S3 chose the
     isolated world (#267)").
   - Needs the user: this is decision text.

9. **Some entries marked "Decided (proposed)" were never accepted or listed as open: #233, #234, #239, #242, #244.**
   - Evidence: each of them opens with "Decided (proposed)", and their By lines read "Claude (proposed)" or
     "proposed; Stage 0 attacks it". None of them is in the Open list. #252 accepted Stage 0's audit but not these
     entries by name. #242 is on the safety side ("nothing logs an upload path … the rest of the safety boundary is
     unchanged"), but it is neither open nor ratified.
   - Fix (choose one):
     - (a) Add them to the gate's ruling as "accepted as built" when the user rules on the open list.
     - (b) Mark them now: "accepted by Claude at Stage 0 (#252); built".
   - Recommended: (a) for #242, because it concerns safety, and (b) for #233, #234, #239 and #244, which are
     process or already amended.
   - Needs the user.

10. **#265 does not exist: the numbers skip from #264 to #266.**
    - Evidence: no heading for #265 in `docs/decisions.md` or the archive. No citation of #265 anywhere. No commit
      ever added "(#265)" (`git log -S"(#265)"` is empty). #266–#269 came in together in `16d16ec`.
    - Fix: leave the numbering alone (numbers are never reused or shifted). When Step 11 is archived, write
      "#230–#264, #266–#288" in the index row, so the gap is shown rather than hidden.
    - Mechanical, at close.

11. **Some entries still list conditions that later entries have already met or settled. They need pointers, not new
    rulings.**
    - Evidence:
      - #252's Revisit if says "G11-3 stays open at S5". G11-3 was not needed.
      - #252's split "S5 prep 2 h low, live 2 h standard" was replaced by #271's seven slices and #270's models.
      - #243 lists "UP-CLICK (RECORD, only if Stage 0 names a safe way …)". #251 rules that UP-CLICK is not run.
      - #262's Revisit if was met: UP-1 measured the background case (#284). #287 carries the description sentence
        to the next code stage.
      - #238's Revisit if ("UP-1 shows the page receives nothing on a background tab") came out the other way:
        UP-1 PASS.
    - Fix: add one-line dated pointers ("met by #284; carried by #287"; "replaced by #271"; "UP-CLICK not run, #251").
    - Needs the user, because this is decision text. It is low priority and can be done at the archive move.

12. **The rule against citing by number alone is broken in the living docs.**
    - Evidence: `docs/docs-writing-guide.md:81–83` says "Never cite a decision by number alone". Yet:
      - `CLAUDE.md:27–28` cites 20 decisions as bare numbers.
      - `CLAUDE.md:30–31` and `:39` cite #270, #271, #286 and #287 the same way.
      - The package `CLAUDE.md` files do too, for example `extension/CLAUDE.md:50,52,256–263`, `sdk/CLAUDE.md:27–28`
        and `shared/CLAUDE.md:16`.
      - So do `docs/agent-rules.md:142,145,157,190` and `docs/progress-and-roadmap.md:275–303`.
      - Most of these sit beside a paraphrase of the title, but they are not the date + title form.
    - Fix: decide whether the rule stays, given the word budgets these files carry. Either relax it to "a number is
      enough where the sentence already states the decision", or have the next pass add dates and titles.
    - Needs the user.

13. **Three "(check)" marks are still open in Standing (`docs/decisions.md:84–86`): #55, #57, #58.**
    - Evidence: they are listed as "T1's extension details (#55) … (check)", and the same for #57 and #58. The
      2026-10-25 verifier report (`docs/cleanup/2026-10-25-verifier.md:141`) already said "Three '(check)' marks
      remain: #55, #57, #58". These are not Step 11 entries, but two passes have now left the marks unresolved.
    - Fix: either keep only the governing parts (for example #55's `TAB_UNKNOWN`/`TAB_GONE` split and `current:
      true`) as standing and clear the mark, or drop the three lines as one-off stage details.
    - Needs the user.

## Word budget (not a defect: Step 11 is open)

`docs/decisions.md` has **11,324 words against a budget of 10,000** (doc-check). By section, counted with `wc -w`:

| Section | Lines | Words |
|---|---|---|
| Header | 1–9 | 59 |
| Open decisions | 10–41 | 462 |
| Standing decisions | 42–165 | 1,946 |
| Archive index | 166–181 | 137 |
| Log: Step 11, #233–#287 (57 entries, no #265) | 182–818 | 8,200 |
| Log: lean procedures, #230–#232 | 819–857 | 520 |

**Proposal at the close.** When the user rules the gate, the closing ruling becomes #288. Then move #230–#288 (all
of the current Log) to `docs/decisions-archive/step11.md`, under the title "Step 11: D3 file upload (and the
lean-procedures work)", numbers unchanged. Step 10's archive set the precedent: it took its own closing ruling, #229.

#230–#232 predate Step 11's kickoff, but the Log already groups them as "Step 11 and the lean-procedures work", and
the Standing list already points to them. They therefore move too, with their Standing lines repointed to
`decisions-archive/step11.md`.

- New index row: `step11.md` | Step 11: D3 file upload | #230–#264, #266–#288 | 58 | 2026-10-25 → <close date>.
- What stays in `decisions.md`:
  - Header and index: about 59 + 137 + 30 = 230 words.
  - Open decisions: the Step 11 block goes once it is ruled, leaving about 60 words (a line pointing to the ruling).
  - Standing: 1,946 words now, plus about 15 new lines for Step 11's product promises (about 25 words each, about
    +375). Those promises are #235–#238, #240–#242, #245, #247, #250, #257, #259–#261, #263/#264, #266, #268, and
    the UP-RAW ruling (#284). About 2,320 words in all.
- **Result: about 2,600 words, well under 10,000.**
- If #230–#232 stay in the Log as a separate block instead, the result is about 3,120 words.
- Archiving part of an open step before the gate is not something the guide provides for, so this proposal does not
  include it.

Findings: 13 (mechanical: 1, 2, 3, 4, 5, 10; needs the user: 6, 7, 8, 9, 11, 12, 13).
