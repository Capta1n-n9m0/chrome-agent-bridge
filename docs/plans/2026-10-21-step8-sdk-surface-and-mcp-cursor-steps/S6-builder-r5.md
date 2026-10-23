# S6 builder r5 — S6.3 on one held export (decision #103, pre-run)

Written 2026-10-23 by the S6 builder (round 5, Claude Opus 5.5), before S6.3's re-run. Lane: `recipes/` plus
the dated notes in `docs/e2e-test-plan.md` §4.19 and the wave sheet. Nothing ran against Blackboard. The only
bridge contact was the localhost dry run below, in a fixture window the builder opened itself.

## 1. What changed

**The page side is unchanged, and the existing path is reused.** The existing START already stores the export
at `window.__bridgeExport[<key>]`, and STATUS/CHUNK/drop read or delete it there
(`recipes/blackboard/readonly.ts`, no page-code change). Hold mode changes only two things: who starts it (the
SDK leg alone, once) and the key both legs read (`held-<course>`, a new `exportKey` leg at
`recipes/blackboard/readonly.ts:71`). The MCP leg's plan in this mode has no START. Before this change, each leg
ran its own START under `sdk-…` / `mcp-…` (Run 12's S6.3 compare).

- `recipes/blackboard/held.ts` (new, pure): `heldKey` (:15); `mcpPlanLines` (:23), the plan's lines. The
  pre-#103 plan moved here unchanged, and the stdout of `--mcp-plan` for `pp1` and `_1_1` was compared
  byte for byte with HEAD's `export-grades.ts` under tsx: `pp1 identical`, `_1_1 identical`. The held plan has
  STATUS and two CHUNK lines on the held key and no START. Also `heldLine` (:53), `keptHeldLine` (:57),
  `heldFoundLine` (:71), `droppedLine` (:78) and `checkHeldTab` (:85). That last one acts only on an unheld tab
  on an ada course page (live) or on the fixture page opened for that course id (dry run). Its messages carry
  no URL.
- `recipes/blackboard/export-grades.ts`:
  - `--hold` (:140, :159, :166–168): the SDK leg starts the export under `held-<course>` and reads it as before.
    It writes `exports\<course>-<date>.json`, does **not** drop the export, keeps the tab open (the
    `--keep-open` semantics) and prints the key line and the `kept …` line. The `MCP leg size:` line is
    unchanged.
  - `--mcp-plan --hold` (:120): prints the held plan.
  - `--drop-held <T#>` (:77–96, :123): runs `listTabs` and then `checkHeldTab`. It claims the tab, runs STATUS
    (it must be done), runs the drop, runs STATUS again (it must be `null`), then releases the tab and leaves it
    open for `s6.ts close-bb-tab`.
  - Failure reports stay off. Only the existing expressions run: no new GET and no new page code.
- `recipes/blackboard/guard.ts`: the `--hold` and `--drop-held <T#>` flags (:211–253; the value must be
  `T<n>`), and `checkHoldFlags` (:270): `--drop-held` runs alone.
- `recipes/blackboard/assemble-mcp.ts`: `--held` (:31, :40, :42) reads the transcript on the held key. It
  never needed a START result. The rule is unchanged: 0 bad results, and `verifyTransfer` against the STATUS
  length, bytes and sha256.
- `recipes/test/blackboard-held.test.ts` (new, 17 tests). The hold-mode plan has no START and uses only the
  held key's exact STATUS/CHUNK expressions. Its transcript reads back on the held key and not on `mcp-…`. The
  pre-#103 plan is unchanged. In node:vm, one held export is read by the SDK-style chunk and by the plan's
  lines with no START; only one export is built; after the drop, STATUS is `null` and CHUNK is
  `{missing: true}`. The tests also cover the printed lines, `checkHeldTab` and the flags. The tests were
  written alongside the code, not strictly before it. They all pass, and so do all the old tests.
- Docs, dated notes only (old text kept): `docs/e2e-test-plan.md:1002` (§4.19 SDK-7, the note
  `*2026-10-23 (#103, before S6.3's re-run): S6.3 is measured on ONE held in-page export …*` at the end of the
  Expected cell) and `S6-wave-sheet.md:297` (Part 3, the note "S6.3 re-run on one held export, #103", steps
  (1)–(11), placed before P3-i).

## 2. Expected text (as registered)

- SDK leg (`export-grades.ts pp1 --hold`): the old SDK-leg lines up to `SDK-7 (SDK leg) PASS — …`, then
  `held export under key held-pp1 in <T#> (page memory, built once; the MCP leg reads it: --mcp-plan --hold;
  drop it after both reads: pp1 --drop-held <T#>)` (held.ts:54) and `kept <T#> open with bb loaded and the
  export held for the MCP leg; released when this script exits` (held.ts:58).
- Plan (`--mcp-plan --hold`), 8 lines (held.ts:26–48): `# SDK-7 MCP leg for course pp1, held export (#103) — …`,
  `# key held-pp1; …`, `# no START: …`, `STATUS:` + STATUS on `"held-pp1"`, `CHUNK (…):` + 2 CHUNK lines; no
  `START:` line; no `_\d+_\d+`.
- Assemble (`assemble-mcp.ts … pp1 --held`): `held export: key held-pp1 (no START expected)`
  (assemble-mcp.ts:42), then the old `transcript: …` and `written …` lines.
- Drop: `held export held-pp1 in <T#>: done, <L> characters, <b> bytes, sha256 <H>` (held.ts:74),
  `dropped the held export held-pp1 from <T#>; STATUS on held-pp1 now: gone (null)` (held.ts:81),
  `released <T#> (left open: close it with s6.ts close-bb-tab <T#>)` (export-grades.ts:91). A second drop:
  `FAILED — no held export under key held-pp1 in <T#> (already dropped, or the tab navigated)` (held.ts:72), exit 1.

## 3. Localhost dry run (stub course `_1_1`, `--dry-run`), 2026-10-23 19:49–19:51 UTC

The driver script and the stand-in for actor M were scratch files outside the repo: `dry103.ps1` and
`dry-mcp-leg.mts`, run as `node --import tsx`. The stand-in reads the plan file, claims the held tab, evaluates
the plan's STATUS line and first CHUNK line verbatim through the SDK, and writes a transcript in the Claude
stream shape (`tool_use` `mcp__chrome-agent-bridge__browser_evaluate` / `tool_result`), which
`assemble-mcp.ts --held` reads. Windows PowerShell 5.1 ran with `-NoProfile`, its output went to a file, and the
fixture server ran hidden.

**Attempts 1 and 2: scratch-script set-up failures.** In both, the recipes ran and passed, but the stand-in did
not:
- Attempt 1 (`b103-dry`): the scratch `.ts` outside the repo was compiled as CJS (no `"type": "module"` there):
  `ERROR: Top-level await is currently not supported with the "cjs" output format`. It was renamed to `.mts`.
- Attempt 2 (`b103-dry2`): `BridgeError: [chrome.debugger] SyntaxError: Invalid or unexpected token` (`code:
  'PAGE_ERROR'`). The plan file written by `>` in `-NoProfile` Windows PowerShell 5.1 is **UTF-16LE** (first
  bytes `ff fe 23 00`), and the stand-in read it as UTF-8. The #102 run's profile shell wrote UTF-8 with a BOM.
  The stand-in now decodes by BOM, and the wave sheet's step (4) says to read the encoding from the first bytes.

In both attempts the SDK leg, the drop (`dropped … gone (null)`), the second drop (`FAILED — no held export …`),
the dry-file deletion and the server stop ran as in attempt 3. Their outputs are kept outside the repo.

**Attempt 3 (`b103-dry3`), verbatim.** One diagnostic line of the driver mis-built its path (`$env:S6_OUTsdk7-plan.txt`)
and printed an error; the encoding had been read in attempt 2. The `close-bb-tab` refusal is expected: it
closes only an ada course tab, so the dry-run tab was closed by the stand-in (`close`).

```
## set-up
time 19:50:58.753Z
Test-Path S6_OUT: False
9b15ad4 docs(step8): S6.3 re-registered on one held export — decision #103
daemon before: 1
Get-DaemonBuild: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
fixture server pid 23588
8080: 200
existing dry files: sdk False, mcp False
## window
time 19:51:03.170Z
Wb: Hwnd 789916
Set-T5Foreground: True
T458 fixture
## stale check (first result line)
time 19:51:05.053Z
2026-10-23T19:51:05.573Z s6-stale-check: connected — daemon build 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f, extension connected
2026-10-23T19:51:05.632Z s6-stale-check: opened T459 (background) at http://localhost:8080/e2e-playground.html?s6=stale
2026-10-23T19:51:05.645Z s6-stale-check: locate T459 {role:"button", name:"Sign in"} → ok {"name":"Sign in","ref":"e1","role":"button"} (8 ms)
2026-10-23T19:51:05.653Z s6-stale-check: STALE-CHECK NEW BUILD — the loaded extension answers locate: it is the S2-or-later build
exit 0
Get-DaemonBuild: 597d6c28abd12541eb51c43266f3504f18305cfeeedfd90e5ae5a9ef4434da3f
## SDK leg, hold mode
time 19:51:05.697Z
T458 fixture
2026-10-23T19:51:07.300Z export-grades: course _1_1; source stub-bb.js (declares VERSION stub-2026-10-23, sha256 26ee6322a410…); DRY RUN
2026-10-23T19:51:07.371Z export-grades: opened T460 (background) for course _1_1 — dry run on the localhost fixture
2026-10-23T19:51:07.413Z export-grades: T460 loaded; origin and course checked
2026-10-23T19:51:07.471Z export-grades: bb.js evaluated: "bb loaded"
2026-10-23T19:51:07.499Z export-grades: bb.VERSION = stub-2026-10-23
2026-10-23T19:51:07.532Z export-grades: page export done in 33 ms: 2 columns, 4 grade records, 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c
2026-10-23T19:51:07.532Z export-grades: MCP leg size: 626 characters → 1 chunk(s) of 8000; measurable: yes
2026-10-23T19:51:07.537Z export-grades: pulled 1 chunk(s); length, bytes and sha256 equal the page's: yes
2026-10-23T19:51:07.539Z export-grades: written exports\dry-_1_1-2026-10-23.json — 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c
2026-10-23T19:51:07.539Z export-grades: SDK-7 (SDK leg, dry run) PASS — 2 columns, 4 grade records; file sha256 = page sha256
2026-10-23T19:51:07.539Z export-grades: held export under key held-_1_1 in T460 (page memory, built once; the MCP leg reads it: --mcp-plan --hold; drop it after both reads: _1_1 --drop-held T460)
2026-10-23T19:51:07.539Z export-grades: kept T460 open with bb loaded and the export held for the MCP leg; released when this script exits
exit 0
handle: T460
## the plan
time 19:51:07.591Z
plan exit 0
Exception calling "ReadAllBytes" with "1" argument(s): "Could not find file 
'C:\Users\aliev\Projects\chrome-remote-extention\-plan.txt'."
At C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\98d37e15-74d6-4e30-9f89-cd2
6d9d75a28\scratchpad\dry103.ps1:54 char:1
+ $pb = [IO.File]::ReadAllBytes("$env:S6_OUTsdk7-plan.txt"); "plan firs ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (:) [], MethodInvocationException
    + FullyQualifiedErrorId : FileNotFoundException
 
Cannot index into a null array.
At C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\98d37e15-74d6-4e30-9f89-cd2
6d9d75a28\scratchpad\dry103.ps1:54 char:60
+ ... plan.txt"); "plan first bytes: " + (($pb[0..1] | ForEach-Object { $_. ...
+                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : NullArray
 
plan lines: 8
START: line in plan: False
bridgeGradesExport in plan: False
held key lines: 3
## MCP-leg stand-in (SDK, the plan's STATUS and CHUNK verbatim)
time 19:51:08.214Z
2026-10-23T19:51:08.547Z dry-mcp-leg: claimed T460; plan has no START: yes
2026-10-23T19:51:08.553Z dry-mcp-leg: STATUS: state done, length 626, bytes 627, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c
2026-10-23T19:51:08.557Z dry-mcp-leg: CHUNK [0, 8000): 626 characters
2026-10-23T19:51:08.557Z dry-mcp-leg: transcript written: 4 lines
2026-10-23T19:51:08.558Z dry-mcp-leg: released T460
exit 0
## assemble
time 19:51:08.577Z
2026-10-23T19:51:09.008Z assemble-mcp: held export: key held-_1_1 (no START expected)
2026-10-23T19:51:09.009Z assemble-mcp: transcript: status found, 1 chunk result(s), 0 bad result(s)
2026-10-23T19:51:09.012Z assemble-mcp: written exports\_1_1-2026-10-23-mcp.json — 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c (= the page's: yes)
exit 0
## S6.3 compare
time 19:51:09.051Z
92FE62ABC12D1AC759E6B29F287520A7A486BE9150666372028E1027D389A49C  dry-_1_1-2026-10-23.json
92FE62ABC12D1AC759E6B29F287520A7A486BE9150666372028E1027D389A49C  _1_1-2026-10-23-mcp.json
.gitignore:30:exports/	"exports\\dry-_1_1-2026-10-23.json"
.gitignore:30:exports/	"exports\\_1_1-2026-10-23-mcp.json"
## drop
time 19:51:09.095Z
2026-10-23T19:51:09.624Z export-grades: held export held-_1_1 in T460: done, 626 characters, 627 bytes, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c
2026-10-23T19:51:09.632Z export-grades: dropped the held export held-_1_1 from T460; STATUS on held-_1_1 now: gone (null)
2026-10-23T19:51:09.632Z export-grades: released T460 (left open: close it with s6.ts close-bb-tab T460)
exit 0
## known-bad: STATUS after the drop
time 19:51:09.672Z
2026-10-23T19:51:09.895Z dry-mcp-leg: claimed T460; plan has no START: yes
2026-10-23T19:51:09.900Z dry-mcp-leg: STATUS after the drop: null
2026-10-23T19:51:09.904Z dry-mcp-leg: CHUNK [0, 8000) after the drop: {"missing":true}
2026-10-23T19:51:09.904Z dry-mcp-leg: known-bad check: the export is gone (STATUS null), not done
2026-10-23T19:51:09.905Z dry-mcp-leg: released T460
exit 0
## known-bad: a second drop
time 19:51:09.920Z
2026-10-23T19:51:10.450Z export-grades: FAILED — no held export under key held-_1_1 in T460 (already dropped, or the tab navigated)
exit 1
## close
time 19:51:10.491Z
2026-10-23T19:51:11.008Z s6-close-bb-tab: FAILED — SET-UP: T460 is not on an ada course page — not closed
exit 2
2026-10-23T19:51:11.277Z dry-mcp-leg: closed T460 (the dry-run fixture tab)
exit 0
## clean-up
time 19:51:11.295Z
dry files left: sdk False, mcp False
safe: the tree of 23588 does not contain the driver
server stopped: True
window closed (WM_CLOSE posted)
daemon: pid 23748 parent 18992
```

**Result: PASS on the known-good input.** Both files are `92FE62ABC12D1AC759E6B29F287520A7A486BE9150666372028E1027D389A49C`.
One START was built: the stand-in only claimed the tab and ran STATUS/CHUNK. The plan has no `START:` line and
3 lines on `"held-_1_1"`. Assemble found 0 bad results, `= the page's: yes`. The drop answered `dropped … gone
(null)`.

**Known-bad checks:**
- After the drop, the plan's STATUS through the SDK answers `null` and its CHUNK answers `{"missing":true}`
  ("gone, not done").
- A second `--drop-held` fails: `FAILED — no held export …`, exit 1.

**Clean-up:**
- Both dry files were deleted (`dry files left: sdk False, mcp False`). `exports\` was left as it was before:
  the live files of earlier runs were untouched.
- The fixture servers were stopped by PID after `safe: …` (23588 here; 25188 and 14656 in attempts 1–2).
- Every driver window was closed (WM_CLOSE).
- The daemon (pid 23748) was spawned by attempt 1's first client (`daemon before: 0`). It was left to exit on
  idle (600 s with zero clients), as in earlier runs.

## 4. Checks

- `npx vitest run recipes/`: **169 passed in 5 files** (was 152 in 4; +17 in `blackboard-held.test.ts`; none
  removed).
- `npx tsc --noEmit -p recipes/tsconfig.s6.json` exit 0. `npm run typecheck` exit 0.
- Hygiene of the diff, by count (never printed): token 0; `_\d+_\d+` other than `_1_1` 0; course-table ids 0.
