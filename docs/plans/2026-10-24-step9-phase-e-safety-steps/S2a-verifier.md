# S2a — verifier report (Step 9, stage S2a "Extension enforcement")

2026-10-24 · independent verifier, Claude Opus 5.5 (`claude-opus-5-5`) · brief `briefs/S2a-verifier.md` · tree: HEAD `3d2c111`
plus the uncommitted S2a work. I read `CLAUDE.md`, `briefs/common.md`, `role-prompts.md`, `briefs/S2a-builder.md`, the phase
doc (Decisions 0.1–0.7, S2/S2a and the exit checks), the stage0-audit items F11 and D6, S3.md §7, and the builder report
(`S2a-builder.md`), which I treated as claims to audit. I read every changed source file and the S1 gate (`safety.ts`) that
the new code drives.

**Hygiene.** I did not edit any source or test file in the main tree. Mutations ran on a scratch copy of the repo, at
`…/scratchpad/s2av/repo`, which holds `extension/`, `shared/` and the root config, with `node_modules` as a junction. The
copy contains no token. Before and after my work, `git status --porcelain` and the sha256 of every modified and untracked
file matched (`status-identical`, `hashes-identical`). After each mutation, `diff -r -q` of the scratch copy against the main
tree printed nothing. I never touched Chrome, never started a daemon, and spawned no agents. At the end,
`netstat -ano | grep -c ":9234 "` returned `0`.

## 1. Checks re-run

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | `Test Files 105 passed (105)` · `Tests 2525 passed (2525)` (the builder's numbers match) |
| `npm run build` | exit 0; `built extension → dist/`; `git status --porcelain` unchanged afterwards |
| `grep -c '^import\b' extension/dist/content.js` / `'^export\b'` | `0` / `0` |
| `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` | `0`; `1` on a scratch copy with the pre-registered line appended |
| `git diff --stat -- extension/test daemon sdk mcp shared recipes` | empty (no existing test file changed) |
| lane: `git diff --stat -- extension/src/content extension/src/safety.ts extension/src/safety-match.ts extension/src/options.ts extension/manifest.json extension/options.html` | empty |

Count reconciliation (`npx vitest run <the 9 new files> safety-static.test.ts --reporter=json`): gated-router 20,
s2a-actions 15, s2a-handlers 14, s2a-pure 9, safety-call 50, safety-debugger 14, safety-network 17, safety-state 35,
sw-static 14 = **188**. On top of that, `safety-static.test.ts` (unchanged at HEAD, `git diff --quiet HEAD` holds) generates
2 tests per `safety*.ts` file plus 1, so 13 now against 5 at HEAD (4 new files): **+8**. 2329 + 188 + 8 = **2525**. The
builder's claim reconciles.

## 2. Findings

**1 · CRITICAL (integrity floor, phase item: "reach the extension's own pages") · a relative URL opens the extension's own
pages.** `navigate`/`newTab` pass `params.url` verbatim to `chrome.tabs.update`/`create`
(`extension/src/handlers/navigate.ts:13`, `extension/src/handlers/tabs.ts:83`). The gate tests that same raw string as the
own target (`extension/src/safety-call.ts:144-147` → `ownTarget`). `urlScheme` finds no scheme in `/options.html`, so
`isExtensionUrl` is false, and an empty block list allows the call. Chrome's `tabs.create`/`tabs.update` documentation says
"Relative URLs are relative to the current page within the extension". From the service worker, `/options.html` therefore
resolves to `chrome-extension://<this id>/options.html`. That is #138's refusal ("`navigate`/`newTab` to any
`chrome-extension://` URL … refused `DOMAIN_BLOCKED`") passed by its relative form.
Evidence, from the S2a code on the scratch copy (the extension id is a stand-in):
```
node --import tsx ../probe/rel.mts
navigate "/options.html" receipt: allow effect: allow
navigate "../options.html" receipt: allow effect: allow
newTab "/options.html" receipt: allow effect: allow
navigate "chrome-extension://<ID>/options.html" receipt: DOMAIN_BLOCKED effect: DOMAIN_BLOCKED
```
Two things limit the damage, and both should be stated. First, the post-check (`navigate`) and every later call on that tab
are refused `DOMAIN_BLOCKED` (own page), and `withDebugger` is gated, so the agent cannot read or type into the page. Second,
Chrome's resolution is documented but **not measured** here, because I may not touch Chrome. Still, the tab does get opened on
the extension's page, which is what #138 forbids, and the STOP list names "any path by which a client … reaches the
extension's own pages" (common.md §9).
Suggested fix, in lane: in the wiring, give the gate the URL Chrome will actually open. For example, `callTargets` (or
`ownTarget`'s caller) tests `new URL(url, chrome.runtime.getURL("sw.js")).href` (whichever base the worker's script URL is)
for `navigate`/`newTab`. Alternatively, refuse a `navigate`/`newTab` URL that has no scheme (that changes a reply while
armed, so it would need a ruling). Add a test that fails today (`/options.html`, `../options.html`, `options.html`), and add
an S4 row that reads Chrome's resolution.

**2 · MINOR · contract-level proposed decisions not marked as such** (`S2a-builder.md` §7). Under the ESCALATION list and
the SPEC-DISCREPANCY PROTOCOL, these decide "what is gated / what `listTabs` reveals / what the network log records while
disarmed / the safety state's wire behaviour", but they are marked `By: Claude` with no contract-level flag:
(a) the post-check also replaces error replies, and `listTabs` with an unreadable state is refused rather than redacted. This
second part sits between two rulings, #134/D3 ("`listTabs` is redacted, not refused") and #139 ("a failed read refuses").
(b) the network ingest drops a request for good once one of its events was dropped, including a request begun while
disarmed and still running after a re-arm. (c) no `safetyState` is sent while the state is unreadable. Each is stricter or
neutral, so none is wrong. Fix: the step agent lists them under Open decisions as contract-level. The unknown-method decision
(`UNKNOWN_METHOD` in every state) was delegated by the brief and reveals nothing about the state, so it is a NIT at most.

**3 · MINOR · `offscreen.ts` accepts `connect`/`send` from any extension context** (`extension/src/offscreen.ts:6-37`;
this is the builder's F-S2a-1, re-assessed). Content scripts can call `chrome.runtime.sendMessage`, and the offscreen
document receives it. A forged `connect` (any port, any token) would point the socket at another 127.0.0.1 listener whose
frames the worker then accepts, because they arrive from the offscreen document. A forged `send` could put a false
`safetyState` or tab event on the wire. Page script cannot reach our ISOLATED world, our content script never sends
messages, and the manifest has no `externally_connectable`. So this is not reachable by a page, the daemon or a client
short of a renderer compromise. It does not change the safety state, and it pre-dates Step 9. The builder said the fix needs
the worker's URL measured first. It does not: the cheap fix is `if (_sender.tab !== undefined) return false;` (content
scripts, and extension pages shown in a tab, always carry `sender.tab`; the service worker never does), plus
`sender.id === chrome.runtime.id`. Suggested: build it now or in S2b, with an S4 row confirming that the relay still works.

**4 · MINOR · a failed toggle write leaves memory and storage apart** (`extension/src/safety-state.ts:259-260`). The memory
copy is disarmed before `set`. If `set` rejects, every call is refused (correct, fail-closed), but at the next worker start
memory reloads "armed" from storage, so the bridge re-arms without the human doing anything. That is narrower than the
forbidden "re-arming by default on a reload", but close to it. The builder's Revisit-if names it. Suggested: S2b's caller
surfaces a rejected `toggle()` (badge stays `OFF`, one retry), and the step agent records it with decision 4.

**5 · NIT · two surviving mutants show untested lines.** V5: removing `this.last = null` from
`SafetyReporter.connectionUp` (`safety-state.ts:320`) leaves all 35 tests green, because the tests always call
`connectionDown()` in between. An up→up sequence (a lost `ws-status false`) is untested. V20: removing the `listTabs`
exemption from `CallSafety.post` (`safety-call.ts:209`) leaves 70/70 green. That is equivalent except when the state turns
unreadable between receipt and reply. The builder's M9 (the early `refused` check in `runWithDebugger`,
`safety-debugger.ts:93`) is equivalent, as claimed: `sessions.begin` throws the same refusal before any attach. The only
difference is one extra state read by the guard, and with an unreadable state the guard's refusal would carry the
"unreadable" message instead of the disarm message. A test could count guard calls. All three are NITs.

**6 · NIT · `SafetyStore.start()` never retries** (`safety-state.ts:165-182`). If the first `storage.local.get` fails,
`ingestView()` stays null for the whole worker lifetime, until a safety change arrives. Network events are buffered (2 000,
oldest out), so nothing is recorded, even while armed with an empty list. This is fail-closed and needs a storage failure, so
it is within #139's spirit. A retry on the next `read()` success would close it.

**7 · NIT · residual capture race (F11).** The verification queries the window's active tab *after* `captureWithRetry`
(`extension/src/tabs.ts:212-216`). If the human switches away and back between the capture and that query, a wrong-tab image
passes. That is narrow, and it is better than before (there was no check at all).

**8 · NIT · handlers take `call` as optional.** In production only `GatedRouter.handle` calls a handler, and it always
passes `call` (`router.ts:62`). `sw.ts` imports and constructs only `GatedRouter` (static tests; BM22 below). A future direct
call would silently skip every effect check and the post-check. Consider making `call` required in the handlers' signatures
and giving tests a no-op `HandlerSafety`.

## 3. Bypass hunt (brief item 3), beyond finding 1

- **Handler before the gate:** `GatedRouter.handle` builds the call and awaits `receipt()` before touching the handler
  (`router.ts:51-56`). A gate throw becomes `INTERNAL` (`asInternal`), and a post-check throw becomes `INTERNAL` and runs the
  cleanups. The only route to a handler is `router.handle` inside `onMessage`, after `acceptRelaySender`.
- **Ungated `Router`:** it is exported but constructed only by `router.test.ts`. `grep -rn "new Router" extension/src` →
  nothing.
- **`onMessage`:** it handles only `target:"sw"` frames from the offscreen URL with no `sender.tab`. `ws-message` goes to
  the router. `ws-status` only marks the reporter up or down and reads the state. Nothing writes storage
  (sw-static test `…the toggle stays off the wire`).
- **State writes:** `storage.local.set` appears in `sw.ts` only for the session marker and inside `SafetyStore` (deps).
  `toggle()` has no caller yet (S2b). No handler imports `safety-state.ts` (static test).
- **Pre-effect side effects:** `pageTab`/`targetTab`/`windows.get`/`tabs.query` read only. Every write
  (`ensureContent`, `callInPage`, `tabs.update/create/remove/goBack/goForward`, `showTab`, `captureVisibleTab`,
  `windows.update`, attach) is preceded by `call.effect()` or by the `withDebugger` guard. I checked every handler diff.
- **Own pages, other forms:** `chrome-extension://` with case changes, leading whitespace or `view-source:`/`blob:` wrapping
  is refused by S1's `innermostUrl`. `downloadStart` is http(s)-only by its own regex. Only the relative form (finding 1)
  gets through.

## 4. #137 / #139 / #144 item by item

| Item | Result | Evidence |
|---|---|---|
| receipt; effect before `showTab`, `captureVisibleTab`, `tabs.update/create/remove`, each `callInPage`, trusted input; post-check | met | handler diffs; `tabs.ts:207-211`; V16 (effect a no-op) → 7 failed; V17 (post ignored) → 3 failed |
| gone / replaced, V3 rows (armed, JS on, empty → unchanged) | met | `gated-router` "a tab gone during the call keeps today's reply (V3)"; `safety-call` post "…gone or replaced (V3)" |
| R2-1 last URL kept for a call | met (610 s, ≤ 1 000) | V8 → 3 failed; BM15 → 2 failed |
| `withDebugger` re-check, detach at disarm, detach error → `DISARMED` | met | V6 → 3 failed; V7 → 2 failed |
| per-tick re-check (locator, network-idle, seconds) | met | BM27 → 1 failed; `s2a-handlers` seconds tests |
| downloads cleared at disarm; late-fetch release | met | `onDisarm` → `clearDownloads()`; `call.onRefused(() => store.release(id))` |
| network ingest/query filter, pre-ready buffer, #155 own pages | met | V9 → 4 failed; V15 → 1 failed; `keepInQuery` via `tabUrlBlocked` |
| `listTabs`/event redaction as S3.md §7 expects | met | hidden rows drop `title`/`url` and add `hidden`; `tabRemoved` hidden; `tabCreated.url` `""` |
| capture verification (F11) | met (code `OFFSCREEN`, flagged contract-level) | V11 → 1 failed |
| own-page block; `chrome-extension://` refusal | **not met for relative URLs** | finding 1 |
| `downloadStart` final URL (#140, #154) | met | `checkFinalUrl` aborts the body; `s2a-handlers` 3 tests |
| #139 per-call read after `ready`, defaults, fail closed | met | V2 → 4 failed |
| #139 memory copy for webRequest only | deviation, flagged contract-level (memory disarm ANDed into `read()`, and it drives the session registry); stricter | builder decision 4 |
| #139 `setAccessLevel` after all listeners, guarded, not awaited | met | sw-static; `sw.ts:354-358` |
| #139 sender check: exactly `offscreen.html` + no `sender.tab` | met | V4 → 1 failed; `safety-call.ts:253-256` |
| #144 re-arm < 1 000 ms ignored; disarm never debounced; options setter not debounced; memory before write | met | V10 → 4 failed; V14 → 2 failed; `writeSafety` |

**Armed, JavaScript on, empty list (brief item 6).** These are the reply changes I found in that state, and the ruling that
covers each:
(i) this extension's own pages are refused or hidden (#138, #155);
(ii) `navigate`/`newTab` to any `chrome-extension://` URL is refused (#138);
(iii) `OFFSCREEN` when the window showed another tab at the capture (#137 item 5 / F11: "discard the image and refuse"; the
code itself is an open decision);
(iv) network events lost when the pre-ready buffer (2 000) overflows (F9's "bounded" buffer).
Changes that alter timing but not the reply: tab events now wait one `storage.local` read (in order); the `seconds` wait
runs in 100 ms ticks; every call costs one or more extra reads (S4 rows 5 and 8).
In failure modes only (a storage read fails): `listTabs` is refused (finding 2a), and the network log records nothing
(finding 6).
I found no change in that state that a ruling does not cover.

## 5. CLAUDE.md invariants (brief item 7)

- No top-level `await`: the AST test passes, and V12 → 2 failed; the grep gives 0, and 1 on the mutation.
- Listeners at the top level, `storage.onChanged` included: the sw-static test passes; V13 (wrapping it in a function) →
  1 failed.
- The content bundle is an IIFE (greps 0/0). `inject.ts`, `errors.ts` and `content/**` are not in the diff.
- `windows.update({focused:true})` appears only at `handlers/tabs.ts:71` (`focusTab`).
- New `console.*` lines: `git diff -U0 extension/src | grep -E '^\+.*console\.'` → only `"[bridge] connection: up"` and
  `"[bridge] connection: down"`, the existing lines re-indented with no argument added. `grep -n "console\."
  extension/src/safety-*.ts` → nothing.

## 6. New tests shown failing without their change (brief item 8)

Driver: `node scratchpad/s2av/mut.cjs [prefix]`. It applies one string mutation to the scratch copy, runs the named test
files, and restores the file. Afterwards, `diff -r -q` of the scratch copy against the main tree was empty. Output verbatim
(the first failing names abbreviated):

```
V1 receipt refusal ignored → gated-router: Tests 4 failed | 16 passed (20)   (S2.1: "disarmed: every one of the 23 methods … zero handlers"; "a handler that throws synchronously … never entered")
V2 unreadable state allows → safety-call gated-router: Tests 4 failed | 66 passed (70)   (fail closed: router, receipt, effect, post)
V3 GatedRouter.on accepts unclassified → gated-router: Tests 1 failed | 19 passed (20)   ("throws on an unclassified name and registers nothing")
V4 sender check ignores sender.tab → safety-call: Tests 1 failed | 49 passed (50)
V5 reporter does not reset on connection up → safety-state: Tests 35 passed (35)   ← survives (finding 5)
V6 killed session error keeps mapping → safety-debugger: Tests 3 failed | 11 passed (14)   (S2.2: detach-caused error → DISARMED)
V7 detachAll detaches nothing → safety-debugger: Tests 2 failed | 12 passed (14)   (S2.2: disarm detaches every session)
V8 retire keeps no URL (R2-1) → s2a-pure: Tests 3 failed | 6 passed (9)
V9 pre-ready events recorded blind → safety-network: Tests 4 failed | 13 passed (17)
V10 re-arm guard removed (#144) → safety-state: Tests 4 failed | 31 passed (35)
V11 capture not verified (F11) → s2a-handlers: Tests 1 failed | 13 passed (14)
V12 top-level await appended to sw.ts → sw-static: Tests 2 failed | 12 passed (14)   (S2.4 AST)
V13 storage.onChanged not top level → sw-static: Tests 1 failed | 13 passed (14)
V14 memory written after storage → safety-state: Tests 2 failed | 33 passed (35)
V15 network query ignores keep → safety-network: Tests 1 failed | 16 passed (17)
V16 effect never refuses → safety-call s2a-actions s2a-handlers: Tests 7 failed | 72 passed (79)
V17 post-check ignored in router → gated-router: Tests 3 failed | 17 passed (20)
V18 safetyState sent while down → safety-state: Tests 2 failed | 33 passed (35)   (pure safetyState send)
V19 safetyState frame leaks an extra field → safety-state: Tests 1 failed | 34 passed (35)
V20 listTabs post-checked → safety-call gated-router: Tests 70 passed (70)   ← near-equivalent (finding 5)
BM15 (builder's M15) seen URL not used for a gone tab → safety-call: Tests 2 failed | 48 passed (50)
BM22 (builder's M22) sw.ts constructs an ungated Router → sw-static: Tests 2 failed | 12 passed (14)
BM27 (builder's M27) locator wait without per-tick check → s2a-pure: Tests 1 failed | 8 passed (9)
```
That is 21 of 23 mutants killed, covering S2.1, S2.2, S2.4, `Router.on`, the sender check, fail-closed and the
`safetyState` send. The three builder mutations I re-ran reproduce: M15 gives the builder's exact numbers; M22 gives 2
failed here against the builder's 1, because my mutant also renames the construction, so it fails the second test as well.
M27 gives the builder's numbers.

## 7. Exit-check table

| ID | Result | Evidence |
|---|---|---|
| S2.1 (with #141: unknown method, bad JSON, synchronous throw) | PASS | gated-router S2.1 block; V1 → 4 failed; V17 → 3 failed |
| S2.2 (pure registry; disarm detaches all; refuses while refused; detach error → `DISARMED`) | PASS | safety-debugger; V6, V7 killed; M9 equivalent (finding 5) |
| S2.4 (content IIFE greps 0/0; AST test; grep 0 → 1 on the mutation) | PASS | §1; V12 → 2 failed; grep `1` on the mutation |
| `GatedRouter.on` throws on an unclassified name (test + mutation) | PASS | V3 → 1 failed |
| sender check tested | PASS | V4 → 1 failed; sw-static ordering test |
| fail closed on a state read error | PASS | V2 → 4 failed |
| `safetyState` send tested at the pure level | PASS | V18 → 2 failed, V19 → 1 failed (V5 survives, NIT) |
| every existing test unchanged | PASS | `git diff --stat -- extension/test daemon sdk mcp shared recipes` empty; 2525/2525 |
| no new `console.*` printing a pattern, URL or title | PASS | §5 |
| own-extension-page block / `chrome-extension://` refusal (deliverable 11, #138) | **FAIL** | finding 1 |

## 8. Proposed decisions and the `offscreen.ts` finding (brief item 9)

- Contract-level and marked: decision 4 (memory disarm wins) and decision 5 (`OFFSCREEN`). Both are correct to list for the
  user.
- Contract-level but **not** marked: the post-check on error replies; `listTabs` refused when the state is unreadable; the
  network ingest's drop-for-good rule; no report while unreadable (finding 2).
- Conflicts with a ruling: decision 4 departs from F10's wording ("the copy serves only the webRequest filter"). It is
  stricter, and it is flagged. "`listTabs` refused when unreadable" sits between #134 and #139 (finding 2a). I found no other
  conflicts.
- `offscreen.ts`: see finding 3. Pages cannot reach it. Content scripts can, and ours never do. The fix is cheap
  (`sender.tab` undefined) and needs no measured URL.

## 9. Verdict

**FAIL**: one CRITICAL finding (1), the own-page bypass through a relative URL. This is an integrity-floor item, so the
step agent must escalate it, not decide it. One deliverable check fails (#138's refusal), even though every pre-registered
exit check (S2.1, S2.2, S2.4 and the extra criteria) passes on its own terms. Findings 2–4 are MINOR and 5–8 are NIT. A
fixer round needs to re-check only finding 1 (the fix, a test failing without it, and an S4 row for Chrome's relative-URL
resolution), plus findings 2–4 if the step agent takes them.

## Round 2 (re-check after fixer r1, `S2a-fixer1.md`)

Scope: only the affected items (a)–(f) the step agent named. I followed the same hygiene as round 1. The main tree's
`git status --porcelain` and the sha256 of every modified and untracked file (this report excluded) were identical before
and after (`status-identical`, `hashes-identical`). The reverts ran on a second scratch copy of the current tree,
`…/scratchpad/s2av/repo2`, and afterwards `diff -rq` of that copy against the main tree printed nothing. I touched no
Chrome and bound nothing (`netstat -ano | grep -c ":9234 "` → `0`). I spawned no agents and committed nothing.

### R2.a Checks

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | `Test Files 106 passed (106)` · `Tests 2561 passed (2561)` |
| `npm run build` | exit 0; `git status --porcelain` unchanged |
| `grep -c '^import\b'` / `'^export\b' extension/dist/content.js` | `0` / `0` |
| `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` | `0` |
| `git diff --stat -- extension/test daemon sdk mcp shared recipes` | empty (no pre-S2a test file changed) |
| S2a's own 9 test files vs. my round-1 copy (`cmp`) | all 9 unchanged |
| source changed since round 1 (`diff -rq extension/src <round-1 copy>`) | `offscreen.ts`, `safety-call.ts`, `safety-state.ts`, plus the new `relay-sender.ts`; nothing else |

2525 + 36 (the one new file, `s2a-fixer1.test.ts`, which has 36 tests) = 2561 in 105 + 1 = 106 files. The count
reconciles. `relay-sender.ts` does not match `safety-*`, so S1's static scan adds nothing for it.

### R2.b Finding 1 (relative URL): fixed

I ran my probe on the new code, `node --import tsx probe/rel2.mts <repo>`, with block list `bank.example`. Each line shows
receipt/effect, and `navigate` and `newTab` gave identical results:
```
"/options.html" "../options.html" "options.html" "example.com" "//evil.example/x" "\options.html" " /options.html"
"\t/options.html" "%2Foptions.html" "?x" "#x" "chrome-extension:/options.html" "CHROME-EXTENSION://<ID>/options.html"
"http://exa mple.com" "http://[" "http:"                         = DOMAIN_BLOCKED/DOMAIN_BLOCKED (JS on and off)
"localhost:8080/x" "HTTP://LOCALHOST:8080/" "http:example.com" "about:blank" "file:///C:/x" ""  = allow/allow
"javascript:void 0" " JavaScript:void 0" "data:text/html,x" "blob:/x"  = allow (JS on) · DISARMED/evaluate (JS off)
"https://bank.example/" "bank.example"                            = DOMAIN_BLOCKED
"view-source:/options.html"                                       = allow (JS on and off)
```
- **The split between "absolute as written" and "resolved".** Every relative form I tried (leading slash, `../`, bare
  name, scheme-relative, backslash, leading whitespace or tab, percent-encoded slash, query or fragment only) resolves under
  `chrome-extension:` and is refused. Absolute URLs, `localhost:8080/x` among them (WHATWG and, as far as I know, GURL both
  read `localhost:` as its scheme), pass through as written. So no reply changes for them, and the `javascript:`/`data:`/
  `blob:` checks still see the caller's string.
- **Residual: `view-source:/options.html` is allowed** (WHATWG: absolute). S1's unwrapping reaches `/options.html`, which has
  no scheme, so nothing matches. Whether Chrome's tabs API opens a `view-source:` URL with a relative inner URL, and against
  which base, is unmeasured. At worst it shows the page's source, not a live page that takes input, and every later call on
  that tab is tested by its URL. → finding R2-2 (NIT).
- **"Unparseable → refused" while armed with an empty list.** This changes a reply only for strings that WHATWG rejects
  outright (`http://exa mple.com`, `http://[`, `http:`). Before the fix, Chrome resolved such a string under the extension
  if GURL also rejected it; if GURL accepted one that WHATWG rejects, the call would have navigated to a web URL. That
  pre-fix answer is unmeasured. The refusal is stricter and comes from #138 under the fixer's documented reading of Chrome.
  It is contract-level ("a code chosen for a refusal"), and the fixer listed it so. → finding R2-1 (MINOR).
- **Red without the fix.** I reverted the hunk on the scratch copy (`node scratchpad/s2av/mut2.cjs`): `openTarget` returns
  `ownTarget` raw (the pre-fix behaviour). Result: `Tests 18 failed | 18 passed (36)`, which is the 16 receipt/effect tests
  plus the 2 `callTargets` resolution tests. Reverting only the "unparseable → base" branch to "→ as written" gave
  `1 failed | 35 passed (36)`.

### R2.c Finding 3 (offscreen sender): fixed

- `relay-sender.ts` accepts only `sender.tab === undefined && sender.id === runtimeId`, with a non-empty id. In
  `offscreen.ts` the check is the listener's first statement, before `msg?.target`.
- The worker→offscreen path: a service-worker sender has no `tab`, and its `id` is this extension's (Chrome's
  `MessageSender.id` is set for every extension context). So `connect`/`send` from `sw.ts` still pass. That is from the
  documentation, not measured; SAFE-0 is the live proof (a dropped `connect` shows up as every call ending in `TIMEOUT`).
  A rejected sender gets `return false` and no response, which affects only non-worker callers.
- The offscreen document never receives its own messages (`runtime.sendMessage` is not delivered to the sending frame), so
  its `ws-message`/`ws-status` posts are unaffected. They are checked on the worker side by `acceptRelaySender`.
- Red without the fix: predicate made to return `true` → `1 failed | 35 passed (36)`; the check line removed from
  `offscreen.ts` → `1 failed | 35 passed (36)` (static test).

### R2.d Finding 4 (failed disarm write): fixed

`writeDisarm()` retries once and then returns `"write-failed"`. The memory copy, `onDisarm`, `lastDisarmAt`, `read()` and
`ingestView()` all stay disarmed, and no path re-arms memory. Red without the fix: pre-fix single write that rejects →
`4 failed | 32 passed (36)`; memory re-armed on failure → `3 failed | 33 passed (36)`. The fixer's remaining case is a
failed **arm** write: memory is armed, storage still says disarmed, `toggle()` rejects, calls stay refused, and the ingest
records. That errs toward the human's intent (they pressed ON). S2b must show a rejection as "still OFF". → finding R2-3
(NIT).

### R2.e Finding 5 (surviving mutants): closed

On the current code, V5 (`connectionUp` keeps `last`) → `1 failed | 35 passed (36)`, and V20 (`listTabs` post-checked) →
`1 failed | 35 passed (36)`. The outcome pinned for V20 (`listTabs` is never refused at the post-check, even when the state
turns unreadable mid-call) follows #134 and S1's handoff. The fixer lists it with finding 2a for the user. Agreed.

### R2.f Finding 6 (`start()` retry): fixed

`read()` fills a null memory copy from the raw stored values, before decision 4's AND, with `source:"load"`: `onDisarm`
runs for a stored disarm, and the re-arm guard clock does not start. The check and the `apply` run synchronously after the
await, so a concurrent toggle cannot be overwritten. Held network events are decided at the next `offer`, which flushes
first. Red without the fix: fill line removed → `2 failed | 34 passed (36)`.

### Round 2 findings

- **R2-1 · MINOR · the "unparseable → refused" rule is contract-level** (`extension/src/safety-call.ts`, `resolveOpenUrl`,
  its catch → `base`). It changes replies while armed with an empty list for WHATWG-unparseable `navigate`/`newTab`
  strings, and Chrome's pre-fix answer for them is unmeasured. Fix: no code. The step agent lists it under Open decisions
  (the fixer proposed it as such), and SAFE-REL-2 also reads `http://exa mple.com`.
- **R2-2 · NIT · `view-source:` with a relative inner URL is allowed** (probe above). Suggested: an S4 note, or resolve
  the inner URL of a `view-source:` the same way.
- **R2-3 · NIT · a failed arm write rejects with memory armed while storage is disarmed** (`safety-state.ts`
  `toggleOnce`). This is for the S2b brief, which must show it as "still OFF".

Round-1 findings 2, 7 and 8 stay open as notes; the step agent ruled them no-code. Finding 1 (CRITICAL) is fixed for every
form I could construct. Its only residuals are a WHATWG/GURL disagreement and `view-source:`, both unmeasured, both
landing on a tab that every later call refuses.

### Round 2 verdict

**PASS-with-notes.** No CRITICAL or MAJOR finding remains, and every exit check passes, including #138's refusal for
relative URLs. One MINOR (R2-1) and two NITs (R2-2, R2-3) are left for the step agent's Open decisions and the S4/S2b
briefs.
