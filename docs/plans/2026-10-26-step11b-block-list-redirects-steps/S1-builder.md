# Step 11b S1 — the DNR rule builder, pure · builder report

**Date:** 2026-10-26 · **Role:** builder (`docs/agent-rules.md` §6) · **Model / effort:** Opus 5.5, medium · **Tree:**
HEAD `8d6e68c`; the only tracked change before and after is `journal.md` (not mine).

## 1. Verdict

**DONE.** D1.1 met: 112-row case table green, the equivalence test covers every row in both scopes, three mutants
red (four variants run), the RE2 guard and the cap test pass, the scope guards pass, and no pattern text appears
outside the rules.

## 2. Outputs

Files (new, uncommitted, per the brief):
- `extension/src/safety-dnr.ts` (138 lines): `rulesOf(list, scope, idBase)`, `countRules(list)`,
  `fitsCaps(live, caps)`; types `DnrRule`, `DnrScope`, `DnrCounts`, `DnrCaps`, `DnrResourceType`. No `chrome.*` and
  no log call. Its only import is a type-only import of `BlockList`/`HostPattern` from `safety-match.ts`.
- `extension/test/safety-dnr.test.ts` (371 lines, 238 tests).

Total 509 new lines, under the 600 cap.

**Shape for S2/S3.**
- `rulesOf` returns ids `idBase … idBase + countRules(list).rules − 1`, contiguous, with the `requestDomains` rule
  first and then the regex rules.
- `countRules` is independent of scope.
- `fitsCaps([...countsOfEveryLiveCall], {sessionRules, regexRules})` sums across calls. S3 passes in the caps it reads
  at run time.
- An empty list, or one with only invalid or ignored lines, gives `[]` and counts `{0, 0}`.
- `rulesOf` throws for a non-positive or non-integer `idBase`, a negative `tabId` or an empty `extensionId`. The
  messages are fixed text with no pattern in them.

**The translation (Stage0.md §6 item 7):**
- Plain hosts become one `requestDomains` rule holding the canonical hosts, deduplicated.
- `*.`, `:port` and IP literals each become one anchored regex, deduplicated: `127.0.0.1` and `2130706433` give one
  rule.
- Every regex rule sets `isUrlFilterCaseSensitive: false` explicitly.
- A port pattern whose port is a scheme's default (80 → http/ws, 443 → https/wss, 21 → ftp) also matches that scheme
  with no port in the URL.
- The host may end in one trailing dot. Userinfo is allowed but optional.

**Counts.**
- `npm test` before: `Test Files 157 passed (157)` · `Tests 3845 passed (3845)`.
- `npm test` after: `Test Files 158 passed (158)` · `Tests 4085 passed (4085)`. That is +240: 238 in the new file
  and +2 in `extension/test/safety-static.test.ts`, whose per-file loop now also scans `safety-dnr.ts` for
  `console.` and `chrome.` calls (`readdirSync` filter `^safety(-[\w-]+)?\.ts$`). No test was removed.
- `npm run typecheck` exit 0. `npm run build` exit 0.
- `git status --short` after the build shows ` M …/journal.md` (pre-existing), `?? extension/src/safety-dnr.ts` and
  `?? extension/test/safety-dnr.test.ts`.

**Test-first.** I wrote the test file first. Run against the missing module it failed:
`npx vitest run extension/test/safety-dnr.test.ts` gave `Test Files 1 failed`, with no tests collected because the
import failed.

**Mutants.** The script `…/scratchpad/mutants.mjs` (session scratchpad, not in the repo) applies each mutant to
`safety-dnr.ts`, runs `npx vitest run extension/test/safety-dnr.test.ts`, and restores the original in a `finally`
block. After the script, the file was re-run green (238/238).

| Mutant | Change | Result |
|---|---|---|
| M1 dot-less suffix | `SUBDOMAINS` loses its `\\.` | 3 failed / 235 passed |
| M2a port ignored | `isPlain` ignores the port, so port patterns go to `requestDomains` | 12 failed / 226 |
| M2b port ignored | the regex always takes `(?::[0-9]+)?` | 13 failed / 225 |
| M3 `*.` matches the bare host | the subdomain prefix is always optional | 5 failed / 233 |

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **The table has 112 rows.** It holds the 104 rows of `stage0-s1-cases.md` verbatim, plus 8 rows X1–X8 added so
  each mutant also fails on a port, IP or `*.` form. Each row's expected value is first checked against the shipped
  `isUrlBlocked`/`parsePatternLine` (the "case table" describe block), then against the rules.
- **A draft row was dropped.** A ninth row, X9 (`http://1.127.0.0.1/`), was dropped before any run: WHATWG rejects
  that URL, so it tests nothing.
- **The n/a rows are pinned by id.** 12 rows have a URL that makes no http(s)/ws(s) request: 34, 36a, 36b, 39–41,
  43–46, P3b and P9. The test pins that list exactly, so the equivalence test cannot skip a row silently.
- **The emulation is stricter than the brief.** A regex row must give the same answer with the userinfo kept and
  with it removed, because whether Chrome's `regexFilter` sees the userinfo is unmeasured.
- **The download rules are also tested negatively.** An own-initiator `websocket` request to `127.0.0.1:9234` is not
  blocked (F-d), and neither is a request from another initiator. For the tab rules, another tab and a `sub_frame`
  are not blocked.

## 5. Proposed decisions

### 2026-10-26 · S1's builder exports a scope union, per-list counts and a cross-call cap check
**Decided:**
- `DnrScope = {kind:"tab", tabId} | {kind:"download", extensionId}`.
- `countRules(list)` gives `{rules, regexRules}` independent of scope.
- `fitsCaps(liveCounts[], caps)` sums over the live calls.
- Rule ids run contiguously from `idBase`, with the `requestDomains` rule first.
- Regexes are deduplicated per list.

**Why:** S2 can reserve exactly `countRules(list).rules` ids per call and check the caps before it calls
`updateSessionRules`. Deduplication keeps the regex count no higher than the gate's distinct patterns.

**Instead of:** a single rule per pattern (it wastes ids and caps); counting by building the rules.

**Revisit if:** S2 needs ids that are not contiguous.

**By:** Claude (proposed)

### 2026-10-26 · Regex rules set `isUrlFilterCaseSensitive: false` explicitly
**Decided:** set it explicitly, though Stage 0 measured case-insensitive as the default.

**Why:** the rule never depends on a default. It costs one key.

**Revisit if:** Chrome rejects the key on a session regex rule (S3/Run 17).

**By:** Claude (proposed)

## 6. Findings

- **The plain-host rule's size is unmeasured.** All plain hosts share one `requestDomains` rule, so a long list (the
  cap test uses 6000 hosts) is one rule. Stage 0 did not measure whether Chrome bounds the size of a
  `requestDomains` array. S3 or Run 17 could record one large list.
- **The regex memory limit is not covered.** Chrome's per-regex limit (`isRegexSupported` → `memoryLimitExceeded`) is
  not measured or tested here. The produced regexes are short (a host of at most 253 characters plus fixed parts),
  and a rejection fails closed in S2 (0.5).
- **Rows 34, 43 and 44 are blocked by the gate but have no request a rule can see.** Their URLs are `blob:`,
  `filesystem:` and `file:`. This is as Stage 0 recorded.
- No new runtime fact for a package `CLAUDE.md`. All the facts here are unit-level.

## 7. Handoff

- No processes left running. The mutant script restored the file, and that was checked by the re-run.
- Nothing is committed (the brief says no commit). The committer's file list is `extension/src/safety-dnr.ts` and
  `extension/test/safety-dnr.test.ts`.
- **For S2:** import `rulesOf`, `countRules`, `fitsCaps` and `DnrRule` from `./safety-dnr.js`. Reserve
  `countRules(list).rules` ids per call. A list with zero rules makes no API call (Stage0.md §6 item 6).
- **For the verifier:** the mutant anchors are in `mutants.mjs`, and §2 lists them in words.
