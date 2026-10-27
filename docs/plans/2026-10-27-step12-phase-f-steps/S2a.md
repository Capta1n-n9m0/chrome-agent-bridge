# Step 12 S2a — step report (`args` for evaluate: the guard, the call form, the bound, the hello feature)

Step agent: Opus, medium. Children: builder Opus/medium, verifier Opus/medium, fixer Opus/medium (round 1 of 3),
verifier2 Opus/medium, committer Sonnet/medium. READ list given to builder and verifiers: the step brief's READ list as
received (phase doc 0.4, 0.10, § S2, B2.1–B2.4, § Every stage, STOP rules, the Stage 0 dated note; decisions #322, #327,
#330–#332, #339; Stage0.md §4 B rows and §6; stage0-audit.md F1, F10, F11, F12, F19, §5 B2.1/B2.3, §6 item 7;
Stage0-measurer1.md B rows, Stage0-measurer3.md §5; the spec §10; the shared/extension/daemon-hello CLAUDE.md files).

## 1. Verdict

**DONE-PARTIAL by the size rule only — ESCALATE the overrun for the session agent's ruling.** Every exit criterion is
met and verified, nothing remains to build, but the slice is **1083 new lines against its 450 cap** (code 399, under the
cap; tests 684). `agent-rules.md` §7 accepts an overrun only up to 1.5× (675) when the extra is tests; beyond that it is
DONE-PARTIAL. A step agent cannot waive that, and a post-hoc split does not fit (the shared-guard + hello part is about
190 lines, the call-form part about 890). **The spec note is committed (`3ab9207`); the code is verified and uncommitted
in the main tree**, held for the ruling. If the session agent accepts the overrun as a recorded deviation, the committer
brief of §7 commits it as is.

## 2. Outputs

- Commit `3ab9207` `docs(docs): S2a — spec §10 note for evaluate args (verifier: PASS-with-notes)` (spec only; B2.4's
  "note first" holds once the code commits after it).
- Uncommitted code (exact list, verified): `shared/src/protocol.ts`, `extension/src/evaluate/call.ts` (new),
  `extension/src/debugger.ts`, `extension/src/evaluate/save.ts`, `extension/src/handlers/evaluate.ts`,
  `extension/src/handlers/evaluate-save.ts`, `extension/src/client.ts` (the hello builder, `helloFrame`),
  `shared/test/protocol-step12.test.ts` (new), `extension/test/s12-args-call.test.ts` (new),
  `extension/test/s12-args-cdp.test.ts` (new), `extension/test/s12-engine-cdp.ts` (new test helper),
  `extension/test/log-sentinel.test.ts`, `extension/test/tab-events.test.ts`.
- Tests (verifier, re-derived): before 4665 / 191 files (scratch worktree at HEAD, own `npm ci`); after the builder
  4728 / 194 (+63, none removed). After the fix round the full suite read 4744 / 195 (verifier2), the extra file and 16
  tests being the S1-helpers lane's uncommitted `recipes/test/s12-helpers.test.ts`, not S2a.
- Per-package `tsc`, `npm run typecheck`, all seven `recipes/tsconfig*.json`, `npm run build`: exit 0; no tracked change
  from the build (verifier). Log allowlist unchanged (54 sites, log-scan green); args sentinel 0 in extension logs.
- Leaf reports: `S2a-builder.md`, `S2a-verifier.md`, `S2a-fixer.md`, `S2a-verifier2.md` (this dir).

## 3. Verifier verdict

`S2a-verifier.md`: **PASS-with-notes**. 22 mutants including (a) args string-built into the expression (red), (b)
terminate regardless of scriptId, (c) a skipped `Debugger.disable`, (d) a refusal echoing the value, (f) hello features
dropped — all red; survivors: (h) tabId filter (→ F1), (e2) a serialiser-call parameter (gap predates the slice; code
moved verbatim, F3), (e3) red only in the full suite. Findings: F1 MINOR test not discriminating (fixed); F2 MINOR
trailing `;` now a syntax error (documented in the note, fixed); F3 MINOR pre-existing gap; F4 NIT the extra
`Runtime.evaluate "globalThis"` has no timeout and a page can reassign `globalThis`; F5 MINOR the `daemon.log` sentinel
of 0.10 is S2b's; F6 MINOR no e2e rows yet for the glue; F7 NIT ~23 duplicate test lines (trimming does not reach the cap).
`S2a-verifier2.md`: **PASS** on F1 and F2 (mutant re-run red, restored byte-identical; only line 192 of the test changed).

## 4. Deviations

- Size 1083 vs 450 (2.4×), extra is tests — the escalation above.
- `extension/test/tab-events.test.ts`: four existing hello assertions edited to add `features: ["evaluateArgs"]` (the
  hello now always carries it, #332). Not an evaluate, save or safety test; verifier judged it allowed.
- `save.ts`: `collectSaveText` delegates steps 2–5 to the new `collectSaveFromRaw`, same commands in the same order.
- The source is evaluated as `(<source>\n)` without `replMode` — a refinement of the measured (i′) form, so a `function`
  declaration adds no page global; a trailing `;` answers `PAGE_ERROR` (spec note).
- No e2e rows (outside the lane; the S1 lane owns the plan file now).

## 5. Proposed decisions

### 2026-10-27 · S2a: the slice's test-heavy overrun is accepted as one coherent piece
**Decided:** S2a commits as one slice at 1083 lines (code 399 under the 450 cap, tests 684). **Why:** nothing remains
to build; the extra is the exit checks' own rows (round-trip table, refusals through both handlers, the bound's paths,
B2.2 through `GatedRouter`, the sentinel); no split leaves two pieces under 675. **Instead of:** trimming tests (removes
exit-check rows) or a post-hoc split. **Revisit if:** a later slice overruns the same way (the caps then under-count
tests). **By:** Claude (proposed, for the session agent)

### 2026-10-27 · S2a: the args guard's refusal set and texts
As in `S2a-builder.md` §5 (eight fixed texts; undefined, function, symbol, BigInt, NaN/Infinity refused wherever they
sit; UTF-8 byte size). **By:** Claude (proposed)

### 2026-10-27 · S2a: the source runs as `(source\n)` without replMode; a non-function is refused
As in `S2a-builder.md` §5. **By:** Claude (proposed)

### 2026-10-27 · S2a: a 500 ms paused wait, a listener per wait, the stop steps bounded
As in `S2a-builder.md` §5. **Revisit if:** R19 measures a pause slower than 500 ms. **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed. Not measured: the stop path, the no-global check and the CSP page in real Chrome
  (S7's R19-ARGS rows must cover them, verifier F6).
- For S2b (facts): hello field `features?: string[]` on `HelloMessage`, validated by `isHello` when present; the
  extension always sends `features: ["evaluateArgs"]`; the constant is `FEATURE_EVALUATE_ARGS` (`shared/src/protocol.ts`).
  Guard: `checkEvaluateArgs(args: unknown): {ok: true; json: string} | {ok: false; message: string}`,
  `EVALUATE_ARGS_MAX_BYTES = 1_048_576`; `EvaluateSaveStartParams.args?: unknown`. The refusal texts are word for word
  in the spec note (`3ab9207`) and `S2a-builder.md` §2. Over the wire only the size refusal can occur. Today's daemon
  accepts a hello with `features` (`daemon/src/handshake.ts` reads no unknown key).
- For S2b's brief: verifier F5 (the `daemon.log` sentinel of 0.10), F2's "no trailing `;`" sentence in the SDK/MCP
  descriptions; F4 (call the wrapper on the function's objectId instead of a fetched `globalThis`) is a possible
  follow-up, not required.

## 7. Handoff

No processes running; port 0 only. **The code is uncommitted in the main tree** — the next agent touching extension/ or
shared/ must not start until it is committed. To commit after a ruling: a Sonnet committer stages exactly the 13 files
of §2, message `feat(extension): S2a — evaluate args: the shared guard, the (i′) call form, the pause-terminate bound,
the hello feature (verifier: PASS-with-notes)`, body naming the overrun decision, trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. A live row needs `npm run build` and the reload script first.
