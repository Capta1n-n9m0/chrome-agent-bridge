# Stage 0 — audit 2 (code side) of Step 12 (Phase F)

Written 2026-10-27 by auditor 2 (Claude Opus 5.5, medium), read-only. HEAD `0ba82f6`. Evidence files beside this one:
`stage0-a2-wrap.txt` (the old extension's `wrapExpression` on four function sources), `stage0-a2-daemon.txt` (the
daemon's `takesLock`/`classify` today), `stage0-a2-vitest.txt` (`daemon/test/methods.test.ts` and
`extension/test/safety-debugger.test.ts`: 2 files, 23 passed). Chrome facts are not measured here; each one a decision
turns on is named **[measurer]** and left open.

## 1. Decision attacks #322–#329

### #322 `args` for evaluate (0.4)
- **The old-extension mapping catches one shape out of three.** An old extension runs the function source through
  `wrapExpression` (`extension/src/evaluate/wrap.ts:58-61`, `RETURN_RE` matches any `return`) before `Runtime.evaluate`.
  `stage0-a2-wrap.txt`: `(a) => a.rows.length` is left alone, so it evaluates to a function and the serialiser answers
  `kind: "function"` (`extension/src/evaluate/serialize.ts:355`). `(a) => { return … }` and `async (a) => {… return …}`
  get wrapped in an async IIFE, so the answer is `kind: "undefined"`. `function (a) { return a.x }` becomes a function
  *statement* with no name inside the IIFE: a SyntaxError, so `PAGE_ERROR`. The other two paths give other answers
  again. With `asRef` the serialiser marks nothing, so the answer is `BAD_PARAMS "asRef needs an Element…"`
  (`handlers/evaluate.ts:73`). With `saveTo` the value is refused `BAD_PARAMS "The value is a function, which is not
  saveable…"` or "undefined" (`evaluate/save.ts:50,113-114`). On top of that, a *new* extension can legitimately answer
  `kind: "function"` (`"(a) => () => a"`), and the SDK would wrongly turn that into `VERSION`. → G-1.
- "as `evaluateRef` does for a missing ref": `evaluateRef` throws `BAD_PARAMS`, not `VERSION`
  (`sdk/src/tab.ts:342-347`). The precedent the plan cites does not exist. → G-2.
- **The MCP sends `evaluate` itself** with `bridge.call` (`mcp/src/tools/registry.ts:840-845`), not through `Tab`. A
  mapping in the SDK's `Tab` alone would leave `browser_evaluate {args}` on an old extension printing the function's
  source as its "result". → G-3.
- **The timeout guarantee.** Today's `Runtime.evaluate` carries `timeout: timeoutMs` (`debugger.ts`, `evaluateInPage`),
  which ends a synchronous loop (EVAL-9). `Runtime.callFunctionOn` takes no `timeout` parameter in the CDP protocol
  definition **[measurer: confirm on Chrome 156]**. So `args` + `while(true){}` would leave the page's thread spinning
  after `raceTimeout` rejects. The detach does not stop it, and with D's kept session there is no detach either. →
  G-4.
- **Mechanism details 0.4 leaves out.** `callFunctionOn` needs an `objectId` or an `executionContextId`. Without
  `Runtime.enable` neither is known, so one more `Runtime.evaluate("globalThis")` call is needed for the object id.
  `wrapExpression` must never run on the `args` path. `evaluateSaveStart` (`evaluate/save.ts` step 1) and `asRef`
  each need the same call form. → G-5.
- **Caps and the shared guard.** 1 MiB against the 100 MiB frame rule (`daemon/CLAUDE.md`): no conflict, since the
  expression itself has no cap today and can be far bigger. "Serialised" does not say whether 1 MiB means UTF-8 bytes
  or code units. Once the value is on the wire it is JSON, so the extension can only check presence and size: its
  "check again" on types (`undefined`, function, `BigInt`, cycle) is vacuous. A nested `undefined` or function is
  dropped silently and `NaN` becomes `null` (state that, don't promise a refusal). It is also open whether `{args:
  undefined}` or `args: null` count as present. The shared-guard precedent `isUploadFilesParams`
  (`shared/src/protocol.ts:598`) has **no product caller**, only `shared/test/protocol-step11.test.ts`, and the daemon
  checks no params. So "the shared guard checks again" only means as much as the SDK and extension call sites that
  call it. → G-6.
- *Instead of* / *Revisit if:* real. The Revisit-if should add "`callFunctionOn` cannot be bounded in time" (G-4).

### #323 `consoleMessages` (0.5)
- **Class `tab` vs `evaluate`.** What the JavaScript switch protects, as the human sees it: the option is labelled
  "Allow JavaScript (browser_evaluate)", and `docs/setup.md:641-643` says "every other tool keeps working". Spec §6.5:
  "off refuses `evaluate`". So class `evaluate` would change what the switch means on screen, and the label would have
  to change too. Class `tab` rests on "reading runs no page script", and the code cannot show that:
  `Runtime.enable` makes the inspector serialise the arguments of every console call. This is the well-known
  automation-detection vector: a page logs an object with a getter and sees the getter run. If so, enabling Runtime
  runs page code and tells the page an automation tool is attached, on the human's real sites
  **[measurer: does `Runtime.enable` with no previews call a getter on a logged Error/object; does replay call it]**.
  → G-8.
- **What a refusal reveals is fine; what an answer reveals is not covered.** A refused `consoleMessages` answers as a
  refused `snapshot` does (same class, same gate). But an answer can carry text from a blocked host in two ways the
  snapshot cannot. (a) A same-site frame (block `a.example`, page `www.example`) shares the page's process, so its
  messages arrive in the tab's session. The entry has no URL, so nothing can filter it after the reducer has stripped
  the URL. (b) If the store is not cleared on a navigation, messages from a blocked page the tab just left come with
  the next read **[measurer: navigation and the store; out-of-process frames]**. The reducer must read the source URL
  (or the execution context's origin) internally, drop blocked and `file:` origins, and only then strip. → G-7.
- **The daemon table's shape.** `TAB_METHODS` is a plain `Set` of names (`daemon/src/methods.ts:12-33`), and
  `classify` already puts an unlisted method that carries a `tab` into class `tab` (`stage0-a2-daemon.txt`:
  `classify consoleMessages {tab:'T1'} (unlisted) = tab`). So leaving the method out of the daemon's table is
  invisible, and no test ties the daemon's table to `METHOD_CLASSES` (`grep METHOD_CLASSES daemon/test` finds nothing).
  "Both tables" is enforced on the extension side only. → G-9.
- No `chrome.debugger.onEvent` listener exists anywhere (`grep onEvent extension/src`: none). C1 needs one: either a
  listener per call (added and removed, as `showTab` does with `onActivated`, `extension/src/tabs.ts`), or a new
  top-level one, and S3a's lane allows only one `router.on` line in `sw.ts`. Say which.

### #324 the kept session (0.6)
How it works today. `withDebugger` (`debugger.ts`) → `runWithDebugger` (`safety-debugger.ts:93-118`) runs: refused? →
`guard.effect()` → `sessions.begin` → attach → `fn` → `killed` checks → `end` → detach, all per call. `detachAll` marks
every live session `killed` and detaches it (`:56-70`). Callers: `runTrustedInput`, `fullPageScreenshot`,
`viewportScreenshot`, `evaluateInPage` (plus `sweepMark` through it), `evaluateToSave`, `uploadByMark`. `onDetach`
(`sw.ts:348-350`) is diagnostic only.
- **Per-call clean-up by detach is assumed in two places.** (1) `raceTimeout`'s comment: "withDebugger's finally
  detach cancels the pending command" (`debugger.ts`). (2) Focus emulation: "detach clears it" (`runTrustedInput`'s
  comment, and the warn at the allowlisted site). C's `Runtime.enable` and E's interception would add two more pieces
  of session-scoped state. If the session is kept, each of these stays on. The keeper has to drop the session after
  any timeout or failed clean-up, and C and E have to switch their state off explicitly. → G-10.
- **Detach on a block-list edit is missing.** 0.6 detaches on a page becoming blocked "seen in the existing
  `tabs.onUpdated` listener". But the human can block the kept tab's host *without any navigation*, from the options
  page, and that change arrives through `chrome.storage.onChanged` (`sw.ts:370-…`, `touchesSafety`). The phase doc's
  STOP rule ("a debugger session attached … on a tab whose page is blocked") would fire. → G-11.
- **Worker restart.** "Sessions do not survive it" is asserted, not measured. If Chrome keeps an extension's debugger
  attached while the worker is restarted, the keeper loses its record. The next attach then throws "Another debugger is
  already attached", which `debugger-errors.ts:48-52` maps to `DEBUGGER_DEVTOOLS` ("Close DevTools") — a false
  message. With E, an interception would be left on with nobody to switch it off **[measurer: does an attachment
  survive worker termination; does `chrome.debugger.getTargets()` show `attached` + our `extensionId`]**. → G-12.
- **"Answers do not change" is not true in one case.** Two concurrent CDP calls on one tab: today the second attach
  meets Chrome's one-debugger rule and answers `DEBUGGER_DEVTOOLS` (by reading the code; **[measurer]**). Through
  the keeper both succeed. That is an improvement, but it is an answer change and should be listed. → G-13.
- The gate re-check placement is right ("before each use", where `runWithDebugger` checks before the attach). But
  `DebuggerSession.killed` is per call today; once one session serves several calls, each call needs its own killed
  marker, or the shared record has to be split. That is an S4a design point.
- Banner: the session closes 5 s after the last call, and the banner lingers 3–14 s after that (SAFE-4 (b)). KEEP-2
  has to judge the detach time, not when the banner goes, or the linger alone would read as G12-2's "banner kept past
  the ruled bound". → G-14.

### #325 the file chooser (0.7)
Today's `uploadFiles` order (`handlers/upload.ts:105-121`): params (`checkUploadParams`) → tab → file access
(`fileAccessRefusal`) → each path checked as an existing file → effect → inject → target → effect → the content
script's mark (it checks for a file input and `multiple` against the number of paths) → CDP. The folder rule runs at
receipt, in the gate (class `upload`).
- What can be shared: the gate's folder rule (automatically), `checkUploadParams`' paths part, file access and the
  existence check, if they are lifted out into one shared prologue that both paths call.
- What cannot: the content script's target rule refuses an element that is not a file input
  (`content/upload-target.ts`). And single-file vs multiple can only be checked once `Page.fileChooserOpened` reports
  its `mode`, which is *after* the click: the page's handlers have already run, and a chooser is pending. A refusal
  at that point must cancel the chooser **[measurer: how an intercepted, unanswered chooser is cancelled; whether it
  needs `Page.enable`; whether an out-of-process frame's chooser reaches a tab session]**. Two chooser calls at once
  on one tab, or on one kept session, would see each other's events: serialise per tab. → G-15.
- **JS_DISABLED for the chooser click.** Class `upload` is documented as outside the JavaScript switch
  (`safety.ts:46-47`; spec line 715; `docs/setup.md:809` "Turning JavaScript off does not stop an upload").
  Refusing `chooser: true` needs a gate rule that reads the params, like `navigate`'s script URL rule, and those three
  docs have to be amended. The case for it is weak: `browser_click`'s synthetic click also runs page handlers, and
  it works while JavaScript is off. The conservative reading (refuse) is still the right default, for user review.
  → G-16.
- Click (ii), the trusted CDP click, needs focus and the lock. That ties E to G2, so if Stage 0 picks (ii), G2 goes
  before E. → G-17.

### #326 G1/G2 — G2 in §2. G1
- The manifest has no `webNavigation` (`extension/manifest.json:8`). `sourceTabId` exists only on
  `chrome.webNavigation.onCreatedNavigationTarget`, and Chrome's API reference lists the `webNavigation` permission for
  that API (cited, not measured). So "no new permission" is very probably impossible, and G1 goes to G12-2 or stays a
  limit **[measurer: confirm `chrome.webNavigation` is undefined without the permission]**.
- `tabCreated` is emitted from `tabs.onCreated` (`extension/src/tab-events.ts:141`), and the daemon applies the opener
  rule at once (`daemon/src/intercept.ts:305-312`, F20). `onCreatedNavigationTarget` fires separately, so "tabCreated
  carries it" means either delaying `tabCreated` for every tab, or a second, new event (a wire change, §10 note). →
  G-18.

### #327 the gate for every item (0.10)
- Log sites: no new site is needed. `handlers/evaluate.ts:36` logs `expression.length` only, and `args` adds nothing
  to it. `onDetach` (`sw.ts:349`) logs a tab id and a reason. The sentinel shape fits: `log-sentinel.test.ts` "S4.5"
  (`:375-…`) already runs daemon + SDK over real ws on port 0 and reads `daemon.log` (`:386, :438`). A console-reply
  sentinel needs the fake extension's reply to carry the entry, and the MCP's formatted output must also be scanned
  (stderr).
- "The new modules have no log call": the keeper (D) will want to log detach reasons. Say now that it adds none.
- Misses in 0.10: the JavaScript-switch case for C (G-8), the blocked-frame text (G-7), and E's params-dependent rule
  (G-16).

### #328 Run 19 seed rows
- KEEP-4 ("DevTools takes the tab") needs DevTools truly attached. Run 17b could not attach it (R17B-UP-DEVT: control
  `ok`), and 0.3 does not fix that (G-22), so KEEP-4 would read NOT MEASURED.
- CON rows need a page that logs before the call and a same-site frame of a blocked host (G-7). KEEP-2 by detach time
  (G-14). For G2, a row with a screenshot by a second actor racing a trusted click.

### #329 the order
- Holds, with two conditions: E(ii) requires G2 before E (G-17), and KEEP-4 requires A to fix the DevTools helper
  (G-22). Its Revisit-if ("a dependency the order breaks") is met conditionally.

## 2. G2 — the two mechanisms

**Today.** No trusted input takes the lock: `takesLock click {trusted:true} = false`, `type … = false`, `focusTab =
true` (`stage0-a2-daemon.txt`; `methods.ts:83-87`). The lock is held for exactly one client request, from `acquire` to
the `finally` after one `forward` (`intercept.ts:492-519`), FIFO, the wait bounded by that call's deadline, released
when its client disconnects (`lock.ts:72-80`). The SDK sends `focusTab` before every trusted input (`sdk/src/tab.ts:184-188`,
`policy.ts` `focusFirst`, #89), and so does the MCP (`registry.ts:505, 529, 543`, #106). The default screenshot
restores the previous tab **after its reply** (`tabs.ts:219`, `void startRestore().then(release)`), so outside the
daemon's lock. Only `noteFocus` (`tabs.ts:288`, called by `focusTab`, `handlers/tabs.ts:71`) stops that restore from
undoing a focus.

**(i) One wire call.** The extension's `click`/`type`/`pressKey` gain a `focus: true` param and focus inside the
handler (`noteFocus` + `windows.update` + `tabs.update`), then the input. The daemon's `takesLock` adds
`trusted && focus`.
- Changes: shared (the param), extension `handlers/actions.ts` (3 handlers) and maybe `handlers/tabs.ts` (the focus
  lifted out to share), daemon `methods.ts`, SDK `#trusted` and the MCP's three tools (send `focus`, drop `focusTab`),
  the #214 baseline untouched (no schema change).
- An old extension ignores `focus`. If the SDK has dropped its own `focusTab`, a trusted input on a background tab
  answers `ok` and does nothing (BG-1/BG-2): a silent no-op. To stay safe the SDK has to keep `focusTab` first, and
  the race then stays open on an old extension.
- Old SDK/MCP: cannot reach a new daemon at all (build-id handover / `VERSION`, `sdk/CLAUDE.md`). Not a concern.
- A crash mid-hold: a client gone → `releaseAllOf`; the extension call goes on and focuses and types for nobody. A
  dead worker → the forward rejects, `finally` releases.
- The settle pause: in the extension handler, before the reply (the lock is released at the reply), or in the daemon
  after `forward`.
- About 70 lines of code, 200 of tests.

**(ii) The daemon holds the lock across `focusTab` and the input.** Recommended form (ii-a): inside *one* client
request. For `click`/`type`/`pressKey` with `trusted === true` (and `focusEmulation !== true`, which never focused),
the daemon takes the lock, forwards `focusTab {tabId}`, checks that the caller is still connected and the lease still
held, forwards the input, waits the settle pause, then releases. (ii-b), a hold token across two client calls, needs
a maximum-hold timer in `lock.ts` and breaks spec §6.4's "for the duration of a single call". Rejected.
- Changes: daemon `methods.ts` (a `trustedFocus(method, p)` predicate) and `intercept.ts` (the two forwards under one
  acquisition, the pause timer injected for tests). **No wire, extension, SDK or MCP change** is needed: the SDK's and
  the MCP's own `focusTab` still run first (one extra lock round trip and a second, harmless focus). Dropping them
  later is a separate, optional change, and it would touch `mcp/test/s2-focus-first.test.ts`.
- An old extension: works, since it already knows `focusTab` and the input.
- A crash mid-hold: a client gone → `releaseAllOf` frees the lock at once, and the connected-check before the second
  forward stops an input for nobody. A dead daemon takes the in-memory lock with it. A dead worker → the forward
  rejects; the tab stays in front, as after today's `focusTab`.
- Fairness and timeouts: FIFO as today, with one acquisition for both legs, so no waiter can come between them. One
  deadline covers the wait, both forwards and the pause (#44). Reply first and keep the lock through the pause, so
  the caller's deadline is not spent on it.
- The settle pause: in the daemon, after the input forward settles (on success and on an input error, since keys may
  already have been sent), before `release()`.
- About 65 lines of code, 170 of tests.

**Recommendation: (ii-a).** It is the only one with no extension change and no silent no-op on an old extension. The
lock stays a daemon-only concept (spec §5: the daemon owns it), and every existing client gets the fix without a
change. Both mechanisms share three costs (G-19): every trusted input now waits behind any screenshot holding the lock
and can answer `LOCK_TIMEOUT {holder}` (a new answer for these methods under contention); the lock now covers the
focus, but the screenshot's restore still runs after its own reply, so the focus must keep `noteFocus`
(`focusTab` does); and the extension's own escalation of a failed untrusted click to CDP (`actions.ts:62`) stays
outside both (unchanged and already documented, `policy.ts`).

## 3. A's defect list (0.3) re-derived

| 0.3 item | Record line | Helper line | Verdict |
|---|---|---|---|
| One console path per slice | S7-run-record §1 R17B-LOGS ("liveA's raw capture was overwritten by liveB's"), R17B-UP-L1 FAIL, R17B-SAVE-REFUSE NOT MEASURED; §5 item 7 | `recipes/s11b-r17.ps1:317` (`Join-Path $env:S11_OUT 'console.txt'`) with one `S11_OUT` for both slices (`recipes/s11b-r17b.ps1:29`); the judge needs the control line, `recipes/s11b.ts:456,465` | confirmed |
| Banner-sampler control | §1 R17B-UP-6 (missing/relative positive with no call), F-RAW, -2, -DIR; §5 item 4 | `recipes/s11-win.ps1:76-96` (`Invoke-S11Sampler`: any one positive poll gives `seen`; tail `$S11SampleTailMs = 4000`, `:30`); ids `recipes/s11b-win-rules.ts:51` | confirmed. The negative leg's "≥ 10 s after the last attach" is shorter than the 14 s linger 0.3 itself cites (G-21). F-RAW legs do send a call, but answer before any attach (`handlers/upload.ts` order), so "attach no debugger" is the right wording (G-24) |
| UP-RACE-A rewrite | §1 R17B-UP-RACE-A (ON 1.583 s after OFF); §5 item 5 | `recipes/s11b-win.ps1:334` (wait until 1600 ms after the OFF press, then ON) | confirmed |
| UP-OPT rewrite | §1 R17B-UP-OPT; §5 item 6 | `recipes/s11-win.ps1:278` (poll `-lt 6` s), `:283` (`o2Ms` set without a match), `:307` (obs JSON without `o2Eq`; the record says `:306`) | confirmed; the record's line number is off by one |
| UP-DEVT "proven attached" | §1 R17B-UP-DEVT (F12 twice, control1 `ok`) | `recipes/s11b-r17.ps1:825-833` | 0.3 restates the existing rule; the defect (F12 did not attach DevTools) has no fix in 0.3 (G-22) |
| Aggregator `VERDICT_LINE` | §1 R17B-SAVE-REFUSE | `recipes/s11b-r17b-rules.ts:152` (`ROW \S+ (…)`) | confirmed |
| History set-up lines to the framing file | §5 item 7 | `recipes/s11b-r17b.ps1:70` (`'r17b-history'` → `$Framing`) | confirmed |
| No row prints twice | §1 R17B-ACT-CTL ("printed the whole verdict twice") | `recipes/s11b-r17b.ps1:219-226` | confirmed (where it doubles not traced) |

**In the record, missing from 0.3** (G-23):
- NEWTAB-LOAD's interim `NOT MEASURED … blocked or RULES after not given` printed beside its PASS (§1, §5 item 7;
  `recipes/s11b-r17b-build.ts:97`).
- The scanner's `non-fixture ://` FAILs on the extension's own page URL (§5 item 8).
- UP-OPT's `standing x0, invalid items 2` comes from Run 16's pre-S0F-a `$S11Warning` and its two-line regex
  (`recipes/s11-win.ps1:24, 275, 296`): a stale helper, not only the poll.
- UP-L1 prints the checks, not the raw codes.

0.3 claims nothing the record lacks.

## 4. Size estimates (new lines: code / tests)

| Item | shared | extension | daemon | SDK | MCP | Total | Plan |
|---|---|---|---|---|---|---|---|
| B | 30 / 50 | 120 / 160 (call form for evaluate, save, asRef; `globalThis` id; termination on timeout) | 0 | 45 / 80 (3 option objects, the version mapping) | 20 / 40 + fixture | **~215 / ~330 = ~545** | 350; S2 cap ≤ 400 → **split** (G-25) |
| C | 30 / 20 | 170 / 200 (reducer 80/120, handler + events 90, the table line, gate tests) | 1 / 10 | 45 / 70 (method + formatter) | 30 / 40 + fixture | **~275 / ~340 = ~615** | 700, two slices ≤ 400: fits |
| D | 0 | 280 / 330 (keeper 150/250; `debugger.ts` + `safety-debugger.ts` 90/80; `sw.ts` hooks incl. the storage edit and the start-up sweep 40) | 0 | 0 | 0 | **~610** | 700, two slices ≤ 500: fits |
| E | 10 / 15 | 210 / 270 (pure chooser step list 120/180, shared prologue 50/40, the gate's chooser rule 15/30, target rule 25/20) | 0 | 15 / 30 | 15 / 25 + fixture | **~250 / ~340 = ~590** | 450; S5 cap ≤ 500 → **split** (G-25) |
| G1 (opener on `tabCreated`, no permission) | 10 / 15 | 60 / 80 (correlating `onCreatedNavigationTarget`) | 40 / 100 (a late opener) | 0 | 0 | **~305** | 250; S6 ≤ 300: borderline |
| G2 (ii-a) | 0 | 0 | 65 / 170 | 0 | 0 | **~235** (+~50 if the SDK and MCP drop their `focusTab`) | 250: fits |

From the files they touch: `debugger.ts` 285, `safety-debugger.ts` 118, `handlers/upload.ts` 120, `upload-files.ts` 221,
`content/upload-target.ts` 126, `tab-events.ts` 160, `intercept.ts` 715, `methods.ts` 87, `tab.ts` 433, `registry.ts` 915
(`wc -l`). These are estimates, not measurements.

## 5. Findings, ranked

| # | Sev | Side | Finding | Evidence |
|---|---|---|---|---|
| G-1 | MAJOR | plan | #322's `kind:"function"` → `VERSION` mapping catches 1 of 3 function forms on `evaluate`, none on `asRef`/`saveTo`, and misfires on a new extension that legitimately returns a function | `stage0-a2-wrap.txt`; `wrap.ts:58-61`; `serialize.ts:355`; `handlers/evaluate.ts:73`; `save.ts:50,113` |
| G-2 | MINOR | plan | The cited precedent is wrong: `evaluateRef` answers `BAD_PARAMS`, not `VERSION` | `sdk/src/tab.ts:342-347` |
| G-3 | MAJOR | plan | The MCP's `browser_evaluate` calls `bridge.call` directly; a mapping in the SDK's `Tab` does not reach it | `registry.ts:840-845` |
| G-4 | MAJOR | plan (measurer) | `callFunctionOn` has no `timeout`; the synchronous-loop termination (EVAL-9) is lost for `args` calls, and kept forever under D | `debugger.ts` `evaluateInPage` (`timeout: timeoutMs`); CDP protocol definition |
| G-5 | MINOR | plan | `globalThis` object id needed (no `Runtime.enable`); `wrapExpression` must stay off the `args` path; save and `asRef` need the same call form | `debugger.ts`, `save.ts` step 1 |
| G-6 | MINOR | plan | Unit of the size cap unstated; the extension can check only size; nested `undefined`/function dropped silently; `args: undefined`/`null` presence; the shared-guard precedent has 0 product callers | `grep isUploadFilesParams`: only `protocol.ts:598` and a shared test |
| G-7 | MAJOR | plan (measurer) | Console entries carry no URL, so a same-site blocked frame's text, or text replayed from a blocked page before a navigation, cannot be filtered after stripping; filter by origin first | 0.5 entry shape; `extension/src/CLAUDE.md` (F16 frames) |
| G-8 | MAJOR | plan (measurer) | "Reading runs no page script" is unproven: `Runtime.enable` serialises console arguments (getters, the automation-detection vector); this decides class `tab` vs `evaluate` and the option label | `setup.md:641-643`; spec §6.5 |
| G-9 | MINOR | code | The daemon classes any unlisted method with `tab` as `tab`; no test ties `TAB_METHODS` to `METHOD_CLASSES`, so "both tables" is enforced on one side | `stage0-a2-daemon.txt`; `methods.ts:65-73` |
| G-10 | MAJOR | plan | A kept session breaks "detach cleans up" (pending command, focus emulation; and C's `Runtime.enable` and E's interception); the keeper must drop a session after a timeout or a failed clean-up | `debugger.ts` (`raceTimeout`, `runTrustedInput` comments) |
| G-11 | MAJOR | plan | Detach when a block-list edit blocks a kept tab is missing; only `tabs.onUpdated` is named | `sw.ts:370-…`; phase doc STOP rules |
| G-12 | MAJOR | plan (measurer) | A worker restart with an attachment that survives: false `DEBUGGER_DEVTOOLS`, and E's interception left on; needs a start-up sweep of our own attached targets | `debugger-errors.ts:48-52` |
| G-13 | MINOR | plan | "Answers do not change" is false for concurrent CDP calls on one tab (today the second attach fails) | `debugger-errors.ts:48-52` (by reading) |
| G-14 | MINOR | plan | KEEP-2 must judge the detach time, not when the banner goes (3–14 s linger), or it trips G12-2 | 0.6, 0.11 |
| G-15 | MAJOR | plan (measurer) | The chooser path cannot reuse the file-input target rule or the `multiple` check before the click; a refusal after the click must cancel a pending chooser; serialise per tab | `content/upload-target.ts`; `handlers/upload.ts:105-121` |
| G-16 | MINOR | plan | `JS_DISABLED` for the chooser contradicts class `upload`'s documented rule (three places) and needs a params-reading gate rule; for user review | `safety.ts:46-47`; spec line 715; `setup.md:809` |
| G-17 | MINOR | plan | E(ii) ties E to G2; the order must follow | 0.7 (ii), #329 |
| G-18 | MAJOR | plan (measurer) | G1: no `webNavigation` permission, so `sourceTabId` very probably needs G12-2; "tabCreated carries it" needs a delay or a new event | `manifest.json:8`; `tab-events.ts:141`; `intercept.ts:305-312` |
| G-19 | MAJOR | plan | G2 under either mechanism: trusted inputs now queue behind screenshots and can answer `LOCK_TIMEOUT`; #326's "no existing call's answer changes" is false under contention | `stage0-a2-daemon.txt`; `intercept.ts:492-519` |
| G-20 | MINOR | code | The screenshot's restore runs after its reply, outside the lock; the held focus must keep `noteFocus` | `tabs.ts:219, 228-237, 288` |
| G-21 | MINOR | plan | R18-BANNER-CTL's negative leg waits ≥ 10 s, shorter than the 14 s linger 0.3 cites; use ≥ 15 s | 0.3; Run 13 SAFE-4 (b) |
| G-22 | MINOR | plan | UP-DEVT: 0.3 restates the rule but does not fix the helper that failed to attach DevTools; KEEP-4 depends on it | record §1 R17B-UP-DEVT; `s11b-r17.ps1:825-833` |
| G-23 | MINOR | plan | Four record items missing from 0.3 (§3 above) | `s11b-r17b-build.ts:97`; `s11-win.ps1:24,296,307`; record §5 item 8 |
| G-24 | NIT | plan | "Legs that send no call" should read "legs that attach no debugger" (F-RAW sends a call) | record §1 R17B-F-RAW |
| G-25 | MAJOR | plan | B (~545) and E (~590) exceed S2's ≤ 400 and S5's ≤ 500 caps; split before they start (§7, #271) | §4 |

## 6. Proposed decisions

### 2026-10-27 · `args`: a new extension says it called the function; anything else is `VERSION`
**Decided:** an old extension is detected positively, not inferred from `kind`. Preferred: the extension's hello gains
an optional `features: ["evaluateArgs"]`, and the daemon answers `VERSION` with the reload hint to any `evaluate` or
`evaluateSaveStart` carrying `args` when the extension did not send it (the #42 pattern). Fallback: the reply carries a
marker (`argsCalled: true`) and the SDK and the MCP both refuse a reply without it. **Why:** G-1, G-3. **Instead of:**
the `kind: "function"` inference (1 of 3 shapes, false positives). **Revisit if:** the extension hello cannot change in
Step 12. **By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · `args` calls stay bounded in time
**Decided:** an `args` call that passes its `timeoutMs` is ended with `Runtime.terminateExecution` (or an equivalent
measured at Stage 0) before the answer `TIMEOUT`; B2.1 adds a sync-loop row. **Why:** G-4. **Instead of:** relying on
`raceTimeout` alone. **Revisit if:** the measurer shows `callFunctionOn` honours a timeout. **By:** Claude (proposed)

### 2026-10-27 · The class of `consoleMessages` follows the `Runtime.enable` measurement
**Decided:** class `tab` only if Stage 0 measures that `Runtime.enable` and its replay run no page getter. Else class
`evaluate`, and the option label and `setup.md` say the switch also covers the console (shown to the user). In both
cases the reducer drops entries from blocked, own-extension and `file:` origins before it strips URLs. **Why:** G-7,
G-8. **Instead of:** class `tab` on an unproven "no page script". **Revisit if:** the measurement. **By:** Claude
(proposed, contract-level, safety, for user review)

### 2026-10-27 · The keeper drops a session on a timeout, a failed clean-up, a block-list edit and at start-up
**Decided:** in addition to 0.6, a kept session is detached after any call timeout or failed clean-up step, on a
`storage.onChanged` safety change that blocks its tab, and by a start-up sweep of targets attached by this extension
(if the measurer shows they survive a worker restart). C and E switch their own session state off explicitly.
**Why:** G-10, G-11, G-12. **Instead of:** "detach cleans up" and `tabs.onUpdated` alone. **Revisit if:** the
measurer shows attachments never survive a restart (the sweep becomes a no-op guard). **By:** Claude (proposed)

### 2026-10-27 · The chooser path: a shared prologue, a refusal after the click cancels, one chooser call per tab
**Decided:** params, file access and the existence check are lifted into one function both upload paths call; the
`multiple` check runs on the event's `mode`, and a refusal there cancels the chooser by the measured method; chooser
calls are serialised per tab; while JavaScript is off `chooser: true` is refused `JS_DISABLED` (a params rule in the
gate; three docs amended), for user review. **Why:** G-15, G-16. **Instead of:** "the same gate" as a slogan.
**Revisit if:** the measurer shows no way to cancel an intercepted chooser (then E does not ship). **By:** Claude
(proposed, contract-level, for user review)

### 2026-10-27 · G2 by the daemon: one request, the lock across `focusTab` and the input, then the pause
**Decided:** mechanism (ii-a) of §2: for `click`/`type`/`pressKey` with `trusted: true` and no `focusEmulation`, the
daemon takes the visibility lock, forwards `focusTab`, re-checks the caller and the lease, forwards the input, replies,
and holds the lock for the settle pause (measured; start 500 ms) before releasing. No wire, extension, SDK or MCP
change. `LOCK_TIMEOUT` for these methods is listed as a new answer under contention. **Why:** no silent no-op on an
old extension; the lock stays daemon-only; ~235 lines. **Instead of:** (i) one wire call with `focus: true`; (ii-b) a
hold token across two calls. **Revisit if:** the pause must sit between the focus and the input (then the daemon
waits there too). **By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · G1 goes to G12-2 unless `chrome.webNavigation` exists without the permission
**Decided:** the measurer checks first that the API is absent without `webNavigation`; if it is absent, G1 is not
built in Step 12 without the user's ruling, and no Chrome measurement of `sourceTabId` is spent before then. **Why:**
G-18. **Instead of:** measuring `sourceTabId` with a permission the manifest lacks. **Revisit if:** the API is there.
**By:** Claude (proposed)

### 2026-10-27 · B and E split; A fixes the DevTools helper and the control wait
**Decided:** S2 becomes S2a (shared + extension) and S2b (SDK + MCP); S5 likewise. 0.3 adds a DevTools-attach helper
fix with its control, R18-BANNER-CTL's negative leg waits ≥ 15 s, and G-23's four items join the aggregator and helper
fixes. **Why:** G-21, G-22, G-23, G-25. **Instead of:** the caps exceeded, and KEEP-4 NOT MEASURED. **By:** Claude
(proposed)
