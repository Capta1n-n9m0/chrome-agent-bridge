# S7-helpers-b fixer report, round 2 of 3

Model and effort: Sonnet 5.5, medium. Lane kept: the two test files, one comment in `recipes/s12-win-b.ps1`, this report.

## M28 (CAP_MARK pattern): killed
- The SDK does not export the marker text (`sdk/src/format/console-messages.ts:39` builds it inline), so I added the look-alike the verifier named to the CONCAP test: `… [truncated: 5 more lines, foo — narrow with level/limit]` expects `marker=no`.
- Mutant (`more lines,.* narrow with` in `CAP_MARK`): red before the fix per the verifier; after the fix the CONCAP SDK-text test fails under it (1 failed, 31 passed). `s12-forms-b.ts` restored, `sha256sum -c` OK.

## P6 (UIA search scope): killed
- `recipes/test/s12-ps-b.test.ts`, group `search`: a PowerShell class stub `UiaStub` stands in for `$S9UIA`. `FromHandle` prints `FH <hwnd>` and returns a stub root whose `FindAll` yields a "Customize and control" button only for window 30; `RootElement` is a different stub root. New check: the `FH` lines are exactly the search list (`7`, `30`, twice over two finds) and the match in the new window is returned. New mutant B13b swaps `FromHandle` for `RootElement`.
- Under the mutant the real-file check goes red (no `FH` lines, so the check fails; vitest showed the search group and B13b red). `s12-win-b.ps1` restored, sha256 identical.

## NIT (wording)
`s12-win-b.ps1` header: "sends NO key" now reads "sends no opening key", plus a line: the only key it can send is a closing Escape to window X after a missed step. `Open-S12DevToolsMenu`'s own comment already said "Escape sent".

## Outputs
- `npx vitest run recipes/test`: 1302 passed, 57 files (before: 1301; +1 for B13b; the M28 case and the P6 check are added assertions inside existing and new tests).
- All seven `npx tsc --noEmit -p recipes/tsconfig*.json`: exit 0. `npm run typecheck`: exit 0.
- Size: code 116 + 96 = 212 (cap 400); tests 265 + 232 = 497 (cap 600).
- Not committed. No other files touched.
