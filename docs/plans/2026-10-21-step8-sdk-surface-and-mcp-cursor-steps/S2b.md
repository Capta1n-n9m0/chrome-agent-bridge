# S2b report: the Step 6 compatibility path removed, `code` required, the session marker, handle numbers never reused, the minimized-window message

Step agent: Opus 5.5. Base commit 53f68db (S4 committed 26df11b and d72aeda in parallel, in `sdk/` and docs only).
Sub-reports in this directory: `S2b-builder.md`, `S2b-verifier.md` (with "Re-check (fixer round 1)"),
`S2b-fixer1.md`; ledger `S2b.ledger.md`.

## Verdict

**Built, verified PASS-with-notes, with one ESCALATED CHECK.** S2b.1 and S2b.3–S2b.9 are met, and so are S2.2 and
three of S2b.2's four greps. The fourth grep is not met as worded:
`grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src` prints one line and exits 0:

```
daemon/src/methods.ts:43:  ["selectTab", "was removed in Step 8 — call focusTab"],
```

That line is the refusal that #85 item 4 requires: the daemon answers `selectTab` with `UNKNOWN_METHOD` itself,
before resolution. The refusal has to name the method. The verifier confirmed the line is that refusal and
nothing else:
- `REMOVED_METHODS` is read only as the first statement of `TabLayer.request`.
- `selectTab` is in neither `TAB_METHODS` nor `takesLock`.
- A fake extension that would answer `selectTab` never receives it.

Rewording a pre-registered check is the session agent's decision (ESCALATION list, first item). I did not
disguise the string. A proposed rewording is under Proposed decisions.

## Outputs

- **Daemon** (`daemon/src/intercept.ts`, `methods.ts`, `handles.ts`, `handshake.ts`, `wsHost.ts`, `connection.ts`,
  `main.ts`, `index.ts`, new `handle-mark.ts`):
  - The legacy path, its log line and `LEGACY_ID_METHODS` are removed.
  - A tab call without `tab` gets `BAD_PARAMS "tab is required"`. So does an unlisted method without `tab`: it is
    classed `untargeted` (#81 F8), and a no-proto extension answers it `VERSION`.
  - `id` on `closeTab`/`focusTab` gets `BAD_PARAMS`. A numeric network `tab` gets `BAD_PARAMS`, whether a number or
    a numeric string.
  - `selectTab` gets `UNKNOWN_METHOD`, answered by the daemon before resolution.
  - A network call with no `tab`, or with "active", still goes to the human's tab, now with no log line (#81).
  - The Chrome `id` stays beside `tab` (#81), and `tabs.claim {active:true}` is intact.
  - A proto:2 extension's error with no code is delivered as `INTERNAL` and logged once per connection as
    `extension error without code: <method>`. A no-proto extension gets no log line. Unknown codes pass through
    verbatim, as before (F17).
  - Session marker: the daemon compares each hello's marker with the last hello's, and "none" counts as a value.
    The first hello of the daemon's life retires nothing. After that, any change retires every handle:
    A→B, A→none and none→A.
  - The retire runs synchronously, before the resync and before any await. Every live handle goes gone with its
    pre-restart lastUrl/lastTitle, each holder gets `tabGone` once, every lease is dropped, and the resync then
    mints new handles. It logs `extension session changed: <n> handles retired`, never the marker.
  - Handle numbers: a high-water mark at `<stateDir>/handle-mark`, written atomically in blocks of 64 before a
    handle above the reserved ceiling is returned. Only `index.ts` passes `stateDir` (`~/.chrome-agent-bridge/`).
  - If the mark is unreadable or a write fails, numbering falls back to milliseconds since 2026-01-01, never below
    numbers already issued. The guarantees are in `S2b-builder.md` § "The mark file".
- **Extension** (`tabs.ts`, `sw.ts`, `offscreen.ts`, `client.ts`, `errors.ts`, `network-scope.ts`,
  `handlers/tabs.ts`, `handlers/network.ts`, new `session-marker.ts`):
  - `targetTab` without `tabId` gets `BAD_PARAMS`, with no fallback.
  - `explicitTabId` reads `tabId` only (fixer round 1).
  - The `selectTab` route and alias are removed.
  - `network-scope.ts` accepts only `tabId` or `scope:"all"`.
  - The switch-mode `WINDOW_MINIMIZED` text is now exactly `Chrome's window is minimized, so the tab cannot be
    captured — restore the window, or call focusTab first` (#63).
  - `toWireError` never sends an empty code.
  - The marker module and its glue:
    - The `onStartup`/`onInstalled` listeners are registered synchronously at the top level and only record the
      event. There is no top-level await.
    - `connect()` awaits the marker and sends it in the `connect` message. The offscreen client key includes the
      marker, and the hello carries `session`.
    - A `storage.session` hit returns the stored marker at once, with no wait.
    - `onInstalled` with "install" or "update" waits out the 2 s bound for `onStartup`, then reuses
      `storage.local`'s marker (fixer round 1).
    - Any other `onInstalled` reason, or `onStartup`, gives a fresh marker. So does seeing neither event before the
      bound ends.
    - A late `onStartup` rotates to a fresh marker and reconnects.
- **Shared:** `WireError.code` is required. `fromWire` takes the lenient `WireErrorInput`.
- **Docs:** `docs/e2e-test-plan.md` SCREEN-4 gets a dated *Superseded* note on its expected text only. Run 8's
  recorded result is untouched.
- **Tests:** `daemon/test/{tabs,methods,multiplex,handles,handshake,connection,main}.test.ts`, the new
  `daemon/test/handle-mark.test.ts`, `extension/test/{target-tab,router,capture,tab-events}.test.ts`, and the new
  `extension/test/session-marker.test.ts`.
- `mcp/test/` is not edited. `mcp/test/multi-actor.test.ts` is green unchanged (S2b.7).

## Verifier verdict

**PASS-with-notes** (`S2b-verifier.md`), first pass and re-check.

Counts, full suite, in a clean worktree with S2b's lane diff only:

| Base | Before | After | Arithmetic |
|---|---|---|---|
| HEAD 53f68db | 1370 passed, 75 files | 1423, 77 files | 1370 − 11 + 64 |
| HEAD d72aeda (re-check) | 1435, 76 files | 1493, 78 files | 1435 − 11 + 69 (64 builder + 5 fixer); 12 renames |

- Typecheck exits 0 and build exits 0 in the clean worktree.
- In the main tree, typecheck currently fails only in `mcp/test/tools.test.ts`, which another stage is editing
  and which is not S2b's.
- 25 mutations, plus 3 more in the re-check, each made its own test fail. The one survivor (the retire's lease
  drop) was fixed by a new test.
- Remaining notes:
  - NIT 5: `WireErrorInput` collapses to `unknown`. It documents intent and enforces nothing.
  - NIT 6: SCREEN-4 keeps its old expected text with the note after it. That is correct.
  - NIT 7: a daemon that loses the port race may log one spurious `handle mark unreadable …` line. It never
    writes the mark.
  - New NIT: an extension reload now sends its hello up to 2 s later.

## Test count: before → after, with the removal list (S2b.8)

Scoped (`daemon/ extension/ shared/ mcp/`): 1079 / 57 files → 1137 / 59. Full suite, as above.

**Removed (11)**, each with the form it covered:
1. `daemon/test/tabs.test.ts:981` legacy: no tab → the human's tab … one log line per client (#41 no `tab`, the
   legacy log).
2. `tabs.test.ts:1003` legacy: the human's tab held → TAB_HELD; no human's tab → INTERNAL (#41 no `tab`,
   lease-checked).
3. `tabs.test.ts:1016` legacy: a screenshot without tab takes the lock (#41 no `tab` on a lock method).
4. `tabs.test.ts:1038` legacy: closeTab/selectTab with a Chrome id (#41 `LEGACY_ID_METHODS`).
5. `tabs.test.ts:1066` legacy: a bare number in a network tab (#54).
6. `daemon/test/methods.test.ts:56` an unlisted method is free without tab (#81 F8). Replaced by the `untargeted`
   test.
7. `extension/test/target-tab.test.ts:143` absent → the human's tab, warning once (the `activeTab()` fallback).
8. `target-tab.test.ts:207` selectTab is the same function as focusTab (the alias).
9. `target-tab.test.ts:329` form 3: "all", an integer, "active"/absent (#52 legacy network forms).
10. `target-tab.test.ts:336` neither tabId nor scope nor tab → the fallback (network human's-tab fallback).
11. `target-tab.test.ts:340` form 3: anything else → BAD_PARAMS with the unchanged text (the legacy form-3
    refusal).

**Edited** (every one listed with the form it used in `S2b-builder.md` § "Edited tests"):
- `tabs.test.ts:779`: the `selectTab` waiter becomes `focusTab`. The lock assertion is byte-identical.
  Mutation-checked: `takesLock("focusTab")` returning false fails it.
- `tabs.test.ts:1211` (T2.3): the legacy second call is removed.
- `tabs.test.ts:1236`: `slow` moves to the VERSION list.
- `methods.test.ts` ×5.
- `multiplex.test.ts:134/157/186`: routing probes switched to the download methods; comments corrected in fixer
  round 1. These three are not in Stage 0's list.
- `target-tab.test.ts`: the `selectTab` lines, the screenshot fallback half (now BAD_PARAMS) and the
  `resolveNetworkScope` signature.
- `capture.test.ts:84`: the `WINDOW_MINIMIZED` text, citing #63.

Stage 0's other measured tests needed no edit because #81 keeps their forms: `:249`, `:276`, `:386`, `:406` and
`:435` read the Chrome `id`; `:1081` and `:1143` send network calls without `tab`.

## Deviations

1. S2b.2's daemon grep reads one line (ESCALATED, above).
2. Three `multiplex.test.ts` routing tests were edited, outside Stage 0's list. They used unlisted untargeted
   methods as probes, which are now refused.
3. #80 as worded reused `storage.local`'s marker at once on a reload reason. As built (fixer round 1, verifier
   F1), the worker first waits out the same 2 s bound for `onStartup`.
   - Stricter: a Chrome start whose `onInstalled` precedes `onStartup` no longer sends one hello with the old
     marker.
   - Cost: up to 2 s on each extension reload.
4. The extension's `explicitTabId` no longer accepts a Step 6 `id`. The brief did not list this form. It is
   stricter, and the S2b daemon never forwards `id`.
5. `shared/src/error.ts` exports a new type, `WireErrorInput`. `ErrorResponse.error` in `shared/src/protocol.ts`
   (outside the lane) is still typed `WireError`. Receivers pass it only to the lenient `fromWire`.

## Proposed decisions

### 2026-10-23 · S2b.2's daemon grep excludes the `selectTab` refusal that #85 item 4 requires
**Decided:** S2b.2's daemon check reads: `grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src` prints exactly one
line, the `REMOVED_METHODS` entry in `daemon/src/methods.ts`. Also, `grep -rn "REMOVED_METHODS" daemon/src` shows
it read only in `TabLayer.request`'s first statement, and a test against a fake that would answer `selectTab`
gets `UNKNOWN_METHOD` with nothing forwarded.
**Why:** #85 item 4 (later than the kickoff's grep) requires the daemon to refuse `selectTab` by name, so the
unscoped grep cannot be empty. The reworded check keeps the grep's intent: no alias, no forwarding, no lock class.
**Instead of:** obfuscating the string so the grep passes (hides the very property); dropping the refusal (F10:
then `selectTab` is forwarded with no lock).
**Revisit if:** `REMOVED_METHODS` gains a forwarding use.
**By:** Claude (contract-level, a pre-registered check — for the session agent to rule)

### 2026-10-23 · A session marker that appears where there was none retires every handle
**Decided:** none→A retires, like A→B and A→none. The first extension hello of the daemon's life retires nothing.
A no-proto hello's "none" counts in the comparison.
**Why:** a change of value is a change. It costs leases once and never weakens safety. A Step 7 extension
replaced by a marker-sending one across a Chrome restart must not keep leases on reused ids.
**Instead of:** none→A keeping handles.
**Revisit if:** none→A turns out frequent without a Chrome restart.

### 2026-10-23 · `onInstalled` reasons other than "install"/"update" give a fresh marker; both events → fresh
**Decided:** "chrome_update", "shared_module_update" or an absent reason → fresh. `onStartup` together with
`onInstalled` → fresh.
**Why:** a Chrome update implies a Chrome restart. When in doubt, fresh costs leases and never safety.
**Instead of:** reusing on every `onInstalled`.
**Revisit if:** SM-0/SM-1 show spurious retires.

### 2026-10-23 · An extension reload waits out the marker bound before reusing its marker
**Decided:** a worker with no `storage.session` marker that has seen `onInstalled("install"|"update")` but not
`onStartup` keeps waiting for `onStartup` until the one 2 s bound, which starts at the `storage.session` miss,
ends. `onStartup` in time → fresh. Otherwise it reuses `storage.local`'s marker. A late `onStartup` still rotates
to a fresh marker and reconnects. A `storage.session` hit never waits.
**Why:** verifier F1: an `onInstalled` before `onStartup` on a Chrome start would otherwise send one hello with
the old marker, and a held handle could name a reused tab id until the rotation. That is the integrity-floor
case: a handle kept alive across a changed session.
**Instead of:** #80's immediate reuse with the rotation alone.
**Revisit if:** the up-to-2 s delay on each reload hurts the reload recipe or the waves, or a live run shows
`onStartup` arriving more than 2 s after `onInstalled`.

### 2026-10-23 · The visibility lock is not touched by a session retire
**Decided:** `retireAll` drops handles and leases and clears the closer map, synchronously. The lock queue is
untouched.
**Why:**
- The holder's forwarded call ends by its answer, its deadline or the old socket's close, which are all existing
  release paths.
- A waiter re-resolves its handle when the lock is granted, and now gets `TAB_GONE`.
- FIFO and the release rules are unchanged.

**Instead of:** flushing the queue, a new release path the lock rules do not list.
**Revisit if:** a live row shows a waiter acting on a reused id.

### 2026-10-23 · `id` on `closeTab`/`focusTab` is refused, even beside a `tab`; the extension reads `tabId` only
**Decided:** the daemon refuses any `id` on these two methods with `BAD_PARAMS "<method> takes tab (a handle like
"T3"), not a Chrome tab id"`. The extension's `explicitTabId` no longer falls back to `id`.
**Why:** stricter than stripping, and it removes the last extension-side Step 6 form (verifier F3).
**Instead of:** stripping `id` when `tab` is present; keeping the extension's `id` fallback for a Step 6 daemon.
**Revisit if:** a client still sends both.

### 2026-10-23 · An untargeted unlisted method gets `VERSION` from a no-proto extension, `BAD_PARAMS` from proto:2
**Decided:** an `untargeted` call goes down the tab path, so the refusal order is NOT_CONNECTED, then VERSION,
then BAD_PARAMS.
**Why:** it keeps one order, and it is stricter than the old free forwarding.
**Instead of:** `BAD_PARAMS` for both kinds of extension.
**Revisit if:** a client depends on the refusal order.

### 2026-10-23 · The handle mark: `handle-mark` beside the daemon log, blocks of 64, a time-base fallback
**Decided:** the mark is one decimal number in `~/.chrome-agent-bridge/handle-mark`.
- Before returning a number above the reserved ceiling, the daemon writes ceiling = n + 63 (temp file, then
  rename).
- A missing file means 0.
- If the file is unreadable or a write fails, numbering continues from the milliseconds since
  2026-01-01T00:00:00Z, never below a number already issued. One log line, with no path and no number.
- Only `index.ts` passes `stateDir`, so tests never touch the real directory.

**Why:** #79 and #86 item 4. Blocks keep the writes rare, and a crash skips at most 63 numbers.
**Instead of:** a write per handle; a random base.
**Revisit if:** the clock is set backwards between starts, or a fallback daemon mints faster than 1 handle/ms
before a restart (both stated as not guaranteed).

### 2026-10-23 · Unknown error codes pass through verbatim; empty codes leave the extension as `INTERNAL`
**Decided:** the daemon keeps today's pass-through of an unknown non-empty code (F17), with no log line.
`toWireError` maps an empty code to `INTERNAL`.
**Why:** #73 asks only that a missing or empty code arrive as `INTERNAL`. Rewriting a non-empty code would be a
new rule.
**Instead of:** mapping unknown codes to `INTERNAL`.
**Revisit if:** a client trips on an unknown code.

## Findings

- **S2b.2's daemon grep** (ESCALATED, above).
- **F24 stays open (outside the lane):** after a retire, the MCP cursor answers untargeted calls with
  `TAB_GONE "tab T1 was closed …"` although nothing closed (`mcp/src/cursor.ts`). S5 owns it.
- **Residual race (builder, "Left open"):** if the old extension socket is still open and answers an in-flight
  `newTab`/`listTabs` after a retire, the daemon could mint a handle for an old-session tab id. After a real
  Chrome restart the old socket is dead. This is a watch item for SM-1, not reproduced.
- **Residual window:** if `onStartup` comes more than 2 s after `onInstalled` on a Chrome start, the rotation
  still leaves a window of milliseconds with a resync by id. It has not been measured; SM-1 can watch for it.
- **The reload proof:** an extension reload now sends its hello up to 2 s later. `recipes/reload-extension.ps1`
  accepts a resync line within 15 s, so it still passes (verifier, by reading). CLAUDE.md's "a new `extension
  resync` line in `daemon.log` in the same second" may no longer hold. Not measured.
- **Rebuilt dist:** `npm run build` rewrote `daemon/dist/index.js` and `extension/dist/*` in the main tree. The
  next client hands any running daemon over (build-id handover). The loaded extension still runs the old build
  until a reload.
- **Not run:** SM-0 and SM-1 (live). SM-1 needs a Chrome restart grant.

## Handoff

- For the session agent:
  - Rule S2b.2's wording (proposed above).
  - Record the proposed decisions.
  - #74/#80 get an *Amended* note for the reload wait.
  - S5: the cursor message after a retire (F24).
  - S6/SM-0: expect a reload's hello up to 2 s later. SM-1 watches the two residuals.
- The Step 7 MCP against the S2b daemon: `mcp/test/multi-actor.test.ts` is green unedited. Untargeted MCP calls
  carry the cursor's `tab`, and network calls with no `tab` stay "active".

### For the as-built register

- S2b: `tab` is required on every tab call and on every unlisted method.
  - Without one, the call gets `BAD_PARAMS "tab is required"`, or `VERSION` from a no-proto extension.
  - Network calls with no `tab`, or with "active", go to the human's tab, with no log line.
  - A numeric network `tab` gets `BAD_PARAMS`.
  - `id` on `closeTab`/`focusTab` gets `BAD_PARAMS`.
  - `selectTab` gets `UNKNOWN_METHOD`, answered by the daemon (`REMOVED_METHODS`).
  - The Chrome `id` stays beside `tab` in `newTab`/`listTabs` results.
- `WireError.code` is required. A codeless proto:2 error is delivered as `INTERNAL` and logged once per
  connection as `extension error without code: <method>`.
- The session marker:
  - It is chosen by `extension/src/session-marker.ts`, sent as `hello.session`, and is part of the offscreen
    key.
  - The daemon retires every handle on any change after the first hello, synchronously and before the resync.
  - Each holder gets one `tabGone` with the pre-restart url and title, leases are dropped, and the lock is
    untouched.
  - The log line is `extension session changed: <n> handles retired`.
- Handle numbers come from `daemon/src/handle-mark.ts` (`~/.chrome-agent-bridge/handle-mark`, blocks of 64,
  time-base fallback).
- The new `WINDOW_MINIMIZED` switch-mode text is quoted under Outputs.
- Tests: 11 removed, 69 added (full suite 1435 → 1493 at d72aeda).

### New CLAUDE.md gotcha candidates (measured facts only)

- In S2b's unit tests, a leaked lease on a retired handle is invisible through the API, because leases are keyed
  by handle and the handle is dead. Only a test that claims through the lease table or after the retire catches
  it. Source: verifier mutation M6, which survived until fixer round 1 added the test.
- `npm run typecheck` chains the projects with `&&`, so a type error in one package hides the results of the
  later ones. Under parallel stages, run `tsc -p <pkg>` per package. Source: the S2b builder and fixer, whose
  typecheck stopped in another stage's in-progress file.

(No new Chrome-side measurement came from S2b; the 2 s reload delay and the residual window are design facts,
not measured.)

## Budget

4 h budgeted; about 1.3 h actual (builder ~27 min, verifier ~18 min, fixer ~4.5 min, re-check ~10 min, plus
reading and decisions).
