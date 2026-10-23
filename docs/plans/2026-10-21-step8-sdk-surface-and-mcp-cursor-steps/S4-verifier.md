# S4 verifier report: SDK failure reports

Verifier: Opus 5.5, 2026-10-23. I audited the change independently. I ran everything in a clean worktree
of `53f68db`, at `<scratchpad>/s4-verify`. I copied in exactly the five S4 files (`sdk/src/{error,tab,client,connect}.ts`,
`sdk/test/failure-report.test.ts`) and checked them byte-identical to the main tree with `cmp` after the mutation
runs. The worktree was removed at the end (`git worktree remove --force`, then `rm -rf` of the leftover
`node_modules` and `git worktree prune`; `git worktree list` now shows only the main tree). I edited no file
in the main tree apart from this report.

## Test counts

| | Files | Tests | Command |
|---|---|---|---|
| Baseline `53f68db` (after `npm ci`) | 75 passed | 1370 passed | `npx vitest run` |
| With the five S4 files | 76 passed | 1426 passed | `npx vitest run` |
| Delta | +1 | **+56**, all in `sdk/test/failure-report.test.ts` | |

`npm run typecheck`: exit 0 (shared, daemon, sdk, mcp, extension). `npm run build`: exit 0
(`built daemon`, `built mcp`, `built extension → dist/`).

## Findings

**1. MAJOR: the hidden attach snapshot renumbers every ref, so the candidate/match refs the report prints point at other elements.**
Location: `sdk/src/error.ts:168-172` (the `snapshot` attach call) and `:311-326, 366-374` (candidate lines and
anchor by ref). The cause is in `extension/src/content/snapshot.ts:108` (`buildSnapshot` calls `refs.reset()`).
`locate` (`content/locate.ts:113`, `resultOf` → `refs.add`) mints the refs in `LOCATOR_NOT_FOUND {candidates}` and
`LOCATOR_AMBIGUOUS {matches}` into the same `RefMap` (`content/index.ts:41-55`).
- Evidence: a scratch jsdom test in the worktree, using the real `locate` followed by the real `buildSnapshot`, on
  `<a>Home</a><button>Delete</button><button>Create folder</button><button>Upload</button><button>Create item</button>`.
  The locator was `{role:"button", name:"Create", exact:true}`.
  ```
  VERIFIER before   [{"ref":"e1","name":"Create item","el":"Create item"},{"ref":"e2","name":"Create folder",...},{"ref":"e3","name":"Delete",...},...]
  VERIFIER snapshot ["e1=Home","e2=Delete","e3=Create folder","e4=Upload","e5=Create item"]
  VERIFIER after    [{"ref":"e1","name":"Create item","nowPointsAt":"Home"},{"ref":"e2","name":"Create folder","nowPointsAt":"Delete"},{"ref":"e3","name":"Delete","nowPointsAt":"Create folder"},...]
  ```
- Effects:
  - `report()` prints `- button "Create item" [ref=e1]` above a snapshot window in which `e1` is `link "Home"`.
  - The window anchors on the wrong element, because `findIndex(e.ref === "e1")` finds Home.
  - A script that acts on `err.data.candidates[0].ref` clicks the wrong element. Before S4 that ref was valid.
  - The same happens to `REF_STALE`: the stale number is re-minted by the attach snapshot, so the "anchored on
    the failing ref" window shows an unrelated element.
  - Refs a script still holds from its own last snapshot are silently re-pointed once the page has changed.
    They now name another element instead of answering `REF_STALE`. A cut snapshot that lands late does this
    too, after the error has already been returned.
- Why the suite misses it: the fake daemon answers `snapshot` with a fixed `snap(n)` whose refs agree with the
  candidates by construction (`failure-report.test.ts:491-494`).
- Suggested fix (contract-level, for the step agent or user):
  - (a) In `report()`, match candidates and matches to the attached snapshot by `role`+`name`, not by `ref`.
    Print the snapshot's refs, and state that `error.data`'s refs are superseded by `error.snapshot`'s.
    Document that an enriched failure resets the tab's refs, as a script's own `snapshot()` does.
  - Or (b) have the attach snapshot not reset the RefMap. That needs an extension change outside S4's lane.
  - Add an SDK test in which the fake snapshot's numbering differs from the candidates' numbering.

**2. MINOR: the attach calls bypass the Tab's stale-generation guard (#79). Measured: a stale handle reaches the new daemon.**
Location: `sdk/src/tab.ts` `#reported` (the attach uses `this.#host.call` directly, with no `#guard()`).
- Evidence: a scratch SDK test. The fake first daemon answers `click` with `REF_STALE` and then, in the same
  synchronous turn, `fireClose(4002)`:
  ```
  VERIFIER err REF_STALE ["snapshot: INTERNAL x","screenshot: INTERNAL x","network: INTERNAL x"]
  VERIFIER second.sent [["snapshot","T3"],["screenshot","T3"],["networkRequests","T3"]]
  ```
  `call()` waits for the reconnect and then sends all three calls with the old generation's `T3` to the new daemon.
- Impact: at `53f68db` the daemon has no high-water mark yet (`handles.ts` last changed in T2). A new daemon's `T3`
  can be another tab, and `LeaseTable` gives "ok when unheld" (`leases.ts:41`). So the attach could snapshot,
  screenshot (a visible tab switch) and read the network log of the wrong tab. `networkRequests` is free in
  `methods.ts:25-27`.
- Severity: read-only, a narrow race (the 4002 must arrive between the failure and the attach), and closed once
  S2b's never-reused handles land (`TAB_UNKNOWN` then goes to `attachErrors`). Even so, it departs from S3's
  binding contract "every method stale-guarded … no call".
- Suggested fix: in `#reported`, skip `attachContext` when `this.#host.generation() !== this.#generation`. Add a
  test using the repro above.

**3. MINOR: one test path can write into the user's real `~/.chrome-agent-bridge/failures/`.**
Location: `failure-report.test.ts:446-480` (the `connect()` test) and `sdk/src/connect.ts`, which passes no
`homedir` or `now` seam.
- Evidence: under mutant M8 (`BRIDGE_FAILURES_DIR` ignored), the `connect()` test still passed. It wrote
  `~/.chrome-agent-bridge/failures/2026-10-23T10-43-57-135Z-T3.png`: 11 bytes, the fake PNG, with directory and
  file birth at 14:43:57.136, inside the mutation run.
- The unmutated suite writes nothing there: both full runs at 14:37 and 14:38 came before the directory existed.
- I deleted the file and the directory, which that mutant had created.
- Suggested fix: give that test a guard. Either assert that `screenshotPath` starts with `dir`, or run it with
  `HOME`/`USERPROFILE` pointed at a temp dir. Then an env-handling regression fails loudly instead of writing
  into the real home.

**4. MINOR: there is no test for the double-enrich guard (surviving mutant M19).**
Location: `sdk/src/error.ts:136` (`hasOwnProperty(error, "report")`).
- Removing it leaves 56 of 56 passing. No current path sends one error object through `#reported` twice, so
  the guard is defensive.
- Suggested fix: add a unit test that calls `attachContext` twice on the same error and expects 3 calls, not 6.
  Or drop the guard and the "enriched at most once" claim.

**5. MINOR: one late-screenshot guard pair is redundant (surviving mutant M7b, disclosed by the builder).**
Location: `sdk/src/error.ts:175, 180`.
- Removing both `if (cut) return` guards survives, because the `rm` after the write still keeps the directory
  empty. Removing all three guards fails the test (M7).
- Accepted as disclosed. Optional: assert in that test that `mkdir`/`writeFile` were never reached, if a
  no-write rule is wanted.

**6. NIT: `report()` wording for matches and nth.**
Location: `sdk/src/error.ts:270-275, 313`.
- `LOCATOR_AMBIGUOUS {matches}` items are `{ref, name}` with no `role` (`content/locate.ts:251-254`), so each
  match line prints `- ? "Name" [ref=eN]`.
- An `nth`-past-the-end `LOCATOR_NOT_FOUND` carries the actual matches as `candidates`
  (`content/locate.ts:238-243`), yet the header says "(none matched the locator)".
- Suggested fix: omit the role when it is absent, and say "Nearest candidates" without the parenthesis.

**7. NIT: cut attach calls stay pending until their own client timer, 11 s.**
- Real timers are not `unref`'d, but the open socket keeps the process alive anyway until `client.close()`.
- The listeners are removed when the call times out. Nothing leaks. Acceptable.

**8. NIT: `BridgeClientOptions` gains four optional fields, a type-surface growth that the builder disclosed.**
- The values are unchanged (finding-free check below). `homedir` and `now` are test seams.
- This is for the step agent to accept or narrow, since the SDK surface is contract-level (#90).

**9. NIT: `download()` failures are enriched, but `downloadStart` is tab-independent (a service-worker fetch).**
- A `TIMEOUT` therefore attaches a screenshot of the tab, with its ~1.5 s flash, for a failure that has nothing
  to do with the page.
- 0.5's "every SDK call" permits it. Consider excluding it.

### Attack items with no finding
- (b) `networkRequests {tab, limit: 20}` returns the tab's **last** 20 entries.
  - The daemon resolves `tab` → `tabId` (`daemon/src/intercept.ts:519-527`).
  - `collect(tabId)` returns that tab's list in insertion order (`network-log.ts:494-495`).
  - `list.slice(max(0, total - limit))` (`:382-384`).
- (c) Anchor alignment holds.
  - `formatSnapshot` emits one header line, then exactly one line per element, with no depth or frame lines
    (`sdk/src/format/snapshot.ts:16-23`).
  - Names are whitespace-collapsed (`content/a11y.ts:97-99`, `trim`), so no name adds a line.
  - The report drops the header and indexes `elements` 1:1. (The broken anchor in finding 1 comes from the
    refs, not from line alignment.)
- (e) The candidate shape `{ref, role, name}` (S1 #87 item 5, `resultOf`) and the `waitFor` `TIMEOUT` data
  (`handlers/locator-wait.ts:71`, the last `{candidates}`) both render. Matches lack `role`; see finding 6.
- (f) The augmentation types the fields for an `@bridge/sdk` consumer. I put a scratch `consumer.ts` under
  `mcp/` in the worktree, importing `BridgeError` from `@bridge/sdk` and reading `err.report?.()`,
  `err.attachErrors?.length`, `err.screenshotPath` and `err.snapshot?.elements.length`. `tsc` exit 0. The negative
  control `return err.screenshotPath` as `number` gives exit 2:
  `TS2322: Type 'string | undefined' is not assignable to type 'number'`.
- (g) `attachContext` cannot throw.
  - It has a try/catch around `enrich`, and the code filter runs before any call.
  - Excluded codes get no property (tests at `:214-227` plus mutant M18).
  - `report()` could throw only on a `null` element inside `snapshot.elements`, which the extension never sends.
- (h)/(i) Nothing logs.
  - `grep -rn "console\." sdk/src` → empty, exit 1.
  - `grep -rn "process\.std\|stderr\|stdout\|appendFile\|\.log(" sdk/src/{error,tab,client,connect}.ts` → empty, exit 1.
  - `grep -n "token\|TOKEN" sdk/src/error.ts` → empty, exit 1.
  - The report returns URLs (snapshot header, network rows) to the caller and never prints them.

### CLAUDE.md invariants
- Call timeout bounds:
  - `clientTimeoutMs` and `route.ts` are untouched.
  - The attach calls send `timeoutMs: 5000`, inside [100, 600000].
- 4002-only reconnect: `client.ts` changes only the constructor and the host (`git diff`). `handleClose` is
  untouched.
- MCP no-crash and behaviour: the MCP uses only raw `link.call` and its own `TabCursor` (`mcp/src/index.ts:19`;
  no `Tab` in `mcp/src`), so it is never enriched. 113 MCP tests are green within the full run.
- The eight exports: a scratch test printed
  `BridgeClient,BridgeError,ErrorCodes,Tab,connect,downloadToFile,formatNetwork,formatSnapshot true`. The
  trailing `true` means `sdk.BridgeError === @bridge/shared`'s class. `sdk/src/index.ts` is unchanged.
- `instanceof`: the enriched error is the same object (`toBe(original)`, `:229-240`; mutant M26 fails 24 tests).

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| S4.1 `npm test` ≥ before + enrichment tests; typecheck green | met | 1370 → 1426 (+56), 75 → 76 files; typecheck exit 0; build exit 0 |
| S4.2 attach for exactly the 7 codes, not `TAB_HELD TAB_GONE NOT_CONNECTED` | met | per-code loop over every `ErrorCodes` key (`:193-212`) plus same-object tests for the 3 (`:214-227`); M1/M2/M2b/M18 fail 3/10/4/19 |
| S4.2 an attach that rejects or exceeds 5 s (injected clock) → `attachErrors`, original thrown | met | `:298-346`; cut at 5000, not at 4999; M3/M4 (5001/6000) fail 3; M6/M6b fail 2 each; M5/M26 fail 24 |
| S4.2 `report()` for LOCATOR_NOT_FOUND: candidates first, snapshot ≤ 60 lines | met (as tested; see finding 1 for live refs) | `:490-517`; M11 fails 1; M12/M12b/M12c fail 5/1/3 |
| S4.2 `failureReports: false` attaches nothing | met | `:414-429`, `connect()` `:446-480`; M9/M9b fail 2/1 |
| S4.3 (per #84) `grep -rn "console\." sdk/src/error.ts` empty and exit 1 | met | stdout empty, `exit=1`; also over all of `sdk/src` |
| Step-agent: attach set exactly 7; the 3 tested not to attach | met | as above |
| Step-agent: 5 s cut on an injected clock; budget never raised; attach never throws | met | the manual clock; M3/M4/M5 fail |
| Step-agent: attach failure → `attachErrors`; the original object rethrown | met | `toBe(original)` |
| Step-agent: `report()` ≤ 60 lines total on worst case; snapshot part ≤ 60 | met | `:550-598` (worst case, pathological, newline hard cap) |
| Step-agent: candidates before the snapshot | met | M11 fails |
| Step-agent: screenshot under `BRIDGE_FAILURES_DIR`, else `~/.chrome-agent-bridge/failures/` | met | `:385-401`; M8/M8b fail (see finding 3) |
| Step-agent: `failureReports: false` attaches nothing | met | |
| Step-agent: `instanceof BridgeError` unchanged | met | the shared class, same object |
| Step-agent: `index.ts` exports the same eight values | met | runtime key list above |
| Step-agent: no `console.` in sdk/src | met | grep exit 1 |
| Step-agent: nothing logs a URL/title/header/body/locator text/token | met | greps above |
| Step-agent: typecheck, build green | met | |
| Step-agent: every new test fails without its change | met | at the baseline the file cannot import `../src/error.js`; per group, see the mutation table |
| Lane: only sdk/src and sdk/test | met | the five files |
| Design rulings (one deadline, concurrent, raw call, raw `call()` not enriched, pre-call errors not enriched, F25 literal, file name, F35 wording, comment) | met | `error.ts:13-25` comment; M10/M20/M22/M13* fail; but #79 bypass, finding 2 |

## Mutation table

All run against `sdk/test/failure-report.test.ts` in the worktree. Each mutant was applied and then restored;
the files were `cmp`-identical to the main tree afterwards.

| Mutant | Result |
|---|---|
| M1 add `TAB_HELD` to ATTACH_CODES | 3 failed |
| M2 remove `TIMEOUT` | 10 failed |
| M2b remove `LOCATOR_NOT_FOUND` | 4 failed |
| M3 budget 5001 | 3 failed |
| M4 budget 6000 | 3 failed |
| M5 `attachContext` throws | 24 failed |
| M5b `enrich` throws (swallowed, nothing set) | 24 failed |
| M6 rejected attachment not recorded | 2 failed |
| M6b cut not recorded | 2 failed |
| M7 late screenshot written and kept (all 3 guards) | 1 failed |
| M7b only the two `if (cut) return` removed | **survived** (finding 5; builder-disclosed) |
| M7c late path set on the error | survived; **equivalent mutant** (the line is unreachable after a cut) |
| M8 `BRIDGE_FAILURES_DIR` ignored | 2 failed (and wrote to the real home: finding 3) |
| M8b default dir segment wrong | 1 failed |
| M9 client ignores `failureReports:false` | 2 failed |
| M9b `connect` ignores `failureReports` | 1 failed |
| M10 raw `call()` enriched | 2 failed |
| M11 candidates after the snapshot | 1 failed |
| M12 `REPORT_MAX_LINES` 61 | 5 failed |
| M12b hard cap removed | 1 failed |
| M12c window ignores the room (+10) | 3 failed |
| M13 F35 note says "dropped" | 2 failed |
| M13b `formatSnapshot` footer kept | 1 failed |
| M13c cap note removed | 2 failed |
| M14 `limit: 20` dropped | 1 failed |
| M14b `slice(-20)` dropped | 1 failed |
| M15 anchor ignored | 3 failed |
| M16 `ref` not passed from Tab | 1 failed |
| M17 no `timeoutMs` on an attach call | 1 failed |
| M17b attach `timeoutMs` 6000 | 1 failed |
| M18 `isAttachCode` always true | 19 failed |
| M19 double-enrich guard removed | **survived** (finding 4) |
| M20 network waits for the screenshot (not concurrent) | 2 failed |
| M21 budget timer not cleared | 1 failed |
| M22 `:` kept in the file name | 11 failed |
| M23 every request listed as failed | 1 failed |
| M24 Tab not enriched | 24 failed |
| M25 `download` not enriched | 1 failed |
| M26 a copy rethrown instead of the original | 24 failed |

Survivors: M7b (disclosed), M19, plus M7c, which is equivalent.

## Verdict

**FAIL**, on finding 1 (MAJOR). Every exit check passes as tested, and the code meets the stage's letter.
But the feature's central output, candidates first with a window around them, prints refs that the
attach's own snapshot has just renumbered, measured with the real `locate` + `buildSnapshot`. It also
silently re-points refs the script holds. The fix is contract-level: match by role+name in `report()` and
document the reset, or use a non-resetting snapshot outside the lane. That is the step agent's call. The
one-line generation check of finding 2 should go in the same fix round.

## Re-check round 1

Verifier: Opus 5.5, 2026-10-23. Inputs: `S4-fixer1.md` (audited as claims) and the step agent's rulings on F1–F4 and F6.

Setup: a fresh clean worktree `<scratchpad>/s4-r1` at the current HEAD **`eb4fc4e`** (docs-only commits on top of
`53f68db`), with `npm ci`. I copied in exactly the five S4 files. After all runs `cmp` showed them byte-identical
to the main tree. The worktree is removed (`git worktree list` no longer lists `s4-r1`; the `s2b-verify` worktree
there is not mine). The real `~/.chrome-agent-bridge/` holds only `daemon.log` before, during and after every
run, mutants included.

### Counts

| | Files | Tests |
|---|---|---|
| Baseline `eb4fc4e` | 75 passed | 1370 passed |
| With the five S4 files | 76 passed | 1434 passed (+64; the S4 file grew from 56 to 64) |

`npm run typecheck`: exit 0. `npm run build`: exit 0. `grep -rn "console\." sdk/src`: empty stdout, exit 1.

### Findings, re-checked

- **F1 (was MAJOR): fixed for role-bearing items. A residual remains for role-less items; see R1-1.**
  - Evidence: I put a scratch jsdom test in `sdk/test` that runs the real `locate` (`extension/src/content/locate.ts`),
    then the real `buildSnapshot` on the same `RefMap` as the attach snapshot, through a real `Tab` and
    `attachContext`. Then I looked up every printed `[ref=…]` in the live `RefMap`.
  - On the round-0 page (`{role:"button", name:"Create", exact:true}`):
    ```
    VERIFIER role [{"line":"  - button \"Create item\" [ref=e5]","liveEl":"button:Create item"},{"line":"  - button \"Create folder\" [ref=e3]","liveEl":"button:Create folder"},{"line":"  - button \"Delete\" [ref=e2]","liveEl":"button:Delete"},{"line":"  - button \"Upload\" [ref=e4]","liveEl":"button:Upload"}, …]
    ```
  - The report prints `Refs: this snapshot renumbered the tab's refs — …` before the snapshot header. The
    window is the whole 5-line snapshot.
  - Ambiguous `{role:"button", name:"Save"}` over `Save, Save, Save as`: the two `Save` matches lose their ref,
    because two elements have that name. `Save as` maps to `e4`, which is `button:Save as`. Correct.
  - Snapshot rejected or cut: every ref is deleted and the withheld line is printed (fixer tests; mutants R1c/R1f fail).
  - The failing call's ref no longer anchors: `ReportInput.ref` is gone, and `Tab` no longer passes `ref`.
- **F2 (was MINOR): fixed.**
  - `tab.ts` `#reported` hands `attachContext` the call `async (m,p,o) => { this.#guard(); return this.#host.call(m,p,o); }`.
    No `await` sits between the guard and the synchronous `send` while the client is open, and after a 4002 the
    generation is bumped before any reconnect wait. So nothing can slip between the two.
  - The fixer's test is my round-0 repro (`second.sent` empty, `TAB_UNKNOWN` in `attachErrors`). Mutant R2 fails it.
- **F3 (was MINOR): fixed.**
  - The `connect()` test points `HOME`/`USERPROFILE` at a temp dir and asserts that the PNG lands in
    `BRIDGE_FAILURES_DIR`.
  - Mutant R3 (`BRIDGE_FAILURES_DIR` ignored) now fails 3 tests, including the `connect()` one, and created
    nothing under the real home.
- **F4 (was MINOR): fixed.** The test calls `attachContext` twice and expects one call set. Mutant R4 fails it.
- **F6 (was NIT): fixed.** An empty or absent role is omitted, and the heading is `Nearest candidates:`. Mutants R6a/R6b fail.

### New findings

**R1-1. MAJOR: a role-less candidate or match is rewritten to a different element that has the same name.**
Location: `sdk/src/error.ts` `sameElement` (where `n.role === ""` or a missing role matches any role) and `remapRefs`.
- Evidence (the same scratch harness, real `locate` + `buildSnapshot`):
  ```
  {css:"p"} on <p>Go</p><p>Stop</p><button>Go</button>
  VERIFIER css LOCATOR_AMBIGUOUS [{"line":"  - \"Go\" [ref=e1]","liveEl":"button:Go"}, …]  matches: [{"ref":"e1","name":"Go"},{"name":"Stop"}]
  {text:"Totl", exact:true} on <button>Total</button><p>Loading</p><p>Total</p>
  VERIFIER text [{"line":"  - button \"Total\" [ref=e1]","liveEl":"button:Total"},{"line":"  - \"Total\" [ref=e1]","liveEl":"button:Total"}, …]
  ```
- The match was `<p>Go</p>`, but the report and `err.data.matches[0].ref` now name the button. The `<p>Total`
  text candidate likewise gets the button's ref.
- Why such a rewrite is always wrong for a candidate:
  - A `{text}` candidate has role `""` exactly when `roleOf(el)` is null (`locate.ts:113`).
  - The snapshot never lists an element with no role.
  - So every name-only hit for such a candidate is necessarily a different element.
- Matches never carry a role (`locate.ts:251-254`). For `{text}`/`{css}` locators they are often non-interactive
  elements outside the snapshot, so the same thing happens.
- This is the class of defect F1 was about: a printed ref that names another element. A script acting on it
  clicks the button.
- It follows the ruling's letter ("and role when the item has one"), so it is a gap in the rule, not a
  departure by the fixer.
- Suggested fix (a ruling change for the step agent): an item with an empty or absent role gets no ref, i.e.
  the ref is deleted. That covers `{text}` candidates and all `matches`. Optionally, `#reported` could pass the
  failing locator's kind so that matches of a role locator keep a name-only remap.
- The fixer's test "matches (no role) are remapped by name" and the "empty role matches by name only" clause
  would change with it.

**R1-2. NIT: the anchor's `sameElement` re-check is redundant, and the fixer's M1g claim does not reproduce.**
- My R1g (`if (at >= 0 && item … && sameElement(…))` → `if (at >= 0)`) leaves 64 of 64 passing.
- The fixer reports that M1g fails 2 tests.
- After `remapRefs` every surviving ref is a snapshot ref of a same-named element, so the check can matter
  only when `renderReport` gets unremapped data.
- Harmless. Either drop the check or test `renderReport` directly with stale refs.

### Mutation table (round 1, `sdk/test/failure-report.test.ts`)

| Mutant | Result |
|---|---|
| R1a `remapRefs` not called | 6 failed |
| R1b role ignored in matching | 1 failed |
| R1c no snapshot → refs kept | 2 failed |
| R1c2 several hits → the first is kept | 1 failed |
| R1d the failing ref anchors again | survived; **equivalent** (`ReportInput` no longer carries a ref) |
| R1e renumbered note removed | 1 failed |
| R1f withheld line removed | 2 failed |
| R1g anchor not re-checked against the element | **survived** (R1-2) |
| R2 attach calls not stale-guarded | 1 failed |
| R3 `BRIDGE_FAILURES_DIR` ignored | 3 failed; real home untouched |
| R4 double-enrich guard removed | 1 failed |
| R6a `?` role placeholder back | 3 failed |
| R6b "(none matched the locator)" back | 1 failed |
| R7 `REPORT_MAX_LINES` 61 | 5 failed |
| R8 add `TAB_HELD` | 3 failed |
| R9 budget 5001 | 4 failed |
| R10 raw `call()` enriched | 2 failed |
| R11 `failureReports:false` ignored | 2 failed |
| R12 F35 footer kept | 1 failed |

### Exit criteria (round 1)

All rows of the round-0 table still hold at `eb4fc4e` with the fixed files:
- The attach set is exactly 7 codes, and the 3 excluded codes are tested not to attach.
- The 5 s cut runs on an injected clock.
- An attach failure goes to `attachErrors`, and the original object is rethrown.
- The report is ≤ 60 lines in total, with candidates first.
- `BRIDGE_FAILURES_DIR` and the home fallback both work.
- `failureReports:false` attaches nothing.
- `instanceof` is unchanged, and `index.ts` and its eight values are unchanged (the file was not touched).
- No `console.`.
- Typecheck and build are green.
- Every group has a failing mutant.
- Only `sdk/src` and `sdk/test` changed.

Not met in spirit: "every printed ref names the same role+name in the attached snapshot". It cannot be met for
role-less items (R1-1).

### Verdict, round 1

**FAIL**, on R1-1 (MAJOR): a role-less candidate or match is rewritten to a different same-named element.
Everything else from round 0 is fixed. The fix is a small ruling change (no ref for role-less items) plus
test updates.

## Re-check round 2

Verifier: Opus 5.5, 2026-10-23. Inputs: "## Round 2" in `S4-fixer1.md` (audited as claims) and the step agent's
amended R1-1 ruling. The amended rule: an item with an empty or absent role never gets a ref, and an item with a
non-empty role is remapped by role and name, on a unique hit only.

Setup: a fresh clean worktree `<scratchpad>/s4-r2` at HEAD **`eb4fc4e`**, with `npm ci`, and exactly the five S4
files copied in. After all runs `cmp` showed them byte-identical to the main tree. The worktree is removed:
`git worktree list` shows the main tree and someone else's `s2b-verify` only. The real `~/.chrome-agent-bridge/`
held only `daemon.log` before, during and after every run.

### Counts

| | Files | Tests |
|---|---|---|
| Baseline `eb4fc4e` | 75 passed | 1370 passed |
| With the five S4 files | 76 passed | 1435 passed (+65) |

`npm run typecheck`: exit 0. `npm run build`: exit 0. `grep -rn "console\." sdk/src`: empty stdout, exit 1.

### R1-1: fixed

`sameElement` (`sdk/src/error.ts:298-301`) now returns false for an empty or absent role, and otherwise requires
an equal role and an equal name. `remapRefs` (`:310-320`) rewrites the ref on exactly one hit and deletes it
otherwise.

I ran the scratch harness again: the real `locate`, then the real `buildSnapshot` on the same `RefMap`, through a
real `Tab` and `attachContext`, with every printed ref looked up in the live `RefMap`:
```
VERIFIER css  LOCATOR_AMBIGUOUS [{"line":"  - \"Go\"","liveEl":null},{"line":"  - \"Stop\"","liveEl":null}, …] [{"name":"Go"},{"name":"Stop"}]
VERIFIER text [{"line":"  - button \"Total\" [ref=e1]","liveEl":"button:Total"},{"line":"  - \"Total\"","liveEl":null},{"line":"  - \"Loading\"","liveEl":null}, …]
VERIFIER role [{"line":"  - button \"Create item\" [ref=e5]","liveEl":"button:Create item"},{"line":"  - button \"Create folder\" [ref=e3]","liveEl":"button:Create folder"},{"line":"  - button \"Delete\" [ref=e2]","liveEl":"button:Delete"},{"line":"  - button \"Upload\" [ref=e4]","liveEl":"button:Upload"}, …]
VERIFIER amb  [{"line":"  - \"Save\""},{"line":"  - \"Save\""},{"line":"  - \"Save as\""}, …]
```
- Every printed ref names the element with the same role and name.
- Role-less items (the css matches and the `<p>Total` text candidate) carry no ref.
- Role-carrying candidates are still remapped correctly.
- Matches of a role locator now lose their refs too: `Save as` previously kept `e4`. That is a direct consequence
  of the amended rule (S1 sends matches without a role), not a defect.

### R1-2: done

The anchor is now `findIndex(e.ref === ref)` alone (`error.ts:420-427`). That is sound, because `remapRefs` leaves
only refs of the one same-role, same-name element.

### The two replaced tests

Both replacements are legitimate, and both are stricter.
- **"an ambiguous, role-mismatched or role-less candidate loses its ref"** (`failure-report.test.ts:701-730`).
  - The old third expectation (`role:""` → `e3`, the link) was precisely the R1-1 defect.
  - It now asserts `toStrictEqual` with no ref keys for all three items, and that no candidate line carries `[ref=`.
  - The ambiguous case (two `Save`) and the role-mismatch case (`button "Delete"` against `link "Delete"`) are kept.
- **"matches (no role) never keep a ref"** (`:732-751`).
  - It replaces "remapped by name", whose expectation encoded the defect.
  - It is my css repro, with `toStrictEqual([{name:"Go"},{name:"Stop"}])`, and it asserts that no match line
    has a ref.
- **Added: the `{text}` role-less candidate** (`:753-…`). The `<p>` candidate loses its ref and the button keeps
  `e1`.
- Positive coverage of remapping is still asserted by the unchanged test at `:680-699` (four refs rewritten
  exactly, `expectRefsValidIn` = 9).

### Mutations (round 2)

| Mutant | Result |
|---|---|
| Q1 role-less items match by name (the round-1 rule) | 3 failed |
| Q2 role not compared | 1 failed |
| Q3 `remapRefs` not called | 7 failed |
| Q4 several hits → the first is kept | 1 failed |
| Q5 no snapshot → refs kept | 2 failed |
| Q6 anchor ignored | 2 failed |
| Q7 add `TAB_HELD` to the attach set | 3 failed |
| Q8 budget 5001 | 4 failed |
| Q9 attach calls not stale-guarded | 1 failed |
| Q10 `BRIDGE_FAILURES_DIR` ignored | 3 failed; real home untouched |
| Q11 hard 60-line cap removed | 1 failed |

No survivors.

### Exit criteria (round 2)

All met:
- The attach set is exactly the 7 codes; `TAB_HELD`, `TAB_GONE` and `NOT_CONNECTED` are tested not to attach.
- The 5 s cut runs on an injected clock.
- An attach failure lands in `attachErrors`, and the original object is rethrown.
- The report is ≤ 60 lines in total, candidates first, with the F35 wording.
- The screenshot path honours `BRIDGE_FAILURES_DIR`, with the home fallback.
- `failureReports: false` attaches nothing.
- `instanceof` is unchanged, and `index.ts` (not touched) still exports the same eight values.
- No `console.` in `sdk/src`.
- Typecheck and build are green; `npm test` is 1370 → 1435.
- Every group has a failing mutant.
- Only `sdk/src` and `sdk/test` changed.
- Every printed ref names the same role and name in the attached snapshot (measured with the real `locate` and
  `buildSnapshot`).

Open notes carried from earlier rounds:
- F5 is accepted (builder-disclosed redundant guards).
- F7 is accepted (cut calls stay pending until their own timer).
- F8 and F9 are proposed decisions.

### Verdict, round 2

**PASS-with-notes.** No CRITICAL or MAJOR finding remains. The notes are F5/F7 (accepted) and F8/F9 (proposed
decisions for the user). One consequence of the amended rule: refs for `LOCATOR_AMBIGUOUS` matches are always
withheld, even for role locators.
