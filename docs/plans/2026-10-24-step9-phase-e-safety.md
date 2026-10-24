# Step 9 — Phase E: safety (the human's kill switch, a JavaScript switch, blocked sites)

**Date:** 2026-10-24 · **Status:** Planned (kickoff `docs/plans/next-session-prompt.md`)
**Design of record:** this doc's "Decisions" (the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
binds for everything it does not change: §5 layer contract, §6 the human, §10 protocol and codes) ·
**Roadmap:** `docs/progress-and-roadmap.md` §5 Phase E · **As-built:**
`docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` (created at the first stage close) ·
**Steps dir:** `docs/plans/2026-10-24-step9-phase-e-safety-steps/` (created at kickoff).

## Why

The bridge drives the user's real, logged-in Chrome. Since Step 4, `browser_evaluate` runs arbitrary
JavaScript with the page's full authority plus a user gesture; since Step 8, scripts can do the same
without a model in the loop. The only boundaries today are the `127.0.0.1` bind and the token. The
human has no way, inside Chrome, to say "stop now", "no JavaScript", or "never touch my bank". Phase E
gives the human those three controls, enforced in the browser itself, so they hold whatever the
daemon, a client or a leaked token does.

## Outcome

*(Written at close as results: test counts per stage with the command, the new codes, the E2E rows
with their observed text.)*

## Decisions

Decided with the user on 2026-10-24 (decisions.md · 2026-10-24 · Phase E's design: the kill switch, the
disarmed state, blocked sites, the JavaScript switch (#128)): the four choices marked **(user)** below.
Everything else is proposed by this doc, audited at Stage 0, and recorded by the session agent.

### 0.1 Enforced in the extension, by one pure gate (proposed)

Every method the service worker's router serves passes one gate before its handler:
`safetyDecision(method, params, tabUrl, state) → allow | {code, message, data?}`, a pure function in
`extension/src/safety.ts`, unit-tested over every method. A table classifies **every** router method
(today 23: `navigate snapshot screenshot click type scroll hover selectOption pressKey back forward
listTabs focusTab newTab closeTab waitFor evaluate locate networkRequests networkClear downloadStart
downloadChunk downloadEnd`); a test fails when a method is registered with no class, so a new method
cannot bypass the gate. The daemon and the SDK enforce nothing new: the browser is the boundary,
because it is the one place the human controls and the token does not reach.
**Never:** a wire method, daemon method or SDK call that arms, disarms, edits the block list or turns
JavaScript on. Only the human changes the safety state, through the extension's own UI.

### 0.2 The kill switch: toolbar button, options page, keyboard shortcut (user)

- The manifest gains an `action` (toolbar button, no popup) and a `commands` entry. One click on the
  button, or the shortcut (suggested `Alt+Shift+K`, changeable at `chrome://extensions/shortcuts`),
  toggles **armed ↔ disarmed**. The options page has the same switch.
- State `armed: boolean` in `chrome.storage.local`, default **true** (today's behaviour), surviving
  worker restarts, reloads and Chrome restarts. The gate reads it per call (no top-level `await`;
  `storage.onChanged` may keep a cache, but a call never acts on a state older than the last change).
- The badge shows `OFF` (red) while disarmed, nothing while armed; the button's title says which.
- The `action.onClicked` and `commands.onCommand` listeners are registered at the top level of `sw.ts`
  (`CLAUDE.md`: listeners must exist on every worker start).

### 0.3 What "disarmed" does: refuse page calls (user)

- Every method that reads or acts on a page — navigation, input, snapshot, screenshot, `locate`,
  `waitFor`, `evaluate`, `focusTab`, `newTab`, `closeTab`, the network and download methods — is
  refused with a new code **`DISARMED`** (message: the user has turned the bridge off in Chrome; ask
  them to turn it on). `listTabs` and the hello still answer, so agents can say why; the daemon's own
  `daemon.status`, `tabs.claim`/`tabs.release` are untouched (bookkeeping, no page).
  *Proposed, for the audit:* `listTabs` while disarmed returns handles and `current` but not titles or
  URLs.
- At the moment of disarming: every debugger session the extension holds is detached (the banner goes),
  `waitFor` polls stop at their next tick with `DISARMED`, a pending download is dropped from the
  `DownloadStore`.
- The network log **records nothing while disarmed** (proposed): its observers drop events, so traffic
  of the disarmed period never reaches an agent after re-arming.
- `DISARMED` is not in the failure-report attach set (a report would only be refused too).
- The socket stays up; `browser_status` and the SDK see the state (0.6).

### 0.4 Blocked sites: a block list, empty by default (user)

- The options page holds one host pattern per line: `bank.com` (that host and its subdomains),
  `*.bank.com` (subdomains only), `localhost:8081` (host and port). Exact grammar, IDN/punycode, IP
  literals, ports, case and trailing dots are settled at Stage 0 and unit-tested.
- A call whose tab's current URL matches is refused with a new code **`DOMAIN_BLOCKED`**; so is
  `navigate`/`newTab` to a matching URL, and `downloadStart` whose URL **or final URL after redirects**
  matches. A tab the human navigates onto a blocked site while an agent holds it is refused from the
  next call.
- `listTabs` and tab events carry no title or URL for a blocked tab (proposed); the network log records
  no entry whose URL host is blocked (proposed).
- Empty by default: nothing changes until the human adds a line.
- **The extension's own pages are always blocked** (proposed, not configurable):
  `chrome-extension://<this id>/…` — otherwise an agent could open `options.html` and re-arm itself or
  empty the list with trusted input.

### 0.5 The JavaScript switch (user)

- Options-page switch **"Allow JavaScript (`browser_evaluate`)"**, default **on** (today's behaviour).
  Off → `evaluate` (with or without `asRef`) is refused (`DISARMED` with `data.scope: "evaluate"`, or a
  code of its own — Stage 0 rules); every other tool keeps working. The badge or title says `JS off`.
- The Blackboard recipes need it on (`boot-bb.ts` loads `bb.js` by `evaluate`); `docs/setup.md` says so.

### 0.6 Agents see the state (proposed)

- The extension reports `{armed, evaluate, blockedCount}` (never the patterns) to the daemon on hello
  and on every change; the daemon relays it to clients the way it relays `extensionStatus`.
  `browser_status` prints `Safety: armed | DISARMED by the user · JavaScript on|off · N blocked sites`;
  the SDK exposes it read-only. Wire shape (a new event or a field on an existing one) is ruled at
  Stage 0, conservative rule.
- The MCP renders `DISARMED` / `DOMAIN_BLOCKED` as one plain line telling the model to stop and ask the
  user, never to retry in a loop.

### 0.7 Nothing new is logged (proposed)

The roadmap's "never log page content or tokens" becomes an executable check: a test enumerates every
log call site in `extension/src`, `daemon/src`, `sdk/src`, `mcp/src` (static scan) against an allowlist
of what each may print; the block-list patterns, URLs, titles and the token are never logged; the
toggles log one line each (`safety: disarmed by the user`, no pattern, no URL).

## Stages

One stage per part. **Lane** is the explicit grant a step agent needs under the `step-agent`
ESCALATION list.

### Stage S0 — Types and codes
- [ ] Spec §10 amended first (dated note), then `DISARMED` and `DOMAIN_BLOCKED` in
      `shared/src/codes.ts` (25 codes: 24 on the wire, `NO_CURSOR` from the SDK); the safety-state
      type and its guard; the wire shape ruled at Stage 0 (0.6).
**Lane:** `shared/src/`, `shared/test/`, `docs/specs/…-design.md` (§10 note). **Parallel with:** first, alone.

### Stage S1 — The gate and the host matcher (pure, TDD)
- [ ] `extension/src/safety.ts`: the method table (every router method classified), `safetyDecision`,
      the host-pattern parser and matcher, the `listTabs`/event redaction, the network-log filter
      predicate. Failing tests first.
**Lane:** `extension/src/safety.ts`, `extension/test/`. **Parallel with:** S3 (file-disjoint).

### Stage S2 — Extension wiring and UI
- [ ] The router calls the gate before every handler; `storage.local` state with defaults;
      `storage.onChanged`; disarm → detach debuggers, stop waits, drop pending downloads, stop network
      recording; manifest `action` + `commands`; top-level `action.onClicked` / `commands.onCommand`;
      badge and title; the options page (switches, block list, a link that opens
      `chrome://extensions/shortcuts`); the own-extension-page block; download final-URL check.
**Lane:** `extension/src/` (`sw.ts`, `router.ts`, `options.ts`, `handlers/*`, `network-state.ts`,
`debugger.ts`), `extension/options.html`, `extension/manifest.json`, `extension/test/`.
**Parallel with:** after S1.

### Stage S3 — Daemon relay, SDK and MCP
- [ ] The daemon relays the safety state; `daemon.status` carries it; the SDK exposes it read-only;
      `browser_status`'s `Safety:` line; the MCP's one-line rendering of the two codes; both codes stay
      out of the attach set (a test).
**Lane:** `daemon/src/`, `daemon/test/`, `sdk/src/`, `sdk/test/`, `mcp/src/`, `mcp/test/`.
**Parallel with:** S1 (types from S0 only); cross-package verifier over real `ws` with a fake extension.

### Stage S4 — E2E (live, the driver's; rows `SAFE-*` in `docs/e2e-test-plan.md` §4.20)
- [ ] Rows written and committed before the build is loaded (proposed list, Stage 0 completes it):
      SAFE-0 stale check (a call refused `DISARMED` only the new build can give); SAFE-1 toolbar click
      disarms → badge `OFF` → an SDK call and an MCP call get `DISARMED` → click re-arms → both work;
      SAFE-2 the shortcut does the same; SAFE-3 the options switch; SAFE-4 disarm during a running
      `waitFor` and a trusted action's debugger session → refused within one poll, banner gone;
      SAFE-5 `localhost:8081` blocked → calls on the 8081 fixture tab and `navigate` to it refused, the
      8080 fixture works, `listTabs` shows no 8081 title/URL, the network log has no 8081 entry;
      SAFE-6 JavaScript off → `evaluate` refused, `click` works; SAFE-7 `navigate` to the extension's
      options page refused; SAFE-8 nothing recorded in the network log while disarmed; SAFE-9 every
      toggle survives an extension reload (by script); SAFE-10 the log scan: no pattern, URL or token
      in `daemon.log` or the worker's console lines captured during the wave.
- [ ] **The wave ends with the safety state restored** — armed, JavaScript on, the block list exactly
      as it was before the wave (read and recorded at the start) — and the record shows the read-back.
**Lane:** `recipes/`, `docs/e2e-test-plan.md`, the steps dir.

### Stage S5 — Docs
- [ ] `docs/setup.md` "Safety" section (the three controls, the shortcut, what agents see, the
      JavaScript switch and the Blackboard recipes, the own-page block); `CLAUDE.md` (key files,
      gotchas measured in S4); `README.md` security paragraph; the roadmap's Phase E block.
**Lane:** docs only.

## Exit checks (pre-registered)

- **S0.1** `npm test` ≥ before + new; typecheck green. **S0.2** `codes.ts` lists 25 codes with the two
  new ones on the wire lists; spec §10's dated note precedes the code commit (`git log` order).
- **S1.1** every name passed to `router.on(` in `extension/src/sw.ts` appears in the safety table — a
  test that reads the router's registered names, and fails when one is added unclassified (shown by a
  mutation). **S1.2** `safetyDecision` tested for every class × {armed, disarmed} × {JS on, off} ×
  {blocked, not blocked, own-extension page}. **S1.3** the matcher's table of cases (≥ 20, including
  subdomain vs suffix-lookalike `notbank.com`, port, IDN, IP, case, trailing dot, empty and invalid
  lines) written before the matcher.
- **S2.1** no handler runs before the gate (a test over the router with a disarmed state: zero handler
  calls). **S2.2** disarm detaches every attached debugger (test with a stubbed `chrome.debugger` where
  the glue is unit-testable; else an E2E row). **S2.3** `grep -rn "safety" extension/src` shows no log
  line printing a pattern or URL. **S2.4** the content script bundle is still an IIFE; no top-level
  `await` in `sw.ts`.
- **S3.1** `DISARMED` and `DOMAIN_BLOCKED` are not in `ATTACH_CODES` (test). **S3.2** `browser_status`
  prints the `Safety:` line in all four armed × JS states (test). **S3.3** no new client-to-daemon or
  daemon-to-extension method changes the safety state (`grep` over `methods.ts` and the router: no
  `arm`/`disarm`/`setSafety`/`block`, empty and exit 1).
- **S4.1** rows committed before the build is loaded. **S4.2** the reload script's exit 0 and SAFE-0 are
  the first recorded lines. **S4.3** every SAFE row's observed text in the record. **S4.4** the final
  safety-state read-back equals the start's.
- **S5.1** `setup.md` documents the three controls and the shortcut; every new gotcha cites its source.

## Human gates

- **G9-1** — the E2E wave toggles the **user's real extension's** safety state and presses Chrome's
  toolbar button and shortcut by UI automation in the driver's own window (as `reload-extension.ps1`
  does for the reload). Covered by decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to
  end (#33) and #64/#65 for UI automation of the extension card; the restore of S4 is mandatory. A
  restore that fails stops the run and asks the user.
- **G9-2** — pinning the extension's button to the toolbar, if UI automation cannot reach an unpinned
  button: the driver may pin it by UI automation; if that fails, ask the user once.

## STOP rules and forbidden fixes

**Stops the gate:** a router method reachable without the gate; any path by which a client changes the
safety state; the own-extension-page block missing; a log line carrying a pattern, URL, title or the
token; the safety state not restored after S4; a `CLAUDE.md` runtime invariant that would have to
change.

**Forbidden fixes:** exempting a method from the gate to make a row pass; a wire, daemon or SDK method
that arms, disarms, edits the list or enables JavaScript; arming by default on a reload after the human
disarmed; enforcing in the daemon or SDK instead of the extension (they may only add to it); matching
blocked hosts by substring; logging a pattern or URL to debug the matcher; weakening any Step 6–8
invariant (leases, the lock, the cursor rule, the token gate, the bind).

## Open items

- Ruled at Stage 0 (conservative rule, listed for the user): the wire shape of 0.6; one code or two
  for the JavaScript switch (0.5); `listTabs` redaction while disarmed and for blocked tabs; the network
  log while disarmed; the exact pattern grammar.
- Not this step: an audit log of agent actions (it would log page content: needs its own design);
  per-client permissions; Chrome's own "site access" for the extension (`host_permissions` stays
  `<all_urls>`).

## Follow-ups (later steps, planned 2026-10-24 — decisions.md · 2026-10-24 · The roadmap after Step 8 (#129))

- **Step 10 — Step 8 follow-ups:** the six work items of wave W2 (#106 MCP trusted tools focus first;
  #117 a warning past the snapshot's 800 cap; #125 a squashed `step8` release tag; #126 a live N ≥ 1
  retire row; #127 `browser_evaluate {saveTo}` and S6.3 redone through it) and the carried inputs
  (the ~1.5 s failure-report screen switch; `bb-login.ps1`'s condition-based post-submit wait).
- **Step 11 — D3 file upload:** `browser_upload_file` / `Tab.upload` via `DOM.setFileInputFiles`.
- **Step 12 — Phase F items:** `args` for `browser_evaluate`, console/error capture, and the
  keep-attached debugger session if the design allows.
