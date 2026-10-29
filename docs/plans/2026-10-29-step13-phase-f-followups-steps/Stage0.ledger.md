# Step 13 Stage 0 — ledger (append-only)

- 09:28Z · Stage 0 · started (second step agent; the first died before writing) · start commit ff121a4 · scratch root: the session scratchpad's stage0 folder (outside the repo) · nothing running · next: auditor1, auditor2, measurer1, measurer2 in parallel
- 09:29Z · auditor1, auditor2, measurer1 (scratch …/stage0/m1, ports 8080–8085), measurer2 (…/stage0/m2, 8086–8089) · started, all Opus medium, background · outputs Stage0-{auditor,measurer}{1,2}.md · next: wait for all four, then the Stage0.md report and the verifier
- 09:39Z · auditor1 · done (1 CRITICAL F-1 openerTabId fallback, 6 MAJOR) · Stage0-auditor1.md, stage0-audit.md, stage0-a1-*.txt · nothing left running · next: wait auditor2, measurer1, measurer2
- 09:40Z · auditor2 · done (0.6 (a); 4 MAJOR plan-side) · Stage0-auditor2.md, stage0-audit-2.md, stage0-a2-*.txt · next: wait measurer1, measurer2
- 09:45Z · measurer2 · done (K: string crossing keeps order; CON-NOTEA not cheap; D1/D2 no refusal; flagless NOT MEASURED) · Stage0-measurer2.md, stage0-m2-*.txt · its PIDs all gone, own scratch folder deleted · next: wait measurer1
- 09:49Z · measurer1 · done (onCreated first 60/60, gap ≤0.6 ms; sourceTabId 60/60; reload enabled, warnings unchanged, flagless measured) · Stage0-measurer1.md, stage0-m1-*.txt · its PIDs gone · next: write Stage0.md, then verifier
- 09:52Z · Stage0.md · written (verdict pending) · next: verifier (Opus), scratch …/stage0/v, ports 8080–8085
- 10:06Z · verifier · PASS-with-notes (5 MINOR, 3 NIT; notes applied as text) · Stage0-verifier.md, stage0-v-*.txt · its PIDs gone · next: committer (Sonnet)
- 10:06Z · committer · done, commit 8f23ac9 (33 files) · Stage 0 closed · nothing running
