# S8-fixer2: fix round 2 of the Step 12 docs change

Claude Sonnet 5.5, medium. Lane: `docs/setup.md` and this report. Nothing committed.

- R2-MINOR-1 closed (Uploading files, "With `chooser`", third bullet). It now says: the page's click 4 900 ms after the
  call's click, call answered `ok`; at 5 100 ms the page's click opened no chooser at all (`opened=no`), call `TIMEOUT`;
  no dialog in either (`dialog=0`; R19-CHOOSE-LATE, PASS; `S7-run-record.md:117`). "On a tab in the background" is not
  restored: the row does not record the tab's state (it records window X in front), so it would exceed the measurement.
  I did not write "the call caught it", which is an inference; only the `ok` answer is recorded.
- NIT 1 closed: the Superseded marker now says Run 19 measured three of the old points (HUMAN, LATE, DISARM) and added
  FRAME.
- NIT 2 closed: the Troubleshooting bullet now says "(not for a call sent with `focusEmulation`)", matching
  `daemon/src/methods.ts:102`.
- No finding disputed.
- `node scripts/doc-check.mjs`: exit 0 (same out-of-lane findings as round 1).
