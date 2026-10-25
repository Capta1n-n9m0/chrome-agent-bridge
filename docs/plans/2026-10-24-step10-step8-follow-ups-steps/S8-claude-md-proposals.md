# S8 — proposed `CLAUDE.md` changes (for the session agent)

Builder: Claude Opus 5.5, 2026-10-25. `CLAUDE.md` is **not** edited by S8 (brief, lane). Each item gives the location in
`CLAUDE.md` as of `312cadb` (856 lines), the old text, the proposed new text, its source, and a recommendation.
Line numbers drift once an earlier item is applied — match by text.

Glossary: "candidate" = a gotcha a stage report proposed; "by reading" = established from the code or a log, not by a
live measurement; Run 14 = Step 10 S1's live wave (§4.21), Run 15 = S7's (§4.22).

---

## (a) Gotcha candidates from S1, S2, S4, S4b, S5, S7 (and their sub-reports)

| # | Candidate | Source (report · item · kind) | Recommendation |
|---|---|---|---|
| A1 | Auto-hidden taskbar's 2 px strip inside the work area counts as an occluder | S1.md Findings 1; S1-live-verifier.md (Return 2) · measured (Run 14) | **Add** (merge with A2, A9 into one "window-placement guards" bullet in *Driving Chrome from the outside*) |
| A2 | A Chrome-owned topmost no-activate popup (`Chrome_WidgetWin_1`, 223×25 px) appears over the options window after a switch is toggled there | S1.md Findings 2; S1-live-verifier.md gotcha 5; S7.md Findings 4 · measured (Runs 14, 15) | **Add**, merged into A1's bullet |
| A3 | Banner after a disarm: gone +4.7–5.0 s (Run 14) vs Run 13's "shown at +3 s, gone by +14 s" | S1.md Findings 3; S1-live-verifier.md gotcha 4 · measured, a record | **Merge** into the existing Step 9 bullet "The disarm reaches running work fast, Chrome's banner does not" (A-edit 1 below) |
| A4 | The post-redirect `downloadStart` check refuses live; hop and target both requested once | S1.md Findings 4 · measured (R14-5c) | **Merge** into the Step 9 bullet "The block list is not a network firewall" (A-edit 2) |
| A5 | `view-source:` + a relative own-page path resolves against the page's origin | S1.md Findings 5 · measured (R14-REL-3) | **Merge** into the Step 9 bullet on `navigate`/`newTab` gating (A-edit 3) |
| A6 | A clean-tree guard catches the step agent's own uncommitted bookkeeping | S1.md Findings 6 · process | **Skip** — a process rule, already in `common.md` LESSONS and #213; not a runtime gotcha |
| A7 | A helper's scan lines trip its own scanner | S1.md Findings 7; S1-live-verifier.md gotcha 1 · measured (R14-TEARDOWN) | **Skip** — helper-specific, fixed in the helper (#213) |
| A8 | Every failure path must print STOP when the row says so | S1-live-verifier.md gotcha 2 · process | **Skip** — a wave-writing rule (LESSONS) |
| A9 | Placement guards need a cursor park and occluder diagnostics before the re-arm click | S1-live-verifier.md gotcha 5 · measured | **Add**, merged into A1's bullet |
| A10 | S2 | S2.md § Findings · — | **None**: S2's findings are stale doc texts (applied by S8 in `docs/setup.md`, `docs/e2e-test-plan.md`, `sdk/src/policy.ts`), not gotchas; but the existing bullet "Trusted CDP input into a background tab …" now states a superseded fact — see A-edit 4 |
| A11 | CDP returns a primitive inline in `Runtime.evaluate`'s reply (no `objectId`); only `return …` keeps a large string off one reply; Run 15 saved a 64 MiB primitive whole; `serialization: "idOnly"` gave a primitive no `objectId` on Chrome 156 | S4.md §6 candidate 1 (by protocol + fake-CDP tests); S7.md Findings 8, Run 15 SAVE-PRIM / SAVE-IDONLY (measured) | **Add** (new Step 10 bullet B1) |
| A12 | The `saveTo` store lives in worker memory; restart, disarm, JavaScript off, tab close/replace or 5 min idle drop it; a later pull answers `Unknown or expired evaluateSave id: <id>` and the SDK removes `.part` | S4.md §6 candidate 2 · unit + cross-package tests; S7 SAVE-TTL/CLOSE/DISARM/JSOFF (measured) | **Add** (B2) |
| A13 | `fs.rename` replaces an existing target on Windows and POSIX alike; a no-overwrite finish needs `link` (`EEXIST`) | S4.md §6 candidate 3 · measured on NTFS by the S4 verifier | **Add** (B2, same bullet) |
| A14 | Main-tree `node_modules` emptied by a scratch-worktree cleanup that followed a junction | S4b.md Findings 1; decisions.md #220 · measured (damage observed, repaired by `npm ci`) | **Add** (B3; a dev-environment gotcha) |
| A15 | PowerShell variable names are case-insensitive: a local `$h` shadows a script-level `$H` through dynamic scope | S5.md Findings 3 · measured by the S5 builder (`Close-Own` cast `127.0.0.1` to IntPtr, exit 1) | **Merge** into the existing "Windows PowerShell 5.1 traps" bullet (A-edit 5, with A16) |
| A16 | Windows PowerShell 5.1 drops an empty argument passed through `powershell -File` (`-ArgLine ''` → `Missing an argument for parameter 'ArgLine'`, exit 1) | S7.md Findings 1 · measured (RET-1, Return 4) | **Merge** into A-edit 5 |
| A17 | Headless `claude -p` actors call `ToolSearch` first unless started with `ENABLE_TOOL_SEARCH=false`; an "exactly [tool]" check then fails | S7.md Findings 2; wave fixer 2's offline dummy-MCP probe · measured (MCPF-1, CAP-1 FAIL; MCPF-1R, CAP-1R PASS with it off) | **Add** (B4, *Driving Chrome from the outside*) |
| A18 | Session restore adds Chrome windows after a relaunch; "exactly one new window" is unsafe — wait for a stable set, pick a uniquely marked window | S7.md Findings 3; #223 · measured (Return 5) | **Merge** into the existing "Chrome restarts and live sites" bullet (A-edit 6) |
| A19 | `printf` in Git Bash turns `\a` of `C:\Users\a…` into BEL | S7.md Findings 5 · met during S7 (step agent; not in a run record) | **Add** as one clause in B4's neighbour, or **skip** — overlaps the memory note "Bash heredocs lose backslashes"; recommend a short merge into A-edit 5's sibling (B5) |
| A20 | A differential capture row is confounded by the first call's cost / the 2/s capture-slot spacing (SW-1R trial 1: 870 ms vs 287/218) — a warm-up trial belongs in the row | S7.md Findings 6; S7-live-verifier.md gotcha 1 · measured | **Merge** into the existing Step 7 bullet "The switch flash is ~1.5 s, not a frame" (A-edit 7) |
| A21 | A read-back helper that throws after launching its window leaves it open; overwriting a scan input on resume makes an earlier PASS unverifiable | S7.md Findings 7; S7-live-verifier.md gotchas 2, 3 · process | **Skip** — wave-harness practice (#226 item 6), not a product gotcha |
| A22 | A popup of a background opener: Chrome names another tab as the opener, so no `leaseGranted` | S7.md Findings 9; #226 (3) · measured (R15-POP-2 (b)) | **Add** as a merge into the Step 7 bullet "`leaseGranted.url` starts empty for a popup" (A-edit 8) |
| A23 | A killed Chrome retired 3 held handles; `tabGone` with the fixture URL; old `Tab` → `TAB_GONE`; safety state survived | S7.md Findings 10; #226 (4) · measured (RET-1R) | **Merge** into the Step 8 bullet "The session marker retires every handle when Chrome restarts" (A-edit 9) |
| A24 | `saveTo` 64 MiB read-out 4.3 s, extension renderer private memory +212 MiB | S7.md Findings 8; S7-run-record.md SAVE-64 · measured, a record | **Add** inside B1 |
| A25 | MCP trusted tools land 9/9 on a background tab after focus-first | S7.md (MCPF-1R) · measured | **Merge** into A-edit 4 |
| A26 | bb-login's new wait: exit 0 on a delayed redirect, 90 s bound on stuck/foreign pages; the real pp1 login took one press | S7.md Findings 11; S5.md · measured (BBL-1, PP1) | **Merge** into "Chrome restarts and live sites" (A-edit 6: the "login script's post-submit check" clause is now history) |
| A27 | `recipes/tsconfig.s6.json`'s `test/*.test.ts` glob pulled in the chrome-typed s9/s10 tests (26 errors since `e91e437`, 29 since `b55048d`) | S8-builder.md item 3 · measured (tsc) | **Add** one clause to the Step 8 bullet "Recipes run with `tsx` …" (A-edit 10) |

### A-edits (existing bullets)

**A-edit 1** — *Runtime gotchas → Step 9*, bullet "The disarm reaches running work fast, Chrome's banner does not."
Old: `banner was still shown 3 s later and gone by +14 s (Run 13 SAFE-4 (b), FAIL, Chrome-owned; re-measured in
  Step 10, #194); a running `waitFor` was refused 54–92 ms after the press (SAFE-4 (a), 4c).`
New: `banner was still shown 3 s later and gone by +14 s (Run 13 SAFE-4 (b), FAIL, Chrome-owned); re-measured in
  Step 10's Run 14 (R14-4b): the `type` ended 5 ms after the press (571 of 1000 typed), the banner was gone between
  +4.7 s and +5.0 s and did not return, and a trusted call after the re-arm worked on the same tab (a record, no
  bound; S1.md Findings 3). A running `waitFor` was refused 54–92 ms after the press (SAFE-4 (a), 4c). *Superseded
  2026-10-25: was "re-measured in Step 10, #194", because Run 14 measured it.*`

**A-edit 2** — *Step 9*, bullet "The block list is not a network firewall."
Old: `The post-redirect download check is
  unit-tested only: Run 13 SAFE-5c's redirect half timed out on the single-threaded test server (#194).`
New: `The post-redirect download check is
  measured live: a download redirected onto a blocked host was refused `DOMAIN_BLOCKED` in 76 ms with no file, and
  the server saw the hop and the target each requested once (Run 14 R14-5c, on the threaded `s9-redirect.py`; S1.md
  Findings 4). *Superseded 2026-10-25: was "unit-tested only: Run 13 SAFE-5c's redirect half timed out on the
  single-threaded test server (#194)", because Run 14 measured it.*`

**A-edit 3** — *Step 9*, bullet "`navigate`/`newTab` are gated on the URL Chrome will open".
Old: `` `view-source:` of a relative own-page path
  answered `ok` (SAFE-REL-3 `rel`, recorded; what it opened is not shown, #196); every later call on such
  a tab is refused.``
New: `` `view-source:` of a relative own-page path
  answered `ok` (SAFE-REL-3 `rel`, recorded) — it resolves against the page's origin, not the extension
  (`wrapper=view-source inner=http own=no`, Run 14 R14-REL-3, #196 answered); every later call on such a tab is
  refused. *Superseded 2026-10-25: was "what it opened is not shown, #196", because R14-REL-3 showed it.*``

**A-edit 4** — *Step 7*, bullet "Trusted CDP input into a background tab answers `ok` and does nothing."
Old: `the SDK never sends
  `focusEmulation`, and the MCP's trusted tools are unchanged (decisions.md · 2026-10-23 · The
  background-input policy (#89); · FE's rows and outcome table, amended before anything is measured
  (#78)).`
New: `the SDK never sends
  `focusEmulation` (decisions.md · 2026-10-23 · The background-input policy (#89); · FE's rows and outcome table,
  amended before anything is measured (#78)). Since Step 10 S2 the MCP's trusted `browser_click`/`browser_type`/
  `browser_press_key` do the same: `focusTab {tab}` on the resolved handle, then the input on the same handle; a
  `focusTab` error is the answer and the input is not sent; untrusted actions never focus; the cursor does not move
  (`mcp/src/tools/registry.ts`; decisions.md · 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools
  focus first too (#106); #214). Measured: 9/9 trusted inputs reached a background fixture tab, the tab in front
  (Run 15 MCPF-1R). Focus and input are two calls, so another actor's capture in the same window can come between them
  (phase doc 0.2, Stage 0 F19; not seen live). *Superseded 2026-10-25: was "and the MCP's trusted tools are
  unchanged", because #106 made them focus first.*`
Also in the same Step 7 section, bullet "The switch sequence, and why it never focuses the window": old `` `focusTab`
is the only call that runs `windows.update({focused:true})` (T3.3 grep; `` — **keep** (still true: the MCP calls
`focusTab`, it adds no `windows.update` of its own); optionally append `(the MCP's trusted tools call it, Step 10
S2)`.

**A-edit 5** — *Driving Chrome from the outside*, bullet "Windows PowerShell 5.1 traps met in Run 12 (Step 8 S6)".
Append: `Met in Step 10: variable names are case-insensitive, so a local `$h` in a function shadows a script-level
  `$H` through dynamic scope (S5 builder: `Close-Own` cast "127.0.0.1" to IntPtr, exit 1; S5.md Findings 3); and
  `powershell -File` drops an empty argument — `-ArgLine ''` arrived with no value, `Missing an argument for parameter
  'ArgLine'`, exit 1 (Run 15 RET-1, Return 4; S7.md Findings 1): omit an empty parameter and let its default apply.`

**A-edit 6** — *Driving Chrome from the outside*, bullet "Chrome restarts and live sites (Run 12; …)".
Old: `the login script's post-submit
  check (it stops once the address bar has been stable for 4 s, at most 20 s) read the SSO page about
  8 s after the press, yet the login had worked (decisions.md · 2026-10-23 · SDK-6/SDK-7 run in
  the session the login actually opened (#101)) — wait on a condition with a bound;`
New: `the login script's old post-submit
  check (address stable 4 s, at most 20 s) read the SSO page about 8 s after the press, yet the login had worked
  (#101) — so since Step 10 S5 `bb-login.ps1` polls on a condition inside one `-WaitSec` bound (default 90) from
  the press: exit 0 on a delayed redirect where the old script exits 4, exit 4 at the bound on a stuck or foreign page
  (Run 15 BBL-1: 90006 ms, 90013 ms; #215), and the real pp1 login took one press (Run 15 PP1);` and add before
  "and live data can change": `session restore adds windows after a relaunch, so "exactly one new window" is no safe
  test — wait for a stable window set and pick only a window with a unique title marker (Run 15 Return 5; #223;
  S7.md Findings 3);`

**A-edit 7** — *Step 7*, bullet "The switch flash is ~1.5 s, not a frame."
Old: `which suggests `onActivated` does not
  end the wait (unconfirmed; Run 8 finding 3).`
New: `which suggests `onActivated` does not
  end the wait (unconfirmed; Run 8 finding 3). The code says the listener does end it (Stage 0, by reading); the live
  differential row SW-1R stayed undetermined (d = 101, 1276, 1421 ms; trial 1's front capture took 870 ms against
  287/218 — a first-call or capture-slot cost), so the waits stay (#226); a later row needs a discarded warm-up trial
  (S7.md Findings 6).` (Check the Stage 0 wording first: as-built § Stage 0 says "`activateForCapture`'s
  `onActivated` listener already ends the 1000 ms wait as written (0.8's premise was wrong)".)

**A-edit 8** — *Step 7*, bullet "`leaseGranted.url` starts empty for a popup".
Append: `A popup of a **background** opener gets no lease at all: Chrome names another tab as its opener, so the
  daemon's opener rule finds no holder and sends no `leaseGranted` (Run 14 R14-POP-1 FAIL, explained by Run 15
  R15-POP-2 (b); with the opener in front it was granted after 150 ms, R15-POP-2 (a); #226 (3), #211 closed). A design
  change to the opener rule is the user's call (#226's Revisit-if).`

**A-edit 9** — *Step 8*, bullet "The session marker retires every handle when Chrome restarts."
Append: `Measured with a killed (not quit) Chrome: kill, relaunch, reconnect 106 ms; the daemon logged
  `extension session changed: 3 handles retired`, the holder got `tabGone` with its fixture URL, the old `Tab`
  answered `TAB_GONE`, and the safety state in `storage.local` survived (Run 15 RET-1R, under the user's grant G10-2;
  #126's live row; #226 (4)).`

**A-edit 10** — *Step 8*, bullet "Recipes run with `tsx` …".
Old: `Recipes are not in `npm run typecheck`: use their own
  `tsconfig*.json` (Commands).`
New: `Recipes are not in `npm run typecheck`: use their own
  `tsconfig*.json` (Commands); a test that imports chrome-typed extension code belongs in a tsconfig with `"chrome"`
  in `types` (`tsconfig.s9`/`.s10`) — `tsconfig.s6.json`'s `test/*.test.ts` glob pulled `s9-rules.test.ts` (since
  `e91e437`, 26 errors in `extension/src/tabs.ts`) and `s10-rules.test.ts` (since `b55048d`, +3 in `debugger.ts`)
  until S8 excluded them (S8-builder.md item 3).`

### B — new bullets (proposed under a new heading **Step 10 — the Step 8 follow-ups (2026-10-25; reports in `docs/plans/2026-10-24-step10-step8-follow-ups-steps/`)**, placed after the Step 9 group)

**B1 — `saveTo`'s CDP leg.** `- **A primitive completion value crosses CDP in one reply; only `return …` is sliced.**
  `Runtime.evaluate` returns a string, number, boolean or null inline — there is no `objectId` to slice — so
  `saveTo` reads a value out of the page in 1 MiB slices (`Runtime.callFunctionOn` on a holder object) only when the
  expression produces an object or a promise completion, i.e. with `return …`; a bare string expression crosses as one
  CDP reply (S4.md §6 candidate 1, by protocol + fake-CDP tests; decisions.md · 2026-10-25 · S4: a primitive completion
  value crosses the CDP leg whole; S7 measures it (#217)). Measured on Chrome 156: a 64 MiB primitive was saved whole
  (Run 15 SAVE-PRIM), and `serializationOptions: {serialization: "idOnly"}` gave a primitive no `objectId`
  (SAVE-IDONLY) — #217's Revisit-if not met. A 64 MiB `return` value took 4.3 s to save and raised the extension
  renderer's private memory by ~212 MiB at its peak (SAVE-64, a record). Keep the setup.md advice "produce a very
  large value with `return …`".`

**B2 — `saveTo`'s store and file finish.** `- **The `saveTo` store is worker memory; the file finish uses `link`.** The
  value waits in `EvaluateSaveStore` (`extension/src/evaluate-save-store.ts`: 5 min TTL refreshed per pull, 8 entries,
  256 MiB per value and in total), dropped at a worker restart, a disarm, JavaScript off, the tab's close or replace,
  or the TTL; a later pull answers `Unknown or expired evaluateSave id: <id>` and the SDK removes `.part` (S4.md §6
  candidate 2; unit + cross-package tests; Run 15 SAVE-TTL/CLOSE/DISARM/JSOFF). The extension never sees the path.
  `fs.rename` replaces an existing target on Windows and POSIX alike, so the no-overwrite finish hard-links `.part` to
  the target (fails `EEXIST`) and falls back to re-check + rename only where links are unsupported (S4.md §6
  candidate 3, measured on NTFS by the S4 verifier; #218). A refusal thrown inside `withDebugger` reaches the wire
  prefixed `[chrome.debugger] ` (`describeDebuggerError`; Run 15 SAVE-REFUSE; #227, a fix offered to the user).`

**B3 — scratch worktrees.** `- **A scratch worktree never shares `node_modules` through a junction.** A recursive
  delete of a worktree followed a `node_modules` junction and emptied the main tree's `node_modules/.bin` (S4b; repaired
  by `npm ci`). Run `npm ci` in the worktree, or remove a junction only with `cmd /c rmdir <link>` before `git worktree
  remove` — never `rm -rf` / `Remove-Item -Recurse` across it (decisions.md · 2026-10-25 · Scratch worktrees never
  share `node_modules` through a junction a recursive delete can follow (#220); S4b.md Findings 1).` Location: *Runtime
  gotchas* top level (a dev-environment fact), or the Conventions section.

**B4 — headless actors and tool search** (*Driving Chrome from the outside*). `- **A headless `claude -p` actor calls
  `ToolSearch` first unless tool search is off.** Claude Code 2.1.310 defers MCP tools, so an actor's first call was
  `ToolSearch`, and a row checking "the actor called exactly [browser_click]" failed while the page saw 9/9 trusted
  inputs (Run 15 MCPF-1, CAP-1 FAIL); with `ENABLE_TOOL_SEARCH=false` in the actor's environment (`s9-actor.ts
  --no-tool-search`) the re-measurements MCPF-1R and CAP-1R passed (S7.md Findings 2; S7 wave fixer 2's offline
  dummy-MCP probe).`

**B5 — window-placement guards** (*Driving Chrome from the outside*; A1, A2, A9). `- **Occlusion guards meet windows
  you did not open.** An auto-hidden Windows taskbar is a visible topmost window whose 2 px strip lies inside the
  monitor's work area (`[x,1078,…,1126]` on a 1080-px monitor): cut placements at the taskbar (Run 14 Return 2; S1.md
  Findings 1). After a switch is toggled on the options page, a Chrome-owned topmost, no-activate popup
  (`Chrome_WidgetWin_1`, 223×25 px at the window's top right, owned by the options window) appears over it (Run 14
  Return 3, Run 15 Return 3 and attempt 4; S1.md Findings 2, S7.md Findings 4) — R15-3R exempts it only when owned by a
  driver window and over none of the read elements (#224). Park the cursor and print occluder diagnostics before a
  click that a guard protects.` Optionally add A19: `In Git Bash, `printf` turns the `\a` of `C:\Users\a…` into BEL:
  pass Windows paths as a `%s` argument or with forward slashes (S7.md Findings 5).`

**B6 — the cap warning** (*Step 8*, merge into "Locators are resolved by the snapshot's own rules"). Append: `Since Step
  10 S3 a locator match past the 800th listable element (on a page with more than 800) carries `pastSnapshotCap: true`
  on `LocateResult` and on the action's reply; the SDK emits `client.on("warning", {tab, method, kind:
  "pastSnapshotCap"})`, the MCP adds `CAP_WARNING_LINE`; `waitFor {locator}` carries none; the count stops at the 801st
  listable element (decisions.md #117, #206, #216; phase doc 0.3 as superseded by S3).` Also in the same bullet:
  `A pre-S1 capture of 46 fixtures` → see (b) item 6.

**B7 — `JS_DISABLED`** (*Step 9*, bullet "Chrome refuses a `javascript:` navigation through the bridge itself").
  Old: `With JavaScript off the gate refuses first (`DISARMED`, scope `evaluate`, SAFE-6).`
  New: `With JavaScript off the gate refuses first (Run 13: `DISARMED`, scope `evaluate`, SAFE-6; since Step 10 S4b
  `JS_DISABLED` with no `data`, measured live in Run 15 JSD; #202, #219). *Superseded 2026-10-25: was "(`DISARMED`,
  scope `evaluate`, SAFE-6)", because S4b gave "JavaScript is off" its own code.*`

---

## (b) Counts and map updates

1. **Codes.** `CLAUDE.md:104` old: `` `codes.ts` (the 25 error codes of spec §10: 24 on the wire, Step 9's `DISARMED` and
   `DOMAIN_BLOCKED` among them, plus `NO_CURSOR`, raised by the SDK alone)`` → new: `` `codes.ts` (the 26 error codes of
   spec §10: 25 on the wire, Step 9's `DISARMED` and `DOMAIN_BLOCKED` and Step 10's `JS_DISABLED` among them, plus
   `NO_CURSOR`, raised by the SDK alone)`` + `*Superseded 2026-10-25: was "the 25 error codes … 24 on the wire", because
   Step 10 S4b added `JS_DISABLED` (#202, #219).*` Source: `shared/src/codes.ts`; S4b.md; as-built § S4b ("26 codes (25 on
   the wire)").
2. **Router methods.** `CLAUDE.md:202` old: `the method table `METHOD_CLASSES` over all 23 router methods` → new: `over all
   26 router methods (Step 10 S4 added `evaluateSaveStart`/`evaluateSaveChunk`/`evaluateSaveEnd`, class `evaluate`)` +
   `*Superseded 2026-10-25: was "23 router methods", because S4 added three (#205, #218).*` Source: `extension/src/safety.ts`
   `METHOD_CLASSES` = 26 keys now (`back click closeTab downloadChunk downloadEnd downloadStart evaluate evaluateSaveChunk
   evaluateSaveEnd evaluateSaveStart focusTab forward hover listTabs locate navigate networkClear networkRequests newTab
   pressKey screenshot scroll selectOption snapshot type waitFor`), 23 at `f45e3bf` (counted by S8); the three are in
   `daemon/src/methods.ts` lines 28–30 (`TAB_METHODS`, lease-checked, no lock).
3. **Tools.** 23, unchanged (`mcp/src/tools/registry.ts`: 23 `reg.tool(` names; tool names and schemas byte-identical to
   `f45e3bf` except `browser_evaluate`'s `saveTo`/`overwrite`, #214). No change to "23 tools" anywhere; the
   `tools/registry.ts` Key-files entry gains: `Step 10's focus-first on the trusted tools (#106), `capped`/`CAP_WARNING_LINE`
   on the six action tools, and `browser_evaluate {saveTo, overwrite?}` (answer `Saved <path>` / `<bytes> bytes · <kind> ·
   sha256 <hex>`)`; and `withSafetyRefusals (a `DISARMED`/`DOMAIN_BLOCKED` …` → `(a `DISARMED`/`JS_DISABLED`/`DOMAIN_BLOCKED` …`.
4. **Tests.** `CLAUDE.md:16` and `:223`: `2720 tests in 116 files` / `2720 passed, 116 files (`npm test` 2026-10-24 at
   ba6029e …)` → `3273 passed, 132 files` (`npm test` on S8's tree, 2026-10-25; at the S8 commit once made) + `*Superseded
   2026-10-25: was "2720 passed, 116 files (… at ba6029e)", because Step 10 added 560 tests and 16 files and S8 removed 7
   (as-built, per stage; S8-builder.md).*` Arithmetic: 2720 → 3280 at S7 (+560), → 3273 at S8 (−7); files 116 → 132.
5. **Commands block, recipes typecheck.** `CLAUDE.md:226` old: `npx tsc --noEmit -p recipes/tsconfig.s6.json # recipes
   typecheck separately (tsconfig.json, .fe, .s6, .s9 cover the others)` → new: `… (tsconfig.json, .fe, .s6, .s9, .s10
   cover the others; all five exit 0 since S8)`. Also `CLAUDE.md:174` `tsconfig{,.fe,.s6,.s9}.json` →
   `tsconfig{,.fe,.s6,.s9,.s10}.json`.
6. **The 45-fixture correction.** `CLAUDE.md:593` old: `A pre-S1 capture of 46 fixtures stayed byte-identical` → new: `A
   pre-S1 capture of 45 fixtures stayed byte-identical` + `*Corrected 2026-10-25: was "46 fixtures", because the capture
   holds 45 (S3 verifier finding 5; S3.md finding 3).*` Verified by S8:
   `node -e "require('./extension/test/fixtures/snapshot-pre-s1.json').length"` → `array 45`; the file has one commit
   (`e9e5e8c`), which also holds 45 — so "46" was never right.
7. **Key files — new files since `1c43887`** (`git diff --stat --diff-filter=A 1c43887..HEAD`):
   - `extension/src/`: add `evaluate-save-store.ts` (pure: `EvaluateSaveStore`, TTL 5 min, 8 entries, 256 MiB, 1 MiB
     chunks, the expired-id refusal), `evaluate/save.ts` (pure: the page-side source strings `SAVE_PREPARE_SRC`,
     `SAVE_META_SRC`, `SAVE_SLICE_SRC`, the value checks and refusal messages), `handlers/evaluate-save.ts` (the three
     `evaluateSave*` handlers). Changed: `debugger.ts` (the save path's CDP slices), `handlers/target.ts` +
     `content/locate.ts` + `handlers/locate.ts` + `handlers/actions.ts` (`pastSnapshotCap`), `safety.ts` (26 classes,
     `JS_DISABLED_MESSAGE`), `sw.ts`.
   - `sdk/src/`: add `evaluate-save.ts` (`saveEvaluateToFile`, `EvaluateToFileOptions`/`Result`, `.part` + link finish,
     `SAVE_TRANSFER_MS`); `tab.ts` gains `evaluateToFile` and `BridgeWarning`; `client.ts` gains `on("warning")` and the
     cursor's `evaluateToFile`; `index.ts` still eight values (types `BridgeWarning`, `EvaluateToFileOptions`,
     `EvaluateToFileResult` added).
   - `shared/src/protocol.ts`: `LocateResult.pastSnapshotCap?`, `EvaluateSaveKind` and the `evaluateSave*` params.
   - `mcp/test/tool-schemas.ts` + `mcp/test/fixtures/tool-schemas-f45e3bf.json` (the `tools/list` schema baseline, #214).
   - `recipes/`: replace `` `assemble-mcp.ts`, `held.ts` and their helpers `export-file.ts`, `guard.ts`, `readonly.ts`,
     `session.ts`, `transcript.ts`, `stub-bb.js` `` (`CLAUDE.md:169–170`) with `` `held.ts` and their helpers
     `export-file.ts`, `guard.ts`, `readonly.ts`, `session.ts`, `stub-bb.js` `` + `*Superseded 2026-10-25: named
     `assemble-mcp.ts` and `transcript.ts`, because Step 10 S8 retired them (phase doc 0.5, #209).*`; add `s9-r14.ps1`
     (Run 14's block runner), `s10.ts`/`s10-rules.ts`/`s10-r15.ps1`/`s10-win.ps1`/`s10-mem.ps1`/`s10-ret1.ts`/
     `s10-ret1.ps1` (Run 15), `tsconfig.s10.json`, the S5 fixtures `fixtures/{bb,sso}-standin-{delayed,stuck,elsewhere}.html`,
     `fixtures/elsewhere-landing.html`, `fixtures/sso-submit-delayed.html`; and `test-fixtures/s10-{cap,mcpf,save}.html`.
8. **Architecture "Flow" paragraph** (`CLAUDE.md:70`): old `` `browser_click {trusted:true}` (or a content-action failure)
   escalates to real CDP `Input` via `chrome.debugger` `` → add after the sentence: `With `trusted:true` the MCP and the SDK
   call `focusTab` first (Step 10 S2; #106).`
9. **Current state block** (`CLAUDE.md:12–46`), proposed in full for the session agent (apply at Step 10's close; adjust
   commits):

```
## Current state (2026-10-25, Step 10 built; gate open)

- **Shipped:** Steps 1–9 (Step 9 — Phase E safety — closed 2026-10-24, #202). Public on GitHub (MIT).
  **23 tools, 26 codes (25 on the wire), 26 router methods, 3273 tests in 132 files** (`npm test` 2026-10-25 at the
  S8 commit). *Superseded 2026-10-25: was "23 tools, 25 codes, 2720 tests in 116 files (… at `ba6029e`)", because
  Step 10 added `JS_DISABLED`, three `evaluateSave*` methods and 553 tests net (as-built, per stage).*
- **Step 10 — the Step 8 follow-ups — built and E2E-run 2026-10-25** (Runs 14–15), as-built
  `docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md`: the MCP's trusted tools focus first (#106); the 800-cap
  warning (`pastSnapshotCap`, the SDK `warning` event, the MCP line; #117); `browser_evaluate {saveTo}` +
  `tab.evaluateToFile` through an extension-side store (#127); `JS_DISABLED` (#202); `bb-login.ps1`'s condition wait
  (#215); the local branch `release/step8` (Variant C, #208); a live retire row on a killed Chrome (RET-1R); the
  chunked MCP recipe retired (S8). Run 15: 27 PASS / 3 FAIL / 3 NOT MEASURED / 4 RECORD, none a product defect
  (#226). **Gate open for the user:** #204 (contract-level parts), #205–#208, #216 item 2, #217, #218, #219 item 1,
  #227 (decisions.md → Open decisions → Step 10); G10-1 — the annotated `step8` tag and any push.
- **Reloads need no human:** (unchanged)
- **Resume:** Step 10's close (the user's rulings above; G10-1). Interactive sessions using the bridge need `/mcp` or
  a fresh session (the MCP and daemon builds changed in Step 10), and the extension a reload.
- **Next** (decisions.md · 2026-10-24 · The roadmap after Step 8 (#129), order open for veto): **Step 11** — D3 file
  upload; **Step 12** — Phase F (`args` for `browser_evaluate`, console capture, keep-attached debugger). Carried from
  Step 10: SW-2 (the ~1.5 s switch re-measured with a warm-up trial, #226 (1)); #227's option (b) if the user picks it;
  a popup lease for a background opener only as a design change (#226 (3)); the network rule against redirects onto
  blocked sites (#140). Live waves run autonomously (#33).
- Update this block with the `session-closeout` skill … (unchanged)
```

   Sources: as-built register (every block); S7.md verdict table; decisions.md Open decisions → Step 10; this report's
   test run. The Step 9/Step 8 bullets of the current block move to history or are dropped per `session-closeout`.
10. **Docs section** (`CLAUDE.md:831` paragraph) — append: `**Step 10 built and E2E-run (2026-10-25, Runs 14–15):** the
    MCP's trusted tools focus first, the 800-cap warning, `saveTo` / `evaluateToFile`, `JS_DISABLED`, bb-login's
    condition wait, `release/step8`; the chunked recipe retired (`docs/plans/2026-10-24-step10-step8-follow-ups.md`,
    as-built `…-asbuilt.md`); its gate waits on the user's open decisions.` And the Step 9 sentence there `its gate waits
    on the user's ruling on Run 13 (#192)` → `closed 2026-10-24 (#202)` with a superseded note.
