# Lean procedures — rules by pointer, package CLAUDE.md files, risk-tiered models

**Date:** 2026-10-25 · **Status:** In progress (built on the Linux research server; Step 11 on Windows is the trial)
**Decision:** decisions.md · 2026-10-25 · Lean procedures: rules by pointer, package CLAUDE.md files,
risk-tiered models (#230) · **Steps dir:** `docs/plans/2026-10-25-lean-procedures-steps/`

## Outcome (planned)
- Every agent loads less: the root `CLAUDE.md` shrinks from 1,000 lines (13.3k words) to about
  150–180 lines; package gotchas load only where an agent works.
- One copy of each rule: `docs/agent-rules.md`; briefs, kickoffs and skills point to it.
- Fewer, shorter files per stage; the as-built lives in the phase doc.
- Sonnet (effort high) builds and fixes low-risk stages; Opus verifies everything.
- Step 11 is measured against Step 10 for cost and quality (§ Trial).

## Why

Step 10 (2026-10-24 23:21 → 2026-10-25 16:56, about 17.5 h) produced 125 files and 336k words in
its steps dir, from 46 briefs; each brief carried `briefs/common.md` (4.6k words of pasted rule
blocks), and every agent loaded the 13.3k-word `CLAUDE.md`. Most of that is input every agent
pays for again (`find`/`wc` on the steps dir, 2026-10-25).

## Probe: package CLAUDE.md files load by themselves (2026-10-25, Linux, Claude Code 2.1.310)

A scratch repo with a root `CLAUDE.md` and `extension/CLAUDE.md`, each holding a canary string;
headless `claude -p` sessions on Opus reported which canaries reached their context.

| Case | Root | `extension/` |
|---|---|---|
| main session, Read `extension/a.ts` | at start | after the Read |
| main session, Bash `cat extension/a.ts` | at start | after the cat |
| subagent, Read | at start | after the Read |
| subagent, Bash `cat` | at start | after the cat |
| main session, Read `daemon/b.ts` | at start | not loaded |

Not covered: an agent that never opens a file in the folder (only `npm test`, `grep`), and
Explore/Plan agents, which load no `CLAUDE.md` at all. **Repeat on Windows** before Step 11
(kickoff first check).

## The CLAUDE.md map

| Current section (old lines) | Goes to |
|---|---|
| What this is, Current state (1–45) | root, without history notes |
| Architecture and flow (47–95) | root, without history notes |
| Key files (97–250) | each package's list to the top of its own `CLAUDE.md`; root keeps one line per package |
| Commands (252–276) | root, current counts only |
| Gotchas, daemon (bind lock, lifecycle, detached spawn, pre-Step-6 server, `BRIDGE_PORT`, `ws` frames, ping, the 100 MiB frame, `ws` external) | `daemon/CLAUDE.md` |
| Gotchas, extension (`executeScript`, IIFE, `@types/chrome`, reload, snapshot, keys, CDP input, evaluate, timeouts, debugger, service worker, `webRequest`, `storage.session`, capture and switch, discard, content-script errors, locators, marks, failure reports, session marker) | `extension/CLAUDE.md`; split off `extension/src/content/CLAUDE.md` if it passes its budget |
| Gotchas, safety gate (Step 9 block) | `extension/CLAUDE.md`, own section |
| Gotchas, SDK and MCP (handler storage, MCP lifecycle, handles, `newTab`, knock hash, cursor, images on `isError`, formatters, `saveTo` finish) | `sdk/CLAUDE.md`, `mcp/CLAUDE.md` |
| Gotchas, protocol types and codes | `shared/CLAUDE.md` (Key files; gotchas if any) |
| Gotchas, live runs and Windows tooling (recipes and `tsx`, junctions, PowerShell 5.1, `npx` via `cmd.exe`, job objects, UI Automation, reload script, Chrome restarts and live sites, headless actors and `ToolSearch`, occlusion) | `recipes/CLAUDE.md` |
| Rules that bind every package (never log URLs and the like, the token, the `127.0.0.1` bind, one owner of 9234, testing philosophy) | root, about 8 short bullets |
| Testing philosophy, Conventions | root |
| Skills, Docs map (949–991) | root, shortened; points to `docs/agent-rules.md`; an index of the package files and what each holds |
| The step-history block (992–1000) | removed (`docs/progress-and-roadmap.md` holds it) |
| 37 history notes (`*Superseded …*`, `*Corrected …*`) | one decisions entry: a table of old text → current text → cause (#N) |

Budgets: root ≤ 3,000 words, each package file ≤ 3,500 (`scripts/doc-check.mjs`).

## Stages

### L1 — Rules and skills (session, risk: low) — done (`817f8b1`)
`docs/agent-rules.md`; `long-run`, `step-agent`, `phase-kickoff`, `session-closeout` rewritten to
point instead of paste; `role-prompts.md` and `asbuilt.md` folded in; `cleanup-pass` skill;
`scripts/doc-check.mjs`; `docs/docs-writing-guide.md` updated.

### L2 — Split CLAUDE.md, archive decisions (builder Sonnet high, verifier Opus; risk: low) — done (`3035149`, `bcb9b09`, `ec9092f`)
1. The map above. Gotcha text moves unchanged, except: history notes dropped, pointers fixed,
   a count brought to the code's current value.
2. The history notes → `docs/plans/2026-10-25-lean-procedures-steps/claude-md-history.md` (the
   table, cited from § As built).
3. `docs/decisions.md` → Open decisions (compressed: struck-through lists removed), **Standing
   decisions** (one line each: still governs how we work or what the product promises), an index
   of `docs/decisions-archive/` files (by step, numbers unchanged), and the current step's entries.
   Archive entries are moved verbatim.
4. The Step 11 kickoff's LESSONS (`docs/plans/next-session-prompt.md` § 2, old text in git at
   `0e79130`): each one is covered by a gotcha, `docs/agent-rules.md` or the phase doc, or it is
   added to the package `CLAUDE.md` it concerns as a measured fact with its source.
5. Pointers in living docs to "CLAUDE.md Runtime gotchas" now name the package file.

### L3 — Step 11 kickoff and phase doc (session, risk: low) — done (`64c4d67`, `973ede0`)
Kickoff rewritten to the new template (≤ 1.5k words); phase doc: risk tier per stage, As built
section instead of a separate file.

### L4 — First cleanup pass (lead Opus; areas per the `cleanup-pass` skill) — done (`docs/cleanup/2026-10-25.md`)

## Exit checks (pre-registered)
- **L.1** Every bold gotcha headline of the old `CLAUDE.md` (`git show 0e79130:CLAUDE.md`) appears
  in exactly one new `CLAUDE.md` file, or is listed in the builder report with the reason it was
  merged or moved to `docs/agent-rules.md`.
- **L.2** `node scripts/doc-check.mjs`: no history notes in `CLAUDE.md` files, no gotcha in two
  places, no file over budget except `docs/plans/` records, no dead path in a living doc, no `#N`
  without an entry.
- **L.3** Every decision entry of the old `decisions.md` exists once, verbatim, in the new
  `decisions.md` or the archive (count of `### ` entries equal; text diff empty per entry).
- **L.4** No code file changed (`git diff --stat` shows only `.md` files and `scripts/doc-check.mjs`).
- **L.5** Kickoff ≤ 1.5k words; every path and decision it cites exists.

## As built

### L2 — 2026-10-25 · verifier: PASS (third check) · commits `3035149`, `bcb9b09`, `ec9092f` · models: builders and fixers Sonnet 5.5 (effort high), verifiers Opus 5.5
- **Result** (at `ec9092f`): root `CLAUDE.md` 189 lines, about 2.2k words (from 1,000 lines, 13.3k); package files `extension/`
  3.3k (with `src/{content,evaluate,handlers}/` 0.9k, 0.5k, 0.5k), `daemon/` 2.0k, `recipes/` 1.8k, `sdk/` 0.7k,
  `mcp/` 0.6k, `shared/` 0.1k; `docs/decisions.md` 2.3k words (from 37k; 2.5k at `3035149`) with 102 Standing decisions; archive
  `docs/decisions-archive/step6.md` … `step10.md` (`wc -w`; `L2-builder.md`).
- **Proof:** `check-l2.mjs`: 91/91 gotchas in exactly one file, 231/231 decision entries identical, 0 history notes;
  verifier 1 also compared every gotcha body independently (86 verbatim, 5 differ only by a fixed pointer).
- **Fix rounds (Sonnet), findings (Opus):** round 1 for F1 (SDK and extension code facts reachable only from
  `daemon/`, a gap in the map) and F2 (one-off Chrome-restart grants listed as standing); round 2 for R1 (two
  safety-gate gotchas moved into `handlers/`, where an agent editing `safety*.ts` would not load them). Each was a
  placement or judgement error the Opus verifier caught; no text was lost in any round.
- **Deviation:** the first builder hung on an API request (no transcript growth from 14:56 UTC); stopped after ~19 min
  and replaced by a fresh builder from its partial state (`agent-rules.md` §8).
- **History notes:** 43, not 37 (`claude-md-history.md`); recorded there, not as a decisions entry, because each
  row already cites its cause.
- **Probe gap:** sub-folder files (`extension/src/*/CLAUDE.md`) were not in the Linux probe; the Step 11 kickoff's
  first check covers them on Windows.

## Trial: Step 11 against Step 10

Measured at Step 11's close, on the Windows machine where both ran:
- **Cost:** agents spawned (by role and model); words written to the steps dir; wall time from
  kickoff to gate; token use per agent from the session transcripts (`~/.claude/projects/`), the
  same measure for Step 10.
- **Quality:** verifier findings per stage (Sonnet-built vs Opus-built), fix rounds, live rows
  that failed for a product defect, findings of Step 12's Stage-0 audit against Step 11's
  contracts.
- Step 10's numbers above are the baseline for files and words; its token use is measured on
  Windows with the same script.
