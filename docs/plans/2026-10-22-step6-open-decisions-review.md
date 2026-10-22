# Step 6 — open decisions for review

**Written:** 2026-10-22, at the close of Step 6's autonomous part · **For:** the user · **Status:**
reviewed 2026-10-22 — all seven ratified (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions).
*Superseded 2026-10-22: was "awaiting review".*

**Outcome.** The user kept every proposed option. Two rulings add to it: for #1, no work goes into
coexisting with a pre-Step-6 bridge — every machine is upgraded, and the revisit rule stands; for #2,
if MUX-7 fails, option B (the double spawn) is built as a Step 7 prerequisite. The decisions taken
under delegated authority are ratified too.

**Before the review:** Nothing here blocks the code: each decision is already built in its proposed form
under the conservative rule of the `long-run` contract (security at least as strict, every existing
tool behaves as before, undoable). The review ratifies it or picks another option.

**Sources:** `docs/decisions.md` (entries dated 2026-10-22, cited by title), the as-built register
`docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md`, the Stage 0 audit
`docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/stage0-audit.md`, and the stage reports
beside it.

**How to use this file:** for each decision, keep the proposed option, or name another. Several are
measured by a row of the live E2E wave (wave W1 in `docs/plans/handoffs.md`); where that is so, the
wave's result can settle it, and the row is named. Ratified decisions move out of "Open decisions"
in `docs/decisions.md`.

## Summary

| # | Decision | Proposed | Settled by |
|---|---|---|---|
| 1 | What a client does when no welcome arrives | Give up after 2 s with `VERSION`; never spawn or hand over | Review; MUX-10 (optional) |
| 2 | Whether the detached daemon survives its spawner's death | Keep the spawn; measure; fall back to a double spawn only if needed | MUX-7 |
| 3 | What clients do on a close code other than 4002 | Scripts get an error; the MCP reconnects through its 5 s retry | Review; MUX-7 (e) |
| 4 | Which error code configuration failures use | `NOT_CONNECTED` now; revisit an auth code in Step 8 | Review; MUX-8 |
| 5 | Whether a reconnect after 4002 may hand the daemon over | No; a build mismatch there fails with `VERSION` | Review; MUX-5 |
| 6 | What `BridgeClient` exposes beyond the plan | Keep the two getters and `on("reconnected")`; add a close event in Step 8 | Review |
| 7 | How the MCP connects while Chrome is closed | `connect({ requireExtension: false })` | Review; MUX-8, CONN-2 |

---

## 1. What a client does when no welcome arrives

*decisions.md · 2026-10-22 · A Step 6 client gives up with VERSION when no welcome arrives*

**Why we need it.** A bridge server from before Step 6 may still be running from an old session and
holding port 9234. It accepts any hello carrying the right token as *the extension*. A Step 6
client's hello therefore takes over the old server's extension slot. The old server never sends a
welcome, and it routes the old session's calls to the new client. Stage 0 measured this on port 0
(audit finding F1). Without a rule, `connect()` waits forever, and the MCP's 5 s retry repeats the
takeover every 5 s.

**Options.**
- **A. A 2 s welcome timeout, then `VERSION`.** The error names the cause: a pre-Step-6 server holds
  the port, so end the old session. The client never spawns a daemon or hands over in this case.
  `setup.md` tells users to end old sessions before upgrading. *(Built.)*
- **B. No timeout.** `connect()` hangs, and the user sees nothing useful.
- **C. Treat the silent holder as a stale daemon:** kill whatever holds the port and spawn a new
  daemon. That kills another person's live session, and the client cannot tell an old bridge from
  an unrelated program on the port. Destructive.
- **D. Have the daemon greet first** (a frame sent before the hello). That is a protocol change.
  A v1 server still sends nothing, so the client needs the timeout anyway.

**Proposed: A.** It is the only option that bounds the wait without harming anyone. The old session
is already disturbed by the hello in every option, so the doc instruction is the real fix.
Pre-Step-6 servers also exit with their session, so this window closes by itself once old sessions
end.
**Revisit when:** no pre-Step-6 server can exist any more (after Step 8). The 2 s bound could then be
dropped.

## 2. Whether the detached daemon survives its spawner's death

*decisions.md · 2026-10-22 · The detached daemon's survival depends on how the session's MCP is killed*

**Why we need it.** The daemon must outlive the Claude session that started it (decision 0.8, spec
§9). Stage 0 measured that on Windows a `detached` child keeps its parent in the process tree.
`taskkill /T` on a parent that is still alive kills the "detached" daemon too. A child whose
spawner had already exited survived the same kill. Whether Claude Code ends its MCP servers with a
tree kill is not known.

**Options.**
- **A. Keep decision 0.8's spawn, and measure it.** MUX-7 covers four cases: a tree kill of a live
  MCP, a normal session end, killing the nvm shim alone, and a tree kill of a session that did not
  spawn the daemon. *(Built.)*
- **B. Double spawn through a short-lived launcher.** The MCP starts a tiny process, which starts the
  daemon and exits at once. The daemon's parent is then gone before any tree kill. This costs one
  extra process start (about 50 ms) and one more file.
- **C. Let the OS own the daemon:** a Windows scheduled task or service, or launchd/systemd. That is
  heavier and needs install steps. The spec rejected it unless idle exit proves annoying.

**Proposed: A now, and B only if MUX-7 shows the daemon dying when a session ends normally.** There
is no evidence yet that Claude Code tree-kills its MCP servers, and B can be added without changing
the wire protocol. If needed, B becomes a prerequisite item of Step 7.
**Settled by:** MUX-7 in the E2E wave.

## 3. What clients do on a close code other than 4002

*decisions.md · 2026-10-22 · What clients do on a close code other than 4002*

**Why we need it.** Close code 4002 means "the daemon is being upgraded; reconnect". Every other
close is something else, such as the daemon dying, a crash, or the network. The plan said only that
`BridgeClient` reconnects on 4002. It did not say what the MCP does after an established connection
drops, or how the daemon closes sockets when it shuts down. The old host used `terminate()`, which
clients see as code 1006.

**Options.**
- **A. Scripts fail; the MCP retries.** `BridgeClient` never reconnects on other codes, so the script
  gets an error. The MCP stores the reason (every tool error shows it) and starts a fresh `connect()`
  on its existing 5 s retry, which may spawn a new daemon. At shutdown the daemon sends
  `close(code, reason)` to every socket, waits up to 1 s, and then terminates the rest. *(Built.)*
- **B. `BridgeClient` reconnects on every close.** A script would then continue silently against a
  new daemon that may hold different state. The plan forbids this, and it would hide crashes.
- **C. The MCP stays down until `/mcp`.** That is safe but needlessly manual: the user must notice
  and reconnect.

**Proposed: A.** It keeps scripts honest and the MCP self-healing, as the no-crash rule requires.
**Settled by:** review. MUX-7 (e), an optional daemon kill, shows the MCP's recovery live.

## 4. Which error code configuration failures use

*decisions.md · 2026-10-22 · The SDK reports configuration and connection failures as NOT_CONNECTED*

**Why we need it.** The SDK can fail before reaching Chrome for several reasons: no token, no daemon
build, a bad `BRIDGE_PORT`, the 10 s knock giving up, or the daemon rejecting the token (close
4001). The spec's 22 error codes have no configuration or authentication code. A script that
branches on `err.code` needs to know what to expect.

**Options.**
- **A. `NOT_CONNECTED` for all of these, with a message that names the cause** (never the token).
  `VERSION` stays for build and protocol mismatches. *(Built.)*
- **B. Add codes to spec §10, such as `CONFIG` and `AUTH`.** This is a contract change. Only the
  daemon and the SDK would use them; the extension is unaffected.
- **C. Reuse other codes:** `BAD_PARAMS` for configuration, `VERSION` for 4001. Misleading.

**Proposed: A for Step 6, and decide B in Step 8's SDK surface review.** There is one real cost to
A. A wrong token is permanent, but `NOT_CONNECTED` looks transient, so the MCP retries every 5 s
forever. That is harmless, but it is noise. Step 8 is where scripts get their typed API, so that is
the right place to add an `AUTH` code if scripts need to tell the cases apart.
**Settled by:** review. MUX-8 shows the `NOT_CONNECTED` text live.

## 5. Whether a reconnect after 4002 may hand the daemon over

*decisions.md · 2026-10-22 · A reconnect after 4002 never hands the daemon over*

**Why we need it.** A "handover" is when a client finds a daemon of another build, asks it to shut
down, and spawns its own. Decision 2026-10-21 "One daemon handover per connect(), then a VERSION
error" allows one handover per `connect()`. Every client reconnects after 4002, and each reconnect
is a fresh knock. So two clients pointing at different daemon builds could still hand the daemon
back and forth: each one's reconnect would upgrade it away from the other. The D4 verifier
simulated two such handovers.

**Options.**
- **A. No handover on a 4002 reconnect.** A build mismatch there fails with `VERSION`, naming both
  builds. A refused port may still spawn. *(Built.)* The spec §9.5 sentence "reconnect with the same
  logic" now carries a dated note saying so.
- **B. One handover per reconnect.** This follows the letter of the earlier decision, but the
  ping-pong stays possible.
- **C. Reconnects accept any build.** A client would keep running against a daemon it does not
  match, possibly with a different protocol.

**Proposed: A.** The ordinary upgrade still works under A. After `npm run build`, the first client
to connect hands the daemon over, and every other client reconnects to the new build: their
expected build is re-read from the same rebuilt file, so it matches. Only clients on two different
daemon builds fail, which is the intended outcome.
**Settled by:** review. MUX-5 shows the ordinary upgrade live.

## 6. What `BridgeClient` exposes beyond the plan

*decisions.md · 2026-10-22 · BridgeClient exposes welcome, extensionConnected and on("reconnected") in Step 6*

**Why we need it.** The plan listed `connect()`, `call()`, `on("event")`, `close()` and `status()`.
The build also needed to read the welcome and the extension's state. Decision 2026-10-21 "The SDK
clears its cursor when it reconnects after a daemon restart" also asks Step 6 to leave a hook for
Step 7's cursor reset. These are additions to the SDK's public surface.

**Options.**
- **A. Public read-only getters `welcome` and `extensionConnected`, plus `on("reconnected", cb)`.**
  The package still exports exactly the five planned values. *(Built.)*
- **B. Keep them package-internal until Step 8.** The MCP and Step 7 would then reach into
  internals.
- **C. A fuller event set now: add `on("close")` and `on("failure")`.** This would replace the MCP's
  workaround: it checks its client every 5 s with `client.connect()`, because no public failure
  event exists (decisions.md · 2026-10-22 · D5's MCP link).

**Proposed: A now, with C added in Step 8.** A is small and undoable. A close event is the cleaner
API, but it changes the public surface, and Step 8 owns that surface.
**Settled by:** review (Step 8's surface review finalises it).

## 7. How the MCP connects while Chrome is closed

*decisions.md · 2026-10-22 · The MCP connects without waiting for the extension, so Chrome closed reads as today*

**Why we need it.** By default `connect()` waits up to 15 s for the extension, so a script does not
start by failing. As first built in stage D5, the MCP used that default, which caused three
problems with Chrome closed:
- `browser_status` said "Daemon: not connected" although the daemon was up;
- tools answered "connecting…" for about 15 s;
- the MCP opened and dropped a daemon client about every 20 s.

Before Step 6, the MCP reported "extension not connected" at once in this state.

**Options.**
- **A. A `connect({ requireExtension: false })` option, used by the MCP.** The client is returned on
  the welcome, whatever the extension's state. Tool calls get the daemon's immediate
  `NOT_CONNECTED`, with the same text as before Step 6, and there is no churn. Scripts keep the
  15 s wait. *(Built in stage D5b.)*
- **B. Keep the 15 s wait for the MCP too**, accepting the churn and the misleading status.
- **C. Reuse `waitForExtensionMs: 0` to mean "don't wait".** That is ambiguous: it also reads as
  "wait 0 ms, then fail".
- **D. Make no-wait the default for everyone.** Scripts would then start with `NOT_CONNECTED`
  whenever Chrome is still waking, which spec §9.7 chose to avoid.

**Proposed: A.** It restores the MCP's behaviour from before Step 6 exactly, and it is one additive
option.
**Settled by:** review. MUX-8 and CONN-2 (b) show it live. Step 8 may rename the option.

---

## Decisions taken under delegated authority (for veto only)

The run also took these build-level decisions on 2026-10-22. They are recorded in `docs/decisions.md`
with their evidence, and they need no action unless you want to overturn one.

| Title in `docs/decisions.md` (2026-10-22) | In one line |
|---|---|
| Stage order D0 → D1 → (D2 ∥ D4) → D3 → D5, and the Stage 0 builder resolutions | The order the stages ran in, the file move map, and where the token and daemon-path lookups live |
| Stage 0's amendments A5–A12 applied to the phase doc | Exit checks corrected before measurement; the 5 deleted `startup.ts` tests counted as a documented removal |
| D0's protocol shapes: optional wire code, strict v2 hello fields, events without id | v1 errors become `INTERNAL`; a mistyped hello is rejected; events are `{event, params}` |
| D1's interim wiring | Build order and temporary exports during the split, all removed by D5 |
| D2's daemon details | `parseHello` beside `validateHello`; `BAD_PARAMS` for bad ids; `timeoutMs` not forwarded to the extension; an "unknown role" close reason |
| The knock's 10 s budget runs per spawn cycle, with a handshake timeout per attempt | A port holder that never answers no longer hangs `connect()` |
| D3's daemon lifecycle | Idle timer armed at start; every intended shutdown exits 0; the log withholds any line with `://` or the token |
| D5's MCP link | The MCP checks its client every 5 s and reconnects after a non-4002 close |
| D5b's shape | The option is a boolean named `requireExtension`; the MCP builds its options in `connectOptions()` |
| setup.md documents stopping the daemon by killing its process | There is no stop command; `daemon.shutdown` would make clients reconnect |
| The D6 wave's set-up | Token from `bridge.token` only; a quiet `recipes/hello.ts`; tagged steps for UI automation |
