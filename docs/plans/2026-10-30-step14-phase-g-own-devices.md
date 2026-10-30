# Step 14 — Phase G, minimal: a clean install on the user's other Windows devices

**Date:** 2026-10-30 · **Status:** Planned · **Design of record:** this doc's "Decisions"; the design spec
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` binds for everything it does not change · **Carried from:**
`docs/plans/2026-10-29-step13-phase-f-followups.md` (closed by #420; its § Follow-ups) · **Steps dir:**
`docs/plans/2026-10-30-step14-phase-g-own-devices-steps/` (created at kickoff).

> **PRECONDITION (G14-0): met.** The user ruled Step 13's gate and named this step's scope:
> decisions-archive/step13.md · 2026-10-30 · The user rules Step 13's gate; Step 13 closes (#420), items 1 and 7, with
> #374 item 11 (Phase G minimal, for the user's own use). The user's answers on 2026-10-30: the other devices run
> **Windows**; on them **both Claude Code (MCP) and SDK scripts** drive Chrome.

## Why

The bridge works on the machine it was built on. That machine was set up by hand over many steps: the token, the MCP
entry in `~/.claude.json`, the unpacked extension and its Options, the build. The user wants the same on their other
Windows devices "without any trouble": clone, run one thing, load the extension, and both Claude Code and scripts
work. Today that takes reading a 1 470-line `docs/setup.md`, whose install section is mostly upgrade history.

Phase G is small on purpose (#374 item 11): packaging for the user's own use, the extension stays unpacked, no Web
Store, no wider audience. Testing is sized to the change (#420 item 1): unit tests and a scripted rehearsal, not a live
wave of rows.

## Outcome (planned)

- **One install command** on a fresh Windows device after `git clone`: checks the prerequisites, installs and builds,
  creates `bridge.token` if there is none, registers the MCP server with Claude Code at user scope, and says exactly
  what to do in Chrome (the folder to load, where to paste the token).
- **One check command** ("doctor") that says in plain lines whether each part works: Node, the build, the token, the
  MCP entry, the daemon, the extension connected and running the current build. Each failed line names its fix.
- **One update command:** pull, install, build, reload the extension (`recipes/reload-extension.ps1`), and the hint to
  run `/mcp`.
- **Scripts from any folder:** a script outside the repo can import the SDK and find the token, by one documented way.
- **A short "Install on a new device" page** at the top of `docs/setup.md` (or its own file), with the long upgrade
  history moved below or out.
- **The `~` path (#417 (c)):** the MCP failure report prints the screenshot path with the home folder as `~`.
- Counts unchanged: **25 tools, 28 router methods, 27 codes (26 on the wire)**; no new permission; no protocol change.

## Decisions

**(user)** marks a choice already ruled. **(proposed)** marks Claude's proposal; the session agent records each in
`docs/decisions.md` (numbered from 421) before Stage 0, so the audit can attack it.

### 0.1 Scope (user, #374 item 11, #420 items 1 and 7)
Windows only; unpacked extension; Claude Code and the SDK as clients; the `~` path with unit tests only.

### 0.2 Form and order (proposed)
Two levels, not three: the session agent runs each stage with one builder and one verifier (`docs/agent-rules.md` §6–§7
for models and fix rounds). Stage 0 → S1 the `~` path → S2 install, doctor, update → S3 scripts from any folder →
S4 the rehearsal → S5 docs. S1 may run beside S2 (disjoint files).

### 0.3 The scripts are PowerShell 5.1 or Node (proposed; Stage 0 decides)
Whatever runs on a fresh Windows 11 with only Node, git and Chrome installed, without changing the execution policy for
the machine (`powershell -NoProfile -ExecutionPolicy Bypass -File …` as `recipes/reload-extension.ps1` does, or `npm run
<script>` calling Node). Prefer Node where it can do the job; PowerShell only for Windows UI or clipboard.

### 0.4 The token reaches the extension without being printed (proposed; Stage 0 decides)
The token is a password and is never printed or logged (root `CLAUDE.md` invariants). The install command puts it on
the clipboard for the Options page (and says so), or opens the Options page; it never writes it to the console, a log
or a committed file. The MCP entry carries no `BRIDGE_TOKEN` (the `bridge.token` file is found from the repo root).

### 0.5 The MCP entry is registered by `claude mcp add`, user scope (proposed)
Idempotent: an existing `chrome-agent-bridge` entry pointing at this checkout is left alone; one pointing elsewhere is
reported and replaced only with a flag. If the `claude` CLI is missing, the command says what to add and where.

### 0.6 Scripts from any folder (proposed; Stage 0 measures)
Stage 0 measures which way works on Windows with npm workspaces and the SDK's repo-root token lookup: `npm link`, a
`file:` dependency, or importing `<repo>/sdk/dist`. One way is documented; the others are not.

### 0.7 Not in Step 14 (proposed)
A Web Store or signed build, macOS/Linux, a stable extension key, auto-update, R20-G2-1 (the covered-window screenshot),
the Phase F items left out, and the Run 20 helper proposals: all stay in Follow-ups.

## Stages

### Stage 0 — Spec audit and measurements (1 h, first, alone; risk: standard)
Lenses: every path and command this doc names exists or is marked new; re-run Step 13's contract tests on port 0; the
counts recomputed (`node scripts/doc-check.mjs`). Measure, on this machine without touching the user's setup: 0.3 (what
a fresh shell has), 0.4 (clipboard from Node or PowerShell), 0.6 (the three ways, in a scratch folder), and how a fresh
clone in a scratch folder behaves (`npm ci`, `npm run build`, its own `bridge.token`). Exit: a `Stage0.md` with each
proposed decision kept or changed, and the stage split in the journal.

### S1 — The `~` path (30 min; risk: low; cap 100)
`sdk/src/error.ts` failure report: a screenshot path under the home folder prints as `~\…`; other paths unchanged;
the file is still saved where it was. Unit tests only (#420 item 1).

### S2 — Install, doctor, update (2 h; risk: standard; cap 450)
The three commands of the Outcome, with unit tests for their pure logic (prerequisite checks, the MCP entry decision,
the doctor's verdict lines). The `chrome.*` side is not unit-tested; the doctor reads it through the SDK
(`daemon.status`, `browser_status`'s facts).

### S3 — Scripts from any folder (1 h; risk: low; cap 200)
The way 0.6 picked, a one-file example script, and its doc section.

### S4 — The rehearsal (1 h; risk: standard)
A fresh clone in a scratch folder on this machine runs install (with the MCP registration pointed at a scratch config
or in a dry-run mode, never the user's `~/.claude.json`), doctor and update; every line is recorded in
`S4-rehearsal.md`. The live part is one check: the doctor against the user's running bridge reports every part green.
No row sheet, no fixture wave.

### S5 — Docs (1 h, last; risk: low)
"Install on a new device" first in `docs/setup.md` (or a new `docs/install.md` it links), the upgrade history moved
down; `README.md` quick start; root `CLAUDE.md` Commands.

## Exit checks (pre-registered)

- **Z.1** Stage 0's `Stage0.md` exists and each proposed decision is kept or changed with a reason.
- **P1.1** S1's tests show a home-folder path as `~\…` and a non-home path unchanged; no other message changes.
- **I2.1** install on a scratch clone ends with exit 0 and the next steps printed; a second run changes nothing.
- **I2.2** no output, log or file of S2–S4 contains the token (a scan of the rehearsal's captures, as the LOGS scans did).
- **I2.3** doctor names every failed part with its fix (unit tests over each failure case).
- **I2.4** update on the scratch clone ends with exit 0.
- **S3.1** the example script runs from a folder outside the repo and lists the tabs it may see.
- **R4.1** the doctor against the user's running bridge prints every part green.
- **D5.1** a reader can install from the new section alone (the verifier follows it on the scratch clone);
  `node scripts/doc-check.mjs` clean.
- **Counts at the close:** 25 tools, 28 router methods, 27 codes (26 on the wire).
- **U.1 (the user, after the close):** the install works on one of the user's other devices. Not a gate for the close;
  its findings become a small follow-up.

## Human gates

- **G14-1** any push or tag. The other devices get the code by `git pull` from GitHub, so the close asks for this grant.
- **G14-2** any change to the user's real setup on this machine: `~/.claude.json`, the loaded extension beyond a
  reload by `recipes/reload-extension.ps1`, its Options, the safety state. The rehearsal uses a scratch clone and a
  scratch MCP config.
- **G14-3** a manifest change, a new permission, or anything that changes what the human sees in Chrome.
- **Carried:** reloads by `recipes/reload-extension.ps1`, one re-run on exit 2 (#65, #99); scratch worktrees and clones
  never share `node_modules` through a junction (#220).

## STOP rules and forbidden fixes

- STOP: the token appears in any output, log or file (I2.2); the user's `~/.claude.json` or real extension is changed
  outside G14-2; a verifier FAILs after the allowed fix rounds.
- Forbidden: printing the token to make a step easier; editing the user's config "to test"; changing any message other
  than the screenshot path; loosening a test to pass.

## As built

(filled at each stage close)

## Follow-ups

- From Step 13: R20-G2-1, a fully covered window's screenshot times out; the Phase F items left out; the Run 20 helper
  proposals 2–3; dropping the SDK's and MCP's own `focusTab` before a trusted input (#354).
- Distribution to a wider audience (a Web Store build, other operating systems): later, by the user's choice (#374).
