# Plan drift — cleanup pass 2026-10-27

Area cleaner: Plan drift. Model: Claude Opus 5.5, medium effort. Read only; this file is the only write.
Scope: `git diff 1c29942..HEAD`; as-built = `docs/plans/2026-10-26-step11b-block-list-redirects.md` § As built and
§ Gate checklist (not met, #307–#309), code under `extension/src/` (`safety-dnr.ts`, `safety-dnr-keeper.ts`,
`safety-hop.ts`, `safety-call.ts`, `upload-exists.ts`, `upload-paths.ts`, `options-model.ts`, `safety.ts`, `sw.ts`).
There is no later plan file (no Step 12 / Phase F phase doc under `docs/plans/`); later-plan drift is checked in the
roadmap, the kickoff and the closed Step 11 phase doc's Follow-ups.

Line numbers are at HEAD `39619cc`.

## Findings

### 1. `docs/setup.md:997-998` — the R14-5c sentence lost a clause with no marker (the known item)
- **Wrong:** S5 shortened the Run 14 sentence and dropped its last clause; the paragraph's only marker (`*Superseded
  2026-10-25 …*`) is older and is about "not yet measured live". Writing guide rule 5 (setup.md is a living doc).
- **Before** (`git show 1c29942:docs/setup.md`, the paragraph ending at old :980): "The download's check of its final
  address was measured live in Step 10's Run 14 (row R14-5c): a download redirected onto a blocked host was refused
  `DOMAIN_BLOCKED` with no file written, and the test server saw the redirect hop and the target each requested
  once."
- **Now** (:997-998): "The download's check of its final address was first measured in Step 10's Run 14 (row R14-5c):
  a download redirected onto a blocked host was refused `DOMAIN_BLOCKED` with no file written."
- The fact survives at :983 ("before Step 11b it saw 1 (Run 13 SAFE-5b, Run 14 R14-5c)"), so nothing measured is
  lost (S5-verifier2.md Note; S5.md:57).
- **Fix (preferred, restoration):** it is a true record of Run 14, so put it back in the past tense:
  "… refused `DOMAIN_BLOCKED` with no file written, and the test server saw the redirect hop and the target each
  requested once (before Step 11b's rule)." **Alternative (marker):** append to the 2026-10-27 marker at :975-977:
  "; and the R14-5c sentence below dropped 'and the test server saw the redirect hop and the target each requested
  once', now stated above as 'before Step 11b it saw 1'".
- **Mechanical.**

### 2. `docs/setup.md:972-974` — "back/forward can make Chrome load it" contradicts the new paragraph
- **Wrong:** the unchanged sentence still lists `back`/`forward` among what the block list does not stop, while S3a
  holds the tab rules during `back`/`forward` (#302) and the new text at :987-989 says that is built but unmeasured.
- **Evidence:** :972-974 "It does not stop a page from loading a blocked site: script on an allowed page (an agent's
  `evaluate` included), a meta refresh, a link, or `back`/`forward` can make Chrome load it with your cookies";
  :987-988 "`back` and `forward` hold the rules while they wait for their load (#302), but Run 17 did not measure a
  redirect through them"; spec `2026-10-21-daemon-sdk-multi-actor-design.md:752-754` "While a `navigate`, `back` or
  `forward` runs, the extension holds Chrome session rules …".
- **Fix:** "… a meta refresh, or a link can make Chrome load it …; a bridge `back`/`forward` holds the rules since
  Step 11b, not measured (below)." Or keep it and add "(a bridge `back`/`forward` holds the rules since Step 11b, not
  measured: below)".
- **Needs the user** (wording of a safety claim that no row measured; S5 deliberately claimed nothing for back/forward).

### 3. `docs/setup.md:1017, 1036-1037, 1046, 1051` — `options-model.ts` line references stale since S3b
- **Wrong:** S3b (`7580d59`) added the caps-warning code above the Upload-folder strings (+35 lines); S5 did not
  re-point the references.
- **Evidence (setup.md → code now):** `options-model.ts:100` (standing warning) → now :134-136
  (`UPLOAD_FOLDERS_WARNING`); `:103-107` (reasons) → :138-142; `:113-114` (home reason) → :148-149
  (`UPLOAD_HOME_REASON`); `:115` (`.ssh` warning) → :150 (`UPLOAD_SSH_WARNING`); `:162-164` (summary) → :196-199.
  At `8d6e68c` the old numbers were right (:101, :103, :113, :115, :164).
- **Fix:** replace with the new lines, or with constant names (`UPLOAD_FOLDERS_WARNING`, …) as §4.24's K17 does, so
  they stop drifting. The other code refs checked hold: `registry.ts:613`, `safety.ts:218/220/225`,
  `upload-files.ts:37`, `error.ts:136`.
- **Mechanical.**

### 4. `docs/setup.md:812-814, :1029-1046, :1075-1076` — three S0F changes rewritten in place without a "was" marker
- **Wrong:** writing guide rule 5 asks for `*Superseded <date>: was X, because Y.*`; these use "Since Step 11b …"
  and drop the old text.
- **Evidence:** before: "It can also ask for a file that does not exist: the extension cannot see the disk, and a raw
  upload of a missing file inside an allowed folder answered ok (Run 16 row UP-RAW; … (#284), a question for you)";
  "A valid line that is risky is **warned, not refused** … `a home folder, or a folder that holds home folders: …`";
  "`browser_list_tabs` still lists a `file:` tab with its URL (the refusal covers calls, not the listing)". Now:
  "Since Step 11b the extension checks that each file exists …"; "Since Step 11b, a home folder … is refused";
  "Since Step 11b, `browser_list_tabs` lists a `file:` tab … `(hidden: blocked site)`".
- **Fix:** add after each "Since Step 11b" sentence, e.g. `*Superseded 2026-10-26: was "a raw upload of a missing file
  inside an allowed folder answered ok", because S0F-b checks each file (#288, #299).*`; likewise "was a warning" (#288
  3b, #298) and "was listed with its URL" (#288 3d). Or the lead rules "Since Step N" is an accepted marker form.
- **Mechanical** (or a one-line ruling on the marker form).

### 5. `docs/setup.md:1059-1060` — "never your home folder" reads as advice; it is now enforced
- **Evidence:** "Allow only folders that hold what you mean to share, never your home folder or a folder with
  `bridge.token` or `.ssh`." vs :1029 "a home folder, or a folder that holds home folders, is refused".
- **Fix:** "… never a folder with `bridge.token` or `.ssh` (a home folder is refused, above)."
- **Mechanical.** Low.

### 6. `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:760` — spec §10 promises an S3b note that was never written
- **Wrong:** the S3a amendment ends "`downloadStart` follows in S3b."; S3b changed contract-level behaviour (phase doc
  0.6, flagged contract-level in Open items) but `git log 1c29942..HEAD -- docs/specs/` shows spec notes only for
  S0F-a, S0F-b, S3a.
- **Evidence (as built, § As built S3b):** "`downloadStart` holds the typed download rules for its fetch; a blocked hop
  (`safety-hop.ts`, read before `ingest`, no URL kept) answers `DOMAIN_BLOCKED` with R14-5c's text; other failures
  keep today's answer (#303). The rebuild runs only on a block-list edit or an unreadable state (`rebuildsRules`,
  #302)."
- **Fix:** an `*Amended 2026-10-27 (Step 11b S3b; phase doc 0.6; #302, #303)*` note after :764 stating those two
  sentences (download rules: tab `-1`, own initiator, `xmlhttprequest`, #296; answer unchanged; rebuild narrowed),
  and change "follows in S3b" to "is the next note".
- **Mechanical** (records as built; no new decision). Also S3b-verifier.md §2 calls concurrent-download hop
  misattribution "a gap in the spec": the note may state it.

### 7. `docs/e2e-test-plan.md:1183, :1184, :1275` — SAFE-5b, SAFE-5c and R14-5c expect the hop to be requested
- **Wrong:** §4 is living; a re-run of these rows on the Step 11b build would now see 0 blocked-server hits.
- **Evidence:** :1183 SAFE-5b "8081 log: the page was loaded"; :1184 SAFE-5c "`5c2` 1 hit (the redirect hop is still
  requested — the documented limit, #140)"; :1275 R14-5c "the 8081 target logged once, since the hop is still
  requested — the documented limit of #140". As built: Run 17 RD-1 blocked 0 (navigate), RD-3 blocked 0 (download).
- **Fix:** one dated note under each row (or once above §4.20): `*Corrected 2026-10-27: was "the hop is still
  requested" (1 hit); as built, Step 11b's rule stops it: a re-run expects 0 hits on the blocked server (Run 17 RD-1,
  RD-3; Step 11b phase doc § As built).*`
- **Mechanical.**

### 8. `docs/e2e-test-plan.md:1484-1488` — §4.23's K rows quote the pre-S0F options texts and lines
- **Evidence:** K-opt-stand "… Never allow your home folder, or any folder that holds bridge.token …" (now "A home
  folder, or a folder that holds home folders, is refused; never allow …", `options-model.ts:136`); K-opt-home
  "warning | a home folder …: every file in it … could be uploaded | `options-model.ts:109` `UPLOAD_HOME_WARNING`"
  (now an invalid-line reason, `UPLOAD_HOME_REASON`, :148-149; no `UPLOAD_HOME_WARNING` exists); refs :103, :105,
  :162-165 moved (finding 3). §4.24's K17 (:1596-1597) has the current texts.
- **Fix:** one dated note above §4.23's K table: `*Corrected 2026-10-27: K-opt-stand and K-opt-home are Run 16's texts;
  as built S0F-a refuses a home folder — current texts in §4.24 K17 (Step 11b phase doc § As built S0F-a).*`
- **Mechanical.**

### 9. `docs/progress-and-roadmap.md:655` — Known limitations still says S0F is future
- **Evidence:** "Until Step 11b S0F, a raw client can upload a missing file's path." As built S0F-b (`0202888`): "only a
  readable 200 is a file, everything else refuses `BAD_PARAMS` naming `paths[i]`" (#299). Run 17 F-RAW was NOT RUN
  (liveB never started), so the live proof is still missing.
- **Fix:** "Since Step 11b S0F-b the extension refuses a missing or unreadable file (unit-tested; Run 17's F-RAW not
  run)." `*Superseded 2026-10-27: was "Until Step 11b S0F, a raw client can upload a missing file's path", because
  S0F-b built the check (#299).*`
- **Mechanical.**

### 10. `docs/progress-and-roadmap.md:308` (Step 11 block, Known limits) — "ask for a missing file" without a note
- **Evidence:** "a raw client can skip the real-path step and ask for a missing file"; changed by #288, built S0F-b.
- **Fix:** append `*Corrected 2026-10-27: a missing file is refused by the extension since Step 11b S0F-b (#299).*`
- **Mechanical.** Low.

### 11. `docs/progress-and-roadmap.md:171` (§1 table) and `:3` (Date) — no Step 11b row; Date 2026-10-26
- **Evidence:** the table ends at "| Step 11 | … | closed 2026-10-26 (#288) |"; the Status line (:5) is "updated
  2026-10-27" but `- **Date:** 2026-10-26`.
- **Fix:** add "| Step 11b | The block list stops redirected requests: DNR session rules held per `navigate` /
  `back` / `forward` / `downloadStart` call; S0F (home folder refused, missing file refused, `file:` tabs hidden) |
  Built 2026-10-26/27; Run 17 stopped at a STOP (#307); gate awaits the user |"; Date → 2026-10-27.
- **Mechanical** (overlaps the State area; the lead dedupes).

### 12. `docs/progress-and-roadmap.md:740-761` — the order paragraph still ends "Next: the #140 step"
- **Evidence:** last update "*Updated 2026-10-26 (cleanup pass): Step 11 is built … Next: the #140 step, then Step 12
  (Phase F).*"; §1 Step 11b block (:824-833) says it is built.
- **Fix:** append `*Updated 2026-10-27: Step 11 closed (#288); Step 11b (the #140 step) is built, its gate awaits the
  user (#307–#309); then Run 17b and Step 12 (Phase F).*`
- **Mechanical.**

### 13. `docs/progress-and-roadmap.md:836-840` (Phase F) — Step 11b's Step 12 candidates are not listed
- **Evidence:** phase doc Follow-ups: "a `back` that reaches bridge-built history (#308 (b), Step 12)"; "`newTab` on
  `about:blank` if #295 is ruled for it"; decisions.md:231-233 "(b) make `back` use `history.back()` … — a Step 12
  question". Phase F lists `args`, console capture, the keep-attached debugger, the native file chooser, nothing of
  these.
- **Fix:** after the user rules #295/#307–#308, add the chosen items to Phase F with their numbers.
- **Needs the user** (both are open decisions).

### 14. `docs/plans/2026-10-25-step11-file-upload.md:699-702` (closed record, Follow-ups) — the network-rule step is described as planned
- **Evidence:** "a `declarativeNetRequest` session rule (a new permission) so a redirect hop of a download or a
  navigation onto a blocked site is never sent". As built: `navigate` and `downloadStart` stopped (RD-1, RD-3 0),
  `newTab` still leaks its first request (RD-2 1, #295), `back`/`forward` hold rules, unmeasured (#302, #308).
- **Fix:** `*Corrected 2026-10-27: was planned; as built in Step 11b for navigate, back/forward and downloadStart;
  newTab's first request is not covered (#295); back/forward not measured (#308) (Step 11b phase doc § As built).*`
- **Mechanical.**

### 15. `docs/plans/2026-10-25-step11-file-upload.md:574` (closed record, gate row S5.6) — promises a Run 17 console re-run that did not happen
- **Evidence:** "re-run with the console in Run 17 (Step 11b 0.10)". As built S4-record: "R17-UP-L1, whose console
  scan never ran" (FAIL); gate D4.6 "no — RD-LOGS did not run" (#309).
- **Fix:** `*Corrected 2026-10-27: Run 17 did not measure it — R17-UP-L1 FAIL (console scan never ran), RD-LOGS not run;
  carried to Run 17b (#309; Step 11b phase doc § As built S4-record).*`
- **Mechanical.**

### 16. `recipes/README.md:37, :43-44, :73-76` — Step 11b's helpers and tsconfig missing; `s9-redirect.py` row stale
- **Evidence:** no row for `s11b.ts`, `s11b-rules.ts`, `s11b-r17.ps1`, `s11b-r17-plan.ts`, `s11b-win.ps1`,
  `s11b-win-rules.ts`, `s11b-delay.py`, `s11b-flip.py`, `s11b-slow.py` (all in `recipes/`); the typecheck block lists
  `.s6/.s9/.s10/.s11` but not `recipes/tsconfig.s11b.json` (root CLAUDE.md:115 lists seven). :37 says
  "`s9-redirect.py` | Port 8083: every GET → 302 to the same path on `http://localhost:8081`", but it takes
  `argv[1]` port and `argv[2]` target (`recipes/s9-redirect.py:61-62`), as §4.24 uses it (8083 → 8085, 8088 →
  `chrome-extension://`, 8089 → `file://`).
- **Fix:** two rows modelled on :43-44 (Run 17's wave, §4.24; the block runner `-Block liveA`/`liveB`, its pure plan,
  the UIA helpers, the three fixture servers on 8086/8091/8087); the line `npx tsc --noEmit -p
  recipes/tsconfig.s11b.json  # the Step 11b S4 files`; :37 "Port and target from its arguments (default 8083 →
  `http://localhost:8081`)".
- **Mechanical.**

### 17. `docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md:89-90` — permissions list
- **Evidence:** "**Permissions:** `debugger`, `tabs`, `scripting`, `activeTab`, `alarms`, `storage`, `offscreen`, host
  permissions `<all_urls>`." vs `extension/manifest.json:8` adds `webRequest` (Step 5) and
  `declarativeNetRequestWithHostAccess` (Step 11b S3a). The file carries no dated markers anywhere.
- **Fix:** `*Superseded 2026-10-27: Step 5 added `webRequest` and Step 11b `declarativeNetRequestWithHostAccess`
  (#290 0.3 (A)); the list of record is `extension/manifest.json`.*`
- **Mechanical.** Low (stale since Step 5; Step 11b adds one).

### 18. `docs/plans/next-session-prompt.md` — the kickoff is still Step 11b's start
- **Evidence:** title "Next session — Step 11b: the block list stops redirected requests"; Step 11b is built and waits
  at its gate; the next work is Run 17b or Step 12 depending on #307–#309.
- **Fix:** rewrite by `phase-kickoff` after the user's ruling (a wave handoff for Run 17b, or Step 12's kickoff).
- **Needs the user** (depends on the ruling). Not a drift fix for this pass.

## Checked, no drift
`README.md` (block list "not a network firewall" still true: `newTab`, human browsing; uploads paragraph true);
setup.md Uploading files' tool description (matches `registry.ts:613`); setup.md's new Redirects paragraph against
the phase doc's As built (RD-1/3/4/5/5b/6/2 numbers match); spec §10 S0F-a, S0F-b, S3a notes against the code;
e2e-test-plan.md diff since `1c29942` is additions only (§4.24, §5 Run 17).
