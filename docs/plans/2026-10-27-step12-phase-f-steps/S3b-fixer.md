# Step 12 S3b — fixer report, round 1 (F1, F2, N1)

Model / effort: Opus, medium. Role: fixer (`docs/agent-rules.md` §6). Findings fixed: F1, F2, N1 of `S3b-verifier.md`.
Not touched: F3, F4, N2, N3 (session agent).

## 1. Verdict

**DONE.**

## 2. Outputs

Files changed (all in the lane):
- `extension/src/console-messages.ts` — F1: in `previewText`, a non-string preview property value (`q.type !== "string"`)
  whose text ends in `…` (after `trimEnd`) pushes the private `SHORTENED` marker before `cutStack`, so the entry drops
  whether or not a stack line survived the cut. String values are unchanged (kMiddle shortening, no source).
- `extension/test/s12-console-reduce.test.ts` — two new tests (written first, both red before the fix):
  - the cut inside the message (no stack line left), plus a string-typed value ending in `…` that is still kept;
  - the cut inside `at` (`"\n    at…"` and with trailing spaces; `STACK_LINE` does not match).
- `docs/setup.md` — F2: "24 tools" → 25 (line 137); lines 643, 910, 1176 now name `browser_console_messages` as refused
  while JavaScript is off; N1 on the tool row (line 163).
- `mcp/src/tools/registry.ts` — N1, description only: "…switched on or before the extension's worker last restarted,
  are left out."
- `mcp/test/s12-console-cross.test.ts` — the description test pins the N1 phrase too (one `toContain` added, none
  removed).

Numbers (my commands, main tree):
- `npx vitest run`: before 4879 passed / 207 files → after **4881 passed / 207 files** (+2, none removed), exit 0.
- `npx vitest run extension/test/s12-console-reduce.test.ts`: before the fix 2 failed | 23 passed; after 25 passed.
- **Mutant** (the new `sources.push(SHORTENED)` line replaced by a comment): 2 failed | 23 passed (both new tests red);
  restored → 25 passed.
- `npx tsc --noEmit -p extension/tsconfig.json` 0; `-p mcp/tsconfig.json` 0; `npm run typecheck` 0; `npm run build` 0;
  `git status --short` identical before and after the build.
- Log sites: `LOG_ALLOWLIST.length` = 54 (tsx import), `log-allowlist.ts` unchanged, `console-messages.ts` has no
  `console.` call; +0.

## 3. Verifier verdict

n/a (a fresh verifier re-checks F1, F2, N1).

## 4. Deviations

- **setup.md line 913 (a dispute in part):** it quotes the shipped extension message verbatim
  ("…Every other tool still works…", `extension/src/safety.ts`). Editing the quote would misquote the product, and the
  text itself is F3's (a contract change). Instead a sentence follows the quote: "(`browser_console_messages` is
  refused too, though this text predates it.)". Line 916's quoted SDK line is left for the same reason.

## 5. Proposed decisions

None beyond the verifier's §5 F1 entry, which this fix implements as proposed.

## 6. Findings

None new.

## 7. Handoff

No processes, ports or worktrees. The other lane's `recipes/` files were not touched. Not committed (brief).
