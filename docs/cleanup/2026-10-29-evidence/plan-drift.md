# Cleanup pass 2026-10-29 — area: Plan drift

Area cleaner (Opus, medium). Read only; no other file edited; no commit. Scope: `git diff 510b407..HEAD` (HEAD
`db7da74`); as-built `docs/plans/2026-10-27-step12-phase-f.md` § As built (lines 493-677). Files read: the roadmap
(`docs/progress-and-roadmap.md` §1, §3, §4, §5 Phase F / Phase G), `docs/setup.md` (tool table, Running JavaScript,
Reading the console, Uploading files), `docs/e2e-test-plan.md` (by line range: header 1-23, §4.27 1768-1930, §5 Run 18
and Run 19 entries 3442-3530), `recipes/README.md`, `README.md`, the spec header and §10 Step 12 notes,
`mcp/src/tools/registry.ts` (tool list, `browser_upload_file`, `browser_console_messages`), `docs/plans/next-session-prompt.md`.
doc-check (`doc-check.txt`): counts in code **25 tools, 28 router methods, 27 codes**; no path or status errors.

**Checked and clean (no finding):**
- Counts. Every current-tense count matches the code: `README.md:23` (25 tools), `docs/setup.md:137` (25 tools),
  `docs/progress-and-roadmap.md:5` (25 / 27 (26) / 28, 5596), spec :888 (28 router methods), root, `mcp/`, `daemon/`,
  `extension/`, `shared/` CLAUDE.md files. The older counts found (roadmap :223, :287, :334, :400; spec :13-25, :495, :505;
  `setup.md:178`) are dated history. One exception: Finding 3.
- `docs/setup.md`'s tool table (lines 140-170) lists all 25 tools in `registry.ts` (back/forward and new/close tab share
  a row). The new parameters match the schemas: `browser_evaluate(..., args?)` :160, `browser_console_messages(level?, limit?)`
  :163 (registry :947-949: `tab`, `level` enum, `limit` 1-200), `browser_upload_file(ref | locator, paths, chooser?)` :164
  (registry :627-632). The quoted `browser_upload_file` description at `setup.md:854-856` matches the registry string
  exactly (compared by script, whitespace normalised, 1503 = 1503 characters). The three reload-hint texts quoted in
  setup match `daemon/src/intercept.ts:38-45`.
- `README.md`'s Step 12 paragraph (lines 56-66) agrees with the run record: R19-KEEP-1 "PASS (answers only)", banner
  clause ND (`S7-run-record.md:84`); 42/5/5/3/3 of 58; 5596 in 235 files.
- `docs/e2e-test-plan.md` §4.27 has no leftover placeholders; the Run 19 entry's counts add up (58 + 5 + 5 + 3 + 3 = 74
  slice-rows, `:3525-3526`) and match the as-built.

---

## Findings

### 1. `browser_console_messages` description says frames are not read; Run 19 read a same-site frame (known item a)

- **Location:** `mcp/src/tools/registry.ts:945` (product text). The same sentence appears in `sdk/src/tab.ts:389`
  (JSDoc of `Tab.consoleMessages`) and is pinned by `mcp/test/s12-console-cross.test.ts:145,150`.
- **What is wrong:** the description says no frame is read. Live, a same-site (in-process) frame's messages were read
  (13 entries without the pattern), and with its host blocked they were dropped. Only a frame in another site's process
  was not read.
- **Evidence:**
  - Code: "Messages of the page's frames are not read; entries from a blocked site, …" (`registry.ts:945`); SDK:
    "frames' messages are not read" (`tab.ts:389`); test: `expect(d).toContain("Messages of the page's frames are not read")`
    (`s12-console-cross.test.ts:150`).
  - Run: "R19-CON-FRAME | PASS | `a-pattern entries=2 console=2 …` (386), `a-nopattern entries=13 console=12
    exception=1` (387; so leg a is discriminating: frames are read), `b-oop entries=2 console=2` (388)"
    (`…-steps/S7-run-record.md:64`).
  - Spec, which agrees with the run: "the tab's own target only; out-of-process frames are not read"
    (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:899`).
  - Already flagged: `docs/setup.md:163` (dated amendment), `setup.md:732-734`, `mcp/CLAUDE.md:65`, `extension/src/CLAUDE.md:61`.
- **Suggested fix (propose only):** in `registry.ts:945`, replace "Messages of the page's frames are not read;" with
  "Messages of a frame in another site's process are not read (a same-site frame's are, and are dropped like the page's
  when its site is blocked);". Make the same change in `tab.ts:389`. Update the `toContain` string in
  `s12-console-cross.test.ts:150` in the same commit. The #214 baseline pins input schemas only (`mcp/CLAUDE.md`), so no
  schema re-baseline is needed. When it lands, drop the amendment at `setup.md:163` and the last sentence at
  `setup.md:733-734`, and remove the caveat from `mcp/CLAUDE.md:65` and `extension/src/CLAUDE.md:61`.
- **Kind:** **needs-the-user** (product text an agent reads, plus a pinned test; it is a contract wording change at a
  closed phase, so it needs a ruling or a follow-up stage, not a cleanup edit).

### 2. Run 18's §5 entry points to a "stricter reading" its section 7 no longer holds (known item b, #351)

- **Location:** `docs/e2e-test-plan.md:3480`, the Run 18 entry's "Judgment calls and notes" paragraph. This is the
  plan's §5 entry, not `S1-run-record.md`. The record's text is correct.
- **What is wrong:** the pointer says section 7 holds a stricter reading. After the record's fix round (M2), section 7
  says the text is not ambiguous and offers no stricter reading.
- **Evidence:**
  - Entry: "…and R18-LOGS (liveA) read FAIL, not "does not run" or NOT MEASURED; **the stricter reading is in the
    record's section 7**." (`e2e-test-plan.md:3479-3480`).
  - Record: "## 7. Judgment calls to check … 1. **R18-UP-L1 and R18-SAVE-REFUSE console clauses (PASS).** Not an
    ambiguity: the sheet's words decide it. … Clause to line: …" (`…-steps/S1-run-record.md:202-213`).
  - Verifier: "N4 (NIT): a dangling pointer in the §5 entry. … still ends "the stricter reading is in the record's
    section 7". … Fix: "the reading and its clause-to-line map are in the record's section 7"" (`…-steps/S1-record-verifier2.md:36-39`).
  - Ruling: "Run 18's verifier NIT (the §5 entry points to a section 7 that no longer holds the text) is a mechanical
    fix for the cleanup pass." (`docs/decisions-archive/step12.md:460-461`, #351).
- **Exact fix:** in `docs/e2e-test-plan.md:3480`, replace `the stricter reading is in the record's section 7.` with
  `the reading and its clause-to-line map are in the record's section 7.` Change nothing else. This is a pointer in a
  notes paragraph, not an expected text or verdict, so agent-rules §2 allows it, and #351 rules it mechanical.
- **Kind:** **mechanical**.

### 3. The roadmap's §1 tool list still reads "24 tools" and leaves out `browser_console_messages`

- **Location:** `docs/progress-and-roadmap.md:196-201`.
- **What is wrong:** this is the one current-tense tool list in the roadmap, and it was not updated for Step 12.
- **Evidence:** "**24 tools** (*superseded 2026-10-26: was 23, …*): `browser_status`, … `browser_upload_file` (Step 11),
  `browser_download` (…)" (`:196-201`; 24 names, no `browser_console_messages`). Against: "**25 tools, 27 codes (26 on
  the wire), 28 router methods**" (`:5`) and doc-check's "tools: 25". The test-count note just above (`:194`) ends at
  "Step 11b — 4665 tests in 191 files"; Step 12's 5596 in 235 files is not added there.
- **Suggested fix:** change it to "**25 tools** (*superseded 2026-10-29: was 24, because Step 12 S3b added
  `browser_console_messages`*; …)" and append `` `browser_console_messages` (Step 12) `` to the list. Append to `:194`:
  "*Updated 2026-10-29 (cleanup pass): Step 12 — 5596 tests in 235 files (`npm test` on S8's tree; phase doc § As built
  S8).*"
- **Kind:** **mechanical**.

### 4. The roadmap §5 "Next" paragraph stops at "Step 11b closed; next: Step 12"

- **Location:** `docs/progress-and-roadmap.md:766` (the last dated note of §5's opening paragraph).
- **What is wrong:** Step 12 is built and run, its gate waits for the user, and the next step is the user's to name.
  The roadmap's own "what's next" paragraph does not say so.
- **Evidence:** "*Updated 2026-10-27 (close): Step 11b closed (#320); next: Step 12 (Phase F).*" (`:766`). Against: the
  gate checklist "**Not every item is met.** … G12-2 open for the user (`webNavigation`); G12-1 not granted"
  (phase doc `:613-615`) and the phase doc § Follow-ups (`:670-677`: the re-measurement wave (#373), then "Phase G
  (distribution), per the roadmap"). Root `CLAUDE.md` § Current state says the same: "The next step is the user's to
  name. Candidates are the Run 19 re-measurement wave and the Phase F follow-ups … then Phase G."
- **Suggested fix:** append "*Updated 2026-10-29 (cleanup pass): Step 12 (Phase F) is built and E2E-run (Runs 18-19;
  § Phase F below); its gate waits for the user (G12-1, G12-2, the open decisions). Next is the user's to name: the
  recipes-only re-measurement wave for Run 19's helper-limited rows (#373), the Phase F follow-ups, then Phase G.*"
- **Kind:** **mechanical**. The candidates are copied from the phase doc and CLAUDE.md, and nothing is chosen.

### 5. Roadmap: the status line still says the phase close is next, though the close-out is committed

- **Location:** `docs/progress-and-roadmap.md:5`.
- **Evidence:** "…not pushed (G12-1); **next: the phase close and the user's rulings on the open decisions**". Against:
  HEAD `db7da74` "docs: Step 12 close-out — gate checklist, Current state, CLAUDE.md gotchas, decisions archived", and the
  phase doc's "### Gate checklist · 2026-10-29" (`:611`).
- **Suggested fix:** "next: the user's rulings at the gate (G12-1, G12-2, the open decisions); the gate checklist is in
  the phase doc § As built". This overlaps the **State** area: the lead should apply one fix, not two.
- **Kind:** **mechanical**.

### 6. Roadmap Phase F: the items Step 12 built are still listed as open with no marker; "download handling" was built long ago

- **Location:** `docs/progress-and-roadmap.md:849-872` (Phase F list) and `:896-899` (Step 5 follow-up "Response bodies via CDP").
- **What is wrong:**
  - The list marks what Step 8 did with "✅ **Done in Step 8**" inline, but Step 12's items have no marker: "**`args` for
    `browser_evaluate`**" (`:858`), "**Keep-attached debugger session** … needs a lifecycle design" (`:869-870`), the
    console tool (`:851`, `:871-872`), and "intercepting the native file chooser" (`:852-853`). Only the dated S8 block
    (`:874-894`) says they were built, so a reader of the list sees them as open.
  - "download handling" (`:852`) was built on 2026-10-06 (`browser_download`, `:201`).
  - The Step 5 follow-up "it needs the keep-attached per-tab debugger session above, with an attach refcount" (`:897-898`)
    does not say that this session now exists. The phase doc's follow-up names it: "Response bodies over CDP … on D's
    session" (`:671`).
- **Suggested fix:** add an inline marker after each, in the Step 8 form: "✅ **Built in Step 12** (2026-10-27/29; the
  S8 block below)", on `args`, keep-attached and the native file chooser. Mark console capture "✅ built as its own
  tool in Step 12; appending it to the evaluate result stays a follow-up". After "download handling", add "✅ (2026-10-06,
  `browser_download`)". At `:898`, add "*Updated 2026-10-29: the reference-counted kept session exists since Step 12 S4
  (`extension/src/debugger-keeper.ts`).*"
- **Kind:** **mechanical**.

### 7. Roadmap §3: "still not verified live: the focus/input race of Stage 0 F19" is not updated for Run 19's G2 rows

- **Location:** `docs/progress-and-roadmap.md:649-651`.
- **Evidence:** "*Updated 2026-10-26 (cleanup pass): … still not verified live: the focus/input race of Stage 0 F19.*"
  Against: phase doc § As built S6 "A trusted `click`/`type`/`pressKey` without `focusEmulation` holds the visibility lock
  from a daemon-forwarded `focusTab` through the input" (`:572-574`), and the gate row "G6.8 … R19-G2-1 **FAIL** (cause
  not established), R19-G2-2 PASS" (`:648`).
- **Suggested fix:** append "*Updated 2026-10-29 (cleanup pass): Step 12 S6-G2 closes the gap in the daemon (the lock is
  held from the focus through the input + 500 ms, #338); live, R19-G2-2 passed and the timed R19-G2-1 failed with its
  cause not established (#373). §3 does not cover Step 12's other rows: see `docs/e2e-test-plan.md` §5 Run 18 and
  Run 19.*" Also, §4 Known limitations (`:653-712`) has no Step 12 entry. Add one pointer bullet, "**Step 12's limits**
  (console, kept session, chooser upload): `docs/setup.md` → Reading the console, Running JavaScript, Uploading files;
  phase doc § Follow-ups", rather than copying the limits.
- **Kind:** **mechanical**.

### 8. Roadmap Step 11 block: "the native file chooser [is] not built (Step 12 / later)"

- **Location:** `docs/progress-and-roadmap.md:312`.
- **Evidence:** "Drag-and-drop zones, the per-upload confirmation mode and the native file chooser are not built (Step
  12 / later)." Against: phase doc § As built S5 "`uploadFiles {chooser: true}` on the call's own (kept) session"
  (`:564`).
- **Suggested fix:** append "*(updated 2026-10-29: the native file chooser is built in Step 12 S5, `chooser: true`; the
  other two are still not built)*".
- **Kind:** **mechanical**.

### 9. `recipes/README.md` lists none of Step 12's 21 recipes, and its tsconfig line no longer says what s11b covers

- **Location:** `recipes/README.md` § Scripts table (lines 18-46) and § Typecheck and tests (`:80`).
- **What is wrong:**
  - The index has no row for any `s12-*` file. All of these are in `ls recipes`, and all were added in the diff:
    `s12-forms.ts`, `s12-forms-b.ts`, `s12-forms-c.ts`, `s12-rules.ts`, `s12-oldbuild.ts`, `s12-r18.ps1`,
    `s12-r18-lib.ps1`, `s12-r19.ts`, `s12-r19.ps1`, `s12-r19-lib.ps1`, `s12-r19-{a,b,c,de}.{ts,ps1}`,
    `s12-win.ps1`, `s12-win-b.ps1` and `s12-win-c.ps1`.
  - `tsconfig.s11b.json` now also includes `s12-r19-a.ts`, `-b.ts`, `-c.ts` and `-de.ts` with their tests (diff of
    `recipes/tsconfig.s11b.json`), but the README still says "`tsconfig.s11b.json # the Step 11b S4 files`" (`:80`).
    The other s12 sources are typechecked only through their tests, by `tsconfig.s6.json`'s `test/*.test.ts` glob.
- **Evidence:** `recipes/README.md:45` is the last s11b row, then `s10-ret1`, and nothing for s12. `recipes/CLAUDE.md:6`
  says the index is in `recipes/README.md`.
- **Suggested fix:** add four rows in the existing style, each citing §4.26 / §4.27 and the steps dir:
  1. `s12-r18.ps1`, `s12-r18-lib.ps1`: Run 18's block runner and its helpers (console capture per slice, banner
     control, idle guard, DevTools helper; §4.26).
  2. `s12-forms*.ts`, `s12-rules.ts`: the pure line forms and pass rules (S1-helpers, S7-helpers).
  3. `s12-r19.ts`, `s12-r19.ps1`, `s12-r19-lib.ps1`, `s12-r19-{a,b,c,de}.{ts,ps1}`: Run 19's actor, runner and
     per-slice drivers (§4.27).
  4. `s12-win*.ps1`, `s12-oldbuild.ts`: the UIA helpers, and the old-build loader for the VERSION rows.

  Change `:80` to "the Step 11b S4 files and Step 12's `s12-r19-{a,b,c,de}` drivers (chrome-typed)". The exact one-line
  wording of each row should come from each file's header comment (Step 8 0.7). A builder should write the rows after
  reading those headers.
- **Kind:** **mechanical**, for a Sonnet doer that reads the headers. **Cross-area:** `recipes/CLAUDE.md` § Key files
  (`:6-29`) has no s12 entry either, and still says "`tsconfig{,…,.s11b}.json` … all seven exit 0, 2026-10-27". That
  belongs to the **Gotcha placement** area (Key files match the tree).

### 10. The spec has no note on the kept debugger session (D); its S2a/S3a notes still say each call detaches

- **Location:** `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:868-869` (S2a: "`Debugger.disable` is sent on
  every path before the detach") and `:900-901, :916` (S3a: "`Runtime.disable` on every path, then the detach"; "The
  banner shows during the call.").
- **What is wrong:** since S4b, the calls run through the keeper (`extension/src/debugger-keeper.ts`). The session is
  kept and detached 5 s after the last use, or at once on a disarm, block, `file:`, close or replace. The spec's S5a note
  already says "through the keeper" (`:934`) and cites the kept session's lifecycle (#335, `:920-921`), but no §10 note
  describes the keeper itself. The S2a/S3a "then the detach" wording now describes the keeper's release, not a detach
  per call. The phase plan did not require a spec note for S4 ("S4b … `docs/setup.md` (the banner's new behaviour)",
  phase doc `:350`), so this is a gap, not a skipped exit check.
- **Evidence:** phase doc § As built S4: "one session per tab, reference-counted, idle detach at 5 s, every detach
  trigger of #335, the start-up sweep, the gate re-check before every use; wired through `withDebugger`" (`:554-556`).
  `setup.md:560-575` documents the kept session and its live banner timings (R19-KEEP-2: median 5.1 s longer).
- **Suggested fix:** add one dated §10 note, "*Amended 2026-10-29 (cleanup pass; Step 12 S4, decisions #335, #352; phase
  doc § As built S4): a debugger use goes through a per-tab keeper … ; "the detach" in the S2a and S3a notes above is the
  keeper's release; the banner stays until the idle detach.*". Also add one sentence to the spec header's latest dated
  correction (`:25-26`), "Step 12 (Phase F: §10's Step 12 notes) is built and E2E-run (Runs 18-19); its gate waits for
  the user", so the header names the phase whose notes now fill §10.
- **Kind:** **needs-the-user**, lightly. The spec is the design of record, and the notes are marked "proposed, for the
  user at Step 12's gate". The lead may treat the header sentence as mechanical and propose the keeper note together
  with the gate's other notes.

### 11. `docs/plans/next-session-prompt.md` is the resume prompt for S7-drivers-C, three stages and a close ago

- **Location:** `docs/plans/next-session-prompt.md:1-30`.
- **Evidence:** "# Next session — Step 12: Phase F, ergonomics — resume at S7-drivers-C" … "**The tree is not clean, on
  purpose.** `git status` shows S7-drivers-C's uncommitted work … **Do not commit, stash or revert any of it**". Against:
  the S7-drivers-C work is committed (as-built S7 `:576`), S8 and the close-out are committed (`87aa919`, `db7da74`), and
  the tree is clean apart from this pass's evidence directory. A fresh session that pasted this prompt would look for
  uncommitted work that no longer exists.
- **Suggested fix:** replace it with the `phase-kickoff` skill, or, until the user names the next step, put a dated
  banner at the top: "*Superseded 2026-10-29: Step 12 is built and closed out (`db7da74`); its gate waits for the user.
  Do not resume from this prompt. The next kickoff is written when the user names the next step (root `CLAUDE.md`,
  Current state).*"
- **Kind:** the banner is **mechanical**; a new kickoff **needs-the-user** (the next step is theirs to name).

### 12. `docs/e2e-test-plan.md` header: the current count and live coverage stop at Step 11

- **Location:** `docs/e2e-test-plan.md:14-16`.
- **Evidence:** "*Corrected 2026-10-26 (cleanup pass): was "3273 tests in 132 files" as the current count; on S6's tree
  `npm test` runs 3811 tests in 154 files …, and Step 11 is covered live by §4.23 (Run 16 in §5).*" There is nothing for
  Step 11b (§4.24-4.25, Runs 17/17b) or Step 12 (§4.26-4.27, Runs 18-19). Against: 5596 in 235 files (as-built S8, `:607-608`).
- **Suggested fix:** append "*Corrected 2026-10-29 (cleanup pass): was "3811 tests in 154 files" as the current count;
  on S8's tree `npm test` runs 5596 tests in 235 files (Step 12 phase doc § As built S8); Step 11b is covered live by
  §4.24-§4.25 (Runs 17, 17b) and Step 12 by §4.26-§4.27 (Runs 18, 19).*"
- **Kind:** **mechanical**.

### 13. (NIT) The commit count "90 commits not pushed" is one behind

- **Location:** phase doc gate row G12-1 (`:657`), "`git log origin/main..HEAD` lists 90 commits (2026-10-29)", and root
  `CLAUDE.md` § Current state ("90 commits are not pushed").
- **Evidence:** `git rev-list --count origin/main..HEAD` → **91** at `db7da74`. The close-out commit itself is the 91st.
- **Suggested fix:** leave the gate row as written; it is a dated measurement taken before the close-out commit. If
  anything, write CLAUDE.md's line as "Step 12's commits are not pushed (G12-1)" without a number, which goes stale with
  every commit. This belongs to the State area.
- **Kind:** **mechanical** (State area's call).
