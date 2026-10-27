# Gotcha placement: area cleaner findings, cleanup pass 2026-10-27

Ran on Sonnet 5.5, effort medium. Read only; nothing edited except this file. Base `1c29942`..HEAD `39619cc`.
Word counts below are `wc -w` on the line ranges (doc-check counts `split(/\s+/)`, the same thing).
Files checked: root, shared, daemon, sdk, mcp, extension, `extension/src/{content,evaluate,handlers}/CLAUDE.md`, recipes.

## Findings

1. **`recipes/CLAUDE.md:25-26`, Key files omits every Step 11b recipe and the new tsconfig.** Mechanical.
   - Evidence: the list ends at `s11-win.ps1` + `s11-win-rules.ts` "(Step 11 S5, Run 16), `tsconfig{,.fe,.s6,.s9,.s10,.s11}.json` (… all six exit 0 since S3c)". `grep s11b recipes/CLAUDE.md` finds only line 150 (a gotcha). The tree has `s11b.ts`, `s11b-rules.ts`, `s11b-win.ps1`, `s11b-win-rules.ts`, `s11b-r17.ps1`, `s11b-r17-plan.ts`, `s11b-delay.py`, `s11b-flip.py`, `s11b-slow.py` and `tsconfig.s11b.json`.
   - The root `CLAUDE.md` Commands line already says `.s11b` and "all seven exit 0 at Step 11b S4-helpers".
   - Fix: add one clause, "`s11b.ts` (SDK actor) / `s11b-rules.ts` / `s11b-win.ps1` + `s11b-win-rules.ts` / `s11b-r17.ps1` + `s11b-r17-plan.ts` (block runner) / `s11b-{delay,flip,slow}.py` (fixture servers) (Step 11b, Run 17)". Change the tsconfig list to `{,.fe,.s6,.s9,.s10,.s11,.s11b}` and "all six" to "all seven". About +45 words, and recipes is 2267 of 3500, so it fits.

2. **`extension/CLAUDE.md:229-235` says a `back`/`forward` redirect is "unmeasured", and the bullet names only `navigate` and `downloadStart` as covered. The code and the root block say they are covered.** Needs-the-user (it is a rule text; a wording fix is mechanical once the user agrees).
   - Evidence: the bullet reads "While a `navigate` or `downloadStart` runs, session DNR rules … hold" and "a redirect through `back`/`forward` is unmeasured (#308)". But `extension/src/safety-dnr-keeper.ts:6` says "A covered call (`dnrScopeOf`: `navigate`, `back`, `forward` on their tab; `downloadStart` …" and line 66 builds the scope for `back`/`forward` (#296). The root `CLAUDE.md` Current state says "while a bridge `navigate`, `back`, `forward` or `downloadStart` runs".
   - Fix: "While a `navigate`, `back`, `forward` or `downloadStart` runs …; a redirect through `back`/`forward` is covered by the rules but unmeasured (#308)". Do it in the same edit as finding 7, since the bullet moves.

3. **`extension/CLAUDE.md:39-62`, Key files: the Step 11b entries are present and match the tree; two small gaps.** Mechanical.
   - Present: `safety-dnr.ts` (49), `safety-dnr-keeper.ts` (50), `safety-hop.ts` (52), `upload-exists.ts` (53), `upload-paths.ts` home-folder predicate (53). No dead entries found. Every `extension/src/*.ts` is named, except `handlers/history.ts`, `handlers/navigate.ts`, `handlers/perceive.ts`, `handlers/wait.ts`, which are covered only by the glob `handlers/*`.
   - Gap a: `handlers/history.ts` carries a Step 11b gotcha (#308) in `handlers/CLAUDE.md` but is not named in Key files. Gap b: the manifest gained `declarativeNetRequestWithHostAccess` (`extension/manifest.json:8`) and no CLAUDE.md names that permission; `manifest.test.ts` is listed as a guard only.
   - Fix: add `handlers/history.ts` (`back`/`forward`, #308) to the list, and name the permission in the DNR gotcha (finding 7). About +15 words.

4. **`extension/src/handlers/CLAUDE.md:25-31`, the back/forward gotcha sits after two pointer paragraphs and the document's bullets are split.** Mechanical.
   - Evidence: the file has three bullets (`browser_download`, `tabId`, `newTab`), a fourth (`screenshot`), then two pointer paragraphs ("Redirects onto blocked hosts … are in `extension/CLAUDE.md`, Safety gate." and "The upload handler's file-access refusal … `extension/CLAUDE.md`, Uploads (Step 11)."), then the new `goBack`/`goForward` bullet.
   - Placement of that bullet is correct (it binds `history.ts`, #232), but the order reads as an afterthought. Fix: move the two pointer paragraphs below the last bullet. If finding 7 moves the firewall bullet, retarget the first pointer to `extension/src/CLAUDE.md`.

5. **`extension/CLAUDE.md:3-7` and `docs/agent-rules.md:14-15` list the sub-folder CLAUDE.md files; a new `extension/src/CLAUDE.md` must join both lists.** Mechanical, only if finding 7 is approved.
   - Evidence: agent-rules §1 reads "`extension/src/{content,evaluate,handlers}/` loads by itself the first time you open a file in that package". extension/CLAUDE.md line 3 says "Three sub-folders have their own `CLAUDE.md`".
   - Fix: "Four", plus a line for `src/` (the safety gate's redirect and `file:` rules); add `extension/src/` to the agent-rules brace list; `docs/agent-rules.md` is also in the Procedure area's scope.

6. **Duplicates across files: none that bind.** No action.
   - Checked: "Never log" (root Invariants point to extension; daemon names only the marker line), `file:` gate (root Current state is status; the gate text is only in `extension/CLAUDE.md:261-266`), "Allow access to file URLs" (extension only), background-tab trusted input (extension 155-163 vs `sdk/CLAUDE.md:104`: the SDK entry restates the fact with a different focus on `focusFirst`; it is a pointer-shaped overlap, not a copy), upload files check (`sdk/CLAUDE.md` realpath bullet ends with a pointer to `extension/CLAUDE.md` Uploads, correct per #232).
   - `extension/CLAUDE.md:146-147` already uses the pointer form to `src/handlers/CLAUDE.md`; model new pointers on it.
   - One drifted number: `extension/CLAUDE.md:62` and `:248` say "54 log sites"; `log-allowlist.ts` has 54 entries (counted), so it is true.

7. **`extension/CLAUDE.md` is 3787 words against a 3500 budget (`doc-check.txt:9`): 287 over. A plan follows.** Needs-the-user (it moves `CLAUDE.md` rules; `cleanup-pass` says the lead only proposes those).

## Which directories have a CLAUDE.md, and would a new one load

Existing: root, `shared/`, `daemon/`, `sdk/`, `mcp/`, `extension/`, `extension/src/content/`, `extension/src/evaluate/`, `extension/src/handlers/`, `recipes/`. `extension/src/` has none (there is no CLAUDE.md in the `extension/src` directory itself), and `extension/test/` has none.

Claude Code loads a nested `CLAUDE.md` when a file in or under its directory is opened. So a new `extension/src/CLAUDE.md` loads when `extension/src/safety-dnr.ts` is opened (and for any other `.ts` file directly in `src/`, and, together with the sub-folder file, for `content/`, `evaluate/` and `handlers/` files). It cannot be limited to the `safety-*` files, because they sit flat in `src/`. It does not load for `extension/test/*.test.ts` or `extension/manifest.json`; `extension/CLAUDE.md` (which loads for those) keeps a pointer. The doc-check budget regex `/\/src\/.*CLAUDE\.md$/` gives a new `extension/src/CLAUDE.md` a 1200-word budget.

## Plan for finding 7: relocate verbatim to a new `extension/src/CLAUDE.md`

Line numbers are those of `extension/CLAUDE.md` as of HEAD. Words are `wc -w` of the line range, including the bullet's own lines.

**Core move (A): three Step 11b safety bullets, 381 words.**

| Lines | First words | Words |
|---|---|---|
| 229-235 | "- **The block list is not a network firewall; since Step 11b it stops redirect hops of a bridge call in flight.**" | 133 |
| 236-243 | "- **DNR facts the rule builder binds (`safety-dnr.ts`, Step 11b; Chrome 156 …" | 133 |
| 261-266 | "- **The gate refuses `file:` pages whatever the file-URL toggle says** (Step 11)" | 115 |

(Lines 229-243 are 266 words together, which `wc -w` confirms; 261-266 are 115, which are the `file:` bullet and its blank line.)
The `file:` bullet binds `safety.ts` and the DNR pair binds `safety-dnr*.ts` and `safety-hop.ts`; all are in `extension/src/`.

Left behind in `extension/CLAUDE.md`, at the end of the Safety gate section, one pointer paragraph of about 30 words: "The block list and redirect hops (Step 11b), the DNR rule builder's facts and the `file:` page rule are in `extension/src/CLAUDE.md`." (Same pattern as lines 146-147.)

- New `extension/src/CLAUDE.md`: 381 words plus a title and an intro of about 45 words = about **426** words (budget 1200).
- `extension/CLAUDE.md`: 3787 - 381 + 30 = about **3436** words (budget 3500). It passes, with about 60 words of room.
- Apply finding 2's wording (back/forward covered, unmeasured) and finding 3's manifest-permission note in the moved bullets, not in the shrunken file.

**Optional move (B), for headroom: the Uploads section, 192 words.**

| Lines | First words | Words |
|---|---|---|
| 268-276 | "### Uploads (Step 11)" then "- **`DOM.setFileInputFiles` needs the extension's "Allow access to file URLs"**" | 129 + heading |
| 277-281 | "- **The three shipped upload page sources are closure-free literal strings**" | 59 |

They bind `upload-exists.ts`, `upload-files.ts` and `handlers/upload.ts` (all under `src/`). A pointer of about 20 words stays. `handlers/CLAUDE.md:29` (the "upload handler's file-access refusal" paragraph) then points at `extension/src/CLAUDE.md`, and the sdk pointer ("`extension/CLAUDE.md` Uploads", `sdk/CLAUDE.md`, the realpath bullet) must be retargeted too.

- With A and B: new file about 426 + 192 = about **618**; `extension/CLAUDE.md` about 3787 - 381 - 192 + 50 = about **3264**.

**Not recommended:** moving Key files lines 39-62 (the Step 9/11 safety entries, 326 words) is the other natural block, but Key files is one list an agent reads to find a file, and splitting it would hide files.

Other bullets I would keep in `extension/CLAUDE.md`: they bind `tabs.ts`, `sw.ts`, `safety-state.ts`, `keys.ts`, `inject.ts`, `network-*`. Largest, if more room is ever needed: `The saveTo store` (109-119, 185 words, binds `evaluate-save-store.ts` and `debugger-errors.ts`, also under `src/`), then `Trusted CDP input into a background tab` (155-163, 159).

## Caveats

- A new `src/CLAUDE.md` loads for all of `src/` (including `content/`), so it adds about 430-620 words to those agents' context; the saving is for agents who open only `extension/test` or the manifest, who do not get it.
- Verbatim moves keep every `#N`, run id and number, so no measured fact is edited. The moved text must be checked with `git diff --color-moved`.
- Not done: I created no file and edited nothing, per the brief. The word results above are computed from `wc -w` plus an estimated 30-45 words for pointers and intro, so treat them as plus or minus 10.
