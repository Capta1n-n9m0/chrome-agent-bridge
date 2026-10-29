# S8-verifier3: fix round 2 of the Step 12 docs change, re-checked

Claude Opus 5.5, effort medium. Read and run only; no file edited but this report; nothing committed.
Audited: `git diff HEAD -- docs/setup.md`, with `S8-fixer2.md` taken as claims to audit against `S8-verifier2.md` §4.
Only the three round-2 findings were re-checked (`docs/agent-rules.md` §6).

## 1. Verdict

**PASS.** R2-MINOR-1 and both NITs are closed. Each edited sentence cites the row or test behind it (S8.1), and no
sentence claims more than its row measured. `doc-check` exits 0, and the lane is clean.

## 2. Outputs (my own commands)

- **`node scripts/doc-check.mjs`: exit 0.** Counts: `tools: 25 · router methods: 28 · codes: 27`. The findings are the
  same as in rounds 1 and 2, and all are outside the lane: stale counts at `CLAUDE.md:17`, `:18`, `:88`,
  `extension/CLAUDE.md:42` and `mcp/CLAUDE.md:9`, and the test count at `CLAUDE.md:113`. No finding names README,
  setup.md or the roadmap.
- **Lane (`git status --short`):** `M README.md`, `M docs/progress-and-roadmap.md`, `M docs/setup.md`, and the untracked
  `S8-builder.md`, `S8-claude-md-proposals.md`, `S8-fixer.md`, `S8-fixer2.md`, `S8-verifier.md` and `S8-verifier2.md`.
  Nothing else. No code or test file changed, so round 1's `npm test` stands.

## 3. Items

| Item | Status | Evidence |
|---|---|---|
| R2-MINOR-1 (CHOOSE-LATE bullet) | **Closed** | `docs/setup.md:964-966` now reads: "when the page's click came 4 900 ms after the call's click, the call was answered `ok`; at 5 100 ms the page's click opened no chooser at all and the call got `TIMEOUT`; no dialog showed in either (R19-CHOOSE-LATE, PASS, `dialog=0`)". The record (`S7-run-record.md:117`) has `opener-ms=4900 opened=yes dialog=0`, `opener-ms=5100 opened=no dialog=0`, and answers `ok` / `TIMEOUT`. The sheet row (`e2e-test-plan.md:1838`) says the opener is armed by the call's click at 4 900 / 5 100 ms, and its pass rule is `dialog=0` in both runs. The sentence no longer says "opened" at 5 100 ms, and no longer says "after it ended" for the 4 900 ms leg. The fixer was right not to restore "on a tab in the background": the row records "window X in front", not the tab's state. Leaving out "the call caught it" is also correct, because only `ok` is recorded. |
| NIT 1 (Superseded marker) | **Closed** | `docs/setup.md:958`: "Run 19 measured three of them (HUMAN, LATE, DISARM) and added a fourth (FRAME); only the dialog-just-before point and the after-the-files point are by construction". The HEAD text (`git show HEAD:docs/setup.md`, :847-857) has five points: the human click, the dialog just before, the late page, the disarm during the wait, and the toggle after the files. None of them is a frame. So three were measured (record :116 RECORD, :117 PASS, :120 PASS `ms=5025`), two stay by construction, and FRAME (:115 RECORD) is new. The counts are right. |
| NIT 2 (Troubleshooting `focusEmulation`) | **Closed** | `docs/setup.md:1404`: "the daemon holds the lock across the focus and the input (not for a call sent with `focusEmulation`)". This matches `daemon/src/methods.ts:103`: `TRUSTED_INPUTS.has(method) && params?.trusted === true && params?.focusEmulation !== true`. The cited test `daemon/test/s6-trusted-focus.test.ts:91-99` covers the exception: `focusEmulation: true` gives `false` for click, type and pressKey. The wording agrees with `:322` and README. |

## 4. New findings

None.

## 5. Handoff

S8 is ready for its committer. The doc-check count findings outside the lane stay with the session agent's close-out, as
rounds 1 and 2 recorded. No process was left running.
