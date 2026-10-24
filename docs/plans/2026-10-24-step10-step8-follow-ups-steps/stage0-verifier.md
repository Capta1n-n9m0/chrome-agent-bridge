# Step 10 Stage 0 — independent verifier report

Verifier: Claude Opus 5.5, 2026-10-24, at `55ee4de`. I did not write the audit. I edited no existing file. All
probes ran in a clean scratch worktree (`git worktree add --detach <scratchpad>/s0vwt 55ee4de`, `npm ci`) that bound
only 127.0.0.1 port 0, and the worktree was removed afterwards. No Chrome was used, port 9234 was not touched, and no
daemon was started. Evidence is in this directory:

- `stage0-verifier-runs.txt`: the baseline, the output of my own probes, the auditor's re-run probes, the
  transport re-run, the C5 mutation, the tree checks and the greps.
- `stage0-verifier-probes.ts.txt`: the source of my two probes.

Glossary:
- **gate**: the extension's safety check (`safetyDecision`, run by `CallSafety` inside `GatedRouter`).
- **host leg**: daemon ⇄ SDK, and fake extension ⇄ daemon, over real `ws`.
- **Variant C**: the auditor's release-branch layout. Parts 1–5 carry the code of their commits, with the docs held
  at the base; Part 6 is the whole close tree.
- **(B)**: 0.4's extension-side store, read back by chunked pulls.

## Verdict: **PASS-with-notes**

No CRITICAL or MAJOR finding. Each Step 9 contract was executed on port 0, by the auditor and again by me, and none
failed. Every count matches the audit. 0.4's measurement reproduced to within about 10 % on time and exactly on the
pass/fail boundary. Z.1 is met: the findings are ranked with commands and output, the counts are recomputed, every
(proposed) decision is attacked in §7, and the audit's §11 proposes a stage split with estimates. Five MINOR and four
NIT notes follow.

## Recomputed counts (scratch worktree at `55ee4de`)

| Item | Audit | Mine | Command |
|---|---|---|---|
| Router methods in `sw.ts` | 23 | **23** (23 distinct literals) | `grep -c 'router.on(' extension/src/sw.ts`; `grep -o 'router.on("[A-Za-z]*"' … \| sort -u \| wc -l` |
| `METHOD_CLASSES` | 23 | **23** | awk over the literal; `PROBE S9-on classified=23 swScan=23 nonLiteral=[] equal=true` |
| Codes | 25 = 9 + 15 + 1 | **25** = 9 daemon + 15 extension + 1 SDK (`NO_CURSOR`); 24 on the wire | `shared/src/codes.ts` lists; `PROBE S9-codes total=25 wire=24 sdkOnly=["NO_CURSOR"]` |
| MCP tools | 23 | **23** (`reg.tool(` 23; 23 distinct `"browser_*"`) | grep |
| `npm test` | 2720 / 116 | **2720 passed, 116 files** | `npm test` at 19:51Z |
| typecheck / build | 0 / 0 | **0 / 0**; `git status --short` after the build: **empty** (my outputs went outside the tree) | `stage0-verifier-runs.txt` |
| `daemon/dist/index.js` sha256 | `99bb55c5913cdb6a…` | **`99bb55c5913cdb6a11a68453b22fe4751534bdcdd0d0ae29bf8bef9b3a93332d`**, the same in the main tree and in the clean build | `sha256sum` |
| Log allowlist | 54 (F8) | **54** = 15 + 33 + 0 + 6; `log-scan.test.ts:33-35` pins `[15, 33, 0, 6]`; 54 also at `59388ed` and `6fef83c`. The "60" is in `CLAUDE.md:214` and in the Step 9 as-built `:124` | `grep -c '{ file: "' extension/test/log-allowlist.ts`; `git show <c>:…` |
| `maxPayload` override | none | **0 hits** in `daemon/src sdk/src mcp/src extension/src shared/src recipes` and the three `build.mjs`; `ws` 8.21.0 defaults it to `100 * 1024 * 1024` (`websocket-server.js:74`, `websocket.js:675`) | grep |

## Re-executed findings

| # | What | How | Matches the audit |
|---|---|---|---|
| 1 | 0.4 transport (F1, F2) | the auditor's probe copied to `mcp/test/zz-stage0-transport.test.ts`; `npx vitest run …` gave 5 passed | **yes**: 99 MiB arrived whole (1998 ms); 101 MiB → `NOT_CONNECTED: extension disconnected`, close `1009`; 128 MiB the same; 40 Mi × `é` (80.04 MiB) arrived whole; 64 Mi × `é` (128.04 MiB) → 1009; 32 Mi × `€` (96.06 MiB) arrived whole; 20 Mi × U+0001 (120.11 MiB) → 1009. `whole` is a real sha256 comparison (probe `:94`). `connection.ts:82` fails every pending call on a close, so F2's "every actor's in-flight call" follows from the code |
| 2 | No `maxPayload` override | grep (counts above) | **yes** |
| 3 | Step 9 contracts S9-1…S9-8 and Step 8 C1–C7 | the auditor's `zz-stage0-contracts`, `-gate` and `-logcount` probes re-run: **17 passed** | **yes**: every PROBE line matches. C7 forwarded at `0/304/611` (audit `1/304/604`); the 150 ms waiter got `LOCK_TIMEOUT {holder}` |
| 4 | My own Step 9 contract probe, extension side | `extension/test/zz-v-gate.test.ts`, 3 passed | **yes**. V-on: `GatedRouter.on` throws for `__proto__`, `hasOwnProperty`, `valueOf`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`, `Evaluate`, `"evaluate "`, `evaluateToFile` and `selectTab`, recorded in a `Map`. V-unknown: the unknown names `nope`, `__proto__` and `constructor` get `UNKNOWN_METHOD gates=0 reads=0` in 5 states, so the gate factory is never even built. The positive control `evaluate` gets `ok` / `DISARMED {"scope":"all"}` / `DISARMED {"scope":"evaluate"}` / `DISARMED {"scope":"all"}` / `DOMAIN_BLOCKED`, so the harness can tell the cases apart |
| 5 | F4, both halves | V-F4: `CallSafety("evaluate")` on a blocked tab. V-daemon: the real `WsHost` on port 0 with my own fake extension | **yes**. With no `tabId`: `receipt=allow effect=ok post=null` (it is also allowed at the effect phase, which the audit does not mention). With a `tabId`: `DOMAIN_BLOCKED` at all three phases. The daemon: `untargeted: BAD_PARAMS "tab is required" forwardedNew=none`; with `tab: "T1"` it forwards `{"id":"x","tabId":55}` with no `tab` key |
| 6 | S9-6, daemon redaction (my own run) | V-daemon: `safetyState` armed, then disarmed; `daemon.status` | **yes**: `armed status: has '://'=true`; `disarmed status: has '://'=false … safety={"armed":false,…}` |
| 7 | F3 (0.8): does `onActivated` end the wait? | read `extension/src/tabs.ts:149-283` | **yes, as written**. The `Promise` executor binds `done` synchronously, before `addListener`. The listener is added before `tabs.update`. `done` is never reassigned. Resolving twice is harmless. A tab already in front skips `showTab` (`switching`, `:202`). The call does not wait for the restore (`finally { void startRestore()… }`). See V1 and V2 |
| 8 | F7 (0.6) trees | the auditor's Variant C commits still sit in the shared object store | **yes**: `git rev-parse 2f846c6^{tree}` = `a1932a8^{tree}` = `4e57b16a…`. Parts 1–5 leave `docs/ CLAUDE.md README.md` at the base (empty diff). Part 5 against `a1932a8` has no code diff. The range is 60 commits, 60 carry the Opus 5.5 trailer, and the session ids split 32/28. My own grep of the range's paths and both trees for `dist/`, `bridge.token`, `.env`, `exports/` and `*.png` finds 0. Base `70aa754` is the first commit of S7.md §4's "`70aa754..HEAD`". Neither the as-built nor S7.md names a close commit |
| 9 | F6 (S4.3 against S4b) | the phase doc's S4.3 (`:361-362`) against S4b.2 (`:376-377`) | **yes**: a real contradiction. F6's equality wording settles it, because the existing `safety-gate` tests pin `evaluate`'s own text |
| 10 | F5 (actions return `Promise<void>`) | `sdk/src/tab.ts:206-243`, `client.ts:409-425`; MCP `registry.ts` `await bridge.call` results go unused (`:489/511/523`) | **yes**: only `locate`/`snapshot`/`screenshot`/`evaluate*`/`network*`/`download` return values |
| 11 | F8, F9, F10, F11 | counts, imports, `bb-login.ps1:63/216-222/260`, `download.ts:41-71` | **yes**. F9 is incomplete (V4); F10's amendment drops an exit-check leg (V5) |
| 12 | C5 is tested by existing tests: can those tests fail? | mutation in the scratch worktree: in `onTab`, `if (tab !== undefined) { cursor.set(tab); … }` | **yes, they can fail**: 4 tests went red (`an explicit \`tab\` does not move the cursor`, and 3 others); reverted with `git checkout` |

## Findings

**V1 · MINOR · plan-side · audit F3's amended SW-1 rule.** The rule reads "median((i) − (ii)) ≥ 950 ms in 3/3". A
median is one number and cannot hold "in 3/3", and the rule does not name the quantity it measures. It names
"page-side `visibilitychange` stamps on both tabs", but in leg (ii) the tab is already in front: `switching` is false
(`tabs.ts:202`), so no `visibilitychange` fires and no restore runs. From the code, the call duration of (i) minus
that of (ii) is roughly `tabs.update` + the activation wait + 50 ms, because the caller never waits on the restore
(`:222`). That difference does discriminate: about 1050 ms or more if the wait runs to its bound, about 60–150 ms if
the event ends it. Evidence: `extension/src/tabs.ts:199-223, 249-272` (read). **Fix:** per trial, d = the
client-measured duration of call (i) minus that of call (ii). The bound branch needs d ≥ 950 ms in 3/3, the event
branch d ≤ 300 ms in 3/3, and anything else is undetermined. The `visibilitychange` stamps stay as a record. This is
stricter and is written before anything is measured.

**V2 · MINOR · plan-side · F3 / audit §5 leaves out two facts that SW-1's reading and any S7b need.** (a) The
listener that ends the wait has been in the code since T3: `git log -S'onActivated.addListener' -- extension/src/tabs.ts`
→ `43c0a53 2026-10-22 feat(extension): T3 …`. That is before Run 8 SCREEN-1, Run 9 R9-SCREEN-1 and Run 12 REP-0
(human's tab hidden 1331 ms), so the measured ~1.3–1.5 s was taken **with this code**. "The fix is already the code"
therefore does not explain the measurement. Something else costs about 1 s: either the event is missed, or the
capture itself is slow. (b) `grep -rn onActivated extension/src` finds only the dynamic `addListener` inside `showTab`
(`tabs.ts:258`). `sw.ts` registers no top-level `tabs.onActivated` listener, so the event is registered only for the
duration of each call. That is an unmeasured but concrete way the event could be missed. **Fix:** add both facts to
the F3 amendment. If SW-1 reads "bound", S7b first names the mechanism. A top-level listener would touch the "listeners
at the top level of `sw.ts`" invariant, so it escalates and is not decided inside S7b.

**V3 · MINOR · plan-side · F7 / §10's release-tree decision departs from 0.6's own stated rule without saying so.**
0.6 reads "per-Part cumulative trees if they apply cleanly, else one squashed tree carrying all six messages".
Applied per Part, the commits conflict 14 times (all under `docs/`), and Part 1's tree does not typecheck
(`stage0-release-trees.txt`). Variant C holds the docs at the base, which makes it a third option. The phase doc's
Open items lists "0.6's intermediate trees" under "Ruled at Stage 0 (conservative rule, **listed for the user**)",
but §10 records it as "By: Claude (proposed; build decision)". Kickoff §6 does call the intermediate trees a build
decision, so the two documents disagree. **Fix:** §10 should state the departure from 0.6's rule, name the
doc-versus-kickoff disagreement, and list the choice for the user. The final tree is verified equal, the branch is
local and the choice can be undone, so this does not block S6.

**V4 · MINOR · plan-side · F9's retirement set misses two lines that S8.1's grep will find.** I ran S8.1's own grep
at `55ee4de`, leaving out the two files to be retired. It still hits `recipes/blackboard/export-file.ts:1` (header:
"…helpers of export-grades.ts and assemble-mcp.ts"), `recipes/blackboard/export-grades.ts:9`,
`recipes/README.md:27-28`, and `recipes/test/blackboard-export-file.test.ts:2` (header names
`recipes/blackboard/transcript.ts`). F9 gives S8 edits only in `export-grades.ts` and `held.ts`. S8's lane is
"removals only" for `recipes/blackboard/` and `recipes/test/`, so the `export-file.ts` header and the kept test
file's header would make S8.1 fail. `assemble()` (`export-file.ts:56`) is used only by `assemble-mcp.ts`, so it and
its test (`"assemble needs contiguous chunks …"`) become dead. **Fix:** extend F9's list and S8's lane to cover these
lines. Either keep `assemble()` with a stated reason, or retire it and its test too (−7 tests instead of −6, listed
per file).

**V5 · MINOR · plan-side · F10's amendment can be read as dropping two S5.1 legs.** The amended S5.1 text reads
"stuck on the SSO stand-in → exit 4 at ≤ 95 s from the press; the fixture counts submits (1)". It omits S5.1's
old-versus-new pair on the delayed-redirect fixture and its "another host → exit 4, nothing pressed" leg. Its new
rule, "while polling, any page … is tolerated", also changes 0.9's "another host → exit 4". Changing 0.9's proposal
is allowed, but Stage 0 may only make exit checks stricter. **Fix:** state that the amendment adds to S5.1 and
replaces nothing. Keep the old-versus-new pair, and keep "another host" as a leg: a fixture that ends on a
non-Blackboard host → exit 4 at the bound, nothing pressed after the first press.

**V6 · NIT · F13.** The bound `answer.length ≤ path.length + 120` is looser than today's "under 300 characters" for any
path longer than 180 characters. **Fix:** use `≤ min(300, path.length + 120)`, or fix the test path at ≤ 180
characters.

**V7 · NIT · audit §2 S9-3's evidence.** The auditor's probe stores results in a plain object, and
`throwsFor["__proto__"] = …` is silently dropped. So `__proto__`, though claimed in §2, appears nowhere in
`stage0-contracts.txt`. The claim is true: my probe stores results in a `Map` and records the throw (V-on).
**Fix:** none needed. Future probes should record results in a `Map`.

**V8 · NIT · a blind spot not in audit §8.** Under (B), the store lives in the service worker's memory. A worker
restart between the store's fill and its last pull loses it (Chrome can stop the worker, though the 25 s keepalive
alarm makes this rare). **Fix:** an S4 test where a pull after the store is lost gets a clean refusal, and `.part` is
removed.

**V9 · NIT · hygiene.** The auditor's Variant C run left six unreferenced commits (`4db657f…2f846c6`) in the object
store. No ref points at them; `git branch`, `git tag -l` (0) and `git stash list` (empty) are clean, and git's
garbage collection will remove them. They let me verify the tree equality cheaply.

## Ranking and tagging of the audit's own findings

- F1–F7 are MAJOR, and each would mislead a later stage if left unamended. I agree with that.
- F2 is tagged code-side and the rest plan-side. Both are correct.
- The contract-level amendments (F1/F4 transport and gate coverage, F5 SDK form, F11/F12 file rules) are marked for
  user review, as required.
- Apart from V5 and V6, every amendment I checked is stricter or equal. None flatters a result already seen: F1
  applies 0.4's own pre-stated rule, and F3 is written before SW-1 runs.
- C5 rests on existing tests, but those tests can fail (re-executed item 12), so that is enough for a contract that
  Z.1 does not count among Step 9's.

## Evidence hygiene and state at the end

- `grep -c -F -f bridge.token`: 0 on all ten auditor evidence files and on both of mine.
- Non-loopback URLs: 0. Real site names (`ada.edu.az`, `blackboard.com`, `microsoftonline`): 0.
- The only user path in the evidence is the scratchpad path in vitest's `RUN` line, as in earlier steps' evidence.
- No probe is left in the suite. `git worktree list` shows only the main tree; `git branch` shows `feat/agent-bridge`
  and `main` (no new branch); no tags; no stash.
- `main` is at `55ee4de`. `git status --short` shows only the 11 steps-dir files that were already untracked plus my
  three (`stage0-verifier.md`, `stage0-verifier-runs.txt`, `stage0-verifier-probes.ts.txt`).
- I started no long-lived process.
