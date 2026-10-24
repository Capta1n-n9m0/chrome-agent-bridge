# S3 verifier report — Daemon relay, SDK and MCP (Step 9)

2026-10-24 · independent verifier, Claude Opus 5.5 (`claude-opus-5-5`) · tree: HEAD `a3ec4f5` plus S3's
uncommitted change (8 source files, 5 new test files) and S1's parallel work in `extension/` (not audited
here). Nothing edited but this file; no daemon started; no port but 0 bound; Chrome not touched. The builder
report (`S3-builder.md`) was treated as claims.

## 1. Checks run

| Check | Command | Result |
|---|---|---|
| Per-package typecheck | `npx tsc --noEmit -p <pkg>/tsconfig.json` | `shared 0 · daemon 0 · sdk 0 · mcp 0 · extension 0` (extension: information only) |
| Lane tests, after | `npx vitest run daemon sdk mcp` | `Test Files 49 passed (49) · Tests 843 passed (843)` |
| Lane tests, before (S3's 8 source files at `HEAD`, new files excluded) | `git checkout HEAD -- <8 files>; npx vitest run daemon sdk mcp --exclude "**/safety*.test.ts"` | `Test Files 44 passed (44) · Tests 771 passed (771)` → **+72 tests / +5 files**, matches the builder |
| Full suite | `npm test` | `Test Files 96 passed (96) · Tests 2328 passed (2328)` (the builder saw 2302; the extra 26 are S1's tests landing meanwhile — the S3 lane count is unchanged at 843) |
| Build | `npm run build` | `build=0`; `git status --short` identical before/after (`NO-TRACKED-CHANGE`) |
| Existing tests untouched | `git diff --stat -- '*.test.ts'` | empty: no tracked test file modified |
| Restore after the revert probe | `git diff -- daemon/src sdk/src mcp/src \| sha256sum` before and after; `git status --short \| diff` | `64b88436…82d3` both times; `STATUS-SAME` |

## 2. Exit checks

**S3.1 — PASS.** `sdk/test/safety.test.ts` "ATTACH_CODES holds neither code…" and the two "a Tab call refused
… makes no attach call"; `git diff -U0 sdk/src/error.ts | grep ATTACH` shows only a comment line — the frozen
array is unchanged; Step 8's `failure-report.test.ts` "ATTACH_CODES is exactly the seven codes" passes
unmodified (8 files incl. it: `266 passed`).

**S3.2 — PASS, with Finding 1.** `mcp/test/safety.test.ts:60-83`: the four armed × JS states, `null`, field
absent (older daemon) and malformed → "not reported"; blocked counts 0 ("0 blocked sites"), 1 ("1 blocked
site"), 2 ("2 blocked sites"); each case also pins the first text item line for line. The MCP line by scope:
`:177` (15 tool calls, `{scope:"all"}`), `:185` (`browser_evaluate`, `{scope:"evaluate"}`, asserted to differ),
`:192` (no scope → all). The SDK side: `sdk/test/safety.test.ts:100-139` tests `safetyRefusalLine` and
`renderReport` by scope. See Finding 1 on what "the SDK `report()`" reaches in practice.

**S3.3 (S3's half, #147) — PASS.**
```
$ grep -niE "arm|disarm|setSafety|block" daemon/src/methods.ts; echo "exit=$?"
exit=1
$ grep -oE '^\s*"browser_[a-z_]+",?$' mcp/src/tools/registry.ts | tr -d ' ",' > tools.txt; wc -l < tools.txt
23
$ grep -niE "arm|disarm|setSafety|block" tools.txt; echo "exit=$?"
exit=1
$ git show a3ec4f5:mcp/src/tools/registry.ts | grep -oE … | diff - tools.txt && echo TOOLS-SAME
TOOLS-SAME
$ git diff --quiet HEAD -- daemon/src/methods.ts daemon/src/route.ts shared/ && echo unchanged
methods.ts route.ts shared unchanged
```
`daemon/test/safety-surface.test.ts` diffs each table against hard-coded Step 8 lists; on the reverted tree it
passes (it is an invariant guard), and the builder showed it failing on a `"safetyToggle"` mutation (not
re-run by me). Independent search for a state-changing path: the only new outbound calls in the diff are
`conn.call("listTabs", …)` (daemon → extension, read-only) and `this.call("daemon.status")` (SDK, read-only):
```
$ git diff -U0 -- daemon/src sdk/src mcp/src | grep '^+' | grep -nE 'call\(|send\(|forward\(|"[a-zA-Z]+\.[a-zA-Z]+"'
90:+      result = await conn.call("listTabs", undefined, …
253:+    const result = (await this.call("daemon.status")) …
$ grep -rnE "armed|evaluate:|blockedCount" daemon/src sdk/src mcp/src | … | grep -E "call\(|send|forward"   → exit=1
```
`safetyState` is accepted only on the extension socket (`wsHost.ts:300-301` → `tabs.extensionEvent`); a client
frame never reaches it. No client→daemon or daemon→extension method that changes the safety state exists.

## 3. New tests fail without the change

The 8 S3 source files were copied to the scratchpad, reset to `HEAD`, the five new files run, the files copied
back (hash and `git status` identical, §1):
```
Test Files  4 failed | 1 passed (5)
     Tests  46 failed | 8 passed (54)
 FAIL  sdk/test/safety.test.ts [ sdk/test/safety.test.ts ]   (import: no safetyRefusalLine)
 ✓ daemon/test/safety-surface.test.ts (2 tests)
```
Matches the builder's claim. The 8 passes are invariant guards (S3.3 tables and tool list, "no Safety line with
the extension not connected", "any other error still throws", "a null state redacts nothing", "listTabs replies
… add no title/url back"). The SDK file's 18 tests did not run on baseline (import failure); its F25/F26 tests
pin behaviour Step 8 already had, which is what F25/F26 ask (they are regression pins, not new behaviour).

## 4. Cross-package test (`mcp/test/safety-cross.test.ts`) — genuine

Read in full. Real `WsHost` + `Bridge` on `127.0.0.1` port 0 (`:163-164`), real `ws`, the real SDK `connect()`
(spawn stubbed, in-process daemon), a `BridgeLink` + `TabCursor` + the 23 registered MCP tools, a raw `ws` v2
client, against a fake proto:2 extension that sends `safetyState`, hidden rows, `tabRemoved {hidden}`,
`tabCreated` and `DISARMED {scope}` refusals. It asserts: `client.safety()` null → state; the `safetyStatus`
event at the SDK (3 deliveries, no null one); `browser_status` item 2 in three states; daemon.status rows with no
`url` while disarmed; `client.tabs()` hidden rows `title:"" url:"" hidden:"disarmed"`; MCP `Active tab:` and
`browser_list_tabs` labels with no `undefined`; `browser_snapshot` → the one-line `isError` result; `tabGone`
equal to `{tab}` only although the daemon had cached `OTHER_URL` while armed (discriminating — without the
redaction `sendGone` copies the cache); the raw client answering `listTabs` after two broadcasts (P3); the
change-triggered `listTabs` (the `waitUntil` requires exactly `n + 1` calls, so it fails if the refresh is
removed) clearing tab 101's url while tab 103's is recorded; `leaseGranted.url === ""` in `< 1000 ms`
(discriminating: without the F40 stop, a hidden row never yields a url and the fill runs to 2000 ms); null after
the socket closes; the exact four `safety state:` log lines; an `afterEach` hygiene check over every log line
(no `://`, host, title fragment or token). The daemon unit test of F40 uses a fake clock (0 ms, one listTabs).

## 5. Findings

**1. MINOR — S3.2's "SDK `report()` … differs by scope" is reached by no public path; the branch in
`renderReport` is dead in practice.** `sdk/src/error.ts:374-377` returns the safety line from `renderReport`,
but `report` is only ever set by `enrich`, which `attachContext` runs only for attach-set codes
(`sdk/src/error.ts:174`: `if (!isAttachCode(error.code) || …) return;`), and the input's `code` is the error's
own. So a script's `DISARMED` error has no `report()` at all — pinned by Step 8's
`sdk/test/failure-report.test.ts:193-210` (for every `ErrorCodes` key outside the seven: `report` must not be
an own property), which the builder rightly did not edit. The tests (`sdk/test/safety.test.ts:132`) call
`renderReport` directly. This is a real spec discrepancy between #133/#141 ("the SDK's `report()` differ by
scope") and Step 8's attach-set contract, which the builder disclosed (Deviation 2, Proposed decision 7) rather
than hid. The script-side meaning still reaches `err.message` from the extension, whose message #133 also
requires to differ by scope (S1/S2a's to test). Suggested fix: none in code; the step agent records it under
the SPEC-DISCREPANCY protocol as contract-level (Open decisions), and either drops the unreachable branch from
`renderReport` or keeps it explicitly as the wording source. Not a failed exit check: both renderings are tested
by scope, and the only reading that would make `report()` exist breaks a binding Step 8 contract.

**2. MINOR — `@bridge/sdk/report` gains a value (`safetyRefusalLine`): an SDK exported-surface change that the
ESCALATION list says to stop and escalate, not decide.** `sdk/src/report.ts:5-6`. The brief froze only the main
entry's eight values, but the subpath is a published export (`sdk/package.json exports["./report"]`) and
"the SDK's exported surface" is on the ESCALATION list verbatim. The builder listed it as Proposed decision 7
"for user review", so it is not silent, and it is undoable and additive. Suggested fix: the step agent escalates
it to the session agent as contract-level (Open decisions); if refused, the MCP can hold its own copy of the
three lines (losing the single wording) with no surface change.

**3. MINOR — `browser_status` shows no Safety line while the extension is disconnected, against #132's literal
"`Safety: not reported (reload the extension)` when null".** `mcp/src/tools/registry.ts:388-393` returns before
`done()` when `extensionConnected` is false, and `mcp/test/safety.test.ts:85-90` pins that. With the extension
gone `daemon.status.safety` is null, so #132 as written prints the "not reported" line. The builder's reason
(the advice "reload the extension" misleads when Chrome is simply closed) is plausible and the output is not
less safe, but it changes what #132 says the agent sees. Disclosed in Proposed decision 5. Suggested fix: the
step agent lists it with decision 5 for the user; no code change unless the user wants the literal reading.

**4. MINOR — the Safety line is a second text content item, unmeasured in Claude Code.**
`mcp/src/tools/registry.ts:396-401`. Necessary to keep Step 8's pinned `browser_status` text unedited (verified:
`tools.test.ts` and `s5-cross.test.ts` pass unmodified and no tracked test changed), and consistent with #132's
"browser_status prints …" in substance. But no run has shown that Claude Code passes a second text item of a
non-error result to the model (S6b measured `[text, image]` only). Suggested fix: S4 must read the Safety line
from a live headless transcript (a pre-registered row), as the builder proposes.

**5. NIT — a stale `listTabs` reply can repopulate a just-cleared cache.** `daemon/src/intercept.ts:281-286`
(`refreshAfterSafety`) and every other `record()` caller: replies are recorded in arrival order, not request
order. If a `listTabs` the extension evaluated before a pattern was added is answered after the post-change
refresh (the extension's handlers are async), `record` notes the now-blocked tab's url again, and `daemon.status`
serves it while armed until the next safety change. Requires an out-of-order reply on one socket; not observed,
found by reading. Suggested fix (optional): discard a `record()` of a reply requested before the latest safety
change (a generation counter), or record later.

**6. NIT — the window between a new extension hello and its first `safetyState`.** `intercept.ts:186` resets
`safety` to null but keeps `lastReceived`; if the human disarmed while the socket was down and the last state
received was armed, `daemon.status` serves cached (pre-disarm) urls until the new socket reports (milliseconds;
the resync's rows are hidden and skipped, so nothing new is learned). Conservative alternative: redact while
`safety === null` after a disarm was ever seen, or until the first report of a new socket. Informational.

**7. NIT — "not reported (reload the extension)" is printed for an older daemon too** (`safety` absent,
`mcp/test/safety.test.ts:66`), where the remedy is a daemon restart, not an extension reload. The build-id
handover replaces such a daemon on the next connect, so the case is short-lived.

No CRITICAL or MAJOR finding.

## 6. Attack summary against #134 / F2 / F40 / F41 (beyond the findings)

- Every daemon output that carried a cached url/title was found and checked: `status()` rows (`:434`),
  `sendGone` (`:412`, covers `tabGone`, retire-all and the opener rule's gone path), `TAB_GONE` data
  (`:527-529`), `leaseGranted` (`:388`). `listTabs` replies (`:597-607`) only add `tab`/`owner` to the
  extension's rows — nothing from the cache. `tabs.claim` returns `{tab}`; `TAB_HELD` `{owner, since}`. Error
  messages and log lines carry handles and counts only. The MCP prints no `tabGone` data
  (`grep -rnE "tabGone|leaseGranted" mcp/src` empty); every MCP title/url print goes through `pageOf`,
  `quotedPageOf` or `hiddenLabel` (`grep -nE "\.title|\.url\b" registry.ts`: lines 141, 146, 417 only).
- `"blocked"` row → `forgetPage` (clears); `"disarmed"` row → skipped (cache kept); `tabRemoved {hidden:
  "blocked"}` → cleared before `remove`. Daemon tests `:394`, `:408`, `:425` cover each.
- The change-triggered `listTabs` runs only from `onSafetyState` on the current socket, only for a proto
  connection, once per real change (identical repeats return early, test `:240`), never retried, its failure
  logged content-free only if the socket is still current (`:281-283`); `record` emits no event, so no loop.
- Unchanged before any report and while armed: `redacting()` is false with `lastReceived` null or armed; no row
  is hidden then; every pre-existing test passes unmodified (lane 771 → 843 with all 771 still passing).

## 7. Log hygiene

`git diff -- daemon/src sdk/src mcp/src | grep -E '^\+.*(log\?\.\(|deps\.log|console\.)'` → four new lines:
`"safety state: not reported (extension disconnected)"`, `safetyLogLine(state)`
(`armed=<bool> evaluate=<bool> blocked=<int>` from fields `isSafetyState` guarantees are booleans and a safe
integer, copied field by field), `"safety state: listTabs after the change failed"`, `"safety state: malformed
event dropped"`. No URL, title, pattern or token can enter them. Both the daemon test and the cross test assert
it over every captured line.

## 8. Step 8 contracts C1–C7

Unmodified existing tests pass: `failure-report.test.ts` (C1 — attach set exactly the seven, frozen),
`tabs.test.ts` (C2 codeless → INTERNAL, C6 TAB_HELD), `handle-mark.test.ts` (C4), `lock.test.ts` (C7),
`cursor.test.ts` / `tools.test.ts` / `s5-cross.test.ts` (C5), `multi-actor.test.ts`: `8 files, 266 passed`;
`extension/test/session-marker.test.ts` (C3): `19 passed`. `methods.ts`, `route.ts` and `shared/` are unchanged.

## 9. The builder's deviations and proposed decisions

| # | Judgement |
|---|---|
| Dev 1 / PD 5 (second text item; none when disconnected) | Second item: sound and the only placement that keeps Step 8's pinned text — Finding 4 (measure in S4). No line when disconnected: departs from #132's wording — Finding 3. Contract-level; for the user. |
| Dev 2 / PD 7 (no `report` property; `safetyRefusalLine` on the subpath) | The Step 8 contract makes it unavoidable — Finding 1; the subpath value is an exported-surface change needing escalation — Finding 2. |
| Dev 3 (no SDK row renderer; MCP renders labels) | Correct: the SDK has no `listTabs` renderer (`formatSnapshot`/`formatNetwork`/`report()` print no tab row); `TabInfo.hidden` is #148's SDK half. |
| Dev 4 / PD 2 (redaction outlives the socket) | Sound and conservative: the cache still holds pre-disarm urls and a reload's hello comes up to 2 s later (CLAUDE.md); nothing changes while armed or before any report (test `:372`, `:361`). Contract-level; for the user. See Finding 6 for the reverse window. |
| PD 1 (no null `safetyStatus`) | Follows from S0's `SafetyStatusParams = SafetyState`; the reset is visible via `daemon.status` and `extensionStatus`. Contract-level (what an event carries) — correctly marked. |
| PD 3 (hello resets to null) | Sound; matches "the state belongs to the socket". |
| PD 4 (`leaseGranted.url ""` while disarmed) | Stricter than #134's letter, consistent with its intent; contract-level, correctly marked. |
| PD 6 (wording) | Build-level; the three lines say stop/ask/do not retry, name no URL or pattern; `"evaluate"` says other calls work (#133). |
| PD 8 (type exports) | Allowed by the brief; correctly marked for review. |
| PD 9 (one wrapper over all tools) | Sound: verified the wrapper sees the error because `attempt`/`onTab` rethrow non-attach codes (`registry.ts` `failureReport` returns null for them); tested over 15 tools plus "any other error still throws". |
| PD 10 (blocked clears, disarmed keeps) | #134 as written. |
| F25 / F26 tests | Genuine: F25 answers all three attach calls `DISARMED`, asserts `attachErrors` with the three lines, `screenshotPath` undefined and an empty failures dir; F26 asserts the sent methods are exactly `["tabs.claim","focusTab"]` and the error is `focusTab`'s. |

Nothing contract-level was decided silently: every contract-level choice appears in the builder's §6 marked for
user review; Findings 1–3 ask the step agent to carry them up as the protocol requires.

## 10. Verdict

**PASS-with-notes** — S3.1, S3.2, S3.3 (S3's half) pass; lane 771/44 → 843/49 (+72/+5), full suite 2328/96 all
passing, build clean with no tracked change, no existing test edited, new tests fail without the change (46 of
54 run; 8 are invariant guards; the SDK file fails at import). Four MINOR findings (1–4: escalations and one
S4 measurement owed by the step agent, no code change required) and three NITs.
