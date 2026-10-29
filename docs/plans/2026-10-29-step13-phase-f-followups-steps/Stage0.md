# Step 13 — Stage 0 (spec audit and the scratch-Chrome measurements): step report

**Date:** 2026-10-29 · **Step agent:** Opus 5.5, medium (the second Stage 0 step agent; the first ended on an API login
expiry before writing anything) · **Tree:** start commit `ff121a4`, no product code changed · **Children (all Opus,
medium):** auditor 1 (G1, counts, Run 20, process: `Stage0-auditor1.md`, `stage0-audit.md`), auditor 2 (key order,
console, chooser: `Stage0-auditor2.md`, `stage0-audit-2.md`), measurer 1 (G1 event order, the `webNavigation` reload:
`Stage0-measurer1.md`), measurer 2 (key order, CON-NOTEA, #369's DevTools conditions: `Stage0-measurer2.md`), verifier
(`Stage0-verifier.md`). Ledger: `Stage0.ledger.md`.
**Brief READ list:** the phase doc in full; decisions.md #375–#383; the Step 12 phase doc § As built and § Follow-ups;
Step 12's `Stage0.md` (method, §6 S6-G1 draft) and `S7-run-record.md` §4–§6; spec §10 and its dated notes;
decisions-archive/step11b.md #294, #297; `recipes/CLAUDE.md` and the package `CLAUDE.md` files.

## 1. Verdict

**DONE** (verifier: **PASS-with-notes**, §3). Z.1 is met: findings ranked with commands and excerpts; every Chrome fact of 0.2–0.4
and 0.8 measured in a scratch Chrome (branded 156.0.8078.48, own temporary profile per run, pipe only, probes loaded by CDP
`Extensions.loadUnpacked`; every process closed and checked gone) or cited; 0.6 decided (a); counts recomputed; #375–#383
each attacked (§5); Step 12's contracts green on port 0. No STOP rule fired. Four results change the plan:
1. **G1's fallback is wrong (CRITICAL, auditor 1 F-1, measured by measurer 1).** With the opener in the background,
   `tabs.onCreated.openerTabId` names the window's active tab (25 of 30; right only for a popup *window*, 5 of 5), so
   "`sourceTabId` when present, else `openerTabId`" and the late-event option both lease such a popup to whoever holds the
   active tab — the phase's own STOP line. Today's code already does this when a second client holds the active tab.
2. **G1 is one field, held ≤ 250 ms; no late event.** `tabs.onCreated` came first in 60 of 60 popups (30 foreground, 30
   background), `onCreatedNavigationTarget` followed within 0.0–0.6 ms (median 0.3), none was missing, and `sourceTabId`
   named the real opener 60 of 60 (popup of a popup included). A blocked popup sends neither event.
3. **CON-NOTEA is not cheap → S3a is not run.** Replayed object arguments do carry an `objectId` (no `preview`), and
   `Runtime.getProperties` runs no accessor or Proxy trap, but it runs an Error subclass's prototype `message` getter once
   per read whatever the options (criterion 1 fails), and a Proxy needs a second call on `[[Target]]` (criterion 2 fails).
4. **#369's two DevTools conditions do not refuse** in the scratch Chrome: undocked DevTools 4 of 4 `ok`, DevTools opened
   before the first attach 3 of 3 undocked and 3 of 3 docked `ok`, each with an independent control (below). The scratch
   Chrome needs `--enable-unsafe-extension-debugging`, so a flag effect is not excluded: Run 20's live rows decide.

## 2. Outputs

- **Counts at `ff121a4`** (auditor 1, `stage0-a1-counts.txt`, `stage0-a1-doc-check.txt`, `stage0-a1-npm-test.txt`):
  25 tools; 28 router methods (`router.on` 28, `METHOD_CLASSES` 28, daemon tables 28); 27 codes, 26 on the wire (daemon 9 +
  extension 17; `NO_CURSOR` SDK-only); log sites 54; `npm test` **5596 passed, 235 files**, exit 0; `doc-check` exit 0.
  All agree with the phase doc and root `CLAUDE.md`. Test count before → after: 5596 → 5596 (no code).
- **Step 12 contracts on port 0:** auditor 1 ran the 36 test files of the ten Step 12 product commits: **1062 passed,
  exit 0** (`stage0-a1-contracts.txt`); auditor 2 re-ran its half's 10 files: 178 passed (`stage0-a2-tests.txt`).
- **Run 20's section:** **§4.28 is free** (last is §4.27 at `docs/e2e-test-plan.md:1771`; §5 opens at `:1933`); the record
  goes after `### Run 19 (S7)` (`:3511`), before `## 6. Exit criteria` (`:3600`) (`stage0-a1-e2e-sections.txt`). Every R19
  row 0.8 names exists (`stage0-a1-r19-rows.txt`).
- **Audit bodies:** `stage0-audit.md` (auditor 1: counts, citations, F-1…F-18, 16 G1 blind spots B1–B16, exit-check table,
  sizes, S5 split) and `stage0-audit-2.md` (auditor 2: serialiser paths, round-trip table, console plug-in point, formatter
  edges, chooser path, sizes, 19 blind spots). Evidence `stage0-a1-*.txt`, `stage0-a2-*.txt`.
- **Measurements:** `stage0-m1-{passrules,setup,src,G1,reload}.txt`, `stage0-m2-{passrules,setup,src,K,C,D}.txt`; each
  pass-rule file written before its first run, later legs only under dated addenda written before them.

### Measured facts (Chrome 156.0.8078.48, scratch profile, 2026-10-29)

| Fact | Value | How obtained | Evidence |
|---|---|---|---|
| G1 order | `tabs.onCreated` before `onCreatedNavigationTarget` 60/60 (fg 30, bg 30) | both listeners in a probe worker, dispatch sequence | `stage0-m1-G1.txt` |
| G1 spread | fg 0.1–0.6 ms, bg 0.0–0.4 ms, median 0.3; max 0.6 | worker clock | same |
| G1 missing event | 0 of 60; a blocked popup (no gesture) sends neither, no tab (6/6) | 3 s wait per popup | same |
| `sourceTabId` | real opener 60/60; popup of a popup names its own opener 10/10 | against the opener's id | same |
| `openerTabId`, bg opener | **the active tab 25/30**; right only for `window.open` with window features 5/5 | `tabs.onCreated` + `tabs.get` | same |
| Kinds covered | `window.open` ± `noopener`, popup window, `target=_blank` ± `rel=noopener`, popup of a popup | 5 per kind per leg | same |
| Reload with `webNavigation` added | stays enabled, no `disabledReason`, permission live; `runtime.reload()` and the chrome://extensions button; with and without the flag; unchanged-manifest controls also enabled | `management.get`, `developerPrivate.getExtensionInfo` | `stage0-m1-reload.txt` |
| Warning list | unchanged: "Access the page debugger backend", "Read and change all your data on all websites" | `management.getPermissionWarningsByManifest` on the manifest at `ff121a4` ± `webNavigation`; the card | same |
| Not measured (reload) | a windowed prompt; an extension loaded by the user's "Load unpacked" picker | headless only | `Stage0-measurer1.md` §4 |
| Key order today | `returnByValue` on the envelope sorts keys at every level (integer-like first, then code-unit order), 6/6 fixtures | worker `JSON.stringify` vs the page's | `stage0-m2-K.txt` |
| Key order, envelope as one JSON string | page order kept 6/6, `asRef`'s `__mark` included; (ii) 0.7–1.6 ms against (i) 0.8–2.3 ms | same | same |
| Ctrl+click, middle click (verifier, bg opener) | join 10/10; `openerTabId` the active tab, `sourceTabId` the opener | verifier's scratch Chrome | `stage0-v-readings.txt` V4 |
| `tabs.create({openerTabId})` by an extension | `tabs.onCreated` carries no `openerTabId` (5/5) | same | same |
| Round trip | `-0` → `0` in both (already lost today); lone surrogates U+FFFD today, **exact** as a string; large/tiny numbers exact in both; NaN, Infinity, bigint already strings | char codes, `Object.is` | same; `stage0-a2-serialiser-probe.txt` |
| Page `JSON` hook | a page `Object.prototype.toJSON` controls the whole stringified envelope ("HOOKED") | node probe of the shipped `SERIALIZER_SRC` | `stage0-a2-serialiser-probe.txt` |
| Replayed console arg | `objectId` yes, `preview` no, `description` the class only, 7/7 | attach + `Runtime.enable` | `stage0-m2-C.txt` |
| `getProperties` (`ownProperties`, `generatePreview`) | plain object, getter object (accessor not called), cross-realm object: contents, counters 0; Proxy: 0 own properties (needs `[[Target]]`); revoked Proxy: no error | page counters read by a MAIN-world `executeScript` of plain data | same |
| Error-valued property | **its prototype `message` getter runs +1 per read**, under every option tried; stack with the fixture URL in `description` and preview | same, V1–V5 | same |
| Large array (10,000) | 3.6 MB, 495 ms with preview; `nonIndexedPropertiesOnly` 335 chars | same | same |
| `objectId` lifetime | valid after `Runtime.disable` in the same session; not in a new one | same | same |
| D1 undocked DevTools, after an earlier attach | `ok` 4/4, no `onDetach` | `Target.openDevTools`; probe attach + `Runtime.evaluate` | `stage0-m2-D.txt` |
| D2 DevTools before the first attach | undocked `ok` 3/3 valid (1 VOID, also `ok`), docked `ok` 3/3 | same | same |
| D control | page target `attached` false→true and new `devtools_app` targets (11/11); undocked window titled `DevTools - <fixture host/path>`; **`chrome.debugger.getTargets()` reads `attached:true`** for a tab held only by DevTools | pipe, window list by PID, probe worker | same |
| Flagless DevTools control | NOT MEASURED: no probe loads without `--enable-unsafe-extension-debugging` | — | `Stage0-measurer2.md` §4 |

## 3. Verifier verdict

`Stage0-verifier.md`: **PASS-with-notes** (Opus, medium; 0 CRITICAL, 0 MAJOR, 5 MINOR, 3 NIT). Six findings re-executed
and holding: auditor 1 F-1 (code, and re-measured in its own scratch Chrome: background opener `openerTabId` = the active tab
10/10, `sourceTabId` the opener 10/10, C first, max spread 0.5 ms), auditor 2 F1 (a copy of the page-order test goes red once
the fake sorts), auditor 2 F2 ("HOOKED", and a forged envelope with an extra `ref`), the counts with a full `npm test` (5596 /
235), key order (i)/(ii) re-measured 5/5, the join numbers. The #376 replacement was attacked and holds (stricter than today
and than option (A) in every old/new mix; no test breaks; no path reads `listTabs`' `openerTabId`). Notes applied here as
text fixes by the step agent (no fix round needed for a PASS-with-notes): M2 (S1's lane and mutant, §5 split), M3 (the
contract note, #376), M4 (#376's Revisit-if narrowed), M5 (a worker restart in the hold, #376), N1 (the timing row), N2
(#382). M1 (measurer 1's rules said 4 samples per kind, the run used 5 with no addendum) and N3 (measurer 2's legs 12–16 on
the pre-addendum driver, disclosed) are recorded, not changed: the readings are unaffected (more samples, same rule).

## 4. Deviations

- Measurer 1 ran headless for every leg (allowed by its brief); measurer 2 opened DevTools by CDP `Target.openDevTools`, not
  by the UI. Both scratch Chromes ran with `--enable-unsafe-extension-debugging`, the only way to load a probe on branded 156;
  measurer 1 found a flagless control for the reload (a CDP-loaded probe persists into the profile once reloaded), measurer 2
  could not for DevTools.
- Measurer 1's run 3 was void (its Chrome ended when its own driver stopped, not by `Browser.close`); no `chrome.exe` was
  killed. Measurer 2's D2u r1 is VOID under its control as first written (undocked opens two targets).
- Two audit bodies (`stage0-audit.md`, `stage0-audit-2.md`) instead of one, as Step 12's Stage 0 did; not merged.

## 5. Proposed decisions

Each attacks one proposal (keep / amend / replace). The session agent numbers and records them.

### 2026-10-29 · #375 amended: stages run one at a time in the main tree; S3a dropped; S1 kept whole under the G1 shape below
**Decided:** S1 → S2 → S3b → S4 → S5 → S6, one at a time; a stage runs beside another only in its own worktree with its
own `npm ci`. S3a is not run (CON-NOTEA, below). **Why:** auditor 1 F-3: S1 and 0.7 both edit `daemon/src/intercept.ts`
under #376 as written, and two stages in one tree break "`git status` clean after the build", "`npm test` = before + n"
and the `&&`-chained typecheck. **Instead of:** S2/S3b/S4 beside S1. **Revisit if:** time matters more than tokens; then
worktrees. **By:** Claude (proposed)

### 2026-10-29 · #376 replaced: the extension joins the navigation target and puts the real opener in `tabCreated.openerTabId`; no new field, no late event, no grant without a join — for user review
**Decided:** the worker holds a `tabCreated` whose tab has an `openerTabId` until that tab's `onCreatedNavigationTarget`
arrives (joined by the new tab's id, accepting either order) or **250 ms** pass. Joined: it sends `openerTabId` =
`sourceTabId`. Not joined: it sends no `openerTabId`, so the daemon grants nothing. A tab without `openerTabId` is sent at
once. The daemon's opener rule, `shared/src/protocol.ts` and the hello do not change; spec §10 gets a dated note that
`tabCreated.openerTabId` is the navigation source when joined. The listener keeps tab ids only, never the event's `url`,
and logs nothing; a `tabRemoved` or `tabReplaced` of a held tab first flushes the held `tabCreated`. The note also says
that `listTabs` rows keep Chrome's own `openerTabId` (no daemon, SDK or MCP path reads it, verifier). A worker restart inside
the 250 ms hold loses that `tabCreated` itself, not only its grant (the tab is minted later by a `listTabs` resync); S1
tests the pure part and documents the rest as a limit.
**Why:** measured: the order is fixed (60/60), the spread is under 1 ms, and `sourceTabId` is right 60/60 while
`openerTabId` is wrong for a background opener 25/30, so any fallback to Chrome's `openerTabId` (the plan's, and the late
event's) re-creates F-1. 250 ms is the smallest of 250/500/1000 ≥ 4 × the largest spread (measurer 1's rule R4). Putting
the join in the extension needs no wire change and no hello feature: an old extension keeps today's rule, an old daemon
reading a new extension gets the right opener, and S1 stays one slice under its cap. Dropping the grant when no join comes
is the stricter side (a popup unleased is today's background behaviour; a popup leased to the wrong client is a STOP).
**Instead of:** (A) auditor 1's: a new optional `sourceTabId` field plus a hello feature, the daemon granting only from it
when the feature is present (a contract change in the protocol, hello and daemon; S1 split into S1a/S1b); (B) the plan's
fallback; (C) the late `tabOpener` event. **Revisit if:** Run 20 (windowed, a busy worker) sees a popup's `tabCreated` sent
unjoined, or any tab Chrome gives an `openerTabId` with no navigation target is found (none known: an extension's
`tabs.create({openerTabId})` carries none in `onCreated`, 5/5, and Ctrl+click and middle click join, 10/10, verifier V4).
**By:** Claude (proposed), **for user review**: no wire shape changes, but the meaning of an event field does, so it is a
contract change (verifier M3); it changes which tabs the opener rule grants (a background opener's popup, a Ctrl+click or
middle-click tab now go to the opener's holder instead of the active tab's; an unjoined tab with an opener no longer grants).

### 2026-10-29 · #377 amended: the envelope crosses as one JSON string from a wrapper, checked on receipt; the fake CDP sorts keys
**Decided:** keep the mechanism (measured: page order 6/6, lone surrogates now exact, `-0` already `0`). `SERIALIZER_SRC`
stays byte-identical; a new closure-free wrapper returns `JSON.stringify` of its envelope, parsed inside `serializerCall`'s
`callFn` so a parse failure reaches today's fallback. The parsed value is accepted only with the envelope's own keys and
types, else the fallback (a page's `toJSON` hook controls the whole string: "HOOKED"). The paths are `evaluate`, `args`,
`asRef` and the mark sweep; `evaluateSaveStart` is not a serialiser path (it already saves page-order JSON made in the
page). The fake CDP (`extension/test/s12-engine-cdp.ts:62`) must sort keys under `returnByValue` at every depth, which
turns `s12-args-cdp.test.ts:109` red on today's code: that is S2's failing test, and K2.1's mutant is red only with it.
**Why:** auditor 2 F1, F2, F5, F6; measurer 2 K. **Instead of:** the plan's wording; CDP `serializationOptions: deep`.
**Revisit if:** S2 shows a page hook that passes the shape check with a wrong value. **By:** Claude (proposed)

### 2026-10-29 · #378 resolved "no": CON-NOTEA stays a documented limit; S3a is not run
**Decided:** "If no" branch. The tool-description sentence ("an object logged before the read shows its class name only")
is product code (`mcp/src/tools/registry.ts`), so it goes to **S3b**; `docs/setup.md` to S6. **Why:** measurer 2 C5:
`getProperties` runs a page getter (an Error subclass's prototype `message`) on every read under every option; C3: a Proxy
needs a second call. Auditor 2 F4 also found 0.4's call rule self-contradictory, moot now. **Instead of:** S3a with a skip
list (it would still run the Error getter whenever an Error sits in an object). **Revisit if:** the user accepts page
getters of the kind the replay already runs (Step 12 C8). **By:** Claude (proposed; mechanical under #374 item 5)

### 2026-10-29 · #379 amended: two pinned tests outside the named files join S3b
**Decided:** keep the direction and the frames sentence. `mcp/test/s12-upload-chooser.test.ts:78-84` and
`recipes/test/s12-forms-b.test.ts:248-253` pin the old marker as the last line, so they join S3b's lane (the recipes test's
real-formatter leg becomes a literal of the old form; Run 19's helper is not edited). The marker is the first line and
counts the rows cut; when no row fits, its words do not call them "older". **Why:** auditor 2 F3: `npm test` includes
`recipes/test`, so S3b's commit is red otherwise (#379's own Revisit-if met). **Instead of:** editing `recipes/s12-forms-b.ts`.
**Revisit if:** S3b's verifier's grep finds another pin. **By:** Claude (proposed)

### 2026-10-29 · #380 decided (a): `DEBUGGER_DEVTOOLS` with the second chooser call's own fixed text
**Decided:** (a). `extension/src/handlers/upload.ts` (`chooserUpload`, `:165-167`) throws `DEBUGGER_DEVTOOLS` with a fixed
message, e.g. "Another file chooser upload is still running on this tab; retry after it ends."; every other path's text is
byte-identical (`debugger-errors.ts:48-53`, pinned by `recipes/test/s11-rules.test.ts:118`). S4's lane gains a dated spec
§10 note (spec line 971 states today's text). T4.1 adds the MCP check: bare message, `isError: true`. **Why:** the MCP
shows only the message under either option (`createToolError(error.message)`), so (b)'s new code reaches no agent without
new MCP work; (b) moves every count, the code union and a script's `catch`; an old extension sends the same code with the
old text, so no hello feature. Reason recorded per 0.6. **Instead of:** (b). **Revisit if:** the user wants the two cases
told apart by code. **By:** Claude (Stage 0 decides, per 0.6)

### 2026-10-29 · #381 amended: `.then(release, release)` kept, its reason corrected
**Decided:** keep it in S4. The test asserts the lock is free after a rejecting injected `sleep` and that no unhandled
rejection occurs. **Why:** auditor 1 F-5: a rejection today is an unhandled rejection the daemon treats as fatal (exit 1,
`daemon/src/main.ts:112-117`), not a lock held to disconnect; production injects no `sleep`. Under #376 as replaced, S1 no
longer edits `intercept.ts`, so S4 may follow S2/S3b directly. **Instead of:** the "held until disconnect" reason.
**Revisit if:** S4 passes its cap. **By:** Claude (proposed)

### 2026-10-29 · #382 amended: Run 20 at §4.28 with seven row changes before S5-sheet
**Decided:** §4.28, `R20-…` ids, old rows never edited. Changes: (1) **R20-DEVT-UNDOCK / -EARLY expect `ok`** with a control
independent of the bridge's answer, read before the call: the undocked window titled `DevTools - <fixture host/path>` in
Chrome's process, or the docked pane (Run 19's opener), plus `chrome.debugger.getTargets()` reading `attached:true` for the
tab — Run 19's DEVPROBE `attached` came only from the refusal code (`recipes/s12-forms-b.ts:12`), which explains its
`attached=no`; (2) R20-POP-OTHER adds a leg where a third client holds the window's active tab (F-1), and an unjoined-tab
leg if one can be made; R20-POP-FG times the grant against R15-POP-2 (a); (3) the CON-NOTEA row is the documented
class-name line (S3a not run) plus #373's blocked-frame leg; (4) R20-ARGS-ORDER names R19-ARGS-1 as related, with the SDK
leg as the discriminating one: the MCP prints `description`, already in page order (`registry.ts:872`), so the MCP leg and
R20-0's MCP read cannot tell builds apart; R20-0's proof is the SDK's `value` keys; (5) R20-0 also proves the permission
(a manifest read, as RD-0 did); (6) R20-G2-1 adds an uncovered-window control leg; (7) R20-CHOOSE-REFUSE-DIS first tries a
handler that clicks an enabled input then disables it, else is a RECORD. Run 19's chooser judges (`recipes/s12-r19-b.ts:50`,
`recipes/s12-r19-c.ts:87`) pin today's overlap text and are not reused for R20's chooser rows (verifier N2). **Why:** auditor 1 F-4, F-8…F-16; auditor 2 F7;
measurer 2 D. **Instead of:** the seed rows as written. **Revisit if:** the live control cannot be read on the user's
Chrome; then the DEVT rows are RECORD. **By:** Claude (proposed)

### 2026-10-29 · #383 kept, with Run 19's unmeasured leftovers named in Follow-ups
**Decided:** keep. Add to Follow-ups: KEEP-1's banner clause and the attach counter (#351 (2)); DEVT-NOFLAG, CHOOSE-FRAME and
CHOOSE-HUMAN stay RECORD. **Why:** auditor 1. **By:** Claude (proposed)

### 2026-10-29 · Adding `webNavigation` is not a G13-2 matter
**Decided:** S1's manifest change needs only the usual reload. **Why:** measured: the warning list and the card's
permission list are unchanged, and the extension stays enabled with no reason on both reload paths, flag and flagless.
**Revisit if:** after S1 the user's card shows a disabled state or a new permission line (the reload script sees the
first). **By:** Claude (proposed)

### Recommended stage split (agent-rules.md §7)

| Stage | Risk / models | Cap | Content |
|---|---|---|---|
| S1 G1 | standard; Opus builder, fixer, verifier | 350 | spec §10 note first; a pure join module (injected clock; blind spots B1–B3, B7–B10, B13–B15 and the flush on remove/replace) with failing tests; the top-level listener in `sw.ts`; manifest + `manifest.test.ts`; the two doc lines. The phase doc's S1 lane, G1.1 and verifier focus get a dated amendment: a new join file in `extension/src/`, `protocol.ts` and `intercept.ts` untouched, and a mutant that falls back to Chrome's `openerTabId` for an unjoined tab must be red (verifier M2). Under option (A) instead: S1a protocol + daemon (250), S1b extension (300) |
| S2 key order | standard; Opus | 300 (est. 140–190) | wrapper + shape check; the fake CDP's key sort first |
| S3a | — | — | not run |
| S3b console texts | standard; Opus | 200 (est. 80–110) | formatter direction and marker; frames sentence; the CON-NOTEA tool sentence; the two outside pins |
| S4 small fixes | standard; Opus | 150 (est. 45–75) | chooser text (a) + spec note; `.then(release, release)` |
| S5-sheet | low; Sonnet builder, Opus verifier | — | §4.28 with #382's amendments |
| S5-helpers | low; Sonnet | 600 | `recipes/s13-r20-lib`: R20-0's two proofs, LOGS/RESTORE, the MCP-line reader, window rectangles, the DevTools control |
| S5-drivers-A / -B / -C | low; Sonnet | 600 each | A: POP rows (three clients); B: ARGS-ORDER, the MCP legs, CON-CAP, CON-NOTEA, CON-FLOOR; C: CHOOSE rows, G2-1, DEVT rows and the conditional UP-DEVT/KEEP-4/SWEEP-HELD |
| S5-live | standard; Sonnet runners, ≤ 3 attempts per slice | — | liveA20 (R20-0, POP, ARGS, CON), liveB20 (CHOOSE, G2), liveC20 (DevTools rows alone) |
| S5-record | Opus verifier | — | `S5-run-record.md`, §5 Run 20 |
| S6 docs | low; Sonnet | — | as the phase doc, plus the CON-NOTEA limit and the #369 reword from Run 20 |

## 6. Findings

Ranked; full lists in `stage0-audit.md` §3 (F-1…F-18) and `stage0-audit-2.md` (F1…F12). Each with its command and output
in those files.
1. **CRITICAL, plan-side (and code-side today) — auditor 1 F-1:** the `openerTabId` fallback leases a background opener's
   popup to the active tab's holder. `intercept.ts:353-356` grants to the holder of `openerTabId`'s handle; measurer 1:
   `openerTabId` = the active tab 25/30 (`stage0-m1-G1.txt`, bg per kind). Resolved by #376 as replaced.
2. **MAJOR, plan-side — auditor 1 F-2:** a held `tabCreated` delays the grant; a `listTabs` mints the popup's handle
   (`intercept.ts:655`) and a claim can land inside the hold. Bounded now by the measured < 1 ms join; S1 tests B15.
3. **MAJOR, plan-side — auditor 1 F-3:** "disjoint files" false (S1 and S4 both in `intercept.ts`). #375 amended.
4. **MAJOR, plan-side — auditor 1 F-4:** Run 19's DevTools "control" is the bridge's own refusal
   (`recipes/s12-forms-b.ts:12`, `attachedFrom = code === K_DEVT`). Measurer 2 found independent signals. #382 (1).
5. **MAJOR, plan-side — auditor 1 F-5:** 0.7's rationale wrong (`main.ts:112-117`). #381 amended.
6. **MAJOR, plan-side — auditor 1 F-6, F-7:** S1 over cap and its draft tests miss B2–B16 under #376 as written; the
   replaced shape keeps S1 in one slice; the blind spots go into S1's failing tests.
7. **MAJOR, plan-side — auditor 2 F1:** the fake CDP does not sort under `returnByValue`
   (`s12-engine-cdp.ts:62`), so the existing "page order" test passes on today's code and K2.1's mutant cannot be red.
8. **MAJOR, plan/code-side — auditor 2 F2:** string crossing hands a page's `toJSON` hook the whole envelope (probe
   "HOOKED"); S2 checks the shape on receipt.
9. **MAJOR, plan-side — auditor 2 F3:** S3b would break two pinned tests outside its lane.
10. **MAJOR, plan-side — auditor 2 F4:** 0.4's call rule contradicts itself (moot: S3a not run).
11. MINOR/NIT: auditor 1 F-8…F-18 (incl. F-17: `registry.ts:294` still says "24 tools"); auditor 2 F5…F12 (incl. F11: the
    serialiser drops an own `__proto__` key, pre-existing).

**Runtime facts worth a package `CLAUDE.md` bullet** (measured, Chrome 156, scratch profile, 2026-10-29):
- `daemon/CLAUDE.md`: with the opener in the background, `tabs.onCreated.openerTabId` names the window's active tab (25/30;
  a popup *window* is the exception, 5/5); `onCreatedNavigationTarget.sourceTabId` names the opener 60/60 and follows
  `tabs.onCreated` within 0.6 ms (`stage0-m1-G1.txt`). Today's opener rule therefore grants such a popup to whoever holds the
  active tab (by reading, not live).
- `extension/src/CLAUDE.md`: `Runtime.getProperties` on a replayed console object runs no accessor or Proxy trap but runs an
  Error subclass's prototype `message` getter per read (`stage0-m2-C.txt`); `chrome.debugger.getTargets()` reads
  `attached:true` for a tab held only by DevTools, and undocked or first-opened DevTools did not refuse the attach (flagged
  scratch Chrome, `stage0-m2-D.txt`).
- `extension/src/evaluate/CLAUDE.md`: `returnByValue` sorts keys at every level and turns lone surrogates into U+FFFD; a
  JSON string crossing keeps both (`stage0-m2-K.txt`).
- `recipes/CLAUDE.md`: the scratch-Chrome bullet saying `chrome.runtime.reload()` leaves a CDP-loaded extension disabled did
  not hold (2 runs, enabled); a CDP-loaded probe persists into the profile once reloaded, giving a flagless control
  (`stage0-m1-reload.txt`).

## 7. Handoff

- **Nothing running.** Measurer 1's and measurer 2's PIDs (listed in `stage0-m1-setup.txt`, `stage0-m2-setup.txt`) were
  checked gone by each; no process has the scratch folder in its command line; ports 8080–8089 free; 9234, the user's
  Chrome and the loaded extension untouched.
- **For the session agent:** number and record §5; #376's replacement is **for user review** (until ruled, its stricter
  option — no grant without a join — is the conservative one; option (A) is the alternative with a hello feature); amend
  the phase doc with dated notes for 0.1, 0.2, 0.4 (S3a not run; the sentence to S3b), 0.5 (two pins), 0.6 (a), 0.7, 0.8.
- **For S1:** the join rule and 250 ms bound; `stage0-m1-G1.txt` for fixtures; blind spots `stage0-audit.md` §4.
- **For S2:** `stage0-m2-K.txt`, `stage0-a2-serialiser-probe.txt`, auditor 2 F1/F2.
- Nothing needs the user's keyboard except the #376 ruling.
