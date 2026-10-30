# S5 fixer round 2

R1 fixed in docs/setup.md, "Install on a new device": step 2 is now "Follow the next steps setup prints", with a nested list 1-6 matching the text of `nextSteps` in scripts/bridge/lib.mjs. The old outer steps 3-5 are folded in; the doctor is now step 3. The bracketed "calls it step 4" note is gone; the clipboard question now says "step 4 of the list below". README quick start cites no step number (checked). `node scripts/doc-check.mjs`: only the known test-count line in CLAUDE.md:113, no new findings.
