# Next session — Step 13, resumed at Run 20's slice B (after a power cut)

> **Status:** Closed — spent. *Superseded 2026-10-30 (cleanup pass): Run 20 is recorded and the Step 13 docs (S6) are
> committed; the gate waits for the user (root `CLAUDE.md`, Current state). Do not resume from this prompt. The next
> kickoff is written after the user's rulings.*

**How to start:** working directory `<repo>` (the chrome-remote-extention checkout), on Windows. The driver is not a
bridge client: `claude --strict-mcp-config --mcp-config <a file holding {"mcpServers":{}}>`. Paste everything below
the line.

---

Dear Claude, you are the SESSION AGENT for **Step 13 — the Phase F follow-ups and Run 20** of the chrome-agent-bridge
repo, **resumed mid-step**. The code stages (Stage 0–S4) are built. Run 20's first live slice (liveA20) is recorded.
The last session was cut off by a power failure while it was building the driver for slice B. You finish Run 20,
record it, write the docs and close the step. **AUTONOMOUS — I am away; do not block on me.** What waits for me is
`docs/agent-rules.md` §3 and the phase doc's Human gates.

**Resume:** read the root `CLAUDE.md` Current state and `docs/plans/2026-10-29-step13-phase-f-followups-steps/journal.md`
first (its last RESUME POINT line is the plan). Do not revive the old session's agents; start fresh ones from the
ledgers and step reports (`agent-rules.md` §8).

## 1. First checks (in order; one journal line each, dated UTC)

1. **No orphans:** no listener on 9234 or 8080–8089 that this repo did not start, and no repo `node`/`python`/
   `powershell` process (`recipes/CLAUDE.md` names the checks). The power cut killed the daemon; that is expected.
2. **The tree is B3 and nothing else:** `git status --short` shows exactly the files listed in
   `S5-drivers-B3-verifier2.md` §2 (4 modified recipe files; `recipes/s13-win.ps1`, `recipes/test/s13-win-ps.test.ts`
   and the four B3 reports untracked). If anything else differs, stop and look before you touch it.
3. **Environment, re-checked and dated, by an agent, not in your context:** `git log -1`; the `npm test` count (expect
   5872 in 245 files, but re-derive it); `npm run typecheck`; all eight `recipes/tsconfig*.json`; `npm run build`;
   `node scripts/doc-check.mjs`. Whether the loaded extension matches `dist/` is proven by liveB20's R20-0B row.

## 2. Binding documents, in reading order

1. **`docs/agent-rules.md`**: §2 (the integrity floor: no pass rule changes after its result is seen), §6–§8 (models,
   effort passed in every Agent call, fix rounds, the in-turn wait), §10 (commits).
2. **The phase doc `docs/plans/2026-10-29-step13-phase-f-followups.md`:** § S5, Exit checks (G1.4, R5.1–R5.6), Human
   gates, STOP rules, forbidden fixes, and § As built for Stage 0–S4.
3. **`docs/e2e-test-plan.md` §4.28** (Run 20's sheet, with its dated notes) and the steps dir's reports:
   `S5-liveA20.md`, `S5-drivers-B.md`, `S5-drivers-B2.md`, `S5-drivers-B3-builder.md`, `-verifier.md`, `-verifier2.md`.
4. **The `long-run` skill** (your contract) and the **`step-agent` skill** (brief templates, the ledger).
5. **Decisions that bind** (`docs/decisions.md`, Log): 2026-10-30 · G1.4: corrected POP rows, written before they run,
   prove G1 in liveB20 (#407); 2026-10-29 · S5-drivers-B: #404's re-measurement withdrawn before it ran; the POP FAILs
   stand, cause a sheet clause (#406); 2026-10-29 · liveA20: actors are killed with their tree; preflight refuses a
   fixture port other than 8081 (#405); and the rest of Step 13's Log (#375 on).

**Precedence:** `docs/agent-rules.md` §4.

## 3. The remaining work, in order

1. **Close B3.** Commit B3's files with an explicit pathspec (verifier2 PASS-with-notes; its two NITs go into B4's
   brief). Record the proposed decisions not yet in `docs/decisions.md`: `S5-drivers-B2.md` §5 and
   `S5-drivers-B3-builder.md`'s proposed decision, numbered after #407. Amend #405's wording to the tree kill as built
   (B2's F5).
2. **The #407 addendum.** A builder writes R20-POP-BG-3, -FG-3 and -OTHER-3 into §4.28 as a dated addendum, exactly as
   #407 states; an Opus verifier checks every unchanged cell against the original rows by script and every changed
   clause against #407. Commit it **before any liveB20 observation** (R5.1). The `-2` names are taken by the withdrawn
   addendum; do not reuse them. If writing the rows shows #407 cannot be followed as worded, escalate; do not reword
   it.
3. **B4:** the entry script, slice B's blocks (now including the three `-3` rows and their readers, reusing slice A's
   POP actor and the human-style click), RESTORE and LOGS, and "How to run liveB20". Carry the handoffs in
   `S5-drivers-B2.md` §7 and `S5-drivers-B3-verifier2.md` §7. Split it if it passes about 600 lines.
4. **S5-drivers-C**, then **liveB20** and **liveC20**, each alone, from a clean tree at a committed HEAD.
5. **S5-record**, then **S6** (docs), then the close-out.

## 4. This phase's settings

- **Form: three levels.** One step agent per stage or slice; doers and verifiers per `docs/agent-rules.md` §6–§7.
- **The stall rule:** put #286 as the first line of every step brief. When a grandchild's notice reaches you, check
  that its step agent is alive; if not, start a **fresh** one from the ledger.
- **Journal:** one line per spawned agent (stage · role · model · effort · start and end UTC).
- **Grants:** Run 20 is yours on fixture pages (decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end
  (#33)), with the DevTools and old-build conditions of the phase doc's Human gates, Carried. Old-build rows build in a
  scratch worktree with its own `npm ci` (#220).
- **Committed docs** carry no local path and no user name (`docs/docs-writing-guide.md`, #374 item 2).
- **Deviations from `docs/agent-rules.md`:** none.

## 5. Close-out

Follow `long-run` §5 in its order: the gate checklist in the phase doc's § As built; the `session-closeout` skill
(Current state block, roadmap, memory); the `cleanup-pass` skill as a full pass. **Write a resume point (this skill)
early and often.** Twice now a session ended mid-stage, and the last one ran past 240k. Write one at every stage close,
and hand over before your context passes about 180k.

After Step 13 the roadmap has **Phase G kept minimal**: packaging for my own use. Do not write that kickoff until I
rule Step 13's gate.

## 6. For me, when I return

The final report leads with the decisions you took while I was away, then Run 20's verdicts, naming the FAILs and NOT
MEASUREDs. **G1.4** comes first: R20-POP-BG-3's verdict, and the `human` leg's `popup-opened` reading. If a popup opened
and nobody got its lease, say so plainly; it is a product finding. Then #385 and #389. Write each open question in plain
words: what it is, why it came up, the options, your recommendation. Keep the prose light; short sentences. Group them
with a short answer table at the end. Pushing (G13-1) waits for me.

I trust you — decide well and leave a trail we can audit.
