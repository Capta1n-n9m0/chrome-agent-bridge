# S3 — fixer round 1

2026-10-24 · fixer, Claude Opus 5.5 (`claude-opus-5-5`) · tree: HEAD `a3ec4f5` plus S3's uncommitted work
(and S1's concurrent extension edits, untouched). Scope: verifier finding 5 only. Nothing committed.

## Finding 5 — fixed

> **5. NIT — a stale `listTabs` reply can repopulate a just-cleared cache.** (verbatim in `S3-verifier.md` §5)

**Fix** (`daemon/src/intercept.ts` only):
- New field `safetyGen` (number, starts 0), incremented in `onSafetyState` when the state changes (after
  the `sameSafety` early return, so an identical repeat bumps nothing), before the refresh `listTabs` is sent.
- `record(result, gen)` takes the generation read when the request was sent; `fresh = gen === safetyGen`.
  A stale reply still mints handles and still clears `hidden: "blocked"` rows (`forgetPage`); it skips only
  `handles.note(url/title)`.
- Every `record` caller captures `safetyGen` before its `listTabs` request: `resync`, `refreshAfterSafety`,
  `fillUrl` (per poll), `humanTab`, the client-forwarded `listTabs`.
- Untouched: the reply forwarded to the client; the resync's gone-marking; `fillUrl`'s `present`/`hidden`
  logic. With no safety change, `gen === safetyGen` always holds, so behaviour is identical to before.

**Test** (`daemon/test/safety.test.ts`, new case "a listTabs reply requested before a safety change notes no
url/title, even when it arrives after the refresh (S3 finding 5)"): the fake extension holds `listTabs`; a
client's `listTabs` is sent, then a pattern is added (`blockedCount: 1`, tab 2 hidden "blocked"); the
refresh is answered first, then the stale reply (with tab 2's url and a new tab 3). Asserts: the client's
reply still carries tab 2's url (forwarded unchanged); `daemon.status` serves no url for tab 2; tab 3 got a
handle (bookkeeping kept) but no url. **Fails without the fix**: `expected { tab: 'T2', tabId: 2, …(1) } to
not have property "url"` — Received `"http://fixture.test/two"` (run before the edit to `intercept.ts`).

## Checks

| Check | Result |
|---|---|
| `npx tsc --noEmit -p daemon/tsconfig.json` / `sdk` / `mcp` | exit 0, exit 0, exit 0 |
| `npx vitest run daemon sdk mcp` | 844 passed, 49 files (one more than before: the new case) |
| `npm test` (full, S1's work in the tree) | 2329 passed, 96 files, 0 failed |
| `npm run build` | exit 0 |
| existing tests | none modified |

## Observation (not fixed, out of scope)

`fillUrl` still copies a stale reply's `url` into the held popup's `leaseGranted.url` (the event, not the
cache). It needs a safety change landing inside the ≤ 2 s url fill *and* an out-of-order reply; the brief
limited the fix to cache noting. If wanted, the same `fresh` test can guard `g.url = tab.url`.

## Proposed decisions

- **2026-10-24 · A `listTabs` reply requested before a safety change notes no url/title in the daemon's
  cache.** By: Claude (S3 fixer r1). The tab layer keeps a generation counter bumped on every safety-state
  change; a reply whose request predates the latest change still mints handles and clears "blocked" rows,
  but its urls/titles are not noted, so an out-of-order reply cannot undo the change's refresh (S3 verifier
  finding 5). Rejected: recording replies only after the refresh settles (more state, same effect).
  Revisit if: a cache url is found missing after a safety change for longer than one refresh round trip.
