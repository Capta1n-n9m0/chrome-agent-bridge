# Step 12 S3a — fixer report, round 1 (console messages)

Model / effort: Opus, medium. Commit: none (brief). Scratch evidence (not in the repo): pre-fix and post-fix copies,
`mut.py` and its output `mutants.txt`, under the session scratchpad.

## 1. Verdict

**DONE.** F1, M-1, M-2 (both parts, inside `sw.ts` and the console module; `safety-state.ts` untouched), M-3, N1 and N3
are fixed, each with a test that is red on the pre-fix code or on the named mutant. N2 was skipped, as the brief says.

## 2. Outputs

**Per finding** (line numbers are the post-fix files):

- **F1 (MAJOR): fixed.** `extension/src/console-messages.ts:144-155`: `previewText(p, sources)` now passes each
  preview property's `value` through `cutStack`, so a stack in an Error-valued property is cut at its first `at` line,
  and the URLs that are cut become sources. The call site at `:165` passes `sources`.
  - New case in `extension/test/s12-console-reduce.test.ts`, "F1: an object whose preview holds an Error's stack":
    an object and an array whose preview holds a blocked stack URL are both **dropped**; an allowed one gives
    `Object {err: Error: boom}`, with no `https?:`, `at t` or `SECRET-TOK`.
  - Red before: on the pre-fix file, all three entries were kept with their stacks (`expected [ …(3) ] to deeply
    equal [ 'Object {err: Error: boom}' ]`). The mutant that puts back the uncut `String(q.value)` is red, 1 failed.
  - Previews have no `entries` rendering (Map and Set previews are not printed), so there was nothing to cut there.
- **M-1: fixed.** `console-messages.ts:177-180` adds `isSourceUrl`: a URL counts when `urlHost(u)` is non-null or
  its scheme is `file:`, `data:`, `blob:`, `about:`, `chrome-extension:` or `chrome:`. The filter is at `:231-234`:
  `if (sources.some(dropSource) || !sources.some(isSourceUrl)) continue;`.
  - Every collected string still meets the predicate, so a junk-looking `view-source:file:…` is still dropped by
    `isFileUrl`. A junk string just no longer counts as *the* one source. This is stricter than the verifier's
    "filter first" wording, which would have skipped the predicate for strings it ignores.
  - New case "M-1": `null`, `foo.js`, `<anonymous>` and `webpack-internal:///./a.js`, each with an unknown context,
    are dropped. `<anonymous>` with a known context origin is kept, and a `blob:https://…` source is kept.
  - Red before: on the pre-fix file all six were kept (`expected [ 'hello', 'hello', 'hello', …(3) ]`). The mutant
    that restores `sources.length === 0` is red.
- **M-2: fixed, both parts.**
  - The edge: `console-messages.ts:109-118` adds the pure `armedFromUnknown(prev, next)`, which is true when `next`
    is armed and `prev` is null, unreadable or disarmed. `extension/src/sw.ts:385-389` reads `safety.memory`
    before and after `safety.applyChanges(changes)`, and moves `consoleArmFloor` when that is true. This covers the
    null → armed case (a failed first load followed by an options-page arm), which `onArm` does not see. It needed no
    edit to `safety-state.ts`. Moving the floor twice on a disarmed → armed change only drops more.
  - New tests:
    - `s12-console-reduce.test.ts`, "armedFromUnknown" (7 assertions).
    - `extension/test/sw-static.test.ts`, three cases: `onArm` calls `consoleArmFloor.armed()`; the `storage.onChanged`
      wiring is in place; the handler reads `consoleArmFloor.floor` before `withDebugger(`.
    - `s12-console-gate.test.ts` now feeds an entry with `timestamp: 1` (`from-before-arm`), which the real handler
      must drop.
  - Red: M9 (`floor = 0`) gives 2 failed (the gate case and the static case). M10 (`onArm` without the floor) gives
    1 failed. M10b (the `onChanged` line removed) gives 1 failed. The pure helper's case failed on the pre-fix code
    (`armedFromUnknown is not a function`).
- **M-3: fixed.** New cases in `s12-console-gate.test.ts`, all through `GatedRouter` and the real handler:
  - M7: a `file:///C:/fixtures/a.js` stack frame (`from-file`) is dropped; the reply regex now also bars `file:`.
  - M11: a state that is armed at receipt and disarmed at the effect check gives `DISARMED`, with attach, detach and
    send all at 0.
  - M12: a `Runtime.enable` that never answers, under fake timers. Nothing settles at 9 999 ms. After 10 s the
    answer is `TIMEOUT`, with attach 1 and detach 1. The fake detach rejects the pending command, as Chrome does, and
    `consoleCollectors.size === 0` afterwards.
  - The first M12 version survived its mutant, because `runOnlyPendingTimersAsync` also fired a 1e9 ms timer. It
    now advances 50 ms instead, and the mutant is red.
  - Red: M7, M11 and M12 each give 1 failed.
- **N1: fixed.** The spec note in `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (§10, S3a's
  `consoleMessages` note, about line 857) and the header of `console-messages.ts` (lines 13-15) now read: "no
  CDP-supplied source URL or stack (a description or preview value is cut at its first stack line); text the page
  itself logs is passed as logged".
- **N3: fixed.** The cap test compares with `expect(text === …).toBe(true)`, so a regression fails without diffing
  a 1 MB string (`s12-console-reduce.test.ts`, in the "text is capped" case).

**Mutants.** `mut.py` applied each mutant to the main-tree file, ran the named test files with a 120 s timeout, and
restored the file from the post-fix copy. All 8 runs reported `restored True` (`filecmp`, byte-identical), and a
final `cmp` of the three source files against the post-fix copies was clean. All 8 mutants were red: M7, M9, M10,
M10b, M11, M12, F1-uncut and M-1. M12 was red on the second run, after the test change above.

**Checks** (all run after the last edit):
- `npx tsc --noEmit -p` on shared, daemon, sdk, mcp and extension: exit 0 for each. `npm run typecheck`: exit 0.
- `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: exit 0, all seven.
- `npx vitest run`: **4830 → 4838 tests**, 203 → 203 files, all passed, none removed. The new tests: reduce +3,
  gate +2, sw-static +3.
- `npm run build`: exit 0. `git status --short` before and after the build: identical.
- Log sites: +0. No log call was added. `git diff HEAD -- extension/test/log-allowlist.ts` is empty.

**Size** of this fix (new or changed lines, `diff` against the pre-fix copies and `wc -l`):
- Code: `console-messages.ts` +32 and `sw.ts` +5, so **37**. `handlers/console.ts` is unchanged.
- Tests: reduce 243 → 282 (+39), gate 126 → 169 (+43), sw-static +15, so **about 97**.
- Spec: +2 net.

**Exact file list** after this round. The files changed by this round are marked (fixed).
- `extension/src/console-messages.ts` (new; fixed)
- `extension/src/handlers/console.ts` (new; unchanged by this round)
- `extension/src/sw.ts` (fixed)
- `extension/src/safety.ts`
- `daemon/src/methods.ts`
- `shared/src/protocol.ts`
- `extension/test/s12-console-reduce.test.ts` (fixed)
- `extension/test/s12-console-gate.test.ts` (fixed)
- `extension/test/sw-static.test.ts` (fixed)
- `extension/test/s12-method-tables.test.ts`
- `shared/test/protocol-step12-console.test.ts`
- the builder's count edits in `extension/test/{gated-router,safety-gate,s3a-dnr-wiring}.test.ts`,
  `daemon/test/{methods,safety-surface}.test.ts`
- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (fixed: the N1 sentence)

## 4. Deviations

- **N1 is fixed only partly, because of the lane.** `shared/src/protocol.ts:828` keeps the comment "Entries carry no
  source URL and no stack". It is outside this fixer's lane, so I did not touch it. A one-line wording fix remains
  for the step agent.
- **M-1's shape.** It is slightly stricter than the verifier suggested: the predicate still sees every string (see
  above).

## 5. Proposed decisions

### 2026-10-27 · S3a: a preview value is cut like a description, and a console source must be a real URL
**Decided:** each preview property value goes through `cutStack`, and its cut URLs become sources. An entry is kept
only when no collected string meets the drop predicate and at least one is a URL with a host or a known scheme.
**Why:** F1 and M-1. **Instead of:** dropping preview text, or ignoring non-URL strings before the predicate.
**Revisit if:** a live row shows a legitimate source with another scheme being dropped. **By:** Claude (proposed,
safety)

## 6. Findings

- **A residual, by reading only:** V8 abbreviates preview values (to about 100 characters), so a stack URL in a
  preview can arrive cut short (`https://ads.bank.ex…`). The cut text is still stripped from `text`. But the shortened
  host may not match the block list, so the entry can be kept, with no URL in it. This is unmeasured. It is worth a
  live row beside the verifier's "an object holding an Error logs no `at` line".
- The verifier's two live checks (§6) still stand.

## 7. Handoff

- No processes are left: every vitest run was foreground, with a timeout, and finished. No Chrome, no port 9234.
- Nothing is committed. A fresh verifier should re-check F1, M-1, M-2 (M9, M10, M10b), M-3 (M7, M11, M12), N1 and N3,
  and the count, 4838.
