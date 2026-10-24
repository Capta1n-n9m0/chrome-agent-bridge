# S2c ledger — "Fix: failed re-arm write; narrow badge read" (Step 9)

Step agent: Opus 5.5. Brief: session agent's S2c STEP BRIEF (decisions.md #189). Baseline HEAD 9a5366c; 2660 tests / 113 files; typecheck 0; build 0. Nothing running; 9234 never bound.

## Step-agent decisions (stage-local, before measurement)
- D1 lane gap (mechanical): the badge's `storage.local.get(null)` is in `extension/src/sw.ts` (badge glue, `storedArmed`, ~line 366), not in `badge.ts`. Granted: the builder may change only that `storedArmed` expression in `sw.ts` (plus an import), moving the read into `badge.ts` (a helper taking a `get(keys)` function and asking `SAFETY_KEY_NAMES` only); `sw.ts` names no safety key (writers test unchanged). Recorded as a deviation.
- D2 restore rule: on a rejected arm write, if the memory copy is still the one the toggle applied, it returns to disarmed (same other fields) through `apply(..., "toggle")`-equivalent so `onDisarm` fires (fail closed: detach/clear anything begun in the window), but `lastDisarmAt` is NOT moved (the human did not disarm; the next press ≥ … is a retry, not "ignored" by a fake disarm time). If a storage change replaced the memory copy meanwhile, the newer state stands. The rejection still propagates (#174: a failed arm rejects).

## Substeps
- [x] 1 builder — done: 2660/113 → 2670/115; E1–E6 PASS (claims); helper `readStoredArmed` in safety-state.ts (writers test allows key names only there), badge.ts untouched; files: safety-state.ts, sw.ts, 2 new tests. Report S2c-builder.md
- [x] 2 verifier — PASS-with-notes; F1 MINOR (applyChanges of another key carries the unsaved armed:true forward → identity check skips revert; reproduced), F2 NIT (static check misses extra keys/undefined in sw.ts). Decision: fix both in fixer r1 (F1 breaks #174/#189 letter).
- [x] 3 fixer r1 — done: F1 fixed (armed-touch counter in applyChanges; revert unless a change touched `armed` after the apply), F2 static check structural; 2670 → 2685/115; claims E1–E6 PASS. Report S2c-fixer1.md. Verifier re-check spawned (F1, F2 only).
- [x] 4 report S2c.md — verifier round 2 PASS; stage verdict PASS-with-notes (NITs R2-N1, R2-N2)
- [~] 5 commit via builder — spawned

CLOSING: S2c closed 2026-10-24 — verifier PASS-with-notes (r1 F1 MINOR, F2 NIT fixed in fixer r1; r2 PASS); 2660/113 → 2685/115; typecheck 0, build 0; commit "fix(extension): S2c — … (verifier: PASS-with-notes)"; nothing running, 9234 never bound.
