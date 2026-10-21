# Step 8 — The SDK surface: locators, typed `Tab`, failure reports, MCP cursor, first recipes

> **DRAFT — not yet started.** For agentic workers: TDD for the content-script `locate` (jsdom, same
> fixtures as `snapshot.test.ts`), for the SDK's locator normalisation, `BridgeError` enrichment
> (fake client), the cursor logic, and the MCP tools; the `node → ref` round trip and the recipes are
> E2E. Each Part leaves `npm test` + `npm run typecheck` green. Prerequisites: Steps 6 and 7 complete
> and E2E-passed — in particular the **BG-1/BG-2 findings** (trusted input into a background tab) decide
> whether `trusted` actions in the SDK call `focus()` first. Design: spec §8.

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

**Order of work:** S0 (types) → S1 (content `locate`, TDD) → S2 (extension handlers accept locators;
node→ref) → S3 (sdk `Tab`, cursor, locator normalisation, TDD) → S4 (sdk failure enrichment, TDD) →
S5 (mcp cursor + tools) → S6 (recipes, E2E) → S7 (docs). S1 and S3 are independent. S2 needs S1.
S4 needs S3. S5 needs S3+S4. S6 needs everything.

---

## 0. Design decisions (local to this step)

### 0.1 Locators are resolved by the snapshot's rules, in the content script

```ts
type Locator =
  | { role: string; name?: string | { regex: string; flags?: string }; exact?: boolean; nth?: number }
  | { text: string; exact?: boolean; nth?: number }
  | { css: string; nth?: number };
```
`content/locate.ts` reuses `roleOf`, the accessible-name computation and the pruning/`hasLayout`
gates from `snapshot.ts` (refactor them into `content/a11y.ts` so both import the same functions — the
invariant is *what Claude saw in a snapshot is what a locator matches*). `name` matching: case-
insensitive substring by default, `exact: true` for equality, `{regex}` for patterns. Result:
`{ref, role, name}`; zero matches → `LOCATOR_NOT_FOUND {candidates}` where candidates are the up-to-5
nearest same-role elements by name similarity (simple normalised Levenshtein / token overlap — pure,
tested); more than one match without `nth` → `LOCATOR_AMBIGUOUS {matches: [{ref, name}…]}`. A `{css}`
locator matches any element (not only interactive ones) and the ref is minted on the spot. `locate`
does **not** reset the RefMap (it adds), so refs from the last snapshot stay valid.

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

### 0.6 MCP cursor: does not follow the human

- Actor name `claude-code #<ppid>`. Cursor: first tab-touching tool without `tab` → `claim({active:true})`.
- Then **stays** on that handle. New tool `browser_use_active_tab`: "the user opened/switched to a tab
  and wants me there" → `claim({active:true})` + cursor; it is the *only* way the cursor follows the
  human. The tool description says exactly when to call it ("the user says 'this tab' / 'the tab I
  opened'").
- `browser_status` adds: `Cursor: T3 "Title" — url (held by me)` and, when different,
  `Human's active tab: T7 "Gmail" — not mine; call browser_use_active_tab to work there`.
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

## Part S0 — Types

- [ ] `shared`: `Locator`, `LocateResult`, `WaitForParams` (discriminated), `EvalEnvelope.ref?`,
      `SnapshotElement` reuse. Guards only where something crosses the wire untyped.

## Part S1 — Content-script `locate` (TDD, jsdom)

- [ ] Refactor `roleOf`, name computation, pruning and `hasLayout` out of `snapshot.ts` into
      `content/a11y.ts`; `snapshot.test.ts` still green (byte-identical elements).
- [ ] `content/locate.ts`: `locate(doc, refs, locator) → LocateResult` (§0.1) with `nearest()` and
      `LOCATOR_*` throws (`CODE:message` convention from Step 7); tests: role+name substring/exact/regex,
      `nth`, ambiguity, not-found candidates ranked, `{text}` over visible text, `{css}` mints a ref for a
      non-interactive element, shadow roots and same-origin frames (reuse the Step C fixtures), refs from
      a prior snapshot survive a `locate`.
- [ ] `content/index.ts`: expose `locate`, `refOfMarked(mark)`.

## Part S2 — Extension handlers: `ref | locator`, `waitFor({locator})`, node→ref

- [ ] `handlers/actions.ts`: `resolveTarget(tabId, p) → ref` (locator → `locate`); every action uses it.
- [ ] `handlers/wait.ts`: `locator` + `state` branch (§0.2).
- [ ] `handlers/evaluate.ts` + `evaluate/mark.ts` (pure `markScript`): `asRef` (§0.3).
- [ ] `tabs.ts`: delete the `activeTab()` fallback in `targetTab` (migration over); `BAD_PARAMS` when
      `tabId` is missing.
- [ ] `router.test.ts` / `actions.test.ts` cover the resolution path with a fake `locate`.

## Part S3 — SDK: `Tab`, cursor, locator normalisation (TDD with a fake client)

- [ ] `sdk/src/locator.ts`: `normalizeTarget(target)` → `{ref}` | `{locator}`; validates shape;
      friendly messages for the common mistake (`{name}` without `role` → "use {text} or add role").
- [ ] `sdk/src/tab.ts` (§0.4) and `client.ts` cursor methods; `screenshot({path})` writes the PNG and
      returns the path; `download` wraps `downloadToFile`.
- [ ] Tests: every `Tab` method sends the expected `{method, params}` with `tab: handle`; cursor
      semantics; `NO_CURSOR`; `trusted` → `focus()` first *iff* the BG flag says so (a constant in
      `sdk/src/policy.ts`, set from the Step 7 findings).

## Part S4 — SDK failure reports (TDD)

- [ ] `sdk/src/error.ts`: `BridgeError` subclass with `snapshot?`, `screenshotPath?`, `network?`,
      `attachErrors`, `report()`; `attachContext(error, tab, opts)` best-effort with a 5 s budget.
- [ ] Tests: the attach set per code; attach failures recorded not thrown; `report()` shape for
      `LOCATOR_NOT_FOUND` (candidates first, snapshot window around them); `failureReports: false`.

## Part S5 — MCP: cursor + tools (TDD)

- [ ] `browser_use_active_tab`; status divergence line; `browser_new_tab` activation rule; actions
      accept locator fields; `browser_wait_for` accepts locator fields; `browser_evaluate` gets `asRef`.
- [ ] Error rendering: `error.report()` for the attach-eligible codes (the screenshot is returned as an
      image content block in addition to the text — the model can see what the script saw).
- [ ] `tools.test.ts`: cursor stays when the fake `listTabs` moves the human's active tab; the status
      line appears; `browser_use_active_tab` moves it.

## Part S6 — Recipes + E2E (`docs/e2e-test-plan.md` SDK-1…8)

- [ ] `recipes/README.md`, `recipes/hello.ts` (connect, newTab to the fixture, locate the login button,
      click, waitFor text, print, close).
- [ ] **SDK-1** `hello.ts` end to end against the fixture while a Claude session is connected on
      another tab.
- [ ] **SDK-2** `LOCATOR_NOT_FOUND` report: misspell a name → the report names the nearest candidates,
      saves a screenshot, prints the snapshot window.
- [ ] **SDK-3** `LOCATOR_AMBIGUOUS` → matches listed; `nth` fixes it.
- [ ] **SDK-4** `waitFor({locator})` on the fixture's delayed button; `state:"hidden"` after dismissing.
- [ ] **SDK-5** `evaluateRef("document.querySelector('#email')")` → ref → `click({trusted:true})`
      lands (`isTrusted` reporter).
- [ ] **SDK-6** `boot-bb.ts` on a live course tab → `bb.VERSION` printed; the skill's old boot not used.
- [ ] **SDK-7** `export-grades.ts` → JSON file written; byte-compare with the same data pulled through
      the MCP `browser_evaluate` path.
- [ ] **SDK-8** MCP cursor: Claude working on T1, human switches to Gmail, Claude clicks → lands on T1;
      user says "use this tab" → Claude calls `browser_use_active_tab` → status shows the new cursor.
- [ ] Regression smoke across Steps 6–8: MUX-2, LEASE-1, SCREEN-1, ACT-1…3, TRUST-2, EVAL-1, NET-1, DL-1.

## Part S7 — Docs + commits

- [ ] `CLAUDE.md`: *locators are resolved by the snapshot's rules — change `a11y.ts`, not two places;
      `locate` adds refs, never resets; node→ref uses a `data-__bridge-mark` attribute across worlds;
      failure reports take the visibility lock; the MCP cursor never follows the human without
      `browser_use_active_tab`; recipes run with `tsx`*.
- [ ] `docs/setup.md`: "Writing a script" section — the hello recipe, the error report, the cursor.
- [ ] `blackboard-ultra` skill (its own repo): boot sequence → `npm run recipe -- recipes/blackboard/boot-bb.ts`
      (or the SDK snippet); keep the old path documented as a fallback for one release.
- [ ] `docs/progress-and-roadmap.md`: Step 8 entry; the roadmap's Phase F items this closes
      (element-visible wait, node→ref, args-less evaluate data) and what remains (console capture, D3 upload).
- [ ] Commits per Part: `feat(extension): locators resolved by the snapshot's rules; waitFor locator;
      evaluate asRef`, `feat(sdk): typed Tab API with cursor and locators`, `feat(sdk): failure reports
      with snapshot, screenshot and network`, `feat(mcp): cursor that does not follow the human;
      browser_use_active_tab; locator fields`, `feat(recipes): hello, boot-bb, export-grades`,
      `docs: Step 8 E2E results`.

## Follow-ups (not this step)

- Console capture (`Runtime.consoleAPICalled`) appended to `evaluate` results and to failure reports.
- D3 file upload (`DOM.setFileInputFiles`) as `Tab.upload(target, paths)`.
- A Python SDK over the same protocol (or an HTTP face on the daemon) if a Python skill needs it.
- Generation-stamped refs; `tabs.claim {wait:true}`.
- Recording an MCP session's calls into a draft recipe — only if hand-writing proves slower than expected.
