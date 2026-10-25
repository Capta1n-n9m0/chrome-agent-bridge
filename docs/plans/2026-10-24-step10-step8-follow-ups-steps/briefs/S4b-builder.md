# S4b builder brief — the new code `JS_DISABLED`

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server + Chrome MV3 extension;
TypeScript; vitest). Shell: Git Bash on Windows; put node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Checks: `npm run typecheck`,
`npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime gotchas" (the Step 9 safety block above all) and
"Testing philosophy" bind. HARD RULES: never commit or print the token (`bridge.token`, `.env`); never bind anything
but 127.0.0.1 (tests bind port 0, never 9234); never push, never tag; never touch the user's real Chrome (no reload,
no live browsing — this stage is host-only); never log URLs, titles, header values or bodies. Report in the exact
format requested. Never invent results — if something did not run, say so. Decisions you take go in your report as
"Proposed decisions" (date · plain title, then Decided / Why / Instead of / Revisit if). No internal codes without a
one-line gloss. Model: Opus 5.5. You must NOT spawn agents.

Also read `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/common.md` in full: its ESCALATION list,
SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR and LESSONS bind you verbatim (they are part of this brief).

## Role: Builder (stage S4b)

Implement exactly this stage. Spec note first (its own commit), then failing tests, then code. Run
`npm run typecheck`, `npm test`, `npm run build` and paste the tails.

## Inputs (read them; they bind verbatim, with every dated note)

- Phase doc `docs/plans/2026-10-24-step10-step8-follow-ups.md`: Decision 0.12 (user) with its Stage 0 F17 note; 0.11;
  "Stage S4b" (checkbox + Lane); Exit checks S4b.1–S4b.3 with their dated notes; S4.3's F6 note (S4's saveTo
  methods' refusal is asserted *equal to evaluate's own refusal*, so S4's tests should need no text change); "STOP
  rules and forbidden fixes".
- decisions.md: #202 (the ruling: "#133 changed"), #133, #138, #163, #198, #204 (the 0.12 proposal: `DISARMED`
  keeps `data.scope:"all"`, `"evaluate"` no longer produced), #218 (S4's methods `evaluateSaveStart/Chunk/End`,
  class `evaluate`), #209.
- Stage 0 audit `docs/plans/2026-10-24-step10-step8-follow-ups-steps/stage0-audit.md` F6 and F17.
- Design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10 — and how Step 9's S0 amended it for
  `DISARMED`/`DOMAIN_BLOCKED` (commits `aabc3b4`, `2cc0049`; `docs/plans/2026-10-24-step9-phase-e-safety-steps/S0.md`)
  as the model for the dated note.
- Step 9 as-built `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` (codes, `safetyRefusalLine`,
  `withSafetyRefusals`, the attach set); Step 10 as-built register `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md`;
  S4 report `…-steps/S4.md` (its handoff to S4b).

## What to build

GOAL (from the step brief): while the human has turned JavaScript off, `evaluate` (with or without `asRef`), the S4
`saveTo` methods (`evaluateSaveStart`/`Chunk`/`End`, class `evaluate`) and a `navigate`/`newTab` to a
`javascript:`, `data:` or `blob:` URL (#138) are refused with a new code `JS_DISABLED`, not
`DISARMED {scope:"evaluate"}`.

1. **Commit 1 — spec only.** Amend `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10 with a dated note
   (`*Amended 2026-10-25 (Step 10 S4b, #202): …*` and, where an existing statement changes, `*Superseded 2026-10-25:
   was X, because Y.*` in place): the new code `JS_DISABLED` on the wire (26 codes, 25 on the wire), when it is
   produced, that `DISARMED` (scope `"all"`) wins while the bridge is off, that `DISARMED` keeps `data.scope:"all"`
   and `"evaluate"` is no longer produced by a Step 10 extension (an old Step 9 extension may still send it; clients
   render it as the JavaScript-off line, F17), and that `JS_DISABLED` is not in the failure-report attach set.
   Commit it alone, exact path, message `docs(spec): §10 — JS_DISABLED (#202)` with a body that says why, and the
   trailers:
   ```
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_01FdNdAAZRvHC2yq2anfnNSW
   ```
   This must precede the code commit in `git log` (S4b.1).
2. **Tests first** (each must fail at `6ba2d10` — the S4 close — and pass after): S4b.1 (26 codes, `JS_DISABLED` on
   the wire list), S4b.2 (JavaScript off → `evaluate`, `evaluate {asRef}`, `evaluateSaveStart/Chunk/End`, and a
   `javascript:` and a `data:` (and `blob:`) `navigate`/`newTab` answer `JS_DISABLED`; bridge off → `DISARMED`
   scope `"all"` for the same calls; JavaScript on → unchanged; plus an old extension's `DISARMED {scope:"evaluate"}`
   still rendered by the SDK and the MCP as the JavaScript-off line), S4b.3 (`JS_DISABLED` not in `ATTACH_CODES`;
   the MCP renders it as one line — no failure report, no screenshot). Prefer extending the existing safety test
   files over new ones.
3. **Code.** `shared/src/codes.ts` (+ its type and any wire-code list/guard; keep `SafetyScope` at its two values per
   F17 and fix the doc comments that say `"evaluate"` is produced); `extension/src/safety.ts` (the refusal: code,
   message — keep the human-readable message's meaning; no `data`, or justify any `data` as a Proposed decision;
   the message must contain no URL, pattern, title or id); `sdk/src/` (`safetyRefusalLine`: `JS_DISABLED` → the
   JavaScript-off line; `DISARMED` scope `"evaluate"` → the same line (old extension); everything else unchanged;
   anything else that recognises safety refusals); `mcp/src/tools/registry.ts` (`withSafetyRefusals` covers
   `JS_DISABLED`, one line: "the user turned JavaScript off; every other tool still works; ask them" — check the
   existing line's exact words and keep them unless 0.12 demands otherwise; say which). `safety-call.ts` or the S4
   store's refusal only if the code path demands — say so. **No change to which methods are gated or how; only the
   code and wording of the JavaScript-off refusal.**
4. **`docs/setup.md` Safety section**: updated, quoting the code and the refusal text byte for byte from the code
   (#198), and the MCP line as Claude sees it.
5. **Recipes**: check `recipes/s9-rules.ts`, `recipes/test/s9-rules.test.ts` and S1's `recipes/s9-r14*` helpers for
   pins of the old `DISARMED scope:"evaluate"` text. §4.20/§4.21 rows and Run 13/14 results are history and are never
   edited. A helper whose expected text describes the *current* product may be updated only with a dated comment;
   a helper that describes Run 13/14 history stays. Keep any constant those recipes import exported (or update the
   import with a dated comment). Recipes typecheck with `npx tsc --noEmit -p recipes/tsconfig.s9.json` (and the other
   recipe tsconfigs that cover touched files) — run them.
6. **Existing tests whose expected text changes**: change them only as this ruling orders, and list each one per file
   (file, test name, old expected → new expected) in your report, each traced to #202. No test removed. If a test in a
   file outside the lane (e.g. `daemon/test/safety.test.ts`) would have to change, do NOT edit it: stop and report
   (the daemon should pass any code through unchanged; a daemon test that feeds a fake extension's
   `DISARMED {scope:"evaluate"}` is still valid as pass-through).

## LANE

`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (§10 note), `shared/src/`, `extension/src/safety.ts` (and
`safety-call.ts`/the S4 store's refusal only if the code path demands — say so), `sdk/src/`,
`mcp/src/tools/registry.ts`, their `test/` dirs (`shared/test`, `extension/test`, `sdk/test`, `mcp/test`),
`recipes/s9-rules.ts` and its test (and `recipes/s9-r14*` only if they pin current-product text), `docs/setup.md`
(Safety), the steps dir. Anything else: stop and report. Never edit decisions.md, the as-built register or CLAUDE.md.

## After the code

- Run `npm run typecheck`, `npm test` (baseline at `41e6f5d` is 3145 / 130 — re-derive it first, e.g. from a
  `git stash`-free worktree or by running before your edits), `npm run build`; then `git status --short` must show no
  tracked change under any `dist/` (paste it).
- Grep the repo (excluding node_modules, dist, docs history) for every remaining producer of a `"evaluate"` scope and
  paste the result.
- **Do not commit the code.** Leave it uncommitted in the main tree for the independent verifier; the step agent will
  ask you (or a fixer) to commit it after the verdict.

## Report

Write `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S4b-builder.md`: built (files) · the spec commit's hash ·
test/typecheck/build results (pasted tails, counts before → after) · the new tests, per file · **changed expected
texts per file** (old → new, each traced to #202) · recipes: what was changed with a dated comment and what was left
as history, and why · the producer grep · deviations from the phase doc · Proposed decisions (with alternatives) ·
anything unfinished. Return a ≤ 10-line summary.
