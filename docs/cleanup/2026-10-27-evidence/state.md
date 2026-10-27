# State area cleaner — cleanup pass 2026-10-27

Ran as Sonnet 5.5 (claude-sonnet-5-5), effort medium. Read only; no other edits. Base `1c29942..HEAD` = 39 commits; `git status -sb` = `main...origin/main [ahead 36]`.

Confirmed consistent: test count 4535 / 183 files (CLAUDE.md:112, roadmap header, phase doc gate checklist); 24 tools / 27 codes (26 on wire) / 27 router methods everywhere; resume point (the user's ruling on #292/#293/#295/#307–#309, then Run 17b, then Step 12) agrees in CLAUDE.md, roadmap, phase doc, decisions.md; loaded extension = Step 11b build (Run 17 RD-0); nothing pushed. `docs/plans/next-session-prompt.md` is still Step 11b's kickoff (heading "Next session — Step 11b..."): confirmed, lead flags it.

## Findings

1. **CLAUDE.md:17** — commit count wrong. Says "Step 11b's ~45 commits are not pushed"; git says 36 ahead of origin/main (39 since 1c29942, which includes 3 commits before the Step 11 push boundary or already counted). Fix: "36 commits" (state the count as of the cleanup, and the cleanup commit makes it 37), or drop the number. Mechanical.

2. **README.md:52** — test count and status stale. "3811 unit tests green in 154 files (`npm test` 2026-10-26 on Step 11 S6's tree)" vs CLAUDE.md:112 "4535 passed, 183 files (... 2026-10-27, Step 11b S4-live ...)". Also the Status section (README.md:21–60) has no Step 11b paragraph and still says "The block list is not a network firewall" (README.md:~35) although setup.md Safety (setup.md:975–983) now says the rule stops a redirect hop of `navigate`/`downloadStart`. The run list ends at Run 16; no Run 17. Fix: 4535/183; add a short Step 11b sentence (built, gate waits, Run 17 RD-1/RD-3 0 requests, `newTab` uncovered); soften the firewall sentence. Mechanical for the count; the wording of the Step 11b sentence can be applied by the lead.

3. **docs/progress-and-roadmap.md:3** — header `Date: 2026-10-26` while the Status line is "updated 2026-10-27, Step 11b close-out" (line 5). Fix: Date 2026-10-27. Mechanical.

4. **docs/progress-and-roadmap.md:168–171 (the step table)** — the table ends at "Step 11" and has no Step 11b row, though the block at line 824 exists. Fix: add a Step 11b row (built, gate not met, #307–#309). Mechanical.

5. **docs/progress-and-roadmap.md:761** — "Next: the #140 step, then Step 12 (Phase F)." (a dated "Updated 2026-10-26" note in the Next paragraph). Step 11b (the #140 step) is now built; the live resume point is the user's ruling. It is a dated note, so the lead may add `*Updated 2026-10-27: Step 11b built; gate waits for the user's ruling (status line).*` rather than edit. Mechanical.

6. **docs/progress-and-roadmap.md:655** — "Until Step 11b S0F, a raw client can upload a missing file's path." S0F-b is built (`0202888`); the line reads as a future condition inside the Step 11 known-limits list. Fix: "Before Step 11b S0F-b, ..." with a dated Superseded note. Mechanical (low priority).

7. **recipes/CLAUDE.md:25–26** — tsconfig list and count stale. "`tsconfig{,.fe,.s6,.s9,.s10,.s11}.json` ... all six exit 0 since S3c" vs root CLAUDE.md:114 "tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b ... all seven exit 0" and `recipes/tsconfig.s11b.json` exists on disk; the Step 11b gate checklist also says "seven recipes tsconfigs exit 0". Fix: add `.s11b`, "all seven exit 0 (Step 11b S4)". Mechanical. (recipes/CLAUDE.md:150 does mention `s11b` helpers, so only the list line is stale.)

8. **docs/setup.md:94–99 (reload note)** — the reload notes stop at Step 11. Step 11b changed the extension and manifest (`git diff` on `extension/manifest.json`: added permission `declarativeNetRequestWithHostAccess`), so a reload (and Chrome's permission re-grant behaviour) is needed after upgrading; the roadmap/CLAUDE.md say the loaded extension is the Step 11b build. Fix: add `*Updated 2026-10-27: Step 11b changed the extension (a new permission) — reload it; an extension not reloaded since Step 11 does not stop redirect hops.*` Needs-the-user only for the exact wording of what Chrome shows on a permission change (not measured here); the sentence itself is mechanical.

9. **recipes/README.md:73 and docs/setup.md:382–383** — "`tsconfig.json` and `tsconfig.fe.json` cover the older ones" / "tsconfig.s6.json covers the Step 8 recipes" give no list of the later configs (s9, s10, s11, s11b). Not contradictory, only incomplete; low priority. Mechanical or leave.

10. **extension/CLAUDE.md** (doc-check: 3787 words, budget 3500) — over budget by 287 words after Step 11b additions. Not state text, but the lead should route it to gotcha placement (move detail to `extension/src/handlers/CLAUDE.md` or the DNR facts to a sub-folder file). Needs-the-user (a CLAUDE.md rewrite is a proposal).

11. **docs/cleanup/2026-10-27-evidence/** is untracked (`git status`); expected until the lead commits the report. No action beyond including it in the cleanup commit (or deciding to keep the evidence out).

## Not found (checked)
- Pushed/not-pushed: CLAUDE.md:17, roadmap line 5, phase doc G11b-1 ("nothing pushed") and decisions agree (only the number in 1 is off).
- Package CLAUDE.md status-like lines (daemon, sdk, mcp, shared, extension): no "pushed", run-number or loaded-build claims that contradict; mcp/CLAUDE.md:11 and extension/CLAUDE.md:49–53 name Step 11b S0F/S1 correctly.
- Phase doc header status and gate checklist agree with decisions.md Open decisions (#307/#308 and the #292/#293/#295 list); the phase doc's "Follow-ups" entry for Run 17b matches CLAUDE.md.
- doc-check "Test counts stated" flag (CLAUDE.md:112 4535) is satisfied by the latest `npm test` per the phase doc (4472/177 → 4535/183); recheck against a fresh `npm test` if the lead wants a green flag.
