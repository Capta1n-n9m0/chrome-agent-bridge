# Step 14 · Stage 0 — spec audit and measurements

**Role:** auditor/measurer (Stage 0). **Model / effort:** Opus, medium. **Date:** 2026-10-30. **HEAD:** `49e1908`.
**Phase doc:** `docs/plans/2026-10-30-step14-phase-g-own-devices.md` (cited as "PD:line").
**Evidence:** `stage0-clone.txt`, `stage0-doccheck.txt`, `stage0-mcp-cli.txt`, `stage0-shell.txt`, `stage0-clipboard.txt`,
`stage0-sdk-import.txt` (this dir). `<repo>` = the main tree, `<scratch>` = the session scratchpad, `~` = the home folder.
Scanned: no token, no user name, no absolute user path in any of them.

## 1. Verdict

**DONE.** Z.1 holds: each proposed decision 0.2–0.7 is kept or changed below, with the measurement behind it. Two
CRITICAL and four MAJOR findings change how S2 and S4 must be briefed; none blocks the phase.

## 2. What was measured (all on this machine; the user's setup untouched)

| What | Command (evidence) | Result |
|---|---|---|
| Fresh clone | `git clone <repo> <scratch>\clone`; `npm ci`; `npm run build` (`stage0-clone.txt`) | exit 0 / 0 / 0; 3 s, 20 s, 7 s. `npm ci` prints "16 vulnerabilities (8 moderate, 5 high, 3 critical)". The clone's `node_modules/@bridge/*` are junctions into the clone itself (#220 kept). |
| Bundles | `sha256sum` of `daemon/dist/index.js`, `mcp/dist/index.js` | byte-identical between `<repo>` and the clone at the same HEAD: a same-commit clone's SDK knock sees the same daemon build and never hands over. |
| Contract tests on port 0 | `npm test` in the clone | exit 1: **6021 passed, 9 failed, 6030 total; 250 of 251 files passed**, 161 s. All 9 failures are in `recipes/test/s11-r16-runner.test.ts` (its function regex wants `\n}\n`; the clone checks `.ps1` out with CRLF under `core.autocrlf=true`). This is the known fact in `recipes/CLAUDE.md` ("A scratch worktree checks `.ps1` files out with CRLF"), not a regression. Every daemon/SDK/MCP contract test passed. |
| Counts | `node scripts/doc-check.mjs` (`stage0-doccheck.txt`) | exit 0; **tools 25 · router methods 28 · codes 27** = PD:37. "26 on the wire": `shared/src/codes.ts:3` says 27 = 26 on the wire + `NOT_CONNECTED` (doc-check does not compute it). |
| 0.3 shell | `powershell -NoProfile -Command …`, and the User + Machine PATH from the registry (`stage0-shell.txt`) | PowerShell **5.1.26100**; `node` v25.2.1, `npm`, `git` 2.52, `claude` 2.1.314 all found, also on the registry PATH (a new login shell has them). Execution policy: only `CurrentUser = RemoteSigned`, every other scope Undefined. npm here is nvm's `npm.exe`; no `npm.cmd`/`npm.ps1`. |
| 0.4 clipboard | Node `spawnSync("clip.exe", {input})`; Node → `powershell -NoProfile` `Set-Clipboard` with the value on **stdin**; PowerShell `Set-Clipboard` directly; read back by `Get-Clipboard -Raw` (`stage0-clipboard.txt`) | All three: exit 0, read back exactly (14 of 14 characters, no trailing newline). No profile needed. **Clipboard history is ON here** (`HKCU\Software\Microsoft\Clipboard EnableClipboardHistory=1`). |
| 0.4 Options page by command line | read only (recipes/CLAUDE.md, `recipes/reload-extension.ps1:10-11`) | Not run (never `chrome.exe` without its own `--user-data-dir`, #297). Measured fact: `chrome.exe --new-window chrome://…` lands on a New Tab page; a bare `chrome.exe` hands off to the running Chrome. A `chrome-extension://<id>/options.html` command-line URL is **not measured**. In any case at install time the extension is not loaded yet, so there is no Options page to open. |
| 0.6 SDK from outside | three consumer folders in `<scratch>`, a probe that imports `connect` and `@bridge/sdk/token` and checks the lookup without printing the token (`stage0-sdk-import.txt`) | see §3, 0.6 |
| `claude mcp` | `--help` of `mcp`, `mcp add`, `mcp get` only; `claude.exe` read by `grep -a` (`stage0-mcp-cli.txt`) | `add` default scope is **local**; `-s user` needed. `get`/`list` **health-check** the server (start it). No `--json` output. `CLAUDE_CONFIG_DIR` moves `.claude.json` to `<CLAUDE_CONFIG_DIR>\.claude.json` (from the bundle's code; not run). |

## 3. The proposed decisions

### 0.2 Form and order (#421) — **KEEP, with one change to the order's footing**
Two levels and the stage order hold. S1 beside S2 holds on files (S1: `sdk/src/error.ts`, its tests, one recipes
static test; S2: new files only). Change: S4 needs S2 **and** S3 done; S5 last. The split is in §6.

### 0.3 Script language (#422) — **CHANGE: Node for all three commands, no PowerShell file at all for install**
Measured: node/npm/git are on the registry PATH, so `npm run <script>` works in any new shell; PowerShell is only
needed for the clipboard and the reload, and both are reached from Node by `spawnSync` (clipboard: `clip.exe`, measured;
reload: `powershell -NoProfile -ExecutionPolicy Bypass -File recipes\reload-extension.ps1`, as today). A `.ps1` entry
point would meet the execution policy (here `RemoteSigned` for the user; a fresh Windows 11 client defaults to
`Restricted`, not measured here). New constraints the doc did not state (findings C1, M3):
- the install entry runs **before** `npm ci`, so it is plain `.mjs` with Node built-ins only (no tsx, no deps);
- no npm script may be named `install`, `preinstall`, `postinstall`, `prepare` or `update`-like lifecycle names: use
  e.g. `npm run setup`, `npm run doctor`, `npm run bridge-update`.

### 0.4 The token reaches the extension unprinted (#423) — **KEEP the clipboard, CHANGE the details**
Mechanism: `clip.exe` from Node with the token on stdin (measured: exact, no newline, no profile, no argv). Opening
the Options page is not possible at install time (the extension is not loaded yet) and is unmeasured from a command
line, so it is dropped. Added (finding M4): Windows clipboard history is ON on this machine, so a plain copy lands the
token in Win+V history (and cloud clipboard where on). Proposed: the install asks before copying, says the token is on
the clipboard, waits for Enter after the paste, then **clears the clipboard** (`clip.exe` with empty input); S2 measures
whether a copy can be kept out of history (the `ExcludeClipboardContentFromMonitorProcessing` format through .NET from
PowerShell 5.1) and uses it only if measured. The doc's "never printed" also covers `Set-Clipboard -Value <token>` on a
command line (visible in the process list): the value goes on stdin only.

### 0.5 The MCP entry (#424) — **KEEP `claude mcp add -s user`, CHANGE how the existing entry is read**
- Read the entry from `~\.claude.json` (top-level `mcpServers`; and `projects[<path>].mcpServers` for a local-scope
  leftover) as JSON, read-only. Not `claude mcp get`: it health-checks, i.e. starts `node mcp\dist\index.js`, which
  connects to (or spawns) the daemon (finding M5).
- Compare the path normalized (case, `/` vs `\`, trailing slash). An existing entry that carries `env.BRIDGE_TOKEN`
  (the old `docs/setup.md` §3 told users to) wins over `bridge.token`: the doctor compares the two **by equality only**,
  never printing either, and says which wins (finding M6).
- Always pass `-s user` (the default is `local`). Register as `claude mcp add -s user chrome-agent-bridge -- node
  <repo>\mcp\dist\index.js`, no `-e BRIDGE_TOKEN`.
- S4's rehearsal: `CLAUDE_CONFIG_DIR=<scratch>\claude-config`; the install takes its config path from the same
  variable (so its JSON read follows the CLI); first a read-only `claude mcp list` under that variable shows an empty
  list, then the run. If `CLAUDE_CONFIG_DIR` does not isolate it, S4 stops (G14-2).

### 0.6 Scripts from any folder (#425) — **CHANGE: the `file:` dependency is the documented way**
Measured (`stage0-sdk-import.txt`), each from a folder outside the clone:

| Way | resolves + runs under tsx | plain `node` | `tsc --noEmit` | token lookup | side effects |
|---|---|---|---|---|---|
| `file:` dep (`npm install <clone>\sdk`) | yes, exit 0 | **no** (`ERR_MODULE_NOT_FOUND …\connect.js`: the SDK is `.ts` with `.js` specifiers) | exit 0 | walks up from `<clone>\sdk\src` → `<clone>`; the dummy `bridge.token` found; `daemon\dist\index.js` found | a junction `node_modules\@bridge\sdk` → `<clone>\sdk`; recorded in `package.json` (`file:../clone/sdk`); the SDK's deps are **not** fetched from the registry (`install-links=false`) |
| `npm link` | yes | no | exit 0 | same | a **global** junction under npm's global root (no admin needed; undone with PowerShell `cmd /c rmdir`); nothing recorded in the consumer's `package.json`, so its next `npm install` drops the link |
| `<repo>/sdk/dist` | **does not exist** — the SDK has no build (`sdk/package.json` exports `./src/*.ts`) | — | — | — | — |
| (instead) import `<clone>/sdk/src/index.ts` by path | yes | no | exit 0 with `allowImportingTsExtensions` | same | none, but a path to the checkout in every script |

Proposed: **`file:` dependency, run with `tsx`** (`npx tsx script.ts`, or `node --import tsx` for long arguments,
recipes/CLAUDE.md). The token is found from the SDK's own location, not the script's, so a script anywhere finds the
checkout's `bridge.token`. Caveat to document (finding M7): the consumer's `node_modules\@bridge\sdk` is a junction
into the checkout; deleting the consumer folder recursively can follow it (#220) — remove it with `cmd /c rmdir` first.

### 0.7 Not in Step 14 (#426) — **KEEP**
Nothing measured argues for any of them. Add to the list: a build step for the SDK (plain-node import), and an
extension build id in the hello (finding C2's full fix; a protocol change, PD:37).

## 4. Findings

**C1 · CRITICAL · PD:26-28, PD:31 (an unnamed npm script).** An npm script named `install` is a lifecycle hook: `npm
install`/`npm ci` would run it on every install, and the update command (`npm install` inside) would recurse. Same for
`prepare`, `postinstall`. Evidence: root `package.json` scripts have none today; npm's lifecycle (external fact, not run).
Fix: name them `setup`, `doctor`, `bridge-update` (or a `scripts\bridge.mjs <verb>`); a unit test pins that no root
script uses a lifecycle name.

**C2 · CRITICAL · PD:29-30, PD:90 ("the extension connected and running the current build").** Nothing reports the
loaded extension's build. `daemon.status` (`daemon/src/route.ts:119-131`) returns `build` (the daemon's), `uptime`,
`extensionConnected`, `clients`, `port`, tabs, lock, safety; the hello's `features` (`shared/src/protocol.ts:54-63`)
stay inside the daemon (`daemon/src/intercept.ts:201-203`); `browser_status` prints only `Extension: connected`
(`mcp/src/tools/registry.ts:401-408`). Run 20 proved its build by driving a fixture tab (`recipes/s13-r20.ts:88-115`),
which the doctor must not do. Without a protocol change (PD:37) the doctor can say: connected yes/no; the daemon's build
equals `sha256(daemon\dist\index.js)` on disk; and, as a heuristic named as such, "the extension may be older than the
build" when `extension\dist\sw.js` is newer than the last `extension resync` line in `~\.chrome-agent-bridge\daemon.log`
(`daemon/src/intercept.ts:257`). Fix: amend PD:29-30 to that wording (R4.1 then reads "green" for these lines), or
accept a contract change (the session agent's call; conservative: the amendment).

**M1 · MAJOR · PD:67-68, PD:93.** `<repo>/sdk/dist` does not exist (no build script in `sdk/package.json`); the third
way is really "import `sdk/src/index.ts` by path". Plain `node` cannot run any of the three (`.js` specifiers on `.ts`
files). Fix: §3 0.6.

**M2 · MAJOR · PD:95-99 (S4), PD:31.** `recipes/reload-extension.ps1` drives the user's Chrome: it opens a window and
looks for a card whose ID is derived from **its own** `extension\` path (`reload-extension.ps1:7-9`). From a scratch
clone it finds no such card and exits 2 after opening and closing a window in the user's Chrome; with Chrome closed it
exits 2 at once (`:141`). So I2.4 ("update on the scratch clone ends with exit 0") needs the update to treat reload exit
2 as a printed hint (not a failure), and S4 must run the update with a no-reload switch (or `-DryRun`) so the rehearsal
never touches the user's Chrome. The real reload belongs to R4.1 time on `<repo>`, if at all.

**M3 · MAJOR · PD:52-55.** The install runs before dependencies exist, so its first part cannot use `tsx` or any
package; S2's pure logic must be importable by both the plain-Node entry and vitest (e.g. `.mjs` with JSDoc types under
`scripts\`, tests in `scripts\test\*.test.ts`, which the root `vitest.config.ts` `**/test/**/*.test.ts` already picks
up). Not in `npm run typecheck` (root `package.json`); S2 states how it is typechecked (`// @ts-check` + a
`tsconfig` like recipes', or none).

**M4 · MAJOR · PD:57-60.** Clipboard history is on here (`stage0-clipboard.txt`): a copied token outlives the paste in
Win+V history and, where on, the cloud clipboard. Fix: §3 0.4 (ask, clear after Enter, exclusion only if measured).

**M5 · MAJOR · PD:62-64.** `claude mcp get`/`list` health-check servers (help text, `stage0-mcp-cli.txt`): using them
for the "already registered?" test starts the MCP server, which knocks on (or spawns) the daemon. And `add`'s default
scope is local. Fix: §3 0.5.

**M6 · MAJOR · PD:60, PD:29.** Users set up from `docs/setup.md:42-56` carry `BRIDGE_TOKEN` in the MCP entry's env,
which wins over `bridge.token` (`sdk/src/token.ts:53-54`). The install "leaves alone" such an entry (PD:63), so a fresh
`bridge.token` and a stale env token would disagree, and the extension's token matches only one. Fix: doctor line
"MCP entry's token: same as bridge.token / differs (the entry's wins; remove its BRIDGE_TOKEN)", compared by equality,
never printed.

**M7 · MAJOR · PD:66-68 (doc of S3).** The `file:` way puts a junction to the checkout's `sdk\` in the user's script
folder; a recursive delete of that folder can follow it into the checkout (#220's mechanism). Git Bash's `cmd //c
rmdir` leaves a junction (recipes/CLAUDE.md, #364/#365). Fix: S3's doc says how to remove it.

**m1 · MINOR · PD:83-85 (S1).** The `Screenshot:` line is built in `sdk/src/error.ts:423` and printed by both the SDK's
`report()` and the MCP (`mcp/src/tools/registry.ts:318`), so S1 changes scripts' reports too (PD:36 names only the
MCP). `recipes/test/s12-r19-static.test.ts:61` pins the source text `` tail.push(`Screenshot: ${input.screenshotPath}`) ``
and will fail on any edit of that line: S1's file list must include it (a test-text update, not a loosening, if the
pinned behaviour is re-stated). `err.screenshotPath` must stay absolute: the MCP reads the PNG from it
(`registry.ts:324-326`). On Windows `os.tmpdir()` lies under the home folder, so tests that pass a temp dir and the real
`os.homedir` would see `~`: the `~` rewrite must use the injected `homedir` seam (`sdk/src/client.ts:96-97,225`), and
the existing expectations at `sdk/test/failure-report.test.ts:531,595` and `mcp/test/s5-cross.test.ts:230` must be read
for which home they inject. `recipes/s12-r19.ts:54` (`SHOT_LINE_RE`) still matches `~\.chrome-agent-bridge\failures\…`;
`recipes/s6-rules.ts:125` compares with the absolute path (a past wave's rule; not in `npm test` by itself).

**m2 · MINOR · PD:76-81, I2.1.** A fresh clone's `npm test` shows 9 red tests (CRLF `.ps1`, above). The install must
not run `npm test`; if the doc ever tells a reader to, add `*.ps1 text eol=lf` to `.gitattributes` or make that test's
regex CRLF-tolerant (a recipes change; not in Step 14's lanes unless the session agent adds it).

**m3 · MINOR · PD:26.** `npm ci` prints "16 vulnerabilities (… 3 critical)". On a new device that reads like a failure.
The install should pass `--no-audit --no-fund` or say why the line is there.

**m4 · MINOR · PD:29-30, PD:98.** `connect()` from the doctor spawns a daemon when none runs, and **hands over** a
running daemon whose build differs from `daemon\dist\index.js` on disk (`sdk/src/knock.ts:7-9,124`). Both are side
effects on the user's bridge. Proposed: the doctor knocks with a spawn that refuses (`connect({io: {spawnDaemon}})`)
and reports "daemon not running — it starts with the first client"; the build mismatch is reported, and only `update`
hands over. For S4: the scratch clone holds a **dummy** token (the real daemon then refuses its knock with close 4001,
`knock.ts:206`), so no rehearsal step can hand over the user's daemon; and a clone at a later commit with the real
token would.

**m5 · MINOR · PD:33, S3.1.** "Lists the tabs it may see" needs the real token and the real bridge, which a scratch
clone does not have (dummy token). S3.1 runs from a folder outside the repo with a `file:` dependency on `<repo>\sdk`
(the real `bridge.token` found from there), or it is part of R4.1.

**n1 · NIT · PD:102.** `docs/install.md` is optional ("or") and new; doc-check lists it as a planned path. Fine.

**n2 · NIT · `docs/decisions.md:192`.** doc-check reports #421–#426 as "Decision numbers with no entry" (8 lines):
its regex reads one `(#N)` at a heading's end, not a range (`scripts/doc-check.mjs:122-132`). Fix: one heading per
number, or a doc-check rule for ranges (session agent).

**n3 · NIT · `start-bridge.sh`.** A macOS-only zsh launcher with hard-coded Homebrew paths sits at the root; S5 should
drop it or say it is not the Windows way. `README.md:66-75` still says Step 13 is "not closed" (S5's README pass).

## 5. Proposed decisions

### 2026-10-30 · The three commands are Node scripts with non-lifecycle names
**Decided:** install, doctor and update are Node (`.mjs`, built-ins only for install) run as `npm run setup`, `npm run
doctor`, `npm run bridge-update`; PowerShell only through `spawnSync` for the clipboard and `reload-extension.ps1`.
**Why:** node/npm/git are on the registry PATH (measured); an `install` script is an npm lifecycle hook. **Instead
of:** `.ps1` entry points (execution policy) or `npm run install`. **Revisit if:** U.1 finds npm missing from a new
shell on another device. **By:** Claude (proposed)

### 2026-10-30 · The token goes to the clipboard by `clip.exe` on stdin, and the clipboard is cleared after the paste
**Decided:** the install copies `bridge.token` with `clip.exe` (stdin), says so, waits for Enter, then empties the
clipboard; no Options page is opened. **Why:** measured exact from Node with no profile; the extension is not loaded at
install time; clipboard history is on here. **Instead of:** `Set-Clipboard -Value` on a command line; opening the
Options page. **Revisit if:** S2 measures a history-excluded copy from PowerShell 5.1. **By:** Claude (proposed)

### 2026-10-30 · The MCP entry is read from the config file, written by `claude mcp add -s user`
**Decided:** read `<CLAUDE_CONFIG_DIR or ~>\.claude.json` read-only to decide; register with `claude mcp add -s user
chrome-agent-bridge -- node <repo>\mcp\dist\index.js`; replace a different entry only with a flag; report an env
`BRIDGE_TOKEN` that differs from `bridge.token` by equality. S4 sets `CLAUDE_CONFIG_DIR` to a scratch folder. **Why:**
`claude mcp get` starts the server; `add` defaults to local scope; an env token wins over the file. **Instead of:**
`claude mcp get` as the test. **Revisit if:** the CLI gains a read-only, no-health-check query. **By:** Claude (proposed)

### 2026-10-30 · Scripts outside the repo use a `file:` dependency on `<repo>\sdk`, run with tsx
**Decided:** `npm install <repo>\sdk` in the script's folder, `npx tsx script.ts`. **Why:** measured: resolves,
typechecks, finds the checkout's `bridge.token` from the SDK's own folder, records the dependency, fetches nothing
from the registry, leaves no global state. **Instead of:** `npm link` (global junction, lost on the next `npm install`),
importing `sdk/src` by path; `sdk/dist` does not exist. **Revisit if:** the SDK gets a build. **By:** Claude (proposed)

### 2026-10-30 · The doctor reports the extension's build as a heuristic, with no protocol change (for user review)
**Decided:** doctor lines: extension connected (from `daemon.status`); daemon build = on-disk build; "extension
possibly older than the build — reload it" when `extension\dist\sw.js` is newer than the last `extension resync` in
`daemon.log`. The doctor never spawns or hands over a daemon. PD:29-30 and R4.1 are amended to match. **Why:** no
field reports the loaded extension's build (C2); PD:37 forbids a protocol change. **Instead of:** adding a build id to
the hello and `daemon.status` (a contract change), or driving a tab. **Revisit if:** the user wants an exact check.
**By:** Claude (proposed; for user review)

### 2026-10-30 · The update treats "nothing reloaded" as a hint, and S4 runs it without the reload
**Decided:** update prints the reload's outcome; `reload-extension.ps1` exit 2 is a hint ("reload it by hand"), not a
failure; a `--no-reload` switch, used by S4. **Why:** M2. **Instead of:** running the reload from a scratch clone
against the user's Chrome. **By:** Claude (proposed)

## 6. Proposed stage split

| Stage | Risk / model | Cap (new lines, code + tests) | Lane: files | Depends on |
|---|---|---|---|---|
| S1 the `~` path | low · Sonnet builder, Opus verifier | 100 | `sdk/src/error.ts` (the `Screenshot:` line only), `sdk/test/failure-report.test.ts` (+ a new `sdk/test/s14-home-path.test.ts`), `recipes/test/s12-r19-static.test.ts:61` (pinned text) | Stage 0 |
| S2a install + shared logic | **standard** (the token) · Opus builder | 300 | new `scripts/bridge/{lib.mjs,setup.mjs}`, `scripts/test/s14-setup.test.ts`, root `package.json` (scripts only) | Stage 0; beside S1 |
| S2b doctor + update | standard · Opus builder | 300 | new `scripts/bridge/{doctor.mjs,update.mjs}`, `scripts/test/s14-doctor.test.ts`; reads `lib.mjs` | S2a |
| S3 scripts from any folder | low · Sonnet | 200 | new `recipes/outside/list-tabs.ts` (the example; or `docs/examples/`), a section draft for S5 | S1, S2a |
| S4 rehearsal | standard · Sonnet runner, Opus verifier | — | `<scratch>` clone (dummy token, `CLAUDE_CONFIG_DIR` scratch, update `--no-reload`); `S4-rehearsal.md`; R4.1 = doctor from `<repo>` | S2b, S3 |
| S5 docs | low · Sonnet | — | `docs/setup.md` (new first section, history moved down) or new `docs/install.md`, `README.md`, root `CLAUDE.md` Commands; `start-bridge.sh` per n3 | S4 |

S2 at 450 (PD:87) is one deliverable on paper but three commands plus their tests; split in two (#271). S1 and S2a
touch disjoint files and may run together. Every builder of S2/S4 gets C1, C2, M2–M6 and m4 in its brief.

## 7. Handoff

- Left in place: `<scratch>\clone` (with its own `node_modules\@bridge\*` junctions and a dummy `bridge.token`), and
  the consumer folders `<scratch>\ext-file`, `ext-link`, `ext-direct`. **`ext-file` and `ext-link` hold
  `node_modules\@bridge\sdk` junctions into the clone**: remove those (PowerShell `cmd /c rmdir`), then the clone's
  `node_modules\@bridge\*` junctions, before any recursive delete. S4 may reuse the clone.
- The global `npm link` junction was removed; npm's global root lists only what it listed before.
- Three dummy strings (`stage0-dummy-A/B/C`) were put on the clipboard; the last is still on it and all three are in
  this machine's clipboard history.
- No process left running; no daemon spawned; Chrome, `~\.claude.json`, the extension and the main tree untouched (no
  build or test in `<repo>`).
- Runtime facts worth a package `CLAUDE.md` bullet (for the session agent): the SDK ships `.ts` and cannot be imported
  by plain `node` (sdk); `claude mcp get/list` start the server they check, and `add` defaults to local scope
  (recipes); clipboard history is on, so a copied secret persists (recipes).
