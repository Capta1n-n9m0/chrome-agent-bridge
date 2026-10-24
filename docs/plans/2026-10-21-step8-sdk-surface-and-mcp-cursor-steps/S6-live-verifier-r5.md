# S6 live verifier r5 — SDK-7 MCP leg and S6.3 (#102)

Fresh level-2 verifier, 2026-10-23. Scope: the uncommitted `S6-run-record.md` § "MCP leg and S6.3 (#102; …)", the
`S6-daemon-log.txt` span, and the e2e §5 summary lines, against §4.19 SDK-7 with its #102 note, the wave sheet's
P-SDK7-M, "SDK-6/SDK-7 live" steps 3–11, and its "SDK-7 MCP-leg re-run, #102" note (7c16a00). No live calls, no edits
outside this file, no commits. The exports and M's transcript were read by script only: counts, lengths and hashes
were printed, never content. Helper scripts are outside the repo, in the session scratchpad (`vchk.mjs`, `vspan.mjs`,
`vcanon.mjs`).

**Verdict of the record: PASS-with-notes** (0 MAJOR, 1 MINOR, 2 NIT). The row verdicts (SDK leg PASS, MCP leg FAIL,
S6.3 FAIL) are the right ones under the written rule.

## 1. Order and rule freeze

- `git log -3`: `7c16a00 2026-10-23T23:01:34+04:00` (= 19:01:34Z). The leg's first line is `time 19:04:00.643Z`
  (set-up). The first result line is the stale check at 19:04:39Z, after `B1` (19:04:26Z), as the re-run note says.
  `STALE-CHECK NEW BUILD`, exit 0.
- `git log 7c16a00..HEAD` → 0 commits. `git diff 7c16a00 --name-only` lists only the four files under review. The
  e2e diff is one hunk that adds lines in §5 (at line 1989): no row text, rule, recipe or wave-sheet line changed.
  The daemon-log diff has 24 `+` lines and 0 `-` lines (append only).

## 2. Verdicts recomputed (numbers only)

Rehashed with Node's sha256 over the files on disk, and the transcript `actors\M\out.jsonl` parsed independently.
`assemble-mcp.ts` was **not** re-run: it writes only `exports/<course>-<date>-mcp.json` (no output-path option) and
would refuse, or with `--overwrite` replace, the run's file. The transcript was reassembled in memory instead.

| Item | Measured | Record | Match |
|---|---|---|---|
| SDK file `pp1-2026-10-23.json` | 418 614 bytes, 418 561 chars, `08169d21…a190b` | page sha256 `08169d21…a190b`, 418614 B, L 418561 | yes (file = page) |
| `sdk-leg.out` | sha256 twice `08169d21…`, `measurable: yes`, `pulled 5`, PASS | same | yes |
| Plan | START 82 lines, 3839 chars, sha256 `93978701…2cb30de6`; STATUS 188 chars; CHUNK template reproduces line 2: true | same | yes |
| M tool calls | ToolSearch 1, `browser_select_tab` 1 (`{"tab":"T391"}`, output exact), `browser_evaluate` 55 | 3 + 1 + 53 | yes |
| START | expression = plan byte for byte; result keys `state,key`, `running`, `mcp-pp1` | same | yes |
| STATUS | 1 send, exact; `done`, length 418589, bytes 418642, sha256 `bb4d7a08…c9395`, columns 77, grades 791 | same | yes |
| CHUNKs | 53, each = template at its start, contiguous 0…416000, 0 errors, 0 newlines, 52 × 8000 + 1 × 2589 | same | yes |
| Reassembled | 418 589 chars, 418 642 bytes, `bb4d7a08…c9395`; byte-identical to `pp1-2026-10-23-mcp.json` | `= the page's: yes` | yes |
| MCP file | 418 642 bytes, `bb4d7a08…c9395` = MCP STATUS sha256 | same | yes |
| S6.3 | `08169d21…` ≠ `bb4d7a08…` | `equal: no` | yes |

By §4.19 SDK-7: the MCP leg's STATUS must carry "the SDK leg's values", and "two different hashes" is a FAIL. So
**MCP leg FAIL** and **S6.3 FAIL** are the rule's verdicts, and the **SDK leg PASS** stands on its own clauses. The MCP
transport is shown whole: the MCP file hash equals the MCP leg's own STATUS sha256, and the SDK file hash equals its
page sha256. 418 561 ≤ 600 000 ⇒ `measurable: yes` is right for the observed `<L>`. The re-run note writes 418 406
"if pp1's export is unchanged", and the record has it as observed.

## 3. The driver's set-up actions

**(a) Renaming attempt 2's export: acceptable.** The renamed file is the driver's own output from attempt 2. It still
exists as `exports\pp1-2026-10-23.attempt2.json`, 418 459 bytes, sha256 `5a798de7…6061f`. That equals attempt 2's
recorded hash, which the committed record (HEAD) carries 3 times. `git check-ignore -v` → `.gitignore:30:exports/`.
Nothing was deleted or overwritten, and the registered command ran unchanged. The other route, `--overwrite`, would
have destroyed attempt 2's evidence. The re-run note did not foresee the same-date name clash; see NIT-2.

**(b) Attempt 1: a set-up re-run that measured nothing, not a P-SDK7-M "rerun once" and not a deviation.**
- `send-m1.attempt1.out` holds 31 bytes, `The command line is too long.`. `loop.log`: `send m1 exit 1 bytes 31`, then
  `STOP after m1`.
- `actors\M-attempt1` has no `in.txt`. Its `out.jsonl` has 2 lines, both of type `system`, subtypes `hook_started`
  and `hook_response`, with no assistant, tool_use or tool_result.
- No transcript `d010d4e2*` exists under `~/.claude/projects/…`. The daemon log shows a `claude-code` client from
  19:06:42Z to 19:06:51Z with no other activity.

Nothing reached the actor, and no START ran, so no in-page export was made for it. The prompts, cap, chunk size,
actor tools and rule were the same in attempt 2. Only the driver's launcher changed (`npx.exe` → `node --import tsx`).
That is the wave sheet's "fix the set-up and run it again, recording both". P-SDK7-M's "rerun once in a fresh actor"
is for a copy error by the actor, which did not occur here. NIT-1 covers how the record states this.

**(c) The count-only comparison: no content leaked.** The added text has positions, counts, sizes, hashes,
anonymous `field#0…#4` and `array#1` labels, handles and the label `pp1`. It has no key names, values, titles,
names or ids. I re-derived its counts: SDK vs MCP, 5/5 keys, `array#1` 77/77, 3 only-first and 3 only-second, all
other fields equal. Attempt 2 vs SDK: 4/4, other fields equal. Discriminating extra check (counts only): the
differing entries survive order-normalisation (object keys and arrays sorted), 3/3 and 4/4. So the difference is in
values, not in the order of items. The "live grading" explanation fits that, but it is not established: the values
could also be fields Blackboard derives at each read. The record's Finding paragraph says so ("an inference from
counts, not established"). Two other places do not; see MINOR-1.

## 4. Hygiene (counts only)

- `S6-daemon-log.txt` (256 lines): `://` 0; token (32 characters, read from `bridge.token` into a variable) 0;
  `[line withheld:` 0; `_\d+_\d+` 0; `ada.blackboard` 0. The span is 24 lines: 2 lines of the old daemon's idle exit,
  then start/config/listening, `extension resync: 4 tabs, 0 gone`, and 9 client pairs (4 × `t5-find`,
  `s6-stale-check`, `export-grades`, 2 × `claude-code`, `s6-close-bb-tab`). That matches the record.
- Uncommitted diff: token 0. `_\d+_\d+` on added lines 0 (not even `_1_1`). The blackboard-ultra course-table ids
  (every backticked value in `ada-instance.md` "Instance and user" and "Courses", including the "Other ids" line,
  `pp1` excluded) hit 0 times in the diff and 0 in the log. The only `ada.blackboard` strings on added lines are the
  three count labels (`ada.blackboard 0`, `ada.blackboard in plan (count): 0`).
- `git status --short --untracked-files=all`: 0 entries matching exports, `.png` or `dist/`. `git ls-files exports`
  → 0. `git check-ignore -v` ignores all three exports files (`.gitignore:30:exports/`).

## Findings

- **MINOR-1: in two places the hypothesis is stated as fact.** The record's "Outcome in one paragraph" says "pp1's
  gradebook was changing between the reads". The e2e §5 addendum says "The finding is that pp1's gradebook changed
  between the reads", and its summary line says "finding: the course's gradebook changed between the reads". The
  record's own S6.3 section and Finding call it an inference, not established. Suggested: "fits pp1's gradebook
  changing between the reads (inferred from counts; not established)" in both places. The verdicts are not affected.
- **NIT-1: the record does not name the clause that allows re-running attempt 1.** The send exited 1, and the wave
  sheet says "Exit `1` is a result". That exit was the driver's helper failing before any prompt reached the actor,
  not a row command's result. The record argues this correctly ("measured nothing", not one of the stop cases) but
  cites no clause. One line citing "Re-runs: fix the set-up and run it again, recording both" would close it.
- **NIT-2: the export rename was not pre-registered.** The re-run note did not foresee the same-date clash with
  attempt 2's file. The rename is disclosed and the file is kept, so nothing is lost. A future same-day re-run note
  should state it.
