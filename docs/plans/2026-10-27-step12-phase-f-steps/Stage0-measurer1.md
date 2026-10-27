# Step 12 Stage 0 — measurer 1 (B: `args` for evaluate; C: console replay)

Model / effort: Opus, medium. Chrome: branded 156.0.8078.48 (protocol 1.3, `Browser.getVersion` over the pipe), `--headless=new`,
fresh profile. Pass rules: `stage0-m1-passrules.txt` (written before the first run, not edited after). Setup and clean-up:
`stage0-m1-setup.txt`. Source: `stage0-m1-src.txt`. Raw output: `stage0-m1-B.txt`, `stage0-m1-C.txt`. Every page-side command
went through the probe extension's `chrome.debugger.sendCommand` (the product's path).

## 1. Verdict

**DONE.** All 13 facts measured. **B (i) as written fails its pass rule.** `arguments: [{value}]` does not carry a JSON value
faithfully through `chrome.debugger`. A variant measured passing is proposed below, and the phase doc's fallback (ii) is named.
**C1 is confirmed:** Chrome replays earlier messages when `Runtime.enable` runs. Clean-up verified.

## 2. Outputs

Files in `docs/plans/2026-10-27-step12-phase-f-steps/`: `Stage0-measurer1.md`, `stage0-m1-passrules.txt`, `stage0-m1-setup.txt`,
`stage0-m1-src.txt`, `stage0-m1-B.txt`, `stage0-m1-C.txt`. No commit (brief). No product code touched.

### B. `args` for evaluate (`stage0-m1-B.txt`)

| Fact | Reading (leg, numbers) | Against the pass rule |
|---|---|---|
| **B1** callFunctionOn passes a nested value | Both B1-obj (`Runtime.evaluate "globalThis"` → objectId) and B1-ctx (the default `executionContextId` from `Runtime.executionContextCreated`, which needs `Runtime.enable`) answer with no error and no exceptionDetails, and `this` is `globalThis`. **Equal: false** on both. Run 2 and run 4 show why: the page receives the object with **keys sorted** (`{z,a,m}` → `{a,m,z}`), **null-valued properties dropped** (`{z:null,a:1}` → `{a:1}`; `{o:{k:null}}` → `{o:{}}`; `[{x:null}]` → `[{}]`), and a **top-level `null` arrives as `undefined`**. Nulls inside arrays survive. Unicode (é ✓ 日本 🎉, checked code point by code point), numbers (1e21, -0.25, 2^53-1, 0.1) and booleans all pass. B1-none (no target) is refused: `-32602 "Either objectId or executionContextId or uniqueContextId must be specified"`. | **FAIL** (Equal) for both legs |
| **B2** no page global | 984 → 984 own names on `globalThis`, 0 added and 0 removed. `typeof args`, `leak`, `leak2` and `a` are all `undefined` after the calls. | **PASS** |
| **B3** strict CSP page | Control `evalBlocked = "yes"` (the CSP is in force). The call runs with no exceptionDetails, but Equal is false, for B1's reason. Recorded: `eval('2')` and `new Function` inside the called function work under the CSP (`"eval=2"`, `"fn=3"`). | Runs: yes. Equal: **FAIL** (B1's cause) |
| **B4** awaitPromise | B4-res resolves, with no exceptionDetails; Equal is false for B1's cause. B4-rej gives `exceptionDetails.text "Uncaught (in promise) Error: rej-sentinel-7"` (className Error). The plain rejection gives text `"Uncaught (in promise)"` and `exception.value "plain"`. Both replies **also carry a `result`**, so code must check `exceptionDetails` first. A sync throw gives `"Uncaught"`; a syntax error gives SyntaxError in exceptionDetails. Recorded: the 50 ms timer took 848 ms (run 1) and 218 ms (run 2, in-page) because the tab was hidden (`document.hidden true`), so its timers were throttled. | Resolve: yes. Rejections surface: **PASS** |
| **B5** ~1 MiB value | JSON is 1,051,649 characters. All 3 runs Equal (length, hash, first and last element): 40, 33 and 36 ms, median 36 ms. Recorded: 4 MiB in 151 ms and 16 MiB in 627 ms, both Equal. | **PASS** (an array of strings, so the B1 cause does not apply) |
| **B6** today's evaluate of `"(a) => a"` | The raw result is `type "function"`, `className "Function"`, description `"(a) => a"`. The serialiser (esbuild-built) gives the envelope **`{kind: "function", description: "(a) => a"}`**, and `"async (a) => a"` also gives `kind "function"`. **But `"function f(a) { return a; }"` contains `return`, so `wrapExpression` wraps it in an async IIFE, the answer is `undefined`, and the shaped kind is `"undefined"`.** | #322's claim is **CONFIRMED for expression-bodied functions only** |

**Not pre-registered (new rows, recorded only):**
- **The variant that passes (run 5, plain and CSP pages).** The function source is evaluated to a function object
  (`Runtime.evaluate`, `returnByValue:false`). Then `callFunctionOn` runs on `globalThis` with `function (fn, json) { return
  fn(JSON.parse(json)); }` and `arguments: [{objectId: fn}, {value: JSON.stringify(args)}]`. The page sees exactly the sent
  JSON (key order, nulls and Unicode intact), an async fn resolves, 0 globals are added, and it works on the CSP page.
  1 MiB through it takes 28, 25 and 25 ms.
- **The return direction (run 4).** `returnByValue` keeps nulls but **sorts object keys**. The same happens in **today's
  product evaluate:** `({z:1,a:2,n:null})` comes back with `value {"a":2,"n":null,"z":1}`, while `description` keeps the page's
  order (run 5).

### C. Console replay (`stage0-m1-C.txt`)

| Fact | Reading | Against the pass rule |
|---|---|---|
| **C1** replay of earlier messages | 10 of 10 `pre-*`, in order, are replayed on `Runtime.enable` after a fresh attach, and all 10 timestamps fall before the attach. Control 1. Each event carries `stackTrace` (with URLs), so the reducer must strip it. | **Replay EXISTS** |
| **C2** the bound | With 2000 messages logged, **1000** are replayed: indices 1000–1999, contiguous. Recorded: of 1000 messages of 20 008 characters each, **261** are kept (indices 739–999), so a total-size bound applies too. | Bound 1000; **oldest dropped** |
| **C3** uncaught errors before attach | `Runtime.exceptionThrown` is replayed on `Runtime.enable` (before `Log.enable`) for the uncaught error (1) and for the unhandled rejection (1). Their texts are `"Uncaught"` and `"Uncaught (in promise)"`; both have `url`, neither has `stackTrace`. `console.error` is replayed as `consoleAPICalled` type `"error"` (1). **`Log.enable`: 0 `Log.entryAdded`.** Recorded: when a handler is attached to a rejected promise afterwards, `exceptionThrown` is followed by `exceptionRevoked "Handler added to rejected promise"`. | Replayed as exceptionThrown: yes for both. Via Log: no |
| **C4** navigation | Same-origin navigation: pre 0, nav 1. Cross-origin (a.test → b.test): pre 0, nav 1. Recorded: when the session is attached during the navigation, `executionContextsCleared` fires and no detach happens. | **Cleared** (both) |
| **C5** out-of-process frame | **Tab session:** OOPIF 0 of 5 and same-origin iframe 5 of 5. `chrome.debugger.getTargets` lists the b.test frame as type **`"other"`**, and `Target.getTargets` through chrome.debugger is refused with `"Not allowed"`. `Target.setAutoAttach {autoAttach, waitForDebuggerOnStart:false, flatten:true}` is accepted. `attachedToTarget` (type `"iframe"`, c5f.html) arrives on the tab's root session. `Runtime.enable` via `sendCommand({tabId, sessionId})` on the child replays **5 of 5**. | **Needs auto-attach** (the OOPIF control read from the `attachedToTarget` type, see §4) |
| **C6** long message | 100 000 characters arrive whole (type string, value length 100 000), and so do 1 000 000 characters. | **Whole**: Chrome does not cap it, so the reducer must |
| **C7** a second session | Disable then enable in the same session: 10 again. Detach and attach a new session: 10 again. **After `Runtime.discardConsoleEntries`, the next session gets 0**: the call empties the page's store for every later reader. | **Replays again** |

## 3. Verifier verdict

Not applicable (measurer).

## 4. Deviations

- **B6, run 1** used a tsx-generated `SERIALIZER_SRC`. tsx inserted `__name(...)` (the tsx gotcha in `recipes/CLAUDE.md`), so it
  threw in the page. That row is marked superseded, and B6 is read from run 2 with an esbuild build using
  `extension/build.mjs`'s options. That build matches `extension/dist/sw.js` except for esbuild's scope renames.
- **C5's OOPIF control:** the pass rule expected an "iframe" target from getTargets. `chrome.debugger.getTargets` reports
  type `"other"`, and `Target.getTargets` is not allowed. Separate process was shown instead by the separate target, the
  `attachedToTarget` targetInfo type `"iframe"`, and the tab session's 0 versus the child's 5.
- **Not measured:** everything ran in headless and in background tabs; a windowed tab was not checked. Also not measured:
  whether B1's loss of nulls and order comes from chrome.debugger's argument conversion or from CDP itself (raw CDP against
  the page was out of lane), and whether `discardConsoleEntries` also empties a human's open DevTools console.

## 5. Proposed decisions

### 2026-10-27 · `args` crosses as a JSON string, the function as an object (B (i) as written fails)
**Decided:** B (i)'s `arguments: [{value: args}]` is ruled out by B1, B3 and B4: through `chrome.debugger` it drops
null-valued keys, turns a top-level `null` into `undefined` and sorts keys. Proposed in its place: (i′) evaluate `expression`
to a function object, then `callFunctionOn` on `globalThis` with `function (fn, json) { return fn(JSON.parse(json)); }` and
`arguments: [{objectId}, {value: JSON.stringify(args)}]`, followed by today's serialiser. This was measured passing on plain
and CSP pages, with async functions, no globals and 1 MiB in about 25 ms (run 5). Nothing is built by concatenating strings;
a non-function source answers as today's evaluate would. **Why:** it keeps (i)'s shape (Playwright's `evaluate(fn, arg)`) and
measured passing. **Instead of:** the phase doc's fallback **(ii)**, a lexical `args` binding (not measured here). (ii) still
needs its own Stage 0 showing it adds no global and keeps top-level `await` and the completion value. **Revisit if:** S2's
fake-CDP tests or the live row show a page that replaced `JSON.parse` breaking a call. (i′) calls the page's `JSON.parse`; a
page can already see and alter anything in its own world. **By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · An old extension's answer to a function source is `kind: "function"` only without `return`
**Decided:** #322's `VERSION` mapping catches an old extension only when the source has no `return`. B6 measured the
answers: `"(a) => a"` and `"async (a) => a"` give `kind "function"`, but `"function f(a) { return a; }"` gives `kind
"undefined"`, because `wrapExpression` wraps it. By `extension/src/evaluate/wrap.ts`'s `RETURN_RE` (code, not measured), a
block-bodied arrow with `return` goes the same way. Proposed: the SDK learns from the daemon whether the extension's build
supports `args` (its hello build or proto, `daemon.status`) before it sends `args`, rather than reading the answer's kind.
**Instead of:** mapping `kind "function"` alone. **Revisit if:** S2 finds a field that names the extension's capability.
**By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · Console capture: C1 stands; the tab's own session only; never discard
**Decided:** C1 is confirmed (C1, C2, C3, C7), so C2 is not needed. Proposed for S3a:
- Read `consoleAPICalled` and `exceptionThrown`, and drop entries revoked by `exceptionRevoked`.
- `Log.enable` is not needed (0 entries).
- **Never send `Runtime.discardConsoleEntries`**, which empties the page's store for later readers (C7).
- Read only the tab's own session: same-origin iframes are included, out-of-process frames are not (C5). That also keeps a
  cross-site frame, possibly of a blocked host, out of the result. Including out-of-process frames would need
  `Target.setAutoAttach` and child sessions; that is a later decision.
- Chrome keeps at most 1000 messages and passes text uncapped (C2, C6), so the plan's 200 entries and 2 000 characters stay.

**Why:** measured. **Instead of:** auto-attach to every frame. **Revisit if:** the user wants frame messages. **By:** Claude
(proposed)

## 6. Findings

- **The B (i) pass rule failed** (B1, B3 and B4 Equal) for the cause above.
- **New runtime fact for `extension/src/evaluate/CLAUDE.md`:** on Chrome 156, `chrome.debugger.sendCommand`'s
  `Runtime.callFunctionOn {arguments:[{value}]}` sorts object keys, drops null-valued properties and turns a top-level null
  into `undefined`. `returnByValue` sorts keys on the way back too, so today's `evaluate` `value` has sorted keys while
  `description` keeps the page's order (stage0-m1-B.txt runs 4–5, 2026-10-27).
- **New runtime facts for the C module:** Chrome 156 replays up to 1000 console messages (oldest dropped, and a size bound
  as well) and the uncaught exceptions on `Runtime.enable`; a navigation clears them; out-of-process frames need child
  sessions; `discardConsoleEntries` empties the store (stage0-m1-C.txt).

## 7. Handoff

No processes left: chrome, node and python processes with "s12-stage0-m1" in the command line = 0. Fixture server PID 20732
was stopped by PID. Scratch root deleted after a reparse-point check. Ports 18500–18501 are free (TIME_WAIT only). Nothing
needs the user's keyboard.

## Addendum 2026-10-27: B7, B8, C8 (asked by the step agent)

The step agent asked for these legs after the report above. Their pass rules were appended to `stage0-m1-passrules.txt` as
two dated sections before the legs ran; the earlier text is unchanged. A second scratch Chrome ran them: same method,
Chrome 156.0.8078.48 headless, closed with `Browser.close` exit 0, clean-up verified (`stage0-m1-setup.txt` addendum). Raw output
is in the addenda of `stage0-m1-B.txt` and `stage0-m1-C.txt`. Each B leg ran as (a), the function as the
`functionDeclaration`, and as (b), the (i′) variant. Model / effort: Opus, medium.

| Fact | Reading | Against the pass rule |
|---|---|---|
| **B7** a timeout for sync code | **The control is VOID as written.** Product-style `Runtime.evaluate {timeout:1000}` on `while(true){}` answered in 1011 ms, but with the command error `-32603 "Internal error"`, not a message naming "terminated". The session stayed usable afterwards (`1+1` → 2, a call → 5). The legs, recorded anyway: **`callFunctionOn {timeout:1000}`: no reply within 5 s, for (a) and for (b).** **`Runtime.terminateExecution` is refused through chrome.debugger:** `-32000 "Runtime.terminateExecution is not allowed for untrusted clients"`, for (a) and for (b), in B7-param and B7-term. Afterwards the session does not answer (`1+1`: no reply). **After a detach and a re-attach the page still does not answer**: the loop keeps running. Only `chrome.tabs.remove` ended it (5 tabs). | **VOID** (control). Every leg recorded: no timeout, no terminate |
| **B8** userGesture | Control: `Runtime.evaluate {userGesture:true}` gives `[isActive true, hasBeenActive true]`. `callFunctionOn` without the flag gives `[false, false]` for (a) and (b). With `userGesture:true` it gives `[true, true]` for (a) and (b). | **Carries a gesture** (both forms) |
| **C8** does replay or a live log run page code | Counters, with R0 the reading after the page's own at-load `console.log`. **Replay (R1 − R0): the `E1` prototype `message` getter ran +1; every other trap ran 0** (getter, toString, toPrimitive, valueOf, the five proxy traps, the stack getters, E2's own accessors). Its description shows `"E1: m1\n at …"`: the inspector called the getter to build the error description. **Reading the event's args in the worker (R2 − R1): 0.** **Live log while enabled (R3 − R2): proto `message` +2, own `message` +1.** The no-session control logged once with Runtime disabled: proto +1, own +1. So enabling Runtime adds **one more call of the prototype `message` getter** per Error-subclass argument. The proxy preview reads only the target (`a: 1`, 0 traps); accessors show as `type "accessor"`, not called. | **Replay runs page code: yes** (1 counter, +1); live: yes, the same getter |

**Integrity note on B7:** the control read "Internal error", and the rule wanted a message naming "terminated", so B7 is VOID
as written. The legs' readings stand as records, not as a pass or a fail. Re-running the control under a rule that accepts the
command-error form would be a new row. Recorded beside it, not as a finding: the product's `isExecutionTerminated`
(`extension/src/debugger-errors.ts:100`) does not match "Internal error". In the product, `raceTimeout` fires at the same
`timeoutMs`, so the call may still read as TIMEOUT; that was not measured here.

**C, the step agent's question:** messages logged while no session existed, including while the bridge was disarmed and held
no session, are the same fact as C1. They are replayed, up to the bound (C1, C2). A reader that wants nothing from a disarmed
period would have to filter by timestamp; the replay keeps the original timestamps (C1).

### 2026-10-27 · A function called with `args` has no stop for a synchronous loop
**Decided:** B7 measured three things. `callFunctionOn` takes no timeout. `Runtime.terminateExecution` is refused to
`chrome.debugger` ("untrusted clients"). A page stuck in a loop stays stuck after a detach. So (i′), and (i) as well, has no
bound on synchronous code, while today's `Runtime.evaluate {timeout}` has one. Proposed for S2: put the bound on the
`Runtime.evaluate` step. (i′) already starts with `Runtime.evaluate`, which turns the source into a function, but the loop runs
later, in `callFunctionOn`. One way: call the function from an expression run by `Runtime.evaluate {timeout}`. It reads the
function and the JSON from a holder object that `callFunctionOn` returned, by an objectId. But an expression cannot name an
objectId, so this is a design question, not a measured answer. Otherwise the tool description says plainly that a synchronous
infinite loop with `args` hangs the tab until it is closed. **Why:** measured (B7). **Instead of:** relying on
`terminateExecution`, which is unavailable. **Revisit if:** S2 finds a `Runtime.evaluate`-bounded form that runs the function
with no page global and no string building. **By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · The console read runs page code for an Error argument's `message` getter
**Decided:** C8 measured that `Runtime.enable`'s replay calls an Error subclass's prototype `message` getter once per replayed
argument, and that a live message adds one call. No other getter or proxy trap ran, and reading the event's fields in the
worker ran none. C1's "no page script runs" therefore holds except for this one path: a page's own `message` getter. Proposed:
#323's class question (`tab` versus the conservative `evaluate`) is weighed with this fact in hand. The JavaScript switch
promises that no agent-supplied script runs. This runs page-supplied code, so `tab` still fits, but the audit should say so.
**Revisit if:** the user reads the JavaScript switch as "no page code runs at all". **By:** Claude (proposed, contract-level,
for user review)

**New runtime fact for `extension/CLAUDE.md` (measured 2026-10-27, Chrome 156, headless):** `Runtime.terminateExecution` is
refused to `chrome.debugger` (`-32000 "…not allowed for untrusted clients"`). A page stuck in a synchronous loop that was started
by `callFunctionOn` answers nothing after a detach and a re-attach; only closing the tab ends it.
