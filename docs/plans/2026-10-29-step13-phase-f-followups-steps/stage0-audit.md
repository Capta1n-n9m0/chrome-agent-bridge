# Step 13 — Stage 0 audit body (auditor 1's half: G1, counts, Run 20, process)

Start commit `ff121a4`. Scope: phase doc § Decisions 0.1, 0.2, 0.7, 0.8, 0.9; stages S1, S5, S6; every exit check;
proposals #375, #376, #381, #382, #383. Auditor 2 holds 0.3–0.6 and #377–#380 (not repeated here). Model: Opus, medium.
Every number below comes from a command whose output is in an evidence file beside this one (`stage0-a1-*.txt`).

## 1. Counts at ff121a4

| Count | Recomputed | Command (evidence) | Phase doc | Root `CLAUDE.md` |
|---|---|---|---|---|
| Tools | **25** | `grep -cE '^    "browser_[a-z_]+",$' mcp/src/tools/registry.ts` (`stage0-a1-counts.txt`) | 25 | 25 |
| Router methods (`router.on` in `sw.ts`) | **28** | `grep -c '^router.on(' extension/src/sw.ts` | 28 | 28 |
| `METHOD_CLASSES` entries | **28** | `extension/src/safety.ts:67-98` | (28) | 28 |
| Daemon tables | **28** = `TAB_METHODS` 21 + `FREE_METHODS` 4 + `newTab`/`closeTab`/`listTabs` by name | `daemon/src/methods.ts:12-42`, `classify` | — | — |
| Codes | **27**: daemon 9 + extension 17 = **26 on the wire**, SDK-only 1 (`NO_CURSOR`) | `shared/src/codes.ts` (script `codes.cjs`, output in `stage0-a1-counts.txt`) | 27 (26) | 27 (26) |
| `npm test` | **5596 passed, 235 files, exit 0** (109 s) | `npm test` (`stage0-a1-npm-test.txt`) | not stated | 5596 / 235 |
| Log sites | **54** (extension 15, daemon 33, mcp 6, sdk 0) | `grep -cE '^\s*\{ file: ' extension/test/log-allowlist.ts` + section headers | not stated | 54 (`extension/CLAUDE.md`) |
| `doc-check` | `tools: 25 · router methods: 28 · codes: 27`; one stated test count `CLAUDE.md:110 5596 passed`; no other section printed | `node scripts/doc-check.mjs` (`stage0-a1-doc-check.txt`) | — | — |

All agree. One stale count in code: `mcp/src/tools/registry.ts:294` "Registers the 24 tools" (25 since Step 12 S3b) — NIT,
code-side, not in any stage's lane.

## 2. Citations in scope (file:line at ff121a4; `stage0-a1-citations.txt`)

| Phase doc cites | Found | Status |
|---|---|---|
| 0.2 "the daemon rule (`daemon/src/intercept.ts`)" | `applyOpener` `intercept.ts:349-358`; called from the `tabCreated` branch `:319-327`; the grant is immediate (F20 comment `:324`) | ok |
| 0.7 "`.then(release)`" | `intercept.ts:577` `if (pause > 0) void this.sleep(pause).then(release);` | ok; the stated consequence is wrong (F-5) |
| S1 lane `extension/src/tab-events.ts` | `tabCreatedParams` `:136-143`, `TabLike.openerTabId` `:23` | ok |
| 0.2 "one top-level listener in `extension/src/sw.ts`" | today's tab listeners `sw.ts:221` (onCreated), `:228`, `:232`, `:237`; `setAccessLevel` `:449` must stay after the last top-level `addListener` (`extension/test/sw-static.test.ts:178-181`) | ok; constraint not named (F-11) |
| S1 lane `shared/src/protocol.ts` | `ExtensionEventName` `:92`, `TabCreatedParams` `:104`, `isTabCreatedEvent` `:234-236` (extra keys allowed; unknown events fall through silently in `intercept.ts:313-342`) | ok |
| 0.2 manifest | `extension/manifest.json:8`, 9 permissions, no `webNavigation` | ok |
| 0.2 "`extension/test/manifest.test.ts` pins it" | pins exactly `[...BEFORE, ADDED_11B]` twice (`:37`, `:51`) and `added === [ADDED_11B]` (`:39`): S1 must edit these existing assertions | ok; conflicts with "every existing test unchanged" unless listed (F-10) |
| 0.2 "Stage0.md §6 'S6-G1 draft'" | `docs/plans/2026-10-27-step12-phase-f-steps/Stage0.md:233-242`; fact row `:93`; decision `:183-186` | ok |
| 0.2 "#337 … 15 of 15" | `Stage0.md:93`: `sourceTabId` = real opener 15/15 **while `openerTabId` = the active tab 15/15** (`stage0-m2-passrules.txt:78-85`) | ok; the second half is unused by the plan (F-1) |
| 0.2 "#226 item (3)" | `decisions-archive/step10.md:55` | ok |
| 0.2 "`docs/e2e-test-plan.md` (the extension set-up)" | §1 item 5 `docs/e2e-test-plan.md:44` ("Load the extension"); no permission list there | ok; name the item (NIT) |
| 0.2 `docs/setup.md` "load and upgrade steps" | upgrade notes `docs/setup.md:96-102` (Step 11b's permission note is the model), load `:121` | ok |
| 0.8 "Step 12 phase doc § Follow-ups, the bullet citing #373" | `docs/plans/2026-10-27-step12-phase-f.md:679` | ok |
| 0.8 "#369", "#370", "#361" | `decisions-archive/step12.md` (#374 item 3; `extension/src/CLAUDE.md` chooser bullet for #370) | ok |
| 0.8 "`S7-run-record.md` §6 #373's second proposal" | `S7-run-record.md:242-247` | ok; but see F-8 |
| S1 "Spec §10 note first" | the opener rule's normative text is spec **§6.2** (`…multi-actor-design.md:205-211`, corrected notes `:213-232`) and §6.3 (`:237-239`); §10 holds the event table (`:571`) | incomplete (F-12) |
| D6.1 "`doc-check` shows … no unnumbered decision" | `scripts/doc-check.mjs:4` "Reports, never fails"; section 5 (`:121`) is "decision numbers cited but not recorded" — no "unnumbered decision" check exists | wrong (F-13) |
| Stage 0 "#374 … Run 19 42/4/6/3/3" (root `CLAUDE.md`) vs #373 "5 FAIL, 5 ND" | both true: #374's tally (`step12.md:29`) applies item 4 (ARGS-1 → ND) | ok; affects 0.8's wording (F-9) |

## 3. Findings (ranked; tag; evidence)

**F-1 CRITICAL, plan-side (0.2, #376; code-side today).** The fallback "`sourceTabId` when present, else today's
`openerTabId`" and the late-event option both lease a background opener's popup to **the holder of the window's active
tab**. Evidence: `Stage0.md:93` (`openerTabId` = the active tab 15/15 with the opener behind) and `intercept.ts:353-356`
(grants to whoever holds `openerTabId`'s handle). Today, if client B holds the active tab H and client A's background tab
opens a popup, B gets it (not measured live: R15-POP-2 (b) had one actor). Under the late event, `tabCreated` grants B at
once and the late `tabOpener` finds the tab leased ("grants on arrival if still unleased") — B keeps it. This is the
phase's own STOP line ("a popup leased to a client that does not hold its source tab"). Fix: the field option only; the
extension sends `sourceTabId` when joined, and the daemon must be able to tell "new extension, no navigation target" from
"old extension": a hello feature (e.g. `"openerSource"`) with the rule *with the feature, grant only from `sourceTabId`
(absent → no grant); without it, today's rule*. That is a contract change (hello features, §10 note) — for user review.
Add a test (B holds the active tab; A's background tab's popup → not B) and a live leg in R20-POP-OTHER.

**F-2 MAJOR, plan-side (0.2).** Holding `tabCreated` for the join changes the foreground case, which 0.2 says is
"unchanged". Today the grant is immediate (`intercept.ts:324`; `daemon/CLAUDE.md`: another client refused `TAB_HELD` 44 ms
after the click, Run 9). During a hold, a `listTabs` mints the popup's handle (`intercept.ts` `record`, `handles.mint(t.id)`
at `:655`) and another client may `tabs.claim` it; `applyOpener` then grants nothing (`:352`). Pre-register: hold only a
`tabCreated` that carries `openerTabId` (other tabs never wait); the bound from Stage 0's measured spread; a test of a
claim inside the hold; R20-POP-FG times the grant against Run 15's 150 ms (R15-POP-2 (a)).

**F-3 MAJOR, plan-side (0.1, #375).** "S2, S3b and S4 touch disjoint files" is false: S1's lane and S4's 0.7 part both
edit `daemon/src/intercept.ts` (phase doc S1 and S4 lanes). Also, parallel stages in one main tree break the per-stage exit
checks ("`git status --short` clean of tracked changes after the build", "`npm test` = before + n") and the
`&&`-chained typecheck (root `CLAUDE.md` gotcha). Fix: 0.7 runs after S1's commit (or inside S1), and any parallel stage
works in its own worktree with its own `npm ci` (root `CLAUDE.md`, the junction gotcha), else run sequentially.

**F-4 MAJOR, plan-side (0.8, #382).** R20-DEVT-UNDOCK / -EARLY need "a control that proves DevTools is attached", but Run 19's
only such control is the bridge's own refusal (`recipes/s12-forms-b.ts:12` "`attached` comes ONLY from the answer code of the
control call"). A control that equals the measured outcome cannot discriminate: if neither condition refuses, the rows are
NOT MEASURED a third time. Stage 0's measurer must name an independent signal (e.g. a UIA read of the DevTools window or
docked pane on the fixture tab, or a page-side `debugger;` statement that pauses only under DevTools) before S5-sheet.

**F-5 MAJOR, plan-side (0.7, #381).** The rationale is wrong: a rejected settle `sleep` does not "hold the lock until
disconnect". `void this.sleep(pause).then(release)` (`intercept.ts:577`) leaves an unhandled rejection, and the daemon's
`unhandledRejection` handler is `fatal` → exit 1 (`daemon/src/main.ts:112-117`). In production `sleep` is never injected
(`grep sleep daemon/src/main.ts daemon/src/index.ts` empty; only `wsHost.ts:47,149` passes the option, for tests), and the
default `setTimeout` promise never rejects. The fix is still cheap and right (`.then(release, release)`), but T4.2 must
assert both the lock released (a second `acquire` succeeds) and no unhandled rejection; the risk is test-only.

**F-6 MAJOR, plan-side (S1 sizing, cap 350).** The draft estimate was ~110 code / 195 tests = ~305 (`Stage0.md` §6 table,
S6-G1 row) before F-1/F-2/F-7's tests; with them, ~400–450. Split: **S1a** (spec notes, `protocol.ts` field + guard,
`daemon/src/intercept.ts` rule, hello feature if ruled; pure; cap 300) → **S1b** (`tab-events.ts` pure join with injected
clock, the `sw.ts` listener, manifest + its test, the two doc lines; cap 300).

**F-7 MAJOR, plan-side (S1 draft tests).** The draft's tests miss: both arrival orders; a tab with no navigation target
(human `Ctrl+T`, a bridge `newTab`) is never held; the join map bounded in size and time and keyed by the new tab's id;
the source tab closed or never handled before the join → no grant; a popup of a popup (source held by the opener rule);
the F20 `newTab`-in-flight path with a joined `sourceTabId` (`daemon/test/tabs.test.ts:396-460` are the models); a static
test that the listener reads only `tabId`/`sourceTabId` (the URL STOP line). Full list in §4.

**F-8 MINOR, plan-side (0.8).** #373's CON-NOTEA legs (`S7-run-record.md:242-247`: an object logged **after** the read starts,
with an allowed host and with a blocked host's frame, reaching #344 (3)'s cut path) are measurable on today's code; 0.8
runs the blocked-frame leg "if S3a is built" only. Make the live-log legs unconditional.

**F-9 MINOR, plan-side (0.8).** "R20-ARGS-ORDER … re-measures R19-ARGS-1": #374 item 4 ruled ARGS-1's clause covers what the
page **receives**, so ARGS-1 is ND on that clause and the returned order is a new behaviour. Write ARGS-ORDER as a new row
that names ARGS-1 as related, and keep a receive-side leg if ARGS-1 is to be re-measured.

**F-10 MINOR, plan-side (exit checks).** "Every existing test passes unchanged" (S1 verifier focus) cannot hold for
`extension/test/manifest.test.ts:37-39,51`; the per-stage rule allows listed changes — list this file in S1's brief.

**F-11 MINOR, code-side (S1).** The new `webNavigation` listener must sit before `setAccessLevel` (`sw.ts:449`;
`sw-static.test.ts:178-181`) and at top level; name it in the brief.

**F-12 MINOR, plan-side (S1).** The spec note belongs in §6.2/§6.3 (the opener rule) as well as §10 (the event field).

**F-13 MINOR, plan-side (D6.1).** `doc-check` never fails and has no "unnumbered decision" check; D6.1 should read "its
Dead paths, Counts and 'cited but not recorded' sections list nothing from this step's docs".

**F-14 MINOR, plan-side (0.8).** R20-0's proof (page key order) proves S2's build only; if S2 slips, R20-0 has no proof.
Add a second proof that the loaded build has `webNavigation` (e.g. R20-POP-BG's grant, or the worker's
`chrome.runtime.getManifest().permissions` read as RD-0 did, `docs/e2e-test-plan.md:1631`).

**F-15 MINOR, plan-side (0.8).** R20-G2-1 records window rectangles but has no leg that removes the suspected cause; add a
leg with B's window uncovered (control) so the covered-window hypothesis is tested, not only logged.

**F-16 MINOR, plan-side (0.8).** R20-CHOOSE-REFUSE-DIS is reachable without page code tricks the bridge cannot see: a
handler that calls `input.click()` on an enabled input and then sets `disabled` in the same task reaches the check, which
reads attributes **after** the chooser event (`extension/src/upload-files.ts:440-457`). Unmeasured; Stage 0's measurer or
S5-sheet should try it before writing the row as a RECORD.

**F-17 NIT.** `mcp/src/tools/registry.ts:294` "24 tools" (25). **F-18 NIT.** 0.8's CHOOSE-TWICE needs two concurrent
calls on one tab inside the first's chooser wait (`CHOOSER_WAIT_MS`, `upload-files.ts:440`): a page button that opens no
chooser keeps the first call waiting; state it in the sheet.

## 4. Blind spots for G1 and the daemon rule (extending the seed list)

| # | Blind spot | In the S6-G1 draft tests? |
|---|---|---|
| B1 | Join key: the navigation target's `tabId` (the new tab), never `sourceTabId` or a URL | yes ("by `tabId`") |
| B2 | Navigation target before `tabs.onCreated` | no (seed names it) |
| B3 | Navigation target never (popup blocked: no tab either; or a tab with no target: `Ctrl+T`, bridge `newTab`, `chrome.tabs.create`) — must not delay those | no (F-2) |
| B4 | `openerTabId` = the active tab, held by a third client (F-1) | no |
| B5 | Source tab held by another client → grant to that client only | yes |
| B6 | Source tab unleased → no grant | partly ("late opener after … unleased") |
| B7 | Source tab closed or never handled before the join | no |
| B8 | Popup of a popup (source leased by the opener rule) | no |
| B9 | Worker restart between the two events: the join half lost → no grant (or fallback) — pure join tested with injected clock; the restart itself is chrome glue | no |
| B10 | `tabReplaced` between the two events (the join key changes) | no; record as a limit |
| B11 | F20: a `newTab` in flight when the joined grant lands; `newTab` overriding it | no |
| B12 | Old extension (no field): today's rule; old daemon + new extension: the extra field is accepted and ignored (`isTabCreatedEvent` allows extra keys), a late event dropped silently (`intercept.ts:313-342` has no else) | old extension: implied by "existing tests unchanged" |
| B13 | The listener keeps no URL and logs nothing (static check; log sites +0) | G6.3 only |
| B14 | Disarmed or blocked popup: `tabCreated.url` redacted (`safety.ts:463-471`); `sourceTabId` carries no URL; the grant still goes out with `url ""` | no |
| B15 | A claim of the popup inside the hold (F-2) | no |
| B16 | Hello feature absent/present split (F-1's fix) | no (new) |

## 5. Exit checks: executable and discriminating?

| Check | Executable | Discriminating | Note |
|---|---|---|---|
| Z.1 | yes | yes | this audit + auditor 2 + measurers |
| G1.1 | yes | yes, if B2–B16 tests are added and fail pre-slice | F-7 |
| G1.2 | yes (`git diff extension/manifest.json`, `manifest.test.ts`) | yes | list the test edits (F-10) |
| G1.3 | yes (`log-scan.test.ts`, allowlist 54) | yes | |
| G1.4 | in S5 | yes, with a three-client leg (F-1) | |
| K2/C3/T4.1 | auditor 2 | | |
| T4.2 | yes | yes, if it asserts the lock free after a rejecting `sleep` and no unhandled rejection | F-5 |
| R5.1, R5.4–R5.6 | yes (git log order, hash read-back, scan counts, ledger) | yes | |
| R5.2 | yes | partly: proves S2 only | F-14 |
| R5.3 | yes | per row; DEVT rows not, as written | F-4 |
| D6.1 | partly | the "unnumbered decision" clause has no tool | F-13 |
| Counts at close | yes (`doc-check` §2) | yes | 25 / 28 / 27 (26) today |

## 6. Run 20's section and record

- `grep -nE '^#{2,4} ' docs/e2e-test-plan.md` (`stage0-a1-e2e-sections.txt`): last case section is **§4.27** (`:1771`);
  `§5` starts at `:1933`; `grep -c '4\.28\|R20-'` = 0. **§4.28 is free**: insert before `## 5. Results template` (`:1933`).
- The record goes in §5 after `### Run 19 (S7)` (`:3511`), before `## 6. Exit criteria` (`:3600`), as `### Run 20 (S5) — …`.

## 7. R19 rows named by 0.8 (`stage0-a1-r19-rows.txt`)

Every named R19 row exists in §4.27, in §5 Run 19 and in `S7-run-record.md`: ARGS-1, ARGS-3, CON-4, ARGS-OLD, VERSION,
CON-FLOOR, CHOOSE-KEPT, G2-1, CHOOSE-REFUSE, CON-NOTEA, UP-DEVT, KEEP-4, SWEEP-HELD (CON-CAP: sheet and run record, PASS, the
direction #355 then left open). R20-CHOOSE-TWICE and R20-POP-* are new (no R19 row; correct). Executable and
discriminating as written: ARGS-3 / CON-4 / ARGS-OLD / VERSION MCP legs (read `sdk/src/error.ts` lines and `isError`),
CON-FLOOR (#361's waits), CHOOSE-KEPT (second file, counters), CON-CAP (newest kept, count). Need a change: DEVT-* (F-4),
G2-1 (F-15), CHOOSE-REFUSE-DIS (F-16), CON-NOTEA (F-8), ARGS-ORDER (F-9), R20-0 (F-14).

## 8. Step 12 contracts on port 0 (`stage0-a1-contracts.txt`)

Test files taken from Step 12's product commits `e481efe 9921715 e835eb5 beaa805 c9bb6cb 63c771c 2099c08 5a5cd46 11a1210
ae123de` (`git show --stat`): 36 files (args, console, keeper, chooser, G2, plus the shared method tables). `npx vitest run
<36 files>`: **36 files, 1062 tests passed, exit 0**. Every server in them binds port 0; "9234" occurs only as string data
in the fakes of `mcp/test/safety.test.ts` and `mcp/test/tools.test.ts`.

## 9. Sizes against `agent-rules.md` §7

| Stage | Estimate (new code + tests) | Cap | Verdict |
|---|---|---|---|
| S1 | ~400–450 with F-1/F-2/F-7 | 350 | split S1a/S1b (F-6) |
| S4 0.7 part | ~5 code + ~40 test | in S4's 150 | fits; sequence after S1 (F-3) |
| S5-helpers + drivers | Run 19's were ~2,900 code + ~3,300 tests for 58 ids (`wc -l recipes/s12-r19* recipes/s12-forms*` and tests); Run 20 has ~20 ids → ~1,000 + ~1,100 | ~600 per slice | at least four slices (below) |
| S6 | docs only, ~150 lines | — | fits |

**Proposed S5 split:** S5-helpers (`recipes/s13-r20-lib`: R20-0's two proofs, LOGS and RESTORE reused, the MCP-line reader
from `sdk/src/error.ts`, window-rectangle recorder, the independent DevTools signal; ≤600) → S5-drivers-A (R20-POP-BG/-FG/
-OTHER with three clients incl. the active-tab holder; ≤600) → S5-drivers-B (ARGS-ORDER, the four MCP legs, CON-CAP, CON-NOTEA
live and replayed legs, CON-FLOOR; ≤600) → S5-drivers-C (CHOOSE-TWICE, CHOOSE-KEPT, CHOOSE-REFUSE-DIS, G2-1 with its
uncovered control, DEVT-UNDOCK/-EARLY and the conditional UP-DEVT/KEEP-4/SWEEP-HELD; ≤600). Live slices: liveA20 (R20-0,
POP, ARGS, CON), liveB20 (CHOOSE, G2), liveC20 (DevTools rows, alone; DevTools windows opened and closed by the wave).
