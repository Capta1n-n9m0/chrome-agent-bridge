# S3 fixer, round 1 — report

Model: Opus 5.5 (claude-opus-5-5). Date: 2026-10-25. Nothing committed; no stash/checkout/reset. S5 had already
committed (`34adfdc`, `02c9a74`) when this round ran; none of its files were touched.

## Finding 1 (MAJOR) — fixed

On a page with exactly 800 listable elements, a non-listable `{text}`/`{css}` match after the last one (and a
non-listable descendant of the 800th) was flagged `pastSnapshotCap: true`, against phase doc 0.3's "Nothing changes
on a page with ≤ 800 listable elements".

**Diff summary — `extension/src/content/locate.ts`:**
- `capCounter` now counts listable elements up to 801 (`if (listed > SNAPSHOT_CAP) return true`), `visit(el)` answers
  whether at least 800 listable elements precede `el` (computed before `el` itself is counted), and a new
  `exceeded()` answers `listed > 800` once the walk is done. The listability test is unchanged
  (`roleOf(el) && !skippedAsZeroSize(el, layout)`, `snapshot.ts`'s order).
- New helper `pastIfExceeded(cap, marked)`: each of `searchRole`/`searchText`/`searchCss` returns
  `pastCap: pastIfExceeded(cap, pastCap)` — the marked matches if the page has an 801st listable element, else an
  empty set. Hence: a listable match is past iff it is the 801st or later (unchanged — a listable element with 800
  before it *is* the 801st, so `exceeded()` holds); a non-listable match iff ≥ 800 listable precede it AND the page has
  more than 800.
- Doc comments updated (`capCounter`, `Search.pastCap`). `a11y.ts`, `snapshot.ts` and the matching untouched:
  `git diff f45e3bf -- extension/src/content/a11y.ts extension/src/content/snapshot.ts | wc -l` → `0`.

**Mechanical note for the phase doc (F18):** the count now stops at the 801st listable element, so it costs at most
one more listable element's zero-size check than F18's "at most 800 `getBoundingClientRect`s" — needed to know that
the page has more than 800. (Zero-size-skipped role elements before that point are checked too, as before.)

**Tests — `extension/test/s3-locate-cap.test.ts`:**
- New describe "S3 fixer 1 (verifier finding 1)": 800 buttons + trailing `<p>` → `{text}` and `{css}` absent;
  800 buttons + `<p>` + 1 button → `{text}` and `{css}` on the `<p>` → `true`; 799 buttons + `<button><span>` (the
  800th) → the span via `{text}` absent (asserts the match is the `SPAN`).
- `pastIndices()` returns `[]` unless `counter.exceeded()`.
- The 45-fixture cross-check: if `exceeded()`, the snapshot lists 800 and the counter stopped at 801; otherwise the
  count equals the snapshot's length and **every** element the walk entered after the 800th listable one (listable
  or not; none on the current fixtures) is located end to end by a temporary `data-s3-probe` attribute and must
  carry no flag (replaces the old `past.filter(listed)` + `past == []` only below 800). The 900-button test (100 past)
  is unchanged and green.

**Failing first** (new tests written before the code, run on the builder's code):
```
× … finding 1 … > 800 buttons + a trailing <p> → {text} and {css} on the <p>: absent
    AssertionError: expected true to be 'absent'
✓ … finding 1 … > 800 buttons + a <p> + 1 more button → {text} and {css} on the <p>: true
× … finding 1 … > 799 buttons + <button><span> (the 800th) → the span via {text}: absent
    AssertionError: expected true to be false
✓ … finding 2 … > 799 buttons + <button><span> + 200 buttons → the span via {text}: true
Tests  2 failed | 2 passed | 63 skipped (67)
```
After the code: `s3-locate-cap.test.ts` + `s3-actions-cap.test.ts` 101/101 passed; every pre-existing S3.1 case green.

## Finding 2 (MINOR) — no behaviour change; pinned

Per the step agent's ruling (0.3's letter: a descendant of the 800th listable element comes after it in pre-order
walk order; on a page with > 800 listable elements it is flagged). New describe "S3 fixer 1 (verifier finding 2)":
799 buttons + `<button><span>edge label</span></button>` + 200 buttons → the span via `{text}` → `true`, with a
comment citing 0.3's definition. Green before and after the fix (it is a pin, not a fix).

## Finding 3 (MINOR) — fixed

`sdk/test/s3-signatures.test.ts`, new test "the BridgeClient constructor and the option shapes TrustedOption and
ScrollOptions (as at f45e3bf)":
```ts
expectTypeOf<ConstructorParameters<typeof BridgeClient>>().toEqualTypeOf<[BridgeClientOptions]>();
expectTypeOf<TrustedOption>().toEqualTypeOf<{ trusted?: boolean }>();
expectTypeOf<ScrollOptions>().toEqualTypeOf<{ target?: Target; direction?: "up" | "down" }>();
```
Shapes taken literally from `git show f45e3bf:sdk/src/tab.ts` (lines 54–61, 71–76) and the constructor from
`git show f45e3bf:sdk/src/client.ts:210` (`constructor(options: BridgeClientOptions)`); `BridgeClientOptions`
imported as a type from `../src/client.js`. Checked by `npm run typecheck` (exit 0). `new Tab(...)` stays unpinned
(its `TabHost` parameter is internal, as the verifier noted).

## Finding 4 (NITs) — fixed

- `sdk/test/s3-warning.test.ts` "the event carries no locator, name or text": adds `expect(seen).toHaveLength(1)`
  before the content checks, so it no longer passes vacuously.
- Duplicate titles: the "S3 no flag, no event" loop now titles each case
  `Tab: <method> (<the run body>): {ok: true} → no warning` (the duplicates were the untrusted/trusted pairs of
  click, type and pressKey, which shared `${a.method}: …`). JSON reporter over the two SDK S3 files: 44 tests,
  44 distinct full names, 44 passed.
- `sdk/test/s3-signatures.test.ts` header comment: `SdkWarning` → `BridgeWarning`.

## Finding 5 — propagator's; nothing done.

## Checks

```
npm run typecheck   → exit 0 (all five projects)
npm test            → Test Files 122 passed (122) · Tests 2989 passed (2989)
npm run build       → built extension → dist/ (exit 0)
```
Before → after: 2984 / 122 → **2989 / 122** (+5: 4 in `s3-locate-cap.test.ts`, 1 in `s3-signatures.test.ts`; none
removed; the 9 "no flag" cases were renamed in place by finding 4 — titles only, bodies unchanged).
`extension/dist/content.js`: `grep -cE "^(import|export) "` → 0. No log site added (`log-allowlist.ts` unchanged).
`git status --short` after the build: the builder's 10 modified + 5 new files and the S3 docs only; no tracked change
from the build.

Files touched this round: `extension/src/content/locate.ts`, `extension/test/s3-locate-cap.test.ts`,
`sdk/test/s3-signatures.test.ts`, `sdk/test/s3-warning.test.ts`, this report.
