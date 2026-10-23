# S4 fixer, round 1: SDK failure reports

Fixer: Opus 5.5, 2026-10-23. Lane: `sdk/src/`, `sdk/test/` only; nothing committed. Inputs: `S4-builder.md`,
`S4-verifier.md` (findings 1–9), the step agent's rulings for findings 1–4 and 6.

## Findings

| # | Verdict | What changed | Where |
|---|---|---|---|
| 1 MAJOR | fixed | (a) new `remapRefs(data, snapshot)`: each `data.candidates` / `data.matches` item gets the ref of the one snapshot element with the same name, and the same role when the item has a non-empty role. Matches have no role, so they match by name only. Zero or several hits delete the item's `ref` key. The objects are mutated in place, and their other fields are untouched. It runs in `enrich` after the cut. (b) No snapshot (rejected or cut) → every such `ref` is deleted. `ReportInput.refsWithheld` adds the tail line `Refs withheld: the report's snapshot did not arrive but may still have renumbered the tab's refs — take a new snapshot before using any ref.` That line is not in `attachErrors`. (c) `report()` prints refs only from the rewritten data. The window anchors only on a candidate/match ref whose snapshot element has the same name (and role). The failing call's ref no longer anchors: `AttachOptions.ref`, `ReportInput.ref`, and the `ref` parameter of `Tab#reported` and `Tab#send` are removed. With no valid anchor the window starts at the top. (d) The report line `Refs: this snapshot renumbered the tab's refs — refs from before the failure are void; use the refs shown.` comes before the snapshot header whenever a snapshot is attached, and it is counted in the 60-line budget. The same fact is in the error.ts header comment, the `snapshot` augmentation JSDoc and the `failureReports` JSDoc. | `sdk/src/error.ts` :25-30 (header), :43-48 (field JSDoc), :218-220, :233, :249-250, :283-310 (`namedLine`, `sameElement`, `remapRefs`), :349, :378-384, :407-427; `sdk/src/tab.ts` :134-160; `sdk/src/connect.ts` :37-48 |
| 2 MINOR | fixed | The `call` that `Tab#reported` hands to `attachContext` is now `async (m, p, o) => { this.#guard(); return this.#host.call(m, p, o); }`. After a 4002 each attach call fails locally as `TAB_UNKNOWN` with no frame sent, and the failure lands in `attachErrors`. | `sdk/src/tab.ts` :141-160 |
| 3 MINOR | fixed | The `connect()` test sets `HOME` and `USERPROFILE` to a temp dir and restores them in `finally`. With reports on, it asserts that `screenshotPath` sits directly in the temp `BRIDGE_FAILURES_DIR` and that the fake home stays empty. No `homedir` was added to `ConnectOptions`. | `sdk/test/failure-report.test.ts` :446-498 |
| 4 MINOR | fixed (test only) | A unit test calls `attachContext` twice on one error. It expects exactly one set of the three calls, and the same `report` function both times. | test :842-864 |
| 6 NIT | fixed | A role that is absent or empty is omitted: `  - "Go" [ref=e1]`, with no `?`. The heading is now `Nearest candidates:`. | `sdk/src/error.ts` :283, :349; test :556-569 |
| 5, 7 | not touched (accepted) | | |
| 8, 9 | not touched (the step agent records the proposed decisions) | | |

Disputed: none.

### Tests added or changed (`sdk/test/failure-report.test.ts`, 56 → 64)
- Removed: the two "REF_STALE anchors on the failing ref" tests. That behaviour is now wrong by ruling 1c.
- Added in `report()`:
  - "REF_STALE through a Tab call: the window is NOT anchored on the failing ref…". The report shows `e1`, not `e300`, and has no "above" marker.
  - The finding-6 wording test.
- New describe for finding 1, built on the verifier's Home/Delete/Create folder/Upload/Create item page (`RENUMBERED`). The candidates arrive numbered as `locate` numbered them.
  - Rewrite: the refs become `e5/e3/e2/e4`, and the `hint` field is untouched.
  - Ambiguous and role-mismatch cases lose the ref. An empty role matches by name only.
  - Matches with no role are remapped by name.
  - The window anchors on the rewritten `e150`, not on the wire's `e1`.
  - A rejected snapshot drops every ref and prints the withheld line. `attachErrors` holds only `snapshot: PAGE_ERROR boom`.
  - A snapshot cut at 5 s drops every ref.
  - `expectRefsValidIn` checks that every `[ref=…]` line of `report()` names an element of the attached snapshot with the same name and role. It runs on the rewrite, matches, ambiguous and anchor tests.
- New describe for finding 2: the verifier's repro. The first daemon answers `click` with `REF_STALE` and then sends `fireClose(4002)` in the same turn. The second connection receives no frame at all. `attachErrors` holds `snapshot|screenshot|network: TAB_UNKNOWN …`, and `REF_STALE` is rethrown.
- New describe for finding 4: see the table.

## Fail-without-change

Each mutant reverts one code part. They were run by `<scratchpad>/mutate.py` against `sdk/test/failure-report.test.ts`, and each was restored. Afterwards `cmp` showed `error.ts` and `tab.ts` byte-identical to copies taken before the run. `~/.chrome-agent-bridge/failures` did not exist before or after, including under M3.

| Mutant (code part reverted) | Result |
|---|---|
| M1a `remapRefs` not called | 6 failed: all six finding-1 tests |
| M1b role ignored in matching | 1 failed: ambiguous / role-mismatch |
| M1c no snapshot → refs kept | 2 failed: rejected, cut |
| M1d old behaviour: the failing call's ref passed from `Tab` and anchoring | 1 failed: the new REF_STALE test |
| M1e renumbered note removed | 1 failed: rewrite test |
| M1f refs-withheld line removed | 2 failed: rejected, cut |
| M1g anchor not checked against the snapshot element | 2 failed: the anchor test, and the existing LOCATOR_NOT_FOUND window test |
| M2 attach calls not stale-guarded | 1 failed: the finding-2 repro |
| M3 `BRIDGE_FAILURES_DIR` ignored | 3 failed, including the `connect()` test; it wrote into the temp home, not the real one |
| M4 double-enrich guard removed | 1 failed: the finding-4 test |
| M6a `?` role placeholder back | 3 failed: wording, ambiguous, matches |
| M6b "(none matched the locator)" back | 1 failed: wording |

## Checks

```
$ npx vitest run sdk/
 Test Files  19 passed (19)
      Tests  355 passed (355)

$ npm run typecheck
> tsc -p shared/tsconfig.json && tsc -p daemon/tsconfig.json && tsc -p sdk/tsconfig.json && tsc -p mcp/tsconfig.json && tsc -p extension/tsconfig.json
typecheck exit 0        (S2b's in-flight daemon/extension files compiled too; no failures)

$ npm run build
built mcp → dist/index.js
> @bridge/extension@0.1.0 build
> node build.mjs
built extension → dist/

$ grep -rn "console\." sdk/src
(empty)
grep exit 1
```

## Files changed by the stage (commit pathspec)

- `sdk/src/error.ts` (new)
- `sdk/src/tab.ts`
- `sdk/src/client.ts`
- `sdk/src/connect.ts`
- `sdk/test/failure-report.test.ts` (new)
- `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S4-builder.md`, `S4-verifier.md`, `S4-fixer1.md`, `S4.ledger.md`

The fix round touched only `sdk/src/error.ts`, `sdk/src/tab.ts`, `sdk/src/connect.ts`, `sdk/test/failure-report.test.ts`
and this report. `sdk/src/client.ts` is unchanged in this round. S2b's lane is `daemon/` and `extension/`, so every
uncommitted change under `sdk/` belongs to S4.

## Round 2

Inputs: "## Re-check round 1" in `S4-verifier.md` (R1-1 MAJOR, R1-2 NIT), and the step agent's amended ruling
for R1-1. Lane: `sdk/` only. Nothing committed.

### R1-1 (MAJOR): fixed per the amended ruling
- **New rule.** In `sdk/src/error.ts`, `sameElement` (:293-301) needs a non-empty role. It matches when the role is
  equal and the name is equal. So `remapRefs` (:303-320) rewrites an item only when the item has a role and
  exactly one snapshot element has that role and that name.
- **Items that lose their ref.** Any item whose role is empty or absent has its `ref` key deleted, always. That
  covers every match and every `{text}` candidate of an element with no role. Items with zero hits or several
  hits lose it too.
- **Comments and JSDoc updated:**
  - the header comment in `error.ts` (:25-32);
  - the JSDoc of the `snapshot` augmentation (:46-51);
  - the JSDoc of `sameElement` and `remapRefs`;
  - the `failureReports` JSDoc in `sdk/src/connect.ts` (:41-46).
- **Report wording.** Nothing in it implied that matches keep refs: the lines say "use the refs shown", and a
  match line now has none.

### R1-2 (NIT): the anchor re-check is removed
- **Why it was redundant.** `renderReport` gets data only from `enrich`, after `remapRefs`. Every ref that
  survives there is the ref of the one snapshot element with the item's role and name. The lookup by ref
  therefore always found that same element.
- **Change.** The window anchor is now `findIndex(e.ref === ref)` alone (`error.ts` :418-425), with a comment
  explaining why.
- **Mutant.** None: it is a deletion. The verifier's R1g had already shown that the check changed no outcome.
  My round-1 "M1g" was a different, inverted mutant, which is why that claim did not reproduce.

### Tests (`sdk/test/failure-report.test.ts`, 64 → 65)
These are designed changes that follow from the amended ruling.
- **"an ambiguous or role-mismatched candidate loses its ref; an empty role matches by name only"** is now
  "an ambiguous, role-mismatched or role-less candidate loses its ref". Its third item (`role: ""`, name
  `Delete`) used to expect `ref: e3`, the link. It now expects no ref, and no candidate line carries a ref.
- **"matches (no role) are remapped by name"** is replaced by the verifier's repro, "matches (no role) never
  keep a ref: {css:"p"} on `<p>Go</p><p>Stop</p><button>Go</button>`". The snapshot lists only `button "Go"` as
  `e1`. The matches come back as `[{name:"Go"},{name:"Stop"}]`. The report prints `  - "Go"` with no ref.
- **New: "a {text} candidate with role "" named like a snapshot button keeps no ref"**, the verifier's
  `{text:"Totl", exact:true}` repro on `<button>Total</button><p>Loading</p><p>Total</p>`. The `<p>` candidate
  (`role: ""`) loses its ref. The button candidate keeps `e1`. Every printed ref is valid in the snapshot.

### Fail-without-change, round 2
The mutants were run by `<scratchpad>/mutate2.py` and restored. Afterwards `cmp` showed `error.ts` and `tab.ts`
identical to the copies taken before the run. The real `~/.chrome-agent-bridge/` holds only `daemon.log`.

| Mutant | Result |
|---|---|
| R2a: role-less items match by name (the round-1 rule) | 3 failed: the three tests above |
| M1a: `remapRefs` not called | 7 failed |
| M1b: a non-empty role is not compared | 1 failed |
| M1c: no snapshot → refs kept | 2 failed |
| M1e: the renumbered note removed | 1 failed |
| M1f: the withheld line removed | 2 failed |
| M2: attach calls not stale-guarded | 1 failed |
| M3: `BRIDGE_FAILURES_DIR` ignored | 3 failed |
| M4: the double-enrich guard removed | 1 failed |
| M6a: the `?` placeholder back | 3 failed |
| M6b: the parenthesis back | 1 failed |

Two round-1 mutants were dropped:
- M1d is now equivalent: `ReportInput` has no ref.
- M1g's target was deleted under R1-2.

### Checks, round 2
```
$ npx vitest run sdk/
 Test Files  19 passed (19)
      Tests  356 passed (356)
$ npm run typecheck   → exit 0
$ npm run build       → exit 0
$ grep -rn "console\." sdk/src   → (empty), exit 1
```

Files touched in round 2: `sdk/src/error.ts`, `sdk/src/connect.ts`, `sdk/test/failure-report.test.ts` and this
report. The stage's commit pathspec is unchanged from round 1.
