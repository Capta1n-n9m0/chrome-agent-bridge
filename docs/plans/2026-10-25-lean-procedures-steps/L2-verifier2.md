# L2 verifier report, round 2: re-check after fixer round 1

Model: Opus 5.5 (verifier). Date 2026-10-25. Commit audited: `bcb9b09` (HEAD, "docs: lean procedures L2 — fixer round 1 …");
baseline `817f8b1`. Scope: only the items the fixer touched (F1, F2/F3/F4, F6, F9), plus a re-run of L.1/L.3 and
`doc-check`. Read: plan stage L2 and L.1–L.4, `docs/docs-writing-guide.md` ("Where things live", "Decisions"),
`L2-verifier.md`, `L2-fixer1.md` (claims), `git show HEAD`, the decision entries named below, and the extension code
the moved bullets describe.

## 1. Verdict
**FAIL**: one MAJOR finding (R1). Two of the four bullets moved for F9 describe the safety gate's code
(`extension/src/safety-call.ts`, `extension/src/safety.ts`), not handler code. An agent editing those files loads
`extension/CLAUDE.md` only. The fix is small: move the two bullets back into its Safety gate section
(+134 words → 3,323, under the 3,500 budget). Everything else the fixer did holds.

## 2. What I checked (commands and results)
- `node docs/plans/2026-10-25-lean-procedures-steps/check-l2.mjs` → exit 0. Output: `headlines found in exactly one file,
  once: 91/91` (handlers file 7), `history notes left in CLAUDE.md files: 0`, `entries present once, text identical:
  231/231`, `Standing decisions: 102 lines; each names an existing entry in its file: 102/102`, `RESULT: all checks pass`.
  L.4 lists `check-l2.mjs` (accepted in round 1, F7) and the untracked `start-bridge-linux.sh` (not part of this stage).
- `node scripts/doc-check.mjs` → exit 0. It reports 1 dead path (`docs/e2e-test-plan.md:1031`, historical) and 9 planned
  paths (L3/Step 11). Counts: tools 23, router methods 26, codes 26. **Nothing for any `CLAUDE.md` or decisions file**;
  no file is over budget.
- **The moved bullets' text against `817f8b1`** (normalised whitespace, Python, scratchpad): `screenshot cdp`,
  `navigate`/`newTab` URL gate and `javascript:` are verbatim. In "not a network firewall", the only change is the
  `*Superseded 2026-10-25 …*` note that L2 already removed.
- **F6 numbers** (old vs new segment): `Start-Process` bullet lost only the `2026-10-24` marker date; the reload bullet
  in `recipes/` lost nothing.
- `wc -w`: `extension/CLAUDE.md` 3,189; `extension/src/handlers/CLAUDE.md` 590. The budget is 3,500 per package file
  (plan line 59). The plan sets no 3,200 target: that figure is the fixer's own.

## 3. Per item

**F1: PASS.** Every new pointer resolves to the bullet it names:
- `sdk/CLAUDE.md:66` → `daemon/CLAUDE.md` bullets at lines 35 (outlives the session; handover and 10 s knock budget
  inside it), 54 (pre-Step-6, `WELCOME_TIMEOUT_MS`), 59 (`BRIDGE_PORT`/`BRIDGE_DAEMON`), 64 (`Start-Process`), and
  72 (`ws` frames).
- `extension/CLAUDE.md:244` → `daemon/CLAUDE.md:115` (the session marker, its 2 s bound and handle retirement).
- `mcp/CLAUDE.md:54` → `daemon/CLAUDE.md:88` (`ws` external, names `mcp/build.mjs`).
- `daemon/CLAUDE.md:140` → `sdk/CLAUDE.md:30` (the per-call timeout, `route.ts`).

**F2/F3/F4: PASS.** I read every borderline entry and agree with each call:
- Removed:
  - #222: "not standing beyond this step".
  - #98 and #64: wave grants. #64's reload part lives on as #65, which is listed.
  - #97: S6 wave probe, spent.
  - #223: one wave's helper. Its rule is in `recipes/CLAUDE.md:108`, so nothing is lost.
  - #213, #1, #14, #18 (#73 made `code` required) and #54 (its Revisit-if, Step 8 S2, has landed).
- Kept:
  - #158 without "(check)": the no-URL/pattern/title/id promise stands.
  - #164 with "(check)": #219 kept the text byte for byte but changed the code to `JS_DISABLED`, so a check is right.
  - #202 and #229: they hold rulings listed nowhere else.
- Added:
  - #129: cited by root Current state for the veto.
  - #226: item 3, the popup-lease limit.

**F6: PASS.** Both `*Updated …*` markers are gone and every measured number is kept. `check-l2.mjs` now counts `Updated`.
`scripts/doc-check.mjs:101` at HEAD still matches only `Superseded|Corrected`. The working tree carries an
uncommitted session edit that adds `Updated|Note`. That edit is not the fixer's, and it still needs committing (R4).

**F9: FAIL (R1).** Where each moved bullet's code lives:

| Bullet | Code it binds | Placement |
|---|---|---|
| `screenshot {mode:"cdp"}` refuses | `handlers/perceive.ts:32` calls `cdpCaptureRefusal` (defined `tabs.ts:94`) | acceptable (R2) |
| `navigate`/`newTab` gated on the URL Chrome will open | `safety-call.ts:145` `resolveOpenUrl`, `:160` `openTarget`; `handlers/navigate.ts` has no URL logic, only `chrome.tabs.update` | **wrong** (R1) |
| Chrome refuses `javascript:` | first half: Chrome at `navigate.ts`'s `tabs.update`; second half: the gate's `SCRIPT_SCHEMES` (`safety.ts:232`, #138) and `JS_DISABLED` | **wrong**: mainly a gate fact (R1) |
| block list is not a network firewall | `handlers/download.ts:23–43` (`checkFinalUrl(res.url)`; its docstring states the same fact); `navigate`'s post-check is `safety.ts:327` | acceptable (R3) |

## 4. Findings

**R1 — MAJOR — two safety-gate bullets moved out of reach of the gate's code.**
`extension/src/handlers/CLAUDE.md:28–37`.
- The URL-gate bullet records the reason `resolveOpenUrl` exists: S2a's round-1 CRITICAL, #175, measured SAFE-REL-1/3.
  The `javascript:` bullet records the gate's JavaScript-off scheme refusal and Chrome's own backstop.
- Both bind `extension/src/safety-call.ts` and `safety.ts`. Those are top-level files, so editing them loads only
  `extension/CLAUDE.md`. Its Safety gate section (line 194 on) has no pointer.
- The index line (`extension/CLAUDE.md:7`) names "the URL gate on navigate/newTab" under `src/handlers/`. That
  wrongly suggests the gate lives in handlers, and it does not name the `javascript:` bullet at all.
- At `3035149` both bullets were in `extension/CLAUDE.md`, so this is a coverage regression on the security boundary.
- Evidence: `grep -n "resolveOpenUrl\|SCRIPT_SCHEMES" extension/src/*.ts extension/src/handlers/*.ts` →
  `safety-call.ts:145,163` and `safety.ts:232` only. `sed -n 1,20p extension/src/handlers/navigate.ts` shows no URL handling.

**Fix (cleanest):**
- Move both bullets back verbatim into `extension/CLAUDE.md` "### Safety gate (Step 9)", after the matcher bullet.
- Drop "the URL gate on `navigate`/`newTab`" from the index line.
- `extension/CLAUDE.md` then has 3,323 words (3,189 + 134), under the 3,500 budget. No further move is needed.
- A sub-folder file for the gate is not possible, because `safety*.ts` are top-level files.
- If L4 later wants room, move only bullets whose code sits under a sub-folder. Otherwise
  `extension/src/safety*.ts` and `tabs.ts` would have to move into `src/safety/` and `src/capture/`. That is a code
  refactor outside L2's docs-only lane (L.4), so it belongs to a later stage, not here.

**R2 — NIT — the CDP screenshot bullet sits apart from its capture siblings.** The refusal is decided in
`handlers/perceive.ts`, and the index line and the `tabs.ts` key-files entry (`extension/CLAUDE.md:18`, naming
`cdpCaptureRefusal`) point to it. It is acceptable where it is. Moving it back (+~90 words → ~3,410) would also fit, if
the step agent prefers to keep the whole capture group together.

**R3 — NIT — the firewall bullet is handler-first, but its last line is a gate-coverage fact** ("A cross-origin frame
of a blocked host shows in screenshots", stage0-audit F16). It is acceptable in handlers. Optionally, the Safety gate
section could carry a one-line pointer: "redirect hops and cross-origin frames: `src/handlers/CLAUDE.md`".

**R4 — NIT — the `doc-check.mjs` regex fix is uncommitted.** HEAD's `scripts/doc-check.mjs:101` lacks `Updated`. The
working-tree diff adds `Updated|Note`. The session agent should commit it with the next fix round.

**R5 — NIT — the SDK pointer does not name `daemon/CLAUDE.md:48`** ("On Windows `spawn(…, {detached:true})` keeps the
child in the parent's process tree"). That bullet concerns `sdk/src/spawn.ts`. The pointer's "the daemon outliving its
session" loosely covers it; naming it costs a few words.

## 5. Proposed decisions
None. R1 is a mechanical placement fix within L2's lane.

## 6. Handoff
Fix round 2: R1 (needed for PASS), then optionally R2–R5. Re-check only `extension/CLAUDE.md` (Safety gate, index
line, `wc -w`), `extension/src/handlers/CLAUDE.md`, and `check-l2.mjs` (91/91 still in exactly one file). Evidence
scripts were run read-only, from the scratchpad, against `git show 817f8b1:CLAUDE.md` and HEAD. No repo file was
edited except this report.
