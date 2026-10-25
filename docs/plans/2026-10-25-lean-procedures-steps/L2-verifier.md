# L2 verifier report — split CLAUDE.md, archive decisions

Model: Opus 5.5 (verifier). Date 2026-10-25. Commit audited: `3035149`; baseline `817f8b1` (its `CLAUDE.md` is
identical to the plan's `0e79130`). I read the plan (map, stage L2, L.1–L.4), `docs/docs-writing-guide.md`
("Where things live", "Decisions"), the old files and every new file. The builder report was treated as claims.

## 1. Verdict
**FAIL**: two MAJOR findings (F1, F2). Both are small to fix: pointer lines, and removing lines from the Standing
list. The move itself is sound. Every old gotcha body and every decision entry is present once, and Current state
and Architecture are unchanged.

## 2. What I checked (commands and results)
- **Builder proof re-run:** `node docs/plans/2026-10-25-lean-procedures-steps/check-l2.mjs` → exit 0, `RESULT: all
  checks pass`. The output matches the builder report, except that L.4 now counts 23 changed files, because the
  session's uncommitted files are included.
- **Independent gotcha check, comparing bodies:** a Python script (scratchpad `chk/v.py`, not committed) takes all 91
  old gotcha bullets (old lines 278–928) and normalises their whitespace. It strips the `*Superseded/Corrected/
  Updated …*` notes, then searches every one of the 10 new `CLAUDE.md` files for the full body text. Result: **86/91
  bodies are verbatim, in exactly one file**. In the other 5, the only change is a fixed pointer:
  - old line 391: "handover above" → "handover, `daemon/CLAUDE.md`"
  - old line 424: "below" → "in `extension/src/content/CLAUDE.md`"
  - old line 584: "(gotcha above)" → "(`extension/CLAUDE.md`, the `executeScript` bullets)"
  - old line 731: "(Commands)" → "(root `CLAUDE.md`, Commands)"
  - old line 777: one "—" dropped together with its note

  All 5 new pointers resolve: I grepped each target. The 10 "changed" items that `check-l2.mjs` reports are artefacts
  of how it cuts the old text into slices (it also counts the old group sub-headings), not lost content.
- **Key files:** all six old package lists match their new copies once the history notes are removed. The only
  differences are the two notes that my regex missed (old lines 200 and 236), and both are notes. I checked
  `git ls-files` for `{shared,daemon,sdk,mcp}/src`, `extension/src` and `recipes` against all new files. Every file
  the old section named is still named. The files that are not named were not named before either (recipes
  fixtures and tests, `handlers/perceive.ts` under `handlers/*`), so nothing regressed.
- **Root sections:** with history notes stripped, Current state, Architecture, Commands, Testing philosophy and
  Conventions are **identical** to the old text (normalised-text comparison). Every history note is gone except the
  two `*Updated*` notes (F6).
- **Decisions (L.3), independent script (`chk/dec.py`):** the old file has 231 `### ` entries and the new set has
  231. **231/231 appear once, byte-identical**, and no new entry was added. Per-file counts and number ranges match
  the archive index (step6 37, step7 33, step8 58, step9 74, step10 28, decisions.md 1). The removed Open-decisions
  text was struck-through or "None open" only: I grepped the old section for lines without `~~`.
- **L.4:** `git show --stat 3035149` lists `.md` files plus `check-l2.mjs`. No code file changed (F7).
- **`node scripts/doc-check.mjs`:** exit 0. Its output: 1 dead path (`docs/e2e-test-plan.md:1031`, a historical
  note) and 9 planned paths, all from L3/Step 11. The code counts match the docs (tools 23, router methods 26,
  codes 26). Nothing is reported for the `CLAUDE.md` or decisions files.
- **Stale pointers (item 5):** no living doc outside `docs/plans/` records still says "CLAUDE.md Runtime gotchas".
  The `e2e-test-plan.md` pointer is correct.
- **Placement:** about 25 gotchas spot-read across all 10 files, plus a script (`chk/place.py`) that lists every
  gotcha citing code in another package (15 hits). Results under F1.

## 3. Findings

**F1 — MAJOR — some gotchas about SDK code and extension code sit only in `daemon/CLAUDE.md`, and nothing points to
them.** The mcp file shows how to do it right: it ends with a pointer to the no-crash rule in `daemon/` and the
`newTab` rule in `handlers/`. `sdk/CLAUDE.md` and `extension/CLAUDE.md` have no such pointers for these:
- `daemon/CLAUDE.md:96–100`, "`ws` emits several frames from one TCP read": the bug and its fix ("unsubscribe
  inside the listener's own callback") are in the **SDK knock** ("the knock lost an `extensionStatus` … `connect()`
  waited 15 s").
- `daemon/CLAUDE.md:35–46`, "The daemon outlives the session": the spawn is in `sdk/src/spawn.ts`. The rules
  "handover once per `connect()`, then `VERSION`" and "10 s knock budget per spawn cycle" are in `sdk/src/knock.ts`.
- `daemon/CLAUDE.md:53–57`, "A pre-Step-6 server …": `WELCOME_TIMEOUT_MS` is in `sdk/src/knock.ts`.
- `daemon/CLAUDE.md:58–62`, "Every client must agree on `BRIDGE_PORT`" and `BRIDGE_DAEMON`: the code is in
  `sdk/src/paths.ts`.
- `daemon/CLAUDE.md:63–70`, the `Start-Process` gotcha: it covers `spawnDaemon` and `sdk/test/spawn-inherit.test.ts`.
- `daemon/CLAUDE.md:122–136`, "The session marker retires every handle": half of it describes
  `extension/src/session-marker.ts` (the 2 s bound, and "a reload's hello comes up to 2 s later"). There is no
  pointer from `extension/CLAUDE.md`.
- Lesser cases:
  - "`ws` is `external` in the daemon and MCP bundles" binds `mcp/build.mjs`, and `mcp/CLAUDE.md` has no pointer.
  - "The call timeout is per-call" (`sdk/`) binds the daemon's `route.ts` bounds, and `daemon/CLAUDE.md` has no
    pointer.

Evidence: `grep -n "CLAUDE.md" sdk/CLAUDE.md extension/CLAUDE.md` finds no pointer to `daemon/CLAUDE.md`. The probe
(plan, "Probe") loads `daemon/CLAUDE.md` only when a file under `daemon/` is opened, so an agent that edits
`sdk/src/knock.ts` would never see the swallowed-frames fact. The builder followed the plan's map ("lifecycle,
detached spawn, pre-Step-6 server, `BRIDGE_PORT`, `ws` frames" → daemon), so the defect is in the map. It still
defeats the stage's purpose. **Fix:** add closing pointer lines like the mcp file's:
- in `sdk/CLAUDE.md`: knock/spawn/handover/welcome timeout/`ws` frames/ports → `daemon/CLAUDE.md`, naming the
  bullets
- in `extension/CLAUDE.md`: session marker → `daemon/CLAUDE.md`
- in `mcp/CLAUDE.md`: `ws` external → `daemon/CLAUDE.md`
- in `daemon/CLAUDE.md`: call timeout → `sdk/CLAUDE.md`

The other option is to move the `ws`-frames bullet into `sdk/` outright.

**F2 — MAJOR — the Standing list names Chrome-restart grants as standing, one of them against its own text.**
`docs/decisions.md`, "How we work", lists two grants:
- **#222**, "The user widens Step 10's grants: unlimited Chrome restarts …". Its entry says "**Revisit if:** … Step
  10 closes (**not standing beyond this step**)".
- **#98**, "The user allows unlimited Chrome restarts …". This is a Step 8 wave grant that amended #96 and the phase
  doc's STOP rule.

`docs/agent-rules.md` §3 item 2 makes any Chrome restart a human gate "unless the kickoff grants it". A reader of
the Standing list sees only titles, so these lines would look like a standing grant. **Fix:** remove #222 and #98.
For #64, keep only what still holds (the UI-automation reload is #65, already listed) and drop the Step 7 restart
grant.

**F3 — MINOR — superseded or purely historical lines in the Standing list** (from reading the entries):
- #1: Steps 6–8 under the long-run contract. The steps are closed, and #230 and `agent-rules.md` replace it.
- #18: "optional wire code". #73 made `code` required.
- #54: a numeric network `tab` as a legacy id. The entry itself says Step 8 S2 removes it ("Revisit if: Step 8 S2
  lands").
- #14: a measurement plan for D6 MUX-7, not a rule.
- #213: Run 14's mechanics "kept for Run 15", which is wave-specific. Its lasting parts are in `agent-rules.md` and
  `recipes/CLAUDE.md`.
- #64: see F2.
- Borderline, for the cleanup pass: #97 (written for the S6 wave), #223 (one row's helper), #158/#164 (refusal
  wording, partly changed by #219), #229/#202 (closing rulings; they ratify what is already listed).

**Fix:** drop the clear cases and leave the borderline ones as "(check)".

**F4 — MINOR — a decision that still governs is missing from the Standing list.** #129, "The roadmap after Step 8",
is the decision the root Current state cites for **Next** ("order open for veto"). The roadmap is not in the list.
#226 is also missing. Its item 3 (no lease for a popup of a background opener is "the user's call") is cited in the
root and in `daemon/CLAUDE.md` as a carried limit. **Fix:** add #129, and probably #226.

**F5 — MINOR — the probe does not cover the three-level nesting.** The probe (plan, "Probe") tested only
`extension/a.ts` → `extension/CLAUDE.md`. L2 also created `extension/src/{content,evaluate,handlers}/CLAUDE.md`. The
design depends on opening `extension/src/content/a11y.ts` loading **both** `extension/CLAUDE.md` and the content
file, and that was not measured. **Fix:** add this case to the Windows repeat of the probe (the Step 11 kickoff's
first check).

**F6 — NIT — two history markers remain:** `daemon/CLAUDE.md:67` and `recipes/CLAUDE.md:72` still read
`*Updated 2026-10-24: …*`. The builder report and `claude-md-history.md` say "only the marker went", which is not
true. `scripts/doc-check.mjs:101` matches only `Superseded|Corrected`, so it misses these. **Fix:** drop the marker
words, keep the measurement, and add `Updated` to the doc-check regex.

**F7 — NIT — L.4 and the checker.**
- L.4 allows only `.md` files and `scripts/doc-check.mjs`. The commit also adds `check-l2.mjs`. It is a proof script
  in the steps dir, not product code, so I accept it, but the report should state it as a deviation.
- `check-l2.mjs`'s 2% six-word-run test raised 10 false alarms. That makes it a weak gate on body text, and the
  builder had to explain each alarm by hand.

**F8 — NIT — group sub-headings dropped.** The old file had five bold group headings, such as "Step 7 — tabs, leases,
the lock (…; reports in `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/`)". They were removed. Their pointers
to report directories are gone, which is acceptable as history and is not mentioned in `claude-md-history.md`.

**F9 — NIT — word budgets.** `extension/CLAUDE.md` has 3,499 words against a budget of 3,500 (`wc -w`). The root has
189 lines, against the plan's goal of about 150–180 lines; its 2,170 words are within the 3,000-word budget. L4
should trim `extension/`.

## 4. Root invariants against the package files
I checked all 8 invariants against their target files:
- bind/lock → `daemon` bind bullet
- log rule → `extension` "Never log a URL" and safety logging
- gate → `extension` Safety gate
- new method in both tables → `extension:202–208` and `daemon` `methods.ts`
- handles and `tab` required → `daemon` (two bullets)
- 100 MiB → `daemon:106–111`
- testing → root Testing philosophy
- token → Conventions

The three cross-package gotchas in the root (reload, typecheck `&&`, junction) are verbatim apart from one pointer
fix. Putting them in the root is right.

## 5. Proposed decisions
None. All fixes are mechanical or design-local, and the session agent applies them (agent-rules §5).

## 6. Handoff
Fix round: F1 and F2 (needed for PASS), then F3, F4 and F6 if wanted. The re-check covers only the edited lines
and the Standing list. F5 goes into the Windows probe at the Step 11 kickoff. Evidence scripts are outside the repo
(scratchpad `chk/v.py`, `chk/dec.py`, `chk/place.py`) and run read-only against `git show 817f8b1:…` and the working
tree.
