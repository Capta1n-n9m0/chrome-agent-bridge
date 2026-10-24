# Step 9 S1 — builder report (the gate and the host matcher, pure, TDD)

2026-10-24 · Builder, Claude Opus 5.5 · Baseline HEAD `a3ec4f5` (1783 tests / 86 files) · S3 was working at the
same time in `daemon/ sdk/ mcp/`.

## 1. Files built

- `extension/src/safety-match.ts` (new): the block-list parser and matcher, stage0-audit.md §5 rules 1–7. It also
  holds the URL helpers: `urlHost`, `urlScheme`, `isExtensionUrl`, `isOwnExtensionPage`.
- `extension/src/safety.ts` (new): the method table, the S1.1 source scan, `safetyDecision` and the post-check,
  the `listTabs` and tab-event redaction, and the network-log filter predicate.
- Tests (all new; 447 tests in 5 files):
  - `extension/test/safety-match.test.ts`: 52 tests. These are the 50 cases of §5, committed first, plus a
    test that checks all 50 are covered.
  - `extension/test/safety-match-more.test.ts`: 37 tests. Dot-boundary attacks, invalid forms, the per-line
    result, and rule 5's helpers.
  - `extension/test/safety-gate.test.ts`: 339 tests. S1.1, the S1.2 matrix, the network forms, #138, the
    post-check, the required rows, the "armed + empty list allows everything" test, and shapes and messages.
  - `extension/test/safety-redact.test.ts`: 14 tests. Row and event redaction, and the network filter.
  - `extension/test/safety-static.test.ts`: 5 tests. No `console.` and no `chrome.` call in
    `extension/src/safety*.ts`.
- Nothing else was touched. `sw.ts` and `router.ts` are unchanged (sha256 of `sw.ts` is `6f8919ad…` before and
  after; see §4).

## 2. Exported API (for S2a)

`safety-match.ts`:
- `parsePatternLine(text: string): PatternLine`. Returns `{kind:"ignored"|"invalid", text}` or
  `{kind:"valid", text, pattern: HostPattern}`.
- `parseBlockList(text: string | readonly string[]): BlockList`. Returns `{lines, patterns, blockedCount}`;
  `blockedCount` counts valid lines only (F23).
- `EMPTY_BLOCK_LIST: BlockList`.
- `HostPattern`: `{host, subdomainsOnly, port?, ip}`.
- `urlHost(url: string): UrlHost | null`. `UrlHost` is `{host, ip, port?}`; rule 5 (unwraps `blob:`,
  `filesystem:`, `view-source:`).
- `patternMatches(p: HostPattern, h: UrlHost): boolean`. Matches only at a dot boundary.
- `isUrlBlocked(url: string | undefined, list: BlockList): boolean`.
- `urlScheme(url: string): string | null`. Strips tabs and newlines, trims leading C0 control characters and
  spaces, and lower-cases.
- `isExtensionUrl(url?: string): boolean`. True for any `chrome-extension:` URL.
- `isOwnExtensionPage(url: string | undefined, extensionId: string): boolean`.

`safety.ts`:
- `type MethodClass = "tab"|"navigate"|"evaluate"|"newTab"|"closeTab"|"listTabs"|"network"|"downloadStart"|"state"`.
- `METHOD_CLASSES: Readonly<Record<string, MethodClass>>`. It has a null prototype and is frozen.
- `methodClass(method: string): MethodClass`. Throws `safety gate: method "<m>" has no safety class`.
  `Router.on` must call this at S2a (#147).
- `routerMethodNames(source: string): {names: string[]; nonLiteral: string[]}`.
- `type SafetyTarget`: `live {urls}`, `replaced {urls}`, `gone {lastUrl?}`, `own {url?}` or `none`.
- `TARGETS_BY_CLASS: Record<MethodClass, SafetyTargetKind[]>`. A target form that the class does not take
  throws.
- `SafetySwitches {armed, evaluate}`, `SafetyContext {extensionId, blockList}`,
  `SafetyPhase = "receipt"|"effect"|"post"`.
- `SafetyDecision = "allow" | {redact: HiddenReason} | SafetyRefusal`, where `SafetyRefusal` is
  `{code: "DISARMED"|"DOMAIN_BLOCKED", message, data?: DisarmedData}`.
- `isRefusal(d)`.
- `safetyDecision(method, params, target, state, ctx, phase = "receipt"): SafetyDecision`.
- `postCheck(method, params, target, state, ctx): SafetyDecision`. This is the same as `phase: "post"`.
- `safetyDecisionAll(method, params, targets[], state, ctx, phase?)`. Returns the first decision that is not
  `"allow"`. It is for `navigate`, which is checked against its tab and then its own URL.
- `ownTarget(method, params): SafetyTarget`. Returns `own {url?}` for navigate/newTab/downloadStart and `none`
  for every other method.
- `stateUnreadableRefusal(): SafetyRefusal`. This is F10's fail-closed refusal: `DISARMED {scope:"all"}`.
- `refusalError(r): BridgeError`.
- Message constants: `DISARMED_ALL_MESSAGE`, `DISARMED_EVALUATE_MESSAGE`, `STATE_UNREADABLE_MESSAGE`,
  `BLOCKED_TAB_MESSAGE`, `OWN_PAGE_MESSAGE`, `BLOCKED_URL_MESSAGE`, `EXTENSION_URL_MESSAGE`.
- `hiddenReason(urls, state, ctx): HiddenReason | null`.
- `redactListTabsRow(row, state, ctx, pendingUrl?): ExtensionListTabsRow`. Returns the same object when
  nothing is hidden.
- `redactTabCreated(params, state, ctx, urls = []): TabCreatedParams`. Sets `url` to `""` and adds no marker
  (#146).
- `redactTabRemoved(params, state, ctx): TabRemovedParams`. Returns `{tabId, hidden}` when the tab is hidden.
- `NetworkUrls {url, redirectUrl?, initiator?}`.
- `networkEntryBlocked(entry, tabTopUrl, ctx): boolean`.
- `dropAtIngest(entry, tabTopUrl, state, ctx): boolean`.
- `keepInQuery(entry, tabTopUrl, ctx): boolean`.

Imported from shared, not redefined: `ErrorCodes`, `DisarmedData`, `HiddenReason`, `SafetyScope`,
`ExtensionListTabsRow`, `TabCreatedParams`, `TabRemovedParams`.

**How S2a calls the gate:**
- At receipt, for a tab method: `live {urls:[tab.url, tab.pendingUrl]}`, or `gone {lastUrl}` from the
  `TabInfoCache` when `tabs.get` fails.
- For `navigate`: `safetyDecisionAll` over the tab target and then `ownTarget`.
- For the network methods: a `tabId` gives `live` or `gone`; `scope:"all"` or an `id` lookup gives `none`.
- For the download methods: `downloadStart` gives `ownTarget`, and its post-check uses `own {res.url}`.
  `downloadChunk` and `downloadEnd` give `none`.
- For `listTabs`: `none` decides `{redact:"disarmed"}`; then `redactListTabsRow` runs on each row.

## 3. The method table (method → class)

| Class | Methods |
|---|---|
| `tab` | snapshot, screenshot, click, type, scroll, hover, selectOption, pressKey, back, forward, focusTab, waitFor, locate |
| `navigate` | navigate |
| `evaluate` | evaluate |
| `newTab` | newTab |
| `closeTab` | closeTab |
| `listTabs` | listTabs |
| `network` | networkRequests, networkClear |
| `downloadStart` | downloadStart |
| `state` | downloadChunk, downloadEnd |

That is 23 methods, the same set as the `router.on(` calls in `sw.ts`. The test asserts that the two sets are
equal and that there are 23.

## 4. Evidence

**Test-first commit:** `9722cd6` ("test(extension): S1 — matcher cases first (Step 9)"). It contains
`extension/test/safety-match.test.ts` alone and is the parent of everything below. It was red before the
matcher existed (`npx vitest run extension/test/safety-match.test.ts`, 14:12:03):
```
 FAIL  extension/test/safety-match.test.ts [ extension/test/safety-match.test.ts ]
Error: Failed to load url ../src/safety-match.js (resolved id: ../src/safety-match.js) in …/extension/test/safety-match.test.ts. Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```
After `safety-match.ts` was written (14:12:46): `Test Files 1 passed (1) · Tests 52 passed (52)`.

**The gate and redaction tests were also red first** (`npx vitest run extension/test/safety`, before
`safety.ts` existed): `Test Files 3 failed | 2 passed (5)`. The two failing suites were
`safety-gate.test.ts` and `safety-redact.test.ts` (`Failed to load url ../src/safety.js`). The third failure was
`safety-static` › "the scan sees the safety modules" (`expected [ 'safety-match.ts' ] to include 'safety.ts'`).
After `safety.ts` was written: `5 passed (5) · 447 passed (447)`.

**S1.1 mutation on the real `sw.ts`.** I used `sed -i` to add `router.on("bogus", downloadEnd);` after line 42,
then ran `npx vitest run extension/test/safety-gate.test.ts -t "S1.1"`:
```
 × S1.1: … > every name passed to router.on( in extension/src/sw.ts is in the table (and only those)
AssertionError: expected [ 'navigate', 'snapshot', …(22) ] to have a length of 23 but got 24
      Tests  1 failed | 4 passed | 334 skipped (339)
```
Then I reverted it. `git checkout -- extension/src/sw.ts` wrote CRLF line endings (`core.autocrlf=true`), so
I stripped the `\r` characters to get back the original LF bytes. The sha256 is `6f8919ad…5` before and after,
and it equals `git cat-file -p HEAD:extension/src/sw.ts | sha256sum`. That left `git status` showing a
stat-only ` M`: `git diff` was empty and `hash-object` equalled the index blob. I ran `git add` on the file,
which has identical content, to refresh the index's stat cache. `git diff --cached` is empty and `sw.ts` is
clean.

A permanent test also checks the same thing on a mutated copy of the source ("mutation: a source with an extra
router.on("bogus", …) fails the classification").

**Matcher mutation (extra check).** I replaced `endsWith("." + p.host)` with the forbidden dot-less
`endsWith(p.host)`. Four tests failed: case 3 (`notbank.example`), case 5 (`*.bank.example` against the bare
host), and two of the dot-boundary tests in `safety-match-more`. The file was restored from a copy.

**Final runs (main tree, 14:18):**
- `npm run typecheck`: exit 0 (all five projects, chained).
- `npm test`: exit 1. `Test Files 1 failed | 92 passed (93)`, `Tests 1 failed | 2250 passed (2251)`.
  - The one failure is S3's work in progress, not S1's: `daemon/test/safety.test.ts` › "Step 9 S3 — the daemon
    relays and honours the safety state › a malformed safetyState is dropped with a content-free log line"
    (3066 ms). It was not touched (out of lane).
  - The count adds up: 1783 (baseline) + 447 (S1, 5 files) + 21 (S3's 2 new daemon files) = 2251, and
    86 + 5 + 2 = 93 files.
  - S1's own files all pass: gate 339, redact 14, match 52, match-more 37, static 5.
- `npm run build`: exit 0 (`built extension → dist/`). `git status --short` was identical before and after the
  build, so the build changed no tracked file. `extension/dist/sw.js` contains no "safety", because `sw.ts`
  does not import the gate until S2a.
- `git status --short` at the end: my 6 untracked files, plus S3's (`daemon/src/{handles,intercept,wsHost}.ts`
  modified, 2 daemon tests, the S3 ledger and brief) and the S1 ledger. Nothing is staged.

## 5. Deviations from the phase doc and the brief

1. The signature is `safetyDecision(method, params, target, state, ctx, phase)`. The extension id and the block
   list come in through `ctx`, as the brief allows. `phase` selects the post-check rule (newTab and closeTab
   check only the state at the post-check). `params` is in the F7 signature but unused today: the gate reads
   the target.
2. `navigate` needs two targets (its tab and its own URL), so `safetyDecisionAll` was added. F7's single
   `target` stays as it is.
3. S1.1's other half (`Router.on` throws on an unclassified name) is not built: it belongs to S2a (#147).
   `methodClass` is the lookup that throws, ready for it.

## 6. Proposed decisions

### 2026-10-24 · S1's module layout: the matcher in `safety-match.ts`, the gate in `safety.ts`
**Decided:** two pure modules. The matcher and the URL helpers go in `safety-match.ts`, which the options page
(S2b) can import without the gate. The table, the gate, the redaction and the network predicate go in
`safety.ts`.
**Why:** the options page needs only the parser. Splitting them also let the matcher commit follow the
cases-first commit at once.
**Instead of:** one `safety.ts`.
**Revisit if:** S2b's options bundle should not carry the gate either way.
**By:** Claude

### 2026-10-24 · `downloadChunk` and `downloadEnd` are checked on the state only (for step-agent review: what is gated)
**Decided:** class `state`. They are refused `DISARMED {scope:"all"}` while disarmed and are never refused by
the block list (they carry no URL; `downloadStart` and its final URL were already checked).
**Why:** 0.3 says "the network and download methods are refused while disarmed", and the store is cleared at
disarm anyway. This is the conservative reading. Nothing changes while armed.
**Instead of:** leaving them free while disarmed (a pull of bytes fetched before the disarm would go through).
**Revisit if:** a download pulled after a quick re-arm is wanted.
**By:** Claude (flagged: gating)

### 2026-10-24 · A tab gone at receipt with a known blocked last URL is refused, not left to the handler (for step-agent review)
**Decided:** a `gone {lastUrl}` target follows one rule in every phase. If the last URL is blocked (or is one of
this extension's pages), the call is refused `DOMAIN_BLOCKED`. If no URL is known, or it is not blocked, the call
is allowed, and the handler answers `TAB_UNKNOWN` as today.
**Why:** this is stricter than "left to the handler" only when the list matches. S1.2's required row
("unreadable at receipt × armed → allow") holds for no known URL and for an unblocked one. Nothing changes with
an empty list.
**Instead of:** always allowing at receipt.
**Revisit if:** the user prefers `TAB_UNKNOWN` there. The difference is which code answers, for a tab that no
longer exists.
**By:** Claude (flagged: the refusal code chosen)

### 2026-10-24 · A target form a class does not take throws (fails closed)
**Decided:** `TARGETS_BY_CLASS` lists the forms each class takes. For example, a tab method given `none`, or
`downloadChunk` given `live`, throws an `Error` naming the method and the target kind, never a URL. The router
then answers `INTERNAL`.
**Why:** a wiring slip in S2a must refuse, never quietly allow.
**Instead of:** treating an unexpected form as `none` (an allow).
**Revisit if:** S2a needs a form the table lacks. Add it to the table; do not relax the check.
**By:** Claude

### 2026-10-24 · Matcher details §5 leaves implicit (for user review: the pattern grammar)
**Decided:**
- A URL is tested by host only for `http`, `https`, `ws`, `wss` and `ftp` (ftp's effective port is 21), and for
  `file:` with a host but no port. Every other scheme has no host and never matches (`chrome:`,
  `chrome-extension:`, `about:`, `data:`, `javascript:`, `mailto:`).
- `blob:`, `filesystem:` and `view-source:` are unwrapped up to 4 levels deep. A deeper URL never matches.
- These patterns are invalid: an empty label (`a..b`, `.a`, `a..`), `*.` alone, `*.*.x`, `*.` before an IP
  literal, a pasted URL of another scheme (`ftp://…`), and a pasted URL whose host fails the name grammar
  (`https://*.x/`).
- A purely numeric name that the URL parser reads as IPv4 is canonicalised and treated as an IP literal
  (`2130706433` becomes `127.0.0.1`).
- An IP-literal host never matches a name pattern, and a name host never matches an IP pattern.
**Why:** each choice is the stricter or the only consistent reading of rules 3–6. The matcher never matches by
substring. The empty list is unaffected.
**Instead of:** treating `chrome:` and `chrome-extension:` hosts as hosts (this would let a pattern spelling an
extension id match, which conflicts with rule 5).
**Revisit if:** the user wants `ftp` dropped or deeper nesting allowed.
**By:** Claude (contract-level: the grammar, listed for the user)

### 2026-10-24 · `downloadStart` URLs: this extension's pages blocked, other extension URLs left to `BAD_PARAMS` (for step-agent review)
**Decided:** `navigate` and `newTab` to any `chrome-extension://` URL are refused `DOMAIN_BLOCKED` (#138).
`downloadStart` is refused only for this extension's own pages (and the block list). Another extension's URL
still gets the handler's `BAD_PARAMS`.
**Why:** #138 names the any-id rule for `navigate`/`newTab` only. F38 asks for the own-page block "for
uniformity". Keeping today's answer for other ids follows the conservative rule's second property (existing
behaviour unchanged).
**Instead of:** the any-id rule for `downloadStart` too (it would change today's `BAD_PARAMS`).
**Revisit if:** the user takes #138's wider alternative.
**By:** Claude (flagged)

### 2026-10-24 · The network filter also drops entries of a tab showing this extension's page (for step-agent review: what the log records)
**Decided:** `networkEntryBlocked` treats the tab's top-level URL as blocked when it is one of this extension's
own pages too (#134 counts own pages as "blocked"). An entry's own URLs are tested against the list only:
`chrome-extension:` traffic is already dropped by `isOwnTraffic`.
**Why:** this is the stricter reading. The options page makes no other requests, so nothing changes today.
**Instead of:** testing the tab URL against the list alone.
**Revisit if:** the user disagrees that own pages count as blocked for the log.
**By:** Claude (flagged)

### 2026-10-24 · Script-URL detection while JavaScript is off reads the scheme as Chrome would
**Decided:** `urlScheme` first removes tabs and newlines and trims leading C0 control characters and spaces (the
WHATWG parser's pre-steps), then compares the scheme case-insensitively. So `java\tscript:`, ` JavaScript:` and
`\0data:` are all refused while JavaScript is off.
**Why:** a naive prefix check would let these through as bypasses.
**Instead of:** `startsWith("javascript:")`.
**Revisit if:** never; this is mechanical.
**By:** Claude

### 2026-10-24 · Refusal messages
**Decided:** the wording of the `*_MESSAGE` constants in `safety.ts`. `"all"` says the bridge is off and to stop
and ask. `"evaluate"` says JavaScript is off and that every other tool still works (#133). Blocked, own-page,
extension-URL and unreadable-state refusals each have their own message. None contains a URL, a pattern, a
title or an id (a test asserts this). `DOMAIN_BLOCKED` carries no `data`.
**Why:** #133 requires the two scopes to read differently. 0.7 forbids URLs in output.
**Instead of:** one generic message.
**Revisit if:** S3's MCP and SDK wording should match exactly. Then align the texts.
**By:** Claude

## 7. Unfinished, and notes for S2a

- Nothing in S1's lane is unfinished. S1.1's `Router.on` guard is S2a's (#147).
- The extension `tsconfig` includes only `src`, so the test files are type-checked by nothing except vitest's
  transpile (as before).
- The S3 failure above is reported here and was not fixed: `daemon/test/safety.test.ts`, "a malformed
  safetyState is dropped with a content-free log line".
