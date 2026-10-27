# Step 12 S3b — builder report (console messages: SDK, formatter, MCP tool, Note A, the sentinel)

Model / effort: Opus, medium. Brief: the S3b leaf brief (builder). Layer followed: the brief and phase doc 0.5 / 0.10
with the Stage 0 note, decisions #323, #333, #334, #342, #344, and `S3a.md` §7 for the wire shape.

## 1. Verdict

**DONE.** Exit check C3.4 holds by the counts below. Note A's test is red on the pre-slice reducer, and its mutant is
recorded. All 14 new tests fail on the pre-slice code.

## 2. Outputs

**Files changed (tracked):**
- `extension/src/console-messages.ts`: Note A, the fail-closed fix. In `cutStack`, a cut part that ends in `…` pushes
  the private sentinel `SHORTENED`. `reduceConsole` drops any entry whose sources hold it.
- `extension/test/s12-console-reduce.test.ts`: one case, "Note A (#344 (3))".
- `sdk/src/tab.ts`: `Tab.consoleMessages(options: ConsoleMessagesParams = {}): Promise<ConsoleEntry[]>`. It runs the
  stale guard, then the shared `checkConsoleMessagesParams` (a refusal is `BAD_PARAMS` with no call). It sends
  `consoleMessages {level?, limit?, tab}` with absent keys dropped and returns `.entries`.
- `sdk/src/client.ts`: the cursor mirror `client.consoleMessages(options?)`.
- `sdk/src/index.ts`: the types `ConsoleEntry`, `ConsoleLevel` and `ConsoleMessagesParams` only. The values stay eight.
- `sdk/src/format/index.ts`: exports `formatConsole` and `NO_CONSOLE_MESSAGES` on the `@bridge/sdk/format` subpath.
- `mcp/src/tools/registry.ts`: `browser_console_messages {tab?, level?, limit?}`, registered last, as the 25th tool.
  `level` is `z.enum(CONSOLE_LEVELS)` and `limit` is an int from 1 to `CONSOLE_ENTRIES_MAX`. The tool calls
  `consoleMessages` through `onTab` and renders the result with `formatConsole`. Refusals go through the existing
  `withSafetyRefusals`.
- `mcp/test/s2-focus-first.test.ts`: the #214 written-out delta, the #342 form. `CONSOLE_PROPERTIES` and the tool's
  schema are written out as `browser_snapshot`'s `tab` plus `level` and `limit`. The count goes from 24 to 25, and
  the tool is filtered from the fixture comparison. After this slice only `browser_evaluate` (S2b) and the new tool
  differ from the baseline, beside Step 11's `browser_upload_file`, which was already written out. The fixture file
  is untouched.
- `mcp/test/safety.test.ts` and `mcp/test/tools.test.ts`: count and list amendments, dated: 24 → 25, the tab-touching
  list 19 → 20, and an `ARGS` row for the no-daemon sweep.
- `sdk/test/tab.test.ts`:
  - two `CASES` rows and one `MIRRORED` row;
  - a `consoleMessages` result in `RESULTS`;
  - `describe("Tab.consoleMessages (Step 12 S3b)")`, which holds the entries, the four `BAD_PARAMS` texts with 0
    frames, and C3.2 client side. In that test `JS_DISABLED`, `DISARMED {scope:"all"}` and `DOMAIN_BLOCKED` come back
    with the same code, message and data as `snapshot`, one frame each.
- `docs/setup.md`: one row in the Tools table, with its limits.

**Files added:**
- `sdk/src/format/console-messages.ts`: `formatConsole` and `NO_CONSOLE_MESSAGES`. The file is not named `console.ts`
  because `sdk/test/failure-report.test.ts` refuses the string `console.` in `sdk/src`.
- `sdk/test/s12-console-format.test.ts` (4 tests).
- `mcp/test/s12-console-cross.test.ts` (3 tests). It runs the real `WsHost` on port 0, the real SDK `connect()` and
  the tool, against a fake proto:2 extension:
  - **C3.4:** the extension receives `{tabId:101, level, limit}` with no `tab`. The SDK and the tool get the
    sentinel entries. The sentinel count in the daemon log plus every console line is **0**, and the daemon log is
    not empty.
  - **C3.2 client side:** each of the three refusals gives the tool's answer deep-equal to `browser_snapshot`'s: one
    `isError` line. The SDK rejects with the same code and message.
  - **The description test:** it pins "Refused while JavaScript is off for the bridge", "Messages of the page's
    frames are not read" and "No source URL and no stack".

**Counts, each from a command:**
- **25 tools:** `grep -c '^  reg.tool($' mcp/src/tools/registry.ts` → 25.
- **28 router methods:** `grep -oE 'router\.on\("[A-Za-z.]+"' extension/src/sw.ts | sort -u | wc -l` → 28.
- **Codes, method classes and the allowlist:** a tsx script that imports the modules gives `codes 27 on the wire 26`,
  `METHOD_CLASSES 28 consoleMessages: evaluate daemon tab method: true` and `log allowlist 54`.
- **Log sites +0:** `log-scan.test.ts` is green in the full run, and the new code has no log call
  (`grep -rn "console\." sdk/src` is empty).

**The pre-slice proof:** the six touched src files were swapped to their `HEAD` versions, `console-messages.ts` was
moved away, and the seven affected test files were run. 19 tests failed.
- The 14 new tests all failed.
- The other 5 failures are the count amendments.
- One new guard (eight values) passed at first, so a `typeof formatConsole` assertion was added to it. It now fails
  pre-slice as well.
- The files were restored, and `git diff --stat` was identical before and after.

**Note A's mutant:** I deleted `sources.includes(SHORTENED) ||` and ran `s12-console-reduce.test.ts`: 1 failed, 22
passed. Restored, it gives 23 passed.

**Tests:** `npm test` before was 4856 / 204 files, exit 0. After, it is **4877 / 207, exit 0**.
- Per-file diff: `s12-console-reduce` 22 → 23, `tab.test` 81 → 87, two new files (+3, +4). S3b's share is **+14**.
- The other lane's new `recipes/test/s12-helpers-b-fix2.test.ts` adds +7.
- No file lost a test.

**Checks:**
- per-package `npx tsc --noEmit -p` for shared, daemon, sdk, mcp and extension: exit 0;
- `npm run typecheck`: exit 0;
- `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all exit 0;
- `npm run build`: exit 0;
- `git status --short` was identical before and after the build.

**Size** (`git diff --numstat` plus `wc -l` for the new files):
- code 71 (registry 18, tab 16, the new formatter 21, `console-messages.ts` 7, client 4, index 3, format/index 2),
  against a 250 cap;
- tests 302 (cross 153, tab 56, format 43, s2-focus-first 20, reduce 15, tools 11, safety 4), against a 375 cap;
- docs 1.

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **The formatter is exported from `@bridge/sdk/format` only, not from `index.ts`.** The brief says both "keep the
  eight values unchanged" and "export it as the other formatters are". The other two formatters are values in
  `index.ts`, so exporting the new one there would make nine. I kept the eight, and a test pins it.
- **`docs/setup.md` got the row only, as the lane says.** Three sentences there are now stale; they are left for S8 or
  the session agent:
  - line 137, "call the 24 tools";
  - lines 642 and 906, "every other tool keeps working" while JavaScript is off, which `browser_console_messages` no
    longer does.

  `mcp/CLAUDE.md` ("the 24 MCP tools", twice) and the root `CLAUDE.md` counts are the session agent's.
- **No daemon test file.** The sentinel lives in the MCP cross test, as S2b's does. `daemon/src` is untouched.

## 5. Proposed decisions

### 2026-10-27 · S3b: the console formatter's line form, and where it is exported
**Decided:** `formatConsole(entries)` prints one line per entry, in the order given (oldest first):
`<ISO time, UTC> <level>[ uncaught] <text>`.
- A line break inside a text prints as `\n`.
- A non-finite `ts` prints `-`.
- An empty list prints `No console messages.`.
- There is no header and no cap on the whole text: the reply is already bounded at 200 × 2000 characters.

The formatter is exported on the `@bridge/sdk/format` subpath only. `ConsoleEntry`, `ConsoleLevel` and
`ConsoleMessagesParams` become types of the main surface. The tool is registered last.
**Why:** one entry per line is the brief's own form. UTC keeps the output deterministic. The eight values are pinned
(#75, #240).
**Instead of:** local time; a 20 000-character cap like `formatNetwork`'s; a ninth value.
**Revisit if:** a live row shows the full 200-entry answer is too large for the MCP client (then cap it like the
network text), or the user wants `formatConsole` on the main surface.
**By:** Claude (proposed; contract-level for the SDK surface and the MCP schema, for user review)

### 2026-10-27 · S3b: Note A also covers a shortened description, not only a preview value
**Decided:** the `…` check is in `cutStack`, so it applies to every cut part, descriptions included.
**Why:** it only drops more, and it costs one line. **Instead of:** checking preview values alone. **Revisit if:** the
live row shows real descriptions ending in `…` being dropped. **By:** Claude (proposed, safety)

## 6. Findings

- No pre-registered check failed.
- Measured while building: `sdk/test/failure-report.test.ts` (S4.3) fails any `sdk/src` file whose text contains
  `console.`, a module path such as `./console.js` included (1 failure, fixed by the rename). This is worth a bullet
  in `sdk/CLAUDE.md`.
- No Chrome was run.

## 7. Handoff

- No processes or ports are left. Scratch files are in the session scratchpad only. The S1-helpers lane's
  uncommitted `recipes/` work was not touched.
- **The §4.27 live rows S3b adds** (glue only; the pure parts are tested):
  1. **CON-MCP:** `browser_console_messages` on a fixture page that logged before the call. It answers one line per
     entry in the formatter's form, the replayed lines included, with the banner during the call.
  2. **CON-JSOFF:** JavaScript unticked. The tool answers the `JS_DISABLED` line, identical to `browser_evaluate`'s;
     `browser_snapshot` still works.
  3. **CON-REFUSE:** disarmed, a blocked fixture host, and the extension's own page. Each answers what
     `browser_snapshot` answers there.
  4. **CON-NOTEA:** a page script on a blocked fixture host logs `{e: err}` from inside an allowed page. The entry is
     absent, and the nested message never appears. This is S3a's carried Note A row, and the fix now makes absence
     the expected answer.
  5. **CON-LOGS:** a sentinel logged by the fixture is counted 0 in `daemon.log` and the worker console.
- **S3a's ten rows plus verifier 1's two** stay as `S3a.md` §7 lists them.
- **Files for the committer:** the 12 tracked files and 3 new files in §2, and this report.
