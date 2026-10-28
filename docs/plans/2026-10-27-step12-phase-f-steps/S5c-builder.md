# S5c builder — an old extension's `chooser` is refused `VERSION`

Model / effort: Opus, medium. Read: `docs/agent-rules.md`; decisions.md #332, #342, #353, #355; spec §10 S2a/S2b
notes and S5a's note (`git show 8eab22c`); `git show e481efe 9921715`; S2b.md §2, S5b.md §5; phase doc § Exit checks
("Every stage"); `shared/`, `daemon/`, `extension/` CLAUDE.md files; setup.md's chooser paragraph and `VERSION` row.

## 1. Verdict

DONE. Uncommitted, as briefed.

## 2. Outputs

- **Spec note (a self-contained hunk, to commit before the code):** `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`,
  a new `Amended 2026-10-28 (Step 12 S5c; …)` item after S5a's amendment block (before S6-G2's): the feature
  `"uploadChooser"` (`FEATURE_UPLOAD_CHOOSER`), the rule (key presence counts, `null`/`false` included), the text.
- **Code:**
  - `shared/src/protocol.ts`: `export const FEATURE_UPLOAD_CHOOSER = "uploadChooser"` beside `FEATURE_EVALUATE_ARGS`.
  - `extension/src/client.ts`: `EXTENSION_FEATURES = [FEATURE_EVALUATE_ARGS, FEATURE_UPLOAD_CHOOSER]`.
  - `daemon/src/intercept.ts`: `CHOOSER_RELOAD_HINT` = "the Chrome extension is an older build without the file
    chooser upload — reload it at chrome://extensions (↻ on Chrome Agent Bridge)"; a `chooserConnections` WeakSet
    filled in `extensionConnected`; in `request`, right after the #332 `args` rule and before any resolve or forward:
    `uploadFiles` with `"chooser" in p` and the current socket not in the set → `VERSION CHOOSER_RELOAD_HINT`.
    `handshake.ts` and `wsHost.ts` unchanged (`helloFeatures` already passes every feature string).
- **Tests:**
  - `daemon/test/s12-chooser-feature.test.ts` (new, 5 tests): the feature name; featureless hello → `uploadFiles`
    with `chooser` `true`/`false`/`null` each `VERSION` with exactly `CHOOSER_RELOAD_HINT`, `forwarded` empty;
    featureless hello → `uploadFiles` without `chooser` forwarded as `{tabId: 41, ref, paths}`; with the feature →
    forwarded; the text equals the fixed string and matches no path pattern (`C:\`, `/Users/`, `/home/`, the test's
    file name).
  - Hello assertions updated to `features: ["evaluateArgs", "uploadChooser"]`:
    `extension/test/tab-events.test.ts` (4 assertions, lines 112, 120, 121, 122);
    `extension/test/s12-args-call.test.ts` (the `#332` describe: `EXTENSION_FEATURES` and `h.features`, 2 assertions,
    plus its describe/it titles).
- **docs/setup.md:** the Uploads chooser paragraph's interim sentence ("an older extension ignores it and answers as for
  a file input") replaced with: to an older extension the bridge sends nothing and answers `VERSION` "…without the
  file chooser upload — reload it at chrome://extensions" (#355); the troubleshooting `VERSION` row adds the chooser
  variant beside the evaluate-args one.
- **Checks (this tree, run by me):** `npm test` before 5103 passed / 218 files → after **5108 / 219** (+5, the new
  file; none removed). `npm run typecheck` exit 0. `npx tsc --noEmit -p` on all seven recipes tsconfigs (`.json`, `.fe`,
  `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`): exit 0 each. `npm run build` exit 0. `git status --short` after build: only
  my lane's files plus `docs/plans/…/S5b.md` (someone else's uncommitted edit, present at start, untouched).
- **Log sites +0:** no log call added; `extension/test/log-allowlist.ts` unchanged (54 entries); `log-scan.test.ts`
  passed in the full run.
- **Size** (`git diff --numstat` + new file): code 20 (intercept.ts 12, client.ts 6/−3, protocol.ts 2); tests 77
  (new file 69, the two hello files 4/−4 each); docs 16 (spec 11, setup 5/−3). Under the 60 + 90 caps.

### Red proofs
- **Pre-slice:** the new and updated tests run before any code change (`npx vitest run` on the three files): 6 red
  — the feature name, the `VERSION` row, the text row (constants undefined), and the three hello assertions sets.
  The two forwarding rows (without `chooser`; with the feature) were green pre-slice: they are controls of
  unchanged behaviour, so they cannot fail on the old code (see §4); each is made discriminating by a mutant below.
- **Mutant A (exit check 4), forward `chooser` to a featureless extension:** the condition changed to
  `if (false && method === "uploadFiles" && "chooser" in p)` → "a featureless hello: uploadFiles {chooser} is VERSION
  …" red (1 failed / 4 passed); reverted.
- **Mutant B, refuse every `uploadFiles` to a featureless extension** (`"chooser" in p` dropped) → "uploadFiles
  without chooser is forwarded unchanged" red (1 failed / 4 passed); reverted, file re-run 5/5, intercept.ts numstat
  back to 12/0.

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- Exit check 8 says every new test fails on the pre-slice code. Two of the five new tests (forwarded without
  `chooser`; forwarded with the feature) assert behaviour the slice must leave unchanged, so they pass on the old
  code by design; mutant B shows the first discriminates, and the second fails on any rule that ignores the feature
  (not run as a separate mutant).
- The intercept.ts working copy is CRLF; one `sed -i` during mutant A wrote it LF, and I rewrote it CRLF; the
  committed blob is LF either way (`git show HEAD:daemon/src/intercept.ts` is LF).

## 5. Proposed decisions

### 2026-10-28 · S5c: `chooser`'s key presence counts, `false` and `null` included; the daemon's own text
**Decided:** an `uploadFiles` "carries `chooser`" when the key is present, `null` and `false` included, as `args`
under #342; the text is `CHOOSER_RELOAD_HINT` (above), naming the file chooser, no path. **Why:** the brief's rule
("carrying the `chooser` key") and #342's precedent; a wire caller that sends the key expects the new semantics, and
refusing is the conservative side. The SDK and MCP send `chooser: false` when given `false` (S5b), so such a call to
a stale extension is now refused although the old extension would have done the same thing. **Instead of:** refusing
only `chooser: true`. **Revisit if:** the user wants `chooser: false` to pass to an old extension. **By:** Claude
(proposed; text for user review)

## 6. Findings

None failed. No new runtime fact.

## 7. Handoff

No processes left running. Commit order: the spec hunk first (`docs(docs): S5c — spec §10 note …`), then the code,
tests and setup.md. `shared/src/protocol.ts`'s `features` doc comment (line ~54) still names only `["evaluateArgs"]`
as its example; left as is. A reload of the extension is needed live for the hello to carry the feature; a Step 12
daemon talking to the currently loaded build will refuse `chooser` with the new text until then.
