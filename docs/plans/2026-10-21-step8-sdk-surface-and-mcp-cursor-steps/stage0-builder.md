# Stage 0 — merge builder report

**Date:** 2026-10-23 · **Role:** builder (merge step), Opus 5.5 · **Baseline:** `1a62620` · **Not
committed.** Chrome, port 9234, the real daemon and the token were not touched; no code or test edited.

## Outputs

- `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/stage0-audit.md` (new): 35 findings
  merged from auditors A, B, C; Step 7 contracts table (24 rows); proposals #71–#77; rulings; blind
  spots; testability (every check S0.1–S7.4, FE.1–FE.6, S2b.1–S2b.8, S3.5); stage split.
- `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`: dated plan-side notes only (391
  insertions, 0 deletions).
- Baseline re-run in the main tree by this builder: `npm test` → `59 passed (59)` files, `950 passed
  (950)` tests; `npm run typecheck` exit 0; 22 tools; 22 codes; `NO_CURSOR` 0.

## Counts

CRITICAL 2 · MAJOR 14 · MINOR 15 · NIT 4.

## CRITICAL and MAJOR (Fn · tag · stage · proposed resolution · ESCALATION)

- F1 · plan-side · FE · FE-4 judges only what the human sees; target visibility becomes an observation;
  FE-1/2's "target hidden" read after the call · **yes**
- F2 · plan-side · S3 (wire alternative S2b) · SDK voids a `Tab` from before a 4002 reconnect with
  `TAB_UNKNOWN`; daemon epoch listed for the user · no
- F3 · plan-side · FE · make the outcome table total (precedence, FE-0, FE-5 first and last, fresh tab
  per trial, banner expected, positive control) · **yes**
- F4 · plan-side · FE · enable emulation before the focus step; FE-3 names its focus step · no
- F5 · plan-side + code-side · S2b · marker promise awaited by `connect()`, fail-safe fresh marker,
  offscreen key, fifth branch, pre-restart `lastUrl`; SM-0 proposed · no (checks only made stricter;
  #74 amendment contract-level)
- F6 · plan-side + code-side · S1 · additive `__bridgeData` beside `__bridgeError` · **yes** (`CLAUDE.md`
  invariant)
- F7 · plan-side · S2b · dated decision on the Chrome `id`: keep (A) or remove with recipe grants (C) · no
- F8 · code-side · S2 / S2b · S2.6 in the same commit with a "`locate` without `tab`" test; grant
  `daemon/test/methods.test.ts`; S2b refuses unlisted methods without `tab` · no
- F9 · plan-side · S2b · grant `client.ts`, `handlers/{tabs,network}.ts`; `targetTab({}` grep; rule
  network calls without `tab` · no
- F10 · code-side · S2b · daemon refuses `selectTab` itself; test against a fake that would answer · no
- F11 · plan-side · S2b · S2b.3 "unchanged, except listed handle-form edits" · **yes**
- F12 · plan-side · S5 · nested `locator` object, `ref` optional · no
- F13 · plan-side · S0/S1 · define `{text}` (innermost visible element); SDK-4 needle with `!` · no
- F14 · plan-side · S3/S4 · exported `BridgeError` stays the shared class · no
- F15 · plan-side · S3 · positive control (stricter); reword #77's outcome text; outcome (c) · **yes**
  (outcome text)
- F16 · plan-side · S2b (from S2.2) · `grep -rn`, empty stdout and exit 1 · no

Other escalations: F18 (S2b.6 scope), F32 (S6.1 `/mcp` clause).

## Phase-doc notes written (line numbers in the edited file)

109 order of work (FE, S2b) · 158 0.1 flags (F6, F13) · 241 0.4 flag (F2, F14) · 282 0.5 flag (F25) ·
324 0.6 flags (F12, F26) · 352 S0 items (`NO_CURSOR`, `focusEmulation?`, `session?`, `asRef?`; F27, F28)
· 368 S0 verifier focus · 394–440 stage FE copied from kickoff §7, flags at 434 (F1, F3, F4) · 463 S2
`locate` item · 468 S2 removals moved to S2b + F8/F21/F23 · 505 S2 lane and grep correction (F16, F34)
· 516–580 stage S2b copied, lane gaps at 525, notes at 557 · 605 S3 policy from FE · 609 S3.5 with
positive control, outcome flag at 621 · 627 S3 SDK items (F22, F24, F2) · 638 S3 parallelism/policy
correction · 696 SDK-1 recipe (proposed, design-local) · 722 SDK-8 fixture human tab · 739 SM-1 · 752
SM-0 (proposed) · 814 S0.4 · 842 S2.6 · 847 S2.2 moved to S2b.2 · 855 FE.1–FE.6 (FE.2, FE.3 stricter) ·
874 S2b.1–S2b.8 (S2b.2/.3/.4/.5 stricter; flags 885 S2b.3, 899 S2b.6) · 912 S3.2 stricter · 927 S3.4 per
#75 · 934 S3.5 exit check · 967 S6.2 proposal + S6.1 flag · 1007 G8-1 resolved by FE · 1072, 1082,
1089 stale lines.

## Left out, and why

- No pre-registered clause was dropped or loosened: FE's and S2b's text is the kickoff's (checked
  line by line; only S2b.3's line break around `closeTab`/`focusTab` and S3.5's line wrapping differ);
  F1/F3/F11/F15/F18/F32 are flagged beside the clause, not applied.
- F20's stricter forms of S1.4, S2.4, S4.2, S4.3, S6.4, S0.3 and S5.4 are in the audit only; they fall
  outside the note list the kickoff gives Stage 0 (only FE.2/FE.3 were tightened in the doc). The session
  agent can apply them as mechanical amendments.
- Spec §8/§10 notes (F27, F29) and decisions.md amendments were not written: outside this builder's
  lane.
- Auditor A's third forward-path test (the restart case) has no output in its saved log
  (`out-forward.txt` shows 2 tests); the claim rests on B's `BLIND-a`, which shows the same result.
  Auditor A's line cites for `guard.ts` and the extension hello were wrong and are corrected in F6/F30.
