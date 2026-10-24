# Step 9 S0 — verifier report (types and codes)

Verifier: Claude Opus 5.5, 2026-10-24, independent of the builder. Read: `briefs/common.md`, `S0-builder.md`
(treated as claims), `stage0-audit.md` §3, §6, §7, §8, §9, `docs/decisions.md` #132–#145, the diffs of
`3d3c4be` and `aabc3b4`, and the uncommitted `shared/` diff. No agent spawned. Nothing touched the daemon, port
9234, Chrome or the token. Scratch: `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad\S0v\`
(the baseline worktree, its own `npm ci` and its directory removed afterwards; `git worktree list` shows only the main tree).

**Tree left as found.** `git diff | sha256sum` → `7eeb313f…429c6` and `sha256sum shared/test/protocol-step9.test.ts` →
`443c1e20…94ac1` before any check, after each of the two stash rounds, and at the end (`TREE-AS-FOUND`); `git stash list` is
empty; `git status --short` shows the same six paths as at the start, plus this report.

## How the checks were run

- **Current tree:** `npm run typecheck` → exit 0; `npx vitest run --reporter=json` → exit 0, **1783 passed, 0 failed,
  86 files**; `npm run build` → exit 0.
- **Baseline `2b2db78`:** a `git worktree` in the scratch dir with **its own `npm ci`**, not a junction. A junction
  would have been wrong: the main `node_modules/@bridge/{shared,sdk,…}` are links to the *main* tree's packages
  (`ls -la node_modules/@bridge/` → `shared -> /c/Users/aliev/Projects/chrome-remote-extention/shared`), so a
  "baseline" build through them would have bundled the changed `shared/`. In the worktree the links point into the
  worktree. There: typecheck exit 0, build exit 0, vitest **1714 passed, 85 files**.
- Per-file comparison of the two JSON reports by test full name (`scratchpad\S0v\cmp.mjs`).

## Findings

1. **MINOR — spec §10's note and the `codes.ts` comments are narrower than ruling #138.**
   Location: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:552-558`; `shared/src/codes.ts:39-45`.
   Evidence: the spec says `"evaluate"` applies to "`evaluate` (with or without `asRef`) while JavaScript is off", and
   that `DOMAIN_BLOCKED` covers a URL that "is one of the extension's own pages". `codes.ts:39-40`:
   "turned JavaScript off and the call is an `evaluate` (`data: {scope: "evaluate"}`)". But decisions.md · 2026-10-24 ·
   Script URLs and the JavaScript switch; own pages of every extension (#138) also refuses `navigate`/`newTab` to a
   `javascript:`, `data:` or `blob:` URL while JavaScript is off with `DISARMED` `scope:"evaluate"`. It also refuses
   `navigate`/`newTab` to **any** `chrome-extension://` URL (any extension id) with `DOMAIN_BLOCKED`. The phase doc carries
   both rules (its F14 note at line 243, its F3 note at line 210). Nothing is invented. The text matches #133 and
   #134 word for word, but it reads as a complete definition, so an S2a or S3 reader could under-implement it or test
   the wrong message.
   Fix: add a new dated sub-bullet to §10's Step 9 note that cites #138 (do not edit the existing note), and widen the
   two comments in `codes.ts`. This is the builder's or fixer's job, not the verifier's.

2. **MINOR — the phase doc credits #145 with assigning stages to pre-registered exit checks, but #145 does not do that.**
   Location: `docs/plans/2026-10-24-step9-phase-e-safety.md:382`, `:463-464` (S2.1/S2.2 → S2a, S2.3 → S2b, S2.4 → both),
   `:380` (S2b's lane gains the badge's start-up and the `action.onClicked` registration in `sw.ts`), `:505-511`
   (S3.3's `storage.local.set` half moves to "whichever stage writes the toggle module (S2a) or the options page
   (S2b)").
   Evidence: #145 (`docs/decisions.md:90-101`) names only the budgets, the order and the lanes ("S2b's is the manifest,
   `options.html`/`options.ts`, the badge and the log-scan test"). It says nothing about which stage owns which exit
   check. The builder lists these assignments as Proposed decisions 3 and 4 ("for the step agent to confirm"), but the
   phase doc states them as settled, and the doc's dated notes bind (common.md). No check is loosened: S3.3's text is
   still §6's wording, and only its owner moves. The kickoff's ESCALATION list includes "anything touching a
   pre-registered rule".
   Fix: the step agent ratifies Proposed decisions 3 and 4 (or reassigns them). Until then, mark those notes "proposed
   by the S0 builder" rather than "(#145)".

3. **NIT — the bundle diff includes 8 comment lines beyond the code entries.**
   Location: `shared/src/codes.ts:38-47`; `daemon/dist/index.js`, `mcp/dist/index.js` and `extension/dist/sw.js`.
   Evidence: `diff before/<b> after/<b>`. In `mcp` and `sw` the only differences are `"INTERNAL"` → `"INTERNAL",`, the
   two array entries with their two JSDoc blocks, and `DISARMED: "DISARMED", DOMAIN_BLOCKED: "DOMAIN_BLOCKED",`. The
   `daemon` diff has the same, plus the `isTabRemovedEvent` line with `&& optional(p, "hidden", isHiddenReason)` and
   the new `function isHiddenReason`. `content.js`, `offscreen.js` and `options.js` are byte-identical (same sha256).
   The comments contain no URL and no token (`grep -c '://'` is the same before and after in all three bundles: 2, 51 and 4).
   They add one `—` each, and the bundles already contained that character.
   Grade: this does not break "differ only by the codes and the guards" in substance. The extra bytes are comments
   that sit on the changed lines and do not change behaviour.
   Optional fix: move the two comments above the array, after which the diff is the entries alone.
   A related behaviour change, as expected: the daemon's `tabRemoved` guard now rejects a frame whose `hidden` is
   present but invalid (`null`, `"gone"`, …). No extension sends such a frame today.

4. **NIT — two spec sentences are imprecise or lack a citation.**
   Location: spec `:557-558` and `:569-571`.
   Evidence: "`DOMAIN_BLOCKED` reveals no host or pattern in message or data" cites #132–#134, which do not say it. The
   rule comes from Stage 0's row SAFE-5 (`stage0-audit.md` §7: "`DOMAIN_BLOCKED` with no host or pattern in
   message/data"), so it is grounded, not invented, but the citation is missing. "`leaseGranted.url` is then `""`" is
   tied only to the disarmed case. #134 and the phase doc's F40 note also cover a tab opened onto a blocked URL.
   Fix: cite `stage0-audit.md` §7 SAFE-5, and add the blocked case to the next dated note (with finding 1's).

5. **NIT (forward note for S3 and S2a, not an S0 defect) — the local row types still require `title` and `url`.**
   Evidence: `extension/src/handlers/tabs.ts:4-14` (`ListedTab`), `mcp/src/tools/registry.ts:94-` (`ListedTab`) and
   `sdk/src/client.ts:156-165` (`TabInfo`, an **exported SDK type**) all declare `title: string; url: string` and have
   no `hidden`. The new `ExtensionListTabsRow` and `ListTabsRow` (`shared/src/protocol.ts:574-596`) match today's
   extension output field by field (`id, title, url, active, windowId, openerTabId?, current?: true`) and today's daemon
   additions (`tab`, `owner?`; `daemon/src/intercept.ts:494-505`). They make `title?`/`url?` optional per #134. The
   daemon's `record()` already copes with a missing url or title (`intercept.ts:485-486`: `typeof t.url === "string" ? …
   : undefined`). Mapping a hidden row into `TabInfo` changes the SDK's exported surface, which is on the escalation list
   for S3. Also, the type does not enforce "`hidden` present exactly when `title` and `url` are absent" (no
   discriminated union). That is acceptable for a wire type, and the doc comment says it.

6. **Info — the escalation the builder raised (S1.1's stricter check, F17). Facts only; no decision made here.**
   - The check (phase doc `:440`, from §6 via #141): "`Router.on` of an unclassified name throws (test)". `Router.on`
     is `extension/src/router.ts:8`.
   - Lanes: S1's lane is `extension/src/safety.ts` and `extension/test/` (phase doc S1). `router.ts` is named in S2's
     original lane (`:334`: "`extension/src/` (`sw.ts`, `router.ts`, …)"). It falls under F18's amended lane
     (`extension/src/**` except `content/**` and `safety.ts`), and so under S2a's lane (F18's lane minus `options.ts`
     and the manifest and options page). No lane names `router.ts` for S1.
   - `stage0-audit.md` §9's S1 row gives S1 "`Router.on` guard's **table**", which means the classification data, not the
     guard in `router.ts`.
   - Can S1 meet the check without `router.ts`? Only in part. S1 can export from `safety.ts` a lookup that throws on an
     unclassified method and test it in `extension/test/`. But the check names `Router.on` itself, which only an edit to
     `router.ts` can make throw. A test of `Router.on` written in S1 would fail until S2a wires it in. The ways out are a
     lane grant of `router.ts` to S1 (S1 runs alongside S3, whose files are `daemon/`, `sdk/` and `mcp/`, so no file
     clash; S2a starts after S1), or moving that half of S1.1 to S2a's close. Either is the step agent's call.

**Unfounded claims found in the builder report:** none. Every number I re-derived matched (test counts per file,
failing-first counts, bundle hashes, +337/−0, +39/−0, 22 amendment texts, 13 §6 rows).

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| **S0.1** `npm test` = 1714 + n, n ≥ 1, no test removed, listed per file; typecheck 0 (#141) | **PASS** | Baseline worktree 1714/85, tree **1783/86**, n = 69. Per file: `shared/test/protocol-step9.test.ts` 0 → 66 (new); `shared/test/codes.test.ts` 3 → 4; `sdk/test/failure-report.test.ts` 65 → 67; every other file identical by test name and status. In `codes.test.ts` the two existing tests are **edited**: renamed "13 extension" → "15 extension" and "23 spec codes" → "25 spec codes", with the assertion 23 → 25. That is the count change Stage 0 F32 and the S0 note allow, not a removal. `failure-report.test.ts` is unchanged (`git diff --stat 2b2db78 -- sdk/` is empty). Its +2 come from the existing loop `for (const code of Object.keys(ErrorCodes))` at `:193-195`, which is parameterised over every code: "DISARMED: attaches nothing, rethrown untouched" and the same for DOMAIN_BLOCKED, both passed. Typecheck exit 0; build exit 0. |
| **S0.2** spec note before the code commit; 25 codes, both new in `EXTENSION_ERROR_CODES`; `codes.test.ts` asserts 25 and both names; the guard rejects missing and mistyped fields; D1's event names in `protocol.ts` | **PASS** | `git merge-base --is-ancestor aabc3b4 HEAD` → true; the code is uncommitted, so any code commit will come after it. `git diff --numstat 3d3c4be aabc3b4` → `39 0` on the spec only. `codes.ts` lists 9 + 15 + 1. `codes.test.ts` has `toHaveLength(25)`, the two names, and `EXTENSION_ERROR_CODES` length 15. `protocol-step9.test.ts` has `it.each(mutations())`: each field missing, null or mistyped, plus NaN, Infinity, negative and fractional counts, all rejected. `protocol.ts:82,85` add `"safetyState"` and `"safetyStatus"`. |
| Each plan-side Fn accounted for, verbatim, at the named place | **PASS** | My own script (`scratchpad\S0v\verbatim.mjs`, whitespace-normalised) found all 21 regex-matched amendments in `3d3c4be`'s phase doc: once each, and F27 twice (0.5 and 0.6, as the audit names). F18, whose text the regex misses because of a line break, is verbatim at `:350-351` by reading. Placement checked against each "*Amendment for …*" line: F1 and F7 in 0.1; F43 (bullet 1), F10 (2) and F20 (4) in 0.2; F2, F40, F21 and F30 (bullet 1) and F5 (2) in 0.3; F22 (1), F8 (2), F41 and F9 (3), F3 (5) and F16 (new paragraph) in 0.4; F27 and F14 in 0.5; F12, F23 and F27 in 0.6; F28 in 0.7; F18 and the S2 copy of F20 at S2. The builder's F1–F43 table agrees. All 13 non-"keep" §6 rows are verbatim. |
| No original phase-doc text deleted | **PASS** | `git diff --numstat 2b2db78 3d3c4be` → `337 0`, so zero lines deleted and none to justify. Every contradicted original is kept with a "*Superseded 2026-10-24: was …*" note. |
| #145's split and lanes match decisions.md | **PASS, with finding 2** | Budgets 0.75 / 2.5 ∥ 2.5 / 3 / 1.5 / 1.5+2.5 / 1 match. S2a's lane is S2's minus the manifest and options page; S2b's is the manifest, `options.html`/`options.ts`, the badge and the log scan. "Step 8's S2b is unrelated" is stated. The check assignments are not in #145 (finding 2). |
| Commits touch one file each | **PASS** | `3d3c4be`: the phase doc only. `aabc3b4`: the spec only (`git show --stat`). |
| The builder's extra notes add no requirement | **PASS** | S4's note points to `stage0-audit.md` §7. S5's note points to F16's own "`docs/setup.md` 'Safety' says so". The Open-items note lists rulings. 0.5's badge note restates #143. The F2 "(Both: …)" note restates #134. The S3.3 lane note and the check split are covered by finding 2. |
| Spec notes match #132, #133 and #134; no invented field, name or behaviour; no deletion | **PASS, with findings 1 and 4** | `+39 −0`. The events, their params, "never on the hello", `daemon.status.safety … | null` (null until reported and after the socket closes), `scope` and the `hidden` marker with the kept and dropped fields all match the rulings. The only text not in #132–#134 is grounded in §7 SAFE-5 (finding 4). |
| New tests fail without the change | **PASS** | `git stash push -- shared/src/codes.ts shared/src/protocol.ts`, then `npx vitest run shared/ sdk/test/failure-report.test.ts` → **62 failed** (3 in `codes.test.ts`, 59 in `protocol-step9.test.ts`), 2 files failed. Without the source change, `failure-report` has no DISARMED or DOMAIN_BLOCKED tests to run. The 7 new tests that still pass check old shapes (Step 7 `tabRemoved`, `tabCreated` url `""`, `tabGone`, a missing tabId or an `id` frame) or are type-only, and `npx tsc -p shared/tsconfig.json` fails on those with exit 2 and 18 `TS2305 … has no exported member`. After `git stash pop` the hashes match. |
| Bounded bundle diff (#86 model) | **PASS, with finding 3** | sha256 before → after: daemon `597d6c28…` → `f5d3d1ca…`; mcp `4b07b464…` → `3c1b657b…`; sw `27493950…` → `d850d789…`; options `9093499a…`, offscreen `93af3da9…` and content `bcb20e28…` identical. These match the builder's table. |
| Type shapes and guard conventions | **PASS, with finding 5** | `TabCreatedParams` gains a comment only; `TabGoneParams` and `isTabGoneEvent` are untouched. `isTabRemovedEvent` accepts `{tabId}` and `{tabId, lastUrl, lastTitle}` (tests). The new guards accept unknown keys, treat null as mistyped, require the exact event name through `eventParams` and `isEvent` (an `id` frame is rejected), and reject arrays (`isPlainObject`). |
| Nothing outside `shared/` edited; no `dist/` tracked; no log line, URL or token added | **PASS** | `git diff 2b2db78 --stat` → the 2 docs and 3 `shared/` files, plus the untracked test. `git ls-files \| grep -c /dist/` → 0. `git diff 2b2db78 -- shared/ \| grep '^+' \| grep -iE "console\.\|log\(\|://\|token"` → nothing. |

## Verdict

**PASS-with-notes.** No CRITICAL or MAJOR finding, and every exit check passes. Two MINOR findings: (1) the spec note
and code comments are narrower than #138; (2) the phase doc credits #145 with exit-check assignments that it does not
contain. There are three NITs and one escalation to state as facts (S1.1 needs a change to `Router.on` in
`router.ts`, which is in S2a's lane, not S1's).

## Round 2 (after fixer r1) — re-check of findings 1–4 only

Run 2026-10-24 by the same verifier. The fixer report (`S0-fixer1.md`) was treated as claims. Tree hashes
(`git diff | sha256sum` plus the untracked test) were the same before and after these checks; nothing was edited
except this appended section.

- **Commits.** `git show --numstat`: `2cc0049` → `13 0` on `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
  only; `32e64a3` → `9 0` on `docs/plans/2026-10-24-step9-phase-e-safety.md` only. Neither deletes a line. Both sit
  on `aabc3b4`, and the code is still uncommitted.
- **Finding 1 — RESOLVED.** The new spec note (§10, after line 573) adds #138's rules exactly:
  - `DISARMED {scope:"evaluate"}` for `navigate`/`newTab` to `javascript:`, `data:` or `blob:` URLs while JavaScript
    is off, with those navigations as before when it is on;
  - `DOMAIN_BLOCKED` for navigation to any `chrome-extension://` URL, and for every method on a tab showing this
    extension's own page (by `url` or `pendingUrl`), with that tab hidden as blocked;
  - `chrome://` navigation unchanged.
  Nothing beyond #138 is added. The comment in `codes.ts` (now above `EXTENSION_ERROR_CODES`) states the same
  scope, citing #133 and #138.
- **Finding 2 — RESOLVED.** Three "*Corrected 2026-10-24 (S0 fixer r1)*" notes (phase doc ≈ lines 384, 469 and 518)
  say that #145 assigns no exit checks. They name the S2.1–S2.4 split, S2b's `sw.ts` registration and S3.3's moved
  half as the S0 step agent's proposals. The original text is kept, and no rule is added. The notes point to
  "S0.md Proposed decisions": `S0.md` is the step agent's report, which does not exist yet, so the step agent must
  carry those decisions there.
- **Finding 3 — RESOLVED.** After `npm run build`, I diffed the bundles against my own baseline (built in a clean
  worktree at `2b2db78`). Its sha256 hashes are identical to `scratchpad\S0-baseline-dist\`.
  - `mcp/dist/index.js` and `extension/dist/sw.js` differ only by `"DISARMED"`, `"DOMAIN_BLOCKED"` in the array and
    the two `ErrorCodes` entries.
  - `daemon/dist/index.js` has the same changes, plus the `tabRemoved` `hidden` guard and `isHiddenReason`.
  - No comment lines remain in the bundles.
  - `options.js` (`9093499a…`), `offscreen.js` (`93af3da9…`) and `content.js` (`bcb20e28…`) are identical.
  - New hashes: daemon `a62abbe9…`, mcp `9695d87d…`, sw `c72b43a5…`.
- **Finding 4 — RESOLVED.** The same spec note cites `stage0-audit.md` §7 SAFE-5 for "no host or pattern", and adds
  that `leaseGranted.url` is `""` for a tab opened onto a blocked URL (#134; F40). Both match their sources.
- **Checks re-run:** `npm run typecheck` exit 0; `npm test` → **1783 passed, 86 files**; `npm run build` exit 0.
  `git status --short` shows the same `shared/` paths plus the untracked reports.

No new findings. Finding 5 (a forward note for S3) and item 6 (the S1.1 / `router.ts` lane escalation) stand
unchanged for the step agent.

**Round 2 verdict: PASS.** Findings 1–4 are resolved, and every exit check still passes.
