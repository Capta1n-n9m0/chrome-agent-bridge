# Cleanup pass 2026-10-27 — area: Decisions

Area cleaner (Decisions), Opus 5.5 at medium effort. Scope: `git diff 1c29942..HEAD`; `docs/decisions.md`
(#289–#310, Open and Standing), `docs/decisions-archive/` (index, `step11.md`), the Step 11b phase doc (§ As built,
gate checklist, § Open items). Read only.

**Mechanical checks that passed (no finding):**
- Numbering: 310 distinct headings across `decisions.md` and the six archive files; no duplicate number; the only gap
  is #265, which `step11.md`'s header records as never used; #2b is in `step6.md` as the index says.
- Archive index (`decisions.md:181-188`): every file's number range and entry count match its headings (37, 33, 58,
  74, 28, 58); the Log holds #289–#310 (22 entries), as "The current step's entries (Step 11b)" says.
- Standing list: each line's `(#N)` resolves, its date and title match the entry's heading, and the file it names is
  where the entry lives (checked by script for all 117 lines).
- `#N` citations in 51 living docs (root and package `CLAUDE.md`, `docs/*.md`, `docs/plans/*.md`, `.claude/skills`,
  excluding `-steps/`, `cleanup/` and the archive): every number resolves to an entry; every "date · title (#N)"
  citation matches its entry's date and title (the only differences are titles cut with "…", which is allowed).

## Findings

### 1. Open decisions omits #309's open question, though the root CLAUDE.md and the phase doc cite #307–#309 as open
- **Location:** `docs/decisions.md:24-29` (the #307/#308 bullet); cited by `CLAUDE.md:28`,
  `docs/plans/2026-10-26-step11b-block-list-redirects.md:512, 539`.
- **What is wrong:** #309 leaves two things for the user (which reading of D4.3 holds; the fix-5 slip past a STOP
  line), but the Open list carries only #307/#308.
- **Evidence:** `decisions.md:208` (#309): "though D4.3's own sentence still lists RD-2 — the user rules which reading
  holds" and `:210` "Disclosed for the ruling: the STOP clause was first met in attempt 6 … a fix past a STOP line";
  `:216` "**Revisit if:** the user rules." — versus `decisions.md:24` "- **#307/#308** 2026-10-27 · Run 17 stopped …"
  (no #309). `CLAUDE.md:28`: "Open decisions: #292, #293, #295, #307–#309"; phase doc `:539`: "the user's ruling on
  #307–#309 (Open decisions)".
- **Suggested fix:** widen the bullet to **#307–#309** and add one line inside it: "Also to rule (#309): whether D4.3
  is read as written (RD-2 listed, so not met) or by the Stages note (RD-2 a RECORD, so part); and the fix-5 STOP slip
  (`2c1af4b`), disclosed, no judgment changed." Framed as open, no recommendation invented.
- **Kind:** mechanical (index of what #309 already says is open).

### 2. #309 says the record is "as judged" and D4.3 is "part"; the record and the e2e §5 entry say D4.3 "not met"
- **Location:** `docs/decisions.md:205-208` (#309); `docs/plans/2026-10-26-step11b-block-list-redirects-steps/S4-run-record.md:91, 119`;
  `docs/e2e-test-plan.md:3048, 3066, 3089`; versus phase doc `:522` and `docs/progress-and-roadmap.md:831`.
- **What is wrong:** two labels for the same gate check across the living docs. #309's title and the phase doc's gate
  say **part**; the record #309 accepts "as judged", and the e2e Run 17 entry copied from it, say **not met**.
- **Evidence:** #309 title "Run 17's record: D4.3 part, D4.6 not met" and `:206` "the record `…-steps/S4-run-record.md`
  as judged"; `S4-run-record.md:119` "| D4.3 | not met | section 3: RD-2 shows `blocked=1`"; `e2e-test-plan.md:3089`
  "| **D4.3** … | **NOT met** | RD-2 `blocked=1` …"; phase doc `:522` "| **D4.3** | **part** | … though D4.3 lists it
  (#309) |".
- **Suggested fix:** do not edit the record (evidence). In `e2e-test-plan.md:3048` and `:3089` add "(as written; part
  if RD-2 is read by the Stages note — the user rules, #309)"; or, if the user rules "as written", relabel #309's
  title and the phase-doc row via a superseded marker. Which label stands is the user's ruling.
- **Kind:** needs-the-user (the reading); the pointer in e2e §5 is mechanical once framed as open.

### 3. Open #292's line is not marked as amended by #296, #301 and #302, while #293's is; #292's disarm rule was changed
- **Location:** `docs/decisions.md:13-15` (Open #292), `:441-454` (#292 entry); phase doc 0.5 `:148`.
- **What is wrong:** #296 states it "Amends #291, #292, #293 where they differ", and one difference is #292's disarm
  clause; #301 (a) and #302 also redefine #292's "a rebuild succeeds" and "a list change rebuilds". Only #293's Open
  line carries an amendment note; #292's entry, its Open line and phase doc 0.5 still state the old disarm rule.
- **Evidence:** #292 `:446` "disarm clears them"; phase doc `:148` "the keeper removes every rule in `onDisarm`" —
  versus #296 `:385` "a disarm does not lift a running call's rules (only the call's end and the start-up clear do)"
  and As built S2 `:459` "a disarm does not lift a running call's rules (`sweep()` removes only orphans, #296)".
  #301 `:321` "(a successful update with no live call is the 'rebuild that succeeds' of #292)"; #302 `:308` "the
  rebuild runs only when the block list's stored value changed or the state became unreadable".
  Open #293 `:18-19`: "Amended by #296 (the fallback dropped)."
- **Suggested fix:** append to Open #292 (`:15`): "Amended by #296 (a disarm does not lift a running call's rules),
  #301 (a re-sync when the last live call ends; a 5 s bound per DNR call), #302 (the rebuild runs only on a block-list
  edit or an unreadable state)." Add a dated italic note under phase doc 0.5's Disarm bullet (`:148`) pointing to #296.
  The #292 entry text itself stays (it is the record).
- **Kind:** mechanical.

### 4. Open #293's line does not point to #303, which fixed how a blocked download hop is recognised; phase doc 0.6 still states the dropped fallback
- **Location:** `docs/decisions.md:16-19`; phase doc 0.6 `:168-172`.
- **What is wrong:** option (a) in the Open line describes the recognition only as "`onErrorOccurred`
  `ERR_BLOCKED_BY_CLIENT`"; #303 narrowed it (tab −1, `xmlhttprequest`, own initiator, the call's own list, 300 ms of a
  rejected fetch). Phase doc 0.6 still writes the fallback #296 dropped, without a dated note.
- **Evidence:** Open `:17-18` "a blocked download hop recognised by `onErrorOccurred` `ERR_BLOCKED_BY_CLIENT`
  (recommended, applied)"; #303 `:291-293` "a hop counts only for tab −1, `xmlhttprequest`, the own initiator,
  `ERR_BLOCKED_BY_CLIENT` and a URL the call's own list blocks, within 300 ms of that call's rejected `fetch`". Phase
  doc `:169` "the fallback is: a fetch failure while the call's rules were non-empty answers `DOMAIN_BLOCKED` …" vs
  #296 `:383` "0.6's guessed-error fallback dropped".
- **Suggested fix:** Open #293: "Amended by #296 (the fallback dropped); the recognition as built is #303." Phase doc
  0.6: a dated italic note "*Note 2026-10-26: the fallback was dropped (#296); the recognition as built is #303.*"
- **Kind:** mechanical.

### 5. #296 is not marked as amended by #300
- **Location:** `docs/decisions.md:380-398` (#296).
- **What is wrong:** #300 says it amends #296 item 7, but #296 carries no marker, so a reader of #296 gets "one regex
  per pattern".
- **Evidence:** #300 `:341` "**Instead of:** #296 item 7's 'one regex per pattern' (amended here)"; #296 `:387-388`
  "S1's translation per item 7 (plain hosts by canonical `requestDomains`, IP literals, `*.` and ports by anchored
  regex)" with no note.
- **Suggested fix:** end #296 with "*Amended 2026-10-26 by #300: a default-port pattern makes two regex rules.*" (the
  writing guide's dated-marker form; decision text unchanged).
- **Kind:** mechanical.

### 6. #300's and #303's Revisit-if is met by Run 17, but no Open decision or entry records it
- **Location:** `docs/decisions.md:343` (#300 Revisit if), `:299` (#303 Revisit if); `docs/e2e-test-plan.md:3073`;
  phase doc `:542-543` (Follow-ups).
- **What is wrong:** a met Revisit-if reopens a decision; it is noted in the e2e record and the Follow-ups but not in
  Open decisions, so the user is not asked whether to keep the 119-character bound.
- **Evidence:** #300 `:343` "**Revisit if:** `isRegexSupported` disagrees with the 119-character bound on Chrome 156";
  #303 `:299` "RD-CAPS-WARN disagrees with 119"; `S4-run-record.md:27` "`h120 supported=true len=120`; `h121
  supported=true len=121` … (#300's and #303's revisit trigger …)"; `e2e-test-plan.md:3073` "#300's and #303's
  revisit trigger is met (the 119 bound over-warns, never under-blocks)". #307 `:246-247` records it as a finding
  only. (#303's latency trigger is not met: record `:33` "`d` is about -300 ms, so #303's latency trigger is not met".)
- **Suggested fix:** add an Open line: "#300/#303 Revisit-if met (RD-REGEX: 120 and 121 supported): keep 119 (over-warns,
  fails safe) or measure Chrome's real limit and raise it — a Run 17b or Step 12 item." Recommendation is the
  session agent's to write.
- **Kind:** needs-the-user (whether it is a user item or a Claude follow-up); listing it is mechanical.

### 7. #297's standing rule (never run `chrome.exe` without an own profile) and #294's scratch-Chrome method are not in Standing decisions
- **Location:** `docs/decisions.md:40-56` (How we work); entries `:368-378` (#297), `:413-426` (#294).
- **What is wrong:** #297 sets a rule "from now on" for every agent; #294 is the method any later DNR or Chrome
  measurement reuses (recipes/CLAUDE.md cites both). Standing lists governing decisions, but neither is listed.
- **Evidence:** #297 `:371-372` "From now on no agent runs `chrome.exe` on this machine without its own
  `--user-data-dir`, not even for `--version`"; `recipes/CLAUDE.md:140-141` cites #297 and "(#294)". Standing intro
  `:36` "A decision that still governs how we work …".
- **Suggested fix:** add under How we work: "- 2026-10-26 · Stage 0 measures DNR in a separate scratch Chrome on a
  temporary profile (#294) — this file (Log)" and "- 2026-10-26 · Stage 0's incident: a stray `chrome.exe --version`
  reached the user's Chrome; never run Chrome without an own profile (#297) — this file (Log)".
- **Kind:** mechanical (index).

### 8. #297 is "to be reported to the user"; no living doc shows it was
- **Location:** `docs/decisions.md:378`.
- **What is wrong:** an incident touching the user's own Chrome is marked for reporting, but it is not in Open
  decisions, the root Current state or the roadmap block; only `recipes/CLAUDE.md` and the phase doc As built
  (`:429`) mention it.
- **Evidence:** `:378` "**By:** Claude (to be reported to the user)"; `CLAUDE.md` Current state (`:15-36`) and
  `docs/progress-and-roadmap.md` Step 11b block (`:825-832`) have no #297.
- **Suggested fix:** if it was reported, mark "*Reported <date>.*" on #297; if not, add an FYI line to Open decisions
  (no ruling needed) so the gate ruling session shows it.
- **Kind:** needs-the-user (whether it was reported).

### 9. Root CLAUDE.md's one-line summary includes `back`/`forward` in what the rules stop, which #310 says no doc may claim
- **Location:** `CLAUDE.md:19-21`.
- **What is wrong:** #310 rules that no doc says a `back`/`forward` redirect hop is stopped (unmeasured); the root
  summary lists `back` and `forward` among the calls whose hop "stop[s]".
- **Evidence:** `CLAUDE.md:19-20` "while a bridge `navigate`, `back`, `forward` or `downloadStart` runs, session
  `declarativeNetRequest` rules built from the block list stop a redirect hop onto a blocked host (Run 17 RD-1, RD-3:
  0 requests reached it)" — versus #310 `:195-196` "no doc says a `back`/`forward` redirect hop is stopped, since no
  Run 17 row measured one"; `extension/CLAUDE.md:230` and `docs/setup.md:987-988` follow #310 ("`navigate` or
  `downloadStart`"; "Run 17 did not measure a redirect through them").
- **Suggested fix:** "while a bridge `navigate` or `downloadStart` runs, … stop a redirect hop onto a blocked host (Run
  17 RD-1, RD-3: 0 requests reached it; `back`/`forward` hold the rules too, unmeasured, #308)".
- **Kind:** mechanical (a `CLAUDE.md` correction in place; also a State-area item).

### 10. The Open decisions header and the phase doc's § Open items still read as before Stage 0
- **Location:** `docs/decisions.md:12`; phase doc `:530-536`.
- **What is wrong:** "Stage 0 attacks them" is past (Stage 0 closed 2026-10-26); the phase doc's Open items lists only
  0.5 and 0.6 for the gate (not #295 or #307–#309) and lists as "Settled only by Stage 0" things Stage 0 settled.
- **Evidence:** `decisions.md:12` "the conservative option applies until the user rules at the gate; Stage 0 attacks
  them"; phase doc `:533-536` "**Contract-level, conservative rule applied, listed for the user at the gate:** 0.5 …,
  0.6 …" and "**Settled only by Stage 0:** #290's four checks; 3c's check (0.11); whether DNR applies to the worker's
  own `fetch` …" — versus As built Stage 0 `:418-429` (all measured) and the gate row `:512` "(#307–#309)".
- **Suggested fix:** header: "Step 11b (for the user at the gate; the conservative option applies until ruled):".
  Phase doc Open items: "Listed for the user at the gate: #292 (0.5), #293 (0.6), #295 (`newTab`), #307–#309 (Run
  17's STOP and record); settled by Stage 0 (#294–#296): #290's four checks, 3c's check, the worker `fetch`, `tab.url`,
  the regex cap."
- **Kind:** mechanical (status wording).

### 11. Standing #140 still says its network-rule step is only "placed after Step 11"
- **Location:** `docs/decisions.md:118`.
- **What is wrong:** the rule step is now built (Step 11b), its gate pending; the Standing line does not say so.
- **Evidence:** `:118` "`downloadStart` and redirects onto a blocked host (#140) — … ruled by #202, and its
  network-rule step placed after Step 11 by #229"; phase doc Status `:3` "Built (Stage 0 → S5, 2026-10-26/27) … gate
  not met".
- **Suggested fix:** append "; built in Step 11b (#290, #292, #296; `newTab` uncovered, #295), gate pending (#307–#309)".
- **Kind:** mechanical.

### 12. Standing #250, #259 and #284 say "changed by #288" but not that Step 11b S0F built the change
- **Location:** `docs/decisions.md:171, 173, 174`.
- **What is wrong:** low; a reader cannot tell the changes from #288 are in the tree (and refined by #298, #299).
- **Evidence:** `:171` "changed by #288 (a home folder, or a folder of home folders, is refused as an Upload folder)"
  vs #298 `:358-360` "one predicate … refuses a home-folder parent itself too"; `:174` "changed by #288 (a missing
  file is an error in the extension too)" vs #299 "only a readable 200 is a file".
- **Suggested fix:** append "; built in S0F-a (#298)" to #250 and #259, "; built in S0F-b (#299)" to #284.
- **Kind:** mechanical.

**Cross-area note (State, not this area):** `docs/plans/next-session-prompt.md` is still the Step 11b kickoff, while
the resume point is the user's gate ruling (`CLAUDE.md:28`).

**Counts:** 12 findings — 9 mechanical, 3 needs-the-user (2, 6, 8); 0 dead citations; 0 numbering defects.
