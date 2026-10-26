# Step 11b S0F-b — step report (a missing file is refused by the extension)

**Model / effort:** step agent Opus 5.5, medium. Children: builder Opus/medium, verifier Opus/medium, fixer
Opus/medium, verifier2 Opus/medium, committer Sonnet/medium. **Date:** 2026-10-26. Risk: standard.

## 1. Verdict

**DONE.** Verifier round 1 PASS-with-notes (2 MINOR, 3 NIT); one fix round (MINOR #1, MINOR #2, NIT 4); verifier
round 2 **PASS**. Committed (§2).

## 2. Outputs

- New pure module `extension/src/upload-exists.ts`: path → `file:` URL through the gate's own parser
  (`parseUploadPath`, now exported from `upload-paths.ts`), percent-encoded segments; probe outcomes `file` (200 + a
  readable first chunk, then `cancel()`) / `missing` (a `TypeError` rejection) / `folder` (status 0) / `unknown`
  (everything else, including the deadline). Only `file` proceeds (fails closed). One 5 s deadline for the whole
  check (`UPLOAD_CHECK_TIMEOUT_MS`), fetch injected, no `chrome.*`, no log site.
- `extension/src/handlers/upload.ts`: `checkUploadFilesExist` runs after the file-access refusal and before the first
  `call.effect()`, inject, mark and attach. Refusal: `BAD_PARAMS`, no `data`, text `upload: paths[<i>] …; nothing was
  uploaded` — never the path.
- Tests: new `extension/test/s0f-upload-exists.test.ts`; one new and one changed test in `s3-upload-handler.test.ts`;
  one new test in `log-sentinel.test.ts` (F.1's no-path check).
- Spec §10 dated note (S0F-b) in `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, committed before the code.
- `docs/e2e-test-plan.md` §4.24 (new): placeholder rows F-RAW, F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK for Run 17.
- Counts (from the verifiers' runs): HEAD 3825 passed / 156 files → **3845 / 157**, none removed. Typecheck (and the
  six recipes typechecks, round 1), build exit 0. Size ~376 code+test lines after the build plus the fixer's 3 tests,
  over the ~300 cap (verifier: not gold-plated; mostly tests and the deadline).
- Commits: two, the spec note first, then the code with this report (`git log` holds the hashes; the step agent's
  return names them).

Leaf reports: `S0F-b-builder.md`, `S0F-b-verifier.md`, `S0F-b-fixer.md`, `S0F-b-verifier2.md`.
READ list given to the children: phase doc 0.11, the Stages note, S0F, Exit checks, STOP rules; decisions #296;
`Stage0.md` §4, `Stage0-measurer.md` 3c and `stage0-dnr-3c.txt`; `S0F-a.md`; `handlers/upload.ts`, `upload-paths.ts`,
`upload-files.ts`, `safety.ts`, `safety-call.ts`, `sdk/src/upload.ts`; `extension/CLAUDE.md` § Uploads; e2e §4.23 UP-RAW.

## 3. Verifier verdict

Round 1 (`S0F-b-verifier.md`), PASS-with-notes: F.1's missing-file part met; 20 mutants, 18 red.
- MINOR 1: two fail-open mutants survived (body with no `getReader`; a throw inside response handling) — fixed: rows
  added, both mutants red.
- MINOR 2: 5 s per path could outlast the daemon's 35 s wait and attach after the client's `TIMEOUT` — fixed: one 5 s
  deadline for the whole check (5 s + the 15 s CDP bound < the daemon's 30 s default, from `daemon/src/route.ts`,
  `upload-files.ts`).
- NIT 3: size over cap — accepted (this report §4).
- NIT 4: no test of a read hanging after a 200 — fixed.
- NIT 5: a POSIX-style path on Windows Chrome is probed as `file:///srv/…`, unmeasured; fails closed. Left for Run 17's
  sheet.
Round 2 (`S0F-b-verifier2.md`): **PASS**, no regression; seven further mutants red.

## 4. Deviations

- Size ~25% over the brief's ~300-line cap (well under #271's 600); accepted rather than split, as the work was
  complete and the excess is tests.
- The 5 s deadline was not in the brief or phase doc (design-local; proposed decision below).

## 5. Proposed decisions

From the leaf reports (full text there):
- `S0F-b-builder.md` · 2026-10-26 · The missing-file probe's outcomes and texts (a `TypeError` = "does not exist (or
  Chrome cannot read it)", status 0 = folder, everything else refused as "could not be checked"). By: Claude (proposed).
- `S0F-b-fixer.md` · 2026-10-26 · The existence check has one 5 s deadline in total, not 5 s per path. By: Claude
  (proposed).

## 6. Findings

- **Stale lines (session agent's):** `extension/CLAUDE.md` § Uploads, the UP-RAW sentence ("a raw `uploadFiles` of an
  absent file … answers `ok`"), and its Key files list (add `upload-exists.ts`); `sdk/CLAUDE.md:111–112` (the preflight
  is "the only check that a file exists"); `docs/setup.md:812–814` (a raw upload of a missing file answered ok). They
  stay true for the loaded extension until a reload; Run 17's F-RAW measures the change.
- `Stage0-measurer.md:58–60` reads "missing file or folder → rejects; a folder → status 0" (self-contradictory);
  `stage0-dnr-3c.txt` shows the folder at status 0, which the code follows.
- `missing` cannot tell a missing file from an unreadable one (a `file:` fetch rejects alike); the message says so.
- A client whose own call timeout is under ~20 s can still be outlasted by check + CDP leg; that predates this stage
  and holds for every handler.

## 7. Handoff

Nothing running; no live run, no extension reload (the loaded build is S0F-a's at most; Run 17 needs a reload).
`journal.md` was modified before this stage and is not in its commits. Next: the session agent's as-built and the stale
lines above; then S1.
