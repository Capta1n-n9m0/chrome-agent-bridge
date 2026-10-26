# S0F-a — fixer report

Model / effort: Opus, medium. Role: fixer (agent-rules §6). Nothing committed.

## 1. Verdict

**DONE.** M1, M2, N1 and N3 fixed; none disputed.

## 2. Outputs

Files edited: `docs/setup.md` (the M1 sentence, the M2 citations, the N3 list) and
`extension/test/s3-options-upload.test.ts` (the N1 describe title only).

- **M1** (`docs/setup.md`, § The bridge never opens local files): "`browser_list_tabs` still lists a `file:` tab with its
  URL (the refusal covers calls, not the listing)" now reads: since Step 11b, `browser_list_tabs` lists a `file:` tab as
  it lists a tab on a blocked site, `(hidden: blocked site)`, without its URL or title, and tab events drop them too
  (design spec §10, the 2026-10-26 note). The `browser_download` clause after it is unchanged. The display text is
  `mcp/src/tools/registry.ts:150`.
- **M2:** the citations moved from `safety.ts:224`, `:217` and `:219` to `:225`, `:218` and `:220`. Confirmed with
  `grep -n` on `extension/src/safety.ts`: `FILE_PAGE_MESSAGE` 218, `FILE_URL_MESSAGE` 220, `UPLOAD_REFUSED_MESSAGE` 225.
  The quoted texts match the source.
- **N3:** the list of refused parents now names `/System/Volumes/Data/Users`, and `/root`, `/var/root` and
  `/private/var/root`. That is the full list of spec §10's 2026-10-26 note and of `POSIX_HOME_PARENTS` /
  `POSIX_ROOT_HOMES` (`upload-paths.ts:169-176`). "Its short name `DOCUME~1`" became "a short name such as `DOCUME~1`",
  because `WIN_HOME_PARENT_RE` (`upload-paths.ts:178`) refuses any `DOCUME~<digits>`.
- **N1:** the describe title went from "the broad-folder warnings (#250): warned, never refused" to "home lines
  refused (#288 3b); the .ssh warning (#250)". No test body changed.

Checks, re-run after the edits:

| Check | Result |
|---|---|
| `npm test` | `Test Files 156 passed (156)`, `Tests 3825 passed (3825)`: unchanged from the verifier's after-count |
| `npm run typecheck` | exit 0 |
| `node scripts/doc-check.mjs` | exit 0 |

`docs/setup.md` stays LF, as at HEAD.

## 4. Deviations

None. The M1 sentence lies outside the builder's original lane; the step agent granted it in this brief.

## 5. Proposed decisions

None.

## 6. Findings

None new. The verifier's O1 (`extension/CLAUDE.md:250` and `mcp/CLAUDE.md:11` stale) and O2 (CRLF in a fresh worktree)
remain for the session agent; both are outside this lane.

## 7. Handoff

No processes left running. The tree holds the S0F-a build plus these edits, uncommitted. The commit order is still the
spec §10 note first, then the code.
