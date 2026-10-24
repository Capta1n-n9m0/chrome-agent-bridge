# Step 9 S4 — prep fixer report, round 1

Fixer: Opus 5.5, 2026-10-24, from HEAD `e91e437`. Scope: `S4-prep-verifier.md` findings 1–11. No Chrome, no build, no
daemon, no bridge client, nothing on 9234; no product file touched. The only PowerShell run was a parse of
`recipes/s9-win.ps1` (0 errors, UTF-8 BOM kept) and an offline `Restore-S9All` with no wave globals set, which
touches no window (it printed `RESTORE safety: nothing to restore …`, `RESTORE ok …`, returned `True`; with
`$S9Found.Default = $false` it printed `not touched …`).

Checks: `npx tsc --noEmit -p recipes/tsconfig.s9.json` → exit 0. `npm test` → **Test Files 116 passed (116), Tests
2720 passed (2720)** (before: 2718 / 116; +2 tests in `recipes/test/s9-rules.test.ts`, none removed).

## Per finding

| # | Sev | Outcome | Where |
|---|---|---|---|
| 1 | MAJOR | **fixed** | `recipes/s9-win.ps1` new section "the restore (G9-1)": `Restore-S9All [-Why]` = `Restore-S9Safety` (refuses to touch Chrome if `Get-S9ChromeStart` changed since block 1; reopens O if gone; stored read; options switches `armed`/`evaluate` on, each pressed only if off; empty list saved only if the stored hash is not empty; read-back = stored read + `daemon.status` via `s9.ts wait-safety` + toolbar title) then `Restore-S9Desk` (unpin only if `$PinnedBefore -eq $false`, `$L0` back, D/O/E/W closed, window count = `$WinStart`). Idempotent (re-reads before every press); leaves the safety state untouched when no found state was read or block 8's guard tripped. `$false` = STOP that escalates. Wave sheet: a new stop rule under "Gates and stops" (record → `Restore-S9All` → rest of block 43 → `$false` escalates; Chrome restart and an options page that cannot be reopened included; what is not a stop listed); block 1 records `$S9ChromeStart`, block 4 `$L0`; block 40 calls `Restore-S9Safety`, block 43 `Restore-S9Desk`. §4.20 preamble states it. |
| 2 | MAJOR | **fixed** (verifier's third option) | Sheet block 32: after M's SAFE-5 leg, `s9-actor.ts end M` + new `s9.ts wait-alone --row SAFE-5` (polls `daemon.status` until this probe is the only client; exit 2 if not within 10 s). A fresh actor M2 is started at block 36 and serves SAFE-9 (block 37); block 43 ends M2 and extracts both transcripts. What the row checks is unchanged: M still claims the blocked `<T#c>` (claim granted, call refused, #136), and `snapC` still reads `<T#c>` through a new SDK client. §4.20 SAFE-5, SAFE-5d, SAFE-9 and the "Windows and tabs" preamble amended with dated notes. |
| 3 | MINOR | **fixed** | `Read-S9StoredState` (O → `about:blank` → a fresh options page, which fills from `storage.local` with `loadedList` null) and `Read-S9SafetyState` now waits (≤ 10 s) until `#safety-status` is rendered (options.ts leaves it empty until its first read). Block 33 (SAFE-5d) and the restore read back through it; both are cross-checked with `wait-safety --armed --evaluate --count` (block 33's `--count <found count>` placeholder became `--armed true --evaluate true --count 0`). |
| 4 | MINOR | **fixed** | `Test-S9FoundState` (block 8): stored read of O + `wait-safety --armed true --evaluate true --count 0 --timeout 3000`; anything else → `FOUND STATE differs …` → STOP before block 14. `-SaveTo` removed from `Read-S9SafetyState` and every `-FromFile` use of the found list removed from the sheet and §4.20, so the user's list is never copied (a non-default found state now stops before anything is changed). §4.20 SAFE-11 (start) and the preamble superseded in place. |
| 5 | MINOR | **fixed** | §4.20 SAFE-OPT-1, SAFE-5, SAFE-5d, SAFE-9, SAFE-11 (restore): `-Text "…"` → `-Lines @(…)` (OPT-1 carries the dated correction; the restore row now names `Restore-S9Safety`). |
| 6 | MINOR | **fixed** | `recipes/s9-rules.ts`: `isBridgeLogLine` matches `[bridge]` or `safety: ` anywhere in a row (grep of every `console.*` in `extension/src`: all `[bridge] …` except `badge.ts:183 console.log(toggleLogLine(r))`, whose `LOG_LINES` all start `safety: `); `consoleHits` also returns `pressLines`; `consoleVerdict` returns `notMeasured` (never a pass) when no `safety: disarmed by the user` line is present, a FAIL still wins. `s9.ts scan-file --mode console` prints `CHECK SAFE-10 scan-console NOT MEASURED — …` and exits 3. Two new tests (a prefixed row; empty / no-control captures and a leak). Mutation (run, then reverted): restoring the old `/^\s*(\[bridge\]|safety: )/` → `× consoleHits: a bridge line is recognised anywhere in the row …` (1 failed / 35); reverted → 35 passed. §4.20 SAFE-10 amended. |
| 7 | MINOR | **fixed** | §4.20 SAFE-7d lists the deviation from stage0-audit §7 with its reason (no coordinate click in the API; the locator click is refused at injection, before any debugger attach) and adds the card read: new `Get-S9CardEnabled` (our card's `enableToggle` by UIA, `on`/`off`/`not-found`), called before and after in sheet block 24. |
| 8 | NIT | **fixed** | §4.20 SAFE-5c: the `chunk` record says it does not show an empty store (an unknown id errors regardless). |
| 9 | NIT | **fixed** | `Get-S9Toggle` now checks the accessible name too (`Bridge on*` / `Allow JavaScript*`), so `Read-S9SafetyState` matches §4.20's "by AutomationId and name". |
| 10 | NIT | **not changed** (agreed fail-safe) | `Set-S9Pin` needs exactly one `Extensions` button; an ambiguous match throws before any press (a G9-2 stop). No cheap stronger anchor is known before the live smoke. |
| 11 | NIT | **fixed** | §4.20 SAFE-ACL-1's reason now names the DevTools context-picker route and puts it in SAFE-REL-2's class. |

No finding disputed; none needs a decision beyond the step agent's (proposed below).

## Proposed decisions (for the step agent)

### 2026-10-24 · S4: any stop runs one idempotent restore, and the wave toggles only from the default found state
**Decided:** `Restore-S9All` on any stop or helper throw from block 4; block 8 stops the wave before any toggle unless
the found state is armed + JavaScript on + an empty list (O stored read and `daemon.status`); the found list is never
saved. **Why:** S4-prep-verifier findings 1 and 4; the integrity floor's "safety state left different from the one
found". **Instead of:** restore only at block 40, and "whatever is found becomes the target" with a scratchpad copy
of the user's list. **Revisit if:** the found state is not the default (then the user rules how the wave runs).
**By:** Claude

### 2026-10-24 · S4: actor M ends after SAFE-5; M2 serves SAFE-9
**Decided:** as finding 2. **Why:** the MCP has no release tool and a lease dies only with its connection, so SAFE-5d's
SDK `snapC` on `<T#c>` would answer `TAB_HELD`. **Instead of:** a separate M tab on 8081 (would not test the claim of
an already-blocked tab) or reading `<T#c>` through M (would change the row's reporter). **Revisit if:** an MCP release
tool is added. **By:** Claude

## Files

`recipes/s9-win.ps1`, `recipes/s9.ts`, `recipes/s9-rules.ts`, `recipes/test/s9-rules.test.ts`, `docs/e2e-test-plan.md`
(§4.20 only), `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md`, this report, and the verifier's
`S4-prep-verifier.md` (committed with it).

## Handoff

Nothing running. The verifier re-checks findings 1–7 (and 9, 11). Still unmeasured live: every UIA assumption the
builder listed, plus two new ones — that `about:blank` typed into O's omnibox reads back as `about:blank` through the
RootWebArea value (`Set-S9Omnibox`'s wait), and that the extensions card exposes `enableToggle` with a Toggle pattern.
