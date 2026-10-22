# T1 verifier brief (written by the T1 step agent, 2026-10-22)

You are the INDEPENDENT VERIFIER for Step 7 stage T1 ("Extension: tabId, codes, events") of
chrome-agent-bridge. Model: Claude Opus 5.5. Level-2: do NOT spawn agents; finish in one go. You may
read and run; you may NOT edit any file in the main tree (except writing your own output file below).

## Preamble (role-prompts.md, verbatim)
Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push; never touch the
user's real Chrome profile (no extension reload, no live browsing) unless your brief grants
it; never log URLs, header values or bodies from extension code. Report in the exact format
requested. Never invent results — if something did not run, say so.

## Binding reading
- `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/briefs/common.md` IN FULL (SPEC-DISCREPANCY
  PROTOCOL, INTEGRITY FLOOR, forbidden fixes, LESSONS, PARALLEL-STAGE RULES). Node PATH line:
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.
- The builder's brief `briefs/T1-builder.md` (what was asked) and the builder's report
  `T1-builder-report.md` — **claims to audit, not facts**.
- Phase doc `docs/plans/2026-10-21-step7-multi-actor-tabs.md`: Stage T1, decisions 0.1 and 0.6,
  exit checks T1.1–T1.7 with the Sharpened notes; spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
  §5, §6.2, §10; Stage 0 audit F1 F3 F4 F6 F8 F16 F17 F18 F21 F29 F30 F33; decisions.md #38 #42 #43
  #48 #50 #52 #54; `T0.md` § Handoff.

## Where to run (parallel-stage rules)
T2 is editing `daemon/` in the main tree; never build or run the full suite there. Instead:
1. `git worktree add <scratch>/t1-verify 9322f24` (scratch = your scratchpad dir; HEAD is 9322f24).
2. In it: `git apply --binary <patch>` with the T1 lane patch at
   `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad\T1-lane.patch`
   (extension/ + test-fixtures/e2e-playground.html only). Confirm with `git status` that it touches
   nothing else, and diff a few files against the main tree's working copies to confirm the patch is
   the builder's current tree.
3. `npm ci`, then `npm run typecheck`, `npm test` (full suite; baseline 600 passed / 43 files at
   9322f24 — measure it too in a second worktree or by `git stash` in yours), `npm run build` (the
   worktree's dist only). Paste tails with counts.
4. Remove the worktree(s) at the end (`git worktree remove --force`), and say so.

## What to check (at least)
- Every exit check T1.1–T1.7 executed literally (paste command + output), including both sharpened
  greps of T1.4/T1.5 and that the fallback warning prints only the method name. T1.6: deferred to T5
  (user away) — confirm the report/ledger say so; not a FAIL.
- Extra criteria: new tests fail with the change reverted (re-do it yourself: revert src files to
  9322f24 keeping the new tests, and also try targeted mutations — e.g. unwrapResult accepting
  undefined, splitCoded not splitting, describeDebuggerError code swap, hello without proto,
  eventFrame with an id, resolveNetworkScope ignoring `scope`); report which mutations survive. The
  builder admits the targetTab/resolveNetworkScope tests only fail at import on a full revert — check
  that a behavioural mutation of each is caught.
- `unwrapResult`: null, undefined, missing frame → `REF_STALE` with the unchanged text (CLAUDE.md
  invariant). A page function that THROWS still maps to REF_STALE; one that returns the marker maps
  to its code (F1's verifier note).
- Every pre-existing user-visible message text byte-identical (diff the old and new string literals
  in every touched src file); every edited pre-existing test assertion changes only access path or
  adds `code` — never message text (forbidden fix).
- E2E texts that must hold: EVAL-5 `[chrome.debugger] Error: boom`, DL-2 `[chrome.debugger]
  TypeError: Failed to fetch` (trace `withDebugger` + `shapeEvaluateResult` + `describeDebuggerError`
  for a page exception and for a raceTimeout).
- Codes used are only the 22 in `shared/src/codes.ts`; `shared/` untouched.
- Content bundle (worktree build) is IIFE with no `import`/`export`; no top-level `await` in sw.ts
  (source and bundle); the four `chrome.tabs.on*.addListener(` lines at column 1; the network log's
  original `onRemoved` listener is still there.
- No `console.*` in extension/src prints a URL, title, `err` objects that may carry Chrome's raw text
  with a URL, header values or bodies.
- Event frames: no `id`, no `null`, pass T0's guards; `url: pendingUrl ?? url ?? ""`; `openerTabId`
  only when defined; `tabRemoved` carries lastUrl/lastTitle from the cache; cache fill does not
  overwrite live entries.
- hello `{type:"hello", token, role:"extension", proto:2}` — accepted by the Step 6 daemon's
  `isHello`/handshake in `daemon/src` AT 9322f24 (read it, or run a port-0 test in the worktree).
- `targetTab` semantics against 0.1/F17/F18/F4: non-integer `tabId` → BAD_PARAMS; "No tab with id" →
  TAB_UNKNOWN (0.1; the builder deliberately did not follow F21's TAB_GONE — judge it); string `tab`
  without tabId → BAD_PARAMS; closeTab/selectTab with neither → BAD_PARAMS, never the active tab;
  discarded refused on page paths only; `humansTab` call has no lowercase `focused` key; the
  NO_NORMAL_WINDOW text was moved to `errors.ts` so `grep focused extension/src/tabs.ts` is empty —
  judge whether that keeps T3.3's intent or games it (report as a finding with your ruling suggestion).
- Network scope (#52/#54): `tabId` integer → that tab without `chrome.tabs.get`; `scope:"all"` → all;
  legacy `tab` ("all"/"active"/integer/absent) as before; tests for the three forms.
- The viewport-screenshot refusal for an explicit background `tabId`: correct and only when `tabId` is
  given.
- The fixture: `_blank` link points at a fixture page (relative), file is LF, its new size, and the
  consequence for NET-1's `12.6 KB` (report as a finding; do not decide).
- Anything the builder did outside the lane or left unfinished.

## Output
Write `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T1-verifier.md`: numbered findings, each
with severity (CRITICAL / MAJOR / MINOR / NIT), `file:line`, evidence (command + output excerpt),
suggested fix; an exit-check table; mutation table; then the verdict: **FAIL** if any CRITICAL or
MAJOR finding or any exit check fails; MINOR/NIT only → **PASS-with-notes**; else **PASS**. Return a
≤ 25-line summary with the verdict as your final message.
