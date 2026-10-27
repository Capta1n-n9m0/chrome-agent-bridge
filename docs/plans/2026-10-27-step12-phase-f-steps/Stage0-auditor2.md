# Stage0-auditor2 — the code-side audit of Step 12's proposals

Claude Opus 5.5, medium effort. Read-only. HEAD `0ba82f6`. The full audit is in `stage0-audit-2.md`, beside this file.

## 1. Verdict
DONE. All four items are answered. There are 25 findings: 0 CRITICAL, 12 MAJOR, 12 MINOR, 1 NIT. All but two are
plan-side; G-9 and G-20 are code-side.

## 2. Outputs
- `stage0-audit-2.md`, with these sections: decision attacks #322–#329, the G2 mechanisms, A's defect list, size
  estimates, the ranked findings and the proposed decisions.
- Evidence:
  - `stage0-a2-wrap.txt`: `npx tsx` runs the old extension's `wrapExpression` on four function sources.
  - `stage0-a2-daemon.txt`: `npx tsx` runs `takesLock` and `classify`.
  - `stage0-a2-vitest.txt`: `npx vitest run daemon/test/methods.test.ts extension/test/safety-debugger.test.ts`
    gives "2 passed, 23 passed".
- No build, no daemon; port 9234 untouched. No test count change: this audit adds no tests.

## 4. Deviations
None. Chrome facts are named "[measurer]" and not asserted. One fact is cited rather than measured: that
`chrome.webNavigation` needs its permission (Chrome's API reference). The measurer is asked to confirm it.

## 5. Proposed decisions
Eight, in `stage0-audit-2.md` §6:
1. Detect an old extension positively, not from the shape of its answer: a hello feature flag, with a reply marker
   as the fallback.
2. Keep `args` calls bounded in time, with `terminateExecution` on timeout.
3. Pick the class of `consoleMessages` from the `Runtime.enable` measurement, and filter entries by origin before
   stripping their URLs.
4. The keeper also drops a session on a timeout, a failed clean-up step, a block-list edit, and in a start-up sweep.
5. The file-chooser path gets a shared prologue with `uploadFiles`; a refusal after the click cancels the chooser;
   one chooser call per tab at a time; `JS_DISABLED` refuses it while JavaScript is off.
6. G2 by mechanism (ii-a), in the daemon.
7. G1 goes to G12-2 unless the webNavigation API exists without its permission.
8. Split B and E; Run 18 also fixes the DevTools helper and lengthens the banner control's wait to ≥ 15 s.

Every one is contract-level for user review, except 2, 4, 7 and 8.

## 6. Findings (the MAJOR ones; the rest are in the audit's §5)
- **G-1** The old-extension mapping (`kind: "function"` → `VERSION`) misses most cases. An old extension's
  `wrapExpression` turns a block-bodied arrow into `undefined` and `function (a){…}` into `PAGE_ERROR`
  (`stage0-a2-wrap.txt`). `asRef` and `saveTo` answer `BAD_PARAMS` instead. A new extension can also legitimately
  return a function, which the mapping would misread.
- **G-3** The MCP's `browser_evaluate` calls `bridge.call` itself (`mcp/src/tools/registry.ts:840`), so a mapping in
  the SDK alone does not cover it.
- **G-4** `Runtime.callFunctionOn` has no `timeout`, so the synchronous-loop termination is lost for `args` calls
  (measurer to confirm).
- **G-7** Console entries carry no URL, so text from a same-site blocked frame, or text replayed from a blocked page
  before a navigation, cannot be filtered once the URL is stripped.
- **G-8** "Reading runs no page script" is not proven: `Runtime.enable` serialises what the page logs, so page
  getters may run (the automation-detection vector). This decides class `tab` vs `evaluate` for `consoleMessages`.
- **G-10** A kept session breaks the code's "detach cleans up" assumptions: a timed-out command, focus emulation,
  C's `Runtime.enable` and E's interception all stay on.
- **G-11** Detach when a block-list edit blocks a kept tab is missing. Only `tabs.onUpdated` is named, but the edit
  arrives through `storage.onChanged`.
- **G-12** If a debugger attachment survives a worker restart, the next attach answers a false `DEBUGGER_DEVTOOLS`,
  and E's interception is left on (measurer to check).
- **G-15** The chooser path cannot share the file-input target rule, and it can check single vs multiple files only
  after the click. A refusal then needs a way to cancel the open chooser.
- **G-18** G1: `webNavigation` is not in `extension/manifest.json:8`, and "`tabCreated` carries the opener" needs
  either a delay or a new event.
- **G-19** G2 under either mechanism: trusted inputs now queue behind screenshots and can answer `LOCK_TIMEOUT`.
- **G-25** B (~545 lines) and E (~590) exceed their stages' caps (≤ 400 and ≤ 500).

Code-side MINOR: **G-9** The daemon puts any unlisted method that carries a `tab` into class `tab`, and no test ties
the daemon's table to `METHOD_CLASSES`.

## 7. Handoff
- **G2 recommendation: (ii-a).** The daemon takes the lock, forwards `focusTab`, then the input, replies, and holds
  the lock for the settle pause.
  - It needs no change to the wire, the extension, the SDK or the MCP.
  - An old extension stays correct.
  - About 65 lines of code and 170 of tests.
  - (i) risks a silent no-op on an old extension unless the SDK keeps sending its own `focusTab`.
- **A's list:** the 0.3 items are confirmed with a helper `file:line` each. Missed: the DevTools-attach fix, the
  control's wait (10 s against a 14 s banner linger), and four items from the record.
- **For the measurers:** the items marked [measurer] in the audit's §1. Most urgent:
  - `callFunctionOn` and a timeout;
  - whether `Runtime.enable` runs page getters;
  - whether a debugger attachment survives a worker restart;
  - how to cancel an intercepted chooser;
  - whether `chrome.webNavigation` exists without its permission.
- No processes left running.
