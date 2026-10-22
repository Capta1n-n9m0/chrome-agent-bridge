# T3 — builder report

Written 2026-10-22 by the T3 builder (Claude Opus 5.5). Not committed (the step agent commits after
the verifier). No `npm run build` was run in the main tree. Only `extension/src/` and `extension/test/`
were touched (no `sdk/test/` file was created).

## Files changed

- `extension/src/content/snapshot.ts` — `buildSnapshot` returns `SnapshotResult` `{url, title, elements,
  truncated}` (type-only import from `@bridge/shared`, erased by esbuild); same walk, pruning, ref order,
  800 cap; `truncated = elements.length >= 800`; zero-size filter still gated on `hasLayout(doc)`.
  New per-element fields `value` (never for a password input), `checked`, `disabled`, `expanded`,
  `selected`, `href`, `depth`, `frame`. Element kinds are tested by tag name, not `instanceof` (see
  Findings 1). `trim` now uses a shared `cap` helper (same output).
- `extension/src/content/index.ts` — `snapshot: () => SnapshotResult`; `guard(...)` unchanged.
- `extension/src/handlers/perceive.ts` — `snapshot` returns `Promise<SnapshotResult>`; `screenshot`:
  `fullPage === true` → `fullPageScreenshot` (whatever `mode`); `mode === "cdp"` → `pageTab` +
  `viewportScreenshot`; anything else → `targetTab` + `activateForCapture`. T1's background refusal removed.
- `extension/src/debugger.ts` — new `viewportScreenshot(tabId)`: `withDebugger(tabId, Page.captureScreenshot
  {format:"png"}, "Screenshot")`.
- `extension/src/tabs.ts` — new `activateForCapture(tab)` + `resetCaptureState()` test hook; constants
  `ACTIVATION_WAIT_MS = 1000`, `FRAME_WAIT_MS = 50`, `CAPTURE_SPACING_MS = 500`, `QUOTA_RETRY_MS = 500`.
- `extension/src/handlers/tabs.ts` — `focusTab` (window focus + activate, no restore); `export const
  selectTab = focusTab`; `newTab` uses `active: p.active === true`; `listTabs` adds `windowId` and
  `openerTabId` (only when Chrome reports one).
- `extension/src/sw.ts` — `router.on("focusTab", focusTab)` and `router.on("selectTab", focusTab)`.
- `extension/src/handlers/network.ts` — returns `log.query(...)` with no `text`; `formatEntries`/
  `formatEntry` imports and the unused `label` removed. `network-log.ts` and its tests untouched.
- `extension/test/snapshot.test.ts` — 23 cases converted (same names) + 16 new.
- `extension/test/capture.test.ts` — new, 14 cases for `activateForCapture`.
- `extension/test/target-tab.test.ts` — fake gains `windows.get`, `tabs.create`, `tabs.onActivated`;
  F4 tests exercise `focusTab` and the alias; refusal test replaced; +5 tab tests, +4 screenshot-mode tests.
- `extension/test/content-guard.test.ts` — "the snapshot still returns its result" now checks
  `elements`/`truncated` present and `text` absent (it asserted `toHaveProperty("text")`; shape, not a
  message text).

## Results

- `npx vitest run extension/`: before **287 passed / 17 files**; after **326 passed / 18 files**
  (+16 snapshot, +14 capture, +9 target-tab). No test removed.
- `npm run typecheck`: exit 0 (all five projects, including T2's in-progress `daemon/`).

## Hand-off list: retired text-format assertions (38, from `extension/test/snapshot.test.ts` at 51de800)

Each is now asserted on `elements`; T4 re-establishes the text in `sdk/test/` against its formatter.
`+` = `toContain`, `−` = `not.toContain`.

1. "lists interactive elements…": + `textbox "Email" [ref=e1]`; + `button "Sign in" [ref=e2]`;
   + `link "Forgot password?" [ref=e3]`; − `not interactive` (4)
2. "skips hidden elements": − `Hidden`; + `button "Shown"` (2)
3. "names an input via an associated <label for>": + `textbox "Email address" [ref=e1]` (1)
4. "names an input via aria-labelledby": + `textbox "Password"` (1)
5. "names an input wrapped in a <label>": + `textbox "Username"` (1)
6. "prefers aria-label over an associated label": + `textbox "Right"` (1)
7. "prunes descendants of a display:none ancestor": − `Buried`; + `button "Shown"` (2)
8. "prunes an aria-hidden subtree": − `Decorative`; + `button "Real"` (2)
9. "prunes an inert subtree": − `Behind modal`; + `button "Modal action"` (2)
10. "skips zero-size elements when the document reports layout": − `Collapsed`; + `button "Visible"` (2)
11. "descends into an open shadow root": + `button "Shadow"`; + `button "Light"` (2)
12. "descends into a same-origin iframe": + `button "Inner"`; + `button "Top"` (2)
13. "skips a cross-origin iframe…": + `button "Top"` (1)
14. "maps additional native controls": + `spinbutton "Qty"`; + `slider "Volume"`; + `button "Avatar"`;
    + `listbox "Tags"`; + `textbox "Body"` (5)
15. "passes through explicit interactive ARIA roles": + `tab "Details"`; + `menuitem "Rename"`;
    + `switch "Dark mode"`; + `option "Blue"` (4)
16. "lets an explicit role override the native mapping": + `button "Looks like a button"`; − `link ` (2)
17. "marks disabled controls": + `button "Save" [ref=e1] [disabled]`; + `button "Cancel" [ref=e2]`;
    − `"Cancel" [ref=e2] [disabled]` (3)
18. "caps the number of listed elements and says so": + `truncated` (the footer
    `\n- ... truncated at 800 elements; scroll or narrow the page to see more`) (1)

Total 38. No old test asserted the header line (`url: <href>   title: <JSON title>`) or the `- ` line
prefix; both exist only in the baseline code (`snapshot.ts` at 51de800), which T4.2 captures (#47).
The 5 `count` assertions became `elements.length` assertions in the same tests (not text).

## New tests confirmed to fail without the change

Each mutation applied to a copy-restored source file, the three test files run, the file restored
(`cmp` against the saved copy afterwards: identical):

| Mutation | Failing tests |
|---|---|
| minimized check removed | capture "minimized → WINDOW_MINIMIZED…"; target-tab "a minimized window → WINDOW_MINIMIZED in the switch mode" |
| per-window mutex removed | "two captures in one window never overlap…"; "the next capture … waits for a slow restore"; "restores the previous tab when the capture fails…" |
| spacing 0 | "captures … at least 500 ms apart"; "the spacing wait comes before the switch…" |
| quota retry removed | "quota error is retried once…"; "a second quota error … thrown" |
| frame wait 0 | "a background tab: update → activated → 50 ms → …"; "proceeds after 1 s…"; "spacing wait comes before…" |
| activation cap 100 s | "proceeds after 1 s when onActivated never fires…" |
| mutex released before the restore settles | "the next capture … waits for a slow restore to settle" |
| `instanceof` instead of tag name in `valueOf` | snapshot "frame: absent in the top document, the 1-based entry order…" |
| password value read | "value: never for a password input…"; the frame test |
| depth not incremented | the three depth tests |
| frame index constant 1 | both frame-index tests |
| `newTab` `active: true` | "newTab … opens in the background by default" |

The replaced refusal test fails against 51de800's `perceive.ts` by construction (it expects a capture).

## Replaced T1 test

`target-tab.test.ts` › "screenshot (viewport) with an explicit background tabId" › "refuses instead of
capturing another tab" → **"switches to the background tab, captures it and restores the previous tab
(T3; replaces T1's refusal)"**: update(12) before `captureVisibleTab(1)`, before update(11); no
`windows.update`. Count unchanged (1 for 1). No other expected message text changed.

## Greps

```
$ grep -n "focused" extension/src/tabs.ts extension/src/handlers/tabs.ts
extension/src/handlers/tabs.ts:59:    if (tab.windowId >= 0) await chrome.windows.update(tab.windowId, { focused: true });
$ grep -nE "focused\s*:" extension/src/tabs.ts extension/src/errors.ts
(nothing)
$ grep -rn "focused" extension/src --include=*.ts
extension/src/debugger.ts:58: * event can't express it. Assumes the target is already focused (and, for replace-semantics, that its
extension/src/errors.ts:56: * human's tab" is the active tab of the last-focused normal window (#43); Stage 0 F8). `INTERNAL`:
extension/src/errors.ts:60:  "No normal Chrome window is focused (a DevTools or popup window may have focus) — click a normal Chrome window and retry";
extension/src/handlers/tabs.ts:59:    if (tab.windowId >= 0) await chrome.windows.update(tab.windowId, { focused: true });
extension/src/keys.ts:6: * `text`, which is what actually inserts the character into a focused field.
$ grep -n "active: true" extension/src/handlers/tabs.ts
60:    await chrome.tabs.update(id, { active: true });          (inside focusTab)
$ grep -n "hasLayout" extension/src/content/snapshot.ts
76:function hasLayout(doc: Document): boolean {
229:    checkSize = hasLayout(doc);
$ grep -rn "windows.update" extension/src
extension/src/handlers/tabs.ts:59: (focusTab only)
```

## Deviations

- `selectTab`'s `BAD_PARAMS` text is now `focusTab requires tabId` (alias; the test checks the code only).
- `activateForCapture` maps a failing `tabs.update(target)` through `asTabUnknown` (tab closed between
  resolve and switch → `TAB_UNKNOWN`), and restores whenever a switch was attempted (harmless if the
  switch did not happen). Not in the brief; the stricter reading.
- When the window reports no active tab (`prev` undefined) the target is still activated, with no restore.

## Proposed decisions

### 2026-10-22 · Snapshot fields read element kinds by tag name (T3)
**Decided:** the new 0.7 field helpers test `tagName`, not `instanceof HTML…Element`.
**Why:** an element of a same-origin frame belongs to that frame's realm; measured in jsdom, the top
window's `HTMLIFrameElement` does not match an iframe inside a frame, so `instanceof` would drop
`value`/`checked`/… for every framed control (the frame test fails with `instanceof`).
**Instead of:** `instanceof` as the existing walk code uses.
**Revisit if:** T5 shows Chrome's isolated world shares constructors across frames.

### 2026-10-22 · An empty value is sent as `value: ""` (T3)
**Decided:** a valued control with an empty value carries `value: ""`, not an absent key.
**Why:** the brief says "→ `.value`"; "" says "empty field", absence says "not a valued control". T4's
formatter decides what to print.
**Instead of:** omitting `value` when empty.
**Revisit if:** T4's byte-identity or the model's output wants it omitted.

### 2026-10-22 · The capture slot is reserved before the switch, as decided (T3)
**Decided:** kept as briefed. Measured consequence (by reasoning, tested only for no-switch captures):
the ≥ 500 ms spacing holds between *reservations*; actual `captureVisibleTab` calls can be closer when
one capture switches tabs (up to 1050 ms of activation) and the next does not. The quota retry covers it.
**Instead of:** spacing the capture call itself (puts the wait while the switched tab is on screen).
**Revisit if:** T5 SCREEN-3 records a quota error that the one retry does not absorb.

## Findings (pre-existing, not changed)

1. **Nested same-origin frames are never entered, and a framed `<select size>` is a combobox.**
   `frameDocument` uses `instanceof HTMLIFrameElement`, and the listbox rule `el instanceof
   HTMLSelectElement`; for an element from a frame's realm both are false (jsdom probe: an iframe inside
   a frame → `instanceof` false, its button absent; a framed `<select size="3">` → `combobox`). So the
   brief's "nested frames get their own next index" cannot occur today; tested with sibling frames only.
   Not fixed: it changes the walk, and T4.2's baseline is the baseline walk. Whether Chrome's isolated
   world behaves like jsdom here is for T5 / a later step.
2. **Between T3's and T4's commits a reloaded extension breaks three MCP tools' output**:
   `mcp/src/tools/registry.ts:82-83` prints `result.text` of `snapshot` (now absent → `undefined`), the
   network tool prints `out ?? ""` (empty), and `browser_new_tab` (`:176`) sends no `active`, so the tab
   now opens in the background. All three are T4's (the MCP formats and passes `active:true`, 0.8). No
   effect until the extension is reloaded (T5).

## Unfinished

Nothing in the brief. Not done by design: no build, no commit, no sdk test (T4 owns the formatter).
