# Gotcha placement — cleanup pass 2026-10-30 (full, Step 13 close-out)

Scope: `git diff 815255a..HEAD` over every `CLAUDE.md`. Word counts (`wc -w`) are inside the budgets (doc-check reports no
"Over word budget"). The #369 / "DevTools wins" text in `extension/CLAUDE.md` was read and left alone, as instructed.
Found 5 findings.

1. **`CLAUDE.md:118` (root Commands) — recipes tsconfig list is stale.** Mechanical.
   - Root: "(tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b cover the others; all seven exit 0, 2026-10-29 cleanup pass …)".
   - `recipes/CLAUDE.md:39-40`: "`tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` … all eight exit 0, 2026-10-29". The tree has `recipes/tsconfig.s13.json`.
   - Fix: add `.s13`, say "all eight"; re-run the eight `tsc -p` and date the claim from that run (the recipes line itself carries the 2026-10-29 date, which predates `.s13` work finishing on 2026-10-30).

2. **`recipes/CLAUDE.md` Key files (lines 32-39) — `recipes/s13-r20-a2.ts` is not named.** Mechanical.
   - The tree has `recipes/s13-r20-a2.ts` and `recipes/test/s13-r20-a2.test.ts` (added since the base). The Step 13 list names `s13-forms.ts`, `s13-r20.{ts,ps1}`, `s13-r20-a.{ts,ps1}`, `-b`, `-b-defs`, `-b4`, `-c`, `-c-defs`, `s13-win.ps1`, `s13-devt.ps1`, but no `a2`.
   - Fix: add one clause saying what `a2` is (the builder knows; likely slice A's second part/re-run), inside the `s13-r20-a.{ts,ps1}` entry.

3. **`mcp/CLAUDE.md:62` vs `sdk/CLAUDE.md:34` — the console cap fact sits in the MCP file, its code is in the SDK.** Needs the user (placement judgement) but low stakes.
   - MCP: "**`browser_console_messages` output is capped at 20 000 characters and keeps the newest whole lines** … (`formatConsole`, `sdk/src/format/console-messages.ts`; … `sdk/test/s12-console-cap.test.ts`; #398)".
   - SDK: "`format/console-messages.ts` (`formatConsole`, capped at 20 000 characters, #345, #355) is on the subpath only".
   - An agent who edits `formatConsole` opens `sdk/` and meets only the old cap line (no "newest lines kept", no marker text); the measured gotcha is in `mcp/`. #232 puts it with the code it binds.
   - Fix: move the bullet's measured part (cap, newest lines, marker, R20-CON-CAP) to `sdk/CLAUDE.md` next to line 34, leave a one-line pointer in `mcp/CLAUDE.md` plus the description wording (that part is the MCP tool's own).

4. **`mcp/CLAUDE.md:20` and `sdk/CLAUDE.md` (new bullet) repeat the key-order fact; its home is `extension/src/evaluate/CLAUDE.md`.** Mechanical.
   - MCP: "the returned `value` keeps the page's key order since Step 13 S2: `extension/test/s13-envelope.test.ts`, R20-ARGS-ORDER SDK leg 5 of 5 equal, printed verdict RECORD".
   - SDK: "**`evaluate`'s returned `value` keeps the page's key order since Step 13 S2** (R20-ARGS-ORDER SDK leg `value-equal=5` …); … the measurement and the fix are in `extension/src/evaluate/CLAUDE.md`."
   - Evaluate file already holds the measured text (`R20-0 keys=page`, `SERIALIZER_JSON_SRC`). The SDK bullet is a pointer plus a repeated measurement; the MCP clause repeats the same row and test.
   - Fix: cut the R20-ARGS-ORDER numbers from the MCP clause and the SDK bullet to "see `extension/src/evaluate/CLAUDE.md`"; keep one client-side fact only if a client-side test pins it.

5. **`daemon/CLAUDE.md` opener paragraph (Step 13 S1 addition) — extension-side facts live in the daemon file.** Needs the user (small).
   - Daemon: "Chrome's own `openerTabId` names the active tab for a background opener (25 of 30, Stage 0), so the extension never falls back to it." and "the extension joins `tabCreated` with `webNavigation.onCreatedNavigationTarget` within 250 ms".
   - Extension: `extension/CLAUDE.md:23` (`opener-join.ts` entry) holds the join, the 250 ms hold and the permission, but not the "25 of 30 / never falls back" fact. An agent editing `opener-join.ts` could add the fallback without meeting it.
   - Fix: add that one sentence (with its measurement) to the `opener-join.ts` Key-files entry; in the daemon file keep the popup-lease outcome (R20-POP-BG-3, R14/R15 history) and shorten the extension part to a pointer.

Checked and fine: all `extension/src/**` files and every `daemon/`, `sdk/`, `mcp/`, `shared/` source file appear in their package `CLAUDE.md`; the new `opener-join.ts`, `evaluate/result.ts`, `evaluate/serialize.ts` are named (`extension/CLAUDE.md:23,37`, `evaluate/CLAUDE.md:6,15`); `recipes/tsconfig.s13.json`, the `s13-*` recipes (except finding 2) and `test-fixtures/s13-chooser.*` are named in `recipes/CLAUDE.md:32-43`. Other doc-check items (dead path `docs/decisions-archive/step13.md` at root `CLAUDE.md:28`, the file is written at Step 13's close) belong to other areas.
