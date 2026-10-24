# Step 9 S1: independent verifier report (the gate and the host matcher)

2026-10-24 · Verifier, Claude Opus 5.5 · Read at HEAD `9722cd6` plus the uncommitted S1 files
(`extension/src/safety.ts` sha256 `e439c295d0b1289f…`, `extension/src/safety-match.ts` `d70a424b13944758…`).
S3 was working in the same tree at the same time. I edited no tracked file and no lane file, and I did not
touch the git index. Every mutation ran on a scratch copy under
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad`
(`mut/`, `s11/`, `st/`), loaded through vitest `resolve.alias`.

**Verdict: FAIL.** There is one MAJOR finding (1). Every other check passes. The fix for finding 1 is a few
lines plus one test, or the step agent can send it to the user as an Open decision.

## 1. Re-runs and counts

| Check | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` | exit 0 (shared, daemon, sdk, mcp, extension) |
| tests | `npx vitest run --reporter=verbose` | exit 0 · **Test Files 94 passed (94) · Tests 2269 passed (2269)** |
| build | `npm run build` | exit 0 (`built extension → dist/`). `git status --short` was identical before and after. `grep -c safety extension/dist/sw.js` = 0 (nothing imports the gate yet) |
| S1 tests type-check | `npx tsc -p <scratch>/tsconfig.tests.json` (extends `extension/tsconfig.json`; includes `safety*.ts` and `test/safety-*.test.ts`) | exit 0. The extension's own tsconfig covers `src` only, so I ran this separately |

How the counts break down (from the verbose run, counting `✓` lines per file):
- S1 has 5 new files and 447 tests: `safety-gate` 339, `safety-match` 52, `safety-match-more` 37,
  `safety-redact` 14, `safety-static` 5.
- S3 has 3 new files and 39 tests: `daemon/test/safety.test.ts` 19, `daemon/test/safety-surface.test.ts` 2,
  `sdk/test/safety.test.ts` 18.
- Total: 1783 + 447 + 39 = **2269** tests ✓; 86 + 5 + 3 = **94** files ✓. No test was removed.
- The builder's report recorded one S3 failure, in `daemon/test/safety.test.ts`. It passes in my run.
- After my run, S3 added `mcp/test/safety{,-cross}.test.ts` and changed `mcp/src/tools/registry.ts`. My counts
  predate those files. They are S3's work and I did not judge them.

## 2. Findings

### 1. MAJOR: the gate refuses a tab gone at receipt when its last URL is blocked, against #137 and a required S1.2 row
- **Location:** `extension/src/safety.ts:276-281` (the `gone` arm has no receipt carve-out);
  `S1-builder.md` §2, "How S2a calls the gate" (it tells S2a to pass `gone {lastUrl}` from the cache when
  `tabs.get` fails at receipt); the test `extension/test/safety-gate.test.ts:342-345`, which tries only
  `gone()` with no URL.
- **What is written:** decisions.md #137 says: "At receipt an unreadable tab is left to the handler (today's
  `TAB_UNKNOWN`)". The required row in phase doc l. 453-454 / #141 says: "a tab unreadable at receipt × armed
  → allow (the handler answers `TAB_UNKNOWN` as today)". Neither qualifies this by the URL or by the list.
- **Evidence:** a scratch probe (`s11/gate-probe.test.ts`, alias config) gave:
  ```
  F1 receipt gone(blocked) click list: {"code":"DOMAIN_BLOCKED"}
  F1 receipt gone(own page) click empty: {"code":"DOMAIN_BLOCKED"}
  F1 receipt gone() click list: "allow"
  ```
  Mutant M17 makes `gone` always allow. It fails only `networkRequests`/`networkClear` "tabId by the tab's URL"
  and the post-check row "tab gone with a last URL that is blocked → DOMAIN_BLOCKED". No test pins the
  receipt behaviour for a known blocked URL.
- **Judgement:** the change is stricter only. With an empty list it changes a reply in one case: a tab whose
  last URL is one of this extension's own pages now answers `DOMAIN_BLOCKED` where today it answers
  `TAB_UNKNOWN`. Even so, it departs from a recorded contract decision, and "a code chosen for a refusal" is on
  the ESCALATION list. The builder flagged it for step-agent review rather than applying #137 as written.
- **Note on the network methods:** they differ by design. Phase doc 0.3 (F30) says a network `tabId` on a
  closed tab is refused `DOMAIN_BLOCKED` when the last known URL is blocked. That part of the builder's rule is
  correct for the `network` class.
- **Suggested fix:** pick one.
  - (a) After the state checks, add `if (phase === "receipt" && target.kind === "gone" && cls !== "network")
    return "allow";`. Add receipt tests with `gone(BLOCKED)` and `gone(OWN_PAGE)` that expect `allow`, and keep
    the existing network and post-check rows.
  - (b) Keep the code. The step agent then records the builder's rule under Open decisions for the user
    before S1 closes, and the required row's test is reworded only after the user rules.
  - Do not reword the row to match the code.

### 2. MINOR: `safetyDecisionAll` with no targets fails open
- **Location:** `extension/src/safety.ts:321-327`; the test asserts the behaviour at
  `extension/test/safety-gate.test.ts:424`.
- **Evidence:** the probe gave:
  ```
  F2 all([]) click armed: "allow"
  F2 all([]) navigate JS off: "allow"   (url "javascript:1" in params)
  F2 single none click: throws
  ```
- **Problem:** the builder's own rule is that a target form a class does not take must throw (fail closed). An
  empty list skips that check, and for `navigate`/`newTab` it also skips the check for script URLs while
  JavaScript is off.
- **Suggested fix:** throw on `[]` unless the class is `state` or `listTabs`, or route `[]` through
  `safetyDecision(…, {kind:"none"})`. That call already throws for the tab classes.

### 3. MINOR: two registration forms escape the S1.1 source scan
- **Location:** `extension/src/safety.ts:93`.
- **Evidence:** I ran a scratch copy of `safety-gate.test.ts` with `SW_PATH` pointed at mutated copies of
  `sw.ts`, running `-t "S1.1"`. Result: `Test Files 3 failed | 2 passed (5)`.
  - Red (caught): (a) `router.on("bogus", downloadEnd);`, which reported "to have a length of 23 but got 24";
    (b) the same call split over lines as `router.on(\n  "bogus2",\n  downloadEnd,\n);`; (d)
    `router.on(extra, downloadEnd);`, which reported "expected [ 'extra' ] to deeply equal []".
  - Green (escaped): (c) `router["on"]("bogus3", downloadEnd);` and (e)
    `router.on.call(router, "bogus5", downloadEnd);`.
- **What the scan does handle:** single quotes and template literals are caught (the builder's test, l. 98-103).
  A comma inside a string name ends up in `nonLiteral` and fails.
- **Judgement:** the scan is weaker than the syntax `sw.ts` could use. #147 already closes the gap at S2a, by
  making `Router.on` throw through `methodClass`.
- **Suggested fix:** at S2a, keep that throw. Optionally, make the scan also fail on `router[` or on `.on.call`
  / `.on.bind`.

### 4. MINOR: the own-page rule does not unwrap wrapper URLs and compares the opaque host case-sensitively
- **Location:** `extension/src/safety-match.ts:225-234`.
- **Evidence:** the attack script and the probe gave:
  ```
  F4 navigate own(view-source:chrome-extension:/…) empty: "allow"
  F4 snapshot live(view-source:chrome-extension:/…) empty: "allow"
  F4 navigate own(blob:chrome-extension://abcdef…) empty: "allow"
  own "CHROME-EXTENSION://ABCD…/options.html" isExt true isOwn false
  ```
  The WHATWG URL parser keeps the opaque host's case. Chrome treats `chrome-extension` as a standard scheme and
  lower-cases it.
- **Impact:**
  - I know of no way to re-arm through this. A view-source page shows source only and cannot be scripted.
  - A `blob:chrome-extension://<own>/…` URL can only be minted by the extension's own pages.
  - An upper-case `chrome-extension://` URL is still refused for `navigate` and `newTab` (by `isExtensionUrl`),
    and `downloadStart` refuses non-http(s) URLs with `BAD_PARAMS`.
  - Chrome's answer to `tabs.update` on a `view-source:chrome-extension://` URL has not been measured.
- **Suggested fix:** this is stricter only, and it changes what is gated, so the step agent should list it.
  Unwrap `blob:`, `filesystem:` and `view-source:` in `isExtensionUrl` and `isOwnExtensionPage` (as rule 5
  does), and lower-case the host before comparing. Alternatively, record that rule 7 is literal and add a
  SAFE row for it in S4.

### 5. MINOR: builder proposed decisions that change what is gated (ESCALATION list)
The builder flagged each of these. The step agent must list them under Open decisions, not settle them alone.
- (a) The gone-at-receipt refusal: finding 1.
- (b) `downloadStart` to this extension's own page now answers `DOMAIN_BLOCKED`. Today the handler answers
  `BAD_PARAMS` (`handlers/download.ts:19` requires http(s)).
  - Probe: `F5b downloadStart own page empty: {"code":"DOMAIN_BLOCKED"}`.
  - This changes a reply while armed with JavaScript on and an empty list. It falls within the own-page
    exception, but it is a code chosen for a refusal.
- (c) The network filter drops entries whose tab's top-level URL is this extension's own page. This changes
  what the log records.
- (d) Matcher details beyond §5: `ftp:` is tested with port 21 (rule 5 names only http/https/ws/wss); wrappers
  are unwrapped at most 4 levels deep; a numeric name is read as IPv4. These are the grammar (#135),
  contract-level.
- (e) `downloadChunk` and `downloadEnd` are in class `state`, refused while disarmed. This follows 0.3's text
  ("the network and download methods") and is **not** a change. No escalation is needed.

### 6. NIT: `newTab` and `network` accept the `none` target, so a wiring slip silently skips the URL check
- **Location:** `extension/src/safety.ts:130,133`.
- **Evidence:** the probe gave `F6 newTab none with url: "allow"` (with params `url` set to a blocked host).
- **Suggested fix:** at S2a, have `ownTarget` be the only producer of `newTab`'s target, and test that.

### 7. NIT: the builder's S1.1 mutation touched the tracked file and the index during concurrent S3 work
- **What happened:** per its report §4, the builder ran `sed -i` on the real `sw.ts`, then `git checkout --`,
  then `git add` on `sw.ts` to refresh the index.
- **Current state:** the content is intact. `sha256(sw.ts)` = `6f8919ad…` = `git show HEAD:extension/src/sw.ts |
  sha256sum`, and `git diff --cached` is empty.
- **Suggested fix:** next time, use a scratch copy. The permanent string-mutation test (l. 90-96) already
  covers the case.

### 8. NIT: line-splitting and label-length edge cases
- `parseBlockList` splits on `\r?\n` only. `"bank.example\r*.sub.test"` gives one invalid line with count 0.
  Browsers normalise textarea values to LF, so this is probably moot, and it fails closed.
- A 300-character label is accepted as valid, because the URL parser accepts it. It matches nothing real.

## 3. My adversarial matcher cases (task 3)

The script is `scratchpad/attack.ts`, run with `node --import tsx`; the output is in `attack-out.txt`.
**78 URL rows, 0 unexpected results.** **No case matched by substring or by a lookalike, so there is no
CRITICAL finding.**

Rows that correctly did **not** match:

| Kind | URLs or patterns tested |
|---|---|
| Lookalikes | `notbank.`, `bank.examplex`, `xbank.`, `bank.example.evil.test`, `bank-example.test` |
| Pattern is a suffix of the host | `ank.example`, `*.ank.example`, `xample` |
| Name in the path, query or fragment | path, query and fragment forms |
| Userinfo tricks | `https://bank.example@evil.test/`, `https://bank.example:x@evil.test/`, `%40` encoding |
| Backslash leaving the host on evil | `https://evil.test\@bank.example/` |
| Homoglyph | Cyrillic `а` |
| ASCII lookalike of an IDN, both directions | `bucher` vs `bücher` |
| IP near-misses | `127.0.0.10`; `0.0.1`, `0.1` and `1` as patterns; `127.0.0.1.evil.test` |
| IPv4-mapped IPv6 vs IPv4 | `[::ffff:127.0.0.1]` against `127.0.0.1` |
| IPv6 zone id | an invalid URL, never matches |
| Wrapped five levels deep | `view-source:` × 5 |
| Opaque blob | `blob:null/…` |
| URLs with no host | `file:///…`, `data:`, `javascript:`, `about:`, `mailto:`, `intent:`, `chrome:`, an empty URL, a relative URL, a scheme-relative URL |
| Long URL | a 10 000-character host (does match `bank.example`, at a dot boundary) |

Rows that correctly **did** match:

| Kind | URLs or patterns tested |
|---|---|
| Userinfo before the real host | `https://evil.test@bank.example/` |
| Backslashes in a special scheme | backslash path forms |
| Mixed case | both the pattern and the URL |
| IDN | upper-case IDN; a punycode pattern against a Unicode subdomain; full-width letters mapped |
| IPv4 forms | hex, octal, short and decimal |
| IPv6 forms | compressed vs expanded, both directions; IPv4-mapped in both spellings |
| Ports | an explicit default port; leading zeros in the pattern and the URL; ws/wss/ftp defaults |
| Wrappers | `view-source:blob:`; double `view-source:`; upper-case wrapper |
| `file:` | a `file:` host |
| Whitespace and control characters | tab, newline, leading NUL and padding in the URL (stripped as the URL parser strips them) |

Pattern lines: all 36 malformed lines tried were **invalid**. They include `*.`, `**.`, `*.*.`, `bank.*.example`,
paths, empty labels, `:`, `:65536`, `:0`, `:-1`, `:+80`, `:8 0`, `:00000080`, NUL, tab, `user@`, unbracketed
IPv6, bad brackets, a zone id, `*.[::1]`, `*.127.0.0.1`, `ftp://`, `javascript:`, `https://*.x/`, `#`, a space,
and `%62`. Empty and whitespace-only lines were **ignored**.

Other results:
- `urlScheme` caught `java\tscript:`, a leading NUL, upper case, `data\n:` and `blob\t:`.
- Speed: 5 000 patterns × 1 000 URLs ran in 86 ms.

## 4. Do the new tests fail without the change? (task 2)

**Harness:** a vitest config in `scratchpad/mut/` aliases `../src/safety.js` and `../src/safety-match.js` to
scratch copies. The control run with unmutated copies gave `Tests 442 passed (442)`; that is the 447 tests
minus the 5 static ones, which read the files on disk. The builder separately showed all files red with the
modules missing. **All 27 of my mutants were killed.** Failures out of 442:

| Mutant | Failed |
|---|---|
| M01 the gate allows everything | 251 |
| M02 the matcher never matches | 90 |
| M03 dot-less `endsWith` | 5 |
| M04 substring `includes` | 7 |
| M05 no JavaScript-off check on `evaluate` | 8 |
| M06 no script-URL check | 3 |
| M07 the tab is tested by its first URL only | 7 |
| M08 no own-page check | 46 |
| M09 no any-extension navigation check | 9 |
| M10 a hidden row keeps its title | 3 |
| M11 the network filter ignores `initiator` | 2 |
| M12 ingest ignores the disarmed state | 1 |
| M13 the port is ignored | 55 |
| M14 wrappers are not unwrapped | 4 |
| M15 a naive `urlScheme` | 5 |
| M16 `newTab`/`closeTab` post-check more than the state | 2 |
| M17 `gone` always allows | 3 |
| M18 no target-form check | 1 |
| M19 `methodClass` defaults instead of throwing | 3 |
| M20 the trailing dot is kept | 1 |
| M21 `listTabs` not redacted while disarmed | 8 |
| M22 `hiddenReason` ignores the disarmed state | 4 |
| M23 `tabCreated` gets a marker | 1 |
| M24 the tab is checked before the state | 114 |
| M25 `*.` matches the bare host | 1 |
| M26 `*.` allowed before an IP | 2 |
| M27 a malformed line is accepted | 3 |

The static test also went red on a scratch source with `console.debug(…)` added to `safety-match.ts` and
`chrome.runtime.id` added to `safety.ts`: `Tests 2 failed | 3 passed (5)`.

## 5. Exit checks

### S1.1: **PASS** (the S1 half; the `Router.on` throw closes at S2a per #147)
- All 23 `router.on(` names in `sw.ts:20-42` are in `METHOD_CLASSES`, and only those (test l. 65-71).
- `methodClass` throws on an unclassified name, including `toString` and `__proto__`. The table has a null
  prototype.
- My own mutations (a), (b) and (d) on scratch copies of `sw.ts` turned the test red.
- Weakness: see finding 3.

### S1.2: **FAIL on one required row (finding 1)**; the rest PASS
- The full matrix runs: 23 methods × 4 states × {blocked, allowed, own}. The expected values are written from
  the decisions, not taken from the code (l. 133-139).
- `listTabs` redaction outcomes are tested. The network forms × {`tabId` live or gone, `scope:"all"`, `id`}
  are tested: refused while disarmed; `all` and `id` allowed while armed.
- The post-check is tested for {state changed, JavaScript turned off, tab now blocked, tab gone, tab replaced,
  `newTab`/`closeTab` checking the state only}.
- Required rows:

| Required row | Result |
|---|---|
| gone/replaced + empty list → unchanged | PASS |
| gone × disarmed → `DISARMED` | PASS |
| gone with a blocked last URL → `DOMAIN_BLOCKED`, none known → unchanged | PASS |
| replaced onto a blocked URL → `DOMAIN_BLOCKED` | PASS |
| network call on a closed tab + empty list → allow | PASS |
| **unreadable at receipt × armed → allow** | **holds only when no blocked or own-page last URL is known** |

### S1.3: **PASS**
- `git show --stat 9722cd6` shows only `extension/test/safety-match.test.ts | 146 +++`.
- `git ls-tree -r --name-only 9722cd6 extension/src | grep -i safety` is empty, so the matcher did not exist
  at that commit.
- The file has not changed since that commit (`git diff 9722cd6 -- extension/test/safety-match.test.ts` is
  0 lines).
- It holds all 50 cases of §5: 1-38 and 42-50 in `CASES`; case 31 as both of its lines; case 36 with both of
  its URLs; 39-41 in their own block. A test asserts the set {1..50}.

### Extra checks
- **Armed, JavaScript on, empty list → allow, except own pages and navigation to `chrome-extension://`:**
  **PASS.** The test is l. 357-391: every method × every target form × 11 URLs × 3 phases. Mutants M08, M09
  and M16 confirm it is enforced.
- **New tests fail without the change:** **PASS** (§4).
- **`safety*.ts` has no console call and logs nothing:** **PASS.** A grep finds no `console`. The static test
  is shown red by a mutation. The modules have no logger dependency.
- **Messages contain no URL, pattern, title or id:** **PASS.** Test l. 427-449 checks this. The throw texts
  name only the method and the target kind.
- **Purity:** **PASS.** There is no `chrome.` call outside comments, and `errors.ts` (imported) is pure.
- **No top-level `await`:** **PASS.** `grep -n await extension/src/safety*.ts` is empty.

## 6. Decisions checked against the text (task 5)

- **F7 target forms:** `live`, `replaced`, `gone`, `own`, `none` ✓. `params` is accepted but unused, which the
  builder disclosed.
- **State before tab:** ✓ (M24: 114 tests failed).
- **#137 at receipt:** ✗, see finding 1. **#137 post-check:** ✓.
- **#138:**
  - A script URL is refused only while JavaScript is off ✓, and stays allowed while it is on ✓.
  - Navigation to any `chrome-extension://` URL is refused ✓, including upper case and a leading space.
  - Own pages are blocked for acting and hidden in rows ✓. Another extension's tab is untouched ✓.
  - Wrappers are not covered: finding 4.
- **#134 rows:** a hidden row is rebuilt from an allowlist (`id`, `active`, `windowId`, `openerTabId`,
  `current`, `hidden`) ✓. `title` and `url` are dropped ✓ (M10).
- **#146:** `tabCreated` gets `url: ""` and no marker ✓ (M23).
- **Network filter:** it tests `url`, `redirectUrl`, `initiator` and the tab's last top-level URL ✓. The ingest
  form drops everything while disarmed; the query form has no disarmed clause ✓ (M11, M12).
- **Fail-closed throw on a wrong target form:** with the forms documented in builder §2, no reply changes while
  armed with JavaScript on and an empty list. The throw becomes `INTERNAL` only on an S2a wiring slip. Two gaps
  in the principle remain: findings 2 and 6.

## 7. CLAUDE.md invariants (task 7)

The modules are pure, have no top-level `await` and log nothing. `sw.ts` is unchanged (its sha256 equals
HEAD's). The build changed no tracked file, and the content-script bundle is unaffected (`sw.ts` does not
import the gate yet).

## 8. Verdict

**FAIL.** Finding 1 is MAJOR: it contradicts #137 and a required S1.2 row. Fix it with option (a), or have the
step agent take it to the user as an Open decision. After that, the S1 work is otherwise PASS-with-notes:
findings 2-4 are MINOR, finding 5 is a list of escalation flags, and 6-8 are NITs.

## Round 2 (re-check of fixer r1, the affected findings only)

2026-10-24 · Verifier, Claude Opus 5.5. I re-checked the fixer's work against the step agent's rulings:
- F1: option (a).
- F2: an empty target list throws.
- F4: wrapper URLs are unwrapped and compared case-insensitively.
- F5b: `downloadStart` to an extension URL is left to the handler.
- F8: lines split on CR, LF and CRLF.

I treated `S1-fixer1.md` as claims. As before, I edited no tracked or lane file and did not touch the git
index. My probes and mutants ran on scratch copies: `scratchpad/s11/gate-probe.test.ts` and
`scratchpad/mut/run.sh`. The mutant harness copies the current `safety*.ts` and runs the four S1 test files
against the copies through a vitest alias. Its control run gave `Tests 468 passed (468)`.

**Round 2 verdict: PASS-with-notes.** All five ruled fixes hold, every new or changed test fails without its
fix, the required rows hold verbatim, and no test was loosened beyond what was ruled. The notes are the
round-1 MINOR/NIT items that were handed off (3, 5(c), 5(d), 6) and the fixer's two proposed decisions below.

### Per item

**F1 (was MAJOR): PASS.**
- **Code:** `safety.ts`, step 2b: `if (phase === "receipt" && target.kind === "gone" && cls !== "network")
  return "allow";`. It sits after the state checks and the newTab/closeTab post rule.
- **Probe, the round-1 rows re-run:**
  ```
  F1 receipt gone(blocked) click list: "allow"        (round 1: DOMAIN_BLOCKED)
  F1 receipt gone(own page) click empty: "allow"      (round 1: DOMAIN_BLOCKED)
  F1 receipt gone() click list: "allow"
  ```
- **Probe, new rows:**
  ```
  R2 network receipt gone(blocked): {"code":"DOMAIN_BLOCKED"}          (F30 kept)
  R2 click effect gone(blocked): {"code":"DOMAIN_BLOCKED"}
  R2 click post gone(blocked): {"code":"DOMAIN_BLOCKED"}
  R2 click receipt gone(blocked) disarmed: {"code":"DISARMED","data":{"scope":"all"}}
  R2 evaluate receipt gone JS off: {"code":"DISARMED","data":{"scope":"evaluate"}}
  R2 navigate all([gone(blocked), own(blocked)]): {"code":"DOMAIN_BLOCKED"}   (own URL still checked)
  R2 navigate all([gone(blocked), own(allowed)]): "allow"
  ```
- **My mutants** (failures out of 468):

| Mutant | Failed | Failing test |
|---|---|---|
| carve-out removed | 1 | the new receipt row |
| carve-out applied in every phase | 2 | the post-check row and the "after receipt" row |
| carve-out also covers network | 3 | the two F30 network rows and the "after receipt" row |
| carve-out moved before the state checks | 1 | the receipt × disarmed row |

**F2: PASS.**
- **Probe:**
  ```
  F2 all([]) click armed: throws: safety gate: no target given for method "click"
  F2 all([]) navigate JS off: throws: safety gate: no target given for method "navigate"
  R2 all([]) click disarmed: throws: …
  R2 all([]) downloadEnd disarmed: {"code":"DISARMED","data":{"scope":"all"}}
  R2 all([]) listTabs disarmed: {"redact":"disarmed"}
  ```
- **Mutant:** restoring the fail-open return fails 1 test (the new every-method × 4-state test).

**F4: PASS.**
- **Probe:** `view-source:`, `blob:` and `filesystem:` around this extension's page, and the upper-case
  `CHROME-EXTENSION://<ID>/…`, now give `DOMAIN_BLOCKED` for both `navigate` and `snapshot` (round 1 gave
  `allow`).
- **Other cases I tried:**
  - ` VIEW-SOURCE: blob:chrome-extension://<own>/x` → blocked.
  - `view-source:<TAB>CHROME-EXTENSION://…` → blocked.
  - `https://a.example/?u=chrome-extension://<own>/` → allow (not an extension URL).
  - `view-source:https://bank.example/` with an empty list → allow.
- **Stricter only:** I re-ran my round-1 attack script (`attack.ts`). Its output differs from round 1 only on
  these lines:
  - the 4 rule-7 lines, which are now `isExt true isOwn true`;
  - the CR-only line (F8);
  - the timing line.
- **The 78 matcher rows are unchanged.**
- **Mutants:** no unwrap → 9 failed; a case-sensitive host → 3 failed.
- **Fixer's proposed decision:** an own page wrapped five or more levels deep is not treated as an extension
  URL. The probe shows `view-source:`×5 around the options page → `allow`. This is consistent with rule 5's
  bound. Whether Chrome opens nested `view-source:` has not been measured. The step agent should list this
  decision, since it concerns what is gated.

**F5b: PASS.**
- **Probe:**
  - `downloadStart` to the own page, to wrapped own pages and to the upper-case own page → `allow`. The
    handler's `BAD_PARAMS` stands, as today.
  - `blob:https://bank.example/…` and `filesystem:https://www.bank.example/…` → `DOMAIN_BLOCKED`. These are
    the fixer's tests, and they pass.
- **Mutants:** re-adding the own-page refusal → 3 failed; applying the any-extension refusal to
  `downloadStart` → 4 failed.

**F8: PASS.**
- The attack script's `CR-only list: 2 [ 'valid', 'valid' ]` (round 1: `0 [ 'invalid' ]`).
- **Mutant:** splitting on `/\r?\n/` → 2 failed (the CR row and the mixed-endings row).

### The other checks asked for

**S1.2 required rows, verbatim: PASS.** "A tab unreadable at receipt × armed → allow" now holds whatever the
last URL is (F1 probe), and the new test pins it with the list and with an empty list. All the other required
rows still pass.

**Armed, JavaScript on, empty list: PASS.**
- The test at `safety-gate.test.ts` "armed + JS on + empty list: every classified method allows (except #138's
  own-page rules)" is byte-identical to round 1; the diff shows no changed line in it, and it passes.
- F4 makes more URLs count as own pages (wrapped or upper-case own pages), which falls inside that test's
  exception. The attack-script diff shows no other URL changed.

**The committed `safety-match.test.ts` is unchanged: PASS.** `git diff 9722cd6 --
extension/test/safety-match.test.ts | wc -l` → 0.

**Nothing loosened beyond the ruled changes: PASS.**
- **How I compared `safety-gate.test.ts`:** I rebuilt the round-1 file from my `s11/gate-a.test.ts` copy by
  undoing my three path substitutions, then diffed it against the current file.
- **Lines removed or changed, every one ruled:**
  - `downloadStart`, finding 5b: `own(OWN_PAGE)` → `DOMAIN_BLOCKED` became `allow`; the `OTHER_PAGE` line was
    folded into a loop; the test was renamed. Its `BLOCKED` and `ALLOWED` assertions stand.
  - The matrix's `expected()`: one line was added, `downloadStart` × own → `allow` (5b).
  - The two `safetyDecisionAll("navigate", {}, [] …)` assertions (F2) were removed.
- **Everything else in that diff is added lines.**
- **Test names compared with round 1:**
  - `safety-match-more`: all 37 round-1 names are still present.
  - `safety-redact`, `safety-static`, `safety-match`: none missing.
  - `safety-gate`: one round-1 name is missing; it is the renamed `downloadStart` test.
- `safety-redact.test.ts` and `safety-static.test.ts` were last modified at 14:15, before my round-1 run at
  14:22.
- **Limit:** I kept no byte copy of round-1 `safety-match-more.test.ts`. Its first part reads as strict as
  before, and every block in it moved down by the same 8 lines (the import block grew).

### typecheck, test, build (rerun)

**`npm run typecheck`: exit 2.** On my run, both errors are in S3's in-flight
`daemon/src/intercept.ts`, which S3 modified at 14:43, during this check:
```
daemon/src/intercept.ts(225,11): error TS6133: 'gen' is declared but its value is never read.
daemon/src/intercept.ts(613,11): error TS6133: 'gen' is declared but its value is never read.
```
The fixer's run saw different S3 errors (in sdk/mcp test files). S3 is still working, so this is not
reproducible run to run.

Per package (`npx tsc --noEmit -p <pkg>/tsconfig.json`):

| Package | Result |
|---|---|
| shared | 0 |
| sdk | 0 |
| extension | 0 |
| daemon | 2 (the error above) |
| mcp | 2 (the same `daemon/src/intercept.ts` errors, through its import) |

So shared and extension pass on their own, as asked. Daemon does **not** pass right now, because of S3's file.
That is not S1's: no S1 file is in, or imported by, daemon. My scratch tsconfig over the S1 sources and tests
also exits 0.

**`npm test`: exit 1.** `Test Files 1 failed | 95 passed (96) · Tests 1 failed | 2328 passed (2329)`.
- The one failure is S3's: `daemon/test/safety.test.ts > … a listTabs reply requested before a safety change
  notes no url/title … (S3 finding 5)`.
- All S1 files pass: gate 344, match 52, match-more 58, redact 14, static 5, 473 in all. That is round 1's 447
  plus 26 added.
- No S1 test was removed; one was renamed (5b).

**`npm run build`: exit 0.** `git status --short` was identical before and after. `grep -c safety
extension/dist/sw.js` = 0.

**Invariants:** `safety*.ts` have no `console` and no `await`. The static tests pass. `git diff --cached` is
empty.

### Updated verdict

**PASS-with-notes.**
- Exit checks S1.1, S1.2 and S1.3 now all PASS.
- Open notes for the step agent:
  - the handed-off round-1 items 3, 5(c), 5(d) and 6;
  - the fixer's two proposed decisions, to be listed: the wrapper-depth bound for rule 7, and an empty list
    throwing before the state is checked;
  - S3's current typecheck and test failure in `daemon/`, which is outside S1's lane.
