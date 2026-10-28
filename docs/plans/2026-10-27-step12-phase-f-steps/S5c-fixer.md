# S5c fixer, round 1: the port-0 test for F1

Model / effort: Opus, medium. Read: `docs/agent-rules.md`; `S5c-verifier.md` (F1 only); `S5c-builder.md`;
`daemon/CLAUDE.md`; `daemon/test/s12-chooser-feature.test.ts`; `git show 9921715 -- daemon/test/s12-args-feature.test.ts`;
the verifier's scratch probe `s5cv-probe.test.ts`; the `start`/`client`/`extension` helpers in `daemon/test/tabs.test.ts`.

## 1. Verdict

**F1 fixed.** One new file, `daemon/test/s12-chooser-wire.test.ts` (48 lines, 3 tests). It is not in the existing S5c
file because the in-process file and the socket file need different set-ups.

## 2. What the test does

A real `WsHost` listens on port 0, never 9234. A fake extension connects over `ws` with a `proto: 2` hello and answers
`listTabs` (tab 41) and everything else with `{files: []}`. A raw client connects, calls `tabs.claim {active: true}`,
and then sends `uploadFiles`:

| Extension hello `features` | `uploadFiles {…, chooser: true}` | `uploadFiles` without `chooser` |
|---|---|---|
| no `features` key | error exactly `{code: "VERSION", message: CHOOSER_RELOAD_HINT}`; 0 `uploadFiles` frames reached the fake | forwarded as `{tabId: 41, ref, paths}`, result relayed |
| `["evaluateArgs"]` | same as above | same as above |
| `["evaluateArgs", "uploadChooser"]` (control) | forwarded as `{tabId: 41, ref, paths, chooser: true}` | same as above |

S2b's `s12-args-feature.test.ts` (9921715) runs in process. For the socket form I followed the verifier's probe and
`tabs.test.ts`, but kept it daemon-only (no SDK or MCP) so it stays small.

## 3. Mutant

The mutant was `if (false && method === "uploadFiles" && "chooser" in p)` at `daemon/src/intercept.ts:502`, which
forwards `chooser` to an extension without the feature. Under it the new file is **red: 2 failed / 3**, the two
featureless rows (`expected [ undefined, 1 ] to deeply equal [ { code: 'VERSION', … }, +0 ]`). The control row passes.

Restoring the file: I backed up its bytes and copied them back after the run.
- `intercept.ts` sha256 `215380…9c36e` before and after (the verifier's value).
- `git diff | sha256sum` `a60f5e…0b490` before and after.

## 4. Every stage

- `npm test`: **5108 passed / 219 files before → 5111 passed / 220 files after** (+3 tests, +1 file, none removed).
- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- Files changed by me: only `daemon/test/s12-chooser-wire.test.ts` and this report.
- Not mine, left untouched: the other uncommitted files, and `S7-sheet-builder2.md`, which appeared during the run.

## 5. Deviations

- **Size.** The new file is 48 lines, against "~45". With S5c's 77 lines of tests, the stage's tests now total 125,
  over the 90 cap the verifier cited. The step agent rules on it.
- **Scope.** Over the socket, this test sends only the value `chooser: true`. The committed in-process file already
  covers `false` and `null`, and so did the verifier's probe.

## 6. Proposed decisions

None.

## 7. Handoff

No processes are left running. A scratch backup of `intercept.ts` is in the scratchpad (`s5cf-intercept.bak`). Commit:
no (the brief says not to commit).
