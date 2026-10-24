# S2a — builder brief (Step 9, stage S2a "Extension enforcement")

Written 2026-10-24 by the S2a step agent. Read in this order: `CLAUDE.md` (its "Runtime gotchas" are measured
facts and bind); `briefs/common.md` in this directory (ALL of it is part of this brief: ESCALATION list,
LESSONS, SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, STOP rules and forbidden fixes bind you verbatim);
`.claude/skills/step-agent/role-prompts.md` (Common preamble + §Builder bind you); then this file.

## Common preamble (role-prompts.md, verbatim)

```
Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push; never touch the
user's real Chrome profile (no extension reload, no live browsing) unless your brief grants
it; never log URLs, header values or bodies from extension code. Report in the exact format
requested. Never invent results — if something did not run, say so. Decisions you take go
in your report as "Proposed decisions" (date · plain title, then Decided / Why / Instead of /
Revisit if). No internal codes without a one-line gloss. Model: Claude Opus 5.5 (claude-opus-5-5).
```

You are a level-2 agent: you must NOT spawn agents. Finish in one go; never wait on background work.
Do NOT commit — the step agent commits after the verifier. Do not reload the extension, touch the real
Chrome, start the real daemon or bind 9234. Node first in every Bash call that runs node/npm/npx:
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

## Baseline

HEAD `3d2c111`; `npm test` 2329 passed / 96 files; `npm run typecheck` exit 0; `npm run build` exit 0. Re-run
all three first and record the numbers.

## LANE

`extension/src/**` EXCEPT `extension/src/content/**`, `extension/src/safety.ts`, `extension/src/safety-match.ts`
(S1's) and `extension/src/options.ts` (S2b's); plus `extension/test/`. NOT `extension/manifest.json`, NOT
`extension/options.html` (S2b). Your report: `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2a-builder.md`.
If you believe `safety.ts`/`safety-match.ts` need a change: stop that line, describe the minimal change and
whether it alters anything S1's tests pin, and report it — do not make it. Anything else outside the lane:
report, do not touch. The badge, its start-up and the `action.onClicked` registration are S2b's — do not
build them; build the toggle they will call.

## INPUTS (read them; they bind verbatim)

- Phase doc `docs/plans/2026-10-24-step9-phase-e-safety.md`: Decisions 0.1–0.7 with every dated amendment note
  (lines ~24–300); "### Stage S2" and "#### Stage S2a" (~328–388) with every dated note; exit checks S2.1, S2.2,
  S2.4 with #141's stricter wording (~462–499).
- `docs/decisions.md` rulings #133–#141, #144, #147, #149–#158 (S1's: esp. #150 downloadChunk/End on state
  alone, #151 gone-tab at receipt, #152 target forms, #153 rule 7 unwrapping, #154 downloadStart, #155 network
  filter on own pages, #158 refusal messages), #159–#168 (S3's: what the daemon expects of the extension).
- `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md`: F1, F3–F11, F14, F18, F19, F24, F40–F43,
  the R2-1 NIT (the worker forgets a tab's last URL on close at `sw.ts:116-118` — keep it for the length of a
  call), V3, V6, V7, V17; and `stage0.md`.
- `…-steps/S1.md` §7 Handoff (the wiring guide) and `S1-builder.md` §2 (the full export list). Note: `ownTarget`
  is the only source of `newTab`'s target; `newTab` also accepts `none`, which would skip the URL check — test
  that the wiring never passes `none` for `newTab`. S1's `routerMethodNames(source)` scan misses the
  `router["on"](` and `.on.call(` forms — keep the registrations in `sw.ts` in the plain `router.on("name", …)`
  form so the scan stays meaningful, with the variable named `router`.
- `…-steps/S3.md` §7 Handoff — what the extension must send (the `safetyState` event; hidden rows; `tabRemoved`
  for hidden tabs; `tabCreated.url` `""`; the refusal codes and `data`).
- As-built register `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`; design spec
  `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §5, §6, §10 with dated notes.
- Existing code: `extension/src/{router,sw,offscreen,client,tabs,debugger,download,network-log,network-state,
  network-scope,tab-events,inject,errors}.ts`, `extension/src/handlers/*`, `shared/src/protocol.ts` (S0's
  safety types and the `safetyState` event shape), `extension/src/safety.ts` and `safety-match.ts` (read only).

## GOAL — what to build

Wire S1's pure gate into the extension so that the human's safety state (in `chrome.storage.local`) is
enforced by the extension itself. Everything behaves exactly as today while armed, JavaScript on and an empty
block list — except this extension's own pages and navigation to `chrome-extension://` URLs (#138).

Deliverables (each grounded in the inputs above; the phase doc and rulings decide the details):

1. **Router gate** — every request is gated at receipt before any handler code runs (including the handler's
   synchronous prologue); the state is read per call after `ready` (`storage.local.get`), defaults when absent,
   **fails closed** with S1's `stateUnreadableRefusal()` on a read error (#139); a throw from the gate surfaces as
   `INTERNAL`, never as an allow; refusals via `refusalError(r)`.
2. **`Router.on` throws on a method with no safety class** (S1.1's second half, #147) via S1's
   `methodClass(method)`. **Stage-local design decided by the step agent (record it as a proposed decision):**
   the existing `extension/test/router.test.ts` registers unclassified names (`ping`, `noop`, `boom`, …) and
   must pass unchanged. So keep the current `Router` as the ungated dispatch core, unchanged in behaviour, and add
   the gated router (e.g. `GatedRouter` / `SafeRouter` in `router.ts`) whose `on` throws on an unclassified
   name and whose `handle` gates before dispatch; `sw.ts` constructs only the gated one (variable still named
   `router`). Add a static test that fails if `sw.ts` constructs an ungated `Router` (`new Router(`), shown
   failing on a mutation. If you find this design unworkable, stop and report why instead of editing existing
   tests. Decide (and record) what a disarmed state answers for an unknown method (no handler runs either way).
3. **The sender check** (#139, F19, V6): the worker accepts a `ws-message` only when `sender.url` is this
   extension's `offscreen.html` and `sender.tab` is undefined; anything else is dropped without a log line
   carrying content. Pure predicate + test.
4. **`storage.local.setAccessLevel({accessLevel: "TRUSTED_CONTEXTS"})`** at module scope after every listener
   registration, guarded so it cannot throw synchronously, not awaited (#139, V7). A top-level
   `storage.onChanged` listener (registered synchronously).
5. **State module + toggle** (pure where possible): the in-memory copy (used by the webRequest ingest only) is
   updated **before** the `storage.local` write; #144's rule — a toggle that would re-arm within 1 000 ms of the
   last disarm is ignored, a disarm is never debounced, the options page's switch is not debounced (expose a
   separate setter for it). This is the API S2b's button/shortcut and options page will call: name it, type
   it, document it in your report's Handoff. No wire/daemon/SDK/MCP path may reach it (forbidden fix).
6. **Side-effect checks and the post-check** (#137, V17): before each first side effect (`showTab`,
   `captureVisibleTab`, `tabs.update`/`create`/`remove`, each action's `callInPage` and trusted input) with
   `phase:"effect"`, and `postCheck(...)` before the reply (all but `listTabs`; `newTab`/`closeTab` state only).
   Targets per S1's Handoff: live `{urls:[tab.url, tab.pendingUrl]}`; `gone {lastUrl}` from the tab-info cache,
   which must keep a closed tab's last URL for the length of the call (R2-1 NIT); a replaced tab under its new
   id; `navigate` → `safetyDecisionAll(..., [tabTarget, ownTarget(...)], ...)`; `newTab` → `ownTarget` only;
   `downloadStart` → `ownTarget` then the post-check with `own {url: res.url}` (the final-URL check, #140);
   `downloadChunk`/`downloadEnd` → `none`; network forms per S1. Keep the glue thin; put the decision of which
   target and which phase in pure, tested helpers.
7. **Disarm actions** (#137): a **pure debugger session registry** — `withDebugger` records each session,
   re-checks before attaching (refuses while refused), disarm detaches every recorded session, and an error
   caused by that detach becomes `DISARMED`; worker-side poll loops (`waitFor`, the locator wait) re-check the
   state per tick; at disarm the download store is cleared and a late fetch's entry is released when its reply
   is refused; network recording stops while disarmed.
8. **Network** (0.4's F9 note, #155): ingest drops events while disarmed and for blocked hosts via
   `dropAtIngest(...)`, with a pre-ready buffer (events before the state is known are held, then filtered — not
   recorded blind); queries filter via `keepInQuery(...)`; entries recorded while armed stay.
9. **`listTabs` and tab-event redaction** wired in `sw.ts`/`tab-events.ts` (`redactListTabsRow`,
   `redactTabCreated`, `redactTabRemoved`; hidden rows omit `title`/`url` and carry `hidden`; S3's handoff).
10. **Capture verification** (Stage 0 F11): a capture verifies that the captured tab is the target.
11. **Own-extension-page block** (#138) and the `chrome-extension://` navigation refusal, through S1's gate.
12. **The `safetyState` event**: `{"event":"safetyState","params":{"armed","evaluate","blockedCount"}}`, no `id`,
    sent each time the connection comes up (after the welcome / `ws-status` true) and on every change of any of
    the three fields; never in the hello; `blockedCount` counts valid patterns only; no pattern ever sent. The
    send decision is pure and tested.

## Rules that bind (CLAUDE.md, verbatim in spirit; breaking one is an ESCALATION, not a choice)

No top-level `await` in `sw.ts`; every listener (`webRequest`, `chrome.tabs.on*`, `storage.onChanged`,
`runtime.onMessage`) registered synchronously at the top level; the content script stays an IIFE (you do not
touch `content/**`); `unwrapResult` keeps null-or-undefined = failure; `{__bridgeError}` returned, not thrown;
`toSerializableArgs` for every `executeScript` arg; never log a URL, title, header value, body, pattern or the
token — no new `console.*` line may print any of them; `focusTab` stays the only `windows.update({focused:true})`.
`chrome.*` glue is not unit-tested; pure logic is TDD — **write each failing test first**, run it, see it fail,
then the code. Existing tests pass unchanged; no expected text edited (forbidden fix).

## EXIT CRITERIA (pre-registered; you build the tests that check them)

- **S2.1** a test over the (gated) router with a disarmed state: zero handler calls; also for an unknown method,
  bad JSON and a handler that throws before its first await — the gate's position is before any handler code;
  plus the post-check and the side-effect checks tested.
- **S2.2** the debugger session registry is pure and unit-tested: disarm detaches every recorded session;
  `withDebugger` refuses to attach while refused; a detach-caused error becomes `DISARMED`.
- **S2.4** `grep -c '^import\b' extension/dist/content.js` → 0 and `grep -c '^export\b' extension/dist/content.js`
  → 0 after `npm run build`; a vitest test parses `extension/src/sw.ts` with the TypeScript compiler API and fails
  on any `AwaitExpression` or `for await` whose nearest enclosing function is the source file — show it failing
  on a scratch-copy mutation appending `const st = await chrome.storage.local.get("armed");` (do not leave the
  mutation in); quick check `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` → 0 (1 on the mutation).
- `Router.on` (the gated router's) throws on an unclassified method (test + a mutation shown failing); the sender
  check tested; fail-closed on a state read error tested; the safetyState send tested at the pure level; every
  existing test unchanged; each new test shown failing without its change (say how); `grep` shows no new
  `console.*` line printing a pattern, URL or title (paste the grep of your new `console.` lines).

## Report (`S2a-builder.md`)

Built (files) · test/typecheck/build results pasted with counts (before → after, with the command) · how each
exit criterion is met (test names, mutation commands + outputs) · the toggle API for S2b (names, signatures,
semantics) · Chrome-only facts that need S4 rows, each with the expected text · deviations · proposed decisions
(with alternatives) · anything unfinished. Nothing committed.
