# Step 14 — Phase G, minimal: a clean install on the user's other Windows devices

**Date:** 2026-10-30 · **Status:** Built; the gate waits for the user (#432, G14-1) · **Design of record:** this doc's "Decisions"; the design spec
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
  *(2026-10-30, Stage 0, #432: nothing reports the loaded extension's build; the doctor says "connected" and, as a
  named heuristic, "may be older than the build". It never spawns or hands over a daemon.)*
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

*(2026-10-30, Stage 0: the split below is amended by #427–#431: the commands are `npm run setup`, `npm run doctor`,
`npm run bridge-update`; S2 runs as S2a (setup and shared logic, cap 300) then S2b (doctor and update, cap 300); S3
needs S1 and S2a; S4 needs S2b and S3 and runs update with `--no-reload` and a scratch `CLAUDE_CONFIG_DIR`; S1's lane
adds `recipes/test/s12-r19-static.test.ts`. Stage0.md §6.)*

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
down; `README.md` quick start; root `CLAUDE.md` Commands. *(As built: the separate-file option was not taken; the section is in `docs/setup.md`, § As built S5. Note added 2026-10-30, cleanup pass 2.)*

## Exit checks (pre-registered)

- **Z.1** Stage 0's `Stage0.md` exists and each proposed decision is kept or changed with a reason.
- **P1.1** S1's tests show a home-folder path as `~\…` and a non-home path unchanged; no other message changes.
- **I2.1** install on a scratch clone ends with exit 0 and the next steps printed; a second run changes nothing.
- **I2.2** no output, log or file of S2–S4 contains the token (a scan of the rehearsal's captures, as the LOGS scans did).
- **I2.3** doctor names every failed part with its fix (unit tests over each failure case).
- **I2.4** update on the scratch clone ends with exit 0.
- **S3.1** the example script runs from a folder outside the repo and lists the tabs it may see.
- **R4.1** the doctor against the user's running bridge prints every part green.
  *(2026-10-30, #432: "the extension's build" is the heuristic line; green = connected and not flagged older.)*
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

All reports are in the steps dir; the journal there has one line per event. Every agent ran at medium effort.

- **Stage 0** (`Stage0.md`, Opus): 2 CRITICAL (an npm script named `install` is a lifecycle hook; nothing reports
  the loaded extension's build), 7 MAJOR. Decisions #427–#432 changed or settled 0.3–0.6; #432 is open for the user.
  A fresh clone's `npm test` shows 9 red tests in `recipes/test/s11-r16-runner.test.ts` (CRLF `.ps1` checkouts): a
  follow-up.
- **S1 the `~` path** (b2c45b7; verifier PASS after one fix round): `homeAsTilde` in `sdk/src/error.ts` on the
  `Screenshot:` line only, from the injected `homedir`; ASCII-only case folding (a home with `İ` kept its dot); a
  throwing `homedir` keeps the report. `err.screenshotPath` stays absolute.
- **S2a setup** (329b518; PASS-with-notes, one fix round): `npm run setup` = `scripts/bridge/setup.mjs` on Node
  built-ins; the build is skipped when `dist/` is newer than every input; exit 0 / 1 (a prerequisite missing, or `npm ci` or the build failed; *corrected 2026-10-30, cleanup pass 2*) / 2 (the
  MCP step failed); `--dry-run`, `--replace-mcp`. `npm run typecheck` now ends with `scripts/tsconfig.json`.
- **S2b doctor and update** (0a5ea8f; PASS after one fix round): `npm run doctor` (tsx) probes the daemon with one
  hello and `daemon.status`, never `connect()`; OK / HINT / FAIL lines. `npm run bridge-update` (Node) pulls
  fast-forward only, runs npm through `npm-cli.js` with no shell, reloads by `reload-extension.ps1` (exit 2: one
  re-run, then a hint), exits 0 or 1. Size 252 code + 151 test lines against a cap of 300: accepted under §7's 1.5×
  rule (the extra is tests).
- **S3 scripts from any folder** (8f50b9e; PASS after one fix round): `examples/list-tabs.ts`; the folder runs
  `npm init -y`, `npm pkg set type=module`, `npm install <repo>\sdk tsx` (npm 11's init writes `commonjs`).
- **S4 rehearsal** (81882c5; PASS-with-notes): `S4-rehearsal.md`.
- **S5 docs** (a3b5b86; PASS after two fix rounds): "Install on a new device" opens `docs/setup.md`, the manual
  install sits below it unchanged, and the README has a quick start. On a fresh Windows, PowerShell may refuse
  `npm.ps1`; the doc gives `npm.cmd run setup` (known Windows default, not measured here).
- **Incidents, recorded:** the S2a verifier's broken PATH ran the real `claude mcp add` once with a scratch
  `CLAUDE_CONFIG_DIR` (only the scratch config was written); the S2b verifier ran update from a scratch clone without
  `--no-reload` once (the reload script opened and closed its own window, found no card, pressed nothing); evidence
  logs carried the checkout's absolute path until redacted (S1 commit), and the Stage 0 commit 6e22e3b still holds one
  such line in history.

### Gate checklist

| Check | Result | Source |
|---|---|---|
| Z.1 | met | `Stage0.md` §3; #427–#432 |
| P1.1 | met | `S1-verifier.md`, `S1-verifier2.md` |
| I2.1 | met: exit 0, next steps printed; a second run 0 diffs over 2116 entries, token and config hashes same | `S4-rehearsal.md`, `S4-verifier.md` |
| I2.2 | met: 0 token hits (real and clone) in every S2–S5 capture | `S4-verifier.md`, `S2a/S2b-verifier*.md` |
| I2.3 | met: a FAIL line with its fix for each failure case, unit-tested | `S2b-verifier.md`, `S2b-verifier2.md` |
| I2.4 | met: a real fast-forward then a no-op, both exit 0 | `S4-rehearsal.md` |
| S3.1 | met: exit 0, 1 tab listed, from a folder outside the repo (measured three times) | `S3-builder.md`, `S3-verifier*.md` |
| R4.1 | met: 7 of 7 OK, exit 0 (the extension line is #432's heuristic) | `S4-rehearsal.md`, `S4-verifier.md` |
| D5.1 | met: the section walked alone on a fresh clone; `doc-check` clean apart from the planned `docs/install.md` (not made: the section went into `docs/setup.md`) | `S5-verifier.md`, `S5-verifier3.md` |
| Counts | 25 tools, 28 router methods, 27 codes (`node scripts/doc-check.mjs`); `npm test` 6089 passed in 255 files | `S5-verifier.md` §2, `S2b-verifier2.md` |
| U.1 | the user's, after the push (G14-1) | — |

Open for the user: #432 (the doctor's heuristic instead of a protocol change), G14-1 (the push).

## Follow-ups

- From Step 14: a fresh clone's 9 red tests on CRLF `.ps1` checkouts (`*.ps1 text eol=lf` in `.gitattributes`, or a
  CRLF-tolerant regex in `recipes/test/s11-r16-runner.test.ts`); setup and update each keep their own npm lookup
  (S2b-verifier2 NIT-A, B); update prints "Already up to date." twice; an exact extension build check needs a build id
  in the hello (#432).

- From Step 13: R20-G2-1, a fully covered window's screenshot times out; the Phase F items left out; the Run 20 helper
  proposals 2–3; dropping the SDK's and MCP's own `focusTab` before a trusted input (#354).
- Distribution to a wider audience (a Web Store build, other operating systems): later, by the user's choice (#374).
