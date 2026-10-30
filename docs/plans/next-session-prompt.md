# Next session — Step 14, Phase G (minimal): a clean install on the user's other Windows devices

**How to start:** working directory `<repo>` (the chrome-remote-extention checkout), on Windows. The driver is not a
bridge client: `claude --strict-mcp-config --mcp-config <a file holding {"mcpServers":{}}>`. Paste everything below
the line.

---

Dear Claude, you are the SESSION AGENT for **Step 14: Phase G, kept minimal** in the chrome-agent-bridge repo. The
bridge works on this machine. I want it to work just as well on my other **Windows** devices: I clone the repo, run one
command, load the extension, and both Claude Code (MCP) and my SDK scripts drive Chrome without trouble. One command
installs, one checks ("doctor"), and one updates. Scripts can run from any folder. The MCP failure report prints the
screenshot path with my home folder as `~`. Size the testing to the change: unit tests and one rehearsal on a scratch
clone, not a live wave. **AUTONOMOUS: I am away, so do not block on me.** What waits for me is `docs/agent-rules.md` §3 and
the phase doc's Human gates.

## 1. First checks (in order; one journal line each, dated UTC)

1. **Precondition:** decisions-archive/step13.md · 2026-10-30 · The user rules Step 13's gate; Step 13 closes (#420).
   `docs/decisions.md` → Open decisions is empty. If it holds anything this step touches, write one journal line and
   stop for me.
2. **Push state:** Step 13 is committed but maybe not pushed (G13-1). Check `git status` and `git log origin/main..HEAD`,
   and record the result. Do not push (G14-1).
3. **Environment, re-checked by an agent, not in your context:** `git log -1`; the `npm test` count (expect 6030 in 251
   files, but re-derive it); `npm run typecheck`; all eight `recipes/tsconfig*.json`; `npm run build`;
   `node scripts/doc-check.mjs`; whether the loaded extension matches `dist/` (Step 13's build; no extension code changed
   since S4).
4. Create the steps dir `docs/plans/2026-10-30-step14-phase-g-own-devices-steps/` with `journal.md`.

## 2. Binding documents, in reading order

1. **The phase doc `docs/plans/2026-10-30-step14-phase-g-own-devices.md`:** the work, risk tiers, exit checks, human
   gates, STOP rules and forbidden fixes. It is short. Read all of it.
2. **`docs/agent-rules.md`:** §2 (the integrity floor), §6–§8 (models, effort passed in every Agent call, fix rounds,
   the in-turn wait), §10 (commits).
3. **`docs/setup.md` §1–§4** (today's install, the one this step replaces) and **`recipes/CLAUDE.md`** (Windows and
   PowerShell 5.1 facts; `reload-extension.ps1`).
4. **`sdk/CLAUDE.md`** (connect, the repo-root token lookup, the failure report) and **`mcp/CLAUDE.md`**.
5. **The `long-run` skill** (your contract) and the **`step-agent` skill** (brief templates, the ledger).
6. **Decisions that bind:** #420 above; decisions-archive/step12.md · 2026-10-29 · The user rules Step 12's gate; Step 12
   closes (#374), items 2 and 11 (no local path or name in committed docs; Phase G minimal);
   decisions-archive/step10.md · 2026-10-25 · Scratch worktrees never share `node_modules` through a junction a recursive
   delete can follow (#220).

**Precedence:** `docs/agent-rules.md` §4.

## 3. This phase's settings

- **Form: two levels** (phase doc 0.2). You run each stage with one builder and one verifier and keep their output out
  of your context. Put #286 as the first line of every brief anyway.
- **Lanes:** S1 may run beside S2. Everything else runs one stage at a time.
- **Grants:** the rehearsal on a scratch clone is yours. My real `~/.claude.json`, the loaded extension (beyond a reload
  by `recipes/reload-extension.ps1`) and its Options are not (G14-2). The token is never printed, logged or committed.
- **Committed docs** carry no local path and no user name (`docs/docs-writing-guide.md`).
- **Deviations from `docs/agent-rules.md`:** none.

## 4. Stage 0: spec audit

First record the phase doc's proposed decisions (0.2–0.7) in `docs/decisions.md`, numbered from 421, so the audit can
attack them. Then run the phase doc's Stage 0 (its lenses and measurements) and write the stage split into the journal.

## 5. Close-out

`long-run` §5: the As built blocks, the gate checklist, `session-closeout`. At the close, ask me for G14-1 (the push),
because my other devices get the code from GitHub. After that, my own test on another device (U.1) may turn up a
small follow-up. Wider distribution stays for later (#374).
