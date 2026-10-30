# Cleanup pass 2026-10-30-2 — area: Decisions

**Cleaner:** Opus 5.5, medium effort, read only (this file is its only write).
**Scope:** `git diff dffb405..HEAD`; `docs/decisions.md`; `docs/decisions-archive/` (index, `step13.md`); the phase doc
`docs/plans/2026-10-30-step14-phase-g-own-devices.md` (§ Decisions, § As built, § Gate checklist); `#N` citations in the
living docs (root and package `CLAUDE.md` files, `docs/setup.md`, `docs/progress-and-roadmap.md`, `README.md`,
`.claude/skills/`, `docs/agent-rules.md`, `docs/plans/next-session-prompt.md`, `scripts/bridge/`).
**Premise kept:** Step 14's gate is open (#432, G14-1), so #421–#432 stay in `docs/decisions.md`; their not being
archived is not a finding.

**What checks out (no finding):**
- Archive index: each file's headings carry exactly the numbers its row claims, with the counts (step13.md: #375–#420,
  46 headings; step11.md skips #265 as its row says; step9.md ends #200, #202). `decisions.md` holds #421–#432, 12.
- Every `#N` in the living docs is ≤ 432 and names an existing entry (none cites #265 or a number above 432).
- The Step 14 citations in code and docs point at the right entries (#427–#432 in `scripts/bridge/*`,
  `scripts/test/s14-*.test.ts`, `docs/setup.md:68`, root `CLAUDE.md:19,23,116`, roadmap `:5`, `:175`).
- #429, #431, #432 match the build: `lib.mjs:96` `claude mcp add -s user … -- node <entry>` with no env; `--replace-mcp`;
  doctor's BRIDGE_TOKEN equality check (`lib.mjs:168-170`); `--no-reload` and reload exit 2 → one re-run → hint
  (`lib.mjs:222-228`); the heuristic (`lib.mjs:136-141`) and "never spawns or hands over" (`doctor.ts` own hello).
- #430 matches `docs/setup.md:624-653` (the `file:` dependency, the junction removal by `cmd /c rmdir`, #220).
- Standing entries citing `step13.md` (#385, #389 "kept by #420", #420) match #420 item 5 ("**#385 and #389 kept** as
  built").

## Findings

### 1. Stage-level proposed decisions of Step 14 were never recorded (and one contradicts #427)
- **Location:** `docs/decisions.md` Log (ends at #432, Stage 0); steps dir reports.
- **What is wrong:** every Step 13 stage had its accepted proposals recorded as entries (e.g. "S2: page `toJSON` hooks
  never reach `value` … (#396)"); Step 14 recorded none after Stage 0. Unrecorded proposals: `S2a-builder.md` §5 (Node
  floor 20; skip `npm ci` when the hidden lockfile is current; `.mjs` typechecked by `scripts/tsconfig.json`),
  `S2a-fixer1.md` (a missing `claude` CLI stays exit 0; a failed run or unparsable config is exit 2), `S2a-verifier.md`
  §5 (I2.1 judged by content), `S2b-builder.md` (three: the doctor under tsx; what it compares and which lines are
  hints; update exits 0 or 1), `S5-verifier.md` §5 (the clone URL, finding 2).
- **Evidence, the contradiction:** #427: "`npm run setup`, `npm run doctor`, `npm run bridge-update`, Node `.mjs` (the
  setup entry on Node built-ins only …)". As built, `package.json`: `"doctor": "tsx scripts/bridge/doctor.ts"`;
  `S2b-builder.md:83`: "### 2026-10-30 · The doctor runs under tsx and probes with its own hello and `daemon.status`".
  The phase doc's As built says "`npm run doctor` (tsx)" but no decision changes #427. Consequence noted by
  `S2b-verifier.md` NIT-6: "Before `npm run setup`, `npm run doctor` fails with npm's 'tsx not …'".
- **Suggested fix:** the session agent records the accepted ones as #433+ ("S2a: …", "S2b: …", "S5: …"); at least the
  tsx doctor as "changes #427 for the doctor". Build-detail ones may be recorded in one entry.
- **Kind:** mechanical (the session agent writes it; no substance changes, the build is already accepted by verifiers).

### 2. The clone line names the owner's GitHub handle; a proposal says "revisit if the user wants it out" (#374)
- **Location:** `docs/setup.md:23`, `README.md:15`; `S5-verifier.md` §5.
- **What is wrong:** #374 (Standing): "no local path or name in new committed docs". New docs now carry
  `git clone https://github.com/<owner>/chrome-agent-bridge`. The S5 verifier proposed keeping it ("it is the
  project's public address, not a local path or the user's personal name … **Revisit if:** the user wants the handle
  out of the docs. **By:** Claude (proposed)"), but it is neither recorded nor listed as open.
- **Suggested fix:** record it and list it under Open decisions for the gate (options: keep the public URL
  (recommended: a reader cannot clone without it); `<repo-url>`).
- **Kind:** needs-the-user.

### 3. The proposed entries #421–#426 carry no pointer to the entries that changed them
- **Location:** `docs/decisions.md:239-264`.
- **What is wrong:** each still reads as standing with "**By:** Claude (proposed)". The pointers sit only forward:
  #427 "Changes #422; keeps #421, #426", #428 "Settles #423", #429 "Refines #424", #430 "Changes #425's open question".
  #421 and #426 were kept (`Stage0.md` §3: "0.2 … **KEEP, with one change to the order's footing**", "0.7 … **KEEP**")
  but still say "(proposed)". The lead paragraph at `:235-237` explains the scheme, but a reader landing on #425 (which
  still says "importing `<repo>/sdk/dist`" as a candidate) sees no "changed by #430".
- **Suggested fix:** one dated line per entry: #421 "Kept by Stage 0 (Stage0.md §3); the S2 split changed by #427";
  #422 "Changed by #427"; #423 "Settled by #428"; #424 "Refined by #429"; #425 "Changed by #430"; #426 "Kept by
  Stage 0". The same gap was raised last pass for Step 13 (P6, finding 6) and is still unapplied (finding 6 below).
- **Kind:** mechanical.

### 4. The Open decisions line for #432 has no options or recommendation; G14-1 and the b9ac1bf squash are not listed
- **Location:** `docs/decisions.md:12-13`.
- **What is wrong:** the writing guide: "A decision waiting for the user is listed under **Open decisions** … with the
  options and a recommendation". The line reads only "Stage 0: the doctor reads the extension's build as a heuristic;
  no protocol change (#432) — for the user's review at Step 14's gate." The other items waiting for the user are named
  elsewhere: phase doc `:193` "Open for the user: #432 …, G14-1 (the push)"; root `CLAUDE.md:25-26` "The Stage 0
  commit b9ac1bf holds one evidence line with the checkout's absolute path …; squashing it before the push is the
  user's call." The squash appears in neither Open decisions nor the phase doc's "Open for the user" line (the As built
  Incidents bullet only says the line "still holds … in history").
- **Suggested fix:** #432's line: "options: (a) keep the heuristic (recommended; no contract change) or (b) a build id
  in the extension's hello and `daemon.status`". Add one line "Before G14-1: squash b9ac1bf's absolute-path evidence
  line out of history, or push as is (root `CLAUDE.md` Current state)", and the S5 clone URL (finding 2). Add the
  squash to the phase doc's "Open for the user" line too.
- **Kind:** mechanical for the wording; the items themselves are the user's.

### 5. The Log's lead says "New entries start at 421"
- **Location:** `docs/decisions.md:190-191`.
- **What is wrong:** "The current step's entries, newest first. … New entries start at 421." The log already ends at
  #432.
- **Suggested fix:** "Step 14's entries start at 421; the next is 433."
- **Kind:** mechanical.

### 6. Last pass's decision proposals P6, P8, P11 were not applied and not ruled
- **Location:** `docs/decisions-archive/step13.md`; `docs/decisions.md` Standing.
- **What is wrong:** `docs/cleanup/2026-10-30.md` proposed **P6** (pointer lines #376 → #385, #404 → #406/#407, #386 →
  #396, #406 → #407), **P8** (a Standing line for #395, "mutants and pre-slice runs never touch the main tree"), and
  **P11** (Standing lines for Step 13's candidates "#385, #386/#396, #387, #389, #398, #407"). #420 does not rule on
  them. Now: `grep "replaced by|withdrawn by|narrowed by|ruled by|changed by" step13.md` finds no such pointer line;
  Standing lists from Step 13 only #385, #389 and #420. Product promises built in Step 13 with no Standing line:
  #377 "`evaluate`'s value keeps the page's key order", #379 / #398 the console texts and cap marker, #396 page
  `toJSON` hooks never reach `value`.
- **Suggested fix:** carry P6, P8, P11 into this pass's "Proposed" list unchanged (Standing additions: #377 with #386/#396,
  #379/#398, #395, #387 if the user wants a limit listed).
- **Kind:** P6 mechanical; P8 and P11 need-the-user (they choose what "still governs").

### 7. #428 omits the yes/no question and the history caveat that were built
- **Location:** `docs/decisions.md:221-225` (#428) against `scripts/bridge/setup.mjs:102-115`, `docs/setup.md:35-37`.
- **What is wrong:** #428: "the install copies `bridge.token` with `clip.exe` (stdin), says so, waits for Enter, then
  empties the clipboard; … a history-excluded copy is used only if S2 measures it." Built: it first asks "Copy the token
  to the clipboard for the extension's Options page? [y/N]" (copy only on yes), and since no history exclusion was
  measured or built it says "Windows clipboard history, Win+V, may keep a copy: delete it there after pasting". The ask
  came from `Stage0.md:123` ("ask, clear after Enter, exclusion only if measured"), so the entry is a lossy summary,
  not a wrong one; the conditional on S2 is left dangling.
- **Suggested fix:** add to the stage entry of finding 1: "#428 as built: asked first [y/N]; no history-excluded copy
  (not measured); the user is told to clear Win+V".
- **Kind:** mechanical.

### 8. #430 names one install command; as built the folder needs three and installs tsx too
- **Location:** `docs/decisions.md:207-212` (#430) against the phase doc As built (S3) and `docs/setup.md:620-630`.
- **What is wrong:** #430: "`npm install <repo>\sdk` in the script's folder, then `npx tsx script.ts`". As built: "the
  folder runs `npm init -y`, `npm pkg set type=module`, `npm install <repo>\sdk tsx` (npm 11's init writes `commonjs`)".
  The way (a `file:` dependency) is unchanged; the detail is not.
- **Suggested fix:** an "As built (S3)" line on #430 or in the stage entry of finding 1.
- **Kind:** mechanical.

### 9. The roadmap cites #396 for the key-order promise, whose decision is #377
- **Location:** `docs/progress-and-roadmap.md:174` (Step 13 row).
- **What is wrong:** "`evaluate`'s value in the page's key order (#396)". #396 is "S2: page `toJSON` hooks never reach
  `value`; `__mark` present exactly when a mark was asked"; the key-order decision is #377 "`evaluate`'s value keeps the
  page's key order: the serialiser's envelope crosses as a JSON string", built by #386 and narrowed by #396.
- **Suggested fix:** "(#377; #386, #396)".
- **Kind:** mechanical.

## Count
9 findings: 6 mechanical (1, 3, 5, 7, 8, 9), 1 needs-the-user (2), 2 mixed (4: wording mechanical, items the user's;
6: P6 mechanical, P8/P11 the user's).
