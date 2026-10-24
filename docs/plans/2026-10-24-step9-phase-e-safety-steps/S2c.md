# S2c — Fix: a failed re-arm write; the badge's narrow read (Step 9) — step report

Written 2026-10-24 by the S2c step agent (Opus 5.5). Ordered by decisions.md · 2026-10-24 · A fix stage S2c before
S4: a failed re-arm write leaves memory disarmed; the badge reads only the safety keys (#189). Ledger: `S2c.ledger.md`;
sub-reports `S2c-builder.md`, `S2c-verifier.md` (with "Round 2 re-check"), `S2c-fixer1.md`; briefs in `briefs/S2c-*.md`.

## 1. Verdict

**PASS-with-notes** (verifier, after one fix round). Both defects fixed with failing-first tests; behaviour unchanged
on every path where writes succeed. Test count **2660 / 113 files → 2685 / 115 files** (`npm test`, clean worktree of
9a5366c + the changes, verifier round 2; matches the fixer's run). `npm run typecheck` 0; `npm run build` 0, no tracked
file changed but the two sources.

## 2. Outputs

- `extension/src/safety-state.ts` — `toggleOnce`'s arm branch: on a rejected write, memory's `armed` returns to false
  (other fields as they now are in memory), `onDisarm` fires, `lastDisarmAt` is not moved (a `"revert"` source), and
  the rejection is rethrown (#174) — unless a `storage.onChanged` that touched the `armed` key landed after the toggle's
  apply (`applyChanges` counts such changes). An unreadable copy stays unreadable. Adds `readStoredArmed(get)`, which
  asks `get` for exactly `SAFETY_KEY_NAMES`.
- `extension/src/sw.ts` — only the badge glue: `storedArmed: () => readStoredArmed((k) => chrome.storage.local.get([...k]))`
  and its import. `storage.local.get(null)` is gone; `sw.ts` names no safety key.
- `extension/test/safety-rearm-failure.test.ts` (new) — the rejected re-arm: memory / `ingestView()` / `read()` disarmed,
  `onDisarm` fired, a retry past the guard arms, the guard still measured from the human's disarm, a newer `armed`
  change stands, the verifier's interleavings (block-list-only and JavaScript-only change during the pending write),
  and one case through the real network-ingest path (an event after the failed re-arm is dropped as disarmed).
- `extension/test/badge-stored-read.test.ts` (new) — a spy test that the read asks exactly the safety keys; a structural
  check of `sw.ts` (no key-less/`null`/`undefined`/cast `get`; `storedArmed` pinned to forwarding exactly its keys; any
  other `storage.local.get` names literal non-safety keys).

## 3. Verifier verdict

Round 1: PASS-with-notes, E1–E6 PASS, 11/13 mutations caught; **F1 (MINOR)** — the revert's identity check was fooled
by an `applyChanges` of another key, which carried the unsaved `armed: true` forward (reproduced); **F2 (NIT)** — the
static check missed `get(undefined as any)` and extra keys. Fixer round 1 fixed both. Round 2: **PASS** — 2685 / 115;
the original probe and seven attack interleavings correct; new F1 tests fail on the builder's version (2/25) and on HEAD
(11/25), pass 25/25; counter mutations caught except one equivalent mutant; F2 mutations (`null`, `undefined as any`,
`["token", ...keys]`, an alias, a cast) all fail the static tests; `git diff extension/test` empty (only the two new
files). Exit criteria E1–E6 (pre-registered in `briefs/S2c-builder.md`): all PASS.

## 4. Deviations

1. **The helper lives in `safety-state.ts`, not `badge.ts`; `badge.ts` untouched.** The brief's lane named the badge
   module, but the read was in `sw.ts`'s badge glue, and `safety-writers.test.ts` (must pass unchanged) allows the
   safety key names only in `safety-state.ts` and `options.ts`. Step agent's D1 granted the one `sw.ts` expression plus
   its import. Mechanical; inside the lane's files.
2. **D2 amended after F1:** "revert only if memory is still the toggle's object" → "revert unless a change touching
   `armed` landed after the apply".

## 5. Proposed decisions

### 2026-10-24 · S2c: a rejected re-arm write returns memory to disarmed without counting as a disarm
**Decided:** on a rejected arm write, memory's `armed` returns to false (other fields as they now are), `onDisarm`
fires, `lastDisarmAt` is not moved, the rejection is rethrown; skipped only when a `storage.onChanged` touching `armed`
landed after the toggle's apply; an unreadable copy stays unreadable. **Why:** #174/#189 — memory is never re-armed by
a failed write and nothing is recorded while storage says OFF; the human did not disarm, so the 1 s guard keeps
measuring from the real disarm and the next press retries. Object identity was not enough (verifier F1: a block-list
or JavaScript change merges over memory and carries the unsaved `armed: true`). **Instead of:** an identity check;
reverting unconditionally (overwrites a newer stored `armed`); reverting as a `"toggle"` (moves the guard, so a quick
retry is "ignored"); applying memory only after the write (changes the success path's order). **Revisit if:** the gate
ever arms from memory rather than storage. **By:** Claude

### 2026-10-24 · S2c: the badge's stored read is `readStoredArmed` in `safety-state.ts`
**Decided:** `readStoredArmed(get)` asks exactly `SAFETY_KEY_NAMES`; `sw.ts` forwards the keys to
`chrome.storage.local.get`. *Supersedes #183's `get(null)`.* **Why:** #189; the writers test pins the key names to
`safety-state.ts`/`options.ts`. **Instead of:** a `badge.ts` helper (fails the unchanged writers test); widening the
writers test's allowlist (edits an existing test). **Revisit if:** the writers test's allowlist is reopened. **By:** Claude

## 6. Findings

1. **R2-N1 (NIT, existing on HEAD):** an `armed: false` `onChanged` arriving before the first load sets `lastDisarmAt`;
   it only delays a re-arm by ≤ 1 s. Not fixed (fail-safe direction).
2. **R2-N2 (NIT):** a late `armed` event counts as authoritative for the revert; the state converges to storage.
3. The static check does not trace aliases (`const a = chrome.storage.local; a.get(null)`); `sw.ts` has none today
   (verifier confirmed an alias mutation is caught by the other static test).
4. `network-state.ts:50` reads `chrome.storage.session.get(null)` — the session area, which holds no token; outside
   #189's scope, left.
5. Still unproducible live: both failed-write paths need `storage.local.set` to fail — unit-tested only (as S2b §7 row 7).
6. No new runtime gotcha (no live run).

## 7. Handoff

Nothing running; no PIDs; 9234 never bound. Committed as one commit (below). S4 may proceed on committed code; S2b's
S4 UI rows are unaffected (success paths unchanged; the rejected-arm title per #181/#182 still applies).
