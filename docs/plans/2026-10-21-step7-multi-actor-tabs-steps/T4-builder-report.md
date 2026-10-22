# T4 builder report — SDK formatters + MCP pass-through

**Date:** 2026-10-22 · **Builder:** Claude Opus 5.5 · **Base:** `e332c4b` (main tree, uncommitted) ·
**Brief:** step agent's T4 builder brief, B1–B12, plus `briefs/common.md`.

Summary: the formatters moved to `sdk/src/format/` and render byte-identical text to commit 51de800
for all 23 snapshot fixtures, 12 network fixtures and 11 helper values. `BridgeClient` has typed
`tabGone`/`leaseGranted`/`extensionStatus` events. The MCP has a tab cursor (claim on first touch,
kept; lost on both restart paths, with a one-line notice), 22 tools, and `tab: z.string().optional()`
on the 18 tab-touching tools. `npm test`: 793 passed / 53 files → **934 passed / 59 files**;
`npm run typecheck` exit 0. No `npm run build` was run; nothing was committed.

## Files

Added:
- `sdk/src/format/snapshot.ts` — `formatSnapshot`, `SNAPSHOT_ELEMENT_CAP`.
- `sdk/src/format/network.ts` — `formatNetwork` (was `formatEntries`), `formatEntry`, `formatRow`,
  `formatAgo`, `formatDuration`, `formatSize`, `scopeLabel`; types `FormattableEntry`,
  `FormattableResult`, `NetworkScope`, `FormatNetworkOptions`.
- `sdk/src/format/index.ts` — re-exports them (the `@bridge/sdk/format` subpath).
- `sdk/test/fixtures/capture-baseline.ts` — the T4.2 capture script (check mode and a one-time `--write`).
- `sdk/test/fixtures/dom.ts` — the shared fixture DOM (a JSDOM installed as the global realm).
- `sdk/test/fixtures/jsdom.d.ts` — a minimal type shim (the repo has jsdom but not `@types/jsdom`).
- `sdk/test/fixtures/baseline-51de800.json` — the captured inputs and expected text, with `"commit"`.
- `sdk/test/format-baseline.test.ts`, `sdk/test/format-snapshot.test.ts`, `sdk/test/format-network.test.ts`,
  `sdk/test/client-events.test.ts`.
- `mcp/src/cursor.ts` — `TabCursor`, `lostNotice`.
- `mcp/test/cursor.test.ts`, `mcp/test/multi-actor.test.ts`.

Changed:
- `sdk/package.json` (`"./format": "./src/format/index.ts"`), `sdk/src/client.ts` (typed events).
- `mcp/src/link.ts` (`onClient` option; `LinkClient` gains `on("reconnected")`), `mcp/src/index.ts`
  (wires the cursor), `mcp/src/tools/registry.ts` (all tool changes).
- `mcp/test/tools.test.ts` (rewritten; all 30 old cases kept, adapted), `mcp/test/link.test.ts` (+4),
  `mcp/test/extension-down.test.ts` (fake answers the T3 snapshot shape; dated note).
- `shared/src/protocol.ts` (`NetworkRequestsResult.text` removed, #49),
  `shared/test/protocol-step7.test.ts` (the T0 case replaced by one that pins the absence).
- `docs/setup.md`, `docs/e2e-test-plan.md` (T4.5).

Untouched (verified): `mcp/src/lifecycle.ts` (`git diff HEAD -- mcp/src/lifecycle.ts | wc -l` → 0),
everything under `daemon/` and `extension/` (`git diff --stat HEAD -- daemon/ extension/` → empty),
`sdk/src/index.ts` (five exports; `sdk/test/index.test.ts` passes unchanged), every `dist/`.

## Baseline capture (T4.2, #47)

- **Worktree:** `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad\wt-51de800`
  (`git worktree add <that> 51de800`; HEAD `51de80000b976aa1c44586a23cd2f078aab447a7`). **Left in
  place for the verifier.**
- **node_modules:** neither `npm ci` nor a junction. The script runs from the main tree
  (`npx tsx sdk/test/fixtures/capture-baseline.ts <worktree>`) and loads the baseline modules by path
  (`<worktree>/extension/src/content/snapshot.ts`, `…/refmap.ts`, `…/network-log.ts`); tsx compiles
  them. Their only package import is the type-only `@bridge/shared` in `network-log.ts`; jsdom comes
  from the main tree. The script refuses a worktree whose HEAD is not 51de800 (tested against the main
  tree: `Error: the worktree is at e332c4b…, not 51de800`, exit 1).
- **Method:** each snapshot fixture is data (`html`, plus `shadow`/`frame`/`crossOriginFrameId`/`layout`
  for the stubs); `dom.ts` builds a fresh JSDOM at `http://localhost:3000/` (vitest's jsdom URL),
  installs its window as the global realm (the walk uses global `instanceof HTMLIFrameElement` etc.),
  applies the stubs, runs `buildSnapshot`, restores the globals. Network inputs are built with the
  baseline `NetworkLog` exactly as the 51de800 tests do, JSON round-tripped, then formatted by the
  baseline `formatEntries`/`formatEntry`. The comparison test reads the JSON only; it never writes it.
- **Runs:** `--write` once → `wrote …baseline-51de800.json`; check mode → `baseline matches: 23
  snapshot, 12 network, 11 helper fixtures (51de80000b97…)`, exit 0; a second `--write` is refused
  (exit 2). The verifier re-runs check mode in its own 51de800 worktree.
- **Sanity:** I read every captured text against its 51de800 assertions (all hold, e.g. the closed
  shadow root and the non-interactive roles give `url: http://localhost:3000/   title: ""\n` only; the
  900-button page ends `- button "B799" [ref=e800]\n- ... truncated at 800 elements; …`).

Captured — snapshot (all 23 cases of `extension/test/snapshot.test.ts` at 51de800): lists interactive
elements…; skips hidden elements; returns a refs count…; names via `<label for>`; via aria-labelledby;
wrapped in `<label>`; prefers aria-label; prunes display:none ancestor; aria-hidden subtree; inert
subtree; zero-size with layout (rect stubs); keeps every element with no layout; open shadow root;
closed shadow root; refs resolve to shadow elements; same-origin iframe; cross-origin iframe
(`contentDocument` → null); native controls; explicit ARIA roles; explicit role overrides; disabled
controls; non-interactive ARIA roles; 800 cap. Captured — network: all 8 `formatEntries` cases
(header/footer; errors/pending/redirect; type names/alignment; "all" scope; numeric scope 3; 300-char
URL cut; nothing recorded; `maxChars: 400` cap) and all 4 `formatEntry` cases; the 11 helper values of
"formatAgo / formatDuration / formatSize". **Skipped: none.**

Comparison (`sdk/test/format-baseline.test.ts`, 37 tests): today's `extension/src/content/snapshot.ts`
`buildSnapshot` (imported read-only) → `formatSnapshot` → `toBe(expected)` for the 23; `formatNetwork`/
`formatEntry` → `toBe` for the 12; helpers → `toBe`. **All pass; no comparison failed**, so no
expected text was touched. The extension import typechecks from `sdk/test` with no tsconfig change.

## Results

Before (main tree at `e332c4b`, `npx vitest run`): `Test Files 53 passed (53)`, `Tests 793 passed (793)`.

After (`npm run typecheck` then `npx vitest run`, main tree, no build):
```
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit 0
 Test Files  59 passed (59)
      Tests  934 passed (934)
```
+141 tests, +6 files:

| File | Before → after |
|---|---|
| `sdk/test/format-baseline.test.ts` (new) | 0 → 37 |
| `sdk/test/format-snapshot.test.ts` (new) | 0 → 24 |
| `sdk/test/format-network.test.ts` (new) | 0 → 20 |
| `sdk/test/client-events.test.ts` (new) | 0 → 8 |
| `mcp/test/cursor.test.ts` (new) | 0 → 18 |
| `mcp/test/multi-actor.test.ts` (new) | 0 → 4 |
| `mcp/test/tools.test.ts` | 30 → 56 |
| `mcp/test/link.test.ts` | 13 → 17 |
| `shared/test/protocol-step7.test.ts` | 58 → 58 (one case replaced) |
| `mcp/test/extension-down.test.ts` | 2 → 2 |

`mcp/test/multi-actor.test.ts` rebinds a port after a shutdown; 5 repeated runs all passed (4/4 each).
`extension/test/network-log.test.ts` keeps its formatter cases (B10), so nothing was moved out and no
count dropped.

Greps: `grep -c "server.tool(" mcp/src/tools/registry.ts` → 22; `grep -c "tab: z.string().optional()"
mcp/src/tools/registry.ts` → 18 (navigate, snapshot, screenshot, click, type, press_key, scroll,
hover, select_option, back, forward, wait_for, evaluate, select_tab, close_tab, focus_tab,
network_requests, network_clear; status, list_tabs, new_tab, download have none — also asserted by
the test "every tab-touching tool's schema has an optional string `tab`").

Build: not run (forbidden in the main tree). An in-memory esbuild bundle of `mcp/src/index.ts`
(`write: false`, the options of `mcp/build.mjs`) succeeded and contains `formatSnapshot`/
`formatNetwork`, so the `@bridge/sdk/format` subpath resolves in the bundle; `mcp/dist/index.js` kept
its 17:14 timestamp. T4.1's "build green" is for the verifier's worktree.

## The 38 retired snapshot assertions → new tests

All in `sdk/test/format-snapshot.test.ts`, describe "formatSnapshot — the 38 retired snapshot text
assertions (hand-off items 1–18)", one test per item, same fixture document (from
`SNAPSHOT_FIXTURES`), same strings, asserted on today's `buildSnapshot` → `formatSnapshot`:

| Item (51de800 test) | Assertions | New test |
|---|---|---|
| 1 lists interactive elements… | 4 | `1. lists interactive elements with role, accessible name, and ref` |
| 2 skips hidden elements | 2 | `2. skips hidden elements` |
| 3 `<label for>` | 1 | `3. names an input via an associated <label for>` |
| 4 aria-labelledby | 1 | `4. names an input via aria-labelledby` |
| 5 wrapped `<label>` | 1 | `5. names an input wrapped in a <label>` |
| 6 aria-label wins | 1 | `6. prefers aria-label over an associated label` |
| 7 display:none ancestor | 2 | `7. prunes descendants of a display:none ancestor` |
| 8 aria-hidden | 2 | `8. prunes an aria-hidden subtree` |
| 9 inert | 2 | `9. prunes an inert subtree` |
| 10 zero-size with layout | 2 | `10. skips zero-size elements when the document reports layout` |
| 11 open shadow root | 2 | `11. descends into an open shadow root` |
| 12 same-origin iframe | 2 | `12. descends into a same-origin iframe` |
| 13 cross-origin iframe | 1 | `13. skips a cross-origin iframe whose document is unreachable` |
| 14 native controls | 5 | `14. maps additional native controls` |
| 15 explicit ARIA roles | 4 | `15. passes through explicit interactive ARIA roles` |
| 16 role override | 2 | `16. lets an explicit role override the native mapping` |
| 17 disabled | 3 | `17. marks disabled controls` |
| 18 800 cap | 1 | `18. caps the number of listed elements and says so` (also checks the exact footer) |

Total 38. Each is also covered by the whole-text `toBe` of the same fixture in `format-baseline.test.ts`.

## New tests confirmed to fail without the change

TDD order: `client-events.test.ts` ran red before `client.ts` changed (6 failed / 2 passed — the two
passing are the negative "malformed frame" and "unsubscribe" cases, vacuous before the feature);
the `onClient` cases of `link.test.ts` ran red before `link.ts` changed (2 failed). `cursor.test.ts`
was written with its module, so every case failed on the missing import first. Then each mutation
below was applied to production code, the named tests run, and the file restored:

| Mutation (production code) | Result |
|---|---|
| `TabCursor.adopt` a no-op | cursor + multi-actor: 5 failed |
| `browser_select_tab` calls `selectTab` instead of `tabs.claim` | tools + multi-actor: 3 failed |
| `browser_new_tab` without `active: true` | 3 failed |
| list_tabs `*` from `active` instead of `current` | 1 failed |
| network label = the handle for an untargeted call | 3 failed |
| no cursor (a fixed tab instead of first touch) | 18 failed |
| the notice dropped from results | 6 failed |
| `browser_close_tab` without its no-`tab` guard | 1 failed |
| status `Active tab` from `active` instead of `current` | 1 failed |
| F12 column prints the Chrome id only | 2 failed |
| snapshot header without `JSON.stringify` | 27 failed |
| snapshot without ` [disabled]` | 3 failed |
| network type column 8 wide instead of 9 | baseline: 7 failed |
| `tabGone` guard skipped | client-events: 1 failed |
| `onClient` never called | link + multi-actor: 4 failed |
| `text?: string` put back on `NetworkRequestsResult` | `tsc -p shared`: `TS2578: Unused '@ts-expect-error' directive` |

## Deviations from the brief and the phase doc

1. **B1, the scope label for an untargeted network call.** B1 says the MCP passes "the handle it asked
   for" as `scope`. For an omitted (or `"active"`) `tab` the MCP passes `"active"` instead, so the
   header stays `Network — active tab: …`. Evidence: `docs/e2e-test-plan.md` MUX-9 (line 436) expects
   NET-1's `Network — active tab: showing 1 of 1 …`, MUX-9 is a T5.3 regression row ("same expected
   text as their last recorded run"), and phase-doc 0.7 says the moved formatter keeps "the E2E
   expectations". With the handle, NET-1 would read `Network — tab T1: …`. Explicit handles still
   print `tab T3`, and `"all"` prints handles in its column (F12). Conservative choice per the
   spec-discrepancy protocol (existing text identical). See proposed decision P1.
2. **`extensionStatus` has no shared guard.** B3 says "validated with the shared guards"; `@bridge/shared`
   has guards for `tabGone`/`leaseGranted` only, and the lane allows `shared/` for #49 only. The client
   checks `typeof params.connected === "boolean"` itself — the same check `extensionConnected` already
   used. A shared `isExtensionStatusEvent` is a later-stage candidate.
3. **Baseline capture without node_modules in the worktree** (B2 asked which): not needed, explained above.
4. **`mcp/test/extension-down.test.ts` expected text changed**, with a dated note: the fake extension
   answered `snapshot` with the pre-T3 `{text, count}`; it now answers a T3 `SnapshotResult`, and the
   expected tool text is that result's `formatSnapshot` rendering (`url:    title: "t"\n- button "Go"
   [ref=e1]`). This is a shape the wire changed in T3, not a changed error message.
5. **Extra E2E rows touched (T4.5):** NET-12 (`tab:<id>` → `tab:<T#>`, F12) and MUX-3's "the same
   `<id>` as `browser_status`" (see finding 2), each with a dated note. TAB-5 added for
   `browser_focus_tab`. No T5 rows.

## Proposed decisions

All 2026-10-22, By: Claude.

- **P1 · An untargeted network listing keeps the "active tab" label.**
  Decided: `browser_network_requests` with no `tab` or `tab:"active"` renders with scope `"active"`;
  an explicit handle renders `tab T3`; `"all"` shows handles in its column. Why: NET-1's recorded
  text (MUX-9, a T5.3 regression row) and 0.7's "E2E expectations hold". Instead of: the cursor's
  handle as the label (B1). Revisit if: Step 8's status line names the cursor, or the label misleads
  once the human's tab and this session's tab differ.
- **P2 · A network `id` lookup resolves no tab.** Decided: `browser_network_requests {id}` sends its
  params as given and claims nothing. Why: the daemon drops `tab` for an id lookup (T2 #6, global);
  a first-touch claim there could fail with `TAB_HELD` on a free read. Instead of: claiming first.
  Revisit if: the daemon scopes id lookups to a tab.
- **P3 · `browser_select_tab`/`browser_close_tab` without `tab` return an `isError` result.**
  Decided: `{content:[text], isError:true}`, nothing called. Why: B6 asks for a tool error without a
  call; returning keeps the no-call guarantee independent of how the SDK wraps throws. Instead of:
  throwing. Revisit if: Step 8 makes `tab` required in the schema.
- **P4 · `set()` after a loss clears it.** Decided: `browser_select_tab`/`browser_new_tab` after a
  lost cursor set it and drop the pending notice. Why: the agent just chose a tab with a fresh handle;
  a claim of the human's tab would be wrong. Instead of: giving the notice anyway. Revisit if: an
  agent is seen using an old handle after a restart it was not told about.
- **P5 · A notice whose call failed moves to the next result.** Decided: when the call after a
  re-claim throws, the notice is re-armed (`restoreNotice`) and printed on the next successful
  untargeted result. Why: "given once" is about the agent seeing it; an error result would lose it.
  Instead of: losing it. Revisit if: notices show up on unrelated later results.
- **P6 · A claim in flight when the cursor is set or lost does not land.** Decided: a generation
  counter; a stale claim's tab serves only its own call. Why: a claim answered by a replaced daemon
  names an old handle. Instead of: last-writer-wins.
- **P7 · `onClient` failures are swallowed.** Decided: `BridgeLink` wraps the hook in try/catch. Why:
  the no-crash rule. Instead of: letting a subscriber bug reject inside the link's `.then`.
- **P8 · `registerTools(server, bridge, cursor?)`.** Decided: an optional third argument, default a
  fresh `TabCursor(bridge)`; `index.ts` passes the one wired to the link. Why: existing call sites and
  tests keep working; the restart hook needs the link. Instead of: a global.
- **P9 · `browser_new_tab` without a handle in the answer** (a no-proto daemon path) prints
  `Opened tab <id>` and does not move the cursor. Why: no handle to keep. Revisit if: Step 8 S2 drops
  the legacy forms.
- **P10 · The T4.2 fixtures run in a JSDOM installed as the global realm**, shared by the capture and
  the test (`sdk/test/fixtures/dom.ts`), with a lane-local `jsdom` type shim. Why: identical
  documents on both sides, and `sdk/tsconfig.json` typechecks `test/`. Instead of: adding
  `@types/jsdom`, or vitest's jsdom environment (which the capture script cannot use).

## Findings

1. **Dead code in the extension (for a later stage):** `extension/src/network-log.ts` still has
   `formatEntries`, `formatEntry`, `formatAgo`, `formatDuration`, `formatSize`, `scopeLabel`,
   `formatRow`, `statusColumn`, `statusText`, `displayType`, `MAX_TEXT_CHARS`, `FormatListOptions`,
   and `NetworkQueryResult = Omit<NetworkRequestsResult, "text">` now omits nothing. Only
   `extension/test/network-log.test.ts` (~:550-759, "formatAgo / formatDuration / formatSize",
   "formatEntries", "formatEntry") calls them. Removing both is out of T4's lane; the SDK copies of
   those cases are in `sdk/test/format-network.test.ts`.
2. **`recipes/hello.ts` prints a Chrome id and the first active tab of any window**
   (`tabs.find((t) => t.active)`, `[${active.id}]`), so MUX-3's "same `<id>` as `browser_status`" no
   longer holds literally (status prints `[T#]` from `current`). The row now says to compare titles.
   `recipes/` is T5's lane.
3. **`browser_status` prints `Active tab: none`** when no listed tab has `current` (no normal window,
   or a pre-T1 extension). Deliberately no fallback to `active`: that is the W1 MUX-5 mismatch #43 removed.
4. **The notice says "the bridge daemon restarted"** also when a non-4002 close came from something
   else with the same daemon still up. The leases died with the connection either way (spec §6.3), so
   the re-claim is right; only the wording may be inexact.
5. **Pre-existing, unchanged:** T3 finding 1 (nested same-origin frames are not entered; framed
   `<select size>` lists as combobox) is reproduced by the baseline and today alike, which is why T4.2 passes.

## Unfinished

Nothing in the brief is left undone. Not done by design: `npm run build` (verifier's worktree), the
commit (step agent), the live E2E (T5; the schema change needs `/mcp`, part of G7-2).
