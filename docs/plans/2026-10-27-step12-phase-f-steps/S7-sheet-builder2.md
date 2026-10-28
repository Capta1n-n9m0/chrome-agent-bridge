# S7-sheet (part B) — builder report

Model and effort: Claude Sonnet 5.5, medium. No commit (brief). No Chrome, daemon or page touched; commands run: `git show HEAD:`, `git grep`, `git log`, `git status`, `node scripts/doc-check.mjs`, and a node splice script in the scratchpad.

## 1. Verdict
DONE. Part B of `### 4.27` is in `docs/e2e-test-plan.md` (1768–1856), between part A's table and `## 5. Results template`.

## 2. Outputs
- `git diff docs/e2e-test-plan.md`: one hunk, `@@ -1767,0 +1768,89 @@`, 89 insertions, 0 deletions, against HEAD (part A is itself uncommitted, so the 42 lines of part A are in the same hunk; part B alone is ~47 new file lines of long paragraph and table rows, far under the ~350 cap). Edits to part A, only the two allowed: the placeholder sentence "Part B (…) follows." deleted; one sentence appended to the provenance paragraph (the part B sources). The file is CRLF and stayed CRLF.
- `node scripts/doc-check.mjs`: **exit 0**, "Checked 38 living docs". Dead paths (4), all fixture pages S7-helpers builds: `test-fixtures/s12-console.html` (:1778 and :1810), `s12-chooser.html` and `s12-chooser-frame.html` (:1810). So a yet-unbuilt fixture does not make it nonzero. No other path from my rows is flagged. The count drifts (24 vs 25 tools, 27 vs 28 methods, 4665 tests) are not this lane.
- Part B holds: **Line forms (part B)** (forms 14–32 plus the three #351 (4) helper fixes as contract), **Part B's fixture pages**, a second table of 33 rows, **Slices and order**, and **Open items** (17).

## 3. Rows (33), each with source in its last cell
R19-UP-OPT, R19-BANNER-CTL, R19-UP-6, R19-F-RAW / -2 / -DIR (one cell, three ids), R19-UP-DEVT, R19-KEEP-1…4, R19-CON-KEPT, R19-SWEEP-HELD, R19-DEVT-NOFLAG (RECORD), R19-KEEP-OVERLAP (two legs), R19-CHOOSE-1, -LABEL, -2, -3, -4, -REFUSE, -JSOFF, -DISARM, -LATE, -HUMAN (RECORD), -KEPT, -FRAME (RECORD), -MCP, R19-CON-CAP, R19-G2-1, R19-G2-2, R19-VERSION, R19-LOGS, R19-RESTORE. No G1 row. The row-less `DEVPROBE` is a line form and a step in liveB19, not a row.
Slices: liveA19 (args, console, state-changing console rows), liveB19 (probe, UP-OPT after the investigator, banner control and carried banner rows, KEEP rows, DevTools rows last, SWEEP-HELD very last), liveC19 (chooser rows, CHOOSE-4 near the end, G2), liveD19 (ARGS-OLD), liveE19 (VERSION). R19-0 first, R19-RESTORE then R19-LOGS last in each; every STOP reason (31) is mapped to the rows where it arises and to a `RETURN` line (R7.6).

## 4. Expected texts and their committed sources
- TIMEOUT: `extension/src/upload-files.ts:236` (`CHOOSER_TIMEOUT_MESSAGE`), `extension/test/s5a-chooser.test.ts:276`, spec §10 S5a note.
- No-input picker: `upload-files.ts:239`; single/dir/disabled: `extension/src/content/upload-target.ts:31, 29, 28`; chooser param text: `extension/src/handlers/upload.ts:48` (not used in a row text).
- K-gate, K-noacc, K-devt, K-disarmed, K-blocked, K-mcp-ok, K-dir: §4.23 key table (this file, ~1482–1495); K-raw-*: §4.24 K17.
- Missing file: `extension/test/s0f-upload-exists.test.ts:138`. MCP answer form: `mcp/test/s12-upload-chooser.test.ts:18`; cap marker: same file's last test and `sdk/test/s12-console-cap.test.ts:10`.
- G2 clause and bound: `S6-G2-builder.md` §7 (line 128, bound 450 ms), `S6-G2-verifier.md` MINOR-4, spec §10 S6-G2 note. `daemon.status.lock.holder` exists at `daemon/src/intercept.ts:446` (HEAD).
- KEEP and CON-KEPT/SWEEP-HELD: `S4b.md` §7, decision #352 and its measured note, phase doc 0.6. KEEP-2's control (a refusal after the interception drops the session): spec §10 S5a note (#347).
- Chooser rows: `S5a.md` §7, `S5a-builder.md` §7, `S5b.md` §7, #353 (a)–(d), spec §10 S5a note (committed form, via `git show HEAD:`).
- LOGS: #349, `S3a-builder.md` §7 check 9, `S3b-builder.md` §7 CON-LOGS. UP-OPT/banner: #351, `S1-run-record.md` §4, §6.
- **Not found / not quoted:** S5c's texts (`CHOOSER_RELOAD_HINT`, the `uploadChooser` feature constant and test, the spec S5c note) exist only in uncommitted work; R19-VERSION says "text to be quoted from S5c's commit by S7-helpers before the run" (Open item 6). The `Screenshot:` and `[Image: source:` line forms come from #349 prose only (Open item 15).

## 5. Helper fixes as contract (#351 (4))
(a) `O2 did not show the saved text in <n> ms` when `shown=no`; (b) final `ROW` verdicts of console-clause rows printed (or `pending` resolved) before R19-LOGS; (c) the five preflight rows once per slice. Plus new line forms for the keeper, chooser, G2, scan-by-tool, dialogs, STOP/RETURN.

## 6. Fixture pages described (not built)
`test-fixtures/s12-chooser.html` + `s12-chooser.js` (queries `c1`, `label`, `none`, `picker`, `single`, `dir`, `dis`, `late49`, `late51`, `human`, `frame`; reporter `window.__s12ch`), `s12-chooser-frame.html`, and a `cap` query added to `s12-console.html`. G2 and KEEP rows reuse `e2e-playground.html` and `s11-upload.html`. Port 8081 only (part A's `netstat` record holds; I did not re-run it).

## 7. Deviations and judgment calls
None from the brief. Calls to check:
1. **KEEP rows cannot count attaches** (no counter exists and #351 forbids one). KEEP-1 proves answers-unchanged and a banner continuous 3 s apart (weak, said so in the cell); **KEEP-2 is a differential**: idle-detach banner end versus a control that drops the session at once (a chooser refusal after the interception, spec S5a note), median gap ≥ 3 500 ms, control spread ≤ 3 000 ms else NOT MEASURED; KEEP-3 compares to those two references. All margins are mine (Open item 9).
2. **Carried banner rows get `IDLE ≥ 20 000 ms` before every leg** (R18 had it once per row): with D a session is kept 5 s and Chrome's linger can reach 14 s, so legs 3 s apart would read the previous leg's banner. The pass rule is word for word; the spacing is the change, named in the cell.
3. **R19-LOGS actors scan** cannot expect `sentinel=0` for the console/evaluate tools (the sentinel is in their replies by design): sentinel is expected only in those tools (`SCANTOOL` per tool), 0 elsewhere, and 0 in console and daemon streams. `profile-other` excludes the two named lines.
4. **R19-G2-2** restates the unobservable clause (quoted) and says plainly that a pass is evidence of no harm, not of the absence of an interleaving; G2 rows use a raw client (no SDK `focusFirst`) so the daemon's hold is what is measured; the SDK-default variant is only recorded.
5. **R19-VERSION** uses `63c771c` (S4b, has `evaluateArgs`, lacks `uploadChooser`) and the file input itself as target, so an old extension that ignores `chooser` would visibly upload.
6. R19-CHOOSE-4 must not run before its dialog closer is proven on a dialog the helper opens itself (#251, Open item 12).

## 8. Part A defects found (reported, not fixed)
1. Part A's rows R19-ARGS-3 and R19-CON-3 and its STOP rule say "0 debugger attaches counted by the keeper" / "an attach the keeper's count shows". No such counter exists and #351 (2) forbids building one. Open item 5 tells the runner to read it as "a banner sample positive".
2. Part A's R19-CON-BANNER idles 15 s; with the keeper the worst case is 5 s + the 14 s linger of SAFE-4 (b). Stage 0's measured 5.1 s makes 15 s enough in the usual case; part B uses 20 s for its own rows and left part A as written (Open item 8).
3. Part A's provenance still says part B "is appended after it" (true now); nothing to fix.

## 9. Proposed decisions
None.

## 10. Handoff
- For S7-helpers: build the pages in §6 and the forms in §4.27 (14)–(32); quote S5c's texts from its commit and amend the sheet before any observation; the DevTools opening method, the infobar Cancel and the native-dialog closer are open and unproven; the UP-OPT investigator must report before liveB19; a scratch worktree for `3ab9207` and `63c771c` with its own `npm ci`.
- No processes, no files outside the repo except scratch (`partb.md`, `fix1.js`, `splice.js` in the session scratchpad).
