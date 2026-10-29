# Step 13 Stage 0 — measurer 2 (K: key order; C: CON-NOTEA; D: #369's DevTools conditions)

Model / effort: Opus, medium. Chrome 156.0.8078.48 (branded), scratch profiles, 2026-10-29, start commit ff121a4. Pass rules
(`stage0-m2-passrules.txt`) were written before the first run. Three dated addenda followed, each written before the legs it
governs. Setup and close: `stage0-m2-setup.txt`. Source: `stage0-m2-src.txt`. Raw output: `stage0-m2-K.txt`, `-C.txt`,
`-D.txt`.

## 1. Verdict

**DONE.** Every fact is measured.
- **K:** mechanism (ii) keeps the page's key order, and today's (i) does not. The JSON string is at least as exact as (i)
  for every special value.
- **CON-NOTEA is not cheap (No).** Criterion 1 fails. It also fails criterion 2 for a Proxy.
- **D1 and D2 do not refuse:** 10 valid repetitions out of 10 answered `ok` (1 more, VOID under the control as first
  written, also answered `ok`). Each valid one had a working control.
- **The flagless control is NOT MEASURED** (why: §4).

## 2. Outputs

Files: the seven in the brief; nothing committed.

| Fact | Value | How | Evidence |
|---|---|---|---|
| K (i) today: `callFunctionOn {SERIALIZER_SRC, returnByValue:true}` | **Reorders** in K1–K6, at every level. The envelope's own keys arrive as `description, kind, truncated, value` (`__mark` first when present). Integer-like keys come first, then code-unit order: `"2","10","-1","01","1.5","a","b"` | the worker's `JSON.stringify` of `result.value`, compared with the page's own `JSON.stringify` of the envelope | K.txt K1–K6 `i_string` |
| K (ii) the envelope returned as one JSON string, parsed in the worker | **Keeps page order** in K1–K6 (nested objects, arrays of objects, integer-like keys). The top-level keys are `kind, value, description, truncated[, __mark]`. `description` is identical in (i) and (ii); `asRef`'s `__mark` (K5) keeps its place. Time: (i) 0.8–2.3 ms, (ii) 0.7–1.6 ms | the same compare | K.txt `ii_keepsPageOrder: true` ×6 |
| K-exact: -0 | **0 in both (i) and (ii).** It is already lost today; the page's `JSON.stringify(-0)` is `0` | `Object.is` in the worker | K.txt K6 |
| K-exact: lone surrogates (in a value and in a key) | (i): **replaced by U+FFFD** (`hi`→`fffd`, `lo`→`61 fffd 62`, key→`fffd 6b`). (ii): **exact** (`d800`, `61 dc00 62`, `d800 6b`). A valid pair is exact in both | the char codes in the worker | K.txt K6 |
| K-exact: numbers | `1e308`, `5e-324`, `2^53`, `0.1+0.2` and `-MAX_VALUE` are exact in both. The envelope already holds NaN, -Infinity and `10n` as the strings `"NaN"`, `"-Infinity"`, `"10n"` | identity | K.txt K6 |
| C replayed argument | 7 of 7 replayed. Each object argument has an **`objectId`: yes**, and a **`preview`: no**. `description` = the class only (`Object`, `G`, `Proxy(Object)`, `Proxy`, `Array(10000)`) | attach + `Runtime.enable` + 300 ms; `consoleAPICalled` args | C.txt main |
| C: does the replay run page code? (R1−R0) | 0 on every counter (the objects are nested; Step 12's C8 +1 was for a top-level Error argument) | `executeScript` (MAIN) reads `JSON.stringify(window.__cnt)`: plain data, no fixture object is touched | C.txt main |
| C1 plain object | 0.7 ms, 737 chars, contents shown (`z`, `a`, nested with its preview), counters 0 | `getProperties {ownProperties, generatePreview}` | C.txt main |
| C2 getter object | 0.5 ms, 540 chars. `x:1` is shown, and `g` comes as an **accessor (not called)**: the getter counter stays 0. The prototype getter is not listed | same | C.txt main |
| C3 Proxy | 0.4 ms. **0 own properties**: only `[[Handler]]`, `[[Target]]`, `[[IsRevoked]]` internal properties. 0 trap calls. The contents need a second call on `[[Target]]` | same | C.txt main |
| C4 revoked Proxy | no error; handler and target `null`; 0 traps | same | C.txt main |
| C5 Error-valued property | **The E1 prototype `message` getter ran +1.** The values' `description`, `preview.description` and `preview.properties[stack].value` carry the stack with the **fixture URL** | same | C.txt main |
| C5 per read | +1 on **every** read (1, 2, 3 over 3 reads in one session) | V5 | C.txt V5 |
| C5 other options | +1 with `generatePreview:false` (V1), `accessorPropertiesOnly` (V2, 0 results) and `ownProperties:false` (V3). **No option avoids it** | V1–V3 | C.txt |
| C2/C3 other options | counters 0 under V1–V3 | V1, V3 | C.txt |
| C6 10,000-item array | with a preview: **494.9 ms, 3,645,960 chars**, 10,001 results. Without a preview (V1): 159 ms, 1,928,174 chars. `nonIndexedPropertiesOnly` (V4): 0.6 ms, 335 chars (`length` only). Counters 0 | main, V1, V4 | C.txt |
| C7 cross-realm (same-origin iframe) object | 0.7 ms, contents shown, counters 0 | main | C.txt main |
| C objectId lifetime | still valid after `Runtime.disable` in the same session (C1: 3 results). In a new session: `Could not find object with given id` | main | C.txt main |
| D1: undocked DevTools, opened after a prior probe session | **ok** (`1+1`→2) in 4 of 4. No `onDetach` within 3 s; attach + evaluate in 5–10 ms | `Dlib.mjs` D1 | D.txt 14–16, 32 |
| D2u: undocked DevTools before the probe's first attach | **ok** in 3 of 3 valid (r2–r4, under (a')); r1, VOID under (a) as written, also read ok. No `onDetach` | D2 in the undocked run | D.txt 11–13, 31 |
| D2d: docked DevTools before the probe's first attach | **ok** in 3 of 3. No `onDetach` | D2 in the docked run | D.txt 21–23 |
| D control (pipe) | Before the open: the tab's page target is `attached:false` with 0 devtools targets. After: `attached:true`, with new `devtools_app.html` targets (undocked also adds `device_mode_emulation_frame.html`, so +2; docked +1). This held in 11 of 11 | `Target.getTargets` over the pipe | D.txt |
| D control (window) | undocked: a window titled `DevTools - 127.0.0.1:8086/d.html?rep=…` (8 of 8); docked: none (3 of 3) | `wins.ps1` (the run's own PIDs) | D.txt |
| D control (pipe-free) | `chrome.debugger.getTargets()` gives the tab **`attached:true`** when only DevTools is attached, docked and undocked; it is `false` before the open | the probe's worker | D.txt `probeSeesAfter` |

## 3. Verifier verdict

None for a measurer.

## 4. Deviations

- **D2u r1 is VOID under control (a) as written:** undocked DevTools opens two targets, not one. Addendum 3 set (a′) before
  any further leg. r1 was not re-judged; r4 was added.
- **Legs 12–16 ran on the old `Dlib.mjs`** (Node's module cache). (a′) is computed from the fields they recorded; Du2
  recorded the target paths.
- **DevTools was opened by CDP `Target.openDevTools`**, not by the UI. Step 12's D3c used F12 (docked), with the same result.
- **The flagless control is NOT MEASURED.** Without `--enable-unsafe-extension-debugging`, no probe loads:
  `Extensions.loadUnpacked` needs the flag, and `--load-extension` is ignored on branded 156 (Step 12 m2 D3c). This
  measurement cannot exclude an effect of the flag. For docked DevTools, Run 19's flagless DEVPROBE (31 of 31 `ok`) agrees
  with the flagged readings. For undocked DevTools and DevTools opened first, only Run 20's live rows can say.
- Addendum 1 extended the C variants to C5 and C6 before they ran.

## 5. Proposed decisions

### 2026-10-29 · S2: the serialiser's envelope crosses as one JSON string
**Decided:** S2 wraps `SERIALIZER_SRC` to return `JSON.stringify(envelope)`, and the worker parses it. Every
`serializerCall` path is covered (`evaluate`, `args`, `asRef`'s mark). **Why:** K: page order is kept, lone surrogates
arrive exact instead of U+FFFD, -0 is already lost today, and the time is the same. **Instead of:** re-sorting on receipt.
**Revisit if:** a page overrides `JSON.stringify` or `Object.prototype.toJSON`. Today only `description` goes through the
page's `JSON`; under (ii) `value` would too. Not measured; the verifier should attack it. **By:** Claude (proposed)

### 2026-10-29 · CON-NOTEA is not cheap: S3a is not run, and S6 writes the limit
**Decided:** S3a is not run; S6 writes the limit, as 0.4's "If no" says. **Why:**
- (1) fails: `getProperties` on an object holding an Error subclass runs its `message` getter on every read, whatever the
  options (C5, V1–V3, V5).
- (2) fails for a Proxy: it has no own properties, so a second call on `[[Target]]` is needed.
- (3) holds under the numeric rule, but 10,000 items gave 3.6 MB in 495 ms.
- (4) would hold only if each property value went through `remoteText`. The fixture URL sits in `value.description` and
  `preview.properties[stack].value`, which `cutStack` already cuts, and in `preview.description`, which today's reducer
  never reads.

**Revisit if:** the user accepts page getters of the kind the replay already runs (Step 12 C8). **By:** Claude (mechanical
under #374 item 5)

### 2026-10-29 · Run 20's DevTools rows expect `ok`, with a stated control
**Decided:** R20-DEVT-UNDOCK and R20-DEVT-EARLY expect `ok`. The control is read before the call:
- **undocked:** a window of Chrome's PID titled `DevTools - ` plus the fixture's host and path;
- **docked:** the DevTools pane in the wave window (Run 19's opener);
- **optionally:** `chrome.debugger.getTargets()` for the tab reading `attached:true` before the bridge's first attach.

If either row refuses, 0.8's rows are re-run. **Why:** D (10 of 10 `ok`). **Revisit if:** Run 20 differs. **By:** Claude
(proposed)

## 6. Findings

Measured on Chrome 156, 2026-10-29, on a scratch profile.
1. **Undocked DevTools, and DevTools opened before the first attach, do not refuse `chrome.debugger`,** and no `onDetach`
   fires (D1, D2u, D2d). With #369, no DevTools configuration measured reaches `DEBUGGER_DEVTOOLS` on 156.
2. **`chrome.debugger.getTargets()` reads `attached:true` for a tab held only by DevTools.** Run 19's DEVPROBE read
   `attached=no`; its method was not read here, so the cause is open.
3. **`Runtime.getProperties` calls an Error subclass's prototype `message` getter once per call.** Accessors and Proxy traps
   are never called.

## 7. Handoff

- **PIDs checked gone:** Chrome 20948, 12052, 38676, 9832; python 36376; node 39644, 10168; timeout 384, 36116, 37056,
  39028.
- **Every Chrome closed by `Browser.close`** with exit 0, and 0 processes are left with the scratch folder in their
  command line.
- **No DevTools window is open.** Every repetition ended with 0 devtools targets and 1 window, and every browser is gone.
- **The scratch root is deleted.**
- Port 9234, the user's Chrome and measurer 1 were not touched; nothing needs the user's keyboard.
