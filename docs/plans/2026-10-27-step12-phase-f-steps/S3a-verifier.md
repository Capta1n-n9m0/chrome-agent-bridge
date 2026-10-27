# Step 12 S3a — verifier report (console messages: shared type, reducer, collector, handler, both tables)

Model / effort: Opus, medium. Commit: none (brief). Raw outputs: `S3a-verifier-evidence.txt` (same dir).

## 1. Verdict

**FAIL**: one MAJOR (F1). An object argument's `preview` passes an Error value's stack, with its URLs, into
`text`. That breaks C3.3 ("entries carry no URL or stack") on a path the reducer builds itself, and the URLs it carries
are never checked as sources. The fix is a few lines in `previewText`. Everything else holds: C3.1, C3.2, C3.4's
extension half, § Every stage and the four mutants the brief names. The other findings are MINOR or NIT.

## 2. Outputs

Layer followed: the phase doc with its dated Stage 0 note, which overrides 0.5 (class `evaluate`, #334; both tables in
S3a, F2), plus `stage0-audit.md` §5's rewrites of C3.1, C3.3 and C3.4.

**Test counts.** I made a HEAD `8a3053b` worktree in my scratch dir (`npm ci`, not a junction) and ran
`vitest --reporter=json` there and in the main tree, then compared per file (evidence §1):
- HEAD: 4768 tests, 198 files. Now: 4830 tests, 203 files, all passed.
- No file lost a test.
- S3a's share is **+48**: +35 in the four new files (9 + 19 + 2 + 5), and **+13 in `safety-gate.test.ts`**, which
  generates rows for each method. The builder reported +35 (N2).
- The other deltas (`recipes/test/s11b-r17b-fix` +3, `s12-helpers-b` +11) belong to the S1-helpers lane.
- At HEAD in the scratch worktree, 9 tests in `recipes/test/s11-r16-runner.test.ts` did not pass. That comes from the
  worktree's environment: they pass in the main tree, and the file is not S3a's.
- Final full run, after the mutants: `Test Files 203 passed (203)`, `Tests 4830 passed (4830)`.

**Checks** (all run by me):
- `npx tsc --noEmit -p` on shared, daemon, sdk, mcp and extension: exit 0 for each.
- `npm run typecheck`: exit 0.
- `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: exit 0, all seven.
- `npm run build`: exit 0. `git status --short` before and after the build: identical.

**Pre-slice failure.** I copied the 10 new and changed test files into the HEAD worktree: `10 failed (10)`,
`Tests 14 failed | 447 passed`. The new files fail there, two of them at import. The cross-table equality case passes
at HEAD, because the tables agree there. Its `consoleMessages` case fails. The mutants show the equality case
discriminates.

**Mutants.** Each mutant changed one main-tree file. The tests ran with a timeout, the file was restored, and `cmp`
reported it identical. Afterwards, `sha256sum -c` over the five source files gave 5 OK (evidence §4).

| # | Mutant | Result |
|---|---|---|
| M1 | strip then filter (the filter sees only the stripped text) — **brief (1)** | red: gate test 1, and the reduce file's worker crashes (N3) |
| M1b | the cut part's URLs not collected | red (reduce 1) |
| M2 | `consoleMessages: "tab"` — **brief (2)** | red 2 (`JS_DISABLED` case, cross-table) |
| M3 | the daemon line removed — **brief (3)** | red 4 (cross-table 2, `methods.test`, `safety-surface`) |
| M4 | the `METHOD_CLASSES` line removed — **brief (4)** | red 13 |
| M5 | child-session events collected | red (reduce 1) |
| M6 | handler: own-extension check dropped | red (gate 1) |
| M7 | handler: `file:` check dropped | **survives** (M-3) |
| M8 | handler: block-list check dropped | red (gate 1) |
| M9 | handler: `floor = 0` | **survives** (M-2) |
| M10 | `sw.ts` `onArm` no longer moves the floor | **survives** (M-2) |
| M11 | handler: no effect guard on the attach | **survives** (M-3) |
| M12 | handler: no 10 s bound | **survives** (M-3) |
| M13 | `Runtime.disable` only on success | red (reduce 1) |
| M14 | `sw.ts` `onEvent` listener removed | red (listener count) |
| M15 | revoked exceptions not dropped | red (reduce 1) |
| M16 | the exception's `url` not a source | red (reduce 1) |
| M17 | the context origin not a source | red (reduce 8) |

**Exit checks:**
- **C3.1 (rewritten), PASS.** `consoleMessages` is in both tables (`safety.ts`, `daemon/src/methods.ts`) and not in
  `takesLock`. The cross-table test is red when the line is removed from either table (M3, M4). The router scan went
  27 → 28 (`safety-gate.test.ts`).
- **C3.2, PASS.** Through `GatedRouter`, with attach, detach and CDP counters at 0: disarmed gives `DISARMED
  {scope:"all"}`, JavaScript off gives `JS_DISABLED`, and blocked, own-extension and `file:` pages give
  `DOMAIN_BLOCKED` with the existing messages. Bad params give `BAD_PARAMS` before any attach, and a call outside the
  gate gives `INTERNAL`.
- **C3.3, FAIL (F1).** The added case passes: a stack and a URL inside `exception.description`, a blocked source
  dropped before stripping, pre-arm entries dropped, and the caps. The preview path is the miss.
- **C3.4 (extension half), PASS.**
  - 28 router methods.
  - No log call in `console-messages.ts`, `handlers/console.ts` or the new `sw.ts` lines.
  - `extension/test/log-allowlist.ts` is untouched (54), and `log-scan` is green.
  - The gate test's console sentinel reaches the reply, and no `console.*` spy sees it.

**Size, re-measured** with `wc -l` and `git diff HEAD --numstat`:
- Code: 216 + 43 + 48 (`protocol.ts`) + 11 (`sw.ts`) + 1 + 1 = **320**, under the 450 cap.
- Tests: 126 + 243 + 27 + 37 + 17 (count edits) = **450**.
- Total: **770**, which is over the 675 that 1.5× the cap allows.
- So code alone is under the cap and all of the extra is tests. By §7 this is DONE-PARTIAL; #341's handling and its
  Revisit-if are for the step agent.

## 3. Verifier verdict

Not applicable (this is the verifier's report).

## 4. Deviations

- I ran my mutants with a per-run timeout. My first runner applied M1 and then hung on the crashed vitest worker
  (N3). I killed only my own node processes (by PID, under my runner), restored the file by reversing the exact edit,
  and checked it by hash before going on. No other file was touched.
- A pre-existing `scratchpad/wt` directory, not mine, received an `npm ci` from my first worktree attempt, after
  `git worktree add` failed because the path already existed. It held no junction into the main tree: the main
  `node_modules` was intact afterwards (42 `.bin` entries, `@bridge/*` present, full suite green). My own worktree
  `s3av-wt` is removed. Its `@bridge` links pointed only inside itself.

## 5. Proposed decisions

### 2026-10-27 · S3a: preview values are cut like descriptions
**Decided:** every `preview.properties[i].value` (and `entries`) is passed through `cutStack` with the entry's
`sources`, as an argument's `description` is. **Why:** F1. **Instead of:** dropping `preview` text entirely. **Revisit
if:** a live row shows that previews never carry a stack. **By:** Claude (proposed, safety)

## 6. Findings

**F1 · MAJOR · `extension/src/console-messages.ts:129-135` (`previewText`) and `:145` — a nested Error's stack and
URL reach `text`, and they are never sources.** `remoteText` cuts an argument's own `description` at its first stack
line and collects the URLs it cuts. `previewText`, however, copies each preview property's `value` whole.
- What V8 does, by reading (not measured here): it gives an Error-valued property in a preview its description, and
  that description is the stack (`Error: x\n    at …`), shortened to about 100 characters. DevTools shows
  `{e: Error: x at …}` for `console.log({e: err})`.
- Probe (`npx tsx s3av-probe.ts`, evidence §5): an object arg whose preview has
  `err: "Error: boom\n    at t (https://ads.bank.example/t.js?tok=S1:1:1)"`. The page's frames are allowed, and the
  block list is `bank.example`. The reply is:
  `"text": "Object {err: Error: boom\n    at t (https://ads.bank.example/t.js?tok=S1:1:1)}"`
  The entry is kept: a stack line, a blocked host and a token, in a reply under "no source URL, no stack".
- The impact is bounded: the class is `evaluate`, so the same agent could read the page by `evaluate`. But C3.3 and
  the spec note promise more, and the leak is the same defect F8 (a) was raised for.
- *Fix:* in `previewText`, map each property value (and each `entries` key and value) through
  `cutStack(String(value), sources)`. Optionally cut at the first `\n` of any preview value. Add a reducer case: an
  object whose preview holds a blocked stack URL is **dropped** (the cut URL is a source), and an allowed one keeps no
  `at` line.

**M-1 · MINOR · `console-messages.ts:208`, with `safety-match.ts` `isUrlBlocked`/`isFileUrl` — "no source → drop" is
met by a string that is not a URL.** Probe: `dropSource("null")`, `("foo.js")`, `("<anonymous>")` and
`("webpack-internal:///./a.js")` are all `false`, so each counts as a source that passes.
- Where this fails open: the entry's context is unknown and its only frame name comes from a `//# sourceURL=` or
  similar. For example, a removed same-site frame of a blocked host whose code ran from `eval` with a sourceURL.
- That is contrived, and a known context's origin still catches the usual case.
- *Fix:* count a source only when `urlHost(u)` is non-null or its scheme is known (`chrome-extension:`, `file:`,
  `data:`, `blob:` …). Otherwise treat it as no source. Add a case.

**M-2 · MINOR · `extension/src/handlers/console.ts:24` and `extension/src/sw.ts:68` — the pre-arm floor's wiring is
untested, and one edge fails open.** M9 (`floor = 0`) and M10 (`onArm` without `consoleArmFloor.armed()`) both
survive. Only the pure `ArmFloor` and reducer are tested.
- By reading `safety-state.ts:375-384`: `onArm` fires only on a `false` → armed transition. When the worker's first
  load failed (`mem === null`) and the next event is an options-page arm, `apply(…, "change")` sees `prev === null`
  and does not fire `onArm`. The floor stays at worker start, so messages from a disarmed period in that worker's
  life replay.
- That needs a failed `storage.local` read: rare, but it is the safety side.
- *Fix:* add a static test that `onArm` calls `consoleArmFloor.armed()` and the handler reads `consoleArmFloor.floor`
  (an `sw-static` regex, as for `router.on`). Also call `consoleArmFloor.armed()` whenever `apply` lands on armed from
  a non-armed or unknown state; moving the floor later only fails closed.

**M-3 · MINOR · `extension/src/handlers/console.ts:25-41` — three handler-glue properties have no test.** M7 (the
`file:` check), M11 (no `call` guard for `withDebugger`) and M12 (no 10 s bound) survive.
- M11 matters most. The gate's check before the first side effect is what keeps a session from attaching on a tab
  that became blocked or `file:` after receipt. That is a STOP-rule item, and here nothing pins it.
- These are `chrome.*` glue, but the gate test already runs the real handler on a fake `chrome`, so each needs one
  more case:
  - a state that refuses at the `effect` phase, with attach at 0;
  - a `file:` frame URL dropped;
  - a hanging `Runtime.enable` with fake timers: `TIMEOUT`, then detach and `consoleCollectors.size === 0`.

**N1 · NIT · spec note and `console-messages.ts` header — "No source URL, no stack in any field".** A string argument
is passed whole. Probe: `console.log(err.stack)` returns the stack text. That is page-supplied data, not CDP metadata,
but the sentence reads as absolute. *Fix:* say "no CDP-supplied source URL or stack; text the page itself logs is
passed as logged".

**N2 · NIT · `S3a-builder.md` §2 — "My share is +35 tests".** The share is +48: 13 rows of `safety-gate.test.ts` are
generated for each method (`396 → 409`).

**N3 · NIT · `extension/test/s12-console-reduce.test.ts` — under M1 the file's worker dies** (`Error: Worker exited
unexpectedly`) instead of reporting a failure. In a combined run, vitest then hung until my timeout. The likely cause
is the cap test diffing a very large string. It is still red, but a real regression would hang a plain `npm test`.
*Fix:* compare lengths, or a slice, in the cap tests instead of whole-array `toEqual` on large texts.

**Live checks to add to the builder's list (§7):**
- Exceptions thrown while disarmed are dropped after a re-arm. Stage 0 measured original timestamps for
  `consoleAPICalled` only (m1 C1). That `exceptionThrown`'s replay keeps its original `timestamp` is unmeasured.
- An object holding an Error logs no `at` line (F1).

**Checked and sound:**
- The collector is per call and keyed by `tabId`. It ignores `sessionId` events and is bounded at 4000. It is stopped
  on every path (`finally`).
- On a timeout, `withDebugger`'s detach ends the session. A stale collector can only feed an already-rejected call.
- `Runtime.disable` runs in `finally`, its error is swallowed, and detach follows.
- No `Log.enable` and no `discardConsoleEntries` (test-asserted). The listener is synchronous at top level, with no
  `await`.
- The block list is read afresh after the read, and the post-check covers a navigation during the call.
- The lane matches Stage0.md §6's S3a row. The `onArm` line is a documented deviation.

## 7. Handoff

- No processes are left. My runner's node and vitest PIDs were killed after the hang (§4).
- No Chrome, no port 9234. The worktree is removed. Mutant files are restored; hashes in the evidence.
- For the fixer: F1 (required), then M-1 to M-3 and N1 to N3 as the step agent chooses.
- A fresh verifier re-checks F1's case, M9/M10/M11 turning red if those tests are added, and the counts.
