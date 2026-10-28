# S7-helpers-a fixer report (fix round 1)

Model and effort: Sonnet 5.5, medium. Role: fixer (`docs/agent-rules.md` §6). No live run, no Chrome, no daemon, no commit.
Touched: `recipes/s12-forms.ts`, `recipes/s11b-rules.ts` (one message), `recipes/test/s12-forms.test.ts`, `recipes/test/s11b-h8.test.ts`.

## 1. Findings
| Finding | Result |
|---|---|
| MAJOR-1 | Fixed. The cause is as measured: the byte-identical `ROW RULES PASS: RULES 0` at R18-0 (record line 4) and R18-RESTORE (line 266). `createPreflightGuard` is removed (it keyed on the first token). New `dedupeIdenticalRows(lines)` drops only a `ROW` line whose text (minus an ISO time and `s9-win: ` prefix) repeats. Every other line passes (both `STATE` and both `TOGGLE` lines stay), and a second `ROW` for the same id with another verdict stays, so `aggregateRows` still warns on a real double verdict. |
| MINOR-1 | Fixed in the test's `matches`: a positional `<a\|b>` or `<CODE>` goes through `altOk`. `ARGS R19-X lbl answer=ok …` and free text are now rejected. |
| MINOR-2 | Tests added: an entry without the sentinel (`sentinel=2` of 3), equal `ts` gives `ordered=yes`, a decrease gives `no`, `sentinel=0`. |
| MINOR-3 | Wording only: `O2 did not show the saved text within 5 000 ms (observed <n> ms)` (`s11b-rules.ts:816`). The verdict logic is unchanged. |
| MINOR-4 | `Verdict` widened to PASS, RECORD, NOT RUN, NOT MEASURED, NOT DISCRIMINATING, FAIL and STOP, with ranks (PASS, RECORD and NOT RUN 0; NM 1; ND 2; FAIL 3; STOP 4). A NOT RUN row keeps its word under every clause (it read no console). RECORD stays RECORD on `ok`. |
| NIT-2 | `bannerConVerdict`: an after leg under 20 000 ms idle is NOT MEASURED whether it reads `seen` or `none`. |

Not disputed. NIT-1 was not in my list.

## 2. Red first and green after
- Red (new tests, before the fix): `recipes/test` gave 6 failed. These were the matcher test, the NIT-2 line, both (c) tests (`dedupeIdenticalRows` not a function), the (d) test and the MINOR-3 test in `s11b-h8.test.ts`.
- The MINOR-2 tests already pass on the code, so I checked them by mutation. With `sentinel=${es.length}` and a strict `<` they report `1 failed | 29 passed`. The file was restored afterwards.
- The Run 18 test copies record lines 1-17 and 265-266 (they hold no URL, path or text, only the empty-text sha256 and a commit hash). Fed as printed, `aggregateRows(...).warns` is `["WARN row printed twice: RULES"]`. After `dedupeIdenticalRows` it is `[]`, and n is 6.
- Green:
  - `npx vitest run recipes/test`: 55 files, **1242 passed** (was 1237).
  - `npm test`: 221 files, **5142 passed**.
  - `npm run typecheck`, `npm run build`: exit 0.
  - The seven `tsc --noEmit -p recipes/tsconfig*.json`: all exit 0.
  - `node scripts/doc-check.mjs`: exit 0.
- Slice size, recounted: code 357 added lines (forms 134, rules +2 and the 1-line message change, ps1 +3/-1, playground +17, fixtures 200), tests about 309 (forms 304, h8 +5). Within 400 + 600.
- Incident: while editing I truncated `s12-forms.ts` once (a replace matched the header comment). I rebuilt it from the text I had read, and the whole suite passes. The test file `s12-forms.test.ts` pins every form's keys and order against the sheet, so a rebuild error would show there.

## 3. Handoff (corrects S7-helpers-a-builder.md §7; that report is not edited)
- **Load order (binding, S1-helpers-a.md §7 and S1-helpers-b.md §7):** PowerShell dot-sources `s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, then `s12-win.ps1`, then calls `Assert-S12Patched`. The builder's order left out `s11b-win.ps1`.
- **Changed entry points:**
  - `createPreflightGuard` is gone. The runner calls `dedupeIdenticalRows(slice's record lines)` and passes the result to `aggregateRows` (`recipes/s11b-r17b-rules.ts`), once per slice (the lines of one slice's record file, before the `CHECK rows` count).
  - The restore keeps printing its `ROW RULES` line and the runner makes no other change to the preflight prints.
  - `settleConsoleClauses(pending, "ok"|"fail"|"unread")` now takes any of the seven verdicts. The runner passes R19-CON-FILE (NOT RUN), R19-CON-NOTEA (RECORD) and a NOT DISCRIMINATING R19-CON-FRAME clause as they are.
  - `bannerConVerdict` returns NOT MEASURED for a short-idle after leg whatever it read.
  - `judgeUpOpt`'s over-bound text now reads `O2 did not show the saved text within 5 000 ms (observed <n> ms)`.
- The unchanged items (b), (c) as "runner duty" now read: (b) call `settleConsoleClauses` before R19-LOGS; (c) call `dedupeIdenticalRows` before `aggregateRows`.
