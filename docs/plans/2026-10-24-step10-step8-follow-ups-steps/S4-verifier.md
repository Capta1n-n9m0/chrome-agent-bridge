# Step 10 S4 — verifier report: `browser_evaluate {saveTo}`

Independent verifier, 2026-10-25, Opus 5.5 (claude-opus-5-5). Base `f4c0ff2`. I did not commit or edit anything in the
main tree except this file. No live work: no Chrome, no reload, no daemon on 9234. Every socket was on port 0.

**Set-up.** I made a scratch worktree with `git worktree add %LOCALAPPDATA%\Temp\s4v f4c0ff2` and copied the builder's
17 modified files and 13 untracked files into it. I installed `node_modules` with **`npm ci`**, not a junction:
the main tree's `node_modules/@bridge/*` links point at the main tree's packages, so a junction would have let a
mutant leak across. Every mutant and the throwaway harness ran only in that worktree. The worktree is removed at the
end (§8).

## 1. Counts and the three commands (task 1)

| | `f4c0ff2` (re-derived: the worktree with the builder's files removed) | With S4 |
|---|---|---|
| `npx vitest run` | **2989 passed, 122 files** | **3126 passed, 130 files** (+137 tests, +8 files; none removed) |
| `npm run typecheck` | — | exit 0 |
| `npm run build` | — | exit 0 |

- After the build, `git status --short` lists the same 17 tracked modifications as before (the builder's). The build
  changed no tracked file.
- `recipes/tsconfig.s6.json` fails at the base exactly as with S4 (`extension/src/tabs.ts(308,9): error TS2304:
  Cannot find name 'chrome'`). So the builder's flag is right: this failure is **pre-existing** and not caused by S4.

### Edited test files: diffed for removed tests and weakened assertions

`git diff f4c0ff2 -- <file>`:

- **No `it`/`test` was removed** from any edited file, and no `expect` was deleted. The changed lines are counts
  (23 → 26), the expected `TAB_METHODS` lists, four retitled `it`s, and the schema test's per-tool loop.
- **`extension/test/safety-gate.test.ts`:**
  - The oracle changed from `method === "evaluate"` to `cls === "evaluate"`.
  - The "other tools keep working" loop now excludes `methodClass(m) !== "evaluate"`.
  - At `f4c0ff2`, `git show f4c0ff2:extension/src/safety.ts | grep '"evaluate"'` shows that `evaluate` was the only
    member of the class (line 69). For the 23 existing methods, both changes are therefore exactly equivalent. The
    three new methods are held to the stricter rule (refused while JavaScript is off), and S1.2's generated matrix
    covers them. **Not weakened.**
- **`daemon/test/safety-surface.test.ts`:** `toEqual([...STEP8.TAB_METHODS, ...STEP10_S4_TAB_METHODS])` is still exact
  element-for-element equality. The other three tables are unchanged.
- **`daemon/test/methods.test.ts`, `gated-router.test.ts`, `sw-static.test.ts`:** only additions or counts.
- **`log-sentinel.test.ts`:** additions only. `git diff | grep '^-'` shows only the `---` header.
- **`mcp/test/s2-focus-first.test.ts`:**
  - 22 tools still `toEqual` the fixture.
  - `browser_evaluate` must equal the fixture entry plus exactly the two literal properties.
  - `git diff --quiet f4c0ff2 -- mcp/test/fixtures` reports the fixture unchanged.

### The new tests fail against `f4c0ff2`'s production files

I put back only the 16 test files (new and edited) on the base production code:

```
Test Files  15 failed (15)
     Tests  22 failed | 429 passed (451)
```

The 5 new extension/sdk files fail at import. The other 22 failures are listed per test in my run. They include every
S4.1, S4.4 and S4.5 test, the method-table tests and the schema re-baseline.

## 2. Exit checks run myself (tasks 2, 5, 6)

I wrote my own harness, `mcp/test/zz-verifier-s4.test.ts`, in the worktree only, and it was never committed. Unlike
the builder's cross test, its fake proto:2 extension does not imitate the store. It serves every
`evaluateSave*`/`evaluate` frame through the **real** pieces:

- the real `GatedRouter` and `CallSafety`, with a mutable safety view;
- the **real** handlers (`handlers/evaluate-save.ts`, `handlers/evaluate.ts`), with `chrome` stubbed;
- my own fake CDP, which runs the shipped page-source strings on real JS values. Objects get ids; primitives come
  back by value.

Around it are the real `WsHost` on port 0, a real file logger plus an injected logger, the SDK's `connect()`, and the
MCP's `BridgeLink`, `TabCursor` and `registerTools`. Result: `Tests 10 passed (10)`.

| Row | What | Result |
|---|---|---|
| V1 (S4.1) | 1 000 000 crypto-random code points (ASCII, BMP and astral) = 1 043 125 units, 1 216 228 bytes. Saved via the MCP (cursor), `Tab.evaluateToFile` and `BridgeClient.evaluateToFile` | 3 files, each sha256 = sha256(TextEncoder(value)). MCP answer `Saved …\n1216228 bytes · string · sha256 …`, **157 chars ≤ min(300, 54+120) = 174**. No 16-char run of the value in the answer, the SDK returns, the daemon log file, the injected log lines or the console. The path appears in no log line. Every frame the extension received: no `saveTo`, no directory, no `tab` key (only `tabId`) |
| V2 (frame growth) | Largest frame the fake extension sent, for a 1 MiB, an 8 MiB and an 8 MiB **primitive** value | 1 398 135 / 1 398 136 / 1 398 136 B: does **not** grow. Largest CDP reply: 1 048 615 / 1 048 615 / **8 388 647** (the primitive arrives whole, §4) |
| V3 (V8 lost store) | Store emptied after the 1st pull | `INTERNAL Unknown or expired evaluateSave id: es5-…`; no file, no `.part`; the message has no value text |
| V4 | Mid-pull disarm through the MCP | `isError`, one line `DISARMED: the user has turned the bridge off in Chrome. …`; no file, no `.part` |
| V5 | Another client pulls a held tab's id | `TAB_HELD tab T2 is held by "A" …` |
| V5 | A pull naming the holder's other tab | `INTERNAL Unknown or expired evaluateSave id`; an end naming the other tab → `{released:false}` |
| V5 | A pull with no `tab` through the daemon | `BAD_PARAMS tab is required` |
| V5 | The handler with no `tabId` | `BAD_PARAMS evaluateSaveChunk requires tabId` |
| V6 (S4.3) | JavaScript off | start, chunk and end each give `[code, message, data]` **equal** to `evaluate`'s (`DISARMED {"scope":"evaluate"}`) |
| V6 (S4.3) | Disarmed; a blocked tab | disarmed → `DISARMED {scope:"all"}`; the blocked tab → `DOMAIN_BLOCKED` on all three |
| V7 | Eviction across clients | finding 1 |
| V8 (task 6) | Refusal texts: a cycle, a BigInt key, a throwing getter, a throwing `toJSON`, all keyed or messaged with `SECRET_…` | All four → `PAGE_ERROR [chrome.debugger] JSON.stringify threw on the value in the page (…) — nothing was saved`, with no `SECRET_`. The prefix is the existing `describeDebuggerError` path, the same as `evaluate`'s |
| V8 (task 6) | undefined, a Map, a function, a primitive BigInt | undefined, Map and function → `BAD_PARAMS` with a fixed text; primitive BigInt → `PAGE_ERROR`; no `.part` |
| V9 (S4.2, task 5) | File rules against a temp dir | listed below the table |
| V10 | A surrogate pair across the 1 MiB-unit CDP slice boundary, plus a lone surrogate | sha256 = TextEncoder hash (1 048 593 bytes) |

V9 results (task 5):

- An existing file without `overwrite` is refused `BAD_PARAMS` and its content is unchanged.
- An existing file with `overwrite:true` is replaced, so Windows rename-over-existing works.
- An existing directory with `overwrite:true` is refused `BAD_PARAMS`.
- A missing parent is refused `BAD_PARAMS`, and `nope/` is not created.
- `rel/f.txt` is refused `BAD_PARAMS`.
- An existing `g.txt.part` is refused `BAD_PARAMS`; its content (`SOMEONE`) is untouched and `g.txt` is absent.
- Only 1 `evaluateSaveStart` reached the extension, the overwrite case: every refusal happens before any wire call.

Other checks:

- **S4.4:** `registry.ts` carries `Paging bulk data through browser_evaluate in chunks is a test device only, never a
  supported pattern: pass saveTo to write a large value to a file instead.` verbatim (and the builder's test asserts it).
- **S4.5:**
  - The allowlist is still 54 entries (`grep -c '{ file: "'`), and S4 adds no log site.
  - The sentinel tests are green.
  - Mutant M9 below (log the path in the SDK) turns `log-scan` and `log-sentinel` red.
- **Task 6, `browser_evaluate` without `saveTo`:**
  - The handler body is the old one, moved behind `if (saveTo !== undefined) {…} return onTab(…)`, and all existing
    evaluate tests pass.
  - The description changed, as 0.4 orders.
- **Schema check:** my own capture through `mcp/test/tool-schemas.ts`:
  ```
  tools 23 byte-identical 22 different browser_evaluate
  eval minus 2 == fixture: true required: ["expression"]
  ```
- **A failure report on a `saveTo` failure:** `onTab` attaches one for attach-set codes (`PAGE_ERROR`, `TIMEOUT`). The
  error message carries either a fixed text or the page's own exception, as `evaluate`'s does. The value is never in
  a message, because the holder is never read out on a failure path. A report's snapshot shows only what the page
  renders, as for every other tool.

## 3. Mutants (task 7)

I wrote a mutation runner (in the scratchpad, `mutate.cjs`). It applies one string change to a production file in the
worktree, runs the 17 S4-related test files and restores the file. **25 mutants, 25 killed:**

```
M1  drop evaluateSaveChunk class            → 11 failed (gated-router, s4-save-gate …)
M2  reclassify evaluateSaveChunk as "state" → 5 failed (s4-save-gate)
M3  drop clearEvaluateSaves at disarm (sw)  → 1 failed (s4-save-gate static wiring)
M4  drop JS-off clear (sw)                  → 1 failed
M5  drop tab-close drop (sw)                → 1 failed
M6  .part opened "w"                        → 1 failed (s4-evaluate-to-file)
M7  skip .part removal                      → 9 failed
M8  20-char preview of the value in the MCP answer → 2 failed (s4-save-cross, s4-save-tool)
M9  console.log the path in the SDK         → 6 failed (log-scan, log-sentinel, s4-save-cross)
M10 handler accepts a tab-less pull         → 1 failed (s4-save-handler)
M11 slices up to 2 MiB                      → 6 failed
M12 store ignores the tab                   → 2 failed
M13 daemon: evaluateSaveChunk not a tab method → 3 failed
M14 surrogate guard removed                 → 1 failed (s4-save-page)
M15 Map not refused                         → 1 failed
M16 stringify refusal echoes e.message      → 2 failed
M17 primitive size cap removed              → 1 failed
M18 start not released on a post-check refusal → 1 failed
M19 no gate guard before the debugger attach → 1 failed
M20 asRef+saveTo allowed                    → 1 failed
M21 overwrite ignored                       → 2 failed
M22 relative path allowed                   → 3 failed
M23 evaluateSaveEnd never sent              → 10 failed
M24 TTL never expires                       → 1 failed
M25 eviction off                            → 2 failed
```

Every new test file has at least one mutant that turns it red:

| Test file | Killing mutants |
|---|---|
| `s4-save-store` | M11, M24, M25 |
| `s4-save-page` | M14–M17 |
| `s4-save-handler` | M10, M18, M19 |
| `s4-save-gate` | M1–M5 |
| `s4-save-methods` | M13 |
| `s4-evaluate-to-file` | M6, M21, M22 |
| `s4-save-tool` | M8, M20 |
| `s4-save-cross` | M7, M8, M23 |

M3–M5 (the `sw.ts` glue) are caught only by static regexes, which is consistent with CLAUDE.md's rule that the
`chrome.*` glue is not unit-tested.

## 4. My independent view on the F2 SPEC-DISCREPANCY (primitive completion values)

- **Can CDP return a primitive by `objectId`? No.**
  - In the protocol, `Runtime.RemoteObject.objectId` exists for non-primitive values only.
  - `Runtime.evaluate` with `returnByValue:false` returns a string, number, boolean or null inline, in `value`.
  - My harness's fake CDP models this, and V2 shows the effect: for an 8 MiB primitive, one CDP reply of 8 388 647
    chars.
  - The builder's claim is right.
- **Option (c), `serializationOptions:{serialization:"idOnly"}`, is probably not a fix.** From my own knowledge of the
  CDP docs (unverified here: no Chrome and no docs fetch), `idOnly` is described as the same behaviour as giving no
  `serializationOptions`, `generatePreview` or `returnByValue`. So a primitive would still come back by value. SAVE-IDONLY
  is still worth running as a probe, but I would not plan on it.
- **No semantics-preserving fix inside CDP that I know of.**
  - `objectGroup:"console"` makes V8 keep the completion value as the console's last result (`$_`), but the
    evaluate reply still carries the primitive whole.
  - Any wrapper that turns the completion into an object (the builder's (b)) loses `replMode` semantics: top-level
    `let`/`const` re-declaration, the scope, and possibly CSP. That is not semantics-preserving.
  - The real choices are (a) accept and record, or (d) a new size refusal. Both are contract-level, for the user.
- **Does the built primitive path keep every runtime message and WS frame bounded? Yes, for everything after the
  CDP reply.**
  - V2: the largest frame the extension sent for the 8 MiB primitive was 1 398 136 B, the same as for 1 MiB.
  - The `runtime.sendMessage` relay carries the same reply JSON.
  - So Stage 0's measured failure, the 1009 close above 100 MiB, cannot happen through `saveTo`.
  - Only the `chrome.debugger.sendCommand` reply (browser → worker) is whole. That is exactly what plain `evaluate`
    already does today for the same expression, so `saveTo` adds no new failure mode on that leg.
- **My view.** It is a real deviation from the F2 amendment's words ("never one CDP reply of the whole value"), and it
  is **reported, not silent**. (a) is the conservative choice under the protocol: no new refusal, and every existing
  tool unchanged. I agree with recording it for the user with live rows SAVE-PRIM and SAVE-IDONLY. One addition: the
  tool description and the SDK docs could say "use `return …` for a large value"; that guidance is not in the
  built description. Severity MINOR (finding 3).

## 5. Safety and invariants (tasks 4, 8, 9)

- **`METHOD_CLASSES`:** the only `^[-+]` entry lines in `git diff f4c0ff2 -- extension/src/safety.ts` are the three
  new `"evaluate"` entries. No existing class changed.
- **The daemon's tables:** `TAB_METHODS` gains three names, and `takesLock` is unchanged (`s4-save-methods`).
- **Registration:** every `router.on` uses a string literal (`sw-static` 26/26, S1.1's scan 26).
- **Where the gate runs:**
  - at receipt, for every call;
  - before the start's debugger attach (`guard` passed to `withDebugger`; mutant M19);
  - as the post-check (refusal → `onRefused` release; mutant M18).
- **When the store is dropped:** in `onDisarm`, in the existing `storage.onChanged` safety branch after
  `applyChanges`, and in the existing top-level `tabs.onRemoved` and `tabs.onReplaced` listeners.
- **`sw.ts` glue:** no new listener and no top-level `await`. The only new imports are handler and store values.
  `safety-writers.test.ts` and `log-scan` are green.
- **The path:** the extension never receives it (V1 frame scan).
- **CLAUDE.md invariants:**
  - `extension/dist/content.js` has 0 `import`/`export` matches.
  - `ws` is `external` in `daemon/build.mjs:11` and `mcp/build.mjs:11`.
  - The page functions are literal strings, closure-free.
  - `unwrapResult`, `toSerializableArgs` and `{__bridgeError}` are untouched.
  - Frames stay ~1.4 MB, far under the 100 MiB `maxPayload`.
- **SDK surface:**
  - `Object.keys(await import("@bridge/sdk"))` gives `BridgeClient, BridgeError, ErrorCodes, Tab, connect,
    downloadToFile, formatNetwork, formatSnapshot` (8).
  - `s3-signatures` is green.
  - The two new types are exported, and `BridgeClient.evaluateToFile` mirrors `Tab` (F21).

## 6. Findings

1. **MINOR — one client can evict another client's save in progress.**
   - **Where:** `extension/src/evaluate-save-store.ts:76-78`.
   - **What:** the store is shared by every tab. Its 8-entry and 256 MiB caps evict the oldest entry, whoever owns it.
   - **Evidence:** V7. Client A's 3 MiB save was paused at its 2nd pull while client B ran 8 `evaluateSaveStart`s on
     its own tab. A got `INTERNAL Unknown or expired evaluateSave id: es11-…`. The failure is clean: no `.part`, end
     sent.
   - **Why it matters:** an availability interference between actors that leases otherwise isolate. It is not a
     safety breach.
   - **Fix (contract-level, for the user):** one of these:
     - evict only entries idle longer than N s;
     - keep a per-tab or per-entry quota;
     - refuse a new start ("busy") instead of evicting an entry being pulled.

   At least, record the behaviour in the proposed decision #3, which today says "as `DownloadStore` evicts by count".
2. **MINOR — a plain JSON object is refused as a "DOM node".**
   - **Where:** `extension/src/evaluate/save.ts:54-56`.
   - **What:** the node check is duck-typed (`typeof v.nodeType === "number" && typeof v.nodeName === "string"`), so
     plain JSON data with those two keys is refused.
   - **Evidence:** V8 `nodeLike-plain-json`. `{nodeType:1, nodeName:"row", data:"ok"}` gave `BAD_PARAMS … The value
     is a DOM node, which is not saveable`.
   - **Why it matters:** F12 asks that Nodes be refused, not data that looks like one. The deviation is stricter, so
     not a safety issue.
   - **Fix:** test with `typeof Node === "function" && v instanceof Node`, plus a cross-realm fallback such as
     `Object.prototype.toString` tags ending in `Element]`, `Document]`, `Text]`, … . Or record it as a known limit.
3. **MINOR (spec; already escalated by the builder) — the primitive completion value crosses the CDP leg whole.**
   - **Where:** `extension/src/evaluate/save.ts:181`, `primitiveSaveText`.
   - **Evidence:** §4 and V2 (one CDP reply of 8 388 647 chars for an 8 MiB primitive; WS frames still ~1.4 MB).
   - **What it deviates from:** F2's amended text. It is reported under the SPEC-DISCREPANCY protocol, not hidden.
   - **Fix:** a user ruling between (a) and (d), plus the SAVE-PRIM/SAVE-IDONLY rows. Optionally add "use `return …`
     for large values" to the description and the SDK docs.
4. **NIT — a held entry can outlive its usefulness by up to 5 minutes.**
   - **Where:** `extension/src/safety.ts:83` (the `evaluateSaveEnd: "evaluate"` entry) and
     `extension/src/handlers/evaluate-save.ts:229`.
   - **What:** a tab that becomes blocked mid-save gets its `evaluateSaveEnd` refused `DOMAIN_BLOCKED` (by design: the
     class is `evaluate`), so its bytes (≤ 256 MiB) stay held until the TTL. When JavaScript is off or the bridge is
     disarmed, the store is dropped anyway.
   - **Fix (no reclassification, which would be a forbidden fix):** drop the tab's entries when the gate refuses a
     pull or end with `DOMAIN_BLOCKED`. Or accept the TTL and record it.
5. **NIT — a file created at the target during the save is replaced, even with `overwrite: false`.**
   - **Where:** `sdk/src/evaluate-save.ts:131`.
   - **What:** a time-of-check/time-of-use gap. A file created at the target after `checkSaveTarget` and before
     `rename` is silently replaced, because `fs.rename` replaces on both Windows and POSIX.
   - **Fix:** with `overwrite` false, `link(part, target)` (fails `EEXIST`) then `unlink(part)`, or re-check right
     before the rename.
6. **NIT — "no caps" in the description is not true.**
   - **Where:** `mcp/src/tools/registry.ts:760`.
   - **What:** the builder's added sentence says "anything else as JSON, no caps", but a 256 MiB cap applies.
   - **Fix:** "without the result caps (up to 256 MiB)".
7. **NIT — the SDK's `download` subpath grew.**
   - **Where:** `sdk/src/download.ts:12-15`.
   - **What:** the public `@bridge/sdk/download` subpath (`sdk/package.json` `exports`) now also exports
     `saveEvaluateToFile` and `checkSaveTarget`. The main entry stays at eight values, but the package's exported
     surface grew on a subpath.
   - **Status:** proposed decision #5 records it. Make sure the user sees it as a surface addition.
8. **NIT — `overwrite` without `saveTo` is silently ignored.**
   - **Where:** `mcp/src/tools/registry.ts:786`.
   - **Fix:** none needed, or a `BAD_PARAMS`. Note it only.

No CRITICAL or MAJOR finding. No exit check fails:

- S4.1: the builder's test and my V1.
- S4.2: the builder's tests and my V9, V8, and the asRef mutant M20.
- S4.3: the builder's tests and my V6.
- S4.4: the sentence is in the code verbatim.
- S4.5: the sentinel tests, plus mutant M9.

No STOP rule is met. No value, expression, path or token appeared in any log line I captured.

## 7. Verdict

**PASS-with-notes.** There are three MINOR findings (cross-client eviction, the duck-typed node refusal, and the
already-escalated F2 primitive path) and five NITs. Counts: 2989 → 3126 tests, 122 → 130 files. typecheck, test and
build all exit 0. The build left no tracked change.

## 8. Clean-up

The scratch worktree (`%LOCALAPPDATA%\Temp\s4v`) and its harness files (`mcp/test/zz-verifier-s4.test.ts`,
`zz-schema-v.mts`, `zz-sdk-v.mts`) were removed: `git worktree remove --force` left `node_modules` behind (Directory not empty), so it was deleted with `rmdir /s /q`, then `git worktree prune`; `git worktree list` shows only the main tree. The
mutation runner and its output stay in the session scratchpad (`mutate.cjs`, `mutants.txt`), outside the repo.

## Re-check, round 1

This round audits `S4-fixer1.md`, 2026-10-25. The rules were the same as before:

- a scratch worktree `%LOCALAPPDATA%\Temp\s4v2` from `f4c0ff2`, with the current uncommitted main-tree files copied in;
- `node_modules` by **`npm ci`** (no junction);
- nothing in the main tree edited except this section;
- the worktree removed at the end (`git worktree remove --force`, then `rmdir /s /q` for what it left, then
  `git worktree prune`; `git worktree list` shows only the main tree).

### (a) Counts

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx vitest run` | **3142 passed, 130 files** (3126 → 3142: +16, no file added, none removed) |
| `npm run build` | exit 0 |
| `git status --short` after the build | the same 17 tracked modifications, none from the build |

The fixer's count claim holds.

### (b) Finding 2: the node refusal

I wrote my own throwaway jsdom test. It runs the shipped `SAVE_PREPARE_SRC` (string, still `async function (awaitIt)
{ "use strict"; … }`, no closure) through `collectSaveText` over 20 values:

```
plain nodeType/nodeName => saved:json        array of node-like rows => saved:json
null-proto object => saved:json              class instance named Node2 => saved:json
own toStringTag Node => saved:json           Date => saved:json
Proxy throwing getPrototypeOf => saved:json
Element / SVG element / Text / Comment / Attr / Document / DocumentFragment / ShadowRoot
  / iframe document / iframe element / Proxy of an element => refused:BAD_PARAMS:node
proto with toStringTag "Node" (a deliberate fake) => refused:BAD_PARAMS:node
window => refused:PAGE_ERROR (JSON.stringify throws on the cycle; fixed text)
```

**Can a plain JSON value be refused now? No.** Data arriving as JSON has `Object.prototype`, `Array.prototype` or
`null` as its prototype, and none of those has the tag. Only an object whose prototype deliberately carries
`Symbol.toStringTag = "Node"` is refused, which I accept as a deliberate fake.

**Can a real node slip through? Only by page tampering**, which is outside S4's guard:

- a page that redefines `Object.prototype.toString`, or `Node.prototype[Symbol.toStringTag]`, **and** shadows the
  global `Node`;
- a page that cuts the node's prototype chain (`Object.setPrototypeOf(el, null)`).

In both cases the node is saved as `{}`, as the Map and Set checks would be fooled the same way. NIT, recorded, no
fix needed.

### (c) Findings 6 and 3: the description

- **The description text is true:**
  - "without the result caps above, up to 256 MiB" matches `SAVE_MAX_VALUE_BYTES`, and the serialiser caps are not
    used on this path.
  - "produce a very large value with `return …`, so it never crosses as one piece" is true: the `return` form is a
    promise completion, which the CDP leg reads out in slices (§4).
- **0.4's sentence** still ends the description verbatim.
- **Only that one line changed:** `git diff f4c0ff2 -- mcp/src/tools/registry.ts` shows a single `-`/`+` description
  line, `browser_evaluate`'s. The other 22 tools' descriptions are unchanged.
- **Schemas:** my capture finds 22 schemas byte-identical to `tool-schemas-f45e3bf.json`. `s2-focus-first` and
  `s4-save-tool` are green.
- **The SDK doc comments** (`Tab.evaluateToFile`, `BridgeClient.evaluateToFile`) carry the same hint. Behaviour is
  unchanged.

### (d) Finding 5: the finish

My own throwaway test calls `saveEvaluateToFile` against real temp directories on NTFS, with a 3 MiB + 7 byte value.
In the race cases a file `APPEARED` is written at the target while the first slice is pulled:

```
link, no race:                ok sha=true nlink=1 | files=["out.txt"]
link, file appears:           err BAD_PARAMS      | files=["out.txt"] | target starts=APPEARED | end sent=true
overwrite, file appears:      ok sha=true nlink=1 | files=["out.txt"] (replaced)
overwrite, no race:           ok sha=true nlink=1
fallback EPERM|ENOTSUP|EXDEV|ENOSYS, no race: ok sha=true nlink=1 | files=["out.txt"]   (each)
fallback EPERM|ENOTSUP|EXDEV|ENOSYS, appears: err BAD_PARAMS | target starts=APPEARED  (each)
other link error EIO:         err EIO | files=[]  (no .part, no target)
```

- Every successful save leaves exactly one file at the path, with `nlink=1` (no second hard-linked name) and the right
  sha256. No `.part` was left in any case, and `evaluateSaveEnd` was sent every time.
- **Finding R1-1 (MINOR) — the fixer's claim about `.part` cleanup is false.**
  - **Where:** `sdk/src/evaluate-save.ts:85` and `:166-167`.
  - **The claim:** the report says that when `link` succeeds and the `.part` removal fails, "the `finally` cleanup
    removes it again". The code does not do that.
  - **What happens:** `finishSave` calls `await rm(part, …).catch(() => {})` and returns normally. The caller then sets
    `partLeft = false`, so the `finally` skips its `rm`.
  - **The effect:** if that one `unlink` fails (antivirus or indexer interference on Windows), `<path>.part` stays as a
    **second hard-linked name holding the whole value**. That is a file at a path the caller did not give. It also
    blocks the next save to that path, because the `.part` is opened `"wx"`.
  - **Evidence:** code reading. I could not make `unlink` fail on a just-closed file of my own on NTFS without ACL
    games, so this is not reproduced.
  - **Fix:** let `finishSave` report whether the `.part` is gone, and set `partLeft = false` only then. The `finally`
    then retries the `rm`. The save still succeeds, because the target is complete.

### (e) Mutants: each fix reverted, the new tests go red

My runner, `mutate2.cjs` in the scratchpad, ran 4 test files per mutant (117 tests). **9 mutants, 9 killed:**

```
R2  node check back to the duck type          → 2 failed (plain-JSON saves; own-tag fake saves)
R2b cross-realm walk broken ("[object NodeX]") → 1 failed (node from another realm)
R2c walk starts at the value, not its prototype → 1 failed (own toStringTag fake)
R6  "no caps" sentence back                    → 1 failed (the saveTo sentence is true …)
R3  only the `return …` hint dropped            → 1 failed (same test)
R5  finish always rename                       → 7 failed (the rename-race block)
R5b fallback without the stat re-check         → 4 failed (link unsupported … refuses the file that appeared)
R5c link success keeps .part                    → 1 failed (happy path)
R5d other link errors treated as unsupported    → 1 failed (another link error …)
```

### Updated verdict

**PASS-with-notes.**

- Findings 2, 6, the optional part of 3, and 5 are fixed, and each fix is pinned by tests that discriminate.
- Still open:
  - finding 1 (MINOR, eviction across clients);
  - finding 3's main part (MINOR, the F2 primitive path, for the user);
  - finding 4 and findings 7–8 (NITs; the fixer did not address them);
  - new finding **R1-1 (MINOR)**: a `.part` left as a second hard-linked name if its unlink fails after a successful
    `link`. Rare, but it contradicts the fixer's report.
- No CRITICAL or MAJOR finding, and no exit check fails.

## Re-check, round 2

This round audits `S4-fixer2.md` (finding R1-1 only), 2026-10-25. The set-up was the same as before:

- a fresh worktree `%LOCALAPPDATA%\Temp\s4v3` from `f4c0ff2`, with the current uncommitted main-tree files copied in;
- `npm ci` (no junction);
- removed at the end (`git worktree remove --force`, then `rmdir /s /q` for what it left, then `git worktree prune`;
  `git worktree list` shows only the main tree).

### (a) Counts

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx vitest run` | **3145 passed, 130 files** (3142 → 3145: +3, none removed) |
| `npm run build` | exit 0 |
| `git status --short` after the build | the same 17 tracked modifications, none from the build |

### (b) R1-1 by reading the code

In `sdk/src/evaluate-save.ts`:

- **`partLeft` is cleared only when the `.part` is gone.**
  - `finishSave` now returns whether the `.part` is gone.
  - The overwrite `rename` returns `true`.
  - The link-unsupported fallback (stat re-check, then `rename`) returns `true`, unchanged otherwise.
  - A successful `link` returns `removePart(…)`.
  - The caller sets `partLeft = !(await finishSave(…))`.
- **A failed removal is retried, once.** The outer `finally` makes one more `removePart` attempt (through the same
  `io.rm` seam), and `evaluateSaveEnd` is still sent.
- **A second failure fails the save.** `partStuck` throws `INTERNAL "<target> was written, but <target>.part (a second
  name for the same bytes) could not be removed — remove it by hand"`. The message carries only caller-given paths.

### (b) R1-1 run myself

My own throwaway test used a real temp directory on NTFS, a 2 100 012-byte value starting `SECRETVALUE-`, and an
`io.rm` that fails N times:

```
link, rm ok:            ok      | rmCalls=1 | files=["f.txt"]              | target ok | end sent
link, rm fails once:    ok      | rmCalls=2 | files=["f.txt"]              | target ok | end sent
link, rm fails twice:   err INTERNAL msgHasValue=false
                        "<dir>\f.txt was written, but <dir>\f.txt.part (a second name for the same bytes) could not be removed — remove it by hand"
                                | rmCalls=2 | files=["f.txt","f.txt.part"] | target ok | end sent
overwrite rename, rm would fail: ok | rmCalls=0 | files=["f.txt"]
fallback EPERM,  rm would fail:  ok | rmCalls=0 | files=["f.txt"]
```

- **No success is reported while a second name remains.** The rename path and the fallback never call the removal,
  so they are unchanged.
- **Other ways a second name could be left:**
  - The link is the only operation that creates a second name.
  - The fallback and the overwrite paths `rename`, so the `.part` itself becomes the target.
  - A `link` error other than `EEXIST` or the unsupported set rejects before any name exists.
- **NIT (pre-existing, not R1-1):** a save that had *already failed* (for example, a pull refused mid-way) and whose
  `.part` removal also fails twice leaves a partial `.part`, and the original error is reported without saying so. It
  is not a second name of a completed file. A future round could append "(and `<part>` could not be removed)" to that
  error.

### (c) Mutants of the fix

My runner ran `sdk/test/s4-evaluate-to-file.test.ts` (31 tests) per mutant. **5 mutants, 5 killed:**

```
Q1 finishSave swallows the failure again (always true)  → 2 failed (both R1-1 tests)
Q2 no retry in the finally                              → 13 failed
Q3 success reported despite a stuck .part               → 1 failed ("both removals fail …")
Q4 retry bypasses the io.rm seam                        → 2 failed
Q5 rename path also calls the removal                   → 1 failed (the guard test)
```

The fixer's red evidence (2 failed | 1 passed before the fix, the guard passing on both versions) is consistent with
Q1 and Q3.

### Final verdict

**PASS-with-notes.** R1-1 is fixed and pinned by tests that discriminate. These remain open, none CRITICAL or MAJOR:

- finding 1 (MINOR, eviction across clients);
- finding 3's main part (MINOR, the F2 primitive path, for the user);
- NITs: finding 4, findings 7–8, the round-1 note on page tampering, and the round-2 note on a stuck partial `.part`
  after a failed save.

Every exit check S4.1–S4.5 passes.
