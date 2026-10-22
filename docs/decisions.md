# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title.

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

Six proposals from the Step 6 E2E wave (W1, 2026-10-22), with options, a recommendation and the
measurement, in `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` § "W1 as-built" →
"Proposed decisions — for the user":
1. ~~MUX-5 is accepted on its re-measurement~~ — *ruled by the user 2026-10-22, see "MUX-5 is
   accepted; its slowness is a later item" (#34) below.*
2. ~~NET-1's expected size is corrected to `12.6 KB`~~ — *investigated (#35), then ruled (#36).*
3. ~~Step 7 makes `browser_status` and the actions agree on the active tab~~ — *ruled (#36).*
4. ~~Step 8 checks which handles the spawned daemon inherits~~ — *ruled (#36).*
5. ~~DL-1's service-worker log line is accepted as not observed~~ — *ruled (#36).*
6. ~~Step 6 closes (gate G6-2) once 1 and 2 are accepted~~ — *ruled (#36): Step 6 is closed.*

None open now. *Updated 2026-10-22: all six W1 proposals are ruled.*

Step 7 (2026-10-22 on):
1. "Step 7 agents run Opus 5.5" (#37) — a default the user has not ruled; open for veto.
2. "The `tab` parameter keeps its "all"/"active" meanings for the network tools" (#40).
3. "A Step 6 client keeps working against a Step 7 daemon for one release, without loosening a
   lease" (#41).
4. "A stale extension is refused for tab calls, detected by its hello" (#42).
5. "The formatters reach the MCP through a `@bridge/sdk/format` subpath" (#46).
6. "v2 peers do not yet require `code`" (#51).
7. "A bare number in a network `tab` is a legacy Chrome id, not `BAD_PARAMS`" (#54).

Items 2–5 are contract-level, taken by the conservative rule from the Stage 0 audit
(`docs/plans/2026-10-21-step7-multi-actor-tabs-steps/stage0-audit.md`); the run continues on them.

*Updated 2026-10-22: before W1 this read "None" — the seven Step 6 decisions listed here (#13, #14,
#15, #21, #22, #24, #27) were ratified by the user, see "The user rules on the seven Step 6 open
decisions" below.*

## Log

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

### 2026-10-22 · The user rules on the W1 proposals (#36)
**Decided:** The remaining W1 proposals are accepted as recommended. NET-1's expected text becomes
`12.6 KB` (dated correction in the MUX-9 row and a note under Run 6), and `.gitattributes` pins
`test-fixtures/*.html` to LF so a checkout cannot change the size again. Step 7's Stage 0 makes
`browser_status`, `listTabs`' `active` flag and the action tools agree on the active tab, with an
error that names the cause. Step 8 checks which handles a spawned daemon inherits (a pipe test, then
spawn with nothing inherited if confirmed). DL-1's `[bridge] download held 69 bytes` is accepted as
not observed. With MUX-5 (#34) this meets every exit check: **Step 6 is closed (gate G6-2).**
**Why:** the NET-1 cause was proven by measurement (#35); the other three are small, owned by later
steps, and do not touch what Step 6 delivers.
**Instead of:** re-running NET-1 on a CRLF checkout; keeping Step 6 open.
**Revisit if:** a later run shows a size that differs from the response's `Content-Length`.
**By:** user

### 2026-10-22 · NET-1's `12.9 KB` came from a CRLF copy of the fixture, proven by a live probe (#35)
**Decided:** The size gap is explained, not a bridge fault. The same playground served twice through
the bridge on 2026-10-22 gave `12.6 KB` for the LF file (12 914 bytes, `Content-Length 12914`) and
`12.9 KB` for a CRLF copy (13 168 bytes, `Content-Length 13168`); the network log prints the
server's `Content-Length` (`extension/src/network-log.ts`). No committed version of the fixture fits
`12.9 KB` in LF (the earlier ones are 10–10.7 KB), so Run 6 was served a CRLF working copy
(`core.autocrlf=true` writes CRLF on checkout). Nothing was partial: W1's loads were complete and
its downloads hash-exact. The correction and an LF pin for the fixtures were then accepted
(#36).
**Why:** the user asked for the cause before accepting a changed expectation ("partial downloads
sounds like something that will bring trouble").
**Instead of:** correcting the row on a cause that only fitted the numbers.
**Revisit if:** the fixture changes or a size differs from `Content-Length` again.
**By:** Claude (measured; the investigation was the user's ruling)

### 2026-10-22 · MUX-5 is accepted; its slowness is a later item (#34)
**Decided:** MUX-5 (handover to a new build, the MCP follows) passes on its re-measurement. Its
first run's snapshot failed on a focused DevTools window; the re-measurement got a snapshot 16.9 s
after the handover against the row's 15 s. Investigating that latency (and the active-tab
mismatch behind the first failure) is a future improvement item, not a priority now.
**Why:** the user's priority is getting the new system running; the behaviour MUX-5 measures
(#22, #23, #24) worked in every run.
**Instead of:** re-running MUX-5 by hand before Step 7.
**Revisit if:** an action fails right after a 4002 reconnect in real use.
**By:** user

### 2026-10-22 · Live E2E waves are run by Claude end to end (#33)
**Decided:** From now on Claude runs live E2E waves autonomously: it starts and prompts its own
Claude sessions (headless `claude -p`, Sonnet or Haiku for simple tool-call prompts), runs
PowerShell windows, opens and closes Chrome, captures Chrome's window for banner checks, and
delegates side work to Opus subagents. The steps a wave sheet tags [UI] or [USER] are the driver's
unless they need a decision only the user can make. The limits stay: no token printed, nothing
pushed, no extension change or reload, kills only of identified PIDs after `Test-SafeToKill`.
**Why:** the user ran W1's first eight rows by relaying steps remotely and asked mid-wave for the
rest, and every future wave, to run this way ("I fully trust you").
**Instead of:** the user doing every [UI]/[USER] step at the keyboard.
**Revisit if:** an autonomous run disturbs the user's own Chrome work or misjudges a row a person
would have caught.
**By:** user

### 2026-10-22 · W1's set-up: the driver has no bridge MCP, the token moves from the MCP config into `bridge.token` (#32)
**Decided:** For wave W1 the driver session was relaunched with `--strict-mcp-config` and an empty
MCP config, so it was not a bridge client (caution A1). The token already in the MCP entry's `env`
was copied into `bridge.token` by a script that printed only its length, and the `env` block
(`BRIDGE_TOKEN`, `BRIDGE_PORT`) was removed from `~/.claude.json` by script; the extension's
Options already held that token, so nothing was pasted.
**Why:** a driver with the bridge MCP would have changed every client count and made MUX-4, MUX-6
and MUX-7 impossible; Windows clipboard history was on, so pasting a fresh token would have left it
in the history.
**Instead of:** the A1 fallback (skip MUX-4, 6, 7), and a fresh token pasted into the Options
(§1 item 8).
**Revisit if:** the token must be rotated — then generate a new one into `bridge.token` and type it
into the Options from Notepad.
**By:** user

### 2026-10-22 · The user rules on the seven Step 6 open decisions (#31)
**Decided:** Every decision proposed in `docs/plans/2026-10-22-step6-open-decisions-review.md` is
ratified as built: #13 option A, #15 A, #21 A, #22 A, #24 A, #27 A, each with its revisit rule.
Two rulings add to the proposal:
- **#13 (no welcome → `VERSION`):** no work goes into coexisting with a pre-Step-6 bridge. Every
  machine is upgraded (`docs/setup.md` §3 "Upgrading a machine that ran the bridge before Step 6"),
  and the 2 s welcome timeout is dropped when its revisit rule fires (after Step 8).
- **#14 (the detached daemon):** keep the spawn (A) and measure it in MUX-7. If MUX-7 fails — the
  daemon dies in a case where the row expects it alive ((b) a normal session end, (c) the shim
  killed alone, (d) a tree kill of a session that did not spawn it) — the double spawn through a
  short-lived launcher (B) is built, as a prerequisite item of Step 7. It is no longer left to the
  user's call.

The user also ratifies every decision Claude took under delegated authority on 2026-10-22 (#16–#20,
#23, #25, #26, #28–#30).
**Why:** The user's review of the open decisions, 2026-10-22.
**Instead of:** The other options in the review doc.
**Revisit if:** As in each entry; #14 when the D6 wave runs MUX-7.
**By:** user

### 2026-10-22 · The D6 wave's set-up: token from `bridge.token`, a quiet recipe, a dist-comment rebuild, a local redirect fixture, tagged steps (#30)
**Decided:** The wave provides the token only through a `bridge.token` file created by a command
that prints nothing, with `BRIDGE_TOKEN` unset. `recipes/hello.ts` prints tab ids and titles, never
URLs, and re-checks its connection after the hold. MUX-5 changes the build by appending a comment
to `daemon/dist/index.js` (the SDK has no "upgraded daemon" message, so the row judges the build,
the new pid and the log). DL-2's cross-origin redirect comes from a stdlib fixture
(`test-fixtures/redirect_server.py`) bound to `127.0.0.1:8081`. Every wave step is tagged [UI]
(UI automation), [SH] (an agent's shell) or [USER], with ten cautions where automation would
disturb a measurement.
**Why:** One token source keeps the D6.3 log grep meaningful and the token off every screen; the
user said on 2026-10-22 that the E2E tests may use UI automation; the rest are the cheapest
discriminating set-ups (`D6.md`, `D6-verifier.md`).
**Instead of:** `BRIDGE_TOKEN` in the environment; a real rebuild for MUX-5; a third-party redirect
host.
**Revisit if:** Chrome's Local Network Access prompts on the request to `127.0.0.1:8081`, or the
fixture's `text/plain` type differs in real Chrome (both unmeasured until the wave).
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · setup.md documents stopping the daemon by killing its process, with no stop script (#29)
**Decided:** `setup.md` documents the idle exit and the OS commands that stop the daemon (Windows:
stop the process listening on 9234; Linux/macOS: `pkill -f daemon/dist/index.js`, with a note for
`BRIDGE_DAEMON` paths), warns that an open MCP starts a new daemon 5 s later, and offers no
`daemon.shutdown` recipe as a stop command.
**Why:** No stop command exists, and `daemon.shutdown` closes clients with 4002, which SDK clients
treat as "reconnect", so it may spawn a new daemon at once (`D7.md`).
**Instead of:** An untested tsx snippet calling `daemon.shutdown`.
**Revisit if:** Step 8 adds a stop command to the SDK.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D5b's shape: `requireExtension: false`, a `connectOptions()` helper, a test-only daemon import (#28)
**Decided:** The option of decision #27 is `connect({ requireExtension?: boolean })`, default
`true`. `false` resolves on the welcome whatever the extension's state, with no wait timer, and
ignores `waitForExtensionMs`; the client stays open and `extensionConnected` follows
`extensionStatus`. The MCP builds its options in `mcp/src/config.ts` `connectOptions()` →
`{name, requireExtension: false}`. The new MCP test imports `daemon/src` by relative path, so the
`NOT_CONNECTED` text, welcome and `daemon.status` come from the daemon itself; the mcp bundle holds
no daemon code.
**Why:** An explicit boolean reads better than overloading `waitForExtensionMs: 0`, whose "wait
0 ms then fail" reading is the opposite. Measured: with the extension down a tool call fails in
0–1 ms with the `1a92d95` text and the client stays; once the extension connects the next call
succeeds on the same client (`D5b-verifier.md`, real `ws` on port 0).
**Instead of:** `waitForExtensionMs: 0`; inline options in `index.ts`; a fake copy of the daemon.
**Revisit if:** Step 8's SDK surface review (the option is listed under #27 for user review).
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The MCP connects without waiting for the extension, so Chrome closed reads as today (#27)
**Decided:** A follow-up stage D5b adds a `connect()` option that returns the client even when
the welcome says the extension is down (no 15 s wait, no `NOT_CONNECTED`), and the MCP uses it.
With Chrome closed, `browser_status` then reports the daemon connected and the extension not
connected, tool calls get the daemon's immediate `NOT_CONNECTED` with today's text, and the client
does not churn. Scripts keep the default 15 s wait (MUX-8 unchanged).
**Why:** As built in D5, Chrome closed made `browser_status` say "Daemon: not connected" although
the daemon was up, tools said "connecting…" for ~15 s, and the MCP opened and closed a daemon
client every ~20 s (`D5.md` §5). Long-run §3's conservative rule for a contract choice with no
pre-stated rule is the option that keeps every existing tool behaving as before; the option is
additive and undoable.
**Instead of:** Accepting the churn for Step 6 (D5's proposal); a shorter wait (the SDK closes the
client when any wait expires).
**Revisit if:** Step 8's SDK surface review settles the option's final name or shape.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D5's MCP link: a `client.connect()` health check, a thin config, interim exports gone (#26)
**Decided:** `mcp/src/link.ts` (`BridgeLink`) checks the client it holds with `client.connect()`
every 5 s and after any `NOT_CONNECTED` call; that resolves at once with no wire traffic on an open
client and rejects with the failure on a client closed by any code but 4002, after which the MCP
stores the message, drops the client and runs a fresh `connect()` on the 5 s chain; attempts never
overlap. `mcp/src/config.ts` keeps only `actorName(pid)`; `connect()` resolves token and port.
`daemon/package.json` loses its interim `exports` block; `mcp` declares `ws` (external in the
bundle); `validateHello` stays (a test pins it).
**Why:** Decision #15 asks for exactly this; the SDK's public surface has no failure event and D5's
lane excluded `sdk/`. Measured: the fresh `connect()` ran 4993 ms after a 1001 close; a 4002
reconnect left the client in place (`D5-verifier.md`).
**Instead of:** Exporting the SDK's internal `onClientFailure`; polling with `status()` (a message
every 5 s); keeping the interim daemon exports.
**Revisit if:** Step 8 adds a public close or failure event, or reconnect.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D3's daemon lifecycle: idle armed at start, every shutdown exits 0, bad env values, the log policy (#25)
**Decided:** The idle timer is armed at start (zero clients) and counts clients only. Signals
(SIGINT/SIGTERM/SIGBREAK), idle and `daemon.shutdown` all run `host.shutdown(…)` and exit 0 through
a `WsHost` `onShutdown` hook. Exit 1 for a bad `BRIDGE_PORT`, a missing token, an unhashable entry,
any listen error other than `EADDRINUSE` (exit 0, one `listen()`), or an uncaught error. A bad or
over-2³¹−1 `BRIDGE_DAEMON_IDLE_MS` is logged and replaced by 600000. The log at
`~/.chrome-agent-bridge/daemon.log` is cut to its last 1 MiB on start; a line containing `://` or
the token is withheld whole; a log that cannot be written is skipped silently, never stdout.
**Why:** A spawned daemon nobody connects to must still go away; exit 0 marks every intended end,
including losing the bind race (the bind is the lock, spec §9.3); setTimeout fires at once above
2³¹−1, which made the daemon exit after 1 ms before the fix (`D3-verifier.md`). The daemon has no
stdio, so it cannot report a log failure anywhere else.
**Instead of:** Arming idle only after the first client leaves; exit 1 on a bad idle value;
redacting inside a line rather than withholding it.
**Revisit if:** A lost bind race is seen to drop a log line (the loser truncates before it binds);
D6 shows the daemon idling out under a spawn that never connected.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · BridgeClient exposes welcome, extensionConnected and on("reconnected") in Step 6 (#24)
**Decided:** Beyond the D4 checkbox, `BridgeClient` has read-only `welcome` and `extensionConnected`
getters and an `on("reconnected", cb)` listener. `sdk/src/index.ts` still exports exactly the five
D4.3 values.
**Why:** `connect()`'s extension wait needs both getters; `on("reconnected")` is the hook decision
#11 asks Step 6 to leave for the Step 7/8 cursor clear. Additive and undoable; Step 8 owns the final
surface.
**Instead of:** Package-internal accessors that D5 and Step 7 would have to reach into.
**Revisit if:** Step 8's SDK surface review.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The knock's 10 s budget runs per spawn cycle, with a handshake timeout per attempt (#23)
**Decided:** The 10 s limit restarts at the client's own handover; the knock spawns once per cycle;
each `tryConnect` gets the remaining budget (floor 100 ms) as its WebSocket handshake timeout
(`ETIMEDOUT`, no spawn).
**Why:** The handover starts a new spawn cycle in 0.7's diagram; repeated spawns only lose the bind
race; a port holder that accepts TCP and never upgrades kept `connect()` pending past 14 s before
the handshake timeout existed (`D4-verifier.md`). The 10 s limit itself is unchanged.
**Instead of:** One 10 s budget for the whole `connect()`; a spawn per refusal; no handshake timeout.
**Revisit if:** D6 sees a handover take longer than 10 s, or a spawned daemon dying silently.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · A reconnect after 4002 never hands the daemon over (#22)
**Decided:** `BridgeClient`'s 4002 reconnect runs the knock with the handover disabled: a build
mismatch there rejects with `VERSION` naming both builds (spawning on a refused port is still
allowed). After a client's own handover, an old build still answering at the deadline also rejects
with `VERSION`.
**Why:** Decision #10 caps handovers per `connect()`, but every 4002 reconnect is a fresh knock, so
two clients on different builds could still hand the daemon back and forth; the D4 verifier
simulated two handovers. Failing beats looping (`handover-race.test.ts` pins ≤ 1 shutdown).
**Instead of:** Letting each reconnect hand over once — the letter of #10, not its purpose.
**Revisit if:** D6 shows a legitimate upgrade that needs a reconnecting client to hand over (a
long-running MCP after `npm run build` with the old daemon still alive).
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The SDK reports configuration and connection failures as NOT_CONNECTED (#21)
**Decided:** A missing token, a missing daemon build, a bad `BRIDGE_PORT`, the 10 s give-up and a
close 4001 reject with `NOT_CONNECTED`, each message naming its cause and never the token. `VERSION`
is kept for build or protocol mismatches and the missing welcome.
**Why:** Spec §10's 22 codes have no configuration or authentication code, and adding one is a spec
change. `NOT_CONNECTED` is what the MCP's 5 s retry already treats as "not reachable yet".
**Instead of:** `BAD_PARAMS` (meant for a method's params); `VERSION` for 4001; a new code.
**Revisit if:** Step 8 adds an authentication or configuration code to spec §10.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D2's daemon details: parseHello beside validateHello, BAD_PARAMS for bad ids, no forwarded timeoutMs, interim defaults (#20)
**Decided:** `parseHello(data, token)` returns `{ok, role, name?, build?}` or `{ok:false, reason}`;
`validateHello` stays a wrapper returning `{ok:true}`. A client request with a numeric or empty id
gets `BAD_PARAMS` with the id echoed; a frame with no id is dropped and counted. The frame forwarded
to the extension stays `{id, method, params}`: the clamped wait is daemon-side only. `WsHost` takes
`build` as an option (default `"dev"` until D3 passes the hash); an unnamed client is listed as
`"unnamed"`; client ids are `c<n>`, never reused in a process. An unknown role closes 4001 with the
reason "unknown role", checked after the token, echoing no field value.
**Why:** An existing test pins `validateHello`'s `{ok:true}` and existing tests stay unedited; a
client sending `id: 1` would otherwise hang to its own timeout (stage0-audit B8); decision 0.2 keeps
routing dumb and the v1 extension ignores the field; D3 owns the hash. Evidence: `D2.md`,
`D2-verifier.md` (385 tests; 63 new tests fail with `daemon/src` reverted).
**Instead of:** Editing the pinned test; dropping non-string ids silently; copying `timeoutMs` onto
the forwarded request; the generic "expected hello handshake" for an unknown role.
**Revisit if:** D5 removes the last `validateHello` caller; the SDK ever sends numeric ids; Step 7's
extension wants the envelope timeout; a real daemon ever reports build `"dev"`.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D1's interim wiring: daemon skipped by the build until D3, a `./connection` export, a hand-edited lockfile (#19)
**Decided:** The root build is `npm run build --workspaces --if-present`, so `daemon/` (no build
script until D3) is skipped; D3 adds one. Until D5, `@bridge/mcp` depends on `@bridge/daemon`,
which exports `./bridge`, `./connection`, `./wsHost` and `./startup`; `./connection` exists only for
a dynamic import in `tools.test.ts`. The builder removed a stale extraneous `"server"` entry from
`package-lock.json` by hand; `npm ci` accepts the file and `npm install --package-lock-only` leaves
it unchanged.
**Why:** Keeps D1 a pure move (322 tests before and after, `D1.md`, `D1-verifier.md`) without
inventing a daemon entry before D3 designs it.
**Instead of:** A placeholder daemon build; importing the connection by relative path across
packages; regenerating the whole lockfile.
**Revisit if:** D5 leaves any of the interim exports or the `mcp` → `daemon` dependency in place.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D0's protocol shapes: optional wire code, strict v2 hello fields, events without id (#18)
**Decided:** The wire error is `WireError {code?, message, data?}`; `fromWire` maps a missing,
non-string or empty code to `INTERNAL` and keeps any other non-empty string. `isHello` rejects a
hello whose `role`/`name`/`build`/`proto` is present but mistyped (`role` ∈ extension|client,
`proto` any number so a future version reaches `VERSION` handling). `isEvent` requires a string
`event`, a non-null `params` object and no `id`. `shared/package.json` exports `./codes` and
`./error`, and `protocol.ts` re-exports both.
**Why:** Decision 0.4 already says a v1 `{message}` error becomes `INTERNAL`, so the optional code
is the pre-stated rule, not a new contract; the strict hello matches D2's "unknown role → 4001"
and leaves the v1 `{type, token}` hello untouched; spec §10 writes events as `{event, params}`.
Evidence: `D0.md`, `D0-verifier.md` (322 tests, extension bundle byte-identical).
**Instead of:** A required `code` (wrong for v1 traffic); accepting any extra hello fields;
optional event `params`; subpath-only exports.
**Revisit if:** Step 7 teaches the extension codes (then v2 peers may require `code`); a bundle
holds two copies of `BridgeError` and `instanceof` breaks.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · Stage order D0 → D1 → (D2 ∥ D4) → D3 → D5, and the Stage 0 builder resolutions (#17)
**Decided:** D0 runs before D1 rather than beside it, and D4 lands before D3 so the daemon imports
the real `sdk/src/token.ts` (behind a `./token` subpath export) instead of a stub. D1 moves
`server/src/index.ts` to `mcp/src/index.ts` unchanged, with a temporary `mcp` → `@bridge/daemon`
dependency removed in D5; `daemon/` has no entry or build until D3. `startup.ts` and its 5 tests
are deleted in D5 as a documented removal. The SDK finds `daemon/dist/index.js` from the workspace
root (the `bridge.token` walk-up), `BRIDGE_DAEMON` overrides it, and a missing file rejects before
the knock. Timeouts: the daemon waits `clamp(timeoutMs ?? 30000) + 5000`, `BridgeClient` 1 s more,
the MCP call sites unchanged. Any `daemon.*` method other than `status`/`shutdown` answers
`UNKNOWN_METHOD`, never forwarded. The three `browser_status` tests are a planned output change,
replaced one for one. New `shared` modules go through `shared/package.json` `exports`; `tsx`
becomes a root devDependency in D1; every client must agree on `BRIDGE_PORT` (documented).
**Why:** Each closes a gap the Stage 0 audit found a builder would otherwise fill alone
(`stage0-audit.md` F2, F4–F7, F18–F20, F22–F24). D0 first keeps D1's "test count unchanged" check
clean; D4 before D3 removes a stub D5 would have to unwire.
**Instead of:** D0 ∥ D1 and D3 before D4 as the kickoff sketched; `../daemon/dist` relative to
`import.meta.url` (wrong once bundled).
**Revisit if:** A stage verifier finds one of these conflicts with the spec.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · Stage 0's amendments A5–A12 applied to the phase doc (#16)
**Decided:** The held amendments are applied with dated notes: D1 runs `npm install` (A5); D5.5
names the `e2e-test-plan.md` lines and rows CONN-3/CONN-7 (A6); D7.1's grep adds the
"one session" variants (A7); D0.4 covers only tests of new behaviour, reverted with
`git stash push -u -- shared/` (A8); D5.1 becomes "≥ before − 5" for the deleted
`startup.test.ts` (A9); D3.5's grep adds `startWsHost` (A10); the D7 `setup.md` item states the
token precedence, env over file, closing the W0 item (A11); D5.4 expects an empty `lifecycle.ts`
diff because the shutdown callback lives in `mcp/src/index.ts` (A12).
**Why:** As written each check either could not hold or missed its target (evidence in
`stage0-audit.md`). The test-count drop is a documented removal, which the integrity floor allows.
None loosens a check: A12 is stricter, A7 and A10 widen greps.
**Instead of:** Leaving the checks as written and tripping STOP rules mid-stage.
**Revisit if:** —
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · What clients do on a close code other than 4002 (#15)
**Decided:** `host.shutdown(code)` stops accepting, sends `close(code, reason)` to every socket,
waits up to 1 s, then `terminate()`s. `BridgeClient` reconnects on 4002 only. When an established
connection closes with any other code, the MCP stores the reason and calls a fresh `connect()` on
its existing 5 s retry; a script gets an error.
**Why:** Close codes are contract-level and the plan left the MCP's behaviour after a drop open
(`stage0-audit.md` F8). Today's `WsHost.close()` terminates, which clients see as 1006. The MCP's
no-crash rule already implies it keeps trying; scripts must not silently continue on another daemon.
**Instead of:** Leaving the MCP after a drop unspecified; letting `BridgeClient` reconnect on more
codes (a forbidden fix).
**Revisit if:** Step 8's SDK surface adds reconnect.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The detached daemon's survival depends on how the session's MCP is killed (#14)
**Decided:** Keep decision 0.8's spawn as written. MUX-7 names the kill method and expected result
for `taskkill /T /F` on a live MCP tree, a normal session end, and killing the nvm shim alone, and
D6 adds "end the spawning session normally → the daemon is still alive". If the daemon dies on a
normal end, the fallback is a double spawn through a short-lived launcher, the user's call. POSIX
stays unverified. *Superseded 2026-10-22 ("the user's call"): if MUX-7 fails, the double spawn is
built as a Step 7 prerequisite (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions).*
**Why:** Measured in Stage 0 (`stage0-audit.md` F3): on Windows a `detached` child keeps its
`ParentProcessId`, so `taskkill /T` on a live spawner kills it; a child whose spawner already
exited survives. Whether Claude Code ends MCP servers that way was not established. Changing 0.8
now would change the design of record without evidence.
**Instead of:** Switching to a double spawn now.
**Revisit if:** D6 shows the daemon dying when the session that spawned it ends.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · A Step 6 client gives up with VERSION when no welcome arrives (#13)
**Decided:** After `hello`, the SDK's knock waits at most 2 s for `welcome`. If none arrives it
closes the socket and rejects with `VERSION`, naming the cause: a pre-Step-6 bridge server holds the
port, end the old session. It never spawns or hands over in that case. `setup.md` says "end every
pre-Step-6 session first".
**Why:** Measured in Stage 0 on port 0 (`stage0-audit.md` F1): a v1 `WsHost` takes a v2 hello as
the extension, replaces the real extension's slot, routes the old session's calls to the client and
never answers. Without a bound `connect()` hangs. The old session is left broken either way, so the
docs tell the user to end it; pre-Step-6 servers already exit with their session.
**Instead of:** Leaving 0.7 without a "connected but no welcome" branch; probing without a hello
(v1 and v2 both send nothing first, so a probe cannot tell them apart).
**Revisit if:** v1 servers can no longer exist (after Step 8). *Added 2026-10-22: the user rules
that no work goes into coexisting with a pre-Step-6 bridge; every machine is upgraded (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions).*
**By:** Claude (ratified 2026-10-22)

### 2026-10-21 · Step 6 agents run Opus 5.5 (#12)
**Decided:** Every agent in the Step 6 run — session agent, step agents, builders, verifiers,
fixers, the propagator — runs `claude-opus-5-5`. The kickoff states it once and every brief
repeats it.
**Why:** The research repos pin Opus for their long runs and the user wants the same tier here;
one model across the tree keeps reports comparable.
**Instead of:** Fable 5.1 everywhere (the model this wave ran on), or Fable for the session agent
and Opus below.
**Revisit if:** A Step 6 stage report shows the model struggling with the `ws`-level tests; then
Step 7's kickoff may name another model.
**By:** user

### 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon restart (#11)
**Decided:** Handles are not persisted (Step 7 plan 0.2), so after a close 4002 reconnect
`BridgeClient` drops its cursor. A script then gets `NO_CURSOR` ("call newTab() or claim() first").
The MCP treats a missing cursor exactly like first touch: it claims the human's active tab and
prefixes the next tool result with one line saying the daemon restarted and which handle it now
holds. A stale handle passed explicitly as `tab` still returns `TAB_UNKNOWN`.
**Why:** The actor is told what happened and lands on a usable tab; nothing silently continues on
a handle that now names a different tab.
**Instead of:** Reporting `TAB_UNKNOWN` and asking the user which tab (blocks a script that could
recover); persisting handles across restarts (rejected in Step 7 plan 0.2).
**Revisit if:** A handover mid-session is seen to land the MCP on the wrong tab in the Step 7 or
Step 8 E2E wave.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · One daemon handover per connect(), then a VERSION error (#10)
**Decided:** The SDK's knock state machine (Step 6 D4) hands the daemon over at most once per
`connect()`. If the build still mismatches after its own handover, `connect()` rejects with the
spec's `VERSION` code, naming both builds. Documented rule: every client on a machine points at one
daemon build; `BRIDGE_DAEMON` is a development override, not a per-client setting.
**Why:** Two clients with different `BRIDGE_DAEMON` paths would otherwise hand the daemon back and
forth forever. Failing loud once is cheaper than any arbitration.
**Instead of:** Recording it as a known limitation only (the loop would be found live, in the D6
wave); "newest file wins" by comparing file times (needs the daemon to report its path; more
surface for a development-only case).
**Revisit if:** A real workflow needs two daemon builds side by side.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes (#9)
**Decided:** The Step 8 docs stage records that Step 8 closes the roadmap's Phase F items
"element-visible `wait_for`" and "return a `[ref=eN]` for a `kind:"node"` result". The item
"`args` for `browser_evaluate`" stays open in Phase F; nothing in Step 8 adds it.
**Why:** The plan said "args-less evaluate data", which is not a roadmap item; the roadmap must
name only what the step delivers.
**Instead of:** Adding `args` to Step 8's scope (not in the design spec).
**Revisit if:** A recipe needs to pass data into `evaluate` without string escaping.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 7 T1's `activeTab()` count is 4 in actions.ts, 13 across handlers (#8)
**Decided:** The Step 7 plan's `actions.ts ×5` is corrected to `×4` (lines 6, 12, 39, 85 of
`extension/src/handlers/actions.ts`); the total across `extension/src/handlers/` is 13, as the
plan's verifier focus already states.
**Why:** Re-counted with `grep -rn "activeTab()" extension/src/handlers` on commit `e60a83a`.
**Instead of:** Leaving it for the Step 7 audit (a wrong count in a checkbox misleads a builder).
**Revisit if:** A handler gains or loses an `activeTab()` call before Step 7 starts.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 8 SDK-4 waits for the fixture's delayed text with a {text} locator (#7)
**Decided:** Row SDK-4 uses `waitFor({locator: {text: …}})` on the message that
`#load-later` ("Load message in 1.5s") makes appear, and tests `state: "hidden"` by removing that
element with `evaluate`. The fixture is not changed for it.
**Why:** The fixture has no delayed button; the `{text}` locator variant has no other E2E row.
**Instead of:** Adding a delayed button to `test-fixtures/e2e-playground.html` in Step 8 S2.
**Revisit if:** The fixture gains a delayed control for another reason.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 7 T1 adds the fixture's "open popup" button (#6)
**Decided:** The `target="_blank"` button that row LEASE-3 needs is added to
`test-fixtures/e2e-playground.html` in Step 7 stage T1, whose lane gains `test-fixtures/`.
**Why:** T1 adds the `tabCreated {openerTabId}` event the button exercises, so the row's fixture
and its mechanism land together.
**Instead of:** T3 (the later extension stage) or T5 (changing the fixture during wave prep).
**Revisit if:** T1 is split or re-ordered in Step 7's Stage-0 audit.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 6 writes the DL rows for browser_download before its D6 wave (#5)
**Decided:** `docs/e2e-test-plan.md` gains a `DL` family: DL-1 (a plain download saved to disk
with the profile's cookies, sha256 reported) and DL-2 (a cross-origin redirect followed by the
service-worker fetch). The Step 6 autonomous run writes them, expected text first, alongside the
MUX rows, and the `DL-1` cites in the Step 6, 7 and 8 regression lists stay.
**Why:** `browser_download` (commit `eec05a0`) has never had an E2E row, and three plans already
cite one.
**Instead of:** Writing the rows in this wave (the wave has no code or fixture scope); dropping
the cite (download would stay untested live).
**Revisit if:** D6's wave shows DL-2 needs a fixture the public repo cannot hold.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Stage D2 emits the extensionStatus event (#4)
**Decided:** Step 6 stage D2 owns the daemon-side emit of `extensionStatus {connected: true}` to
every client when the extension hello arrives (and `{connected: false}` when it leaves). It is a
checkbox in D2 (this item takes the plan's checkbox count from 43 to 44; the DL-rows item below
makes it 45) and exit check D2.7 tests it.
**Why:** D4's `waitForExtensionMs` and Step 7 T2 both rely on it, and a work item that is only an
exit check can be missed by a builder.
**Instead of:** A note under D2 pointing at D2.7; moving the emit to D4 (crosses the `daemon/`
lane).
**Revisit if:** Never; it is a work-item placement.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · connection.ts changes in Step 6, per decision 0.4 (#3)
**Decided:** The Step 6 plan's "Files touched" line `connection.ts (unchanged)` is corrected:
`ExtensionConnection` rejects with a `BridgeError` carrying `code`, as plan decision 0.4 says.
**Why:** 0.4 is a contract decision of the plan; the file list was a stale line from before it.
**Instead of:** Keeping `connection.ts` unchanged and wrapping errors in `route.ts` (would reopen
0.4).
**Revisit if:** Never; it is a text correction.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · selectTab stays as an alias of focusTab for one release (#2b)
**Decided:** Step 7 stage T3 keeps the extension's `selectTab` method as an alias of the new
`focusTab`; Step 8 stage S2 removes it together with the `activeTab()` fallback.
**Why:** The same one-release migration pattern as Step 7 plan 0.1; a Step 6 MCP still calls
`selectTab` (`server/src/tools/registry.ts:145`) until Step 7 T4 lands.
**Instead of:** Removing it in T3 (an MCP built before T4 would get `unknown method` on
`browser_select_tab`).
**Revisit if:** Never; the removal is already scheduled.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · The actor name carries the MCP's own process id (#2)
**Decided:** The MCP's actor name is `claude-code #<pid>` with the MCP process's own `process.pid`,
as the design spec §8.3 says. Step 6 D5 and Step 8 0.6, which said `process.ppid`, are corrected.
**Why:** Under the nvm-windows shim the parent is the shim, not Claude Code (`CLAUDE.md`
lifecycle gotcha); the MCP's own id is unique per session and is what a process listing shows.
**Instead of:** `process.ppid` (would have meant amending the spec).
**Revisit if:** A way to learn the Claude Code session id from the MCP's environment appears.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Steps 6–8 run under the long-run contract (#1)
**Decided:** Future development, starting with Step 6 (daemon + protocol v2), Step 7 (multi-actor
tabs) and Step 8 (SDK surface + MCP cursor), runs as autonomous phases under the project skills
`long-run`, `step-agent`, `phase-kickoff` and `session-closeout`, with the writing rules in
`docs/docs-writing-guide.md` and this decision log. Each step starts from a kickoff written with
`phase-kickoff` (`docs/plans/next-session-prompt.md`), opens with a Stage-0 spec audit, is built
stage by stage with an independent verifier per stage, and closes with an as-built register.
**Why:** The method is proven on the user's research repos (exp3-cafrl Phases 1–5, FinetuneCV
temporal Phases A/B, the exp3 revision waves): the trail survives context loss and respawns, and
verification is done by an agent that did not write the code.
**Instead of:** Continuing the single-session, plan-plus-sessions-file style of Steps 1–5. It
worked for session-sized steps, but Steps 6–8 each span days and cut across `server/`,
`extension/` and `shared/`.
**Revisit if:** A step turns out to fit one session; then the two-level form of `long-run` §2 is
enough and the kickoff says so.
**By:** user
