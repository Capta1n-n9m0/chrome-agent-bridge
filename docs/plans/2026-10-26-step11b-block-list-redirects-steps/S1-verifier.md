# Step 11b S1 — the DNR rule builder, pure · verifier report

**Date:** 2026-10-26 · **Role:** verifier (`docs/agent-rules.md` §6) · **Model / effort:** Opus 5.5, medium ·
**Tree:** HEAD `8d6e68c` + the uncommitted `extension/src/safety-dnr.ts` (sha256 `98310e8b…4629`) and
`extension/test/safety-dnr.test.ts` (sha256 `34aa2256…b6b4`); `journal.md` modified by someone else, ignored.
**Read:** agent-rules in full; phase doc 0.2, 0.5, the Stages note, S1, D1.1, the every-stage line, STOP rules; decisions
#292, #296; `Stage0.md` §1 table, §4, §6 item 7; `stage0-s1-cases.md`; `stage0-dnr-290-4.txt` (the regex memory probe);
`safety-match.ts`, `safety-match.test.ts`'s grammar via the case table; `extension/CLAUDE.md` § Safety gate. Claims
audited: `S1-builder.md`.

## 1. Verdict

**FAIL** — one MAJOR (F1). Every pre-registered D1.1 check passes, and the logical equivalence held on 1.2 million
attack pairs with no disagreement. But the regexes S1 emits for any `:443`/`:80`/`:21` pattern (grammar row 12 itself),
and for ports or `*.` on longer hosts, exceed Chrome's per-regex memory limit. Stage 0 measured that limit
(`altMaxHosts 9`, `memoryLimitExceeded`). I estimated each regex against it with RE2 calibrated to that measurement;
nothing was measured on Chrome. A rule Chrome rejects fails closed under 0.5. So a list that holds such a pattern would
refuse every covered call. The unit tests cannot see this, because their RE2 guard checks syntax only.

## 2. Outputs (numbers from commands I ran)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests after | `npm test` | `Test Files 158 passed (158)` · `Tests 4085 passed (4085)` |
| Tests before (HEAD) | scratch worktree at `8d6e68c`, `npm ci`, `npm test` | `Test Files 1 failed \| 156 passed (157)` · `Tests 9 failed \| 3836 passed (3845)`: **3845 at HEAD**. The 9 failures are all in `recipes/test/s11-r16-runner.test.ts` and come from the worktree's CRLF checkout (`core.autocrlf=true`; the worktree's `recipes/s11-r16.ps1` has CRLF, the main tree's LF). They are unrelated to S1 (N3) |
| Delta | — | 4085 − 3845 = **+240** = 238 (`safety-dnr.test.ts`) + 2 (`safety-static.test.ts`, whose `readdirSync` filter `^safety(-[\w-]+)?\.ts$` now also picks up `safety-dnr.ts`: 13 → 15 tests, measured in the worktree without and then with the module). No test removed |
| Build | `npm run build` | exit 0 (`built extension → dist/`) |
| Tree after build | `git status --short` | ` M …/journal.md` (pre-existing), `?? …/S1-builder.md`, `?? extension/src/safety-dnr.ts`, `?? extension/test/safety-dnr.test.ts`. No other tracked change |
| Tests fail without the module | HEAD worktree + only the test file copied in: `npx vitest run extension/test/safety-dnr.test.ts` | `FAIL … Failed to load url ../src/safety-dnr.js` · `Tests no tests` |
| Size | `wc -l` | 138 + 371 = 509 new lines: under the brief's ~600, over S1's own "≤ ~400 lines" (N1) |

**Mutants** (my own script, `scratchpad/vmutants.mjs`: it backs up the file by byte copy, applies one mutant at a time,
runs `npx vitest run extension/test/safety-dnr.test.ts`, and restores in `finally`):

| Mutant | Result |
|---|---|
| M1 dot-less suffix: `SUBDOMAINS` loses `\\.` | 3 failed / 238 |
| M1b dot-less suffix: `SUBDOMAINS` = `[^…]*` | 8 failed |
| M2 port ignored: the regex is always any-port | 13 failed |
| M2b port ignored: port patterns go to `requestDomains` | 12 failed |
| M3 `*.` matches the bare host | 5 failed |
| M4 download rule untyped: `resourceTypes` omitted, `copy` tolerating it (`vm4.mjs`) | 93 failed |
| M4b download rule adds `websocket` | 1 failed (the N1 guard) |
| M5 pattern text leaks into `countRules` | 3 failed |
| M6 IP literal sent to `requestDomains` | 7 failed |
| M7 default port loses the no-port alternative | 4 failed |
| M8 unanchored regex | 1 failed |

Restore proof: the script printed `restored sha256 98310e8b…4629 equal-to-orig=true`. A `sha256sum` afterwards equals the
hash taken before any mutant, for both files (`scratchpad/hashes0.txt`). `git status --short` is unchanged.

**Attack fuzz** (`scratchpad/attack.mts`, run with tsx against the repo's modules; its own Chrome emulation, written
from `Stage0.md` §4 independently of the test's):
- 34 patterns × 6 schemes (http, https, ws, wss, ftp, `HTTPS`) × 38 hosts × 13 ports × 7 tails × with and without
  userinfo, plus a userinfo matrix, `view-source:` and an all-patterns list.
- Patterns covered: uppercase, trailing dot (one and two), userinfo holding the host or `host:port`, IPv4 forms
  (`2130706433`, `0x7f.1`, `127.1`, `127.0.0.1.`), IPv6 forms (`[0::1]`, `[::ffff:127.0.0.1]`), IDN and uppercase IDN,
  percent-encoding in the host (`bank%2Eexample`, `%62ank.example`), ports `:0`, `:65535`, `:00443`, `:0080`, `:4430`,
  `:844`, and the host inside a query, fragment or path.
- Overlapping patterns covered: a host that is a suffix of another (`example`, `a.example`, `a.a.example`), duplicates
  (`BANK.example.` beside `bank.example`), and pasted URLs with a default port on the other scheme
  (`http://bank.example:443/`, `wss://bank.example:80/`).
- **Result:** `pairs tested=1213520 n/a=235144 disagreements=0`. Each regex gave the same answer with and without
  userinfo.

## 3. Verifier verdict

Not applicable (this is the verifier's report).

## 4. Deviations

- I measured the "before" count in a scratch worktree with `npm ci`, with no junction. `git worktree remove --force`
  unregistered it (`git worktree list` shows only main) but could not delete the folder: "Directory not empty", probably
  a locked file. The folder is left in my session scratchpad, outside the repo. The main tree's `node_modules/.bin` is
  intact (42 entries).
- I installed `google-re2` into a scratch venv in the scratchpad, to estimate F1. Nothing was installed in the repo.

## 5. Proposed decisions

### 2026-10-26 · S1's regexes stay under Chrome's regex memory limit, proven by a test
**Decided:** S1's regex form is reshaped so that every valid pattern of realistic length (each label ≤ 63, the whole
host up to about 100 characters) compiles under Chrome's limit. One option is splitting the default-port alternation
into two rules. Another is `isUrlFilterCaseSensitive: true`, because the canonical URL's scheme and host are already
lower case; this changes #296's "case-insensitive" wording and needs the session agent. The test pins a size budget
calibrated to Stage 0's `altMaxHosts 9`. S3/Run 17 adds an `isRegexSupported` record row.
**Why:** F1. A rejected rule fails closed, so the bridge works, but a common pattern would silently make every covered
call refused.
**Instead of:** shipping and finding out in Run 17.
**Revisit if:** Run 17 measures the current form accepted for `bank.example:443`.
**By:** Claude (proposed)

## 6. Findings

### F1 — MAJOR — the emitted regexes exceed Chrome's measured regex memory limit for default-port and longer patterns
`extension/src/safety-dnr.ts:71-80` (`regexOf`, the `defaults` branch at :79), `:126` (`isUrlFilterCaseSensitive:
false`); `extension/test/safety-dnr.test.ts:324-334` (the RE2 guard checks syntax only).

**The measured limit.** `Stage0.md` §1 table (4) and `stage0-dnr-290-4.txt:103-105,203-207`: Chrome's
`isRegexSupported` accepted the alternation `^https?://(h0\.cap\.test|…)(:[0-9]+)?/` with 9 hosts (148 characters) and
rejected 10 with `memoryLimitExceeded`.

**How I estimated against it.** `scratchpad/re2cal.py` runs google-re2 with `never_capture` and case-insensitive
matching. It looks for the `max_mem` values at which that same alternation passes at 9 hosts and fails at 10, as Chrome
did: the window is **2368–2528 bytes** (`re2-cal-out.txt`). It then compiles S1's actual output (`probe.json`, from
`rulesOf`) at both ends of that window.

| Pattern (S1's regex) | Length | Compiles at 2368 / 2528 |
|---|---|---|
| `*.bank.example` | 93 | yes / yes |
| `bank.example:8443` | 87 | yes / yes |
| `127.0.0.1` | 70 | yes / yes |
| **`bank.example:443`** (grammar row 12) | 157 | **no / no** |
| **`*.bank.example:443`** | 155 | **no / no** |
| **`accounts.google.com:443`** | 173 | **no / no** |
| `<63 chars>.example:8443` | 146 | no / yes |
| `<20 chars>.example:443` | 189 | no / no |

**Why this matters.** A default-port pattern writes the authority twice, and case-insensitive matching widens every
letter into a class. Under 0.5 an update that rejects refuses the call `DISARMED`. So a human who types
`bank.example:443`, or pastes `http://bank.example:443/`, would see every `navigate`, `back`, `forward` and
`downloadStart` refused while the list holds it. That is #292's Revisit-if ("the caps make realistic lists fail
closed").

**Builder's claim refuted.** §6 says "the produced regexes are short". By this estimate they are not.

**This is an estimate.** RE2 versions differ, and Chrome's own build was not run here. The calibration reproduced
Chrome's 9/10 boundary only inside the window above; at RE2's literal 2048 the local build was stricter: 7 pass, 8 fail.

**Suggested fix.** Probed in `scratchpad/re2alt.py`; same caveat.
- Splitting the default-port case into two rules compiles in the window for `bank.example`, `accounts.google.com` and
  `portal.corporate-bank.example`:
  - `^(?:https|wss)://AUTH(?:[/?#]|$)`
  - `^[a-z][a-z0-9+.-]*://AUTH:443(?:[/?#]|$)`
- Adding case-sensitive matching (equivalent on canonical URLs, where the scheme and host are lower case) also fits a
  63-character label.
- Hosts of about 140 characters or more fail in every form. They need the fail-closed path and the options page's caps
  warning (0.9) to name them.
- Add a test-side size budget that is red for today's `bank.example:443`.
- Record an `isRegexSupported` row in S3 or Run 17.

### F2 — MINOR — the builder's report misstates a measured fact
`S1-builder.md` §6, first bullet: "Stage 0 did not measure whether Chrome bounds the size of a `requestDomains` array."
It did: `Stage0.md` §1 table (4), "one `requestDomains` rule took 1,000,000 hosts". **Fix:** correct the bullet in the
as-built. No code change.

### N1 — NIT — the size is over S1's own cap
The phase doc's S1 header says "≤ ~400 lines"; the stage adds 509: 138 in source, 371 in tests. That is under the
brief's and #271's ~600. **Fix:** none needed; note it in the as-built.

### N2 — NIT — the extension id is not validated
`safety-dnr.ts:120` checks only that `extensionId` is not empty. Chrome would reject a malformed id at install and fail
closed. **Fix (optional):** check `/^[a-p]{32}$/`.

### N3 — NIT, outside the lane — a recipe test breaks on a CRLF checkout
`recipes/test/s11-r16-runner.test.ts` fails 9 tests on a fresh `core.autocrlf=true` checkout (the scratch worktree), but
not in the main tree. It matters only to future verifiers who measure "before" counts in a worktree. **Fix:** a
`.gitattributes` `*.ps1 eol=lf`, or a CRLF-tolerant regex (a later stage or cleanup).

### Checked and sound

- **The emulation is faithful to `Stage0.md` §4.** For `requestDomains` it models: host or subdomain at a dot
  boundary; the port ignored; IP literals suffix-matched like names (no IP exception, so a builder sending IPs there is
  caught: M6 red); a trailing-dot URL host matching; entries with a trailing `.`, `:` or `*` matching nothing. For
  `regexFilter` it runs the regex on the WHATWG `href` (default port absent) with `i`. It is stricter than the measured
  facts in one place: userinfo is unmeasured, so a regex row must agree with and without it.
- **The n/a rows** are pinned by id (`safety-dnr.test.ts:250-253`).
- **No pattern text outside the rules.** M5 is red, and the module has no `console.`/`chrome.`; both the new test and
  `safety-static.test.ts` check this.
- **The download-half guard is N1's form** (`resourceTypes` present and exactly `["xmlhttprequest"]` on any rule whose
  `tabIds` holds `-1`). M4 and M4b are red.
- **The caps** are passed in, summed across live calls, and tested at 5000/1000 and at one over.
- **The shape suits S2/S3:** contiguous ids from `idBase` and `countRules` known in advance. If F1's fix adds rules per
  pattern, `countRules` must follow, and its test does pin that.

## 7. Handoff

- No process left running. The scratchpad holds `attack.mts`, `vmutants.mjs`, `vm4.mjs`, `re2check.py`, `re2cal.py`,
  `re2alt.py`, their outputs, `venv/`, and the unregistered worktree folder `wt/`. All are in
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad`.
- The fixer needs F1, and F2 for the as-built. A fresh verifier re-checks F1: the RE2 calibration script can be re-run
  as is, with `probe.json` regenerated by `attack.mts`.
- Nothing needs the user's keyboard.
