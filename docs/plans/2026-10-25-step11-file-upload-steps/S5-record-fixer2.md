# S5-record fixer 2 report: NEW-1, NIT-A, NIT-C

Model: Sonnet 5.5, medium effort. UTC start 2026-10-26T05:39Z, end 05:40Z (`date -u`). Nothing live ran. Nothing committed.

## 1. Verdict
DONE. Lane: `S5-record-verifier.md` (redaction only), the Run 16 section of `docs/e2e-test-plan.md`, this report.

## 2. Fixes
- **NEW-1.** `S5-record-verifier.md:63`: "(the forms <five spelled-out path forms>)" is now "(the five profile-path forms)".
  Line 87: the quoted `git grep` pattern is now `<the profile-path pattern>` and the username in "carries the username as"
  is now `<username>`. The redaction line you specified is appended at the end. No finding, count or verdict text changed.
- **NIT-A.** In the Run 16 section, REC:260 left the "restores read back hash=equal" list (now REC:99, 108, 161, 361, 390)
  and joined the set read-backs: "REC:91, 116 and 260 (UP-0 (B)) are set read-backs". Checked first against
  `S5-run-record.md`: line 259 is the `BOX uploadfolders set (1 ...)` of UP-0 (B), line 260 is `RESTORE uploadfolders lines=1 hash=equal`.
- **NIT-C.** Re-wrapped, words unchanged: the paragraph lines at the old 2773 (to about 120 columns; one join-space
  slip in my first pass was corrected before finishing); the UP-RACE-A row (:2837, now three lines with the row table's
  41-column continuation indent); the UP-LOGS (A) bullet (:2892, two lines with a 2-space indent). Section numstat:
  `141 0` (was 136 plus the four lines these wraps add; 0 removed lines).

## 3. Leak scan, counts only (profile-path forms: Windows backslash, forward-slash, escaped, Git-Bash, and the pattern; username)
| File | profile-path forms | username |
|---|---|---|
| Run 16 section of `docs/e2e-test-plan.md` | 0 | 0 |
| `S5-record-builder.md` | 0 | 0 |
| `S5-record-fixer.md` | 0 | 0 |
| `S5-record-verifier.md` | 0 | 0 |
| `S5-record-verifier2.md` | 0 | 0 |
| this report | 0 | 0 |

## 4. Deviations, proposed decisions, findings
Deviation: edited a verifier's report for the redaction, as the brief permits. Proposed decisions: none. Findings: none.
Not touched: NIT-B, and the over-long "The boxes were edited by ..." line in the section (143 columns, not named by NIT-C).

## 5. Handoff
Rerun the count scan on the four committed slice files plus this report; all must read 0 (they do).
