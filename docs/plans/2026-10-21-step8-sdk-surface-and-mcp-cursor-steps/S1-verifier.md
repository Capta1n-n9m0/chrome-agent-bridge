# Stage S1 — verifier report (content-script `locate`)

Verifier, Opus 5.5, 2026-10-23. Base `dcb72db`. I worked in two scratch worktrees at `dcb72db`. `post` held
exactly the 16 S1 files copied from the main tree. `pre` was left untouched, except that I copied
`snapshot-capture.test.ts` and `snapshot-fixtures.ts` into it to regenerate the capture. `npm ci` ran in
both. Afterwards both worktrees were removed: `git worktree remove --force` deregistered them but could not
delete the folders ("Directory not empty"), so I deleted them with `rm -rf`. `git worktree list` now shows only
the main tree. I did not modify the main tree. Mid-run, `cmp` showed the 8 S1 source files in `post`
identical to the main tree's copies. FE's files were excluded.

## Findings

1. **MINOR — the `{regex}` "not stateful" test cannot fail.** Location: `extension/test/locate.test.ts:79-89`
   (it tests the reset at `extension/src/content/locate.ts:136`).
   Evidence: the mutation run removed `p.regex.lastIndex = 0;` (mutation M2), and `locate.test.ts` still
   reported `Tests 41 passed (41)`. The fixture `ab, xx, ab` resets `lastIndex` by accident, because the
   failing `test()` on `xx` sets it back to 0. A fresh `RegExp` is built on every call, so nothing carries
   over between calls either. A probe with two adjacent matches, `<button>ab</button><button>ab</button>`,
   `{name:{regex:"ab",flags:"g"}, nth:1}`, fails without the reset (`nth 1 is past the end: 1 matched
   button with a name matching /ab/g`) and passes with it.
   So the code is correct, but its test is vacuous.
   Fix: put two adjacent matching elements in the fixture (`ab, ab`), and assert the
   `LOCATOR_AMBIGUOUS` count, or `nth:1`.

2. **MINOR — `extension/src/inject.ts` lies outside S1's pre-registered lane.** Location:
   `extension/src/inject.ts:64-69`. The phase doc's lane for S1 is `extension/src/content/`,
   `extension/test/`, `extension/build.mjs`. #82 does require the `unwrapResult` half, and the step
   agent's D10 assigned it to S1, but I found no written grant for `inject.ts`. `S1.ledger.md` names the
   file only under "changed".
   Evidence: `git diff --stat` shows `extension/src/inject.ts | 5 +-` (3 added lines, 1 changed).
   It is additive: an existing marker without `__bridgeData` throws exactly as before
   (`inject.test.ts` and `content-guard.test.ts` have only additions; their old tests are green).
   Fix: record the lane extension (with its #82 justification) in the step report or the as-built. No
   code change.

3. **NIT — `jsonData` turns non-plain objects into data instead of dropping them.** Location:
   `extension/src/content/guard.ts:33-43`.
   Evidence (probe): `toMarker(codedError("X","m", new Map([[1,2]])))` →
   `{"__bridgeError":"X:m","__bridgeData":{}}`, and `{f:()=>1, u:undefined, d:new Date(0)}` →
   `__bridgeData: {"d":"1970-01-01T00:00:00.000Z"}`. #82 says plain-JSON data. A Map or a class instance
   comes out as a lossy JSON copy rather than "no data". No current caller passes such data:
   `locate` passes only `{candidates}` / `{matches}` made of plain objects. Cycles, functions, strings,
   numbers, `null` and `undefined` do give the bare marker, as tested.
   Fix (optional): accept data only when it equals its JSON round trip in shape (only plain
   prototypes, or `Object.getPrototypeOf(x) === Object.prototype || Array.isArray(x)`
   recursively), or document "a JSON copy" as the rule.

4. **NIT — `role` is not trimmed, though `name` and `text` are.** Location:
   `extension/src/content/locate.ts:85` (`needle()` returns the raw string).
   Evidence (probe): `{role:" button "}` → `LOCATOR_NOT_FOUND: no  button : a snapshot never lists the
   role " button " …`, while `{role:"button", name:"  CREATE "}` matches. `isLocator` accepts both.
   The result is consistent with the "role is an exact string match" test, and `BAD_PARAMS` is never
   wrong here.
   Fix (optional): `needle(raw.role).trim()`, or refuse surrounding whitespace with `BAD_PARAMS`.

5. **NIT — `{text}` joins text nodes without block separators.** Location: `locate.ts:163-173`.
   Evidence (probe): with `<div><div>Hello</div><div>World</div></div>`, `{text:"Hello World"}` →
   `LOCATOR_NOT_FOUND`, nearest `"Hello"`, `"World"`, because the visible text is `HelloWorld`. That
   conforms to D4 ("light-DOM text nodes, normalised") and #83 ("normalised text"), but it differs from
   `innerText`. A related edge: a shadow host's unslotted light children count as host text although
   they are not rendered. Neither contradicts a ruling.
   Fix: none required. S7 may mention it in the docs.

6. **NIT — locator text is returned in error messages.** Location: `locate.ts:103-108`, `:257`, `:265`,
   `:272`. Nothing is logged: `grep -rnE "console\."` over every content file prints nothing (exit 1).
   The builder flagged this too. The message travels back to the client. Whether the daemon log ever
   writes an error message is outside S1. S2's verifier should confirm that no log line carries one.

7. **NIT — cost of `{text}` (an open item for S2's `waitFor` polling).** `textOf` builds every element's
   subtree text, so the work is O(text × depth), memoised per element. Nothing is quadratic in the
   element count for a flat page. My jsdom probe on a nested chain with text at each level:

   | depth | `{text}` locate | `buildSnapshot` |
   |---|---|---|
   | 250 | 208 ms | 119 ms |
   | 500 | 564 ms | 421 ms |
   | 1000 | 2125 ms | 1657 ms |

   Both grow superlinearly with depth (in jsdom, `getComputedStyle` gets dearer with depth), and
   `locate` stays within about 1.3–1.75× of the snapshot. That agrees with the builder's measurement.
   There is no Chrome measurement. Ambiguous and not-found failures also mint refs for up to 20 matches
   or 5 candidates. `RefMap.add` dedupes, so repeated polls do not grow the map beyond one ref per element.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| S1.1 `npm test` ≥ before + locate tests; typecheck green | **PASS** | `pre`: `Test Files 60 passed (60)`, `Tests 1008 passed (1008)`. `post`: `Test Files 64 passed (64)`, `Tests 1080 passed (1080)`, so S1 adds +72 tests and +4 files. `npm run typecheck` in `post`: exit 0, all five `tsc -p` runs. |
| S1.2 `snapshot.test.ts` unchanged and green; capture equal | **PASS** | `git diff --stat dcb72db -- extension/test/snapshot.test.ts extension/build.mjs`: empty, exit 0. It is green in the full suite. Regenerated in `pre` (`git diff --quiet dcb72db -- extension/src` → 0, then `BRIDGE_CAPTURE=1 npx vitest run extension/test/snapshot-capture.test.ts` → 1 passed): sha256 `d859e988fe3de560ab52d428cc45be2a0b71597385f0142914b51388b14d105e` for both the regenerated file and the candidate, raw and with CR stripped. `cmp` → IDENTICAL. |
| S1.2 coverage | **PASS** | 39 `it` cases in `snapshot.test.ts`. Every DOM body appears among the 46 fixtures. One variant is folded: `:140` (a shadow host with no light button) is a subset of the "shadow: open root" fixture, NIT. Extra fixtures cover the playground (static, and with its script's DOM), cap 850 nested, long names, and visibility/opacity/hidden. |
| S1.2 sensitivity | **PASS** | These mutations of the snapshot code each turned the capture test red (`1 failed`): dropping `"tab"` from `ARIA_ROLES`, `stop` using `>` instead of `>=` (the truncation boundary), dropping the shadow walk, not incrementing `depth`. An ungated zero-size filter turned 34 tests red across the capture and `locate.test.ts`. |
| S1.3 coverage | **PASS** | Every item maps to a test that asserts it, and each was killed by a mutation (table below). One item is weak, finding 1. |
| S1.4 | **PASS** | `grep -rn "reset" extension/src/content/locate.ts`: empty stdout, exit 1. `grep -rn buildSnapshot extension/src/content/locate.ts`: empty stdout, exit 1. |
| S1.5 | **PASS** | `npm run build` exit 0. `grep -cE "^(import|export)\b" extension/dist/content.js` → `0` (exit 1). `grep -nE "\bimport\(|^\s*export |\bexport \{|\bimport \{|import\.meta"` → nothing, exit 1. The file starts `"use strict";\n(() => {` and ends `})();`. `locate\|refOfMarked` appear 5 times. |
| Extra: `{__bridgeError}` unchanged for existing page functions | **PASS** | The `content-guard.test.ts` and `inject.test.ts` diffs are additions only: `grep -E "^-[^-]"` on the diff → exit 1, 114 insertions, 0 deletions. A marker without data → `data` undefined (tested). |
| Extra: null/undefined → `REF_STALE` | **PASS** | That code in `inject.ts` is untouched. A new test asserts both values. |
| Extra: never reset; mints only via `refs.add` | **PASS** | `refs.` occurs only at `locate.ts:114` and `marked.ts:39`, both `refs.add`. A reset spy covers 9 variants. Mutation M6 (a `refs.reset()` in `locate`) → 8 failed. |
| Extra: zero-size filter gated on `hasLayout` | **PASS** | It lives in `skippedAsZeroSize` (`a11y.ts:148-156`, `checkSize && isZeroSize`), used by the snapshot and all three locate variants. Mutation M23 (ungated) → 34 failed. |
| Extra: no runtime `@bridge/shared` import in content | **PASS** | All four occurrences are `import type`. The runtime-import grep → exit 1. |
| Extra: no `console.*` in content files | **PASS** | grep over `a11y, locate, nearest, marked, guard, index, snapshot` → exit 1. |
| Extra: `a11y.ts` moved unchanged | **PASS** | After stripping `export`, a `diff` against the pre-S1 `snapshot.ts:1-142` shows only the new `listableRoles`, `skippedAsZeroSize` and `walkElements`/`walkFrom`, and the comment header. |
| Extra: `buildSnapshot` equivalence | **PASS** | By reading: the old `walk` checked `length >= MAX_LINES` and then `hidesSubtree` on entry; the new `walkFrom` checks `stop()` and then `hides`, at the same point and with the same predicate. The frame index is incremented only when `frameDoc?.body`, as before. The order is shadow, then frame, then light, as before. The only difference: the layout memo is computed lazily (on the first element with a role) instead of on the first unpruned element. `hasLayout` has no side effects, so the output is identical. The 799/800/850/900 capture fixtures agree, and mutation M21 is caught. |

### Fail-without-change (the code was mutated in `post`, the tests run, the file restored; the full log is in `mutate.log`)

| Behaviour | Mutation | Result |
|---|---|---|
| role+name case-insensitive substring | M1 | 8 failed |
| regex `lastIndex` reset | M2 | **survived (41 passed)**, finding 1 |
| `{text}` innermost | M3 | 2 failed |
| `nth` 0-based | M4 | 10 failed |
| ambiguous cap of 20 | M5 | 1 failed |
| never reset | M6 | 8 failed |
| guard `__bridgeData` | M7 | 4 failed |
| `unwrapResult` data | M8 | 3 failed |
| `index.ts` exposes `locate` / `refOfMarked` | M9 / M9b | 1 failed each |
| `nearest` ranking / tie order | M10 / M10b | 4 / 1 failed |
| `refOfMarked`: removes the mark / removes it on failure too / unpruned walk | M11 / M11b / M11c | 3 / 1 / 1 failed |
| css validation → `BAD_PARAMS` | M12 | 1 failed |
| `{text}` skips hidden children | M13 | 1 failed |
| ≤ 5 candidates | M14 | 1 failed |
| zero-size gate for role / text / css | M15 / M15b / M15c | 1 failed each |
| `{text}` exact is case-sensitive | M16 | 1 failed |
| whitespace needle → `BAD_PARAMS` | M17 | 1 failed |
| `null` counts as absent | M18 | 1 failed |
| `nth` past the end → `NOT_FOUND` | M19 | 6 failed |
| snapshot capture (4 mutations) | M20–M22, M24 | 1 failed each |

## Attacks on the spec and the code (no further findings beyond 1–7)

- **Walk order in shadow and frame cases:** a single `walkElements` serves both callers. The D9 test runs on
  6 fixtures (the shadow ones, the frame ones, and the playground with its script's DOM). M4 and M19 are
  caught there.
- **#83 conformance of `{text}`:**
  - Innermost: by `parentElement` marking, linear amortised.
  - Pruning: the same `hidesSubtree`. That function also prunes `visibility:hidden` and `opacity:0`, as
    the snapshot does.
  - Zero-size: gated, the element is skipped but its text is kept.
  - Case-insensitive substring, and exact = case-sensitive equality.
  - `nth` in walk order.
  - Any role.

  All of this conforms.
- **`nth` 0-based:** #86 item 3, conforms.
- **The 120-character cap with `exact`:** equality is against the capped name ending in `…`. This is
  tested, and it is D3's rule.
- **`null`-valued keys:** they count as absent, at the top level and in `name.flags` (probe:
  `flags:null` matches). A `null` locator gets `BAD_PARAMS`.
- **`regex` combined with `exact`:** `exact` is ignored and the pattern decides (deviation 7). Not
  contradicted by any ruling.
- **`refOfMarked`:**
  - It removes every found mark before it throws (probe: 2 marked → `INTERNAL`, 0 left with that mark).
  - It finds hidden elements.
  - A `null` mark gets `BAD_PARAMS`.
  - This conforms to F21's search scope.
- **Ambiguous data:** at most 20 entries, and the message states the total (tested at 25).
- **Builder deviations 3–5** (candidates for an `nth` past the end, own-text ranking, the 120-character
  compare): they are within D6 and D7's unstated space. Each is a proposed decision for the step agent to
  rule on. I found no conflict with the spec.

## Lane

S1 touched:

- `extension/src/content/{guard,index,snapshot}.ts` (changed);
- `extension/src/content/{a11y,locate,nearest,marked}.ts` (new);
- `extension/src/inject.ts` (changed: **outside the stated lane**, finding 2);
- `extension/test/{content-guard,inject}.test.ts` (changed, additions only);
- `extension/test/{locate,marked,nearest,snapshot-capture}.test.ts`, `extension/test/snapshot-fixtures.ts`,
  `extension/test/fixtures/snapshot-pre-s1.json` (new).

`extension/build.mjs` and `snapshot.test.ts` are unchanged. Nothing else.

## Counts

- `npm test`: `pre` 1008 passed in 60 files; `post` 1080 passed in 64 files (+72 tests, +4 files).
- Mutation run: 29 mutations, 28 caught, 1 survived.
- Findings: 0 CRITICAL, 0 MAJOR, 2 MINOR, 5 NIT.

## Verdict

**PASS-with-notes.** Every exit check S1.1–S1.5 passes, and so does every extra criterion. Two MINOR findings
need attention: a vacuous regex-state test (1) and an unrecorded lane extension to `inject.ts` (2).
