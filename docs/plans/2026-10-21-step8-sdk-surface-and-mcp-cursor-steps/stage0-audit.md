# Step 8 Stage 0 — spec audit

**Date:** 2026-10-23 · **Baseline commit:** `1a62620` (`docs(step8): open the run — steps dir, common
brief, decisions #70-#77`; docs only on top of `70aa754`) · **Status:** findings for the session agent;
nothing here is resolved until the session agent records it.
**Sources:** three auditor reports, merged here as claims and spot-checked: A (code cites, Chrome/CDP
facts, the daemon's forward path), B (Step 7's contracts and the blind spots, executed on port 0), C
(internal consistency, blind spots, testability, kickoff proposals, rulings). Their raw notes and
scratch tests stay in the session scratchpad (`…/scratchpad/stage0/{A,B,C}/`), outside the repo.
Finding IDs from the auditors are kept in brackets (A1, B3, C5, …) so each claim can be traced.

## Outcome

- **Baseline re-checked** (main tree, 2026-10-23, by this merge builder; also by A and B in clean
  worktrees of `1a62620` after `npm ci`): `npm test` → `Test Files 59 passed (59)`, `Tests 950 passed
  (950)`; `npm run typecheck` → exit 0; `grep -c "server.tool(" mcp/src/tools/registry.ts` → `22`;
  `grep -cE '^  [A-Z_]+: "[A-Z_]+",$' shared/src/codes.ts` → `22`; `grep -c NO_CURSOR shared/src/codes.ts`
  → `0`. Matches the kickoff and `briefs/common.md`.
- **Not touched:** Chrome, port 9234, the real daemon, the token. Every socket test bound 127.0.0.1
  port 0 against fake extensions; the only processes started were vitest, `npx tsx` and stand-in
  scripts, killed by recorded pid.
- **Step 7's contracts hold:** 20 of 20 executed by B pass, plus A's forward-path run. No CRITICAL
  finding comes from a broken Step 7 contract.
- **Chrome/CDP facts come from Chromium source and the Chrome docs** (URLs in F1, F5 and the Chrome
  facts table, §8). They are **unconfirmed for Chrome 156** until the live rows FE-0…FE-5 (focus emulation)
  and SM-1 (session marker) run.
- **Counts:** CRITICAL 2 · MAJOR 14 · MINOR 15 · NIT 4. **Escalations** (a resolution would change a
  pre-registered rule): F1, F3, F6, F11, F15, F18, F32.

**Terms used below** (first use): *FE* = the focus-emulation stage of kickoff §7; *S2b* = the stage
that removes Step 6's compatibility path and adds the session marker; *SM-1* = the live row "a held
handle across a Chrome restart"; *BG-1/BG-2* = Step 7's rows for a trusted click/typing into a
background tab (`docs/e2e-test-plan.md` §4.14); *MUX-n* = Step 6's multi-client rows; *LEASE-n* = Step
7's lease rows; *legacy path* = the daemon's handling of a Step 6 client that sends no `tab` (#41);
*the marker* = the `{__bridgeError:"CODE:message"}` return of a failed page function (#38); *the
cursor* = the tab an MCP session or SDK client acts on when a call names no tab.

## 1. Findings

Tag: **plan-side** (amend the phase doc with a dated note, plus a decision if more than mechanical) or
**code-side** (becomes a stage item; owning stage named). Resolution kind: **mechanical** (step agent
amends the phase doc), **design-local** (session agent records a decision), **contract-level** (Open
decision for the user, conservative rule meanwhile). **ESCALATION** marks a resolution that would
change a pre-registered rule; those are the session agent's to rule, not amendments.

### CRITICAL

**F1 — Focus emulation makes the background target's page visible, so FE-4's "the target stays
`hidden`" and FE-1/FE-2's copied "target visibilityState hidden" would fail for a reason the human
never sees** [A1] · plan-side (FE; #71) · **ESCALATION: yes** (FE row PASS rules and the outcome table)
- Evidence (Chromium `main`, fetched 2026-10-23):
  - https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/emulation_handler.cc
    `:1051-1067`: `capture_handle_ = GetWebContents()->IncrementCapturerCount(gfx::Size(),
    /*stay_hidden=*/false, /*stay_awake=*/false, /*is_activity=*/true);` (re-checked by grep on the
    fetched copy: `1059: capture_handle_ = …IncrementCapturerCount(`, `1061: /*stay_hidden=*/false,`).
  - `content/browser/web_contents/web_contents_impl.cc:5271`: `if (visibility == Visibility::VISIBLE ||
    visible_capturer_count_ > 0 || …) return PageVisibilityState::kVisible;` (re-checked by grep).
  - So while emulation is on, the page reports `document.visibilityState === "visible"` and fires
    `visibilitychange` each way; nothing in that code activates the tab or touches a window.
  - The PASS rules FE copies: `docs/e2e-test-plan.md:679` (BG-1) `…; target visibilityState hidden`,
    `:680` (BG-2) `…; field value "bg2typed"; target visibilityState hidden`. Kickoff §7 FE-4: "the
    target stays `hidden`".
  - Read literally, FE-4 FAILs on every trial, the table reads "(B) `focusFirst`", and the policy is set
    by a wrong premise, not by what the human saw.
- Proposed (before FE-0…FE-5 are committed, so no rule changes after a measurement): FE-4 judges only
  what the human sees — the human's tab stays `current` and never `hidden`, the foreground window and
  every window's active tab are unchanged, the target is never `active` in its window, no window
  capture shows the target. The target's page visibility becomes a pre-registered **observation**
  ("`visible` while the option is on, `hidden` again after the call"), not a PASS clause. FE-1/FE-2's
  copied "target visibilityState hidden" is read after the call returned (emulation off, debugger
  detached). Docs state the page-observable effect if outcome (A) wins. Resolution kind: contract-level
  (what the human sees; FE's pre-registered rules).

**F2 — After a daemon restart, a stale explicit handle can act on a different, unheld tab, for every
kind of client** [C1; verifier V1] · plan-side (#11; phase 0.4) and code-side (S2b daemon handles if
option (a); S3 `Tab` guard; S5 MCP guard if option (b)) · ESCALATION: no (option (a) makes 0.4's
pre-registered sentence true; it changes no rule)
- Evidence:
  - Pure modules: `npx tsx …/stage0/C/handles-collide.ts` (`daemon/src/handles.ts` + `leases.ts`, re-run
    by this builder) → `daemon #1: T3 -> {"kind":"live","tabId":103}` · `daemon #2: T3 ->
    {"kind":"live","tabId":101}` · `lease check of unheld T3 by a stale client: {"ok":true}`.
  - End to end (verifier, two real `WsHost` instances on port 0 with a fake proto:2 extension): client A
    opened `T3` on daemon #1; daemon #2 resynced the same tabs in another order; A's stale `click
    {tab:"T3", ref:"e1"}` answered `{"ok":true,"method":"click"}` and reached the fake as
    `{"ref":"e1","tabId":1}`, **the human's tab**, with no lease refusal (stage0-verifier.md §2 (i)).
  - Cause: `daemon/src/handles.ts:44` `private next = 1;` — handles are monotonic per daemon instance,
    and the new daemon's resync mints `T1…Tn` again (`intercept.ts` `resync` → `record()`).
- What is wrong is a plan premise, not a Step 7 contract. Step 7's binding contract (as-built § Stage
  T2) makes handles monotonic and `mint` idempotent within one daemon and promises nothing across a
  restart. The premise is in decisions.md · 2026-10-21 · The SDK clears its cursor when it reconnects
  after a daemon restart (#11) and in phase 0.4's amended note: "an explicit stale handle returns
  `TAB_UNKNOWN`". That holds only while the new daemon has minted fewer handles. CRITICAL on safety
  grounds: an actor acts on the human's tab, and no planned check looks for it.
- Who is exposed. A handle reaches the daemon by three routes, and only the first passes through an
  SDK `Tab` object:
  1. an SDK script's `Tab` (S3);
  2. Claude through the MCP: every tool takes `tab: z.string().optional()` and passes it through
     unchanged, for example `bridge.call("click", { ref, trusted: trusted ?? false, tab: t })`
     (`mcp/src/tools/registry.ts:182-185`). A handle Claude remembers from an earlier
     `browser_list_tabs` is a string in Claude's context. A `/mcp` reconnect after a build that changed
     `daemon/dist/index.js` starts a new MCP process *and* (through the build-id handover) a new
     daemon, so the new MCP has never seen the handle Claude still holds;
  3. anything that is not a Step 8 SDK `Tab`: a raw `client.call(method, {tab})` script, a Step 7 MCP
     bundle still running in another session, a Step 7 recipe.
- Options (the user rules; contract-level, because (a) changes how handles are numbered):
  - **(a) daemon-side: a new daemon never re-mints a number an earlier daemon used.** The `T<n>` format
    stays, so there is no wire change. `HandleTable` starts `next` above a high-water mark persisted
    under `~/.chrome-agent-bridge/` (written before a minted handle is returned), falling back to a
    start-time base if the file cannot be read or written. The base is injectable so the tests keep
    `T1…`. A stale handle then resolves to `unknown` → `TAB_UNKNOWN`, which makes #11's premise true for
    all three routes, Step 7 bundles included. Home: S2b (daemon lane: `daemon/src/handles.ts` and its
    caller, a state file under `~/.chrome-agent-bridge/`), +0.5 h.
    Leaves exposed: a daemon that crashes between minting and writing the mark (not if the write comes
    first); the start-time fallback can still collide if an earlier daemon minted more handles than the
    base advanced; handle numbers grow across restarts (`T214`), so TAB-1's example "(`T1`, `T2`, …)"
    and any row that quotes a literal handle needs re-dating before its run.
  - **(b) client-side guards.** S3 stamps each `Tab` with the client's connection generation and throws
    `TAB_UNKNOWN` locally after a 4002 reconnect ("tab T3 is from before the daemon restarted — call
    tabs() or claim()"), with no call. S5 adds an MCP-local guard: after a lost cursor, the MCP refuses
    an explicit handle it has not returned since the reconnect, and the lost-cursor notice adds "handles
    from before are void". No daemon change.
    Leaves exposed: all of route 3 (raw `call()`, Step 7 bundles and recipes), and route 2 after a `/mcp`
    reconnect or any new MCP process, because the new process has no "before" to compare with.
  - **(c) both.**
- Recommendation: **(c) in the form (a) + the S3 `Tab` guard.** (a) is the only option that covers every
  route. The S3 guard is cheap defence in depth and gives a clearer message without a round trip. The
  S5 MCP guard is redundant under (a); build it only if the user rejects (a).
- Conservative rule until the user rules: S2b builds (a) behind the injectable base (it only turns a
  wrong-tab action into `TAB_UNKNOWN` and is reversible), S3 builds its guard, and #11's premise gets a
  dated note naming the gap. If the user rejects (a), S5 builds the MCP guard and the docs state that
  route 3 stays exposed.
  Resolution kind: contract-level (the handle-numbering rule; SDK and MCP behaviour; #11's premise
  amended by a dated note).

### MAJOR

**F3 — The FE outcome table is not total, and FE-4 has no banner clause and no positive control**
[C4, C9; #71 items 1–7] · plan-side (FE; #71) · **ESCALATION: yes** (the pre-written outcome table and
FE-4's PASS rule)
- Evidence (kickoff §7 FE "Outcome table"): FE-1 FAIL + FE-2 FAIL + FE-3 PASS + FE-4 PASS matches both
  (B) "FE-1 and FE-2 FAIL" and (C) "one input kind passes all trials". FE-0 FAIL (stale build) is not an
  outcome. "FE-5 passing" is undefined across three trials. Trials share one tab, so a trial that does
  nothing can read the previous trial's `status: TRUSTED …` line. Every trusted call attaches the
  debugger and shows the "debugging this browser" banner (`CLAUDE.md`), so "the human saw something"
  read literally is always true.
- Proposed (written before any FE row is committed): precedence FE-5 void → (B); else FE-4 FAIL → (B);
  else every kind passes → (A); else no kind passes → (B); else (C). FE-0 FAIL = stop and reload, not an
  outcome. FE-5 "passes" if the control receives input in any trial; run FE-5 first and last. Each
  trial on a fresh fixture tab or a reset status line. The banner is expected and is not a FAIL. FE-4 is
  judged over all trials of FE-1…3. Positive control: one default-mode screenshot of the target while the
  human's-tab `visibilitychange` logger runs must log `hidden` → `visible`. (C) as a per-kind map in
  `policy.ts`; `type {submit}` takes the stricter of type/pressKey; the SDK's (A)/(C) sends
  `focusEmulation:true` on every click/type, since it cannot see the extension's automatic escalation.
  State whether the MCP's trusted tools also `focusTab` first under (B). Resolution kind: contract-level.

**F4 — Trusted `type` focuses the field before the debugger session, so the focus step runs without
emulation; FE-3 has no focus set-up** [C11, A9] · plan-side (FE design and row text) · ESCALATION: no
- Evidence: `extension/src/handlers/actions.ts:67-71` — `await callInPage(tab.id!, (r) =>
  window.__agentBridge!.focusForTyping(r as string), [ref]);` then `await withDebugger(tab.id!, async ()
  => { await trustedType(…); if (submit) await trustedPressKey(…, "Enter"); });`. `pressKey`
  (`actions.ts:94-99`) has no focus step: keys go to the background page's `document.activeElement`.
- Risk: FE-2 fails on this ordering rather than on emulation, and sets (B)/(C) on an artefact.
- Proposed: with the option, attach → enable emulation → focus → `Input.*` → disable in a `finally`
  (the focus may stay a content-script call, inside the debugger session's time window). FE-3's row text
  names its focus step (for example a synthetic click or `focus()` on `#trusted-input` in the same
  trial) and the key. Resolution kind: design-local (FE's build).

**F5 — The session-marker mechanism of #74 is not achievable as worded** [A3, B7, C5, C16, B6, A19;
C extension 19] · plan-side (#74) and code-side (S2b) · ESCALATION: no for the exit checks (only made
stricter); the #74 amendment is contract-level
- Evidence:
  - `storage.session` is "cleared if the extension is disabled, reloaded, updated, and when the
    browser restarts" (https://developer.chrome.com/docs/extensions/reference/api/storage); #74 needs
    the marker to survive a reload.
  - `storage.local` never changes by itself; `runtime.onStartup` is "Fired when a profile that has this
    extension installed first starts up" (https://developer.chrome.com/docs/extensions/reference/api/runtime).
  - Race: `extension/src/sw.ts:199` `void connect();` runs at the top level, before any event listener
    (`sw.ts:184` `chrome.runtime.onStartup.addListener(() => void connect());`). The first hello after a
    Chrome start can carry the previous session's marker → "same" → today's resync, the hole itself.
  - The hello is built in the offscreen document (`extension/src/client.ts:8-9` `helloFrame`, sent
    `:50`), which can use only `chrome.runtime` ("The runtime API is the only extensions API supported
    by offscreen documents", https://developer.chrome.com/docs/extensions/reference/api/offscreen), so
    the marker must travel in the service worker's `connect` message (`sw.ts:154`).
  - `extension/src/offscreen.ts:10-15` keys the client on `` `${msg.port}:${msg.token}` `` and answers
    `alreadyConnected` on the same key, so a changed marker alone never sends a new hello.
  - "None after one was seen → retire" compared with a sticky flag retires again on every later
    no-marker hello; compare with the last hello's marker ("none" a value): A→none retires, none→none
    does not.
  - Premise of #74 confirmed by execution: today a held handle survives a "Chrome restart" onto a reused
    id. B `BLIND-a` → `"goneAfterReuse":[]`, `"clickForwarded":{"ref":"e1","tabId":2}` (a different
    page), and a later `tabGone` carries the reused page's `lastUrl`/`lastTitle`. A Step 7 daemon accepts
    a hello carrying `session` (A §2.5 test 2: forwarded `{"tabId":101}`), so the extension can ship first.
- Proposed: `connect()` awaits a marker promise — `storage.session` has one → reuse (worker restart);
  else wait (bounded, e.g. 2 s) for `onStartup` (fresh random marker) or `onInstalled` (reuse
  `storage.local`'s); neither in time → a fresh marker (fail-safe: costs leases, never safety); write
  both stores; the marker is part of the offscreen key. S2b.5 gains a fifth branch (none → none: no
  second retire) and asserts that a retired handle's `tabGone` carries the pre-restart `lastUrl`. A
  grant-free reload row (proposed SM-0; A calls it SM-2) beside SM-1. The order in which Chrome 156
  delivers `onStartup`/`onInstalled` relative to the worker's top-level code is unconfirmed until SM-0/SM-1.
- Proposed check (stricter S2b, unit, no Chrome) [verifier V2]: the marker choice is a pure function of
  what the worker has seen — `storage.session`'s value, `storage.local`'s value, and the order of
  `connect()`, `onStartup` and `onInstalled` within the bound — tested over these orders: a worker
  restart (session store set → reuse); an extension reload (`onInstalled` "update" → reuse the local
  marker); a Chrome start with `onStartup` **before** `connect()`; a Chrome start with `onStartup`
  **after** `connect()` but within the bound (both → a fresh marker, and no hello carries the old one);
  neither event within the bound → a fresh marker. The case "`onStartup` after `connect()`" is the race
  above, and today only SM-1 would catch it.
- Why MAJOR and F2 CRITICAL, for the same harm [verifier V2]: F5's hole is known and planned for. It is
  today's documented behaviour (T2 verifier V4), #74 exists to close it, and S2b.5 and SM-1 are written
  to test it; the finding is that #74's mechanism, as worded, would not close it. F2's hole sits under a
  ruling (#11) that the plan treats as already true, so no planned check looks for it. F5 also needs a
  Chrome restart onto a reused tab id; F2 needs only a daemon restart, which any build that changes
  `daemon/dist/index.js` causes (the build-id handover), as does the idle exit. The unit check above
  makes F5's race fail at the builder, so it no longer depends on SM-1, which needs a user grant and
  may end "not run".

**F6 — A page function's failure marker cannot carry `data`, so `LOCATOR_NOT_FOUND {candidates}` and
`LOCATOR_AMBIGUOUS {matches}` cannot cross it** [A2] · plan-side (0.1) then code-side (S1) ·
**ESCALATION: yes** (the `{__bridgeError}` return is a `CLAUDE.md` invariant on the STOP list)
- Evidence: `extension/src/content/guard.ts:26-31` `toMarker` returns only `` { __bridgeError:
  `${code}:${message}` } ``; `extension/src/inject.ts:64-67` builds `new BridgeError(code, message)` with
  no data. A's run: `{"withData":{"__bridgeError":"LOCATOR_AMBIGUOUS:2 matches"}}` — `err.data
  {matches:[1,2]}` lost. (A cited `guard.ts:88-117`; the file has 46 lines — the functions are at
  `:17`, `:26`, `:38`.)
- Proposed (additive): `guard` also returns `__bridgeData` when `err.data` is plain JSON; `unwrapResult`
  passes it as the error's `data`. The `__bridgeError` string, null/undefined → `REF_STALE` and the IIFE
  rule stay. Rejected: JSON inside the message. Resolution kind: contract-level (an invariant's shape).

**F7 — The Chrome `id` beside `tab` has consumers, the case the kickoff reserved for a dated
decision** [A4, B2, C6, A14] · plan-side (S2b; #57) · ESCALATION: no
- Evidence: `recipes/hello.ts:81` `` (active ? `[${active.id}] ${active.title}` : "none") `` (MUX-3
  expects `active: [<id>] <title>`, `docs/e2e-test-plan.md:473`); `recipes/t5-lib.ts:100` `` `chrome id
  ${t.id}` ``; `recipes/t5.ts:139`, `:552-553` (LEASE-6 reads (a)/(b) from `fMarker?.id === id`; with `id`
  gone `undefined === undefined` always reads "(a)"); `mcp/src/tools/registry.ts:140`, `:284`, `:321`
  (dead `?? id` fallbacks). B's S2b simulation (`s2b-sim.diff`) kept `mcp/test` + `sdk/test` at `310
  passed (310)`, so no MCP/SDK consumer; 5 daemon lease tests read the `id` (`tabs.test.ts:249`, `:276`,
  `:386`, `:406`, `:435`). Chrome ids also stay visible in `daemon.status` `tabs[].tabId` and network
  entries' `tabId`.
- Options: (a) keep `id` this step (conservative; every tool, recipe and row behaves identically);
  (b) remove it (spec §6.2 "Actors never see Chrome tab ids"), grant S2b `recipes/{hello,t5,t5-lib}.ts`
  and the three MCP fallbacks, re-date MUX-3/5/6/8/10 and LEASE-5/6 before any run. A recommends (a),
  C recommends (b). Resolution kind: contract-level (removal of a compatibility form).

**F8 — `locate` needs a wire method, and an unlisted method without `tab` is forwarded with no lease
check** [A5, C19; kickoff seed 1] · code-side (S2: S2.6; S2b: the refusal) · ESCALATION: no
- Evidence: `daemon/src/methods.ts:54-55` `// Unlisted: free when it names no tab; …` `return
  hasTab(params) ? "tab" : "free";`. A's run (`zz-auditA-forward.test.ts`, port 0): B's `locate
  {locator}` with no `tab` reached the fake extension as `{"locator":{"css":"#x"}}` and answered ok while
  A held the human's tab (the extension's `targetTab` fallback, `tabs.ts:65-69`, acts on the human's
  tab). With `tab`, `locate` was lease-checked: `TAB_HELD … data {owner:"A", since}`. Adding `locate` to
  `TAB_METHODS` breaks `daemon/test/methods.test.ts:8` (an exact sorted list), outside S2's lane.
- Proposed: S2.6 holds in the same commit as the router entry, with a test "`locate` without `tab`"
  (legacy path today, `BAD_PARAMS` after S2b); grant S2 `daemon/test/methods.test.ts`. For S2b, a
  decision (#39 is contract-level): an unlisted method without `tab` is refused `BAD_PARAMS "tab is
  required"` instead of forwarded. Resolution kind: mechanical (the grant), contract-level (the refusal).

**F9 — S2b's lane misses files its own removals touch, and network calls without `tab` are undefined
after S2b** [A6, C7, B8, C8] · plan-side (S2b lane; #72; #40) · ESCALATION: no
- Evidence:
  - `grep -rn "selectTab" extension/src` → `extension/src/handlers/tabs.ts:70:export const selectTab =
    focusTab;` and `extension/src/sw.ts:32:router.on("selectTab", focusTab);` (re-run by this builder) —
    `handlers/tabs.ts` is not in S2b's lane, and S2b.2 cannot pass without it.
  - `extension/src/handlers/network.ts:12` `const fallbackTab = (method: string) => async ():
    Promise<number> => (await targetTab({}, method)).id!;` — a human's-tab fallback invisible to the
    `activeTab` grep, outside the lane.
  - The hello is in `extension/src/client.ts:8-9`, not `offscreen.ts` as the lane says.
  - `daemon/src/intercept.ts:419` `if (tab === undefined) return this.humanTab(caller, deadline,
    true);` — network methods with no `tab` go through the legacy resolver. S2b says "a non-free call
    without `tab` → `BAD_PARAMS`", but `networkRequests` is free; #40 gives absent/"active" the human's
    tab by design.
  - The S2b.2 daemon grep also hits the comments `methods.ts:1`, `:60`.
- Proposed: grant `extension/src/client.ts`, `extension/src/handlers/{tabs,network}.ts`; S2b.2 adds
  `grep -rn "targetTab({}" extension/src` → nothing; reword the two comments. Rule network-without-`tab`
  after S2b: C proposes "absent stays `active` (#40), logged not as legacy" (conservative); B lists
  `BAD_PARAMS` as the stricter option; neither the MCP nor a recipe sends it. Resolution kind: mechanical
  (lane), contract-level (the network rule, #40).

**F10 — A `selectTab` removed only from `methods.ts` is forwarded without the visibility lock** [B1] ·
code-side (S2b) · ESCALATION: no (the fix is stricter)
- Evidence: B's scratch test with `selectTab` out of the table but no daemon-side refusal: `AUDITB
  S2B-SIM-2 {"answer":{"ok":true,"method":"selectTab"},"forwarded":[{"tabId":102}],
  "lockHolderDuring":{"holder":"A"}}`. `classify` (`methods.ts:54-55`) sends an unlisted method with a
  `tab` down the lease-checked path, no lock. Between S2b's daemon build and the extension reload, a
  Step 7 extension still runs `selectTab` as `focusTab` (window focus) outside the lock.
- Proposed: S2b's daemon refuses `selectTab` itself (`UNKNOWN_METHOD`) before resolution; S2b.3's
  `selectTab` test runs against a fake that *would* answer it, so only a daemon refusal passes. The
  same for any later removal of a lock-class method. Resolution kind: design-local (stricter).

**F11 — S2b.3's "every lease and lock test from Step 7 still green unchanged" cannot hold** [B3, C15] ·
plan-side (S2b.3) · **ESCALATION: yes** (S2b.3 is pre-registered)
- Evidence: B's S2b simulation → `npx vitest run daemon/test --exclude "**/zzB-*"` → `17 failed | 202
  passed (219)`. 8 test a removed form itself (`methods.test.ts` ×3; `tabs.test.ts:981`, `:1003`, `:1016`,
  `:1038`, `:1066`); 9 lease, lock or intercept tests only *use* a removed form (`:249`, `:276`, `:386`,
  `:406`, `:435` read the `id`; `:779` "focusTab and selectTab wait while a screenshot holds the lock"
  sends `selectTab`; `:1081` `networkRequests {}`; `:1143` `networkClear {}`; `:1211` T2.3's legacy loop).
  `:1016` is itself "legacy: a screenshot without tab takes the lock".
- Proposed: "unchanged, except edits that replace a removed form with its handle form, each listed in
  S2b.8 with the form it used; the lease and lock assertions stay byte-identical, and each edited test
  still fails when its contract is broken". S2b.8's list starts from these 17. Resolution kind:
  contract-level (a pre-registered rule).

**F12 — The MCP locator field `text` collides with existing tool fields, and `ref` is required today**
[C2] · plan-side (S5; 0.6) · ESCALATION: no
- Evidence: `mcp/src/tools/registry.ts:194-195` (`browser_type`) `ref: z.string(),` `text: z.string(),`;
  `:342` (`browser_wait_for`) `text: z.string().optional().describe("Text to wait for in the page's
  visible text (up to 10s).")`. 0.6 adds "the locator fields (`role`, `name`, `text`, `css`)" to the
  actions and `browser_wait_for`.
- Proposed: a nested `locator: {role?, name?, exact?, text?, css?, nth?}` object, `ref` optional, "exactly
  one of ref/locator" validated in the tool. Resolution kind: contract-level (tool schemas), before S5.

**F13 — `{text}` locator semantics are undefined, so SDK-4's premise is unestablished; other locator
rules are open** [C3, A10] · plan-side (0.1; S0/S1) · ESCALATION: no (SDK-4 has no expected text yet)
- Evidence: `test-fixtures/e2e-playground.html:121` `<div id="async-area"></div>`, `:252`
  `…textContent = "Async content loaded!"; set("async content loaded");` — a role-less div the snapshot
  never lists (`roleOf`, `snapshot.ts:52-57`). 0.1 says only `{css}` matches non-interactive elements;
  spec §8.1 says "the same role and accessible-name rules". `#status`'s `async content loaded` matches
  the needle case-insensitively unless the `!` is kept.
- Also open (A10): `nth` in walk order (shadow children before light children, frames in walk order);
  names are capped at 120 chars with `…` (`MAX_NAME`, `snapshot.ts:8`), so `exact` on a long name never
  matches; whether `locate` searches past the 800-element cap; `buildSnapshot` must stay exported from
  `snapshot.ts` (imported by `sdk/test/format-baseline.test.ts:9` and `format-snapshot.test.ts:8`).
- Proposed: `{text}` = the innermost visible element (after the snapshot's pruning gates) whose
  normalised text contains the needle, case-insensitive substring, `exact` = equality; the invariant
  reads "what the snapshot's pruning shows" for `{text}`; SDK-4's needle `Async content loaded!`.
  Resolution kind: contract-level (locator rules).

**F14 — Which class the SDK exports as `BridgeError`** [C10] · plan-side (S3/S4; 0.5) · ESCALATION: no
- Evidence: `sdk/src/index.ts:6` `export { BridgeError, ErrorCodes } from "@bridge/shared";`;
  `instanceof BridgeError` in `mcp/src/link.ts:127`, `recipes/hello.ts:43`, `recipes/t5-lib.ts:41`,
  `recipes/t5.ts:472`, `:477`, `:768`, `:961`. 0.5 makes the SDK's `BridgeError` a subclass; if the
  exported name became the subclass, errors thrown unwrapped (knock, `NOT_CONNECTED`, `VERSION`) fail
  `instanceof`.
- Proposed: keep the exported name on the shared class; the report fields are optional properties set
  on it (or a subclass under another name). Resolution kind: contract-level (SDK surface).

**F15 — S3.5 has no positive control, no outcome for "no Node-level fix", and #77's pre-written note
claims a cause the test does not measure** [C12, B5, A17] · plan-side (S3; #77) · **ESCALATION: yes**
for the outcome text only (the positive control is stricter)
- Evidence: B `AUDITB_DIR=<SCRATCH>/B npx vitest run sdk/test/zzB-spawn.test.ts` → `Tests 3 passed (3)`:
  `{"mode":"ignore",…,"eofWithin2s":true,"eofMsAfterExit":-5,…,"standinAliveAtCheck":true}`; the
  inheriting control `{"mode":"inherit",…,"eofWithin2s":false,…}`; the npx → tsx chain also passes. A's
  dry run agrees (`"eofAfterExitMs":-4`, stand-in alive). So S3.5 passes at the baseline, and the check
  discriminates only with the `stdio:"inherit"` control beside it. The MUX-6 chain (PowerShell
  `Start-Process -NoNewWindow`) was not run.
- Proposed: S3.5 adds the control (must see no EOF within 2 s); #77's "the hold came from `Start-Process
  -NoNewWindow` itself" becomes "`spawnDaemon` inherits no pipe (node and npx parents); the MUX-6 cause
  remains unmeasured"; a third outcome "fails and no Node-level option removes it → recorded with the
  measured cause". S3.5's test should spawn without the `tsx` layer. Resolution kind: design-local.

**F16 — S2.2's second grep cannot fail** [C13] · plan-side (S2.2, moving to S2b.2) · ESCALATION: no
(the fix is stricter)
- Evidence (re-run by this builder): `grep -n "selectTab" extension/src; echo "exit=$?"` → `grep:
  extension/src: Is a directory`, `exit=2`, empty stdout — while `grep -rn` finds two hits. The same
  class as Step 7's T6.1 grep (#48). S2's verifier focus `grep -n "activeTab" extension/src` has the same
  defect.
- Proposed: `grep -rn` everywhere, and the check reads stdout empty **and** exit 1. Resolution kind:
  mechanical.

### MINOR

**F17 — #73's receipt rule is already today's behaviour; S2b.4 discriminates only through the log
line** [B4; C on #73] · plan-side (S2b.4) · ESCALATION: no
- Evidence: B `BLIND-d`: codeless, empty, numeric, string and `null` errors arrive as `INTERNAL` within
  1 ms from both peer kinds, with no log line; `{code:"WEIRD"}` passes through verbatim.
  `extension/src/errors.ts` `toWireError` always sends a code; `shared/src/error.ts:44` `fromWire` maps a
  missing one to `INTERNAL`.
- Proposed: S2b.4 asserts the log line once per proto:2 connection (method name only) and never for a
  no-proto peer; keep a lenient input type for `fromWire`; say whether an unknown code like `WEIRD` stays
  verbatim. Design-local.

**F18 — S2b.6's "nowhere the old `pass mode:"cdp"` hint" cannot pass unscoped** [C18] · plan-side ·
**ESCALATION: yes** (scoping a pre-registered clause)
- Evidence: `grep -n 'pass mode' docs/e2e-test-plan.md` → `:677` (SCREEN-4's superseded expected text)
  and `:1561` (Run 8's recorded result), which must stay.
- Proposed: scope to `extension/src extension/test`. Contract-level (a pre-registered rule).

**F19 — FE.2 puts a runner property on a pure list, and needs today's list recorded first** [A8;
C testability] · plan-side (FE.2) · ESCALATION: no (additions only)
- Evidence: A's recorded sequences (`zz-auditA-cdp.test.ts`, mocked `chrome.debugger`): click → `attach
  {tabId:7} "1.3"` → `mousePressed` → `mouseReleased` → `detach`; `type "a.\n"` + submit → keyDown/keyUp
  pairs (`.` with `code:""` and no virtual key) → two Enter pairs → `detach`; a failing `mousePressed` →
  `detach`, `DEBUGGER_CANCELLED`.
- Proposed: keep FE.2 and add — a pure builder returns today's list exactly, asserted against a fixture
  recorded on the FE parent commit; a runner test with a mocked `sendCommand` that throws on an `Input.*`
  command asserts `attach, enable, …, disable, detach`. Mechanical.

**F20 — Several pre-registered checks pass without discriminating** [C testability; C17, C20, C33] ·
plan-side · ESCALATION: no (each fix adds a clause)
- FE.3: `grep -nE "windows\.update|focused\s*:" extension/src/debugger.ts` misses `tabs.update`,
  `focusTab`, `active: true` and `actions.ts` → add `grep -rnE
  "windows\.update|tabs\.update|focused\s*:|focusTab|active\s*:\s*true"` over `debugger.ts`, `actions.ts`
  and any FE helper, output equal to the FE parent's.
- S1.4: `locate` calling `buildSnapshot` resets the RefMap without the word `reset` → add `grep -n
  buildSnapshot extension/src/content/locate.ts` → nothing.
- S4.3: attach code in another file escapes → `grep -rn "console\." sdk/src` → nothing (empty today).
- S4.2 (C17): iterate `Object.keys(ErrorCodes)`: attach iff in the seven.
- S2.4 (C20): widen to `(url|href|locator|name|text|expression|title)`; spec §8.2's sample message embeds
  a URL, against "no URL in any message".
- S6.4 (C33): `~/.chrome-agent-bridge/` is outside the repo and can never be staged → add `git
  check-ignore -q exports/x.json` exit 0 and `BRIDGE_FAILURES_DIR` unset or outside the repo.
- S0.3: a type test (`{css, exact}` rejected, `{}` not a `WaitForParams`). Mechanical.

**F21 — `asRef` details the plan leaves out** [A7, C21] · code-side (S2) · ESCALATION: no
- Evidence: `extension/src/debugger.ts:186` releases the result's objectId inside the serializer
  callback; the session detaches when `withDebugger` returns; `evaluate.ts:22-24` skips `ensureContent`.
  A's run: `{"win":"node","txt":"node"}` — `kind:"node"` also covers `window` and text nodes.
- Proposed: `markScript` runs on the objectId before release, inside the session; `asRef` needs
  `nodeType === 1`, else `BAD_PARAMS`; `refOfMarked` searches open shadow roots and same-origin frames;
  the mark is removed from the CDP side in a `finally` if the content call fails. Design-local.

**F22 — `waitFor` timings and the call timeout** [A13, C23] · code-side (S2 `wait.ts`; S3 SDK; S5
`browser_wait_for`) · ESCALATION: no
- Evidence: `extension/src/handlers/wait.ts` — `WAIT_CEILING_MS = 10_000`, `POLL_MS = 100` (networkIdle),
  the text arm `setTimeout(r, 200)` page-side with no `timeoutMs`, `seconds` capped at 60;
  `registry.ts:343` "max 60", `:359` `bridge.call("waitFor", {…})` with no `timeoutMs` → a 45 s wait meets
  the 30 s default call (+5 s daemon slack) — a pre-existing bug.
- Proposed: the SDK and MCP send call `timeoutMs` = wait + slack; S2 states 100 ms vs 200 ms. Design-local.

**F23 — Locator failures and `waitFor {locator}` edge cases** [C27] · plan-side (S2) · ESCALATION: no
- Evidence: `actions.ts:27` escalates a failed content click to trusted CDP. Not stated: that
  `LOCATOR_NOT_FOUND`/`AMBIGUOUS` from `resolveTarget` must not escalate; what `state:"visible"` does on
  `LOCATOR_AMBIGUOUS` or a navigation (`REF_STALE`); that the 100 ms poll runs in the service worker,
  since a hidden tab's timers are throttled (Run 8 BG-4: text due at 2000 ms, seen at 3746 ms).
- Proposed: state all three in S2 (S2.3 adds "`LOCATOR_*` does not escalate"). Design-local.

**F24 — The cursor after `tabGone`, a session retire and a non-4002 drop** [A20, C28, B10] · code-side
(S2b, S3, S5) · ESCALATION: no
- Evidence: `mcp/src/cursor.ts:10-11` (the cursor is not cleared on `tabGone`); after a retire every
  untargeted call answers `TAB_GONE "tab T1 was closed — call listTabs …"` (`intercept.ts:394`) although
  nothing closed. `cursor.ts:16-17` `lostNotice` says "the bridge daemon restarted" also on the non-4002
  path where it did not (B M3: `"spawned":0`). The SDK's cursor clear must run inside the reconnect path
  before queued calls (the `ws` same-read gotcha).
- Proposed: a distinct message for retired handles (or an additive `reason:"session"` on `tabGone` —
  wire, contract-level); S5 rewords the notice; S3 tests the clear ordering. Design-local, except the
  wire field.

**F25 — Failure-report gaps in S4** [C25, B11, C24, C26; kickoff seed "failure-report screenshot"] ·
plan-side (S4/S5; 0.5) · ESCALATION: no
- Evidence: a failing `screenshot` (`TIMEOUT` is in the attach set) attaches a second switch-mode
  screenshot (up to 30 s on a covered window, R9-RESTORE); the lock can stay held until a holder's
  deadline + 5 s (B C3: `TIMEOUT` at 5104 ms for `timeoutMs:100`), so the attach can land as
  `LOCK_TIMEOUT` in `attachErrors`; the 60-line window has no anchor for the five codes without
  candidates; 0.5 does not say whether raw `call()` (which the MCP uses) is enriched.
- Proposed: no screenshot attachment when the failing call was `screenshot`/`focusTab` (contract-level:
  the attach behaviour); state the covered-window and contention cases; the first 60 lines (or around
  the `ref` for `REF_STALE`); state where enrichment runs and how the MCP gets `report()`.

**F26 — `browser_new_tab` with no cursor** [C29] · plan-side (S5; 0.6) · ESCALATION: no
- Evidence: 0.6 "active: true only if the cursor's tab is the human's active tab" makes a session's
  first new tab open in the background, a change from `registry.ts:320` (always `active: true`) that
  rows TAB-1…4 and MUX-1 observe.
- Proposed: state the no-cursor branch; re-date those rows before any run; S5.3 tests it.
  Contract-level (what the human sees).

**F27 — `codes.ts` has no list for an SDK-only code** [C14] · code-side (S0; #76) · ESCALATION: no
- Evidence: `ErrorCode` is the union of `DAEMON_ERROR_CODES` and `EXTENSION_ERROR_CODES`; the file
  header says exactly 22.
- Proposed: `SDK_ERROR_CODES = ["NO_CURSOR"]` in the union and `ALL_CODES`; the header and spec §10's
  note in S0's commit. S0.4's command named: `grep -cE '^  [A-Z_]+: "[A-Z_]+",$' shared/src/codes.ts` →
  `23`. Mechanical.

**F28 — `WaitForParams` shape** [C22] · plan-side (S0; 0.2/0.4) · ESCALATION: no
- Evidence: 0.4's `{text?}` arm makes `{}` a valid arm; 0.2's `timeoutMs` on the locator arm is missing
  from 0.4.
- Proposed: `{text: string}`, `{locator, state?, timeoutMs?}`. Design-local (plain plan defect).

**F29 — Spec §8 disagrees with phase 0.4/0.5** [A12, C31] · plan-side (spec note at S7) · ESCALATION: no
- Evidence: spec §8.1 `tab.waitFor({ role: "button", name: "Create" })` and `tab.refOf(result)` vs 0.4
  `waitFor({locator, state?})` and `evaluateRef(expression)`; spec §8.2 `…/bridge-failures/…` vs 0.5
  `~/.chrome-agent-bridge/failures/`.
- Proposed: the plan's decisions bind; the spec gets dated notes. Design-local.

**F30 — Stale line numbers** [A11, C30] · plan-side · ESCALATION: no
- Phase doc Open items: `#load-later` line 117 → `120`; its click handler line 250 → `251-253`; the
  `isTrusted` reporters 155–166 → `157-170` (click `157-159`, input `165-167`, keydown `168-170`);
  "Step C fixtures … line 111 onward" → `snapshot.test.ts:121` (shadow DOM) and `:152` (iframes);
  `handlers/tabs.ts:70` (`selectTab` export) named nowhere. Corrected in the phase doc. Mechanical.
- Auditor A's own cites corrected here: `guard.ts` is 46 lines (`codedError :17`, `toMarker :26`, `guard
  :38`), not `:88-117`; the extension hello is `client.ts:8-9`, sent `:50`, not `:43-45`/`:85`.

**F31 — Run records can carry the user's tab titles and URLs** [C seed "token", C extension 17] ·
code-side (S6) · ESCALATION: no
- Evidence: `recipes/hello.ts:81` prints the human's tab title; the human's tab is the last-focused
  normal window's active tab, possibly the user's own; failure reports carry failed requests' URLs,
  which can hold tokens in query strings.
- Proposed: SDK-1's recipe prints only fixture titles; S6's verifier greps the run record for `://`
  outside the fixture hosts by count. Mechanical.

### NIT

**F32 — S6.1's "`/mcp` is the first recorded line" is moot for headless actors** [C32] · plan-side ·
**ESCALATION: yes** (dropping a clause of S6.1)
- Each `claude -p` actor starts a fresh MCP from the current bundle. Proposed: record the reload exit and
  the stale check instead.

**F33 — `inject.ts` errors say "the active tab"** [A15] · code-side (S2) — `inject.ts:29`, `:90`; since
Step 7 the target can be a background tab.

**F34 — `toSerializableArgs` maps only top-level `undefined`** [A16] · code-side (S2) — A's run:
`[undefined,null,0,{locator:undefined}]` → `[null,null,0,{locator:undefined}]`. Pass `locator` as its own
argument.

**F35 — `truncated: true` also when nothing was dropped** [B9] · plan-side (S2/S4/S5) — `AUDITB E3b
{"n800":800,"truncated800":true,…}` (`elements.length >= MAX_LINES`). The `Tab` and `report()` say "the
cap was reached", never "elements were dropped".

## 2. Step 7 contracts, executed

All on 127.0.0.1 port 0, in a worktree of `1a62620`, real `WsHost` + `Bridge` over `ws` with a fake
proto:2 extension unless stated. B's commands run with the Node PATH line first; B's tests:
`daemon/test/zzB-contracts.test.ts` (11 passed), `mcp/test/zzB-cursor.test.ts` (3 passed, 3 runs),
`extension/test/zzB-extension.test.ts` (4 passed), `sdk/test/zzB-spawn.test.ts` (3 passed).

| # | Contract | Result | Command → output excerpt |
|---|---|---|---|
| 1 | Handles `T<n>` monotonic, `mint` idempotent, never reused (within one daemon) | PASS | `npx vitest run daemon/test/zzB-contracts.test.ts` → `AUDITB C1 {"l1":[[1,"T1"],[2,"T2"]],…,"n3":{"id":103,"tab":"T5"}}`; after `closeTab T3`, click `T3` → `TAB_GONE` |
| 2 | One lease per tab; `TAB_HELD {owner, since}` exact | PASS | same file → `AUDITB C2 {"held":{"code":"TAB_HELD",…,"data":{"owner":"A","since":…}}}`; keys `["owner","since"]` |
| 3 | FIFO lock around default `screenshot`, `focusTab`, `selectTab`; not `mode:"cdp"`/`fullPage` | PASS | `AUDITB C3 {"afterCompletion":5,…}`; cdp, fullPage, click add 0 |
| 4 | Lock released once per acquisition: completion, deadline, disconnect | PASS | `"takes":9,"frees":9,"perToken":[[1,1],…,[9,1]]` |
| 5 | `LOCK_TIMEOUT {holder}` | PASS | `"lt":{"code":"LOCK_TIMEOUT",…,"data":{"holder":"A"}}` |
| 6 | One deadline per call (#44) | PASS | `tabs.test.ts:851-875` green in the 950; holder `TIMEOUT` at 5104 ms for `timeoutMs:100` |
| 7 | The extension never receives `tab` | PASS | `AUDITB C5 {"framesReceived":35,"requests":34,"withTab":0,…}` |
| 8 | Legacy path (#41, #54) | PASS | `AUDITB C6 {"fwd1":{"ref":"e1","tabId":1},…,"noId":{"code":"BAD_PARAMS","message":"tab is required"},…}` |
| 9 | No-proto extension → `VERSION` (#42) | PASS | `AUDITB C7`: `{"code":"VERSION","message":"the Chrome extension is an older build — reload it …"}` |
| 10 | `networkClear {tab:"all"}` → `TAB_HELD` while another client holds a tab | PASS | `AUDITB C8 {"r":{"code":"TAB_HELD",…},"own":{"ok":true},"fwd":[{"scope":"all"}]}` |
| 11 | `tabGone`/`leaseGranted` shapes; resync on every proto:2 hello | PASS | `AUDITB C9 {"lg":{"event":"leaseGranted","params":{"tab":"T4","reason":"opener","url":…}},…,"resync":[1,1,1,0]}` |
| 12 | `daemon.status` `tabs`/`lock` | PASS | `AUDITB C10 … "stKeys":[…,"tabs","lock"],…,"lock":{"holder":"A"}` |
| 13 | `tabs.claim`/`tabs.release`/`newTab`/`listTabs` results | PASS | `nt:{"id":101,"tab":"T3"}`, `claim:{"tab":"T2"}` (idempotent), `rel:{"ok":true}` |
| 14 | `{__bridgeError}` → coded `BridgeError`; null/undefined → `REF_STALE` | PASS | `npx vitest run extension/test/zzB-extension.test.ts` → `AUDITB E1 [["coded",true,"LOCATOR_AMBIGUOUS",…],…,["null",true,"REF_STALE",…]]` |
| 15 | `listTabs`' `current` | PASS | `AUDITB E2`: `current` only on the last-focused normal window's active tab; argument `{"windowTypes":["normal"]}` |
| 16 | `SnapshotResult` fields (#58) | PASS | `AUDITB E3`: keys exactly `elements,title,truncated,url`; password value absent |
| 17 | Formatters byte-identical to `baseline-51de800.json`, and the test discriminates | PASS | `npx vitest run sdk/test/format-baseline.test.ts` → `37 passed`; mutated `snapshot.ts` → `21 failed`, `network.ts` → `7 failed`; restored → 37 passed |
| 18 | MCP cursor (#59): first-touch claim; does not follow `current`; moved only by select/new tab | PASS | `npx vitest run mcp/test/zzB-cursor.test.ts` → `AUDITB M1 {…,"afterHumanMoved":"T1",…,"clicks":[101,101,300,200,300,200]}` |
| 19 | One notice on the 4002 path | PASS (3 of 3) | `AUDITB M2 {"closeCodes":[4002],…,"notices":1}` |
| 20 | One notice on the non-4002 path (5 s retry) | PASS | `AUDITB M3 {"readoptMs":5010,"clients":2,"spawned":0,…,"notices":1}` |
| 21 | Forward path: extra params reach the extension unchanged, `tab` stripped, `tabId` added (A) | PASS | `zz-auditA-forward.test.ts` → `{"method":"click","params":{"ref":"e1","trusted":true,"focusEmulation":true,"tabId":101}}`; unlisted `locate` with `tab` → `TAB_HELD`; without `tab` → forwarded free (F8, a gap beside #39, not a breach) |
| 22 | A Step 7 daemon accepts a hello with `session` (A) | PASS | same file, test 2: `snapshot` forwarded `{"tabId":101}`. (A's saved log `out-forward.txt` shows 2 tests; its third test, the restart case, is corroborated by B's `BLIND-a`, row 23.) |
| 23 | A held handle across a Chrome restart (T2 verifier V4), today | as designed, hole confirmed | B `BLIND-a` → `"goneAfterReuse":[]`, `"clickForwarded":{"ref":"e1","tabId":2}` (F5) |
| 24 | Handles across a *daemon* restart (C) | not a Step 7 contract; ruling #11's premise FAILS | `npx tsx …/C/handles-collide.ts` → `daemon #2: T3 -> {"kind":"live","tabId":101}`; `{"ok":true}` (F2) |

## 3. Kickoff proposals #71–#77

| Decision | Verdict | Premise attack | Proposed amendment |
|---|---|---|---|
| #71 · Stage FE measures focus emulation before `policy.ts` is set | premise holds for the stage; **two rules wrong** | emulation raises a visible capturer → the target reads `visible` (F1); the table overlaps (B)/(C), leaves FE-0/FE-5 undefined, trials not independent, banner always present (F3); focus runs outside emulation (F4) | F1's FE-4 and FE-1/2 wording; F3's precedence, FE-5 first and last, fresh tab per trial, banner expected, positive control; F4's ordering; FE.2 additions (F19); FE.3 wider grep (F20) |
| #72 · S2's daemon half becomes stage S2b | premise holds (a separate stage); lane incomplete | `handlers/tabs.ts:70`, `handlers/network.ts:12`, `client.ts` (the hello) outside the lane; `recipes/` consumers of the `id` (F7, F9); S2b.3 "unchanged" cannot hold (F11); `selectTab` must be refused daemon-side (F10) | grant the files; rule the `id` (F7) and network-without-`tab` (F9); S2b.3 per F11 |
| #73 · S2b makes `code` required on error frames | premise holds (#51's trigger met); effect almost nil | receipt is already `INTERNAL` at once for both peer kinds (B `BLIND-d`) | S2b.4 asserts the log line per peer kind; lenient `fromWire` input type; say what happens to `WEIRD` (F17) |
| #74 · The extension hello carries an optional session marker | premise confirmed (B `BLIND-a`); **mechanism wrong as worded** | `storage.session` is cleared by a reload; `onStartup` races the top-level `connect()`; offscreen keys on port:token; repeated retire on none→none (F5) | F5's marker promise, fail-safe fresh marker, offscreen key, fifth branch, pre-restart `lastUrl`; SM-0 beside SM-1 |
| #75 · S3.4 applies as written | premise holds | A §2.8: esbuild of `index.ts` vs `index.ts` + the two re-exports → same external import list `["@bridge/shared","node:child_process",…,"ws"]`, +3 747 bytes; `format/{snapshot,network}.ts` import types only | none; add F14 (the `BridgeError` identity) beside it |
| #76 · `NO_CURSOR` enters `codes.ts` as the 23rd code | premise holds; structure needs a third list | `ErrorCode` = daemon ∪ extension lists; header "exactly 22" (F27) | `SDK_ERROR_CODES`; header and spec §10 note in S0's commit |
| #77 · The inherited-handles check runs in S3 as S3.5 | premise tested: passes at the baseline | without an inheriting control a broken harness passes; the pre-written MUX-6 note claims an unmeasured cause (F15) | positive control (stricter); outcome (c); reworded MUX-6 note (escalation) |

## 4. Rulings re-checked by premise

| Ruling | Premise check | Result |
|---|---|---|
| decisions.md · 2026-10-21 · Step 8 SDK-4 waits for the fixture's delayed text with a {text} locator (#7) | `#load-later` exists (`e2e-playground.html:120`, not 117); its text lands in a role-less `<div id="async-area">` (`:121`, `:252`); 0.1 does not say a `{text}` locator matches non-interactive elements | **premise unestablished** → F13 (a finding, not a disagreement) |
| · 2026-10-21 · Step 6 writes the DL rows for browser_download before its D6 wave (#5) | DL-1 `docs/e2e-test-plan.md:598`, DL-2 `:599` | holds |
| · 2026-10-21 · The actor name carries the MCP's own process id (#2) | `mcp/src/config.ts:10` `actorName(pid = process.pid)` → `claude-code #${pid}` | holds |
| · 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes (#9) | `docs/progress-and-roadmap.md:487` "`wait_for` variants (element-visible; …)", `:496` "Return a `[ref=eN]` for a `kind:"node"` result"; `args` at `:494` | holds |
| · 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon restart (#11) | `on("reconnected")` exists (`sdk/src/client.ts:219`, fired `:358-361`); "an explicit stale handle returns `TAB_UNKNOWN`" is false once the new daemon re-mints that number | **premise wrong** → F2 |
| · 2026-10-21 · selectTab stays as an alias of focusTab for one release (#2b) | alias at `sw.ts:32`, `handlers/tabs.ts:70`, `methods.ts:21`, `:63` | holds; new owner S2b; add `handlers/tabs.ts:70` (F9) and the daemon refusal (F10) |

## 5. Blind spots

**Kickoff §4 (c) seed list**

| Seed | Verdict | Home |
|---|---|---|
| `Tab.locate()` needs a wire method | confirmed; an unlisted method without `tab` is free (F8) | S2 (S2.6 + `daemon/test/methods.test.ts` grant); S2b refusal |
| SDK-1's `hello.ts` | confirmed, and wider: removing the `id` also changes `hello.ts:81` (F7) | a new recipe + S6.2 dated note (proposed, §6 of the phase doc notes) |
| SDK-8 without the user's Gmail | agree: a fixture tab in a driver-opened window, as LEASE-7 | S6 row note |
| A Step 7 MCP against an S2b daemon | executed by simulation: `mcp/test` + `sdk/test` `310 passed (310)`, `multi-actor.test.ts` unchanged | S2b.7 holds as written |
| A held handle across a Chrome restart today | executed: survives onto a reused id (row 23) | S2b (F5) |
| Failure-report screenshot on a covered/minimized window | confirmed; plus a failing screenshot attaching a second one, and lock contention (F25) | S4 states it; S5 shows `attachErrors` |
| Focus emulation and the human | emulation makes the target visible to its page (F1); the banner shows on every trusted call (F3) | FE-4 row text |
| MV3 culling and the session marker | confirmed; mechanism not settled (F5) | S2b + #74 amendment |
| The `unknown method` symptom | holds: FE-0's `focusEmulation:"on"` and S6's `locate` (with an explicit `tab`) are answerable only by the new build | FE.5 / S6 step 2 |
| Log hygiene | gaps: S2.4 covers only `url|href`; spec §8.2's sample message embeds a URL (F20) | S1/S2/S4 |
| Windows vs POSIX | record only; S3.5 measures Windows | S3.5 report line |
| The token | unchanged path; script stdout in run records is new exposure (F31) | S6 run-record rule |

**Extensions** (not in the seed list): stale handles across a daemon restart (F2); the locator `text`
field collision (F12); `{text}` semantics (F13); `asRef` across shadow roots and frames (F21);
`handlers/network.ts`'s hidden fallback and network-without-`tab` (F9); the exported `BridgeError`
class (F14); the MCP and `report()` (F25); focus order under emulation (F4); `id` consumers (F7);
locator failures and escalation (F23); `waitFor` vs the call timeout, including today's
`browser_wait_for {seconds: 45}` (F22); page-side polling in a hidden tab (F23); event ordering and
the cursor (F24); `browser_new_tab` with no cursor (F26); S2b.6's grep scope (F18); `hello.ts` titles
in records (F31); `NO_CURSOR`'s home in `codes.ts` (F27); the marker store vs the network log's
`storage.session` keys (harmless, `network-state.ts` filters by `KEY_PREFIX`; a failed `set` at quota
could fail a marker write — folded into F5); `selectTab` without the lock in the rebuild window (F10);
the failure marker without `data` (F6).

## 6. Testability

Kind: **U** unit/grep/git (builder-runnable) · **L** live row the driver runs · **H** needs the user.
All pass rules are written before measurement except where noted.

| ID | Kind | Can it fail? | Fix if not discriminating |
|---|---|---|---|
| S0.1 | U | yes | — |
| S0.2 | U | **no** — both codes present since Step 6 (`codes.ts:23-24`) | label it a confirmation |
| S0.3 | U | weakly (read) | type tests (F20) |
| S0.4 | U | yes (22 today) | name the command (F27) |
| S1.1 | U | yes | — |
| S1.2 | U | yes, if the pre-S1 capture exists | capture `buildSnapshot` over every `snapshot.test.ts` fixture on S1's parent into a fixture file (the #47 pattern) |
| S1.3 | U | yes | add the `{text}` rule once ruled (F13) |
| S1.4 | U | partly | add the `buildSnapshot` grep (F20) |
| S1.5 | U | yes | — |
| S2.1 | U | yes | — |
| S2.2 | U | **second grep cannot** (exit 2, empty stdout) | `-rn`, moved to S2b.2 (F16) |
| S2.3 | U | yes | add "`LOCATOR_*` does not escalate" (F23) |
| S2.4 | U | yes, narrowly | widen the pattern (F20) |
| S2.5 | U | yes | — |
| S2.6 | U | yes (exact list test) | `daemon/test/methods.test.ts` grant (F8) |
| S3.1 | U | yes | — |
| S3.2 | U | yes | cite the FE rows and "The background-input policy" decision too (stricter) |
| S3.3 | U | yes | name the methods whose call carries no forwarded `tab`: `download` (free methods), `network({id})`, `release` (`tabs.release {tab}`) |
| S3.4 | U | yes | per #75; F14 beside it |
| S3.5 | U | **only with a positive control** (B's inherit control: no EOF in 2 s) | add the control (F15) |
| S4.1 | U | yes | — |
| S4.2 | U | yes | iterate all codes (F20) |
| S4.3 | U | weakly | `grep -rn "console\." sdk/src` (F20) |
| S5.1 | U | yes | — |
| S5.2 | U | yes | — |
| S5.3 | U | yes | add the no-cursor branch (F26) |
| S5.4 | U | judgement | `grep -c browser_use_active_tab docs/setup.md docs/e2e-test-plan.md` ≥ 1 each |
| S6.1 | L | yes | `git log` order; `/mcp` clause per F32 |
| S6.2 | L | yes | per the SDK-1 recipe ruling |
| S6.3 | H (SDK-7 on the user's course) | yes | — |
| S6.4 | U | **half** — `~/.chrome-agent-bridge/` can never be staged | F20 |
| S6.5 | L | yes | rows S2b/S5 change on purpose run against re-dated text |
| S7.1 | U | yes | — |
| S7.2 | U | yes, if extracted | extract the snippet to a scratch file under `recipes/`, `tsc --noEmit -p recipes` |
| S7.3 | U | yes | — |
| S7.4 | U | **no** (a disclosure check) | acceptable as disclosure |
| FE.1 | U | yes | — |
| FE.2 | U | yes, once today's list is recorded (A recorded it, F19) | builder + runner tests (F19) |
| FE.3 | U | weakly | wider grep over more files (F20) |
| FE.4 | U | yes | — |
| FE.5 | L | yes | — |
| FE.6 | U | yes | needs the table made total (F3) |
| S2b.1 | U | yes | — |
| S2b.2 | U | yes | add the `targetTab({}` grep (F9); exit 1 required (F16) |
| S2b.3 | U | **cannot hold as written** (B's simulation: 9 lease/lock tests use a removed form) | F11 (escalation); `selectTab` test against a fake that answers it (F10) |
| S2b.4 | U | partly — only the log line differs from today (B `BLIND-d`) | assert the log line per peer kind (F17) |
| S2b.5 | U | yes | fifth branch; pre-restart `lastUrl` (F5) |
| S2b.6 | U | **cannot pass unscoped** (`e2e-test-plan.md:677`, `:1561`) | scope (F18, escalation) |
| S2b.7 | U | yes; held under B's simulation | — |
| S2b.8 | U | yes | — |

Needs the user: S6.3 (SDK-7), SDK-6, SM-1 (Chrome restart grant), any reload with a non-zero exit. Rows
with no expected text yet, all due before their run: FE-0…FE-5, SDK-1…SDK-8, SM-1 (and SM-0 if
adopted). Existing rows to re-date before any run if S2b/S5 change them on purpose: MUX-3/5/6/8/10
(`hello.ts`'s `[<id>]`), LEASE-5/6 (`chrome id`), STAT-1 and MUX-1 (`Cursor:` line), TAB-1…4 (a
background first `newTab`), SCREEN-4 (`WINDOW_MINIMIZED` text).

## 7. Proposed stage split (for the session agent's `journal.md`)

Kickoff §7 default, adjusted. Order unchanged: Stage 0 → S0 → (S1 ∥ FE build) → FE live (alone) → S2 →
(S2b ∥ S3) → S4 → S5 → S6 → S7.

| Stage | Default | Proposed | Why |
|---|---|---|---|
| 0 — audit + resolutions | 1.5 h | 2 h | 35 findings; the rulings on F1, F3, F6, F11, F15, F18, F32 and the contract-level decisions (F2, F5, F7, F9, F12, F13, F14) land before S0 |
| S0 — types | 0.5 h | 0.75 h | `SDK_ERROR_CODES` (F27); `{text}`/`WaitForParams` shapes (F13, F28); type tests |
| S1 — `locate` | 2 h | 2.25 h | the pre-S1 capture (S1.2); `__bridgeData` if F6 is accepted |
| FE | 1.5 + 1.5 h | 1.75 + 1.5 h | the recorded-sequence fixture (F19); the focus ordering (F4); fresh tab per trial (F3) |
| S2 | 2.5 h | 2.5 h | + the `daemon/test/methods.test.ts` grant (F8) |
| S2b | 2.5 h | 4 h | + `handlers/{tabs,network}.ts`, `client.ts`; the `id` consumers if removed (F7); the marker's ordering and fifth branch (F5); the daemon-side `selectTab` refusal (F10); F2 option (a), handles never re-minted across daemons (+0.5 h); the marker choice as a pure, tested function (F5, +0.25 h) |
| S3 | 3 h | 3.5 h | + the stale-`Tab` guard (F2), the `BridgeError` identity (F14), S3.5's control (F15) |
| S4 | 2 h | 2 h | — |
| S5 | 2.5 h | 3 h | + the locator-field schema (F12), the no-cursor branch (F26), row re-dating; + the MCP-local stale-handle guard (F2 option (b), +0.25 h) only if the user rejects (a) |
| S6 | 1.5 + 3 h | 1.5 + 3.25 h | + SM-0 |
| S7 | 1 h | 1 h | — |

F2's home follows its recommendation (c): (a) in S2b, the `Tab` guard in S3. Neither option changes the wire.
If the user rejects (a), S2b drops to 3.5 h and S5 rises to 3.25 h.

## 8. Chrome facts table

Kickoff §4 (a) asks four questions about Chrome. The answers come from Chromium `main` and the Chrome
docs, fetched 2026-10-23 by auditor A and, for the rows marked V, again by the verifier with `curl -sS`.
All are **unconfirmed for Chrome 156** (this machine) until the live rows named in the last column run.

| Question | Answer | Source | Confirmed live by |
|---|---|---|---|
| Does `Emulation.setFocusEmulationEnabled` exist, and can an extension send it? | Yes. An experimental command, `enabled: boolean`; the Emulation domain is on `chrome.debugger`'s list of available domains | https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Emulation.pdl ("experimental command setFocusEmulationEnabled"); https://developer.chrome.com/docs/extensions/reference/api/debugger ("The available domains are: … Emulation …") | FE-0, FE-1 |
| Is it per debugger session? | Yes. The state is a member of the session's `EmulationHandler` | `content/browser/devtools/protocol/emulation_handler.cc:1051-1067` (V) | FE-1 |
| Is it cleared on detach? | Yes. `EmulationHandler::Disable()` turns it off, and `DevToolsSession::Dispose()` calls `Disable()` on every handler | `emulation_handler.cc:225-229` "`if (focus_emulation_enabled_) SetFocusEmulationEnabled(false);`" (V); `content/browser/devtools/devtools_session.cc:177` `DevToolsSession::Dispose()`, `:180` `pair.second->Disable();` (V) | FE-1/FE-2's read after the call returns (F1) |
| Does it change `document.visibilityState`? | Yes: the page reads `visible` while it is on. Enabling it raises a *visible* capturer on the tab, and any visible capturer makes the page visible. Nothing in that code activates the tab or touches a window | `emulation_handler.cc:1059-1062` `capture_handle_ = GetWebContents()->IncrementCapturerCount(gfx::Size(), /*stay_hidden=*/false, …)` (V); `content/browser/web_contents/web_contents_impl.cc:2818` `++visible_capturer_count_;` (V); `:5271-5273` `if (visibility == Visibility::VISIBLE \|\| visible_capturer_count_ > 0 \|\| …) return PageVisibilityState::kVisible;` (V) | FE-4's observation (F1) |
| Does it change `document.hasFocus()`? | Yes, by source reading: `IsFocused()`/`IsActive()` return true while emulating, and focus/blur fire on the switch | `third_party/blink/renderer/core/page/focus_controller.h:124`, `:127` (`… \|\| is_emulating_focus_`); `inspector_emulation_agent.cc:603-612` | FE-1…FE-3 |
| Does trusted `Input.*` then reach a background tab's page? | Unknown. The renderer is no longer hidden, which suggests it may; nothing in the source proves it | — (this is what FE-1/FE-2/FE-3 measure) | FE-1, FE-2, FE-3 |
| Does a MAIN-world DOM attribute reach the ISOLATED world (0.3, `evaluateRef`)? | Yes, by the docs: the worlds are isolated for JavaScript but "share access to the page's DOM" | https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts | SDK-5 |
| Lifetimes for the session marker (#74) | `storage.session` is cleared by a reload, an update, a disable and a browser restart; `storage.local` only when the extension is removed; `onStartup` fires when the profile first starts; a reload of an unpacked extension fires `onInstalled` with reason `update` | https://developer.chrome.com/docs/extensions/reference/api/storage; https://developer.chrome.com/docs/extensions/reference/api/runtime | SM-0 (if adopted), SM-1 |

Auditor A's full cite table (68 cites: 57 OK, 4 at another line, 7 wrong, 0 missing) stays in the
session scratchpad (`…/scratchpad/stage0/A/auditA.md` §1) and is not kept in the repo. Its corrections
are in F30 and in the findings built on its rows: F1 (#64), F8 (#19), F9 (#38, #59), F29 (#51-#53).
Its OK rows that carry a finding feed F5, F7 and F9.
