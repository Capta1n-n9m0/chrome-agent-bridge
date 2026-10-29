# S5-sheet fixer, round 2

All four findings fixed in `docs/e2e-test-plan.md` §4.28 only (l.1967, 1973, 1978, 1983, 1987).
- NEW-MAJOR-B: R20-0C now reads the found dock side in a tab's DevTools in window X on a fixture page (window list: top-level `DevTools - <fixture host>:<P>/...` = undocked; else the pressed Dock side button by UIA; neither = `unread`, which keeps the NOT RUN rule). The capture-window clause is dropped, with the reason (a worker inspector always opens as its own window). R20-RESTORE sets the side in a tab DevTools, closes it, reopens once and prints the read-back, so it can read "different" and STOP `not-restored`.
- NEW-MINOR-A: the `pre` line is `sentinel=0`, with the reason and that both entries read `Object`.
- NEW-MINOR-C: R20-LOGS allows `tab.evaluate` (and the `asRef` value read), only for R20-ARGS-ORDER and R20-ARGS-OLD values.
- NIT-D: "Unless `self` decides" prefix; any other `flip` answer is a FAIL with the answer recorded.
- `git diff --stat`: `1 file changed, 58 insertions(+)` (numstat 58 0); §4.28 is 57 lines. doc-check: only the known `CLAUDE.md:110` flag.
