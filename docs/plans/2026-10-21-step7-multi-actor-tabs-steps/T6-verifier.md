# T6 — verifier report (docs + commits)

Verifier: Opus 5.5, 2026-10-23, independent. Audited the uncommitted `git diff` on HEAD `6c5c603`
(journal.md excluded), against the builder's claims in `T6-builder-report.md`, the run records
(`T5-run-record.md`, `T5-run9-record.md`, `BG-FLAGS-run-record.md`), the stage reports (`BG-FLAGS.md`,
`RELOAD-AUTO.md`, `stage0-audit.md`, `stage0-verifier.md`, `T5b.md`, `T5b-verifier.md`, `T1.md`, `T3.md`,
`T4.md`), the as-built register, `docs/decisions.md` and the code. I edited no file except this one.

## Verdict: **PASS-with-notes**

Counts: 10 checks run, 10 hold in substance. Findings: 0 CRITICAL, 0 MAJOR, 3 MINOR, 2 NIT.
Tests: clean HEAD **965 passed / 59 files**; HEAD + T6 patch **950 passed / 59 files**; typecheck exit 0.

## Checks

1. **T6.1.** `grep -n "Control targets" CLAUDE.md` → no output (exit 1). The "## Current state" section,
   diffed HEAD against the working tree (CR stripped, `## Current state` up to `## Architecture`) → `diff
   exit 0`, byte-unchanged.
2. **T6.2: gotcha citations, checked against their sources.** Each one matched:
   - LEASE-6: `T5-run-record.md:247-253`, ids 1108126391 → 1108126396, Urgent Discard, `INTERNAL: The tab
     was discarded by Chrome's Memory Saver …`, `focusTab` reloads. Chrome 156.0.8078.48 (`:23`).
   - BG-1/BG-2: `ok (5 ms)` / `ok (10 ms)`, status idle, works after focusTab (`:330-350`). Run 10:
     BGF-1 `ok (15 ms)`, BGF-2 `ok (12 ms)` (`BG-FLAGS-run-record.md:140,154`). #66's title matches
     `decisions.md:44`. BG-3 `NotAllowedError … Document is not focused` (`:363-367`).
   - BG-4: 3746 ms / 552 ms (`:359-361`).
   - cdp hang, then refusal: SCREEN-2 35012 ms, banner, `DEBUGGER_DEVTOOLS` (`:281-286`). SCREEN-4 25000 ms
     (`:313`). R9-SCREEN-2/-4 `OFFSCREEN` / `WINDOW_MINIMIZED` "in 3 ms" with no banner
     (`T5-run9-record.md:55,59-62,101`). `cdpCaptureRefusal` is in `extension/src/tabs.ts:103`.
   - Fully covered window hangs: Run 8 SCREEN-5 first attempt, 35 s, ≥ 49 s (`:324-327`). R9-RESTORE
     35119 ms, +30026 ms (`T5-run9-record.md:124-125`). T5b-verifier N1 (`:275`).
   - Flash: 1509/1486/1493, median 1493 (`:269-272`); 1588/1557/1556, median 1557 (`T5-run9-record.md:78`).
     Hidden +5–6 ms and "onActivated may not end the wait (unconfirmed)" are Run 8 finding 3 (`:402`).
   - R9-NET-1: `12.8 KB`, `from cache: no`, favicon 404, `showing 2 of 2` (`:153-162`). Run 8 NET-1:
     `from cache: yes`, `content-length: 12914`, `12.6 KB`, server never hit (`:141-154`). The fixture is
     `200 13106` (`:25`).
   - `chrome://` from the command line opens a New Tab page: Run 8 set-up fix 4 (`:49-50`) and
     RELOAD-AUTO F1 (`RELOAD-AUTO.md:39,77`). `dev-reload-button`, `view_1003`, sha256 of the UTF-16LE path,
     5 of 5 (F2–F6, `:79-87`). Reload exit 2 = "nothing pressed" (`recipes/reload-extension.ps1:28`).
   - UIA `TabItem`: `BG-FLAGS.md:81-82`. Job object 0x800, breakaway: `BG-FLAGS.md:86-87`,
     `BG-FLAGS-run-record.md:41`, `recipes/bgf-launch.ps1:4-9`.
   - Knock hashes on disk: `sdk/src/knock.ts:162`; Stage 0 F5 (`stage0-audit.md:232-238`). See finding 1.
   - Phase-doc items, checked against the code. `grep -rn "activeTab()" extension/src/handlers` → empty.
     `targetTab` rules and the one-time `console.warn` are in `tabs.ts:41-67`. `newTab` defaults to
     `active: p.active === true` (`handlers/tabs.ts:72-75`), and the MCP passes `active: true`
     (`registry.ts:320`). The lock classes match `daemon/src/methods.ts:59-64`. The switch sequence
     matches `tabs.ts` line by line: minimized refusal, slot, `showTab` (1000 ms + 50 ms), quota retry,
     guarded `restorePrevious`. `focused: true` appears only in `handlers/tabs.ts:61` (`focusTab`).
     `{__bridgeError}` is in `inject.ts:64-66` and `content/guard.ts:17,38`.
     `@bridge/sdk/format` = `sdk/package.json` `exports["./format"]`.
   - Active-tab gotcha, rewritten: `humansTab` uses `getLastFocused({windowTypes:["normal"]})`
     (`tabs.ts:11`), `listTabs` sets `current` (`handlers/tabs.ts:22-35`), the MCP reads `current`
     (`registry.ts:138-139,284`). R9-RESOLVER-1 passed (`T5-run9-record.md:165-178`). F31's wording
     matches `stage0-audit.md:556-560`. The `NO_NORMAL_WINDOW` text matches `errors.ts:60` and
     `intercept.ts:32`.
   - Key files: every new path exists (`ls` of `daemon/src/{handles,leases,lock,methods,intercept}.ts`,
     `sdk/src/format/`, `mcp/src/cursor.ts`, `extension/src/{router,tabs,errors,tab-events,network-scope}.ts`,
     `content/guard.ts`, `baseline-51de800.json`, `format-baseline.test.ts`, `multi-actor.test.ts`, and the
     `recipes/` files named). `DEAD_KEEP_MS = 60*60*1000` and `DEAD_KEEP_MAX = 1000` (`handles.ts:9,11`).
     `URL_FILL_POLL_MS = 100` and `URL_FILL_MAX_MS = 2000` (`intercept.ts:77-78`). `sw.ts:88-118` holds
     the top-level `chrome.tabs.on*` listeners.
3. **Tools.** `grep -c "server.tool(" mcp/src/tools/registry.ts` → `22`. The registry's names (22) and
   the names in `docs/setup.md`'s table (20 rows; two rows hold back/forward and new/close) are the same
   22. "21 tools" survives only in the Current state block (`CLAUDE.md:14`), the dated note
   `setup.md:144`, the spec's background line 15, and `README.md:23` (finding 3).
4. **setup.md.** The Owners section matches the code: `TAB_HELD`; `networkRequests` is free and
   `networkClear {tab:"all"}` refuses (`methods.ts:24-26`, `intercept.ts:339,544-558`); dead handles are
   kept 1 h. "What you see" and "Screenshots" match `tabs.ts`. The `VERSION` and no-normal-window texts
   match `intercept.ts:30,32`. The reload recipe and e2e §1 item 9 exist (`e2e-test-plan.md:141`).
5. **progress-and-roadmap.md.** The Step 7 block is present and says **Not closed**. The per-stage counts
   542/600/676/748/793/934/965 match the as-built (`asbuilt.md:38,72,113,157,192,229,269`). The Run 8/9/10
   numbers match the records. The Run 8 PASS list matches (`T5-run-record.md:174-210`). The open
   decisions list matches `decisions.md:25-33`. The anchor slug computes to
   `step-7--multi-actor-tabs-2026-10-2223-built-and-e2e-run-gate-open`, as used.
6. **Spec and phase doc: additions only.** `git diff <spec> <phase doc> | grep -c "^-[^-]"` → `0`. The
   §3 note matches F7 (`stage0-audit.md:291`) and LEASE-6 (b). The §6.2 note matches F13's resolution
   (`stage0-audit.md:408-418`) word for word. The §7 note matches SCREEN-2/-4 and R9. See finding 2 for §7.3.
7. **protocol.ts.** `git diff -U0 shared/src/protocol.ts | grep '^[+-]' | … | grep -vE '^[+-]\s*(//|\*|/\*\*)'`
   → nothing, so the change is comment-only. Both comments are true: `isKnownUrl` excludes `""` and
   `about:blank` with a 100 ms / 2000 ms poll (`intercept.ts:77-84`), and the refusal is
   `cdpCaptureRefusal`.
8. **Dead code.** At HEAD, `git grep -w` for each of the 14 removed names (excluding the file itself, its
   test, `sdk/src/format`, `sdk/test` and docs) finds 0 uses. The only hits are `res.statusText`
   (download handler, unrelated) and `formatEntry` in `mcp/src/tools/registry.ts:5`, which imports it from
   `@bridge/sdk/format`. No import of `network-log` names a formatter. The 15 removed `it`s
   (`formatAgo/formatDuration/formatSize` 3, `formatEntries` 8, `formatEntry` 4) have the same 15 titles
   in `sdk/test/format-network.test.ts:77-287`. Their `expect(` lines diff empty once `formatEntries` is
   renamed to `formatNetwork`. Clean worktrees: HEAD `npm ci` 0, `vitest run` → **965 passed (59 files)**.
   HEAD + patch: `npm ci` 0, `npm run typecheck` exit 0, `vitest run` → **950 passed (59 files)**.
   965 − 950 = 15 = the stated number; the file count is unchanged. Worktrees removed and pruned.
9. **T6.3.** `git log --oneline 0773a98..HEAD` → 25 commits, one code commit per stage (T0 `18520f9`,
   T1 `0240c7c`, T2 `e409706` + fix `cd346ed`, T3 `43c0a53`, T4 `138c7f6`, T5b `12ecb65`, RELOAD-AUTO
   `15320a6`), plus docs and close commits. This matches the phase-doc *Corrected* note.
   `git log --name-only --format= 0773a98..HEAD | grep -nE "(^|/)dist/|bridge\.token|(^|/)\.env"` →
   exit 1. Token (32 characters, never printed): `git log -p 0773a98..HEAD | grep -cF` → 0; `git diff`
   → 0; `git grep -lF … HEAD` → 0 files; the untracked step files → 0.
10. **Integrity.** The only URLs in the added lines are `chrome://…`, `chrome://discards` and
    `chrome://extensions`: no real tab URL or title, and no token. Writing guide, spot-checked: dated
    *Superseded*/*Corrected* markers are used throughout, and numbers cite their rows. See NIT 4.

## Findings

1. **MINOR — the knock gotcha overstates how F5 was established.** `CLAUDE.md:388-390` reads "(Stage 0
   F5, executed by its verifier)" and names "`sdk/src/knock.ts` `hashDaemon`". F5 was established by
   reading the code (`stage0-audit.md:236`: `knock.ts:162`). The Stage 0 verifier re-read those lines
   and ran only a same-build 4002 reconnect control (`stage0-verifier.md:61-65,103-106`). Nobody ran an
   old-bundle client adopting a newer daemon. `hashDaemon` is defined in `sdk/src/spawn.ts:44`;
   `knock.ts:162` calls it through `io.hashDaemon`. Fix: write "(Stage 0 F5, by reading the code,
   `knock.ts:162`; confirmed by the Stage 0 verifier)" and "`sdk/src/knock.ts:162` (`io.hashDaemon`, from
   `spawn.ts`)". Rule 7 of the writing guide.
2. **MINOR — spec §7.3 still states things the measurements contradict, with no dated note.**
   `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:234-235` says "CDP `Page.captureScreenshot`
   already forces the compositor to produce a frame for a background tab — that *is* the `cdp` mode".
   Run 8 SCREEN-2 hung, and the §7 note above it says so. `:244-245` says focus emulation "is on Step 7's
   E2E list". It was not run (#61), and no method sends it. Fix, additions only: a dated *Corrected* note
   under §7.3 that cites SCREEN-2, #61 and Run 10 / #66, and adds that the three flags did not fix trusted
   input.
3. **MINOR — README.md is stale and outside T6's diff.** `README.md:23` says "**21 tools**", and
   `README.md:27-28` says "542 unit tests green (2026-10-22; … its live E2E pending)". Step 6's E2E ran
   in W1, and there are now 22 tools and 950 tests. The phase doc gives T6 `CLAUDE.md, docs/`, so this
   goes to the session agent (session-closeout), not to a T6 fixer.
4. **NIT — a dated note was edited in place.** `docs/progress-and-roadmap.md:401`: the existing
   2026-10-22 *Superseded* note had "(not yet verified live)" removed (HEAD line 333). It is now true,
   but the guide keeps old markers as written and adds a new one. Fix: restore the words, or add
   "*Updated 2026-10-23: W1 verified it live.*"
5. **NIT — "the fixture's" bars are the driver's.** `CLAUDE.md:398` reads "the fixture's `#ff00ff` bar …
   its cyan `#97fdfd`". The bars are injected by the E2E driver (`recipes/t5-lib.ts:148-149` `COLOURS`,
   drawn by `barExpression` in `recipes/t5.ts`), not by `test-fixtures/e2e-playground.html`. Fix: "a
   driver-drawn `#ff00ff` bar … a cyan (`#00ffff`) bar".

The builder's report §7 items, confirmed: the Current state block is untouched and still says "21
tools" (for session-closeout); the `WINDOW_MINIMIZED` switch-mode message still suggests `cdp`
(`tabs.ts:197`, documented in `setup.md`); the spec §7 table row is superseded by a note only. The
lane grant for `extension/`/`shared/`/`sdk/test` is recorded in the phase-doc T6 note. No T6 brief
file exists in `briefs/` to check it against.

## Re-check round 1 (2026-10-23)

Scope: findings 1, 2, 4 and 5 after fix round 1 (`T6-builder-report.md` § "Fix round 1"). Finding 3
(README.md) goes to the session closeout.

1. **Finding 1 — closed.** `CLAUDE.md:388-394` now cites `sdk/src/knock.ts:162` (`io.hashDaemon`,
   defined in `sdk/src/spawn.ts:44`). F5 is described as found by reading the code, with a same-build
   4002 reconnect as the only thing run, which matches `stage0-audit.md:236` and
   `stage0-verifier.md:61-65,103-106`.
2. **Finding 2 — closed.** The dated *Corrected* note under spec §7.3 (`:246-254`) checks out:
   - SCREEN-2 `TIMEOUT` after 35 012 ms matches `T5-run-record.md:283`.
   - #63 is cited by its title.
   - The #61 claim matches `decisions.md:126-133`: no method sends `Emulation.setFocusEmulationEnabled`,
     the retry was recorded as not run, and it returns as a proposed decision for Step 8.
   - The #66 claim matches `decisions.md:44-56` and BGF-1/2: trusted click and typing still answer `ok`
     and do nothing.
3. **Finding 4 — closed.** `docs/progress-and-roadmap.md:401` again ends with "(not yet verified live)".
   A separate `*Updated 2026-10-23: W1 verified it live (Run 7 …, MUX rows).*` note is now at `:402`,
   and Run 7 backs it (`docs/e2e-test-plan.md:1464-1491`):
   - MUX-2 [P]: two Claude sessions, `Clients (2)`.
   - MUX-3 [P]: a script beside them, `Clients (3)`.
4. **Finding 5 — closed.** `CLAUDE.md:399-401`: "a `#ff00ff` bar drawn by the E2E driver
   (`recipes/t5-lib.ts:148-149`) … its cyan `#00ffff` bar `#97fdfd`" matches `COLOURS` in
   `t5-lib.ts`.
5. **Invariants.**
   - `git diff <spec> <phase doc> | grep -c "^-[^-]"` → `0`.
   - The Current state section diffs empty against HEAD (`diff exit 0`).

**Final verdict: PASS-with-notes.** The only open note is finding 3 (README.md, for the session
closeout).
