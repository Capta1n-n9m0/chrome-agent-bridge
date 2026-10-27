# Next session — Step 12: Phase F, ergonomics

**How to start:** working directory `C:\Users\aliev\Projects\chrome-remote-extention`, on Windows. The driver is not a
bridge client: `claude --strict-mcp-config --mcp-config <a file holding {"mcpServers":{}}>`. Paste everything below
the line.

---

Dear Claude, you are the SESSION AGENT for **Step 12 — Phase F, ergonomics** of the chrome-agent-bridge repo. Step 12
first runs **Run 18**, the helper-fix wave I ordered when I closed Step 11b (decisions-archive/step11b.md · 2026-10-27 ·
The user rules #318 and the cleanup proposals; Step 11b closes (#320) item 1). Then it builds the Phase F items I rule
in at G12-0: `args` for `browser_evaluate`, reading a page's console, a debugger session kept per tab, and answering
the native file chooser, plus any carried item I rule in. **AUTONOMOUS — I am away; do not block on me.** What waits
for me is `docs/agent-rules.md` §3 and the phase doc's Human gates.

## 1. First checks (in order; one journal line each, dated UTC)

1. **Precondition — G12-0.** My answers to the six questions in the phase doc's § For the user at G12-0 must be
   recorded in `docs/decisions.md` (one dated entry, by: the user), and Open decisions must read "None" apart from
   them. **If they are not:** write one journal line, then put the six questions to me as plain-language decision
   write-ups (for each: what it is, why it matters, the options, your recommendation; simple words; the phase doc's
   short glossary; questions grouped), and stop before Stage 0. Do not take the recommendations as defaults: several
   change what I see in my own browser.
2. **Record the ruling's consequences** in the phase doc as a dated note under the box: which stages run, which are
   "not in scope", and the order. For S6 (the ruled carried items), write each slice's lane, tests and exit check
   in the phase doc before it starts.
3. **Environment, re-checked and dated**, by an agent, not in your context: `git log -1`, `git status --short`
   (clean), `npm test` count (the last recorded is 4665 passed, 191 files, `docs/progress-and-roadmap.md` header;
   re-derive it), `npm run typecheck`, every `recipes/tsconfig*.json`, `npm run build` (exit 0, no tracked change);
   port 9234 free or held by `daemon/dist/index.js`; the fixture ports the live rows use; `node scripts/doc-check.mjs`.
   Whether the loaded extension matches `dist/` is proven by each live wave's first row. Environment notes:
   `docs/agent-rules.md` §1 and `recipes/CLAUDE.md`.
4. **Commits not pushed** since Step 11b's push: list them in the journal; pushing needs my grant (G12-1).

## 2. Binding documents, in reading order

1. **`docs/agent-rules.md`** — every agent's rules, yours included: §6–§7 (Opus builds and fixes contract and safety
   code and runs every verifier; Sonnet does recipes, fixtures, docs and live runners; every agent at medium effort,
   `model` and `effort` passed in every Agent call; three fix rounds per stage, #320; slices per #271) and §8 (a step
   agent never ends its turn on a running child, #286).
2. **The phase doc `docs/plans/2026-10-27-step12-phase-f.md`**, all of it: the candidates table (0.2), each item's
   decision and its options, how every item passes the safety gate (0.10), the stages with lane, risk, size cap and
   verifier focus, the exit checks, Human gates, STOP rules and forbidden fixes, and § As built, which you fill.
3. **The `long-run` skill** (your contract) and the **`step-agent` skill** (brief templates).
4. **Design of record** `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §5, §6.5 and §10 with their Step
   9–11b notes. Every contract change gets its dated §10 note in a commit before the code.
5. **What Step 12 builds on:** `docs/plans/2026-10-26-step11b-block-list-redirects.md` § As built and
   `…-steps/S7-run-record.md` §1 and §5 (Run 17b's rows and helper defects, Run 18's input);
   `docs/plans/2026-10-25-step11-file-upload.md` 0.7 and 0.13 (the upload target rule; the native file chooser);
   `docs/progress-and-roadmap.md` § Phase F; the package `CLAUDE.md` files of the code each stage touches (they load by
   themselves; a step agent whose lane spans packages reads each one).
6. **`docs/decisions.md`:** Open and Standing decisions, then the entries the phase doc cites: #129, #214, #226, #308,
   #311, #318, #320 (in `docs/decisions-archive/`).
7. `docs/setup.md` (Tools, Safety, Uploads) and `docs/e2e-test-plan.md` — never read whole: grep for the sections a
   stage touches (§4.23, §4.25, §5's Run 17b) and read those ranges.

**Precedence:** `docs/agent-rules.md` §4.

## 3. This phase's settings

- **Form: three levels**, one step agent per stage or slice; doers and verifiers per `docs/agent-rules.md` §6–§7.
- **Order and parallelism:** as the phase doc's 0.1 and Stages say, as ruled at G12-0. At most two step agents at
  once, only on file-disjoint lanes (S1's prep slices beside S2 is the planned case); every live slice alone, with no
  uncommitted code in the main tree. Host tests bind port 0; only the live slices start the real daemon on 9234.
- **Steps dir:** `docs/plans/2026-10-27-step12-phase-f-steps/`, created with an append-only `journal.md` and nothing
  else up front (`step-agent` skill § What a stage leaves). One journal line per spawned agent (stage · role · model ·
  effort · start and end UTC).
- **Briefs:** small, by pointer; name line ranges of big files; give hard size caps.
- **Commits:** `docs/agent-rules.md` §10.
- **Grants beyond the standing ones:** none. The live waves are yours on fixture pages (decisions.md · 2026-10-22 ·
  Live E2E waves are run by Claude end to end (#33)); Stage 0's Chrome measurements run in a scratch Chrome on its own
  temporary profile (decisions.md · 2026-10-26 · Stage 0 measures DNR in a separate scratch Chrome on a temporary
  profile (#294)), never a bare `chrome.exe` (#297). A new manifest permission, or a change to what I see beyond my
  G12-0 answers, comes back to me (G12-2).
- **Deviations from `docs/agent-rules.md`:** none.

## 4. Stage 0 — spec audit (one step agent, no feature code)

Before spawning it, record the phase doc's (proposed) decisions for the items in scope in `docs/decisions.md`
(contract-level ones under Open decisions) so the audit can attack them. The audit is the phase doc's Stage 0: its
lenses, the Chrome facts each in-scope item leaves "not confirmed" (0.4–0.9), A's defect list re-derived, the earlier
contracts re-run, and exit check Z.1. After it, write the stage split with estimates, risk tiers and size caps in
`journal.md`; a Stage 0 finding that rules out a recommended mechanism takes the phase doc's named fallback as a
proposed decision, not a STOP.

## 5. Close-out

`long-run` §5 in its order, with the gate checklist in the phase doc's § As built. After Step 12 the roadmap has the
Phase F follow-ups (response bodies on the kept session, console lines in `evaluate`) and Phase G (distribution); the
next step is mine to name. The final report leads with the decisions taken while I was away.

I trust you — decide well and leave a trail we can audit.
