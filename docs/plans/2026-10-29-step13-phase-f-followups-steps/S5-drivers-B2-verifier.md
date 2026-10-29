# S5-drivers-B2 verifier report

Model: Opus, medium effort. Role: verifier (agent-rules §6). Read and run only; nothing in the main tree was edited,
reverted or moved. Red proofs and mutants ran against copies of `recipes/` outside the tree (scratchpad). No Chrome, no
reload, no daemon, no port.

## 1. Verdict

**FAIL**: one MAJOR finding (F1). Everything else holds: the counts, the typechecks and the build; the #405 override
under the real load order; the per-slice preflight tests; TWICE and REFUSE-DIS against the sheet.

## 2. Outputs (re-derived)

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | `Test Files 244 passed (244)`, `Tests 5837 passed (5837)`. 5807 + 30: 20 `it` in `s13-r20-b.test.ts` (7 + 5 + 5 + 3) and 10 in the new `s13-r20-ps.test.ts` block (5 kill + 5 preflight). The ps diff only adds lines, so no test was removed. |
| Typecheck | `npm run typecheck` | exit 0 |
| Recipes | `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` | all eight exit 0 |
| Build | `npm run build` | exit 0. Afterwards `git status --short` shows only the slice's 4 modified and 3 new files (the builder report included). |
| Personal data | `grep -i` for the user's name and for `Users\` / `Users/` in the slice files and the diff | no hits |
| Size | `wc -l`, `git diff --stat` | 190 + 127 + 29 + 74 ≈ 420 new lines, under the 600 cap |

**Red proof of the #405 tests.** `git archive HEAD recipes` was extracted to a scratch folder, and the main tree's
`recipes/test/s13-r20-ps.test.ts` was run with `S13_R20_REPO` pointing at that copy:
`Tests 6 failed | 43 passed (49)`. The four kill tests fail there (`after the load order…`, `a descendant that is the
daemon…`, `another start time…`, `every name but the actor's…`). The other two failures (`a console that answers no
line…`, `the proof is called with the worker readings…`) come from the copy's environment, not from the slice: a copy of
the **current** `recipes/` fails the same two (`Tests 2 failed | 47 passed`). Before the slice, `s13-r20-b.test.ts`
cannot even import `../s13-r20-b.js`.

**The preflight tests pin code that already existed** (liveA20 fix round 2), so they cannot be red before the slice.
A mutant shows they discriminate. In the copy, line 138 was changed to
`if ($global:R20Port -ne 8081 -and $global:R19Slice -eq "liveA20")`, which refuses the port for slice A only. Result:
the new `the shared preflight fails before any state change for liveB20 on 8082` and `… for liveC20 on 8083` turn red,
beside slice A's own pinning test.

**#405 under the real load order (not the stubs).** A `-File` script (scratchpad `lo/lo.ps1`) rebuilds the entry
script's order:
1. Dot-source the R20 kill functions.
2. Load `Stop-S16Pid` and `Stop-S16All` from the **real** `s11b-r17.ps1` by AST and `. ([scriptblock]::Create(…))` at
   top level, as `s13-r20-a.ps1:55-57` does.
3. Define a script-level caller, then run `Install-R20StopKill`.
4. Call `Stop-S16All`. The process list has the daemon as `"…node.exe" C:/r/daemon/dist/index.js`, with forward
   slashes and a quoted exe.

Output: `KILL /F /PID 101`, `KILL /F /PID 100`, `stopped own process node with its tree`, `KILL /T /F /PID 300`. The
daemon (200) was not killed, and `srv8081` went to Run 17's own function unchanged.

A real `Get-R20Procs` + `Get-R20KillList` on a live `cmd → ping` tree returned the two children, then the root
(`list 21748,3200,39808 root 39808`, 391 processes listed). Only that tree was then killed, the verifier's own
process.

**Slice A is unchanged apart from #405.** The `s13-r20.ps1` diff only adds lines: three functions, `$R20DaemonRe`,
and one `Install-R20StopKill` call at the top of `Register-R20Blocks`. All the earlier `s13-r20-ps` tests pass in the
main tree.

**The `tsconfig.s6.json` exclude.** It is needed: the new test imports chrome-typed extension modules
(`extension/src/upload-files.js` and others), and `.s6` has no `chrome` types. Slice A excluded its tests the same way.
It is harmless: `.s13` includes the file and exits 0, and `.s6` exits 0. I did not reproduce the builder's exit 2
myself: a scratch tsconfig extending `.s6` could not resolve `@types/node` from outside the tree.

## 4. Deviations

None by the verifier.

## 6. Findings

### F1 MAJOR: KEPT's "digest never computed" NOT MEASURED hides product FAILs (`recipes/s13-r20-b.ts:42-46`)

`judgeKeptDifferent` returns `NOT MEASURED` as soon as either digest is `null`, **before** it checks the counters. The
fixture sets `digest` only inside the `change` handler, once a file is present (`test-fixtures/s13-chooser.js`,
`R.digest = hex(d)`). So a `null` digest is mostly a product outcome: the call answered `ok` and the page received
nothing. The sheet's pass rule judges exactly that (after call 2 `change=2 input=2 files=1`; "an `ok` is never
evidence"). §4.28 line 1999 does not list R20-CHOOSE-KEPT leg `different` among the rows that may end NOT MEASURED.
This is the builder's proposed decision 3, and it loosens a pass rule (agent-rules §2).

Evidence (scratchpad `kept.ts`, `npx tsx`):
```
call1 ok but nothing received, call2 delivered: NOT MEASURED     (counters: change=1 input=1 → the sheet's FAIL)
both ok, nothing received: NOT MEASURED                           (change=0 files=0 → the sheet's FAIL)
```
The test at `recipes/test/s13-r20-b.test.ts:72-75` pins the loose order: `change: 2, input: 2, digest: null` →
NOT MEASURED, which never asserts `files=1`.

Suggested fix: judge every clause first, so that any answer that is not `ok`, or any of `change≠2`, `input≠2`,
`cancel≠0` or `files≠1` after call 2, gives FAIL. Give NOT MEASURED only when every one of those holds and a digest is
still `null`, which can only be an unreadable reporter. Add the two cases above as FAIL tests. Restate decision 3 to
match.

### F2 MINOR: an unreadable dialog count reads as 0 (`recipes/s13-r20-b.ts:77`)

`dlgN` maps any non-integer answer from `sig(...)` to `0`. A broken or missing PowerShell value step would therefore
read as "no native dialog", and the `dialog-left-open` STOP could never fire. That fails open on a safety STOP. Run 19
used `Number(await sig(...))`, so a NaN failed the leg's `dialog === 0` clause.

Suggested fix: a non-integer or negative answer throws `HelperDefect` (or `StopWhy("throw-after-state")`). Pin it with
a test.

### F3 NIT: KEPT's prelude reads the files' digests from `state.json`, not from the page (builder Deviation 2)

The sheet says "page-computed digests". The page can compute a digest only after an upload, and `s11.ts make` stores
each file's `sha256` at creation (`recipes/s11.ts:428-430`), so equal bytes give equal SHA-256 either way. The leg
itself still compares the page's digests. It is acceptable, but the session agent should record it as a dated note or
decision, since it changes a sheet clause's mechanism.

### F4 NIT: the MCP leg opens its tab; the sheet says it "claims its own `none` tab" (`recipes/s13-r20-b.ts:107`)

`browser_new_tab` gives the MCP a tab it holds, the same pattern as Run 19's MCP legs, so the effect is equivalent.
Mention it in the record.

### F5 NIT: the #405 mechanism differs from #405's text

#405 says `taskkill /F /T`. The builder walks `Win32_Process` instead, because `/T` would also kill a daemon that the
actor spawned, which the brief forbids. This is the right call, but #405's wording should be amended by the builder's
proposed decision 1. A shared limitation of `/T` and this walk: a stale `ParentProcessId` (the PID of a dead parent,
reused by the actor) would pull in an unrelated process. Filtering descendants by `CreationDate` ≥ the root's start
time would close it. This is optional and no worse than `/T`.

### The builder's proposed decisions, audited

1. Accept, with the note in F5.
2. Consistent with slice A's convention (`s13-r20.ps1:204-208`, a `LEG … RECORD` line makes the row RECORD). It
   flatters nothing: a FAIL or NOT MEASURED stays.
3. **Reject as written** (F1).
4. Stricter than the sheet: it only downgrades a PASS or RECORD. "ok with a file on `self` is a FAIL" follows the
   sheet's words "on `flip` or `self`". Accept.
5. The [4 900, 8 000] ms window for call 1 follows Run 19's R19-CHOOSE-3 precedent. The serialised-MCP rule matches
   §4.28's pre-declared case. Leaving out the MCP `LEG` line lets the SDK leg decide the row, as the sheet says.
   Accept.
6. `chooser-interception-left-on` and `dialog-left-open` match §4.28 lines 1946 and 2000. Line 2000 also names
   `existing-tool-changed` for the same control upload, and the builder chose the first. KEPT's prelude STOP as
   `throw-after-state` (ROOT is already added) is acceptable. Accept.

### Sheet checks that hold

- **TWICE:** `busyExact` is code + `CHOOSER_BUSY_MESSAGE` + no `data`; the reply must come in under 1 000 ms of its own
  send; `names-devtools` tests `/DevTools|Close/`. Clicks 1, files 0, change 0. Call 1 must be `TIMEOUT` with
  `CHOOSER_TIMEOUT_MESSAGE`. The MCP leg is read by `mcpLineRead` against the bare message, never the extension's text.
  The overlap text FAILs, as the discrimination requires. Control: `s12=c1`, `ok` with files 1 and change 1.
- **REFUSE-DIS:** the legs run in the order btn, flip, self, each on a fresh load. `flip` decides, and `self` decides
  only on a `flip` TIMEOUT. The RECORD text equals the sheet's. Any other answer from `flip` FAILs.
- **Forms:** CHOOSE through `chooseLine20` and CHKEPT through `chkeptLine`, both from `s13-forms.ts`. No Run 19 judge
  is reused. No path, URL or message text is printed.
- **Exit codes:** every STOP goes through `StopWhy` → `STOPWHY <why>`, exit 2, tested (`s13-r20-b.test.ts:118-123`).

## 7. Handoff: what B3/B4 must carry

- **Entry script `s13-r20-b.ps1`:** the same order as `s13-r20-a.ps1:55-64`, Run 17's `Get-R18Defs` load before
  `Register-R20Blocks`, so the #405 override is the effective `Stop-S16Pid`. Pin it with a test like the existing
  `s13-r20-a` order check.
- **The dialog value steps the actor signals:** `R20-CHOOSE-TWICE-dlg`, `R20-CHOOSE-KEPT-{different,same}-dlg`,
  `R20-CHOOSE-REFUSE-DIS-{btn,flip,self}-dlg`, each answering an integer count (`Get-R19DialogN`). Also a closer in a
  `finally`, as `Invoke-R19Ch` does.
- **Row runs:** `-Actor 's13-r20-b'` with `choose-twice`, `choose-kept` and `choose-refuse-dis`. KEPT and REFUSE-DIS
  rely on the RECORD conversion in `Complete-R19Row`.
- **The window guard:** it must accept `S13 chooser fixture` (`recipes/s12-win.ps1:17` and its test; #367).
- **STOP reasons:** `chooser-interception-left-on`, `dialog-left-open` and `throw-after-state` must be known to the
  STOP/RETURN path (R5.6).
- **Later rows:** R20-0B, CLOSERPROBE, G2-1, VERSION, RESTORE and LOGS (slice B: ROOT removed and read back,
  `DIALOGS B …`).
- **Port 8081:** the actor hard-codes it (`s13-r20-b.ts:59`, `URL`), and the shared preflight's refusal of any other
  port is now pinned per slice.
- **F1 and F2** need a fixer round before liveB20.
