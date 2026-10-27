# S8-verifier — Docs (Step 11b)

Claude Opus 5.5, effort medium, 2026-10-27. Read and run only; nothing edited but this report. No commit.

## 1. Verdict: **PASS-with-notes**

No CRITICAL or MAJOR finding; D8.1 met (every changed sentence about the limit cites a Run 17 or Run 17b row, one
design fact excepted, V3); `node scripts/doc-check.mjs` exit 0. Every number and row id checked against
`S7-run-record.md` is right. Nothing reads the seven failed upload rows as fixed. Seven MINOR, five NIT.

## 2. Outputs (re-run by me on the tree as it stands)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 (all five `tsc -p` projects) |
| `npm test` | `Test Files 191 passed (191)`, `Tests 4665 passed (4665)`, exit 0 |
| `npm run build` | `built extension → dist/`, exit 0; `git status --short` afterwards shows only S8's four files and two untracked reports |
| `node scripts/doc-check.mjs` | exit 0; `tools: 24 · router methods: 27 · codes: 27`; flags `CLAUDE.md:112 4535 passed` as a stated count to check |

**The 4665 / 191 count comes from committed work, not from S8.** The as-built entries in the phase doc give
4535/183 → 4560/184 (S6) → 4663/190 (S7-helpers) → 4665/191 (S7-live). S8 adds and removes no test. The root
`CLAUDE.md`'s 4535 is stale since S6 and is the session agent's to update (V11).

**The `.ts` change is a comment only.** `git diff extension/src/safety-dnr-keeper.ts` changes one line, line 7, inside
the opening `/** … */` block (it starts with ` *`). Its content is accurate: `sw.ts:73` is
`dnrForTab: (tabId) => dnrKeeper.call("navigate", { tabId })`.

## 3. Checks against the run record (all correct)

- R17B-RD-2: `HITS bd2 redirect=1 blocked=0`; Run 17 RD-2 saw 1. setup.md, progress, spec note: correct.
- R17B-NEWTAB-LOAD: 3074, 3102, 3074, 3076, 3075 ms → "3074-3102 ms", five pages, `completes=1`: correct.
- R17B-BACK: `DOMAIN_BLOCKED`, `blocked=0`, `FLIP n200=1 n302=1`, `RULES 0`. R17B-FWD: `ok`, then `DOMAIN_BLOCKED`,
  `blocked=0`. The phrases "200, then 302", "once each" and "rules read 0" are right.
- R17B-ACT-CTL `ok` 4 of 4. R17B-BACK-NOACT `INTERNAL` 1 of 1, which is RECORD.
- Counts PASS 16, RECORD 2, FAIL 7, NOT MEASURED 3. The seven FAIL ids listed in progress match §1 of the record.
  "Carried from Run 16" matches #318 and the S7-record as-built.
- R17B-LOGS NOT MEASURED and D7.6 not met (#318): correct. `tabs.get().status` after `goBack` is labelled NOT MEASURED,
  as in the record.
- Spec note: N1's three cases match `S6-verifier2.md` N1 (V-3a, V-3d, V-3e). The record's §4 gives "none of the first
  two" (`completes=1`, `first-complete-ms` 6-7) and "the third is not measured": both correct.
- Proposals (a) and (c): their facts match the record (§5 findings 1-3) and the handlers bullet at
  `extension/src/handlers/CLAUDE.md:25-30`. `handlers/CLAUDE.md:16` is the `newTab` bullet, as (c) says.
  `extension/CLAUDE.md` is 3453 words (`wc -w`), as (b) says. `handlers/history.ts` exists and is not in
  `extension/CLAUDE.md` (grep "history": no match). Proposal (a) replaces the whole first Safety-gate bullet of
  `extension/src/CLAUDE.md:9-15` and applies cleanly.

## 4. Findings

### V1 — MINOR — the back/forward bullet ties the rule to activation and cites the wrong row for it
`docs/setup.md` (new bullet in *Redirects, since Step 11b*): "`back` and `forward` are covered on a history with a user
activation … That held on histories built with an activation only (R17B-ACT-CTL)". The code holds the rules on every
bridge `back`/`forward` (`dnrScopeOf`). Activation decides whether `back` works at all (#308), not whether the rule
holds. "Held … only" can be read as "the rule works only after an activation", which no row measured. The activated
set-up of R17B-BACK and R17B-FWD is not R17B-ACT-CTL's evidence either. It is D7.4's framing-file lines (`HIST bk … activated=2`,
`HIST fw … activated=3`; `S7-run-record.md` §3 D7.4, not committed). R17B-ACT-CTL is the control showing that the
bridge's `evaluate` activates. "Once each" also appears twice in one sentence.
**Fix:** "`back` and `forward` hold the rules too. Measured once each, on a history whose pages had a user activation
(without one, `back` cannot run at all; see below): the blocked server saw 0 requests and the answer was
`DOMAIN_BLOCKED` (R17B-BACK, R17B-FWD); the rules read 0 after each reply."

### V2 — MINOR — the upload-row sentence is misplaced in setup.md and may read as "uploads are broken"
`docs/setup.md`, end of the `back`/`forward` limit paragraph: "Run 17b's seven failed upload rows (carried from Run 16)
are not Step 11b claims and are not fixed by it." A user reading Safety → block list does not need a test campaign's
bookkeeping. The guide's table gives setup.md install and usage only (`docs-writing-guide.md:20`, "not: plans,
decisions"), and the fact is already in the progress block. "Not fixed" also suggests a known product defect. #318
gives helper or sheet defects, or a banner reading whose cause is not established.
**Fix:** delete the sentence from setup.md and keep it in progress-and-roadmap. There, write "not Step 11b claims;
each fails on a helper or sheet defect or an unestablished banner reading (#318)" instead of "not fixed".

### V3 — MINOR — an unmeasured design fact sits among the measured ones (D8.1)
`docs/setup.md` `browser_new_tab` bullet: "its history has one more entry". No Run 17b row measured history length
(grep of §4.25 and the run records: no match). It is the accepted design difference (#311 item 2; spec §10 S6
amendment). **Fix:** cite it as such, e.g. "its history has one more entry (by design, #311; not measured)".

### V4 — MINOR — setup.md drops three claims with no Superseded marker (guide rule 5)
`docs/docs-writing-guide.md:56-57` says to edit in place and leave `*Superseded <date>: was X, because Y.*`. Three
claims went with no marker:
- "or `back`/`forward` can make Chrome load it", in *What the block list does not do*;
- the bullet "`browser_new_tab` with a URL: its first request still goes out (RD-2 …; #295)";
- the bullet "`back` and `forward` … Run 17 did not measure a redirect through them …".

S5 used markers on this same section. **Fix:** one marker after the *Redirects* list, e.g. "*Superseded 2026-10-27:
was "`browser_new_tab` … first request still goes out (RD-2)" and "`back`/`forward` … not measured", because S6 and
Run 17b measured them (R17B-RD-2, R17B-BACK, R17B-FWD).*" Also mark the P6 change.

### V5 — MINOR — the progress block gains an "Updated" paragraph that contradicts the text before it
`docs/progress-and-roadmap.md:827-841`. The bold status still says "**gate not met, waiting for the user's ruling**".
The block still says "`newTab`'s first request still escapes (RD-2, #295)" and "the gate awaits the user's ruling".
The appended *Updated 2026-10-27 (S8)* paragraph then says the opposite. The guide asks to edit the block in place
rather than append (`docs-writing-guide.md:56-57`, and its § progress-and-roadmap: "edit that block instead of
adding"). **Fix:** rewrite the status line, e.g. "Built 2026-10-26/27; gate accepted (#311); S6 and Run 17b done;
closing waits for the user's ruling on #318". Replace the stale clauses with Superseded markers.

### V6 — MINOR — the table row says "follow", but S6 and Run 17b are done; it omits #318
`docs/progress-and-roadmap.md:172`: "gate accepted by the user (#311), S6 `newTab` and Run 17b follow (R17B-RD-2, …)".
Both are done (as-built S6, S7-record). Step 11b's close now waits on #318 (Open decisions). **Fix:** "… gate
accepted (#311); S6 built, Run 17b run (R17B-RD-2, R17B-BACK, R17B-FWD blocked 0; D7.6 not met); close waits for the
user (#318)".

### V7 — MINOR — the proposals miss Run 17b's helper facts for `recipes/CLAUDE.md`, and (b) has no text to apply
`S8-claude-md-proposals.md`. S5 proposed Run 17's helper facts for `recipes/CLAUDE.md` (#310 (c)). Run 17b measured
three new ones, and none is in `recipes/CLAUDE.md` (grep "global", "-File", "sampler": no match):
- a PowerShell 5.1 `-File` script's top-level variables are global, so `$o` overwrote `$global:O` (#317);
- one console-capture path for both slices loses liveA's capture (#318);
- the banner sampler reads positive on SDK-preflight legs that send no call (record §5 finding 4).

Proposal (b) gives a direction ("add `handlers/history.ts` …, name the permission") but no exact text, so it does not
"apply cleanly" as written. **Fix:** add a (f) with the three recipes bullets, worded as measured. Give (b) its exact
Key-files insertion, e.g. after `safety-hop.ts`: "`handlers/history.ts` (`back`/`forward`: wait on `holding()` for
the rules, at most 10 s)". Append to `safety-dnr.ts`'s entry: "; permission `declarativeNetRequestWithHostAccess`".

### V8 — NIT — "two more calls" means three
setup.md: "Run 17b measured two more calls" introduces `browser_new_tab`, `back` and `forward`. **Fix:** "more calls".

### V9 — NIT — internal stage codes in a user doc
setup.md reload note, "Step 11b S6 also opens …": `S6` is not paired with its title (guide rule 6). **Fix:** "Since
Step 11b, `browser_new_tab` with a URL opens a blank page first (R17B-RD-2)."

### V10 — NIT — keeper comment line 7 is 168 characters; the block wraps at about 118
`extension/src/safety-dnr-keeper.ts:7` (`awk length`). Also, `newTab` is listed inside "(`dnrScopeOf`: …)", although
`dnrScopeOf` does not scope it; it borrows the `navigate` scope. **Fix:** re-wrap the line, and say "`newTab` with a
URL borrows a `navigate` handle for its blank tab through `sw.ts`'s `callDeps.dnrForTab` (S6, #312)".

### V11 — NIT — proposal (d) leaves out the stale count and push state
The root `CLAUDE.md` Current state says "Step 11b's 36 commits are not pushed". `origin/main` is at `ce1f06d`
(`git rev-list --count origin/main..HEAD` → 14), and Commands says 4535 (doc-check flags it; now 4665/191). The
progress block's "Not pushed" is likewise partial. **Fix:** add both to (d), and write "S6–S8 not pushed" in progress.

### V12 — NIT — R17B-BACK-NOACT's text was not printed
setup.md puts "R17B-BACK-NOACT: `INTERNAL` again" right after the quoted message. The record has the code and a
message length of 35 (Run 17's text length), not the text. **Fix:** "`INTERNAL` again, message length equal, 1 of 1".

## 5. Deviations
None. The builder's report claims "unmeasured … labelled" and "no CLAUDE.md edited". The second is true (`git status`
shows no `CLAUDE.md` changed). The first is true, except for V3.

## 6. Proposed decisions
None.

## 7. Handoff
Nothing left running; the bridge daemon was not touched; no live run. Fixes V1–V7 are docs-only (setup.md, progress,
proposals file). V10 is a comment re-wrap.
