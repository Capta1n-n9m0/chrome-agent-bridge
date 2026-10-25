# Step 11 S2 — verifier report (the contract: code, gate, matcher, tables)

Model: Opus 5.5 (verifier). 2026-10-25. Audited: `014a98d` (spec §10 note) and `ac31655` (code) against `1fb16a1`.
The builder's report (`S2-builder.md`) was read as claims to audit.

## 1. Verdict

**FAIL.** The rule is `docs/agent-rules.md` §6: a failed exit check is a FAIL. Exit check **S2.2 is not met** and
**S2.5 is met only in part**. The cause is the class-table entry for `uploadFiles`, which the builder escalated. I
judge that escalation correct (§4). Everything that was built holds: no CRITICAL, no MAJOR, 2 MINOR, 5 NIT. Once the
class entry lands, a fresh verifier needs to re-check only S2.2, the gate part of S2.5, and MINOR 1–2.

## 2. Re-run from a clean tree

I made two scratch `git worktree`s, at `ac31655` and at `1fb16a1`, each with its own `npm ci` (no junction). After
the runs I removed the five `node_modules/@bridge/*` workspace junctions with `cmd /c rmdir`, then ran
`git worktree remove --force`. The main tree is untouched: `git status` shows only `journal.md` and
`S2-builder.md`, and `node_modules/.bin` and `@bridge` are intact. Port 9234 was never bound (`netstat` empty).

| Command (at `ac31655`) | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10}.json` | all five exit 0 |
| `npm test` | `Test Files 137 passed (137)`, `Tests 3460 passed (3460)` |
| `npm test` at `1fb16a1` | `Test Files 133 passed (133)`, `Tests 3294 passed (3294)` |
| `npm run build`, then `git status --short` | `built extension → dist/`; no tracked change |

- **Test count:** +166 tests, +4 files. These match the builder's numbers.
- **Name diff** (`vitest --reporter=json` at both commits): no test was removed. Three tests were renamed because
  their title carries a count (`codes.test.ts` ×2: 16→17 extension codes and 26→27 codes; `safety-surface.test.ts`
  ×1). Each kept its body.

## 3. Exit checks

**S2.1 — met.**
- Rows 1–74, M1, N2 and the X rows are in `extension/test/upload-paths.test.ts`.
- My own mutants, run on the `ac31655` copy (the rest of the suite stays green):

| Mutant | Tests red | Rows |
|---|---|---|
| Bare prefix (Windows) | 5 | 14, 15, 18, X34 |
| Bare prefix (POSIX) | 1 | 58 |
| Case-insensitive POSIX | 2 | 56, 57 |
| `..` allowed | 5 | 24, 25, 27, 60 |

- Every other mutant I tried is red too:
  - `toLowerCase` folding (rows 50, 51);
  - a path equal to its folder allowed (12, 59, X22);
  - the drive letter ignored (17);
  - no cap, or empty `paths` allowed, or a non-array allowed (S2.1 and S2.2 rows);
  - C1 controls allowed (X3, X4);
  - ADS, POSIX `\`, DEVICE, DOTSPACE or UNC allowed;
  - a padded folder line trimmed;
  - a wrong-typed `safety.uploadFolders` ignored (4 red);
  - the folders read once instead of per call (1 red);
  - any of the three `file:` rules dropped (5, 1 and 6 red);
  - `isFileUrl` without unwrapping (7 red);
  - a deep nesting counted as not `file:` (1 red).
- Runner: scratchpad `vmut.cjs`.

**S2.2 — partly met.** What holds:
- A path outside every folder, an empty list and no list in the context each give `UPLOAD_REFUSED` (`uploadRefusal`).
- A wrong-typed `safety.uploadFolders` refuses every one of the 26 methods `DISARMED` with
  `STATE_UNREADABLE_MESSAGE`, through the real `GatedRouter` + `CallSafety` + `SafetyStore`, and no handler runs.
  This also holds through `storage.onChanged`.
- A malformed `paths` fails closed.

What is not met:
- `uploadFiles` is not in `METHOD_CLASSES`.
- None of these rows exists *for `uploadFiles`*: disarmed → `DISARMED` with no attach; a blocked tab or the
  extension's own page → `DOMAIN_BLOCKED`; JavaScript off → not refused. The router-scan test also has no
  `uploadFiles` entry.

**S2.3 — met.**
- 27 codes, 26 on the wire (`codes.test.ts`).
- `git log`: `014a98d` (21:10) comes before `ac31655` (21:28).
- `UPLOAD_REFUSED` is not in `ATTACH_CODES`.
- The SDK line and the MCP line are tested, and the tests are red at `1fb16a1` (SDK 2, MCP 3).

**S2.4 — met.**
- `TAB_METHODS` has `uploadFiles`, and `takesLock` is false (`s2-upload-methods.test.ts`, red at `1fb16a1`).
- Over real `ws` on port 0: another client's tab → `TAB_HELD`.
- NIT 4: this lease half also passes at `1fb16a1`, as the builder disclosed.

**S2.5 — partly met.**
- Holds: `log-allowlist.ts` is unchanged (`git diff --stat` empty, 54 entries) and `log-scan` passes.
- Holds: no `console`/`log` call was added in any `src` diff (grep empty).
- Holds: both sentinel tests prove that the capture is live (a badge press; `daemonLog.length > 0`) and find no
  sentinel.
- Not met: the gate's own `uploadFiles` path is not covered.

**#245 (a) — met.**
- Every method of every class that takes a tab is refused at receipt, effect and post (newTab/closeTab post = state
  only, as in Step 9), with url or pendingUrl, live or replaced.
- A gone tab is refused after receipt. `navigate`/`newTab` to a `file:` URL is refused through `CallSafety` +
  `GatedRouter` with no handler run.
- My own probe of `isFileUrl` found no fail-open. `FILE:`, a leading space or NUL, `fi\nle:`, `file:x`, wrapped forms,
  `VIEW-SOURCE:  FILE:` and 5-deep nesting all count as `file:`. Leading NBSP, ZWSP and BOM forms are not `file:`, and
  they need not be: `new URL` rejects all of them, so `resolveOpenUrl` maps them under the extension, which is
  refused.

**#249's classes — each has a row.**
- Rows: BACKSLASH (66, M1, M1b), EMPTYSEG (40), TRAILSEP (13), DEVICE (42–44, X5), DOTSPACE (45–47), LONG, CTRL with
  C1 (X3, X4), and the malformed `paths` cases.
- Gap: no row for a POSIX *folder line* with a trailing `\` (MINOR 1).

**Every-stage checks:** met. Every new test of pure logic is red on `1fb16a1`'s sources (new test files copied in):
- `upload-paths` and `s2-upload-gate`: the module is missing;
- `protocol-step11`: 5 red;
- `codes`: 5 red;
- `s2-upload-methods`: 1 red;
- `safety-gate`: 2 red;
- the extension sentinel test: 1 red.

The daemon sentinel test is a test of absence, and its capture is shown live.

**`file:` reliance (#245's "no existing test or row uses `file:`").**
- `git grep` at `1fb16a1` finds exactly the two `safety-gate.test.ts` cases the builder names (lines 260, 439).
- Other hits are not affected:
  - `handler-codes.test.ts:41` (the `downloadStart` handler's `BAD_PARAMS`);
  - `safety-match*.test.ts` (the matcher only);
  - `recipes/test/s9-rules.test.ts` (URL classing).
- `test-fixtures/` has no `file:` URL.
- `docs/e2e-test-plan.md` names `file:` only at line 48 (served over http to avoid the toggle) and in the scan rules
  of R14-REL-3 and R15-TEARDOWN. No row acts on a `file:` page.
- The builder's finding 1 is confirmed.

**The builder's amendment of the two `safety-gate.test.ts` cases is sound.**
- It follows #245 (a) and carries dated notes.
- The first case now asserts the stricter outcome (`DOMAIN_BLOCKED` with JavaScript off).
- The second case moved its coverage to `s2-upload-gate.test.ts`, which covers every method × phase. Mutant 17 shows
  that coverage turns red.
- Nothing protective was weakened.

**Messages.**
- `UPLOAD_REFUSED_MESSAGE`, `FILE_PAGE_MESSAGE`, `FILE_URL_MESSAGE` and the SDK line are fixed strings. None names a
  path, folder, count or file name, and the refusal has no `data` (probe: `"data" in r` false).

**Spec note (`014a98d`).** It agrees with the code: class `upload`, the order, the key, the `file:` rule, and
`listTabs` not hidden.

## 4. The escalation: correct

I applied the in-lane half on a scratch copy: in `safety.ts`, `upload` added to the union, `TARGETS_BY_CLASS.upload`
and `METHOD_CLASSES.uploadFiles`. The result:
- `tsc -p extension` fails with `safety-call.ts(178,4): error TS2366` (`callTargets` has no default case).
- The scan tests fail: `safety-gate.test.ts` S1.1 ("in sw.ts … and only those") and `s4-save-gate.test.ts` S4.3
  require the table to equal `sw.ts`'s `router.on` names.

The lane (phase doc § Stage S2) holds neither `safety-call.ts` nor `sw.ts`, so the lane cannot carry the class.

**The minimal change outside the lane:**
- `safety-call.ts`: `case "upload":` in `testsTab` (→ `true`) and in `callTargets` (→ `[tabTarget]`). Two labels.
- `sw.ts`: one `router.on("uploadFiles", …)`, either S3's handler or a stub that answers `INTERNAL` behind the gate.

**In the lane:**
- `safety.ts`: the decision branch, which calls `uploadRefusal` after the tab tests.
- The count tests: `gated-router.test.ts:60` (26), S1.1's "23 + 3", S1.2's class matrix, and
  `s2-upload-gate.test.ts:207`'s class set.

Option (iii), loosening the scan, is rightly rejected. Between (i) and (ii), (ii) lets S2.2 close inside S2 as
pre-registered. "No attach while disarmed" is still proven only with S3's handler (its effect check before the
attach).

## 5. Findings

| # | Sev | Where | Finding and evidence | Suggested fix |
|---|---|---|---|---|
| 1 | MINOR | `extension/src/upload-paths.ts:155` | A POSIX folder line with a trailing `\` is **normalised, not refused**. `#249`: "a POSIX-shaped path or folder line holding `\` is refused, never normalised". Probe: `parseUploadFolderLine("/home/u/Up\\")` → `valid {"style":"posix","segments":["home","u","Up"]}`, and that list allows `/home/u/Up/x` (`true`). On POSIX the typed line names a directory `Up\`, so a different folder is granted. The human wrote the line, so this is not reachable by an agent (as M1). No test row. | Strip a trailing `\` only on a drive-letter line (`/^[A-Za-z]:/`), or run the BACKSLASH check on the raw line first. Add the row `"/home/u/Up\\"` → invalid. |
| 2 | MINOR | `extension/src/safety-call.ts:114-125` (forward, for the class entry) | `testsTab` ends in `default: return false`. The compiler forces `callTargets` to name `upload`, but not `testsTab`. If `testsTab` is missed, no tab is read and the target is `{kind:"gone"}` with no `lastUrl`, which is allowed at every phase. A blocked tab, an own page or a `file:` page would then be uploaded to. `safetyDecision`-level rows would not catch this. | The S2.2 rows run through `CallSafety` with a `getTab` returning a blocked, own and `file:` URL → `DOMAIN_BLOCKED`, plus a mutant that drops the `testsTab` label. Also decide whether the folder rule runs for a gone tab at receipt (step 2b returns `allow` before the switch). |
| 3 | NIT | `upload-paths.ts` (whole) | The matcher does not know the platform. A POSIX folder line is accepted on Windows, where Chrome resolves `/x` against the current drive (and a Windows line on POSIX resolves against the working directory). No escape found: `cmd /c type` over `\Up\...\`, `\Up\sub\.. \`, `... ` and trailing dots never left the folder (scratch `dots`). | S3's options page refuses lines of the other style (`chrome.runtime.getPlatformInfo`); or record it as a known limit. |
| 4 | NIT | `daemon/test/tabs.test.ts` "Step 11 S2.4" | The lease half passes at `1fb16a1` (disclosed). Only `s2-upload-methods.test.ts` discriminates. | None; recorded. |
| 5 | NIT | `extension/src/safety-match.ts:258` | Wrappers nested deeper than 4 now count as `file:`, so a `view-source:`×5 of an `http` URL is refused with "a local file", where it was allowed before. This fails closed, but the text misleads. | Accept; or use a neutral message for the depth case. |
| 6 | NIT | spec note; builder decision 3 | `listTabs` rows and tab events of a `file:` tab still carry the URL, which is a local path and possibly under the user's profile. #245 (a) names calls only. The builder already lists this for user review. | User review with #245 (the stricter option hides them as blocked rows are hidden). |
| 7 | NIT | `S2-builder.md` §2 | "No test was removed" holds, but three count-bearing titles were renamed and the report does not list them per file. | List them in the step report. |

## 6. Process note

- The scratchpad is shared. My first `git worktree add …/scratchpad/wt` failed because a non-git directory `wt` (not
  mine, left from an earlier agent) already existed. My chained `npm ci` then ran in that directory and added a
  `node_modules` there.
- It is outside the repo and holds no junction into the main tree. I left it as found otherwise.

## 7. Handoff

- No processes left. Port 9234 is free.
- Scratch evidence in the session scratchpad: `vmut.cjs`, `vmut.out`, `vprobe.out`, `vdiff.cjs`, `v-test.log`,
  `v-test0.log`, `v-tc.log`, `v-build.log`.
- Next: the step agent rules the escalation (§4), then a fresh verifier re-checks S2.2, S2.5's gate part, and MINOR 1
  and 2.
