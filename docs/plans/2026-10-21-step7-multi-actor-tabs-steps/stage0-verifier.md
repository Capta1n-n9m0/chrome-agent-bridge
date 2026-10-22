# Step 7 — Stage 0 verifier

**Date:** 2026-10-22 · **Role:** independent verifier of Stage 0 (the spec audit), Claude Opus 5.5
(`claude-opus-5-5`) · **HEAD:** `0773a98` (`docs: close Step 6 on the user's W1 rulings; pin HTML
fixtures to LF`) · **Audited:** `stage0-audit.md` (this directory) and the uncommitted *Corrected
2026-10-22 (Stage 0)* notes in `docs/plans/2026-10-21-step7-multi-actor-tabs.md`, both treated as
claims.

Every node/npm command ran in Git Bash after
`export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`, from the repo root.
`$S` is the session scratchpad
(`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad`).
My own probe is `$S/verifier-probe.mts` (output `$S/verifier-probe.out.txt`); nothing of mine is in
the repo except this file. I did not run `npm run build`. Glossary: **Cn** = the audit's Step 6
contract runs, **Fn** = its findings, **Vn** = mine, **#n** = a `docs/decisions.md` entry,
**T0…T6** = the phase doc's stages, **4002** = the daemon's "upgrading" close code (clients
reconnect), **handover** = a client asking a daemon of another build to shut down so it can spawn its
own.

## 1. Five re-executions

### (a) Step 6 contracts C7, C8, C14 by execution — AGREE

My own script (not the auditor's). It imports the real `daemon/src` and `sdk/src`, binds only
`127.0.0.1` on port 0 (C14 reuses the port the OS handed host A), uses the fake token
`verifier-fake-token-not-real`, and passes it as `BRIDGE_TOKEN` inside an `env` object;
`spawnDaemon` and `hashDaemon` are overridden (record only / fixed `"B1"`), so no daemon process is
spawned and `daemon/dist` is not hashed.

```
env -u BRIDGE_TOKEN timeout 120 npx tsx $S/verifier-probe.mts > $S/verifier-probe.out.txt   # exit 0
```

Token lookup — `resolveToken` returns the env value before any file walk (`sdk/src/token.ts:53-54`),
shown by a start directory with no workspace root above it:
```
TOKEN resolveToken(env, startDir=C:/) -> env value (no file walk)
```

C7 — `extensionStatus` false only when the **current** extension socket closes:
```
C7 after 2 ext hellos: [true,true] e1 still open: true
C7 after REPLACED socket (e1) closed: [true,true]
C7 daemon.status.extensionConnected after e1 close: true
C7 after CURRENT socket (e2) closed: [true,true,false]
```
(Code: `daemon/src/wsHost.ts:221-229`, `if (this.bridge.currentConnection() === connection)`.) HOLDS.

C8 — `timeoutMs` clamped to [100, 600000] (+5000 slack) and never forwarded:
```
C8 daemonWaitMs(undefined, 1, 50, 100, 300, 600000, 1e9, -5): 35000, 5100, 5100, 5100, 5300, 605000, 605000, 5100
C8 extension received: {"id":"1","method":"listTabs","params":{"q":1}} has timeoutMs key: false
C8 timeoutMs:1 -> {"code":"TIMEOUT","message":"Timed out after 5100ms calling hangLow"} after 5104 ms
C8 timeoutMs:300 -> {"code":"TIMEOUT","message":"Timed out after 5300ms calling hangMid"} after 5308 ms
C8 hang frames at extension: [{"id":"2","method":"hangLow"},{"id":"3","method":"hangMid"}]
C8 non-number: {"code":"BAD_PARAMS","message":"request timeoutMs must be a finite number"}
```
HOLDS (the request carried `timeoutMs:4321`; the extension got `{id, method, params}` with the
daemon's own id).

C14 — no handover on a reconnect after 4002; build mismatch → `VERSION`. A same-build control (C13)
was run first so the check can fail:
```
C13-control(same build) killer close: {"code":4002,"reason":"upgrading"}
C13-control(same build) post-reconnect call ok: build B1 reconnected fired: true B1
C14(mismatch) killer close: {"code":4002,"reason":"upgrading"}
C14(mismatch) post-reconnect call -> VERSION: The bridge daemon on port 51628 was replaced by build B2, but this client expects build B1; after a daemon restart (4002) this client does not hand the daemon over. Every client on a machine must point at one daemon build …
C14(mismatch) hostB still listening, welcome build: B2 | spawnDaemon calls: 1
```
HOLDS: the B2 host was not shut down (a fresh client still got its welcome). The one recorded
`spawnDaemon` call per case is the reconnect knock hitting the port before host B listened; the
override spawned nothing.

I also re-ran the auditor's script (`env -u BRIDGE_TOKEN timeout 120 npx tsx $S/step6-contracts.mts
> $S/verifier-rerun-contracts.out.txt`, exit 0): `25/25 hold`, 25 `HOLDS` rows, 0 `FAILS`, 2 recorded
`spawnDaemon` calls — the same as its recorded output. Its C6 (`runDaemon`) injects a logger and
`resolveToken: () => TOKEN`, so it neither read `bridge.token` nor wrote `~/.chrome-agent-bridge/daemon.log`.

### (b) F8, the active-tab mismatch — AGREE (with V2, V5)

- `extension/src/handlers/tabs.ts:3-9`: `listTabs` = `chrome.tabs.query({})`, `active: t.active` on
  every tab → one `active:true` per window.
- `extension/src/tabs.ts:2-3`: `activeTab()` = `query({active:true, lastFocusedWindow:true})`, throws
  `No active tab in the last-focused window`.
- `mcp/src/tools/registry.ts:65-66`: `tabs.find((t) => t.active)` → the first window's active tab.
- Chrome docs (fetched 2026-10-22): `Tab.active` "Whether the tab is active in its window. Does not
  necessarily mean the window is focused." (https://developer.chrome.com/docs/extensions/reference/api/tabs);
  `windows.getLastFocused` "Gets the window that was most recently focused"; `windowTypes` "If unset,
  the default filter is set to `['normal', 'popup']`"; `WindowType` includes `devtools`
  (https://developer.chrome.com/docs/extensions/reference/api/windows).

So the two can disagree (two normal windows; or a DevTools window focused, W1 MUX-5). E2E text:
`docs/e2e-test-plan.md:193` STAT-1 `Active tab: [id] title — url (the playground)`; `:427` MUX-1
`Active tab: [<id>] <title> — <url>`; `:429` MUX-3 `active: [<id>] <title>` "the same `<id>` as
`browser_status`'s"; `:554` DL-1 `Active tab: [<id>] Agent Bridge E2E Playground — …` before and
after; CONN-1…7 (`:186-192`) contain no active-tab text. All are placeholders, so no expected text
changes when one resolver serves both. Agreed; the docs do not say what `getLastFocused` returns with a
DevTools window focused (V2), and the audit's argument omits the two-normal-windows case (V5).

### (c) F5, a Step 6 MCP against a Step 7 daemon — AGREE (with V3)

- `sdk/src/knock.ts:162`: `const expected = await io.hashDaemon(daemonPath);` — at every knock.
- `sdk/src/connect.ts:99-100`: the knock runs per `connect()` and per 4002 reconnect
  (`allowHandover: !reconnect`); `sdk/src/paths.ts:50`: `daemonPath` = `<root>/daemon/dist/index.js`
  on disk. A running Step 6 MCP therefore adopts (or hands over to) whatever daemon was last built; the
  protocol stays `proto: 2` (`knock.ts:214`), so nothing reports `VERSION`. C13-control above shows a
  same-hash 4002 reconnect succeeds.
- MCP call shapes that would break: `mcp/src/tools/registry.ts:171` `selectTab {id}`, `:181`
  `closeTab {id}`, and every tab tool without `tab`.

Option (C) judged against the INTEGRITY FLOOR: (A) resolves first, checks the resolved tab's lease
exactly as for an explicit `tab` (`TAB_HELD` on a held tab), grants nothing, forwards `tabId` (not the
forbidden "daemon omits `tabId`"), logs one line with no URL; it is removed with the 0.1 fallback in
Step 8. That lets no call through on a held tab, so it does not loosen a lease. It does not say that
the visibility lock still applies on this path (V3). (B) is a working rule, not a loosening.

### (d) F2, download methods vs "no `tab` and not free → `BAD_PARAMS`" — AGREE

- Method names: `extension/src/sw.ts:36-38` registers `downloadStart`, `downloadChunk`, `downloadEnd`
  (handlers `extension/src/handlers/download.ts:16, :55, :60`); the SDK calls them without a tab
  (`sdk/src/download.ts:61, :75, :91`); the MCP tool says "no tab is touched" (`registry.ts:242`).
- Plan: T2 checkbox (`…step7-multi-actor-tabs.md:286`) "Methods with no `tab` and not free →
  `BAD_PARAMS "tab is required"`"; 0.3's free list (`:149-151`) `listTabs`, `networkRequests`,
  `daemon.*`, `tabs.claim/release`; T2.4 (`:494`) the same list. Spec §6.3 (`design.md:170`): "Calls
  touching no tab — `listTabs`, `networkRequests` (any scope), `daemon.status` — are free."
- Read literally, the checkbox would answer every download with `BAD_PARAMS`. T2.4 says "a
  **tab-carrying** method", which a careful builder could read narrowly, but nothing defines
  "tab-carrying". The finding and its one-table resolution stand.

### (e) F4, `closeTab` / `selectTab` read `p.id` — AGREE

`extension/src/handlers/tabs.ts:13` `const id = Number(p.id);` (selectTab); `:28`
`chrome.tabs.remove(Number(p.id))` (closeTab); no `tabId` anywhere in the file. Consequences: (1) after
T2 the daemon sends `tabId` (spec §10, `design.md:344-345`), so both break unless T1/T3 read
`tabId`; (2) if 0.1's `targetTab` ("absent → `activeTab()`", plan `:111-113`) were applied to them,
`closeTab` without an id would close the active tab, where today `Number(undefined)` = `NaN` fails.
The resolution (no fallback for `closeTab`/`selectTab`/`focusTab`; `BAD_PARAMS` with neither field)
is right.

## 2. Evidence completeness of the audit's findings

| Finding | Evidence | Severity | Tag | Resolution | Owner (code-side) |
|---|---|---|---|---|---|
| F1–F26 | yes (file:line, probe or URL) | yes | yes | yes | yes (F19's evidence is plan text only; acceptable) |
| F27, F28 | decisions #33 / W1 cite | NIT | **none stated** ("Applied (A1…A4)" implies plan-side) | applied | — |
| F29 | `inject.ts:9, :58`, `debugger-errors.ts:19` | NIT | **none stated** (owner T1 only) | yes | T1 |
| F30 | **none** (no cite for the clause) | NIT | **none** | yes | **none** |
| F31 | via F8 | NIT | **none** | T6 | T6 |
| F32 | **none** | NIT | **none** | "accepted risk; T6" | T6 |
| F33 | Chrome quote (about `onActivated`, not `onCreated`) | NIT | **none** | yes | T1 |
| F34 | `daemon/main.ts`, `log.ts:14` (V4: the check is `:29`) | NIT | **none** | yes | — |
| F35 | `token.ts:49-76`, `wsHost.ts:185-193` | NIT | **none** | recorded | — |

Nine findings (F27–F35) carry no plan-side/code-side tag, and F30, F32 no evidence → V1.

Spot-checks beyond the five (all `sed -n`): `inject.ts:31-39` `unwrapResult` (null or undefined → throw)
✓; `inject.ts:9, :58` "the active tab" texts ✓; `debugger-errors.ts:15-24` the four Chrome-string
branches ✓ (`isExecutionTerminated` is in `debugger.ts:180`, as the audit's "→ TIMEOUT" implies);
`network-log.ts` `:240 formatAgo`, `:253 formatDuration`, `:257 formatSize`, `:263 scopeLabel`, `:287
formatEntries`, `:318 formatRow`, `:338 formatEntry` ✓ (all seven); `content/snapshot.ts:4 MAX_LINES =
800`, `:151` element line, `:154` closed-root comment, `:170-177` header + `text` ✓;
`extension/src/client.ts:28-30` drop when not OPEN ✓; `sw.ts:85` `tabs.onRemoved`, `:150-157`
keepalive ✓; `sdk/src/client.ts:28-32` `clientTimeoutMs` = bounded + 5000 + 1000 ✓;
`daemon/src/registry.ts:72-77` `onCountChange(count)` ✓; `mcp/src/config.ts:10-12` ✓;
`protocol.ts:61, :102, :204` ✓; `registry.ts:263-266` `tabTarget` union, `:281` reads `text` ✓;
`content/index.ts:36-48` the two `centerForInput` throws ✓; `e2e-test-plan.md:247-250` TAB-1…4 ✓;
`CLAUDE.md:50-51` sentence split ✓; Step 8 plan `:445` `formatSnapshot`, `formatNetwork` "(the Step 6
and Step 7 exports stay)" ✓; `daemon/src/log.ts:14` ✗ (V4). Chromium commit `00d39277` exists: "Reland
'Implement WebContents discard by clearing the primary frame document'", 2024-08-21, bug 347770670 ✓.
`InjectionResult` has no `error` field (scripting reference, fetched 2026-10-22) ✓ (F1).

## 3. Counts

| Count | Command | Output | Audit / plan |
|---|---|---|---|
| `activeTab()` in handlers | `grep -rn "activeTab()" extension/src/handlers \| wc -l` | `13` (actions 6,12,39,85; evaluate 29; history 4,10; navigate 6; network 10; perceive 6,12; wait 22,57) | 13 ✓ |
| in `actions.ts` | `grep -c "activeTab()" extension/src/handlers/actions.ts` | `4` | 4 ✓ |
| MCP tools | `grep -c "server.tool(" mcp/src/tools/registry.ts` | `21` | 21 now; 22 after T4 (plan) ✓ |
| tests | `npm test` | `Test Files 42 passed (42)` · `Tests 542 passed (542)`, exit 0 | 542 / 42 ✓ |
| typecheck | `npm run typecheck` | exit 0 (shared, daemon, sdk, mcp, extension) | ✓ |
| error codes | `sed -n 1,40p shared/src/codes.ts` vs spec §10 (`design.md:349-352`) | 9 daemon + 13 extension = 22, same names, same order | 22 ✓ |
| extension methods | `grep -n "router.on(" extension/src/sw.ts` | 22 (`:17-38`) | (used for F2) |
| Step 6 contracts | auditor's script, re-run | `25/25 hold` | 25/25 ✓ |

## 4. Phase-doc notes

`git diff -- docs/plans/2026-10-21-step7-multi-actor-tabs.md | grep -c '^-[^-]'` → `0`: additions
only (41 lines, 8 notes). Each starts `*Corrected 2026-10-22 (Stage 0): …*`. Mechanical: the A4
supersession, the A5 name/line correction, the A6 "verified/confirmed" notes and the #33 amendments
add no design choice; the G7-2 note's "if the user does not answer the reload request, the run stops at
G7-2" is the kickoff's own rule (`next-session-prompt.md:65, :520, :579`), not new. The two notes
kickoff §4 orders exist: G7-2 (`:560-565`) and T5's "Needs the user's keyboard" (`:429-433`, also the
T5 opening `:379-384` and Open items `:650-653`) amended by #33; the Prerequisite paragraph's "Step 6's
live E2E (the D6 wave) has not run yet" superseded by W1 (Run 7) and #34–#36 (`:22-29`), with each
decision cited by date + title matching `docs/decisions.md:45, :59, :74, :85, :114`. ✓

## 5. Audit structure

- Contract table covers every contract of kickoff §4 (a): welcome C1/C1b, `daemon.status` C2, error
  envelope + `INTERNAL` C3a–c, 4001 each reason C4 (all three reasons of `handshake.ts:21-28`), 4002 C5,
  1001 idle C6, `extensionStatus` C1b/C7, `timeoutMs` C8a–d, other `daemon.*` C9a, five exports C11,
  `requireExtension` + getters C12a/b, `on("reconnected")` C13, 2 s no-welcome C15, no 4002 handover
  C14 (+ C16, C17). ✓
- Every seed blind spot of §4 (c) has a row in "Lens (c)", including the conservative contract-level
  rule for a Step 6 MCP against a Step 7 daemon (F5 (C), proposed decision for user review). ✓
- Testability table: every check T0.1…T6.3 (32, the same set `grep -oE "^- T[0-9]\.[0-9]+"` lists),
  some grouped (T2.1–T2.4, T4.1–T4.5). ✓
- Stage split with estimates: "Proposed stage split" table. ✓ (Kickoff §4 says `journal.md`; that file
  is the session agent's, so the audit holding the proposal is right.)
- No token: the token value was grepped for in this directory and the phase doc without printing it —
  not present. No URL other than Chrome/Chromium docs; no title or URL of the user's tabs (the
  `chrome://newtab/` and playground strings are in the existing W1 record, not the audit). ✓

## 6. Findings (mine)

**V1 — MAJOR — nine findings lack a tag, two lack evidence (stage exit criterion 1 unmet).**
Location: `stage0-audit.md` F27–F35. Evidence: §2 table above — F27–F35 state no plan-side/code-side
tag; F30 and F32 cite nothing; F33's quote is about `onActivated`. Fix (mechanical, one fixer round):
add a tag to each (F27/F28/F31/F32 plan-side; F29/F30/F33 code-side owner T1; F34/F35 plan-side
"recorded"), a cite for F30 (`inject.ts:34-35`, the "or the tab may be a restricted URL" text) and F32
(plan 0.5's restore step, `…multi-actor-tabs.md` §0.5), and the `Tab.pendingUrl` doc line for F33.

**V2 — MINOR — F8's resolver is unmeasured exactly where it matters.** Location: F8 and the proposed
decision "The human's tab is the active tab of the last-focused normal window". Evidence: the
`windows` reference documents the default filter but not what `getLastFocused({windowTypes:["normal"]})`
returns while a DevTools window holds focus (fetched 2026-10-22); W1 MUX-5 measured only that
`tabs.query({lastFocusedWindow:true})` returns nothing then. Fix: mark the resolver "unconfirmed",
keep the clear error for the no-normal-window case, and pre-register a live check (G7-1 at T1, or a
T5 row): focus the service-worker DevTools window, then `browser_status` and `browser_snapshot` name
and act on the same tab.

**V3 — MINOR — F5 (A) does not say the visibility lock still applies on the legacy path.** Location:
F5 and its proposed decision. Evidence: (A)'s text names the lease check only; the legacy target is by
construction the active tab, which invites the forbidden fix "skipping the lock when the target is
already active" (`briefs/common.md`, Forbidden fixes). Fix: add "the method's lock class applies
unchanged (a legacy `screenshot` takes the lock)" and a T2 test for it.

**V4 — NIT — wrong line for the log's URL rule.** F34 cites `daemon/src/log.ts:14`; that line is the
`WITHHELD` constant, the `text.includes("://")` check is `:29` (`grep -n '://' daemon/src/log.ts`).

**V5 — NIT — F8's "no expected text changes" argument covers only the DevTools case.** With two
normal windows open, today's first-active-of-any-window and the new last-focused-normal resolver can
name different tabs (`tabs.ts:3-9` vs the resolver). The conclusion holds (STAT-1, MUX-1, MUX-3, DL-1
use `[<id>]` placeholders), but state the case: SCREEN-5 opens two windows.

**V6 — NIT — the audit ran `npm run build` in the main tree.** "Baseline" row: it rewrote
`daemon/dist/index.js`; harmless here (nothing on 9234, same build id `795fb769…` as W1), but the
LESSON is that verifiers build in a clean worktree, and F5 (B) depends on that discipline. Suggest
stating in the T1–T4 briefs that no agent builds in the main tree, Stage 0 included in hindsight.

**V7 — NIT — F2's table puts `closeTab` only under "tab-carrying, lease-checked".** Spec §10
(`design.md:347-348`) also lists it as *intercepted* (forward, then remove the handle), as does T2's
intercept checkbox (`:283`). Mark it both in the table.

## Verdict

**FAIL** — on V1 alone: stage exit criterion (1) ("every finding has evidence, a severity, a tag and a
resolution") is not met for F27–F35. Every other exit criterion holds: the Step 6 contracts were
executed on port 0 and recorded (25/25; my C7, C8, C14 agree); the counts are re-derived (13/4, 21,
542/42, 22); the five re-executions agree (F2 and F8 with notes); the stage split with estimates
exists; the phase-doc notes are additions only, dated, mechanical, and include both ordered notes. The
fix for V1 is mechanical; V2 and V3 should go into the same round.

## Clean-up

`git status --short` at the end: ` M docs/decisions.md` (the session agent's), ` M
docs/plans/2026-10-21-step7-multi-actor-tabs.md` (the auditor's notes), `??
docs/plans/2026-10-21-step7-multi-actor-tabs-steps/` (this file among the step files). No scratch file
in the repo. `netstat -ano | grep LISTEN | grep -E ":9234 |:46520 |:51628 "` → nothing; `tasklist /FI
"IMAGENAME eq node.exe"` → only the unrelated PID 22152.

## Re-check after fixer round 1 (2026-10-22)

Scope: only V1–V7, against `stage0-audit.md` as the fixer left it. I read files only and ran no
build or test. `grep -n "fixed after verifier" stage0-audit.md` → 12 markers (lines 74, 193, 253, 272,
335, 350, 532, 582, 720, 791, 816, 846). `git diff --stat` still shows the phase doc at 41 insertions
and decisions.md at 14, as before the fix, so the fixer touched only the audit (it is untracked, so
git cannot diff it).

| V | Status | Evidence (line read) |
|---|---|---|
| V1 | RESOLVED | `:532` "*Each NIT below carries a tag, evidence and a resolution …*". Each of F27–F35 now has an italic tag: F27/F28 "*Plan-side; mechanical.*", F29/F30/F33 "*Code-side, owner T1; design-local.*", F31 "*Plan-side (`CLAUDE.md` text); mechanical; owner T6.*", F32 "*Plan-side (0.5); design-local; owner T6 (docs).*", F34/F35 "*Plan-side; recorded (no change).*". F30 cites `inject.ts:34-35`, which matches the file (the "…may be stale … or the tab may be a restricted URL …" text). F32 cites plan `:174` `if prev switched: chrome.tabs.update(prev.id, {active:true})` and `:171-172`, both verified by `sed -n`. F33 quotes `onCreated`/`Tab.pendingUrl`/`Tab.url`; my re-fetch of the tabs reference (2026-10-22) confirms "Note that the tab's URL and tab group membership may not be set at the time this event is fired" and pendingUrl (Chrome 79+) "The URL the tab is navigating to, before it has committed." The fetch tool summarises the page, so I could not check word for word the longer clauses the fixer quotes (the permission sentence and "May be an empty string…"). |
| V2 | RESOLVED | F8 `:328-335` adds "**Unconfirmed:** … Pre-registered live check (at G7-1 if taken at T1, else a T5 row) … PASS = the snapshot succeeds on the fixture page that status's `Active tab:` line names … anything else is recorded as a FAIL of the resolver, never re-tuned". The testability section `:716-720` has the same check. The "human's tab" decision `:842-846` marks it **unconfirmed**. The pass rule is written before any measurement. |
| V3 | RESOLVED | F5 (A) `:250-254` "The method's lock class applies unchanged … a legacy `screenshot` takes the visibility lock … skipping it because the legacy target 'is already active' is a forbidden fix". The T2 test `:270-272` says it "waits in FIFO order (or gets `LOCK_TIMEOUT {holder}`) and is not forwarded before the holder releases". The decision `:814-816` says the same. |
| V4 | RESOLVED | F34 `:581` "`daemon/src/log.ts:29`, `if (text.includes("://")) return WITHHELD;`; the constant is `:14`". This matches `grep -n '://' daemon/src/log.ts` → `29:`. |
| V5 | RESOLVED | F8 `:347-350` "With two normal windows open (SCREEN-5, plan `:406`), today's first-active-of-any-window and the new last-focused-normal resolver can name different tabs; the conclusion still holds because every expected text uses an `[<id>]` placeholder". Plan `:406` is the SCREEN-5 checkbox (verified). |
| V6 | RESOLVED | Baseline `:70-74` "Building in the main tree went against the LESSON … from now until T4's commit, every stage, Stage 0's re-checks included, builds only in a clean worktree." |
| V7 | RESOLVED (V8 below) | F2 `:192-194` adds "*intercepted and lease-checked* — `closeTab` (check, forward, then remove the handle: spec §10 `design.md:347-348`, T2's intercept checkbox plan `:283`)". The method-classes decision `:790-791` says the same. |

New finding introduced by the fixes:

**V8 — NIT — `closeTab` now sits in two classes of a table meant to classify each method once.**
F2's *tab-carrying, lease-checked* list (`stage0-audit.md:189-190`, "… `networkClear closeTab focusTab
selectTab`") still contains `closeTab`, and the new *intercepted and lease-checked* class (`:192`) adds
it again. My V7 asked for "both", which was ambiguous. Suggested fix: remove `closeTab` from the first
list, so each method appears once, as the decision text (`:789-791`) already has it. This does not
block: both entries mean "lease-checked", and T2 writes the real table.

No other regression: the decision block headers are intact (`grep -n "^### 2026-10-22"` lists the
same 10 decisions, each with its own Decided/Why/Instead of/Revisit if/By).

### Re-check VERDICT

**PASS-with-notes.** V1–V7 are resolved; V1 was the only MAJOR. Stage exit criterion (1) is now met
(every finding has evidence, a severity, a tag and a resolution), and criteria (2)–(6) hold as
recorded above. The only note is V8 (a NIT).
