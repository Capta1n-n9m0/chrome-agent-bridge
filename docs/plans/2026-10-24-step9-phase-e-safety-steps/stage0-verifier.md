# Step 9 Stage 0 — independent verifier report

Verifier: Claude Opus 5.5, 2026-10-24, HEAD `a0700e0`, working tree = HEAD + the six untracked Stage 0 files.
I did not write the audit. Everything in `stage0-audit.md`, `stage0-builder.md` and the evidence files was
treated as a claim. No Chrome, no real daemon, no port but 0, no commit. The probe was copied to
`mcp/test/zz-stage0-probe.test.ts`, run once, and deleted (`ls mcp/test/zz*` → "No such file").

## 1. Re-derived counts

| Item | Audit | Re-derived | Command / output |
|---|---|---|---|
| Router methods | 23 | **23**, same names as 0.1 | `grep -c "router.on(" extension/src/sw.ts` → `23`; names: navigate snapshot screenshot click type scroll hover selectOption pressKey back forward listTabs focusTab newTab closeTab waitFor evaluate locate networkRequests networkClear downloadStart downloadChunk downloadEnd |
| Codes | 23 | **23** = 9 daemon + 13 extension + 1 SDK | read `shared/src/codes.ts:8-42`; `shared/test/codes.test.ts:33` `toHaveLength(23)` |
| MCP tools | 23 | **23** | `grep -c "server.tool(" mcp/src/tools/registry.ts` → `23`; distinct `"browser_*"` names after `server.tool(` → 23 |
| `npm test` | 1714 / 85 | **1714 passed, 85 files** | `Test Files 85 passed (85)`, `Tests 1714 passed (1714)`, 20.48 s, `TEST_EXIT=0` |
| `npm run typecheck` | 0 | **0** | `TC_EXIT=0` |
| `npm run build` | 0 | **0** | `built extension → dist/`, `BUILD_EXIT=0` |
| `git status --short` after build | only steps-dir files | **only the 6 untracked steps-dir files**; no tracked file changed | output lists `stage0-audit.md stage0-builder.md stage0-evidence-contracts.txt stage0-evidence-premises.txt stage0-probe.test.ts.txt stage0.ledger.md` |
| Severity tally | 2/14/14/9 = 39 | **holds** (F1–F2, F3–F16, F17–F30, F31–F39) | read |

## 2. Re-executed findings

| # | Finding | Verdict | Evidence |
|---|---|---|---|
| 1 | **C2** (contract) codeless error → `INTERNAL`, logged once | **CONFIRMED** | probe: `PROBE C2 e1=INTERNAL/no code here e2=INTERNAL logLines=["extension error without code: click"]` (assertions `expect(e1.code).toBe("INTERNAL")`, `expect(lines).toEqual([...one line])`); existing `npx vitest run daemon/test/tabs.test.ts -t "S2b.4"` passed |
| 2 | **C7** (contract) lock FIFO, `LOCK_TIMEOUT {holder}` | **CONFIRMED** | probe: `forwardOrder=["200@1","201@308","202@618"] answeredAt=[307,618,933] waiterD=LOCK_TIMEOUT data={"holder":"probe-lock-a"}`; `lock.test.ts -t FIFO` passed. The audit's note that a queued call **is forwarded** after the grant reproduces |
| 3 | C1, C3, C4, C6 (contracts) | **CONFIRMED** | same probe run, 9/9 passed: C1 7 codes attach `["networkRequests","screenshot","snapshot"]`, `DISARMED`/`DOMAIN_BLOCKED` attach `[]`; C3 `changed=TAB_GONE tabGone=[{"tab":"T2","lastUrl":"http://localhost:8080/x","lastTitle":"New"}]`; C4 `daemonA=T2 daemonB=T66 staleOnB=TAB_UNKNOWN`; C6 `TAB_HELD … reachedExtension=[]` |
| 4 | **F2** URL leak past `listTabs` redaction | **CONFIRMED** | probe P1 `daemonStatusUrls=[["T1","http://localhost:8080/e2e-playground.html"],["T2","http://localhost:8080/x"]]` after the fake extension redacted; code: `daemon/src/handles.ts:105-111` (`note` ignores `undefined`, never clears), `intercept.ts:334-343` (status serves `h.url`), `:316-324` (`tabGone` lastUrl/lastTitle); disarm-period URLs enter via `extension/src/tab-events.ts:90` (`url: tab.pendingUrl ?? tab.url`) and `:98-99` (`tabRemoved` lastUrl/lastTitle from the always-updated cache, `sw.ts:113-118`) |
| 5 | **F13** MCP prints `undefined — undefined` | **CONFIRMED** | probe P2 `browser_list_tabs="T1* undefined — undefined"`, `browser_status=…Active tab: [T1] undefined — undefined…`; code `mcp/src/tools/registry.ts:343, 352, 357-358, 553` interpolate `title`/`url` raw; SDK maps to `""` at `sdk/src/client.ts:348-349` |
| 6 | **F5** two `waitFor` arms cannot tick | **CONFIRMED** | `extension/src/handlers/wait.ts:25-28` (`setTimeout(r, secs*1000)`, ≤ 60 s), `:36-47` (one `callInPage` polling 10 s in the page); worker-side loops at `locator-wait.ts:43-77`, `wait.ts:131-139` |
| 7 | **F6** no debugger-session bookkeeping | **CONFIRMED** | `extension/src/debugger.ts:19-38` attach/run/detach, no registry; the only `chrome.debugger.attach` is `:21` (callers `:75, :114, :128, :167`); `debugger-errors.ts:51` maps "detached while handling command" → `DEBUGGER_CANCELLED` |
| 8 | **F4** content scripts / `setAccessLevel` | **CONFIRMED** (code side; the Chrome-docs quote not re-fetched) | `grep -rn "chrome\.\(storage\|runtime\)" extension/src/content/` → empty; `options.ts:5,11` (extension page: trusted); `offscreen.ts` uses only `chrome.runtime` messaging; `@types/chrome` declares `setAccessLevel` on `StorageArea` |
| 9 | **F14** script URLs bypass the JS switch | **CONFIRMED** (citation partly wrong, V1) | `handlers/navigate.ts:5-11` passes any non-empty `url` to `tabs.update`; `handlers/tabs.ts:73` `chrome.tabs.create({url…})` — not `tabs.ts:104-105` |
| 10 | **F12** state cannot ride the hello; unknown events dropped | **PARTLY** | dropped: CONFIRMED (P3 `clientSawEvents=[] extensionEventsCounted=1`; `wsHost.ts:297-300`; `intercept.ts:207-230` no `else`). "Cannot ride the hello": wrong as stated (V14); cited `offscreen.ts:143-170`, `client.ts:185-189` do not exist (V1) |
| 11 | **F10** options page writes storage directly | **PARTLY** | claim true at `extension/src/options.ts:11`; the cited `options.ts:134` does not exist (file is 14 lines) |
| 12 | **F30** network call without `tab` needs `humansTab()` | **PARTLY** | the daemon resolves an absent `tab` to a `tabId` before forwarding (`daemon/src/intercept.ts:533-534`; `extension/src/network-scope.ts:9`), so the gate sees a `tabId`, not "the human's tab" (V10) |

## 3. Findings against the audit

**V1 · MAJOR · stage0-audit.md §3 (F1, F3, F8, F9, F10, F12, F14), §1 · Nine file:line citations in
CRITICAL/MAJOR findings point at lines that do not exist or at the wrong file** (exit criterion 1: evidence).

| Finding | Cited | Actual | Check |
|---|---|---|---|
| F1 | `handlers/download.ts:258-273` | `:27-40` | `wc -l extension/src/handlers/download.ts` → 68 |
| F3 | `handlers/download.ts:250` | `:19` (the http(s) check) | same |
| F3 | `handlers/tabs.ts:105` | `:73` (`chrome.tabs.create`) | `wc -l` → 86 |
| F8 | `download.ts:258`, `:265-277` | `:27`, `:34-45` | — |
| F9 | `network-state.ts:348-358` | `:49-59` (`rehydrate`, `log.merge`) | `wc -l` → 118 |
| F10 | `options.ts:134` | `:11` | `wc -l` → 14 |
| F12 | `offscreen.ts:143-170` | `:6-31` | `wc -l` → 39 |
| F12 | `client.ts:185-189` | `:9-12` (`helloFrame`) | `wc -l extension/src/client.ts` → 73 |
| F14 | `tabs.ts:104-105` | `handlers/tabs.ts:73` (`extension/src/tabs.ts:104-105` are capture constants) | read |

Also cross-references: §1 "Every count … holds (F37)" — F37 is the badge NIT, the counts NIT is F31; F12 "Ruling
proposed in §5 (D1)" — D1 is in §8. The offsets are systematic (download: +231 = the length of `debugger.ts`),
consistent with line numbers read off a concatenated dump. The claims themselves mostly hold (table §2), but S1/S2
builders will follow these pointers. **Fix:** correct each citation; re-check every other citation the same way.
All other CRITICAL/MAJOR citations I spot-read are right (`sw.ts:53-57, 107-122, 157, 200-207`;
`intercept.ts:212, 316-324, 334-343, 470-475, 478-490, 570-587`; `handles.ts:105-111`; `actions.ts:41-57, 74-94`;
`evaluate.ts:48-80, 85`; `tabs.ts:161-200, 228-251, 253-260`; `wait.ts`, `locator-wait.ts`, `debugger.ts`,
`debugger-errors.ts:45-51`; `network-log.ts:265, 455, 461, 494-498`; `wsHost.ts:297-300`; `sdk/src/client.ts:521-533`;
`protocol.ts:151-173`; `registry.ts:343-358, 553`; `history.ts:3-12`; `navigate.ts:5-11`).

**V2 · MAJOR · stage0-audit.md §3 · Seven plan-side findings carry no dated amendment text** (exit criterion 1:
"plan-side (with exact dated amendment text)"). F12 (0.6's wire shape), F20 (0.2 shortcut), F21 (0.3 claim
ruling), F22 (0.4 grammar), F23 (0.6 `blockedCount`), F27 (0.5 one code), F30 (0.3 network scope) point to a D-ruling
or say "ruling" but give no `*Amended 2026-10-24 (Stage 0 Fn): …*` text for the phase doc. F15 (§6 table) and
F16/F18 do. **Fix:** add the exact amendment sentence for each, derived from D1, D11, D5, D4, D2 and V10.

**V3 · MAJOR · D6 (1) post-check; F1's amendment · The post-check is unspecified for a tab that closed or was
replaced during the call, and with D8's fail-closed posture it changes today's behaviour while armed + JS on +
empty list.** Today `evaluate("window.close()")`, a `click` on a button that closes its popup, or a `navigate`
across a tab replacement (a Memory-Saver discard changes the tab id — CLAUDE.md, Run 8 LEASE-6; prerender swaps
likewise) answer `ok`. A post-check that re-reads the tab (`url`/`pendingUrl`) gets "No tab with id"; refusing on a
failed read (D8's rule for the state read, applied by analogy) turns those `ok`s into errors. The audit's claim
"nothing changes while armed with an empty list" (D6 Why) is therefore unproven, and the conservative rule's second
property is at risk on a contract-level ruling. **Fix:** amend D6/F1: "a post-check on a tab that no longer exists
checks the state only (armed, JavaScript); a replaced tab is checked under its new id"; S1.2 adds {tab gone, tab
replaced} × {armed + empty list} → reply unchanged, and {tab gone} × disarmed → `DISARMED`.

**V4 · MINOR · F2/D3 · `leaseGranted.url` is a URL channel the audit never names** (`grep -c leaseGranted
stage0-audit.md` → 0). The opener rule (`daemon/src/intercept.ts:209-217`) sends `leaseGranted {url}` from
`tabCreated.url` or from `fillUrl`'s `listTabs` polls (`:255-278`). It is covered transitively by F2's `tabCreated`
redaction and hidden rows, but then `fillUrl` polls up to `URL_FILL_MAX_MS` (2 s) for a URL that never comes,
delaying the grant. **Fix:** name it in D3; `fillUrl` stops on a hidden row; an S3 test.

**V5 · MINOR · §4 row (3) / D3 · A URL cached before the human added a pattern stays served.** The claim "redacted
sources never put a blocked URL in the daemon cache; the cache keeps the tab's last *allowed* URL" is wrong for a
tab cached while its host was not yet blocked: `note` never clears (`handles.ts:105-111`), `remove` keeps the
cached URL when the event has none (`handles.ts:160-165`), so `daemon.status`, `tabGone` and `TAB_GONE` keep
serving the now-blocked URL. **Fix:** a row with `hidden: "blocked"` clears that handle's cached url/title in
`record()` (`intercept.ts:478-490`); an S3 test.

**V6 · MINOR · F19/D8 · The proposed sender check does not single out the offscreen document.** `sender.url ===
…/offscreen.html` also matches a *tab* showing `chrome-extension://<id>/offscreen.html`, which runs `offscreen.ts`
(it would also act on `connect` messages, `offscreen.ts:6-31`). The own-page block stops the bridge from opening it,
not the human. **Fix:** also require `sender.tab === undefined` (or check the context type via
`runtime.getContexts`).

**V7 · MINOR · F4/D8 · Placement of `setAccessLevel`.** "At the top of `sw.ts` (not awaited)": a synchronous throw
there (e.g. the method missing — the manifest says `minimum_chrome_version: "116"`) would stop every listener below
from registering (CLAUDE.md: listeners at the top level). **Fix:** guarded call (`try`/optional call/`.catch`) placed
after the listener registrations. Answer to the brief's question: restricting `storage.local` to trusted contexts
breaks nothing used today — `extension/src/content/` has no `chrome.storage`/`chrome.runtime` use (grep empty), the
options page is an extension page (trusted), and the offscreen document uses only `chrome.runtime` messaging.

**V8 · MINOR · D7 · Two parts change behaviour while armed + JS on + empty list beyond need.** (a) `javascript:` →
`BAD_PARAMS` *always*: with JavaScript on this is only a change of error code on a path Chrome is believed to refuse
anyway (unmeasured); the conservative rule's second property prefers refusing only while JavaScript is off, as for
`data:`/`blob:`, or the record should say why "always". (b) Blocking *every* extension id refuses `navigate`-away,
`closeTab`, `focusTab` and hides `listTabs` titles for tabs showing another extension's page, while F3's own text
says scripting/debugger already cannot reach other extensions' pages, so the security gain is small. **Fix:** refuse
navigation *to* any `chrome-extension://` URL; block acting on / hide only this extension's own pages; or record the
wider rule with this cost, for the user.

**V9 · MINOR · D2 · One code needs scope-aware rendering, not stated.** 0.6's MCP line for `DISARMED` tells the model
the bridge is off — stop and ask. For `scope: "evaluate"` that is wrong: every other tool still works. **Fix:** D2
requires the extension message, the MCP line and the SDK's `report` to differ by `data.scope`; S3.2 tests both.

**V10 · MINOR · F7/F9/F30 · `networkRequests {id}` is global and unnamed.** The daemon forwards an id lookup with
neither `tabId` nor `scope` (`daemon/src/intercept.ts:530`, "a request-id lookup is global"). The gate must refuse it
while disarmed and the query filter must drop a blocked entry found by id. F30's premise is partly wrong: the daemon
already resolves an absent `tab` to a `tabId` (`intercept.ts:533-534`), so the gate needs no `humansTab()`. **Fix:**
add the id path to F7's signature note and the S1 cases.

**V11 · MINOR · §6 S2.4 stricter wording · The proposed check fails on correct code.** `grep -c "^\s*await"
extension/src/sw.ts` → `4` today (awaits inside functions), so "grep exit 1" is false at baseline; `grep -c "^await"`
→ `0`. **Fix:** use a column-0 pattern or an AST check, and show it fails on a mutation.

**V12 · MINOR · missed blind spots, "what the human sees".** (a) The action badge is not persisted across a Chrome
restart or an extension reload, so the badge/title must be re-derived from `storage.local` on every worker start
(top level, not awaited); otherwise a disarmed bridge looks armed. SAFE-9 checks only `browser_status`: add the
badge/title read by UIA after the reload. (b) The control is a toggle: a panic double-click or a second shortcut
press re-arms. Propose a debounce (build decision, e.g. ignore a second toggle within 1 s) and a SAFE row.

**V13 · MINOR · F16/D9 · The `declarativeNetRequest` open decision is framed for downloads only.** The same
mechanism would stop a bridge `navigate` that an allowed open redirector bounces onto a blocked host (a GET with the
profile's cookies, a side effect no post-check undoes). **Fix:** present the user one DNR decision covering
download hops and main-frame redirects.

**V14 · NIT · F12 premise.** The worker already passes `session` to the offscreen document in the `connect` message
(`sw.ts:185-187`, `offscreen.ts:12-13`), so the state *could* ride the hello. The real reason against it: the hello
is sent once per connection, and putting the state in the offscreen key would force a reconnect per change. D1's
conclusion stands.

**V15 · NIT · §5 matcher table.** All required kinds are present (40 cases: `notbank.example` #3, ports #10-16, IDN
#23-24, IPv4 #17-19, IPv6 #21-22, `localhost` #14-16, trailing dots #8-9, case #7, empty/comment/invalid #26-31,
whitespace #25, `*.` #5-6/#20/#29), and I found no case inconsistent with the stated rules (checked #12, #16, #19, #32
against rules 2-6; `localhost:8081`/`bank.example:8443` parse as non-http URLs, so rule 2 does not swallow them). Gaps: the
examples are real registrable domains that S1 will commit as test data (prefer `.example`/`.test`, RFC 2606/6761);
`_` in a host is invalid under rule 3; `filesystem:` URLs are not unwrapped; `file://host/` (UNC) has a host though
rule 5 calls `file:` hostless; a pasted `https://bank.example:443/` reduces to any-port `bank.example` while a typed
`bank.example:443` is port-restricted. State each.

**V16 · NIT · D5 justification.** D5 (claim granted, every call refused) is acceptable as the conservative rule:
a lease grants no page capability, any unheld tab is claimable by handle, refusing `{active:true}` alone would need
the daemon to know the list, and behaviour is unchanged with an empty list. The Why omits the opener rule: a held
blocked tab's popups are leased to the holder at once (`intercept.ts:213-217`), with `leaseGranted`; this is
equivalent to claiming by handle, so D5 holds, but say it and add it to "Revisit if".

**V17 · MINOR · F1 · No re-check right before a side effect.** F1 re-checks at debugger attach, per poll tick and
before the reply, but not between receipt and the first side effect. The switch-mode screenshot waits for its slot
and up to 1 s in `showTab` (`tabs.ts:187-195, 228-251`) before switching the human's window; a disarm in that window
still switches it (a visible side effect the post-check cannot undo). **Fix:** one `assertAllowed` before
`showTab`, `captureVisibleTab`, `tabs.update` and each action's `callInPage`.

Rulings checked and agreed (no finding): D1 (separate events, null when not reported — backward compatible, P3
reproduced); D3 (reveals less, unchanged while armed with an empty list — but see V5, V8b); D8 per-call read and
fail-closed on the *state* read; D10/§6 coverage (every check S0.1–S5.1 has a row; all SAFE rows have expected text
written now; SAFE-7c is explicitly a record, not a check).

## 4. Hygiene

- Evidence `.txt` files: URLs only `http://localhost:8080/…` and `ws://127.0.0.1:${port}` (counted with `grep -oh
  "[a-z-]*://…" | sort | uniq -c`); the audit `.md` also has hypothetical matcher examples and three
  developer.chrome.com references (see V15).
- Token: `grep -c -F <token>` over every `stage0-*` file → 0 each (token never printed).
- No user tab content. `git status --short` before writing this file: only the 6 untracked steps-dir files; the
  probe copy is gone.

## 5. Verdict

**FAIL** — three MAJOR findings against the audit: V1 (wrong citations in CRITICAL/MAJOR evidence), V2 (seven
plan-side findings without amendment text), V3 (D6's post-check, a contract-level ruling, can change armed
behaviour). V1 and V2 are mechanical; V3 needs one dated sentence in D6/F1 and two S1.2 cases. All seven Step 8
contracts reproduce as HELD, every count holds, and the CRITICAL findings F1 and F2 are confirmed. Re-check after a
fix round: V1-V3 only (plus any MINOR the fixer takes).

## Round 2 (re-check of fixer round 1, 2026-10-24)

Scope: only the items the fixer touched (`stage0-fixer1.md`; `stage0-audit.md` edited in place, a note appended
to `stage0-builder.md`). The code did not change (HEAD `a0700e0`), so the citation checks run against the same
tree as round 1. *Round 2 note: round 1's V15 text quoted real `.com` names as examples. For hygiene they are
replaced in place above by reserved `.example` names; no claim changed.*

| Item | Result | Evidence |
|---|---|---|
| V1 citations | **CONFIRMED-FIXED** | I extracted every `path.ts:N[-M]` in the audit with `grep -oE` and resolved each against `git ls-files` (a bare `tabs.ts` = `extension/src/tabs.ts`, as the new header says). Every one is within its file's length: the loop printed no `OUT`/`NOFILE` line. I read every new or corrected CRITICAL/MAJOR citation with `sed -n`: `tabs.ts:187-195` (slot → query → `showTab`), `intercept.ts:424-436` (`TAB_GONE` data at 430-434), `tab-events.ts:94-101` (`tabRemovedParams`), `sw.ts:113-115`, `handlers/download.ts:19, 27, 34, 42, 43-45`, `network-state.ts:49-59` (`rehydrate`), `options.ts:11`, `client.ts:9-12` (`helloFrame`), `offscreen.ts:12-19` (the `port:token:session` key), `handlers/tabs.ts:72-73`, `handlers/navigate.ts:13-16` (`NAV_FAILED`), `intercept.ts:529-534` (the `id`/`all`/`tabId` forms), `handlers/network.ts:16-21`, `network-scope.ts:5-6`, `inject.ts:9`, `intercept.ts:255-277` (`fillUrl`), `handles.ts:160-165`. Each says what the audit says. A sample of 11 unchanged citations, read this session on the same tree, is also right: `sw.ts:229-236, 238-240`; `keys.ts:16, 51`; `debugger-errors.ts:45-49`; `wsHost.ts:240`; `sdk/src/tab.ts:165-168`; `codes.test.ts:33`; `intercept.ts:180, 203`; `sdk/src/client.ts:348-349`; `history.ts:3-12`; `network-log.ts:455`. Cross-references: §1 now reads "(F31)", and F12 now reads "§8 (D1)". |
| V2 amendment texts | **CONFIRMED-FIXED** | Every plan-side finding carries a quoted `*Amended 2026-10-24 (Stage 0 Fn): …*`: F1, F2, F3, F5, F7, F8, F9, F10, F12, F14, F16, F18, F20, F21, F22, F23, F27, F28, F30, F40, F41, F43. F15's amendment is the §6 table (D10). |
| V3 post-check | **CONFIRMED-FIXED** | F1's amendment and D6 (1) now check the state first, then the tab. A gone or unreadable tab is tested by its last known URL, and "none known, or not blocked → the reply stands as today". A replaced tab is tested under its new id. A tab unreadable at receipt is left to the handler's `TAB_UNKNOWN`. With the state armed, JS on and an empty list, no branch can refuse: every refusal needs disarmed, JS off on an `evaluate`, or a matching URL (own pages excepted, which the plan already blocks). So existing tools and tests stay identical. D6's "Instead of" records the rejected fail-closed tab read. §6 S1.2 lists these rows: {gone, replaced} × armed + empty list → unchanged; gone × disarmed → `DISARMED`; gone with a blocked last URL, and with none known; replaced onto a blocked URL; unreadable at receipt; a network call on a closed tab. See R2-1. |
| V4 → F40 | **CONFIRMED-FIXED** | `leaseGranted.url` is named, `fillUrl` stops at a hidden row, an S3 test is listed, and the amendment text is there. D3 is updated. |
| V5 → F41 | **CONFIRMED-FIXED** | §4 row (3) now reads **Incomplete**, with a superseded note. A hidden row or `tabRemoved {hidden:"blocked"}` clears the cache. The daemon runs one `listTabs` per safety-state change, which sends nothing while nothing changes, so behaviour while armed with an empty list is unchanged. |
| V6 | **CONFIRMED-FIXED** | F19 and D8 require `sender.url` to be `offscreen.html` **and** `sender.tab === undefined`. |
| V7 | **CONFIRMED-FIXED** | F4 and D8 place the call after all listener registrations, guarded (`try` + optional call + `.catch`) and not awaited. The brief's question is answered. |
| V8 / D7 narrowing | **CONFIRMED-FIXED** | `javascript:`, `data:` and `blob:` URLs are refused only while JS is off; with JS on they get today's answer. Acting on a tab and hiding it apply only to this extension's own pages. Navigation *to* any `chrome-extension://` URL is refused. This is conservative: security is not weaker than the plan's own-id rule. The one change while armed with an empty list (navigating to another extension's page) has no user in the repo; the round-1 grep found only an error-string fixture in `inject.test.ts`. The wider every-id rule is offered to the user as the alternative. See R2-2. |
| V9 | **CONFIRMED-FIXED** | F27's amendment, D2 and §6 S3.2: the message, the MCP line and the SDK's `report()` differ by `data.scope`, and both scopes are tested. |
| V10 | **CONFIRMED-FIXED** | F30 is rewritten (`intercept.ts:530-534`); F7's `target` has `none` for the `id` and `all` forms; F9 gains path (d); §5 gains a row; S1.2 adds the network forms. |
| V11 | **CONFIRMED-FIXED** (re-run) | `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` → `0`. On a scratchpad copy with `const st = await chrome.storage.local.get("armed");` appended → `1` (copy deleted). `grep -c '^import\b'` and `'^export\b'` over `extension/dist/content.js` → `0` and `0`. `typescript ^5.7.0` is in the root `package.json:19`. The superseded note's "4 in-function awaits at `sw.ts:141, 165, 186, 187`" matches `grep -nE '^\s+await'`. The AST test is named as the real check, and the grep's blind spot is stated. |
| V12 → F42, F43, D13 | **CONFIRMED-FIXED** | F42: the badge and title are re-derived at every worker start, and SAFE-9 reads the badge by UIA. F43 and D13: only a *re-arm* within 1 000 ms of a disarm is ignored; a disarm is never delayed. **D13 is conservative**: it can only keep the bridge off longer, never turn it on, and tools and tests are unaffected because agents cannot press the button (F33). **It is undoable**: click again after 1 s, and the options switch is not debounced. It is listed for user review as contract-level. SAFE-1b has expected text. |
| V13 | **CONFIRMED-FIXED** | D9 and F8's amendment present one DNR decision covering download hops and main-frame redirects. |
| V14 | **CONFIRMED-FIXED** | F12 and D1's Why are corrected (`sw.ts:185-187`, `offscreen.ts:12-19`). |
| V15 matcher | **CONFIRMED-FIXED** | 50 cases (≥ 20), using reserved names only (`.example`, `.test`, `localhost`, IP literals, `<this id>`). Every required kind is present. The new cases 41-50 agree with rules 2, 3, 5 and 7: #42 `_` is accepted (rule 3); #43 a `filesystem:` URL is tested by its inner URL (rule 5); #44-46 cover a `file:` URL with a host, a port pattern against `file:`, and a `file:` URL with no host (rule 5); #47-48 a pasted default port means any port, a typed port restricts (rule 2); #49-50 a pasted non-default port is kept. No case contradicts the grammar. |
| V16 | **CONFIRMED-FIXED** | D5 and F21 cover the opener rule, and D5's "Revisit if" names the `leaseGranted` URL case. |
| V17 | **CONFIRMED-FIXED** | F1's amendment and D6 (1) add a re-check right before each first side effect (`showTab`, `captureVisibleTab`, `tabs.update/create/remove`, `callInPage`, trusted input). |
| Severity counts | **CONFIRMED** | `awk` over the section headings: CRITICAL 2, MAJOR 14, MINOR 18, NIT 9 = 43. This matches the audit's line 14 and the note in `stage0-builder.md`. |
| Hygiene | **CONFIRMED** | Token: `grep -c -F` → 0 in every `stage0-*` file and in `journal.md`. Real-site names: `grep -ohE` for `.com`, `.de`, `.org` and other TLDs over `stage0-*` finds only `developer.chrome.com` doc links, plus my own round-1 quotes, now replaced. Evidence `.txt` URLs are only `http://localhost:8080/…` and `ws://127.0.0.1:${port}`. `git status --short` shows only the 8 untracked steps-dir files: Stage 0's, `stage0-fixer1.md` and this report. |

### New findings (round 2)

**R2-1 · NIT · F1/D6/F30, "the last URL the worker knew".** The worker's `TabInfoCache` drops a tab's entry when
the tab closes (`extension/src/sw.ts:116-118`, `tabInfo.take(tabId)`). So for a closed tab, "none known → the
reply stands" is the normal path unless S2 keeps the last URL for the length of the call. D6's "Revisit if"
already names a blocked page that closes itself. S2 should state where the last URL is kept, for example captured
at receipt and refreshed at each side-effect check. Either way, nothing changes while armed with an empty list.

**R2-2 · NIT · D7.** Refusing navigation to *another* extension's page is the one change D7 still makes while armed
with JavaScript on and an empty list. Security justifies it (the rule's first property), no test or recipe uses
it, and the user is offered both the narrower and the wider rule. Note only.

### Round-2 verdict

**PASS-with-notes.** V1–V3 are fixed, with evidence. V4–V17 are folded in correctly. F40–F43 and D13 hold up, and
D13 is conservative and undoable. Counts and hygiene check out. Notes: R2-1 and R2-2 (both NIT).
