# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title.

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

Six proposals from the Step 6 E2E wave (W1, 2026-10-22), with options, a recommendation and the
measurement, in `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md` § "W1 as-built" →
"Proposed decisions — for the user":
1. ~~MUX-5 is accepted on its re-measurement~~ — *ruled by the user 2026-10-22, see "MUX-5 is
   accepted; its slowness is a later item" (#34) below.*
2. ~~NET-1's expected size is corrected to `12.6 KB`~~ — *investigated (#35), then ruled (#36).*
3. ~~Step 7 makes `browser_status` and the actions agree on the active tab~~ — *ruled (#36).*
4. ~~Step 8 checks which handles the spawned daemon inherits~~ — *ruled (#36).*
5. ~~DL-1's service-worker log line is accepted as not observed~~ — *ruled (#36).*
6. ~~Step 6 closes (gate G6-2) once 1 and 2 are accepted~~ — *ruled (#36): Step 6 is closed.*

None open now. *Updated 2026-10-22: all six W1 proposals are ruled.*

Step 7 (2026-10-22 on):
1. ~~"Step 7 agents run Opus 5.5" (#37)~~ — *ruled by the user 2026-10-23 (#69).*
2. ~~"The `tab` parameter keeps its "all"/"active" meanings for the network tools" (#40)~~ — *ruled (#69).*
3. ~~"A Step 6 client keeps working against a Step 7 daemon for one release, without loosening a
   lease" (#41)~~ — *ruled by the user 2026-10-23 (#68).*
4. ~~"A stale extension is refused for tab calls, detected by its hello" (#42)~~ — *ruled (#68).*
5. ~~"The formatters reach the MCP through a `@bridge/sdk/format` subpath" (#46)~~ — *ruled (#69).*
6. ~~"v2 peers do not yet require `code`" (#51)~~ — *ruled (#69).*
7. ~~"A bare number in a network `tab` is a legacy Chrome id, not `BAD_PARAMS`" (#54)~~ — *ruled (#69).*

None open now. *Updated 2026-10-23: all seven Step 7 open decisions are ruled (#68, #69).*

Step 8 (2026-10-23 on), for the user at the gate:
1. ~~"Stage FE measures focus emulation before `policy.ts` is set" (#71)~~ — *ruled by the user 2026-10-24 (#106).*
2. ~~"S2's daemon half becomes stage S2b" (#72)~~ — *ruled by the user 2026-10-24 (#107).*
3. ~~"S2b makes `code` required on error frames" (#73)~~ — *ruled by the user 2026-10-24 (#108).*
4. ~~"The extension hello carries an optional session marker" (#74)~~ — *ruled by the user 2026-10-24 (#109).*
5. ~~"S3.4 applies as written: the main entry also re-exports the formatters" (#75)~~ — *ruled by the user 2026-10-24 (#110).*
6. ~~"`NO_CURSOR` enters `shared/src/codes.ts` as the 23rd code" (#76)~~ — *ruled by the user 2026-10-24 (#111).*
7. ~~"FE's rows and outcome table, amended before anything is measured" (#78, amends #71)~~ — *ruled by the user 2026-10-24 (#106).*
8. ~~"A new daemon never reuses a handle number; the SDK guards stale `Tab`s" (#79)~~ — *ruled by the user 2026-10-24 (#112).*
9. ~~"The session marker's mechanism, amended" (#80, amends #74)~~ — *ruled by the user 2026-10-24 (#109).*
10. ~~"The Chrome `id` stays beside `tab` this step; network calls without `tab` stay "active"" (#81)~~ — *ruled by the user 2026-10-24 (#113).*
11. ~~"Page-function failures may carry `data` beside the marker" (#82)~~ — *ruled by the user 2026-10-24 (#114).*
12. ~~"Locator rules, the MCP locator schema and the exported `BridgeError`" (#83)~~ — *ruled by the user 2026-10-24 (#115).*
13. ~~"Pre-registered checks reworded where they could not hold or could not fail" (#84)~~ — *ruled by the user 2026-10-24 (#116).*
14. ~~"S1's locator details" (#87), items 2–4~~ — *ruled by the user 2026-10-24 (#117).*
15. ~~"The SDK `Tab` surface details and the cursor rule as built" (#90), items 1, 2, 7~~ — *ruled by the user 2026-10-24 (#118).*
16. ~~"S3.5's outcome and the Step 6 revisit items" (#91), #24 and #27/#28 as final surface~~ — *ruled by the user 2026-10-24 (#119).*
17. ~~"S4's failure-report details, and how the MCP reaches them" (#93)~~ — *ruled by the user 2026-10-24 (#120).*
18. ~~"S2b's details: the `selectTab` refusal grep, the marker's edge cases, the handle mark" (#94)~~ — *ruled by the user 2026-10-24 (#121).*
19. ~~"S5's MCP details: `browser_new_tab` activation, the status lines, the tool schemas, reports" (#95)~~ — *ruled by the user 2026-10-24 (#122).*
20. ~~"S6's findings ruled: the user's answers, stage S6b for REP-1, re-registered rows" (#99), items 6 and S6b's error-result change~~ — *ruled by the user 2026-10-24 (#123, #124).*
21. ~~"An MCP failure report with a screenshot is returned as a non-error result" (#100)~~ — *ruled by the user 2026-10-24 (#124).*
22. ~~"S7's doc rulings: the setup snippet, grouped wave gotchas, S7.3 by the commit map" (#104), item 3~~ — *ruled by the user 2026-10-24 (#125).*
23. ~~"S6's findings ruled: …" (#99), item 5 (SM-1 and LOC-1 re-registered before their re-run)~~ — *ruled by the user 2026-10-24 (#126).*
24. ~~"SDK-7's MCP leg is re-registered with a cap that fits pp1's export" (#102)~~ — *ruled by the user 2026-10-24 (#127).*
25. ~~"S6.3 compares one in-page export read through both paths" (#103)~~ — *ruled by the user 2026-10-24 (#127).*

None open now. *Updated 2026-10-24: all 25 Step 8 open decisions are ruled (#106–#127, wave W2).*

Step 9 (2026-10-24 on), for the user at the gate:
1. ~~"The Step 9 phase doc's proposals, recorded before Stage 0 so the audit can attack them" (#131): the gate's scope (0.1), `listTabs`/event redaction while disarmed and for blocked tabs, the network log while disarmed and for blocked hosts, the own-page block, the safety state's wire shape (0.6) and the JavaScript switch's code (0.5) — as amended by Stage 0.~~ — *ruled by the user 2026-10-24 (#202).*
2. ~~"The safety state travels as two events and a `daemon.status` field" (#132).~~ — *ruled by the user 2026-10-24 (#202).*
3. ~~"The JavaScript switch reuses `DISARMED` with a scope" (#133).~~ — *ruled by the user 2026-10-24 (#202): changed — a new code `JS_DISABLED`, built in Step 10.*
4. ~~"What `listTabs`, tab events and the daemon reveal while disarmed or for a blocked tab" (#134).~~ — *ruled by the user 2026-10-24 (#202).*
5. ~~"The block-list grammar" (#135).~~ — *ruled by the user 2026-10-24 (#202).*
6. ~~"`tabs.claim` on a blocked tab is granted, every call on it refused" (#136).~~ — *ruled by the user 2026-10-24 (#202).*
7. ~~"In-flight work at disarm and on a newly blocked tab" (#137).~~ — *ruled by the user 2026-10-24 (#202).*
8. ~~"Script URLs and the JavaScript switch; own pages of every extension" (#138) — the wider every-extension rule is offered as the alternative.~~ — *ruled by the user 2026-10-24 (#202).*
9. ~~"The state is read per call, fails closed, and is locked to trusted contexts" (#139).~~ — *ruled by the user 2026-10-24 (#202).*
10. ~~"`downloadStart` and redirects onto a blocked host" (#140) — declarativeNetRequest not built.~~ — *ruled by the user 2026-10-24 (#202); a network rule follows in a later step.*
11. ~~"Stricter exit checks for Step 9" (#141).~~ — *ruled by the user 2026-10-24 (#202).*
12. ~~"A re-arm right after a disarm is ignored" (#144).~~ — *ruled by the user 2026-10-24 (#202).*
13. ~~"The SDK's `TabInfo` keeps `title` and `url` as strings and gains an optional `hidden`" (#148).~~ — *ruled by the user 2026-10-24 (#202).*
14. ~~"S1: Rule 7 unwraps wrapper URLs and compares case-insensitively" (#153).~~ — *ruled by the user 2026-10-24 (#202).*
15. ~~"S1: `downloadStart` checks its own URL against the block list only" (#154).~~ — *ruled by the user 2026-10-24 (#202).*
16. ~~"S1: The network filter treats a tab showing this extension's own page as blocked" (#155).~~ — *ruled by the user 2026-10-24 (#202).*
17. ~~"S1: Matcher details §5 leaves implicit" (#156).~~ — *ruled by the user 2026-10-24 (#202).*
18. ~~"S3: `safetyStatus` is never sent with null" (#159).~~ — *ruled by the user 2026-10-24 (#202).*
19. ~~"S3: The daemon's redaction follows the last state it received, across extension sockets" (#160).~~ — *ruled by the user 2026-10-24 (#202).*
20. ~~"S3: `leaseGranted.url` is `""` while disarmed, whatever the event carried" (#161).~~ — *ruled by the user 2026-10-24 (#202).*
21. ~~"S3: `browser_status`'s Safety line is a second text item, shown only while the extension is connected" (#162).~~ — *ruled by the user 2026-10-24 (#202).*
22. ~~"S3: Safety refusals get no `report` property; the wording is `safetyRefusalLine` on `@bridge/sdk/report`" (#163).~~ — *ruled by the user 2026-10-24 (#202).*
23. ~~"S3: The SDK exports the types `SafetyState` and `HiddenReason`" (#168).~~ — *ruled by the user 2026-10-24 (#202).*
24. ~~"S2a: a disarm whose write fails twice returns `"write-failed"` and stays disarmed in memory" (#174).~~ — *ruled by the user 2026-10-24 (#202).*
25. ~~"S2a: `navigate`/`newTab` are gated on the URL Chrome will open" (#175).~~ — *ruled by the user 2026-10-24 (#202).*
26. ~~"S2a: a disarm held in memory wins over a storage read" (#176).~~ — *ruled by the user 2026-10-24 (#202).*
27. ~~"S2a: a capture whose window showed another tab is refused `OFFSCREEN`" (#177).~~ — *ruled by the user 2026-10-24 (#202).*
28. ~~"S2a: the post-check also replaces error replies; `listTabs` with an unreadable state is refused, and has no post-check" (#178).~~ — *ruled by the user 2026-10-24 (#202).*
29. ~~"S2a: the network ingest drops a request for good once one of its events was dropped" (#179).~~ — *ruled by the user 2026-10-24 (#202).*
30. ~~"S2a: no `safetyState` is sent while the state cannot be read" (#180).~~ — *ruled by the user 2026-10-24 (#202).*
31. ~~"S2b: the writers test refuses `storage.local.remove`/`clear` everywhere" (#188).~~ — *ruled by the user 2026-10-24 (#202).*
32. ~~"S4: Run 13 stands as recorded, with the runner's four self-resolved stops listed" (#192)~~ — *ruled by the user 2026-10-24 (#202).*

None open now. *Updated 2026-10-24: all 32 Step 9 open decisions are ruled (#202).*

Step 10 (2026-10-24 on), for the user at the gate:
1. "The Step 10 phase doc's proposals, recorded before Stage 0 so the audit can attack them" (#204) — the
   contract-level parts: 0.3's wire field `pastSnapshotCap` and its SDK form, 0.4's `saveTo` transport and the SDK
   method `evaluateToFile`, 0.12's `DISARMED` keeping `scope: "all"` — as amended by Stage 0.
2. "Stage 0: `saveTo` uses transport (B), with tab-carrying pulls" (#205).
3. "Stage 0: the cap warning reaches SDK actions as a client event" (#206).
4. "Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s" (#207).
5. "Stage 0: `release/step8` from `70aa754` to `a1932a8`, Variant C" (#208) — a third layout beyond 0.6's two.

*Updated 2026-10-22: before W1 this read "None" — the seven Step 6 decisions listed here (#13, #14,
#15, #21, #22, #24, #27) were ratified by the user, see "The user rules on the seven Step 6 open
decisions" below.*

## Log

### 2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential row, the retirement set, bb-login's bound (#209)
**Decided:** the Stage 0 rulings that are mechanical or stricter only, applied to the phase doc as dated amendments
(texts in `docs/plans/2026-10-24-step10-step8-follow-ups-steps/stage0.md` §6): (1) F8 — the Step 9 log scan has 54
sites (15 + 33 + 0 + 6), not 60; S4.5 counts from 54; (2) the stricter checks F6 (S4.3 vs S4b: which code holds at
S4's close), F13 with V6 (S4.1's answer bound `≤ min(300, path.length + 120)`, a random value, the SDK return and
log lines checked too), F14, F15 (the MCP schema baseline captured before S2's first change), F16 (RET-1 runs only
while armed), F17, F20; (3) F3 with V1/V2 — **0.8's premise was wrong**: `onActivated` already ends the 1000 ms wait
as written and that listener predates the ~1.5 s measurements, so SW-1 becomes a differential row (background-tab
capture minus front-tab capture, three trials; d ≥ 950 ms 3/3 → S7b names the mechanism, and a top-level listener
escalates; d ≤ 300 ms 3/3 → closed, no change; else undetermined, no change); (4) F9 with V4 — the retirement is
`assemble-mcp.ts`, `transcript.ts`, `export-file.ts`'s `assemble()` and **7** tests (not 6), `--mcp-plan` kept with
help text naming `saveTo`; (5) F10 with V5 — bb-login's 90 s bound runs from the press to the exit, any page tolerated
while polling, exit 4 at the bound, S5.1 extended with three legs and submits = 1; (6) F19 recorded as a known limit
(focus and input are two calls; another actor's capture can come between).
**Why:** mechanical corrections or checks made stricter before any measurement; each finding carries its command and
output in `stage0-audit.md` §6, and the verifier re-executed F3, F9, F10.
**Instead of:** the phase doc's original wording, two checks that could not fail (S1.5, S3.3) and one that depended on
the test path (S4.1).
**Revisit if:** a real login needs more than 90 s; a live row sees F19's race.
**By:** Claude (Stage 0 report `…-steps/stage0.md` §5–§6)

### 2026-10-25 · Stage 0: `release/step8` from `70aa754` to `a1932a8`, Variant C (#208)
**Decided:** base `70aa754`, close `a1932a8`; Parts 1–5 carry their commits' code per Step 8's S7.md §4 map with
`docs/`, `CLAUDE.md`, `README.md` held at the base; Part 6 brings the close tree; only the final tree is pinned
(equal to `a1932a8`'s). **Why:** per-Part cumulative trees conflict 14 times (all docs) and Part 1 alone does not
typecheck, so 0.6's "if they apply cleanly" branch fails; Variant C keeps six meaningful code commits. **Instead of:**
0.6's fallback, one squashed tree carrying all six messages (the conservative reading; S6 builds that instead if the
user prefers); `59be263` as the close (it carries Step 9's kickoff). **Revisit if:** the user wants every
intermediate tree buildable or prefers the single tree. **By:** Claude (proposed by Stage 0 F7; open for the user —
a third layout beyond 0.6's two; local and undoable)

### 2026-10-25 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s (#207)
**Decided:** `BAD_PARAMS` for a relative path, an existing directory, a missing parent directory (nothing created),
an existing file without `overwrite: true`, and an existing `<path>.part` (opened `"wx"`); bytes are UTF-8 by
`TextEncoder` (a lone surrogate becomes U+FFFD; tests hash the page side the same way); a Node, Map, Set, function,
symbol or `undefined` value is `BAD_PARAMS` before anything is stored; a throw from `JSON.stringify` is `PAGE_ERROR`.
**Why:** `browser_download`'s directory mode, its `mkdir -p` and its `.part` clobbering each write somewhere other
than the given path, which the kickoff forbids for `saveTo` (Stage 0 F11, F12). **Instead of:** copying
`sdk/src/download.ts`'s rules as 0.4 proposed. **Revisit if:** a user needs parent directories created.
**By:** Claude (contract-level, open for the user)

### 2026-10-25 · Stage 0: the cap warning reaches SDK actions as a client event (#206)
**Decided:** `LocateResult` gains `pastSnapshotCap?: true` (so `Tab.locate()` returns it); an action resolved from a
locator past the cap carries the flag on its reply, and the SDK emits `client.on("warning", (w: {tab, method, kind:
"pastSnapshotCap"}) => …)`, never with the locator or the element's text; no action's return type changes; the MCP
adds one warning line. **Why:** every SDK action returns `Promise<void>` (`sdk/src/tab.ts`, `client.ts`), so a field
on an action's result would change a Step 8 signature (Stage 0 F5); an event is additive and undoable. **Instead
of:** a field on an action's result. **Revisit if:** a later step gives actions result objects. **By:** Claude
(contract-level, open for the user)

### 2026-10-25 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls (#205)
**Decided:** 0.4's transport is (B): an extension-side store, filled in slices on the CDP leg so no single message
grows with the value, pulled in 1 MiB slices of UTF-8 bytes by new methods that carry the tab (tab methods in
`daemon/src/methods.ts`, lease-checked, no lock; class `evaluate` in `METHOD_CLASSES`); the store is dropped at disarm,
when JavaScript is turned off, when the tab closes and after a TTL; the extension never receives the path; a pull
after the store is lost (a worker restart) is refused cleanly and `.part` is removed. **Why:** 0.4's own rule — (A)
needs a measurement of ≥ 64 MiB crossing the whole path, and the Chrome leg cannot be measured without Chrome; the
host leg was measured on port 0: one frame crosses daemon → client whole up to 99 MiB, but above 100 MiB (`ws`'s
default `maxPayload`) the extension socket closes with 1009 and every actor's in-flight call fails `NOT_CONNECTED`
(Stage 0 F1, F2, `stage0-transport.txt`, re-run by the verifier); a pull without a tab skips the block list at the
gate and the daemon refuses untargeted unlisted methods anyway (F4, probed). **Instead of:** (A) one `evaluate`
carrying the whole value; tab-less pulls. **Revisit if:** a live measurement shows the Chrome leg carrying ≥ 64 MiB
and (A) is wanted for simplicity. **By:** Claude (contract-level — a new wire method and what the gate covers; open
for the user)

### 2026-10-24 · The Step 10 phase doc's proposals, recorded before Stage 0 so the audit can attack them (#204)
**Decided:** the session agent adopts, as proposals for Stage 0 to attack, every **(proposed)** decision of
`docs/plans/2026-10-24-step10-step8-follow-ups.md` and every proposed detail under its (user) headings, as written
there on 2026-10-24: 0.1 (no re-run — #192 was ratified by #202 — so Run 14 is 0.10's wave alone, on the Step 9
build, before any Step 10 code; Run 15 after the code stages; #193's stop rule for both); 0.2's details (MCP
`focusTab {tab}` then the action on the same handle for `trusted: true` only; a `focusTab` failure is the answer;
schemas unchanged; the cursor never moves on a focus); 0.3's details (definition by the 800th listable element in
walk order; an optional `pastSnapshotCap?: true` on `LocateResult` and on an action's reply; the SDK form chosen at
Stage 0 so no Step 8 signature changes; one MCP warning line); 0.4's details (transport (A) one `evaluate` if Stage
0 or S4 measures a ≥ 64 MiB string crossing whole, else (B) an extension store + 1 MiB chunked pull with each new
method in `METHOD_CLASSES` as class `evaluate` and in `daemon/src/methods.ts`, the store dropped at disarm;
`browser_download`'s file rules; an answer of path, bytes, kind and sha256 only; `Tab.evaluateToFile` and no ninth
export; nothing logs the value or the path); 0.5's fixture leg, the pp1 leg at G10-3 only, and retirement only
after the fixture leg passes; 0.6's local `release/step8` branch with the final tree equal to Step 8's close and the
six Part messages, tag and push at G10-1; 0.7's row RET-1 at G10-2 only; 0.8 (measure SW-1 with a pre-written
outcome table, a fix stage S7b only if the wait runs to its bound); 0.9's details (poll ≤ 90 s, exit 4 otherwise,
proven on a 12 s delayed-redirect fixture old vs new); 0.10's five R14 rows in a new §4.21; 0.11 (no change to the
safety boundary); 0.12's detail (`DISARMED` keeps `data.scope: "all"`; `"evaluate"` is no longer produced; the
changed expected texts listed per file as ordered by #202).
**Why:** the kickoff (§4) asks that the proposals be on record before the audit, so a wrong premise is a finding
against a recorded decision and gets a dated note rather than a silent change.
**Instead of:** letting Stage 0 audit an unrecorded plan.
**Revisit if:** Stage 0 finds a wrong premise (then this entry gets a dated note, and the contract-level parts —
0.3's wire field and SDK form, 0.4's transport and SDK method, 0.12's scope — stay under Open decisions for the user).
**By:** Claude
*Amended 2026-10-25: Stage 0 found two wrong premises — 0.8's (`onActivated` already ends the wait; SW-1 is now a
differential row, #209) and 0.4's file rules copied from `browser_download` (they write beside the given path; stricter
rules, #207); 0.4's transport is (B) by its own rule (#205), the SDK form of 0.3 is a client event (#206), and 0.6's
layout is Variant C (#208).*

### 2026-10-24 · Step 10 agents run Opus 5.5 (#203)
**Decided:** every agent at every level of Step 10 runs Claude Opus 5.5 (`claude-opus-5-5`); only the headless E2E
actor sessions (`claude -p`) of S1 and S7 may run Sonnet.
**Why:** the user's standing choice, decisions.md · 2026-10-23 · The user rules on R9-SCREEN-2 and the last five
Step 7 open decisions (#69): "I like higher quality product"; the Step 10 kickoff repeats it.
**Instead of:** a cheaper model for builders or verifiers.
**By:** user

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

### 2026-10-24 · The Step 10 kickoff carries Run 13's live follow-ups as its first wave (#201)
**Decided:** the Step 10 kickoff lists #194's four re-measurements (SAFE-5c's redirect half with a threaded
redirect server, SAFE-POP-1 with the opener claimed first, SAFE-3 with the options window visible, SAFE-4 (b)
polling the banner ≥ 10 s) and #196's SAFE-REL-3 URL-class print as a required first live wave, run under
#193's stop rule (a runner returns on every stop). It comes after the user's ruling on #192.
**Why:** no Step 10 phase doc exists yet to carry them (propagator, "Needs a decision" 2); one wave is cheaper
than a separate pre-Step-10 wave and keeps the post-redirect download check from staying unmeasured.
**Instead of:** a separate short wave before Step 10.
**Revisit if:** the user asks for a re-run of Run 13's affected rows under #192; then that wave comes first and
can carry these rows.
**By:** Claude

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

### 2026-10-24 · Bulk data through `browser_evaluate` was a test device only; the MCP gets a `saveTo` path (#127)
**Decided:** rules Step 8 open items 24 and 25. #102 (SDK-7's MCP-leg cap raised to 600 000 characters)
and #103 (S6.3 on one held export) stay as the record of what was measured — both registered before the
legs they govern, and Run 12's earlier results stay recorded. Paging bulk data through
`browser_evaluate` in chunks (SDK-7's MCP leg: 53 calls of 8 000 characters, ≈ 418 000 characters
through a test actor's context) is a **test device only**, never a supported pattern: `docs/setup.md`
says so now, and the tool description says so in the next phase. **Work item (next phase):** the MCP
gains a way to move bulk data without the model's context — e.g. `browser_evaluate {saveTo: <path>}`
writing the value to a file and returning only path, size and sha256, as `browser_download` does; S6.3 is
then redone through it and the 53-chunk recipe (`assemble-mcp.ts`, `transcript.ts`) is retired.
**Why:** the user (2026-10-24), on item 24: "I am confused why MCP even would need to ge so many characters
in response. This should be used carefully or it will blow up agent's context. Let's dicuss before
rarifying. Please explain what is going on here"; on item 25: "I feel that this also needs discussion as
it is connected to the previous item"; after the explanation, chose "Record + test-only + saveTo". The
chunked leg proved the transport whole (53/53 chunks, hash = page's) but every slice entered a model's
context and a transcript on disk (the reason #105 deleted four actor transcripts).
**Instead of:** a plain ratification (leaves the pattern looking supported); no new tool (bulk data
SDK-only); withdrawing the MCP leg as a wrong check design.
**Revisit if:** `saveTo` lands — then S6.3's record moves to it.
**By:** user

### 2026-10-24 · SM-1's and LOC-1's re-registered text is ratified; a live row exercises N ≥ 1 retires (#126)
**Decided:** rules Step 8 open item 23 (#99 item 5): SM-1's and LOC-1's text, re-registered before their
Part 3 re-run, stands; their Part 2 FAILs stay recorded and their Part 3 PASSes count for the gate.
**Work item (next phase):** a new pre-registered live row that ends Chrome without an orderly quit (a
kill, tabs restored by session restore), so the session-change path retires N ≥ 1 held handles live —
Run 12 saw only `0 handles retired`, because `chrome://quit` closes every tab first.
**Why:** the user (2026-10-24) chose "Ratify + live N>0 row". The safety property was measured (SM-1
Part 3: `T268` gone by `tabGone` +1539 ms, snapshot → `TAB_GONE`, no earlier handle resolved); the N ≥ 1
branch is unit-tested only (S2b.5).
**Instead of:** leaving both rows FAIL; ratifying with no live N ≥ 1 row.
**By:** user

### 2026-10-24 · S7.3 is met by the commit map; a squashed `step8` release tag carries the Part messages (#125)
**Decided:** rules Step 8 open item 22 (#104 item 3): S7.3 is met by `…-steps/S7.md` §4's map. **Work item
(next phase):** a squashed release branch or tag `step8` whose commits carry the phase doc's listed Part
messages; `main` is not rewritten.
**Why:** the user (2026-10-24) chose "Ratify + release tag". The repo is public; rewriting `main` is on the
integrity floor.
**Instead of:** amending or squashing `main`; recording S7.3 as not met.
**By:** user

### 2026-10-24 · An MCP failure report with a screenshot stays a non-error result, re-probed on each Claude Code upgrade (#124)
**Decided:** rules Step 8 open items 20 (S6b's error-result change) and 21: #100 stands as built — a
report carrying a screenshot is returned `[text, image]` without `isError`, code on line 1 and an
explicit `The call failed (<CODE>) …` last line; without a screenshot it stays `isError`. After a Claude
Code upgrade, `…-steps/S6b-probe-rows.md` is re-run and the flag restored if images pass.
**Why:** the user (2026-10-24) chose "Ratify + re-probe on upgrade". S6b probe: every `isError` variant
delivered 0 images on Claude Code 2.1.309; REP-1 PASS after the change (Run 12 Part 3).
**Instead of:** restoring `isError` and losing the image.
**By:** user

### 2026-10-24 · `evaluate {asRef}` on a non-element stays an error (#123)
**Decided:** rules Step 8 open item 20 (#99 item 6): `asRef` on a value that is not an Element keeps
failing `BAD_PARAMS "asRef needs an Element; the value is not one"` (`extension/src/handlers/evaluate.ts`);
ASREF-1's optional clause keeps its *Superseded* note; Run 12's FAIL stays recorded.
**Why:** the user (2026-10-24) chose "Keep the error". A caller that asks for a ref wants one; the SDK's
`evaluateRef` throws the same way (#90 item 4).
**Instead of:** returning the value plus `(no ref: the result is not an element)` without an error.
**By:** user

### 2026-10-24 · S5's MCP details are ratified (#122)
**Decided:** rules Step 8 open item 19: #95 items 1, 3, 4, 5 stand — `browser_new_tab` comes to the front
only when the cursor's tab is the human's current tab; `browser_press_key` stays untargeted;
`browser_wait_for` takes `locator` and `state`, not `timeoutMs`; attach-set failures render as report +
`Full message:` + PNG.
**Why:** the user (2026-10-24) chose "Ratify". CUR-1…3 and TAB-3 PASS (Run 12); no model lost a background
tab.
**Instead of:** a session's first tab, or every new tab, in front.
**By:** user

### 2026-10-24 · S2b's details are ratified (#121)
**Decided:** rules Step 8 open item 18: #94 stands — S2b.2's daemon grep reads the one `REMOVED_METHODS`
line plus a behavioural test; none→A retires; odd `onInstalled` reasons give a fresh marker; a reload
waits out the 2 s bound; any `id` on `closeTab`/`focusTab` is refused.
**Why:** the user (2026-10-24) chose "Ratify". SM-0/SM-1 measured; #94's revisit triggers not met.
**Instead of:** recording S2b.2's grep as not met as first written.
**By:** user

### 2026-10-24 · Failure reports stay on by default (#120)
**Decided:** rules Step 8 open item 17: #93 stands — candidate/match refs rewritten to the report
snapshot's (unique role + name) or deleted; `failureReports` default on, with `env` and the test seams;
the `@bridge/sdk/report` subpath. The ~1.5 s screen switch stays a carried input.
**Why:** the user (2026-10-24) chose "Ratify, default on". REP-0/REP-1 PASS; private-page scripts already
pass `failureReports: false`.
**Instead of:** reports off by default; a screenshot only when the failed tab is already in front.
**By:** user

### 2026-10-24 · The Step 6 surface names stay, marked experimental (#119)
**Decided:** rules Step 8 open item 16 (#91: #24, #27/#28): `BridgeClient.welcome`,
`extensionConnected`, `on("reconnected")`, `connect({requireExtension})` and the MCP's
`connectOptions()` keep their names and are marked **experimental** in `docs/setup.md` (done in this
wave) until a later release settles them.
**Why:** the user (2026-10-24) chose "Ratify, mark experimental".
**Instead of:** declaring them the final surface now.
**Revisit if:** a release fixes the public SDK surface.
**By:** user

### 2026-10-24 · The SDK `Tab` surface and the cursor rule are ratified (#118)
**Decided:** rules Step 8 open item 15: #90 items 1, 2, 7 stand — `client.close()` closes the client
(every `Tab` method mirrored but `close`); `tabs()` returns `{handle, title, url, owner?, current}`; the
cursor changes only on `newTab`/`claim` and a 4002 reconnect.
**Why:** the user (2026-10-24) chose "Ratify". Phase doc 0.4 literally; `sdk/src/client.ts` sets the
cursor in one place and clears it only in the 4002 branch.
**Instead of:** clearing the cursor on `release`/`close`/`tabGone`.
**By:** user

### 2026-10-24 · S1's locator details are ratified; a locator past the snapshot's cap warns (#117)
**Decided:** rules Step 8 open item 14 (#87 items 2–4): the name rule (the shown name, 120-character cap,
substring / case-sensitive `exact`), `locate` past the 800-element cap, `{css}` only past the pruning
gates stand. **Work item (next phase):** a warning when a page has more than 800 elements — the
snapshot already ends with `- ... truncated at 800 elements …` (`sdk/src/format/snapshot.ts`); add one
where none exists, when a locator resolves to an element past the snapshot's cap (one the snapshot never
showed), surfaced by the SDK and the MCP.
**Why:** the user (2026-10-24): "Ratify.  But add a warning if there is more than 800 elements".
**Instead of:** an uncapped `exact`; an 800-element search cap.
**By:** user

### 2026-10-24 · The reworded pre-registered checks are ratified (#116)
**Decided:** rules Step 8 open item 13: #84 stands (S2b.3 with listed, mutation-checked edits; S2b.6
scoped; S6.1's first lines; every grep = empty stdout and exit 1).
**Why:** the user (2026-10-24) chose "Ratify". Reworded before measurement (S2b.md test-count section).
**Instead of:** recording S2b.3 as not met as first written.
**By:** user

### 2026-10-24 · The locator rules, the MCP locator object and the shared `BridgeError` are ratified (#115)
**Decided:** rules Step 8 open item 12: #83 stands.
**Why:** the user (2026-10-24) chose "Ratify". SDK-4 PASS; `instanceof BridgeError` unchanged.
**Instead of:** flat role/name fields on the MCP tools.
**By:** user

### 2026-10-24 · `__bridgeData` beside the marker is ratified (#114)
**Decided:** rules Step 8 open item 11: #82 stands.
**Why:** the user (2026-10-24) chose "Ratify". Additive; carries locator candidates and matches.
**Instead of:** dropping structured data from page failures.
**By:** user

### 2026-10-24 · The Chrome `id`, untargeted network calls and the unlisted-method refusal are ratified (#113)
**Decided:** rules Step 8 open item 10: #81 stands.
**Why:** the user (2026-10-24) chose "Ratify". `daemon/src/intercept.ts` `resolveTarget`.
**Instead of:** removing the `id` next phase; refusing untargeted network calls.
**By:** user

### 2026-10-24 · Handle numbers never reused across daemons is ratified (#112)
**Decided:** rules Step 8 open item 8: #79 stands.
**Why:** the user (2026-10-24) chose "Ratify". Closes Stage 0's CRITICAL F2 for every route.
**Instead of:** smaller fallback numbers.
**By:** user

### 2026-10-24 · `NO_CURSOR` as the 23rd code is ratified (#111)
**Decided:** rules Step 8 open item 6: #76 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**Instead of:** an SDK-local code.
**By:** user

### 2026-10-24 · The formatters on the SDK's main entry are ratified (#110)
**Decided:** rules Step 8 open item 5: #75 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**Instead of:** the subpath only.
**By:** user

### 2026-10-24 · The session marker is ratified (#109)
**Decided:** rules Step 8 open items 4 and 9: #74 as amended by #80 stands.
**Why:** the user (2026-10-24) chose "Ratify". SM-0 (reload kept handles) and SM-1 (restart retired them).
**Instead of:** measuring `onStartup` timing to shorten the 2 s wait.
**By:** user

### 2026-10-24 · `code` required on error frames is ratified (#108)
**Decided:** rules Step 8 open item 3: #73 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**Instead of:** refusing code-less frames.
**By:** user

### 2026-10-24 · The S2b stage split is ratified (#107)
**Decided:** rules Step 8 open item 2: #72 stands.
**Why:** the user (2026-10-24) chose "Ratify".
**By:** user

### 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools focus first too (#106)
**Decided:** rules Step 8 open items 1 and 7: #71 as amended by #78 and its outcome (B) `focusFirst`
(#89) stand. **Work item (next phase):** the MCP's trusted `browser_click`/`browser_type`/
`browser_press_key` also call `focusTab` first (the tab comes to the front and stays) — this replaces
#78 item 4's "the MCP's trusted tools keep today's behaviour" and closes the carried input "the MCP's
trusted tools on a background tab answer `ok` and do nothing".
**Why:** the user (2026-10-24) chose "Ratify + MCP focuses too". Run 11: no input kind passed under focus
emulation; trusted input lands only on a focused tab.
**Instead of:** leaving the MCP's trusted tools unfocused.
**By:** user

### 2026-10-24 · The user grants the skill edit, the data deletion and the push at Step 8's close (#105)
**Decided:** (1) G8-3 is granted: this session and the next may edit the `blackboard-ultra` skill
(`~/.claude/skills/blackboard-ultra`, its own repo) — the change proposed in
`…-steps/S7.md` §7. (2) The student-data files left outside the repo were deleted on 2026-10-24: the
five `exports/pp1-2026-10-23*.json` files, `%TEMP%\bridge-e2e\s6-run3*` (five folders) and the four
actor transcripts S6.md names (`4f4e8134-…` with its folder, `5c3fc37b-…`, `63530c86-…`,
`b7835b60-…`); a check found none left. (3) Push is allowed. (4) No other Claude session is running,
so no `/mcp` reconnect is owed. (5) The 25 Step 8 open decisions are reviewed in the next session (wave
W2 in `docs/plans/handoffs.md`), one by one: why it is needed, the options, the recommendation and why.
**Why:** the user (2026-10-24): "You and the next session have my permission to edit blackboard ultra
skill. No other claude session is running. Data mentioned in 4 may be deleted. Push is allowed"; and
"I will need help making these 25 decisions with why we need this decision, what are the options we
have, what is the recommended option, and why."
**By:** user

### 2026-10-24 · S7's doc rulings: the setup snippet, grouped wave gotchas, S7.3 by the commit map (#104)
**Decided:** accepted as proposed in `…-steps/S7.md` §5: (1) `docs/setup.md`'s "Writing a script" shows a
21-line typechecked snippet following `recipes/sdk-login.ts` (a failing control proves the typecheck
discriminates) and names `sdk-login.ts` as the full recipe; (2) S6's gotcha candidates enter `CLAUDE.md`
as sourced bullets, the PowerShell / `npx` / restart / live-site ones grouped into three; (3) S7.3 ("the
commit messages listed") is met by S7.md §4's map from each listed Part message to the stage commits
that delivered it — the phase doc itself says "S7's list is the record", and each stage committed at
its close under the long-run invariant.
**Why:** matching the listed wording now would mean rewriting history, which is on the integrity floor;
neither recipe can be quoted verbatim as a clean example.
**Instead of:** amending or squashing commits; reporting S7.3 as failed; quoting a recipe verbatim.
**Revisit if:** the user wants the Part messages as real commits (e.g. a squashed release branch).
**By:** Claude ((3) a pre-registered check — listed under Open decisions)

### 2026-10-23 · S6.3 compares one in-page export read through both paths (#103)
**Decided:** S6.3 is re-registered before a re-run: the page builds the export once and holds it in
page memory; the SDK leg and the MCP leg then each read that same held export (SDK: one read; MCP: the
53-chunk transport of #102), and the two files are compared by hash. Read-only as before; the held copy
is dropped from the page after both reads. Run 12's S6.3 FAIL (two separate exports minutes apart, 3 of
77 column entries differing) stays recorded.
**Why:** S6 addendum 2 (7c16a00, bff51ec): both transports were whole (MCP file hash = its own in-page
hash, rebuilt byte-identical by the verifier), but two separate in-page exports differed, and two SDK
reads 20 minutes apart differed too — the live gradebook changed (inference, recorded as one). The
phase doc's S6 text asks for "the same data pulled through the MCP `browser_evaluate` path"; one held
export is that same data, so the check tests what it was written for.
**Instead of:** re-reading the failed compare as a pass; a frozen or smaller course.
**By:** Claude

### 2026-10-23 · SDK-7's MCP leg is re-registered with a cap that fits pp1's export (#102)
**Decided:** before SDK-7's MCP leg runs again, its transport cap (240 000 characters, registered in
23b878f by S6's predecessor proposal 4) is raised to 600 000 characters with the same 8 000-character
chunks (pp1's export is 418 406 characters, ≈ 53 chunks); every other clause of SDK-7 and S6.3 (two
files, compared by hash, hash recorded, files not committed, `exports/` outside commits) is unchanged.
The new cap is committed before the leg's first line; the earlier "not measured" result stays recorded.
`bb-login.ps1`'s condition-based post-submit wait (poll until back on the Blackboard host, no sign-in
control and a stable address, ≤ ~90 s) is accepted as a later item, not built in this step.
**Why:** S6 Part 3 addendum: SDK-6 PASS and SDK-7's SDK leg PASS (77 columns, 790 records, 418 459 bytes,
page hash = file hash) on pp1, but the MCP leg hit the 240 000 cap, a transport limit of the recipe,
not a rule of the plan (phase doc S6: "byte-compare with the same data pulled through the MCP
`browser_evaluate` path"). Raising it before the run keeps the comparison whole.
**Instead of:** comparing an in-page hash only (not two files); a smaller course; a subset of the
export (weaker check).
**By:** Claude

### 2026-10-23 · SDK-6/SDK-7 run in the session the login actually opened (#101)
**Decided:** the Blackboard login of S6 Part 3 succeeded; the page only took long to load, so
`bb-login.ps1`'s post-submit check ran too early and exited 4. The user has opened the pp1 course in
that window. SDK-6/SDK-7 now run live in that session, confirming the login first by the recipes'
read-only course lookup; the login script's exit-4 result stays recorded as observed, with a dated note
that it was a too-early check. Read-only as registered; #96/#98's rules hold.
**Why:** the user (2026-10-23): "you are on the blackboard, just it look long time to load. I checked,
you had it open. I just entered pp1 course for you".
**Instead of:** another login attempt; leaving SDK-6/SDK-7 out of the gate.
**Revisit if:** the login script is reused — its post-submit wait needs a longer, condition-based bound
(proposed for a later step).
**By:** user

### 2026-10-23 · An MCP failure report with a screenshot is returned as a non-error result (#100)
**Decided:** accepted as proposed in `…-steps/S6b.md` §5: an attach-eligible failure whose report carries
the screenshot is returned with no `isError` flag, content `[text, image]`; the text's first line is
`<CODE>: …` as before, then `Full message:`, then `The call failed (<CODE>). This result is not flagged
as an error only so that the screenshot reaches you (some MCP clients, Claude Code 2.1.309 among them,
drop images from error results).` A report without a screenshot stays `isError: true`, one text item.
REP-1 is re-registered before its re-run (the code line and the failure line mark the error; ≥ 1 image
part in that call's own `tool_result`).
**Why:** the S6b probe (pre-registered, `…-steps/S6b-probe-record.md`): on Claude Code 2.1.309 every
`isError` variant delivered 0 images (text+image, image+text, image alone, embedded resource), both
non-error variants delivered theirs, and the model still read the error in V2. S5.3 requires the model
to see what the script saw. The flag is dropped only when an image is present; undoable in one function.
**Instead of:** keeping `isError` and losing the image; a second tool call to fetch it; a
`resource_link`.
**Revisit if:** a Claude Code upgrade passes images in `isError` results — re-run the probe and restore
the flag.
**By:** Claude (contract-level, how MCP tool errors are returned — listed under Open decisions)

### 2026-10-23 · S6's findings ruled: the user's answers, stage S6b for REP-1, re-registered rows (#99)
**Decided:** (1) **By the user:** the Blackboard login goes through ADA's SSO (ada.blackboard.com
redirects there; the user's autofilled credentials sign in and it redirects back) — `bb-login.ps1` is
extended to that flow, credentials still never read, typed by the driver, printed or recorded; an
exit-2 `reload-extension.ps1` (nothing pressed) may be re-run during waves without asking (standing);
REP-1 is fixed in this step. (2) A stage **S6b** (lane `mcp/src/`, `mcp/test/`) pins the failure
report's tool result in a unit test and finds by a live probe whether an `isError: true` result's image
block reaches a `claude -p` model; if it does not, it makes the image reach the model (any change to
how tool errors are returned is listed for the user); REP-1 is re-run after. (3) S6's 14 proposals in
`…-steps/S6.md` §5 (predecessor's 11, REP-0's 3) and the mechanical sheet fixes are accepted; the blue
control (REP-0) stands. (4) The live part continuing after SM-0's exit 2 is accepted as a disclosed
deviation: nothing was pressed, the log shows no extension change until the restart, and the later rows
ran on the build the stale check proved. (5) SM-1 and LOC-1 get new pre-registered text before a re-run:
SM-1 — "the held handle is gone after the restart (by `tabGone` at the quit or by the session change), a
call on it gives `TAB_GONE`, and no handle minted before the quit resolves after it"; LOC-1 — the typed
value is read by a tool output. Their Run 12 FAILs stay recorded. (6) ASREF-1: the conservative default —
the observed behaviour (`asRef needs an Element; the value is not one`) stays, no code change; §4.18 gets
a dated *Superseded* note on the optional clause; Run 12's FAIL stays recorded. (7) S6 Part 3 then runs,
alone: SM-0 (reload re-run as needed), SM-1 and LOC-1 under the new text, REP-1 after S6b, SDK-6/SDK-7
live through SSO.
**Why:** the user (2026-10-23): "ada.blackboard.com ridirects to ada sso, you can login there using my
credentials and then it redicrect back blackboard"; reload: "Yes, re-run as needed"; REP-1: "Fix now".
SM-1's and LOC-1's rules could not hold for their own set-ups (S6 Part 2, measured); a check is
re-registered, never re-read to pass.
**Instead of:** carrying REP-1 to Step 9; re-reading SM-1's clause to pass; changing the MCP's
`asRef` output to match the row.
**By:** user ((1)); Claude ((2)–(7); (6) and S6b's error-result change, if any, listed under Open
decisions)

### 2026-10-23 · The user allows unlimited Chrome restarts and unpublished Blackboard writes (#98)
**Decided:** the run may restart Chrome as often as it needs (still only by `chrome://quit`, session
restore, counts checked). A write on Blackboard is no longer a STOP, provided the content is not
published to students — or, if it becomes visible briefly, it is hidden shortly after. The recipes stay
read-only as built (0.7's first jobs); the grant only lifts the STOP for a write a row needs or makes by
accident, and any write is recorded (what, when, hidden when) without course content or student data.
**Why:** the user (2026-10-23): "you may restart Chrome as many time as you need +you can attempt
writing on the blackboard as long as it is not published it students. If it published briefly, it is
fine, just needs to be hidden shortly after". Amends #96 and the phase doc's 0.7 STOP rule.
**Instead of:** one restart for SM-1 only; any Blackboard write as a STOP.
**By:** user

### 2026-10-23 · A probe of the failure-report screenshot runs before any row that could attach a non-fixture tab (#97)
**Decided:** before REP-1, SDK-7's MCP leg or any other row whose failure report could capture a page
other than a fixture, the resumed S6 wave runs a pre-registered probe row (REP-0): a deliberate
attach-set failure on a background fixture tab while page-side `visibilitychange` timestamps are logged
on that fixture tab and on the "human" fixture tab, and the report PNG's hue is checked against the
fixture's bar (Run 9's method, with a positive control). PASS = the failed tab went `visible` during the
capture and the PNG shows its bar. FAIL = the capture did not switch, or showed another tab → the rows
that could attach a non-fixture page are not run, and the failure becomes a proposed decision (a code
fix in a later stage, never in the wave). The probe's expected text is committed before it runs. The
sheet's PowerShell helper `R` is renamed first (it collides with the `Invoke-History` alias).
**Why:** S6 live verifier MINOR-1: SDK-2/SDK-3's report screenshots returned 190–220 ms after the tab
opened, where a background capture takes ~1.5 s (R9-SCREEN-1), so the report may not switch tabs and
could capture the human's visible tab — a privacy risk on a real site. The PNGs were deleted unopened.
**Instead of:** running REP-1 and the Blackboard MCP leg unprobed.
**By:** Claude

### 2026-10-23 · The user grants the pp1 course for SDK-6/SDK-7 and one Chrome restart for SM-1 (#96)
**Decided:** SDK-6 and SDK-7 run on the user's Blackboard course "pp1"; the login uses Chrome's autofilled
credentials, which are never read, typed, printed, logged or recorded. SM-1 may restart Chrome once
(`chrome://quit`, session restore). 0.7's read-only rule and the public-repo evidence rule (no Blackboard
content, student data, course URLs or titles in the repo) still bind.
**Why:** the user (2026-10-23): "for sdk 6 and 7, use pp1 course. It will require login, my credentials
should be autofilled, feel free to use them you have my explicit permission. For sm 1 you absolutely can
restart chrome, you have my explicit permission for that as well".
**Instead of:** recording SDK-6/SDK-7 as "waits for the user" and SM-1 as "not run".
**By:** user

### 2026-10-23 · S5's MCP details: `browser_new_tab` activation, the status lines, the tool schemas, reports (#95)
**Decided:** accepted as proposed in `…-steps/S5.md` §5: (1) `browser_new_tab` sends `active: true` only
when the cursor is set and `listTabs` shows its tab as `current`; with no cursor (a session's first
tab, F26), a lost cursor or a failed `listTabs` it opens in the background and says so (` (in the
background — browser_focus_tab shows it)`); it always moves the cursor and never sends `focusTab`.
(2) `browser_status` keeps the Step 7 lines byte-identical (`Active tab:` included) and adds `Cursor:`,
plus `Human's active tab:` only when it differs; it never claims. (3) `browser_press_key` stays
untargeted (like `Tab.pressKey`, #92). (4) `browser_wait_for` takes `locator` and `state`, not
`timeoutMs`. (5) The MCP renders attach-set failures on a `T<n>` handle as `report()`, a `Full
message:` block and a PNG image block, through `@bridge/sdk/report` (#93); its attach set includes a
`browser_evaluate` `PAGE_ERROR`, whose report snapshot renumbers refs and whose screenshot may flash a
background tab ~1.5 s (accepted by 0.5). (6) Wait calls carry their own bound + slack (F22, #90).
**Why:** (1) phase doc 0.6's activation rule, pre-stated and applied literally (on doubt the human's
view does not change); a designed 4-line edit to `mcp/test/multi-actor.test.ts` followed. The rest
follow #83, #90, #92, #93. Built and verified in aa113df (cross-package test over real `ws`).
**Instead of:** opening a session's first tab in front as Step 7 did (friendlier for "open X in a new
tab", but a change to 0.6).
**Revisit if:** E2E (CUR-3 (c), TAB-3) shows a model losing track of a tab it opened in the background,
or the user wants a session's first tab in front.
**By:** Claude ((1), (3), (4), (5) — what the human sees and MCP tool schemas — listed under Open
decisions)

### 2026-10-23 · S2b's details: the `selectTab` refusal grep, the marker's edge cases, the handle mark (#94)
**Decided:** accepted as proposed in `…-steps/S2b.md` §"Proposed decisions": (1) S2b.2's daemon check
reads: `grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src` prints exactly one line, the
`REMOVED_METHODS` entry in `daemon/src/methods.ts`; `REMOVED_METHODS` is read only in
`TabLayer.request`'s first statement; a test against a fake that would answer `selectTab` gets
`UNKNOWN_METHOD` with nothing forwarded. (2) none→A retires every handle, like A→B and A→none; the
daemon's first extension hello retires nothing. (3) `onInstalled` reasons other than "install"/"update",
or `onStartup` together with `onInstalled`, give a fresh marker. (4) An extension reload with no
`storage.session` marker waits out the one 2 s bound for `onStartup` before reusing `storage.local`'s
marker (a late `onStartup` still rotates and reconnects) — stricter than #80's immediate reuse. (5) A
retire leaves the visibility lock's queue untouched (waiters re-resolve and get `TAB_GONE`). (6) Any
`id` on `closeTab`/`focusTab` is refused, even beside a `tab`; the extension reads `tabId` only.
(7) An untargeted unlisted method meets the refusal order NOT_CONNECTED → VERSION → BAD_PARAMS.
(8) The handle mark is one decimal in `~/.chrome-agent-bridge/handle-mark`, reserved in blocks of 64
(temp file + rename), missing = 0, unreadable or unwritable → milliseconds since 2026-01-01 never below
an issued number, one log line with no path or number; only `index.ts` passes the directory. (9) An
unknown non-empty code passes through verbatim; an empty one leaves the extension as `INTERNAL`.
**Why:** (1) #85 item 4, written after the kickoff's grep, requires the daemon to refuse `selectTab` by
name, so the unscoped grep cannot be empty; the reworded check keeps its intent (no alias, forwarding
or lock class) and adds a behavioural test. (2)–(4), (6) are each stricter (cost leases, never safety);
(4) closes verifier F1, a hello with the old marker on a Chrome start. Built and verified in efb8557.
**Instead of:** disguising the string to pass the grep; dropping the refusal (F10); immediate marker
reuse on reload; a write per handle.
**Revisit if:** SM-0/SM-1 show spurious retires or `onStartup` arriving more than 2 s after
`onInstalled`; the reload recipe's "same second" proof breaks on the up-to-2 s delay.
**By:** Claude ((1) a pre-registered check and (2)–(4), (6) wire/lease behaviour — listed under Open
decisions)

### 2026-10-23 · S4's failure-report details, and how the MCP reaches them (#93)
**Decided:** (1) Accepted as proposed in `…-steps/S4.md` §5: a report's own snapshot renumbers the tab's
refs, so when a report is attached each candidate/match ref in `error.data` is rewritten to the attached
snapshot's ref (non-empty role + name, unique hit only) or else deleted; `BridgeClientOptions` gains
`failureReports` (default on), `env` and two test seams; a failing screenshot, `focusTab` or download is
enriched literally per 0.5 (F25); the report details of §5's fourth entry. (2) The MCP reaches the
report machinery through an additive subpath `@bridge/sdk/report` exporting `attachContext` (S5 adds it
to `sdk/package.json` `exports`, like `./format`); the main entry keeps exactly its 8 values (S3.4).
**Why:** S4 verifier measured the ref reset with the real content-script code in jsdom (stale candidate
refs pointed at other elements); S5.3 requires the MCP to render `report()` plus an image block, but the
MCP calls through `BridgeLink`, not `Tab`, and `attachContext` was not exported. A subpath is additive
and undoable, and keeps the pinned main surface.
**Instead of:** a snapshot that does not reset refs (extension-side, a contract change); exporting
`attachContext` from the main entry (changes S3.4's pinned surface); rebuilding the MCP's tools on
`Tab` objects.
**Revisit if:** the extension gains a ref-preserving snapshot.
**By:** Claude (the ref rewrite, the client options and the `./report` subpath touch the SDK's surface —
listed under Open decisions)

### 2026-10-23 · S2's handler details: the mark rides the serialiser, `pressKey` takes a target, `waitFor {locator}` rules (#92)
**Decided:** accepted as proposed in `…-steps/S2.md` §5: (1) `asRef` marks through the serialiser's own
`Runtime.callFunctionOn` — `SERIALIZER_SRC` becomes a closure-free composite that, only with a mark,
marks a connected, reachable Element after serialising; a lost reply or failed content call sweeps the
mark; without a mark its output equals today's; `debugger.ts` unchanged. (2) The extension's `pressKey`
accepts an optional `ref`/`locator`, focused with a plain `el.focus()` before today's path; without a
target it is byte-identical; the SDK's `Tab.pressKey(key)` (0.4) and `PressKeyParams` stay untargeted
this step (phase doc 0.2/S2.3 vs 0.4: the extension carries the addition, the SDK surface does not
grow). (3) `waitFor {locator}`: validated before any call; `timeoutMs` default 10 000, clamped
[0, 60 000]; service-worker poll every 100 ms without overlap; visible resolves on found and rejects at
once on `AMBIGUOUS`; hidden resolves on `LOCATOR_NOT_FOUND` only; `REF_STALE` and frame-teardown
`INTERNAL` re-inject and poll; timeout → `TIMEOUT` with the last candidates as `data`.
**Why:** F21 (the objectId lives only inside that callback), the CLAUDE.md closure-free rule kept;
pre-registered S2.3 names `pressKey`; S1 measured ~1.4 s per `{text}` miss on 5 000 elements (no
overlap matters). Also accepted: S2 used the phase doc's lane, which includes `extension/src/evaluate/`,
where the step brief had omitted it.
**Instead of:** a third CDP hook in `debugger.ts`; leaving `pressKey` untargeted (S2.3 would fail);
growing `Tab.pressKey` now; a page-side poll.
**Revisit if:** S6 sees a residual `data-__bridge-mark`; a navigation error string not covered; 0.4
gains a `pressKey` target.
**By:** Claude

### 2026-10-23 · S3.5's outcome and the Step 6 revisit items (#91)
**Decided:** (1) S3.5 read pre-written outcome (1) of #85: `spawnDaemon` inherits no pipe (node parent,
`sdk/test/spawn-inherit.test.ts`, EOF 3–6 ms before the child's exit with the stand-in alive in 6 runs;
the `stdio:"inherit"` control held the pipe every run; npx parent one ad-hoc trial); `spawn.ts` is
unchanged; S7 adds a dated note to the MUX-6 gotcha: the MUX-6 cause remains unmeasured. (2) The Step 6
decisions naming Step 8 as their revisit point are each kept as they are: #21 (`NOT_CONNECTED`), #24
(`welcome`, `extensionConnected`, `on("reconnected")` — the final `BridgeClient` surface), #22 (a 4002
reconnect never hands over), #15/#26 (no reconnect on other close codes), #27/#28
(`requireExtension`, `connectOptions()`), #29 (no stop command), #13 (`VERSION` after 2 s; revisit once
every machine runs Step 8).
**Why:** S3 report §5: Step 8's surface adds none of the things those triggers name; keeping them
changes no tool, test or doc.
**Instead of:** an auth code, a public failure event, reconnecting on other codes (forbidden), a stop
command.
**By:** Claude (S3.5: pre-stated rule; (2) confirms the SDK's surface — #24 and #27/#28 listed under
Open decisions)

### 2026-10-23 · The SDK `Tab` surface details and the cursor rule as built (#90)
**Decided:** (1) `BridgeClient.close()` keeps closing the client; the client mirrors every `Tab` method
but `close` (the cursor tab closes with `client.tab().close()`). (2) `tabs()` returns `{handle, title,
url, owner?, current}`, `current` from `listTabs` only (#43). (3) `scroll` takes `"up" | "down"` only;
anything else is a local `BAD_PARAMS` (the content script scrolls down for any other value and answers
ok). (4) `evaluate` returns the value; `evaluateRef` throws `BAD_PARAMS` with no ref. (5) `waitFor`'s
call timeout is the wait's own bound + 5 s (locator `(timeoutMs ?? 10000) + 5000`, seconds
`s·1000 + 5000`, text/networkIdle 15 000); `evaluate`'s is the page timeout + 5 s. (6) Local validation
throws the shared `BridgeError(BAD_PARAMS)` with no call. (7) The cursor changes only on
`newTab`/`claim` and a 4002 reconnect (0.4 literally); `release()`, `close()` and `tabGone` leave it,
and the next call gets the daemon's answer (`TAB_GONE`, or the unheld-tab refusal); the cursor and the
generation reset synchronously at the top of the 4002 branch, before pending calls are rejected.
**Why:** S3 report §5; (1) every existing caller uses `client.close()`; (7) the cursor rule is
contract-level and 0.4 names only those three events, so the literal rule is the pre-stated one.
**Instead of:** mirroring `close`; `active` in `tabs()`; silent horizontal scroll; clearing the cursor
on `release`/`close`/`tabGone` (friendlier, but a change to the cursor rule — the user's choice).
**Revisit if:** S6 shows a script acting on an unheld tab after `release()`.
**By:** Claude (items 1, 2 and 7 — SDK surface and cursor rule — listed under Open decisions)

### 2026-10-23 · The background-input policy (#89)
*Updated 2026-10-23: the FE live record is committed (829368e) after the user approved the commit the classifier had denied.*
**Decided:** outcome **(B)**, policy `"focusFirst"`: `Tab.click/type/pressKey({trusted:true})` call
`focus()` first, and the docs say the tab comes to the front and stays there. The MCP's trusted tools
keep today's behaviour (#78 item 4). Read off #78's precedence: FE-5 not void (control 0/12 trials got
input); FE-4 PASS 9/9; no input kind passed all its trials — FE-1 (click) 0/3 (`status: idle`), FE-2
(type) 2/3 (trial 3 got `TRUSTED input = ped`, the first five characters lost), FE-3 (pressKey) 0/3 →
"no kind passes" → (B). FE-0 PASS (`{"ok":true,"focusEmulation":"on"}`), FE-PC PASS, reload exit 0.
Target page `visible` 3–7 ms into each call, `hidden` again 14–39 ms in; emulation never seen still on
after a call (#88's revisit trigger not met). Record: `…-steps/FE-run-record.md`, Run 11 (FE) in
`docs/e2e-test-plan.md` §5 — *uncommitted at the time of writing: the classifier denied the FE live
commit; it waits for the user.*
**Why:** the pre-written table decides; G8-1 as amended by #62 (4).
**Instead of:** reading FE-2's 2/3 as a pass (forbidden: no best-of-three); re-running any row.
**Revisit if:** a new, separately pre-registered design (e.g. a delay between the enable and the first
`Input.*` command — FE-2's partial delivery suggests a race, untested) passes all trials; that is a
later step's work, never a re-run of these rows.
**By:** Claude (pre-stated rule, applied mechanically)

### 2026-10-23 · FE's build details (#88)
**Decided:** accepted as proposed in `…-steps/FE.md` §5: (1) when the emulation disable fails after a
successful input, the call warns and still succeeds — the detach that follows in the same `withDebugger`
ends the debugger session that owns the emulation; (2) FE-3 focuses `#trusted-input` with an evaluate of
`el.focus()` and presses `ArrowLeft`, with FE-1's other clauses; (3) FE-3c (FE-3 without the option) is
an observation outside the outcome table; (4) FE-4's window and foreground clauses are measured by a
capture loop with its own positive control, and a void capture escalates instead of passing.
**Why:** all written before any measurement (rows committed in 6398f27, before any FE build was loaded);
(1) keeps an input that worked from being reported as failed; (4) makes FE-4 able to fail.
**Instead of:** throwing on a failed disable; FE-3 without a defined focus step.
**Revisit if:** the live run shows emulation still on after a call (then (1) is wrong and becomes a
throw).
**By:** Claude

### 2026-10-23 · S1's locator details (#87)
**Decided:** accepted as proposed in `…-steps/S1.md` §5: (1) one walk (`a11y.ts` `walkElements`) serves
`buildSnapshot` and every `locate` variant; (2) `{role, name}` matches the snapshot's name as shown
(capped at 120 chars with `…`), substring case-insensitive, `exact` = case-sensitive equality after
whitespace normalisation, role by exact equality; `{regex}` on the same string, non-stateful, invalid →
`BAD_PARAMS`; (3) `locate` walks past the snapshot's 800-element output cap, `nth` in walk order;
`{css}` matches any element that survives the pruning and zero-size gates, invalid → `BAD_PARAMS`;
(4) `{text}` reads visible light-DOM text, innermost match wins, blocks join with no separator;
(5) failure data: `LOCATOR_NOT_FOUND {candidates ≤ 5 by nearest()}`, `LOCATOR_AMBIGUOUS {matches ≤ 20}`,
refs minted through the RefMap; (6) `refOfMarked`: `data-__bridge-mark`, compared by `getAttribute`,
removed from every carrier on every path, none → `REF_STALE`, several → `INTERNAL`; (7) `__bridgeData` is
a JSON copy of `data`.
**Why:** each keeps 0.1's invariant literally (one name computation, one walk, what the snapshot shows is
what matches); a truncated snapshot must not make a locator miss; hidden elements must not match, or
`waitFor {state:"hidden"}` could never resolve. Built and verified in S1 (e9e5e8c; pre-S1 capture over
46 fixtures byte-identical).
**Instead of:** an uncapped second name computation; case-insensitive `exact`; an 800-element search cap;
`{css}` over hidden elements; `textContent`.
**Revisit if:** a real page needs `exact` on a name over 120 characters, or block joins hide a needle (S6).
**By:** Claude (items 2–4 refine locator rules #83 left open — listed under Open decisions)

### 2026-10-23 · S0's rulings: bounded bundle diff, `WaitForParams`, 0-based `nth`, #79's S2b check (#86)
**Decided:** (1) The kickoff's S0 verifier focus "daemon and extension bundles byte-identical after S0"
becomes: `extension/dist/{content,offscreen,options}.js` byte-identical; `daemon/dist/index.js` and
`extension/dist/sw.js` may differ only by the `NO_CURSOR` entry in `ErrorCodes` and the hello guard's
`session` check, shown by a `diff` of the two builds (measured by S0: daemon `490f1c60…` → `7712e1af…`,
sw `503cd209…` → `b614aa9e…`, nothing else). (2) `WaitForParams` = `{text: string}` |
`{locator, state?, timeoutMs?}` | `{networkIdle: true, idleMs?}` | `{seconds}`, as built (F28).
(3) A locator's `nth` is 0-based. (4) #79's daemon half gets an S2b checkbox and exit check S2b.9: a
second `HandleTable` started against the first's high-water mark never re-mints a number the first
minted (stale `T<n>` → `TAB_UNKNOWN`), and with the mark file unreadable it falls back to a start-time
base; tested with an injected directory, never `~/.chrome-agent-bridge/` itself. (5) S6.2 names the
SDK-1 recipe file the S6 wave sheet fixes before the run. (6) S4 builds the failure report per #83
(optional properties on the shared `BridgeError`); its "subclass" wording is superseded.
**Why:** S0 report: `ErrorCodes` and `isHello` are runtime values bundled into the daemon and the
worker, so "types only" was a wrong premise of the check, not a fault in the build; the bounded diff
keeps the check's intent (no behaviour slipped in). 0-based `nth` matches Playwright and arrays. #79 had
no check of its own.
**Instead of:** moving `NO_CURSOR` out of `ErrorCodes` to keep the bytes (contradicts #76); 1-based `nth`.
**By:** Claude

### 2026-10-23 · Stage 0's build-level rulings: SDK-1's recipe, S3.5's control, the stage split (#85)
**Decided:** (1) SDK-1 runs a new recipe file; `recipes/hello.ts` and MUX-3/5/6/8/10's expected text
stay (stage0.md §5). (2) S3.5 gains a positive control — the same test with `stdio:"inherit"` must see
no EOF within 2 s — and spawns without the `tsx` layer; #77's pass outcome now reads "`spawnDaemon`
inherits no pipe (node and npx parents); the MUX-6 cause remains unmeasured", and a third outcome is
added: fails and no Node-level option removes it → recorded with the measured cause (F15). (3) F4: with
`focusEmulation`, the order is attach → enable → focus the field → `Input.*` → disable in a `finally`;
FE-3's row names its focus step and key. (4) F10: S2b's daemon refuses `selectTab` itself
(`UNKNOWN_METHOD`) before resolution, tested against a fake that would answer it. (5) F8: S2 is granted
`daemon/test/methods.test.ts`; `locate` enters `methods.ts` in the same commit as its router entry.
(6) F9's lane part: S2b is also granted `extension/src/client.ts` (the hello lives there, not in
`offscreen.ts`), `extension/src/handlers/tabs.ts`, `extension/src/handlers/network.ts`; S2b.2 adds
`grep -rn "targetTab({}" extension/src` → nothing; the two `methods.ts` comments are reworded.
(7) The stage order is the kickoff's default; budgets as in `stage0-audit.md` §7 (S2b 4 h with #79).
**Why:** Stage 0 audit (F4, F8, F9, F10, F15), all stricter or mechanical; none is a measurement seen.
**Instead of:** rewriting `hello.ts`; S3.5 without a control (it passes at the baseline, so it could
not fail); S2b's narrower lane, which cannot pass its own greps.
**By:** Claude

### 2026-10-23 · Pre-registered checks reworded where they could not hold or could not fail (#84)
**Decided:** before any of them is measured: S2b.3's "every lease and lock test from Step 7 still green
unchanged" becomes "unchanged, except edits that replace a removed form with its handle form, each
listed in S2b.8 with the form it used; the lease and lock assertions stay byte-identical, and each
edited test still fails when its contract is broken" (F11; Stage 0 measured 9 lease/lock tests that only
use a removed form). S2b.6's "nowhere the old hint" is scoped to `extension/src extension/test` (F18;
the e2e plan's recorded Run 8 text must stay). S6.1's "`/mcp` is the first recorded line" becomes "the
reload script's exit 0 and the stale check are the first recorded lines" (F32; headless actors start a
fresh MCP). Every grep check uses `grep -rn` and reads empty stdout **and** exit 1 (F16).
**Why:** a check that cannot hold or cannot fail tests nothing (#48's lesson); each rewording keeps the
check's intent and none follows a result.
**Instead of:** leaving S2b.3 to fail on test plumbing; dropping the clauses.
**By:** Claude (contract-level, pre-registered rules — listed under Open decisions)

### 2026-10-23 · Locator rules, the MCP locator schema and the exported `BridgeError` (#83)
**Decided:** (1) F13: a `{text}` locator matches the innermost element that survives the snapshot's
pruning gates (`aria-hidden`/`inert`/`hidden`/`display:none`, zero-size when `hasLayout`) whose
normalised text contains the needle, case-insensitive substring; `exact` means equality; `nth` counts in
the snapshot's walk order; `{role,name}` keeps 0.1's rule (only what a snapshot lists). The 0.1
invariant reads, for `{text}`, "what the snapshot's pruning shows". `buildSnapshot` stays exported from
`snapshot.ts`. (2) F12: the MCP's actions and `browser_wait_for` take a nested `locator: {role?, name?,
exact?, text?, css?, nth?}`; `ref` becomes optional; "exactly one of ref / locator" is validated in the
tool. Existing `text` fields keep their meaning. (3) F14: `@bridge/sdk` keeps exporting the shared
`BridgeError` class; the report fields (snapshot, screenshot path, network, `report()`) are optional
properties set on it, so every existing `instanceof BridgeError` keeps working.
**Why:** Stage 0 audit F12, F13, F14: the plan left `{text}` undefined (SDK-4's target is a role-less
div), a flat `text` collides with `browser_type.text`, and a subclass under the old name breaks
`instanceof` for errors thrown before a `Tab` exists.
**Instead of:** `{text}` limited to snapshot-listed elements (SDK-4 could never match); flat locator
fields; exporting a subclass as `BridgeError`.
**By:** Claude (contract-level — listed under Open decisions)

### 2026-10-23 · Page-function failures may carry `data` beside the marker (#82)
**Decided:** `content/guard.ts` also returns `__bridgeData` when the thrown error has plain-JSON `data`;
`unwrapResult` hands it on as the `BridgeError`'s `data`. The `{__bridgeError: "CODE:message"}` string,
the return-not-throw rule and null/undefined → `REF_STALE` are unchanged; S7 adds the field to that
`CLAUDE.md` gotcha.
**Why:** Stage 0 F6: `LOCATOR_NOT_FOUND {candidates}` and `LOCATOR_AMBIGUOUS {matches}` cannot cross
the marker today. This adds a sibling field and changes none of the invariant's clauses, so the STOP rule
on a changed invariant does not fire.
**Instead of:** JSON inside the message string; dropping the candidates.
**By:** Claude (contract-level, page-function shape — listed under Open decisions)

### 2026-10-23 · The Chrome `id` stays beside `tab` this step; network calls without `tab` stay "active" (#81)
**Decided:** S2b does not remove the Chrome `id` from `newTab`/`listTabs` results (F7: `recipes/hello.ts`,
`t5.ts` LEASE-6, `t5-lib.ts`, five daemon tests and `registry.ts` read it). A network call without `tab`
keeps #40's meaning (the human's tab), resolved without the legacy-path log. After S2b an **unlisted**
method without `tab` is refused `BAD_PARAMS "tab is required"` instead of forwarded (F8).
**Why:** the kickoff reserved the `id` removal for "unless Stage 0 finds a consumer" — it found several;
conservative rule: every tool, recipe and row behaves identically. #40 (ruled #69) gives absent "active"
by design. Refusing unlisted untargeted methods is stricter (today one acts on the human's tab unchecked).
**Instead of:** removing `id` and re-dating seven rows; `BAD_PARAMS` for untargeted network calls.
**By:** Claude (contract-level — listed under Open decisions)

### 2026-10-23 · The session marker's mechanism, amended (#80)
*Amended 2026-10-23 by #94 item 4: a reload with no `storage.session` marker waits out the 2 s bound for `onStartup` before reusing the local marker.*
**Decided:** amends #74. The service worker's `connect()` awaits a marker: `storage.session` has one →
reuse (worker restart); else wait up to 2 s for `onStartup` (a fresh random marker) or `onInstalled`
(reuse `storage.local`'s, an extension reload); neither in time → a fresh marker (costs leases, never
safety); write both stores. The marker travels in the worker's `connect` message to the offscreen
document and is part of the offscreen client key, so a changed marker sends a new hello. The daemon
compares with the last hello's marker (none is a value): A→none retires, none→none does not. The choice
is a pure, tested function over five event orders (worker restart; reload; `onStartup` before and
after `connect()` within the bound; neither). S2b.5 gains the none→none branch and asserts a retired
handle's `tabGone` carries the pre-restart `lastUrl`. New grant-free row SM-0 (an extension reload keeps
held handles) beside SM-1.
**Why:** Stage 0 F5: `storage.session` is emptied by a reload, `connect()` runs before `onStartup`, and
the offscreen key ignores the marker — #74 as worded would not close the hole it exists for.
**Instead of:** #74's `onStartup`-only mechanism.
**By:** Claude (contract-level, wire — listed under Open decisions with #74)

### 2026-10-23 · A new daemon never reuses a handle number; the SDK guards stale `Tab`s (#79)
**Decided:** S2b: `HandleTable` starts above a high-water mark kept under `~/.chrome-agent-bridge/`
(written before a minted handle is returned; reserving in blocks is allowed), falling back to a
start-time base when the file cannot be read or written; the base is injectable so tests keep `T1…`.
S3: each `Tab` carries the client's connection generation and throws `TAB_UNKNOWN` locally after a 4002
reconnect, with no call. #11's premise ("an explicit stale handle returns `TAB_UNKNOWN`") gets a dated
note naming the gap this closes. Rows quoting literal handles are re-dated before their run.
**Why:** Stage 0 F2 (CRITICAL), measured end to end on port 0 through two daemons: a stale `T3` acted on
the human's tab with no lease refusal, for any client (SDK, MCP, raw `call`). Only a daemon-side rule
covers every route; no wire change; reversible.
**Instead of:** client-side guards only (leave raw calls, Step 7 bundles and new MCP processes exposed).
**By:** Claude (contract-level, handle numbering — listed under Open decisions)

### 2026-10-23 · FE's rows and outcome table, amended before anything is measured (#78)
*Ruled 2026-10-24 by the user (#106): item 4's "the MCP's trusted tools keep today's behaviour" is replaced by a next-phase work item — they focus first too.*
**Decided:** amends #71, written before any FE row is committed. (1) FE-4 judges only what the human
sees: the human's tab stays `current` and never `hidden`; the foreground window and every window's
active tab are unchanged; the target is never `active` in its window; no window capture shows the
target. The debugging banner is expected and is not a FAIL. The target's page visibility is a
pre-registered **observation** ("`visible` while the option is on, `hidden` again after the call");
FE-1/FE-2's copied "target visibilityState hidden" is read after the call returns. (2) Precedence: FE-5
void → (B); else FE-4 FAIL → (B); else every kind passes all trials → (A); else no kind passes → (B);
else (C). FE-0 FAIL is "stop, reload, re-check", not an outcome. FE-5 "passes" if the control receives
input in any trial; FE-5 runs first and last. Each trial uses a fresh fixture tab or a reset status
line. FE-4 is judged over all trials of FE-1…3. (3) Positive control: one default-mode screenshot of the
target while the human's-tab `visibilitychange` logger runs must log `hidden` → `visible`. (4) Under
(A)/(C), the SDK sends `focusEmulation: true` on every trusted-capable click/type (it cannot see the
extension's automatic escalation); (C) is a per-kind map in `policy.ts`; `type {submit}` takes the
stricter of type and pressKey. Under (B), the MCP's trusted tools keep today's behaviour (no automatic
focus; `browser_focus_tab` stays an explicit call) and only the SDK's `Tab` focuses first.
**Why:** Stage 0 F1 (CRITICAL): in Chromium source focus emulation raises a visible capturer, so the
target page reads `visible` — read literally, FE-4 would fail on something the human never sees and
force (B) on a wrong premise. F3: the table overlapped and had no control. No FE measurement exists yet.
**Instead of:** the table as first written; changing the MCP's tools under (B).
**By:** Claude (contract-level, what the human sees — listed under Open decisions with #71)

### 2026-10-23 · The inherited-handles check runs in S3 as S3.5 (#77)
*Amended 2026-10-23 by #85 (Stage 0 F15): a positive control, a corrected pass outcome and a third outcome.*
**Decided:** S3 gains exit check S3.5: a test spawns, through `spawnDaemon`'s options, a stand-in
long-lived node script (never the real daemon, never port 9234) from a child whose stdout is a pipe;
the child exits; PASS = the reader sees end-of-file within 2 s while the stand-in lives (then killed by
its recorded pid). Both outcomes written now: pass at the baseline → no code change, and the MUX-6
gotcha gets a dated note that `spawnDaemon` inherits no pipe (the hold came from `Start-Process
-NoNewWindow`); fail → S3 fixes the spawn so nothing is inherited, the test is the proof.
**Why:** #36 asked Step 8 to check which handles the spawned daemon inherits; the phase doc had no item
(Step 7 propagator, "seen, not corrected"). Proposed by the kickoff §7 item 6.
**Instead of:** leaving MUX-6 as a correlation only.
**By:** Claude (build decision; the lane is `sdk/src/spawn.ts`, `sdk/test/`)

### 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as the 23rd code (#76)
**Decided:** S0 adds `NO_CURSOR` to `ErrorCodes` (23 codes); spec §10 gets a dated note; the SDK alone
raises it, never the daemon or the extension.
**Why:** the spec's §8 names `NO_CURSOR` for a `Tab`-less call with no cursor, but it is not among the
22 codes (Step 7 propagator, "seen"). Additive: no existing code or test changes. Proposed by the
kickoff §7 item 5; contract-level (codes), conservative rule.
**Instead of:** an SDK-local code outside `ErrorCodes`.
**By:** Claude (contract-level — listed under Open decisions)

### 2026-10-23 · S3.4 applies as written: the main entry also re-exports the formatters (#75)
**Decided:** `sdk/src/index.ts` re-exports `formatSnapshot` and `formatNetwork`; the
`@bridge/sdk/format` subpath stays and the MCP keeps importing it. Stage 0 confirms the re-export pulls
no new runtime dependency into the main entry.
**Why:** S3.4 is a pre-registered check, so it is the pre-stated rule; #46 (ruled #69) left the main
entry to Step 8. Additive: every existing import keeps working. Proposed by the kickoff §7 item 3.
**Instead of:** amending S3.4 to the subpath only.
**By:** Claude (contract-level, SDK surface — listed under Open decisions)

### 2026-10-23 · The extension hello carries an optional session marker (#74)
*Amended 2026-10-23 by #80 (Stage 0 F5): the mechanism below is not achievable as worded; #80 replaces it.*
**Decided:** S0 adds an optional `session?: string` to the extension's hello; S2b gives it behaviour.
The value stays the same across service-worker restarts and extension reloads and changes when Chrome
restarts (Stage 0 confirms the mechanism, e.g. a value written on `chrome.runtime.onStartup`). The
daemon: same marker → today's resync by id; a different marker, or none after one was seen → retire
every handle (`tabGone` to each holder once, leases dropped, mint anew); never a marker → today's
behaviour. The marker is never logged (`extension session changed: <n> handles retired`). Live row SM-1
needs a Chrome restart, so a fresh grant from the user.
**Why:** T2 verifier V4 and spec §13: after a Chrome restart a held handle can land on a reused tab id,
possibly the user's own tab. Stricter in every branch; undoable (the field is optional). Proposed by
the kickoff §7 item 4.
**Instead of:** no marker (a lease can land on a reused id); a marker that changes on every worker
restart (retires leases for nothing).
**By:** Claude (contract-level, wire — listed under Open decisions)

### 2026-10-23 · S2b makes `code` required on error frames (#73)
**Decided:** with the legacy path removed (#51's trigger), `WireError.code` becomes required in the
type; every extension error path sends a code (a test over `router.ts`'s paths). On receipt, a proto:2
peer's error without a non-empty string `code` is still delivered as `INTERNAL` — never dropped, never
a timeout — with one log line per connection naming the method only; a no-proto peer keeps today's
mapping.
**Why:** #51 (ruled #69) kept `code` optional until Step 8 removes the v1 fallbacks. Delivering as
`INTERNAL` keeps every caller answered. Proposed by the kickoff §7 item 2 of S2b.
**Instead of:** refusing or dropping a frame without `code`.
**By:** Claude (contract-level, wire — listed under Open decisions)

### 2026-10-23 · S2's daemon half becomes stage S2b (#72)
*Amended 2026-10-23 by #81 and #85 (Stage 0 F7, F9, F10): the `id` stays; the lane gains `client.ts`, `handlers/{tabs,network}.ts`; the daemon refuses `selectTab` itself.*
**Decided:** a stage S2b removes the Step 6 compatibility path (#41, #52, #53, #54, #57): daemon
legacy path, `LEGACY_ID_METHODS`, `selectTab` (method table, lock class, router), the `activeTab()`
fallback in `targetTab`, the old `tab:"all"` network scope, the Chrome `id` beside `tab` in
`newTab`/`listTabs` results (unless Stage 0 finds a consumer); it also makes `code` required (#73),
adds the session marker's behaviour (#74) and rewrites the switch-mode `WINDOW_MINIMIZED` text (#63).
Lane: `daemon/src/` (`intercept.ts`, `methods.ts`, `handshake.ts`, `route.ts`), `daemon/test/`;
extension `tabs.ts`, `sw.ts`, `network-scope.ts`, `offscreen.ts`, `errors.ts`, `extension/test/`;
`shared/src/error.ts`; plus one grant per consumer of a removed form that Stage 0 finds. S2.2's greps
are checked at S2b's close. Exit checks S2b.1–S2b.8 (kickoff §7).
**Why:** the removals are a compatibility contract spanning three packages, not locator work (Step 7
propagator question 1). Proposed by the kickoff §7 item 1.
**Instead of:** S2 spanning extension, daemon and shared.
**By:** Claude (contract-level, removal of compatibility forms — listed under Open decisions)

### 2026-10-23 · Stage FE measures focus emulation before `policy.ts` is set (#71)
*Amended 2026-10-23 by #78 (Stage 0 F1, F3): FE-4 judges only what the human sees; the table has a precedence and a positive control.*
**Decided:** a stage FE adds a `focusEmulation: true` param to trusted `click`/`type`/`pressKey`
(`Emulation.setFocusEmulationEnabled` on before the `Input.*` commands and off in a `finally`, inside
the same `withDebugger` session; no window focus, no tab activation; the result carries
`focusEmulation: "on"`), then measures it live (rows FE-0…FE-5, committed before the build is loaded).
The policy is read off this table, written before the measurement: (A) FE-1, FE-2, FE-3 pass every
trial and FE-4 passes → `"focusEmulation"`; (B) FE-1 and FE-2 fail, or FE-4 fails → `"focusFirst"`;
(C) mixed per input kind with FE-4 passing → per kind; one failed trial is a FAIL for that kind; FE-5
(the control) passing voids the comparison and reads as (B). Exit checks FE.1–FE.6 (kickoff §7).
**Why:** #62 (4) ruled that focus emulation is measured before the policy is set; #66 handed it to
Step 8; Step 7 propagator question 2. Resolves G8-1 inside the run. Proposed by the kickoff §7 item 2.
**Instead of:** setting `focusFirst` from the plan's fallback without a measurement.
**By:** Claude (contract-level, what the human sees — listed under Open decisions)

### 2026-10-23 · Step 8 agents run Opus 5.5 (#70)
**Decided:** every Step 8 agent at every level runs Claude Opus 5.5 (`claude-opus-5-5`); only the
headless E2E actor sessions of FE and S6 may run Sonnet.
**Why:** the user (#69): "I like higher quality product", with Sonnet builders named as the rejected
option.
**Instead of:** Sonnet builders.
**By:** user

### 2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7 open decisions (#69)
**Decided:** R9-SCREEN-2 is accepted (option A): its positive control's image came back, and CDP
simply renders saturated colours differently from `captureVisibleTab` (cyan `#00ffff` read
`#97fdfd`; magenta `#ff00ff` read `#dd00fa` through the default capture) — a measured fact, not a
fault; later colour checks name the nearest hue or use less saturated colours. #37 (Opus 5.5
everywhere), #40 (network `tab` keeps "all"/"active"), #46 (`@bridge/sdk/format` subpath; Step 8
decides on the main entry), #51 (`code` optional until Step 8 S2 removes the v1 fallbacks) and #54
(a bare network number is a legacy Chrome id until S2) are accepted as recommended.
**Why:** the user (2026-10-23): "I like higher quality product. And we ran out of limits quickly
because of many heavy parallel sessions at that moment."
**Instead of:** a re-run of R9-SCREEN-2 with a looser rule; Sonnet builders; renaming the scope
argument now; adding the formatters to `index.ts` now; requiring `code` now; removing the numeric form now.
**By:** user

### 2026-10-23 · The user rules on the Step 7 close-out questions (#68)
**Decided:** (1) T6 is committed (the classifier had blocked the builder's commit; the user gave the
green light; commit 430e6fe). (2) R9-NET-1 is accepted: the extra `favicon.ico` request after a hard
reload is expected and was not accounted for in the pre-written count; the document line met the row
(`12.8 KB`, `from cache: no`), so T5.3's NET-1 clause is met. R9-SCREEN-2's positive control waits for
the user after an explanation. (3) The user approves the decisions reported as taken while they were
away — #41, #42, #43, #57 and #62–#67; #41 and #42 leave Open decisions. The remaining open ones
(#37, #40, #46, #51, #54) are presented with a recommendation each.
**Why:** the user's reply of 2026-10-23.
**By:** user

### 2026-10-23 · T6 removes the extension's dead network formatters with their 15 tests (#67)
**Decided:** The five network formatters left in `extension/src/network-log.ts` after T4, and their
15 tests in `extension/test/network-log.test.ts`, are deleted; the same cases run against the SDK copy
in `sdk/test/format-network.test.ts` and the byte-identical baseline test. `npm test` 965 → 950 (59
files both), a documented removal of dead code, not an unexplained drop.
**Why:** nothing called them after T4 (T4 finding 1); two copies of a formatter drift.
**Instead of:** keeping dead code to hold the count.
**Revisit if:** the extension needs to format text again.
**By:** Claude

### 2026-10-23 · Chrome's anti-throttling flags do not fix background input; Step 8 takes it from there (#66)
**Decided:** Recorded as Step 8 input: with `--disable-renderer-backgrounding
--disable-backgrounding-occluded-windows --disable-background-timer-throttling`, a trusted click and
trusted typing into a background tab still answer `ok` in 12–15 ms and do nothing (Run 10, BGF-1/2
FAIL, one trial each; BGF-3/4 controls PASS; both work after `focusTab`). Background throttling alone
is not the cause; Step 8 measures focus emulation (#62 (4)) and sets its policy. The restart helpers
(`recipes/bgf-*.ps1`) may be reused in a later wave only on a fresh user grant — #64 (2) covered this
test only.
**Why:** BG-FLAGS (commits 00249de, c2234d4); Chrome ended without the flags, session counts
restored (1 window / 1 tab).
**Instead of:** shipping the flags as a workaround.
**Revisit if:** Step 8's focus-emulation measurement also fails.
**By:** Claude

### 2026-10-23 · Later extension reloads use `recipes/reload-extension.ps1` (#65)
**Decided:** From now on a wave reloads the extension with `recipes/reload-extension.ps1` (its own
`about:blank` window, `chrome://extensions` typed into its address bar, only the Chrome Agent Bridge
card's `dev-reload-button` invoked by UI Automation, verified by the card's worker restart and a new
`extension resync` line in `daemon.log`, window closed; exit 2 = pressed nothing on doubt), followed
by the stale-extension check. The user's keyboard is needed for a reload only when the script exits
non-zero.
**Why:** RELOAD-AUTO (commit 15320a6) proved it: every scripted reload was followed by `CHECK PASS`
and T5b's `OFFSCREEN` refusal in 2–3 ms; an independent verifier re-ran it; nothing else was pressed.
Granted by the user (#64).
**Instead of:** asking the user for every reload; a `chrome.runtime.reload()` bridge method (an
extension change — a Step 8 candidate, useful only once the loaded extension already has it).
**Revisit if:** Chrome changes the extensions page's accessibility tree, or the script ever exits 0
without the check passing.
**By:** Claude (on the user's grant #64)

### 2026-10-23 · The driver may reload the extension by UI automation, and restart Chrome with flags for the background-input test (#64)
**Decided:** The user grants two things that #33 kept with them: (1) the driver reloads Chrome Agent
Bridge itself by UI automation — in a `chrome://extensions` window the driver opens, it presses only
the reload button of the Chrome Agent Bridge card (no toggle, no remove, no Options, no token, no
other extension), then proves the reload with the stale-extension check; the procedure is worked out
by a dedicated step agent and written down as a reusable script and doc section; (2) Chrome may be
restarted with command-line flags to test focus emulation for background input (BG-1/BG-2), closed
gracefully (never killed) so the session restores, after Run 9.
**Why:** the user (2026-10-23): "I won't be available to reload, please figure out how to do it using
UI automation … It will be extremely valuable to figure out that procedure. Also to test cdp
emulation we may restart chrome with proper flags."
**Instead of:** stopping at G7-2 until the user can reload.
**Revisit if:** the automation ever presses anything but the one reload button, or a restart loses
the user's tabs.
**By:** user

### 2026-10-23 · T5b's three fixes (#63)
**Decided:** (1) A switch capture restores the window's previous tab at most once, when the capture
settles or at the 30 s chain bound, unless the window's active tab is no longer the target or
`focusTab` touched the window; the chain is released by 30 s without waiting on the restore.
(2) `screenshot {mode:"cdp"}` refuses before attaching the debugger: `WINDOW_MINIMIZED` for a
minimized window, `OFFSCREEN` for a background tab. (3) For a popup whose url is empty or
`about:blank`, the daemon polls `listTabs` every 100 ms for at most 2 s before sending
`leaseGranted`; the grant takes effect at once (F20). The switch-mode `WINDOW_MINIMIZED` message,
which still suggests `mode:"cdp"`, stays unchanged in Step 7 (its text is SCREEN-4's recorded
expectation); Step 8 rewrites it.
**Why:** Run 8 SCREEN-5, SCREEN-2/4, LEASE-3 (#62); refusing shows no banner and adds no unmeasured
timing constant; no wire change.
**Instead of:** a time bound on CDP capture; a new code `TAB_HIDDEN` (contract change); a url-update
event; delaying `tabCreated`; changing the message text after SCREEN-4 recorded it.
**Revisit if:** Chrome is measured to capture a hidden tab through CDP; a popup's url often takes
more than 2 s; a restore is seen undoing a human's choice (T5b verifier N1: after the 30 s release a
late restore can make the next capture show the human's tab).
**By:** Claude

### 2026-10-23 · The user rules on Run 8: fix stage T5b, then Run 9 (#62)
**Decided:** (1) SCREEN-1, SCREEN-3, SCREEN-5 and RESOLVER-1, which failed on defects in their own
pre-written checks (a pixel probe on label text and colour-managed captures; a DevTools window title
Chrome does not use), are re-run as Run 9 under corrected checks committed before any measurement;
Run 8 keeps its FAIL-as-written results. (2) NET-1, served from Chrome's cache in Run 8, is re-run in
Run 9 with the cache bypassed, expecting `12.8 KB`. (3) A fix stage T5b fixes three defects Run 8
found, with tests and a verifier, before Run 9: a timed-out capture restores the human's previous
tab; `screenshot {mode:"cdp"}` on a hidden or minimized tab refuses at once with a code (or is
bounded) instead of hanging to `TIMEOUT` (SCREEN-2); `leaseGranted.url` is filled rather than `""`
(LEASE-3). (4) BG-1/BG-2 (trusted input into a background tab answers `ok` and does nothing): Step 8
first adds a focus-emulation option and measures it, then decides its policy (`sdk/src/policy.ts`).
**Why:** the user's answers to the Run 8 questions.
**Instead of:** keeping the four rows as FAIL-as-written; accepting NET-1 as explained; deferring the
three fixes to Step 8; a "tab must be in front" policy without measuring focus emulation.
**Revisit if:** Run 9 fails again.
**By:** user

### 2026-10-22 · BG-1/BG-2's focus-emulation retry cannot run in this wave; T5.2 reports it unmet if they fail (#61)
**Decided:** No bridge method sends `Emulation.setFocusEmulationEnabled`, and a wave may not change
the extension. If BG-1 or BG-2 fails, the row records its text and "focus-emulation retry: not run",
and T5.2's retry clause is reported as NOT met in the gate checklist — not re-tuned, not waived. The
retry returns as a proposed decision for Step 8 (a CDP pass-through or a `focusEmulation` option for
trusted input). If both pass, nothing is affected.
**Why:** T5.2 is pre-registered; the honest record is "unmet", decided before the run.
**Instead of:** adding a method mid-wave, or dropping the clause.
**Revisit if:** Step 8 adds the option.
**By:** Claude

### 2026-10-22 · Which rows T5.3 counts as regression rows (#60)
**Decided:** T5.3 ("the regression rows pass with the same expected text as their last recorded
run") applies to rows whose behaviour Step 7 does not change by design. Rows whose expected text T4
updated with a dated note for a designed change (TAB-1…4, STAT-1, MUX-1/3, DL-1, NET-12 — the
handle/owner columns, `browser_select_tab` claiming, background `newTab`) are run against their
dated expected text and reported as such, not as regression rows. NET-1/MUX-9 stays a regression row
with `12.8 KB` (#56) and the `Network — active tab:` label.
**Why:** T4.4 and 0.8 change those outputs on purpose; the dated notes were written before any run,
and no recorded result was edited (T4 report).
**Instead of:** treating every earlier row as a byte-identical regression row, which designed
changes would fail.
**Revisit if:** a row's dated note turns out to be written after a run.
**By:** Claude

### 2026-10-22 · T4's MCP cursor and tool details (#59)
*Updated 2026-10-23 (Step 8 S5, #95): the revisit trigger "Step 8 adds `browser_use_active_tab`" is met, and the decision holds. An explicit `tab` still never moves the cursor; `browser_select_tab`, `browser_new_tab` and `browser_use_active_tab` move it, and only the last follows the human (it claims `{active:true}`). First-touch claim, lost-cursor notice and "not cleared by `TAB_GONE`" unchanged; `browser_status` shows the cursor and never claims.*
**Decided:** As in T4's report (`…-steps/T4.md` § Proposed decisions): an explicit `tab` never moves
the cursor (only `browser_select_tab`/`browser_new_tab` do); no `tab` → the cursor, or one shared
first-touch `tabs.claim {active:true}`; the cursor is lost on a 4002 `reconnected` and on a new
client, and the next untargeted result carries a one-line notice once; it is not cleared by
`TAB_GONE`/`tabGone`; `browser_select_tab`/`browser_close_tab` with no `tab` return an error without
calling anything; network tools keep "all"/"active" and drop the numeric form from the MCP schema
(handles replace Chrome ids, T4.3); an untargeted listing keeps the `Network — active tab:` label;
`browser_status` prints `Active tab: [T<n>] …` from `current`. The T4.2 fixtures run in one
global-realm JSDOM shared by the capture script and the test; the baseline is
`sdk/test/fixtures/baseline-51de800.json`, captured once and re-captured identically by the verifier.
**Why:** spec §6.5/§8.3 (the cursor does not follow the human), #43, #57, NET-1's regression text.
**Instead of:** an explicit `tab` moving the cursor; re-claiming the human's tab when the cursor's tab
closes; vitest's jsdom environment for the capture.
**Revisit if:** Step 8 adds `browser_use_active_tab`; a row shows an agent acting on an old handle
after a restart it was not told about.
**By:** Claude

### 2026-10-22 · T3's snapshot fields and capture rules (#58)
**Decided:** Snapshot elements (0.7): `depth` counts listed ancestors across open shadow roots and
frames; `frame` is the 1-based order of entered same-origin frames (absent at top level); `disabled`
only as `true`; `checked` for checkbox/radio/switch/menuitemcheckbox/menuitemradio; `expanded` from
`aria-expanded` or `<details open>`; `selected` from `<option>`/`aria-selected`; `href` resolved;
`value` for text inputs, textareas, spinbutton, slider and `<select>`, capped at 120 characters,
never for a password input; kinds tested by tag name. `activateForCapture`: the minimized check
first; the 500 ms capture slot reserved before the switch; one retry on Chrome's capture-quota error;
a per-window chain released when the restore settles or 30 s after it started; `fullPage` read as
truthy, exactly as the daemon's `takesLock` reads it (verifier V1: `fullPage: 1` switched tabs
without the lock). `selectTab` is the same handler as `focusTab`.
**Why:** T3's report; 0.7 named the fields but not their meaning; a password must not go on the
wire; Stage 0 F10/F19.
**Instead of:** DOM depth; a 0-based frame index; spacing measured between captures; an unbounded
chain; `fullPage === true`.
**Revisit if:** T4.2's byte-identical test needs another field meaning; SCREEN-3 sees a quota error
the retry cannot absorb; T3 verifier V4 (a timed-out capture's restore undoing a later `focusTab`)
shows up live.
**By:** Claude

### 2026-10-22 · T2's daemon details (#57)
**Decided:** The fourteen proposals of T2's report (`…-steps/T2.md` § Proposed decisions), in short:
`tabReplaced` onto a handled tab keeps the leased handle; `closeTab`/`selectTab`/`focusTab` with
neither `tab` nor `id` → `BAD_PARAMS "tab is required"` (no destructive default on the human's tab,
Stage 0 F4 — matches T1's extension); a no-proto extension gets `listTabs`/`newTab` and the free
methods forwarded as in Step 6 with no handles; the lease is re-checked and the handle re-resolved
after the lock wait; no `tabGone` to the client that closed the tab; network-scope details (explicit
`"active"` is not legacy; other strings are handles); F12's entry `tab` from `lastHandleOf`; the
`TAB_GONE`/`TAB_UNKNOWN`/`TAB_HELD {owner, since}`/`LOCK_TIMEOUT` texts with no URL in any message;
`tabs.claim` → `{tab}`, `tabs.release` → `{ok:true}`, `newTab`/`listTabs` keep the Chrome `id` beside
`tab` for the release; a replaced extension socket's events are ignored; a client gone during
`newTab`/`claim` is granted nothing; a deadline already passed → `TIMEOUT` without forwarding; the
F20 opener grant takes effect at once while only `leaseGranted` waits for in-flight `newTab` calls;
`networkClear` all fails closed on doubt.
**Why:** each is stricter or keeps Step 6 behaviour; T2's verifier passed them.
**Instead of:** the alternatives listed per item in T2's report.
**Revisit if:** the per-item triggers in T2's report; Step 8 S2 for the legacy forms.
**By:** Claude
*Updated 2026-10-22: #40 is amended — `networkClear` with the "all" scope is refused with
`TAB_HELD` whenever any other client holds any tab at the check, instead of only when that tab has
entries, because the probe-then-clear sequence could clear a held tab's entries in a race (T2 known
gap).*

### 2026-10-22 · NET-1's expected size follows the fixture to `12.8 KB` (#56)
**Decided:** T1's popup link grew `test-fixtures/e2e-playground.html` from 12 914 to 13 106 bytes, so
NET-1's expected `12.6 KB` becomes `12.8 KB` (13 106 / 1024 = 12.80). T5 writes the dated note in
`docs/e2e-test-plan.md` before the run.
**Why:** the size is the served `Content-Length` (#35); the fixture change was decided ("Step 7 T1
adds the fixture's "open popup" button"). Corrected from the byte count before any run, not from a
result.
**Instead of:** keeping `12.6 KB` and failing T5.3 on a planned fixture change.
**Revisit if:** the fixture changes again before T5.
**By:** Claude

### 2026-10-22 · T1's extension details (#55)
**Decided:** "No tab with id" from the extension is `TAB_UNKNOWN` (phase-doc 0.1); the daemon answers
`TAB_GONE` from its handle table. `listTabs` marks the human's tab with `current: true` (omitted
elsewhere); `active` keeps its per-window meaning. An unknown method gets `UNKNOWN_METHOD`
(message unchanged). Until T3, a viewport screenshot of an explicit background `tabId` is refused
rather than capturing another tab's pixels. `PAGE_ERROR.data` is `{name, stack?}` with `stack` capped
at 8 lines / 2000 characters. `describeDebuggerError` recognises our errors by `name ===
"BridgeError"` and a string `code`. The no-normal-window message lives in `errors.ts`, and T3.3 gains
`grep -nE "focused\s*:" extension/src/tabs.ts extension/src/errors.ts` → nothing (dated note).
**Why:** T1's report; each is additive or stricter, and every existing message text is unchanged.
**Instead of:** `TAB_GONE` from the extension; redefining `active`; `INTERNAL` for unknown methods;
capturing the visible tab for a background `tabId`.
**Revisit if:** T3 lands `activateForCapture` (removes the screenshot refusal); T4 wants
`current:false` on every tab.
**By:** Claude

### 2026-10-22 · A bare number in a network `tab` is a legacy Chrome id, not `BAD_PARAMS` (#54)
**Decided:** Amends #40. On the network methods a numeric `tab` (a Step 6 client's form) is resolved
to its handle and lease-checked exactly like `closeTab`/`selectTab` with an `id` under #41, forwarded
as numeric `tabId`, logged once per client with no URL; an unknown id → `TAB_UNKNOWN`. Step 8 S2
removes it with the rest of the legacy path.
**Why:** read literally, #40 would break a running Step 6 MCP's numeric network form, which #41
exists to prevent; the lease check keeps it as strict (T2 escalation item 4).
**Instead of:** `BAD_PARAMS` for any number.
**Revisit if:** Step 8 S2 lands.
**By:** Claude (contract-level, conservative rule; open for the user)
*Updated 2026-10-22 (T2 verifier V5): "lease-checked" applies to `networkClear` only;
`networkRequests` stays free for every client, as spec §6.3 says, with the numeric id resolved the
same way.*

### 2026-10-22 · `selectTab` takes the visibility lock, like `focusTab` (#53)
**Decided:** The daemon puts `selectTab` in the same lock class as `focusTab`.
**Why:** it is an alias of `focusTab` for one release ("selectTab stays as an alias of focusTab for
one release"); outside the lock it would change the screen under a capture. The stricter choice.
**Instead of:** leaving it out of the lock list because 0.4 names only `screenshot` and `focusTab`.
**Revisit if:** the alias is removed (Step 8 S2).
**By:** Claude

### 2026-10-22 · The daemon sends the network "all" scope as `scope`, and two Step 6 test fakes speak the new hello (#52)
**Decided:** (1) Because the daemon never forwards a `tab` key (T2.3), it sends the network "all" scope
as `{scope:"all"}`; T1's `resolveScope` reads it and still accepts the old `tab:"all"` from a Step 6
daemon. (2) Under #42 two Step 6 tests' fake extensions say v1: `daemon/test/multiplex.test.ts`'s
in-flight test sends a method outside the table instead of `snapshot` (assertions byte-identical,
dated note), and `mcp/test/extension-down.test.ts`'s fake (one-file grant to T2) sends
`role:"extension", proto:2` and answers `listTabs`; new tests pin `VERSION` for a v1 extension.
**Why:** T2's escalation: no stage owned the extension half of F3, and #42 (correctly) refuses the
fakes' v1 hello. The tests' intent and asserted text are unchanged.
**Instead of:** forwarding legacy calls on a v1 extension without resolving them (loosens a lease).
**Revisit if:** another Step 6 test needs an edit beyond its fake's hello.
**By:** Claude

### 2026-10-22 · v2 peers do not yet require `code` (#51)
**Decided:** `WireError.code` stays optional and `fromWire` still maps a missing, non-string or empty
code to `INTERNAL` — the D0 revisit ("Step 7 teaches the extension codes") answered with no change.
**Why:** no pre-stated rule tightens it; a stale extension's v1 `{message}` must still arrive (Stage 0
F22), and #42 already refuses such an extension for tab calls.
**Instead of:** rejecting a v2 error without `code`.
**Revisit if:** Step 8 removes the v1 and `activeTab()` fallbacks.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · T0's guard rules: strict on field types, lenient on extra fields (#50)
**Decided:** The five Step 7 event guards (`shared/src/protocol.ts`) require their fields present and
typed (tab ids by `Number.isInteger`), accept an absent or `undefined` optional field, reject `null`
or a wrong type, and accept unknown fields. No `isScreenshotMode` guard: the daemon locks unless
`mode === "cdp"` (or `fullPage`), so an unknown mode falls on the locking side. The content script's
`{__bridgeError}` shape (#38) stays inside `extension/`, not in `shared/`.
**Why:** the senders are our own code, so strictness surfaces bugs; JSON drops `undefined`, so
in-process frames and wire frames agree; extra fields are accepted as `isHello` does.
**Instead of:** `null` as absent; a mode guard; a shared error-marker type.
**Revisit if:** T1 must send `null`, or an unknown `mode` must be `BAD_PARAMS`.
**By:** Claude

### 2026-10-22 · `NetworkRequestsResult.text` is deprecated in T0 and removed in T4 (#49)
**Decided:** T0 makes `NetworkRequestsResult.text` optional and `@deprecated` instead of removing it;
T4 removes it once T3 stops producing it and the MCP formats the entries.
**Why:** removing it in T0 leaves every commit from T0 to T4 typecheck-red in `extension/` and
`mcp/`, which empties T1's and T2's "typecheck green" checks (T0.1 permits the red, T1.1 does not).
The end state is the plan's.
**Instead of:** removing `text` in T0 and reading later checks as "green except the T0 consumers".
**Revisit if:** a stage needs `text` gone earlier.
**By:** Claude
*Updated 2026-10-22: the optional field broke one line, `mcp/src/tools/registry.ts:282`; T0's lane
was extended by that one line, `return text(out ?? "");` (behaviour identical, T4 deletes it),
instead of keeping `text` required (T3 would hit the same line) or leaving typecheck red.*

### 2026-10-22 · Stage 0's check sharpenings and T5 PASS rules (#48)
**Decided:** The Stage 0 audit's F25 rewrites are added to the pre-registered exit checks as
stricter forms beside the originals: T1.4 (a column-1 grep for top-level `await` and the listeners),
T1.5 (no `console.*` call passes `p`, `params`, `tab`, `info` or `changeInfo`; the fallback warning
prints only the method name), T6.1 (`grep -n "Control targets" CLAUDE.md` returns nothing, since the
old grep could not fail), and T3.2's wording. F26's PASS rules for LEASE-2, LEASE-6, SCREEN-1,
SCREEN-2, SCREEN-4, BG-1…4 and the DevTools-focused resolver check are pre-registered now; T5 copies
them into its rows before the run and may only make them stricter. Dated notes in the phase doc.
**Why:** nothing has been measured yet, every change makes a check discriminating or stricter, and
T6.1 as written could not fail.
**Instead of:** leaving judgement checks and an unfailable grep, or letting T5 write PASS rules alone.
**Revisit if:** a sharpened check turns out to test something other than the original's intent.
**By:** Claude

### 2026-10-22 · T4.2's baseline is captured in a worktree of T3's parent commit (#47)
**Decided:** T4's builder captures the baseline snapshot text (`buildSnapshot`) and network text
(`formatEntries`) over the existing fixtures, once, in a git worktree of T3's parent commit, and
stores it under `sdk/test/fixtures/` with that commit id; T4's verifier repeats the capture and must
get the same bytes.
**Why:** no whole-text baseline exists, and T3 changes `buildSnapshot` first (Stage 0 F11).
**Instead of:** capturing from the new formatter (forbidden).
**Revisit if:** the capture cannot run in the worktree.
**By:** Claude

### 2026-10-22 · The formatters reach the MCP through a `@bridge/sdk/format` subpath (#46)
**Decided:** T4 adds a `./format` export to the SDK package for the moved formatters; `sdk/src/index.ts`
keeps its five exports, and Step 8 decides whether the formatters join it.
**Why:** the SDK's public surface is Step 8's (Stage 0 F23); a subpath can be removed or folded in
later without breaking the five exports.
**Instead of:** exporting the formatters from `index.ts` in Step 7.
**Revisit if:** a recipe needs the formatters before Step 8.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · LEASE-6 measures whether a discard keeps the tab id, with both outcomes pre-written (#45)
**Decided:** LEASE-6 records the tab id before and after a Memory-Saver discard. "Same id, no
`tabReplaced`" and "new id, `tabReplaced`" both PASS when the handle still works afterwards; the row
reports which happened.
**Why:** Chrome's docs say `tabs.onReplaced` fires for prerendering/instant, and Chromium's 2024
discard keeps the tab, so the plan's premise is probably false on Chrome 156 (Stage 0 F7; unconfirmed).
**Instead of:** the row as written, which would fail on a premise rather than on the bridge.
**Revisit if:** LEASE-6 shows a new id.
**By:** Claude

### 2026-10-22 · One deadline per call covers the lock wait and the forwarded call (#44)
**Decided:** The daemon sets `deadline = received + clamp(timeoutMs ?? 30000, 100, 600000)`. The
lock wait ends at the deadline with `LOCK_TIMEOUT {holder}`; the forwarded call then waits
`deadline − now + 5000`. The extension still gets no deadline, so the revisit trigger of "D2's daemon
details" does not fire.
**Why:** two separate waits would outlive the SDK client's own timer (Stage 0 F9).
**Instead of:** a fresh `daemonWaitMs` after the lock is taken.
**Revisit if:** the extension needs the caller's deadline.
**By:** Claude

### 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window (#43)
**Decided:** One resolver, `chrome.windows.getLastFocused({windowTypes:["normal"]})` → its active
tab, serves the 0.1 fallback, `listTabs`' active marker, `tabs.claim {active:true}`, the legacy path
of #41, `browser_status` and `browser_list_tabs`. With no normal window, the error names a DevTools or
popup window as the likely cause. Owners: T1 (resolver, marker, error), T2 (claim, legacy path), T4
(MCP), T5 (a pre-registered live check with the service-worker console focused: status and snapshot
name and act on the same tab). No E2E expected text changes (rows use an `[<id>]` placeholder).
**Why:** W1 proposal 3, accepted (#36); Stage 0 F8.
**Instead of:** `lastFocusedWindow:true` (fails under a focused DevTools window), or "first active tab
of any window".
**Revisit if:** a row shows a popup window chosen, or the DevTools-focused check fails.
**By:** Claude

### 2026-10-22 · A stale extension is refused for tab calls, detected by its hello (#42)
**Decided:** T1's extension hello adds `role:"extension", proto:2` (a Step 6 daemon accepts it —
Stage 0 probe P1). T2's daemon answers every tab-carrying method with `VERSION` and a reload hint when
the connected extension's hello had no `proto`.
**Why:** an extension that was not reloaded ignores `tabId` and acts on the active tab, past every
lease (Stage 0 F6); refusing is the stricter choice.
**Instead of:** relying on the `unknown method` text.
**Revisit if:** the extension's hello gains a build id.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · A Step 6 client keeps working against a Step 7 daemon for one release, without loosening a lease (#41)
**Decided:** (C) both of: (A) a daemon legacy path — a tab-carrying call with no `tab` (or
`closeTab`/`selectTab` with a Chrome `id`) is resolved to the human's tab (#43) or the id's handle,
lease-checked exactly as an explicit `tab`, takes the method's lock class unchanged, grants no lease,
is forwarded with a numeric `tabId`, and is logged once per client without a URL; and (B) build
discipline — no `npm run build` in the main tree between T2's and T4's commits; verifiers build in
clean worktrees. Step 8 S2 removes the legacy path with the extension's fallback. T2.4's
"`BAD_PARAMS "tab is required"`" clause is superseded by a dated note in the phase doc.
**Why:** the SDK's knock hashes `daemon/dist/index.js` on disk (`sdk/src/knock.ts`), so every running
Step 6 MCP — the user's own sessions — would adopt a freshly built Step 7 daemon and fail every tool
with `BAD_PARAMS` (Stage 0 F5; the verifier re-executed it). Existing tools keep behaving; no lease
is loosened; it is removable.
**Instead of:** (A) alone, (B) alone, or forwarding without `tabId` (loosens a lease; forbidden).
**Revisit if:** Step 8 S2 lands, or the user rules otherwise.
**By:** Claude (contract-level, conservative rule; open for the user)

### 2026-10-22 · The `tab` parameter keeps its "all"/"active" meanings for the network tools (#40)
**Decided:** On the network methods `tab` is a handle, `"all"`, or `"active"`/absent. A bare number
from a Step 7 client is `BAD_PARAMS`. `networkClear {tab:"all"}` is refused with `TAB_HELD` when
another client holds a tab that has entries.
**Why:** `tab` already means a scope on the wire and in the MCP schemas (Stage 0 F3); keeping it
keeps today's tools identical, and the `"all"` refusal keeps the lease strict.
**Instead of:** reading every `tab` as a handle, or renaming the scope parameter.
**Revisit if:** Step 8 redesigns the network tools.
**By:** Claude (contract-level, conservative rule; open for the user)
*Updated 2026-10-22: amended twice — a bare number is a legacy Chrome id (#54), and `networkClear`
"all" is refused while any other client holds any tab (#57's update).*

### 2026-10-22 · The daemon's method classes are one table, and the download methods are free (#39)
**Decided:** `route.ts` keeps every method in one table of classes (free, tab-carrying, intercepted,
lock-taking). `downloadStart`, `downloadChunk` and `downloadEnd` are free. `closeTab` is intercepted
and lease-checked and sits only in that class (verifier V8).
**Why:** without it `browser_download` breaks (Stage 0 F2).
**Instead of:** "no `tab` and not free → `BAD_PARAMS`" with the plan's free list.
**Revisit if:** a new extension method is added (it must enter the table).
**By:** Claude

### 2026-10-22 · Content-script failures are returned, not thrown, to carry `CODE:message` (#38)
**Decided:** Page functions return `{__bridgeError:"CODE:message"}`; `unwrapResult` turns it into a
`BridgeError` with that code, and still treats a null or undefined result as failure (`REF_STALE`).
**Why:** a thrown injected function resolves with `result: null` (CLAUDE.md gotcha), so a prefixed
thrown message never arrives (Stage 0 F1). The null-or-undefined invariant is kept.
**Instead of:** prefixing thrown messages, as phase-doc 0.6 says.
**Revisit if:** Chrome adds an `error` field to `InjectionResult`.
**By:** Claude

### 2026-10-22 · Step 7 agents run Opus 5.5 (#37)
**Decided:** Every Step 7 agent — the session agent, each step agent, every builder, verifier,
fixer and the propagator — runs Claude Opus 5.5 (`claude-opus-5-5`); every `Agent` call passes
`model: "opus"`. The only exception is the T5 wave's headless actor sessions (`claude -p`), which may
run Sonnet or Haiku, as W1's did.
**Why:** the Step 7 kickoff names it, continuing "Step 6 agents run Opus 5.5" and the user's W1
instruction to delegate to Opus subagents; the phase doc names no model.
**Instead of:** a cheaper model for builders or verifiers.
**Revisit if:** the user vetoes it.
**By:** Claude (default, flagged for veto)

### 2026-10-22 · The user rules on the W1 proposals (#36)
**Decided:** The remaining W1 proposals are accepted as recommended. NET-1's expected text becomes
`12.6 KB` (dated correction in the MUX-9 row and a note under Run 6), and `.gitattributes` pins
`test-fixtures/*.html` to LF so a checkout cannot change the size again. Step 7's Stage 0 makes
`browser_status`, `listTabs`' `active` flag and the action tools agree on the active tab, with an
error that names the cause. Step 8 checks which handles a spawned daemon inherits (a pipe test, then
spawn with nothing inherited if confirmed). DL-1's `[bridge] download held 69 bytes` is accepted as
not observed. With MUX-5 (#34) this meets every exit check: **Step 6 is closed (gate G6-2).**
**Why:** the NET-1 cause was proven by measurement (#35); the other three are small, owned by later
steps, and do not touch what Step 6 delivers.
**Instead of:** re-running NET-1 on a CRLF checkout; keeping Step 6 open.
**Revisit if:** a later run shows a size that differs from the response's `Content-Length`.
**By:** user

### 2026-10-22 · NET-1's `12.9 KB` came from a CRLF copy of the fixture, proven by a live probe (#35)
**Decided:** The size gap is explained, not a bridge fault. The same playground served twice through
the bridge on 2026-10-22 gave `12.6 KB` for the LF file (12 914 bytes, `Content-Length 12914`) and
`12.9 KB` for a CRLF copy (13 168 bytes, `Content-Length 13168`); the network log prints the
server's `Content-Length` (`extension/src/network-log.ts`). No committed version of the fixture fits
`12.9 KB` in LF (the earlier ones are 10–10.7 KB), so Run 6 was served a CRLF working copy
(`core.autocrlf=true` writes CRLF on checkout). Nothing was partial: W1's loads were complete and
its downloads hash-exact. The correction and an LF pin for the fixtures were then accepted
(#36).
**Why:** the user asked for the cause before accepting a changed expectation ("partial downloads
sounds like something that will bring trouble").
**Instead of:** correcting the row on a cause that only fitted the numbers.
**Revisit if:** the fixture changes or a size differs from `Content-Length` again.
**By:** Claude (measured; the investigation was the user's ruling)

### 2026-10-22 · MUX-5 is accepted; its slowness is a later item (#34)
**Decided:** MUX-5 (handover to a new build, the MCP follows) passes on its re-measurement. Its
first run's snapshot failed on a focused DevTools window; the re-measurement got a snapshot 16.9 s
after the handover against the row's 15 s. Investigating that latency (and the active-tab
mismatch behind the first failure) is a future improvement item, not a priority now.
**Why:** the user's priority is getting the new system running; the behaviour MUX-5 measures
(#22, #23, #24) worked in every run.
**Instead of:** re-running MUX-5 by hand before Step 7.
**Revisit if:** an action fails right after a 4002 reconnect in real use.
**By:** user

### 2026-10-22 · Live E2E waves are run by Claude end to end (#33)
**Decided:** From now on Claude runs live E2E waves autonomously: it starts and prompts its own
Claude sessions (headless `claude -p`, Sonnet or Haiku for simple tool-call prompts), runs
PowerShell windows, opens and closes Chrome, captures Chrome's window for banner checks, and
delegates side work to Opus subagents. The steps a wave sheet tags [UI] or [USER] are the driver's
unless they need a decision only the user can make. The limits stay: no token printed, nothing
pushed, no extension change or reload, kills only of identified PIDs after `Test-SafeToKill`.
**Why:** the user ran W1's first eight rows by relaying steps remotely and asked mid-wave for the
rest, and every future wave, to run this way ("I fully trust you").
**Instead of:** the user doing every [UI]/[USER] step at the keyboard.
**Revisit if:** an autonomous run disturbs the user's own Chrome work or misjudges a row a person
would have caught.
**By:** user

### 2026-10-22 · W1's set-up: the driver has no bridge MCP, the token moves from the MCP config into `bridge.token` (#32)
**Decided:** For wave W1 the driver session was relaunched with `--strict-mcp-config` and an empty
MCP config, so it was not a bridge client (caution A1). The token already in the MCP entry's `env`
was copied into `bridge.token` by a script that printed only its length, and the `env` block
(`BRIDGE_TOKEN`, `BRIDGE_PORT`) was removed from `~/.claude.json` by script; the extension's
Options already held that token, so nothing was pasted.
**Why:** a driver with the bridge MCP would have changed every client count and made MUX-4, MUX-6
and MUX-7 impossible; Windows clipboard history was on, so pasting a fresh token would have left it
in the history.
**Instead of:** the A1 fallback (skip MUX-4, 6, 7), and a fresh token pasted into the Options
(§1 item 8).
**Revisit if:** the token must be rotated — then generate a new one into `bridge.token` and type it
into the Options from Notepad.
**By:** user

### 2026-10-22 · The user rules on the seven Step 6 open decisions (#31)
**Decided:** Every decision proposed in `docs/plans/2026-10-22-step6-open-decisions-review.md` is
ratified as built: #13 option A, #15 A, #21 A, #22 A, #24 A, #27 A, each with its revisit rule.
Two rulings add to the proposal:
- **#13 (no welcome → `VERSION`):** no work goes into coexisting with a pre-Step-6 bridge. Every
  machine is upgraded (`docs/setup.md` §3 "Upgrading a machine that ran the bridge before Step 6"),
  and the 2 s welcome timeout is dropped when its revisit rule fires (after Step 8).
- **#14 (the detached daemon):** keep the spawn (A) and measure it in MUX-7. If MUX-7 fails — the
  daemon dies in a case where the row expects it alive ((b) a normal session end, (c) the shim
  killed alone, (d) a tree kill of a session that did not spawn it) — the double spawn through a
  short-lived launcher (B) is built, as a prerequisite item of Step 7. It is no longer left to the
  user's call.

The user also ratifies every decision Claude took under delegated authority on 2026-10-22 (#16–#20,
#23, #25, #26, #28–#30).
**Why:** The user's review of the open decisions, 2026-10-22.
**Instead of:** The other options in the review doc.
**Revisit if:** As in each entry; #14 when the D6 wave runs MUX-7.
**By:** user

### 2026-10-22 · The D6 wave's set-up: token from `bridge.token`, a quiet recipe, a dist-comment rebuild, a local redirect fixture, tagged steps (#30)
**Decided:** The wave provides the token only through a `bridge.token` file created by a command
that prints nothing, with `BRIDGE_TOKEN` unset. `recipes/hello.ts` prints tab ids and titles, never
URLs, and re-checks its connection after the hold. MUX-5 changes the build by appending a comment
to `daemon/dist/index.js` (the SDK has no "upgraded daemon" message, so the row judges the build,
the new pid and the log). DL-2's cross-origin redirect comes from a stdlib fixture
(`test-fixtures/redirect_server.py`) bound to `127.0.0.1:8081`. Every wave step is tagged [UI]
(UI automation), [SH] (an agent's shell) or [USER], with ten cautions where automation would
disturb a measurement.
**Why:** One token source keeps the D6.3 log grep meaningful and the token off every screen; the
user said on 2026-10-22 that the E2E tests may use UI automation; the rest are the cheapest
discriminating set-ups (`D6.md`, `D6-verifier.md`).
**Instead of:** `BRIDGE_TOKEN` in the environment; a real rebuild for MUX-5; a third-party redirect
host.
**Revisit if:** Chrome's Local Network Access prompts on the request to `127.0.0.1:8081`, or the
fixture's `text/plain` type differs in real Chrome (both unmeasured until the wave).
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · setup.md documents stopping the daemon by killing its process, with no stop script (#29)
**Decided:** `setup.md` documents the idle exit and the OS commands that stop the daemon (Windows:
stop the process listening on 9234; Linux/macOS: `pkill -f daemon/dist/index.js`, with a note for
`BRIDGE_DAEMON` paths), warns that an open MCP starts a new daemon 5 s later, and offers no
`daemon.shutdown` recipe as a stop command.
**Why:** No stop command exists, and `daemon.shutdown` closes clients with 4002, which SDK clients
treat as "reconnect", so it may spawn a new daemon at once (`D7.md`).
**Instead of:** An untested tsx snippet calling `daemon.shutdown`.
**Revisit if:** Step 8 adds a stop command to the SDK.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D5b's shape: `requireExtension: false`, a `connectOptions()` helper, a test-only daemon import (#28)
**Decided:** The option of decision #27 is `connect({ requireExtension?: boolean })`, default
`true`. `false` resolves on the welcome whatever the extension's state, with no wait timer, and
ignores `waitForExtensionMs`; the client stays open and `extensionConnected` follows
`extensionStatus`. The MCP builds its options in `mcp/src/config.ts` `connectOptions()` →
`{name, requireExtension: false}`. The new MCP test imports `daemon/src` by relative path, so the
`NOT_CONNECTED` text, welcome and `daemon.status` come from the daemon itself; the mcp bundle holds
no daemon code.
**Why:** An explicit boolean reads better than overloading `waitForExtensionMs: 0`, whose "wait
0 ms then fail" reading is the opposite. Measured: with the extension down a tool call fails in
0–1 ms with the `1a92d95` text and the client stays; once the extension connects the next call
succeeds on the same client (`D5b-verifier.md`, real `ws` on port 0).
**Instead of:** `waitForExtensionMs: 0`; inline options in `index.ts`; a fake copy of the daemon.
**Revisit if:** Step 8's SDK surface review (the option is listed under #27 for user review).
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The MCP connects without waiting for the extension, so Chrome closed reads as today (#27)
**Decided:** A follow-up stage D5b adds a `connect()` option that returns the client even when
the welcome says the extension is down (no 15 s wait, no `NOT_CONNECTED`), and the MCP uses it.
With Chrome closed, `browser_status` then reports the daemon connected and the extension not
connected, tool calls get the daemon's immediate `NOT_CONNECTED` with today's text, and the client
does not churn. Scripts keep the default 15 s wait (MUX-8 unchanged).
**Why:** As built in D5, Chrome closed made `browser_status` say "Daemon: not connected" although
the daemon was up, tools said "connecting…" for ~15 s, and the MCP opened and closed a daemon
client every ~20 s (`D5.md` §5). Long-run §3's conservative rule for a contract choice with no
pre-stated rule is the option that keeps every existing tool behaving as before; the option is
additive and undoable.
**Instead of:** Accepting the churn for Step 6 (D5's proposal); a shorter wait (the SDK closes the
client when any wait expires).
**Revisit if:** Step 8's SDK surface review settles the option's final name or shape.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D5's MCP link: a `client.connect()` health check, a thin config, interim exports gone (#26)
**Decided:** `mcp/src/link.ts` (`BridgeLink`) checks the client it holds with `client.connect()`
every 5 s and after any `NOT_CONNECTED` call; that resolves at once with no wire traffic on an open
client and rejects with the failure on a client closed by any code but 4002, after which the MCP
stores the message, drops the client and runs a fresh `connect()` on the 5 s chain; attempts never
overlap. `mcp/src/config.ts` keeps only `actorName(pid)`; `connect()` resolves token and port.
`daemon/package.json` loses its interim `exports` block; `mcp` declares `ws` (external in the
bundle); `validateHello` stays (a test pins it).
**Why:** Decision #15 asks for exactly this; the SDK's public surface has no failure event and D5's
lane excluded `sdk/`. Measured: the fresh `connect()` ran 4993 ms after a 1001 close; a 4002
reconnect left the client in place (`D5-verifier.md`).
**Instead of:** Exporting the SDK's internal `onClientFailure`; polling with `status()` (a message
every 5 s); keeping the interim daemon exports.
**Revisit if:** Step 8 adds a public close or failure event, or reconnect.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D3's daemon lifecycle: idle armed at start, every shutdown exits 0, bad env values, the log policy (#25)
**Decided:** The idle timer is armed at start (zero clients) and counts clients only. Signals
(SIGINT/SIGTERM/SIGBREAK), idle and `daemon.shutdown` all run `host.shutdown(…)` and exit 0 through
a `WsHost` `onShutdown` hook. Exit 1 for a bad `BRIDGE_PORT`, a missing token, an unhashable entry,
any listen error other than `EADDRINUSE` (exit 0, one `listen()`), or an uncaught error. A bad or
over-2³¹−1 `BRIDGE_DAEMON_IDLE_MS` is logged and replaced by 600000. The log at
`~/.chrome-agent-bridge/daemon.log` is cut to its last 1 MiB on start; a line containing `://` or
the token is withheld whole; a log that cannot be written is skipped silently, never stdout.
**Why:** A spawned daemon nobody connects to must still go away; exit 0 marks every intended end,
including losing the bind race (the bind is the lock, spec §9.3); setTimeout fires at once above
2³¹−1, which made the daemon exit after 1 ms before the fix (`D3-verifier.md`). The daemon has no
stdio, so it cannot report a log failure anywhere else.
**Instead of:** Arming idle only after the first client leaves; exit 1 on a bad idle value;
redacting inside a line rather than withholding it.
**Revisit if:** A lost bind race is seen to drop a log line (the loser truncates before it binds);
D6 shows the daemon idling out under a spawn that never connected.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · BridgeClient exposes welcome, extensionConnected and on("reconnected") in Step 6 (#24)
**Decided:** Beyond the D4 checkbox, `BridgeClient` has read-only `welcome` and `extensionConnected`
getters and an `on("reconnected", cb)` listener. `sdk/src/index.ts` still exports exactly the five
D4.3 values.
**Why:** `connect()`'s extension wait needs both getters; `on("reconnected")` is the hook decision
#11 asks Step 6 to leave for the Step 7/8 cursor clear. Additive and undoable; Step 8 owns the final
surface.
**Instead of:** Package-internal accessors that D5 and Step 7 would have to reach into.
**Revisit if:** Step 8's SDK surface review.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The knock's 10 s budget runs per spawn cycle, with a handshake timeout per attempt (#23)
**Decided:** The 10 s limit restarts at the client's own handover; the knock spawns once per cycle;
each `tryConnect` gets the remaining budget (floor 100 ms) as its WebSocket handshake timeout
(`ETIMEDOUT`, no spawn).
**Why:** The handover starts a new spawn cycle in 0.7's diagram; repeated spawns only lose the bind
race; a port holder that accepts TCP and never upgrades kept `connect()` pending past 14 s before
the handshake timeout existed (`D4-verifier.md`). The 10 s limit itself is unchanged.
**Instead of:** One 10 s budget for the whole `connect()`; a spawn per refusal; no handshake timeout.
**Revisit if:** D6 sees a handover take longer than 10 s, or a spawned daemon dying silently.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · A reconnect after 4002 never hands the daemon over (#22)
**Decided:** `BridgeClient`'s 4002 reconnect runs the knock with the handover disabled: a build
mismatch there rejects with `VERSION` naming both builds (spawning on a refused port is still
allowed). After a client's own handover, an old build still answering at the deadline also rejects
with `VERSION`.
**Why:** Decision #10 caps handovers per `connect()`, but every 4002 reconnect is a fresh knock, so
two clients on different builds could still hand the daemon back and forth; the D4 verifier
simulated two handovers. Failing beats looping (`handover-race.test.ts` pins ≤ 1 shutdown).
**Instead of:** Letting each reconnect hand over once — the letter of #10, not its purpose.
**Revisit if:** D6 shows a legitimate upgrade that needs a reconnecting client to hand over (a
long-running MCP after `npm run build` with the old daemon still alive).
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The SDK reports configuration and connection failures as NOT_CONNECTED (#21)
**Decided:** A missing token, a missing daemon build, a bad `BRIDGE_PORT`, the 10 s give-up and a
close 4001 reject with `NOT_CONNECTED`, each message naming its cause and never the token. `VERSION`
is kept for build or protocol mismatches and the missing welcome.
**Why:** Spec §10's 22 codes have no configuration or authentication code, and adding one is a spec
change. `NOT_CONNECTED` is what the MCP's 5 s retry already treats as "not reachable yet".
**Instead of:** `BAD_PARAMS` (meant for a method's params); `VERSION` for 4001; a new code.
**Revisit if:** Step 8 adds an authentication or configuration code to spec §10.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D2's daemon details: parseHello beside validateHello, BAD_PARAMS for bad ids, no forwarded timeoutMs, interim defaults (#20)
**Decided:** `parseHello(data, token)` returns `{ok, role, name?, build?}` or `{ok:false, reason}`;
`validateHello` stays a wrapper returning `{ok:true}`. A client request with a numeric or empty id
gets `BAD_PARAMS` with the id echoed; a frame with no id is dropped and counted. The frame forwarded
to the extension stays `{id, method, params}`: the clamped wait is daemon-side only. `WsHost` takes
`build` as an option (default `"dev"` until D3 passes the hash); an unnamed client is listed as
`"unnamed"`; client ids are `c<n>`, never reused in a process. An unknown role closes 4001 with the
reason "unknown role", checked after the token, echoing no field value.
**Why:** An existing test pins `validateHello`'s `{ok:true}` and existing tests stay unedited; a
client sending `id: 1` would otherwise hang to its own timeout (stage0-audit B8); decision 0.2 keeps
routing dumb and the v1 extension ignores the field; D3 owns the hash. Evidence: `D2.md`,
`D2-verifier.md` (385 tests; 63 new tests fail with `daemon/src` reverted).
**Instead of:** Editing the pinned test; dropping non-string ids silently; copying `timeoutMs` onto
the forwarded request; the generic "expected hello handshake" for an unknown role.
**Revisit if:** D5 removes the last `validateHello` caller; the SDK ever sends numeric ids; Step 7's
extension wants the envelope timeout; a real daemon ever reports build `"dev"`.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D1's interim wiring: daemon skipped by the build until D3, a `./connection` export, a hand-edited lockfile (#19)
**Decided:** The root build is `npm run build --workspaces --if-present`, so `daemon/` (no build
script until D3) is skipped; D3 adds one. Until D5, `@bridge/mcp` depends on `@bridge/daemon`,
which exports `./bridge`, `./connection`, `./wsHost` and `./startup`; `./connection` exists only for
a dynamic import in `tools.test.ts`. The builder removed a stale extraneous `"server"` entry from
`package-lock.json` by hand; `npm ci` accepts the file and `npm install --package-lock-only` leaves
it unchanged.
**Why:** Keeps D1 a pure move (322 tests before and after, `D1.md`, `D1-verifier.md`) without
inventing a daemon entry before D3 designs it.
**Instead of:** A placeholder daemon build; importing the connection by relative path across
packages; regenerating the whole lockfile.
**Revisit if:** D5 leaves any of the interim exports or the `mcp` → `daemon` dependency in place.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · D0's protocol shapes: optional wire code, strict v2 hello fields, events without id (#18)
**Decided:** The wire error is `WireError {code?, message, data?}`; `fromWire` maps a missing,
non-string or empty code to `INTERNAL` and keeps any other non-empty string. `isHello` rejects a
hello whose `role`/`name`/`build`/`proto` is present but mistyped (`role` ∈ extension|client,
`proto` any number so a future version reaches `VERSION` handling). `isEvent` requires a string
`event`, a non-null `params` object and no `id`. `shared/package.json` exports `./codes` and
`./error`, and `protocol.ts` re-exports both.
**Why:** Decision 0.4 already says a v1 `{message}` error becomes `INTERNAL`, so the optional code
is the pre-stated rule, not a new contract; the strict hello matches D2's "unknown role → 4001"
and leaves the v1 `{type, token}` hello untouched; spec §10 writes events as `{event, params}`.
Evidence: `D0.md`, `D0-verifier.md` (322 tests, extension bundle byte-identical).
**Instead of:** A required `code` (wrong for v1 traffic); accepting any extra hello fields;
optional event `params`; subpath-only exports.
**Revisit if:** Step 7 teaches the extension codes (then v2 peers may require `code`); a bundle
holds two copies of `BridgeError` and `instanceof` breaks.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · Stage order D0 → D1 → (D2 ∥ D4) → D3 → D5, and the Stage 0 builder resolutions (#17)
**Decided:** D0 runs before D1 rather than beside it, and D4 lands before D3 so the daemon imports
the real `sdk/src/token.ts` (behind a `./token` subpath export) instead of a stub. D1 moves
`server/src/index.ts` to `mcp/src/index.ts` unchanged, with a temporary `mcp` → `@bridge/daemon`
dependency removed in D5; `daemon/` has no entry or build until D3. `startup.ts` and its 5 tests
are deleted in D5 as a documented removal. The SDK finds `daemon/dist/index.js` from the workspace
root (the `bridge.token` walk-up), `BRIDGE_DAEMON` overrides it, and a missing file rejects before
the knock. Timeouts: the daemon waits `clamp(timeoutMs ?? 30000) + 5000`, `BridgeClient` 1 s more,
the MCP call sites unchanged. Any `daemon.*` method other than `status`/`shutdown` answers
`UNKNOWN_METHOD`, never forwarded. The three `browser_status` tests are a planned output change,
replaced one for one. New `shared` modules go through `shared/package.json` `exports`; `tsx`
becomes a root devDependency in D1; every client must agree on `BRIDGE_PORT` (documented).
**Why:** Each closes a gap the Stage 0 audit found a builder would otherwise fill alone
(`stage0-audit.md` F2, F4–F7, F18–F20, F22–F24). D0 first keeps D1's "test count unchanged" check
clean; D4 before D3 removes a stub D5 would have to unwire.
**Instead of:** D0 ∥ D1 and D3 before D4 as the kickoff sketched; `../daemon/dist` relative to
`import.meta.url` (wrong once bundled).
**Revisit if:** A stage verifier finds one of these conflicts with the spec.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · Stage 0's amendments A5–A12 applied to the phase doc (#16)
**Decided:** The held amendments are applied with dated notes: D1 runs `npm install` (A5); D5.5
names the `e2e-test-plan.md` lines and rows CONN-3/CONN-7 (A6); D7.1's grep adds the
"one session" variants (A7); D0.4 covers only tests of new behaviour, reverted with
`git stash push -u -- shared/` (A8); D5.1 becomes "≥ before − 5" for the deleted
`startup.test.ts` (A9); D3.5's grep adds `startWsHost` (A10); the D7 `setup.md` item states the
token precedence, env over file, closing the W0 item (A11); D5.4 expects an empty `lifecycle.ts`
diff because the shutdown callback lives in `mcp/src/index.ts` (A12).
**Why:** As written each check either could not hold or missed its target (evidence in
`stage0-audit.md`). The test-count drop is a documented removal, which the integrity floor allows.
None loosens a check: A12 is stricter, A7 and A10 widen greps.
**Instead of:** Leaving the checks as written and tripping STOP rules mid-stage.
**Revisit if:** —
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · What clients do on a close code other than 4002 (#15)
**Decided:** `host.shutdown(code)` stops accepting, sends `close(code, reason)` to every socket,
waits up to 1 s, then `terminate()`s. `BridgeClient` reconnects on 4002 only. When an established
connection closes with any other code, the MCP stores the reason and calls a fresh `connect()` on
its existing 5 s retry; a script gets an error.
**Why:** Close codes are contract-level and the plan left the MCP's behaviour after a drop open
(`stage0-audit.md` F8). Today's `WsHost.close()` terminates, which clients see as 1006. The MCP's
no-crash rule already implies it keeps trying; scripts must not silently continue on another daemon.
**Instead of:** Leaving the MCP after a drop unspecified; letting `BridgeClient` reconnect on more
codes (a forbidden fix).
**Revisit if:** Step 8's SDK surface adds reconnect.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · The detached daemon's survival depends on how the session's MCP is killed (#14)
**Decided:** Keep decision 0.8's spawn as written. MUX-7 names the kill method and expected result
for `taskkill /T /F` on a live MCP tree, a normal session end, and killing the nvm shim alone, and
D6 adds "end the spawning session normally → the daemon is still alive". If the daemon dies on a
normal end, the fallback is a double spawn through a short-lived launcher, the user's call. POSIX
stays unverified. *Superseded 2026-10-22 ("the user's call"): if MUX-7 fails, the double spawn is
built as a Step 7 prerequisite (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions).*
**Why:** Measured in Stage 0 (`stage0-audit.md` F3): on Windows a `detached` child keeps its
`ParentProcessId`, so `taskkill /T` on a live spawner kills it; a child whose spawner already
exited survives. Whether Claude Code ends MCP servers that way was not established. Changing 0.8
now would change the design of record without evidence.
**Instead of:** Switching to a double spawn now.
**Revisit if:** D6 shows the daemon dying when the session that spawned it ends.
**By:** Claude (ratified 2026-10-22)

### 2026-10-22 · A Step 6 client gives up with VERSION when no welcome arrives (#13)
**Decided:** After `hello`, the SDK's knock waits at most 2 s for `welcome`. If none arrives it
closes the socket and rejects with `VERSION`, naming the cause: a pre-Step-6 bridge server holds the
port, end the old session. It never spawns or hands over in that case. `setup.md` says "end every
pre-Step-6 session first".
**Why:** Measured in Stage 0 on port 0 (`stage0-audit.md` F1): a v1 `WsHost` takes a v2 hello as
the extension, replaces the real extension's slot, routes the old session's calls to the client and
never answers. Without a bound `connect()` hangs. The old session is left broken either way, so the
docs tell the user to end it; pre-Step-6 servers already exit with their session.
**Instead of:** Leaving 0.7 without a "connected but no welcome" branch; probing without a hello
(v1 and v2 both send nothing first, so a probe cannot tell them apart).
**Revisit if:** v1 servers can no longer exist (after Step 8). *Added 2026-10-22: the user rules
that no work goes into coexisting with a pre-Step-6 bridge; every machine is upgraded (decisions.md · 2026-10-22 · The user rules on the seven Step 6 open decisions).*
**By:** Claude (ratified 2026-10-22)

### 2026-10-21 · Step 6 agents run Opus 5.5 (#12)
**Decided:** Every agent in the Step 6 run — session agent, step agents, builders, verifiers,
fixers, the propagator — runs `claude-opus-5-5`. The kickoff states it once and every brief
repeats it.
**Why:** The research repos pin Opus for their long runs and the user wants the same tier here;
one model across the tree keeps reports comparable.
**Instead of:** Fable 5.1 everywhere (the model this wave ran on), or Fable for the session agent
and Opus below.
**Revisit if:** A Step 6 stage report shows the model struggling with the `ws`-level tests; then
Step 7's kickoff may name another model.
**By:** user

### 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon restart (#11)
*Corrected 2026-10-23 (Stage 0 F2): "an explicit stale handle returns `TAB_UNKNOWN`" held only while the new daemon had minted fewer handles; #79 makes it true.*
**Decided:** Handles are not persisted (Step 7 plan 0.2), so after a close 4002 reconnect
`BridgeClient` drops its cursor. A script then gets `NO_CURSOR` ("call newTab() or claim() first").
The MCP treats a missing cursor exactly like first touch: it claims the human's active tab and
prefixes the next tool result with one line saying the daemon restarted and which handle it now
holds. A stale handle passed explicitly as `tab` still returns `TAB_UNKNOWN`.
**Why:** The actor is told what happened and lands on a usable tab; nothing silently continues on
a handle that now names a different tab.
**Instead of:** Reporting `TAB_UNKNOWN` and asking the user which tab (blocks a script that could
recover); persisting handles across restarts (rejected in Step 7 plan 0.2).
**Revisit if:** A handover mid-session is seen to land the MCP on the wrong tab in the Step 7 or
Step 8 E2E wave.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · One daemon handover per connect(), then a VERSION error (#10)
**Decided:** The SDK's knock state machine (Step 6 D4) hands the daemon over at most once per
`connect()`. If the build still mismatches after its own handover, `connect()` rejects with the
spec's `VERSION` code, naming both builds. Documented rule: every client on a machine points at one
daemon build; `BRIDGE_DAEMON` is a development override, not a per-client setting.
**Why:** Two clients with different `BRIDGE_DAEMON` paths would otherwise hand the daemon back and
forth forever. Failing loud once is cheaper than any arbitration.
**Instead of:** Recording it as a known limitation only (the loop would be found live, in the D6
wave); "newest file wins" by comparing file times (needs the daemon to report its path; more
surface for a development-only case).
**Revisit if:** A real workflow needs two daemon builds side by side.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes (#9)
**Decided:** The Step 8 docs stage records that Step 8 closes the roadmap's Phase F items
"element-visible `wait_for`" and "return a `[ref=eN]` for a `kind:"node"` result". The item
"`args` for `browser_evaluate`" stays open in Phase F; nothing in Step 8 adds it.
**Why:** The plan said "args-less evaluate data", which is not a roadmap item; the roadmap must
name only what the step delivers.
**Instead of:** Adding `args` to Step 8's scope (not in the design spec).
**Revisit if:** A recipe needs to pass data into `evaluate` without string escaping.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 7 T1's `activeTab()` count is 4 in actions.ts, 13 across handlers (#8)
**Decided:** The Step 7 plan's `actions.ts ×5` is corrected to `×4` (lines 6, 12, 39, 85 of
`extension/src/handlers/actions.ts`); the total across `extension/src/handlers/` is 13, as the
plan's verifier focus already states.
**Why:** Re-counted with `grep -rn "activeTab()" extension/src/handlers` on commit `e60a83a`.
**Instead of:** Leaving it for the Step 7 audit (a wrong count in a checkbox misleads a builder).
**Revisit if:** A handler gains or loses an `activeTab()` call before Step 7 starts.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 8 SDK-4 waits for the fixture's delayed text with a {text} locator (#7)
**Decided:** Row SDK-4 uses `waitFor({locator: {text: …}})` on the message that
`#load-later` ("Load message in 1.5s") makes appear, and tests `state: "hidden"` by removing that
element with `evaluate`. The fixture is not changed for it.
**Why:** The fixture has no delayed button; the `{text}` locator variant has no other E2E row.
**Instead of:** Adding a delayed button to `test-fixtures/e2e-playground.html` in Step 8 S2.
**Revisit if:** The fixture gains a delayed control for another reason.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 7 T1 adds the fixture's "open popup" button (#6)
**Decided:** The `target="_blank"` button that row LEASE-3 needs is added to
`test-fixtures/e2e-playground.html` in Step 7 stage T1, whose lane gains `test-fixtures/`.
**Why:** T1 adds the `tabCreated {openerTabId}` event the button exercises, so the row's fixture
and its mechanism land together.
**Instead of:** T3 (the later extension stage) or T5 (changing the fixture during wave prep).
**Revisit if:** T1 is split or re-ordered in Step 7's Stage-0 audit.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Step 6 writes the DL rows for browser_download before its D6 wave (#5)
**Decided:** `docs/e2e-test-plan.md` gains a `DL` family: DL-1 (a plain download saved to disk
with the profile's cookies, sha256 reported) and DL-2 (a cross-origin redirect followed by the
service-worker fetch). The Step 6 autonomous run writes them, expected text first, alongside the
MUX rows, and the `DL-1` cites in the Step 6, 7 and 8 regression lists stay.
**Why:** `browser_download` (commit `eec05a0`) has never had an E2E row, and three plans already
cite one.
**Instead of:** Writing the rows in this wave (the wave has no code or fixture scope); dropping
the cite (download would stay untested live).
**Revisit if:** D6's wave shows DL-2 needs a fixture the public repo cannot hold.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Stage D2 emits the extensionStatus event (#4)
**Decided:** Step 6 stage D2 owns the daemon-side emit of `extensionStatus {connected: true}` to
every client when the extension hello arrives (and `{connected: false}` when it leaves). It is a
checkbox in D2 (this item takes the plan's checkbox count from 43 to 44; the DL-rows item below
makes it 45) and exit check D2.7 tests it.
**Why:** D4's `waitForExtensionMs` and Step 7 T2 both rely on it, and a work item that is only an
exit check can be missed by a builder.
**Instead of:** A note under D2 pointing at D2.7; moving the emit to D4 (crosses the `daemon/`
lane).
**Revisit if:** Never; it is a work-item placement.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · connection.ts changes in Step 6, per decision 0.4 (#3)
**Decided:** The Step 6 plan's "Files touched" line `connection.ts (unchanged)` is corrected:
`ExtensionConnection` rejects with a `BridgeError` carrying `code`, as plan decision 0.4 says.
**Why:** 0.4 is a contract decision of the plan; the file list was a stale line from before it.
**Instead of:** Keeping `connection.ts` unchanged and wrapping errors in `route.ts` (would reopen
0.4).
**Revisit if:** Never; it is a text correction.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · selectTab stays as an alias of focusTab for one release (#2b)
**Decided:** Step 7 stage T3 keeps the extension's `selectTab` method as an alias of the new
`focusTab`; Step 8 stage S2 removes it together with the `activeTab()` fallback.
**Why:** The same one-release migration pattern as Step 7 plan 0.1; a Step 6 MCP still calls
`selectTab` (`server/src/tools/registry.ts:145`) until Step 7 T4 lands.
**Instead of:** Removing it in T3 (an MCP built before T4 would get `unknown method` on
`browser_select_tab`).
**Revisit if:** Never; the removal is already scheduled.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · The actor name carries the MCP's own process id (#2)
**Decided:** The MCP's actor name is `claude-code #<pid>` with the MCP process's own `process.pid`,
as the design spec §8.3 says. Step 6 D5 and Step 8 0.6, which said `process.ppid`, are corrected.
**Why:** Under the nvm-windows shim the parent is the shim, not Claude Code (`CLAUDE.md`
lifecycle gotcha); the MCP's own id is unique per session and is what a process listing shows.
**Instead of:** `process.ppid` (would have meant amending the spec).
**Revisit if:** A way to learn the Claude Code session id from the MCP's environment appears.
**By:** Claude (ratified 2026-10-21)

### 2026-10-21 · Steps 6–8 run under the long-run contract (#1)
**Decided:** Future development, starting with Step 6 (daemon + protocol v2), Step 7 (multi-actor
tabs) and Step 8 (SDK surface + MCP cursor), runs as autonomous phases under the project skills
`long-run`, `step-agent`, `phase-kickoff` and `session-closeout`, with the writing rules in
`docs/docs-writing-guide.md` and this decision log. Each step starts from a kickoff written with
`phase-kickoff` (`docs/plans/next-session-prompt.md`), opens with a Stage-0 spec audit, is built
stage by stage with an independent verifier per stage, and closes with an as-built register.
**Why:** The method is proven on the user's research repos (exp3-cafrl Phases 1–5, FinetuneCV
temporal Phases A/B, the exp3 revision waves): the trail survives context loss and respawns, and
verification is done by an agent that did not write the code.
**Instead of:** Continuing the single-session, plan-plus-sessions-file style of Steps 1–5. It
worked for session-sized steps, but Steps 6–8 each span days and cut across `server/`,
`extension/` and `shared/`.
**Revisit if:** A step turns out to fit one session; then the two-level form of `long-run` §2 is
enough and the kickoff says so.
**By:** user
