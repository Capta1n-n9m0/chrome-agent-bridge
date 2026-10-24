# S2b fixer, round 1

Fixer: Claude Opus 5.5, 2026-10-23. Main tree, nothing committed, no agents spawned. The input was
`S2b-verifier.md` (findings 1, 2 and 3, and NIT 4). All four are fixed and none is disputed. I touched only
the files listed below. `sdk/`, `mcp/src/` and `S2b-builder.md` are untouched.

## Finding 1 (MINOR): fixed. A reload reason waits out the bound for `onStartup`

Files: `extension/src/session-marker.ts` and `extension/test/session-marker.test.ts`.

- **Diff.**
  - The code adds a second one-shot signal, `startupSignal`, which only `startup()` resolves.
  - `resolve()` now starts **one** `delay(MARKER_WAIT_MS)` bound at the `storage.session` miss and never
    restarts it.
  - With no event yet, it races `signal` against the bound, as before.
  - Then, if `installed` is a reload reason ("install"/"update") and `onStartup` has not been seen, it races
    `startupSignal` against **the same bound**. It reuses `storage.local`'s marker only after the bound has
    ended.
  - A non-reload reason ("chrome_update" …) is still fresh at once. A `storage.session` hit still returns
    with no delay call at all.
  - The late-`onStartup` rotation is unchanged and remains the backstop.
  - The header comment is rewritten to describe the new order and its cost: an extension reload sends its
    hello up to 2 s later.
- **Fail-before.** The 3 new tests plus edited test 2 were written first: `3 failed | 16 passed (19)`. The
  failures were edited test 2 and the two new ordering tests, each of which resolved to `L-1`/`L-OLD` without
  waiting. The worker-restart test passed before as well, since it pins behaviour that is unchanged. After the
  fix: `19 passed (19)`.
- **Tests edited for the new contract**, each with a dated comment or a `d.elapse()`:
  - "2. extension reload …" was renamed to "… after the bound …". It now asserts `d.waits = [2000]` and that
    the marker resolves only after `elapse()`.
  - "2b" now elapses the bound after `installed`.
  - "a late onStartup after a reused marker rotates …" now elapses the bound before reusing. This keeps the
    rotation tested as the backstop when `onStartup` comes later than the bound.
  - "a failing store is a miss …" now elapses the bound.

## Finding 2 (MINOR): fixed. The retire's lease drop is pinned

File: `daemon/test/tabs.test.ts`, one new test placed after the changed-marker test.

- **Set-up.** A holds T2. B's `networkClear {tab:"all"}` is refused `TAB_HELD`, which is the control.
- **After a changed marker (A→B):**
  - B's `networkClear {tab:"all"}` is forwarded as `{scope:"all"}`. A leaked lease on the retired T2 would
    still count as a foreign lease there and refuse.
  - Tab id 2 has a new handle (not T2) with no owner, and B claims it without `TAB_HELD`.
  - `tabs.claim {tab:"T2"}` answers `TAB_GONE`, both for A (the old holder) and for B.
- **Fail-before.** I removed `this.leases.release(handle);` from `retireAll` (`daemon/src/intercept.ts:176`)
  with sed. The result was `1 failed | 56 passed (57)`: the new test, with "expected undefined to deeply
  equal { ok: true, method: 'networkClear' }" (the call came back `TAB_HELD`). Then I restored the file from
  its backup, and `cmp` reports it byte-identical. With the line in place the test passes.

## Finding 3 (MINOR): fixed. `explicitTabId` reads `tabId` only

Files: `extension/src/handlers/tabs.ts` and `extension/test/target-tab.test.ts`.

- **Diff.** `p.tabId ?? p.id` became `p.tabId`, and the doc comment now says the Step 6 `id` form was removed.
  `closeTab`/`focusTab` without `tabId` → `BAD_PARAMS "<method> requires tabId"`, which is targetTab's
  message style. A non-integer `tabId` → `BAD_PARAMS "tabId must be an integer"`, as before.
- **Tests.**
  - "reads tabId, else the Step 6 id" became "reads tabId", with a dated comment; the `id` lines are gone.
  - New test: "S2b fixer 1 (F3): a Step 6 id without tabId → BAD_PARAMS 'requires tabId', and nothing is
    closed or focused".
  - In "non-integer → BAD_PARAMS; unknown id → TAB_UNKNOWN", `closeTab({id:999})` became
    `closeTab({tabId:999})`.
- **Fail-before.** The new test failed before the source change (`1 failed | 34 passed (35)`). After the
  change: `35 passed (35)`.
- **Greps** (after):
  - `grep -rn "activeTab" extension/src` → empty, exit=1
  - `grep -rn "selectTab" extension/src` → empty, exit=1
  - `grep -rn "targetTab({}" extension/src` → empty, exit=1

## NIT 4: fixed (comments only)

`daemon/test/multiplex.test.ts:140`, `:165` and `:195` now say the unlisted method "is now refused (VERSION
against this no-proto fake, BAD_PARAMS against a proto:2 one)".

## New tests (by name)

- `extension/test/session-marker.test.ts`, describe "SessionMarker: onInstalled before onStartup on a Chrome
  start (S2b fixer 1, verifier F1)":
  - "onInstalled(update), then onStartup 500 ms later within the bound → a fresh marker, no rotation,
    storage.local's never handed out"
  - "onInstalled(update) alone → storage.local's marker is reused only after the bound ends"
  - "a worker restart (storage.session hit) never waits, even with onInstalled(update) seen"
- `daemon/test/tabs.test.ts`: "S2b.5 changed marker drops every lease (S2b fixer 1, verifier F2): no foreign
  lease survives the retire, the reused id's new handle is claimable, the retired one answers TAB_GONE"
- `extension/test/target-tab.test.ts`: "S2b fixer 1 (F3): a Step 6 id without tabId → BAD_PARAMS 'requires
  tabId', and nothing is closed or focused"

## Counts

| | Command | Result |
|---|---|---|
| Before (builder, S2b lane) | `npx vitest run daemon/ extension/ shared/ mcp/` | 1132 passed, 59 files |
| After | same | **1137 passed, 59 files** (exit 0) |
| Arithmetic | | 1132 + 5 new (3 session-marker, 1 tabs, 1 target-tab; 1 renamed, none removed) = 1137 |
| typecheck | `npm run typecheck` | **exit 2**, but not from S2b. Its only errors are in `mcp/test/tools.test.ts` (`RegisterToolsOptions` missing, TS2554), a file another stage is editing in the shared tree (`git status`: ` M mcp/test/tools.test.ts`, not an S2b or fixer file). Run separately, `tsc -p` on shared, daemon, sdk and extension each exits 0. |
| build | `npm run build` | exit 0: `built daemon`, `built mcp`, `built extension` |

## Proposed decision

### 2026-10-23 · An extension reload waits out the marker bound before reusing its marker
**Decided:** when the service worker has no `storage.session` marker and has seen `onInstalled`
("install"/"update") but not `onStartup`, it keeps waiting for `onStartup` until the one 2 s bound, which
starts at the `storage.session` miss, ends. If `onStartup` comes in time, the marker is fresh. Otherwise the
worker reuses `storage.local`'s marker. The late-`onStartup` rotation stays as the backstop.
**Why:** a Chrome start whose `onInstalled` precedes `onStartup` would otherwise send one hello with the old
marker. Between that hello and the rotation, a held handle could name a reused tab id (S2b verifier F1).
**Instead of:** reusing at once on a reload reason (#80 as written) and relying on the rotation alone.
**Revisit if:** the delay of up to 2 s on every extension reload hurts the reload recipe or the E2E waves, or
a live run shows `onStartup` arriving more than 2 s after `onInstalled` on a Chrome start.
