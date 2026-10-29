# Gotcha placement — cleanup pass 2026-10-29

Scope: `git diff 510b407..HEAD` for every CLAUDE.md. Word counts (`wc -w`): root 2151 (budget 3000), daemon 1860, sdk 1643,
mcp 1139, shared 155, recipes 2734, extension 3428 (budget 3500 for these six), `extension/src/` 978, content 986,
handlers 494, evaluate 441 (budget 1200). Nothing is over budget; `extension/CLAUDE.md` has 72 words left.
doc-check reports no budget finding. The applied gotchas sit with their code. Findings below are placement gaps and a stale Key files list.

1. **Key files, recipes: all Step 12 recipes are missing.** `recipes/CLAUDE.md:5-30` (and `recipes/README.md:43-44`) end at
   `s11b-r17b…`. Not named anywhere in either file: `s12-forms{,-b,-c}.ts`, `s12-oldbuild.ts`, `s12-rules.ts`, `s12-r18.ps1`,
   `s12-r18-lib.ps1`, `s12-r19{,-a,-b,-c,-de}.{ts,ps1}`, `s12-r19-lib.ps1`, `s12-win{,-b,-c}.ps1`.
   Evidence: `git ls-files recipes` lists them; `grep s12 recipes/CLAUDE.md` finds only "Run 19's helper facts" prose (line 162+).
   Fix: add an "(Step 12 S1-S7, Runs 18-19)" entry beside the s11b one, grouped by prefix. Mechanical for the file list,
   but the one-line role of each needs the S1/S7 docs (Sonnet doer).
2. **`recipes/CLAUDE.md:30` and root `CLAUDE.md:120`: the tsconfig list is stale.** Text says `tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json …
   all seven exit 0, 2026-10-27` and root says "all seven exit 0 at Step 11b S4-helpers". `recipes/tsconfig.s11b.json` now also
   includes `s12-r19-a/b/c/de.ts` and their tests, while the other `s12-*` files are in no tsconfig (`tsconfig.json` includes only
   `hello.ts`, `t5*.ts`). Fix: state that `.s11b` also covers the Run 19 files, say where `s12-forms*`/`s12-r18*` are
   typechecked or that they are not, and re-run the seven for a fresh date. Needs a run to confirm; the wording is mechanical.
3. **Key files, extension: `extension/src/evaluate/wrap.ts` and `extension/src/handlers/{actions,evaluate,navigate,perceive}.ts`,
   `content/{actions,geometry,index,refmap}.ts` are not named in any CLAUDE.md.** Probably older than Step 12 (not in the diff),
   so a long-standing gap and low priority. `extension/src/handlers/CLAUDE.md` has no Key files list and only points to
   `extension/CLAUDE.md`. Evidence: file-name grep of all CLAUDE.md. Fix: name them or state "other handlers are listed by
   method in `sw.ts`". Needs-the-user whether to spend the words (extension/CLAUDE.md has 72 left).
4. **Key files, sdk: `sdk/src/format/network.ts` and `format/snapshot.ts` unnamed** (`sdk/CLAUDE.md` names the `format/` dir and
   the new `console-messages.ts`, not these two). Evidence: grep. Fix: one clause "`format/{snapshot,network,console-messages}.ts`".
   Mechanical.
5. **Duplicate, three places: "returnByValue sorts object keys".** Full gotcha at `extension/src/evaluate/CLAUDE.md:~26` (the
   right home), a pointer entry at `sdk/CLAUDE.md:120`, and the Run 19 result is also in `docs/` records. `sdk/CLAUDE.md:120-121`
   is a pointer with a "compare by key" rule, which is acceptable (#232 asks a pointer in other packages). No fix beyond
   confirming `mcp/CLAUDE.md` (where `browser_evaluate` is described) has a pointer too: it has none. Suggest a one-clause pointer
   in the `browser_evaluate` entry of `mcp/CLAUDE.md`. Needs-the-user only if budget is tight (mcp has room: 1139).
6. **Gotcha not mirrored to the other side: "A same-site frame's console messages are read".** Home `extension/src/CLAUDE.md:59`
   (right) and `mcp/CLAUDE.md:65-66` (pointer, good). The SDK side, `sdk/CLAUDE.md`, names `formatConsole` and the cap but not
   the frames fact, and says nothing for `Tab.consoleMessages`. Low value; fix optional: one pointer. Needs-the-user (judgement).
7. **Placement check, passed (no action):** trusted-input lock hold and feature-in-hello are in `daemon/CLAUDE.md` (their code is
   `daemon/src/methods.ts`, `intercept.ts`), with `extension/CLAUDE.md:17` (hello `features`) and `mcp/CLAUDE.md` (rethrown
   `VERSION` line) pointing; replayed-console-args, kept session and chooser upload sit in `extension/src/CLAUDE.md`, whose
   load-trigger header (lines 1-5) was extended to name `console-messages.ts` and `debugger-keeper.ts`; MCP refusal-lines and the 20 000
   character cap are in `mcp/CLAUDE.md` and `sdk/CLAUDE.md` (formatter); the `console.` substring gotcha is in `sdk/CLAUDE.md` beside
   `sdk/test/failure-report.test.ts`. Counts: 25 tools, 28 methods consistent in root, mcp, extension; no stale "24 tools" or "all 27".
8. **`extension/CLAUDE.md:94` DevTools-docked measurement (#369) is a measured fact in the general extension file about
   `debugger-errors.ts` mapping, and `recipes/CLAUDE.md:171-172` repeats it.** Both are marked as the same observation, with
   `recipes` pointing to `extension/CLAUDE.md`. Fine as a pointer; flag only because the extension file is the near-budget one and
   this is tagged "open for the user" (#369): once ruled, shorten. Needs-the-user.
9. **Root `CLAUDE.md:117` test count 5596** is flagged by doc-check ("Test counts stated … 5596 passed"). Lead to compare with the last
   `npm test`; I did not run it. Mechanical if it differs.
10. **Budget margin:** `extension/CLAUDE.md` 3428/3500 words. The next gotcha must go to `extension/src/CLAUDE.md` (978/1200) or a
    deeper file. No action now.

Counts: 10 raised; 4 mechanical (1 file list, 2 wording, 4, 9), 4 needs-the-user (3, 5, 6, 8), 2 no-action (7, 10).
