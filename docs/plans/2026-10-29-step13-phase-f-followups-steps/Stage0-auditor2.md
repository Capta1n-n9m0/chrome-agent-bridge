# Step 13 Stage 0 — auditor 2 (key order, console, chooser)

Model Opus, effort medium. Start commit `ff121a4`. Read-only; no Chrome, no port 9234, nothing started that runs on.
Body: `stage0-audit-2.md`. Evidence: `stage0-a2-greps.txt`, `stage0-a2-serialiser-probe.txt`, `stage0-a2-tests.txt`.

## 1. Verdict

**DONE.** 0.3, 0.5 and 0.6 hold in substance with amendments; 0.4 needs its call rule rewritten and three code-side
conditions added before S3a can be judged "cheap". No CRITICAL finding. Four MAJOR (all plan-side, all fixable by a
dated note before the stage starts). **0.6: (a).**

## 2. Outputs

- `stage0-audit-2.md` (the audit body: serialiser paths, round-trip table, console plug-in point, formatter edges, the
  chooser path, sizes, 19 blind spots).
- `stage0-a2-tests.txt`: `npx vitest run` over the 10 Step 12 contract files of this half (`s12-args-cdp`,
  `evaluate-serialize`, `evaluate-mark`, `evaluate-asref`, `s5a-chooser`, `sdk s12-console-cap`, `s12-console-format`,
  `mcp s12-console-cross`, `s12-upload-chooser`, `recipes s12-forms-b`): **10 files, 178 passed**. No socket on 9234.
- `stage0-a2-serialiser-probe.txt`: the shipped `serializeForAgent` / `SERIALIZER_SRC` under `JSON.parse(JSON.stringify())`.
- `stage0-a2-greps.txt`: every citation below, executed.

## 3. Verifier verdict

Not applicable (auditor).

## 4. Deviations

None. The probe script lives in the session's scratch folder, not in the repo; its output is the evidence file.

## 5. Proposed decisions

### 2026-10-29 · #377 amended: the envelope crosses as a JSON string beside the unchanged serialiser, checked on receipt
**Decided:** keep #377's mechanism, with four amendments. (1) `SERIALIZER_SRC` stays as it is; a new closure-free source
wraps it and returns `JSON.stringify` of the envelope; `serializerCall` (`extension/src/debugger.ts:265-284`) sends that
source and parses the string **inside** the `callFn` (so a parse failure or a `RangeError` reaches `result.ts:140`'s
fallback, and `asRef` sweeps as today). (2) The parsed result is accepted only as an envelope — `kind` one of the known
kinds, `description` a string, `truncated` a boolean, `__mark` one of the mark statuses, no other key — else the
fallback; this matters because a page's `Object.prototype.toJSON` or replaced `JSON.stringify` controls the whole string
(probe: `"HOOKED"`), while today it reaches only `description`. (3) The serialiser paths are `evaluate` (plain and
`args`), `asRef` and the mark sweep; `evaluateSaveStart` is not one (it already saves page-order JSON made in the page,
`save.ts`), so S2 adds at most a regression pin there. (4) K2.1's mutant is red only if the fake CDP models Chrome:
`EngineCdp`'s `returnByValue` (`extension/test/s12-engine-cdp.ts:62`) must sort object keys at every depth, which turns
`s12-args-cdp.test.ts:109-114` red on today's code — that is S2's failing test.
**Why:** the round trip changes nothing a client sees (`-0` is already `0` after `router.ts:78`; doubles exact; BigInt,
NaN, Infinity, `undefined`, holes, Date are already strings; integer-like keys re-order identically), and it keeps the
lone surrogate `cutString` can create. **Instead of:** the plan's wording (composite returns a string, breaking
`evaluate-serialize.test.ts:10` and `evaluate-mark.test.ts:182-…` against K2.2); CDP's `serializationOptions: {serialization:
"deep"}`, which keeps order as key/value pairs but needs a new decoder. **Revisit if:** the measurer finds Chrome's
`returnByValue` of a plain string altered (it carried 64 MiB whole in SAVE-PRIM, so unlikely). **By:** Claude (proposed)

### 2026-10-29 · #378 amended: what "cheap" means in code, and a call rule that can be met
**Decided:** keep the measurement and the yes/no branch. Replace "one CDP call per object argument, at most one per entry
and a fixed number per read" (self-contradictory: `console.log(a, b, c)`) with: **only the first object argument without
a `preview` of each of the newest `limit` candidate entries is read, so at most `limit` (≤ 200) `getProperties` calls per
read, all inside today's 10 s race.** Add three code conditions: the read runs between the settle and
`Runtime.disable` (objects are likely discarded by the disable; measurer confirms); the CDP reply is bounded before it
arrives (no read of `subtype: proxy`, and none of an array or object whose description shows more than 100 items, or
`nonIndexedPropertiesOnly` if measured to work); the result is a synthetic `preview` that `previewText` prints, so the
#344 cuts and the source filters apply unchanged, and an accessor prints with no value. R20-CON-NOTEA's text allows an
entry dropped after the read for a stack URL its Error property revealed.
**Why:** `collectConsole` takes `send(method)` with no params and the reduce runs after the session
(`console-messages.ts:77`, `handlers/console.ts:25-42`); `getProperties` has no item cap. The old dump cannot answer the
objectId question (`stage0-m1-C.txt` holds 0 `objectId`, live args too). **Instead of:** an identity
`callFunctionOn {generatePreview}` (bridge code in the page world; forbidden by S3a's verifier focus as worded).
**Revisit if:** S3a's minimal build exceeds 1.5 × 300; then split it before it starts. **By:** Claude (proposed)

### 2026-10-29 · #379 amended: the newest kept; two pinned tests outside the named files join S3b; the CON-NOTEA sentence moves to S3b
**Decided:** keep the direction and the frames sentence (plan-drift finding 1's wording). #379's own Revisit-if is met:
`mcp/test/s12-upload-chooser.test.ts:78-84` (old marker regex, marker last) and `recipes/test/s12-forms-b.test.ts:248-253`
(the real `formatConsole` read by Run 19's `concapStats`, marker last) join S3b's lane; the recipes test's real-formatter
leg is changed to a literal of the old form (Run 19's helper reads Run 19's text) and S5-helpers writes the new reader.
The formatter keeps a contiguous block from the newest back; the marker is the first line and counts `rows − kept`; when
no row fits, its words do not call the cut lines "older". If S3a is not run, the tool-description sentence for the
CON-NOTEA limit is S3b's (it is `mcp/src/tools/registry.ts`, product code), not S6's (docs only).
**Why:** `npm test` includes `recipes/test`; S3b's commit is red otherwise. **Instead of:** editing Run 19's helper
`recipes/s12-forms-b.ts`. **Revisit if:** another pin appears in S3b's verifier's grep. **By:** Claude (proposed)

### 2026-10-29 · #380 decided (a): the second-chooser refusal keeps `DEBUGGER_DEVTOOLS` with its own fixed text
**Decided:** (a). `upload.ts:165-167` throws `DEBUGGER_DEVTOOLS` with a fixed message such as "Another file chooser upload
is still running on this tab; retry after it ends." Every other path's text stays byte-identical (`debugger-errors.ts:48-53`,
pinned by `recipes/test/s11-rules.test.ts:118`). S4's lane gains the spec note: §10's Step 12 note (spec line 971) states
today's text, so a dated note precedes the code under (a) too. T4.1 adds an MCP-side check: the MCP prints the bare
message, `isError: true`, no code (`@modelcontextprotocol/sdk` `server/mcp.js:141`).
**Why:** the MCP shows only the message under either option, so (b)'s new code reaches no agent without new MCP work;
(b) moves the counts in every doc and the code union and breaks a script's `catch` on `DEBUGGER_DEVTOOLS`; an old
extension answers the same code with the old text, so (a) needs no hello feature. The code's sense, the tab's debugger
slot taken, fits a running chooser call on the tab (the slot is taken from the call's start, `upload.ts:165`, not only
during the attach — the plan's "the first call holds the session" is too strong). **Instead of:** (b).
**Revisit if:** the user wants agents to tell the two cases apart by code. **By:** Claude (proposed; Stage 0 decides)

## 6. Findings

| # | Sev | Side | Finding | Evidence |
|---|---|---|---|---|
| F1 | MAJOR | plan | K2.1's mutant cannot be red: the fake CDP returns the object itself under `returnByValue`, so the existing "page order" test passes on today's code | `stage0-a2-greps.txt`: `s12-engine-cdp.ts:62 return params.returnByValue ? { result: { type: typeof out, value: out } }`; `s12-args-cdp.test.ts:109` "keys in the page's order"; 178 passed |
| F2 | MAJOR | plan/code | String crossing lets a page hook (`Object.prototype.toJSON`, `JSON.stringify`) control the whole parsed envelope (extra keys such as `ref`, forged `__mark`); no shape check planned | probe: `Object.prototype.toJSON hook "HOOKED"` |
| F3 | MAJOR | plan | S3b's commit breaks two pinned tests outside its lane (#379's Revisit-if met) | greps: `mcp/test/s12-upload-chooser.test.ts:83`, `recipes/test/s12-forms-b.test.ts:250`, `recipes/s12-forms-b.ts:106` (marker must be last) |
| F4 | MAJOR | plan | 0.4's call rule contradicts itself and has no bound on the CDP reply size (`getProperties` has no item cap) | `console-messages.ts:37` (4000 events), `:77` `send(method)` |
| F5 | MINOR | plan | `evaluateSaveStart` is not a serialiser path; it already saves page-order JSON | greps: no `SERIALIZER`/`serialize` in `save.ts`, `evaluate-save.ts` |
| F6 | MINOR | plan | If the composite itself returns a string, `evaluate-serialize.test.ts:10` and `evaluate-mark.test.ts:182-…` change, against K2.2 | read |
| F7 | MINOR | plan | The MCP leg of R20-ARGS-ORDER and an MCP read of R20-0 cannot discriminate: the MCP prints `description` (`registry.ts:872`), page order already (R19 `via=mcp value-equal=5`). Auditor 1's Run 20 area; flagged once | greps |
| F8 | MINOR | plan | The CON-NOTEA tool-description sentence is product code but is given to S6 (docs only) | phase doc 0.4 "If no" |
| F9 | MINOR | plan | Under (a) the spec's line 971 still states today's text; S4's lane has no spec note under (a) | greps |
| F10 | MINOR | plan | Stage 0's old console dump carries no `objectId` (live args too), so it cannot be cited for 0.4 | `grep -c objectId stage0-m1-C.txt` → 0 |
| F11 | NIT | code | A page object's own `__proto__` key is dropped by the serialiser (pre-existing; unchanged by #377) | probe: keys `["b","__proto__x"]` |
| F12 | NIT | plan | 0.6 (a)'s reason "the first call holds the tab's one debugger session" is not always true (slot taken before the attach) | `upload.ts:165-176` |

New runtime fact worth a `CLAUDE.md` bullet: none measured in Chrome. A code fact for `extension/src/evaluate/CLAUDE.md`
after S2: the evaluate fake must model `returnByValue`'s key sort, or order tests pass vacuously (F1).

## 7. Handoff

No process started that still runs. Sizes (new code + tests, minimal): **S2 ~140–190 / 300; S3a ~260–340 / 300 (at the
edge: split into a pure enrichment slice and a wiring slice if the measurer's rules add more); S3b ~80–110 / 200 (with
F3 and F8); S4 ~45–75 / 150 (with 0.7).** The measurer for 0.4 must print `objectId` of replayed args, test
`getProperties` before and after `Runtime.disable`, on a revoked `Proxy`, a frame's object, an accessor and a 10⁶-element
array (reply size), and try `nonIndexedPropertiesOnly`.
