# S7-drivers-A fixer, round 2

Model and effort: Sonnet 5.5, medium. Role: fixer (agent-rules §6). Nothing drove Chrome, the daemon or port 9234. Not committed.

## 1. Verdict
DONE. N2, MINOR-1/2/3 and the four NITs are fixed. N1 is left as the step agent directed. One extra defect found while fixing NIT-1 is fixed (below).

## 2. Outputs
| Finding | Fix | file:line | Test |
|---|---|---|---|
| N2 (MAJOR) | `readAt = Date.now()` just before `entriesOf`; `floorCounts` takes optional `readAt` and drops ticks/errors with `t >= readAt` before counting (a cut at the end keeps the `i + 1` numbers) | `s12-r19-a.ts` conFloor (`readAt`, `floorCounts({... readAt})`); `s12-forms.ts:70-76` | `s12-r19-a.test.ts` "CONFLOOR: only ticks logged before the read count": without `readAt` after-ticks 3 (in reply 2), with it 2/2 |
| MINOR-1 | after window starts at the ON title, the disarmed window ends at the ON press: `floorCounts` gets `onTitleMs` (default `onMs`). The undo step now writes `"pre,post"`; the actor passes `onMs: pre`, `onTitleMs: post` | `s12-r19-a.ps1:20`; `s12-r19-a.ts` conFloor; `s12-forms.ts:70-77` | same test (title 600 ms after press: after-ticks 1, disarmed 3); S15 updated to expect `pre,post` |
| MINOR-2 | `browser_status` recorded as `status lines=<n> extension=<connected\|other> active=<fixture\|other\|none>`; judged on raw text first (unchanged); `scanActors` untouched | `s12-r19-a.ts` `actorRecord` | "a browser_status result is never written whole": non-fixture title/URL/`://`/handle absent, record passes `scanActors` |
| MINOR-3 | `Close-R19Bc` moved after `rd-restore`, in `try/catch` printing a fixed CHECK word; liveA19 only | `s12-r19-lib.ps1:217-219` (net +1 line) | "the toolbar check is the exact armed title, and R19-RESTORE closes the bc tab after the safety restore" (order); S7-helpers-d tests green |
| NIT-1 | `Test-R19Armed` is `-eq $S9TitleArmed` | `s12-r19-a.ps1:69` | static assertion; PowerShell stubs now use the real title strings |
| NIT-2 | CON-4's MCP judge: not a one-line change (it needs a new compare in `judgeMcpRefusal` plus its call-site data); left as the ruled "acceptable" | none | none |
| NIT-3 | dated sheet note: docs are not in my lane; for the session agent | none | none |
| NIT-4 | `fixture-handle` splits on `[\s*]+` (so `T2*` counts); `list_tabs` check requires `mt !== ""`; B/C drivers must call `Close-R19Bc` (noted in §7) | `s12-r19-a.ts` `actorRecord`, conMcp probes | list-tabs `T2*` case in the status test; static match for `mt !== ""` |
| N1 (MAJOR) | no change: the actor's 3 s disarmed wait stays by the step agent's direction (§4.27's step text says "wait 3 s"); a sheet bound is a finding, not an edit. A comment marks the line | `s12-r19-a.ts` conFloor | none |

Extra defect, found while doing NIT-1: the previous `Test-R19Armed` matched `'safety: armed*'`, but that is the worker's LOG line (`extension/src/badge.ts` `LOG_LINES`, `s9-rules.ts logArmed`). `Get-S9ActionTitle` returns the toolbar title (`Chrome Agent Bridge — armed (click to turn off)`, `s9-win.ps1:179`). Live, the old test would never have read armed and `Switch-R19Toolbar` would have stopped the wave on its first call. Round 2's verifier checked the string against the log lines, and the test stub returned the log text, so both missed it. The `-eq` fix covers it. A JS-off armed title ("armed, JavaScript off") does not equal `$S9TitleArmed`; R19-CON-FLOOR runs with JS on, so that holds.

Numbers (this run):
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.
- `npx vitest run recipes/test`: 1481 / 62 → **1484 passed, 62 files**.
- `npm run typecheck`: exit 0. `npm test`: 5381 / 228 → **5384 passed, 228 files**. `npm run build`: `built extension → dist/`.
- `wc -l`: `s12-r19-a.ts` 591 (was 586), `s12-r19-a.ps1` 109, `s12-forms.ts` 136 (was 126), `s12-r19-lib.ps1` 243 (+1 net), `test/s12-r19-a.test.ts` 449 (was 422).

## 3. Deviations
- The three new tests were written after the code, not before. They do discriminate: the N2 test's without-`readAt` line fails the 2-vs-3 expectation by construction, and my first draft failed on a wrong fixture, not on the code.
- NIT-2 and NIT-3 not done (above).

## 4. Proposed decisions
### 2026-10-28 · The actor's records of existing-tool probes keep counts, never the human's tab text
**Decided:** `actors-<slice>.jsonl` holds, for `browser_list_tabs` and `browser_status` (the two tools that name the human's tabs), only a line count and fixed words (`fixture-handle=yes|no`; `extension=connected|other active=fixture|other|none`). What a row judges from them is judged on the raw text before it is written. **Why:** a non-fixture title or URL in that file fails R19-LOGS (`other > 0`) for every pending row. **Instead of:** an exemption in `scanActors`. **Revisit if:** another tool's text names a tab. **By:** Claude (proposed)

### 2026-10-28 · The ON toolbar signal carries two times
**Decided:** the `-done` pressed file of a toolbar undo step holds `"<press>,<title>"`; CON-FLOOR's after window starts at the title, its disarmed window ends at the press. **Why:** the sheet's two sides name different instants. **Instead of:** one time for both. **By:** Claude (proposed)

## 5. Findings
Test stubs that return a string the product only logs can pass while the live check is always false; a stub must use the constant the helper really reads.

## 6. Handoff
- N1 still open for the step agent/session agent: the verifier's estimate is that `disarmed-ticks >= 3` fails on most runs at a 3 s wait; its proposed 4.5 s decision needs a ruling before the run. Not measured.
- M6 (size) remains for the step agent.
- The B/C drivers must call `Close-R19Bc` in their R19-RESTORE (`bannerCtlRow` writes `bc-tab.txt` in every slice).
- Dated sheet note for the CON-OWN/CON-FILE ruling (NIT-3) is for the session agent.
