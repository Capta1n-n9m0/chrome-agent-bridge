# S5 — verifier brief (Step 9, stage S5 "Docs")

Written 2026-10-24 by the S5 step agent. Read in order: `CLAUDE.md`; `briefs/common.md` (all of it binds
you); `.claude/skills/step-agent/role-prompts.md` (Common preamble + §Verifier bind you);
`docs/docs-writing-guide.md`; `briefs/S5-builder.md` (the builder's inputs, goal and exit criteria —
they are yours too); then the builder's report `S5-builder.md`, labelled **claims to audit, not facts**.

You are a level-2 agent: do NOT spawn agents; you may read and run, you may NOT edit any file except your
own report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S5-verifier.md`. Never touch Chrome, never
start the daemon, never bind 9234. Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`
first. Finish in one go.

## The diff

Uncommitted tree on HEAD ba6029e: `README.md`, `docs/setup.md`, `docs/progress-and-roadmap.md`,
`docs/e2e-test-plan.md` (`git diff`), plus the builder's proposed CLAUDE.md blocks in `S5-builder.md` §6.

## What to check (each a numbered finding if it fails)

1. **S5.1** — `setup.md` documents the three controls (toolbar button, options-page switches, shortcut)
   and the shortcut `Alt+Shift+K` with how to change it; every new gotcha in the proposed CLAUDE.md block
   cites a source — open each cited row ID / report § and confirm it says what the bullet says.
2. **Every factual claim in the new text** against the as-built register
   (`docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`) **and the code** (`extension/src/safety*.ts`,
   `router.ts`, `badge.ts`, `options.ts`, `extension/options.html`, `manifest.json`, `shared/src/codes.ts`,
   `protocol.ts`, `sdk/src/client.ts`, `mcp/src/tools/registry.ts`, `daemon/src/intercept.ts`). Quoted
   refusal/badge/title text must match the code byte for byte. The block-list grammar examples must
   behave as stated under `safety-match.ts` (run them through the matcher in a throwaway vitest or tsx
   snippet in your scratch directory if needed — not in the repo).
3. **#127**: grep the touched docs for `evaluate|bulk|chunk`; read every hit against decisions.md #127.
4. **Counts**: re-derive independently — `npm test` once (quote the tail), codes in `codes.ts`, wire codes,
   tools in the registry, router methods; every number in the touched docs and in the proposed CLAUDE.md
   text must match (including the roadmap's per-stage test table — check against stage reports).
5. **Leaks**: by count only — real hostnames (anything not a reserved name/fixture localhost), the token
   (read it inside the command, never print it), the real block-list patterns (you cannot know them: confirm
   no pattern appears other than reserved examples), user tab titles.
6. **Roadmap**: the open-decision list matches decisions.md → Open decisions → Step 9; Run 13 numbers match
   S4.md §4 (verifier's 24/7/3/5); Steps 10–12 match #129 with #194's four re-measurements in Step 10.
7. **Lane**: only the four docs (and §1 only of e2e-test-plan.md — confirm §4.20 and §5 unchanged by diff).
8. **Writing guide**: sample at least 10 paragraphs/bullets against `docs/docs-writing-guide.md`'s rules.
9. **The builder's two "brief vs code" claims** (no `commands.onCommand` listener per #142; the daemon resets
   safety to null on extension disconnect) — confirm or refute from the code.
10. **Proposed CLAUDE.md block**: anchors exist verbatim in CLAUDE.md; nothing in it contradicts an existing
    CLAUDE.md invariant; measured vs by-construction marking correct.

Output (role-prompts.md §Verifier): numbered findings, each with severity (CRITICAL / MAJOR / MINOR / NIT),
location, evidence (command + output excerpt), suggested fix; then the verdict: FAIL if any CRITICAL or
MAJOR or any exit check fails; MINOR/NIT only → PASS-with-notes; else PASS. Return a ≤ 15-line summary.

ESCALATION list, LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR and STOP rules: verbatim in
`briefs/common.md` and appended to `briefs/S5-builder.md`; they bind you.
