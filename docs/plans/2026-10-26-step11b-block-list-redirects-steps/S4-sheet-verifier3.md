# S4-sheet verifier report, round 3 (Step 11b, Run 17's wave sheet)

Model and effort: Opus 5.5, medium. Role: verifier (`docs/agent-rules.md` §6), re-check after fix round 2, scoped to
N1, N2, N3 (a–e) and the F11 note of `S4-sheet-verifier2.md`, plus the lines round 2 touched. Claims audited:
`S4-sheet-fixer2.md`. Subject: the uncommitted §4.24 of `docs/e2e-test-plan.md` (file lines 1552–1661).

## 1. Verdict
**PASS-with-notes.** N1, N2, N3 (a–e) and the F11 note are resolved. Round 2 broke nothing in the lines it touched.
Two new NITs (R3-1, R3-2) concern how the new `B17 stored` helper prints its verdict. Neither can produce a false pass,
and either can be settled by the S4-helpers builder.

## 2. Scope checks
- **Diff confined to §4.24.** `git diff -U0 -- docs/e2e-test-plan.md` has three hunks, at 1552, 1554 and
  1561→1556,106. All of them fall in 1552–1661, and `## 5. Results template` starts at 1663. §4.24 is 110 lines
  (cap ~350). `git diff --stat`: +109/−46 in the plan, plus a 1-line journal entry outside this slice.
- **`node scripts/doc-check.mjs` exited 0** with `Checked 36 living docs (5 closed phase docs skipped for paths and
  status).` It reported four findings, all pre-existing and outside the slice: `tsconfig.s11b.json` planned, the
  24/27/27 counts, `CLAUDE.md:112` 4158, and `extension/CLAUDE.md` at 3733 words.
- **K17 is still byte-exact.** A script compared every placeholder-free text in K17 (1582–1603) with the sources
  `safety.ts`, `handlers/upload.ts`, `debugger-errors.ts`, `evaluate/save.ts`, `options-model.ts`, `upload-exists.ts`
  and `sdk/src/upload.ts`.
  - K-url, K-tab, K-own, K-filepage, K-fileurl, K-disarmed, K-gate, K-notarget, K-devt, K-node, K-map, K-cycle,
    K-opt-stand, K-opt-home and K-opt-root were found verbatim.
  - Four texts are composed in the code, and each matches once composed:
    - K-undef is `` `The value is undefined — ${NOTHING}` `` with `NOTHING = "nothing to save"` (`save.ts:111,113`).
    - K-missing and K-relative are `` `upload: ${message}` `` (`sdk/src/upload.ts:41,68,74`).
    - K-opt-rel matches with its source escape `C:\\…` (`options-model.ts:140`).
- **Sensitive content.** The touched lines add no test pattern, real site, user path or token. The only new literal is
  the heading `Chrome Agent Bridge`, which is not a scanned pattern.
- **Fixtures.** 8086, the new `s11b-delay`, is `localhost` like every other fixture.

## 3. Per item
- **N1: resolved (`:1611`).** The fallback now prints `FALLBACK: console eval unavailable`, and the row says that this
  line "is **not** a STOP and the STOP rule does not apply to it".
  - This agrees with the STOP rule (`:1558`), which applies "On any STOP line (… a guard printing STOP …)". A
    `FALLBACK:` line is not a guard printing STOP.
  - Nothing in the fallback path skips a safety guard: (c) and (d) still STOP, and so does the later RD-REGEX
    pre-type check.
- **N2: resolved.**
  - **RD-6 (`:1619`)** names `Open-S11bWindow (admits 8083)`. Helper item 6 (`:1660`) defines its allow-list as 8083
    and 8081 "and nothing else", and says that `Open-S11Window` is not edited.
  - This agrees with `recipes/s11-win.ps1:50-53` (`Test-S11Url`, ports `8081|8084` only) and with the ports table
    (`:1565`: 8083 is used by RD-1 … RD-6).
  - The new helper is in the `s11b-*` lane (`s11b-win (.ps1)`).
  - **RD-5 (`:1632`)** names `B17 stored (the count-and-hash read-back)`. Item 2 (`:1656`) adds it with "prints only
    the verdict", and `STORED …` is added to `Invoke-S11bConsoleEval`'s allowed output lines.
- **N3: all five resolved.**
  - **(a)** RD-DL-HOP (`:1623`) now says "`d` as defined below".
  - **(b)** RD-CAPS-WARN (`:1616`) now uses `Line <bl+2>` and `Lines <bl+2>, <bl+3>`, with `bl` from RD-0 (c), so `f`
    is no longer reused. The arithmetic holds: H119 is line bl+1 and H120 is line bl+2, which matches the
    pre-computed `Line 2` / `Lines 2, 3` for bl = 0.
  - **(c)** RD-DISARM (`:1630`) and RD-5b (`:1633`) now use `countRules(found + BLK).rules`. In the code,
    `countRules` returns `{ rules, regexRules }` (`safety-dnr.ts:108-111`).
  - **(d)** RD-7 (`:1624`) now quotes the heading as `Chrome Agent Bridge`, which is the text at
    `extension/options.html:18` (`<h1>Chrome Agent Bridge</h1>`).
  - **(e)** RD-REGEX (`:1617`) now says "the typed expression evaluates to `undefined`, so the console echoes no regex
    string as a result".
- **F11 note: resolved.**
  - The delayed redirector is now `s11b-delay (.py)` on 8086, in the ports table (`:1567`) and in helper item 4
    (`:1658`).
  - The lane sentence (`:1654`) says "with no exception (`recipes/s9-redirect.py` is not changed)".
  - `s9-redirect.py` stays as the server for 8083, 8088 and 8089, used unchanged.
  - The phase-doc authority question from round 2 is therefore moot.

## 4. New findings (round-2 lines)

**R3-1 · NIT · `:1576` and `:1632`: `STORED` has no pre-registered line form.**
- **Evidence.** The abbreviations paragraph lists the line forms the pass rules read: `MANIFEST`, `RULES`, `HITS`,
  `LAT` and `REGEX`. `:1654` adds `CTX`. `STORED` appears only as an allowed console output in item 2, and RD-5's
  Expected column quotes no `STORED` line.
- **Effect.** RD-5's trigger, "reads back holding BLK", has no exact text to compare. Nothing passes falsely, because
  RD-5 is judged on its refusal, its hits and `GAP`.
- **Fix.** Add a form such as `STORED match=<yes|no> lines=<n>` to the forms named at `:1654`.

**R3-2 · NIT · `:1656` (`B17 stored`): the sheet does not say on which side the hash comparison runs.**
- **Evidence.** "an in-process hash match; prints only the verdict". The value is read in the worker console, but the
  expected hash lives in the helper. For the console to emit only a verdict, the helper must either type the expected
  hash into the console or have the console print the stored value's hash.
- **Effect.** Both ways put a block-list hash into the console capture, which RD-LOGS scans and which may be
  committed. The never-printed rule (`:1556`) allows "a hash only inside a restore comparison".
- **Fix.** State that the console prints only a count and a match bit. For example, the typed expression can compare
  against a hash value the helper passes, and RD-LOGS treats that one hash as the allowed restore-comparison case.
  Alternatively, state that the console capture is never committed.

## 5. Deviations / proposed decisions
None.

## 6. Handoff
- The slice is ready to commit. R3-1 and R3-2 are NITs that the S4-helpers builder can settle when it writes
  `B17 stored`. If the step agent prefers to settle them in the sheet first, that is a one-line edit each, and the
  sheet is frozen once committed.
- Nothing was left running. This report was the only file written. A scratch script, `k17.mjs` in `%TEMP%`, was used
  for the K17 comparison.
