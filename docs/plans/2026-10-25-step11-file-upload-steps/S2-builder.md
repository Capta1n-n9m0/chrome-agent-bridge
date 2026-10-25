# Step 11 S2 — builder report (the contract: code, gate, matcher, tables)

Model: Opus 5.5 (builder, standard stage). 2026-10-25.

## 1. Verdict

**ESCALATE** (DONE-PARTIAL). Everything in the lane is built, tested and committed, except one item the brief told me
to stop on: `uploadFiles`'s entry in `METHOD_CLASSES` with the class `upload`. Adding it needs changes outside the
lane (see §4, item 1). The folder rule it would call (`uploadRefusal`) is built and tested. Exit checks S2.2 (the
`uploadFiles` gate rows) and part of S2.5 are therefore **not met** yet. S2.1, S2.3, S2.4, #245 (a) and the rest of
S2.5 are met.

## 2. Outputs

- Commits, in this order (`git log`):
  - `014a98d` docs(docs): S2 — spec §10 note for UPLOAD_REFUSED, uploadFiles, class upload. Spec only. It also notes
    #245 (a), so the spec and the code agree.
  - `ac31655` feat(extension): S2 — UPLOAD_REFUSED, uploadFiles wire and table, the folder matcher, file: pages
    refused (verifier: pending). 23 files.
- Tests: `npm test` at `1fb16a1` (before): **3294 passed, 133 files**. After `ac31655`: **3460 passed, 137 files**.
  That is +166 tests and 4 new files. No test was removed.
- `npm run typecheck` exit 0. All five recipes tsconfigs (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`) exit 0.
- `npm run build` exit 0 (`built extension → dist/`). After the build, `git status --short` shows no tracked change
  except `journal.md`, which was already modified when I started and is not mine.
- Log scan: `log-scan.test.ts` passes, so its count is unchanged. No new source file has a log call.
- New files:
  - `extension/src/upload-paths.ts` (the matcher)
  - `extension/test/upload-paths.test.ts` (125 cases)
  - `extension/test/s2-upload-gate.test.ts` (23)
  - `shared/test/protocol-step11.test.ts`
  - `daemon/test/s2-upload-methods.test.ts`
- Matcher mutants for S2.1. Each mutant was applied to a copy and the file restored afterwards (diff empty):
  - (1) bare string prefix: 8 red (rows 14, 15, 18, 50, 51, 58, X34)
  - (2) case-insensitive POSIX: 2 red (rows 56, 57)
  - (3) `..` allowed: 5 red (rows 24, 25, 27, 60, X25)
- New tests seen red before their code:
  - `upload-paths.test.ts`: module missing
  - `s2-upload-gate.test.ts`: 19 of 23 red before `uploadRefusal`, the file: rule and the key; the rest red before
    the key
  - `s2-upload-methods.test.ts`: red before the table entry
  - SDK `S2.3`: 2 red before the line

### What each exit check got

- **S2.1** (met):
  - Every row 1–74 of `stage0-matcher-cases.txt` is a test under its own number.
  - The test file also has the verifier's M1 (2 rows), N2 (6 rows) and 34 `X` rows for #249's classes and the edges
    I added.
  - Each refusal row also checks its class name.
  - Row 66 differs from the table, with a dated note in the test header. The table expects `DOTSEG` by
    normalisation. #249 refuses any `\` in a POSIX path, so the class is `BACKSLASH`. The outcome (refused) is the
    same.
- **S2.2** (part):
  - Met: an empty list and a path outside every folder → `UPLOAD_REFUSED` (`uploadRefusal`).
  - Met: a wrong-typed `safety.uploadFolders` → every method `DISARMED` with `STATE_UNREADABLE_MESSAGE`. This runs
    through the real `GatedRouter` + `CallSafety` + `SafetyStore`, and no handler runs.
  - Met: a malformed `paths` fails closed. Cases: absent, not an array, an array-like, empty, 21 entries, a
    non-string, a hole, `..`.
  - **Not met:** `uploadFiles` is not in `METHOD_CLASSES`. "Disarmed → no attach", "a blocked tab / own page →
    `DOMAIN_BLOCKED`" and "JavaScript off → not refused" are not tested *for `uploadFiles`*, because the class does
    not exist yet.
- **S2.3** (met):
  - 27 codes, 26 on the wire (`shared/test/codes.test.ts`).
  - The spec commit `014a98d` comes before the code commit `ac31655`.
  - `UPLOAD_REFUSED` is not in `ATTACH_CODES`, and the set is unchanged.
  - The SDK line and the MCP line are tested: `sdk/test/safety.test.ts`, and `mcp/test/safety.test.ts` through
    `withSafetyRefusals` from three tools.
- **S2.4** (met):
  - `uploadFiles` is in `TAB_METHODS` and `takesLock` is false (`s2-upload-methods.test.ts`).
  - Over real `ws` on port 0 (`tabs.test.ts`, "Step 11 S2.4"):
    - another client's tab → `TAB_HELD`, nothing forwarded;
    - the holder's call is forwarded as `{ref, paths, tabId}`;
    - `daemon.status.lock` is `{}` while the call is in flight;
    - with no `tab` → `BAD_PARAMS`.
  - Caveat: the lease half of this test passes on the old table too. An unlisted method that names a `tab` is
    already resolved and lease-checked (#81 F8). Only the table tests depend on the entry.
- **S2.5** (part):
  - Met: the log-scan count is unchanged.
  - Met: `log-sentinel.test.ts` gains a sentinel folder, file name and `file:` URL. Two tests: the extension side
    (matcher, folder rule, stored key, the `file:` rule through the gated router, a badge press to prove the capture
    is live) and the daemon over real `ws` forwarding `uploadFiles`. No sentinel appears in any captured line.
  - Not covered: the gate's own `uploadFiles` path, because of the missing class.
- **#245 (a)** (met, `s2-upload-gate.test.ts`):
  - Every method of the classes that take a tab, all three phases → `DOMAIN_BLOCKED` with `FILE_PAGE_MESSAGE`.
    Target forms covered: a live `url`, a `pendingUrl`, a replaced tab, and a gone tab at effect.
  - `navigate`/`newTab` to a `file:` URL → `DOMAIN_BLOCKED` with `FILE_URL_MESSAGE`. This is checked in the gate and
    through `CallSafety` + `GatedRouter`, with no handler run.
  - URL variants tested: `FILE:`, `File:`, a leading space, a leading tab or newline, a leading NUL, `fi\tle:`,
    `file:C:/…`, `file:/…`, `file://host/…`, and `file:` inside `view-source:`, `VIEW-SOURCE: ` (with a space),
    `blob:file:` and `filesystem:file:`.
  - Disarmed wins. With JavaScript off, `blob:file:` is still refused, but as `JS_DISABLED`, because the state is
    tested first, as before.

## 3. Verifier verdict

Pending; not mine to run.

## 4. Deviations and escalations

1. **ESCALATE — the class-table entry for `uploadFiles`.** The brief says to stop here and report.
   - What I found:
     - (a) `safety-gate.test.ts` S1.1 requires the names in `METHOD_CLASSES` to **equal** the `router.on(…)` names in
       `sw.ts` ("and only those"). The same check is in `s4-save-gate.test.ts`. A table entry without a registration
       fails both, and the existing pattern does not allow the entry alone.
     - (b) Adding `"upload"` to the `MethodClass` union breaks the build. `callTargets` in
       `extension/src/safety-call.ts` switches over every class and has no default, so tsc fails with TS2366.
       `testsTab` also needs the class. `safety-call.ts` is outside the lane.
   - Options for the step agent:
     - (i) Let S2's fixer (or S3's first commit) take `safety-call.ts`:
       - add `case "upload"` to `testsTab` and `callTargets` (→ `[tabTarget]`);
       - in `safety.ts`: `upload` in the union, `TARGETS_BY_CLASS.upload = ["live","replaced","gone"]`,
         `METHOD_CLASSES.uploadFiles = "upload"`, and a branch after the tab tests that returns
         `uploadRefusal(params, ctx) ?? "allow"` at every phase;
       - then register `router.on("uploadFiles", …)` in `sw.ts` with the S3 handler, so the scan holds by equality.
     - (ii) The same, with a stub `router.on("uploadFiles")` in `sw.ts` now, which answers `INTERNAL "not built"`
       behind the gate.
     - (iii) Amend the S1.1 scan to "sw ⊆ table, and table minus sw = {uploadFiles} until S3". I recommend against
       this: it loosens a protective test, even for a short time.
   - My recommendation: (i), done as one small stage with S3's registration, or S2b. Everything except the `sw.ts`
     line is pure and fits S2's verifier.
2. **Two Step 9 tests amended (contract-driven).** `extension/test/safety-gate.test.ts` listed `file:///C:/x` as
   "unchanged while JS is off" and `file:///C:/x.html` as "allowed for every method". #245 (a) changes both. I
   removed those URLs from the allow lists with dated notes, and added an assertion that `file:` is `DOMAIN_BLOCKED`.
   Every method and phase is covered in `s2-upload-gate.test.ts`. #245's text and Stage 0 said "no existing test or
   row uses `file:`". That was wrong: these two tests did (finding 1).
3. **Count assertions moved by design**, each with a dated comment:
   - `shared/test/codes.test.ts`: 26 → 27, 25 → 26 on the wire, 16 → 17 extension codes, in the S4b test too;
   - `daemon/test/methods.test.ts` and `safety-surface.test.ts`: `uploadFiles` appended as `STEP11_S2_TAB_METHODS`;
   - `safety-state.test.ts` and `safety-rearm-failure.test.ts`: the `StoredSafety` shapes gain `uploadFolders: ""`.
4. **`StoredSafety.uploadFolders` is optional in the type**, and `parseStoredSafety` always sets it. With a required
   field, `recipes/test/s9-rules.test.ts` (outside the lane) failed `tsc -p recipes/tsconfig.s9.json` (TS2345 ×3).
   Absent means no folder, which fails closed.
5. **`isFileUrl` added to `safety-match.ts`**. The brief allows this for #245 (a). It reuses the private
   `innermostUrl`.

## 5. Proposed decisions

### 2026-10-25 · S2: the `paths` cap, the exact messages, and the folder-line rules
**Decided:**
- The cap is 20 (`UPLOAD_FILES_MAX_PATHS` in `shared/src/protocol.ts`, re-exported as `UPLOAD_MAX_PATHS`). Paths
  longer than 4096 characters are refused.
- `UPLOAD_REFUSED_MESSAGE` is phase doc 0.5's wording, unchanged. A malformed `paths` gets the same message.
- SDK/MCP line: `UPLOAD_REFUSED: that file is not in a folder the user allows for uploads in Chrome (extension
  options → Upload folders), so the bridge will not upload it. Stop and ask the user; do not retry with another path.`
- `FILE_PAGE_MESSAGE`: `This tab shows a local file (a file: page), which the bridge never reads or acts on.`
- `FILE_URL_MESSAGE`: `The bridge never opens local files (file: URLs).`
- Folder lines:
  - never trimmed: a line with leading or trailing whitespace is invalid, not trimmed;
  - blank lines and lines starting with `#` are ignored;
  - one trailing separator is allowed;
  - a root (`C:\`, `/`) and a relative line are invalid.

**Why:** fixed texts with no path, folder or count (#237). Not trimming fails closed; the options page (S3) can mark
invalid lines.

**Instead of:** trimming lines, as the block list does; a distinct message for a malformed `paths`.

**Revisit if:** users paste folders with stray spaces, or the user wants a separate malformed-`paths` text.

**By:** Claude (proposed; the texts are wire-level, for user review with #237)

### 2026-10-25 · S2: the matcher's added refusal classes
**Decided:** beyond 0.4 and #249:
- CTRL also covers DEL and C1 (U+007F–U+009F);
- PAD uses Unicode whitespace (NBSP included);
- BADCHAR refuses `<>"|?*` in a Windows path;
- DEVICE refuses `CON PRN AUX NUL COM0–9 LPT0–9`, `COM¹²³`/`LPT¹²³`, `CONIN$` and `CONOUT$`, by a segment's stem (up
  to its first `.`, trailing dots and spaces removed), in any segment;
- PREFIX also covers `//?/` and `//./`;
- a Windows path is matched only against Windows folders, and a POSIX path only against POSIX folders.

**Why:** each one is ambiguous to Win32 path handling; refusing them fails closed.

**Instead of:** passing such paths to Chrome.

**Revisit if:** a real file needs one of these names.

**By:** Claude (proposed)

### 2026-10-25 · S2: the `file:` rule's edges (#245 (a))
**Decided:**
- Order within `DOMAIN_BLOCKED`: own page > `file:` > block list. A blocked `file://host/` tab now gets
  `FILE_PAGE_MESSAGE`.
- `listTabs` rows and tab events of a `file:` tab are **not** hidden. #245 (a) names calls only.
- `downloadStart` to a `file:` URL is left to its handler's `BAD_PARAMS`, as before.
- A `blob:`/`view-source:`/`filesystem:` nesting deeper than the 4-level unwrap bound counts as `file:` (refused).
- `closeTab`/`focusTab` on a `file:` tab are refused too ("every tab call").

**Why:** the decision's text, applied literally; the stricter reading where it was silent.

**Instead of:** hiding `file:` rows as blocked rows are hidden (offered: stricter, and it changes `listTabs`);
allowing `closeTab`.

**Revisit if:** the user wants `file:` rows hidden, or `closeTab` allowed.

**By:** Claude (for user review with #245)

## 6. Findings

1. **Stage 0's "no existing test or row uses `file:`" (#245's Why) was wrong for the tests.** Two
   `extension/test/safety-gate.test.ts` cases asserted that `file:` URLs are allowed (lines 260 and 439 at
   `1fb16a1`); both were amended (§4 item 2).
   - Grepped the other tests and recipes: no other test relied on a `file:` URL reaching a handler.
     `handler-codes.test.ts:41` (`downloadStart file:` → the handler's `BAD_PARAMS`) is unaffected.
     `safety-match*.test.ts` test only the matcher. `recipes/test/s9-rules.test.ts` only classifies URLs.
   - `test-fixtures/`: no `file:` URL.
   - `docs/e2e-test-plan.md`: no row opens or acts on a `file:` page. Line 48 says fixtures are served over
     `http://localhost` to avoid the file-URL toggle, and R14-REL-3/R15-TEARDOWN mention `file:` only in their
     scan rules.
2. The extension's `tsconfig.json` includes only `src`, so extension tests are not type-checked by
   `npm run typecheck` (vitest only transpiles them). This is pre-existing; noted for the verifier.

## 7. Handoff

- No processes, ports or watchers left. All scratch files are in my scratchpad: mutant runs, before and after test
  logs, the build log.
- Next: the step agent rules §4 item 1. Then the class `upload` and its S2.2 rows, including "disarmed → no attach",
  which depends on S3's handler calling `call.effect()` before the attach.
- `journal.md` was modified before I started and is left uncommitted.
