# History notes of the old `CLAUDE.md`, and what replaced them

Source: `git show 817f8b1:CLAUDE.md` (1000 lines, 13,337 words). The lean-procedures plan counted 37 notes;
a scan for `*Superseded …*`, `*Corrected …*` and `*Updated …*` finds **43** (41 Superseded/Corrected, 2 Updated),
two of them the same text twice (rows 14 and 30). Every `CLAUDE.md` now holds only the current text; the
story of each change is in the cause column and in `docs/decisions.md` / `docs/decisions-archive/`
(the session agent records this table as one decisions entry). "Line" is the line in the old file.
Rows 22 and 36 were `Updated` notes carrying a measurement; the measurement stayed as plain text in the gotcha
(`daemon/CLAUDE.md`, `recipes/CLAUDE.md`) and only the marker went.

| # | Line | Old text (short) | Current text (short) | Cause |
|---|---|---|---|---|
| 1 | 16 | "23 tools, 25 codes, 2720 tests in 116 files" | root Current state: 23 tools, 26 codes (25 on the wire), 26 router methods, 3273 tests in 132 files | Step 10 added `JS_DISABLED`, three `evaluateSave*` methods, 553 tests net (#219, #205, #218) |
| 2 | 44 | the "Step 9 closed" block listing Step 10 as next | root Current state: Step 10 closed, Step 11 is the resume point | Step 10 was built and closed (#202, #106–#127, #229) |
| 3 | 83 | "every call acts on the active tab, and the tab tools switch it" | root Architecture flow: handles, leases, `targetTab(p)` in every handler | Step 7 gave every method a `tabId` and clients handles (#38–#69) |
| 4 | 85 | "`focusTab`/`selectTab` need the screen … a call with no `tab` from a Step 6 client acts on the human's tab" | root: only a default-mode screenshot and `focusTab` need the screen; no `tab` is `BAD_PARAMS "tab is required"` | Step 8 S2b removed `selectTab` and the legacy path; S3/S5 added `Tab`, locators, `browser_use_active_tab` (#72) |
| 5 | 108 | "the 25 error codes … 24 on the wire" | `shared/CLAUDE.md` Key files: 26 codes, 25 on the wire | Step 10 S4b added `JS_DISABLED` (#202, #219) |
| 6 | 110 | "the 22 error codes" | same text as row 5 | Step 8 S0 added `NO_CURSOR` (#76) |
| 7 | 112 | "the 23 error codes … 22 on the wire" | same text as row 5 | Step 9 S0 added `DISARMED`, `DOMAIN_BLOCKED` (#133) |
| 8 | 133 | daemon `intercept.ts` line "…; the legacy path" | `daemon/CLAUDE.md` Key files, `intercept.ts` without it | Step 8 S2b removed the legacy path (#72) |
| 9 | 157 | formatters "…, not from `index.ts`" | `sdk/CLAUDE.md`: `@bridge/sdk/format` subpath "and from `index.ts`" | Step 8 S3 re-exports them from the main entry (#75) |
| 10 | 173 | MCP `withSafetyRefusals`: "a `DISARMED`/`DOMAIN_BLOCKED` from any tool" | `mcp/CLAUDE.md`: "`DISARMED`/`JS_DISABLED`/`DOMAIN_BLOCKED`" | Step 10 S4b added `JS_DISABLED` (#219) |
| 11 | 175 | cursor "moved only by `browser_select_tab`/`browser_new_tab` … the 22 MCP tools" | `mcp/CLAUDE.md`: also `browser_use_active_tab`; 23 tools | Step 8 S5 added `browser_use_active_tab` |
| 12 | 197 | recipes listed `assemble-mcp.ts`, `transcript.ts`, `tsconfig{,.fe,.s6,.s9}.json` | `recipes/CLAUDE.md`: neither script; `tsconfig{,.fe,.s6,.s9,.s10}.json` | Step 10 S8 retired the chunked MCP recipe (#228); S7 added `tsconfig.s10.json` |
| 13 | 200 | recipes list "`hello.ts`, `reload-extension.ps1`, `t5*`, `bgf-*.ps1` BG-FLAGS only" | `recipes/CLAUDE.md` Key files lists the full set | Step 8 FE and S6 added the other scripts |
| 14 | 248 | "60 log sites" (log allowlist) | `extension/CLAUDE.md`: 54 log sites | Stage 0 audit F8: the allowlist has 54 entries (15 + 33 + 0 + 6) since S2b |
| 15 | 262 | Commands: "2720 passed, 116 files", tsconfig list without `.s10` | root Commands: 3273 passed, 132 files; five tsconfigs | Step 10 added 560 tests and 16 files, S8 removed 7; S7 added `tsconfig.s10.json` |
| 16 | 265 | "950 passed, 59 files" | (gone; the current count only) | Step 8 added 764 tests and 26 files |
| 17 | 267 | "1714 passed, 85 files" | (gone; the current count only) | Step 9 added 1006 tests and 31 files |
| 18 | 273 | Commands: "the 22 tools" | root: 23 tools | Step 8 S5 added `browser_use_active_tab` |
| 19 | 291 | "the server must not crash on a busy WS port — `startWsHost` never throws, the bind is retried every 5 s", one session drives the bridge | `daemon/CLAUDE.md`: the bind is the lock; `EADDRINUSE` exits 0, no retry; the MCP no-crash rule in `mcp/src/link.ts` | Step 6 D3/D5: the MCP no longer binds a port (#25) |
| 20 | 344 | humans-tab list named "the `targetTab` fallback" and "the daemon's legacy path" | `extension/CLAUDE.md`: the resolver bullet without them | Step 8 S2b removed both (#72) |
| 21 | 349 | "`browser_status`'s active tab is not always the tab actions use" | `extension/CLAUDE.md`: `humansTab()` is the one resolver, measured in Run 9 | Step 7 T1 put every reader on one resolver (#43) |
| 22 | 357 | `*Updated 2026-10-24:*` `spawnDaemon` inherits no pipe, measured by `sdk/test/spawn-inherit.test.ts` | same measurement, plain text in `daemon/CLAUDE.md` | a measurement added after Step 7 (#91); marker dropped, fact kept |
| 23 | 486 | "absent → the human's tab with one `console.warn` per method … Step 8 removes the fallback" | `extension/src/handlers/CLAUDE.md`: absent `tab` → `BAD_PARAMS` | Step 8 S2b removed the fallback (#72) |
| 24 | 493 | Chrome `id` beside `tab` "for one release (Step 6 clients)" | `daemon/CLAUDE.md`: the `id` kept through Step 8 for its readers | #81 kept the `id` through Step 8 |
| 25 | 506 | "the MCP's `browser_new_tab` passes `active: true` explicitly" | `extension/src/handlers/CLAUDE.md`: sends `active: true` only when the cursor is set and `listTabs` shows its tab | Step 8 S5 applied the activation rule (#95) |
| 26 | 540 | "… and the MCP's trusted tools are unchanged" | `extension/CLAUDE.md`: the MCP's trusted tools focus first too | #106 made them focus first |
| 27 | 544 | "Focus emulation is unmeasured …; Step 8's `sdk/src/policy.ts` decides" | `extension/CLAUDE.md`: the measured background-input policy | Stage FE measured it (#89, #106) |
| 28 | 618 | "a Step 7 daemon keeps a legacy path" | `daemon/CLAUDE.md`: untargeted call → `BAD_PARAMS "tab is required"`, `selectTab` → `UNKNOWN_METHOD` | Step 8 S2b removed the legacy path (#72) |
| 29 | 648 | "46 fixtures" | `extension/src/content/CLAUDE.md`: a pre-S1 capture of 45 fixtures | Step 10 S3 verifier finding 5; re-counted by S8 |
| 30 | 779 | "60 log sites" (second copy of row 14) | same as row 14 (one copy now) | as row 14 |
| 31 | 788 | "what it opened is not shown, #196" | `extension/CLAUDE.md`: `wrapper=view-source inner=http own=no` (Run 14 R14-REL-3; #196 answered) | Run 14 R14-REL-3 showed it |
| 32 | 796 | "re-measured in Step 10, #194" | `extension/CLAUDE.md`: the measured result with its run row (Run 14) | Run 14 measured it |
| 33 | 807 | "(`DISARMED`, scope `evaluate`, SAFE-6)" | `extension/CLAUDE.md`: with JavaScript off, `JS_DISABLED` | S4b gave "JavaScript is off" its own code (#219) |
| 34 | 820 | "re-measured in Step 10, #194" | `extension/CLAUDE.md` options-page bullet: re-measured, `Bridge armed.` 31 ms after the re-arm (Run 15 R15-3R, PASS) | Runs 14–15 measured it |
| 35 | 829 | "unit-tested only: Run 13 SAFE-5c's redirect half timed out (#194)" | `extension/CLAUDE.md` "not a network firewall": download refused `DOMAIN_BLOCKED` in 76 ms (Run 14 R14-5c) | Run 14 measured it |
| 36 | 876 | `*Updated 2026-10-24:*` reload hello waits up to 2 s for the session marker (Run 12 SM-0) | same measurement, plain text in `recipes/CLAUDE.md` | Step 8 S2b (#94); marker dropped, fact kept |
| 37 | 970 | Skills/Docs block: "Steps 7–8 decided" | removed with the step-history block (`docs/progress-and-roadmap.md` holds it) | both steps were built |
| 38 | 978 | "its gate waits for the user on R9-SCREEN-2's positive control and #37, #40, #46, #51, #54" | removed (step-history block) | #69 ruled them |
| 39 | 980 | "waits for the user's rulings" | removed (step-history block) | #68 ruled the rest |
| 40 | 987 | "its open decisions are listed in `docs/decisions.md` → Open decisions" | removed; `decisions.md` § Open decisions now says none | W2 ruled them (#106–#127) |
| 41 | 991 | "its gate waits on the user's ruling on Run 13 (#192)" | removed (step-history block) | #202 ruled it |
| 42 | 996 | "Next: Step 8 (SDK surface, cursor tools, background-input policy)" | root Current state: Next = Step 11, then Step 12 | Step 8 was built and run |
| 43 | 999 | "its live E2E waits for the D6 wave … actors on different tabs in parallel is Step 7" | removed (step-history block) | W1 ran and Step 7 was built |
