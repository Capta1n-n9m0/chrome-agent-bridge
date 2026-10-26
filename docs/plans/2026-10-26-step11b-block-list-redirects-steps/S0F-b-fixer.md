# Step 11b S0F-b — fixer report (verifier MINOR #1, MINOR #2, the hanging-read NIT)

**Model / effort:** Opus 5.5, medium. **Role:** fixer (`docs/agent-rules.md` §6). **Date:** 2026-10-26. No commit.
Fixed the findings of `S0F-b-verifier.md` §4 on the builder's uncommitted tree; nothing else touched.

## 1. Changes

- `extension/test/s0f-upload-exists.test.ts`
  - MINOR #1: two rows in the "fails closed" table: `{status:200, body:{}}` (no `getReader`) and a `getReader` that
    throws, both `unknown`.
  - NIT (Finding 4): `probeUploadFile` — a 200 whose first `read()` never resolves → `unknown` at the deadline, signal
    aborted.
  - MINOR #2: `checkUploadFilesExist` — three paths, each a 200 after 3/5 of the budget: refused `unknown` at index 1,
    the third never fetched, the second fetch aborted. Plus: a hanging read in the check → index 0 refused.
  - `UPLOAD_PROBE_TIMEOUT_MS` renamed `UPLOAD_CHECK_TIMEOUT_MS` (same 5 s).
- `extension/src/upload-exists.ts`: one deadline for the whole check. A private `deadline(ms)` holds one
  `AbortController` and one timer; `checkUploadFilesExist` creates it once and races each probe against it, so once the
  deadline fires, the entry in flight refuses `unknown` (`BAD_PARAMS`, the existing fixed text) and the handler never
  reaches `effect`/inject/attach. `probeUploadFile` keeps its signature (one probe, its own deadline). The numbers
  in the constant's comment come from source: `daemon/src/route.ts` `DEFAULT_TIMEOUT_MS = 30_000` and
  `DAEMON_SLACK_MS = 5_000` (`daemonWaitMs`), and `extension/src/upload-files.ts` `UPLOAD_CDP_TIMEOUT_MS = 15_000`. So
  5 s + 15 s stays under the 30 s default. Before this fix, the worst case was 20 × 5 s = 100 s. No message changed, no
  log site added.
- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10 note: "5 s without an answer" → "an entry still
  unanswered when the whole check's one 5 s deadline passes". §4.24 of `docs/e2e-test-plan.md` gives no bound, so it
  is unchanged.
- `extension/src/handlers/upload.ts`: not changed (its call uses the default deadline).

## 2. Each new test seen red

- Deadline test: red against the unfixed code. `npx vitest run extension/test/s0f-upload-exists.test.ts` gave
  `1 failed | 17 passed`, `expected undefined to deeply equal { code: 'BAD_PARAMS', … }`, so the check resolved and the
  upload would have gone ahead.
- The two new rows and the two hanging-read tests passed on the unfixed code, because they cover branches the code
  already handled. They were seen red by mutants applied to `upload-exists.ts`, with the bytes restored after each
  (md5 `30e7496d…` before and after):
  - M9 (`typeof body.getReader !== "function"` → `"file"`): `2 failed | 16 passed`.
  - M8 (`settle`'s `.catch` → `"file"`): `2 failed | 16 passed`.
  - No race (`settle` awaited alone): `4 failed | 14 passed`. All four timeout and hanging-read tests failed.
- After the fix, a mutant with a per-path deadline again (the check calling `probeUploadFile(url, fetchFn,
  timeoutMs)`) gave `1 failed | 17 passed`: the deadline test. `cmp` showed the file restored.

## 3. Gates

- `npm run typecheck` → exit 0.
- `npx vitest run` → `Test Files 157 passed (157)`, `Tests 3845 passed (3845)`. Before: 3842 / 157 (the verifier's
  count; not re-run before the edit). Delta: +3 tests. The two rows sit inside an existing test.
- `npm run build` → exit 0.
- `git status --short`: the stage's files plus this report; `journal.md` untouched by me.

## 4. Proposed decisions

### 2026-10-26 · The existence check has one 5 s deadline in total, not 5 s per path
**Decided:** `checkUploadFilesExist` runs every probe under one 5 s deadline. Once it passes, the entry being probed
refuses `BAD_PARAMS` "could not be checked as an existing file", the remaining fetch is aborted, and nothing reaches
the page. **Why:** with 5 s per path, 20 slow but successful probes (100 s) outlast the daemon's 35 s default wait. The
client then gets `TIMEOUT` while the files are still attached. 5 s + the CDP leg's 15 s fits under 30 s. **Instead
of:** a per-path bound, or a known limit recorded in the docs. **Revisit if:** a live run sees a legitimate set of
files on a slow drive refused. **By:** Claude (proposed)

## 5. Not fixed (outside the brief)

Findings 3 and 5 and the stale lines in verifier §5 belong to the session agent. A call whose own `timeoutMs` is
under about 5 s can still outlast its client. That predates this stage: every handler has it.
