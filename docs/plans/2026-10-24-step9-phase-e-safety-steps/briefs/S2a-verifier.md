# S2a — verifier brief (Step 9, stage S2a "Extension enforcement")

Written 2026-10-24 by the S2a step agent. You are the INDEPENDENT verifier. Read in this order: `CLAUDE.md`;
`briefs/common.md` (all of it binds: ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR,
STOP rules and forbidden fixes); `.claude/skills/step-agent/role-prompts.md` (Common preamble + §Verifier bind
you); `briefs/S2a-builder.md` (the builder's inputs, goal, rules and exit criteria — they are yours too; read
every input it lists); then `S2a-builder.md` — the builder's report, which is **claims to audit, not facts**.

You may read and run; you may NOT edit tracked or untracked source/test files (scratch copies in your
scratchpad or `git stash` round-trips that you fully restore are allowed — verify `git status` and a content
hash of the tree are identical before and after). Level-2: do NOT spawn agents; finish in one go; never wait on
background work. Do not commit. Do not touch the real Chrome or bind 9234. Node first in every Bash call:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

The work is UNCOMMITTED in the main tree on top of HEAD `3d2c111` (baseline 2329 tests / 96 files). The diff is
`git diff` plus the untracked files under `extension/src/safety-{call,debugger,network,state}.ts` and
`extension/test/` (9 new test files).

## What to check (beyond role-prompts §Verifier)

1. Re-run `npm run typecheck`, `npm test`, `npm run build` yourself; re-derive the counts (2525 / 105 claimed)
   and reconcile the +196 per file. Confirm no existing test file changed (`git diff --stat -- extension/test
   daemon sdk mcp shared recipes` must show nothing modified).
2. Exit checks S2.1, S2.2, S2.4 (#141's wording in the phase doc, also in the builder brief), "`Router.on`
   throws" (with a mutation), the sender check, fail-closed on a state read error, the pure `safetyState` send.
   Run the S2.4 greps and the AST-test mutation yourself on a scratch copy.
3. **Bypass hunt (the integrity floor's first phase item):** read `sw.ts`, `router.ts` and every handler for any
   path where handler code runs before the gate, or where a handler acts without the gate. In particular: the
   builder says each handler takes an **optional** `call` — what happens when it is absent? Is any production
   call site able to invoke a handler without one (so the effect check/post-check is skipped)? Is the ungated
   `Router` reachable from `sw.ts`? Does `onMessage` dispatch anything (e.g. `ws-status`, other message types)
   that reaches a handler or changes the safety state? Can any wire message, the daemon or a page change the
   safety state or reach the extension's own pages?
4. #137 item by item: receipt / before each first side effect (`showTab`, `captureVisibleTab`,
   `tabs.update`/`create`/`remove`, each action's `callInPage`, trusted input) / post-check; the gone and
   replaced tab rules (V3's required rows: armed + JS on + empty list → reply unchanged for a self-closing tab
   and a Memory-Saver replacement); the R2-1 last-URL retention for the length of a call; `withDebugger`
   re-check, the registry detach at disarm, detach errors → `DISARMED`; per-tick re-check in poll loops; the
   download store cleared at disarm and the late-fetch release; network ingest/query filter with the pre-ready
   buffer (#155 own pages); `listTabs`/event redaction matching S3.md §7's expectations; capture verification
   (F11); own-page block and `chrome-extension://` navigation (#138); `downloadStart` final-URL check (#140, #154).
5. #139: per-call read after `ready`, defaults, fail closed; in-memory copy used by webRequest only;
   `setAccessLevel` at module scope after every listener, guarded, not awaited; sender check exactly
   `offscreen.html` + no `sender.tab`. #144: toggle re-arm within 1 000 ms ignored, disarm never debounced, the
   options setter not debounced; in-memory copy updated before the write.
6. **Armed / JS on / empty list ⇒ identical behaviour**: argue it from the code and the tests; name any reply
   that changes in that state (the builder admits one: capture moved → `OFFSCREEN` in a race). Judge whether
   each such change is permitted by the rulings; a change not covered by a ruling is at least MAJOR.
7. CLAUDE.md invariants: no top-level `await`; listeners synchronous at the top level (incl. `storage.onChanged`);
   content bundle IIFE; `unwrapResult`, `{__bridgeError}`, `toSerializableArgs` untouched in behaviour; no
   `windows.update({focused:true})` outside `focusTab`; no new `console.*` line printing a URL, title, pattern,
   header value, body or token (grep the diff's added lines for `console.`).
8. For a sample of at least 8 new tests across the new files (include the S2.1, S2.2, Router.on, sender,
   fail-closed and safetyState ones), prove they fail without the change (revert the relevant source hunk on a
   stash round-trip or scratch copy, run, restore) — paste commands and outputs. Re-run 3 of the builder's
   claimed mutations. Assess M9 (the surviving mutation).
9. The builder's proposed decisions: flag any that is contract-level but not marked so; any that conflicts with
   a ruling. Assess the `offscreen.ts` finding (it accepts send/connect from any extension context): is it a
   path by which a page or another context could act? (Content scripts run in pages; can they message it?)
10. Lane: every changed file within `extension/src/**` minus `content/**`, `safety.ts`, `safety-match.ts`,
    `options.ts`; plus `extension/test/`; no manifest/options.html change.

Output: `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a-verifier.md` — numbered findings, each with
severity (CRITICAL / MAJOR / MINOR / NIT), `file:line`, evidence (command + output excerpt), suggested fix; the
exit-check table (ID · result · evidence); then the verdict: **FAIL** if any CRITICAL or MAJOR finding or any
exit check fails; MINOR/NIT only → **PASS-with-notes**; else **PASS**. Return a ≤ 15-line summary.
