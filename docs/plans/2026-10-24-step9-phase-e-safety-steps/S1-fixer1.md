# Step 9 S1: fixer round 1 (the gate and the host matcher)

2026-10-24 · Fixer r1, Claude Opus 5.5 · On HEAD `9722cd6` plus the uncommitted S1 files, with S3 working
in the same tree. I edited only `extension/src/safety.ts`, `extension/src/safety-match.ts`,
`extension/test/safety-gate.test.ts`, `extension/test/safety-match-more.test.ts` and this report. I did not
edit the committed `extension/test/safety-match.test.ts` (its 50 cases still pass, 52 tests), `sw.ts`,
`S1-builder.md`, anything in `daemon/`, `sdk/` or `mcp/`, or the git index. Every mutation ran on scratch
copies under
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad\fx1`.

I fixed the five findings the step agent ruled on and disputed none of them. I left findings 3, 5(c), 5(d)
and 6 as they were, as ruled.

## 1. Findings fixed

### Finding 1 (MAJOR): a tab gone at receipt is allowed (#137 as written, option (a))
- **Change:** `extension/src/safety.ts:266-268`, after the state checks and the newTab/closeTab post rule:
  `if (phase === "receipt" && target.kind === "gone" && cls !== "network") return "allow";`.
  - Disarmed still returns `DISARMED {scope:"all"}` first.
  - JavaScript off with an `evaluate` still returns `DISARMED {scope:"evaluate"}` first.
  - A network `tabId` on a closed tab is still tested by its last known URL at receipt (phase doc 0.3, F30 note).
  - In phases `effect` and `post`, a gone tab is still refused when its last URL is blocked.
- **Doc comment updated:** `safety.ts:227-232`.
- **Tests added:** three, in the describe block "S1.2 required rows" at `safety-gate.test.ts:359-403`.
  - `gone(BLOCKED | OWN_PAGE | ALLOWED)` × armed at receipt → `allow`. Methods: click, snapshot, evaluate
    (JavaScript on), navigate, closeTab, with the list and with an empty list. Each case is checked with the
    phase given explicitly, with the default phase, and through `safetyDecisionAll`.
  - The same targets × {disarmed, disarmed with JavaScript off} → `DISARMED {scope:"all"}`. `evaluate` ×
    armed with JavaScript off → `DISARMED {scope:"evaluate"}`.
  - Phases effect and post: `gone(BLOCKED)` and `gone(OWN_PAGE)` → `DOMAIN_BLOCKED`. Network at receipt:
    `gone(BLOCKED)` and `gone(OWN_PAGE)` → `DOMAIN_BLOCKED`.
  - The existing network and post-check rows are unchanged and still pass.
- **Correction to `S1-builder.md`** (I did not edit that file):
  - §2 "How S2a calls the gate" still holds as written: pass `gone {lastUrl}` from the `TabInfoCache` when
    `tabs.get` fails.
  - For a tab method at receipt, that target now always yields `allow` while armed (and `evaluate` with
    JavaScript on). The handler's `TAB_UNKNOWN` then stands.
  - The `lastUrl` matters only for the network class at receipt and for the effect and post phases.
  - The builder's proposed decision "A tab gone at receipt with a known blocked last URL is refused, not left
    to the handler" is superseded for every class but `network`.

### Finding 2: `safetyDecisionAll([])` no longer fails open
- **Change:** `safety.ts:309-329`.
  - With no target, the classes `state` and `listTabs` are routed through `safetyDecision(…, {kind:"none"})`.
  - Every other class throws `safety gate: no target given for method "<m>"` in every state, including
    disarmed. This matches the single-target rule, where the form check comes before the state.
- **Test changed:** `safety-gate.test.ts:477-481`. It ended with two assertions on navigate with no target:
  `DISARMED` while disarmed and `"allow"` while armed. The second asserted the fail-open behaviour as
  intended, and the first depended on the same no-target path, so I removed both from that test.
  - This was the builder's own test from this same uncommitted stage, not a pre-existing expected text, so
    no expected text of a committed test changed.
- **Test added:** `safety-gate.test.ts:483-499`. It runs every method × 4 states: state and listTabs give
  the same answer as `none`; every other class throws, even with `url:"javascript:1"` and JavaScript off.

### Finding 4: rule 7 unwraps wrapper URLs and compares the scheme and host case-insensitively
- **Change:** `extension/src/safety-match.ts:224-260`.
  - A new private `innermostUrl` applies the URL parser's pre-steps: it removes tabs and newlines and trims
    C0 controls and spaces.
  - It then strips `blob:`, `filesystem:` and `view-source:` at most 4 levels deep, the same bound as
    `urlHost`, and returns null beyond that.
  - `isExtensionUrl` tests the innermost scheme.
  - `isOwnExtensionPage` parses the innermost URL and compares `hostname.toLowerCase()` with the id in lower
    case. The URL parser keeps the case of a non-special scheme's host.
- **Effect through the gate:**
  - `view-source:`, `blob:` and `filesystem:` around this extension's page, and an upper-case
    `CHROME-EXTENSION://<ID>/…`, are now blocked for acting (`DOMAIN_BLOCKED`) and hidden in rows
    (`redact:"blocked"`).
  - Navigation to any wrapped `chrome-extension://` URL is refused.
  - A wrapped page of another extension stays allowed for acting (case 41).
  - Stricter only: a URL that is not an extension page gives the same answer as before (tested with
    `view-source:https://…`, `blob:https://…` and `filesystem:https://…`).
- **Tests added:**
  - `safety-match-more.test.ts:116-156`: 7 own-page forms, 3 forms of another extension's page, and 7
    non-extension URLs, among them a query string that contains `chrome-extension://`.
  - `safety-gate.test.ts:501-515`: the same forms through the gate.

### Finding 5(b): `downloadStart` to a `chrome-extension://` URL is left to the handler
- **Change:** `safety.ts:290-293`. The own-page branch for `downloadStart` is removed. Only navigate and
  newTab refuse an extension URL (#138). `downloadStart`'s own URL is tested only by the block list (phase
  doc 0.4). `isUrlBlocked` already unwraps `blob:` and `filesystem:`, so a wrapper is tested by its inner URL.
- **Tests changed:**
  - `safety-gate.test.ts:279-292`. The assertion `own(OWN_PAGE)` → `DOMAIN_BLOCKED` became `allow` for
    `OWN_PAGE`, `OTHER_PAGE`, `blob:<OWN_PAGE>` and upper-case `OWN_PAGE`. Each is checked against the list
    and the empty list, in all three phases.
  - Added: `blob:https://bank.example/…` and `filesystem:https://www.bank.example/…` → `DOMAIN_BLOCKED`;
    `blob:https://a.example/…` → `allow`.
  - The matrix's `expected()` (`safety-gate.test.ts:138-140`) now says `downloadStart` × own → `allow`, with
    a comment. Without that change two matrix rows encoded the old refusal.
  - All three were the builder's tests from this uncommitted stage. The change follows ruling 4.

### Finding 8: the block list splits lines on `\r\n`, `\r` or `\n`
- **Change:** `safety-match.ts:151-152`, `text.split(/\r\n|\r|\n/)`.
- **Tests added:** `safety-match-more.test.ts:158-174`. CR, CRLF and LF each give 2 valid lines with the
  texts kept. Mixed endings with a blank line give `valid, ignored, valid, valid, ignored` and a count of 3.

## 2. Red before the fix

**First run, with the tests written and no fix applied:** `npx vitest run extension/test/safety-gate.test.ts
extension/test/safety-match-more.test.ts` (log `scratchpad\fixer1-red.txt`):
```
 Test Files  2 failed (2)
      Tests  17 failed | 385 passed (402)
```
The 17 failures:
- finding 5(b): 3 (the two matrix rows and the downloadStart test);
- finding 1: 1;
- finding 2: 1;
- finding 4: 11 (10 matcher rows and 1 gate test);
- finding 8: 2.

**Second run, each fix reverted one at a time:** `scratchpad\fx1\run-mutants.mjs` writes scratch copies of
both modules and runs the four S1 test files against them through a vitest `resolve.alias` config. The 5
static tests are not in this run, since they read the files on disk. Results:
```
control: Tests  468 passed (468)
F1-no-receipt-carveout: Tests  1 failed | 467 passed (468)
F1-carveout-incl-network: Tests  3 failed | 465 passed (468)
F2-empty-fails-open: Tests  1 failed | 467 passed (468)
F4-no-unwrap: Tests  9 failed | 459 passed (468)
F4-case-sensitive-host: Tests  3 failed | 465 passed (468)
F5b-downloadStart-own-page-refused: Tests  3 failed | 465 passed (468)
F8-split-crlf-only: Tests  2 failed | 466 passed (468)
```
Every reverted fix turns its own new or changed tests red. `F1-carveout-incl-network` also shows that the
network exception is pinned: applying the receipt carve-out to the network class as well fails the existing
F30 rows. The logs are in `scratchpad\fx1\<name>.log`.

## 3. Checks

**`npm run typecheck`: exit 2, all of it in S3's lane.**
- The chain stops at `sdk`: `sdk/test/safety.test.ts(195,27): error TS2339: Property 'safety' does not exist
  on type 'BridgeClient'`, and 5 more errors.
- Run per package:

| Package | Result |
|---|---|
| shared | exit 0 |
| daemon | exit 0 |
| sdk | exit 2 (6 errors, all in `sdk/test/safety.test.ts`) |
| mcp | exit 2 (6 errors, all in `mcp/test/safety-cross.test.ts`) |
| extension | exit 0 |

- These are S3's in-flight files. I am reporting them, not fixing them.
- The S1 test files are not covered by `extension/tsconfig.json`, which includes `src` only. A scratch
  tsconfig that extends it and includes `extension/src/safety*.ts` and `extension/test/safety*.test.ts` gave
  exit 0.

**`npm test`: exit 0.**
```
 Test Files  96 passed (96)
      Tests  2328 passed (2328)
```
- The S1 files hold 473 tests: `safety-gate` 344, `safety-match` 52, `safety-match-more` 58,
  `safety-redact` 14, `safety-static` 5.
- That is up from the verifier's 447: +5 gate tests and +21 matcher tests. No test was removed. Two
  assertions were dropped inside one existing test (finding 2).

**`npm run build`: exit 0** (`built extension → dist/`).
- `git status --short` was identical before and after the build. No tracked file changed.
- `grep -c safety extension/dist/sw.js` = 0: nothing imports the gate yet.

## 4. Exported API

No exported signature changed. Behaviour changed in three places:
- `safetyDecisionAll` now throws for an empty `targets` unless the class is `state` or `listTabs`.
- `isExtensionUrl` and `isOwnExtensionPage` now unwrap wrapper URLs and compare the scheme and host
  case-insensitively.
- `parseBlockList` now also splits lines on a lone `\r`.

`innermostUrl` is private.

## 5. Proposed decisions

### 2026-10-24 · Rule 7's unwrap uses rule 5's bound, so a URL wrapped five or more times is not an extension URL
**Decided:** `isExtensionUrl` and `isOwnExtensionPage` unwrap `blob:`, `filesystem:` and `view-source:` at
most 4 levels deep, the same bound as `urlHost`. A deeper URL is treated as not an extension URL.
**Why:** the ruling allows stricter-only changes: no reply may change for a URL that is not an extension page.
Refusing every deeply wrapped URL would refuse `view-source:`×5 around an `https:` page, which today is
allowed. Chrome does not open nested `view-source:`, and a `blob:` URL can only be minted by its origin.
**Instead of:** treating an over-deep wrapper as an extension URL (fail closed).
**Revisit if:** a live row shows Chrome opening a URL wrapped more than four levels deep.

### 2026-10-24 · `safetyDecisionAll` with no target checks the form before the state
**Decided:** for a class other than `state` or `listTabs`, an empty target list throws in every state,
disarmed included. It does not return `DISARMED` first.
**Why:** this matches `safetyDecision`, which checks the target form before the state. A wiring slip should
surface in every state, not only while armed. S2a turns the throw into `INTERNAL`.
**Instead of:** checking the state first and throwing only while armed.
**Revisit if:** S2a has a path that legitimately has no target for a tab method, such as a refusal that must
answer `DISARMED` before the tab is read. Give that path its own target form rather than an empty list.
