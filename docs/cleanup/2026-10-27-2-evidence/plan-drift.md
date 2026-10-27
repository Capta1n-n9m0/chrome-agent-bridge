# Plan drift — cleanup pass 2026-10-27 (second)

Area cleaner: Plan drift. Model Opus 5.5, effort medium. Scope `git diff c1a78b1..HEAD` (HEAD `7e341ea`). As-built of
record: `docs/plans/2026-10-26-step11b-block-list-redirects.md` § As built (S6, S7-*, S8), lines 595-650.

Checked and clean: `docs/setup.md` Safety (lines 975-1013: `newTab`, `back`/`forward` and the #308 limit are rewritten
from R17B rows, with a Superseded note); the reload note at setup.md:101; the design spec §6.2 and §10 S6/S8 notes
(daemon-sdk-multi-actor-design.md:229-234, 777-790); `docs/e2e-test-plan.md` §4.25 and §5 Run 17b (§4.24 untouched by
design). **The root `CLAUDE.md` line "`newTab` is uncovered (#295)" is not stale at HEAD**: `7e341ea` rewrote the
Current state block (CLAUDE.md:19-22 now reads "`newTab` with a URL … opens `about:blank` first (S6, #311)"), and
the Commands count reads 4665/191 (CLAUDE.md:112). No later plan exists (`docs/plans/` holds only Step 11b's phase doc
after Step 11; `next-session-prompt.md` is the known one-line stale kickoff, not re-reported). #318 is left open.

## Findings

1. **README.md:52-53** — Step 11b status omits `newTab`, `back`/`forward` and the ruling.
   Doc: "**Step 11b (built, not closed):** while a bridge `navigate` or download runs, the block list also stops a
   redirect hop onto a blocked site (Run 17, 2026-10-27); its gate waits for the user's ruling."
   As built: phase doc 599-603, 631 (S6: `newTab` covered; R17B-BACK, R17B-FWD); 595 (gate accepted, #311); 637 (close
   waits on #318). Fix: "while a bridge `navigate`, `browser_new_tab` with a URL, `back`/`forward` or download runs,
   the block list also stops a redirect hop onto a blocked site (Runs 17 and 17b, 2026-10-27); accepted (#311), its
   close waits for the user (#318)." **Mechanical** (status wording).

2. **README.md:55** — test count stale. Doc: "4535 unit tests green in 183 files (`npm test` 2026-10-27 on Step 11b's
   tree)". As built: phase doc 641 "tests 4535/183 → 4665/191"; CLAUDE.md:112 "4665 passed, 191 files". Fix: 4665 / 191,
   and append Run 17b (2026-10-27; 16 passed, 7 failed — carried upload rows —, 3 not measured, 2 recorded; e2e-test-plan
   §5 Run 17b) to the run list that follows. **Mechanical.**

3. **recipes/README.md:45-46** — Run 17b's recipes are missing from the table. On disk (since base): `s11b-r17b.ps1`,
   `s11b-r17b-plan.ts`, `s11b-r17b-rules.ts`, `s11b-r17b-build.ts`, and `s11b.ts`'s new subcommands (`B17 history
   --activate`, `tabwatch`, `build-proof`, `newtab-timed`, `ctl-slow`; phase doc 614-617). The table lists only Run 17's
   (`s11b-r17.ps1`, `s11b-r17-plan.ts`, …). Fix: add a row, e.g. "| `s11b-r17b.ps1`, `s11b-r17b-plan.ts`,
   `s11b-r17b-rules.ts`, `s11b-r17b-build.ts` | Run 17b's block runner (`-Block liveA17B` / `liveB17B` / `plan` / one
   block; reads Run 17's blocks from `s11b-r17.ps1` by PowerShell's parser, the carried rows run under the R17B id), its
   pure plan, the pure rules of the activated-history helpers and of the build proof / tab watcher / timed `newTab`
   (`docs/e2e-test-plan.md` §4.25). |" (from each file's header), and add "and Run 17b's `B17 build-proof`, `tabwatch`,
   `newtab-timed`, `ctl-slow`, `history --activate`" to the `s11b.ts` row. **Mechanical.**

4. **docs/progress-and-roadmap.md:5** — header Status stale (State area overlaps; reported here because it is the
   roadmap). Doc: "Run 17 stopped at a pre-registered STOP …; the gate waits for the user's ruling; not pushed … 4535
   unit tests green (`npm test` → 4535 passed, 183 files, S4-live's tree". As built: gate accepted (#311), pushed to
   `ce1f06d` (#311), S6 + Run 17b done, close waits on #318 (phase doc 595, 637-650); 4665/191. The roadmap's own §1 row
   (line 172) and Step 11b block (828-843) are already current. Fix: rewrite the lead clause to "Step 11b built
   2026-10-26/27, gate accepted (#311), S6 and Run 17b done; closing waits for the user's ruling on #318; pushed to
   `ce1f06d`, later commits not pushed … 4665 unit tests green (`npm test` → 4665 passed, 191 files, S7-live's tree)",
   with an *updated 2026-10-27* note. **Mechanical.**

5. **docs/progress-and-roadmap.md:172** (§1 table, Step 11b "What" column) — Doc: "rules from the block list held
   while a bridge `navigate`, `back`, `forward` or `downloadStart` runs". As built S6 (phase doc 599-601): `newTab` with
   a URL is covered too. Fix: insert "`newTab` with a URL (opened on `about:blank` first, S6)". **Mechanical.**

6. **docs/progress-and-roadmap.md:696-700** (Risks → Tab safety) — Doc: "The block list is not a network firewall: a
   page can still load a blocked host, and so can a `newTab`'s first request … `newTab` leaks 1 request (RD-2, #295)."
   As built: R17B-RD-2 blocked 0 (phase doc 621-628, 642). Fix: drop "and so can a `newTab`'s first request" and add
   "*Superseded 2026-10-27: was "and so can a `newTab`'s first request", because S6 opens it on `about:blank` first and
   Run 17b measured 0 blocked requests (R17B-RD-2).*" **Mechanical.**

7. **docs/progress-and-roadmap.md:804** (Phase E block) — Doc: "…because Step 11b built the rule (Run 17 RD-1, RD-3);
   `newTab` stays uncovered (#295).*" As built: same as 6. Fix: append "*Updated 2026-10-27: `newTab` is covered since
   S6 (R17B-RD-2: 0 blocked requests; #311).*" (the Superseded note itself stays as written). **Mechanical.**

8. **docs/progress-and-roadmap.md:762-763** (roadmap-order notes) — Doc: "*Updated 2026-10-27 (cleanup pass): … Step
   11b (the #140 step) is built, its gate waits for the user (#307–#309); then Run 17b and Step 12 (Phase F).*" As
   built: gate ruled (#311), Run 17b run; close waits on #318. Fix: add "*Updated 2026-10-27 (second cleanup pass):
   the gate was accepted (#311); S6 and Run 17b are done; Step 11b's close waits for the user (#318); then Step 12.*"
   **Mechanical.**

9. **docs/progress-and-roadmap.md:845-849, 864-867** (Phase F block, Step 12's content) — #308 (b) is missing. Root
   CLAUDE.md:30-32 lists Step 12 as "`args` for `browser_evaluate`, console capture, keep-attached debugger, the native
   file chooser; #308 (b) a `back` that reaches bridge-built history"; decisions.md:290 "(#308 (b)) is a Step 12
   candidate"; e2e-test-plan.md:1715 "stays Step 12's (#308 (b))". The Phase F block lists the other four but not
   bridge-built `back`. Fix: add a bullet "- **A `back`/`forward` that reaches history the bridge built alone**
   (#308 (b)): today Chrome refuses it (`INTERNAL`, R17B-BACK-NOACT) unless the page had an activation (R17B-ACT-CTL);
   a Step 12 candidate (decisions.md · 2026-10-27 · #311)." **Mechanical** (pointer to a ruled candidate; it adds no
   scope). Do not add #318's "carry the helper fixes into Step 12's first wave" — that is the open recommendation.

10. **docs/e2e-test-plan.md:309** (§4.6 HIST-1) — expectation contradicts the measured #308 limit. Doc: "Navigate A →
    B, then `browser_back`, then `browser_forward` | Tab returns to A, then forward to B." As measured: a history the
    bridge built alone is refused `INTERNAL` "Cannot find a next page in history." (#308; R17B-BACK-NOACT 1 of 1), and
    works with an activation (R17B-ACT-CTL 4 of 4); setup.md:1008-1013 states the limit. HIST-1 never ran (e2e §5 Run
    17 Causes, line 3107). The row stays (rows are not edited, agent-rules §2); add below the §4.6 table: "*Note
    2026-10-27 (cleanup pass): HIST-1's expectation holds only when A and B had a user activation (a human click, or the
    bridge's `evaluate`); with "Navigate A → B" by the bridge alone, `browser_back` answers `INTERNAL` "Cannot find a
    next page in history." (#308; Run 17b R17B-BACK-NOACT, R17B-ACT-CTL; `docs/setup.md` → Safety). A run of HIST-1
    names its activation first.*" **Mechanical** (dated note, no row change).

11. **docs/setup.md:154, 408** (tool table `browser_back()` / `browser_forward()` "History navigation"; SDK `Tab`
    methods `navigate`, `back`, `forward`) — the #308 limit lives only under Safety (setup.md:1008-1013, "`back` and
    `forward` have a separate limit, not caused by Step 11b"), where a reader of the tool table will not look. Fix: add
    to the table cell "; on a history the bridge built alone Chrome refuses it (`INTERNAL`, [Safety](#safety), #308)".
    **Mechanical** (a pointer; no new claim).

12. **docs/setup.md:159, 395** (`browser_new_tab(url?)` row; `client.newTab(url?, {active?})`) — S6's visible
    differences are not in the tool/SDK reference: the tab's first address reads `about:blank` (a `tabCreated` /
    `tabs.onCreated` reader sees `about:blank`) and its history has one more entry (spec §6.2 note, setup.md:992-993).
    Low impact (only the Safety section and the upgrade note at line 101 say it). Fix: optional pointer "with a URL it
    opens a blank page first ([Safety](#safety))". **Needs-the-user** (whether reference rows should carry it; it is
    a style call, not an error).

13. **docs/plans/2026-10-26-step11b-block-list-redirects.md:660-664** (the phase doc's own Follow-ups) — stale against
    its As built. Doc: "*Added 2026-10-27:* the user's ruling on #307–#309 (Open decisions), then a short **Run 17b** of
    the rows not run (…); `newTab` on `about:blank` if #295 is ruled for it; …". As built: ruled (595), S6 (599), S7-*
    (609-628). Fix: "*Corrected 2026-10-27: was "the user's ruling on #307–#309, then a short Run 17b …; `newTab` on
    `about:blank` if #295 is ruled for it"; as built: ruled (#311), S6 and Run 17b done (phase doc § As built); open:
    #318.*" — the remaining items (#308 (b), `safety-hop.ts` notes, the regex bound) stay. **Mechanical.**

14. **docs/decisions.md:514-525** (out of area; for the Decisions cleaner) — "`newTab` stays uncovered until the user
    rules on opening it on `about:blank` (#295)" has no superseded marker though its Revisit-if ("the user rules for
    it") was met by #311 and built as S6. Same for the spec's S3a amendment at
    daemon-sdk-multi-actor-design.md:766 ("every other method and `newTab` (#295) are unchanged"), which the later S6
    note at 777 overrides without a back-pointer; suggested: "*(superseded for `newTab` by the 2026-10-27 S6 note
    below)*". **Mechanical** (pointers).
