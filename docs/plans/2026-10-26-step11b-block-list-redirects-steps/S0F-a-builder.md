# S0F-a — builder report

Model / effort: Opus, medium. Role: builder (agent-rules §6). Commit: none (per brief).

## 1. Verdict

**DONE.** One out-of-lane edit (a recipes drift test) is flagged under §4 for the step agent to accept or revert.

## 2. Outputs

**Spec-note file (separate, can be committed before the code):**
- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` — §10: the Step 11 line "`listTabs` rows and tab events
  of a `file:` tab are not hidden by this rule" gets an inline *Superseded 2026-10-26* marker, and a new
  *Amended 2026-10-26 (Step 11b S0F-a …)* bullet holds two items: `file:` rows/events hidden as `"blocked"`, and the
  home-folder refusal (options page + matcher, fails closed from storage). No method, code, event or field added.

**Code files:**
- `extension/src/upload-paths.ts` — new exported pure predicate `isHomeFolder(ParsedUploadPath)` (stage0-audit §5
  table: ASCII fold both styles; Windows `users` / `documents and settings` / `docume~<n>` at 1–2 segments on any
  drive; POSIX parents `/home`, `/users`, `/var/home`, `/system/volumes/data/users` and one segment below; root homes
  `/root`, `/var/root`, `/private/var/root` exactly). Applied in `parseUploadFolderLine`, which both callers use (the
  options model and `safety-state.ts`'s parse of the stored text): a home line is `{kind:"invalid", text, home:true}`
  and never in `folders`.
- `extension/src/options-model.ts` — `holdsHome` and `UPLOAD_HOME_WARNING` removed; new `UPLOAD_HOME_REASON`
  (names no path) for `home` lines; the `.ssh` warning stays; the standing text `UPLOAD_FOLDERS_WARNING` now says a
  home folder is refused. `options.ts`/`options.html` unchanged (they show the constants).
- `extension/src/safety.ts` — `hiddenReason` returns `"blocked"` when any URL is `file:` (`isFileUrl`, so wrapped,
  any case, and past the unwrap bound); this one function feeds `redactListTabsRow` (listTabs via
  `safety-call.ts` `redactRows`), `redactTabCreated` and `redactTabRemoved` (sw.ts). `safetyDecision("listTabs")`
  returns `{redact:"blocked"}` for a `file:` target too, for consistency (no consumer in `src` reads it). Header and
  doc comments updated. `handlers/tabs.ts` needed no change: it already passes every row through `call.redactRows`.
- `mcp/src/tools/registry.ts` — `browser_upload_file`'s description: "The tab is not brought to the front." →
  "The upload works on a background tab: the tab is not brought to the front."
- `docs/setup.md` — the quoted tool description (same edit, byte-identical to the code); the quoted standing text;
  a new paragraph "Since Step 11b, a home folder … is refused"; the home text moved from the warnings list to the
  invalid-reasons list; citations re-pointed (`options-model.ts:113-114`, `:115`, `:162-164`).

**Tests:**
- New `extension/test/s0f-home-folders.test.ts` (7 tests): one case table (34 home lines, 18 allowed, 2 `.ssh`, 5
  other-invalid) run through the predicate, caller 1 (`analyzeUploadFolders`: invalid, `UPLOAD_HOME_REASON`, count 0,
  no warning) and caller 2 (`parseUploadFolders` + `uploadPathAllowed`; and through `SafetyStore.read()` with the home
  line in fake `storage.local` → `ctx.uploadFolders.count` 0 and `uploadRefusal` → `UPLOAD_REFUSED`). A predicate
  applied only on the options page would fail caller 2's three tests.
- New `extension/test/s0f-file-tabs.test.ts` (4 tests): `hiddenReason`, listTabs row (url and pendingUrl),
  `tabCreated`, `tabRemoved`, and the listTabs decision, over 9 `file:` forms and 6 non-`file:` URLs.
- `mcp/test/s2-focus-first.test.ts` — one new test pinning the background-tab sentence (once, old sentence gone, no
  other tool has it).
- Failing first: the two new extension files and the MCP test were run red before the code (`s0f-file-tabs` 4/4
  failed; `s0f-home-folders` failed at import of `isHomeFolder`; the MCP test 1 failed), then green.

**Listed test changes (behaviour changed by #288):**
- `extension/test/s3-options-upload.test.ts:62-69` (was `:67`, the pinned home *warning*) → home lines are invalid with
  `UPLOAD_HOME_REASON`, count 0; the standing-text test pins the new text; import `UPLOAD_HOME_WARNING` →
  `UPLOAD_HOME_REASON`; header comment. Dated notes in place.
- `extension/test/s2-upload-gate.test.ts:275` — "listTabs … rows are not hidden by this rule" (`toBe("allow")`, row
  unchanged) → `{redact:"blocked"}` and the hidden row. Dated note in place.
- `recipes/test/s11-rules.test.ts` — out of lane, see §4.

**Counts:**
- Before: `npm test` → `Test Files 154 passed (154)`, `Tests 3811 passed (3811)`.
- After: `npm test` → `Test Files 156 passed (156)`, `Tests 3825 passed (3825)` (+14: 7 home, 4 file-tabs, 1 MCP,
  1 recipes drift test split in two (+1); none removed).
- `npm run typecheck` → exit 0; `npm run build` → exit 0; `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11}.json`
  → all six exit 0.
- `git status --short` after the build: only the files above plus the two new tests, and
  `docs/plans/…-steps/journal.md`, which was already modified before this stage (not mine). No `dist/` change tracked.
- Router methods, codes and tool counts unchanged (the existing count tests pass; 24 tools in the baseline test). No
  log call added; `log-scan` and `log-sentinel` green in the full run.
- Size: about 330 new lines including tests (diff 135+/43− on tracked files, ~205 in the two new test files).

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

1. **Out of lane — `recipes/test/s11-rules.test.ts` (for the step agent: accept or revert).** Its drift test pinned
   Run 16's sheet texts `K-opt-stand` and `K-opt-home` to `UPLOAD_FOLDERS_WARNING` and `UPLOAD_HOME_WARNING`. The
   brief requires both product texts to change, and the sheet's expected text must not be edited after its run (§2),
   so the suite went red (1 failure) and the recipes typecheck would break on the removed export. Edit: the two
   asserts moved to a dated test that keeps Run 16's texts as its record and pins that the product changed only the
   home sentence (`K-opt-stand` with that sentence swapped equals the new constant) and that the new reason begins
   with the old warning's words. `recipes/s11-rules.ts` itself is unchanged. The other choice, keeping a dead
   `UPLOAD_HOME_WARNING` export, would have kept the product's text and the old sheet tied to nothing.
2. **`extension/src/safety.ts` edited.** The brief's lane names `handlers/tabs.ts` "and the tab-event code it shares";
   that code is `safety.ts`'s `hiddenReason` (the phase doc's S0F lane lists `safety.ts`). `tabs.ts` needed no edit.
3. **The #214 baseline pins input schemas only, not descriptions** (`captureToolSchemas` returns `{name,
   inputSchema}`), so `browser_upload_file`'s entry there is unchanged; the description is pinned by the new test
   beside it, with a dated "Re-baselined" note. Mechanical.

## 5. Proposed decisions

### 2026-10-26 · S0F-a: the home predicate's edges as built
**Decided:** stage0-audit §5's table, plus three edges written out: `/var/home` and `/System/Volumes/Data/Users` are
refused as parents too (not only one name below them), `DOCUME~<n>` takes any run of digits, and `/var/root/<x>` stays
allowed (inside root's home, as `/root/uploads`). **Why:** a parent of homes is refused wherever a home is. **Instead
of:** refusing only the child forms the table listed. **Revisit if:** a user needs one of them. **By:** Claude (proposed;
stricter)

### 2026-10-26 · S0F-a: the listTabs gate decision also redacts a `file:` target
**Decided:** `safetyDecision("listTabs", …)` answers `{redact:"blocked"}` for a `file:` URL, as `hiddenReason` does.
**Why:** one rule in both places; nothing in `src` consumes it today. **By:** Claude (proposed)

## 6. Findings

- The session agent's `CLAUDE.md` text is now stale: `extension/CLAUDE.md` § Safety gate ("`listTabs` rows of a `file:`
  tab stay listed (#245 (a), #259)"); `mcp/CLAUDE.md` Key files ("no background-tab sentence yet"); the `upload-paths.ts`
  key-file line could name `isHomeFolder`. `docs/e2e-test-plan.md` K-opt-stand/K-opt-home rows (Run 16) are records,
  untouched; Run 17's F-HOME row should use `UPLOAD_HOME_REASON`.
- `docs/setup.md:1040-1041` ("never your home folder …") still reads true and was left as is (outside the quoted lines).
- No new runtime fact (no live run).

## 7. Handoff

No processes left running. Next: verifier (focus per the phase doc: a home line in storage unused — `s0f-home-folders`
caller 2; `file:` rows hidden — `s0f-file-tabs`; prove the new tests red on `HEAD`). S0F-b (missing-file refusal) is
untouched.
