# S5c verifier: an old extension's `chooser` is refused `VERSION`

Model / effort: Opus, medium. Read: `docs/agent-rules.md`; decisions.md #332, #342, #353, #355; spec §10 (the S2a/S2b
notes, S5a's, the new S5c note); `git show e481efe 9921715`; S2b.md §2, S5b.md §5; the `shared/`, `daemon/`,
`extension/src/` CLAUDE.md files; setup.md's `older build` lines and the Uploads chooser paragraph. The builder's
report (`S5c-builder.md`) was treated as claims to audit. Scratch files are under the session scratchpad
(`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\3933cbe1-90a7-4fc5-83a1-3e97601ffc62\scratchpad\`,
`s5cv-*`).

## 1. Verdict

**PASS-with-notes.** Every exit check is met. Exit check 1's port-0 path is shown by my own probe, not by a committed
test (F1). Two notes go to the user: F2, a `chooser: false` call to a stale extension is now refused, and F3.

## 2. Outputs (re-derived)

| # | Check | Evidence | Result |
|---|---|---|---|
| 1 | Featureless hello → `VERSION` with the new text on `uploadFiles {chooser}`, nothing forwarded | Committed test: `daemon/test/s12-chooser-feature.test.ts` row 2, which runs in process (TabLayer + a fake `ExtensionConnection`). My port-0 probe (`s5cv-probe.test.ts`): a real `WsHost` on port 0, a fake extension over `ws`, the SDK and the MCP tool. With a hello carrying no `features` key, `[]` or `["evaluateArgs"]`, `Tab.upload {chooser: true/false}`, `browser_upload_file {chooser: true/false}`, and raw `chooser: null` / `"x"` each answer `VERSION`, with exactly `CHOOSER_RELOAD_HINT` for the SDK and MCP calls; the fake receives 0 `uploadFiles`. 5/5 passed. | met (F1) |
| 2 | `uploadFiles` without `chooser` is forwarded unchanged to a featureless extension | Committed row 3 (`{tabId: 41, ref, paths}`); probe: the forwarded params' keys are exactly `paths, ref, tabId` | met |
| 3 | A Step 12 hello carries both features | `extension/src/client.ts:23`. Hello assertions updated in `extension/test/tab-events.test.ts` (112, 120–122) and `extension/test/s12-args-call.test.ts` (207, 209). I grepped the repo for `evaluateArgs`, `EXTENSION_FEATURES` and `features`. The remaining hits are fake-extension hellos in `mcp/test/s12-args-cross.test.ts` and `mcp/test/s12-console-cross.test.ts` (the fake's own hello, not this build's), plus `shared/test/protocol-step12.test.ts` and `daemon/test/s12-args-feature.test.ts` (guard and parser rows). No assertion of the extension's own hello was missed. | met |
| 4 | A mutant forwarding `chooser` to a featureless extension is red | Mutant A (`if (false && …)`): red in the committed row 2 and in all 4 featureless probe rows (5 failed / 10). Mutant C (refuse `chooser` even with the feature): committed row 4 and the probe's with-feature row red (2 failed). After each mutant I copied the backed-up bytes back: intercept.ts sha256 `215380…9c36e` before = after; `git diff \| sha256sum` `57644e…91105` before = after, new test file hash unchanged; the probe file was deleted. | met |
| 5 | The text names no path | `intercept.ts:44-45` is a fixed string; committed row 5 pins it; the probe's daemon log lines never contain the probe path | met |
| 6 | Log sites +0 | No log call added (intercept.ts has 0 `console.`/`log(` before and after); `extension/test/log-allowlist.ts` unchanged, 54 entries; log-scan green in the full run | met |
| 7 | § Every stage | Tests **before 5103** (scratch worktree at `372d091`, its own `npm ci`; 9 failures there, all in `recipes/test/s11-r16-runner.test.ts`, an artifact of the worktree checkout: that file passes in the main tree and S5c does not touch it) → **after 5108 passed / 219 files** (main tree, exit 0): +5 tests, +1 file, none removed. `npm run typecheck` exit 0. All seven `recipes/tsconfig*.json` exit 0. `npm run build` exit 0; `git status --short` is the same before and after the build. | met |
| 8 | Every new test fails on the pre-slice code; size | I ran the three test files against the pre-slice worktree: 6 failed / 31. The failures are the feature name, the `VERSION` row, the text row and the 3 hello tests. The two forwarding rows pass there by design: they are controls of unchanged behaviour. Builder mutant B and my mutant C turn them red. Size (`git diff --numstat` plus the new file): code +20/−3 (intercept 12, client 6/−3, protocol 2) against the 60 cap; tests 69 + 4 + 4 = 77 against the 90 cap; docs: spec 11, setup 5/−3. | met (deviation accepted) |

- **Placement.** The rule sits at `intercept.ts:501-505`, right after #332's `args` rule. It runs after the `!proto`
  check, before `networkClear all`, `resolveTarget` and `checkLease`, the same place as the args rule. The probe shows
  both rules answer `VERSION` before any handle or lease check: a raw call naming an unknown `T99` gets `VERSION`. The
  text is fixed, so answering it before `TAB_HELD` reveals nothing.
- **Spec note.** One 11-line, insert-only hunk at spec line 978, between S5a's block and S6-G2's, so it can be committed
  before the code. It is self-contained and cites #355 by date and title (matching decisions.md line 197). It states
  the feature, the presence rule and the text, and says it adds no method, code or event (proto stays 2).
- **setup.md.** Two edits. The chooser paragraph's interim sentence is replaced by the `VERSION` answer and its text.
  The troubleshooting `VERSION` row gains the chooser variant. Both quote `CHOOSER_RELOAD_HINT` truncated, in
  `ARGS_RELOAD_HINT`'s form.
- **Out of lane.** `docs/e2e-test-plan.md` (+42, S7-sheet's) and the one-line commit-hash edit in `S5b.md` are not in
  the S5c change. The builder lists neither, and neither should be staged with S5c.
- **Package CLAUDE.md files.** None of `shared/`, `daemon/` or `extension/src/` describes the args feature rule, so
  none needs a chooser line.

## 3. Verifier verdict

Not applicable (this is the verifier's report).

## 4. Deviations

None from the brief. The builder's deviation is accepted: two control tests cannot fail on the pre-slice code, and
mutants B and C show they discriminate.

## 5. Proposed decisions

None of my own. The builder's proposal (key presence counts, `false` and `null` included) is reviewed in F2.

## 6. Findings

- **F1, MINOR.** File: `daemon/test/s12-chooser-feature.test.ts`. Exit check 1 says "fake extension, port 0", but the
  committed test runs in process: it never sends a hello over a socket carrying `"uploadChooser"`. The wire path is
  generic: `wsHost.ts:247` passes `helloFeatures(data)` (`handshake.ts:45`, every string), and S2b's port-0 cross test
  already covers that path for `evaluateArgs`. My port-0 probe passes 5/5 and turns red under mutant A (evidence: the
  `s5cv-probe.test.ts` and `s5cv-mutA.txt` scratch files). The behaviour holds. **Suggested fix (optional):** add one
  port-0 row (a featureless hello; `Tab.upload {chooser:true}` → `VERSION`; 0 forwarded) to the committed suite. That
  costs about 40 test lines against 13 left under the 90 cap, so the step agent may accept the in-process test plus
  this probe instead.
- **F2, MINOR (for user review, not a defect).** Rule: `intercept.ts:502` (`"chooser" in p`). The SDK
  (`sdk/src/upload.ts:32-35`) and the MCP (`mcp/src/tools/registry.ts:640`) both send `chooser: false` when they are
  given `false`. The probe shows that such a call to a stale extension is now refused `VERSION`. Before S5c the stale
  build ran it as a file-input upload, which is exactly what `false` means. Refusing `false` loosens nothing and
  misleads no one, so the rule is safe. The price is a working call broken until the human reloads, a reload that a
  Step 12 daemon already needs for `args`.
  - How #342 compares: the analogy is weaker than the builder's write-up suggests. `args: null` is a real argument
    that a stale build would mishandle, while `chooser: false` changes nothing on a stale build.
  - The presence rule is still the simplest, is consistent with #342, and catches a malformed raw `chooser: "x"`.
    `chooser !== false` would also be safe, and only that rule keeps a `false` call working.
  - **Suggested:** keep the builder's rule. The decision text should state this trade (it already names the `false`
    case), and `setup.md`'s sentence could say "with `chooser` (even `false`)". That wording is a NIT.
- **F3, NIT, inherited from #332.** The feature check reads `currentConnection()` before `await resolveTarget`, and the
  forward goes to whatever socket is current after that await. An extension reconnecting as an older build inside
  that window would receive `chooser`. This is the same race as the args rule. It is practically unreachable, because
  a downgrade needs the human to reload an older build mid-call. No fix is suggested for S5c.

No new runtime fact.

## 7. Handoff

- No processes are left running.
- I removed the scratch worktree with `git worktree remove --force`, so `git worktree list` shows only main. A partial
  folder `scratchpad\wt-s5c-verifier` remains; its `node_modules/@bridge/*` links point inside that folder only. Main
  `node_modules` is intact (`.bin` 42 entries, `@bridge/*` present).
- `daemon/src/intercept.ts` is back to its exact bytes, and the temporary probe file is deleted.
- Commit order as the builder states:
  1. the spec hunk alone;
  2. code, tests and setup.md, plus `S5c-builder.md` and this report.
- Do not stage `docs/e2e-test-plan.md`, `S5b.md` or `S7-sheet-builder.md` with S5c.
