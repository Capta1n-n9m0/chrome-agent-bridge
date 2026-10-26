# Gotcha placement — cleanup pass 2026-10-26

Area cleaner (Gotcha placement). Model: Sonnet 5.5 (`claude-sonnet-5-5`). Read only; no commit. Scope: `git diff 965b1af..HEAD`
(Step 11), every `CLAUDE.md` (10 files), checked against the source tree, `S6-claude-md-proposals.md` and `scripts/doc-check.mjs`.

**13 findings** (7 mechanical: 1, 2, 4, 9, 10, 11, 12; 6 needs-the-user: 3, 5, 6, 7, 8, 13; the mechanical ones that edit CLAUDE.md rule text are for the lead to apply or propose). Severity is my own: none is a
wrong gotcha; the largest are the budget headroom (3) and the DevTools-title conflict (7).

## What I checked and found clean

- **Budgets** (`scripts/doc-check.mjs` counts, same method re-run): root 2176/3000; shared 155, daemon 1669, sdk 1442, mcp 928,
  recipes 2033 (each of 3500); **extension 3499/3500**; content 986, evaluate 373, handlers 323 (each of 1200). doc-check's only
  CLAUDE.md-related hit is the test count at root `CLAUDE.md:117`; I re-ran `npm test` today: `Test Files 154 passed (154)`,
  `Tests 3811 passed (3811)`, so that line is correct (not a finding).
- **Counts stated in the CLAUDE.md files vs code**: 24 tools (24 distinct `browser_*` in `mcp/src/tools/registry.ts`); 27 codes, 26 on the
  wire (`shared/src/codes.ts:1-3`); 27 router methods (doc-check); 54 log sites = 15 + 33 + 6 + 0 (`extension/test/log-allowlist.ts`);
  SDK "exactly eight values" (`sdk/src/index.ts`, 8 value exports); `shared/CLAUDE.md` stale "26 codes" from the S6 proposal is fixed.
- **Key files vs tree**: no dead entry in any of the six Key-files lists. Every `daemon/src`, `sdk/src`, `mcp/src`, `shared/src` file is
  listed. Every `recipes/s11*` helper and `recipes/tsconfig.s11.json` is listed; `test-fixtures/s10-*`, `s11-*` named. Extension: one
  new Step 11 file is missing (finding 1).
- **Duplicates**: doc-check's "same gotcha in two CLAUDE.md files" is empty; my read found no cross-file duplicate that repeats a
  headline (the background-tab upload fact, the trusted-input fact, the `saveTo` store and the session marker are each stated once and
  pointed to). Same-file overlaps in `recipes/CLAUDE.md` are findings 6 and 7.
- **No history notes** (`*Superseded …*`) inside any `CLAUDE.md`.
- **Wave/placement under #232 for the new gotchas**: the `file:`-page gate, folder rule at receipt, file-access, finder closure rule and
  15 s bound sit in `extension/CLAUDE.md` (code: top-level `safety.ts`, `upload-files.ts`); the `data-__bridge-upload` mark sits in
  `extension/src/content/CLAUDE.md` (code: `content/upload-target.ts`). Correct. `daemon/CLAUDE.md`, `mcp/CLAUDE.md`, `shared/CLAUDE.md`
  carry the Step 11 facts in their Key files, which matches the proposals.

## S6 proposals audit (`S6-claude-md-proposals.md`)

| Proposal | Landed? | Where |
|---|---|---|
| root 1 (state block), 2 (test count) | yes | `CLAUDE.md:14-42`, `:117` (count verified) |
| extension 1 (`file:` gate) | yes, minus the `downloadStart`-keeps-`BAD_PARAMS` clause | `extension/CLAUDE.md:253-257` |
| extension 2 (folder rule at receipt) | yes; the wrong-typed `safety.uploadFolders` clause only as the generic "wrong-typed value" | `:256-257`, `:198-201` (finding 2) |
| extension 3 (file access) | yes, minus the unmeasured `DEBUGGER_ATTACH`-with-toggle-on case | `:258-263` |
| extension 4, 5, 6, 7, 8 | yes (background tab, 15 s bound, closure-free finder, tests not type-checked, SW-2) | `:260-266`, `:172-177` |
| shared 1, 2 | yes | `shared/CLAUDE.md:13-16` |
| daemon 1 | yes | `daemon/CLAUDE.md:15-16` |
| mcp 1, 2 | yes | `mcp/CLAUDE.md:9-13` |
| sdk 1, 2 | yes | `sdk/CLAUDE.md:25-28` |
| **sdk 3 (the `realpath` gotcha)** | **no** | finding 5 |
| recipes 1 (Key files) | yes | `recipes/CLAUDE.md:23-27` |
| recipes 2 (scan pattern, window title) | yes, but merged into a grab-bag bullet | findings 6, 7 |
| recipes 3 (STOP line, helper order) | only "a STOP ends the wave" | finding 8 |
| recipes 4 (port 8080, maximized window) | yes, but not in the occlusion bullet as proposed | finding 6 |
| recipes 5 (recipes typecheck is a separate gate) | yes (`:25-26`, root `:120`) | — |

## Findings

### 1. `extension/CLAUDE.md` Key files omit `content/upload-target.ts` — mechanical
- **Location:** `extension/CLAUDE.md:22-26` (the `content/…` run of the Key files list).
- **What is wrong:** the only new Step 11 source file missing from the list. Every other new file (`upload-paths.ts`, `upload-files.ts`,
  `handlers/upload.ts`) was added at `:49-53`. `extension/src/content/CLAUDE.md:3` says "`extension/CLAUDE.md` holds the key files", so the
  file is listed nowhere.
- **Evidence:** `git ls-files extension/src/content` → `a11y, actions, geometry, guard, index, locate, marked, nearest, refmap, snapshot,
  upload-target`; the list names `content/{index,snapshot,refmap,actions,geometry,guard}.ts`, `a11y.ts`, `locate.ts`, `nearest.ts`,
  `marked.ts`. The file's own header (`upload-target.ts:1-18`): "the content-script half of `uploadFiles` … the target rule
  (`uploadInputOf`) … the one-off mark".
- **Fix:** after `content/marked.ts` (`refOfMarked`) add "`content/upload-target.ts` (Step 11: `uploadInputOf`, the one-off
  `data-__bridge-upload` mark and its sweep)". About 20 words.

### 2. `extension/CLAUDE.md` names three safety storage keys; the code has four — mechanical
- **Location:** `extension/CLAUDE.md:198-200` (Safety gate, "The state lives in `storage.local`…").
- **Evidence (doc):** "Keys `safety.armed`, `safety.evaluate`, `safety.blockList` (`safety-state.ts` `SAFETY_KEYS`); missing keys = armed,
  JavaScript on, empty list". **Evidence (code):** `extension/src/safety-state.ts:32-37` has a fourth, `uploadFolders: "safety.uploadFolders"`,
  with the comment (`:48-50`) "absent means no folder (fails closed)". The first Key-files paragraph (`:49-57`) already says the Upload
  folders box writes it.
- **Fix:** add `safety.uploadFolders` to the key list and "no upload folder" to the missing-key defaults. About 10 words. (The rule text
  is unchanged in meaning; the lead may apply it. Mind finding 3.)

### 3. `extension/CLAUDE.md` is at 3499 of 3500 words; the fixes here would put it over — needs-the-user
- **Location:** whole file. **Evidence:** `node` re-count with doc-check's own `split(/\s+/)` method → `extension/CLAUDE.md 3499`;
  budget `scripts/doc-check.mjs:27` → 3500. Before Step 11 it was 3408 (`git show 965b1af:extension/CLAUDE.md`). Decision #287 says it was
  "kept within its budget by tightening three bullets".
- **What is wrong:** zero headroom, and findings 1, 2 and 10 add about 55 words (and findings 5 and 9 add pointers elsewhere), so applying them
  fails `doc-check` unless something is trimmed.
- **Suggested fix (the user approves, since these are rule texts):** candidates that lose no rule, about 100 words together:
  the decision citation at `:148` ("decisions.md · 2026-10-23 · S2b's details: the `selectTab` refusal grep, the marker's edge cases, the
  handle mark (#94) item 1", ~25 words, the same citation is already in `daemon/CLAUDE.md`); the Run 13/14 timing tails at `:230-232` (R14-5c's
  76 ms and the "server saw the hop and the target each requested once") and `:239-241` (`daemon.log` 210 lines, worker console 0); the two
  parenthetical test-name lists in the Key files (`:57-60`).

### 4. Root `CLAUDE.md` Architecture still says the gate covers three human settings — mechanical
- **Location:** `CLAUDE.md:81-85`.
- **Evidence (doc):** "the human's kill switch, JavaScript switch and block list are enforced in the extension, read from `storage.local` per
  call, and no wire, daemon or SDK method can change them". **Evidence (current state, same file):** `CLAUDE.md:21-23` "only files in the
  human's Upload folders (options page, empty by default) and only with Chrome's 'Allow access to file URLs' on … the gate refuses `file:`
  pages for every method (#245)"; code `extension/src/safety-state.ts:36` (`uploadFolders`) and `safety.ts:353-372` (`isFileUrl`).
- **Fix:** "…kill switch, JavaScript switch, block list and Upload folders are enforced … ; the gate also refuses `file:` pages". About 12
  words. Root has 824 words of headroom.

### 5. `sdk/CLAUDE.md` carries no upload gotcha and no pointer; S6 proposal sdk 3 did not land — needs-the-user (new rule text)
- **Location:** `sdk/CLAUDE.md:25-28` (Key files) and Runtime gotchas (no upload bullet).
- **Evidence:** the file says only "sends `fs.promises.realpath`". The reason and the unmeasured edges are only in a source comment,
  `sdk/src/upload.ts:6-7`: "it resolves a link or junction and canonicalises case and 8.3 names, where `fs.realpathSync` keeps the given
  form (Stage 0 F8) — so the extension's folder rule judges the real location". The proposal (`S6-claude-md-proposals.md`, sdk item 3) also
  lists "not measured: an unreadable file (`EACCES`) and a folder on a `subst`/mapped drive". `grep -i "realpath\|8\.3\|subst\|EACCES"` over
  all `CLAUDE.md` files finds nothing but the one Key-files phrase. Also: `extension/CLAUDE.md:261-263` states UP-RAW ("A raw `uploadFiles` of
  an absent file inside an allowed folder answers `ok` … only the SDK preflight checks disk") which binds `sdk/src/upload.ts` as much as the
  extension, and #232 gives the other package a pointer.
- **Fix (proposed rule text):** one gotcha bullet in `sdk/CLAUDE.md`: "`prepareUpload` must use `fs.promises.realpath`, not
  `fs.realpathSync` (it keeps case and 8.3 names, so the folder rule could miss); unmeasured: `EACCES`, a `subst`/mapped drive" plus a pointer
  "an upload's gate, file-access and background-tab facts are in `extension/CLAUDE.md`, Uploads (UP-RAW: only this preflight checks that a
  file exists)". About 60 words; `sdk/` has 2058 words of headroom.

### 6. `recipes/CLAUDE.md` Run 16 bullet repeats the occlusion bullet and lumps five facts under a run name — needs-the-user (rewrite of rules)
- **Location:** `recipes/CLAUDE.md:123-131` and `:115-122`.
- **Evidence:** `:115-117` "An auto-hidden Windows taskbar is a visible topmost window whose 2 px strip lies inside the monitor's work area
  (`[x,1078,…,1126]` on a 1080-px monitor): cut placements at the taskbar"; `:127-129` "A maximized Chrome window's frame overhangs its
  monitor by 8 px and meets an auto-hidden taskbar's 2 px strip: an occluder guard over it stops on the taskbars". Same strip, two bullets.
  The S6 proposal (recipes 4) said "the existing occlusion bullet … can carry it". `:123-131` is one bullet titled "Run 16's live-run
  facts" that holds the window-title leak, port 8080, the taskbar, the `python` PATH difference and the STOP rule, so an agent scanning bold
  titles cannot find any of them.
- **Fix:** move the maximized-window clause into the occlusion bullet; split the rest into bullets titled by the fact (port 8080 /
  `python` PATH; window titles and scan patterns; a STOP ends the wave). Word count unchanged.

### 7. `recipes/CLAUDE.md` gives conflicting DevTools window titles, one of them twice — needs-the-user (needs the Run 16 evidence read)
- **Location:** `recipes/CLAUDE.md:64-65`, `:123-125`, `:132-135`; `recipes/s11-win.ps1` `Format-S9Title`.
- **Evidence:** `:64` "Chrome 156 titles the service worker's DevTools window `DevTools`, with no extension URL (Run 13 SAFE-10 set-up, #195)"
  (repeated at `:133-134`: "Chrome 156 titles the worker's DevTools window `DevTools`"); `:123-124` "A DevTools window title carries the Chrome
  profile's display name (`DevTools - <profile>`)"; the helper that reads titles in the live wave
  (`recipes/s11-win.ps1`, `Format-S9Title`) matches `^DevTools - chrome-extension://$S9Id/` and any other `^DevTools`. Three forms for one
  Chrome version; the bullets do not say when each appears (worker window vs. page DevTools, DevTools loaded vs. not).
- **Fix:** one bullet "DevTools window titles" with each measured form, its run and what to match on; drop the second restatement at
  `:133-134`. The user (or an agent reading Run 16's console-capture rows) must say which forms are real before a lead edits a measured fact.

### 8. `recipes/CLAUDE.md` lacks the S5-win helper-order facts (S6 proposal recipes 3) — needs-the-user (optional)
- **Location:** `recipes/CLAUDE.md:130` (only "A `STOP:` printed inside a restore must end the wave").
- **Evidence:** the proposal lists "never print `$_` from these helpers; set `$global:W` to the front window before `Enter-S11Guards`; call
  `Save-S11Found` before `Invoke-S11Opt`; UP-RACE-A needs the pinned toolbar button". Present only as source comments:
  `recipes/s11-win.ps1:428` ("needs `$global:W` = the wave's front window"), `:314-319` (an unpinned button is a STOP), `:268`
  (`Get-S11FoundText` inside `Invoke-S11Opt`). Run 16 is done and the helpers are Step 11-specific, so the cost is small.
- **Fix:** either add one line to the Run 16 bullet or record in the cleanup report that these stay as helper comments by choice.

### 9. `extension/src/handlers/CLAUDE.md` has no pointer to the upload gotchas that bind `handlers/upload.ts` — mechanical (NIT)
- **Location:** `extension/src/handlers/CLAUDE.md:25` (the one existing pointer, for redirects).
- **Evidence:** `extension/CLAUDE.md:258-260` "`handlers/upload.ts` reads `isAllowedFileSchemeAccess()` before attaching and refuses
  `UPLOAD_REFUSED`"; #232 (decisions.md:819) "a folder `CLAUDE.md` loads only when an agent opens a file in that folder". The S6 proposal
  decided "None … by design" because the facts bind top-level `upload-files.ts`. The handler's own file-access check and sweep rules
  (`handlers/upload.ts:1-20`) are edited from the folder, though.
- **Fix:** one line after `:25`: "The upload handler's file-access refusal, the background-tab fact and the finder's closure rule are in
  `extension/CLAUDE.md`, Uploads (Step 11)." About 25 words; the folder file has 877 words of headroom.

### 10. The closure-free bullet names the finder only; its guard test and the tsx cause are not named — mechanical
- **Location:** `extension/CLAUDE.md:264-266`.
- **Evidence (doc):** "The upload finder ships as a closure-free literal string: its guard test copies esbuild's options instead of
  reading `build.mjs`". **Evidence (code):** `extension/test/s3-closure-free.test.ts:1-12` guards three shipped sources
  (`UPLOAD_FINDER_SRC`, `UPLOAD_MARK_PAGE_FN`, `UPLOAD_UNMARK_PAGE_FN`) and says the bundler helper "esbuild's `keepNames` `__name(visit,
  "visit")`, which `npx tsx` inserts". The same cause is already in `recipes/CLAUDE.md:46-51` ("`String(fn)` page code breaks under tsx").
  The test file is not named in any Key files or gotcha, so an agent adding a fourth shipped page function cannot find the guard.
- **Fix:** "…the three shipped page sources (`UPLOAD_FINDER_SRC`, the mark and unmark functions) ship closure-free; the guard is
  `extension/test/s3-closure-free.test.ts`, which copies esbuild's options …; same cause as `recipes/CLAUDE.md` (tsx `__name`)". About 30
  words (see finding 3).

### 11. A source comment names a file that does not exist — mechanical (code comment, outside the `CLAUDE.md` set)
- **Location:** `extension/src/content/upload-target.ts:14`.
- **Evidence:** "the service worker's CDP finder (`upload-cdp.ts`, in an isolated world)"; `grep -rn "upload-cdp"` finds only this line; the
  finder is in `extension/src/upload-files.ts`.
- **Fix:** replace `upload-cdp.ts` with `upload-files.ts`. Comment only; no test is affected.

### 12. The "Uploads (Step 11)" section is named by step, holds a safety-gate fact, and strands a pointer — mechanical (NIT)
- **Location:** `extension/CLAUDE.md:252-257` and `:268`.
- **Evidence:** the first bullet is about `safety.ts` / `safety-call.ts` (`file:` refusal, "For class `upload` the folder rule runs at receipt"),
  while the Safety gate section (`:190-250`) is where an agent editing the gate looks. The last line, "The session marker's 2 s bound and the
  handle retirement on a Chrome restart are in `daemon/CLAUDE.md`", now follows the Uploads bullets and has nothing to do with them.
- **Fix:** move the `file:` bullet to the end of "Safety gate (Step 9)" (retitle it "Safety gate") and put the closing pointer under the
  Tabs section, or delete it (the Key files and `:5-7` already route). Word count unchanged.

### 13. Two S6-proposed clauses were dropped without a record — needs-the-user (optional)
- **Location:** `extension/CLAUDE.md:253-263`.
- **Evidence:** proposal extension 1 says "`downloadStart` to a `file:` URL keeps its handler's `BAD_PARAMS`" (a contract edge, so an agent
  reclassifying `downloadStart` knows the order); proposal extension 3 says "the 'Not allowed with the toggle on surfaces as
  `DEBUGGER_ATTACH`' case stays unmeasured". Neither is in the file. The first appears as a comment at `safety.ts:366-368`
  ("downloadStart's own handler refuses non-http(s)").
- **Fix:** keep the code comment as the record, or add about 25 words after finding 3's trims. Low value; listed so the choice is explicit.
