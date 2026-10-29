# Step 13 S4 — verifier report (the second-chooser text; the settle pause's release)

**Verdict: PASS-with-notes.** Verifier, Opus, medium effort. Stage base `33ba954`; the stage's changes uncommitted in
the main tree. Read: phase doc 0.6, 0.7, the Stage 0 note after 0.9, §S4, Exit checks, forbidden fixes; decisions.md
#389, #390, #395; stage0-audit.md F-5; spec §10's S5a chooser bullet and the new note; the package `CLAUDE.md` files
named in the brief. The builder's report (`S4-builder.md`) was treated as claims.

## 1. Exit checks

| Check | Result | Evidence |
|---|---|---|
| T4.1 message names no DevTools | PASS: `chooserUpload` throws `BridgeError(DEBUGGER_DEVTOOLS, CHOOSER_BUSY_MESSAGE)`; the text "uploadFiles: another file chooser upload is still running on this tab; retry after it ends" has no DevTools, path, digit or id | `git diff extension/src/handlers/upload.ts`; test `Step 13 S4 (#389, T4.1)` |
| T4.1 MCP check (bare message, `isError: true`) | PASS: real `registerTools` + `McpServer` + `Client` over `InMemoryTransport`, `tools/call browser_upload_file {chooser: true}`; asserts `isError === true` and `content` deep-equal to exactly one text item equal to the bare message | `mcp/test/s13-chooser-busy.test.ts` |
| T4.1 other `DEBUGGER_DEVTOOLS` texts unchanged | PASS: `extension/src/debugger-errors.ts` not in the diff; the overlap text is pinned byte for byte by a new guard test and still by `recipes/test/s11-rules.test.ts:118` (51 tests green) | `git diff --stat -- extension/src/debugger-errors.ts recipes shared sdk mcp/src` empty; `S4-verifier-test.txt:18` |
| T4.1 counts (27 codes, 26 on the wire) | PASS: `shared/src/codes.ts`, `sdk/src/error.ts` untouched; no method, code or event added | same `git diff --stat` |
| T4.2 lock released after a rejecting `sleep`, no unhandled rejection | PASS: `intercept.ts:577` `void this.sleep(pause).then(release, release);` | test `Step 13 S4 (#390, T4.2)`; mutants below |
| `npm test` = 5650 + n, none removed | PASS: **238 files, 5654 passed** (before 237 / 5650 per `S4-builder-test-before.txt`); +4 = 2 extension, 1 daemon, 1 MCP; no test removed (diff shows only additions plus the optional `setup(sleep?)` parameter) | `S4-verifier-test.txt` |
| `npm run typecheck` | EXIT 0 | `S4-verifier-typecheck.txt` |
| seven `npx tsc --noEmit -p recipes/tsconfig*.json` | all seven EXIT 0 | `S4-verifier-recipes-tsc.txt` |
| `npm run build` | EXIT 0 | `S4-verifier-build.txt` |
| `git status --short` after build | only the stage's five tracked files, the new MCP test and S4 evidence/report files; no build output tracked | `S4-verifier-status.txt` |
| Log sites +0 | PASS: no `console.`/log call in the diff; `log-scan.test.ts` 16 tests green | `git diff -U0 \| grep` empty; `S4-verifier-test.txt:242` |
| Size cap 150 | PASS: 1 + 33 + 8 + 4 + 28 + 52 (new file) = **126** new lines | `git diff --numstat`, `wc -l` |

## 2. Red on the pre-stage code (per #395, scratch worktree only)

`git worktree add --detach <scratch>/wt4 33ba954`, own `npm ci` (exit 0, no junction from the main tree), then only the
three test files copied in. Main tree never reverted, moved or edited. Afterwards the five `node_modules/@bridge/*`
junctions were removed with `cmd /c rmdir`, then `git worktree remove --force`; `git worktree list` shows only main.

Pre-stage run (`S4-verifier-red.txt`): Tests 3 failed | 60 passed (63).
- daemon T4.2: `expected 'a' to be undefined` (lock still held by A), plus vitest's `Unhandled Rejection: Error: sleep failed`.
- extension T4.1: `expected 'Chrome DevTools (or another extension…' to be undefined` (the constant did not exist).
- collateral: the next chooser test (`JavaScript off … controls`) fails because the red test left tab 5's chooser slot taken (see N1).
- MCP test green on pre-stage code, as the builder states: it pins how the MCP renders a non-attach error, not the
  extension change. Expected under #389 (rendering check).

Because the extension red was only "constant undefined", I ran mutants to show the assertions bite on behaviour
(`S4-verifier-mutants.txt`):
- **M1** pre-stage throw, `CHOOSER_BUSY_MESSAGE` exported only → red: `expected 'Chrome DevTools (or another extension…' to be 'uploadFiles: another file chooser upl…'`.
- **M2** `.finally(release)` (lock freed, rejection still unhandled) → red: `expected [ Error: sleep failed ] to deeply equal []`.
- **M3** `.then(release).catch(() => {})` (no unhandled rejection, lock held) → red: `expected 'a' to be undefined`.
- Stage code copied into the worktree: 3 files, 63 passed.

So T4.2 asserts both halves F-5 asked for, each independently.

## 3. Spec note attack

The note (spec, after the Step 13 S1 note, inside §10's amendments, before "See Step 7 as-built"):
- Cites #389 by date and title exactly as in decisions.md, and the phase doc 0.6 with its Stage 0 note. Correct.
- Quotes the superseded S5a bullet verbatim ("with the text an overlapping debugger use answers today (#335)", spec
  line ~971). Correct; the bullet itself is left as written, consistent with the spec's other dated notes.
- The quoted text matches `CHOOSER_BUSY_MESSAGE` byte for byte.
- "after the prologue, before any page call or attach": `uploadFiles` runs `uploadPrologue` first, then
  `chooserUpload`, whose first statement is `chooserTabs.take`, before `call?.effect()`, `ensureContent`, mark or
  `withDebugger`. Accurate.
- "every other `DEBUGGER_DEVTOOLS` text unchanged; no method, code or event added": verified (§1).
- Ordering rule ("§10 note committed before the code") is binding only under (b); under (a) note and code land in one
  stage commit, which the phase doc's S4 line allows.
- The note says "names no DevTools, path or tab id" — true; the claim "the code stays true" rests on #389's reasoning
  (the first call holds the tab's one session); not re-measurable here and not claimed as measured.

## 4. Code review

- `upload.ts`: the unused `describeDebuggerError` import removed; `ErrorCodes` already imported (typecheck green). The
  slot is taken before the outer `try`, so a refused second call never releases the first call's slot. Correct.
- `intercept.ts`: `release` runs exactly once on either settle outcome; production `sleep` is still never injected
  (F-5), so the change is test-only hardening as #390 says.
- Forbidden fixes: no other message changed, no new code, no key sorting. None hit.

## 5. Findings

- **N1 NIT** `extension/test/s5a-chooser.test.ts:568-583`: the new test releases the first call (`open()`) only on
  success; when it fails, tab 5's chooser slot stays taken and the next test fails as collateral (seen in the red run).
  Fix: wrap the assertions in `try { … } finally { delete cdp.before["Page.enable"]; open(); await first.catch(() => {}); }`.
- **N2 NIT** `mcp/test/s13-chooser-busy.test.ts:30-36`: the fake bridge throws on any method, so the test does not
  show that the line came from the `uploadFiles` call (`mcp/src/tools/*.ts:640`). Rendering is pinned exactly either
  way; suggested: record `method`/`params` and assert `uploadFiles` with `chooser: true`.
- **N3 NIT** the E5.3 "no path in any chooser message" list (`s5a-chooser.test.ts`) does not include
  `CHOOSER_BUSY_MESSAGE` (builder's own note); the new test's fixed-literal and no-digit asserts cover it. Optional.

No CRITICAL, MAJOR or MINOR finding. No new runtime fact for a package `CLAUDE.md`. Proposed decisions: none.

## 6. Handoff

No daemon on 9234 started, no extension reload, no process left running; scratch worktree removed. Evidence:
`S4-verifier-test.txt`, `-typecheck.txt`, `-recipes-tsc.txt`, `-build.txt`, `-status.txt`, `-red.txt`,
`-mutants.txt` (home path redacted to `<home>`/`<scratch>`). Not committed.
