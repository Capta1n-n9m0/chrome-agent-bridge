# Plan drift — cleanup pass 2026-10-30-2

Area cleaner (Opus, medium). Scope: `git diff dffb405..HEAD` against the as-built of
`docs/plans/2026-10-30-step14-phase-g-own-devices.md` (§ As built, gate checklist; code `scripts/bridge/*`, `package.json`
scripts, `examples/list-tabs.ts`, `sdk/src/error.ts`). Checked: `docs/setup.md`, `docs/e2e-test-plan.md`,
`recipes/README.md`, `README.md`, `docs/specs/`, `docs/progress-and-roadmap.md`, `docs/plans/next-session-prompt.md`, the
phase doc itself. No later plan exists in `docs/plans/` (Step 14 is the newest).

Clean, checked and not findings: every `setup.md#…` anchor in living docs resolves after the heading moves (only levels
changed under "Manual install"; slugs are the same); `setup.md` §1–§4 references still mean the manual install, as line 95
says; `setup.md`'s command names, flags (`--dry-run`, `--replace-mcp`, `--no-reload`), exit codes and the doctor's
heuristic text match `scripts/bridge/setup.mjs`, `lib.mjs`, `doctor.ts`, `update.mjs`; `examples/list-tabs.ts` matches
"Scripts from any folder"; root `CLAUDE.md` Commands carries the three commands; no local path or user name in the step's
docs or steps dir (the only hit, `S1-verifier-probe.txt` lines 6–7, is a synthetic `C:\Users\ab` test home).

## Findings

### 1. Roadmap table: Step 13 row still says "not pushed"
- **Location:** `docs/progress-and-roadmap.md:174` (§1 milestone table, Step 13 row).
- **What is wrong:** Step 13 is on origin; the row says it is not.
- **Evidence:** row: "**closed 2026-10-30**, the user ruled the gate (#420): Run 20 final 24 PASS, … of 34; not pushed".
  Same file line 5: "Step 13 turned out already pushed at Step 14's start." Root `CLAUDE.md:16`: "pushed (Step 13 was
  found on origin at Step 14's start)". `git merge-base --is-ancestor dffb405 origin/main` → true; `origin/main` is
  `49e1908` (the Step 13 close commit).
- **Fix:** replace "; not pushed" with "; pushed (found on origin at Step 14's start) *(corrected 2026-10-30, cleanup
  pass 2: was "not pushed")*".
- **Kind:** mechanical.

### 2. Roadmap §5 narrative chain has no Step 14 entry; Phase G paragraph notes out of date order
- **Location:** `docs/progress-and-roadmap.md:771` (the dated "Updated …" chain under §5) and `:918–921` (Phase G).
- **What is wrong:** the §5 chain ends at "*Updated 2026-10-30 (close): … next: the minimal Phase G (the user's other
  Windows devices).*", so §5 still reads as if Phase G is next, not built. In the Phase G paragraph the Step 14 note sits
  before the earlier #420 ruling: "*Built 2026-10-30 (Step 14): setup, doctor and update … the gate waits for the
  user.* *Ruled 2026-10-30 (#420): Phase G is next; …*".
- **Fix:** append to the line-771 chain "*Updated 2026-10-30 (Step 14): Phase G (minimal) is built (Step 14, phase doc
  § As built); its gate waits for the user (#432, G14-1); then U.1, the user's own install on another device.*" Move the
  "*Built 2026-10-30 (Step 14) …*" note after the "*Ruled 2026-10-30 (#420) …*" note.
- **Kind:** mechanical.

### 3. "Manual install (what setup does by hand)" does not do what setup does in §3 (and §1–§2)
- **Location:** `docs/setup.md:92–96` (heading and intro) against `:115–146` (§2, §3).
- **What is wrong:** the heading promises the by-hand form of setup, but the manual steps differ: §2 has the reader
  "Pick any random secret string (e.g. `openssl rand -hex 16`)", §3 registers the entry with
  `"env": { "BRIDGE_TOKEN": "<your-token>", "BRIDGE_PORT": "9234" }`, §1 runs `npm install`. Setup runs `npm ci`, writes a
  256-bit `bridge.token`, and registers with no env: `mcpAddArgv` = `["mcp", "add", "-s", "user", SERVER_NAME, "--",
  "node", entryPath(repo)]` (`scripts/bridge/lib.mjs:95–96`); decision 0.4 "The MCP entry carries no `BRIDGE_TOKEN`".
  The doctor then reports an env token as an extra line ("the entry's BRIDGE_TOKEN equals bridge.token (it works; the env
  entry is optional)"). A reader who follows the manual path gets a different, still working, install.
- **Fix (pick one):** (a) retitle to "Manual install" and change the intro to "an install by hand; setup does the same
  with a generated `bridge.token` and an MCP entry without `BRIDGE_TOKEN`"; or (b) add one line under §3 giving setup's
  form (`claude mcp add -s user chrome-agent-bridge -- node <repo>\mcp\dist\index.js`, with `bridge.token` in place).
  (a) is wording only; (b) changes procedure text.
- **Kind:** needs-the-user (procedure wording of the install doc; (a) alone is near-mechanical).

### 4. The failure report's `~` path is not in setup.md or the spec
- **Location:** `docs/setup.md:316–318` (MCP Failure reports) and `:570–574` (SDK Failure reports, "`error.report()`
  renders … the screenshot path"); `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:466–474` (§8.2's
  "Corrected 2026-10-24" note on `screenshotPath` and `report()`).
- **What is wrong:** S1 changed what `report()` prints: "`homeAsTilde` in `sdk/src/error.ts` on the `Screenshot:` line
  only … `err.screenshotPath` stays absolute" (phase doc § As built, S1; code `sdk/src/error.ts:449`
  `` `Screenshot: ${homeAsTilde(input.screenshotPath, input.home)}` ``). Neither doc says so: setup.md says the PNG "is
  saved under `~/.chrome-agent-bridge/failures/…`" and that `report()` renders "the screenshot path", without saying the
  printed line shows the home folder as `~` while `screenshotPath` is absolute. A script author who parses the
  `Screenshot:` line would get a `~\…` path that `fs` does not expand.
- **Fix:** setup.md SDK paragraph, after "the screenshot path": "(printed with your home folder as `~`, #417 (c);
  `screenshotPath` itself stays absolute)". Spec §8.2: a dated note "*Updated 2026-10-30 (Step 14 S1): `report()`'s
  `Screenshot:` line prints a path under the home folder as `~\…`; `screenshotPath` stays absolute (#417 (c)).*"
- **Kind:** mechanical.

### 5. The phase doc's planned `docs/install.md` (doc-check's planned-path notice)
- **Location:** `docs/plans/2026-10-30-step14-phase-g-own-devices.md:109` (S5 plan) and `:189` (gate checklist D5.1);
  `docs/cleanup/2026-10-30-2-evidence/doc-check.txt` lists both.
- **What is wrong:** line 189 is clear ("the planned `docs/install.md` (not made: the section went into
  `docs/setup.md`)"). Line 109, the plan text, still reads as open: "'Install on a new device' first in `docs/setup.md`
  (or a new `docs/install.md` it links)", with no note that the option was not taken. A reader of S5 alone cannot tell.
  The notice itself goes away when the phase doc's Status becomes Closed (`scripts/doc-check.mjs` skips closed phase
  docs), so no rewrite is needed for doc-check's sake.
- **Fix:** append to line 110 "*(As built: the option not taken; the section is in `docs/setup.md`, § As built S5.)*"
- **Kind:** mechanical.

### 6. As built S2a omits setup's exit 1 on a failed `npm ci` or build
- **Location:** `docs/plans/2026-10-30-step14-phase-g-own-devices.md` § As built, S2a bullet.
- **What is wrong:** As built: "exit 0 / 1 (a prerequisite missing) / 2 (the MCP step failed)". Code:
  `npmStep` → `say(\`FAIL: npm ${argv[0]} failed (above).\`); process.exit(1);` (`scripts/bridge/setup.mjs`). setup.md
  has it right: "`1` Node, npm or git is missing, or `npm ci` or the build failed".
- **Fix:** "exit 0 / 1 (a prerequisite missing, or `npm ci` or the build failed) / 2 (the MCP step failed)".
- **Kind:** mechanical.

### 7. setup.md's doctor paragraph names a fixed set of lines; the doctor can print more or fewer
- **Location:** `docs/setup.md:58–59`.
- **What is wrong:** "It prints one line per part: Node.js, Build, Token file, MCP entry, Daemon, Extension, and
  Extension build." `doctorLines` (`scripts/bridge/lib.mjs`) also adds "MCP entry's token", "Local MCP entry",
  "Shell BRIDGE_TOKEN", "Shell BRIDGE_PORT" when they apply, and stops before "Extension build" when the extension is not
  connected. The extra `Shell BRIDGE_TOKEN` "same" case is a HINT, so "A healthy install prints `OK` on every line" can
  be false on a healthy install with `BRIDGE_TOKEN` set in the shell.
- **Fix:** "It prints one line per part (Node.js, Build, Token file, MCP entry, Daemon, Extension, Extension build), plus
  a line for an MCP entry's own token, a local-scope entry, or `BRIDGE_TOKEN` / `BRIDGE_PORT` set in this shell when
  there is one." and "every part line `OK` (a HINT line is not a failure)".
- **Kind:** mechanical.

### 8. The GitHub account name in the new clone command
- **Location:** `README.md:15`, `docs/setup.md:23`: `git clone https://github.com/<owner>/chrome-agent-bridge`.
- **What is wrong:** new in this diff (not in `dffb405:README.md`). `docs/docs-writing-guide.md` rule 9: "Committed docs
  do not carry the local absolute path or the user's name: write `<repo>`, `~` or `<user>`." The account handle is the
  user's name on GitHub. Against it: the repo is public, the specs already name the owner
  (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:28` "Owner: … (@<owner>)", left as committed), and a
  clone command needs a real URL to be copy-pasteable on a new device (U.1).
- **Fix:** keep it, with the user's say-so recorded as an exception (a public clone URL); or write
  `git clone <repo-url> chrome-agent-bridge` and name the URL once in the README header.
- **Kind:** needs-the-user.

### 9. `recipes/README.md` does not point at scripts outside the repo
- **Location:** `recipes/README.md:7–15`.
- **What is wrong:** it says scripts run "with `tsx` from the repo root" and the token is "`bridge.token` at the repo
  root"; since S3 a script can live in any folder (`examples/list-tabs.ts`, setup.md "Scripts from any folder"), where
  the token is found from "the checkout it was installed from". Not wrong for recipes, but the one README for scripts
  does not say the other way exists.
- **Fix:** one line after the run command: "A script outside the repo: `docs/setup.md` → Scripts from any folder
  (`examples/list-tabs.ts`)."
- **Kind:** mechanical.

### 10. `docs/e2e-test-plan.md` §1 still sets up by hand only
- **Location:** `docs/e2e-test-plan.md:29–45` (§1 items 2–5).
- **What is wrong:** items 2–5 build with `npm install`, choose a token by `openssl rand -hex 16`, register with env
  `BRIDGE_TOKEN`; the diff only retargeted the link ("see `docs/setup.md`, Manual install §3"). `npm run setup` and
  `npm run doctor` now do the same and check it. Not drift in the strict sense (the manual way still works, and Step 14
  ran no live wave by design, #420 item 1), so no row is stale.
- **Fix:** a dated note under item 2: "*Note 2026-10-30 (Step 14): on Windows, `npm run setup` does items 2–4 (with
  `bridge.token`, as item 8) and `npm run doctor` checks them; `docs/setup.md` → Install on a new device.*"
- **Kind:** mechanical (a pointer); skip if the user prefers the plan's setup untouched.

### 11. `docs/plans/next-session-prompt.md` is still Step 14's kickoff (expected; proposal)
- **Location:** `docs/plans/next-session-prompt.md:1–36`.
- **What is wrong (by design):** it starts Step 14 ("you are the SESSION AGENT for **Step 14**"), with "Push state:
  Step 13 is committed but maybe not pushed (G13-1)" (now known: pushed) and "expect 6030 in 251 files" (now 6089 in
  255). The gate waits on #432 and G14-1, so no successor is due yet.
- **Proposal:** at the user's ruling, `phase-kickoff` replaces it. Since nothing after Step 14 is planned, the
  replacement is likely a short wave handoff for U.1's findings (the user's install on another device) plus the Step 14
  follow-ups (`.gitattributes` `*.ps1 text eol=lf` for the 9 CRLF-red tests, the two npm lookups, the double
  "Already up to date."), or a one-paragraph "no step is open" note. Until then leave it.
- **Kind:** needs-the-user.

## Out of scope, noted only
- `docs/e2e-test-plan.md:2671` (DL-1 row, a 2026-09 record) carries a local absolute path with the user name. It
  predates rule 9, which leaves committed files as they are; not in this diff.
- Root `CLAUDE.md` Current state is the State area's.
