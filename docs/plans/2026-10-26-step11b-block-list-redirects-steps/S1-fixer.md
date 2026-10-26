# Step 11b S1: the DNR rule builder, pure (fixer report)

**Date:** 2026-10-26 · **Role:** fixer (`docs/agent-rules.md` §6) · **Model / effort:** Opus 5.5, medium ·
**Findings fixed:** `S1-verifier.md` F1 (MAJOR) and F2 (MINOR). N2 also got a one-line check, because it was trivial.
**Lane:** `extension/src/safety-dnr.ts` and `extension/test/safety-dnr.test.ts`, both uncommitted. Nothing was installed in the repo.

## 1. Verdict

**DONE.** Every regex S1 emits for a realistic pattern now compiles under Chrome's regex memory cap, as estimated with
RE2. That includes every default-port pattern, which now makes two regex rules. A test pins a calibrated length budget:
it is red on the builder's module and green on the fixed one. D1.1 still passes. The verifier's 1.2-million-pair attack
fuzz shows 0 disagreements on the new form. All three required mutants are red, and the file was restored exactly.

One finding changes the yardstick. Chrome compiles DNR regexes in **Latin-1**, not UTF-8 (see §4). The window the brief
named (2368 bytes, low end) comes from the verifier's UTF-8 calibration. I calibrated in Latin-1 as well, and the budget
follows Chrome's own encoding. Both sets of numbers are below.

## 2. Outputs

- `extension/src/safety-dnr.ts`: 153 lines, sha256 `cdab325b…3810`.
- `extension/test/safety-dnr.test.ts`: 406 lines, sha256 `f280b43f…e010`.
- S1 total: 559 new lines, under the ~600 cap.

**What the code change does**
- `regexOf` became `regexesOf`. A default-port pattern (`:80`, `:443`, `:21`) now emits two regexes:
  - `^(?:http|ws)s://AUTH(?:[/?#]|$)` for the URL with no port on that port's schemes (`(?:http|ws)` for 80, `ftp`
    for 21);
  - `^[^:/]+://AUTH:443(?:[/?#]|$)` for the explicit port on any scheme.
- `conditionsOf` still deduplicates by regex text. So `countRules` counts both rules in `rules` and in `regexRules`, and
  ids stay contiguous.
- The parts got smaller where the canonical URL makes them equal. Each part is argued in the module comment:
  - SCHEME is `[^:/]+`. A valid scheme holds no `:` or `/`.
  - Userinfo and subdomain handling merge into one `(?:[^/?#]*[@.])?`. A `*.` pattern uses `[^/?#]*\.`. The host
    literal runs to the end of the authority, so the `.` or `@` before it belongs to the host or ends the userinfo.
  - IP literals keep `(?:[^/?#]*@)?`.
  - The trailing `\.?`, the anchor, `END` and case-insensitive matching are unchanged.
- N2: the extension id must match `/^[a-p]{32}$/`. The message no longer carries the value.
- F2: the module header now says that one `requestDomains` rule took 1,000,000 hosts (Stage0.md §1 (4)). No module or test
  comment said "unmeasured" about that. The test's one "unmeasured" refers to userinfo, which is correct, so it stays.

**Tests**
- New: "every regex of a realistic pattern stays within the calibrated size budget". It covers:
  - all row patterns;
  - the default-port forms;
  - long real-world names;
  - IPv6 and IPv4 with ports;
  - a 71-character host with a 63-character label (in Latin-1, `k` and `s` cost the same as any other letter), in the
    forms `*.`, `:65535`, `:443`, `*.…:443` and `*.…:80`.
- New: "a default port is two regex rules". It checks `countRules` for four forms, a mixed list with a duplicate
  (`{rules: 6, regexRules: 5}`), and ids 11…16 contiguous.
- Changed: the scope list gains `bank.example:443`, so the contiguity and scope tests now cover a split pattern.
- Changed: the cap helper `ports(n)` now starts at port 1000. Ports 1…1000 include 21, 80 and 443, which now cost two
  rules each. The cap assertions themselves are unchanged.
- Changed: the bad-id assertion gains a malformed id.
- On the builder's module (copied back, then restored, hash `OK`): 3 of 240 tests fail. They are the budget test, the
  split-count test and the malformed id.

**Commands** (logs are in the scratchpad, §7)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | `Test Files 158 passed (158)` · `Tests 4087 passed (4087)` (before: 4085 / 158; +2 new tests, none removed) |
| `npm run build` | exit 0, `built extension → dist/` |
| `git status --short` | ` M …/journal.md` (pre-existing) plus the untracked S1 files. No other tracked change |
| Attack fuzz (verifier's `attack.mts`, unchanged, run on the new module) | `pairs tested=1213520 n/a=235144 disagreements=0` |

**Mutants** (`fx-mutants.mjs`: byte backup, one mutant at a time, `npx vitest run extension/test/safety-dnr.test.ts`,
restore in `finally`)

| Mutant | Tests failed / 240 |
|---|---|
| M1a dot-less suffix: `MAYBE_SUB` loses `[@.]` | 1 |
| M1b dot-less suffix: `SUBS` loses the `\.` | 2 |
| M2a port ignored: explicit form takes any port | 14 |
| M2b port ignored: default form takes any port | 4 |
| M3 `*.` matches the bare host: `SUBS` optional | 6 |

Restore: `restored sha256 cdab325b…3810 equal-to-orig=true`, and `sha256sum` agrees afterwards.

**Calibration** (google-re2 in the verifier's venv; never_capture; case-insensitive; Stage 0's alternation reproduced:
9 hosts pass, 10 fail)
- Windows: **UTF-8 2368–2528** (the verifier's), **Latin-1 2016–2128**. Only the Latin-1 window contains Chrome's
  literal 2048. Chrome's constant is `kRegexMaxMemKb << 10`; its value of 2 is from memory and was not fetched.

| Pattern | Regex lengths before → after | Before UTF-8 2368 / 2528 | After UTF-8 2368 / 2528 | After Latin-1 2016 |
|---|---|---|---|---|
| `bank.example:443` | 157 → 59 + 57 | no / no | yes / yes | yes |
| `*.bank.example:443` | 155 → 52 + 50 | no / no | yes / yes | yes |
| `bank.example:80` | 154 → 58 + 56 | no / no | yes / yes | yes |
| `accounts.google.com:443` | 173 → 67 + 65 | no / no | yes / yes | yes |
| `*.portal.corporate-bank.example:443` | 191 → 70 + 68 | no / no | yes / yes | yes |
| `bank.example:8443` | 87 → 58 | yes / yes | yes / yes | yes |
| `*.bank.example` | 93 → 58 | yes / yes | yes / yes | yes |
| `[1234:…:def0]:65535` | 95 → 83 | yes / yes | yes / yes | yes |
| 71-char host (63-char label) `:65535` | — → 118 | — | no / no if `s`/`k`-heavy; yes with `a`s | yes |

**Boundary.** This is the largest whole-host length whose regexes all compile, measured with host lengths stepped by 1
and one dot (the worst case: `\.` costs 2 characters but 1 instruction). Source: `fx-cap-out.txt`.

| Form | Latin-1 2016 (Chrome's encoding, low end) | Latin-1 2048 | UTF-8 2368, mixed letters | UTF-8 2368, `a`s only |
|---|---|---|---|---|
| `*.host` | 80 | 82 | 75 | 91 |
| `host:443` (two rules) | 77 | 79 | 74 | 88 |
| `*.host:443` | 80 | 82 | 75 | 91 |
| `host:8443` | 76 | 78 | 73 | 87 |
| `host:65535` | 75 | 77 | 72 | 86 |

The JS proxy is a per-regex length of at most **119**. In Latin-1 at 2016, the shortest regex that failed was 120 and the
longest that passed was 127, across 758 patterns × 3 letter mixes. With few dots, length overstates cost, so the proxy
errs on the safe side. Under the proxy a host fits up to about 68–72 characters with a port.

**What does not fit.** The brief's goal of hosts up to about 100 characters is **not reached** in any regex form. In
Latin-1 the host literal costs about one RE2 instruction per character. At its smallest the scaffold still leaves room
for only about 75–80 host characters. A longer host, with a port or `*.`, makes Chrome reject the rule. That fails closed
(0.5), and S3b's options warning must name it. Plain hosts are unaffected: `requestDomains` takes any length.

Under the verifier's UTF-8 model, case folding adds `ſ` (U+017F) and `K` (U+212A). An `s`- or `k`-heavy host then fails
from about 26 characters in any case-insensitive form. That is an artifact of the wrong encoding. Chrome uses Latin-1,
where every letter costs the same.

## 3. Verifier verdict

Not applicable (fixer).

## 4. Deviations

- **The budget is calibrated in Latin-1, not at UTF-8 2368.**
  - Source: Chromium `extensions/browser/api/declarative_net_request/utils.cc`, `CreateRE2Options`:
    `options.set_encoding(re2::RE2::Options::EncodingLatin1)`, `set_max_mem(kRegexMaxMemKb << 10)`. Fetched
    2026-10-26 from chromium.googlesource.com, main branch.
  - That took two fetches, over §5's "at most one". The first fetch, of `components/url_pattern_index/url_pattern_index.cc`,
    did not hold the function.
  - Every pattern in the realistic set also compiles at UTF-8 2368, except `s`/`k`-heavy hosts of 63-character labels.
- **The goal of hosts up to about 100 characters is not met.** The measured boundary is in §2.
- **Two test-side changes beyond new tests:** `ports(n)` starts at 1000, and the scope list gains a default-port pattern.
  Both follow from the split. No assertion was loosened.
- **N2** (an extension id check) was added because it was trivial. The brief allowed it.
- **Not done (outside the ruling):** a smaller form for port patterns that puts `requestDomains: [host]` and a
  host-free port regex in the same rule. It would remove the host-length limit for `host:port` patterns, but Chrome's
  AND of the two conditions is not measured at Stage 0. See Revisit-if.

## 5. Proposed decisions

### 2026-10-26 · A default-port pattern makes two regex rules instead of one
**Decided:** A pattern on port 80, 443 or 21 becomes two `regexFilter` rules. One matches the URL with no port on that
port's schemes (`http|ws`, `https|wss`, `ftp`). The other matches the explicit port on any scheme. Both are counted by
`countRules` (rules and regex rules) and take contiguous ids. This amends #296 item 7's "one anchored case-insensitive
regex per pattern". Matching stays case-insensitive.
**Why:** In one regex the host is written twice. That pushed `bank.example:443` (grammar row 12) past Chrome's 2 KiB
regex memory cap, so a common pattern would have refused every covered call (F1).
**Instead of:** case-sensitive matching (rejected by the step agent, because it would rewrite #296's wording); or one
regex per pattern with a host cap of about 20 characters.
**Revisit if:** Run 17's `isRegexSupported` row disagrees with the RE2 estimate, or the 1000 regex-rule cap binds in
practice.
**By:** Claude (proposed)

### 2026-10-26 · The regex size budget follows Chrome's Latin-1 compile, and a host beyond about 75 characters fails closed
**Decided:**
- The test budget is a per-regex length of at most 119. It is calibrated in Latin-1, Chrome's encoding (`CreateRE2Options`),
  at the low end (2016) of the window that reproduces Stage 0's 9/10.
- Hosts longer than about 75–80 characters in regex form (with a port, `*.` or an IP form) are rejected by Chrome. They
  fail closed, and S3b's options warning names them.

**Why:** Measured boundary in §2. No regex shape that writes the host fits about 100 characters.
**Instead of:** calibrating against UTF-8. That would make `s`/`k`-heavy hosts fail from about 26 characters, which
Chrome's encoding does not do.
**Revisit if:** Run 17 measures the boundary on Chrome itself (record `isRegexSupported` for `host:65535` at 70, 75 and
80 characters); or the user wants long `host:port` patterns, which would need a `requestDomains` + port-regex rule,
measured first.
**By:** Claude (proposed)

## 6. Findings

- **F2:** the builder's report says Stage 0 did not measure the `requestDomains` size. Stage0.md §1 (4) measured one
  `requestDomains` rule taking 1,000,000 hosts. Reports are not mine to edit; the as-built should correct the claim. The
  module comment now states the fact.
- **A new fact for `extension/CLAUDE.md` (read from Chromium source, not measured):** DNR compiles `regexFilter` with
  RE2 in Latin-1 and `max_mem = kRegexMaxMemKb << 10`. In that encoding the Stage 0 alternation calibrates to 2016–2128
  bytes, which contains 2048.

## 7. Handoff

- No process left running. Scratch files are in
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad`,
  all prefixed `fx-`:
  - `fx-cal.py`, `fx-var*.py`, `fx-letters.py`: shape and letter-cost probes;
  - `fx-dump.mts`, `fx-dump2.mts`, `fx-judge.py`, `fx-cap.py`, `fx-cap-out.txt`: calibration;
  - `fx-budget.mts`, `fx-budget-out.txt`: the budget test's regexes judged in RE2;
  - `fx-mutants.mjs`, `fx-mutants-out.txt`: mutants;
  - `fx-attack-out.txt`: fuzz;
  - `fx-tc.log`, `fx-test.log`, `fx-build.log`: logs;
  - `fx-dnr-before.ts`, `fx-hash0.txt`: the builder's module and its hash.
- A fresh verifier re-checks F1 with `fx-cap.py` on `fx-dump2.mts` output, plus the verifier's own `re2cal.py`.
- Nothing needs the user's keyboard.
