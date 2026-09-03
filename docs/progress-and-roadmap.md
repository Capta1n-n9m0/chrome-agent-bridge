# Progress & Roadmap

- **Date:** 2026-09-03
- **Branch:** `main` (merged from `feat/agent-bridge`; published as a private GitHub repo)
- **Status:** Code complete; **72 unit tests green**; **live in-browser E2E passed** — 29 cases on 2026-06-04 plus the 13-case Phase C pass on 2026-09-03 — against the real default profile; 3 runtime bugs found & fixed. Merged to `main` and published (private).

---

## 0. E2E validation (2026-06-04)

Ran the suite in `docs/e2e-test-plan.md` against real Chrome + the live MCP connection. **29 cases passed**, covering connection, navigation (incl. error-page handling), perception (refs + `<label>`/`aria-labelledby` naming + viewport & full-page screenshots), all actions, both `chrome.debugger` paths (trusted `Input` + `Page.captureScreenshot`), tabs, history, the three `wait_for` modes, and the token gate. The core premise is proven: the extension drives the real logged-in profile end-to-end, including CDP-level trusted input that Chrome 136 blocked.

**Three bugs only the live runtime could surface (all fixed):**
1. `fe67e87` — MCP server crashed on a busy WebSocket port (orphaned instance → `EADDRINUSE`). Now non-fatal; stdio connects regardless.
2. `0404602` — `browser_scroll` with no ref crashed: `chrome.scripting.executeScript` can't serialize `undefined` in `args`. Fixed via `toSerializableArgs` (undefined→null).
3. `9bc4701` — invalid/stale refs **silently succeeded**: when an injected fn throws, Chrome returns `result: null` (not undefined / not a rejection); `callInPage` only guarded `undefined`. Fixed via `unwrapResult` (null *or* undefined → actionable error).

**Not yet exercised live** (need manual/long setup): CONN-5 idle keepalive (3-min soak), TRUST-3 debugger-vs-DevTools conflict, CONN-2/3 not-connected/server-restart (would disconnect the session). SEC-1 localhost-only bind confirmed by inspection.

### Phase C E2E (2026-09-03)

Ran `docs/plans/2026-09-03-step1-phase-c-e2e-verification.md` against real Chrome **152.0.7977.75** on Windows 11 (1920×1080, OS scaling and Chrome zoom both 100% → DPR 1), verifying commit `39e6cb4` — the perception-fidelity work that until now was only unit-tested. **All 13 cases passed on the first attempt and no code changes were needed**; the service-worker console stayed clean throughout. Full evidence is in `docs/e2e-test-plan.md` §5, "Run 2".

- **PERC-5 (shadow DOM)** — the open root's button is listed and clickable; the closed root's button is *rendered on screen but absent from the snapshot*, and the click fires the listener bound inside the shadow root rather than on the host, proving the RefMap holds the shadow element.
- **PERC-6 / PERC-7 (same-origin iframe)** — the frame's button appears on the *first* snapshot; a default click reports `isTrusted = false` and a `trusted:true` click lands **inside the frame** (`iframe: TRUSTED click`), so the frame-offset `centerOf` is correct at DPR 1. HiDPI/zoom remains unverified and is Phase D's problem, not a frame-offset one.
- **PERC-8 (hidden decoys)** — all four excluded. Two of them are visibly rendered, so the exclusion is semantic; the zero-size decoy has no other disqualifier, which is the only available proof that the `hasLayout(doc)` gate works in a browser (jsdom reports every rect as 0×0, so unit tests cannot test it).
- **PERC-9 (extra roles)** — all six roles listed with the `[disabled]` marker; typing into the spinbutton and clicking the `role="tab"` both reached the page.
- **Regression smoke** — PERC-1…4 and ACT-1…2 re-ran green, so the Phase C snapshot rewrite did not regress the 2026-06-04 pass.

One documentation defect surfaced and was fixed: SMOKE-2 expected the fixture's `status:` line in the snapshot, but snapshots list only interactive elements — that line is screenshot-only.

---

## 1. Where we are

We built what the design called for: an MCP server + Chrome MV3 extension that lets an AI agent
drive the user's **real, logged-in Chrome default profile** — the profile Chrome 136 locked CDP
out of.

| Milestone | Scope | Status |
|---|---|---|
| Phase 0 | npm workspaces, TS, vitest, shared protocol | ✅ Done |
| 1 | WS host + token handshake + MCP entry + `browser_navigate` | ✅ Done |
| 1 (ext) | MV3 skeleton: client, router, service worker, options page | ✅ Done |
| 2 | Perception: accessibility snapshot (refs) + screenshot | ✅ Done |
| 3 | Actions (click/type/scroll/hover/select/press_key) + tabs + history | ✅ Done |
| 4 | `chrome.debugger` trusted-input fallback + full-page screenshot | ✅ Done |
| 5 | Offscreen-document keepalive + setup docs | ✅ Done |
| + | `browser_wait_for` (closed a spec-§7 gap found in final review) | ✅ Done |
| C | Perception fidelity: shadow DOM + same-origin iframes, hidden-subtree pruning, richer roles, frame-correct coordinates | ✅ Done (E2E-verified 2026-09-03) |

**Quality state:** 72 unit tests pass; `tsc` typecheck clean across all three packages; all four
bundles build (`server/dist/index.js`, `extension/dist/{sw,options,offscreen,content}.js`). Every
milestone passed a two-stage review (spec compliance + code quality); the final whole-system review
verified the end-to-end protocol contract and that esbuild does not break page-injected functions.

**16 tools:** `browser_navigate`, `browser_snapshot`, `browser_screenshot`, `browser_click`,
`browser_type`, `browser_press_key`, `browser_scroll`, `browser_hover`, `browser_select_option`,
`browser_back`, `browser_forward`, `browser_list_tabs`, `browser_select_tab`, `browser_new_tab`,
`browser_close_tab`, `browser_wait_for`.

## 2. Architecture at a glance

```
Claude ⇄ (MCP/stdio) ⇄ MCP server [hosts ws://127.0.0.1:9234]
                              ⇅ (JSON {id,method,params} + token)
   Chrome extension (real profile):
     offscreen document  →  holds the WebSocket (survives MV3 service-worker culling)
     service worker      →  routes commands to chrome.tabs / scripting / debugger
     content script      →  builds the ref-tagged snapshot; performs DOM actions
```

Default actions use synthetic content-script events (no banner). When `trusted:true` is requested
(or a content action throws), the click escalates to real CDP `Input.*` events via
`chrome.debugger` (shows Chrome's "extension is debugging this browser" banner). Control targets
the **active tab**; tab tools switch which tab is active.

## 3. Verified vs. not verified

**Covered by automated tests (logic + protocol, no real browser):** request/response correlation,
timeouts, reconnect-keeps-newest-connection, token handshake/rejection, the router envelope,
`RefMap`, the snapshot builder (incl. `<label>`/`aria-labelledby` naming), content-action functions,
center-point math, and every tool's bridge wiring.

**Verified live (2026-06-04, §0):** connection, navigation, perception, every action, both
`chrome.debugger` paths, tabs, history, `wait_for`, and the token gate — against the real default
profile.

**Verified live (2026-09-03, §0 "Phase C E2E"):** the Phase C perception work —
`docs/e2e-test-plan.md` PERC-5…9: open vs. closed shadow roots, same-origin iframes including a
trusted click through the frame offset, all four hidden decoys, and the new roles — plus a
PERC-1…4 / ACT-1…2 regression smoke. Chrome 152 at DPR 1.

**NOT yet verified live:** the deferred soak cases CONN-5 (idle keepalive) and TRUST-3
(debugger-vs-DevTools conflict), and trusted-click coordinates on HiDPI / non-100% zoom.

## 4. Known limitations & risks

- **Trusted-click coordinates on HiDPI/zoom** — `trusted:true` clicks use CSS-pixel coordinates
  from `getBoundingClientRect`; on zoomed or Retina displays they may land slightly off. Default
  clicks (by element) are unaffected. Verified correct at 100% zoom / DPR 1 on 2026-09-03,
  including through an iframe's frame offset (PERC-7); **HiDPI and non-100% zoom are still
  untested** — that's Phase D's DPR work.
- **Typing is synthetic-only** — `browser_type` dispatches input events; there is a `trustedType`
  CDP helper in the code but it is not wired into the `type` handler yet. Sites that reject
  synthetic typing have no fallback.
- **Snapshot fidelity** — the walk now descends into **open** shadow roots and **same-origin**
  frames, prunes `aria-hidden`/`inert`/`hidden`/`display:none` subtrees, and drops zero-size
  elements. Still out of reach: closed shadow roots and cross-origin frames (both need a
  per-frame injection or CDP, not a single content script); `visibility:hidden` prunes the whole
  subtree even though a descendant could set `visibility:visible`.
- **Snapshot cap** — very large pages are truncated at 800 listed elements with a note. There is
  no "expand" or viewport-only mode yet.
- **Single connection** — one extension at a time; a second valid connection replaces the first.
- **Active-tab safety** — the agent acts on whatever tab is focused, including sensitive ones.
  Mitigations today are localhost-only + token + the debugger banner.
- **Keepalive edge cases** — the offscreen document should keep the socket alive across SW culls;
  this is the least-exercised path and a priority for E2E.

## 5. Roadmap

**Next three steps are planned in detail** (2026-09-03): `docs/plans/2026-09-03-step1-phase-c-e2e-verification.md`
(✅ executed 2026-09-03 — all cases passed) → `…step2-phase-d-action-fidelity.md` →
`…step3-phase-b-robustness.md`. Execute in that order.

**Phase A — Validate & ship.** ✅ Done (2026-06-04) — see §0. 29 E2E cases passed; 3 runtime bugs
fixed; merged to `main`; published as a private GitHub repo. Remaining: deferred soak tests
(CONN-5 idle keepalive, TRUST-3 DevTools conflict).

**Phase B — Robustness from E2E findings.** Largely addressed by the three §0 fixes. Still open:
idle keepalive soak across SW culls, debugger-attach conflict UX when DevTools is open, and a
clearer "port busy" message surfaced through the tools (not just stderr).

**Phase C — Perception fidelity.** ✅ Done and **E2E-verified live** (2026-09-03; see §0). Open shadow roots + same-origin frames;
`aria-hidden`/`inert`/`hidden`/`display:none` subtree pruning; zero-size filtering (gated on the
document reporting layout, so it no-ops under jsdom); explicit-ARIA-role passthrough plus
`number`/`range`/`file`/`summary`/`contenteditable`/`select[multiple]`; a `[disabled]` marker;
frame-offset `centerOf` so trusted clicks inside an iframe land correctly; an 800-element cap.
Still open: cross-origin frames and closed shadow roots (need per-frame injection or CDP), and a
viewport-only snapshot with an "expand" affordance instead of a hard cap.

**Phase D — Action fidelity.** Wire `trustedType` into a `type` escalation path; DPR-correct
coordinates for trusted input; drag, file-upload, and native-dialog handling.

**Phase E — Safety.** An explicit arm/disarm toggle in the options page; optional per-domain
allow/block list; never log page content or tokens.

**Phase F — Ergonomics.** `wait_for` variants (network-idle, element-visible); a console/error
capture tool; cookie/storage read tools; download handling; multi-window awareness.

**Phase G — Distribution.** Decide packaging: keep unpacked (developer use) vs. a signed Web Store
build; document the security model for each.

## 6. Open questions

- Should control be restricted to an "agent tab" the user explicitly arms, rather than always the
  active tab? (We chose active-tab for ergonomics; revisit if it feels unsafe in practice.)
- Is the offscreen-document keepalive sufficient, or do we also need a native-messaging host for
  truly always-on operation?
- How should very large pages be snapshotted without blowing the token budget?
