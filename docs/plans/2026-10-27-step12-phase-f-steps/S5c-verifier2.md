# S5c verifier, round 2: re-check of F1

Model / effort: Opus, medium. Read: `docs/agent-rules.md`; `S5c-verifier.md` (F1); `S5c-fixer.md`; the new file
`daemon/test/s12-chooser-wire.test.ts`; `daemon/src/intercept.ts:495-505`. Re-checked F1 only.

## 1. Verdict

**PASS. F1 is closed.** The new port-0 test is real: it is red under the forwarding mutant and on the pre-slice daemon,
and the fixer changed no other file. One note remains for the step agent: the size (section 4).

## 2. Checks

| # | Check | Evidence | Result |
|---|---|---|---|
| 1 | Port 0 only | `new WsHost(new Bridge(), { port: 0, … })` (line 32). Both peers dial `ws://127.0.0.1:${port}`, using the port that `listen()` returned. No `9234` appears in the file. | met |
| 2 | Exact code and text, 0 frames forwarded | For a hello with no `features` key and one with `["evaluateArgs"]`: `expect([refused, uploads().length]).toEqual([{code:"VERSION", message: CHOOSER_RELOAD_HINT}, 0])`. This is exact deep equality, so a `data` key would fail it. | met |
| 3 | The 0-frames check can fail | The fake extension records each frame before it replies. A forwarded `uploadFiles` would therefore sit in `ext.frames` before the client's `c2` reply arrived, and so before the count is taken. The call without `chooser` then shows the same fake receiving `{tabId:41, ref, paths}`, with no `chooser` key. The control row (`["evaluateArgs","uploadChooser"]`) shows `{…, chooser: true}` forwarded. Under the mutant the observed value is `[undefined, 1]` (below). | met |
| 4 | Red under the forwarding mutant | `if (false && method === "uploadFiles" && "chooser" in p)` at `intercept.ts:502`: **2 failed / 3**, the two featureless rows: `expected [ undefined, 1 ] to deeply equal [ { code: 'VERSION', …(1) }, +0 ]`. The control row passes. | met |
| 5 | Red on the pre-slice daemon | `git show HEAD:daemon/src/intercept.ts` swapped in temporarily: **2 failed / 3**, the same two rows with the same message. The control row passes there by design, because the pre-slice daemon forwards everything. | met |
| 6 | Mutants reverted exactly | Backup copied back after each run. `intercept.ts` sha256 `215380…9c36e` before and after. `git diff \| sha256sum` `a60f5e…0b490` before and after. That hash matches the fixer's value. | met |
| 7 | `npm test` | **5111 passed / 220 files**, exit 0. Before the fix: 5108 / 219 (round-1 report). That is +3 tests and +1 file, matching the fixer's claim. | met |
| 8 | `npm run typecheck` and `npm run build` | Both exit 0. `git status --short` is identical before and after the build. | met |
| 9 | No other file changed by the fixer | The tracked-diff hash equals the fixer's before/after value. The tracked changes are S5c's own files plus `docs/e2e-test-plan.md` (+89) and `S5b.md` (1/1, the hash line). Both of those belong elsewhere. The new untracked files are the wire test and the S5c/S7-sheet reports. | met |

## 3. Notes (no action)

- On pre-slice code, `CHOOSER_RELOAD_HINT` imports as `undefined`, but the test still goes red on the assertion, not
  on the import. That is a valid red.
- `next()` polls every 5 ms with no timeout. A frame that never arrives would leave the test to vitest's own timeout,
  so a failure would show up as a timeout. That is acceptable in a test.

## 4. Size (`git diff --numstat` plus the two new test files)

- **Code: +20 / −3.** `intercept.ts` 12/0, `extension/src/client.ts` 6/−3, `shared/src/protocol.ts` 2/0. The cap is 60.
- **Tests: 125.** `s12-chooser-feature.test.ts` 69, `s12-chooser-wire.test.ts` 48, `s12-args-call.test.ts` 4/−4,
  `tab-events.test.ts` 4/−4. That is **over the 90 cap by 35**, a deviation the fixer flagged for the step agent to rule
  on.
- **Docs:** spec 11/0, `setup.md` 5/−3.

## 5. Proposed decisions

None.

## 6. Handoff

No processes are left running. A scratch backup is at
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\3933cbe1-90a7-4fc5-83a1-3e97601ffc62\scratchpad\v2-intercept.bak`.
Commit: no.
