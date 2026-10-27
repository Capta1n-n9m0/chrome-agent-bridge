# S1-live runner report: liveA18, attempt 1

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
ESCALATE: the runner exited 2 (STOP). Rows R18-0, UP-L1 and R18-BANNER-CTL passed; block r18-up-opt threw, and the wave ended. The safety state was restored and read back.

## 2. Outputs
- HEAD: e1e68e00ec53a589738c7b376d2246c2411c362d (as expected). Tree clean before and after `npm run build` (only untracked files under the steps dir).
- Build: `built extension → dist/` (last line of `npm run build`, no error).
- Exit code: 2. Out dir: `$TEMP/bridge-e2e/s12-live/a1`.
- Files: S1-live-record-liveA18.txt (first line is the `MANIFEST … BUILD …` line), S1-live-evidence-liveA18-att1.txt (63 lines, filtered from runner-stdout), this report. No console evidence copy: `console-liveA18-evidence.txt` was not produced (only `console-liveA18.txt` exists, left in the out dir); R18-LOGS never ran.
- Framing file (`r18-framing.txt`) at the end holds only the block start/done lines (the runner's stdout carries the full lines).

## 3. ROW lines in order (as printed)
- `ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent`
- `ROW RULES PASS: RULES 0`
- `ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on`
- `ROW RD-0 (d) PASS: the found list blocks no fixture URL`
- `ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank`
- `ROW R18-0 PASS slice=A`
- `ROW UP-L1 PASS: all checks hold` (then `CHECK R18-UP-L1 console-clause pending R18-LOGS`)
- `ROW R18-BANNER-CTL PASS slice=A`
- `ROW R18-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms`
- No row for R18-UP-OPT or anything later; `CHECK rows …` was never printed.

R18-BANNER-CTL detail: neg leg `polls=17 banner=none` (`CHECK bannerctl-neg violations=0`); pos leg `polls=16 banner=seen` (`CHECK bannerctl-pos violations=0`), `ANSWER R18-BANNER-CTL pos ok`; `BANNERCTL liveA18 leg=neg idle-ms=15074 …`, `… leg=pos answer=ok …`.

## 4. STOP (from runner-stdout, last line before EXIT 2)
- `s9-win: WAVE stopping: an exception in block r18-up-opt (ParameterBindingArgumentTransformationException; message withheld (id ParameterArgumentTransformationError,Get-S9Options))`
- `STOP: the wave ended (an exception in block r18-up-opt (ParameterBindingArgumentTransformationException; message withheld (id ParameterArgumentTransformationError,Get-S9Options))) (at 2026-10-27T20:33:45.010Z)`
- Preceded by `BOX uploadfolders set (1 non-blank line(s); saved; text withheld)` at 20:33:19, then 15 s until the throw. The failing call is `Get-S9Options` (parameter binding), so the helper argument is probably the cause; I did not investigate (not my lane).

## 5. Restore read-back (stop procedure)
- Toggle pressed off then on (titles confirmed: OFF, then armed).
- `BOX uploadfolders set (0 non-blank line(s); saved; text withheld)`; `RESTORE uploadfolders lines=0 hash=equal`.
- `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`; `RESTORE ok: the found texts (outside the repo) deleted after the read-back matched`.
- No failed-restore STOP, so teardown is allowed per the handoff step 5 (I did not run it).
- Found state: armed, JS on, blocklist 0 lines, uploadfolders 0 lines (empty-text hash e3b0c442…); both the toggle and the lists matched at the end.

## 6. R18-LOGS
Not run: no `SCAN` or `CONSOLE` lines from the runner (only `CONSOLE … submitted` lines of R18-0). The block was never reached.

## 7. Scan (`recipes/s11b.ts scan18 --what other`)
- Evidence file: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; `CHECK R18-LOGS scan other PASS: all counts zero`.
- Record file: same line, all zero, PASS.
- No console copy to scan.

## 8. Process listing
- Runner's own teardown stopped srv8081 (`stopped own process srv8081`). Windows it opened were closed.
- Still listening: 127.0.0.1:9234, PID 35188, `node.exe` running `daemon\dist\index.js` of this repo. The wave started it through the SDK (the preflight said 9234 was free); I left it (exit 2: nothing further against Chrome, no teardown).
- 8080-8089: nothing listening. `r18-globals.clixml` remains in the out dir, so a later attempt needs `-Block teardown` with `S11_OUT=<out dir>` first (the "previous wave's globals exist" STOP).
- Chrome untouched by me.

## 9. Handoff
Step agent decides: fix r18-up-opt's `Get-S9Options` call (recipe lane), run `-Block teardown` on the a1 out dir, new `S11_OUT` and `-Att 2` for the next attempt. This attempt counts as a runner attempt. Untracked files left: the record, evidence, report (and the ledger).
