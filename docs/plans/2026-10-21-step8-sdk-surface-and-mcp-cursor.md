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
*Corrected 2026-10-23 (Step 7 propagator): was "Steps 6 and 7 complete and E2E-passed" and a BG-1/BG-2
outcome that decides the policy by itself. As built Step 7 is built and E2E-run (Runs 8–10), and its gate
waits only on the user: R9-SCREEN-2's positive control, plus open decisions #37, #40, #46, #51 and #54
(decisions.md · 2026-10-23 · The user rules on the Step 7 close-out questions (#68)). BG-1/BG-2 **failed**:
trusted input into a background tab answers `ok` and does nothing (Run 8). Chrome's anti-throttling flags
did not change that (Run 10 BGF-1/2). Focus emulation was never measured, because no bridge method sends
`Emulation.setFocusEmulationEnabled` (decisions.md · 2026-10-22 · BG-1/BG-2's focus-emulation retry cannot
run in this wave (#61); · 2026-10-23 · Chrome's anti-throttling flags do not fix background input (#66)).
The user ruled that Step 8 first adds a focus-emulation option and measures it, and only then sets the
policy (decisions.md · 2026-10-23 · The user rules on Run 8: fix stage T5b, then Run 9 (#62) item 4). See
G8-1. Step 7's closing count is 950 tests in 59 files (`npm test` at `9cfc7db`, 2026-10-23), with 22 tools
— see Step 7 as-built § T5, § "RELOAD-AUTO, Run 9, BG-FLAGS".*

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
  see Step 6 as-built § Stage D1.* *Corrected 2026-10-23 (Step 7 propagator): "21 today" is stale; as
  built Step 7 T4 left 22 (`browser_focus_tab` added; `grep -c "server.tool(" mcp/src/tools/registry.ts`
  → 22 at `9cfc7db`) — see Step 7 as-built § Stage T4.*
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
- *Corrected 2026-10-23 (Step 7 propagator): was no `daemon/` files. As built, the removals S2 owns are
  partly in the daemon:
  - the legacy path for Step 6 clients: no `tab` → the human's tab, and a Chrome `id` or number → its
    handle (`daemon/src/intercept.ts`; `LEGACY_ID_METHODS` in `daemon/src/methods.ts:36`). Decisions:
    decisions.md · 2026-10-22 · A Step 6 client keeps working against a Step 7 daemon for one release,
    without loosening a lease (#41); · A bare number in a network `tab` is a legacy Chrome id, not
    `BAD_PARAMS` (#54). Both say "Step 8 S2 removes it".
  - `selectTab` in the lock class (`methods.ts:21`, `:63`; decisions.md · 2026-10-22 · `selectTab` takes
    the visibility lock, like `focusTab` (#53)).
  - the Chrome `id` that `newTab`/`listTabs` results carry beside `tab` for one release (decisions.md ·
    2026-10-22 · T2's daemon details (#57)).
  - in the extension, the old `tab:"all"` scope that `extension/src/network-scope.ts` still accepts from
    a Step 6 daemon (decisions.md · 2026-10-22 · The daemon sends the network "all" scope as `scope`, and
    two Step 6 test fakes speak the new hello (#52)).
  - the switch-mode `WINDOW_MINIMIZED` message (`extension/src/tabs.ts:196`), which still suggests
    `mode:"cdp"` even though `cdp` now refuses a minimized window too. Step 8 rewrites it
    (decisions.md · 2026-10-23 · T5b's three fixes (#63)).
  The formatters already exist: `sdk/src/format/{snapshot,network,index}.ts` export `formatSnapshot` and
  `formatNetwork`. They are reached through the `./format` subpath in `sdk/package.json`, not through
  `index.ts` (decisions.md · 2026-10-22 · The formatters reach the MCP through a `@bridge/sdk/format`
  subpath (#46), open for the user) — see Step 7 as-built § Stage T2, § Stage T4, § Stage T5b.*

**Order of work:** S0 (types) → S1 (content `locate`, TDD) → S2 (extension handlers accept locators;
node→ref) → S3 (sdk `Tab`, cursor, locator normalisation, TDD) → S4 (sdk failure enrichment, TDD) →
S5 (mcp cursor + tools) → S6 (recipes, E2E) → S7 (docs). S1 and S3 are independent. S2 needs S1.
S4 needs S3. S5 needs S3+S4. S6 needs everything.
*Added 2026-10-23 (Stage 0): two stages join the order, both from kickoff §7: **FE** (focus emulation
for trusted input, measured live) and **S2b** (the Step 6 compatibility removals, `code` required, the
session marker). Order: Stage 0 → S0 → (S1 ∥ FE build) → FE live part, alone → S2 → (S2b ∥ S3) → S4 →
S5 → S6 → S7 (decisions.md · 2026-10-23 · Stage FE measures focus emulation before `policy.ts` is set
(#71); · S2's daemon half becomes stage S2b (#72)). The Stage 0 findings are in
`…-steps/stage0-audit.md` (F1–F35); none is resolved until the session agent records it.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
recipe, S3.5's control, the stage split (#85)) item 7: The stage order is the kickoff's default; budgets
as in `stage0-audit.md` §7 (S2b 4 h with #79). Each Stage 0 note below that a ruling in decisions.md
#78–#85 resolves carries its own "Ruled" note.*

---

## Decisions

The decisions below were taken in the design spec and in this plan on 2026-10-21 and are **not
reopened** during the build: they are contract decisions in the sense of the `long-run` skill §3 (the
SDK's public surface, the locator rules, MCP tool names and schemas, what the human sees). A new
decision taken while building goes to `docs/decisions.md` (cited by date + title), never into this
section; the run itself is governed by decisions.md · 2026-10-21 · Steps 6–8 run under the long-run
contract. The one value this plan leaves to a measurement — the `trusted` → `focus()` policy of 0.4 —
is set from Step 7's BG-1/BG-2 findings and recorded in `docs/decisions.md` at S3.
*Corrected 2026-10-23 (Step 7 propagator): BG-1/BG-2 failed, and the user ruled that the policy is set
only after a focus-emulation option has been added and measured (decisions.md · 2026-10-23 · The user
rules on Run 8: fix stage T5b, then Run 9 (#62) item 4). That measurement needs an extension change, and
a live run after the reload. No stage of this plan holds it yet — see G8-1.*

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
*Corrected 2026-10-23 (Step 7 propagator): was `roleOf` at `snapshot.ts:50` and `hasLayout` at line 74.
At `9cfc7db` they are at `:52` and `:76` (Step 7 T3 rewrote `buildSnapshot`, `:260`). The `LOCATOR_*`
failures cannot be thrown from the page as `CODE:message` strings, because a thrown injected function
arrives as `result: null`. As built, page functions `throw codedError(code, msg)`. The `guard` wrapper
in `content/guard.ts` turns that into a returned `{__bridgeError:"CODE:message"}`, and `unwrapResult`
splits it (decisions.md · 2026-10-22 · Content-script failures are returned, not thrown, to carry
`CODE:message` (#38)). `locate` must be a guarded `window.__agentBridge` method — see Step 7 as-built
§ Stage T1, § Stage T3.*
*Added 2026-10-23 (Stage 0): two open points, for the session agent before S1. (1) The marker carries
`CODE:message` only: `guard.ts:26-31` `toMarker` drops `err.data`, and `inject.ts:64-67` builds the
error without data, so `LOCATOR_NOT_FOUND {candidates}` and `LOCATOR_AMBIGUOUS {matches}` cannot cross
it today (executed; stage0-audit.md F6, an escalation because the marker is a `CLAUDE.md` invariant).
(2) `{text}` has no snapshot rule to reuse: the snapshot lists no plain text, and SDK-4's target is a
role-less `<div id="async-area">` (`test-fixtures/e2e-playground.html:121`). The rule for `{text}`,
`nth` in walk order, the 120-character name cap and the 800-element cap are unstated (F13). Also:
`buildSnapshot` stays exported from `snapshot.ts`, since `sdk/test/format-baseline.test.ts:9` and
`sdk/test/format-snapshot.test.ts:8` import it.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Page-function failures may carry `data`
beside the marker (#82)), open point (1): `content/guard.ts` also returns `__bridgeData` when the thrown
error has plain-JSON `data`; `unwrapResult` hands it on as the `BridgeError`'s `data`. The
`{__bridgeError: "CODE:message"}` string, the return-not-throw rule and null/undefined → `REF_STALE` are
unchanged; S7 adds the field to that `CLAUDE.md` gotcha. Contract-level: open for the user's review;
binds meanwhile.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Locator rules, the MCP locator schema and
the exported `BridgeError` (#83)) item 1, open point (2): a `{text}` locator matches the innermost element
that survives the snapshot's pruning gates (`aria-hidden`/`inert`/`hidden`/`display:none`, zero-size when
`hasLayout`) whose normalised text contains the needle, case-insensitive substring; `exact` means
equality; `nth` counts in the snapshot's walk order; `{role,name}` keeps 0.1's rule (only what a snapshot
lists). The 0.1 invariant reads, for `{text}`, "what the snapshot's pruning shows". `buildSnapshot` stays
exported from `snapshot.ts`. Contract-level: open for the user's review; binds meanwhile. (The
120-character name cap and the 800-element cap named in point (2) are not ruled by #83.)*
*Superseded 2026-10-23 for `{text}`: the invariant was "what Claude saw in a snapshot is what a locator
matches", because a `{text}` target can be an element the snapshot does not list, such as SDK-4's
role-less `<div id="async-area">` (decisions.md · 2026-10-23 · Locator rules, the MCP locator schema and
the exported `BridgeError` (#83)).*
*Proposed 2026-10-23 (S0 step agent, for the session agent to record): `nth` is 0-based (`nth: 0` is the
first match in the snapshot's walk order), as Playwright's `nth`; 0.1 and #83 left the base unstated.
`shared/src/protocol.ts` documents it and `isLocator` accepts 0. S1 builds to this unless ruled
otherwise.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · S0's rulings: bounded bundle diff,
`WaitForParams`, 0-based `nth`, #79's S2b check (#86)): item 3 — a locator's `nth` is 0-based.*

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

*Corrected 2026-10-23 (Step 7 propagator), three points:*
- *The `trusted` branch: BG-1/BG-2 failed (Run 8). With the anti-throttling flags they failed again
  (Run 10). The "if they failed, `focus()` first" branch is therefore not taken automatically. The user
  ruled that a focus-emulation option is added and measured first (decisions.md · 2026-10-23 · The user
  rules on Run 8: fix stage T5b, then Run 9 (#62) item 4); `focus()` first stays the fallback if that
  measurement also fails (decisions.md · 2026-10-23 · Chrome's anti-throttling flags do not fix
  background input (#66), "Revisit if").*
- *`tabs()`: as built a `listTabs` entry is `{id, tab, title, url, active, windowId, openerTabId?,
  owner?, current?}`. Here `active` keeps Chrome's per-window meaning, and the human's tab is marked
  `current: true` (decisions.md · 2026-10-22 · "The human's tab" is the active tab of the last-focused
  normal window (#43); · T1's extension details (#55)). So the human's-tab flag in `tabs()` is
  `current`, not `active`.*
- *`screenshot({mode})`: `mode:"cdp"` captures only a tab that is already in front of a window that is
  not minimized. A background tab is refused with `OFFSCREEN` and a minimized window with
  `WINDOW_MINIMIZED`, before the debugger attaches (decisions.md · 2026-10-23 · T5b's three fixes (#63);
  Run 9 R9-SCREEN-2/-4). No mode captures a background tab without switching to it.*

*All three: see Step 7 as-built § T5, § T5b.*

*Added 2026-10-23 (Stage 0): the amended note's "an explicit stale handle returns `TAB_UNKNOWN`" does
not hold once the new daemon has minted that number again: handles start at `T1` in every daemon
instance (`daemon/src/handles.ts:44`), and a stale `T3` resolved to another, unheld tab with the lease
check answering `{"ok":true}` (executed on the pure modules; stage0-audit.md F2, CRITICAL). Proposed: S3
voids a `Tab` from before a 4002 reconnect locally with `TAB_UNKNOWN`; a daemon epoch in handles is the
wire alternative, for the user. Separately, 0.5's `BridgeError` subclass must not take the exported name
from the shared class, or every `instanceof BridgeError` on an unwrapped error breaks (F14).*

*Corrected 2026-10-23 (Stage 0, fixer round 1): was "S3 voids a `Tab` … locally; a daemon epoch in
handles is the wire alternative", because that guard covers only an SDK `Tab` object (stage0-verifier.md
V1). Claude passes `tab` through the MCP as a plain string (`mcp/src/tools/registry.ts:182-185`), and raw
`call()` scripts and Step 7 bundles pass it too. Run end to end on two real daemons, a stale `click
{tab:"T3"}` reached the extension as `{"ref":"e1","tabId":1}`, the human's tab. Proposed now
(stage0-audit.md F2, an Open decision for the user): (a) a new daemon never re-mints a handle number an
earlier daemon used (a high-water mark under `~/.chrome-agent-bridge/`, start-time fallback, `T<n>`
unchanged, no wire change), so a stale handle answers `TAB_UNKNOWN` for every client — home S2b; (b) the
S3 `Tab` guard plus an MCP-local guard in S5, which leave raw `call()`, Step 7 bundles and a restarted MCP
exposed; (c) both. Recommended: (a) + the S3 `Tab` guard. Conservative rule until the user rules: S2b
builds (a) behind an injectable base, and S3 builds its guard.*

*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · A new daemon never reuses a handle number;
the SDK guards stale `Tab`s (#79)), F2: S2b: `HandleTable` starts above a high-water mark kept under
`~/.chrome-agent-bridge/` (written before a minted handle is returned; reserving in blocks is allowed),
falling back to a start-time base when the file cannot be read or written; the base is injectable so
tests keep `T1…`. S3: each `Tab` carries the client's connection generation and throws `TAB_UNKNOWN`
locally after a 4002 reconnect, with no call. #11's premise ("an explicit stale handle returns
`TAB_UNKNOWN`") gets a dated note naming the gap this closes. Rows quoting literal handles are re-dated
before their run. Contract-level: open for the user's review; binds meanwhile.*

*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Locator rules, the MCP locator schema and
the exported `BridgeError` (#83)) item 3, F14 in the "Added (Stage 0)" note above: `@bridge/sdk` keeps
exporting the shared `BridgeError` class; the report fields (snapshot, screenshot path, network,
`report()`) are optional properties set on it, so every existing `instanceof BridgeError` keeps working.
Contract-level: open for the user's review; binds meanwhile.*

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

*Corrected 2026-10-23 (Step 7 propagator), measured facts for the attached screenshot:*
- *The default-mode flash is about 1.5 s, not a frame: median 1493 ms in Run 8 SCREEN-1 and 1557 ms in
  Run 9 R9-SCREEN-1.*
- *A minimized window is refused with `WINDOW_MINIMIZED`; per this section that lands in
  `attachErrors`.*
- *A window fully covered by other windows does not yield a capture. R9-RESTORE measured `TIMEOUT`
  at 35 119 ms, and the previous tab came back only at +30 026 ms. So the 5 s attach cut ends the SDK's
  wait, but not the extension's switch: the human may see the failed tab for up to 30 s. S4 should
  state this.*
- *`formatSnapshot` is imported from `@bridge/sdk/format` (#46).*

*See Step 7 as-built § T5, § T5b, § "RELOAD-AUTO, Run 9, BG-FLAGS".*

*Added 2026-10-23 (Stage 0): unstated so far (stage0-audit.md F25): a failing `screenshot` (its
`TIMEOUT` is in the attach set) would attach a second switch-mode screenshot; another actor's lock can
turn the attach into `LOCK_TIMEOUT` in `attachErrors`; the 60-line window has no anchor for the five
codes without candidates; and whether raw `call()`, which the MCP uses, is enriched.*

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
  *Corrected 2026-10-23 (Step 7 propagator): as built Step 7 T4 already ships part of this section.
  The MCP cursor lives in `mcp/src/cursor.ts`: it is claimed on the first untargeted touch, moved only by
  `browser_select_tab` and `browser_new_tab`, and lost on a 4002 reconnect or a new client, with a
  one-time notice. `browser_select_tab {tab}` claims without activating. `browser_focus_tab` exists.
  `browser_status` prints `Active tab: [T<n>] title — url` from the `current` marker. The rows STAT-1,
  MUX-1 and MUX-8 carry dated notes for that. Decision: decisions.md · 2026-10-22 · T4's MCP cursor and
  tool details (#59). `browser_new_tab` always sends `active: true` today (`mcp/src/tools/registry.ts:320`).
  S5 therefore adds only `browser_use_active_tab`, the `Cursor:` and divergence lines, the `active` rule
  of `browser_new_tab`, and the locator fields — see Step 7 as-built § Stage T4.*
- `browser_new_tab`: `active: true` **only if** the cursor's tab is currently the human's active tab
  (the human was watching Claude; keep them watching); otherwise background. `browser_select_tab {tab}`
  → claim + cursor, no activation; `browser_focus_tab` brings the cursor on screen.
- Actions take `ref` **or** the locator fields (`role`, `name`, `text`, `css`) so Claude can act
  without a fresh snapshot when it knows the name — fewer tokens per step. Tool count 22 → 23.
  *Added 2026-10-23 (Stage 0): two schema points for the session agent before S5. The field `text`
  already means the value to type on `browser_type` (`mcp/src/tools/registry.ts:195`) and the body text
  on `browser_wait_for` (`:342`), and `ref` is required today (stage0-audit.md F12; proposed: a nested
  `locator` object, `ref` optional). And with no cursor yet, the `browser_new_tab` rule above opens the
  session's first tab in the background, a change rows TAB-1…4 and MUX-1 observe (F26).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Locator rules, the MCP locator schema
  and the exported `BridgeError` (#83)) item 2, F12: the MCP's actions and `browser_wait_for` take a
  nested `locator: {role?, name?, exact?, text?, css?, nth?}`; `ref` becomes optional; "exactly one of
  ref / locator" is validated in the tool. Existing `text` fields keep their meaning. Contract-level:
  open for the user's review; binds meanwhile. (F26, the first tab with no cursor, is not ruled in
  #78–#85.)*
  *Superseded 2026-10-23: was "Actions take `ref` **or** the locator fields (`role`, `name`, `text`,
  `css`)", flat on the tool, because a flat `text` collides with `browser_type.text` (decisions.md ·
  2026-10-23 · Locator rules, the MCP locator schema and the exported `BridgeError` (#83)).*

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
- [ ] *Added 2026-10-23 (Stage 0), from kickoff §7 S0:* `NO_CURSOR` in `shared/src/codes.ts` (23 codes;
      raised by the SDK only; spec §10 gets a dated note in or before this commit — decisions.md ·
      2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as the 23rd code (#76)); `focusEmulation?:
      boolean` on the trusted-input params (`click`/`type`/`pressKey`); the extension hello's optional
      `session?: string` (decisions.md · 2026-10-23 · The extension hello carries an optional session
      marker (#74)); `asRef?` on the evaluate params. Exit check S0.4 below.
      *Stage 0 notes:* `codes.ts` types `ErrorCode` as the union of the daemon and extension lists and
      its header says "exactly these 22", so `NO_CURSOR` needs a third list (`SDK_ERROR_CODES`) and a
      new header (stage0-audit.md F27). `WaitForParams` as written in 0.4 makes `{}` a valid `{text?}`
      arm and omits 0.2's `timeoutMs` on the locator arm (F28, proposed `{text: string}`, `{locator,
      state?, timeoutMs?}`, pending the session agent).
      *Built 2026-10-23 (S0 step agent): F27 as proposed — `shared/src/codes.ts` holds
      `SDK_ERROR_CODES = ["NO_CURSOR"]` as a third list, in `ErrorCode`, `ErrorCodes` and
      `isErrorCode`'s set, with a new header (23 codes: 22 on the wire from the daemon and extension,
      `NO_CURSOR` from the SDK alone); mechanical. F28 as proposed — `WaitForParams` is
      `{text: string}` | `{locator, state?, timeoutMs?}` | `{networkIdle: true, idleMs?}` | `{seconds}`;
      design-local, proposed in S0.md for the session agent to record.*
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · S0's rulings: bounded bundle diff,
      `WaitForParams`, 0-based `nth`, #79's S2b check (#86)): item 2 — `WaitForParams` = `{text: string}` |
      `{locator, state?, timeoutMs?}` | `{networkIdle: true, idleMs?}` | `{seconds}`, as built (F28).*

**Lane:** `shared/src/`, `shared/test/`. **Parallel with:** sequential, first. **Verifier focus:**
`LOCATOR_NOT_FOUND` and `LOCATOR_AMBIGUOUS` are present in `shared/src/codes.ts` from Step 6 (the plan
says "verify"); the `Locator` union matches 0.1 exactly (three variants, `nth` on all, `exact` on two);
the `WaitForParams` discriminated union has the four arms of 0.4's `waitFor`.
*Added 2026-10-23 (Stage 0), from kickoff §7:* the daemon and extension bundles are byte-identical
after S0 (types only, so no build-id handover).
*Added 2026-10-23 (S0 step agent), escalated to the session agent: this clause conflicts with S0.4 and
decisions.md · 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as the 23rd code (#76) by
construction. `daemon/dist/index.js` and `extension/dist/sw.js` bundle the `ErrorCodes` object literal
(`daemon/src/*.ts`, `extension/src/errors.ts` import it) and the daemon bundles `isHello`
(`daemon/src/handshake.ts:1`), so adding `NO_CURSOR` to `ErrorCodes` and a `session` check to `isHello`
changes both bundles' bytes. The clause stands unchanged until ruled; S0's report gives the measured
diff.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · S0's rulings: bounded bundle diff,
`WaitForParams`, 0-based `nth`, #79's S2b check (#86)): item 1 — `extension/dist/{content,offscreen,options}.js`
byte-identical; `daemon/dist/index.js` and `extension/dist/sw.js` may differ only by the `NO_CURSOR` entry
in `ErrorCodes` and the hello guard's `session` check, shown by a `diff` of the two builds (measured by S0:
daemon `490f1c60…` → `7712e1af…`, sw `503cd209…` → `b614aa9e…`, nothing else).*
*Superseded 2026-10-23: was 'byte-identical', because `ErrorCodes` and `isHello` are runtime values
bundled into the daemon and the worker (#86).*
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

### Stage FE — Focus emulation for trusted input, measured

*Added 2026-10-23 (Stage 0): this stage is copied from kickoff §7 (decisions.md · 2026-10-23 · Stage FE
measures focus emulation before `policy.ts` is set (#71)); it resolves G8-1. The text below is the
kickoff's, unchanged; Stage 0's flags follow it. Its exit checks FE.1–FE.6 are under "Exit checks".*

(lane: `extension/src/debugger.ts`, the trusted branch of `extension/src/handlers/actions.ts`, a pure
helper module under `extension/src/` if needed, `extension/test/`, `recipes/` for the measurement
script, `docs/e2e-test-plan.md` for a new §4.17):
- [ ] A `focusEmulation: true` param on `click`/`type`/`pressKey` that take the trusted path (explicit
      `trusted:true`, or the escalation after a content-action failure): inside the same `withDebugger`
      session, send `Emulation.setFocusEmulationEnabled {enabled: true}` before the `Input.*` commands
      and `{enabled: false}` after them, in a `finally`. No `chrome.windows.update`, no `tabs.update`,
      no `focusTab` inside it. The result carries `focusEmulation: "on"`, so a stale extension (which
      ignores the unknown param) is detectable. Without the param, today's command sequence is unchanged.
- [ ] Rows (pre-registered, committed before the build is loaded): **FE-0** the stale check
      (`focusEmulation: "on"` in a result); **FE-1** BG-1 with `focusEmulation:true`; **FE-2** BG-2 with
      it; **FE-3** a trusted `pressKey` into the background tab's trusted-only input with it (the
      fixture's keydown reporter, `test-fixtures/e2e-playground.html:168`, PASS = `status: TRUSTED key = <key>`); **FE-4** the
      human's side during FE-1…3 — the human's tab stays `current` and never `hidden`, the foreground
      window is unchanged, the target stays `hidden` (window capture and page timestamps as Run 8/9);
      **FE-5** BG-1/BG-2 without the option on the same build (control: expected FAIL as in Runs 8 and 10,
      which makes FE-1/FE-2 discriminating). PASS rules are BG-1's and BG-2's (§4.14), copied, with the
      option added; three trials each.
- [ ] The live part: commit; main-tree `npm run build` of committed code; `recipes/reload-extension.ps1`
      (exit 0, else stop and ask me); FE-0 first; then the rows; `FE-run-record.md` with every command
      and its text; daemon log attached as `.txt`; a fresh verifier re-reads the record against the
      pre-written rules.
- **Outcome table** (written now; the session agent records the matching decision, "The background-input
  policy", citing the rows, and S3 sets `sdk/src/policy.ts` from it):
  - **(A) FE-1, FE-2, FE-3 PASS in all trials and FE-4 PASS** → policy `"focusEmulation"`: the SDK's
    trusted actions send `focusEmulation: true`; no `focus()`, no flash; the MCP's trusted tools do the
    same (S5).
  - **(B) FE-1 and FE-2 FAIL, or FE-4 FAIL** (the human saw something) → policy `"focusFirst"`: the
    plan's fallback (0.4; #66 "Revisit if") — `Tab.click/type/pressKey({trusted:true})` call `focus()`
    first, and the docs say the tab comes to the front and stays there.
  - **(C) mixed** (one input kind passes all trials, another fails; FE-4 PASS) → per kind: the passing
    kinds use emulation, the failing kinds `focus()` first; recorded per kind.
  - A trial that passes once and fails once counts as FAIL for that kind (no best-of-three).
  - FE-5 passing (the control no longer fails) voids the comparison: record it, read the policy as (B),
    and list it for me.

*Stage 0 flags these clauses: see stage0-audit.md F1, F3 and F4; the session agent rules before
FE-0…FE-5 are committed.*
- *FE-4's "the target stays `hidden`", and the "target visibilityState hidden" that FE-1/FE-2 copy from
  BG-1/BG-2 (`docs/e2e-test-plan.md:679-680`): Chromium's `EmulationHandler::SetFocusEmulationEnabled`
  raises a visible capturer (`IncrementCapturerCount(…, /*stay_hidden=*/false, …)`), and
  `CalculatePageVisibilityState` returns `kVisible` while one exists. So the target's page reads
  `visible` while the option is on, and the clause fails for a reason the human never sees (F1,
  CRITICAL; Chromium `main`, unconfirmed for Chrome 156).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · FE's rows and outcome table, amended
  before anything is measured (#78)) item 1, F1: FE-4 judges only what the human sees: the human's tab
  stays `current` and never `hidden`; the foreground window and every window's active tab are unchanged;
  the target is never `active` in its window; no window capture shows the target. The debugging banner
  is expected and is not a FAIL. The target's page visibility is a pre-registered **observation**
  ("`visible` while the option is on, `hidden` again after the call"); FE-1/FE-2's copied "target
  visibilityState hidden" is read after the call returns. Item 3: Positive control: one default-mode
  screenshot of the target while the human's-tab `visibilitychange` logger runs must log `hidden` →
  `visible`. Contract-level: open for the user's review; binds meanwhile.*
  *Superseded 2026-10-23: FE-4 was "the human's tab stays `current` and never `hidden`, the foreground
  window is unchanged, the target stays `hidden` (window capture and page timestamps as Run 8/9)", because
  focus emulation raises a visible capturer, so the target reads `visible` while the option is on — a
  state the human never sees (decisions.md · 2026-10-23 · FE's rows and outcome table, amended before
  anything is measured (#78)).*
- *The outcome table is not total: FE-1/FE-2 FAIL with FE-3 PASS matches both (B) and (C); FE-0 FAIL,
  "FE-5 passing" across trials, trial independence and the debugging banner (shown on every trusted
  call) are unstated; FE-4 has no positive control (F3).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · FE's rows and outcome table, amended
  before anything is measured (#78)) item 2, F3: Precedence: FE-5 void → (B); else FE-4 FAIL → (B); else
  every kind passes all trials → (A); else no kind passes → (B); else (C). FE-0 FAIL is "stop, reload,
  re-check", not an outcome. FE-5 "passes" if the control receives input in any trial; FE-5 runs first and
  last. Each trial uses a fresh fixture tab or a reset status line. FE-4 is judged over all trials of
  FE-1…3. The banner and the positive control: see the note above (items 1 and 3). Item 4: Under (A)/(C),
  the SDK sends `focusEmulation: true` on every trusted-capable click/type (it cannot see the extension's
  automatic escalation); (C) is a per-kind map in `policy.ts`; `type {submit}` takes the stricter of type
  and pressKey. Under (B), the MCP's trusted tools keep today's behaviour (no automatic focus;
  `browser_focus_tab` stays an explicit call) and only the SDK's `Tab` focuses first. Contract-level: open
  for the user's review; binds meanwhile.*
  *Superseded 2026-10-23: the outcome table above was (A) "FE-1, FE-2, FE-3 PASS in all trials and FE-4
  PASS", (B) "FE-1 and FE-2 FAIL, or FE-4 FAIL", (C) "mixed … FE-4 PASS", with no precedence, because the
  cases overlapped (FE-1/FE-2 FAIL with FE-3 PASS matched both (B) and (C)) and FE-0, FE-5 across trials
  and trial independence were unstated (decisions.md · 2026-10-23 · FE's rows and outcome table, amended
  before anything is measured (#78)).*
- *Trusted `type` focuses the field through the content script before `withDebugger`
  (`handlers/actions.ts:67-71`), so the focus step runs without emulation; FE-3 (`pressKey`, which has no
  focus step) must name how `#trusted-input` is focused first (F4).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
  recipe, S3.5's control, the stage split (#85)) item 3, F4: with `focusEmulation`, the order is attach →
  enable → focus the field → `Input.*` → disable in a `finally`; FE-3's row names its focus step and key.*
  *Superseded 2026-10-23: the option's sequence was "send `Emulation.setFocusEmulationEnabled {enabled:
  true}` before the `Input.*` commands and `{enabled: false}` after them" (first checkbox above), with
  trusted `type`'s focus step before `withDebugger`, because that focus step then ran without emulation
  (decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's recipe, S3.5's control, the stage
  split (#85)).*

**Parallel with:** the build part with S1 (file-disjoint); the live part alone, after the build part is
committed and no other stage has uncommitted code in the main tree. **Verifier focus** (kickoff §7):
the option's CDP sequence; no window focus; the outcome read off the table. **Needs the user's
keyboard:** only if `recipes/reload-extension.ps1` exits non-zero.

### Stage S2 — Extension handlers: `ref | locator`, `waitFor({locator})`, node→ref

- [ ] `handlers/actions.ts`: `resolveTarget(tabId, p) → ref` (locator → `locate`); every action uses it.
- [ ] `handlers/wait.ts`: `locator` + `state` branch (§0.2).
- [ ] `handlers/evaluate.ts` + `evaluate/mark.ts` (pure `markScript`): `asRef` (§0.3).
- [ ] `tabs.ts`: delete the `activeTab()` fallback in `targetTab` (migration over); `BAD_PARAMS` when
      `tabId` is missing. Also remove the `selectTab` alias of `focusTab` from `sw.ts` (*added
      2026-10-21*; decisions.md · 2026-10-21 · selectTab stays as an alias of focusTab for one release).
- [ ] `router.test.ts` / `actions.test.ts` cover the resolution path with a fake `locate`.
- [ ] *Added 2026-10-23 (Stage 0), from kickoff §7 S2:* a `locate` extension method — router entry in
      `extension/src/sw.ts`, and a row in `daemon/src/methods.ts` as a tab method (lease-checked) — in
      the **same commit** (decisions.md · 2026-10-22 · The daemon's method classes are one table, and the
      download methods are free (#39)). Exit check S2.6.

*Corrected 2026-10-23 (Stage 0): was the `tabs.ts` checkbox above (delete the `activeTab()` fallback,
remove the `selectTab` alias) as S2 work; now both move to stage S2b with the daemon's half, because
the removals are one compatibility contract across three packages (decisions.md · 2026-10-23 · S2's
daemon half becomes stage S2b (#72); stage0-audit.md § 3). S2 keeps the handlers, `waitFor`, `asRef`
and `locate`. Stage 0 adds, for the session agent: an unlisted method without `tab` is forwarded free
with no `tabId` (`daemon/src/methods.ts:54-55`), so until S2b `locate` without `tab` would land on the
extension's human's-tab fallback (executed, stage0-audit.md F8); `daemon/test/methods.test.ts:8` asserts
the exact sorted `TAB_METHODS` list, so S2 needs that one test file granted (proposed, mechanical); and
the `asRef` details of F21 (the objectId is released inside the serializer callback,
`extension/src/debugger.ts:186`; `kind:"node"` also covers `window` and text nodes; `refOfMarked` must
search open shadow roots and same-origin frames) and the locator-failure rules of F23 (no escalation to
trusted input on `LOCATOR_*`; the poll runs in the service worker).*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
recipe, S3.5's control, the stage split (#85)) item 5, F8's grant: S2 is granted
`daemon/test/methods.test.ts`; `locate` enters `methods.ts` in the same commit as its router entry.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this
step; network calls without `tab` stay "active" (#81)), F8's loophole: After S2b an **unlisted** method
without `tab` is refused `BAD_PARAMS "tab is required"` instead of forwarded. Contract-level: open for
the user's review; binds meanwhile. (F21's `asRef` details and F23's locator-failure rules are not ruled
in #78–#85.)*

*Corrected 2026-10-23 (Step 7 propagator): was an extension-only removal. As built the fallback in
`targetTab` is `activeTab()`, a module-private wrapper of `humansTab()` (`extension/src/tabs.ts:22`,
`:69`), with one `console.warn` per method. The counterparts S2 must remove with it are in the daemon:
the legacy path (#41, #54), `selectTab` in `methods.ts`'s lock class and `LEGACY_ID_METHODS` (#53), and
the Chrome `id` beside `tab` (#57). Two more removals are in the extension: the old `tab:"all"` scope
(#52), and the `WINDOW_MINIMIZED` message rewrite (#63). The list is under Files touched. If the daemon
keeps forwarding `selectTab` after the extension drops it, a Step 6 client gets `UNKNOWN_METHOD`
instead of a refusal. S2's lane names no `daemon/` path, so the Stage-0 audit must grant
`daemon/src/` and `daemon/test/`, or move these removals to a stage of their own; this is a lane
question for the session agent. Removing the legacy path also meets the revisit trigger of
decisions.md · 2026-10-22 · v2 peers do not yet require `code` (#51) — see Step 7 as-built § Stage T1,
§ Stage T2.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
recipe, S3.5's control, the stage split (#85)), the lane question above, items 4–6: S2b's daemon refuses
`selectTab` itself (`UNKNOWN_METHOD`) before resolution, tested against a fake that would answer it. S2
is granted `daemon/test/methods.test.ts`; `locate` enters `methods.ts` in the same commit as its router
entry. S2b is also granted `extension/src/client.ts` (the hello lives there, not in `offscreen.ts`),
`extension/src/handlers/tabs.ts`, `extension/src/handlers/network.ts`. (The removals' own stage is
decisions.md · 2026-10-23 · S2's daemon half becomes stage S2b (#72).)*

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
*Corrected 2026-10-23 (Stage 0): was a lane without `daemon/`, and the verifier-focus grep `grep -n
"activeTab" extension/src`; now the lane also grants `extension/src/sw.ts` and `daemon/src/methods.ts`
for the `locate` method (kickoff §7), and the `activeTab` grep moves to S2b's close as `grep -rn`,
because without `-r` grep on a directory prints `grep: extension/src: Is a directory`, exits 2 and can
never find anything (executed; stage0-audit.md F16). Also from kickoff §7: `markScript` closure-free,
the attribute removed, a unique mark; `hidden` resolves on `LOCATOR_NOT_FOUND` only.
`toSerializableArgs` maps only top-level `undefined` (executed: `{locator: undefined}` stays
`undefined`), so pass `locator` as its own argument (F34).*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Pre-registered checks reworded where they
could not hold or could not fail (#84)), F16: Every grep check uses `grep -rn` and reads empty stdout
**and** exit 1. Contract-level: open for the user's review; binds meanwhile. (F34 is not ruled in
#78–#85.)*

### Stage S2b — The Step 6 compatibility path, `code` required, the session marker, the minimized-window message

*Added 2026-10-23 (Stage 0): this stage is copied from kickoff §7 (decisions.md · 2026-10-23 · S2's
daemon half becomes stage S2b (#72); · S2b makes `code` required on error frames (#73); · The extension
hello carries an optional session marker (#74)). The checkboxes below are the kickoff's, unchanged;
Stage 0's notes follow them. Its exit checks S2b.1–S2b.8 are under "Exit checks"; S2.2 is checked here.*

**Lane** (kickoff §7 item 1): `daemon/src/` (`intercept.ts`, `methods.ts`, `handshake.ts`, `route.ts`
as needed), `daemon/test/`, and in the extension `tabs.ts`, `sw.ts`, `network-scope.ts`, `offscreen.ts`
(the hello), `errors.ts`, `extension/test/`; `shared/src/error.ts` for `code`; plus one grant per
consumer Stage 0 finds of a removed form.
*Stage 0 (stage0-audit.md F9, F7), proposed grants pending the session agent:* the hello is built in
`extension/src/client.ts:8-9` (sent `:50`), not in `offscreen.ts`; `extension/src/handlers/tabs.ts:70`
(`export const selectTab = focusTab;`, which S2b.2's grep hits); `extension/src/handlers/network.ts:12`
(`targetTab({}, method)`, a human's-tab fallback the `activeTab` grep cannot see). If the Chrome `id`
beside `tab` is removed (F7, option (b)): `recipes/hello.ts`, `recipes/t5.ts`, `recipes/t5-lib.ts`,
`mcp/src/tools/registry.ts` (the three `?? id` fallbacks at `:140`, `:284`, `:321`) and dated notes on
MUX-3/5/6/8/10 and LEASE-5/6.
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
recipe, S3.5's control, the stage split (#85)) item 6, F9's lane part: S2b is also granted
`extension/src/client.ts` (the hello lives there, not in `offscreen.ts`), `extension/src/handlers/tabs.ts`,
`extension/src/handlers/network.ts`; S2b.2 adds `grep -rn "targetTab({}" extension/src` → nothing; the two
`methods.ts` comments are reworded.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this
step; network calls without `tab` stay "active" (#81)), F7: S2b does not remove the Chrome `id` from
`newTab`/`listTabs` results. So option (b)'s conditional grants above (`recipes/hello.ts`, `recipes/t5.ts`,
`recipes/t5-lib.ts`, `mcp/src/tools/registry.ts`, the MUX/LEASE notes) are not taken. Contract-level: open
for the user's review; binds meanwhile.*

- [ ] Daemon: remove the legacy path (#41: no `tab` → the human's tab; a Chrome `id` on
      `closeTab`/`focusTab` → its handle; #54: a bare number in a network `tab`); a non-free call
      without `tab` → `BAD_PARAMS "tab is required"` (T2.4's original clause, superseded by #41, returns);
      a numeric network `tab` → `BAD_PARAMS` (#40's original rule); `LEGACY_ID_METHODS` gone; `selectTab`
      out of the method table and the lock class (#53), so a `selectTab` call is answered as an unknown
      method; `newTab`/`listTabs` results without the Chrome `id` beside `tab` (#57) — *unless* Stage 0
      finds a consumer that needs it, then a dated decision.
- [ ] Extension: delete the `activeTab()` fallback in `targetTab` (`tabs.ts:22`, `:69`) → `BAD_PARAMS`
      when `tabId` is missing; remove `router.on("selectTab", …)` (`sw.ts:32`); drop the old `tab:"all"`
      scope from `network-scope.ts` (#52); rewrite the switch-mode `WINDOW_MINIMIZED` message
      (`tabs.ts:196`, #63) to stop suggesting `mode:"cdp"` — proposed text: `Chrome's window is
      minimized, so the tab cannot be captured — restore the window, or call focusTab first` (cdp's
      refusal already says "restore the window, or call focusTab first"). The test asserting the old
      text is replaced in the same commit, citing #63 (a designed change decided before the edit, not a
      test edited to match), and the SCREEN-4 row in `docs/e2e-test-plan.md` gets a dated
      *Superseded* note on its expected text; its recorded result is not touched.
- [ ] `code` required (#51's trigger; *proposed by the kickoff*, conservative rule): `WireError.code`
      becomes required in the type; the extension's every error path sends a code (a test over
      `router.ts`'s paths); on receipt, a proto:2 peer's error without a non-empty string code is still
      delivered as `INTERNAL` (never dropped, never turned into a timeout) with one log line per
      connection naming the method only; a no-proto peer keeps today's mapping. Rejected: refusing or
      dropping the frame.
- [ ] The session marker (item 4 above).
- [ ] *Added 2026-10-23 (#86 item 4):* #79's daemon half gets an S2b checkbox and exit check S2b.9: a
      second `HandleTable` started against the first's high-water mark never re-mints a number the first
      minted (stale `T<n>` → `TAB_UNKNOWN`), and with the mark file unreadable it falls back to a start-time
      base; tested with an injected directory, never `~/.chrome-agent-bridge/` itself.

*Stage 0 notes on the checkboxes (stage0-audit.md), for the session agent:*
- *Consumers of the Chrome `id` exist (F7): `recipes/hello.ts:81` prints `[${active.id}]` (MUX-3 expects
  `active: [<id>] <title>`); `recipes/t5.ts:552-553` decides LEASE-6's (a)/(b) from it; `recipes/t5-lib.ts:100`
  prints it; five daemon lease tests read it. This is the "consumer that needs it" case: a dated
  decision is required (keep `id` this step, or remove it with the grants above).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this
  step; network calls without `tab` stay "active" (#81)), F7: S2b does not remove the Chrome `id` from
  `newTab`/`listTabs` results (F7: `recipes/hello.ts`, `t5.ts` LEASE-6, `t5-lib.ts`, five daemon tests and
  `registry.ts` read it). Contract-level: open for the user's review; binds meanwhile.*
  *Superseded 2026-10-23: the first checkbox's "`newTab`/`listTabs` results without the Chrome `id` beside
  `tab` (#57)" was S2b work, because Stage 0 found consumers — the checkbox's own "unless" case (decisions.md
  · 2026-10-23 · The Chrome `id` stays beside `tab` this step; network calls without `tab` stay "active"
  (#81)).*
- *A `selectTab` dropped from `methods.ts` alone falls into the "unlisted with a `tab`" class and is
  forwarded **without the visibility lock** (executed, F10). Between S2b's daemon build and the extension
  reload a Step 7 extension still runs it as `focusTab`. Proposed: the daemon refuses `selectTab` itself
  (`UNKNOWN_METHOD`) before resolution.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
  recipe, S3.5's control, the stage split (#85)) item 4, F10: S2b's daemon refuses `selectTab` itself
  (`UNKNOWN_METHOD`) before resolution, tested against a fake that would answer it.*
- *"A non-free call without `tab`" does not cover `networkRequests`, which is free; today a network call
  with no `tab` takes the legacy resolver (`daemon/src/intercept.ts:419`), while #40 gives absent/"active"
  the human's tab by design. The rule after S2b is undecided (F9).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this
  step; network calls without `tab` stay "active" (#81)), F9: A network call without `tab` keeps #40's
  meaning (the human's tab), resolved without the legacy-path log. Contract-level: open for the user's
  review; binds meanwhile.*
- *#73's receipt half is already today's behaviour: codeless, empty, numeric, string and `null` errors
  arrive as `INTERNAL` within 1 ms from both peer kinds, with no log line; `{code:"WEIRD"}` passes through
  verbatim (executed, F17). The new parts are the type, the every-path test and the log line.*
- *"Item 4 above" is kickoff §7 item 4, recorded as #74. Its mechanism is not achievable as worded (F5):
  `chrome.storage.session` is cleared by an extension reload; a value written on `runtime.onStartup` races
  the worker's top-level `void connect()` (`extension/src/sw.ts:199`), so the first hello after a Chrome
  start can carry the old marker; the hello is built in the offscreen document, which can use only
  `chrome.runtime`, so the marker travels in the `connect` message (`sw.ts:154`); and
  `extension/src/offscreen.ts:10-15` keys the client on port and token only. Proposed: a marker promise
  awaited by `connect()` (reuse `storage.session`'s; else wait, bounded, for `onStartup` → fresh or
  `onInstalled` → reuse `storage.local`'s; neither → fresh), the marker part of the offscreen key, and a
  comparison with the last hello's marker so that none → none does not retire again.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The session marker's mechanism, amended
  (#80)), F5, amending #74: The service worker's `connect()` awaits a marker: `storage.session` has one →
  reuse (worker restart); else wait up to 2 s for `onStartup` (a fresh random marker) or `onInstalled`
  (reuse `storage.local`'s, an extension reload); neither in time → a fresh marker (costs leases, never
  safety); write both stores. The marker travels in the worker's `connect` message to the offscreen
  document and is part of the offscreen client key, so a changed marker sends a new hello. The daemon
  compares with the last hello's marker (none is a value): A→none retires, none→none does not. The choice
  is a pure, tested function over five event orders (worker restart; reload; `onStartup` before and after
  `connect()` within the bound; neither). Contract-level (wire): open for the user's review; binds
  meanwhile.*
  *Superseded 2026-10-23: the marker's mechanism was #74's ("Stage 0 confirms the mechanism, e.g. a value
  written on `chrome.runtime.onStartup`"), because `storage.session` is emptied by a reload, `connect()`
  runs before `onStartup`, and the offscreen key ignores the marker (decisions.md · 2026-10-23 · The
  session marker's mechanism, amended (#80)).*
- *Removing an unlisted-method loophole: an unlisted method without `tab` is forwarded free with no
  `tabId` (`daemon/src/methods.ts:54-55`, executed). Proposed for S2b: refuse it `BAD_PARAMS "tab is
  required"` (F8; #39 is contract-level).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this
  step; network calls without `tab` stay "active" (#81)), F8: After S2b an **unlisted** method without
  `tab` is refused `BAD_PARAMS "tab is required"` instead of forwarded. Contract-level: open for the
  user's review; binds meanwhile.*
- *After a marker change retires every handle, the MCP's cursor answers each untargeted call with
  `TAB_GONE "tab T1 was closed …"` although nothing closed (`mcp/src/cursor.ts:10-11`, `intercept.ts:394`;
  F24).*

**Parallel with:** after S2 (both touch `sw.ts` and `daemon/src/methods.ts`); with S3. **Verifier focus**
(kickoff §7): the removals are stricter, never looser; the Step 7 MCP still works; the documented test
removals. **Needs the user's keyboard:** no.

### Stage S3 — SDK: `Tab`, cursor, locator normalisation (TDD with a fake client)

- [ ] `sdk/src/locator.ts`: `normalizeTarget(target)` → `{ref}` | `{locator}`; validates shape;
      friendly messages for the common mistake (`{name}` without `role` → "use {text} or add role").
- [ ] `sdk/src/tab.ts` (§0.4) and `client.ts` cursor methods; `screenshot({path})` writes the PNG and
      returns the path; `download` wraps `downloadToFile`.
- [ ] Tests: every `Tab` method sends the expected `{method, params}` with `tab: handle`; cursor
      semantics; `NO_CURSOR`; a 4002 reconnect clears the cursor (*added 2026-10-21*); `trusted` →
      `focus()` first *iff* the BG flag says so (a constant in `sdk/src/policy.ts`, set from the Step 7
      findings).
      *Corrected 2026-10-23 (Step 7 propagator): the findings exist, and both are FAIL: BG-1/BG-2 in
      Run 8, BGF-1/2 in Run 10. They are not enough to set the constant on their own, because the user
      ruled that a focus-emulation option is measured first (#62 item 4). See G8-1.*
      *Added 2026-10-23 (Stage 0): the constant is read off stage FE's outcome table, through the
      decision "The background-input policy" that names (A), (B) or (C) and the FE rows (FE.6); outcome
      (C) makes it a per-kind map (`click`/`type`/`pressKey`). S3 reaches `policy.ts` only after that
      decision is recorded (kickoff §9 STOP rules).*
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · FE's rows and outcome table, amended
      before anything is measured (#78)) item 4: Under (A)/(C), the SDK sends `focusEmulation: true` on
      every trusted-capable click/type (it cannot see the extension's automatic escalation); (C) is a
      per-kind map in `policy.ts`; `type {submit}` takes the stricter of type and pressKey. Under (B), the
      MCP's trusted tools keep today's behaviour (no automatic focus; `browser_focus_tab` stays an
      explicit call) and only the SDK's `Tab` focuses first. Contract-level: open for the user's review;
      binds meanwhile.*
- [ ] *Added 2026-10-23 (Stage 0), from kickoff §7:* **S3.5 — the inherited handles** (#36; lane
      `sdk/src/spawn.ts`, `sdk/test/`; decisions.md · 2026-10-23 · The inherited-handles check runs in S3
      as S3.5 (#77)): a test spawns, through `spawnDaemon`'s options, a stand-in long-lived node script
      (never the real daemon, never port 9234) from a child process whose stdout is a pipe; the child
      exits; PASS = the reader sees end-of-file within 2 s while the stand-in is still alive (then killed
      by its recorded pid). Both outcomes written now: if the test **passes at the baseline**, nothing
      changes and the MUX-6 gotcha gets a dated note that `spawnDaemon` inherits no pipe (the hold came
      from `Start-Process -NoNewWindow` itself); if it **fails**, S3 fixes the spawn so nothing is
      inherited, and the test is the proof.
      *Stricter (Stage 0, stage0-audit.md F15): a positive control runs in the same harness — the stand-in
      spawned with `stdio: "inherit"` must **not** see end-of-file within 2 s while it lives; without it a
      broken harness passes. The test spawns without a `tsx` layer between the reader and `spawnDaemon`.*
      *Stage 0 flags the outcome text: see stage0-audit.md F15; the session agent rules before S3.5 is
      run. Executed at the baseline by two auditors, the test passes (EOF −5 ms and −4 ms before the
      child's `exit`, stand-in alive) and the inheriting control holds the pipe; the MUX-6 chain
      (PowerShell `Start-Process -NoNewWindow`) was not run, so "the hold came from `Start-Process
      -NoNewWindow` itself" is a cause the test does not measure, and a third outcome ("fails and no
      Node-level option removes it") is missing.*
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
      recipe, S3.5's control, the stage split (#85)) item 2, F15: S3.5 gains a positive control — the same
      test with `stdio:"inherit"` must see no EOF within 2 s — and spawns without the `tsx` layer; #77's
      pass outcome now reads "`spawnDaemon` inherits no pipe (node and npx parents); the MUX-6 cause
      remains unmeasured", and a third outcome is added: fails and no Node-level option removes it →
      recorded with the measured cause.*
      *Superseded 2026-10-23: the pass outcome was "nothing changes and the MUX-6 gotcha gets a dated note
      that `spawnDaemon` inherits no pipe (the hold came from `Start-Process -NoNewWindow` itself)", with
      two outcomes only, because the test does not measure the `Start-Process -NoNewWindow` chain and a
      fail with no Node-level fix had no outcome (decisions.md · 2026-10-23 · Stage 0's build-level
      rulings: SDK-1's recipe, S3.5's control, the stage split (#85)).*
- [ ] *Added 2026-10-23 (Stage 0), for the session agent:* the SDK's `waitFor` sends a call `timeoutMs`
      above the wait's own (`browser_wait_for {seconds: 45}` already outlives today's 30 s default call,
      `mcp/src/tools/registry.ts:359`; stage0-audit.md F22); the cursor clear runs inside the reconnect
      path before any queued call (F24); a `Tab` from before a 4002 reconnect is void (F2).
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · A new daemon never reuses a handle
      number; the SDK guards stale `Tab`s (#79)), F2: S3: each `Tab` carries the client's connection
      generation and throws `TAB_UNKNOWN` locally after a 4002 reconnect, with no call. Contract-level:
      open for the user's review; binds meanwhile. (F22 and F24 are not ruled in #78–#85.)*

**Lane:** `sdk/src/`, `sdk/test/`. **Parallel with:** S1. **Verifier focus:** the `policy.ts` constant
cites the Step 7 E2E rows (BG-1/BG-2) it was set from, in a comment and in the stage report — if the
findings are absent, the stage stops at that item (G8-1); every `Tab` method in 0.4 has a test
asserting the exact `{method, params}` sent, including `tab: handle`; `b.<method>()` without a cursor
throws `NO_CURSOR` with the "call newTab() or claim() first" text; `normalizeTarget` rejects `{name}`
alone with the friendly message. **Needs the user's keyboard:** no.
*Corrected 2026-10-23 (Stage 0): was "Parallel with: S1" and a `policy.ts` cited from BG-1/BG-2 alone;
now S3 runs after FE's outcome is recorded, in parallel with S2/S2b (kickoff §7; S3 may start earlier on
everything but `policy.ts`), and `policy.ts` cites BG-1/BG-2 **and** the FE rows and the decision "The
background-input policy", because G8-1 is resolved by stage FE (decisions.md · 2026-10-23 · Stage FE
measures focus emulation before `policy.ts` is set (#71)).*

### Stage S4 — SDK failure reports (TDD)

- [ ] `sdk/src/error.ts`: `BridgeError` subclass with `snapshot?`, `screenshotPath?`, `network?`,
      `attachErrors`, `report()`; `attachContext(error, tab, opts)` best-effort with a 5 s budget.
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · S0's rulings: bounded bundle diff,
      `WaitForParams`, 0-based `nth`, #79's S2b check (#86)): item 6 — S4 builds the failure report per #83
      (optional properties on the shared `BridgeError`); its "subclass" wording is superseded.*
      *Superseded 2026-10-23: was "subclass", because #83 item 3 keeps the shared `BridgeError` exported,
      with the report fields as optional properties.*
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
*Corrected 2026-10-23 (Step 7 propagator): live waves are run by the driver end to end (decisions.md ·
2026-10-22 · Live E2E waves are run by Claude end to end (#33)). The extension reload is scripted:
`recipes/reload-extension.ps1`, followed by the stale-extension check (decisions.md · 2026-10-23 · Later
extension reloads use `recipes/reload-extension.ps1` (#65)). The user's keyboard is needed for the
reload only when that script exits non-zero. Rows on the user's own data (SDK-6, SDK-7) still need the
user, who names the course. A Chrome restart with flags needs a fresh grant (#66) — see Step 7 as-built
§ "RELOAD-AUTO, Run 9, BG-FLAGS".*

- [ ] `recipes/README.md`, `recipes/hello.ts` (connect, newTab to the fixture, locate the login button,
      click, waitFor text, print, close).
      *Corrected 2026-10-22: `recipes/hello.ts` already exists (Step 6 D6: connect, `daemon.status`,
      `listTabs`, an optional hold; prints no URLs) and MUX-3/5/6/8/10 judge its output, so S6 either
      writes this flow as another recipe or updates those rows' expected text in the same stage — see
      Step 6 as-built § Stage D6.*
- [ ] **SDK-1** `hello.ts` end to end against the fixture while a Claude session is connected on
      another tab.
      *Added 2026-10-23 (Stage 0) — proposed (design-local), pending the session agent's decision:
      write the SDK-1 flow (connect → `newTab` to the fixture → `locate({role:"button", name:"Sign
      in"})` → `click` → `waitFor({text:…})` → print → close) as a **new** recipe (working name
      `recipes/sdk-login.ts`; the name is the session agent's), and amend S6.2 with a dated note to
      record `npm run recipe -- recipes/sdk-login.ts`. Why: `recipes/hello.ts` is the instrument of
      MUX-3/5/6/8/10 (a tab-free connect-and-list run, including MUX-8's run with no Chrome), so
      rewriting it would void five recorded expected texts and change MUX-3's client and hold semantics.
      Rejected: rewriting `hello.ts` and re-dating those rows. Independently, if S2b removes the Chrome
      `id`, `hello.ts:81` changes and those rows get dated notes before any run (stage0-audit.md F7).
      The new recipe prints no tab title or URL but the fixture's (F31).*
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
      recipe, S3.5's control, the stage split (#85)) item 1: SDK-1 runs a new recipe file; `recipes/hello.ts`
      and MUX-3/5/6/8/10's expected text stay (stage0.md §5). (#85 names no file; the working name
      `recipes/sdk-login.ts` is not ruled. F31 is not ruled in #78–#85.)*
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab`
      this step; network calls without `tab` stay "active" (#81)): S2b does not remove the Chrome `id`
      from `newTab`/`listTabs` results, so the "if S2b removes the Chrome `id`" branch does not arise
      this step. Contract-level: open for the user's review; binds meanwhile.*
      *Superseded 2026-10-23: SDK-1 was "`hello.ts` end to end against the fixture", with the flow of the
      checkbox above written into `recipes/hello.ts`, because `recipes/hello.ts` is MUX-3/5/6/8/10's
      instrument (decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's recipe, S3.5's
      control, the stage split (#85)).*
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · S0's rulings: bounded bundle diff,
      `WaitForParams`, 0-based `nth`, #79's S2b check (#86)): item 5 — S6.2 names the SDK-1 recipe file the
      S6 wave sheet fixes before the run.*
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
      *Added 2026-10-23 (Stage 0): the "human's tab" is a fixture tab the driver opens itself, never the
      user's Gmail or any tab of theirs, as LEASE-7 did (the repo is public; the driver never touches
      the user's tabs). Window Wh = `Open-T5Window http://localhost:8080/e2e-playground.html?t5=sdk8-human`,
      made current with `Set-T5Foreground <Wh>`. A headless actor works on its own `T<n>` (claimed on
      first touch in its window Wa); the driver then foregrounds Wh (the "switch to Gmail"); the actor's
      `browser_click` must land on `T<n>` (its page's status line); `browser_status` must print the
      `Human's active tab: T<h> … not mine` line; then the prompt "use this tab" → the actor calls
      `browser_use_active_tab` → `Cursor: T<h> …`. Evidence shows only fixture pages.*
- [ ] Regression smoke across Steps 6–8: MUX-2, LEASE-1, SCREEN-1, ACT-1…3, TRUST-2, EVAL-1, NET-1, DL-1
      (DL-1 is written by Step 6's D6; decisions.md · 2026-10-21 · Step 6 writes the DL rows for
      browser_download before its D6 wave).
      *Corrected 2026-10-23 (Step 7 propagator): "their last recorded run" is now Step 7's Run 9 for
      the rows it re-ran. SCREEN-1 is R9-SCREEN-1 (flash median 1557 ms). NET-1 expects `12.8 KB`
      (decisions.md · 2026-10-22 · NET-1's expected size follows the fixture to `12.8 KB` (#56)), and
      after a hard reload `showing 2 of 2`, because `favicon.ico` is re-fetched (R9-NET-1, accepted in
      #68). LEASE-1's expected text is Run 8's — see Step 7 as-built § T5, § "RELOAD-AUTO, Run 9,
      BG-FLAGS".*
- [ ] *Added 2026-10-23 (Stage 0), from kickoff §7 S6 item 3 (decisions.md · 2026-10-23 · The extension
      hello carries an optional session marker (#74)):* **SM-1** — a held handle across a Chrome restart
      → `tabGone`, never a live handle on a reused id. Needs a fresh Chrome restart grant from the user
      (`chrome://quit`, session restore, counts checked as in Run 10); without it, "not run — needs a
      Chrome restart grant". Pre-registered text (proposed by Stage 0, stage0-audit.md F5; the session
      agent fixes it before the run): a recipe holds fixture tab `T<a>` and records `daemon.status`
      (tab, tabId, owner); `chrome://quit` typed into the driver's window; relaunch with
      `recipes/bgf-launch.ps1` **without flags**; `bgf-count.ps1` equal before and after. PASS = within
      30 s of the extension's hello, `daemon.log` has exactly one `extension session changed: <n> handles
      retired` with `<n>` ≥ 1 and no marker value; the recipe receives exactly one `tabGone {tab: T<a>}`,
      whose `lastUrl` is the pre-restart page's; its next `snapshot {tab: T<a>}` → `TAB_GONE`; `listTabs`
      shows no tab owned by the recipe, and every handle is greater than every pre-restart handle; the
      daemon's pid is unchanged. FAIL on any live `T<a>` after the restart, whatever tab it names.
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The session marker's mechanism, amended
      (#80)): S2b.5 gains the none→none branch and asserts a retired handle's `tabGone` carries the
      pre-restart `lastUrl`. New grant-free row SM-0 (an extension reload keeps held handles) beside SM-1.
      Contract-level (wire): open for the user's review; binds meanwhile. (#80 does not otherwise fix
      SM-1's pre-registered text above; that is still for the session agent before the run.)*
- [ ] *Added 2026-10-23 (Stage 0) — proposed, pending the session agent (stage0-audit.md F5; auditor C
      calls it SM-0, auditor A SM-2):* **SM-0** — the marker survives an extension reload (no grant
      needed). A recipe holds fixture tab `T<a>` (hold ≥ 120 s, printing every event);
      `recipes/reload-extension.ps1` (exit 0). PASS = `daemon.log` has a new `extension resync: …` line
      and **no** `extension session changed` line; the recipe prints no `tabGone`; `snapshot {tab: T<a>}`
      after the reload answers; `listTabs` shows `T<a>` owned by the recipe. It makes SM-1
      discriminating. If #74 is amended to a marker that changes on reload, SM-0's expected text flips,
      and it is rewritten before the run.
      *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The session marker's mechanism, amended
      (#80)): New grant-free row SM-0 (an extension reload keeps held handles) beside SM-1. Under #80 an
      extension reload reuses `storage.local`'s marker (`onInstalled`), so SM-0's expected text above
      stands. Contract-level (wire): open for the user's review; binds meanwhile.*

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
*Corrected 2026-10-23 (Step 7 propagator): that count is 950 passed in 59 files (`npm test` at `9cfc7db`,
2026-10-23). It was 965 at T5b; T6 removed 15 dead formatter tests (decisions.md · 2026-10-23 · T6
removes the extension's dead network formatters with their 15 tests (#67)) — see Step 7 as-built
§ Stage T5b.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Pre-registered checks reworded where they
could not hold or could not fail (#84)), F16, for every check below: Every grep check uses `grep -rn` and
reads empty stdout **and** exit 1. Contract-level: open for the user's review; binds meanwhile. (It applies
to the checks whose grep must print nothing, among them S1.4 and S4.3, still written with `grep -n`; the
per-check notes below are at S2.2 and S2b.2.)*

**S0**
- S0.1 `npm test` after ≥ before; `npm run typecheck` green for all five packages.
- S0.2 `grep -n "LOCATOR_NOT_FOUND\|LOCATOR_AMBIGUOUS" shared/src/codes.ts` → both present.
- S0.3 The `Locator` type has the three variants of 0.1 and `WaitForParams` the four arms of 0.4.
- S0.4 *Added 2026-10-23 (Stage 0), from kickoff §7:* `grep -c` of codes → 23 with `NO_CURSOR`; the
  hello guard accepts a hello with and without `session` and rejects a non-string one. *Stricter (Stage
  0, stage0-audit.md F27): the count is `grep -cE '^  [A-Z_]+: "[A-Z_]+",$' shared/src/codes.ts` → `23`
  (`22` at `1a62620`), and `grep -c NO_CURSOR shared/src/codes.ts` ≥ 1 (`0` at `1a62620`).*
  *Stage 0 note: S0.2 cannot fail — both codes are present since Step 6 (`shared/src/codes.ts:23-24`); it
  is a confirmation.*

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
- S2.6 *Added 2026-10-23 (Stage 0), from kickoff §7:* `locate` is in the daemon's method table and
  lease-checked. *Stricter (Stage 0, stage0-audit.md F8): the table row and the `sw.ts` router entry land
  in the same commit, and a test sends `locate` without `tab` and asserts today's legacy handling (after
  S2b: `BAD_PARAMS`), so an unlisted, free `locate` cannot slip through.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
  recipe, S3.5's control, the stage split (#85)) item 5, F8: S2 is granted `daemon/test/methods.test.ts`;
  `locate` enters `methods.ts` in the same commit as its router entry. And (decisions.md · 2026-10-23 · The
  Chrome `id` stays beside `tab` this step; network calls without `tab` stay "active" (#81)): After S2b an
  **unlisted** method without `tab` is refused `BAD_PARAMS "tab is required"` instead of forwarded (#81 is
  contract-level: open for the user's review; binds meanwhile).*

*Corrected 2026-10-23 (Stage 0): was S2.2 checked at S2's close; now S2.2 is checked at S2b's close
(S2b.2), because the `activeTab` fallback and the `selectTab` alias are removed in S2b (decisions.md ·
2026-10-23 · S2's daemon half becomes stage S2b (#72)). S2.2's second grep, `grep -n "selectTab"
extension/src`, cannot fail: executed at `1a62620` it prints `grep: extension/src: Is a directory`,
exits 2 and prints nothing on stdout, while `grep -rn` finds `extension/src/handlers/tabs.ts:70` and
`extension/src/sw.ts:32` (stage0-audit.md F16, the class of Step 7's T6.1 grep, #48). S2b.2 runs both
greps as `grep -rn`, and passes only on empty stdout with exit 1.*
*Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Pre-registered checks reworded where they
could not hold or could not fail (#84)), F16: Every grep check uses `grep -rn` and reads empty stdout
**and** exit 1. Contract-level: open for the user's review; binds meanwhile.*
*Superseded 2026-10-23: S2.2's second grep was `grep -n "selectTab" extension/src`, because without `-r`
it exits 2 on a directory and can never find anything (decisions.md · 2026-10-23 · Pre-registered checks
reworded where they could not hold or could not fail (#84)).*

**FE** *(added 2026-10-23 (Stage 0), copied from kickoff §7; stricter clauses marked)*
- FE.1 `npm test` after ≥ before + the new tests; typecheck green.
- FE.2 a pure, tested function builds the CDP command list: with the option, enable → the input
  commands → disable, and disable also after a failing input command; without it, the list equals
  today's (asserted against a recorded list). *Stricter (Stage 0, stage0-audit.md F19): "today's list"
  is recorded on the FE parent commit with a stub `chrome.debugger` (click; `type` of `"a.\n"` with
  `submit`; `pressKey("Tab")`) and stored as a fixture before the change; and a runner test with a mocked
  `sendCommand` that throws on an `Input.*` command asserts the sequence `attach, enable, …, disable,
  detach`, since "disable after a failing command" is a property of the runner, not of a pure list.*
- FE.3 `grep -nE "windows\.update|focused\s*:" extension/src/debugger.ts` → nothing new; the option
  path calls no `focusTab`. *Stricter (Stage 0, F20): also `grep -rnE
  "windows\.update|tabs\.update|focused\s*:|focusTab|active\s*:\s*true"` over `extension/src/debugger.ts`,
  `extension/src/handlers/actions.ts` and any FE helper module prints the same lines as at the FE parent
  commit.*
- FE.4 rows FE-0…FE-5 committed before the build is loaded (`git log` order).
- FE.5 the live run's first recorded line is the reload's exit 0 and FE-0 PASS.
- FE.6 the decision "The background-input policy" names the outcome (A)/(B)/(C) and the rows.
  *Stage 0 note: FE.6 needs the outcome table made total first (stage0-audit.md F3).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · FE's rows and outcome table, amended
  before anything is measured (#78)) item 2, F3: Precedence: FE-5 void → (B); else FE-4 FAIL → (B); else
  every kind passes all trials → (A); else no kind passes → (B); else (C). FE-0 FAIL is "stop, reload,
  re-check", not an outcome. Contract-level: open for the user's review; binds meanwhile.*

**S2b** *(added 2026-10-23 (Stage 0), copied from kickoff §7; stricter clauses marked)*
- S2b.1 `npm test` after = before − the listed removed tests + the new tests; typecheck green.
- S2b.2 S2.2 (`grep -rn "activeTab" extension/src`, `grep -rn "selectTab" extension/src` → nothing) and
  `grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src` → nothing. *Stricter (Stage 0, F9, F16): each grep
  passes only on empty stdout **and** exit 1; also `grep -rn "targetTab({}" extension/src` → nothing
  (the hidden fallback at `extension/src/handlers/network.ts:12`). The daemon grep also hits the comments
  `daemon/src/methods.ts:1` and `:60`, which S2b rewords.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
  recipe, S3.5's control, the stage split (#85)) item 6: S2b.2 adds `grep -rn "targetTab({}" extension/src`
  → nothing; the two `methods.ts` comments are reworded. And (decisions.md · 2026-10-23 · Pre-registered
  checks reworded where they could not hold or could not fail (#84)), F16: Every grep check uses `grep
  -rn` and reads empty stdout **and** exit 1 (#84 is contract-level: open for the user's review; binds
  meanwhile).*
- S2b.3 tests: no `tab` → `BAD_PARAMS`; numeric network `tab` → `BAD_PARAMS`; `selectTab` →
  `UNKNOWN_METHOD`; `closeTab`/`focusTab` with `id` only → `BAD_PARAMS`; every lease and lock test from
  Step 7 still green unchanged. *Stricter (Stage 0, F10): the `selectTab` → `UNKNOWN_METHOD` test runs
  against a fake extension that **would** answer `selectTab`, so only a daemon-side refusal passes.*
  *Stage 0 flags this clause: see stage0-audit.md F11; the session agent rules before S2b is committed.
  "Every lease and lock test … unchanged" cannot hold as written: with the removals simulated
  (`daemon/test` → `17 failed | 202 passed (219)`), 8 tests cover a removed form itself, and 9 lease, lock
  or intercept tests only use one along the way (`daemon/test/tabs.test.ts:249`, `:276`, `:386`, `:406`,
  `:435` read the Chrome `id`; `:779` sends `selectTab`; `:1081` `networkRequests {}`; `:1143`
  `networkClear {}`; `:1211` T2.3's legacy loop). `:1016` is itself a legacy lock test.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Pre-registered checks reworded where they
  could not hold or could not fail (#84)), F11: S2b.3's "every lease and lock test from Step 7 still green
  unchanged" becomes "unchanged, except edits that replace a removed form with its handle form, each listed
  in S2b.8 with the form it used; the lease and lock assertions stay byte-identical, and each edited test
  still fails when its contract is broken". Contract-level: open for the user's review; binds meanwhile.*
  *Superseded 2026-10-23: was "every lease and lock test from Step 7 still green unchanged", because 9
  lease/lock tests only use a removed form along the way and could not stay unchanged (decisions.md ·
  2026-10-23 · Pre-registered checks reworded where they could not hold or could not fail (#84)).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
  recipe, S3.5's control, the stage split (#85)) item 4, F10 (the stricter clause above): S2b's daemon
  refuses `selectTab` itself (`UNKNOWN_METHOD`) before resolution, tested against a fake that would answer
  it.*
- S2b.4 the `code` rule's tests, both peer kinds. *Stricter (Stage 0, F17): the receipt half already
  holds at `1a62620`, so the test asserts the new log line — once per proto:2 connection, naming the
  method only, never for a no-proto peer — and labels the code-presence test a regression guard.*
- S2b.5 the marker's four branches tested (same; changed; dropped; never), `tabGone` to each holder
  exactly once; the marker is never logged (the log says `extension session changed: <n> handles
  retired`). *Stricter (Stage 0, F5): a fifth branch, none after none, retires nothing; and a retired
  handle's `tabGone` carries the pre-restart `lastUrl`/`lastTitle`, never the reused page's.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The session marker's mechanism, amended
  (#80)), F5: S2b.5 gains the none→none branch and asserts a retired handle's `tabGone` carries the
  pre-restart `lastUrl`. The choice is a pure, tested function over five event orders (worker restart;
  reload; `onStartup` before and after `connect()` within the bound; neither). Contract-level (wire): open
  for the user's review; binds meanwhile. (The stricter clause above, which also names `lastTitle`,
  stands.)*
- S2b.6 the new `WINDOW_MINIMIZED` text in `extension/src/tabs.ts` and nowhere the old `pass mode:"cdp"`
  hint. *Stage 0 flags this clause: see stage0-audit.md F18; the session agent rules before S2b is
  committed. Unscoped, "nowhere" cannot pass: `docs/e2e-test-plan.md:677` (SCREEN-4's superseded
  expected text) and `:1561` (Run 8's recorded result) keep the old text by design; proposed scope
  `extension/src extension/test`.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Pre-registered checks reworded where they
  could not hold or could not fail (#84)), F18: S2b.6's "nowhere the old hint" is scoped to `extension/src
  extension/test` (the e2e plan's recorded Run 8 text must stay). Contract-level: open for the user's
  review; binds meanwhile.*
  *Superseded 2026-10-23: was "nowhere the old `pass mode:"cdp"` hint", unscoped, because
  `docs/e2e-test-plan.md` keeps the old text by design (decisions.md · 2026-10-23 · Pre-registered checks
  reworded where they could not hold or could not fail (#84)).*
- S2b.7 the Step 7 cross-package test `mcp/test/multi-actor.test.ts` green with no edit beyond a
  documented fake. *Stage 0 note: held under a simulated S2b daemon (`mcp/test` + `sdk/test` → `310 passed
  (310)`, stage0-audit.md § 5).*
- S2b.8 every removed test listed with the form it covered (the count drop is a documented removal).
- S2b.9 *Added 2026-10-23 (decisions.md · 2026-10-23 · S0's rulings: bounded bundle diff, `WaitForParams`,
  0-based `nth`, #79's S2b check (#86)):* a second `HandleTable` started against the first's high-water
  mark never re-mints a number the first minted (stale `T<n>` → `TAB_UNKNOWN`), and with the mark file
  unreadable it falls back to a start-time base; tested with an injected directory, never
  `~/.chrome-agent-bridge/` itself.

**S3**
- S3.1 `npm test` after ≥ before + the `Tab`/cursor/locator tests; typecheck green.
- S3.2 `sdk/src/policy.ts` exists, its constant's comment cites BG-1/BG-2 with their recorded result,
  and `docs/decisions.md` has the dated entry (session agent writes it).
  *Stricter (Stage 0): the comment also cites the FE rows (FE-1…FE-5) and the decision "The
  background-input policy" with its outcome (A)/(B)/(C), because G8-1 is resolved by stage FE
  (decisions.md · 2026-10-23 · Stage FE measures focus emulation before `policy.ts` is set (#71)).*
- S3.3 Tests cover: every `Tab` method's exact `{method, params}` with `tab: handle`; `newTab` and
  `claim` set the cursor; `tab()` without a cursor → `NO_CURSOR` with the stated text; a reconnect
  after close 4002 clears the cursor (*added 2026-10-21*); `trusted` →
  `focus()` first iff the policy constant says so; `normalizeTarget` rejects `{name}` alone with the
  friendly message.
- S3.4 `sdk/src/index.ts` exports `Tab`, `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`,
  `downloadToFile`, `formatSnapshot`, `formatNetwork` (the Step 6 and Step 7 exports stay).
  *Corrected 2026-10-23 (Step 7 propagator): as built Step 7 exports `formatSnapshot` and `formatNetwork`
  through the `@bridge/sdk/format` subpath only; `index.ts` keeps its five exports. Whether they join
  `index.ts` is an open contract decision for the user (decisions.md · 2026-10-22 · The formatters reach
  the MCP through a `@bridge/sdk/format` subpath (#46)). S3.4 as written presumes the answer, so the
  Stage-0 audit takes it up — see Step 7 as-built § Stage T4.*
  *Corrected 2026-10-23 (Stage 0): was an open question; now S3.4 applies as written — `index.ts` also
  re-exports `formatSnapshot` and `formatNetwork`, and the `./format` subpath stays for the MCP
  (decisions.md · 2026-10-23 · S3.4 applies as written: the main entry also re-exports the formatters
  (#75)). Premise checked by execution: an esbuild bundle of `index.ts` with and without the two
  re-exports has the same external imports (`@bridge/shared`, `node:*`, `ws`), +3 747 bytes, because
  `sdk/src/format/{snapshot,network}.ts` import types only (stage0-audit.md § 3). Beside it, open for
  the session agent: the exported `BridgeError` stays the shared class (F14).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Locator rules, the MCP locator schema and
  the exported `BridgeError` (#83)) item 3, F14: `@bridge/sdk` keeps exporting the shared `BridgeError`
  class; the report fields (snapshot, screenshot path, network, `report()`) are optional properties set on
  it, so every existing `instanceof BridgeError` keeps working. Contract-level: open for the user's
  review; binds meanwhile.*
- S3.5 *Added 2026-10-23 (Stage 0), from kickoff §7 (decisions.md · 2026-10-23 · The inherited-handles
  check runs in S3 as S3.5 (#77)):* the inherited-handles test of stage S3 — PASS = the reader sees
  end-of-file within 2 s while the stand-in is still alive (then killed by its recorded pid); outcomes
  as written there. *Stricter (Stage 0, stage0-audit.md F15): the same harness runs a positive control
  — the stand-in spawned with `stdio: "inherit"` must **not** see end-of-file within 2 s while it lives
  — and the check passes only if the control holds; no `tsx` layer between the reader and
  `spawnDaemon`; never the real daemon, never port 9234.* *Stage 0 flags the outcome text: see F15; the
  session agent rules before S3.5 runs.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
  recipe, S3.5's control, the stage split (#85)) item 2, F15: S3.5 gains a positive control — the same test
  with `stdio:"inherit"` must see no EOF within 2 s — and spawns without the `tsx` layer; #77's pass
  outcome now reads "`spawnDaemon` inherits no pipe (node and npx parents); the MUX-6 cause remains
  unmeasured", and a third outcome is added: fails and no Node-level option removes it → recorded with the
  measured cause. ("Outcomes as written there" now means the three outcomes of this ruling; the Superseded
  note is at stage S3.)*

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
  *Stage 0 proposes (design-local), pending the session agent's decision: SDK-1 runs as a new recipe
  (working name `recipes/sdk-login.ts`), and this check then gets a dated note naming that command,
  because `recipes/hello.ts` is MUX-3/5/6/8/10's instrument (see SDK-1 under stage S6). Stage 0 also
  flags S6.1's "`/mcp` … first recorded line": each headless `claude -p` actor starts a fresh MCP from
  the current bundle, so the reload exit and the stale check are the meaningful first lines
  (stage0-audit.md F32, an escalation: it would drop a clause).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Stage 0's build-level rulings: SDK-1's
  recipe, S3.5's control, the stage split (#85)) item 1, S6.2: SDK-1 runs a new recipe file;
  `recipes/hello.ts` and MUX-3/5/6/8/10's expected text stay (stage0.md §5). (#85 names no file, so S6.2's
  command is `npm run recipe -- <that new recipe file>`, with its printed output; the name is still the
  session agent's.)*
  *Superseded 2026-10-23: S6.2's command was `npm run recipe -- recipes/hello.ts`, because SDK-1 runs a new
  recipe file and `recipes/hello.ts` stays MUX-3/5/6/8/10's instrument (decisions.md · 2026-10-23 · Stage
  0's build-level rulings: SDK-1's recipe, S3.5's control, the stage split (#85)).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · S0's rulings: bounded bundle diff,
  `WaitForParams`, 0-based `nth`, #79's S2b check (#86)): item 5 — S6.2 names the SDK-1 recipe file the S6
  wave sheet fixes before the run.*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Pre-registered checks reworded where they
  could not hold or could not fail (#84)), F32, S6.1: S6.1's "`/mcp` is the first recorded line" becomes
  "the reload script's exit 0 and the stale check are the first recorded lines" (headless actors start a
  fresh MCP). Contract-level: open for the user's review; binds meanwhile.*
  *Superseded 2026-10-23: S6.1 was "the reload and `/mcp` are the first recorded line", because headless
  actors start a fresh MCP (decisions.md · 2026-10-23 · Pre-registered
  checks reworded where they could not hold or could not fail (#84)).*
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
  *Corrected 2026-10-23 (Step 7 propagator): the findings exist and are FAIL. BG-1/BG-2 (Run 8) answered
  `ok` in 5–10 ms with nothing received by the page, and worked after `focusTab`. BGF-1/2 (Run 10) gave
  the same result with Chrome's three anti-throttling flags. The retry with
  `Emulation.setFocusEmulationEnabled` was not run (decisions.md · 2026-10-22 · BG-1/BG-2's
  focus-emulation retry cannot run in this wave (#61)). The user's ruling makes the input "BG-1/BG-2
  plus a focus-emulation measurement Step 8 adds". The method or option that sends focus emulation is
  an extension change (a CDP pass-through, or a `focusEmulation` option on trusted input, #61), and
  measuring it needs a reload and a live row before S3 can set `policy.ts` (decisions.md · 2026-10-23 ·
  The user rules on Run 8: fix stage T5b, then Run 9 (#62) item 4; · Chrome's anti-throttling flags do
  not fix background input (#66)). This plan has no stage for that option or that row. The kickoff
  places it, and the Stage-0 audit checks that it is placed — see Step 7 as-built § T5,
  § "RELOAD-AUTO, Run 9, BG-FLAGS".*
  *Corrected 2026-10-23 (Stage 0): was "This plan has no stage for that option or that row"; now stage
  FE holds both — the `focusEmulation` option on trusted input, the rows FE-0…FE-5, and an outcome
  table written before the measurement — so G8-1 is resolved inside the run and is not a stop
  (decisions.md · 2026-10-23 · Stage FE measures focus emulation before `policy.ts` is set (#71)). The
  run stops before S3's `policy.ts` item only if FE's outcome is not recorded by then. Stage 0 checked
  the placement and flags two of FE's pre-registered rules for the session agent (stage0-audit.md F1, F3).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · FE's rows and outcome table, amended
  before anything is measured (#78)), F1 and F3: amends #71, written before any FE row is committed — FE-4
  judges only what the human sees; the table has a precedence and a positive control (the operative text
  is under stage FE). Contract-level: open for the user's review; binds meanwhile.*
- **G8-2 — S6 is a wave run with the user.** The S1/S2 extension changes are invisible until the user
  reloads the extension; the S5 MCP schema changes need an MCP reconnect. The wave opens with the
  reload sequence and the stale-extension check (`unknown method` ⇒ reload again). Rows needing the
  user specifically: SDK-6 and SDK-7 (a live course tab in the logged-in Blackboard profile — the
  user's own data; the user names the course), SDK-8 (switch to Gmail, say "use this tab"), MUX-2 and
  LEASE-1 (a second Claude session). Failure screenshots (`~/.chrome-agent-bridge/failures/`) and
  `./exports/*.json` contain real-site content and student data: they stay out of the repo and out of
  the evidence folder (guide rule 8: the repo is public). `exports/` is added to `.gitignore` before
  SDK-7 runs.
  *Corrected 2026-10-23 (Step 7 propagator): the reload is scripted (`recipes/reload-extension.ps1`,
  #65), and the driver runs the session and window rows itself (#33). Step 7 ran its two-session rows
  (LEASE-1, LEASE-4) with headless `claude -p` actors, and the window rows in windows the driver
  opened itself. The user is needed
  for a non-zero reload exit, for SDK-6/SDK-7 (the user's own course), and for anything the kickoff
  keeps with them — see Step 7 as-built § T5.*
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
  *Corrected 2026-10-23 (Stage 0): was line 117 and line 250; at `1a62620` `#load-later` is at
  `test-fixtures/e2e-playground.html:120` and its click handler at `:251-253` (stage0-audit.md F30). The
  ruling's premise is unestablished: the text lands in a role-less `<div id="async-area">` (`:121`),
  and 0.1 does not say a `{text}` locator matches a non-interactive element (F13).*
  *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · Locator rules, the MCP locator schema and
  the exported `BridgeError` (#83)) item 1, F13: a `{text}` locator matches the innermost element that
  survives the snapshot's pruning gates (`aria-hidden`/`inert`/`hidden`/`display:none`, zero-size when
  `hasLayout`) whose normalised text contains the needle, case-insensitive substring. The 0.1 invariant
  reads, for `{text}`, "what the snapshot's pruning shows". Contract-level: open for the user's review;
  binds meanwhile.*
- *Ruled 2026-10-21:* Step 6's D6 writes DL-1 and DL-2 before its wave; the cite stays (decisions.md ·
  2026-10-21 · Step 6 writes the DL rows for browser_download before its D6 wave).
- *Ruled 2026-10-21:* the actor name is `claude-code #<pid>` with the MCP's own `process.pid`; 0.6
  corrected (decisions.md · 2026-10-21 · The actor name carries the MCP's own process id).
- S1 says "reuse the Step C fixtures": the fixtures are those of Phase C (`extension/test/snapshot.test.ts`,
  shadow DOM and frame cases, line 111 onward). Naming only.
  *Corrected 2026-10-23 (Stage 0): was "line 111 onward"; the shadow DOM cases start at
  `extension/test/snapshot.test.ts:121` and the iframe cases at `:152` (stage0-audit.md F30).*
- *Ruled 2026-10-21:* S7's roadmap entry names only "`wait_for` variants (element-visible …)" and
  "Return a `[ref=eN]` for a `kind:"node"` result"; `args` for `browser_evaluate` stays open in Phase F
  (decisions.md · 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes).
- SDK-5 and `hello.ts` cite fixture elements that exist: `#email` (line 31), the "Sign in" submit button
  `#submit-btn` (line 49), the `isTrusted` reporter (lines 155–166).
  *Corrected 2026-10-23 (Stage 0): was lines 155–166; the `isTrusted` reporters are at
  `test-fixtures/e2e-playground.html:157-170` (click `157-159`, input `165-167`, keydown `168-170`);
  `#email` (31) and `#submit-btn` (49) are unchanged (stage0-audit.md F30).*
- `Tab.network({…} | {id})` mirrors `browser_network_requests`'s parameters including `id`
  (`server/src/tools/registry.ts:247–252`) — consistent. *Corrected 2026-10-22: was
  `server/src/tools/registry.ts:247–252`; as built `mcp/src/tools/registry.ts:270–279` (Step 6 D1
  move) — see Step 6 as-built § Stage D1.* *Corrected 2026-10-23 (Step 7 propagator): was `:270–279`;
  at `9cfc7db` the parameters are at `mcp/src/tools/registry.ts:424–430`, and `tab` there is a string
  (a handle, `"all"` or `"active"`): the numeric form was dropped from the MCP schema (decisions.md ·
  2026-10-22 · T4's MCP cursor and tool details (#59)) — see Step 7 as-built § Stage T4.*
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
- *Corrected 2026-10-23 (Step 7 propagator): was no Step 7 items. As built, these Step 7 decisions and
  findings name this step, and the Stage-0 audit takes them up:*
  - *S2's removals in the daemon: #41, #53, #54, #57 (see S2).*
  - *#46: do the formatters join `index.ts`? (see S3.4)*
  - *#51: do v2 peers now require `code`? Its trigger is the fallback removal.*
  - *#62 item 4 and #66: the focus-emulation measurement before `policy.ts` (see G8-1).*
  - *#63: the `WINDOW_MINIMIZED` message rewrite.*
  - *#59's revisit trigger: `browser_use_active_tab`.*
  - *#40's revisit trigger, if S5 redesigns the network tools.*
  - *T2 verifier V4, a proposal not yet decided. The daemon's resync after an extension hello marks a
    handle gone only when its Chrome id is missing. Tab ids restart with each Chrome session, so a
    daemon that outlives a Chrome restart can keep a leased handle live on a reused id, which is a
    different tab, possibly the human's. The proposed fix is a session marker in the extension's hello
    (a new marker → retire every handle, sending `tabGone`). It is a wire and lease change, so it is
    contract-level (`…step7-multi-actor-tabs-steps/T2-verifier.md` V4; `T2.md` § Findings).*
    *Ruled 2026-10-23 (session agent, decisions.md · 2026-10-23 · The extension hello carries an optional
    session marker (#74), amended by · The session marker's mechanism, amended (#80)): S0 adds an optional
    `session?: string` to the extension's hello; S2b gives it behaviour. The daemon compares with the last
    hello's marker (none is a value): A→none retires, none→none does not. Contract-level (wire): open for
    the user's review; binds meanwhile.*
  - *T3 verifier V4 and T5b verifier N1: a late restore can undo a `focusTab` or spoil the next capture
    (a residual race, still open).*

  *See Step 7 as-built § Stage T2 ("Open decisions for the user"), § Stage T4, § Stage T5b.*

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
