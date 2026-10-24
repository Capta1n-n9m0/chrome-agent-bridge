# S7 builder report — docs

**Date:** 2026-10-24 · **Builder:** Claude Opus 5.5 · **HEAD at start:** `eb6b991` (tree clean but the
step agent's untracked `S7.ledger.md`) · **Nothing committed** (left for the step agent after the verifier).
No code file changed; no Chrome touched; no agent spawned; the token was never read or printed.

## 1. Files changed

| File | Change |
|---|---|
| `CLAUDE.md` | Architecture (flow: `focusTab` only under the lock, `tab is required`, the cursor's three movers, the SDK `Tab`/locators/failure reports; diagram: hello `session`, content script `locate`), Key files (Step 8's shared types, 23 codes, `handle-mark.ts`, `REMOVED_METHODS`, the SDK's eight values + `tab/locator/error/report/policy.ts`, the MCP's 23 tools, the recipes, the extension's `a11y/locate/nearest/marked`, `handlers/{target,locate,locator-wait}`, `evaluate/mark`, `trusted-input`, `session-marker`, `client.ts`), Commands (test count, `npm run recipe`, the recipes typecheck), Runtime gotchas (8 existing bullets updated with dated notes, 11 new Step 8 bullets, 3 new wave bullets), Docs (Step 8 pointer; "Next: Step 8" and "Steps 7–8 decided" superseded). Current state block untouched. |
| `docs/setup.md` | New "Writing a script" section (typechecked snippet, connect, tabs and the cursor, the `Tab` method list, locators with their fields, waiting/evaluating, failure reports, trusted input and `focusFirst`, the MCP view); failure-report image as a non-error result (#100); trusted-input note gains FE + the SDK policy; the `WINDOW_MINIMIZED` text (S2b rewrite) and `mode:"cdp"` via `tab.screenshot`, both with dated notes; `tab.release()`; the upgrade note for Step 8 (reload; `tab is required`; `selectTab` gone). |
| `docs/e2e-test-plan.md` | §5 results template: FE row line and REP-0 line added (the row index lacked them). Cross-references checked (below). |
| `docs/progress-and-roadmap.md` | Header status (dated note), §1 milestone row, 23-tool list with `browser_use_active_tab`, a Step 8 block (what exists, tests per stage, Runs 11–12, open items), §4 background-tabs bullet, the two Phase F items marked ✅ in the roadmap's wording plus what remains, the "Next" paragraph note. |
| `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` | Dated notes only: Status line, §5 (fallback removed by S2b, not S2), §7.3 (FE measured), §8.1 (as-built `waitFor`/`evaluateRef`/cursor/policy), §8.2 (failure-report fields, #100), §8.3 (S5's tools and lines), §10 (S2b's wire, 23 codes), §11 (Step 8 files), §12 (row 1 and the new risk), §13 (session marker answered, #94). |
| `README.md` | 23 tools, 1714 / 85 tests, the Step 8 features, a link to "Writing a script"; dated correction note. |
| `…-steps/S7-builder.md` | This report. |

## 2. CLAUDE.md gotchas, new or changed, with sources

| Bullet | Source | Where the fact is stated |
|---|---|---|
| NEW Locators resolved by the snapshot's rules — change `a11y.ts`, not two places | #87; #83; as-built § S1 | `extension/src/content/a11y.ts:175` `walkElements`; decisions.md #87 items 1–3; S1.md §6 (jsdom cost 1.4 s / 5 000 elements; pre-S1 capture 46 fixtures byte-identical) |
| NEW `locate` adds refs, never resets; every snapshot renumbers | S1.4 greps; S4 verifier (jsdom); #93 | S1.md / S1-verifier.md S1.4 row; S4.md §6 finding 2; decisions.md #93 (1) |
| NEW node → ref through `data-__bridge-mark` | #87 item 6; #92 item 1; #99 item 6 | `content/marked.ts:30`, `evaluate/mark.ts:79` (`removeAttribute`), `handlers/evaluate.ts:73` (`asRef needs an Element…`); Run 12 ASREF-1 |
| NEW Failure reports take the visibility lock and switch the screen | as-built § S4; #97; Run 12 REP-0 | `sdk/src/error.ts` header; S6.md gotcha candidate 5 (visible +20 ms, human hidden 1331 ms, call 1344 ms); R9-RESTORE; `recipes/blackboard/boot-bb.ts:41`, `export-grades.ts:82,132` |
| NEW Claude Code drops images from `isError` results | #100; S6b probe | S6b.md "New CLAUDE.md gotcha candidate"; `S6b-probe-record.md`; `mcp/src/tools/registry.ts:54` `failedLine`, `:245` `failureReport`; S6.md candidate 9 (tool-results copy) |
| NEW The MCP cursor never follows the human except `browser_use_active_tab` and first touch; SDK cursor rule | as-built § S5; #90 item 7 | `mcp/src/cursor.ts` header; `sdk/src/client.ts` `tab()` JSDoc |
| NEW Every tab call names its tab since S2b | as-built § S2b; #81; #94 | `daemon/src/intercept.ts:464`, `daemon/src/methods.ts:42-44` |
| NEW Session marker retires handles on a Chrome restart | #80; #94 items 2–4; Run 12 SM-0, SM-1 | `extension/src/session-marker.ts:1-26`, `daemon/src/intercept.ts:165-181`; S6-run-record.md SM-0 (P3-e); S6.md candidate 4 |
| NEW Recipes run with tsx; `String(fn)` breaks under tsx | S6 verifier §7 (reproduced in node:vm) | S6-verifier.md §7; S6.md candidate 1; root `package.json` `"recipe": "tsx"` |
| NEW `npm run typecheck` chains with `&&` | S2b builder/fixer; code | S2b.md gotcha candidates; root `package.json:9` |
| NEW A leaked lease on a retired handle is invisible through the API | S2b verifier mutation M6 | S2b.md gotcha candidates |
| NEW PowerShell 5.1 traps (alias `R`, stripped `"`, `-Filter`, UTF-16LE `>`) | Run 12 | S6.md candidates 2, 3, 10, 16 |
| NEW `npx` through `cmd.exe` refuses a long argument | Run 12 MCP leg | S6.md candidate 14 |
| NEW Chrome restarts and live sites (HWNDs, full-window frames, `*.localhost`, SSO wait, live data) | Run 12; #101; #103 | S6.md candidates 8, 11, 12, 13, 15 |
| CHANGED MCP no-crash bullet: 22 → 23 tools | as-built § S5 | `grep -c "server.tool(" mcp/src/tools/registry.ts` → 23 |
| CHANGED Human's-tab resolver: no `targetTab` fallback, no legacy path; + `browser_use_active_tab`, network calls, SDK `tabs()` | as-built § S2b | `extension/src/tabs.ts:43-59`; `daemon/src/intercept.ts:469-472` |
| CHANGED MUX-6: `spawnDaemon` inherits no pipe; cause unmeasured | #91 (1) | decisions.md #91; S3.md §5 |
| CHANGED Editing extension code: `unknown method: locate` = pre-Step-8 extension | code | `daemon/src/methods.ts:19` (`locate` in `TAB_METHODS`) |
| CHANGED `SERIALIZER_SRC` is a composite that marks with `asRef` | #92 (1) | as-built § S2 (`evaluate/serialize.ts:402`) |
| CHANGED `targetTab`: absent → `BAD_PARAMS` | #72; as-built § S2b | `extension/src/tabs.ts:58`; `grep -rn "targetTab({}" extension/src` → empty, exit 1 (run 2026-10-24) |
| CHANGED Handles: never reused across daemons; `id` kept (#81) | #79; #94 item 8 | `daemon/src/handle-mark.ts:18-25` |
| CHANGED `newTab`: the MCP's activation rule | #95 (1) | as-built § S5 |
| CHANGED Only `captureVisibleTab`… / switch sequence: `selectTab` removed | #94 (1) | `daemon/src/methods.ts:42-44` |
| CHANGED Trusted background input: FE outcome, `focusFirst` | #89; #78; Run 11 | `FE-run-record.md`; e2e-test-plan §5 Run 11; `sdk/src/policy.ts` |
| CHANGED Content-script failures: `__bridgeData`; `code` required | #82; #73 | `content/guard.ts:25`; as-built § S1, § S2b; `daemon/src/wsHost.ts:240` |
| CHANGED Knock bullet: the legacy path removed | as-built § S2b | — |
| CHANGED Colour captures: blue reads true, cyan shifts | S6 verifier r2; REP-0 control A | S6.md candidate 7 |
| CHANGED Reload proof: resync up to 2 s after the press | Run 12 SM-0; #94 Revisit-if | S6-run-record.md lines 1399–1400, 1671–1673 |

Not taken as gotchas: S4's covered-window note (stated, not measured; folded into the failure-report
bullet as R9-RESTORE's measurement); S5 "no new gotcha"; FE "no new gotcha" (the FE live facts are in
the trusted-input bullet).

## 3. Checks (run at HEAD `eb6b991`, before the doc edits; no code changed after)

```
$ npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
TC_EXIT=0
$ npm test
 Test Files  85 passed (85)
      Tests  1714 passed (1714)
   Duration  21.19s
TEST_EXIT=0
$ npm run build
built daemon → dist/index.js
built mcp → dist/index.js
built extension → dist/
BUILD_EXIT=0
```

The build rewrote the gitignored `dist/` in the main tree from committed code (`git status` showed no
tracked change); nothing was reloaded.

## 4. The setup snippet's typecheck (S7.2)

The snippet was written to a temporary `recipes/_s7-snippet.ts` with a temporary
`recipes/_s7-tsconfig.json` (`{"extends": "./tsconfig.json", "include": ["_s7-snippet.ts"]}`), then:

```
$ npx tsc --noEmit -p recipes/_s7-tsconfig.json
EXIT=0
# positive control: appended `await client.tab().click(42);`
recipes/_s7-snippet.ts(23,26): error TS2345: Argument of type 'number' is not assignable to parameter of type 'Target'.
CONTROL_EXIT=2
# restored; then the block extracted from docs/setup.md itself (awk from "// my-script.ts" to the closing fence):
$ diff <extracted> recipes/_s7-snippet.ts && echo IDENTICAL
IDENTICAL
$ npx tsc --noEmit -p recipes/_s7-tsconfig.json   (on the extracted text)
EXIT=0
```

Both temporary files were deleted; `git status --short` afterwards listed only the doc files. The
snippet was not run (it needs Chrome).

## 5. The 23-tool check

`grep -c "server.tool(" mcp/src/tools/registry.ts` → `23`. Names (`grep -A1`): browser_status,
browser_use_active_tab, browser_navigate, browser_snapshot, browser_screenshot, browser_click,
browser_type, browser_press_key, browser_scroll, browser_hover, browser_select_option, browser_back,
browser_forward, browser_list_tabs, browser_select_tab, browser_focus_tab, browser_new_tab,
browser_close_tab, browser_wait_for, browser_evaluate, browser_download, browser_network_requests,
browser_network_clear — the same 23 as the table in `docs/setup.md` §5 and the list in
`docs/progress-and-roadmap.md` §1. Codes: 23 in `shared/src/codes.ts` (9 daemon + 13 extension + 1 SDK).

## 6. e2e-test-plan cross-references

Every `](plans/…)` link in `docs/e2e-test-plan.md` resolves to an existing file (13 checked, 0 missing,
including `FE-run-record.md`, `FE-wave-sheet.md`, `S6-run-record.md`, `S6-wave-sheet.md`). §4.17–§4.19
references point at the right sections. The results template lacked the FE rows and REP-0; both lines
were added. Not changed: the header's "The 46 automated tests" (a stale count from 2026-06-04, not a
cross-reference; outside the brief's mechanical scope — noted for the propagator).

## 7. S7 exit checks (self-check)

- **S7.1** Every new gotcha cites its source (table §2). `grep -n "a11y.ts" CLAUDE.md` → line 152 (Key
  files) and lines 516–517 (`- **Locators are resolved by the snapshot's own rules — change `a11y.ts`,
  not two places.**`). PASS by my reading; the verifier judges.
- **S7.2** `docs/setup.md` has "## Writing a script"; its snippet typechecks (§4). PASS.
- **S7.3** One commit per stage with the listed messages, no `dist/`/token/`exports/`: not mine to
  close — the stages committed as recorded in the as-built register; S7's own commit is the step
  agent's. Not checked by me beyond `git status` (no `dist/`, `exports/` or token file staged or modified
  among tracked files).
- **S7.4** The skill edit is not granted (G8-3) and was not made; the proposal is §8, for the as-built's
  "Needs the user's keyboard". The as-built entry itself is the session agent's to write.

## 8. G8-3 — proposed `blackboard-ultra` skill change (not made; read only)

File: `~/.claude/skills/blackboard-ultra/SKILL.md`, section `## Boot sequence`. Replace steps 1–3 —
from the line ```` ```bash ```` that opens step 1 through the paragraph ending
"`bb already loaded (<version>)`; to pick up an edited `bb.js`, reload the tab first." — i.e. this
exact old text:

````
```bash
# 1. Local file server, in the background, from the course repo's root.
python ~/.claude/skills/blackboard-ultra/scripts/serve_local.py 8765 .
```

Write the command exactly so (Bash tool, `~` and forward slashes): the
course repos' permission rules match that spelling.

   **Chrome asks first (2026-09-24).** …(the Local Network Access paragraph, unchanged)…

2. `browser_list_tabs`; pick (or open with `browser_new_tab(url)`) a tab on
   `https://ada.blackboard.com/ultra/courses/<courseId>/outline`. If it
   shows a login page, stop and ask the user to log in; never type
   credentials.
3. Load the helper, in `browser_evaluate`:

```js
window.BB_COURSE='<the course id the skill quotes>'; (0, eval)(await (await fetch('http://127.0.0.1:8765/_skill/bb.js',{cache:'no-store'})).text())
```
(the skill quotes a real course id here; this report replaces it with a placeholder — public repo)

   `/_skill/` is served from this skill's `scripts/` whatever folder the
   server was started in. It answers `bb loaded`, or `bb already loaded
   (<version>)`; to pick up an edited `bb.js`, reload the tab first.
````

with this new text (steps 4–5 unchanged):

````
1–3. **Boot with one command** (chrome-agent-bridge Step 8; run from the bridge repo's root):

```bash
npm run recipe -- recipes/blackboard/boot-bb.ts <courseId|course URL|course key> --keep-open
```

   It opens the course outline in a tab of its own (in the background), refuses a login redirect or
   another course, sets `window.BB_COURSE`, evaluates this skill's `scripts/bb.js` there (no local
   server, no Local Network Access prompt), checks `bb.VERSION` and prints the tab's handle
   (`kept T<n> open (bb loaded there)`). It is read-only and writes no screenshot. When it exits its
   lease ends: take the tab with `browser_select_tab(T<n>)` and work there. If it says `REFUSED —
   login`, ask the user to log in; never type credentials. To pick up an edited `bb.js`, reload the
   tab and run it again.

   **Fallback for one release** (until the next bridge step): the old boot — the local file server
   (`python ~/.claude/skills/blackboard-ultra/scripts/serve_local.py 8765 .`, with Chrome's Local
   Network Access prompt), a course tab from `browser_list_tabs`/`browser_new_tab`, and
   `window.BB_COURSE='<courseId>'; (0, eval)(await (await fetch('http://127.0.0.1:8765/_skill/bb.js',{cache:'no-store'})).text())`
   in `browser_evaluate`.
````

Points the user should check before granting: (a) the course repos' permission rules match the old
`serve_local.py` spelling, and would need an entry for `npm run recipe -- recipes/blackboard/boot-bb.ts`
run from the bridge repo; (b) the exact `REFUSED` wording — I paraphrased "login"; `boot-bb.ts`'s
refusal lines are in `recipes/blackboard/guard.ts` and the header of `boot-bb.ts` ("a login redirect");
(c) `--keep-open` printing the handle is stated in `boot-bb.ts:55`; that the MCP can then
`browser_select_tab` the released tab follows from the lease rules (the lease ends with the client)
but was not run as one sequence in Run 12 (SDK-6 ran the recipe alone).

## 9. Deviations

- The brief preferred quoting a real recipe verbatim. `recipes/sdk-login.ts` imports `./s6-rules.js`
  (row-specific pass rules) and `hello.ts` predates the `Tab`, so neither shows the Step 8 surface on
  its own; I wrote a short snippet modelled on `sdk-login.ts` and typechecked the exact text (§4), and
  `setup.md` points at `sdk-login.ts` as the full recipe.
- `docs/e2e-test-plan.md`: two lines added to the results template (the row index), beyond "check".
- `docs/progress-and-roadmap.md` §2 "Architecture at a glance" was not updated (it holds no stale
  Step 8 claim beyond what §1 now states).

## 10. Proposed decisions

### 2026-10-24 · S7's setup snippet is a short typechecked script, not a verbatim recipe
**Decided:** "Writing a script" shows a 21-line snippet built on `recipes/sdk-login.ts`'s flow, its
exact text typechecked against `recipes/tsconfig.json` with a positive control; `sdk-login.ts` is named
as the full recipe.
**Why:** both candidate recipes either import row-specific rules (`sdk-login.ts` → `s6-rules.ts`) or
show no Step 8 surface (`hello.ts`); S7.2 needs a snippet that typechecks, which this one does.
**Instead of:** quoting `sdk-login.ts` with its `sdk1Verdict` import; quoting `hello.ts`.
**Revisit if:** a recipe is written to be the documentation example (then quote it verbatim).
**By:** Claude (proposed)

### 2026-10-24 · S7 records the Run 12 wave facts as CLAUDE.md gotchas, compressed
**Decided:** S6.md's gotcha candidates 1–16 enter `CLAUDE.md` (each is a measured fact, per its cited row or report), grouped: the tsx `String(fn)` one and the Chrome-side ones (4, 5, 7) as their own bullets; the
PowerShell, `npx`, restart and live-site ones (2, 3, 8, 10–16) in three grouped bullets of the
"Driving Chrome from the outside" section, each citing its candidate number.
**Why:** each is a measured fact with a source; grouping keeps the section's density.
**Instead of:** one bullet per candidate (16 more bullets); leaving the wave facts only in S6.md.
**Revisit if:** a later wave needs one of them in more detail.
**By:** Claude (proposed)

## 11. Left unfinished / for others

- The G8-3 skill edit (needs the user's grant).
- The as-built's S7 section, the decisions entries and `CLAUDE.md`'s Current state block (session agent).
- S7.3's commit-per-stage check and the S7 commit (step agent / verifier).
- `docs/e2e-test-plan.md` header "The 46 automated tests" (stale since 2026-06-04; propagator).
- The snippet has not been run against Chrome (no live browsing in this stage).
