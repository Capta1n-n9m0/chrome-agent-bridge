# S6 live verifier r4 — Run 12 (S6) Part 3 addendum (SDK-6/SDK-7 live, pp1)

Fresh level-2 verifier (Claude Opus 5.5), 2026-10-23. Under review (uncommitted at the time): `S6-run-record.md`
"## Part 3 addendum" (attempt 1, "### Attempt 2"), the #101 note at P3-h, `S6-daemon-log.txt`'s addendum span,
the addendum paragraphs in `docs/e2e-test-plan.md` §5 Run 12 (S6), the `S6.ledger.md` lines. No live bridge call,
no Blackboard contact. The export was hashed and sized only. No id, title or Blackboard URL appears below.

**Verdict: PASS-with-notes** (0 MAJOR, 1 MINOR, 3 NIT).

## 1. Order

- `git log`: `1b429bc` 2026-10-23T22:39:50+04:00 (18:39:50Z), `b237a3f` 22:44:04+04:00 (**18:44:04Z**). Attempt 2's
  first set-up line is `time 18:44:26.222Z`. Its first result line (the stale check) is at 18:45:08.850Z, with the
  daemon's `s6-stale-check` client at 18:45:09Z. Attempt 1 ran from 18:40:23Z, after 1b429bc. Order held.
- `git diff b237a3f --stat` touches 4 files: the run record (+310), the daemon log (+22), the ledger (+5) and
  `docs/e2e-test-plan.md` (+32, all in §5 Run 12; nothing in §4.19). `git status --short` lists the same 4 record
  files. No wave-sheet line, row text, rule or recipe changed after b237a3f.
- **B1 before the stale check.** The attempt-2 note (b237a3f) orders `Open-T5Window` → `Set-T5Foreground` → `B1` →
  `<T#> fixture`, *then* the stale check as the first result line. B1 is a set-up check. R-a/P3-a allow "no daemon,
  or one", and P3-c/R-c test only that the builds are equal: `config … build` = `Get-DaemonBuild` = the stale
  check's `connected — daemon build`, all `597d6c28…34da3f`. They do not say which client spawns the daemon. The
  daemon log has `t5-find` + at 18:44:54Z, `extension resync` at 18:45:02Z, then `s6-stale-check` at 18:45:09Z.
  This is **not a deviation**, and the record states it openly.

## 2. Verdicts against the written rules

- **SDK-6 (live) PASS: holds.** Every line of §4.19 SDK-6 (live, pp1) is present and in order: the source line,
  the resolver tab, branch (b) (`HTTP 404, no id` → `confirm by id … HTTP 200, the same id` → `course: pp1
  (resolved; by the skill's course table …)`), `closed <T#r>`, `opened/loaded/evaluated`, `bb.VERSION =
  2026-10-18`, `SDK-6 PASS — …`, `closed T327`, exit 0. Both 8765 checks print `[]`. There is no `REFUSED`, so
  under #101 and the attempt-2 note the login counts as confirmed by the lookup.
- **SDK-7 SDK leg PASS: holds.** The expected lines are all present, with at most one `export running`. `<c>` = 77
  (≥ 1) and `<g>` = 790. `<n>` = 5 = ⌈418406/100000⌉ and `<k>` = 53 = ⌈418406/8000⌉. The `written … sha256` line
  equals the page's.
  - `sha256sum exports/pp1-2026-10-23.json` gives `5a798de75108a9ed7828854ddf563ee87af3d1b3317c04678ec1c6f06d66061f`.
    `wc -c` gives **418459**. Both equal the page's `<H>` and `<b>`, and the record's upper-case Get-FileHash.
- **The cap.** The cap is `MCP_MAX_CHARS = 30 * MCP_CHUNK_CHARS` (240 000) in `recipes/blackboard/export-file.ts:15-19`
  ("S6 fixer r1, 2026-10-23, before any live run"). `git log -S240000` and `-SMCP_MAX_CHARS` both return only
  **23b878f** (2026-10-23T13:12:31Z), the S6 pre-run commit, hours before every live part. §4.19 SDK-7 also
  pre-registers the wording `measurable: <yes | no (over the pre-registered cap of 240000 characters)>`.
  - The recorded `MCP leg size: 418406 characters … measurable: no` follows `mcpLegPlan`: 418406 > 240000.
  - Sheet step 5 and §4.19 then say the MCP leg and S6.3 are "not measured — <L> characters over the cap", so they
    were correctly not run. Steps 6–8 were skipped, actor M was not started and `assemble-mcp.ts` was not run.
- **The plan.** `sdk7-plan.txt` is 4883 bytes and 91 lines (`wc`), as recorded. `_\d+_\d+` count 0 matches the
  record's `course id in plan: False`.
- **`close-bb-tab`.** `closed T329 (the Blackboard recipe's course tab)`, exit 0. The daemon log has the
  `s6-close-bb-tab` client at 18:45:59Z.
- **Step 9.** `git check-ignore -v` gives `.gitignore:30:exports/` for both paths, re-run here with the same output.
  The `-mcp.json` file does not exist (`ls exports/` shows only `pp1-2026-10-23.json`).

## 3. Raw outputs (`%TEMP%\bridge-e2e\s6-run3-addendum2`)

- **Files present:** `http8080.log` (2 lines), `hwnd-Wb.txt` (`7211964`, as recorded), `s6-daemon-addendum2.log`
  (20 lines), `sdk7-plan.txt`, `web.pid` (`33576`, as recorded).
- **Daemon log.** `s6-daemon-addendum2.log` equals the last 20 lines of `S6-daemon-log.txt`; the only difference
  is a UTF-8 BOM on line 1. The last 22 lines of the attached log equal the live `~/.chrome-agent-bridge/daemon.log`
  span from 16:59:46Z to 18:46:59Z: the 2 idle-out lines plus the 20.
  - The client pairs match the record: 4 `t5-find` (the B1s), plus stale-check, boot-bb, export-grades and
    close-bb-tab. Their times bracket each recipe's printed times.
- **Counts on all 5 files: 0 each.** Patterns: `_\d+_\d+`, `://ada`, `ada.blackboard.com/`, `ada.blackboard`, `://`,
  `[line withheld:`, the token.
- **MINOR-1.** The recipes' stdout (stale check, `boot-bb`, `export-grades`, plan exit, `close-bb-tab`) was not saved
  to files, so those recorded lines cannot be matched verbatim against raw output. What I could check:
  - each recipe's daemon-log client span and times are consistent;
  - the plan's size and line count, the export's size and hash, and `hwnd`/`pid` all match.

  The same gap affects the git status line (§5): S6.4's `git status --short` is not in the addendum's record.
  Attempt 1 says "below in the step's report", and attempt 2 has no such line. This repeats r3's MINOR-1. My run
  shows only the 4 record files, so S6.4 holds. Add it by a dated note before the commit.

## 4. Attempt 1's stop; attempt 2's window ruling

- **Attempt 1 followed its written rule.** The 1b429bc note says: "if the handle no longer names a Chrome window
  (`Chrome_WidgetWin_1`) … records that and stops: 'waits for the user'".
  - `GetClassName(15273146)` was empty, recorded as `(no window)`. The driver ran nothing against Chrome and used
    no other window. Only the class was read; titles and URLs were not.
  - Nothing was measured, so attempt 2 is not a re-run of a measured row.
- **Attempt 2's ruling is consistent with #101.** #101's **Decided** says "run live in that session, confirming the
  login first by the recipes' read-only course lookup". The session is the profile's cookies, which survived P3-i's
  restart.
  - The ruling is stricter on privacy: a new driver-opened fixture window. No user window is used, listed by title
    or URL, captured or brought forward, and `bb-login.ps1` is not run. It was written and committed alone
    (b237a3f) before any result.
  - It does not flatter a result already seen. The lookup could still have refused, and the `REFUSED` ⇒ "waits for
    the user" rule was kept.
  - The record identifies `$Wb` by count (3 windows before, `B1` → `T324 fixture`), not by title. At close-down
    `Close-T5Window` gives `True` and the count is back to 3.
- **NIT-1.** The ruling is stage-local, recorded in the ledger and the sheet only. #101's context sentence still
  reads "the user has opened the pp1 course in that window". A one-line pointer in decisions.md (or the session
  agent's relay to the user) would close the loop. No rule needs it.

## 5. Hygiene (counts only)

- **`S6-daemon-log.txt`** (232 lines, as recorded): `://` 0, token 0 (read from `bridge.token` into a variable,
  32 characters, then unset), `[line withheld:` 0, `_\d+_\d+` 0, `ada.blackboard` 0.
- **The uncommitted diff's 373 added lines:**
  - token 0; `_\d+_\d+` **0** (none at all, not even `_1_1`).
  - Ids from `~/.claude/skills/blackboard-ultra/references/ada-instance.md`: the 9 underscore ids and the 12
    backticked digit-bearing values from the table, "Other ids" included. Both give **0** hits. The only cell-word
    hits are the common words `courseId`, `list` and `files`.
  - `ada.blackboard.com/` 0. The 7 `ada.blackboard` hits are the record's own count labels (`` `ada.blackboard` 0 ``).
  - The one `://` is `http://localhost:8080/e2e-playground.html?s6=stale`, the fixture.
- **Git.** `git check-ignore exports/pp1-2026-10-23.json` prints it (`.gitignore:30:exports/`).
  `git status --short`: 0 entries matching `png|exports|dist`. `exports/` and `*/dist/` appear only as ignored (`!!`).
- **Failures folder.** `~/.chrome-agent-bridge/failures` holds no file newer than 18:39Z. The directory itself was
  last changed at 16:57:51Z, before the addendum.
- **NIT-2.** `s6-daemon-addendum2.log` carries a UTF-8 BOM, from PowerShell 5.1's `Out-File`. It is harmless:
  the attached copy has none.
- **NIT-3.** §5's attempt-2 summary says the daemon was "spawned by the driver's B1". That is accurate (`t5-find`
  at 18:44:54Z). The record's "(4 B1s)" counts the close-down `t5-find` at 18:46:00Z as a B1. That call comes after
  `close-bb-tab`, so it is the close-down check rather than a "B1 before a recipe". The wording is loose; no rule
  is involved.

## Findings summary

| # | Severity | Finding |
|---|---|---|
| MINOR-1 | MINOR | The recipes' stdout was not saved under `s6-run3-addendum2`, so the recorded lines cannot be matched verbatim to raw files; checked by daemon-log spans, sizes and hashes instead. The addendum's S6.4 `git status --short` output is missing from the record (repeats r3 MINOR-1): add it by a dated note before the commit (my run shows only the 4 record files). |
| NIT-1 | NIT | Attempt 2's window ruling is stage-local; a pointer beside #101 would close the loop. |
| NIT-2 | NIT | A BOM in the raw daemon-log copy. |
| NIT-3 | NIT | "four B1s" includes the close-down `t5-find`. |

SDK-6 (live) **PASS** and SDK-7 (live) **SDK leg PASS; MCP leg and S6.3 not measured (418406 > 240000, cap
pre-registered in 23b878f)** follow the written rules. Attempt 1's stop is correct by the 1b429bc note.
