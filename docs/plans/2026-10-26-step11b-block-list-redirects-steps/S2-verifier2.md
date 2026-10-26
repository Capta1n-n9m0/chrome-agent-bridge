# Step 11b S2 — the DNR rule keeper, pure · verifier report, round 2

**Date:** 2026-10-26 · **Role:** verifier, round 2 (`docs/agent-rules.md` §6) · **Model / effort:** Opus 5.5, medium ·
**Scope:** only the items the fix round touched: V1 (docs), V4 and V5 of `S2-verifier.md`, plus regressions in D2.1–D2.4
and the required mutants. **Tree:** HEAD `8d07a89` + the uncommitted `extension/src/safety-dnr-keeper.ts` (sha256
`e7eecded64d2…`) and `extension/test/safety-dnr-keeper.test.ts` (sha256 `23ad9ce89444…`); `journal.md` changed by
someone else, ignored. **Read:** agent-rules §6, §7, §9; phase doc exit checks D2.1–D2.4 and the STOP rules;
`S2-verifier.md`; the claims in `S2-fixer.md`; the whole module and the new tests.
**Evidence** (scratchpad, not committed), in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\evidence\`:
`s2v2-mutants.txt` (script `..\r2-mutants.mjs`), `s2v2-probe.txt` (script `..\r2-probe.mjs`), `s2v2-prefix.txt`,
`s2v2-module-diff.txt`, `s2v2-tc.log`, `s2v2-test.log`, `s2v2-build.log`.

## 1. Verdict

**PASS-with-notes.** V1, V4 and V5 are fixed as claimed. Each new test is red without its fix. D2.1–D2.4 and every
required mutant are still red. One MINOR test gap is left: no test checks that a rejected install keeps the orphans
(R1 below). The code is correct there, and a probe shows it.

## 2. Outputs (numbers from commands I ran)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | `Test Files 159 passed (159)` · `Tests 4111 passed (4111)` |
| Delta | against 4109/159 before the fix and 4087/158 at HEAD | +2 (the V4 and V5 tests); no test removed: the diff of the test file against the round-1 copy (`scratchpad\orig\`, sha256 `2647d3fbb8a6…`, as in `S2-verifier.md`) has 28 insertions and 0 deletions |
| Build | `npm run build` | exit 0 (`built extension → dist/`) |
| Fix scope | `git diff --no-index` against the round-1 module (sha256 `1b6b1aeb86dd…`) | +11 −4: the header (2 bullets), two `DnrCall` doc comments, and `installFor`'s update and `dropOrphans()`. Nothing else changed |
| Tree after | `git status --short`; `git diff --stat` | ` M …/journal.md` (+1, pre-existing), `?? S2-builder.md`, `?? S2-fixer.md`, `?? S2-verifier.md`, `?? safety-dnr-keeper.ts`, `?? safety-dnr-keeper.test.ts`. The module's hash after every mutant and probe run was the same as before (`restored: true`), and the scratch probe test was removed |

**New tests red without their fix.**
- **V4.** I ran the current test file against the round-1 module (copied in from the scratchpad, then restored).
  Result: `× disarm and orphans > V4: …`, `Tests 1 failed | 21 passed (22)`. Mutant R4a (only the orphans dropped from
  the install's update) failed that same test and no other.
- **V5.** On the round-1 module the V5 test passes, because the guarded line was already there; it is a pin test.
  Mutant R5 removes `if (h.released) throw refused();`, and then exactly `× V5: an install after its call's release`
  fails (`Tests 1 failed | 21 passed (22)`). Round-1 M3d survived; it is now killed.

**No regression: the required mutants are still red** (`s2v2-mutants.txt`).
- **An update error swallowed at install:** M1 (`.catch` at the call) and M1b (record no ids and resolve) each turn
  D2.2 and D2.1's "never reaches the wire with Chrome's text" red.
- **An update error swallowed at rebuild:** M2 (the catch made a no-op) and M2e (`.catch` at the call) each turn D2.3
  red.
- **A fake that counts rules shows none left:** M3 (release removes nothing) fails 15 tests and M3b (it removes only
  the orphans) fails 15. Those include D2.4 and the paths in D2.1. M3c (a rejected removal is not kept as an orphan)
  fails the sweep test and the V4 test.
- **Also still red:** M2f, M4, M12.

## 3. Verifier verdict

This report (PASS-with-notes).

## 4. Deviations

None.

## 5. Proposed decisions

None.

## 6. Findings

**V1 (docs): confirmed.** There is a new header bullet, "Order at the post-check" (`safety-dnr-keeper.ts:22-23`). The
doc comments on `DnrCall.refusal()` (`:65-69`) and `DnrCall.release()` (`:70`) say the same thing. They match the code:
`release` goes through `enqueue` behind any rebuild that is already queued (`:189-190`, `:246-250`), and `refuseLive`
sets the flag only on calls that are still live. There is no code change, as the fixer said; S3a still owns the
wiring.

**V4: confirmed.** `installFor` now sends `update([...this.orphans], rules)` (`:179`) and calls `dropOrphans()` only
after the update resolves (`:183`). Because the update is atomic, a rejection leaves the orphans in place. The caps
check already counts `orphanCounts` (`:175`). Every update the keeper sends now retries the orphans: install, release
(`:196`), rebuild (`:127`), sweep (`:154`) and the clear (`:209-211`). The header (`:24-26`) now says so.

**R1 · MINOR · tests: no test checks that orphans are cleared only when the update succeeds.** Two mutants survive:
- R4b: the install drops the orphans in its catch.
- R4c: the install drops the orphans before its update.

In both, the next sweep makes no API call and the orphan rule stays in Chrome. That is the STOP rule's "rule left
installed after its call ended". A probe in `s2v2-probe.txt` shows it: release rejected, then an install rejected,
then `sweep()`. It printed `real: P-R4 rules left after sweep: 0`, `R4b: … 1` and `R4c: … 1`. The code is correct
today. A future edit could break this and no test would notice.
**Fix (an S2 fixer or S3a):** add the probe as a test. A release whose removal is rejected, then an install whose
update is rejected, then `sweep()` (or a later good install): expect 0 rules and the orphan ids in the last update.

**R2 · NIT: R4d survives** (the `dropOrphans()` after a successful install is removed). This is close to harmless: the
removed ids are sent again, and Chrome ignores unknown removal ids. The only effect is that `orphanCounts` stays
counted against the caps until the next release or sweep, which is conservative. A one-line assertion on
`fake.updates` in the V4 test, after `next.release()`, would pin it.

**V5: confirmed.** See §2. The test checks the refusal (`expectUnreadable`), 0 rules, and no update that adds rules.

No new runtime fact (no live run).

## 7. Handoff

- The step agent decides R1: send a fix round now (this would be round 2 of the two allowed), or pass it to S3a with
  V2, V3, V6, V7 and V8 from `S2-verifier.md`.
- The tree is as I found it: only the S2 files, the S2 reports and the pre-existing `journal.md` change. No process was
  left running.
