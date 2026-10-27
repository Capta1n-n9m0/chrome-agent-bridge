# Step 12 Stage pre-0: environment check

Run 2026-10-27 (`date -u` printed local time: Tue Oct 27 2026 1:56 PM; vitest start 17:56 UTC). Checker, read-only.

| Check | Command | Exit | Result |
|---|---|---|---|
| Date, HEAD | `date -u`; `git log -1` | 0 | Start HEAD `493984c` (docs: the user rules Step 12's scope (G12-0) (#321)). By the end HEAD was `0ba82f6` (docs: Step 12 starts ...), committed by another agent during the run. |
| Git status | `git status --short` | 0 | At start NOT clean: ` M docs/plans/2026-10-27-step12-phase-f.md`, `?? docs/plans/2026-10-27-step12-phase-f-steps/` (Step 12's own docs). Clean after `0ba82f6` and after the build. |
| Unit tests | `npm test` | 0 | 4665 passed (4665), 191 files passed (191). Header of progress-and-roadmap.md says 4665 / 191: match. |
| Log-scan allowlist | `grep -c '^  { file:' extension/test/log-allowlist.ts` | 0 | 54 sites: extension/src 15 + daemon/src 33 + mcp/src 6 + sdk 0 (section headers in the file). Counted from the file, not the test output. |
| Typecheck | `npm run typecheck` | 0 | no errors |
| Recipe tsconfigs | `npx tsc --noEmit -p` on tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b | 0 for all 7 | no output |
| Build | `npm run build` | 0 | `git status --short` after it: empty (no tracked change) |
| Port 9234 | `netstat -ano` | - | free |
| Ports 8080-8099 | `netstat -ano`; `Get-NetTCPConnection` | - | no listener. One "Bound" entry on 8082 (PID 25896, `SystemSettings.exe`), not shown by netstat and not listening: a transient ephemeral bind by Windows Settings, not a fixture holder. Treat 8082 as possibly taken. |
| doc-check | `node scripts/doc-check.mjs` | 0 | Checked 38 living docs (5 closed phase docs skipped); counts in code: tools 24, router methods 27, codes 27; test count stated: CLAUDE.md:108 `4665 passed` (matches). |

Verdict: environment OK.
