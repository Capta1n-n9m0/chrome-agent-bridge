# S8 verifier brief — retire the chunked MCP recipe; Step 10 docs

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server + Chrome MV3 extension;
TypeScript; vitest). Shell: Git Bash on Windows. Checks: `npm run typecheck`, `npm test`, `npm run build`. Read
CLAUDE.md first; its "Runtime gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push, never tag; S8 is OFFLINE — do not start
the daemon, do not touch Chrome; never log URLs, header values or bodies. Report in the exact format requested.
Never invent results — if something did not run, say so. No internal codes without a one-line gloss. Model: Claude
Opus 5.5. You are a level-2 agent: you must NOT spawn agents. Finish in one go: run long commands in the background
with a bounded timeout and collect them before you report; never a foreground command that can hang. Node first in
every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

## Role: independent Verifier (stage S8)

You may read and run; you may NOT edit any file in the main tree (your own report excepted).

Inputs: the builder brief `briefs/S8-builder.md` (the stage texts, work items, lane — read it in full; its ESCALATION
list, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR and lessons bind you too) · the builder report
`S8-builder.md` and `S8-claude-md-proposals.md` in the steps dir — **claims to audit, not facts** · the as-built
register `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md` · the change = the uncommitted main tree against
`312cadb` (`git status`, `git diff 312cadb`; the builder did not commit).

### Clean worktree (mandatory, #220)
Make a scratch worktree at `312cadb` outside the repo in the scratchpad or `%TEMP%` (`git worktree add <dir>
312cadb`), apply the main tree's change to it (`git -C <main> diff 312cadb --binary > patch; git -C <dir> apply
patch` — deletions included), run `npm ci` in it (NEVER a `node_modules` junction or symlink), and run there:
`npm run typecheck`, `npm test`, `npm run build`, `git status --porcelain` after the build, and every
`recipes/tsconfig*.json` with `npx tsc --noEmit -p`. Also run `npm test` at bare `312cadb` (a second worktree, or
in the same one before applying the patch) to re-derive the before count. Remove the worktree(s) with
`git worktree remove --force` at the end (never `rm -rf` across a `node_modules` link).

### Checks
1. **S8.1 (verbatim):** "the retirement's removed tests listed per file with the count change; `grep -rn
   "assemble-mcp\|transcript.ts" recipes docs/setup.md` finds only dated history notes; every new `CLAUDE.md`
   gotcha cites its source. *Amended 2026-10-24 (Stage 0 F9): the removed tests are the 7 of 0.5's note (count
   −7).*" Run the grep yourself, paste its output, judge each hit. Confirm by test name diff (`vitest list` or
   grepping `it(`/`test(` before vs after) that exactly 7 tests went and they are the ones 0.5's note names (5
   `parseTranscriptChunks` + the `assemble` test in `blackboard-export-file.test.ts`, 1 in `blackboard-held.test.ts`)
   and that no remaining test lost coverage of something still in the code. Count: before − 7 exactly.
2. **Retirement completeness:** nothing anywhere (repo-wide, incl. docs that tell someone to run these files,
   package.json scripts, tsconfigs) still references `assemble-mcp.ts`, `transcript.ts`, `assemble(` or
   `parseTranscriptChunks` except dated history notes and committed historical records (stage reports, run
   records, decisions.md — those stay). `--mcp-plan` still exists and its help text names `browser_evaluate
   {saveTo}`.
3. **Byte-for-byte texts (#198):** for every user-visible text the docs quote (tool descriptions, error/warning/
   status lines, codes, parameter names, `-WaitSec` and its default, `evaluateToFile`'s signature, the 800-cap
   warning, `saveTo`'s answer, `JS_DISABLED`'s message), find it in the code yourself and diff it. Check also the
   texts the builder did NOT cite. Any mismatch is a MAJOR.
4. **History untouched:** `git diff 312cadb -- docs/e2e-test-plan.md` adds only dated notes; no row of §4.20–§4.22,
   no run record, no expected text changed (show the diff hunks). Same for any "Superseded"/dated-note edits in
   setup.md/README/roadmap: old facts kept in the note, not silently replaced.
5. **Lane:** every changed file is in the lane of the builder brief; `sdk/src/policy.ts` changed only in comments
   (prove it, e.g. compare with comments stripped, or show the diff); no change in `shared/ daemon/ mcp/
   extension/` or in `decisions.md`, the as-built register, `CLAUDE.md`.
6. **Item 3:** re-derive the cause of `recipes/tsconfig.s6.json`'s failure at `312cadb` (count the errors, name the
   files and import chains), check the builder's "29, not 26" claim and the commits it names (`e91e437`,
   `b55048d`), and confirm the fix (an exclude) does not drop any file from all typechecks: every excluded test must
   be covered by another recipes tsconfig that passes. Is the exclude the right shape (vs a `types` entry), and
   does `npm test` still run those tests?
7. **CLAUDE.md proposals:** every gotcha candidate from S1.md, S2.md, S4.md, S4b.md, S5.md, S7.md is present with a
   correct source (open the cited report and item); the counts are right (26 codes/25 on the wire per
   `shared/src/codes.ts`; router methods per `extension/src/safety.ts` `METHOD_CLASSES` and `daemon/src/methods.ts`;
   tools per `mcp/src/tools/registry.ts`; tests per your run; the 45-fixture count per
   `extension/test/fixtures/snapshot-pre-s1.json`); new key files map to real files.
8. **Roadmap block:** each stage's commit hash and outcome matches `git log` and the as-built register.
9. Nothing logs or commits a URL from a real site, a token, or a student's data (the repo is public): grep the
   diff for `://` outside fixture/localhost/docs-of-record contexts and for the token's value by count (never print
   it).

Output: `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S8-verifier.md`: numbered findings, each with severity
(CRITICAL / MAJOR / MINOR / NIT), location (`file:line`), evidence (command + output excerpt), suggested fix; the
counts before → after; then the verdict: **FAIL** if any CRITICAL or MAJOR finding or S8.1 fails; MINOR/NIT only →
**PASS-with-notes**; else **PASS**. Report findings; never rewrite the spec, the plan or the docs. Return a ≤ 15-line
summary with the verdict.

