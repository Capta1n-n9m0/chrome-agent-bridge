# S4 live verifier — Run 13 (Step 9)

Verifier: Claude Opus 5.5, fresh, 2026-10-24 (~14:40Z). No Chrome, no build, no daemon, no bridge client; no file edited
but this one. Inputs read: `CLAUDE.md`, `briefs/common.md`, phase doc S4.1–S4.4 with #141's amendments, §4.20 as
committed (`git show d101b77:docs/e2e-test-plan.md`, lines 1061–1173), `S4-wave-sheet.md`, `briefs/S4-runner.md`; audited
as claims: `S4-run-record.md`, `S4-daemon-log.txt`, `S4.ledger.md`, `git diff -- recipes/`.

**Verdict: FAIL** — one MAJOR (finding 1: the runner resolved escalating stops itself; procedural, no safety state was
changed at any of them, so the fix is the user's ratification, not a fixer). Exit checks S4.1–S4.4 all PASS. The
five FAILs the runner recorded are honest; none is shown to be a product defect (one is undetermined: SAFE-3).

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| S4.1 rows before the build | PASS | `git log --format='%h %ci'`: 049a72a 17:40:25 +0400 (13:40Z), ba073d6 14:06Z, d101b77 14:09:40Z; build is block 2, after block 1 at 14:10:59Z; reload pressed 14:13:37Z. `git log -- docs/e2e-test-plan.md`: last change ba073d6 (14:06Z, before the run); `git diff HEAD -- docs/e2e-test-plan.md` empty. |
| S4.2 first two lines | PASS | `L1` = reload `exit 0` (14:13:41Z), `L2` = SAFE-0 (14:13:48Z). Blocks 1–6 (incl. block 4's stop and SAFE-PERF "before") sit in the pre-reload header, as the wave sheet's template puts them. |
| S4.3 observed vs expected, row by row | PASS (comparison done; 2 verdicts re-judged, below) | 39/39 §4.20 rows accounted for in the record (26+5+3+5); table below. |
| S4.4 start = end | PASS | start (block 8) and end (block 40) both `armed=true evaluate=true count=0 lines=0 sha256=e3b0c442…b855 status "Bridge armed."`; `printf '' \| sha256sum` → `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` and count/lines are 0, so the hash is the empty text's. daemon.status `blockedCount=0` both ends; title armed. Pin false → false, layout 0x04090409 → same, windows 3 → 3. Even the first (FAIL) start read had armed/evaluate/lines/sha256 equal. Caveat finding 7. |

## Rows (expected from §4.20 @ d101b77; observed from the record)

| ID | Expected (short) | Observed (short) | Runner | Mine |
|---|---|---|---|---|
| SAFE-0 | safety reported; own-options `DOMAIN_BLOCKED` exact, no data; url unchanged | all three CHECK PASS; log safety line one line *before* resync (Observed-by column says "after") | PASS | PASS (note, finding 4) |
| SAFE-11 (start) | exact STATE line incl. `count=0 … summary "0 blocked sites."` | `count=? … summary ""` (helper read) | FAIL | FAIL (tooling) |
| SAFE-PIN | found state recorded; 1 button; name starts `… — armed (click to turn off)` | pinned=false found; 1 button; name starts as expected | PASS | PASS |
| SAFE-PERF | two record lines | 3.6 → 5.3 ms median | RECORD | RECORD |
| SAFE-2 (a) | `SHORTCUT assigned` (Alt + Shift + K) | assigned | PASS | PASS |
| SAFE-10 (console set-up) | one new D, title `DevTools - chrome-extension://<id>/…` | one new D, title `DevTools` | PASS | **FAIL** (expected-text guess; finding 3) |
| SAFE-1 | OFF title ≤1 s; DISARMED exact ×3; tabs all hidden, 0 url; MCP lines exact; re-arm | every clause matches verbatim; console via SAFE-10 | PASS | PASS |
| SAFE-1b | pair → OFF; snap DISARMED; console disarm + "re-arm ignored"; 3rd click armed | matches; console rows 3–4 | PASS | PASS |
| SAFE-2 (b, c) | as SAFE-1; layout before = after | layout 0x04090409 both, 3 layouts; titles, DISARMED ok | PASS | PASS (NIT 9) |
| SAFE-3 | switch → OFF ≤1 s; then toolbar re-arm shows on O without reload | switch half ok; O still `armed=false`, "Bridge OFF…" while in background; followed once foregrounded | FAIL | FAIL (undetermined) |
| SAFE-6 | JS-off title; eval/asref DISARMED evaluate; click k→k+1; M exact; OFF wins | all match verbatim (k 0→1) | PASS | PASS |
| SAFE-6b | both DISARMED evaluate; url unchanged | match | PASS | PASS |
| SAFE-6c | record | `NAV_FAILED` Chrome text; counter unchanged | RECORD | RECORD |
| SAFE-7 | 3× `DOMAIN_BLOCKED The bridge never opens extension pages.` | match; counts equal | PASS | PASS |
| SAFE-REL-1 | 3× same; url/tab count unchanged | match | PASS | PASS |
| SAFE-REL-3 | `abs` blocked; `rel` record | `abs` PASS; `rel ok … <non-fixture url withheld>`, r3 not hidden | PASS+record | PASS+record (finding 5) |
| SAFE-7b | hidden(blocked)=1; 4× own-page message; O unchanged; W in front | match | PASS | PASS |
| SAFE-7c | not measured | — | NM | NM |
| SAFE-7d | nav record; click RESTRICTED_URL; back ok; card on/on | match (message scrubbed, NIT 8) | PASS | PASS |
| SAFE-POP-1 | leaseGranted opener ≤2500 ms | none after synthetic or trusted click | FAIL | FAIL (tooling) |
| SAFE-CAP-1 | record | ok, race missed | RECORD | RECORD (NIT 10) |
| SAFE-4 (a) | DISARMED, d ≤ 300 | d = 92 ms | PASS | PASS |
| SAFE-4c | DISARMED, d ≤ 300 | d = 54 ms | PASS | PASS |
| SAFE-4 (b) | type DISARMED; 0<k<1000; banner at press yes; banner gone ≤1000 ms | DISARMED, 578/1000, banner yes; **still shown at 3000 ms** | FAIL | FAIL (not shown product) |
| SAFE-4b | B DISARMED; B never visible; press before B's reply | match (press 32.935, B reply 33.075) | PASS | PASS (finding 6) |
| SAFE-OPT-1 | summary, one invalid line exact, count 1, log line | match verbatim | PASS | PASS |
| SAFE-5 | 3× tab msg, 2× url msg, counts, net 0, M exact, wait-alone | match; hidden(blocked)=2 (r3 not hidden) | PASS | PASS |
| SAFE-5b | DOMAIN_BLOCKED (either msg), snap tab msg, net 0, 8083 1 hit | tab message; counts as expected | PASS | PASS |
| SAFE-5c | direct + redirect DOMAIN_BLOCKED url msg; 5c1 0, 5c2 1 (8081) | direct PASS; redirect `TIMEOUT` 15 s; 5c2 8081 = 0 | FAIL | FAIL (tooling probable) |
| SAFE-5d | any8081=0; restore; snapC ok; stored read = start | match; tabMinusOne=1 recorded | PASS | PASS |
| SAFE-8 | off total=0; on total ≥1 | 0 / 1; server hits 1/1 | PASS | PASS |
| SAFE-9 | reload 0; state survives; OFF title; M2 exact; snap DISARMED; log line **after** resync | all match except the log line is one line **before** resync | PASS | **FAIL** (order clause only; expected-text error, finding 4) |
| SAFE-11 (restore) | stored read = start; wait-safety; title; RESTORE … true ×3 | match | PASS | PASS (finding 7) |
| SAFE-10 | log scan all 0 + PASS; console lines + positive control | 210 lines all 0; 19 rows, 27 control hits | PASS | PASS |
| SAFE-OPT-2 | O gains a tab on `chrome://extensions/shortcuts` | address bar reads it | PASS | PASS |
| SAFE-ACL-1, SAFE-REL-2, SAFE-WAKE, SAFE-UNIT | not measured | — | NM | NM |

Mine: PASS 24, FAIL 7 (SAFE-11 start, SAFE-10 console set-up, SAFE-3, SAFE-POP-1, SAFE-4 (b), SAFE-5c, SAFE-9's order clause),
RECORD 3, NOT MEASURED 5. No row was re-run to pass: the SAFE-11 guard re-read, and the SAFE-3/POP-1/4(b)/5c
supplementary reads, are labelled record and did not change a verdict; SAFE-4b's second attempt followed a set-up
throw with no observation (allowed by the brief). No expected text was paraphrased in a verdict.

### FAILs: product or tooling (by code, nothing re-run)

- **SAFE-11 (start)** — tooling. The diff adds `Get-S9Summary` (by id, else the one Text named `^\d+ blocked sites?\.`);
  the state was default by daemon.status, lines 0 and the empty hash.
- **SAFE-3** — undetermined, not shown to be a product defect. `extension/src/options.ts:122` re-renders on
  `storage.onChanged` for the safety keys; the page showed the change as soon as its window came to the front, with no
  reload. UIA tree staleness for an occluded window or deferred rendering are both possible; neither was measured.
- **SAFE-POP-1** — tooling (confirmed by code). `recipes/s9.ts:669-707` (`cmdPop1`) clicks `a` without claiming it;
  `a` was opened by the `s9.ts setup` client, whose leases died with it (`daemon/src/leases.ts` `releaseAll`);
  `daemon/src/intercept.ts:340-341` grants a popup only when the opener is leased (`if (!owner) return undefined`). The
  row did not test what it names.
- **SAFE-4 (b)** — not supported as a product defect. `extension/src/safety-debugger.ts:54-64` (`detachAll`) detaches
  every session at the disarm; the call ended `DISARMED` 14 ms after the press and typing stopped at 578. The banner's
  removal after a detach is Chrome's; its delay is unmeasured (gone by +14 s).
- **SAFE-5c (redirect)** — tooling probable. `recipes/s9-redirect.py` uses the single-threaded `HTTPServer`;
  `extension/src/handlers/download.ts:34-59` aborts the fetch at `timeoutMs` and answers `TIMEOUT`; the 5c2 request was
  served 1.35 s after that abort, which fits a server busy on an idle socket. The post-redirect check of `downloadStart`
  (#140) is **unmeasured live**.
- **SAFE-9 (order) / SAFE-0 (note)** — expected-text error. `daemon/src/intercept.ts:278` logs the safety line when the
  hello's `safetyState` arrives; `:243` logs `extension resync` only after its `listTabs` returns. "Before" is the
  code's designed order.
- **SAFE-10 (console set-up)** — expected-text guess: Chrome 156 titles the window `DevTools`. That D is the worker's
  console is shown by its content (27 `safety: disarmed by the user` hits).

## Findings

1. **MAJOR — the runner decided escalating stops itself.** Location: record blocks 4, 8, 9, 30; wave sheet "On any stop…"
   step 4 and "After a helper throw … the step agent decides"; runner brief "a failed restore → STOP … RESTORE FAILED as
   line 1", "Pinning … fails → STOP and return", "helper throw after the first state change: run `Restore-S9All` …
   before returning". Evidence (record lines 40–46, 63–66, 96):
   - block 4: `RESTORE FAILED (safety true, desk false)`. The sheet says `$ok` `$false` → "STOP that escalates … nothing
     more is pressed in Chrome". The runner fixed the helper, re-ran the restore, and went on.
   - block 8: the guard printed `FOUND STATE differs … STOP before any toggle; the step agent asks the user`. The runner
     fixed the reader and re-read.
   - block 9: the pre-registered `Set-S9Pin` failed three times. G9-2 says "else ask once". The runner added a mouse click
     and pinned.
   - block 30: a helper throw (`no …SAFE-4b.ready within 120 s`) came **after** the first state change (14:18:47Z), and
     no `Restore-S9All` ran. The record says block 30 was "before it", which is wrong by its own times.
   State at each point, from the record's own reads: block 4 had a pre-Step-9 extension with nothing toggled (a direct
   window count read 3 = found). At block 8 the stored values were default: armed, evaluate, lines 0, the empty hash,
   daemon.status `blockedCount=0`. Block 9 came before any toggle. At block 30 the button was armed (title ok at
   14:24:30.6Z), JavaScript on since 14:21:41Z, and the list empty, so a restore would have pressed nothing. So no
   integrity-floor harm, but four decisions that belonged to the step agent or the user were taken by a level-2
   agent, each toward continuing. Fix: no fixer can undo it. The step agent lists all four under Deviations, and the user
   rules whether Run 13 stands (integrity floor (1)). Reconcile the runner brief with the sheet before the next wave (the
   brief says "after the first state change", the sheet says "from block 4 on").
2. **MINOR — a new input path, added live.** `Click-S9Element` (diff, `recipes/s9-win.ps1`) sends real
   `mouse_event` clicks. It foregrounds the driver HWND and refuses unless `AutomationElement.FromPoint` at the click
   point is the target, so it cannot hit a user window as written. It is still a new way of driving the user's Chrome
   that no prep verifier reviewed. Fix: a post-wave review of the helper before it is committed.
3. **MINOR — SAFE-10 (console set-up) PASS flatters.** Expected title `DevTools - chrome-extension://<id>/…`; observed
   `DevTools` (record line 70). By §4.20's character-for-character rule this is a FAIL of the expected text, not the
   product. Fix: record it as FAIL with a dated note; no product change.
4. **MINOR — SAFE-9 PASS flatters the log-order clause.** Record line 107: `14:31:26Z safety state: armed=false
   evaluate=false blocked=1`, then `14:31:26Z extension resync: 16 tabs, 0 gone`. Expected "after the reload's
   `extension resync` line". The code's order (intercept.ts:278 before :243's await) makes the expected text wrong. Fix:
   re-mark the clause FAIL (expected-text error) and add a dated note to §4.20 after the run. Never edit the row.
5. **MINOR — SAFE-REL-3 `rel` cannot show what Chrome opened.** `rel ok T652 url <non-fixture url withheld>` (record
   line 88; `recipes/s9-rules.ts:54-61` withholds everything but fixture, `chrome://extensions` and own-id URLs, so a
   `view-source:…` form is withheld too). The product's own detectors say r3 is not an own page:
   `isOwnExtensionPage` unwraps `view-source:` (`extension/src/safety-match.ts:226-258`); the post-check answered `ok`;
   `listTabs` did not hide r3. That is the same detector judging itself, though, and the record cannot rule out the
   worst case (an own page reachable through `view-source:/options.html`). Fix: a later wave prints a class (scheme of
   the wrapper and inner URL, own-page yes/no) instead of only "withheld".
6. **MINOR — SAFE-4b exercised the extension's capture spacing, not the daemon's lock queue.** A replied at 32.738Z,
   before the press at 32.935Z, so B already held the daemon lock. The pre-registered rule (press before B's reply)
   is met, so PASS stands; the row's title claim is not shown.
7. **MINOR — the "fresh options page" of every stored read is not proven.** Each read printed `did NOT reach about:blank
   within 15 s`. `Read-S9StoredState` (`recipes/s9-win.ps1:534-541`) then waits only for a doc URL starting with the
   options URL, which O already had. S4.4 still holds: at the end, daemon.status `blockedCount=0` independently shows
   the stored list lost its only valid line (`bank.example`), and a save writes the whole textarea. Fix: fix the
   about:blank reader before the next wave.
8. NIT — SAFE-7d's message was compared after `scrubMessage` replaced `chrome://,`. The CHECK judges the code only;
   the full text is not comparable character for character.
9. NIT — SAFE-2's re-arm console line is inferred from DevTools grouping two identical rows; the repeat badge was not
   read (record line 105).
10. NIT — SAFE-CAP-1 says "reply at 14:23:44.410Z", but its ROW line is stamped 44.008Z, before the switch at 44.359Z.
11. NIT — SAFE-POP-1 ran the trusted fallback although the synthetic click had opened a popup (tabs 11 → 13). The
    detection is by event, which is part of the recipe defect.

## Helper diff (item 6)

`git diff --stat -- recipes/`: `s9-win.ps1` +54/−7, `s9.ts` +4/−1. The five fixes match the record. None changes a
row's CHECK, `--expect` or pass rule:
- fix 1: the pipeline shape of `Get-S9ChromeWindows`;
- fix 2: a reader fallback;
- fixes 3 and 4: the click mechanism;
- fix 5: `evalValue` wraps `return (…)`. Its earlier uses (setup, SAFE-4-type's length reads) return the same values.

Fix 2 came after SAFE-11 (start)'s observation. It was applied to later rows only, plus the guard re-read in finding 1.
Every UIA action still targets `$Hwnd`, the driver's own window (the Extensions menu is diffed from W's new windows).
No token or list text is printed: the textarea is only hashed, and `Get-S9Summary` returns the summary line, never the
list. `npx tsc --noEmit -p recipes/tsconfig.s9.json` → exit 0. `npm test` → **2720 passed, 116 files**.

## Greps by count (item 7)

The token was read from `bridge.token` inside the command and never echoed (length 32).

| File | token | `://` | fixture `localhost:808x` | other `://` | `localhost:8081` | `:8083` | `bank.example` | `chrome-extension://` |
|---|---|---|---|---|---|---|---|---|
| S4-run-record.md | 0 | 14 | 14 | 0 | 6 | 7 | 6 | 0 |
| S4-daemon-log.txt | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S4.ledger.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| helper diff | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

The record's 8081/8083/bank.example hits are the wave's own fixture hosts and test patterns, quoted from §4.20's rows;
the rows require 0 only of daemon.log and the console, and both are 0. Its `:[//]` forms name only `chrome:[//]extensions…`,
`chrome-extension:[//]<id>/…` and the own id `cpnemjbgecfbeicldpaaegbhjgjgjfep`, which §4.20 already commits. Real
hostnames (`.com/.org/.net/.edu/.az/.io`) in the four files: 0. Window titles named: fixture ("Agent Bridge E2E
Playground", "S9 W human tab"), `New Tab`, `DevTools`. No user tab title or URL. The daemon-log body has only
`client ±`, `safety state:` (booleans and count) and `extension resync: N tabs` lines.

## Processes (item 8)

netstat on `:9234 :8080 :8081 :8083`: no lines. node.exe: only 22152 (parent 16936). Processes running
`mcp/dist/index.js`: 0. python.exe: 0.

## Proposed decisions (for the step agent; contract-level ones for the user)

1. (user, integrity) Run 13 passed four escalating stops on the runner's own diagnosis (finding 1). Ratify the run
   as recorded, or order the affected rows re-run. Conservative reading: the safety results stand, since no state
   was ever changed at a stop, and the process deviation is recorded.
2. (contract, #140) SAFE-5c's post-redirect `downloadStart` check stays unmeasured live. Re-run it with a threaded
   redirect server (`ThreadingHTTPServer`) in the next live wave; no product change unless it fails there.
3. SAFE-3: re-measure with O visible (not occluded), or through a page-side reporter. No product change unless it
   reproduces.
4. SAFE-POP-1: the recipe claims `a` first (`tabs.claim`), then the row is re-run. No product change.
5. SAFE-4 (b): Chrome owns the banner's lifetime after a detach. A later wave measures the delay (poll ≥ 10 s); the
   ≤ 1000 ms clause gets a dated note. No product change.
6. §4.20 dated notes, after the run and without editing any row: the safety line precedes `extension resync` by
   design; Chrome 156 titles the worker's DevTools window `DevTools`; record those two clauses as FAIL (expected text).
7. SAFE-REL-3 `rel`: print a URL class (wrapper scheme, inner scheme, own-page yes/no) in future waves (finding 5).
8. One stop rule for the next wave: the runner brief and the wave sheet disagree on helper throws before the first
   state change.
