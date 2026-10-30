# S2b verifier 2 — doctor and update, re-check after fix round 1

**Role:** verifier (`docs/agent-rules.md` §6), affected items only · **Model / effort:** Opus, medium · **Date:**
2026-10-30 · **Verdict: PASS** (MINOR 1–4, NIT-1, NIT-4 and both rulings confirmed fixed and pinned; no regression; two
new NITs, below, that do not block) · **Commit:** none (brief).

Read: the phase doc (§ S2, I2.2–I2.4, R4.1, STOP rules), decisions #427–#432, `S2b-verifier.md`; `S2b-fixer1.md` and
`S2b-builder.md` audited as claims. Main tree: read and run only. All mutations and runs happened in the scratch clones
`<scratch>\s2b-v\A` and `B`, which have their own `node_modules`; nothing was deleted across a junction (#220). Nothing touched port 9234, `~\.claude.json`,
Chrome, the extension or `reload-extension.ps1`. Evidence: `S2b-verifier2-counts.txt`, `S2b-verifier2-runs.txt`.

## Counts (main tree, HEAD 329b518 + S2b uncommitted)

- `npm run typecheck`: exit 0 (the chain ends with `tsc -p scripts/tsconfig.json`).
- `npm test`: **6089 passed, 255 files**, exit 0. The first verifier had 6083 / 255, so this is +6 (the fixer's five doctor tests and one update test).
- Build: `npm run build` ran twice in clone B, through update itself (V1, V2), and built daemon, mcp and extension.
  I did not rebuild the main tree. A rebuild would bump `extension\dist\sw.js`'s mtime and flip the user's own doctor
  heuristic to "may be older" with no reload done. The fixer's change touches no build input.

## Fix-by-fix

Red proofs: clone A held the main tree's S2b files byte for byte, and the two S14 files gave 34 passed. I then reverted
one fix at a time in `lib.mjs` and restored it after each run (`restored: true`; the file is identical to the main
tree's). Every revert turns exactly its own test red: **1 failed | 33 passed (34)**, 11 of 11 reverts.

- **MINOR-1 · confirmed.** The `extensionOlder` direction test is red when the comparison is inverted and also when the
  1 s allowance is dropped (`> resyncMs`).
- **MINOR-2 · confirmed.** The OK text now reads "extension resynced after the last build (a heuristic: it cannot tell
  the loaded build)" (`lib.mjs:192`). The old "reloaded" text turns its test red. The text claims nothing the daemon
  log can't support.
- **Ruling: an entry token equal to bridge.token is OK · confirmed.** The line is `ok`
  (`lib.mjs:170`), and changing it back to `hint` turns its test red. With this ruling, R4.1 can reach all green when the
  user-scope entry carries the `docs/setup.md` §3 env token.
- **MINOR-3 · confirmed.** When there is no token, `doctor.ts:36` returns `notoken` before any connect, and
  `lib.mjs:180` prints `HINT Daemon: not checked ... - run npm run setup`. Live run D1 printed exactly that, with
  nothing spawned and nothing connected.
- **MINOR-4 · confirmed.** With no `bridge.token`, `mcpDecision` returns `nofile` (`lib.mjs:85`) and never `differs`.
  Live run D2 (an entry token with no file) printed the HINT with the setup fix, and the probe used the entry's own
  token and port as the MCP would (9299, nothing listening there, so "not running"). `setup.mjs:94-95` reacts only to
  `differs` and `same`. It creates the file before it decides, so the new value can't
  surface there.
- **NIT-1 · confirmed.** `port` (entry `BRIDGE_PORT`, else 9234) reaches the Daemon-error fix and the Extension fix.
  Reverting either one turns the 9299 test red.
- **NIT-4 · confirmed, measured end to end.** `lib.npmCli` (`lib.mjs:214-217`) is the code under test. What each
  source gives on this machine:
  - **`npm run`:** `npm_execpath` = `<nvm>\installs\v25.2.1\node_modules\npm\bin\npm-cli.js`. It ends in `.js`, so
    the first branch wins.
  - **Beside node.exe:** `process.execPath` is the real install, `<nvm>\installs\v25.2.1\node.exe`, even though `where
    node` names the `.nodejs` shim. `npm-cli.js` exists beside it, so it is found with `npm_execpath` removed, from
    both Git Bash and PowerShell.
  - **Through PATH:** with execPath set to the shim dir, the PATH scan still finds the install's `npm-cli.js`. With
    an empty env it returns `null`, and update then stops with its FAIL line.

  This machine's nvm is not coreybutler's nvm-windows (`NVM_HOME`/`NVM_SYMLINK` unset; the shim dir holds `npm.exe`
  and no `npm.cmd`). I could not measure the other two layouts here, so this is by reading:
  - **nodejs.org installer:** `C:\Program Files\nodejs\` holds `node.exe`, `npm.cmd` and
    `node_modules\npm\bin\npm-cli.js`.
  - **nvm-windows:** `NVM_SYMLINK` is a link to `<NVM_HOME>\vX`, which has the same layout.

  Either way the beside-node.exe branch covers both. The unit test pins all four branches, and each of the three
  reverts is red.

  **End to end:**
  - **V1:** `npm run bridge-update -- --no-reload` on clone B, one commit behind with `.package-lock.json` aged: pull,
    `npm ci`, build, skip, **exit 0**.
  - **V2:** `node scripts/bridge/update.mjs --no-reload` from PowerShell with `npm_execpath` absent (the case that
    failed before the fix): `npm ci` and build ran, **exit 0**.
- **setup.mjs (S2a, committed) · no weakness of this kind.** Outside `npm run`, `setup.mjs:22-34` uses its own
  PATH+PATHEXT `which`, so it finds `npm.exe` here. A `.cmd` shim runs quoted with `shell: true`. Under `npm run` it
  uses `npm_execpath`. It works on both layouts, but it is a second npm lookup beside `lib.npmCli` (NIT-A).

## Token rules (I2.2)

The fixer kept the token rules: the doctor compares tokens by equality only, the new lines carry no value, update never
reads the token, and npm runs as `node npm-cli.js <args>` with no shell and no token in its arguments. An equality scan
(`<scratch>\s2b-v\scan2.mjs`, which prints only clean or HIT) checked for the main tree's `bridge.token`, clone B's
dummy token and the user name. It covered the S2b sources, both test files, every `S2b-fixer1-*` file and the three
verifier2 files, and all of them are clean.

## Exit criteria

- **I2.2:** met, by the scan above.
- **I2.3:** met. Every failure case has a FAIL line with a fix, and the two corner cases that had wrong fixes (MINOR-3,
  MINOR-4) are now right and pinned.
- **I2.4:** met: V1 exited 0 under `npm run`, and V2 exited 0 straight from node.
- **R4.1 reachability:** met. An all-OK path exists (the "every part working" test, and run G2 in the first verifier
  report), and the equal entry token is now OK, so `docs/setup.md` §3's shape no longer leaves a HINT. On the user's
  machine it still needs the user-scope entry for `<repo>` with no local leftover, and a resync after the last
  build (#432). A HINT still gives exit 0.

## Findings (new this round; none blocks)

**NIT-A · `scripts/bridge/setup.mjs:22-34` vs `lib.mjs:214-217`: two npm lookups.** Setup uses `which` with
`shell: true` for a `.cmd` shim. Update uses `npmCli`, which runs node with `npm-cli.js` and no shell. Both work, but
they can drift apart. Fix (later, S5 or a tidy): have setup use `lib.npmCli` too. Setup's `npm --version` prerequisite
line would then come from the same source.

**NIT-B · `lib.mjs:215`: any `.js` `npm_execpath` is trusted.** Under Yarn classic (`yarn bridge-update`),
`npm_execpath` is `yarn.js`, so update would run `yarn ci`. pnpm's is `pnpm.cjs`, which falls through safely.
Undocumented use, so this is only a note. Fix if wanted: also require `path.basename(...) === "npm-cli.js"`.

## Deviations

Main-tree `npm run build` was not re-run, as explained under Counts (the build ran in clone B, unchanged inputs). Scratch
clone A now carries two scratch commits (`a05573a` S2b fix1 files, `8e5b588` a dummy commit), and clone B is at `8e5b588`.
