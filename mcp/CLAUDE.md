# mcp/ — Key files and runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply.

## Key files
- `mcp/src/`: `index.ts` (entry → `mcp/dist/index.js`), `link.ts` (`BridgeLink`: the no-crash rule
  and the 5 s retry), `config.ts` (actor name, `connectOptions()`), `lifecycle.ts` (exit with the
  session), `cursor.ts` (`TabCursor`: claimed on first untargeted touch, moved only as the cursor gotcha below says, lost with a one-line notice on a
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
- **The MCP never crashes when there is no daemon** (`mcp/src/link.ts`; the daemon's side, its bind being the lock, is in `daemon/CLAUDE.md`): the 23 tools are registered with no daemon, a failed `connect()` stores its message (every tool error and `browser_status`'s `Problem:` line show it), and the next `connect()` runs 5 s after each attempt settles, never overlapping — also after an established connection closes with a code other than 4002.
- **`browser_new_tab`'s `active` flag** (`mcp/src/tools/registry.ts`; the extension's default is under `newTab` in `extension/src/handlers/CLAUDE.md`). It sends `active: true` only when the cursor is set and `listTabs` shows its tab as `current` (the human is watching this session's tab); otherwise — a session's first tab, a lost cursor, a failed listing — it opens in the background and says ` (in the background — browser_focus_tab shows it)`.
- **The MCP's trusted tools focus first.** Since Step 10 S2 the MCP's trusted `browser_click`/`browser_type`/`browser_press_key` focus first, as the SDK does (`sdk/CLAUDE.md`): `focusTab {tab}` on the resolved handle, then the input on the same handle; a `focusTab` error is the answer and the input is not sent; untrusted actions never focus; the cursor does not move (`mcp/src/tools/registry.ts`; decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools focus first too (#106); · 2026-10-25 · S2: the MCP schema baseline, a failed focus's answer, and the focus sentence (#214)). Measured: 9/9 trusted inputs reached a background fixture tab, the tab in front after (Run 15 MCPF-1R). Focus and input are two calls, so another actor's capture in the same window can come between them (phase doc 0.2, Stage 0 F19; not seen live).

The `ws` package stays out of the daemon and MCP bundles (`mcp/build.mjs`): that rule is in `daemon/CLAUDE.md`, beside `daemon/build.mjs`.
