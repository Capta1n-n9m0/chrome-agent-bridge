# S3 fixer, round 1 (sonnet, medium)

Fixed all five findings of `S3-verifier.md`; lane: `examples/list-tabs.ts` header and `S3-doc-section.md`.

- MINOR 1: step 1 is now a PowerShell block: `npm init -y`, `npm pkg set type=module`, `npm install <repo>\sdk tsx`.
- MINOR 2: the example's header lists the same commands as separate lines, no `&&`, with the `type=module` step.
- NIT 1: step 4 gives `node <repo>\node_modules\typescript\bin\tsc -p .`.
- NIT 2: one placeholder, `<repo>` (docs/setup.md's convention), in the section and the header.
- NIT 3: "changes nothing" became "changes no tab and no setting; `connect()` may start the daemon, or hand it over to a
  newer build, as any client does" (section and header).

Followed the fixed section once from PowerShell in a new scratchpad folder: init, `pkg set`, install, typecheck of the
example (NodeNext, strict) all exit 0; junction removed by `cmd /c rmdir`, `<repo>\sdk\src` intact, folder deleted.
The example was not run against the bridge. Evidence: `S3-fixer1-evidence.txt`. No commit.
