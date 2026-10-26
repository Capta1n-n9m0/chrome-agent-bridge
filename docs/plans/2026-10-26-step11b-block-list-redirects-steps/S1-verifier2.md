# Step 11b S1: the DNR rule builder, pure (verifier, round 2)

**Date:** 2026-10-26 · **Role:** verifier, round 2 (`docs/agent-rules.md` §6) · **Model / effort:** Opus 5.5, medium ·
**Scope:** only the items the fix round touched (`S1-fixer.md`), in the uncommitted `extension/src/safety-dnr.ts` and
`extension/test/safety-dnr.test.ts`. I never edited a repo file other than this report. My harnesses are my own,
prefixed `v2-` in the scratchpad (§7). I reused only the venv (google-re2) and, for one comparison run, round 1's
`attack.mts`.

## 1. Verdict

**PASS-with-notes.** F1 is resolved. At 2048 bytes, Chrome's real cap, no emitted regex for a realistic pattern fails, and
the 119-character budget has a margin of 3 characters. The reshaped regexes still match exactly what `isUrlBlocked`
matches: 0 disagreements in 7.5 million pairs. All three required mutants are red, and the restore is byte-exact. Every
exit check passes. One NIT: the calibration window quoted in the test comment and in the fixer's report is slightly off,
but the conclusion holds and is stronger than the fixer argued (N1).

## 2. Outputs (numbers from commands I ran)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | `Test Files 158 passed (158)` · `Tests 4087 passed (4087)`, exit 0 |
| Count derivation | `npx vitest run extension/test/ --reporter=verbose` | 3845 (HEAD, verifier 1) + 240 (`safety-dnr.test.ts`) + 2 (`safety-static.test.ts`, which adds two tests per `safety*.ts` file) = 4087. No test removed |
| Build | `npm run build` | exit 0, `built extension → dist/` |
| Tree | `git status --short` | ` M …/journal.md` (pre-existing), plus untracked S1 files and reports. No tracked change |
| Size | `wc -l` | 153 + 406 = **559** new lines (≤ ~600) |
| Hashes | `sha256sum` | `safety-dnr.ts` `cdab325b…3810`, test `f280b43f…e010`. Both equal the fixer's report |

### (1) F1: the regex memory cap

**Encoding (one targeted lookup).** I fetched Chromium's
`chromium.googlesource.com/chromium/src/+/main/extensions/browser/api/declarative_net_request/utils.cc` on 2026-10-26.
`CreateRE2Options` does four things:
- sets **Latin-1** encoding. Its comment says only ASCII is needed and Latin-1 is more efficient;
- applies `is_case_sensitive`;
- sets never-capture unless capturing is required;
- sets `max_mem` to `kRegexMaxMemKb` converted to bytes.

The fixer's claim is confirmed. I did not fetch the constant's value.

**Calibration (`v2-cal.py`, step 1 byte).** The test is Stage 0's alternation with 9 hosts passing and 10 failing. My
alternation of 9 hosts has length 148, which equals Stage 0's `altMaxLen` 148.

| Encoding | Case-sensitive (`isRegexSupported`'s default) | Case-insensitive |
|---|---|---|
| Latin-1 | 2004–2135 | 2004–2135 |
| UTF-8 | 2004–2135 | 2364–2531 |

The window is contiguous. Chrome's cap is `kRegexMaxMemKb << 10`, a multiple of 1024. The only multiple of 1024 inside
2004–2135 is **2048**, so Stage 0's 9/10 result fixes the cap at exactly 2048 without the constant's value. In Latin-1,
case-insensitive matching costs the same as case-sensitive. So whether `isRegexSupported` defaulted to case-sensitive at
Stage 0 makes no difference.

**Table and proxy (`v2-dump.mts` → `v2-judge.py`, `v2-judge-out.txt`).** I tested 8933 patterns, or 12765 regexes:
- the test's fixed list;
- a sweep of hosts of 20–110 characters in letters `a`/`s`/`k`/`z`, digits, `-` and `_`;
- sparse dots (63-character labels) and dense dots;
- seven forms: `*.h`, `h:443`, `*.h:443`, `h:8443`, `h:65535`, `*.h:65535`, `*.h:80`.

| `max_mem` | Shortest failing regex | Fixed rows failing | Regexes ≤ 119 that fail | First failing host length per form |
|---|---|---|---|---|
| 2004 (window low end) | 119 | none | **21** (all length 119, `*.` + sparse dots) | 75–81 |
| 2016 (fixer's low end) | 120 | none | 0 | 76–82 |
| **2048 (Chrome)** | **122** | **none** | **0** | **78–84** |
| 2135 (high end) | 129 | none | 0 | 85–91 |

- **Is length a sound proxy?** At 2048, no regex of 119 characters or fewer fails, across every character mix and
  dot density. Neither does the `*.` + port + many-letters case: `*.h:65535` at 2048 first fails at a 79-character host,
  and its regex is longer than 119. The proxy is sound at Chrome's cap, but the margin is only 3 characters (122 vs 119).
- **The stated boundary.** "~75–80-character hosts fail closed" is right for the low end. At 2048 the first failing
  host lengths are 78–84, and the longest passing are 77–83, which agrees with the fixer's 2048 column (77–82). Plain
  hosts are unaffected: they go to `requestDomains`.

### (2) The reshaped regex is still equivalent

`v2-attack.mts` is my own emulation, written to Stage0.md §4. It crosses:
- 7 schemes: `http`, `https`, `ws`, `wss`, `ftp`, mixed case, and `view-source:` wrapping;
- 21 userinfos: `bank.example@`, `a.bank.example@`, `bank.example:443@`, `x.bank.example:8443@`, `a%40bank.example@`,
  `a@b@`, `[::1]@`, `127.0.0.1:80@`, `u:p:q@`, `.@`, `:@`, …;
- 23 hosts: trailing dots, `bank.example..`, IPv4 including hex, IPv6 including `[::ffff:127.0.0.1]`, `_`;
- 10 ports: the default ports on other schemes, `:0443`, `:`;
- 8 tails, such as `?@bank.example` and `#:443`;
- 120,000 random authority strings over `ab.:@/%?#-_[]1`.

These URLs ran against 28 patterns, among them `*.` with port, `:80`/`:443`/`:21`, IP with default ports and pasted URLs
with an explicit default port, plus all 28 in one list.

```
urls=390480 pairs tested=7502735 n/a=3821185 disagreements=0 userinfo-disagreements=0
href http://a@b@bank.example/ -> http://a%40b@bank.example/
href https://bank.example.:443/ -> https://bank.example./
```

Round 1's `attack.mts` on the new module gives `pairs tested=1213520 n/a=235144 disagreements=0`.

**Why it holds.** In the WHATWG href, the userinfo percent-encodes `@`, `/`, `?`, `#`, `[` and `]`. So in
`(?:[^/?#]*[@.])?` the `[@.]` is either the real userinfo end or a dot, and the host literal must then reach `\.?`, the
optional port and `END`. A dot inside the userinfo leaves `@` or `:…@` next, which `END` refuses. Two cases show it:
- `http://bank.example@evil.test/` and `http://x.bank.example:8443@evil.test/` are not blocked by the regex rules;
- `http://evil.test@bank.example/` is blocked.

**The test's Chrome emulation is unchanged and still faithful to Stage0.md §4:**
- `requestDomains` blocks the host or a subdomain, ignores the port, and drops a trailing dot from the URL host;
- `regexFilter` runs case-insensitively on the canonical href and must agree with and without the userinfo;
- only http, https, ws and wss URLs count, with `view-source:` unwrapped.

### (3) Counts, ids, the test changes

- **`countRules` and ids.** Regexes are deduplicated by text, so `BANK.example.:443` merges with `bank.example:443`. The
  test asserts `{rules: 6, regexRules: 5}` and ids 11–16. The scope list now includes `bank.example:443`, and the
  contiguity and `countRules`-equals-`rules.length` assertions hold for both scopes.
- **`ports(n)` from 1000.** It now uses ports 1000–2000, so no default port takes part. The four cap assertions and the
  session-cap test are textually unchanged.
- **The scope test.** It only gained a list entry. No assertion was loosened.

### (4) Mutants (`v2-mutants.mjs`, `v2-mutants-out.txt`)

Method: a byte backup, one mutant at a time, `npx vitest run extension/test/safety-dnr.test.ts`, and a restore in
`finally`.

| Mutant | Result |
|---|---|
| M1a dot-less suffix: `MAYBE_SUB` → `(?:[^/?#]*)?` | **red**, 1/240 (X1) |
| M1b dot-less suffix: `SUBS` → `[^/?#]*` | **red**, 7/240 (rows 5, S1b, S2b, S4b …) |
| M2a port ignored: the explicit form takes any port | **red**, 14/240 |
| M2b port ignored: the default form takes any port | **red**, 2/240 (row 48 and the budget test) |
| M3 `*.` matches the bare host: `SUBS` made optional | **red**, 6/240 (rows 5, S2b, S4b, X5) |
| The builder's module (`fx-dnr-before.ts`) | **red**, 3/240: bad-id, budget, split-count. The fixer's new tests fail without the fix |

`restored sha256 cdab325b2f45fef8fd18a42e446af7d5cb27f5941987d1b40050a4a307ac3810 byte-equal true`. A later
`sha256sum extension/src/safety-dnr.ts` gives the same hash.

### (5) F2 and the extension-id check

- **F2 is resolved.** `safety-dnr.ts:8-9` now states that one `requestDomains` rule took 1,000,000 hosts, citing Stage0.md
  §1 (4). The correction to the builder's report belongs in the as-built, as the fixer says.
- **The id check holds.** `safety-dnr.ts:135` checks `/^[a-p]{32}$/` (Chrome ids use only `a`–`p`), and the message
  carries no value. `safety-dnr.test.ts` also feeds it `"bank.example"`, which is refused, and that test is red on the
  builder's module.

## 3. Verifier verdict

PASS-with-notes. This file.

## 4. Deviations

None. I made one web lookup, as allowed, and recorded its source in §2 (1).

## 5. Proposed decisions

None of my own. The fixer's two proposals (`S1-fixer.md` §5) stand on my measurements, with N1's correction to the
second. The first amends #296 item 7's "one … regex per pattern" (Stage0.md §6 item 7), so the step agent must accept and
record it before the commit. It is not a forbidden fix: no substring or dot-less matching is involved, and the rules still
come from the `BlockList` alone.

## 6. Findings

### N1 — NIT — the calibration window in the comment is a 16-byte-step artefact

- **Where:** `extension/test/safety-dnr.test.ts:339-341` (the comment above `REGEX_LEN_BUDGET`, line 344) and `S1-fixer.md` §2 and §5.
- **The problem:** both state the Latin-1 window as 2016–2128 and say that at 2016 every regex of up to 119 characters
  compiled. With a 1-byte step the window is **2004–2135**. At 2004, 21 regexes of exactly 119 characters fail
  (`v2-judge-out.txt`, e.g. `*.aaa…(63).aaaaaaaaa.test:65535`).
- **Why it does not matter:** the cap is `kRegexMaxMemKb << 10` (fetched), and 2048 is the only multiple of 1024 in the
  window, so Chrome's cap is 2048. There the shortest failing regex is 122.
- **Suggested fix:** in the as-built, or the comment if it is touched again, say: "window 2004–2135; the cap is a
  multiple of 1024, hence 2048; at 2048 the shortest failing regex is 122". The margin is 3 characters, so a future
  scaffold change must re-run the calibration.

### Notes, not findings

- **The `:21` rule can never match.** The no-port rule of `:21` (`^ftp://…`) matches nothing a rule can see, because DNR
  sees no ftp requests. It costs one regex rule against the 1000 cap. It is harmless and exact.
- **Residual, unchanged from round 1.** Whether Chrome's regex sees the userinfo, and whether GURL encodes it as WHATWG
  does, is unmeasured. The test requires the regex to agree in both forms, and so does my fuzz: 0 userinfo
  disagreements. Run 17 can settle it with one `user@host` row.
- **A fact worth a CLAUDE.md bullet** (for S5 or the session closeout, from the source and a calibration, not a live
  measurement):
  - DNR compiles `regexFilter` with RE2 in Latin-1, with `max_mem = kRegexMaxMemKb << 10`;
  - Stage 0's 9/10 alternation pins that cap at 2048 bytes;
  - in Latin-1, case-insensitive matching costs the same as case-sensitive.

## 7. Handoff

- **No process left running.** The extension `dist/` was rebuilt from the S1 tree. Its source is unchanged, so no reload
  is needed for S1.
- **Evidence** is in
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\`:
  - `v2-cal.py`, `v2-dump.mts`, `v2-rows.json`, `v2-judge.py`, `v2-judge-out.txt`: the calibration and the table;
  - `v2-attack.mts`, `v2-attack-out.txt`: the fuzz;
  - `v2-mutants.mjs`, `v2-mutants-out.txt`, `v2-mut-backup.ts`: the mutants and the backup;
  - `v2-tc.log`, `v2-test.log`, `v2-build.log`: the logs.
- **Next:** the step agent rules on the fixer's two proposed decisions, then starts the committer.
- Nothing needs the user's keyboard.
