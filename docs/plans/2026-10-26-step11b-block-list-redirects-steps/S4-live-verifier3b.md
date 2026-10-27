# S4-live verifier3b: re-check of fixer3b (F1, F2, F3 of verifier3)

Verifier (Opus 5.5, medium), between Run 17 liveA attempts 4 and 5. I only read and ran things, offline: the plan block,
the gates, and scratch PowerShell 5.1 and tsx scripts. I edited no repo file except this report. I did not touch
Chrome, a daemon, `%TEMP%\bridge-e2e\s11b` or `bridge.token`.

## 1. Verdict

**PASS-with-notes.** F1, F2 and F3 are fixed. I found two MINOR notes and two NITs, none of them reachable from today's
code.

## 2. Gates (re-run by me)

| Gate | Command | Result |
|---|---|---|
| Tests | `npm test` | `Test Files 180 passed (180)`, `Tests 4505 passed (4505)`, exit 0. Matches the claim. |
| Recipe typecheck | `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Plan block | `powershell -NoProfile -File recipes/s11b-r17.ps1 -Block plan` | exit 0; `PLAN not built:` empty |
| ASCII | node byte scan of `s11b-win.ps1` and `s11b-r17.ps1` | `ascii`, `ascii` |
| Scope | `git diff HEAD --stat` | `s11b-r17.ps1` (6), `s11b-win.ps1` (45), `s11b-win-static.test.ts` (3), the ledger (not the fixer's). Untracked: `recipes/test/s11b-fix3-static.test.ts`. No change to `s11b-rules.ts` (`judgeCaps`, `k17Caps`, `scan17`), the sheet, `e2e-test-plan.md`, K17, `Invoke-R17Judge`, `Stop-S16Wave`, or any s9*/s11* file. |

I did not re-prove red on HEAD. Verifier3 did that for fixer3's tests, and fixer3b reports 6 of 10 failing on fixer3's
tree. The attack below exercises the behaviour directly.

## 3. F1: the stop cause (fixed)

### The attack

**Scripts.** In `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v3b\`:

- `attack-v3b.ps1` extends verifier3's `attack.ps1`. It loads both functions and `$S11bStopDeny` from the working-tree
  `s11b-win.ps1` by AST.
- It runs 48 cases against a temporary `S11_OUT`, in these situations: a good `state.json` (alias
  `s11-<10 hex>.localhost`, sentinel `s11-<12 hex>`), a regex-metacharacter alias, `state.json` missing, malformed, an
  array, null fields, numeric fields, a UTF-8 BOM, `S11_OUT` unset, strict mode, and `$ErrorActionPreference='Stop'`.
- Output is in `attack-v3b-out.txt`. `ids.ps1` probes which engine paths put data in `FullyQualifiedErrorId`.

**Withheld** (every case printed `<Type>; message withheld (…)`):

- **Fixture patterns.** A 24-a run (lower and upper case), `bank.example` (both cases), `localhost:8085` and
  `127.0.0.1`, also in UIA and COM messages and in a UIA exception wrapped in a MethodInvocationException.
- **URLs and paths.** A URL, a drive path in both slash forms, a UNC path.
- **Tokens.** The 22-hex and the upper-case 16-hex token.
- **The alias and sentinel**, in upper case too, while `state.json` is readable.
- **A regex-metacharacter alias** `x(.+)[*]?$^|\\y`, withheld and with no error. The match is `IndexOf`, not a regex.
- **Truncation cases.** A 24-a run, `bank.example` or the alias placed across the 240-character cut are all withheld,
  because the check runs before the cut.
- **Rethrows and exception objects.** `throw $_` of a cast gives `(id InvalidCastFromStringToInteger)`.
  `throw $_.Exception` is withheld the same way. An exception object gives `(id RuntimeException)`. A rethrown own
  throw that holds `bank.example` keeps id = message, so it goes through the deny list and is withheld.
- **The `?` id replacement.** An ErrorRecord id holding `bank.example`, a 24-a run, 16 hex characters or
  `localhost:8085` prints `(id ?)`.
- **Engine errors** (JSON, cmdlet `-ErrorAction Stop`) show their fixed id only.

**Printed, and fine:**

- **A plain own text**: `RuntimeException: the options page shows no block-list summary: not read`.
- **`uia-wrapped`**: `ElementNotAvailableException: UIA gone`.
- **`own-ws-split`**: `bank.<newline>example` prints as `bank. example`. Whitespace is collapsed to one space and never
  removed, so the collapse cannot join a pattern. The printed text is not a scan17 hit.

### The stop procedure

`Get-S11bStopCause` never threw in any case:

| Input | Returned |
|---|---|
| `$null` | `cause not readable` |
| a string | `cause not readable` |
| a fake object | `Int32; message withheld (id ?)` |
| strict mode, `$null` | `cause not readable` |
| strict mode with a numeric `state.json` | ran normally |
| EAP Stop with a malformed `state.json` | ran normally |

- **One string.** Every result is a single non-empty string (`[1]` in the output). So `if ($tag)` in the driver catch
  still fires.
- **The main catch is unchanged.** It still ends in `Stop-S16Wave` and exit 2. `Stop-S16Wave`'s body is unchanged.
- **The counts are unchanged.** The cause text sits inside `Say9 "WAVE stopping: …"`, which carries a timestamp
  prefix, so it can never start a line with `STOP:`. `S16Stops`, `S16Fail` and `S16NM` count as before.

### The fixer's choices

- **The 16-hex token guard.** The token is not generated by code. `sdk/src/token.ts` only reads `BRIDGE_TOKEN`, else
  `bridge.token`. `docs/setup.md` §2 says "Pick any random secret string (e.g. `openssl rand -hex 16`)".
  - The suggested form, 32 hex characters, is caught at any case.
  - A non-hex token, or one under 16 hex characters, is not. My `own-tokenword` and `own-token15` cases print.
  - Reading the token into the PowerShell filter is possible: `recipes/s11b.ts:106` already does it in node, for
    scan17. It would also be safe if it only compared, never printed.
  - I do not judge it better. Every PowerShell runner so far (`s9-r14.ps1:234`, `s10-r15.ps1:380`) keeps the
    rule "the token is never read here".
  - No PowerShell code holds the token, so a helper throw cannot interpolate it. Node output reaches the record only
    through `Show-S16` (vetted), not through a throw.
  - The RD-LOGS scan17, with the real token, stays the backstop: a hit is a STOP before the record is committed.
  - **Accepted.** I add one note: the proposed decision's "Revisit if" should also say "or the token is not
    hex-shaped (setup.md allows any string)".
- **The relative-path residue.** `Users\someone\AppData\x` prints. scan17's profile forms are full lower-case paths
  with the drive (`c:\users\…` in three slash forms), and `Show-S16` masks `USERPROFILE` with the drive. So a
  drive-less residue is not an RD-LOGS hit. **Accepted** (NIT N1).

### MINOR M1 — `recipes/s11b-win.ps1:126`: the id path does not check the `state.json` alias and sentinel

**Evidence.** From `attack-v3b-out.txt`, with a good `state.json`:

```
errrec-id-alias   => [1] Exception; message withheld (id s11-a1b2c3d4e5.localhost)
errrec-id-sent    => [1] Exception; message withheld (id s11-0f1e2d3c4b5a)
```

`$id` is tested only against `^[\w.,-]{1,120}$` and `$S11bStopDeny`. `$known` is read later, on the message path only.
Neither the alias nor the sentinel holds 16 hex characters, so both pass.

**Reachability.** Not reachable today:

- An id carries data only when code builds an `ErrorRecord` with a data id.
- `rg "ErrorRecord|ErrorId|ThrowTerminatingError"` over `s9-win`, `s11-win`, `s11b-win` and `s11b-r17` finds none.
- Engine ids are fixed names (`ids.ps1`: `InvalidCastFromStringToInteger`, `DriveNotFound,…`, `ScriptHalted`).
- `throw <non-exception>` sets id = message (`throw-arr`, `throw-pso`), which is the own path, and that path checks
  `$known`.

**Suggested fix.**
- Read `$known` first.
- Withhold the id (`?`) when it contains a known value too.
- Add `errrec-id-alias` to the fix3 attack test.

### MINOR M2 — `recipes/s11b-win.ps1:129`: with no readable `state.json`, the alias and sentinel print

**Evidence.** In the `missing`, `malformed`, `array`, `nullalias` and `unset` situations:

```
own-alias         => [1] RuntimeException: tab on s11-a1b2c3d4e5.localhost
own-sentinel      => [1] RuntimeException: folder s11-0f1e2d3c4b5a
```

**Severity.** This is the design the fixer reported. It is consistent with the scan:

- `Get-R17Alias` reads the same file and returns `''`, so scan17 reports alias7 NOT MEASURED, never a STOP.
- `s11b.ts scanCtx` gives an empty sentinel, which counts nothing.

So no RD-LOGS hit follows. It is listed because the brief asks that every case print only a withheld form. A cheap
harder line would withhold any `s11-[0-9a-f]{10,12}` stem, since `s11.ts:422-423` fixes the form. That would also cover
the bare alias stem, which prints today (`own-aliasstem`) but is not a scan17 hit either.

### NIT N1 — the relative-path residue

Accepted, as reasoned above. No change is needed.

### NIT N2 — `S4-live-fixer3b.md` §5

The proposed decision's "Revisit if" should name a non-hex token, as noted under the token guard.

## 4. F2: NOT MEASURED only when neither read found anything (fixed)

`Get-S11bCapsObs` (`s11b-win.ps1:406`): `if (-not ($two.Found -or $three.Found) -and $equal) { return '' }`.

| Read two | Read three | Stored list | Outcome |
|---|---|---|---|
| not found | not found | equal | `''`, so `Invoke-R17CapsWarn` prints `ROW RD-CAPS-WARN NOT MEASURED …` and `S16NM++` |
| not found | not found | changed | observation written, so `judgeCaps` FAIL ("the stored block list changed", or 0 items first) |
| found | gone | either | observation with `afterThree = @()`, so `judgeCaps` FAIL "after H121 … 0 item(s)" (`s11b-rules.ts:758`) |
| gone | found | either | `afterTwo = @()`, so FAIL "after H119, H120 … 0 item(s)" |
| found | found | either | judged as before |

- **A list seen once then gone is judged**, a FAIL, never NOT MEASURED.
- **The return value.** `@(Get-S11bCapsObs …)[-1]` is `''` on the NM path and the obs file path otherwise
  (`Write-S11bObs` emits `$f` last).
- **No path gives a PASS without items.** `judgeCaps` needs exact K-caps on both reads.

## 5. F3: the widened regex and the `by=` print (fixed)

**The regex.** `$S11bCapsRe = '^(Lines? \d+(, \d+)*: a very long site name|This list needs more of Chrome''s blocking rules)'`.
`capsre.mts` (scratchpad `v3b\`) tested it, case-insensitive like `-match`, against 151 texts:

- every string literal in `options.ts`, `options-model.ts` and `options.html`;
- every exported string constant;
- `analyzeBlockList` summaries for five block-list texts (empty, the found-list form, three long hosts, invalid lines);
- the rule-count warning generated for 6000 hosts;
- `blockListLongHostWarning([3])` and `([3,4,12])`;
- invalid-line items whose typed text is `a very long site name` or `: a very long site name`.

It matched exactly 4 texts, all caps items:

```
MATCH: This list needs more of Chrome's blocking rules than Chrome allows, ...
MATCH: Line 3: a very long site name with a port or *. ...
MATCH: Lines 2, 3: a very long site name ...
MATCH: Lines 3, 4, 12: a very long site name ...
```

What it does not match:

- **Invalid-line items** (`#invalid-lines`, `#uploadfolders-invalid`, `#uploadfolders-warned`, `options.ts:82,89,126`)
  put `“` after `Line N: `, so even an adversarial typed line cannot match.
- **The summaries** (`<n> blocked site(s).`, the upload-folder summary), **the standing texts** (`UPLOAD_FOLDERS_WARNING`,
  the legends) and **the status line** do not match.
- **The apostrophe.** `BLOCKLIST_CAPS_WARNING` (`options-model.ts:89`) uses an ASCII `'`, as the regex does.

**The print.** `Get-S11bCaps` prints exactly one of two literal lines, `CAPS items=$n by=id (texts withheld)` (the ul
holds ListItems) or `CAPS items=$n by=text (texts withheld)` (the text fallback). Both are pinned in
`s11b-win-static.test.ts`, and mock case A in `s11b-fix3-static.test.ts` reads `by=text`. No item text is printed.

## 6. Deviations

None.

## 7. Handoff

- **Nothing is running.**
- **Scratch files.** In
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v3b\`:
  - the scripts `attack-v3b.ps1`, `ids.ps1` and `capsre.mts`;
  - the outputs `attack-v3b-out.txt`, `npmtest.txt` and `plan.txt`;
  - the temporary `state.json` folders, under `st\`.
- **The commit.** It must include the untracked `recipes/test/s11b-fix3-static.test.ts`.
- **M1 and M2.** Both are optional before attempt 5. Neither is reachable from today's code, and neither can produce
  an RD-LOGS hit.
