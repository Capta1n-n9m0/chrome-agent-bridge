# S0F-a — step report

Model / effort: Opus, medium. Role: step agent (agent-rules §6). Children: builder (Opus, medium), verifier (Opus,
medium), fixer (Opus, medium), verifier2 (Opus, medium), committer (Sonnet, medium).

## 1. Verdict

**DONE.** Verifier verdict after one fix round: **PASS-with-notes**.

## 2. Outputs

- **Home folders refused (#288 3b):** one shared pure predicate `isHomeFolder` in `extension/src/upload-paths.ts`,
  applied inside `parseUploadFolderLine`, which both the options model and the gate's parse of stored text use; a home
  line is invalid with `UPLOAD_HOME_REASON` (`extension/src/options-model.ts`, names no path), never a used folder. The
  `.ssh` warning stays.
- **`file:` tabs hidden (#288 3d):** `hiddenReason` in `extension/src/safety.ts` returns `"blocked"` for a `file:` URL;
  it feeds `listTabs` rows, `tabCreated` and `tabRemoved` (`tabReplaced` carries ids only).
- **Tool description (#287):** `browser_upload_file` says the upload works on a background tab
  (`mcp/src/tools/registry.ts`), pinned by a new test in `mcp/test/s2-focus-first.test.ts`; setup.md's quote matches.
- **Spec §10** dated note (2026-10-26) for the `file:` row hiding and the home refusal; committed before the code.
- **docs/setup.md:** the quote, the standing text, the home-folder paragraph, the `file:` listing sentence, citations.
- **Tests:** new `extension/test/s0f-home-folders.test.ts` (8) and `s0f-file-tabs.test.ts` (4); listed changes in
  `s3-options-upload.test.ts` (warning → invalid), `s2-upload-gate.test.ts:275` (`file:` row now hidden),
  `recipes/test/s11-rules.test.ts` (drift test split, Run 16's record text kept).
- **Counts** (verifier's runs): `npm test` 3811 / 154 files at HEAD `a970ec3` → 3825 / 156 files; none removed.
  Typecheck, build, six recipes tsconfigs and doc-check exit 0; 24 tools, 27 codes, 27 router methods unchanged.
- **Commits:** see §7.

## 3. Verifier verdict

- `S0F-a-verifier.md`: PASS-with-notes. M1 (setup.md sentence made false), M2 (citations off by one), N1, N3 → fixed
  in `S0F-a-fixer.md`; N2 (builder's per-file count, report only), O1, O2 carried.
- `S0F-a-verifier2.md`: PASS-with-notes for the whole stage; M1, M2, N1, N3 resolved; O3 new.
- New tests proved red on HEAD (16 red); mutant "home check on the options page only" red (3 caller-2 tests incl.
  the stored-line test); mutant "`hiddenReason` skips `file:`" red (4 tests).

## 4. Deviations

- `recipes/test/s11-rules.test.ts` edited (out of the brief's lane): the removed `UPLOAD_HOME_WARNING` export and the
  changed standing text broke its drift test. Accepted by the step agent and the verifier: Run 16's record texts
  (`recipes/s11-rules.ts`) are unchanged and checked byte for byte.
- `extension/src/safety.ts` edited: it is "the tab-event code" `tabs.ts` shares, and the phase doc's S0F lane lists it.
- The #214 baseline pins input schemas only (`mcp/test/tool-schemas.ts:27`), so its entry is unchanged; the
  description is pinned by the new MCP test instead.
- Step agent granted the fixer `docs/setup.md`'s `file:` listing sentence (outside "the quoted lines").

## 5. Proposed decisions

### 2026-10-26 · S0F-a: the home predicate's edges as built
**Decided:** stage0-audit §5's table plus: `/var/home` and `/System/Volumes/Data/Users` refused as parents too,
`DOCUME~<digits>` of any length, `/var/root/<x>` allowed (as `/root/uploads`). **Why:** a parent of homes is refused
wherever a home is. **Instead of:** refusing only the listed child forms. **Revisit if:** a user needs one of them.
**By:** Claude (proposed; stricter)

### 2026-10-26 · S0F-a: the listTabs gate decision also redacts a `file:` target
**Decided:** `safetyDecision("listTabs", …)` answers `{redact:"blocked"}` for a `file:` URL, as `hiddenReason` does.
**Why:** one rule in both places; nothing in `src` reads it today. **By:** Claude (proposed)

## 6. Findings

- **O1 (session agent, closeout):** stale now: `extension/CLAUDE.md:250` ("`listTabs` rows of a `file:` tab stay
  listed"), `mcp/CLAUDE.md:11` ("no background-tab sentence yet"); the root `CLAUDE.md` test count (3811/154) (O3).
- **O2 (measured 2026-10-26 by the verifier):** a fresh `git worktree` checks out `.ps1` with CRLF, and
  `recipes/test/s11-r16-runner.test.ts` then fails 9 tests; the main tree passes. Candidate `recipes/CLAUDE.md` gotcha.
- Run 17's F-HOME row should expect `UPLOAD_HOME_REASON`; Run 16's K-opt rows stay as records.

## 7. Handoff

Commits: filled in below by the step agent after the committer reports. No processes running; no worktree left.
Next: S0F-b (the missing-file refusal), untouched.
