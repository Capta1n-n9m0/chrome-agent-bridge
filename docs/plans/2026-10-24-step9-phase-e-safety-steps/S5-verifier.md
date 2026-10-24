# S5 — verifier report (Step 9, stage S5 "Docs")

Date 2026-10-24 · Verifier (Claude Opus 5.5) · HEAD `ba6029e` + the uncommitted S5 tree · read and run only;
Chrome untouched, no daemon started, 9234 never bound. The builder's report `S5-builder.md` was read as claims to
audit.

## Verdict

**FAIL** — one MAJOR finding (F1: setup.md tells scripts to call `error.report()` on a safety refusal, which has
no `report`). Everything else holds: counts, quotes, grammar examples, #127, leaks, lane, roadmap lists. The other
findings are MINOR/NIT.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| S5.1: three controls + `Alt+Shift+K` + how to change it | PASS | setup.md § Safety → "The kill switch: three ways…" (button + pin, shortcut = `_execute_action`, `chrome://extensions/shortcuts` + the options-page button, options-page switches); `extension/manifest.json:12` `"_execute_action": {"suggested_key": {"default": "Alt+Shift+K"}}`; `options.html:30` "Change the keyboard shortcut" |
| S5.1: every new gotcha (proposed CLAUDE.md §6.11) cites a source, and the source says it | PASS | opened each: S4-run-record lines 56/68 (SAFE-PERF 3.6 → 5.3 ms), 93–95 (SAFE-4a 92 ms, 4c 54 ms, 4(b) pressed 27.225 → replied 27.239 = 14 ms, 578/1000, banner at 3000 ms, gone at +14 s), 78 (SAFE-2 `0x04090409` before/after, 3 layouts), 110 (SAFE-10 210 lines, all 0); S4.md §10 items 1–8; S1.md §2 (mutants) and §6 (lexical scan); S2b.md §6 items 2 and 6; S2b.md line 33 (60 sites: 15/33/0/6, also `log-scan.test.ts:33`); S3.md §6 line 208; S0.md §6 item 3; stage0-audit.md F16 (line 257); S2a.md r1 CRITICAL (line 139) |
| Nothing contradicts #127 | PASS | `git diff -U0 \| grep '^+' \| grep -ciE "evaluate\|bulk\|chunk"` → 19; 0 hits for `bulk`/`chunk`. Each hit is about the JavaScript switch or the recipes needing it; none offers paging data through `browser_evaluate`; setup.md's "Not for bulk data" paragraph is untouched |
| Counts match re-derived values | PASS (docs) | see "Counts" |
| No real host, token, real pattern, user tab | PASS | real-TLD host regex on added lines → 0; token (read inside the command) `git diff \| grep -cF "$T"` → 0; URLs on added lines: `chrome://extensions`, `…/shortcuts`, `chrome-extension://`, `file:///…`, `file://server/…`, `https://bank.example/`, `https://www.bank.example/login?next=1`; `localhost:808x\|127.0.0.1:808x` → 0; only reserved names (`bank.example`, `*.example`, `.test`) |
| Writing guide | PASS-with-notes | F7 |

## Counts (independent)

- `npm test` (one run, this tree):
  ```
   Test Files  116 passed (116)
        Tests  2720 passed (2720)
     Start at  19:03:11
     Duration  20.47s (transform 3.95s, setup 0ms, collect 24.20s, tests 50.22s, environment 17.55s, prepare 19.37s)
  ```
- Codes: `grep -cE '^\s+[A-Z_]+: "[A-Z_]+"' shared/src/codes.ts` → 25; header comment "25: 24 that the daemon and the
  extension put on the wire … plus `NO_CURSOR`"; `DISARMED`, `DOMAIN_BLOCKED` present.
- Tools: `grep -oE '"browser_[a-z_]+"' mcp/src/tools/registry.ts | sort -u | wc -l` → 23.
- Router methods: `grep -oE 'router\.on\(\s*"[A-Za-z]+"' extension/src/sw.ts | sort -u | wc -l` → 23; `METHOD_CLASSES` has 23 keys.
- Deltas in the proposed CLAUDE.md: 2720 − 1714 = 1006 tests, 116 − 85 = 31 files. Correct.
- Roadmap per-stage table vs the as-built register and stage reports: 1714/85 → 1783/86 (S0.md:26) → 2256 S1 alone
  (register line 56) → 2329/96 (register line 84) → 2561/106 (S2a.md:15) → 2660/113 (S2b.md:18) → 2685/115 (S2c.md:10)
  → 2720/116 (S4.md:25). All match. S1's 91 files is derived (86 + 5), see F6.

## Findings

### F1 · MAJOR · `docs/setup.md` § Safety → "For scripts" (last paragraph)

**Claim:** "A refused call throws a `BridgeError` … with no failure report attached …; `error.report()` is the one
line Claude sees."
**Evidence:** safety codes are not in the attach set, so `attachContext` never sets `error.report`
(`sdk/src/error.ts:265`, the only assignment, runs only for attach codes). `sdk/test/safety.test.ts:87`
asserts `expect(err.report).toBeUndefined()`. Decision #163's title: "Safety refusals get no `report` property;
the wording is `safetyRefusalLine` on `@bridge/sdk/report`". A script following the doc gets
`TypeError: error.report is not a function`.
**Fix:** "The error has no `report` (decisions.md · 2026-10-24 · S3: Safety refusals get no `report` property;
the wording is `safetyRefusalLine` on `@bridge/sdk/report`); the line Claude sees is
`safetyRefusalLine(err.code, err.data)` from `@bridge/sdk/report`."

### F2 · MINOR · `docs/setup.md` § Safety, intro: "The defaults … behave exactly as the bridge did before Step 9."

**Evidence:** with the defaults, `navigate`/`newTab` to any `chrome-extension://` URL is now `DOMAIN_BLOCKED`
(`safety.ts` `case "own"` → `EXTENSION_URL_MESSAGE`, no switch involved), and calls on this extension's own page are
refused; before Step 9 `handlers/navigate.ts` had no such check (`git show 59be263:extension/src/handlers/navigate.ts`
has only the `BAD_PARAMS` "requires a url"). The section's own "Not configurable" subsection says so.
**Fix:** "… behave as before, except that the bridge never opens extension pages (below)."

### F3 · MINOR · `docs/setup.md` § Safety → kill switch, "reloading or updating the extension, or restarting Chrome, keeps it … (Run 13, row SAFE-9)"

**Evidence:** SAFE-9 measured an extension reload only (S4-run-record line 108; S4.md §4 row SAFE-9 "state
survives reload"). No Chrome restart or extension update was measured in Run 13.
**Fix:** attribute SAFE-9 to the reload alone; mark the restart/update half "by construction (`storage.local`)".

### F4 · MINOR · `S5-builder.md` §6.9 (proposed CLAUDE.md Key files, extension)

**Claim:** "Step 9 (Phase E safety; all pure, unit-tested, no log call): `safety.ts` … `badge.ts` (… one fixed log
line per press), `options.ts` + …".
**Evidence:** `extension/src/badge.ts:183` `console.log(toggleLogLine(r))`; `badge.ts` drives `chrome.action`
(injected setters, line 109); `options.ts` is DOM + `chrome.storage` glue. The block contradicts itself.
**Fix:** "the gate, matcher and state modules pure, with no log call; `badge.ts` logs one fixed line per press;
`options.ts` is page glue".

### F5 · NIT · `docs/progress-and-roadmap.md` Step 9 block, table row "Baseline (Step 8 close) | `a0700e0`"

**Evidence:** `git log --oneline -1 a0700e0` → "docs(step9): open the run — steps dir, common brief, decisions
#130–#131"; Step 8's close is `59be263` (its parent). The counts (1714/85) are the same at both.
**Fix:** "Baseline (Step 9 run opened; Step 8's counts)" or use `59be263`.

### F6 · NIT · same table, caption "as the as-built register records" vs S1's "91" files

The register states "+473 in 5 files", not 91; the builder disclosed the derivation in its report but not in the
table. **Fix:** "91 (derived: 86 + 5)".

### F7 · NIT · writing guide (rules 5, 6; decision citations)

Sampled 14 paragraphs/bullets (setup.md: intro, three kill-switch bullets, re-arm paragraph, badge table, four
"what agents see" bullets, JavaScript switch, block list "does not do", failure-state bullets; README paragraph;
roadmap Phase E). Plain, present tense, numbers sourced. Notes:
- setup.md (a user reference doc) cites "S2b verifier finding F4" and row IDs such as `SAFE-REL-1`, `SAFE-7d`
  without a gloss.
- The roadmap status header keeps Step 8's bold "**23 tools, 1714 unit tests green**" beside the new current count;
  the dated note explains it but the bold reads as current.
- The roadmap's open-decision list cites by number + a paraphrased title (e.g. "#141 stricter exit checks") rather
  than date + exact title; the builder proposed this deliberately (its §5), so it is for the step agent to accept.

## Other checks (no finding)

- **Quotes, byte for byte:** the extension messages (`safety.ts:168–179`), the three MCP lines (`sdk/src/error.ts:115–120`),
  the five badge titles (`badge.ts:46–52`; setup elides two with `…`, prefix/suffix exact), `Safety:` line forms and hidden
  labels (`registry.ts:127–136`), the invalid-line text (`options.ts:56` + `options-model.ts:15`), the summary
  (`options-model.ts:47–49`), the options status/writes (`options-model.ts:56–86`), the options labels (`options.html:23–38`). All match.
- **Grammar examples** run through `safety-match.ts` in a scratch tsx script (21 URL cases, 5 line kinds):
  `cases 21 bad 0`; `*.192.0.2.1` invalid, `# a comment`/empty ignored, `ftp://…` invalid; `analyzeBlockList`
  summary `1 blocked site. 1 invalid line is not counted (marked below).` — as setup.md states.
- **Builder's "brief vs code" claims:** (1) confirmed — no `commands.onCommand` in `sw.ts` (`grep -c commands` → 1,
  the comment at line 355); one `action.onClicked` at line 369. (2) confirmed — `daemon/src/intercept.ts:251–255`
  `extensionDisconnected()` sets `safety = null` and logs `safety state: not reported (extension disconnected)`;
  line 193 resets on a new hello.
- Other code claims checked: disarm detaches debugger sessions and clears downloads (`sw.ts:40–43`); re-arm guard
  1000 ms, button/shortcut only (`safety-state.ts:51,289`); `ToggleOutcome` (`:144`); `GatedRouter.on` throws via
  `methodClass`, unknown → `UNKNOWN_METHOD` (`router.ts`); `setAccessLevel` at line 380, after both
  `storage.onChanged` listeners (336, 371) and `action.onClicked` (369), not awaited; `client.safety()` and
  `TabInfo.hidden` (`sdk/src/client.ts:283,383`); `tabs.claim` not refused while disarmed (`intercept.ts:689`).
- **Roadmap:** the 32 open decisions match decisions.md → Open decisions → Step 9 (numbers and order); Run 13
  24/7/3/5 = S4.md §4 verifier line; the 7 FAILs and their causes match S4.md §4's table; Steps 10–12 match #129 with
  #194's four re-measurements in Step 10.
- **Lane:** `git diff --stat` → only README.md, docs/e2e-test-plan.md (one hunk, §1 at line 132; §4.20 and §5 not
  in the diff), docs/progress-and-roadmap.md, docs/setup.md. The S9 files named in §1 all exist.
- **Proposed CLAUDE.md anchors:** 19 anchors grepped with `grep -cF` → each 1 (the §6.3 anchor is on one line).
  No contradiction found with an existing invariant; measured vs by-construction marks are right except F4.

## Round 2 (after `S5-fixer1.md`)

Re-checked F1–F7 only, on the current uncommitted tree. `git diff --stat`: README.md 18, docs/e2e-test-plan.md 7
(both unchanged from round 1), docs/progress-and-roadmap.md 107, docs/setup.md 218 (was 212). Only setup.md and
the roadmap changed; the untracked additions are the fixer's report and this file.

| Finding | Status | Evidence |
|---|---|---|
| F1 MAJOR | **Fixed** | setup.md:825–827 now says "no `report` property; the one line Claude sees is `safetyRefusalLine(err.code, err.data)` from `@bridge/sdk/report`". Signature `sdk/src/error.ts:127` `safetyRefusalLine(code: unknown, data: unknown): string \| null`; re-export `sdk/src/report.ts:6`. The cited title matches decisions.md line 354 (#163) verbatim |
| F2 MINOR | **Fixed** | setup.md:642–644 "…except that the bridge never opens extension pages (see "The bridge never opens its own pages" below)". Consistent with #138/#155: navigation to any extension page refused. Calls on a tab already showing the bridge's own page are also refused, and the linked section states that (NIT only: the one-clause summary names the navigation half) |
| F3 MINOR | **Fixed** | setup.md:664–665: reload "measured: Run 13, row SAFE-9"; update/restart "by construction; not measured" |
| F4 MINOR | **Fixed** (in the fixer's replacement block) | Per-file re-check (code lines, comments excluded): the safety files, `options-model.ts` and `relay-sender.ts` have 0 `console.` and 0 `chrome.`; `badge.ts` 1 log, 0 direct `chrome.`; `options.ts` 0 log, 6 `chrome.`. Unit tests exist for options-model, safety-call/-debugger/-network/-state, badge (2 files); relay-sender is covered by `s2a-fixer1.test.ts`; `options.ts` is read only statically (`safety-writers.test.ts`, `sw-static.test.ts`). The block's "pure, unit-tested, no log call" / "logs one fixed line" / "page glue, not unit-tested" are now correct |
| F5 NIT | **Fixed** | roadmap:220 `Baseline (Step 8 close) \| 59be263` (= "docs: close Step 8 (W2)…") |
| F6 NIT | **Fixed** | roadmap:223 `91 (derived: 86 + 5)` |
| F7 NIT | **Fixed** (the part that was a finding) | Row IDs glossed once (setup.md:644–645); the S2b reference is now a path (setup.md:807–808; S2b-verifier.md:93 is F4, about `options.ts` showing the stored state); the roadmap status line's Step 8 count is unbolded, "at its close 23 tools, 1714 unit tests green". The open-decision list form is the step agent's build decision, not a finding |

New claims introduced by the fix: none found wrong. No new URL, host or token; no count changed. I did not re-run
`npm test`: no code changed, and round 1's run gave 2720 tests in 116 files.

**Round 2 verdict: PASS-with-notes.** The only note is F2's one-clause summary: it names the navigation half of
the own-page rule, and the linked section covers the rest.
