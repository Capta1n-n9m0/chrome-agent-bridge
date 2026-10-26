# S4-helpers builder slice H2: K17 ties and the worker-console expressions

Model Sonnet 5.5, effort medium. 2026-10-27.

## 1. Verdict
DONE. No K17 text differs from its product constant (no STOP before liveA). H2 total about 658 new lines (s11b-rules.ts +243, two tests 355), a little over the 600 cap, all one coherent set.

## 2. Outputs
- `recipes/s11b-rules.ts`: new imports at the top (node:crypto, node:vm, `rulesOf`, `parseBlockList`, `K` of s11-rules) and sections H2a-H2d below H1. H1's section is unchanged.
- `recipes/test/s11b-rules.test.ts` (12 tests, K17 ties), `recipes/test/s11b-console.test.ts` (22 tests). Tests were written first (red run: 12 failed, then green).
- `recipes/tsconfig.s11b.json`: include extended with both tests.
- `recipes/tsconfig.s6.json` (outside the lane, see Deviations): the two new test files added to its `exclude`.

## 3. Exported names (what H3/H4 need)
K17 (H2a):
- `K17` (frozen map key -> `{code,message,data?}`: K-url, K-tab, K-own, K-filepage, K-fileurl, K-disarmed, K-gate, K-notarget, K-missing, K-relative, K-devt, K-undef, K-node, K-map, K-cycle, K-fetch); reuses `K` of s11-rules where the text is the same.
- `K17_TEXT` (K-opt-stand, K-opt-home (S0F-a texts), K-opt-root, K-opt-rel).
- `k17RawMissing(i)`, `k17RawDir(i)`: `K17Error`; `k17NewtabLate(tabId): string`; `k17OptSum(valid, invalid): string`; `k17OptItem(line, text, reason): string`; `k17Caps(lines: number[]): string`.
- `longHost(22|23|24)`, `H119`, `H120`, `H121` (each `<labels>:8085`).

Console (H2b):
- `preTypeCheck(text, {token?, alias?, profilePath?}): string | null` (null = clean, else `STOP_CONSOLE_PATTERN` = `STOP: console input holds a pattern`). Case-insensitive; patterns `://`, `localhost:8085`, `bank.example`, `127.0.0.1`, a run of 24 `a`, plus the three arguments.
- `manifestExpression()`, `rulesExpression()`, `rulesSampleExpression(sampleMs, forMs)` (sample 10..5000, for >= sample, <= 120000), `ctxExpression(label, tabId)` (label `[a-z0-9-]{1,40}`): each returns one line starting `void `, no newline.
- `parseManifestLine(dump): {line, dnrWithHostAccess, staticRuleSets} | null`, `parseRulesLine(dump): {line, n} | null`, `parseRulesSamplesLine(dump): {line, samples, min, max} | null` (rejects a min or max that disagrees with its samples), `parseCtxLine(dump, label): {line, count} | null`. All take the last whole line (trimmed, CRLF-safe) matching the exact form.

Regex (H2c):
- `regexExpression()`, `REGEX_FRAGMENTS_SRC`, `REGEX_LABELS` (`bank443-schemes`, `bank443-explicit`, `h119`, `h120`, `h121`), `parseRegexLines(dump): Array<{line,label,supported,len}> | null` (all five or null), `expectedRegexes()`, `regexProof(src?): "equal" | string` (the string is `REGEX_NOT_MEASURED`).

Stored (H2d):
- `storedExpression(port, forMs): string` (port 1024..65535, for 100..60000 ms), `STORED_ACK` (`STOREDPOLL done`), `parseStoredAck(dump): boolean`, `judgeStored(received: string[], expected: string): {matched, line}` (line is `STORED match=<yes|no> lines=<n>`), `STORED_KEY`.

## 4. Decisions in the build
- **What the manifest facts mean.** `dnrWithHostAccess` = `permissions` holds `declarativeNetRequestWithHostAccess` (manifest.json has it, and no `declarative_net_request` key). `staticRuleSets` = a non-empty `declarative_net_request.rule_resources` (absent in the product manifest). Tested against the real manifest.json and a fake with both.
- **`void (...)()`** makes every expression evaluate to `undefined`. Tests run each one in `node:vm` against fake `chrome` / `console` and check the printed lines and the value.
- **Regex fragments**: `A.repeat(k)` for the labels, `["bank","example"].join("\\.")`, `[":","/","/"].join("")`, port from `["80","85"]`; localhost is never written. `bank443-explicit` is the explicit-port regex of `bank.example:443`, `h119/h120/h121` of the long hosts. The proof evaluates the same source in `node:vm` with no `chrome`, and compares length and sha256 with `rulesOf(parseBlockList(...), {kind:"tab",tabId:0}, 1)`; a changed source, a throw or a wrong shape gives the NOT MEASURED text.
- **R3-1 / R3-2 settled** as the brief designed (no fallback needed): the typed expression polls `chrome.storage.local` key `safety.blockList` (tied to `SAFETY_KEYS`) every 50 ms for `forMs`, POSTs every distinct value (the first read too; an absent key as `""`) with `mode:"no-cors"`, `text/plain`, to `http` + `:` + `/` + `/` + `127.0.0.1:<port>/` built from fragments, and prints only `STOREDPOLL done`. **Listener contract for H4:** it must accept several POSTs (first the value found, then each change), pass the bodies so far to `judgeStored`, and may stop at the first `matched`. `judgeStored` hashes in the helper and judges the last body; `lines` is `parseBlockList(last).lines.length`. The hash-not-printed test checks the sha256 (both cases) and every line of a sample text against the STORED line, the typed expression and the ack. The fetch is run against a fake in a test; **whether the real worker can fetch loopback is not measured** (host_permissions is `<all_urls>`, a text/plain no-cors POST is a simple request).

## 5. Numbers
- Baseline (H1 report): 163 files, 4182 tests. After: `Test Files 165 passed (165)`, `Tests 4216 passed (4216)` (+34, +2 files, none removed).
- `npx tsc --noEmit -p` for every `recipes/tsconfig*.json` (base, fe, s10, s11, s11b, s6, s9): all exit 0 (s6 only after the exclude below).
- `npm run typecheck` exit 0; `npm run build` exit 0; after the build `git status --short` shows only the untracked H1/H2 files, `journal.md` (not mine) and `recipes/tsconfig.s6.json` (my edit); no product file changed.

## 6. Deviations
`recipes/tsconfig.s6.json` edited (outside the lane): its `test/*.test.ts` glob pulled in `s11b-rules.test.ts`, whose product imports (`handlers/upload.ts`, `debugger-errors.ts`) use `chrome` and gave 5+ errors under a config without chrome types. Same remedy as the existing excludes of `s9-rules`, `s10-rules`, `s11-rules`. Revert it only together with a different way to keep those imports out of s6.

## 7. Findings
- K17 matches the product on all 30 texts (K-node and K-map are tied by their line in `extension/src/evaluate/save.ts`, K-opt-item and K-newtab-late by their template line in `options.ts` / `tabs.ts`, because the constants are not exported).
- A bash heredoc failed again on a long script with quotes; Write was used.
- Risk for the verifier / H4: the worker's loopback POST in `B17 stored` goes through the worker's own `webRequest` observers; the network log may record a request with tab id -1 (not checked; the log holds no body, and RD-LOGS scans the console, not the log).

## 8. Handoff
H3 (pure judges, the Run 17 scanner) and H4 (`recipes/s11b.ts`) import from `recipes/s11b-rules.ts`; H5's `Invoke-S11bConsoleEval` types a builder's text and passes the dump to the matching parser, after `preTypeCheck` (token, alias, profile path as arguments). Nothing left running; nothing committed.
