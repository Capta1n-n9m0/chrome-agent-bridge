# S2c — fixer round 1 brief (Step 9, stage S2c)

Written 2026-10-24 by the S2c step agent. Read `CLAUDE.md`, `briefs/common.md` (binds in full; its ESCALATION list,
LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR and STOP rules bind you verbatim), `.claude/skills/step-agent/
role-prompts.md` (Common preamble + §Fixer), `briefs/S2c-builder.md` (goal, LANE, exit criteria E1–E6 — unchanged),
`S2c-builder.md`, and `S2c-verifier.md` (findings F1, F2 — re-run its probe to see F1 yourself first).

Level-2: no agents, no commit, no real Chrome / daemon / 9234. Node first:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

## Fix
F1 (MINOR, fix it): the revert after a rejected arm write must not depend on object identity. `applyChanges` merges a
storage change over the memory copy, so a change to only `evaluate`/`blockList` during the pending arm write carries
the unsaved `armed: true` forward and the revert is skipped — memory armed by a failed write (#174, #189). Rule (step
agent, decision D2 amended): after a rejected arm write, memory's `armed` returns to false (other fields as they are
now in memory, so the newer block list / evaluate stand), `onDisarm` fires on that transition, `lastDisarmAt` is not
moved — UNLESS a storage change that touched the `armed` key landed after this toggle's apply (then storage itself
spoke about `armed` and the memory copy already reflects it). An unreadable memory copy stays unreadable. Failing test
first (the verifier's interleaving: arm write pending → `applyChanges` touching only blockList (and one with only
evaluate) → write rejects → memory/ingestView/read disarmed, next toggle past the guard returns "armed"); keep the
existing "newer armed change stands" test passing (adapt nothing in its expected values; if it no longer models
"touched armed", add a test that does, and say so).
F2 (NIT, tighten): the static check in `extension/test/badge-stored-read.test.ts` should also fail when `sw.ts`'s
`storedArmed` passes anything but the keys it is given (`[...keys]`) — e.g. assert the `storedArmed` glue text calls
`readStoredArmed` with a function forwarding exactly its `keys` argument, and that no `storage.local.get(` in `sw.ts`
is key-less, `null`, `undefined`, or contains a safety-key read besides that glue. Show the mutations
`get(undefined as any)` and `get(["token", ...keys])` now fail it.

Lane, exit criteria and the "existing tests pass unchanged" rule as in the builder brief. Report
`docs/plans/2026-10-24-step9-phase-e-safety-steps/S2c-fixer1.md`: failing-first evidence, diff summary, E1–E6
re-run with numbers (test count before → after), mutation results for F1/F2. Return ≤ 15 lines.
