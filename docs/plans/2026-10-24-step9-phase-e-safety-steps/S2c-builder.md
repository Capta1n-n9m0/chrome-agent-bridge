# S2c — builder report ("Fix: failed re-arm write; narrow badge read", Step 9)

Builder: Opus 5.5, 2026-10-24. Brief: `briefs/S2c-builder.md`. No agents spawned, nothing committed, no Chrome, no
daemon, 9234 never bound.

## Baseline (HEAD `9a5366c`, re-run before any edit)
- `npm test`: **2660 passed, 113 files**.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; `git status --short` afterwards showed only the two untracked S2c docs (ledger, brief).

## Files changed
- `extension/src/safety-state.ts` — `toggleOnce`'s arm branch: on a rejected write, if `this.mem` is still the
  object this toggle applied, `apply({...current, armed:false}, "revert")` then rethrow; `apply` gains the source
  `"revert"`, which (like `"load"`) does not move `lastDisarmAt`; `onDisarm` still fires on the transition. New
  export `readStoredArmed(get)` (asks `get(SAFETY_KEY_NAMES)`, returns `parseStoredSafety(raw).armed`). Header
  comment: one sentence on the revert.
- `extension/src/sw.ts` — only the import line (`parseStoredSafety` → `readStoredArmed`) and the `storedArmed`
  expression: `storedArmed: () => readStoredArmed((keys) => chrome.storage.local.get([...keys]))`.
- `extension/test/safety-rearm-failure.test.ts` (new, 7 tests) — the failed re-arm and the real ingest path.
- `extension/test/badge-stored-read.test.ts` (new, 3 tests) — the spy test on `get`'s argument and the static
  check (TypeScript AST over `extension/src`: no `chrome.storage.local.get(null)`, `get(undefined)` or `get()`).

No existing test file was edited (`git status`: only the two new test files are untracked under `extension/test`).

## Failing first (on 9a5366c's source, new tests only)
Command: `npx vitest run extension/test/safety-rearm-failure.test.ts extension/test/badge-stored-read.test.ts`
(full output kept at the scratchpad, not committed). Result: **8 failed | 2 passed (10)**, exit 1. Key lines:
- `the toggle rejects; memory, ingestView() and read() say disarmed …` → `expected { armed: true, … } to match
  object { armed: false, … }`
- `the other fields survive the revert …` → `expected { armed: true, evaluate: false, … } to deeply equal { armed:
  false, … }`
- `the next press right after the failure is a retry …` → `expected 'disarmed' to be 'armed'` (the defect: the
  next press disarms instead of retrying)
- `after a worker-start load of a disarmed state, a failed arm then a retry arms` → `expected 'disarmed' to be 'armed'`
- `an event after the failed re-arm is dropped as disarmed …` (real `NetworkIngestGate` + `NetworkLog`) →
  `expected [ { id: 'r1', tabId: 5, … } ] to have a length of +0 but got 1` (the log recorded while storage says OFF)
- `readStoredArmed …` (2 tests) → `TypeError: readStoredArmed is not a function` — honestly: these fail because
  the export is missing on HEAD, not by a spy assertion.
- `static — no whole-area storage.local read` → `expected [ 'sw.ts:366' ] to deeply equal []`

The 2 that pass on HEAD are limit guards, not defect tests: "a storage change that landed while the arm write was
pending stands" (HEAD never reverts, so it trivially holds) and "a press within 1 000 ms of the human's real
disarm is ignored, not attempted". Both were shown discriminating by mutation of the fix (below).

After the fix: same command → **10 passed (10)**.

Mutations of the fix (each applied to the fixed file, run, then restored; `git diff --stat` identical after):
- M1, revert without the `this.mem === applied` check → 1 failed ("a storage change … stands").
- M2, the revert moves `lastDisarmAt` (`"revert"` dropped from the exemption) → 3 failed (the retry test, the
  worker-start retry, the ingest test's retry).

## Hunt — every path that updates a copy before a write
| Path | Verdict |
|---|---|
| `SafetyStore.toggleOnce`, arm branch | **Defect, fixed** (above). |
| `toggleOnce`, armed → disarm branch (`apply` disarmed, then `writeDisarm`) | Correct per #174: failure leaves memory disarmed (fails closed), retried once, `"write-failed"`. Covered by existing `s2a-fixer1.test.ts` "finding 4" (4 tests), passing unchanged. |
| `toggleOnce`, unreadable branch | Same as the disarm branch (memory `unreadable` = disarmed view); existing test "an unreadable state's disarm write gets the same retry and outcome" passes. |
| `toggleOnce`, `mem === null` load before the toggle | Only a read, no write; not affected. |
| `options.ts` `save()` → `writeSafety` (armed, evaluate, blockList) | **No defect.** The page holds no memory copy that drives the gate: the checkbox's `checked` is the browser's own UI state; on a rejected write `save` shows the error and `refreshSafety()` re-renders from storage; `loadedList` moves only after a successful save. The worker learns only through `storage.onChanged`, which a rejected write never fires. Not edited. |
| `options.ts` port/token save | Not safety state; out of scope. |
| `sw.ts` session-marker write (`storage.session` + `storage.local` `{[MARKER_KEY]}`) | Not safety state; nothing gated reads a marker copy. |
| `network-state.ts` flush to `storage.session` | Network log persistence; memory is the source of truth by design (CLAUDE.md gotcha); not safety state. |

Grep used: `grep -rn "deps\.set\|storage\.local\.set\|writeSafety\|storage\.\(local\|session\)\.get" extension/src`.

## After
- `npm test`: **2670 passed, 115 files** (2660 + 10 new; +2 files).
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; `git status --short`: ` M extension/src/safety-state.ts`, ` M extension/src/sw.ts`, the
  two new test files and the two S2c docs (untracked); `dist/` is not tracked.
- `dist/content.js` begins `"use strict"; (() => {`, and `grep -cE "^\s*(import|export)\b"` on it = 0.

## Exit criteria
- **E1 PASS** — 8/10 new tests fail on 9a5366c's source (the 2 limit guards pass there and are proven by M1/M2);
  10/10 pass after. Command and lines above.
- **E2 PASS** — every existing test passes; no existing test file modified.
- **E3 PASS** — content bundle IIFE with 0 `import`/`export` lines; `sw-static.test.ts` (no top-level `await`,
  listener placement) passes unchanged; the `sw.ts` edit is an arrow-function body inside the existing
  `new BadgeController({…})` literal, no new listener, no `await`.
- **E4 PASS** — `log-scan`, `log-sentinel`, `safety-writers`, `sw-static`, `safety-state`, `badge`,
  `safety-network`: 7 files, 140 tests passed.
- **E5 PASS** — typecheck 0; build 0; only the two source files modified among tracked files.
- **E6 PASS** — 2660 → 2670 (+10, all new).

## Deviation
- **The helper lives in `safety-state.ts`, not `badge.ts`** (brief/D1 named `badge.ts`). `safety-writers.test.ts`
  (which must pass unchanged) allows `SAFETY_KEY_NAMES` only in `safety-state.ts` and `options.ts`
  (`IDENT_ALLOWED`), so a `badge.ts` helper naming the keys would fail it, and passing the keys from `sw.ts` is
  forbidden too. `safety-state.ts` is in lane and is the module that owns the key names. Intent of D1 kept: a
  helper taking `get(keys)`, asking exactly `SAFETY_KEY_NAMES`, `sw.ts` naming no key. `badge.ts` is unchanged.

## Proposed decisions
- **2026-10-24 · A rejected re-arm write reverts memory without counting as a disarm.** Decided: in `toggleOnce`,
  on a rejected arm write, `apply({...current, armed:false}, "revert")` only when `this.mem` is still the object
  the toggle applied; `"revert"` fires `onDisarm` but does not set `lastDisarmAt`; the rejection is rethrown.
  Why: memory armed while storage says OFF let the network log record while disarmed (0.3) and made the next press
  disarm; the human did not disarm, so the guard must keep measuring from the real disarm. Instead of: reverting
  unconditionally (would overwrite a newer `storage.onChanged` state, M1); reverting through `"toggle"` (would
  move the guard, so a quick retry would be "ignored", M2); applying memory only after the write (changes #144's
  "memory before the write" ordering on the success path). Revisit if: a disarm must also be treated as
  "the human's" for the guard after a failed arm, or the gate reads memory for arming.
- **2026-10-24 · The badge's stored read is `readStoredArmed` in `safety-state.ts`.** Decided as in Deviation.
  Why: the writers test pins the key names to `safety-state.ts`/`options.ts`. Instead of: a `badge.ts` helper
  (fails the writers test) or widening `IDENT_ALLOWED` (edits an existing test's expectations). Revisit if: the
  writers test's allow-list is reopened.

## Findings
- F1: The static check is scoped to `chrome.storage.local.get`; `network-state.ts:50` has
  `chrome.storage.session.get(null)` (the network log's own blob in the session area, which holds no token). Left
  as is, outside the lane and #183's scope; noted for the verifier.
- F2: With the fix, after a failed arm the badge still shows `arm-failed` OFF (#181/#182 unchanged): `press`
  catches the rejection → `"arm-failed"`, and the refresh's read now says disarmed from memory as well as storage.
- Nothing left unfinished. No escalation.
