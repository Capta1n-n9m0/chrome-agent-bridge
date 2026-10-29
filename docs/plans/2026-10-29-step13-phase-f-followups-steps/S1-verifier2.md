# Step 13 — S1 verifier 2 (re-check after fix round 1)

Model: Opus, effort medium. Role: verifier (`docs/agent-rules.md` §6), re-checking only M1, M2 and N1 of `S1-verifier.md`
as fixed by `S1-fixer1.md` (claims audited, not trusted). Read: `S1-verifier.md`, `S1-fixer1.md`, decisions.md #385,
`Stage0.md` §5, `git diff` of the spec and of `extension/test/s3a-dnr-wiring.test.ts`, `extension/src/sw.ts`,
`extension/src/handlers/tabs.ts`, `extension/src/opener-join.ts`, `daemon/src/intercept.ts`, `shared/src/protocol.ts`
(`ExtensionListTabsRow`), `docs/docs-writing-guide.md`.

## 1. Verdict

**PASS-with-notes.** M1, M2 and N1 are fixed and nothing is weakened. Every exit check passes. One NIT (N3) on the
wording of the new spec bullet; it does not block.

## 2. Outputs (commands I ran)

Main tree, read-only:
- `npm test`: **Test Files 236 passed (236), Tests 5617 passed (5617)**, exit 0 (`S1-verifier2-test.txt`).
  Re-derived: `git diff extension/test` has 6 added and 1 removed `it(` lines (the removed one is N1's retitle), so
  +5, plus 16 `it(` in the new `opener-join.test.ts` = 21; 5596 + 21 = 5617. Against verifier 1's 5616: +1, the M2 pin.
- `npm run typecheck`: exit 0. All seven `recipes/tsconfig*.json` (`.fe`, `tsconfig`, `.s10`, `.s11`, `.s11b`, `.s6`,
  `.s9`) exit 0 under `npx tsc --noEmit -p`; 0 `error TS` lines (`S1-verifier2-typecheck.txt`).
- `npm run build`: exit 0 (`S1-verifier2-build.txt`).
- `git status --short` before (`S1-verifier2-status-before.txt`) and after the build (`S1-verifier2-status-after.txt`):
  the only difference is my own `S1-verifier2-*` files. The tracked changes are exactly the stage's files: the spec,
  `docs/setup.md`, `docs/e2e-test-plan.md`, the journal, `extension/manifest.json`, `extension/src/sw.ts`,
  `extension/src/tab-events.ts` and the three tests, plus untracked `opener-join.ts` / `opener-join.test.ts`.

Scratch worktree at HEAD `6cb3d4b` under the scratchpad, the eight S1 code/test files copied in, its own `npm ci`
(its `@bridge/*` links pointed at the worktree's own folders). Driver: a scratch script that writes each mutant into the
worktree's `sw.ts` only and runs the real `npx vitest run extension/test/s3a-dnr-wiring.test.ts`
(`S1-verifier2-mutants.txt`):
- baseline: 14 passed (14).
- A, `openerJoin.gone(tabId)` moved after the `tabRemoved` `sendTabEvent`: **red**, 1 failed (the M2 pin) | 13 passed.
- B, `openerJoin.gone(removedTabId)` moved after the `tabReplaced` `sendTabEvent`: **red**, 1 failed | 13 passed.
- C and D (each `gone` call deleted): **red**, 1 failed each.

Afterwards the five junctions were removed with `cmd /c rmdir` (0 entries left), then `git worktree remove --force`;
`git worktree list` shows only the main tree, the path is gone, and the main tree's `node_modules/.bin/vitest` exists.

## 3. Verifier verdict

Not applicable (this is the verifier's own report).

## 4. Deviations

None. No main-tree file was edited apart from my outputs; mutants touched only the worktree.

## 5. Proposed decisions

None.

## 6. Findings

### M1 — fixed
The spec's 2026-10-29 §10 note now has both sentences #385 / `Stage0.md` §5 call for:
- `listTabs` rows keep Chrome's own `openerTabId`. True: `extension/src/handlers/tabs.ts:35` copies `t.openerTabId`.
  "No daemon, SDK or MCP path reads the row's `openerTabId`": true. `daemon/src/intercept.ts` reads `openerTabId` only
  from `tabCreated` (`:323`, `applyOpener` `:350-353`); `record()` (`:649-667`) reads `id`, `hidden`, `url`, `title`;
  `grep openerTabId sdk/src mcp/src` finds nothing.
- The restart limit: true. A lost held `tabCreated` leaves the daemon learning the tab only from a later `listTabs`
  reply, and `record()` calls `handles.mint(t.id)` for every row with no grant, so the handle is leased to nobody.
  Consistent with the `opener-join.ts` header (line 12).
- The two bullets carry no local path and no user name (`docs/docs-writing-guide.md`).

### M2 — fixed
The new static test in `extension/test/s3a-dnr-wiring.test.ts` finds the listener that holds `tabRemovedParams(` (not
the earlier `onRemoved` listener at `sw.ts:184`) and the one holding `tabReplacedParams(`, and pins `openerJoin.gone(`
before the builder, the event name and `sendTabEvent(`. Shown red on the brief's two mutants (A, B) and on deletion
(C, D) by the real test in a worktree, green on the S1 code. It is a static order pin, so it does not prove the runtime
ordering by itself; the runtime argument (`gone` emits synchronously into the one `eventChain` ahead of the
`tabRemoved` frame, `sw.ts:208-219`) holds by reading, as verifier 1 found.

### N1 — fixed
The title now reads "the listener count is 21; …", matching `toHaveLength(21)`. The extra assertion of exactly one
`webNavigation.onCreatedNavigationTarget.addListener(` is unchanged from the build.

### Weakening check
`git diff extension/test/s3a-dnr-wiring.test.ts` has no removed or loosened assertion: the only `-` lines are the old
title and the old count (20 → 21, the required listener). No product code changed in round 1.

### N3 · NIT · "reads" is narrower than "relays"
- **Where:** the new spec bullet, `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (2026-10-29 note, "`listTabs`
  rows still carry …").
- **What:** the daemon does not read the row's `openerTabId`, but its `listTabs` intercept relays every row as is
  (`daemon/src/intercept.ts:676-683`, `{ ...t, tab: handle }`), so a raw SDK `call("listTabs")` reply still shows
  Chrome's value to a script (`shared/src/protocol.ts:773` types it).
- **Fix (optional, closeout):** "No daemon, SDK or MCP logic acts on it; the daemon relays it in `listTabs` replies."

No new runtime fact; nothing was run live.

## 7. Handoff

- No processes left running. The daemon, Chrome and the extension were not touched.
- Scratch worktree and its junctions removed; scratch script at the scratchpad's `v2-mutants.mjs` (not in the repo).
- Evidence (this directory): `S1-verifier2-test.txt`, `S1-verifier2-typecheck.txt`, `S1-verifier2-build.txt`,
  `S1-verifier2-status-before.txt`, `S1-verifier2-status-after.txt`, `S1-verifier2-mutants.txt`.
