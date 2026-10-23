# S3 verifier report — the SDK's typed Tab, cursor, locators and policy

Verifier: Claude Opus 5.5, 2026-10-23. Independent of the builder. The builder report
(`S3-builder.md`) was audited as claims. Nothing in the main tree was edited except this file.

## Set-up

- Clean worktree at `a3ac169` in the scratchpad, `npm ci`. HEAD is `cad2274`, but `a3ac169..cad2274`
  is docs only (11 files under `docs/`), so the base is the same for code.
- The S3 lane was copied in: `git diff a3ac169 -- sdk/` applied (3 modified files), plus the 7
  untracked sdk files. `git status --short` in the worktree showed exactly those 10 paths, all under
  `sdk/`. The 3 modified files were byte-identical to the main tree after CR stripping (`cmp`).
- The worktree was removed after the run (`git worktree remove --force`, then `rm -rf` +
  `git worktree prune`: node_modules blocked the first remove). `s2-verify` belongs to another agent
  and was left alone.

## Counts

| | `npm test` (vitest run) | `npm run typecheck` | `npm run build` |
|---|---|---|---|
| Baseline `a3ac169` | **1135 passed, 66 files** | exit 0 | — |
| With S3 | **1223 passed, 70 files** (+88 tests, +4 files) | exit 0 (shared, daemon, sdk, mcp, extension) | exit 0 (daemon, mcp, extension) |

+88 matches the builder's sdk-only figure (197 → 285). The builder's 1225/70 came from the shared tree
with S2's edits in it, as the builder said.

## Exit checks

**S3.1 — met.** 1223 ≥ 1135 + 88; typecheck green (above).

**S3.2 — met.** `sdk/src/policy.ts` exists, `TRUSTED_INPUT_POLICY = "focusFirst"`. The comment cites
BG-1/BG-2 FAIL ("ok in 5–10 ms, page received nothing; after focusTab it worked"), BGF-1/BGF-2 FAIL
("ok in 12–15 ms", the three flags), FE-0 PASS, FE-PC PASS, FE-1 0/3, FE-2 2/3 (trial 3 lost the first
five characters), FE-3 0/3, FE-4 PASS 9/9, FE-5 control 0/12 (not void), "no kind passes" → (B), and
decision #89 "The background-input policy" with outcome (B), plus #78 item 4. Checked against
`docs/decisions.md` #89 (line 59) and #66 (line 389) and the CLAUDE.md BG-1/BG-2 bullet: every number
matches. #89 exists (a3ac169; `cad2274` adds only an "Updated" line).

**S3.3 — met.** In `sdk/test/tab.test.ts`: 31 exact-frame cases (`toStrictEqual` on params, plus the
call `timeoutMs`) covering every 0.4 method, each with `tab: "T3"` except `network({id})` and
`download`, which assert no `tab`; `newTab`/`claim` set the cursor (`client.tab()` is the returned
Tab); `tab()` with no cursor → `NO_CURSOR` containing "call newTab() or claim() first", and each of the
20 mirrored methods rejects the same way with no frame sent; a 4002 reconnect clears the cursor (4
tests, including the synchronous case and the claim-answer + 4002 in one read); trusted → `focusTab`
first iff the policy says so (awaited-order test, `"none"` and `"focusFirst"` both ways, the client's
Tab uses the constant); `normalizeTarget({name})` → BAD_PARAMS "… use {text: …} or add role …"
(`locator.test.ts`). See finding 8 for the exact wording.

**S3.4 — met.**
- `index.test.ts` pins the value keys; the bundle's own export statement lists exactly
  `BridgeClient, BridgeError, ErrorCodes, Tab, connect, downloadToFile, formatNetwork, formatSnapshot`.
- `mod.BridgeError === shared.BridgeError` is tested (#83 item 3).
- `sdk/package.json` `exports["./format"]` is still there; `dependencies` are unchanged (`@bridge/shared`, `ws`).
- I ran `npx esbuild sdk/src/index.ts --bundle --platform=node --format=esm --packages=external --metafile=…` and listed the external imports from the metafile:
  `@bridge/shared node:child_process node:crypto node:fs node:fs/promises node:path node:url ws`. The
  `a3ac169` `index.ts` bundled the same way has the **identical** set (40.9 kb → 44.5 kb). So the main
  entry gains no runtime dependency.

**S3.5 — met. Pre-written outcome (1) applies:** "`spawnDaemon` inherits no pipe (node and npx parents);
the MUX-6 cause remains unmeasured". `spawn.ts` is unchanged. The npx half rests on my ad-hoc run only
(finding 3).
- Harness (`sdk/test/spawn-inherit.test.ts`): the child is `process.execPath child.mjs`, so there is no
  tsx layer. It imports `spawn.ts` through Node's type stripping and calls the real `spawnDaemon` on a
  temp stand-in `.mjs` that writes its pid and idles. The stand-in never binds a port and the run uses
  port 0, a dummy token, and no `BRIDGE_TOKEN`. The child's stdout is a pipe. The stand-in is killed by
  its recorded pid, and the harness polls until it is gone.
- Three runs, mine:
  ```
  [S3.5] inherit: {"eofAfterExitMs":null,"standInAlive":true,"eofAfterKill":true,...}   ×3
  [S3.5] default: {"eofAfterExitMs":-6 | -3 | -4,"standInAlive":true,...}
  Tests 2 passed (2)   ×3
  ```
  Check (A): EOF arrived 3–6 ms *before* the child's `exit`, with the stand-in alive. Control (B): no
  EOF within 2 s; EOF came after the kill.
- **The check can fail:** with `spawn.ts` changed to `stdio: "inherit"` in the worktree, (A) failed
  (`expected null not to be null`, both modes held the pipe), then I restored the file. **The control
  can fail:** with the control's override changed to `stdio: "ignore"`, (B) failed (`expected -4 to be
  null`), then I restored the file.
- **Leftovers:** a WMI scan for `node.exe` with "stand-in" in its command line found 0 before and 0
  after every run, mutation runs included.

**Extra — stale-Tab guard (#79, S3 half): met.**
- Each `Tab` stores the generation it was minted in. `#guard()` throws `TAB_UNKNOWN` with no call sent;
  the test asserts 0 frames on the new connection.
- The bump runs first in `handleClose`'s 4002 branch (`client.ts:522-523`), before `rejectAll` and
  before `establish`, so it lands before any queued continuation. Tested synchronously: a call issued in
  the same tick as the close.
- A non-4002 close does not bump the generation and does not reconnect. The path is unchanged; the
  existing `client.test.ts:245` covers 1006/1000/1001/4001, and mutations M11/M12 below are killed.

**Extra — `instanceof BridgeError`: met.** `errors.test.ts` checks the exported class against: connect
NOT_CONNECTED (no token), knock VERSION (no welcome), an unwrapped daemon error frame (TAB_HELD),
NO_CURSOR, BAD_PARAMS and TAB_UNKNOWN.

**Other brief items.**
- (B) is honoured. `grep -rn focusEmulation sdk/src` finds the word only in `policy.ts`'s comment, and
  every frame test asserts that no frame contains it. `mcp/` is untouched (`git status`).
- `grep -rn "console\." sdk/src` finds nothing, so the SDK logs nothing.
- CRLF: `git ls-files --eol` gives `i/lf w/lf` for `client.ts`, `index.ts` and `index.test.ts`, and
  `git diff --stat a3ac169 -- sdk/src/client.ts` shows `172 insertions(+)` only. With `autocrlf=true` a
  commit stores LF, so it is not a whole-file rewrite.

## Wire shapes against a3ac169 (and S2 in flight)

These match the base:
- `navigate {url}`, `back`, `forward`, `snapshot`.
- `screenshot {fullPage?, mode?}` → `{dataUrl}` (`perceive.ts:18-34`; `ScreenshotMode = "switch"|"cdp"`).
- `click`/`type`/`pressKey` with `trusted`; `type {text, submit}`; `hover`; `selectOption {values}`.
- `waitFor {text}|{seconds}|{networkIdle, idleMs}` (`wait.ts`).
- `evaluate {expression, timeoutMs}`; extension clamp [100, 60000].
- `networkRequests {filter, types, failedOnly, limit, includeHeaders}` → `{entries}`.
- `networkRequests {id}` with no `tab`: the daemon strips `tab` for id lookups (`intercept.ts`).
- `networkClear` → `{cleared}`; `focusTab`; `closeTab {tab}` (tab path, `intercept.ts:336-371`).
- `tabs.claim {tab}|{active:true}` → `{tab}`; `tabs.release {tab}` → `{ok:true}` (`intercept.ts:571-585`).
- `newTab` → `{...result, tab}` (`intercept.ts:504`); `listTabs` → `{tabs:[{…, tab, owner?, current?}]}`.

These match S2's in-flight files:
- `ref | locator` keys (`handlers/target.ts`).
- `locate {locator}` → `{ref, role, name}` (`handlers/locate.ts`); `locate` added to `TAB_METHODS`.
- `waitFor {locator, state, timeoutMs}`: S2 defaults to 10 s, caps at 60 s and rejects a bad state;
  the SDK's call timeout is `timeoutMs + 5 s`.
- `evaluate {asRef:true}` → `{…envelope, ref}` (`handlers/evaluate.ts`).

No mismatch, except finding 1.

Call timeouts against the daemon's [100, 600000] bound and F22:
- `waitFor {seconds: 45}` → 50 000; `{locator, timeoutMs: 20000}` → 25 000; `text`/`networkIdle` →
  15 000 (the extension's ceiling is 10 s).
- `evaluate` → t + 5 000.
- The daemon and `clientTimeoutMs` both clamp, so an oversized value is harmless.

`tabs()` maps `current`, never `active`. That follows the 0.4 note "Corrected 2026-10-23 (Step 7
propagator)" (#43), so it is correct.

`BridgeClient.close()` keeps its Step 6 meaning, and the cursor tab is closed with
`client.tab().close()`. That is reasonable against 0.4's note "Corrected 2026-10-22" (Step 6 ships
`close()`). It needs the session agent to record the builder's proposed decision (finding 9).

## Mutation runs (each restored; `diff -r` against a backup confirmed the restore)

All on `npx vitest run sdk/` (285 tests):

| Mutation | Failed |
|---|---|
| M1 no generation bump | 4 |
| M2 no cursor clear on 4002 | 2 |
| M3 stale guard off | 3 |
| M4 policy branch ignored / M4b always focus on trusted / M4c constant `"none"` | 5 / 1 / 5 |
| M5 `tabs()` also reads `active` | 1 |
| M6 waitFor without call timeout / M6b seconds slack wrong | 5 / 1 |
| M7 friendly `{name}` text removed | 3 |
| M8 extra value export in index.ts | 1 |
| M9a navigate param · b screenshot drops mode · c click method · d network method · e network {id} adds tab · f release method · g close method · h claim method · i evaluate slack 0 · j no `tab` key · k evaluateRef no asRef · l selectOption key · m locate key · n newTab drops active · o networkClear method | 1 · 1 · 7 · 3 · 1 · 1 · 1 · 69 · 3 · 35 · 1 · 1 · 1 · 1 · 2 |
| M10 `adopt()` without the generation check | 1 |
| M11 non-4002 close bumps generation / M12 non-4002 close clears cursor | 1 / 1 |
| M13 NO_CURSOR text changed | 21 |
| M14 `screenshot({path})` writes nothing | 1 |
| **M15 `download` without the stale guard** | **0 (survived)** |
| **M16 `network({id})` without the stale guard** | **0 (survived)** |

The builder's M1–M9 figures reproduce exactly.

## Findings

1. **MAJOR: `scroll({direction: "left" | "right"})` silently scrolls down.**
   - Where: `sdk/src/tab.ts:182` (type `"up" | "down" | "left" | "right"`) and the mirror in
     `sdk/src/client.ts` (`scroll(options?: {target?; direction?: "up"|"down"|"left"|"right"})`).
   - Evidence: the content script implements only up/down. At `a3ac169`, `extension/src/content/actions.ts:57-64`
     reads `const delta = direction === "up" ? -window.innerHeight : window.innerHeight;
     window.scrollBy({ top: delta * 0.9 })`, so "left" and "right" scroll the page *down* by 90 % of a
     viewport and answer `{ok:true}`. S2's in-flight diff does not touch `scrollRef`. The MCP restricts
     to `z.enum(["up","down"])` (`mcp/src/tools/registry.ts:223`). Phase doc 0.4 names no directions.
   - Why it matters: the public typed surface promises an action the extension does not implement, and
     the wrong action runs silently on the user's real browser.
   - Fix: narrow the type to `"up" | "down"` in both places, and reject other values locally with
     BAD_PARAMS. Also add a doc line that `direction` is ignored when `target` is given (the extension
     scrolls the target into view).

2. **MINOR: the stale guard on the two tab-less methods is untested.**
   - Where: `sdk/src/tab.ts:239` (`network({id})`) and `:257` (`download`).
   - Evidence: removing either `this.#guard()` leaves all 285 tests green (M15, M16). The builder's
     deviation 6 says these paths are covered by the guard, but no test pins it.
   - Fix: one 4002 test per path: no frame, `TAB_UNKNOWN`.

3. **MINOR: the pass outcome claims npx parents, but only the node parent is in the test.**
   - Where: `sdk/test/spawn-inherit.test.ts`; `S3-builder.md` § S3.5.
   - Evidence: #85 item 2's outcome text says "node **and npx** parents". The builder ran only the node
     parent and says so.
   - My ad-hoc run (one trial each, scratch only, not in the suite): `npx tsx child.mjs | cat` with the
     real `spawnDaemon` returned in 1380 ms with the stand-in alive. The inheriting control held the
     pipe until my 8 s `timeout` (rc 124). Both stand-ins were killed by pid; leftover count 0.
   - Fix: the stage report records this measurement, or adds an npx-parent case. Otherwise the outcome
     should say "node parent".

4. **MINOR: `evaluateRef` misdiagnoses a stale extension.**
   - Where: `sdk/src/tab.ts:223-227`.
   - Evidence: an extension without S2 ignores `asRef` and answers `{kind:"node", …}` with no `ref`. The
     SDK then says `the value is not an Element (kind "node")`, which is false for `document.body`.
     S2's extension itself throws BAD_PARAMS/REF_STALE for non-elements, so this branch is reached
     mainly in the stale case.
   - Fix: when `kind === "node"` and there is no `ref`, name the likely cause ("the extension may
     predate asRef — reload it").

5. **MINOR: the policy comment's "untrusted actions never focus: they work on a background tab" is not
   true in one case, and the gap is not documented.**
   - Where: `sdk/src/policy.ts:77`.
   - Evidence: an untrusted `click`/`type` whose content-script path throws escalates inside the
     extension to CDP trusted input (`extension/src/handlers/actions.ts:30-46` at `a3ac169`, kept by
     S2). On a background tab that answers `ok` and does nothing (BG-1/BG-2). Under (B) the SDK neither
     focuses nor sees the escalation. #78 item 4 notes the same blindness for (A)/(C).
   - Fix: document the residual case in `policy.ts` and the SDK docs; a later stage may make the
     extension report the escalation. No code change is required in S3.

6. **NIT: a caller-supplied `tab` overrides the Tab's handle.**
   - Where: `sdk/src/tab.ts:121`.
   - Evidence: `defined({ tab: this.handle, ...params })` puts the user's params after `tab`. A
     loosely typed `network({…, tab: "all"} as any)` or `waitFor({...})` replaces the handle. The
     daemon's lease check still applies.
   - Fix: `defined({ ...params, tab: this.handle })`.

7. **NIT: values the extension clamps pass the SDK silently.**
   - Where: `sdk/src/tab.ts:83-87`, `:210`.
   - Evidence: these are clamped without a word in the SDK docs:
     - `waitFor {seconds}` above 60 (`wait.ts:17`);
     - `evaluate timeoutMs` outside [100, 60000] (`evaluate.ts:12-17`);
     - the locator arm's `timeoutMs` above 60 000 (S2);
     - `idleMs` outside [100, 10000].

     Separately, `seconds: NaN` becomes call `timeoutMs: NaN`, which JSON sends as `null`, which the
     daemon rejects with "request timeoutMs must be a finite number": a confusing message.
   - Fix: document the ceilings in the JSDoc and validate `seconds` locally.

8. **NIT: the friendly text differs from the spec's wording.**
   - Where: `sdk/src/locator.ts:26`.
   - Evidence: the spec says "use {text} or add role"; the code says "use {text: …} or add role (e.g.
     {role: "button", name: …})". The substring `use {text} or add role` does not occur. It meets the
     intent, and the test pins the built wording.
   - Fix: none needed, or align the text.

9. **NIT: three proposed decisions in `S3-builder.md` are not yet recorded.**
   - They are: `close` not mirrored on the client; the cursor not cleared by `release()`/`close()`/
     `tabGone`; the `adopt()` race → `TAB_UNKNOWN`.
   - The second makes `client.release()` followed by `client.click()` reach the daemon with a
     released handle (TAB_GONE/TAB_HELD, or success if nobody holds it, since the daemon's lease rules
     apply). It is consistent with the literal 0.4 rule.
   - Fix: the session agent rules on them and records them in `decisions.md`.

10. **NIT, unmeasured: the 15 s `waitFor {text}` call bound may be short on a long-hidden tab.**
    - Where: `sdk/src/tab.ts:86`.
    - Evidence: the bound assumes the page-side 10 s loop (`wait.ts:30`) keeps its deadline. On a tab
      hidden for minutes, Chrome may throttle that loop's chained `setTimeout`s hard (S2 moved only the
      locator arm to the service worker for this reason; Run 8 BG-4 saw 3746 ms for a 2 s text). This
      is a risk, not a measurement.
    - Fix: none for S3; note it for the E2E wave.

## Verdict

**FAIL**: one MAJOR finding (1, `scroll` left/right silently scrolls down). Every exit check, S3.1–S3.5,
and both extras are met. Finding 1 is a two-line type narrowing plus a local BAD_PARAMS. With it fixed,
and preferably findings 2 and 3, the stage would be PASS-with-notes.

## Re-check round 1 (after `S3-fixer1.md`)

Verifier: Claude Opus 5.5, 2026-10-23. Scope: findings 1, 2, 4, 5, 6, 7, 8. Findings 3, 9 and 10 are
handled in the stage report and were not re-checked here.

**Set-up.**
- A fresh clean worktree at `a3ac169`, then `npm ci`.
- Only the 10 S3 `sdk/` files were copied in: `git diff a3ac169 -- sdk/` applied, plus the 7 untracked
  files. `git status --short` showed exactly those 10 paths.
- The worktree was removed afterwards (`rm -rf` + `git worktree prune`). A scan found 0 leftover
  stand-in processes.

| | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1229 passed, 70 files**: +6 on round 0's 1223/70, and +94 on the baseline 1135/66 |
| `npm run build` | exit 0 |
| Value exports | The esbuild bundle of `sdk/src/index.ts` (packages external) exports exactly `BridgeClient, BridgeError, ErrorCodes, Tab, connect, downloadToFile, formatNetwork, formatSnapshot`. `ScrollOptions` was added as a type only. The external imports are unchanged: `@bridge/shared node:child_process node:crypto node:fs node:fs/promises node:path node:url ws`. |
| Logging and `focusEmulation` | `grep -rn "console\.\|focusEmulation" sdk/src`: no hits outside `policy.ts`'s comment |

**Mutations (each restored; `diff -r` against a backup reported "RESTORED OK").** All ran on
`npx vitest run sdk/` (291 tests):

| Mutation | Failed |
|---|---|
| A: scroll direction check off | 1 |
| B: `network({id})` guard removed (round 0's M16) | 1 |
| C: `download` guard removed (round 0's M15) | 1 |
| D: `evaluateRef` node branch off | 1 |
| E: `{tab, ...params}` order restored | 1 |
| F: `seconds` check off | 1 |
| G: old `{text: …}` wording restored | 2 |
| H (mine): `client.scroll` no longer delegates to `Tab.scroll` | 2 |

The fixer's A–G results reproduce.

**Per finding.**
1. **MAJOR, `scroll` left/right: resolved.**
   - Code: `ScrollOptions.direction` is `"up" | "down"`, used by both `Tab.scroll` and `BridgeClient.scroll`.
     `Tab.scroll` throws BAD_PARAMS for any other value before `normalizeTarget` and before any call
     (`tab.ts:197-206`).
   - Docs: the JSDoc says `direction` is ignored when a `target` is given.
   - Test: covers `"left"`, `"right"`, `"UP"` and `""` on the Tab, and `"left"` through the client. No
     frame is sent, and `"down"` still sends. It is killed by A and H.
2. **MINOR, guard on the tab-less paths: resolved.** Two 4002 tests (`TAB_UNKNOWN`, 0 frames on the
   new connection) kill B and C, which are round 0's surviving M16 and M15.
4. **MINOR, `evaluateRef` with a stale extension: resolved.** A `kind:"node"` answer with no `ref` now
   names an extension older than Step 8 S2 and says to reload it. Other kinds keep "not an Element".
   Both messages are tested, and D kills the test.
5. **MINOR, policy comment: resolved (comment only).** `policy.ts` now names the case the SDK cannot
   see:
   - the extension's own escalation of a failed untrusted `click`/`type` to CDP input;
   - that escalation answers ok and does nothing on a background tab (BG-1/BG-2);
   - the remedy: `trusted: true` or `focus()`.
6. **NIT, `tab` override: resolved.** `#send` builds `defined({ ...params, tab: this.handle })`
   (`tab.ts:131`). A test sends `tab: "T9"` through `network` and `waitFor` and sees `"T3"` on the
   wire. E kills it.
7. **NIT, clamps and `seconds: NaN`: resolved.**
   - Code: `waitFor` rejects a non-finite or negative `seconds` locally with BAD_PARAMS
     (`tab.ts:232-237`).
   - Docs: the `waitFor` JSDoc lists `seconds` ≤ 60, `{text}` giving up at 10 s, the locator
     `timeoutMs` default 10 000 with ceiling 60 000, and `idleMs` clamped to [100, 10 000]. The
     `evaluate` JSDoc lists `timeoutMs` [100, 60 000]. These match the extension sources read in round
     0 and S2's `wait.ts`.
   - Test: covers NaN, Infinity and -1, and that `seconds: 0` still sends with a 5 000 ms call
     timeout. F kills it.
8. **NIT, wording: resolved.**
   - The message reads `… needs "role" — use {text} or add role (e.g. …)` (`locator.ts:26`).
   - The locator test and the tab `click({name})` test both assert the phrase `use {text} or add role`.
     G kills both.

**Still open, outside this re-check:** 3 (in the stage report as one ad-hoc npx trial), 9 (the
session agent's decisions), 10 (unmeasured, noted for the E2E wave).

**Updated verdict: PASS-with-notes.** The MAJOR finding is resolved, and every re-checked finding is
resolved and pinned by a test that fails without its fix. The only items still open are 3, 9 and 10,
which are notes.
