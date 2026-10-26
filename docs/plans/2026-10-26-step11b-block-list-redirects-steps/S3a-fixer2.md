# Step 11b — S3a fixer 2 report (V2-M1 of `S3a-verifier2.md`)

Fixer: Opus 5.5, medium effort. Layer followed: the verifier-2 report (V2-M1 and its suggested shape), the phase doc's
STOP rule ("a covered call that proceeds after its rules failed") and #301 (b). Not committed. The extension was not
reloaded and the daemon was not started. `journal.md` was not touched.

## 1. Verdict

**DONE.** V2-M1 is fixed in the shape the verifier suggested. It is not disputed.

## 2. The change

`extension/src/safety-dnr-keeper.ts`, `rebuild`'s catch. On a `DnrTimeout`, the new ids are no longer orphaned. Each
live call's share of them (`ids[i]`) goes into that call's `ids`, next to its old ids, and its counts become old + new.
The summed counts are the conservative choice against the caps. The ids then leave only at that call's own release.
The orphan list now gets ids only from a timed-out **install**, and an install that times out is refused before its
effect, so M1's release-time removal of orphans cannot strip a running call's rules. A rejected (not timed-out) rebuild
is unchanged, because Chrome applied nothing. The next successful rebuild removes every live id, old and new together,
since it builds `removeRuleIds` from `l.ids`. The header comment now says which ids are orphans and which join a call.
About 10 lines of source changed.

## 3. Test (red without the fix)

`extension/test/safety-dnr-keeper.test.ts`: "V2-M1: a timed-out rebuild that lands late keeps each live call's new
rules until that call's own release". It is adapted from the verifier's probe. Calls A and B are live on tabs 1 and 2,
a rebuild to LIST_B hangs past the 20 ms bound, and then Chrome applies it. The test asserts that tab 2 still has its
one rule after A's release and after `sweep()`. It also asserts that `b.holding()` is true, that `b.refusal()` is the
state-unreadable refusal, and that the fake holds 0 rules after B's release. The test is about 24 lines.

Red proof: `catch` reverted to the pre-fix line (`this.addOrphans(addRules.map(...), sum(...))`) in the main tree,
then restored from a scratchpad copy (`cmp` equal):
`× … V2-M1: … → expected +0 to be 1` · `Tests 1 failed | 30 passed (31)`.

## 4. Checks (main tree, after the fix)

- `npm run typecheck` → exit 0.
- `npm test` → `Test Files 160 passed (160)`, `Tests 4135 passed (4135)`, exit 0. The count before was 4134/160. One
  test was added, and every existing keeper test passes unchanged.
- `npm run build` → `built extension → dist/`, exit 0.
- **D3.3** `git diff ecd254f --stat -- daemon shared sdk mcp` → empty.
- **D3.5** `git diff ecd254f -- extension/src | grep -c '^+.*console\.'` → `0`. No log line was added.

## 5. Findings

- None new. The ordering note from fix round 1 (a timed-out update that Chrome applies after a later one) is unchanged.
  It is still an unmeasured assumption.

## 6. Handoff

Files touched: `extension/src/safety-dnr-keeper.ts`, `extension/test/safety-dnr-keeper.test.ts`, and this report.
Nothing is left running. A fresh verifier should re-check V2-M1 only.
