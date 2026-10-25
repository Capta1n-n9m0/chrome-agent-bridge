# S4b verifier report — the new code `JS_DISABLED`

Verifier: Claude Opus 5.5, 2026-10-25, independent of the builder. The work checked: the spec commit `2866c43` (on top of
`41e6f5d`) plus the 13 uncommitted files in the main tree. S4 close = `6ba2d10` (code identical to `41e6f5d`:
`git diff --stat 6ba2d10 41e6f5d` lists 3 docs files only). Host-only: no Chrome, no daemon on 9234; the one socket
probe ran on port 0. The builder's report `S4b-builder.md` was treated as claims; each one below was re-run.

## Verdict: **PASS-with-notes**

All three exit checks pass, and every claim the builder made about the code was reproduced. The findings against the
work are MINOR or NIT only (F2–F6). One item (F1) is an escalation about the environment, not a finding against the
work: the main tree's `node_modules` was damaged during the builder's run. The step agent must repair it before anyone
runs `npm test` in the main tree, and before the code commit's checks.

## Method (task 1: a clean worktree)

- `git diff --binary > s4b.patch`. `git worktree add --detach <scratch>/wt-after 2866c43` and `git apply` the patch
  (the `git status` there listed the same 13 files). `git worktree add --detach <scratch>/wt-base 41e6f5d`.
- `node_modules`: I first junctioned the main tree's entries, but the jsdom files failed with
  `Cannot find module '@asamuzakjp/css-color'` (see F1). I removed the junctions with a non-recursive `rmdir` and ran
  `npm ci --prefer-offline` in each worktree. Each install is its own, and its `@bridge/*` links point into its own
  worktree.
- Both worktrees were removed with `git worktree remove --force` and then `prune`. Before that I unlinked the
  `@bridge` symlinks, and I checked that no reparse point pointed outside the worktree. `git worktree list` now shows
  only `main`. The main tree's `node_modules` still holds 170 entries and 5 `@bridge` links, and the main tree's
  `git status` is unchanged.

## Counts (re-derived)

| | `npm test` | typecheck | build |
|---|---|---|---|
| base `41e6f5d` (wt-base) | **3145 passed / 130 files** | — | — |
| after (`2866c43` + patch, wt-after) | **3165 passed / 130 files** | exit 0 | exit 0. `git status --short` after the build shows only the 13 patch files and no `dist/` entry. `git ls-files` lists 0 tracked files under `dist/`. |

I compared the two JSON reports per file and per test name (`scratchpad/cmp.cjs`):

- Per-file changes: `s4-save-gate` 12→17, `mcp/test/safety` 32→40, `sdk/test/failure-report` 67→68 (the generated
  `JS_DISABLED: attaches nothing` case), `sdk/test/safety` 18→23, `shared/test/codes` 4→5. Every other file has the
  same count.
- No file is gone. 6 test names disappeared, and all 6 are renames whose new name appears among the 26 added names:
  `codes` ×2 (15→16 and 25→26 in the name), `safety-call` ×1, `safety-gate` ×3 (`DISARMED {scope:"evaluate"}` →
  `JS_DISABLED` in the name). 26 − 6 = **+20 net**, which matches 3165 − 3145. **No test was removed.**

## Exit checks

**S4b.1 — PASS.** `shared/src/codes.ts` adds `"JS_DISABLED"` to `EXTENSION_ERROR_CODES`, giving 16 extension codes,
and to `ErrorCodes`, giving 26. The test `S4b.1 (Step 10, #202): JS_DISABLED is an extension code on the wire; 26
codes, 25 on the wire` passes after the patch and fails at the base. `git show --stat 2866c43` touches exactly one
file, `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (+28). Its note says what the brief requires:

- 26 codes, 25 on the wire (9 daemon + 16 extension).
- Which calls get the code: `evaluate` ± `asRef`, `evaluateSaveStart`/`Chunk`/`End`, and a `javascript:`/`data:`/`blob:`
  `navigate`/`newTab`.
- No `data`, and a message that names no URL, pattern, title or id.
- `DISARMED {scope:"all"}` wins while the bridge is off.
- `"evaluate"` is no longer produced, but is still rendered for an old extension (F17).
- The code is not in the attach set, and nothing changes with JavaScript on.
- Three in-place *Superseded 2026-10-25* notes.

The code is still uncommitted, so the "spec before code" order in `git log` holds by construction once the code is
committed.

**S4b.2 — PASS.** Each case is covered by a test, and I checked each against the S4-close source:

- **JavaScript off.** `s4-save-gate.test.ts` › `S4b.2 … armed, JavaScript off: each call answers exactly {code:
  JS_DISABLED, message} — no data; no handler runs` sends 11 calls through the real `GatedRouter` with JSON on the
  wire: `evaluate`, `evaluate {asRef}`, the 3 `evaluateSave*`, and `navigate`/`newTab` to `javascript:`, `data:` and
  `blob:`. The safety-gate matrix, `safety-call` and the post-check tests cover the same cases at the decision level.
- **Bridge off.** `… the bridge off (JavaScript on or off): DISARMED {scope:"all"} wins for the same calls`, plus the
  matrix's new assertion that `DISARMED` ⇒ `scope "all"`.
- **JavaScript on.** `… armed, JavaScript on: nothing changes — each call reaches its handler`.
- **Old extension.** `sdk/test/safety.test.ts` and `mcp/test/safety.test.ts` › `F17: an old extension's DISARMED
  {scope:'evaluate'} still reads as the JavaScript-off line`.
- **Red at `6ba2d10`.** I copied the 6 changed test files into wt-base (base code). Result: **38 failed / 480 passed of
  518**, the same as the builder's figure (`scratchpad/red.cjs`):
  - 18 of the 25 new test names fail.
  - All 20 same-name tests whose expectation changed fail.
  - 7 new tests pass at the base, and they are exactly the builder's 7 controls: bridge-off wins, JavaScript on,
    other navigations, `ATTACH_CODES` lacks it, the Tab call makes no attach call, and F17 in the SDK and the MCP.
- **Mutants for the controls** (run on wt-after, each file restored byte for byte, `scratchpad/mut.cjs`):

| Mutant | Red | Controls it turns red |
|---|---|---|
| M2: the JavaScript check moved before the armed check | 16 | `the bridge off … DISARMED {scope:"all"} wins` + 14 matrix `disarmed+JS off` cases + `refusalError` |
| M3: JavaScript on also refuses class `evaluate` | 27 | `armed, JavaScript on: nothing changes` + 26 others |
| M4: JavaScript off refuses every `navigate`/`newTab` | 10 | `JavaScript off leaves every other navigation alone` + 9 |
| M5: an old `DISARMED {scope:"evaluate"}` read as the kill switch | 4 | both F17 tests + both Step 9 `scope:'evaluate'` tests |
| M8: the old line printed under the `JS_DISABLED:` prefix | 4 | the same 4 (the builder's Proposed decision 1 is pinned) |
| M7: `JS_DISABLED` carries `data:{scope:"evaluate"}` | 19 | the "no `data`" assertions |

Every control is discriminating.

**S4b.3 — PASS.**

- `sdk/test/safety.test.ts` › `ATTACH_CODES does not hold JS_DISABLED; isAttachCode says no; the set is unchanged`.
- `mcp/test/safety.test.ts` › 6 cases `JS_DISABLED → the one line, isError, no attach, no image`. Each asserts
  `toEqual({isError: true, content: [one text item]})` and that `attach` was never called. The `saveTo` leg leaves no
  file and no `.part`.
- **M1** (add `"JS_DISABLED"` to `ATTACH_CODES`): **9 red** — `failure-report` ×2, the SDK attach tests ×2, and MCP
  `browser_evaluate` ×4 plus `browser_navigate` ×1.
- **M6** (drop `JS_DISABLED` from `safetyRefusalLine`, which is the only route into `withSafetyRefusals`): **9 red** —
  SDK ×2 and all 7 MCP `JS_DISABLED` tests.

## Findings

1. **ESCALATE (environment; not a finding against the S4b work, so it does not count toward the verdict) — the main
   tree's `node_modules` is damaged.** If it were rated as a finding, it would be MAJOR: it blocks main-tree checks
   until it is repaired. Location:
   `C:\Users\aliev\Projects\chrome-remote-extention\node_modules\.bin` and `…\node_modules\@asamuzakjp`.
   - Evidence: both directories are empty, and both have mtime `2026-10-25 04:49:47 +0400` (`ls -la
     --time-style=full-iso`). That is before this verifier started (its first command ran about 04:53) and while the
     builder was still running (its report was written at 04:51:24, and the ledger says the builder finished at 00:52Z).
   - Effect: in the main tree, `node -e "require.resolve('@asamuzakjp/css-color')"` throws MODULE_NOT_FOUND. A run
     through junctions to it gave `2 failed | 114 passed (116)` files with 14 errors (`Cannot find module
     '@asamuzakjp/css-color'`, from `jsdom` → `cssstyle`). `npx vitest` also failed with `'vitest' is not
     recognized`, because `.bin` is empty.
   - Likely cause: the builder's worktree cleanup. Its report says "junctions deleted non-recursively first;
     `node_modules` of the main tree checked intact". The damage pattern (the two alphabetically first entries
     emptied) fits a recursive delete that went through a junction and stopped. That cause is inferred, not proven.
   - The builder's "checked intact" claim is false, and the main-tree test results it pasted predate the damage.
   - My own numbers come from `npm ci --prefer-offline` installs in the worktrees, so they are not affected.
   - Suggested fix: the step agent runs `npm ci` (or `npm install`) in the main tree before the commit's or S7's
     checks, then re-runs `npm test` there. Future briefs should say: remove a junction with `cmd /c rmdir <link>` and
     never with `Remove-Item -Recurse` or `rm -rf`, or else use `npm ci` in worktrees instead of junctions.
2. **MINOR — `docs/setup.md` still says the old code outside § Safety** (the builder reported this; it is outside the
   lane).
   - `docs/setup.md:543`: "every `browser_evaluate` (and `asRef`) is refused `DISARMED` with scope `evaluate`".
   - `docs/setup.md:898`: "JavaScript is off (scope `evaluate`)" under "Every call answers `DISARMED`".
   - `CLAUDE.md:16` and `:104` say 25 codes / 24 on the wire; `CLAUDE.md:730` says "(`DISARMED`, scope `evaluate`,
     SAFE-6)". That last one is a Run 13 measurement and can stay as history.
   - Suggested fix: the S8 propagator or the session agent adds dated notes. The verifier edits nothing.
3. **NIT — test names that now describe the wrong code.**
   - `extension/test/safety-gate.test.ts:395`, `a tab gone at receipt × disarmed → DISARMED; evaluate × JS off →
     DISARMED {scope:evaluate}`, now asserts `JS_DISABLED`. The builder kept the name as a verbatim #141 row title,
     with a dated comment.
   - `…:538`-ish, `the two DISARMED scopes read differently (#133)`, now asserts that one of the two is `JS_DISABLED`.
   - Suggested fix: none required. A renamed title would read better, but it would break the #141 verbatim link.
4. **NIT — `s4-save-gate.test.ts:105` against F6's prediction.** F6 said S4b would change no S4 test text. One sanity
   line changed (`toMatchObject({code: DISARMED})` → `JS_DISABLED`); the equality assertion that F6 built is
   unchanged. The line's own S4 comment had predicted this ("after S4b: JS_DISABLED"). The change is ordered by #202
   and listed by the builder. F6's prediction was simply incomplete; this is not a forbidden edit.
5. **NIT — the builder's `tsconfig.s6.json` description is imprecise.** The builder wrote "26 lines of `Cannot find
   namespace 'chrome'`". In fact the 26 lines are 9 × `Cannot find namespace 'chrome'` plus `Cannot find name
   'chrome'` errors, all in `extension/src/tabs.ts`. The claim that matters holds: base and after give exit 2 with
   identical output (`diff` after path normalisation: SAME). `tsconfig.json`, `.fe` and `.s9` give exit 0 at both
   commits.
6. **NIT — the MCP line's wording against 0.12's paraphrase.** 0.12 quotes "the user turned JavaScript off; every other
   tool still works; ask them". The line keeps Step 9's words: "…so evaluate (browser_evaluate) is refused; every other
   call still works. Ask the user before relying on it; do not retry it." The meaning is the same, and the builder's
   brief said to keep the existing words unless 0.12 demands otherwise. The builder said which it chose (Proposed
   decision 2). No change needed.

## Task-by-task evidence

**Task 5: producers.** I grepped `scope: ?["']evaluate["']|disarmed\(["']evaluate|DISARMED_EVALUATE|scope:evaluate`
over the repo, excluding node_modules, dist and docs. The only refusal builders left are `disarmed()` →
`data:{scope:"all"}` (`extension/src/safety.ts:202`) and `safety-state.ts`'s `DISARMED_ALL` (`"all"`). The remaining
hits fall into five groups:

- **Comments and dated notes:** `safety.ts:13`, `:205`, `:280`; `codes.ts:32`; the test comments.
- **The alias `DISARMED_EVALUATE_MESSAGE`:** `safety.ts:189`. It is not a producer.
- **The F17 renderer, a consumer:** `sdk/src/error.ts:116`–`141`.
- **Fake old-extension inputs in tests:** `mcp/test/safety.test.ts:189`, `:300`; `sdk/test/safety.test.ts:97`, `:137`,
  `:287`, `:294`; and `shared/test/protocol-step9.test.ts:78`, where the guard keeps both values (F17).
- **Run 13 history:** `recipes/test/s9-rules.test.ts` and `recipes/s9-rules.ts` (`DISARMED:evaluate`).

Judgement: **no producer of `"evaluate"` remains.** I agree with the builder's list.

**Task 6: pass-through.**
- Code reading:
  - `daemon/src/connection.ts:66-68` hands every v2 error to `fromWire`.
  - `shared/src/error.ts:44-51` (`fromWire`) keeps any non-empty string code and its `data` ("a code outside
    `ErrorCodes` is kept as a string").
  - `daemon/src/route.ts:62` sends `err.toWire()` back to the client.
  - A missing code becomes `INTERNAL` and is logged; `JS_DISABLED` has a code, so neither applies.
  - So the daemon needs no change, and neither does an old daemon.
- Probe on port 0: a scratch vitest file in wt-after (deleted afterwards). It reused the harness of
  `daemon/test/safety.test.ts` with a fake proto:2 extension that answers `evaluate` with `{code:"JS_DISABLED",
  message}`, and a raw client that claims a tab and calls `evaluate` on it. Result (1 passed):

  ```
  PROBE JS_DISABLED frame: {"id":"s2","error":{"code":"JS_DISABLED","message":"The user has turned JavaScript off …"}}
  PROBE old frame: {"id":"s3","error":{"code":"DISARMED","message":"old","data":{"scope":"evaluate"}}}
  PROBE status.safety: {"armed":true,"evaluate":false,"blockedCount":0}
  PROBE logs: ["extension resync: 2 tabs, 0 gone","safety state: armed=true evaluate=false blocked=0"]
  ```

  No `data` was added, nothing was logged about the refusal, and there was no `without code` line.
- `browser_status`'s Safety line (`mcp/src/tools/registry.ts:144`, `safetyStatusLine`) is untouched: the registry diff
  is comment-only. `daemon.status.safety` is unaffected (probe above), and `git diff 41e6f5d -- daemon/` is empty.

**Task 7: lane and scope.**
- All 13 changed files are in the lane: spec, `shared/src`, `extension/src/safety.ts`, `sdk/src`,
  `mcp/src/tools/registry.ts`, the four packages' `test/` directories, and `docs/setup.md`.
- `git diff 41e6f5d -- extension/src/safety-call.ts sdk/src/index.ts daemon/` is empty.
- In `safety.ts` the diff touches only the refusal builders, the `SafetyRefusal.code` union, the messages and the two
  `return` statements in the `!state.evaluate` branch. `METHOD_CLASSES`, `SCRIPT_SCHEMES` and the order of the checks
  are unchanged; M2/M3/M4 above show that the tests pin that order and that set.
- `JS_DISABLED_MESSAGE` contains no URL, pattern, title or id (s4-save-gate's message test, and the safety-gate
  message loop over every refusal).
- The `+` lines of the source diff contain no `console.` or `log(`. `log-scan` (16), `log-sentinel` (4),
  `safety-writers` (22) and `manifest` (4) all pass after the patch.
- The SDK's exported surface (8 values) is unchanged. The MCP tool names and schemas are unchanged (comment-only
  diff).

**Task 8: changed expected texts.** I checked every `-` line of `git diff -U0 -- '*/test/*'` that holds an
`expect`, a test name or the `expected()` helper against the builder's per-file list. All are listed and each carries
a dated #202 comment in place:

- `codes.test.ts`: 3, plus the list constant.
- `safety-gate.test.ts`: `expected()`, the matrix scope check, before-the-tab, asRef, navigate/newTab, the post-check,
  the #141 row, the two-scopes test (assertions added, none weakened) and `refusalError`.
- `safety-call.test.ts`: 2.
- `s4-save-gate.test.ts:105`: 1 (see F4).
- `sdk/test/safety.test.ts`: the "other codes" filter (+ `JS_DISABLED`).
- `mcp/test/safety.test.ts`: none.

Nothing is unlisted, and no assertion was weakened. Where a scope check was dropped, a stricter one replaced it:
`DISARMED` ⇒ `"all"` only, and `JS_DISABLED` ⇒ no `data`.

**Task 9: `docs/setup.md`.** A tsx script in wt-after loaded `JS_DISABLED_MESSAGE` and
`safetyRefusalLine("JS_DISABLED")` from the source and searched the whitespace-normalised `setup.md` for each:

- message in doc: true
- MCP line in doc: true
- the old line equals Step 9's text byte for byte: true
- `evaluateToFile` exists in `sdk/src/tab.ts`: true (setup.md names it)

The stale mentions outside § Safety are listed in F2.

**Task 10: recipes.**
- `recipes/test/s9-rules.test.ts` passes in both full runs.
- `EXPECT.disarmedEvaluate`, `EXPECT.mcpDisarmedEvaluate` and the judge's `DISARMED:evaluate` describe Run 13/14
  (§4.20). Leaving them as history is right: the rule that rows are never edited after their run binds them. Their
  test still passes because the alias and the F17 line are byte-identical.
- A Run 15 row can use `--expect code:JS_DISABLED` (`s9-rules.ts:165`, `:183`).
- `recipes/s9-r14.ps1` pins only `evaluate=true` state tuples, not the JavaScript-off text.
- The `tsconfig.s6.json` claim holds (F5).

**Task 11: the builder's Proposed decision 1** (an old extension's line keeps the `DISARMED:` prefix). **I agree.**
F17 says the SDK and MCP "*keep* rendering `DISARMED {scope:"evaluate"}` as the JavaScript-off line", which is Step 9's
existing line, `DISARMED: …`. The S4b.2 note's "still rendered … as the JavaScript-off line" is met, because the body
after the code is byte-identical to `JS_DISABLED`'s (asserted by `old.slice("DISARMED: ".length) ===
JS_LINE.slice("JS_DISABLED: ".length)` in both the SDK and MCP tests). The line also never names a code the error does
not carry. M8 shows the choice is pinned. Proposed decisions 2 (no `data`, Step 9's message unchanged) and 3 (the
alias export) are also sound. Decision 2 is contract-level, so the session agent should list it under Open decisions.

## Scratch artefacts (not committed)

All of these are in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\ece9d9b4-142e-4230-bd63-9478560e1fbf\scratchpad\`:
`s4b.patch`, `v-base.json`, `v-after.json`, `v-red.json`, `cmp.cjs`, `red.cjs`, `mut.cjs`, `mut.txt`, `mut2.txt`,
`probe-tail.ts`, `rtc-*.txt`.
