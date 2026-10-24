# Stage S1 — builder report (content-script `locate`)

Builder, Opus 5.5, 2026-10-23. Base HEAD `dcb72db`. Nothing committed. Stage FE was working in the same
tree in parallel. I did not touch its files: `extension/src/debugger.ts`, `extension/src/handlers/actions.ts`,
`extension/src/trusted-input.ts`, `extension/test/fe-*.ts`, `extension/test/trusted-input.test.ts`.

## Files

| Path | | What |
|---|---|---|
| `extension/src/content/a11y.ts` | new | Moved unchanged from `snapshot.ts`: `MAX_NAME`, `ARIA_ROLES`, `RULES`, `roleOf`, `hidesSubtree`, `hasLayout`, `isZeroSize`, `cap`, `trim`, `accessibleName`, `frameDocument`. New: `listableRoles()`, `skippedAsZeroSize(el, layoutMemo)` (the snapshot's per-document memo of the layout gate), and `walkElements(doc, ctx, visitor)`, the one walk order both callers use. That order is: prune at `hidesSubtree`, visit the element, then its open shadow children, then the same-origin frame body (with an `enterFrame` hook), then its light children. Optional `stop` (the 800 cap) and `hides` (a memoised `hidesSubtree`, never a different rule). |
| `extension/src/content/snapshot.ts` | changed | Imports from `a11y.ts`. `buildSnapshot` now runs `walkElements`, with `stop` = the cap, `enter` = the old role/zero-size/push/depth logic, and `enterFrame` = `++frames`. Field extraction is untouched. It is still exported, and it still resets the RefMap as before. |
| `extension/src/content/locate.ts` | new | `locate(doc, refs, locator: unknown): LocateResult`, plus in-page validation (`BAD_PARAMS`). |
| `extension/src/content/nearest.ts` | new | Pure: `levenshtein`, `similarity`, `nearest(needle, items, key, limit=5)`. |
| `extension/src/content/marked.ts` | new | `MARK_ATTR = "data-__bridge-mark"`, `refOfMarked(doc, refs, mark)`. |
| `extension/src/content/guard.ts` | changed | `BridgeErrorMarker.__bridgeData?`, `codedError(code, msg, data?)`. `toMarker` adds `__bridgeData` (a JSON copy) only for plain-JSON object/array data (#82). |
| `extension/src/content/index.ts` | changed | Adds guarded `locate(locator)` and `refOfMarked(mark)`, plus their `declare global` entries. No other member changed. |
| `extension/src/inject.ts` | changed | `unwrapResult` passes `__bridgeData` as `new BridgeError(code, message, data)` when it is present. Otherwise unchanged. |
| `extension/test/snapshot-fixtures.ts` | new | 46 fixtures: every body in `snapshot.test.ts`, the layout-stub cases (on and off), shadow, iframe, cross-origin, a 900-element cap case and an 850 nested past-the-cap case, two extra name/prune cases, and `e2e-playground.html`'s body. The playground comes twice: static, and with the script's shadow roots and iframe copied literally. |
| `extension/test/snapshot-capture.test.ts` | new | Compares every fixture's `{name, elements, truncated}` with the JSON (`toEqual`). `BRIDGE_CAPTURE=1` rewrites the JSON instead. |
| `extension/test/fixtures/snapshot-pre-s1.json` | new | The pre-S1 capture. |
| `extension/test/locate.test.ts` | new | 41 tests. |
| `extension/test/nearest.test.ts` | new | 9 tests. |
| `extension/test/marked.test.ts` | new | 9 tests. |
| `extension/test/content-guard.test.ts` | changed (added only) | +9 tests: data on the marker (D10), and guarded `locate`/`refOfMarked` (D11). |
| `extension/test/inject.test.ts` | changed (added only) | +2 tests: `__bridgeData` becomes `data`. |

`extension/build.mjs` is unchanged; the IIFE build picks up the new files through imports.
`extension/test/snapshot.test.ts` is byte-unchanged (`git diff --quiet dcb72db -- extension/test/snapshot.test.ts` → exit 0).

## The pre-S1 capture (D1)

- sha256 `d859e988fe3de560ab52d428cc45be2a0b71597385f0142914b51388b14d105e`, 386 793 bytes, LF line
  endings (written by `writeFileSync`).
- How it was generated: `BRIDGE_CAPTURE=1 npx vitest run extension/test/snapshot-capture.test.ts`, run
  right after `git diff --quiet dcb72db -- extension/src/content/` returned exit 0. At that moment no
  file under `extension/src/content/` differed from `dcb72db`, so `snapshot.ts` and `refmap.ts` were
  the `dcb72db` code. The generator uses only `buildSnapshot`, `RefMap` and DOM APIs. It has no Date
  and no random, and `url` is excluded.
- The 46 fixtures cover 0 to 800 elements, with `truncated: true` on "cap: 900 buttons", "cap: 800
  buttons" and "cap: 850 mixed, nested past the cap".
- Mutation check: I dropped the `opacity === "0"` clause from `hidesSubtree` and the capture test
  failed (1 failed). With the clause restored it passed.
- Note for the verifier: `core.autocrlf` may check the JSON out as CRLF in a worktree. Before comparing
  bytes with a regenerated copy, normalise the line endings, or compare the regenerated file with
  `git show <commit>:extension/test/fixtures/snapshot-pre-s1.json`.

## Results

`npx vitest run extension/test/`:
```
Test Files  24 passed (24)
     Tests  460 passed (460)
```
Per-file counts:
- Mine: snapshot-capture 2, locate 41, nearest 9, marked 9. content-guard went from 10 to 19 and
  inject from 15 to 17. That is 72 new tests.
- FE's (passing, not mine): `trusted-input.test.ts` 12, `fe-actions.test.ts` 38.
- So the extension had 338 tests before S1, and 410 now without FE's files.
- `snapshot.test.ts`: 39 passed, unchanged.

`npx vitest run sdk/test/format-baseline.test.ts sdk/test/format-snapshot.test.ts` (both import
`buildSnapshot`): 61 passed.

`npm run typecheck` exited 0, all five packages, with FE's edits in the tree.

S1.4:
```
$ grep -rn "reset" extension/src/content/locate.ts; echo "exit $?"
exit 1
$ grep -rn buildSnapshot extension/src/content/locate.ts; echo "exit $?"
exit 1
```
Both had empty stdout. `grep -rnE "console\." locate.ts marked.ts nearest.ts a11y.ts` also printed
nothing and exited 1.

S1.5, from a scratch build (`cd extension && npx esbuild src/content/index.ts --bundle --format=iife
--target=chrome116 --outfile=<scratchpad>/S1/content.js`):
```
grep -cE "^(import|export)\b" content.js → 0 (exit 1)
grep -c "__agentBridge" content.js       → 2
grep -c "locate\|refOfMarked" content.js → 5
```
The bundle starts with `"use strict";\n(() => {`. I did not run `npm run build` in the main tree.

## S1.3 item → test

Tests are in `extension/test/locate.test.ts` unless another file is named.

| S1.3 item | Test |
|---|---|
| role+name substring | "S1.3 role+name substring: case-insensitive substring of the snapshot's name" |
| `exact` | "S1.3 exact: case-sensitive equality with the name" (and "matches the 120-character capped name, the one the snapshot shows") |
| `{regex}` | "S1.3 {regex}: tested against the name, with flags", and "S1.3 {regex}: a g or y flag is not stateful across elements or calls" |
| `nth` | "S1.3 nth: picks the nth match in walk order; nth ≥ count is LOCATOR_NOT_FOUND saying how many", and "nth applies to text and css too" |
| ambiguity → `LOCATOR_AMBIGUOUS {matches}` | "S1.3 ambiguity → LOCATOR_AMBIGUOUS with matches [{ref, name}] in walk order", and "matches are capped at 20 in data, the message states the total" |
| not-found → `LOCATOR_NOT_FOUND`, ≤ 5 ranked candidates | "S1.3 not-found → LOCATOR_NOT_FOUND with up to 5 ranked same-role candidates" (plus regex-source ranking, an empty role, `{text}`/`{css}` candidates). Ranking itself is in `nearest.test.ts`. |
| `{text}` over visible text | "S1.3 {text} over visible text: a role-less element matches", and "S1.3 {text}: text spanning child elements counts, the innermost element wins" (plus hidden child, hidden subtree, exact text, shadow host, walk order) |
| `{css}` mints a ref for a non-interactive element | "S1.3 {css} mints a ref for a non-interactive element, after a snapshot, without collision" |
| open shadow root | "S1.3 open shadow root: role, text and css reach into it; a closed root is not entered" |
| same-origin frame | "S1.3 same-origin frame: role, text and css reach into it; a cross-origin frame is skipped" |
| refs from a prior snapshot survive `locate` | "S1.3 refs from a prior snapshot survive locate calls (and no variant calls reset)". It spies on `RefMap.prototype.reset` across the success and failure variants, BAD_PARAMS included. |

Other required cases:

| Case | Test |
|---|---|
| D9 cross-check | "D9 invariant: locate {role, nth} walks exactly what the snapshot lists", run on 6 fixtures: open shadow, shadow depth, one iframe, two iframes, the static playground, and the playground with its script DOM. |
| Zero-size gate | "skips a zero-size candidate under layout for every variant, keeps it without layout", and "a zero-size wrapper's laid-out child still matches…" |
| BAD_PARAMS | "rejects every malformed locator with BAD_PARAMS" (22 shapes) |
| 800 cap not applied | "the search is not capped at the snapshot's 800 elements" |
| D10 | `content-guard.test.ts` "content guard carries data (#82, S1 D10)" (7 tests), and `inject.test.ts` "unwrapResult — data beside the marker" (2 tests) |
| D11 | `content-guard.test.ts` "window.__agentBridge.locate / refOfMarked (S1 D11)" (2 tests) |
| D8 | `marked.test.ts` (9 tests) |

## Deviations from the brief (with reasons)

1. **TDD order for `locate.test.ts`.** I wrote the whole file before `locate.ts` existed, but I did not
   run it in that state; it would have failed on import. The `nearest`, `marked`, guard/inject (6
   failing) and index (2 failing) tests were run red first. One locate test was wrong and I fixed it
   after it ran: `exact: true` with `"visible"` against the text "Visible". The test, not the code, was
   wrong under D4's case-sensitive `exact`.
2. **`walkElements` has an optional `hides` hook.** `{text}` passes a memoised `hidesSubtree`, which
   its visible-text computation shares, so each element's style is read once. The rule itself is the
   same function.
3. **`nth` ≥ count with some matches.** `data.candidates` holds the first ≤ 5 matches (`{ref, role,
   name}`) rather than `[]`. D6 left this data unstated, and the matches are the useful hint.
4. **`{text}` candidates.** They are ranked by the element's own direct text (normalised). D7 says "an
   element owning a non-empty direct visible text node … ranked by their normalised text". I read that
   as the own text, so a wrapper's whole subtree text does not dominate the ranking. The displayed
   `name` is `accessibleName(el)`, as in D6.
5. **`nearest` compares at most 120 characters of each string,** so a huge text cannot stall the
   ranking. Measured in jsdom: 5 000 strings took 66 ms.
6. **Unknown keys are refused.** In-page validation refuses unknown keys and kind-foreign keys (`exact`
   on css, `name` on text), as `isLocator` does. A `null` field counts as absent, because
   `toSerializableArgs` turns a top-level `undefined` into `null`. A whitespace-only or empty `role`,
   `text`, `css` or `name` gets `BAD_PARAMS`, per D3.
7. **`exact` is ignored when `name` is `{regex}`.** The pattern decides.

## Proposed decisions

- **2026-10-23 · One walk function serves both the snapshot and `locate`.**
  Decided: `a11y.ts` exports `walkElements`, which holds the walk order, the prune, and the
  shadow-then-frame-then-light sequence. `buildSnapshot` and every `locate` variant run it.
  Why: it means the walk order cannot drift between the two. The pre-S1 capture passes unchanged.
  Instead of: two hand-kept walks pinned only by the D9 cross-check.
  Revisit if: the snapshot needs a walk feature `locate` must not have.
- **2026-10-23 · An `nth` past the end returns the first matches as candidates.**
  Decided: `LOCATOR_NOT_FOUND "nth N is past the end: K matched …"` with `data.candidates` = the first
  ≤ 5 matches.
  Why: it tells the caller what does exist.
  Instead of: empty candidates.
  Revisit if: S3/S4's failure report wants the similarity-ranked list here too.
- **2026-10-23 · `{text}` candidates are ranked by own text, compared on ≤ 120 characters.**
  Decided: as in deviations 4 and 5.
  Why: wrappers would otherwise dominate, and a huge text would stall the ranking.
  Instead of: full subtree text, uncapped.
  Revisit if: live use shows poor suggestions.

## Open items / for later stages

- **Cost of `waitFor {locator}` polling (S2).** A `LOCATOR_NOT_FOUND` computes candidates on every poll
  (`waitFor` polls `locate` every 100 ms). jsdom timings on 5 000 text elements:
  - `{text}` locate: ~1.4 s;
  - `buildSnapshot` on the same page: ~0.9 s;
  - the ranking alone: 66 ms.

  So the cost is the walk (`getComputedStyle`), not `nearest`. I have no Chrome measurement. S2 may
  want a longer poll interval on big pages, or measure live in S6.
- **Error messages carry the locator's own text.** That text is returned to the client in the error
  message, never logged. The lane rule forbids logging, not returning. Flagged so the verifier can
  judge.
- `CLAUDE.md`'s marker gotcha still needs the `__bridgeData` field. That is S7's job, per #82.

## Summary

S1 is built in its lane. The `a11y.ts` split is behaviour-neutral: `snapshot.test.ts` is
byte-unchanged and green, and the 46-fixture capture taken at the `dcb72db` code passes unchanged
(sha256 `d859e988…105e`). `locate`, `nearest` and `refOfMarked` are in place, and `guard`/`unwrapResult`
now carry `__bridgeData`. Extension tests: 460/460 (72 new, FE's 50 included). Typecheck is green. The
S1.4 greps are empty with exit 1. The IIFE bundle has no import/export.
