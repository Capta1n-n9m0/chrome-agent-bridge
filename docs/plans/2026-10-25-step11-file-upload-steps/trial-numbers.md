# Lean-procedures trial: Step 11 against Step 10 (measurements)

Model: Sonnet 5.5, effort medium (measurement builder). Measured 2026-10-26 on the Windows machine, from the files
named in each section. Every figure below comes from a command I ran or a file I name. Nothing is estimated. What I
could not measure is in the last section.

## 0. Windows and method

| Item | Step 10 | Step 11 | Source |
|---|---|---|---|
| Window start (UTC) | 2026-10-24 19:21:34 (steps-dir start commit `55ee4de`, 23:21:34 +0400) | 2026-10-25 16:16 (journal line 1) | `git log --format=%ci --reverse -- <steps dir>`; `journal.md` |
| Window end (UTC) | 2026-10-25 12:56:40 (close-out commit `eac8324`, 16:56:40 +0400) | 2026-10-26 06:19 (journal's last line; last commit `38e237b` 10:18 +0400) | same |
| Wall time | 17 h 35 min | 14 h 03 min | arithmetic on the two rows above |
| Step 10 clock source | git commit times only: its `journal.md` carries dates, no times, and its ledgers are per stage | the journal's UTC lines | `grep -n "^## " journal.md` |

Tokens come from the JSONL transcripts under `C:\Users\aliev\.claude\projects\C--Users-aliev-Projects-chrome-remote-extention\`
(top-level files and `*/subagents/*.jsonl`, with each agent's `.meta.json` for description, type, model and spawn depth).
Script: `...\scratchpad\tok.mjs` (and `roles.mjs`, `sum.mjs`) in the session scratchpad, outside the repo; it prints counts only.
Method: one record per assistant message id (the last record of that id), bucketed by the message's own timestamp into
the two windows above; fields summed are `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`,
`output_tokens`. Roles are read from the agent's `description` in its `.meta.json` (regexes in `roles.mjs`); that is a
label match, not a re-read of any brief. An agent counts for a window when it has a message in it. "Non-cache-read"
is input + cache creation + output.

## 1. Cost

### 1.1 Totals

| | Step 10 | Step 11 | Step 11 / Step 10 |
|---|---|---|---|
| Transcripts with a message in the window | 99 (83 agent-tool subagents, 16 top level) | 109 (106 subagents, 3 top level) | |
| Assistant messages (de-duplicated) | 3,634 | 2,783 | 0.77 |
| Input tokens (uncached) | 7,542 | 5,730 | |
| Cache creation | 24,880,599 | 13,160,189 | 0.53 |
| Cache read | 680,301,860 | 367,762,778 | 0.54 |
| Output | 3,319,891 | 2,609,979 | 0.79 |
| **All four summed** | **708,509,892** | **383,538,676** | **0.54** |
| Non-cache-read (input + creation + output) | 28,208,032 | 15,775,898 | 0.56 |
| Cache read share of the sum | 96.0 % | 95.9 % | |

Source: `node tok.mjs <projects dir> tok.json`. No price list was consulted, so there is no money figure.

### 1.2 By transcript kind and model

| Kind and model | Step 10 transcripts | Step 10 sum of four | Step 11 transcripts | Step 11 sum of four |
|---|---|---|---|---|
| Session agent (Opus 5.5, top level) | 1 (`ece9d9b4`) | 35,634,056 | 1 (`9c6ea090`, includes this measurement's own start) | 47,938,634 |
| Agent-tool subagents, Opus 5.5 | 83 | 667,925,812 | 65 | 212,930,547 |
| Agent-tool subagents, Sonnet 5.5 | 0 | 0 | 41 | 121,961,197 |
| Top-level Sonnet 5.5 transcripts, entrypoint `sdk-cli` (headless `claude -p` runs; the entrypoint is read, their role is not) | 15 | 4,950,024 | 2 | 708,298 |

Sonnet's share of Step 11's non-cache-read tokens (all Sonnet transcripts): 31.4 % (4,951,658 of 15,775,898). The session
agent's share is 6.1 % (969,785) in Step 11 and 2.0 % (557,279) in Step 10. The Step 10 session agent ran for the whole
window (145 messages); the Step 11 session agent has 187.

### 1.3 Agents spawned, by role and model (agent-tool subagents; table = count / sum of four tokens / output tokens)

Per-role figures (count, messages, non-cache-read tokens, cache-read tokens, output tokens; `roles.mjs`):

| Role / model | n | msgs | non-cache-read | cache read | output |
|---|---|---|---|---|---|
| S10 step agent, Opus | 11 | 523 | 8,675,219 | 76,578,832 | 422,362 |
| S10 builder, Opus | 11 | 762 | 4,422,097 | 190,328,381 | 1,001,594 |
| S10 verifier, Opus | 15 | 858 | 6,093,609 | 152,876,914 | 653,972 |
| S10 fixer, Opus | 14 | 790 | 4,213,324 | 156,683,212 | 775,070 |
| S10 live runner, Opus | 11 | 289 | 1,892,189 | 41,412,625 | 210,353 |
| S10 commit/bookkeeping, Opus | 19 | 124 | 1,156,266 | 8,701,776 | 64,397 |
| S10 other, Opus | 2 | 77 | 445,761 | 14,445,607 | 74,251 |
| S11 step agent, Opus | 20 | 405 | 3,611,118 | 28,281,930 | 273,643 |
| S11 builder, Opus | 6 | 363 | 1,491,541 | 59,577,998 | 353,445 |
| S11 builder, Sonnet | 10 | 390 | 2,717,441 | 92,958,646 | 747,440 |
| S11 verifier, Opus | 30 | 986 | 4,134,809 | 106,366,214 | 747,174 |
| S11 fixer, Opus | 3 | 74 | 387,705 | 8,075,020 | 81,582 |
| S11 fixer, Sonnet | 13 | 230 | 1,462,986 | 18,626,031 | 194,518 |
| S11 live runner, Sonnet | 3 | 59 | 171,913 | 3,568,921 | 23,189 |
| S11 commit/bookkeeping, Opus | 2 | 6 | 41,353 | 217,693 | 1,734 |
| S11 commit/bookkeeping, Sonnet | 12 | 47 | 413,084 | 1,649,246 | 15,395 |
| S11 other, Opus (2 probes, env check, cleanup lead) | 4 | 16 | 187,929 | 557,237 | 5,891 |
| S11 other, Sonnet (trial agent, 2 area cleaners, cut off) | 3 | 8 | 107,578 | 285,351 | 2,419 |

Notes.
- Step 11 builders: Opus 6 = the Stage 0 auditor, S1, S2, S3, S4, S4b; Sonnet 10 = S3c, S5 prep (stopped), S5-sheet,
  -fixtures, -rules, -actor, -win, -runner, -record, S6.
- Step 10 verifiers: 15 agents carry many more than 15 verification rounds, because some verifiers wrote several rounds into one
  file (`S7-prep-verifier.md` holds six; `S4-verifier.md` three). Step 11 used a fresh verifier per round (#225), so its
  verifier count is not like-for-like with Step 10's.
- Largest single agents (sum of four): Step 10: S7 prep builder 53,473,054; S7 prep verifier 37,628,625; S1 prep builder 30,398,943.
  Step 11: S5 prep builder (Sonnet, stopped by the session agent on the user's word, journal 19:52Z) 64,046,069 with 1,092,820 non-cache-read;
  S2 builder 18,968,249; S3 builder 14,191,790.

### 1.4 Words and files written to the steps dir

Command: `find <dir> -type f | wc -l`; `find <dir> -type f -exec cat {} + | wc -w`; also by extension. Counted before this file was written.

| | Step 10 `2026-10-24-step10-step8-follow-ups-steps/` | Step 11 `2026-10-25-step11-file-upload-steps/` | Step 11 / Step 10 |
|---|---|---|---|
| Files | 125 (112 `.md`, 13 `.txt`) | 100 (88 `.md`, 12 `.txt`) | 0.80 |
| Words, all files | 336,357 | 113,637 | 0.34 |
| Words, `.md` only | 316,673 | 99,157 | 0.31 |
| Words, `.txt` only | 19,684 | 14,480 | |
| Journal words (`wc -w journal.md`) | 792 | 2,758 | |
| Verifier report files (`ls *.md | grep -c verifier`) | 13 | 30 | |

The Step 10 figures match the baseline in `2026-10-25-lean-procedures.md` (125 files, 336k words).
The Step 11 files holding the most words are the S5 slice reports; I did not rank them.

### 1.5 Wall time

| | Step 10 | Step 11 |
|---|---|---|
| Kickoff to gate | 17 h 35 min (git commit times, UTC 19:21 to 12:56) | 14 h 03 min (journal UTC 16:16 to 06:19) |
| Contains a stall | Step 10's S7 prep verifier transcript spans 01:54 to 11:16 UTC (9 h 22 min) and its prep fixer 1 02:04 to 04:57; I did not find out what they waited on | S5-win: journal 21:26Z to 03:38Z (6 h 12 min), the fixer's hand-back "reached the step agent ~5 h after its own end time" (journal's own words); the fixer transcript runs 21:45 to 03:29 UTC |
| Step 11 without the S5-win stall | 7 h 51 min (14 h 03 min minus 6 h 12 min; arithmetic only, the stall is not a measured waiting time) | |

## 2. Quality

Method: each stage's verifier reports (`*-verifier*.md`), counted by finding headings; where a report gives a count in
its verdict line I used that. "Built by" is the builder's model from the journal and the agent `.meta.json`. CRITICAL and
MAJOR counts are exact; MINOR and NIT counts are exact where a number is printed in the report and counted from headings
otherwise. Step 11's S5-liveA and S5-liveB are live waves, not builds; they appear separately.

### 2.1 Step 11, Opus-built stages (first verifier round on the build)

| Stage | CRIT | MAJOR | MINOR | NIT | Verdict, round 1 | Fix rounds (fixer model) | Final |
|---|---|---|---|---|---|---|---|
| Stage 0 audit (the verifier checks the audit; the auditor's own spec findings were CRITICAL 1, MAJOR 5, MINOR 9, NIT 1 per the journal) | 0 | 0 | 3 | 2 | PASS-with-notes | 0 | PASS-with-notes |
| S1 | 0 | 0 | 4 | 2 | PASS-with-notes | 0 | PASS-with-notes |
| S2 | 0 | 0 | 2 | 5 | FAIL (exit check S2.2, a lane problem, not a severity) | 2 (Opus) | PASS-with-notes (0 / 0 / 0 / 2) |
| S3 | 0 | 0 | 2 | 5 | PASS-with-notes | 1 (Opus) | PASS-with-notes (new NIT 2) |
| S4 | 0 | 0 | 2 | 4 | PASS-with-notes | 0 | PASS-with-notes |
| S4b | 0 | 0 | 1 | 2 | PASS-with-notes | 0 | PASS-with-notes |
| **Sum, S1 to S4b (5 stages)** | **0** | **0** | **11** | **18** | | **3** | |

The S2 journal line says NIT 1 for round 1; `S2-verifier.md` says "2 MINOR, 5 NIT". I used the verifier file.

### 2.2 Step 11, Sonnet-built stages (first verifier round on the build; builder Sonnet 5.5 medium)

| Stage | CRIT | MAJOR | MINOR | NIT | Verdict, round 1 | Fix rounds (all Sonnet) | Final |
|---|---|---|---|---|---|---|---|
| S3c | 0 | 0 | 0 | 1 | PASS-with-notes | 0 | PASS-with-notes |
| S5-sheet | 0 | 2 | 3 | 2 | FAIL | 2 | PASS-with-notes (v3: 1 NIT) |
| S5-fixtures | 0 | 0 | 3 | 4 | PASS-with-notes | 1 | PASS |
| S5-rules | 0 | 1 | 3 | 3 listed | FAIL | 1 | PASS-with-notes (1 MINOR, 2 NIT) |
| S5-actor | 0 | 0 | 6 | 4 | PASS-with-notes | 1 | PASS-with-notes (2 NIT) |
| S5-win | 0 | 1 | 9 | 6 | FAIL | 1 | PASS-with-notes (1 MINOR, 4 NIT) |
| S5-runner | 0 | 1 | 4 | 5 | FAIL | 1 | PASS-with-notes (1 MINOR, 2 NIT) |
| S5-record | 0 | 0 | 5 | 4 | PASS-with-notes | 2 | PASS-with-notes (v3: 3 NIT; v2 was FAIL on 1 MINOR) |
| S6 (docs) | 0 | 0 | 5 | 4 | PASS-with-notes | 2 | PASS-with-notes (v3: 1 NIT) |
| **Sum, nine builds** | **0** | **5** | **38** | **33** | 4 of 9 FAIL | **11** | |
| S5 prep builder (stopped; no verifier ran) | | | | | | | stopped, 64.0 M tokens |

Source files: `S5-sheet-verifier*.md`, `S5-fixtures-verifier*.md`, `S5-rules-verifier*.md` (NITs from `S5-rules.md`'s agent table),
`S5-actor-verifier*.md`, `S5-win-verifier*.md`, `S5-runner-verifier*.md`, `S5-record.md` agent table and its verifiers, `S6.md`
agent table. The S5-win step report says round 2 had 3 NIT; `S5-win-verifier2.md` lists NIT-N2 to N5 (four) and I used the verifier file.

Live waves (Sonnet runner and set-up fixers, Opus verifier), counted from the journal:

| Wave | Runner/fixer | Verifier round | CRIT | MAJOR | MINOR | NIT | Fixer rounds |
|---|---|---|---|---|---|---|---|
| S5-liveA (continuation) | Sonnet | FAIL (F1 preflight STOPs unreturned; F2 console NOT MEASURED for run 1) | 0 | 2 | 2 | 3 | 1 |
| S5-liveB | Sonnet | PASS-with-notes | 0 | 0 | 4 | 2 | 1 |

### 2.3 Step 10, Opus-built throughout (all builders, fixers and runners were Opus 5.5 in the transcripts)

Counts from the `*-verifier.md` finding headings; the reports do not share one layout, so MINOR and NIT are "counted
headings" and some rounds could not be counted (marked n/c).

| Stage | CRIT | MAJOR | MINOR | NIT | Verdict, round 1 | Fix rounds (agents, from transcripts) |
|---|---|---|---|---|---|---|
| Stage 0 (verifier of the audit; the audit's own spec findings were MAJOR 7, MINOR 14, NIT 5, `stage0.md`) | 0 | 0 | 5 | 4 | PASS-with-notes | 0 |
| S1 prep (Run 14) | 0 | 1 | 7 | n/c | FAIL | 1 |
| S1 wave and live verifiers (three returns) | 0 | 2 (wave F1, live F1) | 3 | n/c | PASS-with-notes (wave F1 MAJOR), live PASS-with-notes | 1 wave fixer (counted with S1: 2 in all) |
| S2 | 0 | 0 | 2 | 3 | PASS-with-notes | 1 |
| S3 | 0 | 1 | 2 | 2 | FAIL | 1 |
| S4 | 0 | 0 | 3 | 5 | PASS-with-notes | 2 |
| S4b | 0 | 0 | 2 | 4 | PASS-with-notes | 0 |
| S5 | 0 | 0 | 1 | 4 | PASS-with-notes | 1 |
| S6 | 0 | 0 | n/c | n/c | PASS-with-notes | 0 |
| S7 prep (Run 15) | 1 | 3 | 3 | n/c | FAIL (then a round-1 re-check with W1 MAJOR, a round-2 PASS-with-notes) | 7 for S7 in all (prep r1, prep r2, wave fixers 1 to 3, #223 r1 and r2) |
| S7 live verifier | 0 | 0 | 0 | 8 notes (N1 to N8) | PASS-with-notes | |
| S8 | 0 | 0 | 1 | 5 | PASS-with-notes | 0 |
| **Sum of what could be counted** | **1** | **7** | **29+** | **27+** | | **14 fixer agents** |

Fixer agents by transcript: 14 in Step 10 (S1 2, S2 1, S3 1, S4 2, S5 1, S7 7) and 16 in Step 11 (13 Sonnet, 3 Opus).
For Step 10 the S1 wave and S7 prep counts above include several verifier rounds and are not comparable round for round.

### 2.4 Side by side

| | Step 10 (Opus builds) | Step 11 Opus builds (S1 to S4b) | Step 11 Sonnet builds (nine) |
|---|---|---|---|
| Builds counted | 8 stages with a counted verifier | 5 | 9 |
| CRITICAL / MAJOR on first verification | 1 / 7 (prep and wave rounds included) | 0 / 0 | 0 / 5 |
| Builds with a FAIL verdict on first verification | S1 prep, S3, S7 prep (3) | S2 (1, by an exit check) | S5-sheet, -rules, -win, -runner (4) |
| Fix rounds | 14 | 3 (all Opus) | 11 (all Sonnet) |
| Third (Opus) fix round after two Sonnet failures | n/a | not needed | not needed (the most was 2, on S5-sheet, -record, S6, each ending PASS-with-notes) |

Caution on reading the table: the stages are not alike. The Opus builds of Step 11 were contract and product code (shared,
daemon, extension, SDK, MCP) and the Sonnet builds were recipes, fixtures, a PowerShell driver, rule tables and docs. Opus
verifiers (all of them) judged both sets. This measurement cannot separate the model from the work.

### 2.5 Live rows failed for a product defect

| Run | Rows | Result | Product defects filed | Source |
|---|---|---|---|---|
| Run 15 (Step 10) | 27 PASS / 3 FAIL / 3 NOT MEASURED / 4 RECORD | none a product defect | none (#226) | root `CLAUDE.md` Current state; `decisions-archive/step10.md` line 55 |
| Run 16 (Step 11) | PASS 19 / FAIL 3 / NOT MEASURED 3 / RECORD 4, plus UP-LOGS split; 30 row lines (liveA 10, liveB 20); UP-CLICK not run | UP-6 and UP-6B banner FAIL "is not product evidence"; UP-OPT FAIL (6061 ms against a 5000 ms bound) with no cause stated | none filed (#284, #285) | `decisions.md` lines 208 to 236; `S5-record.md` line 38 |

Run 16 did show two things for the user: S5.5 failed for liveA and S5.6 failed in part for liveA (#282), which stop the gate (#285);
and a raw missing-file upload under `<ROOT>` answered `ok` (UP-RAW, #284, left to the user).

### 2.6 Process incidents recorded in the Step 11 journal (counts of lines I read, not a measure)

- 1 builder stopped for size (S5 prep builder, above 700k tokens of context, 19:52Z).
- 1 verifier started the real daemon on 9234 by a dry check (S5-actor verifier 1, journal 21:24Z).
- 1 fixer hand-back arrived about 5 h late (S5-win).
- 1 orphan python and two bash processes (~1.5k CPU-seconds) stopped (journal 04:53Z).
- Builders committed before their verifier, so code commit messages say "verifier: pending" (journal 19:02Z; #286).

## 3. Could not measure

- **Step 12 Stage-0 audit findings against Step 11's contracts:** Step 12's audit has not run. Not measured.
- **Money cost:** I did not look up a price list; the tables hold tokens only.
- **Step 10's time of day per stage:** its journal has dates and no times, so its wall time is from git commit times
  of the steps dir. The 17 h 35 min is from the first to the last such commit, not from a kickoff message.
- **Whether the top-level Sonnet transcripts are the headless actors:** the entrypoint is `sdk-cli` for the two I
  opened; their role is inferred, not read from a brief. I did not open the 15 + 2 files individually.
- **Exact MINOR/NIT counts for some Step 10 rounds:** `S1-prep-verifier.md` (NIT list), the S1 wave rounds, `S6-verifier.md`
  and most of `S7-prep-verifier.md` print no total; I did not count bullets inside them. The Step 10 sums are lower bounds.
- **Findings per verifier round after round 1 for Step 10:** several verifiers wrote later rounds in the same file;
  I counted round 1 and noted later verdicts only where a heading gave them.
- **Token use per stage:** I measured per agent and per role. Per-stage totals need the agent-to-stage mapping from the
  descriptions, which I did not total.
- **Time the agents waited on external jobs:** transcripts show spans, not waiting. The two stalls above are spans.
- **The session agents' own overhead beyond their transcripts:** only transcripts in this project directory were read.
  Any headless `claude -p` run from another directory is not included.
- **This measurement's own tokens:** my transcript starts at 06:18 UTC; I cut the Step 11 window at 06:19:30, so only my
  first messages fall inside it. The cleanup lead and the two area cleaners are also cut off mid-run.
- **Test count change per step:** not asked, not measured here (journal: Step 11 went 3273/132 to 3811/154).
