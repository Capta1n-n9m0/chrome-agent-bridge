# Step 10 — propagator report (corrections and `CLAUDE.md`)

Propagator: Claude Opus 5.5, 2026-10-25, on `025bdef` (tree clean at start). No code changed; no agent spawned.
Inputs: the as-built register (all ten blocks), `journal.md`, decisions.md #203–#228, `S8-claude-md-proposals.md`,
and the stage reports they cite. Checks run: `npm test` → **3273 passed, 132 files** (vitest, 2026-10-25, on
`025bdef`); `grep -c 'router.on(' extension/src/sw.ts` → 26; `grep -c 'reg.tool(' mcp/src/tools/registry.ts` → 23;
`shared/src/codes.ts` → 9 daemon + 16 extension + 1 SDK = 26; `snapshot-pre-s1.json` → 45 entries; the file lists of
`recipes/`, `recipes/fixtures/`, `test-fixtures/`, `extension/src/`, `sdk/src/`, `mcp/test/` read with `ls`; each
symbol named in the new `CLAUDE.md` text found by `grep` in the code (`CAP_WARNING_LINE`, `capped`,
`EvaluateSaveStore` caps, `SAVE_*_SRC`, `saveEvaluateToFile`/`checkSaveTarget` on `sdk/src/download.ts`,
`BridgeWarning`, `JS_DISABLED_MESSAGE`/`DISARMED_EVALUATE_MESSAGE`, `EvaluateSaveKind`, the three `evaluateSave*`
names in `daemon/src/methods.ts`). Every measured number in the new gotchas was re-read in its report or run record
(S1.md, S7.md, S7-run-record.md, S4.md §6, S5.md, S4b.md, S8-builder.md, S7-wave-fixer2.md).

Glossary: "note" = a dated italic marker written in place (*Superseded/Corrected/Updated/Done 2026-10-25 …*);
Run 14 = S1's live wave (§4.21), Run 15 = S7's (§4.22).

## 1. Correction ledger

| doc | location | correction | reason / source |
|---|---|---|---|
| phase doc | 0.2, after the F19 note | *Corrected*: `browser_focus_tab`'s description changed too; the baseline is a real `tools/list`; MCPF-1 FAIL (harness), MCPF-1R PASS 9/9 | as-built § S2, § S7; #214, #226 |
| phase doc | 0.4, after the F2 note | *Superseded*: "never one CDP reply of the whole value" — a primitive completion crosses whole; SAVE-PRIM/IDONLY left #217 standing | #217, #226 item 2 |
| phase doc | 0.4 File rules, after F11/F12 | *Corrected*: "then renamed" only with `overwrite`; hard-link finish; store 5 min / 8 / 256 MiB; `INTERNAL Unknown or expired …`; the three method names; `[chrome.debugger] ` prefix | as-built § S4, § S7; #218, #227 |
| phase doc | 0.4 SDK | *Corrected*: still eight values; new types, client mirror, two helpers on `@bridge/sdk/download` | #216 item 5, #218 item 5; `sdk/src/index.ts`, `download.ts` |
| phase doc | 0.5, end | *Done*: fixture leg SAVE-FIX PASS (418 754 bytes), pp1 leg PASS (419 015 bytes) under #221/#222; retirement −7 | as-built § S7, § S8; #228 |
| phase doc | 0.7, end | *Corrected*: RET-1 NOT MEASURED (relaunch helper, `-ArgLine ''`); RET-1R PASS, 3 handles retired | as-built § S7; #223, #226 item 4 |
| phase doc | 0.8, end | *Corrected*: SW-1 NOT MEASURED; SW-1R undetermined (d = 101, 1276, 1421 ms); no S7b; waits unchanged | #226 item 1 |
| phase doc | 0.10, end | *Corrected*: Run 14's verdicts; R14-POP-1 explained by R15-POP-2; R14-3 → R15-3R PASS | #210, #211, #224, #226 item 3 |
| phase doc | Stages S1–S8 | one *Done* line each (commit, verdict, decisions, test count) | as-built per stage |
| phase doc | Open items, "Waiting for the user" | *Superseded*: G10-0 met (#202), G10-2/G10-3 granted (#221, #222); only G10-1 and the open decisions wait | #202, #221, #222 |
| design spec | Status header | *Corrected*: Step 9 closed; Step 10 built and E2E-run: 23 tools, 26 codes (25 on the wire), 26 router methods, 3273 / 132 at `025bdef`; gate open | as-built; `npm test` above |
| design spec | §8.1, after the Step 8 note | *Corrected*: `tab.evaluateToFile` (+ client mirror), the `warning` event, `locate()`'s flag; still eight values | as-built § S3, § S4; #205, #206, #218 |
| design spec | §8.3, after the Step 8 note | *Corrected*: `browser_focus_tab` no longer the only on-screen tool; trusted tools focus first; `saveTo`; warning line; still 23 tools | #106, #214, #127, #216 |
| design spec | §10, after the Step 10 S4b note | *Corrected*: the three `evaluateSave*` tab methods (shapes, class, refusal) and `pastSnapshotCap` on the wire | #216, #218 |
| design spec | §11, after the Step 8 note | *Corrected*: Step 10's new files and the two retired recipes | as-built § S4, § S7, § S8 |
| design spec | §12, after the Step 8 note | *Corrected*: row 1 (MCP focuses first, MCPF-1R) and row 3 (SW-1R undetermined, flash stays) | #106, #226 item 1 |
| design spec | §13, session-marker answer | *Updated*: the N ≥ 1 retire ran live (RET-1R, 3 handles) | #226 item 4 |
| `progress-and-roadmap.md` | §3, end | *Updated*: §3 stops at Step 5; Step 10 verified R14-5c and RET-1R live; still unverified: the ~1.5 s cause, F19's race | as-built § S1, § S7 |
| `progress-and-roadmap.md` | §4 "Background tabs" | *Superseded*: "the MCP's trusted tools need an explicit `browser_focus_tab`" | #106; MCPF-1R |
| `progress-and-roadmap.md` | §4 "Snapshot cap" | added: a locator past the cap now says so | #117, #216 |
| `progress-and-roadmap.md` | §5 "Next" paragraph | *Updated*: Step 9 closed; Step 10 built and E2E-run, gate open; next Steps 11, 12; #140's place set at the close | #202; as-built |
| `progress-and-roadmap.md` | §5 Phase E | *Superseded*: "Its gate waits for the user's ruling on Run 13 (#192)" → closed (#202) | #202 |
| `progress-and-roadmap.md` | §5 "Step 10 inputs from Step 9" | *Updated*: what Runs 14–15 measured for the four re-measurements; no product change | #210, #224, #226 |
| `e2e-test-plan.md` | header "Why manual" | *Corrected*: 3273 / 132 at `025bdef`; §4.21/§4.22 cover Step 10 | `npm test` above |
| `e2e-test-plan.md` | §5 Results template, after the block | *Note*: no template line for R14/R15 rows; their verdicts live in Run 14/15's tables (no row or run record edited) | §5 Run 14, Run 15 |
| `CLAUDE.md` | Architecture "Flow", Key files, Commands, gotchas, Docs paragraph, Testing | applied — see §2 | S8 proposals, checked |
| `docs/setup.md`, `README.md`, `recipes/README.md` | — | checked, no correction needed: S8 already describes Step 10 as built (focus-first, the warning, `saveTo`, `JS_DISABLED`, the retirement, `tsconfig.s10.json`, 3273 / 132) | S8 (`7e12566`) |

Not corrected (out of scope, listed): `docs/plans/next-session-prompt.md` and `…-steps/kickoff.md` still say "46"
fixtures — a kickoff is a prompt record, replaced by the next kickoff at close-out.

## 2. `CLAUDE.md` changes applied (on the session agent's authority)

Every proposal of `S8-claude-md-proposals.md` except its draft Current state block (item (b) 9), with old text kept as a
dated note where a fact changed:

- **Counts and map:** 26 codes (25 on the wire, `JS_DISABLED`); 26 router methods in `METHOD_CLASSES`
  (`JS_DISABLED_MESSAGE`, its alias); `npm test` 3273 / 132 at `025bdef`; the 45-fixture correction; the
  `tsconfig.s10.json` Commands line; `shared/src/protocol.ts`'s Step 10 types; `daemon/src/methods.ts`'s three tab
  methods; `sdk/src/` (`on("warning")`, `evaluateToFile`, `BridgeWarning`, `evaluate-save.ts`, `safetyRefusalLine`'s
  `JS_DISABLED`); `mcp/src/tools/registry.ts` (focus-first, `capped`/`CAP_WARNING_LINE`, `saveTo`, the schema
  baseline test, `withSafetyRefusals`'s `JS_DISABLED`); `extension/src/` (`evaluate-save-store.ts`, `evaluate/save.ts`,
  `handlers/evaluate-save.ts`, the `pastSnapshotCap` carriers); `recipes/` (the retired files removed, the S5
  fixtures, `s9-r14.ps1`, the `s10*` helpers, `test-fixtures/s10-*.html`); the Flow sentence (b8); the Docs paragraph
  (b10, Step 9 closed + a Step 10 sentence); the Testing list (Step 10's pure units — an addition of mine, from S4's
  tests).
- **A-edits 1–10** merged into their bullets (banner R14-4b; R14-5c; R14-REL-3; the MCP focus-first + the `focusTab`
  clause; PowerShell case-insensitivity and the empty argument; bb-login's wait + session-restore windows; SW-1R;
  the background-opener popup; RET-1R; the s6 tsconfig glob). Also, beyond the proposals, the Step 9 options-page
  bullet ("re-measured in Step 10, #194") now carries R15-3R's measurement (31 ms, not reloaded; #224), from
  S7-run-record.md.
- **B-bullets:** a new heading *Step 10 — the Step 8 follow-ups* with B1 (the primitive CDP leg, SAVE-PRIM,
  SAVE-IDONLY, SAVE-64), B2 (the store and the `link` finish, the `[chrome.debugger] ` prefix), B3 (scratch worktrees);
  B4 (headless actors and `ToolSearch`) and B5 (occlusion guards) in *Driving Chrome from the outside*; B6 merged into
  the locator bullet; B7 merged into the `javascript:` bullet.
- Wording checked against sources and adjusted: B1 says "a 64 MiB value … the extension's Chrome process" (the record
  samples the `--extension-process` `chrome.exe`), not "a `return` value … renderer"; B2's refusal quoted as
  `INTERNAL Unknown or expired evaluateSave id: <id>` (#218 item 2); B5 cites #213 for the cursor park.

## 3. What the session agent writes at close-out (not written here)

**Phase doc — Status line:** `Complete 2026-10-25 — Stage 0 and S1–S8 built and run (Runs 14–15); the gate waits on
the user's open decisions (#204 contract parts, #205–#208, #216 item 2, #217, #218, #219 item 1, #227) and G10-1.`
(or "Closed" once the user rules), with a *Superseded* note for "Stage 0 closed …; next S1".

**Phase doc — Outcome (rewritten as results):**
- The MCP's trusted `browser_click`/`browser_type`/`browser_press_key` send `focusTab` first; live 9/9 on a background
  fixture tab (Run 15 MCPF-1R). Schemas byte-identical but `browser_evaluate`'s (#214).
- A locator past the snapshot's 800-element cap warns: `pastSnapshotCap` on the wire, the SDK's `warning` event, one
  MCP line; live on SDK and MCP (CAP-1's SDK leg, CAP-1R).
- `browser_evaluate {saveTo}` and `tab.evaluateToFile` write a value to a file through an extension store (transport
  (B)); Run 15 saved 1 MiB, 4 MiB, 2 MiB with surrogates, JSON, 64 MiB (return and primitive) by sha256, and the pp1
  leg gave page = SDK file = MCP file (419 015 bytes); the chunked recipe is retired (−7 tests).
- `JS_DISABLED` is the 26th code (25 on the wire); `bb-login.ps1` waits on a condition inside 90 s; the local branch
  `release/step8` (`db72e9a`, Variant C) waits for G10-1.
- Live: Run 14 (R14-5c, R14-4b, R14-REL-3 PASS) and Run 15 (27 PASS / 3 FAIL / 3 NOT MEASURED / 4 RECORD, none a
  product defect; RET-1R retired 3 handles); safety state read back equal every time. `npm test` 2720 / 116 → 3273 /
  132 (at `025bdef`).

**`CLAUDE.md` Current state:** S8's draft (`S8-claude-md-proposals.md` (b) 9) is sound, with these changes: date the
block 2026-10-25 and cite `npm test` at `025bdef` (or the close-out commit) for "3273 tests in 132 files"; its
Superseded note's "553 tests net" is right (+560, −7) and should add "16 files"; keep "Reloads need no human"; in
Resume say the extension needs no reload if Run 15's build is still loaded (daemon `021286ab5f32…`; S7.md Handoff)
— only `/mcp` or a fresh session for interactive bridge users; in Next, also carry "the place of #140's network rule
in the order is set at Step 10's close" and F19's focus/input race as a known limit. Drop the Step 8 W2 bullet to
history (session-closeout).

## 4. Proposals skipped, and why

| proposal | why skipped |
|---|---|
| (b) 9 — the draft Current state block | the session agent writes it at close-out (brief); its corrections are in §3 |
| A6, A8, A21 | process rules (commit before dispatch; STOP on every failure path; archive scan inputs per attempt) — already in `briefs/common.md` LESSONS and #213/#226 item 6; not runtime gotchas (S8 recommended skip) |
| A7 | helper-specific scanner bug, fixed in the helper (#213) (S8 recommended skip) |
| A19 — `printf` turns `\a` into BEL in Git Bash | not in a run record ("per the step agent", S7.md Findings 5), a generic shell fact unrelated to the bridge, and it overlaps the user's memory note on backslashes in Bash; optional in S8 |
| A-edit 4's optional `focusTab` clause | applied (not skipped), as "(the MCP's trusted tools call it since Step 10 S2 and add no focus of their own)" |

No proposal was found wrong on the facts.

## 5. Needs a decision

1. **SAVE-REFUSE's prefix** — #227 (a) stands; option (b) (an own coded `BridgeError` keeps its message unprefixed,
   then SAVE-REFUSE-R) waits for the user. Already listed under Open decisions.
2. **`saveTo`'s parameter description omits `kind`** (S8 finding, outside its lane). A parameter description sits in
   the `inputSchema` that #214's baseline pins, so the fix needs a recorded re-baseline; propose it with #227 (b)
   if that runs, else as a later item.
3. **Where the network rule against redirects onto blocked sites (#140, #202) goes in the order** — the phase doc's
   Follow-ups and the roadmap say "set when Step 10 closes".
4. **SW-2** — a re-measure of the ~1.5 s switch with a discarded warm-up trial (#226 item 1): which step carries it.
5. **A lease for a popup of a background opener** — only as a design change to the daemon's opener rule (#226's
   Revisit-if); the user's call, or leave as documented.
6. **F19** — focus and input are two calls; recorded as a known limit (#209 item 6), never seen live. No action
   unless a row sees it.

## 6. Files changed

`CLAUDE.md`, `docs/plans/2026-10-24-step10-step8-follow-ups.md`, `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`,
`docs/progress-and-roadmap.md`, `docs/e2e-test-plan.md` (header and a note after the §5 template only; no row or run
record touched), and this report.
