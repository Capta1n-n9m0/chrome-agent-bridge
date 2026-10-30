# S3 builder report (sonnet, medium)

1. **Verdict:** DONE
2. **Outputs:** `examples/list-tabs.ts` (28 lines; a top-level folder outside every tsconfig and the vitest glob),
   `S3-doc-section.md` (draft for S5), `S3-builder-evidence.txt`. `npm test`: 6089 passed, 255 files (unchanged).
   `npm run typecheck`: exit 0.
3. **Measured:** `npm install <repo>\sdk` brings no tsx (no `.bin`; the SDK's own deps are not fetched). `npx tsx`
   would fetch tsx from the registry on every first use, so the doc says `npm install <repo>\sdk tsx`, once. Consumer
   `tsc --noEmit` with the repo's tsc: exit 0. Run against the user's bridge from the outside folder: exit 0, 1 tab
   listed, stderr empty (S3.1 met). Read-only: only `client.tabs()`. Output file deleted. Junction removed with
   PowerShell `cmd /c rmdir`; `sdk\src\index.ts` still present; the consumer folder was left in the scratchpad.
4. **Deviations:** none. **Location choice:** `examples/`, kept as briefed.
5. **Proposed decisions:** none. 6. **Findings:** a consumer needs `"type":"module"` for top-level await.
7. **Handoff:** S5 places the section in docs/setup.md and may mention `examples/` in README. Modified
   `journal.md` is not mine.
