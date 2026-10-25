# L2 builder report — split CLAUDE.md, archive decisions

Model: Sonnet 5.5 (builder, effort high). Date 2026-10-25. Baseline for every comparison: commit `817f8b1`.

**Continued from a stopped builder's partial state.** An earlier builder hung on an API call and was stopped. It
had already written the new root `CLAUDE.md`, the package files, the restructured `docs/decisions.md`, the
archive files and one pointer fix. I audited that state with the proof script below, changed it in only four
places (listed under Deviations and Findings), and added what was missing: the proof script, the history
table, this report, the commit.

## 1. Verdict
**DONE.** L.1, L.3 and L.4 pass; `scripts/doc-check.mjs` is clean for the `CLAUDE.md` files and the
decisions files (L.2). Not run: L.5 (the session agent's L3 stage).

## 2. Outputs
Files: `CLAUDE.md`, `daemon/`, `extension/`, `extension/src/{content,evaluate,handlers}/`, `mcp/`, `recipes/`,
`sdk/`, `shared/` `CLAUDE.md`; `docs/decisions.md`; `docs/decisions-archive/step{6,7,8,9,10}.md`;
`docs/plans/2026-10-25-lean-procedures-steps/{check-l2.mjs, claude-md-history.md, L2-builder.md}`;
one pointer in `docs/e2e-test-plan.md`.

Words per `CLAUDE.md` (`wc -w`; budgets: root 3,000, packages 3,500):

| File | Words |
|---|---|
| `CLAUDE.md` (root) | 2,170 |
| `extension/CLAUDE.md` | 3,499 (1 word under budget) |
| `daemon/CLAUDE.md` | 1,977 |
| `recipes/CLAUDE.md` | 1,839 |
| `sdk/CLAUDE.md` | 724 |
| `mcp/CLAUDE.md` | 611 |
| `shared/CLAUDE.md` | 136 |
| `extension/src/content/CLAUDE.md` | 910 |
| `extension/src/evaluate/CLAUDE.md` | 540 |
| `extension/src/handlers/CLAUDE.md` | 250 |

Old: one file of 13,337 words. New total 12,256 words over ten files. `docs/decisions.md`: 2,457 words
(budget 10,000), down from 37,240 words with the archive split off.

Archive (entries moved verbatim, numbers unchanged):

| File | Numbers | Entries |
|---|---|---|
| `decisions-archive/step6.md` | #1–#36 (incl. #2b) | 37 |
| `decisions-archive/step7.md` | #37–#69 | 33 |
| `decisions-archive/step8.md` | #70–#127 | 58 |
| `decisions-archive/step9.md` | #128–#200, #202 | 74 |
| `decisions-archive/step10.md` | #201, #203–#229 | 28 |
| `decisions.md` (Log) | #230 | 1 |

`decisions.md` holds: Open decisions (none open; the struck-through lists are in git at `817f8b1`), Standing
decisions (110 one-line items in five groups, 23 marked "(check)" for the cleanup pass or the user), the archive
index, and #230.

## 3. Proof (`node docs/plans/2026-10-25-lean-procedures-steps/check-l2.mjs`, exit 0)
```
L.1  old gotcha items: 91; CLAUDE.md files now: 10
  headlines found in exactly one file, once: 91/91
    extension/CLAUDE.md: 33   daemon/CLAUDE.md: 16   recipes/CLAUDE.md: 16   extension/src/content/CLAUDE.md: 8
    mcp/CLAUDE.md: 4   sdk/CLAUDE.md: 4   extension/src/evaluate/CLAUDE.md: 4   CLAUDE.md: 3   extension/src/handlers/CLAUDE.md: 3
  items with more than 2% of their six-word runs changed (history notes excluded): 10   [explained below]
  Key files: 1491 old words; 7 changed region(s) [all bullet joints or removed history notes, see below]
  history notes left in CLAUDE.md files: 0
L.3  old '### ' entries: 231; new (decisions.md + archive): 231
  entries present once, text identical: 231/231
Standing decisions: 110 lines; each names an existing entry in its file: 110/110
Archive index: 5 rows, entry counts match the files
L.4  files changed since 817f8b1 (tracked + untracked): 21; not .md / doc-check: 2
    docs/plans/2026-10-25-lean-procedures-steps/check-l2.mjs   start-bridge-linux.sh
RESULT: all checks pass
```
L.4: the two non-`.md` files are my proof script and the user's untracked `start-bridge-linux.sh`, which I did
not touch or commit. No code file changed. (The script's file count includes untracked files.)

The plan's L.1 names `0e79130:CLAUDE.md`; the brief names `817f8b1`. The two are identical for `CLAUDE.md`
(`git diff 0e79130 817f8b1 -- CLAUDE.md` is empty); `decisions.md` differs by the 19 lines of #230.

The 10 "changed" gotchas are not content loss. For each I diffed old against new word by word: the differences are
(a) a pointer fixed to name the new file ("gotcha above" to `extension/src/content/CLAUDE.md`, "(Commands)" to
"root `CLAUDE.md`, Commands"), (b) the old file's bold group sub-headings ("Step 7 — tabs …", "Step 9 — safety
…", "Driving Chrome from outside …") that trailed the last bullet of a group and are gone, (c) the `60 log
sites` correction note, (d) the next bullet fused to the end of the item by my slicer. The Key files check shows
the same: its 7 regions are the `- ` bullet separators between packages and the removed superseded notes.

## 4. Merged / moved gotchas (L.1)
All 91 headlines are present exactly once. Three sit in the root rather than the package the map names; none was
merged away or sent to `docs/agent-rules.md`:
- **Editing extension code requires a manual reload.** Map said `extension/CLAUDE.md`. It binds the MCP and
  daemon rebuilds too (it already carried the `/mcp` and build-id handover sentences), and every agent should see
  it, so it is in the root "Gotchas that cut across packages". Pointer in `docs/e2e-test-plan.md` §1 item 9 fixed
  to name it.
- **`npm run typecheck` chains the projects with `&&`.** Not in the map; spans all packages. Root. (The
  `recipes/CLAUDE.md` bullet "Recipes run with `tsx`" keeps its own pointer to root Commands.)
- **A scratch worktree never shares `node_modules` through a junction.** Spans packages (Windows tooling). Root.

Also kept in the root as binding rules (map: "about 8 short bullets"): 8 bullets under "Invariants that bind
every package", each pointing to the package file with the measured fact.

## 5. History notes
`claude-md-history.md` has the table. The plan said 37 notes; a scan of the old file finds **43** (41 Superseded
or Corrected, 2 Updated), one text appearing twice (rows 14 and 30). The two Updated notes held measurements, kept
as plain text. Rows 37–43 sat in the removed step-history block and Docs section.

## 6. LESSONS check (item 4: `next-session-prompt.md` § 2, 14 items)
| LESSON | Where it lives now |
|---|---|
| Runner returns on every STOP (#192, #193) | `docs/agent-rules.md` §3 item 1, §6 Live runner |
| Fresh agents, never resumed (#225) | `docs/agent-rules.md` §8 |
| No `node_modules` junction in a scratch worktree (#220) | root `CLAUDE.md` gotcha |
| Commit before dispatching a runner (#213) | `docs/agent-rules.md` §10 |
| PowerShell 5.1 drops an empty `-File` argument (Run 15 RET-1) | `recipes/CLAUDE.md` (`-ArgLine ''` gotcha, already there) |
| Headless `claude -p` actor calls `ToolSearch` first | `recipes/CLAUDE.md` (headless actors gotcha) |
| Session restore adds windows after a relaunch (#223) | `recipes/CLAUDE.md` (stable window set, own marker window) |
| Hung child stopped when its transcript has not grown for an hour | `docs/agent-rules.md` §8 |
| `[chrome.debugger] ` prefix on own coded errors (#227) | `extension/src/evaluate/CLAUDE.md` |
| MCP schema baseline changes only by a recorded re-baseline (#214) | `mcp/CLAUDE.md` (baseline fixture) |
| An upload sends a local file to a page: only wave files, fixture pages, `<ROOT>` paths | Step 11 phase doc `docs/plans/2026-10-25-step11-file-upload.md` (the `<ROOT>` and UP-6/UP-9 rows) |
| An `ok` is not evidence (background trusted CDP input) | `extension/CLAUDE.md` (trusted CDP input into a background tab gotcha); upload rows read the reporter in the phase doc |
| UI Automation facts (no Invoke pattern, second title line, `DevTools` title, popup, taskbar strip) | `recipes/CLAUDE.md` |
| Expected text tied to the product's constants | `recipes/CLAUDE.md` ("Expected texts are tied to …"); `docs/agent-rules.md` §2 (never edit after its run) |

No LESSON needed a new bullet. I did not touch `next-session-prompt.md` (the session agent's L3 lane).

## 7. Deviations from the brief and spec
- Reload gotcha and the two others in the root instead of a package file (section 4).
- `extension/CLAUDE.md` gained a three-line index of what lives in each `extension/src/{content,evaluate,handlers}/CLAUDE.md`
  (the brief asked for it). It pushed the file over budget; I shortened my own intro until it measured 3,499.
- `docs/e2e-test-plan.md` line 152 pointer changed to the root file (the earlier builder had pointed it at `extension/CLAUDE.md`,
  which does not hold that gotcha).

## 8. Findings
- `node scripts/doc-check.mjs`: for `CLAUDE.md` and decisions files, nothing. Remaining output is outside this stage:
  `docs/e2e-test-plan.md:1031` `recipes/blackboard/assemble-mcp.ts` is a dated historical note naming a retired
  file (left on purpose); the Step 11 phase doc and kickoff name files not yet created or retired skills
  (`role-prompts.md`, `asbuilt.md`) and `next-session-prompt.md` is 7,617 words against 1,500: all L3.
- Pointers in `docs/plans/next-session-prompt.md` (lines 137, 211, 312, 404) still say "CLAUDE.md Runtime gotchas";
  that file is rewritten in L3. Older plans and `handoffs.md` are records and keep their wording.
- `extension/CLAUDE.md` sits at the budget edge (3,499 of 3,500). The first cleanup pass (L4) should move something
  out of it, for example the Safety gate section's measured-run detail.
- The session agent's uncommitted `docs/plans/2026-10-25-step11-file-upload.md` is not in this commit.

## 9. Handoff
L2 is committed (not pushed). Verifier (Opus): re-run `check-l2.mjs`, and read 10 gotchas of its choosing against
`git show 817f8b1:CLAUDE.md`, plus the root Invariants bullets against the packages they point to.
