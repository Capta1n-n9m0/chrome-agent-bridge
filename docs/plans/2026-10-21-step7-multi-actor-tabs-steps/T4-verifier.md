# T4 verifier — SDK formatters + MCP pass-through

**Date:** 2026-10-22 · **Verifier:** Claude Opus 5.5 (independent; no agents spawned; no repo file
edited but this one) · **Base:** HEAD `e332c4b` + the uncommitted T4 lane diff of the main tree ·
**Claims audited:** `T4-builder-report.md` (treated as claims, not facts).

## Verdict: **PASS-with-notes**

No CRITICAL or MAJOR finding; every exit check T4.1–T4.5 passes. **T4.2 holds:** re-captured in
my own fresh worktree of 51de800, the bytes match the stored fixture exactly.

## Method

- Worktrees (scratchpad): `wt-t4` = `git worktree add … e332c4b`, then `git apply` of
  `git diff -- mcp sdk shared docs/setup.md docs/e2e-test-plan.md` (journal.md left out), plus a copy
  of every untracked lane file. A CR-stripped sha1 of every lane file matched the main tree (script
  printed no `DIFF` lines). `wt-base` = clean `e332c4b`. `wt-v51` = my own fresh `51de800`. The
  builder's `wt-51de800` was not used, and I left it in place. `npm ci` in `wt-t4` and `wt-base`
  (both exit 0).
- I ran nothing in the main tree except reads, `git diff`/`grep`, and writing this file. No
  `npm run build` there. Port 0 only. No Chrome. No token printed.

## Counts (re-measured)

| Tree | `npx vitest run` | typecheck | build |
|---|---|---|---|
| `wt-base` (e332c4b) | **53 files / 793 passed** | — | — |
| `wt-t4` (e332c4b + T4) | **59 files / 934 passed** | `npm run typecheck` exit 0 | `npm run build` exit 0 (daemon, mcp, extension) |

Per-file changes, from vitest JSON reporters on both trees: `mcp/test/link.test.ts` 13→17,
`mcp/test/tools.test.ts` 30→56, new `cursor` 18, `multi-actor` 4, `client-events` 8,
`format-baseline` 37, `format-network` 20, `format-snapshot` 24. **No file lost a test**, and
`extension/test/network-log.test.ts` and `snapshot.test.ts` keep theirs. 12 of the 30 old
`tools.test.ts` names were renamed. I read each renamed test. All 12 are there in adapted form
(e.g. "registers all 21 tools…" → "registers all 22 tools…"; the network passthrough cases are now
"passes "all" and a handle through…" with the full filter/types/failedOnly/limit/includeHeaders
params). The builder's 793/53 → 934/59 claim is confirmed.

Bundle: `mcp/build.mjs:11` and `daemon/build.mjs:11` still list `ws` in `external`.
`mcp/dist/index.js` has exactly 1 `require("ws")`, 0 `node_modules/ws/` paths, and contains
`function formatSnapshot` (:22585), `function formatNetwork` (:22666) and `function formatEntry`
(:22692), so `@bridge/sdk/format` is bundled in. It has 0 hits for `buildSnapshot|NetworkLog`, so
no extension code leaked into the MCP.

## T4.2 integrity (prominent: **PASS**)

1. **Re-capture in my own 51de800 worktree:**
   `npx tsx sdk/test/fixtures/capture-baseline.ts <scratch>/wt-v51` →
   `baseline matches: 23 snapshot, 12 network, 11 helper fixtures (51de80000b976aa1c44586a23cd2f078aab447a7)`, exit 0.
   Against `wt-base` (e332c4b) the script refuses:
   `Error: the worktree is at e332c4bb…, not 51de800`, exit 1.
2. **The script runs the 51de800 code, not today's.** I mutated *my worktree's* baseline code and
   re-ran check mode:
   - `extension/src/content/snapshot.ts:151` `[ref=` → `[REF=`: `baseline DIFFERS at line 8 … [REF=e1]`, exit 1.
   - `extension/src/network-log.ts:321` `padEnd(9)` → `padEnd(10)`: `baseline DIFFERS at line 222 …`, exit 1.

   After `git checkout -- extension` it reported "matches" again. The modules load by path from the
   worktree (`capture-baseline.ts` `load(...)`), and their relative imports resolve inside the
   worktree.
3. **The fixtures match 51de800's tests.** I read `extension/test/snapshot.test.ts` at 51de800 next
   to `SNAPSHOT_FIXTURES`. All 23 cases are there, in file order, with identical `innerHTML` strings
   (case 1's indentation included), and the shadow (open/closed), same-origin frame, cross-origin
   `contentDocument → null` and layout-stub (`1024x768`, `zero 0x0`, `sized 80x24`) set-ups are the
   same. The network inputs copy the 51de800 formatter cases (8 `formatEntries`, 4 `formatEntry`,
   11 helper values) and are built with the baseline `NetworkLog`.
4. **The comparison uses `toBe`.** `sdk/test/format-baseline.test.ts` reads the JSON only and never
   writes it. It runs `expect(formatSnapshot(result)).toBe(f.expected)` on today's `buildSnapshot`
   output, `expect(out).toBe(f.expected)` for network, and `toBe` for the helpers.
5. **A one-byte change in the formatter fails the test** (in `wt-t4`, restored after each run):
   - `sdk/src/format/snapshot.ts` `[ref=${e.ref}]` → `[ref=${e.ref}}`: **21 failed** / 37.
   - `sdk/src/format/network.ts` `"active tab"` → `"active Tab"` (plus `tab ` → `tab  `): **7 failed**.
   - `"···"` → `"··."`: **3 failed**.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| T4.1 tests ≥ before + fixture test; typecheck, build green | **PASS** | 793 → 934 (+37 in `format-baseline`); typecheck exit 0; build exit 0 (wt-t4) |
| T4.2 byte-identical vs baseline captured at the pre-T3 commit, `toBe` | **PASS** | §T4.2 above; my own 51de800 re-capture matches |
| T4.3 `grep -c "server.tool("` → 22; tab-touching tools have `tab: z.string().optional()` | **PASS** | `22` (HEAD: `21`); `grep -c "tab: z.string().optional()"` → `18` (navigate, snapshot, screenshot, click, type, press_key, scroll, hover, select_option, back, forward, wait_for, evaluate, select_tab, close_tab, focus_tab, network_requests, network_clear); status / list_tabs / new_tab / download have none. Through a real MCP `Client`, `listTools()` → 22 |
| T4.4 tab passthrough; first-touch claim kept; TAB_HELD renders the owner; list_tabs form | **PASS** | tools.test "tab resolution (T4.4)" block; multi-actor test 1 (real daemon); mutations M8–M12 below fail the tests; probe below |
| T4.5 setup.md + e2e-test-plan.md updated (new tool, `tab`, select_tab) | **PASS** | setup.md: 22 tools, a *tab* marker, a "Tabs" section, dated *Superseded* notes; e2e plan: TAB-1–4 rewritten, TAB-5 added, STAT-1/MUX-1/MUX-3/DL-1/NET-12 amended with dated notes; no T5 rows; no §5 recorded result touched (diff hunks only at §4 lines 190, 244–251, 305–308, 425–430, 552–555) |

Pre-registered extras:

| Extra | Result | Evidence |
|---|---|---|
| Network tools keep #40 scope semantics | PASS | `registry.ts:111`: absent/`"active"` → cursor; `"all"` and handles pass through; an `id` lookup claims nothing. A number is now refused by the schema (`MCP error -32602 … Expected string, received number`, probe), which fits #40 for a Step 7 client (the #54 legacy number belongs to Step 6 clients) |
| `browser_select_tab` → `tabs.claim`, never `focusTab`/`selectTab` | PASS | `registry.ts:296`; the only `focusTab` call is `:309` (browser_focus_tab); multi-actor asserts that no `selectTab`/`focusTab` reaches the fake extension |
| `TAB_HELD` renders the owner in a tool result | PASS | Probe through `Client.callTool` over `InMemoryTransport`: `{"content":[{"type":"text","text":"tab T1 is held by \"claude-code #4412\" since 10:01:33 — use browser_new_tab, …"}],"isError":true}` for both a first-touch claim and an explicit `browser_select_tab`; real daemon: multi-actor `^tab T\d+ is held by "claude-code #1001" …$` |
| Cursor-lost notice on 4002 and non-4002 | PASS | multi-actor tests 2 and 3 (real `WsHost.shutdown(1001)` / `shutdown(4002)`); mutations M5/M6 fail them |
| MCP never crashes when `connect()` fails | PASS | tools.test "no daemon (connect() failing)" (real `BridgeLink`, 22 tools, stored reason); `link.ts` try/catch around `onClient` (P7) + link.test "a throwing onClient…" |
| `lifecycle.ts` untouched | PASS | `git diff HEAD -- mcp/src/lifecycle.ts \| wc -l` → `0`; `git diff --stat HEAD -- daemon extension sdk/src/index.ts` → empty |
| `sdk/src/index.ts` five value exports | PASS | unchanged file: `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`, `downloadToFile` |
| #49 removed | PASS | `grep -n "text?" shared/src/protocol.ts` → nothing; `?? ""` is gone from registry (HEAD had `:282 return text(out ?? "")`); a `@ts-expect-error` pin in `protocol-step7.test.ts` |
| Cross-package run | PASS | `mcp/test/multi-actor.test.ts` ×6: `4 passed (4)` each time. It uses the real `daemon/src/{bridge,wsHost}.ts`, the real SDK `connect()` (only the `hashDaemon`/`spawnDaemon` seams are injected), `BridgeLink`, `TabCursor` and `registerTools`, over real `ws` on 127.0.0.1 port 0; only the extension is a fake. Its assertions are exact (`toBe`/`toEqual` on texts and on the params the extension received) |

## Fail-without-change (my own mutations, `wt-t4`, each restored)

`node v4-mutate.cjs` (scratchpad). Each line: the production mutation, then the named tests.

| Mutation | Result |
|---|---|
| M1 typed dispatch removed (`client.ts`) | client-events 6 failed / 8 |
| M2b extensionStatus not validated | 1 failed |
| M3b typed dispatch deferred to `queueMicrotask` (sync-frame gotcha) | 6 failed |
| M3 skip the `set.has` check | 0 failed (the check covers removal by an *earlier* listener; no test does that — NIT, below) |
| M4 no shared in-flight claim | cursor + tools 4 failed |
| M5 second adoption not a loss (non-4002) | cursor + multi-actor 2 failed |
| M6 `reconnected` not subscribed (4002) | 3 failed |
| M7 generation check removed | cursor 2 failed |
| M8 select_tab calls `focusTab` | tools + multi-actor 3 failed |
| M9 list_tabs `*` from `active` | 1 failed |
| M10 list_tabs owner dropped | 2 failed |
| M11 notice never prefixed | 6 failed |
| M12 explicit tab goes through the cursor | tools 5 failed |
| M13 status `Active tab` from `active` | 1 failed |
| M14 `onClient` not called | link + multi-actor 4 failed |
| M15 untargeted network label = handle | 3 failed |
| M16 "all" column = Chrome id | 3 failed |
| M17 new_tab without `active:true` | 3 failed |

`git status` of `wt-t4` after the run showed only the lane files.

## Findings

1. **MINOR — the B1 deviation (P1): an untargeted network listing says "active tab" but lists this
   session's tab.** `mcp/src/tools/registry.ts:111` passes scope `"active"` for an absent or
   `"active"` `tab`, while the call goes to the cursor's handle. Evidence: tools.test :631 asserts
   `Network — active tab: showing 1 of 1 …` after `["networkRequests", { tab: "T1" }]`. Judged
   against the plan: 0.7 requires byte-identical text "so the MCP transcript doesn't change and the
   E2E expectations … hold", and MUX-9's NET-1 (`docs/e2e-test-plan.md:436`, a T5.3 regression row)
   expects `Network — active tab: …`. So P1 is the conservative reading and follows the
   spec-discrepancy protocol (the deeper layer, 0.7, beats the brief). It is still a deviation from
   the step agent's own B1, and once the human switches tabs the label is wrong (P1's own "Revisit
   if"). `setup.md` documents it. The same holds for the unchanged text
   `Navigated active tab to <url>` (`registry.ts:152`). *Fix:* the step agent rules on P1 (accept
   it, or amend B1 and NET-1 together with a dated note); no code change needed for PASS.
2. **MINOR — the capture script's guard checks HEAD, not a clean tree.** `capture-baseline.ts:316`
   only checks `git rev-parse HEAD`. My mutated 51de800 worktree passed the guard and captured
   mutated text (finding 2 of §T4.2). Check mode would then report DIFFERS, so it fails safe. But a
   `--write` against a dirty 51de800 worktree would store non-baseline text (only the first write is
   possible, and the JSON already exists). *Fix:* also refuse when
   `git -C <worktree> status --porcelain -- extension` is non-empty.
3. **NIT — the commit the baseline was captured at.** #47 says "a worktree of T3's parent commit";
   T3 (`43c0a53`) has parent `54ccf08`, and the capture used `51de800` (per brief B2).
   `git diff --stat 51de800 54ccf08 -- extension/ shared/src/protocol.ts` is empty, so the bytes are
   the same. *Fix:* one line in the as-built saying so.
4. **NIT — superseded claims keep their leases.** After a first-touch claim, `browser_select_tab` /
   `browser_new_tab` move the cursor but never `tabs.release` the earlier tab. A claim that lands
   after `set()`/a loss (P6) is also still granted by the daemon. So the session keeps holding the
   human's tab, and other actors get `TAB_HELD` on it until the session ends. The multi-actor test
   shows this: after A selects its own tab, `list_tabs` still shows `[claude-code #1001]` on the
   human's tab. Spec §6.3 / §8.3 are silent about it, so it is not a deviation. *Fix:* a Step 8 item
   (release on cursor move, or document it).
5. **NIT — `set.has(l)` in the typed dispatch (`sdk/src/client.ts` handleMessage) is untested.**
   Mutation M3 passes all tests. The behaviour is reasonable. *Fix:* optional test of a listener
   that unsubscribes a later one during the same dispatch.
6. **NIT — expected texts of rows that already ran were amended.** STAT-1, TAB-1–4, NET-12, MUX-1,
   MUX-3 and DL-1 have earlier recorded runs. Their §4 expectations were changed for T4's new
   behaviour, each with a dated *Superseded* note, and no §5 result was touched. I read this as
   T4.5's required update ahead of the next run, not the forbidden "editing a row's expected text
   after its run" (that targets fitting an observed result). It is flagged so the step agent can
   confirm the reading. MUX-3 now says to compare titles because `recipes/hello.ts:74,77` still
   prints `[<chrome id>]` of the first active tab of any window (builder finding 2; T5's lane).
7. **NIT — `extension-down.test.ts` expected text change is a wire-shape change, not an edited
   error message.** The fake extension's `snapshot` answer changed from the pre-T3 `{text, count}` to
   a T3 `SnapshotResult`, so the expected tool text became its `formatSnapshot` rendering
   (`url:    title: "t"\n- button "Go" [ref=e1]`), with a dated note. Allowed.

**Builder claims confirmed:**
- Findings 1 and 2. `formatEntries`/`formatEntry` are called only inside
  `extension/src/network-log.ts` and its test; `recipes/hello.ts:74`.
- P2–P10, by reading the code and running tests.
- The TAB_GONE rule: the cursor is kept (tools.test :258).
- Nothing logs: new code adds no `console.*`. The only lines are `index.ts`'s unchanged connect
  messages, and they print no URL, title or token.

**Security boundary:** unchanged. No bind, token or daemon code was touched; the multi-actor test
binds 127.0.0.1 port 0.

## Cleanup

I removed my worktrees `wt-t4`, `wt-base` and `wt-v51` (with the scratch probe
`mcp/test/zz-v4-probe.test.ts` inside `wt-t4`). The builder's `wt-51de800` is left. Scratch
scripts: `v4-mutate.cjs`, `v4-cmp.cjs`, `v4-names.cjs` in the session scratchpad.
