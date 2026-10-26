# S4-helpers builder slice H5: the B17 SDK subcommands

Model Sonnet 5.5, effort medium. 2026-10-27.

## 1. Verdict
DONE. About 390 new lines in `recipes/s11b.ts` (now 735), 160 test lines, 49 lines of pure additions to `recipes/s11b-rules.ts`. Nothing committed. Nothing was run against Chrome, the extension or the daemon (offline only: no fake proto:2 extension, it did not fit the cap).

## 2. Outputs
- `recipes/s11b.ts`: `back`, `forward`, `history`, `socket`, `race`, `devt`, `up6`, `raw` in `cmds`. `BOOLEAN_FLAGS` now `--dry`, `--no-sampler`.
- `recipes/s11b-rules.ts` (small pure additions, end of file): `judgeErr17`, `historyPlan`, `RACE_*`, `raceDue`, `raceDone17`, `WINDOW_*`, `windowViolations`.
- `recipes/test/s11b-sdk.test.ts` (new, 30 tests). `recipes/tsconfig.s11b.json` include and `tsconfig.s6.json` exclude extended with the test.
- Numbers: before 168 files / 4278 tests (H4). After `npm test`: `Test Files 169 passed (169)`, `Tests 4308 passed (4308)` (+30, none removed). `tsc --noEmit -p` on tsconfig, .fe, .s6, .s9, .s10, .s11, .s11b: all exit 0. `npm run typecheck` 0, `npm run build` 0; after the build `git status` shows no tracked change beyond `journal.md` (not mine) and `tsconfig.s6.json` (exclude line).

## 3. How the SDK is reused (the decision asked for)
`s11.ts` is not imported at load: its helpers (`session`, `attempt`, `loadState`, `fp`, signals) are not exported and its imports pull the SDK. s11b.ts re-states the small ones (same client options `failureReports:false`, token from the SDK's own source, claim and release in `finally`, tab keys from `$S11_OUT/state.json` then `$S9_OUT/state.json`, handles `T<n>` as given). The SDK and s11.ts's exported `toPage` load by dynamic `import()` inside these subcommands only; H4's subcommands and every test stay SDK-free. s11.ts and s9.ts are untouched.

## 4. Subcommands
Exit codes as H4: 0 pass, 1 fail, 2 STOP, 3 not measured / not discriminating. Client name `s11b-<sub>`.
- `back|forward --row RD-BACK|RD-FWD|RD-BACK-SAMEDOC|RD-BACK-EMPTY --tab <key|T<n>> [--times 2] [--rules-after n --blocked n --flip-total n]`: claims the tab, calls `tab.back()`/`tab.forward()`, prints `LAT <row> <ms> ms`, `ANSWER <row> ok|CODE "<sheet text>"` (a message is printed only if it is one of the K17 texts, else its length), `RECORD <row> answer=… reply-ms=… status-after=NOT MEASURED (the SDK exposes no tab status)` (`listTabs` rows carry no status). `--times 2` is RD-FWD's two forwards (first labelled `<row>-1`, must be ok). With `--rules-after` (from `B17 rules`) it judges: RD-BACK/RD-FWD `judgeHistory` (needs `--blocked`, `--flip-total` from `B17 hits --flip`), SAMEDOC `judgeSamedoc`, EMPTY answer ok and rules 0. Without it, record only (no ROW line).
- `history --kind back|fwd|samedoc|empty --tab <t> [--tag t]`: builds the histories with the SDK's `navigate` and `back`, URLs from `historyPlan` (sheet URLs, localhost, tags `bk`/`fw`/`sd`/`be`): back = `8091/h/back?s11b=bk` then `8081/e2e-playground.html?s11b=bkp`; fwd = `?s11b=fw0`, `?s11b=fw1`, `8091/h/fwd?s11b=fw`, then back twice; samedoc = page, page plus `#h2`; empty = two 8081 pages. Prints `HISTORY <kind> built …`. For RD-BACK-SAMEDOC the sheet navigates in G1 time, not before; the `history --kind samedoc` is the same two navigations and may be run at the row's time.
- `socket --for <ms> [--signal-file <f>] [--calls n --calls-ok n --rules-after n]`: `daemon.status.extensionConnected` every 250 ms (scheduled from the start) until the duration or the signal file exists; prints `SOCKET samples=<n> connected=<n>`; with the three call flags `judgeSocket`, else a samples-only row `RD-DL-SOCKET (samples only)`.
- `race`: signal `UP-RACE-A` (same ids as Run 16's `Invoke-S11Race`), then calls alternate `s11-1k.bin` / `s11-sent.bin` on tab key `ra`, call n due at T0 + (n-1)*150 ms (schedule, not reply-paced; a slow reply makes the next start at once), at least 60, at most 120, stop after the minimum once five refusals in a row. Each call prints `CALL <n> start=<ms> reply=<ms> <ok|CODE>`. Then `UP-RACE-A-loop-done`, waits `UP-RACE-A.pressed`, reads P, prints `RACE P=<ms> from ready; calls=<n>`, `RECORD UP-RACE-A page-files=<n>`, `judgeRaceA`'s record, and the row: every refusal exact K-disarmed with data, marks paired and 0 left, `judgeRaceA`. P file missing: `ROW UP-RACE-A NOT MEASURED`.
- `devt`: reset, signal `UP-DEVT`; after the driver's F12: control `evaluate` (`return (1);`), `tab.upload({css:"#up-single"}, s11-1k.bin)`; signal `UP-DEVT-done`; after F12 again control 2; page read last. Control 1 not K-devt: `ROW R17-UP-DEVT NOT MEASURED: DevTools was not attached`. Else K-devt exact on the upload, page 0 files with mark added then removed, control 2 ok. Control 2 is a single call (no retry; a retry would tune the pass rule).
- `up6`: five steps (outside K-gate, missing K-missing, relative K-relative, raw-dotdot K-gate, raw-notarget K-notarget). Per step: page reset (outside the window), then the banner window, then the page read (outside). `CHECK R17-UP-6 <step> …` lines, then `ROW R17-UP-6`.
- `raw --row F-RAW|F-RAW-2|F-RAW-DIR|F-RAW-ENC|F-RAW-OK [--dir <name>] [--enc <name>]`: raw `uploadFiles {tab, locator:{css}, paths}` through the client, no SDK preflight, tab key `raw`. F-RAW: `[ROOT\s11-missing.bin]` K-raw-missing(0); F-RAW-2: `[s11-1k.bin, missing]` on `#up-multi`, K-raw-missing(1); F-RAW-DIR: `[ROOT\<dir>]` K-raw-dir(0) (default dir name `s11b-dir`); F-RAW-ENC: `[ROOT\<enc>]` (default name `s11b enc #%ü.bin`, hash computed from the file on disk) ok, 1 file, name and sha256 equal, mark paired; F-RAW-OK `s11-1k.bin` ok with the standard clauses. Refusals print `LEAKS <row> <n>` (ROOT, the base folder, `s11-missing.bin`, `s11-1k.bin`, the dir name, the sentinel, in slash, backslash and JSON-escaped forms, via `rawLeaks`), must be 0; page untouched (0 files, no change/input, mark never set), no banner.
- Every subcommand with `--dry` prints `PLAN <sub> ok …` after parsing and connects to nothing.

## 5. The signal / mark file contract for H7's runner (files in `$S11_OUT`, default `%TEMP%\bridge-e2e\s11`)
A `<name>.ready` file holds the epoch ms (race) or an ISO time (others); the driver answers by writing `<name>.pressed` (non-empty).
1. `race`: wait `UP-RACE-A.ready` (T0 = its content); button pair at ready + 1.5 s as `Invoke-S11Race` does; **new:** the driver must write `UP-RACE-A.press` (epoch ms of the OFF `TITLE`) before it writes `UP-RACE-A.pressed`. Then it waits for `UP-RACE-A-loop-done.ready`, does the second press, writes `UP-RACE-A.pressed`. Run 16's `Invoke-S11Race` writes `.pressed` only; H6/H7 add the `.press` file.
2. `devt`: `UP-DEVT` and `UP-DEVT-done`, as `Invoke-S11Change` with `Send-S11DevTools` (unchanged from Run 16).
3. Banner window, once per refusal call, **one sampler pass per id** (so the runner calls `Invoke-S11Sampler` five times for `up6`, once for each F-RAW/F-RAW-2/F-RAW-DIR): ids `R17-UP-6-outside`, `-missing`, `-relative`, `-raw-dotdot`, `-raw-notarget`; `F-RAW`, `F-RAW-2`, `F-RAW-DIR`. Handshake exactly as Run 16's `sampled()`: `<id>-sample.ready` -> sampler starts, writes `<id>-sample.pressed`; B17 sleeps 500 ms, calls, sleeps 2 500 ms after the reply; `<id>-sampled.ready` -> the sampler's 4 s tail -> `<id>-sampled.pressed` = `seen`|`none` (B17 waits up to 30 s). No bridge call of this process runs in the window (ledger-checked; the SDK's own internal calls are not visible to the ledger, and `Tab.upload` makes one).
4. `socket` is stopped by a file the runner creates (`--signal-file`); the runner passes the three call flags from the S9 loop.
5. F-RAW-ENC and F-RAW-OK have no sampler handshake (the rows have no banner clause).
6. Prerequisite files: `state.json` with tabs `u6`, `raw`, `ra`, `x` and the wave files as Run 16's `make`/`setup` write them; `ROOT\s11b-dir` (a folder) and the ENC file made by the runner's files block.

## 6. Dry-run lines (parse only; `--dry`)
```
back --row RD-BACK --tab r1 --dry      -> PLAN back ok row=RD-BACK op=back times=1
race --dry                             -> PLAN race ok id=UP-RACE-A spacing=150 calls=60..120
up6 --dry                              -> PLAN up6 ok steps=5 window=-500..+2500
raw --row F-RAW-OK --dry               -> PLAN raw ok row=F-RAW-OK
```
The others (`forward`, `history`, `socket`, `devt`, `raw` rows) are in the test file with their exact PLAN lines and the STOP lines for a bad `--row`, `--kind`, `--times`, a missing `--tab` or `--for`.

## 7. Deviations, proposed decisions, findings
- Deviation: no fake-extension integration test (cap). The connect-and-call paths, the SDK's `Tab` calls and the driver handshake are proven only by types and the injected-IO test of `windowed`; they are untested against a real daemon.
- Deviation: tab keys for `back`/`forward`/`history` resolve through `$S11_OUT` then `$S9_OUT` state (the S9 `newtab --as r1` keys), or a `T<n>` handle; the tab's lease is claimed and released per process.
- Proposed decision: 2026-10-27 · the race press record. **Decided:** the driver writes `UP-RACE-A.press` (epoch ms of the OFF title) before `UP-RACE-A.pressed`. **Why:** Run 16's driver wrote only `done`, so P was unavailable. **Instead of:** B17 reading the toolbar itself. **Revisit if:** H6 cannot record the title time. **By:** Claude (proposed)
- Not measured: `tabs.get().status` after `goBack` (not observable through the SDK; printed NOT MEASURED); whether the ledger sees the SDK's internal calls (it does not).
- A first splice attempt with a shell heredoc failed; the code was written with the Write tool and spliced with node (memory note on heredocs applies).

## 8. Handoff
H6 adds the PowerShell side per section 5 (the `.press` file and the per-id sampler passes). H7's runner calls `B17 back|forward|history|socket|race|devt|up6|raw` with the options above. No process left running.
