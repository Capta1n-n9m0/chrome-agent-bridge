# Progress & Roadmap

- **Date:** 2026-06-04
- **Branch:** `main` (merged from `feat/agent-bridge`; published as a private GitHub repo)
- **Status:** Code complete; **54 unit tests green**; **live in-browser E2E passed (29 cases)** against the real default profile; 3 runtime bugs found & fixed. Merged to `main` and published (private).

---

## 0. E2E validation (2026-06-04)

Ran the suite in `docs/e2e-test-plan.md` against real Chrome + the live MCP connection. **29 cases passed**, covering connection, navigation (incl. error-page handling), perception (refs + `<label>`/`aria-labelledby` naming + viewport & full-page screenshots), all actions, both `chrome.debugger` paths (trusted `Input` + `Page.captureScreenshot`), tabs, history, the three `wait_for` modes, and the token gate. The core premise is proven: the extension drives the real logged-in profile end-to-end, including CDP-level trusted input that Chrome 136 blocked.

**Three bugs only the live runtime could surface (all fixed):**
1. `fe67e87` — MCP server crashed on a busy WebSocket port (orphaned instance → `EADDRINUSE`). Now non-fatal; stdio connects regardless.
2. `0404602` — `browser_scroll` with no ref crashed: `chrome.scripting.executeScript` can't serialize `undefined` in `args`. Fixed via `toSerializableArgs` (undefined→null).
3. `9bc4701` — invalid/stale refs **silently succeeded**: when an injected fn throws, Chrome returns `result: null` (not undefined / not a rejection); `callInPage` only guarded `undefined`. Fixed via `unwrapResult` (null *or* undefined → actionable error).

**Not yet exercised live** (need manual/long setup): CONN-5 idle keepalive (3-min soak), TRUST-3 debugger-vs-DevTools conflict, CONN-2/3 not-connected/server-restart (would disconnect the session). SEC-1 localhost-only bind confirmed by inspection.

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

**Quality state:** 46 unit tests pass; `tsc` typecheck clean across all three packages; all four
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

**NOT yet verified (requires real Chrome — this is the next step):** that the extension actually
connects from the real profile, that injection/snapshot/actions work on live pages, the
trusted-input banner + escalation, full-page screenshots, the offscreen keepalive across SW culling,
and the core premise that **all of this drives the default profile end-to-end.** See
`docs/e2e-test-plan.md`.

## 4. Known limitations & risks

- **Trusted-click coordinates on HiDPI/zoom** — `trusted:true` clicks use CSS-pixel coordinates
  from `getBoundingClientRect`; on zoomed or Retina displays they may land slightly off. Default
  clicks (by element) are unaffected.
- **Typing is synthetic-only** — `browser_type` dispatches input events; there is a `trustedType`
  CDP helper in the code but it is not wired into the `type` handler yet. Sites that reject
  synthetic typing have no fallback.
- **Snapshot fidelity** — the accessibility walk covers common roles and label associations but
  does **not** yet descend into Shadow DOM or cross-origin iframes, and treats only CSS
  `display/visibility/opacity` as "hidden" (not zero-size or `aria-hidden`).
- **Single connection** — one extension at a time; a second valid connection replaces the first.
- **Active-tab safety** — the agent acts on whatever tab is focused, including sensitive ones.
  Mitigations today are localhost-only + token + the debugger banner.
- **Keepalive edge cases** — the offscreen document should keep the socket alive across SW culls;
  this is the least-exercised path and a priority for E2E.

## 5. Roadmap

**Phase A — Validate & ship.** ✅ Done (2026-06-04) — see §0. 29 E2E cases passed; 3 runtime bugs
fixed; merged to `main`; published as a private GitHub repo. Remaining: deferred soak tests
(CONN-5 idle keepalive, TRUST-3 DevTools conflict).

**Phase B — Robustness from E2E findings.** Largely addressed by the three §0 fixes. Still open:
idle keepalive soak across SW culls, debugger-attach conflict UX when DevTools is open, and a
clearer "port busy" message surfaced through the tools (not just stderr).

**Phase C — Perception fidelity.** Shadow DOM + same-origin iframe traversal; zero-size/`aria-hidden`
filtering; richer roles (tabs, menus, listbox); optionally trim snapshots to the viewport with an
"expand" affordance for very large pages.

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
