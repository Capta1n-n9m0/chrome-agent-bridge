# S4-live fixer3: the RD-CAPS-WARN caps read, and a STOP that names its cause

Fixer (Opus 5.5, medium), between Run 17 liveA attempts 4 and 5. Offline only: no Chrome, extension, daemon or live block ran.

## 1. Verdict

**DONE.**

## 2. Outputs

Files (uncommitted, as the brief says):
- `recipes/s11b-win.ps1`: `$S11bCapsRe`, a rewritten `Get-S11bCaps`, the new `Get-S11bStopCause` and `Get-S11bStopText`, and `Get-S11bCapsObs`. 405 → 427 lines; the file's cap is 440.
- `recipes/s11b-r17.ps1`: 3 lines changed. Both catch sites call `Get-S11bStopCause`. `Invoke-R17CapsWarn` records NOT MEASURED when there is no observation file.
- `recipes/test/s11b-fix3-static.test.ts`: new, 6 tests.

Checks:
- New tests on HEAD: **6 failed of 6**. They ran on scratch copies (`git show HEAD:` into the scratchpad, plus a temporary test copy that read them, deleted afterwards). After the fix: **6 passed**.
- `npm test`: `Test Files 180 passed (180)`, `Tests 4501 passed (4501)`. It was 4495/179, so +6 tests and +1 file, all from the new file.
- All seven `recipes/tsconfig*.json` (`.fe`, the base, `.s10`, `.s11`, `.s11b`, `.s6`, `.s9`) exit 0. `npm run typecheck` exits 0. `-Block plan` exits 0.
- Both `.ps1` files are ASCII only.
- `git status --short`: my three files, the ledger (`M`, not mine) and the untracked runner and record files (not mine).

## 3. Task 1: the cause of attempt 4's throw

**Confirmed: the throw came from `Get-S11bCaps` at the old line 97.**
- The exception type was `RuntimeException`, which is what a script `throw '<text>'` raises. A .NET or UIA failure would have named its own type.
- `s9-win.ps1:629-631` records a measured fact (S4 runner set-up fix, 2026-10-24): Chrome 156 does not expose `<p id="blocklist-summary">` under its id. It has no role, so UIA shows it only as a Text element with an empty AutomationId. `Get-S9Summary` (s9-win.ps1:632) exists for that reason.
- `Get-S11bCaps` looked the summary up only by id, so this throw was certain to happen.
- Timing fits: `BOX blocklist set` was printed at 38.951 and the stop at 39.410. That is the 400 ms sleep plus one lookup.

The other candidates in the path, from code:
- **`Set-S11bTyped` and `Set-S11Box -NoSave`:** finished, since `BOX ... set` was printed, and that is their last action.
- **`Get-S11bLongHost`:** pure.
- **`Assert-S11Own`:** it prints a STOP line before it throws. There was none.
- **`Get-S9Options`:** throws only if O is off the options page. O had just been reloaded to the options page by F-HOME's `Read-S11Stored`, and the `BOX` write went through the same check.
- **`Undo-S11bTyped`, `Write-S11bObs`:** never reached. They were not the cause.

The fix:
- **Summary:** `Get-S11bCaps` now checks the summary with `Get-S9Summary $doc`: by id first, else the one Text that matches `^\d+ blocked sites?\.`, which is `analyzeBlockList`'s form. This is proven live in Run 13 (`OPTIONS blocklist-summary "1 blocked site. ..."`). If the summary is still missing, the call still throws, and now that throw is printed (task 3).
- **Caps items:** read from `#blocklist-caps` ListItems by id. If there is no list, or it holds no ListItem, the page is read with `Find-S11Texts $doc $S11bCapsRe`. That is the same reader whose items passed F-HOME live in attempt 4. `$S11bCapsRe = '^Lines? \d+(, \d+)*: a very long site name'` is derived from `blockListLongHostWarning`. The test checks it against that function and `k17Caps`, and checks that it does not match the rule-count warning.
- **Return shape:** `Get-S11bCaps` now returns `{Found, Items}`. `Found` is `$false` only when there is no list by id and no K-caps item anywhere.
  - In that case `Get-S11bCapsObs` writes no observation file, as long as the stored list is still unchanged, and `Invoke-R17CapsWarn` prints `ROW RD-CAPS-WARN NOT MEASURED: ...` and counts it in `S16NM`.
  - A list that is found but empty still goes to the judge, which gives FAIL.
  - A stored list that changed is still judged, so it is still a FAIL.

The judge, its pass rule, K17 and the sheet text are unchanged.

## 4. Task 2: lookups by AutomationId in s11b-win.ps1 and s11b-r17.ps1

`s11b-r17.ps1` has no `Get-S9ById` and no AutomationId lookup. Line 688 uses `Get-S11Summary`. In `s11b-win.ps1`:

| Lookup | Element | Status |
|---|---|---|
| `blocklist-summary` (old :97) | `<p>` | **fixed**: now read by `Get-S9Summary` (text fallback, proven in Run 13 SAFE-OPT-1) |
| `blocklist-caps` (:98 now ~:105) | `<ul>` | **fixed, with a fallback**. A `<ul>` that has items is exposed by id: `invalid-lines`, through `Read-S9OptionsLines`, Step 9 S4 record, `OPTIONS invalid-lines count 1`. An empty `<ul>` may not be in the tree at all, which is now NOT MEASURED or a text read, never a silent 0. **Not reached live yet**: the first live read is the next attempt |
| `Get-S11Summary` → `uploadfolders-summary` (`Get-S11bTypedObs`, `Get-S11bHomeObs`) | `<p>`, with a text fallback | **proven live**: attempt 4 `ROW F-HOME PASS: summary and four K-opt-home items exact` |
| `Find-S11Texts` (items, standing text) | Text/ListItem by text, not by id | **proven live**: the same F-HOME PASS |
| `Set-S11Box` / `Get-S11Box` → `blocklist`, `uploadfolders` | `<textarea>` (a control) | **proven live**: attempt 4 `BOX uploadfolders set`, `STATE ...` |
| `Read-S11State` → `safety-status` | `<p role="status">` | **proven live**: attempt 4 `STATE armed=true ...` |

## 5. Task 3: the stop procedure prints the cause

**Change:** both catch sites now pass the error record to `Get-S11bStopCause` (s11b-win.ps1). That replaces the bare `GetType().Name`:
- the main catch (r17:901), whose text goes into `Stop-S16Wave "an exception in block $Name ($tag)"`;
- the driver catch (r17:125), whose text goes into `throw "the driver of $Name threw $tag"`.

Its output reaches the screen only through `Say9`/`Stop9` and then `Show-S16`, which masks the profile path.

`Get-S11bStopCause` wraps `Get-S11bStopText` in try/catch, so the stop procedure itself cannot throw; on a failure it returns `cause not readable`. What each class of exception prints:
- **A helper's own throw** (exactly `RuntimeException` and `WasThrownFromThrowStatement`) prints `RuntimeException: <text>`. I swept every `throw` in s9-win, s11-win, s11b-win and s11b-r17. Each one interpolates only handles, row, block, box or element-id names, counts, the extension's name and id, and exception type names. None interpolates a URL, a block-list text, a path or the token. A child node's stdout never becomes an exception message; it is printed only through the vetted `Show-S16 $out`.
- **A UIA or COM exception** (namespace `System.Windows.Automation`, or `COMException`, possibly wrapped in a `MethodInvocationException`) prints `<InnerType>: <framework message>`.
- **Every other class prints `<Type>; message withheld (id <FullyQualifiedErrorId>)`.** The test found the reason: PowerShell's own cast error is an exact `RuntimeException`, and its message quotes the value, e.g. `Cannot convert value "bank.example"...`. JSON, file and binding errors can quote values or paths too. The error id is a fixed name such as `InvokeMethodOnNull`.
- **A final filter** also withholds any message that holds `://`, a drive or UNC path, or a non-ASCII character. One side effect: the s9-win throws whose text contains `...` written as the U+2026 character are printed as withheld (type only).

## 6. Deviations

`Invoke-R17Node`'s driver catch (r17:125) was changed as well as the STOP catch. It feeds a `throw` that ends in the same stop procedure, and without the change its cause would still be only a type name.

## 7. Findings

No new runtime fact. The cause rests on the measured fact already recorded at s9-win.ps1:629-631.

## 8. Handoff

Nothing is running and no PIDs or watchers are left. Next: a fresh liveA attempt (5). If RD-CAPS-WARN goes wrong again, the STOP line or the `CAPS ...` lines now name why.
