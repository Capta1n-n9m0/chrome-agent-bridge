# Step 11 kickoff — D3 file upload (`browser_upload_file`, `Tab.upload`), with Step 10's ordered follow-ups

Written 2026-10-25 with the `phase-kickoff` skill (phase kind), under the lean procedures (decisions.md · 2026-10-25 ·
Lean procedures: rules by pointer, package CLAUDE.md files, risk-tiered models (#230)); the earlier 7.6k-word version
is in git at `0e79130`. Paste everything below the line into a **fresh** Claude Code session started in
`C:\Users\aliev\Projects\chrome-remote-extention`, launched so that it is **not a bridge client**:
`claude --strict-mcp-config --mcp-config <scratch>\no-mcp.json`, where the file holds `{"mcpServers":{}}`.

---

Dear Claude, you are the SESSION AGENT for **Step 11 — D3 file upload** of the chrome-agent-bridge repo. Step 11 lets
a script or an agent put local files into a page's `<input type="file">` (`Tab.upload` in the SDK,
`browser_upload_file` in the MCP) through CDP `DOM.setFileInputFiles`, with the folders files may come from held by
the human in Chrome. First it builds the two small items the user ordered at Step 10's close; its live wave also
re-measures the ~1.5 s capture switch (SW-2). **AUTONOMOUS — I am away; do not block on me.** What waits for me is
`docs/agent-rules.md` §3 and the phase doc's Human gates.

This is the first step under the lean procedures, and it is a trial: the rules live in files, this prompt only
points to them. If something you need is missing from those files, that is a finding: record it in the journal
and add it where it belongs, not to a brief.

## 1. First checks (in order; one journal line each, dated)

1. **Precondition:** met. The user ruled every Step 10 open decision (decisions.md · 2026-10-25 · The user rules on
   Step 10's open decisions; Step 10 closes (#229)).
2. **Package CLAUDE.md loading on Windows.** Spawn one general-purpose Opus subagent: "Open `sdk/src/index.ts` with
   the Read tool. Then list the first heading line of every CLAUDE.md content in your context, verbatim, and say
   which appeared after the Read. Do not open any CLAUDE.md yourself." Expected: the root file at start,
   `sdk/CLAUDE.md` after the Read, no other package file. Then a second subagent the same way with
   `extension/src/content/a11y.ts`: expected `extension/CLAUDE.md` and `extension/src/content/CLAUDE.md`. Record both. If a file did not load, amend `docs/agent-rules.md` §1 to "read the `CLAUDE.md` of each package you
   touch" and record that as a decision; briefs stay as they are.
3. **Environment, re-checked and dated:** `git log -1` and `git status --short` (clean); `npm test` count,
   `npm run typecheck`, `npm run build` (exit 0, no tracked change), run by an agent, not in your context; port 9234
   free; 23 tools, 26 codes, 26 router methods (`node scripts/doc-check.mjs` prints the code's counts); whether the
   loaded extension matches `dist/` is proven by S5's first row. Environment notes: `docs/agent-rules.md` §1.

## 2. Binding documents, in reading order

1. **`docs/agent-rules.md`**: every agent's rules, yours included (integrity floor, stop list, discrepancies, roles,
   models by risk, waiting and fresh agents, report, commits).
2. **The phase doc `docs/plans/2026-10-25-step11-file-upload.md`**, all of it: Decisions 0.1–0.14 (those marked
   **(user)** were ruled; the rest are proposals Stage 0 attacks), the stages with lane, risk, budget and verifier
   focus, the pre-registered exit checks, Human gates, STOP rules and forbidden fixes, and § As built, which you fill.
3. **The `long-run` skill** (your contract) and the **`step-agent` skill** (brief templates).
4. **Design of record** `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §5, §6, §10 with the Step 9 and
   Step 10 dated notes. A new code amends §10 first.
5. **Contracts Step 11 builds on:** `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md` and
   `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`, the "Contracts (binding forward)" sections.
6. **`docs/decisions.md`:** Open decisions and Standing decisions, then the entries the phase doc cites.
7. `docs/setup.md` (Safety; Running JavaScript; Writing a script) and `docs/e2e-test-plan.md` §1 items 8–9, §4.20–4.22
   and §5 Runs 13–15, when a stage touches them. Live-run and Windows tooling facts: `recipes/CLAUDE.md`.

**Precedence:** `docs/agent-rules.md` §4.

## 3. This phase's settings

- **Form: three levels.** One step agent per stage (Stage 0, S1–S6); each spawns a fresh builder (or live runner),
  an independent verifier, and at most two fix rounds.
- **Models:** by each stage's risk in the phase doc, per `docs/agent-rules.md` §7.
- **Order and parallelism:** Stage 0 → S1 → S2 → (S3 ∥ S4, file-disjoint) → S5 alone, with no uncommitted code in
  the main tree → S6. At most two step agents at once. Host tests bind port 0; only S5 starts the real daemon on 9234.
- **Steps dir:** `docs/plans/2026-10-25-step11-file-upload-steps/`. Create it with an append-only `journal.md`, and
  nothing else up front: no copy of this prompt, no common brief, no saved briefs (`step-agent` skill § What a stage
  leaves).
- **For the trial** (`docs/plans/2026-10-25-lean-procedures.md` § Trial): one journal line per spawned agent (stage ·
  role · model · start and end time, UTC), and each step report lists the verifier's findings by severity.
- **Commits:** `docs/agent-rules.md` §10.
- **Grants beyond the standing ones:** none. Run 16 is yours on fixture pages (decisions.md · 2026-10-22 · Live E2E
  waves are run by Claude end to end (#33)); the phase doc's Human gates say what that covers and what needs me
  (G11-1 any push or tag, G11-2 any non-fixture upload).
- **Deviations from `docs/agent-rules.md`:** none.

## 4. Stage 0 — spec audit (one step agent, no feature code)

Before spawning it, record the phase doc's **(proposed)** decisions, and the proposed details under its (user)
headings, in `docs/decisions.md`, so the audit can attack them; contract-level ones go under Open decisions.

The audit is the phase doc's Stage 0 (its lenses, seed lists and exit check Z.1). After it, write the stage split
with estimates and risk tiers in `journal.md`.

## 5. Close-out

`long-run` §5, and the trial numbers into `docs/plans/2026-10-25-lean-procedures.md` § Trial. Then `phase-kickoff` for the next step: **the
block list stops redirected requests** (#140, its own small step by #229), then **Step 12 — Phase F** (decisions.md ·
2026-10-24 · The roadmap after Step 8 (#129)). The final report leads with the decisions taken while I was away.

I trust you — decide well and leave a trail we can audit.
