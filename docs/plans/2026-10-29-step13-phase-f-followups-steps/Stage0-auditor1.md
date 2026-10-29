# Step 13 — Stage 0, auditor 1 (G1, counts, Run 20, process)

Model: Opus, effort medium. Start commit `ff121a4`. Read-only in the repo; outputs in the steps dir only. The audit
body is `stage0-audit.md`; raw output is in `stage0-a1-{counts,doc-check,npm-test,contracts,citations,e2e-sections,r19-rows}.txt`.

## 1. Verdict

**DONE.** The G1 half of the phase doc is buildable but not as written: one CRITICAL (the fallback to `openerTabId` and the
late-event option both lease a background opener's popup to the holder of the window's active tab) and six MAJOR
(foreground grant delayed by the join, a false "disjoint files" claim, a non-discriminating DevTools control, a wrong
rationale for 0.7, S1 over its cap, the draft's missing tests). Counts agree everywhere. Step 12's contracts are green on
port 0.

## 2. Outputs

- Counts at `ff121a4` (commands in `stage0-a1-counts.txt`): **25 tools, 28 router methods** (`router.on` 28,
  `METHOD_CLASSES` 28, daemon 21 tab + 4 free + 3 by name), **27 codes, 26 on the wire** (9 daemon + 17 extension; 1 SDK),
  **log sites 54** (15 / 33 / 6 / 0). Phase doc, root `CLAUDE.md` and `doc-check` agree.
- `npm test`: **5596 passed, 235 files, exit 0** (`stage0-a1-npm-test.txt`, paths redacted). Test count before → after:
  unchanged (read-only).
- `node scripts/doc-check.mjs`: exit 0; `tools: 25 · router methods: 28 · codes: 27`; one stated test count (5596).
- Step 12 contracts: 36 files from the ten Step 12 product commits, **1062 tests passed, exit 0**, port 0 only
  (`stage0-a1-contracts.txt`).
- **§4.28 is free** in `docs/e2e-test-plan.md` (last is §4.27 at `:1771`; §5 at `:1933`); the Run 20 record goes after
  `### Run 19 (S7)` (`:3511`) and before `## 6.` (`:3600`).
- Every R19 row 0.8 names exists in §4.27, §5 and `S7-run-record.md` (`stage0-a1-r19-rows.txt`).

## 3. Verifier verdict

Not applicable (leaf auditor).

## 4. Deviations

- `stage0-audit.md` is named in my brief as mine; it holds auditor 1's half only, under that title. If auditor 2 also
  writes an audit body, the step agent merges the two.
- An evidence file of `npm test` was redacted after capture (one local path and the ANSI colour codes removed); the counts
  lines are untouched.

## 5. Proposed decisions

### 2026-10-29 · #375 attacked: Step 13's order, amended — S4's 0.7 part after S1; parallel stages only in worktrees
**Decided:** amend #375. S1 and S4's 0.7 part both edit `daemon/src/intercept.ts`, so 0.7 runs after S1's commit (or moves
into S1). A stage that runs beside another works in its own worktree with its own `npm ci` (root `CLAUDE.md`, the junction
gotcha); otherwise stages run one at a time. S1 is split into S1a (spec notes, protocol, daemon rule) and S1b (extension
join, listener, manifest). **Why:** the "disjoint files" claim is false (phase doc S1 and S4 lanes); parallel stages in one
tree break "`git status` clean after the build" and "`npm test` = before + n"; S1 is ~400–450 lines against a 350 cap.
**Instead of:** #375 as written. **Revisit if:** a run shows two worktrees cost more than the time saved. **By:** Claude (proposed)

### 2026-10-29 · #376 attacked: G1 as one `tabCreated` field with a hello feature; no late event; no `openerTabId` fallback for a new extension
**Decided:** replace #376's either/or. The extension holds only a `tabCreated` that carries `openerTabId`, joins it to
`onCreatedNavigationTarget` by the new tab's id within Stage 0's measured bound, and sends `sourceTabId` when joined. Its
hello gains a feature (e.g. `"openerSource"`). The daemon: with the feature, grant only from `sourceTabId` (absent → no
grant); without it, today's `openerTabId` rule. The late `tabOpener` event is dropped. Spec notes in §6.2/§6.3 and §10
first. **Why:** `openerTabId` names the window's active tab when the opener is behind (Step 12 `Stage0.md:93`, 15/15), so
the fallback and the late event (the tab already granted on `tabCreated`, `intercept.ts:324,353-356`) both lease the popup
to whoever holds that tab — the phase's own STOP line. **Instead of:** "`sourceTabId` when present, else `openerTabId`";
a late event that grants only if unleased. **Revisit if:** Stage 0 measures a spread too long to hold `tabCreated`; then a
late event that may **move** an opener grant, which needs a new revocation event (contract). **By:** Claude (proposed), for
user review (contract: a hello feature and the lease rule).

### 2026-10-29 · #381 attacked: keep `.then(release, release)`, with the rationale corrected
**Decided:** amend #381. Build it in S4 after S1 commits; the test asserts the lock is free after a rejecting injected
`sleep` and that no unhandled rejection occurs. **Why:** a rejection today is an unhandled rejection, which the daemon
treats as fatal and exits 1 (`daemon/src/main.ts:112-117`), not a lock held to disconnect; production injects no `sleep`
(`main.ts`, `index.ts` have none; only `wsHost.ts:47,149` passes it), and the default never rejects. **Instead of:** the
"held until disconnect" rationale; dropping it. **Revisit if:** S4 exceeds its cap. **By:** Claude (proposed)

### 2026-10-29 · #382 attacked: Run 20 at §4.28, with six row changes before S5-sheet
**Decided:** keep §4.28 (free) and the R20 id rules; amend the seed rows: (1) R20-DEVT-UNDOCK/-EARLY get a DevTools signal
independent of the bridge's refusal, chosen by Stage 0's measurer (Run 19's DEVPROBE inferred `attached` from the refusal
itself, `recipes/s12-forms-b.ts:12`); (2) R20-POP-OTHER adds a leg where a third client holds the window's active tab;
R20-POP-FG times the grant against R15-POP-2 (a)'s 150 ms; (3) the CON-NOTEA live-log legs (allowed and blocked frame) run
whether or not S3a is built (#373's proposal); (4) R20-ARGS-ORDER is a new row related to R19-ARGS-1, which #374 item 4
made ND on its receive-side clause; (5) R20-0 adds a proof of the permission (R20-POP-BG's grant or a manifest read as
RD-0 did); (6) R20-G2-1 adds an uncovered-window control leg; R20-CHOOSE-REFUSE-DIS first tries a handler that clicks an
enabled input then disables it (the check reads attributes after the chooser event, `upload-files.ts:440-457`).
**Why:** each as written is either not discriminating or measures less than #373 asked. **Instead of:** the seed rows as
written. **Revisit if:** Stage 0's measurer finds no independent DevTools signal; then the DEVT rows are written as RECORD
with that stated. **By:** Claude (proposed)

### 2026-10-29 · #383 attacked: kept, with the unmeasured Run 19 leftovers named
**Decided:** keep #383. Add to Follow-ups the Run 19 items Run 20 does not re-measure: KEEP-1's banner clause and the
attach counter (#351 (2)), and DEVT-NOFLAG / CHOOSE-FRAME / CHOOSE-HUMAN stay RECORD. **Why:** #374 bounds the scope and
these are neither in it nor in Run 20; naming them keeps them from being lost. **Instead of:** silence. **Revisit if:** the
user widens Step 13. **By:** Claude (proposed)

## 6. Findings

Ranked in `stage0-audit.md` §3 (F-1 … F-18) with file:line and command; the summary:
- **CRITICAL F-1** (plan-side; code-side today): background-opener popup leased to the active tab's holder under the
  fallback and the late event.
- **MAJOR** F-2 (join delays the foreground grant; a claim can land in the hold), F-3 (S1/S4 share `intercept.ts`;
  parallel stages in one tree), F-4 (DevTools control not independent), F-5 (0.7's rationale wrong), F-6 (S1 over cap),
  F-7 (draft tests miss B2–B16).
- **MINOR** F-8 … F-16 (CON-NOTEA live legs unconditional; ARGS-ORDER framing; `manifest.test.ts` edits to list; listener
  before `setAccessLevel`; spec §6.2/§6.3; D6.1's tool; R20-0's second proof; G2-1 control; CHOOSE-REFUSE-DIS reachable).
- **NIT** F-17 (`registry.ts:294` "24 tools"), F-18 (CHOOSE-TWICE needs concurrency inside the chooser wait).
- New runtime fact worth a `daemon/CLAUDE.md` bullet (measured by reading, 2026-10-29): today's opener rule grants a
  background opener's popup to the holder of the window's active tab, if any (Step 12 `Stage0.md:93` + `intercept.ts:353-356`);
  not seen live because R15-POP-2 (b) used one actor.
- Blind spots for G1: 16 rows in `stage0-audit.md` §4; the S6-G1 draft covers B1 and B5, B6 in part.

## 7. Handoff

Nothing running; no PIDs; the `npm test` and contract runs finished (exit 0). No file outside the steps dir was written
except a scratch script in the session scratchpad. The step agent needs: auditor 2's half for 0.3–0.6; the measurers' G1
order/spread (sets F-2's bound and decides #376's form) and an independent DevTools signal (F-4). #376's amended form and
F-1 go to the user as a contract question; until ruled, the conservative option is the feature-gated field (no grant
without `sourceTabId` from a new extension).
