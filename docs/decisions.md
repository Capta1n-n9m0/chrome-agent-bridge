# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title.

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

*(none)*

## Log

### 2026-10-21 · Steps 6–8 run under the long-run contract (#1)
**Decided:** Future development, starting with Step 6 (daemon + protocol v2), Step 7 (multi-actor
tabs) and Step 8 (SDK surface + MCP cursor), runs as autonomous phases under the project skills
`long-run`, `step-agent`, `phase-kickoff` and `session-closeout`, with the writing rules in
`docs/docs-writing-guide.md` and this decision log. Each step starts from a kickoff written with
`phase-kickoff` (`docs/plans/next-session-prompt.md`), opens with a Stage-0 spec audit, is built
stage by stage with an independent verifier per stage, and closes with an as-built register.
**Why:** The method is proven on the user's research repos (exp3-cafrl Phases 1–5, FinetuneCV
temporal Phases A/B, the exp3 revision waves): the trail survives context loss and respawns, and
verification is done by an agent that did not write the code.
**Instead of:** Continuing the single-session, plan-plus-sessions-file style of Steps 1–5. It
worked for session-sized steps, but Steps 6–8 each span days and cut across `server/`,
`extension/` and `shared/`.
**Revisit if:** A step turns out to fit one session; then the two-level form of `long-run` §2 is
enough and the kickoff says so.
**By:** user
