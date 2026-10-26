# S3b fixer: only a rejected fetch asks, and only a recent hit counts

Fixer: Claude Opus 5.5, medium effort. Tree: HEAD `b82e009` plus the uncommitted S3b working tree. Chrome, the daemon
and the extension not touched. Nothing committed, no stash/checkout/reset.

## Fixes

| Finding | Fix | Test (red without the fix) |
|---|---|---|
| 1 MAJOR | `handlers/download.ts`: a `fetched` flag is set once `await fetch(...)` resolves; the catch asks `call.hopBlocked()` only when `!fetched`. A 404 (`DOWNLOAD_HTTP` with its `data`) and a body-read error keep today's answer with no wait. Header comment updated. | `s3b-download-hop.test.ts` "a 404 or a body-read error keeps today's answer, data included, with no wait, while another call's hop was seen": the same `constructor/message/code/data` as with no call, under 150 ms, while the call's own watch is marked. Mutant (drop `!fetched`): red. |
| 2 MINOR (ruled: apply) | `safety-hop.ts`: a watch keeps `hitAt` (the time of its last hit, a number only) instead of a boolean; `offer` refreshes it on every matching event; `settle(ms)` is called at the rejection and counts a hit only if it is at most `ms` (`HOP_SETTLE_MS`, 300) before that moment or arrives during the wait. The watcher takes an optional clock (`now`, default `Date.now`); `sw.ts` is unchanged. | "another download's blocked hop older than the settle window does not rename a genuine network failure" (injected clock, hit 301 ms before the rejection, answer stays `TypeError`) and "a hit exactly HOP_SETTLE_MS before the rejection still counts" (boundary). Mutant (any hit counts): both red. |
| 3 NIT | No code change. | `rebuildsRules`: unreadable → readable through `safety.evaluate` (memory now readable) is `false`, pinned. |

The verifier's scratch tests A, B and C are adapted into the first two tests above; no `zz-` file is in the repo.
The "keeps no URL" deep-walk and static tests still pass (only a number and a clock function are kept).

## Exit checks

- `npm test`: 161 files, **4158 passed** (was 4155; +3, none removed). `s3b-download-hop.test.ts` 18 tests.
- `npm run typecheck` 0, `npm run build` 0, the six recipes typechecks (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`,
  `.s11`) all 0.
- `git diff ecd254f --stat -- daemon shared sdk mcp extension/test/log-allowlist.ts`: empty (log allowlist +0).
- No doc touched (R14-5c / SAFE-5c texts unchanged); no new message or code. `safety-state.ts` not edited.
- Size: about 15 source lines and 50 test lines.

## Residual (for the step agent)

Two downloads whose hops are blocked within the same 300 ms window can still both answer `DOMAIN_BLOCKED`, which is
safe (it refuses and leaks nothing). The verifier's proposed decision (2026-10-27 · S3b: only a rejected `fetch` asks
whether a hop was blocked, and only a recent hit counts) matches the code as fixed; Run 17's RD-DL-HOP should confirm
the event lands within 300 ms of the rejection.
