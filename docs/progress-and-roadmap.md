# Progress & Roadmap

- **Date:** 2026-10-24
- **Branch:** `main` (merged from `feat/agent-bridge`; public on GitHub, MIT, since 2026-09-03)
- **Status:** **Step 8 (the SDK surface: locators, typed `Tab`, failure reports, the MCP cursor, first recipes) built and E2E-run (Runs 11–12), 2026-10-23/24; its gate waits on the docs stage S7 and the user's open decisions** ([Step 8 block](#step-8--the-sdk-surface-locators-tab-failure-reports-the-mcp-cursor-2026-10-2324)); **23 tools, 1714 unit tests green** (`npm test` → 1714 passed, 85 files, at `eb6b991`, 2026-10-24). *Superseded 2026-10-24: was "next: Step 8; 22 tools, 950 unit tests green (… 59 files, on the T6 tree)", because Step 8's stages Stage 0–S6b landed.* **Step 7 (multi-actor tabs) built, E2E-run (Runs 8–10) and closed 2026-10-23** ([Step 7 block](#step-7--multi-actor-tabs-2026-10-2223-closed-2026-10-23)). *Superseded 2026-10-23: was "Step 6 … closed 2026-10-22 — next: Step 7; 21 tools, 542 unit tests green", because Step 7's stages T0–T5b, RELOAD-AUTO and the BG-FLAGS run landed.* **Step 6 (daemon + SDK + MCP as an SDK client) built, E2E-tested live (wave W1) and closed 2026-10-22** ([Step 6 block](#step-6--daemon-sdk-and-the-mcp-as-an-sdk-client-2026-10-22)). Steps 1–5 shipped — Phases A–D, Step 4 (`browser_evaluate`), Step 5 (network inspection), `browser_download`, exit-with-session; **live in-browser E2E passed** — 29 cases on 2026-06-04, the Phase C (13), Phase D (7) and Phase B (6) passes on 2026-09-03, the Step 4 evaluate pass (20 of 22) and the Step 5 network pass (15 of 15) on 2026-09-07 — against the real default profile; 6 runtime bugs found & fixed across those runs. **2026-10-21: the Step 6–8 plans are restructured as phase docs, their audit findings ruled (12 entries in `docs/decisions.md`), and the Step 6 kickoff is written (`docs/plans/next-session-prompt.md`).** *Superseded 2026-10-22: was "21 tools, 301 unit tests green (`npm test` on `e60a83a`) … nothing of Step 6 is built", because Step 6's code stages D0–D5b landed on 2026-10-22.*

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
`ac469da`) against Chrome **152.0.7977.82** on Windows 11. **NET-1…15 all pass**, and **NET-16**
(Part N6, `browser_wait_for { networkIdle: true }`) passes in a later pass on the same Chrome;
evidence is in `docs/e2e-test-plan.md` §5, "Run 6". **No code defects surfaced** —
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
| Step 5 | Network inspection: always-on `chrome.webRequest` capture into a bounded per-tab `NetworkLog` with `storage.session` write-through; `browser_network_requests` + `browser_network_clear` | ✅ Done (E2E-verified 2026-09-07), including Part N6 `browser_wait_for { networkIdle: true }` (NET-16) |
| Step 6 | Daemon + protocol v2: `daemon/ sdk/ mcp/` split, a shared detached daemon (roles, welcome, error codes, build-hash handover, idle exit, log), the SDK's `connect()`, the MCP as an SDK client | ✅ Done 2026-10-22 (E2E-verified in wave W1; MUX-5 accepted on re-measurement) |
| Step 7 | Multi-actor tabs: `tabId` on every method, handles, leases, the visibility lock, tab events, error codes, data results with the formatters in the SDK, `browser_focus_tab`, the MCP cursor | Closed 2026-10-23 (built; E2E Runs 8–10) |
| Step 8 | SDK surface: locators by the snapshot's rules, `waitFor {locator}`, `evaluate {asRef}`, the typed `Tab` and cursor, failure reports, the `focusFirst` input policy, the Step 6 compatibility path removed, the session marker, `browser_use_active_tab`, the first recipes | Built and E2E-run 2026-10-23/24 (Runs 11–12); gate pending |

**Quality state:** 542 unit tests pass in 42 files (`npm test` at D5b commit `033b1bc`,
2026-10-22); `tsc` typecheck clean across all five packages (`shared daemon sdk mcp extension`);
`npm run build` produces `daemon/dist/index.js`, `mcp/dist/index.js` and
`extension/dist/{sw,options,offscreen,content}.js`. *Superseded 2026-10-22: was "256 unit tests
pass; `tsc` typecheck clean across all three packages; all four bundles build (`server/dist/index.js`,
…)", because Step 6 split `server/` into `daemon/ sdk/ mcp/`.* Every
milestone passed a two-stage review (spec compliance + code quality); the final whole-system review
verified the end-to-end protocol contract and that esbuild does not break page-injected functions.

*Updated 2026-10-23: Step 7 — 950 tests in 59 files (`npm test` on the T6 tree; [Step 7
block](#step-7--multi-actor-tabs-2026-10-2223-built-and-e2e-run-gate-open)).*

**23 tools** (*superseded 2026-10-24: was 22, because Step 8 S5 added `browser_use_active_tab`*;
*superseded 2026-10-23: was 21, because Step 7 T4 added `browser_focus_tab`*):
`browser_status`, `browser_use_active_tab`, `browser_navigate`, `browser_snapshot`, `browser_screenshot`,
`browser_click`, `browser_type`, `browser_press_key`, `browser_scroll`, `browser_hover`,
`browser_select_option`, `browser_back`, `browser_forward`, `browser_list_tabs`, `browser_select_tab`,
`browser_focus_tab`, `browser_new_tab`, `browser_close_tab`, `browser_wait_for`, `browser_evaluate`, `browser_network_requests`, `browser_network_clear`, `browser_download` (2026-10-06, live-verified: two Blackboard files, 0.4 MB and 7.2 MB, through the bbcswebdav → S3 redirect, sha256-identical to copies fetched another way).

### Step 8 — the SDK surface: locators, `Tab`, failure reports, the MCP cursor (2026-10-23/24)

Phase doc `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`; contracts and deviations in
`…-asbuilt.md`; reports, run records and logs in `…-steps/`; decisions in `docs/decisions.md`
2026-10-23 #70–#103. **Not closed:** after this docs stage (S7) the gate waits for the user's
rulings on the open decisions listed there, and on the `blackboard-ultra` skill edit (G8-3, the
user's grant).

- **What exists:** scripts and Claude name elements by **locator** (`{role, name}`, `{text}`,
  `{css}`) as well as by ref, resolved in the content script by the snapshot's own walk
  (`extension/src/content/a11y.ts`), so what a snapshot shows is what a locator matches;
  `waitFor {locator, state}`; `evaluate {asRef}` turns an element result into a ref. The SDK has a
  typed `Tab` (`client.newTab()`, `claim()`, the client's cursor `client.tab()`, `NO_CURSOR` as the
  23rd code) and **failure reports** (snapshot, screenshot, last 20 requests, `error.report()`). The
  MCP's cursor follows the human only through the new `browser_use_active_tab` — **23 tools** — and its
  actions take a `locator`. The Step 6 compatibility path is gone (every tab call names its tab; `code`
  required on error frames); a **session marker** retires every handle when Chrome restarts, and a new
  daemon never reuses a handle number. First recipes: `recipes/sdk-login.ts`,
  `recipes/blackboard/boot-bb.ts` (loads `bb.js` in one command) and `export-grades.ts` (read-only).
  How to write a script: `docs/setup.md` → "Writing a script".
- **Tests per stage** (`npm test` at each stage's verifier, as the as-built register records):

| Stage | Commit | Tests | Files |
|---|---|---|---|
| Baseline (Step 7 close) | `70aa754` | 950 | 59 |
| Stage 0 — spec audit | `7fe62f4` | 950 | 59 |
| S0 — types | `dcb72db` | 1008 | 60 |
| S1 — content-script `locate` | `e9e5e8c` | 1080 | 64 |
| FE — focus emulation, measured | `6742c1f`, `829368e` | 1135 | 66 |
| S3 — SDK `Tab`, cursor, locators, policy | `db242b6` | 1229 (S3 alone) | 70 |
| S2 — handlers: `ref` \| `locator`, `waitFor`, node → ref | `357f776` | 1276 (S2 alone); 1370 / 75 with S3 | 71 |
| S4 — failure reports | `26df11b` | 1435 | 76 |
| S2b — compatibility path removed, `code` required, session marker | `efb8557` | 1493 | 78 |
| S5 — MCP cursor and tools | `aa113df` | 1534 | 79 |
| S6 — recipes and the E2E wave (pre-run part) | `23b878f` | 1654 | 83 |
| S6b — the failure report's image | `03254d9` | 1683 | 84 |
| S6 — Run 12 closed | `75f0bd6` | 1714 | 85 |

  S2b's net +58 includes 11 removed legacy-path tests, listed one by one in `…-steps/S2b.md`.
  `npm test` at `eb6b991` (2026-10-24): 1714 passed, 85 files.
- **Live E2E** (`docs/e2e-test-plan.md` §5 Runs 11–12; Chrome 156, Windows 11; run by Claude end to
  end, headless Claude sessions as the actors, reloads by `recipes/reload-extension.ps1`):
  - **Run 11 (FE)** (2026-10-23, `FE-run-record.md`): CDP focus emulation does **not** deliver trusted
    input to a background tab — click 0/3, typing 2/3, key press 0/3, control 0/12 — and changes
    nothing the human sees (FE-4 9/9). Read off the pre-written table: outcome (B), policy
    `"focusFirst"`: the SDK's trusted actions focus the tab first, and it stays in front
    (decisions.md · 2026-10-23 · The background-input policy).
  - **Run 12 (S6)** (2026-10-23/24, `S6-run-record.md`, three parts plus addenda): by each row's latest
    result 35 PASS, 1 FAIL (ASREF-1's optional clause, superseded by #99 item 6). REP-0 showed that a
    failure report's screenshot switches to the failed tab (human's tab hidden 1331 ms). REP-1's image
    did not reach the model while the result was an error; S6b measured that Claude Code drops images
    from error results and returns such a report as a non-error result (#100). SM-0 (an extension reload
    keeps held handles) and SM-1 (a Chrome restart retires them) passed; SDK-6 and SDK-7 passed on the
    user's course (read-only; one held export read by both paths, equal hashes). Earlier FAILs (LOC-1,
    REP-1, SM-1, S6.3) stay recorded beside their re-registered re-runs.
- **Open for the user** (`docs/decisions.md` → Open decisions): #71–#76, #78–#84, #87, #90, #91,
  #93–#95, #99 (item 6 and S6b's error-result change), #100; G8-3 (the skill edit).

### Step 7 — multi-actor tabs (2026-10-22/23; closed 2026-10-23)

Phase doc `docs/plans/2026-10-21-step7-multi-actor-tabs.md`; contracts and deviations in
`…-asbuilt.md`; reports, run records and logs in `…-steps/`; decisions in `docs/decisions.md`
2026-10-22/23 #37–#66. **Not closed:** the gate waits for the user's rulings (below).

- **What exists:** several actors work in parallel on different tabs. The daemon names tabs by
  handles (`T1, T2, …`), gives each tab one owner (a lease: opened, claimed, or a popup of a held tab;
  `TAB_HELD` fails fast), and serialises the only screen-needing calls (default viewport screenshot,
  `focusTab`) under one FIFO visibility lock. Every extension method takes a numeric `tabId`; the
  extension emits tab events, returns data (snapshot elements, network entries) and errors with codes.
  The formatters moved to `sdk/src/format` (byte-identical, pinned against the baseline at `51de800`).
  The MCP keeps a cursor (claimed on first touch, not following the human) and gained
  `browser_focus_tab` — **22 tools**. A Step 6 client still works against the Step 7 daemon through a
  lease-checked legacy path until Step 8.
- **Tests per stage** (`npm test` at each stage's verifier, as the as-built register records):

| Stage | Commit | Tests | Files |
|---|---|---|---|
| Baseline (Step 6 close) | `0773a98` | 542 | 42 |
| Stage 0 — spec audit | `551d7fd` | 542 | 42 |
| T0 — types | `18520f9` | 600 | 43 |
| T1 — extension: `tabId`, codes, events | `0240c7c` | 676 | 47 |
| T2 — daemon: handles, leases, lock, tab layer | `e409706`, `cd346ed` | 748 | 52 |
| T3 — extension: data, screenshot modes, `focusTab` | `43c0a53` | 793 | 53 |
| T4 — SDK formatters + MCP pass-through | `138c7f6` | 934 | 59 |
| T5b — fixes from Run 8 | `12ecb65` | 965 | 59 |
| T6 — docs, dead formatter code removed | (uncommitted at writing) | 950 | 59 |

  T6's −15 is the documented removal of the extension's dead network formatters and their 15 tests;
  the same cases run against the SDK formatter in `sdk/test/format-network.test.ts`.
- **Live E2E** (`docs/e2e-test-plan.md` §5 Runs 8–10; Chrome 156, Windows 11; run by Claude end to end
  with headless Claude sessions as the actors; the extension reload by the user for Run 8, by
  `recipes/reload-extension.ps1` from Run 9 on):
  - **Run 8** (2026-10-22, `T5-run-record.md`): PASS — LEASE-1, -2, -4, -5, -6, -7, BG-3, BG-4, the
    regression and designed-change rows but NET-1. FAIL on the bridge — SCREEN-2 (`cdp` on a hidden
    tab hung to `TIMEOUT`), LEASE-3 (`leaseGranted.url` empty), BG-1/BG-2 (below). FAIL on the
    pre-written checks — SCREEN-1, -3, -5, RESOLVER-1; NET-1 hit Chrome's HTTP cache.
  - **T5b** fixed the three bridge defects; **Run 9** (2026-10-23, `T5-run9-record.md`) passed the
    re-checks (cdp refuses in 3 ms; a hung capture restores at +30.0 s; the popup url after 45 ms;
    SCREEN-1/3/5 and RESOLVER-1 under corrected checks). R9-SCREEN-2 and R9-NET-1 failed only on
    their own pre-written checks (a colour-managed cyan; a favicon line after a hard reload).
  - **The flash** of a default-mode screenshot is ~1.5 s, not a frame: median 1493 ms (Run 8) and
    1557 ms (Run 9), page-side `visibilitychange` timestamps.
  - **A Memory-Saver discard gives the tab a new id** and the handle survives through `tabReplaced`
    (LEASE-6).
- **BG findings — Step 8's input for `sdk/src/policy.ts`:** trusted CDP input into a background tab
  returns `ok` in 5–10 ms and the page receives nothing (BG-1/BG-2, Run 8); it works after
  `focusTab`. Chrome's three anti-throttling flags do not change that (Run 10 BG-FLAGS, 12–15 ms,
  nothing received; decisions.md · 2026-10-23 · Chrome's anti-throttling flags do not fix background
  input; Step 8 takes it from there). Focus emulation (`Emulation.setFocusEmulationEnabled`) is not
  measured — no bridge method sends it (T5.2's retry clause is reported unmet). `waitFor {text}`
  and `networkIdle` work on a background tab (BG-4); a clipboard write needs
  `focusTab` (BG-3). Step 8 adds focus emulation, measures it, then sets the policy.
- **Open for the user** (`docs/decisions.md` → Open decisions): #37 (Opus 5.5 for every agent), #40
  and #54 (the network `tab` scope, a bare number as a legacy id), #41 (the Step 6 legacy path), #42
  (a stale extension refused by its hello), #46 (the `@bridge/sdk/format` subpath), #51 (`code`
  optional on the wire); the Run 9 rulings on R9-SCREEN-2 and R9-NET-1 and so T5.3's NET-1 clause
  (`T5.md` §10); T5.2's unmet retry clause (#61); BG-FLAGS's proposal to reuse the Chrome restart
  helpers, which needs a new grant beyond #64.

### Step 6 — daemon, SDK and the MCP as an SDK client (2026-10-22)

Phase doc `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`; contracts and deviations in
`…-asbuilt.md`; decisions in `docs/decisions.md` 2026-10-22 #13–#33.

- **What exists:** five workspaces (`shared daemon sdk mcp extension`); one detached daemon per
  machine on `127.0.0.1:9234` that every client shares (welcome, 22 error codes, build-hash handover,
  idle exit after 10 min with no clients, `~/.chrome-agent-bridge/daemon.log`); the SDK's `connect()`
  (finds, spawns or hands over the daemon); the MCP as an SDK client that never crashes without a
  daemon. The extension is unchanged (`git diff -- extension/` empty at every stage).
- **Tools:** still 21, names and schemas identical to `1a92d95` apart from `browser_status`'s
  description and body (D5 verifier, as-built register).
- **Tests per stage** (`npm test`, "Tests N passed", at each stage's commit; the as-built register
  records how each was measured):

| Stage | Commit | Tests | Files |
|---|---|---|---|
| Baseline | `1a92d95` | 301 | 22 |
| D0 — shared types and codes | `6f7768c` | 322 | 25 |
| D1 — repository split | `80e540c` | 322 | 25 |
| D2 — daemon roles, registry, routing | `4d0241e` | 385 | 28 |
| D4 — SDK core | `9f3fc86` | 479 | 37 |
| D3 — daemon lifecycle | `3964eb1` | 528 | 41 |
| D5 — MCP over the SDK | `d6832a1` | 538 | 41 |
| D5b — connect without waiting for the extension | `033b1bc` | 542 | 42 |

  D5's net +10 includes the documented removal of `startup.test.ts` (−5 tests) with `startup.ts`.
- **Live E2E:** run 2026-10-22 as wave W1 (results below). *Superseded 2026-10-22: was "Not done:
  the live E2E …, deferred by the user to a later session".* Done 2026-10-22: the D7 docs commit,
  this machine's MCP config change, and the user's ratification of the seven open decisions
  (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions; if MUX-7 fails,
  the double spawn is a Step 7 prerequisite) (other machines: `docs/setup.md` §3). POSIX behaviour (the MCP's parent check, the detached
  daemon) is unverified.

**E2E results — wave W1, 2026-10-22** (Run 7 in `docs/e2e-test-plan.md`; evidence
`docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/W1-run-record.md`; verifier `W1-verifier.md`
in the same folder). *Superseded 2026-10-22: was "waits for the D6 wave … Nothing is measured live yet".*
- **Pass:** MUX-1 (first knock spawns the daemon), MUX-2 (two Claude sessions share it), MUX-3 (a
  script beside them), MUX-4 (idle exit 20 s after the last client), MUX-6 (two scripts race: one
  daemon), MUX-8 (no Chrome: `NOT_CONNECTED` after 15029 ms, then recovery), MUX-9 (regression
  smoke), MUX-10 (a pre-Step-6 server: `VERSION` after 2016 ms), DL-1, DL-2 (cross-origin redirect).
- **MUX-7:** the daemon survives a normal `/exit`, a shim kill and a tree kill of another session,
  and dies only in a tree kill of its own spawner — so decision #14 stands and Step 7 needs no
  launcher. A killed daemon is respawned by a live MCP in 3.3 s (#15).
- **MUX-5:** the build handover and the 4002 reconnect passed; the snapshot sub-check failed because
  a DevTools window had focus, and passed on re-measurement — accepted by the user (its latency is a
  later, non-priority item).
- **D6.3:** the wave's daemon log has no URL and no token (counts 0 and 0). NET-1's `12.6 KB`
  against the row's `12.9 KB` was an error in the row: Run 6 was served a CRLF copy of the fixture, proven by a live probe; the
  row is corrected and `test-fixtures/*.html` pinned to LF.
- **Found (no code changed):** `browser_status` and the action tools can disagree on the active tab
  when a DevTools window is focused (→ Step 7); a daemon spawned through `Start-Process -NoNewWindow`
  kept the caller's output pipe open (→ Step 8).

## 2. Architecture at a glance

```
Claude ⇄ (MCP/stdio) ⇄ MCP server ─┐  SDK clients (connect(): find, spawn or hand over the daemon)
scripts ⇄ SDK ─────────────────────┤
                                   ⇅ ws://127.0.0.1:9234 + token
   daemon (one per machine, detached, outlives sessions; holds the extension socket)
                                   ⇅ (JSON {id,method,params})
   Chrome extension (real profile):
     offscreen document  →  holds the WebSocket (survives MV3 service-worker culling)
     service worker      →  routes commands to chrome.tabs / scripting / debugger
     content script      →  builds the ref-tagged snapshot; performs DOM actions
```

Default actions use synthetic content-script events (no banner). When `trusted:true` is requested
(or a content action throws), the click escalates to real CDP `Input.*` events via
`chrome.debugger` (shows Chrome's "extension is debugging this browser" banner). Clients address
tabs by daemon handles (`T3`); each tab has one owner (a lease); actions run in background tabs, and
only a default-mode screenshot and `focusTab` touch the screen, under one visibility lock. A Claude
session works on the tab it claimed first, not on whatever is active. *Superseded 2026-10-23: was
"control follows the active tab; tab tools switch which tab is active", because of Step 7.*

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
NET-16 (same day, after Part N6 landed): `browser_wait_for { networkIdle: true }` — returns at once
on an already-quiet tab, is not blocked by a request left pending, blocks for the length of a
generated burst plus `idleMs` (500 vs 2000 measurably apart), and errors at the 10 s ceiling.

**NOT yet verified live:** the header-redaction (`<redacted>`) path — no `authorization` header
appeared on the sites exercised in NET-10, so it is unit-tested only; the session-storage **quota**
branch (`evictOldest(0.5)` + retry after a rejected `set`) — 600 entries never came near the 10 MB
quota; the `tabId -1` bucket (no site service worker issued a request during the run). Also EVAL-16 (DevTools open during an evaluate) and EVAL-17 (banner cancelled
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
- **One extension, one daemon** — one extension at a time (a second valid connection replaces the
  first) and one daemon per port. Several Claude sessions and scripts share the daemon, each on its
  own tabs (Step 7). *Superseded 2026-10-22: was "one server per port … two Claude sessions still
  cannot drive the bridge concurrently", because Step 6 made the daemon shared (not yet verified live).*
  *Updated 2026-10-23: W1 verified it live (Run 7 in `docs/e2e-test-plan.md`, MUX rows).*
  *Superseded 2026-10-23: was "… but they all act on the same active tab", because Step 7 added handles and leases.*
- **Background tabs** — trusted CDP input into a background tab silently does nothing, and a
  default-mode screenshot of a background tab flashes it for ~1.5 s (Step 7 block). CDP focus
  emulation does not fix the input (Run 11), so the SDK's trusted actions bring the tab to the front
  first and leave it there (`focusFirst`); the MCP's trusted tools need an explicit
  `browser_focus_tab`. A failure report's screenshot flashes the failed tab the same way (Run 12
  REP-0). *Superseded 2026-10-24: was "Step 8 sets the policy", because Step 8 set it (Step 8 block).*
- **Tab safety** — a Claude session claims the tab the human is looking at on its first call, and any
  actor can claim an unowned tab by handle, sensitive ones included. Mitigations today are
  localhost-only + token + the debugger banner. *Superseded 2026-10-23: was "the agent acts on
  whatever tab is focused", because of Step 7's cursor.*
- **Keepalive** — measured (2026-09-03): the offscreen-document socket survived 9.5 minutes of idle
  Chrome, and a killed Chrome is noticed on the next call because its exit closes the socket. The
  daemon's 30 s heartbeat (`daemon/src/wsHost.ts`) covers the remaining case — a peer that hangs
  without closing — which has only been exercised in unit tests. *Superseded 2026-10-22: was "The
  server-side 30 s heartbeat", because Step 6 moved the socket host into the daemon.* A truly *unattended* setup (Chrome not running when a session
  starts) still needs someone to launch Chrome.

## 5. Roadmap

**The three planned steps of 2026-09-03 are all executed:** `docs/plans/2026-09-03-step1-phase-c-e2e-verification.md`
(✅ 13/13), `…step2-phase-d-action-fidelity.md` (✅ D1+D2, 2 bugs fixed; D3 not started),
`…step3-phase-b-robustness.md` (✅ 6/6).

**Next (decided 2026-10-21): the daemon / SDK / multi-actor re-architecture** —
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`. The MCP-owned WebSocket host becomes a
persistent, shared **daemon** (started by whoever knocks first, idle-exit, build-hash handover); a
TypeScript **SDK** lets Claude-written scripts drive the same logged-in Chrome; the MCP becomes an SDK
client; several actors work on different tabs in parallel (handles, leases, a visibility lock only for
screenshots); the extension returns data and errors carry codes; the MCP's current tab no longer
follows the human. Three plans, in order: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`
(daemon + `daemon/ sdk/ mcp/` split), `…step7-multi-actor-tabs.md` (tabId everywhere, handles, leases,
lock, structured results), `…step8-sdk-surface-and-mcp-cursor.md` (locators, typed `Tab`, failure
reports, `browser_use_active_tab`, first recipes). Phase E safety, D3 file upload and the remaining
Phase F items follow after.

*Updated 2026-10-21 (wave W0, `docs/plans/handoffs.md`):* the three plans are phase docs under the
`long-run` method (decisions.md · 2026-10-21 · Steps 6–8 run under the long-run contract); the
findings their Stage-0 audits were to settle were ruled with the user and recorded in
`docs/decisions.md` (actor name `#<pid>`; `selectTab` alias for one release; `extensionStatus` owned
by D2; DL rows for `browser_download` written by Step 6; the popup button in Step 7 T1; SDK-4's
`{text}` locator; one daemon handover per `connect()` then `VERSION`; the cursor cleared on a 4002
reconnect; Opus 5.5 for every Step 6 agent). The Step 6 kickoff is `docs/plans/next-session-prompt.md`.
Step 6's code is built (stages D0–D5b, 542 tests; [§1 Step 6
block](#step-6--daemon-sdk-and-the-mcp-as-an-sdk-client-2026-10-22)); its live E2E ran on
2026-10-22 (wave W1) and Step 6 closed the same day. Next: Step 7 (its
kickoff is `docs/plans/next-session-prompt.md`), then Step 8. *Updated 2026-10-23: Step 7 is built and
E2E-run, its gate open for the user ([§1 Step 7 block](#step-7--multi-actor-tabs-2026-10-2223-built-and-e2e-run-gate-open));
next is Step 8, which starts from the BG findings.* *Updated 2026-10-24: Step 8 is built and
E2E-run (Runs 11–12; [§1 Step 8 block](#step-8--the-sdk-surface-locators-tab-failure-reports-the-mcp-cursor-2026-10-2324));
after its gate: Phase E safety, D3 file upload, and the open Phase F items (`args` for
`browser_evaluate`, console capture).* *Superseded 2026-10-22 (W1): was "its
live E2E waits for the D6 wave with the user. Next after that: Step 7, then Step 8".* *Superseded 2026-10-22: was "Step 6 starts
by pasting it into a fresh session that does not use the bridge MCP. Nothing is built.", because
Step 6's code stages D0–D5b landed.*

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

**Phase F — Ergonomics.** `wait_for` variants (element-visible; network-idle shipped in Step 5's
Part N6) — ✅ **element-visible done in Step 8** (2026-10-23: `browser_wait_for({locator, state})`
and the SDK's `tab.waitFor({locator, state?, timeoutMs?})`, `state: "hidden"` too; Step 8 block); a console/error
capture tool; cookie/storage read tools; download handling; multi-window awareness. Plus the Step 4
follow-ups (see that plan's "Follow-ups"):

- **Banner-free evaluate** via `chrome.userScripts.execute` once Chrome's API settles — same envelope,
  only the transport changes; needs the "Allow User Scripts" toggle documented in setup.
- **`args` for `browser_evaluate`**, so agents pass data without escaping it into the string.
- **Frame targeting** (`Runtime.evaluate`'s `contextId`) — needs `Runtime.enable` + teardown.
- **Return a `[ref=eN]` for a `kind:"node"` result**, round-tripping through the content script's
  RefMap: "find it with JS, act on it with the fixed tools". ✅ **Done in Step 8** (2026-10-23:
  `browser_evaluate {asRef:true}` prints `[ref=eN]`, the SDK's `tab.evaluateRef(js)` returns it;
  a non-element value is refused, Run 12 ASREF-1). *Updated 2026-10-24: after Step 8 the Phase F
  items still open include `args` for `browser_evaluate`, console capture, and D3 file upload
  (Phase D) (decisions.md · 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes).*
- **Keep-attached debugger session** per tab, to amortise the ~100 ms attach and the banner flicker;
  needs a lifecycle design, and pairs with Step 5's network work.
- **Console capture** (`Runtime.enable` + `consoleAPICalled`) appended to the evaluate result — this
  is the console tool above, and the Run 5 promise bug would have been diagnosed much faster with it.

Plus the Step 5 follow-ups (see that plan's "Follow-ups"):

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
