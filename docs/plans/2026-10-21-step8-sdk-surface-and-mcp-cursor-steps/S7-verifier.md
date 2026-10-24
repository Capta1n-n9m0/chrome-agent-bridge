# S7 verifier report — docs

**Date:** 2026-10-24 · **Verifier:** Claude Opus 5.5 · **Tree under test:** uncommitted edits in the main
working tree at HEAD `eb6b991` (6 files) plus the untracked `S7-builder.md` and `S7.ledger.md` · No tracked
file edited; no Chrome touched; no agent spawned; the token was never printed (compared by count only).

**Verdict: FAIL.** Three MAJOR findings, each a gotcha fact the cited record contradicts or does not
state (F1–F3), plus two exit checks that are not met yet (S7.3's messages as worded and S7's own commit;
S7.4's as-built entry). The rest of the docs check out: lane, Current state, superseded notes, the
snippet's typecheck, 23 tools, 23 codes, test counts, Phase F wording, spec notes, public-repo hygiene,
cross-references.

## Findings

### F1 — MAJOR — the MUX-6 note has the EOF timing backwards
- **Where:** `CLAUDE.md:263` ("end-of-file 3–6 ms after the child's exit").
- **Evidence:** `sed -n 286,289p docs/decisions.md` → #91: "EOF 3–6 ms **before** the child's exit with
  the stand-in alive in 6 runs". `S3.md:29-31` → "EOF on the child's stdout −3…−6 ms relative to the
  child's `exit`". The sign is wrong. The cited decision says the opposite.
- **Fix:** "end-of-file 3–6 ms before the child's exit".

### F2 — MAJOR — "outlasted a 20 s settle" is not what Run 12 measured
- **Where:** `CLAUDE.md:644-645` ("a real site's SSO round trip outlasted a 20 s settle while the login
  had worked").
- **Evidence:** `S6-run-record.md:1529-1530`: the submit was invoked at 16:58:27.985Z and the post-submit
  check read the SSO page at 16:58:36.106Z, about 8 s later. `recipes/bb-login.ps1:226-232` `Wait-Settled`
  ends after the address bar has been stable for 4 s, at most `-SettleSec 20`. So the settle ended early,
  after about 8 s. It did not run 20 s and get outlasted. S6.md candidate 12's own body says "about 8 s after
  the press"; only its headline says "20 s". #101 says only "the post-submit check ran too early".
- **Fix:** e.g. "the login script's post-submit check (it stops once the address bar has been stable for
  4 s, at most 20 s) read the SSO page about 8 s after the press, yet the login had worked (#101)".

### F3 — MAJOR — the default-mode cyan shift is inferred, but the bullet states it as a fact
- **Where:** `CLAUDE.md:510-512` ("Default-mode captures shift cyan's (and lime's) red channel past the
  hue rule, while blue reads true (`#3300f8`, Run 12 REP-0 control A)").
- **Evidence:** `S6-verifier-r2.md:26-30`: "No record holds a default-mode (`captureVisibleTab`) capture
  of the cyan bar read by the hue rule … `#00ffff` through the default capture **should** land near R ≈
  140–150". Measured in default mode: lime `#00ff00` → `#8fff3d`, red `#d92424`, blue `#3300f8`
  (T5-run9-record.md:84-86, as that report quotes them). Cyan was measured only through CDP (`#97fdfd`).
  Also, "blue reads true" overstates `#3300f8`: the hue rule names it blue, but the red channel rose to 0x33.
  docs-writing-guide rule 7 says measured facts stay measured.
- **Fix:** "In default-mode captures lime `#00ff00` read `#8fff3d` and blue `#0000ff` read `#3300f8`
  (named blue; Run 9, and Run 12 REP-0 control A); cyan through the default capture was not measured
  and is expected to shift like lime (S6 verifier r2)".

### F4 — MINOR — "live data can change" generalises an inference
- **Where:** `CLAUDE.md:646-647`.
- **Evidence:** S6.md candidate 15: "the gradebook change is an inference from counts, flagged, not
  proven". The bullet states it with no qualifier. The advice it draws (compare over one held export, #103)
  stands.
- **Fix:** add "(inferred from counts, not proven)".

### F5 — MINOR — two CLAUDE.md values changed without a dated note
- **Where:** `CLAUDE.md:178` ("Full setup + the 22 tools" → "23 tools + …") and `CLAUDE.md:390`
  ("still carry the Chrome `id` … for one release (Step 6 clients)" → "kept through Step 8 for its
  consumers").
- **Evidence:** `git diff CLAUDE.md` shows both `-` lines with no *Superseded* marker. Every other changed
  value in the diff carries one, or keeps the old value inline (e.g. "23 tools (22 before Step 8 S5)").
  The `sdk/src/index.ts` description grew from five named values to "exactly eight" with no marker. That one is
  additive, so it is a NIT.
- **Fix:** add `*Superseded 2026-10-24: was …, because …*` to the first two.

### F6 — NIT — the setup guide uses row codes without their titles
- **Where:** `docs/setup.md:402` ("Step 8's Run 12 REP-0") and `:340` ("E2E row SDK-1").
- **Evidence:** docs-writing-guide rule 6: pair a row code with its title on first use.
- **Fix:** "(Run 12, row REP-0 — the failure-report screenshot probe)".

### F7 — NIT — the Key files list for `recipes/blackboard/` is partial
- **Where:** `CLAUDE.md` Key files `recipes/` bullet.
- **Evidence:** `ls recipes/blackboard` → also `export-file.ts guard.ts readonly.ts session.ts
  transcript.ts stub-bb.js`; `recipes/fixtures/` is not named either. The bullet names `boot-bb`,
  `export-grades`, `assemble-mcp`, `held`.
- **Fix:** add the others, or write "… and their helpers".

### F8 — NIT — the G8-3 "exact old text" elides one paragraph
- **Where:** `S7-builder.md` §8.
- **Evidence:** the old text matches `~/.claude/skills/blackboard-ultra/SKILL.md:33-62` line for line,
  except that the Local Network Access paragraph (lines 41-48) is shown as "…(unchanged)…" and the course
  id as a placeholder. The placeholder is right for a public repo. The elision is disclosed.
- **Fix:** none needed. The user can diff against SKILL.md:33-62 when granting.

### F9 — NIT — the spec's §13 note says "resolving" where the row says "listed"
- **Where:** design spec §13 "Answered 2026-10-24" note ("left no handle minted before it resolving").
- **Evidence:** `S6-run-record.md:1592`: "no handle ≤ T268 listed after the restart; snapshot →
  `TAB_GONE`".
- **Fix:** "no handle minted before it listed, and the old handle answered `TAB_GONE`".

## Checks run (by brief item)

1. **Lane — PASS.**
   - `git status --short` lists only `CLAUDE.md README.md docs/e2e-test-plan.md docs/progress-and-roadmap.md
     docs/setup.md docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, plus `?? …/S7-builder.md` and
     `?? …/S7.ledger.md`. No code file changed.
   - The Current state block is byte-identical: `diff <(git show HEAD:CLAUDE.md | sed -n '/^## Current
     state/,/^## Architecture/p') <(sed -n '…' CLAUDE.md) && echo CS_IDENTICAL` → `CS_IDENTICAL`.
2. **Gotcha sources — FAIL (F1–F3), with F4 MINOR.** Checked against their sources and the code:
   - **a11y:** #87 items 1–3 (120 characters, past the 800 cap, `exact` case-sensitive); `a11y.ts:8
     MAX_NAME = 120`; S1.md:20 (46 fixtures), :134 (≈1.4 s on 5 000 elements, jsdom);
     `locator-wait.ts:25 DEFAULT_POLL_MS = 100`, polls never overlap.
   - **locate never resets:** `grep -rn "reset" extension/src/content/locate.ts` and `grep -rn buildSnapshot
     …` → empty, exit 1. S4.md §6 and #93 confirm the renumbering.
   - **The mark:** `marked.ts:30,37`; `evaluate/mark.ts:79,114`; `handlers/evaluate.ts:73` ("asRef needs an
     Element; the value is not one").
   - **Failure reports:** `sdk/src/error.ts:66-83` (7 codes, 5 000 ms, 20 entries, 60 lines). REP-0's
     +20 ms / 1331 ms / 1344 ms per `S6-run-record.md:1227` and S6.md:501.
   - **isError:** `S6b-probe-record.md` V1–V6 headers and rule line 128; `registry.ts:55` (wording).
   - **Cursor:** `mcp/src/cursor.ts:1-11`; `registry.ts:348-358` (the `Cursor:` and `Human's active tab:`
     lines).
   - **Tab required:** `intercept.ts:374-377, 455-466`; `methods.ts:42-43`.
   - **Session marker:** `session-marker.ts:1-30` (`MARKER_WAIT_MS = 2000`); `intercept.ts:180,203` (log
     texts); `S6-run-record.md:1393, 1592` (`5 tabs, 0 gone`; +1539 ms).
   - **tsx:** `S6-verifier.md:175-190` (tsx v4.23.15, `node:vm`).
   - **typecheck `&&`:** `package.json:9`.
   - **M6:** `S2b-verifier.md:289`.
   - **FE:** `FE-run-record.md` (visible +3…+7 ms, hidden +14…+39 ms over 9 trials; `ped`; 0/3, 2/3, 0/3; FE-5
     0/3+0/3 twice = 0/12; FE-4 9/9).
   - **Reload:** `S6-run-record.md:1362-1366` (16:53:10.415Z → 16:53:12Z, exit 0).
   - **targetTab:** `tabs.ts:43-58`; `grep -rn "targetTab({}" extension/src` → exit 1.
   - **`code` required:** `connection.ts:12,73` (once per connection), `wsHost.ts:240`.
   - **Handle mark:** `handle-mark.ts:19-21` (64, time base).
   - **`newTab` rule:** `registry.ts:585-602`.
   - **PowerShell, `npx`, HWND, `*.localhost`:** S6.md candidates 2, 3, 10, 11, 13, 14, 16 as stated.
3. **Superseded notes — PASS-with-notes (F5).** Every `-` line in the CLAUDE.md, setup, README and
   progress diffs was read. All but the two in F5 carry a dated note or keep the old value inline.
4. **S7.1 items — PASS.**
   - `grep -n "a11y.ts" CLAUDE.md` → `152` (Key files) and `516: - **Locators are resolved by the
     snapshot's own rules — change `a11y.ts`, not two places.**`.
   - The other five phase-doc items are present and true to the code (item 2): locate adds refs and never
     resets; `data-__bridge-mark` across worlds; failure reports take the visibility lock; the cursor never
     follows the human but through `browser_use_active_tab` and the first touch; recipes run with tsx.
5. **S7.2 snippet — PASS.** In the clean worktree (item 7), I took the block straight from the main tree's
   `docs/setup.md` (`awk '/^## Writing a script/{f=1} f&&/^```ts$/{g=1;next} g&&/^```$/{exit} g{print}'`,
   21 lines, starting `// my-script.ts — sign in…`) and wrote it to `recipes/_v7-snippet.ts`, with
   `recipes/_v7-tsconfig.json` = `{"extends": "./tsconfig.json", "include": ["_v7-snippet.ts"]}`. That
   tsconfig resolves `@bridge/sdk` the way `recipes/tsconfig.s6.json` does for `sdk-login.ts`.
   ```
   $ npx tsc --noEmit -p recipes/_v7-tsconfig.json
   EXIT=0
   # control: copy + `await tab.click(42); const n: number = await tab.locate({ role: "button" });`
   $ npx tsc --noEmit -p recipes/_v7-bad-tsconfig.json
   recipes/_v7-bad.ts(12,38): error TS2345: Argument of type 'number' is not assignable to parameter of type 'Target'.
   recipes/_v7-bad.ts(12,49): error TS2322: Type 'LocateResult' is not assignable to type 'number'.
   CONTROL_EXIT=2
   ```
   - The fixture elements the snippet uses exist: `#email` at `test-fixtures/e2e-playground.html:31`,
     "Sign in" at :49, `#status` at :23, "form submitted" at :191.
   - The rest of the section matches `sdk/src/tab.ts`, `client.ts` and `locator.ts`: method list,
     signatures, the `NO_CURSOR` text, 15 s `waitForExtensionMs`, the 10 s / 60 s waits, `{name}` without
     `role` → `BAD_PARAMS`, and the lease check after `release()` (`leases.ts:42-45`).
   - The three recipe tsconfigs at HEAD: `tsconfig.json`, `tsconfig.fe.json` and `tsconfig.s6.json` each
     exit 0.
   - The scratch files went with the worktree.
6. **Tools and codes — PASS.**
   - `grep -c "server.tool(" mcp/src/tools/registry.ts` → `23`.
   - Tool names: the 23 from the registry are the same as setup.md §5's table (21 rows; two rows pair
     `back`/`forward` and `new_tab`/`close_tab`) and the same as progress §1's 23-name list.
   - Codes: `shared/src/codes.ts` has 23 entries (`NO_CURSOR` last), the same as CLAUDE.md, the spec §10
     note and progress.
7. **Test counts — PASS.** `git worktree add <scratch>/s7wt HEAD` (eb6b991), then `npm ci` → `CI_EXIT=0`
   and `npm test` → `Test Files 85 passed (85)`, `Tests 1714 passed (1714)`, `TEST_EXIT=0`. `npm run
   typecheck` → `TC_EXIT=0`. This matches CLAUDE.md Commands ("1714 passed, 85 files (`npm test`
   2026-10-24 at eb6b991)"), progress, README and the spec note. Progress's per-stage table matches the
   as-built register (lines 74, 112, 148, 181, 203, 233, 260, 306, 317, 346) and journal.md:94 (1654/83).
   The worktree was removed (`git worktree remove --force`, then `rm -rf`, then `git worktree prune`;
   `git worktree list` shows only the main tree).
8. **S7.3 commits — NOT MET as worded** (see the exit checks below). There are 53 commits in
   `70aa754..HEAD`, and `git log --name-only --format= 70aa754..HEAD | grep -E
   "dist/|bridge.token|\.env|exports/"` → no output, exit 1. The same is true for `\.png$|failures/`. The
   builder report lists no commits; it leaves S7.3 to the step agent.
9. **S7.4 skill — the proposal is present; the skill is unmodified.**
   - `git -C ~/.claude/skills/blackboard-ultra status --short` → empty, exit 0; last commit `e1b8f25`
     (2026-10-21).
   - The old text matches SKILL.md:33-62 (F8).
   - The new text's claims match `recipes/blackboard/boot-bb.ts:1-19, 41, 55, 69`.
10. **Phase F — PASS.**
    - The roadmap's own wording is kept and annotated in place. "`wait_for` variants (element-visible;
      network-idle shipped …)" gets "✅ element-visible done in Step 8". "Return a `[ref=eN]` for a
      `kind:"node"` result" gets "✅ Done in Step 8".
    - The note names what is still open (`args` for `browser_evaluate`, console capture, D3 file upload)
      and cites decisions.md · 2026-10-21 · Step 8 S7 names only the Phase F items Step 8 closes. `args`
      is not marked done.
11. **Design spec — PASS.** `git diff … | grep -E "^-[^-]"` shows two `-` lines. In both the original
    sentence is kept word for word, with a dated *Corrected 2026-10-24* note appended. Every other change
    is an added dated note. (F9 NIT.)
12. **Writing guide — PASS-with-notes (F6).** Decisions are cited by date and title throughout, and codes
    are glossed where they first appear in setup.md.
13. **Public repo — PASS.**
    - Every added line of the diff (608 lines) was searched for `ada\.blackboard|_[0-9]+_1|@ada\.edu|`,
      e-mail addresses, `pp1` and `https?://`. The only hits are the fixture URL
      `http://localhost:8080/e2e-playground.html` and the dummy `a@b.com`.
    - Token occurrences, by count only: diff 0, S7-builder.md 0.
    - S7-builder.md: no course id; the host name it quotes is already in tracked docs.
14. **e2e cross-references — PASS.**
    - §4.17 (l. 855), §4.19 (l. 971; REP-0 at l. 1042-1052 inside it), Run 11 (l. 1842) and Run 12
      (l. 1872) exist.
    - The two new template lines name rows that exist (FE-0, FE-5, FE-PC, FE-1…FE-4, FE-3c; REP-0).
    - Setup anchors `#writing-a-script`, `#locators`, `#failure-reports` and `#tabs` match headings. The
      progress anchor `#step-8--the-sdk-surface-locators-tab-failure-reports-the-mcp-cursor-2026-10-2324`
      matches GitHub's slug of the new heading.
    - The report references cited in CLAUDE.md exist: S1.md §6, S4.md §6, S6b.md §6 finding 2.

## Exit checks

- **S7.1 — FAIL as it stands.** The `a11y.ts` rule is found. But "every new gotcha cites its source" is
  meant as a source that states the fact, and three bullets cite sources that contradict them or do not
  state the fact (F1, F2, F3). It passes once those three are corrected.
- **S7.2 — PASS.** setup.md has `## Writing a script` (l. 300), and its snippet typechecks: exit 0, with
  a control that fails (exit 2).
- **S7.3 — NOT MET.**
  - One commit per stage: yes. Each stage closes with a commit: Stage 0 7fe62f4, S0 dcb72db, S1 e9e5e8c,
    FE 6742c1f, S3 db242b6, S2 357f776, S4 26df11b, S2b efb8557, S5 aa113df, S6b 03254d9, S6 23b878f …
    05a34f0.
  - No `dist/`, token, `.env`, `exports/` or PNG in the range: yes.
  - "With the messages listed": only FE's and S2b's match the kickoff §7 list exactly. For example, S1 is
    `feat(extension): S1 — content-script locate`, not the listed `feat(extension): locators resolved by
    the snapshot's rules; waitFor locator; evaluate asRef`. No `feat(recipes): …` commit exists (the
    recipes landed in `docs(step8): S6 — …` 23b878f). There is no `docs: Step 8 E2E results` either; the
    E2E results are in `test(e2e): S6 — …` commits.
  - S7's own commit does not exist yet.
  - None of this is the docs builder's work. History cannot be rewritten (it is on the integrity floor),
    so the step agent or session agent needs a dated note or ruling that maps stages to the listed
    messages.
- **S7.4 — NOT YET MET.** The skill edit was not made, which is correct under G8-3, and the builder's §8
  holds the proposal. But `grep -n "G8-3\|Needs the user's keyboard\|blackboard-ultra"
  docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md` finds nothing. The as-built's S7
  section, which the session agent writes, must list it under "Needs the user's keyboard".

## Verdict

**FAIL** — MAJOR F1, F2 and F3 (gotcha facts that the cited records contradict or do not state); S7.1 fails
until they are fixed; S7.3 (commit messages as worded; S7's own commit) and S7.4 (the as-built entry) are
not met yet. Fixing F1–F3 needs three one-line edits in `CLAUDE.md`. F4–F9 are MINOR and NIT.

## Re-check (round 1)

**Date:** 2026-10-24 · **Input:** `S7-fixer1.md` (claims audited against the current working tree and
their sources). Scope: F1–F7, F9, lane. Nothing tracked edited by me.

**Lane.** `git status --short`: the same six tracked docs, plus the untracked `S7-builder.md`,
`S7-fixer1.md`, `S7-verifier.md`, `S7.ledger.md`. `git diff --name-only -- '*.ts' '*.js' '*.mjs'
'*.json' '*.ps1'` gives no output: no code file changed. The Current state `diff` (same command as item 1)
prints `CS_IDENTICAL`. In `git diff --stat`, only CLAUDE.md changed size (344 → 352 lines touched).
`README.md` 18, `e2e-test-plan.md` 2 and `progress-and-roadmap.md` 89 are unchanged. `setup.md` (157) and
the spec (71) are edited in place, at the F6 and F9 lines only (read below).

| # | Result | Evidence (current tree) |
|---|---|---|
| F1 | **resolved** | `CLAUDE.md:265` "end-of-file 3–6 ms before the child's exit". Matches #91 (decisions.md:288) and S3.md:29-31. |
| F2 | **resolved** | `CLAUDE.md:649-651` "the login script's post-submit check (it stops once the address bar has been stable for 4 s, at most 20 s) read the SSO page about 8 s after the press, yet the login had worked (… #101)". Matches S6-run-record.md:1529-1530 (16:58:27.985Z → 16:58:36.106Z, 8.1 s) and `bb-login.ps1:63, 226-232`. |
| F3 | **resolved** | `CLAUDE.md:513-516` lime `#00ff00` → `#8fff3d`, blue `#0000ff` → `#3300f8` (named blue; Run 9, Run 12 REP-0 control A); "cyan through the default capture was not measured and is expected to shift like lime". Matches S6-verifier-r2.md:26-30 and S6-run-record.md:555. |
| F4 | **resolved** | `CLAUDE.md:653` "(inferred from counts, not proven)". Matches S6.md candidate 15. |
| F5 | **resolved** | `CLAUDE.md:179-180` *Superseded 2026-10-24: was "the 22 tools" …*. `CLAUDE.md:394-396` *Superseded 2026-10-24: was "for one release (Step 6 clients)" …*. Its reader list matches #81 (decisions.md:459-460: `hello.ts`, `t5.ts`, `t5-lib.ts`, five daemon tests, `registry.ts`). The eight-values NIT was left as is, which is acceptable. |
| F6 | **resolved** | `setup.md:340-341` "E2E row SDK-1 — the SDK flow end to end against the fixture"; `setup.md:402` "Run 12, row REP-0 — the failure-report screenshot probe". |
| F7 | **resolved** | `CLAUDE.md:136-139` now names `export-file.ts`, `guard.ts`, `readonly.ts`, `session.ts`, `transcript.ts`, `stub-bb.js` and `fixtures/`, which matches `ls recipes/blackboard`. |
| F9 | **resolved** | spec :625-626 "left no handle minted before it listed, and the old handle answered `TAB_GONE`". Matches S6-run-record.md:1592. Only the note's own wording changed: the line is inside the dated "Answered 2026-10-24" note, so no original spec sentence was rewritten. |

New issues introduced: none found. NIT: some touched lines run past 100 columns (CLAUDE.md:181, :655;
setup.md:341, :403; spec :626). This is cosmetic.

**S7.1: PASS.** Every new or changed gotcha now cites a source that states it. The `a11y.ts` rule is at
`CLAUDE.md` 516–517 (`grep -n "a11y.ts" CLAUDE.md`).
**S7.2: PASS** (unchanged; the snippet block was not touched by the fixer).
**S7.3 / S7.4:** these are bookkeeping items for the step agent and session agent, as the step agent
directed. They are still open: the stage commit messages differ from the list (except FE and S2b), S7's
own commit is pending, and the as-built "Needs the user's keyboard" entry for G8-3 is pending. They are
not counted in this verdict.

**Verdict (round 1): PASS-with-notes.** No CRITICAL or MAJOR finding remains. Left over: F8 (NIT,
disclosed elision), the line-length NIT, and S7.3/S7.4 for the S7 report and the as-built register.
