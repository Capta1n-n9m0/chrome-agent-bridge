# S5-sheet builder report (Step 13, Run 20's wave sheet)

Builder: Claude Sonnet 5.5, medium. Docs only; nothing committed.

## 1. Verdict

DONE. `docs/e2e-test-plan.md` §4.28 "R20 rows" is written, placed after §4.27 and before "## 5. Results template".

## 2. Outputs

- `docs/e2e-test-plan.md`: +58 lines, 0 deleted (`git diff --stat`: 1 file changed, 58 insertions). No line of §4.23-§4.27, the Run 16-19 records or any other section is edited. The size cap (~600) is not approached, because each table row is one long line, as in §4.27.
- No §5 "Run 20" skeleton was added. §5 holds one copy-and-fill template and post-run entries (the Run 19 entry is the S7-record's after-the-run record: a results block, prose and an exit-check table), so a skeleton before the run is not the pattern. The S5-record stage writes the Run 20 entry after the Run 19 one.
- `node scripts/doc-check.mjs` after the edit: no "Dead paths" section; "Counts in the code (1): tools: 25 · router methods: 28 · codes: 27"; "Test counts stated (1): CLAUDE.md:110  5596 passed"; "Checked 38 living docs". The first run flagged `docs/e2e-test-plan.md:1950 test-fixtures/s13-chooser.html` (the new page the sheet describes); reworded, clean. **Pre-existing, not mine:** `CLAUDE.md:110` still states 5596 tests (the tree is at 5654 after S4; S6 or the closeout updates it).
- Rows per slice (ids): liveA20 15 (R20-0, POP-BG, POP-FG, POP-OTHER, POP-NONE, ARGS-ORDER, ARGS-3, CON-DESC, CON-NOTEA, CON-CAP, CON-4, CON-FLOOR, ARGS-OLD, RESTORE, LOGS); liveB20 8 (R20-0B, CHOOSE-TWICE, CHOOSE-KEPT, CHOOSE-REFUSE-DIS, G2-1, VERSION, RESTORE, LOGS) plus the row-less CLOSERPROBE; liveC20 8 (R20-0C, DEVT-UNDOCK, DEVT-EARLY, UP-DEVT, KEEP-4, SWEEP-HELD, RESTORE, LOGS) plus the `FLAG` record line. 31 ids.
- Each slice has its own proof row, RESTORE and LOGS. R20-LOGS patterns are only "the user's name" (read by the helper, never spelled in the doc), the sentinel (and the args sentinel) and the token, counted per stream, expected 0.

## 3. Verifier verdict

Not yet run (a fresh verifier checks the sheet against the pre-written text; R5.1 is the committed-before-observation check).

## 4. Deviations

- No §5 Run 20 skeleton (above).
- No banner rows or banner STOPs are carried: no R20 row re-measures a banner clause, so R19-BANNER-CTL and the Banner rule are dropped and the sheet says so. The brief did not list them.
- ARGS-OLD (MCP leg of R19-ARGS-OLD) is the last row of liveA20 and VERSION (MCP leg of R19-VERSION) the last row of liveB20, each with its own swap back to the current build and a `LOADED20 rerun`, instead of Run 19's separate slices D and E, because #384 fixes three live slices. If the runner prefers them in their own slices that is a sheet change before the run.
- The conditional DevTools rows (UP-DEVT, KEEP-4, SWEEP-HELD) are written as one table row with a rule that they run only for a leg that printed `devtools-refuses`.

## 5. Proposed decisions

None needed. One reading to rule on at the gate (proposed, mine): a DevTools row whose bridge call is refused is printed FAIL against the pre-written expectation `ok` (#391 (1)) and recorded as the finding `devtools-refuses`, with no STOP, so the expected text is not edited after the fact; the alternative is to call it PASS-as-finding.

## 6. Findings

- Pre-declared RECORD / NOT MEASURED / NOT REACHABLE / NOT RUN (written in the rows and in the sheet's "Rows that may end…" bullet): R20-0 `perm`/`listener` if the worker console cannot evaluate; R20-POP-OTHER `unjoined` (no such tab can be made on a fixture page: Stage 0) and `human` (UIA click unavailable); R20-POP-NONE `blocked` (RECORD if Chrome allows it); R20-CON-NOTEA's cut-path clause (NOT REACHABLE, S3a not run); R20-CHOOSE-TWICE's MCP leg (NOT MEASURED if the MCP serialises the calls); R20-CHOOSE-KEPT leg `same` (a record by design); R20-CHOOSE-REFUSE-DIS (RECORD if Chrome emits no chooser for a flipped or self-targeted disabled input; reachability stated first); R20-G2-1 legs (NOT DISCRIMINATING if B alone cannot be captured); R20-ARGS-OLD, R20-VERSION (NOT RUN if the old build cannot be loaded); R20-DEVT-UNDOCK/-EARLY (RECORD if the control or the undock cannot be done; NOT MEASURED if the control reads not attached; the three conditional rows NOT RUN when neither condition refuses).
- A stale statement outside my lane: `mcp/CLAUDE.md` ("`browser_console_messages` output … keeps the oldest lines") and `extension/src/CLAUDE.md` still describe the pre-S3b direction (S3b's "Left for later" already says so; S6 and the session agent).
- Expected texts and their sources (each quoted exactly in §4.28):
  - `CHOOSER_BUSY_MESSAGE` (`extension/src/handlers/upload.ts`; spec §10 Step 13 S4 note; `mcp/test/s13-chooser-busy.test.ts`).
  - `CHOOSER_TIMEOUT_MESSAGE` (`extension/src/upload-files.ts`); `DISABLED_INPUT_MESSAGE` (`extension/src/content/upload-target.ts`).
  - `JS_DISABLED_MESSAGE`, `DISARMED_ALL_MESSAGE` (`extension/src/safety.ts`); `JS_DISABLED_LINE`, `DISARMED_ALL_LINE` (`sdk/src/error.ts`, the MCP's own lines).
  - `ARGS_RELOAD_HINT`, `CHOOSER_RELOAD_HINT` (`daemon/src/intercept.ts`); K-devt overlap text (`extension/src/debugger-errors.ts`).
  - The cap marker `… [truncated: <n> older lines cut — narrow with level/limit]` and the none-fits variant (`sdk/src/format/console-messages.ts`, `sdk/test/s12-console-cap.test.ts`); the two description sentences of `browser_console_messages` (`mcp/src/tools/registry.ts`, pinned in `mcp/test/s12-console-cross.test.ts`).
  - `OPENER_JOIN_HOLD_MS` = 250 (`extension/src/opener-join.ts`).
  - Page order `zeta,alpha,mid,list` against Chrome's sorted `alpha,list,mid,zeta` (Stage0.md "Key order today"); the DevTools controls (window title `DevTools - <host>:<port>/<path>`, `getTargets()` `attached:true`) from `stage0-m2-D.txt`.
  - R20-CON-CAP's arithmetic: kept lines of 30 + 2 000 characters give k = 9 and a marker of `191 older lines cut` (derived, with a RECORD rule if the run differs).
- New fixture page needed (the only one): `s13-chooser.html` + `s13-chooser.js` under `test-fixtures`, queries `kept` (counters `clicks`, `input`, `change`, `cancel`, `files`, `size`, `digest`), `disflip` (button runs `in.click(); in.disabled = true;`), `disself` (a disabled input targeted directly), `disbtn` (Run 19's `dis` shape, the baseline). Every other row uses an existing page (`e2e-playground.html` s12 queries and `?popup=1`, `s12-console.html` con/tick/cap/notea/noteaok, `s12-chooser.html` c1/none, `s11-upload.html`). Its title goes into the driver window guard (#367).

## 7. Handoff: proposed split for S5-helpers and S5-drivers-A/B/C

Sizes are estimates of code plus tests, each under ~600; a slice that grows is split before it starts. Counts of existing files come from `wc -l` (s12-r19-a.ts 624, -b 321, -c 501, -de 117; s12-forms 136, -b 116, -c; s12-r19.ts 181; tests 126-597).

**S5-helpers (pure line forms, readers and the fixture; ~590)**
- `recipes/s13-forms.ts` (~220): the line forms (1)-(11) of §4.28 as pure formatters (`loadedLine20`, `keyorderLine`, `popLine`, `mcplineLine`, `chkeptLine`, `rectLine`, `ctrl20Line`, `devt20Line`, `flagLine`, `portLine`, `scan20Line`); the MCP-line judges built on the SDK's own constants (`DISARMED_ALL_LINE`, `JS_DISABLED_LINE`, the bare-message reader with `isError`); `busyExact` (the chooser-busy message); the cap judge for the newest-kept marker (`concapStats20`); the verdict maps for the DevTools control (PASS, RECORD, NOT MEASURED) and the disabled-input reachability; `hasConsoleClause20`.
- `recipes/test/s13-forms.test.ts` (~280): one failing test first per form and judge, including the old-text mutants (the old overlap text must fail `busyExact`; the old marker must fail the cap judge; a code-on-line-1 reader must fail the MCP-line judge).
- `test-fixtures/s13-chooser.html`, `s13-chooser.js` (~90).
- `recipes/tsconfig.s13.json` or add the files to `recipes/tsconfig.s11b.json` (all seven recipe tsconfigs must exit 0).

**Reused read-only (Run 19, never edited):** `recipes/s12-win.ps1`, `s12-win-b.ps1`, `s12-win-c.ps1`, `s12-r19-lib.ps1` (UIA: toolbar, options page, worker-console capture, `Close-S11Window`, the native-dialog closer and CLOSERPROBE); `s12-oldbuild.ts` (the scratch-worktree swap); `s11-rules.ts` (K table), `s11b.ts` (`realIo`, `windowed`), `s9-rules.ts`, `s10-rules.ts`; from `s12-forms.ts`: `conLine`, `conrefLine`, `floorCounts`, `conFloorLine`, `oldLine`, `forwardedFrom`, `argsLine`, `argsTotalLine`, `effLine`, `dataField`, `IDLE_MIN_MS_19`; from `s12-forms-c.ts`: `chooseLine`, `g2Line`, `versionchLine`, `dialogsLine`, `closerprobeLine`; from `s12-forms-b.ts`: `keepdtLine`, `sweepheldLine`, `K_DEVT`; the exported plumbing of the driver modules (`att`, `ev`, `fileOf`, `findTab`, `ROOT`, `state`, `timeline`, `sleep`, `say`, `sig`, `StopWhy`, `run`, `finish`).

**Needs an s13 counterpart (the Run 19 code pins an old text or reads the wrong source):**
- `s12-forms-b.ts` `CAP_MARK` and `concapStats`/`concapLine` (marker `more lines, the newest`, oldest kept) and `s12-forms.ts` `CAP_MARKER`/`conmcpStats` (same old marker): superseded by `concapStats20` (S3b, #398).
- `s12-forms-b.ts` `overlapExact`/`overlapLine` and the chooser judges at `s12-r19-b.ts:50` and `s12-r19-c.ts:87` (the DevTools overlap text for a second chooser call): replaced by `busyExact` (S4, #389); not reused (Stage0.md #382 amended).
- `s12-forms-b.ts` `devprobe`/`devprobeLine`/`attachedFrom` (`attached` taken from the refusal code): replaced by `ctrl20Line` and a window-title plus `getTargets()` control (#391 (1)).
- `s12-forms.ts` `loadedLine` (R19-0's `LOADED consoleMessages=…`): replaced by `loadedLine20`.
- `s12-forms.ts` `hasConsoleClause` (`/^R19-(ARGS|CON)-/`) and the R19 block runner `s12-r19.ts` (R19 ids, `scan18` profile-path/`://` scan): `s13-r20.ts` with `scan20` (name, sentinel, token).
- The MCP-leg readers inside `s12-r19-a.ts`/`-de.ts` (they matched the extension's text or a code on line 1): replaced by the MCP-line judges.

**S5-drivers-A (liveA20; ~600)**
- `recipes/s13-r20.ts` (~130, shared block runner and `scan20`, ids, aggregation) and `recipes/s13-r20.ps1` (~90, wrapper over `s12-r19-lib.ps1`).
- `recipes/s13-r20-a.ts` (~300): R20-0, the four POP rows (three SDK clients and the human-style click via the existing UIA helper), ARGS-ORDER, ARGS-3, CON-DESC, CON-NOTEA, CON-CAP, CON-4, CON-FLOOR, ARGS-OLD, RESTORE, LOGS.
- Tests (~280) over the pure parts of the driver. If it grows past the cap, split A1 (R20-0, POP, ARGS-ORDER, ARGS-3) and A2 (CON, ARGS-OLD, RESTORE, LOGS).

**S5-drivers-B (liveB20; ~560)**
- `recipes/s13-r20-b.ts` (~280): R20-0B, CHOOSE-TWICE (SDK and the MCP double call with the serialisation detector), CHOOSE-KEPT, CHOOSE-REFUSE-DIS (the three legs), G2-1 (two legs, the alone-control, C's poller), VERSION (the `63c771c` swap), RESTORE, LOGS.
- `recipes/s13-win.ps1` (~70): the window list rectangles and z-order with the covered-pixel count, numbers only, and the move-to-uncovered step.
- Tests (~210).

**S5-drivers-C (liveC20; ~540)**
- `recipes/s13-r20-c.ts` (~260): R20-0C, FLAG, DEVT-UNDOCK, DEVT-EARLY, the three conditional rows gated on `devtools-refuses`, RESTORE, LOGS.
- `recipes/s13-devt.ps1` (~90): the bridge-independent control (the process's top-level window titles for `DevTools - …`, the worker-console `chrome.debugger.getTargets()` read before and after the open), the undock step through the Run 19 app-menu opener, closing every DevTools window the wave opened.
- Tests (~190).
