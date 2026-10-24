# S2b — verifier report (Step 9, stage S2b "Extension UI and the 0.7 log scan")

Verifier, 2026-10-24, Claude Opus 5.5 (claude-opus-5-5). Independent of the builder. I read the brief
`briefs/S2b-verifier.md`, `briefs/common.md`, role-prompts.md §Verifier, `briefs/S2b-builder.md` and the builder's
report `S2b-builder.md`, which I treated as claims to check. The diff is the uncommitted tree against HEAD `55f4d6e`.
Nothing was committed. I did not reload the extension, touch Chrome, start the real daemon or bind 9234 (the sentinel
test's daemon binds port 0).

**Tree integrity.** Before I started I hashed the tree (`git diff` plus every untracked file):
`059b18f1…a258`. After every mutation and the final run the hash was `059b18f1…a258` again, so the tree is identical.
I made each mutation as a temporary on-disk edit, restored it from a byte copy in the scratchpad, and proved the
restore with `cmp` plus `git diff --quiet` (all printed `restored-*` / `same-*`). Two throwaway scripts ran from
the scratchpad and were deleted afterwards. One aborted batch was stopped before it edited anything: a stray
`python -` waited on stdin. `cmp` showed all three backed-up files unchanged, and no python process was left
running.

## 1. Checks re-run

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **113 files, 2645 tests passed** (baseline 2561 / 106 → +84 tests, +7 files; none removed) |
| new files alone | manifest 4, badge 30, options-model 12, sw-action 9, log-sentinel 2, log-scan 11, safety-writers 16 = **84** (matches the builder) |
| `npm run build` | exit 0; `git status` afterwards lists only the four stage edits (no other tracked file changed) |
| `git diff --stat -- extension/test daemon sdk mcp shared recipes` | empty (no pre-S2b test file and no other package changed) |
| Lane | changed: `extension/manifest.json`, `options.html`, `src/options.ts`, `src/sw.ts`; new: `src/badge.ts`, `src/options-model.ts`, seven tests and two test helpers under `extension/test/`. `build.mjs` unchanged. Everything is inside the brief's LANE. |

## 2. Exit-check table

| Check | Result | Evidence |
|---|---|---|
| **S2.3 scan** (every `console.*` / injected-logger site in the 4 packages against an allowlist) | **PASS** on today's tree; robustness gaps → F2 | My own grep found 22 `console.` calls (extension 15, daemon 3, mcp 4; one more hit is a string inside a tool description) and 26 daemon logger calls (handle-mark 2, intercept 6, main 17, wsHost 1). That is **48**, the same as the allowlist (15 + 29 + 4 + 0). On-disk mutations: V2 `console.debug(…hostname)` in `safety-call.ts` → `× found sites = the allowlist, both ways`; V5 `console.info(url)` in `sdk/src/tab.ts` → `×` (same test). |
| **S2.3 sentinel** | **PASS** | V1b: `intercept.ts` logs `"dbg " + JSON.stringify(frame)` after the malformed-event line → `AssertionError: a sentinel (sentinel-pattern-q7) in a log line: 127 chars`. V2 (extension gate logs a hostname) → `a sentinel (sentinel-pattern-q7) in a log line: 65 chars`. V1 (the malformed line itself changed) was red too, but on the liveness assertion. Both runs restored. |
| **S2.4** | **PASS** | `import=0 export=0 col0await=0` after build. V6: appending `const st = await chrome.storage.local.get("armed");` to `sw.ts` gave `col0=1` and `× sw.ts has none — expected [ 'await at 378' ] to deeply equal []`. V8: `await badge.refresh();` at the top level → the AST test and sw-action's "a top-level `void badge.refresh();`" both red. Restored; green again in the final suite run. |
| **Listener** | **PASS** | `sw.ts:363` `chrome.action.onClicked.addListener(() => void badge.press(() => safety.toggle()));` is a SourceFile statement. `grep onCommand\|chrome.commands extension/src` → none. I read the whole top level of `sw.ts`: the new lines are one `const badge = new BadgeController(…)`, one `onClicked`, one `storage.onChanged`, and `void badge.refresh();`, all synchronous, with no `await`. V7 (registration moved into `safety.start().then(…)`) → 3 sw-action tests red. |
| **Manifest** | **PASS** | `git diff extension/manifest.json`: only `"action": { "default_title": "Chrome Agent Bridge" }` and `"commands": { "_execute_action": { "suggested_key": { "default": "Alt+Shift+K" } } }`. No `default_popup`, permissions and host_permissions unchanged. Mutations: manifest at HEAD → 3/4 red; extra permission → red; `default_popup` → red; `Alt+Shift+L` → red. |
| **S3.3 `storage.local.set` half** | **PASS**; gaps → F3 | Caught: destructured `set` (W1), `chrome.storage["local"]` (W2), `local["set"]` (W3), a runtime-built key (W4), `remove` (W5), `clear` (W6), `globalThis.chrome…` (W7), `(chrome).storage…` (W10), `chrome?.storage…` (W11). W8 `const c = chrome; c.storage.local.set(…)`: the new AST test did not catch it; only S2a's text regex in `sw-static.test.ts` did. **Missed by both:** W9 `const { storage: __s } = chrome; __s.local.set(…)` and W12 `const { storage: { local: __l } } = chrome; __l.set(…)` → `Tests 30 passed (30)`. |
| **Badge** | **PASS** | `badge.ts:43-51` has #143's three titles verbatim. Mutations: JS before OFF (B1) → `× disarmed → OFF red … OFF wins` red; unreadable → armed (B2) → 4 red; an ignored press clears the failure (B3) → red; rejected arm → `armed` (B4) → red. All restored. |
| **Options page** | **PASS** (with F4, F5) | Saves through `writeSafety((items) => chrome.storage.local.set(items), change)` (`options.ts:93`), on `change` with no debounce. Lines are analysed by `parseBlockList` (S1). Mutations: invalid lines counted (O1) → 5 red, including "the count shown equals … SafetyStore.read().blockedCount"; always reload (O2) → 2 red; 0-based line numbers (O3) → 2 red. Port/token code is byte-identical. `options.ts` and `options-model.ts` contain no log call (the scan agrees). |
| **Security** | **PASS** | `grep onMessage\|onMessageExternal\|onConnect\|externally_connectable\|web_accessible_resources\|router.on(\|.toggle(\|writeSafety` finds no new path: `safety.toggle` is referenced once (`sw.ts:363`), and `writeSafety` only in `safety-state.ts` and `options.ts:93`. The router has the same 23 registrations, and the `onMessage` relay is unchanged. No S2a file is in the diff; the own-page tests (`s2a-fixer1.test.ts`, …) pass in the 2645 run. The only new `console.` line is `badge.ts:165 console.log(toggleLogLine(r))`, which prints one of five fixed strings. |
| **New pure tests fail without their change** | **PASS** | badge B1–B4, options-model O1–O3, manifest MF1–MF4, sw-action V7/V8, scan V2/V5, sentinel V1b/V2, writers W1–W11 (above). |

## 3. Findings

**F1 · MINOR (S2a's code, outside S2b's lane; I recommend escalating it: "what the network log records while
disarmed") · `extension/src/safety-state.ts:276-279`.** The builder's finding 1 is confirmed. When an arm's write is
rejected, `toggleOnce` has already set the memory copy to armed (and run `onArm`), and it never restores it. I ran a
throwaway script from the scratchpad, since deleted:
```
before: storage armed = false | ingestView armed = false
toggle rejected: quota
after failed arm: storage armed = false | memory armed = true | read().armed = false | ingestView armed = true
next press: disarmed | storage armed = false
```
What this means:
- Every call is still refused, so the gate is safe.
- The **network ingest records traffic while storage, the badge and every call say OFF**. That is a disarmed state
  the network log should not be recording in (#131's 0.3).
- `onArm` (`debuggerSessions.refuse(null)`) has run.
- The next press disarms instead of retrying the arm.

This contradicts the letter of #174 ("memory is never re-armed by a failed write"). That sentence was written about
the disarm, but S2b shows the failed arm as "still `OFF`", and the ingest disagrees with the badge. It needs a
`storage.local.set` failure, so no agent can reach it. Suggested fix (S2a's file; I did not make it): on a rejected
arm write, put the memory copy back to its disarmed value without moving `lastDisarmAt`, run the matching
`onDisarm` (or skip `onArm` until the write succeeds), then rethrow; add a unit test for it. S2b's badge already
words this case correctly ("turn it on from the options page").

**F2 · MINOR · `extension/test/log-scan.ts:41-51`.** The scan finds sites by name: `console…`, or a call named `log` /
`.log`. It covers every form `console` can take: element access, aliasing, destructuring, `globalThis.` and `self.`,
parentheses, `.call`/`.apply`, `Reflect.apply`, optional chaining. It misses other output paths. I ran its own
`logSitesIn` over snippets:
- `process.stderr.write(url)` and `process.stdout.write(url)` → MISSED (V3 on disk in `mcp/src/index.ts`:
  `Tests 1 passed`).
- An injected logger copied under another name, `const say = o.log; say(url)` → MISSED (V4 on disk in
  `daemon/src/wsHost.ts`: green). Today `wsHost.ts:240` survives only because its copy happens to be named `log`.
- `log.call(…)`, `log.apply(…)`, `log.bind(…)` → MISSED.
- `this.deps.warn?.(url)` (an injected logger with another name) → MISSED.

None of these exists in today's tree, so S2.3 passes on the code as it stands. But #141's "every injected-logger call
site" holds only while those conventions do. Suggested fix: also flag `process.stdout` / `process.stderr` (and
`.write` on them); flag any `log` / `.log` used as a value other than as a callee (the treatment `console` already
gets); flag `.call` / `.apply` / `.bind` on a logger. The sentinel test is the backstop, but only for paths it
drives.

**F3 · MINOR · `extension/test/safety-writers.test.ts:97-126`.** The AST rules start from the literal identifier
`chrome`. Aliasing `chrome` itself (W8) is caught only by S2a's text regex in `sw-static.test.ts`. Destructuring
`storage` or `local` from `chrome` (W9, W12) passes both tests. The builder's report says the test is
"discriminating against indirection", which overstates it. Suggested fix: flag `chrome` used anywhere other than as
the object of a property access (an alias, a destructuring, or an argument), the same way the log scan treats
`console`.

**F4 · NIT · `extension/src/options.ts:62-63`.** The options page renders the **stored** state, while the worker
applies "a disarm held in memory wins" (#176). After a `write-failed` disarm (memory OFF, storage armed), the page
shows "Bridge armed." with the switch ticked, while the badge says OFF and every call is refused. This needs a
storage failure, so it cannot be produced live. Suggested fix: a sentence in the page's error area, or accept it
and document it in S4/S5.

**F5 · NIT · `extension/src/badge.ts:91-98`.** `BadgeModel` keeps the `write-failed` title ("OFF, but not saved …")
for as long as reads say disarmed. If the options page then saves `armed: false` successfully, the OFF is saved,
but the title still says it is not. This is a cosmetic mismatch only, and it fails safe.

**F6 · NIT (existing code) · `daemon/src/main.ts:208-209`.** `client ± ${JSON.stringify(name)}` logs a name the client
chooses. `redact` withholds a line containing `://` or the token, but a scheme-less host or a title used as a client
name would be logged. It is chosen by the client, not taken from a page, and it is outside the lane. The allowlist
note describes it accurately. Nothing to fix now.

**F7 · NIT · builder report §8.** The S4 facts are complete enough: button, shortcut, the JS badge, write-failed
not producible live, the options controls with their accessible names, the shortcuts link, and the badge at worker
start after a reload while disarmed. The UIA names match `options.html`: `Bridge on (agents may use this browser)`,
`Allow JavaScript (browser_evaluate)`, `Blocked sites, one per line` (`<label for>`), `Save blocked sites`,
`Change the keyboard shortcut`, `Port`, `Token`, `Save`. The §8 row 5 sample text matches the model output
(`1 blocked site. 1 invalid line is not counted (marked below).`, `line: 2`). Two caveats for S4:
- That the toolbar button's accessible name is its title is unmeasured. Record what UIA shows.
- Whether Chrome assigns `Alt+Shift+K` (it skips a suggested key that conflicts) is SAFE-2's reading, as the
  builder says.

**F8 · NIT · `extension/src/sw.ts:31`.** S2a's comment still says "S2b's `action.onClicked` will call it". It is now
true. Builder finding 3, left alone; S5 or S2a's owner may update the tense.

## 4. Builder claims checked

- Counts, file list, manifest diff, the `sw.ts` additions, and allowlist sizes (15/29/0/4, no `KNOWN-VIOLATION`):
  **confirmed**.
- The scan "catches every daemon logger form" and the writers test is "discriminating against indirection":
  **partly**. See F2 and F3.
- M3b staying green on the sentinel test (a new `console.warn` of an error without a sentinel): consistent with my
  reading. The scan, not the sentinel, catches new unlisted lines.
- Builder finding 2 (S2a's `sw-static` regex misses an alias): **confirmed**. The new test closes the
  `area = chrome.storage.local` alias, but not the destructuring forms in F3.

## 5. Verdict

**PASS-with-notes.** Every exit check passes and each discriminating check was shown red and then restored. The
findings are MINOR or NIT: F2 and F3 are test-robustness gaps, and F4–F8 are cosmetic or existing. F1 is a defect
in S2a's file, outside this stage's lane. It does not block S2b, but the step agent should escalate it as an
S2a follow-up, since it changes what the network log records while the human sees OFF.

## Round 2

Verifier r2, 2026-10-24, Claude Opus 5.5 (claude-opus-5-5). Scope: re-check the items the fixer touched (F2, F3, F5),
the fixer's `storage.local.get(null)` trade-off, and S2.4 and the listener. I read `briefs/S2b-fixer1.md` and
`S2b-fixer1.md` as claims to check. Nothing was committed. I did not reload the extension, touch Chrome, start the real
daemon or bind 9234.

**Tree integrity.** The hash of `git diff` plus every untracked file except this report was `91deaede…7146` before I
started and again at the end. One slip: in my first F2/F3 batch, the backup path `scratchpad/bak` was an existing
directory, so `cp` made no backup and the appended mutations were not restored by copy. Those mutations also
accumulated in `extension/src/handlers/network.ts`. All five files the batch touched (`sdk/src/tab.ts`,
`daemon/src/intercept.ts`, `mcp/src/link.ts`, `daemon/src/handle-mark.ts`, `extension/src/handlers/network.ts`) are
unmodified at HEAD and are not stage files, so I restored them with `git checkout --`. `git status` then showed only
the four stage edits, and the hash was `91deaede…7146` again. I discarded that batch's results and re-ran every
mutation on its own, with a file backup and `cmp` plus `git diff --quiet` after each (`restored-clean`).

### R2 checks

| Item | Result | Evidence |
|---|---|---|
| (1) typecheck / test / build | **PASS** | `tc=0`; `Test Files 113 passed (113)`, `Tests 2660 passed (2660)`, which confirms the fixer's 2645 → 2660 (+15); `build=0`. Afterwards `git status` lists only the four S2b tracked edits plus the untracked stage files. `git diff --stat -- extension/test daemon sdk mcp shared recipes` is empty, so no pre-S2b test file and no other package changed. |
| (2) F2 scan, my own mutations | **PASS** | Each was red on `log-scan.test.ts -t "both ways"` (`Tests 1 failed \| 15 skipped`) and then restored clean: `process.stderr.write(u9)` in `sdk/src/tab.ts`; `d9.warn?.("u")` in `daemon/src/intercept.ts`; `const { stdout: so9 } = process; so9.write("u")` in `mcp/src/link.ts`; `log.bind(null)` in `daemon/src/handle-mark.ts`. The full suite is green with an exact allowlist, so the scan has no false positive. |
| (2) six new allowlist entries | **PASS** | None prints anything. `handle-mark.ts:99` `const log = options.log ?? (() => {})` copies the logger. `wsHost.ts:147` `log: options.log` hands it on. `wsHost.ts:240` `const log = this.options.log` copies it. `wsHost.ts:241` `proto && log` is a truthiness test. `mcp/src/index.ts:36-37` `stdout: process.stdout`, `signals: process` are used only by `lifecycle.ts`'s `stdout.on("error")` / `signals.on(sig)` and the matching `off`; nothing there writes. No URL, title, pattern or token in any of them. |
| (3) F3 writers test, my own mutations (in `handlers/network.ts`) | **PASS** | Each was red on `-t "no violation"` (`Tests 1 failed \| 21 skipped`) and then restored clean: W8 `const cc9 = chrome; …`; W9 `const { storage: s9 } = chrome; …`; W12 `const { storage: { local: l9 } } = chrome; …`; plus two of my own, `function f9(c = chrome)` (a parameter default) and `const { local: l8 } = chrome.storage`. The suite is green, so there is no false positive (type positions such as `chrome.tabs.Tab` pass). |
| (4) F5 badge | **PASS** | `badge.ts:97-106`: a read that says disarmed returns either the failure kind or `state armed:false`, so it is `OFF` on every path. The note clears only when `storedArmed === false`. Mutations, each restored (`same`): line 103 deleted → 2 red (both F5 tests); `!== true` (clears when the value is unknown) → 5 red, including "a stored read that rejects keeps the not-saved title"; a cleared note returned as armed → 2 red ("…OFF stays"). |
| (5) `get(null)` in `sw.ts:366` | **PASS**, NIT R2-2 | See R2-2. |
| (6) S2.4 and the listener | **PASS** | `import=0 export=0 col0await=0` after the build. `sw-static.test.ts` + `sw-action.test.ts`: 23/23 green, including "exactly one registration, a top-level statement" and "a top-level `void badge.refresh();` (not awaited)". `sw.ts:369` `chrome.action.onClicked.addListener(…)` is at column 0. The only `onCommand` in `extension/src` is the comment at `sw.ts:355`. |

### R2 findings

**R2-1 · NIT · `extension/test/log-scan.ts:113-136`.** The widened scan still misses three forms. I checked each
with `logSitesIn` from a scratch script:
- `globalThis.process.stderr.write(u)` → `[]`. Here `process` is a property name, and `isDeclName` treats a property
  name as a declaration.
- `import { stderr } from "node:process"; stderr.write(u)` → `[]`.
- A level-name logger used as a value: `const f = deps["error"]; f(u)` → `[]`, and `{ say: deps.warn }` → `[]`.

None of these exists in the tree, and the header states the naming convention, so this is a NIT. Suggested fix:
- flag `process` reached through `globalThis` / `self`;
- flag any import from `process` / `node:process` / `console` / `node:console`;
- flag a level-name access on a non-`console` object that is not called on the spot.

**R2-2 · NIT · `extension/src/sw.ts:366`.** `storedArmed: () => chrome.storage.local.get(null).then((raw) =>
parseStoredSafety(raw).armed)`. What I checked:
- **Not top-level awaited.** The read is inside a closure that only `badge.refresh()` calls, and the top level is
  `void badge.refresh();` (the AST test and `col0await=0`).
- **Nothing logs it.** `raw` goes straight into `parseStoredSafety`, which reads only the three safety keys. When it
  throws, the message is the constant `"safety state unreadable"` (`safety-state.ts:53`), never a value.
  `BadgeController.refresh` swallows the rejection (`badge.ts:163-167`), and the only log in `badge.ts` is the fixed
  press line.
- **No message or wire path.** The value is not posted, sent or returned. Only a boolean leaves the closure.

So I found no path by which the token leaks. The cost is data minimisation: every refresh (worker start, every safety
change, every press) loads `port`, `token`, the session marker and anything else in `storage.local` into a value
that is then discarded. The worker already holds the token for `connect()` (`sw.ts:228`), so this exposes nothing
new.

A narrower read is feasible within the lane. I showed this with a restored temporary edit:
- `sw.ts` imported `SAFETY_KEY_NAMES` and called `chrome.storage.local.get([...SAFETY_KEY_NAMES])`.
- With `safety-writers.test.ts` unchanged, `no violation` was red (`Failed Tests 1`). That is the rule the fixer
  avoided.
- With `"sw.ts"` added to `IDENT_ALLOWED.SAFETY_KEY_NAMES`, `safety-writers`, `sw-static`, `sw-action` and
  `log-scan` passed 61/61, and `tsc -p extension` exited 0.
- Both files were restored (`restored-both`, and the tree hash was unchanged).

**Recommendation: take the narrower read.** Make the allowance tight. In `sw.ts`, `SAFETY_KEY_NAMES` may appear only
as the operand of a spread in the array literal that is the sole argument of a `chrome.storage.local.get(…)` call
(plus its import specifier). Add an in-memory mutation test showing that `SAFETY_KEY_NAMES` used anywhere else in
`sw.ts` (for example in a `.set` argument or an alias) is still red. That keeps the writers rule's purpose, which is
that no file outside the two writers can build safety items, and drops the token from the read. The alternative, a
`readStoredArmed()` helper in `safety-state.ts`, is cleaner but is S2a's file and outside the lane. If the step agent
prefers not to widen the test, `get(null)` is acceptable as it stands. It is a NIT, not a defect.

### Round 2 verdict

**PASS-with-notes.** Every re-checked exit item passes. F2, F3 and F5 are fixed and discriminate against my own
mutations. The two new findings are NITs: R2-1 is a residual set of scan forms not in the tree, and R2-2 recommends
the narrower stored-state read. Round 1's F1 (S2a's `toggleOnce`, outside the lane), F4 and F6–F8 stand as ruled.
