# S4 verifier (Step 14, stage S4, the rehearsal)

Model / effort: Opus, medium. Date: 2026-10-30. `<repo>` = the main checkout, `<scratch>` = the S4 scratch folder
(`<scratch>\clone`, `<scratch>\claude-config`), `~` = the home folder. Evidence: `S4-verifier-runs.txt`,
`S4-verifier-scan.txt` in this folder. Claims audited: `S4-rehearsal.md`, `S4-runner.md`, the nine `S4-rehearsal-*.txt`.

## 1. Verdict: PASS-with-notes

I2.1, I2.2, I2.4 and R4.1 are met. No STOP condition fired. Two MINOR and three NIT findings, all about the record's
evidence, none about the commands' behaviour.

## 2. Exit checks

| Check | Verdict | Evidence |
|---|---|---|
| **I2.1** install on a scratch clone: exit 0, next steps printed; a second run changes nothing | **met** | Record rows 2-3 and `S4-rehearsal-setup1/2.txt`; re-measured: a further `npm run setup` in the clone under the asserted scratch `CLAUDE_CONFIG_DIR`, no TTY, exit 0; 2116 entries before and after, 0 diffs; `bridge.token` sha256 same; every file of the scratch config dir (2) same by size, mtime and sha256; output identical to the runner's raw run-2 output (`S4-verifier-runs.txt` §3) |
| **I2.2** no capture holds the token | **met** | Equality scan, counts only: real token 0 and clone token 0 hits in the 11 S4 files + `journal.md` (12), in the runner's 9 raw scratch captures, and in all 113 files of the wider set (every file in the steps dir, the scratch config, `~/.chrome-agent-bridge/daemon.log`, my raw re-run captures). The two tokens differ. User's name 0 and absolute home paths 0 in every S4 file and in my two evidence files (`S4-verifier-scan.txt`) |
| **I2.4** update on the scratch clone: exit 0 | **met** | Record rows 5-6, `S4-rehearsal-update1/2.txt`: a real fast-forward `6d06594..63cfa52` (11 files) with `--no-reload`, then "Already up to date"; both exit 0. Corroborated independently: the clone's listing now differs from the runner's after-run-2 listing in exactly those 11 files, mtime only, written at 11:09:41Z (`S4-verifier-runs.txt` §4). Not re-run (the brief names no update run) |
| **R4.1** doctor against the user's running bridge: every part green | **met** | Re-run in `<repo>`, `CLAUDE_CONFIG_DIR` unset: exit 0, 7 of 7 `OK` incl. "Extension: connected" and the #432 heuristic line; byte-identical (CR stripped) to `S4-rehearsal-doctor-main1.txt` |

Also re-run: `npm run doctor` in the clone under the asserted scratch config: exit 1, identical to
`S4-rehearsal-doctor-clone.txt` (FAIL Daemon: the user's daemon refuses the clone's token, Stage0.md m4); the port-9234
listener's PID was the same before and after (no spawn, no handover).

## 3. Audit of the record

- **Pass rules discriminating (check 1): yes.** The listing (`<scratch>\..\s4-snap.ps1`) records size and
  `LastWriteTimeUtc.Ticks` of every tracked file, every file under `daemon/dist`, `mcp/dist`, `extension/dist` (6, all
  present), `bridge.token` and `node_modules/.package-lock.json`. A rebuild rewrites the dist files, so their ticks
  change; `npm ci` rewrites `.package-lock.json`; a new token changes the token's mtime and hash; the scratch config is
  covered by its sha256. Shown in practice: the same method sees the update's 11 same-size rewrites (§2, I2.4 row).
- **Order and re-tuning:** the rules match the phase doc's I2.1/I2.2/I2.4/R4.1 as amended by #429, #431 and #432; the
  only addition (I2.4's `git reset --hard HEAD~1` in the clone) makes the check stricter. Nothing looks loosened. File
  times cannot prove the order (NIT 3). The raw captures' times give a coherent sequence: baseline 11:08:34Z, mcp list
  11:08:43, setup 1 11:09:04, listing 11:09:23, setup 2 11:09:24, listing 11:09:25, clone doctor 11:09:32, update
  11:09:42, main doctor 11:09:50, record 11:10:28.
- **Isolation (check 5):** the clone's `claude mcp add` wrote `<scratch>\claude-config\.claude.json` (setup 1 capture);
  its entry points at the clone with no `env`. The user's `~/.claude.json` has 0 references to the clone or the scratch
  config, and its `mcpServers` key hashes the same as the runner's baseline. See MINOR 1 for the whole-file hash.
- **STOP conditions (check 6):** none missed. No token in any file; `claude mcp list` under the scratch config showed
  no server; no reload, no Chrome contact, no daemon spawn or handover (one 9234 listener, same PID across my runs);
  `<repo>` HEAD still `63cfa52`, its status only the S4 files and the session agent's journal line; no process left.

## 4. Findings

**MINOR 1 - the `~/.claude.json` readback is not auditable from the record, and the whole-file hash is not a stable
signal.** `S4-rehearsal.md:48` ("sha256 same, mtime same, mcpServers-key hash same") carries no values; the baseline
lives only in `<scratch>\baseline.txt` and the after-values were not kept. Re-measured now (`S4-verifier-scan.txt`):
whole-file sha256 **differs** from the baseline, mtime 11:10:40Z; `mcpServers`-key sha256 (of
`JSON.stringify(mcpServers)`, the method that reproduces the baseline) **same**; 0 clone/scratch references. The write
came 12 s after the record and the runner report were saved (11:10:28Z) and 50 s after the last rehearsal command
(11:09:50Z), when the session agent handed off and started this verifier: Claude Code's own writes, not the rehearsal.
My own setup re-run left the whole file unchanged. Not a STOP. Fix (for S5 / the as-built): put the hash values (not
secret) in the record, and read the STOP rule "the user's `~/.claude.json` changed" on the `mcpServers` key, since a
live Claude Code session rewrites the rest of the file.

**MINOR 2 - row 4 does not say the clone's doctor ran under the scratch config.** `S4-rehearsal.md:33`. Under the
scratch `CLAUDE_CONFIG_DIR` it matches the capture; with it unset, the doctor reads the real config (read-only) and
adds `FAIL MCP entry: points at <repo>/mcp/dist/index.js, not this checkout`, exit 1 with 2 failures
(`S4-verifier-runs.txt` §2b). Fix: one clause in row 4 ("under the scratch `CLAUDE_CONFIG_DIR`").

**NIT 3 - the pre-registration cannot be shown by file times.** The record was last written at 11:10:28Z, after every
run (it holds the results). Accepted on content (§3). Fix for later live stages: commit or timestamp the rules file
before the first command.

**NIT 4 - scan counts disagree.** The record says 10 files scanned (`S4-rehearsal.md:41-42`), the journal's 11:10Z line
says 11, and `S4-runner.md`, which the record cites for the scan, does not describe it. My scan: 12 files, 0 hits.

**NIT 5 - listing scope.** It covers `node_modules` only through `.package-lock.json` and not the scratch config's
`backups\` folder. Adequate (a reinstall rewrites `.package-lock.json`; setup run 2 did not call `claude`); my re-run
added the whole config dir.

## 5. Deviations

None. Runs: doctor in `<repo>` once; doctor in the clone once under the scratch config as briefed, plus once with
`CLAUDE_CONFIG_DIR` unset (read-only, to explain the record's row 4 condition; no write, no spawn); one setup in the
clone. No update was run. Nothing edited in `<repo>` besides these three output files.

## 6. Proposed decisions

None.

## 7. Handoff

No process left running. The clone is still at `63cfa52` with its own token and junctions (#220); the scratch config
unchanged. Raw (unsanitized) re-run captures are in `<scratch>\..\s4v\` (not for commit).
