# S8-verifier3 — Docs (Step 11b), re-check after fix round 2

Claude Opus 5.5, effort medium, 2026-10-27. Read and run only; nothing edited but this report. No commit; the bridge
daemon was not touched. Scope: N1–N4 of `S8-verifier2.md`, every sentence fix round 2 rewrote (above all the Step 11b
block in `docs/progress-and-roadmap.md`), and a check that V1–V12 still hold.

## 1. Verdict: **PASS-with-notes**

N1–N4 are resolved. Every claim, number, hash and decision number in the rewritten progress block matches its source.
V1–V12 still hold. D8.1 is met: `doc-check` exits 0. There is one new NIT (M1), and it does not block the stage.

## 2. Outputs (re-run by me)

| Command | Result |
|---|---|
| `node scripts/doc-check.mjs` | exit 0; "Checked 37 living docs (5 closed phase docs skipped for paths and status)."; `tools: 24 · router methods: 27 · codes: 27`; flags only `CLAUDE.md:112  4535 passed` (the session agent's, proposal (d)) |
| `git rev-parse --short origin/main` | `ce1f06d` |
| `git log --oneline origin/main..HEAD \| wc -l` | 14 (oldest `91322ac`) |
| `git diff extension/src/safety-dnr-keeper.ts`, with `+`/`-` lines that are not ` *` filtered out | nothing but the headers: the change still only touches comments; the `+` lines are at most 118 characters plus the prefix |

## 3. Items N1–N4

| Item | Result | Evidence |
|---|---|---|
| N1 | resolved | `docs/setup.md`, *What the block list does not do*: "A bridge `back`/`forward` holds the rules since Step 11b (below; measured on a redirect hop, R17B-BACK, R17B-FWD)." Record rows 27–28 (`FLIP … n200=1 n302=1`, `HITS bbk/bfw blocked=0`). |
| N2 | resolved | The progress block (`progress-and-roadmap.md:826-843`) is one status paragraph with no Superseded marker and no *Updated* paragraph. "Gate check D4.3 is part (ruled, #311)" matches #311 item 1 ("D4.3 is … **part**"). Only the old *Corrected* tag remains, and its reason now reads "Runs 17 and 17b have run". |
| N3 | resolved | The progress block says "Not pushed since `ce1f06d` (push granted, #311)". `origin/main` is `ce1f06d`, and #311 item 6 grants G11b-1. Proposal (d), line 43, uses the same wording and says to re-count with `git rev-list` when applying it. |
| N4 | resolved | (b): "while the call holds rules, wait for the load it starts, at most 10 s, #302". This matches `handlers/history.ts:42-48`: `settleWait` is armed when `call.holdsRules()` is true and awaited when the tab reads `loading`. #302 is "S3a: `back`/`forward` wait for their load while they hold rules" (decisions.md:405), so fixer2's open note is answered: #302 is correct. (f): a new **Run 17b's helper facts** group after line 151. `recipes/CLAUDE.md:151` is the **Run 17's helper facts** bullet, and line 87 is the dynamic-scope note. |

## 4. The rewritten progress block, claim by claim

| Claim | Source | Result |
|---|---|---|
| gate accepted (#311); close waits on #318 | decisions.md:272 (#311); Open decisions lists only #318 | correct |
| S6: `newTab` with a URL opens `about:blank` first | #311 item 2; As built S6 (`db3f82e`) | correct |
| Run 17 claims (RD-1, RD-3, RD-6, RD-2 #295, RD-BACK-EMPTY #307, #308), D4.6 not met (#309) | #307–#309 | unchanged from the S5 text; correct |
| R17B-RD-2 blocked 0; Run 17 RD-2: 1 | record row 23 (`HITS bd2 redirect=1 blocked=0`, "Run 17: `blocked=1`") | correct |
| R17B-BACK, R17B-FWD: 0 blocked, `DOMAIN_BLOCKED`, once each, histories with a user activation | record rows 27–28; D7.4 (`HIST … activated`, `ACT … ok`) | correct |
| R17B-BACK-NOACT `INTERNAL`; R17B-ACT-CTL `ok` 4 of 4; #308 | record rows 21–22 (two `back`, two `forward`, all `ok`) | correct |
| PASS 16, RECORD 2, FAIL 7, NOT MEASURED 3 | record §1 counts; #318 | correct |
| the seven FAIL ids; "each fails on a helper or sheet defect or an unestablished banner reading" | record §1; #318 | correct (see M1 for "not Step 11b claims") |
| R17B-LOGS NOT MEASURED, so D7.6 not met (#318) | record row 45, D7.6 row | correct |
| Not measured: `tabs.get().status` after `goBack` | record lines 52–53 | correct |
| Not pushed since `ce1f06d` (push granted, #311) | §2 | correct |
| Docs: S5 and S8 (`docs/setup.md` Safety) | As built S5 (`c5d0099`); this stage | correct. S8 also touched the setup.md upgrade note and this file, but that does not change the claim. |

The table row (`progress-and-roadmap.md:172`) is unchanged since verifier2 and still correct.

## 5. V1–V12 after the rewrite

No earlier fix was undone. V1, V3, V4, V8, V9 and V12: the text is in `git diff docs/setup.md`, worded as verifier2
quoted it. V2: setup.md has no upload sentence, and the progress block keeps the #318 wording. V5 and V6: the block is
now rewritten in place (N2) and the row is unchanged. V7 and V11: proposals (b), (d) and (f) are present and corrected
(N3, N4). V10: the `.ts` diff touches comments only, and every line is within 118 characters.

## 6. New findings

### M1 — NIT — "not Step 11b claims" is slightly wider than #318
`docs/progress-and-roadmap.md` (the Step 11b block): "the seven FAILs are carried upload rows (…), not Step 11b claims".
#318 says "Step 11b's own rows pass … seven rows carried from Run 16's uploads fail". R17B-UP-OPT carries the S0F-a
home-folder items (K-opt-home, record row 33). S0F belongs to Step 11b's scope (the table row lists the three
follow-ups). Those clauses passed, though, and the row fails only on O2's 6105 ms. So the sentence is true of the
failing clauses but not of every row. **Fix (optional):** "not Step 11b's own rows (#318)".

## 7. Deviations
None. Fixer2's report matches the files. Its four fixes are in the five lane files, no `CLAUDE.md` was edited
(`git status`), and only comments changed in `.ts`.

## 8. Proposed decisions
None.

## 9. Handoff
Nothing left running; no live run. M1 is optional. These are still for the session agent: the phase doc's status
line (line 3, "S6 … and Run 17b (S7) follow, then S8 and the close"), the `CLAUDE.md` proposals (a)–(f), and the root
count (4535 → 4665/191).
