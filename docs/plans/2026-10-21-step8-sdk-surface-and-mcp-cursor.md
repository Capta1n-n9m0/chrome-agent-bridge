# Step 8 — The SDK surface: locators, typed `Tab`, failure reports, MCP cursor, first recipes

**Date:** 2026-10-21 · **Status:** Planned
**Design of record:** docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md (§8) ·
**As-built:** docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md (does not exist yet;
written at stage close) · **Steps dir:** docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/
(does not exist yet; created at kickoff for ledgers, briefs, reports and evidence)

**Prerequisites:** Steps 6 and 7 complete and E2E-passed — in particular the **BG-1/BG-2 findings**
(trusted input into a background tab, Step 7's T5 wave) decide whether `trusted` actions in the SDK
call `focus()` first. This step's **Stage-0 spec audit re-examines Step 7's as-built register by
execution** — handles, leases, the lock, the `CODE:message` convention and the structured snapshot are
exercised, not read, before S0 starts.

## Outcome

Targets at planning time; rewritten as results when the step closes.

- Claude can write a working script against the SDK from its types alone, and fix a failing one from
  the error alone (spec §8.2).
- Locators (`{role, name}`, `{text}`, `{css}`) are resolved in the content script by the snapshot's own
  rules, so what Claude saw in a snapshot is what a locator matches; `waitFor({locator})` exists;
  an `evaluate` node result can be turned into a ref.
- A typed `Tab` API with the actor's cursor; a `BridgeError` that carries a snapshot, a screenshot path
  and the last 20 network entries, rendered by `error.report()`.
- The MCP cursor does **not follow the human** unless told to (`browser_use_active_tab`); tool count
  22 → 23 (baseline 22 at Step 7's close; 21 today per `server/src/tools/registry.ts`). *Corrected
  2026-10-22: was `server/src/tools/registry.ts`; as built `mcp/src/tools/registry.ts` (Step 6 D1) —
  see Step 6 as-built § Stage D1.*
- The first two recipes — a one-line `bb.js` boot and a read-only Blackboard grade export — run as the
  dogfood; tests and typecheck green at every stage close, counts recorded per stage.

Test-driven development applies to the content-script `locate` (jsdom, the same fixtures as
`snapshot.test.ts`), to the SDK's locator normalisation, `BridgeError` enrichment (fake client), the
cursor logic, and the MCP tools. The `node → ref` round trip and the recipes are E2E. Each stage leaves
`npm test` and `npm run typecheck` green. Extension changes (S1, S2) are invisible until the user reloads
the extension — an `unknown method` error means the loaded extension is stale (`CLAUDE.md` gotcha).

**Goal:** Make the SDK something Claude can write a working script against from the types alone, and
make its failures something Claude can fix from the error alone. Locators (`{role, name}`, `{text}`,
`{css}`) resolved by the snapshot's own rules; `waitFor({locator})`; `evaluate` results that can be
turned into refs; a typed `Tab` API with the actor's cursor; a `BridgeError` that carries a snapshot,
a screenshot and the recent network entries; the MCP's cursor that **does not follow the human**
unless told to (`browser_use_active_tab`); and the first two recipes — a one-line `bb.js` boot and a
Blackboard export — as the dogfood.

**Non-goals:** self-healing / Agent-SDK-in-the-loop (explicitly rejected); a Python SDK; recording a
Claude MCP session into a script automatically (Claude writes the script by hand from what it saw);
XPath locators; drag; file upload (D3, still separate); a recipes runner/scheduler.

**Files touched:**
- `shared/src/protocol.ts` (`Locator`, `LocateResult`), `shared/src/codes.ts` (verify `LOCATOR_*`)
- `extension/src/content/locate.ts` (new, pure) + `content/index.ts` (`locate`, `refOfNode`),
  `handlers/actions.ts` (accept `locator` or `ref`), `handlers/wait.ts` (`locator`), `handlers/evaluate.ts`
  (`asRef` → returns `ref` for a node result), `tabs.ts` (remove the `activeTab()` fallback), tests
- `sdk/src/tab.ts` (new), `sdk/src/locator.ts` (new), `sdk/src/error.ts` (enrichment), `sdk/src/client.ts`
  (cursor, `tab()`, `newTab`, `claim`), `sdk/src/index.ts`, tests
- `mcp/src/tools/registry.ts` (`browser_use_active_tab`, cursor, status divergence line, `ref | locator`
  on actions), tests
- new `recipes/README.md`, `recipes/hello.ts`, `recipes/blackboard/boot-bb.ts`, `recipes/blackboard/export-grades.ts`
- root `package.json` (`tsx` dev dep, `npm run recipe -- <file>`), `docs/*`, `CLAUDE.md`,
  `~/.claude/skills/blackboard-ultra` (separate repo: the boot sequence shrinks to one SDK call)
- *Corrected 2026-10-22: was "new `recipes/hello.ts`" and a new `tsx` dev dependency; as built
  `recipes/hello.ts` and `recipes/tsconfig.json` exist from Step 6 D6 (rows MUX-3, MUX-5, MUX-6, MUX-8
  and MUX-10 judge the recipe's exact output), and `tsx` has been a root devDependency since Step 6 D1
  (decisions.md · 2026-10-22 · D1's interim wiring: daemon skipped by the build until D3, a
  `./connection` export, a hand-edited lockfile); S6 adds only the `recipe` script — see Step 6
  as-built § Stage D1, § Stage D6.*

**Order of work:** S0 (types) → S1 (content `locate`, TDD) → S2 (extension handlers accept locators;
node→ref) → S3 (sdk `Tab`, cursor, locator normalisation, TDD) → S4 (sdk failure enrichment, TDD) →
S5 (mcp cursor + tools) → S6 (recipes, E2E) → S7 (docs). S1 and S3 are independent. S2 needs S1.
S4 needs S3. S5 needs S3+S4. S6 needs everything.

---

## Decisions

The decisions below were taken in the design spec and in this plan on 2026-10-21 and are **not
reopened** during the build: they are contract decisions in the sense of the `long-run` skill §3 (the
SDK's public surface, the locator rules, MCP tool names and schemas, what the human sees). A new
decision taken while building goes to `docs/decisions.md` (cited by date + title), never into this
section; the run itself is governed by decisions.md · 2026-10-21 · Steps 6–8 run under the long-run
contract. The one value this plan leaves to a measurement — the `trusted` → `focus()` policy of 0.4 —
is set from Step 7's BG-1/BG-2 findings and recorded in `docs/decisions.md` at S3.

### 0.1 Locators are resolved by the snapshot's rules, in the content script

```ts
type Locator =
  | { role: string; name?: string | { regex: string; flags?: string }; exact?: boolean; nth?: number }
  | { text: string; exact?: boolean; nth?: number }
  | { css: string; nth?: number };
```
`content/locate.ts` reuses `roleOf`, the accessible-name computation and the pruning/`hasLayout`
gates from `snapshot.ts` (today `roleOf` at `extension/src/content/snapshot.ts:50`, `hasLayout` at
line 74; refactor them into `content/a11y.ts` so both import the same functions — the invariant is
*what Claude saw in a snapshot is what a locator matches*). `name` matching: case-insensitive substring
by default, `exact: true` for equality, `{regex}` for patterns. Result: `{ref, role, name}`; zero
matches → `LOCATOR_NOT_FOUND {candidates}` where candidates are the up-to-5 nearest same-role elements
by name similarity (simple normalised Levenshtein / token overlap — pure, tested); more than one match
without `nth` → `LOCATOR_AMBIGUOUS {matches: [{ref, name}…]}`. A `{css}` locator matches any element
(not only interactive ones) and the ref is minted on the spot. `locate` does **not** reset the RefMap
(it adds), so refs from the last snapshot stay valid.

### 0.2 Actions take `ref | locator`

Extension handlers `click/type/hover/scroll/selectOption/pressKey` accept `p.ref` **or** `p.locator`;
with a locator they call `locate` first (in the same `callInPage` round-trip where possible) and then
act. The SDK always sends whichever the script gave. `waitFor {locator, state?: "visible"|"hidden",
timeoutMs}` polls `locate` every 100 ms up to the timeout (default 10 s; `hidden` resolves when
`locate` throws `LOCATOR_NOT_FOUND`).

### 0.3 node → ref

`evaluate {expression, asRef: true}`: when the result is `kind: "node"` and the node is an `Element`,
the handler calls the content script's `refOfNode` — but the node lives in the MAIN world and the
RefMap in the ISOLATED world. Bridge: the evaluate path (CDP) sets a `data-__bridge-mark="<uuid>"`
attribute on the element via `Runtime.callFunctionOn`, the content script finds `[data-__bridge-mark]`,
mints a ref, removes the attribute. Returns `{…envelope, ref}`. Pure parts (`markScript`, attribute
name) tested; the round trip is E2E (SDK-5).

### 0.4 The typed `Tab` and the cursor (`sdk/src/tab.ts`, `client.ts`)

```ts
class Tab {
  readonly handle: string;             // "T3"
  navigate(url): Promise<void>;        back(); forward();
  snapshot(): Promise<SnapshotResult>; screenshot({fullPage?, mode?, path?}): Promise<Buffer | string>;
  click(target: Target, {trusted?}); type(target, text, {submit?, trusted?}); pressKey(key, {trusted?});
  hover(target); scroll({target?, direction?}); selectOption(target, values);
  locate(locator): Promise<{ref, role, name}>; waitFor({text?} | {locator, state?} | {networkIdle, idleMs?} | {seconds});
  evaluate<T = unknown>(expression, {timeoutMs?}): Promise<T>;       // EvalEnvelope.value, typed by caller
  evaluateRef(expression): Promise<string>;                            // asRef
  network({filter?, types?, failedOnly?, limit?, includeHeaders?} | {id}): Promise<NetworkEntry[]>;
  networkClear(); download(url, path, {overwrite?, timeoutMs?}); focus(); close(); release();
}
type Target = string /* ref */ | Locator;
```
`BridgeClient`: `newTab(url?, {active?}) → Tab` (sets cursor), `claim(handle | {active:true}) → Tab`
(sets cursor), `tab()` → cursor (throws `NO_CURSOR` with "call newTab() or claim() first" if none),
`tabs() → [{handle, title, url, owner?, active}]`, and every `Tab` method mirrored on the client acting
on the cursor (`b.click(...)`). `trusted` actions: **if BG-1/BG-2 passed**, no focus; **if they
failed**, `Tab.click({trusted:true})` calls `focus()` first and documents the flash.

*Amended 2026-10-21:* a reconnect after close 4002 (daemon handover or restart) **clears the cursor**,
because the daemon renumbers handles (Step 7 plan 0.2). The next `tab()` or mirrored call throws
`NO_CURSOR`; an explicit stale handle returns `TAB_UNKNOWN` (decisions.md · 2026-10-21 · The SDK
clears its cursor when it reconnects after a daemon restart).

*Corrected 2026-10-22: Step 6 already ships `BridgeClient.connect()`, `call()`, `status()`,
`close()`, `on("event")`, `on("reconnected")` (where the cursor clear hooks in) and the read-only
`welcome` and `extensionConnected` getters (decisions.md · 2026-10-22 · BridgeClient exposes welcome,
extensionConnected and on("reconnected") in Step 6 — open for user review; the final surface is this
step's). A 4002 reconnect never hands the daemon over and rejects with `VERSION` on a build mismatch
(decisions.md · 2026-10-22 · A reconnect after 4002 never hands the daemon over); after any other close
the client fails and does not reconnect (decisions.md · 2026-10-22 · What clients do on a close code
other than 4002) — see Step 6 as-built § Stage D4.*

### 0.5 Failure reports (`sdk/src/error.ts`)

Every SDK call wraps the wire `BridgeError`. For codes where a page state helps —
`LOCATOR_NOT_FOUND LOCATOR_AMBIGUOUS REF_STALE OFFSCREEN PAGE_ERROR NAV_FAILED TIMEOUT` (not
`TAB_HELD`/`TAB_GONE`/`NOT_CONNECTED`, where the tab can't or needn't be read) — the SDK, **by default**,
attaches: `snapshot` (one `snapshot` call), `screenshot` (default mode, saved to
`BRIDGE_FAILURES_DIR` or `~/.chrome-agent-bridge/failures/<iso>-<handle>.png`), `network` (last 20
entries for the tab). Each attachment is best-effort and bounded by 5 s; a failure to attach is noted
in `error.attachErrors`, never thrown. `error.report(): string` renders message + candidates +
`formatSnapshot` (capped at 60 lines around the nearest candidates) + screenshot path + the failed
network requests. `connect({ failureReports: false })` turns it off for hot loops. The screenshot
takes the visibility lock like any screenshot — a human may see a flash exactly when a script fails,
which is acceptable.

*Corrected 2026-10-22: `failureReports` joins Step 6's `ConnectOptions {name, waitForExtensionMs?,
requireExtension?, port?, env?, startDir?, io?, timers?}`. Configuration failures (token, daemon path,
port), the 10 s give-up and close 4001 already reject with `NOT_CONNECTED` (decisions.md · 2026-10-22 ·
The SDK reports configuration and connection failures as NOT_CONNECTED), so the attach set's exclusion
of `NOT_CONNECTED` covers them — see Step 6 as-built § Stage D4, § Stage D5b.*

### 0.6 MCP cursor: does not follow the human

- Actor name `claude-code #<pid>` (the MCP's own `process.pid`; *Superseded 2026-10-21: was `#<ppid>`,
  because under the nvm-windows shim the parent is the shim — decisions.md · 2026-10-21 · The actor
  name carries the MCP's own process id*). Cursor: first tab-touching tool without `tab` →
  `claim({active:true})`. A cursor cleared by a daemon restart (0.4, amended) is treated like first
  touch, and the next tool result opens with one line saying the daemon restarted and which handle is
  now held (decisions.md · 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon
  restart). *Corrected 2026-10-22: as built the MCP holds its client through `mcp/src/link.ts`
  (`BridgeLink`), which drops a client closed with any code but 4002 and runs a fresh `connect()` 5 s
  later; that new client has no cursor, so a daemon that was killed or crashed (not replaced with
  4002) also takes the first-touch rule and the one-line notice — see Step 6 as-built § Stage D5.*
- Then **stays** on that handle. New tool `browser_use_active_tab`: "the user opened/switched to a tab
  and wants me there" → `claim({active:true})` + cursor; it is the *only* way the cursor follows the
  human. The tool description says exactly when to call it ("the user says 'this tab' / 'the tab I
  opened'").
- `browser_status` adds: `Cursor: T3 "Title" — url (held by me)` and, when different,
  `Human's active tab: T7 "Gmail" — not mine; call browser_use_active_tab to work there`.
  *Corrected 2026-10-22: as built `browser_status` prints `Daemon: connected on 127.0.0.1:<port>
  (build <b>, up <s>s)`, `Clients (<n>): names…`, `Extension: …` and `Active tab: [id] title — url`
  (the human's active tab), or `Daemon: not connected` + `Problem: <reason>`; E2E rows STAT-1, MUX-1
  and MUX-8 expect that text, so S5 says how `Cursor:` and `Human's active tab:` relate to the
  existing `Active tab:` line and updates those rows — see Step 6 as-built § Stage D5, § Stage D5b.*
- `browser_new_tab`: `active: true` **only if** the cursor's tab is currently the human's active tab
  (the human was watching Claude; keep them watching); otherwise background. `browser_select_tab {tab}`
  → claim + cursor, no activation; `browser_focus_tab` brings the cursor on screen.
- Actions take `ref` **or** the locator fields (`role`, `name`, `text`, `css`) so Claude can act
  without a fresh snapshot when it knows the name — fewer tokens per step. Tool count 22 → 23.

### 0.7 Recipes

`recipes/` holds Claude-written scripts, each with a header comment: what it does, what it needs open,
how it fails. `npm run recipe -- recipes/hello.ts` runs with `tsx`. The first two:
1. `recipes/blackboard/boot-bb.ts` — claim or open a course tab, `evaluate` the `bb.js` source read
   from `~/.claude/skills/blackboard-ultra/scripts/bb.js` (no 8765 server, no `(0, eval)(await fetch…)`),
   print `bb.VERSION`. This replaces steps 1–3 of the skill's boot sequence.
2. `recipes/blackboard/export-grades.ts` — the first real deterministic job: `bb.gradebook` calls via
   `evaluate`, written to `./exports/<course>-<date>.json`. Chosen because it is read-only.

---

## Stages

One stage per Part. **Lane** is the explicit grant a step agent needs under the `step-agent` ESCALATION
list. **Parallel with** follows "Order of work". S1 and S3 may run concurrently: file-disjoint
(`extension/src/content/` vs `sdk/`), both pure/jsdom, no port.

### Stage S0 — Types

- [ ] `shared`: `Locator`, `LocateResult`, `WaitForParams` (discriminated), `EvalEnvelope.ref?`,
      `SnapshotElement` reuse. Guards only where something crosses the wire untyped.

**Lane:** `shared/src/`, `shared/test/`. **Parallel with:** sequential, first. **Verifier focus:**
`LOCATOR_NOT_FOUND` and `LOCATOR_AMBIGUOUS` are present in `shared/src/codes.ts` from Step 6 (the plan
says "verify"); the `Locator` union matches 0.1 exactly (three variants, `nth` on all, `exact` on two);
the `WaitForParams` discriminated union has the four arms of 0.4's `waitFor`.
**Needs the user's keyboard:** no.

### Stage S1 — Content-script `locate` (TDD, jsdom)

- [ ] Refactor `roleOf`, name computation, pruning and `hasLayout` out of `snapshot.ts` into
      `content/a11y.ts`; `snapshot.test.ts` still green (byte-identical elements).
- [ ] `content/locate.ts`: `locate(doc, refs, locator) → LocateResult` (§0.1) with `nearest()` and
      `LOCATOR_*` throws (`CODE:message` convention from Step 7); tests: role+name substring/exact/regex,
      `nth`, ambiguity, not-found candidates ranked, `{text}` over visible text, `{css}` mints a ref for a
      non-interactive element, shadow roots and same-origin frames (reuse the Step C fixtures), refs from
      a prior snapshot survive a `locate`.
- [ ] `content/index.ts`: expose `locate`, `refOfMarked(mark)`.

**Lane:** `extension/src/content/`, `extension/test/`, `extension/build.mjs` only if the IIFE build
needs the new file (granted). **Parallel with:** S3. **Verifier focus:** the `a11y.ts` refactor is
behaviour-neutral — `snapshot.test.ts` unchanged and green, and `buildSnapshot`'s elements for every
fixture are identical before and after (captured on the pre-S1 commit); `locate` never calls
`RefMap.reset` (grep) and a ref from a prior snapshot still resolves after a `locate`; the zero-size
filter stays gated on `hasLayout(doc)` (`CLAUDE.md`); the content bundle is still a classic IIFE with
no `import`/`export` (`grep -c "^import\|^export" extension/dist/content.js` → 0 after build).
**Needs the user's keyboard:** no (invisible until reload; the live check is S6).

### Stage S2 — Extension handlers: `ref | locator`, `waitFor({locator})`, node→ref

- [ ] `handlers/actions.ts`: `resolveTarget(tabId, p) → ref` (locator → `locate`); every action uses it.
- [ ] `handlers/wait.ts`: `locator` + `state` branch (§0.2).
- [ ] `handlers/evaluate.ts` + `evaluate/mark.ts` (pure `markScript`): `asRef` (§0.3).
- [ ] `tabs.ts`: delete the `activeTab()` fallback in `targetTab` (migration over); `BAD_PARAMS` when
      `tabId` is missing. Also remove the `selectTab` alias of `focusTab` from `sw.ts` (*added
      2026-10-21*; decisions.md · 2026-10-21 · selectTab stays as an alias of focusTab for one release).
- [ ] `router.test.ts` / `actions.test.ts` cover the resolution path with a fake `locate`.

**Lane:** `extension/src/handlers/`, `extension/src/tabs.ts`, `extension/src/evaluate/`,
`extension/src/content/index.ts`, `extension/test/`. **Parallel with:** sequential after S1 (and after
S3's cursor shape is known, since the daemon always sends `tabId` after Step 7 T2 — no file overlap,
but S2's `BAD_PARAMS` on a missing `tabId` must be matched by the daemon's resolution, verified by
execution against Step 7's as-built). **Verifier focus:** `grep -n "activeTab" extension/src` returns
nothing (the fallback is gone); every action handler goes through `resolveTarget`; `markScript` is
closure-free and shipped as `String(fn)` (the `SERIALIZER_SRC` pattern, `CLAUDE.md`); the mark
attribute is removed after the ref is minted (test on the pure part); `waitFor {locator, state:
"hidden"}` resolves on `LOCATOR_NOT_FOUND` and on nothing else; `toSerializableArgs` still turns an
undefined `locator` into null (`CLAUDE.md` gotcha). **Needs the user's keyboard:** no for the unit
work; the extension must be reloaded before S6 (G8-2).

### Stage S3 — SDK: `Tab`, cursor, locator normalisation (TDD with a fake client)

- [ ] `sdk/src/locator.ts`: `normalizeTarget(target)` → `{ref}` | `{locator}`; validates shape;
      friendly messages for the common mistake (`{name}` without `role` → "use {text} or add role").
- [ ] `sdk/src/tab.ts` (§0.4) and `client.ts` cursor methods; `screenshot({path})` writes the PNG and
      returns the path; `download` wraps `downloadToFile`.
- [ ] Tests: every `Tab` method sends the expected `{method, params}` with `tab: handle`; cursor
      semantics; `NO_CURSOR`; a 4002 reconnect clears the cursor (*added 2026-10-21*); `trusted` →
      `focus()` first *iff* the BG flag says so (a constant in `sdk/src/policy.ts`, set from the Step 7
      findings).

**Lane:** `sdk/src/`, `sdk/test/`. **Parallel with:** S1. **Verifier focus:** the `policy.ts` constant
cites the Step 7 E2E rows (BG-1/BG-2) it was set from, in a comment and in the stage report — if the
findings are absent, the stage stops at that item (G8-1); every `Tab` method in 0.4 has a test
asserting the exact `{method, params}` sent, including `tab: handle`; `b.<method>()` without a cursor
throws `NO_CURSOR` with the "call newTab() or claim() first" text; `normalizeTarget` rejects `{name}`
alone with the friendly message. **Needs the user's keyboard:** no.

### Stage S4 — SDK failure reports (TDD)

- [ ] `sdk/src/error.ts`: `BridgeError` subclass with `snapshot?`, `screenshotPath?`, `network?`,
      `attachErrors`, `report()`; `attachContext(error, tab, opts)` best-effort with a 5 s budget.
- [ ] Tests: the attach set per code; attach failures recorded not thrown; `report()` shape for
      `LOCATOR_NOT_FOUND` (candidates first, snapshot window around them); `failureReports: false`.

**Lane:** `sdk/src/`, `sdk/test/`. **Parallel with:** sequential after S3. **Verifier focus:** the
attach set is exactly the seven codes of 0.5 and excludes `TAB_HELD`, `TAB_GONE`, `NOT_CONNECTED`
(test both lists); an attach call that hangs is cut at 5 s by an injected clock and lands in
`attachErrors`; `report()` is capped at 60 snapshot lines; the screenshot path is under
`BRIDGE_FAILURES_DIR` when set, else `~/.chrome-agent-bridge/failures/`; nothing in `sdk/src/error.ts`
logs to the console. **Needs the user's keyboard:** no.

### Stage S5 — MCP: cursor + tools (TDD)

- [ ] `browser_use_active_tab`; status divergence line; `browser_new_tab` activation rule; actions
      accept locator fields; `browser_wait_for` accepts locator fields; `browser_evaluate` gets `asRef`.
- [ ] Error rendering: `error.report()` for the attach-eligible codes (the screenshot is returned as an
      image content block in addition to the text — the model can see what the script saw).
- [ ] `tools.test.ts`: cursor stays when the fake `listTabs` moves the human's active tab; the status
      line appears; `browser_use_active_tab` moves it.

**Lane:** `mcp/src/`, `mcp/test/`. **Parallel with:** sequential after S3 and S4. **Verifier focus:**
tool count 23 by `grep -c "server.tool("`; the cursor does not move when the fake `listTabs` reports a
different active tab (the core promise of 0.6); `browser_new_tab` sends `active: true` only when the
cursor's tab is the human's active tab (test both branches); the image content block is present only
for attach-eligible codes; `_registeredTools[name].handler` still holds the handler (`CLAUDE.md` MCP
SDK quirk). **Needs the user's keyboard:** the schema changes need an MCP reconnect — part of G8-2.

### Stage S6 — Recipes + E2E (`docs/e2e-test-plan.md` SDK-1…8)

This stage is a **wave run with the user** after the autonomous phase closes (human gate G8-2). It
opens with `npm run build` → `chrome://extensions` ↻ → `/mcp`; an `unknown method` error means the
loaded extension is stale. The autonomous run writes the recipes, the README, the `tsx` script and the
SDK rows with expected results beforehand; the measurements are taken with the user.

- [ ] `recipes/README.md`, `recipes/hello.ts` (connect, newTab to the fixture, locate the login button,
      click, waitFor text, print, close).
      *Corrected 2026-10-22: `recipes/hello.ts` already exists (Step 6 D6: connect, `daemon.status`,
      `listTabs`, an optional hold; prints no URLs) and MUX-3/5/6/8/10 judge its output, so S6 either
      writes this flow as another recipe or updates those rows' expected text in the same stage — see
      Step 6 as-built § Stage D6.*
- [ ] **SDK-1** `hello.ts` end to end against the fixture while a Claude session is connected on
      another tab.
- [ ] **SDK-2** `LOCATOR_NOT_FOUND` report: misspell a name → the report names the nearest candidates,
      saves a screenshot, prints the snapshot window.
- [ ] **SDK-3** `LOCATOR_AMBIGUOUS` → matches listed; `nth` fixes it.
- [ ] **SDK-4** `waitFor({locator: {text: …}})` on the message that the fixture's `#load-later`
      ("Load message in 1.5s") makes appear; `state:"hidden"` after removing that element with
      `evaluate`. *Superseded 2026-10-21: was "the fixture's delayed button; `state:"hidden"` after
      dismissing", because the fixture has no delayed button and `{text}` has no other row —
      decisions.md · 2026-10-21 · Step 8 SDK-4 waits for the fixture's delayed text with a {text}
      locator.*
- [ ] **SDK-5** `evaluateRef("document.querySelector('#email')")` → ref → `click({trusted:true})`
      lands (`isTrusted` reporter).
- [ ] **SDK-6** `boot-bb.ts` on a live course tab → `bb.VERSION` printed; the skill's old boot not used.
- [ ] **SDK-7** `export-grades.ts` → JSON file written; byte-compare with the same data pulled through
      the MCP `browser_evaluate` path.
- [ ] **SDK-8** MCP cursor: Claude working on T1, human switches to Gmail, Claude clicks → lands on T1;
      user says "use this tab" → Claude calls `browser_use_active_tab` → status shows the new cursor.
- [ ] Regression smoke across Steps 6–8: MUX-2, LEASE-1, SCREEN-1, ACT-1…3, TRUST-2, EVAL-1, NET-1, DL-1
      (DL-1 is written by Step 6's D6; decisions.md · 2026-10-21 · Step 6 writes the DL rows for
      browser_download before its D6 wave).

**Lane:** `recipes/`, root `package.json` (`tsx`, `recipe` script), `docs/e2e-test-plan.md`,
`.gitignore` (`exports/` — see Human gates). **Parallel with:** sequential, after S5. **Verifier focus
(wave):** expected results written before the run; SDK-7's byte-compare is a `cmp`/hash of two files,
both produced in the run; SDK-2's screenshot path and SDK-7's export are checked to be **outside the
repo or gitignored** before anything is committed (they hold real-site content and student data);
SDK-6/7 run only on the course the user names. **Needs the user's keyboard:** yes — all of it: the
reload, a live Blackboard course tab in the logged-in profile (SDK-6, SDK-7), switching to Gmail and
saying "use this tab" (SDK-8), a second session for MUX-2/LEASE-1.

### Stage S7 — Docs + commits

- [ ] `CLAUDE.md`: *locators are resolved by the snapshot's rules — change `a11y.ts`, not two places;
      `locate` adds refs, never resets; node→ref uses a `data-__bridge-mark` attribute across worlds;
      failure reports take the visibility lock; the MCP cursor never follows the human without
      `browser_use_active_tab`; recipes run with `tsx`*.
- [ ] `docs/setup.md`: "Writing a script" section — the hello recipe, the error report, the cursor.
- [ ] `blackboard-ultra` skill (its own repo): boot sequence → `npm run recipe -- recipes/blackboard/boot-bb.ts`
      (or the SDK snippet); keep the old path documented as a fallback for one release.
- [ ] `docs/progress-and-roadmap.md`: Step 8 entry; the roadmap's Phase F items this closes
      ("`wait_for` variants (element-visible …)" and "Return a `[ref=eN]` for a `kind:"node"` result",
      by the roadmap's own wording) and what remains (`args` for `browser_evaluate`, console capture,
      D3 upload). *Superseded 2026-10-21: was "element-visible wait, node→ref, args-less evaluate
      data", because nothing in Step 8 adds `args` to `browser_evaluate` — decisions.md · 2026-10-21 ·
      Step 8 S7 names only the Phase F items Step 8 closes.*
- [ ] Commits per Part: `feat(extension): locators resolved by the snapshot's rules; waitFor locator;
      evaluate asRef`, `feat(sdk): typed Tab API with cursor and locators`, `feat(sdk): failure reports
      with snapshot, screenshot and network`, `feat(mcp): cursor that does not follow the human;
      browser_use_active_tab; locator fields`, `feat(recipes): hello, boot-bb, export-grades`,
      `docs: Step 8 E2E results`.

**Lane:** `CLAUDE.md`, `docs/`; the `blackboard-ultra` skill lives **outside this repository** and is
not in any lane without the user's grant (G8-3). The per-Part commits happen at each stage's close (one
commit per stage, long-run bookkeeping invariant); S7's list is the record. **Parallel with:**
sequential, last. **Verifier focus:** every `CLAUDE.md` gotcha added is a measured fact with its
source; the setup doc's script section runs as written (the verifier executes the hello snippet's
typecheck); the roadmap entry names the Phase F items by the roadmap's own wording (see Open items).
**Needs the user's keyboard:** the E2E results wait for the S6 wave; the skill edit waits for G8-3.

---

## Exit checks (pre-registered)

"Before" is the stage's starting commit, "after" its closing commit; counts come from `npm test`. The
step's baseline is Step 7's closing test count (recorded in Step 7's as-built) and 22 tools.

**S0**
- S0.1 `npm test` after ≥ before; `npm run typecheck` green for all five packages.
- S0.2 `grep -n "LOCATOR_NOT_FOUND\|LOCATOR_AMBIGUOUS" shared/src/codes.ts` → both present.
- S0.3 The `Locator` type has the three variants of 0.1 and `WaitForParams` the four arms of 0.4.

**S1**
- S1.1 `npm test` after ≥ before + the `locate` tests; typecheck green.
- S1.2 `snapshot.test.ts` is unchanged by the refactor (`git diff --stat` on it is empty or only the
  import path) and green; `buildSnapshot` elements for every fixture equal the pre-S1 capture.
- S1.3 Tests cover: role+name substring, `exact`, `{regex}`, `nth`, ambiguity → `LOCATOR_AMBIGUOUS`
  with `matches`, not-found → `LOCATOR_NOT_FOUND` with up to 5 ranked candidates, `{text}` over visible
  text, `{css}` minting a ref for a non-interactive element, open shadow root, same-origin frame, refs
  from a prior snapshot surviving `locate`.
- S1.4 `grep -n "reset" extension/src/content/locate.ts` returns nothing.
- S1.5 After `npm run build`, `extension/dist/content.js` contains no `import`/`export` statement.

**S2**
- S2.1 `npm test` after ≥ before + the resolution-path tests; typecheck green.
- S2.2 `grep -rn "activeTab" extension/src` returns nothing; `grep -n "selectTab" extension/src`
  returns nothing (the alias is gone; *added 2026-10-21*).
- S2.3 Tests cover: each of `click/type/hover/scroll/selectOption/pressKey` with `ref` and with
  `locator` through a fake `locate`; `waitFor {locator}` polling at 100 ms with the 10 s default and
  `state: "hidden"` resolving on `LOCATOR_NOT_FOUND`; `markScript` output; `targetTab` → `BAD_PARAMS`
  when `tabId` is missing.
- S2.4 `grep -rnE "console\.(log|warn|error)\(.*(url|href)" extension/src` returns nothing.
- S2.5 `unwrapResult` still treats null **or** undefined as failure (test unchanged and green).

**S3**
- S3.1 `npm test` after ≥ before + the `Tab`/cursor/locator tests; typecheck green.
- S3.2 `sdk/src/policy.ts` exists, its constant's comment cites BG-1/BG-2 with their recorded result,
  and `docs/decisions.md` has the dated entry (session agent writes it).
- S3.3 Tests cover: every `Tab` method's exact `{method, params}` with `tab: handle`; `newTab` and
  `claim` set the cursor; `tab()` without a cursor → `NO_CURSOR` with the stated text; a reconnect
  after close 4002 clears the cursor (*added 2026-10-21*); `trusted` →
  `focus()` first iff the policy constant says so; `normalizeTarget` rejects `{name}` alone with the
  friendly message.
- S3.4 `sdk/src/index.ts` exports `Tab`, `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`,
  `downloadToFile`, `formatSnapshot`, `formatNetwork` (the Step 6 and Step 7 exports stay).

**S4**
- S4.1 `npm test` after ≥ before + the enrichment tests; typecheck green.
- S4.2 Tests cover: attach happens for exactly `LOCATOR_NOT_FOUND LOCATOR_AMBIGUOUS REF_STALE OFFSCREEN
  PAGE_ERROR NAV_FAILED TIMEOUT` and not for `TAB_HELD TAB_GONE NOT_CONNECTED`; an attach that rejects
  or exceeds 5 s (injected clock) lands in `attachErrors` and the original error is still thrown;
  `report()` for `LOCATOR_NOT_FOUND` puts candidates first and caps the snapshot at 60 lines;
  `failureReports: false` attaches nothing.
- S4.3 `grep -n "console\." sdk/src/error.ts` returns nothing.

**S5**
- S5.1 `npm test` after ≥ before + the cursor/tool tests; typecheck and build green.
- S5.2 `grep -c "server.tool(" mcp/src/tools/registry.ts` → 23; the new tool is `browser_use_active_tab`.
- S5.3 Tests cover: the cursor stays when the fake `listTabs` moves the human's active tab; the
  `Human's active tab: …` status line appears only when it differs; `browser_use_active_tab` moves the
  cursor; `browser_new_tab` activation rule, both branches; an action with locator fields sends a
  `locator`; `browser_evaluate` with `asRef` returns the ref; an attach-eligible error renders
  `report()` plus an image content block.
- S5.4 `docs/setup.md` and `docs/e2e-test-plan.md` updated in this stage for the new tool and the
  locator fields on actions.

**S6 (wave, with the user)**
- S6.1 Rows SDK-1…8 exist in `docs/e2e-test-plan.md` with expected results written before the run; the
  reload and `/mcp` are the first recorded line.
- S6.2 `npm run recipe -- recipes/hello.ts` is the command recorded for SDK-1, with its printed output.
- S6.3 SDK-7's two JSON files are compared by hash; the hash is recorded, the files are not committed.
- S6.4 `git status` after the wave shows no file under `exports/` or `~/.chrome-agent-bridge/` staged;
  `.gitignore` covers `exports/`.
- S6.5 The regression rows pass with the same expected text as their last recorded run.

**S7**
- S7.1 Every new `CLAUDE.md` gotcha cites its source; `grep -n "a11y.ts" CLAUDE.md` finds the
  "change `a11y.ts`, not two places" rule.
- S7.2 `docs/setup.md` has the "Writing a script" section and its snippet typechecks.
- S7.3 One commit per stage in `git log` with the messages listed; no `dist/`, no token, no `exports/`.
- S7.4 The `blackboard-ultra` skill edit is either done with the user's grant or listed under
  "Needs the user's keyboard" in the as-built.

---

## Human gates

- **G8-1 — start-of-phase input: the BG-1/BG-2 findings.** `sdk/src/policy.ts` (S3) and the `trusted`
  branch of 0.4 cannot be set without Step 7's recorded results for BG-1 (trusted click into a
  background tab) and BG-2 (trusted typing). The Stage-0 audit checks they exist in Step 7's as-built
  or `docs/e2e-test-plan.md`. If they are missing, the run stops **before S3's `policy.ts` item** and
  asks; it does not guess a default.
- **G8-2 — S6 is a wave run with the user.** The S1/S2 extension changes are invisible until the user
  reloads the extension; the S5 MCP schema changes need an MCP reconnect. The wave opens with the
  reload sequence and the stale-extension check (`unknown method` ⇒ reload again). Rows needing the
  user specifically: SDK-6 and SDK-7 (a live course tab in the logged-in Blackboard profile — the
  user's own data; the user names the course), SDK-8 (switch to Gmail, say "use this tab"), MUX-2 and
  LEASE-1 (a second Claude session). Failure screenshots (`~/.chrome-agent-bridge/failures/`) and
  `./exports/*.json` contain real-site content and student data: they stay out of the repo and out of
  the evidence folder (guide rule 8: the repo is public). `exports/` is added to `.gitignore` before
  SDK-7 runs.
- **G8-3 — editing the `blackboard-ultra` skill.** It lives in a separate repository
  (`~/.claude/skills/blackboard-ultra`), outside this run's outputs; an edit there needs the user's
  explicit grant in the kickoff or at S7, otherwise it is listed as needing the user's keyboard.
- **Standing gates:** never push; a locator rule that would stop matching what the snapshot shows is a
  contract change (0.1's invariant) — stop; nothing in the run touches the user's tabs outside the
  rows the user runs.

## STOP rules and forbidden fixes

**Stops the gate:** a pre-registered exit check fails after 2 fix rounds; S1.2 (behaviour-neutral
refactor) fails and the proposed fix touches `snapshot.test.ts`'s expectations; the BG findings are
absent at S3 (G8-1); a `CLAUDE.md` runtime invariant would have to change (`unwrapResult`
null-or-undefined, the IIFE content script, `toSerializableArgs`, never logging URLs); a
security-boundary question; a recipe that would write or change anything on Blackboard (0.7: the first
jobs are read-only).

**Continues anyway, recorded:** a `nearest()` ranking that looks odd on a real page (report the
candidates); a flash seen during a failure screenshot (0.5 accepts it); build decisions on the
similarity metric's internals, test file placement, the `report()` wording.

**Forbidden fixes for this step** (derived from 0.1–0.7 and `long-run` §3):
- changing a locator rule (`roleOf`, the accessible-name computation, the pruning gates in `a11y.ts`)
  to make a fixture or an E2E row match — the invariant is "what Claude saw in a snapshot is what a
  locator matches"; a mismatch is a finding;
- making `locate` reset the RefMap, or minting a ref without going through the RefMap;
- raising the 5 s attach budget, or letting an attach failure throw, to make a report test pass;
- making the cursor follow the human's active tab anywhere but `browser_use_active_tab` and the first
  touch;
- leaving the `data-__bridge-mark` attribute on the element, or using a non-unique mark, to simplify
  the round trip;
- restoring the `activeTab()` fallback in `targetTab` to make something work without a `tabId`;
- committing `exports/`, failure screenshots, or any captured page content as evidence;
- editing the `blackboard-ultra` skill without the grant of G8-3.

## Open items

Findings for the Stage-0 spec audit (which also re-examines Step 7's as-built register by execution),
what the plan leaves open, who decides, revisit triggers, and the keyboard summary.

**Findings for the Stage-0 audit** (ruled with the user on 2026-10-21 where marked; the audit
re-checks each ruling's premise by execution and raises a finding only if a premise is wrong)
- *Ruled 2026-10-21:* SDK-4 targets the delayed text with a `{text}` locator; no fixture change
  (`#load-later`, line 117, makes text appear 1.5 s after a click, line 250) — decisions.md ·
  2026-10-21 · Step 8 SDK-4 waits for the fixture's delayed text with a {text} locator.
- *Ruled 2026-10-21:* Step 6's D6 writes DL-1 and DL-2 before its wave; the cite stays (decisions.md ·
  2026-10-21 · Step 6 writes the DL rows for browser_download before its D6 wave).
- *Ruled 2026-10-21:* the actor name is `claude-code #<pid>` with the MCP's own `process.pid`; 0.6
  corrected (decisions.md · 2026-10-21 · The actor name carries the MCP's own process id).
- S1 says "reuse the Step C fixtures": the fixtures are those of Phase C (`extension/test/snapshot.test.ts`,
  shadow DOM and frame cases, line 111 onward). Naming only.
- *Ruled 2026-10-21:* S7's roadmap entry names only "`wait_for` variants (element-visible …)" and
  "Return a `[ref=eN]` for a `kind:"node"` result"; `args` for `browser_evaluate` stays open in Phase F
  (decisions.md · 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes).
- SDK-5 and `hello.ts` cite fixture elements that exist: `#email` (line 31), the "Sign in" submit button
  `#submit-btn` (line 49), the `isTrusted` reporter (lines 155–166).
- `Tab.network({…} | {id})` mirrors `browser_network_requests`'s parameters including `id`
  (`server/src/tools/registry.ts:247–252`) — consistent. *Corrected 2026-10-22: was
  `server/src/tools/registry.ts:247–252`; as built `mcp/src/tools/registry.ts:270–279` (Step 6 D1
  move) — see Step 6 as-built § Stage D1.*
- 0.4 lists `Tab.release()` and `close()`; the daemon's `tabs.release` and `closeTab` come from Step 7
  T2 — verified by execution in the audit.
- *Ruled 2026-10-21:* `BridgeClient` clears the cursor on a 4002 reconnect; `NO_CURSOR` tells the
  script what to do, the MCP re-claims the active tab like first touch with a one-line notice (0.4 and
  0.6 amended; S3 and S3.3 extended; decisions.md · 2026-10-21 · The SDK clears its cursor when it
  reconnects after a daemon restart).
- *Ruled 2026-10-21:* S2 also removes the `selectTab` alias Step 7 T3 keeps (decisions.md ·
  2026-10-21 · selectTab stays as an alias of focusTab for one release).
- *Corrected 2026-10-22: was no Step 6 items; as built several Step 6 decisions name this step as
  their revisit point, and the Stage-0 audit takes them up (all in decisions.md, 2026-10-22): "The SDK
  reports configuration and connection failures as NOT_CONNECTED" (an authentication or configuration
  code in spec §10); "BridgeClient exposes welcome, extensionConnected and on("reconnected") in Step 6"
  (the surface review); "D5's MCP link: a client.connect() health check, a thin config, interim
  exports gone" and "What clients do on a close code other than 4002" (a public close or failure
  event, or reconnect); "The MCP connects without waiting for the extension, so Chrome closed reads as
  today" and "D5b's shape: requireExtension: false, a connectOptions() helper, a test-only daemon
  import" (the option's final name and shape); "setup.md documents stopping the daemon by killing its
  process, with no stop script" (a stop command in the SDK); "A Step 6 client gives up with VERSION
  when no welcome arrives" (once v1 servers can no longer exist) — see Step 6 as-built § Stage D4,
  § Stage D5, § Stage D5b, § Stage D7.*

**Left open by design:** console capture, D3 upload as `Tab.upload`, a Python SDK, generation-stamped
refs, `tabs.claim {wait:true}`, session recording (follow-ups).

**Who decides:** the similarity metric, the `report()` layout, the recipes' file layout, `tsx` wiring →
session agent (`By: Claude`); the `Locator` type, the `Tab` method set and signatures, tool names and
schemas, the attach set, the cursor rule → contract: a pre-stated rule applies or the conservative rule
of `long-run` §3 with the decision listed for the user; the `trusted` policy → the BG findings (G8-1).

**Revisit triggers:** a real script breaks in a way the report does not explain (then self-healing is
reconsidered — spec §2 non-goal); hand-writing a recipe proves slower than expected (session
recording); a Python skill needs the bridge (Python SDK).

**Needs the user's keyboard:** extension reload + `/mcp` at the start of the S6 wave; the whole S6
wave, including a live Blackboard course tab and the Gmail switch; the `blackboard-ultra` skill edit
(G8-3); any push.

## Follow-ups (not this step)

- Console capture (`Runtime.consoleAPICalled`) appended to `evaluate` results and to failure reports.
- D3 file upload (`DOM.setFileInputFiles`) as `Tab.upload(target, paths)`.
- A Python SDK over the same protocol (or an HTTP face on the daemon) if a Python skill needs it.
- Generation-stamped refs; `tabs.claim {wait:true}`.
- Recording an MCP session's calls into a draft recipe — only if hand-writing proves slower than expected.
