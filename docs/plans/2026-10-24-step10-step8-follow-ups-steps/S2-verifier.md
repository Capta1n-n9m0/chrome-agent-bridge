# S2 verifier report — the MCP's trusted tools focus first

Stage S2 of Step 10 (phase doc 0.2; decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the MCP's
trusted tools focus first too (#106)). Verifier: Claude Opus 5.5 (claude-opus-5-5), 2026-10-25. Inputs audited:
`briefs/S2-builder.md`, `briefs/S2-verifier.md`, the builder report `S2-builder.md` (as claims) and the
uncommitted change in the main tree (base `0d189a0`). Nothing in the main tree was edited except this file.
Three throwaway worktrees (`wt-base` at `0d189a0`, `wt-f45` at `f45e3bf`, `wt-mut` at `0d189a0` + the S2 files)
lived under the scratch directory, each with a `node_modules` of junctions to the main tree's packages and
`@bridge/*` junctions to the worktree's own packages; all three were removed (junctions unlinked first,
`git worktree remove --force`, `git worktree list` shows only the main tree).

Note: during this verification another stage committed (`HEAD` is now `09fa604`); the S2 change is still the
same five uncommitted paths.

## Findings

1. **MINOR — `browser_focus_tab`'s description is now false.** `mcp/src/tools/registry.ts:643`: "Bring this
   session's tab … on screen and focus its window. **The only tool that changes what the human sees**; …".
   After S2, `browser_click` / `browser_type` / `browser_press_key` with `trusted=true` also bring the tab to the
   front and focus its window (that is what their new sentence says). `docs/setup.md:148` repeats it ("— the only
   tool that changes what you see"); the builder's list of stale `setup.md` text (L280–285, L430–431, L922–923)
   misses L148. The builder was told to "change nothing else", so this is not a builder defect but an open
   wording item. Evidence: `grep -n "only tool that" mcp/src/tools/registry.ts docs/setup.md` →
   `registry.ts:643` and `setup.md:148`. Suggested fix (step agent / S8, a description change only — S2.3's
   fixture excludes tool descriptions, so the schema test stays green): e.g. "… The only tool besides the trusted
   `browser_click`/`browser_type`/`browser_press_key` that brings a tab on screen; it does not change this
   session's tab." and the same in `setup.md:148`.

2. **MINOR — a `focusTab` failure in the attach set is reported as if the action failed.** Verified by a quick
   run (a probe `describe` appended to `wt-mut`'s copy of `mcp/test/tools.test.ts`, real `attachContext`, fake
   bridge whose `focusTab` throws): for a trusted `browser_click {ref:"e1", trusted:true, tab:"T4"}`
   ```
   PROBE TIMEOUT browser_click: {"types":["text","image"],"line1":"TIMEOUT: probe TIMEOUT", … } calls=["focusTab","snapshot","screenshot","networkRequests"]
   PROBE TIMEOUT browser_focus_tab: {"types":["text","image"],"line1":"TIMEOUT: probe TIMEOUT", … } calls=["focusTab","snapshot","screenshot","networkRequests"]
   PROBE OFFSCREEN browser_click: (same shape, report + image) calls=["focusTab","snapshot","screenshot","networkRequests"]
   PROBE DISARMED browser_click: {"isError":true,"types":["text"],"line1":"DISARMED: the user has turned the bridge off in Chrome. …"} calls=["focusTab"]
   PROBE DOMAIN_BLOCKED browser_click: {"isError":true,"types":["text"],"line1":"DOMAIN_BLOCKED: …"} calls=["focusTab"]
   PROBE LOCK_TIMEOUT browser_click: {"thrown":"LOCK_TIMEOUT"} calls=["focusTab"]
   ```
   Every outcome equals `browser_focus_tab`'s, and the action is never sent — which is exactly S2.2 and phase
   doc 0.2 ("a `focusTab` failure is the tool's answer"). But the answer to a trusted click reads
   `TIMEOUT: <focusTab's message>` with a failure report (snapshot, a default-mode screenshot that switches the
   human's view ~1.5 s, network); nothing says the click itself was never sent. The model may believe the click
   ran and timed out. The builder's report names this case as "not covered … by reading the code"; it is now
   run, not only read. Not a spec violation (0.2/F19 do not ask for a distinguishing line). Suggested fix: none
   required for S2; record it under the as-built register as a known behaviour, or (a later, contract-level
   choice for the user) prefix the answer with "focusing the tab failed; the click was not sent".

3. **NIT — the cursor tests cannot tell "the cursor's tab" from a hard-coded `T1`.** The fake's first-touch
   claim always answers `T1`, so a mutant that focuses `tab ?? "T1"` (instead of the resolved `t`) survives on
   all three tools (`… raw tab param (click|type|press): Tests 142 passed (142)`). In the explicit-tab tests the
   handle is `T7`/`T9`, so a constant or a wrong explicit handle is caught; only "fallback to a fixed T1" slips.
   The mutant is contrived (the code would have to invent a handle), so this is a NIT. Suggested fix: in the
   cursor case, make the claim answer e.g. `T3` (the `tools.test.ts` fake already has `setHuman`) and expect
   `focusTab {tab:"T3"}`.

4. **NIT — the fixture's bytes depend on line endings after a checkout.** `core.autocrlf=true` and
   `.gitattributes` has no rule for `mcp/test/fixtures/*.json`, so a fresh Windows checkout will carry CRLF and a
   later byte-compare with a regenerated (LF) capture would differ, although the S2.3 test (`JSON.parse` +
   `toEqual`) is unaffected. Evidence: `git config core.autocrlf` → `true`; `git check-attr -a
   mcp/test/fixtures/tool-schemas-f45e3bf.json` → nothing. Suggested fix: add
   `mcp/test/fixtures/*.json text eol=lf` to `.gitattributes` when committing (outside S2's lane — step agent's
   call), or compare parsed JSON in any future re-check.

5. **NIT — `S2-builder.md` says S2.3's names are compared as a set; the test compares them in sorted order.**
   Both sides are sorted by the same capture, so this is equivalent; noted only because the report wording
   ("names set equal") and the test (`toEqual` of the ordered list) differ.

No CRITICAL or MAJOR finding.

## Task 1 — checks and the test count

- `npm run typecheck` (main tree): exit 0.
- `npm test` before, at `0d189a0` in `wt-base`: `Test Files 116 passed (116)` · `Tests 2763 passed (2763)`.
- `npm test` after, main tree: `Test Files 117 passed (117)` · `Tests 2807 passed (2807)`. 2807 = 2763 + 44.
- Per-file comparison of the two JSON reports (`vitest --reporter=json`, test full names per file):
  ```
  added/renamed mcp/test/tools.test.ts action tools browser_type forwards trusted:true when asked (after focusTab on the same tab, #106)|passed
  added/renamed mcp/test/tools.test.ts action tools browser_press_key forwards trusted:true when asked (after focusTab on the same tab, #106)|passed
  files 116 117 tests 2763 2807 added 46
  removed/renamed: [ '…tools.test.ts: action tools browser_type forwards trusted:true when asked|passed',
                     '…tools.test.ts: action tools browser_press_key forwards trusted:true when asked|passed' ]
  tools.test.ts counts 98 98
  ```
  46 new names = 44 in `s2-focus-first.test.ts` + 2 renames; the only "removed" names are those two renames;
  `tools.test.ts` keeps 98 tests. No test removed.
- `npm run build`: `build_exit=0`; afterwards `git status --short | grep -v '^??'` → only
  ` M mcp/src/tools/registry.ts` and ` M mcp/test/tools.test.ts` (plus, later, two doc files another stage
  edited, not S2's); untracked S2 files: `mcp/test/fixtures/`, `mcp/test/s2-focus-first.test.ts`,
  `mcp/test/tool-schemas.ts`. No build output is tracked.

## Task 2 — S2.3 / F15: the schema fixture

- **Regenerated at `f45e3bf`:** `tool-schemas.ts` copied into `wt-f45/mcp/test/`, `npx tsx
  mcp/test/tool-schemas.ts > regen-f45.json` (exit 0), then `cmp regen-f45.json
  mcp/test/fixtures/tool-schemas-f45e3bf.json` → `BYTE-IDENTICAL`; both sha256
  `768353438463e8194c8524a62c096f1dd8b3a6ccbcc590460426eebe35283b2d`, 20 020 bytes (the builder's figures hold).
  The same capture from the changed main tree is byte-identical too (`NOW-EQUALS-F45`). `git diff --stat f45e3bf
  0d189a0 -- package.json package-lock.json mcp sdk shared` is empty, so the junctioned `node_modules` (one MCP SDK
  version) is the one `f45e3bf` had.
- **Content:** 23 entries, each with exactly the keys `name,inputSchema` (no tool description); 50
  `"description"` keys, all per-parameter (e.g. `browser_click`'s `locator` carries its `.describe()` text).
- **Is it what a client sees?** Yes: the capture is a real `tools/list` round trip — the MCP SDK's `Client` over
  `InMemoryTransport.createLinkedPair()` against an `McpServer` with `registerTools` — so the JSON Schema is the
  SDK's own zod conversion, `$schema` included, not a re-implementation.
- **The test fails on schema mutations** (each applied to `wt-mut`'s registry, run with
  `s2-focus-first.test.ts` + `tools.test.ts`, then restored; baseline there `142 passed (142)`):
  ```
  schema: add optional param to browser_click: Tests  1 failed | 141 passed (142)
  schema: rename submit -> submitForm in browser_type: Tests  1 failed | 141 passed (142)
  schema: change REF_DESCRIPTION text: Tests  1 failed | 141 passed (142)
  schema: press_key trusted optional -> required: Tests  1 failed | 141 passed (142)
  schema: drop browser_network_clear: Tests  8 failed | 134 passed (142)
  description: drop the focus sentence from browser_type: Tests  1 failed | 141 passed (142)
  ```

## Task 3 — S2.1 / S2.2: failing first, coverage, mutations

- **On the unchanged registry** (`wt-mut` at `0d189a0`, `mcp/` identical to `f45e3bf`, only the new test file,
  `tool-schemas.ts` and the fixture copied in): `Tests 32 failed | 12 passed (44)`. The 12 that pass are exactly:
  the 10 untrusted cases (`trusted undefined` and `trusted false` × click ref / click locator / type ref / type
  locator / pressKey), "the result text of a trusted action is unchanged", and "names and input schemas
  deep-equal the fixture captured at f45e3bf" — all of which must hold before and after. Matches the builder.
- **Coverage read in `mcp/test/s2-focus-first.test.ts`:** order (`toEqual` of the full ordered call list,
  `focusTab` first); same handle (`T7` explicit, `T1` cursor); ref and locator targets for click and type;
  pressKey; explicit `tab` (no claim at all) and cursor tab (exactly one first-touch claim, `cursor.tab === "T1"`
  after, a second call claims nothing more); a trusted call on an explicit `T9` leaves the cursor on `T1`;
  untrusted omitted and `false` send no `focusTab`; S2.2 for `DISARMED`, `TAB_HELD`, `WINDOW_MINIMIZED` on all
  five cases, explicit and cursor tab, outcome equal to `browser_focus_tab`'s and the only work call `focusTab`;
  `DISARMED` → a one-item `isError` result. All present.
- **Implementation mutations** (same harness; each must turn a test red):
  ```
  focus on untrusted too (click|type|press):            23 | 8 | 6 failed
  focus after the action (click|type|press):            13 | 13 | 7 failed
  focus on a different handle: constant "T1" (c|t|p):   4 | 4 | 2 failed
  swallow the focus error, still act (c|t|p):            7 | 6 | 3 failed
  no focus at all (c|t|p):                              13 | 13 | 7 failed
  focus on a different handle: `tab ?? "T1"` (c|t|p):   0 failed (finding 3)
  ```

## Task 4 — the two changed expectations in `mcp/test/tools.test.ts`

```diff
-  it("browser_type forwards trusted:true when asked", async () => {
+  it("browser_type forwards trusted:true when asked (after focusTab on the same tab, #106)", async () => {
     …run("browser_type", { ref: "e5", text: "hi", submit: true, trusted: true });
-    expect(f.work()).toEqual([["type", { ref: "e5", text: "hi", submit: true, trusted: true, tab: "T1" }]]);
+    expect(f.work()).toEqual([
+      ["focusTab", { tab: "T1" }],
+      ["type", { ref: "e5", text: "hi", submit: true, trusted: true, tab: "T1" }],
+    ]);
-  it("browser_press_key forwards trusted:true when asked", async () => {
+  it("browser_press_key forwards trusted:true when asked (after focusTab on the same tab, #106)", async () => {
-    expect(f.work()).toEqual([["pressKey", { key: "Enter", trusted: true, tab: "T1" }]]);
+    expect(f.work()).toEqual([
+      ["focusTab", { tab: "T1" }],
+      ["pressKey", { key: "Enter", trusted: true, tab: "T1" }],
+    ]);
```
Both are behaviour changes ruled by the user in #106 (a new call before the action), not an error text edited to
match: the action's params are unchanged and no error text is involved. Allowed; to be listed in the as-built
register as #106's two changed expectations.

## Task 5 — the diff against the plan

- `mcp/src/tools/registry.ts`: +8 −3. Three descriptions gain exactly the sentence ` With trusted=true the tab is
  first brought to the front of its window (as browser_focus_tab does) and is left there.` appended at the end,
  nothing else in them changed; three `if (trusted === true) await bridge.call("focusTab", { tab: t });` lines
  (with a one-line comment) inside the existing `onTab` callbacks before the action. `onTab`, `attempt`, the
  cursor, every schema and every other tool are untouched. The S2.3 description test confirms no other tool ends
  with the sentence.
- Outside the lane: `git diff --stat -- sdk extension daemon shared` empty; `sdk/src/policy.ts` unchanged (its
  header at lines 19–20 still says "The MCP's trusted tools keep today's behaviour" — the builder proposes text
  for S8). No new logging, no `windows.update` (`grep -n "focusTab\|windows.update" mcp/src/tools/registry.ts`
  → the three new lines and `browser_focus_tab`'s at 647 only).
- `mcp/test/tool-schemas.ts`: inside `mcp/tsconfig.json`'s `include: ["src","test","build.mjs"]`, so typechecked
  by `npm run typecheck`; not matched by vitest's `**/test/**/*.test.ts`; its "run directly" block fires only when
  `process.argv[1]` ends in `tool-schemas.ts` (under vitest it is vitest's own path, and the 44 tests ran without
  printing the fixture); it writes nothing, only `stdout`; not bundled by `mcp/build.mjs` (entry `src/index.ts`).
  Fit to commit.

## Task 6 — the spec attacked

- Attach-set codes from `focusTab` (`TIMEOUT`, `OFFSCREEN`) produce a failure report plus a screenshot exactly as
  `browser_focus_tab` does; `DISARMED` / `DOMAIN_BLOCKED` give the one safety line; `LOCK_TIMEOUT` is thrown; the
  action is never sent in any case (finding 2, run). Phase doc 0.2 and F19 are met; F19's two-call gap (another
  actor's capture between focus and input) remains as documented and is not testable here.
- Untrusted actions never focus (10 tests, and the "focus on untrusted" mutants are red); the extension's own
  CDP escalation stays unfocused as in the SDK (0.2, by design).
- Stale text outside the lane: finding 1 (`registry.ts:643`, `setup.md:148`), plus the builder's `setup.md`
  list and `policy.ts:19–20`.

## Exit checks

- **S2.1 — held.** Ref and locator targets, click / type / press, explicit and cursor tab: `focusTab {tab:T}`
  then the action with the same `tab`, focus first; untrusted (omitted, `false`) sends no `focusTab`; the cursor's
  claims unchanged. 32 tests fail on the code at `f45e3bf`; the mutations above are red.
- **S2.2 — held.** A `focusTab` error is the answer (equal to `browser_focus_tab`'s) and the action is not sent
  (15 + 1 tests; swallow mutants red; probe run for attach-set and safety codes).
- **S2.3 — held.** Names and input schemas equal `f45e3bf`'s (fixture regenerated at `f45e3bf`, byte-identical;
  the test fails on five schema mutations); the three descriptions carry the focus sentence, no other tool does.
- **Every stage — held.** `npm test` 2763 → 2807 (+44), 116 → 117 files, no test removed (two renames listed);
  `npm run typecheck` exit 0; `npm run build` exit 0; no tracked change from the build.

## Verdict

**PASS-with-notes** — no CRITICAL or MAJOR finding, every exit check held; two MINOR (a now-false
`browser_focus_tab` description / `setup.md:148`; a focus failure reads like the action's failure) and three NIT
findings for the step agent.

## Round 1 re-check (2026-10-25)

Scope: the fixer's round 1 (`briefs/S2-fixer1.md`, report `S2-fixer1.md`), which addressed MINOR 1 (registry part
only) and NIT 1. Re-checked only those items plus the every-stage checks. One worktree (`wt-r1` at `09fa604` with
the main tree's five S2 files copied in, `node_modules` by junctions) was used for the mutant and then removed;
`git worktree list` shows only the main tree.

**(a) `browser_focus_tab`'s description — held.** `git diff mcp/src/tools/registry.ts` now has one change beyond
the first pass, at line 643:
```
-    "Bring this session's tab … on screen and focus its window. The only tool that changes what the human sees; it does not change this session's tab.",
+    "Bring this session's tab … on screen and focus its window. Trusted browser_click/browser_type/browser_press_key focus the same way first; it does not change this session's tab.",
```
It matches the brief's text exactly (`grep -c` of the full new sentence with its closing `",` → 1). Nothing else in
`registry.ts` changed: the other hunks are the first pass's three descriptions and three focus lines. The schema
test and the focus-sentence test pass in the full run below. The focus sentence still appears on exactly the
three action tools: the description test checks every tool, and `browser_focus_tab`'s new text does not end with
the sentence. `docs/setup.md:148` is unchanged, which is outside the lane and left for the step agent, as the
brief says.

**(b) NIT 1 — held.** `mcp/test/s2-focus-first.test.ts`: `fakeBridge(handler, claimed = "T1")`, and the five
cursor-path cases use `fakeBridge(undefined, "T4")` and expect `focusTab {tab:"T4"}`, the action on `T4` and
`cursor.tab === "T4"` (lines 84–99). I re-ran the mutant `{ tab: t }` → `{ tab: tab ?? "T1" }` in `wt-r1`, one
focus site at a time, with `s2-focus-first.test.ts` + `tools.test.ts`:
```
unmutated:                        Tests  142 passed (142)
mutant at site 0 (click):         × click with a ref, the cursor's tab … focusTab {tab:T4} then click on T4
                                  × click with a locator, the cursor's tab … → Tests  2 failed | 140 passed (142)
mutant at site 1 (type):          × type with a ref / a locator, the cursor's tab … → Tests  2 failed | 140 passed (142)
mutant at site 2 (pressKey):      × pressKey, the cursor's tab … → Tests  1 failed | 141 passed (142)
restored: true
```
Process note: the fixer applied its own mutant runs in the main tree from a backup and restored it. Their report
shows the restore was byte-identical, and the brief allowed this ("revert it immediately"). The registry is clean
now: the unmutated run above used a copy of the main tree's file.

**(c) Every-stage checks — held.**
- `npm run typecheck`: `tc=0`.
- `npm test`: `test=0`, `Test Files 117 passed (117)`, `Tests 2807 passed (2807)`.
- Per-file names compared with `0d189a0`: `files 116 117 tests 2763 2807 added 46`. The only "removed" names are
  the two `tools.test.ts` renames of the first pass.
- Per-file names compared with the first pass: `tests 2807 2807 added 5`. The five "removed" names are the
  cursor-case titles in `s2-focus-first.test.ts` renamed from `T1` to `T4`. No test was removed.
- `npm run build`: `build=0`.
- `git status --short` (tracked): `mcp/src/tools/registry.ts` and `mcp/test/tools.test.ts` are S2's. Also modified:
  `docs/plans/…-asbuilt.md`, `…-steps/journal.md` and `recipes/bb-login.ps1`. These belong to the step agent and
  the concurrent stage, not to S2 or the build. Untracked S2 files: `mcp/test/fixtures/`,
  `mcp/test/s2-focus-first.test.ts`, `mcp/test/tool-schemas.ts`.

Still open, not in round 1's scope: MINOR 1's `docs/setup.md:148` half (for the step agent or S8); MINOR 2 (a
focus failure reads like the action's failure; record it as known behaviour); NITs 2 and 3.

**Final verdict (round 1): PASS-with-notes.** No CRITICAL or MAJOR finding, every exit check held, and the two
fixed items are confirmed.
