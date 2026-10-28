# Step 12 S5a — the native file chooser, the extension side: verifier report (re-check after fix round 1)

Model / effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6). Date: 2026-10-28. Scope: the first verifier's
V1, V2, V3 and V8 (`S5a-verifier.md` §6) as fixed in the uncommitted tree, and everything the fix touched. Claims audited:
`S5a-fixer.md`. Layer followed: the phase doc (0.7, § S5, E5.1–E5.3, § STOP rules) and the spec §10 S5a note. Nothing
ran against Chrome; port 9234 was not touched.

## 1. Verdict

**PASS-with-notes.** V1, V2, V3 and V8 are closed. Every exit check I re-ran holds. Two NITs remain (§6). Neither one
is a safety exposure.

## 2. What I checked, with the evidence

**V2: the gate re-check after the event** (`extension/src/upload-files.ts:394-395`, `:442-449`;
`extension/src/handlers/upload.ts:206`)
- **Where it runs:** `await deps.effect?.()` runs after the no-event `TIMEOUT` (`:441`). It runs before the
  `backendNodeId` and `mode` checks, `DOM.describeNode` and `DOM.setFileInputFiles` (`:450-458`).
- **The off step still runs:** the refusal is thrown inside the `try`, so the `finally` (`:460-473`) still sends the
  interception off and `Page.disable`.
- **The wiring:** `chooseByMark` passes `effect: call && (() => call.effect())`.

**The `markOwnRefusal` rethrow** (`:445-449`)
- **Same object, no new text:** `markOwnRefusal` (`debugger-errors.ts:79-82`) adds the same object to a WeakSet and
  returns it. No new text and no path.
- **What passes unchanged:** `describeDebuggerError` (`:26-31`) passes the code, message and data through unchanged
  only for a `BridgeError` in that set. `debuggerError` (`debugger.ts:91-94`) rebuilds a `BridgeError` from exactly
  those three.
- **Other errors:** a marked plain `Error` still takes the prefixed path. So the rethrow cannot launder a non-gate
  failure into an unprefixed answer.
- **The test checks it:** the V2 row asserts the wire answer by `toEqual` (`{DISARMED, DISARMED_ALL.message,
  {scope:"all"}}`, and `{DOMAIN_BLOCKED, "blocked"}`). A prefix would fail it, and the `noMark` mutant below does.

**The edited success row** (`s5a-chooser.test.ts:458`)
- **The edit:** only `"effect"` is spliced in before `DOM.describeNode`. That is the V2 change itself.
- **It still checks the steps:** the `noEffect` and `noWire` mutants turn this row red, so it is still a full-order
  check.
- **Not a tracked test:** the file is untracked S5a work. `git diff HEAD --stat -- extension/test shared/test sdk mcp
  daemon recipes` is empty.

**V8**
- **The new row** (`s5a-chooser.test.ts:628-639`): `chooser: true` with `[OUTSIDE]` and with `[P1, OUTSIDE]` runs
  through `GatedRouter` with JavaScript on. It answers `UPLOAD_REFUSED`, with 0 CDP commands, 0 `executeScript` calls
  and an empty log.
- **Its control:** the row at `:641-651` (JavaScript on, `chooser: true`, a path inside the folders) answers
  `{files: 1}`. So the new row discriminates.

**The spec §10 note (V1, V3)**
- **V3:** the transient-activation sentence is now "**by construction, unmeasured**: no Stage 0 row has a late opener
  and no source is cited". It names the late-opener row (about 4.9 s and about 5.1 s) and its pass rule.
- **V1:** the new "limit" bullet is marked "by construction, unmeasured" and says behaviour is unchanged.
- **Nothing presented as measured:** the note presents nothing as measured that was not. Its V2 step-list sentence
  describes the design and makes no claim of a measurement or a timing.

**Mutants** (in a scratch worktree with `npm ci`, each restored by copying from the main tree; `cmp` equal afterwards).
Each was run over `s5a-chooser*`, `protocol-s5a` and `upload*` tests (173 tests).

| Mutant | Result |
|---|---|
| `noEffect`: the `await deps.effect?.()` line removed | 3 failed (both V2 rows, the success row) |
| `noMark`: the rethrow without `markOwnRefusal` | 2 failed (both V2 rows: a prefixed message) |
| `noWire`: `chooseByMark` passes `effect: undefined` | 3 failed (both V2 rows, the success row) |
| E5.1: interception off only after a success | 19 failed (every E5.1 error row, the keeper rows, the input rules, the handler's refusal, disarm and V2 rows) |
| V8: the gate skips the folder rule when `chooser === true` (`safety.ts:348`) | 2 failed (E5.2's gate row, the V8 row) |

**The input path, byte for byte**
- **`upload-files.ts`:** `git diff HEAD -- extension/src/upload-files.ts` has no removed line. One hunk,
  `@@ -221,0 +222,253 @@`, adds code only.
- **`handlers/upload.ts`:** the no-chooser path is unchanged except for round 0's `uploadPrologue` extraction, which
  the first verifier accepted, and the one `if (p.chooser === true)` branch.
- **Existing tests:** no tracked test was edited.

**Counts and builds**

| Check | Result |
|---|---|
| `npx vitest run`, main tree | **5075 passed, 214 files**. The S5a files went from 44 tests (41 + 2 + 1, first verifier's evidence) to 47 (43 + 3 + 1): +3 against 5072, none removed. |
| The same run in the scratch worktree | 9 failures, all in `recipes/test/s11-r16-runner.test.ts`: the worktree checks out `s11-r16.ps1` with CRLF (`file`: "with CRLF line terminators"; the main tree's copy is LF), so `fnText`'s `\n}\n` regex finds nothing. A worktree artefact, the same one the first verifier saw. |
| `npm run typecheck` | exit 0 (main tree and worktree) |
| All seven `recipes/tsconfig*.json` | exit 0 (fe, json, s6, s9, s10, s11, s11b) |
| `npm run build`, main tree | exit 0. `git status --short` was identical before and after. |
| Log sites | +0 `console.` lines in the diff over `extension/src` and `shared/src`. `log-allowlist.ts` is unchanged and has 54 entries. `log-scan.test.ts`: 16 passed. |
| Size: code | 253 + 105 + 5 + 7 = **370 added** (11 removed) / 550 |
| Size: tests | 651 + 111 + 21 = **783** / 825 |

## 6. Findings

**N1 · NIT · spec §10 S5a note, the "limit" bullet — V1's live row is not named in the note.**
- **What is missing:** V3's sentence names its late-opener row and its pass rule, but V1's limit names no row. That
  row is a human-style click during the wait, on a front tab, and a record of which input got the files.
- **Where it is now:** the fixer's handoff carries it to §4.27.
- **Fix:** when S5's rows are written, add that row next to the late-opener row. Optionally, name it in the bullet
  too.

**N2 · NIT · `upload-files.ts:440-449` — a disarm during the wait still answers at 5 s, and the note doesn't say so.**
- **Why the re-check doesn't help:** the new re-check catches a disarm only when the event still arrives. After
  `detachAll`, no event comes. The waiter then times out at 5 s, and the keeper answers `DISARMED` from
  `record.killed` (`debugger-keeper.ts:164`).
- **What happens:** this fails closed. No files are set, and the off step is attempted.
- **What is open:** the fixer recorded it as out of lane (the keeper). The note's sentence ("a disarm … that landed
  during the wait, ends the chooser … with no `DOM.setFileInputFiles`") is true, but it does not mention the late
  answer.
- **Fix:** none in this slice. Carry it, with V2's optional part, to the slice that holds the keeper. Mention it in
  setup's chooser line (S5b) alongside V9.

## 5. Proposed decisions

None of my own. The fixer's decision (the after-event gate refusal passes through unprefixed) is consistent with the
keeper's own pre-use re-check and with `describeDebuggerError`'s rule. I'd accept it.

## 7. Handoff

- Nothing is running.
- **The scratch worktree is removed.** Its `@bridge` links pointed inside the worktree and were deleted first with
  `cmd /c rmdir`. `git worktree list` shows main only, and the main tree's `node_modules/.bin` still has 42 entries.
- **The main tree is as I found it.** Only `dist/` was rebuilt, which git ignores. I wrote only this report.
- **For the step agent:** S5a can go to the committer, with N1 and N2 carried to S5's rows and to S5b respectively.
