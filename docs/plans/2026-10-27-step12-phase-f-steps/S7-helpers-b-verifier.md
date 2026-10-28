# S7-helpers-b verifier report

Model and effort: Claude Opus 5.5, medium. Read only; nothing in the tree changed except this report and its evidence file
(`S7-helpers-b-verifier-evidence.txt`). Every mutant ran in place on the slice's files, which were then restored, and the sha256 matched before and after.
Sources read: §4.27 lines 1768–1860 (forms part B 1808, banner rule 1810, rows 1821–1829, order 1852, Open items 1860);
decisions #351 (3), #357; `recipes/CLAUDE.md`; `recipes/s12-win.ps1`, `s11-win.ps1`, `s9-win.ps1` (the helpers this file calls);
the builder report, which I treated as claims to check.

## 1. Verdict
**FAIL**: one MAJOR (the DevTools opener), plus MINOR and NIT notes. Every pure formatter and the attach judgment pass.

## 2. Outputs (re-derived)
| Check | Result |
|---|---|
| `npx vitest run recipes/test` | **1283 passed, 57 files** (after). Before = 1283 − 41 (the two new files alone: 41 passed, 2 files) = **1242 tests, 55 files**, matching the step agent's HEAD figure |
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| Are the new TS files typechecked? | **Yes**: `tsconfig.s6.json`'s `test/*.test.ts` glob pulls in `test/s12-forms-b.test.ts`, which pulls in `s12-forms-b.ts` (`--listFiles`, evidence §2). `s12-forms.ts` is covered the same way. The builder's claim "None of them includes `s12-*` files" is wrong (NIT-6) |
| Size | 116 + 81 = 197 code lines, 238 + 137 = 375 test lines (cap 400 + 600) |
| Forms by key | (14)–(20) and (25) are each parsed from the sheet's line 1808 and matched token by token (`s12-forms-b.test.ts:18-39`). Every form's keys and their order match §4.27. The one exception is `end-ms=never` (MINOR-2) |
| TS mutants (28) | 25 killed, 3 survived (MINOR-3); evidence §3 |
| PS mutants: the builder's B1–B8 | killed (they run inside the suite, which passes) |
| PS mutants: mine (7) | 3 killed, 4 survived (MINOR-3); evidence §4 |

**DEVPROBE's attach judgment comes only from the control call's code. Confirmed.**
- `devprobeLine` re-derives `attached` from `answer` (`s12-forms-b.ts:20`).
- `attachedFrom` is strict equality with `DEBUGGER_DEVTOOLS` (:15).
- The opener's return value is discarded (:46; `s12-win-b.ps1:58`, `[void]`).
- Mutants M1 (the line trusts `r.attached`), M2 (`ok` counts as attached), M4 (a throw counts as K-devt) and M6 (the opener's `success` forces K-devt) were all killed.

**PowerShell 5.1 compatibility.** No non-ASCII characters, no BOM, LF line endings, and no 7.x syntax. Top-level names carry the S12 prefix. The locals `$steps` and `$root` match the runners' `$Steps`/`$Root` without regard to case. I checked every function they call: none reads `$Steps` or `$Root` unqualified, so nothing is shadowed.

**Logging.** The lines print only handles, counts and fixed words. The default fixture URL is a parameter and is never printed, and names are matched, never printed. One exception, an uncaught COM error, is covered under MAJOR-1.

## 3. Verifier verdict
Not applicable (I am the verifier).

## 4. Deviations
None.

## 5. Proposed decisions
None. The `end-ms` spelling (MINOR-2) and the opener method are for the step agent and the session agent.

## 6. Findings

### MAJOR-1: the UIA menu opener ignores two of the repo's measured Chrome 156 facts, and an exception gives a false `found=yes`
`recipes/s12-win-b.ps1:12-23` and `:38-41`.

**The menu contents.** Steps 2 and 3 look for `More tools*` and `Developer tools*` only among X's UIA descendants (`Find-S12UiaByName`, `FromHandle(X)`). The repo's working menu code, `Set-S9Pin`, searches the **new top-level Chrome windows that appeared after the press** for a toolbar menu's contents (`s9-win.ps1:436-441`, `$menus` / `$scopes`), not only the window's own tree. So `step=more-tools found=no` is the likely result, and the DevTools rows would be lost a third time. (This is inferred from the Extensions menu; the app menu itself was never measured.)

**The button patterns.** On Chrome 156 the Extensions toolbar button offered no Invoke, only ExpandCollapse, and `Expand()` "answered E_FAIL live" (`s9-win.ps1:422-426`). `Invoke-S12UiaElement` calls `$p.Invoke()` and `$p.Expand()` with no try/catch.

**What PowerShell 5.1 does with that error** (evidence §5):
- Under `ErrorActionPreference = 'Continue'`, the runners' setting (`s11b-r17.ps1:19`, `s11b-r17b.ps1:16`), the method's exception does not stop `return $true`. `Inv` returned `True`, so the opener would print `CHECK devtools-menu step=menu-button found=yes` for a press that failed.
- Under `'Stop'` the exception leaves `Invoke-S11Change`'s `$Do` before `Write-S11Pressed 'DEVPROBE'`. The actor's open wait then times out, X is not closed and no Escape is sent.
- In both cases the error record prints `At <script path>:… char:…`, a local path, into the console capture.

**Why MAJOR and not CRITICAL.** The DEVPROBE line itself stays honest, because the attach comes from the code. But a CHECK line can be false, and the method the slice exists to provide is predicted to fail by facts the repo already holds.

**Suggested fix:**
- Wrap `Invoke()`/`Expand()` in try/catch and return `$false` on an exception.
- After each step, also search the Chrome top-level windows that are not in `$global:S12Before` (the `Set-S9Pin` scopes). Only windows Chrome opened after the press count, never the user's.
- Add a PS test whose Invoke stub throws, run under both preferences, expecting `found=no`, an Escape and no throw.
- Add the E_FAIL fact to the proposed decision's "Revisit if".

The mouse route that `Set-S9Pin` used needs the user's grant (`s9-win.ps1:429-431`), so it is not a silent alternative.

### MINOR-2 (sheet finding, not a helper defect): forms (15) and (16) have no spelling for "no `none` read". On KEEP-1 that is the expected result
`s12-forms-b.ts:9, 80, 83`; §4.27:1808, 1821, 1822.

The builder's W1 is right, and it is stronger than the builder stated:
- **KEEP-1.** The sampler stops 4 500 ms after the last reply. A correct build keeps the session for 5 s and Chrome's banner then lingers about 5 s, and the row itself requires `banner=continuous` up to the last reply + 4 500 ms. So **a passing KEEP-1 cannot have a `none` read in its window**, and its `end-ms=<e>` never has a value. The form is unsatisfiable by a correct build.
- **KEEP-2.** "A build that never detaches shows no `none` by 25 000 and fails". That FAIL also needs a spelling.

The helper's `never` is the right choice. Printing the window bound (for example 25000) would record a measurement nobody made (agent-rules §2). `never` is a fixed word, not a text.

**Suggested fix (session agent):** a dated note on §4.27 adding `|never` to `end-ms` in (15) and (16). Then:
- KEEP-1 records `end-ms=never` and moves on;
- KEEP-2 judges `never` as a FAIL ("every `end-ms` ≤ 25 000");
- KEEP-3 judges it against its margins;
- -d's judge accepts it.

No helper change is needed. W2 (`gaps:<m>` counts runs of `none`) and W3 (`poll-ms` = the widest gap, the conservative reading) are also sheet wording findings. I agree with the builder's readings of both.

### MINOR-3: tests that let a mutant through (evidence §3, §4)
- **M19, `s12-forms-b.ts:98`.** OVERLAP with `first` and `second` swapped passes, because every OVERLAP test is a form match and `ok` / `DEBUGGER_DEVTOOLS` fit either slot. Add one exact-string expectation.
- **M23, `:111`.** `sentinel = body.length` passes, because every test line carries the sentinel. Add a case where some lines lack it.
- **M28, `:101`.** The marker regexp is the test's own copy (`s12-forms-b.test.ts:211`), not the product's constant (`sdk/src/format/console-messages.ts:39`). Loosening it to `more lines,.* narrow` passes. Pin it to the SDK formatter's output, or read the constant (the `recipes/CLAUDE.md` rule: expected texts tied to the product's constants).
- **P3 and P4, `s12-win-b.ps1:27-28`.** Removing `Send-S12Escape`'s own-window assert, or its foreground check, passes. This is the only key the file sends, and its guards are untested because the tests stub the whole function. The `s12-ps.test.ts` precedent stubs `Send-S12Key` the same way. Stub `Set-S9Foreground`, `[S9Win]::keybd_event` and `Assert-S11Own`, and test the order: assert, then foreground, then key.
- **P5 and P6, `s12-win-b.ps1:12-23`.** `Find-S12UiaByName`'s X-only scope and `Invoke-S12UiaElement`'s exception path have no test (see MAJOR-1).

### NIT-4: timeline timing (`s12-win-b.ps1:75-77`)
- `T` is stamped **after** `Test-S9Banner`'s full `FindAll`. Run 17b's samplers did 20 polls in 4 000 ms with a 120 ms sleep, so about 200 ms per loop for one window. Each read is therefore stamped up to one read late, which biases `end-ms` upward by that much.
- With two windows per read the interval may pass the sheet's `poll-ms ≤ 250`. `pollMsOf` reports this honestly.
- Suggest stamping before the read, and passing one window where the row allows.

### NIT-5: handoff gaps for -d
- `Invoke-S12Timeline` writes no start acknowledgement (unlike `Invoke-S11Sampler`, `s11-win.ps1:80`). The actor must wait on its own before its first call to be sure the sampler is already running (KEEP-1: 500 ms before the first call).
- "Sends no key" holds for opening only. A docked-pane DevTools is closed by `Close-S12DevTools`, which sends F12 (`s12-win.ps1:126`). That is the key path #351 (3) doubts, and its failure is the STOP `devtools-left-open` with X left open, by design.

### NIT-6: a builder report error
§2 and §4 say no `tsconfig` includes `s12-*` files. `tsconfig.s6.json` does, through its glob (evidence §2). Correct the statement. Coverage is as good as `s12-forms.ts`'s.

## 7. Handoff
Nothing is running. Scratch scripts: `<scratchpad>/mut.mjs`, `mutps.mjs`, `throw.ps1` (the evidence file names them). A fixer touches only `recipes/s12-win-b.ps1`, `recipes/test/s12-ps-b.test.ts` and `recipes/test/s12-forms-b.test.ts`. A fresh verifier re-checks MAJOR-1 and MINOR-3 only. MINOR-2 goes to the session agent as a §4.27 wording finding.
