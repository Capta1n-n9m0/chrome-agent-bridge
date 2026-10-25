# Decisions archive — Step 7: multi-actor tabs

Entries moved verbatim from `docs/decisions.md` when the step closed; numbers unchanged, newest first. Cite an
entry by date + title ([`docs-writing-guide.md`](../docs-writing-guide.md#decisions)). The index is in
[`decisions.md`](../decisions.md#archive).

### 2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7 open decisions (#69)
**Decided:** R9-SCREEN-2 is accepted (option A): its positive control's image came back, and CDP
simply renders saturated colours differently from `captureVisibleTab` (cyan `#00ffff` read
`#97fdfd`; magenta `#ff00ff` read `#dd00fa` through the default capture) — a measured fact, not a
fault; later colour checks name the nearest hue or use less saturated colours. #37 (Opus 5.5
everywhere), #40 (network `tab` keeps "all"/"active"), #46 (`@bridge/sdk/format` subpath; Step 8
decides on the main entry), #51 (`code` optional until Step 8 S2 removes the v1 fallbacks) and #54
(a bare network number is a legacy Chrome id until S2) are accepted as recommended.
**Why:** the user (2026-10-23): "I like higher quality product. And we ran out of limits quickly
because of many heavy parallel sessions at that moment."
**Instead of:** a re-run of R9-SCREEN-2 with a looser rule; Sonnet builders; renaming the scope
argument now; adding the formatters to `index.ts` now; requiring `code` now; removing the numeric form now.
**By:** user

### 2026-10-23 · The user rules on the Step 7 close-out questions (#68)
**Decided:** (1) T6 is committed (the classifier had blocked the builder's commit; the user gave the
green light; commit 430e6fe). (2) R9-NET-1 is accepted: the extra `favicon.ico` request after a hard
reload is expected and was not accounted for in the pre-written count; the document line met the row
(`12.8 KB`, `from cache: no`), so T5.3's NET-1 clause is met. R9-SCREEN-2's positive control waits for
the user after an explanation. (3) The user approves the decisions reported as taken while they were
away — #41, #42, #43, #57 and #62–#67; #41 and #42 leave Open decisions. The remaining open ones
(#37, #40, #46, #51, #54) are presented with a recommendation each.
**Why:** the user's reply of 2026-10-23.
**By:** user

### 2026-10-23 · T6 removes the extension's dead network formatters with their 15 tests (#67)
**Decided:** The five network formatters left in `extension/src/network-log.ts` after T4, and their
15 tests in `extension/test/network-log.test.ts`, are deleted; the same cases run against the SDK copy
in `sdk/test/format-network.test.ts` and the byte-identical baseline test. `npm test` 965 → 950 (59
files both), a documented removal of dead code, not an unexplained drop.
**Why:** nothing called them after T4 (T4 finding 1); two copies of a formatter drift.
**Instead of:** keeping dead code to hold the count.
**Revisit if:** the extension needs to format text again.
**By:** Claude

### 2026-10-23 · Chrome's anti-throttling flags do not fix background input; Step 8 takes it from there (#66)
**Decided:** Recorded as Step 8 input: with `--disable-renderer-backgrounding
--disable-backgrounding-occluded-windows --disable-background-timer-throttling`, a trusted click and
trusted typing into a background tab still answer `ok` in 12–15 ms and do nothing (Run 10, BGF-1/2
FAIL, one trial each; BGF-3/4 controls PASS; both work after `focusTab`). Background throttling alone
is not the cause; Step 8 measures focus emulation (#62 (4)) and sets its policy. The restart helpers
(`recipes/bgf-*.ps1`) may be reused in a later wave only on a fresh user grant — #64 (2) covered this
test only.
**Why:** BG-FLAGS (commits 00249de, c2234d4); Chrome ended without the flags, session counts
restored (1 window / 1 tab).
**Instead of:** shipping the flags as a workaround.
**Revisit if:** Step 8's focus-emulation measurement also fails.
**By:** Claude

### 2026-10-23 · Later extension reloads use `recipes/reload-extension.ps1` (#65)
**Decided:** From now on a wave reloads the extension with `recipes/reload-extension.ps1` (its own
`about:blank` window, `chrome://extensions` typed into its address bar, only the Chrome Agent Bridge
card's `dev-reload-button` invoked by UI Automation, verified by the card's worker restart and a new
`extension resync` line in `daemon.log`, window closed; exit 2 = pressed nothing on doubt), followed
by the stale-extension check. The user's keyboard is needed for a reload only when the script exits
non-zero.
**Why:** RELOAD-AUTO (commit 15320a6) proved it: every scripted reload was followed by `CHECK PASS`
and T5b's `OFFSCREEN` refusal in 2–3 ms; an independent verifier re-ran it; nothing else was pressed.
Granted by the user (#64).
**Instead of:** asking the user for every reload; a `chrome.runtime.reload()` bridge method (an
extension change — a Step 8 candidate, useful only once the loaded extension already has it).
**Revisit if:** Chrome changes the extensions page's accessibility tree, or the script ever exits 0
without the check passing.
**By:** Claude (on the user's grant #64)

### 2026-10-23 · The driver may reload the extension by UI automation, and restart Chrome with flags for the background-input test (#64)
**Decided:** The user grants two things that #33 kept with them: (1) the driver reloads Chrome Agent
Bridge itself by UI automation — in a `chrome://extensions` window the driver opens, it presses only
the reload button of the Chrome Agent Bridge card (no toggle, no remove, no Options, no token, no
other extension), then proves the reload with the stale-extension check; the procedure is worked out
by a dedicated step agent and written down as a reusable script and doc section; (2) Chrome may be
restarted with command-line flags to test focus emulation for background input (BG-1/BG-2), closed
gracefully (never killed) so the session restores, after Run 9.
**Why:** the user (2026-10-23): "I won't be available to reload, please figure out how to do it using
UI automation … It will be extremely valuable to figure out that procedure. Also to test cdp
emulation we may restart chrome with proper flags."
**Instead of:** stopping at G7-2 until the user can reload.
**Revisit if:** the automation ever presses anything but the one reload button, or a restart loses
the user's tabs.
**By:** user

### 2026-10-23 · T5b's three fixes (#63)
**Decided:** (1) A switch capture restores the window's previous tab at most once, when the capture
settles or at the 30 s chain bound, unless the window's active tab is no longer the target or
`focusTab` touched the window; the chain is released by 30 s without waiting on the restore.
(2) `screenshot {mode:"cdp"}` refuses before attaching the debugger: `WINDOW_MINIMIZED` for a
minimized window, `OFFSCREEN` for a background tab. (3) For a popup whose url is empty or
`about:blank`, the daemon polls `listTabs` every 100 ms for at most 2 s before sending
`leaseGranted`; the grant takes effect at once (F20). The switch-mode `WINDOW_MINIMIZED` message,
which still suggests `mode:"cdp"`, stays unchanged in Step 7 (its text is SCREEN-4's recorded
expectation); Step 8 rewrites it.
**Why:** Run 8 SCREEN-5, SCREEN-2/4, LEASE-3 (#62); refusing shows no banner and adds no unmeasured
timing constant; no wire change.
**Instead of:** a time bound on CDP capture; a new code `TAB_HIDDEN` (contract change); a url-update
event; delaying `tabCreated`; changing the message text after SCREEN-4 recorded it.
**Revisit if:** Chrome is measured to capture a hidden tab through CDP; a popup's url often takes
more than 2 s; a restore is seen undoing a human's choice (T5b verifier N1: after the 30 s release a
late restore can make the next capture show the human's tab).
**By:** Claude

### 2026-10-23 · The user rules on Run 8: fix stage T5b, then Run 9 (#62)
**Decided:** (1) SCREEN-1, SCREEN-3, SCREEN-5 and RESOLVER-1, which failed on defects in their own
pre-written checks (a pixel probe on label text and colour-managed captures; a DevTools window title
Chrome does not use), are re-run as Run 9 under corrected checks committed before any measurement;
Run 8 keeps its FAIL-as-written results. (2) NET-1, served from Chrome's cache in Run 8, is re-run in
Run 9 with the cache bypassed, expecting `12.8 KB`. (3) A fix stage T5b fixes three defects Run 8
found, with tests and a verifier, before Run 9: a timed-out capture restores the human's previous
tab; `screenshot {mode:"cdp"}` on a hidden or minimized tab refuses at once with a code (or is
bounded) instead of hanging to `TIMEOUT` (SCREEN-2); `leaseGranted.url` is filled rather than `""`
(LEASE-3). (4) BG-1/BG-2 (trusted input into a background tab answers `ok` and does nothing): Step 8
first adds a focus-emulation option and measures it, then decides its policy (`sdk/src/policy.ts`).
**Why:** the user's answers to the Run 8 questions.
**Instead of:** keeping the four rows as FAIL-as-written; accepting NET-1 as explained; deferring the
three fixes to Step 8; a "tab must be in front" policy without measuring focus emulation.
**Revisit if:** Run 9 fails again.
**By:** user

### 2026-10-22 · BG-1/BG-2's focus-emulation retry cannot run in this wave; T5.2 reports it unmet if they fail (#61)
**Decided:** No bridge method sends `Emulation.setFocusEmulationEnabled`, and a wave may not change
the extension. If BG-1 or BG-2 fails, the row records its text and "focus-emulation retry: not run",
and T5.2's retry clause is reported as NOT met in the gate checklist — not re-tuned, not waived. The
retry returns as a proposed decision for Step 8 (a CDP pass-through or a `focusEmulation` option for
trusted input). If both pass, nothing is affected.
**Why:** T5.2 is pre-registered; the honest record is "unmet", decided before the run.
**Instead of:** adding a method mid-wave, or dropping the clause.
**Revisit if:** Step 8 adds the option.
**By:** Claude

### 2026-10-22 · Which rows T5.3 counts as regression rows (#60)
**Decided:** T5.3 ("the regression rows pass with the same expected text as their last recorded
run") applies to rows whose behaviour Step 7 does not change by design. Rows whose expected text T4
updated with a dated note for a designed change (TAB-1…4, STAT-1, MUX-1/3, DL-1, NET-12 — the
handle/owner columns, `browser_select_tab` claiming, background `newTab`) are run against their
dated expected text and reported as such, not as regression rows. NET-1/MUX-9 stays a regression row
with `12.8 KB` (#56) and the `Network — active tab:` label.
**Why:** T4.4 and 0.8 change those outputs on purpose; the dated notes were written before any run,
and no recorded result was edited (T4 report).
**Instead of:** treating every earlier row as a byte-identical regression row, which designed
changes would fail.
**Revisit if:** a row's dated note turns out to be written after a run.
**By:** Claude

### 2026-10-22 · T4's MCP cursor and tool details (#59)
*Updated 2026-10-23 (Step 8 S5, #95): the revisit trigger "Step 8 adds `browser_use_active_tab`" is met, and the decision holds. An explicit `tab` still never moves the cursor; `browser_select_tab`, `browser_new_tab` and `browser_use_active_tab` move it, and only the last follows the human (it claims `{active:true}`). First-touch claim, lost-cursor notice and "not cleared by `TAB_GONE`" unchanged; `browser_status` shows the cursor and never claims.*
**Decided:** As in T4's report (`…-steps/T4.md` § Proposed decisions): an explicit `tab` never moves
the cursor (only `browser_select_tab`/`browser_new_tab` do); no `tab` → the cursor, or one shared
first-touch `tabs.claim {active:true}`; the cursor is lost on a 4002 `reconnected` and on a new
client, and the next untargeted result carries a one-line notice once; it is not cleared by
`TAB_GONE`/`tabGone`; `browser_select_tab`/`browser_close_tab` with no `tab` return an error without
calling anything; network tools keep "all"/"active" and drop the numeric form from the MCP schema
(handles replace Chrome ids, T4.3); an untargeted listing keeps the `Network — active tab:` label;
`browser_status` prints `Active tab: [T<n>] …` from `current`. The T4.2 fixtures run in one
global-realm JSDOM shared by the capture script and the test; the baseline is
`sdk/test/fixtures/baseline-51de800.json`, captured once and re-captured identically by the verifier.
**Why:** spec §6.5/§8.3 (the cursor does not follow the human), #43, #57, NET-1's regression text.
**Instead of:** an explicit `tab` moving the cursor; re-claiming the human's tab when the cursor's tab
closes; vitest's jsdom environment for the capture.
**Revisit if:** Step 8 adds `browser_use_active_tab`; a row shows an agent acting on an old handle
after a restart it was not told about.
**By:** Claude

### 2026-10-22 · T3's snapshot fields and capture rules (#58)
**Decided:** Snapshot elements (0.7): `depth` counts listed ancestors across open shadow roots and
frames; `frame` is the 1-based order of entered same-origin frames (absent at top level); `disabled`
only as `true`; `checked` for checkbox/radio/switch/menuitemcheckbox/menuitemradio; `expanded` from
`aria-expanded` or `<details open>`; `selected` from `<option>`/`aria-selected`; `href` resolved;
`value` for text inputs, textareas, spinbutton, slider and `<select>`, capped at 120 characters,
never for a password input; kinds tested by tag name. `activateForCapture`: the minimized check
first; the 500 ms capture slot reserved before the switch; one retry on Chrome's capture-quota error;
a per-window chain released when the restore settles or 30 s after it started; `fullPage` read as
truthy, exactly as the daemon's `takesLock` reads it (verifier V1: `fullPage: 1` switched tabs
without the lock). `selectTab` is the same handler as `focusTab`.
**Why:** T3's report; 0.7 named the fields but not their meaning; a password must not go on the
wire; Stage 0 F10/F19.
**Instead of:** DOM depth; a 0-based frame index; spacing measured between captures; an unbounded
chain; `fullPage === true`.
**Revisit if:** T4.2's byte-identical test needs another field meaning; SCREEN-3 sees a quota error
the retry cannot absorb; T3 verifier V4 (a timed-out capture's restore undoing a later `focusTab`)
shows up live.
**By:** Claude

### 2026-10-22 · T2's daemon details (#57)
**Decided:** The fourteen proposals of T2's report (`…-steps/T2.md` § Proposed decisions), in short:
`tabReplaced` onto a handled tab keeps the leased handle; `closeTab`/`selectTab`/`focusTab` with
neither `tab` nor `id` → `BAD_PARAMS "tab is required"` (no destructive default on the human's tab,
Stage 0 F4 — matches T1's extension); a no-proto extension gets `listTabs`/`newTab` and the free
methods forwarded as in Step 6 with no handles; the lease is re-checked and the handle re-resolved
after the lock wait; no `tabGone` to the client that closed the tab; network-scope details (explicit
`"active"` is not legacy; other strings are handles); F12's entry `tab` from `lastHandleOf`; the
`TAB_GONE`/`TAB_UNKNOWN`/`TAB_HELD {owner, since}`/`LOCK_TIMEOUT` texts with no URL in any message;
`tabs.claim` → `{tab}`, `tabs.release` → `{ok:true}`, `newTab`/`listTabs` keep the Chrome `id` beside
`tab` for the release; a replaced extension socket's events are ignored; a client gone during
`newTab`/`claim` is granted nothing; a deadline already passed → `TIMEOUT` without forwarding; the
F20 opener grant takes effect at once while only `leaseGranted` waits for in-flight `newTab` calls;
`networkClear` all fails closed on doubt.
**Why:** each is stricter or keeps Step 6 behaviour; T2's verifier passed them.
**Instead of:** the alternatives listed per item in T2's report.
**Revisit if:** the per-item triggers in T2's report; Step 8 S2 for the legacy forms.
**By:** Claude
*Updated 2026-10-22: #40 is amended — `networkClear` with the "all" scope is refused with
`TAB_HELD` whenever any other client holds any tab at the check, instead of only when that tab has
entries, because the probe-then-clear sequence could clear a held tab's entries in a race (T2 known
gap).*

### 2026-10-22 · NET-1's expected size follows the fixture to `12.8 KB` (#56)
**Decided:** T1's popup link grew `test-fixtures/e2e-playground.html` from 12 914 to 13 106 bytes, so
NET-1's expected `12.6 KB` becomes `12.8 KB` (13 106 / 1024 = 12.80). T5 writes the dated note in
`docs/e2e-test-plan.md` before the run.
**Why:** the size is the served `Content-Length` (#35); the fixture change was decided ("Step 7 T1
adds the fixture's "open popup" button"). Corrected from the byte count before any run, not from a
result.
**Instead of:** keeping `12.6 KB` and failing T5.3 on a planned fixture change.
**Revisit if:** the fixture changes again before T5.
**By:** Claude

### 2026-10-22 · T1's extension details (#55)
**Decided:** "No tab with id" from the extension is `TAB_UNKNOWN` (phase-doc 0.1); the daemon answers
`TAB_GONE` from its handle table. `listTabs` marks the human's tab with `current: true` (omitted
elsewhere); `active` keeps its per-window meaning. An unknown method gets `UNKNOWN_METHOD`
(message unchanged). Until T3, a viewport screenshot of an explicit background `tabId` is refused
rather than capturing another tab's pixels. `PAGE_ERROR.data` is `{name, stack?}` with `stack` capped
at 8 lines / 2000 characters. `describeDebuggerError` recognises our errors by `name ===
"BridgeError"` and a string `code`. The no-normal-window message lives in `errors.ts`, and T3.3 gains
`grep -nE "focused\s*:" extension/src/tabs.ts extension/src/errors.ts` → nothing (dated note).
**Why:** T1's report; each is additive or stricter, and every existing message text is unchanged.
**Instead of:** `TAB_GONE` from the extension; redefining `active`; `INTERNAL` for unknown methods;
capturing the visible tab for a background `tabId`.
**Revisit if:** T3 lands `activateForCapture` (removes the screenshot refusal); T4 wants
`current:false` on every tab.
**By:** Claude

### 2026-10-22 · A bare number in a network `tab` is a legacy Chrome id, not `BAD_PARAMS` (#54)
**Decided:** Amends #40. On the network methods a numeric `tab` (a Step 6 client's form) is resolved
to its handle and lease-checked exactly like `closeTab`/`selectTab` with an `id` under #41, forwarded
as numeric `tabId`, logged once per client with no URL; an unknown id → `TAB_UNKNOWN`. Step 8 S2
removes it with the rest of the legacy path.
**Why:** read literally, #40 would break a running Step 6 MCP's numeric network form, which #41
exists to prevent; the lease check keeps it as strict (T2 escalation item 4).
**Instead of:** `BAD_PARAMS` for any number.
**Revisit if:** Step 8 S2 lands.
**By:** Claude (contract-level, conservative rule; open for the user)
*Updated 2026-10-22 (T2 verifier V5): "lease-checked" applies to `networkClear` only;
`networkRequests` stays free for every client, as spec §6.3 says, with the numeric id resolved the
same way.*

### 2026-10-22 · `selectTab` takes the visibility lock, like `focusTab` (#53)
**Decided:** The daemon puts `selectTab` in the same lock class as `focusTab`.
**Why:** it is an alias of `focusTab` for one release ("selectTab stays as an alias of focusTab for
one release"); outside the lock it would change the screen under a capture. The stricter choice.
**Instead of:** leaving it out of the lock list because 0.4 names only `screenshot` and `focusTab`.
**Revisit if:** the alias is removed (Step 8 S2).
**By:** Claude

### 2026-10-22 · The daemon sends the network "all" scope as `scope`, and two Step 6 test fakes speak the new hello (#52)
**Decided:** (1) Because the daemon never forwards a `tab` key (T2.3), it sends the network "all" scope
as `{scope:"all"}`; T1's `resolveScope` reads it and still accepts the old `tab:"all"` from a Step 6
daemon. (2) Under #42 two Step 6 tests' fake extensions say v1: `daemon/test/multiplex.test.ts`'s
in-flight test sends a method outside the table instead of `snapshot` (assertions byte-identical,
dated note), and `mcp/test/extension-down.test.ts`'s fake (one-file grant to T2) sends
`role:"extension", proto:2` and answers `listTabs`; new tests pin `VERSION` for a v1 extension.
**Why:** T2's escalation: no stage owned the extension half of F3, and #42 (correctly) refuses the
fakes' v1 hello. The tests' intent and asserted text are unchanged.
**Instead of:** forwarding legacy calls on a v1 extension without resolving them (loosens a lease).
**Revisit if:** another Step 6 test needs an edit beyond its fake's hello.
**By:** Claude

### 2026-10-22 · v2 peers do not yet require `code` (#51)
**Decided:** `WireError.code` stays optional and `fromWire` still maps a missing, non-string or empty
code to `INTERNAL` — the D0 revisit ("Step 7 teaches the extension codes") answered with no change.
**Why:** no pre-stated rule tightens it; a stale extension's v1 `{message}` must still arrive (Stage 0
F22), and #42 already refuses such an extension for tab calls.
**Instead of:** rejecting a v2 error without `code`.
**Revisit if:** Step 8 removes the v1 and `activeTab()` fallbacks.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · T0's guard rules: strict on field types, lenient on extra fields (#50)
**Decided:** The five Step 7 event guards (`shared/src/protocol.ts`) require their fields present and
typed (tab ids by `Number.isInteger`), accept an absent or `undefined` optional field, reject `null`
or a wrong type, and accept unknown fields. No `isScreenshotMode` guard: the daemon locks unless
`mode === "cdp"` (or `fullPage`), so an unknown mode falls on the locking side. The content script's
`{__bridgeError}` shape (#38) stays inside `extension/`, not in `shared/`.
**Why:** the senders are our own code, so strictness surfaces bugs; JSON drops `undefined`, so
in-process frames and wire frames agree; extra fields are accepted as `isHello` does.
**Instead of:** `null` as absent; a mode guard; a shared error-marker type.
**Revisit if:** T1 must send `null`, or an unknown `mode` must be `BAD_PARAMS`.
**By:** Claude

### 2026-10-22 · `NetworkRequestsResult.text` is deprecated in T0 and removed in T4 (#49)
**Decided:** T0 makes `NetworkRequestsResult.text` optional and `@deprecated` instead of removing it;
T4 removes it once T3 stops producing it and the MCP formats the entries.
**Why:** removing it in T0 leaves every commit from T0 to T4 typecheck-red in `extension/` and
`mcp/`, which empties T1's and T2's "typecheck green" checks (T0.1 permits the red, T1.1 does not).
The end state is the plan's.
**Instead of:** removing `text` in T0 and reading later checks as "green except the T0 consumers".
**Revisit if:** a stage needs `text` gone earlier.
**By:** Claude
*Updated 2026-10-22: the optional field broke one line, `mcp/src/tools/registry.ts:282`; T0's lane
was extended by that one line, `return text(out ?? "");` (behaviour identical, T4 deletes it),
instead of keeping `text` required (T3 would hit the same line) or leaving typecheck red.*

### 2026-10-22 · Stage 0's check sharpenings and T5 PASS rules (#48)
**Decided:** The Stage 0 audit's F25 rewrites are added to the pre-registered exit checks as
stricter forms beside the originals: T1.4 (a column-1 grep for top-level `await` and the listeners),
T1.5 (no `console.*` call passes `p`, `params`, `tab`, `info` or `changeInfo`; the fallback warning
prints only the method name), T6.1 (`grep -n "Control targets" CLAUDE.md` returns nothing, since the
old grep could not fail), and T3.2's wording. F26's PASS rules for LEASE-2, LEASE-6, SCREEN-1,
SCREEN-2, SCREEN-4, BG-1…4 and the DevTools-focused resolver check are pre-registered now; T5 copies
them into its rows before the run and may only make them stricter. Dated notes in the phase doc.
**Why:** nothing has been measured yet, every change makes a check discriminating or stricter, and
T6.1 as written could not fail.
**Instead of:** leaving judgement checks and an unfailable grep, or letting T5 write PASS rules alone.
**Revisit if:** a sharpened check turns out to test something other than the original's intent.
**By:** Claude

### 2026-10-22 · T4.2's baseline is captured in a worktree of T3's parent commit (#47)
**Decided:** T4's builder captures the baseline snapshot text (`buildSnapshot`) and network text
(`formatEntries`) over the existing fixtures, once, in a git worktree of T3's parent commit, and
stores it under `sdk/test/fixtures/` with that commit id; T4's verifier repeats the capture and must
get the same bytes.
**Why:** no whole-text baseline exists, and T3 changes `buildSnapshot` first (Stage 0 F11).
**Instead of:** capturing from the new formatter (forbidden).
**Revisit if:** the capture cannot run in the worktree.
**By:** Claude

### 2026-10-22 · The formatters reach the MCP through a `@bridge/sdk/format` subpath (#46)
**Decided:** T4 adds a `./format` export to the SDK package for the moved formatters; `sdk/src/index.ts`
keeps its five exports, and Step 8 decides whether the formatters join it.
**Why:** the SDK's public surface is Step 8's (Stage 0 F23); a subpath can be removed or folded in
later without breaking the five exports.
**Instead of:** exporting the formatters from `index.ts` in Step 7.
**Revisit if:** a recipe needs the formatters before Step 8.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · LEASE-6 measures whether a discard keeps the tab id, with both outcomes pre-written (#45)
**Decided:** LEASE-6 records the tab id before and after a Memory-Saver discard. "Same id, no
`tabReplaced`" and "new id, `tabReplaced`" both PASS when the handle still works afterwards; the row
reports which happened.
**Why:** Chrome's docs say `tabs.onReplaced` fires for prerendering/instant, and Chromium's 2024
discard keeps the tab, so the plan's premise is probably false on Chrome 156 (Stage 0 F7; unconfirmed).
**Instead of:** the row as written, which would fail on a premise rather than on the bridge.
**Revisit if:** LEASE-6 shows a new id.
**By:** Claude

### 2026-10-22 · One deadline per call covers the lock wait and the forwarded call (#44)
**Decided:** The daemon sets `deadline = received + clamp(timeoutMs ?? 30000, 100, 600000)`. The
lock wait ends at the deadline with `LOCK_TIMEOUT {holder}`; the forwarded call then waits
`deadline − now + 5000`. The extension still gets no deadline, so the revisit trigger of "D2's daemon
details" does not fire.
**Why:** two separate waits would outlive the SDK client's own timer (Stage 0 F9).
**Instead of:** a fresh `daemonWaitMs` after the lock is taken.
**Revisit if:** the extension needs the caller's deadline.
**By:** Claude

### 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window (#43)
**Decided:** One resolver, `chrome.windows.getLastFocused({windowTypes:["normal"]})` → its active
tab, serves the 0.1 fallback, `listTabs`' active marker, `tabs.claim {active:true}`, the legacy path
of #41, `browser_status` and `browser_list_tabs`. With no normal window, the error names a DevTools or
popup window as the likely cause. Owners: T1 (resolver, marker, error), T2 (claim, legacy path), T4
(MCP), T5 (a pre-registered live check with the service-worker console focused: status and snapshot
name and act on the same tab). No E2E expected text changes (rows use an `[<id>]` placeholder).
**Why:** W1 proposal 3, accepted (#36); Stage 0 F8.
**Instead of:** `lastFocusedWindow:true` (fails under a focused DevTools window), or "first active tab
of any window".
**Revisit if:** a row shows a popup window chosen, or the DevTools-focused check fails.
**By:** Claude

### 2026-10-22 · A stale extension is refused for tab calls, detected by its hello (#42)
**Decided:** T1's extension hello adds `role:"extension", proto:2` (a Step 6 daemon accepts it —
Stage 0 probe P1). T2's daemon answers every tab-carrying method with `VERSION` and a reload hint when
the connected extension's hello had no `proto`.
**Why:** an extension that was not reloaded ignores `tabId` and acts on the active tab, past every
lease (Stage 0 F6); refusing is the stricter choice.
**Instead of:** relying on the `unknown method` text.
**Revisit if:** the extension's hello gains a build id.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · A Step 6 client keeps working against a Step 7 daemon for one release, without loosening a lease (#41)
**Decided:** (C) both of: (A) a daemon legacy path — a tab-carrying call with no `tab` (or
`closeTab`/`selectTab` with a Chrome `id`) is resolved to the human's tab (#43) or the id's handle,
lease-checked exactly as an explicit `tab`, takes the method's lock class unchanged, grants no lease,
is forwarded with a numeric `tabId`, and is logged once per client without a URL; and (B) build
discipline — no `npm run build` in the main tree between T2's and T4's commits; verifiers build in
clean worktrees. Step 8 S2 removes the legacy path with the extension's fallback. T2.4's
"`BAD_PARAMS "tab is required"`" clause is superseded by a dated note in the phase doc.
**Why:** the SDK's knock hashes `daemon/dist/index.js` on disk (`sdk/src/knock.ts`), so every running
Step 6 MCP — the user's own sessions — would adopt a freshly built Step 7 daemon and fail every tool
with `BAD_PARAMS` (Stage 0 F5; the verifier re-executed it). Existing tools keep behaving; no lease
is loosened; it is removable.
**Instead of:** (A) alone, (B) alone, or forwarding without `tabId` (loosens a lease; forbidden).
**Revisit if:** Step 8 S2 lands, or the user rules otherwise.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · The `tab` parameter keeps its "all"/"active" meanings for the network tools (#40)
**Decided:** On the network methods `tab` is a handle, `"all"`, or `"active"`/absent. A bare number
from a Step 7 client is `BAD_PARAMS`. `networkClear {tab:"all"}` is refused with `TAB_HELD` when
another client holds a tab that has entries.
**Why:** `tab` already means a scope on the wire and in the MCP schemas (Stage 0 F3); keeping it
keeps today's tools identical, and the `"all"` refusal keeps the lease strict.
**Instead of:** reading every `tab` as a handle, or renaming the scope parameter.
**Revisit if:** Step 8 redesigns the network tools.
**By:** Claude (contract-level, conservative rule; open for the user)
*Updated 2026-10-22: amended twice — a bare number is a legacy Chrome id (#54), and `networkClear`
"all" is refused while any other client holds any tab (#57's update).*

### 2026-10-22 · The daemon's method classes are one table, and the download methods are free (#39)
**Decided:** `route.ts` keeps every method in one table of classes (free, tab-carrying, intercepted,
lock-taking). `downloadStart`, `downloadChunk` and `downloadEnd` are free. `closeTab` is intercepted
and lease-checked and sits only in that class (verifier V8).
**Why:** without it `browser_download` breaks (Stage 0 F2).
**Instead of:** "no `tab` and not free → `BAD_PARAMS`" with the plan's free list.
**Revisit if:** a new extension method is added (it must enter the table).
**By:** Claude

### 2026-10-22 · Content-script failures are returned, not thrown, to carry `CODE:message` (#38)
**Decided:** Page functions return `{__bridgeError:"CODE:message"}`; `unwrapResult` turns it into a
`BridgeError` with that code, and still treats a null or undefined result as failure (`REF_STALE`).
**Why:** a thrown injected function resolves with `result: null` (CLAUDE.md gotcha), so a prefixed
thrown message never arrives (Stage 0 F1). The null-or-undefined invariant is kept.
**Instead of:** prefixing thrown messages, as phase-doc 0.6 says.
**Revisit if:** Chrome adds an `error` field to `InjectionResult`.
**By:** Claude

### 2026-10-22 · Step 7 agents run Opus 5.5 (#37)
**Decided:** Every Step 7 agent — the session agent, each step agent, every builder, verifier,
fixer and the propagator — runs Claude Opus 5.5 (`claude-opus-5-5`); every `Agent` call passes
`model: "opus"`. The only exception is the T5 wave's headless actor sessions (`claude -p`), which may
run Sonnet or Haiku, as W1's did.
**Why:** the Step 7 kickoff names it, continuing "Step 6 agents run Opus 5.5" and the user's W1
instruction to delegate to Opus subagents; the phase doc names no model.
**Instead of:** a cheaper model for builders or verifiers.
**Revisit if:** the user vetoes it.
**By:** Claude (default, flagged for veto)

