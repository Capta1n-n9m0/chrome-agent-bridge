# S7-sheet — Run 19's wave sheet, §4.27 (step report)

Step agent: Claude Opus 5.5, medium. Builders A and B, fixers 1 and 2, committer: Sonnet, medium. Verifiers 1–3: Opus, medium.

## 1. Verdict

DONE. `docs/e2e-test-plan.md` §4.27 "R19 rows" is written as one insertion between the end of §4.26 and `## 5. Results template`. It is the Run 19 wave sheet: provenance, pass rules, STOP rule, gates, fixtures and ports (8081 only; 8000 held, 8082 avoided), line forms (1)–(35), a 56-row table, banner rule, slices and order with the STOP-to-RETURN map, capture segments, and open items. No Run 19 row ran and nothing was observed (R7.1). No G1 row (#337).

## 2. Outputs

- `docs/e2e-test-plan.md`: §4.27 only. `git diff --stat` shows one hunk, `@@ -1767,0 +1768,94 @@`, with 0 deletions.
- `node scripts/doc-check.mjs` exits 0. It flags 4 dead paths, all S12 fixture pages that S7-helpers will build (`test-fixtures/s12-console.html`, `s12-chooser.html`, `s12-chooser-frame.html`, and the console page's script), plus count drifts outside this lane (verifier3).
- Rows: R19-0; ARGS-1/2/3, GLOBAL, CSP, STOP, OLD; CON-1/2/3/4, REJ, OWN, FILE, JSOFF, FLOOR, FRAME, NOTEA, BIG, NAV, MCP, BANNER, KEPT, CAP; UP-OPT, BANNER-CTL (one per slice), UP-6, F-RAW, UP-DEVT; KEEP-1…4, KEEP-OVERLAP, SWEEP-HELD, DEVT-NOFLAG; CLOSER; CHOOSE-1…4, LABEL, REFUSE, JSOFF, DISARM, LATE, HUMAN, KEPT, FRAME, MCP; G2-1, G2-2; VERSION; LOGS; RESTORE.
- Child reports, all in this directory:
  - Builders: `S7-sheet-builder.md` (part A) and `S7-sheet-builder2.md` (part B).
  - Fixers: `S7-sheet-fixer.md` and `S7-sheet-fixer2.md`.
  - Verifiers: `S7-sheet-verifier.md` (+ `-evidence.txt`), `S7-sheet-verifier2.md` (+ `-evidence.txt`) and `S7-sheet-verifier3.md`.
- Commit: see the committer line under §7.

## 3. Verifier verdict

| Round | Verdict | Findings | Outcome |
|---|---|---|---|
| Verifier 1 | FAIL | 5 MAJOR, 8 MINOR, 4 NIT | See the five MAJORs below. |
| Fixer 1 | — | all | Fixed; 3 items disputed or left as written, and verifier 2 upheld all three. |
| Verifier 2 | PASS-with-notes | 5 MINOR, 4 NIT | Fixed in round 2. |
| Fixer 2 | — | 9 | All fixed. |
| Verifier 3 (spot check) | **PASS-with-notes** | 3 NIT | Carried to S7-helpers below. |

Verifier 1's five MAJORs:
1. The STOPs leaned on a non-existent "attaches counted by the keeper" counter.
2. ARGS-OLD's `forwarded=0` could not fail.
3. CON-FRAME contradicted Stage 0 C5.
4. Two S3a live needs had no row.
5. Per-slice capture did not survive mid-slice extension reloads.

Fix rounds used: 2 of 3.

## 4. Deviations

- The work was split into two sequential Sonnet builders, part A (preamble, B and C rows) and part B (D, E, G2, carried, LOGS, RESTORE, slices). The brief allowed this split. Each part is far under the ~600-line cap in file lines, though its rows are long paragraphs.
- Verifier 3 accepted that MINOR-C folds the interception-left-on STOP into CHOOSE-4 and CHOOSE-DISARM's `dialog-not-opened`. Its reason: the phase doc joins both conditions in one STOP sentence, and CHOOSE-4 clicks after an ok, a `TIMEOUT` and a refusal.

## 5. Proposed decisions / escalation

- **Escalated under agent-rules §3 item 9 (a check that cannot be made discriminating), for the session agent to rule on: §4.27 Open item 5.** No attach counter exists, and #351 (2) forbids building one. Without it, the live "no attach after a disarm or block" clause cannot be discriminating on rows where the refused call follows a CDP call within seconds:
  - R19-KEEP-1's banner clause is NOT DISCRIMINATING.
  - R19-KEEP-3 and R19-CHOOSE-DISARM carry no banner STOP.
  - The proof there rests on the answers and on S4's unit tests.

  Verifier 2 judged that R7.3 still holds. The sheet runs as written unless the session agent rules otherwise.
- The phase doc's 0.5 classes `consoleMessages` as `tab`. #334 and the spec's S3a note class it as `evaluate`. The sheet follows #334 and the spec, so R19-CON-JSOFF expects `JS_DISABLED` (Open items). That is a mechanical drift in the phase doc, for the session agent's dated note.
- These bounds were chosen without a source, and the sheet labels them as such:
  - the `STOPCALL` window (1 500–3 500 ms);
  - CON-FLOOR's ±500 ms around the toolbar press;
  - the console page's 8/1/1 message mix;
  - KEEP-2's margins;
  - the 20 s idle before a banner-judged call (the keeper's 5 s plus Chrome's 14 s).

## 6. Findings

- Verifier 1 confirmed every expected text a pass rule compares exactly is verbatim at HEAD. R19-VERSION quotes S5c's committed `CHOOSER_RELOAD_HINT` (`daemon/src/intercept.ts:44-45`).
- Two line forms rest on #349's prose, not on a committed test: the `Screenshot:` form and the `[Image: source:` form.
- No new runtime fact.

## 7. Handoff (to S7-helpers)

**Line forms to build** (§4.27, by key; unit tests compare each one with the sheet):
- **Carried from §4.26:** `SAMPLER`, `ROW` (exactly one per id per slice), `CHECK`, `ANSWER`, `LEAKS`, `CALL`, `SCAN`, `RESTORE`, `RULES`, `STATE`, `TOGGLE`, `FOUNDLIST`, `HEAD`, `IDLE`, `BANNERCTL`, `RAW`, `MANIFEST … BUILD …`.
- **New, from part A:**
  - (1) `LOADED [rerun=<k>] …`: R19-0's build proof. It comes first, and a re-run prints only `LOADED rerun=<k>`, with no `ROW` line.
  - (2) `ARGS`
  - (3) `ARGSREF`
  - (4) `EFF`
  - (5) `GLOBALS`
  - (6) `STOPCALL`
  - (7) `OLD`, where `forwarded` is read from the answer.
  - (8) `CON`, with the keys `ordered`, `newest` and `marker`.
  - (9) `CONREF`
  - (10) `CONFLOOR`
  - (11) `CONMCP`
  - (12) `BANNERCON`
  - (13) `DAEMONLOG <row>` (per row; (28) is the per-slice form)
- **New, from part B:**
  - (14) `DEVPROBE`: row-less, and it runs before any DevTools row.
  - (15) `KEEPSEQ`
  - (16) `KEEPEND`
  - (17) `CONKEPT`
  - (18) `SWEEPHELD`
  - (19) `KEEPDT`
  - (20) `OVERLAP`
  - (21) `CHOOSE`
  - (22) `DIALOG`
  - (23) `LATE`
  - (24) `HUMAN`
  - (25) `CONCAP`
  - (26) `G2` / `G2TYPE`
  - (27) `VERSIONCH`
  - (28) `DAEMONLOG`
  - (29) `SCANTOOL` / `SCAN actors`, counting `shot-line` and `image-line` separately (#349).
  - (30) `DIALOGS`
  - (31) `STOP <reason>`, matched to a `RETURN` in the map
  - (32) `FIX <what>`, for a helper fix made between rows
- **New, from fix round 1:**
  - (33) `CLOSERPROBE`
  - (34) `BANNERCALL`
  - (35) `CAPSEG`
- **The one IDLE definition:** the time since the last reply of any call other than `snapshot`, `listTabs` and `daemon.status`.

**The #351 (4) helper fixes** (recipes only; no pass rule moves):
- (a) When `OPT O2 shown=no`, the helper also prints `O2 did not show the saved text in <n> ms`.
- (b) Every row with a console clause prints its final `ROW` before R19-LOGS runs.
- (c) The five preflight lines print once per slice, so no `WARN` about `RULES` appears.

**Fixture pages** (all on `127.0.0.1:8081` / `localhost:8081` / `*.localhost:8081`; one `python -m http.server 8081 --bind 127.0.0.1`):

| Page and queries | Rows that use it |
|---|---|
| `test-fixtures/s12-console.html` + `.js`: `con`, `rej`, `big`, `tick`, `frame` (same-site `p./f.s12site.localhost`), `frameoop` (`localhost` → `127.0.0.1`), `notea` (script from `s12blk.localhost`), `noteaok` (message exactly `s12-noteaok`), `nav`, `cap`, plus the effect counter `window.__s12eff` | R19-0, ARGS-*, CON-*, KEEP-* (`con`), CON-KEPT, CON-CAP |
| `test-fixtures/s12-chooser.html` + `.js`: `c1`, `label`, `none`, `picker`, `single`, `dir`, `dis`, `late49`, `late51`, `human`, `frame`, reporting through `window.__s12ch` | CHOOSE-*, KEEP-2 control (`single`), VERSION, CLOSER |
| `test-fixtures/s12-chooser-frame.html` | CHOOSE-FRAME |
| `e2e-playground.html?s12=g2a` / `g2b`: needs a `#tb` input and a click counter, which the playground does not have today | G2-1, G2-2 |
| `s11-upload.html` (existing) | KEEP rows' `uploadFiles` |
| Carried pages (existing) | UP-OPT, UP-6, F-RAW and UP-DEVT, per their §4.26 sources |

**Must happen before the run:**
- The UP-OPT investigator reports before liveB19 (#351).
- The DevTools opening method, the infobar Cancel button and the native-dialog closer are unproven. R19-CLOSER must prove the closer before the first `chooser: true` call in slices B and C.
- Scratch worktrees for `3ab9207` (ARGS-OLD) and `63c771c` (VERSION), each with its own `npm ci`, never a junction (root `CLAUDE.md`).

**Verifier 3's NITs to resolve when building:**
1. Some refusals get no human-style click afterwards: KEEP-2's ctl leg, CHOOSE-2, CHOOSE-3, and CHOOSE-REFUSE's picker, dir and dis legs. Add a CHOOSE-4 leg (d) or record an open item.
2. Slice E has `chooser: true` calls and no closer. Add a clause to Open item 12 saying no dialog can open there, because the daemon refuses `VERSION` before forwarding.
3. The quote from `S3a.md:66-68` puts its two parts in reverse order.

**Left behind:** no processes. Only the builders' scratch files (`partb.md`, `fix1.js`, `splice.js`) in the session scratchpad.
