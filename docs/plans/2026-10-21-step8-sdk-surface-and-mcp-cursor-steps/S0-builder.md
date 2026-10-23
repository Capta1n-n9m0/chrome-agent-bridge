# S0 builder report (code half): types

Builder for Step 8 stage S0 ("types"). Base commit 1837dc9. Model: Claude Opus 5.5. 2026-10-23.
Lane: `shared/src/`, `shared/test/`. Nothing outside the lane was edited, nothing was committed, and
`npm run build` was not run in the main tree.

## Files built

**`shared/src/codes.ts`**
- Header rewritten (lines 1–5). It now says exactly these 23: the 22 the daemon and the extension put on
  the wire, plus `NO_CURSOR`, raised by the SDK alone. A code is added only by amending the spec first.
- `SDK_ERROR_CODES = ["NO_CURSOR"] as const` at :42, with the requested doc comment citing #76 (:37–41).
- `SdkErrorCode` at :46.
- `ErrorCode = DaemonErrorCode | ExtensionErrorCode | SdkErrorCode` at :47.
- `NO_CURSOR: "NO_CURSOR",` in `ErrorCodes` at :72.
- `...SDK_ERROR_CODES` in `ALL_CODES` at :78.

**`shared/src/protocol.ts`**
- `HelloMessage.session?: string` at :52. Its doc comment (:45–51) says: the marker stays the same across
  service-worker restarts and extension reloads and is new after a Chrome restart; S2b gives it
  behaviour; never log it. It cites #74 and #80 by date and title.
- `isHello` checks `session` at :159.
- `EvalEnvelope.ref?: string` at :294 (phase doc 0.3).
- The Step 8 block starts at :380. Its header note says the routing keys (`tab` from a client, `tabId`
  from the daemon) are not part of a method's own params.
  - `LocatorName` :385
  - `Locator` :401. The doc comment gives the `{role}` rule, the `{text}` rule of #83 item 1, `{css}`,
    `nth` in walk order, and `exact` on two variants only.
  - `LocateResult` :407
  - `WaitForParams` :419. The comment notes "F28, S0 step agent".
  - `ActionTarget` :426
  - `TrustedInputOptions` :435. `focusEmulation` cites #78: FE measures it, and `policy.ts` decides in S3.
  - `ClickParams` :441
  - `TypeParams` :444
  - `PressKeyParams` :447
  - `EvaluateParams` :455
  - Private helpers `LOCATOR_KINDS` :461, `LOCATOR_KEYS` :462, `isLocatorName` :477
  - `isLocator` :490

**`shared/test/codes.test.ts`**: the edited expectation, described below.

**`shared/test/protocol-step8.test.ts`** (new): 57 tests.
- Hello `session`: 5 tests.
- `isLocator`: 10 accept tests, 31 reject tests, and 3 tests that treat an `undefined`-valued key as
  absent.
- Type tests: 8 `it` blocks with 35 `@ts-expect-error` lines and 9 `expectTypeOf` checks.

**`sdk/src/types.ts`: skipped.** `type Target = string | Locator` has nothing testable beyond a
one-line assignability check. The SDK's surface belongs to S3, which can define `Target` beside `Tab`
in `sdk/src/tab.ts` (phase doc 0.4).

## TDD order

1. I wrote `codes.test.ts` (edited) and the runtime half of `protocol-step8.test.ts` first and ran them.
   Result: **46 failed**:
   - the 3 codes tests;
   - the 3 hello rejections;
   - all 40 `isLocator` cases, because the export did not exist yet.

   The 2 hello acceptances already passed, because `isHello` accepts unknown keys today.
2. Then I implemented the code. Result: `shared/test` 128 passed.
3. Then I added the 3 `undefined` cases and the type tests. Result: 140 passed, `tsc -p shared` exit 0.

## Results

```
$ npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit 0

$ npm test
 Test Files  60 passed (60)
      Tests  1007 passed (1007)
```

The baseline, run at the start of this session on the same tree, was 59 files and 950 tests. The suite
gained 57 tests and 1 file, and no test was lost.

```
$ grep -cE '^  [A-Z_]+: "[A-Z_]+",$' shared/src/codes.ts
23
$ grep -c NO_CURSOR shared/src/codes.ts
4
$ grep -n "LOCATOR_NOT_FOUND\|LOCATOR_AMBIGUOUS" shared/src/codes.ts
23:  "LOCATOR_NOT_FOUND",
24:  "LOCATOR_AMBIGUOUS",
60:  LOCATOR_NOT_FOUND: "LOCATOR_NOT_FOUND",
61:  LOCATOR_AMBIGUOUS: "LOCATOR_AMBIGUOUS",
$ grep -rn "ErrorCode\b" daemon/src extension/src mcp/src sdk/src | grep -v test
extension/src/errors.ts:6:import { BridgeError, ErrorCodes, type ErrorCode } from "@bridge/shared";
extension/src/errors.ts:9:export type { ErrorCode };
sdk/src/index.ts:7:export type { ErrorCode, EventMessage, WelcomeMessage, WireError } from "@bridge/shared";
```

Nothing outside the lane iterates exhaustively over `ErrorCode`. The two hits are a re-export and an
import. A separate grep for `Record<ErrorCode`, `in ErrorCode` and `satisfies` found only the
`satisfies { [K in ErrorCode]: K }` in `codes.ts:73`, which is inside the lane and now requires the
`NO_CURSOR` entry. Typecheck stayed green in all five packages.

## Edited existing expectation (designed)

All three changes are in `shared/test/codes.test.ts`:

- **"groups exactly the 9 daemon and 13 extension codes"** → **"groups exactly the 9 daemon, 13
  extension and 1 SDK codes"**. It adds `expect([...SDK_ERROR_CODES]).toEqual(["NO_CURSOR"])`.
- **"ErrorCodes holds exactly the 22 spec codes"** with `toHaveLength(22)` → **"…the 23 spec codes"**
  with `toHaveLength(23)`. The expected key list now includes `SPEC_SDK`.
- **"isErrorCode accepts a spec code…"** gains `expect(isErrorCode("NO_CURSOR")).toBe(true)`.

The header comment changed from "exactly these 22" to "exactly these 23 … plus `NO_CURSOR` (#76)". The
file still has 3 tests.

## Type-test discrimination proof

I loosened three types in `shared/src/protocol.ts` at the same time:
- the `WaitForParams` text arm → `{ text?: string }`;
- `ActionTarget` → `{ ref?: string; locator?: Locator }`;
- `HelloMessage.session` → `session?: unknown`.

Then I ran `npx tsc -p shared --noEmit`:

```
shared/test/protocol-step8.test.ts(164,5): error TS2578: Unused '@ts-expect-error' directive.   <- WaitForParams {}
shared/test/protocol-step8.test.ts(185,5): error TS2578: Unused '@ts-expect-error' directive.   <- ClickParams both
shared/test/protocol-step8.test.ts(187,5): error TS2578: Unused '@ts-expect-error' directive.   <- ClickParams neither
shared/test/protocol-step8.test.ts(189,5): error TS2578: Unused '@ts-expect-error' directive.   <- TypeParams both
shared/test/protocol-step8.test.ts(191,5): error TS2578: Unused '@ts-expect-error' directive.   <- TypeParams neither
shared/test/protocol-step8.test.ts(220,59): error TS2344: Type 'string | undefined' does not satisfy the constraint '"Expected: string, Actual: unknown" | "Expected: undefined, Actual: unknown"'.
shared/test/protocol-step8.test.ts(222,5): error TS2578: Unused '@ts-expect-error' directive.   <- HelloMessage session: 5
tsc exit 2
```

I restored the file from a scratchpad copy. The sha256 is identical before and after
(`50303527…aa8e00`), and `tsc` exits 0 after the restore.

## Mixes the `Locator` type cannot reject (they are `isLocator`'s job)

`Locator` has no tag field. TypeScript's excess-property check on such a union treats a key as known
when any member has it. A probe file (deleted afterwards) measured that these compile as a `Locator`:

- `{css, exact}`
- `{css, name}`
- `{text, name}`
- `{role, text}`
- `{role, css}`
- `{text, css}`

The test "the mixes the untagged union cannot reject" holds all six in a `Locator[]` and asserts that
`isLocator` rejects each.

The same probe showed the same effect on `WaitForParams`: `{text, seconds}` and `{locator, idleMs}`
compile.

What the type does reject:
- `{}`
- `{nth}` alone
- an unknown key (`frame`)
- an extra key in the name object (`source`)
- a name object without `regex`
- wrong field types
- `ref` together with `locator`, and neither (`never` in `ActionTarget`)
- `networkIdle: false`
- `state: "attached"`

The brief asked for `{css, exact}` to be rejected by the type. TypeScript cannot do that with the
settled shape, so the case appears in the "cannot reject" list instead.

## Deviations

1. **`{css, exact}` is not rejected by the type.** The reason is above. I kept the settled `Locator`
   shape unchanged rather than adding `?: never` fields. The decision is proposed below.
2. **An `undefined`-valued key counts as absent in `isLocator`.** The brief says "any other key →
   false". I read that as "any other key with a value". This matches the existing `optional()` helper
   and its comment in `protocol.ts`: JSON drops `undefined`, so an in-process locator and its wire form
   agree. Example: an SDK caller passing `{role, name, nth: opts.nth}` with `nth` unset.
   `{role: undefined}` alone is still rejected, because it has no kind. Three tests pin this.
3. **`isLocator` does not check that `flags` are valid RegExp flags, or that `regex` compiles.** The
   brief asks only for a string. An invalid pattern will throw when it is built in the page, and S1 owns
   that failure.
4. **An empty `name: ""` is accepted.** The brief requires non-empty strings only for
   `role`/`text`/`css`. Under 0.1's substring rule, `""` matches every name of the role.

## Proposed decisions

**2026-10-23 · The `Locator` type stays untagged; `isLocator` rejects mixed variants**
- **Decided:** keep 0.1's three-variant `Locator` exactly as written. Do not add `role?: never` /
  `text?: never` / `css?: never` / `exact?: never` / `name?: never` to the members. Mixed variants such
  as `{css, exact}` and `{role, text}` compile, and the runtime `isLocator` refuses them wherever a
  locator crosses the wire or enters from a script.
- **Why:** the shape is settled by the phase doc (0.1, a contract decision not reopened during the
  build). The `never` fields would change every hover and error text that a script author sees. S2's
  extension and S3's SDK must call `isLocator` anyway, since MCP and raw `call()` input is untyped.
- **Instead of:** an exclusive union with `?: never` fields, which would reject these mixes at compile
  time.
- **Revisit if:** S3 wants compile-time rejection for SDK users. Adding the `never` fields is additive
  for valid locators.

**2026-10-23 · `isLocator` treats an `undefined`-valued key as absent**
- **Decided:** as in deviation 2.
- **Why:** this is consistent with the event guards' `optional()`, and JSON drops `undefined`.
- **Instead of:** rejecting `{role: "b", nth: undefined}`.
- **Revisit if:** S2 or S3 needs a locator's keys to be checked before JSON serialisation for another
  reason.

## Unfinished / not run

- **The bundle byte-identity clause (the S0 step agent's escalation) was not measured.** The brief
  forbids `npm run build` in this tree. By construction both bundles change:
  - `ErrorCodes` gains an entry, and the daemon and extension bundle it.
  - `isHello` gains a line, and the daemon bundles it.
  - `isLocator` is new, but unused, so tree-shaking should drop it.

  The verifier's clean-worktree build gives the measured diff.
- **Spec §10's dated note on `NO_CURSOR`** is outside this lane. The docs builder holds the spec edit.
- `sdk/src/types.ts` was skipped (see above).
