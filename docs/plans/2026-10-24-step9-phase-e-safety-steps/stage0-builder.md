# Step 9 Stage 0 — builder (auditor) report

2026-10-24 · Claude Opus 5.5 · HEAD `a0700e0` · no feature code, no commit.

## Verdict

Audit done. **39 findings: CRITICAL 2 · MAJOR 14 · MINOR 14 · NIT 9** (`stage0-audit.md`). All 7 Step 8
contracts **HELD** when executed on port 0 (`stage0-evidence-contracts.txt`). Both CRITICALs are plan premises,
not broken code: one gate before the handler does not cover multi-step handlers (F1), and redacting only
`listTabs` leaks URLs through tab events and the daemon's cache (F2, shown by execution).

## What I ran

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 1714 passed, 85 files |
| `npm run build` | exit 0; `git status --short` after: only the untracked ledger |
| `grep -c "router.on(" extension/src/sw.ts` | 23 (names listed in the audit §1) |
| `grep -c "server.tool(" mcp/src/tools/registry.ts` | 23 |
| `npx vitest run mcp/test/zz-stage0-probe.test.ts` (throwaway) | 9 passed: contracts C1–C4, C6, C7; premises P1–P3 |
| `npx vitest run` on 9 existing test files/filters (attach set, S2b.4, session marker, handle mark, TAB_HELD, lock, cursor ×3) | all passed; counts in the evidence file. One filter (`-t "without code"`) matched nothing and was re-run as `-t "S2b.4"` — recorded |
| 3 web searches (one per external fact) | chrome.debugger on own pages: **not answered by the docs** → assumed reachable, S4 row; `storage.local` content-script access: **confirmed exposed by default, `setAccessLevel` available**; commands: **`_execute_action` dispatches `action.onClicked`; browser shortcuts win** |

## What I could not run, and why

- Anything in real Chrome (`Alt+Shift+K` free in Chrome 156; `onCommand`/`onClicked` waking the worker;
  `chrome.debugger` on the own options page; `chrome://extensions` refusing the debugger; MV3 refusing
  `javascript:` in `tabs.update`; whether the worker's own fetches appear in the webRequest log under tab -1).
  Stage 0 never touches Chrome (brief hard rule); each is an S4 row in the audit §7 or stated as unmeasured.
- The cursor contract (C5) was checked through existing tests only, not the probe (its harness needs the MCP
  link stack; the existing tests discriminate — quoted).

## Deviations

- The probe ran inside the repo (`mcp/test/zz-stage0-probe.test.ts`) because vitest resolves `@bridge/*` only
  there; it was deleted after the run. Its source is kept as `stage0-probe.test.ts.txt` so the verifier can
  re-run it (copy to `mcp/test/`, run, delete). Also copied to the scratchpad.
- The audit proposes splitting S2 into S2a (enforcement) and S2b (UI) — a stage-table change for the step
  agent to accept or not.

## Proposed decisions (full text in stage0-audit.md §8)

D1 the safety state as `safetyState`/`safetyStatus` events + `daemon.status.safety` (for user review) · D2 one
code, `DISARMED {scope:"evaluate"}` (user review) · D3 `hidden` marker; events and daemon output redacted while
disarmed/blocked (user review) · D4 block-list grammar + 40 cases (user review) · D5 `tabs.claim` on a blocked
tab granted, calls refused (user review) · D6 post-check, attach re-check, per-tick re-check, network ingest +
query filter (user review) · D7 `javascript:`/`data:` URLs and all `chrome-extension://` ids (user review) · D8
per-call read, fail closed, `storage.local` locked to trusted contexts, offscreen-only router (user review) · D9
download hops: check before and after headers, DNR not built (user review) · D10 stricter exit checks (user
review) · D11 `_execute_action` (By: Claude) · D12 badge and title (By: Claude).

## Hygiene

- Evidence files contain only `localhost:8080` fixture URLs (`grep -o "[a-z-]*://…"` over the `.txt` files),
  no token (the probe used the sentinel `stage0-probe-token-SENTINEL`), no real site.
- Nothing bound 9234; no daemon started; Chrome untouched.

## Files written (all in `docs/plans/2026-10-24-step9-phase-e-safety-steps/`)

- `stage0-audit.md` — findings, contracts, attack on #131, blind spots, matcher table, testability, SAFE rows,
  proposed decisions, stage split.
- `stage0-builder.md` — this report.
- `stage0-evidence-contracts.txt` — Step 8 contract runs and quoted assertions.
- `stage0-evidence-premises.txt` — P1–P3 (redaction vs the daemon cache; MCP rendering; unknown events).
- `stage0-probe.test.ts.txt` — the deleted probe's source.

Time: about 1.2 h of agent time (estimate 1.5 h). Test count unchanged: 1714 / 85.

## Fixer r1 note (2026-10-24)

The verifier's round (`stage0-verifier.md`, FAIL on V1–V3) was answered in `stage0-audit.md` in place; the
report is `stage0-fixer1.md`. In short: every file:line in the audit re-read against `a0700e0` (14 citations and
2 cross-references corrected); dated amendment text added for F12, F20, F21, F22, F23, F27, F28, F30; D6/F1 now
say what the gate does with a tab closed or replaced during the call (the reply stands while armed with
JavaScript on and an empty list); V4–V17 folded in, four as new findings F40–F43 and one new proposed decision
D13. New count: **43 findings — CRITICAL 2 · MAJOR 14 · MINOR 18 · NIT 9**. No code, no commit.
