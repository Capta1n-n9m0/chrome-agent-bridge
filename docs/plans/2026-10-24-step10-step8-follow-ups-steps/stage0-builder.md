# Step 10 Stage 0 — builder (auditor) report

Claude Opus 5.5, 2026-10-24, at `55ee4de`. Role: builder = auditor. No feature code; nothing committed; nothing
edited outside this directory.

## Built files (all new, all in this directory)

- `stage0-audit.md` — the audit: counts, contracts table, 0.4 measurement, 0.6 commits, 0.8 reading, 26 findings
  (CRITICAL 0 · MAJOR 7 · MINOR 14 · NIT 5), attacks on #204, blind spots, exit-check testability, 8 proposed
  decisions, stage split.
- Evidence: `stage0-baseline.txt`, `stage0-transport.txt`, `stage0-contracts.txt`, `stage0-release-trees.txt`.
- Probe sources: `stage0-probe-transport.test.ts.txt`, `stage0-probe-contracts.test.ts.txt` (its first part is Step 9
  Stage 0's probe verbatim), `stage0-probe-gate.test.ts.txt`, `stage0-probe-logcount.test.ts.txt`.
- This report.

## Test / typecheck / build (scratch worktree `git worktree add --detach <scratchpad>/s0wt 55ee4de`, own `npm install`)

```
typecheck exit 0
Test Files  116 passed (116)
     Tests  2720 passed (2720)     Duration 20.67s
build exit 0
git status --short after build: only this run's own output files (tc.out, test.out, build.out)
daemon/dist/index.js sha256: 99bb55c5913cdb6a… (main tree and the clean build agree)
```

Probes (same worktree, 127.0.0.1 port 0 only): transport 5 passed; contracts + gate 16 passed; named existing tests
(log-scan, log-sentinel, safety-gate, cursor) 380 passed, `tools.test.ts -t explicit` 6 passed; log-count probe ran.
The worktree, and a second one at `70aa754` for the release trees, were removed (`git worktree list` shows only the
main tree); no branch or tag was created; `main` unchanged at `55ee4de`.

## Headline results

- **0.4:** the host leg carries one result frame whole up to 99 MiB; above 100 MiB (`ws`'s default `maxPayload`,
  set nowhere in the repo) the daemon closes the extension socket (1009) and every actor's call fails
  `NOT_CONNECTED`. The Chrome leg is not measurable here. By 0.4's own rule: **(B)**, with tab-carrying pulls
  (a tab-less pull of class `"evaluate"` is allowed on a blocked tab — probe) and slicing on the CDP leg too.
- **Contracts:** every Step 9 contract and Step 8 C1–C7 **held** (none CRITICAL). The "60 log sites" stated in
  `CLAUDE.md`, the Step 9 as-built and S2b.md is **54** (15 + 33 + 0 + 6) — the scan itself holds.
- **0.6:** base `70aa754`, close `a1932a8` (recommended); per-Part code changes cherry-pick with 0 non-doc
  conflicts, docs conflict 14 times; Variant C gives a final tree equal to `a1932a8`'s; Part 1's tree does not
  typecheck.
- **0.8:** yes — `onActivated` ends the 1000 ms wait as written (`extension/src/tabs.ts:249-271`); S7b's planned
  fix is the current code and SW-1's table is not discriminating (F3 gives a differential row).
- **S4.3 vs S4b:** confirmed contradiction; fix text in F6.
- **0.3 SDK form:** every SDK action returns `Promise<void>`; only a client event leaves the Step 8 signatures
  unchanged (F5).

## Deviations

- The brief's probe location ("a probe vitest file run from a scratch location") was met with a scratch worktree
  (preferred by the brief); the probes ran as `mcp/test/zz-stage0-*.test.ts` and `extension/test/zz-stage0-*.test.ts`
  there, never in the main tree.
- C5 (cursor rule) is evidenced by existing tests (named, with the asserting lines), not by an own probe — as in
  Step 9's Stage 0.
- The release-trees evidence's Variant C log labels its running count "non-doc conflicts"; it counted all conflict
  lines. A note appended in the file after the run says so and recounts: 0 non-doc conflicts.

## Proposed decisions

Eight, in `stage0-audit.md` §10: (B) transport with tab-carrying pulls (contract-level, for user review); the cap
warning as a client event (contract-level, for user review); `release/step8` 70aa754→a1932a8, Variant C; SW-1 as a
differential row (for session-agent review); stricter `saveTo` file rules (contract-level, for user review); the
retirement removes six tests; bb-login's 90 s covers everything after the press; count and check corrections.

## Escalation flags (for the step agent)

- F4 changes what the gate covers for (B)'s new methods (pulls carry the tab) — ESCALATION list item "what the
  safety gate covers"; proposed conservatively, for the user.
- F5, F11, F12 touch the SDK surface and what `saveTo` may write — contract-level, listed for the user.
- F8 is a count in `CLAUDE.md` and the Step 9 as-built — only the session agent edits those.

## Unfinished / not run

- The Chrome leg of 0.4 (not measurable without Chrome; not needed under (B)).
- No live row, no Chrome, no port 9234. A `node.exe` (PID 22152, created 2026-10-22, another tool's runtime) was
  running before and after; not started by this stage, not touched.
