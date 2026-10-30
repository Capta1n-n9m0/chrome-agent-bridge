# S5: proposed lines for the root CLAUDE.md § Commands

For the session agent to apply (S5 builder did not edit CLAUDE.md). Add after the `npm run recipe` line:

```bash
npm run setup        # one-command install on a Windows device: prerequisites, npm ci + build when stale, bridge.token, `claude mcp add -s user`, the Chrome steps; exit 0/1/2; `-- --dry-run`, `-- --replace-mcp`
npm run doctor       # one line per part (OK / HINT / FAIL with its fix); read-only; the extension-build line is a heuristic (#432)
npm run bridge-update  # git pull --ff-only, npm ci/build when needed, recipes/reload-extension.ps1, the /mcp hint; `-- --no-reload`
```

Also:
- `npm run typecheck` now ends with `tsc -p scripts/tsconfig.json` (the three commands' sources); it covers
  `scripts/bridge/` and `scripts/test/`, and the recipes typechecks stay separate.
- `examples/list-tabs.ts`: the one-file example for a script outside the repo (a `file:` dependency on `sdk`, run with
  `npx tsx`; docs/setup.md, Scripts from any folder).
- Replace "`docs/setup.md` §4" in the "After `npm run build`" sentence with "`docs/setup.md` Manual install §4"; new
  installs start at "Install on a new device", the first section of `docs/setup.md`.
- Test count to write: 6089 tests in 255 files (the S5 verifier's `npm test` in a new clone, S5-verifier.md §2; 9 known CRLF reds in `recipes/test/s11-r16-runner.test.ts`).
