# Step 12 S4b — the kept debugger session: wiring the keeper (step report)

Model / effort: Opus, medium (step agent). Date 2026-10-28. Role: step agent (`docs/agent-rules.md` §6). Slice base
`c9bb6cb` (S4a's keeper). Children: builder, verifier, fixer, verifier 2, fixer 2, verifier 3 (all Opus, medium), committer
(Sonnet, medium). READ list given to every child: phase doc 0.6, 0.10, § S4 (D4.1–D4.4), § Every stage, § STOP rules,
the dated note under § Stage 0; decisions #321 (Q3), #324, #335, #339, #344 (4), #347; S4a.md §5 and §7; S4a-verifier4.md;
Stage0.md §4; stage0-audit.md §4 F3–F6 and §5 D4.2; the extension package CLAUDE.md files.

## 1. Verdict

**DONE.** Every CDP use goes through S4a's keeper, installed once by `sw.ts`. D4.1–D4.4 hold, both required mutants are
red, V4-1 is fixed, and V3-4 is left under F5's Revisit-if. Live behaviour (banner, timings, CON-KEPT, SWEEP-HELD) is
unmeasured: S7's rows.

## 2. Outputs

- **Commit:** see the committer's hash (recorded by the session agent in the journal; message
  `feat(extension): S4b — the kept debugger session, wired (verifier: PASS-with-notes)`).
- **Files** (`git diff --numstat HEAD`, added/removed): `extension/src/debugger-keeper.ts` 88/10, `extension/src/debugger.ts`
  47/3, `extension/src/sw.ts` 15/1, `extension/src/handlers/console.ts` 2/2, `docs/setup.md` 9/4, new
  `extension/test/s4b-keeper-wiring.test.ts` (380 lines, 18 tests), and the leaf reports and evidence of this slice.
- **Size (#344 (4)):** code 152 of 250; tests 380 of 375 (see Deviations).
- **Tests:** `npx vitest run` 5010 passed (210 files) before → 5028 passed (211 files) after; +18, all in the new file,
  none removed (verifier 1 and 2 compared per file; verifier 3 re-ran the full count).
- **Checks** (re-run by verifiers 1 and 2): per-package tsc, `npm run typecheck`, the seven recipes tsconfigs and
  `npm run build` exit 0, no tracked change after build; log sites +0, allowlist 54; `git diff c9bb6cb -- daemon shared sdk
  mcp` empty; no new top-level listener (20 `addListener` before and after), no top-level `await`.
- **Mutants red:** a session kept across a disarm (keeper on its own `DebuggerSessions`); the re-check skipped (through
  the wiring and inside the keeper); V4-1 reverted; the three source bounds removed; each `sw.ts` hook removed (M7–M12);
  console's commands untracked (M13); the re-check before the wait (V3); the wait→re-check loop removed (N1). Every new
  test is red on pre-slice code.
- **Files whose CDP calls route through the keeper:** `debugger.ts`'s `withDebugger` callers (trusted input, both
  screenshots, `evaluateInPage`, `evaluateFunctionInPage`, `evaluateToSave`, `evaluateFunctionToSave`, `uploadByMark`;
  these serve `handlers/{actions,perceive,evaluate,evaluate-save,upload}.ts`; `evaluate/call.ts`, `evaluate/save.ts` and
  `upload-files.ts` send through the `send` they are handed), and `handlers/console.ts` (two lines, now through `send`).

## 3. Verifier verdicts

- `S4b-verifier.md`: **PASS-with-notes**, V1–V3 MINOR (no test of the `sw.ts` wiring; console/evaluate clean-ups not
  run through the keeper; the re-check ran before the wait on a pending detach), V4–V6 NIT. Fix round 1 (`S4b-fixer.md`)
  fixed V1–V4.
- `S4b-verifier2.md`: **PASS-with-notes**, N1 MINOR (the new loop's second turn had no test). Fix round 2
  (`S4b-fixer2.md`) added it.
- `S4b-verifier3.md`: **PASS** (N1 only).
- Fix rounds used: 2 of 3. Open: V5 (lane deviation, declared below), V6 (the pending-detach wait comes out of the
  evaluate's `timeoutMs`; time only, unmeasured; for KEEP-2).

## 4. Deviations

- **`extension/src/handlers/console.ts`** (two lines) is outside the phase doc's S4 lane wording but is a call site S4a's
  Handoff names; it now sends through `debugger.ts`'s `send` (V5).
- **Test size 380 of 375**, within 1.5×; the extra is tests (N1's test), one coherent piece (§7 of agent-rules).
- **The keeper runs only where `sw.ts` installs it**; modules importing `debugger.ts` alone (the existing handler tests)
  keep the per-call `runWithDebugger` path. Verifier 1 measured why: installing the keeper at import turns 38 existing
  tests red, all attach/detach count or order assertions, never an answer. Cost: no existing handler test runs the
  production session path; the new wiring tests and the 49 keeper tests cover it.
- The four `drop()` clean-ups (S4a Handoff) are met by one mechanism (`UseCommands`: a command that rejects or is
  pending when a use ends drops the session), not a call per site.

## 5. Proposed decisions

From the children, unchanged (full text in `S4b-builder.md` §5 and `S4b-fixer.md` §5); all **By: Claude (proposed)**:
1. The keeper is installed by the worker; tests importing `debugger.ts` alone keep the per-call session.
2. A CDP command that fails or is unfinished at a use's end drops the kept session.
3. V3-4 is left as is, under F5's Revisit-if (KEEP-2's attach/detach durations).
4. The keeper's tab check is a class-`tab` gate at phase `effect`, bounded at 1 s (JavaScript off does not refuse, #347).
5. The kept session's re-check runs after the wait on a pending detach, and again if a newer detach began meanwhile.

## 6. Findings

- **Unmeasured, gating 0.6 "answers do not change":** whether a second `Runtime.enable` in the **same** session replays
  the stored console messages (C7 measured it across sessions only). Until CON-KEPT runs, `browser_console_messages`
  could answer fewer entries on a repeated call.
- **#335 requires the sweep detach of a tab another client holds to be measured before S4b ships** (SWEEP-HELD). S4b is
  committed code, not shipped behaviour, until that row runs.
- Each feature's CDP domain state at its call's end (builder, confirmed by verifier 1): `Debugger.disable` and
  `Runtime.disable` in `finally` on every path (a failure now drops the session); focus emulation off in `finally`;
  upload, screenshots and plain evaluate enable no domain. Remote objects and isolated worlds a call leaves now live
  until the session ends or the page navigates: memory only (follow-up candidate: an `objectGroup` per use).
- No pre-registered check failed. No new runtime fact (nothing ran against Chrome).

## 7. Handoff

- Nothing running; no port bound; the verifiers' scratch worktrees are removed.
- **Live rows for S7 (§4.27)**, from `S4b-builder.md` §7: KEEP-1 (one attach across sequential CDP tools, steady
  banner, answers as today); KEEP-2 (detach ~5 s after the last call, banner gone after Chrome's ~5 s; record attach and
  detach durations for V3-4/V4-1/V6); KEEP-3 (an idle kept session: disarm, block-list edit, navigation to a blocked, own
  or `file:` page, tab close and a Memory-Saver replace each end it); KEEP-4 (the banner's Cancel and DevTools on a kept
  tab); SWEEP-HELD (#335: worker start while another client holds a tab; the detach error text, no side effect on it);
  DEVTOOLS-NOFLAG (#339: DevTools open → attach throws, without `--enable-unsafe-extension-debugging`); CON-KEPT (two
  `browser_console_messages` in one kept session return the same entries); OVERLAP (two overlapping CDP calls on one
  tab).
- The loaded extension does not have this build; S7's wave reloads it (`recipes/reload-extension.ps1`).
- `docs/setup.md` banner text cites Stage 0's 5.0–5.2 s and the measured 3–14 s after a disarm; the total is left to S8.1.
