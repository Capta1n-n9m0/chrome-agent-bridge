# Step 12 S3a — verifier report, round 2 (re-check after two fix rounds)

Model / effort: Opus, medium. Commit: none (brief). Raw outputs: `S3a-verifier2-evidence.txt` (same dir).
Scope: the first verifier's F1, M-1, M-2, M-3, N1 and N3 (`S3a-verifier.md`), audited against `S3a-fixer.md` and
`S3a-fixer2.md`, plus an attack on the new code paths.

## 1. Verdict

**PASS-with-notes.** All six items are fixed, and each fix has a test that goes red on its mutant. C3.3 now passes.
C3.1, C3.2 and C3.4 still pass. All 11 mutants are red, and every file was restored byte-identical (checked by hash).
I found no new leak or fail-open path in `text`. Two new notes, one MINOR and one NIT, concern how far the source
filter reaches into page-supplied text. Neither breaks an exit check.

## 2. Outputs

**Checks** (all run by me on the main tree):
- `npx tsc --noEmit -p` on shared, daemon, sdk, mcp and extension: exit 0 for each.
- `npm run typecheck`: exit 0.
- `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: exit 0, all seven.
- `npm run build`: exit 0. `git status --short` before and after the build was identical: no tracked change.
- During my run, one untracked file appeared that is not S3a's: `S1-helpers-b-fixer.md`, from another lane.

**Test counts.** I made a fresh HEAD `8a3053b` worktree in my scratchpad (`npm ci`, no junction) and compared per-file
counts with `vitest --reporter=json` (evidence §2).
- HEAD: 4768 tests, 198 files. Now: 4856 tests, 204 files. No file lost a test.
- S3a's share is **+56**:
  - +13 in `safety-gate.test.ts` (396 → 409);
  - +3 in `sw-static.test.ts` (14 → 17);
  - +40 in the four new files: reduce 22, gate 11, method-tables 2, protocol 5.
  - That matches the first verifier's +48 plus the fixer's +8.
- The other +32 belong to the S1-helpers lane: `s11b-r17b-fix` +3, `s12-helpers-b` 14, `s12-helpers-b-fix` 15.
- HEAD itself had 9 failures in `recipes/test/s11-r16-runner.test.ts` in the worktree only (worktree environment, as
  verifier 1 saw). They pass in the main tree.
- **First full run:** 4855 of 4856 passed. The one failure was `recipes/test/s11b-servers.test.ts` ("s11b-flip.py
  answers 200 … then 302"), which is in recipes/test only and not S3a's.
- **Re-run once, as the brief says:** `Test Files 204 passed (204)`, `Tests 4856 passed (4856)`, exit 0. I record the
  first failure as a one-off flake in the other lane's fixture server.

**Mutants** (evidence §4). Before them I ran the 9 target files unmutated as a baseline: 497 of 497 passed. Each
mutant changed one file. The 9 files then ran with a 240 s timeout, and the file was restored from a copy and
compared by sha256. Afterwards, `sha256sum -c` over the five source files gave 5 OK.

| Mutant | Result: the test that went red |
|---|---|
| F1: the pre-fix `previewText` (an uncut `String(q.value)`) | red 1: "F1: an object whose preview holds an Error's stack" |
| M7: the handler's `isFileUrl` dropped | red 1: the gate's allowed case (`from-file` reaches the reply) |
| M9: `floor = 0` | red 2: the gate's allowed case (`from-before-arm`) and sw-static "the handler reads the floor" |
| M10: `onArm` without `consoleArmFloor.armed()` | red 1: sw-static "onArm moves the floor" |
| M10b: the `onChanged` floor line removed | red 1: sw-static "storage.onChanged moves the floor …" |
| M11: no `call` guard passed to `withDebugger` | red 1: M-3 "a state that refuses at the effect phase" |
| M12: the 10 s bound becomes 1e9 | red 1: M-3 "a Runtime.enable that never answers: TIMEOUT …" |
| Brief (1): strip before filter (URLs taken from the kept part, not the cut part) | red 2: reduce "a blocked stack URL…" and F1 |
| Brief (2): `consoleMessages: "tab"` | red 2: C3.2 JavaScript off, and C3.1 class `evaluate` |
| Brief (3): the daemon line removed | red 4: `methods.test`, `safety-surface`, and C3.1 ×2 |
| Brief (4): the `METHOD_CLASSES` line removed | red 15 (484 collected) |

No mutant hung or crashed a worker, so N3 holds under mutation too.

**Exit checks:**
- **C3.1, PASS.**
  - `consoleMessages` is in `safety.ts:95` (class `evaluate`) and in `daemon/src/methods.ts:33`.
  - `takesLock` (`methods.ts:84-88`) does not name it.
  - There are 28 router methods: `sw-static` and `safety-gate` assert 28.
  - Mutants (3) and (4) are red.
- **C3.2, PASS.** The gate tests are green, and mutant (2) is red on the `JS_DISABLED` case.
- **C3.3, PASS** (it was FAIL).
  - The F1 case is green.
  - My probe (evidence §5) finds no CDP-supplied URL or `at` line in `text` for: a V8-truncated preview, a nested
    `valuePreview`, Map `entries`, a cut stack marker, a CRLF/tab stack, and an allowed-host stack.
  - A CRLF stack with a blocked URL is dropped.
- **C3.4, PASS.**
  - No log call in `console-messages.ts` or `handlers/console.ts`, and none among the added `sw.ts` lines (grep).
  - `git diff HEAD -- extension/test/log-allowlist.ts` is empty.
  - The log-scan is green in the full run.

**Size, re-measured** with `wc -l` and `git diff HEAD --numstat`:
- Code: `console-messages.ts` 242, `handlers/console.ts` 43, `protocol.ts` +49, `sw.ts` +15, `safety.ts` +1 and
  `methods.ts` +1, so **351** (verifier 1 measured 320). That is under the 450 cap.
- Tests: the new files 282 + 169 + 27 + 37 = 515, and the count edits in existing files +32, so **547**.
- Total: **898**, over the 675 allowed by 1.5× the cap. Code alone is still under the cap. Handling it under §7 and #341
  is the step agent's call, as before.

## 3. Verifier verdict

Not applicable (this is the verifier's report).

## 4. Deviations

- My first mutant pass printed no test names: the `Tests` line carried ANSI codes, so my filter missed it. The pass
  still gave each mutant's exit code, all 1, and each restore was checked by hash. I ran a second, complete pass that
  records the failing test names from the JSON reporter. The table above is from the second pass; both are in the
  evidence.
- The HEAD worktree's `@bridge/*` links pointed only inside the worktree. I removed them with `cmd /c rmdir` before
  `git worktree remove --force`. Afterwards the main tree had 42 `node_modules/.bin` entries and all five
  `@bridge/*` packages, and the full re-run was green.
- I left no processes running. Every run was bounded by `timeout`. No Chrome, no port 9234.

## 5. Proposed decisions

None. The fixer's proposed entry (preview values are cut, and a source must be a real URL) matches what I verified.

## 6. Findings

**Re-checked items**

| Item | Status | Evidence |
|---|---|---|
| F1 (MAJOR) | **Fixed.** `console-messages.ts:145-153`: each preview property value goes through `cutStack(…, sources)`, so a cut URL becomes a source. | F1 mutant red. Probe: a blocked CRLF stack is dropped, an allowed stack gives `Object {e: Error: boom}`. |
| M-1 | **Fixed.** `:177-180` `isSourceUrl`; `:234` drops the entry when no source is a real URL. Every string still passes through `dropSource`. | Reduce case "M-1" green. |
| M-2 | **Fixed.** `onArm` moves the floor (`sw.ts:66-69`). `armedFromUnknown` (`console-messages.ts:114-118`) is applied in the existing `storage.onChanged` listener (`sw.ts:385-389`). | M9, M10 and M10b are red. Attack below. |
| M-3 | **Fixed.** Three gate cases: `file:`, the effect check, and the 10 s bound. | M7, M11 and M12 are red. |
| N1 | **Fixed.** The new wording is in the module header (`:12-14`), `protocol.ts:828-829` and the spec §10 note (`…design.md:857-859`). | Read. |
| N3 | **Fixed.** The cap test compares with `text === …`. | No worker crash under any mutant. |

**Attack on `armedFromUnknown` and the `sw.ts` wiring** (by reading `safety-state.ts:221-384`):
- **It cannot move the floor earlier.** `ArmFloor.armed()` only sets the floor to `now()`, so a floor can only move
  forward. Every extra call is fail-closed: it drops more.
- **It adds no listener and no top-level `await`.** The two new lines sit inside the existing top-level
  `storage.onChanged` listener and are synchronous. `safety.memory` is a plain getter.
- **A disarmed → armed change through `onChanged` moves the floor twice** (`onArm` inside `apply`, then the helper).
  That is harmless.
- **The other ways to arm from the unknown state are covered:**
  - The button's `toggleOnce` with `mem === null` first applies `"load"`, which lands disarmed. Its arm is then a
    disarmed → armed `"toggle"`, so `onArm` fires.
  - A `read()` that fills a null memory copy applies `"load"` without `onArm`. That is not an arm: the stored state
    was armed all along, and any change to it would have come through `onChanged`.
- I found no remaining path that replays a disarmed period.

**New notes**

**A · MINOR · `extension/src/console-messages.ts:134-141` (`cutStack`) — when V8 shortens a preview value and cuts
off the host, the nested Error's URL no longer matches the block list, so the entry is kept.**
- Probe case A: a preview value of `"Error: boom\n    at t (https://ads.bank.ex…"`, from an allowed frame and an
  allowed context, gives `["Object {e: Error: boom}"]`.
- `text` holds no URL, so C3.3 holds. But the cut URL `https://ads.bank.ex…` parses to a different host, so it does
  not count as blocked, and the error message of an Error created by a blocked script reaches the reply.
- That V8 shortens these values to about 100 characters comes from reading, not a measurement (the fixer's residual).
- The impact is bounded:
  - The entry's own frames and context still pass the filter.
  - The class is `evaluate`.
  - A nested Error's origin is arguably not the entry's source.
- *Fix (fail closed):* in `cutStack`, when the cut part ends in `…`, the abbreviation mark, push a sentinel source
  that `dropSource` refuses, or drop the entry. Add a reduce case. Alternatively, record it as a live row beside the
  first verifier's "an object holding an Error logs no `at` line".

**B · NIT · `console-messages.ts:150` and `:163` — two kinds of page-supplied text are neither cut nor counted as
sources: preview property names, and the message line of a description.**
- Probe case G: an object key that holds `"…\n    at (https://ads.bank.example/a.js)"` is passed whole. Case H: a
  stack that does not use V8's `at` form (for example, a page's own `Error.prepareStackTrace`) is passed whole.
- An Error message is also never scanned for URLs, and browser-generated messages can name one.
- Both fall under the reworded promise (N1: "text the page itself logs is passed as logged"), and the first
  verifier's scope did not include them.
- *Fix (optional):* add the URLs in any description's message line to the sources too, which only drops more. Or leave
  it as is and keep the wording.

**Live checks**, still open from verifier 1 §6 and the fixer §6:
- that the replay of `exceptionThrown` keeps its original `timestamp`;
- that an object holding an Error logs no `at` line;
- that a shortened preview value cuts the host (note A).

## 7. Handoff

- No PIDs left. The worktree `s3av2-head` is removed. The five source files' hashes match the start (evidence §1).
- For the step agent:
  - The verdict is PASS-with-notes, so the stage can go to its committer.
  - Note A is optional. If it is taken, it is a small fixer round on `cutStack`, and a fresh verifier re-checks only A.
  - The size overrun (898 lines, code 351) remains a §7/#341 matter.
