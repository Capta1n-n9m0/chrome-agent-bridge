# CLAUDE.md

Guidance for working in this repo. Keep it accurate — update it when the architecture or the gotchas change.
Each package's facts live in its own `CLAUDE.md`, which loads by itself the first time you open a file there; every
subagent follows `docs/agent-rules.md`.

## What this is

A localhost daemon + Chrome MV3 extension, with an MCP server and a TypeScript SDK as its clients, that
lets an AI agent (Claude) or a script drive the user's **real, logged-in Chrome default profile**. Chrome 136 (May 2025) blocked `--remote-debugging-port` on the default
user-data-dir, breaking CDP-against-your-real-profile; this restores it from *inside* the profile via an
extension. Mental model: "Playwright MCP, but pointed at your real logged-in Chrome."

## Current state (2026-10-25, Step 10 closed; lean procedures in place)

- **Shipped:** Steps 1–9 (Step 9 — Phase E safety — closed 2026-10-24, #202; Step 8 closed 2026-10-24, wave W2,
  #106–#127). Public on GitHub (MIT). **23 tools, 26 codes (25 on the wire), 26 router methods, 3273 tests in 132
  files** (`npm test` 2026-10-25 at `025bdef`).
- **Step 10 — the Step 8 follow-ups — built and E2E-run 2026-10-25** (Runs 14–15), as-built
  `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md`: the MCP's trusted tools focus first (#106, #214); the
  800-cap warning (`pastSnapshotCap`, the SDK `warning` event, the MCP line; #117, #206, #216); `browser_evaluate
  {saveTo}` + `Tab.evaluateToFile` through an extension-side store (#127, #205, #207, #217, #218); `JS_DISABLED`
  (#202, #219); `bb-login.ps1`'s condition wait (#215); the local branch `release/step8` (Variant C, #208); a live
  retire row on a killed Chrome (RET-1R, 3 handles retired); the chunked MCP recipe retired (#228). Run 15: 27 PASS /
  3 FAIL / 3 NOT MEASURED / 4 RECORD, none a product defect (#226). **Closed 2026-10-25:** the user ruled every open decision
  (decisions.md · 2026-10-25 · The user rules on Step 10's open decisions; Step 10 closes (#229)) — all as built,
  except #227 option (b) and the `saveTo` `kind` description, both in Step 11's first code stage; the `step8` tag and
  `release/step8` are pushed (G10-1).
- **Reloads need no human:** `recipes/reload-extension.ps1` reloads the extension by UI automation
  and proves it (#65); an exit-2 reload may be re-run during waves (#99).
- **Lean procedures (2026-10-25, #230):** rules for every agent in `docs/agent-rules.md`, briefs by pointer,
  package `CLAUDE.md` files, decisions archived by step, risk-tiered models, the `cleanup-pass` skill. Built on the
  Linux copy (`docs/plans/2026-10-25-lean-procedures.md`); Step 11 is its trial against Step 10.
- **Resume:** Step 11 — D3 file upload, on Windows: kickoff `docs/plans/next-session-prompt.md` (its first checks
  re-run the package `CLAUDE.md` loading probe there), phase doc `docs/plans/2026-10-25-step11-file-upload.md`. Interactive sessions using the bridge need `/mcp` or a fresh session (the MCP
  and daemon builds changed in Step 10); the loaded extension is already the Step 10 build (Run 15).
- **Next** (decisions.md · 2026-10-24 · The roadmap after Step 8 (#129), order open for veto): **Step 11** — D3 file
  upload (`browser_upload_file` / `Tab.upload` via `DOM.setFileInputFiles`), with a first code stage for #227 (b) and
  the `saveTo` `kind` text, and row SW-2 (the ~1.5 s capture switch with a warm-up trial) in its live wave; then a
  small step for the network rule against redirects onto blocked sites (#140, placed by #229); **Step 12** — Phase F
  (`args` for `browser_evaluate`, console capture, keep-attached debugger). Known limits carried: a popup of a
  background opener gets no lease (#226 item 3); the focus/input race of the MCP's trusted tools (Stage 0 F19). Live
  waves run autonomously (#33).
- Update this block with the `session-closeout` skill whenever a stage/phase completes or the
  resume point moves.

## Architecture

```
Claude ⇄ (MCP/stdio) ⇄ mcp/ ──┐   both are SDK clients: sdk/ connect() finds, spawns or
scripts (tsx) ⇄ sdk/ ─────────┤   hands over the daemon, then hello {token, role:"client",
                              │   name, build, proto:2} → welcome
                              ⇅ ws://127.0.0.1:9234
daemon/ (one per machine, detached, outlives sessions; token gate; holds the one extension socket;
         answers daemon.status / daemon.shutdown / tabs.claim / tabs.release itself; its tab layer
         turns a client's `tab` handle (T<n>) into a numeric tabId, checks the tab's lease, takes the
         FIFO visibility lock for screen-needing calls, then forwards under its own ids)
                              ⇅ JSON {id,method,params:{tabId,…}} / {id,result|error{code,message,data?}}
                                + events tabCreated/tabRemoved/tabReplaced/safetyState  (extension hello: proto:2, session)
  extension/ (loaded unpacked in the real profile):
    offscreen document  → holds the WebSocket (survives MV3 service-worker culling)
    service worker      → routes methods to handlers; uses chrome.tabs/scripting/debugger
    content script      → window.__agentBridge: RefMap + snapshot + locate + DOM actions (ISOLATED world)
```

Flow: tool → `BridgeLink.call` → `BridgeClient.call(method, params, {timeoutMs})` → WS → daemon
(`route.ts`) → extension socket → `GatedRouter` (the safety gate at receipt, again before each first side effect and as
the post-check) → handler → `chrome.*` / `callInPage`. Default actions use synthetic content-script events (no banner);
`browser_click {trusted:true}` (or a content-action failure) escalates to real CDP `Input` via
`chrome.debugger` (shows the "extension is debugging this browser" banner); with `trusted:true` the SDK and,
since Step 10 S2, the MCP call `focusTab` first (#89, #106). Clients name tabs by
daemon-minted **handles** (`T3`), never Chrome ids; one client holds a tab at a time (a **lease**:
opened, claimed, or a popup of a held tab), and a call on another client's tab fails fast with
`TAB_HELD`. The daemon forwards every tab method with a numeric `tabId` and never a `tab` key, and
each handler acts on `targetTab(p)`, in the background. Only a default-mode viewport screenshot and
`focusTab` need the screen; they run under the daemon's one FIFO **visibility lock**. A tab call
with no `tab` is refused `BAD_PARAMS "tab is required"` (network calls excepted: no `tab` means the
human's tab). The MCP keeps a **cursor**: its first untargeted tool claims the human's tab and keeps
it, and only `browser_select_tab`, `browser_new_tab` and `browser_use_active_tab` move it
(`mcp/src/cursor.ts`). A script uses the SDK's typed `Tab` (`client.newTab()` / `claim()`; the
client's own cursor is `client.tab()`): its actions take a ref or a **locator** (`{role, name}`,
`{text}`, `{css}`), resolved in the content script by the snapshot's own walk, and a failure on the
page carries a **failure report** (snapshot, screenshot, network). Network capture is separate and always on: six top-level
`chrome.webRequest` observers feed a bounded per-tab `NetworkLog` (no banner, no debugger), which
`browser_network_requests` / `browser_network_clear` query.
Since Step 9 every router method runs through one safety gate (`extension/src/safety.ts`, served by
`GatedRouter`): the human's kill switch, JavaScript switch and block list are enforced in the extension,
read from `storage.local` per call, and no wire, daemon or SDK method can change them; the network log
records nothing while disarmed and drops blocked hosts. The daemon only relays the state
(`safetyState` → `safetyStatus`, `daemon.status.safety`) and withholds URLs/titles while disarmed.

### Where the code is
One `CLAUDE.md` per package holds its Key files (file by file) and its Runtime gotchas (measured facts; they bind).
- `shared/` — the wire protocol types and guards, the error codes (`shared/CLAUDE.md`).
- `daemon/` — the one-per-machine daemon: bind lock, token gate, handles, leases, the visibility lock (`daemon/CLAUDE.md`).
- `sdk/` — the TypeScript client: `connect`, `BridgeClient`, `Tab`, failure reports, the formatters (`sdk/CLAUDE.md`).
- `mcp/` — the MCP server as an SDK client: the 23 tools, the cursor, the no-crash link (`mcp/CLAUDE.md`).
- `extension/` — the Chrome MV3 extension: service worker, offscreen socket, content script, handlers, the safety gate
  (`extension/CLAUDE.md`; deeper files in `extension/src/content/`, `extension/src/evaluate/`,
  `extension/src/handlers/`).
- `recipes/` — scripts and live-run helpers, and the facts about driving Chrome and Windows tooling (`recipes/CLAUDE.md`).

## Invariants that bind every package
Details and measured facts are in the package file named; the integrity floor is `docs/agent-rules.md` §2.
- Bind only `127.0.0.1`; the bind is the lock, so the daemon is the one owner of port 9234 (`daemon/CLAUDE.md`).
- The token is a password: never committed (`bridge.token` and `.env` are gitignored), printed or logged.
- Product code never logs a URL, title, header value, body, path, locator text, evaluated value or block-list pattern;
  `extension/test/log-scan.test.ts` allowlists every log site (`extension/CLAUDE.md`).
- Every extension router method passes the safety gate, and nothing on the wire changes the safety state
  (`extension/CLAUDE.md`, Safety gate).
- A new extension method enters both `METHOD_CLASSES` (`extension/src/safety.ts`) and `daemon/src/methods.ts`.
- Clients name tabs by daemon-minted handle (`T3`), never by Chrome id; a tab call without `tab` is refused
  (`daemon/CLAUDE.md`).
- Bulk data moves in slices: one WebSocket frame over 100 MiB closes the extension socket (`daemon/CLAUDE.md`).
- Pure logic is written test-first; `chrome.*` glue is covered by `docs/e2e-test-plan.md` (Testing philosophy).

## Commands

```bash
npm install
npm run build        # daemon/dist/index.js + mcp/dist/index.js + extension/dist/{sw,options,offscreen,content}.js
npm test             # vitest — 3273 passed, 132 files (`npm test` 2026-10-25 at 025bdef; recipes/test included)
npm run typecheck    # tsc across shared/daemon/sdk/mcp/extension (chained with &&: the first failure hides the rest)
npm run recipe -- recipes/<file>.ts [args]   # a script against the SDK, run with tsx (= npx tsx recipes/<file>.ts)
npx tsc --noEmit -p recipes/tsconfig.s6.json # recipes typecheck separately (tsconfig.json, .fe, .s6, .s9, .s10 cover the others; all five exit 0 since Step 10 S8)
```
Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`, then set the
token + port `9234` in its Options. The MCP config points at `<repo>/mcp/dist/index.js`; nobody starts
the daemon by hand (the first client spawns it). The token comes from `BRIDGE_TOKEN`, else `bridge.token`
at the repo root (gitignored). Full setup + the 23 tools + "Writing a script": `docs/setup.md`. After `npm run build`, reload the extension (on Windows `recipes/reload-extension.ps1` does it by UI Automation; `docs/setup.md` §4).
E2E: serve `test-fixtures/e2e-playground.html` (`python -m http.server 8080 --directory test-fixtures`)
and follow `docs/e2e-test-plan.md`.

## Gotchas that cut across packages
- **Editing extension code requires a manual reload**: `npm run build` then `chrome://extensions` →
  reload ↻. The service worker won't pick up `dist/` changes otherwise — **not even after a full Chrome
  restart** (seen 2026-10-06: a restarted Chrome still ran the old worker and answered the new
  server's `downloadStart` with `unknown method`). An `unknown method: X` error means exactly this; a
  pre-Step-7 extension (its hello has no `proto`) gets every tab call refused by the daemon with
  `VERSION` and a reload hint (decisions.md · 2026-10-22 · A stale extension is refused for tab calls,
  detected by its hello); `unknown method: locate` names a pre-Step-8 extension. MCP
  changes need an MCP reconnect (`/mcp`) or a fresh session; daemon changes take effect when the next
  client connects after `npm run build` (the build-id handover, `daemon/CLAUDE.md`) — a `/mcp` reconnect is one.
- **`npm run typecheck` chains the projects with `&&`** (root `package.json`), so a type error in one
  package hides the later packages' results; when another stage's work is in flight, run `tsc -p
  <pkg>/tsconfig.json` per package (S2b builder and fixer; S2b.md gotcha candidates).
- **A scratch worktree never shares `node_modules` through a junction.** A recursive delete of a worktree
  followed a `node_modules` junction and emptied the main tree's `node_modules/.bin` and `@asamuzakjp` (Step 10
  S4b, observed by its verifier; repaired by `npm ci`). Run `npm ci` in the worktree, or remove a junction only
  with `cmd /c rmdir <link>` before `git worktree remove` — never `rm -rf` / `Remove-Item -Recurse` across it
  (decisions.md · 2026-10-25 · Scratch worktrees never share `node_modules` through a junction a recursive delete
  can follow (#220); S4b.md Findings 1).

## Testing philosophy

Logic units (protocol, WS correlation, bridge, handshake, the daemon's registry/routing/lifecycle/log,
the SDK's knock/client/connect over injected I/O and clocks, the MCP link, RefMap, snapshot, actions,
geometry, tools, inject helpers, the `NetworkLog` reducer/query, the daemon's handles/leases/lock/
tab layer, the extension's error mapping and tab events, the MCP cursor, the SDK formatters, Step 9's safety gate, block-list matcher, state store, badge model and
options model, Step 10's save store, save sources and the SDK's file finish) are
**TDD with real assertions**; `mcp/test/multi-actor.test.ts` runs a real daemon + SDK + MCP against a
fake proto:2 extension on port 0.
Socket tests bind port 0, never 9234. The `chrome.*` glue (service worker,
chrome-API handlers) is **not unit-tested** — mocking the extension runtime is low-value; it's covered
by `docs/e2e-test-plan.md` against real Chrome. New pure logic → write a failing test first.

## Conventions

- Commits end with exactly one trailer, `Co-Authored-By: Claude <model> <noreply@anthropic.com>` for the model that
  wrote them, and no `Claude-Session:` line (the user's instruction since Step 10 S7).
- Don't commit the token (`bridge.token`, `.env` are gitignored). The localhost bind + token are the
  only security boundary — treat the token as a password; never log it.

## Skills (project skills in `.claude/skills/`)
- Rules for every agent: `docs/agent-rules.md`. Briefs point to it and never paste rules, spec text or numbers.
- `long-run` — the session agent's contract for an autonomous multi-stage run: context discipline, the agent tree,
  decisions while the user is away, revival.
- `step-agent` — the STEP BRIEF and leaf-brief templates and the ledger.
- `phase-kickoff` — writes `docs/plans/next-session-prompt.md` (phase kind) or an entry in `docs/plans/handoffs.md`
  (wave kind).
- `session-closeout` — end of significant work: the doc entry, `docs/decisions.md`, `docs/progress-and-roadmap.md`,
  the Current state block above, a new gotcha in the package file it concerns, memory, the cleanup pass, the commit.
- `cleanup-pass` — a lead cleaner runs `node scripts/doc-check.mjs` and sends area cleaners; reports in `docs/cleanup/`.
- Writing rules for every doc: `docs/docs-writing-guide.md`. Decisions are dated plain-language entries in
  `docs/decisions.md`, cited by date + title.

## Docs
`docs/specs/…-design.md` (design of record), `docs/plans/…` (phase docs; beside each, `…-steps/` once a phase runs),
`docs/agent-rules.md` (rules for every agent), `docs/decisions.md` (open and standing decisions, the current step;
closed steps in `docs/decisions-archive/`), `docs/docs-writing-guide.md` (how we write), `docs/setup.md`
(install/usage), `docs/e2e-test-plan.md` (manual suite + fixture), `docs/progress-and-roadmap.md` (status + roadmap),
`docs/cleanup/` (one report per cleanup pass).
