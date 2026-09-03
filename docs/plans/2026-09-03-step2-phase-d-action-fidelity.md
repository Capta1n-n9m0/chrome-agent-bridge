# Step 2 — Phase D: action fidelity (trusted typing + zoom-correct trusted input)

> **For agentic workers:** TDD for pure logic (key-event params, content helpers, tool wiring); the
> `chrome.debugger` glue gets full implementation + an E2E case. Steps use checkbox (`- [ ]`) syntax.
> Prerequisite: Step 1 (`2026-09-03-step1-phase-c-e2e-verification.md`) is done and its zoom/DPR observation
> (Task 5) is recorded.

**Goal:** Close the top two "Known limitations" in `docs/progress-and-roadmap.md` §4:
1. **D1 — trusted typing.** `browser_type` and `browser_press_key` gain a `trusted` escalation path that
   dispatches real CDP `Input.dispatchKeyEvent`s, mirroring how `browser_click {trusted:true}` already works.
   Today sites that reject synthetic input events have no fallback.
2. **D2 — zoom-correct coordinates.** Trusted clicks are dispatched at raw `getBoundingClientRect` CSS pixels.
   Verify where they land under HiDPI and under Chrome page zoom, and scale by the correct factor.
3. **D3 (optional, only if D1+D2 land cleanly)** — file upload via CDP `DOM.setFileInputFiles`.

**Architecture reminder:** tool (`server/src/tools/registry.ts`) → `bridge.call(method, params)` → WS →
`router.on(method)` (`extension/src/sw.ts`) → handler (`extension/src/handlers/actions.ts`) → either
`callInPage` (content script, `extension/src/content/*`) or `withDebugger` (`extension/src/debugger.ts`).

**Files touched:** `extension/src/debugger.ts`, new `extension/src/keys.ts`, `extension/src/content/actions.ts`,
`extension/src/content/index.ts`, `extension/src/handlers/actions.ts`, `server/src/tools/registry.ts`,
`test-fixtures/e2e-playground.html`, `docs/e2e-test-plan.md`, `docs/setup.md`, `docs/progress-and-roadmap.md`,
`CLAUDE.md`; tests in `extension/test/keys.test.ts` (new), `extension/test/actions.test.ts`,
`server/test/tools.test.ts`.

---

## Part D1 — trusted typing

### Design (decide once, then build)

- **Escalation rule** — same as click: `trusted:true` forces CDP; otherwise use the content-script path and
  fall through to CDP only if the content path *throws* (stale ref etc.). Unlike click, synthetic typing can't
  "fail" observably (setting `.value` always works), so `trusted:true` is the main entry point. Document that.
- **Focus + select-all first, then keystrokes.** The trusted path does: content script `focusForTyping(ref)` =
  `el.focus()` + select-all (`el.select()` for input/textarea; a `Range` over the contents for
  `contenteditable`) → then CDP per-character keyDown/keyUp with `text` so the selection is replaced by real
  keystrokes (fires real `keydown`/`keypress`/`input`/`keyup`, `isTrusted === true`). Do **not** set
  `.value` in the trusted path — that's the synthetic behaviour we're escaping.
- **Newlines and `submit`.** A `"\n"` in `text`, and `submit:true`, both send a real **Enter** key event
  (`key:"Enter", code:"Enter", windowsVirtualKeyCode:13, text:"\r"`). Char-`text`-only events can't express
  Enter.
- **`browser_press_key {trusted:true}`** goes through the same key-params table so Enter/Tab/Escape/Backspace/
  Arrow keys are real. The synthetic `pressKey` stays as-is for the default path.
- **One `withDebugger` per call** (attach → all keystrokes → detach), not per character.

### Task D1.1: key-event params table (pure, TDD)

- [ ] `extension/test/keys.test.ts`: `keyEventParams("Enter")` → `{key:"Enter", code:"Enter",
      windowsVirtualKeyCode:13, text:"\r"}`; `"Tab"` → vk 9, `"Escape"` → 27, `"Backspace"` → 8,
      `"ArrowLeft/Right/Up/Down"` → 37/39/38/40, `"a"` → `{key:"a", code:"KeyA", text:"a"}`,
      `"A"` → shift modifier, `" "` → Space; unknown named key throws with the list of supported keys.
- [ ] `extension/src/keys.ts`: `keyEventParams(key: string): {key; code; windowsVirtualKeyCode?; text?; modifiers?}`.
      Keep it a plain table; no `chrome.*` imports (so it's testable under node).
- [ ] `npm test` green.

### Task D1.2: CDP helpers

- [ ] `extension/src/debugger.ts`: rewrite `trustedType(tabId, text)` to iterate `text`, mapping `"\n"` →
      Enter via `keyEventParams`, all other chars → `{type:"keyDown", text: ch, key: ch}` + `keyUp`. Add
      `trustedPressKey(tabId, key)` = keyDown/keyUp from `keyEventParams(key)`. Remove the "not yet wired"
      comment.
- [ ] Not unit-tested (chrome glue) — covered by TRUST-4/5 below.

### Task D1.3: content-script focus helper (TDD, jsdom)

- [ ] `extension/test/actions.test.ts`: `focusForTypingRef(refs, ref)` focuses an `<input>`, selects its text
      (`selectionStart===0 && selectionEnd===value.length`), returns `{ok:true}`; for a `contenteditable`
      div it focuses and the document selection covers its text; unknown ref throws the standard
      "call browser_snapshot to re-snapshot" error.
- [ ] Implement in `extension/src/content/actions.ts`; expose as `window.__agentBridge.focusForTyping` in
      `extension/src/content/index.ts` (update the `declare global` interface). It must return a non-null
      object on success — `unwrapResult` treats null/undefined as failure (see `CLAUDE.md`).

### Task D1.4: handlers

- [ ] `extension/src/handlers/actions.ts` — `type(p)`: mirror `click`'s shape. `if (!trusted) try content
      typeRef; catch → warn + fall through`. Trusted path: `callInPage(focusForTyping)` → `withDebugger(tab,
      () => trustedType(text) then if submit trustedPressKey("Enter"))`. Pass `p.submit ?? false` and
      `p.trusted === true` (never raw `undefined` into executeScript args — `toSerializableArgs` covers it,
      but be explicit).
- [ ] `pressKey(p)`: `if (p.trusted === true) withDebugger(trustedPressKey)` else the existing synthetic path.
- [ ] `npm run typecheck`.

### Task D1.5: tool schema + tests (TDD)

- [ ] `server/test/tools.test.ts`: `browser_type` forwards `{ref, text, submit:false, trusted:true}` when
      `trusted:true` is given, and `trusted:false` when omitted; same for `browser_press_key`.
- [ ] `server/src/tools/registry.ts`: add `trusted: z.boolean().optional()` to both; extend descriptions:
      "Set trusted=true to send real CDP keystrokes (shows the debugging banner) for sites that ignore
      synthetic input."
- [ ] `npm test` green (count goes up; update the "72 tests" figures in `CLAUDE.md` and the roadmap).

### Task D1.6: fixture + E2E cases

- [ ] `test-fixtures/e2e-playground.html`, "Buttons & links" section: add
      `<label for="trusted-input">Trusted-only input</label><input id="trusted-input">` whose `input`
      listener sets `status: TRUSTED input = <value>` when `e.isTrusted` else `status: synthetic input
      ignored`; and a `keydown` listener that sets `status: TRUSTED key = <key>` / `synthetic key ignored`.
- [ ] `docs/e2e-test-plan.md` §4.5: add **TRUST-4** (`browser_type {"ref":…,"text":"hi","trusted":true}` →
      `status: TRUSTED input = hi`, field shows `hi`; then repeat with `"text":"yo"` → field shows `yo`, not
      `hiyo` — proves the select-all-then-replace), **TRUST-5** (`browser_press_key {"key":"Enter",
      "trusted":true}` → `status: TRUSTED key = Enter`), **TRUST-6** (`browser_type {…,"text":"x@y.com",
      "submit":true,"trusted":true}` on the email field → `status: form submitted (email = x@y.com)`).
      Add them to the §5 scorecard line.
- [ ] Build, reload the extension, run TRUST-4/5/6 live through the MCP tools. Also re-run ACT-1 and ACT-7
      (default paths unchanged).

## Part D2 — zoom / DPR-correct trusted coordinates

### Task D2.1: spike — measure before changing anything

Background: CDP `Input.dispatchMouseEvent` documents `x`/`y` as *CSS pixels relative to the main frame's
viewport*, so **DPR (Retina) should already be handled by Chrome**; the known failure (Puppeteer/Playwright
issue history) is **browser page zoom ≠ 100%**, where CDP expects coordinates scaled by the zoom factor.
Don't assume — measure:

- [ ] Fixture: add a full-width `<div id="hit-pad">` (≈ 200px tall) whose `mousedown` listener sets
      `status: hit at <clientX>,<clientY> (isTrusted=…)`, so a trusted click's landing point is observable.
      Also add a `<p id="env">` the fixture fills at load with `devicePixelRatio` and `innerWidth`.
- [ ] At 100 % zoom: `browser_click {trusted:true}` on `#trusted-only` → `status: TRUSTED click received`.
      Record `chrome.tabs.getZoom` (1.0) and DPR from `#env`.
- [ ] Set Chrome zoom to 150 % (Ctrl +) and repeat on `#trusted-only` and on `#hit-pad`. Record whether the
      click hits and, from `#hit-pad`, the ratio between where it landed and `centerOf`.
- [ ] If available, repeat at 100 % on a HiDPI display (DPR 2 / 1.25 Windows scaling). Record.
- [ ] Write the findings into the "Spike results" table below **before** coding.

### Task D2.2: apply the factor (TDD for the pure part)

- [ ] `extension/test/geometry.test.ts`: `scaleForCdp({x,y}, zoom)` multiplies (or divides — encode the
      *measured* rule, not the guess) by `zoom` and rounds. Pure function in `extension/src/content/geometry.ts`.
- [ ] `extension/src/handlers/actions.ts` `click` trusted path: `const zoom = await chrome.tabs.getZoom(tab.id!)`
      → `trustedClick(tab.id!, ...scaleForCdp({x,y}, zoom))`. Also apply to any future trusted hover/drag.
- [ ] Update the comment in `debugger.ts` `trustedClick` ("DPR handling is future work") to state the actual
      rule found.
- [ ] `CLAUDE.md` → Runtime gotchas: one bullet with the measured rule (e.g. "CDP Input coords are CSS px of
      the *unzoomed* viewport: multiply `centerOf` by `chrome.tabs.getZoom()`; DPR needs no scaling").
- [ ] E2E: **TRUST-7** — at 150 % zoom, `browser_click {trusted:true}` on `#trusted-only` succeeds, and PERC-7
      (iframe trusted click) still succeeds. Reset zoom to 100 % after.

### Spike results (fill in)

Measured 2026-09-03, Chrome 152, Windows 11, 1920-px-wide window. `#hit-pad` reports the event's
`clientX,clientY` and, for comparison, the pad's own rect centre at that instant ("exp").

| Condition | zoom | DPR | `innerWidth` | `#trusted-only` hit? | `#hit-pad` landed vs `centerOf` |
|---|---|---|---|---|---|
| baseline | 1.0 | 1 | 1920 | yes | `hit at 953,613 exp 953,613` — **exact** |
| page zoom 150 % | 1.5 | 1.5 | 1280 | **yes** | pad below the fold: `hit at 635,755 exp 635,755` but `on=HTML` — landed on the right coordinates, hit nothing. After `scrollIntoView`: `hit at 635,330 exp 635,330 on=hit-pad` — **exact** |
| HiDPI (Windows scaling 125 %) | 1.0 | 1.25 | 1536 | yes | `hit at 760,751 exp 760,751 on=hit-pad` — **exact** |

**Conclusion — the premise of this task was wrong.** CDP `Input.dispatchMouseEvent` `x`/`y` are CSS
pixels of the layout viewport: exactly what `getBoundingClientRect` returns. In all three conditions the
event's `clientX,clientY` came back **byte-identical** to what `centerOf` sent. Chrome folds both page
zoom and device pixel ratio in itself, so **no scaling factor is correct** — not `zoom`, not `devicePixelRatio`
— and `scaleForCdp` would be an identity function. It is not being written; `chrome.tabs.getZoom` is not needed.

The 150 % failure is a *different*, real bug that zoom merely exposed: **the trusted path never scrolls
its target into view.** The synthetic path does (`clickRef` calls `scrollIntoView`), but the trusted path
goes straight to `centerOf`. Raising zoom shrinks the visual viewport in CSS px (1920×~940 → 1280×~630),
so an element that fit at 100 % falls outside it; the click is dispatched at correct coordinates that are
simply off-screen, hit-tests the root element, and **silently does nothing**. Scrolling first fixes it at
every zoom level. A trusted click landing outside the viewport should also report an error rather than
succeed silently.

## Part D3 (optional) — file upload

Only if D1 + D2 are merged and green. Sketch, to be expanded into tasks if picked up:

- New tool `browser_upload_file {ref, paths:[…]}` → handler tags the element from the content script
  (`el.setAttribute("data-agent-ref", ref)`), then under `withDebugger`: `DOM.getDocument` →
  `DOM.querySelector(root, '[data-agent-ref="…"]')` → `DOM.setFileInputFiles {nodeId, files}` → remove the
  attribute. Paths must be absolute on the machine running Chrome (same machine as the server). Fixture: an
  `<input type=file>` whose `change` handler sets `status: file = <name>`. Native `alert/confirm` dialogs
  stay out of scope (they need a persistent debugger attach to receive `Page.javascriptDialogOpening`).

## Task D.final: docs + commits

- [ ] `docs/setup.md`: tool table — `browser_type`/`browser_press_key` `trusted` flag; note the banner.
- [ ] `docs/progress-and-roadmap.md`: §1 add a Phase D row; §4 remove the "Typing is synthetic-only" and
      "Trusted-click coordinates on HiDPI/zoom" limitations (or rewrite them with what's still open); §5 mark
      D1/D2 done, D3 status; §0 add the E2E results.
- [ ] Commits (one per part, tests green before each):
      `feat(extension): trusted typing + press_key via CDP Input.dispatchKeyEvent`,
      `fix(extension): scale trusted-input coordinates by page zoom`, `docs: …`. Trailer per `CLAUDE.md`.

## Exit criteria

TRUST-4/5/6 pass live; the zoom rule is measured and encoded (TRUST-7 passes at 150 %); unit tests + typecheck
green; roadmap §4 no longer lists synthetic-only typing or unscaled coordinates as limitations.
