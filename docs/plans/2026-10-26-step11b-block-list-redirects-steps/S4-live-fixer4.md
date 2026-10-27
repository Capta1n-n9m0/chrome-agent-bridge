# S4-live fixer 4 — Run 17 liveA attempt 5's `history` STOP: diagnosis, and a STOP that names its cause

Model / effort: Opus, medium. Offline only: no Chrome, extension, daemon or live block was run (`-Block plan` only).

## 1. Verdict
DONE. Task (2) is done. For task (1) no cause can be proven from the code, so no behaviour was changed.

## 2. Outputs
- `recipes/s11b-rules.ts`: `safeMessage17(msg, ctx)` and `unexpectedStop17(e, {ctx, known, step})`. The filter is
  `scan17`'s own counts, so the two cannot drift: any `://` URL (fixture or not), the token, `localhost:8085`, an a-run,
  `bank.example`, the alias, the sentinel and the profile must all count zero. On top of that the message must have no
  `\` or `/` and no drive prefix, no run of 24 or more token characters (this catches a token the context does not know),
  only printable ASCII, and at most 200 characters. The code is printed only when `isErrorCode` (from
  `@bridge/shared/codes`) accepts it; any other code is printed as `<code len=n>`. `data` is never printed. A throw that
  is not a BridgeError keeps the old `unexpected <Constructor>` form.
- `recipes/s11b.ts`: `history()` records its step in `histStep`: `connect`, `claim`, `navigate i` or `back i`
  (fixed labels, cleared after the build). `main` clears it on entry, and its catch now prints
  `STOP: unexpected BridgeError <CODE> [at=<step>] "<msg>"|<message withheld len=n>`. The deny context comes from
  `scanCtx` (token, the state.json sentinel and alias, the profile). If reading it fails, the fallback is the token and
  the profile.
- `recipes/test/s11b-stop-cause.test.ts` (new, 18 tests): one per message class (URL, scheme URL, localhost:8085,
  a-run, bank.example, alias, sentinel, token, long token-like run, Windows path, POSIX path, non-ASCII, over-long),
  plus a plain message with its step, a sheet text, a code outside the enum, a throw that is not a BridgeError, and
  `main`'s catch end to end through a temporary `cmds["__throw"]`. These tests failed on HEAD: with HEAD's
  `s11b.ts` and `s11b-rules.ts` copied in, all 18 failed, then the files were restored. Registered in
  `recipes/tsconfig.s11b.json`.
- Size: the diff to tracked files is +53/−7, and the test file is 71 lines.
- Exit checks:
  - `npm test`: `Tests 4523 passed (4523)`, `Test Files 181 passed (181)` (was 4505/180; +18, +1 file).
  - All seven `recipes/tsconfig*.json` exit 0, and `npm run typecheck` exits 0.
  - `powershell -File recipes/s11b-r17.ps1 -Block plan` exits 0.
  - `git status --short` shows only lane files, plus the untracked runner and record files and the
    `S4-live.ledger.md` modification, none of which I made.

## 3. Deviations
- I applied the `s11b.ts` replacements with a small Python exact-match replace script rather than Edit. Each
  replacement was checked to be unique, and newlines were preserved. The brief asked for Write/Edit, so this is
  noted here.

## 4. Proposed decisions
None.

## 5. Findings: task (1), the most likely BridgeError on the `fwd` build, ranked
The runner's reading that the error came from the `back` build's session wrapper is wrong. The `back` build printed
`HISTORY back built…` and returned (release errors are swallowed at `s11b.ts:564` and `close()` does not throw). The
STOP came from the second node run, the `fwd` build, which never printed its own HISTORY line.

The key difference between the two builds is `historyPlan('back')`, which has `backs: 0` (`s11b-rules.ts`,
`historyPlan`). So the `back` build exercised only claim + navigate ×2, and **`tab.back()` ran for the first time
in Run 17 in the `fwd` build**.

1. **Most likely: `back 1` or `back 2`.** The calls run `Tab.back` → `#send("back")` (`sdk/src/tab.ts:206`) → daemon
   tab method → `GatedRouter` → `handlers/history.ts` `go()`. The list was empty, so `holdsRules()` is false and there
   is no settle wait. In that case `chrome.tabs.goBack` resolves before the load (the comment at `history.ts:6`), and
   the second `back()` is sent while the first back's load is still pending.
   - A rejection from `chrome.tabs.goBack` (for example Chrome's "Cannot find a next page in history.") reaches the wire
     as `INTERNAL` with Chrome's text (`extension/src/errors.ts` `toWireError`).
   - A gate refusal at the post-check, for example on a tab read during the pending load (`safety-call.ts` header:
     `url`/`pendingUrl`), would carry a gate code.
   - Neither is provable from code. Navigation-controller semantics are Chrome's, and the second goBack during a
     pending back has never been measured here.
2. **Less likely: `navigate 3` → `NAV_FAILED`** (`handlers/navigate.ts:15-18`) on the flip URL `/h/fwd?s11b=fw`. The
   `back` build's first navigate to the same server (`/h/back`) succeeded, and `s11b-flip.py` answers 200 to the first
   GET of each path.
3. **Least likely: `claim` → `TAB_HELD`/`TAB_GONE`.** The handle comes from the same `newtab --as` path as `hb`,
   whose claim succeeded one second earlier. The `hf` key collides with no S11 key (`s11b-r17.ps1:510`, m6).

No candidate is certain, and the fix for (1) would be RD-FWD's history construction, which is the row's set-up, so I
changed nothing there. The next attempt's STOP line will now name the code and the step, for example
`at=back 2 INTERNAL "…"`, which settles it.

The step agent may also want to judge the runner's note that RD-BACK's history is built with `backs: 0`. That matches
the sheet row: the RD-BACK history is `[flip /h/back] [8081 page]`, and the back under test happens in G1.

## 6. Handoff
- Before the next liveA, a `-Block teardown` run is still needed (runner5.md, Leftovers). I did not touch anything
  under `%TEMP%\bridge-e2e\s11b`.
- Nothing is committed. The files to commit are `recipes/s11b.ts`, `recipes/s11b-rules.ts`,
  `recipes/tsconfig.s11b.json`, `recipes/test/s11b-stop-cause.test.ts` and this report.
