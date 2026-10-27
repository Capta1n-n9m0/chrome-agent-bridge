# Step 11b — The block list stops redirected requests (`declarativeNetRequest` session rules)

**Date:** 2026-10-26 · **Status:** Built (Stage 0 → S5, 2026-10-26/27); Run 17 stopped at a pre-registered STOP that predates Step 11b (#307, #308); **Closed 2026-10-27** (#311, #320): S6, Run 17b (S7) and S8 built; D7.6 not met, accepted by the user (#318 (a)); the helper fixes go to Step 12 (kickoff was `docs/plans/next-session-prompt.md`)
**Design of record:** this doc's "Decisions"; the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
binds for everything it does not change (§6.5 the human, §10 protocol and codes, with the Step 9–11 dated notes) ·
**Roadmap:** decisions.md · 2026-10-24 · The roadmap after Step 8 (#129), as amended by · 2026-10-25 · The user rules on
Step 10's open decisions; Step 10 closes (#229): "its own small step after Step 11, before Step 12". Neither entry gives
it a number, so it is **Step 11b**; Step 12 (Phase F) keeps its number · **Steps dir:**
`docs/plans/2026-10-26-step11b-block-list-redirects-steps/` (created at kickoff).

> **PRECONDITION — Step 11b starts only after the user has ruled Step 11's gate**: the gate checklist in
> `docs/plans/2026-10-25-step11-file-upload.md` § As built (S5.5 not met, S5.6 part, the #283 STOP rule triggered) and
> the Step 11 list under `docs/decisions.md` → Open decisions. Step 11b edits `extension/src/safety*.ts`,
> `extension/manifest.json` and `sw.ts`, which a Step 11 ruling could also reopen; building on an unruled gate would
> stack a second safety change on an unaccepted one. The user also rules this doc's two **user-gated** proposals, 0.3
> (the permission) and 0.4 (which requests the rule covers), before Stage 0 (human gate G11b-0). If either ruling is
> missing, the session agent stops before Stage 0, writes one line in the run journal and asks the user. Modelled on
> how Step 11 made Step 10's rulings its precondition.

*Met 2026-10-26: the user ruled Step 11's gate (decisions.md · 2026-10-26 · The user rules Step 11's gate; Step 11
closes (#288)), 0.3 (A) and 0.4 (C) (#290), and how agents run (#289). #288's three code changes join this step as
stage S0F (0.11); #290 adds four DNR checks to Stage 0, at the user's request to be careful that DNR does this job
under MV3.*

## Why

Step 9 made the human's block list refuse every bridge call on a blocked site, but it checks addresses, not the
network. When an allowed address answers with a redirect onto a blocked host, Chrome follows the hop before any check
can run: a bridge `navigate` loads the blocked page with the profile's cookies, and a `downloadStart` sends the
blocked host a GET with those cookies. The post-check then refuses the reply and a download drops its bytes, but the
request has been sent — a side effect the bridge cannot undo. The limit is measured: Run 13 SAFE-5b (the page on the
blocked port was loaded) and Run 14 R14-5c (the hop and the target each requested once), and it stands in
`extension/CLAUDE.md` § Safety gate as "The block list is not a network firewall".

An open redirector on an allowed site is exactly what a page that has talked an agent into something (prompt
injection) would use to reach a site the human blocked. decisions.md · 2026-10-24 · `downloadStart` and redirects
onto a blocked host (#140) named the fix — a `declarativeNetRequest` (DNR) session rule that blocks requests to
blocked hosts inside Chrome's network stack, under a new manifest permission — and left it for a later step; #202
ratified that, and #229 placed it here.

## Outcome (planned)

- A redirect hop of a bridge `navigate`, `newTab` or `downloadStart` onto a host the human's block list matches is
  never sent: the blocked server's log shows 0 requests (today 1), measured live on fixture servers only.
- The rules are derived from the same parsed list the gate uses (`parseBlockList`, `safety-match.ts`), rebuilt when
  `storage.onChanged` touches the list, cleared at worker start, and fail closed: a call whose rules cannot be put in
  place is refused before its first side effect.
- The bridge's answers do not change: the codes, messages and `data` of SAFE-5b and R14-5c stay as recorded; only the
  server-side count changes. No new code, method, tool or SDK signature (27 codes, 27 router methods, 24 tools stay).
- One new manifest permission, `declarativeNetRequestWithHostAccess` (0.3), pinned by `manifest.test.ts`.
- The human's own browsing does not change (0.4 (C), ruled).
- Step 11's follow-ups (S0F, 0.11): a home folder or a folder holding home folders is refused as an Upload folder; an
  upload of a missing file is refused by the extension, the page receiving nothing; a `file:` tab is listed hidden.

## Decisions

**(user)** marks a choice the user already ruled (cited by date + title). **(proposed)** marks Claude's proposal,
recorded by the session agent in `docs/decisions.md` before Stage 0 so the audit can attack it.
**Contract-level** ones are also listed under Open decisions; the two marked **user-gated** are ruled before Stage 0
(G11b-0), because a conservative default does not exist for them (not building is the only conservative choice).

### 0.1 Precondition, name and order (proposed)

The box at the top. Order: Stage 0 → S0F (Step 11's follow-ups, 0.11) → S1 (the rule builder, pure) → S2 (the rule keeper, pure) → S3 (the wiring and the
manifest) → S4 Run 17 in slices → S5 docs. No stage runs in parallel: S2 consumes S1's output, S3 both.

### 0.2 What is built (user — the what; proposed — the shape)

decisions.md · 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140), ruled by #202 and placed by
#229: a DNR session rule set that blocks requests to blocked hosts, so a hop of a bridge `navigate` or `downloadStart`
is never sent. *Proposed:* `newTab` with a URL is covered too, since it opens an address the same way `navigate` does
and #140's reason applies to it word for word. Session rules, not dynamic or static ones: they live in memory and
are lost on a browser restart and on an extension update (source below), so a stale rule can never outlive the
human's state across a restart; the worker rebuilds them anyway (0.5).

**External facts (the one search; source: Chrome for Developers, `chrome.declarativeNetRequest` API reference,
https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest, read 2026-10-26):**
`updateSessionRules` removes first, then adds, atomically; on an invalid rule, a duplicate id or the count limit it
rejects and leaves the rule set unchanged; session rules are capped at 5000 (`MAX_NUMBER_OF_SESSION_RULES`, Chrome
120+) and are not persisted. **Not confirmed by the search, so Stage 0 measures them:** whether a rule applies to a
redirect hop (expected: each hop is a new request evaluated by the rules); whether rules apply to this extension's
own `fetch` from the service worker; the `tabIds` condition (expected session-only, with `-1` for requests outside a
tab); `initiatorDomains` against a `chrome-extension://` initiator; the resource type of a worker `fetch`; the regex
rule cap and RE2 syntax; what `navigate`'s tab URL is after a blocked main frame.

### 0.3 The new permission and the manifest test (user — (A), #290)

- **(A) `declarativeNetRequestWithHostAccess` (recommended).** Rules act only where the extension has host access; it
  has `<all_urls>` already, so it adds no install warning. #140 named it.
- (B) `declarativeNetRequest`: adds the warning "Block content on any page"; nothing gained over (A).
- (C) `declarativeNetRequestFeedback` in addition: only to read which rule matched (`onRuleMatchedDebug`, unpacked
  extensions only). Not proposed; 0.6 answers without it.

`extension/test/manifest.test.ts` pins today's permissions exactly. S3 changes its expectation to today's list plus
the one permission, with a dated header note citing this decision, and adds a test that no other key changed and that
`declarative_net_request` (static rule sets) is absent. Adding the permission requires one extension reload, done by
`recipes/reload-extension.ps1` (#65); an unpacked extension shows no permission prompt.

### 0.4 Which requests the rule covers (user — (C), #290)

The question is whether the block list becomes a firewall for the human's own browsing.
- **(A) Every request in the profile.** One rule set with no tab condition: the human's tabs, every page's
  subresources, every site's service worker. Strongest, simplest rules, but the human's browsing changes: a blocked
  site no longer loads anywhere in Chrome, for the human too. That is a new product promise (the options page says
  the list governs the bridge) and needs the user's ruling and an options-page text change.
- **(B) Every request of the tabs the bridge holds, all the time.** The extension does not know leases (the daemon
  holds them), so it would need a new "bridge tabs" set fed by the calls it sees; a human's tab claimed by
  `browser_use_active_tab` would then be filtered while claimed and after. A new state to keep right, for coverage
  #140 did not ask for.
- **(C) Only the requests of a bridge call in flight (recommended).** A `navigate` or `newTab` installs, right before
  its first side effect, rules scoped to that tab (`tabIds: [tabId]`, `resourceTypes: ["main_frame"]`) and removes
  them after its post-check; a `downloadStart` installs rules scoped to requests outside any tab and initiated by this
  extension (`tabIds: [-1]` and `initiatorDomains: [<own id>]`, if Stage 0 shows they match the worker's `fetch`) for
  the life of its fetch. This is exactly #140's two hops (plus `newTab`, 0.2). The human's browsing is unchanged,
  except a human's tab that a bridge `navigate` is loading during that call. Later loads the page itself starts (a
  script redirect, a click) are not covered: the gate's per-call checks still refuse every later call on that tab.

*Ruled (C)* (#290). The conservative choice is the narrowest rule that does #140's job and changes no answer and no
human-visible behaviour. (A) is offered as the alternative if the user wants the list to be a firewall for the whole
profile; it would add an options-page sentence and a live row on a tab the wave opened by hand.

If Stage 0 finds that DNR does not apply to the extension's own `fetch`, the download half cannot be built with DNR:
that is a recorded finding, the download limit stays documented, and the `navigate`/`newTab` half proceeds (a proposed
decision at Stage 0, not a STOP).

### 0.5 How the rule set stays equal to the block list (proposed — contract-level, safety)

- **One source.** The rules are a pure function of the `BlockList` the call's own gate read produced
  (`SafetyView.ctx`), never of the options text parsed a second way. S1's builder maps each `HostPattern` to rules
  that block exactly what `patternMatches` blocks: a host and its subdomains (dot boundary only), `*.host` subdomains
  only, `:port` that effective port only (a default port written or omitted), an IP literal only itself. Plain hosts
  without a port use `requestDomains` (Chrome's documented domain-or-subdomain match); `*.`, ports and IP literals use
  an anchored `regexFilter` in RE2 syntax. Invalid and ignored lines make no rule, as they block nothing today.
- **Per call.** Each covered call owns a rule-id range; its rules are added before its first side effect (inside the
  existing `effect()` step, after the gate's re-check) and removed after the post-check, on every path (success,
  refusal, error, timeout, disarm).
- **On change.** When `storage.onChanged` touches `safety.blockList` (or makes the state unreadable), the keeper
  rebuilds every live call's rules from the new list in one atomic `updateSessionRules`. The existing top-level
  listener in `sw.ts` calls it; no new listener, no top-level `await`.
- **At worker start.** Every session rule this extension holds is removed (a worker culled mid-call leaves orphans;
  no call survives a worker restart), before the router serves its first call: a call waits on that `ready`, as it
  waits on the safety state's.
- **Fails closed.** A rule update that rejects (invalid rule, the count cap, a missing API) refuses the call before its
  first side effect with the existing `stateUnreadableRefusal()` (`DISARMED {scope:"all"}`, `STATE_UNREADABLE_MESSAGE`),
  as an unreadable state does (#139) — no new code. A rebuild on change that rejects marks the keeper unsynced: every
  live covered call is aborted with that refusal and new covered calls are refused until a rebuild succeeds. A list
  with more patterns than the caps allow is the same case; the options page may warn (0.9).
- **Disarm.** Disarm already refuses every call; the keeper removes every rule in `onDisarm`. *Superseded
  2026-10-26 (#296): a disarm does not lift a running call's rules; `sweep()` removes only orphans.*

*Instead of:* standing rules for the whole list rebuilt on change (that is 0.4 (A) or (B)); a cache of the list in the
keeper (two sources); failing open when the API rejects.

### 0.6 What the bridge answers when a hop is blocked (proposed — contract-level)

Today's answers stay, so every test, row and client line stays valid:
- **`newTab`:** its post-check is the state only (`safety.ts` header), so today a redirected `newTab` answers as an
  allowed one; it keeps that answer (the tab now shows Chrome's blocked-request page, and every later call on it is
  refused by the gate). Stage 0 records today's exact answer; RD-2 expects it.
- **`navigate`:** Chrome shows its blocked-request error page; the post-check reads the tab's URL and
  answers `DOMAIN_BLOCKED` with one of the two existing block messages, no `data`, as SAFE-5b's expected text already
  allows. Stage 0 measures what `tab.url` reads after a blocked main frame; if it is not the blocked URL (for example
  `chrome-error://`), S3 makes the post-check use the navigation's last committed or attempted URL — a proposed
  decision at Stage 0, never `NAV_FAILED` with Chrome's raw text.
- **`downloadStart`:** a blocked hop makes `fetch` reject (a network error, no final URL). The handler answers
  `DOMAIN_BLOCKED` with R14-5c's exact text when the call's own rules blocked it; S3 decides "its own rules blocked
  it" by a `webRequest.onErrorOccurred` event with `net::ERR_BLOCKED_BY_CLIENT` for a request outside any tab during
  the fetch whose URL the call's list blocks (the observers exist; the URL is tested in memory, never stored or logged).
  Any other fetch failure keeps today's answer. If Stage 0 shows the worker's own requests do not reach its
  `webRequest`, the fallback is: a fetch failure while the call's rules were non-empty answers `DOMAIN_BLOCKED` only if
  the request URL's own host is not blocked and a re-check finds no other cause — that fallback is a Stage 0 proposed
  decision, flagged, since it may misname a genuine network error. *Note 2026-10-26: the fallback was dropped
  (#296: the worker's requests do reach `webRequest`); the recognition as built is #303.*

*Instead of:* a new code (`REDIRECT_BLOCKED`) — a wire change for no new information; `NAV_FAILED` with Chrome's
`net::ERR_BLOCKED_BY_CLIENT` — exposes a Chrome detail and breaks SAFE-5b's text.

### 0.7 Redirects onto this extension's pages and onto `file:` (proposed)

No rule is added for either. Chrome itself refuses a web page's redirect onto an extension page that is not
web-accessible (this extension declares none) and an http(s) redirect onto `file:`; `fetch` treats a redirect to a
non-http(s) scheme as a network error. The gate's post-check already refuses an own page (#134, #155) and a `file:`
page (decisions.md · 2026-10-25 · Stage 0: uploads need Chrome's file access, and the bridge never opens or reads
`file:` pages (#245)). Stage 0 confirms the Chrome behaviour by reading; Run 17 records it (RD-7, RD-8). If Chrome
followed either, that is a STOP (a gap in #245), not a rule added in a code stage.

### 0.8 Logging (proposed)

The rules contain the patterns, so nothing logs a rule, a rule's filter, a `getSessionRules` result, a URL or the
error text of a rejected update (Chrome's text may quote a rule). At most one new fixed log line, with counts only
(`[bridge] safety rules: <n> active` or none at all), added to `extension/test/log-allowlist.ts`, so the log-scan
count grows by at most 1 (S3's report states the number from `npm test`). The rule builder and keeper modules have no
log call. Nothing on the wire reads the rules; `daemon.status` and `safetyState` are unchanged.

### 0.9 Not in Step 11b (proposed)

The profile-wide firewall (0.4 (A)) unless ruled; requests a page starts after a bridge call ends; WebSocket hops; a
redirect loop's other hosts (each hop is checked by the same rules anyway); `declarativeNetRequestFeedback`; an
options-page line about the caps (only if S1 shows realistic lists can reach them; otherwise a follow-up).

### 0.10 Run 17 — the live rows (proposed)

New `docs/e2e-test-plan.md` §4.24 (Stage 0 checks the next free number), rows with expected text committed before the
build is loaded. Fixture pages and the threaded redirect server `recipes/s9-redirect.py` only (port 8083, #197; its
target origin is its second argument); fixture ports picked by `netstat` at S4-sheet (8080 may be held, #273). The
"blocked origin" is a fixture port the wave puts on the list in its own options window, as Runs 13–16 did.
- **RD-0** found state (armed, JavaScript, the block list and upload folders counted and hashed, never printed); the
  loaded-build proof (the extension's manifest permissions read in a window the wave opened).
- **RD-CTL** the redirect server's concurrency control, as R14-5c-ctl.
- **RD-1** `navigate` to an allowed 8083 URL that redirects onto the blocked fixture port: `DOMAIN_BLOCKED`, existing
  message, no `data`; 8083 log 1 hit, **blocked port 0 hits** (SAFE-5b recorded 1).
- **RD-2** `newTab` the same way, its own query tag: the answer Stage 0 recorded for today (0.6), then a `snapshot`
  on the new tab refused `DOMAIN_BLOCKED` or the tab shown as Chrome's error page; 8083 log 1, blocked port 0 hits.
- **RD-3** `downloadStart` (SDK `downloadToFile`) as R14-5c's redirect leg: R14-5c's exact text, no file, **8083 = 1,
  blocked port = 0** (R14-5c recorded 1). The direct leg as R14-5c's control.
- **RD-4** the list emptied, then RD-1's URL again through the bridge: loads, blocked-port log 1 (the rules follow the
  list; the rule is not stuck).
- **RD-5** a pattern added and a `navigate` sent within the same second: refused, 0 hits (no stale-rule window).
- **RD-6** the human's browsing unchanged (0.4 (C)): after RD-1, a page load through 8083 in a tab of a window the wave
  opened outside the bridge (by its own UI Automation) reaches the blocked port, log 1. If the user rules 0.4 (A), the
  expectation flips to 0 hits, written before the run.
- **RD-7** (RECORD) the redirect server pointed at this extension's `options.html`: the answer and the page as Chrome
  leaves them. **RD-8** (RECORD) pointed at a `file:` URL of a wave-made file: same.
- **F-HOME** (S0F) the options page refuses `C:\Users\fixture-home` and `C:\Users` as invalid lines, nothing stored by
  typing; **F-RAW** (S0F, re-runs UP-RAW) a raw `uploadFiles` of a missing file inside an allowed folder: the
  pre-written refusal, page reporter 0 files; **F-FILETAB** (S0F) a `file:` tab the wave opened by hand is listed with
  `hidden` and no `url`, and every call on it is refused.
- **Carried from Run 16 (#288):** UP-L1, UP-6, UP-7 and SAVE-REFUSE-R re-run with the worker console captured from
  before the first row; UP-OPT; UP-RACE-A with per-call times; UP-DEVT with DevTools proven open. New rows with their
  own ids, Run 16's record untouched.
- **RD-LOGS** `daemon.log`, the worker console and actor output: 0 for the token, the test patterns, a non-fixture
  `scheme://host`, by count. **RD-RESTORE** the found state read back by hash.
- SAFE-5b's and R14-5c's records are untouched; these rows are new.

### 0.11 Step 11's follow-ups — stage S0F (user — the what, #288; proposed — the how)

- **Home folders refused (#288 3b, changes #250).** `holdsHome` (`extension/src/options-model.ts`) today warns; the line
  becomes **invalid** with its own reason text (naming no path), counted with the invalid lines, never stored as a used
  folder. The gate's matcher (`extension/src/upload-paths.ts`) applies the same rule to the stored lines, so a home line
  already in storage is never used (fails closed): one shared pure predicate, failing tests first, both callers. The
  `.ssh` warning stays a warning. The options page's standing text and `docs/setup.md` say so.
- **A missing file is an error (#288 3c, changes #284).** The extension refuses an upload whose file does not exist,
  and the page receives no file. Stage 0 measures two ways, preferring the first: (i) **before** the attach, a check of
  each path from an extension context (the offscreen document; `file:` access is already required by #245 (b)),
  reading no more of the file than the check needs; (ii) **after** `DOM.setFileInputFiles`, reading one byte of each
  `File` in the isolated world (a missing file's read rejects), then clearing the input with
  `DOM.setFileInputFiles {files: []}` — (ii) lets the page see a `change` event, so it is the fallback only. The answer
  is `BAD_PARAMS` with a fixed message naming the entry's index, never the path (as the SDK preflight, #262). If
  neither works, that is a recorded finding for the user (not a STOP), and UP-RAW stays a documented limit.
- **`file:` tabs listed hidden (#288 3d, changes #259).** A `listTabs` row and every tab event of a `file:` tab drop
  `title` and `url` and carry `hidden`, as a blocked tab's do (#134, `extension/src/handlers/tabs.ts`); the `hidden`
  reason reuses the blocked one unless Stage 0 shows a client needs to tell them apart (then a new `HiddenReason` value
  is a proposed decision). `navigate`/`newTab` to `file:` is already refused (#245 (a)).

## Stages

*Note 2026-10-26 (after Stage 0, #295, #296):* `newTab` is **not** covered in this build (#295; RD-2 becomes a RECORD
row of today's leak); `back`/`forward` carry the tab rule; S0F runs as **S0F-a** (home predicate, `file:` rows hidden,
the tool's background-tab sentence, the spec note) and **S0F-b** (the missing-file check from the worker); S3 runs as
**S3a** (manifest, `sw.ts` keeper and start-up clear, `safety-call.ts` install/remove for `navigate`/`back`/`forward`)
and **S3b** (the download half: typed rules, `onErrorOccurred` before `ingest`, `download.ts`'s mapping; the options
page's caps warning). 0.9 gains Stage 0's blind spots (F22). D3.3's `<start>` is S3a's start commit. S1 consumes
`…-steps/stage0-s1-cases.md` with `Stage0.md` §6 item 7.

**Lane** is the explicit grant a step agent needs (`docs/agent-rules.md` §3 item 5). **Risk** per `agent-rules.md` §7:
every code stage here is on the safety side, so **standard**. Models, effort and the size cap: `agent-rules.md` §7
(#289, #271). **Verifier focus** adds to `agent-rules.md` §6 and the stage's exit checks.

### Stage 0 — Spec audit (1.5 h, first, alone; risk: standard)
- [ ] Four lenses over this doc, as Step 11's Stage 0: cited files and functions **executed**; counts recomputed
      (27 router methods, 27 codes (26 on the wire), 24 tools, the test count and log-scan count from `npm test` at the
      start commit); blind spots extended; every exit check executable and discriminating. Output
      `…-steps/stage0-audit.md`, findings tagged plan-side (a dated note here) or code-side.
- [ ] The DNR facts of 0.2's "not confirmed" list, measured on a scratch unpacked test extension in a window the
      wave opens (never the bridge's own profile state) or, where only reading is possible, cited with a source:
      redirect hops, the extension's own `fetch`, `tabIds` (including `-1`), `initiatorDomains` with a
      `chrome-extension://` initiator, the worker `fetch`'s resource type, the regex cap and syntax, `tab.url` after a
      blocked main frame, `onErrorOccurred` for the worker's own request. Each fact is recorded with how it was
      obtained. Re-running Step 9's and Step 11's binding contracts on port 0.
- [ ] **#290's four MV3 checks, measured, never read off a page:** (1) a session rule with `tabIds` and
      `resourceTypes: ["main_frame"]` blocks a redirect hop of a navigation started by `chrome.tabs.update`; (2) the rule
      is in force when `updateSessionRules` resolves, before the navigation starts; (3) whether a rule matches the
      worker's own `fetch` (the download half, 0.4's last paragraph); (4) the rule and regex limits against the
      largest list the matcher accepts. **(1) or (2) failing is a STOP for the user** (DNR cannot do this step's job).
- [ ] S0F's how (0.11): which of 3c's two checks works (measured), the `hidden` reason, the shared home predicate's case
      table (Windows and POSIX, the parents `X:\Users`, `/home`, `/Users`, `/root`).
- [ ] S1's translation case table drafted from `safety-match.test.ts`'s 50 cases plus the port, IP and `*.` cases.
**Lane:** the steps dir; a scratch test extension outside the repo; read-only elsewhere; port 0 only.
**Verifier focus:** re-execute five findings; each DNR fact's evidence is a measurement or a cited source, never a
belief; 0.4 (C)'s conditions confirmed or the download half's fallback proposed.

### S0F — Step 11's follow-ups (2 h, after Stage 0; risk: standard; ≤ ~500 lines; split if larger, §7)
- [ ] 0.11's three changes, failing tests first: the shared home-folder predicate and both callers; the missing-file
      refusal by Stage 0's chosen check (its pure part tested; the `chrome.*` glue by Run 17's rows); `file:` rows and
      events hidden. Carried from Step 11 (#287): `browser_upload_file`'s description gains the background-tab sentence
      UP-1 allows, re-baselining that one schema entry (#214) and setup.md's quote.
- [ ] Spec §10 dated note for the `file:` row hiding and the missing-file refusal, before the code commit.
**Lane:** `extension/src/{options-model,upload-paths,safety,safety-call}.ts`, `extension/src/handlers/{upload,tabs}.ts`,
`extension/src/content/upload-*.ts`, `extension/src/offscreen*.ts` if 3c (i), `mcp/src/tools*` (the description only),
their tests, the #214 baseline, `docs/setup.md` (the quoted lines only), the spec §10 note. **Verifier focus:** a home
line in storage is never used (a mutant that checks only the options page goes red); a missing file leaves the page
with 0 files on the chosen path; no path in any message or log; `listTabs` of a `file:` tab carries no `url`.

### S1 — The rule builder, pure (1.5 h, after Stage 0; risk: standard; ≤ ~400 lines)
- [ ] `extension/src/safety-dnr.ts`: `rulesOf(list: BlockList, scope, idBase)` → DNR rules; no `chrome.*`, no log.
      Failing tests first: the case table; an **equivalence test** that, for every case URL, the rules' match (the
      `requestDomains` rule by Chrome's documented domain-or-subdomain semantics, the regex by running it) equals
      `isUrlBlocked`; an RE2-subset guard (no lookaround, no backreference); a cap test (rule count and regex count
      against the measured limits).
**Lane:** `extension/src/safety-dnr.ts`, `extension/test/safety-dnr*.test.ts`. **Verifier focus:** three mutants red
(a dot-less suffix, a port ignored, `*.` matching the bare host); no pattern string outside the rule objects.

### S2 — The rule keeper, pure (1.5 h, after S1; risk: standard; ≤ ~500 lines)
- [ ] `extension/src/safety-dnr-keeper.ts`: per-call id ranges, install/remove, rebuild on change, the start-up clear,
      the unsynced state, the disarm clear; `updateSessionRules`/`getSessionRules` injected. Failing tests first:
      removal on every path; a rejecting update refuses with `stateUnreadableRefusal()` before the effect; a rebuild
      that rejects aborts live calls and refuses new ones until a rebuild succeeds; concurrent calls never share or
      leak ids; a list change during a call rebuilds that call's rules.
**Lane:** `extension/src/safety-dnr-keeper.ts`, its tests. **Verifier focus:** fail-closed paths by mutant (an update
error swallowed must turn a test red); no rule left after any path (a fake that counts rules).

### S3 — Wiring and the manifest (2 h, after S2; risk: standard; ≤ ~400 lines)
- [ ] Spec §10 dated note first (no new code or method; the block list now stops a covered call's redirect hops).
- [ ] `manifest.json` gains `declarativeNetRequestWithHostAccess` (0.3); `manifest.test.ts` re-pinned with a dated
      note. `sw.ts`: the keeper constructed at the top level, the start-up clear behind a `ready`, the rebuild inside
      the existing safety `storage.onChanged` listener, the disarm clear in `onDisarm`. `safety-call.ts`: install in
      `effect()` for `navigate`/`newTab`/`downloadStart`, remove after the post-check. `handlers/download.ts`: 0.6's
      `DOMAIN_BLOCKED` mapping. The post-check change of 0.6 only if Stage 0 requires it. The log allowlist (0.8).
- [ ] `docs/e2e-test-plan.md` §4.24 placeholders for the glue the unit tests cannot reach (filled at S4-sheet).
**Lane:** `extension/manifest.json`, `extension/src/{sw,safety-call,safety}.ts`, `extension/src/handlers/{download,
navigate,tabs}.ts`, `extension/test/`, the spec §10 note. Daemon, SDK, MCP, `shared/` untouched (`git diff` empty).
**Verifier focus:** no new top-level `await`; the listener count in `sw.ts` unchanged; every existing safety test and
SAFE-5b/R14-5c expected text unchanged; the log-scan count +0 or +1; the router-scan test passes unchanged.

### S4 — Run 17 (live), in slices (1 h prep + 1 h live; risk: prep low, live standard)
Slices, one step agent each (#271): **S4-sheet** (§4.24 rows of 0.10 with expected text, committed before any
observation; the ports by `netstat`) → **S4-helpers** (`recipes/s11b*` from Run 14's `s9-r14.ps1` and `s9.ts` where
they fit, their rule tests, a `recipes/tsconfig.s11b.json` if new TypeScript; `s9-redirect.py` unchanged unless RD-7/8
need a target form it lacks, then a tested change) → **S4-live** (main-tree `npm run build` of committed code, the
reload script, the loaded-build proof first; the rows; the restore; returns on every STOP line, #193) →
**S4-record** (the record `…-steps/S4-run-record.md`, §5 Run 17, a fresh verifier against the pre-written text).
**Lane:** `recipes/s11b*`, `recipes/test/s11b-*`, `test-fixtures/s11b-*` if any, `docs/e2e-test-plan.md` §4.24 and
§5, the steps dir. **No product code.** **Verifier focus:** server-log counts are the evidence, never an `ok`;
restore read back by hash; no test pattern in committed evidence.

### S5 — Docs (45 min, last; risk: low)
- [ ] `docs/setup.md` Safety section (what the list now stops, and what it still does not: 0.4's scope), the roadmap
      block, `README.md` if it states the limit; `extension/CLAUDE.md` bullet "The block list is not a network
      firewall" rewritten from Run 17's measurements and Key-files lines — as proposals in
      `…-steps/S5-claude-md-proposals.md` for the session agent.
**Lane:** docs only. **Verifier focus:** every changed sentence about the limit cites a Run 17 row.

### Stages added by the gate ruling (#311, 2026-10-27)
Written by the session agent after the user's ruling, before any S6 or S7 work. Models, effort, lanes and sizes as
above. Sequential: S6 → S7-sheet → S7-helpers → S7-live → S7-record → S8.

### S6 — `newTab` on `about:blank` (1.5 h; risk: standard; ≤ ~400 lines)
- [ ] `newTab` with a URL that is not `about:blank`: the gate's checks on the URL Chrome will open run first, unchanged
      (#175); then the tab is created on `about:blank`, its tab rules are installed through the keeper exactly as for
      `navigate`, then the tab is navigated to the URL, waited for as today, and the rules released on every path.
      `newTab` without a URL, or with `about:blank`, is unchanged. The sequence is Stage 0's (#295 (a); `Stage0.md`,
      the `newTab` finding; `stage0-dnr-newtab.txt`).
- [ ] Fail closed (0.5, #292): if the install rejects, the URL is never opened, the blank tab is closed (no orphan
      tab, no lease left), and the call is refused with the existing `DISARMED` / `STATE_UNREADABLE_MESSAGE` refusal.
- [ ] The answers of a `newTab` on a page with no redirect do not change (code, message, the returned `id`); the one
      accepted difference is `tabCreated.url` = `about:blank` and one more history entry (#311). The design spec §10's
      `tabCreated` paragraph gets a dated note in a commit **before** the code commit.
- [ ] Rows for `docs/e2e-test-plan.md` are written in S7-sheet, not here.
**Lane:** `extension/src/handlers/tabs.ts`, `extension/src/safety-call.ts`, their tests, a new pure module if the
sequence is factored out (with its test), the spec §10 note; *added 2026-10-27 (#312):* one `callDeps` line in
`extension/src/sw.ts`. **Verifier focus:** a mutant that navigates before the
install resolves is red; a rejecting install opens nothing and leaves no tab; the daemon, shared, SDK and MCP are
untouched; `newTab` without a URL is byte-for-byte today's path.

### S7 — Run 17b (live), in slices (prep low, live standard)
Same slices and rules as S4 (**S7-sheet → S7-helpers → S7-live → S7-record**), a new `docs/e2e-test-plan.md` §4.25
(next free number checked), new row ids `R17B-…`; Run 17's rows and record are untouched. The rows:
- **R17B-0** found state and the loaded-build proof, as RD-0, plus a proof that the loaded build includes S6.
- **R17B-RD-2** RD-2 re-judged on the S6 build: `newTab` onto the 8083 redirect into the blocked port: the
  pre-written answer and **blocked = 0**; `tabCreated.url` recorded.
- **R17B-NEWTAB-PLAIN** `newTab` to an allowed page with no redirect: today's answer, the page loaded, blocked = 0.
- **Back rows with an activated set-up** (#308, #311): RD-BACK, RD-FWD, RD-BACK-SAMEDOC and RD-BACK-EMPTY as
  `R17B-` rows whose histories give each page a user activation before the tab leaves it, the way
  `S4-investigation.md` measured working (8 of 8). Their pass rules are RD-BACK's as written, with the activation
  method named before the run. **R17B-BACK-NOACT** (RECORD): one `back` on a history the bridge built with no
  activation, its answer recorded as the documented limit.
- **R17B-DISARM** RD-DISARM with the ON press after the reply (RD-DISARM's other pass rules unchanged).
- Every other Run 17 row recorded NOT RUN or FAIL (`…-steps/S4-run-record.md`) re-run as an `R17B-` row with its
  Run 17 pass rule, liveB included (G11-3's branch as written); then **R17B-LOGS** (RD-LOGS) and **R17B-RESTORE**.
**Lane:** as S4, plus `recipes/s11b*` changes for the new rows, tested. **No product code.** **Verifier focus:** as S4;
the activation is given only on fixture pages the wave opened; no pass rule of Run 17 is changed.

### S8 — Docs (30 min, last; risk: low)
- [ ] `docs/setup.md` Safety: `newTab` covered (from R17B-RD-2), `back`/`forward` from the R17B back rows, the #308
      limit; `docs/progress-and-roadmap.md` Step 11b block; CLAUDE.md proposals in `…-steps/S8-claude-md-proposals.md`.
**Lane:** docs only. **Verifier focus:** every changed sentence about the limit cites a Run 17 or Run 17b row.

## Exit checks (pre-registered)

Every stage: `npm test` = before + n with no test removed unless listed per file; `npm run typecheck` and `npm run
build` exit 0; `git status --short` clean of tracked changes after the build; every new pure test fails on the code
before the stage (the verifier proves it).

- **Z.1** (Stage 0) findings ranked with command and output; each DNR fact of 0.2 measured or cited with its source;
  #290's four checks measured;
  counts recomputed; every (proposed) decision attacked; Step 9's and Step 11's contracts re-run on port 0.
- **F.1** (S0F) the home predicate's table passes in both callers; a home line in storage unused; the missing-file
  refusal's pure part green; `file:` rows hidden in `listTabs` and events; no path in a message (the log-sentinel test).
- **D1.1** (S1) the case table (≥ 60 cases: the 50 of `safety-match.test.ts` plus ports, IPs, `*.`) passes; the
  equivalence test covers every case; three mutants red; the RE2 guard and the cap test pass.
- **D2.1** (S2) a rule removed on each of five paths (success, refusal, error, timeout, disarm), counted by the fake;
  **D2.2** a rejecting install refuses `DISARMED` with `STATE_UNREADABLE_MESSAGE` before the effect runs (an effect
  counter at 0); **D2.3** a rejecting rebuild aborts live calls and refuses new ones until a good rebuild; **D2.4** the
  start-up clear removes pre-existing rules before the first call proceeds.
- **D3.1** (S3) `manifest.test.ts` passes with exactly one added permission and its dated note; **D3.2** the spec §10
  note's commit precedes the code commit (`git log` order); **D3.3** `git diff <start> -- daemon shared sdk mcp` is
  empty; **D3.4** 27 codes, 27 router methods, 24 tools (the existing count tests pass unchanged); **D3.5** log-scan
  count +0 or +1, sentinel test green.
- **D4.1** (S4) §4.24 committed before the first observation; **D4.2** the first line proves the loaded build includes
  the new permission; **D4.3** RD-1, RD-2, RD-3 each show 0 hits on the blocked port with the pre-written answer;
  RD-4 shows 1 hit; RD-6 as its pre-written expectation; **D4.4** the found state read back equal by hash, none
  printed; **D4.5** every STOP or guard line matched to a return in the ledger (#193); **D4.6** RD-LOGS by count.
- **D5.1** (S5) every changed sentence about the limit cites a Run 17 row; `node scripts/doc-check.mjs` passes.
- **E6.1** (S6) a test with a fake keeper and fake tabs proves the order: create `about:blank` → install resolved →
  navigate → release, on success, refusal, error and timeout; a mutant navigating before the install resolves is red;
  **E6.2** a rejecting install: 0 navigations, the blank tab removed, the `DISARMED` refusal with
  `STATE_UNREADABLE_MESSAGE`; **E6.3** `newTab` without a URL unchanged (its existing tests pass unchanged); **E6.4**
  `git diff <S6 start> -- daemon shared sdk mcp` empty; 27 codes, 27 router methods, 24 tools; log-scan count +0;
  **E6.5** the spec note's commit precedes the code commit.
- **D7.1** (S7) §4.25 committed before the first observation; **D7.2** the first line proves the loaded build
  includes Step 11b's permission and S6; **D7.3** R17B-RD-2 shows **0** blocked hits with the pre-written answer;
  **D7.4** the activated back rows show 0 blocked hits and their pre-written answers; **D7.5** the found state read
  back equal by hash, none printed; **D7.6** R17B-LOGS by count; **D7.7** every STOP or guard line matched to a return
  in the ledger.
- **D8.1** (S8) every changed sentence about the limit cites a Run 17 or Run 17b row; `node scripts/doc-check.mjs`
  passes.

## Human gates

- **G11b-0** — Step 11's gate ruled, and 0.3 and 0.4 ruled (the box at the top). **Met 2026-10-26** (#288, #290).
- **G11b-1** — any push or tag; nothing of Step 11b is pushed without a fresh grant. *Granted 2026-10-27 (#311): push after the
  ruling.*
- **G11b-2** — any live row on a real site or with the user's credentials; Run 17 uses fixture servers on
  127.0.0.1 / `localhost` only.
- **Carried:** live fixture waves are Claude's (#33); reloads by `recipes/reload-extension.ps1`, one re-run on exit 2
  (#65, #99); the block list edited only in the wave's own options window, to add its own fixture pattern and restore
  the found text exactly (as Runs 13–16); no Chrome restart planned, any needs a fresh grant. Stage 0's scratch test
  extension is loaded only with a grant if it must go into the user's profile; otherwise its facts are cited or
  measured on the bridge itself in Run 17's RECORD rows.

## STOP rules and forbidden fixes

**Stops the gate** (the write-up continues): a pre-registered check fails after the allowed fix rounds
(`agent-rules.md` §6–§7); a covered call that proceeds after its rules failed to install; a rule left installed after
its call ended (S2's fake, or Run 17); a bridge call answering differently from its pre-Step-11b text on a page with
no redirect; a pattern, URL, rule or the token in a log or committed evidence; the human's browsing changed outside
the ruled scope (RD-6); Chrome following a redirect onto an own page or `file:` (RD-7, RD-8); a safety state not
restored; a `CLAUDE.md` runtime invariant that would have to change beyond the "not a network firewall" bullet this
step exists to rewrite; anything pushed or tagged; a port-9234 holder that is not the daemon, or an orphan process.

**Continues anyway, recorded:** the download half found impossible at Stage 0 (0.4's last paragraph); RD-7/RD-8's
outcomes; a live row that fails (its fix is a proposed decision).

*Added 2026-10-27 (#311), before S6:* every STOP rule above binds S6 and Run 17b. Also stops the gate: `newTab`
opening its URL before its rules are installed, or leaving a blank tab after a refused install; R17B-RD-2 showing a
blocked hit; an activation given on anything but a fixture page the wave opened. RD-BACK-EMPTY's STOP clause ("a bridge
call answering differently from its pre-Step-11b text on a page with no redirect") reads, for back rows, against the
activated set-up; R17B-BACK-NOACT is a RECORD row and cannot fire it.

**Forbidden fixes:** deriving the rules from anything but the parsed `BlockList` of the gate's own read; matching by
substring or a dot-less suffix in a rule (the `safety-match.ts` invariant); failing open when `updateSessionRules`
rejects; static or dynamic rule sets instead of session rules; widening the rule to the whole profile, or to every
held tab, without the user's ruling on 0.4; a wire, daemon, SDK or MCP method that reads or changes the rules;
logging a rule or Chrome's rejection text; a new error code or a changed message to make a row pass; exempting a
method from the gate; editing a row's expected text after its run; and every forbidden fix of Steps 9–11 still
binding (`docs/plans/2026-10-25-step11-file-upload.md` § STOP rules, and `docs/agent-rules.md` §2).

## As built

One block per stage, written by the session agent at the stage close (format: `docs/docs-writing-guide.md` § Phase
doc header); at the phase close, the gate checklist (item → met? → evidence).

### Stage 0 · 2026-10-26 · `ca422ca` · verifier PASS-with-notes (two rounds)
- **#290's checks, measured on a scratch Chrome 156 on a temporary profile (#294):** (1) a tab-scoped `main_frame`
  session rule blocks the redirect hop of a `tabs.update` navigation (blocked server 1 → 0); (2) in force when
  `updateSessionRules` resolves (0 of 25 escaped); (3) a rule matches the worker's own `fetch` (tab `-1`,
  `xmlhttprequest`), and `onErrorOccurred` reports `ERR_BLOCKED_BY_CLIENT`: the download half is built; (4) 5000
  session rules, 1000 of them regex; no list cap in code beyond `storage.local`'s quota. No STOP.
- **Found:** `newTab`'s `tabs.create({url})` leaks its first request (10/10) → #295, uncovered for now; an untyped
  download rule cuts the offscreen socket → typed `xmlhttprequest` (#296); `tab.url` after a blocked main frame is the
  blocked URL (post-check unchanged); Chrome follows no redirect onto an own page or `file:` (0.7 holds); 3c by check
  (i) from the worker; `file:` rows hidden as `"blocked"`. Counts: 27 methods, 27 codes (26 on the wire), 24 tools,
  3811 tests / 154 files, log-scan allowlist 54; Step 9's and Step 11's contracts green on port 0.
- **Decisions:** #294–#297 (#297: a stray `chrome.exe --version` reached the user's Chrome; rule added to
  `recipes/CLAUDE.md`). Report `…-steps/Stage0.md`, audit `stage0-audit.md`, S1's table `stage0-s1-cases.md`.
- **Stage split** (journal 2026-10-26T17:00Z): S0F-a → S0F-b → S1 → S2 → S3a → S3b → S4-sheet → S4-helpers → S4-live →
  S4-record → S5, sequential (0.1).

### S0F-a · 2026-10-26 · `632483b` (spec note), `62eee7e` · verifier PASS-with-notes (one fix round)
- A home folder or a folder holding home folders is an invalid Upload-folder line (a reason naming no path), and the
  gate ignores such a line already in storage, by one shared predicate in `upload-paths.ts` (#298); `.ssh` stays a
  warning. A `file:` tab is listed hidden (`"blocked"`) in `listTabs` and in tab events (`hiddenReason`, `safety.ts`).
  `browser_upload_file` says it works on a background tab (a description test pins it; #214 pins schemas only).
- Tests 3811/154 → 3825/156, none removed; 16 new or changed tests red on the code before; F.1's home and `file:`
  parts met. Report `…-steps/S0F-a.md`. Run 17's F-HOME expects the new reason text.

### S0F-b · 2026-10-26 · `b108482` (spec note), `0202888` · verifier PASS (one fix round)
- Before the attach the worker fetches each path's `file:` URL (`upload-exists.ts`, the gate's path parser); only a
  readable 200 is a file, everything else refuses `BAD_PARAMS` naming `paths[i]`, one 5 s bound for the call (#299).
  F.1's missing-file part met; no path in a message, `data` or log; no log site added.
- Tests 3825/156 → 3845/157, none removed; ~27 mutants, every fail-open one red. §4.24 placeholder rows F-RAW,
  F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK for Run 17. Report `…-steps/S0F-b.md`.

### S1 · 2026-10-26 · `a675ab7` · verifier PASS-with-notes (one fix round)
- `safety-dnr.ts`: `rulesOf(list, scope, idBase)` (contiguous ids; tab scope `main_frame`; download scope `tabIds:[-1]`,
  own initiator, `xmlhttprequest`), `countRules(list)`, `fitsCaps(live, caps)`; no `chrome.*`, no log.
- D1.1 met: 112 cases, equivalence in both scopes, three mutants red, RE2 guard, cap test, scope and no-pattern-text
  guards; a fuzz found 0 disagreements with `isUrlBlocked` in 7.5 M pairs. Round 1 failed on regexes too large for
  Chrome's memory cap; fixed by #300. Tests 3845/157 → 4087/158, none removed. Report `…-steps/S1.md`.

### S2 · 2026-10-26 · `e7bb081` · verifier PASS-with-notes (one fix round)
- `safety-dnr-keeper.ts`: per-call id ranges, install before the first side effect, removal on every path, atomic
  rebuild on a list change, the start-up clear behind `ready`, the unsynced state, fail closed with
  `stateUnreadableRefusal()`; a disarm does not lift a running call's rules (`sweep()` removes only orphans, #296).
  After a rejected removal, every later update retries the leftovers. No `chrome.*`, no log.
- D2.1–D2.4 met; both required mutants red. Tests 4087/158 → 4111/159, none removed. 682 lines (cap ~500), accepted
  complete. Carried to S3a by #301: re-sync when idle, a DNR time bound, `back`/`forward` timing, R1's test. Report
  `…-steps/S2.md` (S3a's call shape: `S2-builder.md` §7; await `release()` before reading `refusal()`).

### S3a · 2026-10-26 · `92252df` (spec note), `c9db926` · verifier PASS (two fix rounds)
- `manifest.json` + `declarativeNetRequestWithHostAccess` (`manifest.test.ts` re-pinned, dated note); `sw.ts` builds the
  keeper at the top level, start-up clear behind `ready`, rebuild in the existing listener (19 listeners, no new
  top-level `await`); `safety-call.ts` installs tab rules for `navigate`, `back`, `forward` once per call and releases
  them on every path; `newTab` unchanged (#295). #301 (a)–(c) and R1 done; 5 s per DNR call; `back`/`forward` wait up
  to 10 s for their load while holding rules (#302).
- D3.1–D3.5 met (no log line added; daemon/shared/sdk/mcp diff empty). Tests 4111/159 → 4135/160, none removed.
  M2 (rebuild on any safety change) → S3b (#302). Run 17: RD-BACK, RD-FWD, RD-BACK-SAMEDOC. Report `…-steps/S3a.md`.

### S3b · 2026-10-27 · `7580d59` · verifier PASS-with-notes (one fix round)
- `downloadStart` holds the typed download rules for its fetch; a blocked hop (`safety-hop.ts`, read before `ingest`,
  no URL kept) answers `DOMAIN_BLOCKED` with R14-5c's text; other failures keep today's answer (#303). The rebuild runs
  only on a block-list edit or an unreadable state (`rebuildsRules`, #302). The options page warns past the caps or on
  a regex over 119 characters, by line number only.
- S3 as a whole: D3.3 (empty diff since `ecd254f`), D3.4, D3.5 (+0 log sites) met. Tests 4135/160 → 4158/161, none
  removed. Run 17: RD-DL-HOP, RD-CAPS-WARN. Report `…-steps/S3b.md`.

### S4-sheet · 2026-10-27 · `336547d` · verifier PASS-with-notes (two fix rounds)
- §4.24 committed before any observation (D4.1): STOP lines, fixtures and ports (8081, 8083, 8085–8089, 8091; 8090
  closed), K17 constants table, every 0.10 row as amended, F-rows, Run 16's carried rows as `R17-`, RD-LOGS,
  RD-RESTORE. #304. Report `…-steps/S4-sheet.md`.

### S4-helpers · 2026-10-27 · `8899cba` · verifier PASS-with-notes (three fix rounds, the third Opus)
- Every command the sheet names, in `recipes/s11b*` (servers on 8086, 8091, 8087; `B17` subcommands; `s11b-win.ps1`
  console and window helpers; the `R17` block runner with liveA/liveB, the G11-3 gate, RD-0's fallback, a STOP map),
  16 test files, `recipes/tsconfig.s11b.json`. Offline only. Tests 4158/161 → 4472/177, none removed. #305, #306.
  Report `…-steps/S4-helpers.md`.

### S4-live · 2026-10-27 · `723b63c` (#306) … `e50ded1` · ESCALATE at a pre-registered STOP
- Run 17 liveA, seven attempts (each return in `S4-live.ledger.md`; five helper fixes, each verified and committed
  before use). Attempt 7: RD-0 proves the loaded build has the new permission (D4.2); **RD-1 blocked 0, RD-3 blocked 0
  (R14-5c's text), RD-4 blocked 1, RD-6 blocked 1** (0.4 (C)); RD-2 blocked 1 (RECORD, #295); RD-5, RD-5b,
  RD-REBUILD-NARROW, RD-DL-HOP, RD-DL-ERR, RD-CAPS-WARN, F-HOME, F-FILETAB PASS; RD-REGEX: 120/121-character regexes
  supported. Stopped at **RD-BACK-EMPTY** (`back` → `INTERNAL` with an empty list; #307), which predates Step 11b
  (#308). liveB, RD-LOGS and RD-RESTORE as rows not run; the STOP path restored the state, read back equal. Tests
  4472/177 → 4535/183 (helper fixes). Report `…-steps/S4-live.md`; investigation `S4-investigation.md`.

### S4-record · 2026-10-27 · `105543f` · verifier PASS-with-notes (two fix rounds)
- 38 rows judged: PASS 14, FAIL 4 (RD-BACK, RD-BACK-SAMEDOC, RD-DISARM — causes in #308 — and R17-UP-L1, whose console
  scan never ran), RECORD 4, NOT RUN 15, STOP 1. §5 Run 17 entry. Record `…-steps/S4-run-record.md`; #309.

### S5 · 2026-10-27 · `c5d0099` · verifier PASS-with-notes (one fix round)
- `docs/setup.md` Safety: what the list now stops (RD-1, RD-3; RD-4, RD-5, RD-5b) and what it does not (RD-2, RD-6,
  0.9; `back`/`forward` redirects unmeasured), the #308 `back` limit; `docs/progress-and-roadmap.md`'s Step 11b block;
  the attempt-6 port corrected (8091) in the record. No sentence claims `back`/`forward` hops are stopped: no row
  measured it. CLAUDE.md proposals (`S5-claude-md-proposals.md`) applied by the session agent (#310). D5.1 met.

### Gate checklist · 2026-10-27 · **not met — awaiting the user's ruling** (#307–#309)
| Item | Met? | Evidence |
|---|---|---|
| Every-stage checks | yes | stage reports; tests 3811/154 → 4535/183, none removed; typecheck, build, seven recipes tsconfigs exit 0 (`S4-live.md` §2) |
| Z.1 | yes | `…-steps/Stage0.md` (#290's checks (1)–(4) measured) |
| F.1 | yes | `S0F-a.md`, `S0F-b.md` |
| D1.1 | yes | `S1.md` |
| D2.1–D2.4 | yes | `S2.md` |
| D3.1–D3.5 | yes | `S3a.md`, `S3b.md` |
| D4.1, D4.2, D4.4, D4.5 | yes | `S4-run-record.md` §3 (D4.4 by the STOP path's read-back) |
| **D4.3** | **part** | RD-1 0, RD-3 0, RD-4 1, RD-6 1 as written; RD-2 1, a RECORD by the pre-run note (#295), though D4.3 lists it (#309) |
| **D4.6** | **no** | RD-LOGS did not run; offline counts 0, some consoles not measured (#309) |
| D5.1 | yes | `S5.md` |
| STOP rules | **fired** | RD-BACK-EMPTY (#307), first met in attempt 6 past a helper fix (#309); cause predates Step 11b (#308) |
| G11b-0 | met | #288, #290 |
| G11b-1 (no push/tag) | met | nothing pushed |
| G11b-2 (fixtures only) | met | `S4-run-record.md` |

### Gate ruling · 2026-10-27 · the user accepts Step 11b (#311)
- #307–#309 (a): accepted with Run 17 as recorded; D4.3 read by the pre-run note (**part**); fix 5 acknowledged.
  #295 (a): `newTab` on `about:blank` → S6. #292 (a), #293 (a) confirmed. Push granted (G11b-1). Run 17b → S7.

### S6 · 2026-10-27 · `6259421` (spec notes), `db3f82e` · verifier PASS-with-notes (one fix round)
- `newTab` with a URL: the gate's check as before, the tab on `about:blank`, a second keeper handle (one `callDeps` line
  in `sw.ts`, #312) installs the tab rules from the gate's fresh read, the blank page settles (≤ 2 s, #313), then the
  navigation and today's wait; `post()` releases the handle on every path. A refused install, re-check or `tabs.update`
  removes the blank tab and opens nothing (#314). Without a URL, or with `about:blank`: today's path.
- E6.1–E6.5 met: tests 4535/183 → 4560/184, none removed; the navigate-before-install mutant red 13/25; daemon, shared,
  SDK, MCP diff since `ce1f06d` empty; counts and log sites unchanged. #312's "Revisit if" not met. Run 17b decides
  the leak (R17B-RD-2). For S8: a keeper comment, an `extension/src/CLAUDE.md` bullet and the §10 wording are stale.
  Report `…-steps/S6.md`.

### S7-sheet · 2026-10-27 · `3cfbb95` · verifier PASS (two fix rounds)
- §4.25 committed before any observation (D7.1): every S7 row, Run 17's FAIL/NOT RUN/STOP rows carried with their pass
  rules word for word, liveB included, plus R17B-ACT-CTL, R17B-NEWTAB-LOAD, R17B-NEWTAB-REFUSED (RECORD); §4.24 and
  Run 17's record untouched; ports by `netstat`. #315. Report `…-steps/S7-sheet.md`.

### S7-helpers · 2026-10-27 · `6c0eddc` · verifier PASS-with-notes (three fix rounds, the third Opus)
- `recipes/s11b-r17b.ps1` (slices `liveA17B`, `liveB17B`; R17B-0's joined first line), three pure `s11b-r17b-*.ts`
  modules, `B17 history --activate`, `tabwatch`, `build-proof`, `newtab-timed`, `ctl-slow`, `Invoke-S11bPressAfterReply`.
  Offline only. Tests 4560/184 → 4663/190, none removed. #316. Report `…-steps/S7-helpers.md`.

### S7-live · 2026-10-27 · `6f3413c` (helper fix), `145ceb9` (evidence) · two attempts, no STOP
- Attempt 1 threw in R17B-0 before any state change (a helper variable clash; #317); attempt 2 ran liveA17B and
  liveB17B (file-URL toggle ON) to the end. D7.2: the first line proves Step 11b's permission and the S6 build
  (`created-url=about:blank`). D7.5: both slices read back equal. D7.7: attempt 1's return in the ledger. Helper output
  (judged in S7-record): R17B-RD-2 `blocked=0`; the activated back rows blocked 0. Tests 4663/190 → 4665/191. Report
  `…-steps/S7-live.md`.

### S7-record · 2026-10-27 · `1e285d7` · verifier PASS-with-notes (two fix rounds)
- 28 rows: PASS 16, RECORD 2, FAIL 7 (all carried from Run 16's uploads), NOT MEASURED 3. D7.3 met (R17B-RD-2 blocked
  0), D7.4 met (R17B-BACK, R17B-FWD blocked 0; SAMEDOC, EMPTY `ok`), **D7.6 not met** (R17B-LOGS NOT MEASURED). §5 Run
  17b entry. Record `…-steps/S7-run-record.md`; #318.

### S8 · 2026-10-27 · `474db85` · verifier PASS-with-notes (two fix rounds)
- `docs/setup.md` Safety from Run 17 and Run 17b rows (`newTab` R17B-RD-2, R17B-NEWTAB-LOAD; `back`/`forward` R17B-BACK,
  R17B-FWD; the #308 limit R17B-BACK-NOACT, R17B-ACT-CTL; cleanup P6); the roadmap's Step 11b block; a dated §10 spec
  note; a comment-only keeper edit. The seven failed carried rows are not described as fixed. CLAUDE.md proposals
  (`S8-claude-md-proposals.md` (a)–(f), cleanup P7, P8) applied by the session agent (#319). D8.1 met.

### Gate checklist after the ruling · 2026-10-27 · **D7.6 not met; accepted by the user, Step 11b closed (#318 (a), #320)**
| Item | Met? | Evidence |
|---|---|---|
| Every-stage checks | yes | stage reports; tests 4535/183 → 4665/191, none removed |
| E6.1–E6.5 | yes | `S6.md` |
| D7.1, D7.2, D7.5, D7.7 | yes | `S7-run-record.md` |
| D7.3 | yes | R17B-RD-2 blocked 0 (Run 17 RD-2: 1) |
| D7.4 | yes | R17B-BACK, R17B-FWD blocked 0; SAMEDOC, EMPTY `ok` |
| **D7.6** | **no** | R17B-LOGS NOT MEASURED (one console path for both slices; #318) |
| D8.1 | yes | `S8.md` |
| Carried rows (Run 16's) | 7 FAIL | UP-OPT, UP-6, F-RAW, F-RAW-2, F-RAW-DIR, UP-RACE-A, UP-L1; helper or sheet defects or an unestablished banner reading (#318) |
| STOP rules | none fired | attempt 1's throw before any state change (#317) |
| G11b-1 | granted | pushed to `ce1f06d` (#311) |
| G11b-2 | met | fixtures only |

## Open items

- *Rewritten 2026-10-27 (cleanup P12):* for the user at the gate: #292, #293, #295, #307–#309 — **ruled
  2026-10-27 (#311)**. Settled by Stage 0: #290's four checks, 3c's check, the download half, `tab.url` after a
  blocked main frame, the regex cap (#294–#296). Ruled 2026-10-26: 0.3 (A), 0.4 (C) (#290); S0F's what (#288).

## Follow-ups

- *Added 2026-10-27:* the user's ruling on #307–#309 (Open decisions), then a short **Run 17b** of the rows not run
  (liveB, RD-FWD, the back rows with an activated set-up, RD-DISARM with ON after the reply, RD-LOGS, RD-RESTORE) as
  new rows; `newTab` on `about:blank` if #295 is ruled for it; a `back` that reaches bridge-built history (#308 (b),
  Step 12); `safety-hop.ts`'s `Date.now` → `performance.now()` and the unused `HopWatch.blocked()` (S3b verifier
  notes); the 119-character regex bound is conservative (RD-REGEX: 120 and 121 supported; #300, #303).
  *Corrected 2026-10-27 (cleanup pass 2): ruled by #311; S6 built `newTab` on `about:blank`; Run 17b ran (§4.25,
  #318; phase doc § As built). Left: #308 (b) (Step 12), the S3b notes, and the 119 bound, which stays, a raise
  being a Claude follow-up (#311 item 4).*

- If the user rules 0.4 (A) later: the profile-wide firewall as standing rules, an options-page sentence, a row on a
  human-opened tab.
- Requests a page starts after a bridge call (script redirects, clicks): covered today only by the gate's next-call
  refusal; a candidate for 0.4 (B) if Run 17 or use shows a need.
- Step 12 — Phase F (`args` for `browser_evaluate`, console capture, the keep-attached debugger), per #129.
