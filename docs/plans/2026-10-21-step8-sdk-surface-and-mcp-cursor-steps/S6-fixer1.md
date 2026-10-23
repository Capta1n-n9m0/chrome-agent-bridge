# S6 — pre-run fixer, round 1 (verifier findings + the user's grant #96)

2026-10-23 · fixer (Opus 5.5), level 2 · base c53dd00 + the builder's uncommitted work, edited in place ·
offline only: no Chrome, no daemon, no port 9234, no Blackboard, no `npm run build`, no commit. Lane:
`recipes/`, `docs/e2e-test-plan.md`, `…-steps/S6-*` (`package.json` and `.gitignore` needed no change).

## Verdict of this round

Every finding of `S6-verifier.md` is addressed, and #96 is built in: SDK-6/SDK-7 are runnable rows on
course `pp1`, SM-1 has its recipe and its final text, and MUX-8 runs inside SM-1's quit window. No pass rule
was loosened. The only rows whose text changed are rows that have not run yet (pre-run), each marked with a
dated note. Recipe tests went from 79 to 120 (+41), all in `recipes/test/`; the full suite went from 1613 to
1654 in 83 files.

## Per finding

**MAJOR-1: actors reused across rows (LEASE-1, regression rows).** Wave sheet only.
- Step 10 (MUX-1, STAT-1, MUX-2) keeps S1/S2. Their tool lists are cut to what those rows call. Both end
  after STAT-1. Ws is then reopened, because S1 navigated its tab to `?t5=mux2`.
- New step 11: LEASE-1 runs with fresh actors LA and LB on `$WL = Open-T5Window "${U}lease1"`, set up as
  in Run 8. Neither actor has called a tool. LA's first touch claims the foregrounded `lease1` tab. LB is
  refused (`TAB_HELD`), then opens its own tab in the background (S5 note). The parallel step uses two
  background `send`s.
- Step 14 (regression): a fresh actor R works on `$Wr = Open-T5Window "${U}regr"`. It is set up with
  P-R0 = `browser_select_tab {"tab":"<T#r>"}` and a navigate to the plain URL. **I picked this form because
  it matches the last recorded run**: Run 8 ran ACT-1…3, TRUST-2, EVAL-1 and DL-1 after
  `browser_select_tab {"tab":"T6"}` and a navigate (`T5-run-record.md` § "Regression rows (T5.3)").
  NET-1 uses R9-NET-1's hard reload on Wr. R's cursor is Wr's tab, so its network calls read that tab.
- The "Actors" paragraph states the rule: an actor's cursor is claimed by its first untargeted tool, so
  an actor is never reused on another window.

**MAJOR-2: the sheet predates #96.**
- (a) **Course key `pp1`**. The tests came first and were run red (38 failed / 81 passed), then the code:
  - `guard.ts:50-73`: `COURSE_KEY_RE`, `parseCourseArg` (id | ada URL | key; label = lower-case key) and
    `refuseKeyDryRun`.
  - `guard.ts:82-95`: `RESOLVER_PAGE` = `https://ada.blackboard.com/learn/api/public/v1/system/version`, a
    public JSON page with no course on it, so the lookup `fetch` is same-origin. `checkResolverTab`
    refuses a login redirect and never prints the URL.
  - `readonly.ts:215-240`: `courseLookupPath(key)` → `/learn/api/public/v3/courses/courseId:<key>?fields=id`
    and `courseConfirmPath(id)`. `courseGetExpression(path)` accepts only those two path shapes. It makes
    one `fetch` (GET, credentials included, no body) and returns `{status, id}` with `id` validated as
    `_N_N` or null. It never returns the body and never throws in the page (tested in vm with a recording
    fetch).
  - `session.ts:107` `resolveCourse`: first the courseId lookup. On a 404 it falls back to the skill's
    course table (see Escalated, item 1). On 401/403 it refuses with "not logged in". Every other outcome
    is a refusal (exit 2).
  - **The id is never printed, filed or recorded.** The recipes print `course: pp1 (resolved; by …; the
    id is not printed)`. Files are `exports/pp1-<date>.json` (`export-file.ts:30`) and the export key is
    `sdk-pp1`/`mcp-pp1` (`readonly.ts:68` `COURSE_LABEL_RE`). The export's `course` field holds the label.
    The refusal "not on course" names the label (`guard.ts:176`).
  - **The MCP leg never sees the id.** `startExpression(key, label, {bbC})` (`readonly.ts:182`): the SDK
    leg passes the resolved id as `bbC`; the `--mcp-plan` for a key passes `bbC: null`.
    `PAGE_EXPORT_SRC` (`readonly.ts:128`) then requires `window.__bridgeCourseLabel === "pp1"`, which
    `bootBb` sets (`session.ts:178`). So the MCP leg runs only on the tab the SDK leg kept open. For an id
    argument the old behaviour holds byte for byte: SDK-7D's 627 bytes / `92fe62ab…a49c` was re-measured
    (a test, plus the tsx-built plan in vm).
  - Remaining argument handling: `assemble-mcp.ts` takes `pp1`. `export-grades.ts:98` refuses `--mcp-plan`
    together with a key and `--dry-run`.
- (b) **Login step.** I wrote `recipes/bb-login.ps1`; its window handling is copied from `bgf-quit.ps1`.
  - It opens one window of its own on `https://ada.blackboard.com/` and waits for the address bar to
    settle.
  - It counts UIA Buttons named exactly Sign in / Log in / Login, and checks the address-bar host in
    memory. It prints counts and yes/no only.
  - Its one action is to invoke the single sign-in button once. It never reads an Edit control, types,
    screenshots, snapshots or evaluates.
  - Exits: 0 = logged in (window closed). 4 = waits for the user (window left open, no retry). 2 = nothing
    touched. The recipe's own lookup (200 vs 401) judges the login.
  - It parses (PowerShell parser: 0 errors) but has not run (offline stage).
- (c) **SDK-6/SDK-7 expected text, written in full**: `e2e-test-plan.md` §4.19 rows SDK-6 (line 1001) and
  SDK-7 (line 1002).
  - Counts, shapes and the hash use placeholders only for values measured in the run.
  - Both resolution branches are pre-written. The plan is checked to hold no `_\d+_\d+`.
  - The MCP leg's STATUS must equal the SDK leg's values. S6.3 compares the two files' hashes.
  - **MCP chunks are now 8000 characters** (`export-file.ts:13`), with a pre-registered cap
    `MCP_MAX_CHARS` = 240 000 characters (30 chunks; `export-file.ts:19-24`). Above it the MCP leg is
    "not measured" and the SDK leg is still judged (MINOR-4). The SDK leg prints a `MCP leg size: …;
    measurable: …` line (`export-grades.ts:122`). That line was also added to SDK-7D's expected text,
    pre-run.
  - A failures-folder step runs before and after the MCP leg: names compared, the count recorded, only the
    new PNGs deleted, never opened (MINOR-2). It is also the general "failures-folder rule" in the sheet,
    for SDK-2/SDK-3/REP-1.
  - New `s6.ts close-bb-tab <T#>` (`s6.ts:280`) closes the recipe's own course tab, only if it is unheld
    and on an ada course page. The check is `guard.ts:191` `isAdaCoursePage`, done in memory.
- (d) **SM-1**. `s6.ts sm1` (`s6.ts:301`) claims the driver window's `?t5=sm1` tab and records
  `daemon.status` (tab, tabId, owner, every live handle, uptime, build). It holds up to 900 s, printing
  every event with its time. When the extension is back it waits up to 30 s for `tabGone`, then 10 s
  more. Then it calls `snapshot {tab}` (expects `TAB_GONE`), `listTabs` and `daemon.status`.
  - Pure rules, tests first, red then green: `sm1Verdict` (`s6-rules.ts:227`) and `sm1LogVerdict`
    (`s6-rules.ts:278`).
  - `s6.ts sm1-log --since <iso>` (`s6.ts:378`) reads `daemon.log` without connecting and prints only the
    session-changed and resync lines.
  - §4.19 SM-1 (line 1005) copies the pre-registered steps and PASS text verbatim. It adds the procedure
    from BG-FLAGS (`bgf-count` → `bgf-quit` → `bgf-launch -ArgLine '--restore-last-session'` → `bgf-count
    -CloseBlank -Expect N` → the reload only if the extension does not return within 120 s) and the
    recipe's printed lines. Resolutions R1–R6 are below.
- (e) **MUX-8 inside SM-1's quit window**: §4.19 "Also run" (line 1010) and the sheet's "SM-1 and MUX-8".
  - Actor X (`browser_status` only) is started before the quit. hello.ts runs after `QUIT OK` and X calls
    `browser_status`. After the extension is back, hello.ts runs a second time with a fixture window in
    front, so its `active:` title is a fixture page (B2).
  - MUX-8's existing expected text applies, with its dated S5 correction (no `Cursor:` line).
  - The optional run is **not run**: it needs a second restart.
  - hello.ts claims no tab, so the held SM-1 recipe is not disturbed.

**MINOR-1: SCREEN-1's window.** It now has its own `$Wsh = Open-T5Window "${U}screen-human"`: topmost,
foreground, B1 checked (sheet step 14).

**MINOR-2: MCP-leg failure reports.** See (c): the failures-folder rule and SDK-7 steps 6–7.

**MINOR-3: the stale check's `FAILED —` outcome.** `s6.ts:495` now prints `STALE-CHECK FAILED — a bridge
error before locate answered: neither NEW BUILD nor STALE — STOP the live part and report`. Sheet step 3
and §4.19 S6-STALE (line 995) classify it as STOP with no rerun, and add the sentence about what the check
proves.

**MINOR-4: MCP-leg scale.** Chunks are 8000 characters and the cap is 240 000 characters (see (c)). Each
chunk gets its own `send`.

**NIT-1.** Argument checks now run before `connect()`: `PRECHECKS` (`s6.ts:267`, called at `s6.ts:477`)
for `sm0`, `peek`, `sm1`, `sm1-log` and `close-bb-tab`. Observed: `sm0 --hold 10`, `peek`, `sm1 --hold 10`,
`sm1 --marker ../x`, `sm1-log`, `sm1-log --since yesterday` and `close-bb-tab abc` all exit 2 with
`FAILED — SET-UP: …`, and none reaches `connect()`.

**NIT-2.** MUX-2's dated note (§4.19 line 1036) and the sheet's regression row now cite decisions.md ·
2026-10-22 · T2's daemon details (#57) for the `TAB_HELD` text, and #95 item 2 for the `Cursor:` line.

**NIT-3.** The record skeleton now starts with "Reload (step 2): exit" and "S6-STALE (step 3)" as the
first result lines. Steps 0–1 are labelled set-up (sheet step 0 says so too).

**NIT-4.** Kept, with a note in P-SDK7-M. The model copies START (~3 800 characters). A copy error is caught
three ways: the page refuses an unknown op, the key or hash differs, or `assemble-mcp.ts` matches STATUS
and CHUNK only character for character. Any of these makes the step invalid (one rerun in a fresh actor).
It is never a silent pass. The driver builds each expression into the prompt with `ConvertTo-Json`.

## Tests added (all in `recipes/test/`, written before the code; red run 38 failed / 81 passed)

- `blackboard-guard.test.ts` (+14):
  - `parseCourseArg`: 4 tests, including 20 rejected forms (`12345`, `1pp`, `courseId:pp1`, `pp1.202610`,
    `pp1-2026`, `pp 1`, `pp1/x`, `pp1?x=1`, `pp_1`, 33 letters, a trailing newline, …).
  - The resolver page and `checkResolverTab` (2 tests; no URL in any refusal).
  - `checkLoadedTab` names the label and not the id (1).
  - `courseIdFromSkillTable` (5, on invented rows only).
  - Key + dry run (1).
  - `isAdaCoursePage` (1). *Written before its code but not run red separately; it was added after the
    first green run.*
- `blackboard-readonly.test.ts` (+12):
  - SDK-7D's hash is unchanged (1).
  - Labelled exports (6): label in the export, the id absent, a wrong `bb.C` refused, the MCP leg runs
    only with the label mark and matches the SDK leg's sha, `bbC` required, `exportKey` forms.
  - The course lookup (5): fixed paths, refused paths, a GET with credentials returning only `{status,
    id}`, 404/401/invalid id → null, never a throw.
- `blackboard-export-file.test.ts` (+3): label file names (a dry run refuses a label); chunks ≤ 8000;
  `mcpLegPlan` and the cap.
- `s6-rules.test.ts` (+12):
  - `sm1Verdict` (8): pass; not measured; tabGone count and `lastUrl`; other handles ignored; a live
    `T<a>` by snapshot or listing; another error code; owner and handle order; daemon changed.
  - `sm1LogVerdict` (4): pass; pre-quit lines ignored; none/two/n=0/marker text/late or missing resync;
    bad `since`.

## Checks (commands and output)

```
npx vitest run recipes/             → Test Files 4 passed (4) · Tests 120 passed (120)
npm run typecheck                   → exit 0
npm test                            → Test Files 83 passed (83) · Tests 1654 passed (1654)   (was 1613/83; +41 = the recipe tests)
npx tsc --noEmit -p recipes/tsconfig.s6.json → 0 · -p recipes → 0 · -p recipes/tsconfig.fe.json → 0
PowerShell Parser::ParseFile recipes/bb-login.ps1 → parse errors: 0
```
Offline refusals, with `BRIDGE_PORT=59999 BRIDGE_DAEMON='C:\nonexistent\daemon.js' BRIDGE_TOKEN=dummy`, so
that any path reaching `connect()` prints `NOT_CONNECTED: daemon not built`:
```
boot-bb.ts                         → REFUSED — no course given — … or its short key (e.g. pp1) …; exit 2
boot-bb.ts pp1 --dry-run           → REFUSED — a course key (pp1) is resolved only on https://ada.blackboard.com; a dry run takes a course id (_N_N); exit 2
export-grades.ts pp1 --dry-run     → same; exit 2 · export-grades.ts pp1 --mcp-plan --dry-run → same; exit 2
boot-bb.ts courseId:pp1            → REFUSED — the course URL is not on https://ada.blackboard.com; exit 2
boot-bb.ts pp1.202610 | pp1-2026 | 12345 | "pp 1" | pp1/x → REFUSED — the course argument is neither a course id (_NNN_N), a URL, nor a short course key (letters and digits); exit 2
boot-bb.ts pp1 --bbjs recipes/blackboard/stub-bb.js → REFUSED — a real run refuses the stub bb.js …; exit 2
export-grades.ts https://evil.example.com/ultra/courses/_1_1/outline → REFUSED — the course URL is not on https://ada.blackboard.com; exit 2
boot-bb.ts _1_1 --dry-run --fixture-origin https://ada.blackboard.com → REFUSED — a dry run uses only http://localhost:<port> …; exit 2
s6.ts sm0 --hold 10 | peek | sm1 --hold 10 | sm1 --marker ../x | sm1-log | sm1-log --since yesterday | close-bb-tab abc → FAILED — SET-UP: …; exit 2 (no connect)
controls: boot-bb.ts pp1 → "course pp1; source bb.js (declares VERSION 2026-10-18, …)" then NOT_CONNECTED, exit 1;
          boot-bb.ts _1_1 --dry-run → the old first line, NOT_CONNECTED, exit 1;
          s6.ts stale-check → FAILED — NOT_CONNECTED … then STALE-CHECK FAILED — …, exit 1
```
The tsx-built `--mcp-plan` output, run in node:vm against `stub-bb.js`:
```
pp1, bb.C=_42_1, label mark set   → has __name: false · ids in START: 0 · {"state":"running","key":"mcp-pp1"} → done, 2 columns, 4 grades
pp1, no label mark                → {"state":"error","error":"bridge: this tab was not booted for course pp1 (run the SDK leg with --keep-open first)"}
_1_1                              → done, length 626, bytes 627, sha256 92fe62abc12d1ac759e6b29f287520a7a486be9150666372028e1027d389a49c (unchanged)
```
Hygiene: `grep` for the skill table's real pp1 identifiers (its course id, courseId and foundationsId) in
`recipes/`, `docs/e2e-test-plan.md` and `S6-*` returns nothing (exit 1). Every test uses invented ids.
`git status --short` shows lane paths only. `recipes/hello.ts` is unchanged.

## SM-1 resolutions (what the pre-registered text left open) and other proposed decisions

- **2026-10-23 · SM-1's open points, resolved before the run (R1–R6).**
  **Decided:**
  - (R1) `T<a>` is the tab of a driver window `?t5=sm1`, claimed by the recipe. It is not a background
    `newTab`, which could land in a window of the user's.
  - (R2) "without flags" means no behaviour flag. The relaunch is `bgf-launch.ps1 -ArgLine
    '--restore-last-session'`, as Run 10's restart 2.
  - (R3) The daemon logs no line for the extension's hello. The retire runs inside the hello handler and
    the hello's resync logs next. So "within 30 s of the extension's hello" is checked as "an `extension
    resync:` line at most 30 s after the single `extension session changed:` line, both after the quit
    time `$Q`" (`sm1LogVerdict`). "No marker value" means the line is exactly `extension session changed:
    <n> handles retired`.
  - (R4) "`bgf-count` equal before and after" compares count C1 (taken after `$Wm` opened) with the
    count after `-CloseBlank -Expect N`. The quit window comes back blank, as in Run 10. A third count
    after `t5.ts cleanup` must equal the count before `$Wm`.
  - (R5) The extension gets 120 s after the launch to come back on its own, then `reload-extension.ps1`
    once (exit 0, else STOP), recorded. A reload can keep the old marker (#80), so it is a watch item, not
    a re-tune.
  - (R6) The recipe adds client-visible "same daemon" checks (no 4002 reconnect; uptime kept counting)
    beside the pid clause, which stays the driver's `Get-BridgeDaemon`. `NOT MEASURED` is recorded and
    not rerun: one restart.

  **Why:** the pre-registered text fixes the outcome, not these mechanics. Each choice is the stricter or
  measured one (Run 10's procedure). **Instead of:** a background `newTab` (R1); a bare relaunch relying on
  the user's startup setting (R2); no time bound (R3). **By:** Claude (pre-registered rule, mechanics
  only; listed for the user with #84's kind).
- **2026-10-23 · A course key resolves on ada by one read-only GET; the id stays in memory.**
  **Decided:** `boot-bb.ts`/`export-grades.ts`/`assemble-mcp.ts` accept a short key (`pp1`). It is
  resolved on ada's public `system/version` page by `GET /learn/api/public/v3/courses/courseId:<key>?fields=id`.
  On a 404 the fallback is the skill's course table (`references/ada-instance.md`, read-only): the one row
  whose repo folder starts with `<key>-`, confirmed by `GET /learn/api/public/v3/courses/<id>?fields=id`
  returning the same id. Everything is printed and filed under the label; the id is never printed or
  written. The MCP leg runs on the SDK leg's tab, marked with the label. **Why:** #96 names "pp1"; the
  public-repo rule forbids course URLs and titles. **Instead of:** asking the user for the id (it would
  then be recorded); matching course titles in the page. **Revisit if:** the lookup or the table row
  does not resolve live, or the skill's table changes shape. **By:** Claude (design-local; the fallback
  needs the step agent's ruling, see Escalated).
- **2026-10-23 · SDK-7's MCP leg: 8000-character chunks, a 240 000-character cap, one `send` per call.**
  **Decided:** as (c). **Why:** a large gradebook could exhaust the actor's context (verifier MINOR-4);
  the cap is fixed before the data is seen. **Instead of:** 16 000-character chunks with no cap; narrowing
  the export (it would change the export's shape and the dry-run hash). **By:** Claude.
- **2026-10-23 · The Blackboard login is autofill + one UIA invoke, judged by the recipe's lookup.**
  **Decided:** `recipes/bb-login.ps1` as in (b); exit 4 means "waits for the user". **Why:** #96's
  conditions (never read or type credentials; nothing beyond autofill + submit). **Instead of:** Enter
  key presses into an unknown focus; a snapshot to find the button (forbidden). **By:** Claude (on the
  user's grant #96).
- **2026-10-23 · MUX-8 runs inside SM-1's quit window; its optional run is not run.** **Decided:** as
  (e). **Why:** the grant is one restart; the step agent ruled MUX-8 into it. **Instead of:** a second
  restart for the optional run. **By:** Claude (step agent's ruling).

## Escalated / for the step agent

1. **"pp1" is very probably not the course's Blackboard `courseId`.** I read the skill's
   `references/ada-instance.md` (read-only; its content is not repeated here). It lists the course the
   user very likely means with a `courseId` of another form, and a repo folder named `PP1-…`. So the ruled
   lookup `GET …/courses/courseId:pp1` will most likely answer 404.
   - I added the skill-table fallback above. It is deterministic and tested on invented rows, confirmed by
     a second read-only GET, and prints which branch resolved.
   - **This goes beyond the ruling's literal wording.** If the step agent prefers not to use it, delete
     the `first.status === 404` branch in `session.ts:resolveCourse`. Without it the live row will
     probably end `REFUSED — course pp1 did not resolve …` → "waits for the user".
   - Also not tested: whether ada's public `system/version` page loads without a login redirect. If it
     redirects, `checkResolverTab` refuses (exit 2), which is safe.
2. **`bb-login.ps1` has never run.** Whether a UIA Invoke on a web button submits Chrome-autofilled values
   (Chrome may hold autofill values until a user gesture) is unmeasured. The safe outcome is exit 4,
   "waits for the user".
3. The SDK-7 data in actor M's transcripts (outside the repo) remains the user's call to delete. This is
   unchanged from the builder's open question 3.
4. No denial, no out-of-lane change. `package.json` and `.gitignore` needed nothing.

## Files changed in this round

`recipes/blackboard/{guard,readonly,export-file,session,boot-bb,export-grades,assemble-mcp}.ts`,
`recipes/s6.ts`, `recipes/s6-rules.ts`, `recipes/README.md`, new `recipes/bb-login.ps1`,
`recipes/test/{blackboard-guard,blackboard-readonly,blackboard-export-file,s6-rules}.test.ts`,
`docs/e2e-test-plan.md` (§4.19 S6-STALE, SDK-6, SDK-7, SM-1, Tools, Also run/MUX-8, MUX-2 note; §5
template lines), `…-steps/S6-wave-sheet.md` (revised throughout), this report.
