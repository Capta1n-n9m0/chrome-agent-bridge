# Step 8 Stage 0 — verifier report

**Date:** 2026-10-23 · **Role:** independent verifier, Opus 5.5 · **Audited:** `stage0-audit.md`,
`stage0-builder.md`, the uncommitted phase-doc diff (+391/−0 against `1a62620`) · **Worktree:**
`<SCRATCH>/V/wt` at `1a62620` (detached), `npm ci` exit 0, removed at the end. Chrome, port 9234, the
real daemon and the token were not touched. Every socket test bound 127.0.0.1 port 0. My scratch tests
(`daemon/test/zzV-verify.test.ts`, `extension/test/zzV-marker.test.ts`) lived only in the worktree.
One stray `python -` I started by mistake waited on stdin; I stopped it (my own task), nothing else
was killed.

**Verdict: FAIL** — one MAJOR finding (V1: the audit's proposed resolution of its own CRITICAL F2
leaves the MCP path open). Every other exit criterion is met; the five re-executions agree.

## 1. Re-derived counts (clean worktree of `1a62620`)

| Check | Command | Output | Audit claim |
|---|---|---|---|
| Tests | `npm test` | `Test Files 59 passed (59)` · `Tests 950 passed (950)` | 950/59 — agree |
| Typecheck | `npm run typecheck` | exit 0 | exit 0 — agree |
| Tools | `grep -c "server.tool(" mcp/src/tools/registry.ts` | `22` | 22 — agree |
| Codes | `grep -cE '^  [A-Z_]+: "[A-Z_]+",$' shared/src/codes.ts` | `22` (9 daemon + 13 extension in the two arrays) | 22 — agree |
| `NO_CURSOR` | `grep -c NO_CURSOR shared/src/codes.ts` | `0` (exit 1) | 0 — agree |

## 2. Five re-executions

All on port 0 with the real `WsHost` + `Bridge` (daemon code of `1a62620`) and the `FakeExt` fake
proto:2 extension copied from `daemon/test/tabs.test.ts`, unless stated. Run with
`npx vitest run daemon/test/zzV-verify.test.ts` (4 tests passed).

### (i) F2 — a stale handle after a daemon restart, end to end — **AGREE, and worse than the audit's evidence**

The audit's evidence ran the pure modules. I ran it through two real daemon instances: daemon #1
with tabs `[1 (human's, current), 2]`; client A opens a tab; daemon #1 closes; daemon #2 (a new
`WsHost`) gets an extension hello whose `listTabs` lists the same three tabs in another order; A
reconnects and calls `click {tab:"T3", ref:"e1"}` with its old handle.

```
VERIF F2 daemon#1 newTab {"id":101,"tab":"T3"} list [["T1",1],["T2",2],["T3",101]]
VERIF F2 daemon#2 list [["T1",101,null],["T2",2,null],["T3",1,null]]
VERIF F2 stale click answer {"ok":true,"method":"click"}
VERIF F2 ext2 received click [{"ref":"e1","tabId":1}]
```

The fake extension received the click on **tabId 1, the human's tab**, with no lease refusal. The
F2 premise finding holds.

**Contract or premise?** It is a **plan premise**, not a Step 7 contract violation. Step 7's binding
contract (as-built § Stage T2, "Contracts (binding forward)") says handles are monotonic and `mint`
idempotent *within the tab layer of one daemon*. It promises nothing across a restart. The wrong
premise is decisions.md · 2026-10-21 · #11 and the phase-doc 0.4 note ("an explicit stale handle
returns `TAB_UNKNOWN`"). CRITICAL is still right on safety grounds: an actor acts on the human's tab.

### (ii) F1 — Chromium source — **AGREE**

I fetched the files myself with `curl -sS` from raw.githubusercontent.com (`main`, 2026-10-23) and
grepped them:

- https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/emulation_handler.cc
  ```
  1051:Response EmulationHandler::SetFocusEmulationEnabled(bool enabled) {
  1052-  if (host_) {
  1053-    host_->render_view_host()->GetWidget()->SetFocusEmulationEnabled(enabled);
  ...
  1058-  if (enabled) {
  1059-    capture_handle_ = GetWebContents()->IncrementCapturerCount(
  1060-        gfx::Size(),
  1061-        /*stay_hidden=*/false,
  1062-        /*stay_awake=*/false, /*is_activity=*/true);
  1063-  } else {
  1064-    capture_handle_.RunAndReset();
  ```
  and `Disable()` (`:225-229`): `if (focus_emulation_enabled_) SetFocusEmulationEnabled(false);`.
- https://raw.githubusercontent.com/chromium/chromium/main/content/browser/web_contents/web_contents_impl.cc
  ```
  2805:base::ScopedClosureRunner WebContentsImpl::IncrementCapturerCount(
  2812-  if (stay_hidden) { ... ++hidden_capturer_count_;
  2817-  } else {
  2818-    ++visible_capturer_count_;
  5256:PageVisibilityState WebContentsImpl::CalculatePageVisibilityState(
  5271-  if (visibility == Visibility::VISIBLE || visible_capturer_count_ > 0 ||
  5272-      web_contents_visible_in_vr) {
  5273-    return PageVisibilityState::kVisible;
  ```
- https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/devtools_session.cc
  `177: void DevToolsSession::Dispose() {` · `180: pair.second->Disable();` — so emulation is cleared
  when the session detaches.

The cites and line numbers in F1 are exact. While emulation is on, the target's page reads `visible`.
FE-4's "the target stays `hidden`" would fail for a reason the human never sees. The audit is right
to say this is unconfirmed for Chrome 156. My sources were `main`, not the 156 branch.

### (iii) F8 — an unlisted method with no `tab` skips the lease check — **AGREE**

A claims the human's tab. B then calls `locate` with A's handle, `locate` with no `tab`, and
`snapshot` with no `tab` as a comparison:

```
VERIF F8 A claims human's tab {"tab":"T1"}
VERIF F8 B locate with tab {"code":"TAB_HELD","message":"tab T1 is held by \"A\" since 06:43:13 — …","data":{"owner":"A","since":1792737793982}}
VERIF F8 B locate no tab {"ok":true,"method":"locate"}
VERIF F8 B snapshot no tab (listed method, legacy path) {"code":"TAB_HELD",…,"data":{"owner":"A",…}}
VERIF F8 ext received locate [{"locator":{"css":"#x"}}]
```

An unlisted method with no `tab` is forwarded free, with no `tabId`. The extension's `targetTab`
fallback then acts on the human's tab, which A holds. A listed method on the same path is refused.
The audit is right to call this a gap beside #39, not a breach of a Step 7 contract: #39 only says
an unlisted method *with* a `tab` is lease-checked.

### (iv) F6 — the `{__bridgeError}` marker drops `data` — **AGREE**

`npx vitest run extension/test/zzV-marker.test.ts` runs the real `guard`/`codedError` from
`content/guard.ts` and the real `unwrapResult` from `extension/src/inject.ts`:

```
VERIF F6 marker {"__bridgeError":"LOCATOR_AMBIGUOUS:2 matches"} keys ["__bridgeError"]
VERIF F6 unwrapped {"code":"LOCATOR_AMBIGUOUS","message":"2 matches","data":null}
Tests 1 passed (1)
```

`data: {matches:[…]}` is lost: `toMarker` (`guard.ts:26-31`) builds only the string, and
`unwrapResult` (`inject.ts:64-67`) builds `new BridgeError(code, message)`. The audit's corrected
line cites (`guard.ts` has 46 lines, functions at `:17`, `:26`, `:38`) are right.

### (v) Step 7 contracts, re-executed — **PASS (agree with audit rows 2, 5, 6, 7)**

```
VERIF S7 TAB_HELD {"code":"TAB_HELD","message":"tab T3 is held by \"A\" since 06:43:14 — use browser_new_tab, or browser_list_tabs to pick a free tab","data":{"owner":"A","since":1792737794029}} dataKeys ["owner","since"]
VERIF S7 LOCK_TIMEOUT {"code":"LOCK_TIMEOUT","message":"timed out waiting for the visibility lock, held by \"A\"","data":{"holder":"A"}} afterMs 303 screenshotsForwarded 1
VERIF S7 requests 4 withTabKey 0 [["listTabs",null],["newTab",null],["newTab",null],["screenshot",101]]
VERIF S7b B answer {"code":"TIMEOUT","message":"Timed out after 5492ms calling screenshot"} tookMs 7012 forwardedScreenshots 2
```

- `TAB_HELD {owner, since}`: the data keys are exactly `owner` and `since`.
- `LOCK_TIMEOUT {holder}`: arrives at 303 ms for `timeoutMs:300`. The waiter's screenshot was never
  forwarded.
- The extension never receives `tab`: 0 of 4 requests carried the key, and the screenshot carried
  `tabId` 101.
- #44 (one deadline per call): A holds the lock for 1500 ms; B's `timeoutMs:2000` screenshot gets
  the lock and is forwarded, then times out at 7012 ms. That is 2000 + the daemon's 5000 ms slack, not
  a fresh deadline after the wait (about 8500 ms). The audit's row 6 rested on an existing repo test
  (`tabs.test.ts:851-875`); this independent run confirms it.

### F16 spot-check — **AGREE**

```
$ grep -n "selectTab" extension/src; echo "exit=$?"
grep: extension/src: Is a directory
exit=2
$ grep -rn "selectTab" extension/src; echo "exit=$?"
extension/src/handlers/tabs.ts:70:export const selectTab = focusTab;
extension/src/sw.ts:32:router.on("selectTab", focusTab);
exit=0
```

`grep -n "activeTab" extension/src` also prints `Is a directory` and exits 2. `grep -rn "targetTab({}"
extension/src` finds `extension/src/handlers/network.ts:12`, as F9 says.

## 3. The audit against the exit criteria

| Criterion | Result |
|---|---|
| Findings ranked CRITICAL/MAJOR/MINOR/NIT, tagged plan-/code-side, with evidence | met. 35 findings (2/14/15/4), each tagged, each with a command, a cite or a URL |
| Every code-side finding names a stage | met. F5 S2b, F6 S1, F8 S2/S2b, F10 S2b, F21 S2, F22 S2/S3/S5, F24 S2b/S3/S5, F27 S0, F31 S6, F33 S2, F34 S2; none missing |
| Every "Re-examine" contract of kickoff §4 has a pass/fail line from a real run | met. Rows 1–20 of audit §2 cover each contract in the lens. Row 6 (#44) was an existing repo test run green; I re-ran it independently (§2 (v)). None was only read |
| Every proposal #71–#77 has a verdict | met (audit §3, 7 rows) |
| Every ruling in kickoff §4 re-checked | met (audit §4, 6 rows: SDK-4 `{text}`, DL rows, actor pid, S7 Phase F wording, #11 cursor clear, `selectTab` alias) |
| Every exit check classified with "can it fail?" | met. I compared the phase doc's "Exit checks (pre-registered)" list (S0.1–S0.4, S1.1–S1.5, S2.1–S2.6, FE.1–FE.6, S2b.1–S2b.8, S3.1–S3.5, S4.1–S4.3, S5.1–S5.4, S6.1–S6.5, S7.1–S7.4: 50 IDs) with audit §6: all 50 present, none extra |
| Stage split with estimates | met (audit §7). It is written for the session agent to copy into `journal.md`, which `briefs/common.md` reserves to the session agent |

**Phase-doc diff (point 4 of the brief)**
- `git diff -U0 -- docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md | grep -c '^-[^-]'` →
  `0`: additions only.
- Every addition is a dated *Added/Corrected 2026-10-23 (Stage 0)* note or copied kickoff §7 text.
- I compared the copied text with kickoff §7 after collapsing whitespace. FE's checkboxes and outcome
  table are byte-identical to the kickoff (`cmp` → identical), and so are S2b's checkboxes. Once the
  "*Stricter …*" and "*Stage 0 flags …*" notes are removed, FE.1–FE.6 are identical to the kickoff. So
  are S2b.1–S2b.8; the only difference is the `closeTab`/ `focusTab` line break the builder disclosed.
  S0.4, S2.6 and S3.5 match too.
- No pre-registered clause was dropped or loosened. The stricter clauses only add conditions (FE.2,
  FE.3, S0.4, S2.6, S2b.2/.3/.4/.5, S3.2, S3.5).
- The escalated clauses (F1, F3, F11, F15, F18, F32) are flagged beside the clause, not applied.
- `git status --short`: only the phase doc is modified, plus the untracked Stage 0 files. `git diff
  --stat`: one file. decisions.md, CLAUDE.md, the spec, the Step 7 as-built, `kickoff.md` and
  `briefs/` are unchanged.

## 4. Findings

**V1 — MAJOR — F2's proposed resolution leaves the MCP and raw-`call()` clients exposed, and calls
the complete fix a wire change when it need not be one** · `stage0-audit.md` F2 (lines 74–89), §7
("If the user prefers F2's wire fix…"); the phase-doc note under 0.4 (diff hunk at old line 225)
- Evidence: the MCP takes `tab` as a free string from Claude and passes it through unchanged. Every
  tool has `tab: z.string().optional()` and calls, for example, `bridge.call("click", { ref, …, tab: t
  })` (`mcp/src/tools/registry.ts:182-185`, `:148-151`, …). A handle Claude remembers from an earlier
  `browser_list_tabs` never passes through an SDK `Tab` object, so F2's "S3 stamps each `Tab` with the
  connection generation" never sees it. For the MCP, F2 proposes only a notice ("handles from before
  are void"). My run (§2 (i)) shows the result: the stale `T3` click landed on **the human's tab**.
  Step 7 MCP bundles still running in the user's sessions (the kickoff's own blind-spot seed) and
  scripts that use `client.call` get no protection at all.
- Why MAJOR: F2 is CRITICAL. The audit names its fix as "S3 … (SDK-local, stricter)", and §7 budgets
  only that guard. A session agent that adopts the recommendation would mark F2 resolved while the
  main actor, Claude through the MCP, can still act on the human's tab. The "full fix" is offered only
  as a wire change for the user.
- Suggested fix (amend F2, the 0.4 note and §7):
  1. Name the MCP and raw-`call()` gap explicitly.
  2. Add a daemon-side option with **no wire change**: the `T<n>` format stays, but a new daemon never
     re-mints a number an earlier daemon used. Two ways: start `HandleTable.next` from a high-water
     mark persisted under `~/.chrome-agent-bridge/`, or from a start-time base, injectable so the
     tests keep `T1…`. A stale handle then resolves to `unknown` → `TAB_UNKNOWN`, which makes #11's
     premise true for every client, including Step 7 bundles. Home: S2b (daemon lane), +0.25–0.5 h.
  3. Alternatively, or as well, an MCP-local guard in S5: after a lost cursor, refuse an explicit
     handle the MCP has not returned since the reconnect.
  4. Keep the S3 `Tab` guard as defence in depth.

**V2 — MINOR — F5's severity sits below F2's for the same harm, and its race has no unit check** ·
`stage0-audit.md` F5
- Evidence: F5's hole ("the first hello after a Chrome start can carry the previous session's marker
  → 'same' → today's resync") leaves a held handle live on a reused tab id. B's `BLIND-a` shows that
  click forwarded to another page (`"clickForwarded":{"ref":"e1","tabId":2}`). That is the class of
  harm F2 ranks CRITICAL. S2b.5 (and its stricter fifth branch) tests the daemon's branches only. The
  extension-side ordering of `onStartup`/`onInstalled` against the top-level `void connect()`
  (`extension/src/sw.ts:184`, `:199`) is checked only by SM-1, which needs a user grant and may end
  "not run".
- Suggested fix: keep F5 MAJOR, but add a stricter S2b check: the marker choice is a pure, tested
  function over event orders (worker restart; extension reload; Chrome start with `onStartup` before
  and after `connect()`; neither event within the bound → fresh). Or state why MAJOR and not CRITICAL.

**V3 — MINOR — the merged audit cites a "Chrome facts table" it does not contain; lens (a)'s Chrome
questions are answered only in scratch** · `stage0-audit.md:24-25`
- Evidence: `grep -n -i "facts table\|hasFocus\|cleared on detach\|per debugger session" stage0-audit.md`
  → only line 25. Kickoff §4 (a) asks four things. Is `Emulation.setFocusEmulationEnabled` per
  session? Is it cleared on detach? Does it affect `hasFocus()`/`visibilityState`? Does a MAIN-world
  attribute reach the ISOLATED world? The answers are in auditor A's scratch file only
  (`<SCRATCH>/A/auditA.md` rows 62, 63, 66, §3.1, §3.3), which lives outside the repo. So is A's
  68-cite compliance table (57 OK, 4 stale, 7 wrong; only the corrections reached F30). I confirmed the
  detach answer myself (`devtools_session.cc:177-180`, §2 (ii)).
- Suggested fix: add the short facts table to the audit (question → answer → source URL/line →
  "unconfirmed for 156"), and either add A's cite table or state where it lives and that it is not kept.

**V4 — NIT — two stale cites in the audit and the phase-doc note** · F12, F22; phase-doc 0.6 note
- Evidence: `sed -n 338,346p mcp/src/tools/registry.ts`: `browser_wait_for`'s `text:` field is at
  `:342`, not `:341` (F12 and the 0.6 note say `:341`). `seconds … (max 60)` is at `:343`, not `:342`
  (F22). `:359` (the `waitFor` call with no `timeoutMs`) is right.
- Suggested fix: correct the three cites.

## 5. Unfounded-claim hunt (point 5 of the brief)

- **Evidence that matches its claim** (spot-checked against the files or the scratch outputs): F5
  (`sw.ts:154`, `:184`, `:199`; `client.ts:8-9`, `:50`; `offscreen.ts:10-15`); F7 (`hello.ts:81`,
  `t5.ts:552-553`, `t5-lib.ts:100`, `registry.ts:140`, `:284`, `:320-321`); F9 (`intercept.ts:419`,
  `network.ts:12`); F11 (`<SCRATCH>/B/s2b-daemon.txt` → `Tests 17 failed | 202 passed (219)`;
  `s2b-mcp-sdk.txt` → `310 passed (310)`); F13 (`e2e-playground.html:120-121`, `:251-253`, the
  `isTrusted` reporters at `157-170`); F4 (`actions.ts:67-71`, `:94-99`); F18 (`e2e-test-plan.md:677`
  SCREEN-4); F1 (BG-1/BG-2 at `:679-680` carry "target visibilityState hidden").
- **Severity:**
  - F1 as CRITICAL is defensible: a pre-registered rule would read the policy off a false premise. It
    is not a broken Step 7 contract, and the audit does not claim it is.
  - F2 as CRITICAL is correct (see §2 (i)); it is a plan premise, not a contract violation.
  - The audit's "no CRITICAL comes from a broken Step 7 contract" agrees with my runs.
  - F5 vs F2: see V2.
  - Nothing is inflated.
- **No finding contradicts another.** F7 records the A/C split on the Chrome `id` honestly as two
  options. F8 and F10 describe two sides of the same `classify` rule (`methods.ts:54-55`) with
  matching evidence.

## 6. Verdict

**FAIL** on V1 (MAJOR): the recommendation for CRITICAL F2 must cover the MCP and raw-`call()` path,
or say plainly that it does not and list the daemon-side option. It is a text fix to F2, the phase-doc
0.4 note and §7's split. V2 and V3 (MINOR) and V4 (NIT) can be fixed in the same pass. Counts,
contract runs, proposals, rulings, exit-check coverage and the phase-doc diff all pass.

## Re-check after fixer round 1

**Date:** 2026-10-23 · Read-only. Inputs: `stage0-fixer1.md`, the current `stage0-audit.md`, and
`git diff -- docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`. I compared that diff with
my first-round copy of it (`<SCRATCH>/V/phase.diff`). Nothing was run except reads, a diff and one
`curl` of Chromium source. No file was edited except this one.

| Item | Result | Evidence |
|---|---|---|
| V1 (MAJOR) | **resolved** | F2 (`stage0-audit.md:74-136`) now lists the three routes a handle takes (SDK `Tab`; Claude through the MCP, `registry.ts:182-185`; raw `call()`, Step 7 bundles and recipes). It cites my end-to-end run (`{"ref":"e1","tabId":1}`, the human's tab). It offers option (a) on the daemon side (`T<n>` unchanged, no wire change, home S2b), (b) client-side guards with their gaps stated, and (c) both. It recommends (a) plus the S3 `Tab` guard, and gives a conservative rule until the user rules. §7's S2b row is now 4 h with "+0.5 h" for (a); S5 gets +0.25 h only if (a) is rejected. The old "wire fix" line is gone (`grep -n "wire fix" stage0-audit.md` → nothing). The phase doc gains one dated note under 0.4: *Corrected 2026-10-23 (Stage 0, fixer round 1)*, which quotes what it corrects and points to V1. F2 is a contract-level item (Open decision) |
| V2 (MINOR) | **resolved** | F5 gains a "Proposed check": the marker choice becomes a pure function, unit-tested over five event orders, including "`onStartup` after `connect()` within the bound", which is the race. F5 also gains a "Why MAJOR and F2 CRITICAL" paragraph: F5's hole is known and targeted by #74, S2b.5 and SM-1, while F2's sits under a ruling no check examines. S2b gets +0.25 h in §7 |
| V3 (MINOR) | **resolved** | New §8 "Chrome facts table" (`stage0-audit.md:681-`) answers the four questions of kickoff §4 (a) plus the marker lifetimes, each with a URL and line and the live row that confirms it, marked unconfirmed for 156. The Outcome bullet (`:24-25`) now points to §8. I checked the rows not marked V: `focus_controller.h:124`/`:127` on Chromium `main` (fetched now) read `bool IsActive() const { return is_active_ \|\| is_emulating_focus_; }` and `bool IsFocused() const { return is_focused_ \|\| is_emulating_focus_; }`. `inspector_emulation_agent.cc:603-612` (auditor A's copy) calls `page->GetFocusController().SetFocusEmulationEnabled(enabled)`. Auditor A's cite table is now stated to live in scratch only |
| V4 (NIT) | **resolved** | `grep -n ":341\|:342\|:343" stage0-audit.md` → `:305` F12 now cites `:342` for `browser_wait_for`'s `text`, and `:415` F22 cites `:343` for "max 60". The phase doc's 0.6 note now says `(`:342`)` |

**Phase-doc diff:**
- `git diff -U0 -- <phase doc> | grep -c '^-[^-]'` → `0`, still no deleted line; `git diff --stat` → 403
  insertions, one file.
- Against my first-round copy of the diff, the only changes are:
  - the 12-line 0.4 note;
  - `:341` → `:342` inside the Stage 0 note under 0.6, a line Stage 0 itself added, so no
    pre-existing text changed.
- No pre-registered clause was touched, so none was loosened: the FE, S2b, S0.4, S2.6 and S3.5 text
  is outside the changed hunks.
- `git status --short`: the phase doc is modified, and the Stage 0 files are untracked (now with
  `stage0-fixer1.md`). Nothing else changed.

**New findings introduced by the fix**

**V5 — NIT — option (a) as worded writes a file on every mint** · F2 option (a). "Written before a
minted handle is returned" means a synchronous write to `~/.chrome-agent-bridge/` on every `newTab`,
resync and tab event.
- Suggested fix (for S2b's builder, design-local): reserve handle numbers in blocks. Persist
  `next + 100`, and rewrite only when the block runs out. A crash then skips numbers but never reuses
  one. The safety property is unchanged.

The fix introduced no unfounded claim:
- §8's sources check out.
- F2's statement that a `/mcp` reconnect after a daemon build starts both a new MCP and a new daemon
  matches the build-id handover in `CLAUDE.md`.
- The counts are unchanged (2/14/15/4), and the ranks did not move.

**Updated verdict: PASS-with-notes.** V1–V4 are resolved. The one new item, V5, is a NIT. F2's option
choice and the other contract-level items stay with the session agent and the user, as the audit
already says.
