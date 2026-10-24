# S6 — pre-run builder report (recipes, wave sheet, expected text)

2026-10-23 · base 6a97635 · builder (Opus 5.5), level 2 · offline only: no Chrome, no daemon, no port
9234, no Blackboard, no `npm run build`, no commit.

## Files

Created:
- `recipes/sdk-login.ts` — SDK-1 (connect → newTab `?s6=sdk1` → locate Sign in → click → waitFor text → status → close).
- `recipes/s6.ts` — subcommands `stale-check`, `sdk2`, `sdk3`, `sdk4`, `sdk5`, `sm0 [--hold]`, `peek <t5-marker>`, `daemon-shutdown`, `--help`.
- `recipes/s6-rules.ts` — pure pass rules (`staleVerdict`, `sdk1…5Verdict`, `sm0Verdict`, `describeEvent`).
- `recipes/blackboard/guard.ts` — course argument, origin guard (before connect and on the loaded page), flags, `declaredVersion`, stub marker.
- `recipes/blackboard/readonly.ts` — the read-only allowlist (`bb.all` on `/gradebook/columns` and `/gradebook/columns/{col}/users`), `PAGE_EXPORT_SRC`, start/status/chunk/drop expressions.
- `recipes/blackboard/export-file.ts` — file names, `isInside`, chunk ranges, `assemble`, `verifyTransfer`, sha256.
- `recipes/blackboard/transcript.ts` — SDK-7's MCP leg read back from a transcript.
- `recipes/blackboard/session.ts` — shared prepare / open course / boot bb (non-pure).
- `recipes/blackboard/boot-bb.ts` (SDK-6), `recipes/blackboard/export-grades.ts` (SDK-7, `--mcp-plan`), `recipes/blackboard/assemble-mcp.ts` (SDK-7 MCP leg).
- `recipes/blackboard/stub-bb.js` — fake bb.js (`BRIDGE-STUB-BB`, invented data, writes throw).
- `recipes/README.md`, `recipes/tsconfig.s6.json`.
- `recipes/test/blackboard-guard.test.ts`, `blackboard-readonly.test.ts`, `blackboard-export-file.test.ts`, `s6-rules.test.ts` (79 tests).
- `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md`, this report.

Changed:
- `package.json` — `"recipe": "tsx"` (tsx ^4.23.15 was already a root devDependency).
- `.gitignore` — `exports/`.
- `docs/e2e-test-plan.md` — new §4.19 (S6-STALE, SDK-1…8, SDK-6D/7D dry runs inside SDK-6/7, SM-0, SM-1, the "also run" list, MUX-2's dated correction); §5 template line for the new ids; "Run 12 (S6)" placeholder after Run 11.

Not touched: `recipes/hello.ts`, every existing recipe, `recipes/tsconfig.json`, `tsconfig.fe.json`, anything outside the lane.

## Tests (TDD)

Tests written first; the red run: `npx vitest run recipes/` → `Test Files 4 failed (4)` (modules missing).
Then green. Test placement: the root `vitest.config.ts` includes `**/test/**/*.test.ts`, so
`recipes/test/` is part of `npm test` with no config change.

- Baseline at HEAD 6a97635 (recipes excluded = what HEAD had): `npx vitest run --exclude "recipes/**"` → **1534 passed, 79 files** (matches the S5 as-built).
- After: `npm test` → **1613 passed, 83 files** (+79 tests, +4 files, all in `recipes/test/`).

## Checks (commands and output)

- `npm run typecheck` → exit 0.
- `npx tsc --noEmit -p recipes/tsconfig.s6.json` → exit 0; `-p recipes` → 0; `-p recipes/tsconfig.fe.json` → 0.
- `npx vitest run recipes/` → `Tests 79 passed (79)`.
- `npm run recipe -- recipes/s6.ts --help` → the help text, exit 0 (connects to nothing). `… s6.ts bogus` → `FAILED — SET-UP: unknown command "bogus"`, exit 2.
- Blackboard refusals (all before any connect):
  - `boot-bb.ts` (no course) → `boot-bb: REFUSED — no course given — pass the course id (e.g. _12345_1) or its https://ada.blackboard.com/ultra/courses/<id>/… URL; the recipe never picks a course or a tab itself`, exit 2; `export-grades.ts` the same, exit 2.
  - `boot-bb.ts http://localhost:8080/ultra/courses/_1_1/outline` → `REFUSED — the course URL is not on https://ada.blackboard.com`, exit 2; `export-grades.ts https://evil.example.com/…` the same.
  - `boot-bb.ts _1_1 --dry-run --fixture-origin https://ada.blackboard.com` → `REFUSED — a dry run uses only http://localhost:<port> or http://127.0.0.1:<port>`.
  - `boot-bb.ts _1_1 --bbjs recipes/blackboard/stub-bb.js` (real mode) → `REFUSED — a real run refuses the stub bb.js (BRIDGE-STUB-BB) — pass the skill's bb.js`.
  - `assemble-mcp.ts` (no args) → usage, exit 2.
- `export-grades.ts _12345_1 --mcp-plan` → prints START/STATUS/CHUNK, exit 0, no connect.
- The tsx-shipped START expression run in node:vm against `stub-bb.js`: `{"state":"running","key":"mcp-_12345_1"}` then `done 2 columns 4 grades 631 bytes e6ec7fa4…b431`; for `_1_1` (the SDK-7D expectation): `done 2 4 626 627 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c`.
- `git status --short` → only lane paths; no `exports/` directory exists.

## Found while building (fixed inside the lane)

1. **`String(fn)` is not self-contained under tsx.** The first `readonly.ts` shipped the page code as
   `String(bridgeGradesExport)`. vitest passed, but running the `--mcp-plan` output (built by tsx) in
   node:vm threw `ReferenceError: __name is not defined`: tsx compiles with esbuild's keepNames and wraps
   inner functions in a module-level `__name(…)`. The page code is now a literal JS source string
   (`PAGE_EXPORT_SRC`), pinned by a test (`not.toMatch(/__name|__async|__publicField/)`) and re-checked
   through tsx in vm (above). Candidate gotcha for S7: "a page script shipped as `String(fn)` must be built
   without keepNames — tsx adds `__name`; the extension's esbuild bundle does not" (the extension's
   `SERIALIZER_SRC` is unaffected: it is bundled by `extension/build.mjs`, not run under tsx).
2. **A throwing chunk expression would leak a Blackboard page into an MCP failure report.** `PAGE_ERROR` is
   in the MCP's attach set (S5): a throw on the Blackboard tab would attach its screenshot and snapshot to
   the actor's transcript and `~/.chrome-agent-bridge/failures/`. The status and chunk expressions now
   never throw (`null` / `{missing: true}`); tested. The SDK-side Blackboard recipes connect with
   `failureReports: false` for the same reason.
3. Every expression the recipes send is either `return (…)`-wrapped on purpose (the start expression; bb.js,
   which contains `return`, so the extension wraps it in an async function, `extension/src/evaluate/wrap.ts:12`)
   or carries no `return` (status, chunk, probes), so the completion value is never lost.

## Where expected text comes from (file:line)

- S6-STALE: `extension/src/router.ts:28` (`unknown method: <m>`, `UNKNOWN_METHOD`); `daemon/src/methods.ts:19` (`locate` forwarded, S2).
- SDK-1: `test-fixtures/e2e-playground.html:49` (`Sign in`), `:188-192` (`form submitted (email = …)`).
- SDK-2: `extension/src/content/locate.ts:103-111` (describe/label), `:269-272` (message + candidates), `:27` (MAX_CANDIDATES 5); `extension/src/content/nearest.ts:42-59`; the ranking computed offline with that `nearest()` over the fixture's 17 role-button names (`Sign in` 0.714, `Disabled action` 0.267, `Load message in 1.5s` 0.250, `Shadow button` 0.231, `Trusted-only button` 0.211); `Disabled action` is listed (PERC-9; `extension/src/content/snapshot.ts:13,74`). Report lines: `sdk/src/error.ts:286-291` (`namedLine`), `:310-320` (`remapRefs`), `:349-444` (`renderReport`), `sdk/src/format/snapshot.ts:16-18`; screenshot name `error.ts:128-131`, dir `:121-125`.
- SDK-3: `locate.ts:249-258` (matches `{ref, name}`, message); `error.ts:366` (`Matches (n):`).
- SDK-4: fixture `:120-121`, `:251-254`; `sdk/src/tab.ts:93-97` (waitFor call timeout).
- SDK-5: fixture `:172-183` (mousedown reporter), `:31` (`#email`); `sdk/src/tab.ts` `#trusted` (focusTab first under `focusFirst`), `sdk/src/policy.ts` (#89); `evaluateRef` in `tab.ts`.
- SDK-8 / CUR: `mcp/src/tools/registry.ts:294-323` (status lines), `:337` (`Now using …`), `:531` (`Selected tab …`), `:566-568` (`Opened tab …`), `:390` (`Clicked …`), `describeLocator` `:161-167`.
- SM-0: `daemon/src/intercept.ts:180` (`extension session changed: <n> handles retired`), `:203` (`extension resync: <n> tabs, <g> gone`); `daemon/src/wsHost.ts:194-196,244,268` (`extensionStatus` broadcasts).
- SDK-6: `~/.claude/skills/blackboard-ultra/scripts/bb.js:15-16` (`bb already loaded`, `VERSION = '2026-10-18'`), `:545` (`return 'bb loaded'`), course from `BB_COURSE` `:50-52` (read only; the skill was not edited).
- SDK-7: `extension/src/evaluate/result.ts:39,93-97,147-149` (a string result's description is the raw string, capped at 20 000 characters; its `value` is not capped) → MCP chunk 16 000, SDK chunk 100 000; `mcp/src/tools/registry.ts:659-673` (browser_evaluate output).
- Regression rows: Run 7 record line 1606 (MUX-2); `T5-run-record.md:125-165` (ACT-1…3, TRUST-2, EVAL-1, DL-1, Run 8); e2e plan §5 Run 9 block (R9-SCREEN-1, R9-NET-1); fixture size `wc -c` = 13 106 at HEAD.

## Open questions

1. **Actors: `--resume` vs a persistent session.** The brief's `claude -p … --resume <id>` restarts the MCP per
   turn: the cursor and leases are lost between prompts (B5), which would void SDK-8, LEASE-1, MUX-2 and the
   CUR rows by instrument. The sheet uses Step 7's `recipes/t5-actor.ts` (the same `claude -p --model sonnet`
   with `--input-format stream-json`, one MCP across prompts). Needs the step agent's acceptance.
2. **MUX-2's expected text.** Its last run (Run 7) predates leases; its row was never re-dated for Step 7.
   Under Step 7's one-lease rule S2's untargeted snapshot of S1's tab is refused (`TAB_HELD`, text measured in
   Run 8 LEASE-1). I added a dated correction in §4.19 (not in the MUX-2 row itself) — a designed change from
   Step 7, not a loosening. The step agent may prefer the note in §4.12's row.
3. **SDK-7 leaves student data in actor transcripts.** The MCP leg's chunk outputs (the export's text) land in
   M's `out.jsonl` and `~/.claude/projects/…/<session>.jsonl`, outside the repo. Nothing is copied into the
   repo; deleting them is outside the repo (the user's call). Alternative: an MCP leg that returns only
   `{length, bytes, sha256}` (no transfer) — weaker than S6.3's "two files compared by hash".
4. **MUX-8** closes Chrome → treated as needing the restart grant ("not run"); a UI toggle of the extension
   would also change the user's profile state.
5. **SM-1 has no recipe yet.** Its text is copied as pre-registered (the session agent fixes it); the restart
   steps (`chrome://quit`, `bgf-launch.ps1`, `bgf-count.ps1`) need the grant first. `s6.ts sm0`'s event printer
   can be reused; writing `s6.ts sm1` before a grant is cheap if wanted.
6. **SDK-2's candidates 2–5** come from an offline ranking over names I listed from the fixture source; a
   different live tail is recorded as a `finding:` (STOP rules: continues anyway), only the first candidate
   decides.
7. **0.7 says "`bb.gradebook` calls"; bb.js has no `bb.gradebook` namespace.** Its gradebook reads are
   `bb.all(P2 + '/gradebook/columns…')` and `bb.gradeRecord` (GET). The export uses `bb.all` on the public v2
   gradebook paths only (mechanical discrepancy; the step agent may amend 0.7 with a dated note).

## Escalated

Nothing outside the lane was needed or changed. No denial.

## Proposed decisions

- **2026-10-23 · S6's actors are persistent `t5-actor.ts` sessions, not `--resume`d turns.** What: every
  multi-prompt actor in Run 12 is `recipes/t5-actor.ts start/send/end` (Sonnet). Why: a resumed `claude -p`
  turn is a new MCP client (cursor and leases gone), which voids SDK-8/LEASE-1/MUX-2/CUR by instrument
  (B5). Rejected: `claude -p … --resume <id>` per prompt.
- **2026-10-23 · The Blackboard recipes ship page code as a literal string and never throw on the page.**
  What: `PAGE_EXPORT_SRC` is source text; status/chunk expressions return `null`/`{missing: true}`; the
  SDK recipes connect with `failureReports: false`. Why: tsx's keepNames makes `String(fn)` depend on
  `__name` (measured); a page throw on Blackboard would attach its screenshot and snapshot to a failure
  report. Rejected: `String(fn)` (works in vitest only); leaving reports on.
- **2026-10-23 · SDK-7's byte-compare transports the export over both paths in chunks.** What: the SDK leg
  pulls the page-built canonical JSON in 100 000-character chunks; the MCP leg (an actor running the
  `--mcp-plan` expressions) in 16 000-character chunks, reassembled from the transcript by
  `assemble-mcp.ts`; both verified against the page's own length/bytes/sha256, then `Get-FileHash`.
  Why: S6.3 asks for two files from the two paths; one `browser_evaluate` output is capped at 20 000
  characters. Rejected: an MCP leg that returns only the hash (no second file); an actor writing the file
  with a Write tool (a model retyping data).
- **2026-10-23 · MUX-2 gets a dated correction for Step 7's leases before its S6 run.** What/why: open
  question 2. Rejected: running MUX-2 against Run 7's text (it cannot pass by design).
- **2026-10-23 · Grant-free dry runs SDK-6D/SDK-7D run in the wave.** What: the Blackboard recipes run on
  the localhost fixture with `stub-bb.js` before any live course, with pre-computed expected values
  (`stub-2026-10-23`; `92fe62ab…a49c`, 627 bytes). Why: proves the whole recipe flow through the real
  bridge without the user's data. Rejected: leaving the recipes unexercised until the user names a course.
