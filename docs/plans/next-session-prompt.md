# Next session — Step 12: Phase F, ergonomics — resume at S7-drivers-C

**How to start:** working directory `C:\Users\aliev\Projects\chrome-remote-extention`, on Windows. The driver is not a
bridge client: `claude --strict-mcp-config --mcp-config <a file holding {"mcpServers":{}}>`. Paste everything below
the line.

---

Dear Claude, you are the SESSION AGENT for **Step 12 — Phase F, ergonomics** of the chrome-agent-bridge repo, **resuming
mid-phase**. The product work is built and committed: Run 18 (S1), `args` for `browser_evaluate` (S2), console messages
(S3), the kept debugger session (S4), the native file chooser (S5) and G2, the blocking trusted action (S6-G2). What is
left is **Run 19**, the live wave that proves them in my real Chrome, then the docs and the phase close.
**AUTONOMOUS — I am away; do not block on me.** What waits for me is `docs/agent-rules.md` §3 and the phase doc's Human
gates.

**Resume: read the Current state block in `CLAUDE.md` and `docs/plans/2026-10-27-step12-phase-f-steps/journal.md` first.**
The previous session ran past 450k tokens and its agent tree died with it; nothing of it is running now.

## 1. First checks (in order; one journal line each, dated UTC)

1. **No orphans.** No listener on 9234 or 8080–8089 that this repo did not start, and no repo `node`/`python` process
   (`recipes/CLAUDE.md` names the checks). Leave the old session's scratch worktree `wtv` alone: it holds npm workspace
   links, and it is outside the repo (decisions.md · 2026-10-28 · S7-drivers-B accepted with its four rulings (#362);
   the #220 hazard in root `CLAUDE.md`).
2. **The tree is not clean, on purpose.** `git status` shows S7-drivers-C's uncommitted work: `recipes/s12-r19-c.ts`,
   `s12-r19-c.ps1`, `test/s12-r19-c.test.ts`, small edits in `s12-r19.ps1`, `-a.ps1`, `-b.ts`, `-lib.ps1`,
   `test/s12-r19-static.test.ts` and `tsconfig.s11b.json`, plus its builder, verifier (FAIL, three MAJOR) and fixer
   (round 1) reports in the steps dir. The changes in `-b.ts` turn some helpers into exports so `-c.ts` can reuse them.
   That is builder work the fixer's own file list leaves out. **Do not commit, stash or revert any of it before §4
   step 1 runs.**
3. **Environment, re-checked and dated**, by an agent, not in your context: `git log -1` (expect `9b14658` or a later
   bookkeeping commit), `npm test` count (the fixer reported 5506 passed, 230 files; re-derive it), `npm run typecheck`,
   all seven `recipes/tsconfig*.json`, `npm run build` (exit 0), `node scripts/doc-check.mjs`. Whether the loaded
   extension matches `dist/` is proven by each Run 19 slice's R19-0 row, not here.
4. **Commits not pushed:** 54 since Step 11b's push (`git log origin/main..main`). Pushing needs my grant (G12-1); list
   the count in the journal and do not push.

## 2. Binding documents, in reading order

1. **`docs/agent-rules.md`.** Every agent follows it, you included. §6–§7: Opus builds and fixes contract and safety
   code and runs every verifier, and Sonnet does recipes, fixtures, docs and live runners. Every agent runs at medium
   effort, with `model` and `effort` passed in every Agent call, and gets three fix rounds per stage. §8: a step agent
   never ends its turn on a running child (#286).
2. **The phase doc `docs/plans/2026-10-27-step12-phase-f.md`:** § S7 and § S8, the Exit checks (R7.1–R7.6, S8.1), Human
   gates, STOP rules and forbidden fixes, § As built (S7 and S8 still to write) and § Open items.
3. **The `long-run` skill** (your contract) and the **`step-agent` skill** (brief templates, the ledger).
4. **`docs/e2e-test-plan.md` §4.27 (Run 19), by grep only, never whole.** The rows, Slices and order, the Open items
   recorded before the run (1)–(17), Capture segments, R19-RESTORE and R19-LOGS. Also read the dated §4.27 notes from
   #358, #361 and #362, which settle sheet defects before any observation.
5. **`docs/decisions.md`:** Open decisions, then the S7 chain. That is decisions.md · 2026-10-28 · Run 18's findings:
   UP-OPT measured first, the banner FAILs carried to Run 19, DevTools proven by a probe, three helper fixes in S7
   (#351); #356–#359; decisions.md · 2026-10-28 · Run 19's row drivers are four more slices; S7-helpers-d's overrun
   accepted (#360); #361 and #362. Also read decisions.md · 2026-10-28 · A step agent that ends its turn on a running
   runner stalls the stage; live step agents wait in-turn (#350).
6. **What Run 19 drives:** `recipes/s12-r19*.ps1|ts` and `recipes/CLAUDE.md`. The previous live waves:
   `…-steps/S1-live.md`, `S1-live.ledger.md` and `S1-run-record.md` (Run 18, the form S7-live and S7-record follow).

**Precedence:** `docs/agent-rules.md` §4.

## 3. This phase's settings

- **Form: three levels**, one step agent per slice, doers and verifiers per `docs/agent-rules.md` §6–§7.
- **Sequential from here.** The live slices run alone, with no uncommitted code in the main tree. Host tests bind
  port 0, and only the live slices start the real daemon on 9234.
- **Steps dir:** `docs/plans/2026-10-27-step12-phase-f-steps/`, journal append-only, one line per spawned agent (stage ·
  role · model · effort · start and end UTC).
- **The stall that cost hours twice (#350, S7-drivers-B, S7-drivers-C):** a step agent ended its turn "waiting on" a
  verifier or runner. The child's completion notice then reached you, not the step agent, and the step agent never
  woke. Put #286 as the first line of every step brief. When a child's notice reaches you, check whether its step agent
  is still live. If it is not, start a **fresh** step agent from the reports (never a resume, `fresh-agents-not-resumes`
  memory) and journal it.
- **Caps:** driver slices 750 code lines, tests up to 600 (#361).
- **Grants beyond the standing ones:** none. Run 19 is yours on fixture pages (decisions.md · 2026-10-22 · Live E2E
  waves are run by Claude end to end (#33)). The old-build rows (R19-ARGS-OLD, R19-VERSION; §4.27 Open items (1), (7)
  and (17) name the builds) build in a scratch worktree with its own `npm ci`, never a shared `node_modules` (#220). A new manifest
  permission, or a change to what I see, comes back to me (G12-2).
- **Deviations from `docs/agent-rules.md`:** none.

## 4. The remaining work, in order

1. **Finish S7-drivers-C** (liveC19's drivers: the chooser rows and G2). Start a fresh step agent at that stage. It
   reads `S7-drivers-C-builder.md`, `-verifier.md` and `-fixer.md`, then runs **verifier round 2** (Opus, medium) over
   the working tree. The verifier re-runs the first verifier's mutants and checks the files the fixer did not list. On
   PASS or PASS-with-notes it writes `S7-drivers-C.md`, commits the slice (`test(e2e): S7-drivers-C …`) and returns its
   proposals. You then rule and record the next decision, with a dated §4.27 note before any Run 19 observation. The open
   points for that ruling are in the fixer's §2: the RECORD print form (implemented), MINOR-6 (CHOOSE-JSOFF's MCP leg;
   CHOOSE-KEPT on one page), and the DIALOGS line for liveA19 and liveB19, which no slice owns yet. On FAIL, fix rounds
   2–3 apply.
2. **S7-drivers-DE**, liveD19's and liveE19's drivers. Today `r19-old-args` and `r19-old-version` still print `NOT RUN`.
   Same form, same caps. Split it in two if the estimate passes 750.
3. **The UP-OPT investigator.** It is a read-only leaf, its report goes to `…-steps/S7-up-opt-investigator.md`, and it
   must be committed before liveB19 (§4.27 R19-UP-OPT; Open item 14; #360).
4. **S7-live, Run 19:** liveA19 → liveB19 → liveC19 → liveD19 → liveE19, each alone from a clean tree at a committed
   HEAD, as §4.27 Slices and order. Every slice starts with R19-0 and ends with R19-RESTORE and R19-LOGS. A STOP that
   escalates (the integrity floor) stops the wave and comes to me. Any other row FAIL is recorded, never fixed in the
   product mid-wave (forbidden fixes).
5. **S7-record:** the Run 19 record in `docs/e2e-test-plan.md` §5 and `…-steps/S7-run-record.md`, in the form of
   `S1-run-record.md`, with verdicts by row from counts, never from an `ok`.
6. **S8, docs:** as the phase doc's § S8. Exit check S8.1.
7. **Close-out:** `long-run` §5 in its order, with the gate checklist in the phase doc's § As built (S7 and S8 blocks).
   Use the `session-closeout` skill to refresh the Current state block, the roadmap and memory. Run the `cleanup-pass`
   skill as a full pass at the phase close. If the session runs long, write a resume point (the `phase-kickoff` skill)
   before your context gets tight, not after.

## 5. For me, when I return

The final report leads with the decisions taken while I was away, then Run 19's verdicts with the FAILs and NOT
MEASUREDs named. The questions still open for me:
- **G12-2:** add the `webNavigation` permission so G1 can be built? (#337)
- **G12-1:** push the commits.
- The open contract-level decisions in `docs/decisions.md` Open decisions.
- The formatter cap's direction (#355).

After Step 12 the roadmap has the Phase F follow-ups and Phase G (distribution). The next step is mine to name.

I trust you — decide well and leave a trail we can audit.
