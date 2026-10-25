# S7 wave fixer, round 2 (after Return 2) — report

Opus 5.5, level 2, 2026-10-25. Brief: `briefs/S7-wave-fixer2.md`. Base `e28b609` + the runner's uncommitted
`S7-run-record.md` / `S7.ledger.md` (left as they are, nothing appended). No Chrome action, no daemon, no port 9234, no
bridge MCP client, no `npm run build`; no agent spawned; nothing committed. Read locally (counts and tool names only):
the actor turn files under `%TEMP%\bridge-e2e\s15\actors\` — `TOOL ToolSearch` in exactly 4 of 12 turns, each the first
bridge turn of its actor (`mcpf-click` click-1, `mcpf-type` type-1, `mcpf-press` press-1, `cap` 0900); the raw output
holds 2 `STOP:` lines (the two of Return 2).

Status: DONE (checks in §5).

## 1. `evalValue` — the missing `return (<expr>);` wrapper

**Cause.** `recipes/s10.ts` `evalValue` sent the expression as is. The extension wraps an expression that contains
`return` (`extension/src/evaluate/wrap.ts` `RETURN_RE`, `wrapExpression`) in an async IIFE body; SW-1's
`VISLOG_INSTALL` is an IIFE with an inner `return`, so the body had no return of its own and the value came back kind
`undefined` (Return 2, block 18). `recipes/t5-lib.ts:110-120` (2026-10-22) and `recipes/s9.ts:338-343` (2026-10-24)
carry exactly this set-up fix.

**Change.** `recipes/s10-rules.ts:43` `harnessExpression(expr)` = `` `return (${expr});` `` (doc comment: the cause, and
"never used for the expressions a row measures"); `recipes/s10.ts:222` `evalValue` sends
`harnessExpression(expression)`. `valueExpr` moved unchanged from `s10.ts` to `recipes/s10-rules.ts:52` (exported, so a
test pins it; `s10.ts` imports it).

**Audit of every place s10 evaluates page code:**

| Where | Expression | Affected? |
|---|---|---|
| `evalValue` — setup's title (`s10.ts` cmdSetup) | `(document.title = …)` | no (no `return`; worked live in block 7); now wrapped, same value |
| `evalValue` — MCPF page log `LOG_EXPR`, the field value, `CAP_CLICKS` | plain reads | no (worked live, blocks 14–17); now wrapped, same value |
| `evalValue` — SW-1 `VISLOG_INSTALL` | IIFE with an inner `return` | **yes — the bug**; fixed |
| `evalValue` — SW-1 `VISLOG_READ` | plain read | no (never reached); now wrapped |
| `evalValue` — `pageDigest` (`window.__s10status[k]`) | plain read | no; now wrapped |
| `evalValue` — `save-build` (`await window.__s10build(k)`) | top-level `await`, no `return` | not by this bug (replMode handles top-level `await`; never run live yet); now `return (await …);` → the async-body path, the same path the SAVE rows' `return` form takes; a test runs `return (await Promise.resolve(7));` through `wrapExpression` → 7 |
| SDK `tab.evaluate` — SAVE-FIX chunks `window.__s10export.slice(a, b)` | primitive, no `return` | no; unchanged (mirrors `export-grades.ts`, what the row measures) |
| SDK `tab.evaluate("1+1")` (JSD / MCPF-1-off), `evaluateRef("document.body")` | no `return` | no; unchanged (measured) |
| `evaluateToFile` / `saveEvaluateToFile` / raw `evaluateSaveStart` with `valueExpr(k)` | `return window.__s10v[k]` | no (a top-level `return`, the form the SAVE rows measure); unchanged |
| SAVE-PRIM: `valueExpr("64m", true)` | `window.__s10v["64m"]`, **no `return`** (#217) | no; **must not be wrapped** — unchanged, pinned by a test |
| SAVE-REFUSE cases | `return undefined` … `return (() => { …; return o; })()` | no (each has a top-level `return`, so the body returns the IIFE's value); unchanged |
| JSD `evaluateToFile("return 'S15'")`, `evaluateSaveStart {expression: ""}` (s10check) | measured refusals | no; unchanged |
| MCP prompts (`PROMPTS.saveTo` with `valueExpr(k)`, `jsd`, `evalControl`) | `return …`, `1+1`, `document.body`, `return 'S15'` | no; unchanged (measured) |
| PP1 `pp1-plan` `chunkExpression` | arrow without `return` (`blackboard/readonly.ts:259`) | no; unchanged |
| SAVE-IDONLY raw CDP `Runtime.evaluate` in the headless Chrome | not through the extension's wrap | no; unchanged |

**Proof.** `recipes/test/s10-rules.test.ts:893` "evalValue sends the harness's own page code …" (4 tests): the bug
reproduced (an IIFE with an inner `return` through `wrapExpression` → `undefined`), the fix (→ `"visible"`, `2`, `7`),
the source (`evalValue` uses it and it is the only `harnessExpression(` call in `s10.ts`; `VISLOG_INSTALL` holds the
inner `return`), and SAVE-PRIM's exception (`valueExpr("64m", true)` has no `RETURN_RE` match, `wrapExpression` leaves it
unchanged, `cmdPrim` still calls `cmdSaveSdk("SAVE-PRIM", "64m", true)` → `evaluateToFile(valueExpr(key, bare), …)`).

## 2. The actors' tool loading — `ENABLE_TOOL_SEARCH=false`

**Cause.** Claude Code 2.1.310 defers MCP tools behind its `ToolSearch` tool, so each actor's first bridge turn called
`ToolSearch` (`select:mcp__chrome-agent-bridge__…`) before the bridge tool; MCPF-1's and CAP-1's `-calls`/`-answer`
checks counted it.

**Where the setting comes from (not guessed).** `claude --help` names no flag for it. The installed binary
(`~/.local/bin/claude.exe`, 2.1.310) carries Claude Code's own text: "To turn it off …, set `ENABLE_TOOL_SEARCH` to
`false` …", the log line "`ENABLE_TOOL_SEARCH=false` avoids the refused request", and `ENABLE_TOOL_SEARCH` in its
documented environment-variable list (values `true`/`false`/`auto`/`auto:N`/`force`).

**Offline proof** (scratchpad `ts-probe\`: `dummy-mcp.mjs`, a no-dependency stdio MCP server with one tool
`probe_echo`; `probe.mjs` spawns `claude.exe` with the actors' exact flags — `-p --input-format stream-json
--output-format stream-json --verbose --model sonnet --strict-mcp-config --mcp-config <dummy config> --allowedTools
mcp__dummy` — one stream-json prompt "Call the tool mcp__dummy__probe_echo exactly once …", stdin closed at the result):

| Run | `ENABLE_TOOL_SEARCH` | init tool list | tool calls in order | result |
|---|---|---|---|---|
| control (claude PID 24176) | unset | `ToolSearch`, `mcp__dummy__probe_echo` (28 tools) | `ToolSearch {"query":"select:mcp__dummy__probe_echo","max_results":1}`, then `mcp__dummy__probe_echo {"word":"ping"}` | success, `echo: ping`; exit 0 |
| off (claude PID 20320) | `false` | `mcp__dummy__probe_echo` (27 tools, no `ToolSearch`) | `mcp__dummy__probe_echo {"word":"ping"}` only | success, `echo: ping`; exit 0 |

The control reproduces Return 2's defect; with the variable the first (and only) call is the dummy tool. No bridge, no
daemon, no port.

**Change (opt-in, Run 13/14 behaviour unchanged without the flag).** `recipes/s9-rules.ts:585` `actorEnv(base,
noToolSearch)` → `{...base, ENABLE_TOOL_SEARCH: "false"}` only when asked, else `base` itself. `recipes/s9-actor.ts`:
`start <name> … --no-tool-search` passes the flag to its host (`:116`); the host spawns claude with
`env: actorEnv(process.env, noToolSearch)` (`:57-59`), records `toolSearch: "off"` in `pids.json`, and the start line
gains ` · tool search off (ENABLE_TOOL_SEARCH=false)`. `recipes/s10-r15.ps1:265` `Start-Actor` passes
`--no-tool-search` for every Run 15 actor, and `:269` STOPs (after recording the actor as running, so the stop procedure
ends it) when the start line lacks `tool search off`. Sheet §7 step 4: the PP1 actor's `start` carries the flag. No
check text, prompt or expected text changed.

**Proof.** `recipes/test/s10-rules.test.ts:933` (2 tests): `actorEnv` sets the variable only when asked and does not
mutate its input; `s9-actor.ts` passes the flag and the env, the runner's one `S9Actor start` carries it and checks the
line, the sheet's PP1 command carries it.

## 3. SW-1R

**Change.** `docs/e2e-test-plan.md` §4.22: the dated amendment verbatim as the brief gives it (line 1371, before the
"Rows that change no safety state" table) and the row `SW-1R ★` right after `SW-1` (line 1381) = SW-1's row with only
the row ID cell, every `` `ROW SW-1 `` → `` `ROW SW-1R ``, `` `-Block sw1` `` → `` `-Block sw1r` `` and `` `s10.ts sw1` `` →
`` `s10.ts sw1 --row SW-1R` `` changed (steps, pass rule, outcome table, the 0.8 quote with its 950 / 300 ms thresholds
verbatim). SW-1's own row text is unchanged. `recipes/s10.ts:566` `sw1 --row <id>` takes only `SW_ROWS`
(`s10-rules.ts:492`: `SW-1`, `SW-1R`), default `SW-1`. `recipes/s10-r15.ps1`: `sw1r` in the `ValidateSet`, `$Order` and
`$RowBlocks` right after `sw1`; `B-sw1r` (`:581`) = `B-sw1` with the row ID SW-1R and `S10 sw1 --row SW-1R`. Sheet §1:
row `18a` (`-Block sw1r`, budget 330 · worst case 505 s like block 18), §8's outcome-table template gains a SW-1R line.

**Proof.** `recipes/test/s10-rules.test.ts:954` (2 tests): the SW-1R row equals SW-1's under exactly that
transformation, sits right after it, keeps both thresholds, and the amendment line is present; the runner lists,
`ValidateSet`, `B-sw1r`'s single call `sw1 --row SW-1R` and its body equal to `B-sw1` but the ID. The existing block
tests cover `sw1r` automatically: `blockDependencyGaps` = `[]` (its `sw1` call is in `S10_VALUE_NEEDS`), and the budget
test (330 + 15 + 160 = 505 ≤ 570).

## 4. Resume after Return 2

**State file** (`%TEMP%\bridge-e2e\s15\r15-globals.clixml`, read only): attempt 1, stopped at `sw1`, done
`preflight … rep0, bbl1, bbl2, mcpf-click, mcpf-type, mcpf-press, cap`, no earlier resume, `WaveStart` set (the mark).
The script's rule (`B-reset`): `-Skip` must equal the row blocks done or previously skipped plus the stopped row block.
So the call is

`powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s10-r15.ps1 -Block reset -Attempt 2 -Skip bbl1,bbl2,mcpf-click,mcpf-type,mcpf-press,cap,sw1`

written into the sheet's new subsection "Resume after Return 2" (§1) and the runner brief (a new bullet; the old "restarts
from block 1" bullet marked superseded). `sw1r` is not in it.

**Dry run, no Chrome** (scratchpad `resume-dry\dry.ps1`, `S10_OUT` = the scratch folder, a fresh copy of the state file
per case; the real state file's sha256 equal before and after):

| Call | Result |
|---|---|
| skip without `sw1` | `USAGE: -Skip must be exactly 'bbl1,bbl2,mcpf-click,mcpf-type,mcpf-press,cap,sw1' … missing 'sw1'`, exit 3, state unchanged |
| skip without `cap` / without `bbl1` (would re-run an observed row) | the same USAGE, missing `cap` / `bbl1`, exit 3, unchanged |
| skip plus `sw1r` | USAGE, extra `sw1r`, exit 3, unchanged |
| skip plus `rep0` (framing) | `USAGE: -Skip names framing block(s) rep0 …`, exit 3, unchanged |
| `-Attempt 3` | `USAGE: -Attempt 3 refused (the stored attempt is 1) …`, exit 3, unchanged |
| **the call**, typed exactly as above | exit 0; `RESUME attempt 2: bbl1, bbl2, mcpf-click, mcpf-type, mcpf-press, cap, sw1 observed in an earlier attempt or stopped in one, not re-run`; `RESUME attempt 2: blocks preflight, build, servers, window, daemon, reload, setup, safe0, console, found, rep0, sw1r, pop2, save-a, savefix, save-64, save-64-mcp, prim, idonly, save-ttl, r3, savedis, savejs, saveblk, jsd, off, restore, logs, teardown; daemon.log mark 2026-10-25T09:57:04.349Z (the first attempt's)`; stored attempt 2, skip = the 7 blocks |
| after it: `-Block sw1`, `-Block cap` | `NOT RUN: block … is skipped in this resume (…)`, exit 3 |
| after it: `-Block sw1r` before block 1 | `NOT RUN: block sw1r needs block rep0 first (…)`, exit 3 |

Test: `recipes/test/s10-rules.test.ts:982` — the skip set = the row blocks of `$Order` up to `sw1`, without `sw1r`, and
the same call text in the sheet and the runner brief.

## 5. Checks

- `npx tsc --noEmit -p recipes/tsconfig.s10.json` exit 0; `-p recipes/tsconfig.s9.json` exit 0.
- `npm run typecheck` exit 0.
- `npm test` exit 0: **3247 passed, 132 files** = 3238 + 9, all 9 new in `recipes/test/s10-rules.test.ts` (64 → 73);
  no other file's count changed, nothing removed.
- PowerShell parse, 0 errors each: `s10-r15.ps1`, `s10-win.ps1`, `s10-ret1.ps1`, `s10-mem.ps1`.
- STOP sentence: the 4-line block in `S7-wave-sheet.md` and `briefs/S7-runner.md` has the same sha256 (`ddce1848…86d4`);
  neither was edited.
- `git diff e28b609 -- docs/e2e-test-plan.md`: 3 added lines — the amendment, a blank line, the SW-1R row; nothing else.
- Processes: before — node 22152, claude 23208, 24284 (none touched). Started — `claude.exe` 24176 (control) and 20320
  (off), each with its dummy-server `node` child and the `node probe.mjs` parent, plus short `powershell` dry runs;
  after — `claude.exe` 24176 and 20320 gone, the node/claude list back to exactly 22152, 23208, 24284.

## Files for the commit

`recipes/s10.ts`, `recipes/s10-rules.ts`, `recipes/s10-r15.ps1`, `recipes/s9-actor.ts`, `recipes/s9-rules.ts`,
`recipes/test/s10-rules.test.ts`, `docs/e2e-test-plan.md`, `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md`,
`…-steps/briefs/S7-runner.md`, `…-steps/S7-wave-fixer2.md` (this report), `…-steps/briefs/S7-wave-fixer2.md` (the brief,
untracked). The runner's `S7-run-record.md` and `S7.ledger.md` are the step agent's to commit as they stand.
