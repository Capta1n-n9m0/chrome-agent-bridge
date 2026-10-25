# S5-sheet fixer, round 2

**Model:** Claude Sonnet 5.5. **Verdict:** DONE. Lane: `docs/e2e-test-plan.md` §4.23 only (the UP-L1 row, line 1493). No commit. Nothing else touched; I did not run the matcher or read source.

- **M1:** the UP-L1 Steps cell now opens with a preflight (ledger, before the first call, since UP-L1 precedes UP-0). A helper `foundcheck` runs `<ROOT>\s11-1k.bin` and `<OUTSIDE>\s11-out.bin` through the gate's matcher (`extension/src/upload-paths.ts`) against the found Upload folders text. It prints only `FOUNDCHECK root=<allowed|not> outside=<allowed|not>`. The Expected cell gains `FOUNDCHECK root=not outside=not`. The Pass rule says either value `allowed` is a STOP before any change (choose another base folder), only the booleans are recorded, and the text is never printed. No new row.
- **N1:** the UP-L1 Pass rule now says `UPLOAD_REFUSED` proves the loaded extension has the Step 11 gate (S2's class `upload`), and that S3's handler is first proven by UP-6's K-notarget answer.

Not checked: the `\|` inside backticks in the table cell renders as a pipe in most Markdown renderers. Replace it with `/` if the viewer shows a backslash.
