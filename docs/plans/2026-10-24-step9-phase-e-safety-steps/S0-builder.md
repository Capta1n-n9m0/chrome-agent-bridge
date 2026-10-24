# Step 9 S0 — builder report (types and codes)

Builder: Claude Opus 5.5, 2026-10-24. Baseline `2b2db78` (tree clean but the step agent's untracked
`S0.ledger.md`). No agents spawned. Nothing touched the daemon, port 9234 or Chrome.

## Commits made

| Hash | Message | Files |
|---|---|---|
| `3d3c4be` | docs(step9): S0 — phase doc takes Stage 0's amendments, #141, #145 | `docs/plans/2026-10-24-step9-phase-e-safety.md` only (+337, −0) |
| `aabc3b4` | docs(spec): §10 — DISARMED, DOMAIN_BLOCKED, the safety events (Step 9 S0) | `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` only (+39, −0) |

The code (task D) is **not committed**: it waits in the tree for the verifier — `M shared/src/codes.ts`,
`M shared/src/protocol.ts`, `M shared/test/codes.test.ts`, `?? shared/test/protocol-step9.test.ts`. The spec
commit precedes any code commit (S0.2's `git log` order holds as long as the code is committed after
`aabc3b4`). No `dist/` file is tracked or staged.

## (A) Baseline before any edit (at `2b2db78`)

- `npm run build` exit 0. Six bundles copied to
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad\S0-baseline-dist\`
  (named with `/` → `_`).
- `npm test`: **1714 passed, 85 files** (13:39:20, 20.9 s).

## (B) Phase doc — where each finding went

Every amendment text was pasted verbatim; a script (scratchpad `verbatim.mjs`) extracted each
`"*Amended 2026-10-24 (Stage 0 Fn): …*"` from `stage0-audit.md` and each §6 stricter wording, normalised
whitespace, and found all 21 regex-matched amendments and all 13 §6 rows in the phase doc ("verbatim").
F18's amendment (a line break inside "Stage 0\nF18" defeats the regex) was checked by `grep -c` → 1. `git diff
--numstat` → 337 added, 0 deleted: no original line removed. Where an amendment contradicts the original,
the original stays and a `*Superseded 2026-10-24: was X, because Y (Stage 0 Fn; decisions.md · … (#13x))*`
follows it. Each note cites its decisions.md entry by date + title (Dn = #(131+n)).

| Fn | Placed at (section / bullet) — or why not plan-side |
|---|---|
| F1 | 0.1, after the paragraph; superseded "passes one gate before its handler" (#137) |
| F2 | 0.3 first bullet, after the *Proposed* `listTabs` sentence (#134) |
| F3 | 0.4 fifth bullet (own pages); superseded "(proposed, not configurable)" (#138) |
| F4 | code-side S2 (S2a): `storage.local.setAccessLevel`; carried by #139 — no plan text |
| F5 | 0.3 second bullet; superseded "`waitFor` polls stop at their next tick" (#137) |
| F6 | code-side S2 (S2a): debugger session registry; carried by S2.2's stricter wording (#141) |
| F7 | 0.1, after F1; superseded the `safetyDecision(method, params, tabUrl, state)` signature (cited #137: no D of its own) |
| F8 | 0.4 second bullet (#140) |
| F9 | 0.4 third bullet (text once), with a pointer note on 0.3's third bullet; superseded "no entry whose URL host is blocked" (#137 item 6) |
| F10 | 0.2 second bullet; superseded the `onChanged` cache allowance (#139) |
| F11 | code-side S2 (S2a): capture verification; named in S2a's checkbox (no amendment text) |
| F12 | 0.6 first bullet; superseded "on hello and on every change" (#132) |
| F13 | code-side S3: hidden-row rendering; mentioned in 0.6's second-bullet note (#134) |
| F14 | 0.5 first bullet (#138) |
| F15 | no amendment text: carried by §6's stricter checks, placed under "Exit checks" (#141) |
| F16 | new paragraph under 0.4 (after its last bullet); S5 note points to it |
| F17 | no amendment text: carried by §6's S1.1 wording, placed under "Exit checks" (#141) — see Findings 1 |
| F18 | S2's lane; superseded the old file list (#145) |
| F19 | code-side S2 (S2a): router sender check; carried by #139 |
| F20 | 0.2 fourth bullet **and** S2's deliverable (after the S2 stage); both superseded the `commands.onCommand` listener (#142) |
| F21 | 0.3 first bullet (#136) |
| F22 | 0.4 first bullet (#135) |
| F23 | 0.6 first bullet (#135) |
| F24 | code-side S2 (S2a): in-flight download store release; carried by #137 item 4 |
| F25 | code-side S2/S3: attach while disarmed; S3 test — no plan text |
| F26 | code-side S3: `focusFirst` while disarmed test — no plan text |
| F27 | 0.5 first bullet **and** 0.6 second bullet; superseded "or a code of its own" and the single "stop and ask" line (#133) |
| F28 | 0.7, after the paragraph (cited #131, the proposal it amends; no D of its own) |
| F29 | code-side S2: asRef mark residue accepted — no plan text |
| F30 | 0.3 first bullet (#137 item 6) |
| F31 | NIT, counts hold — nothing to amend |
| F32 | NIT, code-side S0: done in `codes.test.ts` (count change with a documented reason); named in S0's note |
| F33 | NIT, `pressKey` cannot press Alt+Shift+K — no amendment |
| F34 | NIT, `chrome://` already refused; S4 row SAFE-7d — no amendment |
| F35 | NIT, pre-disarm entries stay — inside F9's text |
| F36 | NIT, code-side S2: storage key collision — no amendment |
| F37 | NIT, badge `OFF` wins — carried by #143; noted under 0.5 |
| F38 | NIT, `downloadStart` refuses non-http(s) — no amendment |
| F39 | NIT, worker restart safe once F10 holds — no amendment |
| F40 | 0.3 first bullet, right after F2's (#134) |
| F41 | 0.4 third bullet (#134) |
| F42 | code-side S2 (S2b): badge re-derived at worker start; named in S2b's checkbox (#144) |
| F43 | 0.2 first bullet (#144) |

**#141:** every listed check (S0.1, S0.2, S1.1, S1.2, S1.3, S2.1, S2.2, S2.3, S2.4, S3.2, S3.3, S4.3, S4.4) has
a sub-bullet "*Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9
(#141)): S… reads …*" with §6's wording verbatim; where the original is replaced (S0.1, S1.3, S2.2, S2.3, S2.4,
S3.2, S3.3, S4.3, S4.4) a superseded marker follows; where §6 says "add" (S0.2, S1.1, S1.2, S2.1) the note reads
"as written, and adds …". S2.4's row: its inner "*Fixer r1: was …*" history note was not repeated (nested
italics); the note says so and points to §6.

**#145:** S0 note (0.75 h, the phase-doc paste, the §6.5 note); S1 note (2.5 h ∥ S3); new subsections
"Stage S2a — Extension enforcement (3 h, after S1)" and "Stage S2b — Extension UI and the 0.7 log scan
(1.5 h, after S2a)" under S2, each with its share of S2's checkbox and its lane (S2a = F18's lane minus the
manifest and options page, `options.ts` excluded; S2b = manifest, `options.html`, `options.ts`, the badge
module and its `sw.ts` start-up/`action.onClicked` registration, the log-scan test, `extension/test/`); the
original S2 checkbox and lane are kept. Exit checks: S2.1, S2.2 → S2a; S2.3 → S2b; S2.4 → both closes (both
edit `sw.ts`); IDs unchanged. S3 2.5 h, S4 1.5 h prep + 2.5 h live, S5 1 h; "the name S2b is Step 9's own;
Step 8's S2b is unrelated" stated.

Also added (small, dated): S4 note pointing at stage0-audit.md §7's completed row list; S5 note on F16;
Open items note listing the rulings.

## (C) Spec notes (`aabc3b4`)

- §10, after the code block: a dated note adding `safetyState` (E→D) and `safetyStatus` (D→C) to the event
  lines; the block itself unchanged.
- §10, a new dated bullet at the end: the two codes (25 = 24 on the wire: 9 daemon + 15 extension, plus
  `NO_CURSOR`); `DISARMED`'s `data: {scope: "all" | "evaluate"}` (#133); `DOMAIN_BLOCKED` reveals no host or
  pattern in message or data; both outside the attach set; the two events, never on the hello; `daemon.status`
  `safety: {…} | null` (null until reported and after the extension socket closes) (#132); the `hidden`
  marker on `listTabs` rows (title/url dropped) and `tabRemoved` (no lastUrl/lastTitle), `tabCreated.url` `""`,
  the daemon's redaction while disarmed, `leaseGranted.url` `""` (#134); no method changes the state.
- §6.5: a dated note — the human also holds the kill switch, the JavaScript switch and the block list,
  changed only by the human, never by a client, the daemon or a page (#128; phase doc 0.1–0.2).

## (D) Code (uncommitted)

Files: `shared/src/codes.ts`, `shared/src/protocol.ts`, `shared/test/codes.test.ts`,
`shared/test/protocol-step9.test.ts` (new).

- `codes.ts`: `DISARMED`, `DOMAIN_BLOCKED` appended to `EXTENSION_ERROR_CODES` (each with a doc comment) and to
  `ErrorCodes`; header "Exactly these 25: 24 … plus `NO_CURSOR`", citing #133, #132 and spec §10's note.
- `protocol.ts`: `ExtensionEventName` += `"safetyState"`, `DaemonEventName` += `"safetyStatus"`;
  `TabRemovedParams.hidden?: HiddenReason` (doc: lastUrl/lastTitle absent then, #134);
  `TabCreatedParams` comment only (no field, url `""`); `TabGoneParams` unchanged; `isTabRemovedEvent` accepts
  an optional `hidden` that must be a `HiddenReason`. Step 9 block at the end: `SafetyState`,
  `SafetyStateParams`, `SafetyStatusParams`, `DaemonStatusSafety`, `SafetyScope`, `DisarmedData`,
  `HiddenReason`, `ExtensionListTabsRow`, `ListTabsRow`; guards `isSafetyState`, `isSafetyScope`,
  `isDisarmedData`, `isHiddenReason`, `isSafetyStateEvent`, `isSafetyStatusEvent`.
- The `listTabs` row as it is today: extension `handlers/tabs.ts` `ListedTab {id, title, url, active,
  windowId, openerTabId?, current?: true}` (title/url **required**, `""` when Chrome has none); the daemon
  (`intercept.ts` `listTabs`) adds `tab` and `owner?`; the SDK's `TabInfo` and the MCP's `ListedTab` read the
  same. Since today's title/url are required, `ExtensionListTabsRow` makes them **optional** and adds
  `hidden?: HiddenReason`; `ListTabsRow extends ExtensionListTabsRow {tab: string; owner?: string}`. Types
  only: the extension's, daemon's and MCP's local row types are untouched (outside the lane).
- Typecheck needed no edit outside the lane: no exhaustive switch over the event-name unions exists
  (`grep -rn "ExtensionEventName\|DaemonEventName"` → only `protocol.ts` and `protocol-step7.test.ts`, whose
  array-of-subset check still compiles).

### Failing-first evidence

Tests written before the source; `npx vitest run shared/test/codes.test.ts shared/test/protocol-step9.test.ts`
on the unchanged source, tail:

```
 FAIL  shared/test/protocol-step9.test.ts > isTabRemovedEvent with `hidden` (#134) > rejects a bad `hidden`
AssertionError: expected true to be false // Object.is equality
 ❯ shared/test/protocol-step9.test.ts:142:88
 Test Files  2 failed (2)
      Tests  62 failed | 8 passed (70)
```

(The 8 that passed are old-shape assertions — Step 7 `tabRemoved` shapes, `tabCreated` url `""`, `tabGone`
without fields, the unchanged `isErrorCode` test, … — which must pass before and after.)

### Results, before → after

| Check | Before (`2b2db78`) | After (tree) |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| `npm test` | 1714 passed, 85 files | **1783 passed, 86 files** |
| `npm run build` | exit 0 | exit 0 |

+69 tests, by file (per-file diff of the two vitest outputs):
- `shared/test/protocol-step9.test.ts` (new): +66
- `shared/test/codes.test.ts`: 3 → 4 (+1, the Step 9 codes test; the two existing count tests edited 23 → 25)
- `sdk/test/failure-report.test.ts`: 65 → 67 (+2) — not edited: it generates one test per `ErrorCodes` key,
  so `DISARMED` and `DOMAIN_BLOCKED` each got "attaches nothing, rethrown untouched", and both pass (an early
  confirmation of S3.1's direction).
No test removed; every other file's count is unchanged.

### Bundle diff (sha256 before → after)

| Bundle | Before | After |
|---|---|---|
| `daemon/dist/index.js` | `597d6c28…34da3f` | `f5d3d1ca…4cfa8d` |
| `mcp/dist/index.js` | `4b07b464…c63153` | `3c1b657b…fbe0e` |
| `extension/dist/sw.js` | `27493950…51eff` | `d850d789…ef9e8` |
| `extension/dist/options.js` | `9093499a…b50c52` | identical |
| `extension/dist/offscreen.js` | `93af3da9…f400` | identical |
| `extension/dist/content.js` | `bcb20e28…587a` | identical |

Full `diff` hunks: `mcp/dist/index.js` and `extension/dist/sw.js` differ by exactly the two
`EXTENSION_ERROR_CODES` entries and the two `ErrorCodes` entries (hunks `21436c…`/`21461a…` and `26c…`/`51a…`);
`daemon/dist/index.js` by those plus the guard it already imports:

```
257c269
<   return p !== null && isTabId(p.tabId) && optional(p, "lastUrl", isString) && optional(p, "lastTitle", isString);
---
>   return p !== null && isTabId(p.tabId) && optional(p, "lastUrl", isString) && optional(p, "lastTitle", isString) && optional(p, "hidden", isHiddenReason);
261a274,276
> }
> function isHiddenReason(value) {
>   return value === "disarmed" || value === "blocked";
```

One thing beyond "only the entries": esbuild keeps the two doc comments written **inside** the array literal,
so each of the three bundles also carries those 8 comment lines (no URL, token or pattern in them). Not
"fixed" (instruction: report, do not move code) — see Proposed decision 5.

`git status --short` after the build: only the four `shared/` paths and the untracked `S0.ledger.md`.

## Deviations

1. Phase doc additions beyond the named list, all dated notes: S4's pointer to stage0-audit.md §7's rows, S5's
   F16 note, the Open-items rulings note, and a 0.5 note on the `JS` badge (#143). Each is a cross-reference,
   not a new rule.
2. The S3.3 note assigns the `storage.local.set` half of §6's wording to S2a/S2b (it reads `extension/src`,
   which S3's lane lacks) — an interpretation; see Proposed decision 4.
3. An extra export `isSafetyScope` (used by `isDisarmedData`).

## Proposed decisions

### 2026-10-24 · The `listTabs` row type in `shared/` makes title and url optional (S0)
**Decided:** `ExtensionListTabsRow` (the extension's row) and `ListTabsRow` (plus the daemon's `tab`,
`owner?`) are exported from `protocol.ts`; `title?`/`url?` are optional and `hidden?: HiddenReason` marks a row
that withholds them; `current?: true` as the extension sends it.
**Why:** today's rows always have both (`""` when empty); #134 drops them on a hidden row, so a required field
would make the type lie. Two names, because the extension's row has no `tab`.
**Instead of:** one type with `tab?` optional; keeping title/url required and sending `""` on hidden rows
(contradicts #134's "drops `title` and `url`").
**Revisit if:** S2a or S3 finds a reader that needs the two-name split collapsed.
**By:** Claude (S0 builder; shape is #134's — the type only transcribes it)

### 2026-10-24 · `isSafetyState` requires a non-negative safe integer and a non-array object (S0)
**Decided:** `blockedCount` must pass `Number.isSafeInteger` and be ≥ 0 (NaN, Infinity, 1.5, -1 rejected);
the value must be a plain non-array object; unknown keys accepted.
**Why:** the brief's "non-negative integer"; arrays are never a state; extra keys follow the existing guards.
**Instead of:** `Number.isInteger` (accepts 2^60).
**Revisit if:** never expected.
**By:** Claude

### 2026-10-24 · S2.4 is checked at both S2a's and S2b's close (S0, #145)
**Decided:** S2.1, S2.2 → S2a; S2.3 → S2b; S2.4 → both, because both stages edit `sw.ts`.
**Why:** a top-level `await` could enter in either half.
**Instead of:** S2.4 at S2b only (misses an S2a regression until later) or S2a only (misses S2b's listener work).
**Revisit if:** the step agent prefers one owner.
**By:** Claude

### 2026-10-24 · S3.3's `storage.local.set` test belongs to the extension stages (S0, #141)
**Decided:** the static test over `storage.local.set` call sites is carried by S2a (toggle module) or S2b
(options page); S3 carries the `methods.ts`/tool-list diff.
**Why:** S3's lane has no `extension/`.
**Instead of:** widening S3's lane.
**Revisit if:** the step agent assigns it otherwise.
**By:** Claude (pre-registered-check placement — for the step agent to confirm)

### 2026-10-24 · Code comments inside the codes array are kept (S0)
**Decided:** the two doc comments stay inside `EXTENSION_ERROR_CODES`, so they appear in three bundles.
**Why:** they document the codes where they are listed; harmless text.
**Instead of:** moving them above the array so the bundle diff is exactly the four entries (a one-line
change; the verifier may ask for it).
**Revisit if:** the verifier reads "bounded diff" as entries only.
**By:** Claude

## Findings (for the step agent)

1. **Lane conflict in S1.1's stricter wording (F17):** "`Router.on` of an unclassified name throws (test)"
   needs `extension/src/router.ts`, which is S2a's lane, not S1's (`safety.ts`, `extension/test/`). Noted in
   the phase doc beside S1.1; the step agent must give S1 the grant or move that half to S2a (escalation:
   outside the lane).
2. `sdk/test/failure-report.test.ts` already exercises every `ErrorCodes` key against the attach set, so S3.1
   holds by construction today (2 new passing tests).

## Unfinished

Nothing in S0's tasks. The code is intentionally uncommitted, for the verifier.
