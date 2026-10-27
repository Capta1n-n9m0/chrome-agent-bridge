# S5-verifier — docs

Claude Opus 5.5, medium effort. Read and run only; this report is the one file written. Docs-only stage: no
typecheck, test or build was run (deviation in the brief; nothing but `.md` changed).

## Verdict

**PASS-with-notes** (no CRITICAL or MAJOR; 4 MINOR, 5 NIT). Every exit check holds except the notes below.

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| D5.1: each limit sentence cites a Run 17 row or decision, and the row supports it | met (two wordings MINOR/NIT) | RD-1 `HITS rd1 redirect=1 blocked=0`, RD-3 `HITS rd3 redirect=1 blocked=0`, RD-2 `blocked=1`, RD-6 `blocked=1`, RD-4 `blocked=1`, RD-5/RD-5b `blocked=0` (`S4-run-record.md:28-43`); SAFE-5b 8081 log 1 (Step 9 `S4-run-record.md:101`); #295, #302, #308, #290 read in `decisions.md`; 0.9 at phase doc line 193 |
| `node scripts/doc-check.mjs` | exit 0 | last line `Checked 36 living docs (5 closed phase docs skipped for paths and status).`; warns `extension/CLAUDE.md 3733 words (budget 3500)` (untouched file) |
| No pattern, token or user path | met | `git diff HEAD` grep for `aliev`, `Users`, `bank.example`, `aaaa…`, `alias7`, `8085`: none in changed lines (`token` only in context lines); same for the two new files. 8081/8091 are fixture ports, not patterns |
| Lane | met | `git status --short`: only `S4-run-record.md`, `progress-and-roadmap.md`, `setup.md` modified; `S5-builder.md`, `S5-claude-md-proposals.md` new. No CLAUDE.md, code, decisions.md, journal.md |
| ~150 changed-line cap | met | numstat 2+0, 15+11, 22+9 = 59; proposals 70 lines; total ~129 |
| Correction dated, judgments unrewritten | met (line numbers MINOR) | only an inserted italic paragraph at `S4-run-record.md:12`; rows 37/75/124 byte-identical to HEAD's 35/73/122 |
| Anchors/links | met | no link or anchor added or removed; `docs/setup.md` → "Safety" reference unchanged |
| e2e-test-plan §5 Run 17 entry (3017-3097) | no change needed, right | `sed -n 3017,3097p | grep 80[0-9][0-9]`: empty |

## The `back`/`forward` claim: the builder is right

The brief listed `back`/`forward` among calls whose hop "never sends" (RD-1/RD-3). RD-1 is `navigate`
(e2e-test-plan.md:1618), RD-3 is `downloadStart`. RD-BACK is FAIL (`INTERNAL`, `FLIP bk … total=1`, so not
discriminating either), RD-FWD NOT RUN, RD-BACK-SAMEDOC FAIL, RD-BACK-EMPTY STOP with an empty list
(`S4-run-record.md:36-38, 44`). No row measured a blocked hop through `back`/`forward`. Writing "holds the rules (#302)
but not measured (#308)" is the only reading the record supports.

## Findings

**MINOR 1 — `S4-run-record.md:12`.** The correction names "lines 35, 73 and 122", but inserting it shifted those rows
to 37, 75 and 124 (`grep -n 8081 S4-run-record.md` → 37, 75, 124). The pointer is wrong in the file it sits in.
*Fix:* name the rows instead ("the RD-FWD row, attempt 6A's row and the STOP-rules row", or "lines 37, 75 and 124").

**MINOR 2 — `docs/progress-and-roadmap.md:830-831`.** "Gate checks D4.3 and D4.6 are not met (#309)". #309 decides
"D4.3 is **part**" and leaves the reading to the user (decisions.md:195-198); only the S4-record entry says NOT met.
*Fix:* "D4.3 is part (RD-2's leak; the user rules which reading holds) and D4.6 is not met (#309)".

**MINOR 3 — `docs/setup.md:975-976`.** The old text "A redirect hop is still requested … Blocking the hop itself would
need a `declarativeNetRequest` rule, which is not built" is removed with no dated marker (writing guide rule 5;
setup.md is a living doc and uses `*Superseded …*` markers itself, e.g. :996). *Fix:* add
`*Superseded 2026-10-27: was "a redirect hop is still requested … not built", because Step 11b built the rule (Run 17 RD-1, RD-3).*`

**MINOR 4 — `docs/progress-and-roadmap.md:697-699, :801`.** The Known-limitations marker ("*Corrected …: a redirect hop
… is no longer sent …*") states the new fact, not the old text ("was X, because Y", rule 5); the Phase E line now reads
"Not built: blocking a redirect hop … (*built in Step 11b …*)", which contradicts itself in one sentence. *Fix:* the
standard form, e.g. "*Superseded 2026-10-27: was "a redirect hop of a bridge navigation or download", because Step 11b
stops it (RD-1, RD-3)*", and move the Phase E item out of "Not built" with a marker, noting `newTab` stays uncovered (#295).

**NIT 1 — `docs/setup.md:982`.** "a pattern added during a call counts (RD-5, RD-5b)": RD-5 adds the pattern just
*before* the call (within 1 000 ms, `GAP 369 ms`, e2e-test-plan.md:1632); only RD-5b is during. *Fix:* "just before or
during a call".

**NIT 2 — `docs/setup.md:981-982`.** "with the list emptied, the same redirect loads (RD-4)": RD-4 removes the blocked
pattern (list = found, e2e-test-plan.md:1631); the found list was empty in Run 17, so true here, but "with the pattern
removed" is the row's own wording. "the same answers as before" could cite #293.

**NIT 3 — `docs/setup.md:974`.** The kept sentence "`back`/`forward` can make Chrome load it" now sits beside "they hold
the rules (#302)". Neither is measured for a direct `back` onto a blocked page; consider "can still (not measured since
Step 11b)". Left as-is is the conservative reading.

**NIT 4 — `docs/progress-and-roadmap.md:5`.** The header Status still says "next: Step 11b". Close-out's job, not S5's
lane; noted so the session agent updates it.

**NIT 5 — `S5-claude-md-proposals.md` (a).** "`downloadStart` (RD-3; before: 1, SAFE-5b, R14-5c)": SAFE-5b is the
`navigate` baseline, R14-5c the download one; attach each to its row. It also drops the measured `res.url` post-check
fact (rule 7) and is no shorter, while `extension/CLAUDE.md` is already 233 words over budget. Proposals (b), (c), (d)
check out: `extension/src/handlers/CLAUDE.md` exists; (b) matches #308; (c) matches `S4-live.md:109-112` and
`S4-investigation.md:86` (+1.5 s to +2.8 s = 1.3 s); (d) matches `S3b.md:44-46`, `safety-hop.ts:51-53, :95`, and
`grep -rn "\.blocked()" extension/src` is empty.

## Builder claims audited

Diff stat, doc-check exit, citation list, the README and e2e §5 "no change" calls, and the 8091 evidence
(`recipes/s11b-rules.ts:716`, `S4-record-verifier2.md:97-103`) all reproduce. Extra roadmap edits stay in lane.
