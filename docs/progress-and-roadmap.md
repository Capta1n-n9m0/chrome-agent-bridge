# Progress & Roadmap

- **Date:** 2026-09-07
- **Branch:** `main` (merged from `feat/agent-bridge`; public on GitHub, MIT, since 2026-09-03)
- **Status:** Phases A–D complete plus Step 4 (`browser_evaluate`) and Step 5 (network inspection); **256 unit tests green**; **live in-browser E2E passed** — 29 cases on 2026-06-04, the Phase C (13), Phase D (7) and Phase B (6) passes on 2026-09-03, the Step 4 evaluate pass (20 of 22) and the Step 5 network pass (15 of 15) on 2026-09-07 — against the real default profile; 6 runtime bugs found & fixed across those runs. `main`, **public on GitHub (MIT) since 2026-09-03**. **20 tools.**

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

### Phase D E2E (2026-09-03)

Ran `docs/plans/2026-09-03-step2-phase-d-action-fidelity.md` against Chrome **152** on Windows 11.
**TRUST-4…7 all pass**, plus ACT-1/ACT-7 regression. Evidence is in `docs/e2e-test-plan.md` §5,
"Run 3". Two defects that only the live runtime could surface:

1. **`.` was silently swallowed by trusted typing.** `keys.ts` derived `windowsVirtualKeyCode`
   from the character's ASCII code, but that correspondence holds only for `A-Z`, `0-9` and space —
   `"."` is 46, i.e. `VK_DELETE`. Chrome acted on the virtual key instead of inserting the
   character, so `x@y.com` was typed as `x@ycom`. Punctuation now sends `text` alone.
2. **The trusted path never scrolled its target into view.** Found by the zoom spike, and it
   *disproved the plan's premise*: CDP `Input` coordinates need no scaling at all. Measured at zoom
   1.0/1.5 and DPR 1/1.25/1.5, the event's `clientX,clientY` came back byte-identical to what
   `centerOf` sent, so Chrome folds in both page zoom and `devicePixelRatio` itself — the planned
   `scaleForCdp` would have been an identity function and was not written. What actually broke at
   150 % zoom is that zoom shrinks the *visual viewport* in CSS px (1920×940 → 1280×630), pushing
   an element that fit at 100 % off-screen; CDP does not clamp, so the click was dispatched at
   correct-but-off-screen coordinates, hit-tested `<html>`, and **silently did nothing**.
   `centerForInput` now scrolls first and throws rather than reporting a success that did nothing.

A fixture defect also surfaced: `#email` sat outside `<form id="login-form">`, so no real Enter
could ever submit it — ACT-3's and TRUST-6's "form submitted" expectation had been unreachable.
Fixed with `form="login-form"`.

### Phase B E2E (2026-09-03)

Ran `docs/plans/2026-09-03-step3-phase-b-robustness.md` (commits `7e35ff9`, `d9a0ba0`, `458f291`)
against Chrome **152**. **All six cases pass** — STAT-1, TRUST-3, TRUST-8, CONN-5, CONN-6, CONN-7 —
with no code changes needed after the three commits. Evidence is in `docs/e2e-test-plan.md` §5, "Run 4".

- **Port busy is now legible and self-healing (CONN-7).** With an orphan holding 9234, `browser_status`
  and every tool report the EADDRINUSE reason instead of "Extension not connected"; killing the orphan
  brought the server back (5 s bind retry) and the extension reconnected on its own, all inside one poll.
- **Dead Chrome is detected immediately (CONN-6).** Ending every `chrome.exe` closed the socket cleanly, so
  the very first poll said "not connected" — the heartbeat never had to fire. It remains the guard for a
  *hung* peer, exercised only by the unit test.
- **The idle keepalive holds (CONN-5).** 9.5 minutes of untouched Chrome across two checks; snapshot
  instant both times. This was the least-exercised path in the system and the roadmap's standing worry.
- **Cancelling the banner is explained (TRUST-8).** A ~600-char trusted type, cancelled mid-way, returned
  the one-line "session was cancelled … retry" message; the SW console logged `canceled_by_user`; the retry
  worked.
- **TRUST-3 overturned an assumption.** With DevTools docked on the tab, the trusted click simply
  succeeded: Chrome 152 allows an extension debugger alongside DevTools. The "one debugger per tab"
  conflict no longer occurs; `describeDebuggerError`'s DevTools branch is kept (unit-tested) for older
  Chrome and other debugger extensions, and the E2E case now accepts either outcome.

### Step 4 E2E — `browser_evaluate` (2026-09-07)

Ran `docs/plans/2026-09-07-step4-browser-evaluate.md` (commits `8a13b30`, `d2c7a8a`, `0757542`,
`376e4dd`) against Chrome **152.0.0.0** on Windows 11 (DPR 1.25, zoom 100 %). **20 of the 22 EVAL
cases ran and all 20 pass**; evidence is in `docs/e2e-test-plan.md` §5, "Run 5". EVAL-16 (DevTools
open) and EVAL-17 (banner cancelled mid-run) were **deliberately not run** — both need a human at
the keyboard, and TRUST-3 / TRUST-8 already exercise those two Chrome behaviours through the very
same `withDebugger`.

- **One real defect, found and fixed (`376e4dd`).** `Runtime.evaluate {awaitPromise:true}` unwraps
  exactly one promise level, and `replMode` spends it on Chrome's own async script wrapper — so any
  expression whose completion value was itself a promise returned `Promise {}`, including the bare
  `return` form (EVAL-4) and any `p.then(…)` (EVAL-20). A second `Runtime.awaitPromise`, gated by the
  new pure `pendingPromiseId`, fixes it; both cases pass on the re-run. Console capture inside the
  expression (a Phase F follow-up) would have shortened the diagnosis considerably.
- **The CSP premise holds (EVAL-12).** On a page whose own `new Function("return 1")()` throws
  `EvalError`, the same call over CDP returns `1` — design option A (`executeScript` + `new Function`)
  would have failed exactly where it matters.
- **Two plan expectations were wrong rather than the code**, and §4.7 was corrected: a `SyntaxError`
  under `replMode` arrives with no line/col (EVAL-7), and a top-level string is capped by `maxChars`
  (20 000), not by `maxString` (EVAL-19, which applies only to strings nested in a serialised object).
- **`userGesture` is transient activation, not window focus.** A clipboard write still fails with
  `NotAllowedError: … Document is not focused` while Chrome is in the background — a probe showed
  `hasFocus:false, userActivationActive:true`. Chrome's rule, now documented in `docs/setup.md`.
- **Sync timeouts (EVAL-9):** Chrome 152 does honour `Runtime.evaluate.timeout` (the tab is
  responsive immediately after a killed `while(true){}`), but the branch that *reports* is always the
  bridge-side `raceTimeout`, whose deadline starts ~100 ms earlier. Both render the same message by
  design.

### Step 5 E2E — network inspection (2026-09-07)

Ran `docs/plans/2026-09-07-step5-network-inspection.md` (commits `69682cd`, `d64d0fe`, `fdb0378`,
`ac469da`) against Chrome **152.0.7977.82** on Windows 11. **NET-1…15 all pass** (NET-16 is Part N6,
not implemented); evidence is in `docs/e2e-test-plan.md` §5, "Run 6". **No code defects surfaced** —
the findings are all about Chrome's behaviour and about how the results read.

- **The privacy claim holds against a real logged-in session (NET-10).** On github.com, with
  `includeHeaders` and an `id` lookup, **no `cookie` or `set-cookie` header appears on any entry** —
  omitting `extraHeaders` keeps them out of the extension entirely. The cost is that `referer` and
  `origin` are absent too (the §0.4 follow-up flag is now evidence-backed). No `authorization` header
  appeared live, so the `<redacted>` path remains unit-tested only. A source audit confirms the only
  network-related console lines carry counts, never a URL.
- **The write-through survives a worker restart (NET-11), but the case had to be re-scripted.** The
  bridge's 25 s keepalive alarm means the service worker never idles out, so the plan's "leave Chrome
  untouched ≥ 3 min" proves nothing; it was run instead by force-stopping the worker from
  `chrome://serviceworker-internals`. Entries recorded before and after the restart list together and
  `netlog:meta` survives, with exactly one `rehydrated N entries` line. The write-through therefore
  protects against a **forced stop or crash**, not against routine culling (prevented) or a Chrome
  exit (`storage.session` is cleared by design).
- **Two plan expectations were wrong rather than the code.** `http://127.0.0.1:9/` never reaches the
  network — Chrome blocks port 9 with `net::ERR_UNSAFE_PORT` — so the fixture uses 9999 (NET-5). And
  on Chrome 152 a CORS-blocked `fetch` fires `onErrorOccurred` with `net::ERR_FAILED`, so NET-8 does
  **not** illustrate "a network 200 is not a successful fetch"; `docs/setup.md` uses opaque `no-cors`
  responses for that point instead.
- **`includeHeaders: true` has no visible effect through the MCP tool.** The tool prints
  `result.text` and the formatter renders only the table, so headers are reachable only via the `id`
  form. Left as-is (changing the formatter is its own decision); the parameter description and
  `docs/setup.md` now say so.
- **Ids are session-scoped.** After the worker churn Chrome's `requestId` counter restarted low, so an
  id from an older listing may fail to resolve or be reused. Documented in `docs/setup.md`.
- **Caps and responsiveness hold (NET-14).** 600 fetches in a loop left exactly 500 entries for the
  tab, oldest evicted first, the 20 000-char text cap applied its documented footer, and Chrome, the
  fixture and the bridge stayed responsive.

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
| D | Action fidelity: trusted typing + `press_key` via CDP `Input.dispatchKeyEvent`; scroll-into-view + viewport validation for trusted input | ✅ D1/D2 done (E2E-verified 2026-09-03); D3 file upload not started |
| B | Robustness: port-busy surfaced through tools + bind retry; `browser_status`; WS heartbeat; actionable `chrome.debugger` errors; CONN-5 soak | ✅ Done (E2E-verified 2026-09-03) |
| Step 4 | `browser_evaluate`: CDP `Runtime.evaluate` in the page context + in-page serialiser + per-call server timeout | ✅ Done (E2E-verified 2026-09-07) |
| Step 5 | Network inspection: always-on `chrome.webRequest` capture into a bounded per-tab `NetworkLog` with `storage.session` write-through; `browser_network_requests` + `browser_network_clear` | ✅ Done (E2E-verified 2026-09-07); Part N6 `wait_for networkIdle` not implemented |

**Quality state:** 256 unit tests pass; `tsc` typecheck clean across all three packages; all four
bundles build (`server/dist/index.js`, `extension/dist/{sw,options,offscreen,content}.js`). Every
milestone passed a two-stage review (spec compliance + code quality); the final whole-system review
verified the end-to-end protocol contract and that esbuild does not break page-injected functions.

**20 tools:** `browser_status`, `browser_navigate`, `browser_snapshot`, `browser_screenshot`,
`browser_click`, `browser_type`, `browser_press_key`, `browser_scroll`, `browser_hover`,
`browser_select_option`, `browser_back`, `browser_forward`, `browser_list_tabs`, `browser_select_tab`,
`browser_new_tab`, `browser_close_tab`, `browser_wait_for`, `browser_evaluate`, `browser_network_requests`, `browser_network_clear`.

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

**Verified live (2026-09-03, §0 "Phase D E2E"):** trusted typing and `press_key`
(`docs/e2e-test-plan.md` TRUST-4…6) and trusted-click coordinates under **page zoom 150 %** and
**Windows display scaling 125 %** (TRUST-7, plus PERC-7's iframe click re-run under zoom).
Chrome 152.

**Verified live (2026-09-03, §0 "Phase B E2E"):** `browser_status`, port-busy reporting and
self-healing (CONN-7), dead-Chrome detection and unattended reconnect (CONN-6), the 9.5-minute idle
keepalive soak (CONN-5), the cancelled-banner error path (TRUST-8), and DevTools coexistence (TRUST-3).

**Verified live (2026-09-07, §0 "Step 4 E2E"):** `browser_evaluate` — `docs/e2e-test-plan.md`
EVAL-1…22 minus EVAL-16/17: page-context execution and MAIN/ISOLATED isolation, the in-page
serialiser's every branch, CSP bypass, both timeout paths, the per-call server timeout, `replMode`
completion values, and an ACT-2/TRUST-2/PERC-4 regression smoke after the `withDebugger(…, what)`
signature change. Chrome 152.

**Verified live (2026-09-07, §0 "Step 5 E2E"):** network inspection — `docs/e2e-test-plan.md`
NET-1…15: banner-free always-on capture, XHR + `id` detail, 4xx and `net::ERR_*` entries, redirect
hops, pending entries, filters/types/limit, the per-tab caps under 600 fetches, tab lifecycle,
clear, the privacy claims against a real logged-in GitHub session, the service-worker
force-stop/rehydrate cycle, and an ACT-2/TRUST-2/EVAL-1/WAIT-1 regression smoke. Chrome 152.

**NOT yet verified live:** the header-redaction (`<redacted>`) path — no `authorization` header
appeared on the sites exercised in NET-10, so it is unit-tested only; the session-storage **quota**
branch (`evictOldest(0.5)` + retry after a rejected `set`) — 600 entries never came near the 10 MB
quota; the `tabId -1` bucket (no site service worker issued a request during the run); NET-16
(Part N6, not implemented). Also EVAL-16 (DevTools open during an evaluate) and EVAL-17 (banner cancelled
mid-evaluate) — covered indirectly by TRUST-3 / TRUST-8 through the shared `withDebugger`; the
heartbeat's *hung-peer* branch (a socket that stays open but never
pongs — Chrome's exit closes the socket cleanly, so only the unit test reaches it); the "another
debugger is already attached" branch of `describeDebuggerError` (Chrome 152 no longer produces it
for DevTools; it would take a second debugger extension). DPR 2 (a true Retina panel) has not been
measured, though DPR 1.25 and 1.5 both needed no correction.

## 4. Known limitations & risks

- **Trusted input needs its target on screen** — CDP `Input` takes CSS-pixel viewport coordinates
  and does **not** clamp, so a point past the viewport edge hit-tests the root element and does
  nothing. `centerForInput` scrolls the element into view and throws if it still cannot reach it,
  so the failure is reported rather than silent. It can still refuse on a fixed overlay, an
  immovable scroll container, or a viewport smaller than the element; the default (non-trusted)
  action needs no coordinates and is unaffected. Coordinates themselves need **no** zoom or DPR
  scaling — measured at zoom 1.0/1.5 and DPR 1/1.25/1.5 (§0). DPR 2 is unmeasured.
- **Trusted typing replaces, and cannot express modifiers** — the `trusted:true` path selects the
  field's contents and types over them, so it overwrites rather than appends, and there is no way
  to type *into* an existing value at the caret. `keys.ts` covers printable characters plus
  Enter/Tab/Escape/Backspace/Delete/Home/End/PageUp/PageDown/arrows; it has no chords
  (Ctrl+A, Shift+Tab) and no IME/composition support. `keyEventParams` also rejects any character
  outside the BMP (an emoji is two UTF-16 units), so trusted-typing emoji throws; Cyrillic, accented
  Latin and other single-unit text works. `Input.insertText` would be the fix if it matters.
- **Snapshot fidelity** — the walk now descends into **open** shadow roots and **same-origin**
  frames, prunes `aria-hidden`/`inert`/`hidden`/`display:none` subtrees, and drops zero-size
  elements. Still out of reach: closed shadow roots and cross-origin frames (both need a
  per-frame injection or CDP, not a single content script); `visibility:hidden` prunes the whole
  subtree even though a descendant could set `visibility:visible`.
- **Snapshot cap** — very large pages are truncated at 800 listed elements with a note. There is
  no "expand" or viewport-only mode yet.
- **Single connection, single server** — one extension at a time (a second valid connection
  replaces the first), and one server per port. A second server on 9234 now *says so* through every
  tool and `browser_status`, and takes the port over within 5 s of the first exiting — but two Claude
  sessions still cannot drive the bridge concurrently.
- **Active-tab safety** — the agent acts on whatever tab is focused, including sensitive ones.
  Mitigations today are localhost-only + token + the debugger banner.
- **Keepalive** — measured (2026-09-03): the offscreen-document socket survived 9.5 minutes of idle
  Chrome, and a killed Chrome is noticed on the next call because its exit closes the socket. The
  server-side 30 s heartbeat covers the remaining case — a peer that hangs without closing — which has
  only been exercised in unit tests. A truly *unattended* setup (Chrome not running when a session
  starts) still needs someone to launch Chrome.

## 5. Roadmap

**The three planned steps of 2026-09-03 are all executed:** `docs/plans/2026-09-03-step1-phase-c-e2e-verification.md`
(✅ 13/13), `…step2-phase-d-action-fidelity.md` (✅ D1+D2, 2 bugs fixed; D3 not started),
`…step3-phase-b-robustness.md` (✅ 6/6). Next candidates, in suggested order: **Phase E** safety
(arm/disarm), **D3** file upload, then Phase F ergonomics.

**Phase A — Validate & ship.** ✅ Done (2026-06-04) — see §0. 29 E2E cases passed; 3 runtime bugs
fixed; merged to `main`; published on GitHub (private at the time; public + MIT since 2026-09-03). Remaining: deferred soak tests
(CONN-5 idle keepalive, TRUST-3 DevTools conflict).

**Phase B — Robustness from E2E findings.** ✅ Done and **E2E-verified live** (2026-09-03; see §0
"Phase B E2E"). `7e35ff9` — port-busy reason surfaced through every tool, bind retried every 5 s,
`browser_status` (17th tool). `d9a0ba0` — 30 s WebSocket heartbeat so a hung peer fails fast.
`458f291` — `describeDebuggerError` turns attach/detach failures into one-line guidance; the SW logs
detach reasons. CONN-5 soak passed (9.5 min). Still open: nothing blocking; the hung-peer and
"another debugger attached" branches are unit-tested only (§3).

**Phase C — Perception fidelity.** ✅ Done and **E2E-verified live** (2026-09-03; see §0). Open shadow roots + same-origin frames;
`aria-hidden`/`inert`/`hidden`/`display:none` subtree pruning; zero-size filtering (gated on the
document reporting layout, so it no-ops under jsdom); explicit-ARIA-role passthrough plus
`number`/`range`/`file`/`summary`/`contenteditable`/`select[multiple]`; a `[disabled]` marker;
frame-offset `centerOf` so trusted clicks inside an iframe land correctly; an 800-element cap.
Still open: cross-origin frames and closed shadow roots (need per-frame injection or CDP), and a
viewport-only snapshot with an "expand" affordance instead of a hard cap.

**Phase D — Action fidelity.** **D1 ✅** (`4400a21`) — `browser_type` and `browser_press_key` take
`trusted:true` and dispatch real CDP `Input.dispatchKeyEvent` keystrokes; the trusted path focuses
and selects the field, then replaces the selection, and never assigns `.value`. **D2 ✅**
(`c2ceec5`) — measured, not guessed: CDP coordinates need no zoom/DPR scaling; the real bug was the
missing scroll-into-view, now fixed with an explicit off-screen error. Both E2E-verified
(§0 "Phase D E2E"). **D3 file upload — not started**: `browser_upload_file` via
`DOM.setFileInputFiles` (sketched in the plan). Also still open: drag, native-dialog handling,
modifier chords for `press_key`, and caret-preserving trusted typing.

**Phase E — Safety.** An explicit arm/disarm toggle in the options page; optional per-domain
allow/block list; never log page content or tokens. **Higher priority since Step 4:** `browser_evaluate`
runs arbitrary JavaScript with the logged-in page's full authority plus a user gesture, so a kill
switch the user can reach in one click is worth more than it was when the tool set was fixed.
(Nothing is logged today beyond the expression's length.)

**Phase F — Ergonomics.** `wait_for` variants (network-idle, element-visible); a console/error
capture tool; cookie/storage read tools; download handling; multi-window awareness. Plus the Step 4
follow-ups (see that plan's "Follow-ups"):

- **Banner-free evaluate** via `chrome.userScripts.execute` once Chrome's API settles — same envelope,
  only the transport changes; needs the "Allow User Scripts" toggle documented in setup.
- **`args` for `browser_evaluate`**, so agents pass data without escaping it into the string.
- **Frame targeting** (`Runtime.evaluate`'s `contextId`) — needs `Runtime.enable` + teardown.
- **Return a `[ref=eN]` for a `kind:"node"` result**, round-tripping through the content script's
  RefMap: "find it with JS, act on it with the fixed tools".
- **Keep-attached debugger session** per tab, to amortise the ~100 ms attach and the banner flicker;
  needs a lifecycle design, and pairs with Step 5's network work.
- **Console capture** (`Runtime.enable` + `consoleAPICalled`) appended to the evaluate result — this
  is the console tool above, and the Run 5 promise bug would have been diagnosed much faster with it.

Plus the Step 5 follow-ups (see that plan's "Follow-ups"):

- **`browser_wait_for { networkIdle: true }`** — Part N6 of the Step 5 plan, written but not
  implemented. Activity-based (no `webRequest` event for the tab in the last `idleMs`), so a
  long-poll cannot hang it; `NetworkLog.lastActivityAt` already exists for it.
- **Response bodies via CDP** (`browser_network_capture start/stop` + `Network.getResponseBody`) —
  the natural Step 6, and the reason bodies are not in v1: it needs the keep-attached per-tab
  debugger session above, with an attach refcount, so a trusted click during a capture does not
  detach it. WebSocket frames come with the same work.
- **Render headers in the listing when `includeHeaders` is set** — today the flag only populates the
  structured result, so headers are reachable only through the `id` form (Run 6 finding).
- **`extraHeaders` opt-in** if an agent needs `referer`/`origin`, which Run 6 confirmed are missing
  without it — with cookies still redacted at ingest.
- **Query-string redaction flag**, and **scoping the log to the current document**
  (`since: "navigation"`), for users who do not want *Preserve log* semantics.
- **Timing breakdown / transfer size** joined from `performance.getEntriesByType("resource")`.

**Phase G — Distribution.** Decide packaging: keep unpacked (developer use) vs. a signed Web Store
build; document the security model for each.

## 6. Open questions

- Should control be restricted to an "agent tab" the user explicitly arms, rather than always the
  active tab? (We chose active-tab for ergonomics; revisit if it feels unsafe in practice.)
- ~~Is the offscreen-document keepalive sufficient?~~ **Answered 2026-09-03: yes for a running
  Chrome** — 9.5 min idle with no drop, and reconnect after a Chrome restart is automatic. A
  native-messaging host would only add the ability to *launch* Chrome; not planned.
- How should very large pages be snapshotted without blowing the token budget?
