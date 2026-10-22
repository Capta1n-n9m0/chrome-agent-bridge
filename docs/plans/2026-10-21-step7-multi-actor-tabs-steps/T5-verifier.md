# T5 (autonomous part) — independent verifier report

Written 2026-10-22 by the T5 verifier (Opus 5.5), over the uncommitted tree at HEAD `ecd07e4`
(`docs/e2e-test-plan.md`, `T5-wave-sheet.md`, `T5.ledger.md`, `recipes/t5*.ts`, `recipes/t5-win.ps1`,
`recipes/hello.ts`, `recipes/tsconfig.json`). The step agent's ledger was read as claims to audit.
Nothing here touched Chrome, started a daemon or a `claude` session, or ran `npm run build`.

## Verdict: **FAIL**

There are 4 MAJOR findings: two PASS conditions that a wrong behaviour can still pass (SCREEN-3's
"serialised" and LEASE-6's "discard"), one wrong expected text (LEASE-4's log line), and one helper
path that could leak a URL from the user's own tabs (DevTools window titles). Each one has a short fix.
The rest holds up:
- Almost every quoted string matches the code that produces it.
- Every Stage 0 PASS rule is copied and is equal or stricter.
- Typecheck and tests are unchanged.
- The NET-1 note is arithmetically right and is the only edit to existing text.

## Mechanical checks (all pass)

| Check | Command | Output |
|---|---|---|
| recipes typecheck | `npx tsc --noEmit -p recipes; echo $?` | `0` |
| repo typecheck | `npm run typecheck; echo $?` | `0` |
| tests | `npm test` | `Test Files 59 passed (59)` · `Tests 934 passed (934)` (unchanged) |
| fixture size | `wc -c test-fixtures/e2e-playground.html` | `13106` |
| fixture eol | `git ls-files --eol test-fixtures/e2e-playground.html` | `i/lf w/lf attr/text eol=lf` |
| KB | `node -e "console.log((13106/1024).toFixed(2))"`; `sdk/src/format/network.ts:75` `(bytes / 1024).toFixed(1)` | `12.80` → `12.8 KB` |
| diff shape | `git diff -U0 docs/e2e-test-plan.md` counted `-`/`+` | `1 -`, `99 +`; the one changed line is MUX-9, and with the inserted `*Corrected 2026-10-22 (Step 7 T5, …)*` sentence removed it is byte-identical to the old line (`MUX-9: only the note inserted`). No recorded run result was edited. |
| `t5-win.ps1` parse | `[System.Management.Automation.Language.Parser]::ParseFile(…)` | `parse errors: 0` |
| claude flags | `claude --help` | `--input-format <format> … "stream-json"`, `--output-format`, `--verbose`, `--allowedTools <tools...>` (variadic, last in `t5-actor.ts`'s argv, so no prompt is swallowed), `-p, --print` all exist |
| MCP error shape in a transcript | grep of an existing session `.jsonl` | `"type":"tool_result","content":"No active tab in the last-focused window","is_error":true`: the message comes through unprefixed, so the "exactly `tab … is held by …`" texts can match. `t5-actor.ts` `textOf` handles a string `content`. |
| PNG decoder | scratchpad `pngtest.ts`: own encoder, filters 0–4 cycled per row, RGB and RGBA, single and split IDAT, 97x120 | `mismatches so far 0` in all four cases; `pixel(20,20) #ff00ff (magenta)`; a cyan image reads `(cyan)`, a white one `(other)`; `imagesInTranscript` finds 2 of 2 |
| focus emulation | `grep -rn "setFocusEmulationEnabled\|Emulation\." extension/src daemon/src sdk/src mcp/src shared/src` | nothing. The only CDP methods sent are `Input.dispatchKeyEvent`, `Input.dispatchMouseEvent`, `Page.captureScreenshot`, `Runtime.awaitPromise/callFunctionOn/evaluate/releaseObject`. The BG retry really cannot be run (see m10). |
| token | `grep -n -i "token" recipes/t5*.ts recipes/t5-win.ps1` | comments only ("never reads or prints the token") |

Quoted strings confirmed against their sources:
- `daemon/src/intercept.ts` — TAB_HELD :335, TAB_GONE :324 (key order `tab, lastUrl, lastTitle`) and RELOAD_HINT :29–30.
- `registry.ts` — the `browser_list_tabs` format :284, `Selected tab …` :299, `Focused tab` :310, `Opened tab` :323, `Clicked` :186, and `Active tab: [...]` as the last line of `browser_status`.
- The snapshot header in `sdk/src/format/snapshot.ts` (3 spaces, JSON title).
- `tabs.ts` — the WINDOW_MINIMIZED text :153 and the discarded text :78.
- NO_NORMAL_WINDOW in `errors.ts` :59.
- REF_STALE in `content/actions.ts` :7.
- The client id `c${n}` in `registry.ts` :41.
- The fixture's `status: TRUSTED …` strings and its labels.

Every `say(...)` line that §4.14 quotes for RELOAD-1, LEASE-2/3/5/6, SCREEN-1…5 and BG-1/2/4 is printed by `recipes/t5.ts` in the same order and format.

## Findings

### MAJOR

**M1 — SCREEN-3 (a)'s "serialised" check cannot fail, so a non-serialised run passes.**
`recipes/t5.ts:661-673`; `docs/e2e-test-plan.md` SCREEN-3 row.
- **Why it cannot fail.** All three targets are opened with `newTab` in the same window, the human's
  window Ws (`chrome.tabs.create` with no `windowId`, `extension/src/handlers/tabs.ts:73`). In one
  window only one tab can be visible at a time, so the three targets' visible intervals are disjoint
  whatever the bridge does. `overlaps.length === 0` holds every time.
- **A run that passes without serialisation.** B reads `prev` (the human's tab); A reads `prev` (the
  human's tab); A shows a and captures it; B shows b and captures it; A restores the human's tab; B
  restores it again. Every image has its own colour, the human's tab ends active and current, and
  the intervals do not overlap: `SCREEN-3 (a) PASS … serialised: yes`. In that run the human's tab
  logs `hidden` **once**, not 3 times. The row records `human tab hidden <n> time(s)` but does not judge it.
- **Fix (stricter, before the run):** PASS also requires `hiddenCount === 3`, and the human's tab
  logs a `visible` between each target's `hidden` and the next target's `visible` (F19: the next
  capture starts only after the previous restore settled). State both in the row.

**M2 — LEASE-6 can print PASS (a) when no discard happened.** `recipes/t5.ts:442-490`.
- **The gap.** The poll takes the first snapshot error of any kind as "discarded". After that, `(a)`
  needs only the same handle, the same id, a post-reload snapshot of the lease6 URL and the lease.
  A transient snapshot error with no discard (a `TIMEOUT`, an injection failure, or the driver
  discarding the wrong row) gives `LEASE-6 PASS (a) — same chrome id, no replacement`.
- **The row does not close it.** It records the `while discarded:` line but does not make the
  discard text a condition. `listTabs` has no `discarded` field (`extension/src/handlers/tabs.ts:4-14`),
  so nothing else proves a discard.
- **Fix:** before judging (a) or (b), require `describeError(discardedErr)` to contain
  `The tab was discarded by Chrome's Memory Saver` (the as-built `tabs.ts:78` text). Otherwise print
  `LEASE-6 not measured — the snapshot failed without a discard: …` (exit 2). Write that condition
  into the row.

**M3 — LEASE-4's expected log line is wrong for the only possible count.**
`docs/e2e-test-plan.md` LEASE-4 row: "the log has `client - "claude-code #<A>" (<n> clients)`".
- `daemon/src/main.ts:82-84`: `` `${n} client${n === 1 ? "" : "s"}` ``.
- After `end A` only B is connected, so the daemon writes `client - "claude-code #<A>" (1 client)`.
  A literal judge would FAIL a correct run.
- **Fix:** `(1 client)` (MUX-7 already writes exact counts like `(0 clients)`).

**M4 — `t5-win.ps1` prints DevTools window titles verbatim, and those titles carry the inspected page's URL.**
`recipes/t5-win.ps1:50` (`$T5Titles = 'Agent Bridge E2E Playground|^T5 |^DevTools|Discards|^Extensions'`),
`:57-60`, `:103`.
- **The leak.** A DevTools window's title is `DevTools - <inspected URL>`. If the user has a
  DevTools window open on one of their own tabs, `Get-T5ChromeWindows` (used in LEASE-5 and
  RESOLVER-1) and `Get-T5Foreground` (RESOLVER-1 and SCREEN-5, before and after) print that URL into
  the wave's evidence. That breaks T5.4/B2 and the integrity floor ("the user's own tabs").
- **The other patterns** (`Discards`, `Extensions`) are unanchored and would name any user window
  whose page title contains them.
- **Fix:**
  - name a DevTools window only when its title starts `DevTools - chrome-extension://` (better: the
    bridge's own extension id); any other DevTools window prints as `<DevTools window>`;
  - anchor the other patterns to `^Discards - Google Chrome$` and `^Extensions - Google Chrome$`;
  - say in B2 that window lists are filtered by these rules.

### MINOR

- **m1 — LEASE-3's trusted fallback can hide a missing event** (`recipes/t5.ts:347-371`). If the
  synthetic click opens a popup but no `leaseGranted` arrives within 5 s, the trusted click opens a
  second popup. That one's event gives `LEASE-3 PASS (trusted click)`, which hides a relay or
  opener-rule failure for the first popup. **Fix:** FAIL when the synthetic click produced a popup tab
  (`popup tabs: ≠ none`) without an event.
- **m2 — Wrong exit code in B1.** B1 says a script refuses "exit 2" when the human's tab is not a
  fixture page. Only `check` does that (`t5.ts:150-155`). Every other command throws from
  `requireFixtureCurrent`/`humanOf` (`t5-lib.ts:93`, `t5.ts:502`), and `run()` prints
  `FAILED — Error: SET-UP: …` with exit 1 (`t5-lib.ts:170-174`), which contradicts the header
  "2 = a set-up problem". **Fix:** make `run()` set exit code 2 for a message starting `SET-UP:`, or
  correct B1.
- **m3 — Lost backslashes** (`docs/e2e-test-plan.md:131`):
  `` `python` here is `$HOMEminiconda3python.exe` ``. The backslashes were lost (the heredoc gotcha in
  memory); it should be `$HOME\miniconda3\python.exe`.
- **m4 — "leased to" is printed, not checked.** `opened <T#> … leased to <name>`
  (`t5.ts:301, 343, 525, 761`) is a literal string; the lease is never checked, yet LEASE-2/3 and
  SCREEN-1 quote it as expected text. **Fix:** check `owner` with `listTabs` before printing, or drop
  the words.
- **m5 — The regression block does not match #60.** #60 lists MUX-1 and DL-1 as designed-change
  rows. The §4.14 block leaves MUX-1 out of its designed-change list (the sheet's step 2 runs it) and
  puts DL-1 under "Regression (T5.3)". Also, PERC-1/2's quoted lines drop Run 2's
  `link "Jump to bottom" [ref=e9]`. **Fix:** align the block with #60 and add the missing line.
- **m6 — B1 is checked a while before the action.** B1 runs before a row, but the actors' first-touch
  `tabs.claim {active:true}` and `browser_new_tab` (and, more narrowly, the scripts' `newTab`) act
  seconds later, after model latency. If a user window is focused in between, an actor claims and
  snapshots a user tab, or opens a tab in the user's window. The row's `url:` checks catch it only
  after the content has been read. **Fix:** add B1 again immediately before each actor `send` that makes
  an untargeted first touch, and say what to do if a non-fixture `url:` shows up (stop; do not record it).
- **m7 — Actors may call any bridge tool.** `--allowedTools mcp__chrome-agent-bridge`
  (`t5-actor.ts:55`) allows all 22 bridge tools without a prompt. A model that strays from its prompt
  can navigate, close or select a user's tab. **Fix:** give each actor the exact tool names its rows
  use (the arg is variadic), and have the driver check every `TOOL …` line against the step; an extra
  call makes the row invalid.
- **m8 — RESOLVER-1 may open another extension's console.** `Invoke-T5Uia <We> 'service worker'`
  takes the first "service worker" link on `chrome://extensions`, which may belong to another of the
  user's extensions and open its DevTools. **Fix:** pass the row anchor:
  `Invoke-T5Uia <We> 'service worker' 'Chrome Agent Bridge'`.
- **m9 — Evidence images can show user data.** `PrintWindow` frames (SCREEN-2, A10) show the whole
  Chrome frame: the bookmarks bar, profile and extension icons. A computer-use capture of
  `chrome://discards` (LEASE-6's fallback) shows every tab's title and URL. **Fix:** the sheet's step 14
  says frames are never attached uncropped and `chrome://discards` captures are never kept.
- **m10 — The BG retry should be escalated, not proposed.** The retry being unrunnable is honest and
  not silent: the row and sheet step 12 both state it, and the grep confirms no bridge method can send
  `Emulation.setFocusEmulationEnabled`. But T5.2 is a pre-registered exit check, so on a BG FAIL it
  cannot be met as written. Under common.md's ESCALATION list ("anything touching a pre-registered
  rule (an exit check)") it should be reported as an escalation in `T5-autonomous.md`, not only as a
  "proposed decision".
- **m11 — MUX-3's title comparison cannot tell fixture tabs apart.** It compares the recipe's title
  with `browser_status`'s, and every driver window shows the same title `Agent Bridge E2E Playground`.
  The `hello.ts` change to `current` is right, but the check proves nothing. **Fix:** also compare the
  recipe's Chrome id with `t5.ts info`'s `chrome id` for the handle that status names.

### NIT

- **n1** — In BG-1/BG-2, `pass` (`t5.ts:788`) leaves out `got.vis === "hidden"`. The row's
  `background throughout: yes` covers it, but the script's own PASS should match the sheet's
  "target proven hidden".
- **n2** — LEASE-3 needs `granted.url === POPUP_URL`, while `shared/src/protocol.ts:117-118` says the
  `url` "may be """ (F33). This is stricter, which is allowed, but a FAIL from that cause should be
  recorded as "url empty", not as an opener-rule failure.
- **n3** — `t5-actor.ts:95` exits the host on the child's `exit`, which can come before the last stdout
  chunk is read. Use `close`.
- **n4** — `Set-T5Foreground`'s ALT tap (`t5-win.ps1:94`) goes to whatever window is in front,
  possibly the user's.
- **n5** — The RELOAD-1 row does not carry the [USER] tag for the reload (the sheet does).
- **n6** — In LEASE-1, "(`<A>` = A's MCP pid, B2 check)" means the `Get-ProcTree` check, not B2.
- **n7** — SCREEN-2/4's use of the SDK (the MCP has no `mode`) is explained only in the ledger, not in
  the rows.
- **n8** — Image paths print the user's `%TEMP%` path (the user name). It is harmless in the terminal;
  write `<you>` in the record.

## Coverage (checks 3, 7, 8)

- **The user's tabs (check 3).**
  - Scripts act only on `?t5=` or `?popup=1` fixture tabs, or after `requireFixtureCurrent`.
  - `cleanup` closes only unheld fixture URLs (`t5.ts:269`).
  - Script output prints URLs only through `showUrl` and titles through `showTab` (which leaves the
    title out); `describeError` withholds non-fixture URLs.
  - The remaining paths are M4, m6–m9.
- **Tags (check 7).** The tagging follows D6's [UI]/[SH]/[USER] model; [USER] is only the reload (#33).
  - T5.1: the reload, then RELOAD-1 (sheet step 1).
  - T5.2: SCREEN-1's method is written; BG PASS/FAIL is recorded.
  - T5.3: see m5.
  - T5.4: B2, plus M4/m9.
- **Phase-doc items (check 8).** Every T5 item in the phase doc has a row, and the deviations are stated:
  - LEASE-2 is a separate script (allowed by the dated note);
  - LEASE-5's URL and title are checked through the SDK;
  - LEASE-6's SW-console check was dropped, with a reason;
  - SCREEN-3 uses three SDK clients plus two Claude actors (stricter).

## Re-check (fix round 1)

Only the affected items were re-checked, under the same limits as before: no daemon, no connecting
command, no `claude` session, no Chrome, no build, no commit.

**Updated verdict: PASS-with-notes.** All 4 MAJOR findings are fixed; what remains is NIT.

| Item | Evidence | Result |
|---|---|---|
| tsc | `npx tsc --noEmit -p recipes` | exit `0` |
| ps1 | `Parser::ParseFile` · byte scan | `parse errors: 0` · `non-ascii bytes: 0` |
| M1 | `t5.ts:691-698`: PASS also needs `hiddenCount === 3`, the human's tab changing exactly 6 times after `t0`, alternating hidden/visible (`alternating`), and each target's `[visible, hidden]` inside a different hidden span (`distinct`, ±50 ms). The new `human tab changes after the calls: …` line is quoted in the SCREEN-3 row (`e2e-test-plan.md:637`). | fixed. The interleaved run from M1 (human hidden once) now FAILs. |
| M2 | `t5.ts:473-477`: the error must contain `The tab was discarded by Chrome's Memory Saver`, else `LEASE-6 not measured — the snapshot failed without a discard (set-up)` with exit 2; the row is updated. | fixed |
| M3 | `grep -o 'client - "claude-code #<A>" ([^)]*)'` | `(1 client)`; fixed |
| M4 | `t5-win.ps1:53-57`: `$T5Titles` anchored, `Format-T5Title` names only `^DevTools - chrome-extension://`, any other DevTools window prints as `<DevTools window>`, everything else as `<other window>`; used by `Get-T5ChromeWindows` (:67) and `Get-T5Foreground` (:110). `Open-T5Window` still calls `Get-T5ChromeWindows '.'` for `$before`, but uses only its handles. | fixed |
| m1 | `t5.ts:368-371`: a popup with no event gives FAIL, with no retry | fixed |
| m2 | `t5-lib.ts:174`: `SET-UP:` gives exit 2 | fixed; NIT left: `requireFixtureCurrent`'s "listTabs marks no current tab" (`t5-lib.ts:91`) has no `SET-UP:` prefix, so it still exits 1 |
| m3 | `e2e-test-plan.md:131` `$HOME\miniconda3\python.exe` | fixed |
| m4 | `t5.ts:59-64, 120-123`: `newTab` throws unless `listTabs` owner equals the client's name (WeakMap filled by `connectNamed`, which every command uses); BG and SCREEN-1 print "leased to" only after `newTab` | fixed |
| m5 | `e2e-test-plan.md:648-660`: MUX-1 and DL-1 listed as designed changes, the e9 line added, MUX-3's chrome-id comparison added (m11) | fixed |
| m7 | `t5-actor.ts:55-65, 124-126`: `start` needs `--tools browser_x,…` (checked by regex), and the host passes the exact `mcp__chrome-agent-bridge__<tool>` names to `--allowedTools` | fixed |
| m8 | row and sheet: `Invoke-T5Uia … 'service worker' 'Chrome Agent Bridge'` | fixed |
| n1 | `t5.ts:818`: `got.vis === "hidden"` in `pass` | fixed |
| n3 | `t5-actor.ts:105`: `child.on("close")` | fixed |

m6, m9, m10, n2, n5–n7: the fixer reports them done (step agent's message).
- I spot-checked only the n2 note (`t5.ts:386`).
- m6, m9 and n5–n7 are wording in the row and sheet; I did not re-read them line by line.
- m10 is promised for the stage report and is not yet written.

Not changed, accepted as NIT: n4 (the ALT tap) and n8 (the run record writes `<you>`).
