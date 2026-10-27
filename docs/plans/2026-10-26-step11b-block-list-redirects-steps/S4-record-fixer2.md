# S4-record fixer round 2

Finding: R17-UP-L1 was PARTIAL, a sixth word. Ruled FAIL by the step agent (cause cited: the pass rule's "console-scanned" clause was not met by the row, RD-LOGS never ran after the RD-BACK-EMPTY STOP, #307; every refusal clause held; runner 8's offline scan read 0).

Edits (no expected text touched):
- S4-run-record.md: PARTIAL definition removed (five words again); R17-UP-L1 row now FAIL with the cause and evidence kept; counts paragraph now PASS 14, FAIL 4 (RD-BACK, RD-BACK-SAMEDOC, RD-DISARM, R17-UP-L1), RECORD 4, NOT RUN 15, STOP 1 = 38, with a clause naming the earlier drafts.
- e2e-test-plan.md Run 17 entry: Rows line, FAIL list, and the differences note changed the same way.

Checks: grep PARTIAL in the record file returns nothing; the only PARTIAL left in the plan is the draft-history note. Counts agree in both files. Scan and doc-check: see the parent's return.
