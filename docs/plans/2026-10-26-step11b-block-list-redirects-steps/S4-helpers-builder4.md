# S4-helpers builder slice H4: the B17 CLI (console, stored, hits, ctl, scan)

Model Sonnet 5.5, effort medium. 2026-10-27.

## 1. Verdict
DONE. About 600 new lines (s11b.ts 300, test 215 plus). Nothing committed.

## 2. Outputs
- `recipes/s11b.ts` (new): `parseArgs`, `Stop`, `main(argv)` returning the exit code, `cmds` table (H5 adds its SDK subcommands at the marked line; this file needs no SDK connection and does not import `s11.ts`, whose top-level imports pull the SDK), one printing site (`say`).
- `recipes/test/s11b-cli.test.ts` (new, 21 tests; python-free except `ctl`).
- `recipes/tsconfig.s11b.json`: include extended (`s11b.ts`, the test). `recipes/tsconfig.s6.json`: exclude extended with the test (exclude only, as H2/H3).
- No change to `s11b-rules.ts`, `s9*`, `s11*`, `§4.24`, `journal.md`.

Exit codes: 0 pass, 1 fail, 2 STOP (prints `STOP: …`), 3 not measured / not discriminating.

## 3. The console contract for H6 (`Invoke-S11bConsoleEval`), exact
Subcommands `manifest`, `rules`, `ctx`, `regex`, `stored`.
1. **Phase 1, `<sub> --expr <file> [opts]`**: writes one line, no newline, to `<file>`; that text is what H6 types. Before writing, `preTypeCheck(text, {token, alias (--alias), profilePath = home})`: a match prints `STOP: console input holds a pattern`, exit 2, file not written. On success prints `EXPR <sub> ok len=<n>`. `regex` first runs `regexProof()`: a mismatch prints the `NOT MEASURED: the typed fragments do not build the regexes of safety-dnr.ts rulesOf` text, exit 3, nothing written. Options: `rules --sample <ms> --for <ms>` (the in-console sampler), `ctx --tab <chrome tab id> --label <l>`.
2. **Phase 2, `<sub> --read <dumpfile>`**: H6 saves the console's text (UTF-8, or UTF-16 with BOM) to a file. Only whole lines of the exact form count, so the echoed input is harmless. Prints the sheet's line (`MANIFEST …`, `RULES n`, `RULES samples=[…] min= max=`, `CTX <label> count=<n>`, five `REGEX …` lines) and, where the row has a judgement: `manifest` prints `ROW RD-0 (a) PASS|FAIL`; `rules --expect <N>` (with `--sample`: also `--after <n>`, judged by `judgeSampleThenZero`; without: a single `RULES n` must equal N, a miss with N = 0 is a STOP); `ctx` count above 0 prints a `ROW RD-7 STOP` and `STOP:` line. No line found: `NOT MEASURED: no <MANIFEST|RULES|RULES samples|CTX|REGEX (all five)> line in the console dump (nothing was read)`, exit 3. RD-0's `FALLBACK: console eval unavailable` stays the runner's.
3. `rules --expect-from <found-file>`: no console; prints `RULES expect=<N>`.
4. **`stored`**: `stored --expected <file outside the repo> --port-file <f> [--timeout <ms=30000>] [--for <ms>=timeout] [--signal <file>] [--expr <file>]`. One process: binds 127.0.0.1 on an ephemeral port, writes the port to `<port-file>` and, with `--expr`, the `storedExpression(port, for)` (pattern-checked as phase 1) in the same step; H6 types that file when it exists. It accepts several POSTs (first is the value already stored), judges each by sha256 in this process; on a match writes `--signal` (a file holding the epoch ms) and prints `STORED match=yes lines=<n>` then `STOREDAT <epoch ms>`, exit 0. On timeout `STORED match=no lines=<n>`, exit 3. **RD-5 choice:** the runner watches for the signal file (written inside the request handler before the process exits) and starts the call at once; `STOREDAT` is the timestamp for `GAP` (`judgeGap`'s `readbackT`). An expected-text file inside the repo is a STOP. The received text and any hash are never printed or written (tested).
Order for H6 with `stored`: start `stored … --expr` (a background process), wait for the `--expr` file, type it, wait for the signal file, start the call.

## 4. Other subcommands
- `hits --log <redirect>[,<blocked>] --tag <t> [--flip <flip log>]`: two logs print H1's `HITS <tag> redirect=<n> blocked=<n>`; one log prints `HITS <tag> redirect=<n>` only (no blocked part, so a missing log cannot read as 0); `--flip` adds `FLIP <tag> n200=<a> n302=<b> total=<t>` (RD-BACK/FWD's two-request check). A missing log file is a STOP. Note: MSYS Git Bash mangles a comma-joined path argument; pass Windows-style paths (`C:/…`).
- `ctl --log85 <8085's log> [--p83 --p88 --p89 --p86 --p91 --p85]` (defaults the sheet's): idle socket on 8083, two concurrent `redirect: manual` GETs of 8083, 8088, 8089, 8086, 8091's flip twice (unique path+query per run), one GET of 8085 tagged `s11b=ctl`, then the count of that tag in the 8085 log; prints `judgeCtl`'s lines and `ROW RD-CTL …`; a miss is `STOP:` exit 2. The probe is written here (`s9.ts`'s is a non-exported function in a script that runs at import). Requests go to 127.0.0.1.
- `scan --what console|daemon|actors|other --file <f> [--alias <a>] [--mark-from <s> --mark-to <s>]`: `scan17`, `scanLine17`, `verdict17`; token from `BRIDGE_TOKEN` or `bridge.token`; sentinel from `S11_OUT\state.json` if present (never printed). Prints the SCAN line and `ROW RD-LOGS …` (plus `STOP:` on a stop). The marks are the strings standing in the capture (`SockWindow`).

## 5. Numbers
- Baseline (H3): 167 files, 4257 tests. After: `Test Files 168 passed (168)`, `Tests 4278 passed (4278)` (+21, +1 file, none removed). Tests were written with the code; one fixing round was for test expectations only (the `EXPR` line precedes `STORED` when `--expr` is given).
- `npx tsc --noEmit -p` over all seven `recipes/tsconfig*.json`: 0 (s11b first showed an unused import, removed). `npm run typecheck` 0, `npm run build` 0; after the build `git status` shows no tracked change except `journal.md` (not mine) and `tsconfig.s6.json` (exclude lines).

## 6. Dry-run lines (fixture files, free ports; no Chrome)
```
manifest --expr F            -> EXPR manifest ok len=281
manifest --read F            -> MANIFEST dnrWithHostAccess=true staticRuleSets=absent
                                ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
rules --read F --expect 0    -> RULES 0 / ROW RULES PASS: RULES 0
rules --expect-from F        -> RULES expect=2   (found text: one host)
ctx --label t1 --tab 5 --expr F -> EXPR ctx ok len=145;  ctx --label t1 --read F -> CTX t1 count=0
regex --expr F               -> EXPR regex ok len=659
stored --expected E --port-file P --timeout 3000 --signal S --expr X (one POST of the text)
                             -> EXPR stored ok len=437 / STORED match=yes lines=1 / STOREDAT 1793049681406
hits --log L,B --tag t1      -> HITS t1 redirect=1 blocked=0
scan --what console --file F -> SCAN console: ://=1 (fixture 1, other 0) token=0 localhost:8085=0 aaaaaaaaaaaaaaaaaaaaaaaa=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0
                                ROW RD-LOGS PASS: all counts zero
ctl                          -> in the test (python delay and flip servers, node stand-ins for the redirectors and 8085, port 0): ROW RD-CTL concurrent 302 in <a> ms, 302 in <b> ms (idle socket held open: yes) x4, CTL 8091 flip 200 then 302, HITS ctl redirect=0 blocked=1, ROW RD-CTL PASS; with a quiet 8085 log: STOP: RD-CTL: controls missed
```
(`hits` with one MSYS-mangled comma path was a STOP in the dry run, see §4; the line above ran with Windows-style paths.)

## 7. Deviations, proposed decisions, findings
- Deviation: no import of `s11.ts` (it imports the SDK at load); `parseArgs` and `Stop` are re-written here with the same shape. No `s11b-rules.ts` change.
- Proposed decision: 2026-10-27 · `stored` and signal file. **Decided:** the signal is a file written on the first match; a timeout exits 3. **Why:** a file the runner polls starts the call within a poll tick, no pipe parsing. **Instead of:** the runner reading stdout. **Revisit if:** H6 cannot poll a file fast enough. **By:** Claude (proposed)
- Not measured: whether the real worker can POST to loopback (H2's open fact); the console typing itself (H6).
- A shell edit with `sed` turned `\n` into a real newline in a test; fixed by Edit (memory note on Bash and backslashes applies to sed too).

## 8. Handoff
H5 adds SDK subcommands in `cmds` (at the marked comment) and may reuse `parseArgs`, `Stop`, `main`. H6 follows §3. No process left running.
