# Gotcha placement — cleanup pass 2026-10-27 (2), base c1a78b1

Budgets (doc-check): root 3000, package files 3500, `src/**` 1200. Words now: root 2114, daemon 1669, extension 3473,
extension/src 450, content 986, evaluate 373, handlers 496, mcp 934, recipes 2394, sdk 1526, shared 155. doc-check
reports no over-budget file and no duplicate gotcha. Only the root test-count line is flagged (state area).

## 1. `newtab-open.ts` is missing from extension/CLAUDE.md Key files — mechanical
- Location: `extension/CLAUDE.md:10-65` (Key files). The file `extension/src/newtab-open.ts` is new since base.
- Evidence: grep for `newtab-open` in every CLAUDE.md returns nothing. The S6 order (create `about:blank`, hold rules, settle, navigate) is in `src/handlers/CLAUDE.md:16` but no file entry names the module or its test `extension/test/s6-newtab-blank.test.ts`.
- Fix: add after the `handlers/history.ts` entry (line ~54): "`newtab-open.ts` (Step 11b S6: pure, injected; `newTab` with a URL opens `about:blank`, holds the rules, settles the blank load, then navigates; removes the blank tab if the hold or navigation throws)". About 35 words. The file has 27 words of headroom, so apply it together with finding 3 (which frees 209) or it goes over budget.

## 2. recipes/CLAUDE.md Key files omit the Run 17b recipes — mechanical
- Location: `recipes/CLAUDE.md:25-27`.
- Evidence: the entry lists `s11b-r17.ps1` + `s11b-r17-plan.ts` but not `s11b-r17b.ps1`, `s11b-r17b-build.ts`, `s11b-r17b-plan.ts`, `s11b-r17b-rules.ts`, all present in `recipes/`. Lines 156-161 (Run 17b's helper facts) cite Run 17b but not the files. The "all seven exit 0, 2026-10-27" tsconfig claim is unchanged (no new tsconfig).
- Fix: append to the Step 11b entry: "`s11b-r17b.ps1` + `s11b-r17b-{build,plan,rules}.ts` (Run 17b's runner, plan builder and pass rules, Step 11b S7)". About 20 words; 1100 words of headroom.

## 3. P9 assessment: move "Uploads (Step 11)" to extension/src/CLAUDE.md — placement-correct, recommend (mechanical)
- Section: `extension/CLAUDE.md:249-262` (heading plus two bullets), 209 words including the heading. Line 263 is blank. Line 264 is a stranded sentence (see finding 4).
- Do the gotchas bind files under `extension/src/`? Yes.
  - Bullet 1 (file-access check, `NO_FILE_ACCESS_MESSAGE`, `upload-exists.ts`, 5 s bound, `BAD_PARAMS` naming `paths[i]`, 15 s CDP bound) binds `extension/src/handlers/upload.ts` and `extension/src/upload-exists.ts`.
  - Bullet 2 (closure-free `UPLOAD_FINDER_SRC`, `UPLOAD_MARK_PAGE_FN`, `UPLOAD_UNMARK_PAGE_FN`) binds `extension/src/upload-files.ts`. The guard test is `extension/test/s3-closure-free.test.ts`, outside `src/`, but it guards `src/` code.
  - `extension/src/CLAUDE.md:4` says it "loads with any file under `src/`", which includes `src/handlers/upload.ts`. After the move an agent editing any of the three files sees the gotchas.
- Size: `src/CLAUDE.md` 450 + 209 = about 660 of 1200. `extension/CLAUDE.md` falls from 3473 to about 3264 (headroom for finding 1).
- Needed edits with the move:
  - New `## Uploads` section in `extension/src/CLAUDE.md`. Drop "(Step 11)" from the heading, since the section is named by step (previous pass, gotcha 12).
  - `extension/src/CLAUDE.md:3-5` header: add `upload-exists.ts`, `upload-files.ts` and `upload-paths.ts` to the "These bullets bind …" list. The line currently names only the safety files.
  - `extension/CLAUDE.md:5-9`: add an `src/` bullet topic "the upload's file-access, existence and closure-free rules". Leave a one-line pointer where the section was, or rely on the header list.
- Pointers to retarget (grep over the repo; only these three live ones):
  1. `extension/src/handlers/CLAUDE.md:37`: "…are in `extension/CLAUDE.md`, Uploads (Step 11)." Change to `extension/src/CLAUDE.md`, Uploads. Better still, since the handler file is under `src/`, say "in `extension/src/CLAUDE.md`, Uploads".
  2. `sdk/CLAUDE.md:112`: "(`BAD_PARAMS`, `extension/CLAUDE.md` Uploads; #288)". Change to `extension/src/CLAUDE.md` Uploads.
  3. `extension/CLAUDE.md:264`: stranded sentence (finding 4).
  - Old docs that name "§ Uploads": `docs/plans/…-steps/S0F-b*.md` and `docs/cleanup/2026-10-26*`, `2026-10-27-evidence/*` are closed or history. Leave them.
- Result: mechanical once the user has accepted P9 (it is accepted already).

## 4. Stranded pointer sentence after the Uploads section — mechanical
- Location: `extension/CLAUDE.md:264`: "The session marker's 2 s bound and the handle retirement on a Chrome restart are in `daemon/CLAUDE.md`."
- Evidence: it follows the Uploads bullets and has nothing to do with them. The previous pass flagged it (`docs/cleanup/2026-10-26-evidence/gotcha-placement.md:167`). It was never fixed.
- Fix: when the section moves out, keep this sentence as the last line of the "Service worker, CDP and network" section, or at the end of the Safety gate section, next to the session-marker discussion (`session-marker.ts` is in Key files line 16). About 21 words.

## 5. S8 proposals (a)-(f): what landed
- (a) src firewall bullet: landed verbatim (`extension/src/CLAUDE.md:11-20`).
- (b) Key files: `handlers/history.ts` and the permission note landed (`extension/CLAUDE.md:50-54`).
- (c) handlers `back`/`forward` and `newTab` additions: landed (`handlers/CLAUDE.md:16,28-33`).
- (d) root Current state: landed. Only the stale test count remains, which is for the state area (`CLAUDE.md:112` "4665 passed" against doc-check).
- (e) comment in `safety-dnr-keeper.ts`: code, not checked here.
- (f) recipes Run 17b bullet: landed as one bullet (`recipes/CLAUDE.md:156-161`), not three. This matches "a new group", and #317, #318 are cited. No placement problem. The #317 fact (PowerShell 5.1 `-File` global scope) is also a Windows-tooling fact. It sits with the other run-helper facts, which is where an agent writing a runner looks. It is fine.
- The S8 proposals file itself is a closed plan artifact. Nothing to do.

## 6. Checked, no finding
- `safety-call.ts`, `safety-dnr-keeper.ts`, `sw.ts`, `handlers/tabs.ts`: their gotchas already live in `extension/src/CLAUDE.md` or `handlers/CLAUDE.md`. The `newTab` rule appears in `handlers/CLAUDE.md:16` (placement correct, the code is `handlers/tabs.ts`) and in the src firewall bullet (the DNR side); the two overlap on the `about:blank`-first sentence but differ in purpose. Not an exact duplicate, so it stays.
- The `back`/`forward` activation fact sits in `handlers/CLAUDE.md` (binds `handlers/history.ts`). Correct.
- Pointer rule (#232): handlers/CLAUDE.md points to src/CLAUDE.md for redirects; mcp/CLAUDE.md holds the `browser_new_tab` rule and handlers points to it. Fine.
