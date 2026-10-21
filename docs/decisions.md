# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title.

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

For the user to review at the Step 6 gate (G6-2). Each was taken by the conservative rule of
`long-run` §3 and does not block the run.

- 2026-10-22 · A Step 6 client gives up with VERSION when no welcome arrives (#13)
- 2026-10-22 · The detached daemon's survival depends on how the session's MCP is killed (#14)
- 2026-10-22 · What clients do on a close code other than 4002 (#15)

## Log

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
**By:** Claude

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
**By:** Claude

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
**By:** Claude

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
**By:** Claude

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
**By:** Claude (open, for user review)

### 2026-10-22 · The detached daemon's survival depends on how the session's MCP is killed (#14)
**Decided:** Keep decision 0.8's spawn as written. MUX-7 names the kill method and expected result
for `taskkill /T /F` on a live MCP tree, a normal session end, and killing the nvm shim alone, and
D6 adds "end the spawning session normally → the daemon is still alive". If the daemon dies on a
normal end, the fallback is a double spawn through a short-lived launcher, the user's call. POSIX
stays unverified.
**Why:** Measured in Stage 0 (`stage0-audit.md` F3): on Windows a `detached` child keeps its
`ParentProcessId`, so `taskkill /T` on a live spawner kills it; a child whose spawner already
exited survives. Whether Claude Code ends MCP servers that way was not established. Changing 0.8
now would change the design of record without evidence.
**Instead of:** Switching to a double spawn now.
**Revisit if:** D6 shows the daemon dying when the session that spawned it ends.
**By:** Claude (open, for user review)

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
**Revisit if:** v1 servers can no longer exist (after Step 8).
**By:** Claude (open, for user review)

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
