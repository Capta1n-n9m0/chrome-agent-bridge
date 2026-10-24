# S6 verifier r5 (pre-run) — commit 75f0bd6, decision #103 (S6.3 on one held export)

Written 2026-10-23 by the pre-run verifier (level 2, Claude Opus 5.5). Read: `CLAUDE.md`, `briefs/common.md`,
decisions.md #103, `git show 75f0bd6` in full, `S6-builder-r5.md`, `recipes/blackboard/*.ts` at HEAD. No live
bridge call, no Blackboard contact, no edit in the main tree but this file, no commit. Checks ran in a clean
worktree at 75f0bd6 (`<scratchpad>/s6r5-verify`, `npm ci`), which has since been removed (`git worktree list` →
the main tree only).

**Verdict: PASS-with-notes.** No MAJOR findings. Two MINOR, three NIT.

## 1. Read-only by construction — holds

- `readonly.ts` (diff: 2 lines): only the `exportKey` leg union gains `"held"` (`readonly.ts:71`). It still
  validates the label with `COURSE_LABEL_RE`. `READ_ALLOWLIST`, `READ_FUNCTIONS`, `PATH_RE`,
  `PAGE_EXPORT_SRC`, `courseGetExpression` and `LOOKUP_PATH_RE` are unchanged. No new method, path, non-GET
  call or origin.
- `guard.ts`: only flags. `--hold` is a boolean; `--drop-held` must match `^T\d+$` (`guard.ts:237`).
  `checkHoldFlags` is new (`guard.ts:259-263`). No new network surface.
- `held.ts` uses only the existing `startExpression`, `statusExpression`, `chunkExpression` and
  `exportKey`. It adds no page code.
- The drop runs `dropExpression(key)`, which is `(delete (window.__bridgeExport || {})["held-pp1"], "dropped")`
  (`readonly.ts:268-270`). That deletes the recipe's own page-memory key and makes no request. Before it,
  `dropHeld` calls `listTabs` (the bridge, not Blackboard), then `checkHeldTab` (live: unheld and
  `isAdaCoursePage`, `held.ts:85-94`), then `claim`. It then runs the existing STATUS, the drop, and STATUS
  again (`export-grades.ts:78-95`), with `failureReports: false`. On a wrong tab, the first STATUS is `null`,
  so `heldFoundLine` throws before any delete runs (`held.ts:72`).
- Page code is still literal strings. Every new printed line carries only the key, the handle, counts and the
  sha256 (`held.ts:54,58,74,81`; `export-grades.ts:91`). `checkHeldTab`'s messages carry no URL; a test pins
  this (`blackboard-held.test.ts`, "its messages carry no URL").
- Bad flag combinations are refused before any connection. Run in the worktree (no bridge contact):
  ```
  export-grades.ts pp1 --drop-held T5 --hold → REFUSED — --drop-held runs alone: … ; exit 2
  export-grades.ts pp1 --drop-held 5        → REFUSED — --drop-held needs the tab handle the SDK leg printed (T<n>); exit 2
  ```

## 2. #103's design — holds

- **Exactly one START, in the SDK leg.** `export-grades.ts:140-142` runs START under `heldKey` when `--hold`
  is passed. `:159` skips the drop in hold mode. `:166-169` prints the held lines and keeps the tab open. No
  other code path in the diff runs a START.
- **The `--mcp-plan --hold` plan has no START and reads the same key** (`held.ts:28-33`, `:46-48`).
  Measured on the worktree's plan for `pp1 --mcp-plan --hold`:
  ```
  lines 8; ^START: 0; _\d+_\d+ 0; "held-pp1" 3; bridgeGradesExport 0
  ```
- **assemble `--held`** reads the transcript on `held-<course>` (`assemble-mcp.ts:40`) and calls
  `verifyTransfer(text, r.status)` against the STATUS length, bytes and sha256 in the transcript
  (`assemble-mcp.ts:47`). See MINOR-1 for how 0 bad results is enforced.
- **The drop runs after both reads and checks that the export is gone.** Sheet step (10) comes after (8) and
  (9). `droppedLine` throws unless the drop answered `"dropped"` and STATUS afterwards is `null`
  (`held.ts:79-82`).
- **The old modes are byte-identical.** I ran `--mcp-plan` from HEAD's `recipes/blackboard` and from
  75f0bd6^'s files (copied into the worktree) under tsx, offline:
  ```
  _1_1 identical (90 lines, 4664 bytes)
  pp1 identical (91 lines, 4789 bytes)
  ```
  The non-hold SDK leg is unchanged apart from the `args.hold ?` branches at `:140`, `:159` and `:166`.

## 3. Tests — counts as expected; discriminating apart from the glue

- Worktree at 75f0bd6, after `npm ci`:
  - `npm test`: **85 files, 1714 passed** (1697 + 17, as expected).
  - `npm run typecheck`: exit 0.
  - `npx vitest run recipes/`: **5 files, 169 passed**.
- Mutations, one at a time in the worktree, each followed by `npx vitest run recipes/` and a restore:

  | # | Mutation | Result |
  |---|---|---|
  | M1 | START emitted in the hold-mode plan | **2 failed** |
  | M2 | `heldKey` returns the `mcp-` key | **4 failed** |
  | M3 | `droppedLine` accepts a non-null STATUS after the drop | **1 failed** |
  | M4 | `checkHoldFlags` lets `--hold` through with `--drop-held` | **1 failed** |
  | M5 | `checkHeldTab` ignores the owner | **1 failed** |
  | M6 | `checkHeldTab` ignores the ada origin | **1 failed** |
  | M9 | `heldFoundLine` accepts `null` | **1 failed** |
  | M7 | the SDK leg drops in hold mode (`export-grades.ts:159`) | 169 passed — **not caught** |
  | M8 | assemble `--held` reads the `mcp-` key (`assemble-mcp.ts:40`) | 169 passed — **not caught** |

  See MINOR-2.

## 4. §4.19 #103 note and wave-sheet steps (1)–(11) — complete and executable

The sheet's note covers every item in the brief:
- (1): a fresh `S6_OUT`; the stale check as the first result line; no `bb-login.ps1`.
- (3): the login is confirmed by the lookup's resolution lines; a `REFUSED` means "waits for the user".
- (2): **both** `pp1-<date>.json` and `pp1-<date>-mcp.json` are renamed aside, never deleted. Their size and
  hash are recorded first, and `check-ignore` runs after. Both files exist today
  (`ls exports/` → `pp1-2026-10-23.json`, `pp1-2026-10-23-mcp.json`), so this step is needed.
- (6): a fresh M started with `node --import tsx recipes/t5-actor.ts start M --tools
  'browser_select_tab,browser_evaluate'`. `t5-actor.ts:8,124-126` accept that. The `send` and `end` forms
  are `t5-actor.ts:156,237`. M1 is the select plus the first STATUS. There are at most 60 STATUS calls, one
  CHUNK per `send`, and no START.
- (5) and (7): the failures folder (`FailPng`, sheet:74).
- (8): `Rcp … assemble-mcp.ts "$env:T5_ACTORS\M\out.jsonl" pp1 --held` (`Rcp` sheet:70, `T5_ACTORS`
  sheet:66; `out.jsonl` at `t5-actor.ts:60`).
- (9): the S6.3 hashes.
- (10): the drop, plus a drop right after (4) if M did not run.
- (11): `close-bb-tab` (`s6.ts:28,300,309`).
- The record-as-observed and never-re-tune rule is in the note's last paragraph.

The expected lines match the code:
- SDK leg: `held export under key held-pp1 in <T#> (…)` = `held.ts:54`; `kept <T#> open … export held …` =
  `held.ts:58`.
- Plan: the 3 header lines = `held.ts:29-31`.
- Assemble: `assemble-mcp: held export: key held-pp1 (no START expected)` = `assemble-mcp.ts:42`.
- Drop: `held export held-pp1 in <T#>: done, …` = `held.ts:74`; `dropped … gone (null)` = `held.ts:81`;
  `released <T#> (left open: …)` = `export-grades.ts:91`; a second drop's `FAILED — no held export …` =
  `held.ts:72`.
- The file names use the UTC date (`export-file.ts:36`), as the sheet's "same UTC date" says.

## 5. Hygiene of 75f0bd6's diff, by count (nothing printed)

- The token, read from `bridge.token` into a variable (32 characters): **0** hits.
- `_\d+_\d+` other than `_1_1`: **0** (`_1_1` appears 46 times).
- The skill's course-table ids (17 unique `_N_N` taken from `~/.claude/skills/blackboard-ultra`): **0** hits.

## Findings

- **MINOR-1: assemble `--held` does not fail on bad results.** `assemble-mcp.ts:43-44` prints `<n> bad
  result(s)` and each `bad result:` line, then goes on. It exits 1 only when assembly or `verifyTransfer`
  fails. So "0 bad result(s)" is enforced only by the registered expected line
  (`assemble-mcp: transcript: status found, <k> chunk result(s), 0 bad result(s)`), not by the exit code. A
  run where a truncated chunk was re-sent successfully would exit 0 with a non-zero count. This is behaviour
  from before 75f0bd6, unchanged by it, and the commit's comment says "expected", not "required". The
  driver must judge the row by the printed count as registered, not by `exit 0` alone.
- **MINOR-2: two changed glue lines are not unit-tested** (M7, M8). Both fail safe. If the SDK leg dropped
  in hold mode, M1's STATUS would be `null` and the rule would FAIL. If assemble used the wrong key, it would
  fail with `no "done" status result`. The builder's localhost dry run (`S6-builder-r5.md` §3) exercised both
  lines. This is consistent with the repo's rule that glue is not unit-tested.
- **NIT-1: "8 lines" holds only with `npm run -s`.** The §4.19 note says the plan is "8 lines" and writes
  the command as `… export-grades.ts pp1 --mcp-plan --hold >`. Without `-s`, npm adds its header, and the
  file has 12 lines (measured: `no -s: 12 lines; -s: 8 lines`). The wave sheet's step (4) uses
  `npm run -s`, and both `Select-String` checks hold either way.
- **NIT-2: a single `<date>` for both files.** Steps (2) and (9) name both files with one `<date>`. If the
  SDK leg and assemble fall on either side of 00:00 UTC, the two names differ. Reading each name from its
  own `written …` line avoids this.
- **NIT-3: assemble `--held` does not check for a START in the transcript.** The plan carries none, and a
  rebuilt export could only make S6.3's hashes differ (a FAIL), so the gap is fail-safe.
