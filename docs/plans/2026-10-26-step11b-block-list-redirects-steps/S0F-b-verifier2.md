# Step 11b S0F-b — verifier report, round 2 (affected items only)

**Model / effort:** Opus 5.5, medium. **Role:** verifier (`docs/agent-rules.md` §6), round 2. **Date:** 2026-10-26.
Read and run only; no tracked file edited; no commit. Audited the fixer's changes (`S0F-b-fixer.md`) on the uncommitted
tree against HEAD `1d19289`: round 1's MINOR #1, MINOR #2 and Finding 4 (NIT), plus regressions.

## 1. Verdict

**PASS.** Both MINOR findings and the NIT are fixed, every relevant mutant is red, the gates exit 0, and no regression
was found. Round 1's Findings 3 and 5 and its stale lines (§5) were outside the fixer's brief and still stand as
round 1 wrote them.

## 2. Outputs

- `npm run typecheck` → exit 0 (all five projects).
- `npx vitest run` → `Test Files 157 passed (157)`, `Tests 3845 passed (3845)`. Round 1: 3842 / 157; HEAD: 3825 / 156.
  Delta from round 1 is +3 tests (a hanging read in `probeUploadFile`, the whole-check deadline, a hanging read in the
  check). The two new table rows sit inside an existing test. This matches the fixer's count.
- `npm run build` → exit 0 (`built extension → dist/`). `git status --short` shows the stage's files only.
  `journal.md` is not this stage's.
- Mutants: the script is scratchpad `mutants2.mjs` and its output is `mutants2-out.txt`. Each mutant was applied to
  `extension/src/upload-exists.ts`, then `s0f-upload-exists.test.ts` and `s3-upload-handler.test.ts` ran (43 tests),
  then the original bytes were written back. The file's md5 was `2f58e3c7…` before and after, and the md5 of
  `git diff HEAD` was `83a40024…` before and after (`restored`).

| Mutant | Result |
|---|---|
| M8: `settle`'s `.catch` → `"file"` (e.g. `getReader` throws) | KILLED, 1 failed / 42 |
| M9: a body with no `getReader` → `"file"` | KILLED, 1 failed / 42 |
| P2: no race (`settle` alone, no deadline) | KILLED, 4 failed / 39 |
| P3: an expired deadline resolves `"file"` | KILLED, 4 failed / 39 |
| P4: no `ctl.abort()` at the deadline | KILLED, 3 failed / 40 |
| P5: first read not awaited (a hanging read counts as a file) | KILLED, 3 failed / 40 |
| P6: a fresh deadline per entry in the check (= the pre-fix per-path bound) | KILLED, 1 failed / 42 (the whole-check deadline test) |
| P7: the check refuses only `missing`/`folder` (an expired deadline proceeds) | KILLED, 3 failed / 40 |

P1 (replace the first `await probeUnder(url, fetchFn, d);`) hit `probeUploadFile`'s own line and made it recurse into
itself. It proves nothing and is left out of the table. P6 is the correct per-path mutant.

## 3. Items

1. **MINOR #1 (fail-open mutants), fixed.** `extension/test/s0f-upload-exists.test.ts:102–103` adds
   `{status:200, body:{}}` and a `getReader` that throws, both expected `unknown`. M8 and M9 now go red. In the source,
   `upload-exists.ts:76` (no `getReader` → `unknown`) and `:106` (`.catch → "unknown"`) are unchanged and correct.
2. **MINOR #2 (one overall deadline), fixed.** `checkUploadFilesExist` (`upload-exists.ts:135–146`) creates one
   `deadline(timeoutMs)` (`:92–102`) and races every probe against the same `late` (`:105–107`). Once the deadline
   fires, the entry in flight resolves `unknown` and throws `uploadProbeRefusal(i, "unknown")`, so nothing proceeds. If
   it fires between entries, the next race also yields `unknown`: `late` has already resolved and the signal is
   aborted. Test `:190–205`: three 200s, each taking 3/5 of the budget, refuse at index 1. The third path is never
   fetched and the second fetch's signal is aborted. P6 is red on this test.
   **Justification from source.** `daemon/src/route.ts:10,15–17`: `DEFAULT_TIMEOUT_MS = 30_000`, and `daemonWaitMs`
   adds `DAEMON_SLACK_MS` (5 s), so the daemon waits 35 s by default. `extension/src/upload-files.ts:55`:
   `UPLOAD_CDP_TIMEOUT_MS = 15_000`, applied at `debugger.ts:281`. That leaves 5 s + 15 s = 20 s bounded, which is
   under 30 s. The handler's other legs between the two are one-shot and normally fast, though not bounded: `tabs.get`,
   `ensureContent`, the `locate` in `resolveTargetCapped` (`handlers/target.ts:35–43`, with no wait), the mark and the
   attach. The worst case before the fix was 20 × 5 s = 100 s. A client that passes its own `timeoutMs` under about
   20 s can still outlast its call. Every handler has that limit and it predates this stage, as the fixer notes in §5.
   This is not a finding.
3. **NIT (a read hanging after a 200), fixed.** Two tests cover it: `:120–131` (`probeUploadFile`: `unknown` at the
   deadline, signal aborted) and `:207–213` (the check: index 0 refused). P5 is red. The claim that Chrome's abort
   releases the pending read is still Chrome's behaviour and is not tested. It does not matter for correctness:
   `late` wins the race either way, and the loser's rejection lands in the `.catch` at `:106`, so it cannot become an
   unhandled rejection.
4. **Timer and abort hygiene.** `d.clear()` runs in `finally` on every exit: a resolve, a refusal throw, and the
   single-probe path (`:114–116`, `:143–145`). Once a check succeeds the timer is cleared, so `ctl.abort()` never fires
   and nothing is aborted after success. Every earlier entry's body has already had `reader.cancel()` (`:84`). After
   `clear`, `late` stays pending with no timer behind it and is collected with the closure, so there is no leak. P4
   shows the abort is what the tests rely on.
5. **No regression.**
   - No log call in `upload-exists.ts` (grep for `console`/`log(` is empty).
   - `log-scan` and `log-sentinel` are green with the allowlist unchanged.
   - No message changed. The deadline uses the existing `unknown` text, which names `paths[i]` only.
   - `handlers/upload.ts:104` is unchanged by the fixer. It still runs after `fileAccessRefusal` (`:100–101`) and
     before the first `call?.effect()` (`:105`), `ensureContent`, the mark and `uploadByMark`.
   - The handler tests are green in the full run.
6. **Spec §10 sentence, accurate.** It now reads "an entry still unanswered when the whole check's one 5 s deadline
   passes", which matches `:135–146`. The rest of the note is unchanged from round 1, which audited it.
   `docs/e2e-test-plan.md` §4.24 names no bound, so it needs no edit.

## 4. Findings

None new.

Note (not a finding): the fixer's md5 (`30e7496d…`) is the pre-fix file used for its pre-fix mutants. The current file
is `2f58e3c7…`. These are consistent.

## 5. Handoff

The fixer's proposed decision ("one 5 s deadline in total") is accurate as written. No process was left running: the
vitest runs ended, and no Chrome, daemon or server was started. `upload-exists.ts` is byte-identical after the mutant
runs.
