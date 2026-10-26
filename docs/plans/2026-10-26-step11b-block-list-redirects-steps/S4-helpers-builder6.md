# S4-helpers builder slice H6: the Windows UIA helpers (s11b-win.ps1)

Model Sonnet 5.5, effort medium. 2026-10-27.

## 1. Verdict
DONE. About 310 lines of .ps1, 40 of rules, 240 of tests. Nothing committed, nothing run against Chrome, no process left running. A PowerShell parse check ran clean (`Parser::ParseFile`, zero errors; also asserted in `s11b-win-static.test.ts`).

## 2. Outputs
- `recipes/s11b-win.ps1` (new; ASCII; dot-sourced AFTER s9-win.ps1 and s11-win.ps1; loads and redefines neither).
- `recipes/s11b-win-rules.ts` (new, pure mirror) with `recipes/test/s11b-win-rules.test.ts` (10 tests) and `recipes/test/s11b-win-static.test.ts` (21 tests, including a PowerShell child that runs `Test-S11bUrl`, `Test-S11bUnderRoot`, `ConvertTo-S11bSendKeys`, `Get-S11bTail` on the same cases as the TS mirror).
- `recipes/tsconfig.s11b.json` include and `recipes/tsconfig.s6.json` exclude extended.
- Numbers: before 169 files / 4308 tests (H5). After `npm test`: `Test Files 171 passed (171)`, `Tests 4339 passed (4339)` (+31, none removed). `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json`: exit 0. `npm run typecheck` 0, `npm run build` 0; after the build `git status` shows no tracked change except `journal.md` (not mine) and `tsconfig.s6.json` (exclude line).

## 3. Functions and return contracts (for H7)
Globals needed from the other two files: `$S11Out`, `$S11Utf8`, `$S9Repo`, `$global:S9WinIds`, `$global:S11Own`, `Say9`/`Stop9`.

**Console eval (RD-0 a/b, RD-REGEX, RD-7, RD-5, samplers).** The console window `$d` is the one `Open-S9WorkerConsole` returned (recorded in `$global:S9WinIds` at open time).
- `Invoke-S11bConsoleEval -Console $d -Sub manifest|rules|ctx|regex [-Opts @(...phase-1 args)] [-ReadOpts @(...--read args)] [-TimeoutMs 8000]` returns an int: B17's exit (0 pass, 1 fail, 2 STOP, 3 not measured) or **10 = FALLBACK** (the exact line `FALLBACK: console eval unavailable` was printed to host and `S9_RAW`; not a STOP). B17's own lines are printed (see filter below). Examples: `rd0 a`: `Invoke-S11bConsoleEval $d manifest`; `RULES 0`: `... $d rules -ReadOpts @('--expect','0')`; RD-7: `... $d ctx -Opts @('--tab',"$id",'--label','t1') -ReadOpts @('--label','t1')`; RD-REGEX: `... $d regex`. A B17 STOP in phase 1 (pattern in the typed text, regex proof) ends the call with 2, nothing typed.
- Long expressions (the `rules --sample` sampler, RD-5's stored poller): `$c = Start-S11bConsoleEval $d rules -Opts @('--sample','100','--for','4000')` returns at once after submitting. `$c.Code` is `$null` when submitted, else 2 or 10 (already printed). Later `Complete-S11bConsoleEval $c -ReadOpts @('--expect','<N>','--sample'...,'--after','0') -TimeoutMs <for+4000>` waits for the result lines and returns the same codes (on timeout 3 with a `NOT MEASURED` ledger line; pass `-FallbackOnTimeout` to get 10 instead, which `Invoke-S11bConsoleEval` always does). The ReadOpts are exactly what B17's `--read` takes (builder4 section 3).
- RD-5: runner starts `B17 stored ... --expr <f> --port-file <p> --signal <s>` in the background, waits for `<f>`, then `$c = Start-S11bConsoleEval $d stored -ExprFile <f>` (the stored process already pattern-checked it; the file must lie outside the repo, else throw). The call is started by the runner when `<s>` appears. `Test-S11bStoredAck $c` returns `$true` once the console shows `STOREDPOLL done` after this call (optional; nothing is printed).
- How it works: (1) `B17 <sub> --expr <file>` (a STOP ends it); (2) a separate fixed marker expression `void console.log("S11B-MARK <epoch ms>")` is typed first: it proves the console takes input (failure = FALLBACK, nothing but a log line was submitted) and anchors the reading; (3) the B17 expression is typed exactly as written (no text added) and submitted; (4) the console text is dumped (all UIA names, Console tab selected) to a file under `$S11Out`, only the lines AFTER the last whole-line marker are given to `B17 <sub> --read`, then the temp files are deleted. The marker is why a stale `RULES 0` from an earlier call, or a repeat Chrome collapses into one line with a badge, can never pass for the new result. The marker adds one unique line `S11B-MARK <n>` to the console capture (no pattern in it; tested with `preTypeCheck`).
- Typing: the window must be recorded by the wave, live, and titled DevTools (Chrome 156 titles it plain `DevTools`, so identity is the recorded handle); the foreground is forced and checked, the focus (prompt element or any element of the window's process) is checked before the text and again before Enter. Entry: ValuePattern `SetValue` with read-back equal; else Ctrl+A and `SendKeys.SendWait` of the escaped text (ASCII, one line only; `SendKeys` appears nowhere else). The prompt is the one focusable non-document element whose UIA name contains `prompt`; none or several = FALLBACK.
- Printing: `Write-S11bB17Out` prints only lines starting `MANIFEST `, `RULES `, `CTX `, `REGEX `, `STORED `, `STOREDAT `, `EXPR `, `ROW `, `STOP: `, `NOT MEASURED: `, `FALLBACK: `; other lines are counted (`B17: n other line(s) withheld`). One line in the file carries `# s11b-print-ok` (the exemption from the output scan), and a test pins it to the filter.

**Windows.**
- `Open-S11bWindow $Url` returns the handle, or 0 after `STOP: Open-S11bWindow: that URL is not on the allow-list ...` (checked before any window opens). Allow-list `^http://(127\.0\.0\.1|localhost):(8083|8081)(/|$)`; typed with `Set-S9Omnibox` (the URL is a fixture, printing it is as in s9).
- `Open-S11bFileWindow $Root $FilePath` returns the handle or 0 after a STOP (file not strictly under ROOT, or missing; drive-letter paths only, never a drive root, full-path case-insensitive compare, so `..` escapes are refused). Typed by the new `Set-S11bOmnibox` (it prints no URL: `Set-S9Omnibox` would print the `file:` path), then prints `FILEWINDOW <h> opened <ROOT>\name`. The window is recorded as the wave's own, so `Close-S11Window` works only if the page's `<title>` matches s11-win.ps1's `Format-S9Title` (for example `S11 file fixture`): **H7's files block must give `s11b-file.html` such a title.**
- `Get-S11bCaps $O` returns the texts of the `#blocklist-caps` `<li>` items as strings (`@(...)`, possibly empty), prints `CAPS items=<n> (texts withheld)`; throws if the options page shows no `#blocklist-summary` (so an unrendered page cannot read as "no warnings"). Real id and structure read from `extension/options.html:46` (`<ul id="blocklist-caps">`) and `options.ts` (`li.textContent = w`).

**Driver pieces.**
- `Invoke-S11bRaceA $Btn` for R17-UP-RACE-A: as `Invoke-S11Race 'A'` (button at ready + 1.5 s, again 1.6 s after the first, `.pressed` after loop-done) plus `UP-RACE-A.press` (epoch ms at which the OFF title was first read after the first press, polled every 20 ms, written before `.pressed`). If OFF is never read within 2 s: a STOP line, no `.press` file (B17 then says NOT MEASURED), the second press still restores. Returns what `Test-S9DaemonSafety` returns.
- `Invoke-S11bSamplerPasses -Ids @(...) -Hwnds @(...)`: `Invoke-S11Sampler` once per id; ids limited to builder 5's eight (`R17-UP-6-outside|-missing|-relative|-raw-dotdot|-raw-notarget`, `F-RAW`, `F-RAW-2`, `F-RAW-DIR`), anything else throws.
- `Invoke-S11bB17 <args>` (generic): runs `node --import tsx recipes/s11b.ts` with stderr discarded, 120 s bound (kills only its own child), returns `{Code, Lines}`. H7 may use it for the non-console B17 subcommands.

## 4. Unproven until the live run
- The console prompt: its UIA name/type on Chrome 156 (`prompt` match), that `SetValue` reaches the editor's state, or that SendKeys reaches it; that Enter submits. All of these end as FALLBACK if wrong, never as a wrong typed target.
- That a DevTools console text is fully visible to UIA (the dump) and that tree order is chronological (the marker tail depends on it).
- `Get-S11bCaps`: that an `<li>` is exposed as a ListItem with the text as its Name (Run 16's `Find-S11Texts` read the same page's `invalid-lines` list this way).
- Omnibox typing of a `file:///` URL, and that Chrome shows a `file:` document URL to UIA (only logged: `the page reads a file: URL: <bool>`; F-FILETAB's judgement is by `tabs`).
- The 20 ms title poll's lag against the real toolbar tooltip; `.press` is a lower bound on P.
- The keyboard layout is not checked before SendKeys (ASCII only; the text is escaped, not layout-translated).
- Static checks cover order of guards, the allow-list, ASCII, parse; nothing here ran a Chrome window.

## 5. Deviations, proposed decisions, findings
- Deviation: the sheet says "dump the console texts (Read-S9WorkerConsole's way)"; `Save-S11bConsole` is its own copy because `Read-S9WorkerConsole` prints its output path (a user temp path). Same walk.
- Deviation: `Open-S11bWindow` types with `Set-S9Omnibox`; only the file opener has its own typer.
- Proposed decision: 2026-10-27 · the console marker. **Decided:** a second, fixed, pattern-free expression (`void console.log("S11B-MARK <ms>")`) is typed before each B17 expression and the reading starts after its line. **Why:** the console collapses consecutive identical lines and keeps older lines, so counting or taking the last match could accept a stale `RULES 0`; clearing the console would erase the capture RD-LOGS scans. **Instead of:** clearing the console; adding a nonce to B17's expression. **Revisit if:** the marker line proves not visible to UIA (then the whole console path is FALLBACK anyway). **By:** Claude (proposed)
- Finding: the sheet's text-scan helper `scanPs1Output` flags any printed variable not on its safe list; this file prints only names on that list, plus the one marked line.
- Shell note: bash heredocs here turned `\` sequences into real characters, and a sed/node edit left literal CRs in a test; fixed with Write plus a scratch script.

## 6. Handoff
H7 (`s11b-r17.ps1` and its plan) dot-sources `s9-win.ps1`, `s11-win.ps1`, then `s11b-win.ps1`; calls per section 3; must keep `s11b-file.html`'s title `S11 ...`; needs `$d` from `Open-S9WorkerConsole` before RD-0 and must treat return 10 as the FALLBACK branch (RD-0 (a')).
