# Step 11b S0F-b — builder report (a missing file is refused by the extension)

**Model / effort:** Opus 5.5, medium. **Role:** builder (`docs/agent-rules.md` §6). **Date:** 2026-10-26. No commit.

## 1. Verdict

**DONE** — with one deviation: the size is about 376 new code + test lines (407 with docs), over the brief's ~300
cap (§4). Nothing remains to build.

## 2. Outputs

- **New `extension/src/upload-exists.ts`** (pure but for an injected fetch; no `chrome.*`, no log call):
  `uploadFileUrl(path)` (the path model's segments → `file:///C:/…` or `file:///…`, each segment
  `encodeURIComponent`-ed, the drive upper case; null for anything the model refuses — UNC, relative, `..`, a URL —
  or a lone surrogate), `probeUploadFile(url, fetch, timeoutMs = 5000)`, `uploadProbeRefusal(index, outcome)`,
  `checkUploadFilesExist(paths, fetch)`.
- **`extension/src/upload-paths.ts`**: exports `parseUploadPath` (the existing `shapeOf`, as segments or null). No
  matcher change.
- **`extension/src/handlers/upload.ts`**: `await checkUploadFilesExist(paths, (url, init) => fetch(url, init))` right
  after the file-access refusal and before the first `call.effect()` — so before inject, mark and attach. Header
  comment's order updated. `safety-call.ts` untouched.
- **Spec** `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10: "Amended 2026-10-26 (Step 11b S0F-b …)" note
  after S0F-a's (the refusal, its three texts, its order, the TOCTOU acceptance). For the committer: commit it first.
- **`docs/e2e-test-plan.md` §4.24** created after §4.23's end (before `## 5.`): a dated header and five placeholder
  rows F-RAW, F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK for S4-sheet to complete.
- **Commands (this tree):** before `npx vitest run` → 156 files, 3825 tests passed. After: `npx vitest run` →
  **157 files, 3842 passed** (+17, none removed); `npm run typecheck` exit 0; `npm run build` exit 0
  (`built extension → dist/`); the six `recipes/tsconfig*.json` typechecks exit 0. `git status --short` after the
  build: only my files plus `journal.md` (modified before I started, not mine).

### Outcome classification (decided; fails closed)

| Fetch result | Outcome | Answer |
|---|---|---|
| resolves, `status === 200`, first `read()` resolves (or `body` null: an empty file) | file | proceed |
| rejects with a `TypeError` (Chrome's `Failed to fetch`) | missing | `upload: paths[<i>] does not exist (or Chrome cannot read it); nothing was uploaded` |
| resolves, `status === 0` (Chrome's folder listing) | folder | `upload: paths[<i>] is a folder, not a file — pass a file; nothing was uploaded` |
| any other status; a non-`TypeError` rejection (incl. the timeout's `AbortError`); a failing first read; a non-response; a synchronous throw; 5 s with no answer; a path with no `file:` URL | unknown | `upload: paths[<i>] could not be checked as an existing file; nothing was uploaded` |

All `BAD_PARAMS`, no `data`, via `BridgeError`. "Missing" includes unreadable because a `file:` fetch reports both as
the same `TypeError` (Stage 0 saw only `Failed to fetch`); the text says so. Entries are probed in order; the first
non-file refuses and later entries are not probed (as the SDK preflight). The body is cancelled after the first chunk
and on non-200 answers. Wording models `sdk/src/upload.ts` (`upload: paths[i] …`).

### New and changed tests, and how each was seen red

- `extension/test/s0f-upload-exists.test.ts` (new, 15 tests). Written first, run against a skeleton module whose
  exports returned null / `"file"` / `"x"` / nothing: **12 failed, 3 passed** (the three that passed only assert null
  URLs for refused paths, `"file"` for a 200 with no body, and that messages hold no path — all true of the
  skeleton). Then the module was implemented: 15 passed. One fix before green: the "sync throw" case was classified
  `missing` (a sync `TypeError` caught as a rejection); the implementation now treats a synchronous throw as
  `unknown`, the test unchanged.
- `extension/test/s3-upload-handler.test.ts`: a `fetch` stub in `beforeEach` (logs `"probe"`, rejects with a
  `TypeError` for URLs in `missingUrls`); **changed** the success test's expected order (`"probe","probe"` after
  `"fileAccess"`); **new** test "S0F-b (#288 3c): a missing file → BAD_PARAMS naming its index …" (order
  `tabs.get, fileAccess, probe, probe`, no effect/page/mark/attach; file access off → no probe). Both **red** before
  the handler change (2 failed / 23 passed), green after.
- `extension/test/log-sentinel.test.ts`: **new** test "Step 11b S0F-b sentinel test" — the probe over the Step 11
  sentinel path on every outcome: refusals carry no sentinel needle, `file:` or `\`; 0 captured console lines, then
  one known line to prove the capture is live. Red only by import without the module (not separately mutant-proven).

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **Size over cap**: ~376 new code+test lines (`upload-exists.ts` 122, its test 182, handler +7, `upload-paths.ts` +6,
  sentinel +33, handler test +26) plus 31 doc lines, against ~300. The deliverable was complete when measured, so I
  report DONE rather than splitting a finished unit; the step agent may treat it as DONE-PARTIAL per the brief.
- `log-sentinel.test.ts` and `s3-upload-handler.test.ts` are outside the brief's literal lane list but are "their
  tests" (the handler's and the exit check F.1's named sentinel test).
- A 5 s per-path probe bound (`UPLOAD_PROBE_TIMEOUT_MS`) was added; Stage 0 did not ask for one. Reason: a `file:`
  fetch on a mapped or slow drive could otherwise hold the call to the daemon's timeout. Unmeasured live.

## 5. Proposed decisions

### 2026-10-26 · The missing-file probe's outcomes and texts
**Decided:** only status 200 with a readable first chunk is a file; a `TypeError` rejection is "does not exist (or
Chrome cannot read it)", status 0 is "a folder", everything else "could not be checked"; all `BAD_PARAMS` naming the
index; entries in order, first refusal wins; 5 s bound per path; the probe runs after the file-access refusal and
before the first `effect()`. **Why:** Stage 0's measurement (#296, `stage0-dnr-3c.txt`); fail closed on anything
unmeasured; a fetch cannot separate missing from unreadable. **Instead of:** a single text for all non-files (less
useful), or treating unknown statuses as files (fails open). **Revisit if:** Run 17's F-RAW rows show another
outcome for a missing file, or the 5 s bound fires on a real drive. **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed. Log-scan count unchanged (no log site added; `log-scan.test.ts` green).
- **Stale after this stage (session agent's files):** `extension/CLAUDE.md` § Uploads ("A raw `uploadFiles` of an
  absent file inside an allowed folder answers `ok` … UP-RAW") and Key files (add `upload-exists.ts`);
  `sdk/CLAUDE.md`'s `prepareUpload` bullet ("This preflight is also the only check that a file exists"). Both stay
  true for the loaded extension until Run 17 measures F-RAW.
- For S3b: the probe is a worker `fetch` of a `file:` URL (tab `-1`); Stage 0 saw no webRequest event for it, and a
  host-based DNR rule cannot match a hostless `file:` URL. Not measured with S3b's rules installed.

## 7. Handoff

No processes started; no live run, no reload. Files for the committer — spec note first:
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`; then `extension/src/upload-exists.ts`,
`extension/src/upload-paths.ts`, `extension/src/handlers/upload.ts`, `extension/test/s0f-upload-exists.test.ts`,
`extension/test/s3-upload-handler.test.ts`, `extension/test/log-sentinel.test.ts`, `docs/e2e-test-plan.md`, and this
report. `journal.md` is not mine.
