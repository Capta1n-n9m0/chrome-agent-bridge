# S4-live fixer 2: the two helper seams of Run 17 attempt 3

Model / effort: Opus 5.5, medium. Role: fixer (`docs/agent-rules.md` §6). Offline only: no Chrome, extension, daemon or live block run; `%TEMP%\bridge-e2e\s11b` not touched.

## 1. Verdict
DONE.

## 2. Outputs
Files (lane `recipes/s11b*`, `recipes/test/s11b-*`):
- `recipes/s11b-rules.ts`: `S9_SAY_PREFIX` (an optional `<ISO time> ` before the line), used by `parseCallRow` and `fileExistsFrom`. New pure `stateCompat`.
- `recipes/s11b.ts`: new subcommand `state-compat [--file <state.json>]` (default `$S11_OUT\state.json`). It prints key names only (`STATECOMPAT added opened` / `nothing missing` / `no state.json`).
- `recipes/s11b-r17.ps1`: `Invoke-R17Node`'s exit-1 crash test accepts the time prefix. After any `s11 make|setup|found`, the new `Sync-R17State` runs `B17 state-compat` and keeps the caller's `R17Out`. ASCII only.
- `recipes/test/s11b-seams.test.ts` (new, 98 lines, 7 tests).

Size: +40/-5 in the three helpers, plus 98 lines of test. That is about 140 lines, inside the 250 cap.

Commands:
- `npm test`: **179 files, 4495 passed** (was 178 / 4488; +1 file, +7 tests).
- `npm run typecheck` exit 0.
- All seven `recipes/tsconfig*.json` (fe, json, s10, s11, s11b, s6, s9) exit 0.
- `-Block plan` exit 0.
- Fail-on-HEAD proof: I made scratch copies of HEAD's `s11b-rules.ts`, `s11b.ts` and `s11b-r17.ps1` under `*-headx` names, and the new test pointed at them. **6 failed, 1 passed** (the one that passed only ties the fixture to s9.ts's `say` source). I removed the copies afterwards. No stash, checkout or reset.
- `git status --short` shows only my lane files plus the steps-dir files I did not make (the ledger `M` and the five untracked run files were there before I started).

## 3. Root causes
**(1) `s.opened.includes`.** Three helpers share one `state.json`:
- s11.ts writes it in its own shape. `make` (s11.ts:425) writes `{alias, sentinel, tabs, files}` from scratch. `setup` (s11.ts:468) and `found` (s11.ts:489) load the file, change it and save the whole object.
- s9.ts `noteOpened` (s9.ts:222-223) reads `opened`. It only builds a default when the file is *absent*.

So the first s9 `newtab` after `S11 make` throws. In liveA that is F-FILETAB's `New-R17Tab 'ft'`, the first s9 newtab of the slice (RD-CTL and earlier use s11/s11b only). That explains why "earlier newtabs passed": none had run through s9.

No helper drops another's keys:
- s9.ts `saveState` writes the parsed object whole (s9.ts:216-219, 372-374, 559-561).
- s11.ts `setup` and `found` do the same.
- Only `make` (fresh) and `clean` (removes the file) reset it, and both run before any s9 call or after the last.

`stateCompat` adds `opened: []`, and `tabs: {}` if `tabs` is absent. It never changes or removes a key. `id` and `at` are not added because s9.ts reads neither from the file.

**(2) NOT MEASURED.** `Save-R17Call` writes `R17Out`, the raw `node-out.txt` of the S9 call just before it, to `call-out.txt`. So the file did hold S9's output; that was not the mismatch. The mismatch is the format:
- s9.ts `say` (s9.ts:158) prints `` `${iso()} ${msg}` ``, so every S9 ROW line starts with an ISO time.
- `parseCallRow` anchored `^ROW `.
- The offline fixtures used bare `rowLine(...)` strings, with no time prefix.

`fileExistsFrom` (the `-file` line, s9.ts:681, also via `say`) had the same defect. So did the runner's crash test at `s11b-r17.ps1` `Invoke-R17Node` (`'^(ROW|CHECK) '`). Because of it, any s9 call exiting 1, such as a failed `--expect ok` in RD-4 or RD-DL-SOCKET, would have been thrown as "a crash" (a STOP) instead of being counted as a FAIL.

The new tests use the record's own line `2026-10-27T00:49:17.053Z ROW F-FILETAB snap DOMAIN_BLOCKED ...`. They also build lines with s9.ts's `say` form, and that form is pinned by a source assertion.

## 4. Deviations
- `recipes/tsconfig.s11b.json` does not list the new test. That file is outside the lane glob, so I left it alone. I proved the test type-checks with a scratch copy of that config with the test added (exit 0), then removed the copy. Follow-up: add `"test/s11b-seams.test.ts"` to its `include`.

## 5. Proposed decisions
None.

## 6. Findings: sweep table
Classes: (a) a parser in s11b* reading another helper's printed lines; (b) a shared state file read or written by more than one helper. A seam used by several blocks is listed once under "Shared", then per block.

**Shared seams (every block that calls them):**

| Seam | Class | Producer | Parser / reader | Status |
|---|---|---|---|---|
| S1 crash test on exit 1 | a | s9.ts `say` time-prefixed ROW/CHECK (s9.ts:158); s11.ts `say`/`checkLine` bare (s11.ts:228) | `Invoke-R17Node` `-match '^(ROW\|CHECK) '` | **FIXED** (optional time prefix) |
| S2 STOP count | a | s9.ts STOP via `stopLine`, no time prefix (s9.ts:1277, s9-rules.ts:657); s11.ts `say(\`STOP: …\`)` (s11.ts:968); s11b `say` bare | `Show-S16` `^STOP:` | OK |
| S3 judge-row | a | S9 `say(rowLine(...))`, `-file` line s9.ts:681 | `parseCallRow`, `fileExistsFrom` | **FIXED** |
| S4 state.json `opened` | b | s11 `make` (s11.ts:425-436) fresh without `opened`; `setup` / `found` keep the whole object | s9 `noteOpened` (s9.ts:222) | **FIXED** (`Sync-R17State` after s11 make/setup/found) |
| S5 state.json `tabs` | b | s11 `setup` writes `tabs[k] = "T<n>"`; s9 `newtab --as` writes `tabs[as] = "T<n>"` (s9.ts:559-561); same `Record<string,string>` | s9 `resolveTab` (s9.ts:258), s11b `handleOf` (s11b.ts, S11_OUT then S9_OUT, the same file in Run 17), s11 `handle` | OK (keys disjoint: s11 `l1,u6,j7,a7,sv,raw,ra,x`; s9 `ft,hb,hf,r1,r2,r4,r5,r5b,r7,r8,hs,he,rn,rdd`) |
| S6 state.json `alias` / `sentinel` / `files` | b | s11 `make` | s11b `s11State` / `filePath`, `scan` ctx (s11b.ts:385-386), `Get-R17Alias`, s11-win.ps1:57 | OK (written by make, kept by every later save) |
| S7 found.json | b | s11-win.ps1 `Save-S11Found` (lines 224-229: `armed, evaluate, blocklist{lines,sha256}, uploadfolders{…}, toggle`) | s11 `found` / `restore-check`; s11b `state` (`j.blocklist.lines`, `j.toggle`) | OK (attempt 3 printed RD-0's STATE and TOGGLE from it) |
| S8 found-blocklist.txt / found-uploadfolders.txt | b | `Save-S11Found` (raw texts) | s11b `rules --expect-from`, `foundlist`, `state --folders`; s11 `foundcheck` | OK (attempt 3: FOUNDLIST, RD-0 (d), FOUNDCHECK lines) |

**Per block (liveA and liveB):**

| Block | Seams | Status |
|---|---|---|
| preflight, servers, window, console, reload (reload-extension.ps1 output is shown, not parsed) | S1, S2 | OK / S1 FIXED |
| files | `s11 make` → S4 write | FIXED (state-compat runs after) |
| reload | `s11 setup --only …` → S4/S5 | FIXED |
| rd0 | `s11 found` → S4 (state-compat after); S7, S8; console lines (s11b-win, bare `^(MANIFEST \|ROW )`) | FIXED / OK |
| r17-up-l1 | s11 `foundcheck`, `l1` (S6 files) | OK |
| rd-ctl | s11b own output | OK |
| f-filetab | S3 (tabs, snap, nav, tabs2, ctl), S4 (`New-R17Tab ft`), S5, S1 | **FIXED** (the attempt 3 stops) |
| f-home, rd-caps-warn, rd-regex | s11b / s11b-win lines only | OK |
| history | S4 + S5 (`New-R17Tab hb, hf`); s11b `history` reads `tabs` via `handleOf` | FIXED / OK |
| g1-open, g1-close | s11b-win only; RULES via B17 | OK |
| rd1 | S3 (`lat` on `nav`), S4, S5, S1 (`-StopOnFail` exit 1 now reaches the row-level STOP, not "a crash") | FIXED |
| rd6 | s11b `hits` (bare `HITS`, s11b.ts:331) | OK |
| rd2 | S4 + S5 (`newtab --as r2`) | FIXED |
| rd3 | S3 (`lat` on `dl`), S1 | FIXED |
| rd-dl-err, rd-dl-hop | S3 (`e<i>`, `h<i>` + `h<i>-file`); `Save-R17Call` taken before `Get-R17Hits` (R17Out still S9's) | FIXED |
| rd7, rd8 | S4, S5; RD-8's `-match 'This tab shows a local file'` is unanchored over S9's snapshot output | FIXED / OK |
| rd-back, rd-fwd, rd-back-samedoc, rd-back-empty | `HISTREPLY` (s11b.ts:694), `FLIP … total=` (s11b.ts:334), bare; S4 for hs/he | OK / FIXED |
| rd-rebuild-narrow, rd-disarm, rd4, rd5, rd5b | S4/S5 (New-R17Tab), S1 (rd4 `--expect ok` exit 1 is now a FAIL, not a crash); `STOREDAT` (s11b.ts:315), `CALLT` (s11b.ts:951) bare | FIXED / OK |
| rd-dl-socket | S1 (12 `--expect ok` calls; an exit 1 is now counted, not a crash); `socket` s11b | FIXED |
| r17-up-opt, r17-up-6, r17-up-7, r17-save-refuse | s11 rows (bare) read through s11-win `Invoke-S11Row` (Run 16 recorded); s11b `judge-opt` over s11b-win JSON | OK |
| root-add, f-raw*, r17-up-race-a | s11b SDK subs: `handleOf` (S5), `s11State` (S6), `.ready` / `.pressed` signals | OK |
| r17-up-devt | `s11 setup --only x` → S4 | FIXED |
| rd-restore | S1 (`Call9 RD-7 tabs`); s11 `restore-check` over found.json / now.json (S7) | OK |
| rd-logs | s11b `scan`: console.txt (s9-win capture, `dropTitleLines`), actors via s11.ts's own `resultLines` (imported), state.json alias/sentinel (S6) | OK (scan not yet run live) |
| teardown | s11 `clean` removes state.json (no later reader) | OK |

No pass rule, expected text, verdict logic, K17 text or sheet changed. No new runtime fact for a package `CLAUDE.md` beyond this: "s9.ts prints every non-STOP line after an ISO time; s11.ts and s11b.ts print bare". It is already visible in the code and is now pinned by `recipes/test/s11b-seams.test.ts`.

## 7. Handoff
- Attempt 4 must start with `-Block teardown`, as runner 3 noted: `r17-globals.clixml` and `state.json` from attempt 3 are still in `%TEMP%\bridge-e2e\s11b`.
- Not committed (brief: commit no). The commit list is `recipes/s11b-rules.ts`, `recipes/s11b.ts`, `recipes/s11b-r17.ps1`, `recipes/test/s11b-seams.test.ts`, this report, plus the tsconfig follow-up in §4.
