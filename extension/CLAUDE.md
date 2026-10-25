# extension/ — Key files and runtime gotchas

The root `CLAUDE.md` and `docs/agent-rules.md` also apply. Three sub-folders have their own `CLAUDE.md`, loaded only when
you open a file there; read the one whose topic you touch from elsewhere in `extension/`:
- `src/content/` — IIFE build, snapshot rules, `centerOf`, content-script failures, locators and `a11y.ts`, `locate` vs RefMap, marks.
- `src/evaluate/` — `returnByValue` flattening, `replMode` levels, primitive values over CDP, the `saveTo` store.
- `src/handlers/` — `browser_download` from the worker, `tabId` and `targetTab`, `newTab` in the background.

## Key files
- `extension/src/`: `sw.ts` (the `GatedRouter` + offscreen orchestration; the top-level `chrome.tabs.on*`,
  `action.onClicked` and `storage.onChanged` listeners), `router.ts` (thrown error →
  `{code, message, data?}`; Step 9's `GatedRouter`, the only router `sw.ts` builds: `on` throws for a method
  with no safety class, unknown → `UNKNOWN_METHOD` in every state), `offscreen.ts` (the socket; accepts only
  this extension's non-tab senders, `relay-sender.ts`),
  `client.ts` (the hello), `session-marker.ts` (pure: the session marker's choice over event orders),
  `trusted-input.ts` (pure: the CDP steps of trusted input, with or without focus emulation),
  `tabs.ts` (`targetTab` — `tabId` required since S2b — `humansTab`, `activateForCapture` + restore,
  `cdpCaptureRefusal`),
  `errors.ts` (`BridgeError`, `toWireError`, `splitCoded`), `tab-events.ts` (pure: tab events +
  the last-url/title cache), `network-scope.ts` (pure: which tab a network call covers),
  `inject.ts` (`ensureContent`/`callInPage` + `toSerializableArgs`/`unwrapResult`), `handlers/*`
  (Step 8: `target.ts` — `ref` | `locator` → a ref before the action; `locate.ts`; `locator-wait.ts`
  — the 100 ms `waitFor {locator}` poll), `content/{index,snapshot,refmap,actions,geometry,guard}.ts`
  and Step 8's `content/a11y.ts` (the one walk, `roleOf`, the accessible name, the pruning gates —
  shared by snapshot and locate), `content/locate.ts`, `content/nearest.ts` (candidate ranking),
  `content/marked.ts` (`refOfMarked`), `debugger.ts`, `debugger-errors.ts`
  (pure: CDP failure → `{code, message}`), `keys.ts` (pure: key name → CDP key params),
  `evaluate/{serialize,wrap,result,mark}.ts` (pure: in-page serialiser source, `return`-wrapper,
  CDP-result → `EvalEnvelope`, the `asRef` mark), `network-log.ts` (pure: `NetworkLog` reducer + query (its text formatter moved to `sdk/src/format`),
  redaction, body summary, serialise/merge), `network-state.ts` (the singleton log, the
  `storage.session` rehydrate/flush, the own-port variable), `handlers/network.ts`,
  `download.ts` (pure: `DownloadStore`, base64, filename from `content-disposition`) +
  `handlers/download.ts` (the service-worker fetch); the other half is `sdk/src/download.ts`.
  Step 10: `evaluate-save-store.ts` (pure: `EvaluateSaveStore` — 5 min TTL refreshed per pull, 8 entries, 256 MiB per
  value and in total, 1 MiB slices, the `Unknown or expired evaluateSave id` refusal), `evaluate/save.ts` (pure: the
  page-side sources `SAVE_PREPARE_SRC`/`SAVE_META_SRC`/`SAVE_SLICE_SRC`, the value checks and refusal texts) +
  `handlers/evaluate-save.ts` (the three `evaluateSave*` handlers; the CDP-leg slices in `debugger.ts`);
  `content/locate.ts` computes `pastSnapshotCap` and `handlers/{target,locate,actions}.ts` carry it (#216).
  Step 9 (Phase E safety): pure, unit-tested, with no log call — `safety.ts` (the gate
  `safetyDecision`, the method table `METHOD_CLASSES` over all 26 router methods (Step 10 S4 added
  `evaluateSaveStart`/`evaluateSaveChunk`/`evaluateSaveEnd`, class `evaluate`) — `methodClass` throws
  on an unknown name — the refusal messages (since Step 10 S4b `JS_DISABLED_MESSAGE`, with
  `DISARMED_EVALUATE_MESSAGE` kept as its alias, #219), `listTabs`/event redaction, the network predicate),
  `safety-match.ts` (the block-list grammar and matcher, dot boundary only; #135, #156), `safety-state.ts`
  (`SAFETY_KEYS` in `storage.local`, the per-call read that fails closed, `SafetyStore.toggle()` →
  `"disarmed" | "armed" | "ignored" | "write-failed"`, the 1 s re-arm guard, `readStoredArmed`, the
  `safetyState` reporter), `safety-call.ts` (one call's gate at receipt, before each first side effect,
  and the post-check), `safety-debugger.ts` (the session registry `detachAll` at disarm),
  `safety-network.ts` (the ingest filter), `options-model.ts` (the options page's analysis and texts),
  `relay-sender.ts` (the offscreen sender check); `badge.ts` (badge/title by state, `BadgeController.press`;
  `chrome.action` injected, unit-tested) logs one fixed line per press (`toggleLogLine`); `options.ts` +
  `extension/options.html` are page glue (DOM + `chrome.storage.local`, the Safety and Blocked sites
  boxes), not unit-tested, read statically by `safety-writers.test.ts`. Tests that guard them:
  `extension/test/log-scan.test.ts` (+ `log-allowlist.ts`, 54 log sites) and `log-sentinel.test.ts` (no
  pattern/URL/token in any log), `safety-writers.test.ts` (only the toggle and the options page write the
  safety keys), `manifest.test.ts`.

## Runtime gotchas

### Service worker, CDP and network
- **`chrome.scripting.executeScript` can't serialize `undefined` in `args`** → "Value is unserializable".
  Optional handler params arrive undefined. `callInPage` runs args through `toSerializableArgs`
  (undefined→null). Don't pass raw optional values into executeScript args.
- **A thrown injected function does NOT reject `executeScript`** — Chrome resolves the frame with
  `result: null`. `unwrapResult` treats null OR undefined as failure (no page fn returns those on
  success). Without it, bad/stale refs *silently succeed*. Keep that invariant if you add page fns.
- **"The human's tab" has one resolver: `humansTab()` = `windows.getLastFocused({windowTypes:["normal"]})`
  → its active tab** (`extension/src/tabs.ts`; decisions.md · 2026-10-22 · "The human's tab" is the active
  tab of the last-focused normal window (#43)). It serves `listTabs`' `current:
  true`, `tabs.claim {active:true}` (so `browser_use_active_tab` and the MCP's first touch), a network
  call with no `tab`, `browser_status` and `browser_list_tabs`'s `*`; the SDK's `tabs()` reads
  `current`. `listTabs`' `active` keeps Chrome's per-window meaning (every window's active tab), so never pick
  "the first `active`" again. Measured with the service-worker DevTools window in front: status and
  snapshot named and acted on the same tab (Run 9 R9-RESOLVER-1, 2026-10-23). With no normal window
  at all, calls fail with `No normal Chrome window is focused (a DevTools or popup window may have
  focus) …`.
- **Chrome allows one debugger per tab**: with DevTools open, `chrome.debugger.attach` throws "Another
  debugger is already attached…"; clicking the banner's Cancel mid-action makes `sendCommand` throw
  "Detached while handling command". `withDebugger` maps both through `describeDebuggerError` — add new
  Chrome strings there, not in handlers.
- **`@types/chrome` quirks**: use `chrome.tabs.OnUpdatedInfo` (not `TabChangeInfo`);
  `InjectionResult<any>` (its `Awaited<T>` conflicts with TS's); `sendCommand` params want
  `{[k:string]:unknown}` (not `object`).
- **A character's ASCII code is its virtual key code only for `A-Z`, `0-9` and space.** In
  `keys.ts`, sending punctuation with `windowsVirtualKeyCode = charCodeAt(0)` makes Chrome act on the
  wrong key and *drop the character*: `"."` is 46, i.e. `VK_DELETE`, so trusted-typing `x@y.com`
  produced `x@ycom`. Punctuation uses OEM virtual keys — send `text` alone for it.
- **CDP `Input.*` coordinates need no scaling — but the point must be on screen.** `x`/`y` are CSS
  pixels of the layout viewport (what `getBoundingClientRect` gives). Measured at zoom 1.0/1.5 and
  DPR 1/1.25/1.5: `clientX,clientY` always came back identical to what was sent, so do **not** multiply
  by `chrome.tabs.getZoom()` or `devicePixelRatio`. What does bite: CDP never clamps, so a point past
  the viewport edge hit-tests the root element and the click **silently does nothing**. Page zoom
  shrinks the visual viewport in CSS px (150 % turns 1920x940 into 1280x630), which is how an element
  that fit at 100 % ends up off-screen. `centerForInput` scrolls first and throws if it still can't
  reach — keep that if you add a trusted hover/drag.
- **CDP `Runtime.evaluate.timeout` does not fire while the script is `await`ing** — an idle promise
  isn't "executing", so it only bounds *synchronous* code. `evaluateInPage` races the CDP call
  against its own timer (`raceTimeout`) and swallows the loser's rejection; detaching does **not**
  stop page-side work already in flight.
- **`describeDebuggerError(err, what)` / `withDebugger(tabId, fn, what)` take a caller name** —
  it's interpolated into the restricted-URL and timeout messages ("Trusted input" by default,
  `"browser_evaluate"`, `"Full-page screenshot"`). Add new Chrome strings there, not in handlers.
- **A module service worker must not use top-level `await`** — Chrome fails the worker with
  `TypeError: Top-level await is disallowed in service workers`, since the script must finish
  evaluating synchronously for its listeners to be known. The network log therefore ingests into
  memory from the first event and `network-state.ts` keeps a `ready` promise that `merge`s the
  rehydrated `storage.session` blob *underneath* the live entries (live wins); handlers `await ready`.
- **`chrome.webRequest` listeners must be registered at the top level of `sw.ts`**, synchronously —
  they have to exist on every worker start or the events that woke it are lost. The same holds for the
  `chrome.tabs.on{Created,Updated,Removed,Replaced}` listeners that feed Step 7's tab events (column 1 in
  `sw.ts`).
- **Cache hits skip `onHeadersReceived`** — `onCompleted` carries `statusCode`/`statusLine`/
  `responseHeaders`/`fromCache`, so the reducer fills status from `onCompleted` too. Same for an
  event whose `requestId` it has never seen (worker restarted mid-request): build the entry from the
  fields every event carries rather than dropping it.
- **`extraHeaders` is omitted from every `extraInfoSpec` on purpose** — without it Chrome never hands
  the extension `Cookie`/`Set-Cookie`, so cookies cannot enter the log at all (stronger than
  redacting). The price, verified live, is that `referer` and `origin` are missing too. Don't add it.
- **`storage.session` is emptied by an extension reload and by Chrome exiting**, and has a 10 MB
  quota — the flush is debounced, writes only `takeDirty()` tabs, and on a rejected `set` calls
  `evictOldest(0.5)` and retries once (writing the union of both dirty sets). The 25 s keepalive
  alarm means the worker rarely idles out, so the write-through is really insurance against a forced
  stop or a crash.
- **Never log a URL from the service worker** — URLs carry tokens. The network code prints counts
  only (`[bridge] network: rehydrated N entries`). Same rule for header values and bodies.

### Tabs, trusted input and capture
- **Only `captureVisibleTab` needs the tab on screen** — the default (`switch`) viewport screenshot,
  the one call the daemon locks besides `focusTab` (`daemon/src/methods.ts`; `selectTab` was removed
  in Step 8 S2b, and the daemon answers it `UNKNOWN_METHOD` itself — #94 item 1). Everything
  else runs on a background tab by design; measured there: `waitFor {text}` and `networkIdle` work
  (Run 8 BG-4: text after 3746 ms, idle after 552 ms, the tab hidden throughout).
  Trusted input does not (next bullet); `fullPage` (CDP) on a hidden or minimized tab is unmeasured
  (T5b F9).
- **Trusted CDP input into a background tab answers `ok` and does nothing.** `browser_click`/`type
  {trusted:true}` on a hidden tab returned in 5–10 ms with nothing received by the page; after
  `focusTab` the same call worked (Run 8 BG-1/BG-2). Chrome's `--disable-renderer-backgrounding
  --disable-backgrounding-occluded-windows --disable-background-timer-throttling` do not change it (ok
  in 12–15 ms, nothing received; Run 10 BGF-1/BGF-2, one trial each; decisions.md · 2026-10-23 ·
  Chrome's anti-throttling flags do not fix background input). **Focus emulation does not fix it
  either** (Step 8 stage FE, Run 11, 2026-10-23): with `focusEmulation: true` (attach →
  `Emulation.setFocusEmulationEnabled` on → input → off in a `finally`, one debugger session;
  `extension/src/trusted-input.ts`) the result said `focusEmulation: "on"` (FE-0), yet a trusted click
  reached the page 0/3, typing 2/3 (trial 3 got `ped`: the first five characters lost) and a key press
  0/3 (FE-1…FE-3); the control without it 0/12 (FE-5); nothing the human sees changed (FE-4 9/9). While
  it is on, the **target page reads `visible`** (3–7 ms into the call, `hidden` again 14–39 ms in), so
  a page-side visibility check is no proof of what the human saw. Hence the policy `"focusFirst"`
  (`sdk/src/policy.ts`): the SDK's `Tab.click/type/pressKey({trusted:true})` call `focusTab` first — the
  tab comes to the front of its window, the window is focused, and it stays there; the SDK never sends
  `focusEmulation` (decisions.md · 2026-10-23 · The background-input policy (#89); · FE's rows and outcome
  table, amended before anything is measured (#78)). Since Step 10 S2 the MCP's trusted `browser_click`/
  `browser_type`/`browser_press_key` do the same: `focusTab {tab}` on the resolved handle, then the input on the
  same handle; a `focusTab` error is the answer and the input is not sent; untrusted actions never focus; the
  cursor does not move (`mcp/src/tools/registry.ts`; decisions.md · 2026-10-24 · FE and `focusFirst` are ratified;
  the MCP's trusted tools focus first too (#106); · 2026-10-25 · S2: the MCP schema baseline, a failed focus's
  answer, and the focus sentence (#214)). Measured: 9/9 trusted inputs reached a background fixture tab, the tab
  in front after (Run 15 MCPF-1R). Focus and input are two calls, so another actor's capture in the same window
  can come between them (phase doc 0.2, Stage 0 F19; not seen live). An untrusted action whose content path fails is escalated to CDP by the extension itself, out
  of the SDK's sight, so on a background tab it can still answer `ok` and do nothing; pass `trusted`
  or call `focus()` when it must land. A clipboard write in `evaluate` likewise needs `focusTab` (BG-3:
  `NotAllowedError … Document is not focused`).
- **The switch sequence, and why it never focuses the window** (`tabs.ts: activateForCapture`, plan
  0.5): minimized → `WINDOW_MINIMIZED` before switching; reserve a capture slot (Chrome allows 2
  `captureVisibleTab` calls/s; 500 ms spacing, one quota retry); activate the target; wait for
  `onActivated` (≤ 1000 ms) + 50 ms; capture; restore the previous tab — only if the window still
  shows the target and no `focusTab` touched it. `captureVisibleTab` needs the window visible, not
  focused: a target in an unfocused second window captured with the foreground window unchanged (Run
  9 R9-SCREEN-5). `focusTab` is the only call that runs `windows.update({focused:true})` (T3.3 grep;
  its alias `selectTab` was removed in Step 8 S2b; the MCP's trusted tools call it since Step 10 S2 and add no
  focus of their own). Never add focus to the capture, and never lower the
  1000 ms or 50 ms waits without a measurement.
- **The switch flash is ~1.5 s, not a frame.** Measured page-side from `visibilitychange` timestamps on
  the human's tab: hidden +5–6 ms after the call, visible again after 1509/1486/1493 ms (Run 8
  SCREEN-1, median 1493 ms) and 1588/1557/1556 ms (Run 9 R9-SCREEN-1, median 1557 ms). That is about
  the 1000 ms wait running to its limit + 50 ms + the capture, which suggests `onActivated` does not
  end the wait (unconfirmed; Run 8 finding 3). Three concurrent captures serialised with no quota error
  (Run 8 SCREEN-3, Run 9 R9-SCREEN-3). The code says the listener does end it (Step 10 Stage 0 F3, by reading
  `showTab`); the live differential row SW-1R (background-tab capture minus front-tab capture) stayed
  undetermined — d = 101, 1276, 1421 ms, trial 1's front capture taking 870 ms against 287/218 ms, a first-call
  or capture-slot cost — so the waits stay (Run 15; decisions.md · 2026-10-25 · S7: Run 15 stands as recorded;
  its follow-ups (#226) item 1). A later differential row needs a discarded warm-up trial (S7.md Findings 6).
- **A capture of a tab in a fully covered (occluded) window hangs.** `captureVisibleTab` did not return
  and the call ended in `TIMEOUT` after 35 s (Run 8 SCREEN-5 first attempt); before T5b the target tab
  then stayed in front ≥ 49 s. Since T5b the chain bound restores the previous tab at 30 s: measured
  `TIMEOUT` at 35 119 ms, previous tab active again at +30 026 ms (Run 9 R9-RESTORE). A late restore
  can still spoil the next capture or undo a `focusTab` that lands in its last check (T5b verifier N1,
  residual race).
- **`screenshot {mode:"cdp"}` hung on a hidden or minimized tab, so it now refuses.** Run 8: a
  background tab → `TIMEOUT` after 35 s with the banner up, and the next `evaluate` on another tab got
  a transient `DEBUGGER_DEVTOOLS` (SCREEN-2); a minimized window → `TIMEOUT` after 25 s (SCREEN-4).
  Since T5b, `cdpCaptureRefusal` answers before attaching: `OFFSCREEN` for a tab not active in its
  window, `WINDOW_MINIMIZED` for a minimized window, both in 3 ms with no banner (Run 9 R9-SCREEN-2,
  R9-SCREEN-4; decisions.md · 2026-10-23 · T5b's three fixes). `cdp` mode is useful only for a tab
  already in front of a visible window.
- **A Memory-Saver discard changes the tab id; `tabReplaced` keeps the handle.** On Chrome 156 an
  Urgent Discard from `chrome://discards` gave the tab a new id (1108126391 → 1108126396) and the
  handle followed through `tabReplaced` (Run 8 LEASE-6 (b); Stage 0 F7 had expected the id to stay).
  While discarded, a page call returns `INTERNAL: The tab was discarded by Chrome's Memory Saver …`
  (`assertNotDiscarded`); `focusTab` reloads it.

### Safety gate (Step 9)
- **Every router method passes the safety gate, and a new one cannot skip it.** `sw.ts` serves through
  `GatedRouter` only (`extension/src/router.ts`); `GatedRouter.on` throws for a name missing from
  `METHOD_CLASSES` (`extension/src/safety.ts`, no default class), and `safety-gate.test.ts` scans every
  `router.on("…")` in `sw.ts` against the table (S1.1, three mutants red; the scan is lexical — `router["on"]`
  escapes it, the throw does not; S1.md §6). A new extension method must enter both `METHOD_CLASSES` and
  `daemon/src/methods.ts`. Exempting or reclassifying a method to pass a row is a forbidden fix.
  (By construction + unit tests.)
- **The state lives in `storage.local`, is read per call, and fails closed.** Keys `safety.armed`,
  `safety.evaluate`, `safety.blockList` (`safety-state.ts` `SAFETY_KEYS`); missing keys = armed, JavaScript
  on, empty list; a failed read or a wrong-typed value refuses every call `DISARMED` (#139, #171). Never move
  it to `storage.session` (a reload would re-arm). A disarm held in memory wins over a read that still says
  armed (#176); a disarm whose write fails twice stays disarmed in memory, returns `"write-failed"` and
  lasts until the worker restarts, which reads storage again — armed (#174; S2b report §6 item 6); a
  rejected re-arm write returns memory to disarmed (S2c, #190). Measured cost of the per-call read:
  snapshot round trip median 3.6 → 5.3 ms (Run 13 SAFE-PERF; #139's Revisit-if not met).
- **Nothing on the wire changes the state.** Only `action.onClicked` (`sw.ts`, the button and the
  `_execute_action` shortcut — there is deliberately no `commands.onCommand`, #142) and the options page
  write it (`safety-writers.test.ts`; `storage.local.remove`/`clear` refused everywhere, #188). The
  `action.onClicked` and both `storage.onChanged` listeners are registered at the top level of `sw.ts`
  with no top-level `await`; `storage.local.setAccessLevel({TRUSTED_CONTEXTS})` runs at module scope after
  every listener, guarded, not awaited (#139). The offscreen document acts only on this extension's
  non-tab senders (`relay-sender.ts`, #173). Adding a wire, daemon or SDK method that arms, disarms, edits
  the list or enables JavaScript is a forbidden fix. (By construction + unit tests; ACL-1 not measured.)
- **The matcher matches only at a dot boundary** — `host === p || host.endsWith("." + p)`
  (`safety-match.ts` `patternMatches`); never substring or dot-less `endsWith` (a forbidden fix). The
  50-case table of stage0-audit.md §5 is `extension/test/safety-match.test.ts`. (Unit tests.)
- **Never log a pattern, URL or title from the safety code.** The gate, matcher and state modules have no
  log call; a press logs one fixed line (`badge.ts` `toggleLogLine`); the daemon logs booleans and the
  count (`intercept.ts` `safetyLogLine`). `log-scan.test.ts` allowlists every log site (54 at S2b — extension
  15, daemon 33, sdk 0, mcp 6) and `log-sentinel.test.ts` runs the real daemon on port 0 (#187). Run 13:
  `daemon.log` 210 lines and the worker console 0 for the token, non-fixture `://` and the test patterns
  (SAFE-10).
- **`navigate`/`newTab` are gated on the URL Chrome will open**, so a relative URL that resolves to this
  extension's `options.html` is refused, not just `chrome-extension://…` written out (S2a round-1
  CRITICAL, #175; measured in Run 13 SAFE-REL-1, PASS). `view-source:` of a relative own-page path
  answered `ok` (SAFE-REL-3 `rel`, recorded) — it resolves against the page's origin, not the extension
  (`wrapper=view-source inner=http own=no`, Run 14 R14-REL-3; #196 answered); every later call on such a tab is
  refused.
- **The disarm reaches running work fast, Chrome's banner does not.** A running trusted `type` ended
  `DISARMED` 14 ms after the press (578 of 1000 characters typed), but the "is debugging this browser"
  banner was still shown 3 s later and gone by +14 s (Run 13 SAFE-4 (b), FAIL, Chrome-owned). Re-measured in
  Step 10's Run 14 (R14-4b): the `type` ended 5 ms after the press (571 of 1000 typed), the banner was gone between
  +4.7 s and +5.0 s and did not return, and a trusted call after the re-arm worked on the same tab, so the debugger
  session was detached (a record, no bound; S1.md Findings 3; decisions.md · 2026-10-25 · S1: Run 14's results
  stand as recorded (#210)). A running `waitFor` was refused 54–92 ms after the press (SAFE-4 (a), 4c).
- **Chrome refuses a `javascript:` navigation through the bridge itself**: `NAV_FAILED JavaScript URLs are
  not allowed in API based extension navigations. …`, page unchanged (Run 13 SAFE-6c, JavaScript on,
  record). With JavaScript off the gate refuses first (Run 13: `DISARMED`, scope `evaluate`, SAFE-6; since Step 10
  S4b `JS_DISABLED` with no `data`, measured live in Run 15 JSD; #202, #219).
- **An options page in a background window did not show a `storage.onChanged` re-arm until brought to
  the front** (Run 13 SAFE-3, FAIL; cause undetermined — UIA staleness or deferred rendering). Re-measured
  with the options window visible beside the driver window, not covered: it showed `Bridge armed.` 31 ms after
  the re-arm, without a reload (Run 15 R15-3R, PASS under the user's occluder exemption; decisions.md · 2026-10-25 ·
  R15-3R: the guard ignores a popup owned by the wave's own window that covers nothing the row reads (#224)). After a `write-failed` disarm the options page shows the stored state ("Bridge armed.")
  while the badge says OFF and every call is refused — the memory disarm is not visible to the page (S2b
  verifier F4, by construction, not producible live). The badge is the indicator.
- **The block list is not a network firewall.** A redirect hop of a bridge `navigate` or `downloadStart`
  onto a blocked host is still requested; the post-check refuses the reply and a download drops its bytes
  (`downloadStart` checks its own URL, then `res.url`, #140, #154). The post-redirect download check is
  measured live: a download redirected onto a blocked host was refused `DOMAIN_BLOCKED` in 76 ms with no file, and
  the server saw the hop and the target each requested once (Run 14 R14-5c, on the threaded `s9-redirect.py`;
  S1.md Findings 4).
  A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).
- **Build fact: esbuild keeps comments placed inside array literals** in the bundle (S0 bundle diff, S0.md
  §6 item 3) — keep comments out of literals where a bounded bundle diff is checked.
