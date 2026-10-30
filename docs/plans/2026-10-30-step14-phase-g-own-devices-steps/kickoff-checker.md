# Kickoff environment check, Step 14

Role: checker. Model sonnet, effort medium. Node v25.2.1. 2026-10-30. Nothing edited or committed (other than evidence files). Raw output in `kickoff-checker-*.txt` beside this file.

| Check | Command | Exit | Key result | Evidence |
|---|---|---|---|---|
| HEAD | `git log -1 --oneline` | 0 | `49e1908 docs: Step 13 closes on the user's ruling (#420); Phase G kickoff` | -git.txt |
| Tree | `git status --short` | 0 | ` M docs/decisions.md`; `?? docs/plans/2026-10-30-step14-phase-g-own-devices-steps/` (same after build) | -git.txt |
| Tests | `npm test` | 0 | Test Files 251 passed (251); Tests 6030 passed (6030) | -test.txt |
| Typecheck | `npm run typecheck` | 0 | clean | -typecheck.txt |
| Recipes typecheck | `npx tsc --noEmit -p` on all 8 (`tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`) | 0 each | no output | -recipes-tsc.txt |
| Build | `npm run build` | 0 | built | -build.txt |
| Doc check | `node scripts/doc-check.mjs` | 0 | tools 25, router methods 28, codes 27; 38 living docs; CLAUDE.md:113 says 6030 passed, matches | -doccheck.txt |

Doc-check findings: (1) `docs/install.md` named at `docs/plans/2026-10-30-step14-phase-g-own-devices.md:102` does not exist yet (planned); (2) decisions #421 to #426 cited in `docs/decisions.md` lines 192-206 have no entry (that file is the uncommitted modification, so likely in progress).

## Loaded extension vs `extension/dist`: NOT MEASURED

`daemon.status` returns only build (the daemon's sha256), uptime, extensionConnected, clients, port and tab status (`daemon/src/route.ts`); the extension's hello carries no dist hash, only `proto`, `session` and `features`. So the loaded build cannot be read without driving Chrome. Run 20 proved it behaviourally (R20-0 `LOADED20` line, S5-run-record), which needs a tab and the console. No daemon call was made, no tab driven, no reload. The `dist` was rebuilt by this check's `npm run build`, so any older proof does not cover it unless the extension sources are unchanged since S4 (CLAUDE.md says no extension code after S4).
