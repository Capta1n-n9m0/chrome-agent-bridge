# Step 9 — propagator report

Propagator: Claude Opus 5.5, 2026-10-24, baseline `b59feb8` (tree clean). Inputs: the as-built register
`docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`, decisions.md #128–#199, the S4 report and run record. Read
against: the phase doc, the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, `CLAUDE.md`,
`docs/setup.md`, `docs/e2e-test-plan.md`, `README.md`, `docs/progress-and-roadmap.md`. No later step plan exists in
`docs/plans/` (no Step 10 phase doc; `next-session-prompt.md` is still the Step 9 kickoff and was left as history).
Every correction is an in-place dated note; no original text was deleted. Not edited: `CLAUDE.md` (proposed below),
`docs/decisions.md`, the as-built register, code, `docs/e2e-test-plan.md` §4.20 and §5.

## Correction ledger (26)

| doc | location | correction | reason |
|---|---|---|---|
| phase doc | 0.2, badge bullet | two badge states → three (none, `JS` amber, `OFF` red, also for every failure state; `OFF` wins); Chrome adds a second title line | as-built § S2b; #143, #181; Run 13 record SAFE-1 (4) |
| phase doc | 0.2, F20 note ("read in S4 (SAFE-2)") | measured: `Alt+Shift+K` assigned as `_execute_action`; input layout unchanged (`0x04090409`, three layouts) | as-built § S4 Contracts; SAFE-2 PASS |
| phase doc | 0.3, "`listTabs` and the hello still answer" | `listTabs` is refused `DISARMED` when the state cannot be read; an unknown method is `UNKNOWN_METHOD` in every state | as-built § S2a; #178, #170 |
| phase doc | 0.3, "detached (the banner goes)" | measured: trusted `type` ended `DISARMED` 14 ms after the press, banner still up at 3 s, gone by +14 s; `waitFor` refused at 54–92 ms | as-built § S4; SAFE-4; #194 |
| phase doc | 0.3, network log "(proposed)" | as built: a request dropped for good once one event was dropped; own-page tab counts as blocked; SAFE-8 0 / 1 | as-built § S2a; #179, #155 |
| phase doc | 0.4, F3 note ("measured in S4 (SAFE-7c)") | SAFE-7c was **not measured**; block shown not to depend on it (SAFE-7b, SAFE-7, SAFE-REL-1 PASS); `downloadStart` to `chrome-extension://` → `BAD_PARAMS` from the handler, not the gate | S4.md §4; #154 |
| phase doc | 0.4, F8 note (`res.url` check) | post-redirect check unit-tested only; SAFE-5c redirect half `TIMEOUT` (tooling probable) | as-built § S4; #194 |
| phase doc | 0.5, F14 note ("S4 measures … SAFE-6c") | measured: `javascript:` with JavaScript on → `NAV_FAILED`, page unchanged; with it off the gate refuses first | as-built § S4 Contracts; SAFE-6c, SAFE-6/6b |
| phase doc | 0.6, F12 note (`Safety:` line; null reset) | `Safety:` is a second text item, only while the extension is connected, seen in actor transcripts; null also from each new extension hello; `safetyStatus` never null | as-built § S3; #162, #165, #159; SAFE-1 (3), SAFE-9 |
| phase doc | 0.7, "the toggles log one line each" | only a button/shortcut press logs (five fixed lines); options page logs nothing; daemon line format; 60 allowlisted sites; SAFE-10 0 hits | as-built § S2b, § S4; #187 |
| phase doc | Stage S1 | parser/matcher live in `safety-match.ts`, not `safety.ts` | as-built § S1; #149 |
| phase doc | Stage S2 (single-stage ticked text) | ran as S2a, S2b and the unplanned fix stage S2c; the gate is `GatedRouter` in three phases | as-built § S2a–S2c; #189 |
| phase doc | Stage S2, F20 note repeated | SAFE-2 measured (as above) | as-built § S4 Contracts |
| phase doc | Exit check S1.1 amendment (`Router.on` throws) | the throwing `on` is `GatedRouter.on`; `Router` unchanged beside it | as-built § S2a; #169, #147 |
| phase doc | Human gate G9-2 | no UIA Invoke pattern on the toolbar/Extensions buttons; the runner pinned by a verified mouse click instead of asking (process deviation) | as-built § S4; #192, #193 |
| phase doc | Follow-ups, Step 10 | adds Run 13's four re-measurements, SAFE-REL-3's URL class, #193's stop rule | as-built § S4; #194, #196, #193 |
| spec | header Status | Step 8 closed (W2); Step 9 built and E2E-run, 25 codes, 2720 / 116 at `ba6029e`, gate open | as-built § S5 |
| spec | §6.2 Handles (events, `leaseGranted.url` poll) | `tabRemoved` carries `hidden` and no last URL/title while disarmed or blocked; `leaseGranted.url` `""` without the wait | as-built § S3; #134, #161 |
| spec | §6.3, "calls touching no tab … are free" | free of leases only: network calls refused while disarmed and filtered; `listTabs` redacted, refused when the state is unreadable | as-built § S2a; #137, #178 |
| spec | §10, "The extension's `Router` serialises …" | the worker serves through `GatedRouter` (gate before dispatch and as post-check; throws on an unclassified method; unknown → `UNKNOWN_METHOD` in every state) | as-built § S2a; #169, #170 |
| spec | §10 Step 9 note, `daemon.status.safety` null rule | also null from each new extension hello; never broadcast null; redaction follows the last state across sockets | as-built § S3; #165, #159, #160 |
| spec | §10 Step 9 fixer note, script URLs with JavaScript on | measured `NAV_FAILED`, page unchanged | as-built § S4 Contracts; SAFE-6c |
| setup.md | Safety → badge table | added: Chrome 156's second title line ("Has access to this site") | Run 13 record SAFE-1 (4), SAFE-9 |
| setup.md | Safety → "Still answered" (`browser_status` adds a line) | a second text item, only while the extension is connected; no `Safety:` line at all when it is down | as-built § S3; #162 |
| progress-and-roadmap.md | §1 Step 9 block, decisions range | #128–#197 → #128–#199 | as-built § S5 (#198, #199) |
| e2e-test-plan.md | header, automated test count | 1714 / 85 → 2720 / 116 at `ba6029e`; §4.20 covers Step 9 live | as-built § S5 |

Checked and found current (no edit): `README.md` (security paragraph, 2720 / 116, Run 13 counts); the roadmap's
status header, Step 9 block, Phase E and "Step 10 inputs" paragraphs; `setup.md` §4 (pin step), the shortcut,
JavaScript-switch, blocked-sites, own-page and failure-state sections (SAFE-2, SAFE-6c, SAFE-4 and SAFE-5c already
stated as measured or unmeasured); `e2e-test-plan.md` §1 item for the S9 helpers; spec §6.5's Step 9 note and the
§10 codes note (25 = 24 on the wire + `NO_CURSOR`); the phase doc's Outcome, Status line and earlier Stage 0
supersessions (0.1 "one gate before the handler", 0.2 `commands.onCommand`, 0.4/0.3 "(proposed)" redaction).

## CLAUDE.md — proposed (the session agent applies)

`CLAUDE.md` at `b59feb8` already carries Step 9's counts (23 tools, 25 codes, 2720 / 116), key files, Current state
and the "Step 9 — safety" gotcha block. Stale lines left:

1. **Architecture diagram**, line `+ events tabCreated/tabRemoved/tabReplaced  (extension hello: proto:2, session)` →
   `+ events tabCreated/tabRemoved/tabReplaced/safetyState  (extension hello: proto:2, session)`.
   Reason: Step 9 added the E→D event `safetyState` (#132; as-built § S0).
2. **Flow line**, `… → extension socket → \`router.on(method, …)\` → handler → …` →
   `… → extension socket → \`GatedRouter\` (the safety gate at receipt, again before each first side effect and as
   the post-check) → handler → …`. Reason: `sw.ts` serves only through `GatedRouter` (#169; as-built § S2a).
3. **Key files, `daemon/src/intercept.ts`**, `(null until reported and after the socket closes)` →
   `(null until reported, from each new extension hello until that socket reports, and after the socket closes;
   \`safetyStatus\` is never sent with null)`. Reason: #165, #159 (as-built § S3).
4. **Key files, `extension/src/sw.ts`**, `(router + offscreen orchestration; the top-level \`chrome.tabs.on*\`
   listeners)` → `(the \`GatedRouter\` + offscreen orchestration; the top-level \`chrome.tabs.on*\`,
   \`action.onClicked\` and \`storage.onChanged\` listeners)`. Reason: as-built § S2a, § S2b.
5. **Testing philosophy**, the pure-unit list ends `… the MCP cursor, the SDK formatters)` →
   `… the MCP cursor, the SDK formatters, Step 9's safety gate, block-list matcher, state store, badge model and
   options model)`. Reason: those modules are pure and TDD'd (as-built § S1, § S2a, § S2b).
6. **Docs section**, `**Step 6 built (2026-10-22); Steps 7 and 8 built (2026-10-22/24).**` → append
   `**Step 9 built and E2E-run (2026-10-24, Run 13):** the kill switch, the JavaScript switch and the block list,
   enforced by one gate in the extension (\`docs/plans/2026-10-24-step9-phase-e-safety.md\`, as-built
   \`…-asbuilt.md\`); its gate waits on the user's ruling on Run 13 (#192).` Reason: the section stops at Step 8.
7. **Docs section, Step 8 sentence**, `its open decisions are listed in \`docs/decisions.md\` → Open decisions.` →
   `its open decisions were ruled in wave W2 (decisions.md #106–#127) and Step 8 closed 2026-10-24.` with
   `*Superseded 2026-10-24: was "its open decisions are listed …", because W2 ruled them.*` Reason: Current state
   says Step 8 closed (W2).
8. (Optional, gotcha) **Step 9 block**, after the `Alt+Shift+K` bullet: `- **Chrome 156 shows a second line under
   the extension's action title** ("Has access to this site", Run 13 record SAFE-1 (4), SAFE-9): read only the
   first line when checking the title by UI automation.` Reason: measured, and the S9 helpers already match by
   prefix.

## Needs a decision

1. **SAFE-7c (can `chrome.debugger` attach to this extension's own options page?) stays unmeasured.**
   Options: (a) leave it unmeasured — the block refuses every call before any attach (SAFE-7b), so nothing depends
   on the answer; (b) measure it in Step 10 with a throwaway extension in a driver-only profile (a new grant).
   Recommendation: (a); revisit only if a gate exemption for own pages is ever proposed.
2. **No Step 10 phase doc exists to carry Step 9's live follow-ups** (#193, #194, #196). They live in the roadmap's
   "Step 10 inputs" paragraph, the phase doc's Follow-ups (corrected here) and CLAUDE.md's Current state. Options:
   (a) the Step 10 kickoff lists them as a required wave with the #193 stop rule; (b) a separate short wave before
   Step 10. Recommendation: (a), so the threaded redirect server and the re-measurements ride Step 10's first live
   wave.
3. **`browser_status` with the extension down shows no `Safety:` line** (#162), where #132 read literally gives
   `not reported (reload the extension)`. Already listed under Open decisions (#162); the docs now say what is
   built. No new decision; noted for the user's ruling.
