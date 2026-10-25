# L2 fixer report, round 1

Model: Sonnet 5.5 (fixer, effort per brief). Date 2026-10-25. Audited commit `3035149`; findings in `L2-verifier.md`.
Verdict: **DONE**. Docs only; no npm.

## Per finding

- **F1 fixed.** Closing pointer lines, without bold or the headline text, in four files:
  - `sdk/CLAUDE.md` -> `daemon/CLAUDE.md`: daemon outliving its session, pre-Step-6 server, `BRIDGE_PORT`/`BRIDGE_DAEMON`, the `Start-Process` pipe fact, several `ws` frames per TCP read (the knock once lost an `extensionStatus`).
  - `extension/CLAUDE.md` -> `daemon/CLAUDE.md`: the session marker's 2 s bound and handle retirement.
  - `mcp/CLAUDE.md` -> `daemon/CLAUDE.md`: `ws` external in the bundles (`mcp/build.mjs`).
  - `daemon/CLAUDE.md` -> `sdk/CLAUDE.md`: the per-call timeout and the `route.ts` bounds.
- **F2 fixed.** Removed #222 and #98 from the Standing list (both are grants of one step or wave; #222's own entry says "not standing beyond this step"). Removed #64 entirely: its UI-automation reload is #65 (listed), and the restart grant is a Step 7 wave grant.
- **F3 fixed.** Removed #1 (replaced by #230 and `agent-rules.md`), #18 (#73 made `code` required), #54 (its Revisit-if, Step 8 S2, has landed), #14 (a measurement plan for MUX-7, not a rule), #213 (Run 14/15 wave mechanics; the lasting parts are in `agent-rules.md`, `recipes/CLAUDE.md`). Borderline items, decided by the guide's rule ("still governs how we work or what the product promises"):
  - #97 removed: a pre-registered probe for the resumed S6 wave, spent; the fixtures-only rule is in `agent-rules.md` §2.
  - #223 removed: one row's read-back helper, wave-specific; its NITs are known limits recorded in #226.
  - #158 kept, "(check)" dropped: the message constants and "no message contains a URL, pattern, title or id" are a standing product promise (what a refusal reveals).
  - #164 kept with "(check)": the refusal wording is a product promise, but #219 (listed beside it) changed the evaluate text, so someone should confirm which text stands.
  - #202 and #229 kept: they hold user rulings that are listed nowhere else (#133 changed to `JS_DISABLED`, #138 as built, #140 moves to its own step after Step 11, a popup of a background opener stays without a lease, the `saveTo` acceptances), so they are not mere ratification.
- **F4 fixed.** Added #129 (roadmap after Step 8; the root Current state cites it) to "How we work" and #226 (Run 15 stands; the popup-lease limit is cited in root and `daemon/CLAUDE.md`) after #123 in the tabs/leases group. Both point to an existing archive entry. Net Standing list: 102 lines (was 110: 10 removed, 2 added; #158 lost its "(check)").
- **F6 fixed.** The two `*Updated 2026-10-24: ...*` notes (`daemon/CLAUDE.md` Start-Process bullet, `recipes/CLAUDE.md` reload bullet) are plain text now ("Measured since: ..." and "Since Step 8 S2b ..."); every measured number is kept. `check-l2.mjs` now also counts `Updated` notes. I did not touch `scripts/doc-check.mjs` (outside my lane): its regex at line 101 still lacks `Updated`, which the session agent should add.
- **F8 not needed.** No group sub-headings were restored; the per-bullet headlines are enough to find each gotcha.
- **F9 fixed.** `extension/CLAUDE.md` is 3,189 words (was 3,499; `wc -w`; budget 3,500, target <= 3,200). Moved verbatim to `extension/src/handlers/CLAUDE.md` (now 590 words, 7 bullets): the `screenshot {mode:"cdp"}` refusal, `navigate`/`newTab` gated on the URL Chrome will open, Chrome's `javascript:` navigation refusal, the block list not being a network firewall. These are the closest fits and a judgement call: each describes a handler's behaviour (`handlers/perceive.ts`, `navigate.ts`, `tabs.ts`, `download.ts`), but they lean on `tabs.ts` and `safety.ts` at the top level. No gotcha concerned only `content/` or `evaluate/`: the candidates (`executeScript`, `Runtime.evaluate.timeout`, CDP coordinates) also live in `inject.ts`, `debugger.ts` and `trusted-input.ts`. The index line for `src/handlers/` at the top of `extension/CLAUDE.md` names the moved topics. The root's pointer to the Safety gate bullets still resolves (those stayed).

## Checks (from the repo root, node v24.14.1)

- `node docs/plans/2026-10-25-lean-procedures-steps/check-l2.mjs` -> exit 0: `headlines found in exactly one file, once: 91/91`; `history notes left in CLAUDE.md files: 0`; `entries present once, text identical: 231/231`; `Standing decisions: 102 lines; each names an existing entry in its file: 102/102`; `Archive index: 5 rows, entry counts match the files`; `RESULT: all checks pass`. L.4 lists two non-`.md` files: `check-l2.mjs` (the verifier accepted it, F7) and the session's untracked `start-bridge-linux.sh` (not mine, not committed).
- `node scripts/doc-check.mjs` -> exit 0: 1 dead path (`docs/e2e-test-plan.md:1031`, historical), 9 planned paths (L3/Step 11), code counts tools 23, router methods 26, codes 26. Nothing reported for `CLAUDE.md` or decisions files.
- The check script needed no placement-list update (it checks "exactly one file", not which); only the `Updated` regex changed.

## Deviations / proposed decisions
None. Archive entries untouched.
