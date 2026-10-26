# Step 11b — S3a verifier 3 report (re-check of V2-M1 after fix round 2)

Verifier: Opus 5.5, medium effort. Read and run only; no tracked file edited. Start commit `ecd254f`. Audited: the
uncommitted tree after `S3a-fixer2.md` (`journal.md` ignored). Layer followed: the phase doc (0.5, exit checks, STOP
rules) as amended by #295, #296, #301; `S3a-verifier2.md` §4 for the finding.

## 1. Verdict

**PASS.** V2-M1 is fixed in the suggested shape. The new test fails without the fix, M1 still holds, and there is no
regression. No new finding. One unmeasured assumption carries over unchanged: Chrome applies one extension's
`updateSessionRules` calls in the order they were sent (§5). It is not new and not a finding.

## 2. Re-run results (main tree)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | `Test Files 160 passed (160)`, `Tests 4135 passed (4135)` |
| `npm run build` | `built extension → dist/`, exit 0 |
| Count | 4134 (verifier 2) + 1 (the V2-M1 keeper test) = 4135 ✓; 160 files, none added or removed |
| D3.3 | `git diff ecd254f --stat -- daemon shared sdk mcp \| wc -l` → `0` |
| D3.5 | `git diff ecd254f -- extension/src \| grep -c '^+.*console\.'` → `0`; `extension/test/log-allowlist.ts` has no diff → **+0** log lines |
| Tree | `git status --short` = 16 lines: verifier 2's 14 plus `S3a-fixer2.md` and `S3a-verifier2.md`; the build added nothing |

## 3. The fix

`extension/src/safety-dnr-keeper.ts:158–168`. On a `DnrTimeout` in `rebuild`, each live call's entry becomes
`{ids: [...old, ...ids[i]], counts: old + next[i]}`. Nothing goes to the orphan list. A rejected (not timed-out)
rebuild is unchanged. `ids[i]` exists for every entry at that point: `DnrTimeout` can only come from
`this.update(...)`, which runs after the loop has filled `ids`. A `caps` or `ids` throw happens before the update and
is not a `DnrTimeout`. The header comment (`:28–32`) matches.

**Fails without the fix.** A scratch worktree at `ecd254f` with its own `npm ci` and the eight stage files copied in.
The catch was reverted to the pre-fix orphaning line (`this.addOrphans(addRules.map((r) => r.id), sum(next.map(...)))`).
The suite was the keeper, wiring and probe files:
`× … V2-M1: a timed-out rebuild that lands late keeps each live call's new rules … → expected +0 to be 1`, and probe P2
(below) red too. The file was then restored (`cmp` equal to the main tree).

## 4. Attacks (probe file `…/scratchpad/v3-probe3.test.ts`, 5 probes, all pass on the fixed tree)

The fake is the keeper test's `FakeDnr`. Like Chrome's API reference, it ignores a `removeRuleIds` entry that is not
installed.

| Probe | Output (fixed tree) | Meaning |
|---|---|---|
| P1: a rebuild times out and **never lands**; B releases | `remove [1,2,3,4] rules 0 synced true` | The release sends B's old ids plus the never-applied new id. The unknown id does not make the release fail, so nothing is orphaned. The keeper re-syncs when idle. |
| P2: **two** timed-out rebuilds, both land; then A releases and a sweep runs | `tab2 after land 3 · tab2 after A+sweep 3 tab1 0`; after B releases, 0 rules | B keeps all three generations of ids. Neither another call's release nor a disarm sweep strips B's rules. B's own release removes them. (With the fix reverted: `tab2 after A+sweep 0`.) |
| P3: a timed-out rebuild lands, then a rebuild **succeeds** | `synced true tab2 3 refusal DISARMED`; after the release, 0 rules | The good rebuild removes old + new ids together, because it builds `removeRuleIds` from `l.ids`, and then resets the call to its fresh ids. B's refusal stays set, so its reply is still refused. |
| P4: caps 5 rules. B holds 1 rule; a timed-out rebuild adds 3 (summed counts 4); C installs | `install while unsynced refused`; after B and C end, `synced true`, and D installs 3 rules | The inflated counts never refuse a call that would otherwise run. While they exist the keeper is unsynced, and every install is refused anyway. They leave with the call. |
| P5: the late rebuild is applied **after** B's release (the fake reorders the calls) | `left after late land 1` | One rule is left behind. The result is the same with the fix reverted (1), so this is the ordering assumption (§5), not a regression. |

- **A rule that outlives its call (STOP rule):** with Chrome applying calls in order, no. Ids that join a call leave
  at that call's release. If that release is rejected or times out, `releaseFor`'s catch orphans them (`:227–229`), and
  the next update or sweep removes them. The orphan list now gets ids only from a timed-out install (whose call is
  refused before its effect) and from a released call's failed removal. M1's release-time orphan removal therefore
  cannot strip a running call's rules. Nothing calls `live.set` for a handle after its release: the rebuild takes its
  `entries` inside its own queued op, and a release is a later op that deletes the handle.
- **A covered call that proceeds without its rules (STOP rule):** unchanged. The fix only adds ids to calls that are
  already live, and every one of those calls is refused (`refuseLive`). Neither `installFor` nor `safety-call.ts` was
  touched by fix round 2.
- **Caps conservative:** yes. A call's counts are old + new, which is at least what Chrome actually holds for it. The
  rebuild's own check (`fitsCaps(next…)`) is unchanged and correct, because the update removes every live id.
- **M1 still holds:** the M1 test passes, and P1 shows a release with the never-applied ids still succeeds.

## 5. Carried assumption (no change)

The ordering assumption is unchanged since fix round 1 (verifier 2 §5): a timed-out update that Chrome applies
*after* a later update would leave rules behind (P5). This was true before the fix as well. Record it in the as-built
as an unmeasured assumption, as verifier 2 proposed. It is not a Run 17 item.

## 6. Housekeeping

The scratch worktree `…/scratchpad/v3wt` (its own `npm ci`) was removed after its five `node_modules/@bridge/*`
junctions, all pointing inside the worktree, were removed with `cmd /c rmdir`. `dir /AL /S` then showed 0, and the
worktree was removed with `git worktree remove --force`. `git worktree list` shows only the main tree. The main tree's
`node_modules/.bin` has 42 entries and `@asamuzakjp` is present. Nothing is running. The extension was not reloaded and
the daemon was not started.
