# S8-verifier2 — Docs (Step 11b), re-check after fix round 1

Claude Opus 5.5, effort medium, 2026-10-27. Read and run only; nothing edited but this report. No commit. Scope: V1–V12
of `S8-verifier.md`, every sentence the fixer added, and the proposals file against the `CLAUDE.md` files as they stand.

## 1. Verdict: **PASS-with-notes**

All twelve items are resolved; V5 is resolved in substance, with a NIT left (N2). Every new status claim matches
`docs/decisions.md` and the phase doc's As built. D8.1 is met and `doc-check` exits 0. The `.ts` diff only touches
comments. There are no CRITICAL or MAJOR findings. There are four new NITs (N1–N4), and none of them blocks the stage.

## 2. Outputs (re-run by me)

| Command | Result |
|---|---|
| `node scripts/doc-check.mjs` | exit 0; "Checked 37 living docs"; `tools: 24 · router methods: 27 · codes: 27`; flags only `CLAUDE.md:112  4535 passed` (the session agent's; proposal (d)) |
| `npm run typecheck` | exit 0 (all five `tsc -p`) |
| `npm run build` | `built extension → dist/`, exit 0; `git status --short` afterwards shows the same four modified and four untracked S8 files |
| `git diff extension/src/safety-dnr-keeper.ts`, with `+`/`-` lines that are not ` *` filtered out | nothing but the `---`/`+++` headers: the change only touches comments, so `npm test` was not run (brief) |

## 3. Status claims checked against the sources

- **"gate accepted (#311)"** (table row `progress-and-roadmap.md:172`; block status line): decisions.md #311 (Log,
  line 272) "the user accepted every recommendation … Step 11b is accepted with Run 17 as recorded"; phase doc As
  built "Gate ruling · 2026-10-27 · the user accepts Step 11b (#311)". Correct.
- **"S6 built, Run 17b run … D7.6 not met; close waits for the user (#318)"**: phase doc As built S6 (`db3f82e`) and
  S7-record ("**D7.6 not met**"); #318 is the only item under Open decisions, with options (a)–(c) for closing. Correct.
- **"R17B-RD-2, R17B-BACK, R17B-FWD blocked 0"**: run record §1 (`HITS bd2 … blocked=0`, `HITS bbk blocked=0`,
  `HITS bfw blocked=0`). Correct.
- **The seven FAIL ids and "each fails on a helper or sheet defect or an unestablished banner reading (#318)"**: these
  match the record's §1 counts and #318's Open-decisions text word for word. Correct.
- **"R17B-BACK-NOACT: `INTERNAL`, R17B-ACT-CTL: `ok` 4 of 4"**: record §5 finding 1. Correct.
- **"Not pushed (S6-S8)"**: `git log origin/main..HEAD` lists 14 commits from `91322ac` to `a8e5b56`. True, but not
  exact (N3).

## 4. Items V1–V12

| Item | Result | Evidence |
|---|---|---|
| V1 | resolved | setup.md bullet now reads: "`back` and `forward` hold the rules too. Measured once each, on a history whose pages had a user activation (without one, `back` cannot run at all; see below): … 0 requests … `DOMAIN_BLOCKED` (R17B-BACK, R17B-FWD); the rules read 0 after each reply." It no longer ties the rule to activation, and the R17B-ACT-CTL citation is gone from this bullet. Matches record rows 27–28 (`RULES 0`). |
| V2 | resolved | The upload sentence is gone from setup.md (`git diff docs/setup.md`, grep "upload rows": no match). progress now has the #318 wording. |
| V3 | resolved | "its history has one more entry (by design, #311; not measured)". #311 item 2 says the same. |
| V4 | resolved | One `*Superseded 2026-10-27: …*` after the Redirects list names all three dropped claims and the reason (S6, R17B-RD-2, R17B-BACK, R17B-FWD). |
| V5 | resolved (N2 left) | The status line was rewritten with a Superseded marker. The stale clauses were marked: "escaped (RD-2, #295; closed by S6, see Updated below)" and "*superseded …: was 'the gate awaits the user's ruling'*". Nothing contradicts any more. The appended *Updated (S8)* paragraph stays (N2). |
| V6 | resolved | The table row has the proposed wording, and its facts are checked in §3. |
| V7 | resolved | (b) now gives exact insertion text. A new (f) adds three recipes bullets, each matching the record: #317 / record §2 attempt 1 (`ParameterBindingArgumentTransformationException`, global `$o`), record §5 finding 7 and #318 (one console path), and record §5 finding 4 (the banner sampler on preflight legs). N4 covers small wording points. |
| V8 | resolved | "Run 17b measured more calls". |
| V9 | resolved | "Since Step 11b, `browser_new_tab` with a URL opens a blank page first (R17B-RD-2)." R17B-RD-2's `TABWATCH created-url=about:blank` supports it. |
| V10 | resolved | Lines 6–12 of `safety-dnr-keeper.ts` are now 117, 118, 85, 117, 118, 35 and 118 characters (`awk length`). The text now says "`newTab` with a URL borrows a `navigate` handle for its blank tab through `sw.ts`'s `callDeps.dnrForTab`", which matches `sw.ts:73` (`dnrForTab: (tabId) => dnrKeeper.call("navigate", { tabId })`). The parenthesis still opens with "`dnrScopeOf`:", but the `newTab` clause now names its own route, so it no longer reads as scoped by `dnrScopeOf`. |
| V11 | resolved | (d) now names the push state and 4665 / 191. progress says "Not pushed (S6-S8)" (see N3). |
| V12 | resolved | "`INTERNAL` again, message length equal, 1 of 1". The record says "message length 35 (the length of Run 17's …)". |

## 5. Proposals file against the CLAUDE.md files as they stand

- **(a)** `extension/src/CLAUDE.md`: the first Safety-gate bullet (lines 9–15) is exactly the "Current text"
  described, so the replacement applies cleanly. Its facts match the record (§1 rows 23, 27, 28; §5 findings 2–3) and
  #311/#312. The file is 434 words against a budget of 1200.
- **(b)** `extension/CLAUDE.md`: the `safety-hop.ts` entry (line 53) and the end of `safety-dnr.ts`'s entry (line
  51, "pure)") are both there, so the insertions apply. The permission is in `extension/manifest.json:8`. The file has
  3453 words against 3500, and the two insertions add about 20, which still fits. The wording is imprecise (N4).
- **(c)** `extension/src/handlers/CLAUDE.md`: the `newTab` bullet is line 16, as stated, and the `back`/`forward`
  bullet is lines 25–30. "`userGesture: true`, through `chrome.debugger`" matches `extension/src/debugger.ts:186` and
  record §5 finding 1. Both apply cleanly.
- **(d)** Root `CLAUDE.md`: the stated current text matches the Current state block and Commands line 112. The new
  facts are correct. It says to check the push count again at application, which is right because it can change.
- **(e)** This item is information only and is accurate (see V10).
- **(f)** `recipes/CLAUDE.md`: no existing bullet covers these facts (the earlier grep found nothing, and line 87's
  dynamic-scope note is a different fact). The text applies, with a naming point in N4.

## 6. New findings

### N1 — NIT — a changed sentence about the limit with no row of its own (D8.1, borderline)
In `docs/setup.md`, *What the block list does not do*, the fixer added "A bridge `back`/`forward` holds the rules
since Step 11b (below)." It points to the bullet below, which cites R17B-BACK and R17B-FWD, so D8.1 is met by
reference. Dropping `back`/`forward` from the "can make Chrome load it" list, though, suggests more than was measured.
Run 17b measured a redirect hop only (200, then 302). A `back` onto an entry that is itself on a blocked host, for
example a page the human visited, served from bfcache, was not measured. **Fix (optional):** "… holds the rules since
Step 11b (below; measured on a redirect hop, R17B-BACK, R17B-FWD)."

### N2 — NIT — the progress block still appends instead of editing in place
`docs/progress-and-roadmap.md:828-841`. The contradiction is gone, but the block is now a status line with a
Superseded marker, two inline superseded clauses and an *Updated 2026-10-27 (S8)* paragraph appended. This is what
`docs-writing-guide.md` § progress-and-roadmap asks to avoid ("edit that block instead of adding"). One leftover clause
is also stale: "Gate check D4.3 is part (RD-2's leak; the user rules which reading holds)". #311 item 1 ruled that
D4.3 reads **part**. **Fix (optional, or at the close-out):** write "D4.3 part (ruled, #311)", and fold the Updated
paragraph into the block's own sentences when Step 11b closes.

### N3 — NIT — "Not pushed (S6-S8)" leaves out a commit, and push is granted
`git log origin/main..HEAD` also lists `91322ac` (cleanup P10–P14, before S6). #311 item 6 grants the push (G11b-1).
**Fix:** "Not pushed since `ce1f06d` (push granted, #311)". Apply the same wording in proposal (d).

### N4 — NIT — proposal wording
- (b) says "`back`/`forward`: wait on `holding()` for the rules, at most 10 s". The code
  (`extension/src/handlers/history.ts:39-52`) waits for the tab's load (`settleWait`, `HISTORY_SETTLE_MS = 10_000`)
  when `call.holdsRules()` is true, which is `dnr.holding()` (`safety-call.ts:308`). **Fix:** "`back`/`forward`: while
  the call holds rules, wait for the load it starts, at most 10 s (#302)".
- (f) says "the helper gotchas". The file's section is "Runtime gotchas", and it already has a **Run 17's helper
  facts** bullet at `recipes/CLAUDE.md:151`. **Fix:** name the target as a new "Run 17b's helper facts" bullet after
  line 151. The global-scope bullet could also sit beside line 87's dynamic-scope note.

### Outside S8's lane (for the session agent, not a finding)
The phase doc's status line (line 3) still says "S6 … and Run 17b (S7) follow, then S8 and the close". That doc is the
session agent's to update at the as-built.

## 7. Deviations
None. The fixer's report matches the files: same five files, no `CLAUDE.md` edited (`git status`), and only comments
changed in `.ts`.

## 8. Proposed decisions
None.

## 9. Handoff
Nothing left running. The bridge daemon was not touched and there was no live run. N1–N4 are optional docs NITs. The
`CLAUDE.md` proposals and the root count (4535 → 4665/191) are for the session agent.
