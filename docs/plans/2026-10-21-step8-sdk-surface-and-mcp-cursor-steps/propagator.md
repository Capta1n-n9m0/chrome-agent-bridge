# Step 8 propagator — correction ledger

Written 2026-10-24 by the Step 8 propagator (Claude Opus 5.5), at `e963bff` (`docs(step8): as-built S7;
journal`).

**Inputs.** The Step 8 as-built register (every stage section) and `docs/decisions.md` #70–#104, compared
against these docs:
- the phase doc;
- the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`;
- `CLAUDE.md` (except the Current state block);
- `docs/setup.md`, `docs/e2e-test-plan.md`, `README.md` and `docs/progress-and-roadmap.md`;
- `docs/plans/` for later step plans. There are none: `next-session-prompt.md` is still the Step 8
  kickoff.

**Code checks.** Claims were checked against the code:
- `sdk/src/{tab,client,policy,error,report,index}.ts` and `sdk/package.json` `exports`;
- `extension/src/handlers/{target,evaluate,actions}.ts` and `extension/src/tabs.ts`;
- `grep -c "server.tool(" mcp/src/tools/registry.ts` → 23;
- `recipes/` with `recipes/blackboard/boot-bb.ts`, `export-grades.ts` and `README.md`, and the root
  `package.json` (`"recipe": "tsx"`);
- `npx vitest run` at `e963bff` → **1714 passed, 85 files**.

S7 (01fc58e) had already brought `CLAUDE.md`, `setup.md`, `README.md`, the spec and most of the roadmap in
line with the code, and my spot checks found them accurate. The **phase doc** had no dated note after S0
(last touched at `dcb72db`). Every deviation from S1 to S7 was still unreflected there, so most corrections
are in the phase doc.

No code, test, recorded E2E result or expected text of an already-run row was touched. No edits were made
to `decisions.md`, the as-built register or `CLAUDE.md`; what they need is listed at the end.

## Corrections (33)

| # | doc:line (after edit) | was → now | source |
|---|---|---|---|
| 1 | phase doc :8 | as-built register and steps dir "do not exist yet" → both exist (stage list, run records, this ledger) | as-built register |
| 2 | phase doc :108 | Files touched: `refOfNode`, `actions.ts` resolving itself, new `hello.ts`/`README.md`, skill edited → the as-built file list (a11y/locate/nearest/marked, target/locate/locator-wait, mark, trusted-input, session-marker, handle-mark, tab/locator/policy/report, `recipes/` set); `hello.ts` unchanged; skill not edited | as-built § S1, FE, S3, S2, S4, S2b, S5, S6, S7 |
| 3 | phase doc :140 | Order "(S2b ∥ S3) → S4 → S5" → actual close order with commits (S3 before S2, S4 before S2b, S6b inserted) | `git log 70aa754..HEAD`; as-built section order |
| 4 | phase doc :162 | Decisions intro: policy "recorded at S3", "no stage holds it" → FE measured it; #89 recorded before S3 | #89; as-built § FE, § S3 |
| 5 | phase doc :235 (0.2) | locate "in the same `callInPage` round-trip" → a separate `locateInPage` call via `resolveTarget`/`checkTarget`; no escalation on `LOCATOR_*`; extension `pressKey` targeted, SDK/MCP not; `waitFor {locator}` rules | `extension/src/handlers/target.ts`, `actions.ts:38,69`; #92 |
| 6 | phase doc :259 (0.3) | `refOfNode` + `markScript` → the mark rides `SERIALIZER_SRC`; `refOfMarked`; non-Element → `BAD_PARAMS "asRef needs an Element; the value is not one"`; SDK-5 PASS | `handlers/evaluate.ts:73`; #87(6), #92(1), #99(6); Run 12 |
| 7 | phase doc :367 (0.4) | trusted branch "if BG-1/BG-2 …" → `focusFirst` (#89); client mirrors all methods but `close`; `scroll` up/down only; timeouts; cursor rule as built (#90(7)); generation guard + handle mark (#79) | `sdk/src/policy.ts`, `tab.ts:228`, `client.ts:317-340`; #89, #90, #79 |
| 8 | phase doc :427 (0.5) | "every SDK call wraps" → `Tab` + mirrored methods only, never raw `call()`; MCP via `@bridge/sdk/report`; concurrent attach in one 5 s deadline; ref rewrite; REP-0 measured the switch; MCP non-error image result | `sdk/src/error.ts:147`, `report.ts`; #93, #97, #100; as-built § S4 |
| 9 | phase doc :500 (0.6) | F26 "not ruled" → #95(1) background rule and its result suffix; status layout #95(2); `browser_press_key` untargeted; `browser_wait_for` locator rules; `asRef` line; #100; Run 12 results | as-built § S5, § S6b; #95, #100 |
| 10 | phase doc :529 (0.7) | "claim or open a course tab" → opens its own tab, never claims; read-only allowlist, `failureReports:false`, `--dry-run`; export file name; `--mcp-plan`/`--hold`/`assemble-mcp.ts`; `sdk-login.ts`; skill unchanged | `recipes/blackboard/boot-bb.ts:1-20`, `export-grades.ts:3`; #102, #103 |
| 11 | phase doc :1008 (S4) | `attachContext(error, tab, opts)` → `(error, handle, opts)` | `sdk/src/error.ts:147` |
| 12 | phase doc :1025 (S5) | an error result with an image block → a non-error `[text, image]` result | #100; as-built § S6b |
| 13 | phase doc :1053 (S6) | "a wave run with the user after the autonomous phase closes" → Run 12 inside the phase, driver-run; the user's grants and answers; REP-0, S6b, `bb-login.ps1` added; standing totals | #96–#101; as-built § S6 |
| 14 | phase doc :1193 (S7) | skill checkbox and per-Part commits → not done (G8-3); S7.3 met by the commit map | #104(3); as-built § S7 |
| 15 | phase doc :1470 (S6.2) | the recipe file "the wave sheet fixes" → `npm run recipe -- recipes/sdk-login.ts`, SDK-1 PASS (Part 2) | Run 12 summary; `recipes/README.md` |
| 16 | phase doc :1474 (S6.3) | two separate exports compared → one held export read by both legs; met, sha256 `b1f8ef6f…46b6a8`, 418 999 bytes | #102, #103; as-built § S6 |
| 17 | phase doc :1523 (G8-1) | open → resolved (FE outcome before `policy.ts`; `policy.ts` header cites the rows) | `sdk/src/policy.ts:1-27`; #89 |
| 18 | phase doc :1542 (G8-2) | Gmail switch, user's keyboard for the wave → fixture windows, headless actors; the user's part was grants and answers; sign-in by autofill + UIA presses | #96, #98, #99(1), #101; S6.md |
| 19 | phase doc :1552 (G8-3) | grant pending → not granted; listed in as-built § S7; the proposed text | as-built § S7 |
| 20 | phase doc :1568 (STOP rules) | "BG findings absent at S3" and "any Blackboard write" → the first cannot fire; the second is amended by #98; no write in Run 12 | #89, #98; `S6-run-record.md:479,1038,2388` |
| 21 | phase doc :1690 (Who decides) | "the `trusted` policy → the BG findings" → FE's outcome table (#78, #89); open contract decisions in decisions.md items 1–22 | decisions.md Open decisions |
| 22 | phase doc :1703 (Needs keyboard) | reload, `/mcp`, the whole wave, the Gmail switch → none needed. The user gave grants and answers and approved the FE commit (829368e). Left for the user: G8-3, the open decisions, push | as-built § FE, § S6, § S7 |
| 23 | e2e-test-plan :8 | "The 46 automated tests" → 1714 in 85 files at `e963bff` | `npx vitest run` |
| 24 | e2e-test-plan :958 (§4.18) | "Not yet run" → ran in Run 12, with each row's standing result; the row texts are unchanged | Run 12 summary; #99, #100 |
| 25 | roadmap :5 | Status "gate waits on the docs stage S7 and …" → S7 closed at `01fc58e` (#104); only the user is left | as-built § S7 |
| 26 | roadmap :199 | Step 8 block "#70–#103", "after this docs stage" → #104 added, S7 closed | decisions.md #104 |
| 27 | roadmap :250 | Open-for-the-user list without #104 → `#104 (item 3)` added | decisions.md Open decisions item 22 |
| 28 | roadmap :258 | Step 7 block "**Not closed:** the gate waits for the user's rulings" → ruled by #68/#69; Step 7 closed, as its heading says | #68, #69 |
| 29 | roadmap :271 | "legacy path until Step 8" → S2b removed it (`BAD_PARAMS "tab is required"`, `selectTab` → `UNKNOWN_METHOD`) | as-built § S2b |
| 30 | roadmap :313 | "Step 8 adds focus emulation, measures it, then sets the policy" → done, `focusFirst` | #89 |
| 31 | roadmap :375 | MUX-6 "(→ Step 8)" → S3.5: `spawnDaemon` inherits no pipe; the MUX-6 cause remains unmeasured | #91(1) |
| 32 | roadmap :180, :523 | anchor `#…-built-and-e2e-run-gate-open` (a renamed heading) → `#step-7--multi-actor-tabs-2026-10-2223-closed-2026-10-23`; a dated note at :180 covers both | the heading at :257 |
| 33 | roadmap :181 | Quality state stopped at Step 7 → Step 8's 1714 / 85 | `npx vitest run` at `e963bff` |

## Seen, not corrected

- **`CLAUDE.md`**: I do not edit it (common brief: only the session agent writes it). Its two stale
  places are listed under "For the session agent". Everything else S7 wrote matched the code where I
  checked: the eight `index.ts` values, the 23 tools, `policy.ts`, recipes in vitest
  (`include: ["**/test/**/*.test.ts"]`), the typecheck chain with `&&`, and `"recipe": "tsx"`.
- **The phase doc's Outcome section and Status line**: the session agent rewrites them. The text is under
  "For the session agent".
- **The phase doc's earlier "Proposed" and "Stage 0 flags" notes**, for example 0.5's F25 list and the
  S2b note on F24. They stay as history. The later notes (#7, #8 and #9 above) say how each was resolved.
- **`docs/plans/next-session-prompt.md`** is still the Step 8 kickoff. The next `phase-kickoff`
  overwrites it, and its frozen copy is `…-steps/kickoff.md`.
- **`README.md`**: the Documentation list links only the 2026-06-04 design spec, not the daemon/SDK
  spec. That predates Step 8 and is not an assumption Step 8 broke. It could be added at close-out.
- **`docs/setup.md`, the spec, and the e2e plan's §4.19 header**: accurate as S7 left them. The §4.19
  header's "before any S6 row ran" is a dated statement of when the rows were written, so it is not
  stale.
- **The e2e plan's §5 Results template**: the empty checkboxes (`CUR-1 [ ]` and the rest) belong to the
  template, not to results.
- **`CLAUDE.md` gotcha "`fullPage` (CDP) on a hidden or minimized tab is unmeasured (T5b F9)"**: still
  true. `handlers/perceive.ts:21` runs `fullPage` without `cdpCaptureRefusal`. Step 8 did not touch it.
- **The decisions.md log text that went stale inside entries**, for example #89's "uncommitted at the
  time of writing", which its own Updated note already answers. I may not edit decisions.md, and the
  Updated note covers it.

## Contract-level questions raised (for the next kickoff)

1. **Re-registered checks not listed for the user.** #84 and #104 item 3, which reword or meet
   pre-registered checks, are under Open decisions. #99 item 5 (SM-1 and LOC-1 re-registered), #102
   (SDK-7's cap raised) and #103 (S6.3 redesigned on one held export) are the same class but are not
   listed. Should they be, for consistency with "a pre-registered rule is contract-level"?
2. **The MCP's trusted tools on a background tab still answer `ok` and do nothing.** #78 item 4 and #89
   kept the MCP unchanged under (B), so `browser_click {trusted:true}` on a background `tab` silently
   fails (BG-1/BG-2). Should the MCP refuse it (`OFFSCREEN`), focus first like the SDK, or keep the
   current behaviour? This changes what the human sees, so it is for the user.
3. **The extension's automatic CDP escalation on a background tab.** When an untrusted
   `click`/`type`'s content path fails, the extension escalates to CDP. The SDK cannot see that, so the
   escalated input is a silent no-op on a background tab (`sdk/src/policy.ts` header). Should the
   extension refuse escalation on a non-active tab?
4. **Failure reports are on by default and switch the human's view** to the failed tab (~1.3 s,
   REP-0). Scripts on private sites must opt out (`failureReports:false`). Is "on by default" still
   right for scripts, or should a non-fixture origin opt out automatically? This affects what the human
   sees and the privacy of the PNGs.
5. **The Chrome `id` beside `tab`** in `newTab`/`listTabs` results was kept "this step" (#81). Its
   consumers are `recipes/hello.ts`, `t5*.ts`, five daemon tests and `registry.ts`. The next step
   decides whether to remove it, with dated notes on MUX-3/5/6/8/10 and LEASE-5/6.
6. **Revisit triggers that may now be met.** #13 (`VERSION` after 2 s: "once every machine runs Step
   8") and #90 item 7 (the cursor kept after `release()`/`close()`: "if S6 shows a script acting on an
   unheld tab"). A grep of `S6.md` and `S6-run-record.md` for "unheld" and "release()" finds no such case. #100: re-run the S6b probe after a Claude Code
   upgrade.
7. **Later items recorded, not built:** `bb-login.ps1`'s condition-based post-submit wait (#101, #102);
   a ref-preserving snapshot (#93's revisit); generation-stamped refs (spec §13). The snapshot reset
   S4 measured makes the last one more relevant.

## For the session agent

**The phase doc's Status line** (`2026-10-21-step8-sdk-surface-and-mcp-cursor.md:3`), was "Planned":
> **Date:** 2026-10-21 · **Status:** Built and E2E-run 2026-10-23/24 (Runs 11 (FE) and 12 (S6)); the gate
> waits for the user's rulings on the Step 8 open decisions and on G8-3 (or "Closed 2026-10-2x" once
> the user rules)

**The phase doc's Outcome section** (replace "Targets at planning time; rewritten as results when the
step closes." and the five target bullets; keep the paragraph that starts "Test-driven development
applies"). Proposed text:
> Results at close (2026-10-24; contracts in the as-built register):
> - Locators (`{role, name}`, `{text}`, `{css}`, 0-based `nth`) are resolved in the content script by
>   the snapshot's own walk (`extension/src/content/a11y.ts`). A pre-S1 capture of 46 fixtures stayed
>   byte-identical. `{text}` matches any element past the pruning gates (#83). `waitFor({locator,
>   state})` exists, and `evaluate {asRef}` / `Tab.evaluateRef` turn an Element result into a ref
>   (SDK-4, SDK-5, LOC-2 PASS).
> - A typed `Tab` API with the client's cursor (`newTab`, `claim`, `tab()`; `NO_CURSOR` is the 23rd
>   code). For the seven attach codes, a `BridgeError` carries a snapshot, a screenshot path, the last 20
>   network entries and `report()` (SDK-2, SDK-3, REP-0 PASS). Its screenshot switches to the failed tab.
> - The MCP cursor does not follow the human except through `browser_use_active_tab` and the first
>   touch: 23 tools (CUR-1–3 PASS). A failure report with an image is a non-error result, so the image
>   reaches the model (#100; REP-1 PASS on re-run).
> - The background-input policy was measured: CDP focus emulation does not deliver trusted input to a
>   background tab (Run 11). So the policy is `focusFirst` for the SDK's `Tab`, and the MCP is unchanged
>   (#89).
> - The Step 6 compatibility path is removed and `code` is required on error frames. A session marker
>   retires every handle when Chrome restarts, and a new daemon never reuses a handle number (S2b; SM-0,
>   SM-1 PASS).
> - First recipes: `recipes/sdk-login.ts` (SDK-1), `recipes/blackboard/boot-bb.ts` (SDK-6 PASS on the
>   user's course) and the read-only `export-grades.ts` (SDK-7; S6.3 on one held export, equal
>   hashes).
> - Tests went from 950 / 59 to 1714 / 85, and typecheck was green at every stage close.
> - Not done: the `blackboard-ultra` skill edit (G8-3, not granted). ASREF-1 stands as FAIL on its
>   optional clause (#99 item 6).

**The as-built register's "Open decisions" line**: replace it with the set in decisions.md → Open
decisions (Step 8 items 1–22). The current line lacks #104 item 3. It also names #85 inside "#72 S2b
(amended #81, #85)", but #85 is a build-level ruling and is not in the open list. And it gives #99 only
as "item 6", leaving out S6b's error-result change. Proposed:
> decisions.md · 2026-10-23/24: #71 FE stage (amended #78); #72 S2b; #73 `code` required; #74 session
> marker (amended #80); #75 S3.4 re-exports; #76 `NO_CURSOR`; #78 FE rows and table; #79 handles never
> reused across daemons; #80 marker mechanism; #81 `id` stays, untargeted network = active, unlisted
> untargeted → `BAD_PARAMS`; #82 `__bridgeData`; #83 `{text}` rule, MCP `locator` object, exported
> `BridgeError`; #84 reworded checks; #87 items 2–4; #90 items 1, 2, 7; #91 #24 and #27/#28 as the final
> surface; #93 report ref rewrite, client options, `@bridge/sdk/report`; #94 S2b details; #95 S5 MCP
> details; #99 item 6 and S6b's error-result change; #100 failure report with an image is a non-error
> result; #104 item 3 (S7.3 by the commit map).

(Question 1 above asks whether #99 item 5, #102 and #103 should join this list.)

**The as-built register's format** (`.claude/skills/phase-kickoff/asbuilt.md`): S2 has no "### Contracts
(binding forward)" heading. S2b, S6b, S6 and S7 have only bullets, with no Contracts / Decisions taken /
Deviations / Estimates subsections. S4's "Decisions taken" still says "Proposed in §5" where #93 now
records them. Optional: add dated notes at close-out.

**`CLAUDE.md`, stale lines** (outside the Current state block):
- `CLAUDE.md:~702-705` (§ Docs): "**Step 7 built and E2E-run …** its gate waits for the user on
  R9-SCREEN-2's positive control and the open decisions #37, #40, #46, #51, #54 (decisions.md ·
  2026-10-23 · The user rules on the Step 7 close-out questions)". Replace with: "**Step 7 built,
  E2E-run and closed (2026-10-22/23, Runs 8–10)** … (decisions.md · 2026-10-23 · The user rules on
  R9-SCREEN-2 and the last five Step 7 open decisions (#69))", with a dated *Superseded* note.
- The Current state block (excluded from this pass) still says "Next: Step 8" and "22 tools, 950 tests".
  `session-closeout` rewrites it: Step 8 is built and E2E-run, with 23 tools and 1714 tests in 85
  files (`npm test` at `e963bff`), and the gate waits for the user.
