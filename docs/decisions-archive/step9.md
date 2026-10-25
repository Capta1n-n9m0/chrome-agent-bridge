# Decisions archive — Step 9: Phase E safety

Entries moved verbatim from `docs/decisions.md` when the step closed; numbers unchanged, newest first. Cite an
entry by date + title ([`docs-writing-guide.md`](../docs-writing-guide.md#decisions)). The index is in
[`decisions.md`](../decisions.md#archive).

### 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)
**Decided:** the user ruled on every Step 9 open decision, after reading
`docs/plans/2026-10-24-step9-open-decisions-review.md` (one plain explanation per decision, with options and a
recommendation):
- **#192 Run 13 stands as recorded.** Its four self-resolved stops stay recorded as a process deviation;
  #193's rule (a live runner returns on every stop) binds later waves. The ruling ratifies Run 13's results;
  it does not pre-approve pinning by mouse click in later waves (G10's pinning rule still asks once, unless
  the button is already pinned). With #192 ruled, **Step 9 is closed**.
- **#138 as built:** only this extension's own pages are hidden and untouchable; navigation to any
  extension's page stays refused; the wider every-extension rule is not adopted.
- **#133 changed:** while JavaScript is off, `browser_evaluate` (and a `javascript:`/`data:`/`blob:`
  navigation, #138) gets a **new code `JS_DISABLED`**, not `DISARMED` with `scope: "evaluate"`. Built in
  Step 10 (spec §10 amended first; 26 codes, 25 on the wire); until then the built behaviour stands.
- **#140 as built, plus a later item:** the block list keeps checking the address before and after a
  redirect; a later step adds a Chrome network rule (`declarativeNetRequest`, a new permission) so a
  redirect hop onto a blocked site is never sent at all.
- **All the others ratified as built:** #131, #132, #134–#137, #139, #141, #144, #148, #153–#156,
  #159–#163, #168, #174–#180, #188.
**Why:** the user's answers (2026-10-24): Run 13 — "Accept it (Recommended)"; #138 — "Only our own pages
(Recommended)"; #133 — "New code JS_DISABLED"; the rest — "Accept all + plan #140b later (Recommended)".
**Instead of:** re-running Run 13's blocks 4–30; hiding every extension's pages; keeping `DISARMED` +
scope; leaving the block list without a network rule.
**Revisit if:** a later wave contradicts a Run 13 row (#192's own Revisit-if).
**By:** user

### 2026-10-24 · SAFE-7c (the debugger on this extension's own options page) stays unmeasured (#200)
**Decided:** whether `chrome.debugger` can attach to this extension's own options page is not measured.
**Why:** the own-page block refuses every call on such a tab before any attach (Run 13 SAFE-7b, PASS), so no
behaviour depends on the answer; measuring it needs a throwaway extension in a driver-only profile (a new grant).
**Instead of:** measuring it in Step 10.
**Revisit if:** a gate exemption for own pages is ever proposed.
**By:** Claude (propagator recommendation, `docs/plans/2026-10-24-step9-phase-e-safety-steps/propagator.md`)

### 2026-10-24 · S5: the roadmap's Step 9 block lists the 32 open decisions by number and short title (#199)
**Decided:** number + short title, in the order that decisions.md → Open decisions → Step 9 uses, with #192
first and in bold. **Why:** the decisions.md Open list itself names them by quoted title + number, and a full
date + title for each of 32 entries would swamp the roadmap. The full titles stay one click away. **Instead
of:** date + exact title per entry (verifier F7, NIT). **Revisit if:** the docs-writing guide gains a rule for
lists of open decisions. **By:** Claude (S5 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S5.md` §5)

### 2026-10-24 · S5: setup.md's Safety section quotes the refusal text from the code, and the MCP line as Claude sees it (#198)
**Decided:** quote every refusal, title and status line byte for byte from the code (`safety.ts`,
`badge.ts`, `sdk/src/error.ts` `safetyRefusalLine`, `mcp/src/tools/registry.ts`). The verifier checked each one.
**Why:** a user matches what they see against the doc. **Instead of:** paraphrased wording. **Revisit if:**
#158 or #164 changes the wording. **By:** Claude (S5 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S5.md` §5)

### 2026-10-24 · S4: The redirect server uses port 8083 (#197)
**Decided:** 8083. **Why:** 8082 is `Bound` on 0.0.0.0 by `SystemSettings.exe` on this machine. **Instead of:** 8082
(stage0-audit §7).
**By:** Claude (S4 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4.md` §9)

### 2026-10-24 · S4: SAFE-REL-3 prints a URL class, not "withheld" (#196)
**Decided:** future waves print the wrapper scheme, inner scheme and own-page yes/no for a non-fixture URL.
**Why:** Run 13 cannot show what `view-source:/options.html` opened (verifier finding 5); the product's detector says
not an own page, but that is the detector judging itself.
**By:** Claude (S4 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4.md` §9)

### 2026-10-24 · S4: Dated notes on §4.20 for two expected-text errors (#195)
**Decided:** beside SAFE-9 and SAFE-10's console set-up (never editing the rows): the `safety state:` log line
precedes `extension resync` by design; Chrome 156 titles the worker's DevTools window `DevTools`. Both rows stay FAIL
for Run 13. **Why:** the row text was wrong, not the product; forbidden to edit expected text after the run.
**By:** Claude (S4 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4.md` §9)

### 2026-10-24 · S4: SAFE-5c's redirect half, SAFE-POP-1, SAFE-3 and SAFE-4(b) are re-measured in the next live wave (Step 10) (#194)
**Decided:** threaded redirect server (`ThreadingHTTPServer`); POP-1's recipe claims the opener first; SAFE-3
with the options window visible or a page-side reporter; SAFE-4(b) polls the banner ≥ 10 s. No product change unless
one reproduces there. **Why:** each failed on tooling or an unmeasured Chrome timing (verifier §FAILs). The
post-redirect `downloadStart` check (#140) remains **unmeasured live** until then. **Revisit if:** any reproduces.
**By:** Claude (S4 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4.md` §9)

### 2026-10-24 · S4: Live runners return on every stop; one stop rule for sheet and brief (#193)
**Decided:** a level-2 runner may fix a helper only between rows with no observation and **never** past a
STOP line (restore failure, guard, G9-2); throws from the first press onward always run `Restore-S9All`. **Why:**
Run 13's deviations. **Instead of:** letting the runner judge "helper bug, safe to continue". **Revisit if:** a wave
needs a mid-run helper fix often enough to make returning impractical.
**By:** Claude (S4 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4.md` §9)

### 2026-10-24 · S4: Run 13 stands as recorded, with the runner's four self-resolved stops listed (#192)
**Decided:** ratify Run 13's results; record the four stops as a process deviation. **Why:** at every stop
the safety state equalled the found state (the record's own reads), the final read-back equals the start by hash, and
no row was re-run to pass. **Instead of:** re-running the affected rows (blocks 4–30 cover SAFE-0…SAFE-4b) in a new
wave. **Revisit if:** any of those rows is contradicted by a later wave. **Session agent's note:** the runner pinned by a real mouse click at a `FromPoint`-verified point inside its own window when UIA exposed no Invoke pattern; that is still UI automation under G9-2's grant, but G9-2 said to ask the user once after a failure, and three of the four stops (blocks 4, 8, 30) should have returned to the step agent. No safety state was changed at any stop, none was left changed, and no row was re-run to pass. The S4 gate item stays open until the user rules.
**By:** Claude (integrity floor — listed under Open decisions for the user; S4 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4.md` §9)

### 2026-10-24 · S2c: the badge's stored read is `readStoredArmed` in `safety-state.ts` (#191)
**Decided:** `readStoredArmed(get)` asks exactly `SAFETY_KEY_NAMES`; `sw.ts` forwards the keys to
`chrome.storage.local.get`. *Supersedes #183's `get(null)`.* **Why:** #189; the writers test pins the key names to
`safety-state.ts`/`options.ts`. **Instead of:** a `badge.ts` helper (fails the unchanged writers test); widening the
writers test's allowlist (edits an existing test). **Revisit if:** the writers test's allowlist is reopened. **By:** Claude (S2c report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2c.md`)

### 2026-10-24 · S2c: a rejected re-arm write returns memory to disarmed without counting as a disarm (#190)
**Decided:** on a rejected arm write, memory's `armed` returns to false (other fields as they now are), `onDisarm`
fires, `lastDisarmAt` is not moved, the rejection is rethrown; skipped only when a `storage.onChanged` touching `armed`
landed after the toggle's apply; an unreadable copy stays unreadable. **Why:** #174/#189 — memory is never re-armed by
a failed write and nothing is recorded while storage says OFF; the human did not disarm, so the 1 s guard keeps
measuring from the real disarm and the next press retries. Object identity was not enough (verifier F1: a block-list
or JavaScript change merges over memory and carries the unsaved `armed: true`). **Instead of:** an identity check;
reverting unconditionally (overwrites a newer stored `armed`); reverting as a `"toggle"` (moves the guard, so a quick
retry is "ignored"); applying memory only after the write (changes the success path's order). **Revisit if:** the gate
ever arms from memory rather than storage. **By:** Claude (S2c report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2c.md`)

### 2026-10-24 · A fix stage S2c before S4: a failed re-arm write leaves memory disarmed; the badge reads only the safety keys (#189)
**Decided:** S2b's step agent escalated a defect in S2a's `extension/src/safety-state.ts`: when the write that
re-arms fails, `toggleOnce` leaves its in-memory copy armed while storage stays disarmed, so the network log
records while every call, the badge and storage say OFF, and the next press disarms instead of retrying. A
short stage S2c fixes it before S4: the memory copy is restored to disarmed before the error is rethrown, with a
failing test first. The same stage narrows the badge's stored read from `storage.local.get(null)` (#183, which
reads the token too, never logged) to the safety keys only. *Supersedes #183's read.*
**Why:** #174's rule is "memory is never re-armed by a failed write", and 0.3 says nothing is recorded while
disarmed; the defect breaks both, though only a failing `storage.local.set` triggers it. Reading the token where it
is not needed is a needless exposure in a safety module. Both are in S2a's lane, outside S2b's, so S2b did not fix
them (correctly).
**Instead of:** fixing it in S4 (S4 runs on committed code and never fixes in the wave); leaving it as a recorded
finding (it is a disarmed-state leak, however unlikely).
**Revisit if:** never; it is a defect fix.
**By:** Claude

### 2026-10-24 · S2b: the writers test refuses `storage.local.remove`/`clear` everywhere (#188)
**Decided:** as built. **Why:** removing a safety key restores its default — armed — so it is a write in effect;
conservative; nothing uses them today. **Instead of:** allowing them outside the two writers. **Revisit if:** a feature
needs `remove` (name its site in the test). **By:** Claude (contract-level; listed under Open decisions for the user; S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2b: the log scan finds loggers by name (#187)
**Decided:** sites are every `console` use (call or value), `process.stdout`/`stderr`/`process` as a value, any call or
value use of `log`/`.log` (incl. `.call/.apply/.bind`), and `warn/info/debug/trace/error` on non-`console` objects; an
allowlist entry is file + normalized call text + a note; a stale entry fails. **Why:** stricter than listing today's
three injected-logger expressions. **Instead of:** a fixed list (`options.log`, `deps.log`). **Revisit if:** a
non-logging method with one of those names appears (allowlist it with a note). **By:** Claude (S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2b: options page names and layout (#186)
**Decided:** labels per §7 row 5 below; switches save on change (#144, not debounced); the block list has its own Save;
one status line. **Why:** UIA finds controls by name. **Instead of:** one Save for everything. **Revisit if:** S4's
automation finds a name ambiguous. **By:** Claude (S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2b: unsaved block-list edits survive a change made elsewhere (#185)
**Decided:** an untouched textarea follows the stored text; edited text is kept and a line says Save replaces the stored
list. **Why:** never lose typing, never overwrite silently. **Instead of:** always reloading; never reloading. **Revisit
if:** two options tabs editing at once matters. **By:** Claude (S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2b: one fixed reason for every invalid block-list line (#184)
**Decided:** each invalid line is marked by number with one reason naming the grammar's shapes. **Why:** S1's parser
returns only `invalid`; per-cause messages would need a second grammar. **Instead of:** re-deriving causes; extending
`safety-match.ts` (S1's). **Revisit if:** the user wants per-cause messages. **By:** Claude (S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2b: the badge's stored read is `storage.local.get(null)` (#183)
**Decided:** as built (fixer r1). **Why:** the writers test forbids naming safety keys in `sw.ts`; only a boolean leaves the
read; nothing logs it. **Instead of:** `get([...SAFETY_KEY_NAMES])` with the writers test allowing key names as a `get`
argument only (verifier R2-2: feasible in lane, 61/61 tests in a restored trial) — the better shape, deferred to keep the
stage in one fix round. **Revisit if:** at Step 10 or any later touch of `sw.ts`'s badge glue — then take the narrower
read. **By:** Claude (S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2b: a failed-write title lasts until storage itself reads disarmed or the state moves on (#182)
**Decided:** `BadgeModel` keeps write-failed / arm-failed while reads say disarmed; it ends when the stored `armed` reads
false (e.g. the options page saved the OFF), a read says armed, or a press is saved. **Why:** the gate's `read()` masks the
stored value with the memory disarm (#176), so the title would otherwise outlive a successful save (verifier F5).
**Instead of:** showing it only until the next refresh. **Revisit if:** S4 shows a stale failure title. **By:** Claude (S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2b: badge colours, and titles for the unreadable, unsaved-disarm and failed-arm states (#181)
**Decided:** `#d93025` red (`OFF`), `#e37400` amber (`JS`); #143's three titles verbatim; unreadable → `OFF`, "…the
safety state cannot be read, so agents are refused (check the options page)"; write-failed → `OFF`, "…OFF, but not saved
(storage write failed): agents are refused until the extension restarts (click to turn on)"; rejected arm → `OFF`,
"…turning on failed (storage write failed), agents are still refused (turn it on from the options page)". **Why:** #143
leaves colours and failure wording to the build; S2a's handoff (#174) asks the unsaved disarm to be visible.
**Instead of:** one OFF title for every OFF. **Revisit if:** the user prefers other words or colours. **By:** Claude (S2b report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b.md` §5)

### 2026-10-24 · S2a: no `safetyState` is sent while the state cannot be read (#180)
**Decided:** sent only from a successful read; the daemon keeps "not reported" (#159). **Why:** an unreadable state has no
honest `blockedCount`. **Instead of:** reporting `{armed:false, evaluate:false, blockedCount:0}`. **Revisit if:** the user
prefers the disarmed report. **By:** Claude (contract-level; listed under Open decisions for the user; S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: the network ingest drops a request for good once one of its events was dropped (#179)
**Decided:** a dropped request id is remembered (≤ 5 000) and its later events dropped; a blocked event discards the
request's recorded hops; a disarmed drop does not discard entries recorded while armed; the pre-ready buffer holds ≤ 2 000
events, oldest out. **Why:** otherwise a later event rebuilds the entry (traffic of the disarmed period, a blocked redirect).
**Instead of:** per-event drop only. **Revisit if:** a request begun while disarmed is needed after re-arming. **By:** Claude (contract-level; listed under Open decisions for the user; S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: the post-check also replaces error replies; `listTabs` with an unreadable state is refused, and has no post-check (#178)
**Decided:** a handler's error is replaced by the post-check's refusal like a result (errors can carry page data); `listTabs`
at receipt with an unreadable state → `DISARMED` (unreadable); once its rows were redacted under a successful read, no
post-check. **Why:** fail closed (#139); #134 redacts rather than refuses on a known state. **Instead of:** results only;
rows all redacted as `"disarmed"`. **Revisit if:** an agent needs a listing while the state is unreadable. **By:** Claude (contract-level; listed under Open decisions for the user; S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: a capture whose window showed another tab is refused `OFFSCREEN` (#177)
**Decided:** after `captureVisibleTab` the window's active tab is re-read; not the target → image discarded, `OFFSCREEN`
with a message naming no URL or title (F11). **Why:** F11 says discard and refuse; `OFFSCREEN` fits; no new code.
**Instead of:** `INTERNAL`; returning the image. Changes a reply while armed only in that race (today: the wrong tab's
pixels). A narrow race remains (switch away and back between capture and re-read; verifier NIT 7). **Revisit if:** S4
shows it firing in normal use. **By:** Claude (contract-level; listed under Open decisions for the user; S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: a disarm held in memory wins over a storage read (#176)
**Decided:** `read()` reports disarmed while the memory copy is disarmed even if storage still reads armed (a write in
flight or failed). **Why:** no call acts after the human pressed OFF; it only ever refuses. **Instead of:** F10 literally.
**Revisit if:** memory and storage drift long enough to matter. **By:** Claude (contract-level; listed under Open decisions for the user; S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: `navigate`/`newTab` are gated on the URL Chrome will open (#175)
**Decided:** a URL the WHATWG parser takes as absolute is tested as written; any other string is resolved against
`chrome-extension://<id>/` and tested as that URL, so `/options.html`, `options.html`, `example.com`, `//host` are refused
`DOMAIN_BLOCKED` (#138); a string that cannot be resolved is refused too. The caller's string is still what reaches Chrome.
**Why:** Chrome resolves a non-absolute URL inside the extension (documented; verifier r1 finding 1, CRITICAL — the own-page
refusal was passable by its relative form). **Instead of:** refusing every scheme-less URL by rule; leaving unparseable
strings to Chrome. **Revisit if:** SAFE-REL-2 shows Chrome resolving elsewhere. Note: refusing an unparseable string (e.g.
`http://exa mple.com`) changes today's reply while armed with an empty list (today's answer unmeasured; verifier R2-1).
**By:** Claude (contract-level; listed under Open decisions for the user; S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: a disarm whose write fails twice returns `"write-failed"` and stays disarmed in memory (#174)
**Decided:** one retry; memory is never re-armed by a failed write; a failed **arm** write rejects (S2b shows it as still
`OFF`). **Why:** the human's press must hold; a rejection would hide that the disarm is in force. **Instead of:** rejecting;
re-arming memory. **Revisit if:** S2b finds the badge cannot show it. **By:** Claude (contract-level; listed under Open decisions for the user; S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: the offscreen document accepts only this extension's non-tab senders (#173)
**Decided:** `sender.tab === undefined && sender.id === chrome.runtime.id`, checked before the message is read.
**Why:** a content-script world could otherwise send frames or reconnect the socket (verifier finding 3; not reachable by a
page). **Instead of:** matching the worker's script URL (unmeasured). **Revisit if:** SAFE-0 fails. **By:** Claude (S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: the `seconds` wait runs in 100 ms re-checked ticks; tab events wait for a fresh read, in order (#172)
**Decided:** as named; a closed tab's last URL is kept 610 s (≤ 1 000 tabs) and a replaced tab followed (≤ 4 hops) for the
post-check (R2-1). **Why:** a disarm ends a wait within one tick; F10 keeps the memory copy for webRequest only.
**Instead of:** one sleep; the memory copy for events. **Revisit if:** S4 measures the event delay breaking the opener rule.
**By:** Claude (S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: storage keys, and a wrong-typed value makes the state unreadable (#171)
**Decided:** keys `safety.armed`, `safety.evaluate`, `safety.blockList` (defaults true, true, ""); a present key of the wrong
type → unreadable → every call refused, the ingest drops everything, the toggle writes disarmed. **Why:** fail closed
(#139). **Instead of:** treating a wrong type as its default. **Revisit if:** a key needs migrating. **By:** Claude (S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: an unknown method is `UNKNOWN_METHOD` in every state (#170)
**Decided:** no state read, no handler. **Why:** nothing to gate; the answer reveals nothing about the state and keeps the
stale-extension diagnostic. **Instead of:** `DISARMED` while disarmed. **Revisit if:** the user wants every frame answered
alike while disarmed. **By:** Claude (S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S2a: the gated router sits beside the unchanged `Router` core (#169)
**Decided:** `GatedRouter` in `router.ts`: `on` throws on a method with no safety class; `handle` gates before dispatch and
post-checks before the reply; a throw from the gate → `INTERNAL`. `Router` unchanged; `sw.ts` constructs only `GatedRouter`
(static test). **Why:** `router.test.ts` registers unclassified names and must pass unchanged; S1.1's second half (#147).
**Instead of:** `Router.on` throwing (edits existing tests); a subclass sharing the handler map. **Revisit if:** an
ungated construction is needed outside tests. **By:** Claude (S2a report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a.md` §5)

### 2026-10-24 · S3: The SDK exports the types `SafetyState` and `HiddenReason` (#168)
**Decided:** type-only exports from `sdk/src/index.ts`. No value is added to the main entry.
**Why:** `client.safety()` returns one type and `TabInfo.hidden` uses the other.
**Instead of:** making callers import `@bridge/shared`.
**Revisit if:** the type list is to stay frozen.
**By:** Claude (contract-level; listed under Open decisions for the user; S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: A `listTabs` reply requested before a safety change notes no url/title in the daemon's cache (#167)
**Decided:** a generation count rises on every real safety change. A reply whose request predates the
latest change still mints handles, marks gone tabs and clears `"blocked"` rows, but adds no URL or
title. The reply forwarded to the client is unchanged.
**Why:** an out-of-order reply could otherwise undo the post-change refresh (S3 verifier finding 5).
**Instead of:** recording only after the refresh settles.
**Revisit if:** a cached URL stays missing after a safety change for longer than one refresh round
trip.
**By:** Claude (S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: Hidden rows in the daemon: `"blocked"` clears the cache, `"disarmed"` keeps it (#166)
**Decided:**
- A hidden row is never noted.
- A `"blocked"` row clears that handle's cached url and title.
- A `tabRemoved {hidden:"blocked"}` leaves no `lastUrl`/`lastTitle`.
- A `tabRemoved {hidden:"disarmed"}` keeps the cache.

**Why:** this is #134 as written.
**Instead of:** clearing on `"disarmed"` too, which would lose today's output after re-arming.
**Revisit if:** never.
**By:** Claude (S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: A new extension hello resets the reported state to null (#165)
**Decided:** `safety` is null from each extension hello until that socket reports.
**Why:** the state belongs to the socket that reported it.
**Instead of:** keeping the replaced socket's state.
**Revisit if:** a `browser_status` taken in that window is shown to mislead.
**By:** Claude (S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: The refusal wording (#164)
*Superseded 2026-10-24: was a `DISARMED` line with `scope:"evaluate"` for JavaScript off, because the user ruled a new code `JS_DISABLED` (#202); since Step 10 the same body reads `JS_DISABLED: <body>`, and an old Step 9 extension's `DISARMED {scope:"evaluate"}` reads `DISARMED: <body>` (#219).*
**Decided:**
- `DISARMED` all: "DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to
  turn it back on; do not retry."
- `DISARMED` evaluate: "DISARMED: the user has turned JavaScript off for the bridge in Chrome, so
  evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying
  on it; do not retry it."
- `DOMAIN_BLOCKED`: "DOMAIN_BLOCKED: the user has blocked this site for the bridge in Chrome. Stop and
  ask the user; do not retry, and do not try to reach the site another way."

A `DISARMED` with no valid scope is read as `"all"`. The MCP answers every tool with this line as an
error, through one wrapper (`withSafetyRefusals`), with no failure report and no screenshot.
**Why:** these are #133's two meanings, and when the scope is missing the stricter reading applies.
**Instead of:** separate SDK and MCP wordings; per-tool catches.
**Revisit if:** S4's actors misread a line.
**By:** Claude (S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: Safety refusals get no `report` property; the wording is `safetyRefusalLine` on `@bridge/sdk/report` (#163)
**Decided:** `@bridge/sdk/report` gains one value. `renderReport` returns that line for the two codes.
The main entry keeps its eight values and gains only the types `SafetyState` and `HiddenReason`.
**Why:** the attach-set contract test pins "no `report` on a non-attach code", and the MCP and the SDK
share one wording.
**Instead of:**
- `err.report` on safety errors, which breaks Step 8's contract test;
- an MCP-private copy of the lines, which changes no SDK surface but gives two wordings.

**Revisit if:** the user refuses the subpath value (then the MCP holds its own copy), or scripts need
`err.report()` on a safety refusal.
**By:** Claude (contract-level; listed under Open decisions for the user; S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: `browser_status`'s Safety line is a second text item, shown only while the extension is connected (#162)
**Decided:** while the extension is connected, the result is `[today's text, "Safety: …"]`. While it
is not, the result is today's single item.
**Why:** this is the only placement that keeps every existing line and every Step 8 test unedited.
`not reported (reload the extension)` would mislead when Chrome is simply closed.
**Instead of:** a new line in the first item, which means editing the pinned test text (forbidden);
the literal #132 reading while disconnected.
**Revisit if:** S4's live headless transcript shows the second item is not shown to the model. S4
needs a pre-registered row that reads the `Safety:` line from a transcript. Also revisit if the user
wants the literal reading.
**By:** Claude (contract-level; listed under Open decisions for the user; S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: `leaseGranted.url` is `""` while disarmed, whatever the event carried (#161)
**Decided:** this is in addition to F40's rule (a hidden row gives `""` at once).
**Why:** every other daemon output withholds URLs while disarmed. Without this, the channel would
depend on the extension alone.
**Instead of:** relaying the event's URL.
**Revisit if:** never, since nothing changes while armed.
**By:** Claude (contract-level; listed under Open decisions for the user; S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: The daemon's redaction follows the last state it received, across extension sockets (#160)
**Decided:** while the last state received in this daemon's life says disarmed, the #134 redaction
continues. It covers `daemon.status` rows without `url`, `tabGone`/`TAB_GONE` without
`lastUrl`/`lastTitle`, and `leaseGranted.url` `""`. It holds even while `safety` is null after the
socket closes, until a new report arrives. With no report ever received, nothing is redacted.
**Why:** this is the conservative rule. The cache still holds URLs from before the disarm, and a
reload's hello can come up to 2 s late.
**Instead of:** null redacts nothing, which reopens F2 during every reconnect.
**Revisit if:** a disarmed state should be forgotten once the extension is gone for good.
**By:** Claude (contract-level; listed under Open decisions for the user; S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S3: `safetyStatus` is never sent with null (#159)
**Decided:** the daemon broadcasts only a `SafetyState`. A reset to null (the extension socket
closes, or a new extension hello arrives) shows through `daemon.status.safety` and through
`extensionStatus`.
**Why:** `SafetyStatusParams` is `SafetyState` (S0, #132), and a null param would fail every SDK's
guard.
**Instead of:** a null broadcast; a new event.
**Revisit if:** a client must learn of the reset without `extensionStatus`.
**By:** Claude (contract-level; listed under Open decisions for the user; S3 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S3.md` §5)

### 2026-10-24 · S1: The refusal messages (#158)
**Decided:** the wording is in `safety.ts`'s `*_MESSAGE` constants. The two `DISARMED` scopes read differently
(#133). No message contains a URL, pattern, title or id (a test checks this). `DOMAIN_BLOCKED` carries no
`data`.
**Why:** #133 and 0.7. **Instead of:** one generic message.
**Revisit if:** S3's MCP and SDK wording should match word for word. **By:** Claude (S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: Script URLs are recognised as Chrome parses the scheme (#157)
**Decided:** before the case-insensitive scheme compare, `urlScheme` strips tabs and newlines and trims leading
C0 control characters and spaces. So `java\tscript:` and ` JavaScript:` are refused while JavaScript is off.
**Why:** a plain prefix check would let these through. **Instead of:** `startsWith`.
**Revisit if:** never; this is mechanical. **By:** Claude (S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: Matcher details §5 leaves implicit (#156)
**Decided:**
- A URL has a host only for `http`, `https`, `ws`, `wss` and `ftp`, plus `file:` with a host. `ftp` uses
  port 21 as its effective port. `file:` has no port.
- Wrappers are unwrapped up to 4 levels deep.
- These patterns are invalid: an empty label (`a..b`), `*.` alone, `*.*.x`, a pasted URL of another scheme, and
  a pasted URL whose host fails the name grammar.
- A numeric name that the URL parser reads as IPv4 is treated as an IP literal.
- A name pattern never matches an IP host, and an IP pattern never matches a name host.
- Lines split on `\r\n`, `\r` or `\n`.
**Why:** each is the stricter reading, or the only consistent one, of rules 3–6. Nothing matches by substring.
The empty list is unaffected.
**Instead of:** dropping `ftp` (Chrome no longer loads it, so including it costs nothing); splitting lines on
`\n` only.
**Revisit if:** the user wants `ftp` dropped or deeper nesting allowed.
**By:** Claude (contract-level; listed under Open decisions for the user; S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: The network filter treats a tab showing this extension's own page as blocked (#155)
**Decided:** `networkEntryBlocked` drops an entry when its tab's top-level URL is one of this extension's own
pages, as well as when the URL matches the list. An entry's own URLs are tested against the list only.
**Why:** #134 hides own pages as `"blocked"`, and F9 drops entries whose tab is blocked. The options page makes
no other requests, so nothing changes today.
**Instead of:** testing the tab URL against the list alone.
**Revisit if:** the user disagrees that own pages count as blocked for the log.
**By:** Claude (contract-level; listed under Open decisions for the user; S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: `downloadStart` checks its own URL against the block list only (#154)
**Decided:** a `downloadStart` to a `chrome-extension://` URL, this extension's or another's, is not refused by
the gate. It goes to the handler, which answers `BAD_PARAMS` as today because it requires http(s). A
`blob:`/`filesystem:` wrapper is still tested by its inner URL against the list.
**Why:** 0.4 names only "`downloadStart` whose URL … matches". #138's any-extension-URL rule names
`navigate`/`newTab`. The conservative rule's second property is that replies are identical while armed, JS on,
empty list. The builder's first version refused the extension's own page with `DOMAIN_BLOCKED` (verifier
finding 5(b)).
**Instead of:** `DOMAIN_BLOCKED` for own pages or for every extension URL.
**Revisit if:** the handler ever accepts a non-http(s) URL. Then the gate must refuse extension URLs.
**By:** Claude (contract-level; listed under Open decisions for the user; S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: Rule 7 unwraps wrapper URLs and compares case-insensitively (#153)
**Decided:** `isExtensionUrl` and `isOwnExtensionPage` unwrap `blob:`, `filesystem:` and `view-source:` up to
4 levels deep (rule 5's bound), and compare the scheme and the extension id case-insensitively. So
`view-source:chrome-extension://<own id>/options.html` is refused for `navigate`/`newTab` and hidden as an own
page. A URL wrapped 5 or more levels deep is treated as not an extension URL.
**Why:** rule 5 already tests these wrappers by their inner URL, and rule 7 read literally missed them
(verifier finding 4). The change is stricter only: no reply changes for a URL that is not an extension page. No
way to re-arm through the gap was found.
**Instead of:** rule 7 read literally, with a SAFE row added in S4; refusing every over-deep wrapper (that would
change today's answer for nested `view-source:` around `https:`).
**Revisit if:** a live row shows Chrome opening a URL wrapped more than 4 levels deep.
**By:** Claude (contract-level; listed under Open decisions for the user; S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: A target form a class does not take throws, and so does an empty target list (#152)
**Decided:** `TARGETS_BY_CLASS` lists the forms each class takes, and any other form throws. The error names the
method and the target kind, never a URL. `safetyDecisionAll([])` throws for every class but `state` and
`listTabs`, in every state, disarmed included. S2a's router turns the throw into `INTERNAL`.
**Why:** a wiring slip must refuse, never quietly allow (verifier finding 2).
**Instead of:** treating an unknown form as `none`, which would allow the call; checking the state first.
**Revisit if:** S2a needs a form the table lacks. Then add the form; never relax the check. **By:** Claude (S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: At receipt, a tab already gone is left to the handler, except for the network methods (#151)
**Decided:** #137 as written. At receipt, after the state checks, a `gone` target is allowed for every class but
`network`, so the handler answers `TAB_UNKNOWN` as today. A network `tabId` on a closed tab is tested by its last
known URL (0.3's F30 note). The effect and post phases test a gone tab by its last known URL.
**Why:** #137 and S1.2's required row ("a tab unreadable at receipt × armed → allow"). The builder's first
version refused a gone tab whose last URL was blocked, and the verifier rated that MAJOR.
**Instead of:** the builder's rule, which was stricter but is a refusal code #137 did not choose.
**Revisit if:** a blocked page is shown to close itself to slip a reply past the gate (#137's own Revisit-if).
**By:** Claude (S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: `downloadChunk` and `downloadEnd` are refused on the state alone (#150)
**Decided:** class `state`. They are refused `DISARMED {scope:"all"}` while disarmed and never by the block list.
**Why:** 0.3 says "the network and download methods" are refused while disarmed. They carry no URL, and their
`downloadStart` was already checked. Nothing changes while armed. The verifier judged this not a change to what
is gated (S1-verifier.md finding 5(e)).
**Instead of:** leaving them free while disarmed.
**Revisit if:** a pull after a quick re-arm is wanted. **By:** Claude (S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · S1: S1's module layout: the matcher in `safety-match.ts`, the gate in `safety.ts` (#149)
**Decided:** two pure modules. The parser, matcher and URL helpers go in `safety-match.ts`, which S2b's options page can
import alone. The table, gate, redaction and network predicate go in `safety.ts`.
**Why:** the options page needs only the parser. **Instead of:** one file.
**Revisit if:** S2b's options bundle should carry neither. **By:** Claude (S1 report `docs/plans/2026-10-24-step9-phase-e-safety-steps/S1.md` §5)

### 2026-10-24 · The SDK's `TabInfo` keeps `title` and `url` as strings and gains an optional `hidden` (#148)
**Decided:** for a hidden row (#134) the SDK's exported `TabInfo` (`sdk/src/client.ts`) keeps `title: string`
and `url: string`, set to `""`, and gains `hidden?: HiddenReason`; renderers in the SDK and the MCP print
`(hidden: the bridge is off)` / `(hidden: blocked site)` from `hidden`. The shared wire row types stay as S0
built them (`title?`/`url?`, #146); the SDK maps absent to `""`.
**Why:** the SDK's public surface is a contract; an additive optional field keeps every existing consumer
compiling and reading a string, where making `title`/`url` optional would break typed callers (S0 report
Finding, `sdk/src/client.ts:156`). No hidden row exists while armed with an empty list, so nothing changes today.
**Instead of:** `title?`/`url?` on `TabInfo` (a breaking type change); `undefined` at runtime under a type that
says `string` (a lie that prints `undefined`, Stage 0 F13).
**Revisit if:** the user prefers the optional fields.
**By:** Claude (contract-level — the SDK's public surface; listed under Open decisions for the user)

### 2026-10-24 · Where S2's and S1.1's checks close after the split (#147)
**Decided:** S2.1 and S2.2 close at S2a, S2.3 at S2b, S2.4 at both; S2b's lane includes the `sw.ts` badge
start-up and the `action.onClicked` registration; the `storage.local.set` half of S3.3's stricter wording
is carried by S2a/S2b (S3 keeps the `methods.ts` and tool-list half). S1.1's stricter half — `Router.on`
throws on a method with no safety class — closes at S2a (`extension/src/router.ts` is S2a's lane); S1 ships
the table, a lookup that throws on an unclassified name, and the source scan of `router.on(` names.
**Why:** #145 split the stage without assigning checks (S0 report §5); keeping S1 file-disjoint from S2a
keeps S1 ∥ S3 clean. Every check still runs, none is loosened; one closes a stage later.
**Instead of:** widening S1's lane to `router.ts` for one guard line; S2.4 at one close only.
**Revisit if:** S2a cannot close S1.1's half (then escalate).
**By:** Claude

### 2026-10-24 · S0's build details: optional row fields on the wire types, the state guard, no marker on `tabCreated`, comments out of arrays (#146)
**Decided:** as proposed in `docs/plans/2026-10-24-step9-phase-e-safety-steps/S0.md` §5: `ExtensionListTabsRow`
and `ListTabsRow` carry `title?`/`url?`/`hidden?`; `isSafetyState` requires a non-negative safe-integer
`blockedCount` and a non-array object; `tabCreated` stays `{tabId, openerTabId?, url}` with `url: ""` when
hidden and no marker (#134 as written); explanatory comments sit above the code constants, never inside array
literals (esbuild keeps those in the bundles).
**Why:** each follows #134 or keeps the bounded bundle diff; none changes a reply while armed.
**Instead of:** the alternatives listed in S0.md §5.
**Revisit if:** S3 finds F40's "stop at a hidden row" needs a marker on `tabCreated` (contract-level: escalate).
**By:** Claude

### 2026-10-24 · Step 9's stage split after Stage 0: S2 becomes S2a (enforcement) and S2b (UI) (#145)
**Decided:** the stages run S0 (0.75 h, alone; its first deliverable also pastes Stage 0's plan-side
amendment texts into the phase doc) → S1 (2.5 h) ∥ S3 (2.5 h) → S2a extension enforcement (3 h) → S2b
extension UI and the 0.7 log scan (1.5 h) → S4 (1.5 h prep + 2.5 h live, alone) → S5 (1 h). About 15 h
against the kickoff's 12.5 h. S2a's lane is S2's minus the manifest and options page; S2b's is the
manifest, `options.html`/`options.ts`, the badge and the log-scan test.
**Why:** D6 (#137) and D8 (#139) roughly double the enforcement work; one verifier per half keeps each
review bounded (Stage 0 §9). The name S2b is Step 9's own; Step 8's S2b is unrelated. Stage 0's decisions D1–D13 are recorded as #132–#144 (Dn = #(131+n)); their texts cite Stage 0's
findings F1–F43 and verifier items V1–V17 in `stage0-audit.md`.
**Instead of:** one S2 of 4.5 h.
**Revisit if:** S2a's verifier finds the split left a gap between enforcement and UI.
**By:** Claude

### 2026-10-24 · A re-arm right after a disarm is ignored (#144)
**Decided:** a toolbar click or shortcut press that would re-arm within 1 000 ms of the last disarm is ignored
(badge stays `OFF`); a disarm always takes effect at once and is never debounced; the options page's switch is
not debounced. The badge and title are re-derived from `storage.local` at every worker start (F42).
**Why:** F43 (V12b) — the control is a toggle, so a panic double-click or a repeated shortcut would otherwise
re-arm; ignoring only the re-arm direction errs safe.
**Instead of:** no debounce; a symmetric debounce (could delay a disarm); a separate "off only" shortcut.
**Revisit if:** SAFE-1b shows the debounce confusing the human, or the user wants a different window.
**By:** Claude (contract-level — how the safety state is changed — listed under Open decisions for the user; Stage 0 audit D13, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · Badge and title (#143)
**Decided:** disarmed → badge `OFF` red, title "Chrome Agent Bridge — OFF: agents are refused (click to turn
on)"; armed with JavaScript off → badge `JS` amber, title "… armed, JavaScript off (click to turn off)"; armed →
no badge, title "… armed (click to turn off)". The options page states the block count and invalid lines.
**Why:** 0.2/0.5 ask for it; one badge at a time, `OFF` wins (F37).
**Instead of:** a badge per control.
**Revisit if:** the user prefers other words or colours.
**By:** Claude (Stage 0 audit D12)

### 2026-10-24 · The shortcut is `_execute_action` (#142)
**Decided:** manifest `commands: {"_execute_action": {"suggested_key": {"default": "Alt+Shift+K"}}}`; the button
and the shortcut share one top-level `action.onClicked` listener; no `commands.onCommand` listener.
**Why:** Chrome dispatches `action.onClicked` for `_execute_action` (commands docs); one code path for both.
**Instead of:** a named command plus `onCommand`.
**Revisit if:** S4 finds the reserved command does not fire with no popup.
**By:** Claude (Stage 0 audit D11)

### 2026-10-24 · Stricter exit checks for Step 9 (#141)
**Decided:** S0.1, S0.2, S1.1–S1.3, S2.1–S2.4, S3.2, S3.3, S4.3, S4.4 read as in stage0-audit.md §6.
**Why:** F15 — four checks could not fail as written; Stage 0 may only make checks stricter (kickoff §7).
**Instead of:** the original wording.
**Revisit if:** a stricter check proves unexecutable (then escalate, never loosen silently).
**By:** Claude (pre-registered rules — listed under Open decisions for the user; Stage 0 audit D10, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140)
*Ruled 2026-10-25 by the user (#229): that network rule (`declarativeNetRequest`) becomes its own small step after Step 11, before Step 12.*
**Decided:** check the URL before the fetch and `res.url` when `fetch` resolves, aborting the body; document that a
hop onto a blocked host is still requested. A `declarativeNetRequest` session rule that blocks requests to
blocked hosts itself (new manifest permission `declarativeNetRequestWithHostAccess`) is **not** built in Step 9.
That one open decision covers both places it would help (V13): a download's redirect hop, and a bridge `navigate`
that an allowed open redirector bounces onto a blocked host (a main-frame GET with the profile's cookies, a side
effect the post-check refuses to report but cannot undo).
**Why:** F8, F16; the manifest lane allows only `action` and `commands`.
**Instead of:** `redirect: "error"` (breaks Blackboard → S3 downloads); DNR now (outside the lane); two separate
DNR decisions.
**Revisit if:** the user wants either hop blocked (then DNR in a later step, for both).
*Ruled 2026-10-24 by the user (#202): ratified, and the DNR network rule is planned for a later step.*
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D9, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · The state is read per call, fails closed, and is locked to trusted contexts (#139)
**Decided:** F10's read rule (per-call `storage.local.get` after `ready`, in-memory copy for webRequest only,
defaults when absent, fail closed with `DISARMED` on a read error — of the *state*, not of a tab, see D6) and
F4's `storage.local.setAccessLevel({accessLevel: "TRUSTED_CONTEXTS"})`, called at module scope after every
listener registration, guarded so it cannot throw synchronously, not awaited (V7); the router accepts
`ws-message` only when `sender.url` is this extension's `offscreen.html` and `sender.tab` is undefined (F19, V6).
**Why:** a call never acts on a stale state; no page-adjacent context can write it.
**Instead of:** an `onChanged` cache (0.2's allowance).
**Revisit if:** the per-call read is measured to cost more than a few ms.
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D8, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · Script URLs and the JavaScript switch; own pages of every extension (#138)
*Superseded 2026-10-24: was `DISARMED` `scope:"evaluate"` for a script URL while JavaScript is off, because the user ruled a new code `JS_DISABLED` for it (#202), built in Step 10 (#219); the own-pages rule stands as built (#202).*
**Decided:** while JavaScript is off, `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL →
`DISARMED` `scope:"evaluate"`; while it is on, those behave as today. `navigate`/`newTab` to any
`chrome-extension://` URL → `DOMAIN_BLOCKED`; acting on a tab, and its `listTabs` row/events, are blocked/hidden
only for **this** extension's own pages (by `url` or `pendingUrl`). `chrome://` navigation is unchanged
(interaction is already refused, F34).
**Why:** F3, F14, and the conservative rule's second property (V8): with JavaScript on, a `javascript:` URL grants
nothing `evaluate` does not, so refusing it then would only change today's answer; acting on another extension's
page is already refused by Chrome for scripting and the debugger, so blocking every id would change
`navigate`-away, `closeTab`, `focusTab` and `listTabs` titles there for little gain. Navigation *to* any extension
page is refused because nothing uses it today and it is the only way the bridge itself could put one in front.
**Instead of:** `javascript:` → `BAD_PARAMS` always (the audit's first draft); every extension id blocked for every
method and hidden in `listTabs` (wider; its cost is the changed answers above — **offered to the user as the
alternative**); own id only for navigation too; leaving script URLs to Chrome while JavaScript is off.
**Revisit if:** a recipe needs a `data:` page with JavaScript off; SAFE-6c shows Chrome running a `javascript:`
navigation in a way `evaluate` could not; a screenshot of another extension's page is judged sensitive (then the
wider rule).
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D7, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · In-flight work at disarm and on a newly blocked tab (#137)
**Decided:** (1) gate at receipt, again right before each first side effect (`showTab`, `captureVisibleTab`,
`tabs.update`/`create`/`remove`, each action's `callInPage` and trusted input — V17), and a post-check before the
reply (all methods but `listTabs`, which is redacted, and `newTab`/`closeTab`, whose post-check is the state only).
Every run checks the state first (disarmed → `DISARMED`; JavaScript off + `evaluate` → `DISARMED scope:"evaluate"`),
then the tab: a live tab by its current `url`/`pendingUrl`; a tab replaced during the call under its new id; a
tab gone during the call (or unreadable) by the last URL the worker knew for it — **none known, or not blocked →
the reply stands as today**. At receipt an unreadable tab is left to the handler (today's `TAB_UNKNOWN`). So with
the state armed, JavaScript on and an empty list, `evaluate("window.close()")`, a click that closes its popup and
a call across a Memory-Saver replacement answer exactly as today (V3; S1.2's required rows); (2) `withDebugger`
re-checks before attaching;
a pure session registry detaches every session at disarm; errors from those sessions become `DISARMED`; (3)
worker-side poll loops re-check per tick; (4) at disarm the download store is cleared and a late fetch's entry
is released when its reply is refused; (5) a capture verifies the captured tab (F11); (6) the network log drops
events while disarmed and filters blocked hosts at ingest and at query (F9), with a pre-ready buffer; entries
recorded while armed stay.
**Why:** F1, F5, F6, F9, F11, F24; nothing changes while armed with JavaScript on and an empty list, because
every refusal needs a disarmed state, JavaScript off on an `evaluate`, or a URL that matches a pattern (own pages
excepted), and a tab that vanished mid-call keeps today's answer.
**Instead of:** one check at receipt (0.1 as written); refusing whenever the tab cannot be re-read at the
post-check (fail closed by analogy with D8 — rejected: it turns today's `ok` for a self-closing tab into an error
while armed, V3).
**Revisit if:** the post-check is shown to refuse a reply the human wanted after re-arming quickly (it only ever
refuses); or a blocked page is shown to close itself to slip a reply past the post-check (then the last known URL
must be kept for every tab the call touched).
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D6, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · `tabs.claim` on a blocked tab is granted, every call on it refused (#136)
**Decided:** the daemon's claim stays bookkeeping only (F21); the extension refuses every page call on the tab.
The opener rule likewise: a popup of a held blocked tab is leased to the holder at once
(`daemon/src/intercept.ts:213-217`, with `leaseGranted`), and every page call on it is refused while it is blocked.
**Why:** a lease grants no page capability; any client can claim an unheld tab by handle, so refusing
`{active:true}` alone protects nothing, and it would put block-list knowledge in the daemon (0.1); the opener
grant is equivalent to claiming the popup by handle (V16); with an empty list nothing changes.
**Instead of:** refusing the claim; withholding opener grants for blocked tabs.
**Revisit if:** a lease on a blocked tab is ever shown to grant a capability, or an opener grant is shown to reveal
something a claim by handle does not (e.g. a popup URL in `leaseGranted` — redacted by D3/F40).
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D5, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · The block-list grammar (#135)
**Decided:** the grammar and matching rules of stage0-audit.md §5 (host and subdomains; `*.` subdomains only;
optional port = effective port; IDN to punycode; canonical IP literals, bracketed IPv6; `#` comments; a pasted URL
reduced to its host; invalid lines kept, shown, not counted; `blob:`/`filesystem:`/`view-source:` by the inner
URL; `file:` by its host if any; this extension's own pages blocked always and navigation to any
`chrome-extension://` URL refused), with the 50-case table as S1.3's test list.
**Why:** settles F22 with the strictest readings that never match by substring.
**Instead of:** exact-host only (misses subdomains the human means); allowing `*` (duplicates disarm).
**Revisit if:** the user wants path-level blocking or an allow-list mode.
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D4, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · What `listTabs`, tab events and the daemon reveal while disarmed or for a blocked tab (#134)
**Decided:** a hidden `listTabs` row keeps `id`, `windowId`, `active`, `openerTabId`, `current` (and the daemon's
`tab`, `owner`), drops `title` and `url`, and adds `hidden: "disarmed" | "blocked"`. While disarmed every row is
`"disarmed"`; while armed, a row whose `url` or `pendingUrl` is blocked (or one of this extension's own pages) is
`"blocked"`. `tabCreated.url` is `""` and `tabRemoved` has no `lastUrl`/`lastTitle` but the same `hidden` marker,
under the same rule. The daemon, while the last state says disarmed, omits `url` from `daemon.status` rows and
`lastUrl`/`lastTitle` from `tabGone`/`TAB_GONE` (cache kept); a `listTabs` row or `tabRemoved` with
`hidden: "blocked"` clears that handle's cached url/title, and the daemon runs one `listTabs` on every safety-state
change so a newly blocked tab's cache is cleared within one round trip (F41); the opener rule's `leaseGranted.url`
is then `""` and `fillUrl` stops at a hidden row instead of polling 2 s (F40). The MCP and the SDK render a hidden
row as `(hidden: the bridge is off)` / `(hidden: blocked site)`.
**Why:** F2, F40, F41 — redaction at one channel leaks through the others, including a cache filled before the
pattern existed; the marker keeps agents able to say why (0.3's intent) and fixes F13; everything is unchanged
while armed with an empty list (no row or event is ever hidden then; own pages excepted, which nothing opens today).
**Instead of:** redacting `listTabs` only (#131 as recorded); no marker (MCP prints `undefined — undefined`).
**Revisit if:** the user wants URLs visible while disarmed.
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D3, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · The JavaScript switch reuses `DISARMED` with a scope (#133)
**Decided:** `evaluate` (with or without `asRef`) while JavaScript is off is refused `DISARMED` with `data:
{scope: "evaluate"}`; kill-switch refusals carry `data: {scope: "all"}`. 25 codes stand. The extension's
message, the MCP's line and the SDK's `report()` differ by scope: `"all"` — the user turned the bridge off, stop
and ask them; `"evaluate"` — the user turned JavaScript off, every other tool still works (V9; S3.2 tests both).
**Why:** an agent's correct reaction is close (ask the user before relying on the refused capability); the scope
tells them apart without a third code or message parsing; S0.2's count is pre-registered.
**Instead of:** a third code `JS_DISABLED` (clearer name, but changes a pre-registered check and the spec twice).
**Revisit if:** a client must branch on it often enough that `data.scope` proves awkward.
*Ruled 2026-10-24 by the user (#202): changed — a new code `JS_DISABLED` replaces `DISARMED` + `scope: "evaluate"`, built in Step 10.*
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D2, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · The safety state travels as two events and a `daemon.status` field (#132)
**Decided:** the service worker sends an extension→daemon event `safetyState {armed, evaluate, blockedCount}` after
each connection comes up (`ws-status` true) and on every change; never in the hello. The daemon keeps the latest
(null until reported, null again when the extension socket closes), logs one line per change with booleans and
the count only, adds `safety: {armed, evaluate, blockedCount} | null` to `daemon.status`, and broadcasts a
daemon→client event `safetyStatus` with the same params on every change. The SDK exposes it read-only:
`client.safety()` (reads `daemon.status`) and `on("safetyStatus")`. `browser_status` prints `Safety: armed |
DISARMED by the user · JavaScript on|off · N blocked site(s)`, or `Safety: not reported (reload the extension)`
when null. Types and guards in `shared/src/protocol.ts` at S0.
**Why:** the hello is sent once per connection and the offscreen document keys its client on
`port:token:session`, so a state carried there would force a reconnect on every change (F12, as corrected by
V14); a field on `extensionStatus` would break its documented meaning (true only on a hello, spec §10);
unknown event names are ignored by old SDK clients and old daemons (probe P3), so it is backward compatible.
**Instead of:** a hello field; a field on `extensionStatus`; a field on `welcome` (a client connecting later reads
`daemon.status` instead).
**Revisit if:** a client needs the state before its first call without a round trip.
**By:** Claude (contract-level — listed under Open decisions for the user; Stage 0 audit D1, `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §8)

### 2026-10-24 · The Step 9 phase doc's proposals, recorded before Stage 0 so the audit can attack them (#131)
**Decided:** the proposals of the Step 9 phase doc's "Decisions" not marked **(user)** are recorded as
written, for Stage 0 to audit: (1) 0.1 — one pure gate `safetyDecision(method, params, tabUrl, state)` in
`extension/src/safety.ts` before every router handler, with a table that classifies every router method
(23 today) and a test that fails on an unclassified one; the daemon and the SDK enforce nothing new; no
wire, daemon or SDK method changes the safety state. (2) 0.3 — while disarmed, `listTabs` returns handles
and `current` but no titles or URLs; the network log records nothing; `DISARMED` stays out of the
failure-report attach set. (3) 0.4 — `listTabs` and tab events carry no title or URL for a blocked tab;
the network log records no entry whose URL host is blocked; the extension's own pages
(`chrome-extension://<this id>/…`) are always blocked, not configurable. (4) 0.6 — the extension reports
`{armed, evaluate, blockedCount}` (never the patterns) on hello and on every change, relayed by the daemon
like `extensionStatus`; `browser_status` prints a `Safety:` line; the SDK exposes it read-only; the MCP
renders the two codes as one plain line that tells the model to stop and ask the user. (5) 0.7 — a static
test enumerates every log call site in `extension/src`, `daemon/src`, `sdk/src`, `mcp/src` against an
allowlist; the toggles log one line each with no pattern or URL. Left for Stage 0 to rule (conservative
rule): the wire shape of 0.6 (a new event or a field on an existing one); one code or two for the
JavaScript switch (0.5); the exact pattern grammar (0.4).
**Why:** the kickoff (§4 Output) asks for the proposals to be on record before the audit, so a wrong
premise becomes a finding and an amendment here, not a silent change. Each proposal is the stricter
option: it reveals less (redaction, no recording) and keeps every tool unchanged while armed with
JavaScript on and an empty list.
**Instead of:** leaving them only in the phase doc (an audit finding would then have no entry to amend);
enforcing in the daemon (the token reaches the daemon; the human's controls must hold against it).
**Revisit if:** Stage 0 finds a premise wrong (amend this entry with a dated note), or the user rules
otherwise at the gate.
**By:** Claude (proposed; contract-level parts listed under Open decisions for the user)
*Amended 2026-10-24 (Stage 0): three premises refuted — redacting `listTabs` alone leaks through tab
events and the daemon's cache (F2; now #134); one gate at receipt does not cover multi-step handlers
(F1; now #137); the network filter misses four paths (F9; now #137 item 6). The wire shape, the
JavaScript code and the grammar are ruled in #132, #133, #135.*

### 2026-10-24 · Step 9 agents run Opus 5.5 (#130)
**Decided:** every agent of Step 9 at every level runs Claude Opus 5.5 (`claude-opus-5-5`), with
`model: "opus"` on every Agent call; only S4's headless E2E actor sessions (`claude -p`) may run Sonnet.
**Why:** the user's standing preference for quality, "I like higher quality product" (decisions.md ·
2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7 open decisions (#69)), applied to
Step 8 by #70 and restated by the Step 9 kickoff.
**Instead of:** Sonnet for builders (cheaper, but the user ruled for quality).
**Revisit if:** the user says otherwise.
**By:** user

### 2026-10-24 · The roadmap after Step 8 (#129)
*Ruled 2026-10-25 by the user (#229): the network rule against redirects onto blocked sites (#140) becomes its own small step after Step 11, before Step 12.*
**Decided:** Step 9 is Phase E safety (phase doc `docs/plans/2026-10-24-step9-phase-e-safety.md`, kickoff
`docs/plans/next-session-prompt.md`). The other items are planned as later steps, in this order:
Step 10 — the Step 8 follow-ups (W2's six work items, #106/#117/#125/#126/#127, plus the carried inputs:
the ~1.5 s failure-report screen switch, `bb-login.ps1`'s condition-based wait); Step 11 — D3 file
upload; Step 12 — the open Phase F items (`args` for `browser_evaluate`, console capture, the
keep-attached debugger session).
**Why:** the user (2026-10-24): "Dear Claude, we can do Phase E safety fist. But other items such as D3
files upload, Phase F items, Step 8 follow-ups should be also implemented in the future sessions,
please plan them as well". The order of Steps 10–12 is Claude's: the follow-ups first because they
close known gaps (background trusted input through the MCP, bulk data through a model's context), then
the smallest new feature, then the open-ended one.
**Instead of:** folding the follow-ups into Step 9 (mixes a safety boundary with UX fixes in one gate).
**Revisit if:** the user reorders Steps 10–12 (the order is open for veto).
**By:** user (Step 9 and the plan); Claude (the order of Steps 10–12, flagged for veto)

### 2026-10-24 · Phase E's design: the kill switch, the disarmed state, blocked sites, the JavaScript switch (#128)
**Decided:** (1) the human disarms the bridge by a toolbar button (one click), the options page, or a
keyboard shortcut; (2) disarmed refuses every call that reads or acts on a page with a new code, detaches
debugger sessions, and still answers status and the tab list, the socket staying up; (3) a per-site
block list, empty by default; (4) a separate "Allow JavaScript (`browser_evaluate`)" switch, default on.
Details and the proposals around them: the Step 9 phase doc, "Decisions" 0.1–0.7.
**Why:** the user (2026-10-24), answering the four questions: "Toolbar, optios, shortcut"; "Refuse page
calls (Recommended)"; "Block list, empty default (Recommended)"; "Yes, separate switch (Recommended)".
**Instead of:** options page only; dropping the connection when disarmed; refusing only actions while
allowing reads; an allow-list mode; no JavaScript switch.
**By:** user

