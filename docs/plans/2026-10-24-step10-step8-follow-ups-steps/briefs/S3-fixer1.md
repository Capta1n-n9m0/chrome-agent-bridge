# S3 fixer brief, round 1

Common preamble, HARD RULES, lane, S5 warning, ESCALATION list, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, LESSONS
and STOP rules: exactly as in `briefs/S3-builder.md` (read it in full; it binds). Role: Fixer — fix the listed
findings, touch nothing else; dispute a finding with evidence if it is wrong. Re-run `npm run typecheck`, `npm test`,
`npm run build`; `git status --short` after. Do not commit; no `git stash`/checkout/reset in the main tree. You must
NOT spawn agents; finish in one go.

Inputs: the verifier's findings verbatim in `S3-verifier.md` (read §Findings in full); the builder report
`S3-builder.md`.

Fix:
1. **Finding 1 (MAJOR)** as the verifier suggests: count listable elements up to 801 (one more zero-size check than
   F18's "at most 800" — state it in your report as a mechanical note for the phase doc), and decide after the walk:
   a listable match is past iff it is the 801st or later (unchanged); a non-listable match iff ≥ 800 listable elements
   precede it in walk order AND the page has more than 800 listable elements. Never change `a11y.ts`, `snapshot.ts`
   or the matching. Tests first (show them red on the current code): 800 buttons + trailing `<p>` → `{text}` and
   `{css}` absent; 800 buttons + `<p>` + 1 button → `{text}`/`{css}` on the `<p>` → `true`; 799 buttons +
   `<button><span>` (800th) → span via `{text}` absent; the 800-page cross-check asserts nothing past for every
   element, not only listable ones; keep all existing S3.1 cases green.
2. **Finding 2 (MINOR) — do NOT change behaviour.** The step agent keeps 0.3's letter (a descendant of the 800th
   listable comes after it in walk order; on a page with > 800 listable it is flagged). Add one test that pins this
   (799 buttons + `<button><span>` + 200 buttons → span via `{text}` → `true`) with a comment citing 0.3's definition.
3. **Finding 3 (MINOR):** add the constructor pin `ConstructorParameters<typeof BridgeClient>` → `[BridgeClientOptions]`
   and literal shapes for `TrustedOption` and `ScrollOptions` as captured at `f45e3bf` (`git show f45e3bf:sdk/src/...`).
4. **Finding 4 (NITs):** assert the event was delivered in `sdk/test/s3-warning.test.ts:82`; make the three duplicated
   test titles distinct (Tab vs cursor mirror); fix the `SdkWarning` comment.
Finding 5 is for the propagator; nothing to do.

Report to `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S3-fixer1.md`: per finding fixed (diff summary) |
disputed (evidence); failing-first evidence; typecheck/test/build tails with counts (before 2984/122 → after).
Return a ≤ 8-line summary.
