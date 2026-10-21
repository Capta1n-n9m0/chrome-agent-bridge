# Step 6 — propagator: correction ledger

**Date:** 2026-10-22 · **Role:** propagator (end of phase), Claude Opus 5.5 (`claude-opus-5-5`)
**Source of truth:** `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` (Stage 0, D0–D7
incl. D5b), checked against the code at `4eef69b` where a claim was load-bearing (`daemon/src/route.ts`,
`daemon/src/handshake.ts`, `daemon/src/wsHost.ts`, `daemon/src/main.ts`, `sdk/src/connect.ts`,
`sdk/src/client.ts`, `sdk/src/index.ts`, `sdk/package.json`, `mcp/src/tools/registry.ts`,
`recipes/hello.ts`).

## Summary

- **Edited:** phase doc 13, Step 7 plan 15, Step 8 plan 9, design spec 9. Total 46 dated notes, each
  `*Corrected 2026-10-22: was X; as built Y — see as-built § <stage>.*`.
- **`docs/e2e-test-plan.md`:** checked (CONN-1…7, STAT-1, MUX-1…10, DL rows, §1); no row's expected
  text is wrong against the as-built; nothing edited.
- **Contract-level contradiction:** one. Spec §9.5 says the other clients "reconnect with the same
  logic" after a handover. As built (decisions.md · 2026-10-22 · A reconnect after 4002 never hands
  the daemon over, open for user review) the 4002 reconnect runs the knock without a handover and
  rejects with `VERSION` on a build mismatch. The spec gets a dated note pointing at the decision; the
  contract itself is unchanged and the ruling stays with the user.
- **Additions to the contract, not contradictions** (dated notes in the spec, decisions still open for
  user review): no welcome within 2 s → `VERSION` (§9.4); configuration failures → `NOT_CONNECTED`
  (§9.8); close codes 4001/4002/1001 and the optional wire `code` (§10).
- **Report-only** (`CLAUDE.md`, `docs/setup.md`, `docs/progress-and-roadmap.md`, which hold D7's
  uncommitted verified edits): 6 items, replacement text below.

## Edited rows

| doc | location | correction | reason |
|---|---|---|---|
| phase doc | header (Status, As-built) | Status is in progress; the register exists; D7 commit pending | as-built § D7 |
| phase doc | Files touched (after `mcp/` list) | `startup.ts` deleted; `main.ts`, `connect/transport/spawn/paths.ts`, `mcp/src/link.ts` added | as-built § D3, D4, D5 |
| phase doc | Order of work | as built D0 → D1 → (D2 ∥ D4) → D3 → D5 → D5b → D6 rows → D7 | decisions 2026-10-22 "Stage order…", "The MCP connects without waiting…" |
| phase doc | 0.2 | `server/src/bridge.ts:3-4` → `daemon/src/bridge.ts:4-5` | D1 move |
| phase doc | 0.3 | wait `clamp(timeoutMs ?? 30000, 100, 600000) + 5000`; `timeoutMs` not forwarded; client +1 s | as-built § D2; decision "D2's daemon details…" |
| phase doc | 0.5 | daemon path from the workspace-root walk-up, not `../daemon/dist` from the sdk | as-built § D4; decision "Stage order…" |
| phase doc | 0.6 | idle timer armed at start too; bad idle value → logged, 600000 | as-built § D3; decision "D3's daemon lifecycle…" |
| phase doc | 0.7 | 10 s per spawn cycle; 2 s no-welcome → `VERSION`; no handover on a 4002 reconnect | as-built § D4; decisions "A Step 6 client gives up…", "A reconnect after 4002…", "The knock's 10 s budget…" |
| phase doc | 0.9 | missing token → `NOT_CONNECTED` rejection, not a bare throw | as-built § D4; decision "The SDK reports configuration…" |
| phase doc | D4 `connect(...)` checkbox | `requireExtension`, `port`, `env`, `startDir`, `io`, `timers` options | as-built § D5b |
| phase doc | D5 first checkbox | the no-crash shape lives in `mcp/src/link.ts`; `startup.ts` deleted | as-built § D5 |
| phase doc | Open items, `bridge.token` bullet | closed: `resolveToken` via `connect()`; `config.ts` thin; setup.md §2 | as-built § D5, D7 |
| phase doc | Needs the user's keyboard | adds the D7 docs commit (classifier denial) | as-built § D7 |
| Step 7 | Prerequisite | full list of Step 6 contracts to exercise (welcome, `daemon.status`, envelope, 4001 reasons, 4002, `extensionStatus`, `timeoutMs`, `UNKNOWN_METHOD`); D6 wave not run | as-built § D2, D6 |
| Step 7 | Outcome, tool-count bullet | registry path `mcp/src/tools/registry.ts`; Step 6 closing count 542 / 42 files | as-built § D1, D5b |
| Step 7 | "build and reload … `unknown method`" paragraph | stale-extension error arrives with code `INTERNAL`; `UNKNOWN_METHOD` is daemon-only | as-built § D0, D2 |
| Step 7 | 0.2 (amended) | hook is `on("reconnected")`; 4002 reconnect never hands over; non-4002 close → MCP gets a new client, needs the notice too | as-built § D4, D5 |
| Step 7 | 0.4 | the lock deadline comes from the envelope `timeoutMs` read in `route.ts`; client +1 s | as-built § D2, D4 |
| Step 7 | 0.7 | `shared/src/protocol.ts:136` → `:204` | D0 grew the file |
| Step 7 | T0 | wire `code` optional; decision #18's revisit trigger is this step; `isEvent` rules; 22 codes | as-built § D0 |
| Step 7 | T2 `route.ts` checkbox | only `daemon.*` handled today; `tabs.claim`/`tabs.release` are forwarded until T2 adds them | as-built § D2; `daemon/src/route.ts` |
| Step 7 | T2 `wsHost.ts` checkbox | `extensionStatus` semantics; events ignored and counted | as-built § D2, D3 |
| Step 7 | T2 `daemon.status` checkbox | the as-built base shape it extends | as-built § D2, D6 |
| Step 7 | T4 `client.ts` checkbox | untyped `on("event")` + `on("reconnected")`; `extensionConnected` getter; five exports | as-built § D4; decision "BridgeClient exposes…" |
| Step 7 | T5 intro | rebuild changes the daemon build too: first client hands over, others reconnect on 4002; `/mcp` every session | as-built § D4 |
| Step 7 | T5 lane | `recipes/hello.ts` exists and MUX rows judge its output; typing variant separate | as-built § D6 |
| Step 7 | T2.5 | log calls are in `daemon/src/main.ts`; grep must include it | as-built § D3 |
| Step 7 | STOP rules | the daemon is the expected 9234 holder now | as-built § D3 |
| Step 8 | Outcome, tool-count bullet | `server/src/tools/registry.ts` → `mcp/src/tools/registry.ts` | as-built § D1 |
| Step 8 | Files touched | `recipes/hello.ts` exists (D6); `tsx` already a root devDependency (D1) | as-built § D1, D6; decision "D1's interim wiring…" |
| Step 8 | 0.4 | Step 6's `BridgeClient` surface; no handover on 4002 reconnect; non-4002 close fails | as-built § D4; decisions "BridgeClient exposes…", "A reconnect after 4002…", "What clients do on a close code other than 4002" |
| Step 8 | 0.5 | existing `ConnectOptions`; config failures already `NOT_CONNECTED` | as-built § D4, D5b; decision "The SDK reports configuration…" |
| Step 8 | 0.6 first bullet | `BridgeLink` replaces the client after a non-4002 close → cursor lost → notice | as-built § D5 |
| Step 8 | 0.6 status bullet | the four as-built `browser_status` lines; STAT-1/MUX-1/MUX-8 depend on them | as-built § D5, D5b |
| Step 8 | S6 `hello.ts` checkbox | exists; rewriting changes MUX rows; new recipe or update rows | as-built § D6 |
| Step 8 | Open items, `Tab.network` bullet | `server/src/tools/registry.ts:247–252` → `mcp/src/tools/registry.ts:270–279` | D1 move |
| Step 8 | Open items (new bullet) | Step 6 decisions whose revisit point is Step 8 (#21, #24, #26, #15, #27, #28, #29, #13), by title | decisions.md 2026-10-22 |
| spec | Status | Step 6 built (D0–D5b, 542 tests), E2E pending | as-built register |
| spec | §9.2 | log cut to 1 MiB on start; lines with `://` or the token withheld whole | as-built § D3 |
| spec | §9.3 | 10 s per spawn cycle; handshake timeout per attempt; loser exits 0 | as-built § D3, D4 |
| spec | §9.4 | `clientId` values; 4001 reasons; 2 s no-welcome → `VERSION` | as-built § D2, D4; decision "A Step 6 client gives up…" |
| spec | §9.5 | **contract-level:** 4002 reconnect has no handover (mismatch → `VERSION`); 4002 "upgrading", ≤ 1 s grace | as-built § D2, D4; decision "A reconnect after 4002 never hands the daemon over" (open) |
| spec | §9.6 | idle armed at start; every shutdown exits 0 | as-built § D3 |
| spec | §9.8 | missing token → `NOT_CONNECTED`; "repo root" = first `package.json` with `"workspaces"` | as-built § D4; decision "The SDK reports configuration…" (open) |
| spec | §10 (new bullet) | optional wire `code`; `timeoutMs` not forwarded; `daemon.status` shape; `UNKNOWN_METHOD`; `tabs.*` forwarded until Step 7; `extensionStatus`; close codes 4001/4002/1001 | as-built § D0, D2, D3 |
| spec | §11 | no `startup.ts`; actual daemon/sdk/mcp files; `sdk/` has no build step | as-built § D1, D3, D5; `sdk/package.json` exports `./src/*.ts` |

## Report-only rows (files holding D7's uncommitted edits — not edited)

| doc | location | correction | reason |
|---|---|---|---|
| `CLAUDE.md` | lines 12–25, "Current state (2026-10-21)" | Stale: "21 tools, 301 tests", "Next: Step 6 … **Not started; kickoff written.** … Next action: paste `docs/plans/next-session-prompt.md`…". Replacement: "## Current state (2026-10-22)" / "- **Shipped:** Steps 1–5 (21 tools, live E2E passes in `docs/e2e-test-plan.md` §5); `browser_download`. Public on GitHub (MIT)." / "- **Step 6 — daemon + protocol v2: code complete** (stages D0–D5b, D6 rows, D7 docs; `npm test` → 542 passed, 42 files, at `033b1bc`). As-built: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md`. **Next action:** the D6 wave with the user (MUX-1…10, DL-1/2 in `docs/e2e-test-plan.md`; MCP config at `<repo>/mcp/dist/index.js`); then Step 7 (multi-actor tabs) and Step 8 (SDK surface + MCP cursor)." | D7 left the block to close-out (as-built § D7 "Carried to close-out") |
| `CLAUDE.md` | line 134, "The daemon outlives the session on purpose" | "(other clients get close 4002 and reconnect)" → "(other clients get close 4002 and reconnect without a handover — a build mismatch on that reconnect rejects with `VERSION`; decisions.md · 2026-10-22 · A reconnect after 4002 never hands the daemon over)"; and after "once per `connect()`, then `VERSION`" add "(the 10 s knock budget runs per spawn cycle)" | as-built § D4; decisions #22, #23 |
| `docs/setup.md` | line 206, `browser_evaluate` "Timeouts." | "the server waits 5 s longer" → "the daemon waits 5 s longer (the SDK client 1 s more)" | `server/` is gone (D1); `daemon/src/route.ts` `DAEMON_SLACK_MS` |
| `docs/setup.md` | lines 326–327, "Nothing network-related is logged." | "the server writes nothing about network entries to stderr" → "neither the MCP nor the daemon writes anything about network entries (the daemon's log holds counts, ids and names only)" | as-built § D3 (log policy) |
| `docs/progress-and-roadmap.md` | Step 6 block, line "decisions in `docs/decisions.md` 2026-10-22 #13–#28" | → "#13–#30" (D6 and D7 added #29, #30) | decisions.md 2026-10-22 #29, #30 |
| `docs/progress-and-roadmap.md` | Step 6 block, "Not done" bullet | add "the D7 docs commit (the permission classifier denied the builder's commit; it is the user's)" | as-built § D7 |

## Checked, no correction needed

- `docs/e2e-test-plan.md`: CONN-2/3/7, STAT-1 and MUX-1…10 match the as-built `browser_status` lines
  (`mcp/src/tools/registry.ts:36,54–66`), the 2 s no-welcome text (`sdk/src/knock.ts:196`), the
  `NOT_CONNECTED` text (`daemon/src/bridge.ts:4-5`), the 4002 reconnect without handover (MUX-5) and
  the log lines (`daemon/src/main.ts`). Run records (lines 683–707, 863–865) are history and stay.
- Step 8 S3.4's export list keeps Step 6's five values — consistent with `sdk/src/index.ts`.
- Step 7/8 `grep -c "server.tool("` checks still work (`mcp/src/tools/registry.ts` → 21 today).
