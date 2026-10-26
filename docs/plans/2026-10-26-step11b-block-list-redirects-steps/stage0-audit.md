# Step 11b — Stage 0 spec audit (the four lenses, the contracts, S0F's how, S1's cases)

**Date:** 2026-10-26 · **Role:** builder (Stage-0 auditor), **Opus 5.5, medium** · **Tree:** HEAD `9ddaa36`; the only
working-tree change is another agent's `journal.md` line (`git diff --stat HEAD`: 1 file, 1 insertion), so product
code = HEAD. Port 0 only; no daemon on 9234, no Chrome touched. Scratch scripts (`counts.ts`, `s1cases.ts`,
`probes.ts`) and their outputs are in the session scratchpad, never in the repo. The DNR runtime facts are the sibling
agent's (#294); where an attack depends on one, it says so (§7 lists them).

S1's case table (104 rows) is in [`stage0-s1-cases.md`](stage0-s1-cases.md).

## 1. Counts (lens b), recomputed at HEAD

| Count | Value | Command → output |
|---|---|---|
| router methods | **27** | `grep -o 'router\.on("[A-Za-z]*"' extension/src/sw.ts \| sort -u \| wc -l` → `27`; probe `router swScan=27 nonLiteral=0 classified=27 equal=true` |
| codes / on the wire | **27 / 26** | probe over `shared/src/codes.ts` → `codes daemon=9 extension=17 sdk=1 total=27 wire=26` |
| MCP tools | **24** | probe (quoted `browser_*` in `mcp/src/tools/registry.ts`) → `tools quotedNames=24`; `node scripts/doc-check.mjs` → `tools: 24 · router methods: 27 · codes: 27` |
| `npm test` | **3811 tests / 154 files** | `npx vitest run` (exit 0) → `Test Files 154 passed (154)` · `Tests 3811 passed (3811)` |
| log-scan allowlist | **54** (extension 15, daemon 33, sdk 0, mcp 6) | probe over `LOG_ALLOWLIST` → `logAllowlist total=54 {"extension":15,"daemon":33,"mcp":6}` |

All agree with the phase doc and the root `CLAUDE.md`. `doc-check` also lists `safety-dnr.ts`, `safety-dnr-keeper.ts`
and `recipes/tsconfig.s11b.json` as not existing yet (planned, expected). §4.24 is free: `grep -n "4\.24"
docs/e2e-test-plan.md` → no hit; §4.23 (line 1447) is the last §4 block before §5 (line 1552).

## 2. Step 9's and Step 11's contracts, re-run on port 0

Every socket test in these files binds port 0 (`WsHost(..., { port: 0, ... })`, e.g. `daemon/test/safety.test.ts:184`,
`extension/test/log-sentinel.test.ts:239`, `mcp/test/safety-cross.test.ts:163`, `mcp/test/s4-upload-cross.test.ts:134`).

- **Step 9** (the gate, the method table and its `sw.ts` scan, `GatedRouter`, redaction, the state store, writers, the
  daemon relay and redaction, SDK/MCP safety surface, the log scan and sentinel, the manifest pin, `multi-actor`):
  `npx vitest run daemon/test/safety.test.ts daemon/test/safety-surface.test.ts extension/test/{badge,badge-stored-read,
  gated-router,log-scan,log-sentinel,manifest,options-model,s2a-actions,s2a-fixer1,s2a-handlers,s2a-pure,safety-call,
  safety-debugger,safety-gate,safety-match,safety-match-more,safety-network,safety-rearm-failure,safety-redact,
  safety-state,safety-static,safety-writers,sw-action,sw-static}.test.ts mcp/test/safety.test.ts
  mcp/test/safety-cross.test.ts mcp/test/multi-actor.test.ts sdk/test/safety.test.ts shared/test/codes.test.ts
  shared/test/protocol-step9.test.ts` → **`Test Files 32 passed (32)` · `Tests 1059 passed (1059)`**, exit 0.
- **Step 11** (`uploadFiles` class and folder rule, `file:` refusal, own-refusal marker, closure-free sources, the
  options model, the handler, the daemon method table, SDK upload, the MCP tool, the #214 baseline):
  `npx vitest run daemon/test/methods.test.ts daemon/test/s2-upload-methods.test.ts daemon/test/tabs.test.ts
  extension/test/{s1-own-refusals,s2-upload-gate,s3-closure-free,s3-options-upload,s3-upload-handler,s3-upload-target,
  upload-paths}.test.ts mcp/test/s2-focus-first.test.ts mcp/test/s4-upload-cross.test.ts mcp/test/s4-upload-tool.test.ts
  mcp/test/tools.test.ts sdk/test/s11-upload.test.ts shared/test/protocol-step11.test.ts` → **`Test Files 16 passed
  (16)` · `Tests 499 passed (499)`**, exit 0.

All held. Gate behaviour the step depends on, executed (`probes.ts`, list `localhost:8081`): `newTab post, own=8083:
allow`; `navigate post, tab.url=http://localhost:8081/…: DOMAIN_BLOCKED "This tab shows a site on the user's block
list…"`; `navigate post, tab.url=chrome-error://chromewebdata/: allow`; `navigate post, tab.url=http://localhost:8083/…:
allow`; `downloadStart effect, finalUrl=8081: DOMAIN_BLOCKED "That address is on the user's block list…"`.

## 3. Today's `newTab` answer when its URL redirects onto a blocked host (0.6 asks for it)

Read from code, and the gate half executed (§2): the receipt and `effect()` test only the call's own URL
(`safety-call.ts:188-189`; allowed, it is the 8083 URL); `chrome.tabs.create` then `waitForLoad`
(`extension/src/handlers/tabs.ts:101-107`) resolves on `status: "complete"` (`extension/src/tabs.ts:299-314`); the
post-check of class `newTab` is the state only (`safety.ts:327-328`, probe `allow`); `GatedRouter.handle` returns the
result (`router.ts`, `JSON.stringify({ id, result })`); the daemon mints the handle and adds it
(`daemon/src/intercept.ts:627-636`). **Today's answer: success, `{ "id": <Chrome tab id>, "tab": "T<n>" }`, the tab
leased to the caller ("opened") and showing the blocked page** (SDK: a `Tab`; MCP `browser_tab_new`: its success text).
If the page never reaches `complete`, the answer is `INTERNAL "Timed out waiting for tab <id> to load"` after 30 s (the
`waitForLoad` rejection is not wrapped in `newTab`). RD-2 records which one Run 17 sees.

## 4. Findings (lenses a, c, d) and the attack on every decision

Tags: **P** plan-side (a dated phase-doc note), **C** code-side (a stage item). "Fact" = depends on a DNR measurement
of the sibling (§7).

| # | Sev | Tag | Finding and evidence | Proposal |
|---|---|---|---|---|
| F1 | CRITICAL | P, contract | **`newTab` cannot install a tab-scoped rule before its first side effect.** 0.4 (C) and 0.5 install `tabIds: [tabId]` "right before its first side effect"; for `newTab` the first side effect *is* `chrome.tabs.create({url})` (`handlers/tabs.ts:103-104`), which creates the tab and starts the load in one call, so the id does not exist yet. A browser-initiated main frame has no initiator either, so `initiatorDomains` cannot scope it. As written, the `newTab` half is unbuildable. | Proposed decision 1 (create the tab on `about:blank`, install, then `tabs.update`); facts: history length and `tabCreated.url` of that sequence |
| F2 | MAJOR | P+C, S1/S3 | **The download rule can block the bridge's own socket.** `tabIds:[-1]` + `initiatorDomains:[own id]` with no `resourceTypes` also matches the offscreen document's `ws://127.0.0.1:<port>` (`extension/src/offscreen.ts:26`), re-opened by the 25 s keepalive `connect()` (`sw.ts` alarms). A list holding `127.0.0.1` (row 17), `127.0.0.1:9234`, or any IP pattern equal to it, would cut the daemon off for the length of a download. | Proposed decision 2: `resourceTypes` = exactly the measured type of the worker's `fetch` (fact), never `websocket`; an S1 test that no rule lists `websocket` |
| F3 | MAJOR | P, contract | **0.6's download fallback breaks a STOP rule by construction.** "A fetch failure while the call's rules were non-empty answers `DOMAIN_BLOCKED` only if the request URL's own host is not blocked" — rules are non-empty whenever the list is, so a direct download of an allowed URL that fails on the network (no redirect) would answer `DOMAIN_BLOCKED` instead of today's error: "a bridge call answering differently from its pre-Step-11b text on a page with no redirect" (STOP rules). "A re-check finds no other cause" has no implementable test. | Proposed decision 3: drop the fallback; if the worker's requests do not reach `webRequest`, the blocked hop keeps today's network-error answer (recorded), the hop is still never sent |
| F4 | MAJOR | C, S1 (fact) | **A trailing-dot host escapes `requestDomains` (S1 table row 9, the only disagreement of 104).** `isUrlBlocked("https://bank.example./")` = blocked (`urlHost` drops one dot, `safety-match.ts:190`); the request host keeps it (`new URL(...).hostname` = `bank.example.`), so a domain-or-subdomain match on `bank.example` misses: `DISAGREE 9 bank.example https://bank.example./ expected=true dnr=false`. A redirector can send the hop to `host.`. | S1 emits `host` and `host.` in `requestDomains` if Chrome accepts the dotted form (fact), else the regex form for every pattern; row 9 is in D1.1's equivalence test |
| F5 | MAJOR | P, contract (fact) | **`navigate`'s answer changes unless the blocked URL is found.** Probe: the post-check answers `allow` when the tab reads `chrome-error://chromewebdata/` or the 8083 URL, so `navigate` would answer `{ok:true}` where SAFE-5b expects `DOMAIN_BLOCKED`. 0.6's "last committed or attempted URL" names no source: `navigate.ts` sees only `chrome.tabs.update` and `onUpdated` (`handlers/navigate.ts:10-14`). If an error page never reaches `status:"complete"`, the answer becomes `NAV_FAILED "Timed out waiting for tab … to load"` after 30 s. | Proposed decision 4: the source is the existing `webRequest.onErrorOccurred` (`main_frame`, the call's `tabId`, `net::ERR_BLOCKED_BY_CLIENT`, URL tested in memory); facts: `tab.url`/`pendingUrl` and `complete` after a blocked main frame |
| F6 | MAJOR | C, S3 | **The `onErrorOccurred` event 0.6 relies on is dropped before anything sees it.** `sw.ts:143-146` sends it through `ingest` → `isOwnTraffic` → `NetworkIngestGate`, which drops blocked hosts and holds events until the state is known (`sw.ts:101-115`); a blocked hop is a blocked host. The detection must read the event inside the existing listener's callback, before `ingest` (no new listener: S3's verifier focus counts them). | An S3 item; S2's keeper takes the event as an injected input |
| F7 | MAJOR | P+C, S2/S3 | **`effect()` is shared and runs twice for a download.** It is every tab method's hook (`focusTab`, `closeTab`, actions…), and `downloadStart` calls it at `download.ts:151` and again through `checkFinalUrl` (`safety-call.ts:247-250`). "Install inside the existing `effect()` step" must be keyed on the class (`navigate`/`newTab`/`downloadStart`) and on the first call. `decide()` (`safety-call.ts:218-236`) does not return the `SafetyView`, so the list the rules come from is not reachable there today. | S2 tests: a second `effect()` installs nothing new; a `snapshot`'s `effect()` installs nothing; S3 exposes the view of the effect read |
| F8 | MAJOR | P, safety | **0.5's "disarm clears every rule" reopens the hop of a call in flight.** A disarm does not stop a `tabs.update` already issued (only debugger sessions detach, `safety-debugger.ts`), so between the clear and the call's end the redirect hop is sent. | Proposed decision 5: rules stay until their own call's post-check; the disarm removes only rules with no live call |
| F9 | MAJOR | P, exit check (d) | **RD-5 does not test the rebuild.** A `navigate` sent after the pattern is added reads the new list at receipt and installs from it; RD-5 passes with the keeper's rebuild deleted. 0.5 also says the rules are a function "of the `BlockList` the call's own gate read produced" and then rebuilds live calls "from the new list" (from the store's memory copy after `applyChanges`, not the call's read). | Proposed decision 6: RD-5b, a live call held by a delayed redirect (the redirect server sleeps N s before its 302) while the wave adds the pattern: 0 hits; 0.5 reworded |
| F10 | MAJOR | P, S1 | **One rule Chrome rejects darkens every covered call.** `updateSessionRules` rejects the whole update on one invalid rule or the cap; 0.5 then refuses with `STATE_UNREADABLE_MESSAGE` ("could not read its safety state"), so one valid options line Chrome dislikes (`my_host.example`, `localhost`, `example`: rows 42, P5, 38 — facts) refuses every `navigate`/`newTab`/`downloadStart` with a misleading message. The matcher accepts any number of lines (no cap in `parseBlockList` or the options page); the bound is `storage.local`'s quota (10 MiB, no `unlimitedStorage` in the manifest — from memory, not measured), far above 1000 regex rules (fact). | Proposed decision 7: S1 emits only forms Chrome accepts (measured), one `requestDomains` rule per call, the regex patterns combined by alternation within the measured size cap; the options page warns past the cap (0.9's line becomes in-scope) |
| F11 | MINOR | P, exit check (d) | RD-2's expected text "refused `DOMAIN_BLOCKED` **or** the tab shown as Chrome's error page" passes on two outcomes. | Write one outcome before the run, from the sibling's `tab.url` fact |
| F12 | MINOR | P | `back`/`forward` are bridge-started navigations (class `tab`, `safety.ts:76-77`); a history entry that now redirects onto a blocked host is requested. Not in 0.2's coverage nor 0.9's exclusions. | Proposed decision 8: cover them with the same tab rule, or list them in 0.9 |
| F13 | MINOR | P | "A rebuild that rejects aborts live calls": nothing can stop a `tabs.update` already issued; "abort" can only mean the reply is refused. Chrome's atomic update leaves the previous rules in force (0.2's source), which is the protective outcome. | 0.5 note: the previous rules stay; the live call's reply is refused |
| F14 | MINOR | P, logging | 0.8 covers logs, not the wire: a rejection thrown out of the keeper reaches `toWireError` as `INTERNAL` with Chrome's text, which may quote a rule (`router.ts` `fail(asInternal(err))`). | S2 test: a rejection whose message holds a sentinel pattern → the wire message never holds it |
| F15 | MINOR | C, S2/S3 | With an empty list (the default) no rule is needed; calling `updateSessionRules` anyway adds latency and a failure mode to every navigate. | Empty list → no API call; Run 17 measures the added latency once (RECORD) |
| F16 | MINOR | P, exit check | D3.3 "`git diff <start> -- daemon shared sdk mcp` is empty": S0F changes `mcp/src/tools*` and the #214 baseline by design. | `<start>` = S3's start commit |
| F17 | MINOR | P, exit check | D4.2 / RD-0 "the manifest permissions read in a window the wave opened": `declarativeNetRequestWithHostAccess` adds no warning (0.3), so `chrome://extensions` may list nothing for it (fact). | Prove the build by an S0F behaviour (F-HOME's refusal text in the wave's options window) unless the sibling shows the permission listed |
| F18 | MINOR | P, S0F | `extension/test/s3-options-upload.test.ts:67` pins the home *warning* that 3b turns into an invalid line: a listed test change. S0F holds three changes plus a schema re-baseline, near its ~500-line cap. | List the test change in S0F's brief; split S0F-a (pure: home, `hidden`, description) and S0F-b (3c's glue after its measurement) |
| F19 | MINOR | C, S0F | Home predicate gaps (executed, §5): `C:\DOCUME~1` exists on this machine (`existsSync` → `true`; the 8.3 alias of the `Documents and Settings` junction to `C:\Users`) and passes today; macOS is case-insensitive by default, and `/users/x`, `/USERS` pass (`holdsHome` compares `Users`/`home`/`root` exactly, `options-model.ts:113-119`); `/System/Volumes/Data/Users/x`, `/var/root`, `/private/var/root`, `/var/home/x` pass. `C:\Uſers` does not exist (`existsSync` → `false`): NTFS does not fold `ſ`, no gap. | Proposed decision 9 and the table in §5 |
| F20 | MINOR | C, S0F (fact) | 3c (i) "reading no more of the file than the check needs": an extension page's `fetch` of `file:` may be unsupported (XHR is the usual route) and XHR reads the whole file; a directory path answers a listing (200), not a miss; the file can vanish between check and attach. | Facts for the sibling; a pure path → `file:` URL function with its own cases (drive letter, `#`, `%`, `?`, spaces); the TOCTOU window recorded |
| F21 | MINOR | P | `minimum_chrome_version` is `"116"` (`extension/manifest.json`); 0.2 quotes the session cap "Chrome 120+". | S1's cap test uses the lower bound, or S3 raises the minimum (a manifest key: user-visible, record it) |
| F22 | MINOR | P, blind spots | Not covered and not listed in 0.9: a `sub_frame` of the redirect target; a navigation the allowed origin's service worker answers by fetching the blocked host (tab `-1`); a `tabReplaced` mid-navigate (the new id has no rule); `http://[::ffff:127.0.0.1]/` reaches `127.0.0.1` unblocked by the gate and the rules alike (row I3; a grammar limit since Step 9). | 0.9 lines |
| F23 | MINOR | P | #294 measures on a fresh profile with one extension: another installed extension's DNR rules are not present there; the facts hold for the Chrome major measured. | Record the Chrome version with each fact; Run 17 runs on the real profile |
| F24 | NIT | P | 0.2's external facts and 0.7 by reading: the manifest declares no `web_accessible_resources` (`extension/manifest.json`), so 0.7's premise holds; `<all_urls>` covers the host access 0.3 (A) needs. | none |

**Each decision attacked:**

| Decision | Verdict | Finding / note |
|---|---|---|
| 0.1, #291 (order) | holds | S0F is file-disjoint from S1/S2 but sequential is the conservative choice; F18's split |
| 0.2 (what; `newTab` covered; session rules) | **amend** | F1 (`newTab`), F12 (`back`/`forward`); session rules hold (survive a worker restart within a session, hence 0.5's start-up clear) |
| 0.3 (ruled A) | holds | F17 (proof of the loaded build), F21 |
| 0.4 (ruled C) | holds, conditions | F1, F2, F8; "the human's browsing unchanged" holds only if download rules cannot match other out-of-tab requests (F2) |
| 0.5, #292 | **amend** | F7, F8, F9, F10, F13, F15 |
| 0.6, #293 | **amend** | F3 (drop the fallback), F5, F6; `newTab`'s answer recorded in §3 |
| 0.7 | holds (by reading) | F24; RD-7/RD-8 measure it |
| 0.8 | amend (small) | F14 (the wire, not only the log) |
| 0.9 | amend | F12, F22 |
| 0.10 (Run 17) | **amend** | F9 (RD-5b), F11 (RD-2), F17 (RD-0); RD-1/3/4/6 discriminate (0 vs 1 hits) |
| 0.11, #291 (S0F's how) | amend | F18, F19, F20; `hidden` decided in §6 |
| #290 (ruled) | holds | its checks (1)–(4) are the sibling's |
| #294 | holds | F23 |

## 5. The shared home-folder predicate — case table (draft for S0F)

Today: `holdsHome` (`extension/src/options-model.ts:113-119`) only *warns*, on a valid line of 1–2 segments whose
first is `users`/`documents and settings` (Windows, `toLowerCase`) or `home`/`Users` (POSIX, exact), or exactly
`/root`; the gate (`upload-paths.ts` `parseUploadFolderLine`, `uploadPathAllowed`) uses every valid line. "Today" below
is executed (`probes.ts`: `analyzeUploadFolders` and `uploadPathAllowed(<line>\f.bin)`). **Proposed:** one pure
predicate in `upload-paths.ts`, applied in `parseUploadFolderLine` so both callers get it: the line is **invalid** (its
own reason, naming no path) and never in `folders`. ASCII case folding on both styles (#249; macOS is case-insensitive).

| Line | Today (options / gate) | Proposed | Why |
|---|---|---|---|
| `C:\Users`, `C:\Users\`, `c:\users`, `C:/Users`, `C:\USERS\` | warn / used | **refused** | the parent of homes; case, `/` and one trailing separator are the same folder |
| `D:\Users` | warn / used | **refused** | any drive |
| `C:\Users\fixture-home`, `C:\Users\fixture-home\`, `c:/users/FIXTURE-HOME` | warn / used | **refused** | a home |
| `C:\Users\Public`, `C:\Users\Default` | warn / used | **refused** | two segments under `Users` (conservative) |
| `C:\Documents and Settings`, `…\fixture-home` | warn / used | **refused** | the old parent (a junction to `C:\Users`) |
| `C:\DOCUME~1`, `C:\DOCUME~1\fixture-home` | valid / used | **refused** | 8.3 alias, exists here (F19); proposed: a first segment matching `DOCUME~<digits>` (ASCII fold) is the old parent |
| `C:\Uſers\fixture-home` | valid / used | allowed (no change) | does not exist; NTFS does not fold `ſ` (measured) |
| `C:\Users\fixture-home\Uploads`, `…\Documents\share`, `…\AppData` | valid / used | **allowed** | inside a home: must stay allowed |
| `C:\Users\fixture-home\.ssh` | warn (ssh) / used | allowed, ssh warning | 0.11: the `.ssh` warning stays a warning |
| `C:\Users.old`, `C:\Data\Users` | valid / used | allowed | not the parent (segment match, not prefix) |
| `C:\`, `C:` | invalid / unused | invalid (root reason) | unchanged |
| `\\server\share\Users\fixture-home`, `\\?\C:\Users\fixture-home` | invalid / unused | invalid | UNC / PREFIX, unchanged |
| `/home`, `/home/`, `/home/fixture-home`, `/home/fixture-home/` | warn / used | **refused** | parent / home |
| `/HOME/fixture-home` | valid / used | **refused** | ASCII fold (conservative on Linux, needed on a case-insensitive volume) |
| `/Users`, `/Users/fixture-home`, `/users/fixture-home`, `/USERS` | warn or valid / used | **refused** | macOS parent / home, any case |
| `/root`, `/root/`, `/ROOT` | warn or valid / used | **refused** | root's home |
| `/var/root`, `/private/var/root` | valid / used | **refused** (proposed) | macOS root's home |
| `/System/Volumes/Data/Users/fixture-home` | valid / used | **refused** (proposed) | macOS firmlink of `/Users/…` |
| `/var/home/fixture-home` | valid / used | **refused** (proposed) | `/home` is a link to it on Fedora Atomic |
| `/home/fixture-home/uploads`, `/root/uploads`, `/Users/fixture-home/Shared` | valid / used | **allowed** | inside a home |
| `/home/fixture-home/.ssh` | warn (ssh) / used | allowed, ssh warning | as on Windows |
| `/`, `/srv/drop`, `/homework`, `/home2/fixture-home` | as today | as today | root invalid; the others are not homes |

Not detectable by a pure predicate (recorded): a junction or symlink elsewhere pointing at a home; a home outside
these parents (`USERPROFILE` moved). Stage 0 F3 of Step 11 (an agent with a shell) still bounds the rule.

## 6. S0F's `hidden` reason: reuse `"blocked"` (decided)

No client needs to tell a `file:` tab from a blocked one, and a new value would cost more than it says:
- `shared/src/protocol.ts:665` `HiddenReason = "disarmed" | "blocked"`, guarded by `isHiddenReason` (`:722`). A new value
  is a wire change in `shared/`, outside S0F's lane, and an older SDK drops it (`sdk/src/client.ts:404` copies `hidden`
  only if `isHiddenReason`).
- The daemon branches on `"blocked"` to **forget the cached url/title** (`daemon/src/intercept.ts:318`, `:597`): exactly
  what a `file:` tab needs (its path must not stay in the daemon's handle cache). A new value would skip `forgetPage`
  and keep the path (`:601` `continue`s without noting, but an earlier note stays).
- The MCP only labels it (`mcp/src/tools/registry.ts:149-150`); the cost of reuse is the label "(hidden: blocked
  site)" on a `file:` tab. Nothing branches on the difference anywhere in `sdk/`, `mcp/`, `daemon/`.
- Today a `file:` row is not hidden (executed: `hiddenReason(file:) null`, `redactListTabsRow` returns the row with
  `url` and `title`). Spec §10's Step 11 note says so (`docs/specs/…-design.md` around line 714: "`listTabs` rows and tab
  events of a `file:` tab are not hidden by this rule"); S0F's §10 note amends that line.

## 7. Facts this audit depends on (the sibling's measurements)

(1) `requestDomains` and a trailing-dot host; whether entries with `_`, a single label, or an IP are accepted (F4,
F10). (2) The regex rule cap and the per-regex size limit (F10). (3) The resource type of the worker's `fetch`, and
whether `initiatorDomains:[own id]` + `tabIds:[-1]` matches it (F2; #290 (3)). (4) `tab.url`/`pendingUrl` after a
blocked main frame, and whether `onUpdated` reaches `complete` (F5, F11, §3). (5) Whether `onErrorOccurred` fires,
with the hop's URL and `ERR_BLOCKED_BY_CLIENT`, for a tab's main frame and for the worker's own request (F5, F6, F3).
(6) A tab created on `about:blank` then `tabs.update`d: history length and the `tabCreated` url (F1). (7) Whether
`chrome://extensions` lists `declarativeNetRequestWithHostAccess` (F17). (8) An extension page's `fetch`/XHR of a
`file:` path: missing file, directory, partial read (F20). (9) The Chrome version of every fact (F21, F23).

## 8. Proposed decisions

### 2026-10-26 · Step 11b Stage 0: `newTab` opens a blank tab, installs its rule, then navigates
**Decided:** a covered `newTab` with a URL creates the tab with `about:blank` (background as today), installs its
tab-scoped rule, then `chrome.tabs.update(id, {url})` and waits for the load; without a URL it is unchanged. **Why:**
F1: the id does not exist before `tabs.create`. **Instead of:** an untabbed rule excluding the existing tabs (catches
a tab the human opens meanwhile, against 0.4 (C)); leaving `newTab` uncovered. **Revisit if:** the sibling shows the
blank step adds a history entry or changes `tabCreated` in a way a client reads. **By:** Claude (proposed; contract —
the `tabCreated` url changes; **for user review**)

### 2026-10-26 · Step 11b Stage 0: download rules name the worker fetch's resource type and never `websocket`
**Decided:** a download's rules carry `resourceTypes` = the measured type(s) of the worker's `fetch` only; an S1 test
pins that no rule ever lists `websocket`. **Why:** F2 (the offscreen socket to the daemon). **Instead of:** no
`resourceTypes`. **Revisit if:** the measured type is shared by another request the extension makes. **By:** Claude
(proposed)

### 2026-10-26 · Step 11b Stage 0: no guessed `DOMAIN_BLOCKED` for a failed download
**Decided:** 0.6's fallback is dropped. A download hop counts as blocked only by the `onErrorOccurred` evidence; if the
worker's requests never reach `webRequest`, a blocked hop answers as today's network error (recorded), still unsent.
**Why:** F3 (a STOP rule by construction). **Instead of:** the fallback. **Revisit if:** the user prefers the code to
the message. **By:** Claude (proposed; contract, for user review)

### 2026-10-26 · Step 11b Stage 0: `navigate` names the blocked hop from `webRequest`
**Decided:** while a covered `navigate`/`newTab` runs, an `onErrorOccurred` for its `tabId`, `main_frame`,
`net::ERR_BLOCKED_BY_CLIENT`, whose URL the call's list blocks (tested in memory, never stored), makes the post-check
answer `DOMAIN_BLOCKED` with `BLOCKED_TAB_MESSAGE`; read in the existing listener before `ingest` (F6); if the load
never completes, the same evidence ends the wait. **Why:** F5. **Instead of:** trusting `tab.url`. **Revisit if:** the
sibling shows `tab.url` reads the blocked URL and `complete` fires (then the evidence is a second check only). **By:**
Claude (proposed)

### 2026-10-26 · Step 11b Stage 0: a disarm does not lift a running call's rules
**Decided:** rules are removed only by their call's post-check (every path) and by the start-up clear; the disarm
removes only rules no live call owns. **Why:** F8. **Instead of:** 0.5's disarm clear. **Revisit if:** a disarm is
shown to stop the navigation itself. **By:** Claude (proposed; safety)

### 2026-10-26 · Step 11b Stage 0: Run 17 tests the rebuild, and RD-2 has one expected outcome
**Decided:** a new row RD-5b: a `navigate` held by the redirect server's delay (sleep before the 302) while the wave
adds the pattern: blocked port 0 hits; RD-2's second clause written as one outcome from the measured `tab.url`.
`s9-redirect.py` gains a tested delay option at S4-helpers if it lacks one. **Why:** F9, F11. **By:** Claude (proposed)

### 2026-10-26 · Step 11b Stage 0: S1 emits only forms Chrome accepts, packed under the caps
**Decided:** one `requestDomains` rule per call for the plain hosts (with `host.` if accepted, F4), the other patterns
as regexes combined by alternation under the measured size cap; any pattern Chrome rejects in `requestDomains` takes
the regex form; the cap test uses the measured limits; the options page warns when the list would pass them. **Why:**
F4, F10. **Instead of:** one rule per pattern. **Revisit if:** the measured caps are far above any realistic list.
**By:** Claude (proposed)

### 2026-10-26 · Step 11b Stage 0: `back` and `forward` carry the tab rule too
**Decided:** `back`/`forward` install the same tab-scoped rule as `navigate` for their call. **Why:** F12 (bridge-started
navigations). **Instead of:** an 0.9 exclusion. **Revisit if:** S3's size cap. **By:** Claude (proposed; widens
coverage within 0.4 (C)'s "a bridge call in flight")

### 2026-10-26 · Step 11b Stage 0: the home predicate folds case and knows the macOS and 8.3 aliases
**Decided:** §5's table: ASCII case folding on both styles; `DOCUME~<n>`, `/var/root`, `/private/var/root`,
`/System/Volumes/Data/Users[/x]`, `/var/home[/x]` added to the parents. **Why:** F19. **Revisit if:** a user needs one
of them. **By:** Claude (proposed; safety, stricter)

### 2026-10-26 · Step 11b Stage 0: a `file:` tab is hidden with the reason `"blocked"`
**Decided:** §6. **Why:** the daemon's `forgetPage` already keys on it; no client tells them apart. **Instead of:** a new
`HiddenReason` (a wire change). **By:** Claude (proposed)

**Proposed dated phase-doc notes** (plan-side): 0.2/0.4/0.5 (F1, F8, F9 wording, F12, F13), 0.6 (F3, F5), 0.8 (F14),
0.9 (F22), 0.10 (F9, F11, F17), 0.11 (F18–F20), D3.3 (F16): each "*Note 2026-10-26 (Stage 0 F<n>): …*" with the
proposal above.
