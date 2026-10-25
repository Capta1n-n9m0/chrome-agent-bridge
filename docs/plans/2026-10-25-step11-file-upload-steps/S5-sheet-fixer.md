# S5-sheet fixer report

**Model:** Claude Sonnet 5.5 (medium). **Role:** fixer. **Verdict:** DONE. Not committed. Only `docs/e2e-test-plan.md` §4.23 touched (still +96 lines vs HEAD, 0 removed; §5 still at 1541). No finding disputed.

## Per finding

- **F1 (line 1493, UP-L1):** expected text is now K-gate for both raw calls; the rationale says the gate refuses at receipt before the handler, that UP-L1 precedes UP-OPT, and that `UPLOAD_REFUSED` (not `UNKNOWN_METHOD`) proves the Step 11 build. K-notarget moved to UP-6 (line 1497), after UP-OPT, as a new raw no-target step with `<ROOT>\s11-1k.bin` (ROOT allowed, so the gate passes and the handler's params check answers before any file-access check). No new row.
- **F2 (line 1497, UP-6):** the SDK `..` step is replaced by a raw `uploadFiles` with a css target and the unnormalised `<ROOT>\..\outside\s11-out.bin`; expected K-gate. `<OUTSIDE>` is defined as ROOT's sibling folder `outside`, created by the wave with `s11-out.bin` before UP-L1. The "no call" wording now covers only the missing and relative steps.
- **F3 (line 1455):** UP-9 stays in the waiting list; the sheet now says that is only because phase doc 0.12 (as corrected by #251) lists it, though its refusal is gate-decided, and that the sheet does not override the phase doc. The count stays 17.
- **F4 (line 1489):** the note now says the name re-read only relocates the line; the K-table text is the pass rule, and a differing constant is a STOP before liveA, never a table update.
- **F5 (line 1495, UP-OPT):** pre-written for both moments: `<found+1> upload folders.` after the save and after the revert; while typed, `<found+2> upload folders. 2 invalid lines are not used (marked below).`, with K-opt-sum's singular/plural for the found count.
- **N1 (line 1482):** K-opt-stand cite is now `options-model.ts:100-101`.
- **N2:** no change (the verifier called the size justified and the order harmless).

## Proposed decisions

### 2026-10-26 · UP-9 waits for G11-3 only because the phase doc says so
**Decided:** the sheet keeps UP-9 in the 17-row waiting list. **Why:** phase doc 0.12 (as corrected by #251) lists it, and this slice's lane excludes the phase doc; the junction path's refusal is really the gate's, decided before the file-access check, so UP-9 could run in liveA. **Instead of:** moving UP-9 to liveA now. **Revisit if:** the step agent amends 0.12 with a dated note, then move UP-9 to liveA and make the waiting list 16. **By:** Claude (proposed)

## Handoff
A fresh verifier should re-check F1–F5 at lines 1455, 1482, 1489, 1493, 1495 and 1497. Not verified by me: K-notarget in UP-6 relies on the verifier's reading that `checkUploadParams` runs before the file-access read (`handlers/upload.ts:96-99`); I did not re-read the source.
