# S5-sheet verifier, round 3 (after fix round 2)

Verifier: Claude Opus 5.5, medium. Read and run only; nothing edited but this report. Scope: round 2's NEW-MAJOR-B,
NEW-MINOR-A, NEW-MINOR-C, NIT-D and the fixer's edits at `docs/e2e-test-plan.md` l.1967, 1973, 1978, 1983, 1987, plus
the rows that mention the capture window or the dock side (l.1946, 1948, 1952, 1959, 1972, 1984, 1985).

## Verdict: PASS-with-notes (all four round-2 findings fixed; no new CRITICAL/MAJOR/MINOR; 3 NITs)

## Checks re-run

| Check | Result |
|---|---|
| `git diff --stat docs/e2e-test-plan.md` | `1 file changed, 58 insertions(+)`; `--numstat` `58 0`; one hunk `@@ -1935,6 +1935,64 @@`: only §4.28 added, nothing deleted |
| `node scripts/doc-check.mjs` | `tools: 25 · router methods: 28 · codes: 27`; only flag the known pre-existing `CLAUDE.md:110  5596 passed`; `Checked 38 living docs` |

## Round-2 findings

| Finding | State | Evidence |
|---|---|---|
| NEW-MAJOR-B (dock side read in the worker inspector) | **Fixed.** | l.1983 now reads the side in a tab's DevTools on a fixture page in the wave's window X, drops the capture window with the reason, and closes the pane. Undocked = a top-level `DevTools - <fixture host>:<P>/…` window, which is the signal Stage 0 measured (`stage0-m2-D.txt`: `undockedWindowForThisTab` 1 with pref undocked, 0 with `bottom`). l.1987 sets the side, closes, **reopens once and prints the read-back**. The check can fail: found `bottom`, restore did not take → the reopened pane is a top-level window → `side=undock` ≠ `bottom` → STOP `not-restored`. Found `undock`, left docked → no window → a docked side ≠ `undock` → STOP. A UIA failure on the Dock side buttons gives `unread` at 0C (the DEVT rows NOT RUN, so the preference is never changed) or at restore (STOP), both fail-safe. Executable under G13 (l.1948): fixture page, window the wave opened, closed by the wave; the opener is the Run 19 app-menu UIA opener (`recipes/CLAUDE.md:177`) |
| NEW-MINOR-A (`pre` line `sentinel=1`) | **Fixed.** | l.1967 `pre … sentinel=0`, with the reason and "both entries read `Object`". Matches `test-fixtures/s12-notea.js:6-7` (two objects, the sentinel only inside an Error's message) |
| NEW-MINOR-C (R20-LOGS false STOP on `tab.evaluate`) | **Fixed, widened only as needed.** | l.1973 adds `tab.evaluate` (with the `asRef` value read) and limits it and `browser_evaluate` to the values of R20-ARGS-ORDER and R20-ARGS-OLD, the only rows that send an `args` value back (ARGS-3 is JS off, refused). `browser_evaluate` was narrowed, not widened. `sentinel=0` stays the rule for every other tool |
| NIT-D (REFUSE-DIS wording) | **Fixed.** | l.1978 "Unless `self` decides (below), if `flip` answers `TIMEOUT` …"; any other `flip` answer is a FAIL with the answer recorded verbatim |

## Consistency of the other rows with the new dock-side read

- l.1946 (STOP: a DevTools window left open, the capture the one exception), l.1948 (DevTools only in a wave window on a
  fixture page, closed by the wave), l.1959 (the capture evaluates the permission and listener), l.1972 and l.1987
  (the capture closed last), l.1984-1985 (DEVT-UNDOCK and DEVT-EARLY change the side in X): consistent. The 0C verdict
  cell (l.1983, "before any DevTools window opens other than the capture and this tab-DevTools read") matches.

## Notes (NIT, none blocks)

- **NIT-E** `docs/e2e-test-plan.md:1952` form (13): "read in the wave's own DevTools window, below" was not updated. A
  docked read has no window, and "the wave's own DevTools" is how l.1959 names the capture. Suggested: "read in a tab's
  DevTools in window X (R20-0C, R20-RESTORE)".
- **NIT-F** l.1987: "in a tab's DevTools in window X, which is closed" can be read as window X closed; and the reopened
  read-back pane is closed only by "every DevTools window closed", which a UIA window count does not see when the
  restored side is docked (X's own close at `wave-windows-open=0` covers it). Suggested: "…in window X; that DevTools is
  closed; … read back, then closed".
- **NIT-G** l.1973: the `SCAN20 actors <tool>` line has no row field, so "only for the values of R20-ARGS-ORDER and
  R20-ARGS-OLD" needs the helper to count per row from its own tool-result log. S5-helpers should state it (the count
  above 0 attributed to those rows' calls, every other row's results counted as 0).

## Exit criteria

- R5.1 for the sheet: held (written before any run, only §4.28 added, doc-check clean but the known flag).
- Every round-2 finding closed: yes.
- No new CRITICAL/MAJOR: met.
