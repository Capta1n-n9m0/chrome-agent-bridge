# S3 builder brief — the 800-cap warning

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push; never touch the
user's real Chrome profile (no extension reload, no live browsing) unless your brief grants
it; never log URLs, header values or bodies from extension code. Report in the exact format
requested. Never invent results — if something did not run, say so. Decisions you take go
in your report as "Proposed decisions" (date · plain title, then Decided / Why / Instead of /
Revisit if). No internal codes without a one-line gloss. Model: Opus 5.5 (claude-opus-5-5).
Node: run `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every Bash
call that runs node/npm/npx. Tests bind port 0, never 9234. Nothing is running; do not start the daemon or Chrome.
You must NOT spawn agents. You finish in one go and never wait.

S5 (another stage) works in the same main tree on `recipes/bb-login.ps1`, `recipes/fixtures/*` and its own
`S5*` files under the steps dir: never edit, stage, stash, revert or `git checkout` those. Do not use `git stash`
in the main tree at all (it would sweep S5's files); for failing-first evidence, run the new tests before writing
the code. Do NOT commit — the step agent commits after the verifier.

## Role: Builder (stage S3)

Implement exactly this stage. Write the failing tests first, then the code. Run `npm run typecheck`,
`npm test`, `npm run build` and paste the tails. Then `git status --short` must show only your intended files
plus S5's files (no tracked change from the build).

## Inputs (verbatim from `docs/plans/2026-10-24-step10-step8-follow-ups.md`)

### 0.3 A warning when a locator resolves past the snapshot's cap (user)

decisions.md · 2026-10-24 · S1's locator details are ratified; a locator past the snapshot's cap warns (#117): when
a locator resolves to an element past the snapshot's 800-element cap (one the snapshot never showed), the SDK and
the MCP say so. *Proposed details:*
- **Definition.** The page's listable elements (what `buildSnapshot` lists, by `a11y.ts`'s one walk) number more
  than 800, and the match comes after the 800th of them in walk order. A `{text}` or `{css}` match that is not
  listable is "past the cap" only when it comes after the 800th listable element in walk order. Nothing changes
  on a page with ≤ 800 listable elements.
- **Wire.** `LocateResult` (`shared/src/protocol.ts`) gains an optional `pastSnapshotCap?: true`, set only then;
  an action resolved from a locator (`extension/src/handlers/target.ts`) carries the same flag on its reply. Absent
  otherwise, so old clients see today's results byte for byte. Contract-level: conservative rule, listed under
  Open decisions.
- **SDK.** `tab.locate()` returns the flag; for actions the SDK must not change an existing return type —
  Stage 0 rules between a field on the action's result object (where one exists) and a client event
  (`client.on("warning", …)`), choosing the form that leaves every Step 8 signature as it is.
  *Amended 2026-10-24 (Stage 0 F5): the SDK form is (i) `LocateResult` gains the optional `pastSnapshotCap?: true`
  (so `Tab.locate()` returns it) and (ii) a client event `client.on("warning", (w: {tab: string; method: string;
  kind: "pastSnapshotCap"}) => …)` — a new overload of `on`, emitted by the SDK for an action whose reply carries the
  flag, never carrying the locator or the element's text. No action's return type changes; `S3.3` asserts each Step 8
  signature by type equality.* (decisions.md · 2026-10-25 · Stage 0: the cap warning reaches SDK actions as a client
  event (#206); contract-level, open for the user.)
- **MCP.** One extra line after the tool's normal answer: `Warning: this element is past the snapshot's
  800-element cap — browser_snapshot does not list it.` (wording a build decision; never the element's text).
- **Never** a change to `a11y.ts`'s rules, `locate`'s matching or the snapshot's output to make the warning appear
  (`CLAUDE.md`, "Locators are resolved by the snapshot's own rules — change `a11y.ts`, not two places").
- *Amended 2026-10-24 (Stage 0 F18): `waitFor {locator}` carries no flag; the count stops measuring at the 800th
  listable element.* (decisions.md · 2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential
  row, the retirement set, bb-login's bound (#209).)

### 0.11 Nothing in Step 10 changes the safety boundary (proposed)

Step 9's invariants hold unchanged: one gate in the extension over every router method (`GatedRouter`); a new
extension method enters the safety table or `GatedRouter.on` throws; no wire, daemon, SDK or MCP method changes the
safety state; the state is read per call and fails closed (decisions.md · 2026-10-24 · The state is read per call,
fails closed, and is locked to trusted contexts (#139)); the extension's own pages stay blocked; nothing logs a
pattern, URL, title, the token, an evaluated value or a `saveTo` path. With the bridge armed, JavaScript on and an
empty block list, every Step 9 test and tool behaves as at `f45e3bf`.

### Stage S3 — The 800-cap warning (2 h, after S2)
- [ ] 0.3: `pastSnapshotCap` computed in `extension/src/content/locate.ts`, carried by `handlers/target.ts` and
      `handlers/locate.ts`; the type in `shared/src/protocol.ts`; the SDK and MCP surfaces; tests first, on a fixture
      with 1 000 listable elements.
**Lane:** `shared/src/protocol.ts`, `extension/src/content/locate.ts`, `extension/src/handlers/{target,locate,actions}.ts`,
`sdk/src/`, `mcp/src/tools/registry.ts`, their `test/` dirs. Not `a11y.ts`, not `snapshot.ts`.
**Parallel with:** S5, S6 (after S2 because both edit `registry.ts`).

### Exit checks (pre-registered)
Every stage: `npm test` = before + n, no test removed unless the stage's text says so and the report lists it per
file; `npm run typecheck` and `npm run build` exit 0; `git status --short` shows no tracked change after the build.

- **S3.1** on a fixture with 1 000 listable elements, `locate` of listable element 900 → `pastSnapshotCap: true`; element 10 → absent; on a
  799-element page → absent at every index; a non-listable `{css}` match before the 800th listable → absent
  (tests). **S3.2** `extension/test/fixtures/snapshot-pre-s1.json` and `sdk/test/fixtures/baseline-51de800.json`
  checks still pass unchanged; `git diff f45e3bf -- extension/src/content/a11y.ts extension/src/content/snapshot.ts`
  is empty. **S3.3** the MCP warning line and the SDK surface tested; every Step 8 SDK signature unchanged (a
  type-level test or `tsc` over a pinned usage file).
  *Amended 2026-10-24 (Stage 0 F14): S3.1 adds: on an 801-listable page the 800th listable (index 799) → absent, the
  801st → `true`; on an 800-listable page every index → absent; a non-listable `{css}` match after the 800th
  listable → `true`; a `{text}` match past the cap → `true`; listable elements inside an open shadow root and a
  same-origin frame count. S3.3 asserts each Step 8 SDK signature by type equality
  (`expectTypeOf(...).toEqualTypeOf<…>()`) against a list captured at `f45e3bf`.*

### Kickoff §7 row
| **S3 — The 800-cap warning** | phase doc S3 (0.3) | S3.1–S3.3 | 2 h | after S2; ∥ S5 or S6 | `a11y.ts`/`snapshot.ts` diff empty; the 46-fixture and format baselines pass; old clients see identical results |

### Stage 0 notes that bind (stage0-audit.md)
- F18 (cost): "once 800 listable elements have been counted, every later match is past the cap, so the zero-size
  checks stop at 800 — the count adds at most 800 `getBoundingClientRect`s."
- F23: "`snapshot.ts:129` sets `truncated` at exactly 800 listed elements, when nothing was cut. Pre-existing and off
  limits (S3.2); S3's tests must not use `truncated` as their oracle."
- Lens (a): "`roleOf && !skippedAsZeroSize` is the snapshot's own listability test (`snapshot.ts:112-118`) — a counter
  needs no rule change"; "a page whose count changes between snapshot and locate — the flag describes 'a snapshot
  taken now'; frames and open shadow roots count (the one walk); `nth` past the cap — the flag is about the chosen
  match; `waitFor {locator}` — F18".
- Probe: an extra result field already crosses the daemon unchanged (`locate` and raw `click` returned
  `pastSnapshotCap: true`), and `Tab.click` resolves `undefined`.

### Binding contracts so far
- Step 8 as-built: the SDK exports exactly eight values (`connect`, `BridgeClient`, `Tab`, `BridgeError`, `ErrorCodes`,
  `downloadToFile`, `formatSnapshot`, `formatNetwork`); every `Tab` action and its `BridgeClient` mirror returns
  `Promise<void>`; `locate()` returns `LocateResult`; locator rules #83/#87.
- Step 10 S2 (`8ae1a95`, #214): trusted `browser_click`/`browser_type`/`browser_press_key` send `focusTab {tab}` then
  the action on the same handle. Tool names and input schemas pinned by
  `mcp/test/fixtures/tool-schemas-f45e3bf.json` — S3 adds no input parameter, so that test must stay green
  unchanged. Build on S2's `registry.ts`.
- Step 9: the log scan (`extension/test/log-scan.test.ts`) lists 54 log sites; S3 should add none. If one is
  unavoidable, stop and say so in the report instead of adding it (and never print locator or element text).

## Step agent's instructions (binding)

1. **Baseline.** Record `npm test` totals before any edit (expected 2807 / 117 at `2479301`; re-derive) and quote
   `git diff --stat f45e3bf HEAD -- extension shared sdk` (expected empty).
2. **The SDK signature list first (S3.3, F14).** Before any code change, write a type-level test (e.g.
   `sdk/test/s3-signatures.test.ts`) that pins, with `expectTypeOf(...).toEqualTypeOf<…>()`, the parameter and return
   types of every public method of `Tab` and `BridgeClient` and of `connect`, as they are now (= `f45e3bf`; `sdk/` is
   unchanged since). Write the expected types out literally (not `typeof` of the thing under test). Exceptions by
   design, each with a one-line comment: `LocateResult` gains `pastSnapshotCap?: true` (pin the new shape, and pin
   that the other three fields are unchanged); `BridgeClient.on` gains one overload (pin that each existing overload
   still type-checks with its existing listener type, e.g. by `expectTypeOf(client.on).toBeCallableWith(...)` per
   event name, and that `on("warning", (w) => …)` gives `w` exactly `{tab: string; method: string; kind:
   "pastSnapshotCap"}`). This file is checked by `npm run typecheck` (`sdk/tsconfig.json` includes `test`) — confirm
   that, and show once that it goes red if e.g. `click` returned `Promise<{ok: true}>` (a scratch edit you revert;
   paste the tsc error). Also pin the eight exported values (an existing test may already; cite it).
3. **Tests first** for the rest, run and shown failing (paste the failing summary) before the code:
   - Content (jsdom, `extension/test/`): a fixture with 1 000 listable elements (e.g. buttons with distinct names)
     and the S3.1 cases verbatim plus F14's: element 900 → `true`; element 10 → absent (the key is absent, not
     `false`/`undefined` — assert with `"pastSnapshotCap" in r` false); 799-listable → absent at every index;
     800-listable → absent at every index; 801-listable: index 799 → absent, index 800 → `true`; non-listable
     `{css}` match before the 800th listable → absent, after → `true`; `{text}` match past the cap → `true`;
     `{role,name}` with `nth` past the cap → `true`; listable elements inside an open shadow root and inside a
     same-origin frame count toward the 800 (place them before the match so the flag depends on them). The oracle
     is never `truncated` (F23): use the position in `buildSnapshot`'s `elements` list (a listable match is flagged
     iff it is not among the snapshot's first 800 listed elements) and the plain index arithmetic. Add a
     cross-check test: over the existing 46 pre-S1 fixtures (`extension/test/fixtures/snapshot-pre-s1.json`'s
     pages, ≤ 800 each) no locate result carries the flag, and your count of listable elements equals
     `buildSnapshot(...).elements.length` where that is < 800.
   - Zero-size gate: with layout stubbed as the existing tests do (`documentElement.getBoundingClientRect`), a
     zero-size listable-role element is not counted (the snapshot skips it), so it neither pushes a match past the
     cap nor counts toward 800. One test.
   - Handlers (`extension/test/`, with the existing mocks for `callInPage` etc.): `locate` handler passes the flag
     through; each action that takes a locator (click, type, hover, scroll, selectOption, pressKey with a target —
     whichever `actions.ts` routes through `resolveTarget`) replies with `pastSnapshotCap: true` when the locate said
     so, on every branch the handler can take (content path, `trusted` CDP path, the content-failure escalation to
     CDP); a ref target or an unflagged locator gives a reply deep-equal and key-for-key identical to today's.
     `waitFor {locator}`'s reply carries no flag (F18; `handlers/locator-wait.ts` is outside the lane — if it would
     leak the flag, report it, do not edit it).
   - SDK (`sdk/test/`): `Tab.locate()` returns the flag when the reply has it; each action (Tab and the
     `BridgeClient` cursor mirror) whose reply carries the flag emits exactly one `warning` event `{tab, method,
     kind: "pastSnapshotCap"}` (tab = the handle, method = the wire method name) after the call resolves, and still
     resolves `undefined`; no event without the flag; the event object has exactly those three keys (no locator,
     no name, no text); a listener that throws does not fail the action (state your choice). `locate()` itself:
     emit or not — decide and record (proposed: no event, the flag is in its return value).
   - MCP (`mcp/test/`): each action tool given a locator whose reply carries the flag answers its normal text plus,
     as the last line, exactly: `Warning: this element is past the snapshot's 800-element cap — browser_snapshot does
     not list it.` (one line; this wording is the step agent's build decision). Without the flag the answer is
     byte-identical to today's (compare against the current output in the test). Cover the trusted (focus-first)
     path too. `browser_wait_for` gets no line. The S2 schema baseline test stays green unchanged.
4. **Code**, in lane only. Compute the flag in `extension/src/content/locate.ts` during the walk it already does,
   using `a11y.ts`'s exported predicates exactly as `snapshot.ts` combines them (read `snapshot.ts:112-118` and use the
   same calls in the same order; if the predicate you need is not exported from `a11y.ts`, STOP and report — do not
   edit `a11y.ts` or `snapshot.ts`, do not copy their bodies). Stop measuring after 800 (F18). Set the key only when
   true. The content script stays an IIFE with no `import`/`export` at runtime (it is bundled — check `build.mjs`);
   failures stay returned `{__bridgeError}`. `resolveTarget` may return `{ref, pastSnapshotCap?}` or similar — your
   choice; its callers are all in `actions.ts`. Reply shapes without the flag must not change by a single key.
   SDK: the event lives in `client.ts`'s existing event mechanism (follow how `safetyStatus` is wired); no new
   exported value; a type export for the warning payload is allowed (record it). MCP: append the line in
   `registry.ts` where each action's reply is now discarded.
5. No logging of the flag with any locator or element text; preferably no new log site at all.
6. `git diff f45e3bf -- extension/src/content/a11y.ts extension/src/content/snapshot.ts` must be empty; the 46-fixture
   test and `sdk/test/format-baseline.test.ts` pass unchanged (quote their results).
7. Run `npm run typecheck`, `npm test` (after = before + n, none removed), `npm run build`, then `git status --short`.
   Also run `npx tsc --noEmit -p recipes/tsconfig.json` and the `.fe`/`.s6`/`.s9` variants if `LocateResult` or the
   client types are used there (report results; recipes are outside the lane — report any break, do not fix).

## Report

Write your report to `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S3-builder.md`: built (files) · baseline
counts · the failing-first evidence (pasted) · the signature test's red-on-mutation evidence · test/typecheck/build
results (pasted tails, with counts before → after) · deviations · proposed decisions (with alternatives) · doc texts
for S8 (setup.md "Writing a script" and the MCP tool descriptions, if any mention locate's result — quote with line
numbers; propose, do not edit) · anything unfinished. Return a ≤ 10-line summary.

## Pasted verbatim from briefs/common.md

**ESCALATION list** (the `step-agent` default, extended). A step agent escalates instead of deciding on:
- anything touching a pre-registered rule or a decision of the phase doc marked **(user)**;
- an effect outside its lane — another package, a later stage, the wire protocol, the manifest;
- any change to what the safety gate covers: a method exempted from or added to a class, a new extension method
  without a class, a code chosen for a refusal, what `listTabs`, an event or a log reveals;
- any path by which a client, the daemon or a page could change the safety state or reach the extension's own pages;
- the wire shape of a new field or method (`pastSnapshotCap`, `saveTo`'s transport), codes, event names or params,
  the SDK's exported surface (eight values) or any Step 8 SDK signature, MCP tool names or input schemas;
- returning any part of a `saveTo` value to the model, or writing anywhere but the given absolute path;
- a `CLAUDE.md` runtime-gotcha invariant that would have to change (`unwrapResult` null-or-undefined,
  `{__bridgeError}` returned not thrown, the IIFE content script, `toSerializableArgs`, no top-level `await` in the
  worker, listeners at the top level of `sw.ts`, `ws` external, the `hasLayout` gate, the one walk in `a11y.ts`,
  `focusTab` as the only window focus, `activateForCapture`'s 1000 ms and 50 ms waits, never logging URLs, titles,
  header values, bodies, values or the token);
- any integrity-floor item (§6) or `long-run` §4 stop — G10-0…G10-3, a reload exit other than 0 after one re-run, a
  Chrome restart or kill, the token, the bind, a safety-state restore that fails, a push or a tag, `main` rewritten;
- a STOP line met by a live runner (it returns; you decide or escalate — never "helper bug, safe to continue");
- a guard, timeout or test firing that is not explained, or a recorded "Revisit if" trigger met;
- a port-9234 holder that is not the daemon, or an orphan `node` process it did not start;
- a test count that drops without a documented move or removal;
- a permission or classifier denial; 2 failed fix rounds; a check that cannot be made discriminating.

**LESSONS** (paste into every brief; the `CLAUDE.md` gotchas are the standing list — these are the ones Step 10
touches):
- **LESSON (Run 13): a level-2 live runner RETURNS on every STOP line.** Run 13's runner resolved four stops itself
  (a restore failure, a guard, the pinning gate, a throw without a restore) and the live verifier failed the run on
  process (#192, #193). A restore failure, a guard printing STOP, a human gate (pinning, a grant) and any throw after
  the first state change all mean: restore if the state was touched, write the ledger, return. Never fix a helper
  past a stop and carry on, however obvious the bug. The wave sheet and the runner brief state this rule once, in the
  same words (Run 13's sheet said "from block 4 on" and its brief "after the first state change").
- **UI Automation facts measured in Run 13 (Chrome 156, Windows 11):** the toolbar extension button and the
  Extensions (puzzle) button expose **no UIA Invoke pattern** — pressing or pinning needs a real mouse click at a
  `FromPoint`-verified point inside your own window, and pinning that way waits for #192's ruling; the extension
  action's title has a **second line** under it ("Has access to this site") — compare only the first line; the
  service worker's DevTools window is titled `DevTools`; `Alt+Shift+K` is assigned as `_execute_action` and does not
  change the Windows input layout; an options page in a background or covered window did not show a re-arm until
  brought to the front (SAFE-3, cause undetermined).
- **Expected text is tied to the product's constants** (`recipes/test/s9-rules.test.ts` does it for §4.20); Run 13
  still wrote two rows wrong (the daemon logs `safety state:` before `extension resync` on a reload, by design; the
  DevTools title) — re-read the code for ordering and Chrome's own strings before committing a row (#195).
- **Re-measurements are new rows.** §4.20's rows and Run 13's results are never edited (dated notes only); a bound
  is never chosen after seeing the measurement (R14-4b's banner lifetime is a record).
- **Port 8082 is bound by `SystemSettings.exe` on this machine**; the redirect server uses 8083 (#197), and it must
  be threaded (Run 13's single-threaded server is the probable cause of SAFE-5c's `TIMEOUT`).
- **node may be missing from the Bash tool's PATH.** Put the nvm-windows shim first:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` (node v25.2.1, npm 11.6.2, checked
  2026-10-24). Python is miniconda, `$HOME\miniconda3\python.exe`, for the fixtures.
- **Listeners at the top level of `sw.ts`**; no top-level `await`; a new extension method enters the safety table
  (`GatedRouter.on` throws otherwise) and the daemon's method table (`daemon/src/methods.ts`).
- **`storage.session` is emptied by a reload; `storage.local` is not.** The safety state lives in `storage.local`,
  so a reload or a Chrome restart never re-arms what the human disarmed — RET-1 reads it back after the relaunch.
- **The reload's hello comes up to 2 s later** (the session marker waits for `onStartup`); the reload script still
  proves the reload.
- **The driver is not a bridge client**: launched with `--strict-mcp-config` and an empty config; check with a
  process listing that no `mcp/dist/index.js` descends from it.
- **Headless Claude sessions are the MCP actors** (`claude -p --model sonnet --allowedTools
  mcp__chrome-agent-bridge "<prompt>"`), read verbatim from the transcript, never from a paraphrase. On Windows, send
  long prompts with `node --import tsx …`, not `npx` (`cmd.exe` refuses > 8191 chars). An MCP actor's claim is a lease
  that dies only with its connection (end the actor before another client needs that tab).
- **An `ok` is not evidence**: trusted CDP input into a background tab answers `ok` and does nothing (BG-1/BG-2,
  FE-1…3). Every row reads the page's own reporter or the refusal's code — MCPF-1 above all.
- **A capture switches the human's view ~1.5 s**; a failure report's screenshot does too (REP-0). Rows that could
  attach a non-fixture tab need REP-0's probe first (decisions.md · 2026-10-23 · A probe of the failure-report
  screenshot runs before any row that could attach a non-fixture tab (#97)).
- **UI automation of Chrome** (`recipes/reload-extension.ps1` is the model): never match by name alone; UIA
  `TabItem` is not a tab count; `chrome.exe --new-window chrome://…` opens a New Tab page — type the URL into the
  omnibox of your own window; a window handle does not survive a Chrome restart.
- **Windows PowerShell 5.1 traps**: `—` mangled unless UTF-8 is set; the alias `R`; embedded `"` stripped from
  native arguments (send JSON from Git Bash); `>` writes UTF-16LE in a `-NoProfile` shell.
- **Recipes run with `tsx`**, and `String(fn)` page code breaks under tsx (`__name`): ship page code as literal
  strings; recipes typecheck with their own `tsconfig*.json`.
- **Kill only identified PIDs** (`Test-SafeToKill`, `docs/e2e-test-plan.md` §1 item 8); RET-1's Chrome kill is G10-2.
- **`*.log` is gitignored**: attach logs as `.txt`; grep them for `://`, the token and the block-list patterns by
  count, never printing them.
- **A subagent's report is a claim**: verify by diff before accepting; re-run each "finding".
- **The repo is public**: evidence shows only fixture pages — never my tabs, a real site, a pattern I typed into my
  real block list, a `saveTo` value from a real page, or a student's data.

## SPEC-DISCREPANCY PROTOCOL (kickoff §5, lines 352–373, verbatim)

```
SPEC-DISCREPANCY PROTOCOL. Intent beats procedure. When the code you are asked to write, the
phase doc, the design spec and CLAUDE.md's measured facts disagree, trace up the chain —
phase doc → design spec → CLAUDE.md runtime gotchas — and say so in your report; the deepest
layer that is internally consistent wins. Stakes pick who resolves it: mechanical (a stale
line number, a wrong count, a renamed file) → the fixer documents it in the report and the
step agent amends the phase doc in place with a dated note; design-local (a shape the plan
left open, a default) → the session agent records a decision in docs/decisions.md with the
rejected option; contract-level (the wire protocol, event names and params, codes, what is
gated and what a refusal reveals, how the safety state is changed and by whom, what the human
sees, the token lookup, the bind, the SDK's public surface and signatures, MCP tool names and
schemas, what a saveTo answer may contain) → long-run §3: a pre-stated rule applies
mechanically, else the conservative choice (security at least as strict; every existing tool
and test behaves identically while armed with JavaScript on and an empty block list; undoable),
recorded under Open decisions for the user. Code and spec never diverge silently: whoever
changes behaviour amends the governing doc in place with "*Superseded YYYY-MM-DD: was X,
because Y.*". Verifiers report findings with the command and its output; they never rewrite
the spec or the plan.
```


## Decisions and INTEGRITY FLOOR (kickoff §6, lines 374–408, verbatim)

Decisions follow `long-run` §3: build decisions (module layout, test placement, wording of the warning line and the
descriptions, fixture shapes, the release branch's intermediate trees) you take and record `By: Claude`; contract
decisions (0.3's wire field and SDK form, 0.4's transport and SDK method, anything the safety table classifies)
apply a pre-stated rule or the conservative rule and are listed under **Open decisions** in `docs/decisions.md` and
in the as-built register for me at the gate. Only you write `docs/decisions.md`.

**INTEGRITY FLOOR** (verbatim in every brief):

```
INTEGRITY FLOOR — the only items that wait for the user: (1) the long-run §4 list — a STOP rule
that says escalate; a human gate (G10-0 #192 ruled before Stage 0; G10-1 creating the step8 tag
and any push; G10-2 killing and relaunching the user's real Chrome for RET-1; G10-3 any live work
beyond fixture pages in the user's profile — the real Blackboard course, a real bb-login run, any
real site, the user's credentials; pinning the toolbar button by mouse click unless #192's ruling
allows it — else ask once); an extension reload whose script (recipes/reload-extension.ps1) exits
non-zero after one re-run; any other Chrome restart (needs a fresh grant); anything destructive or
outward-facing (push, tag, publish, history rewrite, rewriting main, deleting outside the repo,
touching the user's Chrome profile data or the user's own tabs and windows, committing or logging
the token); any loosening of the security boundary (the 127.0.0.1 bind, the token gate, "never log
URLs, titles, header values or bodies"); permission or classifier denials. (2) Phase-specific: a
router method reachable without the safety gate; any way for a client, the daemon or a page to
change the safety state or reach the extension's own pages; a live wave (S1, S7) that leaves the
safety state different from the one it found — every wave records armed, JavaScript and the sha256
of the block-list text at its start, restores them and reads them back equal, never printing the
list; a block-list pattern, URL, title, evaluated value, saveTo path or the token in any log or
committed evidence; a saveTo answer carrying any part of the value; a live runner that continued
past a STOP line instead of returning (#193); a drop in the test count without a documented move
or removal; evidence showing a real site or the user's own tabs; killing a process that
Test-SafeToKill did not call safe. Standing rule: never resolve a decision in the direction that
flatters a result already seen; pass rules are written before the measurement; a failed check is
reported, never re-tuned.
```

## STOP RULES and forbidden fixes (kickoff §9, verbatim)

**Stops the gate** (the write-up continues): a pre-registered exit check fails after 2 fix rounds; a router method
reachable without the safety gate; any path by which a client, the daemon or a page changes the safety state or
reaches the extension's own pages; a safety state not restored after a live wave; a pattern, URL, title, evaluated
value, `saveTo` path or the token in a log or committed evidence; a `saveTo` answer carrying any part of the value;
a `CLAUDE.md` runtime invariant that would have to change; `main` rewritten, a tag created or anything pushed without
G10-1; a live runner that continued past a STOP line; a port-9234 holder that is not the daemon, or an orphan `node`
process; the test count drops without a documented move or removal.

**Continues anyway, recorded:** a live row that fails (the wave records it; the fix is a proposed decision); SW-1's
outcome either way; RET-1 or the pp1 leg not run for lack of a grant ("not run — waits for the user"); build
decisions on wording and layout; an audit finding resolved plan-side with a dated note.

**Forbidden fixes:**
- exempting a method from the safety gate, or reclassifying it, to make a row or test pass; a new extension method
  without a safety class;
- a wire, daemon, SDK or MCP method that arms, disarms, edits the block list or enables JavaScript; re-arming by
  default on a reload, an update or a Chrome restart; enforcing safety in the daemon or SDK instead of the extension;
  matching blocked hosts by substring or by `endsWith` without a dot boundary;
- leaving the safety state changed after a wave, or printing my real block list anywhere;
- editing §4.20's rows or any row's expected text after its run; choosing a bound after seeing the measurement;
- changing `a11y.ts`, a locator rule or the snapshot's output to make the cap warning appear;
- returning any part of a `saveTo` value to the model, writing anywhere but the given absolute path, or logging the
  value or the path;
- lowering `activateForCapture`'s 1000 ms or 50 ms waits without a measurement; adding window focus to a capture;
  adding `chrome.windows.update({focused: true})` outside `focusTab`; focusing on an untrusted action; moving the MCP
  cursor on a focus;
- rewriting `main`, force-pushing, tagging or pushing without G10-1;
- a runner fixing a helper past a STOP line and carrying on;
- and, from Steps 6–8, still binding: weakening a lease or lock invariant; logging a URL, title, header value, body,
  locator text or the token; binding anything but `127.0.0.1` or widening the token rule; making `BridgeClient`
  reconnect on a close code other than 4002; letting the MCP crash when `connect()` fails; editing a test's expected
  text to match a changed error; regenerating `sdk/test/fixtures/baseline-51de800.json`.
