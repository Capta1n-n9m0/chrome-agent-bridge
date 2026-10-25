# S5-rules verifier report, round 2 (affected items only)

Model: Claude Opus 5.5. UTC start 2026-10-25T20:49:55Z, end 2026-10-25T20:54Z (`date -u`, this host's clock).
Role: verifier (`docs/agent-rules.md` §6), round 2 after `S5-rules-fixer.md`. Nothing in the main tree was edited;
nothing committed. MINOR 3 of round 1 (UP-LOGS' fixture set) is with the session agent and is not re-judged here.

## 1. Verdict
**PASS-with-notes.** MAJOR 1 and MINOR 2 are closed; the counts are re-derived. One MINOR (the fixer's new SW-2 rule
for a not-measured warm-up is a pass-rule reading that lives only in code, not in §4.23) and two NITs.

## 2. How it was checked
A clean copy: `git archive` of HEAD (`42d1ce8`) into `scratchpad/v2/copy`, the four files copied in from the main
tree (`recipes/s11-rules.ts`, `recipes/test/s11-rules.test.ts`, `recipes/tsconfig.s11.json`,
`recipes/tsconfig.s6.json`; `cmp` identical to the main tree at the end), its own `npm ci` (exit 0). Its five
`node_modules/@bridge/*` junctions pointed inside the copy; removed with `cmd /c rmdir`, 0 reparse points left, then
the copy deleted. Main tree `node_modules/.bin` intact (42 entries). Evidence: `scratchpad/v2/ev/` (full path below).

## 3. Checks

| # | Check | Result |
|---|---|---|
| 1 | MAJOR 1: six recipes configs | PASS. `npx tsc --noEmit -p recipes/<c>` → `tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`: each exit 0, 0 `error TS`. `git diff recipes/tsconfig.s6.json` in the main tree: one line, the `exclude` list gains `"test/s11-rules.test.ts"`; nothing else. |
| 2 | MINOR 2: outside-only STOP | PASS. New test `s11-rules.test.ts:161-165`. Mutant `stop: r || o` → `stop: r`: red, `× UP-L1 and UP-0 > FOUNDCHECK stops when only <OUTSIDE> is allowed` (`mutants2.log`, M6). |
| 3 | SW-2 change vs §4.23 | See MINOR 1. Byte equality re-run with my round-1 script on the new code: `78 equal, 0 different`, incl. `SW-2 trial`, `SW-2 measured`, `SW-2 d line`, `SW-2 event`. Round-1 mutants re-run, all still red: `>= 950`→`> 950` (2), `<= 300`→`<= 350` (1), warm-up enters decided set (4), warm-up replaces trial 3 (3), missing-warm-up rule dropped (1), restore hash/count/line mutants (1 each). New: the not-measured-warm-up clause dropped → red (1). The trial-count clause dropped (N2) survives as an **equivalent** mutant (with 2 or 4 trials `measured !== 3` already gives NOT MEASURED). The `trials.length === 3` guard in `outcome` dropped (N3) survives: see NIT 2. M7 (SDK prefix) survives as in round 1, equivalent. |
| 4 | mcpOkText drift test | PARTLY. Red under `file(s) to`→`file(s) into` and ` bytes · sha256 `→` bytes, sha256 ` (`Tests 1 failed \| 46 passed (47)`). Survives when only the upload handler's join changes (`registry.ts:637` `lines.join("\n")` → `lines.join(" \| ")`, `Tests 47 passed (47)`): NIT 1. Registry restored, `cmp` identical. |
| 5 | Every-stage checks (clean copy) | `npm run typecheck` exit 0; `npm run build` exit 0 (`built daemon → dist/index.js`, `built mcp → dist/index.js`, `built extension → dist/`); `npm test` exit 0, **Test Files 147 passed (147), Tests 3672 passed (3672)**. Round 1: 3668; +4 = the outside-only test, the drift test, the two SW-2 tests (slice file 43 → 47). Matches the fixer's counts. |
| 6 | No unrelated edits | PASS as far as checkable. `s11-rules.ts` is 532 lines as in round 1; every round-1 mutant's anchor text still matched exactly once (the regions it covers are unchanged); the SW-2 edit is the `outcome` guard and the `verdict` expression (`s11-rules.ts:406,413`). `tsconfig.s11.json`'s mtime (00:35 local, 20:35Z) predates round 1. The test file's additions are the four tests named and the `node:fs`/`node:url` imports (`:3-4`) they need. |

## 4. Findings

**MINOR 1 — a not-measured warm-up now makes SW-2 NOT MEASURED; §4.23 does not say so.** `s11-rules.ts:413`:
`!("i" in warmup) ? nm("the warm-up trial was not measured")`. §4.23 SW-2 (e2e-test-plan.md line 1500) says "Trial 0
is a warm-up: recorded and excluded", "A failed pre-check marks that trial NOT MEASURED … never re-run", and "the row
passes by being measured as pre-written". Read literally, a warm-up whose pre-check failed is still recorded and
excluded, and three measured trials are "measured as pre-written", so the sheet would give PASS where the code now
gives NOT MEASURED. The opposite reading is also defensible (a warm-up whose capture was not taken warmed nothing, so
the procedure did not run as written). What it cannot do: change the outcome or S5b — `outcome`/`s5b` are computed
from trials 1–3 only and are unchanged by this clause (tests and M2/M2b confirm), and it never makes a pass out of a
non-pass. It contradicts no explicit sheet text, but it is a pass rule, and pass rules are written down before the
run (§2). The trial-count clause is harmless: the sheet defines exactly three trials. **Fix:** the step/session agent
adds a dated note on §4.23 SW-2 before any Run 16 row runs, stating the reading (either keep it, or drop the clause
and let a not-measured warm-up be recorded only).

**NIT 1 — the drift test's join check is not anchored to the upload handler.** `s11-rules.test.ts:281`
`toContain('lines.join("\\n")')` matches six sites in `registry.ts` (406, 413, 637, 673, 851, 875), so changing only
the upload handler's join stays green. The two template checks are specific and do catch their drift. **Fix:** assert
`return capped(reply, lines.join("\n"));` or slice the source from the `uploadFiles` call to the handler's end.

**NIT 2 — the `trials.length === 3` guard in `outcome` is untested on its one live case**: four trials with one not
measured (`measured === 3`, length 4). Without the guard the outcome would read "runs to its bound" and `s5b` true,
though the verdict stays NOT MEASURED. Unreachable for an actor that passes three trials; one assertion would pin it.

## 5. Proposed decisions
### 2026-10-26 · SW-2: what a not-measured warm-up does to the row
**Decided:** a dated note on §4.23 SW-2, before Run 16, says whether a warm-up whose pre-check failed makes the row
NOT MEASURED (the code as of the S5-rules fix round) or is only recorded. **Why:** the code now holds a pass rule the
sheet does not state. **Instead of:** settling it after seeing the run. **Revisit if:** never needed (the warm-up's
pre-check passes). **By:** Claude (proposed)

## 6. Handoff
Evidence: `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\v2\ev\`
(`mutants2.sh`, `mutants2.log`, `tsc-*.txt`, `typecheck.txt`, `build.txt`, `test.txt`, `bytes.txt`); the registry
mutant `…\scratchpad\v2\mutjoin.cjs`. The scratch copy is deleted. No further fix round is required for acceptance;
MINOR 1 needs the sheet note before liveA, alongside round 1's MINOR 3.
