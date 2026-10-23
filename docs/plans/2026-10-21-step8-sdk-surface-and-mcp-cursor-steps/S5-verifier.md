# S5 verifier report — the MCP cursor and tools (cross-package)

2026-10-23 · independent verifier · Opus 5.5 · HEAD 9b903d9 + the uncommitted S5 lane diff · nothing
edited in the main tree, nothing committed, nothing live (no Chrome, no real daemon, no port 9234).

## Method

- Clean worktree `git worktree add <scratchpad>/s5-verify HEAD` (detached 9b903d9), `npm ci`, then
  `npm test` at plain HEAD (baseline). Then `git diff HEAD -- <8 tracked lane files> | git apply` plus a
  copy of the two untracked files (`mcp/test/s5-cross.test.ts`, `sdk/src/report.ts`);
  `diff -q --strip-trailing-cr` against the main tree: all 10 files identical. Then `npm run typecheck`,
  `npm test`, `npm run build`, the grep, 25 single-line mutations (script `mutate.cjs` in the
  scratchpad: apply one, `npx vitest run mcp/ --reporter=verbose`, record failures, restore; final
  `diff -q` of `registry.ts`/`cursor.ts` against the main tree: "same"), and one scratch probe test
  (deleted after). Worktree removed (`git worktree remove --force`, leftover dir deleted, `git worktree
  prune`; `git worktree list` shows only the main tree).
- Spec read: phase doc 0.2, 0.3, 0.5, 0.6 (all dated notes), Stage S5, exit checks S5.1–S5.4, Open
  items; decisions #59, #81, #83, #86, #89, #90, #92, #93; kickoff §7/§9 lines on S5; common.md.
- Lane: the phase doc gives S5 `mcp/src/`, `mcp/test/`. `sdk/src/report.ts` and the `./report` export in
  `sdk/package.json` are granted by decisions.md · 2026-10-23 · S4's failure-report details (#93) item 2;
  `docs/setup.md`/`docs/e2e-test-plan.md` by S5.4; `mcp/test/multi-actor.test.ts` by the step agent's
  grant (S5.ledger.md 11:32:42Z). Nothing else changed (`git diff HEAD --stat -- sdk/src/ shared/ daemon/
  extension/` printed nothing; `sdk/src/index.ts` unchanged).

## Counts

| | Test files | Tests | Command |
|---|---|---|---|
| Baseline, plain HEAD 9b903d9 (clean worktree) | 78 passed | **1493 passed** | `npm test` |
| After, HEAD + S5 lane (clean worktree) | 79 passed | **1532 passed** | `npm test` |

+39 = `tools.test.ts` +36 net (40 `it(` lines added, 4 removed: the two "22 tools" tests renamed to 23
and the two `browser_new_tab` tests replaced by the no-cursor branch) + 3 in `s5-cross.test.ts`. No test
removed without a replacement.

```
base-test.log:  Test Files  78 passed (78)      Tests  1493 passed (1493)
after-test.log: Test Files  79 passed (79)      Tests  1532 passed (1532)
tc=0   (tsc -p shared, daemon, sdk, mcp, extension — no output)
build=0: built daemon → dist/index.js / built mcp → dist/index.js / built extension → dist/
grep -c "server.tool(" mcp/src/tools/registry.ts → 23
319:    "browser_use_active_tab",
```

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| S5.1 `npm test` after ≥ before + the cursor/tool tests; typecheck and build green | **PASS** | 1493 → 1532, 0 failed; typecheck exit 0; build exit 0 (above) |
| S5.2 23 tools; the new one is `browser_use_active_tab` | **PASS** | `grep -c` → 23; `registry.ts:319` |
| S5.3 coverage, each item discriminating | **PASS** | mutation table below: every listed item has a test that fails when its hunk is broken |
| S5.4 setup.md and e2e-test-plan.md cover the new tool and locator fields | **PASS** | setup.md: 23 tools, `browser_use_active_tab` row, `ref \| locator` on 5 actions, `### Locators`, `### Failure reports`, cursor and new-tab paragraphs with *Superseded* notes; e2e: STAT-1, MUX-1, MUX-8, TAB-3, NET-12, LEASE-1 get dated notes, §4.18 CUR-1…3, LOC-1, LOC-2, ASREF-1, REP-1 (not yet run) |

### S5.3 — mutations (worktree, one at a time, `npx vitest run mcp/`, 152 tests)

| # | Mutation (file) | Result | Tests that caught it (excerpt) |
|---|---|---|---|
| M1 | `resolve()` always claims (cursor.ts) | 22 failed | `tab resolution (T4.4) > without tab the active tab is claimed on first touch and kept, even when the human's tab changes`, cursor.test.ts ×6 |
| M1b | status `cursor.set(human.tab)` (registry) | 5 failed | `S5 — the cursor does not follow the human … > the cursor stays when listTabs (and the claim) move the human's active tab`, `s5-cross (a)` |
| M2 | Human's line also when equal | 3 failed | `cursor on the human's tab, held by me: Cursor line, no Human's line`, `s5-cross (a)` |
| M2b | Human's line never | 4 failed | `the human moved to another tab: the Human's active tab line appears…`, `s5-cross (a)` |
| M3 | use_active_tab without `cursor.set` | 3 failed | `the cursor stays … only browser_use_active_tab moves it`, `s5-cross (a)` |
| M4a | new_tab `active = true` initially | 4 failed | `browser_new_tab with no cursor yet opens in the background`, `active:false after the cursor was lost`, multi-actor F26 test |
| M4b | active whenever cursor set | 1 failed | `active:false when the human looks at another tab; it still moves the cursor` |
| M4c | never active | 1 failed | `active:true when the cursor's tab is the human's active tab; the result text is unchanged` |
| M4d | listTabs failure → active | 1 failed | `active:false when listTabs fails` |
| M4e | new_tab also sends `focusTab` | 5 failed | the four new_tab tests + multi-actor |
| M5 | click sends `{ref, locator}` | 2 failed | `browser_click with a locator sends {locator} and no ref key`, `with a ref the params have no locator key` |
| M5b | click drops the locator | 4 failed | the above + `s5-cross (b)`, `s5-cross (c)` |
| M5c | type drops the locator | 1 failed | `type, hover, select_option and scroll take a locator` |
| M5d | both ref and locator allowed | 1 failed | `both ref and locator, or neither, is a tool error … with no call` |
| M6a | ref line not printed | 1 failed | `with asRef the call carries asRef:true and the ref comes back as a line` |
| M6b | asRef never forwarded | 1 failed | same |
| M7a | no image block | 3 failed | `an attach-eligible error is returned as isError with report() text and the screenshot as an image`, `s5-cross (c)` |
| M7b | failure report disabled | 4 failed | the above + `no image block when the screenshot could not be taken` |
| M7c | MCP `isAttachCode` gate removed | 1 failed | `the MCP's own code gate: a non-attach error that already carries report() is still thrown` |
| M7d | render an image when `report` is missing | **survived** | equivalent today: unreachable for non-attach codes (gate first); see finding 7 |
| M8 | seconds bound → 30 000 | 1 failed | `each wait kind gets its own call bound: seconds s*1000+5000 …` |
| M8b | locator wait bound → 30 000 | 1 failed | `a locator wait sends waitFor {locator, state, tab} and nothing else, with timeoutMs 15000` |
| M9 | explicit `tab` moves the cursor | 4 failed | `an explicit tab does not move the cursor`, `an explicit tab with a locator acts there and does not move the cursor` |
| M10 | notice dropped on a report result | 7 failed | `an explicit tab attaches on that tab; the lost-cursor notice still prefixes the report`, cursor-lost tests |
| M11 | status claims when no cursor | 2 failed | `no cursor: Cursor: none yet …, no Human's line, and status claims nothing` |

The non-attach branch ("no image and today's text"): `a non-attach code (TAB_HELD) is thrown with
today's text, no image, no attach calls` asserts `f.work()` = `["click"]` and the message; M7c shows
the MCP's own gate is covered too.

### Cross-package test (`mcp/test/s5-cross.test.ts`)

Real `WsHost` + `Bridge` from `daemon/src` in process with `{ port: 0, token: "s5-cross-token-SENTINEL" }`
(line 139), real SDK `connect()` (env `BRIDGE_TOKEN` sentinel, `BRIDGE_DAEMON` a temp file, injected
`hashDaemon`/`spawnDaemon`), real `BridgeLink`, `TabCursor`, `registerTools`, a fake proto:2 extension
over real `ws`. (a) status shows `Cursor: T… "Play" … (held by me)` and `Human's active tab: T… "Other" —
not mine; …` after `ext.human = 102`, the next click still goes to `tabId 101`, `browser_use_active_tab`
moves it to 102; (b) `ext.of("click")` = `[{ locator: {role:"button", name:"Go", nth:0}, trusted:false,
tabId:101 }]` (no `ref`), waitFor `{locator:{text:"Saved"}, state:"hidden", tabId:101}`; (c) content
types `["text","image"]`, first line `LOCATOR_NOT_FOUND: no element matches button "Nope"`, snapshot,
screenshot and network reads on tab 101, one PNG in the temp `BRIDGE_FAILURES_DIR`.

Isolation: `failureReports.env = { BRIDGE_FAILURES_DIR: <mkdtemp>/failures }`, `homedir` a temp path;
`WsHost` is constructed without `handleNumbers`, and the high-water mark is only wired in
`daemon/src/main.ts:167` (`createHandleMark({ dir: deps.stateDir … })`), so the test writes no mark.
Measured: running all `mcp/` tests with `USERPROFILE`/`HOME` pointed at an empty temp dir wrote no file
there (`find <probe> -type f` empty, 152 passed), and again with `BRIDGE_FAILURES_DIR` at a temp dir
(empty); the real `~/.chrome-agent-bridge/` holds only `daemon.log`, mtime 12:37:52 +0400, before
these runs (15:34–15:40 +0400), and no `failures/` dir exists.

### Attacks

- **Cursor movers.** `grep -n "cursor\.set\|cursor\.resolve" mcp/src -r` → `registry.ts:244` (resolve,
  first touch), `:326` (use_active_tab), `:520` (select_tab, explicit handle), `:557` (new_tab). Only
  use_active_tab and the first touch follow the human. `onTab` with an explicit `tab` calls `attempt`
  without touching the cursor (`:243`; M9). Status reads `cursor.tab` only (M11).
- **new_tab with no cursor** → `active:false` with no listTabs call (`:544-553`; M4a). `focusTab`
  appears once in `registry.ts` (`:531`, browser_focus_tab); trusted tools do not focus (#89 / #78-4).
- **No daemon.** The no-daemon describe registers 23 tools and runs every one, incl.
  `browser_use_active_tab: {}` (`tools.test.ts:758`), each rejecting with the stored reason; status
  prints `Daemon: not connected` + `Problem:` (unchanged branch).
- **`_registeredTools[name].handler`** still read by `tools.test.ts:51`, `extension-down.test.ts:69`,
  `s5-cross.test.ts`; all pass.
- **SDK surface.** `sdk/src/index.ts` unchanged; `report.ts` is two re-export lines (`attachContext`,
  `isAttachCode`, `ATTACH_CODES`; types `AttachOptions`, `FailureReportConfig`, `RawCall`);
  `package.json` adds only `"./report": "./src/report.ts"`.
- **Logging.** `git diff HEAD -- mcp/src | grep "^+.*console\|^+.*stderr\|^+.*process\.std"` → nothing.
- **Schemas vs #83.** Nested `locator {role?, name?, exact?, text?, css?, nth? int ≥ 0}`, `ref:
  z.string().optional()` on click/type/hover/select_option/scroll; `browser_type.text` and
  `browser_wait_for.text` keep their meaning; `browser_press_key` unchanged (`:410`).
- **Attach budget.** `attachContext` (`sdk/src/error.ts:147`, unchanged) wraps everything in
  try/catch and uses `ATTACH_BUDGET_MS = 5_000`; the MCP passes only timers/env/homedir/now and the raw
  call, no budget. The raw `call()` is not enriched by the SDK (only `tab.ts:153` calls attachContext), so
  there is no double attach.
- **multi-actor.test.ts.** Diff = the header "22 tools" → "23 tools" and the four F26 lines (B has no
  cursor because its claim was refused → `active:false`, background text). It is the designed rule of
  0.6 / F26 / brief point 4, not an edit to fit unintended behaviour; M4a/M4e break it as expected.
- **4002 notice with an error result.** `withNotice` prefixes a report result (`:246`); a thrown error
  re-arms it (`:248`); M10 caught.

## Findings

1. **MINOR — every page exception in `browser_evaluate` now becomes a full failure report.**
   `mcp/src/tools/registry.ts:210-224, 649-664` (with `sdk/src/error.ts:350`). `PAGE_ERROR` is in the
   attach set, so a thrown expression (common in exploratory `browser_evaluate`) now triggers a snapshot
   (which renumbers the tab's refs), a default-mode screenshot (a ~1.5 s flash when the tab is in the
   background, a PNG written to `~/.chrome-agent-bridge/failures/`) and a network read; and the report
   flattens the multi-line message to one line capped at 300 characters, so the stack lines the tool
   showed before are no longer laid out (`data.stack` is not rendered). Evidence (scratch probe, fake
   bridge, evaluate throwing `PAGE_ERROR` with a 3-line message):
   ```
   PROBE calls=tabs.claim,evaluate,snapshot,screenshot,networkRequests
   PROBE types=text,image
   PROBE text=<<PAGE_ERROR: TypeError: Cannot read properties of null (reading 'x') at <anonymous>:1:15 at foo (<anonymous>:3:1)
   Refs: this snapshot renumbered the tab's refs — refs from before the failure are void; use the refs shown.
   ```
   This follows phase doc 0.5 and #93 literally (the code is conformant). It is a spec-level effect on
   an existing tool that no S5 test, E2E row or proposed decision names. Suggested: the session agent
   records it under Open decisions (options: keep; render `PAGE_ERROR`'s full message/`data.stack` in
   `report()`; or skip the screenshot for `browser_evaluate`'s `PAGE_ERROR`), and an E2E row or a note in
   REP-1 covers it.
2. **NIT — the `— held by <owner>, not mine` variant of the Human's line is not in 0.6 and not a proposed
   decision.** `registry.ts:307-311`. Phase doc 0.6 gives only `… — not mine; call browser_use_active_tab
   to work there`. The variant is sensible (the claim would be refused) and is documented in setup.md and
   the builder's Deviations, but the builder's Proposed decisions do not list it. Suggested: fold it into
   the "browser_status keeps `Active tab:` …" decision.
3. **NIT — after a lost cursor, status says `Cursor: none yet`.** `registry.ts:300-302`: after
   `markLost()` `cursor.tab` is null, so the line reads as if no tab tool had run. Harmless (the next
   tool's notice explains), wording only. Suggested: leave, or `Cursor: none (lost when the daemon
   restarted) …`.
4. **NIT — #59's revisit trigger is met.** decisions.md #59: "Revisit if: Step 8 adds
   `browser_use_active_tab`". Kickoff line 610 expects an *Updated* note on #59 at S5. For the session
   agent (it writes decisions.md).
5. **NIT — `browser_wait_for {locator, idleMs}` silently ignores `idleMs`.** `registry.ts:599` rejects
   text/seconds/networkIdle with a locator but not `idleMs` (which only means something with
   networkIdle). Suggested: add `idleMs` to the check and its message, or leave.
6. **NIT — STAT-1 and MUX-1 still say "Four lines"/"four lines" in their expected text,** followed by
   a correction note that adds a fifth/sixth line (`docs/e2e-test-plan.md:236, :471`). Correct under the
   no-silent-edit rule (`git diff --word-diff` shows only additions, the two `[-…-]` tokens are
   punctuation re-split around the inserted note), but a reader sees "Four lines" first. Acceptable.
7. **NIT — the branch "attach code but `attachContext` left no `report`" is untested.**
   `registry.ts:213` (`if (typeof err.report !== "function") return null;` → rethrow). Mutation M7d
   survived because the SDK's `attachContext` always sets `report` for an attach code it did not crash
   on. Suggested: one test with an `attachContext` stub that leaves the error untouched, or accept.

No CRITICAL or MAJOR findings. The docs rows use only the fixture page (`test-fixtures/e2e-playground.html`:
`Email address` line 30, `Sign in` 49, `#counter` 56, `Load message in 1.5s` 120, `#async-area` 121,
`Async content loaded!` 253); no real user tab is quoted (setup.md's `T7 "Gmail"` is the phase doc's own
example text).

## Verdict

**PASS-with-notes** — all four exit checks pass in a clean worktree (1493 → 1532, typecheck 0, build 0,
23 tools), every S5.3 item is discriminating by mutation, the cross-package test runs real daemon + SDK
+ MCP over `ws` on port 0 with temp failure and home dirs; one MINOR (spec-level: `browser_evaluate`
`PAGE_ERROR` reports) and six NITs.

## Re-check (fixer round 1)

2026-10-23 · same verifier · scope: findings 1, 5 and 7 only, as the step agent asked (`S5-fixer1.md`).

**Method.** I made a fresh worktree at 9b903d9 and applied the full current lane diff (8 tracked files)
plus the untracked `mcp/test/s5-cross.test.ts` and `sdk/src/report.ts`; the 6 files I compared with
`diff -q --strip-trailing-cr` (registry.ts, tools.test.ts, s5-cross.test.ts, report.ts, setup.md,
e2e-test-plan.md) are identical to the main tree. I diffed the new versions against the round-0 versions
(the round-0 lane diff, kept in the scratchpad). `mcp/src/cursor.ts`, `mcp/src/index.ts`,
`mcp/test/multi-actor.test.ts` and `sdk/package.json` are unchanged. The changes are only:
- `registry.ts`:
  - `RegisterToolsOptions.attach?: typeof attachContext`;
  - `const REPORT_MESSAGE_CHARS = 300`;
  - `const attach = options.attach ?? attachContext`, and `failureReport` calls `attach(…)`;
  - `Full message:` is appended when the message has a `\n` or is longer than 300 characters;
  - the locator arm of `browser_wait_for` also rejects `idleMs`, with the message
    `… drop text, seconds, networkIdle and idleMs`.
- `tools.test.ts`: the loop gains `{ idleMs: 800 }` and the new message, plus two new tests.
- `setup.md`: one sentence in §Failure reports.
- `e2e-test-plan.md`: a note added to the end of REP-1, a row that has not run yet.

Nothing else moved.

**Default attach path unchanged.** `mcp/src/index.ts` passes only `{ actorName }`, so production uses
`attachContext`. `s5-cross (c)`, which runs the real default `attachContext` with no stub, still passes.

```
ci=0  tc=0 (5× tsc -p, no output)
Test Files  79 passed (79)    Tests  1534 passed (1534)     (round 0: 1532; +2 new tests)
build=0: built daemon → dist/index.js / built mcp → dist/index.js / built extension → dist/
```

**Mutations** (`npx vitest run mcp/`, 154 tests, one at a time, restored; `diff -q` of the restored
registry.ts against the main tree: identical):

| # | Mutation | Result | Caught by |
|---|---|---|---|
| R1 | `Full message` append → no-op | 1 failed | `a multi-line message keeps its lines in a Full message block after report(); a short one-line message adds none` |
| R1b | append always (condition `true`) | 1 failed | same test (its one-line `LOCATOR_NOT_FOUND` half) |
| R5 | locator arm accepts `idleMs` | 1 failed | `locator with text/seconds/networkIdle, or state without locator, is a tool error with no call` |
| R7 | `attach` option ignored | 1 failed | `an attach code whose attach step left no report() is rethrown unchanged, with no image` |
| R7b | no-report branch renders instead of rethrowing | 1 failed | same test |

**Status of the findings.**
- Finding 1: **addressed as ruled.** The attach is kept per 0.5/#93, and the full multi-line message
  now follows the report, so the stack lines are no longer lost. The flash and the ref renumbering
  remain by design and are documented in setup.md and REP-1.
- Finding 5: **fixed.**
- Finding 7: **fixed.** M7d's equivalent mutant is now covered through the stub.

Findings 2, 3, 4 and 6 (NITs) were not in this re-check's scope.

**Updated verdict: PASS-with-notes.** All exit checks pass (1534/79, typecheck 0, build 0, 23 tools).
No finding is MINOR or above any more; NITs 2, 3, 4 and 6 stay open for the step/session agent.

The worktree is removed (`git worktree list` shows only the main tree).
