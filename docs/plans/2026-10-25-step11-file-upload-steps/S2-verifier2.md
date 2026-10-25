# Step 11 S2 — verifier report, round 2 (after fix rounds 1 and 2)

Model: Opus 5.5 (verifier). 2026-10-25. Final tree `8ab6923`; stage base `1fb16a1`. Audited: `5827f32` (MINOR 1) and
`8ab6923` (#256: the class entry, the labels, the stub). `S2-fixer.md` and `S2-fixer2.md` were read as claims to audit.

## 1. Verdict

**PASS-with-notes.** S2.1–S2.5 and the every-stage checks hold on the final tree. The earlier S2.2 and S2.5 gaps are
closed, and MINOR 1 and MINOR 2 are fixed, each proven by a mutant I ran myself. There is no CRITICAL, MAJOR or MINOR
finding. There are 2 NITs (§5).

## 2. Re-run from a clean tree

- **Worktree:** `git worktree add --detach …/scratchpad/wt-s2v2 8ab6923`, with its own `npm ci` and no junction into
  the main tree.
- **Cleanup:** I removed the five `node_modules/@bridge/*` workspace junctions with `cmd /c rmdir`, then ran
  `git worktree remove --force`.
- **Main tree:** untouched. `git status` shows only the pre-existing `journal.md` and `S2-fixer2.md`, and
  `node_modules/.bin` and `@bridge` are intact.
- **Port 9234:** never bound (`netstat` empty).

| Command (at `8ab6923`) | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10}.json` | all five exit 0 |
| `npm test` | `Test Files 137 passed (137)`, `Tests 3489 passed (3489)` |
| `npm run build`, then `git status --short` | exit 0 (`built extension → dist/`); no tracked change |

- **Test count:** 3294 at `1fb16a1` (S2-verifier.md) → 3461 at `5827f32` → 3489 at `8ab6923`. The fixers' figures
  match.
- **No test removed in the fix rounds.** `git show 8ab6923 -- '*.test.ts' | grep -E "^-\s*(it|test|describe)\("`
  shows three lines, and each is a title renamed in place with a dated note:
  - `gated-router.test.ts`: "26 methods" → "27 methods";
  - `s2-upload-gate.test.ts`: the class list, which gained `upload`;
  - `safety-gate.test.ts` S1.1: the method list.

  The same grep on `5827f32` shows nothing.

## 3. Exit checks

**S2.2 — met.**
- **The table.** `METHOD_CLASSES.uploadFiles === "upload"` and `TARGETS_BY_CLASS.upload = [live, replaced, gone]`. The
  router scan passes with 27 names equal to the table (`safety-gate.test.ts` S1.1 and `s2-upload-gate.test.ts`
  "#256 — the router scan").
- **The behaviour rows** run through the real `GatedRouter`, `CallSafety`, `SafetyStore` and a `getTab` mock
  (`extension/test/s2-upload-gate.test.ts:409-527`):
  - disarmed → `DISARMED {scope:"all"}`, and no handler runs;
  - a disarm before the effect check → no attach;
  - a blocked tab, this extension's own page and a `file:` page (by `url` or `pendingUrl`) → `DOMAIN_BLOCKED`;
  - outside every folder, an empty list, a list that is absent or holds only comments, a malformed `paths` →
    `UPLOAD_REFUSED`;
  - a wrong-typed `safety.uploadFolders` → `DISARMED` with `STATE_UNREADABLE_MESSAGE`;
  - JavaScript off → the handler runs.
- **Caveat (not new).** "No attach" is shown against a stand-in handler that calls `effect()` before `attach()`. The
  real handler's check is S3.3, as S2-verifier.md §4 already noted.

**S2.5 (gate part) — met.**
- `git diff 1fb16a1 8ab6923 --stat -- extension/test/log-allowlist.ts extension/test/log-scan.test.ts` is empty.
- No `console.`/`log(` line was added under any `src` in the stage diff (grep empty).
- `log-scan.test.ts` (16) and `log-sentinel.test.ts` (6) pass.
- The stub's message is fixed and names no path (`s2-upload-gate.test.ts:533`).

**S2.1, S2.3, S2.4 — still hold** (checked at the test-run level, all green in the full run):
- `upload-paths.test.ts` (126);
- `codes.test.ts` (6) and `protocol-step11.test.ts` (5);
- `sdk/test/safety.test.ts` (27) and `mcp/test/safety.test.ts` (43);
- `daemon/test/s2-upload-methods.test.ts` (1), with `tabs.test.ts` in the full pass.

The spec note `014a98d` still comes before `ac31655` in `git log`, unchanged.

**MINOR 1 (`5827f32`) — fixed.**
- `extension/src/upload-paths.ts:154-157` now strips a trailing `\` only when the line matches `WIN_DRIVE_RE`
  (`/^[A-Za-z]:/`, line 79). A POSIX line keeps its `\`, so `shapeOf` refuses it (BACKSLASH).
- Mutant M5 (the old strip restored): `Tests 1 failed | 1879 passed (1880)`. The red test is "S2 verifier MINOR 1
  (#249): a POSIX folder line ending in `\` is refused, never normalised".

**MINOR 2 (`testsTab` default) — fixed.** I ran the mutant myself.
- Mutant M1 (the `case "upload":` label in `testsTab` deleted): `Tests 3 failed | 1877 passed (1880)`. The red tests:
  - "a blocked tab, this extension's own page and a file: page … → DOMAIN_BLOCKED; no handler runs";
  - "a tab that turns blocked between receipt and the effect check";
  - "control … the handler runs and attaches" (the `getTab` call is missing).
- Mutant M7 (`callTargets` upload → `[{kind:"gone"}]`): 2 red.

**The stub cannot be reached with an empty folder list — met.**
- The test (`s2-upload-gate.test.ts:541`) covers no folder (4 forms) × JavaScript on/off × a tab live or gone × 6
  `paths` forms. Every call answers `UPLOAD_REFUSED`, and the stub is never called. A control case shows the stub is
  reachable when a folder holds the path.
- It turns red under each of these mutants:
  - M2: the folder rule removed for a tab gone at receipt (3 red);
  - M3: the folder rule removed after the tab tests (7 red);
  - M4: both removed (9 red);
  - M6: the JavaScript switch applied to `upload` (8 red; this also guards the "JavaScript off → not refused" row).
- Limit: the test re-registers a stub that carries `sw.ts`'s message, and the regex pins `sw.ts`'s shape. It does
  not run `sw.ts` itself, which is the `chrome.*` glue.

**The lane stayed inside #256 — met.**
- `git show 8ab6923 -- extension/src/safety-call.ts`: exactly two `case "upload":` labels, `testsTab` → `true` and
  `callTargets` → `[tabTarget]`, plus their comments.
- `sw.ts`: one top-level `router.on("uploadFiles", async () => { throw … })` and its import (`BridgeError,
  ErrorCodes` from `./errors.js`, which the stub needs). There is no `await`, and `grep "^await" extension/src/sw.ts`
  is empty.
- Every other file in the commit is `safety.ts` or `extension/test/`, all inside the lane.

**The count-test changes weaken no protective check.** I read each diff in `8ab6923`:
- `gated-router` 26→27 still asserts that every method is refused and that zero handlers run.
- `safety-call` "allow for every method": `uploadFiles` now has to be *refused* `UPLOAD_REFUSED`, which is stricter.
- `safety-gate` S1.2 gives `upload` real expectations, 12 rows that M3, M4 and M6 turn red. The two "allow" loops
  give `upload` a folder and a path inside it, which is the only allowed form under 0.5. The gone row now also asserts
  `UPLOAD_REFUSED` without a folder.
- `sw-static` keeps the named-handler count at 26 and adds a new check that the one other registration is exactly
  the stub, which is stricter.

**Every new test fails without the change.**
- I put `5827f32`'s `extension/src` under `8ab6923`'s tests and ran `npx vitest run extension/test`:
  `Tests 21 failed | 1846 passed (1867)`.
- The 21 red are all 15 new `#256` cases and the 6 count and scan tests that the entry moves. The 1867 vs 1880
  difference is the S1.2 matrix and the other loops, which are generated from `METHOD_CLASSES`.
- Log: scratchpad `v2-redbefore.log`.

**Security boundary — holds.**
- The bind, the token and the daemon are untouched.
- No log site was added.
- No wire method reads or writes `safety.uploadFolders`.
- The JavaScript switch does not apply to `upload`.
- Refusal texts are fixed and carry no `data`.

## 4. The fixer's proposed decision (folder rule for a tab gone at receipt)

**Sound, and it fails closed.**
- `safety.ts:333-335`: at receipt, a gone tab of class `upload` runs `uploadRefusal` and answers `allow` only when
  every path is inside a folder. Otherwise it is refused before any handler runs.
- Nothing is revealed beyond what a live-tab refusal already reveals.
- When the paths are allowed, the call still reaches the handler as #137 does for every tab class. After receipt, a
  gone tab is refused by its last URL (the test at `:524`). Because S3's handler must call `effect()` before it
  attaches, a gone tab whose last URL was blocked never gets an upload.
- No other class's reply changes: M2 turns red only `upload` rows.

## 5. Findings

| # | Sev | Where | Finding and evidence | Suggested fix |
|---|---|---|---|---|
| 1 | NIT | `extension/src/safety.ts:333-335`; spec §10 note (`014a98d`) | For a tab gone at receipt whose last URL was blocked or `file:`, a path outside the folders answers `UPLOAD_REFUSED`, not `DOMAIN_BLOCKED`. The tab tests are skipped at receipt (#137) while the folder rule is not. This differs from the literal order `DOMAIN_BLOCKED > UPLOAD_REFUSED` only for a closed tab; nothing reaches a handler. The spec note does not mention the gone-tab case (the fixer flagged this). | The session agent records the proposed decision and adds one line to the spec note. |
| 2 | NIT | `extension/test/s2-upload-gate.test.ts:541-575` | The stub-unreachable test checks the gate with a stub rebuilt from `sw.ts`'s message, not with `sw.ts`'s own function. That is acceptable for `chrome.*` glue, because the shape is pinned by regex at `:533` and in `sw-static.test.ts`. | None; recorded. |

## 6. Handoff

- I started no processes, and port 9234 is free. The scratch worktree is removed.
- Evidence in the session scratchpad:
  - `v2mut.cjs` (the mutant runner, M1–M7);
  - `v2mut.out`;
  - `v2-redbefore.log`;
  - `s2v2-test.log`, `s2v2-build.log`, `s2v2-typecheck.log`, `s2v2-recipes-*.log`.
- S2 can close. S3 replaces the stub and rewrites the stub assertions, as `S2-fixer2.md` §6 says.
