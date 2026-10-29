# Step 13 Stage 0 — audit 2 (key order, console, chooser): the body

Auditor 2 of 2, Opus, medium effort. Start commit `ff121a4`. Scope: phase doc Decisions 0.3, 0.4 (code side), 0.5, 0.6;
stages S2, S3a, S3b, S4; exit checks K2.*, C3.*, T4.*; proposals #377–#380. Read-only; no Chrome run.
Evidence in this folder: `stage0-a2-greps.txt` (every code citation below, executed), `stage0-a2-serialiser-probe.txt`
(the JSON round trip of the shipped serialiser in Node), `stage0-a2-tests.txt` (Step 12's contract tests of this half,
10 files, 178 passed).

## 1. 0.3 — the serialiser and its callers

### 1.1 Where it runs
- `extension/src/debugger.ts:265-284` `serializerCall(tabId, remaining, timeoutMs)` returns
  `(objectId, lim) => Runtime.callFunctionOn {objectId, functionDeclaration: SERIALIZER_SRC, arguments: [{value: lim}],
  returnByValue: true}`, then `Runtime.releaseObject`, then `res.result?.value as EvalEnvelope`.
- It is built in two places: `debugger.ts:252` (`evaluateInPage`) and `debugger.ts:335` (`evaluateFunctionInPage`, the
  `args` form). Both hand it to `shapeEvaluateResult` (`extension/src/evaluate/result.ts:121`), which calls it only for a
  result with an `objectId` (`result.ts:140`, inside a `try` whose `catch` falls back to `{kind:"other", description:
  r.description}`).
- Callers of those two, all in `extension/src/handlers/evaluate.ts`: the plain call (`:44`), the `args` call (`:45`),
  `asRef` (`:71`, the same runner with `{...DEFAULT_LIMITS, mark}`; `:76-78` reads and deletes `__mark`), and the mark
  sweep `sweepMark` (`:114-116`, `evaluateInPage` on `unmarkExpression`; its value is thrown away).
- **`evaluateSaveStart` does not use the serialiser.** `evaluateToSave`/`evaluateFunctionToSave` (`debugger.ts:355`,
  `:379`) run `collectSaveText`/`collectSaveFromRaw` (`extension/src/evaluate/save.ts`), whose `SAVE_PREPARE_SRC`
  `JSON.stringify`s the value in the page and reads it back as string slices (`save.ts:224`, `:242`, `returnByValue`
  only on an array of three primitives and on strings). `grep "SERIALIZER\|serialize" save.ts evaluate-save.ts` → no
  match. The saved file is therefore already in page order; the phase doc's "every path that uses the serialiser
  (`evaluate`, `asRef`, `evaluateSaveStart`)" is wrong about the third.

### 1.2 What crosses today
The envelope the composite returns — `{kind, value?, description, truncated, __mark?}` (`serialize.ts:350-392`,
`:402-412`) — crosses as a CDP object. Chrome sorts its keys at every depth (Step 12 Stage0-measurer1 §B; run 4 and
run 5). `description` is `JSON.stringify(value, null, 2)` built in the page (`serialize.ts:374`), so it keeps page
order — confirmed by reading and by the probe (`description page order { "z": 1, "a": 2, … "o": [ { "y": 1, "b": 2 } ] }`).
After receipt the router `JSON.stringify`s the whole reply (`extension/src/router.ts:78`), so everything past the CDP leg
is JSON already.

### 1.3 What a JSON string round trip changes (probe, `stage0-a2-serialiser-probe.txt`)
| Value inside the envelope | Already encoded by `walk`? | Round trip |
|---|---|---|
| `-0` (nested; a top-level `-0` is CDP's `unserializableValue`, `result.ts:128`) | no, kept as a number | becomes `0`. **No change at the client**: `router.ts:78` already turns it into `0`, and `description` already says `0`. |
| lone surrogate | no | kept (`{"s":"x\ud800y"}`, equal after parse). `cutString` can make one: a 5000-unit cut through a pair leaves `d83c`. Whether Chrome's `returnByValue` keeps it today is unmeasured; if it does not, string crossing changes the value for the better. |
| huge / tiny doubles (`1e308`, `2**53+2`, `5e-324`) | no | exact. |
| BigInt, NaN, Infinity, `undefined`, sparse holes, Date | yes: `"…n"`, `"NaN"`, `"Infinity"`, `"undefined"`, ISO string (`serialize.ts:183-221`) | unchanged. |
| own key `__proto__` | — | **already lost in the page**: `out[k] = …` on a `{}` sets the prototype (object) or is ignored (primitive): keys `["b","__proto__x"]` from `["__proto__","b","__proto__x"]`. Pre-existing; string crossing neither causes nor fixes it. The worker's `JSON.parse` would keep such a key. |
| integer-like keys | — | JS orders them first ascending in the page and again after parse (`["2","10","z","a"]` both); `returnByValue`'s string sort would give `["10","2","a","z"]` but JS re-orders on receipt. No change. |
| `__mark` | — | survives (`marked`). |
| the envelope as a whole under a page hook | — | **changes**: with `Object.prototype.toJSON` defined by the page, `JSON.stringify(env)` returns `"HOOKED"` (probe). A page that overrides `JSON.stringify` or a prototype `toJSON` controls the whole text the extension parses — kind, value, extra keys (`ref`), `__mark`. Today such a hook reaches only `description`. |

### 1.4 Shape, size, the save path
- Reply shape: unchanged if the parse result is checked; without a check, a hooked page can add keys (above).
- Size: the CDP reply carries the envelope as one escaped string, a little larger than the object form; no new bound.
  `value` is uncapped today (`result.ts:94-98` caps only `description`), so this is pre-existing. `JSON.stringify` of a
  value past V8's string limit throws `RangeError`; the throw must be caught (in the page or by the `result.ts:140`
  fallback).
- The save slice path and the 100 MiB frame cap: untouched (1.1).

### 1.5 Tests that pin order
- `extension/test/s12-args-cdp.test.ts:109-114` asserts page order, **but through `EngineCdp`**
  (`extension/test/s12-engine-cdp.ts:62`), which returns the page object itself for `returnByValue` — no sort, no JSON.
  It passes on today's code while live Chrome sorts. A mutant that keeps `returnByValue` on the envelope stays green
  unless the fake models Chrome's sort.
- `s12-args-cdp.test.ts:94` ("key order kept") checks `JSON.stringify(args)` computed in the page — a string; not about
  the return direction.
- `evaluate-serialize.test.ts:10` and `evaluate-mark.test.ts:16,182-…` call `SERIALIZER_SRC` and compare objects with
  `toEqual` (order-blind). If the composite itself starts returning a string, these change, against K2.2.
- `mcp/test/s12-args-cross.test.ts:131` uses `toEqual` against a fake extension that echoes `args`; a client-side
  assertion cannot discriminate this fix (the defect is in the extension's CDP leg, and the SDK/MCP do not reorder).
- The MCP prints `description` (`mcp/src/tools/registry.ts:872`), already in page order: Run 19's MCP leg read
  `value-equal=5` (`S7-run-record.md:48`). An MCP leg of R20-ARGS-ORDER or R20-0 cannot discriminate.

## 2. 0.4 — the console read today (code side)
- Events: one top-level listener feeds `ConsoleCollectors` (≤ 4000 events per collector, `console-messages.ts:37`).
- `collectConsole` (`:77`): `Runtime.enable`, settle 100 ms, `Runtime.disable` in `finally`. `CollectDeps.send(method:
  string)` takes no params. CDP calls per read: 2 (plus the keeper's attach on a cold tab).
- The handler (`handlers/console.ts:25-42`) runs `collectConsole` inside `withDebugger` under `raceTimeout(…, 10 000)`,
  **then** reads the block list (`:39`, `call.networkFilter()`), **then** runs `reduceConsole` outside the session.
- `reduceConsole` (`:208`) is pure and synchronous: an argument's text is `remoteText` (`:168`) from `value`,
  `unserializableValue`, `description`, `className` and `preview` only; `previewText` (`:154`) prints `name: value` per
  preview property, cuts each at its first stack line (`cutStack`), marks a V8-shortened non-string value (`SHORTENED`,
  `:137`), and the entry is dropped if any source is hidden, if none is real, if before the arm floor, or above the level
  (#333, #344). `capText` cuts a text at 2000; `limit` ≤ 200 keeps the newest.
- Reply bound: ≤ 200 entries × ≤ 2000 characters, independent of how text is built, as long as new text goes through
  `capText`.

**Where a `Runtime.getProperties` read would plug in.** Only inside the session and before `Runtime.disable`: disabling
the Runtime domain discards the session's remote objects (to be confirmed by the measurer; if it holds, a read after
`collectConsole` returns is impossible). So S3a needs (1) `CollectDeps.send(method, params)`; (2) an enrichment step
between the settle and the disable that picks which arguments to read; (3) a way to hand the result to `reduceConsole`
in a shape `remoteText` already prints — simplest: a synthetic `preview {properties:[{name, type, value}] , overflow}`
built from the descriptors, so `previewText`, `cutStack` and `SHORTENED` apply unchanged and the filters still run before
stripping. The block list is read after the session today; reading objects of an entry the filter later drops leaks
nothing (nothing is kept or logged), so the filter may stay where it is, but the call count must be capped without it.

**Calls per read, worst case.** Today 2. With the read, 2 + one per object argument without a `preview`, over ≤ 4000
events with any number of arguments each: unbounded unless capped. 0.4's "one CDP call per object argument, at most one
per entry and a fixed number per read" contradicts itself (an entry `console.log(a, b, c)` has three object arguments).
A rule that can be coded: read only the first object argument without `preview` of each of the newest N candidate
entries (N = the call's `limit`, ≤ 200), at most N calls, all inside the existing 10 s race; the rest keep their class
name.

**What "cheap" needs in code**, beyond the measurement: (a) no getter run — `ownProperties: true` returns accessor
descriptors (`get`/`set`), and the synthetic preview must print an accessor as `type: "accessor"` with no value, as live
previews do (`stage0-m1-C.txt` live args show `{"name":"g","type":"accessor"}`); (b) a size bound on the CDP reply
itself — `getProperties` has no item cap, so a 1 000 000-element array returns a million descriptors before `capText`
can help; arrays and objects must be capped before the reply (e.g. `nonIndexedPropertiesOnly` for arrays, or a skip
above a known `description` length such as `Array(n)` with n > 100), else "the reply bound holds" holds for the client
but not for the worker; (c) a `Proxy` (`subtype: "proxy"`) and a revoked one are never read (no trap may run; the
description `Proxy(Object)` is kept); (d) an Error-valued property's value is its stack: through `cutStack`, its URLs
become sources, so an allowed entry can be dropped after the read where it was kept before — the expected text of
R20-CON-NOTEA must allow for that.

**The old evidence cannot answer the objectId question:** `stage0-m1-C.txt` holds 0 `objectId` strings, for live
arguments too, which certainly carry one, so that dump dropped the field. The measurer must print it.

## 3. 0.5 — the console texts
- `formatConsole` (`sdk/src/format/console-messages.ts:22-41`) keeps whole rows oldest first (`:32-37`, stop at the first
  row that does not fit) and appends the marker last (`:39`); with no row fitting it returns the marker alone.
- **Pins of the old marker or direction, by grep** (`stage0-a2-greps.txt`):
  `sdk/test/s12-console-cap.test.ts:10,22,28-43` (in the lane); `mcp/test/s12-upload-chooser.test.ts:78-84` (regex of
  the old marker, `lastIndexOf("\n… [truncated: ")` — "the marker last"); `recipes/test/s12-forms-b.test.ts:248-253`
  (calls the **real** `formatConsole` and expects Run 19's `concapStats` to see the marker as the last line,
  `recipes/s12-forms-b.ts:106`). The last two are outside S3b's named files; #379's Revisit-if is met. `npm test`
  includes `recipes/test`, so S3b's commit is red without them.
- Docs that state the old direction (S6 / session agent): `mcp/CLAUDE.md:62-65`, `docs/setup.md:743-744`.
- The frames sentence: `registry.ts:945` "Messages of the page's frames are not read;", `sdk/src/tab.ts:389` "frames'
  messages are not read", pinned by `mcp/test/s12-console-cross.test.ts:145,150`. Plan-drift finding 1's wording fits
  both; no schema baseline is touched (the description is not in `tool-schemas-f45e3bf.json`'s input schemas).
- **Edge: no whole line fits.** Reachable only with a caller's own `maxChars` (SDK format subpath): a row is at most
  ~30 + 2 × 2000 characters (`\n` printed as two characters), below 20 000. Then every line is cut, the newest too, so a
  marker saying "older lines" would be untrue. The marker count must be "lines cut" = all rows − kept, and its words
  must not say "older" when kept is 0.
- **Edge: the marker counting.** Keep a contiguous newest block (stop at the first row from the end that does not fit;
  never skip a long row to fit an older short one), so the cut lines are exactly the oldest `n` and the count equals
  `rows.length − kept.length`. The marker stays outside the cap, as today.

## 4. 0.6 — the second-chooser refusal
- The path: `extension/src/handlers/upload.ts:164-168`. A second chooser call meets `chooserTabs.take(tabId) === false`
  and throws `describeDebuggerError(new Error("Another debugger is already attached…"), "File upload")` →
  `DEBUGGER_DEVTOOLS` "Chrome DevTools (or another extension) is already attached … Close DevTools on that tab and retry."
  (`debugger-errors.ts:48-53`). It runs before any page call and before the attach, outside `withDebugger`, so no
  `[chrome.debugger]` prefix and no `markOwnRefusal` concern.
- The other paths to that text: a real attach failure (`describeRaw`, any handler through `withDebugger`), and the
  keeper's overlap answer (`debugger-keeper.ts:8`, #335). Pinned elsewhere by `recipes/s11-rules.ts:50` and
  `recipes/test/s11-rules.test.ts:118` — they must stay byte-identical.
- The pin today: `extension/test/s5a-chooser.test.ts:547-565` checks the code only, not the text.
- The SDK: `DEBUGGER_DEVTOOLS` is not in `ATTACH_CODES` (`sdk/src/error.ts:66-74`) and has no `safetyRefusalLine`
  (`:145-152`), so a `Tab` call rethrows it with no report. The MCP: `browser_upload_file` → `onTab` → rethrow; the MCP SDK
  answers `createToolError(error.message)` (`@modelcontextprotocol/sdk` `server/mcp.js:141`), so the agent sees **the
  extension's message alone, `isError: true`, no code on line 1** (as `mcp/CLAUDE.md` says of rethrown errors).
- The spec states today's text: spec §10's Step 12 note, "answers `DEBUGGER_DEVTOOLS` with the text an overlapping
  debugger use answers today (#335)" (spec line 971). Changing the text under (a) contradicts that sentence; it needs a
  dated note too.
- "The code stays true (the first call holds the tab's one debugger session)" is only sometimes so: the slot is taken at
  the start of `chooserUpload`, before `ensureContent`, the target resolution and the attach (`:165-176`), so a second
  call can arrive while the first holds no session.

**Decision: (a).** Reasons from code and contract rules: (1) the MCP shows only the message under either option
(`createToolError(error.message)`), so (b) buys the agent nothing unless the MCP also gains a line — more surface;
(2) (b) adds the 28th code: `shared/src/codes.ts`, the doc-check counts, every doc stating 27 (26), the SDK's union type,
and a §10 note — and a script that catches `DEBUGGER_DEVTOOLS` to retry would stop matching; (3) an old extension answers
the old text under the same code, so no hello feature is needed under (a), while under (b) a new client meets an old
extension's `DEBUGGER_DEVTOOLS` anyway, so client code must handle both; (4) `DEBUGGER_DEVTOOLS`'s meaning in the code
set is "the tab's one debugger is taken" (`debugger-errors.ts:48`), which a running chooser call on the tab honestly
signals as a busy debugger slot. The message must say what is true in every phase: "Another file chooser upload is still
running on this tab; retry after it ends." — no DevTools, no path. Under (a) the MCP prints exactly that text with
`isError: true`; under (b) the same text, also without a code, unless a line is added.

## 5. Sizes against agent-rules §7 (new code + test lines, minimal change)
| Stage | Cap | Estimate | Note |
|---|---|---|---|
| S2 | 300 | ~140–190 | a JSON composite beside `SERIALIZER_SRC` (~10), `serializerCall` parse + shape check (~25), a sort-modelling `returnByValue` in `EngineCdp` (~10), tests (~100–140: plain, `args`, `asRef`, nested arrays of objects, description unchanged, parse failure → fallback, hooked page). Fits. |
| S3a | 300 | ~260–340 | `send` params (~5), the enrichment step with caps, accessor/proxy/array rules (~80–110), handler (~10), tests in `s12-console-reduce.test.ts` style (~170–220). At or just over the cap; split the plan into S3a-1 (enrichment, pure, test-first) and S3a-2 (wiring) if the measurer's rules add more. |
| S3b | 200 | ~80–110 | formatter (~20 changed), its tests (~40), the two texts and the pin (~6), the two out-of-lane pins (~10), plus the CON-NOTEA sentence if S3a is not run (~3). Fits. |
| S4 | 150 | ~45–75 | the message constant and throw (~6), a test that the text names no DevTools and the generic text is unchanged (~15), the §10 note (~5); 0.7 one line + a rejecting-`sleep` test (~25–40). Fits. |

## 6. Blind spots for this half (seed list extended)
| # | Blind spot | Covered by a planned test? |
|---|---|---|
| B1 | the fake CDP does not sort `returnByValue` keys, so the key-order mutant stays green | No — K2.1 must name the fake change |
| B2 | a page's `JSON.stringify` / prototype `toJSON` hook controls the parsed envelope | No — add to S2 |
| B3 | `evaluateSaveStart` is not a serialiser path (already page order) | Plan says it is — amend |
| B4 | `-0`, lone surrogate, huge numbers | `-0` no client change; lone surrogate from `cutString`; doubles exact (probe) — a lone-surrogate test is cheap, add |
| B5 | own `__proto__` key dropped in the page | pre-existing; record, out of scope |
| B6 | `RangeError` from a huge `JSON.stringify` | covered if the parse sits inside the `result.ts:140` try; state it |
| B7 | MCP leg of R20-ARGS-ORDER / R20-0 not discriminating (prints `description`) | No — Run 20 sheet (auditor 1's area; flagged) |
| B8 | `getProperties` after `Runtime.disable` (objects discarded) | measurer; S3a design must read before disable |
| B9 | `getProperties` on a large array / object: unbounded CDP reply | No — add a cap rule |
| B10 | Proxy, revoked Proxy, cross-realm object | measurer (seed); S3a never reads `subtype: proxy` |
| B11 | accessor property printed without its value | S3a test (counter 0 is not enough: the text must not show a value) |
| B12 | the read discovers stack URLs → an entry kept before is now dropped | No — R20-CON-NOTEA text must allow it |
| B13 | calls-per-read rule contradicts itself | amend 0.4 |
| B14 | marker when no line fits says "older" untruthfully | S3b test (seed) — give its expected text |
| B15 | out-of-lane pins: `mcp/test/s12-upload-chooser.test.ts:78-84`, `recipes/test/s12-forms-b.test.ts:248-253` | No — add to S3b lane |
| B16 | the CON-NOTEA tool-description sentence is product code, but 0.4 gives it to S6 (docs only) | No — move to S3b |
| B17 | the second call arrives before the first attaches | covered by the existing order of `chooserTabs.take`; T4.1 should run both phases |
| B18 | the chooser text in the MCP's printed line: bare message, `isError`, no code | T4.1 needs an MCP-side test (registry fake) |
| B19 | spec line 971 states today's text | S4 lane needs the spec note under (a) too |
