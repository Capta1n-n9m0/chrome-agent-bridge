# S5-liveC20 verifier 1: the liveC20 record, attempt 1

Verifier: Claude Opus 5.5, effort medium. Read-only. HEAD `777400d`. I wrote only this file.

## 1. Verdict

**PASS-with-notes.** The record is complete under §4.28's own rules and #413-#416. Every one of the 8 row verdicts
re-derives to the verdict printed. The record shows no failed exit check for slice C: R5.2, R5.4, R5.5 and R5.6 are met,
and R5.3 holds row by row. Nothing I found is CRITICAL or MAJOR. Three MINOR findings and two NITs follow. #413's
Revisit-if is **met in substance** (§4). That is an agent-rules §3 item 8 escalation, and the step agent has already
raised it (ledger line 19). It is not a reason to keep the record out of the repo.

## 2. Outputs (what I checked, with commands)

- Record `…-steps/S13-live-record-liveC20.txt`: 97 lines, UTF-8, no CR, and every `—` intact (`file`, `grep -c $'\r'` = 0).
- Raw sink `$TEMP/bridge-e2e/s20-liveC/a1/rows20-liveC20.txt`, compared with the record after stripping the
  timestamps: they are identical except for the record's last line, `CHECK rows20 rows=8 warns=0 stop-return=0`, which
  the aggregator appends.
- The runner's stdout `$TEMP/bridge-e2e/s20-liveC-a1-stdout.txt` (221 lines) and `s20-liveC-a1.exit` = `0`. Teardown
  `s20-liveC-a1-td.txt` closed windows 12913148 (the capture), 7998590, 3539780 (rd-restore's options window) and
  28443480 (window X) at 02:52:32-33Z, and printed `CHECK clean PASS`.
- `git rev-parse HEAD | cut -c1-12` → `777400df57e3` (equals the record's `HEAD 777400df57e3 tree=clean`).
  `git merge-base --is-ancestor b3cbe84 HEAD` → true (equals `S4 commit=ancestor`).
- ROW count by id (`grep -o -E '(^|: )ROW R20-[A-Z0-9-]+( dock)?' | sort | uniq -c`) gave one each for R20-0C, -DEVT-UNDOCK,
  -DEVT-EARLY, -UP-DEVT, -KEEP-4, -SWEEP-HELD, -RESTORE and -LOGS, plus the leg note `ROW R20-RESTORE dock` (not a row:
  #416 note, `recipes/s13-r20.ts:146`). That makes 8 ids, matching `CHECK rows20 rows=8`.
- STOP/RETURN lines in the record: 0 (`grep -n -E 'STOP|RETURN'`). The ledger holds none either.

## 3. The rows

| Row | Printed | Re-derived | Basis |
|---|---|---|---|
| R20-0C | PASS | PASS | Record l.4 `MANIFEST …`. l.5 is exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`. Then `RULES 0` (l.7), `STATE armed=true evaluate=true …` (l.9), `TOGGLE reading on` (l.10), `FOUNDLIST blocks-fixtures=no` (l.14), the RD-0 (a)(c)(d) and R17B-0 (e)(f) PASS lines (l.6, 13, 15, 19), `HEAD 777400df57e3 tree=clean` (l.20) and `S4 commit=ancestor` (l.21), all re-checked against git above. No `perm=no`, `keys=sorted` or `enabled=no`. This satisfies R5.2. |
| R20-DEVT-UNDOCK | NOT RUN | NOT RUN | `DOCK R20-0C side=unread` (l.29). §4.28 l.1989 says an unread side makes these five rows print `ROW <id> NOT RUN — dock side unreadable, it could not be restored`. l.30-34 match that character for character (`gateDock`/`devtRowGate`, `recipes/s13-r20-c.ts:212`, `recipes/s13-forms.ts:165`). |
| R20-DEVT-EARLY | NOT RUN | NOT RUN | Same as R20-DEVT-UNDOCK. |
| R20-UP-DEVT | NOT RUN | NOT RUN | Same. The unread-side reason, not "no DevTools condition refused", is correct: gate-cond never ran because `Test-R20CCond` returns false when `R20CGate` ≠ `run` (`s13-r20-c-defs.ps1:98`). |
| R20-KEEP-4 | NOT RUN | NOT RUN | Same. |
| R20-SWEEP-HELD | NOT RUN | NOT RUN | Same. No reload ran, so there is no `LOADED20 rerun` line, as expected. |
| R20-RESTORE | NOT MEASURED | NOT MEASURED | Safety state: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (l.76), `CHECK UP-RESTORE stored PASS` and `daemon PASS` (l.77-78), `RULES 0` (l.84), `RESTORECHECK stored=equal differs-by=none` (l.86). Dock clause: #416's exact three lines (l.42-44), `found-side=unread read-back=unread`. `DIALOGS C native=0 devtools=0` (l.87). `wave-windows-open=1` departs from the sheet's 0 (finding F1). It does not change NOT MEASURED. Row line l.88. |
| R20-LOGS | PASS | PASS | `SCAN20 console/daemon/evidence: name=0 sentinel=0 token=0` (l.92-94). The control line is present: `control-disarmed-last=3` (l.91; I re-counted 3 `safety: disarmed by the user` lines in `console-liveC20-all.txt`). `CAPSEG liveC20 seg=1 saved=yes` (l.89). No actors file (l.95) is right, because no actor row ran. |

`FLAG debugging-flag=no` (l.35) is a RECORD line, printed once and after the DOCK and NOT RUN lines, as #415 (1) orders it.

**R20-RESTORE dock clause and `$global:R20CDockChanged`.** I traced the flag in `recipes/s13-r20-c-defs.ps1` and found
four places that set it:
- `Open-R20CDevt` with a side (l.34) runs only inside the DEVT and conditional handlers. Their blocks are gated by
  `R20CGate -eq 'run'` (l.189-190) or `Test-R20CCond` (l.191-193, false unless the gate is `run`).
- KEEP-4's `-Pre` (l.120) is behind the same gate.
- `Restore-R20CDock` sets it only when `$r20found -ne 'unread'` (l.171).
- R20-0C's own open (l.70) calls `Open-S13DevTools` with no side, so `Set-S13DockSide` never runs.

With `side=unread`, `gate-dock` exits 3 and the gate becomes `notrun` (l.74). stdout l.145-154 shows each DEVT and
conditional block starting and finishing within 2-4 ms, with no actor run. So no call that can change the dock ran, and
`--changed no` is what produced #416's NOT MEASURED lines (`dockRestoreVerdict`, `recipes/s13-forms.ts:168`;
`lineCmd20`, `recipes/s13-r20.ts:153-154`). The NOT MEASURED form is correct.

**R5.6:** no STOP and no RETURN in the record or the ledger, and `CHECK rows20 … stop-return=0`. Met.

**R5.4:** all four items are equal by count and hash. The only hash value printed is the sha256 of the empty string
(both lists have 0 lines). Met.

**R5.5:** the three SCAN20 streams read 0/0/0. My own re-scan (item 5 below) agrees. Met.

## 4. The dock read and #413

- **What the raw output shows.** Both opens reached the menu: `CHECK devtools-menu step=menu-button|more-tools|developer-tools found=yes`,
  then `CHECK devtools-ui method=uia-menu found=pane` (stdout l.130-133 and l.157-160). So DevTools opened **docked**,
  in X, and no DevTools window existed.
- **How the helper got to `unread`.** `Read-S13DockSide` (`recipes/s13-devt.ps1:126-136`) counted 0 fixture-titled
  windows. Then `Test-S13Pane` found the pane, which is the same UIA check that later made `Close-S13DevTools` press
  F12. The read then went to `Open-S13Customize`. From there it reads `unread` in only three cases:
  - the `Customize and control DevTools*` button was not found exactly once, or did not invoke (l.114-116);
  - the four Dock side items were not each found once by name (l.34);
  - their pressed state was unreadable, or not exactly one was pressed (l.35-37).

  Every one of those is "unread unless exactly one … reads pressed", #413's own rule. The helper produced `unread`
  correctly by its stated rule. It did not guess.
- **Was anything left open?**
  - **At R20-0C, no.** `Invoke-R20CGuarded` (l.57-59) ran `Close-S13DevTools`, which pressed F12 (record l.28,
    `KEY F12 pressed into window 28443480`), and would have printed STOP `devtools-left-open` had `remaining` (windows
    plus pane) been above 0. No STOP was printed.
  - **At R20-RESTORE, not proven at the time.** The read-back open was closed by F12 (l.41), but `Restore-R20CDock`
    discards the close's `remaining` (F2). The slice-end `devtools=0` counts titled windows only, so a docked pane in X
    would not show there.
  - **After the wave, no.** Window X itself was closed by teardown at 02:52:32.929Z, about 44 s later, so no pane can
    remain. `DIALOGS C devtools=0` and the runner's after-state (0 DevTools-titled windows) rule out an undocked window.
- **#413's Revisit-if** ("liveC20 shows the DevTools UIA names differ"): **met in substance.** The pane was present and
  UIA-visible, yet the dock side read `unread` twice on the user's Chrome. That is exactly the case the trigger's
  parenthesis anticipates ("a mismatch reads `unread`, so the rows are NOT RUN"). The record cannot say which UIA read
  failed: the button's name, the item names, or the pressed-state pattern (F3). So "names differ" is the likely cause,
  not a proven one. #416's Revisit-if ("liveC20 reads the side") is not met. I propose no fix.

## 5. Independent scans (counts only)

I read the token from `bridge.token`, and the user's name from `git config user.name` and the Windows user folder name,
into variables and never printed them.
- **Repo files.** The record, `S5-liveC20-runner-att1.md` and `S5-liveC20.ledger.md` gave token=0 and the user's
  name=0 (full name, each part, and the folder name). Each also had home path=0 (the Windows users folder, in both slash forms) and 0 URLs of
  any scheme.
- **Raw out dir.** All 9 `.txt`, 2 `.json` and `logs/p8081.txt` gave token=0, full name=0 and folder name=0.
  - **One** hit for the first part of the user's name, in `console-liveC20-1.txt` line 1. It is the capture window's
    title line (`DevTools - <profile>`, the recipes gotcha of #283). The driver drops it from the scanned
    `console-liveC20-all.txt` (`CONSOLE window-title lines dropped=3`, record l.90), where my count is 0.
  - That raw file is outside the repo and must never be committed (N2).
- **Runner stdout and teardown files.** token=0, name=0, path=0. The reload line shows the extension path as
  `<PROFILE>\…`, already redacted.

## 6. Public-repo hygiene of the evidence to be committed

The record, the runner report and the ledger together contain:
- 0 home paths;
- 0 occurrences of the user's name;
- 0 `DevTools - <profile>` title lines (the runner report's single `DevTools - ` hit is its own hygiene sentence quoting
  the pattern, l.54, not a title);
- 0 URLs (the record names no host, only `own-page`/`fixture`/`about-blank` classes).

The STATE lines print the empty-string sha256 (N1). Clean.

## 7. Findings

**F1, MINOR. `DIALOGS C … wave-windows-open=1` against the sheet's `wave-windows-open=0`** (record l.87; §4.28 l.1978
and l.1993; S5-drivers-C4.md §7 predicted 0 for B).
- **What it counts.** `Write-R20CDialogs` counts `$global:R19Xk` and `$global:O` (`recipes/s13-r20-c-defs.ps1:160`).
  `rd-restore` opens a fresh options window, 3539780 (record l.46), which stays `O` until teardown closes it (td file,
  02:52:32.714Z). It is neither a dialog nor DevTools, so neither STOP applies.
- **History.** It is the same reading as liveA20 (judged PASS with a note, `S5-liveA20.md` §findings 2), liveB20
  (`S13-live-record-liveB20.txt` l.275) and all four Run 19 slices.
- **Effect on the verdict.** By the literal pass rule ("`DIALOGS` all 0"), R20-RESTORE could not pass even with a read
  side. Here it changes nothing (NOT MEASURED either way).
- **Fix:** none in this record. The session agent should fold it into the one ruling the A and B notes already ask for
  (count the options window after closing it, or a dated note that `wave-windows-open` counts the restore's own options
  window).

**F2, MINOR. The R20-RESTORE DevTools closes are not checked for a pane left open** (`recipes/s13-r20-c-defs.ps1:171-172`:
`finally { [void](Close-S13DevTools …) }`).
- **Why nothing else catches it.** The slice-end `Get-R20CDevtCount` (l.156) counts titled windows only. A docked pane
  in X left open by the read-back would print `devtools=0` and no STOP. The sheet's STOP `devtools-left-open` and §8's
  "a DevTools window or pane is still open" both cover a pane.
- **In this run.** The pane was UIA-visible, F12 was pressed (l.41), and the same mechanism was proven closed under the
  guard at R20-0C. X was closed at teardown, so nothing remains, but for those ~44 s it is not proven by a line.
- **Fix (a later stage, not this record):** check `remaining` after each close in `Restore-R20CDock` and STOP
  `devtools-left-open` on a value above 0, as `Invoke-R20CGuarded` does.

**F3, MINOR. The dock read prints no line saying which UIA step gave `unread`** (`recipes/s13-devt.ps1:126-136`,
`Open-S13Customize` l.111-122).
- `found=pane` followed by `side=unread` cannot tell a missing or renamed Customize button from unmatched Dock side
  names or an unreadable pressed state. So #413's Revisit-if can be answered only in substance, not by cause.
- **Fix (a later stage, for the user's ruling on #413):** a fixed-word diagnostic such as
  `CHECK dock-read customize=<0|1|n> items=<n> pressed-readable=<n>` (counts only, no names printed).

**N1, NIT.** STATE lines print `sha256=` of the empty string (record l.9, l.66, l.71), while §4.28 l.1978 says "hashes
not printed". The value is the well-known hash of empty input and reveals nothing (lines=0). The form is carried from
Run 17 and is the same in A and B. No action.

**N2, NIT.** Helper-stamped `s9-win` lines (PARK, CONSOLE) come before `MANIFEST` (record l.1-3), so the first
record-form line is MANIFEST and the second LOADED20, as in A and B. Separately, the raw
`$TEMP/bridge-e2e/s20-liveC/a1/console-liveC20-1.txt` holds the capture's profile title line (§5). It is outside the repo
and must never be added to a commit.

**Item 7, `CHECK gate-dock` absent.** This is correct. `gateDock` prints `CHECK gate-dock side-readable=yes` only when
the side is read. Otherwise it prints the five NOT RUN lines instead (`recipes/s13-r20-c.ts:212-215`), exactly as
S5-drivers-C.md §8 says ("If the side is unread, the five `ROW … NOT RUN …` lines come here instead"). The other lines §8
promises for an unread side are all present: `DOCK`, the five NOT RUN lines, `FLAG`, #416's three restore lines (per
S5-drivers-C4.md §7), the SCAN20 lines and `CHECK rows20`. The `CTRL20`/`DEVT20`/`gate-cond` lines are rightly absent.

## 8. Deviations, proposed decisions

None. I followed §4.28 with #413-#416 over the drivers' how-to (agent-rules §4 precedence).

## 9. Handoff

Nothing was started. No process, port or Chrome window was touched. The record is fit to commit with the runner
report, the ledger and this report. Do not commit the raw out dir. For the user: #413's Revisit-if (§4), and the F1
ruling, which is now carried across all three slices.
