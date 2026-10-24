# S6 verifier report — the local `release/step8` branch

Independent verifier, 2026-10-25, Opus 5.5. Read-only on git (no branch, tag, commit, checkout, worktree);
my only write is this file. I ran every check myself before reading `S6-builder.md`.

**Verdict: PASS-with-notes.** Every S6.1–S6.3 item and the Variant C checks hold. The notes are about the
expected, already-ruled state of the intermediate trees and about worktrees that another stage created after S6.

## S6.1 — final tree equals the close

```
$ git diff a1932a8 release/step8 | wc -c
0
$ git rev-parse a1932a8^{tree} release/step8^{tree} release/step8 70aa754
4e57b16a8527f3a775d87441379c56c649e1f92d
4e57b16a8527f3a775d87441379c56c649e1f92d
db72e9a0f2a28cbedc0fcd77b2cf2ea2b5c5bdcf
70aa7542ee0e5c8a78ba16820d1272715dfadacf
```
PASS.

## S6.2 — subjects, shape, trailers, bodies

Expected subjects came from the phase doc: lines 1218–1222, leading blanks stripped, lines joined with one
space, backticked spans extracted (`sed -n 1218,1222p … | sed 's/^ *//' | tr '\n' ' ' | grep -o '`[^`]*`' | tr -d '`'`).
```
$ cat -A expected.txt            $ git log --reverse --format=%s 70aa754..release/step8 | cat -A
feat(extension): locators resolved by the snapshot's rules; waitFor locator; evaluate asRef$
feat(sdk): typed Tab API with cursor and locators$
feat(sdk): failure reports with snapshot, screenshot and network$
feat(mcp): cursor that does not follow the human; browser_use_active_tab; locator fields$
feat(recipes): hello, boot-bb, export-grades$
docs: Step 8 E2E results$
(identical in both files)
$ cmp expected.txt actual.txt && echo CMP-EQUAL
CMP-EQUAL
$ git rev-list --count 70aa754..release/step8 ; git rev-list --merges 70aa754..release/step8 | wc -l
6
0
$ git log --reverse --format='%H %P | author | committer' 70aa754..release/step8
c94fa5dc… 70aa7542ee0e5c8a78ba16820d1272715dfadacf | Abbas Aliyev <alievabbas1@gmail.com> 02:17:59 | same
86c91bba… c94fa5dc…  | … 02:18:01
f63c705b… 86c91bba…  | … 02:18:03
08b7e4a7… f63c705b…  | … 02:18:06
6dabc082… 08b7e4a7…  | … 02:18:12
db72e9a0… 6dabc082…  | … 02:18:12   (all 2026-10-25 +0400, author = committer)
```
Linear, one parent each, first parent of Part 1 = `70aa7542ee0e5c8a78ba16820d1272715dfadacf`.

Trailers: `git cat-file commit <c> | tail -3 | od -c` ends `…nNSW\n` for all six (no trailing blank line).
```
$ (per commit) grep -c '^Co-Authored-By:\|^Claude-Session:' ; git log -1 --format='%(trailers:only)'
      6 2
      6 Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
      6 Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW
```
Exactly the two trailers, last, in each.

Originals' co-authors:
```
$ git rev-list --count 70aa754..a1932a8 ; git rev-list --merges 70aa754..a1932a8 | wc -l
60
0
$ git log --format='%(trailers:key=Co-Authored-By,valueonly,separator=;)' 70aa754..a1932a8 | sort | uniq -c
     60 Claude Opus 5.5 <noreply@anthropic.com>
```
No other co-author, so no body needs to name one.

Bodies: the `- <hash7>` lines across the six bodies, sorted, against `git log --format=%h 70aa754..a1932a8 | sort`:
60 lines, no duplicates, `diff` empty (SETS-EQUAL). Every listed subject equals `git log -1 --format=%s <hash>`
(0 mismatches). Part map: P1 `e9e5e8c 6742c1f 357f776 efb8557`; P2 `dcb72db db242b6`; P3 `26df11b`; P4 `aa113df
201f5c8 03254d9`; P5 `6398f27 23b878f bc78ded 036909f 7c16a00 75f0bd6`; P6 the other 44. This is S7.md §4's table
(which puts `23b878f` in the recipes Part) plus F7's amendment (five recipe commits in Part 5, `201f5c8` in Part 4).
PASS.

## Variant C conformance

```
Part  doc paths changed vs parent   non-doc paths changed   forbidden paths
1     0                             68                      0
2     0                             15                      0
3     0                             5                       0
4     0                             11                      0
5     0                             33                      0
6     101                           0                       0
$ git diff --name-only 6dabc08 a1932a8 -- . ':!docs' ':!CLAUDE.md' ':!README.md' | wc -l
0
```
(doc = `^(docs/|CLAUDE\.md$|README\.md$)`; forbidden = `(^|/)dist/|bridge\.token|(^|/)\.env|(^|/)exports/|\.png$`.)

Per-Part content check: for each Part 1–5, (a) the union of non-doc files touched by its assigned commits
(`git diff-tree -r --name-only`) equals the Part's non-doc file list — equal for all five (68/68, 15/15, 5/5, 11/11,
33/33); (b) for each such file, the blob at the Part equals the blob after the last assigned commit touching it in the
original history. One difference, explained:

```
Part 1: BLOB MISMATCH shared/src/error.ts  efb8557 → d6df91e…  vs Part 1 → 747d31a…
Part 2: BLOB MISMATCH shared/src/error.ts  dcb72db → a40cbf9…  vs Part 2 → d6df91e…
```
`shared/src/error.ts` is touched by `dcb72db` (S0, Part 2) and later by `efb8557` (S2b, Part 1). Because Part 1
precedes Part 2, Part 1 holds S2b's change without S0's one-line comment edit ("outside the 22" → "outside
`ErrorCodes`"), and Part 2 adds that edit, ending at `efb8557`'s blob `d6df91e`. `git diff c94fa5d 86c91bb --
shared/src/error.ts` is exactly that one comment line. Each Part carries exactly its commits' changes; not a defect.

Commits not assigned to Parts 1–5 touching any non-doc path: none (Stage 0 F7's `01fc58e`, `117b16a`, `8dbcd00`
touch only `CLAUDE.md`, `README.md`, `docs/`, and are in Part 6). PASS.

## S6.3 — main, forbidden paths, tags, worktrees, remote

```
$ git rev-parse main
0d189a0bc59479a6aa1dcd1dcda913c249859e6d
$ git merge-base --is-ancestor 0d189a0bc59479a6aa1dcd1dcda913c249859e6d main && echo ok
ok
$ git reflog -n 8 main      (all "commit:" entries, top = 0d189a0 S1 close; no reset/rebase/amend)
$ git tag -l step8                         (empty)
$ git tag --points-at release/step8        (empty)
$ git tag --contains c94fa5d               (empty)
$ git branch -r | grep -i release          (empty)
$ git for-each-ref --format='%(refname)' | grep -i release
refs/heads/release/step8
$ git reflog -n 10 release/step8
db72e9a release/step8@{0}: branch: Created from db72e9a0f2a28cbedc0fcd77b2cf2ea2b5c5bdcf
$ git worktree list
C:/Users/aliev/Projects/chrome-remote-extention   0d189a0 [main]
…/scratchpad/wt-base  0d189a0 (detached HEAD)
…/scratchpad/wt-f45   f45e3bf (detached HEAD)
…/scratchpad/wt-mut   0d189a0 (detached HEAD)
```
Forbidden paths: 0 in each of the six commits' file lists (table above). Main untouched, no tag, no remote ref,
the branch created once and never moved. PASS, with note N2 on the worktrees.

## Attack

- No merge commits on the branch or in the original range; author = committer = the repo's git user; timestamps
  02:17:59–02:18:12, one build run.
- Based on `70aa754` (first parent of Part 1), not on something else; `release/step8` is only on local refs.
- No stray files: Part 6's tree equals `a1932a8`'s, so nothing extra can be in it; Parts 1–5 change only the files
  their commits change.
- Part 5 also changes `.gitignore` and `package.json` (from `23b878f`); both blobs equal the originals' (check (b)).

## Notes

- **N1 (expected, ruled):** the Part 1–5 trees do not build. Part 1's `shared/src/protocol.ts` has 0 occurrences of
  `LocateResult`/`Locator`/`WaitForParams`/`isLocator`, while Part 1's `extension/src/content/{index,locate,marked}.ts`
  and `handlers/evaluate.ts` import `LocateResult`. Stage 0 F7 and 0.6's amendment (#208) accept this: only the final
  tree is pinned. Someone bisecting `release/step8` should know it.
- **N2 (not S6's):** `git worktree list` shows three detached worktrees under the scratchpad (`wt-base`, `wt-f45`,
  `wt-mut`). `.git/worktrees/*` were created at 02:22:04–05, after the S6 build finished (02:18:12), at `0d189a0` and
  `f45e3bf` (a main commit), which matches the S2 verifier brief (a worktree at `f45e3bf`, a mutation worktree). The
  builder's own `s6rel` worktree is gone. The S2 stage should remove these worktrees before it closes, so that "one
  worktree (main)" holds at the step's close.
- **N3:** the builder's report matches my checks on every point it makes (tree, subjects, map, trailers, forbidden
  scan, main unchanged, F1/F2/F3).
