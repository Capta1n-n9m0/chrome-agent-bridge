# S4b builder report — the new code `JS_DISABLED`

Builder: Claude Opus 5.5, 2026-10-25. Base `41e6f5d` (S4 closed; code identical to `6ba2d10`). Host-only: no
Chrome, no daemon, no port 9234. Brief: `briefs/S4b-builder.md` (+ `briefs/common.md`).

## Verdict

Built. Spec note committed alone first (`2866c43`); tests written, seen red at the base, then the code; typecheck 0,
`npm test` 3145 / 130 → **3165 / 130**, build 0, no tracked `dist/` change. The code is **not committed** (left in the
main tree for the verifier, as the brief orders).

## Built (files)

| File | Change |
|---|---|
| `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10 | Commit 1 (`2866c43`, `docs(spec): §10 — JS_DISABLED (#202)`): an *Amended 2026-10-25 (Step 10 S4b, #202)* note at the end of §10 (the code, 26 codes / 25 on the wire, which calls, `DISARMED {scope:"all"}` wins while off, `"evaluate"` no longer produced but rendered for an old extension (F17), not in the attach set, nothing changes with JavaScript on) and three in-place *Superseded 2026-10-25* notes on the Step 9 statements it changes (the count, `scope:"evaluate"` for `evaluate`, `scope:"evaluate"` for script URLs). |
| `shared/src/codes.ts` | `JS_DISABLED` added to `EXTENSION_ERROR_CODES` (16) and `ErrorCodes` (26 total; `ErrorCode` type and `isErrorCode` follow by construction); header and `DISARMED` doc comments superseded in place. |
| `shared/src/protocol.ts` | Doc comment only: `SafetyScope` keeps `"all" | "evaluate"` (F17); a dated note says `"evaluate"` is no longer produced. No type change. |
| `extension/src/safety.ts` | JavaScript off → `jsDisabled()` = `{code: "JS_DISABLED", message: JS_DISABLED_MESSAGE}` (no `data`) at the same two places that returned `disarmed("evaluate")`; `disarmed()` now only builds `scope:"all"`; `SafetyRefusal.code` union gains `JS_DISABLED`; new export `JS_DISABLED_MESSAGE` (Step 9's text, byte-identical); `DISARMED_EVALUATE_MESSAGE` kept exported as an alias with a dated comment (the recipes' test imports it). The gate's order and which methods/URLs are refused are unchanged. |
| `sdk/src/error.ts` | `safetyRefusalLine`: `JS_DISABLED` → `JS_DISABLED: <JavaScript-off body>` whatever its `data`; `DISARMED {scope:"evaluate"}` → `DISARMED: <same body>` (byte-identical to Step 9's line); everything else unchanged. `ATTACH_CODES` untouched. |
| `sdk/src/report.ts`, `mcp/src/tools/registry.ts` | Comments only: `withSafetyRefusals` already routes through `safetyRefusalLine`, so it covers `JS_DISABLED` with no code change. |
| `docs/setup.md` § Safety | "The JavaScript switch" paragraph, the Blackboard note and "For scripts" updated with dated *Superseded* notes, quoting `JS_DISABLED_MESSAGE` and the MCP line byte for byte (checked by a script that loads both constants and searches the whitespace-normalised doc: both `true`). |
| tests | see below |

`safety-call.ts` and the S4 store's refusal were **not** touched: the code path did not demand it (every refusal
comes from `safetyDecision`; the store's drops do not build a refusal).

## Results (tails)

Base, before any edit (`41e6f5d`):
```
 Test Files  130 passed (130)
      Tests  3145 passed (3145)
```
After:
```
 Test Files  130 passed (130)
      Tests  3165 passed (3165)
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit 0
built mcp → dist/index.js
built extension → dist/
build exit 0
```
`git status --short` after the build (no `dist/` entry):
```
 M docs/setup.md
 M extension/src/safety.ts
 M extension/test/s4-save-gate.test.ts
 M extension/test/safety-call.test.ts
 M extension/test/safety-gate.test.ts
 M mcp/src/tools/registry.ts
 M mcp/test/safety.test.ts
 M sdk/src/error.ts
 M sdk/src/report.ts
 M sdk/test/safety.test.ts
 M shared/src/codes.ts
 M shared/src/protocol.ts
 M shared/test/codes.test.ts
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/S4b.ledger.md
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S4b-builder.md
```
Recipes typecheck: `recipes/tsconfig.json` 0, `tsconfig.fe.json` 0, `tsconfig.s9.json` 0; `tsconfig.s6.json` exits 2
with 26 lines of `Cannot find namespace 'chrome'` in `extension/src/tabs.ts` — **pre-existing**: the same 26 lines at
`41e6f5d` in a clean worktree. Not caused by S4b, not in the lane; reported only.

Count +20 = 19 new tests (below) + 1 generated: `sdk/test/failure-report.test.ts` makes one test per non-attach code
(`the attach set (S4.2) > JS_DISABLED: attaches nothing, rethrown untouched`). No test removed.

## Red at the base

The six changed test files were copied into a clean worktree at `41e6f5d` (its own `@bridge/*` links, so the tests
ran against the base code): **38 failed / 480 passed of 518**. Every new test that asserts the new behaviour failed;
every changed expected text failed. Listed by file:

- `shared/test/codes.test.ts`: the 3 count tests + `S4b.1 … JS_DISABLED is an extension code on the wire` (4).
- `extension/test/safety-gate.test.ts`: 12 matrix cases (`evaluate`, `evaluateSaveStart/Chunk/End` × armed+JS off ×
  blocked/allowed/own), `the state is checked before the tab…`, `evaluate with or without asRef…`, `navigate …` and
  `newTab to javascript:/data:/blob: → JS_DISABLED…`, `JS turned off during an evaluate → JS_DISABLED`, `a tab gone at
  receipt × disarmed → DISARMED; evaluate × JS off → …`, `the two DISARMED scopes read differently…`, `refusalError…`.
- `extension/test/safety-call.test.ts`: both changed tests.
- `extension/test/s4-save-gate.test.ts`: S4.3's JavaScript-off test; S4b.2 `armed, JavaScript off: each call answers
  exactly {code: JS_DISABLED, message}…`; S4b.2 `the JavaScript-off message…`.
- `sdk/test/safety.test.ts`: S4b.3 `safetyRefusalLine(JS_DISABLED)…`, `renderReport gives the JavaScript-off line…`.
- `mcp/test/safety.test.ts`: all six `JS_DISABLED → the one line…` cases and `the saveTo leg writes nothing…`.

**Green at the base by design (controls), with mutation proof instead.** Seven new tests pin what S4b must *not*
change, so they cannot fail at the base: S4b.2 `the bridge off … DISARMED {scope:"all"} wins`, `armed, JavaScript on:
nothing changes`, `JavaScript off leaves every other navigation alone`; S4b.3 (SDK) `ATTACH_CODES does not hold
JS_DISABLED…`, `a Tab call refused JS_DISABLED makes no attach call…`; the two F17 tests (SDK, MCP). Made
discriminating by mutation in the main tree (restored from a copy afterwards, diff checked):
- M1 — `"JS_DISABLED"` added to `ATTACH_CODES`: 9 red (both SDK attach tests, 5 MCP `JS_DISABLED` cases, and two
  `failure-report.test.ts` tests).
- M2 — the armed check moved after the JavaScript check in `safetyDecision`: `the bridge off … wins` red.
- JS on / other navigations / F17: a control by definition (they equal the base); the JS-on test asserts each of the
  11 calls reaches its handler, F17 asserts byte equality with Step 9's line.

## New tests, per file (19)

- `shared/test/codes.test.ts` (1): `S4b.1 (Step 10, #202): JS_DISABLED is an extension code on the wire; 26 codes, 25
  on the wire`.
- `extension/test/s4-save-gate.test.ts` (5), describe `S4b.2 — JavaScript off answers JS_DISABLED on the wire`, through
  the real `GatedRouter` + `CallSafety` with JSON on the wire: 11 calls — `evaluate`, `evaluate {asRef}`,
  `evaluateSaveStart/Chunk/End`, `navigate` and `newTab` to `javascript:`, `data:`, `blob:` — answer exactly `{code:
  "JS_DISABLED", message: JS_DISABLED_MESSAGE}` (no `data`) with no handler run; the bridge off (JS on and off) →
  exactly `{code: "DISARMED", message: DISARMED_ALL_MESSAGE, data: {scope: "all"}}`; JS on → every handler runs; JS off
  leaves `http:`/`about:` navigations alone; the message names no URL/id and keeps Step 9's meaning.
- `sdk/test/safety.test.ts` (5), describe `S4b.3 — JS_DISABLED stays out of the attach set and reads as one plain line`:
  `ATTACH_CODES` lacks it and still equals the seven codes; a `Tab.evaluate` refused `JS_DISABLED` sends no attach call,
  writes no PNG, has no `report`; `safetyRefusalLine("JS_DISABLED", any data)` = the line; F17 (old `DISARMED
  {scope:"evaluate"}` = same body under `DISARMED: `); `renderReport` gives the line.
- `mcp/test/safety.test.ts` (8), describe `S4b.3 — JS_DISABLED becomes one plain error line, never a failure report`:
  `browser_evaluate` (cursor; `tab:"T5"`; `asRef`; `saveTo`), `browser_navigate` to `javascript:`, `browser_new_tab` to
  `data:` → `{isError: true, content: [one text item]}`, `attach` never called (so no screenshot); the `saveTo` leg
  leaves its directory empty; F17: an old extension's `DISARMED {scope:"evaluate"}` → Step 9's line, no attach.

## Changed expected texts, per file (each by #202, which changed #133; each carries a dated comment in place)

`shared/test/codes.test.ts` — count changes (a code was added, none edited):
- `groups exactly the 9 daemon, 15 extension and 1 SDK codes` → name `…16 extension…`; `SPEC_EXTENSION` gains
  `"JS_DISABLED"`.
- `ErrorCodes holds exactly the 25 spec codes…` → name `…26…`; `toHaveLength(25)` → `toHaveLength(26)`.
- `Step 9: DISARMED and DOMAIN_BLOCKED are extension codes on the wire` → `EXTENSION_ERROR_CODES` `toHaveLength(15)` →
  `16`.

`extension/test/safety-gate.test.ts`:
- `expected()` helper (drives the S1.2 matrix): class `evaluate` with JS off `"DISARMED"` → `"JS_DISABLED"`; the
  matrix's scope check `DISARMED → "all" | "evaluate"` → `DISARMED → "all"` only, and `JS_DISABLED` → no `data`.
- `the state is checked before the tab…`: evaluate × JS off on a blocked tab `code "DISARMED"`, `scope "evaluate"` →
  `code "JS_DISABLED"`, scope `undefined`.
- `evaluate with or without asRef is refused while JS is off…`: `scope "evaluate"` → `code "JS_DISABLED"`.
- `navigate to javascript:/data:/blob: → DISARMED {scope:"evaluate"} while JS off; allow while on` and the same for
  `newTab` → names `… → JS_DISABLED while JS off; allow while on`; `code "DISARMED"`, `scope "evaluate"` → `code
  "JS_DISABLED"`, scope `undefined`.
- `JS turned off during an evaluate → DISARMED {scope:evaluate}` → name `… → JS_DISABLED`; `scope "evaluate"` →
  `code "JS_DISABLED"`.
- `a tab gone at receipt × disarmed → DISARMED; evaluate × JS off → DISARMED {scope:evaluate}` (name kept: it is a
  verbatim #141 row title): evaluate × JS off `scope "evaluate"` → `code "JS_DISABLED"`.
- `the two DISARMED scopes read differently (#133)…`: assertions **added** — `js.code` and `navJs`'s code are
  `JS_DISABLED`; the existing message assertions unchanged.
- `refusalError → a BridgeError with code, message and data`: `e.code "DISARMED"` → `"JS_DISABLED"`; `e.data {scope:
  "evaluate"}` → `undefined`; added: a disarmed+JS-off refusal is `DISARMED {scope:"all"}`.

`extension/test/safety-call.test.ts`:
- `navigate to a blocked URL, to any extension page, to a script URL with JS off`: newTab `javascript:` `{code:
  DISARMED, data: {scope: "evaluate"}}` → `{code: JS_DISABLED}` and no `data` property.
- `evaluate with JS off: DISARMED {scope: evaluate}; other tools still allowed` → name `…: JS_DISABLED; …`; same change.

`extension/test/s4-save-gate.test.ts`:
- `JavaScript off: each new method's wire refusal equals evaluate's; no handler runs`: the sanity line
  `toMatchObject({ code: ErrorCodes.DISARMED })` → `ErrorCodes.JS_DISABLED`. Its own comment had foreseen it ("after
  S4b: JS_DISABLED"); the equality assertion F6 built is unchanged. (So F6's "S4b changes no S4 test text" held for
  the equality, not for this one-line sanity check.)

`sdk/test/safety.test.ts`:
- `each line is one line; any other code has none`: the "other codes" filter also excludes `JS_DISABLED` (it now has a
  line). The Step 9 `DISARMED {scope:'evaluate'}` line test is **unchanged** (F17, byte-identical).

`mcp/test/safety.test.ts`: no existing expected text changed (the Step 9 `DISARMED {scope:'evaluate'}` test still
passes as F17's case).

No file outside the lane needed a change: `daemon/test/safety.test.ts` and every other test pass unchanged.

## Recipes

Nothing changed. `recipes/s9-rules.ts` `EXPECT.disarmedEvaluate` and `EXPECT.mcpDisarmedEvaluate`, and its judge's
`DISARMED:evaluate` expectation, describe Run 13/14 (§4.20) — history, left as is. Its test
`recipes/test/s9-rules.test.ts` still passes because (a) `DISARMED_EVALUATE_MESSAGE` stays exported from
`extension/src/safety.ts` (now an alias of `JS_DISABLED_MESSAGE`, same text, dated comment) and (b) the SDK's
`DISARMED {scope:"evaluate"}` line is byte-identical to Step 9's. `recipes/s9-r14.ps1` pins no JavaScript-off text
(only `DISARMED:all`). A Run 15 row can already expect the new code through the existing `code:<CODE>` form
(`--expect code:JS_DISABLED`), which checks the code only.

## Producer grep

`grep -rnE 'scope: ?"evaluate"|disarmed\("evaluate"\)|DISARMED_EVALUATE' --include=*.ts --include=*.mjs --include=*.ps1
--include=*.js` (excluding node_modules, dist, docs):
```
./extension/src/safety.ts:13:  … *Superseded 2026-10-25 (Step 10 S4b): was "→ `DISARMED {scope:"evaluate"}`" … (comment)
./extension/src/safety.ts:189:export const DISARMED_EVALUATE_MESSAGE = JS_DISABLED_MESSAGE;      (alias, no producer)
./extension/src/safety.ts:205:/** `JS_DISABLED`, … was `DISARMED {scope:"evaluate"}`). */          (comment)
./extension/src/safety.ts:280:  // Step 10 S4b (#202): … (was DISARMED {scope:"evaluate"}) …     (comment)
./extension/test/s4-save-gate.test.ts:105, safety-call.test.ts:217,224, safety-gate.test.ts:141,251,545,568  (dated comments)
./mcp/test/safety.test.ts:189,300            refusing("DISARMED", { scope: "evaluate" })   (fake old extension, F17)
./recipes/test/s9-rules.test.ts:8,103,113,217,225                                            (Run 13 history)
./sdk/src/error.ts:116,125,126,141           (the F17 renderer, a consumer)
./sdk/test/safety.test.ts:97,137,287,294     (F17 inputs)
./shared/src/codes.ts:32                     (superseded comment)
./shared/test/protocol-step9.test.ts:78      isDisarmedData({ scope: "evaluate" })  (the guard keeps both values, F17)
```
The only refusal builder left in `extension/src` that sets a scope is `disarmed()` → `data: { scope: "all" }`
(`extension/src/safety.ts:202`); `safety-state.ts`'s `DISARMED_ALL` is `scope: "all"` too. **No producer of
`"evaluate"` remains.**

## Deviations from the phase doc / brief

1. **"Each failing at the S4 close"** (S4b.2): 7 of the 19 new tests are controls that pin unchanged behaviour (bridge
   off wins, JS on unchanged, other navigations, the attach set, F17) and pass at the base by construction; made
   discriminating by mutations M1/M2 above instead. The 12 tests that assert the new behaviour all fail at the base.
2. **The old-extension line keeps its own code prefix** (`DISARMED: …`, not `JS_DISABLED: …`) — see Proposed
   decision 1. The brief's "→ the same line" is met for the words after the code.
3. **S4's test text did change by one sanity line** (`s4-save-gate.test.ts:105`), though F6 said S4b would change none;
   the equality assertion F6 built is untouched.
4. **`docs/setup.md` outside § Safety still says the old code** and was left alone (lane is "Safety"): § Running
   JavaScript, "The JavaScript switch" paragraph (line 543: "refused `DISARMED` with scope `evaluate`"), and
   § Troubleshooting (line 898: "JavaScript is off (scope `evaluate`)"). For the step agent / S8 propagator.
   `CLAUDE.md` (25 codes, the Step 9 gotchas naming `scope:"evaluate"`) likewise needs the session agent.

## Proposed decisions

**2026-10-25 · S4b: an old extension's JavaScript-off refusal keeps Step 9's line, under its own code**
Decided: `safetyRefusalLine` renders `JS_DISABLED` as `JS_DISABLED: <body>` and an old extension's `DISARMED
{scope:"evaluate"}` as `DISARMED: <body>`, the body (Step 9's words) shared byte for byte. Why: every safety line
starts with the code the caller actually received (Step 9's three lines do; the MCP's failure lines do), so the agent
and a script never see a code that is not on the error; and the old-extension output stays byte-identical to Step 9,
so no Step 9 test or Run 13 expectation changes. Instead of: printing the `JS_DISABLED: …` line for both (a line
naming a code the error does not carry). Revisit if: the user wants one byte-identical line regardless of code.

**2026-10-25 · S4b: `JS_DISABLED` carries no `data`, and its message is Step 9's text unchanged**
Decided: `{code: "JS_DISABLED", message}` with no `data`; the message is the Step 9 `DISARMED_EVALUATE_MESSAGE` text
byte for byte (now `JS_DISABLED_MESSAGE`); the MCP/SDK line keeps Step 9's words after the code. Why: the code itself
now says which switch, so a `scope` would be redundant; 0.12 changes the code, not the meaning; keeping the words keeps
`docs/setup.md`, Run 13's pins and the agent's guidance stable. Instead of: `data: {scope: "evaluate"}` on the new code
(duplicates the code), or rewording to 0.12's paraphrase ("the user turned JavaScript off; every other tool still
works; ask them" — the existing line already says exactly that). Revisit if: a client needs to tell `evaluate` from
script-URL refusals apart (then a `data.kind` would be a contract change).

**2026-10-25 · S4b: `DISARMED_EVALUATE_MESSAGE` stays exported as an alias**
Decided: keep the Step 9 export name as an alias of `JS_DISABLED_MESSAGE`, with a dated comment. Why: the recipes'
history test imports it; the brief prefers keeping the import over editing a history helper. Instead of: renaming the
import in `recipes/test/s9-rules.test.ts`. Revisit if: S8's retirement removes the Run 13 helpers.

## Unfinished / notes for the verifier

- Nothing unfinished in the lane. Code uncommitted, as ordered.
- The worktree used for the red check was removed (junctions deleted non-recursively first; `node_modules` of the main
  tree checked intact; `git worktree list` shows only `main`).
- Pre-existing: `recipes/tsconfig.s6.json` fails at the base the same way (26 lines).
