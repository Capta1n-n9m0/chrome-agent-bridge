# Step 11b S2 — the DNR rule keeper, pure · fixer report

**Date:** 2026-10-26 · **Role:** fixer (`docs/agent-rules.md` §6) · **Model / effort:** Opus 5.5, medium ·
**Findings fixed:** V4, V5 and V1's doc wording, from `S2-verifier.md`. **Lane:** `extension/src/safety-dnr-keeper.ts`,
`extension/test/safety-dnr-keeper.test.ts`.

## 1. Verdict

**DONE.** No finding disputed.

## 2. Outputs

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | `Test Files 159 passed (159)` · `Tests 4111 passed (4111)` (before: 4109 / 159, the verifier's count; +2 new tests, none removed) |
| Build | `npm run build` | exit 0 (`built extension → dist/`) |
| Tree | `git status --short` | ` M …/journal.md` (pre-existing, untouched), `?? S2-builder.md`, `?? S2-verifier.md`, `?? safety-dnr-keeper.ts`, `?? safety-dnr-keeper.test.ts` |
| Size | `git diff --no-index --numstat` against the saved original | module +11 −4; tests +30 |

**V4 (fixed).** `installFor` now sends `update([...this.orphans], rules)` and calls `dropOrphans()` when the update
succeeds; a rejected install keeps the orphans (the update is atomic). The caps check already counted `orphanCounts`
and is unchanged. So every update the keeper sends (install, release, rebuild, sweep, start-up clear) now retries the
orphans, and the module header says so. New test "V4: an install's update retries the orphans in the same update…"
(in `disarm and orphans`): a release whose removal is rejected, then a new install; it expects that install's update to
carry the orphan ids and only the new call's rules to remain.
**Shown red on the unfixed code:** `npx vitest run extension/test/safety-dnr-keeper.test.ts` printed
`× … V4 …` with `expected undefined to deeply equal [ 1 ]` and `Tests 1 failed | 21 passed (22)`. Green after the fix.

**V5 (test added).** New test "V5: an install after its call's release": `release()`, then `install(LIST_A)`; expects
the state-unreadable refusal, 0 rules, and no update that adds rules.
**Shown red without the check:** with line 161 (`if (h.released) throw refused();`) replaced by a comment, `-t "V5"`
printed `× V5: an install after its call's release > installs nothing and leaves zero rules`, `Tests 1 failed`. The
original was restored from a copy, and a `git diff --no-index` against it was empty (`restored`). It passes on the real
code.

**V1 (docs).** The header has a new bullet, **Order at the post-check**: the caller awaits `release()` before it
reads `refusal()`. A rebuild that is queued but has not run has not yet set the refusal, and `release` settles only
after that rebuild. `DnrCall.refusal()` and `DnrCall.release()` say the same in their doc comments. No code change:
the wiring is S3a's.

## 3. Verifier verdict

Not mine to give; the S2 verifier's verdict was PASS-with-notes. A fresh verifier re-checks only V4 and V5.

## 4. Deviations

None. V2, V3, V6, V7 and V8 were not in my brief, so I left them alone. V6's M8b (install caps ignoring orphan
counts) is still uncovered by tests.

## 5. Proposed decisions

None.

## 6. Findings

No new runtime fact. The files keep LF line endings, as before.

## 7. Handoff

Nothing is left running. Not committed (as briefed). S3a still owns V1's `post()` order and the other handoff items in
`S2-verifier.md` §7.
