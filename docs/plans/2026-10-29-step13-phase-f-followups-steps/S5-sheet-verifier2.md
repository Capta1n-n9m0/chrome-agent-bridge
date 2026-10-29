# S5-sheet verifier, round 2 (after fix round 1)

Verifier: Claude Opus 5.5, medium. Read and run only; nothing edited but this report. Scope: the first verifier's
findings (MAJOR-1, MINOR-2 to MINOR-8, NIT-9 to NIT-11) against the fixer's changes in the uncommitted
`docs/e2e-test-plan.md` §4.28 (l.1938-1994), and the fixer's corrected split item for MINOR-8.

## Verdict: FAIL (1 new MAJOR, 2 new MINOR, 1 NIT; all eleven first-round findings fixed)

## Checks re-run

| Check | Result |
|---|---|
| `git diff --stat docs/e2e-test-plan.md` | `1 file changed, 58 insertions(+)`; `--numstat` `58 0`; one hunk `@@ -1935,6 +1935,64 @@`: only §4.28 added, nothing deleted |
| `node scripts/doc-check.mjs` | `tools: 25 · router methods: 28 · codes: 27`; no dead path; only flag the known pre-existing `CLAUDE.md:110  5596 passed`; `Checked 38 living docs` |

## First-round findings

| Finding | State | Where |
|---|---|---|
| MAJOR-1 (CON-NOTEA blocked leg vacuous) | **Fixed.** `<P>` = 8081 required (Fixtures l.1950, row l.1967), else NOT MEASURED "fixture port"; pre-pattern read must show `entries=2`, else NOT MEASURED; control sentence now names the pre read; `entries=0` alone proves nothing. A replayed read sees the page's whole history each time (`extension/src/CLAUDE.md`, "A second `Runtime.enable` … replays every message again"), so a pre read early in the slice and the blocked read later on the same page are comparable. But see NEW-MINOR-A (the pre line's `sentinel`) | l.1950, 1958, 1967, 1990 |
| MINOR-2 (DEVT-EARLY before-open) | Fixed: step (0) and its pass/NOT MEASURED clause; form (7) allows `n/a` for a docked leg | l.1952 (7), 1985 |
| MINOR-3 (POP guard after round 1) | Fixed: `focusTab` on H by its holder (B; C for `third`) before every round, guard read after it, an `fg` round not counted | l.1960, 1962 |
| MINOR-4 (dock side left changed) | **Fix introduced a defect: NEW-MAJOR-B** | l.1983, 1987 |
| MINOR-5 (LOGS per tool) | Fixed in form; **the allowed list is incomplete: NEW-MINOR-C** | l.1952 (11), 1973 |
| MINOR-6 (line forms) | Fixed: `ARGS` (both forms), `KEEPDT`, `SWEEPHELD`, `RESTORED:`, the redefined `CONCAP` and `CHOOSE names-devtools`, new (12) `S4`, (13) `DOCK` | l.1952 |
| MINOR-7 (REFUSE-DIS verdict) | Fixed (the `self` fallback stated); see NIT-D | l.1978 |
| MINOR-8 (split misses `s12-r19-c.ts` readers) | Fixed in the fixer's report (corrected item); its line numbers check out (`grep`: `s12-r19-c.ts:94` `mcpCodeOf`, `:101` `judgeMcpErr`, uses at 374/388/408; `s12-r19-de.ts:14,64,95`). The builder's §7 is not edited, so the step agent must carry the corrected item into the S5-helpers brief | fixer1 report |
| NIT-9 (liveA20 order) | Fixed: header and bullet agree | l.1958, 1990 |
| NIT-10 (`R20-CLOSER`) | Fixed: `CLOSERPROBE` everywhere | l.1974, 1991, 1994 |
| NIT-11 ("All five") | Fixed: "All four … (armed, JavaScript, block list, Upload folders)" | l.1972 |

## New findings

**NEW-MAJOR-B: the found dock side is read from a window that cannot show it, so the restore can read "equal" and
leave the user's preference changed** (`docs/e2e-test-plan.md:1983`, `:1987`).
- R20-0C reads the side "in the wave's own capture window": undocked = "shows as its own window in the OS window list",
  docked = the Customize menu's Dock side buttons. The capture window is the **service worker's** DevTools. A worker
  inspector has no tab to dock into: it always opens as its own window (Chrome 156 titles it `DevTools`,
  `recipes/CLAUDE.md:142`), whatever the preference. The dock preference governs a **tab's** DevTools: Stage 0 changed
  it and saw tab DevTools follow it (`stage0-m2-D.txt:2` "dock pref undocked … bottom"; `undockedWindowForThisTab` 1
  vs 0).
- Effect: R20-0C reads `side=undock` whatever the user has. DEVT-UNDOCK then sets the preference to undock;
  RESTORE "re-docks to R20-0C's side" = undock, prints `DOCK R20-RESTORE side=undock`, equal, no STOP. A user who had
  `bottom` is left undocked while the record says restored: the restore guard cannot fail (agent-rules §2, the
  "Every live wave leaves the state as it found it" rule of §6).
- The restore text "the capture window opens under the restored preference" is wrong for the same reason.
- **Fix:** read the found side in a **tab** DevTools opened in window X on a fixture page before any dock change
  (undocked = a top-level `DevTools - <fixture host>:<P>/…` window, as the control (a) already reads; docked = no such
  window, with the side from the Dock side buttons by UIA), close it, then print `DOCK R20-0C`. Restore the same way:
  set the side in a tab DevTools in X, close it, reopen it once and read the side back for `DOCK R20-RESTORE`. Drop the
  capture-window clause. `unread` keeps its NOT RUN rule.

**NEW-MINOR-A: the `pre` read's expected line has `sentinel=1`; the page cannot produce it** (l.1967).
- `s12-notea.js` logs two objects holding an Error; the sentinel is only inside the Error's message. A replayed object
  reads as `Object` with no contents (`extension/src/CLAUDE.md`, "Replayed console args carry no `preview`"; this row's
  own allowed leg expects exactly that). So the `notea` page's read has `sentinel=0`. The `allowed` leg's `sentinel=1`
  is right: `s12-noteaok.js` logs the sentinel alone as its second message.
- The pass rule judges only `entries=2`, so nothing is flattered, but the written line will not match on a correct
  build, and it cannot be edited after the run.
- **Fix:** `CON R20-CON-NOTEA pre entries=2 console=2 exception=0 sentinel=0 url=0 stack=0 marker=0`, and say the two
  entries read `Object`.

**NEW-MINOR-C: R20-LOGS would STOP `text-leak` on R20-ARGS-ORDER's own SDK leg** (l.1973).
- The sentinel patterns include "the args sentinel of R20-ARGS-ORDER's table", and that row's SDK leg returns it through
  `tab.evaluate` (and the `asRef` leg's value read). The per-tool allowance names `browser_console_messages`,
  `tab.consoleMessages` and `browser_evaluate` only, so `SCAN20 actors tab.evaluate: … sentinel=<n above 0>` is a STOP on a
  correct build. Fail-safe direction (a false STOP, not a flattered pass), but it would end slice A.
- **Fix:** add `tab.evaluate` (and the ref value read of the same row) to the allowed list, limited to R20-ARGS-ORDER's
  and R20-ARGS-OLD's values.

**NIT-D:** l.1978 keeps the earlier bold sentence "If `flip` answers `TIMEOUT` … the row is RECORD", which the later
rule now qualifies (`self` `BAD_PARAMS` = PASS). Prefix it "unless `self` decides (below)". Also say what an answer
of `flip` other than `BAD_PARAMS`, `TIMEOUT` or `ok files=1` gives (e.g. FAIL with the answer recorded).

## Exit criteria

- R5.1 for the sheet: written before any run, only §4.28 added, doc-check clean for the sheet. Held.
- Every first-round finding closed: yes (MINOR-4's intent addressed, its method wrong: NEW-MAJOR-B).
- No new CRITICAL/MAJOR: **not met** (NEW-MAJOR-B). One more fix round on l.1967, 1973, 1978, 1983, 1987; the
  re-check covers only those.
