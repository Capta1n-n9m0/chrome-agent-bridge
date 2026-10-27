# S4-live verifier3: fixer3's caps read and STOP-cause printing

Verifier (Opus 5.5, medium), between Run 17 liveA attempts 4 and 5. I only read and ran things, offline: the plan block
plus scratch PowerShell 5.1 scripts. I edited no repo file except this report, and touched no Chrome, daemon or
`%TEMP%\bridge-e2e\s11b`.

## 1. Verdict

**FAIL.** One MAJOR finding (F1, the stop-cause filter), plus MINOR and NIT notes. The cause analysis and the
caps-read fix hold. The fix for F1 is small.

## 2. Outputs and gates (re-run by me)

| Gate | Command | Result |
|---|---|---|
| Tests | `npm test` | `Test Files 180 passed (180)`, `Tests 4501 passed (4501)`, exit 0. Matches the claim (4495/179 → +6/+1, all from the new file). |
| Recipe typecheck | `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Plan block | `powershell -File recipes/s11b-r17.ps1 -Block plan` | exit 0; liveA/liveB orders printed; `PLAN not built:` empty |
| ASCII | byte scan (node) of both `.ps1` files | `ascii`, `ascii` |
| New tests on HEAD | `git show HEAD:` copies of both `.ps1` files in the scratchpad; a copy of the test rewritten to read them, with absolute imports, run with the repo's vitest and a scratch config | **6 failed of 6**. They fail for the expected reasons: AutomationId lookup present, `$S11bCapsRe` undefined, no `Get-S11bCapsObs` NM guard, no `Get-S11bStopCause`. |
| Scope | `git diff HEAD --stat` | only `recipes/s11b-r17.ps1` (6 lines), `recipes/s11b-win.ps1` (37), and the ledger (not the fixer's). New untracked file: `recipes/test/s11b-fix3-static.test.ts`. Unchanged: `s11b-rules.ts` (`judgeCaps`, `k17Caps`), the sheet, the e2e plan, every s9*/s11* file. |

## 3. Check 1: the cause of attempt 4's throw is sound

- **The measured fact.** `s9-win.ps1:629-631` records that Chrome 156 does not expose `<p id="blocklist-summary">`
  by AutomationId. HEAD's `Get-S11bCaps` looked the summary up only through `Get-S9ById $doc 'blocklist-summary'`,
  and threw a literal string when the lookup failed.
- **The exception type.** That throw is a script `throw '...'`, which raises `RuntimeException`. This is the type
  the STOP printed (record line `WAVE stopping: an exception in block liveA (RuntimeException)`).
- **The timings.** `BOX blocklist set` was printed at 38.951 and the STOP at 39.410, a gap of 459 ms.
  `Set-S11bTyped` ends with `Start-Sleep -Milliseconds 400`, so the gap is that sleep plus one UIA lookup. Nothing
  else ran in between that could have thrown with that type.
- **The other candidates.** I re-checked them from the code:
  - `Assert-S11Own` would have printed `STOP:` before throwing (s11-win.ps1:106), and there is no such line.
  - `Get-S9Options` had just gone through the same check for the `BOX` write.
- **Conclusion: sound.**

## 4. Check 2: the caps read

### What the page renders

Read from `options.ts` `renderAnalysis` and `options-model.ts`:

- **Summary.** `#blocklist-summary` is `analyzeBlockList(text).summary`, which is `"<n> blocked site(s)."`. When
  there are invalid lines it adds `" <k> invalid line(s) is/are not counted (marked below)."`.
  - The case in question: an empty found list plus H119 and H120 typed. `Get-S11bLongHost` gives
    `a{24}.a{24}.a{22}:8085` and the same with 23, both valid patterns. The summary is exactly `2 blocked sites.`.
  - With a non-empty found list it is `<bl_valid+2> blocked sites.`, possibly with the invalid-lines suffix.
  - `Get-S9Summary`'s fallback needs exactly one Text matching `^\d+ blocked sites?\.`. Every form above matches it,
    and no other text on the page does. The Upload-folders summary starts `No upload folder` or
    `<n> upload folder(s).`, and the status line starts `Bridge`.
- **Caps items.** `#blocklist-caps` holds one `<li>` per entry of `blockListRuleWarnings`. Only two forms exist:
  - `BLOCKLIST_CAPS_WARNING`;
  - `blockListLongHostWarning(lines)` = `Line N: a very long site name …` or `Lines N, M: a very long site name …`.

### What `$S11bCapsRe` matches

`$S11bCapsRe = '^Lines? \d+(, \d+)*: a very long site name'` (s11b-win.ps1:93).

- It matches the long-host form, which the test checks against `blockListLongHostWarning` and `k17Caps`.
- It does not match `BLOCKLIST_CAPS_WARNING` (starts `This list`).
- It does not match either list of invalid-line items. `#invalid-lines` renders
  `Line N: “<text>” — <reason>` and `#uploadfolders-invalid` renders `Line N: “<text>” — <reason>`; after `N: `
  both put the curly quote “, never `a very`.
- It does not match `#uploadfolders-warned` (`Line N: “…” — warning: …`).
- It does not match the standing texts (`UPLOAD_FOLDERS_WARNING`, the legends and labels) or the status line.
- So the text fallback cannot take an item from the Upload-folders section or from the invalid-line list.
  `-match` is case-insensitive, which does no harm here.

### The {Found, Items} logic

| Situation | Path | Outcome |
|---|---|---|
| ul by id, holds ListItems | items from the ul (every caps item, any form) | judged |
| ul by id, 0 ListItems, a K-caps text somewhere | text fallback; Found = true | judged |
| ul by id, empty, no text | Found = true, Items = @() | judged → `judgeCaps` gives `0 item(s)` → FAIL |
| no ul, K-caps text found | Found = true | judged |
| no ul, nothing | Found = false | NOT MEASURED (`S16NM++`), never a pass |
| any read Found = false, stored list changed | observation still written | judged → FAIL (`storedEqual`) |

- **No false PASS on items.** No path can give a PASS that rests on items it did not read.
- **The count clause.** In the ul path, the clause ("exactly one item", "no other item") sees every caps item. In the
  text-fallback path it sees only K-caps-form items. See F3.
- **No summary.** A missing summary still throws, and the test covers it (case C).
- **Output shape.** I checked that `Get-S11bCaps` emits only the pscustomobject (`Say9` is `Write-Host`, and every
  helper result is assigned), so `$two.Found` is a scalar. The NM path returns `''`, so
  `@(...)[-1]` is `''` and `Invoke-R17CapsWarn` takes `-not $f`. In `-First` mode, the NM line goes to `$Record`
  after the `finally`, the same place the judged ROW went before the fix.

## 5. Check 3: stop-cause printing (scratch attack)

**Scripts.** I extracted both functions from the working-tree `s11b-win.ps1` by the PowerShell AST and fed them 26
crafted error records:
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\attack.ps1`
and `…\scratchpad\fqid.ps1`. Output excerpt (`<A>` = a run of 24 `a`):

```
own-24a           => RuntimeException: host <A>.<A>.aaaa:8085 not read
own-bank          => RuntimeException: pattern bank.example
own-localhost     => RuntimeException: localhost:8085 is down
own-token         => RuntimeException: token deadbeefcafe0123456789
own-relpath       => RuntimeException: Users\someone\AppData\x
cast-bank         => RuntimeException; message withheld (id InvalidCastFromStringToInteger)
rethrow-cast      => RuntimeException: Cannot convert value "bank.example" to type "System.Int32". ...
rethrow-exc       => RuntimeException: Cannot convert value "bank.example" to type "System.Int32". ...
throw-errrec-msg  => RuntimeException: inner: Cannot convert value "bank.example" ...
exc-object        => RuntimeException: bank.example
uia-msg-24a       => ElementNotAvailableException: el <A>
com-msg-bank      => COMException: bank.example
json / format / method-null / methodinv / sb-invoke / writeerror-stop / cmdlet-stop => "<Type>; message withheld (id ...)"
own-nonascii      => RuntimeException; message withheld (a URL, a path or a non-ASCII text)
null / string / strict-null / weird-obj => cause not readable
```

**What holds:**
- The function never throws: `$null`, a string, a fake object, and strict mode all return `cause not readable`.
- It always returns a non-empty string, so the driver catch's `if ($tag)` still fires `throw "the driver of $Name
  threw $tag"`.
- Plain engine errors (cast, JSON, format, null method, cmdlet `-ErrorAction Stop`, `Write-Error`) are withheld,
  with only their id shown.
- URLs, drive paths, UNC paths and non-ASCII text are withheld.
- The STOP paths are unchanged:
  - The main catch still ends in `Stop-S16Wave` with exit 2. `Stop-S16Wave` is untouched; only its `$Why` text changed.
  - The driver catch still kills node and throws.
  - `S16Stops`, `S16Fail` and `S16NM` are counted as before. The existing `s11b-r17-plan` stop-procedure tests pass:
    `a clean restore still ends the wave with exit 2`, and the MAJOR-1 restore tests.
- The 24-a, `bank.example`, `localhost:8085` and token cases do not reach the screen today. I re-did the throw-site
  sweep (every `throw` in s9-win, s11-win, s11b-win and s11b-r17): no `throw $_`, no `throw $var`, no
  `catch { throw`, and no `-ComObject`. Every interpolated throw carries only handles, names, counts, an id, a path
  (withheld by the filter) or a `…` (withheld). `throw "the driver of $Name threw $tag"` carries an already filtered
  cause.

**What fails:** see F1.

## 6. Findings

### F1 — MAJOR — `recipes/s11b-win.ps1:120` (and :122, :125-126): the filter's "own throw" class lets through a rethrown engine message, and nothing filters fixture texts

**Evidence.** The brief's test is that the filter can never print a 24-a run, `bank.example`, `localhost:8085` or
the token. With crafted records it does print them:

1. **A rethrown engine error passes as "own".**
   - The "own" test is exact `RuntimeException` plus `WasThrownFromThrowStatement`.
   - PowerShell sets that flag on any exception thrown by a `throw` statement. That includes `throw $_`,
     `throw $_.Exception` and `throw (New-Object RuntimeException(...))`.
   - So `try { [int]'bank.example' } catch { throw $_ }` prints `Cannot convert value "bank.example" …`.
   - The fixer's report says this class "gives its type name and the error record's fixed id only". For a
     rethrown record that claim is false.
2. **The final filter does not cover fixture texts.** For a message that is "own" or UIA/COM, the last filter checks
   only `://`, paths and non-ASCII. A 24-a run, `bank.example`, `localhost:8085` and a token-shaped hex string all
   pass it (`own-24a`, `own-bank`, `own-localhost`, `own-token`, `uia-msg-24a`, `com-msg-bank`).

**Reachability.** Not reachable from today's code (the sweep in §5). It becomes reachable as soon as a later helper
writes `catch { … throw $_ }` or interpolates a box text, and nothing (filter or test) would catch that. This file
sits on the RD-LOGS path: a 24-a run in the record is counted as a pattern hit and is a STOP.

**Suggested fix (measured in `fqid.ps1`):**
- **Narrow "own".** Require `$Err.FullyQualifiedErrorId -ceq $x.Message` as well as the exact type. A script
  `throw 'text'` has id = message:

  ```
  own           thrown=True idEqMsg=True
  own-interp    thrown=True idEqMsg=True
  rethrow-cast  thrown=True idEqMsg=False id=[InvalidCastFromStringToInteger]
  rethrow-exc   thrown=True idEqMsg=False
  exc-object    thrown=True idEqMsg=False id=[RuntimeException]
  ```

- **Deny the RD-LOGS patterns.** Add them to the final filter for every printed message: `a{24}`,
  `bank\.example`, `localhost:8085`, and a long hex run as a token guard, or reuse the RD-LOGS pattern list itself.
  A match means "message withheld".
- **Test it.** Add `rethrow-cast`, `exc-object` and `own-24a` to the test's case list.

### F2 — MINOR — `recipes/s11b-win.ps1:402`: when the two reads disagree, a FAIL becomes NOT MEASURED

**The case.** `if (-not ($two.Found -and $three.Found) -and $equal) { return '' }`. Suppose read two finds the list
(by id, or one K-caps item by text) and read three does not. The list was in the tree a moment earlier, so its
absence after H121 means the warning vanished: a product FAIL ("after H121 … 0 item(s)"). The code records it as
NOT MEASURED instead.

**Severity.** It is never a false PASS, but a FAIL is recorded as NOT MEASURED.

**Suggested fix.** Return NOT MEASURED only when neither read found anything
(`-not ($two.Found -or $three.Found)`). Otherwise write the observation and let `judgeCaps` decide.

### F3 — MINOR — `recipes/s11b-win.ps1:108`: in the text-fallback path, the "no other item" clause cannot see `BLOCKLIST_CAPS_WARNING`

**The case.** When the items come from `Find-S11Texts $doc $S11bCapsRe`, only K-caps-form items are collected. A
rule-count warning standing beside them would be invisible to `judgeCaps`'s exactly-one check.

**Severity.** It cannot arise with the sheet's fixtures. Three hosts are far below 5000 rules, and the row records
the rule-count warning as not run, so a false pass is only theoretical. The brief, though, asked that the count
clause see every caps item.

**Suggested fix.**
- Widen the fallback regex to both item forms of the caps list:
  `^(Lines? \d+(, \d+)*: a very long site name|This list needs more of Chrome's blocking rules)`.
- Print which path was read (`CAPS items=<n> by=id|text`). The record then shows whether the clause was complete.

### F4 — NIT — `recipes/s11b-win.ps1:125`: UIA and COM messages are printed whole

A `COMException`'s message is printed as it is. The UIA and HRESULT framework texts I know carry no page data, so
this is safe today. F1's deny filter would cover it too.

### F5 — NIT — the fixer report, §5

It says one side effect is that the s9-win throws with U+2026 are withheld. True: the cause of those STOPs is then
reduced to its type. It is worth listing them in the handoff (s9-win.ps1:370, :421, :840, :859), so a runner is not
surprised by `message withheld` on them.

## 7. Check 4: unchanged files

- `git diff HEAD --stat`: no pass rule, judge (`s11b-rules.ts`), expected text, K17, sheet or s9*/s11* file
  changed.
- `Invoke-R17Judge` and `Stop-S16Wave` bodies are unchanged.
- The new NOT MEASURED outcome for RD-CAPS-WARN is a measurement outcome, not a pass rule. The sheet's row
  (e2e-test-plan.md:1616) is silent on NM. The general NM convention (`S16NM`, exit codes) applies.

## 8. Deviations

None. The HEAD-failure run used absolute imports in a scratchpad copy of the test (repo `node_modules/vitest`,
scratch config) and no file inside the repo.

## 9. Handoff

- Nothing is left running.
- Scratch files are in the scratchpad: `attack.ps1`, `fqid.ps1`, `head\` (HEAD copies, test copy), `npmtest.txt`.
- **Next:** a fixer for F1, and preferably F2 and F3 too. Then a fresh verifier re-checks §5's attack list plus the
  F2/F3 rows of the table in §4.
