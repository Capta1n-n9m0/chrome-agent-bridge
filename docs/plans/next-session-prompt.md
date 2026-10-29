# Next session — Step 13: the Phase F follow-ups and Run 20

**How to start:** working directory `<repo>` (the chrome-remote-extention checkout), on Windows. The driver is not a
bridge client: `claude --strict-mcp-config --mcp-config <a file holding {"mcpServers":{}}>`. Paste everything below
the line.

---

Dear Claude, you are the SESSION AGENT for **Step 13 — the Phase F follow-ups and Run 20** of the chrome-agent-bridge
repo. It is a small step. It builds G1 (a background opener's popup gets leased to the opener's client, with the
`webNavigation` permission), keeps the page's key order in `evaluate`'s value, fixes the replayed console object if a
cheap way exists, makes the console cap keep the newest lines, and corrects two texts. Then **Run 20** proves them in
my real Chrome and re-measures Run 19's rows that a helper or sheet defect limited, plus two DevTools conditions.
**AUTONOMOUS — I am away; do not block on me.** What waits for me is `docs/agent-rules.md` §3 and the phase doc's Human
gates.

## 1. First checks (in order; one journal line each, dated UTC)

1. **Precondition:** decisions-archive/step12.md · 2026-10-29 · The user rules Step 12's gate; Step 12 closes (#374).
   `docs/decisions.md` → Open decisions reads "None". If it holds anything this step touches, ask me before Stage 0.
2. **No orphans:** no listener on 9234 or 8080–8089 that this repo did not start, and no repo `node`/`python` process
   (`recipes/CLAUDE.md` names the checks).
3. **Environment, re-checked and dated, by an agent, not in your context:** `git log -1` and a clean tree;
   `git rev-list --count origin/main..HEAD` (expect 0 after Step 12's push); the `npm test` count (re-derive it, do not
   copy it); `npm run typecheck`; all seven `recipes/tsconfig*.json`; `npm run build`; `node scripts/doc-check.mjs`.
   Whether the loaded extension matches `dist/` is proven by Run 20's R20-0 row, not here.
4. **Create the steps dir** named in the phase doc's header, with `journal.md` (append-only).

## 2. Binding documents, in reading order

1. **`docs/agent-rules.md`**, which binds every agent, you included: §6–§8 (models, effort passed in every Agent call,
   fix rounds, the in-turn wait), §10 (commits).
2. **The phase doc `docs/plans/2026-10-29-step13-phase-f-followups.md`:** the Decisions (proposed; Stage 0 attacks
   them), Stages with their risk tiers, lanes and caps, Exit checks, Human gates, STOP rules and forbidden fixes.
3. **The `long-run` skill** (your contract) and the **`step-agent` skill** (brief templates, the ledger).
4. **What Step 13 builds on:** `docs/plans/2026-10-27-step12-phase-f.md` § As built and its gate checklist;
   `…-step12-phase-f-steps/Stage0.md` §6 (the S6-G1 draft); `S7-run-record.md` (the causes of ARGS-1 and CON-NOTEA, the
   re-measurement list's rows); the design spec's §10 with its dated notes.
5. **Decisions that bind:** #374 (above); decisions-archive/step12.md · 2026-10-27 · Stage 0: G1 waits for G12-2; it
   stays a documented limit (#337); · 2026-10-29 · Run 19's record accepted; its findings go to the user and a later
   recipes-only wave (#373); · 2026-10-29 · liveB19 closed at attempt 3; docked DevTools on Chrome 156 does not refuse
   the bridge's debugger (#369); · 2026-10-28 · A step agent that ends its turn on a running runner stalls the stage;
   live step agents wait in-turn (#350).
6. **The package `CLAUDE.md` files** of every package a stage touches (they load when you open a file there).

**Precedence:** `docs/agent-rules.md` §4.

## 3. This phase's settings

- **Form: three levels.** One step agent per stage or slice; doers and verifiers per `docs/agent-rules.md` §6–§7.
- **Lanes:** S1 goes first because it changes the manifest. S2, S3b and S4 may run beside it once S1's spec note is
  committed (phase doc 0.1); parallel stages commit with an explicit pathspec. Run 20's live slices run alone, from a
  clean tree at a committed HEAD. Host tests bind port 0; only the live slices start the real daemon on 9234.
- **Journal:** one line per spawned agent (stage · role · model · effort · start and end UTC).
- **The stall rule:** put #286 as the first line of every step brief. When a grandchild's notice reaches you, check
  that its step agent is alive; if not, start a **fresh** one from the ledger, never a resume (`agent-rules.md` §8).
- **Grants beyond the standing ones:** the `webNavigation` permission (#374 item 1); reload the extension with
  `recipes/reload-extension.ps1` after S1 lands. Run 20 is yours on fixture pages (decisions.md · 2026-10-22 · Live E2E
  waves are run by Claude end to end (#33)). Run 20 may open DevTools undocked, and before the bridge's first attach,
  only in windows it opened itself on fixture pages, and it closes them (phase doc, Human gates, Carried). Old-build
  rows build in a scratch worktree with its own `npm ci`, never a shared `node_modules` (#220).
- **Committed docs** carry no local path and no user name (`docs/docs-writing-guide.md`, #374 item 2).
- **Deviations from `docs/agent-rules.md`:** none.

## 4. Stage 0, then the stages

Before Stage 0, number the phase doc's proposed decisions in `docs/decisions.md` (numbered after #374) so the audit can attack
them. Stage 0 runs as the phase doc says, alone, first: code citations executed, counts recomputed, the blind spots,
and the two measurements in a **scratch Chrome on its own temporary profile**, never my profile (#294, #297): whether
`Runtime.getProperties` reads a replayed object without running page code (CON-NOTEA), and G1's event shape. After it,
journal the stage split, then run S1 → S2/S3a/S3b/S4 → S5 (Run 20: sheet, helpers and drivers, live, record) → S6
(docs). At each stage close, write its **As built** block in the phase doc.

## 5. Close-out

Follow `long-run` §5 in its order: the gate checklist in the phase doc's § As built; the `session-closeout` skill
(Current state block, roadmap, memory); the `cleanup-pass` skill as a full pass. If the session runs long, write a
resume point (the `phase-kickoff` skill) **before** your context gets tight; the last session ran past 250k.

After Step 13 the roadmap has **Phase G kept minimal**: packaging for my own use. Distribution to a wider audience
comes later (#374 item 11). Do not write that kickoff until I rule Step 13's gate.

## 6. For me, when I return

The final report leads with the decisions you took while I was away, then Run 20's verdicts, naming the FAILs and NOT
MEASUREDs. Write each open question in plain words: what it is, why it came up, the options, your recommendation. Group
them with a short answer table at the end. Pushing (G13-1) waits for me.

I trust you — decide well and leave a trail we can audit.
