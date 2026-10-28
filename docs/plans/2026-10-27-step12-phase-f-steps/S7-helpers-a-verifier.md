# S7-helpers-a verifier report

Model and effort: Opus 5.5, medium. Role: verifier (`docs/agent-rules.md` §6). I read and ran things and edited nothing in the
repo except this report and `S7-helpers-a-verifier-evidence.txt`. Mutants ran on a copy outside the repo. No Chrome, no
daemon, no port: the fixtures were run in jsdom inside node. Every process I started has exited. No commit.

## 1. Verdict
**FAIL.** One MAJOR finding: #351 (4) (c) is not met by what was built. Everything else passes or carries only MINOR or NIT
findings.

## 2. Exit checks re-run (main tree, uncommitted slice as given)
| Check | Result |
|---|---|
| `npx vitest run recipes/test` | 55 files, **1237 passed**. The new file holds 26 tests, so the base was 1211, as the builder says. |
| `npm test` | 221 files, **5137 passed**, exit 0 |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 (`built extension → dist/`) |
| seven `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all exit 0 |
| `node scripts/doc-check.mjs` | exit 0. No dead-path section and no S12 path listed. The count lines (25 tools / 28 methods vs the docs) and the decisions.md budget line do not come from this slice. |
| `git status --short` after build | only the slice's files (plus this report and the evidence file) |
| Size | code 357 added lines (forms 135, rules +2, ps1 +3/-1, playground +17, fixtures 200), tests 254. Under the 400 + 600 cap. |
| Forms (1)–(13) by key and order | I printed the parser's templates from §4.27 (`tpl.mjs`, evidence §1). It finds 15 templates and drops none: (1) expanded with and without `rerun=<k> `, two each for (2) and (3), one each for the rest. Each matches §4.27:1780 character for character. |
| Discriminating tests | Of 33 mutants, 30 fail (evidence §1): wrong key, `:` instead of `=`, swapped order, dropped key, extra `args-text`, `rerun` moved or dropped, wrong head token, `absent`→`none`, `present`→`yes`, data values printed. With every `s12-forms.ts` export stubbed to throw, 17 tests fail and 9 pass; the 9 are the parser self-tests, the PS text test and the static fixture tests. |
| Fixture behaviour (jsdom, evidence §2) | `con`: 10 messages in the order 8 log, warn, error, then one uncaught error from `setTimeout`, `__s12={logged:10,thrown:1}`, `__s12eff` absent. `rej`: two rejections, one handled later. `big`: 1 000 000 chars, sentinel 0. `tick`: 1 000 ms apart, the throw 8 ms after the log, index-matched. `frame`/`frameoop`: two messages each, iframes at `f.s12site.localhost:8081` and `127.0.0.1:8081`. `notea`: script from `s12blk.localhost:8081`; message 1 is 26 chars and holds the sentinel; message 2 is 3 000 chars starting `s12-notea-long`. `noteaok`: `{e: Error("s12-noteaok")}` then the sentinel alone. `nav`: 3 messages, navigation at about 400 ms; `nav2`: 2 messages. `cap`: 200 messages, all 2 000 chars, the sentinel ending at index 28. Chooser ids, `hidden`/`multiple`/`disabled`/`webkitdirectory` and the click counts are as part B lists them; the late timers fire between 4.7 and 5.2 s (`late49`) and between 4.95 and 5.45 s (`late51`). Playground: no `__s12` without the query; `as` beats about 10 per s; `g2a`/`g2b` have `#tb` and a button that counts its clicks; `#counter` is kept. |
| No URL, text, name or path printed | Holds. `conLine` and the other forms print counts and fixed words only. `dataField` prints key names, and a key that is not a plain name prints as `other`. The mutant that printed data values was caught. |
| #351 (4) (a) | Holds. I ran `Format-S12OptO2Note` in PS 5.1: `Shown=$false, PolledMs=15136` prints `O2 did not show the saved text in 15136 ms`; `Shown=$true` prints nothing. |

## 3. Findings

**MAJOR-1 — #351 (4) (c): the guard cannot prevent Run 18's `WARN row printed twice: RULES`, and it would drop distinct lines.**
- Where: `recipes/s12-forms.ts:120-135` (`createPreflightGuard`); its test, `recipes/test/s12-forms.test.ts:207-215`; the builder's Handoff (c).
- Evidence: the aggregator counts `ROW <id> <verdict>` lines (`recipes/s11b-r17b-rules.ts:153-164`). In Run 18's record the WARN came from **`ROW RULES PASS: RULES 0` at R18-0 (`S1-live-record-liveB18.txt:4`) and again at R18-RESTORE (`:266`)**, which gave `WARN row printed twice: RULES` (`:277`). The doubled preflight set appears only in the stdout evidence (`S1-live-evidence-liveB18-att1.txt:32-58`), which the aggregator does not read.
- Three problems follow from that:
  - The guard keys on the first token, so every `ROW …` line passes through untouched.
  - The guard lets the restore phase print by design ("R19-RESTORE's `RULES 0` prints").
  - Routed as the handoff says, the same R19-0 pass would also lose its second, different `STATE … uploadfolders valid=0 invalid=0` line and its second `TOGGLE` line (both are in the record at `:5-8`).
- The handoff's instruction to "make the Run 18 `rows18` call once" does not address the cause.
- Suggested fix:
  - Address the measured cause. Either the restore prints `RULES 0` without a second `ROW RULES` line (for example a `CHECK R19-RESTORE rules …`), or the dedupe keys on the `ROW` id per slice, which is what the aggregator counts.
  - Dedupe only identical lines, never by first token.
  - Add a test fed with Run 18's actual record lines 1-17 and 265-266, asserting that the aggregator (`rows18`) prints no WARN.

**MINOR-1 — the form matcher does not check positional alternatives.** `recipes/test/s12-forms.test.ts:45`: a positional token such as `<ok|CODE>` accepts any non-empty value. The mutant `ARGS <row> <label> answer=ok …` passed all 26 tests (evidence §1, "args answer free text"). Suggested fix: check a positional `<a|b|CODE>` with `altOk`, as keyed values already are.

**MINOR-2 — `sentinel=` and `ordered=` are not discriminated.** Two mutants survived: `sentinel` replaced by the entry count, and `ordered` made strict (`<`). The test entries all hold the sentinel and never share a timestamp. R19-CON-BIG expects `sentinel=0`, and ten messages logged in one synchronous loop can share a timestamp. Suggested fix: add an entry without the sentinel, and a pair with equal `ts` that must print `ordered=yes`.

**MINOR-3 — R19-UP-OPT keeps the contradicting ROW wording.** `recipes/s11b-rules.ts:816` still says `O2 showed the saved text after <n> ms` when `shown=no`, because the patch feeds it `PolledMs`. That is Run 18's helper note 2 (`S1-run-record.md` §5), which #351 (4) names "the UP-OPT row's wording". §4.27's contract (a) only asks for the extra line, so the slice meets the sheet. The contradiction stays and is for the record. Suggested fix: when not shown, word the row text as `did not show within <n> ms`; this moves no verdict.

**MINOR-4 — the `Verdict` type of `settleConsoleClauses` is narrower than the rows need.** `recipes/s12-forms.ts:111`: only PASS, NOT MEASURED, FAIL and STOP. R19-CON-FILE can be `NOT RUN`, R19-CON-NOTEA `RECORD`, and a clause of R19-CON-FRAME `NOT DISCRIMINATING`, all in §4.26's ROW form. Suggested fix: widen the type with a ranking, or have the runner keep those rows out of the call. This also affects the runner (-d).

**NIT-1 — the builder's red-first count does not reproduce.** The builder reported `22 failed` of 26 on the stub. The final test file gives 17 failed and 9 passed (18 with `optO2NoteLine` also stubbed). The builder named 4 passing tests; there are 9. The test-side edits made after the red run explain the difference. The test is still red on a stub.

**NIT-2 — the after leg of `bannerConVerdict` returns FAIL when the after leg reads `seen` at an idle under 20 000 ms** (`recipes/s12-forms.ts:102-103`). That reading is not a clean measurement. NOT MEASURED would match the treatment of the negative leg.

**Wording in §4.27 (for the record; not edited):**
- W1. Several expected `CON` lines leave out `cut=` between `maxlen` and `uncaught-first`: R19-CON-1, -2 and -REJ (`docs/e2e-test-plan.md:1792-1794`). Fix round 2 (c) (`:1810`) allows only `ordered`, `newest` and `marker` to be left out. R19-CON-NOTEA (`:1802`) writes `marker=0 url=0 stack=0`, which is not form (8)'s order.
- W2. Part B (`:1812`) says the late page records `late.opened=<yes|no|error>`, while the reporter shape it gives is `{…, late}`. The fixture sets `__s12ch.late`. The runner (-c/-d) must read `late`.
- W3. As the builder noted: R19-CON-BANNER's `ROW … <PASS|FAIL>` sits beside a NOT MEASURED outcome, and (13) `DAEMONLOG <row>` (part A) and (28) `DAEMONLOG <slice> … args-text` (part B) are both defined.

**Audit of the builder's other claims:**
- (b) belongs to the runner: agreed. Only the runner orders the rows against R19-LOGS, and `settleConsoleClauses` is a usable piece once the runner has the console scan result (subject to MINOR-4).
- (c) belongs to the runner: not agreed as built (MAJOR-1). The cause sits in the reused restore and preflight lines plus the aggregator, not in the order of runner calls.
- Chooser pages built here: confirmed.
- `s12-chooser.js`: the `__s12ch.files` getter is enumerable, so JSON reads include it. Its key order differs from §4.27's list, which is harmless.

## 4. Proposed decisions
None.

## 5. Left behind
Nothing runs. My scratch copies and probes (`mut/`, `mutate.mjs`, `m2.mjs`, `m3.mjs`, `tpl.mjs`, `fx.cjs`) are in the session scratchpad, outside the repo. The mutant copy of `s12-forms.ts` there was restored and is byte-equal to the repo's.
