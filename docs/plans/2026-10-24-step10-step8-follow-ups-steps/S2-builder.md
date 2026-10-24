# S2 builder report — the MCP's trusted tools focus first

Stage S2 of Step 10 (phase doc 0.2; decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the MCP's
trusted tools focus first too (#106)). Builder: Claude Opus 5.5 (claude-opus-5-5), 2026-10-25. Not committed.

## Built (files)

| File | Change |
|---|---|
| `mcp/src/tools/registry.ts` | `browser_click`, `browser_type`, `browser_press_key`: inside the existing `onTab(tab, async (t) => …)` callback, `if (trusted === true) await bridge.call("focusTab", { tab: t });` before the action call on the same `t`; the focus sentence appended to each of the three descriptions. Nothing else. |
| `mcp/test/s2-focus-first.test.ts` (new) | 44 tests: S2.1, S2.2, S2.3. |
| `mcp/test/tool-schemas.ts` (new, not a test file) | `captureToolSchemas()` / `toolSchemasJson()`: the capture used for the fixture and by the S2.3 test; runnable with tsx. |
| `mcp/test/fixtures/tool-schemas-f45e3bf.json` (new) | The baseline: 23 tools' `name` + `inputSchema`, captured before any `mcp/src` edit. sha256 `768353438463e8194c8524a62c096f1dd8b3a6ccbcc590460426eebe35283b2d`, 20 020 bytes. |
| `mcp/test/tools.test.ts` | Two existing tests updated (see Deviations): their expected call lists now start with `["focusTab", { tab: "T1" }]`. |

The diff to `registry.ts` (+8 −3 lines; descriptions shown shortened):

```ts
      return onTab(tab, async (t) => {
        // #106: trusted input focuses the same handle first (a focusTab failure is the answer).
        if (trusted === true) await bridge.call("focusTab", { tab: t });
        await bridge.call("click", { ...target, trusted: trusted ?? false, tab: t });
```

(and the same two lines before `type` and `pressKey`). A `focusTab` rejection propagates out of the callback
exactly as the action's own would: through `attempt` (a failure report for an attach-set code on a handle),
`onTab` (the cursor notice restored) and `withSafetyRefusals` (`DISARMED` / `DOMAIN_BLOCKED` → the one plain
line), i.e. the path `browser_focus_tab` already uses. `onTab`, `attempt`, the cursor and the schemas are
untouched. `sdk/src/policy.ts` is not edited (`git diff --quiet -- sdk/src/policy.ts` → no change).

## Baseline (F15) — method and command

- `mcp/` identical to `f45e3bf`: `git diff --stat f45e3bf HEAD -- mcp/` printed nothing (HEAD `0d189a0`), and
  `git diff --quiet HEAD -- mcp/src` held when the fixture was captured (it is the first step of the capture
  command below).
- `npm test` before: **2763 tests, 116 files**, all passed (the brief expected 117 files; 116 is what ran at
  `0d189a0` in the main tree — re-derived, not assumed).
- **Method:** the MCP SDK's own `Client` over `InMemoryTransport.createLinkedPair()` against an `McpServer` with
  `registerTools(server, fakeBridge)` — a real `tools/list` round trip, so the input schemas are exactly what
  the server sends Claude Code (zod → JSON Schema by the SDK's own conversion, `$schema` included), not a
  re-implementation of that conversion. Per tool: `{name, inputSchema}`; tool `description` excluded;
  per-parameter `description`s (the `.describe()` texts) kept; tools sorted by name; every object's keys sorted
  recursively (arrays keep their order); `JSON.stringify(…, null, 2)` + `\n`.
- **Command** (Git Bash, repo root):
  ```bash
  export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"
  git diff --quiet HEAD -- mcp/src && echo "mcp/src unchanged" && mkdir -p mcp/test/fixtures && \
    npx tsx mcp/test/tool-schemas.ts > mcp/test/fixtures/tool-schemas-f45e3bf.json
  ```
- **Verifier regeneration at `f45e3bf`:** `git worktree add <scratch>/wt f45e3bf`, copy
  `mcp/test/tool-schemas.ts` into `<scratch>/wt/mcp/test/` (it does not exist there), run
  `npx tsx mcp/test/tool-schemas.ts > out.json` from the worktree (after `npm install` there, or with
  `node_modules` resolvable), and `cmp out.json mcp/test/fixtures/tool-schemas-f45e3bf.json`. I did not run
  this worktree regeneration myself; I relied on `mcp/` being byte-identical to `f45e3bf` at capture time.
- The fixture is never regenerated; the S2.3 test reads it and compares the live capture (names equal in
  order; each `inputSchema` `toEqual`).

## Failing first (on the unchanged `mcp/src`)

`npx vitest run mcp/test/s2-focus-first.test.ts` before the code change: **32 failed, 12 passed (44)**.
The 12 that passed are the ones that must hold on both codes: the 10 untrusted cases (no `focusTab`), "the
result text of a trusted action is unchanged", and the S2.3 schema comparison (it must pass before and after).
Verbose list, pasted:

```
 × S2.1 … > click with a ref, explicit tab: focusTab {tab:T7} then click on T7, nothing claimed
 × S2.1 … > click with a ref, the cursor's tab: one first-touch claim, focusTab {tab:T1} then click on T1
 × S2.1 … > click with a ref: focusing an explicit tab does not move the cursor
 ✓ S2.1 … > click with a ref, trusted undefined: no focusTab, the action alone
 ✓ S2.1 … > click with a ref, trusted false: no focusTab, the action alone
 × S2.1 … > click with a locator, explicit tab: focusTab {tab:T7} then click on T7, nothing claimed
 × S2.1 … > click with a locator, the cursor's tab: one first-touch claim, focusTab {tab:T1} then click on T1
 × S2.1 … > click with a locator: focusing an explicit tab does not move the cursor
 ✓ S2.1 … > click with a locator, trusted undefined: no focusTab, the action alone
 ✓ S2.1 … > click with a locator, trusted false: no focusTab, the action alone
 × S2.1 … > type with a ref, explicit tab: focusTab {tab:T7} then type on T7, nothing claimed
 × S2.1 … > type with a ref, the cursor's tab: one first-touch claim, focusTab {tab:T1} then type on T1
 × S2.1 … > type with a ref: focusing an explicit tab does not move the cursor
 ✓ S2.1 … > type with a ref, trusted undefined: no focusTab, the action alone
 ✓ S2.1 … > type with a ref, trusted false: no focusTab, the action alone
 × S2.1 … > type with a locator, explicit tab: focusTab {tab:T7} then type on T7, nothing claimed
 × S2.1 … > type with a locator, the cursor's tab: one first-touch claim, focusTab {tab:T1} then type on T1
 × S2.1 … > type with a locator: focusing an explicit tab does not move the cursor
 ✓ S2.1 … > type with a locator, trusted undefined: no focusTab, the action alone
 ✓ S2.1 … > type with a locator, trusted false: no focusTab, the action alone
 × S2.1 … > pressKey, explicit tab: focusTab {tab:T7} then pressKey on T7, nothing claimed
 × S2.1 … > pressKey, the cursor's tab: one first-touch claim, focusTab {tab:T1} then pressKey on T1
 × S2.1 … > pressKey: focusing an explicit tab does not move the cursor
 ✓ S2.1 … > pressKey, trusted undefined: no focusTab, the action alone
 ✓ S2.1 … > pressKey, trusted false: no focusTab, the action alone
 ✓ S2.1 … > the result text of a trusted action is unchanged
 × S2.2 … > DISARMED from focusTab on {click ref, click locator, type ref, type locator, pressKey}: same answer as browser_focus_tab, no <action>   (5 ×)
 × S2.2 … > TAB_HELD from focusTab on {…}: same answer as browser_focus_tab, no <action>   (5 ×)
 × S2.2 … > WINDOW_MINIMIZED from focusTab on {…}: same answer as browser_focus_tab, no <action>   (5 ×)
 × S2.2 … > DISARMED from focusTab is the one safety line as an error result
 ✓ S2.3 … > names and input schemas deep-equal the fixture captured at f45e3bf
 × S2.3 … > browser_click, browser_type and browser_press_key end with the focus sentence; no other tool has it
 Test Files  1 failed (1)
      Tests  32 failed | 12 passed (44)
```

(The S2.2 lines are listed one per test in the raw output; folded here per code.)

What the tests check: the ordered call list is exactly `focusTab {tab:T}` then the action with `tab:T` (focus
first, same handle), for ref and locator targets of click and type and for pressKey, each with an explicit `tab`
(no claim at all) and with the cursor's tab (exactly one first-touch `tabs.claim`, `cursor.tab` still `T1`
after, a second call claims nothing more); a trusted call on an explicit `T9` leaves the cursor on `T1`;
untrusted (omitted and `false`) sends no `focusTab`; S2.2: for `DISARMED`, `TAB_HELD` and `WINDOW_MINIMIZED`
thrown by `focusTab`, the tool's settled outcome (result, or thrown code + message) equals
`browser_focus_tab`'s outcome for the same error, on an explicit tab and on the cursor's tab, and the only work
call is `focusTab` (the action never sent); `DISARMED` gives a one-item `isError` result.

## Results (before → after)

```
$ npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit=0

$ npm test            (before: Test Files 116 passed (116) · Tests 2763 passed (2763))
 Test Files  117 passed (117)
      Tests  2807 passed (2807)

$ npm run build
built daemon → dist/index.js
built mcp → dist/index.js
built extension → dist/
build exit=0

$ git status --short
 M mcp/src/tools/registry.ts
 M mcp/test/tools.test.ts
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/S2.ledger.md            (step agent's, pre-existing)
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/S6-builder.md           (S6's, not mine)
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/S6.ledger.md            (pre-existing)
?? docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S2-builder.md    (pre-existing)
?? mcp/test/fixtures/
?? mcp/test/s2-focus-first.test.ts
?? mcp/test/tool-schemas.ts
```

2763 → 2807 = +44 (the new file), 116 → 117 files; no test removed. The build left no tracked change (`dist/`
is not tracked). `mcp/test` alone: 11 files, 242 tests passed.

## Deviations

- **Two existing tests' expectations changed** (none removed), `mcp/test/tools.test.ts`:
  "browser_type forwards trusted:true when asked" and "browser_press_key forwards trusted:true when asked" —
  both asserted that a trusted call sends the action alone, which #106 changes by design. Each now expects
  `["focusTab", { tab: "T1" }]` before the unchanged action params, and its title gains "(after focusTab on the
  same tab, #106)". This is a behaviour change decided by the user (#106), not an error text edited to match.
- The before-count was 116 files, not the brief's expected 117.
- A helper module `mcp/test/tool-schemas.ts` beside the test (rather than an inline capture) so the fixture
  and the S2.3 check share one capture; it is not matched by vitest's `*.test.ts` and is covered by
  `npm run typecheck` (mcp's tsconfig includes `test`).

## Proposed decisions

1. **2026-10-25 · The tool-schema baseline is captured through a real `tools/list` over the in-memory
   transport.** *Decided:* capture `name` + `inputSchema` via the MCP SDK `Client` ↔ `InMemoryTransport` ↔
   `McpServer`, keys sorted, tools by name. *Why:* that is byte-for-byte what Claude Code receives, including
   the SDK's zod → JSON Schema conversion, so a schema change anywhere in that chain shows. *Instead of:*
   reading `_registeredTools[name].inputSchema` (zod objects; an internal field; equal zod trees can still
   serialise differently) or calling `zod-to-json-schema` ourselves (a second copy of the conversion that could
   drift from the SDK's). *Revisit if:* an MCP SDK upgrade changes the emitted JSON Schema (`$schema`, key
   shapes) without any tool change — then the fixture would need a dated, user-ruled re-baseline, never a
   silent regeneration.
2. **2026-10-25 · S2.2 is pinned as "the same outcome as `browser_focus_tab`".** *Decided:* the test compares
   the trusted action's settled outcome with `browser_focus_tab`'s for the same `focusTab` error. *Why:* the
   brief asks for the existing `browser_focus_tab` error path; comparing outcomes pins that without re-stating
   each code's rendering. *Instead of:* hard-coding each error's text. *Revisit if:* `browser_focus_tab` ever
   gets its own error rendering. Not covered: an attach-set code (e.g. `TIMEOUT`) from `focusTab`, which would
   produce a failure report exactly as for `browser_focus_tab` (same `attempt` path, by reading the code).

## Proposed texts (not edited — outside the lane)

**`sdk/src/policy.ts` line 19–20**, replace "The MCP's trusted tools keep today's behaviour (no automatic
focus; `browser_focus_tab` stays an explicit call)." with:

> The MCP's trusted tools focus first too (decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the
> MCP's trusted tools focus first too (#106)): `browser_click`/`browser_type`/`browser_press_key` with
> `trusted: true` call `focusTab` on the same handle before the input (`mcp/src/tools/registry.ts`).

followed by the dated note `*Superseded 2026-10-25: was "The MCP's trusted tools keep today's behaviour …",
because #106 made them focus first (Step 10 S2).*` per the docs guide.

**`docs/setup.md`** — stale after S2 (quoted with line numbers at `0d189a0`):

- L280–285: "**Trusted input needs the tab in front.** `trusted:true` on a background tab returns `Clicked …` /
  `Typed …` but the page receives nothing (…). Call `browser_focus_tab` first, or use the default synthetic
  input. … A script's trusted actions focus the tab first by themselves — see [Writing a script](#writing-a-script)."
  → proposed: "**Trusted input needs the tab in front, so it brings it there.** Trusted CDP input into a
  background tab returns `Clicked …` / `Typed …` but the page receives nothing (…). So `browser_click`,
  `browser_type` and `browser_press_key` with `trusted:true` — like a script's trusted actions (see [Writing a
  script](#writing-a-script)) — first bring the tab to the front of its window and focus the window
  (`browser_focus_tab`), and leave it there. Default synthetic input never changes what you see. The same need
  holds for anything that requires window focus, such as a clipboard write in `browser_evaluate`: call
  `browser_focus_tab` first."
- L430–431: "The MCP's trusted tools do not focus first; `browser_focus_tab` is an explicit call." → proposed:
  "The MCP's trusted tools focus first, like the SDK's: `trusted:true` brings the tab to the front of its window
  and leaves it there; untrusted actions never do."
- L922–923 (troubleshooting): "**`trusted:true` "succeeds" but nothing happens on the page**: the tab is in the
  background (…); `browser_focus_tab` first." → proposed: "… the tab was not in front when the input ran — the
  trusted tools focus first, but another actor's screenshot in the same window can switch tabs between the
  focus and the input (phase doc 0.2, Stage 0 F19); retry, or `browser_focus_tab` and retry. An untrusted
  action whose synthetic path failed is retried as trusted input by the extension without focusing: pass
  `trusted:true`."
- L483–486 ("The debugging banner") and the tool table L138–140 stay correct; optionally add to the table cells
  "(brings the tab to the front first)".

## Unfinished / not run

- The verifier's worktree regeneration of the fixture at `f45e3bf` was not run by me (see Baseline).
- No live row (MCPF-1) — not in this stage; the known limit (focus and input are two calls; Stage 0 F19) is
  unchanged and untested here by design.
