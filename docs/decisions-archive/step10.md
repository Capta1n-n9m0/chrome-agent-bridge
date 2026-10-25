# Decisions archive — Step 10: the Step 8 follow-ups

Entries moved verbatim from `docs/decisions.md` when the step closed; numbers unchanged, newest first. Cite an
entry by date + title ([`docs-writing-guide.md`](../docs-writing-guide.md#decisions)). The index is in
[`decisions.md`](../decisions.md#archive).

### 2026-10-25 · The user rules on Step 10's open decisions; Step 10 closes (#229)
**Decided:** after reading `docs/plans/2026-10-25-step10-open-decisions-review.md`, the user ruled in four groups:
- **saveTo (A1–A4): accepted as built** — #205 (store + 1 MiB pulls), #207 (strict file rules), #218 (method names,
  `INTERNAL` for a lost id, store limits and cross-client eviction, `Tab.evaluateToFile`), #217 (a plain-string last
  value crosses in one message; advise `return …`). A5: the `saveTo` parameter's description gains `kind` in Step
  11's first code stage (a dated schema re-baseline under #214's rule).
- **Texts (B1–B4):** #206 (the warning event and the `BridgeWarning` type), #216 item 2 and #219 item 1 accepted as
  built; **#227 option (b)**: the bridge's own coded refusals inside `withDebugger` lose the `[chrome.debugger] `
  prefix (raw Chrome and page errors keep it), built in Step 11's first code stage with a new live row SAVE-REFUSE-R.
- **Release (C1–C2):** #208's layout accepted; **G10-1 granted** — create the annotated tag `step8` on
  `release/step8` and push the branch and the tag.
- **Order (D1–D3):** the network rule against redirects onto blocked sites (#140) becomes **its own small step after
  Step 11**, before Step 12; the ~1.5 s capture switch is re-measured with a warm-up trial in Step 11's live wave
  (row SW-2), no code change before; a popup of a background opener stays without a lease.
#204's contract parts are covered by the above. With this, **Step 10 is closed**.
**Why:** the user's answers (2026-10-25): "Accept all as built (Recommended)"; "Accept B1–B3; fix B4
(Recommended)"; "Accept, tag and push (Recommended)"; "Own small step after Step 11 (Recommended)".
**Instead of:** a size refusal for plain strings; keeping the prefix; one squashed release commit or no push; the
redirect rule inside Step 11 or after Step 12.
**Revisit if:** a later wave contradicts a Run 15 row.
**By:** user

### 2026-10-25 · S8: the retirement as done, the s6 typecheck fix, and where the pointers go (#228)
**Decided:** (1) retired `recipes/blackboard/assemble-mcp.ts`, `transcript.ts`, `export-file.ts`'s `assemble()` and
exactly the 7 tests of 0.5/F9 (6 in `blackboard-export-file.test.ts`, 1 in `blackboard-held.test.ts`; 3280 → 3273);
`--mcp-plan` stays, naming `browser_evaluate {saveTo}`; `exportFileName`'s `"mcp"` option and its tests stay; (2)
`recipes/tsconfig.s6.json` excludes `test/s9-rules.test.ts`, `test/s10-rules.test.ts` and `test/s10-fixtures.test.ts`
— its glob had pulled in chrome-typed rule tests (29 errors since `e91e437` and `b55048d`), which `tsconfig.s9.json` /
`tsconfig.s10.json` already cover; all five recipes tsconfigs exit 0; (3) pointers in `docs/e2e-test-plan.md` (§4.6
`:306`, §4.19 SDK-7) are dated notes after their tables, never inside a run row.
**Why:** S8 report and verifier (`…step10…-steps/S8.md`). **Instead of:** adding chrome types to the s6 project;
editing pre-registered rows. **Revisit if:** a new recipes test imports chrome-typed extension code; §4.19 is re-run.
**By:** Claude

### 2026-10-25 · S7: SAVE-REFUSE's `[chrome.debugger] ` prefix — the product stays for now; a fix is offered (#227)
**Decided:** SAVE-REFUSE's FAIL stands as recorded. The product behaved as built: `saveTo`'s own refusals are thrown
inside `withDebugger`, and `describeDebuggerError` keeps an own `BridgeError`'s code and data but prefixes its message
`[chrome.debugger] ` (`extension/src/debugger-errors.ts`), so §4.22's expected text (tied to the throwing constants,
not the wire) was wrong. For now: (a) keep the product; a dated note beside §4.22's row records the wire text; nothing
re-run. Offered to the user: (b) an own coded `BridgeError` keeps its message unprefixed (raw Chrome and page errors
keep the prefix; EVAL-5 unchanged), failing test first, then a new row SAVE-REFUSE-R — the S7 step agent recommends
(b), since the prefix tells an agent "the debugger failed" when the bridge refused a value on purpose.
**Why:** a refusal's text is a contract item; (a) changes nothing and is undoable, (b) waits for the user.
**Instead of:** re-judging the row; changing the product without the user.
**Revisit if:** the user picks (b); another own refusal inside `withDebugger` is found to rely on the prefix.
**By:** Claude (open for the user)

### 2026-10-25 · S7: Run 15 stands as recorded; its follow-ups (#226)
**Decided:** Run 15 (S7, `32cb5fc`/`c8169ff`, live verifier PASS-with-notes) stands: 27 PASS, 3 FAIL (MCPF-1 and CAP-1
on the harness — the actors' first call was `ToolSearch` while the page saw 9/9 trusted inputs; SAVE-REFUSE, #227),
3 NOT MEASURED (SW-1 helper bug; R15-3 strict guard; RET-1 relaunch bug), 4 RECORD; re-measurements MCPF-1R, CAP-1R
(MCP leg), R15-3R (under #224) and RET-1R PASS; the pp1 leg PASS (page, SDK file and MCP file equal sha256, 419 015
bytes; no value run in the transcript). Consequences: (1) SW-1R is undetermined (d = 101, 1276, 1421 ms), so **no
S7b** and `activateForCapture`'s waits stay; the ~1.5 s switch stays a carried input; (2) #217's Revisit-if is not met
(SAVE-PRIM saved a 64 MiB primitive), so #217 stands; (3) R14-POP-1 is explained: with the opener in the background,
Chrome names another tab as the popup's opener (R15-POP-2 (b)), so no `leaseGranted` — not a daemon defect (#211
closed); (4) RET-1R measured #126's live row: a killed Chrome retired 3 held handles, `tabGone` carried the fixture URL,
the old `Tab` answered `TAB_GONE`, the safety state survived; (5) #223's three NITs are known limits; (6) later waves'
worker-console check gets its own positive control and every scan input is archived per attempt. The safety state was
read back equal after every attempt and leg.
**Why:** the fresh live verifier re-read every row against the pre-written text and matched all 8 STOP lines to
Returns 1–5 (`…step10…-steps/S7.md`).
**Instead of:** re-running failed rows in the wave; an S7b on an undetermined measurement.
**Revisit if:** a later wave contradicts a Run 15 row; a popup lease for a background opener is wanted (then a design
change to the opener rule, the user's call).
**By:** Claude

### 2026-10-25 · Fresh agents instead of resumed ones (#225)
**Decided:** from now on, a stage that needs to continue is handed to a **new** step agent that resumes from its
ledger, and every builder, verifier and fixer is a new agent too; the session agent and step agents no longer continue
an earlier agent by message (`SendMessage`).
**Why:** the user (2026-10-25): "we keep resuming subagents, even tho their context is pretty full. Our whole system
is built so a new agent will have good context and will be able to continue from scratch." The S7 step agent had been
resumed five times.
**Instead of:** resuming long-lived agents whose context is nearly full.
**Revisit if:** a resume is the only way to recover work that is not in a ledger or report (then write it there first).
**By:** user

### 2026-10-25 · R15-3R: the guard ignores a popup owned by the wave's own window that covers nothing the row reads (#224)
**Decided:** asked under #212's Revisit-if, the user allowed the exemption: for R15-3R, the occlusion guard ignores
a covering window only if one of the wave's own windows owns it **and** it covers none of the five things the row
reads; any other covering window still stops the row. **Why:** Run 15 identified the occluder as a small popup owned by
the wave's own options window; the S7 wave verifier found the rule sound. **Instead of:** keeping R15-3 NOT MEASURED.
**Revisit if:** a covered read is ever accepted under this rule. **By:** user

### 2026-10-25 · RET-1's end safety read-back reads only a window the wave opens and marks (#223)
**Decided:** after a Chrome relaunch the read-back helper waits until Chrome's set of windows stops changing, opens
its check window with a unique marker, and reads only that window; zero or two matches is a STOP. RET-1R's reconnect
wait turns "Chrome never reconnects" into a STOP rather than a FAIL. **Why:** Run 15's Return 5 — the restored
session brought back two Chrome windows (the user's) and the helper, rightly, touched neither, so the state was never
compared. **Instead of:** reading only `daemon.status` (cannot hash the block list — weaker). **Revisit if:** the
marker cannot be placed in Chrome 156's window title. **By:** Claude

### 2026-10-25 · The user widens Step 10's grants: unlimited Chrome restarts, repeated pp1 reads, hidden pp1 writes (#222)
**Decided:** for Step 10's remaining work, the user allows (1) restarting (including killing and relaunching) their
real Chrome as many times as needed; (2) reading the pp1 Blackboard course as many times as needed; (3) test writes on
pp1, provided what is written is hidden from students — something briefly visible to students is acceptable as long as
it is hidden shortly after. The repo stays public: no course or student data in committed evidence; only sizes, hashes
and counts.
**Why:** the user's clarification (2026-10-25): "you may restart chrome as many times as you need, and also you may
access pp1 course reading as many times as you need + if you need to test writes, you are free to do so, just make
sure it is hidden from students. If something is brifely open to the students, it is fine, as long as it will be
hidden shortly after".
**Instead of:** #221's once-only grants.
**Revisit if:** the user withdraws it; Step 10 closes (not standing beyond this step).
**By:** user
*#221's G10-2 and G10-3 grants are widened by this entry.*

### 2026-10-25 · The user grants RET-1's Chrome kill (G10-2) and the pp1 leg (G10-3) once for Run 15; the button is already pinned (#221)
**Decided:** asked once when Run 15's runner stopped at `STOP: HUMAN GATE (pinning)` before its first row, the user
answered: pinning — "Already pinned" (so no click is granted, and the helper's reading that the button is unpinned is
a discrepancy to diagnose, not a gate to pass by clicking); RET-1 — "G10-2 granted" (kill and relaunch the user's real
Chrome once, as the S7 wave sheet §6 package describes, after Run 15's other rows); the pp1 leg — "G10-3 granted for
pp1" (once, read-only, as the wave sheet §7 package describes; a login only by `recipes/bb-login.ps1`'s one press).
**Why:** the user's answers to the session agent's question (2026-10-25).
**Instead of:** recording RET-1 and the pp1 leg "not run — waits for the user"; pinning by mouse click.
**Revisit if:** the helper still reads "unpinned" after diagnosis (then the runner returns again and the user is asked).
The grants are for Run 15 only, not standing.
**By:** user

### 2026-10-25 · Scratch worktrees never share `node_modules` through a junction a recursive delete can follow (#220)
**Decided:** every brief that makes a scratch worktree says: run `npm ci` in the worktree, or remove a `node_modules`
junction only with `cmd /c rmdir <link>` before removing the worktree — never `rm -rf` / `Remove-Item -Recurse`
across it. **Why:** during S4b's builder cleanup the main tree's `node_modules/.bin` and `node_modules/@asamuzakjp`
were emptied (S4b verifier F1; cause inferred: a recursive delete through the junction), breaking jsdom tests and
`npx vitest`; repaired by `npm ci` before the stage commit. **Instead of:** junctions with ad-hoc cleanup.
**Revisit if:** a worktree must avoid a full install for time. **By:** Claude (S4b report)

### 2026-10-25 · S4b: `JS_DISABLED`'s wire shape and the SDK line for an old extension (#219)
**Decided:** (1) `JS_DISABLED` carries no `data`; its message is Step 9's JavaScript-off text byte for byte; (2)
`safetyRefusalLine` renders `JS_DISABLED` as `JS_DISABLED: <body>` and an old Step 9 extension's `DISARMED
{scope:"evaluate"}` as `DISARMED: <body>`, the body shared byte for byte; (3) `DISARMED_EVALUATE_MESSAGE` stays
exported as an alias of `JS_DISABLED_MESSAGE` (a Run 13 history test imports it). With the bridge off the same calls
answer `DISARMED {scope:"all"}`; `"evaluate"` is no longer produced; which methods are gated is unchanged.
**Why:** the code now names the switch, so a scope is redundant; every safety line starts with the code the caller
received; setup.md and Run 13 pins stay stable. Tests 3145/130 → 3165/130; the changed expected texts are listed per
file in `…step10…-steps/S4b.md`, each ordered by #202.
**Instead of:** `data: {scope:"evaluate"}` on the new code; one `JS_DISABLED: …` line for both codes.
**Revisit if:** a client must tell an `evaluate` refusal from a script-URL refusal (a `data.kind` would be a contract
change); the user wants one line regardless of code.
**By:** Claude (S4b report; item 1 is a code's wire shape — open for the user)

### 2026-10-25 · S4: `saveTo`'s wire methods, refusals, store caps, SDK form and file finish (#218)
**Decided:** as built in S4 (`6ba2d10`; full texts in `…step10…-steps/S4.md` §5): (1) three tab methods
`evaluateSaveStart {tab, expression, timeoutMs?}` → `{id, bytes, kind: "string"|"json"}`, `evaluateSaveChunk {tab,
id, offset, length?}` → `{data}` (base64, ≤ 1 MiB), `evaluateSaveEnd {tab, id}` → `{released}`, class `evaluate`,
daemon tab methods, no lock; (2) an unknown, expired, lost or other tab's id → `INTERNAL Unknown or expired
evaluateSave id: <id>`, as `downloadChunk`; (3) store: 5 min TTL, 8 entries, 256 MiB, oldest evicted across all tabs
(one client's saves can push out another's, which then fails cleanly), over the cap → `BAD_PARAMS` before any slice;
(4) value refusals: `undefined`, function, symbol, Map, Set, DOM node, a `JSON.stringify` of `undefined` →
`BAD_PARAMS` with fixed texts; a throwing `JSON.stringify` → `PAGE_ERROR` with a fixed text; (5) SDK:
`Tab.evaluateToFile(expression, {path, overwrite?, timeoutMs?})` → `{path, bytes, kind, sha256}` plus the client
mirror, new types `EvaluateToFileOptions`/`EvaluateToFileResult` (values stay eight), two helpers on the existing
`@bridge/sdk/download` subpath; (6) the finish: `rename` with `overwrite`, otherwise a hard link (`EEXIST` →
`BAD_PARAMS`) then `.part` removed, retried once, a second failure → `INTERNAL` with the target kept.
**Why:** #205 and #207 applied, mirroring `downloadStart`/`Chunk`/`End`; the verifier measured each refusal and the
cross-actor eviction over real `ws` on port 0.
**Instead of:** a `store` flag on `evaluate`; `BAD_PARAMS`/`TAB_UNKNOWN` for a lost id; per-tab quotas; a ninth export
value; a plain `rename` that replaced a file appearing mid-save.
**Revisit if:** S7's SAVE rows show memory pressure; concurrent actors' saves collide in practice; clients need to
tell "lost" from a bug.
**By:** Claude (contract-level — wire methods, codes, the SDK surface; open for the user)

### 2026-10-25 · S4: a primitive completion value crosses the CDP leg whole; S7 measures it (#217)
**Decided:** `saveTo` keeps `evaluate`'s semantics. Objects and promise-valued completions (any `return …`) are sliced
on the CDP leg; a **primitive** completion value (an expression whose last value is a plain string, with no `return`)
arrives whole in `Runtime.evaluate`'s reply — CDP gives a primitive no `objectId` — and is sliced from the worker on,
so no runtime message or WebSocket frame grows with it (largest frame ~1.4 MB for an 8 MiB value; the 100 MiB 1009
close cannot be reached through `saveTo`). The description and SDK docs advise `return …` for a very large value. S7
measures rows SAVE-PRIM and SAVE-IDONLY.
**Why:** no semantics-preserving fix was found (S4 builder §7, verifier §4: `objectGroup`/`$_` still return the reply
whole; wrapping the expression loses `replMode`'s top-level `await` and may meet CSP; `serializationOptions: idOnly`
is unproven); this is the conservative choice — no new refusal, every tool unchanged. It falls short of Stage 0 F2's
note ("no single message grows with the value") for this one leg, inside Chrome.
**Instead of:** a save-only rewrite of the expression; `idOnly` unmeasured; a new size refusal for primitive
completions.
**Revisit if:** SAVE-PRIM fails at ≥ 64 MiB (then a size refusal at the measured bound), or SAVE-IDONLY shows an
`objectId` for a primitive (then `idOnly`).
**By:** Claude (touches 0.4 (user) and #205; open for the user)

### 2026-10-25 · S3: the cap warning's edges as built (#216)
**Decided:** (1) "past the cap" needs > 800 listable elements, counted up to the 801st (a non-listable match after the
800th listable element on an exactly-800 page is not flagged — S3 verifier MAJOR 1, fixed); (2) a `{text}` match
inside the 800th listable element itself is flagged on a > 800 page, per 0.3's wording, pinned by a test, though the
snapshot lists the enclosing element; (3) `waitFor {locator}` carries no flag; (4) the MCP's six action tools add the
one line `Warning: this element is past the snapshot's 800-element cap — browser_snapshot does not list it.`;
(5) the SDK exports a new **type** `BridgeWarning` (values stay eight) — part of #206 for the user; (6) "absent at every
index" on 799/800 pages is a counter check plus sampled `locate` calls (the literal loop, ~2 min per page, was run
once by the verifier: 0 flagged).
**Why:** S3 report and verifier re-check (`…step10…-steps/S3.md`, `S3-verifier.md`).
**Instead of:** flagging on exactly-800 pages; a literal every-index loop in the suite.
**Revisit if:** the user prefers (2) unflagged (the snapshot does list the enclosing element).
**By:** Claude
*Note 2026-10-25: #206's open item now also covers the type export `BridgeWarning`.*

### 2026-10-25 · S5: `bb-login.ps1`'s post-submit wait — exit rules and the hard bound (#215)
**Decided:** after its one press the script waits inside one bound counted from the press (`-WaitSec`, default 90):
exit 0 once the Blackboard host shows no sign-in control on two clean scans in a row with the address unchanged
(case-sensitive) for 4 s; exit 4 at the bound whatever the page, or at once if its own window is gone; no scan starts
in the last max(5 s, slowest scan so far), so the bound is a hard cap; no "Not secure" check after the press; counted
fixture requests carry a fresh query. Every old parameter and exit code keeps its meaning.
**Why:** S5.1's legs (verifier re-run: old exits 4 at 13.2 s and new exits 0 at 16.2 s on the 12 s delayed redirect;
stuck → 4 at 90.019 s; another host → 4 at 90.021 s; submits = 1 in every leg); fixer round 1 found an 8 000-button
page overran the bound (23.1 s at `-WaitSec 20`) and fixed it (20.017 s).
**Instead of:** a stable-address check alone (the old 20 s rule); exiting at once on another host.
**Revisit if:** a real Blackboard scan takes more than 10 s (then the 95 s ceiling fails; unmeasured until a G10-3
grant).
**By:** Claude (S5 report `…step10…-steps/S5.md`)

### 2026-10-25 · S2: the MCP schema baseline, a failed focus's answer, and the focus sentence (#214)
**Decided:** (1) the tool-schema baseline (`mcp/test/s2-focus-first.test.ts`) is captured through a real `tools/list`
over the MCP SDK's in-memory transport (names + `inputSchema`, keys sorted, tool descriptions excluded) at `f45e3bf`;
it changes only by a dated, recorded re-baseline — the first is S4's `saveTo` parameter, ordered by #127; (2) when the
`focusTab` before a trusted action fails, the answer is what `browser_focus_tab` gives for that error (one line for
`DISARMED`/`DOMAIN_BLOCKED`, a failure report for an attach-set code), and the action is not sent; (3) the three
descriptions end "With trusted=true the tab is first brought to the front of its window (as browser_focus_tab does)
and is left there.", and `browser_focus_tab` no longer claims to be "the only tool that changes what the human sees".
**Why:** byte-for-byte what Claude Code receives; one rendering path; the old claim became false with #106.
**Instead of:** comparing zod objects; a "Focus before the trusted click failed:" prefix; leaving the false claim.
**Revisit if:** an MCP SDK upgrade changes emitted schemas with no tool change (a user-ruled re-baseline); MCPF-1 or
the user finds a focus failure's report misleading (it reads like the click's own failure, S2 verifier MINOR 2).
**By:** Claude (S2 report `…step10…-steps/S2.md`)

### 2026-10-25 · S1: Run 14's wave mechanics are kept for Run 15 (#213)
**Decided:** S7's wave reuses `recipes/s9-r14.ps1`'s model: one STOP path that restores and refuses later blocks;
a resume only through a narrow, named `-Attempt/-Skip` form that cannot re-run an observed row; window placements
cut at the taskbar; a fixed cursor park before occlusion guards; every brief fill-in committed before the runner
starts; the found-state guard as Run 13's. S7's prep also fixes the raw-output scan (count `scheme://host`, not a bare
`://`, which the helper's own lines carry) and makes a teardown scan failure print STOP, as §4.21 says; Run 14's
R14-TEARDOWN stays FAIL. **Why:** Run 14's three returns were all tooling and each was caught before a wrong
observation (S1 live verifier F1/F2, N3). **Instead of:** a free-form runner resume; re-judging R14-TEARDOWN.
**Revisit if:** S7's rows need a state the guard refuses, or a scan counts a real non-fixture URL.
**By:** Claude (S1 report `…step10…-steps/S1.md`)

### 2026-10-25 · S1: R14-3 (the options page's view of a re-arm) is re-measured in Run 15 (#212)
**Decided:** R14-3 is NOT MEASURED in Run 14 (a Chrome window that was not the driver's covered the options page ~2 s
after the disarm, so the guard stopped the row); Run 15 re-measures it as a new row with occluder diagnostics (rect,
owner, styles, cursor) and the fixed cursor park. **Why:** its first observation was made in attempt 3, so re-running
it inside Run 14 would re-run an observed row. **Instead of:** a re-run in attempt 4. **Revisit if:** the occluder
recurs in Run 15 — identify it before anyone exempts it from the guard (that exemption is the user's call).
**By:** Claude (S1 report)

### 2026-10-25 · S1: R14-POP-1's missing `leaseGranted` gets a diagnostic row in Run 15 (#211)
**Decided:** Run 14's R14-POP-1 FAIL stands (the opener was claimed before the click, a popup opened, no
`leaseGranted` arrived). Run 15 adds R15-POP-2: it prints the popup's `openerTabId` class (the held opener, another
tab, none) with the opener (a) in front and (b) in the background of its window, then judges `leaseGranted`.
**Why:** the daemon's opener rule and the SDK's event delivery read sound; the passing LEASE-3 / R9-LEASE-3 had the
opener in front and Run 14's was a background tab, so the conjecture that Chrome then names another opener is
unshown. **Instead of:** re-running R14-POP-1 or changing the opener rule now. **Revisit if:** R15-POP-2 shows the
held opener named and still no grant — a product defect, then a fix stage.
**By:** Claude (S1 report)

### 2026-10-25 · S1: Run 14's results stand as recorded (#210)
**Decided:** Run 14 (S1, `f717682`, verifier PASS-with-notes) stands: R14-4b PASS (disarm ended a running trusted
`type` 5 ms after the press, 571/1000 typed; a trusted call after re-arm succeeded; banner gone between +4.7 s and
+5.0 s, a record); R14-5c PASS (first live run of the post-redirect `downloadStart` check — `DOMAIN_BLOCKED`, no file,
hop and target each requested once, #140's limit); R14-REL-3 PASS (`view-source / http / own=no`); R14-POP-1 FAIL;
R14-3 NOT MEASURED; R14-TEARDOWN FAIL on a scanner bug. Four attempts, three stops, each a return (#193); the safety
state read back equal by hash. **Why:** the fresh live verifier matched every STOP line to a ledger return and every
observed text to the pre-written text. **Instead of:** re-running failed rows in the wave. **Revisit if:** Run 15
contradicts a Run 14 row. **By:** Claude

### 2026-10-25 · Stage 0: count corrections, stricter checks, SW-1 as a differential row, the retirement set, bb-login's bound (#209)
**Decided:** the Stage 0 rulings that are mechanical or stricter only, applied to the phase doc as dated amendments
(texts in `docs/plans/2026-10-24-step10-step8-follow-ups-steps/stage0.md` §6): (1) F8 — the Step 9 log scan has 54
sites (15 + 33 + 0 + 6), not 60; S4.5 counts from 54; (2) the stricter checks F6 (S4.3 vs S4b: which code holds at
S4's close), F13 with V6 (S4.1's answer bound `≤ min(300, path.length + 120)`, a random value, the SDK return and
log lines checked too), F14, F15 (the MCP schema baseline captured before S2's first change), F16 (RET-1 runs only
while armed), F17, F20; (3) F3 with V1/V2 — **0.8's premise was wrong**: `onActivated` already ends the 1000 ms wait
as written and that listener predates the ~1.5 s measurements, so SW-1 becomes a differential row (background-tab
capture minus front-tab capture, three trials; d ≥ 950 ms 3/3 → S7b names the mechanism, and a top-level listener
escalates; d ≤ 300 ms 3/3 → closed, no change; else undetermined, no change); (4) F9 with V4 — the retirement is
`assemble-mcp.ts`, `transcript.ts`, `export-file.ts`'s `assemble()` and **7** tests (not 6), `--mcp-plan` kept with
help text naming `saveTo`; (5) F10 with V5 — bb-login's 90 s bound runs from the press to the exit, any page tolerated
while polling, exit 4 at the bound, S5.1 extended with three legs and submits = 1; (6) F19 recorded as a known limit
(focus and input are two calls; another actor's capture can come between).
**Why:** mechanical corrections or checks made stricter before any measurement; each finding carries its command and
output in `stage0-audit.md` §6, and the verifier re-executed F3, F9, F10.
**Instead of:** the phase doc's original wording, two checks that could not fail (S1.5, S3.3) and one that depended on
the test path (S4.1).
**Revisit if:** a real login needs more than 90 s; a live row sees F19's race.
**By:** Claude (Stage 0 report `…-steps/stage0.md` §5–§6)

### 2026-10-25 · Stage 0: `release/step8` from `70aa754` to `a1932a8`, Variant C (#208)
**Decided:** base `70aa754`, close `a1932a8`; Parts 1–5 carry their commits' code per Step 8's S7.md §4 map with
`docs/`, `CLAUDE.md`, `README.md` held at the base; Part 6 brings the close tree; only the final tree is pinned
(equal to `a1932a8`'s). **Why:** per-Part cumulative trees conflict 14 times (all docs) and Part 1 alone does not
typecheck, so 0.6's "if they apply cleanly" branch fails; Variant C keeps six meaningful code commits. **Instead of:**
0.6's fallback, one squashed tree carrying all six messages (the conservative reading; S6 builds that instead if the
user prefers); `59be263` as the close (it carries Step 9's kickoff). **Revisit if:** the user wants every
intermediate tree buildable or prefers the single tree. **By:** Claude (proposed by Stage 0 F7; open for the user —
a third layout beyond 0.6's two; local and undoable)

### 2026-10-25 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s (#207)
**Decided:** `BAD_PARAMS` for a relative path, an existing directory, a missing parent directory (nothing created),
an existing file without `overwrite: true`, and an existing `<path>.part` (opened `"wx"`); bytes are UTF-8 by
`TextEncoder` (a lone surrogate becomes U+FFFD; tests hash the page side the same way); a Node, Map, Set, function,
symbol or `undefined` value is `BAD_PARAMS` before anything is stored; a throw from `JSON.stringify` is `PAGE_ERROR`.
**Why:** `browser_download`'s directory mode, its `mkdir -p` and its `.part` clobbering each write somewhere other
than the given path, which the kickoff forbids for `saveTo` (Stage 0 F11, F12). **Instead of:** copying
`sdk/src/download.ts`'s rules as 0.4 proposed. **Revisit if:** a user needs parent directories created.
**By:** Claude (contract-level, open for the user)

### 2026-10-25 · Stage 0: the cap warning reaches SDK actions as a client event (#206)
**Decided:** `LocateResult` gains `pastSnapshotCap?: true` (so `Tab.locate()` returns it); an action resolved from a
locator past the cap carries the flag on its reply, and the SDK emits `client.on("warning", (w: {tab, method, kind:
"pastSnapshotCap"}) => …)`, never with the locator or the element's text; no action's return type changes; the MCP
adds one warning line. **Why:** every SDK action returns `Promise<void>` (`sdk/src/tab.ts`, `client.ts`), so a field
on an action's result would change a Step 8 signature (Stage 0 F5); an event is additive and undoable. **Instead
of:** a field on an action's result. **Revisit if:** a later step gives actions result objects. **By:** Claude
(contract-level, open for the user)

### 2026-10-25 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls (#205)
**Decided:** 0.4's transport is (B): an extension-side store, filled in slices on the CDP leg so no single message
grows with the value, pulled in 1 MiB slices of UTF-8 bytes by new methods that carry the tab (tab methods in
`daemon/src/methods.ts`, lease-checked, no lock; class `evaluate` in `METHOD_CLASSES`); the store is dropped at disarm,
when JavaScript is turned off, when the tab closes and after a TTL; the extension never receives the path; a pull
after the store is lost (a worker restart) is refused cleanly and `.part` is removed. **Why:** 0.4's own rule — (A)
needs a measurement of ≥ 64 MiB crossing the whole path, and the Chrome leg cannot be measured without Chrome; the
host leg was measured on port 0: one frame crosses daemon → client whole up to 99 MiB, but above 100 MiB (`ws`'s
default `maxPayload`) the extension socket closes with 1009 and every actor's in-flight call fails `NOT_CONNECTED`
(Stage 0 F1, F2, `stage0-transport.txt`, re-run by the verifier); a pull without a tab skips the block list at the
gate and the daemon refuses untargeted unlisted methods anyway (F4, probed). **Instead of:** (A) one `evaluate`
carrying the whole value; tab-less pulls. **Revisit if:** a live measurement shows the Chrome leg carrying ≥ 64 MiB
and (A) is wanted for simplicity. **By:** Claude (contract-level — a new wire method and what the gate covers; open
for the user)

### 2026-10-24 · The Step 10 phase doc's proposals, recorded before Stage 0 so the audit can attack them (#204)
**Decided:** the session agent adopts, as proposals for Stage 0 to attack, every **(proposed)** decision of
`docs/plans/2026-10-24-step10-step8-follow-ups.md` and every proposed detail under its (user) headings, as written
there on 2026-10-24: 0.1 (no re-run — #192 was ratified by #202 — so Run 14 is 0.10's wave alone, on the Step 9
build, before any Step 10 code; Run 15 after the code stages; #193's stop rule for both); 0.2's details (MCP
`focusTab {tab}` then the action on the same handle for `trusted: true` only; a `focusTab` failure is the answer;
schemas unchanged; the cursor never moves on a focus); 0.3's details (definition by the 800th listable element in
walk order; an optional `pastSnapshotCap?: true` on `LocateResult` and on an action's reply; the SDK form chosen at
Stage 0 so no Step 8 signature changes; one MCP warning line); 0.4's details (transport (A) one `evaluate` if Stage
0 or S4 measures a ≥ 64 MiB string crossing whole, else (B) an extension store + 1 MiB chunked pull with each new
method in `METHOD_CLASSES` as class `evaluate` and in `daemon/src/methods.ts`, the store dropped at disarm;
`browser_download`'s file rules; an answer of path, bytes, kind and sha256 only; `Tab.evaluateToFile` and no ninth
export; nothing logs the value or the path); 0.5's fixture leg, the pp1 leg at G10-3 only, and retirement only
after the fixture leg passes; 0.6's local `release/step8` branch with the final tree equal to Step 8's close and the
six Part messages, tag and push at G10-1; 0.7's row RET-1 at G10-2 only; 0.8 (measure SW-1 with a pre-written
outcome table, a fix stage S7b only if the wait runs to its bound); 0.9's details (poll ≤ 90 s, exit 4 otherwise,
proven on a 12 s delayed-redirect fixture old vs new); 0.10's five R14 rows in a new §4.21; 0.11 (no change to the
safety boundary); 0.12's detail (`DISARMED` keeps `data.scope: "all"`; `"evaluate"` is no longer produced; the
changed expected texts listed per file as ordered by #202).
**Why:** the kickoff (§4) asks that the proposals be on record before the audit, so a wrong premise is a finding
against a recorded decision and gets a dated note rather than a silent change.
**Instead of:** letting Stage 0 audit an unrecorded plan.
**Revisit if:** Stage 0 finds a wrong premise (then this entry gets a dated note, and the contract-level parts —
0.3's wire field and SDK form, 0.4's transport and SDK method, 0.12's scope — stay under Open decisions for the user).
**By:** Claude
*Amended 2026-10-25: Stage 0 found two wrong premises — 0.8's (`onActivated` already ends the wait; SW-1 is now a
differential row, #209) and 0.4's file rules copied from `browser_download` (they write beside the given path; stricter
rules, #207); 0.4's transport is (B) by its own rule (#205), the SDK form of 0.3 is a client event (#206), and 0.6's
layout is Variant C (#208).*

### 2026-10-24 · Step 10 agents run Opus 5.5 (#203)
**Decided:** every agent at every level of Step 10 runs Claude Opus 5.5 (`claude-opus-5-5`); only the headless E2E
actor sessions (`claude -p`) of S1 and S7 may run Sonnet.
**Why:** the user's standing choice, decisions.md · 2026-10-23 · The user rules on R9-SCREEN-2 and the last five
Step 7 open decisions (#69): "I like higher quality product"; the Step 10 kickoff repeats it.
**Instead of:** a cheaper model for builders or verifiers.
**By:** user

### 2026-10-24 · The Step 10 kickoff carries Run 13's live follow-ups as its first wave (#201)
**Decided:** the Step 10 kickoff lists #194's four re-measurements (SAFE-5c's redirect half with a threaded
redirect server, SAFE-POP-1 with the opener claimed first, SAFE-3 with the options window visible, SAFE-4 (b)
polling the banner ≥ 10 s) and #196's SAFE-REL-3 URL-class print as a required first live wave, run under
#193's stop rule (a runner returns on every stop). It comes after the user's ruling on #192.
**Why:** no Step 10 phase doc exists yet to carry them (propagator, "Needs a decision" 2); one wave is cheaper
than a separate pre-Step-10 wave and keeps the post-redirect download check from staying unmeasured.
**Instead of:** a separate short wave before Step 10.
**Revisit if:** the user asks for a re-run of Run 13's affected rows under #192; then that wave comes first and
can carry these rows.
**By:** Claude

