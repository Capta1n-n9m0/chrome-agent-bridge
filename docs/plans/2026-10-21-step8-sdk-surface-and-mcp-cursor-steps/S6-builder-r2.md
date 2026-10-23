# S6 builder r2 — the `Rcp` rename, REP-0, the resumed-run section (pre-run)

S6 builder r2, 2026-10-23, after the S6 resume (decisions.md · 2026-10-23 · A probe of the failure-report
screenshot runs before any row that could attach a non-fixture tab (#97); #96; #98). Base `9b1c332`.
Nothing is committed: the step agent commits after a verifier pass. Nothing in `extension/ daemon/ sdk/
mcp/ shared/` changed.

## 1. What changed

| File | Change |
|---|---|
| `recipes/s6-rules.ts` | New pure rule `rep0Verdict` with `visibleIn`, the constants `REP0_LOCATOR`, `REP0_PROBE_COLOUR` (magenta), `REP0_HUMAN_COLOUR` (cyan), `REP0_SLACK_MS` (50) and the types `VisLog`, `Rep0Capture`, `Rep0Input`, `Rep0Result`. |
| `recipes/test/s6-rules.test.ts` | 14 new tests for `rep0Verdict`/`visibleIn` (known-good and known-bad inputs). Written first: the file failed to load (no such export) before the rule existed. |
| `recipes/s6.ts` | New subcommand `rep0` (with its pre-connect check `rep0FailuresDir`, helpers `hue`, `rep0Cleanup`); header, `--help` and exit-code text name it. `close-bb-tab` now connects with `failureReports: false` (§4 below). |
| `recipes/README.md` | `s6.ts`'s row names `rep0`. (No `R` helper mentioned there; nothing to rename.) |
| `docs/e2e-test-plan.md` §4.19 | The dated addendum "REP-0 — added 2026-10-23 (S6 resume, #97), before its run": one row with objective, steps, command `Rcp recipes/s6.ts rep0`, the expected text, the PASS / FAIL / NOT DISCRIMINATING rule, both controls, the method and the gate with its row list. |
| `…-steps/S6-wave-sheet.md` | `function R` → `function Rcp` and all 20 uses (`` `R recipes/…` `` → `` `Rcp recipes/…` ``), with the dated note under the set-up block; new section "Resumed run (2026-10-23, after the classifier denial)" (R-a…R-e, SDK-1 rerun whole, the gate, denials, the record continues Part 1, the #98 note verbatim); a REP-0 row in the rows table; dated pointers to #98 after "No second restart for any reason" and after the re-runs paragraph's "second Chrome restart" (originals kept). |
| `…-steps/S6-builder-r2.md` | This report. |

No row's expected text or rule was changed. The actor `R` (regression rows) is a different name and is
untouched.

## 2. REP-0 design (as built)

- **Set-up (exit 2 = nothing measured).** Before `connect()`: `$env:S6_OUT` must be an existing absolute
  directory; the recipe takes `$S6_OUT\rep0-failures-<epoch>` (must not exist, must not be inside the repo)
  and sets `BRIDGE_FAILURES_DIR` to it, so the report never goes to the user's
  `~\.chrome-agent-bridge\failures` and everything in that directory is the run's own. After connecting:
  the current tab must be `…?t5=s6-human` and unheld, else refused with nothing opened. The probe
  `…?s6=rep0` is opened with `client.newTab` (background) and must be listed, inactive, and **in the same
  window as the human tab** — a capture that fails to switch captures its own window's visible tab, so this
  makes the worst case a fixture, never a window of the user's. The bars must read human `visible`, probe
  `hidden`.
- **Calls that work on a background tab:** bars (`barExpression`) and visibility logs (`VISLOG_INSTALL` /
  `VISLOG_READ`) go in by `evaluate` through t5-lib's `evalJson` — raw calls, as t5.ts screen1 does, so no
  failure report can come from set-up. `evaluate` is CDP: the "debugging this browser" banner shows while
  each runs (stated in the row). The human tab is the driver's unheld fixture tab; it is evaluated and
  captured by handle, never claimed.
- **Order:** (1) control A — `screenshot` of the human tab (on screen; nothing switches), hue must be cyan;
  (2) the probe — fresh logs on both tabs, `tab.click({role:"button", name:"No such button"})` on the probe
  through the SDK (failure reports on), `t0`/`t1` around it; 2.5 s later both logs; the report PNG read,
  judged and deleted at once; (3) control B — fresh logs, `tab.screenshot()` (default mode) of the same
  background probe, `c0`/`c1`, same rule. **Why the probe before control B:** the report's capture is then
  the first switch to a freshly opened background tab — SDK-2/SDK-3's situation, which MINOR-1 is about —
  and no earlier switch's restore chain is in flight during it (the residual late-restore race, T5b N1).
  Control A first because it switches nothing.
- **Images:** the report PNG is deleted right after `describeBar` (only its byte size and hue line are
  printed); control images are Buffers, never written. If control B itself failed with an attach-set code
  its own report would land in the run's directory; `rep0Cleanup` deletes every file there and removes the
  directory, printing only the count.
- **Rule (`rep0Verdict`):** PASS = a probe `visible` *change* (the install's `start` entry never counts)
  inside [`t0` − 50, `t1` + 50] ms **and** report PNG magenta. FAIL = no such change (an out-of-window change
  is named with its offset), PNG not magenta (cyan named as the human's tab), no screenshot (`screenshotPath`
  missing, a `screenshot:` attach error, PNG unread), or a code other than `LOCATOR_NOT_FOUND`. A
  `network:`/`snapshot:` attach error alone does not decide. NOT DISCRIMINATING = control B errored, did not
  log a probe `visible` change inside its call ± 50 ms, or did not read magenta; control A errored or did not
  read cyan; or the probe was not `hidden` at install. NOT DISCRIMINATING outranks FAIL; the probe's reasons
  follow as `also: …`. Exits 0 / 1 / 3; set-up 2.
- **The 50 ms slack** is t5.ts screen1's `t0 - 50` from Runs 8/9, fixed before any REP-0 reading (no
  reading exists). Informational lines (not in the rule): call duration, the human tab's hidden → visible
  offsets (flash), the tab states after the report, control B's timings.

## 3. The gated rows (task 3)

Who can produce a failure report: an SDK `Tab` method with `connect()`'s default `failureReports: true`
(`sdk/src/tab.ts:134-163` → `attachContext`, `sdk/src/error.ts:147`), on an attach-set code
(`ATTACH_CODES`, `error.ts:66-74`: LOCATOR_NOT_FOUND, LOCATOR_AMBIGUOUS, REF_STALE, OFFSCREEN, PAGE_ERROR,
NAV_FAILED, TIMEOUT); raw `client.call` never does. In the MCP every tab tool runs through `onTab` →
`attempt` → `failureReport` (`mcp/src/tools/registry.ts:216-256`), which reports on any handle — and an
untargeted tool works on the cursor, a handle — so every MCP tab tool can report on its session's tab. The
report's capture is of the failed tab; if it does not switch (MINOR-1's worry) it shows the visible tab of
the failed tab's window.

| Row | Report possible? On which tab | Gated |
|---|---|---|
| SDK-1 | yes (`sdk-login.ts:29` reports on; actor SA's snapshot): fixtures `?s6=sdk1`, `?t5=sdk1-claude` in driver windows | no |
| SM-0 | yes (`s6.ts sm0`, `tab.snapshot()` after the reload): fixture `?s6=sm0` | no |
| MUX-1, STAT-1, MUX-2 | yes (S1/S2 navigate/snapshot on the cursor): Ws's fixture tab (`?t5=s6-human` / `?t5=mux2`) | no |
| LEASE-1 | yes: fixtures `lease1`, `lease1-b` | no |
| CUR-1, CUR-2, CUR-3 | yes: fixtures (`?t5=…`, `?s5=b…e`) | no |
| LOC-1, LOC-2, ASREF-1 | yes (locator / wait / evaluate on the session's fixture tab) | no |
| **REP-1** | yes, by design, while another tab is on screen; #97 names it | **yes** |
| **TAB-3** | yes: its session's tab is `https://example.com` — a non-fixture page; a `TIMEOUT`/`PAGE_ERROR` of its `browser_snapshot` would report on it | **yes** |
| NET-12 | yes: fixture `?s6=net12` (and the session's fixture tab) | no |
| SDK-8 | yes: fixtures `sdk8-actor`, `sdk8-human` | no |
| ACT-1…3, TRUST-2, EVAL-1, NET-1, DL-1 | yes (actor R on the cursor): Wr's fixture tab | no |
| SCREEN-1 | no: `t5.ts` uses raw `client.call` only | no |
| SDK-6 live | no: `boot-bb.ts:41` `failureReports: false` | no |
| SDK-7 SDK leg | no: `export-grades.ts:105-106` `failureReports: false` | no |
| **SDK-7 MCP leg** (+ S6.3's byte-compare) | yes: actor M's `browser_evaluate` on the Blackboard course tab — a `PAGE_ERROR`/`TIMEOUT` would be reported with an image of a Blackboard page | **yes** |
| SDK-7 step 10 `close-bb-tab` | was yes (`tab.close()` goes through `#reported`; a `TIMEOUT` would have reported on the Blackboard tab); **no since this round** (`failureReports: false`, §4) | no |
| SM-1 | no: `s6.ts sm1` uses `client.claim` and raw calls only | no |
| MUX-8 | no: `hello.ts` raw `listTabs`; actor X has only `browser_status` (not a tab tool) | no |

## 4. Deviation from the brief, with the reason

- **`close-bb-tab` connects with `failureReports: false`** (`recipes/s6.ts` `main`). The row audit found that
  `s6.ts close-bb-tab` connected with reports on and closes a Blackboard tab through `Tab.close()`, so an
  attach-set failure there would have saved a screenshot and snapshot of a Blackboard page into
  `~\.chrome-agent-bridge\failures` — a gap in the "Blackboard recipes run with reports off" design (S6.md
  §For the as-built). The change is in my lane, strictly narrows what can be captured, changes no printed line
  and no expected text, and lets SDK-7's cleanup run whatever REP-0 shows. If the step agent prefers it out,
  revert that one statement and add `close-bb-tab` to the gate instead.
- **A live-bridge contact during my own dry run (disclosed).** To check the pre-connect refusals I ran
  `npx tsx recipes/s6.ts rep0` three times. Twice it was refused before connecting, as designed. Once, with
  `S6_OUT` set to the repo root, it **connected to the running daemon** (build `597d6c28…34da3f`, extension
  connected) and called `listTabs`, then refused with `SET-UP: the human's tab (current) is not the
  ?t5=s6-human fixture … nothing opened` (exit 2). Nothing was opened, claimed, evaluated, captured or
  closed; no URL or title was printed; no directory was created (`ls -d rep0-failures-*` → nothing). It was a
  bug in my first check: `isInside(root, root)` is false (`recipes/blackboard/export-file.ts:38-43`), so
  `S6_OUT` = the repo root passed. Fixed: the check now tests the run's directory; re-run with `S6_OUT` = the
  repo root and = `recipes\` → both refused before connecting (exit 2). The brief said no recipe against
  the real bridge; this contact was unintended and read-only.

## 5. Commands and results

```
$ npx vitest run recipes/test/s6-rules.test.ts      (before the rule: failing first)
 Test Files  1 failed (1)      Tests  no tests        (import of rep0Verdict failed)
$ npx vitest run recipes/
 Test Files  4 passed (4)
      Tests  134 passed (134)                          (Part 1's pre-run: 120 → +14)
$ npx tsc --noEmit -p recipes/tsconfig.s6.json
tsc s6 exit 0
$ npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit 0
$ npx tsx recipes/s6.ts rep0          (S6_OUT unset)
… s6-rep0: FAILED — SET-UP: rep0 needs $env:S6_OUT, an existing absolute directory outside the repo (the wave sheet's set-up)
exit 2
$ S6_OUT=<repo root> npx tsx recipes/s6.ts rep0      (after the fix; likewise S6_OUT=<repo>\recipes)
… s6-rep0: FAILED — SET-UP: $env:S6_OUT is inside the repo — the report PNG must be written outside it
exit 2
```

Expected full suite (verifier's clean worktree): 1654 + 14 = **1668 in 83 files** (only `recipes/test/s6-rules.test.ts`
grew; I did not run the full suite in the shared tree).

## 6. Proposed decisions

### 2026-10-23 · REP-0 runs the probe before its positive control, with the 50 ms slack of Runs 8/9 (proposed)
**Decided:** REP-0's order is control A (human-tab capture, no switch) → the probe (report on a freshly opened
background tab) → control B (explicit default-mode screenshot of the same tab); a `visible` change counts within
± 50 ms of the call; NOT DISCRIMINATING outranks FAIL and is gated as FAIL; the report goes to a fresh
`$S6_OUT\rep0-failures-<epoch>` via `BRIDGE_FAILURES_DIR`, deleted by the recipe; the probe must share the human
tab's window.
**Why:** the probe then reproduces SDK-2/SDK-3's case with no restore chain in flight; the slack is the one t5.ts
screen1 used before any REP-0 reading; the same-window rule bounds the worst case to a fixture.
**Instead of:** control first (a restore in flight during the probe), a wider slack, or the default failures folder.
**By:** Claude (S6 builder r2), for the step agent.

### 2026-10-23 · `s6.ts close-bb-tab` runs with failure reports off (proposed)
**Decided:** `close-bb-tab` connects with `failureReports: false`, like `boot-bb.ts` and `export-grades.ts`.
**Why:** it closes a Blackboard tab through `Tab.close()`, whose attach-set failure would save a Blackboard
screenshot and snapshot; found by #97's row audit; no printed line changes.
**Instead of:** gating SDK-7's cleanup behind REP-0, or leaving the gap.
**By:** Claude (S6 builder r2), for the step agent.

### 2026-10-23 · TAB-3 is gated by REP-0 (proposed)
**Decided:** TAB-3 is in REP-0's gate with REP-1 and SDK-7's MCP leg.
**Why:** its session's tab is `https://example.com`, a non-fixture page, and its `browser_snapshot` runs through the
MCP's `failureReport`; #97 gates "any other row whose failure report could capture a page other than a fixture".
example.com is a public test domain, so the exposure is small; the gate is the conservative reading.
**Instead of:** running TAB-3 regardless.
**By:** Claude (S6 builder r2), for the step agent.
