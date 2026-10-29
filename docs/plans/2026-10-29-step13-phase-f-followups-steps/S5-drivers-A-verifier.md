# S5-drivers-A verifier (liveA20 driver, slice A1)

Model: Claude Opus 5.5, medium effort. Read and run only; no daemon on 9234, no Chrome, no reload. Evidence:
`S5-drivers-A-verifier.txt` (the stray `Tests 15 passed (15)` line above M5b is a mutant attempt that did not apply).

## 1. Verdict: FAIL

Three MAJOR findings (2.1 to 2.3) and one MAJOR evidence leak (2.4). The exit checks on counts, typecheck and build pass.

| Exit check | Result |
|---|---|
| `npm test` 5705 + n, none removed | 242 files, **5757 passed** (+52, the builder's count re-derived) |
| `npm run typecheck`, eight `recipes/tsconfig*.json`, `npm run build` | all exit 0 |
| Tracked tree after build | only the lane's 8 files plus the builder's two report files |
| No s12-* or `s13-forms.ts` edited | `git diff --stat` shows only the two tsconfigs |
| New tests fail without the change | 12 mutants in a scratch worktree (own `npm ci`, `@bridge/*` junctions removed with `cmd /c rmdir`, worktree removed). All 12 turn red: STOP→FAIL on a wrong grant, hash ignored, disabled→build-not-loaded, args-ran-js-off removed, the unjoined filter, RETURN reason mismatch, name case, reload-failed, none→A, fg rounds counted, not-restored, STOPWHY ignored |
| Size | code 569 (171 + 121 + 277), tests 331, total 900: within the cap (the builder's 173/124 is a miscount, NIT) |
| Every A1 STOP returns, a test each | yes (`s13-r20-ps.test.ts` l.110–150; `s13-r20.test.ts` STOP/RETURN block) |
| Every A1 row has a code path that prints its pre-written form | **no**: see 2.1 and 2.3 |

## 2. Findings

### 2.1 MAJOR: R20-POP-OTHER leg `human` cannot record A's grant; it reads FAIL or a false STOP
`recipes/s13-r20-a.ts:103-104` with `:71-75`. `popLeg` awaits `sig(...-click<k>)`, and the PowerShell step
(`s13-r20.ps1:101`, `Invoke-R20PopClick`) has already clicked when the signal returns. Only then does `popRound` run
`o.front()` (O.focus), sleep 300 ms, read the guard and **reset every peer's `grants` to empty** (l.75). So a grant
from the click (joined in under 1 ms, granted in about 150 ms) is cleared before the wait starts. The no-op `trigger`
then waits 2.5 s for nothing, so the round reads `granted-to=none` and the leg FAILs. Two more defects:
- In round 1 the click lands before O is brought to the front. Leg `third` left C's H in front (`front: () => H.focus()`),
  and H is also `e2e-playground.html` with the same `#open-popup` link, so the popup opens from C's tab. A late grant
  to C would then print the STOP `popup-lease-wrong` on a correct build.
- The clicked popups are never closed, because the handle is unknown.

The sheet's leg is "O in front of W, held by A … the wave's UIA click". No test covers `popRound` or `popLeg`.
**Fix:** for a click leg, run front → guard → reset → signal the click as the trigger (`trigger: () => sig(click k)`,
treating `unsent` as NOT MEASURED), then wait. Add a pure test of the round order (front, guard, reset, trigger),
with the sequence injected.

### 2.2 MAJOR: R20-0 does not perform the sheet's steps (2) and (3); `perm`/`listener` are always `unread`
`recipes/s13-r20.ps1:39-42`: `Read-R20Worker` is defined nowhere (grep of `recipes/`), so `perm=unread listener=unread`
on every run. The row then always takes the FALLBACK: PASS on the keys alone, the permission NOT MEASURED. The sheet
allows this only "if the console cannot evaluate". The FALLBACK's own clause is also missing: "the disk manifest's
`permissions` is read and recorded as such". The worker-console evaluator already exists
(`recipes/s11b-win.ps1:296` `Invoke-S11bConsoleEval`). As built, the pre-written second line
`LOADED20 … perm=yes listener=yes …` is unreachable.

Step (3) is also replaced: `management.get … enabled and no disabledReason` became "the proof's calls reached the
extension" (`s13-r20.ts:112-122`, `catch { enabled = "no" }`). Any throw in `connect`, `newTab` or `close` (a fixture
or daemon fault) is then printed as `enabled=no` and the STOP `extension-disabled`, a different reason from the
sheet's source. This is the builder's choice (a), and it re-tunes a pre-written step.

**Fix:** build `Read-R20Worker` over `Invoke-S11bConsoleEval`. One evaluation in the capture window can read the two
sheet expressions plus `chrome.management.getSelf()`'s `enabled` / `disabledReason` (yes/no words only). Pass
`--enabled` from it. Keep the reachability reading only as a CHECK line. Read and record the disk manifest when
`unread`.

### 2.3 MAJOR: R20-ARGS-ORDER prints an MCP `KEYORDER` reading it never measured
`recipes/s13-r20-a.ts:222` hard-codes `keys: "page", nested: "page", elem: "page"` into the `via=mcp` line. That is a
printed measurement with no read behind it (agent-rules §2 integrity floor; the sheet says nothing is a pass without a
reading). The MCP leg also runs only the keyed object, not "the same values" (the five `TABLE` values). Those are
sheet step (b)'s MCP leg, which is a RECORD, so the gap is minor on its own.

**Fix:** derive the three words from the MCP's own text, or print only fixed `n/a`-style words the form allows. Run
the five values as well (record lines only).

### 2.4 MAJOR: committed evidence would carry a local home path with the user's name
`S5-drivers-A-builder-red.txt:2,11,18` hold the repo's absolute path (vitest's `RUN` line and two error lines). Root
`CLAUDE.md` (#374) bars a local path or user name in committed docs, and §4.28 lists "the user's name … in committed
evidence" as a STOP class. **Fix:** replace the prefix with `<repo>` before the committer stages it.

### 2.5 MINOR: R20-POP-OTHER leg `third` runs in one window, not W and W2 (builder's choice (b))
`s13-r20-a.ts:139`. B's tab T is in W. The sheet's set-up names W2 for B. Discrimination is unaffected (C's H is still
W's active tab, and the guard reads O `bg`), but it is a set-up the sheet did not write. **Fix:** open T in a second
window the wave opens (an SDK `newTab` cannot choose a window; a `Set-S9`/`S12` window helper or a dated sheet note
from the session agent before the run).

### 2.6 MINOR: R20-ARGS-ORDER step (c) is unreachable as written; it needs a dated note, not a driver choice (choice (c))
Builder's reading verified. `sdk/src/tab.ts:345-363` `evaluateRef` throws `BAD_PARAMS` for any non-node kind, and the
extension refuses `asRef` on a non-element itself (`extension/src/handlers/evaluate.ts:97`, "asRef needs an Element").
So `asRef` of the keyed object cannot yield a ref, and the sheet's `KEYORDER … leg=ref …` cannot be printed. The clause
is not in the pass rule, so the verdict is unaffected. The report says `LEG ref RECORD` is printed. The code
(`s13-r20-a.ts:219-220`) prints only `ANSWER … ref <code>` and `CHECK … ref-leg object-has-no-ref`, with no LEG line
(NIT on the report). **Fix:** the session agent records a dated note on §4.28 (as for form (3)) before the run. The
driver prints what the note fixes.

### 2.7 MINOR: R20-POP-NONE prints fixed numbers as readings
`s13-r20-a.ts:168` prints `n: 3, others: 0` whatever was read. `:177` prints `n: 0` for `blocked` even on the RECORD
path, where a tab appeared and joined A. **Fix:** print the counts read (tabs made, grants seen to clients other than B,
tabs added).

### 2.8 MINOR: `scanArgs20` scans one name, the git display name, not the login name in paths
`s13-r20.ts:137`: `gitName() || process.env.USERNAME`. Run 19 also scanned the home directory (`s12-r19.ts:148`,
`profile: [homedir()]`). With git configured, the login name that appears in a profile path is never counted. The A2
LOGS row will use this function. **Fix:** count both the git name and the login/home-folder name and sum them into
`name=`. Keep the patterns unprinted.

### 2.9 NIT
- `rowVerdict20` ranks RECORD below PASS, while the lib's `Get-R19Verdict` maps RECORD to PASS (`s12-r19-lib.ps1:40`).
  Only duplicate-row warnings use the former, so nothing is affected today.
- `Invoke-R20RestoreCheck` (`s13-r20.ps1:69-71`) reads `$FoundJson` / `$NowJson`, which nothing defines yet. A2 must
  set them.

## 3. The builder's self-declared choices
- (a) `enabled`: rejected, see 2.2.
- (b) W2: MINOR, see 2.5.
- (c) the `ref` leg: the reading is right and the record is wrong, see 2.6.
- (d) `active-guard`: **verified**. The extension's `listTabs` rows carry `active` (`extension/src/handlers/tabs.ts:32`).
  The daemon spreads each row and adds `tab: <handle>` and `owner` (`daemon/src/intercept.ts:676-683`), so
  `activeOf` reads a real field. `x.c.tabs()`'s `owner` is the client name, as POP-NONE expects.
- (e) `worseVerdict` not reused: acceptable. The row verdict comes from the lib's `Get-R19Verdict` over LEG lines.
  `NOT DISCRIMINATING` survives through the LEG line even though `finish` is fed `NOT MEASURED` (`s13-r20-a.ts:125`).
- (f) the `tsconfig.s6.json` exclude: acceptable. It is the same pattern as `test/s13-forms.test.ts` (recipes/CLAUDE.md
  chrome-typed tests), and `.s13` covers the files with `chrome` types. Both configs exit 0.

## 4. Pass-rule and form checks that hold
- POP: granted-to=B or C is the STOP `popup-lease-wrong` in any round, none is a FAIL, and fg rounds are not counted
  (`judgePop`, tests and mutants M1, M9, M10).
- The FG `R15-POP-2 (a)` comparison is a CHECK record line.
- The unjoined line is the sheet's text byte for byte and is filtered from the verdict (M5b).
- `TABLE` equals `mcp/test/s12-args-cross.test.ts` (sentinel `sentinel-args-K7W3-`).
- ARGS-3 has the three exact `JS_DISABLED` refusals (`MSG.jsOff`, no `data`), reads the MCP leg by `mcpLineRead`
  against `MCP_LINES.jsDisabled`, prints `EFF before/after` and turns `after>before` into the STOP `args-ran-js-off`.
- Forms come from `s13-forms.ts` / `s12-forms.ts`.
- `restoreCompare20` prints only `equal/differs` and `count/hash/flags`. `scan20` and `scan20Actors` print counts only,
  and no path prints a pattern, URL, token or evaluated value (`ANSWER` lines carry codes and fixed words).
- A2 can append without rewriting: the order slots, the block marker and the exported `cmds`.
