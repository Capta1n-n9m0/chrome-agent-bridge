# FE — focus emulation for trusted input: step report (build part), 2026-10-23

Step agent's report for stage FE's **build part** only. The live part (main-tree build,
`recipes/reload-extension.ps1`, rows FE-0…FE-5, `FE-run-record.md`) has not run; no FE measurement
exists. Sub-reports: `FE-builder.md` (with "Fixer round 1"), `FE-verifier.md` (with "Re-check round 1"),
ledger `FE.ledger.md`.

## 1. Verdict

**DONE** (build part). Live part pending, alone, on the session agent's resume message.

## 2. Outputs

- Commit 1 (rows, before any build is loaded — FE.4's order anchor): **`6398f27`**
  `docs(step8): FE — pre-registered rows FE-0…FE-5, wave sheet, measurement script` —
  `docs/e2e-test-plan.md` (new §4.17, 98 lines added, 0 removed), `FE-wave-sheet.md`, `recipes/fe.ts`,
  `recipes/fe-rules.ts`, `recipes/fe-win.ps1`, `recipes/tsconfig.fe.json`.
- Commit 2 (code, tests, reports): `feat(extension): FE — focus emulation for trusted input (verifier:
  PASS-with-notes)` — `extension/src/trusted-input.ts` (new, pure step-list builder),
  `extension/src/debugger.ts` (`runTrustedInput` replaces `trustedClick`/`trustedType`/`trustedPressKey`,
  whose only caller was `actions.ts`), `extension/src/handlers/actions.ts` (trusted branches),
  `extension/test/{fe-harness.ts, trusted-input.test.ts, fe-actions.test.ts}`,
  `extension/test/fixtures/fe-cdp-baseline.json`, and the FE steps files.
- Today's command list (FE.2 stricter, F19): `extension/test/fixtures/fe-cdp-baseline.json`, sha256
  `6881c15abc00a75154e9dde8fc1cab9425e5b58b86050dbe057f6fc1687e4923`, recorded on `637a808` before any
  source change (6 cases: trusted click; `type "a.\n"` + submit; `pressKey Tab`; click escalation; type
  escalation; a failing `Input.*`). The verifier re-recorded it independently on the original code: 6/6
  equal.
- Tests (verifier, clean worktree at `682f73d` with only FE's files applied): **1080 → 1135 tests, 64 → 66
  files (+55 = trusted-input 15 + fe-actions 40)**. As a delta over the brief's 1008 / 60 at `dcb72db`:
  FE adds +55 tests and +2 files; the rest of the change since is S1's. Typecheck, `npm run build`,
  `npx tsc --noEmit -p recipes`, `-p recipes/tsconfig.fe.json` exit 0; `npx tsx recipes/fe.ts selftest`
  → `SELFTEST PASS — 79/79`.
- FE.3 greps (#84 form), at `637a808` and after: `grep -rnE "windows\.update|focused\s*:"
  extension/src/debugger.ts` → no output, exit 1; `grep -rnE
  "windows\.update|tabs\.update|focused\s*:|focusTab|active\s*:\s*true" extension/src/debugger.ts
  extension/src/handlers/actions.ts extension/src/trusted-input.ts` → no output, exit 1 (same as before).

Exit checks: FE.1 PASS; FE.2 PASS (pure builder tested, failing first; no-option log equals the
fixture for absent/`false`/`"yes"`/`1`/`"true"`, 30/30; runner test: `attach, enable, …, failing Input,
disable, detach`, input's mapped error surfaced; also disable after a throwing focus step and a throwing
enable); FE.3 PASS; FE.4 precondition PASS (rows committed in `6398f27`, no FE build loaded yet — the
live part's `git log` check reads this order). FE.5, FE.6: live part.

## 3. Verifier verdict

**PASS-with-notes** (round 0: 3 MINOR + 4 NIT; fixer round 1 fixed MINOR 1, 2 and NITs 4, 6; MINOR 3
ruled by the step agent; NITs 5, 7 open with no change) — `FE-verifier.md`.

## 4. Deviations from the phase doc

1. `recipes/tsconfig.fe.json` added instead of editing the shared `recipes/tsconfig.json` (outside the
   lane; it lists files explicitly). S6 or S7 may fold `fe.ts`/`fe-rules.ts` into the shared config.
2. FE-3's PASS rule carries FE-1's other clauses besides the status line (stricter; decision below).
3. FE-4 gets measurable clauses for "the foreground window unchanged" and "no window capture shows the
   target" with their own positive control (stricter; decision below).
4. The builder's round-0 change to trusted `type` with an unmappable character (failing before any key)
   was reverted in fixer round 1: today's behaviour holds (preceding characters sent, then the same
   `DEBUGGER_ATTACH` error).

## 5. Proposed decisions

### 2026-10-23 · A failing focus-emulation disable after a successful input is warned, not thrown
**Decided:** when `Emulation.setFocusEmulationEnabled {enabled:false}` fails after the `Input.*`
commands succeeded, the call still succeeds with `focusEmulation: "on"`, logs one line naming only the
code, and detaches. After a failing input (or focus step, or enable), the disable's error is swallowed
and the original error is returned. **Why:** the input has already happened, so an error would invite a
retry that repeats it; Chromium clears emulation on detach (`EmulationHandler::Disable()` from
`DevToolsSession::Dispose()`, stage0-audit.md §8); FE-1/FE-2's "target `hidden` after the call" would
show it live if not. **Instead of:** throwing the disable's error; retrying the disable. **Revisit if:**
a live row reads the target `visible` after the call returned, or Chrome 156 does not clear emulation
on detach. **By:** Claude (proposed)

### 2026-10-23 · FE-3's focus step, key and PASS clauses
**Decided:** FE-3 focuses `#trusted-input` with the bridge's `evaluate` of `el.focus()` in the same
trial (its own debugger session, ended before the pressKey's) and records whether `activeElement` is the
field; key `ArrowLeft` (its keydown sets `status: TRUSTED key = ArrowLeft`; no `input` event overwrites
it); PASS = that status with FE-1's other clauses. **Why:** #85 item 3 asks the row to name its focus
step; `evaluate` is independent of the mechanism under test; the same clauses across FE-1/2/3 keep (C)'s
per-kind comparison fair. **Instead of:** a trusted click as the focus step; status line alone.
**Revisit if:** the focus step prints `no` in any trial. **By:** Claude (proposed; ruled by the step
agent for the commit)

### 2026-10-23 · FE-3c: FE-3 without the option, an observation outside the table
**Decided:** after FE-5 last, `fe.ts fe3 --control` runs FE-3 without `focusEmulation` (three trials)
and records whether the key reached the page; it never feeds the outcome table. **Why:** FE-5 controls
only click and type; without a pressKey control a FE-3 PASS cannot show that emulation made the
difference. **Instead of:** no pressKey control; adding it to FE-5 (would change the pre-written table).
**Revisit if:** FE-3c receives the key — list it for the user beside the outcome. **By:** Claude
(proposed)

### 2026-10-23 · How FE-4's window clauses and the positive control are measured
**Decided:** `recipes/fe-win.ps1` captures the driver's window (`PrintWindow`, ~50 ms) and records the
foreground handle per frame; FE-4 FAILs if any frame from 500 ms before the first FE-1 call to 1500 ms
after the last FE-3 call shows the target's magenta bar, or the foreground handle changes in that span;
the capture is void (⇒ escalate, never dropped) unless every call has frames within 1 s on both sides.
Its positive control is the FE-PC screenshot: ≥ 1 magenta frame in the flash, none in the 3 s before.
Per-trial clauses: the human's tab `current` in every `listTabs` read (25 ms poller + before/after),
every window's active tab unchanged, the target never active, no `hidden` in the human's log. A failed
poll or an unreadable trial is a FAIL (for FE-5, "received": voids the control). The verdict counts
every recorded trial and prints `STOP`/`INCOMPLETE` (not an outcome) for a failed FE-0, any failed
positive-control record (also when a re-run passed), a void capture, or fewer than three trials.
**Why:** #78 item 1 names the foreground window and "no window capture shows the target"; every capture
heuristic needs a positive control (LESSONS); each choice is stricter or conservative — a doubtful read
leads to escalation or (B), never to (A). Hue thresholds were chosen knowing Step 7's `#dd00fa`/
`#97fdfd` readings (disclosed). **Instead of:** dropping the capture clause; a capture without a
control. **Revisit if:** the positive control's capture part fails, or an unrelated foreground change
fails FE-4. **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed. No new runtime gotcha (nothing was measured live).
- Verifier NITs left open: a disable is sent after a failed enable (harmless, Chromium no-ops it);
  `recipes/tsconfig.fe.json` duplicates the shared recipes config.
- `fe-win.ps1` ran only against a scratch WinForms window of the builder's own (14 frames, both hues
  classified, the window never took focus); `fe.ts`'s connecting commands have never run against Chrome
  or a daemon. Helper bugs found in the wave are set-up fixes, recorded, never rule changes.

## 7. Handoff for the live part

- Precondition: no other stage has uncommitted code in the main tree; FE's code is committed (commit 2).
- Order (the wave sheet `FE-wave-sheet.md` has the exact commands): `git log` shows `6398f27` before the
  build; main-tree `npm run build` from committed code; `recipes/reload-extension.ps1` (exit 0, else stop
  and ask the user); FE-0 (`fe.ts check`; FAIL = stop, reload, re-check); FE-5 first; FE-PC; FE-1, FE-2,
  FE-3 (three trials each, fresh tab per trial) with FE-4 measured across them; FE-5 last; FE-3c; `fe.ts
  verdict` reads the outcome by #78's precedence; `FE-run-record.md` with every command and its text;
  the daemon log attached as `.txt` after the log-hygiene counts; a fresh verifier re-reads the record
  against the rules in `6398f27`.
- The build rewrites `extension/dist` (and `daemon/dist` if S1/S0 changed daemon code): interactive
  sessions see a build-id handover (4002, cursor lost).
- No PIDs, watchers or background jobs are running from this stage.

## For the as-built register

- `focusEmulation: true` on trusted `click`/`type`/`pressKey` (explicit `trusted:true` or click/type's
  escalation): one debugger session, attach → `Emulation.setFocusEmulationEnabled {enabled:true}` →
  (`type` only) `focusForTyping` → `Input.*` → `{enabled:false}` in a `finally` → detach. The result is
  `{ok:true, focusEmulation:"on"}` exactly when emulation was enabled; anything but `true` takes the
  pre-FE path, whose full log equals `extension/test/fixtures/fe-cdp-baseline.json`. No window focus, no
  tab activation, no `focusTab` (greps empty, exit 1).
- The pure builder `trustedInputSteps(input, focusEmulation)` in `extension/src/trusted-input.ts`; the
  runner `runTrustedInput(tabId, input, {focusEmulation, focus?})` in `extension/src/debugger.ts`
  (replaces `trustedClick`/`trustedType`/`trustedPressKey`).
- Rows FE-0, FE-5, FE-PC, FE-1…FE-4, FE-3c in `docs/e2e-test-plan.md` §4.17, committed `6398f27` before
  any FE build was loaded; verdict rules in `recipes/fe-rules.ts` (selftest 79/79).
- Tests +55 in 2 files (1080 → 1135 at `682f73d`).

## Budget

1.75 h budgeted; ~1.9 h actual (07:40Z start to commit 2), mostly the builder's rows and script
(~24 min code + rows) and the verifier's independent re-recording (~12 min) plus one fix round.

---

# Live part (2026-10-23) — Run 11 (FE)

## Verdict

**DONE.** Outcome **(B), no kind passes: policy `"focusFirst"`** (`fe-verdict: OUTCOME (B) — no kind
passes: policy "focusFirst"`), read off #78's precedence: FE-5 not void (0/12 control trials received
input) → FE-4 PASS (9/9) → not every kind passes → **no kind passes all trials** (FE-1 0/3, FE-2 2/3,
FE-3 0/3) → (B). Fresh verifier: **PASS-with-notes** (3 NITs), `FE-live-verifier.md`; it re-derived every
row with its own script and re-ran `fe.ts verdict` on the attached copies (same 8 lines).

## Outputs

- Ledger commit before the run: `257dd8d`. Build under test `6742c1f` (rows `6398f27` before it — FE.4
  PASS). Daemon build `7712e1af…` (unchanged since S0; FE changed only the extension).
- Record `FE-run-record.md`; attachments `FE-run-results.txt` (28 records), `FE-frames-positive.txt`,
  `FE-frames-block.txt`, `FE-daemon-log.txt` (37 lines; hygiene `://` 0, token 0, withheld 0);
  `docs/e2e-test-plan.md` §5 "Run 11 (FE)". No images kept.

| Row | Verdict | Observed |
|---|---|---|
| Reload | exit 0 | `RELOAD OK - the extension reconnected to the daemon after the press at 08:35:54.883Z` (FE.5 first row line) |
| FE-0 | PASS | `click e7 trusted focusEmulation:true → ok {"ok":true,"focusEmulation":"on"} (21 ms)` (FE.5 PASS) |
| FE-5 first | control holds | BG-1 0/3, BG-2 0/3; `ok {"ok":true}` in 5–12 ms, `status: idle` |
| FE-PC | page PASS, capture PASS | human's tab hidden +5 ms → visible +1619 ms; 16 magenta frames in the flash, none before |
| FE-1 | FAIL 0/3 | `status: idle` (18/23/34 ms) |
| FE-2 | FAIL 2/3 | trials 1–2 `status: TRUSTED input = bg2typed`; trial 3 `TRUSTED input = ped`, field `ped` (first 5 chars lost) |
| FE-3 | FAIL 0/3 | `status: idle`; focus step `activeElement is #trusted-input: yes` every trial |
| FE-4 | PASS 9/9 | human's tab current, never hidden; window active tabs unchanged; target never active; 71 judged frames, none magenta; foreground `1051630` throughout; not void (max gap 126 ms) |
| FE-5 last | control holds | 0/3, 0/3 |
| FE-3c (obs.) | 0/3 | the key never arrived without the option — FE-3 discriminates |

## Observations (not judged)

- Target page visibility with the option: `visible` +3–7 ms into each call, `hidden` again +14–39 ms
  (about when the call returned); `hidden` on every read after the call. Without the option it never
  changed. Confirms Stage 0 F1's Chromium reading on Chrome 156.
- **Emulation still on after a call (#88 Revisit-if): never seen.** #88's disable choice stands.
- Finding for the user (not an outcome input; unmeasured hypothesis): FE-2's partial delivery (2/3
  trials whole, one with its first five characters lost) and FE-1/FE-3's zero delivery for one- or
  two-event inputs suggest the renderer starts accepting input only some milliseconds after the
  enable — a race between `setFocusEmulationEnabled` taking effect and the first `Input.*` command. A
  delay after the enable might change the result; testing it would be a new design and new
  pre-registered rows, never a re-run of FE's rows. The table's reading (B) stands.

## Deviations (live)

None that could affect a verdict (verifier): a `recipes/hello.ts` daemon start before the reload (§1
item 9 recommends it; it read only `daemon.status`/`listTabs`); the set-up block re-sourced per
PowerShell call (the tool keeps no state); HEAD two docs-only commits after the build commit. No
set-up fixes, no re-runs, no exit 1/2/3. Verifier NITs: the hello.ts `listTabs` line shows the single
open tab's fixture title and Chrome id; FE.5's "first recorded line" holds by the sheet's step order
(future checks: "first recorded row line"); the hello.ts block sits under the Build heading.

## For the as-built register (live)

- Run 11 (FE), 2026-10-23: outcome (B) `"focusFirst"` by #78's table — FE-1 0/3, FE-2 2/3, FE-3 0/3,
  FE-4 9/9, FE-5 0/12 (control holds), FE-PC PASS, FE-3c 0/3. FE.4, FE.5 PASS; FE.6 is the session
  agent's decision "The background-input policy".
- Measured on Chrome 156: focus emulation makes a background target's page `visible` while it is on
  and `hidden` again when it is off; it never moved the human's tab, the foreground window or any
  window's active tab; Chromium cleared it by the time each call returned.

Budget (live): 1.5 h budgeted; ~0.6 h actual (driver ~8 min wave, verifier ~4 min, plus set-up and
write-up).
