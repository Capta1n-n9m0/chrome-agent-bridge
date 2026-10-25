# S5-rules verifier report

Model: Claude Opus 5.5. UTC start 2026-10-25T20:40:23Z, end 2026-10-25T20:47Z (`date -u`, this host's clock).
Role: verifier (`docs/agent-rules.md` §6). Nothing in the main tree was edited; nothing committed.

## 1. Verdict
**FAIL** — one MAJOR (the new test breaks `recipes/tsconfig.s6.json`, the exact recorded gotcha). Everything else
passes: the byte equality (78/78), SW-2's table and its warm-up rule, the restore compare, the UP-LOGS counters, the
imported matcher, size, purity. The fix is one line outside the three files (suggested below); after it, a fresh
verifier needs to re-check only item M1.

## 2. How it was checked
A clean copy: `git archive` of HEAD into a scratch dir under my scratchpad, the three builder files copied in from the
main tree, its own `npm ci`. HEAD moved during the audit (S3c landed `214c821`, `42d1ce8`); I re-extracted `42d1ce8`
over the copy (the diff `d0744b2..42d1ce8` deletes no file) and re-ran everything there. The copy's five
`node_modules/@bridge/*` junctions point inside the copy; I removed them with `cmd /c rmdir` and confirmed 0 links left
before deleting the copy. The main tree's `node_modules/.bin` is intact.

## 3. Exit criteria

| # | Check | Result |
|---|---|---|
| 1 | Row → function map; byte equality on ≥ 10 rows, from the sheet itself | PASS. My own script (`scratchpad/vcheck/bytes.mts`) parsed §4.23 (lines 1445–1540 of `docs/e2e-test-plan.md`) and compared: every K-table row (message, code and `data` for all 17 error keys; the four `K-opt-*` strings; `K-mcp-up`), plus the row-level texts I transcribed: UP-L1 `FOUNDCHECK root=not outside=not`; UP-0 `STATE …` with the empty hash, `TOGGLE reading on/off`, the 17 waiting rows in the sheet's order and `NOT RUN — waits for G11-3`; UP-FA `not run — the toggle is on`; UP-OPT summaries (K-opt-sum, both plural forms) and the three item lines; UP-5 `K-mcp-ok`; SAVE-REFUSE-R (K-undef/node/map/cycle with codes and `data`, the `[chrome.debugger] ` prefix); SW-2's trial line, `measured 3/3 trials`, `d=[…] ms → the wait runs to its bound`, `the event ends the wait`; UP-LOGS `SCAN …`. Output: `78 equal, 0 different`. The builder's row → function map (report §2) is complete: every §4.23 row has a function or is driver-side by the sheet (UP-7's `wait-safety`, UP-CLICK). `K-mcp-ok` also matches `mcp/src/tools/registry.ts:634-635` (lines joined by `\n`). |
| 2 | SW-2's table on every branch, warm-up present | PASS. With a warm-up trial: runs to its bound (incl. 950 edge), event ends the wait (incl. 300 edge and negative d), undetermined (949, 301, mixed), a NOT MEASURED trial → undetermined, 2/3, verdict NOT MEASURED; warm-up values that would flip the outcome do not (`s11-rules.test.ts:330-338`). Absent warm-up → not a pass. Untested (NIT 3): a warm-up that is itself NOT MEASURED, and a trials array not of length 3. |
| 3 | Three mutants red, run by me | PASS (log `scratchpad/vcheck/mutants.log`). Red: `>= 950` → `> 950` (2 tests); `<= 300` → `<= 350` (1); warm-up entering the decided set (4); warm-up replacing trial 3 (3); restore hash compare dropped (1); restore line's hash forced `equal` (1); restore count compare dropped (1); missing-warm-up rule dropped (1). Survived: `foundcheck`'s STOP ignoring `outside` (MINOR 2); the SDK save prefix check dropped (equivalent mutant: `judgeError`'s equality already fails a prefixed message; no finding). File restored, `cmp` identical. |
| 4 | `npx tsc --noEmit -p recipes/tsconfig.s11.json` | PASS at `42d1ce8`: exit 0. At `d0744b2` (before S3c) it exited 2 with three errors: `upload-files.ts(133,10)`, `(134,70)` **and `extension/src/handlers/target.ts(15,58)`** (all `__agentBridge` on `Window`), the third outside the brief's named exception; all three are cured by S3c's type-only import (`upload-files.ts:28`). Not a finding against this slice. |
| 5 | Every-stage checks (clean copy, `42d1ce8` + the three files) | `npm run typecheck` exit 0; `npm run build` exit 0 (`built daemon → dist/index.js`, `built mcp → dist/index.js`, `built extension → dist/`); `npm test` exit 0, **Test Files 147 passed (147), Tests 3668 passed (3668)**; the slice's file alone: 1 file, 43 passed. Matches the builder's counts. Recipes configs: `.s10`, `.s9`, `.fe`, base `tsconfig.json` exit 0; **`.s6` exit 2 — MAJOR 1**. |
| 6 | Size ~500 lines of non-test code | PASS: 532 lines, 442 non-blank, non-comment. |
| 7 | Purity; invariants | PASS. `s11-rules.ts` imports only `../extension/src/upload-paths.js` (which imports only `@bridge/shared`); no `console`, `process`, `Date`, `Math.random`, `node:` module, timer. `parseUploadFolders`/`uploadPathsAllowed` are imported (`s11-rules.ts:9`), not copied. No hash of the safety state is printed: `restoreLine` prints counts and `equal/DIFFERENT`; `stateLine` prints only the public empty-text hash; `logsVerdict`'s `why` holds no token (tested). |

## 4. Findings

**MAJOR 1 — the new test breaks the s6 recipes typecheck.** `recipes/tsconfig.s6.json` includes `test/*.test.ts`
and excludes only the s9/s10 tests, so it now compiles `recipes/test/s11-rules.test.ts`, which pulls in chrome-typed
extension code (`debugger.ts`, `handlers/upload.ts`, `inject.ts`, …) without `"chrome"` in `types`.
Evidence: `npx tsc --noEmit -p recipes/tsconfig.s6.json | grep -c "error TS"` → `36` (in the clean copy and in the
main tree alike); the same command with `s11-rules.test.ts` moved aside → exit 0. This is the gotcha in
`recipes/CLAUDE.md` (the `.s6` glob bullet, #228), and the root `CLAUDE.md` Commands line says all five recipes
configs exit 0; #275 spent a slice restoring one of them. **Fix:** add `"test/s11-rules.test.ts"` to the `exclude`
list of `recipes/tsconfig.s6.json:10` (an edit outside the slice's three files, in the recipes lane; the step agent
places it). The S5-actor's later test files will need the same line.

**MINOR 2 — `foundcheck`'s STOP on an allowed `<OUTSIDE>` alone is untested.** `s11-rules.ts:181` `stop: r || o`;
the mutant `stop: r` keeps all 43 tests green (`Tests 43 passed (43)`). The tests cover root-only and both-allowed
(`s11-rules.test.ts:161-164`) but not outside-only, a reachable case (a found folder `<base>\outside`). **Fix:** one
assertion, e.g. `foundcheck("C:\\w\\outside", "C:\\w\\root", "C:\\w\\outside")` → line `… root=not outside=allowed`,
`stop` true.

**MINOR 3 — what counts as a "fixture" URL in UP-LOGS is undecided by the sheet, and the builder's reading can
false-STOP a wave.** `scanText` (`s11-rules.ts:488-495`) counts as fixture any http/https/ws/wss URL on 127.0.0.1,
localhost or `*.localhost` at **any port**, and everything else, including the extension's own
`chrome-extension://<id>`, as other (a STOP). Step 10's `isFixture10` (`recipes/s10-rules.ts:117-125`) used a port
allow-list and exempted `chrome://extensions` and the extension's own id. So the s11 reading is stricter than s10 on
the extension's pages (a worker console capture that shows one becomes a STOP, which costs a live slice) and looser on
loopback ports (a user's own localhost service would count as fixture). Neither breaks the integrity floor, but the
rule should be fixed before liveA runs, not after. **Fix (proposed, for the step agent):** a dated note on §4.23
UP-LOGS before any observation naming the fixture set (8081, 8084, the daemon's 9234, the extension's own id) and
`scanText` following it.

**NIT 1 — `judgeError` prints observed `data` verbatim** (`s11-rules.ts:79`). Every upload refusal is expected with no
`data`, so this prints only on a product defect, but that is exactly when a path in `data` could reach a committed
record. Suggest printing `data` keys only, or the presence of `data`.

**NIT 2 — `mcpOkText` has no drift test** against `mcp/src/tools/registry.ts:634-635` (the text is built inline in
the handler, not a constant). Byte-equal today by my reading; a comment naming the source lines would do.

**NIT 3 — two SW-2 inputs untested:** a warm-up that is itself `{notMeasured}` (the code treats it as present and
excluded, which fits the sheet), and `trials.length !== 3` (`measured === 3` with four trials would give a pass
verdict with outcome `undetermined`). The actor will always pass three; an assertion would pin it.

## 5. The builder's §4.23 ambiguities, judged
1. STATE's "hashes withheld unless the empty text's …" read as appending ` sha256=<empty>` only after an empty
   section: **fine** (the only reading that prints nothing secret; the sheet's terseness is no defect).
2. UP-OPT's `j` = k+2: **fine**; it follows from the typed order the sheet lists (relative, `C:\`, home). The actor
   must type them in that order on consecutive lines.
3. No MCP rule for SAVE-REFUSE-R's control: **fine**; the sheet judges the MCP leg only by "the same constant", which
   the control has none of.
4. UP-LOGS' "non-fixture scheme://host": **real sheet gap** — see MINOR 3.
5. UP-2's hashes recorded at file creation: **fine**; the sheet says so ("equals the sha256 recorded when the wave
   made the file").

Further readings I checked and accept: `raceVerdict` fails an `ok` after a refusal (the sheet's expected shape is
"`<k>` ok, then `<m>` …"); `faVerdict` fails a touched page or a banner although UP-FA is RECORD (the sheet lists
those clauses in the pass-rule column); `up1Outcome` keeps the outcome "received on a background tab" when only the
banner is missing (the sheet: "not seen → FAIL recorded").

## 6. Proposed decisions
### 2026-10-26 · UP-LOGS names its fixture set before liveA
**Decided:** a dated note on §4.23 UP-LOGS, written before any Run 16 observation, lists what counts as fixture
(127.0.0.1/localhost/`*.localhost` on 8081 and 8084, `ws://127.0.0.1:9234`, the extension's own
`chrome-extension://<id>`, `chrome://extensions`), and `scanText` takes the id and the ports as input.
**Why:** the sheet does not define "fixture"; the builder's any-port, no-extension reading can false-STOP a slice and
differs from Step 10's precedent. **Instead of:** finding out mid-wave. **Revisit if:** the console capture never
shows the extension's URL. **By:** Claude (proposed)

## 7. Handoff
Evidence: `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\vcheck\`
(`bytes.mts`, `mutants.sh`, `mutants.log`). The scratch copy is deleted. A fix round needs MAJOR 1 (and, cheaply,
MINOR 2 and NITs 1–3); MINOR 3 is the step agent's ruling. The re-check: `npx tsc --noEmit -p recipes/tsconfig.s6.json`
exit 0, plus the s11 config and `npm test`.
