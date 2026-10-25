# S5-sheet verifier report, round 2 (re-check after fix round 1)

**Model:** Claude Opus 5.5. **Role:** verifier (agent-rules §6), read-only. **Audited:** the uncommitted
`docs/e2e-test-plan.md` §4.23 (lines 1445–1540) at HEAD `7c4857d`, the items the fixer touched (1455, 1482, 1489,
1493, 1495, 1497); the claims in `S5-sheet-fixer.md` against the first report `S5-sheet-verifier.md`.

## 1. Verdict

**PASS-with-notes.** F1–F5 and N1 are fixed as described and match the code. K-notarget in UP-6 is answered by the
handler before the file-access read, and UP-6 is a liveA row, so it runs whatever the toggle reads. One new MINOR
(a precondition the fix made load-bearing) and one NIT.

## 2. Checks

| Check | Result | Evidence |
|---|---|---|
| F1 (1493) UP-L1 expects K-gate for both calls | fixed, correct | `router.ts:51-54`: `gate(...)` + `receipt()` before `handler(...)` at :61; `safety.ts:337-339`: class `upload` → `uploadRefusal` after the tab test; `<ROOT>` not yet allowed → `UPLOAD_REFUSED`. A Step 10 extension has no handler → `UNKNOWN_METHOD` (`router.ts:43-45`) |
| F2 (1497) raw `..` call, `<OUTSIDE>` defined | fixed, correct | the daemon does not inspect upload params (`isUploadFilesParams` is used only in `shared/test`); `upload-paths.ts:96` `".."` → `DOTSEG` on the raw string, so a naive prefix matcher would wrongly allow `<ROOT>\..\…`: the step discriminates. `<OUTSIDE>` = `<ROOT>`'s sibling `outside`, made before UP-L1, matching `<ROOT>\..\outside\s11-out.bin` and UP-L1's second call |
| F3 (1455) UP-9 kept, reason stated | fixed | the sentence names 0.12/#251 as the only reason; count 17 unchanged |
| F4 (1489) table text is the pass rule | fixed | "never an update of the table"; a differing constant is a STOP before liveA |
| F5 (1495) both moments | fixed, correct | `options-model.ts:150-166`: `parsed.count` counts valid lines; `C:\Users\fixture-home` is valid with `holdsHome` (`:113-116`, win, 2 segments, `users`) → warning, not invalid; `C:\` → `ROOT_LINE` (`:125`) invalid; summary `<n> upload folders. 2 invalid lines are not used (marked below).` (`:161-165`) |
| N1 (1482) | fixed | `UPLOAD_FOLDERS_WARNING` at `options-model.ts:100-101` |
| **Brief check 2:** K-notarget order | holds | `handlers/upload.ts:96` `checkUploadParams(p)` first (`:36-37`, no-ref-no-locator → `BAD_PARAMS UPLOAD_TARGET_REQUIRED_MESSAGE`); then `pageTab` (:97), then `readFileAccess` (:98-99). The gate before it passes with `<ROOT>` allowed (live fixture tab, armed, JS on, path in folder). `checkTarget` (`target.ts:59-69`) throws only for both or a bad locator |
| **Brief check 2:** is UP-6 waiting on G11-3? | no | UP-6 is `A` in the Live column (1497), in liveA's order (1453) and in the "still run" list (1455), not among the 17. So K-notarget runs with the toggle off. No coverage loss either way: neither 0.12 nor S3.md §7 names a no-target row (`grep "no target\|needs a ref\|UP-L1"` on the phase doc and S3.md: no hit); it was the builder's addition |
| Waiting list vs Live marks | consistent | the 17 names in 1455 are exactly the rows marked `B` only (UP-1…5, 6B, 8, 9, PATCH, TWICE, RAW, NAV, DEVT, STALE, 7J, RACE-A, RACE-B); 1453's liveA/liveB lists and 1455's "still run" list agree with the column |
| Diff scope | holds | `git diff --stat HEAD`: `docs/e2e-test-plan.md` +96, `journal.md` +1 (session agent's); `git diff HEAD -- docs/e2e-test-plan.md \| grep -c '^-[^-]'` = 0; §5 still at 1541; steps-dir reports untracked as expected |

## 3. Findings

### M1 — MINOR — no stated check that the found Upload folders allow neither `<ROOT>` nor `<OUTSIDE>`
`docs/e2e-test-plan.md:1493, 1497` (also 1498 (c), 1508). After the fix, UP-L1 (a STOP-on-FAIL row) expects K-gate
for a path under `<ROOT>`, and `<OUTSIDE>` is now fixed as `<ROOT>`'s sibling. Both expectations hold only if no
folder in the **found** Upload folders text contains `<ROOT>` or `<ROOT>`'s parent. The default is empty (#236), but
the guard (1457) accepts "any Upload folders text", and nothing in the sheet checks this. If a found folder were an
ancestor, UP-L1 would answer K-notarget, a FAIL and a STOP for a set-up reason, and UP-6 outside/`..`, UP-7 (c) and
UP-9 would answer `ok` or K-notarget instead of K-gate (with the toggle on, a real upload outside the intended
folder). Pre-existing in kind, but the fix's sibling definition and UP-L1's new K-gate make it load-bearing.
**Fix:** in the preflight (before UP-L1, since UP-L1 precedes UP-0), have the helper run the found text through the
same matcher (`parseUploadFolders`/`uploadPathsAllowed`) for `<ROOT>\s11-1k.bin` and `<OUTSIDE>\s11-out.bin`; either
allowed → STOP before any change (choose another base folder), result recorded as a boolean, the text never printed.

### N1 — NIT — UP-L1's build proof is now S2's gate, not S3's handler
`docs/e2e-test-plan.md:1493`. K-gate (`UPLOAD_REFUSED`) proves the loaded extension has S2's class `upload`; the
S3 handler is first proven by UP-6's K-notarget. Harmless (the reload loads the current `dist/`), but the phrase
"proves the Step 11 build is loaded" could say "proves a build with the Step 11 gate; UP-6's K-notarget proves the
S3 handler".

## 4. Integrity floor

The fixes change pre-written expected text before any Run 16 observation; nothing was re-tuned against a result.
The fixer's proposed decision (UP-9 waits only because 0.12 lists it) is conservative and accurate by code order
(the junction's real path is refused by the gate at receipt); endorse.

## 5. Handoff

No processes, no edits besides this file, no commit. M1 is a one-sentence addition to the preflight/UP-L1 text; the
step agent may accept with notes or send a fixer.
