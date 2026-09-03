# Step 1 — Phase C live E2E verification

> **For agentic workers:** this is a *verification* plan, not a feature plan. Nothing is built unless a case
> fails. Steps use checkbox (`- [ ]`) syntax for tracking. Drive the browser through the `chrome-agent-bridge`
> MCP tools (the thing under test), **not** through `claude-in-chrome`.

**Goal:** Prove in real Chrome that commit `39e6cb4` (shadow DOM, same-origin iframes, hidden-subtree pruning,
richer roles, frame-offset `centerOf`) behaves as the unit tests claim. These are E2E cases PERC-5…9 in
`docs/e2e-test-plan.md`; they have never been run live. The first live pass of this project found 3 bugs that
only the runtime could surface, so treat "unit-tested" as "unverified" here.

**Scope:** PERC-5, PERC-6, PERC-7, PERC-8, PERC-9, plus a regression smoke (§3 of the E2E plan) to confirm the
Phase C snapshot rewrite didn't regress PERC-1…4 / ACT-1…2. Out of scope: CONN-5, TRUST-3 (→ Step 3).

**Source docs:** `docs/e2e-test-plan.md` §1 (preconditions), §2 (diagnostics), §4.3 (cases);
`test-fixtures/e2e-playground.html` ("Perception fidelity" section, lines ~66–100 + script).

---

## Task 1: Fresh build + reload (the extension does NOT pick up `dist/` changes by itself)

- [x] `npm run build && npm test && npm run typecheck` — all green before touching the browser.
- [x] `chrome://extensions` → Chrome Agent Bridge → reload ↻. Confirm the service-worker console shows
      `[bridge] connection: up` (open "service worker" link on the card).
- [x] Serve the fixture: `python -m http.server 8080 --directory test-fixtures`.
- [x] If this Claude session's MCP connection to `chrome-agent-bridge` predates the build, run `/mcp` to
      reconnect (server changes need it; extension-only changes don't, but it's cheap).
- [x] **Only one Claude session may drive the bridge** — if `browser_snapshot` times out, check for an orphaned
      `node …/server/dist/index.js` holding port 9234.

## Task 2: Regression smoke (5 min)

- [x] `browser_navigate {"url":"http://localhost:8080/e2e-playground.html"}`.
- [x] `browser_snapshot` → still lists `textbox "Email"`, `textbox "Password"` (aria-labelledby),
      `combobox "Fruit"`, `button "Click counter: 0"`, `link "Jump to bottom"` with refs.
- [x] `browser_click` the counter ref → `browser_snapshot` shows `Click counter: 1`.
- [x] `browser_screenshot` → renders. (Status `<div>` is non-interactive; it is only visible in screenshots —
      use screenshots to read `status:` lines throughout.)

## Task 3: PERC-5 — shadow DOM

- [x] In the snapshot: `button "Shadow button"` **is** listed; `Sealed button` is **not** (closed root).
- [x] `browser_click` the shadow button ref → screenshot shows `status: shadow button clicked`.
- [x] Failure modes to look for: the ref resolves but `click()` lands on the host `<div>` instead of the
      button (RefMap must hold the element inside the shadow root, not the host).

## Task 4: PERC-6 — same-origin iframe, synthetic click

- [x] Snapshot lists `button "Iframe button"`.
- [x] `browser_click` its ref → `status: iframe button clicked (isTrusted = false)` and the frame's own
      `<p>` reads `iframe: synthetic click`.
- [x] Failure mode: the frame is written by script *after* load — if the snapshot walk runs before
      `contentDocument.body` is populated, the button is missing. Re-snapshot once; if it only appears on the
      second snapshot, that's a timing note, not a bug.

## Task 5: PERC-7 — iframe trusted click (frame-offset `centerOf`)

- [x] `browser_click {"ref":"<iframe button>","trusted":true}` → the debugging banner appears; the frame's
      `<p>` reads `iframe: TRUSTED click`; status reads `… (isTrusted = true)`.
- [x] **If the click lands on the page behind the frame** (status unchanged / something else clicked), the
      frame offset is wrong: `extension/src/content/geometry.ts` `frameOffset` — check `frameElement` is
      reachable from the *injected* isolated world (it should be for same-origin).
- [x] Note the display: if this machine is HiDPI or Chrome zoom ≠ 100%, record it — a miss here may be the
      zoom/DPR issue that Step 2 (D2) fixes, not a frame-offset bug. Distinguish by also running TRUST-1
      (`#trusted-only` button, top document): if TRUST-1 also misses, it's zoom/DPR; if only PERC-7 misses,
      it's the frame offset.

## Task 6: PERC-8 — hidden decoys

- [x] Snapshot does **not** contain any of: `Decoy: aria-hidden`, `Decoy: inert`, `Decoy: display none
      ancestor`, `Decoy: zero size`.
- [x] The zero-size filter is gated on `hasLayout(doc)` (jsdom reports 0×0 for everything). Real Chrome has
      layout, so `Decoy: zero size` must be gone here even though unit tests can't prove it. If it is present,
      that gate is the first suspect.

## Task 7: PERC-9 — extra roles

- [x] Snapshot lists: `spinbutton "Quantity"`, `slider "Volume"`, `listbox "Tags"`, `textbox "Notes editor"`
      (contenteditable), `tab "Details tab"`, and `button "Disabled action" [ref=eN] [disabled]`.
- [x] `browser_type` into the `Quantity` ref with `"7"` → `status: qty = 7`.
- [x] `browser_click` the `tab` ref → `status: role=tab clicked`.

## Task 8: Record results

- [x] Fill in the §5 results template in `docs/e2e-test-plan.md` for PERC-5…9 (and the smoke cases re-run)
      with the date **2026-09-03**, Chrome version, OS, display zoom/DPR.
- [x] Update `docs/progress-and-roadmap.md`: §0 add a "Phase C E2E (2026-09-03)" paragraph; §3 move Phase C
      from "NOT yet verified live" to "Verified live"; §1 table row C → "✅ Done (E2E-verified)".

## Task 9: If a case fails

**Not triggered — every case passed on the first attempt, so nothing here was executed.**
- [ ] Reproduce, then find the root cause in the SW console / server stderr (`docs/e2e-test-plan.md` §2).
- [ ] If the defect is in pure logic (`snapshot.ts`, `geometry.ts`, `refmap.ts`): write the failing vitest
      **first** (jsdom env), then fix. If it's `chrome.*` glue: fix + re-run the E2E case (no unit test).
- [ ] If it teaches a new runtime gotcha, add it to `CLAUDE.md` → "Runtime gotchas".
- [ ] One commit per fix, `fix(extension): …`, trailer per `CLAUDE.md`. Then a `docs:` commit for Task 8.

## Exit criteria

PERC-5, 6, 8 (★) pass; PERC-7 and PERC-9 pass or have a documented, attributed cause (e.g. zoom → Step 2).
Docs updated and committed. Then proceed to `2026-09-03-step2-phase-d-action-fidelity.md`.

## Outcome (2026-09-03)

✅ **Met.** All 13 cases (PERC-5…9 plus the PERC-1…4 / ACT-1…2 regression smoke) passed on the first
attempt against Chrome 152.0.7977.75 / Windows 11 / 1920×1080 at 100% zoom, DPR 1. No code changes were
needed and the service-worker console stayed clean. PERC-7 passed outright, so the frame offset is correct
at DPR 1 and no zoom/DPR attribution was required — TRUST-1's disambiguation step was not needed. Evidence:
`docs/e2e-test-plan.md` §5 "Run 2"; summary in `docs/progress-and-roadmap.md` §0 "Phase C E2E (2026-09-03)".
The only defect found was documentary (SMOKE-2 expected the non-interactive `status:` line in the snapshot),
fixed in the same commit. Next: `2026-09-03-step2-phase-d-action-fidelity.md`.
