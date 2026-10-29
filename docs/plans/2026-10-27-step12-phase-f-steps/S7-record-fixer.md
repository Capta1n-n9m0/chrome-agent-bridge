# S7-record fixer report (round 1, docs)

Claude Sonnet 5.5, medium. Docs only; no code, no live run, no Chrome, no daemon, no port 9234; `wtv` not read. Edited only
`S7-run-record.md` (R) and the Run 19 entry in `docs/e2e-test-plan.md` (P, the hunk after the Run 18 entry). Line numbers are
those of the files after the edits.

## Per finding

- **MAJOR-1 (ARGS-3), fixed as FAIL, as the step agent ruled.** R:61 verdict FAIL, cause named: the sheet's Expected column asks
  that the MCP leg's result text contain the extension's JavaScript-off message; the driver follows it
  (`s12-r19-a.ts:439`); the MCP prints its own `JS_DISABLED:` line; so the reader is not wrong, the row text is (#195; #372's ND
  condition not met); `EFF` 1 to 1 recorded; not a product finding. Other places: R:35-36 totals; R:145-147 FAIL and ND lists and
  the slice-row line; R:206-208 finding 8; R:215-217 plan-side note 2; R:250-254 proposal (a) and its "Why"; R:275-280 judgment call
  2; R:293 judgment call 8; R:222 helper note 1 (ARGS-3 dropped from the printed `ROW FAIL` list, since the printed word now agrees
  with the rule). P: the totals, the FAIL and ND lists, the "Judgment calls and notes" paragraph ("five ND rows").
- **MINOR-1 (G2-2 clauses i, ii).** R:123 and judgment call 7 (R:284-288): now say (i) and (ii) are not printed as counts and rest
  on the driver's leg judge (`judgeTypeRound`, `s12-r19-c.ts:112-114`, `holderSeen` from `:474`; `LEG … roundN PASS` ×5,
  CE:455-463); the false "not read against the result" is removed.
- **MINOR-2 (56/58).** R:14-16: "56 table rows and 58 ids", the F-RAW row holds three ids; CLOSER's row-less probe is a separate
  sentence.
- **MINOR-3 (CON-FLOOR).** R:67 and plan-side note 1 (R:212-213) and judgment call 3: reworded to "the driver did not apply
  #361's pre-run note (instrument at fault)"; the "rule names no meaning / sheet check shown wrong" text is dropped. ND kept.
  P: same wording.
- **MINOR-4 (§5 errors).** P: "the six attempts that ran to the end print `stop-return=0`"; the chooser sentence now reads "after
  CHOOSE-4's calls and CHOOSE-DISARM's re-armed click Chrome's own dialog opened ...; the other rows print `dialog=0`". R:119
  (CHOOSE-4 row) already said what CE:332-340 show and was left. R:177 (R7.6 "Attempts that ran to the end print `stop-return=0`")
  makes no count and was left.
- **MINOR-5 (KEEP-1 poll-ms).** R:84, plan-side note 6 (R:219-220), judgment call 4: state the line-form breach of the
  pre-registered `poll-ms=<p<=250>`, that the banner-gap clause is NOT MEASURED at that resolution (already ND by the sheet), and
  that the verdict rests on `answers=5/5`.
- **NIT-1.** R:78: DEVPROBE marked "(row-less; probe, not counted)".
- **NIT-2.** R:65: CON-NOTEA's cause marked "taken from Stage 0 and the code: no Run 19 line prints the entry's text".

CON-4 stays ND (R:66): added that the sheet gives it no MCP text and the reader chose the extension's (verifier's contrast).

## New totals (re-added from R §1)

- Row level (58 ids): PASS 42, FAIL 5 (ARGS-1, ARGS-3, CON-NOTEA, CHOOSE-KEPT, G2-1), ND 5 (CON-4, CON-FLOOR, ARGS-OLD, VERSION,
  CHOOSE-REFUSE), NOT MEASURED 3, RECORD 3, NOT RUN 0: 42+5+5+3+3 = 58.
- Slice-rows (74): A 26 (PASS 21, FAIL 3, ND 2), B 19 (15 / NM 3 / RECORD 1), C 21 (16 / FAIL 2 / ND 1 / RECORD 2), D 4 (3 / ND 1),
  E 4 (3 / ND 1) = PASS 58, FAIL 5, ND 5, NM 3, RECORD 3 = 74.

No findings disputed. Public-repo rule: no names, paths or URLs added.
