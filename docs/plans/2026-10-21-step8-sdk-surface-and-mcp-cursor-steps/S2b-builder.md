# S2b builder report: the Step 6 compatibility path removed, `code` required, the session marker, handle numbers never reused, the minimized-window message

Builder: Claude Opus 5.5, 2026-10-23. Base: HEAD `53f68db`. Nothing committed (level-2 builder; the step
agent commits). S4 was editing `sdk/` in the same tree throughout. I did not touch `sdk/` or `mcp/src/`.

## Built

Daemon (`daemon/src/`):
- `methods.ts`: `selectTab` is out of `TAB_METHODS` and out of the lock class. `LEGACY_ID_METHODS` is
  gone. There is a new `REMOVED_METHODS` map (only `selectTab`) and a new class `untargeted`, for an
  unlisted method without `tab`. Both header comments are reworded.
- `intercept.ts`:
  - The legacy path is deleted, with its log line, `legacyLogged`, `legacyLog` and `legacyId`.
  - `selectTab` is refused with `UNKNOWN_METHOD` before anything else, including the connection check.
  - A tab call or an `untargeted` call without `tab` gets `BAD_PARAMS "tab is required"`.
  - `closeTab`/`focusTab` with any `id` get `BAD_PARAMS`.
  - A network `tab` that is a number or a numeric string gets `BAD_PARAMS`. A network call with no
    `tab`, or with "active", still goes to the human's tab (#81), with no log line.
  - `extensionConnected(conn, proto, session)` compares the session marker and calls `retireAll()`.
  - `handleNumbers` can be injected.
- `handles.ts`: adds the `HandleNumbers` interface, `counterFrom(1)` (the default, which keeps T1, T2, …),
  the `numbers` option and `retireAll()`.
- `handle-mark.ts` (new): the high-water-mark file `handle-mark`. Numbers are reserved in blocks of 64,
  each block written atomically (temp file + rename) before its first number is returned. When the file
  cannot be read or written, numbering falls back to a time base. I/O and the clock can be injected.
- `handshake.ts`: `helloSession(data)` returns the marker if it is a non-empty string, else undefined
  ("none"). `parseHello`'s result shape is unchanged.
- `connection.ts`: a `ConnectionOptions.onMissingCode` hook. Each pending call remembers its method. An
  error frame without a non-empty string `code` is still rejected as `INTERNAL`; the hook fires once per
  connection with the method only.
- `wsHost.ts`: reads `proto` and `session` from the hello. For a proto:2 extension it passes
  `onMissingCode` (which writes the log line). It forwards `handleNumbers` to the tab layer.
- `main.ts`: adds `DaemonDeps.stateDir`. When it is set, `createHandleMark({dir: stateDir})` is wired into
  the host. When it is absent there is no mark file, so no test that runs `runDaemon` reaches the real
  directory.
- `index.ts`: passes `stateDir: path.dirname(defaultLogPath())`, the directory the daemon log already uses.

Extension (`extension/src/`):
- `tabs.ts`: `activeTab()`, the fallback warning and `resetFallbackWarnings` are gone. `targetTab` without
  `tabId` gets `BAD_PARAMS "<method> requires tabId"`. `humansTab()` stays. The switch-mode
  `WINDOW_MINIMIZED` text is now the constant `SWITCH_MINIMIZED_MESSAGE` (#63).
- `handlers/tabs.ts`: `export const selectTab` removed.
- `sw.ts`:
  - `router.on("selectTab", …)` removed.
  - `SessionMarker` is glued to `chrome.storage.session` and `chrome.storage.local` (key `sessionMarker`)
    and to `crypto.randomUUID()`.
  - The `onStartup`/`onInstalled` listeners are still top-level and synchronous. They now record the
    event before calling `connect()`.
  - `connect()` awaits the marker and sends it in the `connect` message. A `connect()` requested while
    one is running reruns once afterwards. No top-level `await`.
- `session-marker.ts` (new, pure): `chooseMarker()` and the `SessionMarker` state machine. A late
  `onStartup` after a reused marker rotates to a fresh one.
- `offscreen.ts`: the marker is part of the client key (port, token, marker) and is passed to the client.
- `client.ts`: `helloFrame(token, session?)` adds `session` when the marker is a non-empty string.
- `network-scope.ts`: now synchronous, with no fallback. It accepts `tabId` (an integer) or
  `scope:"all"`; anything else gets `BAD_PARAMS`.
- `handlers/network.ts`: the `targetTab({}, method)` fallback is gone. An `id` lookup stays global.
- `errors.ts`: `toWireError` sends a `BridgeError` with an empty code as `INTERNAL`, so no code on the
  wire is ever empty.

Shared and docs:
- `shared/src/error.ts`: `WireError.code` is required. `fromWire` takes the lenient `WireErrorInput`, and
  its behaviour is unchanged.
- `docs/e2e-test-plan.md`: a dated *Superseded* note on SCREEN-4's expected text only. Run 8's recorded
  result (around line 1659) is not touched.

## Scoped test counts (`npx vitest run daemon/ extension/ shared/ mcp/`)

- Before (HEAD 53f68db, unmodified tree): **1079 passed, 57 files**.
- After: **1132 passed, 59 files** (exit 0).
- Arithmetic: 1079 − 11 removed + 64 new = 1132. Files: 57 + 2 new (`daemon/test/handle-mark.test.ts`,
  `extension/test/session-marker.test.ts`) = 59.

New tests (64):

| File | New | Covers |
|---|---|---|
| `daemon/test/tabs.test.ts` | 15 | 6 for the removals (S2b.3); 2 for the `code` rule (S2b.4); 6 for the marker: same, changed, audit §2 B6, dropped, none→none, none→A (S2b.5); 1 for S2b.9 through the tab layer |
| `daemon/test/handle-mark.test.ts` | 10 | 8 for the mark file, 2 for `HandleTable` with injected numbers |
| `daemon/test/connection.test.ts` | 3 | the codeless-error hook |
| `daemon/test/handles.test.ts` | 1 | `retireAll` |
| `daemon/test/handshake.test.ts` | 1 | `helloSession` |
| `daemon/test/main.test.ts` | 1 | `stateDir` wiring |
| `daemon/test/methods.test.ts` | 1 | the `untargeted` class |
| `extension/test/session-marker.test.ts` | 16 | 5 for `chooseMarker`, 6 for the five event orders (one order has a variant), 5 for the stage rulings and edges |
| `extension/test/router.test.ts` | 12 | the regression guard: every error path sends a non-empty code |
| `extension/test/tab-events.test.ts` | 1 | the hello carries the marker |
| `extension/test/target-tab.test.ts` | 3 | `targetTab` without `tabId` → `BAD_PARAMS` (S2.3); `resolveNetworkScope`'s refusals; the network handlers without `tabId` |

`mcp/test/multi-actor.test.ts` (S2b.7) is green with **no edit**. No fake change was needed: the Step 7
fake extension sends no marker, which is the none→none case, so nothing is retired.

## Removed tests (S2b.8): 11, each with the form it covered

| # | File (HEAD line) | Test | Removed form |
|---|---|---|---|
| 1 | `daemon/test/tabs.test.ts:981` | legacy: no tab → the human's tab, numeric tabId, no lease, one log line per client | #41 no `tab` → the human's tab, and the legacy log line |
| 2 | `daemon/test/tabs.test.ts:1003` | legacy: the human's tab held by another client → TAB_HELD; no human's tab → INTERNAL | #41 no `tab` → the human's tab, lease-checked |
| 3 | `daemon/test/tabs.test.ts:1016` | legacy: a screenshot without tab takes the lock (FIFO behind a holder, or LOCK_TIMEOUT) | #41 a screenshot with no `tab` on the human's tab (a legacy lock test, Stage 0 F11) |
| 4 | `daemon/test/tabs.test.ts:1038` | legacy: closeTab/selectTab with a Chrome id are resolved and lease-checked; an unknown id refreshes once, then TAB_UNKNOWN | #41 a Chrome `id` on `closeTab`/`selectTab` → its handle (`LEGACY_ID_METHODS`) |
| 5 | `daemon/test/tabs.test.ts:1066` | legacy: a bare number in a network tab is a Chrome id (#54); unknown → TAB_UNKNOWN | #54 a numeric network `tab` |
| 6 | `daemon/test/methods.test.ts:56` | an unlisted method is free without tab, tab-carrying with one | an unlisted method without `tab` forwarded free (#81 F8); replaced by the new `untargeted` test |
| 7 | `extension/test/target-tab.test.ts:143` | absent → the human's tab, warning once per method with the method name and nothing from params | the `activeTab()` fallback in `targetTab` |
| 8 | `extension/test/target-tab.test.ts:207` | selectTab is the same function as focusTab (alias, T3.5) | the `selectTab` alias |
| 9 | `extension/test/target-tab.test.ts:329` | form 3 (legacy tab): "all", an integer, "active"/absent → as before | #52 the legacy network `tab` forms |
| 10 | `extension/test/target-tab.test.ts:336` | neither tabId nor scope nor tab → the 0.1 fallback | the network human's-tab fallback |
| 11 | `extension/test/target-tab.test.ts:340` | form 3: anything else → BAD_PARAMS with the unchanged text | the legacy form-3 refusal text |

## Edited tests (S2b.8): the form each used and what replaced it

The lease and lock assertions are unchanged except where a line named the removed form, as listed.

| File (HEAD line) | Test | Form it used | What replaced it |
|---|---|---|---|
| `daemon/test/tabs.test.ts:779` | "focusTab and selectTab wait while a screenshot holds the lock; …" (now "focusTab (twice) waits …") | `send(b, "selectTab", {id: 102})` as the second waiter | `send(b, "focusTab", {tab: tb.tab})`. The lock assertion `expect(ext.reqs("focusTab")).toHaveLength(0)` is byte-identical and now covers both waiters; the `reqs("selectTab")` lines became `reqs("focusTab")[1]` and the result's `method: "focusTab"`. Dated comment added. |
| `daemon/test/tabs.test.ts:1211` | T2.3: every tab-carrying method reaches the extension with a numeric tabId and no tab key | a second call per method through the legacy path (`{}`, or `{id: 2}` for focusTab/selectTab) | the second call is removed, and `TAB_METHODS.size * 2` → `TAB_METHODS.size`. The per-request checks (no `tab`, numeric `tabId`) are unchanged. Dated comment added. |
| `daemon/test/tabs.test.ts:1236` | a no-proto extension: tab methods answer VERSION … | `call(a, "slow")` (unlisted, no `tab`) expected to be forwarded | `["slow", undefined]` moves into the VERSION list and out of the forwarded list. Dated comment cites #81 F8. |
| `daemon/test/tabs.test.ts` harness (`FakeExt`, `extension()`) | — | — | adds `FakeExt.fail(req, error)` (a raw error frame) and an optional `session` argument for the extension hello. No assertion changed. |
| `daemon/test/methods.test.ts:10` | tab-carrying, lease-checked methods | `"selectTab"` in the expected table | removed from the expected table |
| `daemon/test/methods.test.ts:62` | locate without tab is a tab method (…) | `classify("notAMethod", {})` → `"free"` | → `"untargeted"`. The title no longer says "today: the legacy path". |
| `daemon/test/methods.test.ts:71` | locate through the TabLayer: … | `locate` without `tab` → the human's tab (B: TAB_HELD; A: forwarded) | both without `tab` → `BAD_PARAMS "tab is required"`. B's TAB_HELD now goes through the handle `{tab:"T1"}`. The forwarded list has one entry. (S2's note foresaw this: "after S2b: BAD_PARAMS".) |
| `daemon/test/methods.test.ts:102` | lock class: default screenshot, focusTab, selectTab — … | `expect(takesLock("selectTab", {})).toBe(true)` | line removed, title updated |
| `daemon/test/methods.test.ts:117` | names the legacy-id methods and the network methods | the `LEGACY_ID_METHODS` assertion | removed; the test is now "names the network methods" |
| `daemon/test/multiplex.test.ts:134`, `:157`, `:186` | colliding ids; client disconnecting mid-call; extension going away | unlisted methods without `tab` (`whoami`, `slow`, `again`) as routing probes against a v1 extension | the free methods `downloadChunk`, `downloadStart`, `downloadEnd`, which are forwarded verbatim. These are routing tests, not lease or lock tests. Dated comments added. **Not in Stage 0's list.** |
| `extension/test/target-tab.test.ts:169/177/185/199` | describe "closeTab / focusTab / selectTab alias (F4)" and three tests in it | `selectTab` calls beside `focusTab` | the `selectTab` lines are removed; describe renamed "closeTab / focusTab (F4)"; dated comment added |
| `extension/test/target-tab.test.ts:285` | "captures an explicit active tab, and the fallback as before" | `screenshot({})` captured the human's tab | that half now asserts `BAD_PARAMS` and that nothing was captured. Dated comment added. |
| `extension/test/target-tab.test.ts:317/322/325` | resolveNetworkScope form 1 / form 2 | the `fallback` argument (the async signature) | called synchronously without it; same expectations |
| `extension/test/target-tab.test.ts` `beforeEach` | — | `resetFallbackWarnings()` | removed (the function is gone) |
| `extension/test/capture.test.ts:84` | a minimized window → WINDOW_MINIMIZED before anything is switched or captured | the old `pass mode:"cdp"` text | the new text, with a comment citing decisions.md · 2026-10-23 · T5b's three fixes (#63). This is a designed change decided before the edit. |

Stage 0's measured list, re-derived at HEAD 53f68db:
- `tabs.test.ts:249`, `:276`, `:386`, `:406` and `:435` read the Chrome `id`. They needed no edit, because
  #81 keeps `id`.
- `:1081` (`networkRequests {}`) and `:1143` (`networkClear {}`) needed no edit, because #81 keeps
  "active" for network calls without `tab`.
- `:779` and `:1211` were edited, as listed above.
- `:981`, `:1003`, `:1016`, `:1038` and `:1066` were removed.
- methods.test.ts ×3: I edited 4 tests there and replaced 1, as listed above.

Discrimination checks, run and then reverted:
- Making `takesLock("focusTab")` return false fails the edited lock test (`expected [ Array(2) ] to have
  a length of +0 but got 2`).
- Disabling `retireAll` fails 4 of the 6 S2b.5 tests. The 2 that pass are the no-retire branches
  (same marker, none→none), as they should.

## "Failed before" samples (TDD; each test was written first and run against the unchanged code)

- S2b.5 B6 (`tabs.test.ts`, "a lease no longer lands on a reused tab id after a changed marker") failed
  with `Cannot read properties of undefined (reading 'code')`. The snapshot on the retired `T2` succeeded:
  it was forwarded to the reused tab id 2.
- S2b.3 selectTab: `expected 'NOT_CONNECTED' to be 'UNKNOWN_METHOD'`, before any extension connected.
  With an extension connected the old code would have forwarded it.
- S2b.3 numeric network tab: `Cannot read properties of undefined (reading 'code')`. `{tab: 1}` was
  accepted as a Chrome id.
- S2b.4 log line: `expected [] to deeply equal [ Array(1) ]`. No `extension error without code` line.
- Network handler without `tabId` (extension): `expected Error: No normal Chrome window is focused… to
  match object { code: 'BAD_PARAMS' }`. It fell back to the human's tab.
- `handle-mark.test.ts` / `helloSession` / `retireAll` / `onMissingCode`: each failed against a stub that
  threw "not implemented" or lacked the member. 29 daemon tests failed in that first run.
- Extension: 11 failed, plus `session-marker.test.ts` failed to load (module missing). For example,
  router: "a thrown a BridgeError with an empty code" sent `code: ""`.

## Typecheck and build

`npm run typecheck` exits **2**, and only inside S4's in-flight file. Because the script chains `tsc`
with `&&`, it stops at sdk, so I ran each project separately:

```
shared exit=0
daemon exit=0
sdk exit=2
sdk/test/failure-report.test.ts(553,24): error TS1002: Unterminated string literal.
sdk/test/failure-report.test.ts(554,1): error TS1005: ',' expected.
sdk/test/failure-report.test.ts(554,53): error TS1002: Unterminated string literal.
mcp exit=0
extension exit=0
```

An earlier run of the chained script ended with `sdk/test/failure-report.test.ts(527,121): error TS2353:
Object literal may only specify known properties, and 'ref' does not exist in type 'ReportInput'`. That
file is S4's untracked test, being edited. I did not touch it.

`npm run build` exit 0:
```
built daemon → dist/index.js
built mcp → dist/index.js
built extension → dist/
```
(This rewrote `daemon/dist/index.js` in the main tree, so the next client hands any running daemon over.)

## The greps (S2b.2, S2b.6): stdout and exit code

```
grep -rn "activeTab" extension/src                    → (empty), exit=1
grep -rn "selectTab" extension/src                    → (empty), exit=1
grep -rn "targetTab({}" extension/src                 → (empty), exit=1
grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src    → daemon/src/methods.ts:43:  ["selectTab", "was removed in Step 8 — call focusTab"],   exit=0
grep -rn 'pass mode:"cdp"' extension/src extension/test → (empty), exit=1
grep -rnE "console\.(log|warn|error)\(.*(url|href)" extension/src → (empty), exit=1   (S2.4)
```

**The daemon grep fails by one line, and I left it failing.** Decision #85 item 4 (the daemon refuses
`selectTab` itself, before resolution, against an extension that would still answer it) needs the
literal method name in `daemon/src`. The two `methods.ts` comments are reworded and `LEGACY_ID_METHODS`
is gone; the one remaining hit is the refusal itself. I did not hide the name (for example
`"select" + "Tab"`): that would pass the grep while defeating what it checks. This is a
SPEC-DISCREPANCY touching a pre-registered exit check, so it is **escalated** to the step agent. One
possible ruling: S2b.2's daemon grep excludes the `REMOVED_METHODS` entry, or it reads
`grep -rn "selectTab" daemon/src | grep -v REMOVED` (or similar) and requires exactly that one line.

## Log lines, exactly

- `extension session changed: <n> handles retired`: one per retire. `<n>` counts every live handle,
  held or not. Tests assert the marker strings are absent from every log line.
- `extension error without code: <method>`: once per proto:2 extension connection. Never the message,
  never for a no-proto peer.
- `handle mark unreadable — handle numbers continue from a start-time base`: once, at start.
- `handle mark not written — handle numbers continue from a time base`: once, at the first failed write.
- Removed: `legacy client "<name>": …`.

## The mark file and what the fallback guarantees

The file is `<stateDir>/handle-mark`. In production `stateDir` is the log's directory,
`~/.chrome-agent-bridge/`. The content is one decimal number and a newline: the highest handle number any
daemon may have returned. A missing file means 0.
- On start, `next` = mark + 1.
- Before returning a number above the reserved ceiling, the daemon writes ceiling = n + 63
  (`<file>.<pid>.tmp`, then rename; the temp file is removed if the write fails), synchronously.
- A crash skips at most 63 numbers and never reuses one.
- Tests use temp directories only. `runDaemon` without `stateDir` writes no mark. I checked the real
  `~/.chrome-agent-bridge/` afterwards: it holds only `daemon.log`.

**Fallback.** The fallback starts when the file exists but is not a non-negative safe integer or is not a
regular file, or when a write fails:
- numbering continues from `timeBase(now)`, the milliseconds since 2026-01-01T00:00:00Z (about
  2.5 × 10¹⁰ in October 2026), and never below the current `next`.
- After an unreadable start, the first write is still attempted. If it succeeds, the file is repaired.
- After a failed write, no further writes are attempted.

*Guaranteed:*
- no number is reused against any earlier daemon that used the mark, since those numbers are far below
  the time base;
- no number is reused against an earlier daemon that used the time base, provided the later start came
  at least as many milliseconds after it as the number of handles it minted;
- a later daemon that reads an older, lower mark starts there, far below any time-base number.

*Not guaranteed:*
- a system clock set backwards between starts;
- an earlier time-base daemon that minted more handles than milliseconds elapsed before the next start;
- a mark-reading daemon that later climbs to about 2.5 × 10¹⁰.

Handles in the fallback look like `T25000000000`.

## Proposed decisions

### 2026-10-23 · A session marker that appears where there was none retires every handle
**Decided:** in the daemon, none→A retires, like A→B and A→none. The first extension hello of the
daemon's life retires nothing. Hellos from no-proto extensions count in the comparison, since their
"none" is a value too.
**Why:** a change of value is a change. It costs leases once and never weakens safety (the step agent's
ruling, recorded here as asked).
**Instead of:** none→A keeping handles (a Step 7 extension replaced by a marker-sending one across a
Chrome restart would keep leases onto reused ids).
**Revisit if:** the extension rollout makes none→A frequent without a Chrome restart.

### 2026-10-23 · The visibility lock is not touched by a retire
**Decided:** `retireAll` drops handles and leases synchronously and clears the closer map. It does not
touch the lock queue.
**Why:**
- The holder's forwarded call runs on the old socket, which ends by its answer, its deadline or the
  socket's close. All three are existing release paths.
- A waiter re-resolves its handle when the lock is granted (`intercept.ts`, "the wait may have been
  long") and now gets `TAB_GONE`.
- FIFO order and the release rules are unchanged.

**Instead of:** flushing the queue on a retire, which adds a release path that #84 and the lock rules
do not list.
**Revisit if:** a live row shows a waiter acting on a reused id.

### 2026-10-23 · `closeTab`/`focusTab` with an `id` are refused even beside a `tab`
**Decided:** any `id` on `closeTab`/`focusTab` gets `BAD_PARAMS "<method> takes tab (a handle like
"T3"), not a Chrome tab id"`.
**Why:** this is stricter than silently stripping the `id`, and the extension would otherwise see a
Chrome id it might act on.
**Instead of:** stripping `id` when `tab` is present.
**Revisit if:** a client still sends both.

### 2026-10-23 · An unlisted method without a tab gets `VERSION` from a no-proto extension
**Decided:** an `untargeted` call goes down the tab path. With a no-proto extension it gets `VERSION`,
the same as every tab method (#42). With a proto:2 extension it gets `BAD_PARAMS "tab is required"`.
**Why:** this keeps one order (NOT_CONNECTED → VERSION → BAD_PARAMS). It is stricter than the old free
forwarding to a Step 6 extension.
**Instead of:** `BAD_PARAMS` for both kinds of extension, or forwarding it free to a no-proto extension.
**Revisit if:** the order of refusals matters to a client.

### 2026-10-23 · A late `onStartup` rotates a reused marker
**Decided:** if `onStartup` arrives after the marker was reused (from `storage.session` or from
`storage.local` after `onInstalled`), the worker switches to a fresh marker and reconnects. onInstalled
with any reason other than "install"/"update", including an absent one, gives a fresh marker.
**Why:** an `onInstalled(update)` that comes before `onStartup` on a Chrome start would otherwise keep
the old marker across a restart. Both changes go in the safe direction.
**Instead of:** honouring only the first event seen.
**Revisit if:** SM-0/SM-1 show spurious rotations.

### 2026-10-23 · The daemon refuses `selectTab` by name, and S2b.2's daemon grep sees it
**Decided:** the refusal keeps the literal `"selectTab"` in `daemon/src/methods.ts` (`REMOVED_METHODS`).
**Why:** #85 item 4 requires the refusal. Hiding the name would make the grep pass without the property
it checks.
**Instead of:** obfuscating the string, or dropping the refusal (which F10 shows forwards `selectTab`
with no lock).
**Revisit if:** the session agent rules S2b.2's wording (this is escalated).

### 2026-10-23 · Empty codes never reach the wire from the extension
**Decided:** `toWireError` sends a `BridgeError` whose code is empty as `INTERNAL`.
**Why:** this is the sender's half of #73.
**Instead of:** trusting every thrower.
**Revisit if:** never.

## Deviations from the phase doc and brief

1. S2b.2's daemon grep reads one line (above). Escalated.
2. `daemon/test/multiplex.test.ts` (3 routing tests) had to be edited. Stage 0's list did not include
   them: they used unlisted untargeted methods as probes.
3. The no-proto test (`tabs.test.ts:1236`) was edited for `slow`.
4. New files `daemon/src/handle-mark.ts` and `daemon/test/handle-mark.test.ts`, inside the `daemon/` lane.
   `daemon/src/index.ts` was touched to pass `stateDir`.
5. `shared/src/error.ts` adds an export, `WireErrorInput`, a lenient type for `fromWire`'s input. The SDK
   surface is unchanged (`sdk/src/index.ts` re-exports by name). `ErrorResponse.error` in
   `shared/src/protocol.ts` (outside the lane) is still typed `WireError`, which now has a required
   `code`, but receivers only pass it to `fromWire`, which reads it leniently.
6. Unknown codes (`{code:"WEIRD"}`) pass through verbatim, as today (F17), with no log line. Tested.

## Left open

- The extension's `explicitTabId` still accepts a Step 6 `id` for `closeTab`/`focusTab`. That was not in
  the brief, and the daemon never forwards `id` now.
- After a retire, the MCP cursor's untargeted calls answer `TAB_GONE "tab T1 was closed …"` although
  nothing closed (F24; `mcp/src` is outside my lane).
- Residual edge: if the old extension socket stays open and answers an in-flight `newTab`/`listTabs`
  after a retire, the daemon can mint a handle for an old-session tab id. After a real Chrome restart the
  old socket is dead.
- Not run: anything live (SM-0, SM-1), and the full suite in a clean worktree (the verifier's job).
- Observation, not mine: the real `~/.chrome-agent-bridge/` directory's mtime moved to 14:46 during the
  session, with no new file in it. None of my tests reference it. S4's `failure-report.test.ts` builds
  homedir paths, so the S4 verifier may want to check that.
