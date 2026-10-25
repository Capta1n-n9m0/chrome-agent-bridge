# Step 11 · S1 — verifier report (Step 10's ordered follow-ups)

Model: Claude Opus 5.5. Date: 2026-10-25. Audits commit `eefb4d8` (parent `f1d6e2f`). Read: phase doc 0.14 (a)–(b)
with its correction, § Stage S1, § Exit checks (every stage, R.1, R.2), § As built Stage 0; decisions.md #244, #246;
`stage0-audit.md` F2; decisions-archive/step10.md #207, #214, #218, #227; `extension/`, `extension/src/evaluate/`,
`mcp/` `CLAUDE.md` files; `S1-builder.md` (as claims). Run 15's records not read.

## 1. Verdict

**PASS-with-notes.** No CRITICAL or MAJOR finding; every exit check met. Four MINOR, two NIT (§6).

## 2. Exit checks, re-run

The scratch copy was `git worktree add --detach <scratchpad>/wt-s1 eefb4d8` with its own `npm ci`, so it had no
junction into the main tree. Its only links were npm's workspace junctions `node_modules/@bridge/{daemon,extension,mcp}`,
which point into the worktree itself. They were removed with `cmd /c rmdir` before the directory was deleted, then
`git worktree prune` ran. The main tree's `node_modules/.bin` held 42 entries before and after.

| Check | Command | Result |
|---|---|---|
| Tests before | `npx vitest run` at `f1d6e2f` | `Test Files 132 passed (132)`, `Tests 3273 passed (3273)` |
| Tests after | `npx vitest run` at `eefb4d8` | `Test Files 133 passed (133)`, `Tests 3294 passed (3294)`: +21, all in the new `extension/test/s1-own-refusals.test.ts`. `s2-focus-first.test.ts` had one `it` edited and none added, so no test was removed |
| Typecheck | `npm run typecheck` at `eefb4d8` | exit 0 |
| Build | `npm run build` at `eefb4d8` | exit 0 |
| Tree after build | `git status --short` in the worktree | empty. In the main tree, only the pre-existing `M …-steps/journal.md` (not the builder's) |
| #246 byte-identical | `git diff --stat f1d6e2f eefb4d8 -- extension/test/debugger-errors.test.ts recipes/test/s10-rules.test.ts mcp/test/fixtures` | empty (exit 0) |
| Pinned source line | `git show <rev>:extension/src/debugger-errors.ts \| grep -nF 'return { code: "DEBUGGER_ATTACH", message: \`[chrome.debugger] ${raw}\` };'` | present at both revisions, unchanged: line 58 at `f1d6e2f`, line 68 at `eefb4d8` (moved down, not edited; `s10-rules.test.ts:1276` pins it by `toContain`) |
| `eac8324` ≡ `f1d6e2f` for S1 | `git diff --stat eac8324 f1d6e2f -- extension/src mcp/src mcp/test extension/test` | only three sub-package `CLAUDE.md` files differ, so "fails at `eac8324`" and "fails at `f1d6e2f`" are the same check |

**The new tests fail on the old code.** In the worktree, `git checkout f1d6e2f -- extension/src/debugger-errors.ts
extension/src/evaluate/save.ts mcp/src/tools/registry.ts` restored the three source files, and the run was
`npx vitest run extension/test/s1-own-refusals.test.ts mcp/test/s2-focus-first.test.ts`. Result:
`Tests 16 failed | 49 passed (65)`.
- 11 value-refusal and cap tests fail on the prefix itself, for example
  `+ "message": "[chrome.debugger] The value is undefined — nothing to save"`.
- 4 marker tests fail with `TypeError: markOwnRefusal is not a function`.
- The schema test fails on `browser_evaluate`.
- The 6 "keeps the prefix" tests pass on the old code too. They are regression guards for behaviour that must not
  change.

This matches the builder's claim (16 failed, 65 run).

Extra discrimination, beyond the brief:
- **Only `save.ts` reverted** (the new `debugger-errors.ts` kept): `Tests 11 failed | 10 passed (21)`. The marking at
  the throw sites is load-bearing.
- **#244's original rule as a mutant.** I replaced `if (own && ownRefusals.has(err as object))` with `if (own)` and
  ran `s1-own-refusals.test.ts` and `debugger-errors.test.ts`: `Tests 7 failed | 32 passed (39)`. The failures are
  the page error, the rejected promise, `raceTimeout`'s `TIMEOUT`, the `INTERNAL` holder case, the twin case, the
  unmarked `PAGE_ERROR`/`TIMEOUT`, and `debugger-errors.test.ts`'s "our own BridgeError keeps its code and data; the
  message is today's string". The suite therefore catches exactly F2's danger.

**R.1 is met.**
- A marked own `BridgeError` reaches the wire unchanged. This was traced through the shipped chain `evaluateToSave` →
  `withDebugger` → `runWithDebugger` → `debuggerError` → `toWireError`, over the fake CDP.
- A raw Chrome error, a page error and `TIMEOUT` keep the prefix (tests).
- EVAL-5's expected text (`docs/e2e-test-plan.md:1670`) is untouched, and so is the unmarked `pageError` path.

**R.2 code part is met.**
- `git show eefb4d8 -- mcp/src/tools/registry.ts` changes one string: `saveTo`'s description.
- The test keeps the f45e3bf fixture and S4's constant, replaces only `saveTo.description` in `browser_evaluate`'s
  entry, and carries the dated note "Re-baselined 2026-10-25 (Step 11 S1; …)". Every other tool is still compared by
  deep-equality.
- The described `kind` matches the answer line `${r.bytes} bytes · ${r.kind} · sha256` (`registry.ts:801`).

## 3. Spec attack

- **Is the marked set the right set?** #246 says "the `saveTo` refusals, including the `PAGE_ERROR` of the stringify
  refusal". #218 (4) lists the value refusals and #218 (3) the cap; SAVE-REFUSE's row (undefined, node, Map, cycle)
  is a subset. Marked: every `refusal()` (seven texts plus the "not saveable" fallback, `save.ts:128-131`) and
  `tooLargeError` at its two throw sites inside the session (`save.ts:151`, `:223`). The store's and the handler's
  `tooLargeError` (`evaluate-save-store.ts` `put`, `handlers/evaluate-save.ts`) run after `withDebugger` returns and
  were already unprefixed. Marking the in-session cap therefore makes the cap read the same on every path. I agree
  with the builder's split.
- **What stays prefixed in the save leg.** The three `INTERNAL` texts of `collectSaveText` (holder lost, holder
  unreadable, slice unreadable) stay prefixed, as does the transfer `TIMEOUT` (`raceTimeout`'s, so #246 covers it).
  These are failures, not refusals made on purpose. That is the conservative reading. The builder lists it as a
  proposed decision for the user, which is right because a wire message is at stake.
- **Can the marker leak?**
  - It is a module-private `WeakSet`; each throw site builds a new error, so no marked object is shared.
  - `describeDebuggerError` is the only reader, and only for an own coded `BridgeError` (a marked plain `Error` is
    ignored; tested).
  - `debuggerError` wraps the result in a new, unmarked `BridgeError`, so the marker never travels further.
  - A disarm still wins: `runWithDebugger` checks `s.killed` before `mapError` (`safety-debugger.ts`).
  - `isExecutionTerminated` cannot match the fixed refusal texts.
  - The marked messages are fixed constants and carry no value text, so the security boundary and the log scan are
    unaffected (no log call was added).
- **Does anything else rely on the old prefix?** Searched for `chrome.debugger] ` across the code, tests, recipes and
  docs:
  - Product and tests: `fe-actions.test.ts:355` (a raw Chrome error, unchanged) and `s10-rules.test.ts:1270-1276`
    (SAVE-REFUSE's dated note and the pinned line, both unchanged).
  - E2E text: EVAL-5, DL-2 and BG-3 are page errors and keep the prefix. SAVE-REFUSE's Run 15 note stays as recorded,
    as it must.
  - Stale prose: three places, MINOR 1 below.

## 4. Deviations

None from my brief. I did not use the main tree for builds or test runs; everything ran in the scratch worktree.

## 5. Proposed decisions

None of my own. The builder's three proposals hold under the checks above: the `WeakSet` marker; marking only the
value refusals and the cap, which is for user review; and the `kind` wording.

## 6. Findings

**MINOR 1: docs now contradict the code, and no stage is named to fix them.** Each of these says `saveTo` refusals
reach the wire prefixed:
- `extension/CLAUDE.md:107-110` (the `saveTo` store bullet).
- `docs/setup.md:600-602`: "a refusal's message then read `[chrome.debugger] …` in front of the text".
- The phase doc's 0.5 note, lines 172-174, which also says "after S1 the bridge's own coded refusals keep their
  message unprefixed **wherever they are thrown**". That is the code-based wording #246 replaced.

Evidence: the grep above and `s1-own-refusals.test.ts`. The builder flags only the `CLAUDE.md` line. *Fix:* the
session agent amends the `CLAUDE.md` bullet and adds a dated note to 0.5. S6's checklist should name the
`setup.md:600-602` sentence (as of Step 11, with SAVE-REFUSE-R's evidence).

**MINOR 2: forward risk for S3, because the marker is opt-in.** Phase doc 0.7 (`:202-209`) runs the upload finder
"inside one debugger session" and answers zero matches with `REF_STALE` and two with `INTERNAL`. Thrown inside
`withDebugger` and not marked, these reach the wire as `[chrome.debugger] …`. 0.5's note promises the opposite.
*Fix:* S3's brief states which of its in-session errors are deliberate refusals that call `markOwnRefusal`. Under
#246, `REF_STALE` (and `UPLOAD_REFUSED`, if any is raised in-session) would be marked and `INTERNAL` left prefixed.
S3's tests should pin the wire text through `withDebugger`, as `s1-own-refusals.test.ts` does.

**MINOR 3: the builder's report understates the lane.** The phase doc's lane is "`extension/src/debugger-errors.ts`
(and a caller only if the test shows it must)". The builder also edited `extension/src/evaluate/save.ts` (13 lines:
an import and the marks), yet `S1-builder.md` §4 says "None from the lane". The edit is required: #246 puts the
marker where the refusal is created, and only `save.ts` creates it. Reverting just `save.ts` turns 11 tests red. It
should have been declared as the lane's exception. *Fix:* none to the code; the step agent notes it when accepting.

**MINOR 4: another own refusal inside `withDebugger` still carries the prefix.** `keys.ts:40` throws a plain `Error`
(`unsupported key "…"`) inside `runTrustedInput`'s session. `debugger.ts:73-75` says it "keeps today's mapping", so it
reaches the wire as `DEBUGGER_ATTACH [chrome.debugger] unsupported key …` (FE-builder.md:145). This is outside #246's
scope, which names only `saveTo`. It is exactly what #227's Revisit-if names: "another own refusal inside
`withDebugger`". *Fix:* record it, and leave it for a later ruling. No change in S1.

**NIT 5: the cap test is weaker than its neighbours.** `s1-own-refusals.test.ts:100-113` calls `describeDebuggerError`
directly instead of going through the `withDebugger` chain like the other refusals. With `maxUnits: 10` the text reads
"over the 0 MiB limit", a test artefact. It still discriminates (it was red at `f1d6e2f`). *Fix (optional):* route it
through `wireOf` with a larger fake value, or accept as is.

**NIT 6: a line reference went stale.** The pinned fallback line moved from `debugger-errors.ts:58` to `:68`. The
Step 11 docs cite `:58` (`stage0-audit.md:71`, `S7-prep-verifier.md:562`; these are historical records and stay). The
pin itself uses `toContain`, so nothing breaks. Later citations should use `:68`.

No new runtime fact. All of the above is by unit test and reading; the live check is S5's SAVE-REFUSE-R.

## 7. Handoff

No processes started or left running. The scratch worktree is removed and `git worktree list` shows only the main
tree. Raw logs of the runs were in the scratchpad and are not part of the repo. A loaded extension needs
`recipes/reload-extension.ps1` before S5, because `dist/` changed.
