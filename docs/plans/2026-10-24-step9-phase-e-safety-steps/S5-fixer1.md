# S5 — fixer round 1 (Step 9, stage S5 "Docs")

Date 2026-10-24 · Fixer (Claude Opus 5.5) · inputs: `S5-verifier.md` F1–F7 · lane: `docs/setup.md`,
`docs/progress-and-roadmap.md` (README.md and e2e-test-plan.md §1 not touched; no finding named them). Docs only:
no count changed, so `npm test` was not re-run. Chrome untouched, no daemon, nothing committed.

## Per finding

**F1 · MAJOR · fixed.** Checked the signature: `sdk/src/error.ts:127`
`export function safetyRefusalLine(code: unknown, data: unknown): string | null`, re-exported by
`sdk/src/report.ts:6`. setup.md § Safety → "For scripts" now reads:
> … with no failure report attached (no screenshot, no snapshot) and no `report` property; the one line Claude
> sees is `safetyRefusalLine(err.code, err.data)` from `@bridge/sdk/report` (decisions.md · 2026-10-24 · S3:
> Safety refusals get no `report` property; the wording is `safetyRefusalLine` on `@bridge/sdk/report`).

(The citation is the title of decisions.md line 354, #163, verbatim.)

**F2 · MINOR · fixed.** setup.md § Safety intro:
> The defaults — on, JavaScript allowed, no blocked sites — behave as the bridge did before Step 9, except that
> the bridge never opens extension pages (see "The bridge never opens its own pages" below).

**F3 · MINOR · fixed.** setup.md § Safety, after the re-arm guard:
> The state lives in the extension's `chrome.storage.local`, so what you turned off stays off across a reload of
> the extension (measured: Run 13, row SAFE-9) and, because `storage.local` is kept, across an update of the
> extension or a restart of Chrome (by construction; not measured). A reload closes an open options page.

(S4-run-record line 107: the reload, then `wait-safety reached safety armed=false evaluate=false blockedCount=1`.)

**F4 · MINOR · fixed in this report** (S5-builder.md not edited). Re-checked per file with
`grep -c 'console\.'` and `grep -n 'chrome\.'`: `safety.ts`, `safety-match.ts`, `safety-state.ts`,
`safety-call.ts`, `safety-debugger.ts`, `safety-network.ts`, `options-model.ts`, `relay-sender.ts` → 0 log calls,
`chrome.*` only in comments (injected); `badge.ts` → 1 log call (`badge.ts:183`
`console.log(toggleLogLine(r))`), `chrome.action` injected (line 109), unit-tested (`badge.test.ts`,
`badge-stored-read.test.ts`); `options.ts` → 0 log calls, direct `chrome.storage.local`/`chrome.tabs.create`/
`storage.onChanged` (lines 8, 14, 43, 93, 119, 122), no unit test of its own, read statically by
`safety-writers.test.ts` (line 50). The step agent should use this block **instead of** S5-builder.md §6.9's
second block (the first replacement of §6.9, `router.ts`/`offscreen.ts`, is unchanged):

Anchor (CLAUDE.md, Key files, extension): `` `handlers/download.ts` (the service-worker fetch); the other half is `sdk/src/download.ts`. `` → **insert after:**
```
  Step 9 (Phase E safety): pure, unit-tested, with no log call — `safety.ts` (the gate
  `safetyDecision`, the method table `METHOD_CLASSES` over all 23 router methods — `methodClass` throws
  on an unknown name — the refusal messages, `listTabs`/event redaction, the network predicate),
  `safety-match.ts` (the block-list grammar and matcher, dot boundary only; #135, #156), `safety-state.ts`
  (`SAFETY_KEYS` in `storage.local`, the per-call read that fails closed, `SafetyStore.toggle()` →
  `"disarmed" | "armed" | "ignored" | "write-failed"`, the 1 s re-arm guard, `readStoredArmed`, the
  `safetyState` reporter), `safety-call.ts` (one call's gate at receipt, before each first side effect,
  and the post-check), `safety-debugger.ts` (the session registry `detachAll` at disarm),
  `safety-network.ts` (the ingest filter), `options-model.ts` (the options page's analysis and texts),
  `relay-sender.ts` (the offscreen sender check); `badge.ts` (badge/title by state, `BadgeController.press`;
  `chrome.action` injected, unit-tested) logs one fixed line per press (`toggleLogLine`); `options.ts` +
  `extension/options.html` are page glue (DOM + `chrome.storage.local`, the Safety and Blocked sites
  boxes), not unit-tested, read statically by `safety-writers.test.ts`. Tests that guard them:
  `extension/test/log-scan.test.ts` (+ `log-allowlist.ts`, 60 log sites) and `log-sentinel.test.ts` (no
  pattern/URL/token in any log), `safety-writers.test.ts` (only the toggle and the options page write the
  safety keys), `manifest.test.ts`.
```

**F5 · NIT · fixed.** progress-and-roadmap.md Step 9 table: `| Baseline (Step 8 close) | `59be263` | 1714 | 85 |`
(`git log --oneline -1 59be263` → "docs: close Step 8 (W2); Phase E design; Step 9 kickoff"; counts the same per the verifier).

**F6 · NIT · fixed.** Same table: `| S1 — the gate and the host matcher | `2091f6b` | 2256 (S1 alone) | 91 (derived: 86 + 5) |`.

**F7 · NIT · two of three fixed, one left to the step agent.**
- Row IDs glossed once, at the end of setup.md's Safety intro: "Row IDs below (`SAFE-2`, `SAFE-7d`, …) name rows
  of the live test plan, `docs/e2e-test-plan.md` §4.20, whose results are Run 13 in §5." The S2b citation now
  reads "…; the options page showing the stored state is finding F4 of Step 9's stage S2b verifier,
  `docs/plans/2026-10-24-step9-phase-e-safety-steps/S2b-verifier.md`)" (that file's F4, line 93, is about
  `options.ts` rendering the stored state).
- Roadmap status line: Step 8's bold "**23 tools, 1714 unit tests green**" → "at its close 23 tools, 1714 unit
  tests green (…)", unbolded, so only Step 9's count reads as current.
- Open-decision citations by number + short title: not changed. The builder proposed it as a decision
  (S5-builder.md §5, "the roadmap's Step 9 block lists the 32 open decisions by number and short title"); the
  verifier left it to the step agent. Accepting or rejecting it is the step agent's call.

## Checks

- `git diff --stat` lane: README.md, docs/e2e-test-plan.md, docs/progress-and-roadmap.md, docs/setup.md (as before) +
  this report. No count changed; no URL, host or token added (the added text names only repo paths and code identifiers).
