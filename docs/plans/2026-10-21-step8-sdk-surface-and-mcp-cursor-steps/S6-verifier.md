# S6 — pre-run verifier report (recipes, wave sheet, expected text)

2026-10-23 · independent verifier (Opus 5.5), level 2 · base 6a97635 + the builder's uncommitted work
(HEAD moved to c53dd00 during the check: decision #96, docs only) · offline only: no Chrome, no daemon,
no port 9234, no Blackboard, no `npm run build` in the main tree, no commit, no edit of the builder's files.

**Verdict: FAIL — one fix round, wave sheet only.** The recipes, the pure rules, the tests and the
Blackboard guards pass every check below. Two MAJOR findings are in the wave sheet: actors are reused
across rows in a way the S5 cursor breaks (LEASE-1 would fail by instrument), and the sheet predates #96.
No code change is needed.

## 1. Clean worktree: the full suite

Commands (Git Bash, Node from nvm):
```
git worktree add <scratchpad>/s6-verify HEAD          # at 6a97635
git diff > s6.patch; (cd s6-verify && git apply s6.patch)   → applied
cp every `git ls-files --others --exclude-standard` path into the worktree
npm ci                       → added 205 packages … ci exit 0
npm run typecheck            → tc exit 0
npm test                     → Test Files 83 passed (83) · Tests 1613 passed (1613) · test exit 0
npx tsc --noEmit -p recipes/tsconfig.s6.json   → exit 0
npx tsc --noEmit -p recipes                    → exit 0
npx tsc --noEmit -p recipes/tsconfig.fe.json   → exit 0
npx vitest run recipes/test/{blackboard-guard,blackboard-readonly,blackboard-export-file,s6-rules}.test.ts
                             → Test Files 4 passed (4) · Tests 79 passed (79)
git worktree remove / rm -rf; git worktree prune; git worktree list → only the main tree
```
The builder's claim (1613 in 83 files, from 1534/79, +79 tests in 4 files) holds.

## 2. Pass rules dry-run on known-good and near-miss input

Harness: a throwaway vitest file in the worktree (jsdom) that loads `test-fixtures/e2e-playground.html`
with its scripts, runs the **real** `extension/src/content/locate.ts` and `buildSnapshot`, then the real
`sdk/src/error.ts` `remapRefs` + `renderReport`, and feeds the result to `recipes/s6-rules.ts`.

Real `locate` output (matches §4.19 SDK-2/SDK-3 text exactly):
```
SDK2 no button named "Sgin in". Nearest: button "Sign in", button "Disabled action", button "Load message in 1.5s", button "Shadow button", button "Trusted-only button".
SDK3 7 elements match button named "Fetch"; pass nth (0-based) to pick one, or narrow the locator.
     matches: Fetch JSON, Fetch 404, Fetch redirect, Fetch unreachable, Fetch black hole, Fetch cross-origin, Fetch 20×
SDK3nth1 {"ref":"e7","role":"button","name":"Fetch 404"}
similarity("Sgin in", …): Sign in 0.714, Disabled action 0.267, Load message in 1.5s 0.250, Shadow button 0.231,
  Trusted-only button 0.211, Trusted-click hit pad 0.190, Click counter: 0 0.188, Iframe button 0.154 (6th or later)
```
The rendered SDK-2 report (40 lines) has `Nearest candidates:`, `  - button "Sign in" [ref=e5]` …,
`Refs: this snapshot renumbered …`, `url: http://localhost:8080/e2e-playground.html?s6=sdk2   title: "Agent Bridge E2E Playground"`,
`- textbox "Email address" [ref=e1]` … `- button "Sign in" [ref=e5]`, `Screenshot: <path>`,
`Network: no failed requests among the tab's last 0 entries.` The SDK-3 report has `Matches (7):` and
`  - "Fetch JSON"` … (no role, no ref).

Verdicts:
```
sdk2 good                      PASS
sdk2 tail reordered            PASS + finding "candidates after the first differ …"   (as ruled: first candidate decides)
sdk2 first wrong / code wrong / shot inside repo / shot missing / no snapshot window / attachErrors / >60 lines   FAIL each
sdk3 good                      PASS
sdk3 nth1 wrong / status 404 / 6 matches       FAIL each
sdk1 good (jsdom click on #submit-btn → "status: form submitted (email = )")   PASS
sdk1 email filled / wrong element               FAIL each
stale {ref:e1,button,"Sign in"} → NEW BUILD; UNKNOWN_METHOD "unknown method: locate" → STALE; VERSION → STALE;
      wrong element / {ok:true} / TIMEOUT → UNEXPECTED
sdk4 1503/12 PASS; 2010/300 PASS; 40 ms FAIL; hidden 1001 FAIL; visible 5001 FAIL
sdk5 good PASS; isTrusted=false / on=password / mark 1 / "status: idle" / activeElement "" FAIL each
sm0 good PASS; no events → NOT MEASURED; up-before-down → NOT MEASURED; tabGone / snapshot TAB_GONE / owner lost FAIL each
describeEvent: fixture url+title shown; non-fixture url → "<non-fixture url withheld>", title withheld (also lastUrl/lastTitle, leaseGranted)
```
Every rule can pass on the true expected text and fails on a near-miss.

Blackboard helpers (tsx-printed `--mcp-plan` run in node:vm against `stub-bb.js`):
```
npm run -s recipe -- recipes/blackboard/export-grades.ts _1_1 --mcp-plan   → exit 0; START is 78 lines, 3 633 chars
plan has __name: false
START  -> {"state":"running","key":"mcp-_1_1"}
STATUS -> {"state":"done","length":626,"bytes":627,"sha256":"92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c","columns":2,"grades":4}
writes on stub: 0
forged START with "fn":"post" -> {"state":"error","error":"bridge: read function not allowed: post"}  writes: 0
chunk on a missing key -> {"missing":true}
```
SDK-7D's pre-registered values (627 bytes, `92fe62ab…a49c`, 2 columns, 4 grade records) are reproduced.
Transcripts in t5-actor's `{"t","m"}` wrapping fed to `assemble-mcp.ts`:
```
good      → status found, 1 chunk result(s), 0 bad; written exports\_1_1-2026-10-23-mcp.json — 627 bytes, sha256 92fe62ab…a49c (= the page's: yes); exit 0
tampered  → FAILED — sha256 eed49d9e… ≠ the page's 92fe62ab…; exit 1
notice line before the status JSON → status missing, 1 bad ("the status output is not JSON"); FAILED; exit 1
```
Both bb.js sources survive `bootBb`'s wrapping (`return (\n<source without trailing ;>\n);` inside an async
function): `parses: stub-bb.js`, `parses: bb.js`.

## 3. Expected text against the code

- S6-STALE: new build → `{ref, role, name}` from `extension/src/handlers/locate.ts:20` / `sw.ts:37`;
  `daemon/src/methods.ts:21` forwards `locate`. FE-era build (6742c1f): `git grep '"locate"' 6742c1f --
  extension/src daemon/src` → nothing; its `router.ts:28` answers `{code: UNKNOWN_METHOD, message:
  "unknown method: locate"}` (identical at HEAD). The new daemon accepts the FE-era proto:2 hello
  (`intercept.ts:152-160`: a missing session marker is `null`, no refusal), so `newTab`/`waitFor {text}`
  work and only `locate` fails → `STALE`. Only the new build answers NEW BUILD (see MINOR-3 for the
  "S2-or-later" residue).
- SDK-1: fixture `:49` (`Sign in`), `:31` (`#email` empty, `form=`), `:188-192` (`form submitted (email = …)`);
  `extension/src/handlers/tabs.ts:74` (`newTab` waits for load before `locate`). Log `client + "…" (n clients)`:
  `daemon/src/main.ts:208-209`.
- SDK-2/SDK-3: `locate.ts:249-258`, `:269-272`; `nearest.ts:42-59`; `sdk/src/error.ts:286-291`, `:310-320`,
  `:349-444`; `sdk/src/format/snapshot.ts:16-18`; screenshot name `error.ts:128-131`, dir `:121-125`. Verified by
  execution (§2).
- SDK-4: fixture `:120-121`, `:251-254` (status text `async content loaded` has no `!`).
- SDK-5: fixture `:176-183` (document `mousedown`, `on=<id>`); `sdk/src/tab.ts:167` (`focusTab` first under
  `focusFirst`); `sdk/src/policy.ts:35` (`focusFirst`).
- SDK-8 / CUR / STAT-1 / MUX-1: `mcp/src/tools/registry.ts:294-321` (status lines incl. `Cursor: none yet — …`,
  `Cursor: <h> "<title>" — <url> (held by me)`, `Human's active tab: … — not mine; call browser_use_active_tab …`),
  `:337` (`Now using …`), `:390` + `describeLocator :161-167` (`Clicked button "Click counter"`), `:531`
  (`Selected tab …`), `:566-568` (`Opened tab <T#>` / ` (in the background — browser_focus_tab shows it)`).
- MUX-2 / LEASE-1 refusal: `daemon/src/intercept.ts:445`; recorded verbatim in Run 8 (`e2e-test-plan.md:1719`).
- SM-0: `intercept.ts:180` (`extension session changed: …`), `:203` (`extension resync: …`);
  `daemon/src/wsHost.ts:195` (`extensionStatus {connected}`); `sdk/src/client.ts:136-144`.
- SDK-7 MCP leg: `extension/src/evaluate/result.ts:39` (20 000 cap), `:93-97` (description capped, value not),
  `:147-149` (a string printed raw); `registry.ts:661-670` (`browser_evaluate` prints `envelope.description`);
  `registry.ts:40-45` (a cursor notice would be prepended — not on a `tab`-less call after `browser_select_tab`).
- SDK-6: `~/.claude/skills/blackboard-ultra/scripts/bb.js:14-16` (`bb already loaded`, `VERSION = '2026-10-18'`),
  `:545` (`return 'bb loaded'`), `:91,97-105` (`get`/`all` are `call('GET', …)`).

## 4. Regression rows against their last record

- MUX-2 (Run 7) + dated note: the TAB_HELD refusal and `Cursor: none yet` line are Step 7 / S5 designed
  changes; text matches `intercept.ts:445` and `registry.ts:313`. Not loosened (see NIT-2 on citations).
- LEASE-1 = Run 8 (`e2e-test-plan.md:667`, record `:1719`) + the S5 note (#95, F26). Matches.
- SCREEN-1 = R9-SCREEN-1 (`:739`, record 1588/1557/1556, median 1557). Text matches; procedure does not (MINOR-1).
- ACT-1/2/3, TRUST-2, EVAL-1, DL-1 = Run 8 (`T5-run-record.md:123-165`): `Typed into e1`, `Clicked e6`,
  `status: counter = 1`, `Clicked e7`, `status: TRUSTED click received`, `Agent Bridge E2E Playground`, DL-1's
  `Saved …\dl1\hello.txt` / `69 bytes · text/plain · sha256 0a6b99ca…56ce`. Text matches; procedure does not (MAJOR-1).
- NET-1 = R9-NET-1 (`:743`, record `:1770`): `showing 2 of 2`, `12.8 KB`, favicon `404 … 460 B`, `from cache: no`,
  `content-length: 13106` (`wc -c test-fixtures/e2e-playground.html` → 13106). Matches #56/#68.

## 5. Blackboard safety, refusal paths offline

Run with `BRIDGE_PORT=59999 BRIDGE_DAEMON='C:\nonexistent\daemon.js' BRIDGE_TOKEN=verifier-dummy`, so any
path reaching `connect()` prints `NOT_CONNECTED: daemon not built` instead of `REFUSED` (control shown last):
```
boot-bb.ts                                   → REFUSED — no course given — …; exit 2
export-grades.ts                             → REFUSED — no course given — …; exit 2
boot-bb.ts pp1                               → REFUSED — the course argument is neither a course id (_NNN_N) nor a URL; exit 2
boot-bb.ts http://localhost:8080/ultra/courses/_1_1/outline        → REFUSED — the course URL is not on https://ada.blackboard.com; exit 2
boot-bb.ts http://ada.blackboard.com/ultra/courses/_1_1/outline    → same; exit 2
export-grades.ts https://ada.blackboard.com.evil.example/ultra/…   → same; exit 2
export-grades.ts https://evil.example.com/ultra/…                  → same; exit 2
boot-bb.ts _1_1 --dry-run --fixture-origin https://ada.blackboard.com → REFUSED — a dry run uses only http://localhost:<port> or http://127.0.0.1:<port>; exit 2
export-grades.ts _1_1 --dry-run --fixture-origin http://example.com:8080 → same; exit 2
export-grades.ts _1_1 --dry-run --fixture-origin http://localhost   → same (no port); exit 2
boot-bb.ts _1_1 --bbjs recipes/blackboard/stub-bb.js   → REFUSED — a real run refuses the stub bb.js (BRIDGE-STUB-BB) — …; exit 2
export-grades.ts _1_1 --bbjs recipes/blackboard/stub-bb.js → same; exit 2
boot-bb.ts _1_1 _2_1 → REFUSED — one course only; boot-bb.ts _1_1 --write → REFUSED — unknown flag --write; --mcp-plan → REFUSED
assemble-mcp.ts (no args) → usage; exit 2
control: boot-bb.ts _1_1 --dry-run → "course _1_1; source stub-bb.js (declares VERSION stub-2026-10-23, sha256 26ee6322a410…); DRY RUN" then NOT_CONNECTED; exit 1
git check-ignore -v exports/x.json bridge.token → .gitignore:30:exports/  exports/x.json · .gitignore:16:bridge.token  bridge.token
```
Read-only by construction confirmed: the page code calls only `bb[op.fn]` with `fn ∈ {all, get}` on
`/gradebook/columns` and `/gradebook/columns/{_N_N}/users` under `bb.P2`; a forged op is refused in the page
(§2). Real runs use `failureReports: false` (boot-bb.ts, export-grades.ts). The recipes open their own tab
only (`client.newTab`), check origin and course after load, print counts/sizes/sha256/handles; status and
chunk expressions never throw. `stub-bb.js` holds invented data only (`_301_1`, `_9001_1`, "Stub Quiz A", …).
bb.js's load itself patches `XMLHttpRequest.prototype.setRequestHeader` in the page (the skill's own XSRF
hook; no request is sent).

## 6. Hygiene and integrity

- Lane: `git status --short` → only `.gitignore`, `docs/e2e-test-plan.md`, `package.json`, `recipes/…`,
  `…-steps/S6-*`. `git diff --stat recipes/hello.ts` → empty.
- Printing: no recipe prints a URL or title but `s6Url(...)` fixture URLs, the `?t5=` marker, a `snap.url` only when
  it equals the sm0 fixture URL, and `describeEvent`'s filtered params; no token anywhere.
- Sheet: no `quit`/restart/kill outside the SM-1/MUX-8 grant lines and `Test-SafeToKill` (lines 17-19, 38, 72,
  109-110); driver-not-a-client check in step 0; reload exit `0` then S6-STALE as steps 2-3.
- Rulings applied: `recipes/sdk-login.ts` for SDK-1; "Run 12 (S6)"; persistent `t5-actor.ts` actors (default model
  `sonnet`, `recipes/t5-actor.ts:54`); MUX-8/SM-1 "not run — needs a Chrome restart grant"; SDK-6/SDK-7 "waits for the
  user" with SDK-6D/7D dry runs; SDK-2 decided by the first candidate (verified in §2).

## 7. The tsx `__name` claim — reproduced

```
recipes/zz-name.ts (throwaway): function pageFn(x){ function inner(y){…}; const arrow = (z) => z + 1; … }
npx tsx recipes/zz-name.ts   (tsx v4.23.15, node v25.2.1)
  has __name: true
  function pageFn(x){function inner(y){return y*2}__name(inner,"inner");const arrow=__name(z=>z+1,"arrow");return arrow(inner(x))}
  vm threw: ReferenceError: __name is not defined
same file imported under vitest:
  has __name: false … vm result: 11
grep keepNames extension/build.mjs mcp/build.mjs daemon/build.mjs → none
```
Confirmed: under tsx, `String(fn)` of a function with inner named functions or named arrows is not
self-contained; under vitest it is, so a vitest-only test cannot catch it. The extension's `SERIALIZER_SRC`
is unaffected (bundled by `extension/build.mjs`, no keepNames). Candidate CLAUDE.md gotcha (source: this
reproduction and S6-builder.md finding 1).

## Findings

**MAJOR-1 — actors are reused across rows, and the S5 cursor makes LEASE-1 and the regression rows act on
the wrong tab.** Step 10: S1's `P-MUX2-S1` navigate claims Ws's tab (now `?t5=mux2`) as S1's cursor. S2's
claim is refused, so S2 has no cursor. Then "LEASE-1 runs on its own driver window with S1 as A and S2 as B"
with P-L1-A1/B1 = `browser_snapshot {}`. A's snapshot goes to S1's cursor (`?t5=mux2`, not `?t5=lease1`). B's
first touch claims the human's tab, the unheld lease1 tab, and **succeeds** instead of the pre-registered
TAB_HELD. LEASE-1 (★) fails by instrument. Likewise step 13 "ACT-1, ACT-2, ACT-3, TRUST-2, EVAL-1 (S1 on window
Wr `…?t5=regr`)": no prompt moves S1's cursor, so they act on Ws's tab. Run 8 ran these rows after
`browser_select_tab {"tab":"T6"}` and a navigate to the plain URL (`T5-run-record.md:123-126`). NET-1's hard
reload hits the window in front while S1's network query reads its cursor's tab (R9-NET-1 says "its tab
selected", `e2e-test-plan.md:743`). Fix (sheet only): run LEASE-1 with fresh actors A and B as in Step 7. For the
regression rows, start a fresh actor on Wr (its first touch claims Wr's tab), or add `browser_select_tab
{"tab":"<Wr's T#>"}` (S1 has the tool) and use the plain URL as Run 8/R9 did.

**MAJOR-2 — the sheet predates decision #96 (c53dd00, committed during this check, after the builder's
report).** #96 grants SDK-6/SDK-7 on the user's course "pp1" (with an autofilled login) and one Chrome restart
for SM-1. The sheet and §4.19 still record "waits for the user" / "not run", and there is no SM-1 recipe. Before
the run the sheet needs:
- the SM-1 recipe and the session agent's final SM-1 text;
- how the driver finds pp1's course id without recording titles or URLs. The recipes accept only `_NNN_N` or a
  course URL: `boot-bb.ts pp1` → REFUSED, as tested;
- the login step: in a driver window, credentials never read or typed by a script. The recipes refuse a login
  redirect by design;
- whether the course id may appear in the public record. The recipes print `course <id>`, and the export file
  names carry it. #96 forbids course URLs and titles; an id is neither, so this is for the step agent to rule
  (e.g. record `<C>`).

Not a builder defect.

**MINOR-1 — SCREEN-1's procedure.** `t5.ts screen1` requires a current tab with marker `screen-human`
(`recipes/t5.ts:563-566,584`), and it evaluates on that tab. The sheet runs it "on Ws" (`?t5=s6-human`, held by
S1 after MUX-2). The result is a set-up failure, or TAB_HELD on the human's tab. It needs its own driver window
`…?t5=screen-human`, uncovered, as §4.14/R9.

**MINOR-2 — the MCP leg of SDK-7 can still save a Blackboard screenshot.** `ATTACH_CODES` includes `TIMEOUT`,
`OFFSCREEN`, `NAV_FAILED` and `REF_STALE` (`sdk/src/error.ts:66-74`). The MCP has no switch to turn reports off
(`mcp/src/tools/registry.ts:187-218`). A `browser_evaluate` TIMEOUT on the course tab would write a PNG of the
page under `~/.chrome-agent-bridge/failures/` and put the image and a snapshot into actor M's transcript (both
outside the repo). The builder made status and chunk throw-free (PAGE_ERROR only), and README's "Failure reports
are off" holds for the SDK legs only. Add a hygiene step: after the MCP leg, list the failures directory, record
any new file by path only, and delete it.

**MINOR-3 — the stale check's unclassified outcome and scope.** A `FAILED — <code>: …` line (a bridge error
before `locate`, e.g. NOT_CONNECTED, exit 1) is neither `STALE` nor `UNEXPECTED` in sheet step 3. Name it
(UNEXPECTED → STOP, or one rerun). The check proves "S2-or-later", not "the S6 build". The only realistic
alternative is the FE-era build (no live load since Run 11), which it does discriminate, and step 4's build
check complements it. Worth one sentence in the sheet.

**MINOR-4 — SDK-7 MCP leg scale.** Each 16 000-character chunk enters actor M's context (~5k tokens). A large
gradebook (hundreds of KB) can exhaust Sonnet's context mid-transfer. Pre-register a cap from the STATUS
`length`, beyond which the row is recorded "not measured", or narrow the export.

**NIT-1** — `s6.ts sm0 --hold <120` and `peek` without a marker validate after `connect()` (`s6.ts:222-223,
254-255`). Observed: `sm0 --hold 10` reached connect (`NOT_CONNECTED` in the harness), so a set-up error can spawn
a daemon. Harmless in the wave.
**NIT-2** — MUX-2's dated note cites the Step 7 phase doc and Run 8 but no decision number; its `Cursor:` clause
says "(S5)" rather than #95.
**NIT-3** — the record skeleton puts pre-flight and build lines before the reload exit. Under #84 the reload exit and
the stale check are "the first recorded lines", so mark steps 0–1 as set-up in the record.
**NIT-4** — the MCP leg's START (3 633 chars) is retyped by the model. A typo is caught only by the hash mismatch
(fail-safe). The page dispatcher still refuses a non-GET function (verified).

## Summary

Full suite in a clean worktree: 1613 passed / 83 files, typecheck and the three recipe tsconfigs exit 0. Every
S6 rule passes on the true text (built from the real `locate`, snapshot and `renderReport`) and fails on
near-misses. SDK-7D's hash, size and counts are reproduced in vm. Every Blackboard refusal exits 2 before connect.
`exports/` is ignored. The tsx `__name` bug is reproduced. Verdict **FAIL** (one sheet-only fix round):
- MAJOR-1: LEASE-1 and the regression rows reuse S1/S2, whose S5 cursors point elsewhere.
- MAJOR-2: the sheet predates #96 (pp1, SM-1 grant; no SM-1 recipe).
- Minor: SCREEN-1's window marker, MCP-leg failure reports, the stale check's `FAILED` branch, MCP-leg size.

---

## Re-check r1 (after S6-fixer1.md)

2026-10-23 · same verifier · base c53dd00 + the uncommitted work after fixer round 1 · offline only. I checked only
the items the step agent named.

### Suite in a clean worktree
```
git worktree add <scratchpad>/s6-verify2 HEAD (c53dd00); git diff | git apply → applied; untracked files copied
npm ci → exit 0 · npm run typecheck → exit 0
npm test → Test Files 83 passed (83) · Tests 1654 passed (1654)      (fixer's claim holds; +41 recipe tests)
npx tsc --noEmit -p recipes/tsconfig.s6.json → 0 · -p recipes → 0 · -p recipes/tsconfig.fe.json → 0
PowerShell Parser::ParseFile recipes/bb-login.ps1 → parse errors: 0
worktree removed (rm -rf + git worktree prune; `git worktree list` → main tree only)
```

### MAJOR-1: closed
- LEASE-1 (sheet step 11) uses fresh actors LA and LB on `$WL = …?t5=lease1`, with B1 before each untargeted
  prompt. LA's first touch claims lease1, LB is refused (`TAB_HELD`), and LB then opens its own tab. This is
  Run 8's set-up (`e2e-test-plan.md:667`: "Driver window W1 on …?t5=lease1 … start A, start B").
- S1/S2 end after STAT-1, and Ws is reopened.
- The regression group (step 14) uses a fresh actor R that runs `P-R0` = `browser_select_tab {"tab":"<T#r>"}` plus a
  navigate to the plain URL. That is Run 8's form (`T5-run-record.md:123-126`) and R9-NET-1's ("its tab selected").
- SCREEN-1 has its own `$Wsh = …?t5=screen-human` window, topmost, foreground, B1. This matches `recipes/t5.ts:563-584`
  and §4.14/R9.

### MAJOR-2 / #96: closed
- **Key resolution** (`session.ts:resolveCourse`):
  - First a GET for courseId lookup; on a 404, the skill-table fallback plus a confirming GET; 401/403 → "not logged in".
  - Every other outcome is a refusal. The lines printed name the label only: `course lookup by courseId → HTTP <s>, an id|no id`,
    `course confirm … the same id`, `course: pp1 (resolved; by …; the id is not printed)`.
  - The page expression (`readonly.ts:courseGetExpression`) accepts two fixed path shapes, makes one GET, and returns `{status, id}`.
- **Fallback "exactly one row"** (`guard.ts:98-124`): 0 rows → null → refusal; ≥ 2 → `Refusal("… N rows … ambiguous")`.
  Run on the real skill table without printing the id:
  ```
  pp1 -> one id, shape _N_N (not printed) · PP1 -> same · pp -> null (refused later) · zz9 -> null
  invented 2-row table -> "the skill's course table has 2 rows for course key pp1 — ambiguous"
  ```
  The step agent's condition holds: it refuses unless exactly one row matches, and it never prints the id.
- **The plan for pp1 never sees the id.** `export-grades.ts pp1 --mcp-plan` → exit 0. The plan has 0 `_N_N` matches,
  8000-character chunks and the 240 000-character cap. In vm with `stub-bb.js` (bb.C = an invented `_42_1`):
  ```
  label set    → mcp-pp1 done, 625 chars, 626 bytes, 2 columns, 4 grades; the id absent from the export text
  no label / wrong label → {"state":"error","error":"bridge: this tab was not booted for course pp1 (run the SDK leg with --keep-open first)"}
  _1_1         → done, 626 / 627, sha256 92fe62ab…a49c (SDK-7D unchanged)
  ```
- **`recipes/bb-login.ps1`** (read):
  - It never reads an Edit control, never types (no SendKeys/SetValue) and never screenshots or evaluates.
  - It reads the address bar's value in memory only, for a host comparison (`Test-OnAda (Get-Addr)`, lines 104 and 125);
    the value is never printed. Window titles are used only as a non-empty filter.
  - It prints counts and yes/no. It invokes at most one Button named exactly Sign in/Log in/Login, once.
  - Exit 4 = waits for the user (window left open, no retry); 2 = nothing touched; 0 closes only its own window.
  - The sheet never retries the login, and a later `REFUSED — not logged in` → "waits for the user".
- **SDK-6/SDK-7 expected text** (§4.19 rows 1001/1002):
  - The `MCP leg size: <L> characters → <k> chunk(s) of 8000; measurable: …` line matches `export-grades.ts:122`.
  - SDK-7D's added line `626 characters → 1 chunk(s) of 8000; measurable: yes` matches the vm result.
- **Failures folder**: `$F0`/`$F1` before and after the MCP leg; new names counted (expected 0), deleted, not recorded.
  The same rule is applied to SDK-2/3 and REP-1.
- **`close-bb-tab`**: the handle is checked before connect. It needs an unheld tab on an ada course page, checked in memory;
  any refusal is exit 2 and leaves the tab open.

### SM-1 and MUX-8: closed
- **Pure rules dry-run**, good input against near-misses:
  ```
  sm1 good PASS · no restart seen → NOT MEASURED
  FAIL each: 0 tabGone, 2 tabGone, other lastUrl, snapshot ok (live T<a>), snapshot TAB_UNKNOWN, listTabs still T<a>,
             owned by the recipe, a low handle (T4 ≤ T5), reconnected 4002, uptime reset
  log good PASS (a pre-quit line ignored)
  FAIL each: none, two, n=0, a marker value on the line, resync 31 s late, no resync
  ```
- **Pre-handles come from every live handle.** `preHandles` is `daemon.status().tabs`, i.e. every live handle
  (`intercept.ts:334-343`), so the "every handle above" clause is not vacuous.
- **The pre-registered steps and PASS text are copied verbatim** in §4.19 SM-1.
- **R1–R6 do not loosen it:**
  - R2: `--restore-last-session` is the "session restore" of the phase doc's S6 note and of #96.
  - R3: equivalent to the original. The retire runs synchronously in the hello handler (`intercept.ts:152-160`),
    so the session-changed line is stamped at the hello.
  - R6: adds client-side "same daemon" checks beside the pid.
- **The restart procedure is Run 10's**: `bgf-count` → `bgf-quit` (chrome://quit) → `bgf-launch` with no behaviour flag →
  `-CloseBlank -Expect N`, with the counts equal.
- **MUX-8 does not disturb SM-1:**
  - `hello.ts` (connect, status, listTabs, no claim) and X's `browser_status` claim nothing.
  - A same-build connect causes no handover and no 4002.
  - The second run is after SM-1's verdict.

### MINOR-3 and the NITs: closed
- **MINOR-3**: control `s6.ts stale-check` with no daemon → `FAILED — NOT_CONNECTED …` then
  `STALE-CHECK FAILED — … STOP the live part and report`, exit 1. Sheet step 3 says STOP, no rerun.
- **NIT-1**: every argument check now runs before connect.
  ```
  sm0 --hold 10 | peek | sm1 --hold 10 | sm1 --marker ../x | sm1-log | sm1-log --since yesterday | close-bb-tab abc | close-bb-tab
  → FAILED — SET-UP: …; exit 2 each
  ```
- **NIT-2**: the MUX-2 note cites #57, which exists (`decisions.md:679`), and #95.
- **NIT-3**: the record skeleton starts with the reload exit and S6-STALE.
- **NIT-4**: noted in the sheet.

### Offline refusals (`BRIDGE_PORT=59999`, a nonexistent `BRIDGE_DAEMON`)
```
boot-bb.ts → REFUSED — no course given — … or its short key (e.g. pp1) …; exit 2
boot-bb.ts pp1 --dry-run | export-grades.ts pp1 --mcp-plan --dry-run → REFUSED — a course key (pp1) is resolved only on https://ada.blackboard.com; …; exit 2
boot-bb.ts courseId:pp1 → REFUSED — the course URL is not on https://ada.blackboard.com; exit 2
boot-bb.ts pp1.202610 | "pp 1" → REFUSED — … nor a short course key (letters and digits); exit 2
boot-bb.ts pp1 --bbjs …stub-bb.js → REFUSED — a real run refuses the stub bb.js …; exit 2
export-grades.ts https://evil.example.com/… → REFUSED; boot-bb.ts _1_1 --dry-run --fixture-origin https://ada… → REFUSED; assemble-mcp.ts → usage, exit 2
controls: boot-bb.ts pp1 → "course pp1; source bb.js (declares VERSION 2026-10-18, …)" then NOT_CONNECTED, exit 1
no exports/ directory created
```

### New notes (NIT, none blocking)
- **r1-N1**: `bb-login.ps1` searches the whole window's UIA tree, browser frame included. A Chrome frame button named
  "Sign in" (e.g. a signed-out profile button) would make the count 2 (→ exit 4, safe) or be the one invoked (harmless,
  then exit 4). Limiting the search to the web document subtree would remove this.
- **r1-N2**: `close-bb-tab` proves "unheld ada course page", not "the recipe's own tab". It relies on the handle the
  recipe printed. Acceptable.
- **r1-N3**: pp1 resolves live through the fallback only if the skill table's single row is still right. The confirming GET
  guards this; a mismatch is a refusal, so "waits for the user".

### Verdict r1: **PASS-with-notes**
MAJOR-1, MAJOR-2 (with the accepted fallback meeting its condition), MINOR-1…4 and NIT-1…4 are closed.
Suite 1654 / 83, typecheck and the recipe tsconfigs exit 0, every refusal path exits 2 before connect,
and the SM-1 rules discriminate. The three r1 notes are NITs.
