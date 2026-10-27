# Step 12 S3b — verifier report (console messages: SDK, formatter, MCP tool, Note A, the sentinel)

Model / effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6). Tree: HEAD `e835eb5` plus S3b's uncommitted
files (the other lane's `recipes/` and `S1-helpers-b*` files were ignored). Evidence: `S3b-verifier-evidence.txt`
(same folder), cited below as E§n. Layer followed: the phase doc (0.5, 0.10, § S3, C3.1–C3.4, § Every stage, the Stage 0
note), then decisions #323, #333, #334, #342, #344.

## 1. Verdict

**PASS-with-notes.** Every exit check passes by my own commands. There are four MINOR findings and three NITs, and no
CRITICAL or MAJOR.

## 2. Outputs (each from my own command)

- **Tests:** `npm test` (main tree) gives 207 files and 4877 passed, exit 0 (E§1).
  - S3b's own test files, HEAD → now, by vitest JSON in a scratch worktree (E§2):
    - `s12-console-reduce` 22 → 23;
    - `tab.test` 81 → 87;
    - two new files, +3 and +4;
    - `s2-focus-first`, `safety` and `tools` keep their counts.
  - That is **+14**, with none removed. Three tests were renamed: their titles changed from "24" to "25".
  - HEAD with only committed tests gives 4824 in 202 files (E§1). The rest of the gap to 4877 is the other lane's
    uncommitted `recipes/test` files.
- **Pre-slice proof** (E§3): S3b's 7 test files were run on HEAD's source in a worktree (`npm ci`, no junction).
  - 20 tests fail there and 284 pass.
  - The 20 are all 14 new tests plus 6 count and list amendments. **Note A's test is red** on the pre-slice reducer.
  - Every one of the 304 passes on the slice.
- **C3.4 counts** (E§4):
  - tools: `grep -c '^  reg.tool($'` gives **25**;
  - router methods: the unique `router.on("…")` names in `sw.ts` give **28**;
  - codes: a tsx import gives **27**, and the `codes.ts` header says 26 of them are on the wire plus `NO_CURSOR`;
    `git diff HEAD -- shared daemon extension/src/safety.ts` is empty;
  - `METHOD_CLASSES` has 28 entries with `consoleMessages: evaluate`, and the daemon's tab method is true;
  - `LOG_ALLOWLIST` is **54**, and `log-scan` is green in the full run, so log sites are **+0**. `sdk/src` has no
    `console.`.
- **The sentinel:** the cross test counts it at 0 in the `WsHost` log, which is `daemon.log`'s writer
  (`daemon/src/main.ts:164`).
  - The test is discriminating. Mutant M1 makes the daemon log every frame, and the test goes red (E§7).
- **MCP schema** (E§5): I captured a live `tools/list` (`npx tsx mcp/test/tool-schemas.ts`) and compared it with the
  #214 fixture:
  - `browser_evaluate` **differs** (S2b's delta);
  - **new:** `browser_console_messages` and the existing Step 11 `browser_upload_file`;
  - nothing else differs, and nothing is gone.
- **Checks** (E§6): `npm run typecheck` and all seven `recipes/tsconfig*.json` exit 0, and `npm run build` exits 0.
  `git status --short` is byte-identical before and after the build.
- **Mutants** (E§7, run in the worktree, each restored): 11 of 11 are red. They cover:
  - Note A removed, and its `trimEnd` removed;
  - the SDK guard skipped, and a `level` default sent;
  - the formatter: raw newlines, local time;
  - the tool: limit max 1000, `level` dropped, the JS sentence removed from the description;
  - `formatConsole` on the main surface;
  - the daemon logging frames.
- **Size** (E§9): code 71 against the 250 cap, tests 302 against 375, docs 1. This matches the builder.
- **Client side of C3.2:** in `tab.test.ts` and the cross test, `JS_DISABLED`, `DISARMED {scope:"all"}` and
  `DOMAIN_BLOCKED` give the same code, message and data as `snapshot`. In the MCP the two tools' results are
  deep-equal, one `isError` line through `withSafetyRefusals` (read: `mcp/src/tools/registry.ts:169`).
- **Cleanup** (E§12): the worktree was removed. Its three `@bridge` junctions pointed inside the worktree and were
  removed with `rmdir` first. The tracked status of the main tree is unchanged since my start.

## 3. Verifier verdict

PASS-with-notes (this file).

## 4. Deviations

None from the brief. The builder's "absent keys dropped" claim holds through `#send`'s `defined(...)`
(`sdk/src/tab.ts:159`), and the frame test pins it.

## 5. Proposed decisions

### 2026-10-27 · S3b verifier: Note A's rule covers any shortened Error-like preview value, not only a cut stack
**Decided:** a non-string preview property value that ends in `…` counts as an unknown source, whether or not a stack
line survived the shortening. **Why:** F1. **Instead of:** the literal "cut part ending in `…`".
**Revisit if:** the live CON-NOTEA row shows V8 never shortens an Error preview before its stack.
**By:** Claude (proposed, safety; the conservative option)

## 6. Findings

**F1 — MINOR (safety, attacks #344 (3) as written): Note A's fix misses a preview value that V8 shortened before or
inside the first stack line.** `extension/src/console-messages.ts:140-146`
- `cutStack` sets `SHORTENED` only when `STACK_LINE` (`/\n\s*at\s/`) matches.
- V8 shortens an object-valued preview property to 100 characters, ending in `…`. This is my reading of V8's
  `abbreviateString` (kEnd) in `value-mirror.cc`, not measured.
- So a nested Error with a message of 93 characters or more, or one cut inside `at`, keeps no stack. Its source is
  unknown, and the entry is **kept**, with the nested message in the text.
- Evidence E§8 (`npx tsx` probe of the working tree's `reduceConsole`):
  - `dropped`: the cut is inside the stack (Note A as written);
  - `KEPT`: the cut is inside the message — `"Object {e: Error: SECRET-xxx…"`;
  - `KEPT`: the cut is inside `at` — `"…\n    at…"`.
- This is the same leak class as S3a verifier 2's Note A, so it is MINOR by that rating. It is not MAJOR because the
  class is `evaluate` (#334): the same agent may read the page anyway, and no URL leaks.
- **Fix** (a few lines): in `previewText`, push `SHORTENED` when `q.type !== "string"` and the value ends in `…`.
  Add two cases to the Note A test: the cut inside the message, and the cut inside `at`.
- String values are shortened in the middle (kMiddle) and carry no source, so they stay as they are.

**F2 — MINOR (docs, in S3b's lane): `docs/setup.md` is now false in five places** (E§10). The phase doc gives S3b
`docs/setup.md`, and agent-rules §4 says whoever changes behaviour amends the governing doc in place.
- Line 137 still says "call the 24 tools".
- Lines 643, 910, 913 and 1176 say that while JavaScript is off "every other tool keeps working / still works /
  keeping every other tool". `browser_console_messages` is refused then.
- The builder named three of these and deferred them. The deferral is wrong for the lane, but the error is harmless,
  since the doc understates the refusal. **Fix:** five one-line edits.
- `mcp/CLAUDE.md` ("24 MCP tools", lines 9 and 52) and the root `CLAUDE.md` belong to the session agent, as the
  builder says. They are not S3b findings.

**F3 — MINOR (contract text, for the session agent and the user with #334):** a refused `browser_console_messages`
answers the shared JavaScript-off line.
- That line is "…so evaluate (browser_evaluate) is refused; every other call still works…" (`sdk/src/error.ts:123`).
- The SDK's `err.message` says "Every other tool still works" (`extension/src/safety.ts:203`).
- So the refused tool tells the agent that every other call works. The brief asks for exactly this line ("`JS_DISABLED`
  reaches the tool's caller as its line"), and the tool's description does say it is refused while JavaScript is
  off.
- Changing either text is a contract change (spec §10). Do not fix it in S3b. Record it for the gate:
  - if the user rules class `tab`, it disappears;
  - else both texts need a dated spec note.

**F4 — MINOR (design attack on the builder's §5 formatter decision): the reply is not capped.**
- At the default `limit` of 200, the text can reach about 200 × 2 000 characters (≈ 400 KB) in one MCP result.
  `formatNetwork` caps at 20 000.
- Claude Code limits MCP tool output: by default about 25 000 tokens (`MAX_MCP_OUTPUT_TOKENS`). This is from my
  knowledge, not verified this session.
- So a busy page's default answer may be cut off or refused by the client.
- The builder's Revisit-if names exactly this. The user can rule on it at the gate, or the live row CON-MCP can
  measure a large page.
- The line form itself is sound: UTC ISO time, `\n` escaping, `-` for a non-finite time, oldest first. Each part is
  pinned by mutants M6 and M7.

**N1 — NIT:** the description and the setup row say entries "logged before the bridge was last switched on" are left
out. By S3a's floor rule (`S3a-builder.md` §5), entries logged before the worker's last start are left out too.
Suggest "…switched on, or before the extension's worker last restarted".

**N2 — NIT:** the phase doc 0.10 places the console sentinel in `log-sentinel.test.ts`. S3b puts it in
`mcp/test/s12-console-cross.test.ts`, as S2b did with `args`, so `extension/test` stays outside the lane. It covers
`daemon.log`, which is what C3.4 asks for. Record the location in the as-built.

**N3 — NIT:** the §4.27 placeholder rows are in the builder's §7, not in `docs/e2e-test-plan.md`. S2b did the same
(`S2b.md:81`), and the lane does not include the e2e plan. S7 must carry them.

**Judged as asked:**
- **The formatter export (subpath only):** correct. `sdk/CLAUDE.md` pins exactly eight values. The other formatters
  are on `index.ts` from before that pin, and a ninth value would break #240 / #75. The format test pins the eight
  values, and mutant M11 is red. `sdk/CLAUDE.md`'s line "exported … and from `index.ts`" should name
  `formatConsole` as subpath-only, which is the session agent's edit.
- **The tool description:** truthful. It says refused while JavaScript is off, frames are not read, no URL or stack,
  the 2 000 cap, the banner and the `snapshot`-refused pages. Its only omission is N1's.
- **Security boundary:** no new log site. The tool passes no URL or stack. Only `withSafetyRefusals` maps the refusals,
  so a refusal reveals only the fixed line. The token and the bind are untouched.
- **Runtime fact:** the builder's finding that `sdk/test/failure-report.test.ts` refuses any `console.` string in
  `sdk/src` is consistent with the rename. I did not re-measure it.

## 7. Handoff

- No processes or ports are left, and port 9234 was never touched. The scratch worktree is removed. Scratch outputs
  are in `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\3933cbe1-90a7-4fc5-83a1-3e97601ffc62\scratchpad\s3bv`.
- **For the step agent:** the verdict allows the committer.
  - F1 and F2 are cheap fixes in S3b's lane, worth one fix round (a fresh verifier re-checks F1 and F2 only).
  - F3 and F4 go to the session agent as gate items with #334 and the builder's §5.
- **The builder's §7 live rows stand.** CON-NOTEA should add a long-message case to check F1's shape against real V8.
