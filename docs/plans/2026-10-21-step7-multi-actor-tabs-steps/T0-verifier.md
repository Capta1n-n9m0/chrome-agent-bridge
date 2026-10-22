# Stage T0 (Types) — independent verifier

Written 2026-10-22 by the T0 verifier (Claude Opus 5.5). Read-and-run only; no tracked file edited.
The change audited: the uncommitted `shared/src/protocol.ts`, `shared/test/protocol-step7.test.ts` (new)
and `mcp/src/tools/registry.ts` (one line) on top of HEAD `546e2f1`. `docs/decisions.md` and
`journal.md` were ignored, as briefed. `T0.md` was read as claims to audit.

**Verdict: PASS-with-notes.** No CRITICAL or MAJOR findings. Every exit check passes. There are 5 MINOR
and 3 NIT findings.

## How it was run

- Clean worktree: `git worktree add <scratchpad>/t0-wt HEAD` (546e2f1), then `npm ci` (a real install,
  exit 0, no junction).
- Baseline at HEAD, before copying anything: `npm run typecheck` exit 0; `npm test` exit 0, **542 passed,
  42 files**. This confirms the "before" figure.
- Copied the three T0 files in and ran `git status --short` there, which showed exactly those 3 paths.
  Then: `tsc -p <pkg>/tsconfig.json` for shared, daemon, sdk, mcp and extension, each exit 0;
  `npm run typecheck` exit 0; `npm test` exit 0, **595 passed, 43 files**; `npm run build` exit 0.
- Bundle hashes, comparing a HEAD build with a T0 build in the same worktree (`sha256sum`):
  - `daemon/dist/index.js` is byte-identical, `795fb769aeae…`, so the daemon's build id does not change
    and no handover is triggered.
  - `extension/dist/{sw,content,offscreen,options}.js` are byte-identical.
  - `mcp/dist/index.js` differs, as expected from the one-line edit (`7449fb2c…` → `334a1aae…`).
- The worktree was then removed (`git worktree remove --force`, then the leftover scratch directory).
  `git worktree list` shows only the main tree.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| T0.1 `npm test` after ≥ before; typecheck green ×5 | **PASS** | before 542/42 → after 595/43 (+53 tests, +1 file); `tsc -p` exit 0 for each of shared, daemon, sdk, mcp, extension; `npm run typecheck` exit 0 |
| T0.2 each new event guard rejects a frame without a `params` object | **PASS** | `shared/test/protocol-step7.test.ts:127-132` `"rejects a frame without a params object"`, run once per guard by the `for (const c of cases)` loop (`:120`). Each run checks params absent, `null`, `"x"` and `412`. All 5 pass after the change and all 5 fail with protocol.ts at HEAD. (See finding 1 for how discriminating it is.) |
| T0.3 `codes.ts` unchanged, or additions only, matching §10 | **PASS** | `git diff --quiet HEAD -- shared/src/codes.ts` → exit 0. Read against spec §10: daemon codes `NOT_CONNECTED TIMEOUT UNKNOWN_METHOD BAD_PARAMS TAB_HELD TAB_GONE TAB_UNKNOWN LOCK_TIMEOUT VERSION` (9) = `codes.ts:8-18`; extension codes `REF_STALE … INTERNAL` (13) = `codes.ts:21-35`; same names, same order, same grouping, 22 in all; `ErrorCodes` `satisfies { [K in ErrorCode]: K }` |

## Task results

**Tests fail without the source change.** In the worktree I kept the new test file and set
`shared/src/protocol.ts` back to HEAD.
- `npx vitest run shared/test/protocol-step7.test.ts` gave `Tests 48 failed | 5 passed (53)`. That matches
  T0.md. The 5 that pass are the hello test and the 4 compile-time tests.
- `tsc -p shared/tsconfig.json` exited 2 with 17 errors: 15× TS2305, one for each of the 15 new names;
  1× TS2741, because the test's `NetworkRequestsResult` lacks the `text` that was still required; and
  1× TS2578, an unused `@ts-expect-error`. Before a guard exists, its 48 tests fail with a TypeError, so
  I ran mutations to see whether the assertions themselves catch anything.

**Mutations** (`<scratchpad>/mutate.mjs`, each one applied to the worktree's protocol.ts, then
`vitest run shared/test/protocol-step7.test.ts`, then the file restored; `restored: true`):

| # | Mutation | New-file result |
|---|---|---|
| M1 | `isEvent` drops `isObject(v.params)`; `eventParams` returns `{}` (or the frame itself) when params is not an object | **53 passed — survives** (finding 1) |
| M2 | `isTabReplacedEvent` returns true for a `tabReplaced` frame with no params object ("guard accepts params missing") | 1 failed: `isTabReplacedEvent > rejects a frame without a params object` |
| M3 | `eventParams` drops `value.event !== name` | 5 failed (each `rejects its params under another event name…`) |
| M4 | `isTabId` → `typeof v === "number"` | 5 failed (`rejects a mistyped tabId/openerTabId/addedTabId/removedTabId`) |
| M5 | `isTabCreatedEvent` drops `optional(p, "openerTabId", isTabId)` | 1 failed: `rejects a mistyped openerTabId` |
| M6 | `isLeaseGrantedEvent` drops `p.reason === "opener"` | 2 failed: `rejects a frame missing reason`, `rejects a mistyped reason` |
| M7 | `optional()` always true | 5 failed (mistyped `openerTabId`, `lastUrl`, `lastTitle`) |
| M8 | `eventParams` bypasses `isEvent`'s no-`id` rule | 5 failed (each `rejects non-objects and a frame carrying an id`) |

When M1 was run against the whole `shared/` suite, one test failed:
`isEvent > rejects an event that carries an id or lacks a params object`, in the pre-existing
`shared/test/protocol.test.ts`. So this mutation is caught, but only by the older file.

**mcp diff.**
- `git diff HEAD --stat -- mcp/` reports `mcp/src/tools/registry.ts | 2 +-` (1 insertion, 1 deletion).
  The only change is `-      return text(out);` / `+      return text(out ?? "");` at `:282`.
- The behaviour is identical. Today's extension always sets `text`: `extension/src/handlers/network.ts:53-57`
  builds it on both branches and returns `{ ...result, text }`. `?? ""` therefore never fires against a
  current extension.
- Without the edit, the optional field gives `mcp/src/tools/registry.ts(282,19): error TS2345: Argument of
  type 'string | undefined' is not assignable…`. I measured that in the worktree, and it matches T0.md.

**Shapes against the spec and F13.** These checks were made by reading the diff:
- All five `*Params` match F13 field for field, including which fields are optional:
  - `TabCreatedParams {tabId, openerTabId?, url}`;
  - `TabRemovedParams {tabId, lastUrl?, lastTitle?}`;
  - `TabReplacedParams {addedTabId, removedTabId}`;
  - `TabGoneParams {tab, lastUrl?, lastTitle?}`;
  - `LeaseGrantedParams {tab, reason: "opener", url}`.
- `ExtensionEventName` and `DaemonEventName` match §10's two event lines (the "later" events are left out).
- `SnapshotElement` and `SnapshotResult` match decision 0.7 exactly.
- `ScreenshotMode = "switch" | "cdp"` and its comment match §7.
- `text?: string` carries `@deprecated` and cites #49.
- The F21 comment sits in `protocol.ts:3-7`, not in `codes.ts`, and agrees with F21's resolution:
  `TAB_UNKNOWN` per 0.1, `TAB_GONE` after a resolved handle, and `TIMEOUT` per 0.6.
- The guards:
  - each one goes through the unchanged `isEvent`, which requires a string `event`, no `id` and a params
    object;
  - each checks the exact name;
  - tab ids must pass `Number.isInteger`;
  - extra fields are accepted (`:170-173` tests that).
- The diff contains no hunk in `HelloMessage`/`isHello`. `error.ts` is unchanged
  (`git diff --quiet HEAD -- shared/src/error.ts` → 0), so `fromWire` and `WireError` are untouched.
- `protocol.ts` has one import, `import type { WireError }`, and no `console`/`process` use.
- `package.json`, `shared/package.json` and `package-lock.json` have no diff, so there is no new dependency.
- No content-script file imports shared (grep), and the extension bundles are byte-identical. The new
  exports are erasable types plus guards that the extension does not import.

**What removing `text` breaks (T0.1, re-derived).** In the worktree I deleted the `text?` member outright
and ran `tsc` on each package:
- shared: `shared/test/protocol-step7.test.ts(221,14): error TS2339`, the builder's own test;
- daemon and sdk: no errors;
- mcp: `mcp/src/tools/registry.ts(281,15): error TS2339`. The error is identical with the HEAD line;
- extension: `extension/src/handlers/network.ts(56,23): error TS2353`.

That is exactly T0.md's list. `extension/src/network-log.ts:58` (`Omit<NetworkRequestsResult, "text">`)
compiles either way, which I confirmed. The snapshot `text` consumers are:
- `extension/src/content/snapshot.ts:164-176`: `interface Snapshot` at 164, `text: string` at 165,
  `return { text: … }` at 176;
- `content/index.ts:10` and `:26`;
- `handlers/perceive.ts:5`;
- `mcp/src/tools/registry.ts:82-83`.

For the line-number drift in that list, see finding 6.

## Findings

1. **MINOR: T0.2's per-guard test does not, by itself, catch a guard that drops the params-object
   requirement.**
   - *Location:* `shared/test/protocol-step7.test.ts:127-132`.
   - *Evidence:* mutation M1 removes `isObject(v.params)` from `isEvent`, and `eventParams` falls back to
     `{}` or to the frame itself. The result is `Tests 53 passed (53)` for the new file. Only
     `shared/test/protocol.test.ts`'s `isEvent > rejects an event that carries an id or lacks a params
     object` fails. The cause: every "no params" frame in the new file is `{event}` with no fields, so the
     required-field checks reject it on their own. A guard that read the fields from the top level of the
     frame would pass too.
   - *Why it matters:* the Stage 0 audit's T0.2 row expects that "a test per event name still fails if a
     guard drops the check". The code is correct, since each guard goes through `isEvent`. The coverage
     comes from the layering, not from the per-guard test.
   - *Suggested fix:* add `expect(c.guard({ event: c.full.event, ...c.full.params })).toBe(false)` to the
     test, which puts the fields at the top level with no params. With `{}` and with a top-level fallback,
     M1 then fails 5 tests.

2. **MINOR: the type and the guard disagree on an explicit `undefined` optional field.**
   - *Location:* `shared/src/protocol.ts:179-181` (`optional`), used at `:191`, `:196` and `:208`.
   - *Evidence:* in a worktree probe, `const e: EventMessage<TabCreatedParams> = {event:"tabCreated",
     params:{tabId:1, url:"", openerTabId: undefined}}` passes `tsc -p shared` (exit 0, because
     `exactOptionalPropertyTypes` is off). Yet `isTabCreatedEvent(e)` → `false`, and the same value after
     `JSON.parse(JSON.stringify(e))` → `true`.
   - *Why it matters:* on the wire `undefined` is dropped, so real frames are fine. But T2's in-process unit
     tests, or T1 code that builds `{tabId, openerTabId: tab.openerTabId, url}`, produce exactly this shape,
     and the guard will reject it silently. The builder's proposed decision covers `null`, not `undefined`.
   - *Suggested fix:* treat `undefined` as absent (`p[key] === undefined || check(p[key])`) and add a test.
     Alternatively, record that an explicit `undefined` is rejected and test it, so T1 and T2 know.

3. **MINOR: T0.md's consumer list leaves out runtime-only `text` consumers.**
   - *Location:* `mcp/test/tools.test.ts:331-361` (three `browser_network_requests` tests whose fake
     `networkRequests` returns `text:` and which assert on it) and `:39` (`browser_snapshot returns the
     snapshot text`).
   - *Evidence:* these never appear in the `tsc` output when `text` is removed, because the fakes are
     loosely typed. `grep -n "text" mcp/test/tools.test.ts` lists them.
   - *Why it matters:* they are T4's to change, and a "typecheck-only" list hides them.
   - *Suggested fix:* add them to T0.md's handoff list, marked as runtime consumers that typecheck does not
     catch.

4. **MINOR: T0.md is stale.**
   - *Location:* `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T0.md:3`, `:8-27` and `:51`.
   - *Evidence:* the report says "Verdict: ESCALATED" and gives the after-typecheck as "**2**
     (`registry.ts:282` only)". The tree now carries ruling (a), and the measured typecheck exits 0
     (above).
   - *Suggested fix:* rewrite the verdict, counts and handoff to the post-ruling state before the commit.
     Add a Deviations entry for the item below.

5. **MINOR: the phase doc has no dated note for the `text` deviation.**
   - *Location:* `docs/plans/2026-10-21-step7-multi-actor-tabs.md:229`, which says "`NetworkRequestsResult`
     loses `text`", and `:201-203` in 0.7, which says it "is removed from the wire".
   - *Evidence:* as built, T0 keeps `text?` and marks it `@deprecated`, per decisions.md #49 (uncommitted).
     `grep -n "#49\|deprecated"` over the phase doc, the spec and the as-built register finds nothing.
   - *Why it matters:* the SPEC-DISCREPANCY PROTOCOL says "code and spec never diverge silently". The end
     state (removal in T4) still matches 0.7, but T0's checkbox is not done as written.
   - *Suggested fix:* the step or session agent adds a dated *Corrected* note to the T0 checkbox citing
     #49, plus an as-built register entry. A verifier does not edit the plan.

6. **NIT: some line numbers in the consumer list are off, and T0.md overstates the match with Stage 0.**
   - *Location:* `T0.md:64`.
   - *Evidence:* `snapshot.ts:163-177`. Line 163 is blank, `interface Snapshot` is at 164 and `text: string`
     at 165. Stage 0's `:166-177` (`stage0-audit.md:147`) is also one line late. T0.md says "These match
     Stage 0", but the ranges differ. Stage 0 cites `content/index.ts:10` only, where T0.md has `:10,26`.
   - *Suggested fix:* cite `snapshot.ts:164-176` and drop "These match Stage 0", or say where the two differ.

7. **NIT: T0.md's failing-first `tsc` claim is incomplete.**
   - *Location:* `T0.md:54-55`.
   - *Evidence:* T0.md says "`tsc` gave TS2305 for every new name". The measurement gave 17 errors: 15×
     TS2305 (exactly the 15 new names), 1× TS2741 and 1× TS2578.
   - *Suggested fix:* state all three error kinds.

8. **NIT: a Chrome behaviour claim in a comment was not checked here.**
   - *Location:* `shared/src/protocol.ts:98`, "`chrome.tabs.onReplaced` (e.g. a Memory-Saver discard)".
   - *Evidence:* the claim is inherited from spec §6.2 ("Memory Saver discard, prerender swap"). Nothing in
     the repo or in Stage 0 measures that a discard fires `onReplaced` in current Chrome, and this verifier
     did not either: it has no browser and must not touch the user's Chrome.
   - *Suggested fix:* cite "per spec §6.2" in the comment, or carry the claim to T5 as something to observe.
     It does not block T0.

No other deviations were found:
- the guards have the semantics F13, #18 and #42 ask for;
- the hello test accepts `{type, token, role:"extension", proto:2}` and the v1 hello;
- no logging was added;
- no runtime dependency was added;
- the daemon and extension bundles are unchanged.

The builder's proposed decisions are plausible, and none contradicts a pre-registered rule; recording
them is the session agent's call. They are: no `isScreenshotMode` guard; `null` counts as mistyped; tab
ids must be integers but may be negative (`isTabRemovedEvent({…tabId:-1})` → true, as proposed); the
`__bridgeError` shape stays out of shared; and the D0 revisit is answered "v2 peers do not yet require
`code`".

## Counts

| | tests | files | typecheck | build |
|---|---|---|---|---|
| Before (546e2f1, clean worktree) | 542 | 42 | 0 (×5) | — |
| After (worktree + 3 T0 files) | 595 (+53) | 43 | 0 (×5) | 0 |
| New file with protocol.ts at HEAD | 48 failed / 5 passed (53) | — | `tsc -p shared` exit 2, 17 errors | — |

## Re-check (2026-10-22): findings 1, 2, 5 and 8, plus the suite

The step agent asked for this re-check after fixing findings 1, 2, 5 and 8 in the working tree. Findings
3, 4, 6 and 7 are edits to `T0.md` and were not re-checked here. The step agent's own figures were
treated as claims.

**How it was run:** a fresh clean worktree of HEAD `546e2f1`, with `npm ci` (exit 0). I copied in the
three current T0 files (`git status --short` showed exactly those three) and ran the suite. The
worktree was removed afterwards; `git worktree list` shows only the main tree.

**Suite:**
- `tsc -p` exit 0 for each of shared, daemon, sdk, mcp and extension; `npm run typecheck` exit 0.
- `npm test` exit 0: **600 passed, 43 files** (the new file now holds 58 tests); `npm run build` exit 0.
- `daemon/dist/index.js` (`795fb769aeae…`) and the four `extension/dist` bundles still hash the same as
  the HEAD build.

These confirm the step agent's figures. T0.1 is still PASS: 542 → 600 tests, typecheck green in all
five packages.

**Mutations** (`<scratchpad>/mutate2.mjs`, each run with `vitest run shared/test/protocol-step7.test.ts`
and the file restored afterwards; `restored: true`):

| # | Mutation | Result |
|---|---|---|
| M1b | `isEvent` drops `isObject(v.params)`; `eventParams` falls back to the frame's top-level fields | **5 failed**, one `rejects a frame without a params object` per guard |
| M1a | the same, but `eventParams` falls back to `{}` | 58 passed: an *equivalent* mutant. Every guard has a required field, so a missing params is still rejected; the guard behaves the same, so no test can tell them apart |
| M9 | `optional()` reverts to `!(key in p) \|\| check` (an explicit `undefined` is rejected) | **3 failed**: `treats an optional field set to undefined as absent`, for tabCreated, tabRemoved and tabGone |
| M10 | `optional()` treats `null` as absent too | **2 failed**: mistyped `openerTabId` (tabCreated) and mistyped `lastUrl` (tabRemoved) |
| M7′ | `optional()` always true | 5 failed |
| M11 | `tabReplaced.removedTabId` made optional, so a required field set to `undefined` is accepted | **2 failed**: `rejects a frame missing removedTabId`, `rejects a mistyped removedTabId` (its list includes `undefined`) |

These confirm the step agent's two claims: "optional uses `key in p`" → 3 failed, and "eventParams falls
back to top-level fields" → 5 failed.

**Per finding:**

1. **Finding 1: resolved.** `protocol-step7.test.ts:132-133` now asserts that
   `{event, ...c.full.params}` (the fields at the top level) is rejected. M1b, the mutant that survived
   before, now fails 5 tests. The variant that still survives, M1a, is equivalent and not a gap.
2. **Finding 2: resolved.**
   - `optional()` at `shared/src/protocol.ts:183-185` is now `p[key] === undefined || check(p[key])`.
     Its comment says JSON drops `undefined` and that `null` stays mistyped.
   - New per-guard test `:172-176`.
   - Required fields set to `undefined` are still rejected: `isTabId` and `isString` reject `undefined`,
     the existing `removedTabId: [..., undefined]` case passes, and M11 shows the test is discriminating.
   - Residual NIT: the `null` cases cover `openerTabId`, tabRemoved's `lastUrl` and the required fields.
     They do not cover tabRemoved's `lastTitle` (`[1, false]`) or tabGone's `lastUrl`/`lastTitle`
     (`[1, {}]`, `[1, []]`), so M10 is caught only by the first two. A `null` entry in those three
     mistyped lists would close it. This does not block.
3. **Finding 5: resolved.**
   - `docs/plans/2026-10-21-step7-multi-actor-tabs.md:230-233` adds a note under the T0 checkbox: "*Superseded
     2026-10-22: was "loses `text`" in T0, because …*". It cites decisions.md · 2026-10-22 ·
     `NetworkRequestsResult.text` is deprecated in T0 and removed in T4, and names the
     `registry.ts:282` lane grant. That is the protocol's format.
   - I agree that 0.7 needs no note: it describes the end state (the handler stops building `text`, and
     the field leaves the wire), which T3 and T4 still deliver under #49.
4. **Finding 8: resolved.**
   - The comment at `shared/src/protocol.ts:96-98` now says spec §6.2 names a Memory-Saver discard, that
     this is not measured, that Chrome documents prerender/instant, and that LEASE-6 measures it (#45).
   - The references check out: decisions.md `:88` is "LEASE-6 measures whether a discard keeps the tab
     id… (#45)", and the phase doc `:402` has the LEASE-6 row.

**Exit checks after the re-check:** T0.1 PASS (600/43, typecheck ×5 green). T0.2 PASS
(`:127-134`, now also discriminating against the top-level fallback). T0.3 PASS (re-run:
`git diff --quiet HEAD -- shared/src/codes.ts` → exit 0).

**Final verdict: PASS-with-notes.**
- Findings 1, 2, 5 and 8 are resolved.
- One new NIT: the `null` entries listed under finding 2.
- Findings 3, 4, 6 and 7 are the step agent's `T0.md` edits. I have not checked them.
