# S0F-a — verifier report

Model / effort: Opus, medium. Role: verifier (agent-rules §6). Read and run only. Nothing committed and no tracked file
edited; the only file written is this report.

## 1. Verdict

**PASS-with-notes.** Every exit check for every stage and F.1's S0F-a part holds, and both mutants the brief names go
red. Two MINOR findings are doc drift in `docs/setup.md`: a sentence the build made false, and three line citations
that shifted. The rest are NITs.

## 2. Outputs: checks re-run (main tree, uncommitted S0F-a build)

| Check | Command | Result |
|---|---|---|
| Tests after | `npm test` | `Test Files 156 passed (156)`, `Tests 3825 passed (3825)` |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Recipes | `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11}.json` | all six exit 0 |
| Clean after build | `git status --short` | only the builder's 11 modified files and 3 untracked files. `journal.md` was already modified before the stage. No `dist/` file is tracked. |
| Counts | `node scripts/doc-check.mjs` | `tools: 24 · router methods: 27 · codes: 27`. `git diff HEAD --stat -- shared daemon sdk extension/manifest.json` is empty, and `grep -c '^  reg.tool('` gives 24. |
| No log added | `git diff HEAD -- extension/src mcp/src \| grep '^+.*\(console\.\|log(\)'` | no match (rc=1). `log-scan` and `log-sentinel` are green in the full run. |

**The test count before the stage, measured.** I made a scratch worktree at HEAD `a970ec3` under the scratchpad and
ran `npm ci` there (no junction). `npx vitest run` gave `Tests 9 failed | 3802 passed (3811)` over 154 files. All 9
failures are in `recipes/test/s11-r16-runner.test.ts` (`Stop-S16Pid: expected null not to be null`). The cause is the
checkout: `file` reports `recipes/s11-r16.ps1` as "with CRLF line terminators" in the worktree and LF in the main tree.
That is an artefact of the environment, not of HEAD. So the count before is **3811 across 154 files**, which matches the
root `CLAUDE.md` and the builder.

**The count after:** 3825 = 3811 + 14, and no test was removed. The 14 are 8 in `s0f-home-folders`, 4 in
`s0f-file-tabs`, 1 in `s2-focus-first` (MCP), and 1 from the split of the `s11-rules` drift test. The builder's report
says the home file has 7 tests; it has 8 (`npx vitest run extension/test/s0f-home-folders.test.ts` → `Tests 8 passed (8)`).
Its total is still right; see N2.

**The new tests fail on HEAD.** I copied the 6 new or changed test files into the worktree at HEAD and ran them:
`Test Files 6 failed (6)`, `Tests 16 failed | 141 passed (157)`. Every new or changed test is red there:

- all 8 in `s0f-home-folders` and all 4 in `s0f-file-tabs`;
- the 2 changed tests in `s3-options-upload` and the 1 in `s2-upload-gate`;
- the new MCP test;
- the `s11-rules` drift test.

With the build's `src` copied in as well, the same run gives `6 passed`, `157 passed`.

**Mutants (in the worktree):**

- **A: the home check runs only on the options page.** I removed `isHomeFolder` from `parseUploadFolderLine` and
  called it inside `analyzeUploadFolders` instead. Result: `6 failed | 13 passed`. All three caller-2 tests are red,
  including "a home line already in storage.local: the store hands the gate no folder for it, and uploadRefusal
  refuses".
- **B: `hiddenReason` skips `file:`** (the `safetyDecision` change kept). Result over `extension/test`:
  `4 failed | 1947 passed`. Red are the `hiddenReason` test, the `listTabs` row test, the `tabCreated`/`tabRemoved`
  test, and `s2-upload-gate`'s `listTabs` test.

**Every tab-event path in `sw.ts` (lines 185–205):**

- `tabCreated` goes through `redactTabCreated` with `[created.url, created.pendingUrl]`, and its params carry no title
  (`tab-events.ts:136-143`).
- `tabRemoved` goes through `redactTabRemoved` with the cached `lastUrl`.
- `tabReplaced` carries only `{addedTabId, removedTabId}` (`tab-events.ts:153-155`).
- `onUpdated` only updates the cache; no event is sent.
- `safetyState` carries no URL.

For `listTabs`, `handlers/tabs.ts:40` passes every row with its `pendingUrl` through `call.redactRows` and on to
`redactListTabsRow` (`safety-call.ts:282-284`). All three redactors read `hiddenReason`, the one function that changed.

The only other handler result that carries a URL is `navigate`'s `{url}`. A navigate on a `file:` page, or to one, is
already refused (#245 (a)), and a redirect onto `file:` belongs to RD-8 in a later stage.

I removed the worktree afterwards. `git worktree remove` failed with "Directory not empty", but the worktree was
already deregistered. I checked that every link left inside it pointed into the scratch tree (the `@bridge` workspace
links), removed those links with `cmd /c rmdir`, then deleted the rest and ran `git worktree prune`. The main tree is
intact: `node_modules/.bin` holds 42 entries and `@bridge/{daemon,extension,mcp,sdk,shared}` is present, and a re-run of
`s0f-home-folders` there passes. No process was left running.

## 3. Findings

**M1 · MINOR · `docs/setup.md:1056-1057`: the build made a user-facing sentence false.**
- The sentence reads: "`browser_list_tabs` still lists a `file:` tab with its URL (the refusal covers calls, not the
  listing)". After S0F-a, `browser_list_tabs` lists a `file:` tab without its URL, as a blocked tab is listed.
- Evidence: `sed -n 1056,1057p docs/setup.md` shows the sentence above. `s0f-file-tabs.test.ts` ("listTabs row: drops
  title and url, carries hidden: blocked") passes.
- Agent-rules §4 says code and doc never diverge silently. The builder's lane allowed only "the quoted lines" of
  setup.md, and its report missed this sentence.
- **Fix:** the step agent grants the line, and a fixer rewrites it to say the listing shows a `file:` tab hidden, as
  `(hidden: blocked site)` without its URL or title. The citation is spec §10's 2026-10-26 note. Do this before the
  commit, or name it for S5.

**M2 · MINOR · `docs/setup.md:798, 1053, 1054`: line citations into `safety.ts` are off by one.**
- The new header comment in `safety.ts` adds one line, which moves the constants down.
- Evidence: `grep -n` gives `FILE_PAGE_MESSAGE` at `safety.ts:218` (HEAD: 217), `FILE_URL_MESSAGE` at 220 (HEAD: 219)
  and `UPLOAD_REFUSED_MESSAGE` at 225. setup.md still cites `:217`, `:219` and `:224`. `doc-check.mjs` does not check
  line numbers, so it exits 0.
- **Fix:** re-point them to `:218`, `:220` and `:225`. They are quoted-text citations in setup.md, so they are in lane.

**N1 · NIT · `extension/test/s3-options-upload.test.ts:62`: a stale describe title.**
- The title still reads "the broad-folder warnings (#250): warned, never refused", while the test inside it now says
  "refused as invalid lines". The dated note at `:63-65` explains the change, but the title contradicts it.
- **Fix:** retitle the describe, for example "home lines refused (#288 3b); the `.ssh` warning".

**N2 · NIT · builder report §2: a per-file count is wrong.**
- The report says "7 tests" for `s0f-home-folders.test.ts`; the file has 8. The +14 total and 3825 are right. No change
  to code is needed.

**N3 · NIT · `docs/setup.md:1011-1013`: the list of refused parents is incomplete.**
- It names `Users`, `Documents and Settings`/`DOCUME~1`, `/home`, `/Users`, `/var/home` and "`/root` (with aliases such
  as `/var/root` on macOS)".
- It leaves out `/System/Volumes/Data/Users` and its children, and `/private/var/root`. These are refused (spec §10's
  note lists them), and "aliases such as" loosely covers them.
- **Fix (optional):** name both, or say "and their macOS aliases".

**O1 · Observation, for the session agent at closeout (not the builder's lane): three docs are stale.**
- `extension/CLAUDE.md:250` says "`listTabs` rows of a `file:` tab stay listed (#245 (a), #259; …)". That is now false.
- `mcp/CLAUDE.md:11` says "no background-tab sentence yet".
- `docs/e2e-test-plan.md:1487` (K-opt-home) is Run 16's record and stays as written. Run 17's F-HOME row should
  expect `UPLOAD_HOME_REASON`.
- The builder found the first two as well.

**O2 · Observation, environment: the Run 16 runner test fails on a fresh worktree.**
- `recipes/test/s11-r16-runner.test.ts` fails 9 of its tests on a fresh `git worktree` checkout, where `.ps1` files
  get CRLF, and passes in the main tree.
- Any future verifier that measures "before" in a worktree will see `9 failed`. Treat it as the checkout's line
  endings, not a regression. It may be worth a `recipes/CLAUDE.md` gotcha (measured 2026-10-26 by this verifier).

## 4. Rulings on the builder's deviations

1. **The `recipes/test/s11-rules.test.ts` edit: accepted.**
   - It was needed: the test imported `UPLOAD_HOME_WARNING`, which no longer exists, and pinned `K-opt-stand` to the
     standing text that #288 3b requires to change. Without the edit the suite and `recipes/tsconfig*` would be red.
   - It keeps Run 16's record: `recipes/s11-rules.ts`, which holds the K texts, is unchanged, and the new test checks
     `K-opt-home` against the literal old warning byte for byte. I compared it with HEAD's `UPLOAD_HOME_WARNING` in
     `git diff`.
   - It discriminates: if `K-opt-stand` did not contain Run 16's sentence, `.replace` would do nothing and the equality
     would fail.
   - The phase doc's lane covers "their tests", and this test checks `options-model.ts` texts.
   - Keeping a dead export would have been worse.
2. **The `safety.ts` edit: in lane.** The phase doc's S0F lane names `extension/src/{…,safety,…}.ts`, and
   `hiddenReason` is the one place the rows and the events are redacted.
3. **"The #214 baseline pins input schemas only": confirmed.** `mcp/test/tool-schemas.ts:27`,
   `captureToolSchemas(): Promise<Array<{ name: string; inputSchema: unknown }>>`. The description is pinned by the new
   test instead.
   - The setup.md quote at `:757` is byte-identical to `registry.ts:613`, which `git diff` shows as the same one-phrase
     change.
   - The citation `registry.ts:613` is still right.

## 5. Spec note and proposed decisions

**The spec §10 note is sound.**
- It is dated in the house form (*Amended 2026-10-26 (…)*), and an inline *Superseded 2026-10-26* marker sits on the
  Step 11 line.
- It agrees with the code: `tabCreated` gets `url: ""`; `tabRemoved` drops `lastUrl`/`lastTitle` and gets `hidden`; the
  row drops `title`/`url`; the reason is reused, not a new `HiddenReason`. The list of parents matches `isHomeFolder`.
- It changes no other contract: it adds no method, code, event or field, and `shared/`, `daemon/` and `sdk/` are
  untouched.
- Per the S0F checklist ("before the code commit"), the committer should commit the spec file first, as its own
  commit.

**The proposed decisions: both accepted as proposed.**
- *The home predicate's edges.* Refusing `/var/home` and `/System/Volumes/Data/Users` themselves, any `DOCUME~<digits>`,
  and keeping `/var/root/<x>` allowed are the stricter reading of stage0-audit §5 and #296. They are consistent with
  `/root/uploads` staying allowed. `C:\DOCUME~X` and `C:\DOCUME~1x` stay allowed (tested). I found no bypass:
  - a trailing dot or space is refused by the parser as `DOTSPACE`;
  - `.` and `..` segments as `DOTSEG`;
  - `\\?\` and UNC paths as invalid;
  - case is folded.
- *The `listTabs` decision redacts a `file:` target too.* This is harmless, since nothing in `src` reads
  `.redact`, and it keeps the two rules as one.

## 6. Handoff

No processes left running, and the scratch worktree is removed and pruned. Before the commit: M1 (the step agent
grants the line) and M2, through a fixer, or else both are recorded for S5. The commit order is the spec §10 note, then
the code. S0F-b has not been touched.
