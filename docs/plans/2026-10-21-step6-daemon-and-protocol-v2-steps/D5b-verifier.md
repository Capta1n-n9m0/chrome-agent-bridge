# D5b verifier report

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), independent, 2026-10-22. Scope: the uncommitted D5b
change on top of `f5063e9` (main HEAD `d3022f8`, docs only between): `docs/e2e-test-plan.md`,
`docs/setup.md`, `mcp/src/{config,index,link}.ts`, `sdk/src/connect.ts`, `sdk/test/connect.test.ts`,
new `mcp/test/extension-down.test.ts`. Governing decision: `docs/decisions.md` · 2026-10-22 #27.

Method: `git worktree add <scratchpad>/d5b-verify f5063e9`, copied the 8 files from the main tree,
`npm ci`, ran every check there. Worktree removed (`git worktree remove --force` failed on a
non-empty dir, so the directory was deleted and `git worktree prune` run; `git worktree list` now
shows only the main tree). Nothing was edited in the main tree except this file. No commit, no push,
no port 9234, no real daemon, no Chrome profile, no bridge MCP tools.

## Verdict: PASS-with-notes

All six pre-registered exit checks and the cross-package check pass. Two MINOR and four NIT
findings; none blocks.

## Exit criteria

| Check | Result | Evidence (below) |
|---|---|---|
| D5b.1 tests ≥ 538 + new; typecheck, build green after `npm ci` | PASS — 542 / 42 files (baseline re-measured 538 / 41); typecheck 0; build 0 | E1 |
| D5b.2 SDK option resolves with no clock advance, client open; default path unchanged; D4 tests unedited | PASS (see NIT F5) | E2 |
| D5b.3 MCP: status daemon-connected + extension-down; baseline text unchanged; no churn incl. 5 s tick; same client works after `extensionStatus` | PASS | E3, E7 |
| D5b.4 SDK exports, 21 tools, registry/lifecycle/extension/daemon/shared/client/knock unchanged | PASS | E4 |
| D5b.5 each new test fails with source reverted | PASS for the joint revert (all 4 fail); see MINOR F1 for `index.ts` alone | E5 |
| D5b.6 docs: setup Troubleshooting + CONN-2 with dated Superseded note; nothing else; accurate | PASS (see MINOR F2, NIT F6) | E6 |
| Cross-package check (verifier's own) | PASS — tool error in 0–1 ms; 4002 keeps the client; 1001 drops it and the 5 s tick connects fresh | E7 |
| Cleanup: no node left, 9234 free | PASS — only PID 2928; `netstat … :9234` empty | E8 |

## Findings

**F1 — MINOR — `mcp/src/index.ts:16` (`connect: () => connect(connectOptions())`) is not covered by
any test.** Reverting `mcp/src/index.ts` alone to `f5063e9` (keeping the new `config.ts` and
`connect.ts`) leaves the whole suite green:
```
=== variant C: only mcp/src/index.ts reverted
 Test Files  42 passed (42)
      Tests  542 passed (542)
typecheck exit 0
```
The MCP test builds its own `BridgeLink` with `{ ...connectOptions(), port, env, io }`, so it pins
`connectOptions()`'s value and the SDK behaviour, but not that the entry point uses it. The builder's
"each new test fails with source reverted" holds for the joint revert (E5) only. Consistent with the
D5 precedent (the entry point is not unit-tested; E2E covers it via CONN-2 (b)), and the bundle diff
(E4) shows the wiring is in `mcp/dist/index.js`. Suggested fix: accept and name it in the as-built;
or extract a tiny `makeLink(connectFn)` factory in a later stage. Do not block on it.

**F2 — MINOR — governing docs not amended in place.** `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md:341`
still says the MCP does `connect({ name: \`claude-code #${process.pid}\` })`, and
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:290` (§9.7) describes only the waiting
`connect({ waitForExtensionMs })`. The SPEC-DISCREPANCY PROTOCOL says whoever changes behaviour
amends the governing doc with a dated note. The pre-registered D5b.6 limited D5b's doc lines to
`setup.md` + CONN-2, so this is not a builder fault: the step agent should add the dated notes
(phase doc line 341; spec §9.7: "`requireExtension: false` skips the wait; the MCP uses it — decision
#27") at close-out. Verifier does not edit the spec.

**F3 — NIT — `mcp/test/extension-down.test.ts:10-11` imports `../../daemon/src/bridge.js` and
`../../daemon/src/wsHost.js`.** It is the first cross-package relative import in the repo
(`grep -rn 'from "../../' --include=*.ts daemon sdk mcp shared extension` → only these two lines).
Acceptable: `mcp/build.mjs` bundles only `src/index.ts`, and the built bundle diff against `f5063e9`
is exactly the four D5b hunks (E4) — no daemon code enters `mcp/dist`; `tsconfig.base.json` has
`noEmit: true` and no `rootDir`, so `tsc -p mcp/tsconfig.json` (which includes `test`) type-checks the
daemon files without a rootDir error (typecheck exit 0). Cost: mcp tests now break if `WsHost`'s
constructor or `registry.count()` changes. Suggested: record it in the as-built; Step 8 may move such
end-to-end tests to a shared test helper.

**F4 — NIT — `sdk/src/connect.ts:57-60`: an unclaimed comment edit.** The `resolvePort` doc comment
changed from "validated exactly like `mcp/src/config.ts`" to "the `port` option, else `BRIDGE_PORT`,
else 9234. Keeps the pre-Step-6 server's validation…". Comment only, and it fixes a stale reference
(D5 removed port validation from `mcp/src/config.ts`); the code is unchanged. Mention it in the as-built.

**F5 — NIT — D5b.2's "without the option" leg is carried by D4's tests, not a paired D5b test.**
`sdk/test/connect.test.ts:122-143` pins the default 15 000 ms timer and the wait; `:145-165` pins the
`NOT_CONNECTED` text after the wait, but with `waitForExtensionMs: 500`, not 15 s. Both are
unedited (diff is append-only) and pass. Sufficient.

**F6 — NIT — `docs/e2e-test-plan.md:91` CONN-2 (b) "call `browser_status` at once".** A call made
before the link's first `connect()` settles still shows `Daemon: not connected` / `Problem:
connecting to the bridge daemon…` (`mcp/src/tools/registry.ts:46`). With the daemon running this
window is ~20 ms (E7: "link has client after 22 ms"), so a human cannot hit it; if the daemon has to be
spawned it is longer. The text is otherwise accurate against the code (E6, E7). Optional wording:
"within a few seconds".

No silent deviations beyond F4. No forbidden fix: no reconnect added on non-4002 (E7: 1001 →
client dropped, fresh `connect()` on the 5 s tick); no test weakened or expected message edited (D4
tests unedited; the baseline text matches `1a92d95`); 5 s retry intact (`RETRY_MS = 5000`, `pending=[5000]`
in E7); MCP no-crash path untouched (`link.ts` diff is two comment lines); nothing new logs
(`git diff -- mcp sdk | grep '^+' | grep console` → empty); the test token is a sentinel string and
is never printed.

## Evidence

**E1 — D5b.1** (worktree after `npm ci`)
```
$ npm run typecheck   → typecheck exit 0
$ npm test            → test exit 0
 Test Files  42 passed (42)
      Tests  542 passed (542)
$ npm run build       → build exit 0 ("built extension → dist/")
# baseline: git stash -u (all 8 files) then npx vitest run, then stash pop
 Test Files  41 passed (41)
      Tests  538 passed (538)
```
542 − 538 = 4 new: 2 in `sdk/test/connect.test.ts`, 2 in `mcp/test/extension-down.test.ts`.

**E2 — D5b.2**
```
$ git diff f5063e9 -- sdk/test/connect.test.ts | grep -E "^-[^-]" | wc -l
0
$ git diff f5063e9 -- sdk/test/connect.test.ts | grep "^@@"
@@ -233,3 +233,56 @@ describe("connect()", () => {
```
The new test (`connect.test.ts:238`) asserts `resolved === true` after `flush()` with no timer fired,
`ft.list` empty (no wait timer registered), `io.sleep` not called, `conn.closeCalls` empty, and the
same client follows `extensionStatus {connected:true}`. Source change: `connect.ts:83`
`const requireExtension = options.requireExtension ?? true;` and `:109`
`if (requireExtension && !client.extensionConnected) {` — the wait block itself is unchanged.

**E3 — D5b.3** baseline text:
```
$ git show 1a92d95:server/src/bridge.ts | grep -n "Extension not connected"
4:  "Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?";
$ grep -rn "Extension not connected" daemon/src sdk/src
daemon/src/bridge.ts:5:  "Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?";
sdk/src/connect.ts:16:  "Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?";
```
`extension-down.test.ts` asserts the tool rejects with exactly this text, `clients.length === 1` and
`host.registry.count() === 1` after the NOT_CONNECTED probe and after firing the 5 s tick, and a
successful `browser_snapshot` on the same client after a fake extension connects. Re-confirmed live
in E7.

**E4 — D5b.4**
```
$ cat sdk/src/index.ts   → values: connect, BridgeClient, BridgeError, ErrorCodes, downloadToFile (rest are `export type`)
$ grep -c "server.tool(" mcp/src/tools/registry.ts             → 21
$ git diff d6832a1 -- mcp/src/tools/registry.ts | wc -l          → 0
$ git diff f5063e9 -- mcp/src/lifecycle.ts | wc -l               → 0
$ git diff 1a92d95 d6832a1 --stat -M -- server/src/lifecycle.ts mcp/src/lifecycle.ts
 {server => mcp}/src/lifecycle.ts | 0
$ diff --strip-trailing-cr <(git show 1a92d95:server/src/lifecycle.ts) mcp/src/lifecycle.ts && echo IDENTICAL
IDENTICAL
extension/: 0   daemon/: 0   shared/: 0   sdk/src/client.ts: 0   sdk/src/knock.ts: 0   (git diff f5063e9 -- <p> | wc -l)
$ git diff 1a92d95 -- extension/ | wc -l → 0
```
mcp bundle, f5063e9 vs D5b (790348 → 790531 bytes), `diff mcp-old.js mcp-new.js`:
```
>   const requireExtension = options.requireExtension ?? true;
<   if (!client.extensionConnected) {
>   if (requireExtension && !client.extensionConnected) {
> function connectOptions(pid = process.pid) {
>   return { name: actorName(pid), requireExtension: false };
<     connect: () => connect({ name: actorName() }),
>     connect: () => connect(connectOptions()),
```
`grep -c "WsHost" mcp-new.js` → 0.

**E5 — D5b.5** (tests kept; sources reverted with `git checkout f5063e9 -- …`; restored and
`cmp`-checked afterwards)
```
=== variant A: sdk/src/connect.ts + mcp/src/config.ts + mcp/src/index.ts reverted
 × connectOptions() … names the actor and does not wait for the extension      TypeError: connectOptions is not a function
 × MCP over a real SDK client with the extension down (D5b) …                   Error: waitUntil timed out
 × connect({ requireExtension: false }) … resolves on a welcome …              AssertionError: expected false to be true
 × connect({ requireExtension: false }) … ignores waitForExtensionMs …         Error: Test timed out in 5000ms.
 Tests  4 failed | 11 passed (15)
=== variant B: only sdk/src/connect.ts reverted (behavioural failure of the MCP test)
 × MCP over a real SDK client … (2039ms)   Error: waitUntil timed out
 × … resolves on a welcome …               AssertionError: expected false to be true
 × … ignores waitForExtensionMs …          Error: Test timed out in 5000ms.
 Tests  3 failed | 12 passed (15)
=== variant C: only mcp/src/index.ts reverted → 542 passed (F1)
```
Per test: all four new tests fail on the joint revert; the MCP integration test also fails for a
behavioural reason (variant B), not only an import error.

**E6 — D5b.6**
```
$ git diff --stat -- docs/
 docs/e2e-test-plan.md |  2 +-
 docs/setup.md         | 12 +++++++-----
```
Only the CONN-2 row and the setup Troubleshooting bullet change; both carry "*Superseded 2026-10-22:
was …, because … (decisions.md · 2026-10-22 #27)*". Accuracy against the code: the status lines and
the tool error text match E7's live output verbatim; "nothing restarts" matches E7 (same client after
the extension connects); no other doc line still describes the 15 s wait for the MCP
(`grep -n "waited\|connecting to the bridge daemon" docs/setup.md docs/e2e-test-plan.md` → only the
Superseded notes).

**E7 — cross-package check** (verifier's throwaway `mcp/test/zz-verifier-crosscheck.test.ts`, in the
worktree only, deleted with it): real `daemon/src` `WsHost`+`Bridge` on 127.0.0.1 port 0, no
extension; real `connect({ ...connectOptions(), port, env, io:{hashDaemon, spawnDaemon→new WsHost on the
same port} })` inside a real `BridgeLink` with manual timers; real `registerTools`; fake extension over a
real `ws` socket. Port printed as `<port>`, token never printed.
```
[V] link has client after 22 ms; clients=1
[V] browser_status (2 ms):
Daemon: connected on 127.0.0.1:<port> (build vbuild, up 0s)
Clients (1): claude-code #22784
Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?
[V] browser_snapshot ext down: ok=false 1 ms msg=Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?
[V] after probe tick: clients=1 hasClient=true registry=1 pending=[5000]
[V] browser_snapshot ext up: ok=true 1 ms msg=SNAP-OK; clients=1
[V] 4002: reconnected=true spawns=1 clients=1 extConnected=false
[V] browser_status after 4002:
Daemon: connected on 127.0.0.1:<port> (build vbuild, up 0s)
Clients (1): claude-code #22784
Extension: not connected — is Chrome open with the Chrome Agent Bridge extension enabled and its token/port set?
[V] browser_snapshot after 4002, ext down: ok=false 0 ms msg=Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?
[V] after tick: clients=1 hasClient=true reason=null
[V] browser_snapshot after 4002, ext up: ok=true msg=SNAP-OK; clients=1
[V] after 1001 close: ok=false 0 ms msg=The connection to the bridge daemon closed (code 1001 "daemon shutting down"); this client does not reconnect — call connect() for a new client to continue
[V] after 1001 probe: hasClient=false reason=The connection to the bridge daemon closed (code 1001 "daemon shutting down"); this client does not reconnect — call connect() for a new client to continue pending=[5000]
[V] after tick: clients=2 spawns=2 reason=null reconnects-on-client0=n/a
 ✓ VERIFIER cross-package check … 842ms
      Tests  1 passed (1)
```
With `requireExtension:false`: a 4002 reconnect keeps the same client even when the new daemon's
welcome says the extension is down (as before D5b: the wait never applied to reconnects); a 1001 close
fails the client, the NOT_CONNECTED probe drops it, and the next 5 s tick runs a fresh `connect()` —
the D5 behaviour, unchanged.

**E8 — cleanup**
```
$ tasklist | grep -i node
node.exe                      2928 Console                    8     49,320 K
$ netstat -ano | grep :9234
(empty)
$ git worktree list
C:/Users/aliev/Projects/chrome-remote-extention  d3022f8 [main]
$ git stash list | wc -l
0
```
