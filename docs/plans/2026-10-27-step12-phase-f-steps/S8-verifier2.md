# S8-verifier2: fix round 1 of the Step 12 docs change, re-checked

Claude Opus 5.5, effort medium. Read and run only; no file edited but this report; nothing committed.
Audited: `git diff HEAD -- docs/setup.md docs/progress-and-roadmap.md README.md` and the untracked
`S8-claude-md-proposals.md`, with `S8-fixer.md` taken as claims to audit against `S8-verifier.md`.

## 1. Verdict

**PASS-with-notes.** All eight MINORs and NITs 2 to 6 are closed. NIT 1 was ruled by the step agent and is not a finding.
The re-check found one new MINOR, R2-MINOR-1, in a line this round's diff holds: the CHOOSE-LATE bullet says the 5 100 ms
page "opened" its dialog, but the record reads `opened=no`. It also found two NITs. S8.1 is met: every changed sentence
cites a row or a test that supports it. No FAIL, NOT DISCRIMINATING or NOT MEASURED row backs a positive claim.
`doc-check` exits 0.

## 2. Outputs (my own commands)

- **`node scripts/doc-check.mjs`: exit 0.** The counts read `tools: 25 · router methods: 28 · codes: 27`. The other
  findings are the same as in round 1, and all are outside the lane:
  - stale counts at `CLAUDE.md:17`, `:18`, `:88`, `extension/CLAUDE.md:42` and `mcp/CLAUDE.md:9`;
  - the test count at `CLAUDE.md:113`;
  - the word budget of `docs/decisions.md`.

  These belong to the session agent's close-out, as round 1 recorded. No finding names README, setup.md or the roadmap.
  The S8.1 rewrite (`stage0-audit.md` F14) asks for only the Counts and Test-count sections. That is met for the lane's
  files; the CLAUDE.md counts are carried in the proposals file (§1, §2, §4).
- **Lane (`git status --short`):** `M README.md`, `M docs/progress-and-roadmap.md`, `M docs/setup.md`, and the untracked
  `S8-builder.md`, `S8-claude-md-proposals.md`, `S8-fixer.md` and `S8-verifier.md`. Nothing else. No code or test file
  changed, so round 1's `npm test` (5596 / 235) stands.

## 3. Items

| Item | Status | Evidence |
|---|---|---|
| MINOR-1 | **Closed** | setup.md ~:419 now says the client's cursor has `consoleMessages` "by the code (`sdk/src/client.ts`…); no test calls it on the client". `sdk/src/client.ts:474-475` delegates to `this.tab().consoleMessages`. A grep of `sdk/test` and `mcp/test` for `client.consoleMessages` finds 0 files. |
| MINOR-2 | **Closed** | setup.md ARGS-1 note: "Through the MCP the printed text kept the page's order, 5 of 5 (R19-ARGS-1, `via=mcp`)". The record, `S7-run-record.md:48`, has `via=mcp value-equal=5 json-equal=5` (A3E:151), and the MCP prints `description` in page order (`serialize.ts:374`). |
| MINOR-3 | **Closed** | The `Object` bullet attributes the reading and its cause to Stage 0 (`stage0-m1-C.txt`) and the code, says the error's text is absent (`marker=0`), and says no line prints the entry's text. This matches `S7-run-record.md:65`. |
| MINOR-4 | **Closed** | The heading is "**Not shown: a second call with the same file.**", and its body keeps "cause not established". |
| MINOR-5 | **Closed** | The measured points are named by row: HUMAN (RECORD, `received=clicked-input dialog=0 files=1`, :116), LATE (PASS, :117), FRAME (RECORD, :115) and DISARM (PASS, `ms=5025`, :120). The dialog-just-before point says "by construction, not measured". RECORD rows are used only as "measured once" or a plain record, never as a pass. See R2-MINOR-1 for the LATE wording. |
| MINOR-6 | **Closed** | The tool-table row carries a dated amendment: a same-site frame is read (R19-CON-FRAME PASS, `a-nopattern entries=13`), and another site's process is not (`b-oop entries=2`, :64). This now agrees with § Reading the console. |
| MINOR-7 | **Closed** | Dated `*Superseded 2026-10-29: was …, because …*` markers are at the chooser paragraph ("(built, not yet run live; Run 19 checks it)"), the "With `chooser`" list and "can switch". Each has the form of docs-writing-guide line 57. |
| MINOR-8 | **Closed** | Proposals §2 now has the `mcp/CLAUDE.md:54` amendment, a pointer to the daemon's hold (#338, #354) and R19-G2-1 FAILED. The quoted old sentence exists in `mcp/CLAUDE.md:54`. |
| NIT 2 | **Closed** | Roadmap: "(#321, G12-0)". `decisions.md:1042` #321 item 5 is (a), "Chrome's rule is kept", and F is parked (line 4 of the entry). |
| NIT 3 | **Closed** | README says "of 58 row ids", and its limits pointer adds Running JavaScript, Uploading files and Troubleshooting. The roadmap says "of 58 row ids". |
| NIT 4 | **Closed** | "3.3 s apart" is gone. The line now reads "Run 18 had read a banner on those rows, and why the two runs differ is not shown". |
| NIT 5 | **Closed** | Proposals §6 no longer has the #373 re-measurement bullet. The wave is still in the roadmap's follow-ups. |
| NIT 6 | **Closed** | setup.md:322 and README say "(not one sent with `focusEmulation`)". This matches `daemon/src/methods.ts:102`, `params?.focusEmulation !== true`. The roadmap block ends with one blank line before "Plus the Step 5 follow-ups". |

## 4. New findings

**R2-MINOR-1. The CHOOSE-LATE bullet misreads `opened`.** `docs/setup.md`, Uploading files, the "With `chooser`" list,
the third bullet.
- **Evidence:** the bullet says "a page that opened it 4 900 ms after the click got `ok`, one that opened it at 5 100 ms
  got `TIMEOUT`". The record (`S7-run-record.md:117`) reads `opener-ms=5100 opened=no dialog=0`. The driver defines
  `opened` as "the late click opened a chooser at all" (`recipes/s12-r19-c.ts:72`). So at 5 100 ms the page's `click()`
  opened nothing, which fits transient activation having ended, as the sheet row in `e2e-test-plan.md:1838` notes.
- **Also:** the 4 900 ms leg is caught inside the call, not "after it ended". The edit also dropped the old qualifier "on a
  tab in the background", which widens the claim.
- **What still holds:** the row's pass rule is `dialog=0` in both legs, and that does support "shows no dialog".
- **Fix:** "a page whose click came 4 900 ms after the call's click was answered `ok` (the call caught it); at 5 100 ms the
  page's click opened no chooser at all and the call got `TIMEOUT`; no dialog showed in either (R19-CHOOSE-LATE, PASS)".
- **Who wrote it:** I could not tell. The fixer's report does not name this bullet, and the round-1 report did not flag
  it, but the sentence is in the round's diff.

**NITs.**
1. **The Superseded marker counts a new point as an old one.** The marker on "With `chooser`" says "Run 19 measured four of
   the points (HUMAN, LATE, FRAME, DISARM)". FRAME was not one of the old by-construction points; it was added in S8.
2. **One line lacks the `focusEmulation` exception.** The Troubleshooting bullet "`trusted:true` 'succeeds' but nothing
   happens" (setup.md ~:1400) says "since Step 12 the daemon holds the lock across the focus and the input" without the
   exception. NIT 6 named only :322 and README, so this is optional.

## 5. Handoff

R2-MINOR-1 is a one-sentence fix in `docs/setup.md`, and the NITs are optional. The doc-check findings outside the lane
stay with the session agent's close-out. No process was left running.
