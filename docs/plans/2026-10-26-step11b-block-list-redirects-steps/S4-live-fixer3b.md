# S4-live fixer3b: verifier3's F1, F2 and F3

Fixer (Opus 5.5, medium), between Run 17 liveA attempts 4 and 5. Offline only: no Chrome, extension, daemon or live block ran,
and nothing under `%TEMP%\bridge-e2e\s11b` was touched.

## 1. Verdict

**DONE.**

## 2. Outputs

Files (uncommitted, as the brief says):
- `recipes/s11b-win.ps1`: F1, F2 and F3 (about 14 lines changed). The file is now 433 lines; its cap is 440. ASCII only.
- `recipes/test/s11b-fix3-static.test.ts`: 4 new tests; the old Get-S11bCapsObs test now pins F2; the caps mock test adds case D.
- `recipes/test/s11b-win-static.test.ts`: 1 pin updated (`CAPS items=$n (texts withheld)` → the two `by=` forms; F3 asks
  for that print).
- `recipes/s11b-r17.ps1`: unchanged by me (fixer3's change stays as it was).

Checks:
- **Red before:** run on fixer3's working-tree version (my scratch copy is in `…\scratchpad\fix3b\`). The edited test file
  gave **6 failed of 10**. The 6 were F3, the caps mock (by=), F2, the F1 pin, the F1 own-class check and the F1 attack.
  The F1 attack failed on the missing `$S11bStopDeny` line. The behavioural red is the scratch run below.
- **Scratch attack:** the verifier's `attack.ps1`, copied to `…\scratchpad\fix3b\attack3b.ps1` with one added line that
  loads `$S11bStopDeny`. Output is in `attack3b-out.txt` (before) and `attack3b-after.txt` (after).
  - Before: own-24a, own-bank, own-localhost, own-token, rethrow-cast, rethrow-exc, exc-object, uia-msg-24a and
    com-msg-bank printed their pattern.
  - After: every one prints `message withheld`. Rethrow-cast and rethrow-exc give `(id InvalidCastFromStringToInteger)`,
    and exc-object gives `(id RuntimeException)`. `uia-wrapped` still prints `UIA gone`, and null, string, strict mode and
    the fake object still return `cause not readable`.
- **Green after:** the three s11b static test files give 42 passed. `npm test`: `Test Files 180 passed (180)`,
  `Tests 4505 passed (4505)`, exit 0. It was 4501/180, so +4, all in `s11b-fix3-static.test.ts`.
- All seven `recipes/tsconfig*.json` (base, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`) exit 0. `npm run typecheck`
  exits 0. `-Block plan` exits 0.
- `git status --short`: my three files, plus fixer3's `s11b-r17.ps1`. The ledger and the runner/record/verifier files
  are not mine.

## 3. What changed

**F1 (the stop cause):**
- **"Own" is narrower.** It now also needs `($Err.FullyQualifiedErrorId -ceq $x.Message)`, so `throw $_`,
  `throw $_.Exception` and `throw (New-Object RuntimeException …)` fall into the "id only" class.
- **One deny list, `$S11bStopDeny`.** It is
  `a{24}|bank\.example|localhost:8085|127\.0\.0\.1|://|[0-9a-f]{16}|[A-Za-z]:[\\/]|\\\\|[^\x20-\x7e]`.
  - PowerShell's `-match` makes it case-insensitive.
  - It applies to every printed message: own, UIA and COM.
  - It also applies to the error id, which becomes `?` on a match.
- **The alias and the sentinel are withheld too.** The function reads both from `$env:S11_OUT\state.json` (the file
  `Get-R17Alias` reads) inside a try, and matches them case-insensitively. If the file is missing, the fixed list still
  applies.
- **The message is checked before it is truncated,** so a cut cannot hide a pattern.
- **Pinned against scan17.** The pin test runs scan17 on 13 samples: a-run, BANK, localhost, URL and
  chrome-extension URLs, ws, token, and a profile path in both slash forms. For each sample it asserts that scan17 counts
  a hit and that the deny regex matches. Plain helper texts match neither.
- **The attack runs under powershell.exe.** The precedent is the existing `ps()` helper in this file. It runs the
  verifier's nine cases, plus own-alias and own-sentinel, with `S11_OUT` set to a temporary folder from `os.tmpdir()`.

**F2:** `Get-S11bCapsObs` returns NOT MEASURED only when `-not ($two.Found -or $three.Found)` and the stored list is
unchanged. Otherwise it writes the observation and `judgeCaps` decides.

**F3:** the caps list's two item forms.
- **The regex.** `$S11bCapsRe = '^(Lines? \d+(, \d+)*: a very long site name|This list needs more of Chrome''s blocking rules)'`.
- **The pins.** A test checks that the second branch is a prefix of `BLOCKLIST_CAPS_WARNING` (imported from
  `extension/src/options-model.ts`) and that the regex matches the constant. Mock case D (both forms standing) reads
  2 items.
- **The print.** `CAPS items=<n> by=id|text (texts withheld)`. It is written as two literal `Say9` lines, because
  `scanS11bOutput` refuses a variable it has not vetted, such as `$by`. The scanner was not touched.

Pass rules, `judgeCaps`, the expected texts, K17, the sheet and `Stop-S16Wave` are unchanged.

## 4. Deviations

- **The token guard is 16 hex characters, not 32.** The verifier's `own-token` case, which the brief requires withheld,
  holds only 22 hex characters, so a 32-character guard would let it through.
- **`s11b-win-static.test.ts` changed by one line.** It is in the lane, and F3's print change needed it.

## 5. Proposed decisions

### 2026-10-27 · The stop cause's deny list is stricter than scan17
**Decided:** `$S11bStopDeny` withholds scan17's fixed patterns and adds 127.0.0.1, any 16-hex run, and the state.json
alias and sentinel. **Why:** a withheld STOP cause costs only diagnosis, while a printed pattern is an RD-LOGS STOP.
**Instead of:** reusing scan17 by calling node from the stop path. That adds a process on the failure path and needs a
token the runner does not hold. **Revisit if:** the bridge token stops being a hex string, or scan17 gains a pattern;
the pin test must then gain a sample. **By:** Claude (proposed)

## 6. Findings

- **Not covered.** A relative path without a drive (`Users\someone\…`, the verifier's own-relpath) is still printed.
  scan17's profile forms all carry the drive, so it is not an RD-LOGS hit. A token that is not hex is caught only if it
  is the state.json alias or sentinel.
- **No new runtime fact.**
- **F5 still applies.** The s9-win throws containing U+2026 (s9-win.ps1:370, :421, :840, :859) print as withheld, type
  only.

## 7. Handoff

- Nothing is running.
- My scratch files are in `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\fix3b\`:
  the pre-edit copies, `attack3b.ps1`, `attack3b-out.txt`, `attack3b-after.txt` and `npmtest.txt`.
- **Next:** a fresh verifier re-checks the §5 attack list of S4-live-verifier3.md and the F2/F3 rows of its §4 table.
