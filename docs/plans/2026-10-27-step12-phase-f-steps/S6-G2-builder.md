# Step 12 S6-G2 builder: a trusted click or typing as one blocking action

Model / effort: Opus, medium. Role: builder (agent-rules §6). Brief deviations: none.

## 1. Verdict
**DONE.**

## 2. Outputs
Files changed (uncommitted; the commit is the step agent's). `git diff --numstat` plus `wc -l` for the new file:

| File | Kind | + / − |
|---|---|---|
| `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` | spec note (§6.4 rule + §10 summary line), written first | 35 / 0 |
| `daemon/src/methods.ts` | code: `TRUSTED_SETTLE_MS = 500`, `trustedFocus(method, p)`; `takesLock` untouched | 15 / 0 |
| `daemon/src/intercept.ts` | code: the `trustedFocus` branch in `request`, the private `trustedInput` | 35 / 1 |
| `daemon/test/methods.test.ts` | test: the new `takesLock(click\|type\|pressKey, {trusted:true}) === false` rows in the existing lock-class table | 2 / 0 |
| `daemon/test/s6-trusted-focus.test.ts` | test: new, 13 tests | 349 / 0 |

Code 50 new lines (cap 300); tests 351 (cap 450). `daemon/src/lock.ts` was not touched.

Checks (all from commands I ran):
- `npx vitest run` **before**: `Tests 7 failed | 5085 passed (5092)`, `Test Files 3 failed | 214 passed (217)`. All 7 failures were in S5b's
  in-flight files (`mcp/test/s12-upload-chooser.test.ts`, `mcp/test/s2-focus-first.test.ts`, `sdk/test/s12-console-cap.test.ts`).
- `npx vitest run` **after**: `Tests 5106 passed (5106)`, `Test Files 218 passed (218)`, exit 0. My part is +13 tests and +1 file.
  The other +1 test comes from S5b's work, which changed while I ran. No test was removed. Daemon alone: `Tests 289 passed (289)`, 23 files.
- `npm run typecheck`: exit 0. Every `recipes/tsconfig*.json` (`fe`, base, `s10`, `s11`, `s11b`, `s6`, `s9`) with `npx tsc --noEmit -p`: exit 0.
  `npm run build`: exit 0.
- `git status --short` after the build: no `dist/` and no tracked build output. The only tracked changes are my four files plus S5b's
  (`docs/setup.md`, `mcp/…`, `sdk/…`, `S5a.md`).
- Log sites: +0. No log call was added. The `log-scan` test passes in the full run, with the allowlist untouched (54).
- `git diff -- shared extension sdk mcp`: **not empty, but none of it is mine.** Every hunk there is S5b's uncommitted work
  (`sdk/src/{tab,upload,format/console-messages}.ts`, `mcp/src/tools/registry.ts`, their tests). This slice wrote no file in those trees.
  The check holds on this slice's own file list.

**Proof that the new tests fail on the pre-slice code.** I copied my two src files aside, wrote `git show HEAD:` of `methods.ts` and
`intercept.ts` over them, ran the two test files, then restored my files and checked them with `cmp`.
- `s6-trusted-focus`: 13 of 13 red. The table test fails with `trustedFocus is not a function`. The order test fails with
  `expected [['click',…]] to deeply equal [['focusTab',{tabId:41},'a']]`.
- `methods.test.ts`: the new rows are green on HEAD. That is expected: they guard against the folding mutant (M2), not the pre-slice code.

**Mutants** (each applied by `sed`/script to my file, run, then restored from the copy; `cmp` confirmed the restore):

| Mutant | Result |
|---|---|
| M1: release between focus and input (`release()` right after the `focusTab` forward) | 7 failed / 23 |
| M2: trusted inputs folded into `takesLock` | 2 failed (the `takesLock` rows in both files) |
| M3: no settle pause | 6 failed |
| M4: no re-check of caller and lease between the forwards | 2 failed (disconnect-between, lease re-check) |

The order rule now sits in its own test file; M1 and M4 cover it.

## 3. Verifier verdict
None yet. The verifier comes next.

## 4. Deviations
- G6.6 wants every existing daemon lock and trusted-input test unchanged. The one change to `methods.test.ts` adds two lines of rows to
  the existing lock-class table, which G6.5 requires. No existing assertion was changed.
- Test harness choice: the order and hold tests drive `TabLayer` directly with a fake `ExtensionConnection`. Each forward records its
  method, params, `lock.holder()` at send time, and the `timeoutMs` the daemon gave it. The tests use vitest fake timers for the clock,
  so they need no new injected timer dep. The pause uses `setTimeout` at call time, which the fake timers replace.

## 5. Proposed decisions

### 2026-10-28 · S6-G2: a client's own `focusTab` before a trusted input stays harmless; the daemon focuses again under its hold
**Decided:** the SDK's `#trusted` (`sdk/src/tab.ts:189`) and the MCP's three trusted tools (`mcp/src/tools/registry.ts:505, 529, 542`)
still send `focusTab` first. That call takes the lock and releases it at its reply, as before. The trusted input then waits for a new
acquisition and focuses again under it.
- **No deadlock:** the first acquisition ends before the second request asks.
- **No harmful double focus:** the extension's `focusTab` (`extension/src/handlers/tabs.ts:59-78`) is `tabs.get` → effect check →
  `noteFocus` → `windows.update {focused}` → `tabs.update {active}`. Every step is idempotent for a tab already in front.
- **No changed answer on success:** the reply is the input's.
- **The focus under the hold is the one that closes the race.**
- **Cost:** one extra round trip and one extra lock wait. A client that calls a trusted input or a screenshot right after its own
  trusted input waits out its own pause, up to 500 ms.
- The test is "a client's own focusTab first … two acquisitions, no deadlock".

**Why:** the code shows this is idempotent, and it needs no SDK or MCP change (the lane).
**Instead of:** dropping the clients' own `focusTab` (an SDK/MCP change; it would touch `mcp/test/s2-focus-first.test.ts`).
**Revisit if:** latency matters. Dropping it is then a separate, optional SDK/MCP slice.
**By:** Claude (proposed)

### 2026-10-28 · S6-G2: a failed daemon `focusTab` answers with its error, forwards no input, and releases at once
**Decided:** if the forwarded `focusTab` rejects (`TAB_UNKNOWN`, `DISARMED`, `DOMAIN_BLOCKED`, `TIMEOUT`, …), the caller gets that
error, the input is not forwarded, and the lock is released with **no pause**: no input was sent, so nothing needs to settle. The same
holds when the caller disconnects or loses the lease between the forwards (`NOT_CONNECTED "client disconnected"`, `TAB_HELD`,
`TAB_GONE`).

For the SDK and the MCP the answer does not change, since their own `focusTab` failure is already the answer (#106,
`registry.ts:504` "a focusTab failure is the answer"). A raw client that sends a trusted input without its own `focusTab` may now get
`focusTab`'s refusal where it used to get the input's. Both pass the same gate, so the codes match (DISARMED, DOMAIN_BLOCKED,
TAB_UNKNOWN); messages may differ.

**Why:** never sending input to an unfocused tab is at least as strict, and matches the existing clients.
**Instead of:** forwarding the input anyway after a failed focus.
**Revisit if:** a raw-client answer must match the input's text exactly.
**By:** Claude (proposed, contract-level, for user review)

### 2026-10-28 · S6-G2: the pause is `min(500, deadline − now)` from the input's settle, after the reply
**Decided:** one deadline (#44) bounds the lock wait (`LOCK_TIMEOUT {holder}`), each forward (`deadline − now + 5000`) and the pause.
The pause follows every input outcome, an error or `TIMEOUT` included. When the input settles past the deadline, the lock is released
at once.

`noteFocus` and the screenshot-restore point of G-20 are unaffected. The extension's `focusTab` still calls `noteFocus` before it
changes anything. A screenshot's restore still runs after its own reply, outside the lock. The daemon change adds no extension call
besides that `focusTab`.

**Why:** spec §6.4 note; the hold never outlives the caller's deadline.
**Instead of:** a fixed 500 ms past the deadline.
**By:** Claude (proposed)

## 6. Findings
- No pre-registered check failed.
- **Note for the verifier (by reading, not measured):** the hold adds up to 500 ms before *any* lock-taking call that follows a
  trusted input, the caller's own included. This is the cost G-19 and #321 accepted.
- No new runtime fact.

## 7. Handoff
- **Processes:** none left running. The background test, typecheck and build jobs exited. Scratch copies (`methods.ts.new`,
  `intercept.ts.new`, the test logs) are in the session scratchpad, outside the repo.
- **For the committer:** stage exactly the five files in §2. The spec note goes first, as its own commit if the stage keeps the
  "spec note first" order. Never stage S5b's files.
- **G6.8, Run 19 rows for S7 to write** (draft expected answers; no sheet edited):
  - **R19-G2-1:** client A holds a fixture tab T_A and sends a trusted `click` on it. While that click is in flight, client B (its own
    fixture tab T_B) sends a default (`switch`) `screenshot`.
    *Expected:* A's click answers `ok` first. B's screenshot is forwarded only after A's reply plus the pause: the gap from A's reply to
    B's screenshot reaching the extension is ≥ 500 ms (bound 450 ms, to allow for clock reading) and B answers `ok`. During the gap,
    `daemon.status.lock.holder` reads A's name. T_A received the click (the fixture's counter is +1). No `LOCK_TIMEOUT`.
  - **R19-G2-2:** client A trusted-`type`s a 40-character fixture string into T_A's input. Client B, at once, loops default screenshots
    of T_B (at least 3, started within 50 ms of A's send).
    *Expected:* A's `type` answers `ok`, and T_A's input value equals the string exactly (0 characters lost). No B screenshot is
    forwarded between A's daemon `focusTab` and A's input reply. Every B screenshot answers `ok`, none `LOCK_TIMEOUT` under a 30 s
    timeout. R19-LOGS: the daemon log gains no line with a URL or the text.
- **Needs the user's keyboard:** nothing.
