# S5b fixer, round 1: F1–F4

Fixer, Opus, medium effort. Base: `7e26dab` plus S5b's uncommitted builder work. Findings from `S5b-verifier.md`.
Lane: `sdk/test/s12-console-cap.test.ts`, `mcp/src/tools/registry.ts` (the `chooser` describe string),
`mcp/test/s2-focus-first.test.ts` (`S5B_CHOOSER_PROPERTY`), `docs/setup.md` (the chooser paragraph). No other file
touched; the S6-G2 files in the tree were not read or changed.

## 1. Verdict

All four findings fixed. Not committed (the brief says so).

## 2. Fixes

**F1 · the 20 000 default pinned exactly.** One new test in `s12-console-cap.test.ts`: two entries of 9970 and
9969 characters give a joined text of exactly 20 000 (two 30-character prefixes + one `\n`), which comes back whole
(`toHaveLength(20_000)`); 9970 + 9970 (20 001) comes back cut with `… [truncated: 1 more lines,`.
Mutants, each applied alone to `MAX_TEXT_CHARS` in `sdk/src/format/console-messages.ts` and restored (`cmp` against
the saved copy: identical):

| Mutant | `npx vitest run sdk/test/s12-console-cap.test.ts` |
|---|---|
| none | 4 passed (4) |
| 19 000 | 1 failed, 3 passed: the new test |
| 20 308 | 1 failed, 3 passed: the new test |

**F2 · the property description.** `(a button or link), not the file input itself;` →
`(a button or link; a file input works too);`, in `registry.ts` and in the delta `S5B_CHOOSER_PROPERTY` in
`s2-focus-first.test.ts`. No other text changed. `mcp/dist/index.js` still carries the old text until the next
`npm run build` (not in lane).

**F3 · setup.md.** Added at the end of the chooser paragraph: "`chooser` needs the extension reloaded after the
update: an older extension ignores it and answers as for a file input." No daemon check added (out of lane); see §5.

**F4 · setup.md.** The sentence describing the one-call flow now ends "(built, not yet run live; Run 19 checks it)".

## 3. Checks

- `npx vitest run sdk mcp`: **47 files, 871 passed**.
- `npm run typecheck`: exit 0 (the chain ran through; the S6-G2 daemon work did not break it). Per package also
  exit 0: shared, sdk, mcp, daemon.
- Size: tests +6 lines (`s12-console-cap.test.ts` 39 → 45), so 231 of 225 — the accepted test-only overrun (#320 §7,
  ≤ 1.5×). Code +0 net (one string). Docs +2 lines.
- No socket opened; no port bound.

## 4. Deviations

None.

## 5. Proposed decisions

### 2026-10-28 · S5b: the `chooser` property description allows a file input (for user review)
**Decided:** the MCP `chooser` property reads "true: ref or locator is the element whose click opens the page's file
dialog (a button or link; a file input works too); the bridge clicks it and fills the dialog's input without showing
the dialog. Refused while JavaScript is off for the bridge. Default false."
**Why:** the spec note `8eab22c` allows "a button, a link, a label, or the file input itself"; the old text read as
a ban (verifier F2). **Instead of:** "…(a button or link), not the file input itself; …".
**Revisit if:** Run 19 shows a file input on the chooser path behaves differently from the spec note.
**By:** Claude (proposed)

### 2026-10-28 · S5b: an old extension and `chooser` — documented now, a feature flag for the session agent to rule
**Decided:** for this stage, setup.md says `chooser` needs the reloaded extension. **Why:** an extension built
before S5a ignores the key and runs the file-input path (verifier F3); that loosens nothing but misleads the agent.
**Instead of:** a daemon check in the form of #332's `args` guard (`ARGS_RELOAD_HINT`, `daemon/src/intercept.ts`):
a feature flag in the extension's hello and a `VERSION`-style refusal with a reload hint when `chooser` reaches an
extension without it. That is daemon and extension work outside S5b's lane, for the session agent to rule.
**Revisit if:** the session agent adopts the flag, or Run 19 meets an unreloaded extension.
**By:** Claude (proposed)

## 6. Handoff

Nothing running; no port bound. Files changed: the four in the lane, plus this report.
