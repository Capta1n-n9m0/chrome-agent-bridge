# S3b verifier 2: re-check after fix round 1

Verifier: Claude Opus 5.5, medium effort. Tree audited: HEAD `b82e009` plus the uncommitted S3b working tree after
the fixer. I only read and ran. I did not touch Chrome, the daemon or the extension, and I committed nothing.
Scope: round 1's findings 1 (MAJOR), 2 (MINOR) and 3 (NIT), the regression checks, and the timing window.

## Verdict: **PASS-with-notes**

All three findings are fixed. Each fix's test goes red when the fix is removed. The fix caused no regression. The
notes are two NITs and the residual the fixer already declared.

## Exit checks (re-run in the main tree)

| Check | Result |
|---|---|
| `npm run typecheck` | `TC 0` |
| `npm test` | `Test Files 161 passed (161)`, `Tests 4158 passed (4158)` (was 4155/161: +3, none removed) |
| `npm run build` | exit 0. Afterwards `git status --short` shows only the stage's files. |
| Six recipe typechecks (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`) | all exit 0 |
| `git diff ecd254f --stat -- daemon shared sdk mcp extension/test/log-allowlist.ts` | empty, so the log allowlist is **+0**. Log-scan and sentinel are green in the full run. |
| R14-5c and SAFE-5c expected texts | unchanged. The only e2e diff mentioning R14-5c is the new RD-DL-HOP row. |
| Static no-URL tests (`s3b-download-hop.test.ts:96`, `:114`) | pass. The watch keeps only `hitAt` (a number) and a clock function. |
| Lane | Comparing mtimes with `S3b-verifier.md` (00:07:04): only `s3b-download-hop.test.ts` (00:08:20), `handlers/download.ts` (00:08:35) and `safety-hop.ts` (00:08:37) changed after round 1. `sw.ts`, `safety-call.ts` and `safety-state.ts` were last written at 23:58, by the builder. |

## Red without the fix (mutants)

I ran these in a scratch `git worktree add --detach … HEAD`, with the S3b tree applied and its own `npm ci`. Each
mutant was restored before the next. Afterwards I unlinked the worktree's `@bridge/*` links first (they pointed into
the worktree itself), then removed it and ran `git worktree prune`. The main tree is intact: `node_modules/.bin` has
42 entries, and `@bridge` has 5. Baseline: `Tests 18 passed (18)`.

| Mutant | Red test(s) |
|---|---|
| M1: `download.ts:67` drops `!fetched &&` (round 1's code) | "a 404 or a body-read error keeps today's answer …" |
| M2: `safety-hop.ts:62` `recent = hitAt >= 0` (a hit lasts the whole fetch) | "another download's blocked hop older than the settle window …", "a hit exactly HOP_SETTLE_MS before …" (2 failed) |
| M3: boundary `>=` changed to `>` | "a hit exactly HOP_SETTLE_MS before the rejection still counts" |
| M4: window doubled (`now() - 2 * ms`) | "another download's blocked hop older than the settle window …" |
| M5 (NIT 3): `rebuildsRules` rebuilds when a changed key's old value was wrong-typed | "a switch or Upload-folders change alone does not rebuild" (the new line 301) |

## The timing window

**The clock source in production.**
- `sw.ts:51` builds `new BlockedHopWatcher(chrome.runtime.id)`, so the clock is the default `Date.now`, and `sw.ts`
  is unchanged.
- `Watch` calls it as `this.now()`, so the receiver is the `Watch`. `Date.now` ignores its receiver:
  `node -e 'const o={now:Date.now}; console.log(typeof o.now(), o.now()>1e12)'` printed `number true`.

**A hit that arrives after the rejection, during the settle.**
- `settle` fixes `since = now - ms` at the rejection. A later `mark()` sets `hitAt` to a later time, which is ≥
  `since`, and its `wake` resolves `recent()` as true.
- This is pinned by the test "the event after the rejection still counts" (`:212`).
- `close` during the wait resolves `recent()`. The timer path does the same and removes its waker.

**The boundary.** A hit exactly `HOP_SETTLE_MS` before the rejection counts (`>=`), and one 1 ms older does not. Both
are pinned (M3, and `settle(0)` at `:287`).

**The order of events in the catch.**
- `settle()` is reached right after the rejection.
- `TIMEOUT` and the `checkFinalUrl` refusal are decided first, and `fetched` is still false on both of those paths.
- The `aborted` check comes before the hop check, so a timeout never waits.

## Findings

### 1. NIT: the window uses the wall clock
`extension/src/safety-hop.ts:95`.

`Date.now` follows system clock changes. If the clock is set back between the hop event and the rejection, the
event's `hitAt` lies in the "future", and `hitAt >= since` still holds, so the hit counts. That is safe. If the clock
is set forward by more than 300 ms in that gap, a real hit is missed, and the answer falls back to today's error
(round 1's behaviour). That fails open in naming only: the bytes are still never fetched from the blocked host,
because DNR stopped the hop.

**Fix (optional):** default to `() => performance.now()`, which is monotonic and available in workers. No test
change is needed.

### 2. NIT: `HopWatch.blocked()` is still sticky
`extension/src/safety-hop.ts:51-53`.

`blocked()` still returns true for any hit, however old. No production code calls it (`grep -rn "\.blocked()"
extension/src` is empty), so this is documentation only.

**Fix:** either note "tests only; production asks `settle`" in its JSDoc, or remove it.

### Residual (declared by the fixer; carried, not a finding)
Another download's blocked hop that lands within 300 ms of this call's rejection, or during its settle wait, still
renames a genuine network failure to `DOMAIN_BLOCKED`. This fails safe: the call is refused and nothing leaks. Round
1's proposed decision covers it, and Run 17's RD-DL-HOP should record the gap between the event and the rejection.

## Attacks that found nothing
- **A 404 or a body-read error with the call's own watch marked.** The answer matches today's exactly, including
  `constructor`, `message`, `code` and `data {status, contentType}`, and it arrives in under 150 ms (`:244`).
- **A fetch that resolves and is then refused by `checkFinalUrl`.** `refused` is rethrown before the hop check, so
  the answer is unchanged.
- **The NIT 3 test.** It models "unreadable → readable through another key" as a wrong-typed old `safety.evaluate`
  value with memory now readable. It is discriminating: M5 turns it red.
