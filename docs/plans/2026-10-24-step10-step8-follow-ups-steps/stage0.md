# Step 10 Stage 0 — spec audit: step report

Step agent: Claude Opus 5.5, 2026-10-24/25. Baseline `main` at `55ee4de` (the code equals `f45e3bf`'s). Form: auditor
(builder) → independent verifier; no fix round was needed. Test count before → after: **2720 / 116 files → 2720 / 116
files** (docs-only stage; nothing added to the suite).

## 1. Verdict

**DONE.** Z.1 met. No CRITICAL finding: every Step 9 contract ("Contracts (binding forward)") and Step 8's C1–C7 held
when executed on port 0 (auditor's probes, re-run by the verifier, plus the verifier's own independent probes).
Four lines need the user (contract-level, listed under Proposed decisions): 0.4's transport (B) with tab-carrying
pulls (F1, F2, F4), 0.3's SDK form (F5), `saveTo`'s stricter file rules (F11, F12), and 0.6's release-tree layout
(F7/V3). One doc count is wrong in `CLAUDE.md` and the Step 9 as-built (F8: 54 log sites, not 60) — session agent's
files.

## 2. Outputs

All in `docs/plans/2026-10-24-step10-step8-follow-ups-steps/` (sha256 prefixes at the step agent's close):

| File | What | sha256 (16) |
|---|---|---|
| `stage0-audit.md` | the audit: counts, contracts, 0.4 measurement, 0.6 commits, 0.8 reading, F1–F26, attacks on #204, blind spots, exit-check table, proposed decisions, stage split | `351de274f3ea9148` |
| `stage0-builder.md` | auditor's report | `1d0b79758bcbe81e` |
| `stage0-baseline.txt` | typecheck / test / build / `git status` / daemon build id | `f25e3458919b8ee1` |
| `stage0-transport.txt`, `stage0-probe-transport.test.ts.txt` | 0.4 host-leg measurement (command, output, source) | `8d55197ac5dbf881`, `df5d13a1bff89fa3` |
| `stage0-contracts.txt`, `stage0-probe-{contracts,gate,logcount}.test.ts.txt` | Step 9 + Step 8 contract runs | `63ca7599937b48e5`, `d515db62dd6c5c6b`, `f5c1f5145d2d21ca`, `207757e8e7a1b58f` |
| `stage0-release-trees.txt` | 0.6's three tree variants | `f9b557b193065ab0` |
| `stage0-verifier.md`, `stage0-verifier-runs.txt`, `stage0-verifier-probes.ts.txt` | independent verifier | `b9cbc7ae54e3f3e8`, `108027f8dfc4c8ff`, `514a97dd4ad8ee4d` |
| `stage0.ledger.md`, `stage0.md` | ledger, this report | — |

Measured numbers (both agents, scratch worktrees at `55ee4de`, port 0 only):
- Counts: 23 router methods (`grep -c 'router.on(' extension/src/sw.ts`), 23 `METHOD_CLASSES`, 25 codes (9 daemon + 15
  extension + 1 SDK-only; 24 on the wire), 23 MCP tools, `npm test` **2720 passed / 116 files**, typecheck 0, build 0,
  `git status --short` empty after the build, daemon build `99bb55c5913cdb6a…` (= Run 13's; Run 14 measures the same
  code). Log allowlist **54** (15 + 33 + 0 + 6), not 60.
- 0.4 host leg (real daemon + SDK, fake proto:2 extension): one result frame arrives whole up to 99 MiB (64 MiB in
  ~1.4 s, ~500 MiB RSS); above 100 MiB (`ws`'s default `maxPayload`, overridden nowhere) the daemon closes the
  extension socket with 1009 and every actor's in-flight call fails `NOT_CONNECTED`. Reproduced by the verifier on
  the same boundary. The Chrome leg (`chrome.debugger` → worker → `runtime.sendMessage` → offscreen → WebSocket) is
  not measurable without Chrome.
- 0.6: base `70aa754`, recommended close `a1932a8`; Variant C's final tree `== a1932a8^{tree}` (`4e57b16a…`); 0 paths
  under `dist/`, `bridge.token`, `.env`, `exports/`, `*.png` in the range or either tree; 60 commits, all carrying the
  Opus 5.5 trailer.
- 0.8: `extension/src/tabs.ts:249-271` — `onActivated` for the target **does** end the 1000 ms wait as written.

Hygiene at the close: worktrees removed (`git worktree list` = main only); no branch, tag or stash added; only
steps-dir files untracked; token count 0 in every evidence file; no non-loopback URL. Six unreferenced commits from
the Variant C trial remain in the object store until git gc (V9; no ref points at them).

## 3. Verifier verdict

**PASS-with-notes** — `stage0-verifier.md`. Re-executed: the 0.4 transport (same pass/fail boundary), all contract
probes (17 passed) plus its own probes (4: `GatedRouter.on` on prototype names, `UNKNOWN_METHOD` in five states with
a positive control, F4 at all three gate phases, the daemon's untargeted refusal and redaction), F3, F5, F6, F7, F9,
F10, F11, and a C5 mutation (4 existing tests red). Notes V1–V5 MINOR, V6–V9 NIT, all plan-side. The step agent
rules them below (§6) by correcting the amendment texts; no fixer was needed because nothing in the audit's
evidence was wrong — only four amendment texts were incomplete.

## 4. Deviations from the phase doc

- The stage split is proposed here (§7) rather than written into `journal.md`: the session agent owns the journal.
- 0.6: the recommended layout (Variant C) is a third option beyond 0.6's "per-Part trees if they apply cleanly, else
  one squashed tree" (V3). Listed for the user, not taken as a build decision.

## 5. Proposed decisions

### 2026-10-24 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls
**Decided:** 0.4's transport is (B): an extension-side store filled by slices on the CDP leg (no single message grows
with the value), pulled in 1 MiB slices of UTF-8 bytes by new methods that carry the tab (`daemon/src/methods.ts`
tab methods, lease-checked, no lock; `METHOD_CLASSES` `"evaluate"`), dropped at disarm, on JavaScript off, on the
tab's close and after a TTL; the extension never receives the path; a pull after the store is lost (worker restart)
gets a clean refusal and `.part` is removed. **Why:** 0.4's own rule — no measurement shows ≥ 64 MiB crossing the
whole path, and the Chrome leg cannot be measured without Chrome; the host leg drops the extension socket for every
actor above 100 MiB (F1, F2); a pull without a tab skips the block list at the gate (F4, probed) and the daemon
refuses untargeted unlisted methods anyway. **Instead of:** (A) one `evaluate` carrying the whole value; tab-less
pulls. **Revisit if:** a live measurement shows the Chrome leg carrying ≥ 64 MiB and (A) is wanted for simplicity.
**By:** Claude (proposed; contract-level — for user review; ESCALATION: what the gate covers and a new wire method).

### 2026-10-24 · Stage 0: the cap warning reaches SDK actions as a client event
**Decided:** `LocateResult.pastSnapshotCap?: true` (so `Tab.locate()` returns it); actions emit
`client.on("warning", (w: {tab, method, kind: "pastSnapshotCap"}) => …)`, never carrying the locator or the element's
text; no action's return type changes. **Why:** every SDK action returns `Promise<void>` (`sdk/src/tab.ts:206-243`,
`client.ts:409-425`); a result object would change a Step 8 signature (F5). **Instead of:** a field on an action's
result. **Revisit if:** a later step adds action results. **By:** Claude (proposed; contract-level — for user review).

### 2026-10-24 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s
**Decided:** F11 and F12's amendments: `BAD_PARAMS` for a relative path, an existing directory, a missing parent (nothing
created), an existing file without `overwrite: true`, an existing `<path>.part` (opened `"wx"`); bytes are
`TextEncoder` UTF-8 (lone surrogate → U+FFFD; tests hash the page side the same way); a Node, Map, Set, function,
symbol or `undefined` value is `BAD_PARAMS` before anything is stored; a throw from `JSON.stringify` is
`PAGE_ERROR`. **Why:** download's directory mode, `mkdir -p` and `.part` clobbering each write somewhere other than
the given path (ESCALATION item). **Instead of:** copying `sdk/src/download.ts`'s rules. **Revisit if:** a user needs
parent directories created. **By:** Claude (proposed; contract-level — for user review).

### 2026-10-24 · Stage 0: `release/step8` from `70aa754` to `a1932a8`, Variant C
**Decided:** base `70aa754`, close `a1932a8`; Parts 1–5 carry their commits' code (S7.md §4's map; recipe commits
`6398f27 bc78ded 036909f 7c16a00 75f0bd6` in Part 5, `201f5c8` in Part 4) with `docs/`, `CLAUDE.md`, `README.md` held
at the base; Part 6 brings the close tree; only the final tree is pinned (intermediate trees are not buildable: Part
1's `locate.ts` needs Part 2's `LocateResult`). **Why:** per-Part trees conflict 14 times (all docs) and Part 1 does
not typecheck, so 0.6's "if they apply cleanly" branch fails; Variant C keeps six meaningful code commits and a final
tree verified equal. **Instead of:** one squashed tree carrying all six messages (0.6's own fallback — the
conservative reading, recommended if the user prefers the doc's rule as written); `59be263` as the close (it carries
Step 9's kickoff). **Revisit if:** the user wants every intermediate tree buildable. **By:** Claude (proposed; the
phase doc lists it for the user, the kickoff calls it a build decision — listed for the user; S6 may proceed with
either, the branch is local and undoable).

### 2026-10-24 · Stage 0: SW-1 becomes a differential row (stricter, before any measurement)
**Decided:** the SW-1 text in §6 (F3 + V1 + V2). **Why:** the listener already ends the wait as written, so 0.8's
table could read "bound" from capture time alone. **Instead of:** 0.8's outcome table. **Revisit if:** — .
**By:** Claude (proposed; changes a pre-registered row before its run, stricter only).

### 2026-10-24 · Stage 0: the retirement set
**Decided:** retire `assemble-mcp.ts`, `transcript.ts`, the 6 tests that import `transcript.ts` (5 in
`recipes/test/blackboard-export-file.test.ts`, 1 in `blackboard-held.test.ts`), and `assemble()` in `export-file.ts`
with its 1 test (dead once `assemble-mcp.ts` goes) — **−7 tests**, listed per file; `--mcp-plan` stays with help text
naming `browser_evaluate {saveTo}`; S8's lane gains header/help-text edits in `export-file.ts`, `export-grades.ts`,
`held.ts` and the kept test file's header, and `recipes/README.md`. **Why:** 0.5 says "tests that cover only them";
S8.1's grep would otherwise fail on four header lines (V4). **Instead of:** retiring the MCP chunk plan too (−16).
**Revisit if:** the user wants the paging plan gone. **By:** Claude (proposed).

### 2026-10-24 · Stage 0: bb-login's 90 s bound covers everything after the press
**Decided:** the 0.9/S5.1 text in §6 (F10 + V5). **Why:** 3 s + 90 s + a 10 s scan exceeded S5.1's 95 s, and "another
host → exit 4" mid-poll would stop a real SSO chain. **Instead of:** 0.9's wording. **Revisit if:** a real login needs
more than 90 s. **By:** Claude (proposed).

### 2026-10-24 · Stage 0: count corrections and stricter checks
**Decided:** F8's dated notes (54 log sites; S4.5 counts from 54) and the stricter checks of F6, F13 (with V6), F14,
F15, F16, F17, F20. **Why:** mechanical, or stricter only. **Instead of:** checks that cannot fail (S1.5, S3.3) or
that depend on the test path (S4.1). **By:** Claude (proposed).

## 6. Findings

Full list with commands and output: `stage0-audit.md` §6 (F1–F26: MAJOR 7, MINOR 14, NIT 5) and `stage0-verifier.md`
(V1–V9). No pre-registered check failed. The step agent's rulings on the verifier's notes, as **final amendment texts
for the phase doc** (the session agent applies them; they replace the audit's versions where they differ):

- **F1, F2, F4, F5, F6, F11, F12, F14, F15, F16, F17, F18, F20** — apply the audit's amendment texts as written
  (`stage0-audit.md` §6), with F4 extended by V8: "…; a pull after the store is lost (a worker restart) is refused and
  `.part` removed (test)."
- **F3 (0.8, SW-1, S7b), corrected by V1 and V2:** "*Amended 2026-10-24 (Stage 0 F3): Stage 0 read `showTab`
  (`extension/src/tabs.ts:249-271`): `onActivated` for the target ends the wait as written. That listener has been in
  the code since T3 (`43c0a53`, 2026-10-22), before Runs 8, 9 and 12 measured ~1.3–1.5 s, so the measured time was
  taken with this code: either the event is missed (it is registered only per call — `sw.ts` has no top-level
  `tabs.onActivated` listener) or the capture itself is slow. SW-1 is a differential row: per trial, (i) a
  default-mode screenshot of a background fixture tab in the human's window and (ii) one of a fixture tab already in
  front of the same window, ≥ 1.5 s apart, three trials; d = client-measured duration of (i) − that of (ii). d ≥ 950 ms
  in 3/3 → the wait runs to its bound → S7b first names the mechanism (a top-level listener would touch the
  'listeners at the top level of `sw.ts`' invariant and escalates); d ≤ 300 ms in 3/3 → the event ends the wait,
  recorded, no change, the carried input closes; anything else → undetermined, recorded, no change. The
  `visibilitychange` stamps stay as a record.*"
- **F7 (0.6), corrected by V3:** the audit's text, prefixed "*Amended 2026-10-24 (Stage 0 F7; listed for the user —
  a third layout beyond this decision's two): …*".
- **F8:** dated notes in `CLAUDE.md` (Step 9 safety bullet, "60 at S2b") and the Step 9 as-built (`:124`) — session
  agent's files: "*Corrected 2026-10-24 (Step 10 Stage 0 F8): was '60 log sites', because the allowlist has 54
  entries (15 + 33 + 0 + 6) since S2b.*" Kickoff §4's "60" is frozen history (no edit).
- **F9 (0.5, S8, S8.1), corrected by V4:** "*Amended 2026-10-24 (Stage 0 F9): retired = `recipes/blackboard/
  assemble-mcp.ts`, `transcript.ts`, `export-file.ts`'s `assemble()`, and the 7 tests that cover only them (5 in
  `blackboard-export-file.test.ts` — `parseTranscriptChunks` — plus its `assemble` test, 1 in
  `blackboard-held.test.ts`), listed per file, test count −7 documented; `--mcp-plan` stays, its help text naming
  `browser_evaluate {saveTo}`. S8's lane gains the header/help-text edits in `export-file.ts`, `export-grades.ts`,
  `held.ts`, `recipes/test/blackboard-export-file.test.ts` and `recipes/README.md`, so that S8.1's grep finds only dated
  history notes.*"
- **F10 (0.9, S5.1), corrected by V5:** "*Amended 2026-10-24 (Stage 0 F10): the 90 s bound runs from the press to the
  exit, every scan included; while polling, any page is tolerated; exit 0 as soon as the Blackboard host shows no
  sign-in control with the address stable 4 s; at the bound, exit 4 whatever the page, nothing more pressed. S5.1 is
  extended, not replaced: (1) the old-vs-new pair on the delayed-redirect fixture stays (old exits 4, new exits 0);
  (2) stuck on the SSO stand-in → exit 4 at ≤ 95 s from the press; (3) a fixture that ends on a non-Blackboard host →
  exit 4 at the bound; in every leg the fixture counts submits = 1.*"
- **F13 (S4.1), corrected by V6:** "…S4.1's bound is `answer.length ≤ min(300, path.length + 120)` with a test path of
  ≤ 180 characters; the value is random (crypto); the SDK's return value and every captured log line are checked as
  well as the MCP answer.*"
- **F19 (0.2):** recorded as a known limit (focus and input are two calls; another actor's capture can intervene),
  Revisit if a live row sees it. **F21–F26, V7, V9:** no amendment needed (F22 confirms #194's premises; F23 is
  pre-existing and S3 must not use `truncated` as its oracle; F25: 0.4 should also name `maxString: 5000`).

New runtime gotcha worth a `CLAUDE.md` bullet (measured, port 0): **a single WebSocket frame over 100 MiB closes the
extension socket (1009)** — `ws`'s default `maxPayload` is set nowhere in the repo, so one oversized reply fails every
actor's in-flight call `NOT_CONNECTED` (`stage0-transport.txt`; verifier re-run).

## 7. Proposed stage split (for `journal.md`)

| Order | Stage | Estimate | Note |
|---|---|---|---|
| 1 | S1 — Run 14 (live, alone) | 1 h prep + 1 h live | unchanged; F22 confirms its premises |
| 2 | S2 — MCP focus-first | 1 h | F15's schema baseline captured before the first code change |
| 3 | S3 — the cap warning | 2 h | F5 form (after the user's ruling or the conservative default), F14 checks, F18 |
| 4 | S4 — `saveTo` (B) | 3.5 h (was 3 h) | CDP-leg slicing (F2), tab-carrying pulls (F4, V8), F11/F12 rules; lane + `extension/src/debugger.ts`, `daemon/src/methods.ts` |
| 5 | S4b — `JS_DISABLED` | 1.5 h | F6, F17 |
| ∥ | S5 — bb-login | 1 h | F10 as corrected |
| ∥ | S6 — `release/step8` | 0.5 h | F7 (Variant C or the single squashed tree, per the user) |
| 6 | S7 — Run 15 (live, alone) | 1.5 h prep + 2 h live | SW-1 per F3 as corrected; RET-1 armed only (F16) |
| 7 | S8 — retirement + docs | 1 h | F9 as corrected (−7 tests) |

No Chrome-leg measurement stage: (B) needs none.

## 8. Handoff

- Nothing running; no daemon started; port 9234 untouched; no Chrome touched. One pre-existing `node.exe` (PID 22152,
  2026-10-22, not ours) left alone.
- Before S1: the session agent applies §6's amendment texts to the phase doc, records §5 in `docs/decisions.md`
  (contract-level ones under Open decisions), adds F8's notes and the 1009 gotcha to `CLAUDE.md` / the Step 9 as-built
  as it sees fit, and writes §7 into `journal.md`.
- S3 and S4 depend on the user's ruling on F5 and on (B); the conservative choices above apply if unruled.
- Nothing needs the user's keyboard for Stage 0.
