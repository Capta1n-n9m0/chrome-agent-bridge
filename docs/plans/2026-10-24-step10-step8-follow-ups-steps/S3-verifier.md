# S3 verifier report — the 800-cap warning

Verifier, Step 10 stage S3 (phase doc 0.3; decisions.md #117, #206, #209). Model: Opus 5.5 (claude-opus-5-5).
Date 2026-10-25. Read only in the main tree; this file is the one file written there. No live work, no daemon,
no Chrome.

**Set-up.** Three detached worktrees at `2479301` under the session scratch directory, each with its own
`npm ci --prefer-offline` (a junction to the main tree's `node_modules` would have resolved `@bridge/*` to the main
tree's packages, since npm workspaces link them by absolute path): `wt-base` (unchanged code), `wt-new` (the 15
listed files copied in from the main tree, byte-identical — `sha1sum` equal for each), `wt-mut` (same as `wt-new`,
for mutants; every mutated file was restored and `cmp`-checked equal to the main tree afterwards). Glossary: a
*listable* element is one `buildSnapshot` lists (`roleOf(el) && !skippedAsZeroSize(el)`); *the flag* is
`pastSnapshotCap: true`; a *mutant* is a deliberate one-line break of the code that a test should catch.

## Findings

### 1. MAJOR — on a page with exactly 800 listable elements, a non-listable `{text}`/`{css}` match after the last one is flagged

- **Location:** `extension/src/content/locate.ts:57-67` (`capCounter`: `if (listed >= SNAPSHOT_CAP) return true;`
  at :61), used at :162, :226, :264.
- **Spec:** phase doc 0.3, *Definition*: "The page's listable elements … number **more than 800**, and the match
  comes after the 800th … A `{text}` or `{css}` match that is not listable is 'past the cap' only when it comes after
  the 800th listable element in walk order. **Nothing changes on a page with ≤ 800 listable elements.**" The counter
  answers "past" as soon as 800 listable elements precede the element; it never checks that an 801st exists. It
  stops counting at 800 (F18), so it cannot know.
- **Evidence** (scratch test `extension/test/zz-verifier-edge.test.ts` in `wt-new`, not committed;
  `npx vitest run extension/test/zz-verifier-edge.test.ts --reporter=verbose`):
  ```
  E1 text after 800th on 800 page: ["ref","role","name","pastSnapshotCap"] true      (800 buttons + <p>tail words</p>; snapshot lists 800)
  E2 css after 800th on 800 page: true                                                (800 buttons + <div class="t">)
  E3 span inside 800th button (800 page): true                                        (799 buttons + <button><span>last label</span></button>)
  ```
  So on such a page `locate` answers with a key old clients never saw, every action resolved through it carries the
  flag, the SDK emits a `warning`, and the MCP appends "… browser_snapshot does not list it." — on a page whose
  snapshot lists every listable element. That breaks 0.3's "Nothing changes on a page with ≤ 800 listable elements"
  and the brief's byte-identity requirement (item 5) for this class of page. Narrow (exactly 800 listable, a
  non-listable match after the 800th), but it is the contract-level wire field.
- **Why the committed tests miss it:** the boundary helper `pastIndices()` (`extension/test/s3-locate-cap.test.ts:95`)
  records only buttons; the 800-page cross-check asserts `past.filter((el) => listedEls.has(el))` empty (:214), i.e.
  listable elements only, and asserts `past` empty only when `< CAP` (:216). The 800-page fixtures have nothing after
  the last button, so E1-type elements never occur. My differential run (finding-free here) confirms "cap: 800
  buttons" answers identically — only because it has no trailing element.
- **Suggested fix:** keep counting to 801 (one more zero-size check than F18's "at most 800", a mechanical note for the
  phase doc), and flag a recorded match only when the walk found an 801st listable element: a listable match is past
  iff it is the 801st or later (unchanged); a non-listable match iff ≥ 800 listable precede it **and** the page has
  > 800. Since every search walks the whole document, the decision can be made after the walk. Add tests: 800 buttons
  + trailing `<p>` → `{text}` and `{css}` absent; 800 buttons + `<p>` + 1 button → `true`; and the 800-page
  cross-check asserting `past` empty for every element, not only listable ones.

### 2. MINOR — a non-listable match *inside* the 800th listable element is flagged although the snapshot lists its ancestor

- **Location:** same counter, `locate.ts:61` (pre-order walk: the 800th element is counted before its children).
- **Evidence:** `E4 span inside 800th (listed) button: true button listed: true` (799 buttons, `<button><span>edge
  label</span></button>`, 200 more; `{text: "edge label"}` resolves to the innermost `<span>`).
- **Judgement:** consistent with the letter of 0.3 ("after the 800th listable element in walk order" — a descendant
  is after it in pre-order), so not a defect of the build; but the MCP line then says "browser_snapshot does not list
  it" while the snapshot shows the button the text is in. A spec ambiguity (design-local) for the step agent: either
  record "descendants of the 800th count as past" as intended, or treat a match inside a listed listable ancestor as
  not past. Applies only to the one 800th element's subtree.

### 3. MINOR — the signature pin does not cover the constructors and pins parameter types by name

- **Location:** `sdk/test/s3-signatures.test.ts` (whole file).
- **Evidence:** my enumeration of `f45e3bf`'s public members (`git show f45e3bf:sdk/src/{tab,client}.ts`, every
  non-private method/getter/field): `Tab` — `handle`, `navigate`, `back`, `forward`, `snapshot`, `screenshot` (2
  overloads), `click`, `type`, `pressKey`, `hover`, `scroll`, `selectOption`, `locate`, `waitFor`, `evaluate`,
  `evaluateRef`, `network`, `networkClear`, `download`, `focus`, `close`, `release` (22); `BridgeClient` — `welcome`,
  `extensionConnected`, `connect`, `call`, `status`, `safety`, `on` (6 overloads), `newTab`, `claim`, `tab`, `tabs`,
  the 21 cursor mirrors, `close`. **All are pinned.** Not pinned: `new BridgeClient(options: BridgeClientOptions)`
  (an exported value's constructor) and `new Tab(...)` (takes the internal `TabHost`, which gained the optional
  `notifyWarning`; the builder states this). The expected types reference `Target`, `TrustedOption`,
  `ScrollOptions`, `ScreenshotOptions`, `DownloadOptions`, `NetworkListOptions`, `Locator`, `WaitForParams` by name,
  so a change inside one of those would pass. The method-level pin is discriminating (see S3.3 below).
- **Suggested fix:** add `expectTypeOf<ConstructorParameters<typeof BridgeClient>>().toEqualTypeOf<[BridgeClientOptions]>()`
  and, optionally, literal shapes for `TrustedOption` and `ScrollOptions` (the two this stage could plausibly touch).

### 4. NIT — test hygiene

- `sdk/test/s3-warning.test.ts:82` "the event carries no locator, name or text" never asserts that an event was
  delivered (it passed vacuously against `2479301`'s code, where no event exists). Add `expect(seen).toHaveLength(1)`.
  (The extra-key mutant is still killed by 18 other tests.)
- `sdk/test/s3-warning.test.ts`: three test names occur twice ("S3 no flag, no event click/type/pressKey: {ok: true}
  → no warning", Tab and cursor-mirror runs share a title) — 38 tests, 35 distinct names; distinguishing titles would
  make per-name diffs exact.
- `sdk/test/s3-signatures.test.ts:8` comment names `SdkWarning`; the type is `BridgeWarning`.

### 5. NIT (mechanical, for the propagator) — the pre-S1 capture holds 45 fixtures, not 46

`node -e 'require("./extension/test/fixtures/snapshot-pre-s1.json").length'` → `45` (array); the committed test
asserts `FIXTURES.length === 45` and passes. `CLAUDE.md` ("A pre-S1 capture of 46 fixtures") and the kickoff §7 row
say 46. The builder's claim holds.

## Exit checks

### Every-stage checks — **held**

- `npm test` at `2479301` (`wt-base`, JSON reporter): **2807 tests, 117 files, all passed**. With the change
  (`wt-new`): **2984 tests, 122 files, 2984 passed** → +177 = 5 new files (s3-locate-cap 63, s3-actions-cap 34,
  s3-cap-warning 37, s3-signatures 5, s3-warning 38).
- Per-test-name comparison (`file :: fullName`, base vs new): **removed 1**, which is a rename in place —
  `shared/test/protocol-step8.test.ts :: … LocateResult is {ref, role, name}` became `… LocateResult is {ref, role,
  name} plus the optional pastSnapshotCap (Step 10 S3)`. Diff:
  ```
  -  it("LocateResult is {ref, role, name}", () => {
  -    expectTypeOf<LocateResult>().toEqualTypeOf<{ ref: string; role: string; name: string }>();
  +  // Amended 2026-10-25 (Step 10 S3): was `toEqualTypeOf<{ ref: string; role: string; name: string }>()`,
  +  // because phase doc 0.3 (#117, #206) adds the optional `pastSnapshotCap?: true`; the three fields stay.
  +  it("LocateResult is {ref, role, name} plus the optional pastSnapshotCap (Step 10 S3)", () => {
  +    expectTypeOf<LocateResult>().toEqualTypeOf<{ ref: string; role: string; name: string; pastSnapshotCap?: true }>();
  +    expectTypeOf<Omit<LocateResult, "pastSnapshotCap">>().toEqualTypeOf<{ ref: string; role: string; name: string }>();
  ```
  Judgement: **allowed** — a by-design change of 0.3's wire type (the pin is an exact-type test of the very type 0.3
  extends), dated, with the old three-field shape still pinned through `Omit`; not "expected text edited to match a
  changed error". No test lost: 2807 − 1 renamed + 1 renamed + 177 new = 2984.
- `npm run typecheck` (`wt-new`) exit 0; `npm run build` exit 0 (`built extension → dist/`).
- `git status --short` after the build: exactly the 10 modified and 5 new listed files; no tracked `dist` change.

### S3.1 (+ F14) — **held as written; the 0.3 definition is not (finding 1)**

Every listed case is in `extension/test/s3-locate-cap.test.ts` and passes: 1 000-page element 900 → `true`, element
10 → key absent (`"pastSnapshotCap" in r` false, keys `[name, ref, role]`); 799 and 800 pages; 801 page index 799
absent / 800 `true`; non-listable `{css}` before the 800th → absent, after → `true` (with an 801+ page); `{text}` past
→ `true`; `{role}` with `nth` 850 → `true`; open shadow root + same-origin frame counting (400 + 400 → `true`, 400 +
399 → absent); zero-size gate with a positive control; cross-check over the 45 fixtures. **No test uses `truncated`
as its oracle** (F23): the oracles are `buildSnapshot(...).elements` membership and index arithmetic
(`grep -n truncated extension/test/s3-*.test.ts` → only the header comment).

Literal check run once (scratch `extension/test/zz-verifier-literal.test.ts`, `wt-new`, `locate` end to end at every
index, fresh `RefMap` each):
```
LITERAL 799: 799 locates, flagged 0, 98630 ms
LITERAL 800: 800 locates, flagged 0, 129613 ms
LITERAL 801: false true            (index 799 absent, index 800 true)
Tests  3 passed (3)
```
The committed substitute (one counter walk + sampled end-to-end locates) is **an acceptable discriminating test** for
listable indices: the counter is the code each search calls, and each counter mutant turned committed tests red —
`listed > SNAPSHOT_CAP` (off by one) 10 failed; counting every element (non-listable) 24 failed; counting zero-size
ones (`roleOf(el)` only) 4 failed; cap 799 11 failed; cap 801 10 failed (of 177 S3 tests). It does not cover
non-listable elements on an 800 page, which is where finding 1 lives.

### S3.2 — **held**

- `git diff f45e3bf -- extension/src/content/a11y.ts extension/src/content/snapshot.ts | wc -l` → `0`.
- `git diff 2479301 --stat -- extension/test/fixtures sdk/test/fixtures mcp/test/fixtures extension/test/log-allowlist.ts`
  → empty (fixtures byte-unchanged; `mcp/test/fixtures/tool-schemas-f45e3bf.json` differs from `f45e3bf` only because
  S2 added it in `8ae1a95`).
- Passing, unchanged: `extension/test/snapshot-capture.test.ts` 2/2, `sdk/test/format-baseline.test.ts` 37/37,
  `mcp/test/s2-focus-first.test.ts` (schema baseline) 44/44.
- Fixture count: 45 (finding 5).

### S3.3 — **held**

- MCP line: `mcp/test/s3-cap-warning.test.ts` (37) pins `CAP_WARNING_LINE` as the last line on click, type,
  press_key, scroll (both branches), hover, select_option, including the trusted focus-first path; `browser_wait_for`
  gets none. Mutants: line missing 23 failed; different text 24 failed; line added to `browser_wait_for` 1 failed.
- SDK surface: `sdk/test/s3-warning.test.ts` (38). Mutants: event emitted without the flag 10 failed; event with an
  extra key (`locator`) 18 failed; no event 21 failed; `Tab.click` resolving the reply object (body `return (await
  this.#send("click", …)) as void`, signature unchanged so `tsc` is clean) 9 failed.
- Signatures: expected types are written literally (no `typeof` of the code under test, except `typeof Sdk.connect`
  as the subject). `sdk/tsconfig.json` includes `test`, so `npm run typecheck` checks it. Red on mutation (`wt-mut`,
  three scratch edits to `sdk/src/tab.ts`, reverted, `tsc` clean again):
  ```
  sdk/test/s3-signatures.test.ts(56,48): error TS2344: Type '(target: Target, options?: TrustedOption | undefined) => Promise<void>' does not satisfy the constraint '"Expected: function, Actual: function"'.   (click → Promise<{ ok: true }>)
  sdk/test/s3-signatures.test.ts(63,55): error TS2344: Type '(target: Target, values: string[]) => Promise<void>' does not satisfy the constraint '"Expected: function, Actual: never"'.   (selectOption gains an optional parameter)
  sdk/test/s3-signatures.test.ts(69,54): error TS2344: Type '(expression: string) => Promise<string>' does not satisfy the constraint '"Expected: function, Actual: function"'.   (evaluateRef gains a required parameter)
  ```
  Against `2479301`'s code the file fails `tsc` on exactly the two by-design exceptions (`LocateResult`, the
  `warning` overload) — confirmed in `wt-base`. Completeness: all public methods pinned; constructors not (finding 3).

## Other items of the brief

**Failing first (item 4).** The five new files against `2479301`'s code: **177 tests, 60 passed, 117 failed**. The
60 that pass are those that must hold before and after: s3-actions-cap 20 (every "ref and unflagged locator answer
identically", "the replies themselves are today's shapes", pressKey without a target, scroll with neither, the locate
handler's pass-through ×2, `waitFor {locator}` resolves exactly `{ok: true}`); s3-cap-warning 13 (every "no flag →
byte-identical", "today's texts, pinned", `browser_wait_for` no line); s3-locate-cap 5 (element 10 absent, 799-before
`{css}` absent, an 801 snapshot lists 800, 400 + 399 absent, 45 fixtures); s3-signatures 5 (type-only at runtime;
red under `tsc`, above); s3-warning 17 (`locate()` returns the reply as is ×2, `locate()` emits nothing, "no flag, no
event" ×9, flag not exactly `true`, raw `call()`, unsubscribe, not an `"event"` frame, and the vacuous one of finding
4). Every behaviour-bearing test failed before the code.

**Implementation mutants (item 4), all killed** (S3 test files; failed of 177): cap 799 → 11; cap 801 → 10; flag set
as `false` instead of omitted — in `locate` 52, in `withCapFlag` 31; flag dropped on click's trusted/CDP branch
(which is also the content-failure escalation branch) 3; on click's content path 1; on type's trusted/escalation
branch 3; on type's content path 1; on hover/scroll/selectOption (`inTargetTab`) 3; on pressKey trusted 2; pressKey
synthetic 1; `nth` ignored for the flag (flag of `matches[0]`) 2; SDK and MCP mutants as listed under S3.3.

**Byte identity for old clients (item 5).** Differential runs, same input through old and new code:
- Handlers and MCP: the 20 + 13 "identical / today's shape" tests above passed against both `2479301` and the change.
- `locate`: a scratch dump (`extension/test/zz-diff.test.ts`, both worktrees) of `locate {css:"*", nth:i}` over every
  element (sampled to ≤ 300 on big pages), `{role, name, exact, nth:0}` per listed element and one `{text}` per
  fixture, over all 45 pre-S1 fixtures: **43 fixtures byte-identical**; the 2 that differ are the > 800 pages ("cap:
  900 buttons" 25 of 308 rows, "cap: 850 mixed, nested past the cap" 17 of 367), each difference an added
  `pastSnapshotCap: true` on a match past the 800th — as intended. "cap: 800 buttons" is identical (no element after
  its last button; see finding 1 for a page that has one).
- `waitFor {locator}`: `handlers/locator-wait.ts` unchanged (`git diff 2479301 --stat` empty); `pollLocator` returns
  the literal `{ ok: true }`; the test "a flagged locate makes the wait resolve exactly {ok: true}" passes.

**CLAUDE.md invariants (item 6).** Content script: `extension/dist/content.js` starts `"use strict"; (() => {` and ends
`})();`, `grep -cE "^(import|export) "` → 0, the flag is in it. `locate`'s failures still `throw codedError(...)`
inside `guard` (unchanged mechanism: returned `{__bridgeError}`). Listability uses `a11y.ts`'s exported `roleOf` and
`skippedAsZeroSize` in `snapshot.ts:112-113`'s order (`roleOf(el) && !skippedAsZeroSize(el, layout)`), no copied rule;
`searchText` walks with `hides: isHidden`, a memoised `hidesSubtree` (same rule as the snapshot's default). The count
stops at 800 (F18; see finding 1 for the consequence). No new log site: added non-test lines contain no
`console.`/`log(`/`warn(` (count 0); `log-scan.test.ts` 16/16 and `log-sentinel.test.ts` 2/2 pass; allowlist
unchanged. The SDK event copies exactly `{tab, method, kind}`; the MCP line is a constant with no element text. The
eight exported values: `sdk/test/index.test.ts` 3/3 unchanged and green; new type-only export `BridgeWarning`
(`sdk/src/index.ts`), contract-adjacent, to be carried under #206. S2 schema baseline green, fixture unchanged.
`locate.ts` has no `reset` and no `buildSnapshot` call. `safety-gate.test.ts` 344/344 (no new router method).

**Attacks (item 8).**
- Count changes between snapshot and locate: 801 buttons, `b800` → `true`; remove the first button → absent (`E6
  … true false`). The flag describes "a snapshot taken now", as 0.3 says.
- Frames in walk order: 500 buttons, `target`, then a same-origin frame with 500 → `target` absent, frame's `f400`
  (the 901st) `true`, the snapshot's 800th is `f298` (`E7`) — frame content after a match does not count, before it
  does (the committed shadow/frame tests cover "before").
- `{text}` innermost element inside a listable ancestor: finding 2 (and finding 1's E3).
- `selectOption`/`hover`/`scroll` carry the flag (committed tests; mutant `inTargetTab` killed).
- Failure-report path: the MCP's `capped(...)` runs only after `bridge.call` resolves; a throwing action never
  reaches it, so a failure report never carries the line (by construction; `registry.ts` diff).
- Recipes: `npx tsc --noEmit -p recipes/tsconfig.s6.json` → 26 errors at `2479301` (all `extension/src/tabs.ts`,
  `Cannot find name 'chrome'`) and the same 26 with the change; `tsconfig.json`, `.fe`, `.s9` → 0 errors in both. The
  builder's "pre-existing" claim holds.

## Verdict

**FAIL** — one MAJOR finding (1): on a page with exactly 800 listable elements a non-listable `{text}`/`{css}` match
after the last listable element carries `pastSnapshotCap: true`, contrary to 0.3's definition ("more than 800") and
its "nothing changes on a page with ≤ 800 listable elements". Every pre-registered exit check (every-stage, S3.1 as
written, S3.2, S3.3) held, and every requested mutant was killed; findings 2–5 are MINOR/NIT. Worktrees removed after
the run.

## Re-check, round 1 (2026-10-25, after `S3-fixer1.md`)

Set-up: two fresh worktrees at the new base `02c9a74` (S5's `34adfdc` + `02c9a74` touch no `extension`/`sdk`/`shared`/`mcp`
file: `git diff 2479301 02c9a74 --stat -- extension sdk shared mcp` empty), each with its own `npm ci`; the same 15
S3 files copied from the main tree into one. Both removed afterwards (`git worktree list` shows only the main tree).

**Finding 1 (MAJOR) — fixed.** `capCounter` now counts to the 801st listable element, `visit` answers "≥ 800 listable
before this element", and `pastIfExceeded` keeps the marks only when `exceeded()` (> 800). Scratch edge tests (not
committed), all green on the fixed code:
```
E1 800 buttons + <p>{text}                → absent      ✓
E2 800 buttons + <div>{css}               → absent      ✓
E3 799 buttons + <button><span> {text}    → absent      ✓
E4 799 + <button><span> + 200, {text}     → true        ✓ (finding 2's pinned behaviour)
E8 800 buttons + <p> + 1 button           → <p> via {text} true, via {css} true; the 801st button true; b799 absent ✓
E9 1 000 buttons: counter listed() = 801, exceeded() true; with layout stubbed, getBoundingClientRect on buttons
   called 801 times (stops at the 801st); 800 buttons → [800, false]                                         ✓
Tests  6 passed (6)
```
Red on the builder's behaviour: the builder's `locate.ts` was removed with the first worktrees, so I reproduced its
behaviour as a mutant of the fixed file (`pastIfExceeded` → return `marked` unconditionally — the only behavioural
difference; the 800-vs-801 stopping point does not change any result). Then `zz-edge2` + `s3-locate-cap.test.ts`:
`Tests 5 failed | 68 passed (73)` — E1, E2, E3 and the fixer's two new "finding 1" tests ("800 buttons + a trailing
<p> … absent", "799 buttons + <button><span> (the 800th) … absent") red; restored file `cmp`-equal to the main tree.
The new cross-check over the 45 fixtures cannot go red on this mutant (no fixture has an element after its 800th
listable one; the fixer says so) — the dedicated tests carry it. F18 note: the count now costs at most 801 zero-size
checks, not 800 (mechanical, for the phase doc, as the fixer proposes).

**Finding 2 (MINOR) — pinned, behaviour unchanged.** `extension/test/s3-locate-cap.test.ts:165-` asserts the `<span>`
(tagName `SPAN`) inside the 800th button on a 1 000-button page → `true`, citing 0.3's walk-order wording; my E4
agrees.

**Finding 3 (MINOR) — fixed.** `sdk/test/s3-signatures.test.ts:129-131` pins `ConstructorParameters<typeof
BridgeClient>` = `[BridgeClientOptions]`, `TrustedOption` = `{ trusted?: boolean }`, `ScrollOptions` = `{ target?:
Target; direction?: "up" | "down" }` (literal shapes; `BridgeClientOptions` by name). Mutation (`TrustedOption` gains
`extra?: number`; `direction` gains `"left"`; constructor gains `_x?: number`), `tsc -p sdk/tsconfig.json`:
```
sdk/test/s3-signatures.test.ts(129,78): error TS2344: Type '[BridgeClientOptions]' does not satisfy the constraint …
sdk/test/s3-signatures.test.ts(130,49): error TS2344: Type '{ trusted?: boolean | undefined; }' does not satisfy the constraint '{ extra: "Expected: never, Actual: number" …
sdk/test/s3-signatures.test.ts(131,49): error TS2344: Type '{ target?: Target | undefined; direction?: "up" | "down" | undefined; }' does not satisfy …
```
Reverted; `tsc` clean.

**Finding 4 (NITs) — fixed.** `expect(seen).toHaveLength(1)` present in "the event carries no locator, name or text";
`s3-warning.test.ts` 38 tests / 38 distinct names, `s3-signatures.test.ts` 6 / 6; `SdkWarning` occurs 0 times.
**Finding 5** — left to the propagator (unchanged: 45 fixtures).

**Every-stage checks — held.** `npm test` at `02c9a74`: **2807 / 117, all passed**; with the change: **2989 / 122, all
passed** (+182 tests in 5 new files: s3-locate-cap 67, s3-actions-cap 34, s3-cap-warning 37, s3-signatures 6,
s3-warning 38). Per-name comparison: removed 1 = the same by-design rename of the `LocateResult` pin in
`shared/test/protocol-step8.test.ts` judged allowed above; nothing else removed. `npm run typecheck` exit 0, `npm run
build` exit 0, `git status --short` afterwards = the 10 modified + 5 new S3 files only.
`git diff f45e3bf -- extension/src/content/a11y.ts extension/src/content/snapshot.ts | wc -l` → 0; fixtures and
`log-allowlist.ts` unchanged; `log-scan.test.ts` 16/16, `log-sentinel.test.ts` 2/2, `snapshot-capture.test.ts` 2/2,
`format-baseline.test.ts` 37/37, `s2-focus-first.test.ts` 44/44, `sdk/test/index.test.ts` 3/3, `safety-gate.test.ts`
344/344; added non-test lines with a log call: 0; `extension/dist/content.js` 0 `import`/`export` lines, ends `})();`.
Differential `locate` dump over the 45 fixtures (`02c9a74` vs the change): **43 identical**; "cap: 900 buttons" (25 of
308 rows) and "cap: 850 mixed, nested past the cap" (17 of 367) differ **only** by the added `pastSnapshotCap: true`
(checked by stripping the key and comparing equal).

**Verdict (round 1): PASS-with-notes.** Finding 1 is fixed and guarded by tests that fail without the fix; findings 3
and 4 are fixed; finding 2 is a pinned spec reading and finding 5 a mechanical doc correction, both for the step agent
and propagator; the F18 bound moves from 800 to 801 zero-size checks (a dated note in the phase doc).
