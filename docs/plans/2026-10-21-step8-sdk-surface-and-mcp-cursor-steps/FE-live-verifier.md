# FE — live-run verifier (fresh, independent, read-only), 2026-10-23

Verifier: Claude Opus 5.5, no stake in the result. Nothing was edited, committed, started or touched
in Chrome; the only file written is this one (plus a scratch script outside the repo). Binding rules:
`docs/e2e-test-plan.md` §4.17 as committed in `6398f27`; `FE-wave-sheet.md`; decisions.md #78, #84,
#85 item 3, #88; kickoff §7 / phase doc FE.4, FE.5. Audited: `FE-run-record.md`, `FE-run-results.txt`,
`FE-frames-positive.txt`, `FE-frames-block.txt`, `FE-daemon-log.txt`, §5 "Run 11 (FE)".

**Overall verdict: PASS-with-notes** (no CRITICAL or MAJOR; 3 NITs). **Outcome read strictly off the
table: (B) — no kind passes (policy `"focusFirst"`).**

## 0. The rules are the pre-registered ones

- `git diff 6398f27 -- docs/e2e-test-plan.md --stat` → `1 file changed, 30 insertions(+)`, one hunk
  `@@ -1733,6 +1733,36 @@`, no `-` lines: only the §5 "Run 11 (FE)" block was added; §4.17 is
  byte-identical to `6398f27`.
- `git diff --stat 6398f27 -- recipes` (working tree and HEAD) → empty: `fe.ts`, `fe-rules.ts`,
  `fe-win.ps1` used in the run are the committed, pre-registered tools. The record says no helper or
  rule was edited; this confirms it.
- `git log 6398f27..HEAD --stat`: `6742c1f` changes `extension/` + tests + FE reports; `97d6123` and
  `257dd8d` are docs only (`decisions.md`, `journal.md`, `FE.ledger.md`). No extension/daemon change
  after the build under test.

## 1. Exit checks

| Check | Verdict | Evidence |
|---|---|---|
| **FE.4** rows committed before the build is loaded (`git log` order) | **PASS** | `git log --format='%h %ci %s'`: `6398f27 12:30:41 +0400` (rows, sheet, recipes) → `6742c1f 12:32:03 +0400` (FE code) → `97d6123` → `257dd8d 12:34:11`. The build was made at 08:35:25Z and loaded by the reload pressed at 08:35:54.883Z (= 12:35:54 local), after all three. The FE ledger shows the builder/verifier worked in a worktree with unit tests only before `6398f27`; no FE build was loaded into Chrome earlier (no reload/live line in `FE-builder.md`/`FE-verifier.md`). |
| **FE.5** the live run's first recorded line is the reload's exit 0, and FE-0 PASS | **PASS** | The first row-section line is the reload's `RELOAD OK …` / `exit 0` (record "Reload (step 2) — the first recorded line"); the next row is FE-0: `fe-check: … → ok {"ok":true,"focusEmulation":"on"} (21 ms)` / `FE-0 PASS` at the first check. `FE-run-results.txt`'s first record is that FE-0 (`"result":{"ok":true,"focusEmulation":"on"}`), and `Test-Path FE_OUT: False` at pre-flight and after the build shows no earlier record could exist. Only pre-flight, build and set-up lines precede the reload — exactly the wave sheet's pre-registered order (steps 0–1 before step 2, which the sheet itself calls "the run's first recorded line (FE.5)"). |

**The `recipes/hello.ts` daemon started before the reload** does not break FE.5 or anything else:
- It is set-up the binding text asks for: §1 item 9 (e2e plan :162–163): "A **daemon running** before
  the press makes the check stronger (start one with any client, e.g. `npx tsx recipes/hello.ts`)";
  the wave sheet's pre-flight also allows "`Get-BridgeDaemon` (none, or the one ours)".
- It produced no row result and no stale-extension result: it calls only `daemon.status` and
  `listTabs` (record lines 100–103), never `click/type/pressKey` and never `focusEmulation`. FE.5's
  purpose — no row measured on a build that was not yet loaded — is intact: the first FE-carrying call
  is FE-0's, after the reload.
- It spawned the daemon from the just-built bundle (`7712e1af…`, same as `Get-DaemonBuild` and FE-0's
  `build`), so no build-id handover happened mid-run; `daemon.log` from the resync line shows one
  daemon, clients `t5-find`/`fe-*`/`t5-cleanup` only (attachment, 37 lines).

## 2. Per-row verdicts (record's claim vs. my re-derivation)

Re-derived from the raw JSON records with an independent script (my own rules, not `fe-rules.ts`):
status/value equality, `result.ok`/`focusEmulation`, `vis` after the call, and FE-4 per trial (human
`current` in before/every poll/after; each window's active tab equal to before's; target never
`active`; no `hidden` in the human's log at all; no failed poll); frames with a looser magenta rule
(r−g ≥ 60 and b−g ≥ 60).

| Row | Record's claim | My re-derivation | Agree |
|---|---|---|---|
| FE-0 | PASS (first check) | `result {"ok":true,"focusEmulation":"on"}` → PASS; one FE-0 record, before every trial | yes |
| FE-5 first | holds; BG-1 0/3, BG-2 0/3 | 6 trials (T5–T10, fresh tabs): all `status: idle`, value `""` → received input in 0/6 → control holds | yes |
| FE-PC page | PASS | human log: `visible` −1006 ms (start), `hidden` +5, `visible` +1619 → hidden → visible | yes |
| FE-PC capture | PASS (295 frames, 16 magenta) | 30 frames in [t0−3 s, t0), 0 magenta; 22 in [t0, t1+500], 16 magenta; 0 magenta outside the window | yes |
| FE-1 #1/#2/#3 | FAIL/FAIL/FAIL (0/3) | T12/T13/T14: `focusEmulation:"on"`, status `status: idle` (≠ `TRUSTED click received`) ×3 → FAIL ×3; FE-4 trial PASS ×3 | yes |
| FE-2 #1/#2/#3 | PASS/PASS/FAIL (2/3 → FAIL) | T15, T16: status and value exact → PASS; T17: status `status: TRUSTED input = ped`, value `ped` → FAIL; kind FAIL (one failed trial, #78) | yes |
| FE-3 #1/#2/#3 | FAIL/FAIL/FAIL (0/3) | T18–T20: focus step `yes`, status `status: idle` ×3 → FAIL ×3; FE-4 trial PASS ×3 | yes |
| FE-4 | trials 9/9; capture PASS (71 frames) → PASS | Trials 9/9 PASS on every clause (human current and never hidden; window active tabs unchanged; target never active). Block CSV: 113 frames, 71 in [first t0 − 500, last t1 + 1500], 0 magenta (0 anywhere in the file), foreground `1051630` in every frame; coverage: largest gap inside any [t0−1000, t1+1000] is 126 ms, every call has a frame before and after → not void → PASS | yes |
| FE-5 last | holds; 0/3, 0/3 | T21–T26: all `status: idle`, `""` → 0/6 → holds | yes |
| FE-3c (observation) | 0/3 | T27–T29: `status: idle` ×3 → the key reached the page 0/3 without the option | yes |

**Trial counts and integrity.** `FE-run-results.txt` holds 28 records: FE-0 1, FE-5 12 (3 × BG-1 and
3 × BG-2, first and last), POS 1, CAP 2, FE-1 3, FE-2 3, FE-3 3, FE-3c 3 — exactly the sheet's
order, three per kind. Every trial's target is a distinct handle (T5…T29, none reused) — a fresh tab
per trial. No trial was dropped or re-run: the record order equals the run order, each `fe-*` client
appears exactly once in `daemon.log` (`fe-check`, `fe-5` ×2, `fe-positive`, `fe-1`, `fe-2`, `fe-3`,
`fe-3c`), and `FE_OUT` did not exist before the run.

## 3. Outcome, read by hand off #78's precedence

1. FE-5 void? No — the control received input in 0 of 12 trials (first and last). → continue.
2. FE-4 FAIL? No — trials 9/9, capture not void and PASS. → continue.
3. Every kind passes all trials? No (click 0/3, type 2/3, pressKey 0/3).
4. No kind passes? **Yes** — type's 2/3 is a FAIL for that kind ("A trial that passes once and fails
   once counts as FAIL for that kind (no best-of-three)").
→ **OUTCOME (B)**, policy `"focusFirst"`. (The table's own (B) wording, "FE-1 and FE-2 FAIL", also
holds.) Deciding rows: FE-1 (0/3), FE-2 (2/3), FE-3 (0/3), with FE-5 holding and FE-4 PASS.

`fe.ts verdict` on the attached copies (verified first that `verdict` only reads files: it calls
`readRecords` + `frameLoader` + the pure `readOutcome`; `connectAs` is used only by `check`, `trials`
and `positive`; `record()` is not called; `FE_OUT` pointed at an empty scratch dir, which stayed
absent afterwards):
```
$ npx tsx recipes/fe.ts verdict --results …/FE-run-results.txt --csv-positive …/FE-frames-positive.txt --csv-block …/FE-frames-block.txt
… fe-verdict: FE-0: PASS (daemon build 7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e)
… fe-verdict: positive control: page timestamps PASS; capture loop PASS
… fe-verdict: FE-5 (first): BG-1 received input in 0/3, BG-2 in 0/3; (last): BG-1 0/3, BG-2 0/3 → control holds
… fe-verdict: FE-1 (click): 0/3 trials PASS → FAIL
… fe-verdict: FE-2 (type): 2/3 trials PASS → FAIL
… fe-verdict: FE-3 (pressKey): 0/3 trials PASS → FAIL
… fe-verdict: FE-4: trials 9/9 PASS; window capture PASS (no frame shows the target; foreground constant) → PASS
… fe-verdict: OUTCOME (B) — no kind passes: policy "focusFirst"
exit 0
```
Identical to the record's step 10 (timestamps aside), to my script and to the hand reading.

## 4. Observations

- **Target visibility per trial (option on, FE-1…FE-3):** `targetLog` relative to t0 — FE-1 visible
  +6/+6/+7, hidden +19/+23/+35; FE-2 visible +5/+5/+5, hidden +39/+38/+39; FE-3 visible +4/+3/+3, hidden
  +33/+14/+22. Each `hidden again` lands at or just before the call's end (call times 18/23/34, 39/38/39,
  34/14/22 ms), and `vis` read after the call is `hidden` in all 9. Without the option (FE-5, FE-3c) the
  target logged only its `hidden` start. The record's "visible +3–7 ms, hidden +14–39 ms" is accurate;
  this is Chromium-source behaviour (stage0-audit F1) confirmed on Chrome 156, recorded as an
  observation only, as §4.17 requires.
- **Emulation still on after a call (#88 Revisit-if):** not seen. In every option trial the last log
  entry is `hidden` before or at the call's return and the post-call read is `hidden`; every result is
  `{"ok":true,"focusEmulation":"on"}` with no warning field. #88 item (1) stands.
- **FE-2 trial 3 `ped`:** recorded faithfully — JSON `"status":"status: TRUSTED input = ped","value":"ped"`
  matches the record line and the Run 11 block — and counted as a FAIL by the record, the verdict and
  §4.17's rule (status and value must both be exactly `bg2typed`). The driver's race hypothesis is
  labelled unconfirmed and not judged — correct.
- FE-3's focus step answered `yes` in all 6 trials (FE-3 and FE-3c); FE-3c 0/3 means FE-3 could have
  discriminated; it simply failed with the option too.

## 5. Hygiene

Counted, never printed (token read from `bridge.token` into a shell variable, compared with
`grep -oF`, then `unset`):

| File | `://` | token |
|---|---|---|
| `FE-run-record.md` | 5 — all literal text (`'://' count 0` ×4, "lines containing '://' filtered"), no URL | 0 |
| `FE-run-results.txt` | 0 | 0 |
| `FE-frames-positive.txt` | 0 | 0 |
| `FE-frames-block.txt` | 0 | 0 |
| `FE-daemon-log.txt` | 0 (no `withheld`) | 0 |
| §5 Run 11 block (added lines) | 1 — literal `'://' count 0` | 0 |

`localhost|http|playground` in the three data attachments: 0. The record's `http` hits are
`http.server`/`http8080.log`; its titles are the fixture title only. No image files untracked or
ignored under the repo (`git ls-files --others` / `git status --ignored` for png/jpg/bmp → 0). The JSON
records carry handles and window ids only (the user's tab appears as `T1`/window id, compared, never
named in the data).

**Verbatim spot-check (record ↔ `FE-run-results.txt`):** (1) FE-1 #1 `(18 ms)` = t1−t0 18, `visible +6,
hidden again +19` = targetLog; (2) FE-2 #2 `(38 ms)`, `5 polls (1 overlapping the call)` = 5 polls, only
`623–627` inside [610, 648], line ts `08:37:24.763Z` = record `ts`; (3) FE-2 #3 status/value `ped` ✓;
(4) FE-PC `(1635 ms)`, `hidden +5 ms, visible again +1619 ms` = t1−t0 and humanLog; (5) FE-3 #2
`(14 ms)`, hidden +14 ✓. Frame counts 295/16 and 113/71 match my parse; epoch times agree with the
record's clock (block frames 08:37:16.510Z–08:37:28.052Z vs. capture start 08:37:16.048Z / stop file
08:37:28.124Z).

## 6. Deviations listed by the driver

1. **`hello.ts` daemon before the reload** — recommended by §1 item 9; no row data; no stale result;
   same build. Cannot affect a verdict. Accepted.
2. **Set-up re-sourced per PowerShell block** — no state needed between blocks beyond `$Wf` (re-read
   from a file; the same hwnd 1051630 appears in every foreground read and frame). Step 7 ran as one
   call as the sheet requires. Cannot affect a verdict.
3. **Outputs to files, printed after** — the sheet's own advice (MUX-6); the spot-check shows the copies
   are verbatim. Cannot affect a verdict.
4. **HEAD wording at pre-flight** — HEAD `257dd8d` is two docs-only commits after the FE build commit
   (verified by `--stat`), which is the sheet's "a later commit with no extension/daemon change".
   Cannot affect a verdict.
5. *(Not listed as a deviation, noted in the record)* the `Set-T5Topmost -Off`/`Close-T5Window` calls
   went to a window `t5 cleanup` had already closed — after every row; harmless.

## 7. Findings

1. **NIT — the user's own tab is named (by its fixture title and Chrome id) in the record.**
   Evidence: record line `hello-recipe: listTabs — 1 tab(s); active: [1108127127] Agent Bridge E2E
   Playground`, and `Get-T5ChromeWindows` lines for hwnd 527630 with its title. The wave sheet says "the
   user's own windows and tabs are never named". The title is a fixture title (W1's old copy), so B2
   (fixture pages only) holds and no verdict is touched. Fix: in later waves filter `hello.ts`'s
   `listTabs` line and print the user's window as `hwnd 527630 (user's window)` only.
2. **NIT — FE.5's "first recorded line" is satisfied by structure, not literally.** Pre-flight, build and
   the `hello.ts` set-up precede the reload in the record. The sheet pre-registers that order and labels
   the reload "the run's first recorded line", so the check holds as written in the sheet (#84's lesson:
   a check that cannot hold is read by its intent; here the intent — no row before reload + FE-0 — is
   met). Fix: a future kickoff should word it "the first recorded *row* line", as #84 did for S6.1.
3. **NIT — the `hello.ts` block sits under "Build (step 1)"** rather than under its own "Set-up (not in
   the sheet)" heading; it is listed under Deviations, so nothing is hidden. Fix: none needed; optional
   heading in later records.

No CRITICAL, MAJOR or MINOR finding.

## 8. Verdict

**PASS-with-notes.** Every row verdict re-derives identically from the raw records; FE.4 and FE.5 PASS;
the rules and tools are byte-identical to `6398f27`; hygiene 0 token / 0 URL in every file; the outcome
reads strictly off #78's precedence as **(B) — no kind passes: policy `"focusFirst"`** (deciding rows
FE-1 0/3, FE-2 2/3, FE-3 0/3; FE-5 holds first and last; FE-4 PASS). #88's Revisit-if is not met.
