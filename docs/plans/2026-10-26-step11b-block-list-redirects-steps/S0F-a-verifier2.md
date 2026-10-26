# S0F-a — verifier report, fix round 1 re-check

Model / effort: Opus, medium. Role: verifier (agent-rules §6), affected items only. Read and run only. Nothing
committed and no tracked file edited; the only file written is this report.

## 1. Verdict

**PASS-with-notes** for the whole stage. M1, M2, N1 and N3 of `S0F-a-verifier.md` are resolved, and the fixer's edits
stay inside those four items. No new finding above NIT. N2, O1 and O2 carry forward as notes (§4).

## 2. Outputs: checks re-run (main tree, uncommitted S0F-a build + fix round 1)

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | `Test Files 156 passed (156)`, `Tests 3825 passed (3825)`: equal to the first verifier's after-count; no test added or removed by the fix |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Docs | `node scripts/doc-check.mjs` | exit 0; `tools: 24 · router methods: 27 · codes: 27`. It lists `CLAUDE.md:112 3811 passed` as a stated count (see §4 O3) |
| Clean after build | `git status --short` | the same 11 modified files as after the build, and 5 untracked: the two new tests and the builder, verifier and fixer reports. No `dist/` file shows |
| Diff size | `git diff HEAD --stat` | 11 files, 142 insertions, 48 deletions |

## 3. The four findings

**M1 · resolved.** `git diff HEAD -- docs/setup.md` shows the old sentence ("still lists a `file:` tab with its URL
(the refusal covers calls, not the listing)") replaced by: "Since Step 11b, `browser_list_tabs` lists a `file:` tab as
it lists a tab on a blocked site, `(hidden: blocked site)`, without its URL or title, and tab events drop them too
(design spec §10, the 2026-10-26 note)." The `browser_download` clause after it is unchanged. Checked against:
- `extension/src/safety.ts:423-431`, `hiddenReason`: returns `"blocked"` when `firstBlocked(urls, ctx) ||
  urls.some(isFileUrl)`; `redactListTabsRow` drops `title`/`url` on any reason.
- `mcp/src/tools/registry.ts:148-151`, `hiddenLabel`: `"blocked"` prints `(hidden: blocked site)`, the text quoted.
- Spec §10, the *Amended 2026-10-26* note (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:718-725`): the row
  drops `title` and `url` with `hidden: "blocked"`; `tabCreated` carries `url: ""`; `tabRemoved` drops `lastUrl` and
  `lastTitle`. "Tab events drop them too" is a fair plain-language summary (`tabCreated` has no title field).

**M2 · resolved.** `grep -n` on `extension/src/safety.ts`: `FILE_PAGE_MESSAGE` 218, `FILE_URL_MESSAGE` 220,
`UPLOAD_REFUSED_MESSAGE` 225. setup.md now cites `:218` (line 1054), `:220` (line 1055) and `:225` (line 798), and the
quoted texts match the source byte for byte. I also checked the builder's options-model citations in the same hunks:
`:103-107` (the four reasons), `:113-114` (`UPLOAD_HOME_REASON`), `:115` (`UPLOAD_SSH_WARNING`), `:162-164` (the
summary) all point at the right lines.

**N1 · resolved.** `extension/test/s3-options-upload.test.ts:62` now reads "analyzeUploadFolders — home lines refused
(#288 3b); the .ssh warning (#250)". The diff against the first verifier's description touches only that title; the
test bodies and the dated notes are the builder's, as already verified.

**N3 · resolved.** setup.md's list now names any drive's `Users` / `Documents and Settings` (or "a short name such as
`DOCUME~1`") and one folder below; `/home`, `/Users`, `/var/home`, `/System/Volumes/Data/Users` and one folder below
each; `/root`, `/var/root`, `/private/var/root`; any letter case. This matches `extension/src/upload-paths.ts:169-176`
(`POSIX_HOME_PARENTS`, `POSIX_ROOT_HOMES`), `:178` (`WIN_HOME_PARENT_RE`, any `docume~<digits>`), the length rule in
`isHomeFolder` (equal or one segment below a parent; root homes exactly), and the spec note's list. The fixer's cited
line numbers for these constants are correct. "A folder inside your home, such as `C:\Users\you\Uploads`, is allowed"
agrees with the code (three segments).

**Nothing else changed.** The setup.md hunks outside these four items (the `registry.ts:613` quote, the standing
warning, the home paragraph's framing, the `.ssh` warning) are the builder's, as the first verifier described them; the
fixer report's file list (setup.md and the s3 test) matches the `git status` set, which is unchanged from the build.

## 4. Notes carried forward and new

- **N2 · NIT (carried):** the builder report says 7 tests in `s0f-home-folders.test.ts`; the file has 8. Total right.
- **O1 · Observation (carried, session agent at closeout):** `extension/CLAUDE.md:250` ("`listTabs` rows of a `file:`
  tab stay listed") is now false; `mcp/CLAUDE.md:11` ("no background-tab sentence yet") is stale;
  `docs/e2e-test-plan.md:1487` stays as Run 16's record, and Run 17's F-HOME row should expect `UPLOAD_HOME_REASON`.
- **O2 · Observation (carried, environment):** `recipes/test/s11-r16-runner.test.ts` fails 9 tests on a fresh worktree
  checkout (CRLF `.ps1`), passes in the main tree. Not a regression; possibly a `recipes/CLAUDE.md` gotcha.
- **O3 · Observation (new, session agent at closeout):** the root `CLAUDE.md:112` states `3811 passed, 154 files`;
  the tree now measures 3825 across 156. It goes with the closeout's Current state update, not this stage's lane.

## 5. Handoff

No processes left running; no worktree made. Commit order unchanged: the spec §10 note first, then the code, docs and
tests. S0F-b untouched.
