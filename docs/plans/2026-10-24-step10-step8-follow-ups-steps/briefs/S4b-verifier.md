# S4b verifier brief — the new code `JS_DISABLED`

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server + Chrome MV3 extension;
TypeScript; vitest). Shell: Git Bash on Windows; put node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`. Checks: `npm run typecheck`,
`npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime gotchas" (the Step 9 safety block above all) and
"Testing philosophy" bind. HARD RULES: never commit or print the token; never bind anything but 127.0.0.1 (port 0,
never 9234); never push, never tag; never touch the user's real Chrome; never log URLs, titles, header values or
bodies. Report in the exact format requested. Never invent results — if something did not run, say so. No internal
codes without a one-line gloss. Model: Opus 5.5. You must NOT spawn agents. You may read and run; you may NOT edit
any tracked file in the main tree (your own report file excepted).

Also read `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/common.md` in full: its ESCALATION list,
SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR and LESSONS bind you verbatim.

## Role: independent Verifier (stage S4b)

Inputs: the builder's brief `briefs/S4b-builder.md` (all its inputs bind you too: phase doc 0.11, 0.12 with the F17
note, Stage S4b, exit checks S4b.1–S4b.3 with their notes, S4.3's F6 note; decisions.md #202, #133, #138, #163, #198,
#204, #218; stage0-audit F6/F17; spec §10; Step 9 as-built; Step 10 as-built register) **plus** the builder's report
`…-steps/S4b-builder.md`, labelled **claims to audit, not facts**.

The work: spec commit `2866c43` (on top of `41e6f5d`) + the uncommitted changes in the main tree (`git status`,
`git diff`). S4 close = `6ba2d10`.

## Tasks

1. **Clean worktree**: create a scratch worktree outside the repo's tracked paths (e.g. under
   `C:\Users\aliev\AppData\Local\Temp\claude\…\scratchpad` or `git worktree add` to a temp dir) at `2866c43`, apply
   the main tree's uncommitted diff (`git diff > patch; git apply`), link or install `node_modules` (a junction to
   the main tree's is fine), and run `npm run typecheck`, `npm test`, `npm run build` there. Re-derive the counts:
   before (at `41e6f5d`) and after; `npm test` must be before + n with no test removed (compare per-file counts).
   After the build, no tracked change under `dist/`. Remove the worktree when done (`git worktree remove`, `prune`).
2. **S4b.1**: `shared/src/codes.ts` lists 26 codes with `JS_DISABLED` on the wire list (25 on the wire); spec §10's
   note precedes the code (the code is still uncommitted — confirm `2866c43` touches only the spec, and that the note
   says what the brief requires).
3. **S4b.2**: with JavaScript off, `evaluate`, `evaluate {asRef}`, `evaluateSaveStart/Chunk/End`, and a
   `javascript:`/`data:`/`blob:` `navigate`/`newTab` answer `JS_DISABLED`; with the bridge off they answer
   `DISARMED` scope `"all"`; with JavaScript on nothing changes; an old extension's `DISARMED {scope:"evaluate"}` is
   still rendered by the SDK and the MCP as the JavaScript-off line. Each by a test; **prove every new or changed
   test fails at `6ba2d10`** (run the new test files against the S4-close source; for controls that pass at the base
   by design, show they are discriminating with a mutant).
4. **S4b.3**: `JS_DISABLED` not in `ATTACH_CODES` (test); the MCP renders it as one line, no report, no screenshot
   (test). Mutate (add it to the attach set; drop it from `withSafetyRefusals`/`safetyRefusalLine`) and show red.
5. **Producers**: grep the whole repo (src and recipes; not node_modules/dist) for every remaining producer of a
   `"evaluate"` scope / `DISARMED_EVALUATE` and list them with your judgement.
6. **Pass-through**: show the daemon and the SDK pass `JS_DISABLED` through unchanged (code reading of
   `daemon/src/wsHost.ts`/`route.ts` error handling and `sdk/src` `fromWire`, plus — if cheap — an ad-hoc probe over
   port 0 with a fake proto:2 extension, kept in your scratch dir, not committed). Check `browser_status`'s Safety
   line and `daemon.status.safety` are unaffected.
7. **Lane and scope**: every changed file is in the lane (see the builder brief); no change to which methods are gated
   or how (diff `METHOD_CLASSES`, the gate's order, `safety-call.ts`); the refusal carries no URL, pattern, title or id;
   no new log site (`log-scan`/`log-sentinel` pass); the SDK's exported surface (eight values) unchanged; MCP tool
   names and schemas unchanged.
8. **Changed expected texts**: check the builder's per-file list against the actual diff of every test file — every
   changed `expect` must be listed and be ordered by #202 (not the forbidden "edit a test's text to match a changed
   error"). Note S4's `s4-save-gate.test.ts:105` change against F6's prediction.
9. **docs/setup.md**: the Safety section quotes the code, the extension's message and the MCP line byte for byte from
   the code (#198) — check by extracting the strings from the source. List other stale mentions outside the lane.
10. **Recipes**: `recipes/s9-rules.ts` and its test still pass; judge the builder's "history, left unchanged" call;
    check the claim that `recipes/tsconfig.s6.json` already failed at the base with the same errors.
11. Judge the builder's Proposed decision (old extension's line keeps the `DISARMED:` prefix) against 0.12's F17
    note and the S4b.2 note ("still rendered by the SDK and MCP as the JavaScript-off line").

## Output

Write `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S4b-verifier.md`: numbered findings, each with severity
(CRITICAL / MAJOR / MINOR / NIT), location (`file:line`), evidence (command + output excerpt), suggested fix; each
exit check S4b.1–S4b.3 with PASS/FAIL and evidence; the counts; then the verdict: **FAIL** if any CRITICAL or MAJOR
finding or any exit check fails; MINOR/NIT only → **PASS-with-notes**; else **PASS**. Never rewrite the spec or the
plan. Return a ≤ 10-line summary.
