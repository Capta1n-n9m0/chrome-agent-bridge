# S6 builder report — the local `release/step8` branch

Builder, 2026-10-25, Opus 5.5. Verdict: **built; all checks pass.** Branch tip
`db72e9a0f2a28cbedc0fcd77b2cf2ea2b5c5bdcf`; tree `4e57b16a8527f3a775d87441379c56c649e1f92d` = `a1932a8`'s tree.

## What I did

1. Recorded `git rev-parse main` = `0d189a0bc59479a6aa1dcd1dcda913c249859e6d` before starting.
2. Verified the six subjects against `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md` lines 1218–1222
   (backticked spans re-joined with single spaces): `cmp` of the extracted list against
   `git log --reverse --format=%s 70aa754..release/step8` → `IDENTICAL`, 6 lines.
3. Checked the carried originals' trailers: all 60 commits of `70aa754..a1932a8` carry exactly
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (60/60) and no other co-author, so no body names another.
4. Wrote six message files (scratchpad `s6msg/p1..p6.txt`) and ran a script (scratchpad `s6build.sh`) in a detached
   worktree `<scratchpad>/s6rel` at `70aa754`: per Part, `git cherry-pick -n` each commit in history order; after each,
   refuse any unmerged path outside `docs/`, `CLAUDE.md`, `README.md` (none met); `git checkout 70aa754 -- docs
   CLAUDE.md README.md`; `git rm` every `docs/` path not in the base; `git cherry-pick --quit`; then
   `git commit -F`. Each Part 1–5 commit checked: doc paths differing from base = 0. Part 6:
   `git read-tree -u --reset a1932a8`, `git commit -F`. Worktree clean at the end (0 status lines).
5. `git branch release/step8 db72e9a…` from the main repo (no checkout), `git worktree remove`, `git worktree prune`.

Part map (Variant C, #208; S7.md §4 + F7): P1 `e9e5e8c 6742c1f 357f776 efb8557`; P2 `dcb72db db242b6`; P3
`26df11b`; P4 `aa113df 201f5c8 03254d9`; P5 `6398f27 23b878f bc78ded 036909f 7c16a00 75f0bd6`; P6 the whole
`a1932a8` tree (the 44 remaining commits, enumerated in its body).

## Build output (conflicts per Part)

```
P1 e9e5e8c clean
P1 6742c1f clean
P1 357f776 clean
P1 efb8557 clean
P1 doc paths differing from base: 0
P1 commit c94fa5d
P2 dcb72db conflict in: docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S0.ledger.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S0.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md 
P2 db242b6 clean
P2 doc paths differing from base: 0
P2 commit 86c91bb
P3 26df11b clean
P3 doc paths differing from base: 0
P3 commit f63c705
P4 aa113df conflict in: docs/e2e-test-plan.md 
P4 201f5c8 clean
P4 03254d9 clean
P4 doc paths differing from base: 0
P4 commit 08b7e4a
P5 6398f27 clean
P5 23b878f conflict in: docs/e2e-test-plan.md 
P5 bc78ded conflict in: docs/e2e-test-plan.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6.ledger.md 
P5 036909f conflict in: docs/e2e-test-plan.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6.ledger.md 
P5 7c16a00 conflict in: docs/e2e-test-plan.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md 
P5 75f0bd6 conflict in: docs/e2e-test-plan.md docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S6-wave-sheet.md 
P5 doc paths differing from base: 0
P5 commit 6dabc08
P6 commit db72e9a
tip db72e9a0f2a28cbedc0fcd77b2cf2ea2b5c5bdcf tree 4e57b16a8527f3a775d87441379c56c649e1f92d close-tree 4e57b16a8527f3a775d87441379c56c649e1f92d
```

Doc conflicts: Parts 2, 4 and 5 (P2 `dcb72db`; P4 `aa113df`; P5 `23b878f bc78ded 036909f 7c16a00 75f0bd6`) —
11 conflicting cherry-picks, every path under `docs/`, each resolved to the base. This matches
`stage0-release-trees.txt` Variant C (lines 55–72) line for line. Parts 1 and 3: none. Non-doc conflicts: 0.

## Checks (command + output)

```
$ git diff a1932a8 release/step8 --stat
(exit 0)
$ git rev-parse release/step8^{tree} a1932a8^{tree}
4e57b16a8527f3a775d87441379c56c649e1f92d
4e57b16a8527f3a775d87441379c56c649e1f92d
$ git log --format='%h %s' 70aa754..release/step8
db72e9a docs: Step 8 E2E results
6dabc08 feat(recipes): hello, boot-bb, export-grades
08b7e4a feat(mcp): cursor that does not follow the human; browser_use_active_tab; locator fields
f63c705 feat(sdk): failure reports with snapshot, screenshot and network
86c91bb feat(sdk): typed Tab API with cursor and locators
c94fa5d feat(extension): locators resolved by the snapshot's rules; waitFor locator; evaluate asRef
$ git rev-list --count 70aa754..release/step8
6
$ git merge-base release/step8 70aa754
70aa7542ee0e5c8a78ba16820d1272715dfadacf
$ git rev-parse release/step8
db72e9a0f2a28cbedc0fcd77b2cf2ea2b5c5bdcf
$ forbidden-path scan per commit (git show --name-only --format= <c> | grep -cE "(^|/)dist/|bridge\.token|(^|/)\.env|(^|/)exports/|\.png$")
c94fa5d: 68 files, forbidden 0
86c91bb: 15 files, forbidden 0
f63c705: 5 files, forbidden 0
08b7e4a: 11 files, forbidden 0
6dabc08: 33 files, forbidden 0
db72e9a: 101 files, forbidden 0
$ git tag -l step8
(end)
$ git worktree list
C:/Users/aliev/Projects/chrome-remote-extention  0d189a0 [main]
$ git branch --list
  feat/agent-bridge
* main
  release/step8
$ git rev-parse main
0d189a0bc59479a6aa1dcd1dcda913c249859e6d
$ git reflog -3 main
0d189a0 main@{0}: commit: docs(step10): S1 closed — #210–#213, as-built register started
f717682 main@{1}: commit: docs(e2e): S1 — Run 14 results (verifier: PASS-with-notes)
111cb7b main@{2}: commit: test(e2e): S1 — Run 14 helper fix between rows after Return 3 (verifier: PASS-with-notes)
$ git status --short
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/S2.ledger.md
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/S6.ledger.md
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S2-builder.md
?? mcp/test/fixtures/
?? mcp/test/tool-schemas.ts
```

Full bodies (`git log --format=%B -6 release/step8`):

```
docs: Step 8 E2E results

Part 6 of the squashed Step 8 release branch (Variant C, #208): the whole a1932a8 tree, carrying the docs/, CLAUDE.md and README.md of the whole range and all 44 remaining commits of 70aa754..a1932a8:

- 1a62620 docs(step8): open the run — steps dir, common brief, decisions #70-#77
- 7fe62f4 docs(step8): Stage 0 — spec audit (verifier: PASS-with-notes)
- 1837dc9 docs(step8): rule on Stage 0's findings — decisions #78-#85
- 6210ba4 docs(step8): S0 — ruling notes for #78-#85, NO_CURSOR spec note, S0 reports (verifier: PASS-with-notes)
- fde6826 docs(step8): rule on S0's escalation — decision #86
- 637a808 docs(step8): as-built register (Stage 0, S0); journal
- 682f73d docs(step8): S1 closed — decision #87, as-built S1
- 97d6123 docs(step8): FE build closed — decision #88; journal
- 257dd8d docs(step8): FE ledger — build part closed, live part starting
- a3ac169 docs(step8): the background-input policy — decision #89 (outcome B)
- 829368e docs(step8): FE live run (Run 11) — outcome (B) focusFirst (verifier: PASS-with-notes)
- cad2274 docs(step8): FE closed — as-built FE, #89 updated
- 892370d docs(step8): S3 closed — decisions #90, #91; as-built S3
- 53f68db docs(step8): S2 closed — decision #92; as-built S2
- eb4fc4e docs(step8): journal — S2b/S4 resumed after an API error
- d72aeda docs(step8): S4 closed — decision #93; as-built S4
- 9b903d9 docs(step8): S2b closed — decision #94; as-built S2b
- 6a97635 docs(step8): S5 closed — decision #95, #59 updated; as-built S5
- c53dd00 docs(step8): the user's grants for SDK-6/SDK-7 and SM-1 — decision #96
- 8d77a35 test(e2e): S6 — Run 12 (S6), partial: stopped by a classifier denial (verifier: PASS-with-notes)
- 3e218c2 docs(step8): journal — S6 live stopped by a classifier denial
- c6d32ad docs(step8): journal — paused by the user; resume point
- 9b1c332 docs(step8): resume S6 — decision #97 (report-screenshot probe)
- 430cbeb docs(step8): the user's restart and Blackboard-write grants — decision #98
- 24b5ce5 test(e2e): S6 — Run 12 (S6) completed (verifier: PASS-with-notes)
- d808ae5 docs(step8): S6 Part 2 ruled — decision #99; S6b for REP-1
- 0a6c82c docs(step8): S6b closed — decision #100; as-built S6b
- a56d198 test(e2e): S6 — Run 12 (S6) Part 3 (verifier: PASS-with-notes)
- 752a48c docs(step8): S6 Part 3 recorded; SDK-6/SDK-7 in the opened session — decision #101
- 1b429bc docs(step8): S6 Part 3 addendum — SDK-6/SDK-7 in the opened session (pre-run)
- b237a3f docs(step8): S6 Part 3 addendum — SDK-6/SDK-7 from a driver window (pre-run)
- dde0c78 test(e2e): S6 — Run 12 (S6) Part 3 addendum: SDK-6/SDK-7 (verifier: PASS-with-notes)
- f9173b4 docs(step8): SDK-7 MCP leg re-registered — decision #102
- bff51ec test(e2e): S6 — SDK-7 MCP leg and S6.3 (verifier: PASS-with-notes)
- 9b15ad4 docs(step8): S6.3 re-registered on one held export — decision #103
- 05a34f0 test(e2e): S6 — S6.3 re-run on one held export (verifier: PASS-with-notes)
- eb6b991 docs(step8): S6 closed — as-built S6
- 01fc58e docs: S7 — Step 8 docs (verifier: PASS-with-notes)
- e89514b docs(step8): S7 closed — decision #104; as-built S7
- e963bff docs(step8): as-built S7; journal
- fa241b2 docs: Step 8 propagator — 33 corrections
- 117b16a docs(step8): close-out — Outcome as results, gate checklist, Current state
- 8dbcd00 docs(step8): the user's close-out grants (#105); wave W2 handoff
- a1932a8 docs(step8): W2 — the user rules the 25 open decisions (#106–#127)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW

feat(recipes): hello, boot-bb, export-grades

Part 5 of the squashed Step 8 release branch (Variant C, #208): the code changes of the Step 8 commits below; docs/, CLAUDE.md and README.md held at the base 70aa754.

Carries:
- 6398f27 docs(step8): FE — pre-registered rows FE-0…FE-5, wave sheet, measurement script
- 23b878f docs(step8): S6 — wave sheet, expected text, recipes (pre-run)
- bc78ded docs(step8): S6 — REP-0 probe, helper rename (pre-run)
- 036909f docs(step8): S6 Part 3 — re-registered rows, SSO login (pre-run)
- 7c16a00 docs(step8): S6 — SDK-7 MCP leg cap 600 000 (pre-run, #102)
- 75f0bd6 docs(step8): S6 — S6.3 on one held export (pre-run, #103)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW

feat(mcp): cursor that does not follow the human; browser_use_active_tab; locator fields

Part 4 of the squashed Step 8 release branch (Variant C, #208): the code changes of the Step 8 commits below; docs/, CLAUDE.md and README.md held at the base 70aa754.

Carries:
- aa113df feat(mcp): S5 — cursor, browser_use_active_tab, locator input, failure reports (verifier: PASS-with-notes)
- 201f5c8 test(mcp): S6b — image-in-error-result probe rows (pre-run)
- 03254d9 fix(mcp): S6b — failure-report image reaches the model (verifier: PASS-with-notes)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW

feat(sdk): failure reports with snapshot, screenshot and network

Part 3 of the squashed Step 8 release branch (Variant C, #208): the code changes of the Step 8 commits below; docs/, CLAUDE.md and README.md held at the base 70aa754.

Carries:
- 26df11b feat(sdk): S4 — failure reports (verifier: PASS-with-notes)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW

feat(sdk): typed Tab API with cursor and locators

Part 2 of the squashed Step 8 release branch (Variant C, #208): the code changes of the Step 8 commits below; docs/, CLAUDE.md and README.md held at the base 70aa754.

Carries:
- dcb72db feat(shared): S0 — Step 8 types (verifier: PASS-with-notes)
- db242b6 feat(sdk): S3 — Tab, cursor, locators, policy (verifier: PASS-with-notes)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW

feat(extension): locators resolved by the snapshot's rules; waitFor locator; evaluate asRef

Part 1 of the squashed Step 8 release branch (Variant C, #208): the code changes of the Step 8 commits below; docs/, CLAUDE.md and README.md held at the base 70aa754.

Carries:
- e9e5e8c feat(extension): S1 — content-script locate (verifier: PASS-with-notes)
- 6742c1f feat(extension): FE — focus emulation for trusted input (verifier: PASS-with-notes)
- 357f776 feat(extension,daemon): S2 — ref | locator, waitFor, node → ref, locate (verifier: PASS-with-notes)
- efb8557 refactor(daemon,extension): S2b — remove the Step 6 compatibility path; session marker (verifier: PASS-with-notes)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW

```

Forbidden-path regex used per commit: `(^|/)dist/|bridge\.token|(^|/)\.env($|[./])|(^|/)exports/|\.png$` on
`git show --name-only --format= <c>` — 0 in each of the six (68, 15, 5, 11, 33, 101 files).

Main: `0d189a0bc59479a6aa1dcd1dcda913c249859e6d` at start and at end; `git reflog main` shows no action of mine
(its top entry is S1's close commit). The main tree's `git status --short` at the end lists the three untracked
steps-dir files plus `mcp/test/fixtures/` and `mcp/test/tool-schemas.ts` — the last two are S2's in-flight work,
not mine; my only write in the main tree is this file. `feat/agent-bridge` is a pre-existing branch, untouched.

## Deviations

None from the brief. The S6 ledger (`S6.ledger.md`) is the step agent's; I did not edit it.

## Findings

- F1 (as Stage 0 F7 said, not re-measured): the Part 1–5 trees are not buildable on their own — e.g. Part 1's
  `extension/src/content/locate.ts` uses `LocateResult`, which Part 2's `shared/src/protocol.ts` adds. Only the
  final tree is pinned (0.6's amendment). I did not run typecheck/test on intermediate trees.
- F2: Part 6's diff (101 files) touches only `docs/`, `CLAUDE.md`, `README.md` (`git show --name-only --format= release/step8 | grep -vE "^(docs/|CLAUDE.md|README.md)"` → 0 paths): Parts 1–5 already carry every
  non-doc change, confirmed by the final tree equality (`git diff a1932a8 release/step8` empty).
- F3: no tag created, nothing pushed; G10-1 (tag `step8`, push) still waits for the user.
