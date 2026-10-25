# mcp/ — Key files and runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply.

## Key files
- `mcp/src/`: `index.ts` (entry → `mcp/dist/index.js`), `link.ts` (`BridgeLink`: the no-crash rule
  and the 5 s retry), `config.ts` (actor name, `connectOptions()`), `lifecycle.ts` (exit with the
  session), `cursor.ts` (`TabCursor`: claimed on first untargeted touch, moved only by
  `browser_select_tab`/`browser_new_tab`/`browser_use_active_tab`, lost with a one-line notice on a
  4002 reconnect or a new client), `tools/registry.ts` (the 23 MCP tools — `browser_focus_tab` is
  Step 7's, `browser_use_active_tab` Step 8's; the `locator` object on the actions and
  `browser_wait_for`; `failureReport`/`failedLine`: an attach-set failure on a handle is rendered as the
  SDK's report plus a PNG; Step 9's `withSafetyRefusals` (a `DISARMED`/`JS_DISABLED`/`DOMAIN_BLOCKED` from any
  tool → one error line), `safetyStatusLine` (`browser_status`'s second text item `Safety: …`), hidden rows
  `(hidden: the bridge is off)` / `(hidden: blocked site)`; Step 10: `focusTab {tab}` before a trusted
  `browser_click`/`browser_type`/`browser_press_key` (#106, #214), `capped`/`CAP_WARNING_LINE` on the six action
  tools (#216), `browser_evaluate {saveTo, overwrite?}` → `Saved <path>` / `<bytes> bytes · <kind> · sha256 <hex>`
  (#127, #218)); its tool names and input schemas are pinned through a real `tools/list` by
  `mcp/test/s2-focus-first.test.ts` (+ `tool-schemas.ts`) against `mcp/test/fixtures/tool-schemas-f45e3bf.json`, re-baselined only by a recorded decision (#214).

## Runtime gotchas
- **MCP SDK (`@modelcontextprotocol/sdk` v1.29) stores a tool's handler at `_registeredTools[name].handler`**
  (not `.callback`). Tool tests rely on this.
- **The MCP must exit with its session; the daemon must not** (`mcp/src/lifecycle.ts`, moved unchanged
  from the pre-Step-6 server in D1/D5). Before this, an ended session left an orphan holding 9234. It
  exits on stdin `end`/`close`, a stdout error, SIGINT/SIGTERM/SIGHUP/SIGBREAK, or a vanished parent:
  on Windows a dead parent stays as `ppid`, so it checks `kill(pid, 0)`; on POSIX the process is
  re-parented, so it checks whether `ppid` changed. The parent check matters when a launcher sits in
  between (the nvm-windows `node.exe` shim spawns the real node). Verified on Windows 2026-10-21,
  including force-killing the shim alone; **not yet verified on Linux**. On exit the MCP only closes
  its client (`link.stop()`); the daemon gets none of this lifecycle.
- **Claude Code drops images from `isError: true` MCP results**, so an MCP failure report with a
  screenshot is returned as a **non-error** result `[text, image]`: line 1 `<CODE>: …`, then the report,
  `Full message:` when needed, and last `The call failed (<CODE>). This result is not flagged as an error
  only so that the screenshot reaches you …` (`mcp/src/tools/registry.ts` `failureReport`,
  `failedLine`); without a screenshot it stays `isError`, one text item. Measured on Claude Code
  2.1.309: every `isError` variant (text+image, image+text, image alone, embedded resource) delivered 0
  images, both non-error variants delivered theirs (S6b probe, `…-steps/S6b-probe-record.md`;
  decisions.md · 2026-10-23 · An MCP failure report with a screenshot is returned as a non-error result
  (#100)). Re-run `S6b-probe-rows.md` after a Claude Code upgrade before restoring the flag. Claude Code
  also saves such an image under the session's `tool-results/` directory, a second copy outside
  `failures/` (S6b.md §6 finding 2; Run 12 Part 3 REP-1).
- **The MCP cursor never follows the human, except through `browser_use_active_tab` and the first
  touch.** It moves only on first touch (`tabs.claim {active:true}`), `browser_select_tab`,
  `browser_new_tab` and `browser_use_active_tab`; an explicit `tab` never moves it, nor does
  `browser_status` (which adds `Cursor:` and, when different, `Human's active tab:` after the Step 7
  lines, and never claims) (Step 8 as-built § S5; `mcp/src/cursor.ts`). Making it follow anywhere else
  is a forbidden fix. The SDK's own cursor (`client.tab()`) changes only on `newTab`/`claim` and a 4002
  reconnect — `release()`, `close()` and `tabGone` leave it (decisions.md · 2026-10-23 · The SDK `Tab`
  surface details and the cursor rule as built (#90) item 7).

The MCP's no-crash rule (`link.ts`) is in `daemon/CLAUDE.md`, under "The daemon's bind is the lock"; the rule for
`browser_new_tab`'s `active` flag is in `extension/src/handlers/CLAUDE.md`.
The `ws` package stays out of the daemon and MCP bundles (`mcp/build.mjs`): that rule is in `daemon/CLAUDE.md`, beside `daemon/build.mjs`.
