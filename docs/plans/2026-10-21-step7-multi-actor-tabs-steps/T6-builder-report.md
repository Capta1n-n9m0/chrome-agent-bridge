# T6 — builder report (docs + commits)

Builder: Opus 5.5, 2026-10-23, starting at HEAD `6c5c603` (tree: only `journal.md` and `T6.ledger.md`
changed by the session agent). **Nothing committed.** No `npm run build` was run.

## 1. Files changed

| File | Change |
|---|---|
| `CLAUDE.md` | Architecture diagram (tab layer, `tabId` on the wire, events, proto:2), Flow paragraph (the "active tab" sentence replaced, dated *Superseded* note), Key files (daemon `handles/leases/lock/methods/intercept`, `sdk/src/format` as `@bridge/sdk/format`, `mcp/src/cursor.ts`, 22 tools, `recipes/`, extension `tabs/errors/tab-events/network-scope/router/content/guard`), Commands (950 / 59, 22 tools, reload script), the "human's tab" gotcha rewritten, 3 existing gotchas extended, 21 new gotchas in two groups, Testing philosophy, Docs paragraph. The "## Current state" block is untouched. |
| `docs/setup.md` | Screenshot row; new subsections "Owners (leases)", "What you see while actors work", "Screenshots"; the security note on the active tab superseded; five troubleshooting entries. |
| `docs/progress-and-roadmap.md` | Header status (dated *Superseded*); milestone row Step 7; 22 tools; new "Step 7" block in §1 (built, tests per stage, Runs 8–10, BG findings, open for the user); §2 paragraph; §4 limitations (dated notes); §5 updated note. Step 7 is **not** marked closed. |
| `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` | Dated notes: §3 (F7 / LEASE-6 (b)), §6.2 (F13 params as built), §7 (*Superseded* on `cdp`, *Corrected* on the flash and occluded windows). |
| `docs/plans/2026-10-21-step7-multi-actor-tabs.md` | Two dated notes in Stage T6: commit messages as committed (T6.3), and the dead-code removal + protocol comments. |
| `shared/src/protocol.ts` | Comment lines only: `LeaseGrantedParams` (url filled by polling, may stay `""`/`about:blank`) and `ScreenshotMode` (`cdp` refuses minimized/background). `git diff` filtered to non-comment `+/-` lines → nothing. |
| `extension/src/network-log.ts` | Dead code removed: `formatAgo`, `formatDuration`, `formatSize`, `scopeLabel`, `statusColumn`, `statusText`, `FormatListOptions`, `formatEntries`, `formatRow`, `formatEntry`, `pushHeaders`, `displayType`, `MAX_URL`, `MAX_TEXT_CHARS`; header and `NetworkQueryResult` comments updated. |
| `extension/test/network-log.test.ts` | The three formatter `describe` blocks (15 tests) and their five imports removed; a header comment says where they live. |
| `sdk/test/format-network.test.ts` | Header comment only: dated *Corrected* note (the originals are gone, these copies are the only ones). |

## 2. New and rewritten `CLAUDE.md` gotchas, with citations

Rewritten: **"The human's tab" has one resolver** (`humansTab()` = `getLastFocused({windowTypes:["normal"]})`,
decisions.md #43 by title; R9-RESOLVER-1; the `NO_NORMAL_WINDOW` text from `extension/src/errors.ts` /
`daemon/src/intercept.ts`), with a *Superseded* note on the W1 MUX-5 gotcha and Stage 0 F31 (absorbed: the
old text "first active tab of any window" is corrected to "every window's active tab, readers took the
first").

Extended: top-level listeners now also cover `chrome.tabs.on{Created,Updated,Removed,Replaced}`
(`sw.ts` lines 88–118, column 1); manual reload: a no-proto extension is refused with `VERSION` + reload
hint (decisions.md 2026-10-22 "A stale extension is refused …"); per-call timeout: one deadline covers
the lock wait (#44 by title).

New, Step 7 group:
| Gotcha | Source |
|---|---|
| Every handler takes `tabId`; `targetTab` rules; fallback warns once per method | T1 report, T1.2 grep, `extension/src/tabs.ts` |
| Handles, not Chrome ids; restart renumbers; Chrome `id` still beside `tab` for one release | T2/T4 reports, #57 |
| `newTab` background unless `active:true`; MCP passes it | T3.4, `handlers/tabs.ts:72-75`, registry `:320` |
| Only `captureVisibleTab` needs the screen; background `waitFor`/`networkIdle` work | `methods.ts`; Run 8 BG-4 (3746 / 552 ms); `fullPage` unmeasured (T5b F9) |
| Trusted CDP input into a background tab answers ok, does nothing; flags don't help | Run 8 BG-1/BG-2 (5–10 ms); Run 10 BGF-1/2 (12–15 ms); #66; BG-3 clipboard |
| The switch sequence and why no window focus | plan 0.5, T3 report, `tabs.ts`; R9-SCREEN-5 (foreground unchanged); T3.3 grep |
| The flash is ~1.5 s | Run 8 SCREEN-1 1509/1486/1493 (median 1493); R9-SCREEN-1 1588/1557/1556 (median 1557); page-side `visibilitychange`; "onActivated may not end the wait" marked unconfirmed (Run 8 finding 3); SCREEN-3 Runs 8/9 no quota error |
| A capture in a fully covered window hangs; restore at ~30 s since T5b | Run 8 SCREEN-5 first attempt (`TIMEOUT` 35 s, target left in front ≥ 49 s, finding 5a); R9-RESTORE (`TIMEOUT` 35 119 ms, previous tab back +30 026 ms); T5b verifier N1 + residual race |
| `cdp` hung on hidden/minimized, now refuses | Run 8 SCREEN-2 (35 s, banner, transient `DEBUGGER_DEVTOOLS`), SCREEN-4 (25 s); R9-SCREEN-2/-4 (3 ms); #63 |
| Memory-Saver discard changes the tab id; `tabReplaced` keeps the handle; discarded page → `INTERNAL …Memory Saver`, `focusTab` reloads | Run 8 LEASE-6 (b), ids 1108126391 → 1108126396 |
| `{__bridgeError:"CODE:message"}` convention (`content/guard.ts`) | #38 by title, Stage 0 F1, T1 report |
| Formatters live in `sdk/src/format`; baseline never regenerated | T4 report, T4.2, #46/#47 |
| `leaseGranted.url` starts empty for a popup; poll fills it | Run 8 LEASE-3 (`""`); R9-LEASE-3 (45 ms; `TAB_HELD` at 44 ms); T5b |
| The knock hashes `daemon/dist` on disk; old client adopts newest daemon | Stage 0 F5 (verifier re-executed), `sdk/src/knock.ts:162`, #41 by title |
| Hard reload re-fetches `favicon.ico`; a plain fixture URL can come from cache | Run 8 NET-1 (`from cache: yes`, 12 914 bytes, `12.6 KB`); R9-NET-1 (`12.8 KB`, `from cache: no`, `showing 2 of 2`) |
| Captures are colour-managed (`#ff00ff` → `#dd00fa`, cyan → `#97fdfd`) | Run 8 SCREEN rows; R9-SCREEN-2 |

New, "Driving Chrome from the outside" group:
| Gotcha | Source |
|---|---|
| `chrome.exe --new-window chrome://…` opens a New Tab | Run 8 set-up fix 4; RELOAD-AUTO F1 |
| The scripted reload and its UIA facts (`dev-reload-button`, toolbar Reload `view_1003`, id = sha256 of path, resync line 5 of 5) | RELOAD-AUTO F1–F6, #65 |
| UIA `TabItem` is not a tab count | BG-FLAGS finding 3 |
| The driver's shell is in a job object (0x800); `Start-Process` children inherit it and the env | BG-FLAGS finding 5; `bgf-launch.ps1` (deviation §4) |

**F32** (the human switching tabs during the switch window gets overridden by the restore): not a
gotcha — the code changed since Stage 0. `restorePrevious` (`tabs.ts`) restores only while the window
still shows the target and no `focusTab` touched it (T3 V4, T5b). Put in `setup.md` "What you see" as
"leaves your choice alone (barring a race of a few milliseconds)".

**Left out (not sourced as a measurement):** a gotcha that `focusTab` un-minimizes a window (never
measured); that synthetic actions or snapshots work on a *hidden* tab (by design, but no Run 8/9 row
measured a snapshot on a hidden tab — the rows act on tabs active in their own windows); the T2 V4
handle-reuse-after-Chrome-restart risk (a proposal, not measured); BG-FLAGS finding 4 (`chrome://quit`
restores the session) — it only matters with the restart helpers, which need a new grant.

## 3. Test counts

| When | Command | Result |
|---|---|---|
| Before (HEAD 6c5c603 + my comment-only protocol.ts edit) | `npm test` | **965 passed, 59 files** |
| Before | `npx vitest run extension/test/network-log.test.ts` | 69 passed |
| After the deletion | `npx vitest run extension/test/network-log.test.ts` | 54 passed |
| After, final tree | `npm test` | **950 passed, 59 files** |
| After, final tree | `npm run typecheck` | exit 0 |

## 4. Dead-code decision — removed (15 tests, files unchanged)

- **Grep proves no import:** `grep -rnE "network-log(\.js)?['\"]"` over the repo (no `node_modules`, no
  `dist`) finds only imports of `Scope`, `NetworkLog`, `NetworkLogBlob`, `isOwnTraffic`,
  `WebRequestDetails`, `WebRequestEvent` (extension) and `NetworkLog`/`WebRequestDetails`
  (`sdk/test/format-network.test.ts`); `formatEntries|FormatListOptions` appear nowhere else but in
  comments. `mcp/src/tools/registry.ts` imports `formatEntry`/`formatNetwork` from `@bridge/sdk/format`.
  There is no `scripts/` dir; `recipes/` has no match.
- **SDK covers the same formatter:** `sdk/test/format-network.test.ts` holds the 15 copied cases (3 helper,
  8 `formatNetwork`, 4 `formatEntry`) plus 5 handle cases; `sdk/test/format-baseline.test.ts` pins the
  bytes. `sdk/test/fixtures/capture-baseline.ts` loads `extension/src/network-log.ts` **from a worktree
  of `51de800`** (it checks the worktree HEAD), so the removal in the main tree does not affect it.
- **Typecheck green**, tests 965 → 950 (−15, exactly the three removed `describe` blocks), 59 files.
- Helpers removed only where nothing else used them (`cut`, `normalizeType`, `MAX_BODY_BYTES` etc. kept).

## 5. T6.3 — stage → commit mapping (`git log --oneline 0773a98..HEAD`)

| Stage | Phase doc's listed message | Commit(s) as made |
|---|---|---|
| Stage 0 | — | `551d7fd` docs(step7): Stage 0 — spec audit; `546e2f1` docs(step7): record Stage 0's decisions … |
| T0 | — | `18520f9` feat(shared): T0 — Step 7 wire types; close `9322f24` |
| T1 | `feat(extension): tabId on every method, error codes, tab events` | `0240c7c` feat(extension): T1 — tabId, codes, tab events; close `51de800` |
| T2 | `feat(daemon): tab handles, leases and the visibility lock` | `e409706` feat(daemon): T2 — handles, leases, visibility lock, tab intercept; `cd346ed` fix(daemon): T2 — networkClear all …; close `54ccf08` |
| T3 | `feat(extension): structured snapshot, screenshot modes, focusTab` | `43c0a53` feat(extension): T3 — data not text, screenshot modes, focusTab; close `e332c4b` |
| T4 | `refactor(sdk,mcp): formatters move to the SDK; tools take a tab` | `138c7f6` **feat**(sdk,mcp): T4 — formatters in the SDK, tab handles in the MCP, browser_focus_tab; close `ecd07e4` |
| T5 (Run 8) | `docs: Step 7 E2E results` | `e7e56ff` rows/sheet/scripts; `87c75c5`, `19e8971` interim/close; `8ed3e89` docs(e2e): Step 7 E2E results (Run 8) |
| T5b | — | `12ecb65` fix(extension,daemon): T5b — …; close `b0aa22f` |
| RELOAD-AUTO | — | `15320a6` feat(recipes): RELOAD-AUTO — … |
| Run 9 | — | `b4ea752` rows pre-registered; `c99709a` results |
| BG-FLAGS (Run 10) | — | `00249de` rows; `c2234d4` results; `6c5c603` docs(step7): record RELOAD-AUTO, Run 9, BG-FLAGS |
| T6 | — | not committed (this builder does not commit) |

One code commit per stage holds; the messages differ from the listed ones in form (the long-run
`<type>(<scope>): <stage> — …` form) and T4 is `feat`, not `refactor` (it adds a tool). Recorded as a
dated *Corrected* note in the phase doc.

**Hygiene:** `git log --name-only 0773a98..HEAD | grep -nE "(^|/)dist/|bridge\.token|(^|/)\.env"` → no
match (exit 1). Token value (read from `bridge.token`, 32 characters, never printed): `git log -p
0773a98..HEAD | grep -cF` → **0** lines; `git grep -cF … HEAD` → **0** files; `git diff` (this
uncommitted tree) → **0** lines.

## 6. Checks

- `grep -n "Control targets" CLAUDE.md` → nothing (exit 1). The *Superseded* note in the Flow paragraph
  quotes the old meaning without those words, so T6.1 stays failable.
- `grep -c "server.tool(" mcp/src/tools/registry.ts` → 22; `docs/setup.md`'s tool table names 22
  distinct `browser_*` tools.
- `git diff shared/src/protocol.ts` → only comment lines.

## 7. Discrepancies and items for the session agent

1. `CLAUDE.md` line 14 (Current state block) still says "21 tools" for Steps 1–5 — historical and inside
   the block I may not touch; the `session-closeout` refresh should set the block to Step 7's state.
2. Lane: the phase doc gives T6 `CLAUDE.md, docs/`; the brief additionally granted `shared/src/protocol.ts`
   (comments) and the dead-code removal in `extension/` (+ one comment in `sdk/test/`). Recorded in the
   phase doc's T6 note.
3. `CLAUDE.md` Commands quotes 950 / 59 "on 6c5c603 + T6's tree"; once T6 commits, the line could name
   that commit.
4. The switch-mode `WINDOW_MINIMIZED` message still suggests `mode:"cdp"`, which now refuses a
   minimized window too (T5b F4, kept by #63 until Step 8). `setup.md` says so.
5. Spec §7's table still lists `cdp` as "default for unattended scripts" in its row; the dated note
   supersedes it (additions only).
6. Not verified by me: the anchor links in `progress-and-roadmap.md` render on GitHub (slug computed by
   hand: `#step-7--multi-actor-tabs-2026-10-2223-built-and-e2e-run-gate-open`).

## Fix round 1 (2026-10-23)

1. MINOR 1 — `CLAUDE.md:388-394`: F5 is now "found by reading the code; the Stage 0 verifier re-read it and
   ran only a same-build 4002 reconnect" (`stage0-audit.md:236`, `stage0-verifier.md:61-65,103-106`), and
   names `sdk/src/knock.ts:162` (`io.hashDaemon`, defined in `sdk/src/spawn.ts:44`).
2. MINOR 2 — `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:246-254`: a dated *Corrected* note
   under §7.3 (additions only) citing SCREEN-2 (35 012 ms), the T5b refusal (#63), #61 (focus emulation
   not run, no method sends it) and Run 10 / #66 (the flags did not fix trusted input).
3. NIT 4 — `docs/progress-and-roadmap.md:401-402`: "(not yet verified live)" restored in the 2026-10-22
   note; a separate "*Updated 2026-10-23: W1 verified it live (Run 7 …)*" note added.
4. NIT 5 — `CLAUDE.md:399-401`: the bars are "drawn by the E2E driver (`recipes/t5-lib.ts:148-149`)";
   cyan is `#00ffff`, read as `#97fdfd`.
5. MINOR 3 (README.md) left alone: outside T6's lane, for session-closeout.
