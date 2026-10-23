# Step 7 — propagator · correction ledger

**Date:** 2026-10-23 · **HEAD before:** `9cfc7db` · **Role:** propagator (`.claude/skills/step-agent/role-prompts.md`
§ Propagator), Claude Opus 5.5.

## Outcome
- 49 dated notes written in place: the Step 8 plan 18, the phase doc 16, the spec 11, `CLAUDE.md` 2
  (outside Current state), `docs/setup.md` 1, `README.md` 1 (counts corrected directly, with a note).
  No history was rewritten and no code was edited.
- Re-measured: `npm test` → 950 passed, 59 files (at `9cfc7db`); `grep -c "server.tool(" mcp/src/tools/registry.ts` → 22.
- Not edited: `journal.md`, `docs/decisions.md`, the as-built register, `CLAUDE.md` Current state,
  `docs/progress-and-roadmap.md`, `docs/e2e-test-plan.md` (not in this brief).

## Ledger

Line numbers are those of the note after the edit. "#N" means decisions.md entries, cited in the
notes by date and title.

| File | Line | Was → now | Source |
|---|---|---|---|
| step8 plan | 14 | Prerequisites "Steps 6 and 7 complete and E2E-passed", with BG-1/BG-2 deciding `policy.ts` → Step 7 built and E2E-run, with the gate on the user's items. BG-1/BG-2 failed, and so did BGF-1/2. Focus emulation is measured first. Baseline 950 / 59, 22 tools | #61 #62(4) #66 #68; as-built § T5, § Run 9 |
| step8 plan | 41 | "21 today" → 22 at Step 7's close | as-built § T4 |
| step8 plan | 83 | Files touched had no `daemon/`, and the formatters were "new" → S2's removals are in `daemon/src/{intercept,methods}.ts`, `network-scope.ts`, and the `WINDOW_MINIMIZED` text. The formatters already exist under `./format` | #41 #46 #52 #53 #54 #57 #63 |
| step8 plan | 121 | Decisions intro: the policy is set from BG-1/BG-2 → set only after the focus-emulation measurement, which has no stage yet | #62(4) |
| step8 plan | 144 | 0.1: `roleOf :50`, `hasLayout :74`, `LOCATOR_*` thrown → `:52`, `:76`; failures must go through `codedError`/`guard` → `{__bridgeError}` | #38; `snapshot.ts` at HEAD |
| step8 plan | 207 | 0.4: the binary `trusted` rule, `tabs()`'s `active`, `mode` → the branch is not automatic; the human's flag is `current`; `cdp` refuses a background tab or a minimized window | #43 #55 #62(4) #63 #66 |
| step8 plan | 246 | 0.5: the attach screenshot assumed harmless → a ~1.5 s flash, `WINDOW_MINIMIZED`, and a covered window hanging with the restore at 30 s, which outlasts the 5 s cut; `formatSnapshot` comes from `./format` | R9-SCREEN-1, R9-RESTORE; #46 |
| step8 plan | 282 | 0.6: all of it Step 8 → T4 built the cursor, the notice, `select_tab`, `focus_tab` and `Active tab: [T<n>]`; S5 adds only the rest | #59; `registry.ts:320` |
| step8 plan | 356 | S2: an extension-only removal → the daemon's counterparts; a lane question (no `daemon/` grant); #51 is triggered | #41 #51 #52 #53 #54 #57 #63 |
| step8 plan | 391 | S3 `policy.ts` "set from the findings" → the findings are FAIL and not enough alone | #62(4) |
| step8 plan | 438 | S6 is a wave with the user and a manual reload → the driver runs it; the reload is scripted; the user is needed for SDK-6/7 and a non-zero exit | #33 #64 #65 #66 |
| step8 plan | 473 | Regression smoke against "last recorded run" → Run 9 forms; NET-1 `12.8 KB` / `2 of 2` | #56 #68 |
| step8 plan | 524 | Exit-check baseline unstated → 950 / 59 at `9cfc7db` | `npm test`; #67 |
| step8 plan | 567 | S3.4: the formatters exported from `index.ts` → only from `./format`; #46 is open for the user | #46 |
| step8 plan | 619 | G8-1 "if missing, stop" → present and FAIL; the focus-emulation option and its row have no stage | #61 #62(4) #66 |
| step8 plan | 640 | G8-2: user's keyboard for the reload and the sessions → scripted reload, headless actors | #33 #65 |
| step8 plan | 704 | Open items `registry.ts:270–279` → `:424–430`; `tab` is a string | #59 |
| step8 plan | 728 | Open items had no Step 7 items → the list of #41/#46/#51/#53/#54/#57/#59/#40/#62/#63/#66, T2 V4 (session marker), T3 V4 / T5b N1 | as-built § T2 (open), § T4, § T5b |
| phase doc | 8 | Status "Planned"; as-built and steps dir "not yet" → both exist, built and E2E-run; the Status line is left to close-out | #68 |
| phase doc | 76 | Goal "flashes the tab for a frame" → ~1.5 s; a covered window → `TIMEOUT`, restored at 30 s | Run 8 SCREEN-1, R9-SCREEN-1, R9-RESTORE |
| phase doc | 125 | 0.1 fallback `activeTab()` → `humansTab()` (normal window); the legacy path keeps "always `tabId`" | #41 #43 |
| phase doc | 173 | 0.3 free list → plus downloads; `networkRequests` free in every scope; `networkClear` "all" rule; numeric `tab`; `BAD_PARAMS` with neither `tab` nor `id` | #39 #54 #57 |
| phase doc | 192 | 0.4 lock class and deadline → plus `selectTab`; `fullPage` truthy; one deadline | #44 #53 #58 |
| phase doc | 217 | 0.5 sequence → capture slot, quota retry, chain bound, restore rules, `cdp` refusals | #58 #63 |
| phase doc | 240 | 0.6 "content-script throws … prefixed" → a returned `{__bridgeError}` (already built; history noted) | #38 |
| phase doc | 343 | T2 `listTabs` "`active`" annotation → `current`; the entry shape | #53 #55 |
| phase doc | 455 | T5: the reload as the user's keyboard step → scripted from Run 9 on | #64 #65 |
| phase doc | 476 | LEASE-6 premise and SW-console clause → outcome (b); the clause not checked | #45 |
| phase doc | 486 | SCREEN-2 "no switch; banner; image" → hung, now `OFFSCREEN`; positive control waits for the user | #63 #68 |
| phase doc | 493 | SCREEN-4 "CDP minimized → record" → hung 25 s, now `WINDOW_MINIMIZED`; message rewrite in Step 8 | #63 |
| phase doc | 501 | BG-1/BG-2 "record; retry" → FAIL, retry not run, flags no change, Step 8 measures | #61 #62(4) #66 |
| phase doc | 708 | G7-2: the reload keyboard step and "BG outcome sets `policy.ts`" → scripted; focus emulation first | #62(4) #64 #65 #66 |
| phase doc | 793 | Revisit triggers → BG met; SCREEN-4 not met; LEASE-6 (#45) met | #45 #61 #63 #66 |
| phase doc | 813 | Follow-ups → plus the S2 removals, the message rewrite, focus emulation, the session marker (T2 V4) | as-built § T2, § T5b |
| spec | 8 | Status "Step 6 … live E2E waits for D6" → Step 6 closed; Step 7 built and run; counts | #36 #68 |
| spec | 112 | §4 "the extension cannot tell; a v1 hello is an extension" → a proto:2 hello; no `proto` → `VERSION` on tab calls | #42 |
| spec | 130 | §5 rows → the fallback for one release; formatters in `./format`; the cursor built | #46; as-built § T1, § T4 |
| spec | 212 | §6.3 free list and `active:true` → downloads; `networkClear` "all"; normal window; the legacy path | #39 #41 #43 #54 #57 |
| spec | 233 | §6.4 needs-screen → plus `selectTab`; one deadline; the switch costs ~1.5 s | #44 #53 |
| spec | 357 | §8.3 → the parts T4 built vs Step 8's | #59 |
| spec | 463 | §10 → the Step 7 wire: hello, claim/release, annotations, `scope:"all"`, `__bridgeError`, 22 codes, legacy | #38 #41 #42 #51 #52 #54 |
| spec | 500 | §11 layout → Step 7's new files | as-built § T1–T4 |
| spec | 523 | §12 risks 1 and 3 → measured; a new risk: tab-id reuse after a Chrome restart (T2 V4) | #62 #66; T2-verifier V4 |
| spec | 545 | §13 launch-flags step → flags do not fix input | #66 |
| spec | 548 | §13 → new open question: a session marker in the hello | T2-verifier V4 |
| CLAUDE.md | 117 | Commands count source "on 6c5c603 + T6's tree" → "at 9cfc7db; T6 is 430e6fe" (in-line, no note: a command comment) | `npm test`; T6 report § 6 |
| CLAUDE.md | 469 | Docs "its gate waits for the user's rulings" → R9-SCREEN-2's positive control + #37/#40/#46/#51/#54 | #68 |
| setup.md | 84 | "The extension needs no reload: unchanged in Step 6" → after Step 7, reload; else `VERSION` | #42 |
| README.md | 23, 30, 37 | 21 tools, 542 tests, "live E2E pending" → 22 tools, 950 / 59, W1 and Runs 8–10 ran; daemon/SDK/multi-actor sentence | `npm test`; T6 report § 6 |

## Seen, not corrected (outside this brief or not Step 7's)
- `NO_CURSOR` (Step 8 0.4) is not among the 22 codes in `shared/src/codes.ts`. Step 8's S0 lists no
  addition. It is a Step 8 plan gap, not a Step 7 deviation.
- The handle-inheritance check that W1 proposal 4 accepted (decisions.md · 2026-10-22 · The user rules
  on the W1 proposals (#36)) has no item in the Step 8 plan. It is a Step 6 item, for the Step 8 kickoff.
- `docs/e2e-test-plan.md` SCREEN-4 / R9-SCREEN-4 expected text must get a dated note when Step 8
  rewrites the `WINDOW_MINIMIZED` message (#63). That file is not in this brief.
- `docs/progress-and-roadmap.md` (in the role prompt's inputs) was not in this brief and was not read.

## Contract-level questions raised (for the session agent, not decided)
1. Step 8 S2's lane has no `daemon/` grant, but its removals are partly in the daemon (step8 plan
   line 356).
2. The focus-emulation option and its live measurement have no Step 8 stage; G8-1 blocks S3 on them
   (lines 121, 619).
3. S3.4 presumes #46's answer (line 567).
4. The session marker (T2 V4) is a wire and lease change with no owner.
