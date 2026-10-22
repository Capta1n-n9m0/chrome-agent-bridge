# T5 — interim report (the autonomous part), 2026-10-22

**Verdict:** the wave package is ready and committed (`e7e56ff`); the main-tree build is done. The
live wave waits for the user's extension reload (G7-2). No row has run; nothing touched Chrome; no
daemon or headless session was started.

## What is ready
- **Rows:** `docs/e2e-test-plan.md` §4.14 — RELOAD-1, RESOLVER-1, LEASE-1…7, SCREEN-1…5, BG-1…4,
  with expected text from the code's own strings and the Stage 0 PASS rules (#48) copied and made
  stricter; cautions B1–B6; the #60 regression / designed-change block (with ACT-8 for G7-1). The
  dated NET-1 note (`12.8 KB`, #56) is on MUX-9.
- **Wave sheet:** `T5-wave-sheet.md` — the order (16 steps), tags (only the reload is [USER]),
  per-actor tool lists, SCREEN-1's flash method (page-side `visibilitychange` timestamps on the
  human's tab; flash = its `visible` − `hidden` time, three runs), the PASS-rule table, the G7-1
  deferrals.
- **Scripts (`recipes/`):** `t5.ts` (one SDK command per row), `t5-actor.ts` (headless sessions kept
  alive between prompts, restricted to named tools), `t5-png.ts`, `t5-win.ps1`; `hello.ts` picks
  `current`. `npx tsc --noEmit -p recipes` exit 0; `npm test` unchanged at 934 / 59 (verifier).
  `t5-png.ts` was checked offline; `t5-actor.ts` and `t5-win.ps1` have **not** run (no Chrome or
  session allowed in this part), so a helper bug found live is fixed as a set-up fix and recorded.
- **Verifier:** `T5-verifier.md` — FAIL (4 MAJOR) → one fix round → PASS-with-notes.

## The build
- `npm run build` in the main tree: **exit 0**, 2026-10-22T19:16:17Z.
- New daemon build id (sha256 of `daemon/dist/index.js`):
  **`ee86adea97f873f43d0001dcbae60f3b10717ffd327dbcdccbf8395fbca2c5c5`**.
- The extension bundle was rebuilt (`extension/dist/{sw,offscreen,options,content}.js`, same
  timestamp), and so was `mcp/dist/index.js`.

## The reload request for the user (send once, verbatim)
> Step 7 is built and the T5 test wave is ready. One thing needs your keyboard: please open
> `chrome://extensions` in Chrome and click the reload button (↻) on **Chrome Agent Bridge**. Nothing
> else — no Options change, no token. Then reply "reloaded". After that I run the whole wave myself in
> Chrome windows I open on the local test page. Note: while it runs, the wave writes the marker
> `t5-bg3` to your clipboard once (row BG-3), and any interactive Claude session of yours that uses the
> bridge needs `/mcp` (its MCP bundle predates this build; the daemon will hand over to the new build).

## The first wave step after the reply
Wave sheet step 0 (pre-flight: clean tree at `e7e56ff`, `Get-DaemonBuild` = the id above, no daemon,
9234 free, driver check, the fixture server with miniconda's Python), then step 1: record the reload
answer as the run's first line, open the driver's window on `…?t5=check`, and run
`npx tsx recipes/t5.ts check` (RELOAD-1). Any `CHECK FAIL` ⇒ the reload did not take: stop and ask again.

## Escalation (for the session agent, decided before the run)
- **T5.2's BG-1/BG-2 retry with `Emulation.setFocusEmulationEnabled` cannot run:** no bridge method
  sends that CDP command (grep of `extension/src`, `sdk/src`, `daemon/src`), and adding one is an
  extension change, which a wave may not make. T5.2 is a pre-registered exit check, so this is
  escalated rather than decided here. As written now, a BG-1/BG-2 FAIL is recorded with its text and
  the line "focus-emulation retry: not run"; the retry returns as a proposed decision ("a CDP
  pass-through or a `focusEmulation` option for trusted input", for Step 8 or a T5 follow-up).
  If BG-1 and BG-2 PASS, nothing is affected.

## Proposed decisions (stage-local)
- **2026-10-22 · T5 runs several rows through SDK scripts, not Claude sessions.** *Decided:*
  SCREEN-2/4 (`mode:"cdp"`), LEASE-3 (`leaseGranted`), LEASE-5 (`TAB_GONE` data), LEASE-6 and the BG
  timing checks run as `recipes/t5.ts` commands. *Why:* the MCP has no `mode`, shows only an error's
  message and does not surface events. *Instead of:* MCP-only rows that could not observe the
  property. *Revisit if:* Step 8 exposes these through the MCP.
- **2026-10-22 · Lease rows use persistent headless actors.** *Decided:* `t5-actor.ts` keeps a
  `claude -p --input-format stream-json` session alive, allowed only its rows' tools. *Why:* a
  one-turn `claude -p` exits and the daemon releases its leases, so LEASE-1/4 could not be observed.
  *Instead of:* chained one-turn sessions with in-turn waits. *Revisit if:* the stream-json host
  fails live (fallback: one-turn sessions with in-turn waits, recorded as a set-up change).
- **2026-10-22 · TAB-3 uses a fixture URL in place of example.com.** *Why:* T5.4, evidence shows
  fixture pages only.

## Deviations
- The step agent wrote the scripts and rows itself and applied the fix round, instead of a builder and a
  fixer: the rows' expected text is the scripts' output, so the design could not be split cleanly. The
  verifier was independent (fresh agent) and re-checked the fixes. The commit was also made by the step
  agent, with an explicit pathspec (`journal.md`, the session agent's, was left out).
- A no-op `python -` command in Git Bash hung on the Windows Store alias and was stopped; it ran nothing.
