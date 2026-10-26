# S4-sheet verifier report, round 2 (Step 11b, Run 17's wave sheet)

Model and effort: Opus 5.5, medium. Role: verifier (`docs/agent-rules.md` §6), re-check after fix round 1. Docs slice:
`node scripts/doc-check.mjs` is the only build-type check. Subject: the uncommitted §4.24 of `docs/e2e-test-plan.md`
(lines 1552–1661). Claims audited: `S4-sheet-fixer.md`. Line numbers below are file lines.

## 1. Verdict
**PASS-with-notes.** F1–F13 are resolved. The fixer's edits introduced two MINOR problems (N1, N2) and a few NITs
(N3). None of them can produce a false pass. N1 is a one-word edit and should go in before the commit, because
pre-registered text is frozen once committed.

## 2. Scope checks
- **Diff hunks.** `git diff -U0` shows three hunks, all in 1552–1661, so §4.20–§4.23 (from 1083) and §5 (1663) are
  unchanged. §4.24 is 110 lines (cap ~350).
- **`node scripts/doc-check.mjs`** exited 0 with `Checked 36 living docs (5 closed phase docs skipped for paths and
  status).` It printed four findings, all outside the slice: the planned `recipes/tsconfig.s11b.json`, `CLAUDE.md:112`
  4158, the 24/27/27 counts, and `extension/CLAUDE.md` at 3733 words.
- **Sensitive content.** The only URLs are `http://localhost:808x` fixtures. There is no real site, no user path (only
  `C:\Users\fixture-home`, `/home/fixture-home`, `/root`) and no token.
- **Table K17** is untouched. The new texts were checked against the code:
  - K-opt-sum's singular and plural forms (`options-model.ts:36-38,197-199`);
  - `HISTORY_SETTLE_MS = 10_000` (`handlers/history.ts:10`);
  - `#blocklist-caps` (`options.ts:47`);
  - `countRules` and `rulesOf` (`safety-dnr.ts:108,128`).

## 3. Per finding
- **F1 resolved.**
  - The STOP rule (1558) now stops only on proof that the page rendered, and says outright that K-own under the own
    URL is not that proof.
  - RD-7 (1624) records K-own, `ok` or any other answer. It stops only on `CTX count` > 0 or on the options page's
    content read by UIA. This matches `stage0-dnr-07.txt` (c8b: `tabContexts: []` after the redirect, one context in
    the direct control).
  - RD-8 stops on a `file:` URL in the tab. This matches Stage 0, where the tab stayed on the redirector with
    `ERR_UNSAFE_REDIRECT`.
- **F2 resolved** (1623). `d` = median(hop) − median(DL-ERR). About −300 ms means the event was in hand; within about
  50 ms of 0 is #303's trigger; positive `d` is recorded as unexplained. This is correct against `safety-hop.ts:60-75`:
  `settle()` resolves at once on a recent hit, wakes on `mark()`, and otherwise waits for its timer. It is also correct
  against `safety-call.ts:284`.
- **F3 resolved** (1617, 1648, helper item 2).
  - The typed expression is built from fragments.
  - A pre-type check prints `STOP: console input holds a pattern`.
  - RD-LOGS states that the capture includes the wave's own input.
  - The equality check against `rulesOf` is decidable: the helper evaluates the same fragment text in its own process,
    and the console prints `len` as a cross-check.
- **F4 resolved** (1635). RD-DL-SOCKET is now a no-regression row that records `HANDSHAKE during call: not exercised`
  and claims nothing about #296's handshake failure.
- **F5 resolved** (1630, 1633). `RULES expect=<N>` is printed, and the sample must equal N. NIT N3c applies.
- **F6 resolved** (1611, 1615, 1636).
  - RD-0 (c) defines `f`, `fi` and `bl`.
  - F-HOME expects `<f+1>` folders, written as the singular `1 upload folder.` or the plural, and `<fi+4>` invalid
    lines, which is always plural.
  - UP-OPT expects `<fi+3>` while typed, and the found `fi` clause, singular or plural, only when `fi` > 0.
  - The arithmetic checks out: four home lines are invalid in F-HOME, three lines are invalid in UP-OPT, and ROOT adds
    one folder.
- **F7 resolved** (1626-1627). One flip request is NOT DISCRIMINATING. Any answer other than `ok` or K-tab fails the
  row, and RD-FWD inherits both rules.
- **F8 resolved** (1632). The call starts at or after the stored value is read back and within 1 000 ms of the press;
  otherwise the row is NOT DISCRIMINATING.
- **F9 resolved, with the verifier's own second option.** `alias7` and `sock127` are added. BLK `localhost:8085` in
  any scanned stream is a STOP by design, and the rows that land on 8085 print labels only. The fixer's reason holds:
  an alias pattern would appear in the URL of every request to the blocked page anyway.
  - Residual risk (recorded, not a finding): Chrome may itself write a network-error line naming the 8085 URL into the
    worker console for RD-3 or RD-DL-HOP's blocked worker fetch. Under R14-LOGS's rule ("a Chrome-owned line naming a
    pattern fails the row too") that is a STOP at RD-LOGS. It comes at the end of the slice, after RD-RESTORE, so it
    costs no row. RD-DL-ERR's 8090 fetch is a free probe of whether Chrome logs failed fetches at all.
- **F10 resolved** (1611). RD-CAPS-WARN's read-only typing runs as RD-0 (a'), the first line of the record. N1 below
  applies to this edit.
- **F11 resolved, with a note.**
  - Every new item is in `recipes/s11b*` (`s11b-r17`, `s11b.ts`, `s11b-win`, `s11b-flip`, `s11b-slow`). `s11.ts`,
    `s11-win.ps1` and `s11-r16.ps1` are declared untouched, and `S11 foundcheck|l1|up7|saverefuse-*|restore-check|scan`
    all exist.
  - One exception remains, `s9-redirect.py --delay`. Its authority is indirect: the phase doc's S4 stage allows a
    change only for RD-7/8. #296 adopts `Stage0.md` item 9 (RD-5b with a delayed redirect), but the explicit sentence
    "`s9-redirect.py` gains a tested delay option" exists only in `stage0-audit.md:211-214`, a proposed entry not
    copied into `decisions.md`.
  - **Fix:** put the delay in a new `s11b-delay (.py)`, as was done for flip and slow, or have the step agent record
    the lane extension in the journal or as a decision.
- **F12 resolved** (1629). Sampling runs from 300 ms after the send to 300 ms before the reply.
- **F13 resolved** (1616). The clause with no quoted text is dropped.

## 4. New findings (in lines the fixer touched)

**N1 · MINOR · `:1611` (RD-0 fallback): the fallback's trigger is a STOP line, and the STOP rule ends the wave on any
STOP line.**
- **Text:** "the helper prints `STOP: console eval unavailable` before any change". The STOP rule (`:1558`) says "On any
  STOP line (… a guard printing STOP …) the runner … returns".
- **Effect:** the fallback the row describes can never run, and the two pre-registered texts contradict each other. It
  fails safe: no false pass, only a lost wave.
- **Fix:** print a non-STOP line, for example `FALLBACK: console eval unavailable`, and say in the row that this line
  is not a STOP.

**N2 · MINOR · `:1619` (RD-6) and the S4-helpers list (`:1654-1661`): the list misses helpers that rows depend on.**
- **RD-6's helper fails as named.** RD-6 names `Open-S11Window` to load `http://localhost:8083/…?s11b=rd6`. Its
  allow-list (`recipes/s11-win.ps1:50-53`, `Test-S11Url`) admits only ports 8081 and 8084, so the helper would print a
  Stop9 line.
- **RD-5's storage read-back has no named helper.** RD-5 needs a worker-console read-back of `storage.local` by count
  and hash, and helper item 2 lists only `manifest`, `rules`, `regex` and `ctx`.
- **Fix:** add an `s11b-win` opener that admits 8083 (as `Open-S11bFileWindow` was added) and a `B17 stored`
  read-back (count and in-process hash match, nothing printed but the verdict) to items 2 and 6. Name them in the RD-6
  and RD-5 helper cells.

**N3 · NIT.**
- (a) **RD-DL-HOP:** the pass rule says "`d` as above", but `d` is defined later in the same cell. Say "as defined
  below".
- (b) **RD-CAPS-WARN:** "f = found line count" reuses the `f` that RD-0 (c) now defines as the Upload folders' valid
  count. Write `<bl+2>` and `<bl+3>` with RD-0 (c)'s `bl`.
- (c) **RD-5b and RD-DISARM:** "N = `countRules` of found + BLK". `countRules` returns `{rules, regexRules}`, so write
  `countRules(…).rules`.
- (d) **RD-7:** "the options page's own content (its heading)". Quote the heading `Chrome Agent Bridge`
  (`extension/options.html:18`) so the UIA read is decidable.
- (e) **RD-REGEX:** the console echoes an expression's return value as well as its input. Say that the typed
  expression evaluates to `undefined` (or to the `REGEX` lines only), so no regex string is echoed as a result.

## 5. Deviations / proposed decisions
None from this verifier. F11's note asks the step agent either to record the `s9-redirect.py` lane extension or to
move the delay to an `s11b-*` server.

## 6. Handoff
- N1 should be fixed before the commit; N2 and N3 are recommended. They are small enough for the step agent to apply
  without another full fix round. If they are applied, a spot check of those lines is enough.
- Nothing is left running, and no file except this report was written.
