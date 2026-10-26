# S4-sheet verifier report (Step 11b, Run 17's wave sheet)

Model and effort: Opus 5.5, medium. Role: verifier (`docs/agent-rules.md` §6). Docs slice: typecheck, test and build
were not re-run (brief). Subject: the uncommitted `docs/e2e-test-plan.md` §4.24 (lines 1552–1662). Claims audited:
`S4-sheet-builder.md`.

## 1. Verdict
**FAIL**: three MAJOR findings (F1–F3). Each is a pre-registered text that would give a false STOP or a wrong recorded
conclusion, and pre-registered text cannot be edited after the run. Everything else holds, with MINOR notes.

## 2. What was checked, and what holds
- **Diff scope.** `git diff -U0 -- docs/e2e-test-plan.md` has three hunks, all between 1552 and 1662. §4.20–§4.23 and
  §5 are unchanged. §4.24 is 111 lines (cap ~350).
- **`node scripts/doc-check.mjs`**: exit 0, `Checked 36 living docs (5 closed phase docs skipped for paths and status).`
  It printed four findings, all outside this slice: the planned `recipes/tsconfig.s11b.json`, `CLAUDE.md:112` 4158,
  `extension/CLAUDE.md` at 3733 words, and the code counts 24/27/27.
- **Table K17 against the constants, byte for byte.** I grepped every key myself and all match:
  - `safety.ts:195-226`: `BLOCKED_URL/TAB`, `OWN_PAGE`, `FILE_PAGE/URL`, `DISARMED_ALL`, `UPLOAD_REFUSED`.
  - `handlers/upload.ts:33`.
  - `upload-exists.ts:120-128`, including the `upload: ` lead and the `; nothing was uploaded` suffix.
  - `sdk/src/upload.ts:40-74`, where `refuse` adds `upload: `.
  - `debugger-errors.ts:52`: no `[chrome.debugger]` prefix on `DEBUGGER_DEVTOOLS`.
  - `save.ts:111-129`: REFUSALS, and STRINGIFY with `data {name:"TypeError"}`.
  - `options-model.ts`: lines 88-93 and 135-149, and the summaries at 197-199.
  - `options.ts:82` (the curly quotes) and `tabs.ts:303`.
  - `badge.ts:71`: `safety: disarmed by the user`.
  - `HISTORY_SETTLE_MS = 10_000` and `MAX_SAFE_REGEX_CHARS = 119`.
- **Long-host fixtures, executed** (a tsx scratch script; nothing committed):
  - `blockListRuleWarnings`: H119 alone gives `[]`; H119+H120 gives `Line 2: …`; all three give `Lines 2, 3: …`.
  - `rulesOf` regex lengths: 119, 120 and 121.
  - The `bank.example:443` pair is `^(?:http|ws)s://(?:[^/?#]*[@.])?bank\.example\.?(?:[/?#]|$)` (59) and
    `^[^:/]+://(?:[^/?#]*[@.])?bank\.example\.?:443(?:[/?#]|$)` (57), exactly as the sheet quotes them.
  - The caps list re-renders on `input` (`options.ts:130,183`), so typing without saving is enough for RD-CAPS-WARN.
  - The builder's finding 1 (the bound is the regex length, not "about 90 characters") is **sound**.
- **Ports.** `netstat -ano | grep -E "[:.](808[0-9]|809[0-9]|9234)[[:space:]]"` printed no line (exit 1) at
  `date -u` = Mon Oct 26 2026 20:31 UTC. The builder's 20:17 UTC is therefore plausible: 14 minutes earlier, and the
  27 Oct in the preamble is the local date. The fixtures the sheet names exist (`test-fixtures/e2e-playground.html`,
  `dl/hello.txt`).
- **Existing helpers named in the sheet exist:**
  - `s9.ts`: `redirect-probe`, `wait-safety`, `scan-log`, `scan-file`, `navigate`, `newtab`, `download-file`.
  - `s11.ts`: `saverefuse-*`, `restore-check`, `raw`, `up6`.
  - `s11-win.ps1`: `Set-S11Box -NoSave`, `Set-S11Flag`, `Invoke-S11Opt`, `Invoke-S11ButtonPair`, `Send-S11DevTools`,
    `Restore-S11Safety`.
  - `s9-win.ps1`: `Get-S9DocUrl`, `Invoke-S9PressWhenReady`.
  - `s9-redirect.py` keeps path and query (`Location = target + self.path`), so query tags reach 8085.
- **Required rows are present:**
  - RD-0 (counted and hashed; the build proved by `getManifest()` in the worker console, not the extensions page).
  - RD-CTL, RD-1, and RD-2 as a RECORD row (#295).
  - RD-3 (R14-5c's text, 0 blocked hits).
  - RD-4, RD-5, RD-5b, and RD-6 (pre-written 1, 0.4 (C)).
  - RD-7 and RD-8 as RECORD rows.
  - RD-BACK, RD-FWD and RD-BACK-SAMEDOC, RD-DL-HOP, RD-CAPS-WARN, and RD-REGEX (both `bank.example:443` regexes plus
    long hosts).
  - F-HOME (K-opt-home), F-RAW\*, F-FILETAB.
  - R17-UP-L1, -UP-6, -UP-7, -SAVE-REFUSE (console from before RD-0), -UP-OPT, -UP-RACE-A (per-call times), -UP-DEVT
    (control `evaluate` proves DevTools), with Run 16's record untouched.
  - RD-LOGS, RD-RESTORE, the helper column and the S4-helpers list.
- **Placeholder mapping is faithful.** Nothing was dropped. RD-PERM and RD-START went into RD-0, RD-NAV-HOP into RD-1,
  RD-REBUILD into RD-5b, and RD-BACK-EMPTY was kept with an honest `NOT RUN` when the found list is non-empty.
- **The builder's other findings are sound:**
  - The flip redirector is needed: a 302 makes the history entry the final URL.
  - `back` may answer K-tab: it is class `tab` and the post-check reads the URL. Recording either answer is honest.
  - RD-0 needs console entry by UIA, which no committed helper does. The fallback is stated.
  - RD-5b comes from F9.
- **No real site, token or user path.** Only `C:\Users\fixture-home`, `/home/fixture-home`, `/root`, `bank.example`,
  `<ROOT>` and `<OUTSIDE>` appear.
- **Bounds were not shaped to flatter an earlier result.** UP-OPT keeps 5 000 ms against Run 16's 6 061 ms, RD-6
  expects 1 with 0 as a STOP, and RD-2 is a RECORD per #295.

## 3. Findings

**F1 · MAJOR · `docs/e2e-test-plan.md:1624` (RD-7): the STOP condition fires on the outcome Stage 0 measured as safe.**
- **Pass rule:** "**STOP** if the answer is K-own or the row is `hidden` (Chrome followed the redirect onto an own
  page)".
- **Evidence:** `stage0-dnr-07.txt`, RESULT: "Own page: the redirect is cancelled (… `net::ERR_BLOCKED_BY_CLIENT` for
  the own URL); no extension context exists in the tab … — but tab.url and title READ the own page's URL (an error page
  committed under it), so the gate's post-check sees an own-page URL and refuses". `Stage0.md:66-67` says the same.
- **Effect:** the likely and safe outcome (K-own, row hidden, nothing rendered) is pre-registered as "Chrome followed",
  which is a STOP. This contradicts phase doc 0.7 and the As-built of Stage 0.
- **Fix:** expect K-own or `ok`, and record which. STOP only on proof that the page rendered, for example an extension
  context in that tab (worker console `chrome.runtime.getContexts({contextTypes:["TAB"]})` filtered by the tab's id,
  count > 0, as Stage 0's `c8b` did), or the options page's own content read by UIA in a window the wave opened. RD-8
  is fine as written: on `file:` the tab stayed on the redirector URL (`ERR_UNSAFE_REDIRECT`).

**F2 · MAJOR · `:1623` (RD-DL-HOP): the latency inference is inverted.**
- **Text:** "a hop reply more than 250 ms above the slowest RD-DL-ERR time suggests the rejection came before the
  `onErrorOccurred` event …; a time near 300 ms above is the 'revisit if' trigger".
- **Evidence:**
  - `safety-hop.ts:60-75` `settle()` resolves at once if a hit is already recorded, wakes early on `mark()`, and
    otherwise resolves on the 300 ms timer.
  - `safety-call.ts:283-285` and `handlers/download.ts:67`: every rejected fetch with rules held calls it.
  - RD-DL-ERR runs in G1 (list non-empty) and gets no `ERR_BLOCKED_BY_CLIENT` event, so it always waits the full
    300 ms.
  - A hop therefore replies at or below the DL-ERR baseline: about 300 ms below it if the event was in hand at
    rejection, and near the baseline if the event came near 300 ms after it. "More than 250 ms above" cannot happen,
    and the #303 trigger would be misread.
- **Fix:** restate it. (hop − DL-ERR median) ≈ −300 ms means the event was in hand. A value within about 50 ms of 0
  means the event arrived late in the window, which is #303's "latency near 300 ms" trigger. Keep it RECORD.

**F3 · MAJOR · `:1617` (RD-REGEX) with `:1648` (RD-LOGS) and `:1558`: the wave's own console input trips its own scan
and STOP.**
- The five regexes are "built by the helper from `safety-dnr.ts`'s own `rulesOf`" and must be entered into the worker
  console. The console pane echoes input.
- `Read-S9WorkerConsole` (`s11-r16.ps1:161-166`, `s9-r14.ps1:421-428`) captures that pane for RD-LOGS.
- H119–H121's regexes contain runs of 24 `a`, so RD-LOGS's `aaaaaaaaaaaaaaaaaaaaaaaa=0` cannot hold. "A pattern … in a
  log" is a row-level STOP (`:1558`).
- "No pattern text printed (labels only)" governs output only, not input.
- **Fix:** the typed expression must contain no pattern literal. Build the hosts in-console (`'a'.repeat(24)`, and
  `['bank','example'].join('\\.')` for the escaped form) and print only the `REGEX` line. Or exclude the wave's own
  input lines from the capture by a stated, testable rule. Say which in the row and in the S4-helpers item 2.

**F4 · MINOR · `:1635` (RD-DL-SOCKET): the row cannot discriminate.**
- Its premise is that 36 s spans "a keepalive reconnect". But `sw.ts:360-366`'s alarm only calls `connect()`, and the
  offscreen answers `alreadyConnected` for the same key (`offscreen.ts:~20`). No new WebSocket handshake happens while
  the socket is up, and #296's measured failure was on new handshakes.
- **Fix:** force a handshake inside a held download, or reword it as a no-regression row with
  "handshake during call: not exercised" recorded. The typed-rule guard stays the unit test.

**F5 · MINOR · `:1633`, `:1630`: in-flight samples are written as `= 1`.**
- RD-5b (`= 1 (the new list's countRules …)`) and RD-DISARM (`= 1`) are written as if the found list were empty. With
  a non-empty found list the count is `countRules(found + BLK)`.
- **Fix:** expect `= countRules(found+BLK)`, computed by the helper and printed as a number.

**F6 · MINOR · `:1636`, `:1615`: summary counts are undefined or hard-coded plural.**
- R17-UP-OPT's `<f+1> upload folders.` hard-codes the plural and does not define `f`. With no found folder the page
  reads `1 upload folder.`. §4.23 UP-OPT kept "K-opt-sum's singular/plural".
- F-HOME's "n = found count" should be the found *valid-folder* count, and its "4 invalid lines" should add the found
  invalid count.
- **Fix:** define both counts from RD-0's found record and quote K-opt-sum's singular and plural forms.

**F7 · MINOR · `:1626-1627` (RD-BACK, RD-FWD): two outcomes are not classified.**
- If the flip server sees only 1 request (a back/forward-cache restore, since Chrome has been admitting `no-store`
  pages), the clause "2 requests" fails the row although nothing was tested. Classify that as NOT DISCRIMINATING.
- An answer other than `ok` or K-tab (for example `DISARMED`/`STATE_UNREADABLE`, `TIMEOUT`) is not said to fail.
  Say so.

**F8 · MINOR · `:1632` (RD-5): the call can start before the save lands.**
- `GAP ≤ 1 000 ms` has no floor. A call sent before `storage.local` holds BLK reads the old list and escapes, which is
  a test artefact.
- **Fix:** start the call after the stored value reads back with BLK (or `onChanged`), still within 1 000 ms of the
  press. Otherwise the row is NOT DISCRIMINATING.

**F9 · MINOR · `:1648` (RD-LOGS): the counted pattern set is incomplete and partly ambiguous.**
- The scan omits the R17-UP-7 (b) fixture alias, and `127.0.0.1` from RD-DL-SOCKET, which can only be counted if it
  is distinguished from fixture URLs.
- BLK `localhost:8085` is also a fixture origin, so any fixture URL to 8085 in a scanned stream counts as a pattern
  leak, which is a false STOP risk. Runs 13–16 kept the pattern distinct from fixture URLs by an alias.
- **Fix:** count the alias as well. Use a `*.localhost` alias for BLK, or state that a fixture URL to 8085 in a scanned
  stream is a STOP by design.

**F10 · MINOR · `:1611` (RD-0 fallback) versus D4.2: the fallback proof does not come first.**
- With no console evaluation, D4.2's "first line proves the build" is replaced by proofs that come later (RD-1,
  F-HOME, RD-CAPS-WARN).
- **Fix:** in the fallback, run RD-CAPS-WARN's read-only typing (an S3b-build text) as RD-0 (a'), the record's first
  line, as stage0-audit F17 suggested for F-HOME.

**F11 · MINOR · `:1654-1661` (S4-helpers list): the list asks for edits outside S4's lane.**
- S4's lane (phase doc, `S4`) is `recipes/s11b*` and `recipes/test/s11b-*`. The list asks for:
  - edits to `s9-redirect.py` (delay, flip): the phase doc allows a change only for RD-7/8; stage0-audit allows a
    delay option;
  - `s11-win.ps1` (`Open-S11Window -AllowFile`);
  - `s11.ts` (`race a`, `devt`, `up6`, and `raw` re-expected, which changes Run 16's helper).
- **Fix:** put the new behaviour in `recipes/s11b*` files (B17 subcommands, an `s11b-redirect.py` or `s11b-flip.py`),
  or have the step agent record the lane extension as a decision.

**F12 · NIT · `:1629` (RD-REBUILD-NARROW): the sampling window has no start.**
- "Samples never 0 while the call is in flight": the first sample can precede the install.
- **Fix:** sample from 300 ms after the send to 300 ms before the reply.

**F13 · NIT · `:1616` (RD-CAPS-WARN): one clause has no quoted text.**
- "the summary counts them as blocked sites" has no expected text. Quote the block-list summary form, or drop the
  clause.

## 4. Deviations
None.

## 5. Proposed decisions
None (fixes F1–F3 restore the phase doc's intent; no contract question).

## 6. Handoff
- Fixer: F1–F3 are required; F4–F13 are recommended in the same round, since none can change after the commit.
- A fresh verifier re-checks F1–F3 (and any reworded MINOR rows) only.
- Nothing is left running. The scratch script is in the session scratchpad.
